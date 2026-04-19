// ═══════════════════════════════════════════
// stem_tool_beehive.js — Beehive Colony Simulator
// A living model of Apis mellifera: colony dynamics, nectar economics,
// waggle dances, seasonal cycles, threats, and the science of superorganisms.
// Connected to Companion Planting Lab via shared localStorage.
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('beehive'))) {

(function() {
  'use strict';

  // ── Audio System (auto-injected) ──
  var _beeAC = null;
  function getBeeAC() { if (!_beeAC) { try { _beeAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_beeAC && _beeAC.state === "suspended") { try { _beeAC.resume(); } catch(e) {} } return _beeAC; }
  function beeTone(f,d,tp,v) { var ac = getBeeAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxBeeBuzz() { beeTone(220,0.1,"sawtooth",0.04); }
  function sfxBeeCollect() { beeTone(660,0.06,"sine",0.06); }
  function sfxBeeWaggle() { beeTone(330,0.08,"triangle",0.05); }
  function sfxDayChime() { beeTone(523,0.06,"sine",0.04); setTimeout(function() { beeTone(659,0.08,"sine",0.04); }, 60); }
  function sfxAlert() { beeTone(440,0.12,"sawtooth",0.06); setTimeout(function() { beeTone(380,0.15,"sawtooth",0.05); }, 100); }
  function sfxSuccess() { [523,659,784].forEach(function(f,i) { setTimeout(function() { beeTone(f,0.08,"sine",0.05); }, i*80); }); }
  function sfxTreat() { beeTone(200,0.15,"square",0.03); beeTone(280,0.12,"square",0.03); }


  window.StemLab.registerTool('beehive', {
    icon: '\uD83D\uDC1D',
    label: 'Beehive Simulator',
    desc: 'Colony dynamics, nectar flow, and the science of superorganisms',
    color: 'amber',
    category: 'science',
    questHooks: [
      { id: 'survive_30_days', label: 'Keep the colony alive for 30 days', icon: '\uD83D\uDC1D', check: function(d) { return (d.day || 0) >= 30; }, progress: function(d) { return (d.day || 0) + '/30 days'; } },
      { id: 'produce_honey', label: 'Produce honey for harvest', icon: '\uD83C\uDF6F', check: function(d) { return (d.totalHoney || 0) >= 10; }, progress: function(d) { return (d.totalHoney || 0) + '/10 units'; } },
      { id: 'score_50', label: 'Earn 50+ colony health points', icon: '\u2B50', check: function(d) { return (d.score || 0) >= 50; }, progress: function(d) { return (d.score || 0) + '/50 pts'; } },
      { id: 'handle_event', label: 'Successfully handle a colony threat event', icon: '\u26A0\uFE0F', check: function(d) { return (d.eventsHandled || 0) >= 1; }, progress: function(d) { return (d.eventsHandled || 0) >= 1 ? 'Handled!' : 'Waiting...'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var isDark = ctx.isDark;

      return (function() {
        var d = (labToolData.beehive) || {};
        var upd = function(key, val) { var _k = {}; _k[key] = val; setLabToolData(function(prev) { return Object.assign({}, prev, { beehive: Object.assign({}, prev.beehive || {}, _k) }); }); };
        var updAll = function(patch) { setLabToolData(function(prev) { return Object.assign({}, prev, { beehive: Object.assign({}, prev.beehive || {}, patch) }); }); };

        // ── Bee Subspecies (real honeybee genetic stocks with authentic trade-offs) ──
        var SUBSPECIES = [
          { id: 'italian', name: 'Italian', sci: 'A. m. ligustica', emoji: '🟡', origin: 'Mediterranean Italy',
            note: 'Gold-striped. The "stock" honeybee in North America — what 90% of US keepers have. Gentle, prolific, great honey producers. Weaker winter hardiness; prone to robbing during dearth.',
            mods: { honey: 1.10, spring: 1.00, winter: 0.92, varroa: 1.00 } },
          { id: 'carniolan', name: 'Carniolan', sci: 'A. m. carnica', emoji: '⚫', origin: 'Slovenia / Austrian Alps',
            note: 'Dark gray, "the sweetheart bee". Exceptional winter hardiness — clusters tight, consumes less honey. Explosive spring buildup. Swarms more when the hive gets crowded.',
            mods: { honey: 1.00, spring: 1.15, winter: 1.15, varroa: 1.00 } },
          { id: 'russian', name: 'Russian', sci: 'Primorsky line', emoji: '🛡️', origin: 'Far East Russia',
            note: 'USDA-bred from Primorsky region bees. Co-evolved with varroa for 150 years — strong hygienic behavior. Slower buildup and lower peak honey. Ideal for hands-off IPM.',
            mods: { honey: 0.88, spring: 0.85, winter: 1.10, varroa: 0.60 } },
          { id: 'buckfast', name: 'Buckfast', sci: 'hybrid', emoji: '✨', origin: 'Buckfast Abbey, England',
            note: 'Brother Adam\'s century-long hybrid program. Balanced everything: gentle, low-swarm, disease-resistant, productive. No trait is top-tier but none are weak.',
            mods: { honey: 1.05, spring: 1.05, winter: 1.05, varroa: 0.90 } },
          { id: 'saskatraz', name: 'Saskatraz', sci: 'hybrid', emoji: '❄️', origin: 'Saskatchewan, Canada',
            note: 'Bred for prairie Canada: cold tolerance + varroa/tracheal mite resistance. Excellent for cold-climate beekeeping (Maine, Minnesota, Scandinavia).',
            mods: { honey: 0.95, spring: 1.00, winter: 1.20, varroa: 0.70 } }
        ];
        var activeSubspecies = (function() {
          var wanted = d.subspecies || 'italian';
          for (var i = 0; i < SUBSPECIES.length; i++) if (SUBSPECIES[i].id === wanted) return SUBSPECIES[i];
          return SUBSPECIES[0];
        })();

        // ── Apiary Site (where the hive is placed — real site-selection decision) ──
        var APIARY_SITES = [
          { id: 'meadow', name: 'Meadow / Old Field', emoji: '🌾',
            note: 'Open field with mixed wildflowers and clover. The classic apiary site — balanced exposure, easy inspection access, decent forage in all seasons.',
            mods: { forage: 1.00, disease: 1.00 } },
          { id: 'forest_edge', name: 'Forest Edge', emoji: '🌳',
            note: 'Dappled shade with strong basswood/linden flow in July. Cooler mornings delay first foraging each day. Bears occasionally investigate — consider electric fencing.',
            mods: { forage: 0.92, disease: 0.90 } },
          { id: 'urban', name: 'Urban Rooftop', emoji: '🏙️',
            note: 'Park flowers + ornamental gardens + NO farm spray. Heat island makes varroa reproduce faster and crowding raises disease risk. Urban bees actually thrive despite expectations.',
            mods: { forage: 0.88, disease: 1.10 } },
          { id: 'coastal', name: 'Coastal Blueberry Barrens', emoji: '🌊',
            note: 'Wild blueberry barrens yield a massive but brief July flow. Salt spray stresses wings; coastal wind cuts foraging on rough days. Year-round mild climate = gentler winters.',
            mods: { forage: 1.05, disease: 0.85 } },
          { id: 'mountain', name: 'Mountain Valley', emoji: '🏔️',
            note: 'Alpine meadows bursting with wildflowers. Cold nights suppress both disease and varroa. Shorter forage season — build fast or go hungry. Prized for varietal honeys.',
            mods: { forage: 0.95, disease: 0.70 } }
        ];
        var activeSite = (function() {
          var wanted = d.apiarySite || 'meadow';
          for (var i = 0; i < APIARY_SITES.length; i++) if (APIARY_SITES[i].id === wanted) return APIARY_SITES[i];
          return APIARY_SITES[0];
        })();

        // ── Simulation Parameters (tuning knobs for colony dynamics) ──
        var SIMULATION_PARAMS = {
          foragerRatio: 0.4,            // fraction of workers that forage each day
          nectarPerForager: 0.0002,     // lbs nectar per forager per day (base)
          pollenPerForager: 0.00008,    // lbs pollen per forager per day (base)
          honeyConsumePerWorker: 0.00015, // lbs honey consumed per worker per day (base)
          pollenConsumePerBrood: 0.0001,  // lbs pollen consumed per brood per day
          pollenConsumePerWorker: 0.00003,
          baseBroodPerDay: 1500,        // max eggs/day at 100% queen health
          broodEmergeRate: 0.05,        // fraction of brood emerging daily
          baseWorkerMortality: 0.005,   // base daily worker death rate
          varroaMortalityDivisor: 50,   // higher = varroa has less mortality impact
          droneEvictionRate: 0.1,       // autumn drone eviction
          droneBaseMortality: 0.02,
          droneBirthRate: 0.05,         // fraction of newBrood that become drones (non-autumn/winter)
          varroaGrowthBase: 0.3,
          varroaGrowthPerBrood: 10000,  // scale factor for brood-driven varroa growth
          varroaDecayNoBrood: -0.5,
          pesticideChronicDivisor: 1000,
          pesticideVarroaBoost: 0.2,
          pesticideDecayPerDay: 0.3,
          habitatBoostThreshold: 70,
          habitatPenaltyThreshold: 30,
          habitatBoostMult: 1.2,
          habitatPenaltyMult: 0.6,
          randomEventChance: 0.12,      // per-day chance of a hive event (after day 3)
          actionPointsPerDay: 3
        };

        // ── Colony State ──
        var day = d.day || 0;
        var season = Math.max(0, Math.min(3, Math.floor((day % 120) / 30))); // 0=spring, 1=summer, 2=autumn, 3=winter
        var seasonNames = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'];

        // Population
        var workers = typeof d.workers === 'number' ? d.workers : 10000;
        var brood = typeof d.brood === 'number' ? d.brood : 3000;
        var drones = typeof d.drones === 'number' ? d.drones : 500;
        var queenHealth = typeof d.queenHealth === 'number' ? d.queenHealth : 100;

        // Resources
        var honey = typeof d.honey === 'number' ? d.honey : 20; // lbs
        var pollen = typeof d.pollen === 'number' ? d.pollen : 15; // lbs
        var wax = typeof d.wax === 'number' ? d.wax : 5; // lbs

        // Health
        var varroaLevel = typeof d.varroaLevel === 'number' ? d.varroaLevel : 5; // 0-100
        var diseaseRisk = typeof d.diseaseRisk === 'number' ? d.diseaseRisk : 0;
        var morale = typeof d.morale === 'number' ? d.morale : 80; // 0-100

        // Foraging
        var nectarSources = d.nectarSources || 3; // base number of flower sources
        var foragingEfficiency = typeof d.foragingEfficiency === 'number' ? d.foragingEfficiency : 70;

        var score = d.score || 0;
        var eventLog = d.eventLog || [];
        var activeEvent = d.activeEvent || null;
        var phase = d.phase || 'manage'; // 'manage' | 'inspect'
        var history = d.history || []; // [{day, workers, honey, varroa, morale}]

        // ── View Mode ──
        var viewMode = d.viewMode || 'beekeeper'; // 'beekeeper' | 'queen' | 'drone'

        // ── Sound toggle ──
        var soundOn = d.soundOn !== false; // default on

        // ── Tutorial state ──
        var tutorialStep = typeof d.tutorialStep === 'number' ? d.tutorialStep : (d.tutorialDone ? -1 : 0);
        var tutorialDone = d.tutorialDone || false;

        // ── Quiz state ──
        var quizOpen = d.quizOpen || false;
        var quizIdx = d.quizIdx || 0;
        var quizScore = d.quizScore || 0;
        var quizAnswered = d.quizAnswered || 0;
        var quizFeedback = d.quizFeedback || null; // {correct: bool, explanation: str}

        // ── Achievements / Badges ──
        var badges = d.badges || {};
        var BADGE_DEFS = [
          { id: 'first_day', icon: '🌅', label: 'First Dawn', desc: 'Advance your first day', check: function() { return day >= 1; } },
          { id: 'survive_30', icon: '📅', label: 'Month One', desc: 'Colony survives 30 days', check: function() { return day >= 30 && colonySurvived; } },
          { id: 'survive_120', icon: '🏆', label: 'Full Year', desc: 'Survive a complete year (120 days)', check: function() { return day >= 120 && colonySurvived; } },
          { id: 'honey_harvest', icon: '🍯', label: 'Sweet Reward', desc: 'Harvest honey for the first time', check: function() { return (d.totalHarvested || 0) > 0; } },
          { id: 'varroa_fighter', icon: '🛡️', label: 'Mite Slayer', desc: 'Treat varroa mites 3 times', check: function() { return (d.varroaTreats || 0) >= 3; } },
          { id: 'conservationist', icon: '🌍', label: 'Eco Warrior', desc: 'Complete 5 conservation actions', check: function() { return (d.conservationsDone || 0) >= 5; } },
          { id: 'garden_friend', icon: '🌱', label: 'Garden Friend', desc: 'Have 3+ pollinator plants in Companion Planting', check: function() { return gardenPollinators >= 3; } },
          { id: 'thriving', icon: '✨', label: 'Thriving Colony', desc: 'Reach 80+ colony health', check: function() { return colonyHealth >= 80; } },
          { id: 'big_colony', icon: '🐝', label: 'Mega Hive', desc: 'Grow colony to 25,000+ workers', check: function() { return workers >= 25000; } },
          { id: 'quiz_master', icon: '🎓', label: 'Bee Scholar', desc: 'Score 8+ on the Bee Knowledge Quiz', check: function() { return (d.bestQuizScore || 0) >= 8; } },
          { id: 'inspector', icon: '🔬', label: 'Hive Inspector', desc: 'View all 9 inspection layers', check: function() { return (d.layersViewed || []).length >= 9; } },
          { id: 'weather_wise', icon: '🌦️', label: 'Weather Wise', desc: 'Survive 3 weather events', check: function() { return (d.weatherEventsHandled || 0) >= 3; } },
          { id: 'varietal_master', icon: '🍯', label: 'Varietal Master', desc: 'Harvest 4 different honey varietals', check: function() { return Object.keys(d.varietals || {}).length >= 4; } },
          { id: 'event_handler', icon: '⚡', label: 'Crisis Manager', desc: 'Handle 5 colony events', check: function() { return (d.eventsHandled || 0) >= 5; } }
        ];
        // Check & award new badges
        var newBadges = Object.assign({}, badges);
        var badgesJustEarned = [];
        BADGE_DEFS.forEach(function(bd) {
          if (!newBadges[bd.id] && bd.check()) {
            newBadges[bd.id] = { earned: true, day: day };
            badgesJustEarned.push(bd);
          }
        });
        if (badgesJustEarned.length > 0) {
          // Defer badge update to avoid render-during-render; toast every new badge
          setTimeout(function() {
            updAll({ badges: newBadges });
            badgesJustEarned.forEach(function(bd) {
              if (addToast) addToast(bd.icon + ' Badge earned: ' + bd.label + '!', 'success');
              if (awardStemXP) awardStemXP('beehive', 10, 'Badge: ' + bd.label);
            });
            if (soundOn) sfxSuccess();
          }, 0);
        }
        var badgeCount = Object.keys(newBadges).length;
        var showBadges = d.showBadges || false;

        // ── Bee Knowledge Quiz Questions ──
        var QUIZ_QUESTIONS = [
          { q: 'How many times does a queen bee mate in her lifetime?', opts: ['Once (on a nuptial flight)', 'Every spring', 'Monthly', 'Continuously'], ans: 0, explain: 'A queen mates once during a nuptial flight at 200+ ft altitude with 10-20 drones, storing millions of sperm for her entire life.' },
          { q: 'What does the waggle dance communicate?', opts: ['Danger level', 'Direction and distance to food', 'Colony mood', 'Queen health'], ans: 1, explain: 'The waggle run angle (relative to vertical) encodes direction relative to the sun. Duration encodes distance (~1 sec = 1 km). Karl von Frisch won the 1973 Nobel Prize for this discovery.' },
          { q: 'At what temperature do bees maintain the brood nest?', opts: ['25°C (77°F)', '30°C (86°F)', '35°C (95°F)', '40°C (104°F)'], ans: 2, explain: 'The brood nest is maintained at exactly 35°C ± 0.5°C through shivering (heating) and water evaporation (cooling) — more precise than most mammals.' },
          { q: 'Why does honey never spoil?', opts: ['Too cold inside the hive', 'Low moisture + enzymes produce hydrogen peroxide', 'Beeswax is airtight', 'It ferments instead'], ans: 1, explain: 'Glucose oxidase converts glucose into gluconic acid + H₂O₂ (hydrogen peroxide). Combined with low water activity (<18.6%), this makes honey permanently antimicrobial. Edible honey was found in 3,000-year-old Egyptian tombs.' },
          { q: 'What is the primary threat to honeybee colonies worldwide?', opts: ['Bears', 'Varroa destructor mites', 'Cold weather', 'Other bee species'], ans: 1, explain: 'Varroa destructor mites feed on bee fat body tissue and transmit deadly viruses (DWV, ABPV). They arrived from Asian honeybees in the 1970s and are now present on every continent except Australia.' },
          { q: 'How many flowers must bees visit to produce 1 pound of honey?', opts: ['About 2,000', 'About 20,000', 'About 200,000', 'About 2 million'], ans: 3, explain: 'It takes roughly 2 million flower visits and 556 worker bees flying 55,000 miles to produce a single pound of honey. A single forager produces about 1/12 of a teaspoon in her lifetime.' },
          { q: 'What chemical does the alarm pheromone smell like?', opts: ['Honey', 'Bananas', 'Roses', 'Smoke'], ans: 1, explain: 'The alarm pheromone isopentyl acetate (isoamyl acetate) smells like bananas. This is why beekeepers avoid eating bananas before inspecting hives — the scent can trigger defensive behavior.' },
          { q: 'Why do beekeepers use smoke?', opts: ['To kill mites', 'To mask alarm pheromone and trigger bees to gorge on honey', 'To warm the hive', 'To attract the queen'], ans: 1, explain: 'Smoke masks alarm pheromone and triggers a "fire evacuation" response — bees gorge on honey to prepare for potentially abandoning the hive, which makes them calmer and less likely to sting.' },
          { q: 'How do bees cool the hive when it gets too hot?', opts: ['Open more entrances', 'Fan wings + spread water for evaporative cooling', 'Move brood outside', 'Stop foraging'], ans: 1, explain: 'Water foragers collect droplets and spread them on comb. Fanner bees beat wings at 230 beats/sec to create airflow, evaporating water and cooling by ~10°C. If still too hot, bees "beard" outside the entrance.' },
          { q: 'What determines whether a larva becomes a queen or a worker?', opts: ['Genetics', 'Diet — queens get royal jelly exclusively', 'Temperature of the cell', 'The queen decides'], ans: 1, explain: 'All female larvae start identical. Workers get royal jelly for 3 days then bee bread. Queen-destined larvae get royal jelly exclusively for their entire development, triggering epigenetic changes that produce a larger, fertile queen.' },
          { q: 'What happens to drones in autumn?', opts: ['They migrate south', 'They hibernate', 'They are evicted from the hive by workers', 'They become workers'], ans: 2, explain: 'Drones (males) serve only to mate. In autumn, workers drag drones out of the hive and refuse them re-entry — drones cannot forage or sting, making them a resource drain during winter scarcity.' },
          { q: 'How many odorant receptors does a honeybee have?', opts: ['About 10', 'About 50', 'About 170', 'About 1,000'], ans: 2, explain: 'Honeybees have 170+ odorant receptors. While humans have ~400, bees are 50× more sensitive to floral scents. Their antennae are sophisticated chemical sensors that read the colony\'s pheromone "language".' },
          // ── Anatomy ──
          { q: 'How fast do honeybee wings beat?', opts: ['~60/sec (like a hummingbird)', '~230/sec', '~500/sec', '~1000/sec'], ans: 1, explain: 'Honeybees beat their wings ~230 times per second — the distinctive "buzz" you hear. Indirect flight muscles deform the thorax so the wings snap rather than move muscle-by-wingbeat, generating up to 12,000 "rpm" equivalent.' },
          { q: 'Where on a worker bee is the pollen basket (corbicula)?', opts: ['On her abdomen', 'In her honey stomach', 'On her hind leg tibia', 'Between her antennae'], ans: 2, explain: 'The corbicula is a concave area on the hind-leg tibia ringed with stiff hairs. Foragers pack moistened pollen into this basket — it can hold 15mg (one-third of the bee\'s body weight).' },
          { q: 'How do bees breathe?', opts: ['Lungs like mammals', 'Through spiracles on the body', 'Gills like fish', 'They don\'t — they absorb O₂ through wings'], ans: 1, explain: 'Bees have no lungs. They breathe through 10 pairs of spiracles connected to tracheal tubes that pipe oxygen directly to every cell. Air sacs pump like bellows during flight.' },
          // ── Native Bees ──
          { q: 'Of ~20,000 bee species worldwide, how many make honey?', opts: ['Just 7', 'About 100', 'About 1,000', 'Most of them'], ans: 0, explain: 'Only 7 species in the genus Apis make storable honey. The other ~20,000+ bee species are mostly solitary and store just enough food to raise one generation — many are more efficient pollinators than honeybees.' },
          { q: 'Mason bees pollinate apple orchards at roughly what rate compared to honeybees?', opts: ['10× less', 'About the same', '10× more', '100× more per individual'], ans: 3, explain: 'Mason bees carry pollen dry on their abdominal scopa, dropping it on every flower they visit. One mason bee does the orchard work of roughly 100 honeybees — which is why apple growers increasingly rent mason bee populations.' },
          { q: 'Why do squash bees matter for pumpkin farmers?', opts: ['They pollinate when honeybees can\'t', 'They eat pest beetles', 'They produce squash honey', 'They increase pumpkin size'], ans: 0, explain: 'Squash bees are specialists — the males sleep inside closed squash blossoms overnight and females forage at dawn, *before* honeybees wake. Without them, squash, pumpkin, and gourd crops would fail.' },
          // ── Subspecies ──
          { q: 'Which honeybee subspecies evolved with varroa and has the strongest hygienic behavior?', opts: ['Italian', 'Carniolan', 'Russian (Primorsky)', 'Buckfast'], ans: 2, explain: 'Russian honeybees from the Primorsky region of Far East Russia co-evolved with varroa for ~150 years, developing hygienic behaviors that disrupt mite reproduction. USDA imported them in 1997 to breed varroa-resistant stock.' },
          // ── IPM & Varroa ──
          { q: 'When is oxalic acid varroa treatment most effective?', opts: ['Summer peak', 'Late spring', 'Brood-less winter', 'Any time'], ans: 2, explain: 'Oxalic acid only kills mites ON adult bees (phoretic mites). When brood is present, ~60% of mites are hiding in capped cells. In brood-less winter, all mites are exposed and a single dribble can knock out 95%+.' },
          { q: 'Formic acid is unique among varroa treatments because it:', opts: ['Is organic', 'Penetrates wax cappings to kill mites in brood', 'Works in winter', 'Is made by bees'], ans: 1, explain: 'Formic acid vapor is the ONLY treatment that crosses wax cappings into capped brood cells, killing varroa mites while they\'re reproducing. The trade-off: temperature-sensitive (10–29°C) and some queen stress.' },
          // ── Disease ──
          { q: 'Deformed Wing Virus is transmitted by:', opts: ['Rain', 'Varroa mites feeding on pupae', 'Wind', 'Other bees'], ans: 1, explain: 'Every varroa mite that feeds on a bee pupa injects DWV. Before varroa arrived, DWV existed at harmless trace levels. Now it\'s present in virtually every colony with varroa — which is why IPM is disease control.' },
          // ── Climate / Weather ──
          { q: 'Below what air temperature can honeybees no longer fly?', opts: ['0°C (32°F)', '~10°C (50°F)', '20°C (68°F)', '25°C (77°F)'], ans: 1, explain: 'Below ~10°C, a honeybee\'s flight muscles can\'t generate enough heat to operate — she\'s grounded. A late spring frost after bloom can kill foragers caught out on warm afternoons, a leading cause of spring colony loss.' },
          // ── Pollination / Economics ──
          { q: 'Approximately how many flower visits are needed to make one pound of honey?', opts: ['~20,000', '~200,000', '~2 million', '~20 million'], ans: 2, explain: 'About 2 million flower visits, flown by roughly 556 foragers over 55,000 cumulative miles, produce a single pound of honey. One worker bee produces ~1/12 teaspoon of honey in her entire 6-week life.' }
        ];

        // ── Garden Bridge: Read pollinator plants from companion planting ──
        var gardenPollinators = 0;
        try {
          var cgData = JSON.parse(localStorage.getItem('alloflow_stemlab') || '{}');
          var cp = cgData.companionPlanting || {};
          var cg = cp.communityGarden || {};
          var cgGrid = cg.grid || [];
          cgGrid.forEach(function(cell) {
            if (cell && cell.plantId) {
              // Check known pollinator plants
              var pollinatorIds = ['marigold', 'sunflower', 'lavender', 'dill', 'nasturtium', 'clover', 'borage', 'buckwheat', 'yarrow', 'bee_hotel'];
              if (pollinatorIds.indexOf(cell.plantId) !== -1) gardenPollinators++;
            }
          });
        } catch(e) {}
        var gardenBonus = Math.min(30, gardenPollinators * 5); // up to +30% foraging from garden

        // ── Colony Events ──
        var HIVE_EVENTS = [
          { id: 'varroa_spike', emoji: '🦟', label: 'Varroa Mite Surge', desc: 'Varroa destructor mites are multiplying on developing pupae. They feed on fat body tissue and transmit deadly viruses (DWV, ABPV).', effect: { varroaLevel: 20, morale: -10 }, lesson: 'Varroa destructor arrived from Asian honeybees (Apis cerana) in the 1970s. A single mite can reduce a worker bee\'s lifespan by 50%. Integrated pest management includes drone brood trapping, oxalic acid treatment, and breeding for hygienic behavior.' },
          { id: 'swarm', emoji: '🐝', label: 'Swarming Impulse!', desc: 'The colony is crowded and wants to split! The old queen may leave with half the workers unless you add space.', effect: { workers: -3000, morale: -15 }, lesson: 'Swarming is natural reproduction at the colony level — the superorganism reproducing. Before swarming, workers raise queen cells. Scout bees find new nest sites using a democratic "house-hunting" process (studied by Thomas Seeley at Cornell). A beekeeper can prevent swarming by adding supers (more space) or splitting the hive.' },
          { id: 'nectar_flow', emoji: '🌸', label: 'Nectar Flow!', desc: 'Wildflowers are blooming abundantly! Foragers return heavy with nectar.', effect: { honey: 8, pollen: 5, morale: 15, foragingEfficiency: 10 }, lesson: 'During a strong nectar flow, a colony can gain 5-10 lbs per day. Forager bees perform waggle dances that communicate the distance (duration of waggle run) and direction (angle relative to sun) of nectar sources. Karl von Frisch won the 1973 Nobel Prize for decoding this dance language.' },
          { id: 'pesticide_drift', emoji: '☠️', label: 'Pesticide Drift', desc: 'Nearby agricultural spraying has contaminated foraging areas. Workers are returning disoriented or dying.', effect: { workers: -2000, foragingEfficiency: -20, morale: -20 }, lesson: 'Neonicotinoid pesticides (imidacloprid, clothianidin) are systemic — they spread through the entire plant, including pollen and nectar. Sub-lethal doses impair bee navigation, memory, and learning. Colony Collapse Disorder (CCD) is linked to a combination of pesticides, varroa mites, habitat loss, and nutritional stress.' },
          { id: 'bear_visit', emoji: '🐻', label: 'Bear Sighting!', desc: 'A black bear has been spotted near the apiary, attracted by the smell of honey.', effect: { honey: -10, wax: -3, morale: -10 }, lesson: 'Bears are the most destructive large predators of honeybee colonies. They seek both honey and protein-rich brood. Electric fencing is the most effective deterrent. Interestingly, bears seem immune to bee stings on their faces due to thick fur, so bees target the nose and eyes.' },
          { id: 'good_queen', emoji: '👑', label: 'Queen Laying Strongly', desc: 'The queen is healthy and laying up to 2,000 eggs per day — her own body weight in eggs!', effect: { brood: 2000, queenHealth: 10, morale: 10 }, lesson: 'A queen bee mates once in her life during a "nuptial flight" with 10-20 drones at 200+ feet altitude. She stores millions of sperm and can lay fertilized (worker/queen) or unfertilized (drone) eggs at will. She produces pheromones (Queen Mandibular Pheromone) that maintain colony cohesion and suppress worker reproduction.' },
          { id: 'robbing', emoji: '⚔️', label: 'Robbing Attempt', desc: 'A weaker nearby colony is trying to steal your honey stores! Guard bees are fighting at the entrance.', effect: { honey: -5, workers: -500, morale: -5 }, lesson: 'Robbing behavior occurs when nectar is scarce (dearth). Bees from other colonies probe for weak hive defenses. Guard bees identify intruders by colony-specific pheromone signatures. Reducing the entrance size during dearth periods helps guards defend more effectively.' },
          // ── Weather / climate events ──
          { id: 'heatwave', emoji: '🔥', label: 'Heatwave', desc: 'Outside temperatures have spiked past 100°F (38°C). Water foragers are working overtime to cool the hive.', effect: { workers: -800, honey: -3, foragingEfficiency: -10, morale: -8 }, weather: true, lesson: 'Honeybees maintain the brood nest at exactly 35°C even when outside air exceeds 40°C. Water foragers collect droplets and spread them on comb while fanner bees beat wings at 230/sec to evaporate the water — a physiological air conditioner. Climate change is lengthening heatwaves; colonies near water sources survive better.' },
          { id: 'drought', emoji: '🏜️', label: 'Drought', desc: 'Prolonged dry weather has wilted flowers across the foraging range. Nectar flow has collapsed.', effect: { foragingEfficiency: -25, honey: -4, pollen: -2, morale: -10 }, weather: true, lesson: 'During drought, plants close stomata and stop producing nectar to conserve water. Foragers return empty-handed and may resort to robbing other colonies. Drought-resistant native plants (goldenrod, sunflower, sage, coneflower) are a bee lifeline. Providing shallow water with pebble landing zones saves lives.' },
          { id: 'late_frost', emoji: '🥶', label: 'Late Spring Frost', desc: 'A sudden overnight frost has killed early blossoms and trapped foragers caught outside.', effect: { workers: -1500, foragingEfficiency: -15, honey: -2, morale: -12 }, weather: true, lesson: 'Honeybees cannot fly below ~10°C (50°F) — their flight muscles seize. A late frost after bloom kills flowers AND foragers who cannot make it home. Climate instability is increasing frost-after-bloom events, a leading cause of spring colony loss. Fruit growers rely on honeybee pollination within tight bloom windows.' },
          { id: 'flood', emoji: '🌊', label: 'Heavy Rain / Flood', desc: 'Days of heavy rain have waterlogged the ground and grounded all foragers. Moisture is seeping into the hive.', effect: { foragingEfficiency: -20, honey: -3, morale: -8, diseaseRisk: 10 }, weather: true, lesson: 'Bees cannot fly in rain — their wings are too thin and droplets hit with hurricane force at their scale. Prolonged wet weather means no income, rising humidity inside the hive, and bacterial/fungal disease risk (Nosema, chalkbrood). Elevated hive stands and good ventilation are critical. Flash floods can destroy ground-nesting native bees entirely.' }
        ];

        // ── Disease events (only fire when diseaseRisk is elevated) ──
        var DISEASE_EVENTS = [
          { id: 'nosema', emoji: '🦠', label: 'Nosema Infection', desc: 'Workers are showing signs of Nosema — soiled comb, reduced longevity, and sluggish foraging. This single-cell gut parasite weakens bees from the inside.',
            effect: { workers: -1200, foragingEfficiency: -12, morale: -8, diseaseRisk: -15 }, disease: true,
            lesson: 'Nosema ceranae and N. apis are microsporidian fungal parasites infecting adult honeybee midguts. Infected bees live half as long and cannot process pollen efficiently. Prevention: good ventilation, dry apiary sites, clean water, and avoiding stress. Fumagillin was once used but is now restricted in many countries. Probiotic research and breeding for resistance are the modern front lines.' },
          { id: 'chalkbrood', emoji: '🫧', label: 'Chalkbrood Outbreak', desc: 'Mummified chalk-white larvae are appearing on the landing board. The fungus Ascosphaera apis has taken hold in damp comb.',
            effect: { brood: -2000, workers: -300, morale: -10, diseaseRisk: -20 }, disease: true,
            lesson: 'Chalkbrood is a fungal disease killing bee larvae — they turn hard, white, and chalky. Worst in cool wet springs. Good hygiene (requeen with hygienic stock, improve ventilation, move to a sunnier site) usually resolves it. Severe cases require replacing frames. Never feed contaminated honey to other colonies.' },
          { id: 'dwv', emoji: '🪰', label: 'Deformed Wing Virus', desc: 'Workers are emerging with shriveled, useless wings — classic signs of DWV. This virus is transmitted by varroa mites and is the #1 driver of colony collapse worldwide.',
            effect: { workers: -1800, foragingEfficiency: -10, morale: -12, diseaseRisk: -10 }, disease: true,
            lesson: 'Deformed Wing Virus (DWV) is carried by every varroa mite that feeds on a pupa. Before varroa arrived, DWV existed at harmless trace levels. Now it\'s an epidemic — DWV is present in virtually all colonies where varroa are established. The ONLY way to control DWV is to aggressively control varroa. This is why IPM matters so much.' }
        ];

        // ── Gameplay Systems ──
        var year = Math.floor(day / 120) + 1;
        var totalHoney = d.totalHoney || 0;
        var colonySurvived = d.colonySurvived !== false; // false = colony collapsed
        var actionPoints = typeof d.actionPoints === 'number' ? d.actionPoints : 3; // limited actions per day
        var habitat = d.habitat || 50; // 0-100 — local habitat health (flowers, nesting sites, clean water)
        var pesticideExposure = d.pesticideExposure || 0; // cumulative exposure level
        var seasonGoals = d.seasonGoals || null;

        // Seasonal goals — what the student should aim for each season
        var SEASON_GOALS = [
          { season: 'Spring', goals: ['Build workforce to 20,000+ workers', 'Keep varroa below 15%', 'Ensure 30+ lbs honey stores'], emoji: '🌱' },
          { season: 'Summer', goals: ['Harvest surplus honey (keep 15+ lbs)', 'Prevent swarming (add supers)', 'Maximize foraging (plant garden!)'], emoji: '☀️' },
          { season: 'Autumn', goals: ['Build 40+ lbs winter honey stores', 'Treat varroa before winter', 'Ensure queen health above 70%'], emoji: '🍂' },
          { season: 'Winter', goals: ['Colony survives with 10,000+ workers', 'Honey doesn\'t drop below 10 lbs', 'Plan habitat improvements'], emoji: '❄️' }
        ];

        // ── Conservation Actions (cost action points) ──
        var CONSERVATION_ACTIONS = [
          { id: 'plant_wildflowers', emoji: '🌸', label: 'Plant Wildflowers', cost: 2, desc: 'Sow native wildflower mix in nearby field', effect: { habitat: 10, foragingEfficiency: 5 }, lesson: 'Habitat loss is the #1 threat to native pollinators. A single wildflower patch can support 50+ pollinator species. Native flowers provide 4× more nectar than ornamental varieties.' },
          { id: 'reduce_mowing', emoji: '🌿', label: 'Reduce Lawn Mowing', cost: 1, desc: 'Let clover and dandelions bloom in the lawn', effect: { habitat: 5, foragingEfficiency: 3 }, lesson: '"No Mow May" lets early spring flowers bloom when bees are hungriest after winter. Dandelions are a critical early nectar source — not a weed, but a bee lifeline.' },
          { id: 'water_station', emoji: '💧', label: 'Set Up Bee Waterer', cost: 1, desc: 'Place shallow water dishes with pebbles for landing', effect: { habitat: 5, morale: 5 }, lesson: 'Bees need water for cooling the hive and diluting honey to feed larvae. They prefer shallow water with landing spots. A simple plate with pebbles and water saves bee lives.' },
          { id: 'ban_pesticides', emoji: '🚫', label: 'Advocate No-Spray Zone', cost: 3, desc: 'Convince neighbors to stop using neonicotinoids', effect: { pesticideExposure: -20, habitat: 8 }, lesson: 'Neonicotinoids (imidacloprid, clothianidin, thiamethoxam) are systemic — they spread through the ENTIRE plant including pollen and nectar. Sub-lethal doses impair bee memory, navigation, and immune function. The EU banned 3 neonicotinoids in 2018. You can advocate for pesticide-free zones in your community.' },
          { id: 'build_hotel', emoji: '🏨', label: 'Build Solitary Bee Hotel', cost: 2, desc: 'Create nesting habitat for mason bees and leafcutters', effect: { habitat: 8 }, lesson: 'Of 20,000+ bee species worldwide, only 7 make honey. Most are solitary — each female builds her own nest. Bee hotels with hollow stems and drilled wood blocks provide nesting sites. Mason bees are 100× more efficient pollinators than honeybees per individual!' },
          { id: 'report_ccd', emoji: '📊', label: 'Report Colony Data', cost: 1, desc: 'Submit health data to the Bee Informed Partnership', effect: { score: 50 }, lesson: 'The Bee Informed Partnership (beeinformed.org) tracks colony losses across North America. Citizen science data from beekeepers helps researchers understand why 30-50% of colonies are lost annually. Your observations matter — science needs YOUR data.' }
        ];

        // Colony collapse check — defer state update out of render body
        if (workers < 500 && day > 30 && colonySurvived) {
          colonySurvived = false;
          setTimeout(function() { updAll({ colonySurvived: false }); }, 0);
        }

        // ── Beekeeper's Journal generator (auto-narrative per day) ──
        // ctx: { day, season, workers, honey, varroa, brood, morale, queenHealth, event, subspeciesEmoji }
        function generateJournalEntry(ctx) {
          var seasonOpeners = [
            ['Spring sun.', 'Crocus bloom.', 'Willow pollen on every forager.', 'Dandelions opened today.', 'First apple blossoms.'],
            ['Hot afternoon.', 'Heavy clover flow.', 'Cicadas buzzing.', 'Bees bearding at the entrance.', 'Linden perfume.'],
            ['Cool morning.', 'Goldenrod coming in.', 'Aster season.', 'First hard frost forecast.', 'Bees evicting drones.'],
            ['Snow outside.', 'Silent apiary.', 'Cluster tight at the core.', 'A few bees on cleansing flights.', 'Winter hush.']
          ];
          var honeyLines = ctx.honey > 50 ? ['Supers are heavy.', 'Honey stores overflowing.']
            : ctx.honey > 20 ? ['Stores steady.', 'Honey coming in.']
            : ctx.honey > 8 ? ['Watching stores closely.', 'Cells emptying faster than filling.']
            : ['Pantry nearly bare.', 'Starvation risk rising.'];
          var varroaLines = ctx.varroa > 35 ? ['Varroa visible on landing board — serious load.']
            : ctx.varroa > 20 ? ['Mite drop elevated.', 'Time to consider treatment.']
            : ctx.varroa > 10 ? ['Mites present but manageable.']
            : [];
          var workerLines = ctx.workers > 30000 ? ['Colony explosive — might swarm if crowded.']
            : ctx.workers > 15000 ? ['Workforce strong.']
            : ctx.workers > 5000 ? ['Moderate workforce.']
            : ctx.workers > 1500 ? ['Population dwindling — concerning.']
            : ['Dangerously few bees left.'];
          var queenLines = ctx.queenHealth > 85 ? ['Queen laying in tight pattern — gold-star mother.']
            : ctx.queenHealth > 50 ? []
            : ctx.queenHealth > 25 ? ['Queen laying spotty. Watch for supersedure cells.']
            : ['Queen failing — workers may raise a new one.'];
          var moraleLines = ctx.morale < 30 ? ['The hive hums low and anxious.'] : [];
          // Stable "random" pick from arrays (seeded by day for consistency)
          function pick(arr, seed) { return arr.length === 0 ? '' : arr[Math.abs((ctx.day * 7 + seed) | 0) % arr.length]; }
          var parts = [];
          var opener = pick(seasonOpeners[ctx.season] || [], 1);
          if (opener) parts.push(opener);
          var hLine = pick(honeyLines, 2); if (hLine) parts.push(hLine);
          var vLine = pick(varroaLines, 3); if (vLine) parts.push(vLine);
          var wLine = pick(workerLines, 4); if (wLine) parts.push(wLine);
          var qLine = pick(queenLines, 5); if (qLine) parts.push(qLine);
          var mLine = pick(moraleLines, 6); if (mLine) parts.push(mLine);
          var eventNote = ctx.event ? ' ' + ctx.event.emoji + ' ' + ctx.event.label + ' recorded today.' : '';
          return { day: ctx.day, season: ctx.season, text: parts.join(' ') + eventNote, emoji: ctx.subspeciesEmoji || '🐝' };
        }

        // ── Markdown Colony Report builder (for Export) ──
        function buildColonyReport() {
          var lines = [];
          var dt = new Date();
          var dateStamp = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
          lines.push('# 🐝 Beehive Colony Report');
          lines.push('*Generated ' + dateStamp + ' — Beehive Simulator · AlloFlow STEM Lab*');
          lines.push('');
          lines.push('## Overview');
          lines.push('- **Subspecies:** ' + activeSubspecies.emoji + ' ' + activeSubspecies.name + ' (*' + activeSubspecies.sci + '*) from ' + activeSubspecies.origin);
          lines.push('- **Apiary site:** ' + activeSite.emoji + ' ' + activeSite.name);
          lines.push('- **Day:** ' + day + ' · **Year:** ' + year + ' · **Season:** ' + seasonNames[season]);
          lines.push('- **Colony Health:** ' + colonyHealth + ' — ' + colonyRating.replace(/[^\w\s]/g, '').trim());
          lines.push('- **Status:** ' + (colonySurvived ? 'alive' : 'collapsed'));
          lines.push('');
          lines.push('## Current State');
          lines.push('| Metric | Value |');
          lines.push('|---|---|');
          lines.push('| Workers | ' + workers.toLocaleString() + ' |');
          lines.push('| Brood | ' + brood.toLocaleString() + ' |');
          lines.push('| Drones | ' + drones.toLocaleString() + ' |');
          lines.push('| Queen health | ' + queenHealth + '% |');
          lines.push('| Honey stores | ' + honey + ' lbs |');
          lines.push('| Pollen stores | ' + pollen + ' lbs |');
          lines.push('| Varroa mites | ' + varroaLevel + '% |');
          lines.push('| Disease risk | ' + diseaseRisk + '% |');
          lines.push('| Morale | ' + morale + '% |');
          lines.push('| Habitat quality | ' + habitat + '% |');
          lines.push('| Pesticide exposure | ' + pesticideExposure + '% |');
          lines.push('');
          lines.push('## Lifetime Totals');
          lines.push('- **Total honey produced:** ' + (Math.round((d.totalHoney || 0) * 10) / 10) + ' lbs');
          lines.push('- **Honey harvested:** ' + (Math.round((d.totalHarvested || 0) * 10) / 10) + ' lbs');
          lines.push('- **Flower visits:** ' + ((d.totalFlowerVisits || 0).toLocaleString()) + ' → ~' + (Math.round((d.totalFlowerVisits || 0) / 2000000 * 10) / 10) + ' apple-trees worth of pollination');
          lines.push('- **Events handled:** ' + (d.eventsHandled || 0));
          lines.push('- **Varroa treatments:** ' + (d.varroaTreats || 0));
          lines.push('- **Hygiene actions:** ' + (d.hygieneActions || 0));
          lines.push('- **Conservation actions:** ' + (d.conservationsDone || 0));
          lines.push('- **Best quiz score:** ' + (d.bestQuizScore || 0) + '/10');
          lines.push('');
          // Honey varietals
          var vKeys = Object.keys(d.varietals || {});
          if (vKeys.length > 0) {
            lines.push('## 🍯 Honey Varietals Pantry (' + vKeys.length + ')');
            vKeys.forEach(function(vid) {
              var v = d.varietals[vid];
              lines.push('- ' + v.emoji + ' **' + v.name + '** — ' + v.lbs + ' lbs (' + (v.jars || 0) + ' jars)');
            });
            lines.push('');
          }
          // Badges earned
          var earnedBadges = BADGE_DEFS.filter(function(bd) { return newBadges[bd.id]; });
          if (earnedBadges.length > 0) {
            lines.push('## 🏅 Badges Earned (' + earnedBadges.length + '/' + BADGE_DEFS.length + ')');
            earnedBadges.forEach(function(bd) {
              lines.push('- ' + bd.icon + ' **' + bd.label + '** — ' + bd.desc);
            });
            lines.push('');
          }
          // IPM treatment history
          var tKeys = Object.keys(d.treatmentsUsed || {});
          if (tKeys.length > 0) {
            lines.push('## 🧪 Varroa Treatment Log');
            tKeys.forEach(function(tid) {
              var count = d.treatmentsUsed[tid];
              var t = null;
              for (var i = 0; i < IPM_TREATMENTS.length; i++) if (IPM_TREATMENTS[i].id === tid) t = IPM_TREATMENTS[i];
              if (t) lines.push('- ' + t.emoji + ' **' + t.label + '** — used ' + count + '×');
            });
            lines.push('');
          }
          // Journal excerpts (last 10)
          if ((d.journal || []).length > 0) {
            lines.push('## 📔 Journal (last ' + Math.min(10, d.journal.length) + ' entries)');
            d.journal.slice(-10).forEach(function(je) {
              lines.push('- **Day ' + je.day + ':** ' + je.text);
            });
            lines.push('');
          }
          lines.push('---');
          lines.push('*Beehive Colony Simulator teaches real bee science — varroa IPM, pheromone communication, waggle dance, pollination economics. Built for AlloFlow.*');
          return lines.join('\n');
        }

        function exportColonyReport() {
          var report = buildColonyReport();
          if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(report).then(function() {
              if (addToast) addToast('📋 Colony report copied to clipboard! Paste into a doc to share.', 'success');
              if (awardStemXP) awardStemXP('beehive', 10, 'Exported colony report');
            }, function() {
              upd('exportedReport', report);
            });
          } else {
            upd('exportedReport', report);
          }
        }

        // ── Advance Day ──
        function advanceDay() {
          if (!colonySurvived) return;
          if (actionPoints <= 0) { if (addToast) addToast('No action points left today. Advance to next day first.', 'info'); return; }
          playSfx(sfxDayChime);
          var sf = [
            { broodRate: 1.2, forageMult: 0.8, consumeRate: 0.8 },  // spring — building up
            { broodRate: 1.5, forageMult: 1.3, consumeRate: 1.2 },  // summer — peak
            { broodRate: 0.5, forageMult: 0.6, consumeRate: 0.9 },  // autumn — winding down
            { broodRate: 0.0, forageMult: 0.0, consumeRate: 0.6 }   // winter — cluster
          ][season];

          // Foraging (workers collect nectar/pollen) — subspecies + apiary-site forage trait modify yield
          var foragers = Math.round(workers * SIMULATION_PARAMS.foragerRatio);
          var efficiency = (foragingEfficiency + gardenBonus) / 100;
          var nectarCollected = foragers * SIMULATION_PARAMS.nectarPerForager * sf.forageMult * efficiency * activeSubspecies.mods.honey * activeSite.mods.forage; // lbs
          var pollenCollected = foragers * SIMULATION_PARAMS.pollenPerForager * sf.forageMult * efficiency * activeSite.mods.forage;

          // Consumption
          var honeyConsumed = workers * SIMULATION_PARAMS.honeyConsumePerWorker * sf.consumeRate;
          var pollenConsumed = (brood * SIMULATION_PARAMS.pollenConsumePerBrood + workers * SIMULATION_PARAMS.pollenConsumePerWorker) * sf.consumeRate;

          // Brood development — subspecies spring trait accelerates buildup in spring
          var subspeciesBroodMod = season === 0 ? activeSubspecies.mods.spring : 1.0;
          var newBrood = Math.round(queenHealth / 100 * SIMULATION_PARAMS.baseBroodPerDay * sf.broodRate * subspeciesBroodMod);
          var emergingWorkers = Math.round(brood * SIMULATION_PARAMS.broodEmergeRate);
          // Subspecies winter-hardiness trait reduces mortality in winter
          var winterMortalityMod = season === 3 ? (1 / activeSubspecies.mods.winter) : 1.0;
          var dyingWorkers = Math.round(workers * SIMULATION_PARAMS.baseWorkerMortality * winterMortalityMod * (1 + varroaLevel / SIMULATION_PARAMS.varroaMortalityDivisor)); // natural + varroa mortality
          var dyingDrones = season === 2 ? Math.round(drones * SIMULATION_PARAMS.droneEvictionRate) : Math.round(drones * SIMULATION_PARAMS.droneBaseMortality);

          // Varroa growth — subspecies varroa trait slows mite reproduction (Russian/Saskatraz have hygienic behavior)
          var varroaGrowth = brood > 0 ? SIMULATION_PARAMS.varroaGrowthBase * (1 + brood / SIMULATION_PARAMS.varroaGrowthPerBrood) * activeSubspecies.mods.varroa : SIMULATION_PARAMS.varroaDecayNoBrood;
          var newVarroa = Math.max(0, Math.min(100, varroaLevel + varroaGrowth));

          // Pesticide damage (cumulative — the real danger)
          if (pesticideExposure > 20) {
            dyingWorkers += Math.round(workers * pesticideExposure / SIMULATION_PARAMS.pesticideChronicDivisor);
            newVarroa = Math.min(100, newVarroa + SIMULATION_PARAMS.pesticideVarroaBoost);
          }
          // Habitat affects foraging quality
          if (habitat > SIMULATION_PARAMS.habitatBoostThreshold) { nectarCollected *= SIMULATION_PARAMS.habitatBoostMult; pollenCollected *= SIMULATION_PARAMS.habitatBoostMult; }
          else if (habitat < SIMULATION_PARAMS.habitatPenaltyThreshold) { nectarCollected *= SIMULATION_PARAMS.habitatPenaltyMult; pollenCollected *= SIMULATION_PARAMS.habitatPenaltyMult; }

          // Morale
          var moraleDelta = 0;
          if (honey > 30) moraleDelta += 2;
          if (honey < 10) moraleDelta -= 5;
          if (varroaLevel > 30) moraleDelta -= 3;
          if (queenHealth > 80) moraleDelta += 1;
          if (gardenBonus > 15) moraleDelta += 2;
          if (habitat > 60) moraleDelta += 1;
          if (pesticideExposure > 30) moraleDelta -= 4;
          var newMorale = Math.max(0, Math.min(100, morale + moraleDelta));

          var newWorkers = Math.max(0, workers + emergingWorkers - dyingWorkers);
          var newBroodCount = Math.max(0, brood + newBrood - emergingWorkers);
          var newDrones = Math.max(0, drones + (season < 2 ? Math.round(newBrood * SIMULATION_PARAMS.droneBirthRate) : 0) - dyingDrones);
          var newHoney = Math.max(0, honey + nectarCollected - honeyConsumed);
          var newPollen = Math.max(0, pollen + pollenCollected - pollenConsumed);
          var newWax = wax;
          var newForagingEff = foragingEfficiency;
          var newQueenHealth = queenHealth;

          // Disease risk — grows from crowding, high varroa, wet weather; decays in clean conditions
          var diseaseDelta = 0;
          if (varroaLevel > 25) diseaseDelta += 0.8;
          if (workers > 35000) diseaseDelta += 0.4;          // crowding
          if (habitat < 30) diseaseDelta += 0.4;              // poor sanitation/habitat
          if (pesticideExposure > 30) diseaseDelta += 0.3;    // immune suppression
          if (morale < 30) diseaseDelta += 0.3;
          if (habitat > 70 && varroaLevel < 15) diseaseDelta -= 0.6; // clean colony recovers
          if (season === 3) diseaseDelta -= 0.3;              // cold kills pathogens
          diseaseDelta *= activeSite.mods.disease;
          var newDiseaseRisk = Math.max(0, Math.min(100, (d.diseaseRisk || 0) + diseaseDelta));

          // Random events — disease events gated by risk threshold
          var newEvent = activeEvent;
          if (!activeEvent && day > 3) {
            if (newDiseaseRisk > 45 && Math.random() < 0.12) {
              // Disease event
              var dEv = DISEASE_EVENTS[Math.floor(Math.random() * DISEASE_EVENTS.length)];
              newEvent = dEv;
              playSfx(sfxAlert);
              if (dEv.effect) {
                if (dEv.effect.workers) newWorkers = Math.max(0, newWorkers + dEv.effect.workers);
                if (dEv.effect.brood) newBroodCount = Math.max(0, newBroodCount + dEv.effect.brood);
                if (dEv.effect.morale) newMorale = Math.max(0, Math.min(100, newMorale + dEv.effect.morale));
                if (dEv.effect.foragingEfficiency) newForagingEff = Math.max(0, Math.min(100, newForagingEff + dEv.effect.foragingEfficiency));
                if (dEv.effect.diseaseRisk) newDiseaseRisk = Math.max(0, Math.min(100, newDiseaseRisk + dEv.effect.diseaseRisk));
              }
            }
          }
          if (!newEvent && !activeEvent && day > 3 && Math.random() < SIMULATION_PARAMS.randomEventChance) {
            var ev = HIVE_EVENTS[Math.floor(Math.random() * HIVE_EVENTS.length)];
            newEvent = ev;
            playSfx(sfxAlert);
            // Apply effects
            if (ev.effect) {
              if (ev.effect.varroaLevel) newVarroa = Math.max(0, Math.min(100, newVarroa + ev.effect.varroaLevel));
              if (ev.effect.workers) newWorkers = Math.max(0, newWorkers + ev.effect.workers);
              if (ev.effect.brood) newBroodCount = Math.max(0, newBroodCount + ev.effect.brood);
              if (ev.effect.honey) newHoney = Math.max(0, newHoney + ev.effect.honey);
              if (ev.effect.pollen) newPollen = Math.max(0, newPollen + ev.effect.pollen);
              if (ev.effect.wax) newWax = Math.max(0, newWax + ev.effect.wax);
              if (ev.effect.morale) newMorale = Math.max(0, Math.min(100, newMorale + ev.effect.morale));
              if (ev.effect.foragingEfficiency) newForagingEff = Math.max(0, Math.min(100, newForagingEff + ev.effect.foragingEfficiency));
              if (ev.effect.queenHealth) newQueenHealth = Math.max(0, Math.min(100, newQueenHealth + ev.effect.queenHealth));
              if (ev.effect.diseaseRisk) newDiseaseRisk = Math.max(0, Math.min(100, newDiseaseRisk + ev.effect.diseaseRisk));
            }
          }

          // Pesticide natural decay (slow)
          var newPesticide = Math.max(0, pesticideExposure - SIMULATION_PARAMS.pesticideDecayPerDay);

          // Record history (keep last 120 days for sparkline)
          var newHistory = history.concat([{ d: day + 1, w: Math.round(newWorkers), h: Math.round(newHoney * 10) / 10, v: Math.round(newVarroa), m: Math.round(newMorale) }]);
          if (newHistory.length > 120) newHistory = newHistory.slice(-120);

          // Journal entry for this day (keep last 30)
          var entry = generateJournalEntry({
            day: day + 1,
            season: Math.floor(((day + 1) % 120) / 30),
            workers: Math.round(newWorkers),
            honey: Math.round(newHoney * 10) / 10,
            varroa: Math.round(newVarroa),
            brood: Math.round(newBroodCount),
            morale: Math.round(newMorale),
            queenHealth: Math.round(newQueenHealth),
            event: (newEvent && newEvent !== activeEvent) ? newEvent : null,
            subspeciesEmoji: activeSubspecies.emoji
          });
          var newJournal = (d.journal || []).concat([entry]);
          if (newJournal.length > 30) newJournal = newJournal.slice(-30);

          // Estimated flower visits today (each forager hits 50–1,000 flowers per trip, 1–2 trips/day)
          var foragersToday = Math.round(workers * SIMULATION_PARAMS.foragerRatio * sf.forageMult);
          var flowerVisits = Math.round(foragersToday * 300 * ((foragingEfficiency + gardenBonus) / 100));

          updAll({
            day: day + 1,
            workers: Math.round(newWorkers),
            brood: Math.round(newBroodCount),
            drones: Math.round(newDrones),
            honey: Math.round(newHoney * 10) / 10,
            pollen: Math.round(newPollen * 10) / 10,
            wax: Math.round(newWax * 10) / 10,
            varroaLevel: Math.round(newVarroa),
            morale: Math.round(newMorale),
            foragingEfficiency: Math.round(newForagingEff),
            queenHealth: Math.round(newQueenHealth),
            activeEvent: newEvent,
            score: score + Math.round(nectarCollected * 10),
            actionPoints: 3,
            habitat: habitat,
            pesticideExposure: Math.round(newPesticide),
            totalHoney: totalHoney + Math.max(0, nectarCollected),
            totalFlowerVisits: (d.totalFlowerVisits || 0) + flowerVisits,
            history: newHistory,
            journal: newJournal,
            diseaseRisk: Math.round(newDiseaseRisk)
          });
        }

        // ── Advance Multiple Days (pure-functional, reads from prev state) ──
        function advanceDays(n) {
          if (!colonySurvived) return;
          if (actionPoints <= 0) { if (addToast) addToast('No action points left today. Advance to next day first.', 'info'); return; }
          setLabToolData(function(prev) {
            var b = Object.assign({}, prev.beehive || {});
            for (var step = 0; step < n; step++) {
              var bDay = b.day || 0;
              var bSeason = Math.floor((bDay % 120) / 30);
              var bWorkers = typeof b.workers === 'number' ? b.workers : 10000;
              var bBrood = typeof b.brood === 'number' ? b.brood : 3000;
              var bDrones = typeof b.drones === 'number' ? b.drones : 500;
              var bQH = typeof b.queenHealth === 'number' ? b.queenHealth : 100;
              var bHoney = typeof b.honey === 'number' ? b.honey : 20;
              var bPollen = typeof b.pollen === 'number' ? b.pollen : 15;
              var bWax = typeof b.wax === 'number' ? b.wax : 5;
              var bVarroa = typeof b.varroaLevel === 'number' ? b.varroaLevel : 5;
              var bMorale = typeof b.morale === 'number' ? b.morale : 80;
              var bFE = typeof b.foragingEfficiency === 'number' ? b.foragingEfficiency : 70;
              var bHabitat = b.habitat || 50;
              var bPestExp = b.pesticideExposure || 0;
              if (bWorkers < 500 && bDay > 30) break; // colony dead

              var sf = [
                { broodRate: 1.2, forageMult: 0.8, consumeRate: 0.8 },
                { broodRate: 1.5, forageMult: 1.3, consumeRate: 1.2 },
                { broodRate: 0.5, forageMult: 0.6, consumeRate: 0.9 },
                { broodRate: 0.0, forageMult: 0.0, consumeRate: 0.6 }
              ][bSeason];
              var eff = (bFE + gardenBonus) / 100;
              var foragers = Math.round(bWorkers * SIMULATION_PARAMS.foragerRatio);
              var nectarIn = foragers * SIMULATION_PARAMS.nectarPerForager * sf.forageMult * eff * activeSubspecies.mods.honey * activeSite.mods.forage;
              var pollenIn = foragers * SIMULATION_PARAMS.pollenPerForager * sf.forageMult * eff * activeSite.mods.forage;
              var honeyOut = bWorkers * SIMULATION_PARAMS.honeyConsumePerWorker * sf.consumeRate;
              var pollenOut = (bBrood * SIMULATION_PARAMS.pollenConsumePerBrood + bWorkers * SIMULATION_PARAMS.pollenConsumePerWorker) * sf.consumeRate;
              var batchBroodMod = bSeason === 0 ? activeSubspecies.mods.spring : 1.0;
              var newBrood = Math.round(bQH / 100 * SIMULATION_PARAMS.baseBroodPerDay * sf.broodRate * batchBroodMod);
              var emerging = Math.round(bBrood * SIMULATION_PARAMS.broodEmergeRate);
              var batchWinterMod = bSeason === 3 ? (1 / activeSubspecies.mods.winter) : 1.0;
              var dying = Math.round(bWorkers * SIMULATION_PARAMS.baseWorkerMortality * batchWinterMod * (1 + bVarroa / SIMULATION_PARAMS.varroaMortalityDivisor));
              var dyingD = bSeason === 2 ? Math.round(bDrones * SIMULATION_PARAMS.droneEvictionRate) : Math.round(bDrones * SIMULATION_PARAMS.droneBaseMortality);
              var vGrow = bBrood > 0 ? SIMULATION_PARAMS.varroaGrowthBase * (1 + bBrood / SIMULATION_PARAMS.varroaGrowthPerBrood) * activeSubspecies.mods.varroa : SIMULATION_PARAMS.varroaDecayNoBrood;
              var nv = Math.max(0, Math.min(100, bVarroa + vGrow));
              if (bPestExp > 20) { dying += Math.round(bWorkers * bPestExp / SIMULATION_PARAMS.pesticideChronicDivisor); nv = Math.min(100, nv + SIMULATION_PARAMS.pesticideVarroaBoost); }
              if (bHabitat > SIMULATION_PARAMS.habitatBoostThreshold) { nectarIn *= SIMULATION_PARAMS.habitatBoostMult; pollenIn *= SIMULATION_PARAMS.habitatBoostMult; }
              else if (bHabitat < SIMULATION_PARAMS.habitatPenaltyThreshold) { nectarIn *= SIMULATION_PARAMS.habitatPenaltyMult; pollenIn *= SIMULATION_PARAMS.habitatPenaltyMult; }
              var md = 0;
              if (bHoney > 30) md += 2; if (bHoney < 10) md -= 5;
              if (bVarroa > 30) md -= 3; if (bQH > 80) md += 1;
              if (gardenBonus > 15) md += 2; if (bHabitat > 60) md += 1;
              if (bPestExp > 30) md -= 4;

              // Disease risk — batch path
              var bDiseaseRisk = typeof b.diseaseRisk === 'number' ? b.diseaseRisk : 0;
              var dDelta = 0;
              if (bVarroa > 25) dDelta += 0.8;
              if (bWorkers > 35000) dDelta += 0.4;
              if (bHabitat < 30) dDelta += 0.4;
              if (bPestExp > 30) dDelta += 0.3;
              if (bMorale < 30) dDelta += 0.3;
              if (bHabitat > 70 && bVarroa < 15) dDelta -= 0.6;
              if (bSeason === 3) dDelta -= 0.3;
              dDelta *= activeSite.mods.disease;
              bDiseaseRisk = Math.max(0, Math.min(100, bDiseaseRisk + dDelta));

              // Random event (simplified for batch — no toast/XP side effects)
              // First, possible disease event gated on risk
              if (!b.activeEvent && bDay > 3 && bDiseaseRisk > 45 && Math.random() < 0.12) {
                var dEv = DISEASE_EVENTS[Math.floor(Math.random() * DISEASE_EVENTS.length)];
                b.activeEvent = dEv;
                if (dEv.effect) {
                  if (dEv.effect.workers) bWorkers = Math.max(0, bWorkers + dEv.effect.workers);
                  if (dEv.effect.brood) bBrood = Math.max(0, bBrood + dEv.effect.brood);
                  if (dEv.effect.morale) md += dEv.effect.morale;
                  if (dEv.effect.foragingEfficiency) bFE = Math.max(0, Math.min(100, bFE + dEv.effect.foragingEfficiency));
                  if (dEv.effect.diseaseRisk) bDiseaseRisk = Math.max(0, Math.min(100, bDiseaseRisk + dEv.effect.diseaseRisk));
                }
              }
              if (!b.activeEvent && bDay > 3 && Math.random() < SIMULATION_PARAMS.randomEventChance) {
                var ev = HIVE_EVENTS[Math.floor(Math.random() * HIVE_EVENTS.length)];
                b.activeEvent = ev;
                if (ev.effect) {
                  if (ev.effect.varroaLevel) nv = Math.max(0, Math.min(100, nv + ev.effect.varroaLevel));
                  if (ev.effect.workers) bWorkers = Math.max(0, bWorkers + ev.effect.workers);
                  if (ev.effect.brood) bBrood = Math.max(0, bBrood + ev.effect.brood);
                  if (ev.effect.honey) bHoney = Math.max(0, bHoney + ev.effect.honey);
                  if (ev.effect.pollen) bPollen = Math.max(0, bPollen + ev.effect.pollen);
                  if (ev.effect.wax) bWax = Math.max(0, bWax + ev.effect.wax);
                  if (ev.effect.morale) md += ev.effect.morale;
                  if (ev.effect.foragingEfficiency) bFE = Math.max(0, Math.min(100, bFE + ev.effect.foragingEfficiency));
                  if (ev.effect.queenHealth) bQH = Math.max(0, Math.min(100, bQH + ev.effect.queenHealth));
                  if (ev.effect.diseaseRisk) bDiseaseRisk = Math.max(0, Math.min(100, bDiseaseRisk + ev.effect.diseaseRisk));
                }
              }

              b.day = bDay + 1;
              b.workers = Math.max(0, Math.round(bWorkers + emerging - dying));
              b.brood = Math.max(0, Math.round(bBrood + newBrood - emerging));
              b.drones = Math.max(0, Math.round(bDrones + (bSeason < 2 ? Math.round(newBrood * SIMULATION_PARAMS.droneBirthRate) : 0) - dyingD));
              b.honey = Math.round(Math.max(0, bHoney + nectarIn - honeyOut) * 10) / 10;
              b.pollen = Math.round(Math.max(0, bPollen + pollenIn - pollenOut) * 10) / 10;
              b.wax = Math.round(bWax * 10) / 10;
              b.varroaLevel = Math.round(nv);
              b.morale = Math.round(Math.max(0, Math.min(100, bMorale + md)));
              b.foragingEfficiency = Math.round(bFE);
              b.queenHealth = Math.round(bQH);
              b.score = (b.score || 0) + Math.round(nectarIn * 10);
              b.actionPoints = 3;
              b.pesticideExposure = Math.max(0, Math.round(bPestExp - SIMULATION_PARAMS.pesticideDecayPerDay));
              b.totalHoney = (b.totalHoney || 0) + Math.max(0, nectarIn);
              b.diseaseRisk = Math.round(bDiseaseRisk);
              // Flower visits this simulated day
              var batchForagers = Math.round(bWorkers * SIMULATION_PARAMS.foragerRatio * sf.forageMult);
              var batchVisits = Math.round(batchForagers * 300 * ((bFE + gardenBonus) / 100));
              b.totalFlowerVisits = (b.totalFlowerVisits || 0) + batchVisits;
              // Push history so batch advance keeps sparkline continuous
              var bHist = (b.history || []).concat([{ d: b.day, w: b.workers, h: b.honey, v: b.varroaLevel, m: b.morale }]);
              if (bHist.length > 120) bHist = bHist.slice(-120);
              b.history = bHist;
              // Journal entry (batch uses same generator)
              var bEntry = generateJournalEntry({
                day: b.day, season: Math.floor((b.day % 120) / 30),
                workers: b.workers, honey: b.honey, varroa: b.varroaLevel,
                brood: b.brood, morale: b.morale, queenHealth: b.queenHealth,
                event: b.activeEvent, subspeciesEmoji: activeSubspecies.emoji
              });
              var bJournal = (b.journal || []).concat([bEntry]);
              if (bJournal.length > 30) bJournal = bJournal.slice(-30);
              b.journal = bJournal;
            }
            return Object.assign({}, prev, { beehive: b });
          });
        }

        // ── Actions ──
        // Sound-gated wrappers
        function playSfx(fn) { if (soundOn) fn(); }

        // ── Integrated Pest Management (IPM) varroa treatment options ──
        var IPM_TREATMENTS = [
          { id: 'oxalic', emoji: '🧪', label: 'Oxalic Acid Dribble', baseReduction: 30, moraleCost: 3, ap: 1, bestSeason: 3,
            desc: '2.1% oxalic acid in sugar syrup, dribbled between frames. Organic acid; kills phoretic mites on contact.',
            note: 'Most effective in WINTER when there\'s no capped brood. If brood > 2,000, ~60% of mites are hiding in cells and untouchable — wait for a brood break. Legal organic treatment; leaves no residue in wax.' },
          { id: 'formic', emoji: '💨', label: 'Formic Acid Pads', baseReduction: 22, moraleCost: 6, ap: 1, bestSeason: -1,
            desc: 'Naturally occurring in ants & bees; the only treatment that penetrates wax cappings to kill mites in capped brood.',
            note: 'Temperature-sensitive: ideal 10–29°C. Above 32°C can kill queens and brood. Works year-round but risky in peak summer heat. Queen is briefly caged or may be superseded.' },
          { id: 'thymol', emoji: '🌿', label: 'Thymol (Apiguard)', baseReduction: 18, moraleCost: 2, ap: 1, bestSeason: 2,
            desc: 'Essential oil from thyme; slowly vaporizes over 4–6 weeks. Bees tolerate it well; mites cannot.',
            note: 'Needs warm weather (above 15°C) to sublime properly. Best applied in late summer / early autumn after honey harvest. Can temporarily reduce brood production.' },
          { id: 'sugar_dust', emoji: '🧂', label: 'Powdered Sugar Dusting', baseReduction: 10, moraleCost: 0, ap: 1, bestSeason: -1,
            desc: 'Dust workers with confectioner\'s sugar. Bees groom each other clean, knocking off phoretic mites through the screened bottom.',
            note: 'Mechanical, no chemicals. Harmless to bees. Only affects ~5–15% of mites (those on adult bees, not in brood). Effective as monitoring + supplemental control, not as sole treatment.' },
          { id: 'drone_trap', emoji: '🐛', label: 'Drone Brood Removal', baseReduction: 14, moraleCost: 1, ap: 2, bestSeason: 1,
            desc: 'Install drone-foundation frame; varroa prefer drone brood 8× over worker brood. Remove and destroy the capped frame.',
            note: 'Cultural (non-chemical) control. Disrupts varroa reproductive cycle. Labor-intensive (costs 2 action points). Summer-only — no drone brood in winter. Combine with acid treatments for full control.' }
        ];

        function applyTreatment(treatmentId) {
          var treatment = null;
          for (var i = 0; i < IPM_TREATMENTS.length; i++) { if (IPM_TREATMENTS[i].id === treatmentId) { treatment = IPM_TREATMENTS[i]; break; } }
          if (!treatment) return;
          if (actionPoints < treatment.ap) { if (addToast) addToast('Need ' + treatment.ap + ' action point' + (treatment.ap > 1 ? 's' : '') + ' for ' + treatment.label + '.', 'info'); return; }
          // Context modifiers — season, brood, temperature penalties
          var reduction = treatment.baseReduction;
          var moraleHit = treatment.moraleCost;
          var queenHit = 0;
          var contextNote = '';
          if (treatmentId === 'oxalic') {
            if (brood > 2000) { reduction = Math.round(reduction * 0.4); contextNote = ' (reduced — brood still sealed)'; }
            else if (season === 3) { reduction = Math.round(reduction * 1.3); contextNote = ' (brood-less winter = ideal)'; }
          } else if (treatmentId === 'formic') {
            if (season === 1) { reduction = Math.round(reduction * 0.85); queenHit = 8; moraleHit += 3; contextNote = ' (hot summer — some queen stress)'; }
            else if (season === 3) { reduction = Math.round(reduction * 0.5); contextNote = ' (too cold — acid evaporates poorly)'; }
          } else if (treatmentId === 'thymol') {
            if (season === 3 || season === 0) { reduction = Math.round(reduction * 0.4); contextNote = ' (too cold for thymol to sublime)'; }
            else if (season === 2) { contextNote = ' (autumn = textbook timing)'; }
          } else if (treatmentId === 'sugar_dust') {
            if (brood > 3000) contextNote = ' (most mites are in brood, not on bees)';
          } else if (treatmentId === 'drone_trap') {
            if (season === 3 || season === 0) { reduction = Math.round(reduction * 0.3); contextNote = ' (few drones being produced — weak effect)'; }
            else if (season === 1) { reduction = Math.round(reduction * 1.2); contextNote = ' (peak drone brood — very effective)'; }
          }
          var newVarroa = Math.max(0, varroaLevel - reduction);
          var newMorale = Math.max(0, morale - moraleHit);
          var newQueenHealth = Math.max(0, queenHealth - queenHit);
          updAll({
            varroaLevel: newVarroa,
            morale: newMorale,
            queenHealth: newQueenHealth,
            varroaTreats: (d.varroaTreats || 0) + 1,
            actionPoints: actionPoints - treatment.ap,
            treatmentsUsed: Object.assign({}, d.treatmentsUsed || {}, (function() { var o = {}; o[treatmentId] = ((d.treatmentsUsed || {})[treatmentId] || 0) + 1; return o; })()),
            showTreatModal: false
          });
          playSfx(sfxTreat);
          if (addToast) addToast(treatment.emoji + ' ' + treatment.label + ': −' + reduction + '% mites' + contextNote, 'success');
          if (awardStemXP) awardStemXP('beehive', 5 + Math.round(reduction / 5), 'Treated varroa: ' + treatment.label);
        }

        function treatVarroa() {
          // Open IPM modal instead of applying a single treatment directly
          upd('showTreatModal', true);
        }
        function addSuper() {
          updAll({ morale: Math.min(100, morale + 10), wax: wax + 2 });
          playSfx(sfxBeeBuzz); if (addToast) addToast('📦 Added a honey super — more space for the colony!', 'success');
          if (awardStemXP) awardStemXP('beehive', 5, 'Added super');
        }
        // Identify the honey varietal based on season + garden pollinators
        function identifyVarietal() {
          // Garden-dominant: if gardenPollinators >= 3, specific cultivar honey
          if (gardenPollinators >= 6) return { id: 'garden_wildflower', name: 'Garden Wildflower', emoji: '🌼', color: 'amber', note: 'A multifloral honey from a diverse pollinator garden — the richest phenolic profile and highest antioxidant content.' };
          if (season === 0) return { id: 'spring_clover', name: 'Spring Clover', emoji: '🍀', color: 'lime', note: 'Pale gold, mild and grassy. White clover (Trifolium repens) is the classic North American table honey. Dominant in April–May.' };
          if (season === 1 && gardenPollinators >= 2) return { id: 'summer_lavender', name: 'Summer Lavender', emoji: '💜', color: 'purple', note: 'Aromatic purple-tinged honey with a floral finish. Prized in Mediterranean cuisine for its gentle herbal sweetness.' };
          if (season === 1) return { id: 'wildflower', name: 'Summer Wildflower', emoji: '🌸', color: 'amber', note: 'Multifloral blend — each harvest tastes slightly different based on bloom mix within flight range. The "terroir" of honey.' };
          if (season === 2) return { id: 'buckwheat', name: 'Autumn Buckwheat', emoji: '🌾', color: 'orange', note: 'Dark, molasses-like honey with robust malty notes. Rich in iron and antioxidants. Buckwheat (Fagopyrum) blooms late summer into autumn.' };
          if (season === 3) return { id: 'stored_wildflower', name: 'Stored Wildflower', emoji: '❄️', color: 'amber', note: 'Winter harvest from stored surplus — crystallized into creamy fondant. Harvest sparingly: the colony needs these reserves.' };
          return { id: 'wildflower', name: 'Wildflower', emoji: '🌸', color: 'amber', note: 'A multifloral honey — a snapshot of whatever was blooming within flight range.' };
        }

        function harvestHoney() {
          if (honey < 15) { playSfx(sfxBeeWaggle); if (addToast) addToast('⚠️ Not enough surplus honey to harvest safely. Leave 15+ lbs for the bees.', 'info'); return; }
          var harvested = Math.round((honey - 15) * 10) / 10;
          var varietal = identifyVarietal();
          var prevVarietals = d.varietals || {};
          var newVarietals = Object.assign({}, prevVarietals);
          var existing = newVarietals[varietal.id];
          var entry = existing
            ? Object.assign({}, existing)
            : { name: varietal.name, emoji: varietal.emoji, note: varietal.note, lbs: 0, jars: 0, firstDay: day };
          entry.lbs = Math.round((entry.lbs + harvested) * 10) / 10;
          entry.jars = (entry.jars || 0) + Math.max(1, Math.round(harvested)); // ~1 lb per jar
          entry.lastDay = day;
          newVarietals[varietal.id] = entry;
          updAll({ honey: 15, score: score + Math.round(harvested * 20), totalHarvested: (d.totalHarvested || 0) + harvested, varietals: newVarietals });
          playSfx(sfxBeeCollect); if (addToast) addToast(varietal.emoji + ' Harvested ' + harvested + ' lbs of ' + varietal.name + ' honey! (+' + Math.round(harvested * 20) + ' pts)', 'success');
          if (awardStemXP) awardStemXP('beehive', 15, 'Harvested ' + varietal.name);
        }
        function feedBees() {
          updAll({ honey: honey + 5, morale: Math.min(100, morale + 5) });
          playSfx(sfxSuccess); if (addToast) addToast('🫙 Fed sugar syrup — emergency reserves replenished.', 'success');
          if (awardStemXP) awardStemXP('beehive', 3, 'Fed bees');
        }
        function dismissEvent() {
          var patch = { activeEvent: null, eventsHandled: (d.eventsHandled || 0) + 1 };
          if (activeEvent && activeEvent.weather) patch.weatherEventsHandled = (d.weatherEventsHandled || 0) + 1;
          updAll(patch);
          playSfx(sfxSuccess); if (awardStemXP) awardStemXP('beehive', 5, 'Handled event');
        }

        // ── Quiz Functions ──
        function startQuiz() {
          // Fisher-Yates shuffle, then pick 10
          var shuffled = QUIZ_QUESTIONS.slice();
          for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
          }
          shuffled = shuffled.slice(0, 10);
          updAll({ quizOpen: true, quizIdx: 0, quizScore: 0, quizAnswered: 0, quizFeedback: null, quizQuestions: shuffled });
        }
        function answerQuiz(optIdx) {
          var qs = d.quizQuestions || QUIZ_QUESTIONS;
          var current = qs[quizIdx];
          if (!current) return;
          var correct = optIdx === current.ans;
          var newScore = quizScore + (correct ? 1 : 0);
          if (correct) playSfx(sfxBeeCollect); else playSfx(sfxAlert);
          updAll({ quizFeedback: { correct: correct, explanation: current.explain }, quizScore: newScore, quizAnswered: quizAnswered + 1 });
        }
        function nextQuizQuestion() {
          var qs = d.quizQuestions || QUIZ_QUESTIONS;
          if (quizIdx + 1 >= qs.length) {
            // Quiz complete
            var best = Math.max(d.bestQuizScore || 0, quizScore);
            updAll({ quizOpen: false, quizFeedback: null, bestQuizScore: best });
            playSfx(sfxSuccess);
            if (addToast) addToast('🎓 Quiz complete! Score: ' + quizScore + '/' + (d.quizQuestions || QUIZ_QUESTIONS).length + (quizScore >= 8 ? ' — Outstanding!' : quizScore >= 5 ? ' — Good job!' : ' — Keep studying!'), 'success');
            if (awardStemXP) awardStemXP('beehive', quizScore * 3, 'Quiz score');
          } else {
            updAll({ quizIdx: quizIdx + 1, quizFeedback: null });
          }
        }

        // ── Tutorial Steps ──
        var TUTORIAL_STEPS = [
          { title: 'Welcome, Beekeeper!', text: 'You\'re managing a honeybee colony — a superorganism of 10,000 workers, a queen, and hundreds of drones. Your goal: keep the colony alive and thriving through all four seasons.', icon: '🐝' },
          { title: 'Advance Days', text: 'Click "Next Day" to simulate one day. Watch the seasonal cycle — spring builds workers, summer brings nectar, autumn prepares for winter, and winter tests your reserves.', icon: '⏩' },
          { title: 'Manage Your Hive', text: 'Use Treat, Super, Harvest, Feed, and Inspect to manage the colony. Treat varroa mites before they get above 20%. Harvest honey only when surplus exceeds 15 lbs.', icon: '🔧' },
          { title: 'Conservation Matters', text: 'Spend action points on conservation actions — plant wildflowers, build bee hotels, and advocate for pesticide-free zones. These improve habitat and foraging for all pollinators.', icon: '🌍' },
          { title: 'Explore & Learn', text: 'Open the Hive Inspector to explore bee biology across 9 layers — roles, chemistry, lifecycle, waggle dance, thermoregulation, pheromones, anatomy, native bees, and the bloom calendar. Take the quiz to test your knowledge. Earn all ' + BADGE_DEFS.length + ' badges!', icon: '🎓' }
        ];

        // ── Hive Inspection View ──
        var inspectLayer = d.inspectLayer || 'roles'; // 'roles' | 'honey_chem' | 'lifecycle' | 'waggle' | 'temperature'
        var showInspect = d.showInspect || false;

        function renderInspection() {
          var layers = [
            { id: 'roles', emoji: '👷', label: 'Bee Roles' },
            { id: 'honey_chem', emoji: '🧪', label: 'Honey Chemistry' },
            { id: 'lifecycle', emoji: '🔄', label: 'Life Cycle' },
            { id: 'waggle', emoji: '💃', label: 'Waggle Dance' },
            { id: 'temperature', emoji: '🌡️', label: 'Thermoregulation' },
            { id: 'pheromones', emoji: '💨', label: 'Pheromone Language' },
            { id: 'anatomy', emoji: '🔬', label: 'Bee Anatomy' },
            { id: 'native', emoji: '🌺', label: 'Native Bees' },
            { id: 'bloom', emoji: '📅', label: 'Bloom Calendar' }
          ];

          // Worker age distribution (simplified model)
          var nurseCount = Math.round(workers * 0.25);
          var builderCount = Math.round(workers * 0.15);
          var guardCount = Math.round(workers * 0.05);
          var foragerCount = Math.round(workers * 0.40);
          var scoutCount = Math.round(workers * 0.05);
          var undertakerCount = Math.round(workers * 0.05);
          var fannerCount = Math.round(workers * 0.05);

          return h('div', { className: 'bg-gradient-to-b from-amber-900 to-amber-950 rounded-xl border-2 border-amber-400 p-4 space-y-3 text-white' },
            h('div', { className: 'flex items-center justify-between' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl' }, '🔍'),
                h('div', null,
                  h('div', { className: 'font-bold text-sm' }, 'Hive Inspector'),
                  h('div', { className: 'text-[11px] text-amber-300' }, 'Inside the superorganism'))),
              h('button', { onClick: function() { upd('showInspect', false); }, 'aria-label': 'Return to colony view', className: 'px-3 py-1.5 bg-amber-800 hover:bg-amber-700 rounded-lg text-xs font-bold' }, '← Colony View')),
            // Layer tabs — proper ARIA tablist with keyboard navigation
            h('div', { className: 'flex gap-1 flex-wrap', role: 'tablist', 'aria-label': 'Hive inspection layers' },
              (function() {
                function selectLayer(layerId) {
                  var viewed = (d.layersViewed || []).slice();
                  if (viewed.indexOf(layerId) === -1) viewed.push(layerId);
                  updAll({ inspectLayer: layerId, layersViewed: viewed });
                }
                return layers.map(function(l, li) {
                var active = inspectLayer === l.id;
                return h('button', { key: l.id, role: 'tab', 'aria-selected': active ? 'true' : 'false', tabIndex: active ? 0 : -1,
                  'aria-label': l.label + ' inspection layer',
                  onClick: function() { selectLayer(l.id); },
                  onKeyDown: function(ev) {
                    var nextIdx = li;
                    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); nextIdx = (li + 1) % layers.length; }
                    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); nextIdx = (li - 1 + layers.length) % layers.length; }
                    else return;
                    selectLayer(layers[nextIdx].id);
                  },
                  className: 'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ' + (active ? 'bg-amber-700 text-white' : 'bg-amber-800/50 text-amber-300 hover:bg-amber-700/50')
                }, h('span', { 'aria-hidden': 'true' }, l.emoji), l.label);
              });
              })()),

            // ── ROLES VIEW ──
            inspectLayer === 'roles' && h('div', { className: 'space-y-2' },
              h('p', { className: 'text-xs text-amber-200' }, 'A worker bee changes jobs as she ages. This "temporal polyethism" means the colony always has the right workers for every task:'),
              [
                { role: 'Nurse Bees', age: 'Days 1-12', emoji: '🍼', count: nurseCount, pct: 25, desc: 'Feed larvae 1,300+ times per day with royal jelly (from hypopharyngeal glands) and bee bread (pollen + honey + enzymes). Future queens get royal jelly exclusively.', color: 'bg-pink-500' },
                { role: 'Wax Builders', age: 'Days 12-18', emoji: '🏗️', count: builderCount, pct: 15, desc: 'Secrete beeswax from 8 abdominal glands. Wax flakes are chewed and shaped into hexagonal cells — the most space-efficient structure in nature (proven by the "honeycomb conjecture" in mathematics).', color: 'bg-yellow-500' },
                { role: 'Guard Bees', age: 'Days 18-21', emoji: '🛡️', count: guardCount, pct: 5, desc: 'Station at the entrance and inspect every bee by antennating (touching antennae to read chemical ID). Each colony has a unique pheromone signature. Intruders are stung or wrestled out.', color: 'bg-red-500' },
                { role: 'Foragers', age: 'Days 21-42', emoji: '🌸', count: foragerCount, pct: 40, desc: 'Fly up to 5 miles round-trip, visiting 50-1,000 flowers per trip. They carry nectar in their honey stomach (a separate organ) and pollen in corbiculae (leg baskets). A forager makes 1/12 of a teaspoon of honey in her lifetime.', color: 'bg-green-500' },
                { role: 'Scouts', age: 'Experienced', emoji: '🗺️', count: scoutCount, pct: 5, desc: 'The boldest foragers become scouts — exploring new territory for nectar sources or nest sites. They perform waggle dances to report their findings. During swarming, scouts use a democratic "quorum sensing" process to choose a new home.', color: 'bg-blue-500' },
                { role: 'Undertakers', age: 'Specialized', emoji: '⚰️', count: undertakerCount, pct: 5, desc: 'Remove dead bees and diseased brood from the hive — critical hygiene behavior. Colonies bred for high "hygienic behavior" are more resistant to varroa and disease.', color: 'bg-slate-500' },
                { role: 'Fanners', age: 'As needed', emoji: '💨', count: fannerCount, pct: 5, desc: 'Stand at the entrance and fan their wings at 230 beats/second to control temperature and humidity. They also fan Nasonov pheromone (lemon-scented) to guide lost bees home.', color: 'bg-cyan-500' }
              ].map(function(r) {
                return h('div', { key: r.role, className: 'bg-amber-900/40 rounded-lg p-2 border border-amber-700/30' },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, r.emoji),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-xs font-bold text-amber-200' }, r.role),
                        h('span', { className: 'text-[11px] text-amber-400' }, r.age),
                        h('span', { className: 'text-[11px] text-amber-500 ml-auto' }, fmtPop(r.count) + ' (' + r.pct + '%)')))),
                  h('div', { className: 'h-1.5 bg-amber-900 rounded-full overflow-hidden mb-1' },
                    h('div', { style: { width: r.pct + '%' }, className: 'h-full ' + r.color + ' rounded-full' })),
                  h('p', { className: 'text-[11px] text-amber-100/70 leading-relaxed' }, r.desc));
              })),

            // ── HONEY CHEMISTRY VIEW ──
            inspectLayer === 'honey_chem' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🧪 Nectar → Honey: The Chemistry'),
                h('div', { className: 'space-y-2 text-[11px] text-amber-100/80' },
                  h('div', { className: 'bg-amber-800/30 rounded p-2 text-center' },
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Step 1: Collection'),
                    h('p', null, 'Forager sucks nectar (80% water, 20% sucrose) into her honey stomach — a separate organ from her digestive stomach, with a valve (proventriculus) between them.')),
                  h('div', { className: 'text-center text-amber-500' }, '↓'),
                  h('div', { className: 'bg-amber-800/30 rounded p-2 text-center' },
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Step 2: Enzymatic Processing'),
                    h('p', null, 'Bee adds invertase enzyme, which breaks sucrose into glucose + fructose:'),
                    h('p', { className: 'font-mono text-amber-400 my-1' }, 'C₁₂H₂₂O₁₁ + H₂O → C₆H₁₂O₆ + C₆H₁₂O₆'),
                    h('p', null, '(sucrose + water → glucose + fructose)'),
                    h('p', null, 'Also adds glucose oxidase: glucose + O₂ → gluconic acid + H₂O₂. The hydrogen peroxide is why honey is antimicrobial!')),
                  h('div', { className: 'text-center text-amber-500' }, '↓'),
                  h('div', { className: 'bg-amber-800/30 rounded p-2 text-center' },
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Step 3: Mouth-to-Mouth Transfer'),
                    h('p', null, 'House bees receive the nectar and pass it mouth-to-mouth (trophallaxis), adding more enzymes each transfer. This social processing is unique to honeybees.')),
                  h('div', { className: 'text-center text-amber-500' }, '↓'),
                  h('div', { className: 'bg-amber-800/30 rounded p-2 text-center' },
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Step 4: Evaporative Concentration'),
                    h('p', null, 'Bees spread thin film on cell walls and fan wings (230 beats/sec) to evaporate water. Moisture drops from 80% → 18%. Takes 1-3 days.')),
                  h('div', { className: 'text-center text-amber-500' }, '↓'),
                  h('div', { className: 'bg-amber-800/30 rounded p-2 text-center' },
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Step 5: Capping'),
                    h('p', null, 'Below 18.6% moisture, the honey is stable. Bees seal the cell with a wax cap. This honey will NEVER spoil — edible honey has been found in 3,000-year-old Egyptian tombs.')))),
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-1' }, '📊 Your Hive Right Now'),
                h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-amber-400' }, honey), h('div', { className: 'text-[11px] text-amber-300' }, 'lbs honey')),
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-yellow-400' }, pollen), h('div', { className: 'text-[11px] text-amber-300' }, 'lbs pollen')),
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-orange-400' }, Math.round(workers * 0.4 * 0.0002 * [0.8,1.3,0.6,0][season] * 100) / 100), h('div', { className: 'text-[11px] text-amber-300' }, 'lbs/day in'))))),

            // ── LIFECYCLE VIEW ──
            inspectLayer === 'lifecycle' && h('div', { className: 'space-y-2' },
              h('p', { className: 'text-xs text-amber-200 mb-1' }, 'Three castes, three lifecycles — all from the same egg. The only difference is diet:'),
              [
                { caste: '👑 Queen', egg: '3 days', larva: '5.5 days', pupa: '7.5 days', total: '16 days', lifespan: '2-5 years', diet: 'Royal jelly only (entire life)', note: 'Mates once on nuptial flight with 10-20 drones at 200+ ft altitude. Stores millions of sperm. Lays up to 2,000 eggs/day — her own body weight daily.' },
                { caste: '👷 Worker', egg: '3 days', larva: '6 days', pupa: '12 days', total: '21 days', lifespan: '6 weeks (summer) / 6 months (winter)', diet: 'Royal jelly 3 days, then bee bread', note: 'All female. Cannot mate. Changes jobs by age (temporal polyethism). Winter bees have more fat body and live 10× longer.' },
                { caste: '♂ Drone', egg: '3 days', larva: '6.5 days', pupa: '14.5 days', total: '24 days', lifespan: '~90 days', diet: 'Royal jelly 3 days, then bee bread', note: 'All male. No stinger. Sole purpose: mate with a queen from another colony. Dies immediately after mating. Surviving drones are evicted from the hive in autumn.' }
              ].map(function(c) {
                return h('div', { key: c.caste, className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                  h('div', { className: 'font-bold text-amber-200 text-xs mb-1' }, c.caste),
                  h('div', { className: 'flex gap-2 mb-1 text-[11px]' },
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🥚 ' + c.egg),
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🐛 ' + c.larva),
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🫘 ' + c.pupa),
                    h('span', { className: 'bg-amber-700/50 px-2 py-0.5 rounded text-amber-200 font-bold' }, '= ' + c.total)),
                  h('div', { className: 'text-[11px] text-amber-300 mb-1' }, '🕐 Lifespan: ' + c.lifespan + ' · 🍽️ Diet: ' + c.diet),
                  h('p', { className: 'text-[11px] text-amber-100/70 leading-relaxed' }, c.note));
              })),

            // ── WAGGLE DANCE VIEW ──
            inspectLayer === 'waggle' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30 text-center' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '💃 Decoding the Waggle Dance'),
                h('div', { className: 'text-6xl mb-2' }, '∞'),
                h('p', { className: 'text-[11px] text-amber-100/80 mb-2' }, 'The forager dances a figure-8 pattern on the vertical comb face. The central "waggle run" encodes two pieces of information:'),
                h('div', { className: 'grid grid-cols-2 gap-3 my-3' },
                  h('div', { className: 'bg-amber-800/30 rounded-lg p-3' },
                    h('div', { className: 'text-xl mb-1' }, '🧭'),
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Direction'),
                    h('p', { className: 'text-[11px] text-amber-100/70' }, 'The angle of the waggle run relative to vertical = the angle of the food source relative to the sun. Straight up = toward the sun. 60° right = 60° right of the sun. The bee uses the sun as a compass and gravity as a reference.')),
                  h('div', { className: 'bg-amber-800/30 rounded-lg p-3' },
                    h('div', { className: 'text-xl mb-1' }, '📏'),
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Distance'),
                    h('p', { className: 'text-[11px] text-amber-100/70' }, 'The duration of the waggle run encodes distance. ~1 second of waggling ≈ 1 kilometer. A 2-second waggle run means the nectar is about 2km away. Closer sources use a simpler "round dance" (no direction info needed).'))),
                h('p', { className: 'text-[11px] text-amber-400 italic' }, 'Karl von Frisch decoded this in the 1940s-60s. He shared the 1973 Nobel Prize in Physiology or Medicine. It remains the only known example of symbolic referential communication in invertebrates.'))),

            // ── THERMOREGULATION VIEW ──
            inspectLayer === 'temperature' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🌡️ The Warm-Blooded Superorganism'),
                h('p', { className: 'text-[11px] text-amber-100/80 mb-2' }, 'Individual bees are cold-blooded. But the colony maintains the brood nest at exactly 35°C (95°F) ± 0.5° — more precisely than most mammals regulate body temperature. How?'),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  h('div', { className: 'bg-red-900/30 rounded-lg p-3 border border-red-700/30' },
                    h('div', { className: 'text-xl text-center mb-1' }, '🔥'),
                    h('div', { className: 'text-xs font-bold text-red-300 text-center mb-1' }, 'Too Cold: Shivering Cluster'),
                    h('p', { className: 'text-[11px] text-red-100/70' }, 'Bees form a tight ball (winter cluster). Outer bees insulate; inner bees vibrate flight muscles WITHOUT moving wings, generating heat. They rotate positions so no bee freezes. The cluster contracts as temperature drops — at -40°C outside, the center stays 35°C.')),
                  h('div', { className: 'bg-blue-900/30 rounded-lg p-3 border border-blue-700/30' },
                    h('div', { className: 'text-xl text-center mb-1' }, '💧'),
                    h('div', { className: 'text-xs font-bold text-blue-300 text-center mb-1' }, 'Too Hot: Evaporative Cooling'),
                    h('p', { className: 'text-[11px] text-blue-100/70' }, 'Water foragers collect droplets and spread them on comb surfaces. Fanner bees create airflow (230 wingbeats/sec) that evaporates the water, cooling by ~10°C. If overheating continues, bees "beard" outside the entrance to reduce internal body heat.'))),
                h('div', { className: 'bg-amber-800/30 rounded-lg p-3 mt-2 text-center' },
                  h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, '🌡️ Current Brood Temperature'),
                  h('div', { className: 'text-2xl font-black text-amber-400' }, season === 3 ? (workers > 5000 ? '35.0°C' : '⚠️ ' + Math.round(20 + workers / 500) + '°C') : '35.0°C ✓'),
                  h('p', { className: 'text-[11px] text-amber-100/60 mt-1' }, season === 3 ? (workers > 5000 ? 'Cluster is maintaining brood temperature despite ' + ['spring','summer','autumn','winter'][season] + ' conditions.' : 'Colony too small to maintain temperature! Brood at risk.') : 'Brood nest perfectly regulated. ' + fannerCount + ' fanner bees on duty.')))),

            // ── PHEROMONE LANGUAGE VIEW ──
            inspectLayer === 'pheromones' && h('div', { className: 'space-y-3' },
              h('p', { className: 'text-xs text-amber-200 mb-1' }, 'Pheromones are the chemical language of the hive. Bees communicate danger, identity, location, reproduction, and social status through volatile molecules detected by 170+ odor receptors on their antennae.'),

              // QMP — Queen Mandibular Pheromone
              h('div', { className: 'bg-purple-900/40 rounded-lg p-3 border border-purple-500/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '👑'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-purple-300' }, 'Queen Mandibular Pheromone (QMP)'),
                    h('div', { className: 'text-[11px] text-purple-400' }, 'The most powerful pheromone in the insect world'))),
                h('div', { className: 'bg-purple-800/30 rounded p-2 mb-2' },
                  h('div', { className: 'text-[11px] font-mono text-purple-300 text-center mb-1' }, 'Key compounds:'),
                  h('div', { className: 'flex flex-wrap gap-1 justify-center' },
                    ['9-ODA (queen substance)', '9-HDA', 'HVA (homovanillyl alcohol)', 'Methyl oleate', '4-hydroxy-3-methoxyphenylethanol'].map(function(c, i) {
                      return h('span', { key: i, className: 'bg-purple-700/40 text-purple-200 px-2 py-0.5 rounded text-[11px]' }, c);
                    }))),
                h('div', { className: 'text-[11px] text-purple-100/70 space-y-1' },
                  h('p', null, '• Suppresses worker ovary development — only the queen reproduces'),
                  h('p', null, '• Attracts workers to attend and feed her (retinue response)'),
                  h('p', null, '• Stabilizes colony cohesion — without it, workers become agitated within hours'),
                  h('p', null, '• During nuptial flight, attracts drones from up to 60 meters away'),
                  h('p', null, '• Queen health: ' + queenHealth + '% → QMP production is ' + (queenHealth > 70 ? 'strong ✓' : queenHealth > 40 ? 'weakening ⚠️' : 'failing — workers may raise a replacement queen! 🚨')))),

              // Alarm Pheromone
              h('div', { className: 'bg-red-900/40 rounded-lg p-3 border border-red-500/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '⚠️'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-red-300' }, 'Alarm Pheromone'),
                    h('div', { className: 'text-[11px] text-red-400' }, 'The smell of danger'))),
                h('div', { className: 'text-[11px] text-red-100/70 space-y-1' },
                  h('p', null, '• Released from sting shaft (isopentyl acetate — smells like bananas 🍌)'),
                  h('p', null, '• Also released from mandibles (2-heptanone) when biting intruders'),
                  h('p', null, '• Recruits guard bees and increases aggression in nearby workers'),
                  h('p', null, '• Each sting deposits pheromone that marks the target for more stings'),
                  h('p', null, '• This is why beekeepers use smoke — it masks alarm pheromone and triggers bees to gorge on honey (preparing for possible hive evacuation), making them calmer'),
                  h('p', { className: 'font-bold text-red-300 mt-1' }, '🧪 Isopentyl acetate: CH₃COOCH₂CH₂CH(CH₃)₂'))),

              // Nasonov Pheromone
              h('div', { className: 'bg-green-900/40 rounded-lg p-3 border border-green-500/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '🏠'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-green-300' }, 'Nasonov Pheromone'),
                    h('div', { className: 'text-[11px] text-green-400' }, '"Come home" — the homing beacon'))),
                h('div', { className: 'text-[11px] text-green-100/70 space-y-1' },
                  h('p', null, '• Released from the Nasonov gland on the abdomen (bees fan with raised abdomen)'),
                  h('p', null, '• Primary component: geraniol and citral (lemon-scented)'),
                  h('p', null, '• Marks hive entrance so lost bees can find home'),
                  h('p', null, '• Used during swarming to guide the cluster to the new nest site'),
                  h('p', null, '• Foragers fan it at water and food sources to recruit other foragers'),
                  h('p', { className: 'font-bold text-green-300 mt-1' }, '🧪 Geraniol: C₁₀H₁₈O — a monoterpene alcohol'))),

              // Brood Pheromone
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-600/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '🥚'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-amber-300' }, 'Brood Pheromone'),
                    h('div', { className: 'text-[11px] text-amber-400' }, 'The babies control the adults'))),
                h('div', { className: 'text-[11px] text-amber-100/70 space-y-1' },
                  h('p', null, '• A blend of 10 fatty acid esters produced by larvae'),
                  h('p', null, '• Stimulates nurse bees to feed — hungry larvae produce MORE pheromone'),
                  h('p', null, '• Inhibits worker ovary development (backup to QMP)'),
                  h('p', null, '• Stimulates foragers to collect pollen (protein for larvae)'),
                  h('p', null, '• Controls the ratio of nurse bees to foragers — more brood = more nurses'),
                  h('p', null, '• Current brood: ' + fmtPop(brood) + ' larvae producing pheromone → ' + (brood > 5000 ? 'strong nursing stimulus ✓' : 'weak stimulus — colony may shift more workers to foraging')))),

              // Footprint Pheromone
              h('div', { className: 'bg-cyan-900/40 rounded-lg p-3 border border-cyan-500/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '👣'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-cyan-300' }, 'Footprint Pheromone'),
                    h('div', { className: 'text-[11px] text-cyan-400' }, 'Chemical GPS'))),
                h('div', { className: 'text-[11px] text-cyan-100/70 space-y-1' },
                  h('p', null, '• Deposited by tarsal glands on bee feet as they walk'),
                  h('p', null, '• Marks visited flowers — tells other foragers "already harvested, try the next one"'),
                  h('p', null, '• Marks the hive entrance — helps bees locate the entrance on return'),
                  h('p', null, '• Queen footprint pheromone inhibits queen cell construction — workers know she\'s present and walking the comb'))),

              // The big picture
              h('div', { className: 'bg-slate-800/50 rounded-lg p-3 border border-slate-600/30 text-center' },
                h('div', { className: 'text-xs font-bold text-slate-300 mb-1' }, '🧠 The Chemical Brain'),
                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, 'A honeybee has 170+ odorant receptors (humans have ~400, but bees are 50× more sensitive to floral scents). The colony\'s pheromone system is essentially a distributed nervous system — each bee is a "neuron" that reads and writes chemical signals. The colony thinks, decides, and responds as one organism, without any centralized brain.'))
            ),

            // ── BEE ANATOMY VIEW ──
            inspectLayer === 'anatomy' && h('div', { className: 'space-y-2' },
              h('p', { className: 'text-xs text-amber-200 mb-1' }, 'Under the microscope: a worker bee is a marvel of miniature engineering. Each structure evolved for a specific job — navigation, collection, defense, or construction.'),
              // Head structures
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🧠 Head — Sensory & Feeding'),
                [
                  { part: 'Compound Eyes', emoji: '👁️', desc: 'Two compound eyes with 6,900 hexagonal facets (ommatidia) each. Bees see UV light (invisible to humans) — flowers have "nectar guide" UV patterns that point to the nectar like runway lights.' },
                  { part: 'Ocelli', emoji: '🔆', desc: 'Three simple eyes on top of the head detect light intensity and horizon orientation. They help the bee stay level during flight and detect sunrise/sunset.' },
                  { part: 'Antennae', emoji: '📡', desc: '12 segments (workers/queens) or 13 (drones). Each antenna has ~170 odorant receptors, taste sensors, humidity detectors, and touch hairs. This is the bee\'s primary sensory organ.' },
                  { part: 'Proboscis', emoji: '👅', desc: 'A retractable "tongue" up to 6.6mm long. Built from the glossa (hairy tip), labium, and maxillae that lock together. The hairs flick 10× per second to lap up nectar. Different bee species have different tongue lengths matched to specific flowers.' },
                  { part: 'Mandibles', emoji: '🗡️', desc: 'Powerful jaws used to chew wax, clean the hive, bite intruders, and crush pollen. They also contain the 2-heptanone alarm pheromone gland.' }
                ].map(function(p) {
                  return h('div', { key: p.part, className: 'flex gap-2 items-start mt-1.5' },
                    h('span', { className: 'text-lg' }, p.emoji),
                    h('div', null,
                      h('div', { className: 'text-[11px] font-bold text-amber-300' }, p.part),
                      h('p', { className: 'text-[11px] text-amber-100/70 leading-relaxed' }, p.desc)));
                })),
              // Thorax structures
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '💪 Thorax — Locomotion Power'),
                [
                  { part: 'Wings (2 pairs)', emoji: '🦋', desc: 'Forewings hook into hindwings via tiny "hamuli" to form one unified airfoil. Wings beat 230× per second (12,000 rpm). Muscles contract 5–10× per nerve impulse — one of the fastest motion systems in biology. Top speed: ~15 mph; range: up to 5 miles from home.' },
                  { part: 'Flight Muscles', emoji: '⚡', desc: 'Indirect flight muscles don\'t attach to the wings directly — they deform the thorax, which snaps wings up and down. Can generate heat by shivering without moving wings (used for thermoregulation).' },
                  { part: 'Legs (3 pairs)', emoji: '🦵', desc: 'Front legs clean antennae (special notch). Middle legs push pollen. Hind legs have the pollen basket (corbicula) — a shiny concave area ringed with hairs that packs pollen into a visible ball during foraging.' },
                  { part: 'Corbicula', emoji: '🧺', desc: 'The pollen basket on the hind tibia. Can hold up to 15mg of pollen — one-third the bee\'s body weight. Foragers moisten pollen with nectar to make it stick.' }
                ].map(function(p) {
                  return h('div', { key: p.part, className: 'flex gap-2 items-start mt-1.5' },
                    h('span', { className: 'text-lg' }, p.emoji),
                    h('div', null,
                      h('div', { className: 'text-[11px] font-bold text-amber-300' }, p.part),
                      h('p', { className: 'text-[11px] text-amber-100/70 leading-relaxed' }, p.desc)));
                })),
              // Abdomen structures
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🐛 Abdomen — Chemistry & Defense'),
                [
                  { part: 'Honey Stomach (Crop)', emoji: '💧', desc: 'A separate storage sac from the digestive stomach. A valve (proventriculus) controls whether nectar goes into storage (for the hive) or digestion (for the bee). Capacity: ~40mg — nearly half the bee\'s weight.' },
                  { part: 'Wax Glands', emoji: '🕯️', desc: 'Eight abdominal glands on workers aged 12–18 days secrete liquid wax that hardens into flakes. Bees chew and shape flakes into hexagonal cells — the most space-efficient shape in geometry (proven by the Honeycomb Conjecture).' },
                  { part: 'Nasonov Gland', emoji: '🏠', desc: 'On the dorsal abdomen (near tail). Releases geraniol + citral (lemon scent) to mark the hive entrance and guide swarming bees. Workers raise their abdomens and fan wings to broadcast the signal.' },
                  { part: 'Sting (Workers/Queens)', emoji: '🗡️', desc: 'A modified ovipositor. Worker stingers have barbs — once embedded in mammal skin, they rip from the bee\'s abdomen and she dies, but the pulsing venom sac keeps pumping apitoxin. Queens have smooth stings used only against rival queens.' },
                  { part: 'Spiracles (Breathing Holes)', emoji: '💨', desc: 'Bees do not have lungs. They breathe through 10 pairs of spiracles connected to tracheal tubes that pipe oxygen directly to every cell. Air sacs pump like bellows when bees fly.' }
                ].map(function(p) {
                  return h('div', { key: p.part, className: 'flex gap-2 items-start mt-1.5' },
                    h('span', { className: 'text-lg' }, p.emoji),
                    h('div', null,
                      h('div', { className: 'text-[11px] font-bold text-amber-300' }, p.part),
                      h('p', { className: 'text-[11px] text-amber-100/70 leading-relaxed' }, p.desc)));
                })),
              // Fun scale panel
              h('div', { className: 'bg-amber-800/30 rounded-lg p-3 border border-amber-600/30 text-center' },
                h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, '📏 By the Numbers'),
                h('div', { className: 'grid grid-cols-2 gap-2 text-[11px]' },
                  h('div', null, h('strong', { className: 'text-amber-400' }, '12–15mm'), h('div', { className: 'text-amber-100/70' }, 'worker body length')),
                  h('div', null, h('strong', { className: 'text-amber-400' }, '~90mg'), h('div', { className: 'text-amber-100/70' }, 'worker body mass')),
                  h('div', null, h('strong', { className: 'text-amber-400' }, '230/sec'), h('div', { className: 'text-amber-100/70' }, 'wing beats')),
                  h('div', null, h('strong', { className: 'text-amber-400' }, '~960,000'), h('div', { className: 'text-amber-100/70' }, 'neurons (humans: 86 billion)'))))
            ),

            // ── NATIVE BEES VIEW ──
            inspectLayer === 'native' && h('div', { className: 'space-y-2' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('p', { className: 'text-xs text-amber-100/90 leading-relaxed' },
                  h('strong', { className: 'text-amber-300' }, 'There are over 20,000 bee species worldwide '),
                  '— and only 7 of them make honey. Everything you\'ve learned about ',
                  h('em', null, 'Apis mellifera'),
                  ' (the Western honeybee) is the tip of the iceberg. Most bees are ',
                  h('strong', { className: 'text-amber-300' }, 'solitary, native, and ecologically irreplaceable'),
                  '. Native bees pollinate ~75% of North American flowering plants — many crops honeybees cannot pollinate at all.')),
              [
                { name: 'Mason Bees', sci: 'Osmia spp.', emoji: '🧱', social: 'Solitary · cavity-nesting', trait: '100× more efficient pollinator than honeybees per individual', desc: 'Females build individual nest chambers in hollow stems or drilled wood and seal each with mud (hence "mason"). They carry pollen dry on their abdomen (scopa), dropping 10× more pollen than honeybees. Critical for orchard crops — apples, cherries, plums. Active only 4–6 weeks in early spring.', color: 'bg-orange-800/40 border-orange-600/40', textColor: 'text-orange-300' },
                { name: 'Leafcutter Bees', sci: 'Megachile spp.', emoji: '🍃', social: 'Solitary · leaf-nesting', trait: 'Cut perfect circles from leaves to line nest cells', desc: 'Females snip oval leaf pieces and roll them into tubular cells. Key pollinator of alfalfa (the #1 livestock forage crop). Commercial leafcutter pollination in North America supports billions of dollars of alfalfa seed production.', color: 'bg-green-800/40 border-green-600/40', textColor: 'text-green-300' },
                { name: 'Bumblebees', sci: 'Bombus spp.', emoji: '🧸', social: 'Social · annual colonies', trait: 'Can "buzz-pollinate" tomatoes, blueberries, cranberries', desc: 'Fuzzy, cold-tolerant, and powerful. Bumblebees vibrate their flight muscles at 400Hz to shake pollen loose from tomato and blueberry flowers — something honeybees cannot do. Annual colonies die in fall except the queen, who overwinters alone. Several species (e.g. rusty-patched bumblebee) are endangered.', color: 'bg-yellow-800/40 border-yellow-600/40', textColor: 'text-yellow-300' },
                { name: 'Sweat Bees', sci: 'Halictidae', emoji: '✨', social: 'Varied · ground-nesting', trait: 'Metallic green/blue; attracted to human sweat for salt', desc: 'Iridescent, often mistaken for small flies or wasps. They nest in bare soil and are major pollinators of wildflowers and vegetable crops. Some species have primitive social behavior (a precursor to honeybee eusociality). They\'ll occasionally land on people to drink salty sweat.', color: 'bg-emerald-800/40 border-emerald-600/40', textColor: 'text-emerald-300' },
                { name: 'Squash Bees', sci: 'Peponapis / Xenoglossa', emoji: '🎃', social: 'Solitary · ground-nesting', trait: 'Specialists — only pollinate squash/pumpkin/gourd flowers', desc: 'Males sleep inside closed squash blossoms overnight. Females forage at dawn before honeybees even wake up. Without squash bees, your jack-o\'-lantern, zucchini, and winter squash crops would fail. A textbook example of coevolution between plant and pollinator.', color: 'bg-orange-900/40 border-orange-700/40', textColor: 'text-orange-200' },
                { name: 'Miner Bees', sci: 'Andrena spp.', emoji: '⛏️', social: 'Solitary · ground-nesting', trait: 'Dig burrows up to 12 inches deep in bare soil', desc: 'One of the largest bee genera (1,500+ species). Emerge very early in spring — often the first pollinators of the year. Completely harmless and don\'t defend their nests. If you see small mounds of dirt with holes in your lawn in April, you may be hosting miners!', color: 'bg-amber-900/40 border-amber-700/40', textColor: 'text-amber-300' },
                { name: 'Carpenter Bees', sci: 'Xylocopa spp.', emoji: '🪵', social: 'Solitary · wood-nesting', trait: 'Chew tunnels in dead wood — the "bumblebee with a shiny butt"', desc: 'Females bore perfectly round tunnels in untreated wood. Males have no stinger and are often mistaken for aggressive — they just hover and stare. Effective pollinators of passionflower, beans, and eggplant. Sometimes accused of nectar-robbing (biting holes in flower bases to skip the pollination work).', color: 'bg-purple-900/40 border-purple-700/40', textColor: 'text-purple-300' }
              ].map(function(b) {
                return h('div', { key: b.name, className: 'rounded-lg p-2.5 border ' + b.color },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-xl' }, b.emoji),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('span', { className: 'text-xs font-bold ' + b.textColor }, b.name),
                        h('span', { className: 'text-[11px] italic text-amber-400/70' }, b.sci),
                        h('span', { className: 'text-[11px] text-amber-300/60' }, '· ' + b.social)))),
                  h('div', { className: 'text-[11px] font-bold mb-1 ' + b.textColor }, '🔑 ' + b.trait),
                  h('p', { className: 'text-[11px] text-amber-100/75 leading-relaxed' }, b.desc));
              }),
              // Call to action
              h('div', { className: 'bg-emerald-900/30 rounded-lg p-3 border border-emerald-600/30' },
                h('div', { className: 'text-xs font-bold text-emerald-300 mb-1' }, '🌍 How to Help Native Bees'),
                h('ul', { className: 'text-[11px] text-emerald-100/80 space-y-0.5 pl-4 list-disc' },
                  h('li', null, 'Leave patches of bare soil — 70% of native bees nest in the ground'),
                  h('li', null, 'Build a bee hotel with hollow stems (6–8mm diameter) and drilled wood blocks'),
                  h('li', null, 'Plant native flowers — exotic ornamentals often produce 4× less nectar'),
                  h('li', null, 'Never use neonicotinoids — they are lethal to solitary bees at micro-doses'),
                  h('li', null, 'Report sightings to Bumble Bee Watch or iNaturalist for research data'),
                  h('li', null, 'Skip the honeybee hive in urban areas with scarce flowers — managed honeybees compete with struggling natives')))
            ),

            // ── BLOOM CALENDAR VIEW (temperate-zone bloom windows, Maine/New England baseline) ──
            inspectLayer === 'bloom' && (function() {
              var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              // day 0 is Mar 1 (spring start); each season = 30 days = ~1 month
              var currentMonthIdx = (2 + Math.floor(day / 30)) % 12; // 0=Jan
              // Each plant: months = [Jan, Feb, ...] bloom strength 0=none, 1=light, 2=peak
              var PLANTS = [
                { name: 'Red Maple / Willow', emoji: '🌳', kind: 'Tree', months: [0,0,2,2,0,0,0,0,0,0,0,0], note: 'Earliest pollen source — critical for spring build-up. Pussy willow catkins appear even in snow.', value: 'pollen' },
                { name: 'Crocus / Snowdrop', emoji: '🌷', kind: 'Bulb', months: [0,0,2,1,0,0,0,0,0,0,0,0], note: 'First flowers bees see — plant bulbs in fall for emergency early pollen.', value: 'both' },
                { name: 'Dandelion', emoji: '🌼', kind: 'Forb', months: [0,0,0,2,2,1,0,0,0,1,0,0], note: 'A bee lifeline, not a weed. "No Mow May" lets dandelions feed colonies recovering from winter.', value: 'both' },
                { name: 'Fruit Trees (apple/cherry)', emoji: '🌸', kind: 'Tree', months: [0,0,0,0,2,0,0,0,0,0,0,0], note: 'Massive but brief — apple bloom lasts ~10 days. Honeybees are critical commercial pollinators.', value: 'both' },
                { name: 'White Clover', emoji: '🍀', kind: 'Forb', months: [0,0,0,0,1,2,2,2,1,0,0,0], note: 'The classic North American table honey. Low, creeping, drought-tolerant — ideal lawn replacement.', value: 'nectar' },
                { name: 'Blueberry', emoji: '🫐', kind: 'Shrub', months: [0,0,0,0,2,1,0,0,0,0,0,0], note: 'Needs buzz-pollination from bumblebees — honeybees help but bumbles are 3× more effective.', value: 'both' },
                { name: 'Black Locust / Basswood', emoji: '🌳', kind: 'Tree', months: [0,0,0,0,0,2,2,0,0,0,0,0], note: 'Linden/basswood honey is a prized single-origin varietal. Locust supports early summer flows.', value: 'nectar' },
                { name: 'Lavender', emoji: '💜', kind: 'Herb', months: [0,0,0,0,0,1,2,2,0,0,0,0], note: 'Aromatic honey prized in Mediterranean cuisine. Excellent for garden borders.', value: 'nectar' },
                { name: 'Borage / Comfrey', emoji: '💙', kind: 'Herb', months: [0,0,0,0,1,2,2,1,0,0,0,0], note: 'Borage refills nectar every 2 minutes — one of the highest-yielding bee plants known.', value: 'nectar' },
                { name: 'Milkweed', emoji: '🌸', kind: 'Forb', months: [0,0,0,0,0,2,2,1,0,0,0,0], note: 'Critical for monarchs AND bees. Nectar-rich complex flowers. Plant common or swamp milkweed.', value: 'nectar' },
                { name: 'Sunflower', emoji: '🌻', kind: 'Annual', months: [0,0,0,0,0,0,2,2,2,0,0,0], note: 'Massive composite flower heads are pollen landing pads. Choose pollen-producing (not pollen-free) cultivars.', value: 'both' },
                { name: 'Buckwheat', emoji: '🌾', kind: 'Annual', months: [0,0,0,0,0,0,2,2,1,0,0,0], note: 'Dark, molasses-like honey. Blooms 30 days after sowing — easy late-summer flow plant.', value: 'nectar' },
                { name: 'Goldenrod', emoji: '🟡', kind: 'Native', months: [0,0,0,0,0,0,0,2,2,2,0,0], note: 'Autumn winter-stores powerhouse. Often blamed for hay fever, but it\'s ragweed that actually causes allergies.', value: 'both' },
                { name: 'New England Aster', emoji: '💜', kind: 'Native', months: [0,0,0,0,0,0,0,0,2,2,1,0], note: 'Last abundant nectar before winter. Bees gorge on it to fatten up for clustering.', value: 'both' },
                { name: 'Witch Hazel', emoji: '🟡', kind: 'Shrub', months: [0,2,1,0,0,0,0,0,0,1,2,0], note: 'Unusual late-autumn AND late-winter bloomer. On warm winter days, bees will fly to visit it.', value: 'nectar' }
              ];
              // Group by phase
              var phases = [
                { name: '🌱 Early Spring (Mar–Apr)', months: [2,3], color: 'bg-lime-600/30 border-lime-500/40' },
                { name: '☀️ Late Spring → Summer (May–Jul)', months: [4,5,6], color: 'bg-amber-600/30 border-amber-500/40' },
                { name: '🌻 Late Summer (Jul–Aug)', months: [6,7], color: 'bg-orange-600/30 border-orange-500/40' },
                { name: '🍂 Autumn (Aug–Oct)', months: [7,8,9], color: 'bg-red-700/30 border-red-500/40' }
              ];
              return h('div', { className: 'space-y-3' },
                h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                  h('p', { className: 'text-xs text-amber-100/80 leading-relaxed' },
                    h('strong', { className: 'text-amber-300' }, 'A bloom gap can starve a colony. '),
                    'Bees need nectar from earliest spring through late autumn. Any 2-week dearth — especially during summer nectar gaps or after first frost — forces the colony to dip into honey reserves. Diverse native plantings smooth out the forage curve so bees always have something to eat.'),
                  h('div', { className: 'text-[11px] italic text-amber-400 mt-1' }, 'Baseline: Maine / New England (USDA Zone 5). Shift ±3 weeks for warmer/colder climates.')),
                // Current month indicator
                h('div', { className: 'bg-amber-800/30 rounded-lg p-2 border border-amber-600/30 text-center' },
                  h('div', { className: 'text-[11px] text-amber-300' }, 'Current in-game month'),
                  h('div', { className: 'text-sm font-black text-amber-200' }, '📍 ' + MONTHS[currentMonthIdx] + ' · Day ' + day)),
                // Month headers
                h('div', { className: 'grid gap-0.5', style: { gridTemplateColumns: '140px repeat(12, 1fr)' } },
                  h('div', null),
                  MONTHS.map(function(m, mi) {
                    var active = mi === currentMonthIdx;
                    return h('div', { key: m, className: 'text-center text-[10px] font-bold py-1 rounded ' + (active ? 'bg-amber-500 text-slate-900' : 'text-amber-400') }, m);
                  })),
                // Plant rows
                PLANTS.map(function(p) {
                  return h('div', { key: p.name, className: 'grid gap-0.5 items-center', style: { gridTemplateColumns: '140px repeat(12, 1fr)' }, title: p.note },
                    h('div', { className: 'flex items-center gap-1 text-[11px] truncate' },
                      h('span', null, p.emoji),
                      h('span', { className: 'text-amber-200 font-medium truncate' }, p.name)),
                    p.months.map(function(v, mi) {
                      var active = mi === currentMonthIdx;
                      var bg = v === 2 ? 'bg-amber-400' : v === 1 ? 'bg-amber-600/60' : 'bg-amber-900/20';
                      var ring = active ? ' ring-1 ring-yellow-300' : '';
                      return h('div', { key: mi, className: 'h-4 rounded-sm ' + bg + ring, title: MONTHS[mi] + ': ' + (v === 2 ? 'peak bloom' : v === 1 ? 'light bloom' : 'not blooming') });
                    }));
                }),
                // Legend
                h('div', { className: 'flex items-center gap-3 text-[11px] text-amber-200 pt-1' },
                  h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-3 rounded-sm bg-amber-400' }), 'Peak bloom'),
                  h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-3 rounded-sm bg-amber-600/60' }), 'Light bloom'),
                  h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'inline-block w-3 h-3 rounded-sm bg-amber-900/20 border border-amber-700/50' }), 'Dormant')),
                // Flow phase summary
                h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                  phases.map(function(ph) {
                    var plantsInPhase = PLANTS.filter(function(p) { return ph.months.some(function(mi) { return p.months[mi] >= 2; }); });
                    return h('div', { key: ph.name, className: 'rounded-lg p-2 border ' + ph.color },
                      h('div', { className: 'text-[11px] font-bold text-amber-200 mb-1' }, ph.name),
                      h('div', { className: 'text-[11px] text-amber-100/70' }, plantsInPhase.length + ' key plants peaking: ' + plantsInPhase.slice(0, 4).map(function(p) { return p.emoji + ' ' + p.name.split(' ')[0]; }).join(', ') + (plantsInPhase.length > 4 ? '…' : '')));
                  })),
                // Gap warning box
                h('div', { className: 'bg-red-900/30 rounded-lg p-2.5 border border-red-600/40' },
                  h('div', { className: 'text-[11px] font-bold text-red-300 mb-1' }, '⚠️ Summer Dearth (late July in Maine)'),
                  h('p', { className: 'text-[11px] text-red-100/80 leading-relaxed' }, 'Between spring tree bloom and summer herbaceous flowers there\'s often a 2–3 week "dearth" with little nectar flow. Watch for robbing behavior and reduce hive entrance size. Planting late-summer bloomers (sunflower, buckwheat, goldenrod) is the single best way to close this gap.'))
              );
            })());
        }

        // ── Population format ──
        function fmtPop(n) { return n >= 1000 ? Math.round(n / 100) / 10 + 'K' : n; }

        // ── Colony health rating ──
        var colonyHealth = Math.round(
          (Math.min(100, workers / 300)) * 0.3 +
          (queenHealth) * 0.2 +
          ((100 - varroaLevel)) * 0.2 +
          (morale) * 0.15 +
          (Math.min(100, honey * 3)) * 0.15
        );
        var colonyRating = colonyHealth >= 80 ? '🐝 Thriving' : colonyHealth >= 55 ? '🌿 Healthy' : colonyHealth >= 35 ? '⚠️ Stressed' : '🚨 Critical';
        var ratingColor = colonyHealth >= 80 ? 'text-amber-400' : colonyHealth >= 55 ? 'text-green-400' : colonyHealth >= 35 ? 'text-yellow-400' : 'text-red-400';

        // ── Canvas Animation (hooks at top level, before return) ──
        var _cvRef = React.useRef(null);
        var _animId = React.useRef(0);
        var _bees = React.useRef(null);
        var _flowers = React.useRef(null);
        var _tick = React.useRef(0);
        var _sized = React.useRef(false);
        // Track if animation loop is already running to avoid teardown/rebuild on every render
        var _loopRunning = React.useRef(false);

        // Store live colony state in a ref so the animation loop always reads fresh values
        var _liveState = React.useRef({});
        _liveState.current = { workers: workers, honey: honey, season: season, habitat: habitat, gardenPollinators: gardenPollinators, gardenBonus: gardenBonus, colonyHealth: colonyHealth, queenHealth: queenHealth, morale: morale, day: day, brood: brood, drones: drones };

        React.useEffect(function() {
          console.log('[Beehive DEBUG] beekeeper useEffect fired. viewMode=' + viewMode);
          if (viewMode !== 'beekeeper') { console.log('[Beehive DEBUG] early return: viewMode not beekeeper'); return; }
          // DOM diagnostic: is the canvas actually in the rendered DOM?
          var domCanvases = document.querySelectorAll('canvas');
          console.log('[Beehive DEBUG] DOM scan: found ' + domCanvases.length + ' <canvas> elements on page');
          for (var i = 0; i < domCanvases.length; i++) {
            var dc = domCanvases[i];
            var al = dc.getAttribute('aria-label') || '';
            console.log('[Beehive DEBUG]   canvas[' + i + ']: aria-label="' + al.slice(0, 50) + '" size=' + dc.clientWidth + 'x' + dc.clientHeight + ' parent=' + (dc.parentElement ? dc.parentElement.tagName : '?'));
          }
          // NEW: find the TOP MARKER (if it rendered) and log its siblings to see what's actually in DOM
          var topMarker = document.querySelector('div[style*="TOP MARKER"]') || Array.from(document.querySelectorAll('div')).find(function(d) { return d.textContent && d.textContent.indexOf('TOP MARKER') !== -1 && d.children.length === 0; });
          console.log('[Beehive DEBUG] TOP MARKER in DOM:', topMarker ? 'YES' : 'NO');
          if (topMarker) {
            var parent = topMarker.parentElement;
            console.log('[Beehive DEBUG] TOP MARKER parent:', parent ? parent.tagName + '.' + parent.className + ' (' + parent.children.length + ' children)' : 'NULL');
            if (parent) {
              for (var ci = 0; ci < Math.min(parent.children.length, 10); ci++) {
                var ch = parent.children[ci];
                var txt = (ch.textContent || '').slice(0, 60).replace(/\s+/g, ' ');
                console.log('[Beehive DEBUG]   child[' + ci + ']: <' + ch.tagName + '> "' + txt + '"');
              }
            }
          }
          var tries = 0;
          var retryTimer = null;
          var teardownFn = null;
          function tryInit() {
            var cv = _cvRef.current;
            // On every try, also recheck DOM directly
            if (!cv && tries === 0) {
              var foundByLabel = document.querySelector('canvas[aria-label*="beehive"]') || document.querySelector('canvas[aria-label*="Animated"]');
              console.log('[Beehive DEBUG] ref null but DOM query found: ' + (foundByLabel ? 'YES (' + foundByLabel.outerHTML.slice(0, 100) + '...)' : 'NO'));
            }
            console.log('[Beehive DEBUG] tryInit #' + tries + ', cv=' + (cv ? 'ATTACHED (' + cv.tagName + ')' : 'NULL') + ', _cvRef obj id=' + (_cvRef.__id || (_cvRef.__id = Math.random().toString(36).slice(2, 6))));
            if (!cv) {
              if (tries++ < 12) {
                retryTimer = setTimeout(tryInit, 50);
              } else {
                console.warn('[Beehive DEBUG] beekeeper canvas ref NEVER attached after 12 retries');
              }
              return;
            }
            var c = cv.getContext('2d');
            console.log('[Beehive DEBUG] getContext result=' + (c ? 'OK' : 'NULL') + ', parent=' + (cv.parentElement ? cv.parentElement.tagName + ' ' + cv.parentElement.clientWidth + 'x' + cv.parentElement.clientHeight : 'NO PARENT'));
            if (!c) {
              if (tries++ < 12) retryTimer = setTimeout(tryInit, 50);
              return;
            }
            console.log('[Beehive DEBUG] calling doSetup...');
            teardownFn = doSetup(cv, c);
            console.log('[Beehive DEBUG] doSetup returned. Frame loop should be running now.');
          }
          // Wrap the rest of the original setup in a function so the retry can invoke it.
          function doSetup(cv, c) {

          // Size canvas from parent container (with resize observer).
          // Outer W/H are mutable and read fresh by frame() closure each tick.
          var par = cv.parentElement;
          var W = (par ? par.clientWidth : cv.clientWidth) || 500;
          var H = (par ? par.clientHeight : cv.clientHeight) || 300;
          function resizeCanvas() {
            var newW = (par ? par.clientWidth : cv.clientWidth) || 500;
            var newH = (par ? par.clientHeight : cv.clientHeight) || 300;
            // Safety: some browsers report clientWidth=0 during layout. Fall back to previous
            // good values or sensible defaults so the canvas never ends up invisible.
            if (newW < 80) newW = Math.max(W, 500);
            if (newH < 80) newH = Math.max(H, 300);
            W = newW; H = newH;
            cv.width = W * 2; cv.height = H * 2;
            c.setTransform(2, 0, 0, 2, 0, 0);
            // Re-init bees and flowers for new dimensions
            _bees.current = null; _flowers.current = null;
          }
          resizeCanvas();
          var resizeObs = null;
          if (typeof ResizeObserver !== 'undefined' && par) {
            resizeObs = new ResizeObserver(function() { resizeCanvas(); });
            resizeObs.observe(par);
          }

          // roundRect polyfill
          if (typeof c.roundRect !== 'function') {
            c.roundRect = function(rx, ry, rw, rh, rr) {
              var rad = typeof rr === 'number' ? rr : 0;
              this.moveTo(rx + rad, ry);
              this.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
              this.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
              this.arcTo(rx, ry + rh, rx, ry, rad);
              this.arcTo(rx, ry, rx + rw, ry, rad);
              this.closePath();
            };
          }

          // Bees & flowers now (re)initialized lazily inside frame() so resize works correctly.
          // Butterflies + hummingbird live at doSetup scope — reset on resize/remount, preserved across frames.
          var _butterflies = null;
          var _hummingbird = null;
          function _initButterflies() {
            _butterflies = [];
            for (var bf2 = 0; bf2 < 3; bf2++) _butterflies.push({
              x: -60 - bf2 * 240, y: H * 0.30 + Math.random() * H * 0.30,
              vx: 0.28 + Math.random() * 0.22, amp: 8 + Math.random() * 8, ph: Math.random() * 6.28,
              col: ['#f472b6', '#fbbf24', '#60a5fa', '#a78bfa'][bf2 % 4], wp: 0
            });
          }
          function _initHummingbird() {
            _hummingbird = {
              x: W * 0.55, y: H * 0.58, targetX: W * 0.55, targetY: H * 0.58,
              hoverT: 0, wp: 0, visible: false, vis0: Math.random() * 300
            };
          }

          function frame() {
            try {
              // Read live state from ref (updated every React render)
              var ls = _liveState.current || {};
              var safeHoney = typeof ls.honey === 'number' && isFinite(ls.honey) ? ls.honey : 20;
              var safeWorkers = typeof ls.workers === 'number' && isFinite(ls.workers) ? ls.workers : 10000;
              season = typeof ls.season === 'number' ? ls.season : 0;
              gardenPollinators = ls.gardenPollinators || 0;
              gardenBonus = ls.gardenBonus || 0;
              colonyHealth = typeof ls.colonyHealth === 'number' ? ls.colonyHealth : 50;
              var t2 = ++_tick.current;
              // Recompute bee/flower arrays + hive rect each frame so resize/reinit is live.
              // Previously these were captured once before frame() → stale after resize.
              if (!_bees.current || _bees.current.length === 0) {
                // More bees for a livelier scene — cap bumped 60→90, trigger 300→250 workers/bee.
                var ba = [], nb = Math.max(14, Math.min(90, Math.floor((safeWorkers || 10000) / 250)));
                for (var bi = 0; bi < nb; bi++) {
                  // Every ~8th bee is a bumblebee cameo: larger, fuzzier, slower.
                  var isBumble = (bi % 8) === 3;
                  ba.push({
                    x: W * 0.3 + Math.random() * W * 0.5, y: H * 0.15 + Math.random() * H * 0.45,
                    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.5,
                    sz: isBumble ? (4 + Math.random() * 1.5) : (2.5 + Math.random() * 2),
                    ph: Math.random() * 6.28,
                    carry: Math.random() > 0.6, toFlower: Math.random() > 0.5,
                    wp: Math.random() * 6.28,
                    bumble: isBumble
                  });
                }
                _bees.current = ba;
              }
              if (!_flowers.current || _flowers.current.length === 0) {
                // Richer meadow — 2 rows of flowers, more species variety.
                var fa = [], nf = Math.min(28, 8 + Math.floor(((ls && ls.habitat) || 50) / 6));
                var flColors2 = ['#f472b6','#fbbf24','#a78bfa','#fb923c','#34d399','#f87171','#60a5fa','#e879f9','#38bdf8','#fcd34d','#fda4af'];
                for (var fj = 0; fj < nf; fj++) {
                  var _row = fj % 2; // alternating rows for depth
                  fa.push({
                    x: W * 0.47 + (fj / 2) * (W * 0.50 / (nf / 2)) + (Math.random() - 0.5) * 14,
                    y: H * 0.68 + _row * 6 + (Math.random() - 0.5) * 10,
                    col: flColors2[fj % flColors2.length], sz: 4 + Math.random() * 5, sp: Math.random() * 6.28
                  });
                }
                _flowers.current = fa;
              }
              var bees = _bees.current, flowers = _flowers.current;
              var hiveX = W * 0.10, hiveY = H * 0.20, hiveW = W * 0.30, hiveH = H * 0.56;
              c.clearRect(0, 0, W, H);

              // ── Sky (seasonal gradient + atmosphere) ──
              var skys = [
                ['#7ec8e3','#b8e2f2','#90d88c'], ['#4a9fd6','#7ec8e3','#4ade80'],
                ['#c4856b','#e8c496','#a87732'], ['#8aa4be','#b0c4de','#dfe6ed']
              ];
              var sk = skys[season] || skys[0];
              var sg = c.createLinearGradient(0, 0, 0, H);
              sg.addColorStop(0, sk[0]); sg.addColorStop(0.55, sk[1]); sg.addColorStop(1, sk[2]);
              c.fillStyle = sg; c.fillRect(0, 0, W, H);

              // Sun / Moon
              var sunR = season === 1 ? 24 : season === 3 ? 14 : 18;
              var sunY = H * 0.10 + Math.sin(t2 * 0.002) * 3;
              c.save();
              c.shadowColor = season === 3 ? 'rgba(180,200,220,0.3)' : 'rgba(255,200,80,0.5)';
              c.shadowBlur = season === 3 ? 10 : 20;
              c.fillStyle = season === 3 ? '#d0dae8' : '#ffe066';
              c.beginPath(); c.arc(W * 0.85, sunY, sunR, 0, 6.28); c.fill();
              c.restore();
              // Sun rays (not winter) — short radiating spikes
              if (season !== 3) {
                c.strokeStyle = 'rgba(255,220,100,0.15)'; c.lineWidth = 1;
                for (var ri = 0; ri < 8; ri++) {
                  var ra = ri * 0.785 + t2 * 0.003;
                  c.beginPath(); c.moveTo(W * 0.85 + Math.cos(ra) * (sunR + 4), sunY + Math.sin(ra) * (sunR + 4));
                  c.lineTo(W * 0.85 + Math.cos(ra) * (sunR + 14), sunY + Math.sin(ra) * (sunR + 14));
                  c.stroke();
                }
                // ── Volumetric god rays: wide slanted beams from sun toward ground ──
                c.save();
                var raySrcX = W * 0.85, raySrcY = sunY;
                for (var gr = 0; gr < 5; gr++) {
                  var rayAng = 1.3 + gr * 0.12 + Math.sin(t2 * 0.0015 + gr) * 0.04; // angle radiating downward-ish
                  var rayLen = H * 1.1;
                  var rayWidth = 26 + gr * 8;
                  var grd = c.createLinearGradient(raySrcX, raySrcY, raySrcX + Math.cos(rayAng) * rayLen, raySrcY + Math.sin(rayAng) * rayLen);
                  grd.addColorStop(0, 'rgba(255,235,160,0.18)');
                  grd.addColorStop(0.6, 'rgba(255,220,120,0.05)');
                  grd.addColorStop(1, 'rgba(255,220,120,0)');
                  c.fillStyle = grd;
                  c.translate(raySrcX, raySrcY);
                  c.rotate(rayAng);
                  c.beginPath();
                  c.moveTo(0, -rayWidth * 0.4);
                  c.lineTo(rayLen, -rayWidth * 1.6);
                  c.lineTo(rayLen, rayWidth * 1.6);
                  c.lineTo(0, rayWidth * 0.4);
                  c.closePath(); c.fill();
                  c.rotate(-rayAng);
                  c.translate(-raySrcX, -raySrcY);
                }
                c.restore();
              }

              // ── Pollen dust motes drifting in the god rays (magical atmosphere) ──
              if (season !== 3) {
                c.fillStyle = 'rgba(255,240,180,0.55)';
                for (var dm = 0; dm < 18; dm++) {
                  var dmSrcX = W * 0.85, dmSrcY = sunY;
                  var dmAng = 1.4 + (dm * 0.037);
                  var dmT = ((t2 * 0.2 + dm * 77) % 500) / 500; // 0..1 progress along ray
                  var dmDist = 40 + dmT * 420;
                  var dmx = dmSrcX + Math.cos(dmAng) * dmDist + Math.sin(t2 * 0.01 + dm) * 6;
                  var dmy = dmSrcY + Math.sin(dmAng) * dmDist + Math.cos(t2 * 0.008 + dm * 2) * 4;
                  if (dmy > H * 0.78) continue;
                  var dmAlpha = Math.sin(dmT * 3.14) * 0.6;
                  c.globalAlpha = dmAlpha;
                  c.beginPath(); c.arc(dmx, dmy, 0.7 + Math.sin(t2 * 0.05 + dm) * 0.3, 0, 6.28); c.fill();
                }
                c.globalAlpha = 1;
              }

              // ── Time-of-day warm breath (gentle hourly tint to break up flat seasonal sky) ──
              var _tod = Math.sin(t2 * 0.00025); // slow cycle, -1..1
              if (_tod > 0 && season !== 3) {
                c.fillStyle = 'rgba(255,170,90,' + (_tod * 0.12) + ')';
                c.fillRect(0, 0, W, H * 0.55);
              } else if (_tod < -0.3 && season !== 2) {
                // dusk / cool blue moment
                c.fillStyle = 'rgba(90,110,160,' + (-_tod * 0.10) + ')';
                c.fillRect(0, 0, W, H * 0.55);
              }

              // Clouds (parallax, layered)
              c.globalAlpha = 0.25;
              c.fillStyle = '#fff';
              for (var ci = 0; ci < 4; ci++) {
                var cx = (ci * W * 0.28 + t2 * (0.08 + ci * 0.04) + ci * 70) % (W + 80) - 40;
                var cy = 18 + ci * 14 + Math.sin(t2 * 0.005 + ci) * 3;
                c.beginPath(); c.ellipse(cx, cy, 28 + ci * 4, 8 + ci * 2, 0, 0, 6.28); c.fill();
                c.beginPath(); c.ellipse(cx + 18, cy - 3, 18, 7, 0, 0, 6.28); c.fill();
              }
              c.globalAlpha = 1;

              // ── Distant mountain silhouettes (depth layer, non-winter uses blue-gray) ──
              var mtnColor = season === 3 ? 'rgba(140,160,180,0.55)' : season === 2 ? 'rgba(120,95,70,0.5)' : 'rgba(100,130,160,0.45)';
              c.fillStyle = mtnColor;
              c.beginPath();
              c.moveTo(0, H * 0.62);
              for (var mx = 0; mx <= W; mx += 40) {
                var mh = Math.sin(mx * 0.011) * 28 + Math.sin(mx * 0.027) * 14 + Math.cos(mx * 0.006) * 8;
                c.lineTo(mx, H * 0.62 - 40 + mh);
              }
              c.lineTo(W, H * 0.76); c.lineTo(0, H * 0.76); c.closePath(); c.fill();
              // Second, closer mountain layer (darker, slightly different offset)
              c.fillStyle = season === 3 ? 'rgba(110,130,150,0.65)' : season === 2 ? 'rgba(100,75,55,0.6)' : 'rgba(80,110,140,0.55)';
              c.beginPath();
              c.moveTo(0, H * 0.68);
              for (var mx2 = 0; mx2 <= W; mx2 += 34) {
                var mh2 = Math.sin(mx2 * 0.015 + 1) * 18 + Math.sin(mx2 * 0.031 + 0.4) * 9;
                c.lineTo(mx2, H * 0.68 - 22 + mh2);
              }
              c.lineTo(W, H * 0.76); c.lineTo(0, H * 0.76); c.closePath(); c.fill();

              // ── Ground with texture ──
              var gCol = season === 3 ? '#dfe6ed' : season === 2 ? '#b5833a' : '#4ade80';
              c.fillStyle = gCol; c.fillRect(0, H * 0.76, W, H * 0.24);
              // Ground highlight
              var gg = c.createLinearGradient(0, H * 0.76, 0, H * 0.76 + 8);
              gg.addColorStop(0, 'rgba(255,255,255,0.15)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
              c.fillStyle = gg; c.fillRect(0, H * 0.76, W, 8);
              // Grass blades
              if (season !== 3) {
                c.strokeStyle = season === 2 ? '#92702a' : '#22c55e'; c.lineWidth = 1;
                for (var gi = 0; gi < 50; gi++) {
                  var gx = gi * (W / 50) + Math.sin(gi * 1.7) * 4;
                  var gsw = Math.sin(t2 * 0.018 + gi * 0.6) * 2.5;
                  c.beginPath(); c.moveTo(gx, H * 0.76);
                  c.quadraticCurveTo(gx + gsw * 0.5, H * 0.76 - 5, gx + gsw, H * 0.76 - 7 - Math.random() * 3);
                  c.stroke();
                }
              }
              // Snow
              if (season === 3) {
                c.fillStyle = '#fff';
                for (var sn = 0; sn < 25; sn++) {
                  c.beginPath(); c.arc((sn * 41 + t2 * 0.25) % W, (sn * 23 + t2 * 0.4) % H, 1.2 + Math.random() * 0.8, 0, 6.28); c.fill();
                }
              }

              // ── Distant birds (seasonal: V-formation migrating in autumn, scattered swooping in spring/summer) ──
              if (season !== 3) {
                c.strokeStyle = season === 2 ? 'rgba(40,30,20,0.55)' : 'rgba(40,40,60,0.4)'; c.lineWidth = 1.2;
                var birdFlyX = (t2 * 0.6) % (W + 120) - 60;
                if (season === 2) {
                  // V-formation of migrating geese
                  for (var bd = 0; bd < 7; bd++) {
                    var bdOffX = -bd * 14;
                    var bdOffY = Math.abs(bd - 3) * 6;
                    var bdx = birdFlyX + bdOffX;
                    var bdy = H * 0.16 + bdOffY + Math.sin(t2 * 0.01 + bd) * 1;
                    c.beginPath();
                    c.moveTo(bdx - 4, bdy + 1); c.quadraticCurveTo(bdx - 2, bdy - 2, bdx, bdy);
                    c.quadraticCurveTo(bdx + 2, bdy - 2, bdx + 4, bdy + 1);
                    c.stroke();
                  }
                } else {
                  // Single swallow or scattered swooping birds
                  for (var bd2 = 0; bd2 < 2; bd2++) {
                    var bdx2 = (birdFlyX + bd2 * 300) % (W + 80) - 40;
                    var bdy2 = H * 0.22 + Math.sin(t2 * 0.008 + bd2 * 2) * 12;
                    c.beginPath();
                    c.moveTo(bdx2 - 5, bdy2 + 1); c.quadraticCurveTo(bdx2 - 2, bdy2 - 3, bdx2, bdy2);
                    c.quadraticCurveTo(bdx2 + 2, bdy2 - 3, bdx2 + 5, bdy2 + 1);
                    c.stroke();
                  }
                }
              }

              // ── Ground flora: clover + dandelions scattered in grass ──
              if (season === 0 || season === 1) {
                // White clover (small triple dots)
                c.fillStyle = 'rgba(255,255,255,0.8)';
                for (var cl = 0; cl < 40; cl++) {
                  var clx = (cl * 31 + 17) % W;
                  var cly = H * 0.78 + (cl * 7) % (H * 0.20);
                  c.beginPath(); c.arc(clx, cly, 0.9, 0, 6.28); c.fill();
                  c.beginPath(); c.arc(clx + 1.3, cly, 0.9, 0, 6.28); c.fill();
                  c.beginPath(); c.arc(clx + 0.6, cly - 1.1, 0.9, 0, 6.28); c.fill();
                }
                // Dandelions (yellow heads with subtle green stem)
                c.fillStyle = '#facc15';
                for (var dd = 0; dd < 22; dd++) {
                  var ddx = (dd * 53 + 29) % W;
                  var ddy = H * 0.79 + (dd * 13) % (H * 0.18);
                  c.beginPath(); c.arc(ddx, ddy, 1.6, 0, 6.28); c.fill();
                  c.strokeStyle = '#65a30d'; c.lineWidth = 0.5;
                  c.beginPath(); c.moveTo(ddx, ddy + 1.5); c.lineTo(ddx, ddy + 5); c.stroke();
                }
              }

              // ── Autumn falling leaves ──
              if (season === 2) {
                var leafColors = ['#c2410c', '#ea580c', '#eab308', '#a16207', '#7c2d12'];
                for (var lf = 0; lf < 28; lf++) {
                  var lfFall = t2 * 0.6 + lf * 37;
                  var lfx = (lf * 53 + Math.sin(lfFall * 0.03 + lf) * 40) % W;
                  var lfy = (lfFall * 0.4 + lf * 13) % (H * 0.76);
                  var lfRot = lfFall * 0.05 + lf;
                  var lfCol = leafColors[lf % leafColors.length];
                  c.save(); c.translate(lfx, lfy); c.rotate(lfRot);
                  c.fillStyle = lfCol; c.globalAlpha = 0.85;
                  c.beginPath(); c.ellipse(0, 0, 3.5, 1.6, 0, 0, 6.28); c.fill();
                  c.globalAlpha = 1; c.restore();
                }
              }

              // ── Spring light rain (season 0, periodic) ──
              if (season === 0 && Math.sin(t2 * 0.0009) > 0.6) {
                c.strokeStyle = 'rgba(180,210,255,0.35)'; c.lineWidth = 0.8;
                for (var rd = 0; rd < 35; rd++) {
                  var rdx = (rd * 41 + t2 * 3) % W;
                  var rdy = (rd * 23 + t2 * 8) % (H * 0.76);
                  c.beginPath(); c.moveTo(rdx, rdy); c.lineTo(rdx - 2, rdy + 5); c.stroke();
                }
              }

              // ── Birdbath / bee water source (bees need ~1 cup of water per day) ──
              if (season !== 3) {
                var bbX = W * 0.42, bbY = H * 0.74;
                // Stone pedestal
                c.fillStyle = '#78716c';
                c.beginPath(); c.roundRect(bbX - 4, bbY - 2, 8, 14, 2); c.fill();
                c.fillStyle = '#a8a29e';
                c.fillRect(bbX - 4, bbY - 2, 8, 3);
                // Bowl
                c.fillStyle = '#57534e';
                c.beginPath(); c.ellipse(bbX, bbY - 6, 16, 5, 0, 0, 6.28); c.fill();
                c.fillStyle = '#78716c';
                c.beginPath(); c.ellipse(bbX, bbY - 7, 14, 4, 0, 0, 6.28); c.fill();
                // Water surface with shimmer
                var waterAlpha = 0.65 + Math.sin(t2 * 0.04) * 0.08;
                c.fillStyle = 'rgba(125,175,220,' + waterAlpha + ')';
                c.beginPath(); c.ellipse(bbX, bbY - 7, 13, 3.5, 0, 0, 6.28); c.fill();
                // Ripple rings
                var rippleR = (t2 * 0.3) % 10;
                c.strokeStyle = 'rgba(255,255,255,' + (0.4 - rippleR * 0.04) + ')'; c.lineWidth = 0.5;
                c.beginPath(); c.ellipse(bbX + Math.sin(t2 * 0.01) * 3, bbY - 7, rippleR, rippleR * 0.28, 0, 0, 6.28); c.stroke();
                // Tiny bees drinking at the rim (2 static)
                c.fillStyle = '#fbbf24';
                c.beginPath(); c.arc(bbX - 10, bbY - 6, 1.4, 0, 6.28); c.fill();
                c.beginPath(); c.arc(bbX + 9, bbY - 5.5, 1.4, 0, 6.28); c.fill();
                c.fillStyle = '#292524';
                c.fillRect(bbX - 10.3, bbY - 6.3, 0.6, 0.6);
                c.fillRect(bbX + 8.7, bbY - 5.8, 0.6, 0.6);
              }

              // ── Wooden garden fence along the ground ──
              c.fillStyle = season === 2 ? '#8a5f2a' : season === 3 ? '#6b4a1f' : '#a0763a';
              var fenceBaseY = H * 0.775;
              var fenceH = 8;
              // Horizontal rails
              c.fillRect(0, fenceBaseY, W, 1.5);
              c.fillRect(0, fenceBaseY + 4, W, 1.5);
              // Posts every ~80px
              for (var fp = 0; fp < W / 70; fp++) {
                var fpx = fp * 70 + 20;
                if (fpx < hiveX - 10 || fpx > hiveX + hiveW + 10) {
                  c.fillRect(fpx, fenceBaseY - 2, 2.5, fenceH);
                  // post top highlight
                  c.fillStyle = 'rgba(255,255,255,0.2)';
                  c.fillRect(fpx, fenceBaseY - 2, 1, fenceH);
                  c.fillStyle = season === 2 ? '#8a5f2a' : season === 3 ? '#6b4a1f' : '#a0763a';
                }
              }

              // ── Morning mist (low horizontal fog band, tied to time-of-day "warm" phase) ──
              if (season !== 3 && _tod > 0.2) {
                var mistAlpha = (_tod - 0.2) * 0.22;
                var mistGrad = c.createLinearGradient(0, H * 0.70, 0, H * 0.82);
                mistGrad.addColorStop(0, 'rgba(240,245,250,0)');
                mistGrad.addColorStop(0.5, 'rgba(240,245,250,' + mistAlpha + ')');
                mistGrad.addColorStop(1, 'rgba(240,245,250,0)');
                c.fillStyle = mistGrad;
                c.fillRect(0, H * 0.70, W, H * 0.12);
              }

              // ── Spider web on fence corner (decorative micro-detail, lower-right) ──
              if (season !== 3) {
                var webX = W * 0.95, webY = H * 0.78;
                c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.4;
                for (var wr = 0; wr < 5; wr++) {
                  c.beginPath(); c.arc(webX, webY, 3 + wr * 1.6, 2.3, 4.0); c.stroke();
                }
                for (var wsp = 0; wsp < 5; wsp++) {
                  var wa = 2.3 + wsp * 0.42;
                  c.beginPath(); c.moveTo(webX, webY); c.lineTo(webX + Math.cos(wa) * 11, webY + Math.sin(wa) * 11); c.stroke();
                }
              }

              // ── Apiary sign mounted on fence (right side) ──
              var signX = W * 0.58;
              var signY = H * 0.72;
              // Post
              c.fillStyle = '#6b4a1f'; c.fillRect(signX, signY - 4, 2.5, 22);
              // Sign board (two-tone wood)
              c.fillStyle = '#b5833a';
              c.beginPath(); c.roundRect(signX - 22, signY - 8, 48, 16, 2); c.fill();
              c.strokeStyle = '#6b4a1f'; c.lineWidth = 1;
              c.beginPath(); c.roundRect(signX - 22, signY - 8, 48, 16, 2); c.stroke();
              // Sign text
              c.font = 'bold 9px Georgia, serif'; c.fillStyle = '#3c2a10'; c.textAlign = 'center';
              c.fillText('🐝 APIARY', signX + 2, signY + 2);
              // Tiny chain/nails holding sign
              c.fillStyle = '#4b5563';
              c.beginPath(); c.arc(signX - 20, signY - 6, 0.7, 0, 6.28); c.fill();
              c.beginPath(); c.arc(signX + 24, signY - 6, 0.7, 0, 6.28); c.fill();

              // ── Apple tree near the hive (classic beekeeping companion plant) ──
              if (hiveX > 40) {
                var atX = hiveX * 0.55;
                var atY = H * 0.76;
                var atTrunkH = 48;
                // Trunk (textured bark)
                c.fillStyle = '#4a2f1a';
                c.fillRect(atX - 4, atY - atTrunkH, 8, atTrunkH);
                // Trunk highlight
                c.fillStyle = 'rgba(255,255,255,0.1)';
                c.fillRect(atX - 3, atY - atTrunkH, 1.5, atTrunkH);
                // Tree branches (a few visible stubs)
                c.strokeStyle = '#4a2f1a'; c.lineWidth = 2.5;
                c.beginPath();
                c.moveTo(atX - 3, atY - atTrunkH + 8); c.lineTo(atX - 12, atY - atTrunkH - 2);
                c.moveTo(atX + 3, atY - atTrunkH + 4); c.lineTo(atX + 14, atY - atTrunkH - 4);
                c.stroke();
                // Canopy (layered, seasonal)
                var canopyY = atY - atTrunkH - 4;
                var canBase = season === 2 ? '#a85820' : season === 3 ? '#7a7060' : season === 0 ? '#5fa85a' : '#3d8b4a';
                c.fillStyle = canBase;
                [[0, 0, 28], [-14, -6, 20], [14, -4, 22], [-6, -12, 18], [8, -14, 16]].forEach(function(b) {
                  c.beginPath(); c.arc(atX + b[0], canopyY + b[1], b[2], 0, 6.28); c.fill();
                });
                // Canopy highlight
                c.fillStyle = 'rgba(255,255,255,0.15)';
                c.beginPath(); c.arc(atX - 6, canopyY - 8, 7, 0, 6.28); c.fill();
                // Apples (red dots, only in summer/autumn — not spring blossom, not winter)
                if (season === 1 || season === 2) {
                  c.fillStyle = '#dc2626';
                  var apples = [[0, -2], [-10, -4], [10, -6], [-4, -14], [6, -12], [-14, 2], [12, 4]];
                  apples.forEach(function(a) {
                    c.beginPath(); c.arc(atX + a[0], canopyY + a[1], 1.8, 0, 6.28); c.fill();
                    // tiny highlight
                    c.fillStyle = 'rgba(255,255,255,0.4)';
                    c.beginPath(); c.arc(atX + a[0] - 0.6, canopyY + a[1] - 0.6, 0.5, 0, 6.28); c.fill();
                    c.fillStyle = '#dc2626';
                  });
                }
                // Spring blossoms (pink/white dots)
                if (season === 0) {
                  c.fillStyle = '#fce7f3';
                  var blossoms = [[-4, -8], [8, -10], [-12, -4], [14, 0], [0, -16], [-8, 4], [10, -2]];
                  blossoms.forEach(function(bl) {
                    c.beginPath(); c.arc(atX + bl[0], canopyY + bl[1], 1.3, 0, 6.28); c.fill();
                  });
                }
              }

              // ── Tree line (mid-ground, adds scale) ──
              for (var tr = 0; tr < 8; tr++) {
                var trX = 20 + tr * (W / 9) + (tr % 2 === 0 ? 0 : W * 0.5);
                if (trX < hiveX - 30 || trX > hiveX + hiveW + 30) {
                  var trY = H * 0.76;
                  var trH = 24 + (tr % 3) * 10;
                  // Trunk
                  c.fillStyle = season === 3 ? '#6b4226' : '#5a3820';
                  c.fillRect(trX - 2, trY - trH, 4, trH);
                  // Canopy
                  var canopyCol = season === 3 ? '#8a9a8e' : season === 2 ? '#c9602a' : season === 0 ? '#6bb567' : '#4a9f4a';
                  c.fillStyle = canopyCol;
                  c.beginPath(); c.arc(trX, trY - trH - 4, 10 + (tr % 3) * 3, 0, 6.28); c.fill();
                  // Highlight
                  c.fillStyle = 'rgba(255,255,255,0.12)';
                  c.beginPath(); c.arc(trX - 3, trY - trH - 7, 4, 0, 6.28); c.fill();
                }
              }

              // ── Hummingbird (spring/summer, flits between flowers, zips between hover points) ──
              if ((season === 0 || season === 1) && flowers && flowers.length > 0) {
                if (!_hummingbird) _initHummingbird();
                var hb = _hummingbird;
                hb.wp += 1.2; // wing beats very fast
                hb.hoverT++;
                // Pick a new flower target every ~120 frames
                if (hb.hoverT > 120) {
                  hb.hoverT = 0;
                  var tflower = flowers[Math.floor(Math.random() * flowers.length)];
                  hb.targetX = tflower.x + (Math.random() - 0.5) * 20;
                  hb.targetY = tflower.y - 12 - Math.random() * 10;
                }
                // Zip toward target (fast)
                hb.x += (hb.targetX - hb.x) * 0.06;
                hb.y += (hb.targetY - hb.y) * 0.06;
                var hbx = hb.x + Math.sin(t2 * 0.08) * 1.5; // tiny hover jitter
                var hby = hb.y + Math.cos(t2 * 0.09) * 1.0;
                // Long beak
                c.strokeStyle = '#292524'; c.lineWidth = 0.8;
                c.beginPath(); c.moveTo(hbx + 3, hby); c.lineTo(hbx + 8, hby + 0.5); c.stroke();
                // Iridescent body (green/blue gradient emulation)
                c.save(); c.shadowColor = '#10b981'; c.shadowBlur = 4;
                c.fillStyle = '#059669';
                c.beginPath(); c.ellipse(hbx, hby, 3.8, 1.8, 0, 0, 6.28); c.fill();
                c.restore();
                // Ruby throat patch
                c.fillStyle = '#dc2626';
                c.beginPath(); c.arc(hbx + 1.5, hby + 0.6, 0.9, 0, 6.28); c.fill();
                // Blurred wings (two semi-transparent ellipses oscillating up/down)
                var hbwing = Math.sin(hb.wp) * 2.8;
                c.globalAlpha = 0.3; c.fillStyle = '#e0f2fe';
                c.beginPath(); c.ellipse(hbx - 1, hby - 1 + hbwing, 4.5, 1.4, 0.4, 0, 6.28); c.fill();
                c.beginPath(); c.ellipse(hbx - 1, hby - 1 - hbwing, 4.5, 1.4, -0.4, 0, 6.28); c.fill();
                c.globalAlpha = 1;
                // Tail fan
                c.strokeStyle = '#064e3b'; c.lineWidth = 0.6;
                for (var tf = -1; tf <= 1; tf++) {
                  c.beginPath(); c.moveTo(hbx - 3, hby);
                  c.lineTo(hbx - 6, hby + tf * 1.5); c.stroke();
                }
              }

              // ── Butterflies (non-bee pollinators, spring/summer only) ──
              if (season === 0 || season === 1) {
                if (!_butterflies) _initButterflies();
                _butterflies.forEach(function(bf) {
                  bf.x += bf.vx; bf.ph += 0.05; bf.wp += 0.35;
                  if (bf.x > W + 60) { bf.x = -60; bf.y = H * 0.28 + Math.random() * H * 0.30; }
                  var bfy = bf.y + Math.sin(bf.ph) * bf.amp;
                  var wspan = 4 + Math.abs(Math.sin(bf.wp)) * 4; // wing beats
                  // Body
                  c.fillStyle = '#1e293b';
                  c.fillRect(bf.x - 0.5, bfy - 2, 1, 4);
                  // Wings
                  c.fillStyle = bf.col; c.globalAlpha = 0.85;
                  c.beginPath(); c.ellipse(bf.x - wspan * 0.4, bfy - 0.5, wspan * 0.5, wspan * 0.35, -0.3, 0, 6.28); c.fill();
                  c.beginPath(); c.ellipse(bf.x + wspan * 0.4, bfy - 0.5, wspan * 0.5, wspan * 0.35, 0.3, 0, 6.28); c.fill();
                  // Wing spots
                  c.fillStyle = '#fff'; c.globalAlpha = 0.5;
                  c.beginPath(); c.arc(bf.x - wspan * 0.45, bfy - 0.5, 0.6, 0, 6.28); c.fill();
                  c.beginPath(); c.arc(bf.x + wspan * 0.45, bfy - 0.5, 0.6, 0, 6.28); c.fill();
                  c.globalAlpha = 1;
                });
              }

              // ── Flowers (enhanced with depth) ──
              flowers.forEach(function(fl) {
                if (season === 3) return;
                var sw = Math.sin(t2 * 0.012 + fl.sp) * 2.5;
                var bsz = fl.sz * (season === 1 ? 1.3 : season === 2 ? 0.7 : 1.0);
                // Stem with leaf
                c.strokeStyle = '#16a34a'; c.lineWidth = 1.8;
                c.beginPath(); c.moveTo(fl.x, fl.y + 14); c.quadraticCurveTo(fl.x + sw * 0.6, fl.y + 7, fl.x + sw, fl.y); c.stroke();
                // Small leaf
                c.fillStyle = '#22c55e'; c.globalAlpha = 0.7;
                c.beginPath(); c.ellipse(fl.x + sw * 0.3, fl.y + 8, 3, 1.5, sw * 0.2, 0, 6.28); c.fill();
                c.globalAlpha = 1;
                // Petals (6-petal with glow)
                c.save(); c.shadowColor = fl.col; c.shadowBlur = 3;
                for (var p = 0; p < 6; p++) {
                  var pa = p * 1.047 + t2 * 0.002;
                  c.fillStyle = fl.col; c.beginPath();
                  c.ellipse(fl.x + sw + Math.cos(pa) * bsz * 0.45, fl.y + Math.sin(pa) * bsz * 0.45, bsz * 0.35, bsz * 0.18, pa, 0, 6.28);
                  c.fill();
                }
                c.restore();
                // Center
                c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(fl.x + sw, fl.y, bsz * 0.22, 0, 6.28); c.fill();
              });

              // ── Wooden hive stand (elevates hive off ground — protects from ants + damp) ──
              var standY = hiveY + hiveH + 4;
              var standW = hiveW * 1.08;
              var standX = hiveX - (standW - hiveW) / 2;
              // Legs
              c.fillStyle = '#6b4a1f';
              c.fillRect(standX + 4, standY, 4, 12);
              c.fillRect(standX + standW - 8, standY, 4, 12);
              // Cross brace
              c.fillStyle = '#8a6a2f';
              c.fillRect(standX + 2, standY + 2, standW - 4, 3);
              // Highlight
              c.fillStyle = 'rgba(255,255,255,0.15)';
              c.fillRect(standX + 2, standY + 2, standW - 4, 1);

              // ── Hive (detailed cross-section with 3D-ish look) ──
              // Shadow
              c.fillStyle = 'rgba(0,0,0,0.12)';
              c.beginPath(); c.roundRect(hiveX + 3, hiveY + 3, hiveW, hiveH, 10); c.fill();
              // Body
              var hg = c.createLinearGradient(hiveX, hiveY, hiveX + hiveW, hiveY + hiveH);
              hg.addColorStop(0, '#a07810'); hg.addColorStop(0.5, '#c9a030'); hg.addColorStop(1, '#8a6508');
              c.fillStyle = hg; c.beginPath(); c.roundRect(hiveX, hiveY, hiveW, hiveH, 10); c.fill();
              // Inner
              c.fillStyle = '#d4aa40'; c.beginPath(); c.roundRect(hiveX + 4, hiveY + 4, hiveW - 8, hiveH - 8, 7); c.fill();
              // Highlight
              c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(hiveX + 5, hiveY + 5, hiveW - 10, 12);
              // Painted hive number/name plaque (top-left of hive)
              c.save();
              c.fillStyle = 'rgba(50,30,10,0.5)';
              c.beginPath(); c.roundRect(hiveX + 3, hiveY + 3, 24, 9, 2); c.fill();
              c.font = 'bold 7px Georgia, serif'; c.fillStyle = '#fef3c7'; c.textAlign = 'center';
              c.fillText('HIVE #1', hiveX + 15, hiveY + 10);
              c.restore();

              // Honeycomb grid (larger, more visible)
              var csz = 6;
              var hpct = Math.min(1, safeHoney / 60);
              var bpct = Math.min(1, (brood || 3000) / 8000);
              for (var hy2 = 0; hy2 < 7; hy2++) {
                for (var hx = 0; hx < 5; hx++) {
                  var cx2 = hiveX + 12 + hx * (csz * 2.2) + (hy2 % 2) * csz * 1.1;
                  var cy2 = hiveY + 16 + hy2 * (csz * 1.8);
                  var ct = (hy2 < 2) ? (hx / 5 < hpct ? 'honey' : 'empty') : (hy2 < 5) ? (hx / 5 < bpct ? 'brood' : 'empty') : (hx / 5 < hpct * 0.7 ? 'pollen' : 'empty');
                  c.fillStyle = ct === 'honey' ? '#f59e0b' : ct === 'brood' ? '#fdba74' : ct === 'pollen' ? '#facc15' : '#e8d5a0';
                  c.globalAlpha = ct === 'empty' ? 0.35 : 0.85;
                  c.beginPath();
                  for (var hh = 0; hh < 6; hh++) {
                    var ha = hh * 1.047 + 0.524;
                    var px = cx2 + Math.cos(ha) * csz, py = cy2 + Math.sin(ha) * csz;
                    hh === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
                  }
                  c.closePath(); c.fill();
                  c.strokeStyle = '#a07810'; c.lineWidth = 0.4; c.globalAlpha = 0.5; c.stroke();
                }
              }
              c.globalAlpha = 1;

              // Entrance
              c.fillStyle = '#2a1a04';
              c.beginPath(); c.roundRect(hiveX + hiveW * 0.28, hiveY + hiveH - 3, hiveW * 0.44, 7, 3); c.fill();
              // Landing board
              c.fillStyle = '#8a6508'; c.fillRect(hiveX + hiveW * 0.2, hiveY + hiveH + 1, hiveW * 0.6, 3);

              // ── Guard bees on the landing board (static sentries, face the entrance) ──
              var lbY = hiveY + hiveH + 0.5;
              var lbL = hiveX + hiveW * 0.24, lbR = hiveX + hiveW * 0.76;
              // 3 guards: 2 at edges + 1 closer to center
              var guards = [
                { x: lbL + 2, face: 1 },
                { x: lbR - 2, face: -1 },
                { x: hiveX + hiveW * 0.38, face: 1 }
              ];
              guards.forEach(function(g) {
                var gwing = Math.sin(t2 * 0.15 + g.x) * 0.6;
                // Body
                c.save(); c.shadowColor = '#fbbf24'; c.shadowBlur = 2;
                c.fillStyle = '#fbbf24';
                c.beginPath(); c.ellipse(g.x, lbY, 3.2, 2.0, 0, 0, 6.28); c.fill();
                c.restore();
                // Stripes
                c.fillStyle = '#292524';
                c.fillRect(g.x - 0.4, lbY - 1.8, 0.7, 3.6);
                c.fillRect(g.x + 0.8 * g.face, lbY - 1.5, 0.6, 3);
                // Antennae
                c.strokeStyle = '#292524'; c.lineWidth = 0.5;
                c.beginPath();
                c.moveTo(g.x + 1.8 * g.face, lbY - 1.4);
                c.lineTo(g.x + 2.7 * g.face, lbY - 2.4 + gwing);
                c.moveTo(g.x + 1.8 * g.face, lbY - 1.4);
                c.lineTo(g.x + 3.1 * g.face, lbY - 2.0 + gwing);
                c.stroke();
              });

              // ── Beekeeper tools leaning against the hive (smoker + hive tool) ──
              var toolX = hiveX - 10;
              var toolY = hiveY + hiveH - 18;
              // Smoker body (canister)
              c.fillStyle = '#44403c'; c.fillRect(toolX, toolY, 8, 16);
              c.fillStyle = '#57534e'; c.fillRect(toolX, toolY, 8, 2);
              c.fillStyle = '#292524'; c.fillRect(toolX + 1, toolY + 3, 6, 10);
              // Smoker bellows (small lighter rectangle at back)
              c.fillStyle = '#78350f'; c.fillRect(toolX + 8, toolY + 6, 4, 8);
              // Smoke puff
              c.fillStyle = 'rgba(220,220,220,0.5)';
              for (var sm = 0; sm < 3; sm++) {
                var smY = toolY - 3 - sm * 4 + Math.sin(t2 * 0.03 + sm) * 1;
                c.beginPath(); c.arc(toolX + 4 + Math.sin(t2 * 0.02 + sm) * 2, smY, 2 + sm * 0.8, 0, 6.28); c.fill();
              }
              // Hive tool (J-shaped metal bar)
              c.fillStyle = '#9ca3af';
              c.fillRect(toolX - 5, toolY + 4, 2, 14);
              c.fillRect(toolX - 5, toolY + 16, 4, 2);

              // Hive labels
              c.font = 'bold 9px system-ui'; c.fillStyle = '#fff'; c.textAlign = 'center';
              c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 2;
              c.fillText('\uD83C\uDF6F ' + Math.round(safeHoney) + ' lbs', hiveX + hiveW * 0.5, hiveY + 14);
              c.font = '7px system-ui'; c.fillStyle = '#fef3c7';
              c.fillText(Math.round(safeWorkers).toLocaleString() + ' workers', hiveX + hiveW * 0.5, hiveY + hiveH - 10);
              c.shadowBlur = 0;

              // Queen crown
              if (queenHealth > 0) {
                var qx = hiveX + hiveW * 0.5, qy = hiveY + hiveH * 0.55;
                c.font = '12px system-ui'; c.fillText('\uD83D\uDC51', qx, qy);
                // Health bar
                c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(qx - 14, qy + 4, 28, 4);
                c.fillStyle = queenHealth > 60 ? '#22c55e' : queenHealth > 30 ? '#eab308' : '#ef4444';
                c.fillRect(qx - 14, qy + 4, 28 * (queenHealth / 100), 4);
              }

              // Varroa mites (pulsing red dots)
              if (varroaLevel > 15) {
                var miteAlpha = 0.4 + Math.sin(t2 * 0.06) * 0.3;
                c.fillStyle = '#dc2626'; c.globalAlpha = miteAlpha;
                for (var mi = 0; mi < Math.min(10, Math.floor(varroaLevel / 8)); mi++) {
                  c.beginPath(); c.arc(hiveX + 10 + Math.random() * (hiveW - 20), hiveY + 10 + Math.random() * (hiveH - 20), 1.8, 0, 6.28); c.fill();
                }
                c.globalAlpha = 1;
              }

              // ── Waggle dance figure-8 at hive entrance (when foragers return) ──
              if (season !== 3) {
                var wagT = t2 * 0.04;
                var wagX = hiveX + hiveW * 0.5, wagY = hiveY + hiveH * 0.75;
                c.save(); c.globalAlpha = 0.15;
                c.strokeStyle = '#fbbf24'; c.lineWidth = 1;
                c.beginPath();
                for (var wt = 0; wt < 60; wt++) {
                  var wAngle = (wt / 60) * 6.28 + wagT;
                  var wx = wagX + Math.sin(wAngle) * 6;
                  var wy2 = wagY + Math.sin(wAngle * 2) * 4;
                  wt === 0 ? c.moveTo(wx, wy2) : c.lineTo(wx, wy2);
                }
                c.stroke();
                // Dancing bee dot
                c.globalAlpha = 0.6; c.fillStyle = '#fbbf24';
                c.beginPath(); c.arc(wagX + Math.sin(wagT * 2) * 6, wagY + Math.sin(wagT * 4) * 4, 2, 0, 6.28); c.fill();
                c.restore();
              }

              // ── Pollen trail from flowers to hive (pollination feedback) ──
              if (gardenBonus > 0 && season !== 3) {
                var numParticles = Math.min(15, Math.floor(gardenBonus / 3));
                c.fillStyle = '#facc15'; c.globalAlpha = 0.4;
                for (var pt = 0; pt < numParticles; pt++) {
                  var ptProgress = ((t2 * 0.01 + pt * 0.07) % 1);
                  var ptX = W * 0.65 + (hiveX + hiveW * 0.5 - W * 0.65) * ptProgress + Math.sin(t2 * 0.02 + pt * 2) * 8;
                  var ptY = H * 0.6 + (hiveY + hiveH * 0.3 - H * 0.6) * ptProgress + Math.cos(t2 * 0.03 + pt * 1.5) * 5;
                  var ptSz = 1 + Math.sin(ptProgress * 3.14) * 1.5;
                  c.beginPath(); c.arc(ptX, ptY, ptSz, 0, 6.28); c.fill();
                }
                c.globalAlpha = 1;
              }

              // ── Bee shadows on ground (render BEFORE bees for proper layering) ──
              c.fillStyle = 'rgba(0,0,0,0.18)';
              bees.forEach(function(b) {
                var altitude = Math.max(0, H * 0.76 - b.y);  // how high above ground
                if (altitude > 4 && altitude < 260) {
                  var shadowScale = Math.max(0.3, 1 - altitude / 280);
                  c.save(); c.globalAlpha = 0.15 + shadowScale * 0.18;
                  c.beginPath(); c.ellipse(b.x + altitude * 0.08, H * 0.765, b.sz * shadowScale * 1.2, b.sz * shadowScale * 0.35, 0, 0, 6.28); c.fill();
                  c.restore();
                }
              });

              // ── Flying bees (physics-based, with waggle dance trail) ──
              bees.forEach(function(b) {
                var tX = b.toFlower ? (W * 0.6 + Math.sin(b.ph) * W * 0.15) : (hiveX + hiveW * 0.5);
                var tY = b.toFlower ? (H * 0.55 + Math.cos(b.ph * 0.7) * 18) : (hiveY + hiveH - 4);
                // Slower, gentler physics: reduced seek force + jitter + more damping.
                // Bumblebees move even slower (heavier) — 60% seek, 70% jitter.
                var _seek = b.bumble ? 0.0012 : 0.002;
                var _jit = b.bumble ? 0.08 : 0.12;
                b.vx += (tX - b.x) * _seek + (Math.random() - 0.5) * _jit;
                b.vy += (tY - b.y) * _seek + (Math.random() - 0.5) * (_jit * 0.75);
                b.vx *= 0.93; b.vy *= 0.93;
                // Cap top speed (lower for bumbles).
                var _cap = b.bumble ? 0.95 : 1.4;
                var _sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (_sp > _cap) { b.vx *= _cap / _sp; b.vy *= _cap / _sp; }
                b.x += b.vx; b.y += b.vy;
                if (Math.abs(b.x - tX) < 12 && Math.abs(b.y - tY) < 12) {
                  b.toFlower = !b.toFlower;
                  b.carry = !b.toFlower;
                }
                b.wp += 0.45;
                var angle = Math.atan2(b.vy, b.vx);

                // Flight trail (fading dots behind bee)
                if (Math.hypot(b.vx, b.vy) > 0.4) {
                  c.fillStyle = 'rgba(251,191,36,0.12)';
                  c.beginPath(); c.arc(b.x - b.vx * 3, b.y - b.vy * 3, 1.2, 0, 6.28); c.fill();
                  c.beginPath(); c.arc(b.x - b.vx * 6, b.y - b.vy * 6, 0.8, 0, 6.28); c.fill();
                }

                // Body glow
                c.save();
                c.shadowColor = b.bumble ? '#fb923c' : '#fbbf24';
                c.shadowBlur = b.bumble ? 5 : 3;
                c.fillStyle = b.bumble ? '#fb923c' : '#fbbf24';
                c.beginPath();
                // Bumblebees are rounder (0.7 aspect) vs worker bees (0.6)
                c.ellipse(b.x, b.y, b.sz, b.sz * (b.bumble ? 0.75 : 0.6), angle, 0, 6.28); c.fill();
                c.restore();
                // Fuzz halo for bumblebees (small translucent outer ring)
                if (b.bumble) {
                  c.save(); c.globalAlpha = 0.25; c.fillStyle = '#fdba74';
                  c.beginPath(); c.ellipse(b.x, b.y, b.sz * 1.25, b.sz * 0.95, angle, 0, 6.28); c.fill();
                  c.restore();
                }
                // Stripes — bumblebees get THREE bold stripes, workers keep two
                c.fillStyle = '#292524';
                c.save(); c.translate(b.x, b.y); c.rotate(angle);
                if (b.bumble) {
                  c.fillRect(-b.sz * 0.5, -b.sz * 0.5, b.sz * 0.22, b.sz);
                  c.fillRect(-b.sz * 0.05, -b.sz * 0.5, b.sz * 0.22, b.sz);
                  c.fillRect(b.sz * 0.4, -b.sz * 0.4, b.sz * 0.2, b.sz * 0.8);
                } else {
                  c.fillRect(-b.sz * 0.15, -b.sz * 0.5, b.sz * 0.25, b.sz);
                  c.fillRect(b.sz * 0.25, -b.sz * 0.4, b.sz * 0.2, b.sz * 0.8);
                }
                c.restore();
                // Wings (animated, translucent)
                var wy = Math.sin(b.wp) * 2.5;
                c.globalAlpha = 0.35; c.fillStyle = '#bfdbfe';
                c.beginPath(); c.ellipse(b.x - Math.sin(angle) * 2, b.y - b.sz * 0.4 + wy, b.sz * 0.55, b.sz * 0.25, angle - 0.4, 0, 6.28); c.fill();
                c.beginPath(); c.ellipse(b.x + Math.sin(angle) * 1, b.y - b.sz * 0.5 - wy * 0.5, b.sz * 0.4, b.sz * 0.2, angle + 0.3, 0, 6.28); c.fill();
                c.globalAlpha = 1;
                // Pollen sacs (larger when garden bonus active)
                if (b.carry) {
                  var pollenSz = gardenBonus > 10 ? 2.4 : 1.8;
                  c.fillStyle = '#f59e0b'; c.beginPath();
                  c.arc(b.x + Math.cos(angle + 1.5) * b.sz * 0.5, b.y + Math.sin(angle + 1.5) * b.sz * 0.5, pollenSz, 0, 6.28); c.fill();
                }
              });

              // ── Bees at entrance (entering/exiting animation) ──
              var entrX = hiveX + hiveW * 0.5, entrY = hiveY + hiveH + 2;
              for (var ei = 0; ei < Math.min(8, Math.floor(safeWorkers / 2000)); ei++) {
                var ePhase = (t2 * 0.02 + ei * 1.3) % 6.28;
                var eDist = Math.sin(ePhase) * 18;
                var eDir = Math.cos(ePhase) > 0 ? 1 : -1;
                var ex = entrX + eDist * eDir + Math.sin(t2 * 0.05 + ei) * 3;
                var ey = entrY + 3 - Math.abs(Math.sin(ePhase)) * 8;
                c.fillStyle = '#fbbf24'; c.globalAlpha = 0.7;
                c.beginPath(); c.ellipse(ex, ey, 2, 1.3, eDir * 0.3, 0, 6.28); c.fill();
                c.fillStyle = '#292524'; c.fillRect(ex - 0.5, ey - 1, 1, 2);
                c.globalAlpha = 1;
              }

              // ── Hive ambient glow (warm golden aura) ──
              c.save();
              var hGlow = c.createRadialGradient(hiveX + hiveW / 2, hiveY + hiveH / 2, hiveW * 0.3, hiveX + hiveW / 2, hiveY + hiveH / 2, hiveW * 0.9);
              hGlow.addColorStop(0, 'rgba(251,191,36,0.06)');
              hGlow.addColorStop(1, 'rgba(251,191,36,0)');
              c.fillStyle = hGlow;
              c.beginPath(); c.arc(hiveX + hiveW / 2, hiveY + hiveH / 2, hiveW * 0.9, 0, 6.28); c.fill();
              c.restore();

              // ── Vignette overlay (soft dark edges) ──
              var vig = c.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
              vig.addColorStop(0, 'rgba(0,0,0,0)');
              vig.addColorStop(1, 'rgba(0,0,0,0.15)');
              c.fillStyle = vig; c.fillRect(0, 0, W, H);

              // ── HUD overlay (glass morphism style) ──
              c.save();
              c.fillStyle = 'rgba(15,23,42,0.6)';
              c.beginPath(); c.roundRect(W - 138, 4, 132, 56, 10); c.fill();
              c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 1;
              c.beginPath(); c.roundRect(W - 138, 4, 132, 56, 10); c.stroke();
              c.font = 'bold 10px system-ui'; c.fillStyle = '#fbbf24'; c.textAlign = 'right';
              c.fillText(seasonNames[season] + ' \u2022 Day ' + day, W - 12, 20);
              c.font = '8px system-ui'; c.fillStyle = '#e2e8f0';
              c.fillText('Year ' + year + ' \u2022 \uD83D\uDC1D ' + Math.round(safeWorkers).toLocaleString(), W - 12, 33);
              c.fillText('\uD83C\uDF6F ' + Math.round(safeHoney) + ' lbs \u2022 \u2764\uFE0F ' + (morale || 0) + '% \u2022 \uD83E\uDDA0 ' + (varroaLevel || 0) + '%', W - 12, 46);
              c.restore();

              // Garden bonus badge
              if (gardenPollinators > 0) {
                c.save(); c.fillStyle = 'rgba(16,185,129,0.7)';
                c.beginPath(); c.roundRect(6, H - 22, 110, 17, 8); c.fill();
                c.font = 'bold 8px system-ui'; c.fillStyle = '#fff'; c.textAlign = 'left';
                c.fillText('\uD83C\uDF31 Garden +' + gardenBonus + '% foraging', 12, H - 10);
                c.restore();
              }
            } catch(e) { console.error('[Beehive] draw error:', e); }
            _animId.current = requestAnimationFrame(frame);
          }
          // Start animation loop (only if not already running)
          _loopRunning.current = true;
          if (_animId.current) cancelAnimationFrame(_animId.current);
          console.log('[Beehive DEBUG] Starting frame loop. canvas size=' + cv.width + 'x' + cv.height + ', W=' + W + ' H=' + H);
          frame();
          // Log first frame completion after a short delay
          setTimeout(function() {
            console.log('[Beehive DEBUG] After 200ms: _tick=' + _tick.current + ', bees=' + (_bees.current ? _bees.current.length : 'NULL') + ', _animId=' + _animId.current);
          }, 200);

          return function() {
            _loopRunning.current = false;
            if (_animId.current) cancelAnimationFrame(_animId.current);
            if (resizeObs) resizeObs.disconnect();
          };
          } // end doSetup
          tryInit();
          return function() {
            if (retryTimer) clearTimeout(retryTimer);
            if (teardownFn) teardownFn();
          };
        }, [viewMode]);

        // ── Keyboard shortcuts (ref-based to read latest state) ──
        var _keyState = React.useRef({});
        _keyState.current = { colonySurvived: colonySurvived, quizOpen: quizOpen, showInspect: showInspect, showBadges: showBadges, soundOn: soundOn, viewMode: viewMode };
        React.useEffect(function() {
          function onKey(e) {
            // Don't capture when typing in inputs
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
            var ks = _keyState.current;
            // Only active in beekeeper mode — drone/queen modes own their own key handling
            if (ks.viewMode !== 'beekeeper') return;
            if (ks.quizOpen) return; // Don't capture shortcuts during quiz
            var key = e.key.toLowerCase();
            if (key === 'n') { e.preventDefault(); if (ks.colonySurvived) advanceDay(); }
            else if (key === 't') { e.preventDefault(); treatVarroa(); }
            else if (key === 's') { e.preventDefault(); addSuper(); }
            else if (key === 'h') { e.preventDefault(); harvestHoney(); }
            else if (key === 'f') { e.preventDefault(); feedBees(); }
            else if (key === 'i') { e.preventDefault(); upd('showInspect', !ks.showInspect); }
            else if (key === 'q') { e.preventDefault(); startQuiz(); }
            else if (key === 'b') { e.preventDefault(); upd('showBadges', !ks.showBadges); }
            else if (key === 'm') { e.preventDefault(); upd('soundOn', !ks.soundOn); }
            else if (key === '5') { e.preventDefault(); if (ks.colonySurvived) advanceDays(5); }
            else if (key === '3') { e.preventDefault(); if (ks.colonySurvived) advanceDays(30); }
            else if (key === '?') { e.preventDefault(); upd('showKeys', true); }
          }
          document.addEventListener('keydown', onKey);
          return function() { document.removeEventListener('keydown', onKey); };
        }, []);

        // ═══════════════════════════════════════════════════════════════
        // ═══ DRONE FLIGHT MODE — Pseudo-3D nuptial flight experience ═══
        // ═══════════════════════════════════════════════════════════════
        var _droneCvRef = React.useRef(null);
        var _droneAnimId = React.useRef(0);
        var _droneKeys = React.useRef({});
        var _droneState = React.useRef({
          x: 0, y: 80, z: 0,       // position (y = altitude)
          vx: 0, vy: 0, vz: 0,     // velocity
          yaw: 0, pitch: 0,         // facing direction
          speed: 0,
          energy: 100,              // flight stamina
          phase: 'launch',          // launch | flight | congregation | mating | end
          matingTarget: null,
          nearQueens: [],
          obstacles: [],
          flowers: [],
          clouds: [],
          drones: [],               // other drones
          score: 0,
          distance: 0,
          maxAlt: 80,
          timer: 120,               // seconds of flight time
          facts: [],                // science facts shown
          factIdx: 0
        });

        // Drone flight science facts
        var DRONE_FACTS = [
          '🚀 Drones have larger eyes than workers — better for spotting queens mid-flight at 200+ feet altitude.',
          '💨 A drone\'s flight muscles are the most powerful per body weight in the insect world.',
          '🧬 Drones are haploid — they have only 16 chromosomes (workers have 32). They develop from unfertilized eggs.',
          '❤️ Mating is instantly fatal for the drone — the endophallus ruptures and remains with the queen.',
          '👁️ Drones have 8,600 facets per compound eye vs 6,900 for workers — optimized for tracking queens in flight.',
          '🌡️ Drone Congregation Areas (DCAs) form at 15-40 meters altitude. The same aerial spots are used year after year.',
          '🏠 Drones cannot feed themselves — workers must feed them. They have no wax glands, no pollen baskets, no stinger.',
          '🎯 Only 1 in 1,000 drones successfully mates. The rest die of exhaustion or are evicted in autumn.',
          '⏱️ A drone\'s mating flight lasts about 30 minutes. He can fly up to 8 km from the hive.',
          '🧪 Queens release 9-ODA pheromone during flight — drones detect it with specialized antennae at 60+ meters.'
        ];

        var droneData = d.drone || {};
        var droneHighScore = droneData.highScore || 0;
        var droneFlightActive = droneData.active || false;
        var droneDifficulty = droneData.difficulty || 'normal'; // easy | normal | hard

        function startDroneFlight(diff) {
          var difficulty = diff || droneDifficulty;
          var timerByDiff = { easy: 150, normal: 110, hard: 75 };
          var queenDistByDiff = { easy: 800, normal: 1200, hard: 1800 };
          var energyByDiff = { easy: 120, normal: 100, hard: 80 };
          // Generate world
          var obs = [], fls = [], clds = [], otherDrones = [], thermals = [], birds = [];
          for (var oi = 0; oi < 40; oi++) obs.push({ x: (Math.random() - 0.5) * 800, z: -200 - Math.random() * 2500, type: ['tree', 'pole', 'building', 'tree', 'tree'][Math.floor(Math.random() * 5)], h: 30 + Math.random() * 80 });
          for (var fi = 0; fi < 60; fi++) fls.push({ x: (Math.random() - 0.5) * 600, z: -100 - Math.random() * 2000, col: ['#f472b6','#fbbf24','#a78bfa','#fb923c','#34d399','#f87171','#60a5fa'][fi % 7], hasPollen: Math.random() > 0.6, collected: false });
          for (var ci = 0; ci < 20; ci++) clds.push({ x: (Math.random() - 0.5) * 1000, y: 140 + Math.random() * 100, z: -300 - Math.random() * 2500, w: 40 + Math.random() * 70 });
          for (var di = 0; di < 18; di++) otherDrones.push({ x: (Math.random() - 0.5) * 300, y: 80 + Math.random() * 120, z: -600 - Math.random() * 1000, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5), vz: -1.5 - Math.random() * 2.5 });
          // Thermal updrafts — rising air columns that give free altitude
          for (var ti = 0; ti < 8; ti++) thermals.push({ x: (Math.random() - 0.5) * 600, z: -300 - Math.random() * 1800, radius: 25 + Math.random() * 30, strength: 3 + Math.random() * 4 });
          // Predator birds — avoid these!
          var numBirds = difficulty === 'hard' ? 5 : difficulty === 'normal' ? 3 : 1;
          for (var bi = 0; bi < numBirds; bi++) birds.push({ x: (Math.random() - 0.5) * 400, y: 60 + Math.random() * 100, z: -400 - Math.random() * 1200, vx: (Math.random() - 0.5) * 3, vy: Math.sin(bi) * 0.5, vz: -1 - Math.random() * 2, wingPhase: Math.random() * 6.28 });
          var qDist = queenDistByDiff[difficulty] || 1200;
          _droneState.current = {
            x: 0, y: 10, z: 0, vx: 0, vy: 2, vz: -2, yaw: 0, pitch: -0.1,
            speed: 0, energy: energyByDiff[difficulty] || 100, phase: 'launch',
            matingTarget: null,
            nearQueens: [{ x: (Math.random() - 0.5) * 150, y: 150 + Math.random() * 50, z: -qDist - Math.random() * 400, caught: false }],
            obstacles: obs, flowers: fls, clouds: clds, drones: otherDrones,
            thermals: thermals, birds: birds,
            pollenCollected: 0, pollenGoal: 5,
            score: 0, distance: 0, maxAlt: 10,
            timer: timerByDiff[difficulty] || 110,
            facts: [], factIdx: 0, difficulty: difficulty,
            hitFlash: 0 // red flash when hit by bird
          };
          updAll({ drone: Object.assign({}, droneData, { active: true, difficulty: difficulty }) });
        }

        // Drone flight canvas
        React.useEffect(function() {
          if (viewMode !== 'drone' || !droneFlightActive) return;
          // Ref-ready retry — prevents blank canvas when ref attaches late.
          var tries = 0;
          var retryTimer = null;
          var teardownFn = null;
          function tryInit() {
            var cv = _droneCvRef.current;
            if (!cv) {
              if (tries++ < 12) retryTimer = setTimeout(tryInit, 50);
              else console.warn('[Beehive] drone canvas ref never attached');
              return;
            }
            var c = cv.getContext('2d');
            if (!c) {
              if (tries++ < 12) retryTimer = setTimeout(tryInit, 50);
              return;
            }
            teardownFn = doSetup(cv, c);
          }
          function doSetup(cv, c) {
          var par = cv.parentElement;
          var W = (par ? par.clientWidth : 500) || 500;
          var H = (par ? par.clientHeight : 400) || 400;
          cv.width = W * 2; cv.height = H * 2;
          c.setTransform(2, 0, 0, 2, 0, 0);

          var ds = _droneState.current;
          var lastTime = performance.now();
          var factTimer = 0;

          function droneFrame(now) {
            var dt = Math.min(0.05, (now - lastTime) / 1000);
            lastTime = now;
            var keys = _droneKeys.current;

            // ── Update drone physics ──
            if (ds.phase !== 'end') {
              ds.timer -= dt;
              if (ds.timer <= 0) { ds.phase = 'end'; ds.timer = 0; }

              // Controls
              var thrust = 0, turn = 0, pitchD = 0;
              if (keys.ArrowUp || keys.w) thrust = 5;
              if (keys.ArrowDown || keys.s) thrust = -3;
              if (keys.ArrowLeft || keys.a) turn = 2.5;
              if (keys.ArrowRight || keys.d) turn = -2.5;
              if (keys[' '] || keys.Shift) pitchD = keys[' '] ? 1.5 : -1.5;

              ds.yaw += turn * dt;
              ds.pitch = Math.max(-0.6, Math.min(0.6, ds.pitch + pitchD * dt));

              // Thrust along facing direction
              var fwdX = Math.sin(ds.yaw), fwdZ = -Math.cos(ds.yaw);
              ds.vx += fwdX * thrust * dt;
              ds.vz += fwdZ * thrust * dt;
              ds.vy += (pitchD * 2 + (ds.phase === 'launch' ? 4 : 0)) * dt;
              ds.vy -= 2.0 * dt; // gravity

              // Drag
              ds.vx *= 0.97; ds.vy *= 0.97; ds.vz *= 0.97;

              // Apply velocity
              ds.x += ds.vx; ds.y += ds.vy; ds.z += ds.vz;
              ds.y = Math.max(2, ds.y);
              ds.speed = Math.sqrt(ds.vx * ds.vx + ds.vz * ds.vz);
              ds.distance += ds.speed * dt;
              ds.maxAlt = Math.max(ds.maxAlt, ds.y);

              // Energy drain
              ds.energy = Math.max(0, ds.energy - (thrust > 0 ? 0.8 : 0.15) * dt);
              if (ds.energy <= 0) ds.phase = 'end';

              // Thermal updrafts — free altitude boost
              (ds.thermals || []).forEach(function(th) {
                var tdx = ds.x - th.x, tdz = ds.z - th.z;
                var tDist = Math.sqrt(tdx * tdx + tdz * tdz);
                if (tDist < th.radius && ds.y < 250) {
                  ds.vy += th.strength * dt * (1 - tDist / th.radius);
                  ds.energy = Math.min(ds.energy + 0.3 * dt, (ds.difficulty === 'easy' ? 120 : ds.difficulty === 'hard' ? 80 : 100)); // thermals restore a little energy
                }
              });

              // Bird predators — drain energy on collision
              if (ds.hitFlash > 0) ds.hitFlash -= dt;
              (ds.birds || []).forEach(function(bird) {
                bird.x += bird.vx + Math.sin(now * 0.0008 + bird.z * 0.01) * 1.5;
                bird.y += bird.vy + Math.cos(now * 0.001 + bird.x * 0.01) * 0.8;
                bird.z += bird.vz;
                bird.wingPhase += dt * 8;
                // Recycle birds that fall behind
                if (bird.z > ds.z + 300) { bird.z = ds.z - 900; bird.x = ds.x + (Math.random() - 0.5) * 400; }
                // Collision check
                var bdx = ds.x - bird.x, bdy = ds.y - bird.y, bdz = ds.z - bird.z;
                var bDist = Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
                if (bDist < 20) {
                  ds.energy -= 15;
                  ds.hitFlash = 0.5;
                  ds.score = Math.max(0, ds.score - 10);
                  // Scatter bird away
                  bird.x += (Math.random() - 0.5) * 100;
                  bird.y += 30;
                  bird.z -= 100;
                  playSfx(sfxAlert);
                }
              });

              // Pollen collection — fly near flowers with pollen
              (ds.flowers || []).forEach(function(fl) {
                if (!fl.hasPollen || fl.collected) return;
                if (ds.y > 15) return; // must be low altitude
                var fdx = ds.x - fl.x, fdz = ds.z - fl.z;
                if (Math.sqrt(fdx * fdx + fdz * fdz) < 20) {
                  fl.collected = true;
                  ds.pollenCollected = (ds.pollenCollected || 0) + 1;
                  ds.score += 15;
                  playSfx(sfxBeeCollect);
                }
              });

              // Phase transitions
              if (ds.phase === 'launch' && ds.y > 40) ds.phase = 'flight';
              if (ds.phase === 'flight' && ds.y > 100 && Math.abs(ds.z) > 600) ds.phase = 'congregation';

              // Science fact timer
              factTimer += dt;
              if (factTimer > 8 && ds.factIdx < DRONE_FACTS.length) {
                ds.facts.push(DRONE_FACTS[ds.factIdx]);
                ds.factIdx++;
                factTimer = 0;
                ds.score += 5;
              }

              // Check queen proximity for mating
              if (ds.phase === 'congregation') {
                ds.nearQueens.forEach(function(q) {
                  if (q.caught) return;
                  var dx = ds.x - q.x, dy = ds.y - q.y, dz = ds.z - q.z;
                  var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                  if (dist < 25) {
                    q.caught = true;
                    ds.phase = 'mating';
                    ds.score += 200;
                    playSfx(sfxSuccess);
                  }
                });
              }

              // Move other drones
              ds.drones.forEach(function(od) {
                od.x += od.vx + Math.sin(now * 0.001 + od.z) * 0.3;
                od.y += od.vy * 0.3 + Math.sin(now * 0.002 + od.x) * 0.5;
                od.z += od.vz;
                if (od.z > ds.z + 200) { od.z = ds.z - 800; od.x = ds.x + (Math.random() - 0.5) * 300; }
              });
            }

            // ── RENDER ──
            c.clearRect(0, 0, W, H);
            var halfW = W / 2, halfH = H / 2;
            var cosY = Math.cos(ds.yaw), sinY = Math.sin(ds.yaw);
            var cosP = Math.cos(ds.pitch), sinP = Math.sin(ds.pitch);

            // Project 3D to 2D (perspective)
            function project(wx, wy, wz) {
              var rx = (wx - ds.x) * cosY + (wz - ds.z) * sinY;
              var rz = -(wx - ds.x) * sinY + (wz - ds.z) * cosY;
              var ry2 = (wy - ds.y) * cosP - rz * sinP;
              var rz2 = (wy - ds.y) * sinP + rz * cosP;
              if (rz2 >= -1) return null; // behind camera
              var fov = 300;
              var sx = halfW + (rx / -rz2) * fov;
              var sy = halfH - (ry2 / -rz2) * fov;
              var scale = fov / -rz2;
              return { x: sx, y: sy, s: scale, d: -rz2 };
            }

            // Sky gradient (altitude-responsive)
            var skyTop = ds.y > 150 ? '#1a237e' : ds.y > 80 ? '#4a9fd6' : '#7ec8e3';
            var skyBot = ds.y > 150 ? '#4a5de6' : '#b8e2f2';
            var skyG = c.createLinearGradient(0, 0, 0, halfH + 40);
            skyG.addColorStop(0, skyTop); skyG.addColorStop(1, skyBot);
            c.fillStyle = skyG; c.fillRect(0, 0, W, halfH + 40);

            // Ground plane
            var groundCol = ds.y > 200 ? '#2d7a3a' : '#4ade80';
            var grdG = c.createLinearGradient(0, halfH + 20, 0, H);
            grdG.addColorStop(0, '#8fbc8f'); grdG.addColorStop(1, groundCol);
            c.fillStyle = grdG; c.fillRect(0, halfH + 20, W, H);

            // Horizon line
            c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(0, halfH + 20); c.lineTo(W, halfH + 20); c.stroke();

            // Render clouds
            ds.clouds.forEach(function(cl) {
              var p = project(cl.x, cl.y, cl.z);
              if (!p || p.d > 600) return;
              c.globalAlpha = Math.max(0.1, 0.4 - p.d / 1500);
              c.fillStyle = '#fff';
              c.beginPath(); c.ellipse(p.x, p.y, cl.w * p.s * 0.5, 8 * p.s, 0, 0, 6.28); c.fill();
              c.beginPath(); c.ellipse(p.x + cl.w * p.s * 0.2, p.y - 3 * p.s, cl.w * p.s * 0.3, 6 * p.s, 0, 0, 6.28); c.fill();
              c.globalAlpha = 1;
            });

            // Render thermal updraft columns (shimmering heat distortion)
            (ds.thermals || []).forEach(function(th) {
              var p = project(th.x, 30, th.z);
              if (!p || p.d > 500) return;
              c.save();
              c.globalAlpha = 0.12 + Math.sin(now * 0.003 + th.x) * 0.06;
              var thG = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, th.radius * p.s);
              thG.addColorStop(0, 'rgba(255,200,50,0.3)');
              thG.addColorStop(0.7, 'rgba(255,150,30,0.1)');
              thG.addColorStop(1, 'rgba(255,100,0,0)');
              c.fillStyle = thG;
              c.beginPath(); c.arc(p.x, p.y, th.radius * p.s, 0, 6.28); c.fill();
              // Rising particle lines
              c.strokeStyle = 'rgba(255,200,80,0.2)'; c.lineWidth = 1;
              for (var tl = 0; tl < 4; tl++) {
                var tlx = p.x + Math.sin(now * 0.002 + tl * 1.57) * th.radius * p.s * 0.5;
                var tly = p.y + Math.cos(now * 0.004 + tl) * 8 * p.s;
                c.beginPath(); c.moveTo(tlx, tly); c.lineTo(tlx + Math.sin(now * 0.005 + tl) * 3, tly - 15 * p.s); c.stroke();
              }
              c.restore();
            });

            // Render flowers on ground (with pollen glow for collectible ones)
            ds.flowers.forEach(function(fl) {
              var p = project(fl.x, 0, fl.z);
              if (!p || p.d > 400 || p.s < 0.3) return;
              c.fillStyle = fl.col; c.globalAlpha = Math.min(1, p.s);
              for (var pp = 0; pp < 5; pp++) {
                var pa = pp * 1.257;
                c.beginPath(); c.ellipse(p.x + Math.cos(pa) * 3 * p.s, p.y + Math.sin(pa) * 3 * p.s, 2.5 * p.s, 1.5 * p.s, pa, 0, 6.28); c.fill();
              }
              c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(p.x, p.y, 1.5 * p.s, 0, 6.28); c.fill();
              // Pollen glow indicator
              if (fl.hasPollen && !fl.collected && p.s > 0.8) {
                c.save(); c.shadowColor = '#facc15'; c.shadowBlur = 8;
                c.fillStyle = '#facc15'; c.globalAlpha = 0.5 + Math.sin(now * 0.005 + fl.x) * 0.3;
                c.beginPath(); c.arc(p.x, p.y - 4 * p.s, 2 * p.s, 0, 6.28); c.fill();
                c.restore();
              }
              c.globalAlpha = 1;
            });

            // Render obstacles (trees, buildings)
            ds.obstacles.forEach(function(ob) {
              var p = project(ob.x, ob.h * 0.5, ob.z);
              if (!p || p.d > 500 || p.s < 0.2) return;
              if (ob.type === 'tree') {
                // Trunk
                c.fillStyle = '#8B4513';
                c.fillRect(p.x - 1.5 * p.s, p.y, 3 * p.s, ob.h * 0.4 * p.s);
                // Canopy
                c.fillStyle = '#228B22'; c.globalAlpha = 0.85;
                c.beginPath(); c.arc(p.x, p.y - 2 * p.s, ob.h * 0.25 * p.s, 0, 6.28); c.fill();
                c.globalAlpha = 1;
              } else if (ob.type === 'building') {
                c.fillStyle = '#6b7280'; c.fillRect(p.x - 10 * p.s, p.y - ob.h * 0.3 * p.s, 20 * p.s, ob.h * 0.6 * p.s);
                c.fillStyle = '#4b5563'; c.fillRect(p.x - 10 * p.s, p.y - ob.h * 0.3 * p.s, 20 * p.s, 3 * p.s);
              } else {
                c.fillStyle = '#9ca3af'; c.fillRect(p.x - 1 * p.s, p.y, 2 * p.s, ob.h * 0.4 * p.s);
              }
            });

            // Render other drones
            ds.drones.forEach(function(od) {
              var p = project(od.x, od.y, od.z);
              if (!p || p.d > 300) return;
              c.save(); c.shadowColor = '#fbbf24'; c.shadowBlur = 2;
              c.fillStyle = '#fbbf24'; c.beginPath(); c.ellipse(p.x, p.y, 4 * p.s, 2.5 * p.s, 0, 0, 6.28); c.fill();
              c.fillStyle = '#292524'; c.fillRect(p.x - 1 * p.s, p.y - 2 * p.s, 2 * p.s, 4 * p.s);
              // Wings
              c.globalAlpha = 0.3; c.fillStyle = '#bfdbfe';
              c.beginPath(); c.ellipse(p.x, p.y - 3 * p.s + Math.sin(now * 0.03 + od.z) * p.s, 3 * p.s, 1.5 * p.s, 0, 0, 6.28); c.fill();
              c.globalAlpha = 1; c.restore();
            });

            // Render predator birds
            (ds.birds || []).forEach(function(bird) {
              var p = project(bird.x, bird.y, bird.z);
              if (!p || p.d > 400) return;
              c.save();
              c.fillStyle = '#1e293b';
              // Bird body
              c.beginPath(); c.ellipse(p.x, p.y, 5 * p.s, 2.5 * p.s, 0, 0, 6.28); c.fill();
              // Wings (animated flapping)
              var wingUp = Math.sin(bird.wingPhase) * 6 * p.s;
              c.strokeStyle = '#334155'; c.lineWidth = 2 * p.s;
              c.beginPath(); c.moveTo(p.x - 5 * p.s, p.y); c.quadraticCurveTo(p.x - 10 * p.s, p.y + wingUp, p.x - 14 * p.s, p.y + wingUp * 0.5); c.stroke();
              c.beginPath(); c.moveTo(p.x + 5 * p.s, p.y); c.quadraticCurveTo(p.x + 10 * p.s, p.y + wingUp, p.x + 14 * p.s, p.y + wingUp * 0.5); c.stroke();
              // Eye
              c.fillStyle = '#ef4444'; c.beginPath(); c.arc(p.x + 3 * p.s, p.y - 1 * p.s, 1 * p.s, 0, 6.28); c.fill();
              // Danger label
              if (p.d < 100) {
                c.fillStyle = 'rgba(239,68,68,0.7)'; c.font = 'bold 8px system-ui'; c.textAlign = 'center';
                c.fillText('⚠ BIRD', p.x, p.y - 8 * p.s);
              }
              c.restore();
            });

            // Render queen (golden glow target)
            ds.nearQueens.forEach(function(q) {
              if (q.caught) return;
              var p = project(q.x, q.y, q.z);
              if (!p) return;
              c.save();
              c.shadowColor = '#f59e0b'; c.shadowBlur = 15;
              c.fillStyle = '#f59e0b'; c.beginPath(); c.ellipse(p.x, p.y, 6 * p.s, 3.5 * p.s, 0, 0, 6.28); c.fill();
              c.fillStyle = '#fff'; c.font = Math.max(8, 14 * p.s) + 'px system-ui'; c.textAlign = 'center';
              c.fillText('👑', p.x, p.y - 8 * p.s);
              // Distance indicator
              var dist = Math.sqrt((ds.x - q.x) * (ds.x - q.x) + (ds.y - q.y) * (ds.y - q.y) + (ds.z - q.z) * (ds.z - q.z));
              c.font = 'bold 9px system-ui'; c.fillStyle = '#fef3c7';
              c.fillText(Math.round(dist) + 'm', p.x, p.y + 10 * p.s);
              c.restore();
            });

            // ── Bird hit flash ──
            if (ds.hitFlash > 0) {
              c.fillStyle = 'rgba(239,68,68,' + (ds.hitFlash * 0.4) + ')';
              c.fillRect(0, 0, W, H);
            }

            // ── HUD ──
            // Crosshair
            c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(halfW - 10, halfH); c.lineTo(halfW + 10, halfH); c.stroke();
            c.beginPath(); c.moveTo(halfW, halfH - 10); c.lineTo(halfW, halfH + 10); c.stroke();

            // ── Compass / Queen bearing indicator (bottom-right) ──
            var compR = 22, compX = W - 36, compY = H - 36;
            c.save();
            c.fillStyle = 'rgba(15,23,42,0.6)';
            c.beginPath(); c.arc(compX, compY, compR + 4, 0, 6.28); c.fill();
            // Compass ring
            c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 1.5;
            c.beginPath(); c.arc(compX, compY, compR, 0, 6.28); c.stroke();
            // Cardinal directions
            c.font = 'bold 7px system-ui'; c.fillStyle = 'rgba(255,255,255,0.3)'; c.textAlign = 'center';
            c.fillText('N', compX, compY - compR + 7);
            c.fillText('S', compX, compY + compR - 2);
            c.fillText('E', compX + compR - 4, compY + 3);
            c.fillText('W', compX - compR + 4, compY + 3);
            // Drone direction (white triangle)
            c.fillStyle = 'rgba(255,255,255,0.5)';
            c.beginPath();
            c.moveTo(compX + Math.sin(0) * (compR - 6), compY - Math.cos(0) * (compR - 6));
            c.lineTo(compX + Math.sin(-0.3) * (compR - 12), compY - Math.cos(-0.3) * (compR - 12));
            c.lineTo(compX + Math.sin(0.3) * (compR - 12), compY - Math.cos(0.3) * (compR - 12));
            c.closePath(); c.fill();
            // Queen bearing arrow (golden)
            ds.nearQueens.forEach(function(q) {
              if (q.caught) return;
              var qAngle = Math.atan2(q.x - ds.x, -(q.z - ds.z)) - ds.yaw;
              var qDist = Math.sqrt((ds.x - q.x) * (ds.x - q.x) + (ds.z - q.z) * (ds.z - q.z));
              c.save();
              c.strokeStyle = '#f59e0b'; c.lineWidth = 2.5;
              c.shadowColor = '#f59e0b'; c.shadowBlur = 4;
              var arrowLen = compR - 4;
              var ax = compX + Math.sin(qAngle) * arrowLen;
              var ay = compY - Math.cos(qAngle) * arrowLen;
              c.beginPath(); c.moveTo(compX, compY); c.lineTo(ax, ay); c.stroke();
              // Arrowhead
              c.fillStyle = '#f59e0b'; c.beginPath();
              c.moveTo(ax, ay);
              c.lineTo(ax + Math.sin(qAngle - 2.5) * 5, ay - Math.cos(qAngle - 2.5) * 5);
              c.lineTo(ax + Math.sin(qAngle + 2.5) * 5, ay - Math.cos(qAngle + 2.5) * 5);
              c.closePath(); c.fill();
              // Queen icon at arrow tip
              c.font = '8px system-ui'; c.textAlign = 'center';
              c.fillText('👑', ax, ay - 5);
              // Distance text
              c.font = 'bold 7px system-ui'; c.fillStyle = '#fef3c7';
              c.fillText(Math.round(qDist) + 'm', compX, compY + compR + 12);
              c.restore();
            });
            c.restore();

            // Top HUD bar
            c.fillStyle = 'rgba(15,23,42,0.7)';
            c.beginPath(); if (c.roundRect) c.roundRect(10, 8, W - 20, 50, 10); else c.rect(10, 8, W - 20, 50); c.fill();
            c.font = 'bold 10px system-ui'; c.textAlign = 'left'; c.fillStyle = '#fbbf24';
            var diffLabel = (ds.difficulty || 'normal').toUpperCase();
            c.fillText('🚀 DRONE NUPTIAL FLIGHT · ' + diffLabel, 20, 24);
            c.font = '9px system-ui'; c.fillStyle = '#e2e8f0';
            c.fillText('Alt: ' + Math.round(ds.y) + 'ft · Spd: ' + ds.speed.toFixed(1) + ' · Dist: ' + Math.round(ds.distance) + 'm', 20, 38);
            c.fillText('🌼 Pollen: ' + (ds.pollenCollected || 0) + '/' + (ds.pollenGoal || 5) + ' · 🐦 Avoid birds!', 20, 51);

            c.textAlign = 'right'; c.fillStyle = '#fbbf24';
            c.fillText('⚡ ' + Math.round(ds.energy) + '%', W - 20, 24);
            c.fillStyle = ds.timer < 20 ? '#ef4444' : '#e2e8f0';
            c.fillText('⏱ ' + Math.round(ds.timer) + 's · 🏆 ' + ds.score, W - 20, 38);

            // Energy bar
            var maxEnergy = ds.difficulty === 'easy' ? 120 : ds.difficulty === 'hard' ? 80 : 100;
            c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(W - 130, 12, 70, 6);
            c.fillStyle = ds.energy > 30 ? '#22c55e' : ds.energy > 10 ? '#eab308' : '#ef4444';
            c.fillRect(W - 130, 12, 70 * (ds.energy / maxEnergy), 6);

            // Phase indicator
            var phaseLabel = { launch: '🚀 LAUNCHING...', flight: '✈️ FLYING TO DCA', congregation: '🎯 DRONE CONGREGATION AREA — FIND THE QUEEN!', mating: '❤️ MATING SUCCESS!', end: '🏁 FLIGHT OVER' }[ds.phase] || '';
            if (phaseLabel) {
              c.fillStyle = ds.phase === 'mating' ? 'rgba(245,158,11,0.8)' : ds.phase === 'congregation' ? 'rgba(99,102,241,0.7)' : 'rgba(15,23,42,0.5)';
              c.textAlign = 'center'; c.font = 'bold 11px system-ui';
              var tw = c.measureText(phaseLabel).width;
              c.beginPath(); if (c.roundRect) c.roundRect(halfW - tw / 2 - 12, H - 50, tw + 24, 22, 8); else c.rect(halfW - tw / 2 - 12, H - 50, tw + 24, 22); c.fill();
              c.fillStyle = '#fff'; c.fillText(phaseLabel, halfW, H - 35);
            }

            // Latest science fact
            if (ds.facts.length > 0) {
              var lastFact = ds.facts[ds.facts.length - 1];
              c.fillStyle = 'rgba(15,23,42,0.75)'; c.textAlign = 'center'; c.font = '9px system-ui';
              var ftw = Math.min(W - 40, c.measureText(lastFact).width + 20);
              c.beginPath(); if (c.roundRect) c.roundRect(halfW - ftw / 2, 56, ftw, 20, 6); else c.rect(halfW - ftw / 2, 56, ftw, 20); c.fill();
              c.fillStyle = '#fef3c7'; c.fillText(lastFact.length > 80 ? lastFact.substring(0, 80) + '...' : lastFact, halfW, 70);
            }

            // Controls hint (bottom-left)
            c.fillStyle = 'rgba(15,23,42,0.5)'; c.textAlign = 'left'; c.font = '8px system-ui';
            c.beginPath(); if (c.roundRect) c.roundRect(10, H - 28, 200, 20, 6); else c.rect(10, H - 28, 200, 20); c.fill();
            c.fillStyle = '#94a3b8'; c.fillText('↑↓ Thrust · ←→ Turn · Space/Shift Altitude', 16, H - 14);

            // Mating success overlay
            if (ds.phase === 'mating') {
              c.fillStyle = 'rgba(245,158,11,0.15)'; c.fillRect(0, 0, W, H);
              c.textAlign = 'center'; c.fillStyle = '#fbbf24'; c.font = 'bold 24px system-ui';
              c.fillText('MATING SUCCESS!', halfW, halfH - 20);
              c.font = '12px system-ui'; c.fillStyle = '#fef3c7';
              c.fillText('+200 pts — You fulfilled the drone\'s sole biological purpose', halfW, halfH + 10);
              c.font = '10px system-ui'; c.fillStyle = '#e2e8f0';
              c.fillText('In reality, this is instantly fatal for the drone.', halfW, halfH + 30);
            }

            // End screen
            if (ds.phase === 'end') {
              c.fillStyle = 'rgba(15,23,42,0.8)'; c.fillRect(0, 0, W, H);
              c.textAlign = 'center'; c.fillStyle = '#fbbf24'; c.font = 'bold 22px system-ui';
              c.fillText('Flight Complete', halfW, halfH - 55);
              c.font = 'bold 11px system-ui'; c.fillStyle = '#e2e8f0';
              c.fillText('🏆 Score: ' + ds.score + ' · Max Alt: ' + Math.round(ds.maxAlt) + 'ft · Distance: ' + Math.round(ds.distance) + 'm', halfW, halfH - 28);
              c.fillText('🌼 Pollen: ' + (ds.pollenCollected || 0) + '/' + (ds.pollenGoal || 5) + ' · 📚 Facts: ' + ds.facts.length + '/' + DRONE_FACTS.length, halfW, halfH - 10);
              // Performance rating
              var rating = ds.score >= 250 ? '🌟 LEGENDARY' : ds.score >= 150 ? '🥇 EXCELLENT' : ds.score >= 80 ? '🥈 GOOD' : '🥉 KEEP TRYING';
              c.fillStyle = ds.score >= 150 ? '#fbbf24' : '#94a3b8'; c.font = 'bold 14px system-ui';
              c.fillText(rating, halfW, halfH + 15);
              c.fillStyle = '#94a3b8'; c.font = '10px system-ui';
              c.fillText('Click "Start Flight" to try again · Try a harder difficulty!', halfW, halfH + 42);
              // Save high score — write directly (no 100ms setTimeout delay that caused a
              // brief flash of stale state on the end screen). ds._hsSaved guards against
              // writing the same high score every frame while the end screen is shown.
              if (ds.score > droneHighScore && !ds._hsSaved) {
                ds._hsSaved = true;
                updAll({ drone: Object.assign({}, droneData, { highScore: ds.score, active: false }) });
              }
            }

            if (ds.phase !== 'end') _droneAnimId.current = requestAnimationFrame(droneFrame);
          }

          // Input handlers
          function dkDown(e) { _droneKeys.current[e.key] = true; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].indexOf(e.key) !== -1) e.preventDefault(); }
          function dkUp(e) { _droneKeys.current[e.key] = false; }
          document.addEventListener('keydown', dkDown);
          document.addEventListener('keyup', dkUp);

          if (_droneAnimId.current) cancelAnimationFrame(_droneAnimId.current);
          _droneAnimId.current = requestAnimationFrame(droneFrame);

          return function() {
            if (_droneAnimId.current) cancelAnimationFrame(_droneAnimId.current);
            document.removeEventListener('keydown', dkDown);
            document.removeEventListener('keyup', dkUp);
          };
          } // end doSetup
          tryInit();
          return function() {
            if (retryTimer) clearTimeout(retryTimer);
            if (teardownFn) teardownFn();
          };
        }, [viewMode, droneFlightActive]);

        // ═══════════════════════════════════════════════════════════
        // ═══ QUEEN RTS MODE — Pheromone-based colony management ═══
        // ═══════════════════════════════════════════════════════════
        var _queenCvRef = React.useRef(null);
        var _queenAnimId = React.useRef(0);
        var _queenState = React.useRef({});

        var queenData = d.queen || {};
        var queenGameActive = queenData.active || false;
        var queenDay = queenData.day || 0;
        var queenPheromones = queenData.pheromones || { qmp: 100, alarm: 0, nasonov: 50, brood: 40 };
        var queenResources = queenData.resources || { nectar: 30, pollen: 20, wax: 10, royalJelly: 5 };
        var queenPopulation = queenData.population || { nurses: 200, builders: 100, guards: 50, foragers: 300, scouts: 30 };
        var queenStructures = queenData.structures || [
          { type: 'brood', x: 0.5, y: 0.5, level: 1 },
          { type: 'honey', x: 0.3, y: 0.4, level: 1 },
          { type: 'honey', x: 0.7, y: 0.4, level: 1 }
        ];
        var queenThreats = queenData.threats || [];
        var queenEvents = queenData.events || [];
        var queenScore = queenData.score || 0;
        var queenPhase = queenData.phase || 'build'; // build | defend | swarm
        _queenState.current = { queenDay: queenDay, queenPheromones: queenPheromones, queenResources: queenResources, queenPopulation: queenPopulation, queenStructures: queenStructures, queenThreats: queenThreats, queenScore: queenScore, queenPhase: queenPhase };
        // queenSelectedAction tracked in queenData for UI state

        var QUEEN_STRUCTURE_TYPES = {
          brood: { icon: '🥚', label: 'Brood Chamber', desc: 'Lay eggs — produce new workers', cost: { wax: 3, royalJelly: 2 }, produces: 'workers', color: '#fdba74' },
          honey: { icon: '🍯', label: 'Honey Store', desc: 'Store nectar converted to honey', cost: { wax: 2 }, produces: 'nectar_storage', color: '#f59e0b' },
          pollen: { icon: '🌼', label: 'Pollen Vault', desc: 'Store pollen for brood food', cost: { wax: 2 }, produces: 'pollen_storage', color: '#facc15' },
          guard: { icon: '🛡️', label: 'Guard Post', desc: 'Station guards to detect intruders', cost: { wax: 4 }, produces: 'defense', color: '#ef4444' },
          nursery: { icon: '🍼', label: 'Royal Nursery', desc: 'Produce royal jelly from nurse bees', cost: { wax: 3, pollen: 5 }, produces: 'royalJelly', color: '#c084fc' },
          fan: { icon: '💨', label: 'Fanning Station', desc: 'Temperature control & scent distribution', cost: { wax: 2 }, produces: 'thermoreg', color: '#38bdf8' }
        };

        var QUEEN_ACTIONS = [
          { id: 'lay_workers', icon: '👷', label: 'Lay Worker Eggs', desc: 'Fertilized eggs → workers in 21 days', cost: { royalJelly: 1 }, pheromone: 'qmp' },
          { id: 'lay_drones', icon: '♂️', label: 'Lay Drone Eggs', desc: 'Unfertilized eggs → drones for mating', cost: { royalJelly: 1 }, pheromone: 'qmp' },
          { id: 'emit_qmp', icon: '💜', label: 'Emit QMP', desc: 'Release Queen Mandibular Pheromone — suppress worker rebellion, boost morale', cost: {}, pheromone: 'qmp' },
          { id: 'alarm_signal', icon: '🚨', label: 'Alarm Signal', desc: 'Release alarm pheromone — mobilize guards against threat', cost: {}, pheromone: 'alarm' },
          { id: 'nasonov_call', icon: '🏠', label: 'Nasonov Rally', desc: 'Release Nasonov — call foragers home, mark safe areas', cost: {}, pheromone: 'nasonov' },
          { id: 'build_comb', icon: '🏗️', label: 'Order Comb', desc: 'Direct builders to construct new comb cells', cost: { wax: 5 }, pheromone: 'qmp' }
        ];

        function startQueenGame() {
          updAll({ queen: {
            active: true, day: 0, score: 0, phase: 'build',
            pheromones: { qmp: 100, alarm: 0, nasonov: 50, brood: 40 },
            resources: { nectar: 30, pollen: 20, wax: 10, royalJelly: 5 },
            population: { nurses: 200, builders: 100, guards: 50, foragers: 300, scouts: 30 },
            structures: [
              { type: 'brood', x: 0.5, y: 0.5, level: 1 },
              { type: 'honey', x: 0.35, y: 0.45, level: 1 },
              { type: 'honey', x: 0.65, y: 0.45, level: 1 }
            ],
            threats: [], events: [], selectedAction: null
          }});
        }

        function queenAction(actionId) {
          var action = QUEEN_ACTIONS.find(function(a) { return a.id === actionId; });
          if (!action) return;
          // Check costs
          var res = Object.assign({}, queenResources);
          var canAfford = true;
          if (action.cost) {
            Object.keys(action.cost).forEach(function(k) { if ((res[k] || 0) < action.cost[k]) canAfford = false; });
          }
          if (!canAfford) { if (addToast) addToast('Not enough resources for ' + action.label, 'info'); return; }
          // Deduct
          Object.keys(action.cost).forEach(function(k) { res[k] = (res[k] || 0) - action.cost[k]; });

          var ph = Object.assign({}, queenPheromones);
          var pop = Object.assign({}, queenPopulation);
          var sc = queenScore;

          if (actionId === 'lay_workers') { pop.nurses += 20; sc += 10; ph.brood = Math.min(100, ph.brood + 5); playSfx(sfxBeeCollect); }
          else if (actionId === 'lay_drones') { sc += 5; playSfx(sfxBeeCollect); }
          else if (actionId === 'emit_qmp') { ph.qmp = Math.min(100, ph.qmp + 30); sc += 5; playSfx(sfxBeeWaggle); }
          else if (actionId === 'alarm_signal') { ph.alarm = Math.min(100, ph.alarm + 50); pop.guards += 20; sc += 5; playSfx(sfxAlert); }
          else if (actionId === 'nasonov_call') { ph.nasonov = Math.min(100, ph.nasonov + 30); pop.foragers += 15; sc += 5; playSfx(sfxBeeWaggle); }
          else if (actionId === 'build_comb') { sc += 15; playSfx(sfxBeeBuzz); }

          updAll({ queen: Object.assign({}, queenData, { resources: res, pheromones: ph, population: pop, score: sc, selectedAction: actionId }) });
          if (addToast) addToast(action.icon + ' ' + action.label, 'success');
        }

        function advanceQueenDay() {
          var res = Object.assign({}, queenResources);
          var ph = Object.assign({}, queenPheromones);
          var pop = Object.assign({}, queenPopulation);
          var threats = (queenThreats || []).slice();
          var evts = (queenEvents || []).slice();
          var structs = (queenStructures || []).slice();
          var newPhase = queenPhase;
          var newDay = queenDay + 1;

          // ── Seasonal modifiers (30-day seasons) ──
          var qSeason = Math.floor((newDay % 120) / 30); // 0=spring 1=summer 2=autumn 3=winter
          var qSeasonNames = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'];
          var forageMult = [0.8, 1.4, 0.5, 0.0][qSeason];
          var broodMult = [1.2, 1.5, 0.4, 0.0][qSeason];
          var consumeMult = [0.9, 1.1, 0.8, 0.7][qSeason];

          // Foragers bring resources (season-dependent)
          res.nectar = Math.round((res.nectar + pop.foragers * 0.02 * forageMult) * 10) / 10;
          res.pollen = Math.round((res.pollen + pop.foragers * 0.008 * forageMult) * 10) / 10;
          // Builders produce wax
          res.wax = Math.round((res.wax + pop.builders * 0.005) * 10) / 10;
          // Nurses produce royal jelly
          res.royalJelly = Math.round((res.royalJelly + pop.nurses * 0.003) * 10) / 10;

          // Structure production bonuses
          structs.forEach(function(st) {
            if (st.type === 'brood') { pop.nurses += Math.round(5 * st.level * broodMult); pop.foragers += Math.round(3 * st.level * broodMult); }
            else if (st.type === 'honey') { res.nectar += 0.5 * st.level; } // better storage = less waste
            else if (st.type === 'pollen') { res.pollen += 0.3 * st.level; }
            else if (st.type === 'guard') { pop.guards += 2 * st.level; }
            else if (st.type === 'nursery') { res.royalJelly += 0.2 * st.level; }
            else if (st.type === 'fan') { /* thermoreg — reduces winter loss below */ }
          });

          // Consumption (season-dependent)
          var totalPop = pop.nurses + pop.builders + pop.guards + pop.foragers + pop.scouts;
          res.nectar = Math.max(0, res.nectar - totalPop * 0.004 * consumeMult);
          res.pollen = Math.max(0, res.pollen - totalPop * 0.001 * consumeMult);

          // Winter losses (reduced by fan stations)
          if (qSeason === 3) {
            var fanCount = structs.filter(function(s) { return s.type === 'fan'; }).length;
            var winterLoss = Math.max(0.01, 0.04 - fanCount * 0.008);
            pop.foragers = Math.max(10, Math.round(pop.foragers * (1 - winterLoss)));
            pop.nurses = Math.max(5, Math.round(pop.nurses * (1 - winterLoss * 0.5)));
            if (fanCount === 0 && Math.random() < 0.3) {
              evts.push({ type: 'cold', text: '❄️ No fanning stations! Brood temperature dropping — larvae at risk.' });
            }
          }

          // Pheromone decay
          ph.qmp = Math.max(0, ph.qmp - 3);
          ph.alarm = Math.max(0, ph.alarm - 8);
          ph.nasonov = Math.max(0, ph.nasonov - 2);
          ph.brood = Math.max(0, ph.brood - 1);

          // ── Phase Progression ──
          // Build phase: days 1-10, low threat frequency
          // Defend phase: days 11-25, higher threat frequency, bigger threats
          // Swarm phase: day 25+, must manage swarming impulse or colony splits
          if (newDay >= 25 && newPhase !== 'swarm') {
            newPhase = 'swarm';
            evts.push({ type: 'phase', text: '🐝 SWARM PHASE — Colony is crowded! Manage pheromones carefully or half the workers leave with a new queen.' });
          } else if (newDay >= 10 && newPhase === 'build') {
            newPhase = 'defend';
            evts.push({ type: 'phase', text: '⚔️ DEFEND PHASE — Threats are increasing. Build guard posts and keep alarm pheromone ready.' });
          }

          // Low QMP = worker rebellion risk (worse in swarm phase)
          var rebellionChance = newPhase === 'swarm' ? 0.5 : 0.25;
          if (ph.qmp < 20 && Math.random() < rebellionChance) {
            evts.push({ type: 'rebellion', text: '⚠️ QMP too low — workers becoming restless! Some are developing ovaries.' });
            pop.foragers = Math.max(0, pop.foragers - 30);
            if (newPhase === 'swarm') pop.nurses = Math.max(0, pop.nurses - 20);
          }

          // Swarming impulse (swarm phase only)
          if (newPhase === 'swarm' && totalPop > 800 && ph.qmp < 40 && Math.random() < 0.2) {
            evts.push({ type: 'swarm', text: '🐝🐝🐝 SWARM! QMP couldn\'t hold them — half your workers left with a rebel queen! Rebuild with stronger pheromones.' });
            pop.foragers = Math.round(pop.foragers * 0.5);
            pop.nurses = Math.round(pop.nurses * 0.5);
            pop.builders = Math.round(pop.builders * 0.5);
            pop.scouts = Math.round(pop.scouts * 0.6);
            playSfx(sfxAlert);
          }

          // Supersedure: if QMP stays very low, workers may raise a new queen (game over)
          if (ph.qmp < 5 && queenDay > 15 && Math.random() < 0.15) {
            evts.push({ type: 'supersedure', text: '👑❌ SUPERSEDURE — Workers have raised a replacement queen. Your reign is over. Final score: ' + (queenScore + 10) });
            updAll({ queen: Object.assign({}, queenData, { active: false, events: evts, score: queenScore + 10 }) });
            return;
          }

          // Random threats (frequency increases by phase)
          var threatChance = newPhase === 'defend' ? 0.15 : newPhase === 'swarm' ? 0.12 : 0.06;
          if (Math.random() < threatChance && queenDay > 2) {
            var threatTypes = [
              { type: 'wasp', icon: '🐝', label: 'Wasp Raider', strength: 30, desc: 'A hornet is probing the entrance!' },
              { type: 'robber', icon: '⚔️', label: 'Robber Bees', strength: 50, desc: 'Foreign bees are trying to steal honey!' },
              { type: 'mouse', icon: '🐭', label: 'Mouse Intruder', strength: 40, desc: 'A mouse is trying to nest inside the hive!' },
              { type: 'mites', icon: '🦟', label: 'Varroa Spike', strength: 60, desc: 'Varroa mites are multiplying on brood!' },
              { type: 'beetle', icon: '🪲', label: 'Hive Beetle', strength: 35, desc: 'Small hive beetles are tunneling through comb!' }
            ];
            // Harder threats in later phases
            if (newPhase === 'defend' || newPhase === 'swarm') {
              threatTypes.push({ type: 'hornet', icon: '🐻', label: 'Giant Hornet', strength: 80, desc: 'A giant hornet — one can kill 40 bees per minute!' });
            }
            var nt = threatTypes[Math.floor(Math.random() * threatTypes.length)];
            threats.push(Object.assign({}, nt, { hp: nt.strength, maxHp: nt.strength }));
            evts.push({ type: 'threat', text: nt.icon + ' ' + nt.label + ': ' + nt.desc });
            playSfx(sfxAlert);
          }

          // Guards auto-fight threats (alarm pheromone doubles effectiveness)
          threats.forEach(function(th) {
            th.hp -= pop.guards * 0.5 * (ph.alarm > 30 ? 2.5 : 1);
          });
          var defeatedThreats = threats.filter(function(th) { return th.hp <= 0; });
          threats = threats.filter(function(th) { return th.hp > 0; });
          defeatedThreats.forEach(function(th) {
            evts.push({ type: 'victory', text: '✅ ' + th.label + ' defeated! Guards held the line.' });
          });
          // Undefended threats cause damage
          threats.forEach(function(th) {
            res.nectar = Math.max(0, res.nectar - th.strength * 0.05);
            pop.nurses = Math.max(0, pop.nurses - Math.floor(th.strength * 0.1));
          });

          // Season transition announcement
          if (newDay > 0 && newDay % 30 === 0) {
            evts.push({ type: 'season', text: qSeasonNames[qSeason] + ' has arrived! Adjust your strategy for the new season.' });
          }

          // Nasonov bonus: high nasonov attracts more foragers
          if (ph.nasonov > 60) {
            pop.foragers += 5;
            pop.scouts += 2;
          }

          // Age-based losses
          pop.foragers = Math.max(0, pop.foragers - Math.round(pop.foragers * 0.008));
          pop.guards = Math.max(0, pop.guards - Math.round(pop.guards * 0.005));

          // Starvation check
          if (res.nectar <= 0) {
            evts.push({ type: 'starve', text: '🚨 STARVATION — No nectar! Workers are dying.' });
            pop.foragers = Math.max(0, pop.foragers - 20);
            pop.nurses = Math.max(0, pop.nurses - 10);
          }

          if (evts.length > 15) evts = evts.slice(-15);

          playSfx(sfxDayChime);
          updAll({ queen: Object.assign({}, queenData, {
            day: newDay, resources: res, pheromones: ph, population: pop,
            threats: threats, events: evts, score: queenScore + 10,
            phase: newPhase, structures: structs
          })});
        }

        function buildQueenStructure(typeId) {
          var sType = QUEEN_STRUCTURE_TYPES[typeId];
          if (!sType) return;
          var res = Object.assign({}, queenResources);
          var canAfford = true;
          Object.keys(sType.cost).forEach(function(k) { if ((res[k] || 0) < sType.cost[k]) canAfford = false; });
          if (!canAfford) { if (addToast) addToast('Need more resources to build ' + sType.label, 'info'); return; }
          Object.keys(sType.cost).forEach(function(k) { res[k] = (res[k] || 0) - sType.cost[k]; });

          var newStructures = queenStructures.slice();
          newStructures.push({ type: typeId, x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, level: 1 });

          playSfx(sfxBeeBuzz);
          updAll({ queen: Object.assign({}, queenData, { resources: res, structures: newStructures, score: queenScore + 20 }) });
          if (addToast) addToast(sType.icon + ' Built ' + sType.label + '!', 'success');
        }

        // Queen RTS canvas rendering
        React.useEffect(function() {
          if (viewMode !== 'queen' || !queenGameActive) return;
          // Ref-ready retry — prevents blank canvas when ref attaches late.
          var tries = 0;
          var retryTimer = null;
          var teardownFn = null;
          function tryInit() {
            var cv = _queenCvRef.current;
            if (!cv) {
              if (tries++ < 12) retryTimer = setTimeout(tryInit, 50);
              else console.warn('[Beehive] queen canvas ref never attached');
              return;
            }
            var c = cv.getContext('2d');
            if (!c) {
              if (tries++ < 12) retryTimer = setTimeout(tryInit, 50);
              return;
            }
            teardownFn = doSetup(cv, c);
          }
          function doSetup(cv, c) {
          var par = cv.parentElement;
          var W = (par ? par.clientWidth : 500) || 500;
          var H = (par ? par.clientHeight : 400) || 400;
          cv.width = W * 2; cv.height = H * 2;
          c.setTransform(2, 0, 0, 2, 0, 0);

          var _qTime = 0;
          function queenFrame() {
            _qTime++;
            var qs = _queenState.current;
            c.clearRect(0, 0, W, H);

            // ── Seasonal background tint ──
            var qSeason2 = Math.floor(((qs.queenDay || 0) % 120) / 30);
            var combBase = ['#c9b040', '#d4aa40', '#b89030', '#a0a0b0'][qSeason2] || '#d4aa40';
            var combCell = ['#c0a530', '#c9a030', '#a87820', '#8090a0'][qSeason2] || '#c9a030';
            var combStroke = ['#7a5a08', '#8a6508', '#6a4a00', '#606878'][qSeason2] || '#8a6508';
            c.fillStyle = combBase;
            c.fillRect(0, 0, W, H);

            // Draw hexagonal comb grid (seasonal tint)
            var cSize = 18;
            for (var gy = -1; gy < Math.ceil(H / (cSize * 1.6)) + 1; gy++) {
              for (var gx = -1; gx < Math.ceil(W / (cSize * 2)) + 1; gx++) {
                var hx = gx * cSize * 2 + (gy % 2) * cSize;
                var hy = gy * cSize * 1.6;
                c.beginPath();
                for (var hh = 0; hh < 6; hh++) {
                  var ha = hh * 1.047 + 0.524;
                  var px = hx + Math.cos(ha) * cSize * 0.9;
                  var py = hy + Math.sin(ha) * cSize * 0.9;
                  hh === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
                }
                c.closePath();
                c.fillStyle = combCell;
                c.fill();
                c.strokeStyle = combStroke; c.lineWidth = 0.8; c.stroke();
              }
            }

            // Winter frost overlay
            if (qSeason2 === 3) {
              c.fillStyle = 'rgba(200,220,240,0.12)'; c.fillRect(0, 0, W, H);
              c.fillStyle = '#fff'; c.globalAlpha = 0.3;
              for (var sn2 = 0; sn2 < 15; sn2++) {
                c.beginPath(); c.arc((sn2 * 37 + _qTime * 0.15) % W, (sn2 * 29 + _qTime * 0.25) % H, 1 + Math.random(), 0, 6.28); c.fill();
              }
              c.globalAlpha = 1;
            }
            // Spring bloom overlay
            if (qSeason2 === 0) {
              c.globalAlpha = 0.06; c.fillStyle = '#4ade80';
              for (var sp = 0; sp < 8; sp++) {
                c.beginPath(); c.arc((sp * 67 + 20) % W, (sp * 53 + 40) % H, 15 + Math.sin(_qTime * 0.01 + sp) * 5, 0, 6.28); c.fill();
              }
              c.globalAlpha = 1;
            }

            // ── Draw structures ──
            (qs.queenStructures || []).forEach(function(st) {
              var sx = st.x * W, sy = st.y * H;
              var sType = QUEEN_STRUCTURE_TYPES[st.type];
              if (!sType) return;

              // Structure glow
              c.save();
              var sg = c.createRadialGradient(sx, sy, 5, sx, sy, 25 + st.level * 5);
              sg.addColorStop(0, sType.color + 'aa');
              sg.addColorStop(1, sType.color + '00');
              c.fillStyle = sg;
              c.beginPath(); c.arc(sx, sy, 25 + st.level * 5, 0, 6.28); c.fill();
              c.restore();

              // Structure icon
              c.font = (16 + st.level * 4) + 'px system-ui'; c.textAlign = 'center';
              c.fillText(sType.icon, sx, sy + 6);

              // Level badge
              if (st.level > 1) {
                c.fillStyle = '#fbbf24'; c.font = 'bold 8px system-ui';
                c.fillText('Lv.' + st.level, sx, sy + 18);
              }
            });

            // ── Draw threats (animated, moving toward queen) ──
            var qCenterX = W * 0.5, qCenterY = H * 0.5;
            (qs.queenThreats || []).forEach(function(th, ti) {
              // Threats orbit and approach from edges
              var threatAngle = ti * 1.8 + _qTime * 0.008;
              var approachDist = 0.35 + (th.hp / (th.maxHp || th.strength)) * 0.15; // closer as they weaken
              var tx = qCenterX + Math.cos(threatAngle) * W * approachDist + Math.sin(_qTime * 0.02 + ti) * 10;
              var ty = qCenterY + Math.sin(threatAngle) * H * approachDist + Math.cos(_qTime * 0.015 + ti) * 8;

              // Danger aura
              c.save();
              var dGlow = c.createRadialGradient(tx, ty, 3, tx, ty, 20);
              dGlow.addColorStop(0, 'rgba(239,68,68,0.2)');
              dGlow.addColorStop(1, 'rgba(239,68,68,0)');
              c.fillStyle = dGlow;
              c.beginPath(); c.arc(tx, ty, 20, 0, 6.28); c.fill();

              // Threat icon (bobbing)
              c.font = '18px system-ui'; c.textAlign = 'center';
              c.fillText(th.icon, tx, ty + 6 + Math.sin(_qTime * 0.06 + ti) * 3);

              // HP bar with background
              var hpW = 30, hpH = 5;
              c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(tx - hpW / 2, ty + 12, hpW, hpH);
              var hpPct = th.hp / (th.maxHp || th.strength);
              c.fillStyle = hpPct > 0.5 ? '#ef4444' : hpPct > 0.25 ? '#f59e0b' : '#22c55e';
              c.fillRect(tx - hpW / 2, ty + 12, hpW * hpPct, hpH);

              // Label
              c.font = 'bold 7px system-ui'; c.fillStyle = '#fca5a5';
              c.fillText(th.label || th.type, tx, ty + 23);
              c.restore();

              // Attack line toward queen (pulsing red)
              if (hpPct > 0.3) {
                c.save(); c.globalAlpha = 0.15 + Math.sin(_qTime * 0.05) * 0.1;
                c.strokeStyle = '#ef4444'; c.lineWidth = 1; c.setLineDash([3, 6]);
                c.beginPath(); c.moveTo(tx, ty); c.lineTo(qCenterX, qCenterY); c.stroke();
                c.setLineDash([]); c.restore();
              }
            });

            // ── Queen at center ──
            var qx = W * 0.5, qy = H * 0.5;
            c.save();
            // QMP aura (pulsing)
            var auraR = 30 + qs.queenPheromones.qmp * 0.4;
            var auraAlpha = 0.05 + qs.queenPheromones.qmp * 0.002;
            var qg = c.createRadialGradient(qx, qy, 5, qx, qy, auraR);
            qg.addColorStop(0, 'rgba(168,85,247,' + auraAlpha + ')');
            qg.addColorStop(1, 'rgba(168,85,247,0)');
            c.fillStyle = qg;
            c.beginPath(); c.arc(qx, qy, auraR, 0, 6.28); c.fill();
            // Queen body
            c.shadowColor = '#f59e0b'; c.shadowBlur = 8;
            c.font = '28px system-ui'; c.textAlign = 'center';
            c.fillText('👑', qx, qy + 10);
            c.restore();

            // ── Worker bee particles ──
            var totalW = qs.queenPopulation.nurses + qs.queenPopulation.builders + qs.queenPopulation.guards + qs.queenPopulation.foragers;
            var numDots = Math.min(100, Math.floor(totalW / 10));
            c.fillStyle = '#fbbf24';
            for (var bi = 0; bi < numDots; bi++) {
              var bAngle = (bi / numDots) * 6.28 + Date.now() * 0.0005;
              var bRadius = 35 + Math.sin(bi * 2.3 + Date.now() * 0.001) * 30 + Math.random() * 20;
              var bx = qx + Math.cos(bAngle) * bRadius;
              var by = qy + Math.sin(bAngle) * bRadius * 0.7;
              c.globalAlpha = 0.6;
              c.beginPath(); c.arc(bx, by, 1.5, 0, 6.28); c.fill();
            }
            c.globalAlpha = 1;

            // ── Pheromone rings (alarm = red, nasonov = green) ──
            if (qs.queenPheromones.alarm > 10) {
              c.strokeStyle = 'rgba(239,68,68,' + (qs.queenPheromones.alarm * 0.006) + ')';
              c.lineWidth = 2; c.setLineDash([4, 4]);
              c.beginPath(); c.arc(qx, qy, 60 + qs.queenPheromones.alarm * 0.5, 0, 6.28); c.stroke();
              c.setLineDash([]);
            }
            if (qs.queenPheromones.nasonov > 20) {
              c.strokeStyle = 'rgba(34,197,94,' + (qs.queenPheromones.nasonov * 0.005) + ')';
              c.lineWidth = 1.5; c.setLineDash([3, 5]);
              c.beginPath(); c.arc(qx, qy, 50 + qs.queenPheromones.nasonov * 0.4, 0, 6.28); c.stroke();
              c.setLineDash([]);
            }

            // ── HUD overlay ──
            var qSeasonLabel = ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'][qSeason2] || '';
            var phaseLabel2 = qs.queenPhase === 'swarm' ? '🐝 SWARM' : qs.queenPhase === 'defend' ? '⚔️ DEFEND' : '🏗️ BUILD';
            c.fillStyle = 'rgba(15,23,42,0.75)';
            c.beginPath(); if (c.roundRect) c.roundRect(6, 6, 180, 72, 8); else c.rect(6, 6, 180, 72); c.fill();
            c.font = 'bold 10px system-ui'; c.fillStyle = '#fbbf24'; c.textAlign = 'left';
            c.fillText('👑 QUEEN COMMAND · Day ' + qs.queenDay, 14, 22);
            c.font = '8px system-ui'; c.fillStyle = '#e2e8f0';
            var totalPop2 = qs.queenPopulation.nurses + qs.queenPopulation.builders + qs.queenPopulation.guards + qs.queenPopulation.foragers + qs.queenPopulation.scouts;
            c.fillText('🐝 ' + totalPop2 + ' bees · 🏆 ' + qs.queenScore + ' pts', 14, 36);
            c.fillText('🍯 ' + Math.round(qs.queenResources.nectar) + ' · 🌼 ' + Math.round(qs.queenResources.pollen) + ' · 🕯 ' + Math.round(qs.queenResources.wax) + ' · 👑 ' + Math.round(qs.queenResources.royalJelly), 14, 50);
            // Season + phase indicator
            c.fillStyle = '#94a3b8'; c.fillText(qSeasonLabel + ' · ' + phaseLabel2, 14, 64);
            // Phase warning (low QMP in swarm phase)
            if (qs.queenPhase === 'swarm' && qs.queenPheromones.qmp < 40) {
              c.fillStyle = 'rgba(239,68,68,0.8)'; c.font = 'bold 8px system-ui';
              c.fillText('⚠ QMP LOW — SWARM RISK!', 14, 74);
            }

            // Pheromone bars (top-right)
            c.fillStyle = 'rgba(15,23,42,0.7)';
            c.beginPath(); if (c.roundRect) c.roundRect(W - 130, 6, 124, 58, 8); else c.rect(W - 130, 6, 124, 58); c.fill();
            c.font = 'bold 8px system-ui'; c.textAlign = 'right';
            [
              { label: 'QMP', val: qs.queenPheromones.qmp, col: '#a855f7' },
              { label: 'Alarm', val: qs.queenPheromones.alarm, col: '#ef4444' },
              { label: 'Nasonov', val: qs.queenPheromones.nasonov, col: '#22c55e' },
              { label: 'Brood', val: qs.queenPheromones.brood, col: '#f59e0b' }
            ].forEach(function(pb, pi) {
              var py = 16 + pi * 12;
              c.fillStyle = '#94a3b8'; c.fillText(pb.label, W - 76, py + 2);
              c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(W - 70, py - 4, 56, 6);
              c.fillStyle = pb.col; c.fillRect(W - 70, py - 4, 56 * (pb.val / 100), 6);
            });

            _queenAnimId.current = requestAnimationFrame(queenFrame);
          }

          if (_queenAnimId.current) cancelAnimationFrame(_queenAnimId.current);
          _queenAnimId.current = requestAnimationFrame(queenFrame);

          return function() {
            if (_queenAnimId.current) cancelAnimationFrame(_queenAnimId.current);
          };
          } // end doSetup
          tryInit();
          return function() {
            if (retryTimer) clearTimeout(retryTimer);
            if (teardownFn) teardownFn();
          };
        }, [viewMode, queenGameActive]);

        // ── Render ──
        var dk = isDark; // shorthand
        // DEBUG: Log render-time values that gate the canvas
        if (!window.__beehiveRenderLogged) window.__beehiveRenderLogged = 0;
        if (window.__beehiveRenderLogged < 3) {
          window.__beehiveRenderLogged++;
          console.log('[Beehive DEBUG RENDER #' + window.__beehiveRenderLogged + '] viewMode=' + viewMode + ' colonySurvived=' + colonySurvived + ' day=' + day + ' showInspect=' + showInspect + ' canvas-will-render=' + (viewMode === 'beekeeper'));
          // Decisive #1 — two React instances?
          console.log('[Beehive DEBUG 2R] ctx.React === window.React:', (React === window.React),
            '| ctx.React.createElement === window.React?.createElement:', (React.createElement === (window.React && window.React.createElement)),
            '| React.version:', React.version,
            '| window.React.version:', (window.React && window.React.version));
          // Decisive #2 — does h('canvas', ...) actually produce a React element?
          var _testEl = h('canvas', { 'aria-label': 'test', style: { width: 10, height: 10 } });
          console.log('[Beehive DEBUG EL] h("canvas") result:',
            _testEl ? ('{$$typeof: ' + String(_testEl.$$typeof) + ', type: ' + _testEl.type + ', has props: ' + !!_testEl.props + '}') : String(_testEl));
        }
        // ═══ TRY ORIGINAL TREE IN TRY/CATCH ═══
        // If the original JSX construction throws, log detailed error + stack trace
        // and fall back to minimal canvas-only tree.
        try {
          var _origRetval = h('div', { className: 'space-y-4 animate-in fade-in duration-200' },
            // Header
            h('div', { className: 'flex items-center justify-between' },
              h('div', { className: 'flex items-center gap-3' },
                h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 rounded-lg transition-colors ' + (dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'), 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: dk ? 'text-slate-200' : 'text-slate-600' })),
                h('div', null,
                  h('h3', { className: 'text-lg font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, '🐝 Beehive Colony Simulator'),
                  h('p', { className: 'text-xs ' + (dk ? 'text-slate-200' : 'text-slate-600') }, 'Manage a living superorganism — 50,000 minds, one purpose'))),
              h('div', { className: 'flex items-center gap-1' },
                h('button', { onClick: function() { upd('soundOn', !soundOn); }, 'aria-label': soundOn ? 'Mute' : 'Unmute', className: 'p-1.5 rounded-lg text-sm ' + (dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100') }, soundOn ? '🔊' : '🔇'))),
            // Mode tabs
            h('div', { className: 'flex gap-1 p-1 rounded-xl ' + (dk ? 'bg-slate-800' : 'bg-slate-100'), role: 'tablist' },
              [
                { id: 'beekeeper', icon: '🧑‍🌾', label: 'Beekeeper' },
                { id: 'queen', icon: '👑', label: 'Queen RTS' },
                { id: 'drone', icon: '🚀', label: 'Drone Flight' }
              ].map(function(tab) {
                var active = viewMode === tab.id;
                return h('button', { key: tab.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                  onClick: function() { upd('viewMode', tab.id); },
                  className: 'flex-1 py-2 px-3 rounded-lg text-xs font-bold ' + (active ? (dk ? 'bg-amber-700 text-white' : 'bg-white text-amber-800') : (dk ? 'text-slate-400' : 'text-slate-500')) },
                  h('span', { 'aria-hidden': 'true' }, tab.icon), ' ', tab.label);
              })),
            // Beekeeper canvas — height bumped 300→500 for a richer view
            viewMode === 'beekeeper' && h('div', { className: 'relative rounded-2xl overflow-hidden border-2 ' + (dk ? 'border-amber-600/50' : 'border-amber-400'), style: { height: '500px', boxShadow: dk ? '0 0 20px rgba(251,191,36,0.08), 0 4px 16px rgba(0,0,0,0.4)' : '0 0 16px rgba(251,191,36,0.1), 0 4px 16px rgba(0,0,0,0.1)' } },
              h('canvas', {
                ref: _cvRef,
                role: 'img',
                'aria-label': 'Animated beehive simulation. Workers: ' + workers + ', Honey: ' + honey + ' lbs, Season: ' + seasonNames[season],
                style: { width: '100%', height: '100%', display: 'block' }
              })
            ),
            // ═══ QUEEN RTS UI ═══
            viewMode === 'queen' && h('div', { className: 'space-y-3' },
              !queenGameActive
                ? h('div', { className: 'rounded-2xl border-2 p-8 text-center space-y-4 ' + (dk ? 'bg-gradient-to-b from-purple-900/40 to-amber-900/30 border-purple-600/50' : 'bg-gradient-to-b from-purple-50 to-amber-50 border-purple-300') },
                    h('div', { className: 'text-5xl mb-2' }, '👑'),
                    h('h3', { className: 'text-lg font-black ' + (dk ? 'text-purple-200' : 'text-purple-900') }, 'Queen Command: Hive RTS'),
                    h('p', { className: 'text-xs max-w-md mx-auto leading-relaxed ' + (dk ? 'text-purple-300' : 'text-purple-700') },
                      'You ARE the queen. Control your colony through pheromones — the chemical language of the hive. Lay eggs, allocate workers, build comb structures, and defend against invaders. You don\'t give orders directly — you emit pheromone signals that influence 50,000 workers.'),
                    h('div', { className: 'grid grid-cols-4 gap-2 max-w-lg mx-auto' },
                      [['💜', 'QMP', 'Suppress rebellion'], ['🚨', 'Alarm', 'Mobilize guards'], ['🏠', 'Nasonov', 'Rally foragers'], ['🥚', 'Brood', 'Stimulate nurses']].map(function(p) {
                        return h('div', { key: p[0], className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-purple-700/30' : 'bg-white border-purple-200') },
                          h('div', { className: 'text-lg' }, p[0]),
                          h('div', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-700') }, p[1]),
                          h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-400' : 'text-slate-500') }, p[2]));
                      })),
                    h('button', { onClick: startQueenGame,
                      className: 'px-8 py-3 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:scale-105 ' + (dk ? 'bg-gradient-to-r from-purple-600 to-amber-600' : 'bg-gradient-to-r from-purple-500 to-amber-500'),
                      style: { boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }
                    }, '👑 Begin Your Reign'))
                : h('div', { className: 'space-y-3' },
                    h('div', { role: 'status', 'aria-live': 'assertive', className: 'flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold ' +
                      (queenPhase === 'swarm' ? (dk ? 'bg-purple-900/40 text-purple-300 border border-purple-600/40' : 'bg-purple-50 text-purple-800 border border-purple-300') :
                       queenPhase === 'defend' ? (dk ? 'bg-red-900/30 text-red-300 border border-red-600/40' : 'bg-red-50 text-red-800 border border-red-300') :
                       (dk ? 'bg-amber-900/30 text-amber-300 border border-amber-600/40' : 'bg-amber-50 text-amber-800 border border-amber-300')) },
                      h('span', null, (queenPhase === 'swarm' ? '🐝 SWARM PHASE' : queenPhase === 'defend' ? '⚔️ DEFEND PHASE' : '🏗️ BUILD PHASE') + ' · Day ' + queenDay)),
                    h('div', { className: 'relative rounded-2xl overflow-hidden border-2 ' + (dk ? 'border-purple-600/50' : 'border-purple-400'), style: { height: '400px', boxShadow: '0 0 20px rgba(147,51,234,0.1)' } },
                      h('canvas', { ref: _queenCvRef, role: 'img', 'aria-label': 'Queen defense game: release pheromones and build structures to protect the colony from threats', style: { width: '100%', height: '100%', display: 'block' } })),
                    h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-purple-900/20 border-purple-700/40' : 'bg-purple-50 border-purple-200') },
                      h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-purple-300' : 'text-purple-800') }, '👑 Pheromone Commands'),
                      h('div', { className: 'grid grid-cols-3 gap-1.5' },
                        QUEEN_ACTIONS.map(function(qa) {
                          return h('button', { key: qa.id, onClick: function() { queenAction(qa.id); }, title: qa.desc,
                            className: 'text-left p-2 rounded-lg border ' + (dk ? 'bg-slate-800 border-purple-700/30 hover:bg-slate-700' : 'bg-white border-purple-100 hover:shadow-sm') },
                            h('div', { className: 'flex items-center gap-1' },
                              h('span', null, qa.icon),
                              h('span', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-800') }, qa.label)),
                            h('div', { className: 'text-[10px] mt-0.5 ' + (dk ? 'text-slate-400' : 'text-slate-500') }, qa.desc));
                        }))),
                    h('div', { className: 'flex gap-2' },
                      h('button', { onClick: advanceQueenDay,
                        className: 'flex-1 py-2.5 rounded-xl font-bold text-sm text-white ' + (dk ? 'bg-gradient-to-r from-purple-700 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-amber-500') }, '⏩ Next Day'),
                      h('button', { onClick: function() { updAll({ queen: Object.assign({}, queenData, { active: false }) }); },
                        className: 'px-4 py-2.5 rounded-xl text-sm font-bold ' + (dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600') }, 'End Game')))
            ),
            // ═══ DRONE FLIGHT UI ═══
            viewMode === 'drone' && h('div', { className: 'space-y-3' },
              !droneFlightActive
                ? h('div', { className: 'rounded-2xl border-2 p-8 text-center space-y-4 ' + (dk ? 'bg-gradient-to-b from-indigo-900/40 to-purple-900/30 border-indigo-600/50' : 'bg-gradient-to-b from-indigo-50 to-purple-50 border-indigo-300') },
                    h('div', { className: 'text-5xl mb-2' }, '🚀'),
                    h('h3', { className: 'text-lg font-black ' + (dk ? 'text-indigo-200' : 'text-indigo-900') }, 'Drone Nuptial Flight'),
                    h('p', { className: 'text-xs max-w-md mx-auto leading-relaxed ' + (dk ? 'text-indigo-300' : 'text-indigo-700') },
                      'Experience life as a drone bee. Fly to the Drone Congregation Area (DCA) and find a queen to mate with. Only 1 in 1,000 succeeds — can you?'),
                    droneHighScore > 0 && h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-400' : 'text-amber-600') }, '🏆 High Score: ' + droneHighScore),
                    h('div', { className: 'flex gap-2 justify-center' },
                      [
                        { id: 'easy', label: '🌱 Easy', col: 'green' },
                        { id: 'normal', label: '🐝 Normal', col: 'amber' },
                        { id: 'hard', label: '🔥 Hard', col: 'red' }
                      ].map(function(diff) {
                        return h('button', { key: diff.id, onClick: function() { startDroneFlight(diff.id); },
                          className: 'px-4 py-3 rounded-xl font-bold text-sm shadow-lg ' +
                            (dk ? 'bg-gradient-to-b from-' + diff.col + '-800 to-' + diff.col + '-900 text-' + diff.col + '-200 border border-' + diff.col + '-700/50'
                                 : 'bg-gradient-to-b from-' + diff.col + '-50 to-' + diff.col + '-100 text-' + diff.col + '-800 border border-' + diff.col + '-300')
                        }, diff.label);
                      })))
                : h('div', { className: 'relative rounded-2xl overflow-hidden border-2 ' + (dk ? 'border-indigo-600/50' : 'border-indigo-400'), style: { height: '500px', boxShadow: '0 0 20px rgba(99,102,241,0.15)' } },
                    h('canvas', { ref: _droneCvRef, role: 'img', 'aria-label': 'Drone flight simulation — use arrow keys to fly', style: { width: '100%', height: '100%', display: 'block' } }),
                    h('button', { onClick: function() { updAll({ drone: Object.assign({}, droneData, { active: false }) }); }, style: { position: 'absolute', top: '8px', left: '8px', zIndex: 10 },
                      className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600/80 text-white hover:bg-red-600', 'aria-label': 'End flight' }, '✕ End Flight'))
            ),
            // SUBSPECIES PICKER (day 0) — IMPORTED FROM ORIGINAL (line 3295 in old file)
            viewMode === 'beekeeper' && day === 0 && colonySurvived && h('div', { className: 'rounded-2xl border-2 p-4 space-y-3 ' + (dk ? 'bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border-amber-500/60' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400'), role: 'region', 'aria-label': 'Choose honeybee subspecies' },
              h('div', null,
                h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-400' : 'text-amber-700') }, '🧬 Choose Your Bee Stock'),
                h('p', { className: 'text-[11px] mt-0.5 ' + (dk ? 'text-slate-300' : 'text-slate-600') }, 'Real honeybees come in distinct genetic lines, each adapted to different climates.'),
                h('p', { className: 'text-[11px] mt-0.5 italic ' + (dk ? 'text-amber-500/70' : 'text-amber-600/70') }, 'Current selection: ' + activeSubspecies.emoji + ' ' + activeSubspecies.name)),
              h('div', { className: 'grid grid-cols-1 gap-2' },
                SUBSPECIES.map(function(s) {
                  var active = activeSubspecies.id === s.id;
                  return h('button', { key: s.id, onClick: function() { updAll({ subspecies: s.id }); },
                    className: 'text-left p-3 rounded-xl border ' + (active ? (dk ? 'bg-amber-900/50 border-amber-400' : 'bg-amber-100 border-amber-500') : (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')) },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-2xl' }, s.emoji),
                      h('div', { className: 'flex-1' },
                        h('span', { className: 'text-sm font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, s.name),
                        h('p', { className: 'text-[11px] mt-1 ' + (dk ? 'text-slate-300' : 'text-slate-700') }, s.note))));
                }))),
            // Next Day + actions
            viewMode === 'beekeeper' && colonySurvived && h('div', { className: 'space-y-2' },
              h('div', { className: 'flex gap-2' },
                h('button', { onClick: advanceDay, className: 'flex-1 py-2.5 rounded-xl font-bold text-sm text-white ' + (dk ? 'bg-amber-600' : 'bg-amber-500') }, '⏩ Next Day'),
                h('button', { onClick: function() { advanceDays(5); }, className: 'px-3 py-2.5 rounded-xl text-xs ' + (dk ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700') }, '+5'),
                h('button', { onClick: function() { advanceDays(30); }, className: 'px-3 py-2.5 rounded-xl text-xs ' + (dk ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600') }, '+30')),
              h('div', { className: 'grid grid-cols-6 gap-1.5' },
                h('button', { onClick: treatVarroa, className: 'p-2 rounded-lg text-xs ' + (dk ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700') }, '🧪 Treat'),
                h('button', { onClick: addSuper, className: 'p-2 rounded-lg text-xs ' + (dk ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700') }, '📦 Super'),
                h('button', { onClick: harvestHoney, className: 'p-2 rounded-lg text-xs ' + (dk ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700') }, '🍯 Harvest'),
                h('button', { onClick: feedBees, className: 'p-2 rounded-lg text-xs ' + (dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700') }, '🥣 Feed'),
                h('button', { onClick: function() { upd('showInspect', true); }, className: 'p-2 rounded-lg text-xs ' + (dk ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-700') }, '🔬 Inspect'),
                h('button', { onClick: function() { upd('showBadges', true); }, className: 'p-2 rounded-lg text-xs ' + (dk ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700') }, '🏅 Badges')))
          );
          console.log('[Beehive ORIGINAL] return succeeded, committing full tree');
          return _origRetval;
        } catch(origErr) {
          console.error('[Beehive ORIGINAL THROW]', origErr && origErr.message, '\nStack:', origErr && origErr.stack);
          // Fall through to the bisect tree which is known to work
        }

        // ═══ ITERATIVE BISECT — fallback tree ═══
        // Rebuild each top-level child of the ORIGINAL tree inside a try/catch.
        // Any child that throws or returns an invalid value is logged with its label.
        // The canvas container is always present so it renders regardless of failures.
        var _children = [];
        var _mk = function(label, fn) {
          try {
            var el = fn();
            // Validate
            function _valid(x) {
              if (x === null || x === false || x === true || x === undefined) return true;
              if (typeof x === 'string' || typeof x === 'number') return true;
              if (Array.isArray(x)) return x.every(_valid);
              if (x && typeof x === 'object' && typeof x.$$typeof !== 'undefined') return true;
              return false;
            }
            if (!_valid(el)) {
              console.error('[Beehive BISECT INVALID]', label, '→ type=' + typeof el, el);
              return;
            }
            _children.push(el);
          } catch(e) {
            console.error('[Beehive BISECT THROW]', label, '→', e && e.message ? e.message : e, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : '');
          }
        };
        // Canvas container — always included so visible
        _mk('canvas-container', function() {
          return viewMode === 'beekeeper' && h('div', {
            id: 'beehive-canvas-container',
            style: { height: '300px', border: '4px dashed red', position: 'relative' }
          },
            h('canvas', {
              ref: _cvRef,
              role: 'img',
              'aria-label': 'Animated beehive simulation. Workers: ' + workers + ', Honey: ' + honey + ' lbs, Season: ' + seasonNames[season],
              style: { width: '100%', height: '100%', display: 'block' }
            })
          );
        });
        // Top banner for diagnostic visibility
        _mk('top-banner', function() {
          return h('div', { style: { background: 'magenta', color: 'white', padding: '16px', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' } },
            '🟣 ITERATIVE BISECT — canvas works; restoring children one block at a time');
        });
        // Header
        _mk('header', function() {
          return h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 rounded-lg transition-colors ' + (dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'), 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: dk ? 'text-slate-200' : 'text-slate-600' })),
              h('div', null,
                h('h3', { className: 'text-lg font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, '🐝 Beehive Colony Simulator'),
                h('p', { className: 'text-xs ' + (dk ? 'text-slate-200' : 'text-slate-600') }, 'Manage a living superorganism — 50,000 minds, one purpose'))),
            h('div', { className: 'flex items-center gap-1' },
              h('button', { onClick: function() { upd('soundOn', !soundOn); }, 'aria-label': soundOn ? 'Mute' : 'Unmute', className: 'p-1.5 rounded-lg text-sm ' + (dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100') }, soundOn ? '🔊' : '🔇')));
        });
        // Mode tabs
        _mk('mode-tabs', function() {
          return h('div', { className: 'flex gap-1 p-1 rounded-xl ' + (dk ? 'bg-slate-800' : 'bg-slate-100'), role: 'tablist' },
            [
              { id: 'beekeeper', icon: '🧑‍🌾', label: 'Beekeeper' },
              { id: 'queen', icon: '👑', label: 'Queen RTS' },
              { id: 'drone', icon: '🚀', label: 'Drone Flight' }
            ].map(function(tab) {
              var active = viewMode === tab.id;
              return h('button', { key: tab.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd('viewMode', tab.id); },
                className: 'flex-1 py-2 px-3 rounded-lg text-xs font-bold ' + (active ? (dk ? 'bg-amber-700 text-white' : 'bg-white text-amber-800') : (dk ? 'text-slate-400' : 'text-slate-500')) },
                h('span', { 'aria-hidden': 'true' }, tab.icon), ' ', tab.label);
            }));
        });
        // Next Day + Action buttons (just the core)
        _mk('next-day-actions', function() {
          return viewMode === 'beekeeper' && colonySurvived && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex gap-2' },
              h('button', { onClick: advanceDay, className: 'flex-1 py-2.5 rounded-xl font-bold text-sm text-white ' + (dk ? 'bg-amber-600' : 'bg-amber-500') }, '⏩ Next Day')),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('button', { onClick: treatVarroa, className: 'p-2 rounded-lg text-xs bg-red-100 text-red-700' }, '🧪 Treat'),
              h('button', { onClick: harvestHoney, className: 'p-2 rounded-lg text-xs bg-amber-100 text-amber-700' }, '🍯 Harvest'),
              h('button', { onClick: feedBees, className: 'p-2 rounded-lg text-xs bg-slate-100 text-slate-700' }, '🥣 Feed')));
        });
        console.log('[Beehive BISECT] built _children with ' + _children.length + ' validated elements');
        var _bisectRetval = h('div', { className: 'space-y-4' }, _children);
        setTimeout(function() {
          var cc = document.getElementById('beehive-canvas-container');
          var cv = cc ? cc.querySelector('canvas') : null;
          console.log('[Beehive BISECT] canvas-container in DOM:', cc ? 'YES' : 'NO',
            '| canvas in DOM:', cv ? 'YES (' + cv.clientWidth + 'x' + cv.clientHeight + ')' : 'NO',
            '| _cvRef.current:', _cvRef.current ? 'ATTACHED' : 'NULL');
        }, 200);
        return _bisectRetval;

        // === ORIGINAL TREE (disabled for diagnostic) ===
        /* eslint-disable */
        return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },
          // DIAGNOSTIC: unconditional top-of-return marker — if invisible, outer div itself isn't committing
          h('div', { style: { background: 'red', color: 'white', padding: '20px', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', border: '4px solid black' } },
            '🔴 TOP MARKER — outer div committed OK'),
          // Header
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 rounded-lg transition-colors ' + (dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'), 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: dk ? 'text-slate-200' : 'text-slate-600' })),
              h('div', null,
                h('h3', { className: 'text-lg font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, '🐝 Beehive Colony Simulator'),
                h('p', { className: 'text-xs ' + (dk ? 'text-slate-200' : 'text-slate-600') }, 'Manage a living superorganism — 50,000 minds, one purpose'))),
            // Header action buttons
            h('div', { className: 'flex items-center gap-1' },
              // Sound toggle
              h('button', { onClick: function() { upd('soundOn', !soundOn); }, 'aria-label': soundOn ? 'Mute sound effects' : 'Enable sound effects', title: soundOn ? 'Sound on' : 'Sound off',
                className: 'p-1.5 rounded-lg text-sm transition-all ' + (dk ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500') }, soundOn ? '🔊' : '🔇'),
              // Quiz button
              h('button', { onClick: startQuiz, 'aria-label': 'Take the Bee Knowledge Quiz', title: 'Bee Quiz' + (d.bestQuizScore ? ' (Best: ' + d.bestQuizScore + ')' : ''),
                className: 'p-1.5 rounded-lg text-sm transition-all ' + (dk ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500') }, '🎓'),
              // Badges button
              h('button', { onClick: function() { upd('showBadges', !showBadges); }, 'aria-label': 'View badges (' + badgeCount + '/' + BADGE_DEFS.length + ' earned)', title: 'Badges: ' + badgeCount + '/' + BADGE_DEFS.length,
                className: 'p-1.5 rounded-lg text-sm transition-all relative ' + (dk ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500') },
                '🏅',
                badgeCount > 0 && h('span', { className: 'absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white bg-amber-500' }, badgeCount)),
              // Export colony report
              h('button', { onClick: exportColonyReport, 'aria-label': 'Export colony report as markdown', title: 'Export colony report to clipboard',
                className: 'p-1.5 rounded-lg text-sm transition-all ' + (dk ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500') }, '📄'),
              // Keyboard help
              h('button', { onClick: function() { upd('showKeys', !d.showKeys); }, 'aria-label': 'Keyboard shortcuts', title: 'Keyboard shortcuts',
                className: 'p-1.5 rounded-lg text-sm transition-all ' + (dk ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-500') }, '⌨️'))),

          // ═══ MODE SELECTOR TABS ═══
          h('div', { className: 'flex gap-1 p-1 rounded-xl ' + (dk ? 'bg-slate-800' : 'bg-slate-100'), role: 'tablist', 'aria-label': 'Simulation perspective' },
            [
              { id: 'beekeeper', icon: '🧑‍🌾', label: 'Beekeeper', desc: 'Manage the colony from outside' },
              { id: 'queen', icon: '👑', label: 'Queen RTS', desc: 'Command the hive from within' },
              { id: 'drone', icon: '🚀', label: 'Drone Flight', desc: 'Fly the nuptial flight in 3D' }
            ].map(function(tab) {
              var active = viewMode === tab.id;
              return h('button', { key: tab.id, role: 'tab', 'aria-selected': active ? 'true' : 'false',
                onClick: function() { upd('viewMode', tab.id); },
                className: 'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ' +
                  (active ? (dk ? 'bg-amber-700 text-white shadow-md' : 'bg-white text-amber-800 shadow-md') : (dk ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50')),
                title: tab.desc
              }, h('span', { 'aria-hidden': 'true' }, tab.icon), tab.label);
            })),

          // ═══ BEEKEEPER CANVAS (only in beekeeper mode) ═══
          // DIAGNOSTIC: yellow MARKER + lime CANVAS + red border — if we see the marker but no canvas,
          // React is specifically rejecting the canvas element (two-React-instance hypothesis).
          viewMode === 'beekeeper' && h('div', { style: { height: '300px', border: '4px dashed red', position: 'relative' } },
            h('div', { style: { background: 'yellow', color: 'black', padding: '8px', fontWeight: 'bold', fontSize: '14px' } }, '🟡 MARKER: canvas container reached render'),
            h('canvas', {
              ref: _cvRef,
              role: 'img',
              'aria-label': 'test canvas',
              style: { width: '100%', height: '240px', display: 'block', background: 'lime' }
            })
          ),

          // ═══ DRONE FLIGHT MODE UI ═══
          viewMode === 'drone' && h('div', { className: 'space-y-3' },
            // Drone canvas (or launch screen)
            !droneFlightActive
              ? h('div', { className: 'rounded-2xl border-2 p-8 text-center space-y-4 ' + (dk ? 'bg-gradient-to-b from-indigo-900/40 to-purple-900/30 border-indigo-600/50' : 'bg-gradient-to-b from-indigo-50 to-purple-50 border-indigo-300') },
                  h('div', { className: 'text-5xl mb-2' }, '🚀'),
                  h('h3', { className: 'text-lg font-black ' + (dk ? 'text-indigo-200' : 'text-indigo-900') }, 'Drone Nuptial Flight'),
                  h('p', { className: 'text-xs max-w-md mx-auto leading-relaxed ' + (dk ? 'text-indigo-300' : 'text-indigo-700') },
                    'Experience life as a drone bee. Your sole purpose: fly to the Drone Congregation Area (DCA) at 200+ feet altitude and find a queen to mate with. You have 90 seconds of flight energy. Only 1 in 1,000 drones succeeds — can you?'),
                  h('div', { className: 'grid grid-cols-3 gap-3 max-w-sm mx-auto text-center' },
                    [['🎯', 'Find the DCA', 'Fly high and far'], ['👑', 'Locate Queen', 'Follow the golden glow'], ['📚', 'Learn Facts', 'Science appears as you fly']].map(function(g) {
                      return h('div', { key: g[0], className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-indigo-700/30' : 'bg-white border-indigo-200') },
                        h('div', { className: 'text-lg' }, g[0]),
                        h('div', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-700') }, g[1]),
                        h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-400' : 'text-slate-500') }, g[2]));
                    })),
                  droneHighScore > 0 && h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-400' : 'text-amber-600') }, '🏆 High Score: ' + droneHighScore),
                  // Difficulty selector
                  h('div', { className: 'flex gap-2 justify-center' },
                    [
                      { id: 'easy', label: '🌱 Easy', desc: '150s, fewer birds, closer queen', col: 'green' },
                      { id: 'normal', label: '🐝 Normal', desc: '110s, balanced challenge', col: 'amber' },
                      { id: 'hard', label: '🔥 Hard', desc: '75s, more birds, distant queen', col: 'red' }
                    ].map(function(diff) {
                      return h('button', { key: diff.id, onClick: function() { startDroneFlight(diff.id); },
                        className: 'px-4 py-3 rounded-xl font-bold text-sm shadow-lg transition-all hover:scale-105 ' +
                          (dk ? 'bg-gradient-to-b from-' + diff.col + '-800 to-' + diff.col + '-900 text-' + diff.col + '-200 border border-' + diff.col + '-700/50 hover:from-' + diff.col + '-700 hover:to-' + diff.col + '-800'
                               : 'bg-gradient-to-b from-' + diff.col + '-50 to-' + diff.col + '-100 text-' + diff.col + '-800 border border-' + diff.col + '-300 hover:from-' + diff.col + '-100 hover:to-' + diff.col + '-200'),
                        title: diff.desc
                      },
                        h('div', null, diff.label),
                        h('div', { className: 'text-[10px] mt-0.5 opacity-70' }, diff.desc));
                    })),
                  h('p', { className: 'text-[11px] ' + (dk ? 'text-slate-500' : 'text-slate-400') }, 'Arrow keys / WASD = steer · Space = climb · Shift = descend · Fly low near glowing flowers to collect pollen!'))
              : h('div', { className: 'relative rounded-2xl overflow-hidden border-2 ' + (dk ? 'border-indigo-600/50' : 'border-indigo-400'), style: { height: '400px', boxShadow: '0 0 20px rgba(99,102,241,0.15)' } },
                  h('canvas', { ref: _droneCvRef, role: 'img', 'aria-label': 'Drone flight simulation — use arrow keys to fly', style: { width: '100%', height: '100%', display: 'block' } }),
                  // Stop button overlay
                  h('button', { onClick: function() { updAll({ drone: Object.assign({}, droneData, { active: false }) }); }, style: { position: 'absolute', top: '8px', left: '8px', zIndex: 10 },
                    className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-red-600/80 text-white hover:bg-red-600 backdrop-blur-sm transition-all', 'aria-label': 'End flight' }, '✕ End Flight')),
            // Drone science sidebar
            droneFlightActive && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200') },
              h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-indigo-300' : 'text-indigo-800') }, '📚 Drone Science Facts Discovered'),
              (_droneState.current.facts || []).length === 0
                ? h('p', { className: 'text-[11px] italic ' + (dk ? 'text-slate-500' : 'text-slate-400') }, 'Keep flying to discover facts...')
                : h('div', { className: 'space-y-1' },
                    (_droneState.current.facts || []).map(function(fact, fi) {
                      return h('div', { key: fi, className: 'text-[11px] p-2 rounded-lg border ' + (dk ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-indigo-50 border-indigo-100 text-slate-600') }, fact);
                    })))),

          // ═══ QUEEN RTS MODE UI ═══
          viewMode === 'queen' && h('div', { className: 'space-y-3' },
            !queenGameActive
              ? h('div', { className: 'rounded-2xl border-2 p-8 text-center space-y-4 ' + (dk ? 'bg-gradient-to-b from-purple-900/40 to-amber-900/30 border-purple-600/50' : 'bg-gradient-to-b from-purple-50 to-amber-50 border-purple-300') },
                  h('div', { className: 'text-5xl mb-2' }, '👑'),
                  h('h3', { className: 'text-lg font-black ' + (dk ? 'text-purple-200' : 'text-purple-900') }, 'Queen Command: Hive RTS'),
                  h('p', { className: 'text-xs max-w-md mx-auto leading-relaxed ' + (dk ? 'text-purple-300' : 'text-purple-700') },
                    'You ARE the queen. Control your colony through pheromones — the chemical language of the hive. Lay eggs, allocate workers, build comb structures, and defend against invaders. You don\'t give orders directly — you emit pheromone signals that influence 50,000 workers.'),
                  // Pheromone cards
                  h('div', { className: 'grid grid-cols-4 gap-2 max-w-lg mx-auto text-center' },
                    [['💜', 'QMP', 'Suppress rebellion'], ['🚨', 'Alarm', 'Mobilize guards'], ['🏠', 'Nasonov', 'Rally foragers'], ['🥚', 'Brood', 'Stimulate nurses']].map(function(p) {
                      return h('div', { key: p[0], className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-purple-700/30' : 'bg-white border-purple-200') },
                        h('div', { className: 'text-lg' }, p[0]),
                        h('div', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-700') }, p[1]),
                        h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-400' : 'text-slate-500') }, p[2]));
                    })),
                  // Phase progression explanation
                  h('div', { className: 'text-xs font-bold mt-2 ' + (dk ? 'text-purple-300' : 'text-purple-700') }, '📋 Three Phases of Your Reign'),
                  h('div', { className: 'grid grid-cols-3 gap-2 max-w-lg mx-auto' },
                    [
                      { icon: '🏗️', phase: 'BUILD', days: 'Days 1–10', desc: 'Establish your colony. Build structures, lay eggs, stockpile resources. Threats are rare.', col: 'amber' },
                      { icon: '⚔️', phase: 'DEFEND', days: 'Days 11–24', desc: 'Threats double. Wasps, robber bees, hornets attack. Build guard posts, keep alarm pheromone ready.', col: 'red' },
                      { icon: '🐝', phase: 'SWARM', days: 'Day 25+', desc: 'Colony wants to split! Keep QMP above 40 or half your workers leave. Survive the swarm impulse.', col: 'purple' }
                    ].map(function(ph) {
                      return h('div', { key: ph.phase, className: 'rounded-lg p-2.5 border text-left ' + (dk ? 'bg-slate-800 border-' + ph.col + '-700/30' : 'bg-white border-' + ph.col + '-200') },
                        h('div', { className: 'flex items-center gap-1 mb-1' },
                          h('span', null, ph.icon),
                          h('span', { className: 'text-[11px] font-black ' + (dk ? 'text-' + ph.col + '-300' : 'text-' + ph.col + '-700') }, ph.phase)),
                        h('div', { className: 'text-[10px] font-bold mb-0.5 ' + (dk ? 'text-slate-400' : 'text-slate-500') }, ph.days),
                        h('div', { className: 'text-[10px] leading-relaxed ' + (dk ? 'text-slate-400' : 'text-slate-500') }, ph.desc));
                    })),
                  h('button', { onClick: startQueenGame,
                    className: 'px-8 py-3 rounded-xl font-bold text-white text-sm shadow-lg transition-all hover:scale-105 ' + (dk ? 'bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500' : 'bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600'),
                    style: { boxShadow: '0 4px 16px rgba(147,51,234,0.4)' }
                  }, '👑 Begin Your Reign'))
              : h('div', { className: 'space-y-3' },
                  // Phase banner
                  h('div', { role: 'status', 'aria-live': 'assertive', className: 'flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold ' +
                    (queenPhase === 'swarm' ? (dk ? 'bg-purple-900/40 text-purple-300 border border-purple-600/40' : 'bg-purple-50 text-purple-800 border border-purple-300') :
                     queenPhase === 'defend' ? (dk ? 'bg-red-900/30 text-red-300 border border-red-600/40' : 'bg-red-50 text-red-800 border border-red-300') :
                     (dk ? 'bg-amber-900/30 text-amber-300 border border-amber-600/40' : 'bg-amber-50 text-amber-800 border border-amber-300')) },
                    h('span', null, (queenPhase === 'swarm' ? '🐝 SWARM PHASE' : queenPhase === 'defend' ? '⚔️ DEFEND PHASE' : '🏗️ BUILD PHASE') + ' · Day ' + queenDay),
                    h('span', null, ['🌱 Spring', '☀️ Summer', '🍂 Autumn', '❄️ Winter'][Math.floor(((queenDay || 0) % 120) / 30)] || ''),
                    queenThreats.length > 0 && h('span', { className: dk ? 'text-red-400' : 'text-red-600' }, '⚠ ' + queenThreats.length + ' threat' + (queenThreats.length > 1 ? 's' : ''))),
                  // Queen canvas
                  h('div', { className: 'relative rounded-2xl overflow-hidden border-2 ' + (dk ? 'border-purple-600/50' : 'border-purple-400'), style: { height: '350px', boxShadow: '0 0 20px rgba(147,51,234,0.1)' } },
                    h('canvas', { ref: _queenCvRef, role: 'img', 'aria-label': 'Queen defense game: release pheromones and build structures to protect the colony from threats', style: { width: '100%', height: '100%', display: 'block' } })),
                  // Queen Actions bar
                  h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-purple-900/20 border-purple-700/40' : 'bg-purple-50 border-purple-200') },
                    h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-purple-300' : 'text-purple-800') }, '👑 Pheromone Commands'),
                    h('div', { className: 'grid grid-cols-3 gap-1.5' },
                      QUEEN_ACTIONS.map(function(qa) {
                        return h('button', { key: qa.id, onClick: function() { queenAction(qa.id); }, title: qa.desc,
                          className: 'text-left p-2 rounded-lg border transition-all ' + (dk ? 'bg-slate-800 border-purple-700/30 hover:border-purple-500/50 hover:bg-slate-700' : 'bg-white border-purple-100 hover:border-purple-400 hover:shadow-sm') },
                          h('div', { className: 'flex items-center gap-1' },
                            h('span', null, qa.icon),
                            h('span', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-800') }, qa.label)),
                          h('div', { className: 'text-[10px] mt-0.5 ' + (dk ? 'text-slate-400' : 'text-slate-500') }, qa.desc));
                      }))),
                  // Build structures
                  h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200') },
                    h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-amber-300' : 'text-amber-800') }, '🏗️ Build Comb Structures'),
                    h('div', { className: 'grid grid-cols-3 gap-1.5' },
                      Object.keys(QUEEN_STRUCTURE_TYPES).map(function(stId) {
                        var st = QUEEN_STRUCTURE_TYPES[stId];
                        var costStr = Object.keys(st.cost).map(function(k) { return k + ': ' + st.cost[k]; }).join(', ');
                        return h('button', { key: stId, onClick: function() { buildQueenStructure(stId); }, title: st.desc + ' (Cost: ' + costStr + ')',
                          className: 'text-left p-2 rounded-lg border transition-all ' + (dk ? 'bg-slate-800 border-amber-700/30 hover:border-amber-500/50 hover:bg-slate-700' : 'bg-white border-amber-100 hover:border-amber-400 hover:shadow-sm') },
                          h('div', { className: 'flex items-center gap-1' },
                            h('span', null, st.icon),
                            h('span', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-800') }, st.label)),
                          h('div', { className: 'text-[10px] mt-0.5 ' + (dk ? 'text-slate-400' : 'text-slate-500') }, costStr || 'Free'));
                      }))),
                  // Advance day + events
                  h('div', { className: 'flex gap-2' },
                    h('button', { onClick: advanceQueenDay,
                      className: 'flex-1 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all hover:shadow-md ' + (dk ? 'bg-gradient-to-r from-purple-700 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-amber-500') }, '⏩ Next Day'),
                    h('button', { onClick: function() { updAll({ queen: Object.assign({}, queenData, { active: false }) }); },
                      className: 'px-4 py-2.5 rounded-xl text-sm font-bold transition-all ' + (dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, 'End Game')),
                  // Event log (ARIA live region for screen readers)
                  queenEvents.length > 0 && h('div', { role: 'log', 'aria-live': 'polite', 'aria-label': 'Hive events log — latest colony events and alerts', className: 'rounded-xl border p-3 max-h-32 overflow-y-auto ' + (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200') },
                    h('div', { className: 'text-xs font-bold mb-1 ' + (dk ? 'text-slate-300' : 'text-slate-700') }, '📋 Hive Events'),
                    h('div', { className: 'space-y-1' },
                      queenEvents.slice().reverse().map(function(ev, ei) {
                        var evColor = ev.type === 'threat' || ev.type === 'rebellion' || ev.type === 'swarm' || ev.type === 'starve' ? (dk ? 'text-red-400' : 'text-red-600') :
                                     ev.type === 'victory' ? (dk ? 'text-green-400' : 'text-green-600') :
                                     ev.type === 'phase' || ev.type === 'season' ? (dk ? 'text-amber-400' : 'text-amber-700') :
                                     (dk ? 'text-slate-400' : 'text-slate-500');
                        return h('div', { key: ei, className: 'text-[11px] py-1 border-b last:border-0 ' + (dk ? 'border-slate-700 ' : 'border-slate-100 ') + evColor }, ev.text);
                      }))))),

          // ═══ SUBSPECIES PICKER (day 0 only, before first Next Day click) ═══
          viewMode === 'beekeeper' && day === 0 && colonySurvived && h('div', { className: 'rounded-2xl border-2 p-4 space-y-3 ' + (dk ? 'bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border-amber-500/60' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400'), role: 'region', 'aria-label': 'Choose honeybee subspecies' },
            h('div', null,
              h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-400' : 'text-amber-700') }, '🧬 Choose Your Bee Stock'),
              h('p', { className: 'text-[11px] mt-0.5 ' + (dk ? 'text-slate-300' : 'text-slate-600') }, 'Real honeybees come in distinct genetic lines, each adapted to different climates. Pick a subspecies — it will modify honey yield, winter survival, spring buildup, and varroa resistance throughout your colony\'s life.'),
              h('p', { className: 'text-[11px] mt-0.5 italic ' + (dk ? 'text-amber-500/70' : 'text-amber-600/70') }, 'Current selection: ' + activeSubspecies.emoji + ' ' + activeSubspecies.name + (d.subspecies ? '' : ' (default)'))),
            h('div', { className: 'grid grid-cols-1 gap-2' },
              SUBSPECIES.map(function(s) {
                var active = activeSubspecies.id === s.id;
                return h('button', { key: s.id, onClick: function() {
                    updAll({ subspecies: s.id });
                    if (addToast) addToast(s.emoji + ' ' + s.name + ' bees established — ' + s.origin, 'success');
                  },
                  'aria-label': 'Select ' + s.name + ' subspecies from ' + s.origin,
                  className: 'text-left p-3 rounded-xl border transition-all ' +
                    (active
                      ? (dk ? 'bg-amber-900/50 border-amber-400 shadow-lg' : 'bg-amber-100 border-amber-500 shadow-md')
                      : (dk ? 'bg-slate-800 border-slate-700 hover:border-amber-500/60 hover:bg-slate-700' : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm'))
                },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-2xl' }, s.emoji),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('span', { className: 'text-sm font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, s.name),
                        h('span', { className: 'text-[11px] italic ' + (dk ? 'text-amber-400' : 'text-amber-600') }, s.sci),
                        h('span', { className: 'text-[11px] ' + (dk ? 'text-slate-400' : 'text-slate-500') }, '· ' + s.origin),
                        active && h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded font-bold ' + (dk ? 'bg-amber-500 text-slate-900' : 'bg-amber-500 text-white') }, '✓ Selected')),
                      h('p', { className: 'text-[11px] mt-1 ' + (dk ? 'text-slate-300' : 'text-slate-700') }, s.note),
                      // Trait bars
                      h('div', { className: 'grid grid-cols-4 gap-1.5 mt-2' },
                        [
                          { k: 'Honey', v: s.mods.honey, c: 'amber' },
                          { k: 'Spring', v: s.mods.spring, c: 'green' },
                          { k: 'Winter', v: s.mods.winter, c: 'sky' },
                          { k: 'Varroa ✓', v: 2 - s.mods.varroa, c: 'red' } // invert: lower varroa growth = better = show as higher
                        ].map(function(t, ti) {
                          var pct = Math.max(0, Math.min(100, Math.round((t.v - 0.5) * 100)));
                          return h('div', { key: ti },
                            h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                              h('span', { className: dk ? 'text-slate-400' : 'text-slate-500' }, t.k),
                              h('span', { className: dk ? 'text-slate-300' : 'text-slate-600' }, Math.round(t.v * 100) + '%')),
                            h('div', { className: 'h-1.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200') },
                              h('div', { style: { width: pct + '%' }, className: 'h-full bg-' + t.c + '-400 rounded-full' })));
                        })))));
              }))),

          // ═══ APIARY SITE PICKER (day 0 only) ═══
          viewMode === 'beekeeper' && day === 0 && colonySurvived && h('div', { className: 'rounded-2xl border-2 p-4 space-y-3 ' + (dk ? 'bg-gradient-to-br from-green-900/40 to-emerald-900/30 border-green-500/50' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400'), role: 'region', 'aria-label': 'Choose apiary site' },
            h('div', null,
              h('div', { className: 'text-xs font-bold ' + (dk ? 'text-green-400' : 'text-green-700') }, '📍 Choose Your Apiary Site'),
              h('p', { className: 'text-[11px] mt-0.5 ' + (dk ? 'text-slate-300' : 'text-slate-600') }, 'Real beekeepers spend weeks choosing a site. Forage range, sun exposure, wind, water, and neighbors all matter. Your choice modifies nectar yield and disease pressure for this colony\'s life.'),
              h('p', { className: 'text-[11px] mt-0.5 italic ' + (dk ? 'text-green-500/70' : 'text-green-600/70') }, 'Current: ' + activeSite.emoji + ' ' + activeSite.name + (d.apiarySite ? '' : ' (default)'))),
            h('div', { className: 'grid grid-cols-1 gap-2' },
              APIARY_SITES.map(function(s) {
                var active = activeSite.id === s.id;
                return h('button', { key: s.id, onClick: function() {
                    updAll({ apiarySite: s.id });
                    if (addToast) addToast(s.emoji + ' Apiary placed at ' + s.name, 'success');
                  },
                  'aria-label': 'Select ' + s.name + ' as apiary site',
                  className: 'text-left p-3 rounded-xl border transition-all ' +
                    (active
                      ? (dk ? 'bg-green-900/40 border-green-400 shadow-lg' : 'bg-green-100 border-green-500 shadow-md')
                      : (dk ? 'bg-slate-800 border-slate-700 hover:border-green-500/60 hover:bg-slate-700' : 'bg-white border-slate-200 hover:border-green-400 hover:shadow-sm'))
                },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-2xl' }, s.emoji),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('span', { className: 'text-sm font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, s.name),
                        active && h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded font-bold ' + (dk ? 'bg-green-500 text-slate-900' : 'bg-green-500 text-white') }, '✓ Selected')),
                      h('p', { className: 'text-[11px] mt-1 ' + (dk ? 'text-slate-300' : 'text-slate-700') }, s.note),
                      h('div', { className: 'flex gap-3 mt-2 text-[11px]' },
                        h('span', { className: s.mods.forage > 1.0 ? (dk ? 'text-green-400' : 'text-green-700') : s.mods.forage < 1.0 ? (dk ? 'text-amber-400' : 'text-amber-700') : (dk ? 'text-slate-400' : 'text-slate-500') },
                          '🌸 Forage ' + Math.round(s.mods.forage * 100) + '%'),
                        h('span', { className: s.mods.disease < 1.0 ? (dk ? 'text-green-400' : 'text-green-700') : s.mods.disease > 1.0 ? (dk ? 'text-red-400' : 'text-red-700') : (dk ? 'text-slate-400' : 'text-slate-500') },
                          '🦠 Disease ' + Math.round(s.mods.disease * 100) + '%')))));
              }))),

          // ═══ TUTORIAL OVERLAY ═══
          tutorialStep >= 0 && !tutorialDone && h('div', { className: 'rounded-2xl border-2 p-5 space-y-3 ' + (dk ? 'bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border-amber-500/60' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400'), role: 'dialog', 'aria-label': 'Tutorial step ' + (tutorialStep + 1) + ' of ' + TUTORIAL_STEPS.length },
            h('div', { className: 'flex items-center justify-between' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl' }, TUTORIAL_STEPS[tutorialStep].icon),
                h('div', null,
                  h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-400' : 'text-amber-600') }, 'Getting Started · Step ' + (tutorialStep + 1) + '/' + TUTORIAL_STEPS.length),
                  h('div', { className: 'text-sm font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, TUTORIAL_STEPS[tutorialStep].title))),
              h('button', { onClick: function() { updAll({ tutorialStep: -1, tutorialDone: true }); }, 'aria-label': 'Skip tutorial', className: 'text-[11px] px-2 py-1 rounded-lg ' + (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100') }, 'Skip')),
            h('p', { className: 'text-xs leading-relaxed ' + (dk ? 'text-slate-300' : 'text-slate-600') }, TUTORIAL_STEPS[tutorialStep].text),
            // Progress dots
            h('div', { className: 'flex items-center justify-between' },
              h('div', { className: 'flex gap-1' },
                TUTORIAL_STEPS.map(function(_, si) {
                  return h('div', { key: si, className: 'w-2 h-2 rounded-full transition-all ' + (si === tutorialStep ? (dk ? 'bg-amber-400' : 'bg-amber-500') : si < tutorialStep ? (dk ? 'bg-amber-600' : 'bg-amber-300') : (dk ? 'bg-slate-600' : 'bg-slate-300')) });
                })),
              h('div', { className: 'flex gap-2' },
                tutorialStep > 0 && h('button', { onClick: function() { upd('tutorialStep', tutorialStep - 1); }, className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (dk ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, '← Back'),
                h('button', { onClick: function() {
                  if (tutorialStep + 1 >= TUTORIAL_STEPS.length) { updAll({ tutorialStep: -1, tutorialDone: true }); }
                  else { upd('tutorialStep', tutorialStep + 1); }
                }, className: 'px-4 py-1.5 rounded-lg text-xs font-bold text-white ' + (dk ? 'bg-amber-600 hover:bg-amber-500' : 'bg-amber-500 hover:bg-amber-600') },
                  tutorialStep + 1 >= TUTORIAL_STEPS.length ? '✓ Start Beekeeping!' : 'Next →')))),

          // ═══ YEAR-END REPORT CARD ═══
          viewMode === 'beekeeper' && colonySurvived && (function() {
            var completedYears = Math.floor(day / 120);
            if (completedYears <= 0) return null;
            var seen = d.yearReviewsSeen || [];
            if (seen.indexOf(completedYears) !== -1) return null;
            // Grade calculation from the current year's performance
            var harvested = d.totalHarvested || 0;
            var varietalCount = Object.keys(d.varietals || {}).length;
            var conservations = d.conservationsDone || 0;
            var eventsHandled = d.eventsHandled || 0;
            // Peak workforce from history
            var peakWorkers = history.reduce(function(a, e) { return Math.max(a, e.w || 0); }, workers);
            var lowestVarroa = history.reduce(function(a, e) { return Math.min(a, e.v || 100); }, varroaLevel);
            // Grading: points for various things
            var grade = 0;
            if (colonyHealth >= 80) grade += 2; else if (colonyHealth >= 55) grade += 1;
            if (harvested >= 40) grade += 2; else if (harvested >= 15) grade += 1;
            if (varietalCount >= 3) grade += 1;
            if (conservations >= 3) grade += 1;
            if (eventsHandled >= 3) grade += 1;
            if (peakWorkers >= 30000) grade += 1;
            if (lowestVarroa <= 20) grade += 1;
            var letter = grade >= 8 ? 'A+' : grade >= 6 ? 'A' : grade >= 5 ? 'B' : grade >= 3 ? 'C' : grade >= 2 ? 'D' : 'F';
            var letterColor = grade >= 6 ? (dk ? 'text-amber-400' : 'text-amber-600') : grade >= 3 ? (dk ? 'text-green-400' : 'text-green-600') : (dk ? 'text-red-400' : 'text-red-600');
            return h('div', { className: 'rounded-2xl border-2 p-5 space-y-3 ' + (dk ? 'bg-gradient-to-br from-amber-900/40 to-yellow-900/30 border-amber-400' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-400'), role: 'dialog', 'aria-label': 'Year ' + completedYears + ' retrospective', style: { boxShadow: '0 0 24px rgba(251,191,36,0.25)' } },
              h('div', { className: 'flex items-start justify-between' },
                h('div', null,
                  h('div', { className: 'text-[11px] font-bold uppercase tracking-wider ' + (dk ? 'text-amber-400' : 'text-amber-600') }, '🏆 Year ' + completedYears + ' Retrospective'),
                  h('h3', { className: 'text-lg font-black ' + (dk ? 'text-amber-200' : 'text-amber-900') }, 'Your colony survived ' + (completedYears * 120) + ' days!')),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-5xl font-black ' + letterColor, style: { fontFamily: 'Georgia, serif' } }, letter),
                  h('div', { className: 'text-[10px] ' + (dk ? 'text-amber-400' : 'text-amber-600') }, grade + '/9 points'))),
              // Highlight stats
              h('div', { className: 'grid grid-cols-4 gap-2' },
                [
                  { emoji: '🍯', val: Math.round(harvested * 10) / 10 + ' lbs', label: 'Honey harvested' },
                  { emoji: '🌸', val: varietalCount + '', label: 'Varietals produced' },
                  { emoji: '👷', val: fmtPop(peakWorkers) + '', label: 'Peak workforce' },
                  { emoji: '🦟', val: lowestVarroa + '%', label: 'Min. varroa' },
                  { emoji: '🌍', val: conservations + '', label: 'Conservations' },
                  { emoji: '⚡', val: eventsHandled + '', label: 'Events handled' },
                  { emoji: '🍯', val: (Math.round((d.totalHoney || 0) * 10) / 10) + ' lbs', label: 'Total nectar → honey' },
                  { emoji: '🌻', val: ((d.totalFlowerVisits || 0) > 1e6 ? Math.round((d.totalFlowerVisits || 0) / 1e5) / 10 + 'M' : ((d.totalFlowerVisits || 0).toLocaleString())), label: 'Flower visits' }
                ].map(function(s, i) {
                  return h('div', { key: i, className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-amber-700/30' : 'bg-white border-amber-200') },
                    h('div', { className: 'flex items-center gap-1.5' },
                      h('span', { className: 'text-base' }, s.emoji),
                      h('span', { className: 'text-xs font-black ' + (dk ? 'text-amber-300' : 'text-amber-800'), style: { fontFamily: 'monospace' } }, s.val)),
                    h('div', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-500') }, s.label));
                })),
              // Highlight paragraph
              h('div', { className: 'rounded-lg p-3 border text-xs ' + (dk ? 'bg-slate-800 border-amber-700/30 text-slate-300' : 'bg-white border-amber-200 text-slate-700') },
                h('strong', { className: dk ? 'text-amber-300' : 'text-amber-800' },
                  grade >= 8 ? '🌟 Outstanding stewardship! ' :
                  grade >= 6 ? '✨ Strong year. ' :
                  grade >= 3 ? '🌿 Steady learning. ' : '⚠️ A hard year. '),
                grade >= 8 ? 'Your colony thrived — healthy, productive, and ecologically connected. Commercial beekeepers would envy these numbers.' :
                grade >= 6 ? 'The colony ended the year in good shape. A few tweaks (more conservation actions, tighter varroa control) and next year could be record-breaking.' :
                grade >= 3 ? 'You kept the colony alive, which is harder than it sounds — 30–50% of real colonies are lost each year. Focus next year on varroa timing and building winter honey stores.' :
                'Every beekeeper loses colonies. What matters is what you learned. Study the event log and inspector layers — the science will make you a better steward.'),
              // Continue button
              h('button', { onClick: function() {
                  updAll({ yearReviewsSeen: seen.concat([completedYears]) });
                  if (addToast) addToast('🐝 Beginning Year ' + (completedYears + 1) + '! Keep learning.', 'success');
                  if (awardStemXP) awardStemXP('beehive', 25 + grade * 5, 'Year ' + completedYears + ' complete');
                  playSfx(sfxSuccess);
                },
                className: 'w-full py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:shadow-lg ' + (dk ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500' : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600')
              }, '✓ Begin Year ' + (completedYears + 1) + ' →'));
          })(),

          // ═══ EXPORT REPORT FALLBACK MODAL (when clipboard API unavailable) ═══
          d.exportedReport && h('div', { className: 'rounded-xl border p-3 space-y-2 ' + (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'), role: 'dialog', 'aria-label': 'Exported colony report' },
            h('div', { className: 'flex items-center justify-between mb-1' },
              h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-300' : 'text-amber-800') }, '📄 Colony Report — Copy Manually'),
              h('button', { onClick: function() { upd('exportedReport', null); }, className: 'text-[11px] px-2 py-0.5 rounded ' + (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'), 'aria-label': 'Close export' }, '✕')),
            h('p', { className: 'text-[11px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, 'Select all text below (Ctrl/Cmd+A), then copy:'),
            h('textarea', { readOnly: true, value: d.exportedReport, style: { width: '100%', height: '240px', fontFamily: 'monospace', fontSize: '11px' },
              className: 'p-2 rounded border ' + (dk ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800') })),

          // ═══ KEYBOARD SHORTCUTS OVERLAY ═══
          d.showKeys && h('div', { className: 'rounded-xl border p-4 space-y-2 ' + (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'), role: 'dialog', 'aria-label': 'Keyboard shortcuts' },
            h('div', { className: 'flex items-center justify-between mb-1' },
              h('div', { className: 'text-xs font-bold ' + (dk ? 'text-slate-200' : 'text-slate-700') }, '⌨️ Keyboard Shortcuts'),
              h('button', { onClick: function() { upd('showKeys', false); }, className: 'text-[11px] px-2 py-0.5 rounded ' + (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'), 'aria-label': 'Close shortcuts' }, '✕')),
            h('div', { className: 'grid grid-cols-2 gap-1' },
              [
                ['N', 'Next Day'], ['T', 'Treat Varroa'], ['S', 'Add Super'],
                ['H', 'Harvest Honey'], ['F', 'Feed Bees'], ['I', 'Inspect Hive'],
                ['Q', 'Take Quiz'], ['B', 'View Badges'], ['M', 'Toggle Sound'],
                ['5', 'Advance +5 Days'], ['3', 'Advance +30 Days'], ['?', 'This Help']
              ].map(function(pair) {
                return h('div', { key: pair[0], className: 'flex items-center gap-2 text-[11px] py-0.5' },
                  h('kbd', { className: 'inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold text-[11px] ' + (dk ? 'bg-slate-700 text-amber-300 border border-slate-600' : 'bg-slate-100 text-amber-700 border border-slate-200') }, pair[0]),
                  h('span', { className: dk ? 'text-slate-300' : 'text-slate-600' }, pair[1]));
              }))),

          // ═══ BADGES PANEL ═══
          showBadges && h('div', { className: 'rounded-xl border p-4 space-y-3 ' + (dk ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-700/40' : 'bg-gradient-to-b from-white to-amber-50 border-amber-200'), role: 'region', 'aria-label': 'Achievement badges' },
            h('div', { className: 'flex items-center justify-between mb-1' },
              h('div', { className: 'text-sm font-bold ' + (dk ? 'text-amber-300' : 'text-amber-800') }, '🏅 Badges · ' + badgeCount + '/' + BADGE_DEFS.length),
              h('button', { onClick: function() { upd('showBadges', false); }, className: 'text-[11px] px-2 py-0.5 rounded ' + (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'), 'aria-label': 'Close badges' }, '✕')),
            // Progress bar
            h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200') },
              h('div', { style: { width: Math.round(badgeCount / BADGE_DEFS.length * 100) + '%' }, className: 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all' })),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              BADGE_DEFS.map(function(bd) {
                var earned = !!(newBadges[bd.id]);
                return h('div', { key: bd.id, className: 'flex items-start gap-2 p-2 rounded-lg border transition-all ' + (earned ? (dk ? 'bg-amber-900/30 border-amber-600/40' : 'bg-amber-50 border-amber-300') : (dk ? 'bg-slate-800/50 border-slate-700/50 opacity-50' : 'bg-slate-50 border-slate-200 opacity-50')), title: bd.desc },
                  h('span', { className: 'text-xl ' + (earned ? '' : 'grayscale') }, bd.icon),
                  h('div', null,
                    h('div', { className: 'text-[11px] font-bold ' + (earned ? (dk ? 'text-amber-300' : 'text-amber-800') : (dk ? 'text-slate-500' : 'text-slate-400')) }, bd.label),
                    h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-400' : 'text-slate-500') }, bd.desc),
                    earned && newBadges[bd.id].day !== undefined && h('div', { className: 'text-[10px] ' + (dk ? 'text-amber-500' : 'text-amber-600') }, '✓ Day ' + newBadges[bd.id].day)));
              }))),

          // ═══ QUIZ OVERLAY ═══
          quizOpen && (function() {
            var qs = d.quizQuestions || QUIZ_QUESTIONS;
            var current = qs[quizIdx];
            if (!current) return null;
            return h('div', { className: 'rounded-2xl border-2 p-5 space-y-3 ' + (dk ? 'bg-gradient-to-b from-indigo-900/40 to-purple-900/30 border-indigo-500/50' : 'bg-gradient-to-b from-indigo-50 to-purple-50 border-indigo-300'), role: 'dialog', 'aria-label': 'Bee Knowledge Quiz' },
              h('div', { className: 'flex items-center justify-between' },
                h('div', { className: 'text-sm font-bold ' + (dk ? 'text-indigo-300' : 'text-indigo-800') }, '🎓 Bee Knowledge Quiz'),
                h('div', { className: 'flex items-center gap-3' },
                  h('span', { className: 'text-xs font-bold ' + (dk ? 'text-indigo-400' : 'text-indigo-600') }, 'Q' + (quizIdx + 1) + '/' + qs.length + ' · Score: ' + quizScore),
                  h('button', { onClick: function() { upd('quizOpen', false); }, className: 'text-[11px] px-2 py-0.5 rounded ' + (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'), 'aria-label': 'Close quiz' }, '✕'))),
              // Progress bar
              h('div', { className: 'h-1.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-indigo-100') },
                h('div', { style: { width: Math.round((quizIdx + 1) / qs.length * 100) + '%' }, className: 'h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all' })),
              // Question
              h('p', { className: 'text-sm font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, current.q),
              // Options
              !quizFeedback && h('div', { className: 'grid grid-cols-2 gap-2' },
                current.opts.map(function(opt, oi) {
                  return h('button', { key: oi, onClick: function() { answerQuiz(oi); },
                    className: 'text-left p-3 rounded-xl border text-xs font-medium transition-all ' + (dk ? 'bg-slate-800 border-indigo-700/40 text-slate-200 hover:border-indigo-400 hover:bg-slate-700' : 'bg-white border-indigo-200 text-slate-700 hover:border-indigo-500 hover:shadow-md'),
                    'aria-label': 'Answer: ' + opt
                  }, String.fromCharCode(65 + oi) + '. ' + opt);
                })),
              // Feedback
              quizFeedback && h('div', { className: 'rounded-xl p-4 border ' + (quizFeedback.correct ? (dk ? 'bg-green-900/30 border-green-600/50' : 'bg-green-50 border-green-300') : (dk ? 'bg-red-900/30 border-red-600/50' : 'bg-red-50 border-red-300')) },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, quizFeedback.correct ? '✅' : '❌'),
                  h('span', { className: 'text-sm font-bold ' + (quizFeedback.correct ? (dk ? 'text-green-300' : 'text-green-800') : (dk ? 'text-red-300' : 'text-red-800')) }, quizFeedback.correct ? 'Correct!' : 'Not quite.')),
                h('p', { className: 'text-xs leading-relaxed mb-3 ' + (dk ? 'text-slate-300' : 'text-slate-600') }, quizFeedback.explanation),
                h('button', { onClick: nextQuizQuestion, className: 'px-4 py-2 rounded-lg text-xs font-bold text-white ' + (dk ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-500 hover:bg-indigo-600') },
                  quizIdx + 1 >= qs.length ? '🏁 See Results' : 'Next Question →')));
          })(),

          // ═══ IPM TREATMENT CHOICE MODAL ═══
          viewMode === 'beekeeper' && d.showTreatModal && h('div', { className: 'rounded-2xl border-2 p-4 space-y-3 ' + (dk ? 'bg-gradient-to-b from-red-900/30 to-amber-900/20 border-red-500/50' : 'bg-gradient-to-b from-red-50 to-amber-50 border-red-300'), role: 'dialog', 'aria-label': 'Choose a varroa treatment' },
            h('div', { className: 'flex items-center justify-between' },
              h('div', null,
                h('div', { className: 'text-sm font-bold ' + (dk ? 'text-red-300' : 'text-red-800') }, '🧪 Integrated Pest Management — Varroa'),
                h('div', { className: 'text-[11px] ' + (dk ? 'text-red-400' : 'text-red-600') }, 'Current mite load: ' + varroaLevel + '% · Brood: ' + fmtPop(brood) + ' · Season: ' + seasonNames[season])),
              h('button', { onClick: function() { upd('showTreatModal', false); }, 'aria-label': 'Close treatment modal', className: 'text-[11px] px-2 py-0.5 rounded ' + (dk ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100') }, '✕')),
            h('p', { className: 'text-[11px] italic ' + (dk ? 'text-amber-400' : 'text-amber-700') }, 'Every treatment has trade-offs. Real beekeepers rotate treatments seasonally to prevent mite resistance. Effectiveness depends on brood status and temperature.'),
            h('div', { className: 'grid grid-cols-1 gap-2' },
              IPM_TREATMENTS.map(function(t) {
                var isIdealSeason = t.bestSeason === season;
                var affordable = actionPoints >= t.ap;
                var usedCount = (d.treatmentsUsed || {})[t.id] || 0;
                return h('button', { key: t.id, onClick: function() { applyTreatment(t.id); },
                  disabled: !affordable,
                  'aria-label': t.label + '. ' + t.desc,
                  className: 'text-left p-3 rounded-xl border transition-all ' +
                    (affordable
                      ? (dk ? 'bg-slate-800 border-red-700/40 hover:border-red-500 hover:bg-slate-700' : 'bg-white border-red-200 hover:border-red-400 hover:shadow-md')
                      : (dk ? 'bg-slate-800/30 border-slate-700 opacity-50 cursor-not-allowed' : 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'))
                },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-2xl' }, t.emoji),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2 flex-wrap' },
                        h('span', { className: 'text-sm font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, t.label),
                        h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded ' + (dk ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700') }, '−' + t.baseReduction + '% mites'),
                        t.moraleCost > 0 && h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded ' + (dk ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700') }, '−' + t.moraleCost + ' morale'),
                        h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded ' + (dk ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700') }, t.ap + ' AP'),
                        isIdealSeason && h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded font-bold ' + (dk ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800') }, '✨ ideal season'),
                        usedCount > 0 && h('span', { className: 'text-[11px] ' + (dk ? 'text-slate-500' : 'text-slate-400') }, 'used ' + usedCount + '×')),
                      h('p', { className: 'text-[11px] mt-1 ' + (dk ? 'text-slate-300' : 'text-slate-700') }, t.desc),
                      h('p', { className: 'text-[11px] mt-1 italic leading-relaxed ' + (dk ? 'text-slate-400' : 'text-slate-500') }, '🔬 ' + t.note))));
              })),
            // Legend
            h('div', { className: 'text-[11px] p-2 rounded ' + (dk ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-50 text-slate-600') },
              h('strong', null, 'Monitoring threshold: '),
              'Treat when mite count exceeds ~2% of bees (about 15–20% on the Varroa meter here). Below that, the colony can usually manage mites via hygienic behavior.')),

          // Event popup (beekeeper mode only)
          viewMode === 'beekeeper' && activeEvent && h('div', { role: 'alert', 'aria-live': 'assertive', className: 'rounded-xl border-2 p-4 space-y-2 ' + (activeEvent.effect && activeEvent.effect.morale > 0 ? (dk ? 'bg-amber-900/30 border-amber-600/50' : 'bg-amber-50 border-amber-300') : (dk ? 'bg-red-900/30 border-red-600/50' : 'bg-red-50 border-red-300')) },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-2xl' }, activeEvent.emoji),
              h('div', null,
                h('div', { className: 'font-bold text-sm ' + (dk ? 'text-slate-100' : '') }, activeEvent.label),
                h('div', { className: 'text-xs ' + (dk ? 'text-slate-300' : 'text-slate-600') }, activeEvent.desc))),
            h('div', { className: 'rounded-lg p-3 text-xs border ' + (dk ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200') },
              h('strong', null, '🔬 Science: '), activeEvent.lesson),
            h('button', { onClick: dismissEvent, 'aria-label': 'Acknowledge event', className: 'px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-all' }, '✓ Acknowledge')),

          // Status bar (beekeeper mode only)
          viewMode === 'beekeeper' && h('div', { className: 'flex flex-wrap gap-3 items-center text-xs font-bold', role: 'status', 'aria-live': 'polite', 'aria-label': 'Colony status: ' + seasonNames[season] + ', Day ' + ((day % 30) + 1) + ', ' + honey + ' lbs honey, ' + fmtPop(workers) + ' workers' },
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-sky-900/40 text-sky-300' : 'bg-sky-100 text-sky-800') }, seasonNames[season] + ' Day ' + ((day % 30) + 1)),
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800') }, '🍯 ' + honey + ' lbs'),
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800') }, '🌼 ' + pollen + ' lbs'),
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-800') }, '⭐ ' + score + ' pts'),
            gardenBonus > 0 && h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-800') }, '🌱 Garden +' + gardenBonus + '%'),
            // Active subspecies badge
            h('span', { title: activeSubspecies.name + ' (' + activeSubspecies.sci + ') — ' + activeSubspecies.note,
              className: 'px-3 py-1 rounded-full cursor-help ' + (dk ? 'bg-amber-900/40 text-amber-300 border border-amber-700/40' : 'bg-amber-50 text-amber-800 border border-amber-200') },
              activeSubspecies.emoji + ' ' + activeSubspecies.name),
            // Active apiary site badge
            h('span', { title: activeSite.name + ' — ' + activeSite.note,
              className: 'px-3 py-1 rounded-full cursor-help ' + (dk ? 'bg-green-900/40 text-green-300 border border-green-700/40' : 'bg-green-50 text-green-800 border border-green-200') },
              activeSite.emoji + ' ' + activeSite.name),
            // Current varietal preview (what the next harvest would produce)
            honey >= 15 && (function() {
              var vp = identifyVarietal();
              return h('span', { title: vp.note + ' — Surplus ready to harvest: ' + Math.round((honey - 15) * 10) / 10 + ' lbs',
                className: 'px-3 py-1 rounded-full cursor-help ' + (dk ? 'bg-orange-900/40 text-orange-300 border border-orange-600/40' : 'bg-orange-50 text-orange-800 border border-orange-200') },
                vp.emoji + ' ' + vp.name + ' · ' + (Math.round((honey - 15) * 10) / 10) + ' lbs ready');
            })()),

          // Colony Dashboard (beekeeper mode only)
          viewMode === 'beekeeper' && h('div', { className: 'rounded-xl border p-4 ' + (dk ? 'bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-amber-700/40' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'), style: { boxShadow: dk ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)' }, role: 'region', 'aria-live': 'polite', 'aria-label': 'Colony dashboard showing population, resources, and health metrics' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'text-sm font-bold ' + (dk ? 'text-amber-300' : 'text-amber-900') }, '🐝 Colony Status'),
              h('div', { className: 'text-sm font-black ' + ratingColor }, colonyRating + ' (' + colonyHealth + ')')),
            h('div', { className: 'grid grid-cols-4 gap-2 text-center mb-3' },
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black text-amber-500', style: { fontFamily: 'monospace' } }, fmtPop(workers)), h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-200' : 'text-slate-600') }, '👷 Workers')),
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black text-pink-500', style: { fontFamily: 'monospace' } }, fmtPop(brood)), h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-200' : 'text-slate-600') }, '🥚 Brood')),
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black text-blue-400', style: { fontFamily: 'monospace' } }, drones), h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-200' : 'text-slate-600') }, '♂ Drones')),
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black ' + (queenHealth > 70 ? 'text-purple-400' : 'text-red-500'), style: { fontFamily: 'monospace' } }, queenHealth + '%'), h('div', { className: 'text-[11px] ' + (dk ? 'text-slate-200' : 'text-slate-600') }, '👑 Queen'))),
            // Meters
            h('div', { className: 'space-y-2' },
              // Varroa
              h('div', null,
                h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-red-400' : 'text-red-700') }, '🦟 Varroa Mites'),
                  h('span', { className: varroaLevel > 30 ? 'text-red-500 font-bold' : (dk ? 'text-slate-200' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, varroaLevel + '%')),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: varroaLevel + '%' }, className: 'h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all' }))),
              // Morale
              h('div', null,
                h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-amber-300' : 'text-amber-700') }, '😊 Colony Morale'),
                  h('span', { className: morale < 40 ? 'text-red-500 font-bold' : (dk ? 'text-slate-200' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, morale + '%')),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: morale + '%' }, className: 'h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all' }))),
              // Foraging
              h('div', null,
                h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-green-300' : 'text-green-700') }, '🌸 Foraging Efficiency'),
                  h('span', { className: dk ? 'text-slate-200' : 'text-slate-600', style: { fontFamily: 'monospace' } }, foragingEfficiency + '%' + (gardenBonus > 0 ? ' (+' + gardenBonus + '%)' : ''))),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: Math.min(100, foragingEfficiency + gardenBonus) + '%' }, className: 'h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all' }))),
              // Disease Risk
              h('div', null,
                h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-purple-300' : 'text-purple-700') }, '🦠 Disease Risk'),
                  h('span', { className: diseaseRisk > 45 ? 'text-red-500 font-bold' : diseaseRisk > 25 ? 'text-amber-400 font-bold' : (dk ? 'text-slate-200' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, diseaseRisk + '%' + (diseaseRisk > 45 ? ' ⚠ outbreak likely' : ''))),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: diseaseRisk + '%' }, className: 'h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all' }))))),

          // ── Colony History Sparkline Chart ── (beekeeper only)
          viewMode === 'beekeeper' && history.length > 2 && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } },
            h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-slate-300' : 'text-slate-700') }, '\uD83D\uDCCA Colony History (' + history.length + ' days)'),
            h('canvas', {
              ref: function(cv) {
                if (!cv) return;
                var cCtx = cv.getContext('2d');
                if (!cCtx) return;
                var cW = cv.parentElement ? cv.parentElement.clientWidth - 32 : 400;
                var cH = 100;
                var dpr = window.devicePixelRatio || 1;
                cv.width = cW * dpr; cv.height = cH * dpr;
                cv.style.width = cW + 'px'; cv.style.height = cH + 'px';
                cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
                cCtx.clearRect(0, 0, cW, cH);

                // Draw sparklines: workers (amber), honey (gold), varroa (red), morale (green)
                var lines = [
                  { key: 'w', color: '#f59e0b', label: 'Workers', max: 40000 },
                  { key: 'h', color: '#eab308', label: 'Honey', max: 80 },
                  { key: 'v', color: '#ef4444', label: 'Varroa', max: 100 },
                  { key: 'm', color: '#22c55e', label: 'Morale', max: 100 }
                ];
                var hLen = history.length;
                var mx = 4, my = 4, pw = cW - mx * 2, ph = cH - my * 2 - 14;

                // Season background bands
                for (var si = 0; si < hLen; si++) {
                  var sx = mx + (si / hLen) * pw;
                  var sSeason = Math.floor((history[si].d % 120) / 30);
                  var sCol = ['rgba(74,222,128,0.06)', 'rgba(250,204,21,0.06)', 'rgba(251,146,60,0.06)', 'rgba(148,163,184,0.06)'][sSeason];
                  cCtx.fillStyle = sCol; cCtx.fillRect(sx, my, pw / hLen + 1, ph);
                }

                lines.forEach(function(line) {
                  cCtx.beginPath();
                  for (var i = 0; i < hLen; i++) {
                    var px = mx + (i / (hLen - 1)) * pw;
                    var val = history[i][line.key] || 0;
                    var py = my + ph - (Math.min(val, line.max) / line.max) * ph;
                    i === 0 ? cCtx.moveTo(px, py) : cCtx.lineTo(px, py);
                  }
                  cCtx.strokeStyle = line.color;
                  cCtx.lineWidth = 1.5;
                  cCtx.stroke();
                });

                // Legend
                cCtx.font = '9px system-ui';
                lines.forEach(function(line, li) {
                  var lx = mx + li * (pw / 4);
                  cCtx.fillStyle = line.color;
                  cCtx.fillRect(lx, cH - 10, 8, 8);
                  cCtx.fillStyle = dk ? '#94a3b8' : '#64748b';
                  cCtx.fillText(line.label, lx + 11, cH - 3);
                });
              },
              style: { display: 'block', width: '100%', borderRadius: '8px' },
              'aria-label': 'Colony metrics history chart showing workers, honey, varroa, and morale over ' + history.length + ' days'
            })
          ),

          // ── Hive Cross-Section Visual ── (beekeeper only)
          viewMode === 'beekeeper' && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-gradient-to-b from-amber-900/30 to-amber-950/20 border-amber-700/40' : 'bg-gradient-to-b from-amber-100 to-amber-50 border-amber-300'),
            role: 'img', 'aria-label': 'Hive cross-section: honey stores on outer edges (' + Math.round(honey) + ' lbs), pollen ring (' + Math.round(pollen) + ' lbs), brood nest in center (' + fmtPop(brood) + ' larvae), queen health ' + queenHealth + '%. Bees organize comb concentrically for thermal efficiency.' },
            h('div', { className: 'text-xs font-bold mb-2 text-center ' + (dk ? 'text-amber-300' : 'text-amber-900'), role: 'heading', 'aria-level': '3' }, '🏠 Hive Cross-Section'),
            h('div', { className: 'flex gap-0.5 justify-center', 'aria-hidden': 'true', style: { height: '80px' } },
              // Each column represents a frame — color shows contents
              [
                { type: 'honey', label: '🍯', pct: Math.min(100, honey * 3) },
                { type: 'honey', label: '🍯', pct: Math.min(100, honey * 2.5) },
                { type: 'pollen', label: '🌼', pct: Math.min(100, pollen * 3) },
                { type: 'brood', label: '🥚', pct: Math.min(100, brood / 100) },
                { type: 'brood', label: '🥚', pct: Math.min(100, brood / 80) },
                { type: 'brood', label: '🐛', pct: Math.min(100, brood / 60) },
                { type: 'queen', label: '👑', pct: queenHealth },
                { type: 'brood', label: '🐛', pct: Math.min(100, brood / 60) },
                { type: 'brood', label: '🥚', pct: Math.min(100, brood / 80) },
                { type: 'pollen', label: '🌼', pct: Math.min(100, pollen * 2) },
                { type: 'honey', label: '🍯', pct: Math.min(100, honey * 2.5) },
                { type: 'honey', label: '🍯', pct: Math.min(100, honey * 3) }
              ].map(function(frame, i) {
                var bgColor = frame.type === 'honey' ? 'bg-amber-400' : frame.type === 'pollen' ? 'bg-yellow-400' : frame.type === 'brood' ? 'bg-orange-300' : 'bg-purple-400';
                var emptyColor = frame.type === 'honey' ? 'bg-amber-200' : frame.type === 'pollen' ? 'bg-yellow-200' : frame.type === 'brood' ? 'bg-orange-100' : 'bg-purple-200';
                return h('div', { key: i, className: 'flex flex-col justify-end flex-1 rounded-sm overflow-hidden ' + emptyColor, title: frame.label + ' ' + Math.round(frame.pct) + '% full' },
                  h('div', { style: { height: Math.round(frame.pct) + '%' }, className: bgColor + ' transition-all duration-500 flex items-end justify-center' },
                    h('span', { className: 'text-[11px]' }, frame.pct > 20 ? frame.label : '')));
              })),
            h('div', { className: 'flex justify-between mt-1 text-[11px] ' + (dk ? 'text-amber-400' : 'text-amber-700') },
              h('span', null, '← Honey stores'),
              h('span', { className: 'font-bold' }, 'Brood nest (center)'),
              h('span', null, 'Honey stores →')),
            h('p', { className: 'text-[11px] text-center mt-1 italic ' + (dk ? 'text-amber-400/70' : 'text-amber-600') }, 'Bees organize the comb concentrically: brood in the warm center, pollen ring around it, honey stores on the outer edges. This pattern is universal across all Apis mellifera colonies.')),

          // Garden connection (beekeeper only)
          viewMode === 'beekeeper' && gardenBonus > 0 && h('div', { className: 'rounded-xl border p-3 flex items-start gap-2 ' + (dk ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200') },
            h('span', { className: 'text-lg' }, '🌱'),
            h('div', { className: 'text-xs ' + (dk ? 'text-emerald-300' : 'text-emerald-700') },
              h('strong', null, 'Garden Connection Active! '),
              gardenPollinators + ' pollinator plant' + (gardenPollinators !== 1 ? 's' : '') + ' detected in your Companion Planting garden. Your bees have ' + gardenBonus + '% better foraging. Plant more flowers to strengthen the connection!')),

          // Honey Varietals Pantry (beekeeper only, only if any harvested)
          viewMode === 'beekeeper' && d.varietals && Object.keys(d.varietals).length > 0 && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-gradient-to-br from-amber-900/20 to-yellow-900/10 border-amber-700/40' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'), role: 'region', 'aria-label': 'Honey varietals pantry' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-300' : 'text-amber-800') }, '🍯 Honey Varietals Pantry · ' + Object.keys(d.varietals).length + ' type' + (Object.keys(d.varietals).length !== 1 ? 's' : '')),
              h('div', { className: 'text-[11px] ' + (dk ? 'text-amber-400' : 'text-amber-600') }, 'Total: ' + (Math.round((d.totalHarvested || 0) * 10) / 10) + ' lbs')),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              Object.keys(d.varietals).map(function(vid) {
                var v = d.varietals[vid];
                return h('div', { key: vid, className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-amber-700/30' : 'bg-white border-amber-200'), title: v.note },
                  h('div', { className: 'flex items-center gap-1.5 mb-0.5' },
                    h('span', { className: 'text-lg' }, v.emoji),
                    h('span', { className: 'text-[11px] font-bold ' + (dk ? 'text-amber-300' : 'text-amber-800') }, v.name),
                    h('span', { className: 'text-[11px] ml-auto font-mono ' + (dk ? 'text-amber-400' : 'text-amber-600') }, v.lbs + ' lbs · ' + (v.jars || 0) + ' jars')),
                  h('p', { className: 'text-[11px] leading-snug ' + (dk ? 'text-slate-400' : 'text-slate-600') }, v.note));
              })),
            h('p', { className: 'text-[11px] italic mt-2 ' + (dk ? 'text-amber-500/80' : 'text-amber-700/80') }, 'Unifloral honeys (single flower source) are rare and prized. Most supermarket honey is multifloral blend. The flavor, color, and crystallization speed all come from the botanical source.')),

          // ── Pollination Impact (beekeeper only) ──
          viewMode === 'beekeeper' && (d.totalFlowerVisits || 0) > 0 && (function() {
            var visits = d.totalFlowerVisits || 0;
            // Approx: 2 million visits = 1 lb honey; also 2 million visits ~= fruit from 1 mature apple tree
            var appleTrees = Math.round(visits / 2000000 * 10) / 10;
            var acresPollinated = Math.round(visits / 8000000 * 100) / 100; // ~8M visits/acre of mixed crop
            // USDA estimate: honeybee pollination delivers ~$15B/year; normalize per visit ≈ $0.000004
            var ecoValue = Math.round(visits * 0.0000042 * 100) / 100;
            var milesFlown = Math.round(visits * 0.004); // avg ~20 ft between flowers = ~0.004 mi/visit
            return h('div', { key: 'pollination', className: 'rounded-xl border p-3 ' + (dk ? 'bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-green-700/40' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'), role: 'region', 'aria-label': 'Pollination impact statistics' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold ' + (dk ? 'text-green-300' : 'text-green-800') }, '🌸 Pollination Impact · Ecosystem Services'),
                h('div', { className: 'text-[11px] ' + (dk ? 'text-green-400' : 'text-green-600') }, visits.toLocaleString() + ' flower visits')),
              h('div', { className: 'grid grid-cols-4 gap-2 text-center' },
                [
                  { v: appleTrees.toLocaleString() + '×', l: 'Apple trees worth of fruit', c: 'red' },
                  { v: acresPollinated + ' ac', l: 'Crop acres pollinated', c: 'amber' },
                  { v: '$' + ecoValue.toLocaleString(), l: 'Ecosystem service value', c: 'green' },
                  { v: milesFlown.toLocaleString() + ' mi', l: 'Miles flown foraging', c: 'sky' }
                ].map(function(m, mi) {
                  return h('div', { key: mi, className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-' + m.c + '-700/30' : 'bg-white border-' + m.c + '-200') },
                    h('div', { className: 'text-sm font-black ' + (dk ? 'text-' + m.c + '-300' : 'text-' + m.c + '-700') }, m.v),
                    h('div', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, m.l));
                })),
              h('p', { className: 'text-[11px] italic mt-2 ' + (dk ? 'text-green-400/80' : 'text-green-700/80') }, 'Every 3rd bite of food you eat depends on pollinators. Honeybees alone contribute ~$15 billion/year to U.S. agriculture — and that\'s before counting the 4,000+ native bee species that pollinate wild plants.'));
          })(),

          // ── Beekeeper's Journal (beekeeper only) ──
          viewMode === 'beekeeper' && (d.journal || []).length > 0 && (function() {
            var journalEntries = (d.journal || []).slice().reverse(); // most recent first
            var expanded = d.journalExpanded;
            var visible = expanded ? journalEntries : journalEntries.slice(0, 3);
            var seasonNamesShort = ['🌱', '☀️', '🍂', '❄️'];
            return h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-amber-50 border-amber-200'), role: 'region', 'aria-label': 'Beekeeper journal entries' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-xs font-bold ' + (dk ? 'text-amber-300' : 'text-amber-800') }, '📔 Beekeeper\'s Journal · ' + journalEntries.length + ' entries'),
                h('button', { onClick: function() { upd('journalExpanded', !expanded); },
                  'aria-label': expanded ? 'Collapse journal' : 'Expand journal',
                  className: 'text-[11px] px-2 py-0.5 rounded ' + (dk ? 'text-amber-400 hover:bg-slate-700' : 'text-amber-700 hover:bg-amber-100') },
                  expanded ? 'Show recent' : 'Show all')),
              h('div', { className: 'space-y-1.5' },
                visible.map(function(e, ei) {
                  return h('div', { key: 'j' + e.day + '-' + ei, className: 'flex gap-2 items-start text-[11px] p-2 rounded-lg border ' + (dk ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-amber-100') },
                    h('div', { className: 'flex-shrink-0 text-center', style: { minWidth: '48px' } },
                      h('div', { className: 'font-bold ' + (dk ? 'text-amber-400' : 'text-amber-700') }, 'Day ' + e.day),
                      h('div', { className: 'text-sm' }, seasonNamesShort[e.season] || '')),
                    h('div', { className: 'flex-1 leading-relaxed ' + (dk ? 'text-slate-300' : 'text-slate-700') }, e.text || '—'));
                })),
              !expanded && journalEntries.length > 3 && h('div', { className: 'text-[11px] mt-1 text-center ' + (dk ? 'text-slate-500' : 'text-slate-400') }, '(' + (journalEntries.length - 3) + ' more entries hidden)'),
              h('p', { className: 'text-[11px] italic mt-2 ' + (dk ? 'text-slate-500' : 'text-slate-500') }, 'Real beekeepers keep hive journals for every inspection. Patterns across weeks reveal colony trajectory that a single reading misses.'));
          })(),

          // Colony collapsed state (beekeeper only)
          viewMode === 'beekeeper' && !colonySurvived && h('div', { className: 'rounded-xl border-2 p-5 space-y-3 ' + (dk ? 'bg-gradient-to-b from-red-900/30 to-orange-900/20 border-red-700/50' : 'bg-gradient-to-b from-red-50 to-orange-50 border-red-300'), role: 'alert' },
            h('div', { className: 'text-center' },
              h('div', { className: 'text-4xl mb-1' }, '\uD83D\uDC1D\uD83D\uDE22'),
              h('h3', { className: 'text-lg font-black ' + (dk ? 'text-red-300' : 'text-red-800') }, 'Colony Collapse'),
              h('p', { className: 'text-sm ' + (dk ? 'text-red-400' : 'text-red-600') }, 'Your colony has fallen below 500 workers and can no longer sustain itself.')
            ),
            // Stats summary
            h('div', { className: 'grid grid-cols-4 gap-2 text-center' },
              [
                ['\uD83D\uDCC5', 'Survived', day + ' days'],
                ['\uD83C\uDF6F', 'Total Honey', totalHoney + ' lbs'],
                ['\u2B50', 'Score', score + ' pts'],
                ['\uD83C\uDF3F', 'Habitat', habitat + '%']
              ].map(function(s) {
                return h('div', { key: s[1], className: 'rounded-lg p-2 border ' + (dk ? 'bg-slate-800 border-red-700/30' : 'bg-white border-red-200') },
                  h('div', { className: 'text-sm' }, s[0]),
                  h('p', { className: 'text-xs font-bold ' + (dk ? 'text-slate-200' : 'text-slate-700') }, s[2]),
                  h('p', { className: 'text-[11px] ' + (dk ? 'text-slate-200' : 'text-slate-600') }, s[1])
                );
              })
            ),
            // Diagnosis
            h('div', { className: 'rounded-lg p-3 text-xs border ' + (dk ? 'bg-slate-800 text-slate-300 border-red-700/30' : 'bg-white text-slate-700 border-red-200') },
              h('p', { className: 'font-bold mb-1 ' + (dk ? 'text-red-300' : 'text-red-700') }, '\uD83D\uDD2C Diagnosis: What went wrong?'),
              h('p', null,
                varroaLevel > 40 ? 'High varroa mite levels (' + varroaLevel + '%) weakened the colony through virus transmission (Deformed Wing Virus, ABPV). Earlier mite treatment with oxalic acid or formic acid might have saved them.' :
                pesticideExposure > 25 ? 'Cumulative pesticide exposure (' + pesticideExposure + '%) poisoned foragers and impaired colony immunity. Neonicotinoids cause sub-lethal effects \u2014 disorientation, memory loss, and weakened immune response.' :
                honey < 5 ? 'Starvation \u2014 the colony ran out of honey stores (' + honey + ' lbs remaining). In nature, a colony needs 60+ lbs of honey to survive winter. Supplemental feeding during dearth periods is critical.' :
                'Multiple stressors combined \u2014 varroa (' + varroaLevel + '%), nutrition (' + honey + ' lbs), and habitat (' + habitat + '%) created a "death spiral" where each problem amplified the others. This is the reality of Colony Collapse Disorder.')
              )
            ),
            // What to try differently
            h('div', { className: 'rounded-lg p-3 text-xs border ' + (dk ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200') },
              h('p', { className: 'font-bold mb-1 ' + (dk ? 'text-amber-300' : 'text-amber-800') }, '\uD83D\uDCA1 Next time, try:'),
              h('ul', { className: 'space-y-0.5 pl-4 list-disc ' + (dk ? 'text-slate-200' : 'text-slate-600') },
                varroaLevel > 30 && h('li', null, 'Treat varroa mites as soon as levels exceed 15\u201320%'),
                honey < 10 && h('li', null, 'Feed sugar syrup before honey drops below 15 lbs'),
                habitat < 40 && h('li', null, 'Plant wildflowers and build bee hotels to improve habitat'),
                h('li', null, 'Monitor colony health every few days, not just when problems appear'),
                h('li', null, 'Plant a companion garden (connects to the Companion Planting tool!)')
              )
            ),
            // Restart button
            h('div', { className: 'text-center' },
              h('button', {
                'aria-label': 'Start a new colony from scratch',
                onClick: function() { updAll({ day: 0, workers: 10000, brood: 3000, drones: 500, queenHealth: 100, honey: 20, pollen: 15, wax: 5, varroaLevel: 5, morale: 80, foragingEfficiency: 70, score: 0, colonySurvived: true, pesticideExposure: 0, habitat: 50, actionPoints: 3, totalHoney: 0, eventsHandled: 0, eventLog: [], history: [], activeEvent: null, totalFlowerVisits: 0, yearReviewsSeen: [], journal: [], diseaseRisk: 0 }); if (addToast) addToast('\uD83D\uDC1D New colony established! Apply what you learned.', 'success'); },
                className: 'px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 shadow-md transition-all hover:scale-[1.02]'
              }, '\uD83D\uDD04 Start New Colony \u2014 Apply What You Learned')
            )
          ),

          // Seasonal goals (beekeeper only)
          viewMode === 'beekeeper' && colonySurvived && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-indigo-900/20 border-indigo-700/40' : 'bg-indigo-50 border-indigo-200') },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h('span', null, SEASON_GOALS[season].emoji),
              h('span', { className: 'text-xs font-bold ' + (dk ? 'text-indigo-300' : 'text-indigo-800') }, SEASON_GOALS[season].season + ' Goals'),
              h('span', { className: 'text-[11px] ml-auto ' + (dk ? 'text-indigo-400' : 'text-indigo-500') }, '🎯 ' + actionPoints + '/3 actions left today')),
            h('div', { className: 'flex flex-wrap gap-1' },
              SEASON_GOALS[season].goals.map(function(g, i) { return h('span', { key: i, className: 'text-[11px] px-2 py-0.5 rounded border ' + (dk ? 'bg-slate-800 border-indigo-700/30 text-indigo-300' : 'bg-white border-indigo-100 text-indigo-700') }, g); }))),

          // Habitat & Pesticide meters (beekeeper only)
          viewMode === 'beekeeper' && colonySurvived && h('div', { className: 'grid grid-cols-2 gap-2' },
            h('div', { className: 'rounded-lg border p-2 ' + (dk ? 'bg-green-900/20 border-green-700/40' : 'bg-green-50 border-green-200') },
              h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                h('span', { className: 'font-bold ' + (dk ? 'text-green-300' : 'text-green-700') }, '🌳 Local Habitat'),
                h('span', { className: habitat > 60 ? 'text-green-500' : habitat > 30 ? 'text-yellow-500' : 'text-red-500', style: { fontFamily: 'monospace' } }, habitat + '%')),
              h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-green-100'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                h('div', { style: { width: habitat + '%' }, className: 'h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all' }))),
            h('div', { className: 'rounded-lg border p-2 ' + (dk ? 'bg-red-900/20 border-red-700/40' : 'bg-red-50 border-red-200') },
              h('div', { className: 'flex justify-between text-[11px] mb-0.5' },
                h('span', { className: 'font-bold ' + (dk ? 'text-red-300' : 'text-red-700') }, '☠️ Pesticide Exposure'),
                h('span', { className: pesticideExposure > 20 ? 'text-red-500 font-bold' : (dk ? 'text-slate-200' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, pesticideExposure + '%')),
              h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-red-100'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                h('div', { style: { width: pesticideExposure + '%' }, className: 'h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all' })))),

          // Action buttons — grouped by purpose (beekeeper only)
          viewMode === 'beekeeper' && colonySurvived && h('div', { className: 'space-y-2' },
            // Primary actions row
            h('div', { className: 'flex gap-2 items-center' },
              h('button', { onClick: advanceDay, 'aria-label': 'Advance one day', className: 'flex-1 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ' + (dk ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600'), style: { boxShadow: '0 2px 8px rgba(217,119,6,0.25)' } }, '\u23E9 Next Day'),
              h('button', { onClick: function() { advanceDays(5); }, 'aria-label': 'Advance 5 days', className: 'px-3 py-2.5 rounded-xl text-sm font-bold transition-all ' + (dk ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/50' : 'bg-amber-100 text-amber-700 hover:bg-amber-200') }, '\u23ED +5'),
              h('button', { onClick: function() { advanceDays(30); }, 'aria-label': 'Advance 30 days (1 month)', className: 'px-3 py-2.5 rounded-xl text-sm font-bold transition-all ' + (dk ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-800/40' : 'bg-amber-50 text-amber-600 hover:bg-amber-100') }, '\u23ED +30')
            ),
            // Management actions
            h('div', { className: 'grid grid-cols-6 gap-1.5' },
              [
                { onClick: treatVarroa, icon: '\uD83E\uDDEA', label: 'Treat', tip: 'Choose an IPM treatment — each has seasonal trade-offs', disabled: varroaLevel < 10, color: 'red' },
                { onClick: function() {
                    if (actionPoints < 1) { if (addToast) addToast('Need 1 action point for hive hygiene.', 'info'); return; }
                    var reduceDisease = 18;
                    updAll({ diseaseRisk: Math.max(0, diseaseRisk - reduceDisease), morale: Math.min(100, morale + 2), actionPoints: actionPoints - 1, hygieneActions: (d.hygieneActions || 0) + 1 });
                    playSfx(sfxSuccess);
                    if (addToast) addToast('🧽 Hive hygiene: frames cleaned, dead bees removed. Disease risk −' + reduceDisease + '%.', 'success');
                    if (awardStemXP) awardStemXP('beehive', 5, 'Hive hygiene');
                  }, icon: '\uD83E\uDDFD', label: 'Hygiene', tip: 'Clean comb, remove dead bees, improve ventilation (−disease risk)', disabled: diseaseRisk < 5, color: 'purple' },
                { onClick: addSuper, icon: '\uD83D\uDCE6', label: 'Super', tip: 'Add honey super (+10 morale, +2 wax)', disabled: false, color: 'blue' },
                { onClick: harvestHoney, icon: '\uD83C\uDF6F', label: 'Harvest', tip: 'Harvest surplus honey (need 15+ lbs)', disabled: honey < 15, color: 'amber' },
                { onClick: feedBees, icon: '\uD83E\uDED9', label: 'Feed', tip: 'Feed sugar syrup (+5 lbs honey, +5 morale)', disabled: false, color: 'slate' },
                { onClick: function() { upd('showInspect', true); }, icon: '\uD83D\uDD2C', label: 'Inspect', tip: 'Open hive inspector — explore bee biology', disabled: false, color: 'indigo' }
              ].map(function(btn) {
                var enabled = !btn.disabled;
                var bg = enabled
                  ? (dk ? 'bg-' + btn.color + '-900/30 text-' + btn.color + '-300 border-' + btn.color + '-700/40 hover:bg-' + btn.color + '-800/40' : 'bg-' + btn.color + '-50 text-' + btn.color + '-700 hover:bg-' + btn.color + '-100 border border-' + btn.color + '-200')
                  : (dk ? 'bg-slate-800 text-slate-600 border-slate-700' : 'bg-slate-50 text-slate-300 border border-slate-100');
                return h('button', { key: btn.label, onClick: btn.onClick, disabled: btn.disabled, title: btn.tip,
                  'aria-label': btn.label + ': ' + btn.tip,
                  className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all border ' + bg + (enabled ? ' hover:shadow-md hover:-translate-y-0.5' : ' cursor-not-allowed'),
                  style: enabled ? { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } : {}
                },
                  h('span', { className: 'text-xl' }, btn.icon),
                  h('span', { className: 'text-[11px] font-bold' }, btn.label));
              })),

            // Conservation Actions
            h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200') },
              h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-emerald-300' : 'text-emerald-800'), role: 'heading', 'aria-level': '3' }, '🌍 Conservation Actions (help save bees!)'),
              h('div', { className: 'grid grid-cols-3 gap-1.5', role: 'group', 'aria-label': 'Conservation actions — ' + actionPoints + ' action points available' },
                CONSERVATION_ACTIONS.map(function(action) {
                  return h('button', { key: action.id, 'aria-label': action.label + ': ' + action.desc + '. Cost: ' + action.cost + ' action points.' + (actionPoints < action.cost ? ' Not enough action points.' : ''),
                    onClick: function() {
                      if (actionPoints < action.cost) { if (addToast) addToast('Need ' + action.cost + ' action points (have ' + actionPoints + '). Advance to next day for more.', 'info'); return; }
                      var patch = { actionPoints: actionPoints - action.cost, conservationsDone: (d.conservationsDone || 0) + 1 };
                      if (action.effect.habitat) patch.habitat = Math.min(100, habitat + action.effect.habitat);
                      if (action.effect.foragingEfficiency) patch.foragingEfficiency = Math.min(100, foragingEfficiency + action.effect.foragingEfficiency);
                      if (action.effect.morale) patch.morale = Math.min(100, morale + action.effect.morale);
                      if (action.effect.pesticideExposure) patch.pesticideExposure = Math.max(0, pesticideExposure + action.effect.pesticideExposure);
                      if (action.effect.score) patch.score = score + action.effect.score;
                      updAll(patch);
                      if (addToast) addToast(action.emoji + ' ' + action.label + ': ' + action.lesson, 'success');
                      if (awardStemXP) awardStemXP('beehive', 8, 'Conservation action');
                    },
                    title: action.desc + ' (Cost: ' + action.cost + ' AP)',
                    className: 'text-left p-2 rounded-lg border transition-all ' + (dk ? 'bg-slate-800 border-emerald-700/30 hover:border-emerald-500/50 hover:bg-slate-700' : 'bg-white border-emerald-100 hover:border-emerald-400 hover:shadow-sm') + (actionPoints < action.cost ? ' opacity-40' : '')
                  },
                    h('div', { className: 'flex items-center gap-1' },
                      h('span', null, action.emoji),
                      h('span', { className: 'text-[11px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-800') }, action.label)),
                    h('div', { className: 'text-[11px] mt-0.5 ' + (dk ? 'text-slate-200' : 'text-slate-600') }, action.cost + ' AP · ' + action.desc));
                }))),

          // Hive Inspection (full view replacement, beekeeper only)
          viewMode === 'beekeeper' && showInspect && renderInspection(),

          // Science cards (beekeeper only, when not inspecting)
          viewMode === 'beekeeper' && !showInspect &&
          h('div', { className: 'grid grid-cols-2 gap-3', role: 'region', 'aria-label': 'Bee science quick reference cards' },
            [
              { title: '💃 The Waggle Dance', text: 'When a forager finds nectar, she performs a figure-8 dance on the comb. The angle of the waggle run (relative to vertical) encodes the direction relative to the sun. The duration encodes distance. Karl von Frisch won the 1973 Nobel Prize for decoding this — the only known symbolic language in non-human animals.' },
              { title: '🧠 The Superorganism', text: 'A honeybee colony is a superorganism — 50,000 individuals functioning as a single living entity. The queen is the reproductive system. Workers are the immune system, digestive system, and nervous system. Drones are the reproductive cells. Temperature is regulated at exactly 35°C (95°F) through fanning and clustering — like a warm-blooded animal made of thousands of cold-blooded insects.' },
              { title: '🍯 From Nectar to Honey', text: 'Nectar is 80% water. Bees convert it to honey (18% water) through enzymatic processing (invertase breaks sucrose into glucose + fructose) and evaporative concentration (bees fan their wings to dehydrate the nectar). Once the moisture content drops below 18.6%, they cap the cell with beeswax. Honey never spoils — edible honey has been found in 3,000-year-old Egyptian tombs.' },
              { title: '⚠️ Colony Collapse Disorder', text: 'Since 2006, beekeepers have reported losing 30-50% of colonies annually. CCD involves workers abandoning the hive, leaving the queen and brood behind. Causes include: varroa mites + viruses they transmit, neonicotinoid pesticides, habitat loss reducing forage diversity, and nutritional stress from monoculture agriculture. Your garden\'s pollinator plants directly combat the habitat loss component.' }
            ].map(function(sc) {
              return h('div', { key: sc.title, className: 'rounded-xl border p-3 transition-all hover:shadow-md ' + (dk ? 'bg-slate-800 border-slate-700 hover:border-amber-600/40' : 'bg-white border-slate-200 hover:border-amber-300'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' } },
                h('h4', { className: 'text-xs font-bold mb-1 ' + (dk ? 'text-slate-200' : 'text-slate-800') }, sc.title),
                h('p', { className: 'text-[11px] leading-relaxed ' + (dk ? 'text-slate-200' : 'text-slate-600') }, sc.text));
            }))
        );
      })();
    }
  });

})();

} // end dedup guard
