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
          if (!colonySurvived) return; // dead colony can't advance
          if (actionPoints <= 0) { if (addToast) addToast('No action points left today. Advance to next day first.', 'info'); return; }
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

          // Random events
          var newEvent = activeEvent;
          if (!activeEvent && day > 3 && Math.random() < 0.12) {
            var ev = HIVE_EVENTS[Math.floor(Math.random() * HIVE_EVENTS.length)];
            newEvent = ev;
            // Apply effects
            if (ev.effect) {
              if (ev.effect.varroaLevel) newVarroa = Math.max(0, Math.min(100, newVarroa + ev.effect.varroaLevel));
              if (ev.effect.workers) newWorkers = Math.max(0, newWorkers + ev.effect.workers);
              if (ev.effect.brood) newBroodCount = Math.max(0, newBroodCount + ev.effect.brood);
              if (ev.effect.honey) newHoney = Math.max(0, newHoney + ev.effect.honey);
              if (ev.effect.pollen) newPollen = Math.max(0, newPollen + ev.effect.pollen);
              if (ev.effect.wax) newVarroa = Math.max(0, wax + (ev.effect.wax || 0)); // reusing var for simplicity
              if (ev.effect.morale) newMorale = Math.max(0, Math.min(100, newMorale + ev.effect.morale));
              if (ev.effect.foragingEfficiency) efficiency = Math.max(0, Math.min(100, foragingEfficiency + ev.effect.foragingEfficiency));
              if (ev.effect.queenHealth) queenHealth = Math.max(0, Math.min(100, queenHealth + ev.effect.queenHealth));
            }
          }

          // Pesticide natural decay (slow)
          var newPesticide = Math.max(0, pesticideExposure - 0.3);

          updAll({
            day: day + 1,
            workers: Math.round(newWorkers),
            brood: Math.round(newBroodCount),
            drones: Math.round(newDrones),
            honey: Math.round(newHoney * 10) / 10,
            pollen: Math.round(newPollen * 10) / 10,
            varroaLevel: Math.round(newVarroa),
            morale: Math.round(newMorale),
            foragingEfficiency: Math.round(efficiency * 100),
            queenHealth: Math.round(queenHealth),
            activeEvent: newEvent,
            score: score + Math.round(nectarCollected * 10),
            actionPoints: 3, // reset each day
            habitat: habitat,
            pesticideExposure: Math.round(newPesticide),
            totalHoney: totalHoney + Math.max(0, nectarCollected)
          });
        }

        // ── Actions ──
        function treatVarroa() {
          updAll({ varroaLevel: Math.max(0, varroaLevel - 25), morale: Math.max(0, morale - 5) });
          if (addToast) addToast('🧪 Varroa treatment applied (oxalic acid). Mite count reduced.', 'success');
          if (awardStemXP) awardStemXP(5);
        }
        function addSuper() {
          updAll({ morale: Math.min(100, morale + 10), wax: wax + 2 });
          if (addToast) addToast('📦 Added a honey super — more space for the colony!', 'success');
          if (awardStemXP) awardStemXP(5);
        }
        function harvestHoney() {
          if (honey < 15) { if (addToast) addToast('⚠️ Not enough surplus honey to harvest safely. Leave 15+ lbs for the bees.', 'info'); return; }
          var harvested = Math.round((honey - 15) * 10) / 10;
          updAll({ honey: 15, score: score + Math.round(harvested * 20) });
          if (addToast) addToast('🍯 Harvested ' + harvested + ' lbs of honey! (+' + Math.round(harvested * 20) + ' pts)', 'success');
          if (awardStemXP) awardStemXP(15);
        }
        function feedBees() {
          updAll({ honey: honey + 5, morale: Math.min(100, morale + 5) });
          if (addToast) addToast('🫙 Fed sugar syrup — emergency reserves replenished.', 'success');
          if (awardStemXP) awardStemXP(3);
        }
        function dismissEvent() {
          updAll({ activeEvent: null });
          if (awardStemXP) awardStemXP(5);
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
                  className: 'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ' + (active ? 'bg-amber-500 text-white' : 'bg-amber-800/50 text-amber-300 hover:bg-amber-700/50')
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
                        h('span', { className: 'text-[9px] text-amber-400' }, r.age),
                        h('span', { className: 'text-[9px] text-amber-500 ml-auto' }, fmtPop(r.count) + ' (' + r.pct + '%)')))),
                  h('div', { className: 'h-1.5 bg-amber-900 rounded-full overflow-hidden mb-1' },
                    h('div', { style: { width: r.pct + '%' }, className: 'h-full ' + r.color + ' rounded-full' })),
                  h('p', { className: 'text-[9px] text-amber-100/70 leading-relaxed' }, r.desc));
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
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-amber-400' }, honey), h('div', { className: 'text-[9px] text-amber-300' }, 'lbs honey')),
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-yellow-400' }, pollen), h('div', { className: 'text-[9px] text-amber-300' }, 'lbs pollen')),
                  h('div', { className: 'bg-amber-800/30 rounded p-2' }, h('div', { className: 'text-lg font-black text-orange-400' }, Math.round(workers * 0.4 * 0.0002 * [0.8,1.3,0.6,0][season] * 100) / 100), h('div', { className: 'text-[9px] text-amber-300' }, 'lbs/day in'))))),

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
                  h('div', { className: 'flex gap-2 mb-1 text-[9px]' },
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🥚 ' + c.egg),
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🐛 ' + c.larva),
                    h('span', { className: 'bg-amber-800/40 px-2 py-0.5 rounded text-amber-300' }, '🫘 ' + c.pupa),
                    h('span', { className: 'bg-amber-700/50 px-2 py-0.5 rounded text-amber-200 font-bold' }, '= ' + c.total)),
                  h('div', { className: 'text-[9px] text-amber-300 mb-1' }, '🕐 Lifespan: ' + c.lifespan + ' · 🍽️ Diet: ' + c.diet),
                  h('p', { className: 'text-[9px] text-amber-100/70 leading-relaxed' }, c.note));
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
                    h('p', { className: 'text-[9px] text-amber-100/70' }, 'The angle of the waggle run relative to vertical = the angle of the food source relative to the sun. Straight up = toward the sun. 60° right = 60° right of the sun. The bee uses the sun as a compass and gravity as a reference.')),
                  h('div', { className: 'bg-amber-800/30 rounded-lg p-3' },
                    h('div', { className: 'text-xl mb-1' }, '📏'),
                    h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, 'Distance'),
                    h('p', { className: 'text-[9px] text-amber-100/70' }, 'The duration of the waggle run encodes distance. ~1 second of waggling ≈ 1 kilometer. A 2-second waggle run means the nectar is about 2km away. Closer sources use a simpler "round dance" (no direction info needed).'))),
                h('p', { className: 'text-[9px] text-amber-400 italic' }, 'Karl von Frisch decoded this in the 1940s-60s. He shared the 1973 Nobel Prize in Physiology or Medicine. It remains the only known example of symbolic referential communication in invertebrates.'))),

            // ── THERMOREGULATION VIEW ──
            inspectLayer === 'temperature' && h('div', { className: 'space-y-3' },
              h('div', { className: 'bg-amber-900/40 rounded-lg p-3 border border-amber-700/30' },
                h('div', { className: 'font-bold text-amber-200 text-xs mb-2' }, '🌡️ The Warm-Blooded Superorganism'),
                h('p', { className: 'text-[10px] text-amber-100/80 mb-2' }, 'Individual bees are cold-blooded. But the colony maintains the brood nest at exactly 35°C (95°F) ± 0.5° — more precisely than most mammals regulate body temperature. How?'),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                  h('div', { className: 'bg-red-900/30 rounded-lg p-3 border border-red-700/30' },
                    h('div', { className: 'text-xl text-center mb-1' }, '🔥'),
                    h('div', { className: 'text-xs font-bold text-red-300 text-center mb-1' }, 'Too Cold: Shivering Cluster'),
                    h('p', { className: 'text-[9px] text-red-100/70' }, 'Bees form a tight ball (winter cluster). Outer bees insulate; inner bees vibrate flight muscles WITHOUT moving wings, generating heat. They rotate positions so no bee freezes. The cluster contracts as temperature drops — at -40°C outside, the center stays 35°C.')),
                  h('div', { className: 'bg-blue-900/30 rounded-lg p-3 border border-blue-700/30' },
                    h('div', { className: 'text-xl text-center mb-1' }, '💧'),
                    h('div', { className: 'text-xs font-bold text-blue-300 text-center mb-1' }, 'Too Hot: Evaporative Cooling'),
                    h('p', { className: 'text-[9px] text-blue-100/70' }, 'Water foragers collect droplets and spread them on comb surfaces. Fanner bees create airflow (230 wingbeats/sec) that evaporates the water, cooling by ~10°C. If overheating continues, bees "beard" outside the entrance to reduce internal body heat.'))),
                h('div', { className: 'bg-amber-800/30 rounded-lg p-3 mt-2 text-center' },
                  h('div', { className: 'text-xs font-bold text-amber-300 mb-1' }, '🌡️ Current Brood Temperature'),
                  h('div', { className: 'text-2xl font-black text-amber-400' }, season === 3 ? (workers > 5000 ? '35.0°C' : '⚠️ ' + Math.round(20 + workers / 500) + '°C') : '35.0°C ✓'),
                  h('p', { className: 'text-[9px] text-amber-100/60 mt-1' }, season === 3 ? (workers > 5000 ? 'Cluster is maintaining brood temperature despite ' + ['spring','summer','autumn','winter'][season] + ' conditions.' : 'Colony too small to maintain temperature! Brood at risk.') : 'Brood nest perfectly regulated. ' + fannerCount + ' fanner bees on duty.')))),

            // ── PHEROMONE LANGUAGE VIEW ──
            inspectLayer === 'pheromones' && h('div', { className: 'space-y-3' },
              h('p', { className: 'text-xs text-amber-200 mb-1' }, 'Pheromones are the chemical language of the hive. Bees communicate danger, identity, location, reproduction, and social status through volatile molecules detected by 170+ odor receptors on their antennae.'),

              // QMP — Queen Mandibular Pheromone
              h('div', { className: 'bg-purple-900/40 rounded-lg p-3 border border-purple-500/30' },
                h('div', { className: 'flex items-center gap-2 mb-2' },
                  h('span', { className: 'text-xl' }, '👑'),
                  h('div', null,
                    h('div', { className: 'text-xs font-bold text-purple-300' }, 'Queen Mandibular Pheromone (QMP)'),
                    h('div', { className: 'text-[9px] text-purple-400' }, 'The most powerful pheromone in the insect world'))),
                h('div', { className: 'bg-purple-800/30 rounded p-2 mb-2' },
                  h('div', { className: 'text-[9px] font-mono text-purple-300 text-center mb-1' }, 'Key compounds:'),
                  h('div', { className: 'flex flex-wrap gap-1 justify-center' },
                    ['9-ODA (queen substance)', '9-HDA', 'HVA (homovanillyl alcohol)', 'Methyl oleate', '4-hydroxy-3-methoxyphenylethanol'].map(function(c, i) {
                      return h('span', { key: i, className: 'bg-purple-700/40 text-purple-200 px-2 py-0.5 rounded text-[8px]' }, c);
                    }))),
                h('div', { className: 'text-[9px] text-purple-100/70 space-y-1' },
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
                    h('div', { className: 'text-[9px] text-red-400' }, 'The smell of danger'))),
                h('div', { className: 'text-[9px] text-red-100/70 space-y-1' },
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
                    h('div', { className: 'text-[9px] text-green-400' }, '"Come home" — the homing beacon'))),
                h('div', { className: 'text-[9px] text-green-100/70 space-y-1' },
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
                    h('div', { className: 'text-[9px] text-amber-400' }, 'The babies control the adults'))),
                h('div', { className: 'text-[9px] text-amber-100/70 space-y-1' },
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
                    h('div', { className: 'text-[9px] text-cyan-400' }, 'Chemical GPS'))),
                h('div', { className: 'text-[9px] text-cyan-100/70 space-y-1' },
                  h('p', null, '• Deposited by tarsal glands on bee feet as they walk'),
                  h('p', null, '• Marks visited flowers — tells other foragers "already harvested, try the next one"'),
                  h('p', null, '• Marks the hive entrance — helps bees locate the entrance on return'),
                  h('p', null, '• Queen footprint pheromone inhibits queen cell construction — workers know she\'s present and walking the comb'))),

              // The big picture
              h('div', { className: 'bg-slate-800/50 rounded-lg p-3 border border-slate-600/30 text-center' },
                h('div', { className: 'text-xs font-bold text-slate-300 mb-1' }, '🧠 The Chemical Brain'),
                h('p', { className: 'text-[10px] text-slate-400 leading-relaxed' }, 'A honeybee has 170+ odorant receptors (humans have ~400, but bees are 50× more sensitive to floral scents). The colony\'s pheromone system is essentially a distributed nervous system — each bee is a "neuron" that reads and writes chemical signals. The colony thinks, decides, and responds as one organism, without any centralized brain.'))
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

        // ── Render ──
        return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },
          // Header
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
              h('div', null,
                h('h3', { className: 'text-lg font-bold text-slate-800' }, '🐝 Beehive Colony Simulator'),
                h('p', { className: 'text-xs text-slate-500' }, 'Manage a living superorganism — 50,000 minds, one purpose')))),

          // Event popup
          activeEvent && h('div', { role: 'alert', 'aria-live': 'assertive', className: 'rounded-xl border-2 p-4 space-y-2 ' + (activeEvent.effect && activeEvent.effect.morale > 0 ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300') },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-2xl' }, activeEvent.emoji),
              h('div', null,
                h('div', { className: 'font-bold text-sm' }, activeEvent.label),
                h('div', { className: 'text-xs text-slate-600' }, activeEvent.desc))),
            h('div', { className: 'bg-white rounded-lg p-3 text-xs text-slate-700 border border-slate-200' },
              h('strong', null, '🔬 Science: '), activeEvent.lesson),
            h('button', { onClick: dismissEvent, 'aria-label': 'Acknowledge event', className: 'px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700' }, '✓ Acknowledge')),

          // Status bar
          h('div', { className: 'flex flex-wrap gap-3 items-center text-xs font-bold', role: 'status', 'aria-live': 'polite', 'aria-label': 'Colony status: ' + seasonNames[season] + ', Day ' + ((day % 30) + 1) + ', ' + honey + ' lbs honey, ' + fmtPop(workers) + ' workers' },
            h('span', { className: 'bg-sky-100 text-sky-800 px-3 py-1 rounded-full' }, seasonNames[season] + ' Day ' + ((day % 30) + 1)),
            h('span', { className: 'bg-amber-100 text-amber-800 px-3 py-1 rounded-full' }, '🍯 ' + honey + ' lbs'),
            h('span', { className: 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full' }, '🌼 ' + pollen + ' lbs'),
            h('span', { className: 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full' }, '⭐ ' + score + ' pts'),
            gardenBonus > 0 && h('span', { className: 'bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full' }, '🌱 Garden +' + gardenBonus + '%')),

          // Colony Dashboard
          h('div', { className: 'bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'text-sm font-bold text-amber-900' }, '🐝 Colony Status'),
              h('div', { className: 'text-sm font-black ' + ratingColor }, colonyRating + ' (' + colonyHealth + ')')),
            h('div', { className: 'grid grid-cols-4 gap-2 text-center mb-3' },
              h('div', { className: 'bg-white rounded-lg p-2' }, h('div', { className: 'text-lg font-black text-amber-600' }, fmtPop(workers)), h('div', { className: 'text-[9px] text-slate-500' }, '👷 Workers')),
              h('div', { className: 'bg-white rounded-lg p-2' }, h('div', { className: 'text-lg font-black text-pink-500' }, fmtPop(brood)), h('div', { className: 'text-[9px] text-slate-500' }, '🥚 Brood')),
              h('div', { className: 'bg-white rounded-lg p-2' }, h('div', { className: 'text-lg font-black text-blue-500' }, drones), h('div', { className: 'text-[9px] text-slate-500' }, '♂ Drones')),
              h('div', { className: 'bg-white rounded-lg p-2' }, h('div', { className: 'text-lg font-black ' + (queenHealth > 70 ? 'text-purple-500' : 'text-red-500') }, queenHealth + '%'), h('div', { className: 'text-[9px] text-slate-500' }, '👑 Queen'))),
            // Meters
            h('div', { className: 'space-y-2' },
              // Varroa
              h('div', null,
                h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                  h('span', { className: 'text-red-700 font-bold' }, '🦟 Varroa Mites'),
                  h('span', { className: varroaLevel > 30 ? 'text-red-600 font-bold' : 'text-slate-500' }, varroaLevel + '%')),
                h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden' },
                  h('div', { style: { width: varroaLevel + '%' }, className: 'h-full bg-red-500 rounded-full transition-all' }))),
              // Morale
              h('div', null,
                h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                  h('span', { className: 'text-amber-700 font-bold' }, '😊 Colony Morale'),
                  h('span', { className: morale < 40 ? 'text-red-600 font-bold' : 'text-slate-500' }, morale + '%')),
                h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden' },
                  h('div', { style: { width: morale + '%' }, className: 'h-full bg-amber-400 rounded-full transition-all' }))),
              // Foraging
              h('div', null,
                h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                  h('span', { className: 'text-green-700 font-bold' }, '🌸 Foraging Efficiency'),
                  h('span', { className: 'text-slate-500' }, foragingEfficiency + '%' + (gardenBonus > 0 ? ' (+' + gardenBonus + '% garden)' : ''))),
                h('div', { className: 'h-2 bg-slate-200 rounded-full overflow-hidden' },
                  h('div', { style: { width: Math.min(100, foragingEfficiency + gardenBonus) + '%' }, className: 'h-full bg-green-500 rounded-full transition-all' }))))),

          // ── Hive Cross-Section Visual ──
          h('div', { className: 'bg-gradient-to-b from-amber-100 to-amber-50 rounded-xl border border-amber-300 p-3',
            role: 'img', 'aria-label': 'Hive cross-section: honey stores on outer edges (' + Math.round(honey) + ' lbs), pollen ring (' + Math.round(pollen) + ' lbs), brood nest in center (' + fmtPop(brood) + ' larvae), queen health ' + queenHealth + '%. Bees organize comb concentrically for thermal efficiency.' },
            h('div', { className: 'text-xs font-bold text-amber-900 mb-2 text-center', role: 'heading', 'aria-level': '3' }, '🏠 Hive Cross-Section'),
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
                    h('span', { className: 'text-[8px]' }, frame.pct > 20 ? frame.label : '')));
              })),
            h('div', { className: 'flex justify-between mt-1 text-[8px] text-amber-700' },
              h('span', null, '← Honey stores'),
              h('span', { className: 'font-bold' }, 'Brood nest (center)'),
              h('span', null, 'Honey stores →')),
            h('p', { className: 'text-[9px] text-amber-600 text-center mt-1 italic' }, 'Bees organize the comb concentrically: brood in the warm center, pollen ring around it, honey stores on the outer edges. This pattern is universal across all Apis mellifera colonies.')),

          // Garden connection
          gardenBonus > 0 && h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3 flex items-start gap-2' },
            h('span', { className: 'text-lg' }, '🌱'),
            h('div', { className: 'text-xs text-emerald-700' },
              h('strong', null, 'Garden Connection Active! '),
              gardenPollinators + ' pollinator plant' + (gardenPollinators !== 1 ? 's' : '') + ' detected in your Companion Planting garden. Your bees have ' + gardenBonus + '% better foraging. Plant more flowers to strengthen the connection!')),

          // Colony collapsed state
          !colonySurvived && h('div', { className: 'bg-red-50 rounded-xl border-2 border-red-300 p-5 text-center space-y-3' },
            h('div', { className: 'text-4xl' }, '💀'),
            h('h3', { className: 'text-lg font-black text-red-800' }, 'Colony Collapse'),
            h('p', { className: 'text-sm text-red-600' }, 'Your colony has fallen below 500 workers. The remaining bees cannot maintain brood temperature, defend against robbers, or forage enough to survive. This is Colony Collapse.'),
            h('div', { className: 'bg-white rounded-lg p-3 text-xs text-slate-700 border border-red-200 text-left' },
              h('strong', null, '🔬 What went wrong? '),
              varroaLevel > 40 ? 'High varroa mite levels ('+varroaLevel+'%) weakened the colony through virus transmission. Earlier mite treatment might have saved them.' :
              pesticideExposure > 25 ? 'Cumulative pesticide exposure ('+pesticideExposure+'%) poisoned foragers and impaired colony immunity. Advocating for no-spray zones protects bees.' :
              honey < 5 ? 'Starvation — the colony ran out of honey stores. Supplemental feeding during dearth periods is critical.' :
              'Multiple stressors combined — varroa, nutrition, and habitat loss create a "death spiral" where each problem amplifies the others.'),
            h('button', { onClick: function() { updAll({ day: 0, workers: 10000, brood: 3000, drones: 500, queenHealth: 100, honey: 20, pollen: 15, wax: 5, varroaLevel: 5, morale: 80, foragingEfficiency: 70, score: 0, colonySurvived: true, pesticideExposure: 0, habitat: 50, actionPoints: 3, totalHoney: 0 }); }, className: 'px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700' }, '🔄 Start New Colony')),

          // Seasonal goals
          colonySurvived && h('div', { className: 'bg-indigo-50 rounded-xl border border-indigo-200 p-3' },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h('span', null, SEASON_GOALS[season].emoji),
              h('span', { className: 'text-xs font-bold text-indigo-800' }, SEASON_GOALS[season].season + ' Goals'),
              h('span', { className: 'text-[10px] text-indigo-500 ml-auto' }, '🎯 ' + actionPoints + '/3 actions left today')),
            h('div', { className: 'flex flex-wrap gap-1' },
              SEASON_GOALS[season].goals.map(function(g, i) { return h('span', { key: i, className: 'text-[9px] bg-white px-2 py-0.5 rounded border border-indigo-100 text-indigo-700' }, g); }))),

          // Habitat & Pesticide meters
          colonySurvived && h('div', { className: 'grid grid-cols-2 gap-2' },
            h('div', { className: 'bg-green-50 rounded-lg border border-green-200 p-2' },
              h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                h('span', { className: 'font-bold text-green-700' }, '🌳 Local Habitat'),
                h('span', { className: habitat > 60 ? 'text-green-600' : habitat > 30 ? 'text-yellow-600' : 'text-red-600' }, habitat + '%')),
              h('div', { className: 'h-2 bg-green-100 rounded-full overflow-hidden' },
                h('div', { style: { width: habitat + '%' }, className: 'h-full bg-green-500 rounded-full transition-all' }))),
            h('div', { className: 'bg-red-50 rounded-lg border border-red-200 p-2' },
              h('div', { className: 'flex justify-between text-[10px] mb-0.5' },
                h('span', { className: 'font-bold text-red-700' }, '☠️ Pesticide Exposure'),
                h('span', { className: pesticideExposure > 20 ? 'text-red-600 font-bold' : 'text-slate-500' }, pesticideExposure + '%')),
              h('div', { className: 'h-2 bg-red-100 rounded-full overflow-hidden' },
                h('div', { style: { width: pesticideExposure + '%' }, className: 'h-full bg-red-500 rounded-full transition-all' })))),

          // Action buttons with action point costs
          colonySurvived && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex gap-2 flex-wrap' },
              h('button', { onClick: advanceDay, 'aria-label': 'Advance one day', className: 'px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700' }, '⏩ Next Day'),
              h('button', { onClick: function() { for(var i=0;i<5;i++) advanceDay(); }, className: 'px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200' }, '⏭️ +5 Days'),
              h('button', { onClick: treatVarroa, 'aria-label': 'Apply varroa mite treatment', disabled: varroaLevel < 10, className: 'px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 disabled:opacity-40' }, '🧪 Treat Varroa'),
              h('button', { onClick: addSuper, 'aria-label': 'Add honey super for more space', className: 'px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200' }, '📦 Add Super'),
              h('button', { onClick: harvestHoney, 'aria-label': 'Harvest surplus honey', disabled: honey < 15, className: 'px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold hover:bg-amber-200 disabled:opacity-40' }, '🍯 Harvest'),
              h('button', { onClick: feedBees, 'aria-label': 'Feed bees sugar syrup', className: 'px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200' }, '🫙 Feed'),
              h('button', { onClick: function() { upd('showInspect', true); }, 'aria-label': 'Open hive inspector', className: 'px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200' }, '🔍 Inspect')),

            // Conservation Actions
            h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-3' },
              h('div', { className: 'text-xs font-bold text-emerald-800 mb-2', role: 'heading', 'aria-level': '3' }, '🌍 Conservation Actions (help save bees!)'),
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
                      if (awardStemXP) awardStemXP(8);
                    },
                    title: action.desc + ' (Cost: ' + action.cost + ' AP)',
                    className: 'text-left p-2 bg-white rounded-lg border border-emerald-100 hover:border-emerald-400 hover:shadow-sm transition-all ' + (actionPoints < action.cost ? 'opacity-40' : '')
                  },
                    h('div', { className: 'flex items-center gap-1' },
                      h('span', null, action.emoji),
                      h('span', { className: 'text-[9px] font-bold text-slate-800' }, action.label)),
                    h('div', { className: 'text-[8px] text-slate-500 mt-0.5' }, action.cost + ' AP · ' + action.desc));
                })))),

          // Hive Inspection (full view replacement)
          showInspect && renderInspection(),

          // Science cards (only when not inspecting)
          !showInspect &&
          h('div', { className: 'grid grid-cols-2 gap-3', role: 'region', 'aria-label': 'Bee science quick reference cards' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },
              h('h4', { className: 'text-xs font-bold text-slate-800 mb-1' }, '💃 The Waggle Dance'),
              h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, 'When a forager finds nectar, she performs a figure-8 dance on the comb. The angle of the waggle run (relative to vertical) encodes the direction relative to the sun. The duration encodes distance. Karl von Frisch won the 1973 Nobel Prize for decoding this — the only known symbolic language in non-human animals.')),
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },
              h('h4', { className: 'text-xs font-bold text-slate-800 mb-1' }, '🧠 The Superorganism'),
              h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, 'A honeybee colony is a superorganism — 50,000 individuals functioning as a single living entity. The queen is the reproductive system. Workers are the immune system, digestive system, and nervous system. Drones are the reproductive cells. Temperature is regulated at exactly 35°C (95°F) through fanning and clustering — like a warm-blooded animal made of thousands of cold-blooded insects.')),
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },
              h('h4', { className: 'text-xs font-bold text-slate-800 mb-1' }, '🍯 From Nectar to Honey'),
              h('p', { className: 'text-[10px] text-slate-600 leading-relaxed' }, 'Nectar is 80% water. Bees convert it to honey (18% water) through enzymatic processing (invertase breaks sucrose into glucose + fructose) and evaporative concentration (bees fan their wings to dehydrate the nectar). Once the moisture content drops below 18.6%, they cap the cell with beeswax. Honey never spoils — edible honey has been found in 3,000-year-old Egyptian tombs.')),
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },
              h('h4', { className: 'text-xs font-bold text-slate-800 mb-1' }, '⚠️ Colony Collapse Disorder'),
              h('div', { className: 'text-[10px] text-slate-600 leading-relaxed' }, 'Since 2006, beekeepers have reported losing 30-50% of colonies annually. CCD involves workers abandoning the hive, leaving the queen and brood behind. Causes include: varroa mites + viruses they transmit, neonicotinoid pesticides, habitat loss reducing forage diversity, and nutritional stress from monoculture agriculture. Your garden\'s pollinator plants directly combat the habitat loss component.')))
        );
      })();
    }
  });

})();

} // end dedup guard
