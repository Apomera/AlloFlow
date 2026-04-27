// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

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

  // ── Audio + WCAG (auto-injected) ──
  var _plantAC = null;
  function getPlantAC() { if (!_plantAC) { try { _plantAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_plantAC && _plantAC.state==="suspended") { try { _plantAC.resume(); } catch(e) {} } return _plantAC; }
  function plantTone(f,d,tp,v) { var ac=getPlantAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxPlantClick() { plantTone(600,0.03,"sine",0.04); }
  function sfxPlantSuccess() { plantTone(523,0.08,"sine",0.07); setTimeout(function(){plantTone(659,0.08,"sine",0.07);},70); setTimeout(function(){plantTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("plant-a11y")){var _s=document.createElement("style");_s.id="plant-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-200{color:#64748b!important}";document.head.appendChild(_s);}

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
    icon: '\uD83C\uDF31',
    label: 'companionPlanting',
    desc: '',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'plant_three_sisters', label: 'Plant all Three Sisters (corn, beans, squash)', icon: '\uD83C\uDF3D', check: function(d) { return d.cornPlanted && d.beansPlanted && d.squashPlanted; }, progress: function(d) { var c = (d.cornPlanted ? 1 : 0) + (d.beansPlanted ? 1 : 0) + (d.squashPlanted ? 1 : 0); return c + '/3 planted'; } },
      { id: 'complete_harvest', label: 'Complete a harvest cycle', icon: '\uD83C\uDF3E', check: function(d) { return (d.harvestCount || 0) >= 1; }, progress: function(d) { return (d.harvestCount || 0) >= 1 ? 'Harvested!' : 'Growing...'; } },
      { id: 'harvest_3_times', label: 'Complete 3 harvest cycles', icon: '\uD83C\uDFC6', check: function(d) { return (d.harvestCount || 0) >= 3; }, progress: function(d) { return (d.harvestCount || 0) + '/3 harvests'; } },
      { id: 'view_soil_science', label: 'Explore the soil science panel', icon: '\uD83E\uDDEA', check: function(d) { return !!d.showSoilDetail; }, progress: function(d) { return d.showSoilDetail ? 'Explored!' : 'Not yet'; } },
      { id: 'learn_culture', label: 'Read about Indigenous agricultural knowledge', icon: '\uD83C\uDF0E', check: function(d) { return !!d.showCulture; }, progress: function(d) { return d.showCulture ? 'Read!' : 'Not yet'; } }
    ],
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
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (companionPlanting) ──
      return (function() {
var d = (labToolData.companionPlanting) || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('companionPlanting', 'init', {
              first: 'Companion Planting Garden loaded. Plan your garden by learning which plants grow well together and which to keep apart.',
              repeat: 'Companion Planting active.',
              terse: 'Companion Planting.'
            }, { debounce: 800 });
          }

          var upd = function (key, val) { var _k = {}; _k[key] = val; setLabToolData(function (prev) { return Object.assign({}, prev, { companionPlanting: Object.assign({}, prev.companionPlanting || {}, _k) }); }); };



          // ── State defaults ──

          var gardenMode = d.gardenMode || 'sisters'; // 'sisters' | 'community'

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

            // Cancel any orphaned animation from previous mount
            if (canvasEl._gardenAnim) { cancelAnimationFrame(canvasEl._gardenAnim); canvasEl._gardenAnim = null; }

            if (canvasEl._gardenInit) return;

            canvasEl._gardenInit = true;

            var cW = canvasEl.width = canvasEl.offsetWidth * 2;

            var cH = canvasEl.height = canvasEl.offsetHeight * 2;

            var ctx = canvasEl.getContext('2d');

            var dpr = 2;

            var tick = 0;
            var animStartTime = performance.now();
            var _cachedSeason = -1;
            var _cachedSkyGrad = null;
            var _cachedGroundGrad = null;

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

              // Use time-based animation for smooth, frame-rate-independent motion
              var elapsed = (performance.now() - animStartTime) / 1000; // seconds (continuous float)
              tick = elapsed * 60; // continuous (NOT rounded) — smoother sin() curves

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



              // ── Season-aware Sky (smooth time-based sun arc) ──

              var dayPhase = (Math.sin(elapsed * 0.18) + 1) / 2; // ~35s full cycle, smooth regardless of frame rate

              var seasonSkies = [

                { topH: 170, topS: 65, topL: 65, botH: 90, botS: 45, botL: 80 },   // spring — fresh blue-green

                { topH: 210, topS: 70, topL: 60, botH: 40, botS: 55, botL: 82 },   // summer — deep blue

                { topH: 220, topS: 35, topL: 50, botH: 25, botS: 60, botL: 70 },   // autumn — muted orange

                { topH: 215, topS: 25, topL: 40, botH: 220, botS: 15, botL: 65 }   // winter — gray-blue

              ];

              var ssky = seasonSkies[_season];

              // Cache sky gradient — only rebuild when season changes (not every frame)
              if (_cachedSeason !== _season) {
                _cachedSeason = _season;
                _cachedSkyGrad = ctx.createLinearGradient(0, 0, 0, cH * 0.45);
                _cachedSkyGrad.addColorStop(0, 'hsl(' + ssky.topH + ',' + ssky.topS + '%,' + ssky.topL + '%)');
                _cachedSkyGrad.addColorStop(1, 'hsl(' + ssky.botH + ',' + ssky.botS + '%,' + ssky.botL + '%)');
                // Also cache ground gradient per season
                var gc2 = groundColors[_season];
                _cachedGroundGrad = ctx.createLinearGradient(0, cH * 0.4, 0, cH);
                _cachedGroundGrad.addColorStop(0, gc2[0]); _cachedGroundGrad.addColorStop(0.3, gc2[1]); _cachedGroundGrad.addColorStop(1, gc2[2]);
              }
              // Apply subtle dayPhase brightness shift via globalAlpha overlay (cheaper than new gradient)
              ctx.fillStyle = _cachedSkyGrad;
              ctx.fillRect(0, 0, cW, cH * 0.45);
              // Subtle brightness variation from day phase (avoids recreating gradient)
              ctx.fillStyle = 'rgba(255,255,200,' + (dayPhase * 0.06) + ')';
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

              ctx.fillStyle = _cachedGroundGrad || '#5a7040';

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

                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, label),

                  React.createElement("span", { className: "text-[11px] font-bold", style: { color: c.text } }, Math.round(value) + (unit || '%'))

                ),

                React.createElement("div", { className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden" },

                  React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: { width: Math.round(value) + '%', background: 'linear-gradient(to right, ' + c.light + ', ' + c.dark + ')' } })

                )

              )

            );

          }




          // ═══════════════════════════════════════════════════════════════
          // COMMUNITY GARDEN SIMULATOR — comprehensive ecosystem management
          // ═══════════════════════════════════════════════════════════════

          // ── Plant Database ──
          var CG_PLANTS = {
            tomato:    { emoji: '🍅', label: 'Tomato',    days: 80, water: 3, sun: 3, nEffect: -1, family: 'nightshade', harvest: 15, cost: 8, needsPoll: false, pollinator: false, desc: 'Heavy feeder, needs support. Mild drought stress improves flavor.' },
            corn:      { emoji: '🌽', label: 'Corn',      days: 90, water: 2, sun: 3, nEffect: -1, family: 'grass', harvest: 12, cost: 5, needsPoll: false, pollinator: false, desc: 'Wind-pollinated. Plant in blocks. Provides trellis for beans.' },
            beans:     { emoji: '🫘', label: 'Beans',     days: 60, water: 2, sun: 2, nEffect: 2,  family: 'legume', harvest: 10, cost: 4, needsPoll: false, pollinator: false, desc: 'Nitrogen fixer via rhizobium bacteria in root nodules.' },
            squash:    { emoji: '🎃', label: 'Squash',    days: 95, water: 3, sun: 3, nEffect: -1, family: 'cucurbit', harvest: 14, cost: 7, needsPoll: true,  pollinator: false, desc: 'Needs pollinators. Living mulch suppresses weeds.' },
            lettuce:   { emoji: '🥬', label: 'Lettuce',   days: 30, water: 3, sun: 1, nEffect: 0,  family: 'daisy', harvest: 5, cost: 3, needsPoll: false, pollinator: false, desc: 'Fast cool crop. Bolts in heat >75°F. Perfect for shade.' },
            carrot:    { emoji: '🥕', label: 'Carrot',    days: 70, water: 2, sun: 2, nEffect: 0,  family: 'umbel', harvest: 8, cost: 3, needsPoll: false, pollinator: false, desc: 'Deep roots break compaction. High N causes forking.' },
            pepper:    { emoji: '🌶️', label: 'Pepper',    days: 75, water: 2, sun: 3, nEffect: -1, family: 'nightshade', harvest: 12, cost: 7, needsPoll: false, pollinator: false, desc: 'Water stress increases capsaicin (heat). Needs warm soil.' },
            onion:     { emoji: '🧅', label: 'Onion',     days: 65, water: 2, sun: 2, nEffect: 0,  family: 'allium', harvest: 7, cost: 3, needsPoll: false, pollinator: false, desc: 'Sulfur compounds repel carrot fly, aphids, beetles.' },
            potato:    { emoji: '🥔', label: 'Potato',    days: 85, water: 3, sun: 2, nEffect: -1, family: 'nightshade', harvest: 13, cost: 5, needsPoll: false, pollinator: false, desc: 'Heavy feeder. Blight risk if near tomatoes. Prefers acidic soil.' },
            cucumber:  { emoji: '🥒', label: 'Cucumber',  days: 55, water: 3, sun: 2, nEffect: 0,  family: 'cucurbit', harvest: 9, cost: 5, needsPoll: true,  pollinator: false, desc: 'Needs pollinators for fruit. Water stress causes bitterness.' },
            peas:      { emoji: '🟢', label: 'Peas',      days: 55, water: 2, sun: 2, nEffect: 2,  family: 'legume', harvest: 8, cost: 4, needsPoll: false, pollinator: false, desc: 'Cool season nitrogen fixer. Dies in summer heat.' },
            broccoli:  { emoji: '🥦', label: 'Broccoli',  days: 65, water: 3, sun: 2, nEffect: -1, family: 'brassica', harvest: 11, cost: 5, needsPoll: false, pollinator: false, desc: 'Cool crop. Bolts in heat >80°F. Cabbage moth target.' },
            basil:     { emoji: '🌿', label: 'Basil',     days: 40, water: 2, sun: 3, nEffect: 0,  family: 'mint', harvest: 6, cost: 3, needsPoll: false, pollinator: false, desc: 'Repels thrips, whiteflies. Classic tomato companion.' },
            marigold:  { emoji: '🌼', label: 'Marigold',  days: 45, water: 1, sun: 3, nEffect: 0,  family: 'daisy', harvest: 3, cost: 2, needsPoll: false, pollinator: true,  desc: 'Root exudates kill nematodes. Best utility flower.' },
            sunflower: { emoji: '🌻', label: 'Sunflower', days: 70, water: 2, sun: 3, nEffect: 0,  family: 'daisy', harvest: 7, cost: 3, needsPoll: false, pollinator: true,  desc: 'Top pollinator attractor. Allelopathic to some plants.' },
            mint:      { emoji: '🍃', label: 'Mint',      days: 35, water: 3, sun: 1, nEffect: 0,  family: 'mint', harvest: 4, cost: 2, needsPoll: false, pollinator: false, desc: 'Repels aphids — WARNING: spreads via underground runners!' },
            dill:      { emoji: '🌾', label: 'Dill',      days: 40, water: 1, sun: 2, nEffect: 0,  family: 'umbel', harvest: 5, cost: 2, needsPoll: false, pollinator: true,  desc: 'Attracts ladybugs, lacewings, parasitic wasps.' },
            rosemary:  { emoji: '🫒', label: 'Rosemary',  days: 90, water: 1, sun: 3, nEffect: 0,  family: 'mint', harvest: 6, cost: 4, needsPoll: false, pollinator: false, desc: 'Perennial. Deters cabbage moth, bean beetles.' },
            lavender:  { emoji: '💜', label: 'Lavender',  days: 80, water: 1, sun: 3, nEffect: 0,  family: 'mint', harvest: 5, cost: 4, needsPoll: false, pollinator: true,  desc: 'Exceptional bee attractor. Deters moths, fleas.' },
            nasturtium:{ emoji: '🧡', label: 'Nasturtium',days: 35, water: 2, sun: 2, nEffect: 0,  family: 'nasturtium', harvest: 3, cost: 2, needsPoll: false, pollinator: true,  desc: 'Trap crop — aphids colonize it instead of veggies. Edible!' },
            clover:    { emoji: '☘️', label: 'Clover',    days: 25, water: 1, sun: 1, nEffect: 3,  family: 'legume', harvest: 1, cost: 1, needsPoll: false, pollinator: true,  regen: true, desc: 'Cover crop: fixes nitrogen + living mulch + attracts bees.' },
            radish:    { emoji: '🔴', label: 'Radish',    days: 25, water: 2, sun: 2, nEffect: 0,  family: 'brassica', harvest: 3, cost: 1, needsPoll: false, pollinator: false, desc: 'Fastest crop. Trap crop for flea beetles. Loosens soil.' },
            borage:    { emoji: '💙', label: 'Borage',    days: 60, water: 1, sun: 3, nEffect: 0,  family: 'borage', harvest: 4, cost: 2, needsPoll: false, pollinator: true,  regen: true, native: true, desc: 'Top bee attractor. Deep taproots mine minerals from subsoil. Edible flowers. Self-seeds.' },
            comfrey:   { emoji: '🌿', label: 'Comfrey',   days: 50, water: 2, sun: 2, nEffect: 1,  family: 'borage', harvest: 2, cost: 2, needsPoll: false, pollinator: true,  regen: true, desc: 'Dynamic accumulator — deep roots pull nutrients up. Cut-and-drop mulch. Permaculture staple.' },
            buckwheat: { emoji: '🌾', label: 'Buckwheat', days: 30, water: 1, sun: 3, nEffect: 0,  family: 'buckwheat', harvest: 2, cost: 1, needsPoll: false, pollinator: true,  regen: true, desc: 'Fast cover crop. Suppresses weeds, attracts hoverflies, phosphorus accumulator. Till in as green manure.' },
            yarrow:    { emoji: '🤍', label: 'Yarrow',    days: 70, water: 1, sun: 3, nEffect: 0,  family: 'daisy', harvest: 3, cost: 2, needsPoll: false, pollinator: true,  regen: true, native: true, desc: 'Native perennial. Attracts ladybugs, lacewings, parasitic wasps. Medicinal. Drought-proof.' },
            bee_hotel: { emoji: '🏨', label: 'Bee Hotel',  days: 10, water: 0, sun: 2, nEffect: 0,  family: 'structure', harvest: 0, cost: 5, needsPoll: false, pollinator: true, regen: true, isStructure: true, desc: 'Nesting habitat for solitary bees (mason bees, leafcutter bees). Boosts pollination in a 3-cell radius. Solitary bees pollinate 95% of wild plants!' },
            compost_bin: { emoji: '♻️', label: 'Compost Bin', days: 15, water: 0, sun: 0, nEffect: 2, family: 'structure', harvest: 0, cost: 4, needsPoll: false, pollinator: false, regen: true, isStructure: true, desc: 'Converts organic matter into rich humus. Boosts nitrogen and soil health in adjacent cells. The ultimate closed-loop nutrient cycle.' },
            rain_barrel: { emoji: '🛢️', label: 'Rain Barrel', days: 5, water: 0, sun: 0, nEffect: 0, family: 'structure', harvest: 0, cost: 3, needsPoll: false, pollinator: false, regen: true, isStructure: true, desc: 'Captures rainwater for irrigation. Reduces moisture decay rate for the whole garden by 20%. Free water from the sky!' },
            // ── Perennial Plants (persist across years, increasing yields) ──
            strawberry: { emoji: '🍓', label: 'Strawberry', days: 60, water: 3, sun: 3, nEffect: -1, family: 'rose', harvest: 12, cost: 6, needsPoll: true, pollinator: false, perennial: true, yearsToMature: 1, desc: 'Perennial. First-year yield is low; doubles in year 2. Runners spread to fill gaps. Great ground cover.' },
            asparagus:  { emoji: '🌱', label: 'Asparagus',  days: 120, water: 2, sun: 3, nEffect: 0, family: 'asparagus', harvest: 18, cost: 8, needsPoll: false, pollinator: false, perennial: true, yearsToMature: 3, desc: 'Perennial. Don\'t harvest for 3 years! Then produces for 20+ years. Deep roots improve soil structure.' },
            blueberry:  { emoji: '🫐', label: 'Blueberry',  days: 100, water: 3, sun: 3, nEffect: 0, family: 'heath', harvest: 20, cost: 10, needsPoll: true, pollinator: false, perennial: true, yearsToMature: 3, desc: 'Perennial. Needs ACIDIC soil (pH 4.5-5.5). Takes 3 years to mature. Partner with azaleas.' },
            garlic:     { emoji: '🧄', label: 'Garlic',     days: 90, water: 1, sun: 2, nEffect: 0, family: 'allium', harvest: 8, cost: 3, needsPoll: false, pollinator: false, desc: 'Plant in fall, harvest in spring. Strong pest repellent. Deters aphids, spider mites, Japanese beetles.' },
            rhubarb:    { emoji: '🟥', label: 'Rhubarb',    days: 90, water: 2, sun: 2, nEffect: 0, family: 'buckwheat', harvest: 10, cost: 5, needsPoll: false, pollinator: false, perennial: true, yearsToMature: 2, desc: 'Perennial. Don\'t harvest year 1. Leaves are toxic (oxalic acid) — only eat the stalks! Produces for 10+ years.' }
          };

          // ── Companion Interactions (bidirectional) ──
          // Positive = growth bonus + pest reduction. Negative = growth penalty + disease risk.
          var CG_COMPANIONS = [
            { a: 'tomato', b: 'basil', bonus: 15, desc: 'Basil repels tomato hornworm and whiteflies' },
            { a: 'tomato', b: 'marigold', bonus: 10, desc: 'Marigold roots kill soil nematodes' },
            { a: 'tomato', b: 'carrot', bonus: 8, desc: 'Tomato shade protects carrots in summer' },
            { a: 'tomato', b: 'nasturtium', bonus: 12, desc: 'Nasturtium lures aphids away from tomatoes' },
            { a: 'tomato', b: 'potato', bonus: -20, desc: 'Same family — share blight and beetle pests!' },
            { a: 'tomato', b: 'dill', bonus: -10, desc: 'Mature dill stunts tomato growth' },
            { a: 'corn', b: 'beans', bonus: 18, desc: 'Beans fix nitrogen; corn provides a trellis' },
            { a: 'corn', b: 'squash', bonus: 15, desc: 'Squash shades soil; corn blocks wind' },
            { a: 'beans', b: 'squash', bonus: 12, desc: 'Living mulch + nitrogen = thriving squash' },
            { a: 'beans', b: 'onion', bonus: -15, desc: 'Onion sulfur compounds inhibit bean rhizobium' },
            { a: 'carrot', b: 'onion', bonus: 15, desc: 'Onion repels carrot fly; carrots repel onion fly' },
            { a: 'carrot', b: 'dill', bonus: -12, desc: 'Dill cross-pollinates and stunts carrot roots' },
            { a: 'lettuce', b: 'radish', bonus: 10, desc: 'Radish loosens soil for shallow lettuce roots' },
            { a: 'lettuce', b: 'sunflower', bonus: 8, desc: 'Sunflower provides afternoon shade for lettuce' },
            { a: 'cucumber', b: 'dill', bonus: 12, desc: 'Dill attracts predatory wasps that eat cucumber beetles' },
            { a: 'cucumber', b: 'sunflower', bonus: 10, desc: 'Sunflower attracts pollinators for cucumber flowers' },
            { a: 'pepper', b: 'basil', bonus: 10, desc: 'Basil deters aphids and improves pepper flavor' },
            { a: 'broccoli', b: 'rosemary', bonus: 12, desc: 'Rosemary repels cabbage moth larvae' },
            { a: 'broccoli', b: 'nasturtium', bonus: 10, desc: 'Nasturtium traps cabbage aphids' },
            { a: 'peas', b: 'carrot', bonus: 10, desc: 'Peas fix nitrogen that carrots need' },
            { a: 'peas', b: 'onion', bonus: -12, desc: 'Allium family inhibits legume nitrogen fixation' },
            { a: 'potato', b: 'beans', bonus: 10, desc: 'Beans fix nitrogen; potatoes provide ground cover' },
            { a: 'potato', b: 'sunflower', bonus: -8, desc: 'Allelopathic sunflower chemicals stunt potatoes' },
            { a: 'marigold', b: 'beans', bonus: 8, desc: 'Marigold attracts beneficial insects to bean flowers' },
            { a: 'lavender', b: 'rosemary', bonus: 8, desc: 'Mediterranean herbs thrive together; attract pollinators' },
            { a: 'mint', b: 'broccoli', bonus: 10, desc: 'Mint deters flea beetles on brassicas' },
            { a: 'clover', b: 'corn', bonus: 12, desc: 'Clover fixes nitrogen and prevents erosion' },
            { a: 'clover', b: 'tomato', bonus: 10, desc: 'Living mulch retains moisture around tomatoes' },
            { a: 'borage', b: 'tomato', bonus: 15, desc: 'Borage attracts pollinators and repels tomato hornworm' },
            { a: 'borage', b: 'squash', bonus: 12, desc: 'Borage is the #1 bee attractor — essential for squash pollination' },
            { a: 'comfrey', b: 'tomato', bonus: 10, desc: 'Comfrey deep roots mine potassium — cut leaves make perfect tomato mulch' },
            { a: 'comfrey', b: 'potato', bonus: 12, desc: 'Comfrey leaves as mulch provide potassium that potatoes crave' },
            { a: 'buckwheat', b: 'cucumber', bonus: 10, desc: 'Buckwheat attracts hoverflies whose larvae eat cucumber aphids' },
            { a: 'buckwheat', b: 'lettuce', bonus: 8, desc: 'Fast buckwheat cover suppresses weeds around slow lettuce' },
            { a: 'yarrow', b: 'beans', bonus: 10, desc: 'Yarrow attracts parasitic wasps that control bean beetles' },
            { a: 'yarrow', b: 'broccoli', bonus: 12, desc: 'Yarrow attracts lacewings that devour cabbage aphids' }
          ];

          // ── Invasive Species Events ──
          var CG_INVASIVES = [
            { id: 'mint_spread', emoji: '🍃⚠️', label: 'Mint Invasion!', desc: 'Your mint has spread to adjacent plots! Mint sends underground runners that colonize nearby soil.', trigger: 'mint', spreadTo: 1, lesson: 'Mint is one of the most aggressive garden spreaders. Always plant mint in containers or isolated beds. Its underground stolons can travel several feet per season.' },
            { id: 'japanese_beetle', emoji: '🪲', label: 'Japanese Beetles!', desc: 'Metallic green beetles are devouring leaves! They skeletonize foliage and damage fruit.', damage: 15, targets: ['tomato', 'beans', 'basil'], lesson: 'Japanese beetles (Popillia japonica) were accidentally introduced to the US in 1916. Hand-picking, neem oil, and milky spore disease (which kills grubs) are organic controls.' },
            { id: 'aphid_swarm', emoji: '🦠', label: 'Aphid Swarm!', desc: 'Tiny sap-sucking insects coat the stems. They multiply explosively — one aphid can produce 80 offspring per week!', damage: 12, targets: ['lettuce', 'pepper', 'broccoli', 'peas'], lesson: 'Aphids reproduce asexually when conditions are good, producing live young without mating. Ladybugs eat 50+ aphids per day. Dill and nasturtium attract natural predators.' },
            { id: 'cabbage_moth', emoji: '🦋⚠️', label: 'Cabbage White Moths!', desc: 'White butterflies are laying eggs on your brassicas. The green caterpillars will devour leaves.', damage: 18, targets: ['broccoli'], lesson: 'Pieris rapae caterpillars eat 3x their body weight daily. Row covers prevent egg-laying. Rosemary and thyme planted nearby confuse moths with strong scent.' },
            { id: 'bindweed', emoji: '🌀', label: 'Bindweed Invasion!', desc: 'Twisting vines are strangling your plants! Bindweed can grow 3-6 feet per season and regenerates from root fragments.', damage: 20, spreadTo: 2, lesson: 'Convolvulus arvensis roots can extend 20+ feet deep. A single root fragment of 2 inches can regenerate. Repeated cutting exhausts root reserves over 2-3 seasons. Mulching heavily suppresses emergence.' },
            { id: 'tomato_blight', emoji: '🟤', label: 'Late Blight!', desc: 'Brown patches spread across leaves. This is the same disease that caused the Irish Potato Famine!', damage: 25, targets: ['tomato', 'potato'], lesson: 'Phytophthora infestans spreads via airborne spores in cool, wet conditions. Crop rotation and avoiding overhead watering are key defenses. Never plant tomatoes where potatoes grew last season.' },
            { id: 'spotted_lanternfly', emoji: '🪰', label: 'Spotted Lanternfly!', desc: 'These invasive insects from Asia suck sap and excrete sticky honeydew that grows sooty mold.', damage: 14, targets: ['sunflower', 'cucumber', 'squash'], lesson: 'Lycorma delicatula arrived in Pennsylvania in 2014 on stone shipments. They lay egg masses on any flat surface. Reporting sightings to your state agriculture department helps track their spread.' }
          ];

          // ── Achievement definitions ──
          var CG_ACHIEVEMENTS = [
            { id: 'first_harvest', emoji: '🌱', label: 'First Harvest', desc: 'Harvest your first crop', check: function(s) { return s.totalHarvested >= 1; } },
            { id: 'companion5', emoji: '🤝', label: 'Companion Master', desc: '5+ positive companion pairs active', check: function(s) { return s.activeBonuses >= 5; } },
            { id: 'pollinator', emoji: '🐝', label: 'Pollinator Paradise', desc: 'Plant 3+ pollinator-attracting species', check: function(s) { return s.pollinatorPlants >= 3; } },
            { id: 'biodiversity', emoji: '🌍', label: 'Biodiversity Champion', desc: '10+ different species planted', check: function(s) { return s.uniqueSpecies >= 10; } },
            { id: 'nitrogen', emoji: '⚗️', label: 'Nitrogen Master', desc: 'Keep soil nitrogen above 60 for 10+ days', check: function(s) { return s.nitrogenDays >= 10; } },
            { id: 'defender', emoji: '⚔️', label: 'Invasive Defender', desc: 'Successfully manage an invasive event', check: function(s) { return s.invasivesManaged >= 1; } },
            { id: 'rotation', emoji: '🔄', label: 'Rotation Expert', desc: 'Complete 3 seasons with crop rotation', check: function(s) { return s.seasonsRotated >= 3; } },
            { id: 'organic', emoji: '🌿', label: 'Organic Grower', desc: 'Reach harvest without any plant dying', check: function(s) { return s.noDeaths && s.totalHarvested >= 3; } },
            { id: 'market', emoji: '💰', label: 'Market Star', desc: 'Earn 100+ harvest points in one season', check: function(s) { return s.seasonPoints >= 100; } },
            { id: 'three_sisters', emoji: '🌽', label: 'Three Sisters', desc: 'Plant corn + beans + squash as neighbors', check: function(s) { return s.hasSisters; } },
            { id: 'regenerative', emoji: '♻️', label: 'Regenerative Gardener', desc: 'Plant 3+ regenerative species (comfrey, clover, buckwheat, yarrow, borage)', check: function(s) { return s.regenCount >= 3; } },
            { id: 'soil_healer', emoji: '🌍', label: 'Soil Healer', desc: 'Maintain nitrogen above 50 with only legumes (no compost action)', check: function(s) { return s.nitrogenFromLegumes; } }
          ];

          // ── Garden Challenges — guided scenarios ──
          var CG_CHALLENGES = [
            { id: 'pollinator_rescue', emoji: '🐝', title: 'Pollinator Rescue',
              difficulty: 'Beginner', ngss: 'LS2.A: Interdependent Relationships',
              desc: 'A local farm\'s cucumber and squash yields are crashing because pollinators have disappeared. Design a garden that attracts pollinators AND produces food.',
              goal: 'Harvest 3+ pollinator-dependent crops (cucumber, squash) with at least 3 pollinator plants nearby.',
              hint: 'Marigold, sunflower, lavender, borage, and nasturtium all attract bees and butterflies. Plant them NEAR your cucumbers and squash.',
              check: function(grid) {
                var pollCrops = 0; var pollPlants = 0;
                grid.forEach(function(c) { if (!c.plantId) return; var p = CG_PLANTS[c.plantId]; if (!p) return; if (p.needsPoll && c.growthDay >= p.days) pollCrops++; if (p.pollinator) pollPlants++; });
                return pollCrops >= 3 && pollPlants >= 3;
              }
            },
            { id: 'nitrogen_crisis', emoji: '⚗️', title: 'The Nitrogen Crisis',
              difficulty: 'Intermediate', ngss: 'LS2.B: Cycles of Matter',
              desc: 'After years of corn monoculture, this soil is depleted (nitrogen starts at 10). Restore soil fertility using ONLY biological nitrogen fixation — no compost allowed!',
              goal: 'Raise nitrogen above 60 using only legumes (beans, peas, clover).',
              hint: 'Legumes have symbiotic bacteria (Rhizobium) in their root nodules that convert atmospheric N₂ into plant-available ammonium. This is how nature makes fertilizer.',
              setup: { nitrogen: 10, moisture: 40 },
              check: function(grid, state) { return state.nitrogen >= 60; }
            },
            { id: 'pest_gauntlet', emoji: '🐛', title: 'Pest Gauntlet',
              difficulty: 'Intermediate', ngss: 'LS2.C: Ecosystem Dynamics',
              desc: 'Design a garden that can survive a full summer of pest pressure WITHOUT any weeding actions. Use only companion planting and beneficial insect attraction for defense.',
              goal: 'Keep average plant health above 60% through summer with 8+ plants and no weeding.',
              hint: 'Dill attracts parasitic wasps. Nasturtium is a trap crop. Marigold kills nematodes. Yarrow attracts ladybugs. Build your defense through biodiversity!',
              check: function(grid, state) {
                var planted = 0; var totalHealth = 0;
                grid.forEach(function(c) { if (c.plantId) { planted++; totalHealth += c.health; } });
                return planted >= 8 && (totalHealth / Math.max(1, planted)) > 60 && state.season === 1;
              }
            },
            { id: 'rotation_master', emoji: '🔄', title: 'Four-Season Rotation',
              difficulty: 'Advanced', ngss: 'LS2.D: Social Interactions',
              desc: 'Practice the 4-year crop rotation system: Year 1 legumes → Year 2 brassicas → Year 3 nightshades → Year 4 root crops. No family should repeat in the same plot.',
              goal: 'Complete 4 seasons with proper family rotation in every cell. Zero rotation warnings.',
              hint: 'Season 1: beans, peas, clover. Season 2: broccoli, radish. Season 3: tomato, pepper, potato. Season 4: carrot, onion. Each season, move families to new plots.',
              check: function(grid, state) { return (state.cellHistory && Object.keys(state.cellHistory).length >= 8 && state.seasonsRotated >= 4); }
            },
            { id: 'regen_garden', emoji: '♻️', title: 'The Regenerative Garden',
              difficulty: 'Advanced', ngss: 'ESS3.C: Human Impacts',
              desc: 'Build a garden that IMPROVES the ecosystem over time. Start with degraded soil and transform it into a thriving, self-sustaining food forest.',
              goal: 'Achieve ecosystem score 80+ with 3+ regenerative plants, 5+ families, and nitrogen above 50.',
              hint: 'Comfrey, buckwheat, and yarrow heal soil. Clover and beans fix nitrogen. Borage attracts pollinators. A regenerative garden feeds itself.',
              setup: { nitrogen: 15, moisture: 30 },
              check: function(grid, state) {
                var regen = 0; var fams = {};
                grid.forEach(function(c) { if (!c.plantId) return; var p = CG_PLANTS[c.plantId]; if (!p) return; fams[p.family] = true; if (p.regen) regen++; });
                return regen >= 3 && Object.keys(fams).length >= 5 && state.nitrogen >= 50;
              }
            },
            { id: 'three_sisters_community', emoji: '🌽', title: 'Three Sisters in the Community',
              difficulty: 'Beginner', ngss: 'LS2.A: Interdependent Relationships',
              desc: 'The Three Sisters (corn, beans, squash) is a 7,000-year-old agricultural system from Indigenous Mesoamerican and Haudenosaunee traditions. Plant them as neighbors and watch the synergy.',
              goal: 'Plant corn, beans, and squash adjacent to each other and harvest all three.',
              hint: 'Corn provides a trellis for beans. Beans fix nitrogen for corn. Squash shades the soil and suppresses weeds. Together, they provide complete nutrition.',
              check: function(grid) { var has = {}; grid.forEach(function(c) { if (c.plantId) has[c.plantId] = true; }); return has.corn && has.beans && has.squash; }
            }
          ];
          // ── Community Garden State ──
          var cg = d.communityGarden || {};
          var cgActiveChallenge = cg.activeChallenge || null;
          var cgCompletedChallenges = cg.completedChallenges || [];
          var cgGrid = cg.grid || []; // Array of 16 cells: { plantId: null|string, growthDay: 0, health: 100, watered: false, pests: 0 }
          var cgDay = cg.day || 0;
          var cgSeason = Math.floor((cgDay % 120) / 30); // 0=spring, 1=summer, 2=autumn, 3=winter
          var cgNitrogen = typeof cg.nitrogen === 'number' ? cg.nitrogen : 50;
          var cgMoisture = typeof cg.moisture === 'number' ? cg.moisture : 60;
          var cgScore = cg.score || 0;
          var cgTotalHarvested = cg.totalHarvested || 0;
          var cgAchievements = cg.achievements || [];
          var cgEventLog = cg.eventLog || [];
          var cgActiveEvent = cg.activeEvent || null;
          var cgPhase = cg.phase || 'plan'; // 'plan' | 'grow' | 'harvest'
          var cgSelectedPlant = cg.selectedPlant || null;
          var cgSpeed = cg.speed || 1;
          var cgSeasonHistory = cg.seasonHistory || []; // tracks what was planted each season for rotation

          // ── Enhanced Soil Chemistry (NPK + pH + organic matter) ──
          var cgPhosphorus = typeof cg.phosphorus === 'number' ? cg.phosphorus : 40;
          var cgPotassium = typeof cg.potassium === 'number' ? cg.potassium : 45;
          var cgPH = typeof cg.pH === 'number' ? cg.pH : 6.5;
          var cgOrganicMatter = typeof cg.organicMatter === 'number' ? cg.organicMatter : 3.0;

          // ── Economics ──
          var cgBudget = typeof cg.budget === 'number' ? cg.budget : 50.00;
          var cgRevenue = cg.revenue || 0;
          var cgExpenses = cg.expenses || 0;

          // ── Pest Lifecycle ──
          var cgPestPop = typeof cg.pestPop === 'number' ? cg.pestPop : 0;
          var cgBeneficialPop = typeof cg.beneficialPop === 'number' ? cg.beneficialPop : 5;

          // ── Multi-Year ──
          var cgYear = cg.year || 1;

          // ── AI Advisor cooldown ──
          var cgAdvisorCooldown = cg.advisorCooldown || 0;
          var cgAdvisorResponse = cg.advisorResponse || null;

          // NPK consumption rates per plant (per growth day)
          var PLANT_NPK = {
            tomato: { n: -2.5, p: -2, k: -1.5, idealPH: [6.0, 6.8] },
            corn: { n: -3, p: -1.5, k: -1, idealPH: [6.0, 7.0] },
            beans: { n: 2, p: -0.5, k: -0.5, idealPH: [6.0, 7.0] },
            squash: { n: -2, p: -1.5, k: -2, idealPH: [6.0, 7.0] },
            lettuce: { n: -1, p: -0.5, k: -0.5, idealPH: [6.0, 7.0] },
            carrot: { n: -0.5, p: -1.5, k: -1, idealPH: [6.0, 6.8] },
            pepper: { n: -2, p: -2, k: -1.5, idealPH: [6.0, 6.8] },
            onion: { n: -1, p: -1, k: -0.5, idealPH: [6.0, 7.0] },
            potato: { n: -2.5, p: -2, k: -2.5, idealPH: [4.8, 6.5] },
            cucumber: { n: -1.5, p: -1, k: -1, idealPH: [6.0, 7.0] },
            peas: { n: 1.5, p: -0.5, k: -0.5, idealPH: [6.0, 7.5] },
            broccoli: { n: -2.5, p: -1.5, k: -1, idealPH: [6.0, 7.0] },
            basil: { n: -0.5, p: -0.3, k: -0.3, idealPH: [6.0, 7.0] },
            marigold: { n: 0, p: -0.2, k: -0.2, idealPH: [6.0, 7.5] },
            sunflower: { n: -1, p: -1, k: -0.5, idealPH: [6.0, 7.5] },
            radish: { n: -0.3, p: -0.3, k: -0.3, idealPH: [6.0, 7.0] },
            clover: { n: 3, p: -0.2, k: -0.2, idealPH: [6.0, 7.0] },
            // Perennials
            strawberry: { n: -1, p: -1, k: -1.5, idealPH: [5.5, 6.5] },
            asparagus: { n: -1.5, p: -1, k: -1, idealPH: [6.5, 7.5] },
            blueberry: { n: -0.5, p: -0.5, k: -0.5, idealPH: [4.5, 5.5] },
            garlic: { n: -1, p: -0.5, k: -0.5, idealPH: [6.0, 7.0] },
            rhubarb: { n: -1.5, p: -1, k: -1, idealPH: [6.0, 6.8] }
          };

          // Market prices for harvest revenue
          var MARKET_PRICES = {
            tomato: 3.50, corn: 2.00, beans: 2.50, squash: 3.00, lettuce: 2.00,
            carrot: 1.50, pepper: 4.00, onion: 1.50, potato: 1.00, cucumber: 2.00,
            peas: 3.00, broccoli: 3.50, basil: 5.00, radish: 1.00, sunflower: 2.00,
            strawberry: 6.00, asparagus: 5.50, blueberry: 8.00, garlic: 4.00, rhubarb: 3.00
          };

          // Initialize grid if empty
          if (cgGrid.length === 0) {
            cgGrid = [];
            for (var gi = 0; gi < 16; gi++) {
              cgGrid.push({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 });
            }
          }

          // ── CG helper: update community garden state ──
          function cgUpd(patch) {
            setLabToolData(function(prev) {
              var cp = Object.assign({}, prev.companionPlanting || {});
              cp.communityGarden = Object.assign({}, cp.communityGarden || {}, patch);
              return Object.assign({}, prev, { companionPlanting: cp });
            });
          }

          // ── CG helper: get companion bonus for a cell ──
          function getCellBonus(grid, idx) {
            var cell = grid[idx];
            if (!cell || !cell.plantId) return { total: 0, pairs: [] };
            var cols = 4;
            var row = Math.floor(idx / cols);
            var col = idx % cols;
            var neighbors = [];
            if (row > 0) neighbors.push(idx - cols);
            if (row < 3) neighbors.push(idx + cols);
            if (col > 0) neighbors.push(idx - 1);
            if (col < 3) neighbors.push(idx + 1);
            // Diagonals
            if (row > 0 && col > 0) neighbors.push(idx - cols - 1);
            if (row > 0 && col < 3) neighbors.push(idx - cols + 1);
            if (row < 3 && col > 0) neighbors.push(idx + cols - 1);
            if (row < 3 && col < 3) neighbors.push(idx + cols + 1);

            var total = 0;
            var pairs = [];
            neighbors.forEach(function(ni) {
              var nc = grid[ni];
              if (!nc || !nc.plantId) return;
              CG_COMPANIONS.forEach(function(comp) {
                if ((comp.a === cell.plantId && comp.b === nc.plantId) || (comp.b === cell.plantId && comp.a === nc.plantId)) {
                  total += comp.bonus;
                  pairs.push(comp);
                }
              });
            });
            return { total: total, pairs: pairs };
          }

          // ── CG: advance one day ──
          // ── Beneficial Events (positive ecosystem feedback) ──
          var CG_GOOD_EVENTS = [
            { id: 'ladybugs', emoji: '🐞', label: 'Ladybug Colony!', desc: 'Ladybugs have moved in! A single ladybug eats 50+ aphids per day.', effect: function(grid) { return grid.map(function(c) { return c.plantId ? Object.assign({}, c, { pests: Math.max(0, c.pests - 15) }) : c; }); }, lesson: 'Ladybugs (Coccinellidae) eat up to 5,000 aphids in their lifetime. Dill, yarrow, and marigolds attract them by providing nectar and habitat.' },
            { id: 'rain', emoji: '🌧️', label: 'Spring Rain!', desc: 'A gentle soaking rain replenishes the soil.', moistureBoost: 30, lesson: 'Plants prefer slow, deep watering over frequent shallow sprinkles. Soil organic matter acts like a sponge, holding 20× its weight in water.' },
            { id: 'mycorrhiza', emoji: '🍄', label: 'Mycorrhizal Bloom!', desc: 'Beneficial fungi have colonized the root zone, extending root reach by 100×.', nitrogenBoost: 10, healthBoost: 8, lesson: 'Mycorrhizal fungi form symbiotic networks with 90% of plant species. They trade soil minerals for plant sugars. This underground "wood wide web" connects plants and can even transfer warning chemicals.' },
            { id: 'earthworms', emoji: '🪱', label: 'Earthworm Surge!', desc: 'Earthworm populations are thriving! They aerate soil and recycle nutrients.', nitrogenBoost: 8, lesson: 'Charles Darwin studied earthworms for 39 years. A healthy garden has 100-500 worms per square meter. Their castings contain 5× more nitrogen and 7× more phosphorus than surrounding soil.' },
            { id: 'pollinators', emoji: '🦋', label: 'Pollinator Migration!', desc: 'Monarch butterflies are passing through! Pollinator-dependent crops get a boost.', effect: function(grid) { return grid.map(function(c) { if (c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].needsPoll) return Object.assign({}, c, { health: Math.min(100, c.health + 10) }); return c; }); }, lesson: 'Monarch butterflies migrate up to 3,000 miles. Pollinator gardens along their route provide critical refueling stops. One in three bites of food depends on pollinators.' }
          ];

          // ── Crop rotation history per cell ──
          var cgCellHistory = cg.cellHistory || {}; // { "0": ["tomato", "beans"], "1": ["corn"] ... }

          function cgAdvanceDay() {
            var newGrid = cgGrid.map(function(cell, idx) {
              if (!cell.plantId) return cell;
              var plant = CG_PLANTS[cell.plantId];
              if (!plant) return cell;
              var c = Object.assign({}, cell);
              var bonus = getCellBonus(cgGrid, idx);

              // Crop rotation penalty: same family in same cell as last season
              var rotationPenalty = 0;
              var history = cgCellHistory[idx] || [];
              if (history.length > 0) {
                var lastPlant = CG_PLANTS[history[history.length - 1]];
                if (lastPlant && lastPlant.family === plant.family) {
                  rotationPenalty = 0.3; // 30% growth penalty + disease risk
                  if (Math.random() < 0.02) c.pests = Math.min(100, c.pests + 15); // soil-borne disease
                }
              }

              // Soil health bonus — diverse garden = healthier soil
              var uniqueFamilies = {};
              cgGrid.forEach(function(gc) { if (gc.plantId) { var gp = CG_PLANTS[gc.plantId]; if (gp) uniqueFamilies[gp.family] = true; } });
              var biodiversityBonus = Math.min(0.2, Object.keys(uniqueFamilies).length * 0.025); // up to +20% for 8 families

              // Growth
              var seasonGrowth = [1.0, 1.4, 0.6, 0.0][cgSeason];
              var growthRate = seasonGrowth * (1 + bonus.total / 100) * (1 - rotationPenalty) * (1 + biodiversityBonus);
              if (cgMoisture < 20) growthRate *= 0.3;
              if (c.pests > 30) growthRate *= 0.7;
              if (cgNitrogen < 15 && plant.nEffect < 0) growthRate *= 0.5; // heavy feeders suffer in depleted soil
              c.growthDay = Math.min(plant.days, c.growthDay + growthRate);

              // Health
              if (cgMoisture < 15) c.health = Math.max(0, c.health - 2);
              if (cgMoisture > 90) c.health = Math.max(0, c.health - 1); // overwatering — root rot
              if (c.pests > 50) c.health = Math.max(0, c.health - 1.5);
              if (bonus.total < -10) c.health = Math.max(0, c.health - 0.5);
              if (bonus.total > 10) c.health = Math.min(100, c.health + 0.3);
              if (rotationPenalty > 0) c.health = Math.max(0, c.health - 0.3);

              // Pest accumulation (reduced by companion bonuses and biodiversity)
              var pestRate = [0.4, 0.8, 0.3, 0.05][cgSeason];
              if (bonus.total > 0) pestRate *= Math.max(0.2, 1 - bonus.total / 50);
              pestRate *= (1 - biodiversityBonus); // biodiversity reduces pest pressure
              c.pests = Math.min(100, c.pests + pestRate);

              c.watered = false;
              return c;
            });

            // Structure effects
            var hasRainBarrel = newGrid.some(function(c) { return c.plantId === 'rain_barrel'; });
            var hasCompostBin = newGrid.some(function(c) { return c.plantId === 'compost_bin'; });

            // Global moisture decay (rain barrel reduces by 20%)
            var moistureDecay = [1.5, 2.5, 1.0, 0.5][cgSeason];
            if (hasRainBarrel) moistureDecay *= 0.8;
            var newMoisture = Math.max(0, cgMoisture - moistureDecay);

            // Nitrogen: legumes add, heavy feeders subtract. Compost bin adds passive nitrogen.
            var nDelta = hasCompostBin ? 0.5 : 0;
            newGrid.forEach(function(cell) {
              if (!cell.plantId) return;
              var p = CG_PLANTS[cell.plantId];
              if (p) nDelta += p.nEffect * 0.3;
            });
            var newNitrogen = Math.max(0, Math.min(100, cgNitrogen + nDelta));

            // Random event check — both threats AND benefits
            var newEvent = cgActiveEvent;
            var extraMoisture = 0;
            var extraNitrogen = 0;
            if (!cgActiveEvent && cgDay > 5 && Math.random() < 0.18) {
              var plantedIds = newGrid.filter(function(c) { return c.plantId; }).map(function(c) { return c.plantId; });
              var pollinatorCount = plantedIds.filter(function(id) { return CG_PLANTS[id] && CG_PLANTS[id].pollinator; }).length;
              var uniqueFams = {};
              plantedIds.forEach(function(id) { var p = CG_PLANTS[id]; if (p) uniqueFams[p.family] = true; });
              var diversity = Object.keys(uniqueFams).length;

              // Higher biodiversity = more likely to get good events
              var goodChance = Math.min(0.6, 0.2 + diversity * 0.05 + pollinatorCount * 0.05);

              if (Math.random() < goodChance) {
                // Beneficial event
                var goodEvent = CG_GOOD_EVENTS[Math.floor(Math.random() * CG_GOOD_EVENTS.length)];
                newEvent = { emoji: goodEvent.emoji, label: goodEvent.label, desc: goodEvent.desc, lesson: goodEvent.lesson, isGood: true };
                if (goodEvent.effect) newGrid = goodEvent.effect(newGrid);
                if (goodEvent.moistureBoost) extraMoisture = goodEvent.moistureBoost;
                if (goodEvent.nitrogenBoost) extraNitrogen = goodEvent.nitrogenBoost;
                if (goodEvent.healthBoost) {
                  newGrid = newGrid.map(function(c) { return c.plantId ? Object.assign({}, c, { health: Math.min(100, c.health + goodEvent.healthBoost) }) : c; });
                }
              } else {
                // Threat event
                var possibleInvasives = CG_INVASIVES.filter(function(inv) {
                  if (inv.trigger) return plantedIds.indexOf(inv.trigger) !== -1;
                  if (inv.targets) return inv.targets.some(function(t) { return plantedIds.indexOf(t) !== -1; });
                  return true;
                });
                if (possibleInvasives.length > 0) {
                  newEvent = possibleInvasives[Math.floor(Math.random() * possibleInvasives.length)];
                  if (newEvent.damage) {
                    newGrid = newGrid.map(function(cell) {
                      if (!cell.plantId) return cell;
                      if (newEvent.targets && newEvent.targets.indexOf(cell.plantId) === -1) return cell;
                      return Object.assign({}, cell, { health: Math.max(0, cell.health - newEvent.damage), pests: Math.min(100, cell.pests + 10) });
                    });
                  }
                }
              }
            }

            // ── Enhanced Soil Chemistry: NPK + pH + Organic Matter ──
            var pDelta = 0; var kDelta = 0; var omDelta = 0;
            newGrid.forEach(function(cell) {
              if (!cell.plantId) return;
              var npk = PLANT_NPK[cell.plantId];
              if (npk) {
                pDelta += npk.p * 0.3;
                kDelta += npk.k * 0.3;
              }
            });
            if (hasCompostBin) { pDelta += 0.3; kDelta += 0.3; omDelta += 0.1; }
            // Cover crops build organic matter
            newGrid.forEach(function(cell) {
              if (cell.plantId && CG_PLANTS[cell.plantId] && CG_PLANTS[cell.plantId].regen) omDelta += 0.05;
            });
            var newP = Math.max(0, Math.min(100, cgPhosphorus + pDelta));
            var newK = Math.max(0, Math.min(100, cgPotassium + kDelta));
            var newOM = Math.max(0.5, Math.min(10, cgOrganicMatter + omDelta));
            // pH drift: legumes slightly acidify, lime crops raise. Slow drift toward 6.5 naturally.
            var phDrift = (6.5 - cgPH) * 0.005; // natural buffering
            var newPH = Math.max(4.0, Math.min(8.5, cgPH + phDrift));

            // Organic matter improves moisture retention
            var omMoistureBonus = (newOM - 3) * 0.1; // each 1% above baseline = 10% less moisture loss
            if (omMoistureBonus > 0) newMoisture += omMoistureBonus;

            // pH lockout affects growth (applied to health)
            newGrid = newGrid.map(function(cell) {
              if (!cell.plantId) return cell;
              var npk = PLANT_NPK[cell.plantId];
              if (npk && npk.idealPH) {
                if (newPH < npk.idealPH[0] || newPH > npk.idealPH[1]) {
                  // pH outside ideal range — nutrient lockout reduces health
                  return Object.assign({}, cell, { health: Math.max(0, cell.health - 0.5) });
                }
              }
              // Low phosphorus hurts fruiting crops
              if (newP < 15 && CG_PLANTS[cell.plantId] && CG_PLANTS[cell.plantId].needsPoll) {
                return Object.assign({}, cell, { health: Math.max(0, cell.health - 0.3) });
              }
              return cell;
            });

            // ── Pest Lifecycle Model ──
            var plantedCount = newGrid.filter(function(c) { return c.plantId && !CG_PLANTS[c.plantId].isStructure; }).length;
            var seasonPestMul = [0.5, 1.2, 0.4, 0.05][cgSeason];
            // Companion pest suppression
            var companionRepel = 0;
            newGrid.forEach(function(c) {
              if (c.plantId && (c.plantId === 'marigold' || c.plantId === 'nasturtium' || c.plantId === 'onion' || c.plantId === 'garlic' || c.plantId === 'basil')) companionRepel += 0.08;
            });
            var newPestPop = Math.max(0, cgPestPop * (1 + 0.06 * seasonPestMul - companionRepel) + (plantedCount > 4 ? 0.3 * seasonPestMul : 0));
            // Beneficials eat pests
            var newBeneficialPop = Math.max(0, cgBeneficialPop + newPestPop * 0.02 - 0.1);
            var pollinatorPlants = newGrid.filter(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].pollinator; }).length;
            newBeneficialPop += pollinatorPlants * 0.05; // flowers attract beneficials
            newPestPop = Math.max(0, newPestPop - newBeneficialPop * 0.15); // beneficials consume pests
            // Apply pest population to individual cell pest levels
            if (newPestPop > 10) {
              newGrid = newGrid.map(function(c) {
                if (!c.plantId || CG_PLANTS[c.plantId].isStructure) return c;
                return Object.assign({}, c, { pests: Math.min(100, c.pests + newPestPop * 0.05) });
              });
            }

            // ── Multi-Year: season rollover + year advancement ──
            var newDay = cgDay + 1;
            var newYear = cgYear;
            if (newDay > 0 && newDay % 120 === 0) {
              newYear = cgYear + 1;
              // Perennials persist; annuals die at year boundary
              newGrid = newGrid.map(function(cell) {
                if (!cell.plantId) return cell;
                var plant = CG_PLANTS[cell.plantId];
                if (plant && plant.perennial) {
                  // Perennials survive and get stronger
                  return Object.assign({}, cell, { growthDay: Math.max(0, cell.growthDay - 10), health: Math.min(100, cell.health + 5) });
                }
                // Annuals die at year end
                return { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 };
              });
            }

            cgUpd({
              grid: newGrid,
              day: newDay,
              year: newYear,
              nitrogen: Math.min(100, newNitrogen + extraNitrogen),
              moisture: Math.min(100, Math.max(0, newMoisture + extraMoisture)),
              phosphorus: newP,
              potassium: newK,
              pH: Math.round(newPH * 10) / 10,
              organicMatter: Math.round(newOM * 100) / 100,
              pestPop: Math.round(newPestPop * 10) / 10,
              beneficialPop: Math.round(newBeneficialPop * 10) / 10,
              activeEvent: newEvent,
              advisorCooldown: Math.max(0, cgAdvisorCooldown - 1)
            });
          }

          // ── CG: plant in cell ──
          function cgPlantCell(idx) {
            if (!cgSelectedPlant || cgPhase !== 'plan') return;
            var plant = CG_PLANTS[cgSelectedPlant];
            if (!plant) return;
            // Economics: deduct seed cost from budget
            var seedCost = plant.cost ? plant.cost * 0.10 : 0.50; // cost field is points; convert to dollars
            if (cgBudget < seedCost) {
              if (addToast) addToast('\uD83D\uDCB0 Not enough budget! Need $' + seedCost.toFixed(2) + ' (have $' + cgBudget.toFixed(2) + ')', 'info');
              return;
            }
            var newGrid = cgGrid.slice();
            newGrid[idx] = { plantId: cgSelectedPlant, growthDay: 0, health: 100, watered: false, pests: 0 };
            cgUpd({ grid: newGrid, budget: Math.round((cgBudget - seedCost) * 100) / 100, expenses: cgExpenses + seedCost });
            if (awardStemXP) awardStemXP(5);
          }

          // ── CG: remove plant from cell ──
          function cgRemoveCell(idx) {
            if (cgPhase !== 'plan') return;
            var newGrid = cgGrid.slice();
            newGrid[idx] = { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 };
            cgUpd({ grid: newGrid });
          }

          // ── CG: water action ──
          function cgWater() {
            cgUpd({ moisture: Math.min(100, cgMoisture + 25) });
            if (awardStemXP) awardStemXP(3);
          }

          // ── CG: weed action ──
          function cgWeed() {
            var newGrid = cgGrid.map(function(cell) {
              if (!cell.plantId) return cell;
              return Object.assign({}, cell, { pests: Math.max(0, cell.pests - 20) });
            });
            cgUpd({ grid: newGrid });
            if (awardStemXP) awardStemXP(3);
          }

          // ── CG: compost action (enhanced: adds NPK + OM) ──
          function cgCompost() {
            cgUpd({
              nitrogen: Math.min(100, cgNitrogen + 15),
              phosphorus: Math.min(100, cgPhosphorus + 8),
              potassium: Math.min(100, cgPotassium + 5),
              organicMatter: Math.min(10, cgOrganicMatter + 0.3)
            });
            if (awardStemXP) awardStemXP(3);
            if (addToast) addToast('\u267B\uFE0F Compost added: +15N +8P +5K +0.3% OM', 'success');
          }

          // ── CG: soil amendment actions ──
          function cgAddLime() {
            var cost = 0.50;
            if (cgBudget < cost) { if (addToast) addToast('\uD83D\uDCB0 Need $' + cost.toFixed(2), 'info'); return; }
            cgUpd({ pH: Math.min(8.5, Math.round((cgPH + 0.3) * 10) / 10), budget: Math.round((cgBudget - cost) * 100) / 100, expenses: cgExpenses + cost });
            if (addToast) addToast('\uD83E\uDEA8 Lime added: pH raised to ' + Math.min(8.5, Math.round((cgPH + 0.3) * 10) / 10), 'success');
          }
          function cgAddSulfur() {
            var cost = 0.50;
            if (cgBudget < cost) { if (addToast) addToast('\uD83D\uDCB0 Need $' + cost.toFixed(2), 'info'); return; }
            cgUpd({ pH: Math.max(4.0, Math.round((cgPH - 0.3) * 10) / 10), budget: Math.round((cgBudget - cost) * 100) / 100, expenses: cgExpenses + cost });
            if (addToast) addToast('\uD83D\uDFE1 Sulfur added: pH lowered to ' + Math.max(4.0, Math.round((cgPH - 0.3) * 10) / 10), 'success');
          }

          // ── IPM (Integrated Pest Management) Actions ──
          function cgIPMAction(action) {
            var cost = { ladybugs: 1.50, neem: 1.00, handpick: 0, rowcovers: 2.00 }[action] || 0;
            if (cgBudget < cost) { if (addToast) addToast('\uD83D\uDCB0 Need $' + cost.toFixed(2), 'info'); return; }
            var newPest = cgPestPop;
            var newBen = cgBeneficialPop;
            var msg = '';
            if (action === 'ladybugs') {
              newPest *= 0.5; newBen += 10;
              msg = '\uD83D\uDC1E Released ladybugs! -50% pests, +10 beneficials';
            } else if (action === 'neem') {
              newPest *= 0.7; newBen *= 0.9;
              msg = '\uD83C\uDF3F Neem spray: -30% all pests, -10% beneficials (broad-spectrum)';
            } else if (action === 'handpick') {
              newPest = Math.max(0, newPest - 20);
              msg = '\u270B Hand-picked pests: -20 pest population (free but labor-intensive)';
            } else if (action === 'rowcovers') {
              // Reduce future pest growth for 10 days
              newPest *= 0.6;
              msg = '\uD83E\uDDF5 Row covers installed: -40% current pests, blocks new entry';
            }
            var newGrid = cgGrid.map(function(c) {
              if (!c.plantId) return c;
              var reduction = action === 'ladybugs' ? 15 : action === 'neem' ? 10 : action === 'handpick' ? 8 : 5;
              return Object.assign({}, c, { pests: Math.max(0, c.pests - reduction) });
            });
            cgUpd({
              grid: newGrid,
              pestPop: Math.round(newPest * 10) / 10,
              beneficialPop: Math.round(newBen * 10) / 10,
              budget: Math.round((cgBudget - cost) * 100) / 100,
              expenses: cgExpenses + cost
            });
            if (addToast) addToast(msg, 'success');
            if (awardStemXP) awardStemXP(5);
          }

          // ── AI Garden Advisor (Gemini) ──
          function cgAskAdvisor() {
            if (!callGemini) { if (addToast) addToast('AI advisor requires Gemini API', 'info'); return; }
            if (cgAdvisorCooldown > 0) { if (addToast) addToast('Advisor available in ' + cgAdvisorCooldown + ' more days', 'info'); return; }
            cgUpd({ advisorCooldown: 30, advisorResponse: 'Thinking...' });
            var planted = cgGrid.filter(function(c) { return c.plantId; }).map(function(c) {
              var p = CG_PLANTS[c.plantId];
              return c.plantId + ' (health:' + Math.round(c.health) + '%, growth:' + Math.round(c.growthDay) + '/' + (p ? p.days : '?') + ', pests:' + Math.round(c.pests) + ')';
            }).join(', ');
            var seasonNames = ['Spring', 'Summer', 'Autumn', 'Winter'];
            var prompt = 'You are a friendly, knowledgeable garden advisor for a K-12 student\'s companion planting simulator.\n\n' +
              'GARDEN STATUS:\n' +
              '- Season: ' + seasonNames[cgSeason] + ', Day ' + cgDay + ', Year ' + cgYear + '\n' +
              '- Soil: N=' + Math.round(cgNitrogen) + '/100, P=' + Math.round(cgPhosphorus) + '/100, K=' + Math.round(cgPotassium) + '/100, pH=' + cgPH + ', OM=' + cgOrganicMatter + '%\n' +
              '- Moisture: ' + Math.round(cgMoisture) + '/100\n' +
              '- Pest pressure: ' + Math.round(cgPestPop) + ' pests, ' + Math.round(cgBeneficialPop) + ' beneficials\n' +
              '- Budget: $' + cgBudget.toFixed(2) + ' (spent $' + cgExpenses.toFixed(2) + ', earned $' + cgRevenue.toFixed(2) + ')\n' +
              '- Plants: ' + (planted || 'none planted yet') + '\n\n' +
              'Give 3 SHORT, specific, actionable tips (2 sentences each max). Focus on the most urgent issue. Use simple language for students. Include one fun science fact.';
            callGemini(prompt, true).then(function(result) {
              var text = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
              cgUpd({ advisorResponse: text.substring(0, 600) });
              if (addToast) addToast('\uD83E\uDDD1\u200D\uD83C\uDF3E Garden Advisor has tips!', 'success');
            }).catch(function() {
              cgUpd({ advisorResponse: 'The advisor is thinking... try again later. In the meantime: check your soil nutrients (NPK), water regularly, and plant companions together!' });
            });
          }

          // ── CG: dismiss event ──
          // ── SEL Reflection Prompts ──
          // Connect garden mechanics to social-emotional learning
          var CG_SEL_REFLECTIONS = {
            first_harvest: {
              emoji: '🌾', title: 'Patience Pays Off',
              prompt: 'Your first harvest took many days of care. Think about a goal in your life that takes patience. What helps you keep going when progress feels slow?',
              competency: 'Self-Management', connection: 'Plants teach us that growth is invisible most of the time. The roots grow before the fruit.'
            },
            pest_event: {
              emoji: '🐛', title: 'Dealing with Setbacks',
              prompt: 'Pests damaged your garden. How did you respond? When something goes wrong in your life, do you react quickly or take time to think about the best response?',
              competency: 'Self-Awareness', connection: 'In gardens and in life, the first reaction isn\'t always the best one. Observation before action leads to better outcomes.'
            },
            companion_discovery: {
              emoji: '🤝', title: 'Better Together',
              prompt: 'You discovered that some plants help each other grow. Who in your life helps you grow? How do you help them?',
              competency: 'Relationship Skills', connection: 'Companion planting works because different strengths complement each other. No plant — and no person — thrives alone.'
            },
            rotation_lesson: {
              emoji: '🔄', title: 'Learning from the Past',
              prompt: 'Planting the same thing in the same place causes problems. Can you think of a time when doing the same thing over and over stopped working? What did you change?',
              competency: 'Responsible Decision-Making', connection: 'Crop rotation teaches us that what worked before might not work now. Adapting to change is a strength, not a failure.'
            },
            biodiversity_win: {
              emoji: '🌍', title: 'Strength in Diversity',
              prompt: 'Your diverse garden attracted more helpful insects and resisted pests better. How does diversity make communities stronger? What happens when everyone thinks and acts the same way?',
              competency: 'Social Awareness', connection: 'Ecosystems and communities are both stronger when they include many different kinds. Monocultures — in gardens and in groups — are fragile.'
            },
            invasive_managed: {
              emoji: '⚔️', title: 'Protecting What Matters',
              prompt: 'You managed an invasive species that threatened your garden. Is there ever a time in your life when you had to stand up to protect something you cared about?',
              competency: 'Responsible Decision-Making', connection: 'Standing up for your garden — or your values — takes courage and persistence. Not every problem has a quick fix.'
            }
          };
          var cgJournal = cg.journal || []; // Array of { id, ts, response }
          var cgActiveReflection = cg.activeReflection || null;
          var cgReflectionResponse = cg.reflectionResponse || '';
          var cgSeenReflections = cg.seenReflections || {};

          function cgTriggerReflection(id) {
            if (cgSeenReflections[id]) return; // only show each once
            var ref = CG_SEL_REFLECTIONS[id];
            if (!ref) return;
            cgUpd({ activeReflection: id, reflectionResponse: '' });
          }

          function cgSubmitReflection() {
            if (!cgActiveReflection || !cgReflectionResponse.trim()) return;
            var newJournal = (cgJournal || []).concat([{
              id: cgActiveReflection,
              ts: new Date().toISOString(),
              response: cgReflectionResponse.trim()
            }]);
            var newSeen = Object.assign({}, cgSeenReflections);
            newSeen[cgActiveReflection] = true;
            cgUpd({ journal: newJournal, activeReflection: null, reflectionResponse: '', seenReflections: newSeen });
            if (addToast) addToast('📝 Reflection saved to your Garden Journal!', 'success');
            if (awardStemXP) awardStemXP(15); // XP for reflecting
          }

          function cgDismissEvent() {
            var managed = cgAchievements.indexOf('defender') === -1 && cgActiveEvent ? 1 : 0;
            cgUpd({ activeEvent: null });
            if (managed && awardStemXP) awardStemXP(10);
            // Trigger SEL reflection for invasive events
            if (cgActiveEvent && !cgActiveEvent.isGood) {
              if (managed) cgTriggerReflection('invasive_managed');
              else cgTriggerReflection('pest_event');
            }
          }

          // ── CG: harvest ready crops ──
          function cgHarvest() {
            var points = 0;
            var harvested = 0;
            var harvestRevenue = 0;
            var newGrid = cgGrid.map(function(cell) {
              if (!cell.plantId) return cell;
              var plant = CG_PLANTS[cell.plantId];
              if (!plant) return cell;
              if (cell.growthDay >= plant.days && cell.health > 20) {
                var bonus = getCellBonus(cgGrid, cgGrid.indexOf(cell));
                var yieldMult = 1 + Math.max(0, bonus.total) / 100;
                // Perennial maturity bonus: yield increases with years
                if (plant.perennial && plant.yearsToMature && cgYear < plant.yearsToMature) {
                  yieldMult *= 0.3; // immature perennial — reduced yield
                } else if (plant.perennial && cgYear >= (plant.yearsToMature || 1)) {
                  yieldMult *= 1 + Math.min(1, (cgYear - plant.yearsToMature) * 0.2); // mature perennials yield more each year
                }
                // Pollination check
                if (plant.needsPoll) {
                  var hasBeeHotel = cgGrid.some(function(c2) { return c2.plantId === 'bee_hotel'; });
                  var hasNearbyPollinator = hasBeeHotel;
                  if (!hasNearbyPollinator) {
                    var cellIdx = cgGrid.indexOf(cell);
                    var cols = 4; var crow = Math.floor(cellIdx / cols); var ccol = cellIdx % cols;
                    for (var pr = Math.max(0, crow - 2); pr <= Math.min(3, crow + 2) && !hasNearbyPollinator; pr++) {
                      for (var pc = Math.max(0, ccol - 2); pc <= Math.min(3, ccol + 2); pc++) {
                        var np = cgGrid[pr * cols + pc];
                        if (np && np.plantId && CG_PLANTS[np.plantId] && CG_PLANTS[np.plantId].pollinator && np.plantId !== 'bee_hotel') { hasNearbyPollinator = true; break; }
                      }
                    }
                  }
                  if (!hasNearbyPollinator) yieldMult *= 0.5;
                }
                var healthMult = cell.health / 100;
                var cropPoints = Math.round(plant.harvest * yieldMult * healthMult);
                points += cropPoints;
                // Economics: calculate revenue from market price
                var price = MARKET_PRICES[cell.plantId] || 1.50;
                harvestRevenue += Math.round(price * yieldMult * healthMult * 100) / 100;
                harvested++;
                // Perennials don't get removed — they reset growth for next cycle
                if (plant.perennial) {
                  return Object.assign({}, cell, { growthDay: 0, watered: false });
                }
                return { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 };
              }
              return cell;
            });
            if (harvested > 0) {
              // Record cell history for crop rotation tracking
              var newHistory = Object.assign({}, cgCellHistory);
              cgGrid.forEach(function(cell, idx) {
                if (cell.plantId && cell.growthDay >= (CG_PLANTS[cell.plantId] || {}).days) {
                  var h2 = (newHistory[idx] || []).slice();
                  h2.push(cell.plantId);
                  if (h2.length > 4) h2 = h2.slice(-4); // keep last 4 seasons
                  newHistory[idx] = h2;
                }
              });
              cgUpd({
                grid: newGrid,
                score: cgScore + points,
                totalHarvested: cgTotalHarvested + harvested,
                cellHistory: newHistory,
                budget: Math.round((cgBudget + harvestRevenue) * 100) / 100,
                revenue: cgRevenue + harvestRevenue
              });
              if (addToast) addToast('\uD83C\uDF3E Harvested ' + harvested + ' crop' + (harvested !== 1 ? 's' : '') + ' for ' + points + ' pts + $' + harvestRevenue.toFixed(2) + ' revenue!', 'success');
              // SEL: first harvest reflection
              if (cgTotalHarvested === 0) setTimeout(function() { cgTriggerReflection('first_harvest'); }, 1000);
              // SEL: biodiversity check
              var harvestFams = {}; cgGrid.forEach(function(c2) { if (c2.plantId) { var p2 = CG_PLANTS[c2.plantId]; if (p2) harvestFams[p2.family] = true; } });
              if (Object.keys(harvestFams).length >= 5) setTimeout(function() { cgTriggerReflection('biodiversity_win'); }, 1500);
              if (awardStemXP) awardStemXP(harvested * 8);
            }
          }

          // ── CG: start growing ──
          function cgStartGrowing() {
            var hasPlants = cgGrid.some(function(c) { return c.plantId; });
            if (!hasPlants) { if (addToast) addToast('Plant something first!', 'info'); return; }
            cgUpd({ phase: 'grow' });
            if (awardStemXP) awardStemXP(10);
          }

          // ── CG: compute stats for achievements ──
          function cgComputeStats() {
            var uniqueSpecies = {};
            var pollinatorPlants = 0;
            var activeBonuses = 0;
            var hasSisters = false;
            var pollinatorList = ['marigold', 'sunflower', 'lavender', 'dill', 'nasturtium', 'clover'];
            cgGrid.forEach(function(cell, idx) {
              if (!cell.plantId) return;
              uniqueSpecies[cell.plantId] = true;
              if (pollinatorList.indexOf(cell.plantId) !== -1) pollinatorPlants++;
              var bonus = getCellBonus(cgGrid, idx);
              activeBonuses += bonus.pairs.filter(function(p) { return p.bonus > 0; }).length;
            });
            // Check Three Sisters
            var planted = Object.keys(uniqueSpecies);
            if (planted.indexOf('corn') !== -1 && planted.indexOf('beans') !== -1 && planted.indexOf('squash') !== -1) {
              // Check adjacency
              cgGrid.forEach(function(cell, idx) {
                if (cell.plantId !== 'corn') return;
                var bonus = getCellBonus(cgGrid, idx);
                var neighborPlants = [];
                var cols = 4;
                var row = Math.floor(idx / cols); var col = idx % cols;
                [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].forEach(function(rc) {
                  if (rc[0] >= 0 && rc[0] < 4 && rc[1] >= 0 && rc[1] < 4) {
                    var ni = rc[0] * cols + rc[1];
                    if (cgGrid[ni] && cgGrid[ni].plantId) neighborPlants.push(cgGrid[ni].plantId);
                  }
                });
                if (neighborPlants.indexOf('beans') !== -1 && neighborPlants.indexOf('squash') !== -1) hasSisters = true;
              });
            }
            return {
              uniqueSpecies: Object.keys(uniqueSpecies).length,
              pollinatorPlants: pollinatorPlants,
              activeBonuses: activeBonuses / 2, // each pair counted twice
              hasSisters: hasSisters,
              totalHarvested: cgTotalHarvested,
              seasonPoints: cgScore,
              noDeaths: cgGrid.every(function(c) { return !c.plantId || c.health > 0; }),
              nitrogenDays: cg.nitrogenDays || 0,
              invasivesManaged: cg.invasivesManaged || 0,
              seasonsRotated: (cgSeasonHistory || []).length,
              regenCount: cgGrid.filter(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].regen; }).length,
              nitrogenFromLegumes: cgNitrogen >= 50 && cgGrid.some(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].nEffect > 0; })
            };
          }


          // ═══════════════════════════════════════
          // COMMUNITY GARDEN UI — render function
          // ═══════════════════════════════════════
          // ═══════════════════════════════════════════════════════
          // MICROSCOPE MODE — zoom into the invisible science
          // Makes molecular chemistry, cell biology, and fungal
          // networks visible to students
          // ═══════════════════════════════════════════════════════
          var cgMicroscopeCell = cg.microscopeCell; // index of cell being examined, or null
          var cgMicroscopeLayer = cg.microscopeLayer || 'roots'; // 'roots' | 'chemistry' | 'cells' | 'fungi'

          function renderMicroscope() {
            var h = React.createElement;
            var idx = cgMicroscopeCell;
            var cell = cgGrid[idx];
            if (!cell || !cell.plantId) return null;
            var plant = CG_PLANTS[cell.plantId];
            if (!plant) return null;
            var bonus = getCellBonus(cgGrid, idx);
            var growthPct = Math.min(100, Math.round((cell.growthDay / plant.days) * 100));
            var isLegume = plant.nEffect > 0;
            var isRegen = plant.regen;
            var neighbors = [];
            var cols = 4; var row = Math.floor(idx / cols); var col = idx % cols;
            [[row-1,col],[row+1,col],[row,col-1],[row,col+1],[row-1,col-1],[row-1,col+1],[row+1,col-1],[row+1,col+1]].forEach(function(rc) {
              if (rc[0] >= 0 && rc[0] < 4 && rc[1] >= 0 && rc[1] < 4) {
                var nc = cgGrid[rc[0] * cols + rc[1]];
                if (nc && nc.plantId) neighbors.push(CG_PLANTS[nc.plantId]);
              }
            });
            var hasNeighborLegume = neighbors.some(function(n) { return n && n.nEffect > 0; });
            var hasNeighborPollinator = neighbors.some(function(n) { return n && n.pollinator; });

            var layers = [
              { id: 'roots', emoji: '🌱', label: 'Root System' },
              { id: 'chemistry', emoji: '⚗️', label: 'Soil Chemistry' },
              { id: 'cells', emoji: '🔬', label: 'Cell Biology' },
              { id: 'fungi', emoji: '🍄', label: 'Fungal Network' }
            ];

            return h('div', { className: 'bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border-2 border-indigo-400 p-4 space-y-3 text-white' },
              // Header
              h('div', { className: 'flex items-center justify-between' },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-2xl' }, '🔬'),
                  h('div', null,
                    h('div', { className: 'font-bold text-sm' }, 'Microscope: ' + plant.emoji + ' ' + plant.label),
                    h('div', { className: 'text-[11px] text-indigo-300' }, 'Zoom into the invisible world beneath the garden'))),
                h('button', { onClick: function() { cgUpd({ microscopeCell: null }); }, className: 'px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold' }, '← Back to Garden')),

              // Layer tabs — ARIA tablist with keyboard navigation
              h('div', { className: 'flex gap-1', role: 'tablist', 'aria-label': 'Microscope science layers' },
                layers.map(function(layer, li) {
                  var active = cgMicroscopeLayer === layer.id;
                  return h('button', { key: layer.id, role: 'tab', 'aria-selected': active ? 'true' : 'false', tabIndex: active ? 0 : -1,
                    'aria-label': layer.label + ' microscope layer',
                    onClick: function() { cgUpd({ microscopeLayer: layer.id }); },
                    onKeyDown: function(ev) {
                      if (ev.key === 'ArrowRight') { ev.preventDefault(); cgUpd({ microscopeLayer: layers[(li + 1) % layers.length].id }); }
                      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); cgUpd({ microscopeLayer: layers[(li - 1 + layers.length) % layers.length].id }); }
                    },
                    className: 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
                  }, h('span', { 'aria-hidden': 'true' }, layer.emoji), layer.label);
                })),

              // ── Microscope Canvas: animated biological visualization ──
              h('canvas', {
                'aria-label': 'Microscope visualization of ' + plant.label + ' — ' + cgMicroscopeLayer + ' layer',
                style: { width: '100%', height: '180px', borderRadius: '10px', display: 'block', border: '1px solid rgba(99,102,241,0.3)' },
                ref: function(mcvEl) {
                  if (!mcvEl) return;
                  var mx = mcvEl.getContext('2d');
                  var MW = mcvEl.width = mcvEl.offsetWidth * 2; var MH = mcvEl.height = 360;
                  if (mcvEl._microAnim) cancelAnimationFrame(mcvEl._microAnim);
                  var mStart = performance.now();
                  var activeLayer = cgMicroscopeLayer;
                  var isLeg = isLegume;
                  var mHealth = cell.health;
                  var mMoist = cgMoisture;
                  function drawMicro() {
                    mcvEl._microAnim = requestAnimationFrame(drawMicro);
                    var mt = (performance.now() - mStart) / 1000;
                    mx.clearRect(0, 0, MW, MH);

                    if (activeLayer === 'roots') {
                      // Underground soil cross-section with root system
                      var soilG = mx.createLinearGradient(0, 0, 0, MH);
                      soilG.addColorStop(0, '#5a4030'); soilG.addColorStop(0.3, '#4a3525'); soilG.addColorStop(1, '#3a2a1a');
                      mx.fillStyle = soilG; mx.fillRect(0, 0, MW, MH);
                      // Soil particles (sand, clay, organic)
                      mx.fillStyle = 'rgba(180,150,100,0.15)';
                      for (var sp = 0; sp < 60; sp++) {
                        mx.beginPath(); mx.arc((sp * 71 + 13) % MW, (sp * 43 + 17) % MH, 2 + (sp % 4), 0, Math.PI * 2); mx.fill();
                      }
                      // Main taproot / fibrous roots
                      mx.strokeStyle = '#8aaa60'; mx.lineWidth = 3;
                      mx.beginPath(); mx.moveTo(MW / 2, 0); mx.quadraticCurveTo(MW / 2 + Math.sin(mt * 0.5) * 5, MH * 0.5, MW / 2, MH * 0.85); mx.stroke();
                      // Lateral roots
                      for (var lr = 0; lr < 8; lr++) {
                        var ry = MH * (0.15 + lr * 0.08);
                        var side = lr % 2 === 0 ? 1 : -1;
                        var rootLen = 30 + lr * 12 + Math.sin(mt * 0.8 + lr) * 5;
                        mx.strokeStyle = 'rgba(138,170,96,' + (0.6 - lr * 0.05) + ')'; mx.lineWidth = 2 - lr * 0.15;
                        mx.beginPath(); mx.moveTo(MW / 2, ry);
                        mx.quadraticCurveTo(MW / 2 + side * rootLen * 0.6, ry + 5, MW / 2 + side * rootLen, ry + 10 + Math.sin(mt + lr) * 3);
                        mx.stroke();
                        // Root hairs
                        for (var rh = 0; rh < 4; rh++) {
                          var rhx = MW / 2 + side * rootLen * (0.3 + rh * 0.2);
                          mx.strokeStyle = 'rgba(138,170,96,0.3)'; mx.lineWidth = 0.5;
                          mx.beginPath(); mx.moveTo(rhx, ry + rh * 2);
                          mx.lineTo(rhx + side * (5 + Math.sin(mt * 2 + rh + lr) * 3), ry + rh * 2 + 4); mx.stroke();
                        }
                      }
                      // Rhizobium nodules (if legume)
                      if (isLeg) {
                        mx.fillStyle = '#cc6666';
                        for (var nd = 0; nd < 5; nd++) {
                          var nx = MW / 2 + (nd % 2 === 0 ? -1 : 1) * (15 + nd * 8);
                          var ny = MH * (0.25 + nd * 0.1);
                          var nr = 4 + Math.sin(mt * 2 + nd) * 1;
                          mx.beginPath(); mx.arc(nx, ny, nr, 0, Math.PI * 2); mx.fill();
                          // Pulsing glow
                          mx.fillStyle = 'rgba(200,100,100,' + (0.15 + Math.sin(mt * 3 + nd) * 0.1) + ')';
                          mx.beginPath(); mx.arc(nx, ny, nr * 2, 0, Math.PI * 2); mx.fill();
                          mx.fillStyle = '#cc6666';
                        }
                        // N2 symbols floating up
                        mx.fillStyle = '#88ccff'; mx.font = 'bold 10px monospace';
                        for (var n2 = 0; n2 < 3; n2++) {
                          var n2y = MH * 0.3 - (mt * 15 + n2 * 40) % (MH * 0.3);
                          mx.globalAlpha = 0.4 + Math.sin(mt + n2) * 0.2;
                          mx.fillText('N\u2082', MW / 2 - 30 + n2 * 30 + Math.sin(mt + n2) * 10, n2y);
                        }
                        mx.globalAlpha = 1;
                      }
                      // Water droplets moving through soil
                      mx.fillStyle = 'rgba(100,180,255,0.4)';
                      for (var wd = 0; wd < 6; wd++) {
                        var wdx = (wd * 67 + mt * 20) % MW;
                        var wdy = (wd * 41 + mt * 30) % MH;
                        mx.beginPath(); mx.arc(wdx, wdy, 2, 0, Math.PI * 2); mx.fill();
                      }

                    } else if (activeLayer === 'cells') {
                      // Plant cell cross-section
                      mx.fillStyle = '#0a2010'; mx.fillRect(0, 0, MW, MH);
                      // Cell wall (rectangular)
                      var cMargin = 30;
                      mx.strokeStyle = '#6aaa40'; mx.lineWidth = 6;
                      mx.strokeRect(cMargin, cMargin, MW - cMargin * 2, MH - cMargin * 2);
                      // Cell membrane (just inside wall)
                      mx.strokeStyle = 'rgba(100,180,100,0.5)'; mx.lineWidth = 2;
                      mx.strokeRect(cMargin + 8, cMargin + 8, MW - cMargin * 2 - 16, MH - cMargin * 2 - 16);
                      // Large central vacuole
                      var vacX = MW * 0.5; var vacY = MH * 0.5;
                      mx.fillStyle = 'rgba(80,160,220,0.15)';
                      mx.beginPath(); mx.ellipse(vacX, vacY, MW * 0.28, MH * 0.28, 0, 0, Math.PI * 2); mx.fill();
                      mx.strokeStyle = 'rgba(80,160,220,0.3)'; mx.lineWidth = 1;
                      mx.beginPath(); mx.ellipse(vacX, vacY, MW * 0.28, MH * 0.28, 0, 0, Math.PI * 2); mx.stroke();
                      mx.fillStyle = 'rgba(100,180,240,0.08)'; mx.font = '10px system-ui'; mx.textAlign = 'center';
                      mx.fillText('Central Vacuole', vacX, vacY + 4);
                      // Nucleus
                      var nucX = MW * 0.3; var nucY = MH * 0.35;
                      mx.fillStyle = 'rgba(150,100,180,0.4)'; mx.beginPath(); mx.arc(nucX, nucY, 22, 0, Math.PI * 2); mx.fill();
                      mx.strokeStyle = 'rgba(180,120,200,0.6)'; mx.lineWidth = 2; mx.beginPath(); mx.arc(nucX, nucY, 22, 0, Math.PI * 2); mx.stroke();
                      // Nucleolus
                      mx.fillStyle = 'rgba(200,150,220,0.6)'; mx.beginPath(); mx.arc(nucX + 3, nucY - 2, 7, 0, Math.PI * 2); mx.fill();
                      // Label
                      mx.fillStyle = '#c0a0e0'; mx.font = 'bold 9px system-ui'; mx.fillText('Nucleus', nucX, nucY + 32);
                      // Chloroplasts (green ovals, scattered)
                      for (var ch = 0; ch < 12; ch++) {
                        var chx = cMargin + 50 + (ch * 43) % (MW - cMargin * 2 - 80);
                        var chy = cMargin + 50 + (ch * 29) % (MH - cMargin * 2 - 80);
                        // Avoid overlapping nucleus and vacuole
                        var distNuc = Math.sqrt((chx - nucX) * (chx - nucX) + (chy - nucY) * (chy - nucY));
                        var distVac = Math.sqrt((chx - vacX) * (chx - vacX) + (chy - vacY) * (chy - vacY));
                        if (distNuc < 35 || distVac < MW * 0.25) continue;
                        mx.fillStyle = 'rgba(50,160,50,' + (0.5 + Math.sin(mt * 2 + ch) * 0.15) + ')';
                        mx.beginPath(); mx.ellipse(chx, chy, 8, 4, ch * 0.5 + Math.sin(mt * 0.5 + ch) * 0.2, 0, Math.PI * 2); mx.fill();
                        // Thylakoid stacks (internal lines)
                        mx.strokeStyle = 'rgba(30,120,30,0.4)'; mx.lineWidth = 0.5;
                        for (var th = -2; th <= 2; th++) {
                          mx.beginPath(); mx.moveTo(chx - 5, chy + th * 1.5); mx.lineTo(chx + 5, chy + th * 1.5); mx.stroke();
                        }
                      }
                      mx.fillStyle = '#60cc60'; mx.font = 'bold 8px system-ui'; mx.textAlign = 'left';
                      mx.fillText('Chloroplasts', cMargin + 12, MH - cMargin - 8);
                      // Mitochondria (orange ovals)
                      for (var mi = 0; mi < 6; mi++) {
                        var mix = MW * 0.6 + (mi * 37) % (MW * 0.3);
                        var miy = MH * 0.55 + (mi * 23) % (MH * 0.3);
                        mx.fillStyle = 'rgba(220,130,50,' + (0.4 + Math.sin(mt * 1.5 + mi) * 0.1) + ')';
                        mx.beginPath(); mx.ellipse(mix, miy, 6, 3, mi * 0.8, 0, Math.PI * 2); mx.fill();
                        // Cristae folds
                        mx.strokeStyle = 'rgba(180,100,30,0.3)'; mx.lineWidth = 0.5;
                        mx.beginPath(); mx.moveTo(mix - 3, miy); mx.quadraticCurveTo(mix, miy - 2, mix + 3, miy); mx.stroke();
                      }
                      mx.fillStyle = '#e0a050'; mx.font = 'bold 8px system-ui'; mx.textAlign = 'right';
                      mx.fillText('Mitochondria', MW - cMargin - 12, MH - cMargin - 8);
                      // ER (endoplasmic reticulum) — wavy lines near nucleus
                      mx.strokeStyle = 'rgba(180,180,100,0.25)'; mx.lineWidth = 1;
                      for (var er = 0; er < 5; er++) {
                        mx.beginPath();
                        for (var ex = 0; ex < 8; ex++) {
                          var erx = nucX + 30 + ex * 12; var ery = nucY - 20 + er * 10 + Math.sin(mt * 1.5 + ex + er) * 3;
                          if (ex === 0) mx.moveTo(erx, ery); else mx.lineTo(erx, ery);
                        }
                        mx.stroke();
                      }
                      // Lens vignette
                      mx.globalAlpha = 0.3;
                      var vg2 = mx.createRadialGradient(MW / 2, MH / 2, MH * 0.35, MW / 2, MH / 2, MH * 0.55);
                      vg2.addColorStop(0, 'transparent'); vg2.addColorStop(1, '#000');
                      mx.fillStyle = vg2; mx.fillRect(0, 0, MW, MH);
                      mx.globalAlpha = 1;

                    } else if (activeLayer === 'chemistry') {
                      // Soil cross-section with NPK particles
                      mx.fillStyle = '#1a1a2e'; mx.fillRect(0, 0, MW, MH);
                      // NPK molecules floating
                      var molecules = [
                        { label: 'NO\u2083\u207B', color: '#4ade80', count: Math.round(cgNitrogen / 10) },
                        { label: 'PO\u2084\u00B3\u207B', color: '#60a5fa', count: Math.round(cgPhosphorus / 12) },
                        { label: 'K\u207A', color: '#a78bfa', count: Math.round(cgPotassium / 12) }
                      ];
                      molecules.forEach(function(mol, mi2) {
                        mx.fillStyle = mol.color; mx.font = 'bold 10px monospace';
                        for (var mc = 0; mc < mol.count; mc++) {
                          var mcx = (mc * 67 + mi2 * 90 + Math.sin(mt * 0.5 + mc + mi2) * 20) % (MW - 40) + 20;
                          var mcy = (mc * 43 + mi2 * 60 + Math.cos(mt * 0.3 + mc) * 15) % (MH - 40) + 20;
                          mx.globalAlpha = 0.4 + Math.sin(mt * 2 + mc + mi2) * 0.2;
                          mx.fillText(mol.label, mcx, mcy);
                        }
                      });
                      mx.globalAlpha = 1;
                      // pH indicator bar
                      mx.fillStyle = 'rgba(0,0,0,0.5)'; mx.fillRect(MW * 0.1, MH - 40, MW * 0.8, 20);
                      var phGrad = mx.createLinearGradient(MW * 0.1, 0, MW * 0.9, 0);
                      phGrad.addColorStop(0, '#ef4444'); phGrad.addColorStop(0.35, '#fbbf24'); phGrad.addColorStop(0.5, '#22c55e'); phGrad.addColorStop(0.65, '#3b82f6'); phGrad.addColorStop(1, '#8b5cf6');
                      mx.fillStyle = phGrad; mx.fillRect(MW * 0.1 + 2, MH - 38, MW * 0.8 - 4, 16);
                      // pH marker
                      var phPos = MW * 0.1 + ((cgPH - 4) / 4.5) * MW * 0.8;
                      mx.fillStyle = '#fff'; mx.beginPath();
                      mx.moveTo(phPos, MH - 42); mx.lineTo(phPos - 5, MH - 50); mx.lineTo(phPos + 5, MH - 50); mx.fill();
                      mx.font = 'bold 9px system-ui'; mx.textAlign = 'center'; mx.fillText('pH ' + cgPH, phPos, MH - 54);
                      // Labels
                      mx.fillStyle = '#999'; mx.font = '8px system-ui'; mx.textAlign = 'left'; mx.fillText('Acidic (4)', MW * 0.1, MH - 10);
                      mx.textAlign = 'right'; mx.fillText('Alkaline (8.5)', MW * 0.9, MH - 10);

                    } else if (activeLayer === 'fungi') {
                      // Underground network visualization
                      mx.fillStyle = '#1a0a20'; mx.fillRect(0, 0, MW, MH);
                      // Mycelial network (branching lines)
                      mx.strokeStyle = 'rgba(180,140,220,0.3)'; mx.lineWidth = 1;
                      var nodes = [];
                      for (var fn = 0; fn < 15; fn++) {
                        nodes.push({ x: (fn * 71 + 30) % (MW - 60) + 30, y: (fn * 47 + 20) % (MH - 40) + 20 });
                      }
                      // Draw connections
                      nodes.forEach(function(n1, i1) {
                        nodes.forEach(function(n2, i2) {
                          if (i2 <= i1) return;
                          var d2 = Math.sqrt((n1.x - n2.x) * (n1.x - n2.x) + (n1.y - n2.y) * (n1.y - n2.y));
                          if (d2 > 130) return;
                          var pulse = 0.15 + Math.sin(mt * 1.5 + i1 + i2) * 0.1;
                          mx.strokeStyle = 'rgba(180,140,220,' + pulse + ')'; mx.lineWidth = 0.8;
                          mx.beginPath(); mx.moveTo(n1.x, n1.y);
                          mx.quadraticCurveTo((n1.x + n2.x) / 2 + Math.sin(mt + i1) * 10, (n1.y + n2.y) / 2 + Math.cos(mt + i2) * 8, n2.x, n2.y);
                          mx.stroke();
                        });
                      });
                      // Nodes (root connection points)
                      nodes.forEach(function(n, ni) {
                        var nPulse = 0.5 + Math.sin(mt * 2 + ni * 1.5) * 0.3;
                        mx.fillStyle = 'rgba(180,140,220,' + nPulse + ')';
                        mx.beginPath(); mx.arc(n.x, n.y, 3 + Math.sin(mt * 1.5 + ni) * 1, 0, Math.PI * 2); mx.fill();
                      });
                      // Nutrient transfer particles flowing along connections
                      mx.fillStyle = 'rgba(100,255,180,0.6)';
                      for (var np = 0; np < 8; np++) {
                        var nIdx = np % nodes.length; var nIdx2 = (np + 3) % nodes.length;
                        var npT = (mt * 0.4 + np * 0.3) % 1;
                        var npx = nodes[nIdx].x + (nodes[nIdx2].x - nodes[nIdx].x) * npT;
                        var npy = nodes[nIdx].y + (nodes[nIdx2].y - nodes[nIdx].y) * npT;
                        mx.beginPath(); mx.arc(npx, npy, 2, 0, Math.PI * 2); mx.fill();
                      }
                      // Plant root anchors at top
                      mx.fillStyle = '#6a9a50';
                      for (var pa = 0; pa < 4; pa++) {
                        var pax = MW * (0.15 + pa * 0.23);
                        mx.beginPath(); mx.moveTo(pax - 8, 0); mx.lineTo(pax, 25); mx.lineTo(pax + 8, 0); mx.fill();
                        mx.fillStyle = '#8aba60'; mx.font = '8px system-ui'; mx.textAlign = 'center';
                        mx.fillText('Root ' + (pa + 1), pax, 35); mx.fillStyle = '#6a9a50';
                      }
                    }

                    // Microscope lens border overlay (all layers)
                    mx.strokeStyle = 'rgba(99,102,241,0.4)'; mx.lineWidth = 3;
                    mx.beginPath(); mx.arc(MW / 2, MH / 2, Math.min(MW, MH) * 0.47, 0, Math.PI * 2); mx.stroke();
                    // Crosshair
                    mx.strokeStyle = 'rgba(255,255,255,0.08)'; mx.lineWidth = 0.5;
                    mx.beginPath(); mx.moveTo(MW / 2, 10); mx.lineTo(MW / 2, MH - 10); mx.stroke();
                    mx.beginPath(); mx.moveTo(10, MH / 2); mx.lineTo(MW - 10, MH / 2); mx.stroke();
                    // Magnification label
                    mx.fillStyle = 'rgba(255,255,255,0.3)'; mx.font = 'bold 9px monospace'; mx.textAlign = 'right';
                    mx.fillText(activeLayer === 'cells' ? '400x' : activeLayer === 'fungi' ? '50x' : activeLayer === 'roots' ? '10x' : '100x', MW - 15, 18);
                  }
                  drawMicro();
                  var mobs = new MutationObserver(function() {
                    if (!document.contains(mcvEl)) { cancelAnimationFrame(mcvEl._microAnim); mobs.disconnect(); }
                  });
                  mobs.observe(document.body, { childList: true, subtree: true });
                }
              }),

              // ── ROOT SYSTEM VIEW ──
              cgMicroscopeLayer === 'roots' && h('div', { className: 'bg-gradient-to-b from-amber-900/30 to-amber-950/50 rounded-xl p-4 space-y-3 border border-amber-700/30' },
                h('div', { className: 'text-sm font-bold text-amber-200' }, '🌱 Root Architecture of ' + plant.label),
                h('div', { className: 'text-xs text-amber-100/80 leading-relaxed space-y-2' },
                  h('p', null, plant.family === 'umbel' || plant.plantId === 'carrot'
                    ? '📐 Taproot system — one deep primary root (up to 12" for carrots) that mines water and minerals from deep soil layers. Side rootlets branch off to absorb nearby nutrients.'
                    : plant.family === 'grass'
                    ? '🌾 Fibrous root system — a dense mat of thin roots that hold soil in place and absorb water efficiently from the top 6" of soil. Corn roots can extend 6 feet laterally.'
                    : '🔀 Branching root system — primary and secondary roots spread outward and downward, creating a zone of nutrient uptake called the rhizosphere.'),
                  isLegume && h('div', { className: 'bg-emerald-900/40 rounded-lg p-3 border border-emerald-500/30' },
                    h('div', { className: 'font-bold text-emerald-300 text-xs mb-1' }, '🔴 Root Nodules (Nitrogen Fixation)'),
                    h('p', null, 'Swollen pink/red nodules on the roots contain billions of Rhizobium bacteria. These bacteria have an enzyme called nitrogenase that breaks the triple bond of atmospheric N₂ — one of the strongest chemical bonds in nature.'),
                    h('p', { className: 'mt-1 font-mono text-emerald-400 text-center text-sm' }, 'N₂ + 8H⁺ + 8e⁻ + 16ATP → 2NH₃ + H₂ + 16ADP'),
                    h('p', { className: 'mt-1' }, 'This reaction converts inert nitrogen gas into ammonia (NH₃), which plant roots can absorb. It\'s the biological equivalent of the industrial Haber-Bosch process — but at room temperature, using only sunlight energy.')),
                  h('div', { className: 'bg-slate-800/50 rounded-lg p-3 border border-slate-600/30' },
                    h('div', { className: 'font-bold text-slate-300 text-xs mb-1' }, '💧 Water Transport (Osmosis)'),
                    h('p', null, 'Root hairs increase surface area by 100×. Water enters by osmosis — moving from low solute concentration (soil) to high (root cells). The path: soil → root hair → cortex → xylem → stem → leaves.'),
                    h('p', { className: 'mt-1 font-mono text-blue-400 text-center text-sm' }, 'Ψ_soil > Ψ_root → H₂O flows into root'),
                    h('p', { className: 'mt-1' }, 'Water potential (Ψ) drives the flow. Transpiration from leaves creates negative pressure that pulls water up — like a straw. A large tree can move 100+ gallons per day this way.')))),

              // ── SOIL CHEMISTRY VIEW ──
              cgMicroscopeLayer === 'chemistry' && h('div', { className: 'bg-gradient-to-b from-slate-800/50 to-slate-900/50 rounded-xl p-4 space-y-3 border border-slate-600/30' },
                h('div', { className: 'text-sm font-bold text-blue-200' }, '⚗️ Soil Chemistry Around ' + plant.label),
                h('div', { className: 'text-xs text-slate-200/80 leading-relaxed space-y-2' },
                  // NPK
                  h('div', { className: 'bg-indigo-900/40 rounded-lg p-3 border border-indigo-500/30' },
                    h('div', { className: 'font-bold text-indigo-300 text-xs mb-1' }, '🧪 The NPK Cycle'),
                    h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
                      h('div', { className: 'text-center bg-blue-900/40 rounded-lg p-2' }, h('div', { className: 'text-lg font-black text-blue-400' }, 'N'), h('div', { className: 'text-[11px] text-blue-300' }, 'Nitrogen'), h('div', { className: 'text-[11px] text-slate-600' }, 'Drives leaf growth')),
                      h('div', { className: 'text-center bg-orange-900/40 rounded-lg p-2' }, h('div', { className: 'text-lg font-black text-orange-400' }, 'P'), h('div', { className: 'text-[11px] text-orange-300' }, 'Phosphorus'), h('div', { className: 'text-[11px] text-slate-600' }, 'Drives roots & fruit')),
                      h('div', { className: 'text-center bg-purple-900/40 rounded-lg p-2' }, h('div', { className: 'text-lg font-black text-purple-400' }, 'K'), h('div', { className: 'text-[11px] text-purple-300' }, 'Potassium'), h('div', { className: 'text-[11px] text-slate-600' }, 'Drives health & water'))),
                    h('p', null, plant.nEffect < 0
                      ? '⬇️ ' + plant.label + ' is a heavy feeder — it consumes nitrogen faster than the soil replaces it. Without legume neighbors or compost, nitrogen depletes over time.'
                      : plant.nEffect > 0
                      ? '⬆️ ' + plant.label + ' ADDS nitrogen through biological fixation. Rhizobium bacteria in root nodules convert N₂ gas into plant-available NH₄⁺.'
                      : '↔️ ' + plant.label + ' has moderate nutrient needs. It takes what it needs without depleting or enriching the soil significantly.')),
                  // Companion chemistry
                  bonus.pairs.length > 0 && h('div', { className: 'bg-emerald-900/40 rounded-lg p-3 border border-emerald-500/30' },
                    h('div', { className: 'font-bold text-emerald-300 text-xs mb-1' }, '🧬 Companion Chemistry (Active)'),
                    bonus.pairs.map(function(p, i) {
                      return h('div', { key: i, className: 'mb-1 text-xs' },
                        h('span', { className: p.bonus > 0 ? 'text-emerald-400' : 'text-red-400' }, (p.bonus > 0 ? '✅ +' : '⚠️ ') + p.bonus + '% '),
                        h('span', { className: 'text-slate-300' }, p.desc));
                    })),
                  // Allelopathy
                  h('div', { className: 'bg-amber-900/30 rounded-lg p-3 border border-amber-600/30' },
                    h('div', { className: 'font-bold text-amber-300 text-xs mb-1' }, '☠️ Allelopathy (Chemical Warfare)'),
                    h('p', null, 'Some plants release chemicals from their roots that inhibit competitors. Sunflowers release heliannuol. Black walnut releases juglone. Even decomposing brassica leaves release glucosinolates that can suppress the next crop.'),
                    h('p', { className: 'mt-1 font-mono text-amber-400 text-center text-sm' }, 'Root exudates → soil → neighboring root uptake → growth inhibition')))),

              // ── CELL BIOLOGY VIEW ──
              cgMicroscopeLayer === 'cells' && h('div', { className: 'bg-gradient-to-b from-green-900/30 to-green-950/50 rounded-xl p-4 space-y-3 border border-green-600/30' },
                h('div', { className: 'text-sm font-bold text-green-200' }, '🔬 Inside a ' + plant.label + ' Cell'),
                h('div', { className: 'text-xs text-green-100/80 leading-relaxed space-y-2' },
                  // Photosynthesis
                  h('div', { className: 'bg-green-900/40 rounded-lg p-3 border border-green-500/30' },
                    h('div', { className: 'font-bold text-green-300 text-xs mb-1' }, '☀️ Photosynthesis (Chloroplasts)'),
                    h('p', null, 'Inside each leaf cell, hundreds of chloroplasts capture photons of sunlight. Chlorophyll molecules absorb red and blue light (reflecting green — that\'s why plants look green). The energy splits water molecules and drives carbon fixation:'),
                    h('p', { className: 'mt-1 font-mono text-green-400 text-center text-sm' }, '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂'),
                    h('p', { className: 'mt-1' }, 'This single equation sustains nearly all life on Earth. The glucose (C₆H₁₂O₆) becomes the plant\'s energy and building material. The oxygen (O₂) is released — every breath you take was made by a plant.')),
                  // Cellular respiration
                  h('div', { className: 'bg-orange-900/30 rounded-lg p-3 border border-orange-500/30' },
                    h('div', { className: 'font-bold text-orange-300 text-xs mb-1' }, '🔥 Cellular Respiration (Mitochondria)'),
                    h('p', null, 'At night (and always, in roots), mitochondria reverse the process — burning glucose to release energy for growth:'),
                    h('p', { className: 'mt-1 font-mono text-orange-400 text-center text-sm' }, 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36 ATP'),
                    h('p', { className: 'mt-1' }, 'ATP is the universal energy currency of life. Every cell process — growth, division, nutrient transport — spends ATP. A growing plant produces and consumes millions of ATP molecules per second.')),
                  // Cell wall & turgor
                  h('div', { className: 'bg-blue-900/30 rounded-lg p-3 border border-blue-500/30' },
                    h('div', { className: 'font-bold text-blue-300 text-xs mb-1' }, '🧱 Cell Wall & Turgor Pressure'),
                    h('p', null, 'Plant cells have a rigid cellulose wall (animals don\'t). Water pressure inside the cell (turgor) pushes against the wall, keeping the plant upright. When a plant wilts, it\'s losing turgor pressure — the cells deflate like tiny balloons.'),
                    h('p', { className: 'mt-1' }, cgMoisture < 30 ? '⚠️ Your soil moisture is low — this plant\'s cells are losing turgor. Water soon!' : '✅ Good moisture levels — cells are fully turgid and the plant stands strong.')),
                  // Dynamic science meters
                  h('div', { className: 'bg-slate-800/50 rounded-lg p-3 border border-slate-600/30' },
                    h('div', { className: 'font-bold text-yellow-300 text-xs mb-2' }, '📊 Live Plant Processes (right now)'),
                    (function() {
                      var sunlight = [0.7, 1.0, 0.5, 0.1][cgSeason]; // seasonal sunlight
                      var waterAvail = Math.min(1, cgMoisture / 60);
                      var photoRate = Math.round(sunlight * waterAvail * (cell.health / 100) * 100);
                      var respRate = Math.round((cell.health / 100) * 60); // always runs
                      var netCarbon = photoRate - respRate;
                      var transpRate = Math.round(sunlight * waterAvail * 80); // water loss through leaves
                      return h('div', { className: 'space-y-2' },
                        // Photosynthesis bar
                        h('div', null,
                          h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                            h('span', { className: 'text-green-400' }, '☀️ Photosynthesis rate'),
                            h('span', { className: 'text-green-300 font-mono' }, photoRate + '%')),
                          h('div', { className: 'h-2 bg-slate-700 rounded-full overflow-hidden' },
                            h('div', { style: { width: photoRate + '%' }, className: 'h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all' }))),
                        // Respiration bar
                        h('div', null,
                          h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                            h('span', { className: 'text-orange-400' }, '🔥 Respiration rate'),
                            h('span', { className: 'text-orange-300 font-mono' }, respRate + '%')),
                          h('div', { className: 'h-2 bg-slate-700 rounded-full overflow-hidden' },
                            h('div', { style: { width: respRate + '%' }, className: 'h-full bg-gradient-to-r from-orange-500 to-red-400 rounded-full transition-all' }))),
                        // Net carbon
                        h('div', { className: 'text-center text-[11px] font-bold ' + (netCarbon > 0 ? 'text-green-400' : 'text-red-400') },
                          'Net carbon: ' + (netCarbon > 0 ? '+' + netCarbon + '% → Growth!' : netCarbon + '% → Using stored energy')),
                        h('p', { className: 'text-[11px] text-slate-200 mt-1' },
                          cgSeason === 3 ? '❄️ Winter: minimal sunlight. Plant relies on stored sugars. Photosynthesis nearly stopped.'
                          : cgSeason === 1 ? '☀️ Summer: peak sunlight drives maximum photosynthesis. Watch water — transpiration is high.'
                          : cgSeason === 0 ? '🌱 Spring: increasing daylight ramps up photosynthesis. Growth accelerating.'
                          : '🍂 Autumn: declining light slows photosynthesis. Plant preparing for dormancy.'),
                        // Transpiration
                        h('div', null,
                          h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                            h('span', { className: 'text-blue-400' }, '💨 Transpiration (water loss through leaves)'),
                            h('span', { className: 'text-blue-300 font-mono' }, transpRate + '%')),
                          h('div', { className: 'h-2 bg-slate-700 rounded-full overflow-hidden' },
                            h('div', { style: { width: transpRate + '%' }, className: 'h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all' }))),
                        h('p', { className: 'text-[11px] text-slate-600' }, 'Water evaporates from leaf stomata, pulling more water up from roots (transpiration stream). ' + (transpRate > 60 ? 'High transpiration — soil drying quickly!' : 'Moderate transpiration — soil moisture is stable.')));
                    })()))),

              // ── FUNGAL NETWORK VIEW ──
              cgMicroscopeLayer === 'fungi' && h('div', { className: 'bg-gradient-to-b from-purple-900/30 to-purple-950/50 rounded-xl p-4 space-y-3 border border-purple-600/30' },
                h('div', { className: 'text-sm font-bold text-purple-200' }, '🍄 The Wood Wide Web'),
                h('div', { className: 'text-xs text-purple-100/80 leading-relaxed space-y-2' },
                  h('div', { className: 'bg-purple-900/40 rounded-lg p-3 border border-purple-500/30' },
                    h('div', { className: 'font-bold text-purple-300 text-xs mb-1' }, '🕸️ Mycorrhizal Networks'),
                    h('p', null, 'Beneath your garden, an invisible internet of fungal threads (hyphae) connects 90% of plant species. These mycorrhizal fungi form symbiotic partnerships with roots:'),
                    h('div', { className: 'my-2 bg-purple-800/30 rounded-lg p-2 text-center' },
                      h('div', { className: 'flex items-center justify-center gap-3' },
                        h('div', { className: 'text-center' }, h('div', { className: 'text-xl' }, '🌱'), h('div', { className: 'text-[11px] text-purple-300' }, 'Plant')),
                        h('div', { className: 'text-purple-400 text-sm' }, '← sugars (C₆H₁₂O₆)'),
                        h('div', { className: 'text-center' }, h('div', { className: 'text-xl' }, '🍄'), h('div', { className: 'text-[11px] text-purple-300' }, 'Fungus')),
                        h('div', { className: 'text-purple-400 text-sm' }, 'phosphorus (PO₄³⁻) →'),
                        h('div', { className: 'text-center' }, h('div', { className: 'text-xl' }, '🌱'), h('div', { className: 'text-[11px] text-purple-300' }, 'Plant')))),
                    h('p', null, 'The fungus extends the plant\'s root system by 100-1000×, accessing water and phosphorus the roots can\'t reach. In return, the plant shares 10-30% of its photosynthesized sugars. Both benefit — neither survives as well alone.')),
                  h('div', { className: 'bg-indigo-900/40 rounded-lg p-3 border border-indigo-500/30' },
                    h('div', { className: 'font-bold text-indigo-300 text-xs mb-1' }, '📡 Chemical Signaling'),
                    h('p', null, 'When one plant is attacked by pests, it sends chemical alarm signals through the fungal network. Connected plants receive the warning and preemptively produce defensive compounds — before the pest even reaches them.'),
                    h('p', { className: 'mt-1' }, '"Mother trees" (the largest, oldest plants) share nutrients with seedlings through the network, especially shaded seedlings that can\'t photosynthesize enough on their own. The forest — and the garden — is a community, not a competition.')),
                  h('div', { className: 'bg-red-900/30 rounded-lg p-3 border border-red-500/30' },
                    h('div', { className: 'font-bold text-red-300 text-xs mb-1' }, '⚠️ Threats to the Network'),
                    h('p', null, 'Tilling destroys mycorrhizal networks (this is why no-till farming is gaining traction). Chemical fertilizers can suppress fungal growth — the plant gets "lazy" and stops feeding its fungal partner. Garlic mustard (an invasive) releases chemicals that specifically destroy mycorrhizal fungi, devastating the entire underground ecosystem.'),
                    h('p', { className: 'mt-1' }, neighbors.length > 0
                      ? '🌐 This plant has ' + neighbors.length + ' neighbors. The mycorrhizal network likely connects them all, sharing nutrients and warning signals underground.'
                      : '🏝️ This plant is isolated — fewer network connections mean less nutrient sharing and no warning signals from neighbors.')))),

              // Current cell stats
              h('div', { className: 'bg-slate-700/50 rounded-lg p-3 grid grid-cols-4 gap-2 text-center text-[11px]' },
                h('div', null, h('div', { className: 'text-lg font-black text-emerald-400' }, growthPct + '%'), h('div', { className: 'text-slate-200' }, 'Growth')),
                h('div', null, h('div', { className: 'text-lg font-black ' + (cell.health > 70 ? 'text-green-400' : cell.health > 40 ? 'text-yellow-400' : 'text-red-400') }, Math.round(cell.health)), h('div', { className: 'text-slate-200' }, 'Health')),
                h('div', null, h('div', { className: 'text-lg font-black ' + (bonus.total > 0 ? 'text-emerald-400' : bonus.total < 0 ? 'text-red-400' : 'text-slate-200') }, (bonus.total > 0 ? '+' : '') + bonus.total + '%'), h('div', { className: 'text-slate-200' }, 'Companion')),
                h('div', null, h('div', { className: 'text-lg font-black text-orange-400' }, Math.round(cell.pests)), h('div', { className: 'text-slate-200' }, 'Pests'))));
          }

          function renderCommunityGarden() {
            var h = React.createElement;
            var seasonNames = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'];
            var stats = cgComputeStats();
            var plantKeys = Object.keys(CG_PLANTS);

            // Auto-advance days when in grow phase
            // (The parent tick system handles this for Three Sisters;
            //  for Community Garden we trigger via button clicks for clarity)

            // If microscope is active, show it instead of the garden
            if (typeof cgMicroscopeCell === 'number' && cgGrid[cgMicroscopeCell] && cgGrid[cgMicroscopeCell].plantId) {
              return h('div', { className: 'space-y-3' }, renderMicroscope());
            }

            return h('div', { className: 'space-y-3' },
              // ── SEL Reflection Modal ──
              cgActiveReflection && CG_SEL_REFLECTIONS[cgActiveReflection] && (function() {
                var ref = CG_SEL_REFLECTIONS[cgActiveReflection];
                return h('div', { className: 'bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl border-2 border-violet-300 p-5 space-y-3 shadow-lg' },
                  h('div', { className: 'flex items-center gap-3' },
                    h('span', { className: 'text-3xl' }, ref.emoji),
                    h('div', null,
                      h('div', { className: 'font-bold text-violet-800 text-sm' }, ref.title),
                      h('div', { className: 'text-[11px] text-violet-600 font-semibold uppercase tracking-wide' }, 'SEL: ' + ref.competency))),
                  h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, ref.prompt),
                  h('div', { className: 'bg-white rounded-lg p-3 border border-violet-200' },
                    h('p', { className: 'text-xs text-violet-700 italic mb-2' }, '🌱 ' + ref.connection),
                    h('textarea', {
                      value: cgReflectionResponse,
                      onChange: function(ev) { cgUpd({ reflectionResponse: ev.target.value }); },
                      placeholder: 'Write your reflection here...',
                      rows: 3,
                      'aria-label': 'Your reflection',
                      className: 'w-full text-sm border border-slate-400 rounded-lg p-2 outline-none focus:ring-2 focus:ring-violet-300 resize-none'
                    })),
                  h('div', { className: 'flex gap-2' },
                    h('button', { onClick: cgSubmitReflection, disabled: !cgReflectionResponse.trim(), className: 'px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-40' }, '📝 Save to Journal'),
                    h('button', { onClick: function() { cgUpd({ activeReflection: null }); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200' }, 'Skip')));
              })(),
              // ── Event popup ──
              cgActiveEvent && (function() {
                var isGood = cgActiveEvent.isGood;
                var bgClass = isGood ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-red-50 border-2 border-red-300';
                var titleClass = isGood ? 'font-bold text-emerald-800' : 'font-bold text-red-800';
                var descClass = isGood ? 'text-sm text-emerald-600' : 'text-sm text-red-600';
                var borderClass = isGood ? 'border-emerald-200' : 'border-red-200';
                var btnClass = isGood ? 'px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold hover:bg-emerald-700' : 'px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700';
                var btnText = isGood ? '🌱 Great!' : '⚔️ Manage & Dismiss';
                return h('div', { className: bgClass + ' rounded-xl p-4 space-y-2 animate-in slide-in-from-top' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-2xl' }, cgActiveEvent.emoji),
                    h('div', null,
                      h('div', { className: titleClass }, cgActiveEvent.label),
                      h('div', { className: descClass }, cgActiveEvent.desc))),
                  h('div', { className: 'bg-white rounded-lg p-3 text-xs text-slate-700 border ' + borderClass },
                    h('strong', null, '🔬 Science: '), cgActiveEvent.lesson),
                  h('button', { onClick: cgDismissEvent, className: btnClass }, btnText));
              })(),

              // ── Status bar ──
              h('div', { className: 'flex flex-wrap gap-3 items-center text-xs font-bold' },
                h('span', { className: 'bg-sky-100 text-sky-800 px-3 py-1 rounded-full' }, seasonNames[cgSeason] + ' Day ' + ((cgDay % 30) + 1)),
                h('span', { className: 'bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full' }, '💧 ' + Math.round(cgMoisture) + '%'),
                h('span', { className: 'bg-amber-100 text-amber-800 px-3 py-1 rounded-full' }, '⚗️ N: ' + Math.round(cgNitrogen) + '%'),
                h('span', { className: 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full' }, '⭐ ' + cgScore + ' pts'),
                h('span', { className: 'bg-slate-100 text-slate-600 px-3 py-1 rounded-full' }, '🌾 ' + cgTotalHarvested + ' harvested')),

              // ── Seasonal Tip ──
              cgPhase === 'grow' && (cgDay % 30) < 2 && (function() {
                var tips = [
                  { emoji: '🌱', tip: 'Spring: Perfect for cool-season crops (lettuce, peas, radish, broccoli). Plant nitrogen-fixers now to enrich soil for summer heavy feeders.' },
                  { emoji: '☀️', tip: 'Summer: Peak growth for warm-season crops (tomatoes, peppers, squash). Watch moisture closely — evaporation is 2.5× higher. Pollinators are most active now!' },
                  { emoji: '🍂', tip: 'Autumn: Harvest mature crops before frost. Plant cover crops (clover) in empty plots to protect soil over winter. Cool-season crops can go in for a fall harvest.' },
                  { emoji: '❄️', tip: 'Winter: Growth stops. This is planning season! Review what worked, note crop rotation for spring, and let the soil rest. Compost decomposes slowly in cold.' }
                ];
                var st = tips[cgSeason];
                return h('div', { className: 'flex items-start gap-2 bg-sky-50 rounded-lg border border-sky-200 p-2 text-xs text-sky-800' },
                  h('span', { className: 'text-lg flex-shrink-0' }, st.emoji),
                  h('span', null, st.tip));
              })(),

              // ── Season Report Card (appears at season boundary during grow phase) ──
              cgPhase === 'grow' && (cgDay % 30) === 0 && cgDay > 0 && (function() {
                var stats2 = cgComputeStats();
                var plantCount = cgGrid.filter(function(c) { return c.plantId; }).length;
                var avgHealth = 0; cgGrid.forEach(function(c) { if (c.plantId) avgHealth += c.health; });
                avgHealth = plantCount > 0 ? Math.round(avgHealth / plantCount) : 0;
                var prevSeason = ['Winter', 'Spring', 'Summer', 'Autumn'][cgSeason]; // the season just ending
                var grades = [];
                if (stats2.uniqueSpecies >= 6) grades.push({ mark: 'A', area: 'Biodiversity', note: stats2.uniqueSpecies + ' species planted' });
                else if (stats2.uniqueSpecies >= 3) grades.push({ mark: 'B', area: 'Biodiversity', note: stats2.uniqueSpecies + ' species — room to diversify' });
                else grades.push({ mark: 'C', area: 'Biodiversity', note: 'Only ' + stats2.uniqueSpecies + ' species — monoculture risk' });
                if (avgHealth >= 75) grades.push({ mark: 'A', area: 'Plant Health', note: 'Average ' + avgHealth + '% — excellent care' });
                else if (avgHealth >= 50) grades.push({ mark: 'B', area: 'Plant Health', note: 'Average ' + avgHealth + '% — some plants struggling' });
                else grades.push({ mark: 'C', area: 'Plant Health', note: 'Average ' + avgHealth + '% — significant stress' });
                if (cgNitrogen >= 40) grades.push({ mark: 'A', area: 'Soil Fertility', note: 'Nitrogen at ' + Math.round(cgNitrogen) + '%' });
                else if (cgNitrogen >= 20) grades.push({ mark: 'B', area: 'Soil Fertility', note: 'Nitrogen at ' + Math.round(cgNitrogen) + '% — could use legumes' });
                else grades.push({ mark: 'C', area: 'Soil Fertility', note: 'Nitrogen depleted at ' + Math.round(cgNitrogen) + '%' });
                if (stats2.pollinatorPlants >= 2) grades.push({ mark: 'A', area: 'Pollinators', note: stats2.pollinatorPlants + ' pollinator plants active' });
                else if (stats2.pollinatorPlants >= 1) grades.push({ mark: 'B', area: 'Pollinators', note: 'Some pollinator coverage' });
                else grades.push({ mark: 'C', area: 'Pollinators', note: 'No pollinator plants — yields suffering' });
                var overallGPA = grades.reduce(function(s, g) { return s + (g.mark === 'A' ? 4 : g.mark === 'B' ? 3 : 2); }, 0) / grades.length;
                var overallGrade = overallGPA >= 3.5 ? 'A' : overallGPA >= 2.5 ? 'B' : 'C';
                var gradeColors = { A: 'text-emerald-400', B: 'text-yellow-400', C: 'text-red-400' };
                return h('div', { className: 'bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-amber-400 p-4 text-white space-y-3' },
                  h('div', { className: 'text-center' },
                    h('div', { className: 'text-2xl' }, '📋'),
                    h('div', { className: 'font-black text-sm' }, prevSeason + ' Season Report Card'),
                    h('div', { className: 'text-[11px] text-slate-600' }, 'Day ' + cgDay + ' · Score: ' + cgScore + ' pts · Harvested: ' + cgTotalHarvested)),
                  h('div', { className: 'grid grid-cols-2 gap-2' },
                    grades.map(function(g, i) {
                      return h('div', { key: i, className: 'bg-slate-700/50 rounded-lg p-2 flex items-center gap-2' },
                        h('div', { className: 'text-xl font-black ' + (gradeColors[g.mark] || 'text-slate-200') }, g.mark),
                        h('div', null,
                          h('div', { className: 'text-[11px] font-bold text-slate-300' }, g.area),
                          h('div', { className: 'text-[11px] text-slate-600' }, g.note)));
                    })),
                  h('div', { className: 'text-center' },
                    h('div', { className: 'text-3xl font-black ' + (gradeColors[overallGrade] || '') }, overallGrade),
                    h('div', { className: 'text-[11px] text-slate-600' }, 'Overall Season Grade')),
                  h('div', { className: 'text-[11px] text-amber-200/70 text-center italic' },
                    overallGrade === 'A' ? '🌟 Outstanding garden stewardship! Your ecosystem is thriving.' :
                    overallGrade === 'B' ? '🌿 Good progress! Focus on diversity and soil health to reach the next level.' :
                    '🌱 Keep learning! Try more companion pairs, pollinator plants, and cover crops.'));
              })(),

              // ── Plant picker (plan phase) ──
              cgPhase === 'plan' && h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3' },
                h('div', { className: 'text-xs font-bold text-emerald-800 mb-2' }, '🌱 Select a plant, then click a cell to place it:'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  plantKeys.map(function(key) {
                    var p = CG_PLANTS[key];
                    var selected = cgSelectedPlant === key;
                    return h('button', {
                      key: key,
                      onClick: function() { cgUpd({ selectedPlant: selected ? null : key }); },
                      'aria-label': p.label + (selected ? ' (selected)' : '') + ': ' + p.desc + '. ' + p.days + ' days to harvest. Water: ' + p.water + '/3. Sun: ' + p.sun + '/3.' + (p.nEffect > 0 ? ' Fixes nitrogen.' : p.nEffect < 0 ? ' Heavy feeder.' : '') + (p.pollinator ? ' Attracts pollinators.' : '') + (p.needsPoll ? ' Needs pollinators.' : ''),
                      'aria-pressed': selected ? 'true' : 'false',
                      title: p.label + ': ' + p.desc + ' (' + p.days + ' days)',
                      className: 'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all ' + (selected ? 'bg-emerald-700 text-white ring-2 ring-emerald-400' : 'bg-white text-slate-700 border border-slate-400 hover:border-emerald-400')
                    }, h('span', { 'aria-hidden': 'true' }, p.emoji), p.label);
                  })),
                // Selected plant info card
                cgSelectedPlant && CG_PLANTS[cgSelectedPlant] && (function() {
                  var sp = CG_PLANTS[cgSelectedPlant];
                  var companions = CG_COMPANIONS.filter(function(c) { return c.a === cgSelectedPlant || c.b === cgSelectedPlant; });
                  var friends = companions.filter(function(c) { return c.bonus > 0; });
                  var enemies = companions.filter(function(c) { return c.bonus < 0; });
                  return h('div', { className: 'mt-2 bg-white rounded-lg border border-emerald-200 p-3 space-y-2' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-2xl' }, sp.emoji),
                      h('div', null,
                        h('div', { className: 'font-bold text-sm text-slate-800' }, sp.label),
                        h('div', { className: 'text-[11px] text-slate-600' }, sp.family + ' family · ' + sp.days + ' days · Cost: ' + sp.cost))),
                    h('p', { className: 'text-xs text-slate-600' }, sp.desc),
                    h('div', { className: 'flex flex-wrap gap-2 text-[11px]' },
                      h('span', { className: 'bg-blue-50 text-blue-700 px-2 py-0.5 rounded' }, '💧'.repeat(sp.water) + ' Water'),
                      h('span', { className: 'bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded' }, '☀️'.repeat(sp.sun) + ' Sun'),
                      sp.nEffect > 0 && h('span', { className: 'bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded' }, '⚗️ Fixes nitrogen'),
                      sp.nEffect < 0 && h('span', { className: 'bg-red-50 text-red-700 px-2 py-0.5 rounded' }, '⚗️ Heavy feeder'),
                      sp.needsPoll && h('span', { className: 'bg-amber-50 text-amber-700 px-2 py-0.5 rounded' }, '🐝 Needs pollinators'),
                      sp.pollinator && h('span', { className: 'bg-purple-50 text-purple-700 px-2 py-0.5 rounded' }, '🐝 Attracts pollinators'),
                      sp.regen && h('span', { className: 'bg-teal-50 text-teal-700 px-2 py-0.5 rounded' }, '♻️ Regenerative'),
                      sp.native && h('span', { className: 'bg-green-50 text-green-700 px-2 py-0.5 rounded' }, '🏔️ Native species')),
                    friends.length > 0 && h('div', { className: 'text-[11px]' },
                      h('span', { className: 'font-bold text-emerald-700' }, '✅ Good neighbors: '),
                      friends.map(function(f) { var other = f.a === cgSelectedPlant ? f.b : f.a; return CG_PLANTS[other] ? CG_PLANTS[other].emoji + ' ' + CG_PLANTS[other].label : other; }).join(', ')),
                    enemies.length > 0 && h('div', { className: 'text-[11px]' },
                      h('span', { className: 'font-bold text-red-600' }, '⚠️ Keep apart: '),
                      enemies.map(function(f) { var other = f.a === cgSelectedPlant ? f.b : f.a; return CG_PLANTS[other] ? CG_PLANTS[other].emoji + ' ' + CG_PLANTS[other].label : other; }).join(', ')));
                })()),

              // ── Ecosystem Health Dashboard ──
              cgPhase === 'grow' && (function() {
                var pollinatorCount = cgGrid.filter(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].pollinator; }).length;
                var uniqueFams = {};
                cgGrid.forEach(function(c) { if (c.plantId) { var p = CG_PLANTS[c.plantId]; if (p) uniqueFams[p.family] = true; } });
                var diversity = Object.keys(uniqueFams).length;
                var avgHealth = 0; var plantCount = 0;
                cgGrid.forEach(function(c) { if (c.plantId) { avgHealth += c.health; plantCount++; } });
                avgHealth = plantCount > 0 ? Math.round(avgHealth / plantCount) : 0;
                var avgPests = 0;
                cgGrid.forEach(function(c) { if (c.plantId) { avgPests += c.pests; } });
                avgPests = plantCount > 0 ? Math.round(avgPests / plantCount) : 0;
                // Ecosystem rating
                var regenCount = cgGrid.filter(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].regen; }).length;
                var ecoScore = Math.round(diversity * 8 + pollinatorCount * 6 + regenCount * 4 + (avgHealth * 0.3) + ((100 - avgPests) * 0.2) + Math.min(30, cgNitrogen * 0.3));
                var ecoLabel = ecoScore >= 80 ? '🌳 Thriving' : ecoScore >= 55 ? '🌿 Healthy' : ecoScore >= 35 ? '🌱 Developing' : '🌰 Struggling';
                var ecoColor = ecoScore >= 80 ? 'text-emerald-700' : ecoScore >= 55 ? 'text-green-600' : ecoScore >= 35 ? 'text-yellow-600' : 'text-red-600';
                return h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-3' },
                  h('div', { className: 'flex items-center justify-between mb-2' },
                    h('div', { className: 'text-xs font-bold text-emerald-800' }, '🌍 Ecosystem Health'),
                    h('div', { className: 'text-sm font-black ' + ecoColor }, ecoLabel + ' (' + ecoScore + ')')),
                  h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                    h('div', { className: 'bg-white rounded-lg p-2' },
                      h('div', { className: 'text-lg font-black text-emerald-600' }, diversity),
                      h('div', { className: 'text-[11px] text-slate-600' }, 'Plant Families')),
                    h('div', { className: 'bg-white rounded-lg p-2' },
                      h('div', { className: 'text-lg font-black text-purple-600' }, pollinatorCount),
                      h('div', { className: 'text-[11px] text-slate-600' }, '🐝 Pollinators')),
                    h('div', { className: 'bg-white rounded-lg p-2' },
                      h('div', { className: 'text-lg font-black ' + (avgHealth > 70 ? 'text-emerald-600' : avgHealth > 40 ? 'text-yellow-600' : 'text-red-600') }, avgHealth + '%'),
                      h('div', { className: 'text-[11px] text-slate-600' }, 'Avg Health'))),
                  // Ecosystem feedback
                  h('div', { className: 'mt-2 text-[11px] text-emerald-700 space-y-0.5' },
                    diversity < 3 && h('div', null, '⚠️ Low diversity — try planting more plant families for ecosystem resilience'),
                    pollinatorCount === 0 && h('div', null, '⚠️ No pollinator plants — squash and cucumber yields will suffer'),
                    avgPests > 40 && h('div', null, '🐛 High pest pressure — companion plants and weeding can help'),
                    cgNitrogen < 20 && h('div', null, '⚗️ Nitrogen depleted — plant legumes (beans, peas, clover) to fix nitrogen'),
                    cgMoisture < 25 && h('div', null, '💧 Soil is dry — water soon to prevent wilting'),
                    cgMoisture > 85 && h('div', null, '💧 Overwatered — roots may rot. Let soil drain.'),
                    ecoScore >= 80 && h('div', null, '🌳 Your garden ecosystem is thriving! Diversity and companion planting are working.'),
                    regenCount >= 2 && h('div', null, '♻️ Regenerative plants are healing your soil — comfrey, clover, and buckwheat build long-term fertility without synthetic inputs.'),
                    regenCount === 0 && plantCount > 4 && h('div', null, '♻️ No regenerative plants yet. Try comfrey, buckwheat, yarrow, or clover — they build soil health for future seasons.')));
              })(),

              // ── Sustainable Gardening Tips (contextual, based on garden state) ──
              cgPhase === 'plan' && (function() {
                var regenPlants = cgGrid.filter(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].regen; }).length;
                var pollinators = cgGrid.filter(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].pollinator; }).length;
                var emptyPlots = cgGrid.filter(function(c) { return !c.plantId; }).length;
                var hasMint = cgGrid.some(function(c) { return c.plantId === 'mint'; });
                var tips = [];
                if (regenPlants === 0) tips.push({ emoji: '♻️', text: 'Try regenerative plants (comfrey, buckwheat, clover, yarrow) — they heal soil, attract beneficials, and build long-term garden health.' });
                if (pollinators < 2 && cgGrid.some(function(c) { return c.plantId && CG_PLANTS[c.plantId] && CG_PLANTS[c.plantId].needsPoll; })) tips.push({ emoji: '🐝', text: 'Your pollinator-dependent crops need nearby flowers. Plant marigold, borage, lavender, or sunflower within 2 cells for full yield.' });
                if (emptyPlots > 6) tips.push({ emoji: '🌿', text: 'Empty soil erodes and loses nutrients. Cover crops (clover, buckwheat) protect soil even when you\'re not growing food — like nature\'s blanket.' });
                if (hasMint) tips.push({ emoji: '⚠️', text: 'Mint is an aggressive spreader! In real gardens, always plant mint in containers. Here it may invade adjacent cells — monitor carefully.' });
                if (cgNitrogen < 25) tips.push({ emoji: '⚗️', text: 'Regenerative tip: Instead of adding fertilizer, plant legumes (beans, peas, clover). They partner with soil bacteria to pull nitrogen from the air — free and sustainable!' });
                if (tips.length === 0) return null;
                return h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 p-3' },
                  h('div', { className: 'text-xs font-bold text-teal-800 mb-2' }, '♻️ Sustainable Gardening Tips'),
                  h('div', { className: 'space-y-1.5' },
                    tips.map(function(t, i) {
                      return h('div', { key: i, className: 'flex items-start gap-2 text-[11px] text-teal-700' },
                        h('span', { className: 'flex-shrink-0' }, t.emoji),
                        h('span', null, t.text));
                    })));
              })(),

              // ═══ ISOMETRIC 2.5D GARDEN CANVAS ═══
              h('canvas', {
                role: 'application',
                'aria-label': 'Isometric community garden view. Click plots to plant or inspect.',
                tabIndex: 0,
                style: { width: '100%', height: '380px', borderRadius: '12px', display: 'block', cursor: cgPhase === 'plan' && cgSelectedPlant ? 'crosshair' : 'pointer', background: '#1a2810' },
                onMouseMove: function(e) {
                  var rect = e.currentTarget.getBoundingClientRect();
                  var mx = (e.clientX - rect.left) * (e.currentTarget.width / rect.width);
                  var my = (e.clientY - rect.top) * (e.currentTarget.height / rect.height);
                  var isoOX2 = e.currentTarget.width / 2; var isoOY2 = 180; var iTW2 = 90; var iTH2 = 50;
                  var relX2 = mx - isoOX2; var relY2 = my - isoOY2;
                  var hCol = Math.floor((relX2 / (iTW2 / 2) + relY2 / (iTH2 / 2)) / 2);
                  var hRow = Math.floor((relY2 / (iTH2 / 2) - relX2 / (iTW2 / 2)) / 2);
                  e.currentTarget._hoverCell = (hRow >= 0 && hRow < 4 && hCol >= 0 && hCol < 4) ? hRow * 4 + hCol : -1;
                },
                onMouseLeave: function(e) { e.currentTarget._hoverCell = -1; },
                onClick: function(e) {
                  // Isometric click detection: convert screen coords to grid cell
                  var rect = e.currentTarget.getBoundingClientRect();
                  var mx = (e.clientX - rect.left) * (e.currentTarget.width / rect.width);
                  var my = (e.clientY - rect.top) * (e.currentTarget.height / rect.height);
                  // Iso grid params (must match draw code)
                  var isoOX = e.currentTarget.width / 2; var isoOY = 180;
                  var iTW = 90; var iTH = 50;
                  // Reverse isometric transform
                  var relX = mx - isoOX; var relY = my - isoOY;
                  var iCol = Math.floor((relX / (iTW / 2) + relY / (iTH / 2)) / 2);
                  var iRow = Math.floor((relY / (iTH / 2) - relX / (iTW / 2)) / 2);
                  if (iRow >= 0 && iRow < 4 && iCol >= 0 && iCol < 4) {
                    var cellIdx = iRow * 4 + iCol;
                    if (cgPhase === 'plan') {
                      if (cgSelectedPlant && !cgGrid[cellIdx].plantId) { cgPlantCell(cellIdx); }
                      else if (cgGrid[cellIdx].plantId && !cgSelectedPlant) { cgRemoveCell(cellIdx); }
                    } else if (cgPhase === 'grow' && cgGrid[cellIdx].plantId) {
                      cgUpd({ microscopeCell: cellIdx, microscopeLayer: 'roots' });
                    }
                  }
                },
                ref: function(cvEl) {
                  if (!cvEl || cvEl._cgCanvasInit) return;
                  cvEl._cgCanvasInit = true;
                  var gctx = cvEl.getContext('2d');
                  var W = cvEl.width = cvEl.offsetWidth * 2;
                  var H = cvEl.height = 760;
                  var startT = performance.now();
                  // Isometric tile parameters
                  var isoOX = W / 2; var isoOY = 180; // origin (center-top of grid)
                  var iTW = 90; var iTH = 50; // tile width/height in iso space
                  // Convert grid (row,col) to screen (x,y) center of diamond
                  function isoToScreen(row, col) {
                    return { x: isoOX + (col - row) * iTW / 2, y: isoOY + (col + row) * iTH / 2 };
                  }
                  // Pre-cache sky gradient
                  var skyGrads = [['#87ceeb','#e0f0ff'], ['#4da6ff','#fff8e0'], ['#cc8844','#ffe8cc'], ['#8899aa','#d0dde8']].map(function(c) {
                    var g = gctx.createLinearGradient(0, 0, 0, H * 0.25); g.addColorStop(0, c[0]); g.addColorStop(1, c[1]); return g;
                  });
                  // Plant visual profiles for isometric rendering
                  var PLANT_VISUALS = {
                    tomato: { stemColor: '#3a6b20', fruitColor: '#e53e3e', leafColor: '#4a8c30', flowerColor: '#fde047', tall: false },
                    corn: { stemColor: '#5a8a30', fruitColor: '#f0c040', leafColor: '#6aaa40', tall: true },
                    beans: { stemColor: '#3a7a25', fruitColor: '#558833', leafColor: '#50a030', flowerColor: '#dda0dd' },
                    squash: { stemColor: '#4a7a20', fruitColor: '#e08020', leafColor: '#3a8a20', flowerColor: '#fbbf24', wide: true },
                    lettuce: { stemColor: '#5aaa40', leafColor: '#70cc50', bushy: true },
                    carrot: { stemColor: '#5a8a30', fruitColor: '#f97316', leafColor: '#60a840' },
                    pepper: { stemColor: '#3a6b20', fruitColor: '#dc2626', leafColor: '#4a8c30' },
                    marigold: { stemColor: '#5a8a30', leafColor: '#60a840', flowerColor: '#f59e0b' },
                    sunflower: { stemColor: '#4a7a20', fruitColor: '#7c3a1a', leafColor: '#4a8a30', flowerColor: '#fbbf24', tall: true },
                    strawberry: { stemColor: '#3a7020', fruitColor: '#e53e3e', leafColor: '#40a030', flowerColor: '#fff' },
                    blueberry: { stemColor: '#4a6830', fruitColor: '#3b5998', leafColor: '#4a8040' }
                  };
                  var defVis = { stemColor: '#4a7a2e', fruitColor: '#888', leafColor: '#50a030' };

                  function drawCG() {
                    cvEl._cgAnim = requestAnimationFrame(drawCG);
                    var t = (performance.now() - startT) / 1000;
                    var sSeason = cgSeason; // read directly (canvas re-mounts on state change)
                    var grid2 = cgGrid;

                    // Clear
                    gctx.clearRect(0, 0, W, H);

                    // ── Sky ──
                    gctx.fillStyle = skyGrads[sSeason] || skyGrads[0]; gctx.fillRect(0, 0, W, H * 0.25);
                    // Sun
                    var sunX = W * 0.82 + Math.sin(t * 0.3) * 15;
                    var sunY = 50 + Math.sin(t * 0.2) * 8;
                    gctx.fillStyle = '#ffd700'; gctx.beginPath(); gctx.arc(sunX, sunY, 20, 0, Math.PI * 2); gctx.fill();
                    gctx.globalAlpha = 0.12; gctx.beginPath(); gctx.arc(sunX, sunY, 35, 0, Math.PI * 2); gctx.fill(); gctx.globalAlpha = 1;
                    // Clouds
                    if (sSeason !== 3) {
                      gctx.fillStyle = 'rgba(255,255,255,0.2)';
                      for (var cl2 = 0; cl2 < 3; cl2++) {
                        var clx2 = (t * 10 + cl2 * W * 0.35) % (W + 120) - 60;
                        var cly2 = 25 + cl2 * 18;
                        gctx.beginPath(); gctx.ellipse(clx2, cly2, 30 + cl2 * 10, 10, 0, 0, Math.PI * 2); gctx.fill();
                        gctx.beginPath(); gctx.ellipse(clx2 + 20, cly2 - 4, 20, 8, 0, 0, Math.PI * 2); gctx.fill();
                      }
                    }

                    // ── Ground plane (green grass perspective) ──
                    var grassG = gctx.createLinearGradient(0, H * 0.22, 0, H);
                    grassG.addColorStop(0, sSeason === 3 ? '#8899aa' : sSeason === 2 ? '#8a7a40' : '#5a8a3e');
                    grassG.addColorStop(1, sSeason === 3 ? '#667788' : sSeason === 2 ? '#6a5a30' : '#3a6a28');
                    gctx.fillStyle = grassG; gctx.fillRect(0, H * 0.22, W, H);

                    // ── Background trees (behind garden) ──
                    var treeLine = isoOY - 40;
                    gctx.fillStyle = sSeason === 3 ? 'rgba(80,90,100,0.35)' : sSeason === 2 ? 'rgba(140,100,30,0.3)' : 'rgba(35,90,25,0.35)';
                    for (var bt = 0; bt < 8; bt++) {
                      var btx = W * 0.08 + bt * W * 0.12;
                      var bty = treeLine - 5 + Math.sin(bt * 2.3) * 8;
                      var btSize = 18 + (bt % 3) * 6;
                      // Canopy
                      gctx.beginPath(); gctx.arc(btx, bty - btSize * 0.4, btSize, 0, Math.PI * 2); gctx.fill();
                      gctx.beginPath(); gctx.arc(btx + btSize * 0.3, bty - btSize * 0.2, btSize * 0.7, 0, Math.PI * 2); gctx.fill();
                      // Trunk
                      gctx.fillStyle = 'rgba(80,50,20,0.25)';
                      gctx.fillRect(btx - 2, bty, 4, 12);
                      gctx.fillStyle = sSeason === 3 ? 'rgba(80,90,100,0.35)' : sSeason === 2 ? 'rgba(140,100,30,0.3)' : 'rgba(35,90,25,0.35)';
                    }

                    // ── Garden shed (top-right corner, isometric) ──
                    var shedPos = isoToScreen(-1, 4);
                    gctx.fillStyle = '#7a5a3a'; gctx.fillRect(shedPos.x - 18, shedPos.y - 30, 36, 24);
                    gctx.fillStyle = '#6a4a2a'; // roof
                    gctx.beginPath(); gctx.moveTo(shedPos.x - 22, shedPos.y - 30); gctx.lineTo(shedPos.x, shedPos.y - 42); gctx.lineTo(shedPos.x + 22, shedPos.y - 30); gctx.fill();
                    gctx.fillStyle = '#5a3a1a'; gctx.fillRect(shedPos.x - 4, shedPos.y - 18, 8, 12); // door

                    // ── Isometric stone paths (between rows) ──
                    gctx.fillStyle = 'rgba(160,150,130,0.2)';
                    for (var pr = 0; pr < 3; pr++) {
                      // Horizontal paths between row pr and pr+1
                      for (var pc = 0; pc < 4; pc++) {
                        var p1 = isoToScreen(pr, pc);
                        var p2 = isoToScreen(pr + 1, pc);
                        var mpx = (p1.x + p2.x) / 2; var mpy = (p1.y + p2.y) / 2;
                        gctx.beginPath(); gctx.ellipse(mpx, mpy + iTH / 4, 6, 3, 0.5, 0, Math.PI * 2); gctx.fill();
                      }
                    }

                    // ── Isometric fence perimeter ──
                    var fenceColor = '#8a6a4a';
                    var corners = [isoToScreen(-0.6, -0.6), isoToScreen(-0.6, 3.6), isoToScreen(3.6, 3.6), isoToScreen(3.6, -0.6)];
                    gctx.strokeStyle = fenceColor; gctx.lineWidth = 2;
                    gctx.beginPath();
                    gctx.moveTo(corners[0].x, corners[0].y); gctx.lineTo(corners[1].x, corners[1].y);
                    gctx.lineTo(corners[2].x, corners[2].y); gctx.lineTo(corners[3].x, corners[3].y);
                    gctx.closePath(); gctx.stroke();
                    // Fence posts at corners
                    corners.forEach(function(fc) {
                      gctx.fillStyle = fenceColor;
                      gctx.fillRect(fc.x - 2, fc.y - 10, 4, 12);
                    });
                    // Fence rail (top wire/rail)
                    gctx.strokeStyle = 'rgba(138,106,74,0.4)'; gctx.lineWidth = 1;
                    gctx.beginPath();
                    gctx.moveTo(corners[0].x, corners[0].y - 6); gctx.lineTo(corners[1].x, corners[1].y - 6);
                    gctx.lineTo(corners[2].x, corners[2].y - 6); gctx.lineTo(corners[3].x, corners[3].y - 6);
                    gctx.closePath(); gctx.stroke();

                    // ── Isometric 4×4 Grid (diamond tiles) ──
                    var hoverCell2 = cvEl._hoverCell;
                    var polCount2 = 0;
                    for (var iR = 0; iR < 4; iR++) {
                      for (var iC = 0; iC < 4; iC++) {
                        var pos = isoToScreen(iR, iC);
                        var ci4 = iR * 4 + iC;
                        var cell4 = grid2[ci4];
                        var hasPlant = cell4 && cell4.plantId && CG_PLANTS[cell4.plantId];
                        var pl3 = hasPlant ? CG_PLANTS[cell4.plantId] : null;
                        if (pl3 && pl3.pollinator) polCount2++;
                        var isHovered = hoverCell2 === ci4;

                        // ── Soil tile (isometric diamond) ──
                        var soilDark2 = cgMoisture > 50 ? 15 : 0;
                        gctx.fillStyle = hasPlant ? 'rgba(' + (100 - soilDark2) + ',' + (65 - soilDark2 * 0.4) + ',30,0.85)' : 'rgba(110,75,35,0.6)';
                        gctx.beginPath();
                        gctx.moveTo(pos.x, pos.y - iTH / 2); // top
                        gctx.lineTo(pos.x + iTW / 2, pos.y);   // right
                        gctx.lineTo(pos.x, pos.y + iTH / 2); // bottom
                        gctx.lineTo(pos.x - iTW / 2, pos.y);   // left
                        gctx.closePath(); gctx.fill();
                        // Tile border + hover highlight
                        gctx.strokeStyle = isHovered ? 'rgba(251,191,36,0.6)' : hasPlant ? 'rgba(80,50,20,0.4)' : 'rgba(80,50,20,0.2)';
                        gctx.lineWidth = isHovered ? 2 : 1; gctx.stroke();
                        // Hover glow fill
                        if (isHovered) {
                          gctx.fillStyle = 'rgba(251,191,36,0.08)';
                          gctx.beginPath();
                          gctx.moveTo(pos.x, pos.y - iTH / 2); gctx.lineTo(pos.x + iTW / 2, pos.y);
                          gctx.lineTo(pos.x, pos.y + iTH / 2); gctx.lineTo(pos.x - iTW / 2, pos.y);
                          gctx.closePath(); gctx.fill();
                        }
                        // Soil depth side (3D effect — left and bottom faces)
                        var depth = 8;
                        gctx.fillStyle = 'rgba(70,45,20,0.5)';
                        gctx.beginPath();
                        gctx.moveTo(pos.x - iTW / 2, pos.y);
                        gctx.lineTo(pos.x, pos.y + iTH / 2);
                        gctx.lineTo(pos.x, pos.y + iTH / 2 + depth);
                        gctx.lineTo(pos.x - iTW / 2, pos.y + depth);
                        gctx.closePath(); gctx.fill();
                        gctx.fillStyle = 'rgba(60,35,15,0.4)';
                        gctx.beginPath();
                        gctx.moveTo(pos.x, pos.y + iTH / 2);
                        gctx.lineTo(pos.x + iTW / 2, pos.y);
                        gctx.lineTo(pos.x + iTW / 2, pos.y + depth);
                        gctx.lineTo(pos.x, pos.y + iTH / 2 + depth);
                        gctx.closePath(); gctx.fill();

                        // ── Plant rendering (isometric) ──
                        if (hasPlant) {
                          var vis2 = PLANT_VISUALS[cell4.plantId] || defVis;
                          var gp2 = Math.min(1, cell4.growthDay / pl3.days);
                          var sw2 = Math.sin(t * 1.2 + ci4 * 0.7) * gp2 * 3;
                          // Drop shadow (isometric ellipse on soil surface)
                          var shadowAlpha = 0.1 + gp2 * 0.08;
                          gctx.fillStyle = 'rgba(0,0,0,' + shadowAlpha + ')';
                          gctx.beginPath();
                          gctx.ellipse(pos.x + 3, pos.y + 2, 8 + gp2 * 10, 4 + gp2 * 4, 0.3, 0, Math.PI * 2);
                          gctx.fill();
                          var baseX = pos.x; var baseY = pos.y - iTH / 2 - 2;
                          var sH2 = gp2 * (vis2.tall ? 50 : vis2.bushy ? 18 : vis2.wide ? 25 : 35);

                          if (pl3.isStructure) {
                            // Structure icons (geometric)
                            gctx.fillStyle = cell4.plantId === 'bee_hotel' ? '#8B6914' : cell4.plantId === 'compost_bin' ? '#5a4030' : '#4a6a8a';
                            gctx.fillRect(baseX - 6, baseY - 12, 12, 12);
                            gctx.fillStyle = cell4.plantId === 'rain_barrel' ? '#6a9abb' : '#7a6040';
                            gctx.fillRect(baseX - 7, baseY - 14, 14, 3);
                          } else {
                            // Stem (curved with sway)
                            gctx.strokeStyle = vis2.stemColor; gctx.lineWidth = 1.5 + gp2;
                            gctx.beginPath(); gctx.moveTo(baseX, baseY);
                            gctx.quadraticCurveTo(baseX + sw2 * 0.5, baseY - sH2 * 0.5, baseX + sw2, baseY - sH2);
                            gctx.stroke();
                            // Leaves
                            if (gp2 > 0.2) {
                              gctx.fillStyle = vis2.leafColor || '#50a030';
                              var lc2 = vis2.bushy ? 6 : vis2.wide ? 4 : 3;
                              for (var lf2 = 0; lf2 < lc2; lf2++) {
                                var lfY2 = baseY - sH2 * (0.25 + lf2 * 0.15);
                                var lfS2 = lf2 % 2 === 0 ? -1 : 1;
                                var lfSz2 = (3 + gp2 * 4) * (vis2.bushy ? 1.4 : vis2.wide ? 1.6 : 1);
                                gctx.beginPath();
                                gctx.ellipse(baseX + lfS2 * (5 + lf2) + sw2 * (0.4 + lf2 * 0.08), lfY2,
                                  lfSz2, lfSz2 * 0.45, lfS2 * -0.4, 0, Math.PI * 2);
                                gctx.fill();
                              }
                            }
                            // Flower
                            if (vis2.flowerColor && gp2 > 0.5) {
                              var ftx = baseX + sw2; var fty = baseY - sH2 - 3;
                              gctx.fillStyle = vis2.flowerColor;
                              for (var fp = 0; fp < 5; fp++) {
                                var fa2 = fp * Math.PI * 2 / 5 + t * 0.3;
                                gctx.beginPath(); gctx.ellipse(ftx + Math.cos(fa2) * 4, fty + Math.sin(fa2) * 4, 3, 1.8, fa2, 0, Math.PI * 2); gctx.fill();
                              }
                              gctx.fillStyle = vis2.fruitColor || '#8B6914';
                              gctx.beginPath(); gctx.arc(ftx, fty, 2, 0, Math.PI * 2); gctx.fill();
                            }
                            // Fruit (at 70%+)
                            if (vis2.fruitColor && gp2 > 0.7 && !vis2.flowerColor) {
                              gctx.fillStyle = vis2.fruitColor;
                              var frx2 = baseX + sw2; var fry2 = baseY - sH2 * 0.65;
                              gctx.beginPath(); gctx.arc(frx2, fry2, 3 + gp2 * 2, 0, Math.PI * 2); gctx.fill();
                              gctx.fillStyle = 'rgba(255,255,255,0.3)';
                              gctx.beginPath(); gctx.arc(frx2 - 1, fry2 - 1, 1.5, 0, Math.PI * 2); gctx.fill();
                            }
                          }
                          // Pest dots
                          if (cell4.pests > 30) {
                            gctx.fillStyle = 'rgba(220,50,50,0.6)';
                            for (var pd3 = 0; pd3 < Math.min(3, Math.floor(cell4.pests / 25)); pd3++) {
                              gctx.beginPath(); gctx.arc(baseX + (pd3 - 1) * 5, baseY - sH2 * 0.4 + Math.sin(t * 3 + pd3 + ci4) * 2, 2, 0, Math.PI * 2); gctx.fill();
                            }
                          }
                          // Harvest glow (golden ring)
                          if (gp2 >= 1 && cell4.health > 20) {
                            gctx.strokeStyle = 'rgba(251,191,36,' + (0.3 + Math.sin(t * 3 + ci4) * 0.15) + ')';
                            gctx.lineWidth = 2;
                            gctx.beginPath(); gctx.ellipse(pos.x, pos.y, iTW / 2 - 4, iTH / 2 - 2, 0, 0, Math.PI * 2); gctx.stroke();
                          }
                          // Growth sparkle
                          if (gp2 > 0.1 && gp2 < 0.95 && sSeason < 3) {
                            gctx.fillStyle = 'rgba(200,255,100,' + (0.3 + Math.sin(t * 5 + ci4) * 0.2) + ')';
                            gctx.beginPath(); gctx.arc(baseX + Math.sin(t * 3 + ci4) * 8, baseY - sH2 * 0.5 - (t * 8 + ci4 * 5) % 15, 1.2, 0, Math.PI * 2); gctx.fill();
                          }
                        } else {
                          // Empty plot indicator (plan phase)
                          if (cgPhase === 'plan') {
                            gctx.fillStyle = 'rgba(255,255,255,0.12)'; gctx.font = '14px system-ui'; gctx.textAlign = 'center';
                            gctx.fillText('+', pos.x, pos.y + 5);
                          }
                        }

                        // Companion glow lines (check right and down neighbors)
                        if (hasPlant) {
                          [ci4 + 1, ci4 + 4].forEach(function(ni3) {
                            if (ni3 >= 16 || !grid2[ni3] || !grid2[ni3].plantId) return;
                            if (ci4 % 4 === 3 && ni3 === ci4 + 1) return;
                            var nPos = isoToScreen(Math.floor(ni3 / 4), ni3 % 4);
                            var cm = CG_COMPANIONS.find(function(cp) {
                              return (cp.a === cell4.plantId && cp.b === grid2[ni3].plantId) || (cp.b === cell4.plantId && cp.a === grid2[ni3].plantId);
                            });
                            if (cm) {
                              gctx.strokeStyle = cm.bonus > 0 ? 'rgba(34,197,94,' + (0.12 + Math.sin(t * 2 + ci4) * 0.06) + ')' : 'rgba(239,68,68,' + (0.12 + Math.sin(t * 2 + ci4) * 0.06) + ')';
                              gctx.lineWidth = 2;
                              gctx.beginPath(); gctx.moveTo(pos.x, pos.y); gctx.lineTo(nPos.x, nPos.y); gctx.stroke();
                            }
                          });
                        }
                      }
                    }

                    // ── Pollinators (bees/butterflies) ──
                    for (var bi3 = 0; bi3 < Math.min(5, polCount2); bi3++) {
                      var bx3 = (t * 20 + bi3 * 100) % (W + 60) - 30;
                      var by3 = isoOY - 20 + Math.sin(t * 1.5 + bi3 * 2.5) * 25;
                      gctx.fillStyle = bi3 % 2 === 0 ? '#fbbf24' : '#f97316';
                      gctx.beginPath(); gctx.arc(bx3, by3, 2.5, 0, Math.PI * 2); gctx.fill();
                      gctx.fillStyle = 'rgba(255,255,255,0.5)';
                      var wA2 = Math.sin(t * 8 + bi3) * 0.5;
                      gctx.beginPath(); gctx.ellipse(bx3 - 2.5, by3 - 1.5, 3, 1.8, wA2, 0, Math.PI * 2); gctx.fill();
                      gctx.beginPath(); gctx.ellipse(bx3 + 2.5, by3 - 1.5, 3, 1.8, -wA2, 0, Math.PI * 2); gctx.fill();
                    }

                    // ── Weather ──
                    if (sSeason === 0 || sSeason === 2) { // Rain
                      gctx.strokeStyle = 'rgba(100,150,220,0.12)'; gctx.lineWidth = 0.8;
                      for (var ri4 = 0; ri4 < 15; ri4++) {
                        var rx3 = (ri4 * 53 + t * 50) % W; var ry3 = (ri4 * 37 + t * 100) % (H * 0.5);
                        gctx.beginPath(); gctx.moveTo(rx3, ry3); gctx.lineTo(rx3 - 1.5, ry3 + 8); gctx.stroke();
                      }
                    }
                    if (sSeason === 3) { // Snow
                      gctx.fillStyle = 'rgba(255,255,255,0.45)';
                      for (var si4 = 0; si4 < 25; si4++) {
                        gctx.beginPath(); gctx.arc((si4 * 41 + t * 6) % W, (si4 * 23 + t * 12) % H, 1.2 + Math.sin(si4 + t * 0.4) * 0.5, 0, Math.PI * 2); gctx.fill();
                      }
                    }

                    // ── Hover tooltip (plant info card on canvas) ──
                    if (hoverCell2 >= 0 && hoverCell2 < 16) {
                      var hc = grid2[hoverCell2];
                      var hPos = isoToScreen(Math.floor(hoverCell2 / 4), hoverCell2 % 4);
                      if (hc && hc.plantId && CG_PLANTS[hc.plantId]) {
                        var hp = CG_PLANTS[hc.plantId];
                        var hGrow = Math.min(100, Math.round(hc.growthDay / hp.days * 100));
                        var hBonus = getCellBonus(grid2, hoverCell2);
                        var ttx = Math.min(W - 140, Math.max(10, hPos.x - 60));
                        var tty = Math.max(50, hPos.y - iTH - 55);
                        // Background
                        gctx.fillStyle = 'rgba(0,0,0,0.8)'; gctx.beginPath();
                        gctx.roundRect(ttx, tty, 130, 50, 6); gctx.fill();
                        gctx.strokeStyle = 'rgba(255,255,255,0.15)'; gctx.lineWidth = 1;
                        gctx.beginPath(); gctx.roundRect(ttx, tty, 130, 50, 6); gctx.stroke();
                        // Content
                        gctx.fillStyle = '#fff'; gctx.font = 'bold 11px system-ui'; gctx.textAlign = 'left';
                        gctx.fillText(hp.label, ttx + 8, tty + 16);
                        gctx.fillStyle = '#94a3b8'; gctx.font = '9px system-ui';
                        gctx.fillText('Growth: ' + hGrow + '%  Health: ' + Math.round(hc.health) + '%', ttx + 8, tty + 30);
                        var bonusCol = hBonus.total > 0 ? '#4ade80' : hBonus.total < 0 ? '#f87171' : '#94a3b8';
                        gctx.fillStyle = bonusCol;
                        gctx.fillText('Companion: ' + (hBonus.total > 0 ? '+' : '') + hBonus.total + '%  Pests: ' + Math.round(hc.pests), ttx + 8, tty + 43);
                      } else if (!hc || !hc.plantId) {
                        // Empty plot tooltip
                        gctx.fillStyle = 'rgba(0,0,0,0.6)'; gctx.beginPath();
                        gctx.roundRect(hPos.x - 40, hPos.y - iTH - 25, 80, 22, 4); gctx.fill();
                        gctx.fillStyle = 'rgba(255,255,255,0.6)'; gctx.font = '9px system-ui'; gctx.textAlign = 'center';
                        gctx.fillText(cgPhase === 'plan' ? 'Click to plant' : 'Empty plot', hPos.x, hPos.y - iTH - 10);
                      }
                    }

                    // ── HUD overlay ──
                    gctx.fillStyle = 'rgba(0,0,0,0.5)'; gctx.beginPath();
                    gctx.roundRect(6, 6, 200, 30, 6); gctx.fill();
                    gctx.font = 'bold 11px system-ui'; gctx.textAlign = 'left';
                    gctx.fillStyle = '#fff';
                    var seasonLabels = ['Spring', 'Summer', 'Autumn', 'Winter'];
                    gctx.fillText(seasonLabels[sSeason] + ' \u2022 Day ' + ((cgDay % 30) + 1) + ' \u2022 Year ' + cgYear, 14, 24);
                    gctx.font = '9px system-ui'; gctx.fillStyle = 'rgba(255,255,255,0.5)';
                    gctx.fillText(cgPhase === 'plan' ? 'Click a plot to plant' : 'Click a plant to inspect', 14, 48);
                  }
                  drawCG();
                  var obs3 = new MutationObserver(function() {
                    if (!document.contains(cvEl)) { cancelAnimationFrame(cvEl._cgAnim); obs3.disconnect(); cvEl._cgCanvasInit = false; }
                  });
                  obs3.observe(document.body, { childList: true, subtree: true });
                }
              }),

              // ── Companion interactions preview ──
              cgPhase === 'plan' && (function() {
                var allBonuses = [];
                cgGrid.forEach(function(cell, idx) {
                  if (!cell.plantId) return;
                  var b = getCellBonus(cgGrid, idx);
                  b.pairs.forEach(function(p) {
                    if (!allBonuses.some(function(e) { return e.desc === p.desc; })) allBonuses.push(p);
                  });
                });
                if (allBonuses.length === 0) return null;
                // SEL: trigger companion discovery reflection on first positive pair
                if (allBonuses.some(function(b) { return b.bonus > 0; }) && !cgSeenReflections.companion_discovery) {
                  setTimeout(function() { cgTriggerReflection('companion_discovery'); }, 500);
                }
                return h('div', { className: 'bg-slate-50 rounded-xl border border-slate-400 p-3' },
                  h('div', { className: 'text-xs font-bold text-slate-700 mb-2' }, '🔬 Active Companion Interactions (' + allBonuses.length + ')'),
                  h('div', { className: 'space-y-1' },
                    allBonuses.map(function(p, i) {
                      return h('div', { key: i, className: 'flex items-center gap-2 text-[11px] rounded-lg px-2 py-1 ' + (p.bonus > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') },
                        h('span', { className: 'font-bold' }, (p.bonus > 0 ? '✅ +' : '⚠️ ') + p.bonus + '%'),
                        h('span', null, p.desc));
                    })));
              })(),

              // ── Full Companion Guide (all known pairs for planted species) ──
              cgPhase === 'plan' && (function() {
                var planted = {};
                cgGrid.forEach(function(c) { if (c.plantId) planted[c.plantId] = true; });
                var plantedKeys = Object.keys(planted);
                if (plantedKeys.length === 0) return null;
                // Collect all relevant pairs — both planted and potential neighbors
                var guide = [];
                CG_COMPANIONS.forEach(function(comp) {
                  var aPlanted = !!planted[comp.a];
                  var bPlanted = !!planted[comp.b];
                  if (aPlanted || bPlanted) {
                    var already = aPlanted && bPlanted;
                    guide.push({ comp: comp, active: already, plantedSide: aPlanted ? comp.a : comp.b, otherSide: aPlanted ? comp.b : comp.a });
                  }
                });
                if (guide.length === 0) return null;
                var friends = guide.filter(function(g) { return g.comp.bonus > 0; });
                var enemies = guide.filter(function(g) { return g.comp.bonus < 0; });
                return h('div', { className: 'bg-white rounded-xl border border-slate-400 p-3' },
                  h('div', { className: 'text-xs font-bold text-slate-700 mb-2' }, '📖 Companion Planting Guide'),
                  friends.length > 0 && h('div', { className: 'mb-2' },
                    h('div', { className: 'text-[11px] font-bold text-emerald-700 mb-1' }, '✅ Good Companions (' + friends.length + ')'),
                    h('div', { className: 'space-y-0.5' },
                      friends.slice(0, 8).map(function(g, i) {
                        var aP = CG_PLANTS[g.comp.a]; var bP = CG_PLANTS[g.comp.b];
                        return h('div', { key: i, className: 'flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded ' + (g.active ? 'bg-emerald-50' : 'bg-slate-50') },
                          h('span', null, (aP ? aP.emoji : '') + ' + ' + (bP ? bP.emoji : '')),
                          h('span', { className: 'font-bold text-emerald-600' }, '+' + g.comp.bonus + '%'),
                          h('span', { className: 'text-slate-600 truncate' }, g.comp.desc),
                          g.active && h('span', { className: 'text-emerald-500 ml-auto flex-shrink-0' }, '✓ Active'));
                      }))),
                  enemies.length > 0 && h('div', null,
                    h('div', { className: 'text-[11px] font-bold text-red-600 mb-1' }, '⚠️ Keep Apart (' + enemies.length + ')'),
                    h('div', { className: 'space-y-0.5' },
                      enemies.slice(0, 6).map(function(g, i) {
                        var aP = CG_PLANTS[g.comp.a]; var bP = CG_PLANTS[g.comp.b];
                        return h('div', { key: i, className: 'flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded ' + (g.active ? 'bg-red-50' : 'bg-slate-50') },
                          h('span', null, (aP ? aP.emoji : '') + ' ✕ ' + (bP ? bP.emoji : '')),
                          h('span', { className: 'font-bold text-red-500' }, g.comp.bonus + '%'),
                          h('span', { className: 'text-slate-600 truncate' }, g.comp.desc),
                          g.active && h('span', { className: 'text-red-500 ml-auto flex-shrink-0' }, '⚠️ Active!'));
                      }))));
              })(),

              // ── Challenge Picker / Progress ──
              cgPhase === 'plan' && !cgActiveChallenge && h('div', { className: 'bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-3' },
                h('div', { className: 'text-xs font-bold text-indigo-800 mb-2' }, '🎯 Garden Challenges (optional)'),
                h('div', { className: 'grid grid-cols-2 gap-2' },
                  CG_CHALLENGES.map(function(ch) {
                    var completed = cgCompletedChallenges.indexOf(ch.id) !== -1;
                    return h('button', { key: ch.id, disabled: completed,
                      onClick: function() {
                        var patch = { activeChallenge: ch.id };
                        if (ch.setup) { Object.keys(ch.setup).forEach(function(k) { patch[k] = ch.setup[k]; }); }
                        cgUpd(patch);
                        if (addToast) addToast('🎯 Challenge started: ' + ch.title, 'info');
                      },
                      className: 'text-left p-2 rounded-lg border transition-all ' + (completed ? 'bg-emerald-50 border-emerald-300 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm')
                    },
                      h('div', { className: 'flex items-center gap-1.5' },
                        h('span', null, ch.emoji),
                        h('span', { className: 'text-[11px] font-bold ' + (completed ? 'text-emerald-700' : 'text-slate-800') }, ch.title),
                        completed && h('span', { className: 'text-[11px]' }, '✅')),
                      h('div', { className: 'text-[11px] text-slate-600 mt-0.5' }, ch.difficulty + ' · ' + ch.ngss));
                  }))),

              // Active challenge banner
              cgActiveChallenge && (function() {
                var ch = CG_CHALLENGES.find(function(c) { return c.id === cgActiveChallenge; });
                if (!ch) return null;
                var isComplete = ch.check(cgGrid, { nitrogen: cgNitrogen, moisture: cgMoisture, season: cgSeason, cellHistory: cgCellHistory, seasonsRotated: (cg.seasonHistory || []).length });
                if (isComplete && cgCompletedChallenges.indexOf(ch.id) === -1) {
                  // Auto-complete
                  var newCompleted = cgCompletedChallenges.concat([ch.id]);
                  setTimeout(function() {
                    cgUpd({ completedChallenges: newCompleted, activeChallenge: null });
                    if (addToast) addToast('🏆 Challenge complete: ' + ch.title + '!', 'success');
                    if (awardStemXP) awardStemXP(25);
                  }, 100);
                }
                return h('div', { className: 'bg-indigo-50 rounded-xl border-2 ' + (isComplete ? 'border-emerald-400' : 'border-indigo-300') + ' p-3' },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, ch.emoji),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'text-xs font-bold text-indigo-800' }, '🎯 ' + ch.title + (isComplete ? ' — ✅ COMPLETE!' : '')),
                      h('div', { className: 'text-[11px] text-indigo-600' }, ch.goal)),
                    h('button', { onClick: function() { cgUpd({ activeChallenge: null }); }, className: 'text-xs text-slate-200 hover:text-slate-600', 'aria-label': 'Close challenge' }, '✕')),
                  !isComplete && h('div', { className: 'text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 mt-1' }, '💡 Hint: ' + ch.hint));
              })(),

              // ── Action buttons ──
              cgPhase === 'plan' && h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', { onClick: cgStartGrowing, 'aria-label': 'Start growing season', className: 'px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold text-sm hover:bg-emerald-700' }, '▶️ Start Growing'),
                h('button', { onClick: function() { cgUpd({ grid: cgGrid.map(function() { return { plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }; }), day: 0, score: 0, totalHarvested: 0, phase: 'plan', activeChallenge: null }); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200' }, '🗑️ Clear All')),

              cgPhase === 'grow' && h('div', { className: 'flex gap-2 flex-wrap items-center' },
                h('button', { onClick: cgAdvanceDay, className: 'px-4 py-2 bg-sky-600 text-white rounded-lg font-bold text-sm hover:bg-sky-700' }, '⏩ Next Day'),
                h('button', { onClick: function() { for(var i=0;i<5;i++) cgAdvanceDay(); }, className: 'px-3 py-2 bg-sky-100 text-sky-700 rounded-lg text-sm font-bold hover:bg-sky-200' }, '⏭️ +5 Days'),
                h('button', { onClick: cgWater, className: 'px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200' }, '💧 Water'),
                h('button', { onClick: cgWeed, className: 'px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200' }, '🧹 Weed'),
                h('button', { onClick: cgCompost, className: 'px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200' }, '🧱 Compost'),
                h('button', { onClick: cgHarvest, 'aria-label': 'Harvest ready crops', className: 'px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-bold hover:bg-yellow-200' }, '🌾 Harvest Ready'),
                h('button', { onClick: function() { cgUpd({ phase: 'plan' }); }, className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200' }, '\u270F\uFE0F Edit Garden')),

              // ── Soil Chemistry + Economics + Pest HUD ──
              h('div', { className: 'grid grid-cols-2 gap-2' },
                // Soil Chemistry Panel
                h('div', { className: 'bg-gradient-to-b from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-2.5' },
                  h('div', { className: 'text-[11px] font-bold text-amber-800 mb-1.5' }, '\uD83E\uDDEA Soil Chemistry'),
                  h('div', { className: 'space-y-1' },
                    [
                      { label: 'N', val: cgNitrogen, color: '#22c55e', tip: 'Nitrogen' },
                      { label: 'P', val: cgPhosphorus, color: '#3b82f6', tip: 'Phosphorus' },
                      { label: 'K', val: cgPotassium, color: '#8b5cf6', tip: 'Potassium' }
                    ].map(function(r) {
                      return h('div', { key: r.label, className: 'flex items-center gap-1.5', title: r.tip + ': ' + Math.round(r.val) + '/100' },
                        h('span', { className: 'text-[11px] font-bold w-3', style: { color: r.color } }, r.label),
                        h('div', { className: 'flex-1 h-2 bg-slate-200 rounded-full overflow-hidden' },
                          h('div', { style: { width: Math.round(r.val) + '%', backgroundColor: r.val < 15 ? '#ef4444' : r.color }, className: 'h-full rounded-full transition-all' })
                        ),
                        h('span', { className: 'text-[11px] text-slate-600 w-6 text-right' }, Math.round(r.val))
                      );
                    })
                  ),
                  h('div', { className: 'flex justify-between mt-1.5 text-[11px]' },
                    h('span', { className: 'text-amber-600', title: 'Soil pH (ideal 6.0-7.0 for most crops)' }, 'pH: ' + cgPH),
                    h('span', { className: 'text-amber-600', title: 'Organic matter % (higher = better water retention)' }, 'OM: ' + cgOrganicMatter.toFixed(1) + '%')
                  ),
                  // Soil actions
                  h('div', { className: 'flex gap-1 mt-1.5' },
                    h('button', { onClick: cgAddLime, title: 'Add lime to raise pH (+$0.50)', className: 'flex-1 px-1 py-1 text-[11px] font-bold rounded bg-amber-100 text-amber-700 hover:bg-amber-200' }, '\u2B06 Lime'),
                    h('button', { onClick: cgAddSulfur, title: 'Add sulfur to lower pH (+$0.50)', className: 'flex-1 px-1 py-1 text-[11px] font-bold rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200' }, '\u2B07 Sulfur')
                  )
                ),
                // Economics + Pest Panel
                h('div', { className: 'space-y-2' },
                  // Budget
                  h('div', { className: 'bg-gradient-to-b from-green-50 to-emerald-50 rounded-xl border border-green-200 p-2.5' },
                    h('div', { className: 'text-[11px] font-bold text-green-800 mb-1' }, '\uD83D\uDCB0 Farm Budget'),
                    h('div', { className: 'text-lg font-black ' + (cgBudget > 20 ? 'text-green-600' : cgBudget > 5 ? 'text-amber-600' : 'text-red-600') }, '$' + cgBudget.toFixed(2)),
                    h('div', { className: 'flex justify-between text-[11px] text-slate-600 mt-0.5' },
                      h('span', null, 'Spent: $' + cgExpenses.toFixed(2)),
                      h('span', null, 'Earned: $' + cgRevenue.toFixed(2))
                    ),
                    (cgRevenue - cgExpenses) !== 0 && h('div', { className: 'text-[11px] font-bold mt-0.5 ' + ((cgRevenue - cgExpenses) >= 0 ? 'text-green-500' : 'text-red-500') },
                      (cgRevenue - cgExpenses) >= 0 ? '\u2B06 Profit: $' + (cgRevenue - cgExpenses).toFixed(2) : '\u2B07 Loss: $' + Math.abs(cgRevenue - cgExpenses).toFixed(2))
                  ),
                  // Pest ecosystem
                  h('div', { className: 'bg-gradient-to-b from-red-50 to-orange-50 rounded-xl border border-red-200 p-2.5' },
                    h('div', { className: 'text-[11px] font-bold text-red-800 mb-1' }, '\uD83D\uDC1B Pest Ecosystem'),
                    h('div', { className: 'flex justify-between text-[11px]' },
                      h('span', { className: 'text-red-600' }, '\uD83D\uDC1B Pests: ' + Math.round(cgPestPop)),
                      h('span', { className: 'text-green-600' }, '\uD83D\uDC1E Beneficials: ' + Math.round(cgBeneficialPop))
                    ),
                    // IPM action buttons
                    h('div', { className: 'grid grid-cols-2 gap-1 mt-1.5' },
                      h('button', { onClick: function() { cgIPMAction('ladybugs'); }, title: 'Release ladybugs ($1.50)', className: 'px-1 py-1 text-[11px] font-bold rounded bg-red-100 text-red-700 hover:bg-red-200' }, '\uD83D\uDC1E Ladybugs'),
                      h('button', { onClick: function() { cgIPMAction('neem'); }, title: 'Neem spray ($1.00)', className: 'px-1 py-1 text-[11px] font-bold rounded bg-orange-100 text-orange-700 hover:bg-orange-200' }, '\uD83C\uDF3F Neem'),
                      h('button', { onClick: function() { cgIPMAction('handpick'); }, title: 'Hand-pick pests (free)', className: 'px-1 py-1 text-[11px] font-bold rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200' }, '\u270B Pick'),
                      h('button', { onClick: function() { cgIPMAction('rowcovers'); }, title: 'Row covers ($2.00)', className: 'px-1 py-1 text-[11px] font-bold rounded bg-blue-100 text-blue-700 hover:bg-blue-200' }, '\uD83E\uDDF5 Covers')
                    )
                  )
                )
              ),

              // ── Year indicator + AI Advisor ──
              h('div', { className: 'flex items-center gap-2' },
                h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-1.5 text-[11px] font-bold text-indigo-700' },
                  '\uD83D\uDCC5 Year ' + cgYear + ' \u2022 ' + ['Spring', 'Summer', 'Autumn', 'Winter'][cgSeason] + ' \u2022 Day ' + (cgDay % 30 + 1)),
                callGemini && h('button', {
                  onClick: cgAskAdvisor,
                  disabled: cgAdvisorCooldown > 0,
                  className: 'flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' + (cgAdvisorCooldown > 0 ? 'bg-slate-100 text-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300')
                }, cgAdvisorCooldown > 0 ? '\uD83E\uDDD1\u200D\uD83C\uDF3E Advisor (wait ' + cgAdvisorCooldown + ' days)' : '\uD83E\uDDD1\u200D\uD83C\uDF3E Ask Garden Advisor')
              ),

              // ── Advisor Response ──
              cgAdvisorResponse && h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3' },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-[11px] font-bold text-emerald-700' }, '\uD83E\uDDD1\u200D\uD83C\uDF3E Garden Advisor'),
                  h('button', { onClick: function() { cgUpd({ advisorResponse: null }); }, className: 'ml-auto text-[11px] text-slate-200 hover:text-slate-600' }, '\u2715')
                ),
                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed whitespace-pre-line' }, cgAdvisorResponse)
              ),

              // ── Achievements ──
              h('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-3' },
                h('div', { className: 'text-xs font-bold text-amber-800 mb-2' }, '🏆 Achievements'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  CG_ACHIEVEMENTS.map(function(ach) {
                    var earned = ach.check(stats);
                    return h('div', {
                      key: ach.id,
                      title: ach.desc + (earned ? ' ✅ Earned!' : ''),
                      className: 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ' + (earned ? 'bg-amber-200 text-amber-900 ring-1 ring-amber-400' : 'bg-white text-slate-200 opacity-60')
                    }, h('span', null, ach.emoji), ach.label);
                  }))),

              // ── Garden Journal (SEL reflections) ──
              cgJournal && cgJournal.length > 0 && h('div', { className: 'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-3' },
                h('h3', { className: 'text-xs font-bold text-violet-800 mb-2' }, '📝 Garden Journal (' + cgJournal.length + ' reflection' + (cgJournal.length !== 1 ? 's' : '') + ')'),
                h('div', { className: 'space-y-2 max-h-40 overflow-y-auto' },
                  cgJournal.slice().reverse().map(function(entry, i) {
                    var ref = CG_SEL_REFLECTIONS[entry.id] || {};
                    return h('div', { key: i, className: 'bg-white rounded-lg p-2 border border-violet-100' },
                      h('div', { className: 'flex items-center gap-2 mb-1' },
                        h('span', null, ref.emoji || '📝'),
                        h('span', { className: 'text-[11px] font-bold text-violet-800' }, ref.title || entry.id),
                        h('span', { className: 'text-[11px] text-slate-600 ml-auto' }, new Date(entry.ts).toLocaleDateString())),
                      h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, entry.response));
                  })))
            );
          }


          // ── Mode toggle + conditional render ──
          if (gardenMode === 'community') {
            return React.createElement('div', { className: 'space-y-4 animate-in fade-in duration-200' },
              renderTutorial('companionPlanting', _tutCompanionPlanting),
              React.createElement('div', { className: 'flex items-center justify-between' },
                React.createElement('div', { className: 'flex items-center gap-3' },
                  React.createElement('button', { onClick: function () { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: 'text-slate-600' })),
                  React.createElement('div', null,
                    React.createElement('h3', { className: 'text-lg font-bold text-slate-800' }, '🏡 Community Garden Simulator'),
                    React.createElement('p', { className: 'text-xs text-slate-600' }, 'Plan, plant, and manage a diverse garden ecosystem'))),
                React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('button', { onClick: function() { upd('gardenMode', 'sisters'); }, className: 'px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-50' }, '🌽 Three Sisters'),
                  React.createElement('button', { className: 'px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 text-white' }, '🏡 Community Garden'))),
              renderCommunityGarden());
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

                }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-200" })),

                React.createElement("div", null,

                  React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "🌱 Companion Planting Lab"),

                  React.createElement("p", { className: "text-xs text-slate-600" }, "The milpa / Three Sisters — 7,000+ years of agricultural science")

                )

              ),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("button", {
                  onClick: function () { upd('gardenMode', 'community'); },
                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300"
                }, "🏡 Community Garden"),

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

                React.createElement("span", { className: "text-[11px] font-bold text-amber-600" }, "Learn more:"),

                React.createElement("a", { href: "https://www.haudenosauneeconfederacy.com/", target: "_blank", rel: "noopener noreferrer", className: "text-[11px] text-amber-700 underline hover:text-amber-900" }, "Haudenosaunee Confederacy"),

                React.createElement("span", { className: "text-[11px] text-amber-400" }, "•"),

                React.createElement("a", { href: "https://americanindian.si.edu/", target: "_blank", rel: "noopener noreferrer", className: "text-[11px] text-amber-700 underline hover:text-amber-900" }, "Smithsonian NMAI"),

                React.createElement("span", { className: "text-[11px] text-amber-400" }, "•"),

                React.createElement("a", { href: "https://www.usda.gov/media/blog/2021/11/02/three-sisters-and-more-indigenous-food-systems", target: "_blank", rel: "noopener noreferrer", className: "text-[11px] text-amber-700 underline hover:text-amber-900" }, "USDA: Three Sisters")

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

                    phase === 'grow' && React.createElement("span", { className: "text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full" },

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

                      React.createElement("span", { className: "text-[11px] font-bold text-emerald-700" }, "Overall Soil Health"),

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

                    React.createElement("span", { className: "text-[11px] font-bold text-red-700" }, "Soil Health: " + monoHealth + "%")

                  ),

                  growthTime > 30 && React.createElement("div", { className: "text-[11px] text-red-800 bg-red-100 rounded-lg p-2 mt-1" },

                    "⚠️ Without beans, nitrogen depletes. Without squash leaves, moisture drops and weeds take over."

                  )

                ),



                // Soil detail panel

                showSoilDetail && React.createElement("div", { className: "bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl border border-stone-200 p-3 text-[11px] text-stone-700 space-y-2 leading-relaxed" },

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

                React.createElement("button", { onClick: function () { upd('eventPopup', null); },

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

                React.createElement("div", { className: "flex items-center gap-2 bg-white rounded-xl border border-slate-400 p-2" },

                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase px-1" }, "Plant:"),

                  React.createElement("button", { "aria-label": "Corn",

                    onClick: function () {

                      upd('cornPlanted', !cornPlanted);

                      if (!cornPlanted) {

                        awardStemXP('companion_planting_corn', 10, 'Planted corn');

                        if (addToast) addToast('🌽 Corn planted! Tall stalks provide a trellis for beans.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (cornPlanted ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-slate-50 text-slate-600 hover:bg-yellow-50 border border-slate-400')

                  }, "🌽 Corn" + (cornPlanted ? ' ✓' : '')),

                  React.createElement("button", { "aria-label": "Beans",

                    onClick: function () {

                      upd('beansPlanted', !beansPlanted);

                      if (!beansPlanted) {

                        awardStemXP('companion_planting_beans', 10, 'Planted beans');

                        if (addToast) addToast('🫘 Beans planted! Rhizobium bacteria fix nitrogen.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (beansPlanted ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-slate-50 text-slate-600 hover:bg-green-50 border border-slate-400')

                  }, "🫘 Beans" + (beansPlanted ? ' ✓' : '')),

                  React.createElement("button", { "aria-label": "Squash",

                    onClick: function () {

                      upd('squashPlanted', !squashPlanted);

                      if (!squashPlanted) {

                        awardStemXP('companion_planting_squash', 10, 'Planted squash');

                        if (addToast) addToast('🎃 Squash planted! Leaves shade soil and trap moisture.', 'success');

                      }

                    },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (squashPlanted ? 'bg-orange-100 text-orange-800 border border-orange-300' : 'bg-slate-50 text-slate-600 hover:bg-orange-50 border border-slate-400')

                  }, "🎃 Squash" + (squashPlanted ? ' ✓' : ''))

                ),

                allPlanted && React.createElement("button", { "aria-label": "Grow!",

                  onClick: function () { upd('phase', 'grow'); awardStemXP('companion_planting_grow', 15, 'Started growth simulation'); },

                  className: "px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5"

                }, "▶ Grow!"),

                !allPlanted && React.createElement("span", { className: "text-[11px] text-slate-600 italic" }, "Plant all three seeds to begin")

              ),



              // ── Action Toolbar (grow phase) ──

              phase === 'grow' && React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200 p-3" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { className: "text-xs font-bold text-emerald-800" }, "🎮 Actions"),

                  React.createElement("div", { className: "flex-1" }),

                  // Speed controls

                  React.createElement("div", { className: "flex items-center gap-1" },

                    React.createElement("span", { className: "text-[11px] text-emerald-600 font-bold mr-1" }, "Speed:"),

                    [1, 2, 5].map(function (s) {

                      return React.createElement("button", { key: s,

                        onClick: function () { upd('growSpeed', s); },

                        className: "px-2 py-0.5 rounded text-[11px] font-bold transition-all " + (growSpeed === s ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50')

                      }, s + '×');

                    })

                  ),

                  React.createElement("span", { className: "text-[11px] font-bold text-emerald-700 ml-2" }, Math.round(growthTime) + "% grown")

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

                    return React.createElement("button", { "aria-label": action.label + " garden action",

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

                          ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed'

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

                      React.createElement("div", { className: "text-[11px] font-bold " + (unlocked ? 'text-purple-700' : 'text-slate-200') }, (unlocked ? '✨ ' : '🔒 ') + syn.label),

                      React.createElement("div", { className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden" },

                        React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: Math.round(syn.val) + '%', background: 'linear-gradient(to right, ' + c.light + ', ' + c.dark + ')' } })

                      ),

                      React.createElement("div", { className: "text-[11px] text-slate-200" }, syn.desc),

                      React.createElement("div", { className: "text-[11px] font-bold", style: { color: c.text } }, Math.round(syn.val) + '%')

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

                  React.createElement("div", { className: "text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1" }, "🌾 Crop Yields"),

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

                          React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, crop.name),

                          React.createElement("span", { className: "text-[11px] font-bold", style: { color: crop.color } }, crop.planted ? crop.value + ' ' + crop.unit : '—')

                        ),

                        React.createElement("div", { className: "w-full h-2.5 rounded-full overflow-hidden", style: { background: crop.bgColor } },

                          React.createElement("div", { className: "h-full rounded-full transition-all duration-700", style: { width: (crop.planted ? Math.round(pct) : 0) + '%', background: crop.color } })

                        )

                      )

                    );

                  }),

                  React.createElement("div", { className: "flex items-center justify-between pt-1.5 border-t border-amber-100 mt-1" },

                    React.createElement("span", { className: "text-[11px] font-bold text-amber-800" }, "Total Harvest"),

                    React.createElement("span", { className: "text-sm font-bold text-amber-700" }, _totalYield + ' units'),

                    synergyBonus > 1.05 && React.createElement("span", { className: "text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full" }, '✨ +' + Math.round((synergyBonus - 1) * 100) + '% synergy bonus')

                  )

                ),

                React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-emerald-700" }, Math.round(plantHealth)),

                    React.createElement("div", { className: "text-[11px] text-slate-600" }, "Health Score")

                  ),

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-blue-700" }, Math.round((synCornBeans + synBeansSoil + synSquashAll) / 3)),

                    React.createElement("div", { className: "text-[11px] text-slate-600" }, "Avg Synergy")

                  ),

                  React.createElement("div", { className: "bg-white rounded-lg p-2" },

                    React.createElement("div", { className: "text-lg font-bold text-amber-700" }, seasonScore),

                    React.createElement("div", { className: "text-[11px] text-slate-600" }, "Season Score")

                  )

                ),

                React.createElement("div", { className: "flex items-center justify-between bg-amber-100 rounded-lg p-2" },

                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "🏆 Total Score: " + totalScore),

                  React.createElement("span", { className: "text-xs font-bold text-amber-800" }, "🌾 Harvests: " + harvestCount)

                ),

                React.createElement("button", { "aria-label": "Harvest and start next season",

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

                  return React.createElement("button", { "aria-label": "Select answer: " + opt,

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

              quizFeedback && React.createElement("button", { onClick: function () { upd('quizQ', (quizQ + 1)); upd('quizAnswer', ''); upd('quizFeedback', ''); },

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
                React.createElement("button", { onClick: function() { upd('showFarmCompare', !d.showFarmCompare); },
                  className: "text-[11px] text-green-600 hover:text-green-800 font-bold"
                }, d.showFarmCompare ? 'Hide' : 'Compare \u2192')
              ),
              d.showFarmCompare && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-3" }, "How does companion planting compare to industrial farming? The energy, water, and carbon differences are staggering."),
                // System selector
                React.createElement("div", { className: "flex gap-1 mb-3" },
                  FARMING_SYSTEMS.map(function(sys) {
                    var isActive = (d.farmSystemIdx || 'industrial') === sys.id;
                    return React.createElement("button", { key: sys.id,
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
                              React.createElement("div", { className: "text-[11px] text-center font-bold mt-0.5", style: { color: sys.color } }, val + metric.unit)
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
                        React.createElement("div", { className: "text-[11px] font-bold text-green-600 mb-0.5" }, '\u2705 Pros'),
                        sys.pros.map(function(p, pi) { return React.createElement("div", { key: pi, className: "text-[11px] text-slate-600" }, '\u2022 ' + p); })
                      ),
                      React.createElement("div", null,
                        React.createElement("div", { className: "text-[11px] font-bold text-red-500 mb-0.5" }, '\u26A0 Cons'),
                        sys.cons.map(function(c, ci) { return React.createElement("div", { key: ci, className: "text-[11px] text-slate-600" }, '\u2022 ' + c); })
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
                React.createElement("button", { onClick: function() { upd('showFoodMiles', !d.showFoodMiles); },
                  className: "text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                }, d.showFoodMiles ? 'Hide' : 'Calculate \u2192')
              ),
              d.showFoodMiles && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-2" }, "How much energy does your food travel? Homegrown food = zero food miles, zero transport emissions."),
                React.createElement("div", { className: "space-y-1" },
                  FOOD_MILES.map(function(food, fi) {
                    var maxEnergy = 20;
                    return React.createElement("div", { key: fi, className: "rounded-lg p-1.5 bg-white border border-blue-100" },
                      React.createElement("div", { className: "flex items-center gap-1.5 mb-0.5" },
                        React.createElement("span", { className: "text-lg" }, food.icon),
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-700 w-16" }, food.food),
                        React.createElement("span", { className: "text-[11px] text-slate-200" }, food.season)
                      ),
                      React.createElement("div", { className: "flex gap-0.5" },
                        // Homegrown bar
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-slate-100 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full bg-green-500", style: { width: Math.max(2, food.homegrown.energy / maxEnergy * 100) + '%' } })
                          ),
                          React.createElement("div", { className: "text-[11px] text-green-600 font-bold" }, '\uD83C\uDFE1 ' + food.homegrown.energy + ' MJ')
                        ),
                        // Store bar
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-slate-100 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full bg-amber-500", style: { width: Math.max(2, food.store.energy / maxEnergy * 100) + '%' } })
                          ),
                          React.createElement("div", { className: "text-[11px] text-amber-600 font-bold" }, '\uD83D\uDED2 ' + food.store.miles + 'mi / ' + food.store.co2 + 'kg CO\u2082')
                        ),
                        // Imported bar
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("div", { className: "h-2.5 rounded-full bg-slate-100 overflow-hidden" },
                            React.createElement("div", { className: "h-full rounded-full bg-red-500", style: { width: Math.max(2, food.imported.energy / maxEnergy * 100) + '%' } })
                          ),
                          React.createElement("div", { className: "text-[11px] text-red-600 font-bold" }, '\u2708 ' + food.imported.miles + 'mi / ' + food.imported.co2 + 'kg CO\u2082')
                        )
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "flex gap-3 justify-center mt-2 text-[11px]" },
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
                React.createElement("button", { onClick: function() { upd('showWaterFoot', !d.showWaterFoot); },
                  className: "text-[11px] text-cyan-600 hover:text-cyan-800 font-bold"
                }, d.showWaterFoot ? 'Hide' : 'View \u2192')
              ),
              d.showWaterFoot && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-2" }, "Virtual water: the total water needed to produce food, from field to fork. Companion planting\'s living mulch cuts water use 40-60%!"),
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
                      React.createElement("span", { className: "text-[11px] font-bold w-20 text-right", style: { color: crop.color } }, crop.gallons.toLocaleString() + ' gal/' + crop.unit.split(' ')[1])
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
                React.createElement("button", { onClick: function() { upd('showPermaculture', !d.showPermaculture); },
                  className: "text-[11px] text-violet-600 hover:text-violet-800 font-bold"
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
                    React.createElement("div", { className: "text-[11px] font-black text-violet-700" }, '#' + p.num + ' ' + p.name),
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
                React.createElement("button", { onClick: function() { upd('showRegen', !d.showRegen); },
                  className: "text-[11px] text-emerald-600 hover:text-emerald-800 font-bold"
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
                      React.createElement("span", { className: "text-[11px] font-bold text-emerald-800" }, practice.name),
                      React.createElement("span", { className: "text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-auto " + diffColor }, practice.difficulty)
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
                React.createElement("span", { className: "text-[11px] text-slate-200" }, 'Score: ' + gardenScenarioScore + '/' + gardenScenarioTotal + ' | Best: ' + gardenBestStreak)
              ),
              (function() {
                var sc = GARDEN_SCENARIOS[gardenScenarioIdx];
                if (!sc) return null;
                var answered = gardenScenarioAnswer >= 0;
                var isCorrect = gardenScenarioAnswer === sc.correct;
                return React.createElement("div", null,
                  React.createElement("div", { className: "bg-white rounded-xl p-3 mb-2 border border-rose-100" },
                    React.createElement("div", { className: "text-[11px] text-slate-700 leading-relaxed" }, sc.scenario)
                  ),
                  React.createElement("div", { className: "text-[11px] font-bold text-slate-800 mb-2" }, sc.question),
                  React.createElement("div", { className: "space-y-1.5 mb-2" },
                    sc.options.map(function(opt, oi) {
                      var isSelected = gardenScenarioAnswer === oi;
                      var isRight = oi === sc.correct;
                      var cls = !answered ? 'border-rose-100 bg-white hover:border-rose-400 cursor-pointer' :
                        isRight ? 'border-green-400 bg-green-50' :
                        isSelected && !isRight ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white opacity-40';
                      return React.createElement("button", { key: oi,
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
                        React.createElement("span", { className: "font-bold mr-1 " + (answered && isRight ? 'text-green-600' : answered && isSelected ? 'text-red-500' : 'text-slate-200') }, String.fromCharCode(65 + oi) + '.'),
                        React.createElement("span", { className: answered && isRight ? 'text-green-700' : answered && isSelected && !isRight ? 'text-red-600' : 'text-slate-700' }, ' ' + opt)
                      );
                    })
                  ),
                  answered && React.createElement("div", { className: "space-y-2" },
                    React.createElement("div", { className: "rounded-xl p-2.5 text-[11px] " + (isCorrect ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') },
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
                  React.createElement("div", { className: "text-[11px] text-indigo-800 leading-relaxed" }, GARDEN_FACTS[factIdx % GARDEN_FACTS.length])
                ),
                React.createElement("button", { "aria-label": "Next",
                  onClick: function() { upd('factIdx', (factIdx + 1) % GARDEN_FACTS.length); },
                  className: "text-[11px] text-indigo-500 hover:text-indigo-700 font-bold"
                }, 'Next \u2192')
              )
            ),

            // === QUICK REFERENCE CARDS ===
            React.createElement("div", {
              className: "bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-4 border border-teal-200 mb-3"
            },
              React.createElement("div", { className: "flex items-center justify-between mb-2" },
                React.createElement("h4", { className: "text-sm font-bold text-teal-800" }, "\uD83D\uDCCB Quick Reference Cards"),
                React.createElement("button", { onClick: function() { upd('showGardenRef', !d.showGardenRef); },
                  className: "text-[11px] text-teal-600 hover:text-teal-800 font-bold"
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
                      React.createElement("span", { className: "text-[11px] font-black", style: { color: card.color } }, card.title)
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
                React.createElement("button", { onClick: function() { upd('showNitrogen', !d.showNitrogen); },
                  className: "text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                }, d.showNitrogen ? 'Hide' : 'Explore \u2192')
              ),
              d.showNitrogen && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-2" }, "This is why beans are so important! They hack the nitrogen cycle through bacterial symbiosis."),
                React.createElement("div", { className: "flex flex-wrap gap-1 justify-center mb-2" },
                  NITROGEN_CYCLE.map(function(step, si) {
                    var isActive = (d.nitroCycleIdx || 0) === si;
                    return React.createElement("div", { key: si, className: "flex items-center" },
                      React.createElement("button", { onClick: function() { upd('nitroCycleIdx', si); },
                        className: "flex flex-col items-center px-2 py-1.5 rounded-xl border-2 transition-all " + (isActive ? 'scale-110 shadow-md' : 'hover:scale-105'),
                        style: { borderColor: isActive ? step.color : step.color + '30', background: isActive ? step.color + '10' : '#fff' }
                      },
                        React.createElement("span", { className: "text-lg" }, step.icon),
                        React.createElement("span", { className: "text-[11px] font-bold", style: { color: step.color } }, step.name)
                      ),
                      si < 5 && React.createElement("span", { className: "text-slate-200 mx-0.5" }, '\u2192')
                    );
                  })
                ),
                (function() {
                  var step = NITROGEN_CYCLE[d.nitroCycleIdx || 0];
                  return React.createElement("div", { className: "rounded-xl p-2.5 border bg-white text-center", style: { borderColor: step.color + '40' } },
                    React.createElement("div", { className: "text-[11px] font-bold", style: { color: step.color } }, 'Step ' + step.step + ': ' + step.name),
                    React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5" }, step.desc),
                    step.step === 2 && React.createElement("div", { className: "text-[11px] text-emerald-800 bg-emerald-50 rounded p-1 mt-1 border border-emerald-100 font-bold" }, '\uD83C\uDF31 THIS is what bean roots do! Free fertilizer from thin air!')
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
                  className: "text-[11px] text-amber-600 hover:text-amber-800 font-bold"
                }, d.showCompost ? 'Hide' : 'Learn \u2192')
              ),
              d.showCompost && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-2" }, "The golden ratio: 3 parts Brown (carbon) to 1 part Green (nitrogen). Keep moist like a wrung-out sponge!"),
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                  React.createElement("div", { className: "rounded-xl p-2 border border-green-300 bg-green-50" },
                    React.createElement("div", { className: "text-[11px] font-bold text-green-700 mb-1" }, "\uD83C\uDF3F GREENS (Nitrogen)"),
                    COMPOST_GREENS.map(function(g, gi) {
                      return React.createElement("div", { key: gi, className: "flex items-center gap-1 text-[11px] text-green-800" },
                        React.createElement("span", null, g.icon), React.createElement("span", null, g.name)
                      );
                    })
                  ),
                  React.createElement("div", { className: "rounded-xl p-2 border border-amber-300 bg-amber-50" },
                    React.createElement("div", { className: "text-[11px] font-bold text-amber-700 mb-1" }, "\uD83C\uDF42 BROWNS (Carbon)"),
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
                React.createElement("button", { onClick: function() { upd('showCalendar', !d.showCalendar); },
                  className: "text-[11px] text-emerald-600 hover:text-emerald-800 font-bold"
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
                      React.createElement("span", { className: "text-[11px] font-black text-emerald-800" }, season.season),
                      React.createElement("span", { className: "text-[11px] text-slate-600 font-mono ml-auto" }, season.months)
                    ),
                    isActive && React.createElement("div", { className: "mt-1.5 pl-7 space-y-1" },
                      React.createElement("div", { className: "flex flex-wrap gap-1" },
                        season.plants.map(function(p, pi) {
                          return React.createElement("span", { key: pi, className: "px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700" }, p);
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
                React.createElement("button", { onClick: function() { upd('showPH', !d.showPH); },
                  className: "text-[11px] text-purple-600 hover:text-purple-800 font-bold"
                }, d.showPH ? 'Hide' : 'View \u2192')
              ),
              d.showPH && React.createElement("div", null,
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-2" }, "pH measures soil acidity (1-14). Most veggies prefer 6.0-7.0. Test your soil!"),
                // pH scale bar
                React.createElement("div", { className: "relative h-6 rounded-full overflow-hidden mb-1", style: { background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e, #3b82f6, #8b5cf6)' } },
                  React.createElement("div", { className: "absolute inset-0 flex items-center justify-between px-2" },
                    [4, 5, 6, 7, 8].map(function(ph) {
                      return React.createElement("span", { key: ph, className: "text-[11px] font-bold text-white drop-shadow" }, ph);
                    })
                  )
                ),
                React.createElement("div", { className: "flex justify-between text-[11px] text-slate-600 mb-2 px-1" },
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
                      React.createElement("span", { className: "w-16 text-[11px] font-bold text-slate-600 truncate" }, plant.name),
                      React.createElement("div", { className: "flex-1 relative h-3 bg-slate-100 rounded-full" },
                        React.createElement("div", {
                          className: "absolute h-full rounded-full",
                          style: { left: left + '%', width: Math.max(width, 2) + '%', background: 'linear-gradient(to right, #22c55e, #10b981)', opacity: 0.7 }
                        }),
                        React.createElement("span", { className: "absolute text-[11px] font-mono text-slate-200", style: { left: (left + width / 2) + '%', top: '-1px', transform: 'translateX(-50%)' } }, plant.ph[0] + '-' + plant.ph[1])
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
                React.createElement("button", { onClick: function() { upd('showPairs', !d.showPairs); },
                  className: "text-[11px] text-green-600 hover:text-green-800 font-bold"
                }, d.showPairs ? 'Hide' : 'Explore \u2192')
              ),
              d.showPairs && React.createElement("div", null,
                // Filter
                React.createElement("div", { className: "flex gap-1 mb-2" },
                  ['all', 'friend', 'enemy'].map(function(f) {
                    return React.createElement("button", { key: f,
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
                        React.createElement("span", { className: "text-[11px] " + (pair.type === 'enemy' ? 'text-red-500' : 'text-green-500') + " font-bold" }, pair.type === 'enemy' ? '\u2718' : '\u2764'),
                        React.createElement("span", { className: "text-lg" }, pair.icon2),
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-700" }, pair.plant1 + ' + ' + pair.plant2)
                      ),
                      React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5" }, pair.benefit),
                      isActive && React.createElement("div", { className: "mt-1 text-[11px] text-indigo-600 bg-indigo-50 rounded p-1 border border-indigo-100" },
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
                React.createElement("button", { onClick: function() { upd('showFamilies', !d.showFamilies); },
                  className: "text-[11px] text-violet-600 hover:text-violet-800 font-bold"
                }, d.showFamilies ? 'Hide' : 'Learn \u2192')
              ),
              d.showFamilies && React.createElement("div", { className: "space-y-1.5 max-h-56 overflow-y-auto" },
                React.createElement("div", { className: "text-[11px] text-slate-600 italic mb-1" }, "Never plant the same family in the same spot two years in a row! Rotate to prevent disease buildup and nutrient depletion."),
                PLANT_FAMILIES.map(function(fam, fi) {
                  var isActive = d.familyIdx === fi;
                  return React.createElement("div", { role: "button", tabIndex: 0, onKeyDown: function(e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.target.click(); } },  key: fi,
                    onClick: function() { upd('familyIdx', isActive ? null : fi); },
                    className: "cursor-pointer rounded-xl p-2 border transition-all " + (isActive ? 'bg-white shadow-sm' : 'bg-violet-50/50 hover:bg-white'),
                    style: { borderColor: isActive ? fam.color : fam.color + '30' }
                  },
                    React.createElement("div", { className: "flex items-center gap-1.5" },
                      React.createElement("span", { className: "text-lg" }, fam.icon),
                      React.createElement("span", { className: "text-[11px] font-black", style: { color: fam.color } }, fam.name),
                      React.createElement("span", { className: "text-[11px] text-slate-600 ml-auto" }, fam.members)
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
                React.createElement("button", { onClick: function() { upd('showSoilTypes', !d.showSoilTypes); },
                  className: "text-[11px] text-amber-600 hover:text-amber-800 font-bold"
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
                    React.createElement("div", { className: "text-[11px] font-black", style: { color: soil.color } }, soil.name),
                    React.createElement("div", { className: "text-[11px] text-slate-600" }, soil.texture),
                    isActive && React.createElement("div", { className: "text-left mt-1.5 space-y-0.5" },
                      React.createElement("div", { className: "text-[11px] text-blue-600" }, "\uD83D\uDCA7 Drainage: " + soil.drainage),
                      React.createElement("div", { className: "text-[11px] text-emerald-600" }, "\uD83C\uDF31 Nutrients: " + soil.nutrients),
                      React.createElement("div", { className: "text-[11px] text-amber-600" }, "\u2B50 Best for: " + soil.bestFor),
                      React.createElement("div", { className: "text-[11px] text-violet-600" }, "\uD83D\uDD27 Improve: " + soil.improve)
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
                React.createElement("button", { onClick: function() { upd('showPests', !d.showPests); },
                  className: "text-[11px] text-red-600 hover:text-red-800 font-bold"
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
                          React.createElement("span", { className: "text-[11px] font-bold text-red-800" }, pest.name),
                          React.createElement("span", { className: "text-[11px] text-slate-600 ml-auto" }, pest.damage.substring(0, 30) + '...')
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
                          React.createElement("span", { className: "text-[11px] font-bold", style: { color: bug.color } }, bug.name)
                        ),
                        React.createElement("div", { className: "text-[11px] text-slate-600" }, bug.role),
                        React.createElement("div", { className: "text-[11px] text-emerald-600 mt-0.5" }, "\uD83C\uDF3C Attract with: " + bug.attract)
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