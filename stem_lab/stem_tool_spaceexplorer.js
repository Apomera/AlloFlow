// ═══════════════════════════════════════════
// stem_tool_spaceexplorer.js — Space Explorer: Roguelike STEM Missions
// Procedurally generated missions to planets and moons across the solar
// system and beyond. AI-generated events challenge strategic thinking
// with real science. Each run teaches new concepts through gameplay.
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('spaceExplorer'))) {

(function() {
  'use strict';

  // WCAG live region
  (function() {
    if (document.getElementById('allo-live-spaceexplorer')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-spaceexplorer';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  function announceToSR(msg) {
    var el = document.getElementById('allo-live-spaceexplorer');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // ═══════════════════════════════════════════════════════════════
  // DESTINATIONS — Solar system and beyond
  // ═══════════════════════════════════════════════════════════════
  var DESTINATIONS = [
    {
      id: 'mars', name: 'Mars', emoji: '\uD83D\uDD34', difficulty: 1,
      gravity: 3.72, atmosphere: 'CO\u2082 (95%), thin', temp: '-60\u00B0C avg',
      travelDays: 210, color: '#c0392b', desc: 'The Red Planet — our closest neighbor.',
      hazards: ['dust storms', 'radiation', 'thin atmosphere', 'cold'],
      scienceFocus: ['geology', 'astrobiology', 'atmospheric science'],
      unlockAt: 0 // available from start
    },
    {
      id: 'europa', name: 'Europa', emoji: '\u2744\uFE0F', difficulty: 2,
      gravity: 1.31, atmosphere: 'Trace O\u2082', temp: '-160\u00B0C avg',
      travelDays: 900, color: '#5dade2', desc: 'Jupiter\'s ice moon — subsurface ocean may harbor life.',
      hazards: ['extreme cold', 'radiation belts', 'ice crust instability', 'communication delay'],
      scienceFocus: ['oceanography', 'astrobiology', 'ice mechanics'],
      unlockAt: 1
    },
    {
      id: 'titan', name: 'Titan', emoji: '\uD83C\uDF2B\uFE0F', difficulty: 3,
      gravity: 1.35, atmosphere: 'N\u2082 (98%), CH\u2084 (1.4%), thick', temp: '-179\u00B0C avg',
      travelDays: 1200, color: '#d4a017', desc: 'Saturn\'s largest moon — methane lakes and thick haze.',
      hazards: ['methane rain', 'extreme cold', 'low visibility', 'hydrocarbon seas'],
      scienceFocus: ['organic chemistry', 'meteorology', 'prebiotic chemistry'],
      unlockAt: 2
    },
    {
      id: 'enceladus', name: 'Enceladus', emoji: '\uD83D\uDCA7', difficulty: 2,
      gravity: 0.113, atmosphere: 'Water vapor geysers', temp: '-198\u00B0C avg',
      travelDays: 1100, color: '#ecf0f1', desc: 'Geysers of water erupt from a hidden ocean beneath the ice.',
      hazards: ['microgravity', 'geyser plumes', 'ice particle bombardment', 'extreme cold'],
      scienceFocus: ['geophysics', 'hydrothermal chemistry', 'astrobiology'],
      unlockAt: 1
    },
    {
      id: 'venus_cloud', name: 'Venus Cloud City', emoji: '\u2601\uFE0F', difficulty: 3,
      gravity: 8.87, atmosphere: 'CO\u2082 (96%), H\u2082SO\u2084 clouds', temp: '55\u00B0C at 55km altitude',
      travelDays: 120, color: '#f0b27a', desc: 'Floating habitats in the Venusian upper atmosphere.',
      hazards: ['sulfuric acid clouds', 'high winds', 'corrosion', 'no surface access'],
      scienceFocus: ['atmospheric chemistry', 'aerodynamics', 'materials science'],
      unlockAt: 3
    },
    {
      id: 'proxima', name: 'Proxima Centauri b', emoji: '\u2728', difficulty: 5,
      gravity: 11.0, atmosphere: 'Unknown — possibly tidally locked', temp: 'Variable',
      travelDays: 73000, color: '#8e44ad', desc: 'The nearest exoplanet — 4.24 light-years away.',
      hazards: ['stellar flares', 'unknown biology', 'tidal locking', 'generation ship psychology'],
      scienceFocus: ['astrophysics', 'exoplanetology', 'generation ship sociology'],
      unlockAt: 4
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // TECH TREE — Unlocks persist across runs
  // ═══════════════════════════════════════════════════════════════
  var TECH_TREE = [
    { id: 'solar_v2', name: 'Advanced Solar Panels', emoji: '\u2600\uFE0F', desc: '+20% power generation', cost: 50, effect: { powerBonus: 20 } },
    { id: 'recycler', name: 'Water Recycler', emoji: '\uD83D\uDCA7', desc: '-30% O\u2082 consumption per turn', cost: 75, effect: { o2SavePct: 30 } },
    { id: 'rad_shield', name: 'Radiation Shielding', emoji: '\uD83D\uDEE1\uFE0F', desc: 'Blocks radiation events', cost: 100, effect: { blockRadiation: true } },
    { id: 'ion_drive', name: 'Ion Propulsion', emoji: '\u26A1', desc: '-40% fuel cost for travel', cost: 120, effect: { fuelSavePct: 40 } },
    { id: 'ai_copilot', name: 'AI Co-Pilot', emoji: '\uD83E\uDD16', desc: 'Hints on optimal event choices', cost: 150, effect: { showHints: true } },
    { id: 'cryo_bay', name: 'Cryosleep Bay', emoji: '\u2744\uFE0F', desc: 'Crew doesn\'t consume O\u2082 during transit', cost: 200, effect: { cryoTransit: true } },
    { id: 'isru', name: 'ISRU Module', emoji: '\u26CF\uFE0F', desc: 'Extract resources from local environment', cost: 175, effect: { localResources: true } },
    { id: 'med_bay', name: 'Advanced Med Bay', emoji: '\uD83C\uDFE5', desc: '+15 morale recovery per turn', cost: 80, effect: { moraleBonus: 15 } }
  ];

  // ═══════════════════════════════════════════════════════════════
  // RESOURCE DEFINITIONS
  // ═══════════════════════════════════════════════════════════════
  var RESOURCES = {
    o2:     { label: 'O\u2082', emoji: '\uD83D\uDCA8', color: '#3b82f6', max: 100 },
    power:  { label: 'Power', emoji: '\u26A1', color: '#f59e0b', max: 100 },
    hull:   { label: 'Hull', emoji: '\uD83D\uDEE1\uFE0F', color: '#6b7280', max: 100 },
    morale: { label: 'Morale', emoji: '\uD83D\uDE0A', color: '#22c55e', max: 100 },
    fuel:   { label: 'Fuel', emoji: '\u26FD', color: '#8b5cf6', max: 100 },
    science:{ label: 'Science', emoji: '\uD83D\uDD2C', color: '#06b6d4', max: 999 }
  };

  function getInitialResources(dest, tech) {
    var base = { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    // Tech bonuses
    if (tech && tech.indexOf('solar_v2') >= 0) base.power = Math.min(100, base.power + 20);
    if (tech && tech.indexOf('med_bay') >= 0) base.morale = Math.min(100, base.morale + 15);
    // Harder destinations start with less
    if (dest.difficulty >= 3) { base.o2 -= 10; base.fuel -= 15; }
    if (dest.difficulty >= 5) { base.o2 -= 15; base.power -= 10; base.morale -= 10; }
    return base;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROCEDURAL PLANET CANVAS DRAWING
  // ═══════════════════════════════════════════════════════════════
  function drawPlanet(ctx, cx, cy, r, dest, tick) {
    if (r < 5) return;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    // Base color gradient
    var pg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    pg.addColorStop(0, lightenColor(dest.color, 40));
    pg.addColorStop(0.7, dest.color);
    pg.addColorStop(1, darkenColor(dest.color, 40));
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // Surface detail based on destination
    if (dest.id === 'mars') {
      // Canyons + polar caps
      ctx.fillStyle = 'rgba(180,100,60,0.3)';
      ctx.beginPath(); ctx.ellipse(cx + r * 0.1, cy - r * 0.1, r * 0.5, r * 0.08, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.85, r * 0.25, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    } else if (dest.id === 'europa' || dest.id === 'enceladus') {
      // Ice cracks
      ctx.strokeStyle = 'rgba(100,80,60,0.2)'; ctx.lineWidth = Math.max(0.5, r * 0.02);
      for (var ci = 0; ci < 8; ci++) {
        var a = ci * 0.8 + 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.3);
        ctx.lineTo(cx + Math.cos(a + 1.2) * r * 0.7, cy + Math.sin(a + 0.8) * r * 0.6);
        ctx.stroke();
      }
    } else if (dest.id === 'titan') {
      // Methane lakes
      ctx.fillStyle = 'rgba(50,40,20,0.25)';
      ctx.beginPath(); ctx.ellipse(cx - r * 0.2, cy + r * 0.3, r * 0.2, r * 0.12, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + r * 0.3, cy - r * 0.1, r * 0.15, r * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
      // Haze
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#d4a017';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    } else if (dest.id === 'venus_cloud') {
      // Swirling cloud bands
      ctx.globalAlpha = 0.2; ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.06;
      for (var vi = 0; vi < 5; vi++) {
        var va = vi * 0.6 + (tick || 0) * 0.0005;
        ctx.beginPath();
        ctx.arc(cx, cy + (vi - 2) * r * 0.2, r * 0.7, va, va + 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (dest.id === 'proxima') {
      // Mysterious glow
      ctx.globalAlpha = 0.3;
      var pxg = ctx.createRadialGradient(cx - r * 0.4, cy, r * 0.2, cx, cy, r);
      pxg.addColorStop(0, '#ff6b9d'); pxg.addColorStop(1, 'transparent');
      ctx.fillStyle = pxg; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Atmosphere glow
    ctx.save();
    ctx.globalAlpha = 0.2;
    var ag = ctx.createRadialGradient(cx, cy, r, cx, cy, r * 1.2);
    ag.addColorStop(0, dest.color); ag.addColorStop(1, 'transparent');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function lightenColor(hex, pct) {
    var r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    r = Math.min(255, r + pct); g = Math.min(255, g + pct); b = Math.min(255, b + pct);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function darkenColor(hex, pct) {
    var r = parseInt(hex.slice(1,3), 16), g = parseInt(hex.slice(3,5), 16), b = parseInt(hex.slice(5,7), 16);
    r = Math.max(0, r - pct); g = Math.max(0, g - pct); b = Math.max(0, b - pct);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ═══════════════════════════════════════════════════════════════
  // STARFIELD HELPER (shared with Moon Mission)
  // ═══════════════════════════════════════════════════════════════
  function drawStarfield(ctx, W, H, tick, count) {
    var seed = 7919;
    var s = seed;
    function rng() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
    var colors = ['#fff','#fff','#fff','#fff','#fff','#b8c8ff','#b8c8ff','#fff5d0','#ffd8b0'];
    for (var i = 0; i < (count || 80); i++) {
      var sx = rng() * W, sy = rng() * H;
      var sr = 0.3 + rng() * 1.2;
      var sc = colors[Math.floor(rng() * colors.length)];
      ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin((tick || 0) * 0.002 + i * 1.7));
      ctx.fillStyle = sc;
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('spaceExplorer', {
    icon: '\uD83C\uDF0C',
    label: 'Space Explorer',
    desc: 'Roguelike missions across the solar system. AI-generated challenges, real science, and strategic resource management.',
    color: 'purple',
    category: 'Simulations',
    questHooks: [
      { id: 'first_mission', label: 'Complete your first mission', icon: '\uD83D\uDE80', check: function(d) { return (d.spaceExplorer || {}).completedMissions > 0; }, progress: function(d) { return (d.spaceExplorer || {}).completedMissions > 0 ? 'Done!' : 'Not yet'; } },
      { id: 'unlock_europa', label: 'Unlock Europa', icon: '\u2744\uFE0F', check: function(d) { return (d.spaceExplorer || {}).completedMissions >= 1; }, progress: function(d) { var m = (d.spaceExplorer || {}).completedMissions || 0; return m >= 1 ? 'Unlocked!' : m + '/1'; } },
      { id: 'research_5', label: 'Earn 250 science points', icon: '\uD83D\uDD2C', check: function(d) { return ((d.spaceExplorer || {}).totalScience || 0) >= 250; }, progress: function(d) { return ((d.spaceExplorer || {}).totalScience || 0) + '/250'; } }
    ],
    render: function(ctx) {
      var React = window.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var t = ctx.t || function(k) { return k; };
      var awardStemXP = ctx.awardXP || function() {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      var d = labToolData.spaceExplorer || {};
      var upd = function(key, val) { setLabToolData(function(prev) { return Object.assign({}, prev, { spaceExplorer: Object.assign({}, prev.spaceExplorer || {}, (typeof key === 'object' ? key : (function() { var o = {}; o[key] = val; return o; })() )) }); }); };
      var updAll = function(patch) { setLabToolData(function(prev) { return Object.assign({}, prev, { spaceExplorer: Object.assign({}, prev.spaceExplorer || {}, patch) }); }); };

      // ── Persistent progression ──
      var completedMissions = d.completedMissions || 0;
      var unlockedTech = d.unlockedTech || [];
      var totalScience = d.totalScience || 0;
      var highestDifficulty = d.highestDifficulty || 0;

      // ── Current mission state ──
      var missionPhase = d.missionPhase || 'select'; // select | briefing | transit | explore | event | debrief
      var destination = d.destination ? DESTINATIONS.find(function(dd) { return dd.id === d.destination; }) : null;
      var resources = d.resources || null;
      var turn = d.turn || 0;
      var maxTurns = destination ? Math.max(8, 5 + destination.difficulty * 3) : 10;
      var missionLog = d.missionLog || [];
      var activeEvent = d.activeEvent || null;
      var eventOutcome = d.eventOutcome || null;
      var decisionLog = d.decisionLog || [];
      var isGenerating = d.isGenerating || false;

      function log(msg) {
        var nl = missionLog.slice();
        nl.push({ text: msg, time: new Date().toLocaleTimeString() });
        if (nl.length > 20) nl = nl.slice(-20);
        upd('missionLog', nl);
      }

      function addXP(amount) {
        if (typeof awardStemXP === 'function') awardStemXP('spaceExplorer', amount);
      }

      // ── Start a mission ──
      function startMission(dest) {
        var res = getInitialResources(dest, unlockedTech);
        updAll({
          missionPhase: 'briefing',
          destination: dest.id,
          resources: res,
          turn: 0,
          missionLog: [{ text: '\uD83D\uDE80 Mission to ' + dest.name + ' initiated!', time: new Date().toLocaleTimeString() }],
          activeEvent: null,
          eventOutcome: null,
          decisionLog: [],
          isGenerating: false
        });
        announceToSR('Mission to ' + dest.name + ' selected. Review the briefing.');
      }

      // ── Generate AI event for current turn ──
      function generateEvent() {
        if (!destination || !callGemini || isGenerating) return;
        upd('isGenerating', true);
        var resStr = Object.keys(resources).map(function(k) {
          return RESOURCES[k].label + ': ' + resources[k] + '/' + RESOURCES[k].max;
        }).join(', ');
        var techStr = unlockedTech.length > 0 ? unlockedTech.join(', ') : 'none';
        var prompt = 'You are a sci-fi mission event generator for an educational space exploration game. ' +
          'Generate ONE event for a crew exploring ' + destination.name + '.\n\n' +
          'DESTINATION: ' + destination.name + ' (' + destination.desc + ')\n' +
          'Hazards: ' + destination.hazards.join(', ') + '\n' +
          'Science focus: ' + destination.scienceFocus.join(', ') + '\n' +
          'Gravity: ' + destination.gravity + ' m/s\u00B2, Atmosphere: ' + destination.atmosphere + ', Temp: ' + destination.temp + '\n' +
          'Current resources: ' + resStr + '\n' +
          'Turn ' + (turn + 1) + ' of ' + maxTurns + '\n' +
          'Unlocked tech: ' + techStr + '\n' +
          'Difficulty: ' + destination.difficulty + '/5\n\n' +
          'IMPORTANT RULES:\n' +
          '- Events should teach REAL SCIENCE (physics, chemistry, biology, engineering, geology)\n' +
          '- Include a mix of dramatic crises AND mundane "slice of life" astronaut challenges\n' +
          '- Each choice must have DIFFERENT resource effects (some positive, some negative)\n' +
          '- The "optimal" choice should require scientific reasoning, not just common sense\n' +
          '- Difficulty ' + destination.difficulty + '/5 means: ' +
            (destination.difficulty <= 2 ? 'moderate challenges, forgiving resource costs' :
             destination.difficulty <= 3 ? 'serious challenges, meaningful resource costs' :
             'extreme challenges, harsh trade-offs, possible mission failure') + '\n' +
          '- Target audience: students grades 4-12\n\n' +
          'Return ONLY valid JSON:\n' +
          '{\n' +
          '  "emoji": "one emoji",\n' +
          '  "title": "Short event title",\n' +
          '  "category": "one of: systems, science, crew, environment, navigation",\n' +
          '  "description": "2-3 sentences describing the situation. Vivid but age-appropriate.",\n' +
          '  "stemConcepts": ["concept1", "concept2"],\n' +
          '  "choices": [\n' +
          '    {\n' +
          '      "label": "Action description (under 60 chars)",\n' +
          '      "icon": "one emoji",\n' +
          '      "effects": {"o2": -5, "power": 10, "science": 15},\n' +
          '      "quality": "optimal or adequate or poor",\n' +
          '      "outcome": "What happens (1-2 sentences)",\n' +
          '      "scienceReward": "Real science explanation (2-3 sentences, educational)"\n' +
          '    }\n' +
          '  ]\n' +
          '}';

        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = (typeof result === 'string' ? result : (result && result.text ? result.text : String(result || '{}')));
            cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            // Extract JSON from response
            var jsonStart = cleaned.indexOf('{');
            var jsonEnd = cleaned.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
            var event = JSON.parse(cleaned);
            if (event && event.title && event.choices && event.choices.length > 0) {
              updAll({ activeEvent: event, missionPhase: 'event', isGenerating: false });
              log(event.emoji + ' ' + event.title);
              announceToSR('Mission event: ' + event.title + '. ' + event.description);
            } else {
              throw new Error('Invalid event format');
            }
          } catch (e) {
            console.warn('[SpaceExplorer] Event parse failed:', e);
            // Fallback static event
            updAll({
              activeEvent: {
                emoji: '\u2699\uFE0F', title: 'Systems Check', category: 'systems',
                description: 'Routine diagnostics reveal minor wear on life support filters. Standard maintenance is needed.',
                stemConcepts: ['engineering', 'preventive maintenance'],
                choices: [
                  { label: 'Perform full maintenance cycle', icon: '\uD83D\uDD27', effects: { power: -5, hull: 5, o2: 5 }, quality: 'optimal', outcome: 'All systems nominal.', scienceReward: 'Preventive maintenance extends equipment life exponentially — replacing filters on schedule vs. after failure saves 10x the resources.' },
                  { label: 'Quick patch and move on', icon: '\u23E9', effects: { hull: -5 }, quality: 'adequate', outcome: 'Patched for now, but may need attention later.', scienceReward: 'Deferred maintenance creates "technical debt" — small problems compound into larger failures over time.' }
                ]
              },
              missionPhase: 'event',
              isGenerating: false
            });
          }
        }).catch(function(err) {
          console.error('[SpaceExplorer] Gemini error:', err);
          upd('isGenerating', false);
          if (addToast) addToast('Event generation failed — using backup scenario.', 'info');
          // Use fallback
          updAll({
            activeEvent: {
              emoji: '\uD83D\uDCE1', title: 'Communication Window', category: 'navigation',
              description: 'A brief window opens for high-bandwidth communication with Earth. How do you use it?',
              stemConcepts: ['electromagnetic spectrum', 'signal delay'],
              choices: [
                { label: 'Send scientific data burst', icon: '\uD83D\uDD2C', effects: { science: 20, power: -10 }, quality: 'optimal', outcome: 'Data transmitted! Earth scientists are analyzing your findings.', scienceReward: 'Radio waves travel at the speed of light. A signal to Mars takes 3-22 minutes depending on orbital position. Real-time conversation is impossible — all communication must be pre-planned.' },
                { label: 'Request supply drop coordinates', icon: '\uD83D\uDCE6', effects: { fuel: 10, o2: 5 }, quality: 'adequate', outcome: 'Supply cache coordinates received for next orbit.', scienceReward: 'Orbital mechanics determines when supply drops are possible. The transfer orbit must match your position — this is called a Hohmann transfer.' }
              ]
            },
            missionPhase: 'event',
            isGenerating: false
          });
        });
      }

      // ── Resolve an event choice ──
      function resolveEvent(event, choice) {
        // Apply resource effects
        var newRes = Object.assign({}, resources);
        if (choice.effects) {
          Object.keys(choice.effects).forEach(function(k) {
            if (newRes[k] !== undefined) {
              newRes[k] = Math.max(0, Math.min(RESOURCES[k].max, newRes[k] + choice.effects[k]));
            }
          });
        }
        // Log decision
        var newDecLog = decisionLog.slice();
        var optimalLabel = '';
        for (var i = 0; i < event.choices.length; i++) { if (event.choices[i].quality === 'optimal') { optimalLabel = event.choices[i].label; break; } }
        newDecLog.push({
          title: event.title, chosen: choice.label, quality: choice.quality,
          optimal: optimalLabel, scienceReward: choice.scienceReward
        });
        var newTurn = turn + 1;
        updAll({
          resources: newRes,
          decisionLog: newDecLog,
          eventOutcome: { outcome: choice.scienceReward, quality: choice.quality, label: choice.label, title: event.title },
          activeEvent: null,
          turn: newTurn,
          missionPhase: 'outcome'
        });
        addXP(choice.quality === 'optimal' ? 20 : choice.quality === 'adequate' ? 10 : 5);
        log((choice.quality === 'optimal' ? '\u2B50' : choice.quality === 'adequate' ? '\u2705' : '\u26A0\uFE0F') + ' ' + choice.label);
        if (addToast) addToast(choice.quality === 'optimal' ? '\u2B50 Excellent!' : choice.quality === 'adequate' ? '\u2705 Acceptable' : '\u26A0\uFE0F Suboptimal', choice.quality === 'optimal' ? 'success' : 'info');
        announceToSR('Choice resolved: ' + choice.label + '. ' + choice.outcome);

        // Check for mission failure
        if (newRes.o2 <= 0 || newRes.hull <= 0) {
          setTimeout(function() { updAll({ missionPhase: 'debrief', missionResult: 'failure' }); }, 1500);
        }
        // Check for mission complete
        else if (newTurn >= maxTurns) {
          setTimeout(function() {
            updAll({
              missionPhase: 'debrief',
              missionResult: 'success',
              completedMissions: completedMissions + 1,
              totalScience: totalScience + (newRes.science || 0),
              highestDifficulty: Math.max(highestDifficulty, destination.difficulty)
            });
          }, 1500);
        }
      }

      // ══════════════════════════════════════════
      // RENDER
      // ══════════════════════════════════════════

      // ── Destination Select ──
      if (missionPhase === 'select') {
        return h('div', { className: 'space-y-3 animate-in fade-in duration-300' },
          // Header
          h('div', { className: 'bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl p-4 text-center' },
            h('h3', { className: 'text-lg font-black text-white flex items-center justify-center gap-2' }, '\uD83C\uDF0C Space Explorer'),
            h('p', { className: 'text-xs text-purple-300 mt-1' }, 'Roguelike missions across the solar system. Each run teaches new science.'),
            completedMissions > 0 && h('div', { className: 'flex justify-center gap-3 mt-2 text-[10px] text-purple-200' },
              h('span', null, '\uD83D\uDE80 ' + completedMissions + ' missions'),
              h('span', null, '\uD83D\uDD2C ' + totalScience + ' science'),
              h('span', null, '\u26A1 ' + unlockedTech.length + ' tech')
            )
          ),
          // Tech shop button
          unlockedTech.length < TECH_TREE.length && totalScience >= 50 && h('button', {
            onClick: function() { upd('missionPhase', 'techshop'); },
            className: 'w-full py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all'
          }, '\uD83D\uDD2C Tech Shop — Spend science points on upgrades (' + totalScience + ' pts available)'),
          // Destination grid
          h('div', { className: 'grid grid-cols-2 gap-2' },
            DESTINATIONS.map(function(dest) {
              var locked = dest.unlockAt > completedMissions;
              return h('button', {
                key: dest.id,
                disabled: locked,
                onClick: function() { startMission(dest); },
                className: 'text-left p-3 rounded-xl border transition-all ' +
                  (locked ? 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed' :
                   'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 hover:border-purple-400 hover:scale-[1.02] active:scale-[0.98]')
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { className: 'text-xl' }, locked ? '\uD83D\uDD12' : dest.emoji),
                  h('span', { className: 'text-xs font-bold text-white' }, dest.name)
                ),
                h('div', { className: 'flex gap-1 mb-1' },
                  Array.from({ length: 5 }, function(_, i) {
                    return h('span', { key: i, className: 'text-[8px]' }, i < dest.difficulty ? '\u2B50' : '\u2606');
                  })
                ),
                h('p', { className: 'text-[9px] text-slate-400 leading-relaxed' }, locked ? 'Complete ' + dest.unlockAt + ' mission(s) to unlock' : dest.desc)
              );
            })
          )
        );
      }

      // ── Tech Shop ──
      if (missionPhase === 'techshop') {
        return h('div', { className: 'space-y-3 animate-in fade-in duration-300' },
          h('div', { className: 'bg-gradient-to-r from-cyan-900 to-teal-900 rounded-xl p-4 flex justify-between items-center' },
            h('div', null,
              h('h3', { className: 'text-sm font-black text-white' }, '\uD83D\uDD2C Tech Shop'),
              h('p', { className: 'text-[10px] text-cyan-300' }, totalScience + ' science points available')
            ),
            h('button', { onClick: function() { upd('missionPhase', 'select'); }, className: 'px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/20' }, '\u2190 Back')
          ),
          h('div', { className: 'space-y-2' },
            TECH_TREE.map(function(tech) {
              var owned = unlockedTech.indexOf(tech.id) >= 0;
              var canBuy = totalScience >= tech.cost && !owned;
              return h('div', { key: tech.id, className: 'flex items-center gap-3 p-3 rounded-xl border ' + (owned ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10') },
                h('span', { className: 'text-xl' }, tech.emoji),
                h('div', { className: 'flex-1' },
                  h('p', { className: 'text-xs font-bold ' + (owned ? 'text-green-300' : 'text-white') }, tech.name + (owned ? ' \u2705' : '')),
                  h('p', { className: 'text-[9px] text-slate-400' }, tech.desc)
                ),
                !owned && h('button', {
                  disabled: !canBuy,
                  onClick: function() {
                    var nt = unlockedTech.slice(); nt.push(tech.id);
                    updAll({ unlockedTech: nt, totalScience: totalScience - tech.cost });
                    if (addToast) addToast('\u26A1 ' + tech.name + ' unlocked!', 'success');
                    addXP(15);
                  },
                  className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold ' + (canBuy ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'bg-slate-700 text-slate-500 cursor-not-allowed')
                }, tech.cost + ' \uD83D\uDD2C')
              );
            })
          )
        );
      }

      // ── Mission Briefing ──
      if (missionPhase === 'briefing' && destination) {
        return h('div', { className: 'space-y-3 animate-in fade-in duration-300' },
          h('div', { className: 'bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden border border-slate-600' },
            // Planet canvas
            h('div', { className: 'relative', style: { height: '200px' } },
              h('canvas', {
                style: { width: '100%', height: '100%', display: 'block' },
                'aria-label': 'View of ' + destination.name + ' from approach trajectory',
                ref: function(cvEl) {
                  if (!cvEl || cvEl._briefInit) return;
                  cvEl._briefInit = true;
                  var ctx = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 400, H = cvEl.offsetHeight || 200;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx.scale(2, 2);
                  var tick = 0;
                  function draw() {
                    tick++;
                    ctx.fillStyle = '#020010'; ctx.fillRect(0, 0, W, H);
                    drawStarfield(ctx, W, H, tick, 100);
                    drawPlanet(ctx, W * 0.6, H * 0.5, Math.min(W, H) * 0.35, destination, tick);
                    // Vignette
                    var vg = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
                    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,0.4)');
                    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
                    requestAnimationFrame(draw);
                  }
                  draw();
                }
              })
            ),
            // Briefing text
            h('div', { className: 'p-4 space-y-3' },
              h('h4', { className: 'text-lg font-black text-white flex items-center gap-2' }, destination.emoji, ' Mission to ' + destination.name),
              h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, destination.desc),
              h('div', { className: 'grid grid-cols-2 gap-2 text-[10px]' },
                h('div', { className: 'bg-white/5 rounded-lg p-2' }, h('span', { className: 'text-slate-500' }, 'Gravity: '), h('span', { className: 'text-white font-bold' }, destination.gravity + ' m/s\u00B2')),
                h('div', { className: 'bg-white/5 rounded-lg p-2' }, h('span', { className: 'text-slate-500' }, 'Temp: '), h('span', { className: 'text-white font-bold' }, destination.temp)),
                h('div', { className: 'bg-white/5 rounded-lg p-2' }, h('span', { className: 'text-slate-500' }, 'Atmosphere: '), h('span', { className: 'text-white font-bold' }, destination.atmosphere)),
                h('div', { className: 'bg-white/5 rounded-lg p-2' }, h('span', { className: 'text-slate-500' }, 'Travel: '), h('span', { className: 'text-white font-bold' }, destination.travelDays + ' days'))
              ),
              h('div', { className: 'flex flex-wrap gap-1' },
                destination.hazards.map(function(hz) {
                  return h('span', { key: hz, className: 'px-2 py-0.5 rounded-full text-[9px] bg-red-500/10 text-red-300 border border-red-500/20' }, '\u26A0\uFE0F ' + hz);
                })
              ),
              h('button', {
                onClick: function() { updAll({ missionPhase: 'explore' }); generateEvent(); },
                className: 'w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg transition-all'
              }, '\uD83D\uDE80 Launch Mission')
            )
          )
        );
      }

      // ── Exploration (resource HUD + event/outcome cycle) ──
      if ((missionPhase === 'explore' || missionPhase === 'event' || missionPhase === 'outcome') && destination && resources) {
        return h('div', { className: 'space-y-3 animate-in fade-in duration-200' },
          // Resource HUD
          h('div', { className: 'bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-3 border border-slate-600' },
            h('div', { className: 'flex justify-between items-center mb-2' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-sm' }, destination.emoji),
                h('span', { className: 'text-xs font-bold text-white' }, destination.name)
              ),
              h('span', { className: 'text-[10px] font-mono text-slate-400' }, 'Turn ' + turn + '/' + maxTurns)
            ),
            h('div', { className: 'grid grid-cols-3 gap-1.5' },
              Object.keys(RESOURCES).map(function(k) {
                var r = RESOURCES[k];
                var val = resources[k] || 0;
                var pct = r.max === 999 ? 100 : Math.round(val / r.max * 100);
                var barColor = val <= r.max * 0.15 ? '#ef4444' : val <= r.max * 0.3 ? '#f59e0b' : r.color;
                return h('div', { key: k, className: 'bg-white/5 rounded-lg p-1.5' },
                  h('div', { className: 'flex justify-between text-[9px] mb-0.5' },
                    h('span', { className: 'text-slate-400' }, r.emoji + ' ' + r.label),
                    h('span', { className: 'font-bold', style: { color: barColor } }, r.max === 999 ? val : val + '%')
                  ),
                  r.max !== 999 && h('div', { className: 'h-1.5 bg-slate-700 rounded-full overflow-hidden' },
                    h('div', { style: { width: pct + '%', backgroundColor: barColor }, className: 'h-full rounded-full transition-all duration-500' })
                  )
                );
              })
            )
          ),

          // Event card
          activeEvent && missionPhase === 'event' && h('div', {
            className: 'bg-gradient-to-br from-amber-950 to-slate-900 rounded-xl p-4 border border-amber-700/50 shadow-lg',
            role: 'alertdialog', 'aria-label': 'Mission event: ' + activeEvent.title
          },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-2xl' }, activeEvent.emoji || '\u2699\uFE0F'),
              h('div', null,
                h('h5', { className: 'text-sm font-bold text-amber-300' }, activeEvent.title),
                activeEvent.stemConcepts && h('div', { className: 'flex gap-1 mt-0.5 flex-wrap' },
                  activeEvent.stemConcepts.map(function(c) {
                    return h('span', { key: c, className: 'px-1.5 py-0.5 rounded-full text-[8px] bg-sky-500/15 text-sky-300 border border-sky-500/20' }, c);
                  })
                )
              )
            ),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, activeEvent.description),
            h('div', { className: 'space-y-2' },
              (activeEvent.choices || []).map(function(choice, ci) {
                return h('button', {
                  key: ci,
                  onClick: function() { resolveEvent(activeEvent, choice); },
                  className: 'w-full text-left p-3 rounded-lg border transition-all hover:scale-[1.01] active:scale-[0.98] bg-white/5 border-white/10 hover:border-amber-400/40 hover:bg-amber-500/5'
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', null, choice.icon || '\u2699\uFE0F'),
                    h('span', { className: 'text-xs font-bold text-white' }, choice.label)
                  ),
                  choice.effects && h('div', { className: 'flex flex-wrap gap-2 text-[9px] mt-1' },
                    Object.keys(choice.effects).map(function(k) {
                      var v = choice.effects[k];
                      var r = RESOURCES[k];
                      return r ? h('span', { key: k, className: v > 0 ? 'text-green-400' : 'text-red-400' },
                        r.emoji + ' ' + (v > 0 ? '+' : '') + v
                      ) : null;
                    })
                  )
                );
              })
            )
          ),

          // Generating indicator
          isGenerating && h('div', { className: 'bg-slate-800 rounded-xl p-6 border border-slate-600 text-center' },
            h('div', { className: 'animate-spin text-3xl mb-2' }, '\uD83C\uDF0C'),
            h('p', { className: 'text-xs text-slate-400' }, 'Generating mission event for ' + destination.name + '...')
          ),

          // Event outcome
          eventOutcome && missionPhase === 'outcome' && h('div', {
            className: 'bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-600/50'
          },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-lg' }, eventOutcome.quality === 'optimal' ? '\u2B50' : eventOutcome.quality === 'adequate' ? '\u2705' : '\u26A0\uFE0F'),
              h('span', { className: 'text-sm font-bold ' + (eventOutcome.quality === 'optimal' ? 'text-green-400' : eventOutcome.quality === 'adequate' ? 'text-yellow-400' : 'text-orange-400') },
                eventOutcome.quality === 'optimal' ? 'Excellent Decision!' : eventOutcome.quality === 'adequate' ? 'Acceptable Solution' : 'Suboptimal Choice'
              )
            ),
            h('div', { className: 'bg-sky-500/10 rounded-lg p-3 border border-sky-500/20 mb-3' },
              h('p', { className: 'text-[10px] text-sky-200 leading-relaxed' }, '\uD83D\uDD2C ' + eventOutcome.outcome)
            ),
            turn >= maxTurns ? h('p', { className: 'text-xs text-green-300 font-bold text-center mb-2' }, '\uD83C\uDF89 Mission complete! Preparing debrief...') :
            (resources.o2 <= 0 || resources.hull <= 0) ? h('p', { className: 'text-xs text-red-300 font-bold text-center mb-2' }, '\u26A0\uFE0F Critical failure! Mission ending...') :
            h('button', {
              onClick: function() { updAll({ eventOutcome: null, missionPhase: 'explore' }); generateEvent(); },
              className: 'w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md transition-all'
            }, '\uD83D\uDE80 Continue Exploration (Turn ' + (turn + 1) + '/' + maxTurns + ')')
          ),

          // Mission log (collapsible)
          missionLog.length > 0 && h('details', { className: 'bg-slate-800/50 rounded-xl border border-slate-700' },
            h('summary', { className: 'px-3 py-2 text-[10px] font-bold text-slate-500 cursor-pointer' }, '\uD83D\uDCCB Mission Log (' + missionLog.length + ' entries)'),
            h('div', { className: 'px-3 pb-2 space-y-0.5' },
              missionLog.slice().reverse().map(function(entry, i) {
                return h('div', { key: i, className: 'flex justify-between text-[9px]' },
                  h('span', { className: 'text-slate-400' }, entry.text),
                  h('span', { className: 'text-slate-600 font-mono' }, entry.time)
                );
              })
            )
          )
        );
      }

      // ── Mission Debrief ──
      if (missionPhase === 'debrief' && destination) {
        var success = d.missionResult === 'success';
        var optCount = decisionLog.filter(function(x) { return x.quality === 'optimal'; }).length;
        var pct = decisionLog.length > 0 ? Math.round(optCount / decisionLog.length * 100) : 0;
        return h('div', { className: 'space-y-3 animate-in fade-in duration-300' },
          h('div', { className: 'bg-gradient-to-br ' + (success ? 'from-green-950 to-slate-900 border-green-700' : 'from-red-950 to-slate-900 border-red-700') + ' rounded-xl p-5 border text-center' },
            h('div', { className: 'text-4xl mb-2' }, success ? '\uD83C\uDF89' : '\uD83D\uDCA5'),
            h('h4', { className: 'text-xl font-black ' + (success ? 'text-green-300' : 'text-red-300') }, success ? 'MISSION SUCCESS!' : 'MISSION FAILED'),
            h('p', { className: 'text-xs text-slate-400 mt-1' }, destination.name + ' \u2022 Difficulty ' + destination.difficulty + '/5 \u2022 ' + turn + ' turns'),
            success && h('p', { className: 'text-xs text-cyan-300 mt-2' }, '\uD83D\uDD2C +' + (resources.science || 0) + ' science points earned!')
          ),
          // Decision analysis
          decisionLog.length > 0 && h('div', { className: 'bg-white/5 rounded-xl p-3 border border-white/10' },
            h('p', { className: 'text-[10px] text-slate-500 font-bold mb-2' }, '\uD83D\uDCCA DECISION ANALYSIS'),
            decisionLog.map(function(dec, i) {
              return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2.5 border border-white/10 mb-1.5' },
                h('div', { className: 'flex justify-between items-center mb-1' },
                  h('span', { className: 'text-[10px] font-bold text-white' }, dec.title),
                  h('span', { className: 'text-[9px] px-2 py-0.5 rounded-full ' +
                    (dec.quality === 'optimal' ? 'bg-green-500/20 text-green-300' : dec.quality === 'adequate' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300')
                  }, (dec.quality || 'unknown').toUpperCase())
                ),
                h('p', { className: 'text-[9px] text-slate-400' }, 'You: "' + dec.chosen + '"'),
                dec.quality !== 'optimal' && dec.optimal && h('p', { className: 'text-[9px] text-indigo-300 mt-1' }, '\uD83D\uDCA1 Better: "' + dec.optimal + '"')
              );
            }),
            h('div', { className: 'bg-indigo-500/10 rounded-lg p-2 border border-indigo-500/20 mt-2 text-center' },
              h('p', { className: 'text-xs font-bold ' + (pct >= 80 ? 'text-green-300' : pct >= 50 ? 'text-yellow-300' : 'text-orange-300') },
                'Decision Score: ' + optCount + '/' + decisionLog.length + ' optimal (' + pct + '%)'),
              h('p', { className: 'text-[9px] text-slate-400 mt-0.5' },
                pct >= 80 ? 'Outstanding! You think like a real mission commander.' :
                pct >= 50 ? 'Solid thinking. Review the science notes to improve.' :
                'Room for improvement \u2014 but every explorer learns from experience!')
            )
          ),
          // Action buttons
          h('div', { className: 'flex gap-2' },
            h('button', {
              onClick: function() { updAll({ missionPhase: 'select', destination: null, resources: null, turn: 0, missionLog: [], activeEvent: null, eventOutcome: null, decisionLog: [], missionResult: null }); },
              className: 'flex-1 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md'
            }, '\uD83C\uDF0C New Mission'),
            success && totalScience >= 50 && h('button', {
              onClick: function() { updAll({ missionPhase: 'techshop', destination: null, resources: null, turn: 0, missionLog: [], activeEvent: null, eventOutcome: null, decisionLog: [], missionResult: null }); },
              className: 'flex-1 py-3 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20'
            }, '\uD83D\uDD2C Tech Shop')
          )
        );
      }

      // Fallback
      return h('div', { className: 'text-center p-6 text-slate-500 text-xs' }, 'Loading Space Explorer...');
    }
  });

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_spaceexplorer.js');
})();

} // end dedup guard
