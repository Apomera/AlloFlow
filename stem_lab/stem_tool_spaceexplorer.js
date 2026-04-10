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
    },
    {
      id: 'moon_base', name: 'Lunar Base Alpha', emoji: '\uD83C\uDF11', difficulty: 1,
      gravity: 1.62, atmosphere: 'None (vacuum)', temp: '-173 to 127\u00B0C',
      travelDays: 3, color: '#9ca3af', desc: 'Establish humanity\'s first permanent Moon base at Shackleton Crater.',
      hazards: ['micrometeorites', 'lunar dust', 'vacuum exposure', 'radiation'],
      scienceFocus: ['geology', 'engineering', 'resource extraction'],
      unlockAt: 0
    },
    {
      id: 'io', name: 'Io (Jupiter)', emoji: '\uD83C\uDF0B', difficulty: 4,
      gravity: 1.80, atmosphere: 'SO\u2082 (thin)', temp: '-143\u00B0C (surface), 1700\u00B0C (lava)',
      travelDays: 950, color: '#e8b730', desc: 'The most volcanically active body in the solar system \u2014 400+ active volcanoes.',
      hazards: ['lava flows', 'sulfur dioxide plumes', 'intense radiation', 'tidal heating quakes'],
      scienceFocus: ['volcanology', 'tidal mechanics', 'plasma physics'],
      unlockAt: 3
    },
    {
      id: 'asteroid', name: 'Asteroid 16 Psyche', emoji: '\u2604\uFE0F', difficulty: 3,
      gravity: 0.06, atmosphere: 'None', temp: '-93\u00B0C avg',
      travelDays: 700, color: '#71717a', desc: 'A metallic asteroid worth $10,000 quadrillion \u2014 possibly a protoplanet core.',
      hazards: ['microgravity', 'tumbling rotation', 'collision debris', 'communication blackouts'],
      scienceFocus: ['metallurgy', 'orbital mechanics', 'mining engineering'],
      unlockAt: 2
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
  // CREW SYSTEM — Named characters with specializations
  // ═══════════════════════════════════════════════════════════════
  var CREW_POOL = [
    { name: 'Dr. Kenji Tanaka', role: 'Geologist', emoji: '\uD83E\uDEA8', specialty: 'geology', bonus: { science: 5 }, quote: 'Every rock tells a story billions of years old.' },
    { name: 'Cmdr. Aisha Okonkwo', role: 'Commander', emoji: '\uD83D\uDE80', specialty: 'leadership', bonus: { morale: 5 }, quote: 'Stay calm, think clearly, act decisively.' },
    { name: 'Lt. Sofia Reyes', role: 'Pilot', emoji: '\uD83D\uDEF0\uFE0F', specialty: 'navigation', bonus: { fuel: 5 }, quote: 'Orbital mechanics isn\'t math — it\'s poetry.' },
    { name: 'Dr. Wei Chen', role: 'Biologist', emoji: '\uD83E\uDDEC', specialty: 'astrobiology', bonus: { o2: 5 }, quote: 'If there\'s water, there might be life.' },
    { name: 'Eng. Marcus Johansson', role: 'Engineer', emoji: '\uD83D\uDD27', specialty: 'systems', bonus: { hull: 5, power: 3 }, quote: 'Redundancy isn\'t paranoia — it\'s survival.' },
    { name: 'Dr. Priya Sharma', role: 'Physicist', emoji: '\u2699\uFE0F', specialty: 'physics', bonus: { power: 5 }, quote: 'The universe speaks in equations.' },
    { name: 'Sgt. Tomoko Ishida', role: 'Medic', emoji: '\uD83C\uDFE5', specialty: 'medical', bonus: { morale: 8 }, quote: 'A healthy crew is a capable crew.' },
    { name: 'Dr. Oluwaseun Adeyemi', role: 'Chemist', emoji: '\u2697\uFE0F', specialty: 'chemistry', bonus: { o2: 3, science: 3 }, quote: 'Chemistry is just atoms being social.' }
  ];

  function selectCrew(dest) {
    // Pick 4 crew members, prioritizing specialties relevant to the destination
    var pool = CREW_POOL.slice();
    var crew = [];
    // Always include a commander
    var cmdIdx = pool.findIndex(function(c) { return c.role === 'Commander'; });
    if (cmdIdx >= 0) { crew.push(pool.splice(cmdIdx, 1)[0]); }
    // Prioritize relevant specialties
    dest.scienceFocus.forEach(function(sf) {
      if (crew.length >= 4) return;
      var idx = pool.findIndex(function(c) { return c.specialty === sf || sf.indexOf(c.specialty) >= 0; });
      if (idx >= 0) crew.push(pool.splice(idx, 1)[0]);
    });
    // Fill remaining with random
    while (crew.length < 4 && pool.length > 0) {
      var ri = Math.floor(Math.random() * pool.length);
      crew.push(pool.splice(ri, 1)[0]);
    }
    return crew;
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOURCE DEFINITIONS + PER-TURN DRAIN
  // ═══════════════════════════════════════════════════════════════
  var RESOURCES = {
    o2:     { label: 'O\u2082', emoji: '\uD83D\uDCA8', color: '#3b82f6', max: 100 },
    power:  { label: 'Power', emoji: '\u26A1', color: '#f59e0b', max: 100 },
    hull:   { label: 'Hull', emoji: '\uD83D\uDEE1\uFE0F', color: '#6b7280', max: 100 },
    morale: { label: 'Morale', emoji: '\uD83D\uDE0A', color: '#22c55e', max: 100 },
    fuel:   { label: 'Fuel', emoji: '\u26FD', color: '#8b5cf6', max: 100 },
    science:{ label: 'Science', emoji: '\uD83D\uDD2C', color: '#06b6d4', max: 999 }
  };

  // Each destination drains resources differently each turn
  var DESTINATION_DRAINS = {
    mars:        { o2: -3, power: -2, fuel: -2, morale: -1 },
    europa:      { o2: -4, power: -4, fuel: -2, morale: -2, hull: -1 },
    titan:       { o2: -3, power: -3, fuel: -3, morale: -2 },
    enceladus:   { o2: -4, power: -3, fuel: -2, morale: -1 },
    venus_cloud: { o2: -3, power: -2, fuel: -3, morale: -2, hull: -2 },
    proxima:     { o2: -5, power: -4, fuel: -4, morale: -3, hull: -1 }
  };

  function getInitialResources(dest, tech, crew) {
    var base = { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    // Tech bonuses
    if (tech && tech.indexOf('solar_v2') >= 0) base.power = Math.min(100, base.power + 20);
    if (tech && tech.indexOf('med_bay') >= 0) base.morale = Math.min(100, base.morale + 15);
    // Crew bonuses
    if (crew) {
      crew.forEach(function(c) {
        if (c.bonus) Object.keys(c.bonus).forEach(function(k) { if (base[k] !== undefined) base[k] = Math.min(RESOURCES[k].max, base[k] + c.bonus[k]); });
      });
    }
    // Harder destinations start with less
    if (dest.difficulty >= 3) { base.o2 -= 10; base.fuel -= 15; }
    if (dest.difficulty >= 5) { base.o2 -= 15; base.power -= 10; base.morale -= 10; }
    return base;
  }

  function applyTurnDrain(resources, dest, tech) {
    var drain = DESTINATION_DRAINS[dest.id] || { o2: -2, power: -2, fuel: -1 };
    var newRes = Object.assign({}, resources);
    Object.keys(drain).forEach(function(k) {
      var amount = drain[k];
      // Tech mitigations
      if (k === 'o2' && tech && tech.indexOf('recycler') >= 0) amount = Math.round(amount * 0.7);
      if (k === 'power' && tech && tech.indexOf('solar_v2') >= 0) amount = Math.round(amount * 0.8);
      if (k === 'fuel' && tech && tech.indexOf('ion_drive') >= 0) amount = Math.round(amount * 0.6);
      newRes[k] = Math.max(0, Math.min(RESOURCES[k].max, (newRes[k] || 0) + amount));
    });
    return newRes;
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
    } else if (dest.id === 'moon_base') {
      // Craters + Shackleton rim shadow
      ctx.fillStyle = 'rgba(80,80,90,0.3)';
      for (var mi = 0; mi < 12; mi++) {
        var mcx = cx + (mi * 31 % 7 - 3) * r * 0.12;
        var mcy = cy + (mi * 17 % 5 - 2) * r * 0.15;
        var mcr = r * (0.05 + (mi % 4) * 0.03);
        ctx.beginPath(); ctx.arc(mcx, mcy, mcr, 0, Math.PI * 2); ctx.fill();
      }
      // Base marker
      ctx.fillStyle = 'rgba(96,165,250,0.6)'; ctx.beginPath();
      ctx.arc(cx - r * 0.3, cy + r * 0.4, r * 0.04, 0, Math.PI * 2); ctx.fill();
    } else if (dest.id === 'io') {
      // Volcanic surface: lava spots + sulfur deposits
      var lavaColors = ['rgba(255,100,20,0.4)', 'rgba(255,200,0,0.3)', 'rgba(200,50,0,0.35)'];
      for (var ioi = 0; ioi < 10; ioi++) {
        ctx.fillStyle = lavaColors[ioi % 3];
        var ix = cx + Math.cos(ioi * 2.1) * r * (0.2 + (ioi % 3) * 0.2);
        var iy = cy + Math.sin(ioi * 1.7) * r * (0.3 + (ioi % 2) * 0.15);
        ctx.beginPath(); ctx.arc(ix, iy, r * (0.03 + (ioi % 4) * 0.015), 0, Math.PI * 2); ctx.fill();
      }
      // Plume eruption
      if (tick && (tick % 120) < 40) {
        ctx.fillStyle = 'rgba(255,255,100,0.2)';
        ctx.beginPath(); ctx.moveTo(cx + r * 0.2, cy - r * 0.6);
        ctx.lineTo(cx + r * 0.15, cy - r * 1.1); ctx.lineTo(cx + r * 0.25, cy - r * 1.1);
        ctx.closePath(); ctx.fill();
      }
    } else if (dest.id === 'asteroid') {
      // Irregular metallic shape (draw as jagged polygon instead of circle)
      ctx.restore(); // undo clip to draw non-circular
      ctx.save();
      ctx.fillStyle = dest.color;
      ctx.beginPath();
      for (var ai = 0; ai < 12; ai++) {
        var aa = ai * Math.PI * 2 / 12;
        var ar = r * (0.7 + Math.sin(ai * 3.1 + 1.7) * 0.3);
        var ax = cx + Math.cos(aa) * ar;
        var ay = cy + Math.sin(aa) * ar;
        if (ai === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      }
      ctx.closePath(); ctx.fill();
      // Metallic sheen
      var mg = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      mg.addColorStop(0, 'rgba(200,200,220,0.15)'); mg.addColorStop(0.5, 'rgba(255,255,255,0.08)'); mg.addColorStop(1, 'rgba(100,100,120,0.1)');
      ctx.fillStyle = mg; ctx.fill();
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
      { id: 'complete_3', label: 'Complete 3 missions', icon: '\u2B50', check: function(d) { return ((d.spaceExplorer || {}).completedMissions || 0) >= 3; }, progress: function(d) { return ((d.spaceExplorer || {}).completedMissions || 0) + '/3'; } },
      { id: 'unlock_europa', label: 'Unlock Europa', icon: '\u2744\uFE0F', check: function(d) { return (d.spaceExplorer || {}).completedMissions >= 1; }, progress: function(d) { var m = (d.spaceExplorer || {}).completedMissions || 0; return m >= 1 ? 'Unlocked!' : m + '/1'; } },
      { id: 'research_250', label: 'Earn 250 science points', icon: '\uD83D\uDD2C', check: function(d) { return ((d.spaceExplorer || {}).totalScience || 0) >= 250; }, progress: function(d) { return ((d.spaceExplorer || {}).totalScience || 0) + '/250'; } },
      { id: 'unlock_tech_3', label: 'Unlock 3 technologies', icon: '\u26A1', check: function(d) { return ((d.spaceExplorer || {}).unlockedTech || []).length >= 3; }, progress: function(d) { return ((d.spaceExplorer || {}).unlockedTech || []).length + '/3'; } },
      { id: 'difficulty_3', label: 'Complete a difficulty 3+ mission', icon: '\uD83C\uDFC6', check: function(d) { return ((d.spaceExplorer || {}).highestDifficulty || 0) >= 3; }, progress: function(d) { return ((d.spaceExplorer || {}).highestDifficulty || 0) >= 3 ? 'Done!' : 'Not yet'; } },
      { id: 'optimal_80', label: 'Score 80%+ optimal decisions in a mission', icon: '\uD83E\uDDE0', check: function(d) { return (d.spaceExplorer || {}).bestOptimalPct >= 80; }, progress: function(d) { return ((d.spaceExplorer || {}).bestOptimalPct || 0) + '% best'; } }
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
      var missionPhase = d.missionPhase || 'select'; // select | briefing | transit | explore | event | outcome | debrief
      var destination = d.destination ? DESTINATIONS.find(function(dd) { return dd.id === d.destination; }) : null;
      var resources = d.resources || null;
      var crew = d.crew || [];
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
        var missionCrew = selectCrew(dest);
        var res = getInitialResources(dest, unlockedTech, missionCrew);
        updAll({
          missionPhase: 'briefing',
          destination: dest.id,
          crew: missionCrew,
          resources: res,
          turn: 0,
          missionLog: [{ text: '\uD83D\uDE80 Mission to ' + dest.name + ' initiated! Crew: ' + missionCrew.map(function(c) { return c.name; }).join(', '), time: new Date().toLocaleTimeString() }],
          activeEvent: null,
          eventOutcome: null,
          decisionLog: [],
          isGenerating: false
        });
        announceToSR('Mission to ' + dest.name + ' selected. Crew of ' + missionCrew.length + ' assembled. Review the briefing.');
      }

      // ── Generate AI event for current turn ──
      function generateEvent() {
        if (!destination || !callGemini || isGenerating) return;
        upd('isGenerating', true);

        // Apply per-turn resource drain BEFORE generating the event
        var drainedRes = applyTurnDrain(resources, destination, unlockedTech);
        upd('resources', drainedRes);

        // Check for critical resource warnings
        var warnings = [];
        Object.keys(drainedRes).forEach(function(k) {
          if (RESOURCES[k].max !== 999 && drainedRes[k] <= 15) warnings.push(RESOURCES[k].emoji + ' ' + RESOURCES[k].label + ' critical (' + drainedRes[k] + '%)');
        });
        if (warnings.length > 0 && addToast) addToast('\u26A0\uFE0F ' + warnings.join(' | '), 'warning');

        // Build rich context for the AI
        var resStr = Object.keys(drainedRes).map(function(k) {
          var val = drainedRes[k]; var max = RESOURCES[k].max;
          var status = max === 999 ? '' : (val <= 15 ? ' CRITICAL!' : val <= 30 ? ' (low)' : '');
          return RESOURCES[k].label + ': ' + val + (max !== 999 ? '/' + max + status : '');
        }).join(', ');
        var crewStr = crew.length > 0 ? crew.map(function(c) { return c.name + ' (' + c.role + ', specialty: ' + c.specialty + ')'; }).join('; ') : 'Generic crew';
        var prevEventsStr = decisionLog.length > 0 ? decisionLog.map(function(dl) { return dl.title + ' (chose: "' + dl.chosen + '", ' + dl.quality + ')'; }).join('; ') : 'No events yet.';
        var techStr = unlockedTech.length > 0 ? unlockedTech.join(', ') : 'none';
        var missionStage = turn < maxTurns * 0.3 ? 'EARLY MISSION (setup)' : turn < maxTurns * 0.7 ? 'MID MISSION (deep exploration)' : 'LATE MISSION (preparing departure)';
        var eventHints = turn < 2 ? 'Focus on arrival/setup challenges.' :
          turn >= maxTurns - 2 ? 'Focus on departure prep or last-chance discoveries.' :
          warnings.length > 0 ? 'A resource is critically low \u2014 offer a way to recover it (at a cost).' :
          'Mix: science discovery (40%), systems (25%), crew dynamics (20%), environment (15%).';

        var prompt = 'You are a master storyteller and science educator for "Space Explorer," an educational roguelike. ' +
          'Generate ONE vivid, scientifically grounded event.\n\n' +
          '\u2550\u2550\u2550 MISSION \u2550\u2550\u2550\n' +
          destination.name + ' \u2014 ' + destination.desc + '\n' +
          'Gravity: ' + destination.gravity + ' m/s\u00B2 | Atmo: ' + destination.atmosphere + ' | Temp: ' + destination.temp + '\n' +
          'Hazards: ' + destination.hazards.join(', ') + '\n' +
          'Science: ' + destination.scienceFocus.join(', ') + '\n\n' +
          '\u2550\u2550\u2550 CREW \u2550\u2550\u2550\n' + crewStr + '\n\n' +
          '\u2550\u2550\u2550 STATUS \u2550\u2550\u2550\n' + resStr + '\n' +
          'Turn ' + (turn + 1) + '/' + maxTurns + ' | ' + missionStage + ' | Tech: ' + techStr + '\n\n' +
          '\u2550\u2550\u2550 HISTORY \u2550\u2550\u2550\n' + prevEventsStr + '\n\n' +
          '\u2550\u2550\u2550 RULES \u2550\u2550\u2550\n' +
          eventHints + '\n' +
          '- Teach REAL SCIENCE through the scenario\n' +
          '- Reference crew members BY NAME when their specialty is relevant\n' +
          '- The optimal choice requires applying scientific knowledge creatively\n' +
          '- Resource effects: costs -3 to -15, gains +5 to +20\n' +
          '- NEVER repeat a previous event topic\n' +
          '- Exactly 3 choices (optimal, adequate, poor)\n' +
          '- Audience: grades 4-12 (vivid, never graphic)\n\n' +
          'Return ONLY valid JSON:\n' +
          '{"emoji":"emoji","title":"title","category":"systems|science|crew|environment|navigation",' +
          '"description":"2-3 sentences","stemConcepts":["c1","c2"],' +
          '"choices":[{"label":"action","icon":"emoji","effects":{"o2":-5,"science":15},' +
          '"quality":"optimal|adequate|poor","outcome":"result","scienceReward":"science explanation"}]}';

        callGemini(prompt, true).then(function(result) {
          try {
            var cleaned = (typeof result === 'string' ? result : (result && result.text ? result.text : String(result || '{}')));
            cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
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
            console.warn('[SpaceExplorer] Event parse failed, retrying:', e);
            upd('isGenerating', false);
            if (addToast) addToast('Generating scenario... (retrying)', 'info');
            setTimeout(function() { generateEvent(); }, 1500);
          }
        }).catch(function(err) {
          console.error('[SpaceExplorer] Gemini error:', err);
          upd('isGenerating', false);
          if (addToast) addToast('AI connection issue. Please try again.', 'error');
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
            // Calculate optimal % for quest tracking
            var optC = newDecLog.filter(function(x) { return x.quality === 'optimal'; }).length;
            var optPct = newDecLog.length > 0 ? Math.round(optC / newDecLog.length * 100) : 0;
            updAll({
              missionPhase: 'debrief',
              missionResult: 'success',
              completedMissions: completedMissions + 1,
              totalScience: totalScience + (newRes.science || 0),
              highestDifficulty: Math.max(highestDifficulty, destination.difficulty),
              bestOptimalPct: Math.max(d.bestOptimalPct || 0, optPct)
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
                  var ctx2 = cvEl.getContext('2d');
                  var W = cvEl.offsetWidth || 400, H = cvEl.offsetHeight || 200;
                  cvEl.width = W * 2; cvEl.height = H * 2; ctx2.scale(2, 2);
                  var tick = 0;
                  function draw() {
                    cvEl._briefAnim = requestAnimationFrame(draw);
                    tick++;
                    ctx2.fillStyle = '#020010'; ctx2.fillRect(0, 0, W, H);
                    drawStarfield(ctx2, W, H, tick, 100);
                    drawPlanet(ctx2, W * 0.6, H * 0.5, Math.min(W, H) * 0.35, destination, tick);
                    // Ship approach dot
                    var shipX = W * 0.15 + Math.sin(tick * 0.008) * W * 0.05;
                    var shipY = H * 0.5 + Math.cos(tick * 0.006) * H * 0.08;
                    ctx2.fillStyle = '#fff'; ctx2.beginPath(); ctx2.arc(shipX, shipY, 2, 0, Math.PI * 2); ctx2.fill();
                    ctx2.strokeStyle = 'rgba(255,255,255,0.12)'; ctx2.lineWidth = 0.5;
                    ctx2.beginPath(); ctx2.moveTo(shipX, shipY);
                    ctx2.lineTo(W * 0.6 - Math.min(W, H) * 0.35, H * 0.5); ctx2.stroke();
                    // Vignette
                    var vg = ctx2.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
                    vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,0.4)');
                    ctx2.fillStyle = vg; ctx2.fillRect(0, 0, W, H);
                  }
                  draw();
                  // Cancel animation when canvas leaves DOM
                  var obs = new MutationObserver(function() {
                    if (!document.contains(cvEl)) { cancelAnimationFrame(cvEl._briefAnim); obs.disconnect(); }
                  });
                  obs.observe(document.body, { childList: true, subtree: true });
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
              // Crew roster
              crew.length > 0 && h('div', { className: 'bg-white/5 rounded-lg p-3 border border-white/10' },
                h('p', { className: 'text-[9px] text-slate-500 font-bold mb-2' }, '\uD83D\uDC68\u200D\uD83D\uDE80 YOUR CREW'),
                h('div', { className: 'grid grid-cols-2 gap-1.5' },
                  crew.map(function(c) {
                    return h('div', { key: c.name, className: 'flex items-center gap-2 bg-white/5 rounded-lg p-2' },
                      h('span', { className: 'text-lg' }, c.emoji),
                      h('div', null,
                        h('p', { className: 'text-[10px] font-bold text-white' }, c.name),
                        h('p', { className: 'text-[9px] text-slate-400' }, c.role),
                        h('p', { className: 'text-[8px] text-indigo-300 italic' }, '"' + c.quote + '"')
                      )
                    );
                  })
                )
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
          // STEM Concepts Learned (science rewards from all decisions)
          decisionLog.length > 0 && decisionLog.some(function(dec2) { return dec2.scienceReward; }) && h('div', { className: 'bg-cyan-500/5 rounded-xl p-3 border border-cyan-500/15' },
            h('p', { className: 'text-[10px] text-cyan-400 font-bold mb-2' }, '\uD83D\uDD2C SCIENCE CONCEPTS LEARNED'),
            h('div', { className: 'space-y-1.5' },
              decisionLog.filter(function(dec2) { return dec2.scienceReward; }).map(function(dec2, i) {
                return h('div', { key: i, className: 'bg-white/5 rounded-lg p-2 border-l-2 border-cyan-500/40' },
                  h('p', { className: 'text-[9px] font-bold text-cyan-300 mb-0.5' }, dec2.title),
                  h('p', { className: 'text-[9px] text-slate-400 leading-relaxed' }, dec2.scienceReward)
                );
              })
            )
          ),
          // Resource survival chart
          resources && h('div', { className: 'bg-white/5 rounded-xl p-3 border border-white/10' },
            h('p', { className: 'text-[10px] text-slate-500 font-bold mb-2' }, '\uD83D\uDCCA FINAL RESOURCES'),
            h('div', { className: 'grid grid-cols-3 gap-1.5' },
              Object.keys(RESOURCES).map(function(k) {
                var r = RESOURCES[k]; var val = resources[k] || 0;
                var pct2 = r.max === 999 ? 100 : Math.round(val / r.max * 100);
                var col = val <= r.max * 0.15 ? '#ef4444' : val <= r.max * 0.3 ? '#f59e0b' : r.color;
                return h('div', { key: k, className: 'text-center' },
                  h('div', { className: 'text-lg' }, r.emoji),
                  h('div', { className: 'text-[10px] font-bold', style: { color: col } }, r.max === 999 ? val : val + '%'),
                  h('div', { className: 'text-[8px] text-slate-500' }, r.label)
                );
              })
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
