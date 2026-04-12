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

        // ── Colony State ──
        var day = d.day || 0;
        var season = Math.floor((day % 120) / 30); // 0=spring, 1=summer, 2=autumn, 3=winter
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
          { id: 'robbing', emoji: '⚔️', label: 'Robbing Attempt', desc: 'A weaker nearby colony is trying to steal your honey stores! Guard bees are fighting at the entrance.', effect: { honey: -5, workers: -500, morale: -5 }, lesson: 'Robbing behavior occurs when nectar is scarce (dearth). Bees from other colonies probe for weak hive defenses. Guard bees identify intruders by colony-specific pheromone signatures. Reducing the entrance size during dearth periods helps guards defend more effectively.' }
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

        // Colony collapse check
        if (workers < 500 && day > 30 && colonySurvived) {
          colonySurvived = false;
          updAll({ colonySurvived: false });
        }

        // ── Advance Day ──
        function advanceDay() {
          if (!colonySurvived) return;
          if (actionPoints <= 0) { if (addToast) addToast('No action points left today. Advance to next day first.', 'info'); return; }
          sfxDayChime();
          var sf = [
            { broodRate: 1.2, forageMult: 0.8, consumeRate: 0.8 },  // spring — building up
            { broodRate: 1.5, forageMult: 1.3, consumeRate: 1.2 },  // summer — peak
            { broodRate: 0.5, forageMult: 0.6, consumeRate: 0.9 },  // autumn — winding down
            { broodRate: 0.0, forageMult: 0.0, consumeRate: 0.6 }   // winter — cluster
          ][season];

          // Foraging (workers collect nectar/pollen)
          var foragers = Math.round(workers * 0.4); // 40% of workers forage
          var efficiency = (foragingEfficiency + gardenBonus) / 100;
          var nectarCollected = foragers * 0.0002 * sf.forageMult * efficiency; // lbs
          var pollenCollected = foragers * 0.00008 * sf.forageMult * efficiency;

          // Consumption
          var honeyConsumed = workers * 0.00015 * sf.consumeRate;
          var pollenConsumed = (brood * 0.0001 + workers * 0.00003) * sf.consumeRate;

          // Brood development
          var newBrood = Math.round(queenHealth / 100 * 1500 * sf.broodRate);
          var emergingWorkers = Math.round(brood * 0.05); // 5% of brood emerges per day
          var dyingWorkers = Math.round(workers * 0.005 * (1 + varroaLevel / 50)); // natural + varroa mortality
          var dyingDrones = season === 2 ? Math.round(drones * 0.1) : Math.round(drones * 0.02); // autumn drone eviction

          // Varroa growth
          var varroaGrowth = brood > 0 ? 0.3 * (1 + brood / 10000) : -0.5;
          var newVarroa = Math.max(0, Math.min(100, varroaLevel + varroaGrowth));

          // Pesticide damage (cumulative — the real danger)
          if (pesticideExposure > 20) {
            dyingWorkers += Math.round(workers * pesticideExposure / 1000); // chronic die-off
            newVarroa = Math.min(100, newVarroa + 0.2); // weakened immune = more mites
          }
          // Habitat affects foraging quality
          if (habitat > 70) { nectarCollected *= 1.2; pollenCollected *= 1.2; }
          else if (habitat < 30) { nectarCollected *= 0.6; pollenCollected *= 0.6; }

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
          var newDrones = Math.max(0, drones + (season < 2 ? Math.round(newBrood * 0.05) : 0) - dyingDrones);
          var newHoney = Math.max(0, honey + nectarCollected - honeyConsumed);
          var newPollen = Math.max(0, pollen + pollenCollected - pollenConsumed);
          var newWax = wax;
          var newForagingEff = foragingEfficiency;
          var newQueenHealth = queenHealth;

          // Random events
          var newEvent = activeEvent;
          if (!activeEvent && day > 3 && Math.random() < 0.12) {
            var ev = HIVE_EVENTS[Math.floor(Math.random() * HIVE_EVENTS.length)];
            newEvent = ev;
            sfxAlert();
            // Apply effects
            if (ev.effect) {
              if (ev.effect.varroaLevel) newVarroa = Math.max(0, Math.min(100, newVarroa + ev.effect.varroaLevel));
              if (ev.effect.workers) newWorkers = Math.max(0, newWorkers + ev.effect.workers);
              if (ev.effect.brood) newBroodCount = Math.max(0, newBroodCount + ev.effect.brood);
              if (ev.effect.honey) newHoney = Math.max(0, newHoney + ev.effect.honey);
              if (ev.effect.pollen) newPollen = Math.max(0, newPollen + ev.effect.pollen);
              if (ev.effect.wax) newWax = Math.max(0, wax + (ev.effect.wax || 0));
              if (ev.effect.morale) newMorale = Math.max(0, Math.min(100, newMorale + ev.effect.morale));
              if (ev.effect.foragingEfficiency) newForagingEff = Math.max(0, Math.min(100, newForagingEff + ev.effect.foragingEfficiency));
              if (ev.effect.queenHealth) newQueenHealth = Math.max(0, Math.min(100, newQueenHealth + ev.effect.queenHealth));
            }
          }

          // Pesticide natural decay (slow)
          var newPesticide = Math.max(0, pesticideExposure - 0.3);

          // Record history (keep last 120 days for sparkline)
          var newHistory = history.concat([{ d: day + 1, w: Math.round(newWorkers), h: Math.round(newHoney * 10) / 10, v: Math.round(newVarroa), m: Math.round(newMorale) }]);
          if (newHistory.length > 120) newHistory = newHistory.slice(-120);

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
            history: newHistory
          });
        }

        // ── Advance Multiple Days (pure-functional, reads from prev state) ──
        function advanceDays(n) {
          if (!colonySurvived) return;
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
              var foragers = Math.round(bWorkers * 0.4);
              var nectarIn = foragers * 0.0002 * sf.forageMult * eff;
              var pollenIn = foragers * 0.00008 * sf.forageMult * eff;
              var honeyOut = bWorkers * 0.00015 * sf.consumeRate;
              var pollenOut = (bBrood * 0.0001 + bWorkers * 0.00003) * sf.consumeRate;
              var newBrood = Math.round(bQH / 100 * 1500 * sf.broodRate);
              var emerging = Math.round(bBrood * 0.05);
              var dying = Math.round(bWorkers * 0.005 * (1 + bVarroa / 50));
              var dyingD = bSeason === 2 ? Math.round(bDrones * 0.1) : Math.round(bDrones * 0.02);
              var vGrow = bBrood > 0 ? 0.3 * (1 + bBrood / 10000) : -0.5;
              var nv = Math.max(0, Math.min(100, bVarroa + vGrow));
              if (bPestExp > 20) { dying += Math.round(bWorkers * bPestExp / 1000); nv = Math.min(100, nv + 0.2); }
              if (bHabitat > 70) { nectarIn *= 1.2; pollenIn *= 1.2; }
              else if (bHabitat < 30) { nectarIn *= 0.6; pollenIn *= 0.6; }
              var md = 0;
              if (bHoney > 30) md += 2; if (bHoney < 10) md -= 5;
              if (bVarroa > 30) md -= 3; if (bQH > 80) md += 1;
              if (gardenBonus > 15) md += 2; if (bHabitat > 60) md += 1;
              if (bPestExp > 30) md -= 4;

              // Random event (simplified for batch — no toast/XP side effects)
              if (!b.activeEvent && bDay > 3 && Math.random() < 0.12) {
                var ev = HIVE_EVENTS[Math.floor(Math.random() * HIVE_EVENTS.length)];
                b.activeEvent = ev;
                if (ev.effect) {
                  if (ev.effect.varroaLevel) nv = Math.max(0, Math.min(100, nv + ev.effect.varroaLevel));
                  if (ev.effect.workers) bWorkers += ev.effect.workers;
                  if (ev.effect.brood) bBrood += ev.effect.brood;
                  if (ev.effect.honey) bHoney += ev.effect.honey;
                  if (ev.effect.pollen) bPollen += ev.effect.pollen;
                  if (ev.effect.wax) bWax += ev.effect.wax;
                  if (ev.effect.morale) md += ev.effect.morale;
                  if (ev.effect.foragingEfficiency) bFE = Math.max(0, Math.min(100, bFE + ev.effect.foragingEfficiency));
                  if (ev.effect.queenHealth) bQH = Math.max(0, Math.min(100, bQH + ev.effect.queenHealth));
                }
              }

              b.day = bDay + 1;
              b.workers = Math.max(0, Math.round(bWorkers + emerging - dying));
              b.brood = Math.max(0, Math.round(bBrood + newBrood - emerging));
              b.drones = Math.max(0, Math.round(bDrones + (bSeason < 2 ? Math.round(newBrood * 0.05) : 0) - dyingD));
              b.honey = Math.round(Math.max(0, bHoney + nectarIn - honeyOut) * 10) / 10;
              b.pollen = Math.round(Math.max(0, bPollen + pollenIn - pollenOut) * 10) / 10;
              b.wax = Math.round(bWax * 10) / 10;
              b.varroaLevel = Math.round(nv);
              b.morale = Math.round(Math.max(0, Math.min(100, bMorale + md)));
              b.foragingEfficiency = Math.round(bFE);
              b.queenHealth = Math.round(bQH);
              b.score = (b.score || 0) + Math.round(nectarIn * 10);
              b.actionPoints = 3;
              b.pesticideExposure = Math.max(0, Math.round(bPestExp - 0.3));
              b.totalHoney = (b.totalHoney || 0) + Math.max(0, nectarIn);
            }
            return Object.assign({}, prev, { beehive: b });
          });
        }

        // ── Actions ──
        function treatVarroa() {
          updAll({ varroaLevel: Math.max(0, varroaLevel - 25), morale: Math.max(0, morale - 5) });
          sfxTreat(); if (addToast) addToast('🧪 Varroa treatment applied (oxalic acid). Mite count reduced.', 'success');
          if (awardStemXP) awardStemXP('beehive', 5, 'Treated varroa');
        }
        function addSuper() {
          updAll({ morale: Math.min(100, morale + 10), wax: wax + 2 });
          sfxBeeBuzz(); if (addToast) addToast('📦 Added a honey super — more space for the colony!', 'success');
          if (awardStemXP) awardStemXP('beehive', 5, 'Added super');
        }
        function harvestHoney() {
          if (honey < 15) { sfxBeeWaggle(); if (addToast) addToast('⚠️ Not enough surplus honey to harvest safely. Leave 15+ lbs for the bees.', 'info'); return; }
          var harvested = Math.round((honey - 15) * 10) / 10;
          updAll({ honey: 15, score: score + Math.round(harvested * 20) });
          sfxBeeCollect(); if (addToast) addToast('🍯 Harvested ' + harvested + ' lbs of honey! (+' + Math.round(harvested * 20) + ' pts)', 'success');
          if (awardStemXP) awardStemXP('beehive', 15, 'Harvested honey');
        }
        function feedBees() {
          updAll({ honey: honey + 5, morale: Math.min(100, morale + 5) });
          sfxSuccess(); if (addToast) addToast('🫙 Fed sugar syrup — emergency reserves replenished.', 'success');
          if (awardStemXP) awardStemXP('beehive', 3, 'Fed bees');
        }
        function dismissEvent() {
          updAll({ activeEvent: null, eventsHandled: (d.eventsHandled || 0) + 1 });
          if (awardStemXP) awardStemXP('beehive', 5, 'Handled event');
        }

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
            { id: 'pheromones', emoji: '💨', label: 'Pheromone Language' }
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
                  h('div', { className: 'text-[10px] text-amber-300' }, 'Inside the superorganism'))),
              h('button', { onClick: function() { upd('showInspect', false); }, 'aria-label': 'Return to colony view', className: 'px-3 py-1.5 bg-amber-800 hover:bg-amber-700 rounded-lg text-xs font-bold' }, '← Colony View')),
            // Layer tabs — proper ARIA tablist with keyboard navigation
            h('div', { className: 'flex gap-1 flex-wrap', role: 'tablist', 'aria-label': 'Hive inspection layers' },
              layers.map(function(l, li) {
                var active = inspectLayer === l.id;
                return h('button', { key: l.id, role: 'tab', 'aria-selected': active ? 'true' : 'false', tabIndex: active ? 0 : -1,
                  'aria-label': l.label + ' inspection layer',
                  onClick: function() { upd('inspectLayer', l.id); },
                  onKeyDown: function(ev) {
                    var nextIdx = li;
                    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); nextIdx = (li + 1) % layers.length; }
                    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); nextIdx = (li - 1 + layers.length) % layers.length; }
                    else return;
                    upd('inspectLayer', layers[nextIdx].id);
                  },
                  className: 'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ' + (active ? 'bg-amber-700 text-white' : 'bg-amber-800/50 text-amber-300 hover:bg-amber-700/50')
                }, h('span', { 'aria-hidden': 'true' }, l.emoji), l.label);
              })),

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
                        h('span', { className: 'text-[10px] text-amber-400' }, r.age),
                        h('span', { className: 'text-[10px] text-amber-500 ml-auto' }, fmtPop(r.count) + ' (' + r.pct + '%)')))),
                  h('div', { className: 'h-1.5 bg-amber-900 rounded-full overflow-hidden mb-1' },
                    h('div', { style: { width: r.pct + '%' }, className: 'h-full ' + r.color + ' rounded-full' })),
                  h('p', { className: 'text-[10px] text-amber-100/70 leading-relaxed' }, r.desc));
              })),

            // ── HONEY CHEMISTRY VIEW ──
            inspectLayer === 'honey_chem' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🧪 Nectar → Honey: The Chemistry'),
                h('div', { className: 'space-y-2 text-[10px] text-amber-100/80' },
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
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-amber-400' }, honey), h('div', { className: 'text-[10px] text-amber-300' }, 'lbs honey')),
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-yellow-400' }, pollen), h('div', { className: 'text-[10px] text-amber-300' }, 'lbs pollen')),
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-orange-400' }, Math.round(workers * 0.4 * 0.0002 * [0.8,1.3,0.6,0][season] * 100) / 100), h('div', { className: 'text-[10px] text-amber-300' }, 'lbs/day in'))))),

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
                  h('div', { className: 'flex gap-2 mb-1 text-[10px]' },
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🥚 ' + c.egg),
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🐛 ' + c.larva),
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🫘 ' + c.pupa),
                    h('span', { className: 'bg-amber-700/50 px-2 py-0.5 rounded text-amber-200 font-bold' }, '= ' + c.total)),
                  h('div', { className: 'text-[10px] text-amber-300 mb-1' }, '🕐 Lifespan: ' + c.lifespan + ' · 🍽️ Diet: ' + c.diet),
                  h('p', { className: 'text-[10px] text-amber-100/70 leading-relaxed' }, c.note));
              })),

            // ── WAGGLE DANCE VIEW ──
            inspectLayer === 'waggle' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30 text-center' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '💃 Decoding the Waggle Dance'),
                h('div', { className: 'text-6xl mb-2' }, '∞'),
                h('p', { className: 'text-[10px] text-amber-100/80 mb-2' }, 'The forager dances a figure-8 pattern on the vertical comb face. The central "waggle run" encodes two pieces of information:'),
                h('div', { className: 'grid grid-cols-2 gap-3 my-3' },
                  h('div', { className: 'bg-amber-800/30 rounded-lg p-3' },
                    h('div', { className: 'text-xl mb-1' }, '🧭'),
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Direction'),
                    h('p', { className: 'text-[10px] text-amber-100/70' }, 'The angle of the waggle run relative to vertical = the angle of the food source relative to the sun. Straight up = toward the sun. 60° right = 60° right of the sun. The bee uses the sun as a compass and gravity as a reference.')),
                  h('div', { className: 'bg-amber-800/30 rounded-lg p-3' },
                    h('div', { className: 'text-xl mb-1' }, '📏'),
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Distance'),
                    h('p', { className: 'text-[10px] text-amber-100/70' }, 'The duration of the waggle run encodes distance. ~1 second of waggling ≈ 1 kilometer. A 2-second waggle run means the nectar is about 2km away. Closer sources use a simpler "round dance" (no direction info needed).'))),
                h('p', { className: 'text-[10px] text-amber-400 italic' }, 'Karl von Frisch decoded this in the 1940s-60s. He shared the 1973 Nobel Prize in Physiology or Medicine. It remains the only known example of symbolic referential communication in invertebrates.'))),

            // ── THERMOREGULATION VIEW ──
            inspectLayer === 'temperature' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🌡️ The Warm-Blooded Superorganism'),
                h('p', { className: 'text-[10px] text-amber-100/80 mb-2' }, 'Individual bees are cold-blooded. But the colony maintains the brood nest at exactly 35°C (95°F) ± 0.5° — more precisely than most mammals regulate body temperature. How?'),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  h('div', { className: 'bg-red-900/30 rounded-lg p-3 border border-red-700/30' },
                    h('div', { className: 'text-xl text-center mb-1' }, '🔥'),
                    h('div', { className: 'text-xs font-bold text-red-300 text-center mb-1' }, 'Too Cold: Shivering Cluster'),
                    h('p', { className: 'text-[10px] text-red-100/70' }, 'Bees form a tight ball (winter cluster). Outer bees insulate; inner bees vibrate flight muscles WITHOUT moving wings, generating heat. They rotate positions so no bee freezes. The cluster contracts as temperature drops — at -40°C outside, the center stays 35°C.')),
                  h('div', { className: 'bg-blue-900/30 rounded-lg p-3 border border-blue-700/30' },
                    h('div', { className: 'text-xl text-center mb-1' }, '💧'),
                    h('div', { className: 'text-xs font-bold text-blue-300 text-center mb-1' }, 'Too Hot: Evaporative Cooling'),
                    h('p', { className: 'text-[10px] text-blue-100/70' }, 'Water foragers collect droplets and spread them on comb surfaces. Fanner bees create airflow (230 wingbeats/sec) that evaporates the water, cooling by ~10°C. If overheating continues, bees "beard" outside the entrance to reduce internal body heat.'))),
                h('div', { className: 'bg-amber-800/30 rounded-lg p-3 mt-2 text-center' },
                  h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, '🌡️ Current Brood Temperature'),
                  h('div', { className: 'text-2xl font-black text-amber-400' }, season === 3 ? (workers > 5000 ? '35.0°C' : '⚠️ ' + Math.round(20 + workers / 500) + '°C') : '35.0°C ✓'),
                  h('p', { className: 'text-[10px] text-amber-100/60 mt-1' }, season === 3 ? (workers > 5000 ? 'Cluster is maintaining brood temperature despite ' + ['spring','summer','autumn','winter'][season] + ' conditions.' : 'Colony too small to maintain temperature! Brood at risk.') : 'Brood nest perfectly regulated. ' + fannerCount + ' fanner bees on duty.')))),

            // ── PHEROMONE LANGUAGE VIEW ──
            inspectLayer === 'pheromones' && h('div', { className: 'space-y-3' },
              h('p', { className: 'text-xs text-amber-200 mb-1' }, 'Pheromones are the chemical language of the hive. Bees communicate danger, identity, location, reproduction, and social status through volatile molecules detected by 170+ odor receptors on their antennae.'),

              // QMP — Queen Mandibular Pheromone
              h('div', { className: 'bg-purple-900/40 rounded-lg p-3 border border-purple-500/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '👑'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-purple-300' }, 'Queen Mandibular Pheromone (QMP)'),
                    h('div', { className: 'text-[10px] text-purple-400' }, 'The most powerful pheromone in the insect world'))),
                h('div', { className: 'bg-purple-800/30 rounded p-2 mb-2' },
                  h('div', { className: 'text-[10px] font-mono text-purple-300 text-center mb-1' }, 'Key compounds:'),
                  h('div', { className: 'flex flex-wrap gap-1 justify-center' },
                    ['9-ODA (queen substance)', '9-HDA', 'HVA (homovanillyl alcohol)', 'Methyl oleate', '4-hydroxy-3-methoxyphenylethanol'].map(function(c, i) {
                      return h('span', { key: i, className: 'bg-purple-700/40 text-purple-200 px-2 py-0.5 rounded text-[10px]' }, c);
                    }))),
                h('div', { className: 'text-[10px] text-purple-100/70 space-y-1' },
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
                    h('div', { className: 'text-[10px] text-red-400' }, 'The smell of danger'))),
                h('div', { className: 'text-[10px] text-red-100/70 space-y-1' },
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
                    h('div', { className: 'text-[10px] text-green-400' }, '"Come home" — the homing beacon'))),
                h('div', { className: 'text-[10px] text-green-100/70 space-y-1' },
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
                    h('div', { className: 'text-[10px] text-amber-400' }, 'The babies control the adults'))),
                h('div', { className: 'text-[10px] text-amber-100/70 space-y-1' },
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
                    h('div', { className: 'text-[10px] text-cyan-400' }, 'Chemical GPS'))),
                h('div', { className: 'text-[10px] text-cyan-100/70 space-y-1' },
                  h('p', null, '• Deposited by tarsal glands on bee feet as they walk'),
                  h('p', null, '• Marks visited flowers — tells other foragers "already harvested, try the next one"'),
                  h('p', null, '• Marks the hive entrance — helps bees locate the entrance on return'),
                  h('p', null, '• Queen footprint pheromone inhibits queen cell construction — workers know she\'s present and walking the comb'))),

              // The big picture
              h('div', { className: 'bg-slate-800/50 rounded-lg p-3 border border-slate-600/30 text-center' },
                h('div', { className: 'text-xs font-bold text-slate-300 mb-1' }, '🧠 The Chemical Brain'),
                h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, 'A honeybee has 170+ odorant receptors (humans have ~400, but bees are 50× more sensitive to floral scents). The colony\'s pheromone system is essentially a distributed nervous system — each bee is a "neuron" that reads and writes chemical signals. The colony thinks, decides, and responds as one organism, without any centralized brain.'))
            ));
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
          // Run only once on mount — animation loop reads _liveState.current for fresh values
          var cv = _cvRef.current;
          if (!cv) return;
          var c = cv.getContext('2d');
          if (!c) return;

          // Size canvas from parent container (with resize observer)
          var par = cv.parentElement;
          var W = (par ? par.clientWidth : cv.clientWidth) || 500;
          var H = (par ? par.clientHeight : cv.clientHeight) || 300;
          function resizeCanvas() {
            W = (par ? par.clientWidth : cv.clientWidth) || 500;
            H = (par ? par.clientHeight : cv.clientHeight) || 300;
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

          // Initialize bee particles once
          if (!_bees.current || _bees.current.length === 0) {
            var ba = [], nb = Math.max(8, Math.min(60, Math.floor((workers || 10000) / 300)));
            for (var i = 0; i < nb; i++) ba.push({
              x: W * 0.3 + Math.random() * W * 0.5, y: H * 0.15 + Math.random() * H * 0.45,
              vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 1.5,
              sz: 2.5 + Math.random() * 2, ph: Math.random() * 6.28,
              carry: Math.random() > 0.6, toFlower: Math.random() > 0.5, wp: Math.random() * 6.28
            });
            _bees.current = ba;
          }
          // Initialize flowers once
          if (!_flowers.current || _flowers.current.length === 0) {
            var fa = [], nf = Math.min(12, 3 + Math.floor((habitat || 50) / 10));
            var flColors = ['#f472b6','#fbbf24','#a78bfa','#fb923c','#34d399','#f87171','#60a5fa','#e879f9','#38bdf8'];
            for (var j = 0; j < nf; j++) fa.push({
              x: W * 0.52 + j * (W * 0.42 / nf) + (Math.random() - 0.5) * 16,
              y: H * 0.68 + (Math.random() - 0.5) * 14,
              col: flColors[j % flColors.length], sz: 4.5 + Math.random() * 4, sp: Math.random() * 6.28
            });
            _flowers.current = fa;
          }

          var bees = _bees.current, flowers = _flowers.current;
          var hiveX = W * 0.10, hiveY = H * 0.20, hiveW = W * 0.30, hiveH = H * 0.56;

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
              // Sun rays (not winter)
              if (season !== 3) {
                c.strokeStyle = 'rgba(255,220,100,0.15)'; c.lineWidth = 1;
                for (var ri = 0; ri < 8; ri++) {
                  var ra = ri * 0.785 + t2 * 0.003;
                  c.beginPath(); c.moveTo(W * 0.85 + Math.cos(ra) * (sunR + 4), sunY + Math.sin(ra) * (sunR + 4));
                  c.lineTo(W * 0.85 + Math.cos(ra) * (sunR + 14), sunY + Math.sin(ra) * (sunR + 14));
                  c.stroke();
                }
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

              // ── Flying bees (physics-based, with waggle dance trail) ──
              bees.forEach(function(b) {
                var tX = b.toFlower ? (W * 0.6 + Math.sin(b.ph) * W * 0.15) : (hiveX + hiveW * 0.5);
                var tY = b.toFlower ? (H * 0.55 + Math.cos(b.ph * 0.7) * 18) : (hiveY + hiveH - 4);
                b.vx += (tX - b.x) * 0.004 + (Math.random() - 0.5) * 0.25;
                b.vy += (tY - b.y) * 0.004 + (Math.random() - 0.5) * 0.18;
                b.vx *= 0.96; b.vy *= 0.96;
                b.x += b.vx; b.y += b.vy;
                if (Math.abs(b.x - tX) < 12 && Math.abs(b.y - tY) < 12) {
                  b.toFlower = !b.toFlower;
                  b.carry = !b.toFlower;
                }
                b.wp += 0.45;
                var angle = Math.atan2(b.vy, b.vx);

                // Body glow
                c.save();
                c.shadowColor = '#fbbf24'; c.shadowBlur = 3;
                c.fillStyle = '#fbbf24'; c.beginPath();
                c.ellipse(b.x, b.y, b.sz, b.sz * 0.6, angle, 0, 6.28); c.fill();
                c.restore();
                // Stripes
                c.fillStyle = '#292524';
                c.save(); c.translate(b.x, b.y); c.rotate(angle);
                c.fillRect(-b.sz * 0.15, -b.sz * 0.5, b.sz * 0.25, b.sz); c.fillRect(b.sz * 0.25, -b.sz * 0.4, b.sz * 0.2, b.sz * 0.8);
                c.restore();
                // Wings (animated, translucent)
                var wy = Math.sin(b.wp) * 2.5;
                c.globalAlpha = 0.35; c.fillStyle = '#bfdbfe';
                c.beginPath(); c.ellipse(b.x - Math.sin(angle) * 2, b.y - b.sz * 0.4 + wy, b.sz * 0.55, b.sz * 0.25, angle - 0.4, 0, 6.28); c.fill();
                c.beginPath(); c.ellipse(b.x + Math.sin(angle) * 1, b.y - b.sz * 0.5 - wy * 0.5, b.sz * 0.4, b.sz * 0.2, angle + 0.3, 0, 6.28); c.fill();
                c.globalAlpha = 1;
                // Pollen sacs
                if (b.carry) {
                  c.fillStyle = '#f59e0b'; c.beginPath();
                  c.arc(b.x + Math.cos(angle + 1.5) * b.sz * 0.5, b.y + Math.sin(angle + 1.5) * b.sz * 0.5, 1.8, 0, 6.28); c.fill();
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
          frame();

          return function() {
            _loopRunning.current = false;
            if (_animId.current) cancelAnimationFrame(_animId.current);
            if (resizeObs) resizeObs.disconnect();
          };
        }, []);

        // ── Render ──
        var dk = isDark; // shorthand
        return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },
          // Header
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 rounded-lg transition-colors ' + (dk ? 'hover:bg-slate-700' : 'hover:bg-slate-100'), 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: dk ? 'text-slate-400' : 'text-slate-600' })),
              h('div', null,
                h('h3', { className: 'text-lg font-bold ' + (dk ? 'text-slate-100' : 'text-slate-800') }, '🐝 Beehive Colony Simulator'),
                h('p', { className: 'text-xs ' + (dk ? 'text-slate-400' : 'text-slate-600') }, 'Manage a living superorganism — 50,000 minds, one purpose')))),

          // ═══ ANIMATED CANVAS SIMULATION ═══
          h('div', { className: 'relative rounded-2xl overflow-hidden border-2 ' + (dk ? 'border-amber-600/50' : 'border-amber-400'), style: { height: '300px', boxShadow: dk ? '0 0 20px rgba(251,191,36,0.08), 0 4px 16px rgba(0,0,0,0.4)' : '0 0 16px rgba(251,191,36,0.1), 0 4px 16px rgba(0,0,0,0.1)' } },
            h('canvas', { 'aria-label': 'Beehive colony visualization',
              ref: _cvRef,
              role: 'img',
              'aria-label': 'Animated beehive simulation. Workers: ' + workers + ', Honey: ' + honey + ' lbs, Season: ' + seasonNames[season],
              style: { width: '100%', height: '100%', display: 'block' }
            })
          ),

          // Event popup
          activeEvent && h('div', { role: 'alert', 'aria-live': 'assertive', className: 'rounded-xl border-2 p-4 space-y-2 ' + (activeEvent.effect && activeEvent.effect.morale > 0 ? (dk ? 'bg-amber-900/30 border-amber-600/50' : 'bg-amber-50 border-amber-300') : (dk ? 'bg-red-900/30 border-red-600/50' : 'bg-red-50 border-red-300')) },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-2xl' }, activeEvent.emoji),
              h('div', null,
                h('div', { className: 'font-bold text-sm ' + (dk ? 'text-slate-100' : '') }, activeEvent.label),
                h('div', { className: 'text-xs ' + (dk ? 'text-slate-300' : 'text-slate-600') }, activeEvent.desc))),
            h('div', { className: 'rounded-lg p-3 text-xs border ' + (dk ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200') },
              h('strong', null, '🔬 Science: '), activeEvent.lesson),
            h('button', { onClick: dismissEvent, 'aria-label': 'Acknowledge event', className: 'px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition-all' }, '✓ Acknowledge')),

          // Status bar
          h('div', { className: 'flex flex-wrap gap-3 items-center text-xs font-bold', role: 'status', 'aria-live': 'polite', 'aria-label': 'Colony status: ' + seasonNames[season] + ', Day ' + ((day % 30) + 1) + ', ' + honey + ' lbs honey, ' + fmtPop(workers) + ' workers' },
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-sky-900/40 text-sky-300' : 'bg-sky-100 text-sky-800') }, seasonNames[season] + ' Day ' + ((day % 30) + 1)),
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800') }, '🍯 ' + honey + ' lbs'),
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800') }, '🌼 ' + pollen + ' lbs'),
            h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-800') }, '⭐ ' + score + ' pts'),
            gardenBonus > 0 && h('span', { className: 'px-3 py-1 rounded-full ' + (dk ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-800') }, '🌱 Garden +' + gardenBonus + '%')),

          // Colony Dashboard
          h('div', { className: 'rounded-xl border p-4 ' + (dk ? 'bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-amber-700/40' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'), style: { boxShadow: dk ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)' }, role: 'region', 'aria-label': 'Colony dashboard showing population, resources, and health metrics' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'text-sm font-bold ' + (dk ? 'text-amber-300' : 'text-amber-900') }, '🐝 Colony Status'),
              h('div', { className: 'text-sm font-black ' + ratingColor }, colonyRating + ' (' + colonyHealth + ')')),
            h('div', { className: 'grid grid-cols-4 gap-2 text-center mb-3' },
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black text-amber-500', style: { fontFamily: 'monospace' } }, fmtPop(workers)), h('div', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, '👷 Workers')),
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black text-pink-500', style: { fontFamily: 'monospace' } }, fmtPop(brood)), h('div', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, '🥚 Brood')),
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black text-blue-400', style: { fontFamily: 'monospace' } }, drones), h('div', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, '♂ Drones')),
              h('div', { className: 'rounded-lg p-2 ' + (dk ? 'bg-slate-800' : 'bg-white'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } }, h('div', { className: 'text-lg font-black ' + (queenHealth > 70 ? 'text-purple-400' : 'text-red-500'), style: { fontFamily: 'monospace' } }, queenHealth + '%'), h('div', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, '👑 Queen'))),
            // Meters
            h('div', { className: 'space-y-2' },
              // Varroa
              h('div', null,
                h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-red-400' : 'text-red-700') }, '🦟 Varroa Mites'),
                  h('span', { className: varroaLevel > 30 ? 'text-red-500 font-bold' : (dk ? 'text-slate-400' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, varroaLevel + '%')),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: varroaLevel + '%' }, className: 'h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all' }))),
              // Morale
              h('div', null,
                h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-amber-300' : 'text-amber-700') }, '😊 Colony Morale'),
                  h('span', { className: morale < 40 ? 'text-red-500 font-bold' : (dk ? 'text-slate-400' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, morale + '%')),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: morale + '%' }, className: 'h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all' }))),
              // Foraging
              h('div', null,
                h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                  h('span', { className: 'font-bold ' + (dk ? 'text-green-300' : 'text-green-700') }, '🌸 Foraging Efficiency'),
                  h('span', { className: dk ? 'text-slate-400' : 'text-slate-600', style: { fontFamily: 'monospace' } }, foragingEfficiency + '%' + (gardenBonus > 0 ? ' (+' + gardenBonus + '%)' : ''))),
                h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-slate-200'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                  h('div', { style: { width: Math.min(100, foragingEfficiency + gardenBonus) + '%' }, className: 'h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all' }))))),

          // ── Colony History Sparkline Chart ──
          history.length > 2 && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)' } },
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

          // ── Hive Cross-Section Visual ──
          h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-gradient-to-b from-amber-900/30 to-amber-950/20 border-amber-700/40' : 'bg-gradient-to-b from-amber-100 to-amber-50 border-amber-300'),
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
                    h('span', { className: 'text-[10px]' }, frame.pct > 20 ? frame.label : '')));
              })),
            h('div', { className: 'flex justify-between mt-1 text-[10px] ' + (dk ? 'text-amber-400' : 'text-amber-700') },
              h('span', null, '← Honey stores'),
              h('span', { className: 'font-bold' }, 'Brood nest (center)'),
              h('span', null, 'Honey stores →')),
            h('p', { className: 'text-[10px] text-center mt-1 italic ' + (dk ? 'text-amber-400/70' : 'text-amber-600') }, 'Bees organize the comb concentrically: brood in the warm center, pollen ring around it, honey stores on the outer edges. This pattern is universal across all Apis mellifera colonies.')),

          // Garden connection
          gardenBonus > 0 && h('div', { className: 'rounded-xl border p-3 flex items-start gap-2 ' + (dk ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200') },
            h('span', { className: 'text-lg' }, '🌱'),
            h('div', { className: 'text-xs ' + (dk ? 'text-emerald-300' : 'text-emerald-700') },
              h('strong', null, 'Garden Connection Active! '),
              gardenPollinators + ' pollinator plant' + (gardenPollinators !== 1 ? 's' : '') + ' detected in your Companion Planting garden. Your bees have ' + gardenBonus + '% better foraging. Plant more flowers to strengthen the connection!')),

          // Colony collapsed state
          !colonySurvived && h('div', { className: 'rounded-xl border-2 p-5 space-y-3 ' + (dk ? 'bg-gradient-to-b from-red-900/30 to-orange-900/20 border-red-700/50' : 'bg-gradient-to-b from-red-50 to-orange-50 border-red-300'), role: 'alert' },
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
                  h('p', { className: 'text-[10px] ' + (dk ? 'text-slate-400' : 'text-slate-600') }, s[1])
                );
              })
            ),
            // Diagnosis
            h('div', { className: 'bg-white rounded-lg p-3 text-xs text-slate-700 border border-red-200' },
              h('p', { className: 'font-bold text-red-700 mb-1' }, '\uD83D\uDD2C Diagnosis: What went wrong?'),
              h('p', null,
                varroaLevel > 40 ? 'High varroa mite levels (' + varroaLevel + '%) weakened the colony through virus transmission (Deformed Wing Virus, ABPV). Earlier mite treatment with oxalic acid or formic acid might have saved them.' :
                pesticideExposure > 25 ? 'Cumulative pesticide exposure (' + pesticideExposure + '%) poisoned foragers and impaired colony immunity. Neonicotinoids cause sub-lethal effects \u2014 disorientation, memory loss, and weakened immune response.' :
                honey < 5 ? 'Starvation \u2014 the colony ran out of honey stores (' + honey + ' lbs remaining). In nature, a colony needs 60+ lbs of honey to survive winter. Supplemental feeding during dearth periods is critical.' :
                'Multiple stressors combined \u2014 varroa (' + varroaLevel + '%), nutrition (' + honey + ' lbs), and habitat (' + habitat + '%) created a "death spiral" where each problem amplified the others. This is the reality of Colony Collapse Disorder.')
              )
            ),
            // What to try differently
            h('div', { className: 'bg-amber-50 rounded-lg p-3 text-xs border border-amber-200' },
              h('p', { className: 'font-bold text-amber-800 mb-1' }, '\uD83D\uDCA1 Next time, try:'),
              h('ul', { className: 'text-slate-600 space-y-0.5 pl-4 list-disc' },
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
                onClick: function() { updAll({ day: 0, workers: 10000, brood: 3000, drones: 500, queenHealth: 100, honey: 20, pollen: 15, wax: 5, varroaLevel: 5, morale: 80, foragingEfficiency: 70, score: 0, colonySurvived: true, pesticideExposure: 0, habitat: 50, actionPoints: 3, totalHoney: 0, eventsHandled: 0, eventLog: [] }); if (addToast) addToast('\uD83D\uDC1D New colony established! Apply what you learned.', 'success'); },
                className: 'px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 shadow-md transition-all hover:scale-[1.02]'
              }, '\uD83D\uDD04 Start New Colony \u2014 Apply What You Learned')
            )
          ),

          // Seasonal goals
          colonySurvived && h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-indigo-900/20 border-indigo-700/40' : 'bg-indigo-50 border-indigo-200') },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h('span', null, SEASON_GOALS[season].emoji),
              h('span', { className: 'text-xs font-bold ' + (dk ? 'text-indigo-300' : 'text-indigo-800') }, SEASON_GOALS[season].season + ' Goals'),
              h('span', { className: 'text-[10px] ml-auto ' + (dk ? 'text-indigo-400' : 'text-indigo-500') }, '🎯 ' + actionPoints + '/3 actions left today')),
            h('div', { className: 'flex flex-wrap gap-1' },
              SEASON_GOALS[season].goals.map(function(g, i) { return h('span', { key: i, className: 'text-[10px] px-2 py-0.5 rounded border ' + (dk ? 'bg-slate-800 border-indigo-700/30 text-indigo-300' : 'bg-white border-indigo-100 text-indigo-700') }, g); }))),

          // Habitat & Pesticide meters
          colonySurvived && h('div', { className: 'grid grid-cols-2 gap-2' },
            h('div', { className: 'rounded-lg border p-2 ' + (dk ? 'bg-green-900/20 border-green-700/40' : 'bg-green-50 border-green-200') },
              h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                h('span', { className: 'font-bold ' + (dk ? 'text-green-300' : 'text-green-700') }, '🌳 Local Habitat'),
                h('span', { className: habitat > 60 ? 'text-green-500' : habitat > 30 ? 'text-yellow-500' : 'text-red-500', style: { fontFamily: 'monospace' } }, habitat + '%')),
              h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-green-100'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                h('div', { style: { width: habitat + '%' }, className: 'h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all' }))),
            h('div', { className: 'rounded-lg border p-2 ' + (dk ? 'bg-red-900/20 border-red-700/40' : 'bg-red-50 border-red-200') },
              h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                h('span', { className: 'font-bold ' + (dk ? 'text-red-300' : 'text-red-700') }, '☠️ Pesticide Exposure'),
                h('span', { className: pesticideExposure > 20 ? 'text-red-500 font-bold' : (dk ? 'text-slate-400' : 'text-slate-600'), style: { fontFamily: 'monospace' } }, pesticideExposure + '%')),
              h('div', { className: 'h-2.5 rounded-full overflow-hidden ' + (dk ? 'bg-slate-700' : 'bg-red-100'), style: { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' } },
                h('div', { style: { width: pesticideExposure + '%' }, className: 'h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all' })))),

          // Action buttons — grouped by purpose
          colonySurvived && h('div', { className: 'space-y-2' },
            // Primary actions row
            h('div', { className: 'flex gap-2 items-center' },
              h('button', { onClick: advanceDay, 'aria-label': 'Advance one day', className: 'flex-1 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] ' + (dk ? 'bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600'), style: { boxShadow: '0 2px 8px rgba(217,119,6,0.25)' } }, '\u23E9 Next Day'),
              h('button', { onClick: function() { advanceDays(5); }, 'aria-label': 'Advance 5 days', className: 'px-3 py-2.5 rounded-xl text-sm font-bold transition-all ' + (dk ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-800/50' : 'bg-amber-100 text-amber-700 hover:bg-amber-200') }, '\u23ED +5'),
              h('button', { onClick: function() { advanceDays(30); }, 'aria-label': 'Advance 30 days (1 month)', className: 'px-3 py-2.5 rounded-xl text-sm font-bold transition-all ' + (dk ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-800/40' : 'bg-amber-50 text-amber-600 hover:bg-amber-100') }, '\u23ED +30')
            ),
            // Management actions
            h('div', { className: 'grid grid-cols-5 gap-1.5' },
              [
                { onClick: treatVarroa, icon: '\uD83E\uDDEA', label: 'Treat', tip: 'Oxalic acid treatment (-25% mites, -5 morale)', disabled: varroaLevel < 10, color: 'red' },
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
                  h('span', { className: 'text-[10px] font-bold' }, btn.label));
              })),

            // Conservation Actions
            h('div', { className: 'rounded-xl border p-3 ' + (dk ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-50 border-emerald-200') },
              h('div', { className: 'text-xs font-bold mb-2 ' + (dk ? 'text-emerald-300' : 'text-emerald-800'), role: 'heading', 'aria-level': '3' }, '🌍 Conservation Actions (help save bees!)'),
              h('div', { className: 'grid grid-cols-3 gap-1.5', role: 'group', 'aria-label': 'Conservation actions — ' + actionPoints + ' action points available' },
                CONSERVATION_ACTIONS.map(function(action) {
                  return h('button', { key: action.id, 'aria-label': action.label + ': ' + action.desc + '. Cost: ' + action.cost + ' action points.' + (actionPoints < action.cost ? ' Not enough action points.' : ''),
                    onClick: function() {
                      if (actionPoints < action.cost) { if (addToast) addToast('Need ' + action.cost + ' action points (have ' + actionPoints + '). Advance to next day for more.', 'info'); return; }
                      var patch = { actionPoints: actionPoints - action.cost };
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
                      h('span', { className: 'text-[10px] font-bold ' + (dk ? 'text-slate-200' : 'text-slate-800') }, action.label)),
                    h('div', { className: 'text-[10px] mt-0.5 ' + (dk ? 'text-slate-400' : 'text-slate-600') }, action.cost + ' AP · ' + action.desc));
                }))),

          // Hive Inspection (full view replacement)
          showInspect && renderInspection(),

          // Science cards (only when not inspecting)
          !showInspect &&
          h('div', { className: 'grid grid-cols-2 gap-3', role: 'region', 'aria-label': 'Bee science quick reference cards' },
            [
              { title: '💃 The Waggle Dance', text: 'When a forager finds nectar, she performs a figure-8 dance on the comb. The angle of the waggle run (relative to vertical) encodes the direction relative to the sun. The duration encodes distance. Karl von Frisch won the 1973 Nobel Prize for decoding this — the only known symbolic language in non-human animals.' },
              { title: '🧠 The Superorganism', text: 'A honeybee colony is a superorganism — 50,000 individuals functioning as a single living entity. The queen is the reproductive system. Workers are the immune system, digestive system, and nervous system. Drones are the reproductive cells. Temperature is regulated at exactly 35°C (95°F) through fanning and clustering — like a warm-blooded animal made of thousands of cold-blooded insects.' },
              { title: '🍯 From Nectar to Honey', text: 'Nectar is 80% water. Bees convert it to honey (18% water) through enzymatic processing (invertase breaks sucrose into glucose + fructose) and evaporative concentration (bees fan their wings to dehydrate the nectar). Once the moisture content drops below 18.6%, they cap the cell with beeswax. Honey never spoils — edible honey has been found in 3,000-year-old Egyptian tombs.' },
              { title: '⚠️ Colony Collapse Disorder', text: 'Since 2006, beekeepers have reported losing 30-50% of colonies annually. CCD involves workers abandoning the hive, leaving the queen and brood behind. Causes include: varroa mites + viruses they transmit, neonicotinoid pesticides, habitat loss reducing forage diversity, and nutritional stress from monoculture agriculture. Your garden\'s pollinator plants directly combat the habitat loss component.' }
            ].map(function(sc) {
              return h('div', { key: sc.title, className: 'rounded-xl border p-3 transition-all hover:shadow-md ' + (dk ? 'bg-slate-800 border-slate-700 hover:border-amber-600/40' : 'bg-white border-slate-200 hover:border-amber-300'), style: { boxShadow: dk ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.05)' } },
                h('h4', { className: 'text-xs font-bold mb-1 ' + (dk ? 'text-slate-200' : 'text-slate-800') }, sc.title),
                h('p', { className: 'text-[10px] leading-relaxed ' + (dk ? 'text-slate-400' : 'text-slate-600') }, sc.text));
            }))
        );
      })();
    }
  });

})();

} // end dedup guard
