// ═══════════════════════════════════════════
// stem_tool_spacecolony.js — Kepler Colony (standalone CDN module)
// Extracted from stem_lab_module.js inline code
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('spaceColony'))) {

(function() {
  'use strict';

  // ── Audio System (auto-injected) ──
  var _colAC = null;
  function getColAC() { if (!_colAC) { try { _colAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_colAC && _colAC.state === "suspended") { try { _colAC.resume(); } catch(e) {} } return _colAC; }
  function colTone(f,d,tp,v) { var ac = getColAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxColBuild() { colTone(440,0.06,"square",0.05); }
  function sfxColHarvest() { colTone(523,0.06,"sine",0.06); }
  function sfxColAlert() { colTone(880,0.08,"square",0.06); }


  window.StemLab.registerTool('spaceColony', {
    icon: '\uD83D\uDE80',
    label: 'Kepler Colony',
    desc: 'Colonize an alien planet! Turn-based cooperative strategy where mastering science unlocks colony survival.',
    color: 'indigo',
    category: 'strategy',
    questHooks: [
      { id: 'establish_colony', label: 'Establish a colony on Kepler-442b', icon: '\uD83D\uDE80', check: function(d) { return !!d.colony; }, progress: function(d) { return d.colony ? 'Established!' : 'Not yet'; } },
      { id: 'survive_10_turns', label: 'Survive 10 turns', icon: '\uD83C\uDF1F', check: function(d) { return (d.colonyTurn || 0) >= 10; }, progress: function(d) { return (d.colonyTurn || 0) + '/10 turns'; } },
      { id: 'build_5_structures', label: 'Build 5 colony structures', icon: '\uD83C\uDFD7\uFE0F', check: function(d) { return (d.colonyBuildings || []).length >= 5; }, progress: function(d) { return (d.colonyBuildings || []).length + '/5'; } },
      { id: 'answer_5_questions', label: 'Answer 5 science questions correctly', icon: '\uD83E\uDDE0', check: function(d) { var s = d.colonyStats || {}; return (s.correct || 0) >= 5; }, progress: function(d) { var s = d.colonyStats || {}; return (s.correct || 0) + '/5'; } },
      { id: 'terraform_25', label: 'Reach 25% terraforming progress', icon: '\uD83C\uDF0D', check: function(d) { return (d.colonyTerraform || 0) >= 25; }, progress: function(d) { return (d.colonyTerraform || 0) + '/25%'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var t = ctx.t;

          var d = labToolData || {};
          var upd = function (k, v) { setLabToolData(function (n) { var o = Object.assign({}, n); o[k] = v; return o; }); };
          var colony = d.colony || null;
          var turn = d.colonyTurn || 0;
          var resources = d.colonyRes || { food: 40, energy: 30, water: 30, materials: 20, science: 10 };
          var buildings = d.colonyBuildings || [];
          var settlers = d.colonySettlers || [];
          var mapData = d.colonyMap || null;
          var mapSize = 200;
          var selectedTile = d.colonySelTile || null;
          var colonyZoom = d.colonyZoom || 1.0;
          var camX = d.colonyCamX || 0;
          var camY = d.colonyCamY || 0;
          // Drag state for pan
          if (!window._colonyDragState) window._colonyDragState = { dragging: false, startX: 0, startY: 0, startCamX: 0, startCamY: 0, didDrag: false };
          var dragState = window._colonyDragState;
          // Edge scroll state
          if (!window._colonyEdgeScroll) window._colonyEdgeScroll = { active: false, dx: 0, dy: 0 };
          var edgeScroll = window._colonyEdgeScroll;
          var colonyEvent = d.colonyEvent || null;
          var scienceGate = d.scienceGate || null;
          var gameLog = d.colonyLog || [];
          var colonyPhase = d.colonyPhase || 'setup';
          var terraform = d.colonyTerraform || 0;
          var weather = d.colonyWeather || null;
          var gameMode = d.colonyMode || 'mcq'; // 'mcq' or 'freeResponse'
          var gradeLevel = d.colonyGrade || '6-8';
          var gradeDifficultyMap = { 'K-2': 'very easy, age 5-7, use simple words', '3-5': 'easy, age 8-10, elementary level', '6-8': 'medium, age 11-13, middle school level', '9-12': 'challenging, age 14-17, high school level', 'College': 'advanced, undergraduate university level' };
          var stats = d.colonyStats || { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 };

          // ══ HoMM-Inspired Turn Phase System ══
          var turnPhase = d.turnPhase || (turn > 0 ? 'day' : null);
          var actionPoints = d.actionPoints !== undefined ? d.actionPoints : 3;
          var maxAP = 3 + (buildings.indexOf('comms') >= 0 ? 1 : 0);
          var fateRoll = d.fateRoll || null;
          var dawnData = d.dawnData || null;
          var mapPickups = d.mapPickups || {};
          var fateAnimating = d.fateAnimating || false;
          var builtThisTurn = d.builtThisTurn || false;

          var fateTable = [
            { min: 1, max: 5, type: 'disaster', label: 'Catastrophe!', icon: '\uD83D\uDCA5', color: '#ef4444' },
            { min: 6, max: 15, type: 'hazard', label: 'Hazard', icon: '\u26A0\uFE0F', color: '#f97316' },
            { min: 16, max: 30, type: 'challenge', label: 'Challenge', icon: '\uD83C\uDFAF', color: '#eab308' },
            { min: 31, max: 50, type: 'calm', label: 'Peaceful Day', icon: '\u2600\uFE0F', color: '#22c55e' },
            { min: 51, max: 70, type: 'discovery', label: 'Discovery!', icon: '\uD83D\uDD0D', color: '#3b82f6' },
            { min: 71, max: 85, type: 'windfall', label: 'Windfall!', icon: '\uD83C\uDF81', color: '#8b5cf6' },
            { min: 86, max: 95, type: 'settlers', label: 'New Arrivals!', icon: '\uD83D\uDE80', color: '#06b6d4' },
            { min: 96, max: 100, type: 'jackpot', label: 'JACKPOT!', icon: '\u2B50', color: '#f59e0b' }
          ];
          var lootByTerrain = {
            plains: { common: { res: 'food', amt: 3, label: '+3 Food' }, rare: { res: 'food', amt: 10, label: 'Seed Vault!' }, epic: { res: 'food', amt: 20, label: 'Fertile Oasis!' } },
            mountain: { common: { res: 'materials', amt: 3, label: '+3 Materials' }, rare: { res: 'materials', amt: 8, label: 'Mineral Deposit!' }, epic: { res: 'materials', amt: 18, label: 'Ancient Mine!' } },
            volcanic: { common: { res: 'energy', amt: 3, label: '+3 Energy' }, rare: { res: 'energy', amt: 8, label: 'Geothermal Vent!' }, epic: { res: 'energy', amt: 18, label: 'Lava Forge!' } },
            ice: { common: { res: 'water', amt: 3, label: '+3 Water' }, rare: { res: 'water', amt: 8, label: 'Ice Cavern!' }, epic: { res: 'water', amt: 18, label: 'Cryo Reserve!' } },
            desert: { common: { res: 'materials', amt: 3, label: '+3 Materials' }, rare: { res: 'science', amt: 6, label: 'Fossil Site!' }, epic: { res: 'science', amt: 15, label: 'Ancient Ruins!' } },
            ocean: { common: { res: 'water', amt: 3, label: '+3 Water' }, rare: { res: 'food', amt: 8, label: 'Kelp Forest!' }, epic: { res: 'water', amt: 15, label: 'Underwater City!' } },
            radiation: { common: { res: 'science', amt: 3, label: '+3 Science' }, rare: { res: 'science', amt: 8, label: 'Data Cache!' }, epic: { res: 'science', amt: 15, label: 'Alien Archive!' } }
          };
          var tutorialGuide = [
            { turn: 1, hint: 'Explore tiles around your colony to discover resources!', icon: '\uD83D\uDDFA' },
            { turn: 2, hint: 'Build your first structure! Try Hydroponics for food.', icon: '\uD83C\uDFD7' },
            { turn: 3, hint: 'You have ' + maxAP + ' Action Points per turn. Plan wisely!', icon: '\u26A1' },
            { turn: 5, hint: 'Research unlocks permanent bonuses!', icon: '\uD83E\uDDEC' },
            { turn: 8, hint: 'Choose a governance policy to shape your colony.', icon: '\uD83C\uDFDB' }
          ];
          function getAdvisorMessage() {
            if (turn > 30) return null;
            if (resources.food <= 5 && buildings.indexOf('hydroponics') < 0)
              return { settler: settlers[0] || { name: 'Dr. Vasquez', icon: '\uD83C\uDF31', role: 'Botanist' }, msg: 'Food critical! Build Hydroponics (15 mats, 5 energy) for +3 food/turn.', action: 'build' };
            if (resources.energy <= 3 && buildings.indexOf('solar') < 0)
              return { settler: settlers[4] || { name: 'Prof. Patel', icon: '\u269B', role: 'Physicist' }, msg: 'Energy critical! Build Solar Array for +3 energy/turn.', action: 'build' };
            if (buildings.length === 0 && turn >= 2)
              return { settler: settlers[1] || { name: 'Cmdr. Chen', icon: '\u2699', role: 'Engineer' }, msg: 'We need our first building. Try Hydroponics or Solar Array.', action: 'build' };
            var guide = tutorialGuide.find(function(g) { return g.turn === turn; });
            if (guide) return { settler: settlers[Math.floor(Math.random() * Math.min(6, settlers.length))], msg: guide.hint };
            return null;
          }
          function performFateRoll() {
            var buildingBonus = Math.min(15, buildings.length * 2);
            if (buildings.indexOf('shield') >= 0) buildingBonus += 5;
            if (buildings.indexOf('lab') >= 0) buildingBonus += 3;
            var raw = Math.floor(Math.random() * 100) + 1;
            var modified = Math.min(100, raw + buildingBonus);
            var result = fateTable.find(function(f) { return modified >= f.min && modified <= f.max; }) || fateTable[3];
            return { raw: raw, modified: modified, bonus: buildingBonus, result: result };
          }
          function spendAP(cost) {
            if (actionPoints < cost) { if (addToast) addToast('Not enough Action Points!', 'error'); return false; }
            upd('actionPoints', actionPoints - cost); return true;
          }
          function generatePickups(tiles) {
            var pk = {};
            for (var pi = 0; pi < tiles.length; pi++) {
              if (tiles[pi].type === 'colony') continue;
              var rx = pi % mapSize, ry = Math.floor(pi / mapSize);
              if (Math.random() < 0.07) {
                var loot = lootByTerrain[tiles[pi].type] || lootByTerrain.plains;
                var rr = Math.random();
                pk[rx + ',' + ry] = rr < 0.05 ? Object.assign({ rarity: 'epic' }, loot.epic) : rr < 0.25 ? Object.assign({ rarity: 'rare' }, loot.rare) : Object.assign({ rarity: 'common' }, loot.common);
              }
            }
            return pk;
          }

          // ── Rover & Exploration Units ──
          var rovers = d.colonyRovers || [];
          var selectedRover = d.selectedRover || null;
          var roverDefs = [
            { type: 'scout', name: 'Scout Rover', icon: '\uD83D\uDE99', vision: 5, maxMoves: 6, maxFuel: 20, cost: { materials: 8, energy: 5 }, desc: 'Fast recon. 5-tile vision, 6 moves/turn.', color: '#22d3ee' },
            { type: 'heavy', name: 'Heavy Rover', icon: '\uD83D\uDE9B', vision: 3, maxMoves: 2, maxFuel: 14, cost: { materials: 15, energy: 10 }, desc: 'Slow but can build outposts. 3-tile vision.', color: '#f97316' },
            { type: 'science', name: 'Science Rover', icon: '\uD83D\uDD2C', vision: 4, maxMoves: 4, maxFuel: 16, cost: { materials: 12, science: 8 }, desc: 'Auto-collects +2 science/turn from terrain. 4-tile vision.', color: '#a78bfa' }
          ];
          function getRoverDef(type) { return roverDefs.find(function (rd) { return rd.type === type; }) || roverDefs[0]; }
          function buildRover(type) {
            var def = getRoverDef(type);
            var nr = Object.assign({}, resources);
            var canAfford = true;
            Object.keys(def.cost).forEach(function (k) { if ((nr[k] || 0) < def.cost[k]) canAfford = false; });
            if (!canAfford) { if (addToast) addToast('Not enough resources!', 'error'); return; }
            Object.keys(def.cost).forEach(function (k) { nr[k] -= def.cost[k]; });
            upd('colonyRes', nr);
            var cx = mapData ? mapData.colonyPos.x : 6;
            var cy = mapData ? mapData.colonyPos.y : 6;
            var newRover = { id: 'rv_' + Date.now(), type: type, x: cx, y: cy, fuel: def.maxFuel, movesLeft: def.maxMoves, status: 'idle' };
            var nrvs = rovers.slice(); nrvs.push(newRover); upd('colonyRovers', nrvs);
            if (addToast) addToast(def.icon + ' ' + def.name + ' deployed!', 'success');
            if (typeof addXP === 'function') addXP(5, 'Rover deployed: ' + def.name);
            var nl = gameLog.slice(); nl.push(def.icon + ' ' + def.name + ' deployed at colony.'); upd('colonyLog', nl);
          }
          function moveRover(roverId, tx, ty) {
            var rv = rovers.find(function (r) { return r.id === roverId; });
            if (!rv || rv.movesLeft <= 0 || rv.fuel <= 0) return;
            var dist = Math.abs(tx - rv.x) + Math.abs(ty - rv.y);
            if (dist > rv.movesLeft || dist > rv.fuel) return;
            var def = getRoverDef(rv.type);
            // Move the rover
            var nrvs = rovers.map(function (r) {
              if (r.id !== roverId) return r;
              return Object.assign({}, r, { x: tx, y: ty, movesLeft: r.movesLeft - dist, fuel: r.fuel - dist, status: 'moved' });
            });
            upd('colonyRovers', nrvs);
            // Explore tiles in vision radius
            if (mapData) {
              var nm = JSON.parse(JSON.stringify(mapData));
              var vis = def.vision;
              var explored2 = 0;
              for (var dy = -vis; dy <= vis; dy++) {
                for (var dx = -vis; dx <= vis; dx++) {
                  if (Math.abs(dx) + Math.abs(dy) > vis + 1) continue; // diamond shape
                  var ni = (ty + dy) * mapSize + (tx + dx);
                  if (ni >= 0 && ni < nm.tiles.length && tx + dx >= 0 && tx + dx < mapSize && ty + dy >= 0 && ty + dy < mapSize) {
                    if (!nm.tiles[ni].explored) { nm.tiles[ni].explored = true; explored2++; }
                  }
                }
              }
              upd('colonyMap', nm);
              if (explored2 > 0) {
                if (addToast) addToast(def.icon + ' Revealed ' + explored2 + ' new tiles!', 'info');
                var ns = Object.assign({}, stats); ns.tilesExplored = (ns.tilesExplored || 0) + explored2; upd('colonyStats', ns);
              }
            }
          }
          function refuelRover(roverId) {
            var rv = rovers.find(function (r) { return r.id === roverId; });
            if (!rv) return;
            var def = getRoverDef(rv.type);
            if (rv.fuel >= def.maxFuel) { if (addToast) addToast('Already full fuel!', 'info'); return; }
            var nr = Object.assign({}, resources);
            if (nr.energy < 3) { if (addToast) addToast('Need 3 energy to refuel!', 'error'); return; }
            nr.energy -= 3; upd('colonyRes', nr);
            var nrvs = rovers.map(function (r) {
              if (r.id !== roverId) return r;
              return Object.assign({}, r, { fuel: Math.min(def.maxFuel, r.fuel + 4) });
            });
            upd('colonyRovers', nrvs);
            if (addToast) addToast('Refueled! +4 fuel', 'success');
          }
          function roverBuildOutpost(roverId) {
            var rv = rovers.find(function (r) { return r.id === roverId; });
            if (!rv || rv.type !== 'heavy') return;
            var tKey = rv.x + ',' + rv.y;
            if (tileImprovements[tKey]) { if (addToast) addToast('Outpost already here!', 'info'); return; }
            var nr = Object.assign({}, resources);
            if (nr.materials < 10) { if (addToast) addToast('Need 10 materials!', 'error'); return; }
            nr.materials -= 10; upd('colonyRes', nr);
            var tile = mapData ? mapData.tiles[rv.y * mapSize + rv.x] : null;
            var newTI = Object.assign({}, tileImprovements);
            newTI[tKey] = { res: tile ? tile.res : 'materials', name: tile ? tile.name : 'Outpost', x: rv.x, y: rv.y };
            upd('tileImprovements', newTI);
            if (addToast) addToast('\uD83C\uDFD7\uFE0F Outpost established!', 'success');
            if (typeof addXP === 'function') addXP(15, 'Outpost built at (' + rv.x + ',' + rv.y + ')');
            var nl = gameLog.slice(); nl.push('\uD83C\uDFD7\uFE0F Outpost built at (' + rv.x + ',' + rv.y + ')'); upd('colonyLog', nl);
            // Explore around outpost
            if (mapData) {
              var nm = JSON.parse(JSON.stringify(mapData));
              for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) {
                var ni = (rv.y + dy) * mapSize + (rv.x + dx);
                if (ni >= 0 && ni < nm.tiles.length) nm.tiles[ni].explored = true;
              }
              upd('colonyMap', nm);
            }
          }

          // Civilization Mechanics
          var era = d.colonyEra || 'survival';
          var eraData = {
            survival: { name: 'Survival', icon: '\u26A0\uFE0F', next: 'expansion', req: 'Build 3 buildings', color: '#ef4444' },
            expansion: { name: 'Expansion', icon: '\uD83C\uDF10', next: 'prosperity', req: 'Build 6 buildings + 50% terraform', color: '#f59e0b' },
            prosperity: { name: 'Prosperity', icon: '\uD83C\uDF1F', next: 'transcendence', req: 'All 10 buildings + 75% terraform', color: '#22c55e' },
            transcendence: { name: 'Transcendence', icon: '\uD83D\uDE80', next: null, req: 'Victory!', color: '#8b5cf6' }
          };
          var currentEra = eraData[era] || eraData.survival;

          var activePolicy = d.colonyPolicy || null;
          var policyDefs = [
            { id: 'militarist', name: 'Frontier Expansion', icon: '\uD83D\uDEE1\uFE0F', desc: 'Exploration costs 0 energy. +1 materials/turn.', effect: { exploreFreeCost: true, materialBonus: 1 } },
            { id: 'scientific', name: 'Knowledge First', icon: '\uD83E\uDDEC', desc: '+50% science production. +5 XP per question.', effect: { scienceMultiplier: 1.5, xpBonus: 5 } },
            { id: 'agrarian', name: 'Colony Welfare', icon: '\uD83C\uDF3E', desc: '+2 food/turn. New settlers arrive 50% faster.', effect: { foodBonus: 2, popGrowthBonus: 0.5 } },
            { id: 'industrial', name: 'Heavy Industry', icon: '\u2699\uFE0F', desc: 'Buildings cost 20% fewer materials. +2 energy/turn.', effect: { buildDiscount: 0.2, energyBonus: 2 } }
          ];

          var researchQueue = d.colonyResearch || [];
          var researchDefs = [
            { id: 'xenobiology', name: 'Xenobiology', icon: '\uD83E\uDDA0', cost: 15, desc: 'Study alien life. +3 food & water/turn.', bonus: { food: 3, water: 3 }, era: 'expansion', domain: 'biology' },
            { id: 'gravimetrics', name: 'Gravimetrics', icon: '\uD83C\uDF0C', cost: 20, desc: 'Map gravity wells. All exploration reveals +1 tile radius.', bonus: { exploreRadius: 2 }, era: 'expansion', domain: 'physics' },
            { id: 'nanotech', name: 'Nanotechnology', icon: '\uD83E\uDDF2', cost: 25, desc: 'Self-repairing buildings. Effectiveness never drops below 75%.', bonus: { minEfficiency: 75 }, era: 'prosperity', domain: 'chemistry' },
            { id: 'terraAI', name: 'Terraform AI', icon: '\uD83E\uDD16', cost: 30, desc: 'AI-guided terraforming. +3% terraform/turn base.', bonus: { terraformBonus: 3 }, era: 'prosperity', domain: 'math' },
            { id: 'warpComms', name: 'Subspace Comms', icon: '\uD83D\uDCE1', cost: 40, desc: 'FTL communication with Earth. +10 science/turn.', bonus: { science: 10 }, era: 'transcendence', domain: 'physics' },
            { id: 'bioengine', name: 'Bioengineering', icon: '\uD83E\uDDEC', cost: 18, desc: 'Genetically adapted crops for alien soil. +5 food/turn.', bonus: { food: 5 }, era: 'expansion', domain: 'biology' },
            { id: 'quantumComp', name: 'Quantum Computing', icon: '\uD83D\uDDA5\uFE0F', cost: 35, desc: 'Quantum processors for colony AI. +5 science/turn.', bonus: { science: 5 }, era: 'prosperity', domain: 'physics' },
            { id: 'plasmaDrill', name: 'Plasma Mining', icon: '\u26CF\uFE0F', cost: 22, desc: 'Superheated plasma drills. +5 materials/turn.', bonus: { materials: 5 }, era: 'expansion', domain: 'chemistry' },
            { id: 'cryonics', name: 'Cryogenic Storage', icon: '\u2744\uFE0F', cost: 28, desc: 'Preserve food indefinitely. +3 food, +3 water/turn.', bonus: { food: 3, water: 3 }, era: 'prosperity', domain: 'biology' },
            { id: 'dysonSwarm', name: 'Dyson Swarm', icon: '\u2600\uFE0F', cost: 50, desc: 'Orbital solar collectors. +15 energy/turn.', bonus: { energy: 15 }, era: 'transcendence', domain: 'physics' }
          ];

          var greatScientists = d.colonyGreatSci || [];
          var greatSciDefs = [
            { name: 'Marie Curie', icon: '\u2622\uFE0F', specialty: 'physics', bonus: 'energy', amount: 5, fact: 'Discovered radioactivity and won 2 Nobel Prizes in different sciences.' },
            { name: 'Charles Darwin', icon: '\uD83E\uDD86', specialty: 'biology', bonus: 'science', amount: 5, fact: 'Theory of evolution by natural selection revolutionized biology.' },
            { name: 'Nikola Tesla', icon: '\u26A1', specialty: 'physics', bonus: 'energy', amount: 8, fact: 'Pioneered alternating current (AC) electricity used worldwide today.' },
            { name: 'Rosalind Franklin', icon: '\uD83E\uDDEC', specialty: 'chemistry', bonus: 'science', amount: 5, fact: 'Her X-ray crystallography was key to discovering DNA\'s structure.' },
            { name: 'Ada Lovelace', icon: '\uD83D\uDCBB', specialty: 'math', bonus: 'science', amount: 8, fact: 'Wrote the world\'s first computer program in the 1840s.' },
            { name: 'Galileo Galilei', icon: '\uD83D\uDD2D', specialty: 'physics', bonus: 'science', amount: 5, fact: 'Father of modern observational astronomy. Proved heliocentrism.' },
            { name: 'Rachel Carson', icon: '\uD83C\uDF3F', specialty: 'biology', bonus: 'water', amount: 5, fact: 'Silent Spring launched the modern environmental movement in 1962.' },
            { name: 'Albert Einstein', icon: '\uD83C\uDF0C', specialty: 'physics', bonus: 'energy', amount: 10, fact: 'E=mc\u00B2 showed mass and energy are interchangeable. Revolutionized physics forever.' },
            { name: 'Mae Jemison', icon: '\uD83D\uDE80', specialty: 'biology', bonus: 'science', amount: 8, fact: 'First African-American woman in space (1992). Also a physician and engineer.' },
            { name: 'Dmitri Mendeleev', icon: '\uD83E\uDDEA', specialty: 'chemistry', bonus: 'materials', amount: 8, fact: 'Created the Periodic Table, predicting undiscovered elements by their properties.' },
            { name: 'Wangari Maathai', icon: '\uD83C\uDF33', specialty: 'biology', bonus: 'food', amount: 6, fact: 'Kenyan environmentalist who planted 51 million trees via the Green Belt Movement. First African woman to win the Nobel Peace Prize.' },
            { name: 'Jagadish Chandra Bose', icon: '\uD83D\uDCE1', specialty: 'physics', bonus: 'science', amount: 8, fact: 'Indian polymath who proved plants have feelings, pioneered radio science, and invented the crescograph to measure plant growth.' },
            { name: 'Maryam Mirzakhani', icon: '\uD83C\uDF00', specialty: 'math', bonus: 'science', amount: 10, fact: 'First woman and first Iranian to win the Fields Medal \u2014 the Nobel Prize of mathematics \u2014 for work on curved surfaces.' },
            { name: 'Srinivasa Ramanujan', icon: '\u221E', specialty: 'math', bonus: 'science', amount: 8, fact: 'Self-taught Indian genius who discovered over 3,900 mathematical identities. His notebooks still yield new theorems today.' }
          ];

          var popGrowthAccum = d.colonyPopGrowth || 0;

          // Diplomacy — alien species
          var alienContact = d.alienContact || null;
          var alienRelations = d.alienRelations || 0; // -100 to 100
          var alienDefs = {
            name: 'The Keth\u2019ora',
            icon: '\uD83D\uDC7E',
            desc: 'Silicon-based lifeforms indigenous to Kepler-442b. Communicate through bioluminescent patterns.',
            trades: [
              { give: { materials: 10 }, get: { science: 8 }, name: 'Knowledge Exchange' },
              { give: { food: 8 }, get: { materials: 12 }, name: 'Organic Trade' },
              { give: { energy: 10 }, get: { water: 15 }, name: 'Ice Mining Rights' }
            ]
          };
          var colonyHappiness = d.colonyHappiness || 70;

          // Wonders — mega-structures
          var wonders = d.colonyWonders || {};
          var wonderDefs = [
            {
              id: 'terraformEngine', name: 'Planetary Terraform Engine', icon: '\uD83C\uDF0D', challenges: 3, domain: 'chemistry',
              desc: 'Planet-scale atmospheric converter. +5% terraform/turn permanently.', effect: { terraformBonus: 5 },
              cost: { materials: 80, energy: 50, science: 40, water: 30 }, era: 'prosperity'
            },
            {
              id: 'arkVault', name: 'Genetic Ark Vault', icon: '\uD83E\uDDEC', challenges: 3, domain: 'biology',
              desc: 'Preserves 10,000 species from Earth. +8 food, +5 science/turn.', effect: { food: 8, science: 5 },
              cost: { materials: 60, science: 50, water: 25, food: 20 }, era: 'prosperity'
            },
            {
              id: 'quantumGate', name: 'Quantum Gate', icon: '\uD83D\uDD73\uFE0F', challenges: 3, domain: 'physics',
              desc: 'Wormhole to Earth. Instant communication & settler transfer. +20 pop growth.', effect: { popBoost: true, science: 10 },
              cost: { materials: 100, energy: 80, science: 60 }, era: 'transcendence'
            }
          ];

          // Expeditions
          var expeditions = d.colonyExpeditions || [];
          var activeExpedition = d.activeExpedition || null;

          // Science Journal
          var scienceJournal = d.scienceJournal || [];

          // Tile improvements
          var tileImprovements = d.tileImprovements || {};

          // Equity & Culture Systems
          var equity = d.colonyEquity || 75; // 0-100, higher = more equitable
          var colonyValues = d.colonyValues || { collectivism: 50, innovation: 50, ecology: 50, tradition: 50, openness: 50 };
          var dilemmaLog = d.dilemmaLog || [];

          // Cultural Knowledge Traditions
          var traditions = d.colonyTraditions || [];

          // Colony Radio
          var radioMessage = d.colonyRadio || null;

          // Colony Name
          var colonyName = d.colonyName || 'New Kepler';

          // Achievements
          var achievements = d.colonyAchievements || {};
          var achievementDefs = [
            { id: 'firstBuild', name: 'Foundation Stone', icon: '\uD83C\uDFD7\uFE0F', desc: 'Build your first structure.', check: function () { return buildings.length >= 1; } },
            { id: 'fiveBuild', name: 'Growing Pains', icon: '\uD83C\uDFD8\uFE0F', desc: 'Build 5 structures.', check: function () { return buildings.length >= 5; } },
            { id: 'tenBuild', name: 'City Planner', icon: '\uD83C\uDFD9\uFE0F', desc: 'Build 10 structures.', check: function () { return buildings.length >= 10; } },
            { id: 'allBuild', name: 'Master Builder', icon: '\uD83C\uDFDF\uFE0F', desc: 'Build all 16 structures.', check: function () { return buildings.length >= 16; } },
            { id: 'pop10', name: 'Small Town', icon: '\uD83D\uDC65', desc: 'Reach 10 settlers.', check: function () { return settlers.length >= 10; } },
            { id: 'pop25', name: 'Borough', icon: '\uD83C\uDFD8\uFE0F', desc: 'Reach 25 settlers.', check: function () { return settlers.length >= 25; } },
            { id: 'pop50', name: 'Metropolis', icon: '\uD83C\uDFD9\uFE0F', desc: 'Win by population!', check: function () { return settlers.length >= 50; } },
            { id: 'tf25', name: 'Green Shoots', icon: '\uD83C\uDF31', desc: '25% terraformed.', check: function () { return terraform >= 25; } },
            { id: 'tf50', name: 'Halfway Home', icon: '\uD83C\uDF0D', desc: '50% terraformed.', check: function () { return terraform >= 50; } },
            { id: 'tf100', name: 'New Earth', icon: '\uD83C\uDF0E', desc: '100% terraformed! Victory!', check: function () { return terraform >= 100; } },
            { id: 'res3', name: 'Curious Mind', icon: '\uD83D\uDD2C', desc: 'Complete 3 research techs.', check: function () { return researchQueue.length >= 3; } },
            { id: 'res7', name: 'Renaissance', icon: '\uD83D\uDCDA', desc: 'Complete 7 research techs.', check: function () { return researchQueue.length >= 7; } },
            { id: 'res10', name: 'Omniscient', icon: '\uD83E\uDDE0', desc: 'Complete all 10! Victory!', check: function () { return researchQueue.length >= 10; } },
            { id: 'explore15', name: 'Cartographer', icon: '\uD83D\uDDFA\uFE0F', desc: 'Explore 15 tiles.', check: function () { return stats.tilesExplored >= 15; } },
            { id: 'exploreAll', name: 'World Walker', icon: '\uD83C\uDF0F', desc: 'Explore all tiles.', check: function () { return stats.tilesExplored >= mapSize * mapSize; } },
            { id: 'science100', name: 'Knowledge Hoard', icon: '\uD83D\uDCDA', desc: 'Accumulate 100+ science.', check: function () { return resources.science >= 100; } },
            { id: 'journal10', name: 'Studious', icon: '\uD83D\uDCD6', desc: '10 science journal entries.', check: function () { return scienceJournal.length >= 10; } },
            { id: 'journal25', name: 'Scholar', icon: '\uD83C\uDF93', desc: '25 science journal entries.', check: function () { return scienceJournal.length >= 25; } },
            { id: 'tradition3', name: 'Cultural Mosaic', icon: '\uD83C\uDF10', desc: 'Adopt 3 cultural traditions.', check: function () { return traditions.length >= 3; } },
            { id: 'equityHigh', name: 'Just Society', icon: '\u2696\uFE0F', desc: 'Maintain equity above 85%.', check: function () { return equity >= 85; } },
            { id: 'happyMax', name: 'Utopia', icon: '\uD83D\uDE04', desc: 'Reach 100% happiness.', check: function () { return colonyHappiness >= 100; } },
            { id: 'alienFriend', name: 'Diplomat', icon: '\uD83D\uDC7E', desc: 'Allied with the Keth\u2019ora.', check: function () { return alienRelations >= 50; } },
            { id: 'wonder1', name: 'Wonderous', icon: '\uD83C\uDFDB\uFE0F', desc: 'Complete a Wonder.', check: function () { return wonders.terraformEngine || wonders.arkVault || wonders.quantumGate; } },
            { id: 'mentor5', name: 'Awakener', icon: '\uD83E\uDD16', desc: 'Activate 5 Digital Mentors.', check: function () { return greatScientists.length >= 5; } },
            { id: 'turn50', name: 'Endurance', icon: '\u23F0', desc: 'Survive 50 turns.', check: function () { return turn >= 50; } },
            { id: 'perfect10', name: 'Perfect 10', icon: '\uD83C\uDFAF', desc: 'Answer 10 questions correctly in a row.', check: function () { return stats.streak >= 10; } }
          ];
          var traditionDefs = [
            {
              id: 'ubuntu', name: 'Ubuntu Philosophy', origin: 'Southern African', icon: '\uD83E\uDD1D', desc: '"I am because we are." Community-centered decision making. +10 equity, +5 happiness.',
              bonus: { equity: 10, happiness: 5 }, value: 'collectivism', fact: 'Ubuntu is a Nguni Bantu concept meaning shared humanity. Archbishop Desmond Tutu described it as knowing you belong in a greater whole.'
            },
            {
              id: 'kintsugi', name: 'Kintsugi Resilience', origin: 'Japanese', icon: '\uD83C\uDFFA', desc: 'Golden repair \u2014 finding strength in imperfection. Buildings regain 10% effectiveness each turn.',
              bonus: { repair: 10 }, value: 'tradition', fact: 'Kintsugi is the Japanese art of repairing broken pottery with gold. It embraces flaws as part of history rather than something to hide.'
            },
            {
              id: 'milpa', name: 'Three Sisters Agriculture', origin: 'Mesoamerican / Indigenous', icon: '\uD83C\uDF3D', desc: 'Corn, beans, squash companion planting. +6 food/turn, +2% terraform.',
              bonus: { food: 6, terraform: 2 }, value: 'ecology', fact: 'The Three Sisters (corn, beans, squash) is an Indigenous agricultural system where each plant benefits the others \u2014 corn provides structure, beans fix nitrogen, squash shades soil.'
            },
            {
              id: 'sankofa', name: 'Sankofa Wisdom', origin: 'Akan / West African', icon: '\uD83D\uDD4A\uFE0F', desc: '"Go back and get it." Learning from the past to build the future. +8 science/turn.',
              bonus: { science: 8 }, value: 'tradition', fact: 'Sankofa is an Adinkra symbol meaning "it is not taboo to go back for what you forgot." It teaches that wisdom from the past is essential for progress.'
            },
            {
              id: 'ayni', name: 'Ayni Reciprocity', origin: 'Andean / Quechua', icon: '\uD83C\uDFD4\uFE0F', desc: 'Sacred reciprocity with the land. +5 water, +5 materials, +3% terraform.',
              bonus: { water: 5, materials: 5, terraform: 3 }, value: 'ecology', fact: 'Ayni is the Andean principle of reciprocity \u2014 every exchange with nature or community must be balanced. The Inca built their entire economy on this concept.'
            },
            {
              id: 'griot', name: 'Griot Oral Tradition', origin: 'West African', icon: '\uD83C\uDFB6', desc: 'Storytelling preserves knowledge across generations. +10 science, +5 happiness.',
              bonus: { science: 10, happiness: 5 }, value: 'openness', fact: 'Griots are West African historians, storytellers, and musicians who preserve knowledge orally. Some griot lineages stretch back over 800 years.'
            },
            {
              id: 'whakapapa', name: 'Whakapapa Genealogy', origin: 'M\u0101ori / Polynesian', icon: '\uD83C\uDF0A', desc: 'Ancestral connection to land and sea. +5 water, +8 food, stronger settler bonds.',
              bonus: { water: 5, food: 8 }, value: 'collectivism', fact: 'Whakapapa is the M\u0101ori concept of genealogical connection \u2014 linking people to ancestors, the land, and even the stars. It underpins Polynesian navigation.'
            },
            {
              id: 'dreamtime', name: 'Songlines Navigation', origin: 'Aboriginal Australian', icon: '\u2B50', desc: 'Ancient wayfinding through story and song. Expeditions complete 1 turn faster.',
              bonus: { expeditionSpeed: 1 }, value: 'tradition', fact: 'Aboriginal Songlines are navigational paths across Australia encoded in songs, stories, and art. Some Songlines are over 10,000 years old \u2014 among the oldest knowledge systems on Earth.'
            }
          ];
          var buildingEff = d.buildingEff || {}; // { buildingId: 100, ... } effectiveness %
          var lastMaintTurn = d.lastMaintTurn || 0;
          var maintChallenge = d.maintChallenge || null;
          var colonyName = d.colonyName || 'New Kepler';

          // ── Planetary Seasons (4 seasons, each lasts 10 turns) ──
          var seasonDefs = [
            { id: 'bloom', name: 'Bloom Season', icon: '\uD83C\uDF3C', desc: 'Alien flora flourishes. +2 food/turn.', effect: { food: 2 } },
            { id: 'dry', name: 'Dry Season', icon: '\uD83C\uDF35', desc: 'Arid conditions. Energy production up, water down.', effect: { energy: 2, water: -1 } },
            { id: 'storm', name: 'Storm Season', icon: '\u26C8\uFE0F', desc: 'Electromagnetic storms. Science surges, buildings at risk.', effect: { science: 3, damageRisk: true } },
            { id: 'calm', name: 'Calm Season', icon: '\u2728', desc: 'Stable conditions. All production normal.', effect: {} }
          ];
          var seasonIndex2 = Math.floor((turn % 40) / 10); // 4 seasons × 10 turns each = 40-turn cycle
          var seasonCycle = { id: seasonDefs[seasonIndex2].id, index: seasonIndex2, turnsLeft: 10 - (turn % 10) };

          // TTS helper — prefers Kokoro TTS when available, falls back to browser TTS
          function colonySpeak(text2, voice) {
            if (!text2) return;
            // Try Kokoro TTS first (async, fire-and-forget for narration)
            if (window._kokoroTTS) {
              try {
                window._kokoroTTS.speak(text2, null, 0.95).then(function (url) {
                  if (url) {
                    var audio = new Audio(url);
                    audio.playbackRate = 0.95;
                    audio.volume = 0.8;
                    audio.play().catch(function (e) { console.warn('[Colony TTS] Kokoro playback failed:', e); });
                  }
                }).catch(function (e) { console.warn('[Colony TTS] Kokoro generation failed:', e); });
                return; // Kokoro will handle it
              } catch (e) { console.warn('[Colony TTS] Kokoro exception:', e); }
            }
            // Browser TTS fallback — only when Kokoro is not available
            if (!window.speechSynthesis) return;
            window.speechSynthesis.cancel();
            var utter = new SpeechSynthesisUtterance(text2);
            utter.rate = 0.95; utter.pitch = voice === 'narrator' ? 0.8 : voice === 'female' ? 1.2 : 1.0;
            utter.volume = 0.8;
            var voices = window.speechSynthesis.getVoices();
            if (voice === 'narrator') {
              var deep = voices.find(function (v) { return v.name.indexOf('Male') >= 0 || v.name.indexOf('David') >= 0 || v.name.indexOf('Daniel') >= 0; });
              if (deep) utter.voice = deep;
            } else if (voice === 'female') {
              var fem = voices.find(function (v) { return v.name.indexOf('Female') >= 0 || v.name.indexOf('Zira') >= 0 || v.name.indexOf('Samantha') >= 0; });
              if (fem) utter.voice = fem;
            }
            window.speechSynthesis.speak(utter);
          }

          var terrainTypes = [
            { type: 'plains', color: '#4ade80', name: 'Fertile Plains', icon: '\uD83C\uDF3F', res: 'food' },
            { type: 'mountain', color: '#94a3b8', name: 'Mountains', icon: '\uD83C\uDFD4\uFE0F', res: 'materials' },
            { type: 'volcanic', color: '#f97316', name: 'Volcanic', icon: '\uD83C\uDF0B', res: 'energy' },
            { type: 'ice', color: '#a5f3fc', name: 'Ice Fields', icon: '\u2744\uFE0F', res: 'water' },
            { type: 'desert', color: '#fbbf24', name: 'Desert', icon: '\uD83C\uDFDC\uFE0F', res: 'materials' },
            { type: 'ocean', color: '#3b82f6', name: 'Ocean', icon: '\uD83C\uDF0A', res: 'water' },
            { type: 'radiation', color: '#a855f7', name: 'Radiation Zone', icon: '\u2622\uFE0F', res: 'science' }
          ];

          function generateMap() {
            var tiles = [];
            var s = Math.floor(Math.random() * 99999);
            for (var y = 0; y < mapSize; y++) {
              for (var x = 0; x < mapSize; x++) {
                s = (s * 9301 + 49297) % 233280;
                var r = s / 233280;
                var tIdx = r < 0.25 ? 0 : r < 0.40 ? 1 : r < 0.50 ? 2 : r < 0.62 ? 3 : r < 0.72 ? 4 : r < 0.88 ? 5 : 6;
                var t2 = terrainTypes[tIdx];
                tiles.push({ x: x, y: y, type: t2.type, color: t2.color, name: t2.name, icon: t2.icon, res: t2.res, explored: false, hasAnomaly: r > 0.88 });
              }
            }
            var cx = Math.floor(mapSize / 2); var cy = Math.floor(mapSize / 2);
            tiles[cy * mapSize + cx] = { x: cx, y: cy, type: 'colony', color: '#f1f5f9', name: 'Colony Base', icon: '\uD83C\uDFE0', res: 'none', explored: true, hasAnomaly: false };
            for (var dy = -5; dy <= 5; dy++) for (var dx = -5; dx <= 5; dx++) {
              var ni = (cy + dy) * mapSize + (cx + dx);
              if (ni >= 0 && ni < tiles.length) tiles[ni].explored = true;
            }
            return { tiles: tiles, colonyPos: { x: cx, y: cy } };
          }

          var defaultSettlers = [
            { name: 'Dr. Elena Vasquez', role: 'Botanist', icon: '\uD83C\uDF31', specialty: 'biology', morale: 80, health: 100 },
            { name: 'Cmdr. James Chen', role: 'Engineer', icon: '\u2699\uFE0F', specialty: 'physics', morale: 85, health: 100 },
            { name: 'Dr. Aisha Okafor', role: 'Geologist', icon: '\u26CF\uFE0F', specialty: 'geology', morale: 75, health: 100 },
            { name: 'Dr. Yuki Tanaka', role: 'Medic', icon: '\uD83E\uDE7A', specialty: 'biology', morale: 90, health: 100 },
            { name: 'Prof. Raj Patel', role: 'Physicist', icon: '\u269B\uFE0F', specialty: 'physics', morale: 70, health: 100 },
            { name: 'Dr. Marta Schmidt', role: 'Chemist', icon: '\uD83E\uDDEA', specialty: 'chemistry', morale: 82, health: 100 }
          ];

          var buildingDefs = [
            // Tier 1 — No prerequisites
            { id: 'hydroponics', name: 'Hydroponics Bay', icon: '\uD83C\uDF31', tier: 1, requires: [], cost: { materials: 15, energy: 5 }, production: { food: 3 }, gate: 'biology', gateQ: 'What process do plants use to convert light energy into chemical energy?', gateA: 'photosynthesis', desc: 'Grows food using nutrient-rich water. Photosynthesis converts CO\u2082 and water into glucose using light.' },
            { id: 'solar', name: 'Solar Array', icon: '\u2600\uFE0F', tier: 1, requires: [], cost: { materials: 10, science: 5 }, production: { energy: 3 }, gate: 'physics', gateQ: 'What particles of light does a solar panel absorb to generate electricity?', gateA: 'photon', desc: 'Converts stellar radiation into power via the photoelectric effect.' },
            { id: 'waterReclaim', name: 'Water Reclaimer', icon: '\uD83D\uDCA7', tier: 1, requires: [], cost: { materials: 12, energy: 5 }, production: { water: 3 }, gate: 'chemistry', gateQ: 'What is the chemical formula for water?', gateA: 'h2o', desc: 'Extracts water from ice and atmosphere via distillation and filtration.' },
            { id: 'mine', name: 'Mining Rig', icon: '\u26CF\uFE0F', tier: 1, requires: [], cost: { energy: 10, water: 5 }, production: { materials: 3 }, gate: 'geology', gateQ: 'Name one of the three main types of rocks (igneous, sedimentary, or metamorphic)', gateA: ['igneous', 'sedimentary', 'metamorphic'], desc: 'Drills into planetary crust to extract minerals and metals.' },
            // Tier 2 — Requires 2 Tier 1 buildings
            { id: 'lab', name: 'Research Lab', icon: '\uD83D\uDD2C', tier: 2, requires: ['solar', 'mine'], cost: { materials: 20, energy: 10 }, production: { science: 3 }, gate: 'math', gateQ: 'What is the value of pi to 2 decimal places?', gateA: '3.14', desc: 'Conducts experiments and data analysis. Requires stable power and materials.' },
            { id: 'medbay', name: 'Med Bay', icon: '\uD83C\uDFE5', tier: 2, requires: ['hydroponics', 'waterReclaim'], cost: { materials: 15, science: 10 }, production: {}, gate: 'biology', gateQ: 'What are the basic structural units of all living organisms?', gateA: 'cell', desc: 'Heals settlers (+10 health/turn). Needs food & water infrastructure first.' },
            // Tier 3 — Requires Tier 2 buildings
            { id: 'atmo', name: 'Atmospheric Processor', icon: '\uD83C\uDF2C\uFE0F', tier: 3, requires: ['lab', 'waterReclaim'], cost: { materials: 25, energy: 15, science: 10 }, production: { water: 1, food: 1 }, gate: 'chemistry', gateQ: 'What gas makes up about 78% of Earth\'s atmosphere?', gateA: 'nitrogen', desc: 'Converts alien atmosphere. +5% terraforming per turn.' },
            { id: 'fusion', name: 'Fusion Reactor', icon: '\u2622\uFE0F', tier: 3, requires: ['lab', 'solar'], cost: { materials: 30, science: 20 }, production: { energy: 10 }, gate: 'physics', gateQ: 'In E=mc\u00B2, what does the \'m\' stand for?', gateA: 'mass', desc: 'Fuses hydrogen isotopes for massive energy. The ultimate power source.' },
            // Tier 4 — Victory building
            { id: 'biodome', name: 'Biodome', icon: '\uD83C\uDF0D', tier: 4, requires: ['atmo', 'fusion', 'medbay'], cost: { materials: 50, energy: 30, science: 25, water: 20 }, production: { food: 5, water: 2 }, gate: 'ecology', gateQ: 'What is the term for a self-sustaining ecological system that recycles nutrients and energy?', gateA: ['ecosystem', 'biosphere', 'closed ecosystem'], desc: 'Self-sustaining biosphere. Build this to achieve COLONY VICTORY!' },
            { id: 'comms', name: 'Deep Space Comms', icon: '\uD83D\uDCE1', tier: 4, requires: ['fusion', 'lab'], cost: { materials: 40, energy: 25, science: 30 }, production: { science: 5 }, gate: 'physics', gateQ: 'What is the speed of light in km/s (approximately)?', gateA: ['300000', '3e5', '300,000'], desc: 'Contacts Earth! Signal takes 1,206 years to arrive. Massive science boost.' },
            // Tier 2 Additions
            { id: 'greenhouse', name: 'Greenhouse Dome', icon: '\uD83C\uDFE1', tier: 2, requires: ['hydroponics', 'waterReclaim'], cost: { materials: 18, water: 10 }, production: { food: 4 }, gate: 'biology', gateQ: 'What is the greenhouse effect?', gateA: ['trap', 'heat', 'warm'], desc: 'Large-scale food production. +0.5% terraform/turn.' },
            { id: 'refinery', name: 'Material Refinery', icon: '\uD83C\uDFED', tier: 2, requires: ['mine', 'solar'], cost: { energy: 15, materials: 10 }, production: { materials: 5 }, gate: 'chemistry', gateQ: 'What is smelting?', gateA: ['melt', 'extract', 'ore'], desc: 'Refines raw ore into construction-grade materials.' },
            // Tier 3 Additions
            { id: 'cloning', name: 'Cloning Lab', icon: '\uD83E\uDDEC', tier: 3, requires: ['medbay', 'lab'], cost: { materials: 30, science: 20, energy: 15 }, production: { food: 2 }, gate: 'biology', gateQ: 'What is the name of the first cloned mammal?', gateA: ['dolly'], desc: 'Accelerates population growth. Clones food organisms.' },
            { id: 'shield', name: 'Planetary Shield', icon: '\uD83D\uDEE1\uFE0F', tier: 3, requires: ['fusion', 'atmo'], cost: { materials: 35, energy: 25, science: 15 }, production: { energy: 2 }, gate: 'physics', gateQ: 'What protects Earth from solar radiation?', gateA: ['magnetic', 'magnetosphere', 'field'], desc: 'Deflects solar flares & meteors. Reduces weather damage.' },
            { id: 'oceanSeeder', name: 'Ocean Seeder', icon: '\uD83C\uDF0A', tier: 3, requires: ['waterReclaim', 'atmo'], cost: { materials: 25, water: 15, science: 10 }, production: { water: 4, food: 2 }, gate: 'biology', gateQ: 'What process do phytoplankton use to produce oxygen?', gateA: ['photosynthesis'], desc: 'Seeds alien oceans with microbes. +1.5% terraform/turn.' },
            // Tier 4 Addition
            { id: 'spaceport', name: 'Spaceport', icon: '\uD83D\uDE80', tier: 4, requires: ['comms', 'fusion', 'shield'], cost: { materials: 60, energy: 40, science: 35 }, production: { materials: 5, science: 3 }, gate: 'physics', gateQ: 'What is escape velocity from Earth in km/s (approximately)?', gateA: ['11', '11.2'], desc: 'Launches supply missions. Attracts settlers from other colonies.' }
          ];

          // Canvas Map Rendering (non-hook: using global ref to avoid conditional hook)
          if (!window._spaceColonyCanvasRef) window._spaceColonyCanvasRef = { current: null };
          var canvasRef = window._spaceColonyCanvasRef;
          setTimeout(function () {
            if (!canvasRef.current || !mapData) return;
            var canvas = canvasRef.current;
            var ctx = canvas.getContext('2d');
            var w = canvas.width = canvas.offsetWidth;
            var h = canvas.height = Math.min(560, canvas.offsetWidth * 0.85);
            var animPhase = (Date.now() / 1000) % (Math.PI * 2);

            // Season-tinted background
            var seasonBGs = { bloom: '#0a1a0f', dry: '#1a0f0a', storm: '#0a0f1a', calm: '#0f172a' };
            var bgCol = seasonBGs[(seasonCycle || {}).id] || '#0f172a';
            ctx.fillStyle = bgCol; ctx.fillRect(0, 0, w, h);

            // Enhanced starfield with twinkling
            for (var si = 0; si < 120; si++) {
              var sx = (si * 7919 + 12345) % w; var sy = (si * 6271 + 54321) % h;
              var twinkle = 0.15 + Math.sin(animPhase + si * 0.5) * 0.15 + ((si * 31) % 8) * 0.06;
              var starSize = si < 10 ? 2.5 : si < 30 ? 2 : 1.5;
              ctx.fillStyle = si < 5 ? 'rgba(200,220,255,' + twinkle + ')' : 'rgba(255,255,255,' + twinkle + ')';
              ctx.beginPath(); ctx.arc(sx, sy, starSize / 2, 0, Math.PI * 2); ctx.fill();
            }

            // Nebula glow (season-colored)
            var nebulaColors = { bloom: 'rgba(34,197,94,0.03)', dry: 'rgba(234,179,8,0.03)', storm: 'rgba(59,130,246,0.04)', calm: 'rgba(139,92,246,0.03)' };
            var nebCol = nebulaColors[(seasonCycle || {}).id] || 'rgba(139,92,246,0.03)';
            var nebGrad = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.5);
            nebGrad.addColorStop(0, nebCol); nebGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = nebGrad; ctx.fillRect(0, 0, w, h);

            // Aurora Borealis effect
            if (terraform > 20) {
              var auroraIntensity = Math.min(1, terraform / 80);
              for (var ai = 0; ai < 5; ai++) {
                var ax = w * (ai + 0.5) / 5 + Math.sin(animPhase * 0.7 + ai * 2) * 30;
                var ay = 15 + Math.sin(animPhase * 0.5 + ai) * 8;
                var aGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, 60 + Math.sin(animPhase + ai) * 20);
                aGrad.addColorStop(0, 'rgba(34,211,238,' + (0.08 * auroraIntensity) + ')');
                aGrad.addColorStop(0.5, 'rgba(74,222,128,' + (0.04 * auroraIntensity) + ')');
                aGrad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = aGrad; ctx.fillRect(ax - 80, 0, 160, 50);
              }
            }

            var baseTile = 24;
            var tileSize = Math.max(4, Math.round(baseTile * colonyZoom));
            var visibleW = Math.ceil(w / tileSize) + 1;
            var visibleH = Math.ceil((h - 60) / tileSize) + 1;
            // Clamp camera so we don't scroll past map edges
            var maxCamX = Math.max(0, mapSize - visibleW + 1);
            var maxCamY = Math.max(0, mapSize - visibleH + 1);
            if (camX > maxCamX) { camX = maxCamX; upd('colonyCamX', camX); }
            if (camY > maxCamY) { camY = maxCamY; upd('colonyCamY', camY); }
            if (camX < 0) { camX = 0; upd('colonyCamX', 0); }
            if (camY < 0) { camY = 0; upd('colonyCamY', 0); }
            var offsetX = 0;
            var offsetY = 30;
            // Edge-scroll tick
            if (edgeScroll.active && (edgeScroll.dx !== 0 || edgeScroll.dy !== 0)) {
              var newCX = Math.max(0, Math.min(maxCamX, camX + edgeScroll.dx));
              var newCY = Math.max(0, Math.min(maxCamY, camY + edgeScroll.dy));
              if (newCX !== camX || newCY !== camY) {
                upd('colonyCamX', newCX); upd('colonyCamY', newCY);
              }
            }

            // Title bar with season + era badges
            var seasonIcons = { bloom: '\uD83C\uDF3C', dry: '\uD83C\uDF35', storm: '\u26C8\uFE0F', calm: '\u2728' };
            ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';
            ctx.fillText('\uD83D\uDE80 ' + colonyName.toUpperCase(), offsetX, 20);
            ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';
            ctx.fillText((seasonIcons[(seasonCycle || {}).id] || '\u2728') + ' ' + ((seasonDefs[(seasonCycle || {}).index] || {}).name || 'Calm'), w / 2 - 30, 20);
            ctx.fillStyle = '#64748b';
            ctx.fillText('T' + turn + ' | \uD83D\uDC65' + settlers.length + ' | \uD83C\uDFD7\uFE0F' + buildings.length, w - 135, 20);

            // Tiles (only render visible ones for performance)
            var tiles = mapData.tiles;
            for (var ti = 0; ti < tiles.length; ti++) {
              var tile = tiles[ti];
              // Culling: skip tiles outside viewport
              if (tile.x < camX - 1 || tile.x > camX + visibleW || tile.y < camY - 1 || tile.y > camY + visibleH) continue;
              var tx = offsetX + (tile.x - camX) * tileSize;
              var ty = offsetY + (tile.y - camY) * tileSize;
              if (!tile.explored) {
                // Fog of war with gradient edge detection
                var nearExplored = false;
                for (var dx2 = -1; dx2 <= 1; dx2++) {
                  for (var dy2 = -1; dy2 <= 1; dy2++) {
                    if (dx2 === 0 && dy2 === 0) continue;
                    var ni2 = (tile.y + dy2) * mapSize + (tile.x + dx2);
                    if (ni2 >= 0 && ni2 < tiles.length && tiles[ni2].explored) nearExplored = true;
                  }
                }
                if (nearExplored) {
                  // Glowing fog edge with shimmer
                  var fogGrad = ctx.createRadialGradient(tx + tileSize / 2, ty + tileSize / 2, 0, tx + tileSize / 2, ty + tileSize / 2, tileSize);
                  fogGrad.addColorStop(0, 'rgba(51,65,85,0.6)'); fogGrad.addColorStop(1, 'rgba(30,41,59,0.95)');
                  ctx.fillStyle = fogGrad; ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  // Shimmer effect on fog edge tiles
                  var shimmer = 0.06 + 0.04 * Math.sin(animPhase * 1.5 + tile.x * 0.8 + tile.y * 0.6);
                  var shimGrad = ctx.createRadialGradient(tx + tileSize * 0.5, ty + tileSize * 0.5, 0, tx + tileSize * 0.5, ty + tileSize * 0.5, tileSize * 0.7);
                  shimGrad.addColorStop(0, 'rgba(148,163,184,' + shimmer + ')');
                  shimGrad.addColorStop(0.6, 'rgba(100,116,139,' + (shimmer * 0.5) + ')');
                  shimGrad.addColorStop(1, 'rgba(0,0,0,0)');
                  ctx.fillStyle = shimGrad; ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  // Animated sparkle on some edge tiles
                  if ((tile.x + tile.y) % 3 === 0) {
                    var sparkleAlpha = 0.3 + 0.3 * Math.sin(animPhase * 3 + tile.x * 1.5);
                    ctx.fillStyle = 'rgba(203,213,225,' + sparkleAlpha + ')';
                    ctx.beginPath(); ctx.arc(tx + tileSize * 0.5 + Math.sin(animPhase + tile.y) * 3, ty + tileSize * 0.4, 1.5, 0, Math.PI * 2); ctx.fill();
                  }
                  ctx.fillStyle = 'rgba(100,116,139,0.4)'; ctx.font = (tileSize * 0.35) + 'px sans-serif';
                  ctx.fillText('?', tx + tileSize * 0.35, ty + tileSize * 0.65);
                } else {
                  ctx.fillStyle = '#1e293b'; ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  // Subtle deep fog texture for non-edge unexplored tiles
                  if ((tile.x * 7 + tile.y * 13) % 5 === 0) {
                    var deepFogAlpha = 0.02 + 0.01 * Math.sin(animPhase * 0.5 + tile.x + tile.y);
                    ctx.fillStyle = 'rgba(71,85,105,' + deepFogAlpha + ')';
                    ctx.fillRect(tx + 2, ty + 2, tileSize - 5, tileSize - 5);
                  }
                }
              } else {
                // Gradient terrain fill
                var tGrad = ctx.createLinearGradient(tx, ty, tx + tileSize, ty + tileSize);
                tGrad.addColorStop(0, tile.color);
                tGrad.addColorStop(1, tile.type === 'ocean' ? '#1e40af' : tile.type === 'mountain' ? '#44403c' : tile.type === 'forest' ? '#14532d' : tile.type === 'volcanic' ? '#7f1d1d' : tile.type === 'ice' ? '#e0f2fe' : tile.type === 'radiation' ? '#3b0764' : tile.type === 'colony' ? '#1e3a5f' : tile.color);
                ctx.globalAlpha = 0.9; ctx.fillStyle = tGrad;
                ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1); ctx.globalAlpha = 1;

                // Terrain detail drawing
                if (tile.type === 'ocean') {
                  var waveOff = Math.sin(animPhase + tile.x * 0.5) * 2;
                  ctx.strokeStyle = 'rgba(147,197,253,0.35)'; ctx.lineWidth = 0.7;
                  for (var wi = 0; wi < 3; wi++) {
                    ctx.beginPath(); ctx.moveTo(tx + 2, ty + tileSize * (0.3 + wi * 0.22) + waveOff);
                    ctx.quadraticCurveTo(tx + tileSize / 2, ty + tileSize * (0.2 + wi * 0.22) - waveOff, tx + tileSize - 3, ty + tileSize * (0.35 + wi * 0.22) + waveOff);
                    ctx.stroke();
                  }
                } else if (tile.type === 'mountain') {
                  // Mountain range with snow caps
                  ctx.fillStyle = 'rgba(120,113,108,0.5)'; ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.15, ty + tileSize * 0.82);
                  ctx.lineTo(tx + tileSize * 0.35, ty + tileSize * 0.25);
                  ctx.lineTo(tx + tileSize * 0.55, ty + tileSize * 0.6);
                  ctx.lineTo(tx + tileSize * 0.7, ty + tileSize * 0.18);
                  ctx.lineTo(tx + tileSize * 0.88, ty + tileSize * 0.82);
                  ctx.closePath(); ctx.fill();
                  // Snow cap
                  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.3, ty + tileSize * 0.33);
                  ctx.lineTo(tx + tileSize * 0.35, ty + tileSize * 0.25);
                  ctx.lineTo(tx + tileSize * 0.4, ty + tileSize * 0.33); ctx.fill();
                  ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.65, ty + tileSize * 0.26);
                  ctx.lineTo(tx + tileSize * 0.7, ty + tileSize * 0.18);
                  ctx.lineTo(tx + tileSize * 0.75, ty + tileSize * 0.26); ctx.fill();
                } else if (tile.type === 'volcanic') {
                  // Lava glow with pulsing
                  var lavaGlow = 0.3 + Math.sin(animPhase * 2 + tile.x) * 0.15;
                  ctx.fillStyle = 'rgba(239,68,68,' + lavaGlow + ')'; ctx.beginPath();
                  ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.22, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = 'rgba(251,191,36,' + (lavaGlow * 0.5) + ')'; ctx.beginPath();
                  ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.12, 0, Math.PI * 2); ctx.fill();
                } else if (tile.type === 'colony') {
                  // Enhanced colony with building count + glow
                  var colGlow = 0.15 + Math.sin(animPhase) * 0.05;
                  ctx.fillStyle = 'rgba(59,130,246,' + colGlow + ')';
                  ctx.fillRect(tx, ty, tileSize - 1, tileSize - 1);
                  ctx.fillStyle = '#e0f2fe'; ctx.fillRect(tx + 3, ty + 3, tileSize - 7, tileSize - 7);
                  // Dome
                  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.beginPath();
                  ctx.arc(tx + tileSize / 2, ty + tileSize * 0.5, tileSize * 0.22, Math.PI, 0); ctx.stroke();
                  ctx.moveTo(tx + tileSize * 0.28, ty + tileSize * 0.5);
                  ctx.lineTo(tx + tileSize * 0.72, ty + tileSize * 0.5); ctx.stroke();
                  // Building count badge
                  ctx.fillStyle = '#1e40af'; ctx.beginPath();
                  ctx.arc(tx + tileSize * 0.82, ty + tileSize * 0.2, tileSize * 0.13, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (tileSize * 0.15) + 'px sans-serif';
                  ctx.fillText(String(buildings.length), tx + tileSize * 0.75, ty + tileSize * 0.25);
                  // Pop count
                  ctx.fillStyle = '#166534'; ctx.beginPath();
                  ctx.arc(tx + tileSize * 0.18, ty + tileSize * 0.2, tileSize * 0.13, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = '#fff'; ctx.font = (tileSize * 0.13) + 'px sans-serif';
                  ctx.fillText(String(settlers.length), tx + tileSize * 0.1, ty + tileSize * 0.25);
                } else if (tile.type === 'radiation') {
                  // Pulsing radiation rings
                  var radGlow = 0.3 + Math.sin(animPhase * 1.5 + tile.y) * 0.2;
                  ctx.strokeStyle = 'rgba(168,85,247,' + radGlow + ')'; ctx.lineWidth = 0.8;
                  for (var ri = 0; ri < 3; ri++) { ctx.beginPath(); ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * (0.08 + ri * 0.1), 0, Math.PI * 2); ctx.stroke(); }
                } else if (tile.type === 'ice') {
                  // Ice crystal sparkles
                  ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(animPhase + ti) * 0.15) + ')';
                  var icePositions = [[0.25, 0.25], [0.55, 0.35], [0.35, 0.65], [0.7, 0.6], [0.5, 0.2]];
                  icePositions.forEach(function (ip) { ctx.fillRect(tx + tileSize * ip[0], ty + tileSize * ip[1], 2.5, 2.5); });
                } else if (tile.type === 'forest') {
                  // Tree canopy dots
                  ctx.fillStyle = 'rgba(34,197,94,0.5)';
                  var treePos = [[0.3, 0.3], [0.6, 0.25], [0.45, 0.55], [0.2, 0.65], [0.7, 0.6]];
                  treePos.forEach(function (tp2) { ctx.beginPath(); ctx.arc(tx + tileSize * tp2[0], ty + tileSize * tp2[1], tileSize * 0.08, 0, Math.PI * 2); ctx.fill(); });
                }

                // Pulsing anomaly glow
                if (tile.hasAnomaly) {
                  var anomGlow = 0.5 + Math.sin(animPhase * 3) * 0.3;
                  ctx.fillStyle = 'rgba(250,204,21,' + (anomGlow * 0.2) + ')';
                  ctx.beginPath(); ctx.arc(tx + tileSize * 0.78, ty + tileSize * 0.22, tileSize * 0.18, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = 'rgba(250,204,21,' + anomGlow + ')'; ctx.font = 'bold ' + (tileSize * 0.28) + 'px sans-serif';
                  ctx.fillText('!', tx + tileSize * 0.72, ty + tileSize * 0.32);
                }

                // Enhanced outpost with flag
                var tiKey = tile.x + ',' + tile.y;
                if (tileImprovements[tiKey]) {
                  ctx.fillStyle = '#f97316'; ctx.beginPath();
                  ctx.arc(tx + tileSize * 0.85, ty + tileSize * 0.82, tileSize * 0.1, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1; ctx.stroke();
                  // Flag pole
                  ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1; ctx.beginPath();
                  ctx.moveTo(tx + tileSize * 0.85, ty + tileSize * 0.72); ctx.lineTo(tx + tileSize * 0.85, ty + tileSize * 0.82); ctx.stroke();
                  ctx.fillStyle = '#fb923c'; ctx.fillRect(tx + tileSize * 0.85, ty + tileSize * 0.72, tileSize * 0.08, tileSize * 0.05);
                  // Trade route lines to adjacent outposts
                  [[1, 0], [0, 1]].forEach(function (dd2) {
                    var adjK2 = (tile.x + dd2[0]) + ',' + (tile.y + dd2[1]);
                    if (tileImprovements[adjK2]) {
                      ctx.strokeStyle = 'rgba(251,191,36,0.4)'; ctx.lineWidth = 1.5;
                      ctx.setLineDash([3, 3]); ctx.beginPath();
                      ctx.moveTo(tx + tileSize / 2, ty + tileSize / 2);
                      ctx.lineTo(tx + tileSize / 2 + dd2[0] * tileSize, ty + tileSize / 2 + dd2[1] * tileSize);
                      ctx.stroke(); ctx.setLineDash([]);
                    }
                  });
                }

                // Terrain emoji
                ctx.font = (tileSize * 0.3) + 'px sans-serif'; ctx.fillText(tile.icon, tx + 2, ty + tileSize - 3);
                // Rover on this tile
                rovers.forEach(function (rv) {
                  if (rv.x === tile.x && rv.y === tile.y) {
                    var rvDef = getRoverDef(rv.type);
                    var isSelected = selectedRover === rv.id;
                    // Rover body glow
                    if (isSelected) {
                      var selGlow = 0.4 + Math.sin(animPhase * 3) * 0.2;
                      ctx.fillStyle = 'rgba(250,204,21,' + selGlow + ')';
                      ctx.beginPath(); ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.4, 0, Math.PI * 2); ctx.fill();
                    }
                    // Rover icon
                    ctx.fillStyle = rvDef.color; ctx.beginPath();
                    ctx.arc(tx + tileSize / 2, ty + tileSize / 2, tileSize * 0.22, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = isSelected ? '#fef08a' : 'rgba(255,255,255,0.5)'; ctx.lineWidth = isSelected ? 2 : 1; ctx.stroke();
                    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + (tileSize * 0.22) + 'px sans-serif';
                    ctx.fillText(rvDef.icon, tx + tileSize * 0.32, ty + tileSize * 0.58);
                    // Fuel bar
                    var fuelPct = rv.fuel / rvDef.maxFuel;
                    ctx.fillStyle = fuelPct > 0.5 ? '#22c55e' : fuelPct > 0.2 ? '#eab308' : '#ef4444';
                    ctx.fillRect(tx + 2, ty + tileSize - 5, (tileSize - 4) * fuelPct, 2);
                  }
                });
              }

              // Selection highlight with animated corners
              if (selectedTile && selectedTile.x === tile.x && selectedTile.y === tile.y) {
                ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2.5;
                ctx.strokeRect(tx + 1, ty + 1, tileSize - 3, tileSize - 3);
                // Corner accents
                ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 2;
                var cs = tileSize * 0.2;
                ctx.beginPath(); ctx.moveTo(tx, ty + cs); ctx.lineTo(tx, ty); ctx.lineTo(tx + cs, ty); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx + tileSize - cs - 1, ty); ctx.lineTo(tx + tileSize - 1, ty); ctx.lineTo(tx + tileSize - 1, ty + cs); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx, ty + tileSize - cs - 1); ctx.lineTo(tx, ty + tileSize - 1); ctx.lineTo(tx + cs, ty + tileSize - 1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx + tileSize - cs - 1, ty + tileSize - 1); ctx.lineTo(tx + tileSize - 1, ty + tileSize - 1); ctx.lineTo(tx + tileSize - 1, ty + tileSize - cs - 1); ctx.stroke();
              }
              // Grid lines
              ctx.strokeStyle = 'rgba(100,116,139,0.15)'; ctx.lineWidth = 0.5; ctx.strokeRect(tx, ty, tileSize - 1, tileSize - 1);
            }

                      // Colony atmospheric glow
                      var cgx = (mapData.colonyPos.x - camX) * tileSize + tileSize/2;
                      var cgy = (mapData.colonyPos.y - camY) * tileSize + tileSize/2;
                      if (cgx > -tileSize*3 && cgx < w+tileSize*3 && cgy > -tileSize*3 && cgy < h+tileSize*3) {
                        var colGlow = ctx.createRadialGradient(cgx, cgy, tileSize*0.5, cgx, cgy, tileSize*3);
                        colGlow.addColorStop(0, 'rgba(99,102,241,' + (0.15 + 0.05 * Math.sin(animPhase * 2)) + ')');
                        colGlow.addColorStop(0.5, 'rgba(99,102,241,0.05)');
                        colGlow.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = colGlow;
                        ctx.fillRect(cgx - tileSize*3, cgy - tileSize*3, tileSize*6, tileSize*6);
                      }

            // Selected rover move range overlay
            if (selectedRover) {
              var selRv = rovers.find(function (r2) { return r2.id === selectedRover; });
              if (selRv && selRv.movesLeft > 0 && selRv.fuel > 0) {
                var maxMove = Math.min(selRv.movesLeft, selRv.fuel);
                for (var mti = 0; mti < tiles.length; mti++) {
                  var mt = tiles[mti];
                  var mdist = Math.abs(mt.x - selRv.x) + Math.abs(mt.y - selRv.y);
                  if (mdist > 0 && mdist <= maxMove) {
                    var mtx = offsetX + (mt.x - camX) * tileSize;
                    var mty = offsetY + (mt.y - camY) * tileSize;
                    ctx.fillStyle = 'rgba(250,204,21,' + (0.08 + Math.sin(animPhase * 2) * 0.04) + ')';
                    ctx.fillRect(mtx, mty, tileSize - 1, tileSize - 1);
                    ctx.strokeStyle = 'rgba(250,204,21,0.3)'; ctx.lineWidth = 1;
                    ctx.strokeRect(mtx + 1, mty + 1, tileSize - 3, tileSize - 3);
                  }
                }
              }
            }
            // Weather particles
            var wx2 = d.colonyWeather;
            if (wx2) {
              var mapArea = { x: offsetX, y: offsetY, w: mapSize * tileSize, h: mapSize * tileSize };
              for (var pi = 0; pi < 30; pi++) {
                var px = mapArea.x + ((pi * 3571 + turn * 137 + Math.floor(animPhase * 10)) % mapArea.w);
                var py = mapArea.y + ((pi * 2971 + turn * 97) % mapArea.h);
                if (wx2.name === 'Dust Storm') {
                  ctx.fillStyle = 'rgba(194,165,128,' + (0.2 + Math.sin(animPhase + pi) * 0.1) + ')';
                  ctx.fillRect(px, py, 3 + Math.random() * 3, 1);
                } else if (wx2.name === 'Solar Flare') {
                  ctx.fillStyle = 'rgba(250,204,21,' + (0.15 + Math.sin(animPhase * 2 + pi) * 0.1) + ')';
                  ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
                } else {
                  ctx.fillStyle = 'rgba(147,197,253,' + (0.2 + Math.sin(animPhase + pi) * 0.1) + ')';
                  ctx.fillRect(px, py, 1, 4);
                }
              }
            }

            // Expedition progress on map (if active)
            if (activeExpedition) {
              ctx.fillStyle = 'rgba(6,182,212,0.15)';
              ctx.fillRect(offsetX, offsetY + mapSize * tileSize - 8, mapSize * tileSize * ((activeExpedition.totalTurns - activeExpedition.turnsLeft) / activeExpedition.totalTurns), 6);
              ctx.fillStyle = '#06b6d4'; ctx.font = '8px Inter, system-ui';
              ctx.fillText('\u26F5 ' + activeExpedition.type + ' (' + activeExpedition.turnsLeft + 't)', offsetX + 2, offsetY + mapSize * tileSize - 1);
            }

            // Enhanced resource bar
            var rbY = offsetY + mapSize * tileSize + 12;
            // Background
            ctx.fillStyle = 'rgba(15,23,42,0.8)';
            ctx.fillRect(offsetX - 5, rbY - 5, mapSize * tileSize + 10, 22);
            ctx.strokeStyle = 'rgba(100,116,139,0.3)'; ctx.lineWidth = 0.5;
            ctx.strokeRect(offsetX - 5, rbY - 5, mapSize * tileSize + 10, 22);

            var resData = [
              ['\uD83C\uDF3E', resources.food, '#4ade80', '#166534'],
              ['\u26A1', resources.energy, '#facc15', '#713f12'],
              ['\uD83D\uDCA7', resources.water, '#38bdf8', '#0c4a6e'],
              ['\uD83E\uDEA8', resources.materials, '#94a3b8', '#334155'],
              ['\uD83D\uDD2C', resources.science, '#a78bfa', '#4c1d95']
            ];
            var resW = Math.floor(w / 5);
            ctx.font = 'bold 10px Inter, system-ui';
            resData.forEach(function (rd, rdi) {
              var rxPos = 4 + rdi * resW;
              // Tiny colored bg
              ctx.fillStyle = rd[3]; ctx.fillRect(rxPos, rbY - 2, resW - 4, 16);
              ctx.fillStyle = rd[2]; ctx.fillText(rd[0] + ' ' + rd[1], rxPos + 3, rbY + 9);
            });

            // Terraform + Equity mini bar
            ctx.fillStyle = '#166534'; ctx.fillRect(4, rbY + 18, Math.floor((w - 8) * terraform / 100), 3);
            ctx.strokeStyle = '#14532d'; ctx.lineWidth = 0.5; ctx.strokeRect(4, rbY + 18, w - 8, 3);
            ctx.fillStyle = '#64748b'; ctx.font = '7px Inter, system-ui';
            ctx.fillText('\uD83C\uDF0D ' + terraform + '%', 4, rbY + 28);
            ctx.fillText('\u2696\uFE0F ' + equity + '%', 54, rbY + 28);
            ctx.fillText('\uD83D\uDE42 ' + colonyHappiness + '%', 104, rbY + 28);
          }, 0);

          function handleMapClick(e) {
            // Don't select tile if user was dragging
            if (dragState.didDrag) { dragState.didDrag = false; return; }
            if (!mapData || !canvasRef.current) return;
            var rect = canvasRef.current.getBoundingClientRect();
            var w2 = canvasRef.current.width;
            var ts2 = Math.max(4, Math.round(24 * colonyZoom));
            var tileX = Math.floor((e.clientX - rect.left) / ts2) + camX;
            var tileY = Math.floor((e.clientY - rect.top - 30) / ts2) + camY;
            if (tileX >= 0 && tileX < mapSize && tileY >= 0 && tileY < mapSize) {
              var tile = mapData.tiles[tileY * mapSize + tileX];
              upd('colonySelTile', { x: tileX, y: tileY, tile: tile });
              // Auto-center on selected tile if it's near the edge of the viewport
              var vW2 = Math.ceil(w2 / ts2);
              var h2 = canvasRef.current.height;
              var vH2 = Math.ceil((h2 - 60) / ts2);
              if (tileX < camX + 2 || tileX > camX + vW2 - 3) upd('colonyCamX', Math.max(0, tileX - Math.floor(vW2 / 2)));
              if (tileY < camY + 2 || tileY > camY + vH2 - 3) upd('colonyCamY', Math.max(0, tileY - Math.floor(vH2 / 2)));
            }
          }
          // ── Drag Pan Handlers ──
          function handleMapMouseDown(e) {
            dragState.dragging = true;
            dragState.didDrag = false;
            dragState.startX = e.clientX;
            dragState.startY = e.clientY;
            dragState.startCamX = camX;
            dragState.startCamY = camY;
            e.preventDefault();
          }
          function handleMapMouseMove(e) {
            if (!canvasRef.current) return;
            var rect = canvasRef.current.getBoundingClientRect();
            // Edge-scroll detection
            var relX = e.clientX - rect.left; var relY = e.clientY - rect.top;
            var edgeZone = 30;
            edgeScroll.dx = 0; edgeScroll.dy = 0;
            if (relX < edgeZone) edgeScroll.dx = -1;
            else if (relX > rect.width - edgeZone) edgeScroll.dx = 1;
            if (relY < edgeZone) edgeScroll.dy = -1;
            else if (relY > rect.height - edgeZone) edgeScroll.dy = 1;
            // Drag panning
            if (!dragState.dragging) return;
            var ts3 = Math.max(4, Math.round(24 * colonyZoom));
            var dx = Math.round((dragState.startX - e.clientX) / ts3);
            var dy = Math.round((dragState.startY - e.clientY) / ts3);
            if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
              dragState.didDrag = true;
              var maxCX2 = Math.max(0, mapSize - Math.ceil(rect.width / ts3));
              var maxCY2 = Math.max(0, mapSize - Math.ceil((rect.height - 60) / ts3));
              upd('colonyCamX', Math.max(0, Math.min(maxCX2, dragState.startCamX + dx)));
              upd('colonyCamY', Math.max(0, Math.min(maxCY2, dragState.startCamY + dy)));
            }
          }
          function handleMapMouseUp() { dragState.dragging = false; }
          function handleMapMouseLeave() { dragState.dragging = false; edgeScroll.active = false; edgeScroll.dx = 0; edgeScroll.dy = 0; }
          function handleMapMouseEnter() { edgeScroll.active = true; }
          function handleMapWheel(e) {
            e.preventDefault();
            var newZoom = colonyZoom * (e.deltaY > 0 ? 0.88 : 1.12);
            newZoom = Math.max(0.4, Math.min(3.0, newZoom));
            if (Math.abs(newZoom - 1.0) < 0.08) newZoom = 1.0;
            // Zoom toward cursor — adjust camera
            if (canvasRef.current) {
              var rect2 = canvasRef.current.getBoundingClientRect();
              var ts4 = Math.max(4, Math.round(24 * colonyZoom));
              var cursorTileX = (e.clientX - rect2.left) / ts4 + camX;
              var cursorTileY = (e.clientY - rect2.top - 30) / ts4 + camY;
              var newTs = Math.max(4, Math.round(24 * newZoom));
              var newCamX = Math.round(cursorTileX - (e.clientX - rect2.left) / newTs);
              var newCamY = Math.round(cursorTileY - (e.clientY - rect2.top - 30) / newTs);
              upd('colonyCamX', Math.max(0, newCamX));
              upd('colonyCamY', Math.max(0, newCamY));
            }
            upd('colonyZoom', newZoom);
          }
          // ── Keyboard Shortcuts ──
          if (!window._colonyKeyHandler) {
            window._colonyKeyHandler = function (e) {
              if (!window._colonyKeyActive) return;
              // Don't capture if typing in an input
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              var _upd = window._colonyUpd;
              var _d = window._colonyState || {};
              if (!_upd) return;
              var panSpeed = 3;
              switch (e.key.toLowerCase()) {
                case 'w': case 'arrowup':    _upd('colonyCamY', Math.max(0, (_d.colonyCamY || 0) - panSpeed)); e.preventDefault(); break;
                case 's': case 'arrowdown':  _upd('colonyCamY', (_d.colonyCamY || 0) + panSpeed); e.preventDefault(); break;
                case 'a': case 'arrowleft':  _upd('colonyCamX', Math.max(0, (_d.colonyCamX || 0) - panSpeed)); e.preventDefault(); break;
                case 'd': case 'arrowright': _upd('colonyCamX', (_d.colonyCamX || 0) + panSpeed); e.preventDefault(); break;
                case '=': case '+': _upd('colonyZoom', Math.min(3.0, (_d.colonyZoom || 1) * 1.15)); e.preventDefault(); break;
                case '-': case '_': _upd('colonyZoom', Math.max(0.4, (_d.colonyZoom || 1) * 0.85)); e.preventDefault(); break;
                case 'escape': _upd('colonySelTile', null); _upd('selectedRover', null); _upd('turnSummary', null); break;
                case 'h': _upd('colonyCamX', Math.max(0, ((_d.colonyMap || {}).colonyPos || {}).x - 10)); _upd('colonyCamY', Math.max(0, ((_d.colonyMap || {}).colonyPos || {}).y - 10)); break;
              }
            };
            window.addEventListener('keydown', window._colonyKeyHandler);
          }
          window._colonyKeyActive = (colonyPhase === 'playing');
          window._colonyUpd = upd;
          window._colonyState = d;

          return React.createElement('div', { className: 'bg-gradient-to-b from-slate-900 to-indigo-950 rounded-2xl p-4 border border-slate-700' },
            React.createElement('div', { className: 'flex items-center justify-between mb-4' },
              React.createElement('div', { className: 'flex items-center gap-2' },
                React.createElement('button', { onClick: function () { upd('selectedTool', null); }, className: 'text-slate-500 hover:text-white text-lg' }, '\u2190'),
                React.createElement('h2', { className: 'text-xl font-bold text-white' }, '\uD83D\uDE80 Kepler Colony'),
                React.createElement('span', { className: 'text-[11px] text-indigo-400 bg-indigo-900 px-2 py-0.5 rounded-full' }, 'Turn-Based Strategy')
              ),
              colony && React.createElement('div', { className: 'flex gap-1 text-[10px] items-center flex-wrap' },
                [
                  ['\uD83C\uDF3E','food',resources.food,'#4ade80','#166534'],
                  ['\u26A1','energy',resources.energy,'#facc15','#854d0e'],
                  ['\uD83D\uDCA7','water',resources.water,'#38bdf8','#0c4a6e'],
                  ['\uD83E\uDEA8','materials',resources.materials,'#94a3b8','#334155'],
                  ['\uD83D\uDD2C','science',resources.science,'#a78bfa','#4c1d95']
                ].map(function(r) {
                  var pct = Math.min(100, Math.round(r[2] / 80 * 100));
                  return React.createElement('div', { key: r[1], className: 'flex items-center gap-0.5', title: r[1] + ': ' + r[2] },
                    React.createElement('span', { className: 'text-xs' }, r[0]),
                    React.createElement('div', { className: 'relative w-10 h-2.5 rounded-full overflow-hidden', style: { backgroundColor: r[4] + '40' } },
                      React.createElement('div', { className: 'h-full rounded-full transition-all duration-500', style: { width: pct + '%', backgroundColor: r[3], animation: 'kp-barFill 0.8s ease-out' } })
                    ),
                    React.createElement('span', { className: 'text-[11px] font-bold', style: { color: r[3], minWidth: '16px' } }, r[2])
                  );
                }),
                React.createElement('span', { className: 'text-amber-300 font-bold ml-1' }, 'T' + turn),
                React.createElement('span', { className: 'text-[11px] px-1.5 py-0.5 rounded-full', style: { backgroundColor: currentEra.color + '33', color: currentEra.color } }, currentEra.icon + ' ' + currentEra.name),
                React.createElement('span', { className: 'text-[11px] text-cyan-300' }, (seasonDefs[seasonCycle.index] || {}).icon + ' ' + (seasonDefs[seasonCycle.index] || {}).name + ' (' + seasonCycle.turnsLeft + 't)'),
                turnPhase === 'day' && React.createElement('span', { className: 'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold', style: { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#e0e7ff', animation: 'kp-glow 2s infinite' } }, '\u26A1 ' + actionPoints + '/' + maxAP + ' AP'),
                turnPhase && React.createElement('span', { className: 'px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', style: { background: turnPhase === 'dawn' ? '#f59e0b30' : turnPhase === 'dusk' ? '#6366f130' : '#22c55e30', color: turnPhase === 'dawn' ? '#fbbf24' : turnPhase === 'dusk' ? '#818cf8' : '#4ade80' } }, turnPhase === 'dawn' ? '\u2600\uFE0F Dawn' : turnPhase === 'day' ? '\u2600 Day' : '\uD83C\uDF19 Dusk')
              )
            ),
            // SETUP
            colonyPhase === 'setup' && React.createElement('div', { className: 'text-center py-10' },
              React.createElement('div', { className: 'text-7xl mb-4', style: { animation: 'kp-float 3s ease-in-out infinite', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.4))' } }, '\uD83D\uDE80'),
              React.createElement('h3', { className: 'text-3xl font-black mb-2', style: { background: 'linear-gradient(135deg, #e0e7ff, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }, 'Welcome to Kepler-442b'),
              React.createElement('p', { className: 'text-slate-400 text-sm max-w-lg mx-auto mb-6' },
                'You have arrived at a habitable exoplanet 1,206 light-years from Earth. Build a self-sustaining colony by mastering real science. Every building requires passing a science challenge. Every turn brings new surprises from the Fate Roll. Your 6 settlers are counting on you, Commander!'
              ),
              React.createElement('div', { className: 'grid grid-cols-3 gap-3 max-w-md mx-auto mb-6 text-slate-300 text-[10px]' },
                [['\uD83C\uDF0D', 'Explore', 'Reveal tiles, find loot & anomalies'], ['\u26A1', '3 Actions/Turn', 'Build, research, or explore each day'], ['\uD83C\uDFB2', 'Fate Roll', 'Random events every turn!']].map(function (item) {
                  return React.createElement('div', { key: item[1], className: 'bg-slate-800 rounded-xl p-3 border border-slate-700 text-center' },
                    React.createElement('div', { className: 'text-2xl mb-1' }, item[0]),
                    React.createElement('div', { className: 'font-bold' }, item[1]),
                    item[2]
                  );
                })
              ),
              // Difficulty Settings
              React.createElement('div', { className: 'bg-slate-800/80 rounded-xl p-4 border border-slate-700 max-w-md mx-auto mb-6' },
                React.createElement('h4', { className: 'text-[11px] font-bold text-white mb-3 text-center' }, '\u2699\uFE0F Game Settings'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-3' },
                  // Grade Level
                  React.createElement('div', null,
                    React.createElement('div', { className: 'text-[11px] text-slate-500 mb-1' }, '\uD83C\uDF93 Grade Level'),
                    React.createElement('div', { className: 'flex flex-col gap-1' },
                      ['K-2', '3-5', '6-8', '9-12', 'College'].map(function (gl) {
                        return React.createElement('button', {
                          key: gl,
                          onClick: function () { upd('colonyGrade', gl); },
                          className: 'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ' +
                            ((d.colonyGrade || '6-8') === gl ? 'border-green-400 bg-green-900 text-green-200' : 'border-slate-700 bg-slate-900 text-slate-600 hover:border-slate-500')
                        }, gl);
                      })
                    ),
                    React.createElement('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'Adjusts question difficulty')
                  ),
                  React.createElement('div', null,
                    React.createElement('div', { className: 'text-[11px] text-slate-500 mb-1' }, 'Science Challenge Mode'),
                    React.createElement('div', { className: 'flex gap-1' },
                      React.createElement('button', {
                        onClick: function () { upd('colonyMode', 'mcq'); },
                        className: 'flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border-2 transition-all ' +
                          ((d.colonyMode || 'mcq') === 'mcq' ? 'border-indigo-400 bg-indigo-900 text-indigo-200' : 'border-slate-600 bg-slate-900 text-slate-400')
                      }, '\uD83D\uDCCB MCQ'),
                      React.createElement('button', {
                        onClick: function () { upd('colonyMode', 'freeResponse'); },
                        className: 'flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border-2 transition-all ' +
                          ((d.colonyMode || 'mcq') === 'freeResponse' ? 'border-purple-400 bg-purple-900 text-purple-200' : 'border-slate-600 bg-slate-900 text-slate-400')
                      }, '\u270D\uFE0F Free Response')
                    ),
                    React.createElement('div', { className: 'text-[10px] text-slate-600 mt-1' },
                      (d.colonyMode || 'mcq') === 'mcq' ? 'Multiple choice \u2014 4 options, scaffolded learning' : 'Type your answer \u2014 harder but deeper understanding'
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('div', { className: 'text-[11px] text-slate-500 mb-1' }, 'Audio Narration'),
                    React.createElement('div', { className: 'flex gap-1' },
                      React.createElement('button', {
                        onClick: function () { upd('colonyTTS', !(d.colonyTTS)); },
                        className: 'flex-1 px-2 py-2 rounded-lg text-[11px] font-bold border-2 transition-all ' +
                          (d.colonyTTS ? 'border-green-400 bg-green-900 text-green-200' : 'border-slate-600 bg-slate-900 text-slate-400')
                      }, d.colonyTTS ? '\uD83D\uDD0A ON' : '\uD83D\uDD07 OFF')
                    ),
                    React.createElement('div', { className: 'text-[10px] text-slate-600 mt-1' }, 'Characters speak with TTS voices')
                  )
                )
              ),
              React.createElement('button', {
                onClick: function () {
                  var startMap = generateMap();
                  var initPickups = generatePickups(startMap.tiles);
                  upd('mapPickups', initPickups);
                  upd('colonyMap', startMap); upd('colonyPhase', 'playing'); upd('colonyTurn', 1);
                  upd('turnPhase', 'dawn'); upd('actionPoints', 3); upd('builtThisTurn', false);
                  upd('dawnData', { turn: 1, income: {}, weather: null, discovery: null, isFirst: true });
                  upd('colonyZoom', 1.0);
                  upd('colonyCamX', Math.max(0, startMap.colonyPos.x - 10));
                  upd('colonyCamY', Math.max(0, startMap.colonyPos.y - 10));
                  upd('colonyRes', { food: 40, energy: 30, water: 30, materials: 20, science: 10 });
                  upd('colonyBuildings', []); upd('colonySettlers', JSON.parse(JSON.stringify(defaultSettlers)));
                  upd('colonyLog', ['Turn 1: Colony established on Kepler-442b. 6 settlers ready.']);
                  upd('colony', { name: 'Kepler-442b' });
                  upd('buildingEff', {}); upd('lastMaintTurn', 0); upd('maintChallenge', null);
                  upd('colonyStats', { questionsAnswered: 0, correct: 0, buildingsConstructed: 0, anomaliesExplored: 0, turnsPlayed: 0 });
                  upd('turnPhase', null); upd('actionPoints', 3); upd('fateRoll', null); upd('dawnData', null); upd('mapPickups', {}); upd('fateAnimating', false); upd('builtThisTurn', false);
                  upd('colonyRovers', []); upd('selectedRover', null); upd('tileImprovements', {});
                  if (d.colonyTTS) colonySpeak('Mission log. Colony established on Kepler 442 b. Six settlers are ready to begin construction. Good luck, Commander.', 'narrator');
                  if (addToast) addToast('\uD83D\uDE80 Colony established!', 'success');
                  if (typeof addXP === 'function') addXP(10, 'Kepler Colony: Mission launched');
                },
                className: 'px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl text-lg font-bold hover:shadow-lg hover:shadow-indigo-500/30 transition-all'
              }, '\uD83D\uDE80 Launch Colony Mission')
            ),
            // PLAYING
            colonyPhase === 'playing' && mapData && React.createElement('div', null,
              React.createElement('style', null, '@keyframes kp-fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes kp-pulse{0%,100%{opacity:1}50%{opacity:.6}}@keyframes kp-glow{0%,100%{box-shadow:0 0 5px rgba(99,102,241,.3)}50%{box-shadow:0 0 20px rgba(99,102,241,.6)}}@keyframes kp-fateRoll{0%{transform:scale(.5) rotate(0);opacity:0}50%{transform:scale(1.3) rotate(180deg);opacity:1}100%{transform:scale(1) rotate(360deg);opacity:1}}@keyframes kp-barFill{from{width:0}}@keyframes kp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes kp-slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}@keyframes kp-shake{0%,100%{transform:translateX(0)}10%,30%,50%,70%,90%{transform:translateX(-2px)}20%,40%,60%,80%{transform:translateX(2px)}}@keyframes kp-sparkle{0%,100%{opacity:0;transform:scale(0) rotate(0deg)}50%{opacity:1;transform:scale(1) rotate(180deg)}}@keyframes kp-breathe{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.02);opacity:1}}'),
              // ══ DAWN PHASE OVERLAY ══
              turnPhase === 'dawn' && React.createElement('div', {
                className: 'relative mb-4 rounded-2xl overflow-hidden',
                style: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #f59e0b20 100%)', animation: 'kp-fadeIn 0.5s ease-out' }
              },
                React.createElement('div', { className: 'absolute inset-0 opacity-10', style: { background: 'radial-gradient(circle at 80% 20%, #f59e0b 0%, transparent 50%)' } }),
                React.createElement('div', { className: 'relative p-5' },
                  React.createElement('div', { className: 'flex items-center justify-between mb-4' },
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-3xl mb-1', style: { animation: 'kp-float 3s ease-in-out infinite' } }, '\u2600\uFE0F'),
                      React.createElement('h2', { className: 'text-xl font-bold text-amber-200' }, 'Dawn \u2014 Turn ' + turn),
                      React.createElement('div', { className: 'text-[10px] text-amber-400/70' }, (seasonDefs[seasonCycle.index] || {}).icon + ' ' + (seasonDefs[seasonCycle.index] || {}).name + ' | ' + (eraData[era] || {}).icon + ' ' + (eraData[era] || {}).name + ' Era')
                    ),
                    React.createElement('div', { className: 'text-right' },
                      React.createElement('div', { className: 'text-4xl font-black text-amber-300', style: { textShadow: '0 0 20px rgba(245,158,11,0.4)' } }, '\u26A1 ' + maxAP),
                      React.createElement('div', { className: 'text-[10px] text-amber-400' }, 'Action Points Today')
                    )
                  ),
                  dawnData && !dawnData.isFirst && React.createElement('div', { className: 'bg-black/20 rounded-xl p-3 mb-3 border border-amber-900/30' },
                    React.createElement('div', { className: 'text-[11px] font-bold text-amber-300/80 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Income This Turn'),
                    React.createElement('div', { className: 'grid grid-cols-5 gap-2' },
                      [['\uD83C\uDF3E','Food',(dawnData.income||{}).food||0,'#4ade80'],['\u26A1','Energy',(dawnData.income||{}).energy||0,'#facc15'],['\uD83D\uDCA7','Water',(dawnData.income||{}).water||0,'#38bdf8'],['\uD83E\uDEA8','Mats',(dawnData.income||{}).materials||0,'#94a3b8'],['\uD83D\uDD2C','Sci',(dawnData.income||{}).science||0,'#a78bfa']].map(function(rd){return React.createElement('div',{key:rd[1],className:'text-center p-1.5 rounded-lg',style:{backgroundColor:rd[3]+'15',border:'1px solid '+rd[3]+'25'}},React.createElement('div',{className:'text-lg'},rd[0]),React.createElement('div',{className:'text-sm font-bold',style:{color:rd[3]}},(rd[2]>=0?'+':'')+rd[2]),React.createElement('div',{className:'text-[10px] text-slate-500'},rd[1]))})
                    )
                  ),
                  dawnData && dawnData.discovery && React.createElement('div', { className: 'bg-purple-900/30 rounded-xl p-3 mb-3 border border-purple-700/30', style: { animation: 'kp-fadeIn 0.8s ease-out' } },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-2xl', style: { animation: 'kp-pulse 2s infinite' } }, (dawnData.discovery||{}).icon || '\uD83D\uDD0D'),
                      React.createElement('div', null,
                        React.createElement('div', { className: 'text-[10px] font-bold text-purple-300' }, (dawnData.discovery||{}).label),
                        React.createElement('div', { className: 'text-[11px] text-purple-400' }, (dawnData.discovery||{}).desc)
                      )
                    )
                  ),
                  (function(){ var adv = getAdvisorMessage(); return adv ? React.createElement('div', { className: 'bg-indigo-900/30 rounded-lg p-2 mb-3 border border-indigo-700/30 flex items-center gap-2' }, React.createElement('span', { className: 'text-lg' }, (adv.settler||{}).icon||'\uD83D\uDCA1'), React.createElement('div', { className: 'text-[11px] text-indigo-300 flex-1' }, React.createElement('span', { className: 'font-bold text-indigo-200' }, ((adv.settler||{}).name||'Advisor') + ': '), adv.msg)) : null; })(),
                  React.createElement('button', {
                    onClick: function() { upd('turnPhase', 'day'); upd('actionPoints', maxAP); upd('builtThisTurn', false); upd('dawnData', null); if (d.colonyTTS) colonySpeak('Day ' + turn + ' begins. You have ' + maxAP + ' action points.', 'narrator'); },
                    className: 'w-full py-3 rounded-xl text-sm font-bold text-amber-900 transition-all hover:scale-[1.02]',
                    style: { background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }
                  }, '\u2600\uFE0F Begin Day \u2014 ' + maxAP + ' Actions Available')
                )
              ),
              React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                React.createElement('div', { className: 'flex gap-1 items-center' },
                  React.createElement('button', { onClick: function () { upd('colonyCamX', Math.max(0, camX - 10)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Left' }, '\u2190'),
                  React.createElement('button', { onClick: function () { upd('colonyCamY', Math.max(0, camY - 10)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Up' }, '\u2191'),
                  React.createElement('button', { onClick: function () { upd('colonyCamY', camY + 10); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Down' }, '\u2193'),
                  React.createElement('button', { onClick: function () { upd('colonyCamX', camX + 10); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600', title: 'Scroll Right' }, '\u2192'),
                  React.createElement('button', { onClick: function () { upd('colonyCamX', Math.max(0, mapData.colonyPos.x - 6)); upd('colonyCamY', Math.max(0, mapData.colonyPos.y - 6)); }, className: 'px-2 py-1 bg-indigo-700 text-white rounded text-[10px] hover:bg-indigo-600', title: 'Center on Colony' }, '\uD83C\uDFE0'),
                  React.createElement('span', { className: 'text-slate-600 mx-1' }, '|'),
                  React.createElement('button', { onClick: function () { upd('colonyZoom', Math.min(3.0, colonyZoom * 1.25)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600 font-bold', title: 'Zoom In' }, '+'),
                  React.createElement('button', { onClick: function () { upd('colonyZoom', Math.max(0.4, colonyZoom * 0.8)); }, className: 'px-2 py-1 bg-slate-700 text-white rounded text-[10px] hover:bg-slate-600 font-bold', title: 'Zoom Out' }, '\u2212'),
                  React.createElement('button', { onClick: function () { upd('colonyZoom', 1.0); }, className: 'px-1.5 py-1 bg-slate-700 text-white rounded text-[11px] hover:bg-slate-600', title: 'Reset Zoom' }, '1:1'),
                  React.createElement('span', { className: 'text-[11px] text-slate-600 ml-1' }, Math.round(colonyZoom * 100) + '%'),
                React.createElement('span', { className: 'text-[10px] text-slate-600 ml-2 hidden sm:inline' }, 'WASD pan \u2022 +/- zoom \u2022 Esc clear \u2022 H home')
                ),
                React.createElement('span', { className: 'text-[11px] text-slate-600' }, mapSize + '\u00D7' + mapSize + ' (' + camX + ',' + camY + ')')
              ),
              React.createElement('canvas', {
                ref: canvasRef,
                onClick: handleMapClick,
                onMouseDown: handleMapMouseDown,
                onMouseMove: handleMapMouseMove,
                onMouseUp: handleMapMouseUp,
                onMouseLeave: handleMapMouseLeave,
                onMouseEnter: handleMapMouseEnter,
                onWheel: handleMapWheel,
                className: 'w-full rounded-xl border border-slate-700 mb-3',
                style: { maxHeight: '520px', cursor: dragState.dragging ? 'grabbing' : 'grab' }
              }),
              // ── Minimap ──
              React.createElement('div', { className: 'relative', style: { width: '120px', height: '120px', position: 'absolute', right: '16px', top: '80px', zIndex: 10 } },
                React.createElement('canvas', {
                  ref: function (miniCanvas) {
                    if (!miniCanvas || !mapData) return;
                    var mCtx = miniCanvas.getContext('2d');
                    var mW = 120, mH = 120;
                    miniCanvas.width = mW; miniCanvas.height = mH;
                    mCtx.fillStyle = '#0f172a'; mCtx.fillRect(0, 0, mW, mH);
                    var mTile = mW / mapSize;
                    // Draw explored tiles
                    var mTiles = mapData.tiles;
                    for (var mi = 0; mi < mTiles.length; mi++) {
                      var mt = mTiles[mi];
                      if (mt.explored) {
                        mCtx.fillStyle = mt.type === 'colony' ? '#3b82f6' : mt.type === 'ocean' ? '#1e40af' : mt.type === 'mountain' ? '#78716c' : mt.type === 'forest' ? '#166534' : mt.type === 'volcanic' ? '#991b1b' : mt.type === 'ice' ? '#bae6fd' : mt.color || '#334155';
                        mCtx.fillRect(mt.x * mTile, mt.y * mTile, Math.max(1, mTile), Math.max(1, mTile));
                      }
                    }
                    // Viewport rectangle
                    var vpX = camX * mTile, vpY = camY * mTile;
                    var ts5 = Math.max(4, Math.round(24 * colonyZoom));
                    var vpW2 = Math.ceil(((canvasRef.current || {}).width || 500) / ts5) * mTile;
                    var vpH2 = Math.ceil((((canvasRef.current || {}).height || 400) - 60) / ts5) * mTile;
                    mCtx.strokeStyle = '#facc15'; mCtx.lineWidth = 1.5;
                    mCtx.strokeRect(vpX, vpY, vpW2, vpH2);
                      // ── Map Pickups ──
                      Object.keys(mapPickups).forEach(function(pk) {
                        var pxy = pk.split(','); var ppx = parseInt(pxy[0]) - camX; var ppy = parseInt(pxy[1]) - camY;
                        if (ppx >= 0 && ppx < vw && ppy >= 0 && ppy < vh) {
                          var pItem = mapPickups[pk]; var psx = ppx * cs + cs/2; var psy = ppy * cs + cs/2;
                          var pColor = pItem.rarity === 'epic' ? '#f59e0b' : pItem.rarity === 'rare' ? '#8b5cf6' : '#22c55e';
                          var pSize = pItem.rarity === 'epic' ? cs*0.4 : pItem.rarity === 'rare' ? cs*0.35 : cs*0.25;
                          ctx.save(); ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now()/500 + parseInt(pxy[0]));
                          ctx.fillStyle = pColor; ctx.shadowColor = pColor; ctx.shadowBlur = pItem.rarity === 'epic' ? 12 : 6;
                          ctx.beginPath();
                          if (pItem.rarity === 'epic') { for (var si=0;si<5;si++){var a=si*Math.PI*2/5-Math.PI/2;ctx.lineTo(psx+Math.cos(a)*pSize,psy+Math.sin(a)*pSize);a+=Math.PI/5;ctx.lineTo(psx+Math.cos(a)*pSize*0.4,psy+Math.sin(a)*pSize*0.4);} }
                          else if (pItem.rarity === 'rare') { for (var si2=0;si2<4;si2++){var a2=si2*Math.PI/2+Math.PI/4;ctx.lineTo(psx+Math.cos(a2)*pSize,psy+Math.sin(a2)*pSize);a2+=Math.PI/4;ctx.lineTo(psx+Math.cos(a2)*pSize*0.5,psy+Math.sin(a2)*pSize*0.5);} }
                          else { ctx.arc(psx, psy, pSize, 0, Math.PI * 2); }
                          ctx.closePath(); ctx.fill(); ctx.restore();
                        }
                      });
                    // Colony marker
                    if (mapData.colonyPos) {
                      mCtx.fillStyle = '#22d3ee';
                      mCtx.fillRect(mapData.colonyPos.x * mTile - 1, mapData.colonyPos.y * mTile - 1, 3, 3);
                    }
                  },
                  onClick: function (e2) {
                    var rect3 = e2.target.getBoundingClientRect();
                    var mx = (e2.clientX - rect3.left) / 120 * mapSize;
                    var my = (e2.clientY - rect3.top) / 120 * mapSize;
                    var ts6 = Math.max(4, Math.round(24 * colonyZoom));
                    var vw3 = Math.ceil(((canvasRef.current || {}).width || 500) / ts6);
                    var vh3 = Math.ceil((((canvasRef.current || {}).height || 400) - 60) / ts6);
                    upd('colonyCamX', Math.max(0, Math.round(mx - vw3 / 2)));
                    upd('colonyCamY', Math.max(0, Math.round(my - vh3 / 2)));
                  },
                  className: 'rounded border border-slate-600 cursor-pointer',
                  style: { width: '120px', height: '120px', opacity: 0.85 },
                  title: 'Click to navigate'
                })
              ),
              // Selected tile
              selectedTile && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: (function(){ var tColors = { plains: { bg: 'linear-gradient(135deg, #14532d, #0f172a)', bc: '#16a34a40' }, mountain: { bg: 'linear-gradient(135deg, #44403c, #0f172a)', bc: '#78716c40' }, volcanic: { bg: 'linear-gradient(135deg, #7f1d1d, #0f172a)', bc: '#ef444440' }, ice: { bg: 'linear-gradient(135deg, #164e63, #0f172a)', bc: '#06b6d440' }, desert: { bg: 'linear-gradient(135deg, #78350f, #0f172a)', bc: '#f59e0b40' }, ocean: { bg: 'linear-gradient(135deg, #1e3a5f, #0f172a)', bc: '#3b82f640' }, radiation: { bg: 'linear-gradient(135deg, #581c87, #0f172a)', bc: '#a855f740' }, colony: { bg: 'linear-gradient(135deg, #312e81, #0f172a)', bc: '#6366f140' } }; var tc = tColors[selectedTile.tile.type] || tColors.plains; return { background: tc.bg, borderColor: tc.bc, animation: 'kp-fadeIn 0.3s ease-out' }; })() },
                React.createElement('div', { className: 'flex items-center justify-between' },
                  React.createElement('div', null,
                    React.createElement('span', { className: 'text-sm font-bold text-white' }, selectedTile.tile.icon + ' ' + selectedTile.tile.name),
                    React.createElement('span', { className: 'text-[10px] text-slate-600 ml-2' }, '(' + selectedTile.x + ',' + selectedTile.y + ')' + (selectedTile.tile.res !== 'none' ? ' +' + selectedTile.tile.res : '') + (selectedTile.tile.hasAnomaly ? ' \u26A0\uFE0F Anomaly detected!' : ''))
                  ),
                  selectedTile.tile.hasAnomaly && selectedTile.tile.explored && !d.anomalyLoading && React.createElement('button', {
                    onClick: function () {
                      upd('anomalyLoading', true);
                      var tName = selectedTile.tile.name;
                      callGemini('You are the AI game master for a space colony on alien planet Kepler-442b. Settlers are exploring an anomaly on a ' + tName + ' tile. Generate a discovery event. This should be a fascinating alien ruin, geological wonder, or xenobiological find. Include real science. Return ONLY valid JSON:\n{"emoji":"<emoji>","title":"<discovery name>","description":"<3-4 sentences describing the find>","lesson":"<real science behind this type of discovery, 2-3 sentences>","reward":{"food":<0-8>,"energy":<0-8>,"water":<0-8>,"materials":<0-8>,"science":<3-15>},"terraformBonus":<0-5>}', true).then(function (result) {
                        try {
                          var cl = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                          var s2 = cl.indexOf('{'); if (s2 > 0) cl = cl.substring(s2);
                          var e2 = cl.lastIndexOf('}'); if (e2 > 0) cl = cl.substring(0, e2 + 1);
                          var parsed = JSON.parse(cl);
                          upd('anomalyResult', parsed); upd('anomalyLoading', false);
                          // Apply rewards
                          var nr5 = Object.assign({}, resources);
                          Object.keys(parsed.reward || {}).forEach(function (k) { if (nr5[k] !== undefined) nr5[k] += parsed.reward[k]; });
                          upd('colonyRes', nr5);
                          if (parsed.terraformBonus) upd('colonyTerraform', Math.min(100, (d.colonyTerraform || 0) + parsed.terraformBonus));
                          // Remove anomaly
                          var nm2 = JSON.parse(JSON.stringify(mapData));
                          nm2.tiles[selectedTile.y * mapSize + selectedTile.x].hasAnomaly = false;
                          upd('colonyMap', nm2);
                          var nl5 = gameLog.slice(); nl5.push('\u2728 Anomaly: ' + parsed.title); upd('colonyLog', nl5);
                          if (d.colonyTTS) colonySpeak('Anomaly investigated. ' + parsed.title + '. ' + parsed.description, 'narrator');
                          var ns6 = Object.assign({}, stats); ns6.anomaliesExplored++; upd('colonyStats', ns6);
                          if (typeof addXP === 'function') addXP(25, 'Kepler Colony: Anomaly explored');
                        } catch (err) { upd('anomalyLoading', false); }
                      }).catch(function () { upd('anomalyLoading', false); });
                    },
                    className: 'px-3 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-bold'
                  }, d.anomalyLoading ? '\u23F3' : '\u2728 Investigate Anomaly'),
                  !selectedTile.tile.explored && turnPhase === 'day' && actionPoints >= 1 && React.createElement('button', {
                    onClick: function () {
                      if (!spendAP(1)) return;
                      var nm = JSON.parse(JSON.stringify(mapData));
                      var exploreRad = researchQueue.indexOf('gravimetrics') >= 0 ? 2 : 1;
                      for (var dy2 = -exploreRad; dy2 <= exploreRad; dy2++) for (var dx2 = -exploreRad; dx2 <= exploreRad; dx2++) {
                        var ni2 = (selectedTile.y + dy2) * mapSize + (selectedTile.x + dx2);
                        if (ni2 >= 0 && ni2 < nm.tiles.length) nm.tiles[ni2].explored = true;
                      }
                      upd('colonyMap', nm);
                      var nr = Object.assign({}, resources);
                      var exploreCost = (activePolicy === 'militarist') ? 0 : 2;
                      nr.energy = Math.max(0, nr.energy - exploreCost); upd('colonyRes', nr);
                      // Terrain resource bonus
                      var terrainBonus = { plains: 'food', mountain: 'materials', volcanic: 'energy', ice: 'water', desert: 'materials', ocean: 'water', radiation: 'science' };
                      var bonusRes = terrainBonus[selectedTile.tile.type];
                      if (bonusRes && nr[bonusRes] !== undefined) { nr[bonusRes] += 2; }
                      // Collect pickup if present
                      var pkKey = selectedTile.x + ',' + selectedTile.y;
                      var pk = mapPickups[pkKey];
                      if (pk) {
                        if (nr[pk.res] !== undefined) nr[pk.res] += pk.amt;
                        upd('colonyRes', nr);
                        var npk = Object.assign({}, mapPickups); delete npk[pkKey]; upd('mapPickups', npk);
                        if (addToast) addToast((pk.rarity === 'epic' ? '\u2B50' : pk.rarity === 'rare' ? '\u2728' : '\u25CF') + ' ' + pk.label, pk.rarity === 'epic' ? 'success' : 'info');
                      }
                      if (addToast) addToast('Explored ' + selectedTile.tile.name + '! (-1 AP)' + (bonusRes ? ' +2 ' + bonusRes : ''), 'info');
                    },
                    className: 'px-3 py-1 rounded-lg text-[10px] font-bold text-white',
                    style: { background: 'linear-gradient(135deg, #4338ca, #6366f1)' }
                  }, '\uD83D\uDDFA Explore (-1\u26A1)')
                )
              ),
              // Anomaly Result
              d.anomalyResult && React.createElement('div', { className: 'bg-gradient-to-r from-purple-900 to-violet-900 rounded-xl p-3 border border-purple-600 mb-3' },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('h4', { className: 'text-sm font-bold text-purple-200' }, (d.anomalyResult.emoji || '\u2728') + ' ' + d.anomalyResult.title),
                  React.createElement('button', { onClick: function () { upd('anomalyResult', null); }, className: 'text-purple-400 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-xs text-purple-100 leading-relaxed' }, d.anomalyResult.description),
                d.anomalyResult.lesson && React.createElement('div', { className: 'mt-2 bg-purple-950 rounded-lg px-3 py-2 text-[10px] text-purple-300 border border-purple-800' },
                  React.createElement('span', { className: 'font-bold text-purple-200' }, '\uD83D\uDCDA Science: '), d.anomalyResult.lesson
                ),
                React.createElement('div', { className: 'flex gap-2 mt-2 text-[11px] flex-wrap' },
                  Object.keys(d.anomalyResult.reward || {}).filter(function (k) { return d.anomalyResult.reward[k] > 0; }).map(function (k) {
                    return React.createElement('span', { key: k, className: 'text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full' }, '+' + d.anomalyResult.reward[k] + ' ' + k);
                  }),
                  d.anomalyResult.terraformBonus > 0 && React.createElement('span', { className: 'text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full' }, '+' + d.anomalyResult.terraformBonus + '% terraform')
                )
              ),
              // Actions
              // ══ ALWAYS-VISIBLE AP ACTION BAR ══
              turnPhase === 'day' && React.createElement('div', { className: 'mb-3 rounded-2xl overflow-hidden', style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', border: '1px solid #334155' } },
                React.createElement('div', { className: 'px-3 pt-3 pb-2 flex items-center justify-between' },
                  React.createElement('div', { className: 'flex items-center gap-2' },
                    React.createElement('span', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600' }, 'Actions'),
                    React.createElement('div', { className: 'flex gap-1' }, Array.from({length:maxAP},function(_,i){return React.createElement('div',{key:i,className:'w-4 h-4 rounded-full transition-all duration-300',style:{background:i<actionPoints?'linear-gradient(135deg,#818cf8,#6366f1)':'#1e293b',boxShadow:i<actionPoints?'0 0 8px rgba(99,102,241,0.5)':'none',border:i<actionPoints?'2px solid #a5b4fc':'2px solid #334155'}})})),
                    React.createElement('span', { className: 'text-xs font-bold', style: { color: actionPoints > 0 ? '#818cf8' : '#475569' } }, actionPoints + '/' + maxAP)
                  ),
                  React.createElement('button', { onClick: function() { upd('turnPhase', 'dusk'); }, className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105', style: { background: 'linear-gradient(135deg, #312e81, #4c1d95)', color: '#c4b5fd', border: '1px solid #6366f140' } }, '\uD83C\uDF19 End Day')
                ),
                React.createElement('div', { className: 'px-3 pb-3 grid grid-cols-4 gap-1.5' },
                  React.createElement('button', { onClick: function() { if(actionPoints<1){if(addToast)addToast('No AP!','error');return;} if(!selectedTile||selectedTile.tile.explored){if(addToast)addToast('Select an unexplored tile!','info');return;} spendAP(1); var nm=JSON.parse(JSON.stringify(mapData)); var er2=1+(researchQueue.indexOf('gravimetrics')>=0?1:0); for(var dy2=-er2;dy2<=er2;dy2++)for(var dx2=-er2;dx2<=er2;dx2++){var ni2=(selectedTile.y+dy2)*mapSize+(selectedTile.x+dx2);if(ni2>=0&&ni2<nm.tiles.length)nm.tiles[ni2].explored=true;} upd('colonyMap',nm); var nr=Object.assign({},resources); var ec2=(activePolicy==='militarist')?0:2; nr.energy=Math.max(0,nr.energy-ec2); var tb={plains:'food',mountain:'materials',volcanic:'energy',ice:'water',desert:'materials',ocean:'water',radiation:'science'}; var br=tb[selectedTile.tile.type]; if(br&&nr[br]!==undefined)nr[br]+=2; var pkK=selectedTile.x+','+selectedTile.y; var pkp=mapPickups[pkK]; if(pkp){nr[pkp.res]=(nr[pkp.res]||0)+pkp.amt;var npk=Object.assign({},mapPickups);delete npk[pkK];upd('mapPickups',npk);if(addToast)addToast((pkp.rarity==='epic'?'\u2B50 EPIC: ':pkp.rarity==='rare'?'\u2728 RARE: ':'')+pkp.label,'info');} upd('colonyRes',nr); if(addToast)addToast('Explored '+selectedTile.tile.name+'!'+(br?' +2 '+br:''),'info'); }, disabled: actionPoints<1||turnPhase!=='day', className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=1?'hover:bg-indigo-900/50 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #33415560'} }, React.createElement('span',{className:'text-lg'},'\uD83D\uDDFA\uFE0F'), React.createElement('span',{className:'text-[11px] font-bold text-slate-300'},'Explore'), React.createElement('span',{className:'text-[7px] text-indigo-400'},'1 AP')),
                  React.createElement('button', { onClick: function() { if(builtThisTurn){if(addToast)addToast('1 build per turn!','info');return;} if(actionPoints<1){if(addToast)addToast('No AP!','error');return;} upd('showBuild',!d.showBuild); }, disabled: actionPoints<1||builtThisTurn, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=1&&!builtThisTurn?'hover:bg-amber-900/30 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #92400e40'} }, React.createElement('span',{className:'text-lg'},'\uD83C\uDFD7\uFE0F'), React.createElement('span',{className:'text-[11px] font-bold text-amber-300'},'Build'), React.createElement('span',{className:'text-[7px] text-amber-500'},builtThisTurn?'Done':'1 AP'), React.createElement('span',{className:'text-[7px] text-slate-500'},buildings.length+'/'+buildingDefs.length)),
                  React.createElement('button', { onClick: function() { if(actionPoints<1){if(addToast)addToast('No AP!','error');return;} upd('showResearch',!d.showResearch); }, disabled: actionPoints<1, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=1?'hover:bg-violet-900/30 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #4c1d9540'} }, React.createElement('span',{className:'text-lg'},'\uD83E\uDDEC'), React.createElement('span',{className:'text-[11px] font-bold text-violet-300'},'Research'), React.createElement('span',{className:'text-[7px] text-violet-500'},'1 AP'), React.createElement('span',{className:'text-[7px] text-slate-500'},researchQueue.length+'/10')),
                  React.createElement('button', { onClick: function() { upd('showSettlers',!d.showSettlers); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-teal-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #0d948440'} }, React.createElement('span',{className:'text-lg'},'\uD83D\uDC65'), React.createElement('span',{className:'text-[11px] font-bold text-teal-300'},'Crew'), React.createElement('span',{className:'text-[7px] text-teal-500'},'Free'), React.createElement('span',{className:'text-[7px] text-slate-500'},settlers.length+' pop')),
                  (buildings.length>=2||activePolicy)&&React.createElement('button', { onClick: function() { upd('showPolicy',!d.showPolicy); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-emerald-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #16a34a40'} }, React.createElement('span',{className:'text-lg'},'\uD83C\uDFDB\uFE0F'), React.createElement('span',{className:'text-[11px] font-bold text-emerald-300'},'Gov'), React.createElement('span',{className:'text-[7px] text-emerald-500'},'Free')),
                  (greatScientists.length>0||buildings.length>=5)&&React.createElement('button', { onClick: function() { upd('showGreatSci',!d.showGreatSci); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-yellow-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #ca8a0440'} }, React.createElement('span',{className:'text-lg'},'\uD83E\uDD16'), React.createElement('span',{className:'text-[11px] font-bold text-yellow-300'},'Mentors'), React.createElement('span',{className:'text-[7px] text-slate-500'},greatScientists.length+'/'+greatSciDefs.length)),
                  (era!=='survival')&&React.createElement('button', { onClick: function() { if(actionPoints<2){if(addToast)addToast('Expeditions cost 2 AP!','error');return;} upd('showExpeditions',!d.showExpeditions); }, disabled:actionPoints<2, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all '+(actionPoints>=2?'hover:bg-cyan-900/30 hover:scale-105':'opacity-40'), style:{background:'#1e293b',border:'1px solid #06b6d440'} }, React.createElement('span',{className:'text-lg'},'\u26F5'), React.createElement('span',{className:'text-[11px] font-bold text-cyan-300'},'Expedition'), React.createElement('span',{className:'text-[7px] text-cyan-500'},'2 AP')),
                  (era!=='survival')&&React.createElement('button', { onClick: function() { upd('showWonders',!d.showWonders); }, className: 'flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all hover:bg-amber-900/30 hover:scale-105', style:{background:'#1e293b',border:'1px solid #b4540040'} }, React.createElement('span',{className:'text-lg'},'\uD83C\uDFDB\uFE0F'), React.createElement('span',{className:'text-[11px] font-bold text-amber-200'},'Wonders'), React.createElement('span',{className:'text-[7px] text-amber-500'},'Free'))
                ),
                React.createElement('div', { className: 'px-3 pb-2 flex gap-1.5 flex-wrap' },
                  React.createElement('button', { onClick: function() { upd('showAchievements',!d.showAchievements); }, className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105', style: d.showAchievements ? { background: 'linear-gradient(135deg, #9f1239, #881337)', color: '#fda4af', border: '1px solid #f43f5e', boxShadow: '0 0 8px rgba(244,63,94,0.3)' } : { background: '#1e293b', color: '#fb7185', border: '1px solid #f43f5e30' } }, '\uD83C\uDFC5 ' + Object.keys(achievements).length + '/' + achievementDefs.length),
                  React.createElement('button', { onClick: function() { upd('showJournal',!d.showJournal); }, className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105', style: d.showJournal ? { background: 'linear-gradient(135deg, #166534, #14532d)', color: '#86efac', border: '1px solid #22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.3)' } : { background: '#1e293b', color: '#4ade80', border: '1px solid #22c55e30' } }, '\uD83D\uDCD6 ' + scienceJournal.length),
                  React.createElement('button', { onClick: function() { upd('showRoverPanel',!d.showRoverPanel); }, className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105', style: d.showRoverPanel ? { background: 'linear-gradient(135deg, #164e63, #155e75)', color: '#67e8f9', border: '1px solid #06b6d4', boxShadow: '0 0 8px rgba(6,182,212,0.3)' } : { background: '#1e293b', color: '#22d3ee', border: '1px solid #06b6d430' } }, '\uD83D\uDE99 ' + rovers.length + ' rovers')
                )
              ),
              // ══ DUSK PHASE OVERLAY ══
              turnPhase === 'dusk' && React.createElement('div', { className: 'mb-4 rounded-2xl overflow-hidden relative', style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)', border: '1px solid #4c1d9540', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'relative p-5' },
                  React.createElement('div', { className: 'text-center mb-4' },
                    React.createElement('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF19'),
                    React.createElement('h2', { className: 'text-xl font-bold text-indigo-200' }, 'Dusk \u2014 Turn ' + turn + ' Ending'),
                    React.createElement('div', { className: 'text-[10px] text-indigo-400' }, 'The fate of your colony hangs in the balance...')
                  ),
                  React.createElement('div', { className: 'bg-black/30 rounded-xl p-4 mb-4 text-center border border-indigo-800/30' },
                    React.createElement('div', { className: 'text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\uD83C\uDFB2 Fate Roll'),
                    !fateRoll && React.createElement('button', { onClick: function() { var roll=performFateRoll(); upd('fateAnimating',true); upd('fateRoll',roll); setTimeout(function(){upd('fateAnimating',false);},1500); }, className: 'px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105', style: { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 15px rgba(99,102,241,0.4)', animation: 'kp-pulse 2s infinite' } }, '\uD83C\uDFB2 Roll the Dice!'),
                    fateRoll && React.createElement('div', { style: { animation: fateAnimating ? 'kp-fateRoll 1.5s ease-out' : 'none' } },
                      React.createElement('div', { className: 'text-5xl mb-2', style: { filter: fateAnimating ? 'blur(2px)' : 'none', transition: 'filter 0.5s' } }, fateRoll.result.icon),
                      React.createElement('div', { className: 'text-3xl font-black mb-1', style: { color: fateRoll.result.color, textShadow: '0 0 20px ' + fateRoll.result.color + '60' } }, fateRoll.modified),
                      React.createElement('div', { className: 'text-sm font-bold', style: { color: fateRoll.result.color } }, fateRoll.result.label),
                      fateRoll.bonus > 0 && React.createElement('div', { className: 'text-[11px] text-indigo-400 mt-1' }, '\uD83C\uDFD7 Buildings bonus: +' + fateRoll.bonus + ' (' + fateRoll.raw + ' \u2192 ' + fateRoll.modified + ')'),
                      React.createElement('div', { className: 'mt-3 text-[10px] text-slate-300 bg-indigo-950/50 rounded-lg p-2 border border-indigo-800/30' }, fateRoll.result.type==='disaster'?'\uD83D\uDCA5 Catastrophe! Heavy resource losses.':fateRoll.result.type==='hazard'?'\u26A0\uFE0F Hazard damaged some resources.':fateRoll.result.type==='challenge'?'\uD83C\uDFAF A challenge, but you weathered it.':fateRoll.result.type==='calm'?'\u2600\uFE0F Peaceful day. All nominal.':fateRoll.result.type==='discovery'?'\uD83D\uDD0D Settlers discovered something valuable!':fateRoll.result.type==='windfall'?'\uD83C\uDF81 Windfall! Extra resources!':fateRoll.result.type==='settlers'?'\uD83D\uDE80 Transport brought new colonists!':'\u2B50 LEGENDARY boon!')
                    )
                  ),
                  fateRoll && !fateAnimating && React.createElement('button', {
                    onClick: function () {
                      var nt = turn + 1; var nr2 = Object.assign({}, resources);
                    var _preRes = { food: nr2.food, energy: nr2.energy, water: nr2.water, materials: nr2.materials, science: nr2.science };
                    buildings.forEach(function (b) {
                      var def = buildingDefs.find(function (bd) { return bd.id === b; });
                      if (def) {
                        var eff = (buildingEff[b] !== undefined ? buildingEff[b] : 100) / 100;
                        // Season multipliers
                        var sMult = activeSeason.effect.allMult || 1;
                        // Nanotech research: min 75% efficiency
                        if (researchQueue.indexOf('nanotech') >= 0 && eff < 0.75) eff = 0.75;
                        Object.keys(def.production).forEach(function (k) {
                          var val2 = Math.round(def.production[k] * eff * sMult);
                          if (k === 'food' && activeSeason.effect.foodMult) val2 = Math.round(val2 * activeSeason.effect.foodMult);
                          if (k === 'water' && activeSeason.effect.waterMult) val2 = Math.round(val2 * activeSeason.effect.waterMult);
                          nr2[k] = (nr2[k] || 0) + val2;
                        });
                      }
                    });
                    nr2.food = Math.max(0, nr2.food - settlers.length);
                    // Terraforming progress
                    var tfGain = buildings.indexOf('atmo') >= 0 ? 2 : 0;
                    tfGain += buildings.indexOf('biodome') >= 0 ? 3 : 0;
                    tfGain += buildings.indexOf('hydroponics') >= 0 ? 0.5 : 0;
                    tfGain += buildings.indexOf('greenhouse') >= 0 ? 1 : 0;
                    tfGain += buildings.indexOf('oceanSeeder') >= 0 ? 1.5 : 0;
                    var newTf = Math.min(100, (d.colonyTerraform || 0) + tfGain);
                    upd('colonyTerraform', newTf);
                    // Med Bay heals settlers
                    if (buildings.indexOf('medbay') >= 0) {
                      upd('colonySettlers', settlers.map(function (s4) { return Object.assign({}, s4, { health: Math.min(100, s4.health + 5) }); }));
                    }
                    // Weather hazard (random)
                    var weatherTypes = [null, null, null, null, // 4/7 = calm
                      { name: 'Dust Storm', icon: '\uD83C\uDF2A\uFE0F', effect: 'Materials production halved', res: 'materials', penalty: -2 },
                      { name: 'Solar Flare', icon: '\u2604\uFE0F', effect: 'Energy surge! Equipment overloaded', res: 'energy', penalty: -3 },
                      { name: 'Ice Rain', icon: '\uD83C\uDF28\uFE0F', effect: 'Frozen pipes, water loss', res: 'water', penalty: -2 }
                    ];
                    var wIdx = Math.floor(Math.random() * weatherTypes.length);
                    var wx = weatherTypes[wIdx];
                    upd('colonyWeather', wx);
                    if (wx) {
                      var weatherPenalty = wx.penalty;
                      if (buildings.indexOf('shield') >= 0) weatherPenalty = Math.ceil(weatherPenalty / 2);
                      nr2[wx.res] = Math.max(0, nr2[wx.res] + weatherPenalty);
                    }
                    // Colony milestones
                    var milestones = [
                      { id: 'first_build', check: buildings.length >= 1, text: '\uD83C\uDFD7 First Construction!', xp: 15 },
                      { id: 'tier2', check: buildings.indexOf('lab') >= 0 || buildings.indexOf('medbay') >= 0, text: '\uD83D\uDD2C Tier 2 Unlocked!', xp: 25 },
                      { id: 'tier3', check: buildings.indexOf('atmo') >= 0 || buildings.indexOf('fusion') >= 0, text: '\u2622\uFE0F Advanced Tech!', xp: 40 },
                      { id: 'self_sustain', check: nr2.food >= 30 && nr2.energy >= 30 && nr2.water >= 30, text: '\uD83C\uDF3E Self-Sustaining!', xp: 30 },
                      { id: 'full_colony', check: buildings.length >= 8, text: '\uD83C\uDFD9\uFE0F Full Colony!', xp: 50 },
                      { id: 'pop20', check: settlers.length >= 20, text: '\uD83D\uDC65 20 Settlers!', xp: 40 },
                      { id: 'pop35', check: settlers.length >= 35, text: '\uD83C\uDFD8\uFE0F Thriving Town!', xp: 60 },
                      { id: 'pop50', check: settlers.length >= 50, text: '\uD83C\uDFD9\uFE0F Population Victory!', xp: 100 },
                      { id: 'research5', check: researchQueue.length >= 5, text: '\uD83E\uDDEC Half Researched!', xp: 40 },
                      { id: 'research10', check: researchQueue.length >= 10, text: '\uD83C\uDF1F Research Victory!', xp: 100 },
                      { id: 'allbuildings', check: buildings.length >= 16, text: '\uD83C\uDFD7\uFE0F Master Builder!', xp: 80 },
                      { id: 'terraform25', check: newTf >= 25, text: '\uD83C\uDF27\uFE0F First Clouds!', xp: 20 },
                      { id: 'terraform50', check: newTf >= 50, text: '\uD83C\uDF31 Microorganisms!', xp: 30 },
                      { id: 'terraform75', check: newTf >= 75, text: '\uD83C\uDF24\uFE0F Atmosphere Forming!', xp: 40 },
                      { id: 'master', check: stats.questionsAnswered >= 10 && stats.correct / Math.max(1, stats.questionsAnswered) >= 0.8, text: '\uD83C\uDFAF Science Master!', xp: 50 }
                    ];
                    var achieved = d.colonyMilestones || {};
                    milestones.forEach(function (ms) {
                      if (ms.check && !achieved[ms.id]) {
                        achieved[ms.id] = true;
                        if (addToast) addToast(ms.text, 'success');
                        if (d.colonyTTS) colonySpeak('Milestone achieved. ' + ms.text.replace(/[^a-zA-Z0-9 ]/g, ''), 'narrator');
                        if (typeof addXP === 'function') addXP(ms.xp, ms.text);
                        var nl9 = gameLog.slice(); nl9.push('\uD83C\uDFC6 ' + ms.text); upd('colonyLog', nl9);
                      }
                    });
                    upd('colonyMilestones', achieved);
                    // Maintenance challenge every 8 turns (if buildings exist)
                    if (buildings.length > 0 && (nt - (d.lastMaintTurn || 0)) >= 8) {
                      upd('lastMaintTurn', nt);
                      // Pick a random built building for maintenance
                      var maintBuild = buildings[Math.floor(Math.random() * buildings.length)];
                      var maintDef = buildingDefs.find(function (bd3) { return bd3.id === maintBuild; });
                      if (maintDef) {
                        upd('maintChallengeLoading', true);
                        var modeStr = (d.colonyMode || 'mcq') === 'mcq' ? 'Return ONLY valid JSON: {"question":"<science question about ' + maintDef.gate + '>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<why correct, 2-3 sentences with real science>"}. Generate exactly 6 options. Shuffle correct answer randomly (position 0-5). correctIndex must match.' : 'Return ONLY valid JSON: {"question":"<science question about ' + maintDef.gate + '>","answer":"<correct answer, 1-3 words>","explanation":"<why correct, 2-3 sentences with real science>"}';
                        callGemini('Generate a ' + maintDef.gate + ' science question for maintaining the ' + maintDef.name + ' in a space colony on an alien planet. The question should test understanding of the science behind this building. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. ' + modeStr, true).then(function (result) {
                          try {
                            var cl2 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                            var s3 = cl2.indexOf('{'); if (s3 > 0) cl2 = cl2.substring(s3);
                            var e3 = cl2.lastIndexOf('}'); if (e3 > 0) cl2 = cl2.substring(0, e3 + 1);
                            var mq = JSON.parse(cl2);
                            mq.building = maintBuild; mq.buildingName = maintDef.name; mq.buildingIcon = maintDef.icon;
                            upd('maintChallenge', mq); upd('maintChallengeLoading', false);
                            if (d.colonyTTS) colonySpeak('Maintenance alert. Your ' + maintDef.name + ' requires a systems check. Answer the science challenge to maintain full output.', 'narrator');
                            var nl7 = gameLog.slice(); nl7.push('\uD83D\uDD27 Turn ' + nt + ': ' + maintDef.icon + ' ' + maintDef.name + ' needs maintenance!'); upd('colonyLog', nl7);
                          } catch (err) { upd('maintChallengeLoading', false); }
                        }).catch(function () { upd('maintChallengeLoading', false); });
                      }
                    }
                    nr2.water = Math.max(0, nr2.water - Math.ceil(settlers.length * 0.5));
                    // Turn Summary — compute deltas
                    var _turnSummary = {
                      turn: nt,
                      deltas: {
                        food: nr2.food - _preRes.food,
                        energy: nr2.energy - _preRes.energy,
                        water: nr2.water - _preRes.water,
                        materials: nr2.materials - _preRes.materials,
                        science: nr2.science - _preRes.science
                      },
                      weather: wx ? wx.name : null,
                      terraform: newTf,
                      tfGain: tfGain,
                      happiness: newHappy,
                      population: settlers.length,
                      era: era,
                      events: []
                    };
                    if (wx) _turnSummary.events.push(wx.icon + ' ' + wx.name);
                    if (newHappy < 30) _turnSummary.events.push('\uD83D\uDE21 Colony Unrest');
                    if (newHappy > 80) _turnSummary.events.push('\u2728 Golden Age');
                    upd('turnSummary', _turnSummary);
                    // ══ Apply Fate Roll Effects ══
                    if (fateRoll) {
                      var ft = fateRoll.result.type;
                      if (ft === 'disaster') { nr2.food -= 5; nr2.energy -= 5; nr2.water -= 3; nr2.materials -= 3; }
                      else if (ft === 'hazard') { nr2.food -= 3; nr2.energy -= 2; }
                      else if (ft === 'challenge') { var rk = ['food','energy','water','materials'][Math.floor(Math.random()*4)]; nr2[rk] -= 1; }
                      else if (ft === 'discovery') { nr2.science += 3; nr2.materials += 2; }
                      else if (ft === 'windfall') { nr2.food += 5; nr2.energy += 5; nr2.water += 3; nr2.materials += 3; }
                      else if (ft === 'settlers') {
                        var newNames = ['Dr. Nova','Eng. Cosmos','Sci. Orbit','Med. Luna','Cap. Vega','Prof. Zenith','Lt. Pulsar'];
                        var newRoles = ['Xenobiologist','Roboticist','Geologist','Surgeon','Pilot','Astrophysicist','Tactician'];
                        var ni = Math.floor(Math.random() * newNames.length);
                        var ns2 = settlers.slice(); ns2.push({ name: newNames[ni], role: newRoles[ni], icon: ['\uD83E\uDDD1\u200D\uD83D\uDD2C','\uD83E\uDDD1\u200D\uD83D\uDE80','\uD83E\uDDD1\u200D\uD83C\uDFED','\uD83E\uDDD1\u200D\u2695\uFE0F'][ni%4], morale: 80 });
                        upd('colonySettlers', ns2);
                        if (addToast) addToast('\uD83D\uDE80 New settler: ' + newNames[ni] + ' (' + newRoles[ni] + ')!', 'success');
                      }
                      else if (ft === 'jackpot') { nr2.food += 8; nr2.energy += 8; nr2.water += 8; nr2.materials += 8; nr2.science += 5; }
                      ['food','energy','water','materials','science'].forEach(function(rk2) { if (nr2[rk2] < 0) nr2[rk2] = 0; });
                    }
                    // ══ Generate Dawn Data for Next Turn ══
                    var _incomeDeltas = { food: nr2.food - _preRes.food, energy: nr2.energy - _preRes.energy, water: nr2.water - _preRes.water, materials: nr2.materials - _preRes.materials, science: nr2.science - _preRes.science };
                    var _discovery = Math.random() < 0.2 ? [
                      { icon: '\uD83D\uDD2D', label: 'Stellar Anomaly', desc: 'Telescopes detect unusual radiation patterns.' },
                      { icon: '\uD83E\uDDA0', label: 'Microbe Colony', desc: 'Alien microorganisms found in soil samples!' },
                      { icon: '\uD83D\uDC8E', label: 'Crystal Formation', desc: 'Energy-dense crystals detected underground.' },
                      { icon: '\uD83C\uDF0B', label: 'Thermal Vent', desc: 'A geothermal hotspot for energy harvesting.' },
                      { icon: '\uD83D\uDDFF', label: 'Ancient Marker', desc: 'A structure of unknown origin uncovered.' }
                    ][Math.floor(Math.random() * 5)] : null;
                    upd('dawnData', { turn: nt, income: _incomeDeltas, weather: wx ? wx.name : null, discovery: _discovery, isFirst: false });
                    upd('turnPhase', 'dawn'); upd('actionPoints', maxAP); upd('builtThisTurn', false);
                    upd('fateRoll', null); upd('fateAnimating', false);
                    upd('colonyRes', nr2); upd('colonyTurn', nt); upd('colonyEventLoading', true);
                    var ctx2 = 'Colony on Kepler-442b, turn ' + nt + '. Resources: food=' + nr2.food + ' energy=' + nr2.energy + ' water=' + nr2.water + ' materials=' + nr2.materials + ' science=' + nr2.science + '. Buildings: ' + (buildings.length > 0 ? buildings.join(', ') : 'none') + '. ' + settlers.length + ' settlers. Terraforming: ' + newTf + '%. ' + (wx ? 'Current weather: ' + wx.name + '. ' : 'Weather: calm. ') + 'Tech tier reached: ' + (buildings.indexOf('biodome') >= 0 ? 4 : buildings.indexOf('atmo') >= 0 || buildings.indexOf('fusion') >= 0 ? 3 : buildings.indexOf('lab') >= 0 || buildings.indexOf('medbay') >= 0 ? 2 : buildings.length > 0 ? 1 : 0) + '.';
                    callGemini('You are the AI game master for an educational space colony on an alien planet. Target audience: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Colony values: collectivism=' + colonyValues.collectivism + ', innovation=' + colonyValues.innovation + ', ecology=' + colonyValues.ecology + ', tradition=' + colonyValues.tradition + ', openness=' + colonyValues.openness + '. Equity: ' + equity + '/100. Sometimes let colony values influence event themes (high ecology = nature events, high tradition = cultural discovery events, low equity = social tension events). ' + ctx2 + '\n\nGenerate a planet event. Include a REAL science concept. Return ONLY valid JSON:\n{"emoji":"<emoji>","title":"<event>","description":"<2-3 sentences>","lesson":"<real science concept, 2-3 sentences>","choices":[{"label":"<choice>","effects":{"food":<n>,"energy":<n>,"water":<n>,"materials":<n>,"science":<n>,"morale":<n>},"outcome":"<result>"},{"label":"<choice>","effects":{"food":<n>,"energy":<n>,"water":<n>,"materials":<n>,"science":<n>,"morale":<n>},"outcome":"<result>"}]}\n\nEvents: alien microbes, geologic discoveries, meteor showers, equipment failures, resource finds, atmospheric anomalies, alien ruins. Effects: -5 to +10 resources, -15 to +15 morale. One choice should reward scientific knowledge.', true).then(function (result) {
                      try {
                        var cl = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim(); var s2 = cl.indexOf('{'); if (s2 > 0) cl = cl.substring(s2); var e2 = cl.lastIndexOf('}'); if (e2 > 0) cl = cl.substring(0, e2 + 1);
                        var parsed = JSON.parse(cl); upd('colonyEvent', parsed); upd('colonyEventLoading', false);
                        if (d.colonyTTS) colonySpeak(parsed.title + '. ' + parsed.description, 'narrator');
                        var nl2 = gameLog.slice(); nl2.push('Turn ' + nt + ': ' + (parsed.emoji || '') + ' ' + parsed.title); upd('colonyLog', nl2);
                      } catch (err) { upd('colonyEventLoading', false); if (addToast) addToast('Event failed to generate', 'error'); }
                    }).catch(function () { upd('colonyEventLoading', false); });
                    var ns5 = Object.assign({}, stats); ns5.turnsPlayed++; upd('colonyStats', ns5);
                    if (typeof addXP === 'function') addXP(5, 'Kepler Colony: Turn ' + nt);
                    // Rover per-turn processing
                    if (rovers.length > 0) {
                      var nrvs2 = rovers.map(function (rv2) {
                        var rvDef2 = getRoverDef(rv2.type);
                        var newRv = Object.assign({}, rv2);
                        // Reset moves each turn
                        newRv.movesLeft = rvDef2.maxMoves;
                        // Natural fuel regen +1
                        newRv.fuel = Math.min(rvDef2.maxFuel, newRv.fuel + 1);
                        newRv.status = 'idle';
                        // Science rover auto-collect
                        if (rv2.type === 'science' && mapData) {
                          var rvTile = mapData.tiles[rv2.y * mapSize + rv2.x];
                          if (rvTile && rvTile.explored) {
                            nr2.science = (nr2.science || 0) + 2;
                            var bonusType = rvTile.res;
                            if (bonusType && bonusType !== 'none' && nr2[bonusType] !== undefined) {
                              nr2[bonusType] += 1;
                            }
                          }
                        }
                        return newRv;
                      });
                      upd('colonyRovers', nrvs2);
                    }
                    // Population growth — food surplus attracts new settlers (Civ-inspired)
                    var foodSurplus = nr2.food - settlers.length * 2; // need 2x population in food
                    var growthRate = 0.15 + (activePolicy && activePolicy === 'agrarian' ? 0.075 : 0);
                    if (buildings.indexOf('spaceport') >= 0) growthRate += 0.1;
                    if (buildings.indexOf('cloning') >= 0) growthRate += 0.05;
                    if (foodSurplus > 0) {
                      var newPG = (d.colonyPopGrowth || 0) + growthRate;
                      if (newPG >= 1.0 && settlers.length < 50) {
                        // New settler arrives!
                        var newRoles = [
                          { name: 'Lt. Alex Rivera', role: 'Pilot', icon: '\u2708\uFE0F', specialty: 'physics' },
                          { name: 'Dr. Sarah Kim', role: 'Xenobiologist', icon: '\uD83E\uDDA0', specialty: 'biology' },
                          { name: 'Prof. Dimitri Volkov', role: 'Mathematician', icon: '\uD83D\uDCCA', specialty: 'math' },
                          { name: 'Eng. Fatima Hassan', role: 'Architect', icon: '\uD83C\uDFD7\uFE0F', specialty: 'geology' },
                          { name: 'Dr. Li Wei', role: 'Astronomer', icon: '\uD83D\uDD2D', specialty: 'physics' },
                          { name: 'Dr. Amara Osei', role: 'Biochemist', icon: '\uD83E\uDDEA', specialty: 'chemistry' },
                          { name: 'Sgt. Kofi Mensah', role: 'Security', icon: '\uD83D\uDEE1\uFE0F', specialty: 'geology' },
                          { name: 'Dr. Lucia Torres', role: 'Physician', icon: '\u2695\uFE0F', specialty: 'biology' },
                          { name: 'Dr. Hans Mueller', role: 'Climatologist', icon: '\uD83C\uDF0A', specialty: 'chemistry' },
                          { name: 'Eng. Priya Nair', role: 'Roboticist', icon: '\uD83E\uDD16', specialty: 'physics' },
                          { name: 'Dr. Jun Sato', role: 'Volcanologist', icon: '\uD83C\uDF0B', specialty: 'geology' },
                          { name: 'Prof. Anya Petrov', role: 'Astrophysicist', icon: '\u2B50', specialty: 'physics' },
                          { name: 'Dr. Maria Santos', role: 'Ecologist', icon: '\uD83C\uDF3F', specialty: 'biology' },
                          { name: 'Eng. David Park', role: 'Structural Eng.', icon: '\uD83C\uDFD7\uFE0F', specialty: 'math' },
                          { name: 'Dr. Fatou Diallo', role: 'Geneticist', icon: '\uD83E\uDDEC', specialty: 'biology' },
                          { name: 'Lt. Ivan Kozlov', role: 'Navigator', icon: '\uD83E\uDDED', specialty: 'math' },
                          { name: 'Dr. Aiko Tanabe', role: 'Microbiologist', icon: '\uD83E\uDDA0', specialty: 'biology' },
                          { name: 'Eng. Omar Ali', role: 'Energy Eng.', icon: '\u26A1', specialty: 'physics' },
                          { name: 'Dr. Elena Popova', role: 'Hydrologist', icon: '\uD83D\uDCA7', specialty: 'chemistry' },
                          { name: 'Prof. Chen Guang', role: 'Seismologist', icon: '\uD83C\uDF0D', specialty: 'geology' },
                          { name: 'Dr. Sofia Romano', role: 'Botanist II', icon: '\uD83C\uDF3A', specialty: 'biology' },
                          { name: 'Eng. James Okafor', role: 'Systems Eng.', icon: '\u2699\uFE0F', specialty: 'math' },
                          { name: 'Dr. Mei Lin', role: 'Pharmacologist', icon: '\uD83D\uDC8A', specialty: 'chemistry' },
                          { name: 'Lt. Rosa Martinez', role: 'Comms Officer', icon: '\uD83D\uDCE1', specialty: 'physics' }
                        ];
                        var available = newRoles.filter(function (nr7) { return !settlers.some(function (s5) { return s5.name === nr7.name; }); });
                        if (available.length > 0) {
                          var newSettler = Object.assign({}, available[Math.floor(Math.random() * available.length)], { morale: 85, health: 100 });
                          var updSettlers = settlers.slice(); updSettlers.push(newSettler);
                          upd('colonySettlers', updSettlers);
                          var nl13 = gameLog.slice(); nl13.push('\uD83D\uDC64 ' + newSettler.name + ' (' + newSettler.role + ') joined the colony!'); upd('colonyLog', nl13);
                          if (addToast) addToast('\uD83D\uDC64 New settler: ' + newSettler.name + ' (' + newSettler.role + ')!', 'success');
                          if (d.colonyTTS) colonySpeak('New colonist arrived. ' + newSettler.name + ', a ' + newSettler.role + ', has joined the team.', 'narrator');
                        }
                        newPG -= 1.0;
                      }
                      upd('colonyPopGrowth', newPG);
                    }

                    // Era progression
                    var newEra = era;
                    if (era === 'survival' && buildings.length >= 4 && settlers.length >= 8) newEra = 'expansion';
                    else if (era === 'expansion' && buildings.length >= 8 && newTf >= 30 && researchQueue.length >= 3) newEra = 'prosperity';
                    else if (era === 'prosperity' && buildings.length >= 14 && newTf >= 60 && settlers.length >= 25) newEra = 'transcendence';
                    if (newEra !== era) {
                      upd('colonyEra', newEra);
                      var eraInfo = eraData[newEra];
                      if (addToast) addToast(eraInfo.icon + ' ERA: ' + eraInfo.name + '!', 'success');
                      if (d.colonyTTS) colonySpeak('New era reached! The colony has entered the ' + eraInfo.name + ' era.', 'narrator');
                      var nl14 = gameLog.slice(); nl14.push('\uD83C\uDF1F ERA: ' + eraInfo.name + '!'); upd('colonyLog', nl14);
                      if (typeof addXP === 'function') addXP(40, 'Era: ' + eraInfo.name);
                    }

                    // Colony Charter (generated once at turn 20 from colony values)
                    if (nt === 20 && !d.colonyCharter) {
                      callGemini('Generate a founding charter for a space colony on planet Kepler-442b. The colony has these values: collectivism=' + colonyValues.collectivism + ', innovation=' + colonyValues.innovation + ', ecology=' + colonyValues.ecology + ', tradition=' + colonyValues.tradition + ', openness=' + colonyValues.openness + '. Equity: ' + equity + '. They have adopted these cultural traditions: ' + (traditions.length > 0 ? traditions.join(', ') : 'none yet') + '. Write a brief founding charter (4-5 sentences) that reflects these values. It should feel like a real historical document — inspirational, specific, and grounded in the colony\u2019s unique blend of cultures and science. Do NOT use bullet points. Write it as flowing prose.', true).then(function (charter) {
                        upd('colonyCharter', charter);
                        if (d.colonyTTS) colonySpeak('The colony charter has been drafted. A founding document for a new civilization.', 'narrator');
                        var nl29 = gameLog.slice(); nl29.push('\uD83D\uDCDC Colony Charter drafted!'); upd('colonyLog', nl29);
                        if (addToast) addToast('\uD83D\uDCDC Colony Charter drafted from your values!', 'success');
                        if (typeof addXP === 'function') addXP(30, 'Colony Charter');
                      });
                    }

                    // Alien first contact (turn 10+, once)
                    if (nt >= 10 && !d.alienContact && Math.random() < 0.3) {
                      upd('alienContact', true); upd('alienRelations', 0);
                      var nl18 = gameLog.slice(); nl18.push('\uD83D\uDC7E FIRST CONTACT: The Keth\u2019ora detected!'); upd('colonyLog', nl18);
                      if (addToast) addToast('\uD83D\uDC7E First Contact! An alien species has been detected!', 'success');
                      if (d.colonyTTS) colonySpeak('Alert! Alien life detected. The indigenous Kethora species has made contact. They communicate through bioluminescent patterns.', 'narrator');
                      if (typeof addXP === 'function') addXP(50, 'First Contact!');
                    }

                    // Governance Dilemma (NationStates-style — every 5 turns)
                    if (nt > 2 && nt % 5 === 0 && !d.activeDilemma) {
                      var valStr = Object.keys(colonyValues).map(function (k2) { return k2 + ':' + colonyValues[k2]; }).join(', ');
                      upd('dilemmaLoading', true);
                      callGemini('You are creating a governance dilemma for a space colony on alien planet Kepler-442b. Colony values: ' + valStr + '. Equity: ' + equity + '/100. Population: ' + settlers.length + '. This colony values diverse knowledge traditions. Create a nuanced moral/political/cultural dilemma with NO clear right answer (like NationStates). The dilemma should involve balancing competing goods (e.g. innovation vs tradition, individual freedom vs collective welfare, rapid growth vs sustainability, scientific progress vs cultural preservation). Sometimes draw on wisdom from real-world cultural traditions (African, Indigenous, Asian, etc.) as viable solutions. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Return ONLY valid JSON: {"emoji":"<emoji>","title":"<dilemma>","description":"<3-4 sentence scenario>","choices":[{"text":"<choice A>","values":{"collectivism":<-10 to 10>,"innovation":<-10 to 10>,"ecology":<-10 to 10>,"tradition":<-10 to 10>,"openness":<-10 to 10>},"equity":<-10 to 10>,"happiness":<-5 to 5>,"outcome":"<1-2 sentence result>"},{"text":"<choice B>","values":{same},"equity":<-10 to 10>,"happiness":<-5 to 5>,"outcome":"<result>"},{"text":"<choice C>","values":{same},"equity":<-10 to 10>,"happiness":<-5 to 5>,"outcome":"<result>"}],"lesson":"<real social science or cultural insight, 2-3 sentences>"}', true).then(function (result) {
                        try {
                          var cl7 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                          var s8 = cl7.indexOf('{'); if (s8 > 0) cl7 = cl7.substring(s8);
                          var e8 = cl7.lastIndexOf('}'); if (e8 > 0) cl7 = cl7.substring(0, e8 + 1);
                          var dil = JSON.parse(cl7);
                          upd('activeDilemma', dil); upd('dilemmaLoading', false);
                          if (d.colonyTTS) colonySpeak('Colony council convenes. ' + dil.title + '. ' + dil.description, 'narrator');
                          var nl25 = gameLog.slice(); nl25.push('\uD83C\uDFDB\uFE0F Dilemma: ' + dil.title); upd('colonyLog', nl25);
                        } catch (err) { upd('dilemmaLoading', false); }
                      }).catch(function () { upd('dilemmaLoading', false); });
                    }

                    // Major disaster (rare — every ~20 turns)
                    if (nt > 1 && nt % 20 === 0 && Math.random() < 0.5) {
                      upd('disasterLoading', true);
                      callGemini('Generate a MAJOR disaster event for a space colony on alien planet Kepler-442b. Turn ' + nt + '. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. The disaster should be science-based (asteroid impact, volcanic eruption, alien plague, equipment catastrophe, radiation storm). Return ONLY valid JSON: {"emoji":"<emoji>","title":"<disaster name>","description":"<dramatic 3-4 sentences>","lesson":"<real science about this type of disaster, 2-3 sentences>","question":"<science question to mitigate damage>","options":["<correct mitigation>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"fullDamage":{"food":<-5 to -15>,"energy":<-5 to -15>,"water":<-5 to -15>,"materials":<-5 to -15>,"morale":<-10 to -20>},"mitigatedDamage":{"food":<0 to -5>,"energy":<0 to -5>,"water":<0 to -5>,"materials":<0 to -5>,"morale":<-3 to -8>}}. Shuffle correct answer (0-5).', true).then(function (result) {
                        try {
                          var cl6 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                          var s7 = cl6.indexOf('{'); if (s7 > 0) cl6 = cl6.substring(s7);
                          var e7 = cl6.lastIndexOf('}'); if (e7 > 0) cl6 = cl6.substring(0, e7 + 1);
                          var dis = JSON.parse(cl6);
                          upd('activeDisaster', dis); upd('disasterLoading', false);
                          var nl24 = gameLog.slice(); nl24.push('\uD83D\uDCA5 DISASTER: ' + dis.title + '!'); upd('colonyLog', nl24);
                          if (d.colonyTTS) colonySpeak('Emergency alert! ' + dis.title + '! ' + dis.description, 'narrator');
                        } catch (err) { upd('disasterLoading', false); }
                      }).catch(function () { upd('disasterLoading', false); });
                    }

                    // Happiness mechanic
                    var newHappy = d.colonyHappiness || 70;
                    if (nr2.food > settlers.length * 2) newHappy = Math.min(100, newHappy + 2);
                    else if (nr2.food < settlers.length) newHappy = Math.max(0, newHappy - 5);
                    if (buildings.indexOf('medbay') >= 0) newHappy = Math.min(100, newHappy + 1);
                    var avgMorale = settlers.reduce(function (sum, s6) { return sum + s6.morale; }, 0) / Math.max(1, settlers.length);
                    if (avgMorale < 50) newHappy = Math.max(0, newHappy - 3);
                    if (wx) newHappy = Math.max(0, newHappy - 2);
                    upd('colonyHappiness', newHappy);

                    // Happiness affects production (Civ-style)
                    if (newHappy < 30) {
                      // Unrest — 50% production penalty
                      nr2.food = Math.max(0, Math.floor(nr2.food * 0.8));
                      nr2.materials = Math.max(0, Math.floor(nr2.materials * 0.8));
                      if (addToast) addToast('\uD83D\uDE21 Colony unrest! Production reduced!', 'warning');
                    } else if (newHappy > 80) {
                      // Golden age — bonus production
                      nr2.science += 2;
                      nr2.food += 1;
                    }

                    // Achievement check
                    var newAch = Object.assign({}, achievements);
                    var achChanged = false;
                    achievementDefs.forEach(function (ad) {
                      if (!newAch[ad.id] && ad.check()) {
                        newAch[ad.id] = { turn: nt, ts: Date.now() };
                        achChanged = true;
                        if (addToast) addToast(ad.icon + ' Achievement: ' + ad.name + '!', 'success');
                        if (d.colonyTTS) colonySpeak('Achievement unlocked. ' + ad.name + '. ' + ad.desc, 'narrator');
                        var nl31 = gameLog.slice(); nl31.push(ad.icon + ' Achievement: ' + ad.name); upd('colonyLog', nl31);
                        if (typeof addXP === 'function') addXP(20, 'Achievement: ' + ad.name);
                      }
                    });
                    if (achChanged) upd('colonyAchievements', newAch);

                    // Streak tracking
                    var ns9 = Object.assign({}, stats);
                    if (!ns9.streak) ns9.streak = 0;
                    upd('colonyStats', ns9);

                    // Colony Radio — AI broadcast every 8 turns
                    if (nt > 3 && nt % 8 === 0) {
                      callGemini('You are the radio host for a space colony called "' + colonyName + '" on planet Kepler-442b. Give a brief radio news broadcast (3-4 sentences) reporting on recent colony events. Turn: ' + nt + '. Population: ' + settlers.length + '. Buildings: ' + buildings.length + '. Terraform: ' + terraform + '%. Era: ' + era + '. Season: ' + ((seasonDefs[(seasonCycle || {}).index] || {}).name || 'Calm') + '. Recent events from log: ' + gameLog.slice(-5).join('; ') + '. Make it feel like a real news broadcast — upbeat, informative, with a sign-off. Grade level: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (broadcast) {
                        upd('colonyRadio', broadcast);
                        if (d.colonyTTS) colonySpeak(broadcast, 'narrator');
                      });
                    }

                    // Settler celebrations (happiness > 85) or protests (happiness < 25)
                    if (newHappy > 85 && nt % 10 === 0) {
                      var nl32 = gameLog.slice(); nl32.push('\uD83C\uDF89 Colony Celebration! Settlers throw a festival!'); upd('colonyLog', nl32);
                      if (addToast) addToast('\uD83C\uDF89 Colony Celebration! +5 happiness, +10 XP!', 'success');
                      newHappy = Math.min(100, newHappy + 5); upd('colonyHappiness', newHappy);
                      if (typeof addXP === 'function') addXP(10, 'Colony Festival');
                    } else if (newHappy < 25 && nt % 7 === 0) {
                      var nl33 = gameLog.slice(); nl33.push('\u270A Settler Protest! Demanding better conditions!'); upd('colonyLog', nl33);
                      if (addToast) addToast('\u270A Settler Protest! Productivity drops!', 'warning');
                      nr2.food = Math.max(0, nr2.food - 3); nr2.materials = Math.max(0, nr2.materials - 3);
                    }

                    // Great Scientist arrival (every 15 turns + high science)
                    if (nt % 15 === 0 && nr2.science >= 10 && greatScientists.length < greatSciDefs.length) {
                      var availGS = greatSciDefs.filter(function (gs) { return !greatScientists.some(function (g) { return g.name === gs.name; }); });
                      if (availGS.length > 0) {
                        var gs2 = availGS[Math.floor(Math.random() * availGS.length)];
                        var updGS = greatScientists.slice(); updGS.push(gs2);
                        upd('colonyGreatSci', updGS);
                        // Apply bonus permanently
                        if (gs2.bonus && nr2[gs2.bonus] !== undefined) nr2[gs2.bonus] += gs2.amount;
                        var nl15 = gameLog.slice(); nl15.push('\uD83E\uDD16 Mentor: ' + gs2.name + ' AI activated (+' + gs2.amount + ' ' + gs2.bonus + '/turn)'); upd('colonyLog', nl15);
                        if (addToast) addToast('\uD83E\uDD16 ' + gs2.icon + ' ' + gs2.name + ' AI activated! ' + gs2.fact, 'success');
                        if (d.colonyTTS) colonySpeak('Digital Mentor activated. The AI reconstruction of ' + gs2.name + ' is now online. ' + gs2.fact, 'narrator');
                        if (typeof addXP === 'function') addXP(30, 'Mentor: ' + gs2.name);
                      }
                    }

                    // Season bonuses
                    if (activeSeason.effect.materialBonus) nr2.materials += activeSeason.effect.materialBonus;
                    if (activeSeason.effect.energyBonus) nr2.energy += activeSeason.effect.energyBonus;
                    if (activeSeason.effect.heal) settlers.forEach(function (s9) { s9.health = Math.min(100, s9.health + activeSeason.effect.heal); });

                    // Apply policy bonuses to resources
                    if (activePolicy) {
                      var pol = policyDefs.find(function (p) { return p.id === activePolicy; });
                      if (pol && pol.effect) {
                        if (pol.effect.materialBonus) nr2.materials += pol.effect.materialBonus;
                        if (pol.effect.foodBonus) nr2.food += pol.effect.foodBonus;
                        if (pol.effect.energyBonus) nr2.energy += pol.effect.energyBonus;
                      }
                    }

                    // Tile improvement bonuses (outposts) + trade routes
                    var outpostKeys = Object.keys(tileImprovements);
                    var tradeRoutes = 0;
                    outpostKeys.forEach(function (tKey2) {
                      var imp = tileImprovements[tKey2];
                      if (imp && imp.res && nr2[imp.res] !== undefined) nr2[imp.res] += 1;
                      // Check for adjacent outposts = trade route
                      var coords = tKey2.split(','); var ox = parseInt(coords[0]); var oy = parseInt(coords[1]);
                      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (dd) {
                        var adjKey = (ox + dd[0]) + ',' + (oy + dd[1]);
                        if (tileImprovements[adjKey] && adjKey > tKey2) tradeRoutes++;
                      });
                    });
                    // Trade route bonus: +1 of each resource per route
                    if (tradeRoutes > 0) {
                      nr2.food += tradeRoutes; nr2.materials += tradeRoutes; nr2.science += tradeRoutes;
                    }

                    // Expedition progress
                    if (activeExpedition) {
                      var exp = Object.assign({}, activeExpedition);
                      var expSpeed = traditions.indexOf('dreamtime') >= 0 ? 2 : 1;
                      exp.turnsLeft = (exp.turnsLeft || 0) - expSpeed;
                      if (exp.turnsLeft <= 0) {
                        // Expedition complete — generate reward
                        upd('activeExpedition', null);
                        upd('expResultLoading', true);
                        callGemini('You are narrating a space colony expedition on alien planet Kepler-442b. A team of ' + (exp.teamSize || 3) + ' settlers went on a ' + exp.type + ' expedition to ' + exp.destination + '. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Generate the expedition result. Return ONLY valid JSON: {"title":"<discovery>","emoji":"<emoji>","narrative":"<exciting 3-4 sentence story of what happened>","lesson":"<real science concept learned, 2-3 sentences>","rewards":{"food":<0-15>,"energy":<0-15>,"water":<0-15>,"materials":<0-15>,"science":<5-20>},"terraformBonus":<0-5>,"newSettler":' + (settlers.length < 50 ? 'true or false' : 'false') + ',"settlerName":"<name if newSettler>","settlerRole":"<role if newSettler>"}', true).then(function (result) {
                          try {
                            var cl4 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                            var s5 = cl4.indexOf('{'); if (s5 > 0) cl4 = cl4.substring(s5);
                            var e5 = cl4.lastIndexOf('}'); if (e5 > 0) cl4 = cl4.substring(0, e5 + 1);
                            var expR = JSON.parse(cl4);
                            upd('expResult', expR); upd('expResultLoading', false);
                            var nr11 = Object.assign({}, resources);
                            Object.keys(expR.rewards || {}).forEach(function (k) { if (nr11[k] !== undefined) nr11[k] += expR.rewards[k]; });
                            upd('colonyRes', nr11);
                            if (expR.terraformBonus) upd('colonyTerraform', Math.min(100, (d.colonyTerraform || 0) + expR.terraformBonus));
                            if (expR.newSettler && expR.settlerName && settlers.length < 50) {
                              var ns7 = settlers.slice();
                              ns7.push({ name: expR.settlerName, role: expR.settlerRole || 'Explorer', icon: '\uD83E\uDDD1\u200D\uD83D\uDE80', specialty: 'physics', morale: 90, health: 100 });
                              upd('colonySettlers', ns7);
                            }
                            // Add to science journal
                            if (expR.lesson) {
                              var nj = scienceJournal.slice();
                              nj.push({ turn: turn, source: 'Expedition: ' + expR.title, fact: expR.lesson });
                              upd('scienceJournal', nj);
                            }
                            var nl21 = gameLog.slice(); nl21.push('\u26F5 Expedition: ' + expR.title); upd('colonyLog', nl21);
                            if (addToast) addToast('\u26F5 Expedition complete: ' + expR.title, 'success');
                            if (d.colonyTTS) colonySpeak('Expedition report. ' + expR.title + '. ' + expR.narrative, 'narrator');
                            if (typeof addXP === 'function') addXP(25, 'Expedition: ' + expR.title);
                          } catch (err) { upd('expResultLoading', false); }
                        }).catch(function () { upd('expResultLoading', false); });
                      } else {
                        upd('activeExpedition', exp);
                      }
                    }

                    // Cultural Tradition bonuses
                    traditions.forEach(function (tid) {
                      var tdef = traditionDefs.find(function (td2) { return td2.id === tid; });
                      if (tdef && tdef.bonus) {
                        if (tdef.bonus.food) nr2.food += tdef.bonus.food;
                        if (tdef.bonus.water) nr2.water += tdef.bonus.water;
                        if (tdef.bonus.materials) nr2.materials += tdef.bonus.materials;
                        if (tdef.bonus.science) nr2.science += tdef.bonus.science;
                        if (tdef.bonus.terraform) { var tfC = Math.min(100, (d.colonyTerraform || 0) + tdef.bonus.terraform); upd('colonyTerraform', tfC); }
                        if (tdef.bonus.repair) {
                          // Kintsugi: repair 10% effectiveness on all buildings
                          var repEff = Object.assign({}, buildingEff);
                          buildings.forEach(function (b2) { if (repEff[b2] !== undefined && repEff[b2] < 100) repEff[b2] = Math.min(100, repEff[b2] + 10); });
                          upd('buildingEff', repEff);
                        }
                      }
                    });

                    // Equity effects
                    if (equity < 25) {
                      newHappy = Math.max(0, newHappy - 5);
                      if (nt % 5 === 0) { var nl26 = gameLog.slice(); nl26.push('\u26A0\uFE0F Inequality crisis! Settlers dissatisfied with resource distribution.'); upd('colonyLog', nl26); }
                    } else if (equity > 75) {
                      newHappy = Math.min(100, newHappy + 2);
                      nr2.science += 2; // equitable societies innovate better
                    }

                    // Wonder bonuses
                    if (wonders.terraformEngine) { var tfW = Math.min(100, (d.colonyTerraform || 0) + 5); upd('colonyTerraform', tfW); }
                    if (wonders.arkVault) { nr2.food += 8; nr2.science += 5; }
                    if (wonders.quantumGate) { nr2.science += 10; }

                    // Alien alliance bonuses
                    if (alienContact && alienRelations >= 50) {
                      nr2.science += 3; nr2.water += 2;
                    }
                    // Apply research bonuses
                    researchQueue.forEach(function (rid) {
                      var rdef = researchDefs.find(function (rd) { return rd.id === rid; });
                      if (rdef && rdef.bonus) {
                        if (rdef.bonus.food) nr2.food += rdef.bonus.food;
                        if (rdef.bonus.water) nr2.water += rdef.bonus.water;
                        if (rdef.bonus.science) nr2.science += rdef.bonus.science;
                        if (rdef.bonus.terraformBonus) { var tfb = Math.min(100, newTf + rdef.bonus.terraformBonus); upd('colonyTerraform', tfb); }
                      }
                    });

                    // Great Scientists permanent bonus
                    greatScientists.forEach(function (gs3) { if (gs3.bonus && nr2[gs3.bonus] !== undefined) nr2[gs3.bonus] += gs3.amount; });

                    // Emergency events for critical resources
                    if (nr2.food <= 3 && buildings.length > 0) {
                      var nl10 = gameLog.slice(); nl10.push('\uD83D\uDEA8 EMERGENCY: Food critically low! Build Hydroponics or explore for food!'); upd('colonyLog', nl10);
                      if (d.colonyTTS) colonySpeak('Emergency! Food reserves critically low. Settlers are at risk of starvation. Prioritize food production immediately.', 'narrator');
                    }
                    if (nr2.energy <= 2 && buildings.length > 0) {
                      var nl11 = gameLog.slice(); nl11.push('\uD83D\uDEA8 EMERGENCY: Energy critical! Buildings may shut down!'); upd('colonyLog', nl11);
                      if (d.colonyTTS) colonySpeak('Warning! Energy levels critical. Colony systems are at risk of shutdown.', 'narrator');
                    }
                    if (nr2.water <= 2 && buildings.length > 0) {
                      var nl12 = gameLog.slice(); nl12.push('\uD83D\uDEA8 EMERGENCY: Water reserves depleted!'); upd('colonyLog', nl12);
                    }
                  },
                  disabled: d.colonyEventLoading, className: 'w-full py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]', style: { background: d.colonyEventLoading ? '#334155' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: d.colonyEventLoading ? '#64748b' : '#e0e7ff', boxShadow: d.colonyEventLoading ? 'none' : '0 4px 15px rgba(99,102,241,0.3)' }
                  }, d.colonyEventLoading ? '\u23F3 Processing...' : '\u2728 Continue to Dawn'),
                  (function() { return null; })()
                )
              ),
              // ── Turn Summary Pop-up ──
              d.turnSummary && !d.colonyEventLoading && React.createElement('div', {
                className: 'bg-gradient-to-r from-slate-800/95 to-indigo-900/95 rounded-xl p-3 border border-indigo-500/30 mb-3 relative',
                style: { animation: 'fadeIn 0.3s ease-out' }
              },
                React.createElement('button', {
                  onClick: function () { upd('turnSummary', null); },
                  className: 'absolute top-1 right-2 text-slate-600 hover:text-white text-sm', title: 'Dismiss'
                }, '\u2715'),
                React.createElement('div', { className: 'text-[10px] font-bold text-indigo-300 mb-1.5' }, '\uD83D\uDCCB Turn ' + d.turnSummary.turn + ' Report'),
                React.createElement('div', { className: 'grid grid-cols-5 gap-1 mb-1.5' },
                  [
                    ['\uD83C\uDF3E', 'Food', d.turnSummary.deltas.food, '#4ade80'],
                    ['\u26A1', 'Energy', d.turnSummary.deltas.energy, '#facc15'],
                    ['\uD83D\uDCA7', 'Water', d.turnSummary.deltas.water, '#38bdf8'],
                    ['\uD83E\uDEA8', 'Mat.', d.turnSummary.deltas.materials, '#94a3b8'],
                    ['\uD83D\uDD2C', 'Sci.', d.turnSummary.deltas.science, '#a78bfa']
                  ].map(function (rd) {
                    var val = rd[2]; var col = val > 0 ? '#4ade80' : val < 0 ? '#f87171' : '#64748b';
                    return React.createElement('div', { key: rd[1], className: 'text-center rounded-lg py-1', style: { backgroundColor: col + '15', border: '1px solid ' + col + '30' } },
                      React.createElement('div', { className: 'text-[11px]', style: { color: col } }, rd[0] + ' ' + (val > 0 ? '+' : '') + val),
                      React.createElement('div', { className: 'text-[7px] text-slate-600' }, rd[1])
                    );
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 text-[10px] text-slate-600 flex-wrap' },
                  d.turnSummary.tfGain > 0 && React.createElement('span', { className: 'text-emerald-400' }, '\uD83C\uDF0D +' + d.turnSummary.tfGain + '% terraform (' + d.turnSummary.terraform + '%)'),
                  React.createElement('span', null, '\uD83D\uDE42 ' + d.turnSummary.happiness + '%'),
                  React.createElement('span', null, '\uD83D\uDC65 ' + d.turnSummary.population),
                  d.turnSummary.events.map(function (ev, ei) { return React.createElement('span', { key: ei, className: 'text-amber-300' }, ev); })
                )
              ),
              React.createElement('div', { className: 'flex gap-1 mb-3 flex-wrap' },
                selectedTile && selectedTile.tile.explored && selectedTile.tile.type !== 'colony' && React.createElement('button', {
                  onClick: function () {
                    var tKey = selectedTile.x + ',' + selectedTile.y;
                    if (!tileImprovements[tKey] && resources.materials >= 8) {
                      var nr10 = Object.assign({}, resources); nr10.materials -= 8; upd('colonyRes', nr10);
                      var newTI = Object.assign({}, tileImprovements);
                      newTI[tKey] = { type: 'outpost', tile: selectedTile.tile.type, res: selectedTile.tile.res };
                      upd('tileImprovements', newTI);
                      if (addToast) addToast('\uD83C\uDFD5\uFE0F Outpost built! +1 ' + selectedTile.tile.res + '/turn', 'success');
                      var nl20 = gameLog.slice(); nl20.push('\uD83C\uDFD5\uFE0F Outpost at (' + selectedTile.x + ',' + selectedTile.y + ')'); upd('colonyLog', nl20);
                    }
                  },
                  disabled: !selectedTile || tileImprovements[selectedTile.x + ',' + selectedTile.y] || resources.materials < 8,
                  className: 'py-2 rounded-xl text-[10px] font-bold ' + (selectedTile && !tileImprovements[selectedTile.x + ',' + selectedTile.y] && resources.materials >= 8 ? 'bg-orange-700 text-orange-200' : 'bg-slate-700 text-slate-500')
                }, '\uD83C\uDFD5\uFE0F Outpost (-8\uD83E\uDEA8)')
              ),
              // Terraforming Progress
              React.createElement('div', { className: 'rounded-xl p-3 border mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #064e3b, #134e4a, #0f172a)', borderColor: terraform >= 50 ? '#10b981' : '#065f46', animation: terraform >= 100 ? 'kp-glow 2s infinite' : 'none' } },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('h4', { className: 'text-[10px] font-bold', style: { color: '#34d399' } }, '\uD83C\uDF0D Victory Progress'),
                  React.createElement('span', { className: 'text-xs font-black', style: { color: terraform >= 100 ? '#4ade80' : terraform >= 50 ? '#34d399' : '#6ee7b7', textShadow: '0 0 8px rgba(52,211,153,0.4)' } }, terraform + '%')
                ),
                React.createElement('div', { className: 'w-full rounded-full h-4 overflow-hidden', style: { background: '#1e293b', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' } },
                  React.createElement('div', { className: 'h-4 rounded-full transition-all', style: { width: terraform + '%', background: terraform >= 100 ? 'linear-gradient(90deg, #4ade80, #22d3ee)' : terraform >= 50 ? 'linear-gradient(90deg, #10b981, #14b8a6)' : 'linear-gradient(90deg, #6366f1, #10b981)', boxShadow: '0 0 12px rgba(16,185,129,0.4)', animation: 'kp-barFill 1.5s ease-out' } })
                ),
                React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' },
                  terraform >= 100 ? '\uD83C\uDF89 VICTORY! The planet is habitable! Your colony is self-sustaining!' :
                    terraform >= 75 ? 'Atmosphere thickening, water cycles forming. Almost habitable!' :
                      terraform >= 50 ? 'Microorganisms detected in soil. Oxygen levels rising.' :
                        terraform >= 25 ? 'Ice caps melting. First clouds forming in the sky.' :
                          'Raw alien world. Build Atmospheric Processor (+5%/turn) and Biodome (+10%/turn) to terraform.'
                ),
                // Victory Paths
                React.createElement('div', { className: 'mt-2 grid grid-cols-3 gap-1 text-[10px]' },
                  React.createElement('div', { className: 'p-1 rounded text-center ' + (terraform >= 100 ? 'bg-emerald-900/50 text-emerald-400' : 'text-slate-500') },
                    '\uD83C\uDF0D Terraform: ' + terraform + '/100%'
                  ),
                  React.createElement('div', { className: 'p-1 rounded text-center ' + (settlers.length >= 50 ? 'bg-teal-900/50 text-teal-400' : 'text-slate-500') },
                    '\uD83D\uDC65 Population: ' + settlers.length + '/50'
                  ),
                  React.createElement('div', { className: 'p-1 rounded text-center ' + (researchQueue.length >= 10 ? 'bg-violet-900/50 text-violet-400' : 'text-slate-500') },
                    '\uD83E\uDDEC Research: ' + researchQueue.length + '/10'
                  )
                ),
                terraform >= 100 && React.createElement('div', { className: 'mt-2 text-center' },
                  React.createElement('div', { className: 'text-3xl mb-1' }, '\uD83C\uDF89\uD83C\uDF0D\uD83D\uDE80'),
                  React.createElement('div', { className: 'text-sm font-bold text-green-400' }, 'COLONY VICTORY!'),
                  React.createElement('div', { className: 'text-[10px] text-green-300' }, 'Turn ' + turn + ' | ' + buildings.length + ' buildings | All ' + settlers.length + ' settlers survived')
                )
              ),
              // Colony Stats Dashboard
              React.createElement('div', { className: 'bg-slate-800/80 rounded-xl p-2 border border-slate-700 mb-3' },
                React.createElement('div', { className: 'flex gap-1.5 justify-center flex-wrap', style: { padding: '4px 0' } },
                  [
                    { icon: currentEra.icon, text: currentEra.name, color: currentEra.color },
                    { icon: '\uD83D\uDC65', text: settlers.length + ' crew', color: '#2dd4bf' },
                    { icon: '\uD83C\uDFAF', text: (stats.questionsAnswered > 0 ? Math.round(stats.correct / stats.questionsAnswered * 100) : 0) + '%', color: stats.questionsAnswered > 0 && stats.correct / stats.questionsAnswered >= 0.7 ? '#4ade80' : '#fbbf24' },
                    { icon: '\uD83C\uDFD7', text: stats.buildingsConstructed + ' built', color: '#22d3ee' },
                    { icon: '\u2728', text: stats.anomaliesExplored + ' anom', color: '#c084fc' },
                    { icon: colonyHappiness > 80 ? '\uD83D\uDE04' : colonyHappiness > 60 ? '\uD83D\uDE42' : colonyHappiness > 30 ? '\uD83D\uDE10' : '\uD83D\uDE21', text: colonyHappiness + '%', color: colonyHappiness > 60 ? '#4ade80' : colonyHappiness > 30 ? '#fbbf24' : '#ef4444' },
                    { icon: '\u2696\uFE0F', text: equity + '%', color: equity > 60 ? '#4ade80' : equity > 35 ? '#fbbf24' : '#ef4444' }
                  ].concat(alienContact ? [{ icon: '\uD83D\uDC7E', text: (alienRelations > 0 ? '+' : '') + alienRelations, color: alienRelations > 20 ? '#4ade80' : alienRelations < -20 ? '#ef4444' : '#fbbf24' }] : []).map(function(s, si3) {
                    return React.createElement('span', { key: si3, className: 'px-1.5 py-0.5 rounded-full text-[10px] font-bold', style: { background: s.color + '15', color: s.color, border: '1px solid ' + s.color + '25' } }, s.icon + ' ' + s.text);
                  })
                )
              ),
              // Weather indicator
              weather && React.createElement('div', { className: 'rounded-xl p-2.5 mb-3 flex items-center gap-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #78350f, #451a03, #0f172a)', border: '1px solid #f59e0b40', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-4 -top-4 text-5xl opacity-10', style: { filter: 'blur(2px)' } }, weather.icon),
                React.createElement('div', { className: 'text-2xl flex-shrink-0', style: { animation: 'kp-pulse 3s infinite' } }, weather.icon),
                React.createElement('div', { className: 'flex-1' },
                  React.createElement('div', { className: 'text-[10px] font-bold', style: { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.3)' } }, '\u26A0\uFE0F Weather Alert: ' + weather.name),
                  React.createElement('div', { className: 'text-[11px] text-amber-300/70' }, weather.effect + ' (' + weather.penalty + ' ' + weather.res + ')')
                )
              ),
              // Event
              colonyEvent && React.createElement('div', { className: 'bg-gradient-to-r from-slate-800 to-indigo-900 rounded-xl p-4 border border-indigo-700 mb-3 relative overflow-hidden', style: { animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute top-0 right-0 w-24 h-24 opacity-10 text-6xl flex items-center justify-center', style: { filter: 'blur(2px)' } }, colonyEvent.emoji || '\u2728'),
                React.createElement('h3', { className: 'text-sm font-bold text-white mb-1', style: { textShadow: '0 0 10px rgba(99,102,241,0.5)' } }, (colonyEvent.emoji || '') + ' ' + colonyEvent.title),
                React.createElement('p', { className: 'text-xs text-slate-300 leading-relaxed' }, colonyEvent.description),
                colonyEvent.lesson && React.createElement('div', { className: 'mt-2 bg-indigo-950/80 rounded-lg px-3 py-2 text-[10px] text-indigo-300 border border-indigo-800/50 backdrop-blur-sm' }, React.createElement('span', { className: 'font-bold text-indigo-200' }, '\uD83D\uDCDA Science: '), colonyEvent.lesson),
                React.createElement('div', { className: 'grid gap-2 mt-3' }, (colonyEvent.choices || []).map(function (ch, ci2) {
                  return React.createElement('button', {
                    key: ci2, onClick: function () {
                      var ef2 = ch.effects || {}; var nr3 = Object.assign({}, resources);
                      Object.keys(ef2).forEach(function (k) { if (k === 'morale') { upd('colonySettlers', settlers.map(function (s3) { return Object.assign({}, s3, { morale: Math.max(0, Math.min(100, s3.morale + (ef2.morale || 0))) }); })); } else if (nr3[k] !== undefined) nr3[k] = Math.max(0, nr3[k] + ef2[k]); });
                      upd('colonyRes', nr3); upd('colonyEvent', null);
                      var nl3 = gameLog.slice(); nl3.push('  \u2192 ' + ch.label + ': ' + ch.outcome); upd('colonyLog', nl3);
                      if (colonyEvent.lesson) {
                        var nj2 = scienceJournal.slice();
                        nj2.push({ turn: turn, source: 'Event: ' + colonyEvent.title, fact: colonyEvent.lesson });
                        upd('scienceJournal', nj2);
                      }
                      if (addToast) addToast(ch.outcome, ef2.morale > 0 ? 'success' : ef2.morale < 0 ? 'warning' : 'info');
                      if (typeof addXP === 'function') addXP(15, 'Kepler Colony: Decision made');
                    }, className: 'w-full text-left p-3 rounded-xl border-2 border-slate-600 hover:border-indigo-400 transition-all text-xs text-slate-200 hover:scale-[1.02]', style: { background: 'linear-gradient(135deg, #1e293b, #312e81)' }
                  },
                    React.createElement('div', { className: 'font-bold text-white' }, ch.label),
                    React.createElement('div', { className: 'text-[11px] text-slate-500 mt-1 flex gap-2 flex-wrap' },
                      Object.keys(ch.effects || {}).filter(function (ek) { return ch.effects[ek] !== 0; }).map(function (ek) { return React.createElement('span', { key: ek, className: ch.effects[ek] > 0 ? 'text-green-400' : 'text-red-400' }, ek + ':' + (ch.effects[ek] > 0 ? '+' : '') + ch.effects[ek]); })
                    )
                  );
                }))
              ),
              // Governance Dilemma (NationStates-style)
              d.activeDilemma && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #312e81, #1e1b4b, #0f172a)', borderColor: '#6366f1', boxShadow: '0 0 20px rgba(99,102,241,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-8 -top-8 text-7xl opacity-5', style: { filter: 'blur(3px)' } }, '\u2696\uFE0F'),
                React.createElement('h3', { className: 'text-sm font-bold text-indigo-200 mb-1' }, (d.activeDilemma.emoji || '\uD83C\uDFDB\uFE0F') + ' Colony Dilemma: ' + d.activeDilemma.title),
                React.createElement('p', { className: 'text-xs text-indigo-100 mb-3' }, d.activeDilemma.description),
                React.createElement('div', { className: 'grid gap-2' },
                  (d.activeDilemma.choices || []).map(function (ch2, ci2) {
                    return React.createElement('button', {
                      key: ci2,
                      onClick: function () {
                        // Apply value shifts
                        var newVals = Object.assign({}, colonyValues);
                        Object.keys(ch2.values || {}).forEach(function (vk) {
                          newVals[vk] = Math.max(0, Math.min(100, (newVals[vk] || 50) + ch2.values[vk]));
                        });
                        upd('colonyValues', newVals);
                        // Apply equity + happiness
                        var newEq = Math.max(0, Math.min(100, equity + (ch2.equity || 0)));
                        upd('colonyEquity', newEq);
                        var newH2 = Math.max(0, Math.min(100, colonyHappiness + (ch2.happiness || 0)));
                        upd('colonyHappiness', newH2);
                        // Log
                        var dl = dilemmaLog.slice();
                        dl.push({ turn: turn, title: d.activeDilemma.title, choice: ch2.text, values: ch2.values, equity: ch2.equity });
                        upd('dilemmaLog', dl);
                        if (d.activeDilemma.lesson) {
                          var nj6 = scienceJournal.slice();
                          nj6.push({ turn: turn, source: 'Dilemma: ' + d.activeDilemma.title, fact: d.activeDilemma.lesson });
                          upd('scienceJournal', nj6);
                        }
                        upd('dilemmaResult', { outcome: ch2.outcome, lesson: d.activeDilemma.lesson, equity: ch2.equity, values: ch2.values });
                        upd('activeDilemma', null);
                        if (addToast) addToast(ch2.outcome, ch2.equity >= 0 ? 'info' : 'warning');
                        // AI narrates the full consequence
                        var valShiftDesc = Object.keys(ch2.values || {}).filter(function (vk4) { return ch2.values[vk4] !== 0; }).map(function (vk4) { return vk4 + (ch2.values[vk4] > 0 ? ' rose' : ' fell'); }).join(', ');
                        callGemini('You are the narrator for a space colony on Kepler-442b. The colony council just decided: "' + ch2.text + '" in response to the dilemma "' + d.activeDilemma.title + '". The outcome is: ' + ch2.outcome + '. Colony value shifts: ' + valShiftDesc + '. Equity changed by ' + (ch2.equity || 0) + '. Narrate the consequences in 3-4 dramatic, reflective sentences. Include how this affects daily life in the colony and what it reveals about the colonists\u2019 values. Be thoughtful, not preachy. Target audience: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (narration) {
                          upd('dilemmaNarration', narration);
                          if (d.colonyTTS) colonySpeak(narration, 'narrator');
                        }).catch(function () {
                          if (d.colonyTTS) colonySpeak(ch2.outcome, 'narrator');
                        });
                        var nl27 = gameLog.slice(); nl27.push('\uD83C\uDFDB\uFE0F Decision: ' + ch2.text.substring(0, 50)); upd('colonyLog', nl27);
                        if (typeof addXP === 'function') addXP(15, 'Governance: ' + d.activeDilemma.title);
                      },
                      className: 'p-3 rounded-xl border-2 text-xs transition-all text-left hover:scale-[1.01]',
                      style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderColor: '#4f46e8', color: '#c7d2fe' }
                    },
                      React.createElement('div', { className: 'font-bold text-[10px] text-indigo-200 mb-1' }, String.fromCharCode(65 + ci2) + '. ' + ch2.text),
                      React.createElement('div', { className: 'flex gap-2 text-[10px] flex-wrap' },
                        Object.keys(ch2.values || {}).filter(function (vk2) { return ch2.values[vk2] !== 0; }).map(function (vk2) {
                          return React.createElement('span', { key: vk2, className: ch2.values[vk2] > 0 ? 'text-green-400' : 'text-red-400' },
                            vk2 + (ch2.values[vk2] > 0 ? '+' : '') + ch2.values[vk2]);
                        }),
                        ch2.equity !== 0 && React.createElement('span', { className: ch2.equity > 0 ? 'text-cyan-400' : 'text-red-400' },
                          '\u2696\uFE0F' + (ch2.equity > 0 ? '+' : '') + ch2.equity)
                      )
                    );
                  })
                ),
                React.createElement('div', { className: 'text-[10px] text-indigo-400 mt-2' }, '\uD83D\uDCA1 No wrong answers \u2014 your choices shape your colony\u2019s identity.')
              ),
              d.dilemmaResult && React.createElement('div', { className: 'bg-indigo-950 rounded-xl p-3 border border-indigo-700 mb-3' },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold text-indigo-300' }, '\uD83C\uDFDB\uFE0F Decision Made'),
                  React.createElement('button', { onClick: function () { upd('dilemmaResult', null); upd('dilemmaNarration', null); }, className: 'text-indigo-500 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[11px] text-indigo-200 mb-1' }, d.dilemmaResult.outcome),
                d.dilemmaNarration && React.createElement('div', { className: 'bg-indigo-900/30 rounded-lg p-2 mt-1 border-l-2 border-indigo-500' },
                  React.createElement('p', { className: 'text-[11px] text-indigo-100 italic leading-relaxed' }, '\uD83C\uDFA4 ' + d.dilemmaNarration)
                ),
                d.dilemmaResult.lesson && React.createElement('div', { className: 'mt-1 text-[11px] text-indigo-300 bg-indigo-900/50 rounded-lg px-2 py-1' }, '\uD83D\uDCDA ' + d.dilemmaResult.lesson),
                d.dilemmaResult.values && React.createElement('div', { className: 'mt-1 flex gap-1 flex-wrap text-[10px]' },
                  Object.keys(d.dilemmaResult.values).filter(function (vk5) { return d.dilemmaResult.values[vk5] !== 0; }).map(function (vk5) {
                    return React.createElement('span', { key: vk5, className: d.dilemmaResult.values[vk5] > 0 ? 'text-green-400 bg-green-900/30 px-1 rounded' : 'text-red-200 bg-red-900/30 px-1 rounded' },
                      vk5 + (d.dilemmaResult.values[vk5] > 0 ? '\u2191' : '\u2193'));
                  }),
                  d.dilemmaResult.equity !== 0 && React.createElement('span', { className: d.dilemmaResult.equity > 0 ? 'text-cyan-400 bg-cyan-900/30 px-1 rounded' : 'text-red-200 bg-red-900/30 px-1 rounded' },
                    '\u2696\uFE0F' + (d.dilemmaResult.equity > 0 ? '\u2191' : '\u2193'))
                )
              ),
              d.dilemmaLoading && React.createElement('div', { className: 'bg-indigo-900/50 rounded-xl p-3 border border-indigo-700 mb-3 text-center text-indigo-300 text-xs' }, '\uD83C\uDFDB\uFE0F Colony council deliberating...'),
              // Disaster Event
              d.activeDisaster && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #7f1d1d, #991b1b, #451a03)', borderColor: '#ef4444', boxShadow: '0 0 25px rgba(239,68,68,0.3)', animation: 'kp-shake 0.5s ease-out, kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-8 -top-8 text-7xl opacity-10', style: { filter: 'blur(3px)', animation: 'kp-pulse 2s infinite' } }, '\uD83D\uDCA5'),
                React.createElement('h3', { className: 'text-sm font-bold text-red-200 mb-1' }, (d.activeDisaster.emoji || '\uD83D\uDCA5') + ' DISASTER: ' + d.activeDisaster.title),
                React.createElement('p', { className: 'text-xs text-red-100 mb-2' }, d.activeDisaster.description),
                d.activeDisaster.lesson && React.createElement('div', { className: 'bg-red-950 rounded-lg px-3 py-2 text-[10px] text-red-300 border border-red-800 mb-2' }, '\uD83D\uDCDA Science: ' + d.activeDisaster.lesson),
                React.createElement('p', { className: 'text-[10px] text-amber-200 font-bold mb-2' }, '\u26A0\uFE0F Answer correctly to MITIGATE damage! Wrong answer = FULL damage!'),
                React.createElement('p', { className: 'text-xs text-red-100 mb-2 font-bold' }, d.activeDisaster.question),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  (d.activeDisaster.options || []).map(function (opt3, oi3) {
                    return React.createElement('button', {
                      key: oi3,
                      onClick: function () {
                        var correct4 = oi3 === d.activeDisaster.correctIndex;
                        var damage = correct4 ? d.activeDisaster.mitigatedDamage : d.activeDisaster.fullDamage;
                        var nr14 = Object.assign({}, resources);
                        Object.keys(damage || {}).forEach(function (k) {
                          if (k === 'morale') {
                            upd('colonySettlers', settlers.map(function (s8) { return Object.assign({}, s8, { morale: Math.max(0, s8.morale + (damage[k] || 0)) }); }));
                          } else if (nr14[k] !== undefined) { nr14[k] = Math.max(0, nr14[k] + damage[k]); }
                        });
                        upd('colonyRes', nr14);
                        if (d.activeDisaster.lesson) {
                          var nj5 = scienceJournal.slice();
                          nj5.push({ turn: turn, source: 'Disaster: ' + d.activeDisaster.title, fact: d.activeDisaster.lesson });
                          upd('scienceJournal', nj5);
                        }
                        var ns8 = Object.assign({}, stats); ns8.questionsAnswered++; if (correct4) ns8.correct++; upd('colonyStats', ns8);
                        if (correct4) {
                          if (addToast) addToast('\u2705 Damage mitigated! Your science knowledge saved the colony!', 'success');
                          if (d.colonyTTS) colonySpeak('Excellent! Disaster mitigated through scientific knowledge. Damage was minimized.', 'narrator');
                          if (typeof addXP === 'function') addXP(40, 'Disaster mitigated: ' + d.activeDisaster.title);
                        } else {
                          if (addToast) addToast('\u274C Full damage! The correct answer was: ' + d.activeDisaster.options[d.activeDisaster.correctIndex], 'error');
                          if (d.colonyTTS) colonySpeak('Incorrect. The colony takes full damage. The answer was ' + d.activeDisaster.options[d.activeDisaster.correctIndex] + '.', 'narrator');
                        }
                        upd('activeDisaster', null);
                      },
                      className: 'p-2 rounded-xl border-2 text-xs transition-all hover:scale-[1.01]',
                      style: { background: 'linear-gradient(135deg, #450a0a, #7f1d1d)', borderColor: '#dc2626', color: '#fecaca' }
                    }, String.fromCharCode(65 + oi3) + '. ' + opt3);
                  })
                )
              ),
              d.disasterLoading && React.createElement('div', { className: 'bg-red-900/50 rounded-xl p-3 border border-red-700 mb-3 text-center text-red-300 text-xs' }, '\uD83D\uDCA5 Disaster incoming...'),
              // Maintenance Challenge
              maintChallenge && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #78350f, #92400e, #451a03)', borderColor: '#f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-8 -top-8 text-7xl opacity-5', style: { filter: 'blur(3px)' } }, '\uD83D\uDD27'),
                React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                  React.createElement('span', { className: 'text-lg' }, maintChallenge.buildingIcon),
                  React.createElement('div', null,
                    React.createElement('h4', { className: 'text-sm font-bold text-amber-200' }, '\uD83D\uDD27 Maintenance Check: ' + maintChallenge.buildingName),
                    React.createElement('span', { className: 'text-[11px] text-amber-400' }, 'Answer correctly to maintain 100% effectiveness!')
                  )
                ),
                React.createElement('p', { className: 'text-xs text-amber-100 mb-3' }, maintChallenge.question),
                // MCQ Mode
                maintChallenge.options && React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  maintChallenge.options.map(function (opt, oi) {
                    return React.createElement('button', {
                      key: oi,
                      onClick: function () {
                        var correct = oi === maintChallenge.correctIndex;
                        var newEff = Object.assign({}, buildingEff);
                        if (correct) {
                          newEff[maintChallenge.building] = 100;
                          var ns = Object.assign({}, stats); ns.questionsAnswered++; ns.correct++; upd('colonyStats', ns);
                          if (addToast) addToast('\u2705 Correct! ' + maintChallenge.buildingName + ' running at 100%!', 'success');
                          if (d.colonyTTS) colonySpeak('Excellent! Maintenance check passed. ' + maintChallenge.buildingName + ' operating at full capacity.', 'narrator');
                          if (typeof addXP === 'function') addXP(20, 'Maintenance: ' + maintChallenge.buildingName);
                        } else {
                          var curEff = newEff[maintChallenge.building] !== undefined ? newEff[maintChallenge.building] : 100;
                          newEff[maintChallenge.building] = Math.max(25, curEff - 25);
                          var ns2 = Object.assign({}, stats); ns2.questionsAnswered++; upd('colonyStats', ns2);
                          if (addToast) addToast('\u274C Wrong! ' + maintChallenge.buildingName + ' reduced to ' + newEff[maintChallenge.building] + '% output.', 'warning');
                          if (d.colonyTTS) colonySpeak('Incorrect. The ' + maintChallenge.buildingName + ' is now operating at reduced capacity. Study the science and try the next maintenance cycle.', 'narrator');
                        }
                        upd('buildingEff', newEff);
                        if (maintChallenge.explanation) {
                          var nj4 = scienceJournal.slice();
                          nj4.push({ turn: turn, source: 'Maintenance: ' + maintChallenge.buildingName, fact: maintChallenge.explanation });
                          upd('scienceJournal', nj4);
                        }
                        upd('maintExplanation', { text: maintChallenge.explanation, correct: correct, answer: maintChallenge.options[maintChallenge.correctIndex] });
                        upd('maintChallenge', null);
                      },
                      className: 'p-2 rounded-xl border-2 text-xs transition-all text-left hover:scale-[1.01]',
                      style: { background: 'linear-gradient(135deg, #451a03, #78350f)', borderColor: '#b45309', color: '#fde68a' }
                    }, String.fromCharCode(65 + oi) + '. ' + opt);
                  })
                ),
                // Free Response Mode
                !maintChallenge.options && React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('input', {
                    type: 'text', value: d.maintInput || '',
                    onChange: function (e) { upd('maintInput', e.target.value); },
                    onKeyDown: function (e) { if (e.key === 'Enter') document.getElementById('kepler-maint-btn').click(); },
                    placeholder: 'Type your answer...',
                    className: 'flex-1 px-3 py-2 bg-amber-950 border-2 border-amber-600 rounded-xl text-xs text-white outline-none focus:border-amber-400'
                  }),
                  React.createElement('button', {
                    id: 'kepler-maint-btn',
                    onClick: function () {
                      var inp2 = (d.maintInput || '').trim().toLowerCase();
                      var correct2 = inp2.indexOf((maintChallenge.answer || '').toLowerCase()) >= 0;
                      var newEff2 = Object.assign({}, buildingEff);
                      if (correct2) {
                        newEff2[maintChallenge.building] = 100;
                        if (addToast) addToast('\u2705 Correct! ' + maintChallenge.buildingName + ' at 100%!', 'success');
                        if (d.colonyTTS) colonySpeak('Excellent! Maintenance passed. Full capacity restored.', 'narrator');
                        if (typeof addXP === 'function') addXP(25, 'Maintenance: ' + maintChallenge.buildingName);
                      } else {
                        var curEff2 = newEff2[maintChallenge.building] !== undefined ? newEff2[maintChallenge.building] : 100;
                        newEff2[maintChallenge.building] = Math.max(25, curEff2 - 25);
                        if (addToast) addToast('\u274C ' + maintChallenge.buildingName + ' reduced to ' + newEff2[maintChallenge.building] + '%', 'warning');
                        if (d.colonyTTS) colonySpeak('Incorrect. Reduced capacity. The correct answer was ' + (maintChallenge.answer || '') + '.', 'narrator');
                      }
                      upd('buildingEff', newEff2);
                      upd('maintExplanation', { text: maintChallenge.explanation, correct: correct2, answer: maintChallenge.answer });
                      upd('maintChallenge', null); upd('maintInput', '');
                    },
                    className: 'px-4 py-2 bg-amber-500 text-slate-900 rounded-xl text-xs font-bold'
                  }, '\u2705 Submit')
                )
              ),
              // Maintenance explanation (after answering)
              d.maintExplanation && React.createElement('div', { className: 'bg-slate-800 rounded-xl p-3 border mb-3 ' + (d.maintExplanation.correct ? 'border-green-600' : 'border-red-600') },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold ' + (d.maintExplanation.correct ? 'text-green-400' : 'text-red-400') },
                    d.maintExplanation.correct ? '\u2705 Correct!' : '\u274C Incorrect \u2014 Answer: ' + d.maintExplanation.answer
                  ),
                  React.createElement('button', { onClick: function () { upd('maintExplanation', null); }, className: 'text-slate-600 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[10px] text-slate-300 leading-relaxed' }, '\uD83D\uDCDA ' + d.maintExplanation.text)
              ),
              d.maintChallengeLoading && React.createElement('div', { className: 'bg-amber-900/50 rounded-xl p-3 border border-amber-700 mb-3 text-center text-amber-300 text-xs' }, '\u23F3 Generating maintenance challenge...'),
              // Build panel
              d.showBuild && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderColor: '#4338ca40', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                  React.createElement('h4', { className: 'text-sm font-bold text-amber-400' }, '\uD83C\uDFD7 Buildings'),
                  builtThisTurn && React.createElement('span', { className: 'text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/30' }, '\u2705 Built this turn')
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' }, buildingDefs.map(function (bd) {
                  var isBuilt = buildings.indexOf(bd.id) >= 0;
                  var hasPrereqs = (bd.requires || []).every(function (r) { return buildings.indexOf(r) >= 0; });
                  var canAff = !isBuilt && hasPrereqs && Object.keys(bd.cost).every(function (k) { return resources[k] >= bd.cost[k]; }) && turnPhase === 'day' && actionPoints >= 1 && !builtThisTurn;
                  var tierColors = { 1: { bg: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '#475569', glow: 'rgba(100,116,139,0.2)' }, 2: { bg: 'linear-gradient(135deg, #172554, #1e1b4b)', border: '#6366f1', glow: 'rgba(99,102,241,0.2)' }, 3: { bg: 'linear-gradient(135deg, #4a1d96, #312e81)', border: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' }, 4: { bg: 'linear-gradient(135deg, #78350f, #451a03)', border: '#f59e0b', glow: 'rgba(245,158,11,0.3)' } };
                  var tc = tierColors[bd.tier] || tierColors[1];
                  return React.createElement('div', { key: bd.id, className: 'p-2 rounded-xl border-2 transition-all ' + (isBuilt ? '' : canAff ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-40'), style: { background: isBuilt ? 'linear-gradient(135deg, #064e3b, #065f46)' : canAff ? tc.bg : '#0f172a', borderColor: isBuilt ? '#10b981' : canAff ? tc.border : '#1e293b', boxShadow: isBuilt ? '0 0 12px rgba(16,185,129,0.2)' : canAff ? '0 0 10px ' + tc.glow : 'none' } },
                    React.createElement('div', { className: 'flex items-center justify-between' },
                      React.createElement('span', null, React.createElement('span', { className: 'text-base' }, bd.icon), React.createElement('span', { className: 'text-[10px] font-bold text-white ml-1' }, bd.name), isBuilt && React.createElement('span', { className: 'ml-1 text-[11px] ' + ((buildingEff[bd.id] !== undefined ? buildingEff[bd.id] : 100) >= 75 ? 'text-green-400' : 'text-amber-400') },
                        '\u2705 ' + (buildingEff[bd.id] !== undefined ? buildingEff[bd.id] : 100) + '%')),
                      canAff && React.createElement('button', {
                        onClick: function () {
                          if ((d.colonyMode || 'mcq') === 'mcq') {
                            // Generate AI MCQ for the gate
                            upd('scienceGateLoading', true);
                            callGemini('Generate a ' + bd.gate + ' science question for building a ' + bd.name + ' in a space colony. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Return ONLY valid JSON: {"question":"<question>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<real science explanation 2-3 sentences>"}. Generate exactly 6 answer options. Shuffle the correct answer randomly (position 0-5). Make sure correctIndex matches the position of the correct answer.', true).then(function (gateResult) {
                              try {
                                var gcl = gateResult.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                var gs = gcl.indexOf('{'); if (gs > 0) gcl = gcl.substring(gs);
                                var ge = gcl.lastIndexOf('}'); if (ge > 0) gcl = gcl.substring(0, ge + 1);
                                var gp = JSON.parse(gcl);
                                gp.building = bd.id; gp.domain = bd.gate; gp.mode = 'mcq';
                                upd('scienceGate', gp); upd('scienceGateLoading', false);
                                if (d.colonyTTS) colonySpeak('Science challenge. ' + gp.question, 'narrator');
                              } catch (err) {
                                // Fallback to static question
                                upd('scienceGate', { building: bd.id, question: bd.gateQ, answer: bd.gateA, domain: bd.gate, mode: 'freeResponse' });
                                upd('scienceGateLoading', false);
                              }
                            }).catch(function () {
                              upd('scienceGate', { building: bd.id, question: bd.gateQ, answer: bd.gateA, domain: bd.gate, mode: 'freeResponse' });
                              upd('scienceGateLoading', false);
                            });
                          } else {
                            // Free response: use static question
                            upd('scienceGate', { building: bd.id, question: bd.gateQ, answer: bd.gateA, domain: bd.gate, mode: 'freeResponse' });
                          }
                          upd('scienceGateInput', '');
                        }, className: 'px-2 py-1 bg-amber-500 text-slate-900 rounded-lg text-[11px] font-bold'
                      }, '\uD83D\uDD13 Build')
                    ),
                    React.createElement('div', { className: 'text-[10px] text-slate-500 mt-1' }, bd.desc),
                    React.createElement('div', { className: 'flex gap-1 mt-1 text-[10px] flex-wrap' },
                      Object.keys(bd.cost).map(function (ck) { return React.createElement('span', { key: ck, className: resources[ck] >= bd.cost[ck] ? 'text-green-400' : 'text-red-400' }, ck + ':' + bd.cost[ck]); }),
                      React.createElement('span', { className: 'text-slate-600' }, '|'),
                      Object.keys(bd.production).map(function (pk) { return React.createElement('span', { key: pk, className: 'text-cyan-400' }, '+' + bd.production[pk] + ' ' + pk); })
                    ),
                    React.createElement('div', { className: 'text-[10px] text-indigo-400 mt-0.5' }, '\uD83D\uDD12 ' + bd.gate + (bd.tier > 1 ? ' | Tier ' + bd.tier : '')),
                    !isBuilt && bd.requires && bd.requires.length > 0 && !hasPrereqs && React.createElement('div', { className: 'text-[10px] text-red-400 mt-0.5' }, '\u26D4 Requires: ' + bd.requires.join(', '))
                  );
                }))
              ),
              // Science gate
              d.scienceGateLoading && React.createElement('div', { className: 'bg-purple-900/50 rounded-xl p-3 border border-purple-700 mb-3 text-center text-purple-300 text-xs' }, '\u23F3 Generating science challenge...'),
              scienceGate && React.createElement('div', { className: 'rounded-xl p-4 border-2 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #581c87, #312e81, #1e1b4b)', borderColor: '#7c3aed', animation: 'kp-fadeIn 0.5s ease-out', boxShadow: '0 0 20px rgba(139,92,246,0.2)' } },
                React.createElement('h4', { className: 'text-sm font-bold text-purple-200 mb-2' }, '\uD83D\uDD2C Science Challenge: ' + scienceGate.domain.toUpperCase()),
                React.createElement('div', { className: 'text-[10px] text-purple-400 mb-1' }, scienceGate.mode === 'mcq' ? '\uD83D\uDCCB Multiple Choice \u2014 select the correct answer' : '\u270D\uFE0F Free Response \u2014 type your answer'),
                React.createElement('p', { className: 'text-xs text-purple-100 mb-3' }, scienceGate.question),
                // MCQ Mode
                scienceGate.options && React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  scienceGate.options.map(function (opt2, oi2) {
                    return React.createElement('button', {
                      key: oi2,
                      onClick: function () {
                        var correct3 = oi2 === scienceGate.correctIndex;
                        if (correct3) {
                          var bdef3 = buildingDefs.find(function (bd4) { return bd4.id === scienceGate.building; });
                          var nr7 = Object.assign({}, resources); Object.keys(bdef3.cost).forEach(function (k) { nr7[k] -= bdef3.cost[k]; }); upd('colonyRes', nr7);
                          var nb2 = buildings.slice(); nb2.push(scienceGate.building); upd('colonyBuildings', nb2);
                          var newEff3 = Object.assign({}, buildingEff); newEff3[scienceGate.building] = 100; upd('buildingEff', newEff3);
                          var nl8 = gameLog.slice(); nl8.push('Built ' + bdef3.icon + ' ' + bdef3.name + '!'); upd('colonyLog', nl8);
                          var ns3 = Object.assign({}, stats); ns3.questionsAnswered++; ns3.correct++;
                          // Handle wonder progress
                          if (scienceGate._wonderId) {
                            var newWonders = Object.assign({}, wonders);
                            var wProg = (newWonders[scienceGate._wonderId + '_progress'] || 0) + 1;
                            newWonders[scienceGate._wonderId + '_progress'] = wProg;
                            if (wProg >= scienceGate._wonderChallenges) {
                              // Wonder complete!
                              newWonders[scienceGate._wonderId] = true;
                              var nr13 = Object.assign({}, resources);
                              Object.keys(scienceGate._wonderCost).forEach(function (k) { nr13[k] -= scienceGate._wonderCost[k]; });
                              upd('colonyRes', nr13);
                              var nl23 = gameLog.slice(); nl23.push('\uD83C\uDFDB\uFE0F WONDER: ' + scienceGate._wonderName + ' complete!'); upd('colonyLog', nl23);
                              if (addToast) addToast('\uD83C\uDFDB\uFE0F ' + scienceGate._wonderName + ' COMPLETE! Permanent bonuses active!', 'success');
                              if (d.colonyTTS) colonySpeak('Wonder complete! The ' + scienceGate._wonderName + ' is now operational. This is a monumental achievement for the colony.', 'narrator');
                              if (typeof addXP === 'function') addXP(75, 'Wonder: ' + scienceGate._wonderName);
                            } else {
                              if (addToast) addToast('\u2705 Challenge ' + wProg + '/' + scienceGate._wonderChallenges + ' passed!', 'success');
                            }
                            upd('colonyWonders', newWonders);
                            upd('colonyStats', ns3);
                            upd('scienceGate', null);
                            return;
                          }
                          // Handle research completion
                          if (scienceGate._researchId) {
                            var rq2 = researchQueue.slice(); rq2.push(scienceGate._researchId); upd('colonyResearch', rq2);
                            var nr8 = Object.assign({}, resources); nr8.science -= scienceGate._researchCost; upd('colonyRes', nr8);
                            var rdef2 = researchDefs.find(function (rd3) { return rd3.id === scienceGate._researchId; });
                            var nl17 = gameLog.slice(); nl17.push('\uD83E\uDDEC Research: ' + (rdef2 ? rdef2.name : scienceGate._researchId) + ' complete!'); upd('colonyLog', nl17);
                            if (addToast) addToast('\uD83E\uDDEC ' + (rdef2 ? rdef2.name : '') + ' researched!', 'success');
                            if (d.colonyTTS) colonySpeak('Research complete. ' + (rdef2 ? rdef2.name + '. ' + rdef2.desc : ''), 'narrator');
                            upd('colonyStats', ns3);
                            upd('scienceGate', null);
                            return;
                          }
                          ns3.buildingsConstructed++; upd('colonyStats', ns3); upd('builtThisTurn', true);
                          if (addToast) addToast('\u2705 ' + bdef3.name + ' built! Science verified!', 'success');
                          callGemini('You are narrating a space colony game. The colony just built a ' + bdef3.name + ' (' + bdef3.desc + '). Narrate the construction completion in 2 dramatic sentences. Include a real science fact. Target: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (buildNarr) {
                            upd('buildNarration', buildNarr);
                            if (d.colonyTTS) colonySpeak(buildNarr, 'narrator');
                          }).catch(function () {
                            if (d.colonyTTS) colonySpeak('Construction complete. ' + bdef3.name + ' is now operational.', 'narrator');
                          });
                          if (typeof addXP === 'function') addXP(30, 'Built ' + bdef3.name);
                        } else {
                          // 50% efficiency penalty instead of blocking
                          var bdef5 = buildingDefs.find(function (bd5) { return bd5.id === scienceGate.building; });
                          if (bdef5 && !scienceGate._wonderId && !scienceGate._researchId) {
                            var nr9 = Object.assign({}, resources); Object.keys(bdef5.cost).forEach(function (k) { nr9[k] = Math.round(nr9[k] - bdef5.cost[k] * 1.5); }); ['food','energy','water','materials','science'].forEach(function(rk2) { if (nr9[rk2] < 0) nr9[rk2] = 0; }); upd('colonyRes', nr9);
                            var nb3 = buildings.slice(); nb3.push(scienceGate.building); upd('colonyBuildings', nb3);
                            var newEff5 = Object.assign({}, buildingEff); newEff5[scienceGate.building] = 50; upd('buildingEff', newEff5);
                            var nl9 = gameLog.slice(); nl9.push('\u26A0\uFE0F Built ' + bdef5.icon + ' ' + bdef5.name + ' at 50% efficiency'); upd('colonyLog', nl9);
                            if (addToast) addToast('\u274C Wrong answer! ' + bdef5.name + ' built at 50% efficiency. Cost: 150%.', 'error');
                          } else {
                            if (addToast) addToast('\u274C Wrong! The correct answer was: ' + scienceGate.options[scienceGate.correctIndex], 'error');
                          }
                          if (d.colonyTTS) colonySpeak('Incorrect. The answer was ' + scienceGate.options[scienceGate.correctIndex] + '. Building operates at half efficiency.', 'narrator');
                        }
                        if (scienceGate.explanation) {
                          var nj3 = scienceJournal.slice();
                          nj3.push({ turn: turn, source: 'Build: ' + (bdef3 ? bdef3.name : ''), fact: scienceGate.explanation });
                          upd('scienceJournal', nj3);
                        }
                        upd('gateExplanation', { text: scienceGate.explanation, correct: correct3, answer: scienceGate.options[scienceGate.correctIndex] });
                        upd('scienceGate', null);
                      },
                      className: 'p-3 rounded-xl border-2 border-purple-700 bg-purple-950 text-purple-100 text-xs hover:border-purple-400 transition-all text-left'
                    }, String.fromCharCode(65 + oi2) + '. ' + opt2);
                  })
                ),
                // Free Response Mode
                !scienceGate.options && React.createElement('div', { className: 'flex gap-2' },
                  React.createElement('input', {
                    type: 'text', value: d.scienceGateInput || '', onChange: function (e) { upd('scienceGateInput', e.target.value); },
                    onKeyDown: function (e) { if (e.key === 'Enter') document.getElementById('kepler-gate-btn').click(); },
                    placeholder: 'Type your answer...', className: 'flex-1 px-3 py-2 bg-purple-950 border-2 border-purple-600 rounded-xl text-xs text-white outline-none focus:border-purple-400'
                  }),
                  React.createElement('button', {
                    id: 'kepler-gate-btn', onClick: function () {
                      var inp = (d.scienceGateInput || '').trim().toLowerCase();
                      var correct = Array.isArray(scienceGate.answer) ? scienceGate.answer.some(function (a) { return inp.indexOf(a.toLowerCase()) >= 0; }) : inp.indexOf(scienceGate.answer.toLowerCase()) >= 0;
                      if (correct) {
                        var bdef2 = buildingDefs.find(function (bd2) { return bd2.id === scienceGate.building; });
                        var nr4 = Object.assign({}, resources); Object.keys(bdef2.cost).forEach(function (k) { nr4[k] -= bdef2.cost[k]; }); upd('colonyRes', nr4);
                        var nb = buildings.slice(); nb.push(scienceGate.building); upd('colonyBuildings', nb);
                        var newEff4 = Object.assign({}, buildingEff); newEff4[scienceGate.building] = 100; upd('buildingEff', newEff4);
                        var nl4 = gameLog.slice(); nl4.push('Built ' + bdef2.icon + ' ' + bdef2.name + '!'); upd('colonyLog', nl4);
                        if (addToast) addToast('\u2705 ' + bdef2.name + ' built!', 'success');
                        if (d.colonyTTS) colonySpeak('Construction complete. ' + bdef2.name + ' operational.', 'narrator');
                        if (typeof addXP === 'function') addXP(30, 'Built ' + bdef2.name);
                      } else { if (addToast) addToast('\u274C Incorrect! Study and try again.', 'error'); upd('scienceGateInput', ''); }
                      upd('scienceGate', null);
                    }, className: 'px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold'
                  }, '\u2705 Submit'),
                  React.createElement('button', { onClick: function () { upd('scienceGate', null); }, className: 'px-3 py-2 bg-slate-700 text-slate-300 rounded-xl text-xs' }, '\u2715')
                ),
                // Build narration
                d.buildNarration && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #052e16, #064e3b)', borderColor: '#16a34a', boxShadow: '0 0 15px rgba(22,163,106,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                  React.createElement('div', { className: 'absolute -right-6 -top-6 text-5xl opacity-10', style: { filter: 'blur(3px)' } }, '\uD83C\uDFD7\uFE0F'),
                  React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                    React.createElement('span', { className: 'text-[10px] font-bold', style: { color: '#4ade80', textShadow: '0 0 8px rgba(74,222,128,0.3)' } }, '\uD83C\uDFD7\uFE0F Construction Report'),
                    React.createElement('button', { onClick: function () { upd('buildNarration', null); }, className: 'text-green-500 text-xs hover:text-green-300 transition-colors' }, '\u2715')
                  ),
                  React.createElement('p', { className: 'text-[11px] text-green-100 italic leading-relaxed' }, '\uD83C\uDFA4 ' + d.buildNarration)
                ),
                // Gate explanation
                d.gateExplanation && React.createElement('div', { className: 'mt-2 rounded-lg px-3 py-2 text-[10px] border', style: d.gateExplanation.correct ? { background: 'linear-gradient(135deg, #052e16, #064e3b)', borderColor: '#16a34a', color: '#86efac', animation: 'kp-fadeIn 0.3s ease-out', boxShadow: '0 0 10px rgba(22,163,106,0.2)' } : { background: 'linear-gradient(135deg, #450a0a, #7f1d1d)', borderColor: '#dc2626', color: '#fca5a5', animation: 'kp-fadeIn 0.3s ease-out', boxShadow: '0 0 10px rgba(220,38,38,0.2)' } },
                  React.createElement('span', { className: 'font-bold' }, d.gateExplanation.correct ? '\u2705 Correct! ' : '\u274C Answer: ' + d.gateExplanation.answer + '. '),
                  d.gateExplanation.text
                ),
                React.createElement('div', { className: 'text-[11px] text-purple-300 mt-2' }, '\uD83D\uDCA1 This is real science! Research online if unsure.')
              ),
              // ══ Achievements Panel ══
              d.showAchievements && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 max-h-72 overflow-y-auto', style: { background: 'linear-gradient(135deg, #1c1917, #451a03, #0f172a)', borderColor: '#f43f5e30', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fb7185', textShadow: '0 0 10px rgba(251,113,133,0.3)' } }, '\uD83C\uDFC5 Achievements \u2014 ' + Object.keys(achievements).length + '/' + achievementDefs.length),
                React.createElement('div', { className: 'grid grid-cols-4 gap-2' },
                  achievementDefs.map(function(ad) {
                    var unlocked = achievements[ad.id];
                    return React.createElement('div', { key: ad.id, className: 'rounded-lg p-2 text-center transition-all ' + (unlocked ? 'hover:scale-[1.05]' : ''),
                      style: unlocked ? { background: 'linear-gradient(135deg, #78350f, #451a03)', border: '1px solid #f59e0b', boxShadow: '0 0 10px rgba(245,158,11,0.2)' } : { background: '#0f172a', border: '1px solid #1e293b', opacity: 0.4 }
                    },
                      React.createElement('div', { className: 'text-xl', style: unlocked ? { animation: 'kp-float 4s infinite' } : { filter: 'grayscale(1)' } }, ad.icon),
                      React.createElement('div', { className: 'text-[10px] font-bold mt-1', style: { color: unlocked ? '#fbbf24' : '#475569' } }, ad.name),
                      React.createElement('div', { className: 'text-[7px]', style: { color: unlocked ? '#fcd34d' : '#334155' } }, ad.desc)
                    );
                  })
                )
              ),
              // Settlers
              d.showSettlers && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #0f172a, #134e4a, #0f172a)', borderColor: '#14b8a630', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#2dd4bf', textShadow: '0 0 10px rgba(45,212,191,0.3)' } }, '\uD83D\uDC65 Colony Crew \u2014 ' + settlers.length + ' Settlers'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' }, settlers.map(function (st, si2) {
                  var roleColors = { Botanist: '#22c55e', Engineer: '#f59e0b', Geologist: '#a78bfa', Medic: '#ef4444', Chemist: '#06b6d4', Physicist: '#818cf8', Xenobiologist: '#10b981', Roboticist: '#f97316', Surgeon: '#f43f5e', Pilot: '#38bdf8', Astrophysicist: '#c084fc', Tactician: '#fbbf24' };
                  var rc = roleColors[st.role] || '#64748b';
                  return React.createElement('div', { key: si2, className: 'rounded-xl p-2 text-center transition-all hover:scale-[1.03]', style: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid ' + rc + '30', boxShadow: '0 0 8px ' + rc + '15' } },
                    React.createElement('div', { className: 'text-2xl', style: { filter: st.health < 30 ? 'grayscale(0.5)' : 'none', animation: st.morale > 80 ? 'kp-float 4s infinite' : 'none' } }, st.icon),
                    React.createElement('div', { className: 'text-[11px] font-bold text-white mt-1' }, st.name),
                    React.createElement('div', { className: 'text-[10px] font-bold', style: { color: rc } }, st.role),
                    React.createElement('div', { className: 'mt-1 grid grid-cols-2 gap-1 text-[7px]' },
                      React.createElement('div', null, React.createElement('span', { style: { color: st.morale > 60 ? '#4ade80' : '#fbbf24' } }, '\u2764 ' + st.morale), React.createElement('div', { className: 'w-full rounded-full h-1.5 mt-0.5', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-1.5 rounded-full transition-all', style: { width: st.morale + '%', background: st.morale > 60 ? 'linear-gradient(90deg, #22c55e, #4ade80)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', animation: 'kp-barFill 1s ease-out' } }))),
                      React.createElement('div', null, React.createElement('span', { style: { color: st.health > 50 ? '#22d3ee' : '#ef4444' } }, '\u2695 ' + st.health), React.createElement('div', { className: 'w-full rounded-full h-1.5 mt-0.5', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-1.5 rounded-full transition-all', style: { width: st.health + '%', background: st.health > 50 ? 'linear-gradient(90deg, #06b6d4, #22d3ee)' : 'linear-gradient(90deg, #ef4444, #f87171)', animation: 'kp-barFill 1s ease-out' } }))),
                      React.createElement('button', {
                        onClick: function () {
                          upd('talkSettler', si2);
                          upd('settlerChatLoading', true);
                          callGemini('You are ' + st.name + ', a ' + st.role + ' (specialty: ' + st.specialty + ') on the Kepler-442b space colony. Morale: ' + st.morale + '%, Health: ' + st.health + '%. Colony has ' + buildings.length + ' buildings, turn ' + turn + '. Resources: food=' + resources.food + ' energy=' + resources.energy + '. Give a brief in-character update (2-3 sentences) about your work, mood, and a science fact related to your specialty. Be personable and educational.', true).then(function (result) {
                            upd('settlerChat', result); upd('settlerChatLoading', false);
                            if (d.colonyTTS) colonySpeak(result, st.role === 'Medic' || st.role === 'Botanist' || st.role === 'Chemist' ? 'female' : 'narrator');
                            if (typeof addXP === 'function') addXP(5, 'Talked to ' + st.name);
                          }).catch(function () { upd('settlerChatLoading', false); });
                        },
                        className: 'mt-1 col-span-2 px-2 py-0.5 rounded bg-indigo-800 text-indigo-300 text-[7px] hover:bg-indigo-700'
                      }, '\uD83D\uDCAC Talk')
                    )
                  );
                }))
              ),
              // Policy Panel (Civ-inspired social policies)
              d.showPolicy && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #064e3b, #0f172a, #1e1b4b)', borderColor: '#10b98130', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#34d399', textShadow: '0 0 10px rgba(52,211,153,0.3)' } }, '\uD83C\uDFDB\uFE0F Colony Governance'),
                React.createElement('p', { className: 'text-[11px] text-emerald-300/60 mb-2' }, 'Choose a governing policy. Each provides unique bonuses. You may change policy once every 10 turns.'),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  policyDefs.map(function (pol2) {
                    var isActive = activePolicy === pol2.id;
                    return React.createElement('button', {
                      key: pol2.id,
                      onClick: function () {
                        if (!isActive) {
                          upd('colonyPolicy', pol2.id);
                          if (addToast) addToast(pol2.icon + ' Policy: ' + pol2.name + ' adopted!', 'success');
                          if (d.colonyTTS) colonySpeak('Colony policy changed to ' + pol2.name + '. ' + pol2.desc, 'narrator');
                          var nl16 = gameLog.slice(); nl16.push('\uD83C\uDFDB\uFE0F Policy: ' + pol2.name); upd('colonyLog', nl16);
                        }
                      },
                      className: 'p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02]',
                      style: isActive ? { background: 'linear-gradient(135deg, #064e3b, #065f46)', borderColor: '#10b981', boxShadow: '0 0 15px rgba(16,185,129,0.25)', animation: 'kp-glow 3s infinite' } : { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#334155' }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, pol2.icon),
                        React.createElement('span', { className: 'text-[10px] font-bold text-white' }, pol2.name),
                        isActive && React.createElement('span', { className: 'text-[10px] text-emerald-400 ml-auto' }, '\u2705 ACTIVE')
                      ),
                      React.createElement('div', { className: 'text-[10px] text-slate-600' }, pol2.desc)
                    );
                  })
                )
              ),
              // Cultural Traditions Panel
              d.showPolicy && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #451a03, #422006, #0f172a)', borderColor: '#ca8a0430', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.3)' } }, '\uD83C\uDF0D Cultural Knowledge Traditions'),
                React.createElement('p', { className: 'text-[11px] text-amber-300/60 mb-2' }, 'Ancient wisdom from diverse civilizations. Each tradition provides permanent bonuses and a real cultural lesson.'),
                React.createElement('div', { className: 'grid gap-2' },
                  traditionDefs.map(function (td3) {
                    var isAdopted = traditions.indexOf(td3.id) >= 0;
                    var canAdopt = !isAdopted && resources.science >= 10;
                    return React.createElement('div', {
                      key: td3.id, className: 'p-2 rounded-xl border flex items-center justify-between transition-all ' + (canAdopt && !isAdopted ? 'hover:scale-[1.01]' : ''),
                      style: isAdopted ? { background: 'linear-gradient(135deg, #451a03, #422006)', borderColor: '#ca8a04', boxShadow: '0 0 10px rgba(202,138,4,0.15)' } : canAdopt ? { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#475569' } : { background: '#0f172a', borderColor: '#1e293b', opacity: 0.5 }
                    },
                      React.createElement('div', { className: 'flex items-center gap-2 flex-1' },
                        React.createElement('span', { className: 'text-xl' }, td3.icon),
                        React.createElement('div', { className: 'flex-1' },
                          React.createElement('div', { className: 'flex items-center gap-1' },
                            React.createElement('span', { className: 'text-[10px] font-bold text-amber-200' }, td3.name),
                            React.createElement('span', { className: 'text-[10px] text-slate-600' }, '(' + td3.origin + ')'),
                            isAdopted && React.createElement('span', { className: 'text-amber-400 text-[10px]' }, '\u2705')
                          ),
                          React.createElement('div', { className: 'text-[10px] text-slate-600' }, td3.desc),
                          isAdopted && React.createElement('div', { className: 'text-[7px] text-amber-300 mt-0.5 italic' }, '\uD83D\uDCDA ' + td3.fact)
                        )
                      ),
                      !isAdopted && React.createElement('button', {
                        onClick: function () {
                          if (canAdopt) {
                            var nr15 = Object.assign({}, resources); nr15.science -= 10; upd('colonyRes', nr15);
                            var newTrad = traditions.slice(); newTrad.push(td3.id); upd('colonyTraditions', newTrad);
                            // Update values
                            var nv2 = Object.assign({}, colonyValues);
                            if (td3.value) nv2[td3.value] = Math.min(100, (nv2[td3.value] || 50) + 10);
                            upd('colonyValues', nv2);
                            if (td3.bonus.equity) upd('colonyEquity', Math.min(100, equity + td3.bonus.equity));
                            if (td3.bonus.happiness) upd('colonyHappiness', Math.min(100, colonyHappiness + td3.bonus.happiness));
                            var nj7 = scienceJournal.slice();
                            nj7.push({ turn: turn, source: 'Tradition: ' + td3.name + ' (' + td3.origin + ')', fact: td3.fact });
                            upd('scienceJournal', nj7);
                            if (addToast) addToast(td3.icon + ' ' + td3.name + ' adopted!', 'success');
                            callGemini('The space colony on Kepler-442b has adopted the ' + td3.name + ' cultural tradition from ' + td3.origin + ' heritage. Fact: ' + td3.fact + '. Narrate how the colony integrates this wisdom into daily life in 2-3 thoughtful sentences. Be respectful and authentic. Target: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '.', true).then(function (tradNarr) {
                              upd('tradNarration', tradNarr);
                              if (d.colonyTTS) colonySpeak(tradNarr, 'narrator');
                            }).catch(function () {
                              if (d.colonyTTS) colonySpeak('Cultural tradition adopted. ' + td3.name + '. ' + td3.fact, 'narrator');
                            });
                            var nl28 = gameLog.slice(); nl28.push(td3.icon + ' Tradition: ' + td3.name); upd('colonyLog', nl28);
                            if (typeof addXP === 'function') addXP(20, 'Tradition: ' + td3.name);
                          }
                        },
                        disabled: !canAdopt,
                        className: 'px-2 py-1 rounded-lg text-[11px] font-bold ml-2 ' + (canAdopt ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-500')
                      }, '\uD83D\uDD2C 10 sci')
                    );
                  })
                )
              ),
              // Tradition narration
              d.tradNarration && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #451a03, #422006)', borderColor: '#ca8a04', boxShadow: '0 0 15px rgba(202,138,4,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'absolute -right-6 -top-6 text-5xl opacity-10', style: { filter: 'blur(3px)' } }, '\uD83C\uDF0D'),
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold', style: { color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.3)' } }, '\uD83C\uDF0D Cultural Integration'),
                  React.createElement('button', { onClick: function () { upd('tradNarration', null); }, className: 'text-amber-500 text-xs hover:text-amber-300 transition-colors' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[11px] text-amber-100 italic leading-relaxed' }, '\uD83C\uDFA4 ' + d.tradNarration)
              ),
              // Colony Values radar
              d.showPolicy && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', borderColor: '#6366f120' } },
                d.colonyCharter && React.createElement('div', { className: 'bg-amber-950/30 rounded-lg p-2 mb-2 border border-amber-800' },
                  React.createElement('h5', { className: 'text-[11px] font-bold text-amber-300 mb-1' }, '\uD83D\uDCDC Colony Charter'),
                  React.createElement('p', { className: 'text-[10px] text-amber-200 italic leading-relaxed' }, d.colonyCharter)
                ),
                React.createElement('h4', { className: 'text-[10px] font-bold text-slate-300 mb-2' }, '\uD83C\uDFAD Colony Identity'),
                React.createElement('div', { className: 'grid grid-cols-5 gap-1 text-center' },
                  Object.keys(colonyValues).map(function (vk3) {
                    var val = colonyValues[vk3];
                    var icons = { collectivism: '\uD83E\uDD1D', innovation: '\uD83D\uDCA1', ecology: '\uD83C\uDF3F', tradition: '\uD83C\uDFDB\uFE0F', openness: '\uD83C\uDF10' };
                    return React.createElement('div', { key: vk3 },
                      React.createElement('div', { className: 'text-lg' }, icons[vk3] || '\u2022'),
                      React.createElement('div', { className: 'text-[10px] text-slate-500 capitalize' }, vk3),
                      React.createElement('div', { className: 'w-full bg-slate-700 rounded-full h-1.5 mt-1' },
                        React.createElement('div', {
                          className: 'h-1.5 rounded-full transition-all ' + (val > 60 ? 'bg-green-500' : val > 40 ? 'bg-amber-500' : 'bg-red-500'),
                          style: { width: val + '%' }
                        })
                      ),
                      React.createElement('div', { className: 'text-[7px] text-slate-600 mt-0.5' }, val)
                    );
                  })
                ),
                React.createElement('div', { className: 'mt-2 text-center' },
                  React.createElement('div', { className: 'text-[11px] ' + (equity > 60 ? 'text-green-400' : equity > 35 ? 'text-amber-400' : 'text-red-400') },
                    '\u2696\uFE0F Resource Equity: ' + equity + '%' + (equity > 75 ? ' \u2014 Fair & thriving' : equity > 50 ? ' \u2014 Moderate inequality' : equity > 25 ? ' \u2014 Growing inequality' : ' \u2014 Crisis! Settlers restless'))
                )
              ),
              // Research Panel
              d.showResearch && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #2e1065, #0f172a)', borderColor: '#7c3aed40', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                  React.createElement('h4', { className: 'text-sm font-bold', style: { color: '#a78bfa', textShadow: '0 0 10px rgba(167,139,250,0.3)' } }, '\uD83E\uDDEC Research Tree'),
                  React.createElement('div', { className: 'flex items-center gap-1.5' },
                    React.createElement('div', { className: 'w-16 h-2 rounded-full overflow-hidden', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-2 rounded-full', style: { width: (researchQueue.length * 10) + '%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', animation: 'kp-barFill 1s ease-out' } })),
                    React.createElement('span', { className: 'text-[11px] font-bold text-violet-300' }, researchQueue.length + '/10')
                  )
                ),
                React.createElement('p', { className: 'text-[11px] text-violet-300/60 mb-2' }, 'Spend science to unlock permanent bonuses. Complete all 10 for Research Victory!'),
                React.createElement('div', { className: 'grid grid-cols-1 gap-2' },
                  researchDefs.map(function (rd2) {
                    var isResearched = researchQueue.indexOf(rd2.id) >= 0;
                    var canResearch = !isResearched && resources.science >= rd2.cost;
                    var eraReady = rd2.era === 'expansion' ? (era !== 'survival') : rd2.era === 'prosperity' ? (era === 'prosperity' || era === 'transcendence') : rd2.era === 'transcendence' ? era === 'transcendence' : true;
                    var eraGradients = { expansion: 'linear-gradient(135deg, #172554, #1e1b4b)', prosperity: 'linear-gradient(135deg, #312e81, #4a1d96)', transcendence: 'linear-gradient(135deg, #4a1d96, #831843)' };
                    return React.createElement('div', {
                      key: rd2.id, className: 'p-2 rounded-xl border flex items-center justify-between transition-all ' + (eraReady && canResearch ? 'hover:scale-[1.01]' : ''),
                      style: isResearched ? { background: 'linear-gradient(135deg, #2e1065, #4c1d95)', borderColor: '#8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.2)' } : eraReady && canResearch ? { background: eraGradients[rd2.era] || '#0f172a', borderColor: '#6366f140' } : { background: '#0f172a', borderColor: '#1e293b', opacity: 0.4 }
                    },
                      React.createElement('div', { className: 'flex items-center gap-2' },
                        React.createElement('span', { className: 'text-lg' }, rd2.icon),
                        React.createElement('div', null,
                          React.createElement('span', { className: 'text-[10px] font-bold text-white' }, rd2.name),
                          isResearched && React.createElement('span', { className: 'text-violet-400 ml-1 text-[10px]' }, '\u2705'),
                          React.createElement('div', { className: 'text-[10px] text-slate-600' }, rd2.desc),
                          !eraReady && React.createElement('div', { className: 'text-[10px] text-red-400' }, '\u26D4 Requires ' + rd2.era + ' era')
                        )
                      ),
                      !isResearched && eraReady && React.createElement('button', {
                        onClick: function () {
                          if (resources.science >= rd2.cost) {
                            // Science challenge gate for research
                            upd('scienceGateLoading', true);
                            var modeR = (d.colonyMode || 'mcq') === 'mcq' ?
                              'Return ONLY valid JSON: {"question":"<question>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<2-3 sentences>"}. 6 options, shuffle correct (0-5).' :
                              'Return ONLY valid JSON: {"question":"<question>","answer":"<1-3 words>","explanation":"<2-3 sentences>"}';
                            callGemini('Generate a ' + rd2.domain + ' science question about ' + rd2.name + ' for a space colony research project. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. ' + modeR, true).then(function (result) {
                              try {
                                var cl3 = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                var s4 = cl3.indexOf('{'); if (s4 > 0) cl3 = cl3.substring(s4);
                                var e4 = cl3.lastIndexOf('}'); if (e4 > 0) cl3 = cl3.substring(0, e4 + 1);
                                var rq = JSON.parse(cl3);
                                rq.building = '_research_' + rd2.id; rq.domain = rd2.domain; rq.mode = rq.options ? 'mcq' : 'freeResponse';
                                rq._researchId = rd2.id; rq._researchCost = rd2.cost;
                                upd('scienceGate', rq); upd('scienceGateLoading', false);
                              } catch (err) { upd('scienceGateLoading', false); }
                            }).catch(function () { upd('scienceGateLoading', false); });
                          }
                        },
                        disabled: !canResearch,
                        className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (canResearch ? 'bg-violet-700 text-white' : 'bg-slate-700 text-slate-500')
                      }, '\uD83D\uDD2C ' + rd2.cost + ' sci')
                    );
                  })
                )
              ),
              // Great Scientists Panel
              d.showGreatSci && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #422006, #1c1917, #0f172a)', borderColor: '#ca8a0440', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.3)' } }, '\uD83E\uDD16 Digital Mentors \u2014 Earth Archive AI'),
                React.createElement('p', { className: 'text-[11px] text-amber-300/60 mb-2' }, 'AI reconstructions of history\u2019s greatest minds, stored in the colony ship\u2019s quantum memory. Activated as your computing power grows. Click a mentor to consult them!'),
                greatScientists.length === 0 && React.createElement('div', { className: 'text-center text-slate-600 text-[10px] py-4' }, 'No Great Scientists yet. Maintain high science reserves!'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  greatScientists.map(function (gs4, gi) {
                    return React.createElement('div', { key: gi, className: 'rounded-xl p-2 text-center transition-all hover:scale-[1.03]', style: { background: 'linear-gradient(135deg, #451a03, #1c1917)', border: '1px solid #ca8a0440', boxShadow: '0 0 10px rgba(202,138,4,0.15)' } },
                      React.createElement('div', { className: 'text-2xl', style: { animation: 'kp-float 5s infinite' } }, gs4.icon),
                      React.createElement('div', { className: 'text-[11px] font-bold mt-1', style: { color: '#fde68a', textShadow: '0 0 6px rgba(253,230,138,0.3)' } }, gs4.name),
                      React.createElement('div', { className: 'text-[7px] text-cyan-400' }, '\uD83E\uDD16 AI Simulation'),
                      React.createElement('div', { className: 'text-[10px] text-yellow-400' }, '+' + gs4.amount + ' ' + gs4.bonus + '/turn'),
                      React.createElement('div', { className: 'text-[7px] text-slate-500 mt-1 italic' }, gs4.fact),
                      React.createElement('button', {
                        onClick: function () {
                          upd('mentorChatLoading', gs4.name);
                          callGemini('You are an AI reconstruction of ' + gs4.name + ', a famous scientist, running on the quantum computers of a space colony on planet Kepler-442b in the far future. A colonist is consulting you for advice. Stay in character as ' + gs4.name + '. Respond warmly but share real scientific knowledge from your field (' + gs4.specialty + '). Reference your real historical achievements. Give practical advice that would help the colony. Keep response to 3-4 sentences. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. Current colony situation: Turn ' + turn + ', ' + settlers.length + ' settlers, ' + buildings.length + ' buildings, ' + terraform + '% terraformed.', true).then(function (mentorResult) {
                            upd('mentorChat', { name: gs4.name, icon: gs4.icon, text: mentorResult }); upd('mentorChatLoading', null);
                            if (d.colonyTTS) colonySpeak(mentorResult, gs4.specialty === 'biology' || gs4.name === 'Mae Jemison' || gs4.name === 'Rachel Carson' || gs4.name === 'Rosalind Franklin' || gs4.name === 'Ada Lovelace' ? 'female' : 'narrator');
                          }).catch(function () { upd('mentorChatLoading', null); });
                        },
                        className: 'mt-1 w-full py-1 rounded-lg bg-yellow-800 text-yellow-200 text-[10px] font-bold hover:bg-yellow-700'
                      }, d.mentorChatLoading === gs4.name ? '\u23F3...' : '\uD83D\uDCAC Consult')
                    );
                  })
                ),
                d.mentorChat && React.createElement('div', { className: 'mt-2 rounded-xl p-3', style: { background: 'linear-gradient(135deg, #451a03, #422006)', border: '1px solid #ca8a04', boxShadow: '0 0 15px rgba(202,138,4,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                  React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                    React.createElement('span', { className: 'text-[10px] font-bold text-yellow-300' }, d.mentorChat.icon + ' ' + d.mentorChat.name + ' (AI)'),
                    React.createElement('button', { onClick: function () { upd('mentorChat', null); }, className: 'text-yellow-500 text-xs' }, '\u2715')
                  ),
                  React.createElement('p', { className: 'text-[11px] text-yellow-100 leading-relaxed italic' }, '\u201C' + d.mentorChat.text + '\u201D')
                ),
                greatScientists.length < greatSciDefs.length && React.createElement('div', { className: 'mt-2 text-[10px] text-slate-600 text-center' },
                  '\u23F3 Next activation in ~' + (15 - (turn % 15)) + ' turns (need \uD83D\uDD2C 10+)'
                )
              ),
              // ══ Science Journal ══
              d.showJournal && React.createElement('div', { className: 'rounded-xl p-3 border mb-3 max-h-72 overflow-y-auto', style: { background: 'linear-gradient(135deg, #0f172a, #1a2e05, #0f172a)', borderColor: '#16a34a30', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#4ade80', textShadow: '0 0 10px rgba(74,222,128,0.3)' } }, '\uD83D\uDCD6 Science Journal \u2014 ' + scienceJournal.length + ' Entries'),
                scienceJournal.length === 0 && React.createElement('div', { className: 'text-center text-slate-600 text-[10px] py-4' }, 'No entries yet. Answer science gates and explore anomalies!'),
                scienceJournal.slice().reverse().map(function (jEntry, ji) {
                  var domainColors = { biology: '#22c55e', physics: '#6366f1', chemistry: '#f59e0b', math: '#ef4444', geology: '#a78bfa', ecology: '#14b8a6' };
                  var dc = domainColors[(jEntry.source || '').split(':')[0].toLowerCase().trim()] || '#64748b';
                  return React.createElement('div', { key: ji, className: 'mb-2 rounded-lg p-2 border', style: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: dc + '30', animation: ji === 0 ? 'kp-fadeIn 0.5s ease-out' : 'none' } },
                    React.createElement('div', { className: 'flex items-center justify-between mb-1' },
                      React.createElement('span', { className: 'text-[11px] font-bold', style: { color: dc } }, '\uD83D\uDD2C ' + jEntry.source),
                      React.createElement('span', { className: 'text-[7px] text-slate-600' }, 'Turn ' + jEntry.turn)
                    ),
                    React.createElement('div', { className: 'text-[11px] text-slate-300 leading-relaxed' }, jEntry.fact)
                  );
                })
              ),
              // Settler Chat
              d.settlerChat && d.talkSettler !== undefined && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderColor: '#6366f1', boxShadow: '0 0 15px rgba(99,102,241,0.2)', animation: 'kp-fadeIn 0.5s ease-out' } },
                React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                  React.createElement('span', { className: 'text-[10px] font-bold text-indigo-300' },
                    (settlers[d.talkSettler] ? settlers[d.talkSettler].icon + ' ' + settlers[d.talkSettler].name : '') + ' says:'
                  ),
                  React.createElement('button', { onClick: function () { upd('settlerChat', null); }, className: 'text-indigo-400 text-xs' }, '\u2715')
                ),
                React.createElement('p', { className: 'text-[10px] text-indigo-200 leading-relaxed italic' },
                  d.settlerChatLoading ? '\u23F3 Thinking...' : d.settlerChat
                )
              ),
              // Resource Conversion
              React.createElement('div', { className: 'rounded-xl p-2 border mb-3', style: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#33415520' } },
                React.createElement('div', { className: 'flex items-center justify-between mb-1' },
                  React.createElement('h4', { className: 'text-[11px] font-bold uppercase', style: { color: '#94a3b8' } }, '\u267B Resource Converter'),
                  React.createElement('span', { className: 'text-[10px]', style: { color: '#475569' } }, 'Trade 5 of one for 3 of another')
                ),
                React.createElement('div', { className: 'flex gap-1 flex-wrap' },
                  [['food', 'energy'], ['energy', 'materials'], ['materials', 'science'], ['water', 'food'], ['science', 'energy']].map(function (pair) {
                    var from = pair[0]; var to = pair[1];
                    var icons = { food: '\uD83C\uDF3E', energy: '\u26A1', water: '\uD83D\uDCA7', materials: '\uD83E\uDEA8', science: '\uD83D\uDD2C' };
                    return React.createElement('button', {
                      key: from + to,
                      onClick: function () {
                        if (resources[from] >= 5) {
                          var nr6 = Object.assign({}, resources); nr6[from] -= 5; nr6[to] += 3; upd('colonyRes', nr6);
                          if (addToast) addToast(icons[from] + ' 5 ' + from + ' \u2192 ' + icons[to] + ' 3 ' + to, 'info');
                        }
                      },
                      disabled: resources[from] < 5,
                      className: 'px-2 py-1 rounded-lg text-[10px] border ' + (resources[from] >= 5 ? 'border-slate-600 bg-slate-900 text-slate-300 hover:border-indigo-500' : 'border-slate-700 bg-slate-900/50 text-slate-600')
                    }, icons[from] + '\u2192' + icons[to]);
                  })
                )
              ),
              // ══ Expeditions Panel ══
              d.showExpeditions && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #0c4a6e, #164e63, #0f172a)', borderColor: '#06b6d430', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.3)' } }, '\u26F5 Expeditions'),
                activeExpedition && React.createElement('div', { className: 'rounded-xl p-3 mb-3 relative overflow-hidden', style: { background: 'linear-gradient(135deg, #164e63, #0c4a6e)', border: '1px solid #06b6d4', boxShadow: '0 0 15px rgba(6,182,212,0.2)' } },
                  React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                    React.createElement('span', { className: 'text-[10px] font-bold text-cyan-200' }, '\u26F5 ' + activeExpedition.type + ' in progress...'),
                    React.createElement('span', { className: 'text-[11px] text-cyan-400 font-bold' }, activeExpedition.turnsLeft + ' turns left')
                  ),
                  React.createElement('div', { className: 'w-full h-3 rounded-full overflow-hidden', style: { background: '#0f172a' } },
                    React.createElement('div', { className: 'h-3 rounded-full transition-all', style: { width: ((activeExpedition.totalTurns - activeExpedition.turnsLeft) / activeExpedition.totalTurns * 100) + '%', background: 'linear-gradient(90deg, #06b6d4, #22d3ee)', animation: 'kp-barFill 1s ease-out', boxShadow: '0 0 8px rgba(6,182,212,0.4)' } })
                  ),
                  React.createElement('div', { className: 'mt-1 text-[10px] text-cyan-400/60' }, 'Crew is exploring... Results on completion.')
                ),
                !activeExpedition && React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  [
                    { type: 'Deep Sea Survey', icon: '\uD83C\uDF0A', desc: 'Explore alien oceans for resources & life.', cost: { energy: 8, science: 5 }, turns: 3, color: '#3b82f6' },
                    { type: 'Highland Expedition', icon: '\u26F0\uFE0F', desc: 'Scale mountains for minerals & vantage points.', cost: { energy: 10, science: 5 }, turns: 4, color: '#a78bfa' },
                    { type: 'Underground Survey', icon: '\uD83D\uDD73\uFE0F', desc: 'Map caverns for rare minerals & fossils.', cost: { energy: 12, science: 8 }, turns: 5, color: '#f59e0b' },
                    { type: 'Orbital Scan', icon: '\uD83D\uDE80', desc: 'Launch satellite for planetary survey.', cost: { energy: 15, science: 10 }, turns: 4, color: '#06b6d4' }
                  ].map(function(exp) {
                    var canLaunch = Object.keys(exp.cost).every(function(k) { return resources[k] >= exp.cost[k]; }) && actionPoints >= 2;
                    return React.createElement('button', { key: exp.type, onClick: function() {
                      if (!canLaunch) return;
                      if (!spendAP(2)) return;
                      var nr = Object.assign({}, resources); Object.keys(exp.cost).forEach(function(k) { nr[k] -= exp.cost[k]; }); upd('colonyRes', nr);
                      upd('activeExpedition', { type: exp.type, turnsLeft: exp.turns, totalTurns: exp.turns });
                      var nl = gameLog.slice(); nl.push('\u26F5 Launched: ' + exp.type); upd('colonyLog', nl);
                      if (addToast) addToast('\u26F5 ' + exp.type + ' launched! Returns in ' + exp.turns + ' turns.', 'success');
                    }, disabled: !canLaunch,
                      className: 'p-2.5 rounded-xl text-left transition-all ' + (canLaunch ? 'hover:scale-[1.02]' : ''),
                      style: canLaunch ? { background: 'linear-gradient(135deg, #0f172a, #164e63)', border: '1px solid ' + exp.color + '40', boxShadow: '0 0 8px ' + exp.color + '15' } : { background: '#0f172a', border: '1px solid #1e293b', opacity: 0.4 }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1.5 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, exp.icon),
                        React.createElement('span', { className: 'text-[11px] font-bold', style: { color: exp.color } }, exp.type)
                      ),
                      React.createElement('div', { className: 'text-[10px] text-slate-500 mb-1' }, exp.desc),
                      React.createElement('div', { className: 'text-[7px] text-slate-600' }, Object.keys(exp.cost).map(function(k) { return exp.cost[k] + ' ' + k; }).join(', ') + ' \u2022 ' + exp.turns + ' turns')
                    );
                  })
                ),
                d.expResult && React.createElement('div', { className: 'mt-2 rounded-xl p-3', style: { background: 'linear-gradient(135deg, #0c4a6e, #164e63)', border: '1px solid #06b6d4', animation: 'kp-fadeIn 0.5s ease-out' } },
                  React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                    React.createElement('span', { className: 'text-[10px] font-bold text-cyan-200' }, (d.expResult.emoji || '\u26F5') + ' ' + d.expResult.title),
                    React.createElement('button', { onClick: function() { upd('expResult', null); }, className: 'text-cyan-400 text-xs' }, '\u2715')
                  ),
                  React.createElement('p', { className: 'text-[11px] text-cyan-100 leading-relaxed italic' }, d.expResult.narrative),
                  d.expResult.lesson && React.createElement('div', { className: 'mt-1.5 rounded-lg p-2 text-[10px] text-cyan-300', style: { background: '#0f172a80', border: '1px solid #06b6d420' } }, '\uD83D\uDCDA ' + d.expResult.lesson)
                )
              ),
              // ══ Wonders Panel ══
              d.showWonders && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #451a03, #78350f, #0f172a)', borderColor: '#f59e0b30', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.3)' } }, '\uD83C\uDFDB\uFE0F Wonders of Kepler'),
                React.createElement('p', { className: 'text-[11px] text-amber-300/60 mb-2' }, 'Mega-structures requiring multiple science challenges to complete. Each provides powerful permanent bonuses.'),
                React.createElement('div', { className: 'grid gap-2' },
                  wonderDefs.map(function(wd) {
                    var isComplete = wonders[wd.id];
                    var progress = wonders[wd.id + '_progress'] || 0;
                    var eraOk = wd.era === 'prosperity' ? (era === 'prosperity' || era === 'transcendence') : wd.era === 'transcendence' ? era === 'transcendence' : true;
                    var canAfford = eraOk && !isComplete && Object.keys(wd.cost).every(function(k) { return resources[k] >= wd.cost[k]; });
                    return React.createElement('div', { key: wd.id, className: 'rounded-xl p-3 transition-all ' + (isComplete ? '' : canAfford ? 'hover:scale-[1.01]' : ''),
                      style: isComplete ? { background: 'linear-gradient(135deg, #78350f, #92400e)', border: '2px solid #f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.3)', animation: 'kp-glow 3s infinite' } : canAfford ? { background: 'linear-gradient(135deg, #1c1917, #292524)', border: '1px solid #78350f' } : { background: '#0f172a', border: '1px solid #1e293b', opacity: 0.5 }
                    },
                      React.createElement('div', { className: 'flex items-center justify-between mb-1' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'text-2xl', style: isComplete ? { animation: 'kp-float 3s infinite' } : {} }, wd.icon),
                          React.createElement('div', null,
                            React.createElement('div', { className: 'text-[10px] font-bold', style: { color: isComplete ? '#fbbf24' : '#d4d4d8' } }, wd.name),
                            React.createElement('div', { className: 'text-[10px]', style: { color: isComplete ? '#fcd34d' : '#71717a' } }, wd.desc)
                          )
                        ),
                        isComplete ? React.createElement('span', { className: 'text-[11px] font-bold px-2 py-0.5 rounded-full', style: { background: '#f59e0b30', color: '#fbbf24', border: '1px solid #f59e0b' } }, '\u2728 COMPLETE') :
                        canAfford ? React.createElement('button', {
                          onClick: function() {
                            upd('scienceGateLoading', true);
                            var modeW = (d.colonyMode || 'mcq') === 'mcq' ? 'Return ONLY valid JSON: {"question":"<question>","options":["<correct>","<wrong1>","<wrong2>","<wrong3>","<wrong4>","<wrong5>"],"correctIndex":0,"explanation":"<2-3 sentences>"}. 6 options, shuffle correct (0-5).' : 'Return ONLY valid JSON: {"question":"<question>","answer":"<1-3 words>","explanation":"<2-3 sentences>"}';
                            callGemini('Generate a challenging ' + wd.domain + ' science question about building a ' + wd.name + ' (' + wd.desc + ') in a space colony. Challenge ' + (progress + 1) + ' of ' + wd.challenges + '. Difficulty: ' + (gradeDifficultyMap[gradeLevel] || 'medium') + '. ' + modeW, true).then(function(result) {
                              try {
                                var cl = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
                                var s = cl.indexOf('{'); if (s > 0) cl = cl.substring(s);
                                var e = cl.lastIndexOf('}'); if (e > 0) cl = cl.substring(0, e + 1);
                                var gp = JSON.parse(cl);
                                gp.building = '_wonder_' + wd.id; gp.domain = wd.domain; gp.mode = gp.options ? 'mcq' : 'freeResponse';
                                gp._wonderId = wd.id; gp._wonderChallenges = wd.challenges; gp._wonderName = wd.name; gp._wonderCost = wd.cost;
                                upd('scienceGate', gp); upd('scienceGateLoading', false);
                              } catch(err) { upd('scienceGateLoading', false); }
                            }).catch(function() { upd('scienceGateLoading', false); });
                          },
                          className: 'px-2 py-1 rounded-lg text-[11px] font-bold',
                          style: { background: 'linear-gradient(135deg, #78350f, #92400e)', color: '#fbbf24', border: '1px solid #f59e0b40' }
                        }, '\uD83D\uDD2C Challenge ' + (progress + 1) + '/' + wd.challenges) : null
                      ),
                      !isComplete && progress > 0 && React.createElement('div', { className: 'mt-1.5' },
                        React.createElement('div', { className: 'w-full h-2 rounded-full overflow-hidden', style: { background: '#1e293b' } },
                          React.createElement('div', { className: 'h-2 rounded-full', style: { width: (progress / wd.challenges * 100) + '%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', animation: 'kp-barFill 1s ease-out' } })
                        ),
                        React.createElement('div', { className: 'text-[7px] text-amber-400/60 mt-0.5' }, 'Progress: ' + progress + '/' + wd.challenges + ' challenges')
                      ),
                      !isComplete && !eraOk && React.createElement('div', { className: 'text-[10px] text-red-400 mt-1' }, '\u26D4 Requires ' + wd.era + ' era'),
                      !isComplete && eraOk && React.createElement('div', { className: 'text-[7px] text-slate-600 mt-1' }, 'Cost: ' + Object.keys(wd.cost).map(function(k) { return wd.cost[k] + ' ' + k; }).join(', '))
                    );
                  })
                )
              ),
              // ══ Rover Fleet HUD ══
              d.showRoverPanel && React.createElement('div', { className: 'rounded-xl p-3 border mb-3', style: { background: 'linear-gradient(135deg, #0f172a, #164e63, #0f172a)', borderColor: '#06b6d430', animation: 'kp-fadeIn 0.3s ease-out' } },
                React.createElement('h4', { className: 'text-sm font-bold mb-2', style: { color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.3)' } }, '\uD83D\uDE99 Rover Fleet'),
                rovers.length === 0 && React.createElement('div', { className: 'text-center py-3 text-[10px] text-slate-600' }, 'No rovers deployed. Build one below!'),
                rovers.length > 0 && React.createElement('div', { className: 'grid gap-2 mb-2' },
                  rovers.map(function (rv3, ri) {
                    var rvDef3 = getRoverDef(rv3.type);
                    var isSelected = selectedRover === rv3.id;
                    return React.createElement('div', { key: rv3.id, role: 'button', tabIndex: 0, 'aria-label': (isSelected ? 'Deselect ' : 'Select ') + rvDef3.name + ' rover at ' + rv3.x + ',' + rv3.y, 'aria-pressed': isSelected, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('selectedRover', isSelected ? null : rv3.id); } }, className: 'rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01]', onClick: function() { upd('selectedRover', isSelected ? null : rv3.id); },
                      style: isSelected ? { background: 'linear-gradient(135deg, #164e63, #155e75)', border: '1px solid #06b6d4', boxShadow: '0 0 10px rgba(6,182,212,0.2)' } : { background: '#0f172a', border: '1px solid #1e293b' }
                    },
                      React.createElement('span', { className: 'text-xl' }, rvDef3.icon),
                      React.createElement('div', { className: 'flex-1' },
                        React.createElement('div', { className: 'text-[11px] font-bold', style: { color: rvDef3.color } }, rvDef3.name + ' (' + rv3.x + ',' + rv3.y + ')'),
                        React.createElement('div', { className: 'flex gap-2 mt-0.5' },
                          React.createElement('div', { className: 'flex items-center gap-1' },
                            React.createElement('span', { className: 'text-[7px] text-cyan-400' }, '\u26FD ' + rv3.fuel + '/' + rvDef3.maxFuel),
                            React.createElement('div', { className: 'w-10 h-1 rounded-full', style: { background: '#1e293b' } }, React.createElement('div', { className: 'h-1 rounded-full', style: { width: (rv3.fuel / rvDef3.maxFuel * 100) + '%', background: rv3.fuel > rvDef3.maxFuel * 0.3 ? '#06b6d4' : '#ef4444' } }))
                          ),
                          React.createElement('span', { className: 'text-[7px] text-emerald-400' }, '\uD83D\uDC63 ' + rv3.movesLeft + '/' + rvDef3.maxMoves + ' moves')
                        )
                      ),
                      React.createElement('button', { onClick: function(e) { e.stopPropagation(); refuelRover(rv3.id); }, className: 'px-1.5 py-0.5 rounded text-[7px] font-bold', style: { background: '#164e63', color: '#67e8f9', border: '1px solid #06b6d440' } }, '\u26FD +4')
                    );
                  })
                ),
                React.createElement('div', { className: 'grid grid-cols-3 gap-1.5' },
                  roverDefs.map(function (rd4) {
                    var canBuild2 = Object.keys(rd4.cost).every(function(k) { return resources[k] >= rd4.cost[k]; });
                    return React.createElement('button', { key: rd4.type, onClick: function() { if(canBuild2) buildRover(rd4.type); }, disabled: !canBuild2,
                      className: 'p-2 rounded-lg text-center transition-all ' + (canBuild2 ? 'hover:scale-[1.03]' : ''),
                      style: canBuild2 ? { background: 'linear-gradient(135deg, #0f172a, #164e63)', border: '1px solid ' + rd4.color + '40', color: rd4.color } : { background: '#0f172a', border: '1px solid #1e293b', color: '#334155' }
                    },
                      React.createElement('div', { className: 'text-lg' }, rd4.icon),
                      React.createElement('div', { className: 'text-[10px] font-bold' }, rd4.name),
                      React.createElement('div', { className: 'text-[7px] opacity-60' }, Object.keys(rd4.cost).map(function(k) { return rd4.cost[k] + ' ' + k; }).join(', '))
                    );
                  })
                )
              ),
              // ══ Advisor Bar ══
              turnPhase === 'day' && (function() { var adv = getAdvisorMessage(); return adv ? React.createElement('div', { className: 'mb-3 rounded-xl p-2.5 flex items-center gap-2.5', style: { background: 'linear-gradient(135deg, #172554, #1e1b4b)', border: '1px solid #1d4ed830', animation: 'kp-slideDown 0.5s ease-out' } },
                React.createElement('div', { className: 'text-2xl flex-shrink-0', style: { animation: 'kp-float 3s infinite' } }, adv.settler ? adv.settler.icon : '\uD83E\uDD16'),
                React.createElement('div', { className: 'flex-1 min-w-0' },
                  React.createElement('div', { className: 'text-[11px] font-bold text-blue-400' }, adv.settler ? adv.settler.name + ' \u2022 ' + adv.settler.role : 'Colony AI'),
                  React.createElement('div', { className: 'text-[10px] text-blue-200' }, adv.msg)
                )
              ) : null; })(),
              // Log
              React.createElement('div', { className: 'rounded-xl p-2 border max-h-28 overflow-y-auto', style: { background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderColor: '#334155' } },
                React.createElement('h4', { className: 'text-[11px] font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1' }, '\uD83D\uDCDC Mission Log'),
                gameLog.slice(-8).reverse().map(function (log, li) { return React.createElement('div', { key: li, className: 'text-[10px] py-0.5 border-b border-slate-800/50', style: { color: li === 0 ? '#c4b5fd' : '#64748b', animation: li === 0 ? 'kp-fadeIn 0.5s ease-out' : 'none' } }, log); })
              ),
              React.createElement('button', {
                onClick: function () { upd('colonyPhase', 'setup'); upd('colony', null); upd('colonyMap', null); upd('colonyTurn', 0); upd('colonyEvent', null); upd('scienceGate', null); upd('colonyLog', []); if (addToast) addToast('Colony reset', 'info'); },
                className: 'mt-2 w-full py-2 rounded-xl text-[11px] font-bold transition-all hover:scale-[1.01]',
                style: { background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#64748b', border: '1px solid #334155', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }
              }, '\u267B Abandon & Start New')
            )
          );

    }
  });
})();
}
