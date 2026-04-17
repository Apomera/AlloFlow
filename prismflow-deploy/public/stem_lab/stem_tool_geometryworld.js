/**
 * stem_tool_geometryworld.js — Geometry World: 3D Block-Based Math Explorer
 *
 * AI-powered voxel geometry lessons. Students explore rectangular prisms,
 * measure volume, answer NPC questions, and build structures in a 3D world.
 * Supports WebXR VR. Worlds defined in JSON — Gemini can generate them.
 *
 * Inspired by Aaron Pomeranz's doctoral dissertation on block-based 3D environments
 * for teaching geometric measurement of volume (USM, 2024).
 *
 * Registered tool ID: "geometryWorld"
 * Registry: window.StemLab.registerTool()
 */
(function () {
  'use strict';
  (function() {
    if (document.getElementById('allo-live-geometryworld')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-geometryworld'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ── Sound Effects ──
  var _ac = null;
  function getAC() { if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } return _ac; }
  function tone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.1, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.15)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.15)); } catch(e) {} }
  // Noise burst helper — for footsteps, impacts
  function noiseBurst(duration, volume, filterFreq) {
    var ac = getAC(); if (!ac) return;
    try {
      var bufSize = Math.floor(ac.sampleRate * (duration || 0.04));
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      var src = ac.createBufferSource(); src.buffer = buf;
      var g = ac.createGain(); g.gain.setValueAtTime(volume || 0.03, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (duration || 0.04));
      var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = filterFreq || 800;
      src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start(); src.stop(ac.currentTime + (duration || 0.04));
    } catch(e) {}
  }
  // Block-type-aware place/break sounds
  var _sfxProfiles = {
    stone:   { placeF: 400, breakF: 220, placeW: 'square',   breakW: 'sawtooth', noiseHz: 500 },
    grass:   { placeF: 350, breakF: 180, placeW: 'sine',     breakW: 'sine',     noiseHz: 400 },
    wood:    { placeF: 480, breakF: 260, placeW: 'square',   breakW: 'sawtooth', noiseHz: 700 },
    diamond: { placeF: 800, breakF: 600, placeW: 'sine',     breakW: 'sine',     noiseHz: 900 },
    gold:    { placeF: 700, breakF: 500, placeW: 'sine',     breakW: 'sine',     noiseHz: 800 },
    sand:    { placeF: 300, breakF: 150, placeW: 'sine',     breakW: 'sine',     noiseHz: 300 },
    glass:   { placeF: 1200,breakF: 900, placeW: 'sine',     breakW: 'sine',     noiseHz: 1200 },
    water:   { placeF: 350, breakF: 200, placeW: 'sine',     breakW: 'sine',     noiseHz: 350 },
    brick:   { placeF: 380, breakF: 200, placeW: 'square',   breakW: 'sawtooth', noiseHz: 450 },
    ice:     { placeF: 1000,breakF: 800, placeW: 'sine',     breakW: 'sine',     noiseHz: 1000 },
    lava:    { placeF: 200, breakF: 120, placeW: 'sawtooth', breakW: 'sawtooth', noiseHz: 250 },
    torch:   { placeF: 600, breakF: 400, placeW: 'sine',     breakW: 'sine',     noiseHz: 600 },
  };
  function sfxPlace(blockType) {
    var p = _sfxProfiles[blockType] || _sfxProfiles.stone;
    var pitchVar = 0.95 + Math.random() * 0.1; // ±5% pitch variation per placement
    tone(p.placeF * pitchVar, 0.04, p.placeW, 0.05);
    tone(p.placeF * 1.26 * pitchVar, 0.04, p.placeW, 0.04);
    setTimeout(function() { tone(p.placeF * 1.5 * pitchVar, 0.06, 'sine', 0.06); }, 20 + Math.random() * 15);
  }
  function sfxBreak(blockType) {
    var p = _sfxProfiles[blockType] || _sfxProfiles.stone;
    var pitchVar = 0.92 + Math.random() * 0.16; // ±8% pitch variation
    noiseBurst(0.06, 0.05, p.noiseHz * pitchVar);
    tone(p.breakF * pitchVar, 0.06, p.breakW, 0.04);
    setTimeout(function() { noiseBurst(0.04, 0.03, p.noiseHz * 0.7 * pitchVar); tone(p.breakF * 0.72 * pitchVar, 0.08, p.breakW, 0.03); }, 30 + Math.random() * 20);
  }
  function sfxCorrect() { tone(523, 0.08, 'sine', 0.07); setTimeout(function() { tone(659, 0.08, 'sine', 0.07); }, 80); setTimeout(function() { tone(784, 0.12, 'sine', 0.08); }, 160); }
  function sfxWrong() { tone(300, 0.15, 'sawtooth', 0.06); setTimeout(function() { tone(250, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxComplete() { tone(523, 0.1, 'sine', 0.08); setTimeout(function() { tone(659, 0.1, 'sine', 0.08); }, 100); setTimeout(function() { tone(784, 0.1, 'sine', 0.08); }, 200); setTimeout(function() { tone(1047, 0.2, 'sine', 0.1); }, 300); }
  function sfxFootstep() { noiseBurst(0.035, 0.02, 500 + Math.random() * 300); }
  function sfxJump() { tone(280, 0.06, 'sine', 0.04); setTimeout(function() { tone(420, 0.04, 'sine', 0.03); }, 20); }
  function sfxLand() { noiseBurst(0.05, 0.04, 350); }
  function sfxNpcChime() { tone(880, 0.06, 'sine', 0.04); setTimeout(function() { tone(1100, 0.08, 'sine', 0.05); }, 60); }
  function sfxMeasure() { tone(660, 0.05, 'sine', 0.04); setTimeout(function() { tone(880, 0.07, 'sine', 0.05); }, 50); }

  // Ambient wind — continuous filtered noise, started once on first interaction
  var _ambientStarted = false;
  function startAmbientWind() {
    if (_ambientStarted) return;
    var ac = getAC(); if (!ac) return;
    _ambientStarted = true;
    try {
      // White noise buffer (2 seconds looped)
      var bufSize = ac.sampleRate * 2;
      var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      // Bandpass filter for wind character
      var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 250; bp.Q.value = 0.5;
      // Low-frequency modulation via another oscillator controlling gain
      var lfo = ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.15;
      var lfoGain = ac.createGain(); lfoGain.gain.value = 0.004;
      lfo.connect(lfoGain);
      // Master gain (very quiet)
      var master = ac.createGain(); master.gain.value = 0.008;
      lfoGain.connect(master.gain);
      src.connect(bp); bp.connect(master); master.connect(ac.destination);
      src.start(); lfo.start();
    } catch(e) {}
  }

  // ── Environment Presets ──
  var ENV_PRESETS = {
    day:     { sky: [0.53, 0.81, 0.92], fog: [0.53, 0.81, 0.92], sunIntensity: 1.0, ambientIntensity: 0.45, fogNear: 30, fogFar: 80, cloudOpacity: 0.5, label: '\u2600\uFE0F Day' },
    sunrise: { sky: [0.95, 0.6, 0.4],   fog: [0.9, 0.55, 0.4],  sunIntensity: 0.7, ambientIntensity: 0.3, fogNear: 20, fogFar: 60, cloudOpacity: 0.6, label: '\uD83C\uDF05 Sunrise' },
    sunset:  { sky: [0.85, 0.35, 0.2],  fog: [0.8, 0.3, 0.2],   sunIntensity: 0.6, ambientIntensity: 0.25, fogNear: 18, fogFar: 55, cloudOpacity: 0.55, label: '\uD83C\uDF07 Sunset' },
    night:   { sky: [0.06, 0.05, 0.15], fog: [0.06, 0.05, 0.15], sunIntensity: 0.1, ambientIntensity: 0.12, fogNear: 10, fogFar: 40, cloudOpacity: 0.15, label: '\uD83C\uDF19 Night' },
    golden:  { sky: [1.0, 0.85, 0.5],   fog: [0.95, 0.8, 0.45], sunIntensity: 0.85, ambientIntensity: 0.35, fogNear: 25, fogFar: 70, cloudOpacity: 0.45, label: '\uD83C\uDF1F Golden' },
  };

  function applyEnvPreset(engine, presetKey) {
    var p = ENV_PRESETS[presetKey];
    if (!p || !engine) return;
    // Store target values for smooth transition
    engine._envTarget = {
      sky: p.sky.slice(), fog: p.fog.slice(),
      fogNear: p.fogNear, fogFar: p.fogFar,
      sunIntensity: p.sunIntensity, ambientIntensity: p.ambientIntensity,
      cloudOpacity: p.cloudOpacity
    };
    engine._envTransition = 0; // 0 to 1 over ~1.5 seconds
    engine._currentEnv = presetKey;
    // Stars: create on night/sunset, remove on day/sunrise
    var isNightime = presetKey === 'night' || presetKey === 'sunset';
    if (isNightime && !engine._manualStars && window.THREE) {
      var THREE = window.THREE;
      var sg = new THREE.BufferGeometry();
      var sv = [];
      for (var si = 0; si < 400; si++) sv.push((Math.random() - 0.5) * 200, 25 + Math.random() * 55, (Math.random() - 0.5) * 200);
      sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
      engine._manualStars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0 }));
      engine.scene.add(engine._manualStars);
      engine._manualStarsTarget = 0.8;
    } else if (!isNightime && engine._manualStars) {
      engine._manualStarsTarget = 0; // fade out
    }
  }
  // Called in animate() to smoothly interpolate environment
  function updateEnvTransition(engine, dt) {
    if (!engine._envTarget || engine._envTransition >= 1) return;
    engine._envTransition = Math.min(1, engine._envTransition + dt * 0.7); // ~1.4 seconds
    var t = engine._envTransition;
    var ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out
    var tgt = engine._envTarget;
    var bg = engine.scene.background;
    bg.r += (tgt.sky[0] - bg.r) * ease * 0.1;
    bg.g += (tgt.sky[1] - bg.g) * ease * 0.1;
    bg.b += (tgt.sky[2] - bg.b) * ease * 0.1;
    var fc = engine.scene.fog.color;
    fc.r += (tgt.fog[0] - fc.r) * ease * 0.1;
    fc.g += (tgt.fog[1] - fc.g) * ease * 0.1;
    fc.b += (tgt.fog[2] - fc.b) * ease * 0.1;
    engine.scene.fog.near += (tgt.fogNear - engine.scene.fog.near) * ease * 0.1;
    engine.scene.fog.far += (tgt.fogFar - engine.scene.fog.far) * ease * 0.1;
    if (engine.sun) engine.sun.intensity += (tgt.sunIntensity - engine.sun.intensity) * ease * 0.1;
    engine.scene.children.forEach(function(c) {
      if (c.isAmbientLight) c.intensity += (tgt.ambientIntensity - c.intensity) * ease * 0.1;
    });
    if (engine._cloudPlane) engine._cloudPlane.material.opacity += (tgt.cloudOpacity - engine._cloudPlane.material.opacity) * ease * 0.1;
    // Manual stars fade + rotate
    if (engine._manualStars) {
      var stTarget = engine._manualStarsTarget || 0;
      engine._manualStars.material.opacity += (stTarget - engine._manualStars.material.opacity) * 0.03;
      engine._manualStars.rotation.y += dt * 0.015;
      // Remove when fully faded
      if (stTarget === 0 && engine._manualStars.material.opacity < 0.01) {
        engine.scene.remove(engine._manualStars);
        engine._manualStars.geometry.dispose(); engine._manualStars.material.dispose();
        engine._manualStars = null;
      }
    }
  }

  // ── Block Types ──
  var BLOCK_TYPES = [
    { id: 'stone', name: 'Stone', color: 0x808080, emoji: '\uD83E\uDEA8' },
    { id: 'grass', name: 'Grass', color: 0x4CAF50, emoji: '\uD83C\uDF3F' },
    { id: 'wood', name: 'Wood', color: 0x8D6E63, emoji: '\uD83E\uDEB5' },
    { id: 'diamond', name: 'Diamond', color: 0x00BCD4, emoji: '\uD83D\uDC8E' },
    { id: 'gold', name: 'Gold', color: 0xFFD700, emoji: '\uD83E\uDD47' },
    { id: 'sand', name: 'Sand', color: 0xF5DEB3, emoji: '\uD83C\uDFD6\uFE0F' },
    { id: 'glass', name: 'Glass', color: 0xE3F2FD, emoji: '\uD83D\uDD32' },
    { id: 'water', name: 'Water', color: 0x2196F3, emoji: '\uD83D\uDCA7' },
    { id: 'brick', name: 'Brick', color: 0xB71C1C, emoji: '\uD83E\uDDF1' },
    { id: 'ice', name: 'Ice', color: 0xB3E5FC, emoji: '\u2744\uFE0F' },
    { id: 'lava', name: 'Lava', color: 0xFF5722, emoji: '\uD83C\uDF0B' },
    { id: 'torch', name: 'Torch', color: 0xFFA726, emoji: '\uD83D\uDD25' },
  ];

  function getBlockColor(type) {
    var bt = BLOCK_TYPES.find(function(b) { return b.id === type; });
    return bt ? bt.color : 0x808080;
  }

  // ── Block Shapes (fractional geometry) ──
  // Each shape has an exact fractional relationship to the unit cube
  var BLOCK_SHAPES = [
    { id: 'cube', name: 'Cube', volume: 1, emoji: '\u2B1C', fraction: '1', desc: '1 cubic unit' },
    { id: 'halfA', name: 'Half (diagonal)', volume: 0.5, emoji: '\u25E2', fraction: '\u00BD', desc: 'Cut diagonally = \u00BD cubic unit' },
    { id: 'halfB', name: 'Half (horizontal)', volume: 0.5, emoji: '\u25AD', fraction: '\u00BD', desc: 'Cut horizontally = \u00BD cubic unit' },
    { id: 'quarter', name: 'Quarter wedge', volume: 0.25, emoji: '\u25E3', fraction: '\u00BC', desc: 'Cut into quarters = \u00BC cubic unit' },
  ];

  // Create Three.js geometry for each shape
  function createShapeGeometry(shapeId) {
    var THREE = window.THREE;
    if (!THREE) return null;
    switch (shapeId) {
      case 'halfA': {
        // Triangular prism: diagonal cut of unit cube (right triangle cross-section)
        // Vertices: bottom-left-front, bottom-right-front, top-right-front (triangle)
        // extruded 1 unit in Z
        var geo = new THREE.BufferGeometry();
        var verts = new Float32Array([
          // Front triangle
          0,0,0,  1,0,0,  1,1,0,
          // Back triangle
          0,0,1,  1,1,1,  1,0,1,
          // Bottom face
          0,0,0,  1,0,1,  1,0,0,
          0,0,0,  0,0,1,  1,0,1,
          // Diagonal face (hypotenuse)
          0,0,0,  1,1,0,  1,1,1,
          0,0,0,  1,1,1,  0,0,1,
          // Right face
          1,0,0,  1,0,1,  1,1,1,
          1,0,0,  1,1,1,  1,1,0
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        return geo;
      }
      case 'halfB': {
        // Half-slab: bottom half of cube (half height)
        return new THREE.BoxGeometry(1, 0.5, 1);
      }
      case 'quarter': {
        // Quarter wedge: cut the halfA in half again along the other diagonal
        var geo = new THREE.BufferGeometry();
        var verts = new Float32Array([
          // Front triangle (right triangle, half the halfA)
          0,0,0,  1,0,0,  0.5,0.5,0,
          // Back triangle
          0,0,1,  0.5,0.5,1,  1,0,1,
          // Bottom
          0,0,0,  1,0,1,  1,0,0,
          0,0,0,  0,0,1,  1,0,1,
          // Left slope
          0,0,0,  0.5,0.5,0,  0.5,0.5,1,
          0,0,0,  0.5,0.5,1,  0,0,1,
          // Right slope
          1,0,0,  0.5,0.5,1,  0.5,0.5,0,
          1,0,0,  1,0,1,  0.5,0.5,1
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        return geo;
      }
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  // Format fractional volume for display
  function formatVolume(vol) {
    if (vol === Math.floor(vol)) return vol.toString();
    // Try common fractions
    var frac = vol * 4;
    if (frac === Math.floor(frac)) {
      var num = Math.round(frac);
      var den = 4;
      // Simplify
      if (num % 2 === 0) { num /= 2; den /= 2; }
      if (num % 2 === 0) { num /= 2; den /= 2; }
      var whole = Math.floor(num / den);
      var rem = num % den;
      if (rem === 0) return whole.toString();
      return (whole > 0 ? whole + ' ' : '') + rem + '/' + den;
    }
    return vol.toFixed(2);
  }

  // ── Achievement Badges ──
  var ACHIEVEMENTS = [
    { id: 'first_measure', name: 'First Measurement', icon: '\uD83D\uDCCF', desc: 'Measured your first structure', check: function(log) { return log.some(function(e) { return e.type === 'measurement'; }); } },
    { id: 'first_correct', name: 'Right Answer!', icon: '\u2705', desc: 'Answered your first NPC question correctly', check: function(log) { return log.some(function(e) { return e.type === 'answer_correct'; }); } },
    { id: 'lesson_complete', name: 'Lesson Master', icon: '\uD83C\uDFC6', desc: 'Completed an entire lesson', check: function(log) { return log.some(function(e) { return e.type === 'lesson_complete'; }); } },
    { id: 'builder_10', name: 'Builder', icon: '\uD83E\uDDF1', desc: 'Placed 10 blocks', check: function(log) { return log.filter(function(e) { return e.type === 'block_place'; }).length >= 10; } },
    { id: 'builder_100', name: 'Master Builder', icon: '\uD83C\uDFD7\uFE0F', desc: 'Placed 100 blocks', check: function(log) { return log.filter(function(e) { return e.type === 'block_place'; }).length >= 100; } },
    { id: 'perfect_lesson', name: 'Perfect Score', icon: '\uD83C\uDF1F', desc: 'Answered every question correctly with no mistakes', check: function(log) { var correct = log.filter(function(e) { return e.type === 'answer_correct'; }).length; var wrong = log.filter(function(e) { return e.type === 'answer_wrong'; }).length; return correct >= 3 && wrong === 0; } },
    { id: 'npc_chatter', name: 'Curious Mind', icon: '\uD83D\uDCAC', desc: 'Had a conversation with an NPC', check: function(log) { return log.some(function(e) { return e.type === 'npc_chat'; }); } },
    { id: 'world_creator', name: 'World Creator', icon: '\uD83C\uDFA8', desc: 'Created an NPC in Creator Mode', check: function(log) { return log.some(function(e) { return e.type === 'npc_created'; }); } },
    { id: 'printer_3d', name: '3D Printer', icon: '\uD83E\uDE78', desc: 'Exported a structure for 3D printing', check: function(log) { return log.some(function(e) { return e.type === 'stl_export'; }); } },
    { id: 'world_sharer', name: 'Teacher at Heart', icon: '\uD83C\uDF0D', desc: 'Shared a world with classmates', check: function(log) { return log.some(function(e) { return e.type === 'world_shared'; }); } },
    { id: 'peer_learner', name: 'Peer Learner', icon: '\uD83D\uDCDA', desc: 'Loaded a classmate\'s world', check: function(log) { return log.some(function(e) { return e.type === 'peer_world_loaded'; }); } },
    { id: 'persistence', name: 'Growth Mindset', icon: '\uD83E\uDDE0', desc: 'Got an answer wrong 3+ times and kept trying', check: function(log) { var streak = 0, maxStreak = 0; log.forEach(function(e) { if (e.type === 'answer_wrong') { streak++; maxStreak = Math.max(maxStreak, streak); } else if (e.type === 'answer_correct') { streak = 0; } }); return maxStreak >= 3 && log.some(function(e) { return e.type === 'answer_correct'; }); } },
    { id: 'five_lessons', name: 'Explorer', icon: '\uD83E\uDDED', desc: 'Tried 5 different lessons', check: function(log) { var lessons = {}; log.forEach(function(e) { if (e.type === 'lesson_load') lessons[e.data.title || 'unknown'] = true; }); return Object.keys(lessons).length >= 5; } },
  ];

  function checkAchievements(sessionLog, previousBadges) {
    var prev = previousBadges || {};
    var newBadges = [];
    ACHIEVEMENTS.forEach(function(a) {
      if (!prev[a.id] && a.check(sessionLog)) {
        prev[a.id] = { earned: new Date().toISOString() };
        newBadges.push(a);
      }
    });
    return { badges: prev, newBadges: newBadges };
  }

  // ── Sample Volume Lesson ──
  var SAMPLE_LESSONS = {
    volumeExplorer: {
      title: 'Volume Explorer \u2014 Rectangular Prisms',
      description: 'Measure and calculate the volume of 3D shapes by exploring, building, and counting blocks.',
      spawnPoint: [2, 3, 2],
      objectives: [
        'Find the volume of the blue rectangular prism (5\u00d73\u00d74)',
        'Fill the empty pool with blocks and count them',
        'Calculate the volume of the L-block'
      ],
      ground: { xMin: -4, xMax: 24, zMin: -4, zMax: 24, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 8, y2: 0, z2: 8, block: 'stone' },
        { type: 'fill', x1: 10, y1: 1, z1: 2, x2: 14, y2: 4, z2: 4, block: 'diamond' },
        { type: 'fill', x1: 2, y1: 1, z1: 12, x2: 6, y2: 1, z2: 15, block: 'stone' },
        { type: 'fill', x1: 2, y1: 2, z1: 12, x2: 2, y2: 3, z2: 15, block: 'stone' },
        { type: 'fill', x1: 6, y1: 2, z1: 12, x2: 6, y2: 3, z2: 15, block: 'stone' },
        { type: 'fill', x1: 2, y1: 2, z1: 12, x2: 6, y2: 3, z2: 12, block: 'stone' },
        { type: 'fill', x1: 2, y1: 2, z1: 15, x2: 6, y2: 3, z2: 15, block: 'stone' },
        { type: 'fill', x1: 16, y1: 1, z1: 10, x2: 20, y2: 3, z2: 12, block: 'gold' },
        { type: 'fill', x1: 16, y1: 1, z1: 13, x2: 18, y2: 3, z2: 15, block: 'gold' },
      ],
      npcs: [
        { position: [4, 1, 4], name: 'Professor Block', color: 0x7c3aed,
          dialogue: 'Welcome! Volume = Length \u00d7 Width \u00d7 Height. Explore the structures and solve problems!', question: null },
        { position: [12, 5, 3], name: 'Quiz Master', color: 0x2563eb,
          dialogue: 'The blue prism is 5 long, 3 wide, 4 tall. Let\u2019s measure step by step!',
          question: { text: 'How many blocks LONG is this prism?', choices: ['5 blocks', '3 blocks', '4 blocks'], correct: 0,
            followUp: [
              { text: 'Good! How many blocks WIDE?', choices: ['3 blocks', '5 blocks', '2 blocks'], correct: 0 },
              { text: 'And how many blocks TALL?', choices: ['4 blocks', '3 blocks', '5 blocks'], correct: 0 },
              { text: 'Now multiply: 5 \u00d7 3 \u00d7 4 = ?', choices: ['60 cubic units', '12 cubic units', '35 cubic units'], correct: 0 }
            ] } },
        { position: [4, 1, 11], name: 'Builder Bot', color: 0x16a34a,
          dialogue: 'Fill the pool! The inside measures 3 long, 3 wide, 2 tall.',
          question: { text: 'What is the area of the pool floor? (3\u00d73)', choices: ['9 square units', '6 square units', '12 square units'], correct: 0,
            followUp: [
              { text: 'Now stack 2 layers of 9. How many total blocks?', choices: ['18 blocks', '11 blocks', '27 blocks'], correct: 0 }
            ] } },
        { position: [18, 4, 12], name: 'L-Block Sage', color: 0xf59e0b,
          dialogue: 'This L-block has two rectangular parts. Measure each, then add!',
          question: { text: 'Part A is 5\u00d73\u00d73. What is its volume?', choices: ['45 cubic units', '15 cubic units', '30 cubic units'], correct: 0,
            followUp: [
              { text: 'Part B is 3\u00d73\u00d73. What is its volume?', choices: ['27 cubic units', '18 cubic units', '9 cubic units'], correct: 0 },
              { text: 'Total volume = 45 + 27 = ?', choices: ['72 cubic units', '45 cubic units', '54 cubic units'], correct: 0 }
            ] } }
      ]
    },
    areaSurface: {
      title: 'Area & Surface Area',
      description: 'Explore how area relates to volume by examining layers of rectangular prisms.',
      spawnPoint: [2, 3, 2],
      objectives: [
        'Find the area of the base layer (blue prism)',
        'Count the layers to find the height',
        'Calculate the volume using Area \u00d7 Height',
        'Compare two prisms with the same volume but different shapes'
      ],
      ground: { xMin: -4, xMax: 20, zMin: -4, zMax: 20, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 8, y2: 0, z2: 8, block: 'stone' },
        // Prism A: 6x4x3 = 72 (flat and wide)
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 7, y2: 3, z2: 5, block: 'diamond' },
        // Prism B: 3x3x8 = 72 (tall and narrow) — same volume!
        { type: 'fill', x1: 12, y1: 1, z1: 2, x2: 14, y2: 8, z2: 4, block: 'gold' },
        // Layered prism with visible layers (alternating colors)
        { type: 'fill', x1: 2, y1: 1, z1: 10, x2: 6, y2: 1, z2: 14, block: 'sand' },
        { type: 'fill', x1: 2, y1: 2, z1: 10, x2: 6, y2: 2, z2: 14, block: 'wood' },
        { type: 'fill', x1: 2, y1: 3, z1: 10, x2: 6, y2: 3, z2: 14, block: 'sand' },
        { type: 'fill', x1: 2, y1: 4, z1: 10, x2: 6, y2: 4, z2: 14, block: 'wood' },
      ],
      npcs: [
        { position: [4, 1, 0], name: 'Area Guide', color: 0x7c3aed,
          dialogue: 'Area = Length \u00d7 Width. It tells you how many blocks make ONE layer. Volume = Area \u00d7 Height (number of layers)!', question: null },
        { position: [5, 4, 3], name: 'Flat Prism Quiz', color: 0x2563eb,
          dialogue: 'This blue prism is 6 long, 4 wide, 3 tall. Let\u2019s find its volume step by step!',
          question: { text: 'What is the base area? (6 \u00d7 4)', choices: ['24 square units', '10 square units', '18 square units'], correct: 0,
            followUp: [
              { text: 'Base area = 24. How many layers tall?', choices: ['3 layers', '4 layers', '6 layers'], correct: 0 },
              { text: '24 \u00d7 3 = ?', choices: ['72 cubic units', '48 cubic units', '27 cubic units'], correct: 0 }
            ] } },
        { position: [13, 9, 3], name: 'Tall Prism Quiz', color: 0xf59e0b,
          dialogue: 'This gold prism is 3\u00d73\u00d78. Different shape from the blue one!',
          question: { text: 'What is 3 \u00d7 3 \u00d7 8?', choices: ['72 cubic units', '64 cubic units', '48 cubic units'], correct: 0,
            followUp: [
              { text: 'Blue = 72, Gold = 72. Same or different volume?', choices: ['Same volume! Different shape.', 'Gold is bigger', 'Blue is bigger'], correct: 0 }
            ] } },
        { position: [4, 5, 12], name: 'Layer Counter', color: 0x16a34a,
          dialogue: 'Count the alternating layers! Each layer is 5\u00d75 blocks.',
          question: { text: 'Area of one layer? (5 \u00d7 5)', choices: ['25 square units', '10 square units', '20 square units'], correct: 0,
            followUp: [
              { text: 'How many layers are stacked?', choices: ['4 layers', '5 layers', '3 layers'], correct: 0 },
              { text: '25 \u00d7 4 = ?', choices: ['100 cubic units', '125 cubic units', '80 cubic units'], correct: 0 }
            ] } }
      ]
    },
    buildChallenge: {
      title: 'Build Challenge \u2014 Design Your Dream Room',
      description: 'Use your geometry knowledge to design and measure rooms. Apply volume to real-world architecture!',
      spawnPoint: [5, 2, 5],
      objectives: [
        'Build a room with walls 4 blocks high',
        'Calculate the interior volume of your room',
        'Add a second room connected to the first',
        'Find the total volume of both rooms combined'
      ],
      ground: { xMin: -2, xMax: 22, zMin: -2, zMax: 22, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 20, y2: 0, z2: 20, block: 'stone' },
        // Example room for reference
        { type: 'fill', x1: 14, y1: 1, z1: 14, x2: 19, y2: 4, z2: 14, block: 'wood' },
        { type: 'fill', x1: 14, y1: 1, z1: 19, x2: 19, y2: 4, z2: 19, block: 'wood' },
        { type: 'fill', x1: 14, y1: 1, z1: 14, x2: 14, y2: 4, z2: 19, block: 'wood' },
        { type: 'fill', x1: 19, y1: 1, z1: 14, x2: 19, y2: 4, z2: 19, block: 'wood' },
        { type: 'fill', x1: 14, y1: 5, z1: 14, x2: 19, y2: 5, z2: 19, block: 'wood' },
      ],
      npcs: [
        { position: [5, 1, 1], name: 'Architect', color: 0x7c3aed,
          dialogue: 'Welcome to Build Challenge! Use blocks to build rooms, then measure their volume. The example room in the corner shows a 6\u00d76\u00d74 structure. Start building!', question: null },
        { position: [16, 1, 13], name: 'Room Inspector', color: 0x2563eb,
          dialogue: 'This example room has walls 1 block thick. The outside is 6\u00d76\u00d75. Let\u2019s find the INSIDE.',
          question: { text: 'Walls are 1 block thick. Outside L = 6. What is inside L?', choices: ['4 blocks (6 - 1 - 1)', '5 blocks', '6 blocks'], correct: 0,
            followUp: [
              { text: 'Inside is 4\u00d74\u00d74. Volume?', choices: ['64 cubic units', '48 cubic units', '32 cubic units'], correct: 0 }
            ] } },
        { position: [10, 1, 10], name: 'Volume Coach', color: 0x16a34a,
          dialogue: 'Interior volume is always LESS than exterior because walls take up space!',
          question: { text: 'Room is 8\u00d76\u00d74 outside, 1-block walls. Interior length?', choices: ['6 blocks', '8 blocks', '7 blocks'], correct: 0,
            followUp: [
              { text: 'Interior width? (6 outside - 2 for walls)', choices: ['4 blocks', '5 blocks', '6 blocks'], correct: 0 },
              { text: 'Interior is 6\u00d74\u00d74. Volume?', choices: ['96 cubic units', '64 cubic units', '72 cubic units'], correct: 0 }
            ] } }
      ]
    },
    realWorld: {
      title: 'Real-World Volume \u2014 Packing & Shipping',
      description: 'Apply volume skills to real-world problems: packing boxes, filling containers, and calculating shipping costs!',
      spawnPoint: [4, 2, 4],
      objectives: [
        'Find how many small boxes fit in the shipping container',
        'Calculate the wasted space in a partially filled crate',
        'Design a package that holds exactly 36 cubic units'
      ],
      ground: { xMin: -2, xMax: 22, zMin: -2, zMax: 22, y: 0, type: 'stone' },
      structures: [
        // Warehouse floor
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 20, y2: 0, z2: 20, block: 'stone' },
        // Large shipping container (outer: 8x4x4)
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 9, y2: 1, z2: 5, block: 'wood' },
        { type: 'fill', x1: 2, y1: 4, z1: 2, x2: 9, y2: 4, z2: 5, block: 'wood' },
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 2, y2: 4, z2: 5, block: 'wood' },
        { type: 'fill', x1: 9, y1: 1, z1: 2, x2: 9, y2: 4, z2: 5, block: 'wood' },
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 9, y2: 4, z2: 2, block: 'wood' },
        // Small boxes inside (2x2x2 each, placed in a row)
        { type: 'fill', x1: 3, y1: 2, z1: 3, x2: 4, y2: 3, z2: 4, block: 'gold' },
        { type: 'fill', x1: 5, y1: 2, z1: 3, x2: 6, y2: 3, z2: 4, block: 'diamond' },
        { type: 'fill', x1: 7, y1: 2, z1: 3, x2: 8, y2: 3, z2: 4, block: 'gold' },
        // Partially filled crate (6x6x3 outer, some blocks inside)
        { type: 'fill', x1: 12, y1: 1, z1: 2, x2: 17, y2: 1, z2: 7, block: 'wood' },
        { type: 'fill', x1: 12, y1: 2, z1: 2, x2: 12, y2: 3, z2: 7, block: 'wood' },
        { type: 'fill', x1: 17, y1: 2, z1: 2, x2: 17, y2: 3, z2: 7, block: 'wood' },
        { type: 'fill', x1: 12, y1: 2, z1: 2, x2: 17, y2: 3, z2: 2, block: 'wood' },
        { type: 'fill', x1: 12, y1: 2, z1: 7, x2: 17, y2: 3, z2: 7, block: 'wood' },
        // Partial fill inside
        { type: 'fill', x1: 13, y1: 2, z1: 3, x2: 16, y2: 2, z2: 6, block: 'sand' },
        // Open building area with sign
        { type: 'fill', x1: 2, y1: 1, z1: 14, x2: 7, y2: 1, z2: 19, block: 'glass' },
      ],
      npcs: [
        { position: [5, 1, 1], name: 'Warehouse Manager', color: 0x7c3aed,
          dialogue: 'Welcome to the warehouse! We need to figure out how many boxes fit in our containers. The shipping container is open on one side \u2014 look inside!', question: null },
        { position: [5, 5, 3], name: 'Packing Expert', color: 0x2563eb,
          dialogue: 'The container interior is 6\u00d72\u00d73. Each small box is 2\u00d72\u00d72. Let\u2019s figure out how many fit!',
          question: { text: 'Container interior volume? (6\u00d72\u00d73)', choices: ['36 cubic units', '24 cubic units', '48 cubic units'], correct: 0,
            followUp: [
              { text: 'Each box = 2\u00d72\u00d72 = 8 cubic units. 36 \u00f7 8 = ?', choices: ['4 boxes with 4 units wasted', '3 boxes exactly', '6 boxes'], correct: 0 }
            ] } },
        { position: [14, 1, 1], name: 'Inventory Checker', color: 0xf59e0b,
          dialogue: 'The crate interior is 4\u00d74\u00d72. The bottom layer has sand.',
          question: { text: 'Crate total capacity? (4\u00d74\u00d72)', choices: ['32 cubic units', '16 cubic units', '24 cubic units'], correct: 0,
            followUp: [
              { text: '16 blocks of sand inside. Empty space = 32 - 16 = ?', choices: ['16 cubic units', '8 cubic units', '32 cubic units'], correct: 0 }
            ] } },
        { position: [4, 2, 16], name: 'Design Challenge', color: 0x16a34a,
          dialogue: 'Build a box on the glass platform that holds EXACTLY 36 cubic units!',
          question: { text: 'Which equals 36? (check each)', choices: ['6\u00d73\u00d72 = 36 \u2713', '5\u00d74\u00d72 = 40', '3\u00d73\u00d73 = 27'], correct: 0,
            followUp: [
              { text: 'Which is another way to make 36?', choices: ['4\u00d73\u00d73 = 36', '6\u00d76\u00d71 = 36', 'Both!'], correct: 2 }
            ] } }
      ]
    },
    geometryGarden: {
      title: 'The Geometry Garden \u2014 A Place to Discover',
      description: 'No questions. No score. Just beautiful structures to explore and measure. Walk the path. Notice things. The world is the lesson.',
      spawnPoint: [0, 2, 0],
      objectives: [
        'Walk the path through the garden',
        'Use M to measure anything that interests you',
        'Notice: which structures have the same volume but different shapes?',
        'Find the hidden structure at the end of the path'
      ],
      ground: { xMin: -6, xMax: 50, zMin: -10, zMax: 20, y: 0, type: 'grass' },
      structures: [
        // ── The Path (stone walkway winding through the garden) ──
        { type: 'fill', x1: -2, y1: 0, z1: 4, x2: 48, y2: 0, z2: 6, block: 'stone' },

        // ── Station 1: The Unit Cube (simplest form) ──
        { type: 'fill', x1: 3, y1: 1, z1: 2, x2: 3, y2: 1, z2: 2, block: 'diamond' },
        // Sign post
        { type: 'fill', x1: 3, y1: 1, z1: 0, x2: 3, y2: 2, z2: 0, block: 'wood' },

        // ── Station 2: A Row (1D — length) ──
        { type: 'fill', x1: 8, y1: 1, z1: 2, x2: 12, y2: 1, z2: 2, block: 'diamond' },

        // ── Station 3: A Flat Rectangle (2D — area emerges) ──
        { type: 'fill', x1: 16, y1: 1, z1: 1, x2: 20, y2: 1, z2: 3, block: 'gold' },

        // ── Station 4: A Rectangular Prism (3D — volume!) ──
        { type: 'fill', x1: 24, y1: 1, z1: 1, x2: 28, y2: 3, z2: 3, block: 'diamond' },

        // ── Station 5: Three shapes, one volume — CONVERGENCE ──
        // All three = 24 cubic units. Different paths to the same truth.
        // Prism A: 12x1x2 = 24 (flat slab)
        { type: 'fill', x1: 32, y1: 1, z1: 0, x2: 43, y2: 2, z2: 0, block: 'gold' },
        // Prism B: 4x3x2 = 24 (compact block)
        { type: 'fill', x1: 32, y1: 1, z1: 8, x2: 35, y2: 2, z2: 10, block: 'gold' },
        // Prism C: 2x2x6 = 24 (tall tower)
        { type: 'fill', x1: 38, y1: 1, z1: 8, x2: 39, y2: 6, z2: 9, block: 'gold' },
        // Glass convergence paths connecting all three (the student walks the convergence)
        { type: 'fill', x1: 33, y1: 0, z1: 1, x2: 33, y2: 0, z2: 7, block: 'glass' },
        { type: 'fill', x1: 34, y1: 0, z1: 7, x2: 38, y2: 0, z2: 7, block: 'glass' },
        // Center marker where paths meet — one diamond block at the crossing point
        { type: 'fill', x1: 35, y1: 1, z1: 4, x2: 35, y2: 1, z2: 4, block: 'diamond' },

        // ── Station 6: The L-Block (composition) ──
        { type: 'fill', x1: 32, y1: 1, z1: -6, x2: 36, y2: 3, z2: -4, block: 'diamond' },
        { type: 'fill', x1: 32, y1: 1, z1: -3, x2: 34, y2: 3, z2: -1, block: 'diamond' },

        // ── Station 7: Nested cubes (volume displacement) ──
        // Outer shell: 5x5x5 hollow
        { type: 'fill', x1: 42, y1: 1, z1: -8, x2: 46, y2: 5, z2: -4, block: 'glass' },
        // Inner cube: 3x3x3 solid
        { type: 'fill', x1: 43, y1: 2, z1: -7, x2: 45, y2: 4, z2: -5, block: 'gold' },

        // ── The Hidden Garden (behind a wall, accessed by going around) ──
        { type: 'fill', x1: 46, y1: 1, z1: 2, x2: 46, y2: 4, z2: 8, block: 'wood' },
        // Secret structure behind the wall: a pyramid approximation
        { type: 'fill', x1: 48, y1: 1, z1: 1, x2: 52, y2: 1, z2: 9, block: 'sand' },
        { type: 'fill', x1: 49, y1: 2, z1: 2, x2: 51, y2: 2, z2: 8, block: 'sand' },
        { type: 'fill', x1: 49, y1: 3, z1: 3, x2: 51, y2: 3, z2: 7, block: 'gold' },
        { type: 'fill', x1: 50, y1: 4, z1: 4, x2: 50, y2: 4, z2: 6, block: 'gold' },
        { type: 'fill', x1: 50, y1: 5, z1: 5, x2: 50, y2: 5, z2: 5, block: 'diamond' },

        // ── Decorative garden elements ──
        // Flower beds (colored blocks along the path)
        { type: 'fill', x1: 5, y1: 1, z1: 7, x2: 7, y2: 1, z2: 7, block: 'sand' },
        { type: 'fill', x1: 14, y1: 1, z1: 7, x2: 15, y2: 1, z2: 8, block: 'sand' },
        { type: 'fill', x1: 22, y1: 1, z1: 7, x2: 23, y2: 1, z2: 7, block: 'sand' },
        { type: 'fill', x1: 30, y1: 1, z1: 7, x2: 31, y2: 1, z2: 8, block: 'sand' },
        // Benches (places to pause)
        { type: 'fill', x1: 10, y1: 1, z1: 7, x2: 12, y2: 1, z2: 7, block: 'wood' },
        { type: 'fill', x1: 28, y1: 1, z1: 7, x2: 30, y2: 1, z2: 7, block: 'wood' },
      ],
      npcs: [
        { position: [0, 1, 3], name: 'Garden Keeper', color: 0x16a34a,
          dialogue: 'Welcome to the Geometry Garden. No tests. No score. Walk the path. Measure anything. Notice patterns. Take your time.', question: null },
        { position: [3, 2, 0], name: 'Station 1 Guide', color: 0x2563eb,
          dialogue: 'This is a single unit cube \u2014 the building block of everything. Volume = 1 cubic unit. Press M to measure it!', question: null },
        { position: [10, 2, 0], name: 'Station 2 Guide', color: 0x2563eb,
          dialogue: 'A row of 5 blocks. This is 1-dimensional \u2014 just LENGTH. Press M: you\'ll see L=5, W=1, H=1. Volume = 5.', question: null },
        { position: [18, 2, 0], name: 'Station 3 Guide', color: 0xf59e0b,
          dialogue: 'Now a flat rectangle: 5\u00d73. This is 2-dimensional \u2014 LENGTH and WIDTH. Area = 15 square units. But volume? Measure it!', question: null },
        { position: [26, 4, 0], name: 'Station 4 Guide', color: 0xf59e0b,
          dialogue: 'A full 3D rectangular prism: 5\u00d73\u00d73. Three dimensions! Volume = L\u00d7W\u00d7H = 45. The jump from flat to solid is where volume lives.', question: null },
        { position: [35, 1, 4], name: 'Convergence Guide', color: 0x7c3aed,
          dialogue: 'Three shapes. All have volume = 24. A flat slab (12\u00d71\u00d72), a compact block (4\u00d73\u00d72), and a tall tower (2\u00d72\u00d76). Same volume \u2014 completely different shapes. Measure each one!', question: null },
        { position: [48, 6, 5], name: 'Hidden Garden Sage', color: 0xdc2626,
          dialogue: 'You found the hidden garden! This pyramid approximation uses layers of decreasing size. Each layer is a rectangular prism. The total volume is the sum of all layers. Real pyramids use calculus \u2014 but this is a start!', question: null }
      ]
    },
    compositeVolume: {
      title: 'Composite Volume \u2014 Breaking Apart & Combining',
      description: 'Real objects aren\u2019t simple rectangles. Learn to decompose complex shapes into rectangular parts and add their volumes.',
      spawnPoint: [3, 2, 3],
      objectives: [
        'Decompose the T-shape into 2 rectangular prisms',
        'Calculate each part\u2019s volume and find the total',
        'Solve the step pyramid by counting layer volumes',
        'Design your own composite shape with exactly 50 cubic units'
      ],
      ground: { xMin: -2, xMax: 28, zMin: -2, zMax: 22, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 26, y2: 0, z2: 20, block: 'stone' },
        // T-shape: horizontal bar (8x2x3) + vertical stem (2x2x5)
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 9, y2: 3, z2: 3, block: 'diamond' },
        { type: 'fill', x1: 5, y1: 1, z1: 4, x2: 6, y2: 3, z2: 8, block: 'diamond' },
        // Step pyramid: layer 1 (6x6x1=36), layer 2 (4x4x1=16), layer 3 (2x2x1=4)
        { type: 'fill', x1: 14, y1: 1, z1: 2, x2: 19, y2: 1, z2: 7, block: 'gold' },
        { type: 'fill', x1: 15, y1: 2, z1: 3, x2: 18, y2: 2, z2: 6, block: 'gold' },
        { type: 'fill', x1: 16, y1: 3, z1: 4, x2: 17, y2: 3, z2: 5, block: 'gold' },
        // U-shape: left wall + bottom + right wall
        { type: 'fill', x1: 2, y1: 1, z1: 12, x2: 2, y2: 4, z2: 17, block: 'wood' },
        { type: 'fill', x1: 2, y1: 1, z1: 17, x2: 7, y2: 4, z2: 17, block: 'wood' },
        { type: 'fill', x1: 7, y1: 1, z1: 12, x2: 7, y2: 4, z2: 17, block: 'wood' },
        // Open space for student building challenge (50 cu units)
        { type: 'fill', x1: 14, y1: 0, z1: 12, x2: 24, y2: 0, z2: 18, block: 'sand' },
      ],
      npcs: [
        { position: [5, 1, 1], name: 'Decomposer', color: 0x7c3aed,
          dialogue: 'Complex shapes can be split into rectangles! The T-shape has a top bar (8\u00d72\u00d73) and a stem (2\u00d72\u00d75).', question: null },
        { position: [5, 4, 5], name: 'T-Shape Quiz', color: 0x2563eb,
          dialogue: 'This T-shape has a top bar and a stem. Let\u2019s measure each part!',
          question: { text: 'Top bar is 8\u00d72\u00d73. Volume?', choices: ['48 cubic units', '24 cubic units', '36 cubic units'], correct: 0,
            followUp: [
              { text: 'Stem is 2\u00d72\u00d75. Volume?', choices: ['20 cubic units', '10 cubic units', '30 cubic units'], correct: 0 },
              { text: 'Total T-shape = 48 + 20 = ?', choices: ['68 cubic units', '48 cubic units', '96 cubic units'], correct: 0 }
            ] } },
        { position: [17, 4, 4], name: 'Pyramid Guide', color: 0xf59e0b,
          dialogue: 'This step pyramid has 3 layers. Count each layer separately!',
          question: { text: 'Bottom layer: 6\u00d76\u00d71. Volume?', choices: ['36 cubic units', '24 cubic units', '12 cubic units'], correct: 0,
            followUp: [
              { text: 'Middle layer: 4\u00d74\u00d71 = ?', choices: ['16 cubic units', '12 cubic units', '8 cubic units'], correct: 0 },
              { text: 'Top layer: 2\u00d72\u00d71 = ?', choices: ['4 cubic units', '2 cubic units', '8 cubic units'], correct: 0 },
              { text: 'Total pyramid: 36 + 16 + 4 = ?', choices: ['56 cubic units', '36 cubic units', '64 cubic units'], correct: 0 }
            ] } },
        { position: [4, 5, 14], name: 'U-Shape Sage', color: 0x16a34a,
          dialogue: 'The U-shape is hollow. It has 3 rectangular parts: left wall, bottom, right wall.',
          question: { text: 'Is a U-shape\u2019s volume more or less than the bounding box?', choices: ['Less \u2014 the hollow part is empty', 'Same \u2014 the box counts all space', 'More \u2014 the U has extra corners'], correct: 0,
            followUp: [
              { text: 'To find U-shape volume: bounding box minus hollow. Which is correct?', choices: ['V = outer - inner', 'V = outer + inner', 'V = outer \u00d7 inner'], correct: 0 }
            ] } },
        { position: [19, 1, 15], name: 'Design Challenge', color: 0xdc2626,
          dialogue: 'Build a composite shape with EXACTLY 50 cubic units! Hint: 5\u00d75\u00d72 = 50.',
          question: { text: 'Which does NOT equal 50?', choices: ['6\u00d74\u00d72 = 48 \u2717', '5\u00d75\u00d72 = 50 \u2713', '10\u00d75\u00d71 = 50 \u2713'], correct: 0 } }
      ]
    },
    fractionVolume: {
      title: 'Fractional Dimensions \u2014 Beyond Whole Numbers',
      description: 'What happens when dimensions aren\u2019t whole numbers? Explore how half-blocks change volume calculations.',
      spawnPoint: [3, 2, 3],
      objectives: [
        'Compare a 4\u00d73\u00d72 prism to a 4\u00d73\u00d72.5 prism',
        'Calculate volume when one dimension is a fraction',
        'Understand that volume can be a non-whole number',
        'Estimate the volume of a partially filled container'
      ],
      ground: { xMin: -2, xMax: 22, zMin: -2, zMax: 18, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 20, y2: 0, z2: 16, block: 'stone' },
        // Whole-number prism: 4x3x2 = 24
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 5, y2: 2, z2: 4, block: 'diamond' },
        // Same base but taller: 4x3x4 = 48 (the "2.5" is between these)
        { type: 'fill', x1: 10, y1: 1, z1: 2, x2: 13, y2: 4, z2: 4, block: 'gold' },
        // Half-filled container: 6x4 base, walls 3 high, filled 2 high with sand
        { type: 'fill', x1: 2, y1: 1, z1: 10, x2: 7, y2: 3, z2: 10, block: 'glass' },
        { type: 'fill', x1: 2, y1: 1, z1: 14, x2: 7, y2: 3, z2: 14, block: 'glass' },
        { type: 'fill', x1: 2, y1: 1, z1: 10, x2: 2, y2: 3, z2: 14, block: 'glass' },
        { type: 'fill', x1: 7, y1: 1, z1: 10, x2: 7, y2: 3, z2: 14, block: 'glass' },
        { type: 'fill', x1: 3, y1: 1, z1: 11, x2: 6, y2: 2, z2: 13, block: 'sand' },
        // Comparison towers (same base, different heights)
        { type: 'fill', x1: 14, y1: 1, z1: 10, x2: 16, y2: 3, z2: 12, block: 'diamond' },
        { type: 'fill', x1: 18, y1: 1, z1: 10, x2: 20, y2: 5, z2: 12, block: 'diamond' },
      ],
      npcs: [
        { position: [3, 3, 3], name: 'Fraction Prof', color: 0x7c3aed,
          dialogue: 'In real life, dimensions aren\u2019t always whole numbers! A box might be 4 \u00d7 3 \u00d7 2.5 feet. Volume = 4 \u00d7 3 \u00d7 2.5 = 30 cubic feet. The formula still works!', question: null },
        { position: [12, 5, 3], name: 'Between Quiz', color: 0x2563eb,
          dialogue: 'The blue prism = 24. The gold = 48. What about a height halfway between (2.5)?',
          question: { text: 'Blue is 4\u00d73\u00d72 = 24. Gold is 4\u00d73\u00d74 = 48. Halfway height is?', choices: ['2.5 (halfway between 2 and 4-1=3)', '3', '3.5'], correct: 0,
            followUp: [
              { text: 'Volume of 4 \u00d7 3 \u00d7 2.5?', choices: ['30 cubic units', '24 cubic units', '36 cubic units'], correct: 0 },
              { text: 'Is 30 between 24 and 48?', choices: ['Yes! Fractional height gives in-between volume', 'No', 'Only sometimes'], correct: 0 }
            ] } },
        { position: [4, 1, 9], name: 'Container Challenge', color: 0xf59e0b,
          dialogue: 'This glass container is 4 wide, 3 deep, 3 tall. Sand fills the bottom 2 blocks.',
          question: { text: 'Sand volume? (4\u00d73\u00d72)', choices: ['24 cubic units', '12 cubic units', '36 cubic units'], correct: 0,
            followUp: [
              { text: 'Total container = 4\u00d73\u00d73 = 36. Empty space = 36 - 24 = ?', choices: ['12 more cubic units', '24 more', '6 more'], correct: 0 }
            ] } },
        { position: [17, 1, 9], name: 'Height Detective', color: 0x16a34a,
          dialogue: 'Two towers, same 3\u00d73 base. Short = 3 tall, Tall = 5 tall.',
          question: { text: 'Short tower volume? (3\u00d73\u00d73)', choices: ['27 cubic units', '18 cubic units', '9 cubic units'], correct: 0,
            followUp: [
              { text: 'Tall tower? (3\u00d73\u00d75)', choices: ['45 cubic units', '27 cubic units', '30 cubic units'], correct: 0 },
              { text: '45 \u00f7 27 \u2248 ? (how many times bigger?)', choices: ['About 1.67\u00d7 (5/3)', 'Exactly 2\u00d7', 'About 1.5\u00d7'], correct: 0 }
            ] } }
      ]
    },
    volumeEstimation: {
      title: 'Volume Estimation \u2014 Think Before You Count',
      description: 'Develop estimation skills! Guess the volume before measuring. Good estimators are strong mathematicians.',
      spawnPoint: [3, 2, 3],
      objectives: [
        'Estimate each structure\u2019s volume BEFORE measuring',
        'Use the reference cube (1 block) to calibrate your estimates',
        'See how close your estimates are to the actual volumes',
        'Estimation is a skill \u2014 it gets better with practice!'
      ],
      ground: { xMin: -2, xMax: 30, zMin: -2, zMax: 18, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 28, y2: 0, z2: 16, block: 'stone' },
        // Reference: single block (V=1)
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 2, y2: 1, z2: 2, block: 'gold' },
        // Small: 3x2x2 = 12
        { type: 'fill', x1: 6, y1: 1, z1: 2, x2: 8, y2: 2, z2: 3, block: 'diamond' },
        // Medium: 5x3x3 = 45
        { type: 'fill', x1: 12, y1: 1, z1: 2, x2: 16, y2: 3, z2: 4, block: 'diamond' },
        // Large: 7x4x3 = 84
        { type: 'fill', x1: 20, y1: 1, z1: 2, x2: 26, y2: 3, z2: 5, block: 'diamond' },
        // Tricky: thin and tall 2x2x8 = 32
        { type: 'fill', x1: 4, y1: 1, z1: 10, x2: 5, y2: 8, z2: 11, block: 'gold' },
        // Tricky: flat and wide 10x5x1 = 50
        { type: 'fill', x1: 10, y1: 1, z1: 10, x2: 19, y2: 1, z2: 14, block: 'gold' },
        // Hidden: behind a wall, only partial view
        { type: 'fill', x1: 24, y1: 1, z1: 9, x2: 24, y2: 5, z2: 15, block: 'wood' },
        { type: 'fill', x1: 25, y1: 1, z1: 10, x2: 28, y2: 3, z2: 13, block: 'diamond' },
      ],
      npcs: [
        { position: [2, 2, 4], name: 'Estimator', color: 0x7c3aed,
          dialogue: 'Welcome! This gold block is your reference: 1 cubic unit. Use it to estimate the others BEFORE you measure (M key). Good estimation is a superpower in math!', question: null },
        { position: [7, 3, 2], name: 'Small Quiz', color: 0x2563eb,
          dialogue: 'Look at this small structure. Estimate its dimensions before measuring!',
          question: { text: 'How many blocks LONG does it look?', choices: ['3 blocks', '4 blocks', '2 blocks'], correct: 0,
            followUp: [
              { text: 'And how wide and tall? (Look carefully!)', choices: ['2 wide, 2 tall', '3 wide, 2 tall', '2 wide, 3 tall'], correct: 0 },
              { text: 'So 3\u00d72\u00d72 = ?', choices: ['12 cubic units', '24 cubic units', '6 cubic units'], correct: 0 }
            ] } },
        { position: [14, 4, 3], name: 'Medium Quiz', color: 0xf59e0b,
          dialogue: 'This one is bigger. Count edges if you can see them.',
          question: { text: 'Estimate: how long? (count the blocks along one edge)', choices: ['5 blocks', '4 blocks', '6 blocks'], correct: 0,
            followUp: [
              { text: 'It\u2019s 5\u00d73\u00d73. Volume?', choices: ['45 cubic units', '30 cubic units', '60 cubic units'], correct: 0 }
            ] } },
        { position: [23, 4, 3], name: 'Large Quiz', color: 0x16a34a,
          dialogue: 'The big one! Use L\u00d7W\u00d7H \u2014 don\u2019t count every block.',
          question: { text: 'Estimate the length (blocks along the longest edge)?', choices: ['7 blocks', '6 blocks', '8 blocks'], correct: 0,
            followUp: [
              { text: 'It\u2019s 7\u00d74\u00d73. Volume?', choices: ['84 cubic units', '72 cubic units', '96 cubic units'], correct: 0 }
            ] } },
        { position: [4, 9, 10], name: 'Shape Illusion', color: 0xdc2626,
          dialogue: 'Which has more volume: this tall tower or the flat slab?',
          question: { text: 'Tower = 2\u00d72\u00d78. Volume?', choices: ['32 cubic units', '16 cubic units', '64 cubic units'], correct: 0,
            followUp: [
              { text: 'Slab = 10\u00d75\u00d71. Volume?', choices: ['50 cubic units', '15 cubic units', '100 cubic units'], correct: 0 },
              { text: 'Which is bigger: tower (32) or slab (50)?', choices: ['The flat slab \u2014 shape can fool you!', 'The tall tower', 'Same'], correct: 0 }
            ] } }
      ]
    },
    fractionBuilder: {
      title: 'Fraction Builder \u2014 Parts of a Whole',
      description: 'Use half-blocks and quarter-wedges to explore fractions through building! Every shape has an exact fractional relationship to the unit cube.',
      spawnPoint: [3, 2, 3],
      objectives: [
        'Place two half-blocks side by side \u2014 do they equal one whole cube?',
        'Build a structure using only half-blocks. What\u2019s its volume?',
        'Combine cubes and half-blocks to make exactly 3\u00BD cubic units',
        'Use the \u25E2 shape selector to switch between cube, half, and quarter shapes'
      ],
      ground: { xMin: -2, xMax: 22, zMin: -2, zMax: 18, y: 0, type: 'grass' },
      structures: [
        { type: 'fill', x1: 0, y1: 0, z1: 0, x2: 20, y2: 0, z2: 16, block: 'stone' },
        // Reference: single cube (V = 1)
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 2, y2: 1, z2: 2, block: 'diamond' },
        // Two cubes = 2 whole units (for comparison)
        { type: 'fill', x1: 6, y1: 1, z1: 2, x2: 7, y2: 1, z2: 2, block: 'gold' },
        // Build platforms for student experiments
        { type: 'fill', x1: 2, y1: 0, z1: 8, x2: 8, y2: 0, z2: 14, block: 'sand' },
        { type: 'fill', x1: 12, y1: 0, z1: 8, x2: 18, y2: 0, z2: 14, block: 'sand' },
        // A 2x2x2 cube for reference (V = 8)
        { type: 'fill', x1: 12, y1: 1, z1: 2, x2: 13, y2: 2, z2: 3, block: 'diamond' },
      ],
      npcs: [
        { position: [2, 2, 4], name: 'Fraction Guide', color: 0x7c3aed,
          dialogue: 'Welcome to Fraction Builder! Look at the shape selector above the block bar \u2014 you can place cubes (1), halves (\u00BD), or quarters (\u00BC). Try placing two halves next to each other. Do they fill the same space as one cube?', question: null },
        { position: [6, 2, 4], name: 'Half Quiz', color: 0x2563eb,
          dialogue: 'A half-block has volume = \u00BD cubic unit. Let\u2019s count with fractions!',
          question: { text: 'Volume of 1 half-block?', choices: ['\u00BD cubic unit', '1 cubic unit', '\u00BC cubic unit'], correct: 0,
            followUp: [
              { text: '2 half-blocks = ?', choices: ['1 cubic unit (2 \u00d7 \u00BD = 1)', '2 cubic units', '\u00BD cubic unit'], correct: 0 },
              { text: '6 half-blocks = ?', choices: ['3 cubic units', '6 cubic units', '2 cubic units'], correct: 0 }
            ] } },
        { position: [12, 3, 2], name: 'Whole Quiz', color: 0xf59e0b,
          dialogue: 'This 2\u00d72\u00d72 cube has 8 blocks = 8 cubic units. What if we swap some for halves?',
          question: { text: '8 cubes = 8 cubic units. If we replace 4 with half-blocks, how many \u201cwhole\u201d cubes remain?', choices: ['4 whole cubes', '8 cubes', '2 cubes'], correct: 0,
            followUp: [
              { text: '4 cubes + 4 half-blocks. Volume = 4\u00d71 + 4\u00d7\u00BD = ?', choices: ['6 cubic units', '8 cubic units', '4 cubic units'], correct: 0 }
            ] } },
        { position: [5, 1, 11], name: 'Challenge Master', color: 0x16a34a,
          dialogue: 'Build EXACTLY 3\u00BD cubic units on the sand platform! Use the shape selector (Q key).',
          question: { text: 'How many quarter-wedges equal \u00BD?', choices: ['2 quarters', '4 quarters', '1 quarter'], correct: 0,
            followUp: [
              { text: 'How many quarter-wedges equal 1 whole cube?', choices: ['4 quarters', '2 quarters', '8 quarters'], correct: 0 }
            ] } },
        { position: [15, 1, 11], name: 'Pizza Professor', color: 0xdc2626,
          dialogue: 'Think pizza! Whole cube = whole pizza. Half-block = half pizza. Quarter-wedge = one slice of 4.',
          question: { text: 'You eat 3 whole pizzas. How many cubic units is that?', choices: ['3 cubic units', '3\u00BD', '6'], correct: 0,
            followUp: [
              { text: 'Now add 2 quarter-slices (\u00BC each). Total = 3 + \u00BD = ?', choices: ['3\u00BD pizzas', '3\u00BC pizzas', '5 pizzas'], correct: 0 }
            ] } }
      ]
    },
    base10Blocks: {
      title: 'Base 10 Place Value \u2014 Building Numbers in 3D',
      description: 'Understand place value by building numbers with unit cubes (1s), ten-rods (10s), and hundred-flats (100s). Each block represents a different place value \u2014 see how numbers are constructed!',
      spawnPoint: [5, 2, 5],
      objectives: [
        'Identify units (1), tens (10), and hundreds (100) blocks',
        'Build the number 234 using base-10 blocks',
        'Compare two numbers by counting their blocks',
        'Understand that 10 ones = 1 ten, 10 tens = 1 hundred'
      ],
      ground: { xMin: -4, xMax: 30, zMin: -4, zMax: 24, y: 0, type: 'grass' },
      structures: [
        // Floor
        { type: 'fill', x1: -2, y1: 0, z1: -2, x2: 28, y2: 0, z2: 22, block: 'stone' },
        // ── Station 1: The Unit Cube (ONES place) ──
        // Single gold cube = 1 unit
        { type: 'fill', x1: 2, y1: 1, z1: 2, x2: 2, y2: 1, z2: 2, block: 'gold' },
        // Label platform
        { type: 'fill', x1: 2, y1: 0, z1: 0, x2: 2, y2: 0, z2: 0, block: 'diamond' },
        // ── Station 2: The Ten-Rod (TENS place) ──
        // Row of 10 gold cubes = 10 units
        { type: 'fill', x1: 8, y1: 1, z1: 2, x2: 17, y2: 1, z2: 2, block: 'gold' },
        // Label platform
        { type: 'fill', x1: 12, y1: 0, z1: 0, x2: 12, y2: 0, z2: 0, block: 'diamond' },
        // ── Station 3: The Hundred-Flat (HUNDREDS place) ──
        // 10\u00d710 flat of gold cubes = 100 units
        { type: 'fill', x1: 2, y1: 1, z1: 8, x2: 11, y2: 1, z2: 17, block: 'gold' },
        // Label
        { type: 'fill', x1: 6, y1: 0, z1: 6, x2: 6, y2: 0, z2: 6, block: 'diamond' },
        // ── Example: The number 234 ──
        // 2 hundred-flats (stacked)
        { type: 'fill', x1: 16, y1: 1, z1: 8, x2: 25, y2: 1, z2: 17, block: 'diamond' },
        { type: 'fill', x1: 16, y1: 2, z1: 8, x2: 25, y2: 2, z2: 17, block: 'diamond' },
        // 3 ten-rods (beside the flats)
        { type: 'fill', x1: 16, y1: 1, z1: 19, x2: 25, y2: 1, z2: 19, block: 'brick' },
        { type: 'fill', x1: 16, y1: 1, z1: 20, x2: 25, y2: 1, z2: 20, block: 'brick' },
        { type: 'fill', x1: 16, y1: 1, z1: 21, x2: 25, y2: 1, z2: 21, block: 'brick' },
        // 4 unit cubes
        { type: 'fill', x1: 16, y1: 1, z1: 23, x2: 19, y2: 1, z2: 23, block: 'sand' },
        // ── Build Platform (for student experiments) ──
        { type: 'fill', x1: 2, y1: 0, z1: 20, x2: 12, y2: 0, z2: 24, block: 'sand' }
      ],
      npcs: [
        { position: [0, 1, 2], name: 'Place Value Guide', color: 0x7c3aed,
          dialogue: 'Welcome! In our number system, position matters. Each place is 10\u00d7 bigger than the one before. Let\u2019s explore with blocks!', question: null },
        { position: [2, 2, 0], name: 'Ones Expert', color: 0xf59e0b,
          dialogue: 'This single gold cube represents ONE unit. It\u2019s the building block of all numbers!',
          question: { text: 'How many unit cubes = 1 unit?', choices: ['1 cube', '10 cubes', '100 cubes'], correct: 0,
            followUp: [
              { text: 'If you have 7 unit cubes, what number do they represent?', choices: ['7', '70', '700'], correct: 0 }
            ] } },
        { position: [12, 2, 0], name: 'Tens Teacher', color: 0x2563eb,
          dialogue: 'This row of 10 cubes is a TEN-ROD. Count them \u2014 10 ones make 1 ten!',
          question: { text: 'How many unit cubes are in this ten-rod?', choices: ['10 cubes', '1 cube', '100 cubes'], correct: 0,
            followUp: [
              { text: 'If you have 5 ten-rods, what number is that?', choices: ['50', '5', '500'], correct: 0 },
              { text: 'How many unit cubes = 5 ten-rods?', choices: ['50 cubes', '5 cubes', '15 cubes'], correct: 0 }
            ] } },
        { position: [6, 2, 6], name: 'Hundreds Hero', color: 0x16a34a,
          dialogue: 'This 10\u00d710 flat is a HUNDRED-FLAT. It has 10 ten-rods, or 100 unit cubes! Use M to measure it.',
          question: { text: 'How many unit cubes in this 10\u00d710 flat?', choices: ['100 cubes', '10 cubes', '20 cubes'], correct: 0,
            followUp: [
              { text: '10 ten-rods = 1 hundred-flat. What is 10 \u00d7 10?', choices: ['100', '20', '1000'], correct: 0 }
            ] } },
        { position: [20, 3, 15], name: 'Number Builder', color: 0xdc2626,
          dialogue: 'This structure represents the number 234: 2 hundred-flats (blue) + 3 ten-rods (red) + 4 unit cubes (beige). 200 + 30 + 4 = 234!',
          question: { text: '2 hundreds + 3 tens + 4 ones = ?', choices: ['234', '2034', '432'], correct: 0,
            followUp: [
              { text: 'What is the value of the digit 3 in 234?', choices: ['30 (3 tens)', '3 (3 ones)', '300 (3 hundreds)'], correct: 0 },
              { text: 'How many total unit cubes would you need to build 234?', choices: ['234 cubes', '9 cubes (2+3+4)', '23 cubes'], correct: 0 }
            ] } },
        { position: [7, 1, 22], name: 'Build Challenge', color: 0x7c3aed,
          dialogue: 'Your turn! Use the sand platform to build the number 156. That\u2019s 1 hundred-flat + 5 ten-rods + 6 unit cubes. Measure with M to check!',
          question: { text: 'In the number 156, what does the 5 represent?', choices: ['5 tens (50)', '5 ones (5)', '5 hundreds (500)'], correct: 0,
            followUp: [
              { text: '1 hundred + 5 tens + 6 ones = ?', choices: ['156', '516', '165'], correct: 0 }
            ] } }
      ]
    },
    fluencyMaze: {
      title: 'Volume Fluency Maze \u2014 Measure to Navigate',
      description: 'Race through a 3D maze where every junction has structures you must MEASURE to find the correct path! Wrong turns lead to dead ends. Use the M key to measure quickly and accurately.',
      spawnPoint: [2, 2, 2],
      objectives: [
        'Measure each structure at a junction to find its volume',
        'Choose the path labeled with the correct answer',
        'Reach the golden finish platform at the end',
        'Complete the maze as fast as you can!'
      ],
      ground: { xMin: -2, xMax: 40, zMin: -2, zMax: 30, y: 0, type: 'stone' },
      structures: [
        // ── Maze walls (brick, 3 blocks high) ──
        // Start corridor
        { type: 'fill', x1: 0, y1: 1, z1: 0, x2: 0, y2: 3, z2: 8, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 0, x2: 4, y2: 3, z2: 8, block: 'brick' },
        // ── Junction 1: Measure 3\u00d72\u00d72 = 12 ──
        // Structure to measure (diamond)
        { type: 'fill', x1: 1, y1: 1, z1: 5, x2: 3, y2: 2, z2: 6, block: 'diamond' },
        // Fork: LEFT path (correct = 12) and RIGHT path (dead end)
        { type: 'fill', x1: 0, y1: 1, z1: 8, x2: 0, y2: 3, z2: 14, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 8, x2: 4, y2: 3, z2: 10, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 10, x2: 8, y2: 3, z2: 10, block: 'brick' },
        // Dead end wall (right path)
        { type: 'fill', x1: 8, y1: 1, z1: 8, x2: 8, y2: 3, z2: 10, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 8, x2: 8, y2: 3, z2: 8, block: 'brick' },
        // Correct path continues north
        { type: 'fill', x1: 0, y1: 1, z1: 14, x2: 8, y2: 3, z2: 14, block: 'brick' },
        // ── Junction 2: Measure 4\u00d73\u00d72 = 24 ──
        { type: 'fill', x1: 1, y1: 1, z1: 11, x2: 3, y2: 2, z2: 13, block: 'gold' },
        // Corridor continues east
        { type: 'fill', x1: 0, y1: 1, z1: 14, x2: 0, y2: 3, z2: 20, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 14, x2: 4, y2: 3, z2: 20, block: 'brick' },
        // ── Junction 3: Measure 5\u00d72\u00d73 = 30 ──
        { type: 'fill', x1: 1, y1: 1, z1: 17, x2: 3, y2: 3, z2: 18, block: 'diamond' },
        // Fork north vs east
        { type: 'fill', x1: 0, y1: 1, z1: 20, x2: 0, y2: 3, z2: 26, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 20, x2: 12, y2: 3, z2: 20, block: 'brick' },
        // Dead end (east)
        { type: 'fill', x1: 12, y1: 1, z1: 20, x2: 12, y2: 3, z2: 24, block: 'brick' },
        { type: 'fill', x1: 8, y1: 1, z1: 24, x2: 12, y2: 3, z2: 24, block: 'brick' },
        { type: 'fill', x1: 8, y1: 1, z1: 20, x2: 8, y2: 3, z2: 24, block: 'brick' },
        // Correct path continues north to finish
        { type: 'fill', x1: 0, y1: 1, z1: 26, x2: 8, y2: 3, z2: 26, block: 'brick' },
        { type: 'fill', x1: 4, y1: 1, z1: 20, x2: 4, y2: 3, z2: 26, block: 'brick' },
        // ── FINISH PLATFORM ──
        { type: 'fill', x1: 1, y1: 1, z1: 23, x2: 3, y2: 1, z2: 25, block: 'gold' },
        { type: 'fill', x1: 2, y1: 2, z1: 24, x2: 2, y2: 2, z2: 24, block: 'diamond' }
      ],
      npcs: [
        { position: [2, 1, 1], name: 'Maze Guide', color: 0x7c3aed,
          dialogue: 'Welcome to the Volume Fluency Maze! At each junction, MEASURE the structure (M key) to find its volume. The correct volume tells you which path to take! Speed and accuracy both matter. Go!', question: null },
        { position: [2, 3, 6], name: 'Junction 1', color: 0x2563eb,
          dialogue: 'Measure the blue structure below (M key). It\u2019s 3 long, 2 wide, 2 tall. Take the path matching the correct volume!',
          question: { text: 'Volume of this 3\u00d72\u00d72 structure?', choices: ['12 \u2014 go LEFT (north)', '8 \u2014 go RIGHT (east)', '6 \u2014 go RIGHT (east)'], correct: 0,
            followUp: [
              { text: 'Double check: 3 \u00d7 2 = 6, then 6 \u00d7 2 = ?', choices: ['12 \u2713 (go left!)', '8', '10'], correct: 0 }
            ] } },
        { position: [2, 3, 12], name: 'Junction 2', color: 0xf59e0b,
          dialogue: 'Nice! Now measure the gold structure. Be quick \u2014 fluency means speed + accuracy!',
          question: { text: 'Volume of this gold prism?', choices: ['24 cubic units', '18 cubic units', '36 cubic units'], correct: 0 } },
        { position: [2, 4, 18], name: 'Junction 3', color: 0x16a34a,
          dialogue: 'Last junction! This one is taller. Measure carefully \u2014 the finish is close!',
          question: { text: 'Volume of 5\u00d72\u00d73?', choices: ['30 \u2014 go NORTH to finish!', '25 \u2014 go EAST', '20 \u2014 go EAST'], correct: 0,
            followUp: [
              { text: '5 \u00d7 2 = 10, then 10 \u00d7 3 = ?', choices: ['30 \u2713 (north to gold platform!)', '15', '60'], correct: 0 }
            ] } },
        { position: [2, 2, 24], name: 'Finish!', color: 0xdc2626,
          dialogue: '\uD83C\uDFC6 You made it! You navigated the maze using volume measurement fluency. Every junction tested your speed and accuracy with L\u00d7W\u00d7H. That\u2019s fluency \u2014 doing math automatically so you can focus on the problem!',
          question: { text: 'Why is math fluency important?', choices: ['It frees your brain for harder problems', 'It only matters for tests', 'It\u2019s not important'], correct: 0 } }
      ]
    }
  };

  var LESSON_ORDER = ['volumeExplorer', 'areaSurface', 'buildChallenge', 'realWorld', 'geometryGarden', 'compositeVolume', 'fractionVolume', 'volumeEstimation', 'fractionBuilder', 'base10Blocks', 'fluencyMaze'];
  var MAX_BLOCKS = 1500; // Performance safety limit

  // ── Worksheet Generator ──
  // Creates a printable companion worksheet for any lesson
  function generateWorksheetHTML(lesson) {
    var npcsWithQ = (lesson.npcs || []).filter(function(n) { return n.question; });
    var allNpcs = lesson.npcs || [];
    var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + (lesson.title || 'Geometry World') + ' — Worksheet</title>'
      + '<style>'
      + 'body{font-family:Arial,sans-serif;max-width:750px;margin:0 auto;padding:24px;color:#1a1a1a;font-size:13px;line-height:1.6}'
      + 'h1{font-size:20px;border-bottom:2px solid #7c3aed;padding-bottom:6px;color:#4c1d95}'
      + 'h2{font-size:15px;color:#7c3aed;margin-top:20px;margin-bottom:6px}'
      + '.header{display:flex;justify-content:space-between;border:1px solid #d1d5db;border-radius:8px;padding:10px 14px;margin-bottom:16px;background:#f9fafb}'
      + '.header label{font-weight:700;font-size:12px;color:#6b7280}'
      + '.header input{border:none;border-bottom:1px solid #d1d5db;font-size:13px;width:140px;padding:2px 4px;font-family:inherit}'
      + '.formula-box{background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:10px 14px;margin:10px 0;font-family:monospace;font-size:14px}'
      + '.problem{border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:10px 0;page-break-inside:avoid}'
      + '.problem-title{font-weight:700;color:#1e293b;margin-bottom:6px;font-size:14px}'
      + '.work-box{border:1px dashed #d1d5db;border-radius:6px;min-height:60px;margin:8px 0;padding:6px;background:#fafafa}'
      + '.work-label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase}'
      + '.dim-line{display:flex;gap:16px;margin:6px 0}'
      + '.dim-line label{font-weight:600;font-size:12px}'
      + '.dim-line .blank{border-bottom:1px solid #374151;width:50px;display:inline-block;text-align:center}'
      + '.eq-line{font-family:monospace;font-size:14px;margin:8px 0;padding:8px;background:#f0fdf4;border-radius:6px;border:1px solid #86efac}'
      + '.objectives{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin:10px 0}'
      + '.objectives li{margin:4px 0}'
      + '.tip{background:#fef3c7;border-left:3px solid #f59e0b;padding:8px 12px;border-radius:0 6px 6px 0;margin:10px 0;font-size:12px}'
      + '.footer{margin-top:20px;font-size:10px;color:#6b7280;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}'
      + '@media print{body{padding:12px}}'
      + '</style></head><body>';

    // Header
    h += '<h1>\uD83E\uDDF1 ' + (lesson.title || 'Geometry World Worksheet') + '</h1>';
    h += '<div class="header">';
    h += '<div><label>Name:</label> <input type="text" placeholder=""></div>';
    h += '<div><label>Date:</label> <input type="text" placeholder=""></div>';
    h += '<div><label>Player #:</label> <input type="text" placeholder="" style="width:50px"></div>';
    h += '</div>';

    // Description
    if (lesson.description) {
      h += '<p><b>Introduction:</b> ' + lesson.description + '</p>';
    }

    // Formula reference
    h += '<div class="formula-box">';
    h += '<b>Key Formulas:</b><br>';
    h += 'Volume = Length \u00d7 Width \u00d7 Height &nbsp;&nbsp; (V = L \u00d7 W \u00d7 H)<br>';
    h += 'Volume = Base Area \u00d7 Height &nbsp;&nbsp; (V = A \u00d7 H)<br>';
    h += 'L-Block Volume = V\u2081 + V\u2082';
    h += '</div>';

    // Objectives
    if (lesson.objectives && lesson.objectives.length) {
      h += '<div class="objectives"><b>\uD83D\uDCCB Objectives:</b><ul>';
      lesson.objectives.forEach(function(obj) { h += '<li>\u2610 ' + obj + '</li>'; });
      h += '</ul></div>';
    }

    // Detect if this is the Geometry Garden (exploration mode) or a standard lesson
    var isGarden = !npcsWithQ.length || (lesson.title && lesson.title.indexOf('Garden') >= 0);

    if (isGarden) {
      // ── Field Journal for the Geometry Garden ──
      h += '<div class="tip" style="background:#ecfdf5;border-color:#16a34a">\uD83C\uDF3F <b>This is a Field Journal.</b> There are no right or wrong answers. Walk through the garden, observe the structures, and record what you notice. Take your time.</div>';

      var stations = [
        { name: 'Station 1: The Single Cube', prompt: 'Describe what you see. How many blocks? What are its dimensions?', sketch: true },
        { name: 'Station 2: The Row', prompt: 'How is this different from Station 1? How many blocks long is it? What dimension did we add?', sketch: true },
        { name: 'Station 3: The Flat Rectangle', prompt: 'Now we have two dimensions. Measure the length and width. What is the area (L \u00d7 W)?', sketch: true, measure: true },
        { name: 'Station 4: The Rectangular Prism', prompt: 'Three dimensions! Measure all three. How does this relate to the flat rectangle at Station 3?', sketch: true, measure: true, volume: true },
        { name: 'Station 5: Three Shapes, One Volume', prompt: 'Measure all three gold structures. What do you notice about their volumes? How can different shapes have the same volume?', sketch: true, measure: true, volume: true, wonder: 'What surprised you about these three structures?' },
        { name: 'Station 6: The L-Block', prompt: 'This shape is made of two rectangular prisms joined together. Can you find where one ends and the other begins?', sketch: true, measure: true, volume: true },
        { name: 'Station 7: Nested Cubes', prompt: 'The outer cube is glass (transparent). There is a smaller cube inside. What is the volume of JUST the glass shell?', sketch: true, measure: true, volume: true, wonder: 'How would you calculate the volume of a hollow shape?' },
        { name: 'The Hidden Garden', prompt: 'Find the structure behind the wall at the end of the path. This shape is NOT a rectangular prism. Can you still figure out its volume? How?', sketch: true, wonder: 'What new questions does this shape raise for you?' }
      ];

      stations.forEach(function(st, i) {
        h += '<div class="problem" style="border-color:#86efac">';
        h += '<div class="problem-title" style="color:#16a34a">\uD83C\uDF3F ' + st.name + '</div>';
        h += '<p>' + st.prompt + '</p>';
        if (st.measure) {
          h += '<div class="dim-line">';
          h += '<label>Length: <span class="blank">&nbsp;</span></label>';
          h += '<label>Width: <span class="blank">&nbsp;</span></label>';
          h += '<label>Height: <span class="blank">&nbsp;</span></label>';
          h += '</div>';
        }
        if (st.volume) {
          h += '<div class="eq-line">Volume = ___ \u00d7 ___ \u00d7 ___ = ___ cubic units</div>';
        }
        if (st.sketch) {
          h += '<div class="work-label">\u270D\uFE0F Sketch what you see (or describe it in words)</div>';
          h += '<div class="work-box" style="min-height:70px"></div>';
        }
        if (st.wonder) {
          h += '<div style="background:#fef3c7;border-radius:6px;padding:8px 10px;margin-top:6px;font-size:12px;border-left:3px solid #f59e0b">';
          h += '<b>\uD83E\uDD14 Wonder Question:</b> ' + st.wonder;
          h += '</div>';
        }
        h += '</div>';
      });

      // Garden reflection — deeper than standard
      h += '<div class="problem" style="border-color:#a78bfa">';
      h += '<div class="problem-title" style="color:#7c3aed">\uD83C\uDF1F Final Reflection</div>';
      h += '<p><b>1.</b> Which station was most interesting to you? Why?</p>';
      h += '<div class="work-box" style="min-height:50px"></div>';
      h += '<p><b>2.</b> At Station 5, three shapes all had the same volume. In your own words, explain how that is possible.</p>';
      h += '<div class="work-box" style="min-height:50px"></div>';
      h += '<p><b>3.</b> The hidden structure at the end is not a rectangular prism. What new math would you need to find its volume?</p>';
      h += '<div class="work-box" style="min-height:50px"></div>';
      h += '<p><b>4.</b> If you could add one more structure to the garden, what would it be and why?</p>';
      h += '<div class="work-box" style="min-height:50px"></div>';
      h += '</div>';

      h += '<div class="tip" style="background:#f5f3ff;border-color:#7c3aed">\uD83C\uDF31 <b>Growth Note:</b> There are no wrong answers in a field journal. Every observation you made today built new connections in your brain. The structures in the garden will still be there tomorrow \u2014 but the person looking at them will know more than they did today.</div>';

    } else {
      // ── Standard lesson worksheet ──
      var problemNum = 1;
      allNpcs.forEach(function(npc, idx) {
        h += '<div class="problem">';
        h += '<div class="problem-title">Activity #' + problemNum + ': ' + npc.name + '</div>';
        h += '<p>' + npc.dialogue + '</p>';

        if (npc.question) {
          h += '<p><b>Question:</b> ' + npc.question.text + '</p>';
          h += '<div class="dim-line">';
          h += '<label>Length: <span class="blank">&nbsp;</span> blocks</label>';
          h += '<label>Width: <span class="blank">&nbsp;</span> blocks</label>';
          h += '<label>Height: <span class="blank">&nbsp;</span> blocks</label>';
          h += '</div>';
          h += '<div class="eq-line">___ \u00d7 ___ \u00d7 ___ = ___ cubic units</div>';
          h += '<div class="work-label">Show Your Work</div>';
          h += '<div class="work-box"></div>';
          h += '<p><b>My Answer:</b> <span class="blank" style="width:120px">&nbsp;</span></p>';
        } else {
          h += '<div class="work-label">Notes / Observations</div>';
          h += '<div class="work-box" style="min-height:40px"></div>';
        }
        h += '</div>';
        problemNum++;
      });

      // Reflection section
      h += '<div class="problem">';
      h += '<div class="problem-title">\uD83C\uDF31 Reflection</div>';
      h += '<p>What did you learn about volume today? What strategy helped you the most?</p>';
      h += '<div class="work-box" style="min-height:80px"></div>';
      h += '</div>';
    }

    h += '<div class="tip">\uD83D\uDCA1 <b>Remember:</b> Every block in Geometry World is 1 unit cube. To find the volume of a rectangular prism, count the blocks OR multiply Length \u00d7 Width \u00d7 Height!</div>';

    h += '<div class="footer">AlloFlow Geometry World \u2022 Companion Worksheet \u2022 \u00a9 ' + new Date().getFullYear() + '</div>';
    h += '</body></html>';
    return h;
  }

  // ── Physical Manipulative Bridge Card ──
  // Generates a printable "Build This in Your Classroom" card from a measurement
  function generateManipulativeCard(measurement, lessonTitle) {
    var m = measurement;
    var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Build This! \u2014 Physical Manipulative Card</title>'
      + '<style>'
      + 'body{font-family:Arial,sans-serif;max-width:500px;margin:24px auto;color:#1a1a1a}'
      + '.card{border:3px solid #7c3aed;border-radius:16px;padding:24px;background:linear-gradient(135deg,#faf5ff,#ede9fe)}'
      + 'h1{font-size:22px;color:#4c1d95;text-align:center;margin:0 0 4px}'
      + '.subtitle{text-align:center;color:#7c3aed;font-size:13px;margin-bottom:16px}'
      + '.diagram{background:#fff;border:2px dashed #c4b5fd;border-radius:12px;padding:20px;text-align:center;margin:12px 0}'
      + '.dim{font-size:28px;font-weight:800;color:#4c1d95;font-family:monospace}'
      + '.label{font-size:11px;color:#7c3aed;text-transform:uppercase;font-weight:700;letter-spacing:1px}'
      + '.steps{background:#fff;border-radius:10px;padding:14px 18px;margin:12px 0}'
      + '.steps ol{margin:0;padding-left:20px;font-size:13px;line-height:2}'
      + '.steps li strong{color:#4c1d95}'
      + '.answer-box{border:2px solid #c4b5fd;border-radius:10px;padding:12px;margin:12px 0;text-align:center}'
      + '.answer-box .prompt{font-size:13px;font-weight:700;color:#4c1d95}'
      + '.answer-box .line{border-bottom:2px solid #d1d5db;width:150px;display:inline-block;margin:8px 10px}'
      + '.check{background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px;margin:12px 0;font-size:12px;color:#166534}'
      + '.footer{text-align:center;font-size:9px;color:#94a3b8;margin-top:16px}'
      + '@media print{body{margin:0}.card{border:2px solid #000;box-shadow:none}}'
      + '</style></head><body><div class="card">';
    h += '<h1>\uD83E\uDDF1 Build This!</h1>';
    h += '<div class="subtitle">Physical Manipulative Challenge \u2014 ' + (lessonTitle || 'Geometry World') + '</div>';

    // Isometric-style ASCII diagram showing dimensions
    h += '<div class="diagram">';
    h += '<div class="dim">' + m.L + ' \u00d7 ' + m.W + ' \u00d7 ' + m.H + '</div>';
    h += '<div style="display:flex;justify-content:space-around;margin-top:12px">';
    h += '<div><div class="label">Length</div><div style="font-size:20px;font-weight:700;color:#4c1d95">' + m.L + ' blocks</div></div>';
    h += '<div><div class="label">Width</div><div style="font-size:20px;font-weight:700;color:#4c1d95">' + m.W + ' blocks</div></div>';
    h += '<div><div class="label">Height</div><div style="font-size:20px;font-weight:700;color:#4c1d95">' + m.H + ' blocks</div></div>';
    h += '</div></div>';

    h += '<div class="steps"><strong>\uD83D\uDCD0 Build Steps:</strong><ol>';
    h += '<li>Get <strong>' + m.boundingVolume + ' unit cubes</strong> (or snap cubes)</li>';
    h += '<li>Build the <strong>bottom layer</strong>: ' + m.L + ' blocks long \u00d7 ' + m.W + ' blocks wide = <strong>' + (m.L * m.W) + ' cubes</strong></li>';
    h += '<li>Stack <strong>' + m.H + ' layers</strong> on top of each other</li>';
    h += '<li><strong>Count all the cubes</strong> in your finished structure</li>';
    h += '</ol></div>';

    h += '<div class="answer-box">';
    h += '<div class="prompt">How many cubes did you use? <span class="line"></span></div>';
    h += '<div style="margin-top:8px;font-size:12px;color:#6b7280">Does this match ' + m.L + ' \u00d7 ' + m.W + ' \u00d7 ' + m.H + ' = <span class="line" style="width:60px"></span> ?</div>';
    h += '</div>';

    h += '<div class="check">';
    h += '\u2705 <strong>Check:</strong> Your physical structure should have the same volume as the digital one. ';
    h += 'The digital measurement showed <strong>' + m.boundingVolume + ' cubic units</strong>. ';
    h += 'Did your count match?';
    h += '</div>';

    h += '<div class="footer">AlloFlow Geometry World \u2022 Physical Manipulative Bridge Card \u2022 Virtual \u2194 Physical Validation<br>';
    h += '"The most effective geometry instruction combines virtual and physical" \u2014 Pomeranz (2024)</div>';
    h += '</div></body></html>';
    return h;
  }

  // ── AI World Generation Prompts (multi-pass) ──
  var AI_WORLD_PROMPT_BASE = 'You are a geometry lesson designer for a 3D block-based math world. '
    + 'Target grade level: {GRADE}. Topic: "{TOPIC}"\n\n'
    + 'Generate a JSON object with this EXACT structure:\n'
    + '{\n'
    + '  "title": "Lesson Title",\n'
    + '  "description": "Brief description for grade {GRADE} students",\n'
    + '  "spawnPoint": [2, 3, 2],\n'
    + '  "objectives": ["objective 1", "objective 2", "objective 3"],\n'
    + '  "ground": { "xMin": -4, "xMax": 24, "zMin": -4, "zMax": 24, "y": 0, "type": "grass" },\n'
    + '  "structures": [\n'
    + '    { "type": "fill", "x1": 0, "y1": 0, "z1": 0, "x2": 8, "y2": 0, "z2": 8, "block": "stone" },\n'
    + '    { "type": "fill", "x1": 2, "y1": 1, "z1": 2, "x2": 6, "y2": 3, "z2": 4, "block": "diamond" }\n'
    + '  ],\n'
    + '  "npcs": [\n'
    + '    { "position": [x, y, z], "name": "Name", "color": 8048861,\n'
    + '      "dialogue": "What the NPC says — explain the concept first!",\n'
    + '      "question": null }\n'
    + '  ]\n'
    + '}\n\n'
    + 'RULES:\n'
    + '- Block types: stone, grass, wood, diamond, gold, sand, glass, brick, ice, water\n'
    + '- NPC colors: 8048861 (purple), 2461147 (blue), 1484836 (green), 16096015 (amber), 14427142 (red)\n'
    + '- Create 3-5 structures demonstrating the topic concept\n'
    + '- Create 3-5 NPCs: first NPC is a guide (question: null), others have questions\n'
    + '- Questions MUST have exactly 3 choices with "correct" as a 0-based index\n'
    + '- All coordinates between -4 and 24. Ground is y=0. Build structures starting at y=1.\n'
    + '- Place NPCs at y = highest_block + 1 so they float above structures\n'
    + '- ALWAYS include a ground/floor structure first (y1=0, y2=0)\n'
    + '- Make dimensions appropriate for grade {GRADE} (grades 3-4: single digits, 5-6: double digits, 7+: fractions/composites)\n'
    + '- Return ONLY valid JSON, no markdown fences, no explanation.\n';

  var AI_REFINE_PROMPT = 'You are improving an existing 3D geometry lesson. Here is the current lesson JSON:\n\n'
    + '{LESSON_JSON}\n\n'
    + 'The teacher wants you to: {REFINEMENT}\n\n'
    + 'Return the COMPLETE improved JSON (same structure), not a diff. Fix any issues:\n'
    + '- Ensure all coordinates are valid (between -4 and 24)\n'
    + '- Ensure NPCs are positioned above their structures\n'
    + '- Ensure questions have exactly 3 choices\n'
    + '- Add more detail to NPC dialogues (explain concepts, give hints)\n'
    + '- Make structures more interesting and varied\n'
    + 'Return ONLY the valid JSON.';

  var AI_FOLLOWUP_PROMPT = 'You are adding scaffolded follow-up questions to a geometry lesson. '
    + 'Each NPC with a question should get a "followUp" array that breaks the concept into steps.\n\n'
    + 'Current lesson JSON:\n{LESSON_JSON}\n\n'
    + 'For each NPC that has a "question" object, add a "followUp" array inside the question:\n'
    + '"question": { "text": "...", "choices": [...], "correct": 0,\n'
    + '  "followUp": [\n'
    + '    { "text": "Step 2 question", "choices": ["A","B","C"], "correct": 0 },\n'
    + '    { "text": "Final step", "choices": ["A","B","C"], "correct": 0 }\n'
    + '  ]\n'
    + '}\n\n'
    + 'RULES for follow-ups:\n'
    + '- Decompose the main question into 2-3 scaffolded steps\n'
    + '- Step 1: identify ONE dimension (e.g., "How many blocks long?")\n'
    + '- Step 2: identify another dimension or calculate a partial result\n'
    + '- Final step: combine to get the answer (e.g., "5 x 3 x 4 = ?")\n'
    + '- Each step has exactly 3 choices with "correct" as 0-based index\n'
    + '- Do NOT change the existing question text or structure — ONLY add followUp arrays\n'
    + '- NPCs with question: null should stay null\n'
    + 'Return the COMPLETE lesson JSON with follow-ups added. ONLY valid JSON.';

  // ══════════════════════════════════════════════════════════════
  // ── Tool Registration ──
  // ══════════════════════════════════════════════════════════════

  window.StemLab.registerTool('geometryWorld', {
    name: 'Geometry World',
    icon: '\uD83E\uDDF1',
    category: 'explore',
    questHooks: [
      { id: 'score_5', label: 'Score 5 points in Geometry World', icon: '\uD83C\uDFAF', check: function(d) { return (d.score || 0) >= 5; }, progress: function(d) { return (d.score || 0) + '/5 pts'; } },
      { id: 'complete_tutorial', label: 'Complete the Geometry World tutorial', icon: '\uD83C\uDF93', check: function(d) { return d.tutorialDismissed || (d.tutorialStep || 0) >= 4; }, progress: function(d) { return (d.tutorialStep || 0) >= 4 ? 'Done!' : 'Step ' + ((d.tutorialStep || 0) + 1) + '/4'; } },
      { id: 'measure_structure', label: 'Measure a 3D structure', icon: '\uD83D\uDCCF', check: function(d) { return !!d.measureResult; }, progress: function(d) { return d.measureResult ? 'Measured!' : 'Press M on blocks'; } },
      { id: 'build_10', label: 'Place 10 blocks in the world', icon: '\uD83E\uDDF1', check: function(d) { return (d.blocksPlaced || 0) >= 10; }, progress: function(d) { return Math.min(d.blocksPlaced || 0, 10) + '/10 blocks'; } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var el = React.createElement;
      var d = (ctx.toolData && ctx.toolData.geometryWorld) || {};
      var upd = function (key, val) {
        if (typeof key === 'object') { ctx.updateMulti('geometryWorld', key); }
        else { ctx.update('geometryWorld', key, val); }
      };
      var callGemini = ctx.callGemini || null;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var threeReady = ctx.toolData && ctx.toolData._threeLoaded;

      // ── State from toolData ──
      var worldActive = d.worldActive || false;
      var selectedBlock = d.selectedBlock || 0;
      var score = d.score || 0;
      var totalQ = d.totalQ || 0;
      var showNpcDialog = d.showNpcDialog || false;
      var dialogNpcIdx = d.dialogNpcIdx || 0;
      var answeredNpcs = d.answeredNpcs || {};
      var aiPrompt = d.aiPrompt || '';
      var aiGenerating = d.aiGenerating || false;
      var aiPassCount = d.aiPassCount || 2; // 1=quick, 2=refine, 3=refine+followups
      var aiGradeLevel = d.aiGradeLevel || '4';
      var aiCurrentPass = d.aiCurrentPass || 0;
      var showMyLessons = d.showMyLessons || false;
      var showLessonEditor = d.showLessonEditor || false;
      var showLessonIntro = d.showLessonIntro || false;
      var soundMuted = d.soundMuted || false;
      var showReflection = d.showReflection || false;
      var reflectionText = d.reflectionText || '';
      var lessonEditorJson = d.lessonEditorJson || '';
      var aiRefinePrompt = d.aiRefinePrompt || '';
      var lastGeneratedLesson = d.lastGeneratedLesson || null;
      var activeLesson = d.activeLesson || 'volumeExplorer';
      var measureResult = d.measureResult || null;
      var npcChatInput = d.npcChatInput || '';
      var npcChatHistory = d.npcChatHistory || {};
      var npcChatLoading = d.npcChatLoading || false;
      var npcTypewriterPos = d.npcTypewriterPos || 0;
      var npcTypewriterNpc = d.npcTypewriterNpc || -1; // which NPC the typewriter is for
      var showHelp = d.showHelp || false;
      var creatorMode = d.creatorMode || false;
      var creatorNpcName = d.creatorNpcName || '';
      var creatorNpcDialogue = d.creatorNpcDialogue || '';
      var creatorNpcQuestion = d.creatorNpcQuestion || '';
      var creatorNpcChoices = d.creatorNpcChoices || '';
      var creatorNpcCorrect = d.creatorNpcCorrect || 0;
      var showCreatorPanel = d.showCreatorPanel || false;
      var selectedShape = d.selectedShape || 0; // index into BLOCK_SHAPES
      var blockRotation = d.blockRotation || 0; // 0-3 = 0°, 90°, 180°, 270° around Y axis
      var measureHistory = d.measureHistory || []; // past measurements
      var actionFeedback = d.actionFeedback || ''; // brief key action text
      var homeLang = d.homeLang || 'en';
      var npcTranslations = d.npcTranslations || {};
      var consecutiveWrong = d.consecutiveWrong || 0;
      var showGrowthNudge = d.showGrowthNudge || false;
      var growthNudgeMsg = d.growthNudgeMsg || '';
      var growthNudgeDismissed = d.growthNudgeDismissed || 0;
      // ── Tutorial state ──
      var tutorialStep = d.tutorialStep || 0; // 0-4 (0=not started, 4=done)
      var tutorialDismissed = d.tutorialDismissed || false;
      // ── Follow-up question state ──
      var npcFollowUpStep = d.npcFollowUpStep || {}; // { npcIdx: currentStep }
      // ── Teacher Command Center state ──
      var showTeacherView = d.showTeacherView || false;
      var studentProgressMap = d.studentProgressMap || {};
      var teacherUnsub = d.teacherUnsub || null;

      function toggleTeacherView() {
        if (showTeacherView) {
          // Turn off
          if (teacherUnsub) teacherUnsub();
          upd({ showTeacherView: false, teacherUnsub: null });
          return;
        }
        // Turn on — listen to student progress subcollection
        if (!fbDb || !fbAppId || !sessionCode || !fb.collection || !fb.onSnapshot) {
          if (addToast) addToast('Start a live session first!', 'error');
          return;
        }
        var progressRef = fb.collection(fbDb, 'artifacts', fbAppId, 'public', 'data', 'sessions', sessionCode, 'studentProgress');
        var unsub = fb.onSnapshot(progressRef, function(snapshot) {
          var data = {};
          snapshot.forEach(function(docSnap) { data[docSnap.id] = docSnap.data(); });
          upd('studentProgressMap', data);
        });
        upd({ showTeacherView: true, teacherUnsub: unsub });
        if (addToast) addToast('\uD83D\uDCCA Teacher view active \u2014 monitoring student progress', 'success');
      }

      // ── Achievement Badges state ──
      var earnedBadges = d.earnedBadges || {};
      var lastBadgeNotification = d.lastBadgeNotification || null;

      // Check achievements after key events (called from answer handlers, etc.)
      function runAchievementCheck() {
        var eng = window[engineKey];
        if (!eng || !eng.sessionLog) return;
        var result = checkAchievements(eng.sessionLog, Object.assign({}, earnedBadges));
        if (result.newBadges.length > 0) {
          var latest = result.newBadges[result.newBadges.length - 1];
          upd({ earnedBadges: result.badges, lastBadgeNotification: latest });
          if (addToast) addToast(latest.icon + ' Achievement: ' + latest.name + ' \u2014 ' + latest.desc, 'success');
          if (typeof awardXP === 'function') awardXP('geometryWorld', 10, 'Badge: ' + latest.name);
          // Auto-dismiss after 4 seconds
          setTimeout(function() { upd('lastBadgeNotification', null); }, 4000);
        }
      }

      // ── Collaborative / Peer Worlds state ──
      var showPeerWorlds = d.showPeerWorlds || false;
      var peerWorldsList = d.peerWorldsList || [];
      var collabMode = d.collabMode || false;
      var collabPlayers = d.collabPlayers || {};
      var collabUnsubscribe = d.collabUnsubscribe || null;

      // ── Firebase helpers (for Peer Worlds + Collaborative Mode) ──
      var sessionCode = ctx.activeSessionCode || null;
      var playerName = ctx.studentNickname || 'Builder';
      var isTeacher = ctx.isTeacherMode || false;
      var fb = window.__alloFirebase || {};
      var shared = window.__alloShared || {};
      var fbDb = shared.db || null;
      var fbAppId = shared.appId || null;

      // Get session document reference (if in a live session)
      function getSessionRef() {
        if (!fbDb || !fbAppId || !sessionCode || !fb.doc) return null;
        return fb.doc(fbDb, 'artifacts', fbAppId, 'public', 'data', 'sessions', sessionCode);
      }

      // ── Peer Worlds: Share a world to the class library ──
      function shareWorldToClass(worldData) {
        var ref = getSessionRef();
        if (!ref || !fb.updateDoc) {
          if (addToast) addToast('Join a live session first to share worlds!', 'error');
          return;
        }
        var entry = {
          title: worldData.title || 'Untitled World',
          author: playerName,
          timestamp: new Date().toISOString(),
          data: JSON.stringify(worldData)
        };
        // Read current array, append, write back (arrayUnion not available)
        fb.getDoc(ref).then(function(snap) {
          var existing = snap.exists() ? (snap.data().sharedGeometryWorlds || []) : [];
          existing.push(entry);
          return fb.updateDoc(ref, { sharedGeometryWorlds: existing });
        }).then(function() {
          if (addToast) addToast('\uD83C\uDF0D World shared to class library!', 'success');
          var eng = window[engineKey];
          if (eng && eng.logEvent) eng.logEvent('world_shared', { title: entry.title, author: entry.author });
        }).catch(function(err) {
          if (addToast) addToast('Share failed: ' + err.message, 'error');
        });
      }

      // ── Peer Worlds: Load class library ──
      function loadPeerWorlds() {
        var ref = getSessionRef();
        if (!ref || !fb.getDoc) {
          if (addToast) addToast('Join a live session first to browse class worlds!', 'error');
          return;
        }
        fb.getDoc(ref).then(function(snap) {
          if (snap.exists()) {
            var data = snap.data();
            var worlds = (data.sharedGeometryWorlds || []).map(function(w) {
              try { return { title: w.title, author: w.author, timestamp: w.timestamp, data: JSON.parse(w.data) }; }
              catch(e) { return null; }
            }).filter(Boolean);
            upd({ peerWorldsList: worlds, showPeerWorlds: true });
          } else {
            upd({ peerWorldsList: [], showPeerWorlds: true });
          }
        });
      }

      // ── Collaborative Mode: Start real-time sync ──
      function startCollabMode() {
        var ref = getSessionRef();
        if (!ref || !fb.onSnapshot || !fb.updateDoc) {
          if (addToast) addToast('Join a live session to collaborate!', 'error');
          return;
        }
        upd('collabMode', true);
        if (addToast) addToast('\uD83D\uDC65 Collaborative mode ON \u2014 building together!', 'success');

        // Register this player
        var playerPath = 'geometryWorldPlayers.' + playerName.replace(/[^a-zA-Z0-9_]/g, '_');
        var eng = window[engineKey];
        fb.updateDoc(ref, {
          [playerPath]: {
            name: playerName,
            joinedAt: new Date().toISOString(),
            position: eng ? [eng.camera.position.x, eng.camera.position.y, eng.camera.position.z] : [2, 3, 2],
            color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
          }
        });

        // Listen for block changes and player updates
        var unsub = fb.onSnapshot(ref, function(snap) {
          if (!snap.exists()) return;
          var sData = snap.data();

          // Sync peer players
          var players = sData.geometryWorldPlayers || {};
          upd('collabPlayers', players);

          // Sync shared blocks
          var sharedBlocks = sData.geometryWorldBlocks || null;
          if (sharedBlocks && eng) {
            try {
              var blockData = typeof sharedBlocks === 'string' ? JSON.parse(sharedBlocks) : sharedBlocks;
              // Only apply if this is a remote update (not our own)
              if (blockData._lastAuthor && blockData._lastAuthor !== playerName) {
                // Apply remote block changes
                (blockData.blocks || []).forEach(function(b) {
                  var key = b.x + ',' + b.y + ',' + b.z;
                  if (!eng.blocks[key]) {
                    eng.placeBlock(b.x, b.y, b.z, b.type || 'stone');
                  }
                });
                // Remove blocks that are no longer in the shared state
                var sharedKeys = {};
                (blockData.blocks || []).forEach(function(b) { sharedKeys[b.x + ',' + b.y + ',' + b.z] = true; });
                Object.keys(eng.blocks).forEach(function(key) {
                  var m = eng.blocks[key];
                  if (m && m.userData && m.userData.blockType !== 'grass' && !sharedKeys[key]) {
                    var p = key.split(',');
                    eng.removeBlock(parseInt(p[0]), parseInt(p[1]), parseInt(p[2]));
                  }
                });
              }
            } catch(e) { /* ignore parse errors */ }
          }
        });
        upd('collabUnsubscribe', unsub);

        // Sync player position every 2 seconds
        var posInterval = setInterval(function() {
          var eng2 = window[engineKey];
          var ref2 = getSessionRef();
          if (!eng2 || !ref2 || !fb.updateDoc) { clearInterval(posInterval); return; }
          var pPath = 'geometryWorldPlayers.' + playerName.replace(/[^a-zA-Z0-9_]/g, '_') + '.position';
          fb.updateDoc(ref2, {
            [pPath]: [
              Math.round(eng2.camera.position.x * 10) / 10,
              Math.round(eng2.camera.position.y * 10) / 10,
              Math.round(eng2.camera.position.z * 10) / 10
            ]
          }).catch(function() {});
        }, 2000);

        // Store interval ref for cleanup
        if (eng) eng._collabPosInterval = posInterval;
      }

      // ── Collaborative Mode: Push block changes to Firestore ──
      function syncBlocksToFirestore() {
        if (!collabMode) return;
        var ref = getSessionRef();
        var eng = window[engineKey];
        if (!ref || !eng || !fb.updateDoc) return;
        var blocks = [];
        Object.keys(eng.blocks).forEach(function(key) {
          var m = eng.blocks[key];
          if (m && m.userData && m.userData.gridPos && m.userData.blockType !== 'grass') {
            blocks.push({ x: m.userData.gridPos.x, y: m.userData.gridPos.y, z: m.userData.gridPos.z, type: m.userData.blockType });
          }
        });
        fb.updateDoc(ref, {
          geometryWorldBlocks: JSON.stringify({ blocks: blocks, _lastAuthor: playerName, _ts: Date.now() })
        }).catch(function() {});
      }

      // ── Growth Mindset Micro-Interventions (SEL + Academic Integration) ──
      var GROWTH_NUDGES = [
        { threshold: 2, msg: "Two tries and counting \u2014 that\u2019s not failure, that\u2019s learning! Your brain grows stronger every time you try a new strategy.", icon: '\uD83E\uDDE0' },
        { threshold: 3, msg: "Three attempts means you\u2019re in the \u201Cyet\u201D zone \u2014 you don\u2019t know this YET, but your brain is building new connections right now.", icon: '\uD83C\uDF31' },
        { threshold: 4, msg: "Scientists and mathematicians get things wrong all the time \u2014 that\u2019s how discoveries happen. Try measuring the structure again \u2014 count the blocks in each direction.", icon: '\uD83D\uDD2C' },
        { threshold: 5, msg: "You\u2019re showing real persistence! That\u2019s one of the most important skills in math. Want to try a different NPC\u2019s question first and come back to this one?", icon: '\uD83D\uDCAA' }
      ];

      function checkFrustration(wrongCount) {
        var nudge = null;
        for (var i = GROWTH_NUDGES.length - 1; i >= 0; i--) {
          if (wrongCount >= GROWTH_NUDGES[i].threshold && wrongCount <= GROWTH_NUDGES[i].threshold + 1) {
            nudge = GROWTH_NUDGES[i];
            break;
          }
        }
        if (nudge && wrongCount > growthNudgeDismissed) {
          upd({ showGrowthNudge: true, growthNudgeMsg: nudge.icon + ' ' + nudge.msg, growthNudgeDismissed: wrongCount });
        }
      }

      // Check for rapid block break cycles (behavioral frustration signal)
      function checkBreakFrustration() {
        var eng = window[engineKey];
        if (!eng || !eng.sessionLog) return;
        var now = Date.now() - (eng.sessionStart || Date.now());
        var recentBreaks = eng.sessionLog.filter(function(e) {
          return e.type === 'block_remove' && (now - e.timestamp) < 10000; // last 10 seconds
        });
        if (recentBreaks.length >= 8 && (now / 1000) > 30) {
          // 8+ breaks in 10 seconds after 30s of play = likely frustration
          var msg = '\uD83D\uDE0C It looks like you\u2019re tearing things down. That\u2019s okay \u2014 sometimes we need to start fresh! Try pressing M to measure a structure before breaking it. You might discover something cool.';
          if (!showGrowthNudge) {
            upd({ showGrowthNudge: true, growthNudgeMsg: msg });
          }
        }
      }

      // ── Engine refs (stored on window to persist across renders) ──
      var engineKey = '__geoWorldEngine';

      // ── Initialize 3D engine ──
      function initEngine(container) {
        if (!window.THREE || !container || window[engineKey] || window[engineKey + '_failed']) return;
        try {
        var THREE = window.THREE;

        var engine = {};
        engine.blocks = {};
        engine.npcs = [];
        engine.scene = new THREE.Scene();
        engine.scene.background = new THREE.Color(0x87CEEB);
        engine.scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

        engine.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 200);
        engine.camera.position.set(2, 3, 2);

        var cnv = document.createElement('canvas');
        cnv.style.width = '100%';
        cnv.style.height = '100%';
        container.appendChild(cnv);
        engine.renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true, powerPreference: 'high-performance' });
        engine.renderer.setSize(container.clientWidth, container.clientHeight);
        engine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
        engine.renderer.shadowMap.enabled = true;
        engine.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        engine.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        engine.renderer.toneMappingExposure = 1.1;
        engine.renderer.outputColorSpace = THREE.SRGBColorSpace || engine.renderer.outputEncoding;

        // Lighting — warm, balanced, voxel-world style
        engine.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        var sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
        sun.position.set(20, 40, 20);
        sun.castShadow = true;
        var shadowRes = isMobile ? 1024 : 2048; // Lower shadow quality on mobile
        sun.shadow.mapSize.set(shadowRes, shadowRes);
        sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 100;
        sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
        sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
        sun.shadow.bias = -0.0005;
        sun.shadow.normalBias = 0.02;
        engine.sun = sun;
        engine.scene.add(sun);
        var hemi = new THREE.HemisphereLight(0x87CEEB, 0x4CAF50, 0.35);
        engine.scene.add(hemi);
        // Soft rim light from behind for depth
        var rim = new THREE.DirectionalLight(0xc0d8ff, 0.25);
        rim.position.set(-15, 20, -15);
        engine.scene.add(rim);

        // ── Sky atmosphere: sun disc + drifting clouds ──
        (function initSky() {
          // Sun disc — bright sprite in the sky
          var sunCanvas = document.createElement('canvas'); sunCanvas.width = 128; sunCanvas.height = 128;
          var sctx = sunCanvas.getContext('2d');
          var grad = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, 'rgba(255,250,220,1)');
          grad.addColorStop(0.3, 'rgba(255,240,180,0.8)');
          grad.addColorStop(0.7, 'rgba(255,220,100,0.2)');
          grad.addColorStop(1, 'rgba(255,200,50,0)');
          sctx.fillStyle = grad; sctx.fillRect(0, 0, 128, 128);
          var sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sunCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
          sunSprite.scale.set(12, 12, 1);
          sunSprite.position.set(20, 45, 20);
          engine.scene.add(sunSprite);
          engine._sunSprite = sunSprite;

          // Cloud plane — a large flat plane with procedural cloud texture, slowly drifting
          var cloudCanvas = document.createElement('canvas'); cloudCanvas.width = 512; cloudCanvas.height = 512;
          var cctx = cloudCanvas.getContext('2d');
          cctx.clearRect(0, 0, 512, 512);
          // Paint blotchy clouds
          for (var ci = 0; ci < 40; ci++) {
            var cx2 = Math.random() * 512, cy2 = Math.random() * 512;
            var cr = 30 + Math.random() * 60;
            var cgrad = cctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cr);
            cgrad.addColorStop(0, 'rgba(255,255,255,' + (0.25 + Math.random() * 0.2) + ')');
            cgrad.addColorStop(1, 'rgba(255,255,255,0)');
            cctx.fillStyle = cgrad;
            cctx.fillRect(cx2 - cr, cy2 - cr, cr * 2, cr * 2);
          }
          var cloudTex = new THREE.CanvasTexture(cloudCanvas);
          cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping;
          var cloudGeo = new THREE.PlaneGeometry(200, 200);
          var cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
          var cloudPlane = new THREE.Mesh(cloudGeo, cloudMat);
          cloudPlane.rotation.x = -Math.PI / 2;
          cloudPlane.position.y = 40;
          engine.scene.add(cloudPlane);
          engine._cloudPlane = cloudPlane;
          engine._cloudTex = cloudTex;
        })();

        engine.raycaster = new THREE.Raycaster();
        engine.raycaster.far = 8;
        engine.clock = new THREE.Clock();
        engine.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        engine.moveState = { forward: false, backward: false, left: false, right: false, sprint: false };
        engine.velocity = new THREE.Vector3();
        engine.onGround = false;
        engine.isLocked = false;
        engine._wasOnGround = true; // for land detection
        engine._footstepTimer = 0;
        engine.flyMode = false; // toggled with F key

        // ── Procedural textures ──
        var _procTexCache = {};
        function makeGrassTexture() {
          if (_procTexCache.grass) return _procTexCache.grass;
          var c = document.createElement('canvas'); c.width = 64; c.height = 64;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, 0, 64, 64);
          // Add noise dots for organic feel
          for (var i = 0; i < 200; i++) {
            var gx = Math.random() * 64, gy = Math.random() * 64;
            var shade = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
            ctx.fillStyle = shade;
            ctx.fillRect(gx, gy, 1 + Math.random() * 2, 1 + Math.random() * 2);
          }
          // Add a few darker "grass blade" strokes
          ctx.strokeStyle = 'rgba(56,142,60,0.3)'; ctx.lineWidth = 1;
          for (var j = 0; j < 15; j++) {
            var sx = Math.random() * 64, sy = Math.random() * 64;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (Math.random() - 0.5) * 6, sy - 2 - Math.random() * 4); ctx.stroke();
          }
          var tex = new THREE.CanvasTexture(c);
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          _procTexCache.grass = tex;
          return tex;
        }
        function makeBrickTexture() {
          if (_procTexCache.brick) return _procTexCache.brick;
          var c = document.createElement('canvas'); c.width = 64; c.height = 64;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#B71C1C'; ctx.fillRect(0, 0, 64, 64);
          ctx.strokeStyle = 'rgba(100,50,30,0.6)'; ctx.lineWidth = 2;
          // Horizontal mortar lines
          for (var r = 0; r < 4; r++) {
            var ry = r * 16;
            ctx.strokeRect(0, ry, 64, 16);
            // Vertical mortar — offset every other row
            var offset = (r % 2 === 0) ? 0 : 16;
            for (var bx = offset; bx < 64; bx += 32) {
              ctx.beginPath(); ctx.moveTo(bx, ry); ctx.lineTo(bx, ry + 16); ctx.stroke();
            }
          }
          // Noise for roughness
          for (var n = 0; n < 80; n++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
            ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
          }
          var tex = new THREE.CanvasTexture(c);
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          _procTexCache.brick = tex;
          return tex;
        }

        function makeWoodTexture() {
          if (_procTexCache.wood) return _procTexCache.wood;
          var c = document.createElement('canvas'); c.width = 64; c.height = 64;
          var ctx = c.getContext('2d');
          // Base wood color
          ctx.fillStyle = '#8D6E63'; ctx.fillRect(0, 0, 64, 64);
          // Wood grain lines (horizontal, slightly curved)
          ctx.strokeStyle = 'rgba(90,50,30,0.35)'; ctx.lineWidth = 1;
          for (var g = 0; g < 12; g++) {
            var gy = g * 5.5 + Math.random() * 2;
            ctx.beginPath(); ctx.moveTo(0, gy);
            ctx.bezierCurveTo(16, gy + Math.random() * 3 - 1.5, 48, gy + Math.random() * 3 - 1.5, 64, gy + Math.random() * 2 - 1);
            ctx.stroke();
          }
          // Knot (occasional dark oval)
          if (Math.random() > 0.5) {
            ctx.fillStyle = 'rgba(70,40,20,0.4)';
            ctx.beginPath(); ctx.ellipse(20 + Math.random() * 24, 20 + Math.random() * 24, 4, 6, Math.random(), 0, Math.PI * 2); ctx.fill();
          }
          // Subtle noise
          for (var n = 0; n < 60; n++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.04)' : 'rgba(255,200,150,0.04)';
            ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
          }
          var tex = new THREE.CanvasTexture(c);
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          _procTexCache.wood = tex;
          return tex;
        }

        function makeSandTexture() {
          if (_procTexCache.sand) return _procTexCache.sand;
          var c = document.createElement('canvas'); c.width = 64; c.height = 64;
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#F5DEB3'; ctx.fillRect(0, 0, 64, 64);
          // Sand ripple lines (gentle curves)
          ctx.strokeStyle = 'rgba(180,150,100,0.25)'; ctx.lineWidth = 1;
          for (var r = 0; r < 8; r++) {
            var ry = r * 8 + Math.random() * 3;
            ctx.beginPath(); ctx.moveTo(0, ry);
            ctx.quadraticCurveTo(32, ry + 2 + Math.random() * 3, 64, ry + Math.random() * 2);
            ctx.stroke();
          }
          // Sand grains (scattered dots)
          for (var n = 0; n < 120; n++) {
            var brightness = 0.7 + Math.random() * 0.3;
            ctx.fillStyle = 'rgba(' + Math.round(200 * brightness) + ',' + Math.round(170 * brightness) + ',' + Math.round(120 * brightness) + ',0.3)';
            ctx.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random(), 1 + Math.random());
          }
          var tex = new THREE.CanvasTexture(c);
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          _procTexCache.sand = tex;
          return tex;
        }

        // Block material cache — avoids creating duplicate materials per type
        engine._matCache = {};
        function getBlockMaterial(type) {
          if (engine._matCache[type]) return engine._matCache[type].clone();
          var color = getBlockColor(type);
          var mat;
          if (type === 'glass') {
            mat = new THREE.MeshPhysicalMaterial({ color: color, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.0, transmission: 0.8, thickness: 0.2, side: THREE.DoubleSide });
          } else if (type === 'diamond') {
            mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.15, metalness: 0.35, envMapIntensity: 1.2 });
          } else if (type === 'gold') {
            mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.7 });
          } else if (type === 'wood') {
            mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeWoodTexture(), roughness: 0.85, metalness: 0.0 });
          } else if (type === 'sand') {
            mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeSandTexture(), roughness: 0.95, metalness: 0.0 });
          } else if (type === 'water') {
            mat = new THREE.MeshPhysicalMaterial({ color: color, transparent: true, opacity: 0.45, roughness: 0.0, metalness: 0.1, transmission: 0.6, thickness: 0.5, side: THREE.DoubleSide });
          } else if (type === 'ice') {
            mat = new THREE.MeshPhysicalMaterial({ color: color, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.05, transmission: 0.5, thickness: 0.3 });
          } else if (type === 'brick') {
            mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeBrickTexture(), roughness: 0.85, metalness: 0.0 });
          } else if (type === 'lava') {
            mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.1, emissive: 0xFF3D00, emissiveIntensity: 0.6 });
          } else if (type === 'torch') {
            mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.0, emissive: 0xFFAB00, emissiveIntensity: 0.9 });
          } else if (type === 'grass') {
            mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: makeGrassTexture(), roughness: 0.8, metalness: 0.0 });
          } else {
            mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7, metalness: 0.05 });
          }
          engine._matCache[type] = mat;
          return mat.clone();
        }

        // Block edge wireframe overlay for visual crispness
        var _edgeMatCache = {};
        function addBlockEdges(mesh, shapeId) {
          if (!_edgeMatCache[shapeId]) _edgeMatCache[shapeId] = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08, linewidth: 1 });
          var edges = new THREE.EdgesGeometry(mesh.geometry, 30);
          var line = new THREE.LineSegments(edges, _edgeMatCache[shapeId]);
          mesh.add(line);
        }

        // ── Undo / Redo system ──
        engine._undoStack = []; // { action: 'place'|'remove', x, y, z, type, shape }
        engine._redoStack = [];

        // ── Return to Spawn: teleport player back to lesson spawn point ──
        engine.returnToSpawn = function() {
          var sp = (engine._currentLesson && engine._currentLesson.spawnPoint) || [0, 2, 0];
          engine.camera.position.set(sp[0], sp[1] + 1.7, sp[2]);
          engine.velocity.set(0, 0, 0);
          engine.yaw = 0; engine.pitch = 0;
        };

        // ── Clear My Blocks: remove only student-placed blocks (preserves lesson structures) ──
        engine.clearPlayerBlocks = function() {
          var cleared = 0;
          Object.keys(engine.blocks).forEach(function(key) {
            var mesh = engine.blocks[key];
            if (mesh && mesh.userData && !mesh.userData._lessonBlock) {
              var p = key.split(',').map(Number);
              engine.removeBlock(p[0], p[1], p[2], true);
              cleared++;
            }
          });
          // Reset counter + clear undo history (confusing after bulk clear)
          engine.blocksPlaced = 0;
          engine._undoStack = [];
          engine._redoStack = [];
          return cleared;
        };
        var MAX_UNDO = 200;
        function pushUndo(action) {
          engine._undoStack.push(action);
          if (engine._undoStack.length > MAX_UNDO) engine._undoStack.shift();
          engine._redoStack = []; // clear redo on new action
        }
        engine.undo = function() {
          if (engine._undoStack.length === 0) return;
          var a = engine._undoStack.pop();
          if (a.action === 'place') {
            // Undo a placement = remove the block (no particles)
            var key = a.x + ',' + a.y + ',' + a.z;
            var mesh = engine.blocks[key];
            if (mesh) {
              engine.scene.remove(mesh);
              if (mesh.children) mesh.children.forEach(function(c) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
              mesh.geometry.dispose(); mesh.material.dispose();
              delete engine.blocks[key];
            }
          } else if (a.action === 'remove') {
            // Undo a removal = re-place the block
            engine.placeBlock(a.x, a.y, a.z, a.type, a.shape);
            // Pop the undo entry that placeBlock just added (avoid double-entry)
            engine._undoStack.pop();
          }
          engine._redoStack.push(a);
        };
        engine.redo = function() {
          if (engine._redoStack.length === 0) return;
          var a = engine._redoStack.pop();
          if (a.action === 'place') {
            engine.placeBlock(a.x, a.y, a.z, a.type, a.shape);
            // Pop the undo that placeBlock added (we manage it ourselves)
            engine._undoStack.pop();
          } else if (a.action === 'remove') {
            var key = a.x + ',' + a.y + ',' + a.z;
            var mesh = engine.blocks[key];
            if (mesh) {
              engine.scene.remove(mesh);
              if (mesh.children) mesh.children.forEach(function(c) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
              mesh.geometry.dispose(); mesh.material.dispose();
              delete engine.blocks[key];
            }
          }
          engine._undoStack.push(a);
        };

        // Block operations
        engine.placeBlock = function(x, y, z, type, shape, rotation) {
          var key = x + ',' + y + ',' + z;
          if (engine.blocks[key]) return;
          var shapeId = shape || 'cube';
          var rot = rotation || 0; // 0-3 = 0°, 90°, 180°, 270°
          var geo = createShapeGeometry(shapeId);
          var mat = getBlockMaterial(type);
          var mesh = new THREE.Mesh(geo, mat);
          // Position: cubes center at +0.5, half-slabs sit on the ground
          if (shapeId === 'halfB') {
            mesh.position.set(x + 0.5, y + 0.25, z + 0.5);
          } else if (shapeId === 'halfA' || shapeId === 'quarter') {
            mesh.position.set(x + 0.5, y, z + 0.5); // center for rotation
          } else {
            mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
          }
          // Apply rotation (Y-axis, 90° increments) for non-cube shapes
          if (rot > 0 && shapeId !== 'cube') {
            mesh.rotation.y = rot * Math.PI / 2;
          }
          mesh.castShadow = true; mesh.receiveShadow = true;
          addBlockEdges(mesh, shapeId);
          var shapeDef = BLOCK_SHAPES.find(function(s) { return s.id === shapeId; }) || BLOCK_SHAPES[0];
          mesh.userData = { blockType: type, gridPos: { x: x, y: y, z: z }, shape: shapeId, volume: shapeDef.volume, rotation: rot, _lessonBlock: !!engine._placingLessonBlocks };
          engine.scene.add(mesh);
          engine.blocks[key] = mesh;
          pushUndo({ action: 'place', x: x, y: y, z: z, type: type, shape: shapeId });
          // Torch blocks emit a point light
          if (type === 'torch') {
            var tLight = new THREE.PointLight(0xFFAB00, 1.2, 8, 1.5);
            tLight.position.set(x + 0.5, y + 1.0, z + 0.5);
            tLight.castShadow = false; // perf: no shadow from torch lights
            engine.scene.add(tLight);
            mesh.userData._torchLight = tLight;
          }
        };

        engine.removeBlock = function(x, y, z, forceRemove) {
          var key = x + ',' + y + ',' + z;
          var mesh = engine.blocks[key];
          if (mesh) {
            // Lesson blocks (ground + structures) are indestructible unless force-removed (reset)
            if (mesh.userData._lessonBlock && !forceRemove) {
              // Visual feedback: flash the block red briefly
              if (mesh.material && mesh.material.emissive) {
                mesh.material.emissive.setHex(0xff0000);
                setTimeout(function() { try { mesh.material.emissive.setHex(0x000000); } catch(e) {} }, 200);
              }
              if (window._alloHaptic) window._alloHaptic('bump');
              return; // Block is protected
            }
            // Record type/shape for undo before destroying
            var removedType = mesh.userData.blockType || 'stone';
            var removedShape = mesh.userData.shape || 'cube';
            // Clean up torch light
            if (mesh.userData._torchLight) { engine.scene.remove(mesh.userData._torchLight); mesh.userData._torchLight.dispose(); }
            // Spawn break particles
            var bColor = mesh.material.color ? mesh.material.color.getHex() : 0x808080;
            spawnBreakParticles(engine, x + 0.5, y + 0.5, z + 0.5, bColor);
            engine.scene.remove(mesh);
            // Dispose children (edge wireframes)
            if (mesh.children) mesh.children.forEach(function(c) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
            mesh.geometry.dispose(); mesh.material.dispose();
            delete engine.blocks[key];
            pushUndo({ action: 'remove', x: x, y: y, z: z, type: removedType, shape: removedShape });
          }
        };

        // Break particle system — small cubes scatter on block break
        engine._particles = [];
        function spawnBreakParticles(eng, px, py, pz, color) {
          var THREE = window.THREE;
          if (!THREE) return;
          var count = 6;
          for (var i = 0; i < count; i++) {
            var size = 0.08 + Math.random() * 0.08;
            var geo = new THREE.BoxGeometry(size, size, size);
            var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true });
            var p = new THREE.Mesh(geo, mat);
            p.position.set(px + (Math.random() - 0.5) * 0.5, py + (Math.random() - 0.5) * 0.5, pz + (Math.random() - 0.5) * 0.5);
            p.userData._vel = new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 3);
            p.userData._life = 0.5 + Math.random() * 0.3;
            p.userData._age = 0;
            eng.scene.add(p);
            eng._particles.push(p);
          }
        }

        // Place sparkle — small bright particles burst outward on block place
        function spawnPlaceParticles(eng, px, py, pz) {
          var THREE = window.THREE;
          if (!THREE) return;
          for (var i = 0; i < 5; i++) {
            var size = 0.04 + Math.random() * 0.04;
            var geo = new THREE.BoxGeometry(size, size, size);
            var mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true });
            var sp = new THREE.Mesh(geo, mat);
            sp.position.set(px + (Math.random() - 0.5) * 0.6, py + (Math.random() - 0.5) * 0.6, pz + (Math.random() - 0.5) * 0.6);
            sp.userData._vel = new THREE.Vector3((Math.random() - 0.5) * 2, 0.5 + Math.random() * 2, (Math.random() - 0.5) * 2);
            sp.userData._life = 0.3 + Math.random() * 0.2;
            sp.userData._age = 0;
            eng.scene.add(sp);
            eng._particles.push(sp);
          }
        }

        engine.fillBlocks = function(x1, y1, z1, x2, y2, z2, type) {
          for (var x = Math.min(x1,x2); x <= Math.max(x1,x2); x++)
            for (var y = Math.min(y1,y2); y <= Math.max(y1,y2); y++)
              for (var z = Math.min(z1,z2); z <= Math.max(z1,z2); z++)
                engine.placeBlock(x, y, z, type);
        };

        engine.clearWorld = function() {
          Object.keys(engine.blocks).forEach(function(k) {
            var m = engine.blocks[k]; engine.scene.remove(m); m.geometry.dispose(); m.material.dispose();
          });
          engine.blocks = {};
          engine.npcs.forEach(function(n) {
            engine.scene.remove(n.body); engine.scene.remove(n.head); engine.scene.remove(n.label);
            if (n.prompt) engine.scene.remove(n.prompt);
            if (n._ring) engine.scene.remove(n._ring);
          });
          engine.npcs = [];
        };

        engine.createNPC = function(data) {
          var THREE = window.THREE;
          var npcColor = data.color || 0x7c3aed;

          // Body — slightly tapered cylinder for character feel
          var bodyMat = new THREE.MeshStandardMaterial({ color: npcColor, roughness: 0.5, metalness: 0.1 });
          var body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.32, 1.2, 12), bodyMat);
          body.position.set(data.position[0] + 0.5, data.position[1] + 0.6, data.position[2] + 0.5);
          body.castShadow = true;
          engine.scene.add(body);

          // Head — slightly larger with bevel feel
          var headMat = new THREE.MeshStandardMaterial({ color: 0xFFDBB4, roughness: 0.6, metalness: 0.0 });
          var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), headMat);
          head.position.set(data.position[0] + 0.5, data.position[1] + 1.5, data.position[2] + 0.5);
          head.castShadow = true;
          engine.scene.add(head);

          // Eyes — two small dark spheres
          var eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
          var eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
          eyeL.position.set(-0.1, 0.04, 0.24);
          head.add(eyeL);
          var eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
          eyeR.position.set(0.1, 0.04, 0.24);
          head.add(eyeR);

          // Name label — cleaner with rounded background
          var canvas2 = document.createElement('canvas'); canvas2.width = 256; canvas2.height = 64;
          var cx = canvas2.getContext('2d');
          cx.clearRect(0, 0, 256, 64);
          cx.fillStyle = 'rgba(15,23,42,0.8)';
          if (cx.roundRect) { cx.beginPath(); cx.roundRect(8, 4, 240, 56, 12); cx.fill(); } else { cx.fillRect(8, 4, 240, 56); }
          cx.fillStyle = '#fff'; cx.font = 'bold 22px sans-serif'; cx.textAlign = 'center'; cx.fillText(data.name, 128, 40);
          var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas2), transparent: true, depthTest: false }));
          sprite.scale.set(2.2, 0.55, 1);
          sprite.position.set(data.position[0] + 0.5, data.position[1] + 2.1, data.position[2] + 0.5);
          engine.scene.add(sprite);

          // "Press E" interaction prompt (hidden until player is near — managed in animate loop)
          var promptCanvas = document.createElement('canvas'); promptCanvas.width = 128; promptCanvas.height = 48;
          var pcx = promptCanvas.getContext('2d');
          pcx.clearRect(0, 0, 128, 48);
          pcx.fillStyle = 'rgba(124,58,237,0.85)';
          if (pcx.roundRect) { pcx.beginPath(); pcx.roundRect(4, 4, 120, 40, 8); pcx.fill(); } else { pcx.fillRect(4, 4, 120, 40); }
          pcx.fillStyle = '#fff'; pcx.font = 'bold 16px sans-serif'; pcx.textAlign = 'center'; pcx.fillText('Press E', 64, 30);
          var promptSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(promptCanvas), transparent: true, depthTest: false, opacity: 0 }));
          promptSprite.scale.set(1.2, 0.45, 1);
          promptSprite.position.set(data.position[0] + 0.5, data.position[1] + 2.5, data.position[2] + 0.5);
          engine.scene.add(promptSprite);

          // Floating question mark indicator (for NPCs with questions)
          var qMarkSprite = null;
          if (data.question) {
            var qCanvas = document.createElement('canvas'); qCanvas.width = 64; qCanvas.height = 64;
            var qcx = qCanvas.getContext('2d');
            // Glowing circle background
            var grd = qcx.createRadialGradient(32, 32, 8, 32, 32, 28);
            grd.addColorStop(0, 'rgba(251,191,36,0.9)'); grd.addColorStop(1, 'rgba(251,191,36,0)');
            qcx.fillStyle = grd; qcx.fillRect(0, 0, 64, 64);
            // Question mark
            qcx.fillStyle = '#fff'; qcx.font = 'bold 36px sans-serif'; qcx.textAlign = 'center'; qcx.textBaseline = 'middle';
            qcx.fillText('?', 32, 34);
            qMarkSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(qCanvas), transparent: true, depthTest: false }));
            qMarkSprite.scale.set(0.6, 0.6, 1);
            qMarkSprite.position.set(data.position[0] + 0.5, data.position[1] + 2.7, data.position[2] + 0.5);
            engine.scene.add(qMarkSprite);
          }

          // Eye white/iris for expressiveness
          var eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          eyeWhiteL.position.set(-0.1, 0.04, 0.22); head.add(eyeWhiteL);
          var eyeWhiteR = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          eyeWhiteR.position.set(0.1, 0.04, 0.22); head.add(eyeWhiteR);

          body.userData.isNPC = true; body.userData.npcIndex = engine.npcs.length;
          head.userData.isNPC = true; head.userData.npcIndex = engine.npcs.length;
          engine.npcs.push({ body: body, head: head, label: sprite, prompt: promptSprite, qMark: qMarkSprite, eyeL: eyeL, eyeR: eyeR, data: data });
        };

        engine.loadLesson = function(lesson) {
          if (engine.logEvent) engine.logEvent('lesson_load', { title: lesson.title || 'unknown', npcCount: (lesson.npcs || []).length, questionCount: (lesson.npcs || []).filter(function(n) { return n.question; }).length });
          engine._currentLesson = lesson; // remember for returnToSpawn
          engine.clearWorld();
          // Reset sky to daytime
          engine.scene.background.setRGB(0.53, 0.81, 0.92);
          engine.scene.fog.color.setRGB(0.53, 0.81, 0.92);
          engine.completionTriggered = false;
          engine.completionProgress = 0;
          engine.blocksPlaced = 0;
          if (engine.stars) { engine.scene.remove(engine.stars); engine.stars = null; engine.starsCreated = false; }
          if (engine.congratsSprite) { engine.scene.remove(engine.congratsSprite); engine.congratsSprite = null; engine.congratsCreated = false; }
          // Place ground and structures as indestructible lesson blocks
          engine._placingLessonBlocks = true;
          if (lesson.ground) {
            var g = lesson.ground;
            engine.fillBlocks(g.xMin, g.y, g.zMin, g.xMax, g.y, g.zMax, g.type || 'grass');
          }
          if (lesson.structures) lesson.structures.forEach(function(s) {
            if (s.type === 'fill') engine.fillBlocks(s.x1, s.y1, s.z1, s.x2, s.y2, s.z2, s.block);
          });
          engine._placingLessonBlocks = false;
          if (lesson.npcs) lesson.npcs.forEach(function(n) { engine.createNPC(n); });
          // Smooth camera entry — start high above spawn, swoop down
          if (lesson.spawnPoint) {
            var sp = lesson.spawnPoint;
            engine.camera.position.set(sp[0], sp[1] + 15, sp[2] - 8);
            engine.camera.lookAt(sp[0], sp[1], sp[2]);
            engine._entryAnim = { targetX: sp[0], targetY: sp[1], targetZ: sp[2], progress: 0 };
          }
          // Reset undo stacks on lesson load
          engine._undoStack = [];
          engine._redoStack = [];
          var totalQCount = (lesson.npcs || []).filter(function(n) { return n.question; }).length;
          // Restore saved progress for this lesson (if any)
          var progressKey = 'gw_progress_' + (lesson.title || 'untitled').replace(/\W+/g, '_').toLowerCase();
          var savedProgress = null;
          try { savedProgress = JSON.parse(localStorage.getItem(progressKey)); } catch(e) {}
          // Restore chat history from localStorage
          var savedChat = null;
          try { savedChat = JSON.parse(localStorage.getItem('gw_chat_' + (lesson._id || Object.keys(SAMPLE_LESSONS).find(function(k) { return SAMPLE_LESSONS[k] === lesson; }) || 'unknown'))); } catch(e) {}
          if (savedProgress && savedProgress.score > 0) {
            upd({ totalQ: totalQCount, score: savedProgress.score, answeredNpcs: savedProgress.answeredNpcs || {}, npcFollowUpStep: savedProgress.npcFollowUpStep || {}, npcChatHistory: savedChat || {}, worldActive: true });
            if (addToast) addToast('\uD83D\uDCBE Progress restored: ' + savedProgress.score + '/' + totalQCount, 'info');
          } else {
            upd({ totalQ: totalQCount, score: 0, answeredNpcs: {}, npcFollowUpStep: {}, npcChatHistory: savedChat || {}, worldActive: true });
          }
          engine._progressKey = progressKey;
        };

        // Measure connected blocks
        engine.measureStructure = function(startX, startY, startZ, blockType) {
          var visited = {}; var result = []; var queue = [{ x: startX, y: startY, z: startZ }];
          var totalVolume = 0;
          var shapeCounts = {};
          while (queue.length > 0 && result.length < 500) {
            var pos = queue.shift(); var key = pos.x + ',' + pos.y + ',' + pos.z;
            if (visited[key]) continue; visited[key] = true;
            var mesh = engine.blocks[key];
            if (!mesh || mesh.userData.blockType !== blockType) continue;
            result.push(pos);
            var vol = mesh.userData.volume || 1;
            totalVolume += vol;
            var shp = mesh.userData.shape || 'cube';
            shapeCounts[shp] = (shapeCounts[shp] || 0) + 1;
            [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(function(dir) {
              var nk = (pos.x+dir[0])+','+(pos.y+dir[1])+','+(pos.z+dir[2]);
              if (!visited[nk]) queue.push({ x: pos.x+dir[0], y: pos.y+dir[1], z: pos.z+dir[2] });
            });
          }
          if (result.length === 0) return null;
          var mnX=Infinity,mxX=-Infinity,mnY=Infinity,mxY=-Infinity,mnZ=Infinity,mxZ=-Infinity;
          result.forEach(function(b) { mnX=Math.min(mnX,b.x);mxX=Math.max(mxX,b.x);mnY=Math.min(mnY,b.y);mxY=Math.max(mxY,b.y);mnZ=Math.min(mnZ,b.z);mxZ=Math.max(mxZ,b.z); });
          return {
            count: result.length,
            L: mxX-mnX+1, W: mxZ-mnZ+1, H: mxY-mnY+1,
            minX: mnX, minY: mnY, minZ: mnZ,
            boundingVolume: (mxX-mnX+1)*(mxZ-mnZ+1)*(mxY-mnY+1),
            totalVolume: totalVolume,
            hasFractions: totalVolume !== Math.floor(totalVolume),
            shapeCounts: shapeCounts,
            formattedVolume: formatVolume(totalVolume),
            blocks: result // list of {x,y,z} for selection glow
          };
        };

        // ── 3D Dimension Lines — show L/W/H around measured structure ──
        engine._dimLines = [];
        function clearDimLines() {
          engine._dimLines.forEach(function(obj) { engine.scene.remove(obj); if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });
          engine._dimLines = [];
        }
        function makeDimLabel(text, color) {
          var THREE = window.THREE;
          var c = document.createElement('canvas'); c.width = 128; c.height = 48;
          var cx = c.getContext('2d');
          cx.clearRect(0, 0, 128, 48);
          cx.fillStyle = 'rgba(0,0,0,0.6)';
          cx.fillRect(4, 4, 120, 40);
          cx.fillStyle = color || '#fff'; cx.font = 'bold 20px monospace'; cx.textAlign = 'center';
          cx.fillText(text, 64, 32);
          var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
          spr.scale.set(1.6, 0.6, 1);
          return spr;
        }
        function showDimLines(m, startX, startY, startZ) {
          clearDimLines();
          var THREE = window.THREE; if (!THREE) return;
          var x0 = startX, y0 = startY, z0 = startZ;
          var x1 = x0 + m.L, y1 = y0 + m.H, z1 = z0 + m.W;
          engine._measureCenter = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2 };

          function dimLine(ax, ay, az, bx, by, bz, color) {
            var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.85, linewidth: 2 });
            var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)]);
            var line = new THREE.LineSegments(geo, mat);
            engine.scene.add(line); engine._dimLines.push(line);
          }

          // ── Sequential formula buildup (L, then W, then H, then V) ──
          // Step 1 (immediate): Length line + label
          dimLine(x0, y0, z0, x1, y0, z0, 0xef4444);
          var lbl = makeDimLabel('L=' + m.L, '#ef4444');
          lbl.position.set((x0 + x1) / 2, y0 - 0.4, z0);
          engine.scene.add(lbl); engine._dimLines.push(lbl);

          // Step 2 (after 0.8s): Width line + label
          setTimeout(function() {
            if (!engine || !engine.scene || !window.THREE) return;
            dimLine(x0, y0, z0, x0, y0, z1, 0x3b82f6);
            var wbl = makeDimLabel('W=' + m.W, '#3b82f6');
            wbl.position.set(x0 - 0.5, y0 - 0.4, (z0 + z1) / 2);
            engine.scene.add(wbl); engine._dimLines.push(wbl);
          }, 800);

          // Step 3 (after 1.6s): Height line + label
          setTimeout(function() {
            if (!engine || !engine.scene || !window.THREE) return;
            dimLine(x0, y0, z0, x0, y1, z0, 0x22c55e);
            var hbl = makeDimLabel('H=' + m.H, '#22c55e');
            hbl.position.set(x0 - 0.5, (y0 + y1) / 2, z0);
            engine.scene.add(hbl); engine._dimLines.push(hbl);
          }, 1600);

          // Step 4 (after 2.4s): Volume label + bounding box
          setTimeout(function() {
            if (!engine || !engine.scene || !window.THREE) return;
            var volStr = m.L + '\u00d7' + m.W + '\u00d7' + m.H + '=' + (m.hasFractions ? m.formattedVolume : m.boundingVolume);
            var vbl = makeDimLabel(volStr, '#fbbf24');
            vbl.position.set((x0 + x1) / 2, y1 + 0.6, (z0 + z1) / 2);
            vbl.scale.set(2.4, 0.75, 1);
            engine.scene.add(vbl); engine._dimLines.push(vbl);
            // Bounding box wireframe
            var bbGeo = new THREE.BoxGeometry(m.L, m.H, m.W);
            var bbEdges = new THREE.EdgesGeometry(bbGeo);
            var bbMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.4 });
            var bbLine = new THREE.LineSegments(bbEdges, bbMat);
            bbLine.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
            engine.scene.add(bbLine); engine._dimLines.push(bbLine);
          }, 2400);

          // Persistent: clear on re-measure, distance >20, or after 30 seconds
          if (engine._dimTimer) clearTimeout(engine._dimTimer);
          engine._dimTimer = setTimeout(clearDimLines, 30000);
        }

        // ── Structure selection glow — briefly highlight all measured blocks ──
        engine._selectionGlows = [];
        function clearSelectionGlow() {
          engine._selectionGlows.forEach(function(g) { engine.scene.remove(g); g.geometry.dispose(); g.material.dispose(); });
          engine._selectionGlows = [];
        }
        function showSelectionGlow(blocks) {
          clearSelectionGlow();
          var THREE = window.THREE; if (!THREE) return;

          // Group blocks by Y layer for sequential reveal (bottom to top)
          var layers = {};
          blocks.forEach(function(b) {
            var ly = b.y;
            if (!layers[ly]) layers[ly] = [];
            layers[ly].push(b);
          });
          var sortedYs = Object.keys(layers).map(Number).sort(function(a, b) { return a - b; });

          // Animate: reveal one layer every 400ms
          var colors = [0xef4444, 0xf59e0b, 0x22c55e, 0x3b82f6, 0x7c3aed, 0xec4899];
          sortedYs.forEach(function(ly, layerIdx) {
            setTimeout(function() {
              if (!engine || !engine.scene || !window.THREE) return;
              var layerColor = colors[layerIdx % colors.length];
              var glowMat = new THREE.MeshBasicMaterial({ color: layerColor, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
              layers[ly].forEach(function(b) {
                var gMesh = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), glowMat.clone());
                gMesh.position.set(b.x + 0.5, b.y + 0.5, b.z + 0.5);
                gMesh.renderOrder = 997;
                engine.scene.add(gMesh);
                engine._selectionGlows.push(gMesh);
              });
            }, layerIdx * 400);
          });

          // Fade out after dimension lines clear (25 seconds)
          setTimeout(function() {
            var fadeInterval = setInterval(function() {
              var allGone = true;
              engine._selectionGlows.forEach(function(g) {
                if (g.material.opacity > 0.01) { g.material.opacity -= 0.015; allGone = false; }
              });
              if (allGone) { clearSelectionGlow(); clearInterval(fadeInterval); }
            }, 50);
          }, 25000);
        }

        // Input handlers
        var canvas = engine.renderer.domElement;
        canvas.addEventListener('click', function() { if (!engine.isLocked) canvas.requestPointerLock(); });
        document.addEventListener('pointerlockchange', function() {
          engine.isLocked = !!document.pointerLockElement;
          if (engine.isLocked) { startAmbientWind(); if (tutorialStep === 0 && !tutorialDismissed) upd('tutorialStep', 1); }
        });

        // Smooth mouse look with configurable sensitivity
        var MOUSE_SENSITIVITY = 0.0018;
        document.addEventListener('mousemove', function(ev) {
          if (!engine.isLocked) return;
          engine.euler.setFromQuaternion(engine.camera.quaternion);
          engine.euler.y -= ev.movementX * MOUSE_SENSITIVITY;
          engine.euler.x -= ev.movementY * MOUSE_SENSITIVITY;
          engine.euler.x = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, engine.euler.x));
          engine.camera.quaternion.setFromEuler(engine.euler);
        });

        document.addEventListener('keydown', function(ev) {
          switch (ev.code) {
            case 'Escape':
              // Shift+Esc: close every open overlay at once and return to game
              if (ev.shiftKey) {
                var d2 = (labToolData && labToolData.geometryWorld) || {};
                var anyOpen = d2.showNpcDialog || d2.showMyLessons || d2.showLessonEditor || d2.showLessonIntro || d2.showReflection || d2.showHelp || d2.showCreatorPanel || d2.showGrowthNudge || d2.showTeacherView || d2.showPeerWorlds;
                if (anyOpen) {
                  ev.preventDefault();
                  upd({ showNpcDialog: false, showMyLessons: false, showLessonEditor: false, showLessonIntro: false, showReflection: false, showHelp: false, showCreatorPanel: false, showGrowthNudge: false, showTeacherView: false, showPeerWorlds: false });
                  if (addToast) addToast('🎮 All overlays closed — back in the game', 'info');
                }
                break;
              }
              // Plain Esc: close the top-priority open dialog/overlay one at a time
              if (showNpcDialog) { upd('showNpcDialog', false); break; }
              if (showHelp) { upd('showHelp', false); break; }
              if (showGrowthNudge) { upd('showGrowthNudge', false); break; }
              if (showPeerWorlds) { upd('showPeerWorlds', false); break; }
              if (showTeacherView) { upd('showTeacherView', false); break; }
              if (showMyLessons) { upd('showMyLessons', false); break; }
              if (showLessonEditor) { upd('showLessonEditor', false); break; }
              if (showLessonIntro) { upd('showLessonIntro', false); break; }
              if (showReflection) { upd('showReflection', false); break; }
              if (showCreatorPanel) { upd('showCreatorPanel', false); break; }
              if (creatorMode) { upd('creatorMode', false); break; }
              break;
            case 'KeyW': engine.moveState.forward = true; break;
            case 'KeyS': engine.moveState.backward = true; break;
            case 'KeyA': engine.moveState.left = true; break;
            case 'KeyD': engine.moveState.right = true; break;
            case 'Space':
              ev.preventDefault();
              // Ignore OS key-repeat: without this the double-tap-to-fly check fires
              // ~33ms after the initial press, silently toggling fly mode while the
              // user just holds Space to jump.
              if (ev.repeat) {
                if (engine.flyMode) engine.moveState.flyUp = true;
                break;
              }
              // Double-tap Space = toggle fly mode (like Minecraft creative)
              var now = Date.now();
              if (engine._lastSpaceTime && now - engine._lastSpaceTime < 300) {
                engine.flyMode = !engine.flyMode;
                engine.velocity.y = 0;
                if (addToast) addToast(engine.flyMode ? '\uD83D\uDD4A\uFE0F Fly mode ON (double-tap Space again to land)' : '\uD83D\uDC63 Walk mode', 'info');
                engine._lastSpaceTime = 0;
                break;
              }
              engine._lastSpaceTime = now;
              if (engine.flyMode) { engine.moveState.flyUp = true; }
              else if (engine.onGround && !engine._jumpLock) { engine.velocity.y = 6; sfxJump(); engine._jumpLock = true; }
              break;
            case 'KeyF':
              if (!ev.ctrlKey) {
                engine.flyMode = !engine.flyMode;
                engine.velocity.y = 0;
                if (addToast) addToast(engine.flyMode ? '\uD83D\uDD4A\uFE0F Fly mode ON' : '\uD83D\uDC63 Walk mode', 'info');
              }
              break;
            case 'KeyG':
              // Toggle grid floor
              if (engine._gridHelper) {
                engine.scene.remove(engine._gridHelper);
                engine._gridHelper.geometry.dispose(); engine._gridHelper.material.dispose();
                engine._gridHelper = null;
                if (addToast) addToast('Grid OFF', 'info');
              } else {
                var THREE2 = window.THREE;
                if (THREE2) {
                  engine._gridHelper = new THREE2.GridHelper(60, 60, 0x444466, 0x333355);
                  engine._gridHelper.position.y = 1.01; // just above ground blocks
                  engine._gridHelper.material.transparent = true;
                  engine._gridHelper.material.opacity = 0.35;
                  engine.scene.add(engine._gridHelper);
                  if (addToast) addToast('\uD83D\uDCCF Grid ON', 'info');
                }
              }
              break;
            case 'KeyE':
              var minD = 4, nearest = -1;
              engine.npcs.forEach(function(n, i) {
                var dist = engine.camera.position.distanceTo(n.body.position);
                if (dist < minD) { minD = dist; nearest = i; }
              });
              if (nearest >= 0) { if (document.pointerLockElement) document.exitPointerLock(); upd({ showNpcDialog: true, dialogNpcIdx: nearest, npcTypewriterPos: 0, npcTypewriterNpc: nearest }); sfxNpcChime(); if (tutorialStep === 1 && !tutorialDismissed) upd('tutorialStep', 2); }
              break;
            case 'KeyM':
              engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
              var hits = engine.raycaster.intersectObjects(Object.values(engine.blocks));
              if (hits.length > 0 && hits[0].object.userData.gridPos) {
                var gp = hits[0].object.userData.gridPos;
                var m = engine.measureStructure(gp.x, gp.y, gp.z, hits[0].object.userData.blockType);
                if (m) {
                  sfxMeasure();
                  // Save to measurement history (last 10)
                  var mh = (d.measureHistory || []).concat([{ L: m.L, W: m.W, H: m.H, vol: m.hasFractions ? m.formattedVolume : m.boundingVolume, blocks: m.count, t: Date.now() }]);
                  if (mh.length > 10) mh = mh.slice(-10);
                  upd({ measureResult: m, measureHistory: mh, actionFeedback: '\uD83D\uDCCF Measured: ' + m.L + '\u00d7' + m.W + '\u00d7' + m.H + ' = ' + (m.hasFractions ? m.formattedVolume : m.boundingVolume) });
                  setTimeout(function() { upd('actionFeedback', ''); }, 2500);
                  // Show 3D dimension lines + selection glow around the measured structure
                  if (engine._dimTimer) clearTimeout(engine._dimTimer);
                  showDimLines(m, m.minX, m.minY, m.minZ);
                  if (m.blocks) showSelectionGlow(m.blocks);
                  // Measurement sparkle particles at structure center
                  var mcx = m.minX + m.L / 2, mcy = m.minY + m.H / 2 + 0.5, mcz = m.minZ + m.W / 2;
                  for (var sp = 0; sp < 8; sp++) spawnPlaceParticles(engine, mcx + (Math.random() - 0.5) * m.L, mcy + (Math.random() - 0.5) * m.H, mcz + (Math.random() - 0.5) * m.W);
                  if (engine.logEvent) engine.logEvent('measurement', { L: m.L, W: m.W, H: m.H, volume: m.boundingVolume, blocks: m.count });
                  var mCount = (engine.sessionLog || []).filter(function(e) { return e.type === 'measurement'; }).length;
                  if (mCount <= 1 && typeof awardXP === 'function') awardXP('geometryWorld', 5, 'First measurement');
                  if (tutorialStep === 2 && !tutorialDismissed) upd('tutorialStep', 3);
                  setTimeout(runAchievementCheck, 100);
                }
              }
              break;
            case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': case 'Digit6': case 'Digit7': case 'Digit8': case 'Digit9':
              var bIdx = parseInt(ev.code.charAt(5)) - 1;
              if (bIdx >= 0 && bIdx < BLOCK_TYPES.length) upd('selectedBlock', bIdx);
              break;
            case 'Digit0':
              if (BLOCK_TYPES.length >= 10) upd('selectedBlock', 9);
              break;
            case 'KeyQ': // Cycle through shapes
              upd({ selectedShape: (selectedShape + 1) % BLOCK_SHAPES.length, blockRotation: 0 });
              upd('actionFeedback', 'Shape: ' + BLOCK_SHAPES[(selectedShape + 1) % BLOCK_SHAPES.length].name);
              setTimeout(function() { upd('actionFeedback', ''); }, 1200);
              break;
            case 'KeyR': // Rotate block 90° (for half/quarter shapes)
              var newRot = (blockRotation + 1) % 4;
              upd('blockRotation', newRot);
              upd('actionFeedback', 'Rotate: ' + (newRot * 90) + '\u00b0');
              setTimeout(function() { upd('actionFeedback', ''); }, 1200);
              break;
            case 'KeyT': // Point-to-point ruler: set point A, then point B
              engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
              var rHits = engine.raycaster.intersectObjects(Object.values(engine.blocks));
              if (rHits.length > 0 && rHits[0].point) {
                var rp = rHits[0].point;
                if (!engine._rulerA) {
                  // Set point A
                  engine._rulerA = rp.clone();
                  upd('actionFeedback', '\uD83D\uDCCF Ruler: Point A set \u2014 press T on second point');
                  setTimeout(function() { upd('actionFeedback', ''); }, 2000);
                } else {
                  // Set point B, draw line, show distance
                  var rA = engine._rulerA;
                  var rDist = rA.distanceTo(rp);
                  // Draw 3D line
                  if (engine._rulerLine) { engine.scene.remove(engine._rulerLine); engine._rulerLine.geometry.dispose(); engine._rulerLine.material.dispose(); }
                  if (engine._rulerLabel) { engine.scene.remove(engine._rulerLabel); }
                  var rGeo = new THREE.BufferGeometry().setFromPoints([rA, rp]);
                  var rMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8, linewidth: 2 });
                  engine._rulerLine = new THREE.LineSegments(rGeo, rMat);
                  engine.scene.add(engine._rulerLine);
                  // Distance label at midpoint
                  var rLabel = makeDimLabel(rDist.toFixed(1) + ' blocks', '#22d3ee');
                  rLabel.position.set((rA.x + rp.x) / 2, (rA.y + rp.y) / 2 + 0.5, (rA.z + rp.z) / 2);
                  rLabel.scale.set(2, 0.6, 1);
                  engine.scene.add(rLabel);
                  engine._rulerLabel = rLabel;
                  upd('actionFeedback', '\uD83D\uDCCF Distance: ' + rDist.toFixed(1) + ' blocks');
                  setTimeout(function() { upd('actionFeedback', ''); }, 3000);
                  // Auto-clear after 15s
                  setTimeout(function() {
                    if (engine._rulerLine) { engine.scene.remove(engine._rulerLine); engine._rulerLine.geometry.dispose(); engine._rulerLine.material.dispose(); engine._rulerLine = null; }
                    if (engine._rulerLabel) { engine.scene.remove(engine._rulerLabel); engine._rulerLabel = null; }
                  }, 15000);
                  engine._rulerA = null; // Reset for next measurement
                }
              } else if (engine._rulerA) {
                // Cancel ruler if no hit
                engine._rulerA = null;
                upd('actionFeedback', '\uD83D\uDCCF Ruler cancelled');
                setTimeout(function() { upd('actionFeedback', ''); }, 1200);
              }
              break;
            case 'ShiftLeft': case 'ShiftRight': engine.moveState.sprint = true; break;
            case 'KeyH':
              // H = return to spawn (home)
              if (!ev.ctrlKey && !ev.metaKey) {
                ev.preventDefault();
                if (engine.returnToSpawn) {
                  engine.returnToSpawn();
                  if (addToast) addToast('🏠 Teleported to spawn', 'info');
                }
              }
              break;
            case 'KeyZ':
              if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); engine.undo(); if (addToast) addToast('\u21A9\uFE0F Undo', 'info'); }
              break;
            case 'KeyY':
              if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); engine.redo(); if (addToast) addToast('\u21AA\uFE0F Redo', 'info'); }
              break;
          }
        });
        document.addEventListener('keyup', function(ev) {
          switch (ev.code) {
            case 'KeyW': engine.moveState.forward = false; break;
            case 'KeyS': engine.moveState.backward = false; break;
            case 'KeyA': engine.moveState.left = false; break;
            case 'KeyD': engine.moveState.right = false; break;
            case 'ShiftLeft': case 'ShiftRight': engine.moveState.sprint = false; break;
            case 'Space': engine._jumpLock = false; engine.moveState.flyUp = false; break;
          }
        });

        canvas.addEventListener('mousedown', function(ev) {
          if (!engine.isLocked) return;
          var THREE = window.THREE;
          engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
          var allMeshes = Object.values(engine.blocks).concat(engine.npcs.map(function(n) { return n.body; }));
          var hits = engine.raycaster.intersectObjects(allMeshes);
          if (hits.length > 0) {
            var hit = hits[0];
            if (hit.object.userData.isNPC) {
              if (document.pointerLockElement) document.exitPointerLock();
              upd({ showNpcDialog: true, dialogNpcIdx: hit.object.userData.npcIndex, npcTypewriterPos: 0, npcTypewriterNpc: hit.object.userData.npcIndex });
              sfxNpcChime();
              return;
            }
            if (ev.button === 0 && hit.object.userData.gridPos) {
              var p = hit.object.userData.gridPos;
              var breakType = hit.object.userData.blockType || 'stone';
              engine.removeBlock(p.x, p.y, p.z);
              sfxBreak(breakType); if (window._alloHaptic) window._alloHaptic('break');
              // Camera shake on break (subtle)
              engine._shakeUntil = engine.clock.getElapsedTime() + 0.15;
              engine._shakeIntensity = 0.03;
              engine.blocksPlaced = Math.max(0, (engine.blocksPlaced || 0) - 1);
              checkBreakFrustration();
              if (collabMode) { clearTimeout(engine._collabSyncTimer); engine._collabSyncTimer = setTimeout(syncBlocksToFirestore, 500); }
            } else if (ev.button === 2 && hit.object.userData.gridPos && hit.face) {
              // Block limit check
              if (Object.keys(engine.blocks).length >= MAX_BLOCKS) {
                if (addToast) addToast('\u26A0\uFE0F Block limit reached (' + MAX_BLOCKS + '). Remove blocks first!', 'error');
                return;
              }
              var p = hit.object.userData.gridPos;
              var n = hit.face.normal;
              var placeX = p.x + Math.round(n.x), placeY = p.y + Math.round(n.y), placeZ = p.z + Math.round(n.z);
              var placeType = BLOCK_TYPES[selectedBlock].id;
              engine.placeBlock(placeX, placeY, placeZ, placeType, BLOCK_SHAPES[selectedShape].id, blockRotation);
              sfxPlace(placeType); if (window._alloHaptic) window._alloHaptic('place');
              spawnPlaceParticles(engine, placeX + 0.5, placeY + 0.5, placeZ + 0.5);
              engine.blocksPlaced = (engine.blocksPlaced || 0) + 1;
              // First block ever — special celebration!
              if (engine.blocksPlaced === 1) {
                if (addToast) addToast('\uD83C\uDF89 Your first block! Keep building!', 'success');
                // Extra confetti burst
                var confColors = [0xfbbf24, 0x22c55e, 0x3b82f6, 0xa78bfa, 0xf472b6];
                for (var fi = 0; fi < 12; fi++) {
                  try {
                    var fGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
                    var fMat = new THREE.MeshBasicMaterial({ color: confColors[fi % confColors.length], transparent: true, opacity: 1 });
                    var fMesh = new THREE.Mesh(fGeo, fMat);
                    fMesh.position.set(placeX + 0.5 + (Math.random() - 0.5), placeY + 1, placeZ + 0.5 + (Math.random() - 0.5));
                    fMesh.userData._age = 0; fMesh.userData._life = 1.5 + Math.random();
                    fMesh.userData._vel = { x: (Math.random() - 0.5) * 3, y: 3 + Math.random() * 2, z: (Math.random() - 0.5) * 3 };
                    engine.scene.add(fMesh); engine._particles.push(fMesh);
                  } catch(e) {}
                }
              }
              if (engine.blocksPlaced === 10 && typeof awardXP === 'function') awardXP('geometryWorld', 5, '10 blocks placed');
              if (engine.blocksPlaced === 50 && typeof awardXP === 'function') awardXP('geometryWorld', 5, '50 blocks placed');
              if (tutorialStep === 3 && !tutorialDismissed) upd({ tutorialStep: 4, tutorialDismissed: true });
              if (collabMode) { clearTimeout(engine._collabSyncTimer); engine._collabSyncTimer = setTimeout(syncBlocksToFirestore, 500); }
            }
          }
        });

        canvas.addEventListener('contextmenu', function(ev) { ev.preventDefault(); });

        // Scroll-wheel to cycle through block types
        canvas.addEventListener('wheel', function(ev) {
          if (!engine.isLocked) return;
          ev.preventDefault();
          var dir = ev.deltaY > 0 ? 1 : -1;
          var newIdx = ((selectedBlock + dir) % BLOCK_TYPES.length + BLOCK_TYPES.length) % BLOCK_TYPES.length;
          upd('selectedBlock', newIdx);
        }, { passive: false });

        // ── Touch controls (mobile-friendly Minecraft-style) ──
        engine._touchActive = false;
        engine._touchLookId = null; // active touch ID for look (right side)
        engine._touchMoveId = null; // active touch ID for move (left side)
        engine._touchLookStart = null;
        engine._touchMoveStart = null;
        engine._touchMoveVec = { x: 0, z: 0 };

        canvas.addEventListener('touchstart', function(ev) {
          ev.preventDefault();
          engine._touchActive = true;
          engine.isLocked = true; // Treat touch as "locked" for rendering purposes
          for (var ti = 0; ti < ev.changedTouches.length; ti++) {
            var touch = ev.changedTouches[ti];
            var isLeftSide = touch.clientX < window.innerWidth / 2;
            if (isLeftSide && engine._touchMoveId === null) {
              engine._touchMoveId = touch.identifier;
              engine._touchMoveStart = { x: touch.clientX, y: touch.clientY };
            } else if (!isLeftSide && engine._touchLookId === null) {
              engine._touchLookId = touch.identifier;
              engine._touchLookStart = { x: touch.clientX, y: touch.clientY };
            }
          }
        }, { passive: false });

        canvas.addEventListener('touchmove', function(ev) {
          ev.preventDefault();
          for (var ti = 0; ti < ev.changedTouches.length; ti++) {
            var touch = ev.changedTouches[ti];
            if (touch.identifier === engine._touchLookId && engine._touchLookStart) {
              // Look: apply rotation from swipe delta
              var dx = touch.clientX - engine._touchLookStart.x;
              var dy = touch.clientY - engine._touchLookStart.y;
              engine.euler.setFromQuaternion(engine.camera.quaternion);
              engine.euler.y -= dx * 0.004;
              engine.euler.x -= dy * 0.004;
              engine.euler.x = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, engine.euler.x));
              engine.camera.quaternion.setFromEuler(engine.euler);
              engine._touchLookStart = { x: touch.clientX, y: touch.clientY };
            } else if (touch.identifier === engine._touchMoveId && engine._touchMoveStart) {
              // Move: compute joystick vector
              var mx = touch.clientX - engine._touchMoveStart.x;
              var mz = touch.clientY - engine._touchMoveStart.y;
              var mag = Math.sqrt(mx * mx + mz * mz);
              if (mag > 10) {
                engine._touchMoveVec = { x: mx / mag, z: mz / mag };
                engine.moveState.forward = mz < -15;
                engine.moveState.backward = mz > 15;
                engine.moveState.left = mx < -15;
                engine.moveState.right = mx > 15;
              } else {
                engine._touchMoveVec = { x: 0, z: 0 };
                engine.moveState.forward = false; engine.moveState.backward = false;
                engine.moveState.left = false; engine.moveState.right = false;
              }
            }
          }
        }, { passive: false });

        canvas.addEventListener('touchend', function(ev) {
          for (var ti = 0; ti < ev.changedTouches.length; ti++) {
            var touch = ev.changedTouches[ti];
            if (touch.identifier === engine._touchMoveId) {
              engine._touchMoveId = null; engine._touchMoveStart = null;
              engine._touchMoveVec = { x: 0, z: 0 };
              engine.moveState.forward = false; engine.moveState.backward = false;
              engine.moveState.left = false; engine.moveState.right = false;
            }
            if (touch.identifier === engine._touchLookId) {
              engine._touchLookId = null; engine._touchLookStart = null;
            }
          }
        }, { passive: false });

        // ── Block placement preview ghost + break highlight + crosshair targeting ──
        engine._ghostMesh = null;
        engine._highlightMesh = null;
        engine._crosshairTarget = 'none'; // 'none' | 'block' | 'npc' | 'npc_question'
        function updateGhostPreview() {
          var THREE = window.THREE;
          if ((!engine.isLocked && !engine._touchActive) || !THREE) {
            if (engine._ghostMesh) engine._ghostMesh.visible = false;
            if (engine._highlightMesh) engine._highlightMesh.visible = false;
            engine._crosshairTarget = 'none';
            return;
          }
          engine.raycaster.setFromCamera(new THREE.Vector2(0, 0), engine.camera);
          // Check NPC hits first (for crosshair coloring)
          var npcBodies = engine.npcs.map(function(n) { return n.body; }).concat(engine.npcs.map(function(n) { return n.head; }));
          var npcHits = engine.raycaster.intersectObjects(npcBodies);
          if (npcHits.length > 0 && npcHits[0].distance < 5) {
            var npcIdx = npcHits[0].object.userData.npcIndex;
            var npcData = engine.npcs[npcIdx] && engine.npcs[npcIdx].data;
            engine._crosshairTarget = (npcData && npcData.question && !answeredNpcs[npcIdx]) ? 'npc_question' : 'npc';
          } else {
            engine._crosshairTarget = 'none';
          }
          var hits = engine.raycaster.intersectObjects(Object.values(engine.blocks));
          if (hits.length > 0) engine._crosshairTarget = engine._crosshairTarget === 'none' ? 'block' : engine._crosshairTarget;

          // ── Break highlight — colored wireframe on the targeted block ──
          if (hits.length > 0 && hits[0].object.userData.gridPos) {
            var hp = hits[0].object.userData.gridPos;
            if (!engine._highlightMesh) {
              var hlGeo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
              var hlEdges = new THREE.EdgesGeometry(hlGeo);
              var hlMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, linewidth: 2 });
              engine._highlightMesh = new THREE.LineSegments(hlEdges, hlMat);
              engine._highlightMesh.renderOrder = 998;
              engine.scene.add(engine._highlightMesh);
            }
            engine._highlightMesh.position.set(hp.x + 0.5, hp.y + 0.5, hp.z + 0.5);
            engine._highlightMesh.visible = true;
            // Color: red for protected lesson blocks, white for breakable
            var isProtected = hits[0].object.userData._lessonBlock;
            engine._highlightMesh.material.color.setHex(isProtected ? 0xff4444 : 0xffffff);
            // Pulse the highlight opacity
            var pulseT = engine.clock.getElapsedTime();
            engine._highlightMesh.material.opacity = isProtected ? 0.3 : (0.4 + Math.sin(pulseT * 6) * 0.2);
          } else {
            if (engine._highlightMesh) engine._highlightMesh.visible = false;
          }

          // ── Placement ghost — wireframe preview matching selected shape + rotation ──
          if (hits.length > 0 && hits[0].object.userData.gridPos && hits[0].face) {
            var p2 = hits[0].object.userData.gridPos;
            var n2 = hits[0].face.normal;
            var gx = p2.x + Math.round(n2.x), gy = p2.y + Math.round(n2.y), gz = p2.z + Math.round(n2.z);
            var curShapeId = BLOCK_SHAPES[selectedShape] ? BLOCK_SHAPES[selectedShape].id : 'cube';
            var curRot = blockRotation || 0;
            // Recreate ghost if shape or rotation changed
            if (!engine._ghostMesh || engine._ghostShapeId !== curShapeId || engine._ghostRot !== curRot) {
              if (engine._ghostMesh) { engine.scene.remove(engine._ghostMesh); engine._ghostMesh.geometry.dispose(); engine._ghostMesh.material.dispose(); }
              var gGeo = createShapeGeometry(curShapeId);
              var gMat = new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.15, wireframe: true, side: THREE.DoubleSide });
              engine._ghostMesh = new THREE.Mesh(gGeo, gMat);
              engine._ghostMesh.renderOrder = 999;
              if (curRot > 0 && curShapeId !== 'cube') engine._ghostMesh.rotation.y = curRot * Math.PI / 2;
              engine.scene.add(engine._ghostMesh);
              engine._ghostShapeId = curShapeId;
              engine._ghostRot = curRot;
            }
            // Position based on shape type
            if (curShapeId === 'halfB') {
              engine._ghostMesh.position.set(gx + 0.5, gy + 0.25, gz + 0.5);
            } else if (curShapeId === 'halfA' || curShapeId === 'quarter') {
              engine._ghostMesh.position.set(gx + 0.5, gy, gz + 0.5);
            } else {
              engine._ghostMesh.position.set(gx + 0.5, gy + 0.5, gz + 0.5);
            }
            engine._ghostMesh.visible = true;
          } else {
            if (engine._ghostMesh) engine._ghostMesh.visible = false;
          }
        }

        // ── Collision helper: check if a world-space position is inside a solid block ──
        function isBlockAt(bx, by, bz) {
          return !!engine.blocks[Math.floor(bx) + ',' + Math.floor(by) + ',' + Math.floor(bz)];
        }

        // Player physics constants
        var MOVE_SPEED = 5.0;
        var SPRINT_SPEED = 8.0;
        var MOVE_ACCEL = 25;   // acceleration toward target speed
        var MOVE_DECEL = 18;   // deceleration (friction) when no input
        var PLAYER_RADIUS = 0.25; // half-width for XZ collision
        var EYE_HEIGHT = 1.6;  // camera above feet
        var PLAYER_HEIGHT = 1.8; // full body height
        var HEADBOB_AMOUNT = 0.04;  // vertical bob amplitude
        var HEADBOB_SPEED = 10;     // bob cycle speed
        var FOOTSTEP_INTERVAL = 0.38; // seconds between footstep sounds
        var SPRINT_FOOTSTEP_INTERVAL = 0.26;
        engine._headBobPhase = 0;
        engine._headBobBase = 0; // will be set to groundY when on ground

        // Animation loop
        function animate() {
          requestAnimationFrame(animate);
          // Guard: if Three.js isn't on window (CDN failure, teardown), skip frame entirely
          if (!window.THREE || !engine || !engine.scene || !engine.camera) return;
          var dt = Math.min(engine.clock.getDelta(), 0.1);

          // ── Smooth environment transitions ──
          updateEnvTransition(engine, dt);

          // ── Update break particles ──
          for (var pi = engine._particles.length - 1; pi >= 0; pi--) {
            var part = engine._particles[pi];
            part.userData._age += dt;
            if (part.userData._age >= part.userData._life) {
              engine.scene.remove(part); part.geometry.dispose(); part.material.dispose();
              engine._particles.splice(pi, 1);
              continue;
            }
            part.userData._vel.y -= 9.8 * dt;
            part.position.x += part.userData._vel.x * dt;
            part.position.y += part.userData._vel.y * dt;
            part.position.z += part.userData._vel.z * dt;
            part.material.opacity = 1.0 - (part.userData._age / part.userData._life);
            part.scale.setScalar(1.0 - (part.userData._age / part.userData._life) * 0.5);
          }

          // ── Auto-clear dimension lines when player walks far away ──
          if (engine._dimLines.length > 0 && engine._measureCenter) {
            var mc = engine._measureCenter;
            var dDist = engine.camera.position.distanceTo(new THREE.Vector3(mc.x, mc.y, mc.z));
            if (dDist > 25) { clearDimLines(); clearSelectionGlow(); engine._measureCenter = null; }
          }

          // ── Camera entry animation (swoop down to spawn) ──
          if (engine._entryAnim && !engine.isLocked) {
            var ea = engine._entryAnim;
            ea.progress = Math.min(1, ea.progress + dt * 0.6);
            var easeP = 1 - Math.pow(1 - ea.progress, 3); // ease-out cubic
            engine.camera.position.x += (ea.targetX - engine.camera.position.x) * easeP * dt * 2;
            engine.camera.position.y += (ea.targetY - engine.camera.position.y) * easeP * dt * 2;
            engine.camera.position.z += (ea.targetZ - engine.camera.position.z) * easeP * dt * 2;
            engine.camera.lookAt(ea.targetX + 3, ea.targetY - 1, ea.targetZ + 3);
            if (ea.progress >= 1) engine._entryAnim = null;
          }

          if (engine.isLocked) {
            var THREE = window.THREE;
            // ── Smooth movement with acceleration, deceleration, and proper XZ + Y collision ──
            var dir = new THREE.Vector3();
            var fwd = new THREE.Vector3();
            engine.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
            var right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
            var wantDir = new THREE.Vector3();
            if (engine.moveState.forward) wantDir.add(fwd);
            if (engine.moveState.backward) wantDir.sub(fwd);
            if (engine.moveState.right) wantDir.add(right);
            if (engine.moveState.left) wantDir.sub(right);
            var hasInput = wantDir.length() > 0.01;
            if (hasInput) wantDir.normalize();

            // Accelerate / decelerate horizontal velocity (sprint-aware)
            var isSprinting = engine.moveState.sprint && engine.moveState.forward;
            var curSpeed = isSprinting ? SPRINT_SPEED : MOVE_SPEED;
            var curH = new THREE.Vector3(engine.velocity.x || 0, 0, engine.velocity.z || 0);
            if (hasInput) {
              var target = wantDir.clone().multiplyScalar(curSpeed);
              curH.lerp(target, 1.0 - Math.exp(-MOVE_ACCEL * dt));
            } else {
              curH.multiplyScalar(Math.exp(-MOVE_DECEL * dt));
              if (curH.length() < 0.01) curH.set(0, 0, 0);
            }
            engine.velocity.x = curH.x;
            engine.velocity.z = curH.z;

            var cam = engine.camera.position;

            if (engine.flyMode) {
              // ── Fly mode: no gravity, no collision, Space=up, Shift=down ──
              var flySpeed = isSprinting ? 12 : 7;
              cam.x += engine.velocity.x * dt;
              cam.z += engine.velocity.z * dt;
              var flyVertical = 0;
              if (engine.moveState.flyUp) flyVertical = flySpeed;
              if (engine.moveState.sprint && !engine.moveState.forward) flyVertical = -flySpeed;
              cam.y += flyVertical * dt;
              engine.onGround = false;
            } else {
              // ── Walk mode: full gravity + collision ──
              // Apply gravity
              engine.velocity.y += -14.0 * dt;

              var feetY = cam.y - EYE_HEIGHT;

              // X axis collision with auto-step (step up 1-block ledges automatically)
              var AUTO_STEP_HEIGHT = 1.01; // can step up 1 block
              var newX = cam.x + engine.velocity.x * dt;
              var blocked = false;
              for (var cy = 0; cy < Math.ceil(PLAYER_HEIGHT); cy++) {
                if (isBlockAt(newX + PLAYER_RADIUS, feetY + cy, cam.z) || isBlockAt(newX - PLAYER_RADIUS, feetY + cy, cam.z)) { blocked = true; break; }
              }
              if (blocked && engine.onGround) {
                // Auto-step: check if stepping up 1 block would clear the obstacle
                var stepFeetY = feetY + AUTO_STEP_HEIGHT;
                var canStep = true;
                for (var scy = 0; scy < Math.ceil(PLAYER_HEIGHT); scy++) {
                  if (isBlockAt(newX + PLAYER_RADIUS, stepFeetY + scy, cam.z) || isBlockAt(newX - PLAYER_RADIUS, stepFeetY + scy, cam.z)) { canStep = false; break; }
                }
                if (canStep) { cam.x = newX; cam.y = stepFeetY + EYE_HEIGHT; blocked = false; }
              }
              if (!blocked) cam.x = newX; else engine.velocity.x = 0;

              // Z axis collision with auto-step
              var newZ = cam.z + engine.velocity.z * dt;
              blocked = false;
              for (var cy = 0; cy < Math.ceil(PLAYER_HEIGHT); cy++) {
                if (isBlockAt(cam.x, feetY + cy, newZ + PLAYER_RADIUS) || isBlockAt(cam.x, feetY + cy, newZ - PLAYER_RADIUS)) { blocked = true; break; }
              }
              if (blocked && engine.onGround) {
                var stepFeetZ = feetY + AUTO_STEP_HEIGHT;
                var canStepZ = true;
                for (var scz = 0; scz < Math.ceil(PLAYER_HEIGHT); scz++) {
                  if (isBlockAt(cam.x, stepFeetZ + scz, newZ + PLAYER_RADIUS) || isBlockAt(cam.x, stepFeetZ + scz, newZ - PLAYER_RADIUS)) { canStepZ = false; break; }
                }
                if (canStepZ) { cam.z = newZ; cam.y = stepFeetZ + EYE_HEIGHT; blocked = false; }
              }
              if (!blocked) cam.z = newZ; else engine.velocity.z = 0;

              // Y axis — ground detection
              var newY = cam.y + engine.velocity.y * dt;
              var newFeetY = newY - EYE_HEIGHT;
              var groundY = -100;
              var checkOffsets = [[0,0], [PLAYER_RADIUS, 0], [-PLAYER_RADIUS, 0], [0, PLAYER_RADIUS], [0, -PLAYER_RADIUS]];
              for (var ci = 0; ci < checkOffsets.length; ci++) {
                var cx2 = Math.floor(cam.x + checkOffsets[ci][0]);
                var cz2 = Math.floor(cam.z + checkOffsets[ci][1]);
                for (var gy = Math.floor(newFeetY) + 5; gy >= Math.floor(newFeetY) - 1; gy--) {
                  if (engine.blocks[cx2 + ',' + gy + ',' + cz2]) {
                    var topOfBlock = gy + 1 + EYE_HEIGHT;
                    if (topOfBlock > groundY) groundY = topOfBlock;
                    break;
                  }
                }
              }
              var worldGround = 0 + EYE_HEIGHT;
              if (groundY < worldGround) groundY = worldGround;

              if (newY < groundY) { cam.y = groundY; engine.velocity.y = 0; engine.onGround = true; }
              else { cam.y = newY; engine.onGround = false; }

              // Land sound
              if (engine.onGround && !engine._wasOnGround) sfxLand();
              engine._wasOnGround = engine.onGround;

              // Check if player is submerged in water (camera inside water block)
              var camGx = Math.floor(cam.x), camGy = Math.floor(cam.y - EYE_HEIGHT + 0.5), camGz = Math.floor(cam.z);
              var waterBlock = engine.blocks[camGx + ',' + camGy + ',' + camGz];
              engine._inWater = waterBlock && waterBlock.userData.blockType === 'water';
              engine._inLava = waterBlock && waterBlock.userData.blockType === 'lava';

              // Head-bump detection
              var headY = cam.y + (PLAYER_HEIGHT - EYE_HEIGHT);
              var headGx = Math.floor(cam.x), headGz = Math.floor(cam.z);
              if (engine.blocks[headGx + ',' + Math.floor(headY) + ',' + headGz] && engine.velocity.y > 0) {
                engine.velocity.y = 0;
              }
            }

            // ── Footsteps + head-bob while walking on ground ──
            var hSpeed = Math.sqrt(engine.velocity.x * engine.velocity.x + engine.velocity.z * engine.velocity.z);
            if (engine.onGround && hSpeed > 1.0) {
              var stepInterval = isSprinting ? SPRINT_FOOTSTEP_INTERVAL : FOOTSTEP_INTERVAL;
              engine._footstepTimer += dt;
              if (engine._footstepTimer >= stepInterval) {
                engine._footstepTimer -= stepInterval;
                sfxFootstep();
              }
              // Head-bob: gentle sine wave offset
              var bobSpeed = isSprinting ? HEADBOB_SPEED * 1.4 : HEADBOB_SPEED;
              var bobAmt = isSprinting ? HEADBOB_AMOUNT * 1.3 : HEADBOB_AMOUNT;
              engine._headBobPhase += dt * bobSpeed;
              cam.y += Math.sin(engine._headBobPhase) * bobAmt;
            } else {
              engine._footstepTimer = 0;
              // Smoothly return head-bob to zero
              engine._headBobPhase *= 0.9;
            }

            // FOV zoom on sprint (subtle)
            var targetFov = isSprinting && hSpeed > 3 ? 82 : 75;
            engine.camera.fov += (targetFov - engine.camera.fov) * Math.min(1, dt * 6);
            engine.camera.updateProjectionMatrix();

            // ── Camera shake (on block break) ──
            if (engine._shakeUntil && t < engine._shakeUntil) {
              var shakeAmt = engine._shakeIntensity || 0.03;
              cam.x += (Math.random() - 0.5) * shakeAmt;
              cam.y += (Math.random() - 0.5) * shakeAmt;
            }

            // Update ghost block preview
            updateGhostPreview();
          }

          // Animate NPCs — bob, rotate, face player when close
          var t = engine.clock.getElapsedTime();
          engine.npcs.forEach(function(npc, i) {
            var baseY = npc.data.position[1] + 0.75;
            var bobY = Math.sin(t * 2 + i) * 0.1;
            // Celebration bounce (set npc._celebrateUntil on correct answer)
            if (npc._celebrateUntil && t < npc._celebrateUntil) {
              bobY += Math.abs(Math.sin((t - (npc._celebrateUntil - 0.8)) * 12)) * 0.4;
            }
            // Shake on wrong answer (set npc._shakeUntil)
            if (npc._shakeUntil && t < npc._shakeUntil) {
              npc.body.position.x = npc.data.position[0] + 0.5 + Math.sin(t * 30) * 0.05;
            } else if (engine.camera && engine.camera.position.distanceTo(npc.body.position) > 8) {
              // Subtle idle patrol when player is far — gentle sinusoidal wander
              npc.body.position.x = npc.data.position[0] + 0.5 + Math.sin(t * 0.4 + i * 2.1) * 0.3;
              npc.body.position.z = npc.data.position[2] + 0.5 + Math.cos(t * 0.3 + i * 1.7) * 0.3;
            } else {
              npc.body.position.x = npc.data.position[0] + 0.5;
            }
            npc.body.position.y = baseY + bobY;
            npc.head.position.y = npc.data.position[1] + 1.7 + bobY;
            // Face toward player when within 6 blocks
            if (engine.camera) {
              var dx = engine.camera.position.x - npc.body.position.x;
              var dz = engine.camera.position.z - npc.body.position.z;
              var dist = Math.sqrt(dx * dx + dz * dz);
              if (dist < 6) {
                var targetRot = Math.atan2(dx, dz);
                npc.body.rotation.y += (targetRot - npc.body.rotation.y) * Math.min(1, dt * 3);
                // Head tilt: look slightly toward player's eye level
                var lookDy = engine.camera.position.y - npc.head.position.y;
                var headTilt = Math.max(-0.3, Math.min(0.3, lookDy * 0.15));
                npc.head.rotation.x += (headTilt - npc.head.rotation.x) * Math.min(1, dt * 4);
                npc.head.rotation.y += (targetRot - npc.head.rotation.y) * Math.min(1, dt * 3);
              } else {
                npc.body.rotation.y += dt * 0.5;
                npc.head.rotation.x *= 0.95;
                npc.head.rotation.y = npc.body.rotation.y;
              }
            } else {
              npc.body.rotation.y += dt * 0.5;
            }
            // ── Floating question mark: bob + spin, hide when answered ──
            if (npc.qMark) {
              var isNpcAnswered = answeredNpcs[i];
              if (isNpcAnswered) {
                // Hide question mark when answered (fade out)
                if (npc.qMark.material.opacity > 0.01) {
                  npc.qMark.material.opacity -= dt * 2;
                } else if (npc.qMark.visible) {
                  npc.qMark.visible = false;
                }
              } else {
                npc.qMark.material.opacity = 1;
                npc.qMark.visible = true;
                npc.qMark.position.y = npc.data.position[1] + 2.7 + Math.sin(t * 3 + i * 1.5) * 0.15;
                // Subtle scale pulse
                var qScale = 0.55 + Math.sin(t * 4 + i) * 0.08;
                npc.qMark.scale.set(qScale, qScale, 1);
              }
            }

            // ── Eye blink animation ──
            if (npc.eyeL && npc.eyeR) {
              var blinkCycle = (t * 0.7 + i * 2.3) % 4; // blink every ~4 seconds
              var eyeScale = blinkCycle < 0.1 ? 0.2 : 1.0; // squash during blink
              npc.eyeL.scale.set(1, eyeScale, 1);
              npc.eyeR.scale.set(1, eyeScale, 1);
            }

            // ── Answered NPC green tint + checkmark glow ──
            if (answeredNpcs[i] && npc.data.question) {
              // Green emissive tint on body
              if (!npc._answeredTinted) {
                npc._answeredTinted = true;
                npc.body.material.emissive = new THREE.Color(0x22c55e);
                npc.body.material.emissiveIntensity = 0.15;
              }
              // Pulsing green glow intensity
              npc.body.material.emissiveIntensity = 0.1 + Math.sin(t * 2 + i) * 0.05;
              // Green checkmark particle (occasional)
              if (Math.random() < 0.003) {
                var cpGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
                var cpMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.8 });
                var cpMesh = new THREE.Mesh(cpGeo, cpMat);
                cpMesh.position.set(npc.body.position.x + (Math.random() - 0.5) * 0.5, npc.body.position.y + 0.5 + Math.random(), npc.body.position.z + (Math.random() - 0.5) * 0.5);
                cpMesh.userData._age = 0; cpMesh.userData._life = 1.5;
                cpMesh.userData._vel = { x: (Math.random() - 0.5) * 0.3, y: 0.8 + Math.random() * 0.5, z: (Math.random() - 0.5) * 0.3 };
                engine.scene.add(cpMesh); engine._particles.push(cpMesh);
              }
            }

            // Proximity glow ring on ground beneath NPC
            if (!npc._ring) {
              var THREE = window.THREE;
              if (THREE) {
                var ringGeo = new THREE.RingGeometry(0.4, 0.55, 24);
                ringGeo.rotateX(-Math.PI / 2);
                var ringMat = new THREE.MeshBasicMaterial({ color: npc.data.color || 0x7c3aed, transparent: true, opacity: 0, side: THREE.DoubleSide });
                npc._ring = new THREE.Mesh(ringGeo, ringMat);
                npc._ring.position.set(npc.data.position[0] + 0.5, npc.data.position[1] + 0.02, npc.data.position[2] + 0.5);
                engine.scene.add(npc._ring);
              }
            }
            if (npc._ring && engine.camera) {
              var dx2 = engine.camera.position.x - npc.body.position.x;
              var dz2 = engine.camera.position.z - npc.body.position.z;
              var dist2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
              var targetOp = dist2 < 4 ? 0.5 : 0;
              npc._ring.material.opacity += (targetOp - npc._ring.material.opacity) * Math.min(1, dt * 5);
              npc._ring.scale.setScalar(1.0 + Math.sin(t * 3 + i) * 0.08);
              // Speech bubble preview — show first ~30 chars of dialogue when medium-close
              if (!npc._speechBubble && npc.data.dialogue) {
                var sbCanvas = document.createElement('canvas'); sbCanvas.width = 256; sbCanvas.height = 64;
                var sbx = sbCanvas.getContext('2d');
                sbx.clearRect(0, 0, 256, 64);
                sbx.fillStyle = 'rgba(15,23,42,0.85)';
                if (sbx.roundRect) { sbx.beginPath(); sbx.roundRect(4, 4, 248, 56, 10); sbx.fill(); } else { sbx.fillRect(4, 4, 248, 56); }
                sbx.fillStyle = '#e2e8f0'; sbx.font = '14px sans-serif'; sbx.textAlign = 'center';
                var preview = npc.data.dialogue.length > 35 ? npc.data.dialogue.slice(0, 33) + '...' : npc.data.dialogue;
                sbx.fillText(preview, 128, 38);
                npc._speechBubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sbCanvas), transparent: true, depthTest: false, opacity: 0 }));
                npc._speechBubble.scale.set(2.5, 0.6, 1);
                npc._speechBubble.position.set(npc.data.position[0] + 0.5, npc.data.position[1] + 3.0, npc.data.position[2] + 0.5);
                engine.scene.add(npc._speechBubble);
              }
              if (npc._speechBubble) {
                // Show when medium distance (3-6 blocks), hide when too close (dialog takes over) or too far
                var sbTarget = (dist2 > 3 && dist2 < 6) ? 0.7 : 0;
                npc._speechBubble.material.opacity += (sbTarget - npc._speechBubble.material.opacity) * Math.min(1, dt * 5);
                npc._speechBubble.position.y = npc.data.position[1] + 3.0 + Math.sin(t * 1.5 + i * 0.8) * 0.04;
              }
              // "Press E" prompt — fade in when close, bob above head
              if (npc.prompt) {
                var promptTarget = dist2 < 3.5 ? 0.9 : 0;
                npc.prompt.material.opacity += (promptTarget - npc.prompt.material.opacity) * Math.min(1, dt * 6);
                npc.prompt.position.y = npc.data.position[1] + 2.5 + Math.sin(t * 2.5 + i * 0.7) * 0.06;
              }
            }
          });

          // ── NPC proximity chime (soft ping when near unanswered NPC, every 3s) ──
          if (!engine._npcProxTimer) engine._npcProxTimer = 0;
          engine._npcProxTimer += dt;
          if (engine._npcProxTimer > 3.0 && engine.camera) {
            engine._npcProxTimer = 0;
            engine.npcs.forEach(function(npc, ni) {
              if (!npc.data.question || answeredNpcs[ni]) return;
              var pDist = engine.camera.position.distanceTo(npc.body.position);
              if (pDist < 4.5 && pDist > 1.5) {
                // Soft proximity chime (quieter than interaction chime)
                try {
                  var ac = getAC(); if (!ac) return;
                  var osc = ac.createOscillator(); osc.type = 'sine'; osc.frequency.value = 660 + ni * 50;
                  var g = ac.createGain(); g.gain.value = 0.015; // very quiet
                  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
                  osc.connect(g); g.connect(ac.destination);
                  osc.start(); osc.stop(ac.currentTime + 0.4);
                } catch(e) {}
              }
            });
          }

          // ── Collaborative: render peer player avatars ──
          if (collabMode && engine._peerAvatars === undefined) engine._peerAvatars = {};
          if (collabMode) {
            var THREE = window.THREE;
            Object.keys(collabPlayers).forEach(function(key) {
              var p = collabPlayers[key];
              if (p.name === playerName || !p.position) return;
              if (!engine._peerAvatars[key]) {
                // Create avatar: colored cube head + body
                var mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.color || '#34d399') });
                var body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), mat);
                var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat);
                engine.scene.add(body); engine.scene.add(head);
                engine._peerAvatars[key] = { body: body, head: head };
              }
              var av = engine._peerAvatars[key];
              av.body.position.set(p.position[0], p.position[1] - 0.8, p.position[2]);
              av.head.position.set(p.position[0], p.position[1] + 0.05, p.position[2]);
              av.body.rotation.y += dt * 0.3;
            });
            // Remove avatars for disconnected players
            Object.keys(engine._peerAvatars).forEach(function(key) {
              if (!collabPlayers[key]) {
                engine.scene.remove(engine._peerAvatars[key].body);
                engine.scene.remove(engine._peerAvatars[key].head);
                delete engine._peerAvatars[key];
              }
            });
          }

          // ── Sky transition on lesson completion ──
          // When all questions answered, sky transitions: day → golden hour → starry night
          if (engine.completionTriggered) {
            engine.completionProgress = Math.min(1, (engine.completionProgress || 0) + dt * 0.15);
            var p = engine.completionProgress;
            var THREE = window.THREE;
            if (p < 0.5) {
              // Day → golden hour (blue → orange)
              var t2 = p * 2;
              var r = 0.53 + t2 * 0.47, g = 0.81 - t2 * 0.41, b = 0.92 - t2 * 0.62;
              engine.scene.background.setRGB(r, g, b);
              engine.scene.fog.color.setRGB(r, g, b);
            } else {
              // Golden hour → night (orange → dark blue)
              var t2 = (p - 0.5) * 2;
              var r = 1.0 - t2 * 0.94, g = 0.4 - t2 * 0.35, b = 0.3 + t2 * 0.05;
              engine.scene.background.setRGB(r, g, b);
              engine.scene.fog.color.setRGB(r, g, b);
            }
            // Spawn floating stars
            if (p > 0.6 && !engine.starsCreated) {
              engine.starsCreated = true;
              var starGeo = new THREE.BufferGeometry();
              var starVerts = [];
              for (var si = 0; si < 500; si++) {
                starVerts.push((Math.random() - 0.5) * 200, 30 + Math.random() * 50, (Math.random() - 0.5) * 200);
              }
              starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
              var starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, transparent: true, opacity: 0 });
              engine.stars = new THREE.Points(starGeo, starMat);
              engine.scene.add(engine.stars);
            }
            // Fade in stars
            if (engine.stars && p > 0.6) {
              engine.stars.material.opacity = Math.min(1, (p - 0.6) * 2.5);
              engine.stars.rotation.y += dt * 0.02; // slow rotation
            }
            // Spawn floating congratulations message
            if (p > 0.8 && !engine.congratsCreated) {
              engine.congratsCreated = true;
              var canvas2 = document.createElement('canvas'); canvas2.width = 512; canvas2.height = 256;
              var cx2 = canvas2.getContext('2d');
              cx2.fillStyle = 'rgba(0,0,0,0)';
              cx2.clearRect(0, 0, 512, 256);
              cx2.fillStyle = '#fbbf24';
              cx2.font = 'bold 36px sans-serif';
              cx2.textAlign = 'center';
              cx2.fillText('\uD83C\uDFC6 Lesson Complete!', 256, 60);
              cx2.fillStyle = '#e2e8f0';
              cx2.font = '18px sans-serif';
              cx2.fillText('Every block you placed made', 256, 110);
              cx2.fillText('your brain stronger.', 256, 135);
              cx2.fillStyle = '#4ade80';
              cx2.font = 'italic 16px sans-serif';
              cx2.fillText('You didn\'t just learn volume \u2014', 256, 175);
              cx2.fillText('you practiced growing.', 256, 200);
              var congTex = new THREE.CanvasTexture(canvas2);
              var congSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: congTex, transparent: true, opacity: 0 }));
              congSprite.scale.set(8, 4, 1);
              congSprite.position.set(10, 12, 10);
              engine.scene.add(congSprite);
              engine.congratsSprite = congSprite;
            }
            if (engine.congratsSprite) {
              engine.congratsSprite.material.opacity = Math.min(1, engine.congratsSprite.material.opacity + dt * 0.5);
              engine.congratsSprite.position.y = 12 + Math.sin(t * 0.5) * 0.5; // gentle float
              engine.congratsSprite.lookAt(engine.camera.position); // always face player
            }
          }

          // ── Animate water blocks — gentle vertical bob + opacity shimmer ──
          if (!engine._waterAnimFrame) engine._waterAnimFrame = 0;
          engine._waterAnimFrame++;
          if (engine._waterAnimFrame % 3 === 0) { // Every 3rd frame for performance
            var wt = engine.clock.getElapsedTime();
            var blockKeys = Object.keys(engine.blocks);
            for (var wi = 0; wi < blockKeys.length; wi++) {
              var wm = engine.blocks[blockKeys[wi]];
              if (wm && wm.userData.blockType === 'water') {
                var wp = wm.userData.gridPos;
                wm.position.y = wp.y + 0.5 + Math.sin(wt * 1.5 + wp.x * 0.7 + wp.z * 0.5) * 0.04;
                wm.material.opacity = 0.35 + Math.sin(wt * 2 + wp.x + wp.z) * 0.08;
              } else if (wm && wm.userData.blockType === 'lava') {
                // Lava: pulse emissive intensity
                var lp = wm.userData.gridPos;
                wm.material.emissiveIntensity = 0.5 + Math.sin(wt * 1.2 + lp.x * 0.5 + lp.z * 0.3) * 0.25;
              } else if (wm && wm.userData.blockType === 'diamond') {
                // Diamond: periodic sparkle particles (1 in 200 chance per frame per block)
                if (Math.random() < 0.005) {
                  var dp = wm.userData.gridPos;
                  var THREE2 = window.THREE;
                  if (THREE2) {
                    var sparkGeo = new THREE2.BoxGeometry(0.06, 0.06, 0.06);
                    var sparkMat = new THREE2.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
                    var spark = new THREE2.Mesh(sparkGeo, sparkMat);
                    spark.position.set(dp.x + Math.random(), dp.y + Math.random(), dp.z + Math.random());
                    spark.userData._age = 0; spark.userData._life = 0.6;
                    spark.userData._vel = { x: (Math.random() - 0.5) * 2, y: 1.5 + Math.random(), z: (Math.random() - 0.5) * 2 };
                    engine.scene.add(spark);
                    engine._particles.push(spark);
                  }
                }
              } else if (wm && wm.userData.blockType === 'torch' && wm.userData._torchLight) {
                // Torch: flicker the point light intensity
                var tp = wm.userData.gridPos;
                wm.userData._torchLight.intensity = 1.0 + Math.sin(wt * 8 + tp.x * 2.3) * 0.3 + Math.sin(wt * 13 + tp.z * 3.1) * 0.15;
                wm.material.emissiveIntensity = 0.7 + Math.sin(wt * 6 + tp.x) * 0.25;
              }
            }
          }

          // ── Auto day/night cycle (60-second rotation through presets) ──
          if (d.autoCycle) {
            if (!engine._cycleTimer) engine._cycleTimer = 0;
            engine._cycleTimer += dt;
            if (engine._cycleTimer > 60) {
              engine._cycleTimer = 0;
              var presetKeys = Object.keys(ENV_PRESETS);
              var curIdx = presetKeys.indexOf(engine._currentEnv || 'day');
              var nextIdx = (curIdx + 1) % presetKeys.length;
              applyEnvPreset(engine, presetKeys[nextIdx]);
              upd('envPreset', presetKeys[nextIdx]);
            }
          }

          // ── Ambient dust motes (floating particles near player) ──
          if (!engine._dustMotes) engine._dustMotes = [];
          if (engine._dustMotes.length < 12 && Math.random() < 0.03) {
            var camPos = engine.camera.position;
            var dGeo = new THREE.SphereGeometry(0.02, 4, 4);
            var dMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
            var dust = new THREE.Mesh(dGeo, dMat);
            dust.position.set(camPos.x + (Math.random() - 0.5) * 8, camPos.y + (Math.random() - 0.5) * 3, camPos.z + (Math.random() - 0.5) * 8);
            dust._phase = Math.random() * 6.28;
            dust._speed = 0.2 + Math.random() * 0.3;
            dust._life = 8 + Math.random() * 6; // 8-14 seconds
            dust._age = 0;
            engine.scene.add(dust);
            engine._dustMotes.push(dust);
          }
          for (var di = engine._dustMotes.length - 1; di >= 0; di--) {
            var dm = engine._dustMotes[di];
            dm._age += dt;
            if (dm._age >= dm._life) {
              engine.scene.remove(dm); dm.geometry.dispose(); dm.material.dispose();
              engine._dustMotes.splice(di, 1);
              continue;
            }
            // Gentle floating: sinusoidal drift
            dm.position.x += Math.sin(t * 0.5 + dm._phase) * 0.003;
            dm.position.y += Math.sin(t * 0.3 + dm._phase * 2) * 0.002 + dm._speed * dt * 0.05;
            dm.position.z += Math.cos(t * 0.4 + dm._phase * 1.5) * 0.003;
            // Fade in/out over life
            var lifePct = dm._age / dm._life;
            dm.material.opacity = lifePct < 0.1 ? lifePct * 2.5 : lifePct > 0.8 ? (1 - lifePct) * 5 : 0.25;
          }

          // ── Animate clouds — slow UV drift ──
          if (engine._cloudTex) {
            engine._cloudTex.offset.x += dt * 0.005;
            engine._cloudTex.offset.y += dt * 0.002;
          }
          // Keep cloud plane centered above camera so it always covers the sky
          if (engine._cloudPlane && engine.camera) {
            engine._cloudPlane.position.x = engine.camera.position.x;
            engine._cloudPlane.position.z = engine.camera.position.z;
          }

          engine.renderer.render(engine.scene, engine.camera);
        }
        animate();

        // Handle resize
        var ro = new ResizeObserver(function() {
          if (!container.clientWidth) return;
          engine.camera.aspect = container.clientWidth / container.clientHeight;
          engine.camera.updateProjectionMatrix();
          engine.renderer.setSize(container.clientWidth, container.clientHeight);
        });
        ro.observe(container);

        // ── Session Analytics (research data collection) ──
        engine.sessionLog = [];
        engine.sessionStart = Date.now();
        engine.logEvent = function(type, data) {
          engine.sessionLog.push({
            timestamp: Date.now() - engine.sessionStart,
            elapsed: ((Date.now() - engine.sessionStart) / 1000).toFixed(1) + 's',
            type: type,
            data: data || {}
          });
        };
        engine.logEvent('session_start', { lesson: 'volumeExplorer' });

        // Patch placeBlock and removeBlock to log
        var origPlace = engine.placeBlock;
        engine.placeBlock = function(x, y, z, type) {
          origPlace(x, y, z, type);
          engine.logEvent('block_place', { x: x, y: y, z: z, type: type });
        };
        var origRemove = engine.removeBlock;
        engine.removeBlock = function(x, y, z) {
          origRemove(x, y, z);
          engine.logEvent('block_remove', { x: x, y: y, z: z });
        };

        // Export session data as CSV for research
        engine.exportSessionCSV = function() {
          var rows = ['Timestamp_ms,Elapsed,Event_Type,Details'];
          engine.sessionLog.forEach(function(entry) {
            var details = Object.keys(entry.data).map(function(k) { return k + '=' + entry.data[k]; }).join('; ');
            rows.push(entry.timestamp + ',' + entry.elapsed + ',' + entry.type + ',"' + details.replace(/"/g, '""') + '"');
          });
          return rows.join('\n');
        };

        // ── MTSS Progress Monitoring & Longitudinal Data ──
        // Generates a structured progress report that can accumulate across sessions
        // and be used for RTI tier classification
        engine.generateProgressReport = function() {
          var log = engine.sessionLog;
          var correct = log.filter(function(e) { return e.type === 'answer_correct'; });
          var wrong = log.filter(function(e) { return e.type === 'answer_wrong'; });
          var measurements = log.filter(function(e) { return e.type === 'measurement'; });
          var blocksPlaced = log.filter(function(e) { return e.type === 'block_place'; });
          var completions = log.filter(function(e) { return e.type === 'lesson_complete'; });
          var lessons = log.filter(function(e) { return e.type === 'lesson_load'; });

          var totalAttempts = correct.length + wrong.length;
          var accuracy = totalAttempts > 0 ? Math.round((correct.length / totalAttempts) * 100) : 0;
          var sessionDuration = log.length > 0 ? log[log.length - 1].timestamp / 1000 : 0;

          // Calculate digits correct per minute equivalent (questions correct per minute)
          var questionsPerMinute = sessionDuration > 60 ? (correct.length / (sessionDuration / 60)).toFixed(2) : 'N/A (session < 1 min)';

          // Measurement accuracy — how many measurements matched expected volumes
          var correctMeasurements = measurements.filter(function(m) {
            return m.data.blocks === m.data.volume; // rectangular (blocks = bounding volume)
          }).length;

          // RTI Tier suggestion based on accuracy
          var rtiTier = accuracy >= 80 ? 'Tier 1 (Benchmark)' : accuracy >= 50 ? 'Tier 2 (Strategic)' : 'Tier 3 (Intensive)';

          var report = {
            // Session metadata
            sessionDate: new Date().toISOString(),
            sessionDuration: Math.round(sessionDuration) + 's',
            lessonsAttempted: lessons.length,
            lessonsCompleted: completions.length,

            // Performance metrics
            questionsCorrect: correct.length,
            questionsWrong: wrong.length,
            totalAttempts: totalAttempts,
            accuracy: accuracy + '%',
            questionsPerMinute: questionsPerMinute,

            // Skill indicators
            measurementsTaken: measurements.length,
            correctMeasurements: correctMeasurements,
            blocksPlaced: blocksPlaced.length,

            // RTI classification
            rtiTierSuggestion: rtiTier,

            // Growth indicators
            npcConversations: log.filter(function(e) { return e.type === 'npc_chat'; }).length,
            worldsCreated: log.filter(function(e) { return e.type === 'npc_created'; }).length,
            worksheetsPrinted: log.filter(function(e) { return e.type === 'worksheet_print'; }).length,

            // Detail for longitudinal tracking
            questionDetails: correct.concat(wrong).map(function(e) {
              return {
                timestamp: e.elapsed,
                npc: e.data.npc || '',
                question: e.data.question || '',
                correct: e.type === 'answer_correct',
                answer: e.data.choice || e.data.chosenAnswer || ''
              };
            }),

            // Standards alignment
            standardsAddressed: ['5.MD.C.3', '5.MD.C.4', '5.MD.C.5'],
            tool: 'AlloFlow Geometry World',
            version: '1.0'
          };

          return report;
        };

        // Export progress report as JSON (for longitudinal accumulation)
        engine.exportProgressReport = function() {
          var report = engine.generateProgressReport();
          var json = JSON.stringify(report, null, 2);
          var blob = new Blob([json], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'geometry_progress_' + new Date().toISOString().slice(0, 10) + '.json';
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          URL.revokeObjectURL(a.href);

          // Also open printable MTSS report for teacher's RTI binder
          var r = report;
          var tierColor = r.rtiTierSuggestion.indexOf('Tier 1') >= 0 ? '#22c55e' : r.rtiTierSuggestion.indexOf('Tier 2') >= 0 ? '#f59e0b' : '#ef4444';
          var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MTSS Progress Report</title>'
            + '<style>body{font-family:Arial,sans-serif;max-width:700px;margin:24px auto;color:#1e293b;line-height:1.5}'
            + 'h1{font-size:20px;border-bottom:2px solid #334155;padding-bottom:8px}'
            + 'h2{font-size:15px;color:#475569;margin:18px 0 6px}'
            + '.tier{display:inline-block;background:' + tierColor + ';color:#fff;padding:6px 16px;border-radius:8px;font-size:18px;font-weight:700;margin:8px 0}'
            + 'table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left;font-size:13px}th{background:#f1f5f9;font-weight:700}'
            + '.metric{display:inline-block;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 16px;margin:4px;text-align:center;min-width:100px}'
            + '.metric .val{font-size:22px;font-weight:700;color:#1e293b}.metric .lbl{font-size:10px;color:#64748b;text-transform:uppercase}'
            + '.footer{margin-top:24px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}'
            + '@media print{body{margin:12px}}</style></head><body>';
          h += '<h1>\uD83D\uDCCB MTSS Progress Monitoring Report</h1>';
          h += '<p><strong>Tool:</strong> ' + r.tool + ' v' + r.version + ' &bull; <strong>Date:</strong> ' + r.sessionDate.slice(0, 10) + ' &bull; <strong>Duration:</strong> ' + r.sessionDuration + '</p>';
          h += '<div class="tier">' + r.rtiTierSuggestion + '</div>';

          h += '<h2>Performance Metrics</h2><div>';
          h += '<div class="metric"><div class="val">' + r.accuracy + '</div><div class="lbl">Accuracy</div></div>';
          h += '<div class="metric"><div class="val">' + r.questionsCorrect + '/' + r.totalAttempts + '</div><div class="lbl">Correct</div></div>';
          h += '<div class="metric"><div class="val">' + r.questionsPerMinute + '</div><div class="lbl">Q/min</div></div>';
          h += '<div class="metric"><div class="val">' + r.measurementsTaken + '</div><div class="lbl">Measurements</div></div>';
          h += '<div class="metric"><div class="val">' + r.blocksPlaced + '</div><div class="lbl">Blocks Placed</div></div>';
          h += '<div class="metric"><div class="val">' + r.lessonsCompleted + '/' + r.lessonsAttempted + '</div><div class="lbl">Lessons Done</div></div>';
          h += '</div>';

          h += '<h2>Growth Indicators</h2><div>';
          h += '<div class="metric"><div class="val">' + r.npcConversations + '</div><div class="lbl">NPC Chats</div></div>';
          h += '<div class="metric"><div class="val">' + r.worldsCreated + '</div><div class="lbl">Worlds Created</div></div>';
          h += '<div class="metric"><div class="val">' + r.worksheetsPrinted + '</div><div class="lbl">Worksheets</div></div>';
          h += '</div>';

          // Achievement badges earned this session
          var badgeKeys = Object.keys(earnedBadges);
          if (badgeKeys.length > 0) {
            h += '<h2>Achievement Badges (' + badgeKeys.length + '/' + ACHIEVEMENTS.length + ')</h2>';
            h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">';
            ACHIEVEMENTS.forEach(function(a) {
              var earned = !!earnedBadges[a.id];
              h += '<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:12px;'
                + (earned ? 'background:#dcfce7;border:1px solid #86efac;color:#166534' : 'background:#f1f5f9;border:1px solid #e2e8f0;color:#94a3b8;opacity:0.5')
                + '">' + a.icon + ' ' + a.name + '</div>';
            });
            h += '</div>';
          }

          h += '<h2>Standards Addressed</h2><ul>';
          r.standardsAddressed.forEach(function(s) {
            var desc = s === '5.MD.C.3' ? 'Recognize volume as an attribute of solid figures' : s === '5.MD.C.4' ? 'Measure volume by counting unit cubes' : s === '5.MD.C.5' ? 'Relate volume to multiplication and addition' : s;
            h += '<li><strong>' + s + '</strong> \u2014 ' + desc + '</li>';
          });
          h += '</ul>';

          if (r.questionDetails && r.questionDetails.length > 0) {
            h += '<h2>Question-Level Detail</h2><table><tr><th>#</th><th>NPC</th><th>Question</th><th>Result</th><th>Time</th></tr>';
            r.questionDetails.forEach(function(q, i) {
              h += '<tr><td>' + (i + 1) + '</td><td>' + (q.npc || '\u2014') + '</td><td style="font-size:11px">' + (q.question || '\u2014') + '</td>';
              h += '<td style="color:' + (q.correct ? '#22c55e' : '#ef4444') + ';font-weight:700">' + (q.correct ? '\u2713 Correct' : '\u2717 Incorrect') + '</td>';
              h += '<td>' + (q.timestamp ? Math.round(q.timestamp) + 's' : '\u2014') + '</td></tr>';
            });
            h += '</table>';
          }

          h += '<h2>RTI Decision Guide</h2>';
          h += '<table><tr><th>Tier</th><th>Accuracy</th><th>Recommendation</th></tr>';
          h += '<tr><td style="color:#22c55e;font-weight:700">Tier 1 (Benchmark)</td><td>\u226580%</td><td>Continue core instruction; enrich with Creator Mode challenges</td></tr>';
          h += '<tr><td style="color:#f59e0b;font-weight:700">Tier 2 (Strategic)</td><td>50\u201379%</td><td>Small-group re-teaching; scaffold with Volume Explorer before advancing</td></tr>';
          h += '<tr><td style="color:#ef4444;font-weight:700">Tier 3 (Intensive)</td><td>&lt;50%</td><td>Individual intervention; use physical manipulatives alongside Geometry World</td></tr>';
          h += '</table>';

          // IEP Goal Auto-Drafting
          h += '<h2>Draft IEP Goal Suggestions</h2>';
          h += '<p style="font-size:11px;color:#64748b;margin-bottom:8px"><em>These are auto-generated drafts based on session data. Review and modify before including in any IEP document.</em></p>';
          var accNum = parseInt(r.accuracy);
          var targetAcc = accNum < 50 ? '60' : accNum < 80 ? '80' : '90';
          var goalArea = r.lessonsCompleted > 0 ? 'geometric measurement of volume' : 'identifying and measuring attributes of 3D shapes';
          h += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin:8px 0">';
          h += '<div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:4px">Mathematics \u2014 Geometry & Measurement (5.MD.C.3\u20135)</div>';
          h += '<div style="font-size:13px;line-height:1.6">';
          h += 'Given access to AlloFlow Geometry World with teacher support, [Student] will demonstrate understanding of ' + goalArea;
          h += ' by correctly calculating the volume of rectangular prisms with <strong>' + targetAcc + '% accuracy</strong>';
          h += ' across <strong>3 consecutive sessions</strong>, as measured by the Geometry World MTSS Progress Monitoring Report.';
          h += '</div></div>';

          // Tier-specific goal variant
          if (accNum < 50) {
            h += '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px;margin:8px 0">';
            h += '<div style="font-size:11px;font-weight:700;color:#991b1b;margin-bottom:4px">Intensive Intervention Goal (Tier 3)</div>';
            h += '<div style="font-size:13px;line-height:1.6">';
            h += 'Given teacher-led instruction with physical unit cubes and AlloFlow Geometry World, [Student] will use manipulatives to build rectangular prisms and state their volume using the formula L \u00d7 W \u00d7 H with <strong>60% accuracy</strong> across <strong>5 consecutive sessions</strong>, as measured by teacher observation and the Physical Manipulative Bridge Card.';
            h += '</div></div>';
          } else if (accNum < 80) {
            h += '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:14px;margin:8px 0">';
            h += '<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px">Strategic Intervention Goal (Tier 2)</div>';
            h += '<div style="font-size:13px;line-height:1.6">';
            h += 'Given small-group instruction with guided practice in AlloFlow Geometry World, [Student] will decompose composite 3D shapes into rectangular prisms, calculate partial volumes, and find total volume with <strong>80% accuracy</strong> across <strong>3 consecutive sessions</strong>.';
            h += '</div></div>';
          } else {
            h += '<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin:8px 0">';
            h += '<div style="font-size:11px;font-weight:700;color:#166534;margin-bottom:4px">Enrichment Goal (Tier 1)</div>';
            h += '<div style="font-size:13px;line-height:1.6">';
            h += 'Given access to AlloFlow Geometry World Creator Mode, [Student] will design and share original geometry lessons for peers, incorporating at least 2 structures with NPC questions that assess volume understanding, as demonstrated through saved world files and peer feedback.';
            h += '</div></div>';
          }

          h += '<div class="footer">AlloFlow Geometry World \u2022 MTSS Progress Report \u2022 Generated ' + new Date().toLocaleString() + '<br>For educator use in RTI documentation. IEP goal suggestions are drafts \u2014 professional judgment required.<br>This report exports as JSON for longitudinal accumulation across sessions.</div>';
          h += '</body></html>';

          var win = window.open('', '_blank');
          if (win) { win.document.write(h); win.document.close(); }

          return report;
        };

        window[engineKey] = engine;

        // Auto-load default lesson
        engine.loadLesson(SAMPLE_LESSONS.volumeExplorer);
        } catch(e) {
          console.error('[GeometryWorld] WebGL init failed:', e.message);
          window[engineKey + '_failed'] = true;
        }
      }

      // ── Cleanup on unmount ──
      function destroyEngine() {
        var engine = window[engineKey];
        if (engine) {
          engine.clearWorld();
          // Dispose particles
          if (engine._particles) engine._particles.forEach(function(p) { engine.scene.remove(p); p.geometry.dispose(); p.material.dispose(); });
          // Dispose ghost mesh + highlight mesh
          if (engine._ghostMesh) { engine.scene.remove(engine._ghostMesh); engine._ghostMesh.geometry.dispose(); engine._ghostMesh.material.dispose(); }
          if (engine._highlightMesh) { engine.scene.remove(engine._highlightMesh); engine._highlightMesh.geometry.dispose(); engine._highlightMesh.material.dispose(); }
          // Dispose dimension lines + selection glows
          if (engine._dimLines) engine._dimLines.forEach(function(obj) { engine.scene.remove(obj); if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); });
          if (engine._selectionGlows) engine._selectionGlows.forEach(function(g) { engine.scene.remove(g); g.geometry.dispose(); g.material.dispose(); });
          if (engine._gridHelper) { engine.scene.remove(engine._gridHelper); engine._gridHelper.geometry.dispose(); engine._gridHelper.material.dispose(); }
          if (engine._dimTimer) clearTimeout(engine._dimTimer);
          // Dispose sky elements
          if (engine._sunSprite) engine.scene.remove(engine._sunSprite);
          if (engine._cloudPlane) engine.scene.remove(engine._cloudPlane);
          // Dispose material cache
          if (engine._matCache) Object.values(engine._matCache).forEach(function(m) { if (m.dispose) m.dispose(); });
          if (engine.renderer) { engine.renderer.dispose(); }
          delete window[engineKey];
        }
      }

      // ── Auto-show lesson intro on first load ──
      if (threeReady && !worldActive && !showLessonIntro && !d._introShownOnce) {
        upd({ showLessonIntro: true, _introShownOnce: true });
      }

      // ── Typewriter effect: auto-advance character position ──
      if (showNpcDialog && npcTypewriterNpc === dialogNpcIdx) {
        var eng = window[engineKey];
        var npcData = eng && eng.npcs && eng.npcs[dialogNpcIdx] && eng.npcs[dialogNpcIdx].data;
        var dialogueLen = npcData ? (npcData.dialogue || '').length : 0;
        if (npcTypewriterPos < dialogueLen) {
          clearTimeout(window._gwTypewriterTimer);
          window._gwTypewriterTimer = setTimeout(function() {
            upd('npcTypewriterPos', Math.min(npcTypewriterPos + 2, dialogueLen)); // 2 chars per tick for speed
          }, 25); // ~80 chars/sec
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── Render ──
      // ══════════════════════════════════════════════════════════

      // Mobile detection — friendly message for touch devices
      var isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent) || (window.innerWidth < 768 && 'ontouchstart' in window);
      if (isMobile && !d._mobileDismissed) {
        return el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: '#94a3b8', background: 'linear-gradient(180deg, #0f172a 0%, #1e1b3a 100%)', padding: '24px', textAlign: 'center' } },
          el('div', { style: { fontSize: '48px' } }, '\uD83D\uDCF1'),
          el('div', { style: { fontSize: '18px', fontWeight: 800, color: '#e2e8f0' } }, 'Desktop Recommended'),
          el('div', { style: { fontSize: '13px', color: '#94a3b8', maxWidth: '320px', lineHeight: 1.6 } },
            'Geometry World uses a 3D engine with mouse + keyboard controls (WASD, pointer lock). For the best experience, open this on a laptop or desktop computer.'),
          el('div', { style: { fontSize: '11px', color: '#64748b', maxWidth: '280px', lineHeight: 1.5 } },
            'Touch controls are available! Swipe the right side to look, use the left joystick to move, and tap the action buttons to build, break, measure, and talk to NPCs.'),
          el('button', {
            onClick: function() { upd('_mobileDismissed', true); },
            style: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '8px' }
          }, 'Try Anyway \u2192'),
          el('button', {
            onClick: function() { upd('_mobileDismissed', true); },
            style: { background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }
          }, 'I\u2019m on a tablet with keyboard')
        );
      }

      if (!threeReady) {
        var loadingTips = [
          '\uD83D\uDCA1 Tip: Use WASD to move and the mouse to look around!',
          '\uD83D\uDCA1 Tip: Press M while looking at a structure to measure its volume.',
          '\uD83D\uDCA1 Tip: Walk up to purple characters and press E to talk to them.',
          '\uD83D\uDCA1 Tip: Right-click on a block face to place a new block.',
          '\uD83D\uDCA1 Tip: Volume = Length \u00d7 Width \u00d7 Height. Count the blocks!',
          '\uD83D\uDCA1 Tip: Use the scroll wheel to switch between block types.',
          '\uD83D\uDCA1 Tip: Press Q to cycle between cube, half-block, and quarter-wedge shapes.',
          '\uD83D\uDCA1 Tip: Try the Geometry Garden lesson for a relaxing exploration experience!'
        ];
        var tipIdx = Math.floor(Date.now() / 4000) % loadingTips.length;
        return el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: '#94a3b8', background: 'linear-gradient(180deg, #0f172a 0%, #1e1b3a 100%)' } },
          // Animated blocks
          el('div', { style: { display: 'flex', gap: '8px', marginBottom: '8px' } },
            ['\uD83E\uDDF1', '\uD83D\uDC8E', '\uD83C\uDFC6', '\uD83E\uDDF1'].map(function(em, ei) {
              return el('span', { key: ei, style: { fontSize: '32px', animation: 'pulse 1.5s infinite', animationDelay: (ei * 0.2) + 's', opacity: 0.3 + (ei * 0.2) } }, em);
            })
          ),
          el('div', { style: { fontSize: '18px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.5px' } }, '\uD83C\uDF0D Geometry World'),
          el('div', { style: { fontSize: '13px', color: '#7c3aed', fontWeight: 600 } }, 'Loading 3D engine...'),
          // Progress bar animation
          el('div', { style: { width: '200px', height: '4px', background: 'rgba(100,116,139,0.2)', borderRadius: '4px', overflow: 'hidden' } },
            el('div', { style: { width: '60%', height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '4px', animation: 'pulse 1.5s infinite' } })
          ),
          // Rotating tip
          el('div', { style: { fontSize: '11px', color: '#64748b', maxWidth: '300px', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 } }, loadingTips[tipIdx])
        );
      }

      // ── Helper: parse AI JSON response ──
      function parseAiJson(result) {
        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        // Handle cases where AI wraps in extra text
        var start = cleaned.indexOf('{');
        var end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) cleaned = cleaned.substring(start, end + 1);
        return JSON.parse(cleaned);
      }

      // ── Helper: save lesson to localStorage library ──
      function saveToMyLessons(lesson) {
        try {
          var lib = JSON.parse(localStorage.getItem('gw_my_lessons') || '[]');
          lesson._savedAt = Date.now();
          lesson._id = 'ai_' + Date.now();
          lib.unshift(lesson);
          if (lib.length > 20) lib = lib.slice(0, 20); // Keep last 20
          localStorage.setItem('gw_my_lessons', JSON.stringify(lib));
        } catch(e) { console.warn('[GeoWorld] Failed to save lesson:', e); }
      }
      function getMyLessons() {
        try { return JSON.parse(localStorage.getItem('gw_my_lessons') || '[]'); } catch(e) { return []; }
      }
      function deleteMyLesson(id) {
        try {
          var lib = getMyLessons().filter(function(l) { return l._id !== id; });
          localStorage.setItem('gw_my_lessons', JSON.stringify(lib));
        } catch(e) {}
      }

      // ── Multi-pass AI generation handler ──
      // ── Load a lesson by key (used from intro screen, dropdown, Next Lesson) ──
      function loadLessonByKey(lessonKey) {
        var eng = window[engineKey];
        if (eng && SAMPLE_LESSONS[lessonKey]) {
          eng.loadLesson(SAMPLE_LESSONS[lessonKey]);
        } else if (lessonKey && lessonKey.indexOf('ai_') === 0) {
          var myL = getMyLessons();
          var found = myL.filter(function(l) { return l._id === lessonKey; })[0];
          if (found && eng) { eng.loadLesson(found); upd({ lastGeneratedLesson: found, lessonEditorJson: JSON.stringify(found, null, 2) }); }
        }
        upd({ showLessonIntro: false, showReflection: false, measureHistory: [] });
      }

      var generateWorld = function() {
        if (!callGemini || !aiPrompt.trim()) return;
        var passes = aiPassCount;
        var grade = aiGradeLevel;
        upd({ aiGenerating: true, aiCurrentPass: 1 });

        // Pass 1: Generate base lesson
        var p1Prompt = AI_WORLD_PROMPT_BASE.replace(/\{TOPIC\}/g, aiPrompt.trim()).replace(/\{GRADE\}/g, grade);
        callGemini(p1Prompt, true).then(function(r1) {
          var lesson;
          try { lesson = parseAiJson(r1); } catch(e) {
            if (addToast) addToast('Pass 1 failed: ' + e.message, 'error');
            upd({ aiGenerating: false, aiCurrentPass: 0 }); return;
          }

          if (passes <= 1) {
            // Single pass — load directly
            finishGeneration(lesson);
            return;
          }

          // Pass 2: Refine (improve structures, fix issues, enrich dialogues)
          upd('aiCurrentPass', 2);
          var p2Prompt = AI_REFINE_PROMPT
            .replace('{LESSON_JSON}', JSON.stringify(lesson, null, 2))
            .replace('{REFINEMENT}', 'Improve and polish the lesson: make structures more visually interesting, ensure NPC dialogues explain concepts clearly before asking questions, add descriptive objectives, and verify all coordinates are valid.');
          callGemini(p2Prompt, true).then(function(r2) {
            try { lesson = parseAiJson(r2); } catch(e) { /* keep pass 1 result */ }

            if (passes <= 2) {
              finishGeneration(lesson);
              return;
            }

            // Pass 3: Add scaffolded follow-up questions
            upd('aiCurrentPass', 3);
            var p3Prompt = AI_FOLLOWUP_PROMPT.replace('{LESSON_JSON}', JSON.stringify(lesson, null, 2));
            callGemini(p3Prompt, true).then(function(r3) {
              try { lesson = parseAiJson(r3); } catch(e) { /* keep pass 2 result */ }
              finishGeneration(lesson);
            }).catch(function() { finishGeneration(lesson); });
          }).catch(function() { finishGeneration(lesson); });
        }).catch(function(e) {
          if (addToast) addToast('AI generation failed: ' + (e.message || 'unknown error'), 'error');
          upd({ aiGenerating: false, aiCurrentPass: 0 });
        });
      };

      // ── Validate & sanitize AI-generated lesson JSON ──
      function validateLesson(lesson) {
        if (!lesson || typeof lesson !== 'object') return null;
        // Ensure required fields
        lesson.title = lesson.title || 'AI Lesson';
        lesson.description = lesson.description || '';
        lesson.spawnPoint = Array.isArray(lesson.spawnPoint) && lesson.spawnPoint.length >= 3 ? lesson.spawnPoint : [2, 3, 2];
        lesson.objectives = Array.isArray(lesson.objectives) ? lesson.objectives : ['Explore the structures', 'Answer NPC questions'];
        lesson.ground = lesson.ground || { xMin: -4, xMax: 24, zMin: -4, zMax: 24, y: 0, type: 'grass' };
        if (!Array.isArray(lesson.structures)) lesson.structures = [];
        if (!Array.isArray(lesson.npcs)) lesson.npcs = [];
        // Clamp structure coordinates to valid range
        var validBlocks = ['stone','grass','wood','diamond','gold','sand','glass','brick','ice','water','lava','torch'];
        lesson.structures = lesson.structures.filter(function(s) {
          if (!s || s.type !== 'fill') return false;
          s.x1 = Math.max(-4, Math.min(30, Math.round(s.x1 || 0)));
          s.y1 = Math.max(0, Math.min(20, Math.round(s.y1 || 0)));
          s.z1 = Math.max(-4, Math.min(30, Math.round(s.z1 || 0)));
          s.x2 = Math.max(s.x1, Math.min(30, Math.round(s.x2 || s.x1)));
          s.y2 = Math.max(s.y1, Math.min(20, Math.round(s.y2 || s.y1)));
          s.z2 = Math.max(s.z1, Math.min(30, Math.round(s.z2 || s.z1)));
          if (validBlocks.indexOf(s.block) < 0) s.block = 'stone';
          return true;
        });
        // Validate NPCs
        lesson.npcs = lesson.npcs.filter(function(n) {
          if (!n || !n.name) return false;
          n.position = Array.isArray(n.position) && n.position.length >= 3 ? n.position.map(function(v) { return Math.max(-4, Math.min(30, Math.round(v || 0))); }) : [5, 2, 5];
          n.color = typeof n.color === 'number' ? n.color : 8048861;
          n.dialogue = n.dialogue || 'Hello!';
          // Validate question structure
          if (n.question) {
            if (!n.question.text || !Array.isArray(n.question.choices) || n.question.choices.length < 2) {
              n.question = null; // Drop malformed questions
            } else {
              // Ensure exactly 3 choices
              while (n.question.choices.length < 3) n.question.choices.push('(other)');
              if (n.question.choices.length > 5) n.question.choices = n.question.choices.slice(0, 5);
              n.question.correct = Math.max(0, Math.min(n.question.choices.length - 1, Math.round(n.question.correct || 0)));
              // Validate followUp if present
              if (Array.isArray(n.question.followUp)) {
                n.question.followUp = n.question.followUp.filter(function(fu) {
                  return fu && fu.text && Array.isArray(fu.choices) && fu.choices.length >= 2;
                }).map(function(fu) {
                  while (fu.choices.length < 3) fu.choices.push('(other)');
                  fu.correct = Math.max(0, Math.min(fu.choices.length - 1, Math.round(fu.correct || 0)));
                  return fu;
                });
                if (n.question.followUp.length === 0) delete n.question.followUp;
              }
            }
          }
          return true;
        });
        var fixes = 0;
        if (lesson.structures.length === 0) { lesson.structures.push({ type: 'fill', x1: 0, y1: 0, z1: 0, x2: 8, y2: 0, z2: 8, block: 'stone' }); fixes++; }
        if (lesson.npcs.length === 0) { lesson.npcs.push({ position: [4, 1, 4], name: 'Guide', color: 8048861, dialogue: 'Welcome! Explore the structures and use M to measure.', question: null }); fixes++; }
        if (fixes > 0 && addToast) addToast('\u26A0\uFE0F Fixed ' + fixes + ' issue(s) in AI lesson', 'info');
        return lesson;
      }

      function finishGeneration(lesson) {
        lesson = validateLesson(lesson);
        var eng = window[engineKey];
        if (eng && lesson && lesson.structures.length > 0) {
          eng.loadLesson(lesson);
          saveToMyLessons(lesson);
          upd({ lastGeneratedLesson: lesson, lessonEditorJson: JSON.stringify(lesson, null, 2), aiGenerating: false, aiCurrentPass: 0, activeLesson: 'ai_generated' });
          if (addToast) addToast('\uD83E\uDDF1 AI generated: ' + (lesson.title || 'New World') + ' (' + lesson.npcs.length + ' NPCs, ' + lesson.structures.length + ' structures, saved to My Lessons)', 'success');
          if (typeof awardXP === 'function') awardXP('geometryWorld', 5, 'AI lesson generated');
        } else {
          upd({ aiGenerating: false, aiCurrentPass: 0 });
          if (addToast) addToast('Generated lesson had no valid structures', 'error');
        }
      }

      // ── Refine existing lesson with AI ──
      var refineLesson = function() {
        if (!callGemini || !aiRefinePrompt.trim() || !lastGeneratedLesson) return;
        upd('aiGenerating', true);
        var prompt = AI_REFINE_PROMPT
          .replace('{LESSON_JSON}', JSON.stringify(lastGeneratedLesson, null, 2))
          .replace('{REFINEMENT}', aiRefinePrompt.trim());
        callGemini(prompt, true).then(function(result) {
          try {
            var lesson = parseAiJson(result);
            finishGeneration(lesson);
            if (addToast) addToast('\u2728 Lesson refined!', 'success');
          } catch(e) {
            if (addToast) addToast('Refine failed: ' + e.message, 'error');
            upd('aiGenerating', false);
          }
        }).catch(function() { upd('aiGenerating', false); });
      };

      var engine = window[engineKey];
      var currentLesson = SAMPLE_LESSONS[activeLesson] || SAMPLE_LESSONS.volumeExplorer;

      // Expose current React state to the engine so the compass rAF loop reads live data
      if (engine) engine._answeredRef = answeredNpcs;

      // ── Modal tracking: count all open overlays so students can see/dismiss them all ──
      var OPEN_MODALS = [
        { flag: showNpcDialog,    key: 'showNpcDialog',    label: 'NPC Dialog',            emoji: '💬' },
        { flag: showMyLessons,    key: 'showMyLessons',    label: 'My Lessons',            emoji: '📚' },
        { flag: showLessonEditor, key: 'showLessonEditor', label: 'Lesson Editor',         emoji: '✏️' },
        { flag: showLessonIntro,  key: 'showLessonIntro',  label: 'Lesson Intro',          emoji: '📖' },
        { flag: showReflection,   key: 'showReflection',   label: 'Reflection',            emoji: '🔍' },
        { flag: showHelp,         key: 'showHelp',         label: 'Help',                  emoji: '❓' },
        { flag: showCreatorPanel, key: 'showCreatorPanel', label: 'Creator Panel',         emoji: '🎨' },
        { flag: showGrowthNudge,  key: 'showGrowthNudge',  label: 'Growth Nudge',          emoji: '🌱' },
        { flag: showTeacherView,  key: 'showTeacherView',  label: 'Teacher Dashboard',     emoji: '📊' },
        { flag: showPeerWorlds,   key: 'showPeerWorlds',   label: 'Class Worlds',          emoji: '🌐' }
      ];
      var openModals = OPEN_MODALS.filter(function(m) { return m.flag; });
      function closeAllModals() {
        var patch = {};
        OPEN_MODALS.forEach(function(m) { if (m.flag) patch[m.key] = false; });
        if (Object.keys(patch).length > 0) {
          upd(patch);
          if (addToast) addToast('🎮 Returned to game — ' + Object.keys(patch).length + ' overlay(s) closed', 'info');
          playSfx(sfxJump);
        }
      }

      return el('div', { role: 'application', 'aria-label': 'Geometry World - 3D block-based math explorer. Use WASD to move, mouse to look, left-click to break blocks, right-click to place blocks.', style: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: '#000' } },
        // Top bar — glass style
        el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(100,116,139,0.15)', flexShrink: 0, flexWrap: 'wrap' } },
          el('span', { style: { fontSize: '18px' } }, '\uD83E\uDDF1'),
          el('span', { style: { fontWeight: 800, color: '#fff', fontSize: '14px' } }, 'Geometry World'),
          el('span', { style: { fontSize: '11px', color: '#64748b', marginRight: 'auto' } }, currentLesson.title || ''),
          // Score
          // Block counter
          engine && el('span', { style: { fontSize: '11px', color: '#94a3b8', background: '#1e293b', padding: '2px 8px', borderRadius: '6px' } },
            '\uD83E\uDDF1 ' + (engine.blocksPlaced || 0) + ' placed'
          ),
          // Score with completion indicator
          el('span', { style: { fontSize: '12px', color: score >= totalQ && totalQ > 0 ? '#fbbf24' : '#4ade80', fontWeight: 700, transition: 'transform 0.2s ease', display: 'inline-block', transform: d._scorePulse && Date.now() - d._scorePulse < 500 ? 'scale(1.3)' : 'scale(1)' } },
            (score >= totalQ && totalQ > 0 ? '\uD83C\uDFC6 ' : '\u2B50 ') + score + '/' + totalQ
          ),
          // Achievement badges earned
          Object.keys(earnedBadges).length > 0 && el('div', {
            style: { display: 'flex', gap: '2px', alignItems: 'center', fontSize: '14px', background: '#1e293b', padding: '2px 6px', borderRadius: '6px', cursor: 'default' },
            title: Object.keys(earnedBadges).length + ' badges earned: ' + ACHIEVEMENTS.filter(function(a) { return earnedBadges[a.id]; }).map(function(a) { return a.name; }).join(', ')
          },
            ACHIEVEMENTS.filter(function(a) { return earnedBadges[a.id]; }).map(function(a) {
              return el('span', { key: a.id, title: a.name + ': ' + a.desc, style: { opacity: 1 } }, a.icon);
            })
          ),
          // Badge notification popup
          lastBadgeNotification && el('div', {
            style: { position: 'absolute', top: '44px', left: '50%', transform: 'translateX(-50%)', zIndex: 25,
              background: 'linear-gradient(135deg, #4c1d95, #7c3aed)', border: '2px solid #a78bfa',
              borderRadius: '12px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)', animation: 'fadeIn 0.3s ease-out' }
          },
            el('span', { style: { fontSize: '28px' } }, lastBadgeNotification.icon),
            el('div', null,
              el('div', { style: { fontSize: '12px', fontWeight: 800, color: '#e2e8f0' } }, '\uD83C\uDF89 Achievement Unlocked!'),
              el('div', { style: { fontSize: '14px', fontWeight: 700, color: '#fbbf24' } }, lastBadgeNotification.name),
              el('div', { style: { fontSize: '11px', color: '#c4b5fd' } }, lastBadgeNotification.desc)
            )
          ),
          // Measure result
          measureResult && el('div', { style: { display: 'flex', flexDirection: 'column', gap: '1px', fontSize: '11px', color: '#22d3ee', background: '#0c4a6e', padding: '4px 10px', borderRadius: '6px', lineHeight: 1.3 } },
            el('div', { style: { fontWeight: 700 } }, '\uD83D\uDCCF Measurement'),
            el('div', null, 'L=' + measureResult.L + ' W=' + measureResult.W + ' H=' + measureResult.H),
            el('div', { style: { fontFamily: 'monospace', color: measureResult.hasFractions ? '#fbbf24' : '#4ade80' } },
              measureResult.hasFractions
                ? 'Volume = ' + measureResult.formattedVolume + ' cubic units'
                : 'V = ' + measureResult.L + ' \u00d7 ' + measureResult.W + ' \u00d7 ' + measureResult.H + ' = ' + measureResult.boundingVolume
            ),
            el('div', { style: { fontSize: '10px', color: '#94a3b8' } },
              measureResult.count + ' blocks' + (measureResult.hasFractions
                ? ' (' + Object.keys(measureResult.shapeCounts).map(function(s) {
                    var sd = BLOCK_SHAPES.find(function(bs) { return bs.id === s; });
                    return measureResult.shapeCounts[s] + '\u00d7' + (sd ? sd.fraction : '1');
                  }).join(' + ') + ')'
                : measureResult.count !== measureResult.boundingVolume ? ' (non-rectangular)' : ' \u2713')
            ),
            el('button', {
              onClick: function() {
                var card = generateManipulativeCard(measureResult, currentLesson.title);
                var win = window.open('', '_blank');
                if (win) { win.document.write(card); win.document.close(); win.print(); }
                if (addToast) addToast('\uD83E\uDDF1 Build card ready to print!', 'success');
                var eng = window[engineKey];
                if (eng && eng.logEvent) eng.logEvent('manipulative_card', { L: measureResult.L, W: measureResult.W, H: measureResult.H, V: measureResult.boundingVolume });
              },
              title: 'Print a card to build this structure with physical cubes',
              style: { background: '#7c3aed', border: 'none', borderRadius: '4px', padding: '2px 8px', color: '#fff', fontSize: '10px', cursor: 'pointer', fontWeight: 700, marginTop: '2px' }
            }, '\uD83E\uDDF1 Build This!')
          ),
          // Lesson selector (built-in + AI-generated)
          el('select', {
            'aria-label': 'Choose lesson',
            value: activeLesson,
            onChange: function(ev) {
              var lessonKey = ev.target.value;
              upd({ activeLesson: lessonKey, showLessonIntro: true, showReflection: false });
            },
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }
          },
            el('optgroup', { label: 'Built-in Lessons' },
              el('option', { value: 'volumeExplorer' }, '\uD83D\uDCCF Volume Explorer'),
              el('option', { value: 'areaSurface' }, '\uD83D\uDCD0 Area & Surface'),
              el('option', { value: 'buildChallenge' }, '\uD83C\uDFD7\uFE0F Build Challenge'),
              el('option', { value: 'realWorld' }, '\uD83D\uDCE6 Packing & Shipping'),
              el('option', { value: 'geometryGarden' }, '\uD83C\uDF3F The Geometry Garden'),
              el('option', { value: 'compositeVolume' }, '\uD83E\uDDE9 Composite Volume'),
              el('option', { value: 'fractionVolume' }, '\u00BD Fractional Dimensions'),
              el('option', { value: 'volumeEstimation' }, '\uD83C\uDFAF Volume Estimation'),
              el('option', { value: 'fractionBuilder' }, '\u00BD Fraction Builder'),
              el('option', { value: 'base10Blocks' }, '\uD83E\uDDF1 Base 10 Place Value'),
              el('option', { value: 'fluencyMaze' }, '\uD83C\uDFAF Volume Fluency Maze')
            ),
            getMyLessons().length > 0 && el('optgroup', { label: '\uD83E\uDD16 AI-Generated (' + getMyLessons().length + ')' },
              getMyLessons().slice(0, 5).map(function(ml) {
                return el('option', { key: ml._id, value: ml._id }, '\u2728 ' + (ml.title || 'Untitled').slice(0, 30));
              })
            )
          ),
          // Home language selector (multilingual NPC voices)
          el('select', {
            'aria-label': 'Student home language for bilingual NPC speech',
            value: homeLang,
            onChange: function(ev) { upd({ homeLang: ev.target.value, npcTranslations: {} }); },
            title: 'Student home language \u2014 NPCs will speak bilingually',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', color: homeLang !== 'en' ? '#fbbf24' : '#e2e8f0', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }
          },
            el('option', { value: 'en' }, '\uD83C\uDDFA\uD83C\uDDF8 English'),
            el('option', { value: 'es' }, '\uD83C\uDDEA\uD83C\uDDF8 Espa\u00f1ol'),
            el('option', { value: 'fr' }, '\uD83C\uDDEB\uD83C\uDDF7 Fran\u00e7ais'),
            el('option', { value: 'ar' }, '\uD83C\uDDF8\uD83C\uDDE6 \u0627\u0644\u0639\u0631\u0628\u064A\u0629'),
            el('option', { value: 'so' }, '\uD83C\uDDF8\uD83C\uDDF4 Soomaali'),
            el('option', { value: 'pt' }, '\uD83C\uDDE7\uD83C\uDDF7 Portugu\u00eas'),
            el('option', { value: 'vi' }, '\uD83C\uDDFB\uD83C\uDDF3 Ti\u1EBFng Vi\u1EC7t'),
            el('option', { value: 'zh' }, '\uD83C\uDDE8\uD83C\uDDF3 \u4E2D\u6587'),
            el('option', { value: 'sw' }, '\uD83C\uDDF0\uD83C\uDDEA Kiswahili')
          ),
          // Help toggle
          el('button', {
            onClick: function() { upd('showHelp', !showHelp); },
            style: { background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }
          }, showHelp ? 'Hide Help' : '? Help'),
          // Sound mute toggle
          el('button', {
            onClick: function() {
              var newMuted = !soundMuted;
              upd('soundMuted', newMuted);
              // Actually mute/unmute the audio context
              var ac = getAC();
              if (ac) {
                if (newMuted) { ac.suspend(); } else { ac.resume(); }
              }
              if (addToast) addToast(newMuted ? '\uD83D\uDD07 Sound muted' : '\uD83D\uDD0A Sound on', 'info');
            },
            title: soundMuted ? 'Unmute sounds' : 'Mute all sounds',
            'aria-label': soundMuted ? 'Unmute sounds' : 'Mute all sounds',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', color: soundMuted ? '#ef4444' : '#94a3b8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, soundMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A'),
          // Environment preset selector
          el('select', {
            'aria-label': 'Time of day / environment preset',
            value: d.envPreset || 'day',
            onChange: function(ev) {
              var key = ev.target.value;
              upd('envPreset', key);
              var eng = window[engineKey];
              if (eng) applyEnvPreset(eng, key);
            },
            title: 'Time of day / environment',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer' }
          },
            Object.keys(ENV_PRESETS).map(function(k) {
              return el('option', { key: k, value: k }, ENV_PRESETS[k].label);
            })
          ),
          // Auto day/night cycle toggle
          el('button', {
            onClick: function() { upd('autoCycle', !(d.autoCycle || false)); },
            title: d.autoCycle ? 'Stop auto day/night cycle' : 'Start auto day/night cycle (changes every 60s)',
            style: { background: d.autoCycle ? '#f59e0b' : '#1e293b', border: '1px solid ' + (d.autoCycle ? '#fbbf24' : '#334155'), borderRadius: '6px', padding: '3px 6px', color: d.autoCycle ? '#000' : '#f59e0b', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }
          }, d.autoCycle ? '\u2600\uFE0F\u27F3' : '\u2600\uFE0F'),
          // Save/Export world
          engine && el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng) return;
              var worldData = { title: 'Student Build', blocks: [] };
              Object.keys(eng.blocks).forEach(function(key) {
                var m = eng.blocks[key];
                if (m && m.userData.gridPos) {
                  worldData.blocks.push({ x: m.userData.gridPos.x, y: m.userData.gridPos.y, z: m.userData.gridPos.z, type: m.userData.blockType });
                }
              });
              var json = JSON.stringify(worldData, null, 2);
              var blob = new Blob([json], { type: 'application/json' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob); a.download = 'geometry_world_' + new Date().toISOString().slice(0, 10) + '.json';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
              if (addToast) addToast('\uD83D\uDCBE World exported!', 'success');
            },
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDCBE Save'),
          // 3D Print Export (STL)
          engine && el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng) return;
              var blockKeys = Object.keys(eng.blocks).filter(function(k) {
                var m = eng.blocks[k]; return m && m.userData.gridPos && m.userData.blockType !== 'grass';
              });
              if (blockKeys.length === 0) { if (addToast) addToast('No structures to export (ground blocks are excluded)', 'error'); return; }

              // Build STL binary — each block face = 2 triangles, only render exposed faces
              var faces = [];
              blockKeys.forEach(function(key) {
                var m = eng.blocks[key];
                var p = m.userData.gridPos;
                var x = p.x, y = p.y, z = p.z;
                // Check 6 neighbors — only add face if neighbor is empty
                var dirs = [
                  { dx: 1, dy: 0, dz: 0, n: [1,0,0], verts: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
                  { dx:-1, dy: 0, dz: 0, n: [-1,0,0], verts: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
                  { dx: 0, dy: 1, dz: 0, n: [0,1,0], verts: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
                  { dx: 0, dy:-1, dz: 0, n: [0,-1,0], verts: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
                  { dx: 0, dy: 0, dz: 1, n: [0,0,1], verts: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
                  { dx: 0, dy: 0, dz:-1, n: [0,0,-1], verts: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] }
                ];
                dirs.forEach(function(d) {
                  var nk = (x+d.dx)+','+(y+d.dy)+','+(z+d.dz);
                  var neighbor = eng.blocks[nk];
                  if (!neighbor || (neighbor.userData.blockType === 'grass')) {
                    // Add two triangles for this face
                    var v = d.verts.map(function(vt) { return [x+vt[0], y+vt[1], z+vt[2]]; });
                    faces.push({ n: d.n, v: [v[0], v[1], v[2]] });
                    faces.push({ n: d.n, v: [v[0], v[2], v[3]] });
                  }
                });
              });

              // Write binary STL
              var numTriangles = faces.length;
              var bufferSize = 84 + numTriangles * 50;
              var buffer = new ArrayBuffer(bufferSize);
              var view = new DataView(buffer);
              // Header (80 bytes)
              var header = 'AlloFlow Geometry World - 3D Print Export';
              for (var hi = 0; hi < 80; hi++) view.setUint8(hi, hi < header.length ? header.charCodeAt(hi) : 0);
              // Triangle count
              view.setUint32(80, numTriangles, true);
              // Triangles
              var offset = 84;
              faces.forEach(function(face) {
                // Normal
                view.setFloat32(offset, face.n[0], true); offset += 4;
                view.setFloat32(offset, face.n[1], true); offset += 4;
                view.setFloat32(offset, face.n[2], true); offset += 4;
                // Vertices
                for (var vi = 0; vi < 3; vi++) {
                  view.setFloat32(offset, face.v[vi][0], true); offset += 4;
                  view.setFloat32(offset, face.v[vi][1], true); offset += 4;
                  view.setFloat32(offset, face.v[vi][2], true); offset += 4;
                }
                // Attribute byte count
                view.setUint16(offset, 0, true); offset += 2;
              });

              var blob = new Blob([buffer], { type: 'application/octet-stream' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'geometry_world_' + new Date().toISOString().slice(0, 10) + '.stl';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
              if (addToast) addToast('\uD83E\uDE78 STL exported! ' + blockKeys.length + ' blocks \u2192 ' + numTriangles + ' triangles. Ready for 3D printing!', 'success');
              if (eng.logEvent) eng.logEvent('stl_export', { blocks: blockKeys.length, triangles: numTriangles });
            },
            title: 'Export structures as STL file for 3D printing',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#f472b6', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83E\uDE78 3D Print'),
          // Screenshot capture
          engine && el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng || !eng.renderer) return;
              eng.renderer.render(eng.scene, eng.camera); // force render
              var dataUrl = eng.renderer.domElement.toDataURL('image/png');
              var a = document.createElement('a');
              a.href = dataUrl;
              a.download = 'geometry_world_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.png';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              if (addToast) addToast('\uD83D\uDCF8 Screenshot saved!', 'success');
              if (eng.logEvent) eng.logEvent('screenshot', { timestamp: Date.now() });
            },
            title: 'Capture a screenshot of your world',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#60a5fa', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDCF8 Photo'),
          // Print companion worksheet
          el('button', {
            onClick: function() {
              var worksheet = generateWorksheetHTML(currentLesson);
              var win = window.open('', '_blank');
              if (win) { win.document.write(worksheet); win.document.close(); win.print(); }
              if (addToast) addToast('\uD83D\uDDA8\uFE0F Worksheet ready to print!', 'success');
              var eng = window[engineKey];
              if (eng && eng.logEvent) eng.logEvent('worksheet_print', { lesson: currentLesson.title });
            },
            title: 'Print companion worksheet for this lesson',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#f59e0b', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDDA8\uFE0F Worksheet'),
          // Creator Mode toggle
          el('button', {
            onClick: function() { upd('creatorMode', !creatorMode); if (!creatorMode && addToast) addToast('\uD83C\uDFA8 Creator Mode ON \u2014 build a lesson for your classmates!', 'info'); },
            style: { background: creatorMode ? '#7c3aed' : '#1e293b', border: '1px solid ' + (creatorMode ? '#a78bfa' : '#334155'), borderRadius: '6px', padding: '4px 10px', color: creatorMode ? '#fff' : '#a78bfa', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }
          }, creatorMode ? '\uD83C\uDFA8 Creating...' : '\uD83C\uDFA8 Create'),
          // Load World (import JSON)
          el('button', {
            onClick: function() {
              var input = document.createElement('input');
              input.type = 'file'; input.accept = '.json';
              input.onchange = function(ev) {
                var file = ev.target.files && ev.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function(e2) {
                  try {
                    var worldData = JSON.parse(e2.target.result);
                    var eng = window[engineKey];
                    if (eng) {
                      // Check if it's a full lesson (has structures/npcs) or a raw block export
                      if (worldData.structures || worldData.npcs) {
                        eng.loadLesson(worldData);
                        if (addToast) addToast('\uD83C\uDF0D Loaded: ' + (worldData.title || 'World'), 'success');
                      } else if (worldData.blocks) {
                        eng.clearWorld();
                        eng.scene.background.setRGB(0.53, 0.81, 0.92);
                        worldData.blocks.forEach(function(b) { eng.placeBlock(b.x, b.y, b.z, b.type || 'stone'); });
                        if (addToast) addToast('\uD83C\uDF0D Loaded ' + worldData.blocks.length + ' blocks', 'success');
                      }
                      if (eng.logEvent) eng.logEvent('world_import', { title: worldData.title || 'imported', blockCount: (worldData.blocks || []).length });
                    }
                  } catch (err) {
                    if (addToast) addToast('Failed to load world: ' + err.message, 'error');
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            },
            title: 'Import a world from JSON file',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDCC2 Load'),
          // Research data export (session analytics as CSV)
          engine && engine.sessionLog && engine.sessionLog.length > 0 && el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng) return;
              eng.logEvent('data_export', { eventCount: eng.sessionLog.length });
              var csv = eng.exportSessionCSV();
              var blob = new Blob([csv], { type: 'text/csv' });
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob); a.download = 'geometry_session_' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.csv';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              URL.revokeObjectURL(a.href);
              if (addToast) addToast('\uD83D\uDCCA Session data exported (' + eng.sessionLog.length + ' events)', 'success');
            },
            title: 'Export session analytics as CSV for research',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#22d3ee', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDCCA Data'),
          // MTSS Progress Report export
          engine && engine.sessionLog && engine.sessionLog.length > 0 && el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng || !eng.generateProgressReport) return;
              var report = eng.exportProgressReport();
              if (addToast) addToast('\uD83D\uDCCB MTSS Report: ' + report.accuracy + ' accuracy \u2192 ' + report.rtiTierSuggestion, 'success');
            },
            title: 'Export MTSS progress monitoring report (RTI tier classification, longitudinal data)',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#4ade80', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDCCB MTSS'),
          // ── Peer Worlds: Share button ──
          sessionCode && engine && el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng) return;
              var worldData = { title: (creatorMode ? 'Custom World' : currentLesson.title) + ' by ' + playerName, blocks: [] };
              Object.keys(eng.blocks).forEach(function(key) {
                var m = eng.blocks[key];
                if (m && m.userData.gridPos && m.userData.blockType !== 'grass') {
                  worldData.blocks.push({ x: m.userData.gridPos.x, y: m.userData.gridPos.y, z: m.userData.gridPos.z, type: m.userData.blockType });
                }
              });
              // Include NPC data if in creator mode
              if (eng.npcs && eng.npcs.length > 0) {
                worldData.npcs = eng.npcs.map(function(n) { return n.data; });
              }
              shareWorldToClass(worldData);
            },
            title: 'Share this world to the class library',
            style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', color: '#c084fc', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83C\uDF10 Share'),
          // ── Peer Worlds: Browse class library ──
          sessionCode && el('button', {
            onClick: loadPeerWorlds,
            title: 'Browse worlds shared by classmates',
            style: { background: showPeerWorlds ? '#7c3aed' : '#1e293b', border: '1px solid ' + (showPeerWorlds ? '#a78bfa' : '#334155'), borderRadius: '6px', padding: '4px 10px', color: showPeerWorlds ? '#fff' : '#c084fc', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
          }, '\uD83D\uDCDA Class Worlds'),
          // ── Collaborative Mode toggle ──
          sessionCode && el('button', {
            onClick: function() {
              if (collabMode) {
                // Stop collab mode
                if (collabUnsubscribe) collabUnsubscribe();
                var eng = window[engineKey];
                if (eng && eng._collabPosInterval) clearInterval(eng._collabPosInterval);
                upd({ collabMode: false, collabUnsubscribe: null, collabPlayers: {} });
                if (addToast) addToast('\uD83D\uDC65 Collaborative mode OFF', 'info');
              } else {
                startCollabMode();
              }
            },
            title: collabMode ? 'Building together \u2014 click to disconnect' : 'Start collaborative building with classmates',
            style: { background: collabMode ? '#059669' : '#1e293b', border: '1px solid ' + (collabMode ? '#34d399' : '#334155'), borderRadius: '6px', padding: '4px 10px', color: collabMode ? '#fff' : '#34d399', fontSize: '11px', cursor: 'pointer', fontWeight: 700, animation: collabMode ? 'none' : 'none' }
          }, collabMode ? '\uD83D\uDC65 Building...' : '\uD83D\uDC65 Collab'),
          // ── Teacher Command Center toggle ──
          isTeacher && sessionCode && el('button', {
            onClick: toggleTeacherView,
            title: showTeacherView ? 'Close teacher dashboard' : 'Open real-time student progress dashboard',
            style: { background: showTeacherView ? '#dc2626' : '#1e293b', border: '1px solid ' + (showTeacherView ? '#f87171' : '#334155'), borderRadius: '6px', padding: '4px 10px', color: showTeacherView ? '#fff' : '#f87171', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }
          }, showTeacherView ? '\uD83D\uDCCA Live!' : '\uD83D\uDCCA Teacher'),
          // ── AI Lesson Generator (enhanced) ──
          callGemini && el('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' } },
            el('input', {
              type: 'text', value: aiPrompt, 'aria-label': 'Describe a geometry lesson topic for AI generation',
              onChange: function(ev) { upd('aiPrompt', ev.target.value); },
              onKeyDown: function(ev) { if (ev.key === 'Enter') generateWorld(); },
              placeholder: 'Describe a lesson topic...',
              style: { width: '150px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit' }
            }),
            // Grade level selector
            el('select', {
              'aria-label': 'Target grade level', value: aiGradeLevel,
              onChange: function(ev) { upd('aiGradeLevel', ev.target.value); },
              style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 4px', color: '#94a3b8', fontSize: '10px' }
            },
              el('option', { value: '3' }, 'Gr 3'), el('option', { value: '4' }, 'Gr 4'),
              el('option', { value: '5' }, 'Gr 5'), el('option', { value: '6' }, 'Gr 6'),
              el('option', { value: '7' }, 'Gr 7'), el('option', { value: '8' }, 'Gr 8')
            ),
            // Depth (API calls) selector
            el('select', {
              'aria-label': 'Generation depth: number of AI passes', value: String(aiPassCount),
              onChange: function(ev) { upd('aiPassCount', parseInt(ev.target.value)); },
              title: '1=Quick (1 call), 2=Refined (2 calls), 3=Full scaffolding (3 calls)',
              style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '3px 4px', color: '#94a3b8', fontSize: '10px' }
            },
              el('option', { value: '1' }, '\u26A1 Quick'), el('option', { value: '2' }, '\u2728 Refine'), el('option', { value: '3' }, '\uD83C\uDF1F Full')
            ),
            // Generate button (shows pass progress)
            el('button', {
              onClick: generateWorld, disabled: aiGenerating || !aiPrompt.trim(),
              style: { background: aiGenerating ? '#334155' : '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, minWidth: '80px' }
            }, aiGenerating ? '\u23F3 Pass ' + aiCurrentPass + '/' + aiPassCount : '\u2728 Generate'),
            // Surprise Me (grade-aware topics)
            el('button', {
              onClick: function() {
                var gradeTopics = {
                  '3': ['counting unit cubes in a toy box', 'how many blocks fill a sandbox?', 'building a doghouse with blocks', 'comparing sizes of gift boxes', 'stacking blocks to make towers of different heights'],
                  '4': ['volume of rectangular prisms with a treasure hunt', 'building animal habitats at a zoo', 'packing lunch boxes with different foods', 'designing bookshelves with specific dimensions', 'a candy factory where each box holds different amounts'],
                  '5': ['comparing volumes of different shipping containers', 'designing rooms in a dream house', 'a museum where each room has a different volume', 'building an aquarium with compartments', 'packing a moving truck efficiently'],
                  '6': ['surface area vs volume of gift-wrapping boxes', 'composite volume shapes in an obstacle course', 'designing a skate park with ramps and half-pipes', 'L-shaped rooms in an architect studio', 'maximizing storage in a warehouse'],
                  '7': ['fractional dimensions in a bakery (half-loaves)', 'volume estimation challenge in a grocery store', 'composite volumes of buildings with additions', 'designing efficient packaging with minimal waste', 'comparing prisms with same volume but different shapes'],
                  '8': ['optimizing surface area to volume ratio for heat loss', 'cross-sections of 3D shapes in an engineering lab', 'volume of composite structures in city planning', 'scaling models proportionally for a science fair', 'designing efficient containers using fractional dimensions']
                };
                var pool = gradeTopics[aiGradeLevel] || gradeTopics['5'];
                upd('aiPrompt', pool[Math.floor(Math.random() * pool.length)]);
              },
              disabled: aiGenerating, title: 'Random topic',
              style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 6px', color: '#fbbf24', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }
            }, '\uD83C\uDFB2'),
            // My Lessons library button
            el('button', {
              onClick: function() { upd('showMyLessons', !showMyLessons); },
              title: 'Browse saved AI-generated lessons',
              style: { background: showMyLessons ? '#7c3aed' : '#1e293b', border: '1px solid ' + (showMyLessons ? '#a78bfa' : '#334155'), borderRadius: '6px', padding: '4px 8px', color: showMyLessons ? '#fff' : '#a78bfa', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }
            }, '\uD83D\uDCDA ' + getMyLessons().length)
          ),
          // ── Refine bar (shown when a lesson was just generated) ──
          callGemini && lastGeneratedLesson && !aiGenerating && el('div', { style: { display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' } },
            el('input', {
              type: 'text', value: aiRefinePrompt, 'aria-label': 'Refine the generated lesson',
              onChange: function(ev) { upd('aiRefinePrompt', ev.target.value); },
              onKeyDown: function(ev) { if (ev.key === 'Enter') refineLesson(); },
              placeholder: 'Refine: "Make it harder" / "Add more NPCs" / "Change theme to ocean"...',
              style: { flex: 1, minWidth: '180px', background: '#1e293b', border: '1px solid #7c3aed33', borderRadius: '6px', padding: '4px 8px', color: '#e2e8f0', fontSize: '10px', fontFamily: 'inherit' }
            }),
            el('button', {
              onClick: refineLesson, disabled: !aiRefinePrompt.trim(),
              style: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }
            }, '\uD83D\uDD04 Refine'),
            el('button', {
              onClick: function() { upd('showLessonEditor', !showLessonEditor); },
              title: 'Edit the raw lesson JSON manually',
              style: { background: showLessonEditor ? '#f59e0b' : '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', color: showLessonEditor ? '#000' : '#f59e0b', fontSize: '10px', cursor: 'pointer', fontWeight: 700 }
            }, '\u270F\uFE0F JSON')
          )
        ),

        // ── LESSON PROGRESS HUD (always visible while playing, hidden when modals cover it) ──
        // Compact status card top-left below the toolbar. Students always see lesson title +
        // NPC progress + blocks placed without opening a menu.
        worldActive && openModals.length === 0 && el('div', {
          style: { position: 'absolute', top: '56px', left: '10px', zIndex: 5, padding: '8px 12px', borderRadius: '10px', background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(6px)', border: '1px solid rgba(124,58,237,0.22)', color: '#e2e8f0', fontSize: '11px', fontWeight: 600, maxWidth: '260px', pointerEvents: 'none' },
          role: 'status', 'aria-live': 'polite', 'aria-label': 'Lesson progress: ' + (currentLesson.title || 'Lesson') + ', ' + Object.keys(answeredNpcs).length + ' of ' + totalQ + ' NPCs answered, ' + ((engine && engine.blocksPlaced) || 0) + ' blocks placed'
        },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
            el('span', { style: { fontSize: '13px' } }, '📐'),
            el('span', { style: { color: '#c4b5fd', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' } }, currentLesson.title || 'Geometry Lesson')
          ),
          el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', fontSize: '10px' } },
            totalQ > 0 && el('span', { title: 'NPCs answered', style: { color: Object.keys(answeredNpcs).length === totalQ ? '#4ade80' : '#94a3b8' } },
              '💬 ' + Object.keys(answeredNpcs).length + '/' + totalQ),
            el('span', { title: 'Blocks placed this session', style: { color: '#fbbf24' } },
              '🧱 ' + ((engine && engine.blocksPlaced) || 0)),
            el('span', { title: 'Session score', style: { color: '#34d399' } },
              '⭐ ' + score)
          ),
          // NPC progress bar (only if there are NPCs in this lesson)
          totalQ > 0 && el('div', { style: { marginTop: '4px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' } },
            el('div', { style: { width: Math.round((Object.keys(answeredNpcs).length / totalQ) * 100) + '%', height: '100%', background: 'linear-gradient(90deg, #7c3aed, #34d399)', transition: 'width 0.4s' } })
          ),
          // ── Objectives checklist (auto-computed from lesson data + live state) ──
          (function() {
            var objectives = [];
            // 1. Lesson's explicit objectives (from lesson JSON)
            if (Array.isArray(currentLesson.objectives) && currentLesson.objectives.length > 0) {
              currentLesson.objectives.forEach(function(text, i) {
                // Heuristic: mark done if all NPCs answered AND at least one block placed
                var done = false;
                if (/answer|talk|ask/i.test(text) && totalQ > 0) done = Object.keys(answeredNpcs).length >= totalQ;
                else if (/build|place|construct/i.test(text)) done = ((engine && engine.blocksPlaced) || 0) >= 1;
                else if (/measure/i.test(text)) done = (measureHistory && measureHistory.length > 0);
                objectives.push({ text: text, done: done });
              });
            } else {
              // 2. Fallback auto-generated objectives from lesson shape
              if (totalQ > 0) objectives.push({ text: 'Answer all ' + totalQ + ' NPC question' + (totalQ === 1 ? '' : 's'), done: Object.keys(answeredNpcs).length >= totalQ });
              if (currentLesson.structures && currentLesson.structures.length > 0) objectives.push({ text: 'Explore the ' + currentLesson.structures.length + ' structures', done: (measureHistory && measureHistory.length > 0) });
              objectives.push({ text: 'Place at least 5 blocks', done: ((engine && engine.blocksPlaced) || 0) >= 5 });
            }
            var allDone = objectives.length > 0 && objectives.every(function(o) { return o.done; });
            return el('div', { style: { marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed rgba(148,163,184,0.2)' } },
              el('div', { style: { fontSize: '9px', fontWeight: 800, color: allDone ? '#4ade80' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '2px' } },
                (allDone ? '✨ ' : '🎯 ') + 'Objectives'),
              objectives.slice(0, 4).map(function(o, i) {
                return el('div', { key: i, style: { display: 'flex', alignItems: 'start', gap: '5px', fontSize: '10px', lineHeight: 1.3, marginBottom: '1px' } },
                  el('span', { style: { color: o.done ? '#4ade80' : '#64748b', flexShrink: 0, fontWeight: 700 } }, o.done ? '☑' : '☐'),
                  el('span', { style: { color: o.done ? '#94a3b8' : '#cbd5e1', textDecoration: o.done ? 'line-through' : 'none' } }, o.text)
                );
              })
            );
          })()
        ),

        // ── NPC COMPASS — live-updating horizontal pip strip centered on camera facing ──
        // Pips colored green (answered) or red (unanswered) help students locate NPCs they've missed.
        // Self-contained: canvas ref boots a rAF loop that reads engine.camera + engine.npcs each frame.
        worldActive && openModals.length === 0 && engine && engine.npcs && engine.npcs.length > 0 && el('canvas', {
          ref: function(cv) {
            if (!cv) return;
            if (cv._compassStarted) return; // guard against React re-render re-initialization
            cv._compassStarted = true;
            var dpr = window.devicePixelRatio || 1;
            var W = 260, H = 32;
            cv.width = W * dpr; cv.height = H * dpr;
            cv.style.width = W + 'px'; cv.style.height = H + 'px';
            var ctx = cv.getContext('2d');
            ctx.scale(dpr, dpr);
            function render() {
              if (!cv.isConnected) return; // canvas removed — stop loop
              if (!window.THREE || !engine || !engine.camera || !engine.npcs) {
                requestAnimationFrame(render);
                return;
              }
              ctx.clearRect(0, 0, W, H);
              // Background pill
              ctx.fillStyle = 'rgba(15,23,42,0.7)';
              if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, W, H, 16); ctx.fill(); }
              else ctx.fillRect(0, 0, W, H);
              ctx.strokeStyle = 'rgba(124,58,237,0.3)'; ctx.lineWidth = 1;
              if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0.5, 0.5, W - 1, H - 1, 16); ctx.stroke(); }
              // Read camera yaw from quaternion (YXZ order gives yaw directly)
              var euler = new window.THREE.Euler().setFromQuaternion(engine.camera.quaternion, 'YXZ');
              var camYaw = euler.y;
              var halfFov = Math.PI; // show full 180° ahead and behind (180° = ±π/2)
              var answered = engine._answeredRef || {};
              // Draw center forward tick
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.moveTo(W / 2, 5); ctx.lineTo(W / 2 - 4, 11); ctx.lineTo(W / 2 + 4, 11);
              ctx.closePath(); ctx.fill();
              // Draw pips for each NPC
              engine.npcs.forEach(function(npc, i) {
                if (!npc || !npc.body) return;
                var dx = npc.body.position.x - engine.camera.position.x;
                var dz = npc.body.position.z - engine.camera.position.z;
                var dist = Math.sqrt(dx * dx + dz * dz);
                // World-frame angle: atan2(-dx, -dz) gives 0 when NPC is directly ahead (−Z forward)
                var worldAngle = Math.atan2(dx, -dz);
                var relAngle = worldAngle - camYaw;
                while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
                while (relAngle < -Math.PI) relAngle += 2 * Math.PI;
                // Only show pips within ±90° field of compass
                if (Math.abs(relAngle) > halfFov / 2) {
                  // Off-compass: draw a small edge arrow
                  var edgeX = relAngle > 0 ? W - 10 : 10;
                  ctx.fillStyle = answered[i] ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.6)';
                  ctx.beginPath();
                  if (relAngle > 0) { ctx.moveTo(edgeX, 16); ctx.lineTo(edgeX - 6, 12); ctx.lineTo(edgeX - 6, 20); }
                  else { ctx.moveTo(edgeX, 16); ctx.lineTo(edgeX + 6, 12); ctx.lineTo(edgeX + 6, 20); }
                  ctx.closePath(); ctx.fill();
                  return;
                }
                var pipX = W / 2 + (relAngle / (halfFov / 2)) * (W / 2 - 12);
                var isAnswered = !!answered[i];
                // Pip — circle for answered (done, closed), square for unanswered (open task)
                // Shape + color + glyph = triple-coded for color-blind accessibility
                ctx.fillStyle = isAnswered ? '#22c55e' : '#ef4444';
                if (isAnswered) {
                  ctx.beginPath(); ctx.arc(pipX, 18, 6, 0, 6.28); ctx.fill();
                } else {
                  ctx.fillRect(pipX - 6, 12, 12, 12); // square = "task open"
                }
                // Inner glyph (third visual channel)
                ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(isAnswered ? '✓' : '?', pipX, 18);
                // Distance dot size hints (closer = bigger) — subtle
                if (dist < 8) {
                  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
                  ctx.beginPath(); ctx.arc(pipX, 18, 8, 0, 6.28); ctx.stroke();
                }
              });
              requestAnimationFrame(render);
            }
            requestAnimationFrame(render);
          },
          style: { position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 5, pointerEvents: 'none', borderRadius: '16px' },
          role: 'img', 'aria-label': 'NPC compass strip showing relative direction to each NPC from camera facing'
        })
        ,

        // ── BLOCK PALETTE HOTBAR — Minecraft-style visible selector at bottom-center ──
        // Shows current block type + shape so students always see what they're placing.
        worldActive && openModals.length === 0 && el('div', {
          style: { position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', pointerEvents: 'none' },
          role: 'toolbar', 'aria-label': 'Block selection palette'
        },
          // Current shape indicator (small strip above block row)
          el('div', { style: { display: 'flex', gap: '3px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)', border: '1px solid rgba(251,191,36,0.3)', fontSize: '9px', fontWeight: 700, color: '#fbbf24', alignItems: 'center', pointerEvents: 'auto', cursor: 'pointer' },
            onClick: function() {
              upd({ selectedShape: (selectedShape + 1) % BLOCK_SHAPES.length, blockRotation: 0 });
              upd('actionFeedback', 'Shape: ' + BLOCK_SHAPES[(selectedShape + 1) % BLOCK_SHAPES.length].name);
            },
            title: 'Click to cycle shape (Q) · ' + BLOCK_SHAPES[selectedShape].desc
          },
            el('span', { style: { fontSize: '13px' } }, BLOCK_SHAPES[selectedShape].emoji),
            el('span', null, BLOCK_SHAPES[selectedShape].name + ' (' + BLOCK_SHAPES[selectedShape].fraction + ' unit)'),
            selectedShape > 0 && el('span', { style: { color: '#94a3b8', fontSize: '8px' } }, '· Q cycle · R rotate')
          ),
          // Block type hotbar (12 blocks, number keys 1-9,0 plus scroll)
          el('div', { style: { display: 'flex', gap: '4px', padding: '6px', borderRadius: '12px', background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(6px)', border: '1px solid rgba(124,58,237,0.3)', pointerEvents: 'auto' } },
            BLOCK_TYPES.map(function(bt, bi) {
              var selected = bi === selectedBlock;
              var keyLabel = bi < 9 ? String(bi + 1) : bi === 9 ? '0' : '';
              return el('button', {
                key: bt.id,
                onClick: function() { upd('selectedBlock', bi); },
                'aria-label': 'Select ' + bt.name + ' block' + (keyLabel ? ' (press ' + keyLabel + ')' : '') + (selected ? ', currently selected' : ''),
                'aria-pressed': selected,
                title: bt.name + (keyLabel ? ' (press ' + keyLabel + ')' : ''),
                style: {
                  position: 'relative',
                  width: '36px', height: '36px',
                  border: selected ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  background: selected ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
                  boxShadow: selected ? '0 0 0 2px rgba(251,191,36,0.2), 0 4px 8px rgba(251,191,36,0.15)' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px',
                  transition: 'all 0.12s'
                }
              },
                bt.emoji,
                // Key hint badge
                keyLabel && el('span', { style: { position: 'absolute', top: '-2px', right: '-2px', background: selected ? '#fbbf24' : 'rgba(15,23,42,0.85)', color: selected ? '#111' : '#94a3b8', fontSize: '8px', fontWeight: 800, width: '13px', height: '13px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.2)' } }, keyLabel)
              );
            })
          ),
          // Current block name label
          el('div', { style: { fontSize: '10px', color: '#cbd5e1', fontWeight: 700, background: 'rgba(15,23,42,0.6)', padding: '2px 8px', borderRadius: '10px', pointerEvents: 'none' } },
            BLOCK_TYPES[selectedBlock].emoji + ' ' + BLOCK_TYPES[selectedBlock].name
          )
        ),

        // ── FLOATING "BACK TO GAME" BUTTON — appears when any modal/overlay is open ──
        // Lets students instantly dismiss all overlays and return to the 3D world.
        // Positioned bottom-center so it doesn't collide with any modal, high z-index so always visible.
        openModals.length > 0 && el('div', {
          style: { position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', pointerEvents: 'none' }
        },
          // Status pill: list of open overlays
          el('div', {
            style: { pointerEvents: 'auto', padding: '4px 10px', borderRadius: '14px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(124,58,237,0.3)', color: '#c4b5fd', fontSize: '10px', fontWeight: 600, maxWidth: '420px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
            title: openModals.length + ' overlay' + (openModals.length === 1 ? '' : 's') + ' open: ' + openModals.map(function(m) { return m.emoji + ' ' + m.label; }).join(', ')
          },
            openModals.length === 1 ? (openModals[0].emoji + ' ' + openModals[0].label + ' open') :
              (openModals.length + ' overlays open: ' + openModals.map(function(m) { return m.emoji; }).join(' '))
          ),
          // Main "Back to Game" button (prominent)
          el('button', {
            onClick: closeAllModals,
            'aria-label': 'Close all open overlays and return to the game view',
            title: 'Close all overlays & return to the 3D game (or press Shift+Esc)',
            style: { pointerEvents: 'auto', padding: '10px 22px', borderRadius: '14px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(124,58,237,0.45), 0 0 0 2px rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'transform 0.15s' },
            onMouseEnter: function(ev) { ev.currentTarget.style.transform = 'scale(1.03)'; },
            onMouseLeave: function(ev) { ev.currentTarget.style.transform = 'scale(1)'; }
          },
            el('span', { style: { fontSize: '18px' } }, '🎮'),
            'Back to Game',
            openModals.length > 1 && el('span', { style: { fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', fontWeight: 700 } }, 'close all ' + openModals.length)
          ),
          // Keyboard hint (subtle)
          el('div', { style: { color: '#64748b', fontSize: '9px', fontWeight: 600 } },
            openModals.length === 1 ? 'Esc also closes this' : 'Esc closes one · Shift+Esc closes all'
          )
        ),

        // Help overlay
        showHelp && el('div', { style: { position: 'absolute', top: '48px', right: '8px', zIndex: 20, background: 'rgba(15,23,42,0.95)', border: '1px solid #334155', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '240px' } },
          el('div', { style: { fontWeight: 700, color: '#a78bfa', marginBottom: '6px', fontSize: '12px' } }, '\uD83C\uDFAE Controls'),
          el('div', { style: { display: 'grid', gridTemplateColumns: '70px 1fr', gap: '2px 8px', marginBottom: '10px' } },
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'WASD'), 'Move around',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'Mouse'), 'Look around',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'L-Click'), 'Break block',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'R-Click'), 'Place block',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'E'), 'Talk to NPC',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'M'), 'Measure structure',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'Space'), 'Jump',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'Shift'), 'Sprint',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, 'Scroll'), 'Cycle blocks',
            el('span', { style: { color: '#7c3aed', fontWeight: 600 } }, '1-9,0'), 'Select block',
            el('span', { style: { color: '#22d3ee', fontWeight: 600 } }, 'Ctrl+Z'), 'Undo',
            el('span', { style: { color: '#22d3ee', fontWeight: 600 } }, 'Ctrl+Y'), 'Redo',
            el('span', { style: { color: '#a78bfa', fontWeight: 600 } }, '2\u00d7Space'), 'Toggle fly (or F key)',
            el('span', { style: { color: '#a78bfa', fontWeight: 600 } }, 'G'), 'Toggle grid',
            el('span', { style: { color: '#fbbf24', fontWeight: 600 } }, 'Q'), 'Cycle shape (\u25A1 \u25E2 \u25AD \u25E3)',
            el('span', { style: { color: '#fbbf24', fontWeight: 600 } }, 'R'), 'Rotate shape 90\u00b0',
            el('span', { style: { color: '#22d3ee', fontWeight: 600 } }, 'T'), 'Ruler (2 points)',
            el('span', { style: { color: '#93c5fd', fontWeight: 600 } }, 'H'), 'Return to spawn',
            el('span', { style: { color: '#94a3b8', fontWeight: 600 } }, 'Esc'), 'Close open overlay',
            el('span', { style: { color: '#94a3b8', fontWeight: 600 } }, 'Shift+Esc'), 'Close ALL overlays'
          ),
          // Mobile touch controls section (shown on touch devices)
          isMobile && el('div', { style: { marginBottom: '8px' } },
            el('div', { style: { fontWeight: 700, color: '#f472b6', marginBottom: '4px', fontSize: '12px' } }, '\uD83D\uDCF1 Touch Controls'),
            el('div', { style: { display: 'grid', gridTemplateColumns: '50px 1fr', gap: '2px 8px', marginBottom: '8px' } },
              el('span', { style: { color: '#f472b6', fontWeight: 600 } }, 'Left'), 'Drag to move (joystick)',
              el('span', { style: { color: '#f472b6', fontWeight: 600 } }, 'Right'), 'Swipe to look around',
              el('span', { style: { color: '#60a5fa', fontWeight: 600 } }, '\u2B06\uFE0F'), 'Jump / fly up',
              el('span', { style: { color: '#22c55e', fontWeight: 600 } }, '\uD83E\uDDF1'), 'Place block',
              el('span', { style: { color: '#ef4444', fontWeight: 600 } }, '\u26CF\uFE0F'), 'Break block',
              el('span', { style: { color: '#fbbf24', fontWeight: 600 } }, '\uD83D\uDCCF'), 'Measure',
              el('span', { style: { color: '#a78bfa', fontWeight: 600 } }, '\uD83D\uDDE3\uFE0F'), 'Talk to NPC',
              el('span', { style: { color: '#fbbf24', fontWeight: 600 } }, '\u21A9'), 'Undo last action'
            )
          ),
          el('div', { style: { fontWeight: 700, color: '#22d3ee', marginBottom: '4px', fontSize: '12px' } }, '\uD83D\uDCCF Formulas'),
          el('div', { style: { background: '#0c4a6e', borderRadius: '6px', padding: '6px 8px', marginBottom: '8px', fontFamily: 'monospace', fontSize: '11px' } },
            el('div', null, 'Volume = L \u00d7 W \u00d7 H'),
            el('div', null, 'Volume = Area \u00d7 Height'),
            el('div', null, 'Area = L \u00d7 W'),
            el('div', { style: { color: '#fbbf24', marginTop: '4px' } }, 'L-Block: V\u2081 + V\u2082 = Total'),
            el('div', { style: { color: '#c084fc', marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '4px' } }, '\u25E2 Shapes & Fractions'),
            el('div', null, '\u25E2 Half (diagonal) = \u00BD'),
            el('div', null, '\u25AD Half (slab) = \u00BD'),
            el('div', null, '\u25E3 Quarter wedge = \u00BC'),
            el('div', null, '2 halves = 1 cube \u2713'),
            el('div', null, '4 quarters = 1 cube \u2713')
          ),
          el('div', { style: { fontWeight: 700, color: '#4ade80', marginBottom: '4px', fontSize: '12px' } }, '\uD83C\uDF31 Tips'),
          el('div', { style: { fontSize: '10px', color: '#94a3b8' } },
            '\u2022 Walk up to NPCs and press E to talk', el('br'),
            '\u2022 Point at a structure and press M to measure', el('br'),
            '\u2022 Right-click to place blocks, left-click to break', el('br'),
            '\u2022 Fill empty pools by placing blocks inside them'
          ),
          // Multilingual math vocabulary (when home language is set)
          homeLang !== 'en' && el('div', { style: { marginTop: '8px' } },
            el('div', { style: { fontWeight: 700, color: '#fbbf24', marginBottom: '4px', fontSize: '12px' } }, '\uD83C\uDF0D Math Words'),
            el('div', { style: { fontSize: '10px', lineHeight: 1.8, background: '#0c4a6e', borderRadius: '6px', padding: '6px 8px' } },
              (function() {
                var MATH_VOCAB = {
                  es: { Volume: 'Volumen', Length: 'Longitud', Width: 'Ancho', Height: 'Altura', 'Cubic units': 'Unidades c\u00fabicas', Area: '\u00c1rea', Block: 'Bloque', Measure: 'Medir' },
                  fr: { Volume: 'Volume', Length: 'Longueur', Width: 'Largeur', Height: 'Hauteur', 'Cubic units': 'Unit\u00e9s cubiques', Area: 'Aire', Block: 'Bloc', Measure: 'Mesurer' },
                  ar: { Volume: '\u0627\u0644\u062D\u062C\u0645', Length: '\u0627\u0644\u0637\u0648\u0644', Width: '\u0627\u0644\u0639\u0631\u0636', Height: '\u0627\u0644\u0627\u0631\u062A\u0641\u0627\u0639', 'Cubic units': '\u0648\u062D\u062F\u0627\u062A \u0645\u0643\u0639\u0628\u0629', Area: '\u0627\u0644\u0645\u0633\u0627\u062D\u0629', Block: '\u0645\u0643\u0639\u0628', Measure: '\u0642\u064A\u0627\u0633' },
                  so: { Volume: 'Mugga', Length: 'Dherer', Width: 'Ballac', Height: 'Joog', 'Cubic units': 'Unugyo kubig', Area: 'Aag', Block: 'Xaashi', Measure: 'Qiyaas' },
                  pt: { Volume: 'Volume', Length: 'Comprimento', Width: 'Largura', Height: 'Altura', 'Cubic units': 'Unidades c\u00fabicas', Area: '\u00c1rea', Block: 'Bloco', Measure: 'Medir' },
                  vi: { Volume: 'Th\u1EC3 t\u00EDch', Length: 'Chi\u1EC1u d\u00E0i', Width: 'Chi\u1EC1u r\u1ED9ng', Height: 'Chi\u1EC1u cao', 'Cubic units': '\u0110\u01A1n v\u1ECB kh\u1ED1i', Area: 'Di\u1EC7n t\u00EDch', Block: 'Kh\u1ED1i', Measure: '\u0110o' },
                  zh: { Volume: '\u4F53\u79EF', Length: '\u957F\u5EA6', Width: '\u5BBD\u5EA6', Height: '\u9AD8\u5EA6', 'Cubic units': '\u7ACB\u65B9\u5355\u4F4D', Area: '\u9762\u79EF', Block: '\u65B9\u5757', Measure: '\u6D4B\u91CF' },
                  sw: { Volume: 'Ujazo', Length: 'Urefu', Width: 'Upana', Height: 'Kimo', 'Cubic units': 'Vipimo vya ujazo', Area: 'Eneo', Block: 'Jiwe', Measure: 'Pima' }
                };
                var vocab = MATH_VOCAB[homeLang] || {};
                return Object.keys(vocab).map(function(eng) {
                  return el('div', { key: eng, style: { display: 'flex', justifyContent: 'space-between' } },
                    el('span', { style: { color: '#94a3b8' } }, eng),
                    el('span', { style: { color: '#fbbf24', fontWeight: 600 } }, vocab[eng])
                  );
                });
              })()
            )
          )
        ),
        // ── My Lessons Library Panel ──
        showMyLessons && el('div', { style: { position: 'absolute', top: '48px', right: '8px', zIndex: 22, background: 'rgba(15,23,42,0.95)', border: '1px solid #7c3aed', borderRadius: '10px', padding: '12px', fontSize: '11px', color: '#cbd5e1', maxWidth: '280px', maxHeight: '320px', overflowY: 'auto' } },
          el('div', { style: { fontWeight: 800, color: '#a78bfa', fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' } },
            '\uD83D\uDCDA My Lessons (' + getMyLessons().length + ')',
            el('button', { 'aria-label': 'Close My Lessons', onClick: function() { upd('showMyLessons', false); }, style: { background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' } }, '\u00d7')
          ),
          getMyLessons().length === 0 && el('div', { style: { color: '#64748b', fontSize: '10px', padding: '12px 0', textAlign: 'center' } }, 'No saved lessons yet. Generate one with AI!'),
          getMyLessons().map(function(lesson, li) {
            return el('div', { key: lesson._id || li, style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px', borderRadius: '6px', background: 'rgba(30,41,59,0.5)', marginBottom: '4px', border: '1px solid rgba(100,116,139,0.15)' } },
              el('div', { style: { flex: 1, minWidth: 0 } },
                el('div', { style: { fontWeight: 700, fontSize: '11px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, lesson.title || 'Untitled'),
                el('div', { style: { fontSize: '9px', color: '#64748b' } },
                  (lesson.npcs || []).length + ' NPCs \u2022 ' + (lesson.structures || []).length + ' structures' + (lesson._savedAt ? ' \u2022 ' + new Date(lesson._savedAt).toLocaleDateString() : ''))
              ),
              el('button', {
                onClick: function() {
                  var eng = window[engineKey];
                  if (eng) { eng.loadLesson(lesson); upd({ showMyLessons: false, lastGeneratedLesson: lesson, lessonEditorJson: JSON.stringify(lesson, null, 2), activeLesson: 'ai_generated' }); }
                },
                style: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }
              }, '\u25B6'),
              el('button', {
                onClick: function() { deleteMyLesson(lesson._id); upd('showMyLessons', true); /* force re-render */ },
                title: 'Delete this saved lesson',
                style: { background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', flexShrink: 0, padding: '2px' }
              }, '\u00d7')
            );
          })
        ),
        // ── JSON Lesson Editor Panel ──
        showLessonEditor && lastGeneratedLesson && el('div', { style: { position: 'absolute', top: '48px', left: '50%', transform: 'translateX(-50%)', zIndex: 26, background: 'rgba(15,23,42,0.97)', border: '2px solid #f59e0b', borderRadius: '12px', padding: '14px', width: '400px', maxHeight: '400px', fontSize: '11px' } },
          el('div', { style: { fontWeight: 800, color: '#f59e0b', fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            '\u270F\uFE0F Lesson JSON Editor',
            el('button', { 'aria-label': 'Close editor', onClick: function() { upd('showLessonEditor', false); }, style: { background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' } }, '\u00d7')
          ),
          el('p', { style: { color: '#94a3b8', fontSize: '9px', margin: '0 0 6px', lineHeight: 1.3 } }, 'Edit the lesson JSON directly. Change NPC dialogue, add questions, move structures. Click Apply to reload.'),
          el('textarea', {
            value: lessonEditorJson,
            onChange: function(ev) { upd('lessonEditorJson', ev.target.value); },
            style: { width: '100%', height: '250px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#e2e8f0', fontSize: '10px', fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.4 },
            spellCheck: false
          }),
          el('div', { style: { display: 'flex', gap: '6px', marginTop: '6px' } },
            el('button', {
              onClick: function() {
                try {
                  var lesson = JSON.parse(lessonEditorJson);
                  var eng = window[engineKey];
                  if (eng && lesson.structures) {
                    eng.loadLesson(lesson);
                    saveToMyLessons(lesson);
                    upd({ lastGeneratedLesson: lesson, showLessonEditor: false });
                    if (addToast) addToast('\u2705 Lesson applied and saved!', 'success');
                  }
                } catch(e) {
                  if (addToast) addToast('\u274C Invalid JSON: ' + e.message, 'error');
                }
              },
              style: { flex: 1, background: '#22c55e', color: '#000', border: 'none', borderRadius: '6px', padding: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }
            }, '\u2705 Apply & Save'),
            el('button', {
              onClick: function() {
                try {
                  var formatted = JSON.stringify(JSON.parse(lessonEditorJson), null, 2);
                  upd('lessonEditorJson', formatted);
                } catch(e) {
                  if (addToast) addToast('Cannot format: invalid JSON', 'error');
                }
              },
              style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }
            }, '\uD83D\uDCCB Format')
          )
        ),
        // ── Creator Mode Panel ──
        creatorMode && el('div', { style: { position: 'absolute', top: '48px', left: '50%', transform: 'translateX(-50%)', zIndex: 25, background: 'rgba(15,23,42,0.95)', border: '2px solid #7c3aed', borderRadius: '12px', padding: '14px', width: '320px', fontSize: '11px' } },
          el('div', { style: { fontWeight: 800, color: '#a78bfa', fontSize: '13px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            '\uD83C\uDFA8 Lesson Creator',
            el('button', { 'aria-label': 'Close creator panel', onClick: function() { upd('creatorMode', false); }, style: { background: 'none', border: 'none', color: '#6b7280', fontSize: '14px', cursor: 'pointer' } }, '\u00d7')
          ),
          el('p', { style: { color: '#94a3b8', fontSize: '10px', margin: '0 0 8px', lineHeight: 1.4 } }, 'Build structures with blocks (right-click), then add an NPC teacher below. Save your world to share with classmates!'),
          // NPC Creator form
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } },
            el('input', { type: 'text', value: creatorNpcName, onChange: function(ev) { upd('creatorNpcName', ev.target.value); }, placeholder: 'NPC Name (e.g. Professor Volume)', style: { background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', padding: '4px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit' } }),
            el('textarea', { value: creatorNpcDialogue, onChange: function(ev) { upd('creatorNpcDialogue', ev.target.value); }, placeholder: 'What should the NPC say? (e.g. "Look at the structure behind me!")', rows: 2, style: { background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', padding: '4px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit', resize: 'vertical' } }),
            el('input', { type: 'text', value: creatorNpcQuestion, onChange: function(ev) { upd('creatorNpcQuestion', ev.target.value); }, placeholder: 'Question (optional, e.g. "What is the volume?")', style: { background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', padding: '4px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit' } }),
            creatorNpcQuestion.trim() && el('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } },
              el('input', { type: 'text', value: creatorNpcChoices, onChange: function(ev) { upd('creatorNpcChoices', ev.target.value); }, placeholder: 'Answers separated by | (e.g. 24 units|12 units|36 units)', style: { background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', padding: '4px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit' } }),
              el('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                el('span', { style: { color: '#6b7280', fontSize: '10px' } }, 'Correct answer #:'),
                el('input', { type: 'number', min: 1, max: 5, value: creatorNpcCorrect + 1, onChange: function(ev) { upd('creatorNpcCorrect', Math.max(0, parseInt(ev.target.value, 10) - 1)); }, style: { width: '40px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', padding: '3px 6px', color: '#e2e8f0', fontSize: '11px', textAlign: 'center' } })
              )
            ),
            el('button', {
              onClick: function() {
                if (!creatorNpcName.trim() || !creatorNpcDialogue.trim()) { if (addToast) addToast('NPC needs a name and dialogue!', 'error'); return; }
                var eng = window[engineKey];
                if (!eng) return;
                // Place NPC at player's position
                var px = Math.floor(eng.camera.position.x);
                var py = Math.floor(eng.camera.position.y) - 1;
                var pz = Math.floor(eng.camera.position.z) + 2; // slightly in front

                var npcData = {
                  position: [px, py, pz],
                  name: creatorNpcName.trim(),
                  color: [0x7c3aed, 0x2563eb, 0x16a34a, 0xf59e0b, 0xdc2626][Math.floor(Math.random() * 5)],
                  dialogue: creatorNpcDialogue.trim(),
                  question: null
                };

                if (creatorNpcQuestion.trim() && creatorNpcChoices.trim()) {
                  var choices = creatorNpcChoices.split('|').map(function(c) { return c.trim(); }).filter(Boolean);
                  if (choices.length >= 2) {
                    npcData.question = { text: creatorNpcQuestion.trim(), choices: choices, correct: Math.min(creatorNpcCorrect, choices.length - 1) };
                    upd('totalQ', totalQ + 1);
                  }
                }

                eng.createNPC(npcData);
                sfxPlace('stone');
                if (addToast) addToast('\uD83E\uDDD1\u200D\uD83C\uDFEB NPC "' + npcData.name + '" placed!', 'success');
                if (eng.logEvent) eng.logEvent('npc_created', { name: npcData.name, hasQuestion: !!npcData.question, position: npcData.position });
                upd({ creatorNpcName: '', creatorNpcDialogue: '', creatorNpcQuestion: '', creatorNpcChoices: '' });
              },
              disabled: !creatorNpcName.trim() || !creatorNpcDialogue.trim(),
              style: { background: creatorNpcName.trim() && creatorNpcDialogue.trim() ? '#7c3aed' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, marginTop: '4px' }
            }, '\uD83E\uDDD1\u200D\uD83C\uDFEB Place NPC Here'),
            el('p', { style: { color: '#64748b', fontSize: '9px', margin: '4px 0 0' } }, 'The NPC will appear near where you\u2019re standing. Build structures first, then add NPCs that ask questions about them. Save your world with \uD83D\uDCBE to share!')
          )
        ),
        // Objectives panel (left side) — glass style with progress bar
        el('div', { style: { position: 'absolute', top: '48px', left: '8px', zIndex: 20, background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '12px', padding: '10px 12px', maxWidth: '210px', fontSize: '11px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' } },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
            el('div', { style: { fontWeight: 700, color: '#a78bfa', fontSize: '11px' } }, '\uD83D\uDCCB Objectives'),
            totalQ > 0 && el('div', { style: { fontSize: '9px', color: '#64748b', fontWeight: 600 } }, score + '/' + totalQ)
          ),
          // Progress bar
          totalQ > 0 && el('div', { style: { width: '100%', height: '3px', background: 'rgba(100,116,139,0.2)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' } },
            el('div', { style: { width: (totalQ > 0 ? Math.round((score / totalQ) * 100) : 0) + '%', height: '100%', background: score >= totalQ ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '2px', transition: 'width 0.5s ease' } })
          ),
          currentLesson.objectives && currentLesson.objectives.map(function(obj, i) {
            var isDone = i < score;
            return el('div', { key: i,
              onClick: function() {
                if (isDone) return;
                // Navigate camera toward the NPC that corresponds to this objective
                var eng = window[engineKey];
                if (!eng || !eng.npcs) return;
                // Find the i-th NPC with a question (objectives map 1:1 to question NPCs)
                var qNpcs = eng.npcs.filter(function(n) { return n.data.question; });
                var targetNpc = qNpcs[i];
                if (targetNpc && targetNpc.body) {
                  // Teleport camera near the NPC (but not on top of them)
                  var np = targetNpc.data.position;
                  eng.camera.position.set(np[0] - 2, np[1] + 2, np[2] - 2);
                  eng.camera.lookAt(np[0] + 0.5, np[1] + 1, np[2] + 0.5);
                  upd('actionFeedback', '\uD83D\uDCCD Navigate to: ' + (targetNpc.data.name || 'NPC'));
                  setTimeout(function() { upd('actionFeedback', ''); }, 2000);
                  sfxNpcChime();
                }
              },
              style: { display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '4px', color: isDone ? '#4ade80' : '#cbd5e1', opacity: isDone ? 0.6 : 1, transition: 'all 0.3s ease', cursor: isDone ? 'default' : 'pointer' },
              title: isDone ? 'Completed!' : 'Click to navigate to this NPC'
            },
              el('span', { style: { fontSize: '10px', flexShrink: 0, marginTop: '1px' } }, isDone ? '\u2705' : '\u25CB'),
              el('span', { style: { textDecoration: isDone ? 'line-through' : 'none', fontSize: '10px', lineHeight: 1.4 } }, obj)
            );
          }),
          // Reset button
          el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (eng) eng.loadLesson(currentLesson);
              upd({ score: 0, answeredNpcs: {}, measureResult: null });
            },
            style: { marginTop: '8px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '6px', padding: '4px 10px', color: '#94a3b8', fontSize: '10px', cursor: 'pointer', width: '100%', fontFamily: 'inherit', transition: 'all 0.15s' }
          }, '\u21BB Reset World')
        ),
        // ── Minimap — top-down view showing player + NPC positions ──
        engine && el('canvas', {
          ref: function(canvasNode) {
            if (!canvasNode || !engine) return;
            var ctx = canvasNode.getContext('2d');
            if (!ctx) return;
            var w = canvasNode.width, h = canvasNode.height;
            var scale = 3; // pixels per block
            var camX = engine.camera.position.x, camZ = engine.camera.position.z;

            ctx.clearRect(0, 0, w, h);
            // Background
            ctx.fillStyle = 'rgba(15,23,42,0.85)';
            ctx.fillRect(0, 0, w, h);

            // Draw ground blocks as dots (sampling — don't iterate all blocks for perf)
            ctx.fillStyle = 'rgba(100,116,139,0.3)';
            var blockKeys = Object.keys(engine.blocks);
            for (var bi = 0; bi < blockKeys.length; bi += 3) {
              var bm = engine.blocks[blockKeys[bi]];
              if (!bm || !bm.userData.gridPos) continue;
              var bp = bm.userData.gridPos;
              if (bp.y > 0) continue; // only ground layer
              var bpx = w / 2 + (bp.x - camX) * scale;
              var bpz = h / 2 + (bp.z - camZ) * scale;
              if (bpx >= 0 && bpx < w && bpz >= 0 && bpz < h) {
                ctx.fillRect(bpx, bpz, scale, scale);
              }
            }
            // Draw structure blocks (above ground, color-coded by type)
            var mmBlockColors = { stone: 'rgba(128,128,128,0.5)', diamond: 'rgba(0,188,212,0.6)', gold: 'rgba(255,215,0,0.6)', wood: 'rgba(141,110,99,0.5)', sand: 'rgba(245,222,179,0.5)', glass: 'rgba(227,242,253,0.4)', water: 'rgba(33,150,243,0.5)', brick: 'rgba(183,28,28,0.5)', ice: 'rgba(179,229,252,0.5)', lava: 'rgba(255,87,34,0.6)' };
            for (var bi2 = 0; bi2 < blockKeys.length; bi2 += 2) {
              var bm2 = engine.blocks[blockKeys[bi2]];
              if (!bm2 || !bm2.userData.gridPos) continue;
              var bp2 = bm2.userData.gridPos;
              if (bp2.y <= 0) continue;
              var bpx2 = w / 2 + (bp2.x - camX) * scale;
              var bpz2 = h / 2 + (bp2.z - camZ) * scale;
              if (bpx2 >= 0 && bpx2 < w && bpz2 >= 0 && bpz2 < h) {
                ctx.fillStyle = mmBlockColors[bm2.userData.blockType] || 'rgba(148,163,184,0.4)';
                ctx.fillRect(bpx2, bpz2, scale, scale);
              }
            }

            // Draw NPCs (pulsing ? for unanswered questions)
            var _mmPulse = 0.5 + Math.sin(Date.now() / 400) * 0.4;
            engine.npcs.forEach(function(npc, ni) {
              var np = npc.data.position;
              var nx = w / 2 + (np[0] - camX) * scale;
              var nz = h / 2 + (np[2] - camZ) * scale;
              if (nx < -5 || nx > w + 5 || nz < -5 || nz > h + 5) return;
              ctx.fillStyle = '#' + (npc.data.color || 0x7c3aed).toString(16).padStart(6, '0');
              ctx.beginPath(); ctx.arc(nx, nz, 3, 0, Math.PI * 2); ctx.fill();
              // Pulsing question indicator for unanswered NPCs
              if (npc.data.question && !answeredNpcs[ni]) {
                ctx.save();
                ctx.globalAlpha = _mmPulse;
                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('?', nx - 3, nz - 5);
                // Glow ring
                ctx.strokeStyle = 'rgba(251,191,36,' + (_mmPulse * 0.5).toFixed(2) + ')';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(nx, nz, 6, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
              } else if (npc.data.question && answeredNpcs[ni]) {
                ctx.fillStyle = '#22c55e'; ctx.font = 'bold 7px sans-serif';
                ctx.fillText('\u2713', nx - 2, nz - 4);
              }
            });

            // Draw player (center, with direction wedge)
            var fwd2 = new (window.THREE.Vector3)();
            engine.camera.getWorldDirection(fwd2);
            var pAngle = Math.atan2(fwd2.z, fwd2.x);
            // Direction wedge (triangle)
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.moveTo(w / 2 + Math.cos(pAngle) * 7, h / 2 + Math.sin(pAngle) * 7);
            ctx.lineTo(w / 2 + Math.cos(pAngle + 2.5) * 4, h / 2 + Math.sin(pAngle + 2.5) * 4);
            ctx.lineTo(w / 2 + Math.cos(pAngle - 2.5) * 4, h / 2 + Math.sin(pAngle - 2.5) * 4);
            ctx.closePath(); ctx.fill();
            // Player dot
            ctx.beginPath(); ctx.arc(w / 2, h / 2, 2.5, 0, Math.PI * 2); ctx.fill();

            // Compass rose labels
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('N', w / 2, 8); ctx.fillText('S', w / 2, h - 2);
            ctx.fillText('W', 5, h / 2 + 3); ctx.fillText('E', w - 5, h / 2 + 3);
            // Border
            ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, w, h);
          },
          width: 100, height: 100,
          style: { position: 'absolute', bottom: '100px', right: '8px', zIndex: 20, borderRadius: '8px', border: '1px solid rgba(100,116,139,0.3)', overflow: 'hidden' }
        }),
        // Shape selector (above block toolbar) — matching glass style
        el('div', { style: { position: 'absolute', bottom: '54px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.65)', borderRadius: '10px', padding: '3px 5px', alignItems: 'center', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.06)' } },
          el('span', { style: { fontSize: '9px', color: '#6b7280', padding: '0 4px', fontWeight: 600 } }, 'Shape'),
          // Rotation badge (only when non-cube shape selected)
          selectedShape > 0 && el('span', {
            style: { fontSize: '8px', color: blockRotation > 0 ? '#fbbf24' : '#475569', padding: '0 3px', fontWeight: 600, cursor: 'pointer' },
            onClick: function() { upd('blockRotation', (blockRotation + 1) % 4); },
            title: 'Click or press R to rotate (' + (blockRotation * 90) + '\u00b0)'
          }, '\u21BB' + (blockRotation > 0 ? blockRotation * 90 + '\u00b0' : '')),
          BLOCK_SHAPES.map(function(bs, i) {
            return el('div', {
              key: bs.id,
              role: 'button', tabIndex: 0,
              'aria-label': 'Select ' + bs.name + ' shape, ' + bs.desc + (i === selectedShape ? ', currently selected' : ''),
              'aria-pressed': i === selectedShape ? 'true' : 'false',
              onClick: function() { upd('selectedShape', i); },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('selectedShape', i); } },
              title: bs.name + ' (' + bs.desc + ')',
              style: { width: '32px', height: '32px', borderRadius: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer',
                border: i === selectedShape ? '2px solid #fbbf24' : '2px solid transparent',
                background: i === selectedShape ? 'rgba(251,191,36,0.2)' : 'transparent' }
            },
              el('span', null, bs.emoji),
              el('span', { style: { fontSize: '8px', color: i === selectedShape ? '#fbbf24' : '#6b7280', fontWeight: 600 } }, bs.fraction)
            );
          })
        ),
        // Block toolbar (bottom overlay) — with key hints and glow
        el('div', { style: { position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', gap: '3px', background: 'rgba(0,0,0,0.75)', borderRadius: '12px', padding: '5px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '95vw' } },
          BLOCK_TYPES.map(function(bt, i) {
            var isActive = i === selectedBlock;
            return el('div', {
              key: bt.id,
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Select ' + bt.name + ' block, key ' + (i + 1) + (isActive ? ', currently selected' : ''),
              'aria-pressed': isActive ? 'true' : 'false',
              onClick: function() { upd('selectedBlock', i); },
              onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('selectedBlock', i); } },
              title: bt.name + ' (' + (i + 1) + ')',
              style: { width: '38px', height: '38px', borderRadius: '7px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '17px', cursor: 'pointer', position: 'relative', transition: 'all 0.15s ease',
                border: isActive ? '2px solid #a78bfa' : '2px solid rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.03)',
                boxShadow: isActive ? '0 0 10px rgba(124,58,237,0.5), inset 0 0 8px rgba(124,58,237,0.2)' : 'none' }
            },
              bt.emoji,
              el('span', { style: { position: 'absolute', bottom: '1px', right: '3px', fontSize: '8px', color: isActive ? '#c4b5fd' : '#4b5563', fontWeight: 700, lineHeight: 1 } }, String(i + 1))
            );
          })
        ),
        // ── Coordinate & Compass HUD (bottom-left) ──
        engine && engine.camera && el('div', {
          style: { position: 'absolute', bottom: '10px', left: '8px', zIndex: 20, background: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '5px 10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }
        },
          el('div', { style: { color: '#64748b', fontWeight: 600, fontSize: '8px', letterSpacing: '0.5px', marginBottom: '1px' } }, 'POSITION'),
          el('div', null,
            el('span', { style: { color: '#ef4444' } }, 'X'),
            ' ' + Math.floor(engine.camera.position.x) + '  ',
            el('span', { style: { color: '#22c55e' } }, 'Y'),
            ' ' + Math.floor(engine.camera.position.y) + '  ',
            el('span', { style: { color: '#3b82f6' } }, 'Z'),
            ' ' + Math.floor(engine.camera.position.z)
          ),
          (function() {
            // Compass: derive facing direction from camera
            var fwd = new (window.THREE.Vector3)();
            engine.camera.getWorldDirection(fwd);
            var angle = Math.atan2(fwd.x, fwd.z) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
            var idx = Math.round(angle / 45) % 8;
            return el('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' } },
              el('span', { style: { color: '#fbbf24', fontWeight: 700, fontSize: '11px' } }, dirs[idx]),
              el('span', { style: { color: '#475569' } }, Math.round(angle) + '\u00b0')
            );
          })()
        ),
        // ── Mode indicators (fly, grid) ──
        engine && el('div', {
          style: { position: 'absolute', bottom: '10px', left: '130px', zIndex: 20, display: 'flex', gap: '4px' }
        },
          // Fly mode toggle (always visible as a button)
          el('button', {
            onClick: function() {
              var eng = window[engineKey];
              if (!eng) return;
              eng.flyMode = !eng.flyMode; eng.velocity.y = 0;
              if (addToast) addToast(eng.flyMode ? '\uD83D\uDD4A\uFE0F Fly mode ON — Space=up, Shift=down, double-tap Space to land' : '\uD83D\uDC63 Walk mode', 'info');
            },
            title: 'Toggle fly mode (or double-tap Space)',
            style: { background: engine.flyMode ? 'rgba(99,102,241,0.35)' : 'rgba(30,41,59,0.6)', border: '1px solid ' + (engine.flyMode ? 'rgba(99,102,241,0.5)' : 'rgba(100,116,139,0.2)'), borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: engine.flyMode ? '#a5b4fc' : '#64748b', fontWeight: 600, cursor: 'pointer' }
          }, engine.flyMode ? '\uD83D\uDD4A\uFE0F FLY' : '\uD83D\uDD4A\uFE0F Fly'),
          engine._gridHelper && el('div', { style: { background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: '#67e8f9', fontWeight: 600 } }, '\uD83D\uDCCF GRID')
        ),
        // ── Undo/Redo indicator ──
        engine && (engine._undoStack && engine._undoStack.length > 0 || engine._redoStack && engine._redoStack.length > 0) && el('div', {
          style: { position: 'absolute', bottom: '10px', left: '220px', zIndex: 20, display: 'flex', gap: '4px', alignItems: 'center' }
        },
          engine._undoStack && engine._undoStack.length > 0 && el('div', {
            style: { background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: '#fbbf24', fontWeight: 600, cursor: 'pointer' },
            onClick: function() { if (engine.undo) engine.undo(); },
            title: 'Undo (Ctrl+Z) — ' + engine._undoStack.length + ' actions'
          }, '\u21A9 ' + engine._undoStack.length),
          engine._redoStack && engine._redoStack.length > 0 && el('div', {
            style: { background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: '#67e8f9', fontWeight: 600, cursor: 'pointer' },
            onClick: function() { if (engine.redo) engine.redo(); },
            title: 'Redo (Ctrl+Y) — ' + engine._redoStack.length + ' actions'
          }, '\u21AA ' + engine._redoStack.length),
          // Return to spawn (home)
          worldActive && el('div', {
            style: { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: '#93c5fd', fontWeight: 700, cursor: 'pointer' },
            onClick: function() { if (engine && engine.returnToSpawn) { engine.returnToSpawn(); if (addToast) addToast('🏠 Teleported to spawn', 'info'); } },
            title: 'Return to spawn point (H)'
          }, '\uD83C\uDFE0 Home'),
          // Screenshot / Save Build
          worldActive && el('div', {
            style: { background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: '#67e8f9', fontWeight: 700, cursor: 'pointer' },
            onClick: function() {
              if (!engine || !engine.renderer || !engine.scene || !engine.camera) return;
              try {
                // Force a fresh render before toDataURL (renderer isn't preserveDrawingBuffer)
                engine.renderer.render(engine.scene, engine.camera);
                var dataURL = engine.renderer.domElement.toDataURL('image/png');
                var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                var safeTitle = (currentLesson.title || 'geometry-world').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
                var a = document.createElement('a');
                a.href = dataURL;
                a.download = 'geometry-world_' + safeTitle + '_' + stamp + '.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                if (addToast) addToast('\uD83D\uDCF8 Screenshot saved to your downloads!', 'success');
              } catch (err) {
                console.error('Screenshot failed:', err);
                if (addToast) addToast('Screenshot failed \u2014 try again.', 'info');
              }
            },
            title: 'Save a PNG screenshot of your build'
          }, '\uD83D\uDCF8 Save'),
          // Clear my blocks
          worldActive && el('div', {
            style: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', padding: '2px 8px', fontSize: '9px', color: '#fca5a5', fontWeight: 700, cursor: 'pointer' },
            onClick: function() {
              if (!engine || !engine.clearPlayerBlocks) return;
              var count = 0;
              // Count first for confirm message
              Object.keys(engine.blocks || {}).forEach(function(k) {
                var m = engine.blocks[k];
                if (m && m.userData && !m.userData._lessonBlock) count++;
              });
              if (count === 0) {
                if (addToast) addToast('Nothing to clear — you haven\'t placed any blocks.', 'info');
                return;
              }
              if (window.confirm('Clear all ' + count + ' of your placed blocks? The lesson\'s structures and NPCs will stay. This cannot be undone.')) {
                var cleared = engine.clearPlayerBlocks();
                if (addToast) addToast('🗑️ Cleared ' + cleared + ' block' + (cleared === 1 ? '' : 's') + '. Lesson structures preserved.', 'success');
              }
            },
            title: 'Clear only YOUR placed blocks (lesson structures stay). Useful for restarting an experiment.'
          }, '\uD83D\uDDD1\uFE0F Clear Mine')
        ),
        // ── Mobile touch controls overlay (visible on touch devices) ──
        isMobile && worldActive && engine && el('div', { style: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0, zIndex: 8, pointerEvents: 'none' } },
          // Left side: virtual joystick zone indicator
          el('div', { style: { position: 'absolute', bottom: '80px', left: '20px', width: '100px', height: '100px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' } },
            el('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' } }),
            el('div', { style: { position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: 'rgba(255,255,255,0.25)' } }, '\u25B2'),
            el('div', { style: { position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: 'rgba(255,255,255,0.25)' } }, '\u25BC'),
            el('div', { style: { position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'rgba(255,255,255,0.25)' } }, '\u25C0'),
            el('div', { style: { position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'rgba(255,255,255,0.25)' } }, '\u25B6')
          ),
          // Right side: action buttons
          el('div', { style: { position: 'absolute', bottom: '80px', right: '12px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto' } },
            // Jump button
            el('button', {
              onTouchStart: function(ev) { ev.stopPropagation(); if (!engine.flyMode && engine.onGround && !engine._jumpLock) { engine.velocity.y = 6; sfxJump(); engine._jumpLock = true; } else if (engine.flyMode) { engine.moveState.flyUp = true; } },
              onTouchEnd: function() { engine.moveState.flyUp = false; engine._jumpLock = false; },
              style: { width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(99,102,241,0.4)', border: '2px solid rgba(99,102,241,0.6)', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, '\u2B06\uFE0F'),
            // Place block button
            el('button', {
              onTouchStart: function(ev) {
                ev.stopPropagation();
                var THREE2 = window.THREE; if (!THREE2) return;
                engine.raycaster.setFromCamera(new THREE2.Vector2(0, 0), engine.camera);
                var h2 = engine.raycaster.intersectObjects(Object.values(engine.blocks));
                if (h2.length > 0 && h2[0].face) {
                  var pp = h2[0].object.userData.gridPos; var nn = h2[0].face.normal;
                  var px = pp.x + Math.round(nn.x), py = pp.y + Math.round(nn.y), pz = pp.z + Math.round(nn.z);
                  if (Object.keys(engine.blocks).length < MAX_BLOCKS) {
                    engine.placeBlock(px, py, pz, BLOCK_TYPES[selectedBlock].id, BLOCK_SHAPES[selectedShape].id, blockRotation);
                    sfxPlace(BLOCK_TYPES[selectedBlock].id);
                    spawnPlaceParticles(engine, px + 0.5, py + 0.5, pz + 0.5);
                    engine.blocksPlaced = (engine.blocksPlaced || 0) + 1;
                  }
                }
              },
              style: { width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(34,197,94,0.4)', border: '2px solid rgba(34,197,94,0.6)', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, '\uD83E\uDDF1'),
            // Break block button
            el('button', {
              onTouchStart: function(ev) {
                ev.stopPropagation();
                var THREE2 = window.THREE; if (!THREE2) return;
                engine.raycaster.setFromCamera(new THREE2.Vector2(0, 0), engine.camera);
                var h2 = engine.raycaster.intersectObjects(Object.values(engine.blocks));
                if (h2.length > 0 && h2[0].object.userData.gridPos) {
                  var pp = h2[0].object.userData.gridPos;
                  engine.removeBlock(pp.x, pp.y, pp.z); sfxBreak(h2[0].object.userData.blockType || 'stone');
                }
              },
              style: { width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(239,68,68,0.4)', border: '2px solid rgba(239,68,68,0.6)', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, '\u26CF\uFE0F'),
            // Measure button
            el('button', {
              onTouchStart: function(ev) {
                ev.stopPropagation();
                var THREE2 = window.THREE; if (!THREE2) return;
                engine.raycaster.setFromCamera(new THREE2.Vector2(0, 0), engine.camera);
                var h2 = engine.raycaster.intersectObjects(Object.values(engine.blocks));
                if (h2.length > 0 && h2[0].object.userData.gridPos) {
                  var gp = h2[0].object.userData.gridPos;
                  var m = engine.measureStructure(gp.x, gp.y, gp.z, h2[0].object.userData.blockType);
                  if (m) { sfxMeasure(); upd('measureResult', m); }
                }
              },
              style: { width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(251,191,36,0.4)', border: '2px solid rgba(251,191,36,0.6)', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, '\uD83D\uDCCF'),
            // Talk to NPC button
            el('button', {
              onTouchStart: function(ev) {
                ev.stopPropagation();
                var minD = 5, nearest = -1;
                engine.npcs.forEach(function(n, i) {
                  var dist = engine.camera.position.distanceTo(n.body.position);
                  if (dist < minD) { minD = dist; nearest = i; }
                });
                if (nearest >= 0) { upd({ showNpcDialog: true, dialogNpcIdx: nearest, npcTypewriterPos: 0, npcTypewriterNpc: nearest }); sfxNpcChime(); }
                else if (addToast) addToast('No NPC nearby — walk closer!', 'info');
              },
              style: { width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(124,58,237,0.4)', border: '2px solid rgba(124,58,237,0.6)', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, '\uD83D\uDDE3\uFE0F'),
            // Undo button
            engine._undoStack && engine._undoStack.length > 0 && el('button', {
              onTouchStart: function(ev) { ev.stopPropagation(); if (engine.undo) engine.undo(); if (addToast) addToast('\u21A9\uFE0F Undo', 'info'); },
              style: { width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(251,191,36,0.3)', border: '2px solid rgba(251,191,36,0.5)', color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, '\u21A9')
          ),
          // Label hints
          el('div', { style: { position: 'absolute', bottom: '65px', left: '20px', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', width: '100px', pointerEvents: 'none' } }, 'MOVE'),
          el('div', { style: { position: 'absolute', bottom: '65px', right: '12px', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', width: '52px', pointerEvents: 'none' } }, 'ACTIONS')
        ),
        // ── Water submersion blue tint ──
        engine && engine._inWater && el('div', {
          style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none',
            background: 'rgba(33,150,243,0.15)', transition: 'background 0.3s ease' }
        }),
        // Lava submersion red tint + warning
        engine && engine._inLava && el('div', {
          style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, pointerEvents: 'none',
            background: 'rgba(255,87,34,0.25)', transition: 'background 0.3s ease' }
        },
          el('div', { style: { position: 'absolute', bottom: '50%', left: '50%', transform: 'translate(-50%,50%)', fontSize: '14px', fontWeight: 800, color: '#ff5722', textShadow: '0 2px 8px rgba(0,0,0,0.8)' } }, '\uD83D\uDD25 In Lava! Move away!')
        ),
        // ── Action feedback toast (center-bottom, fades in/out) ──
        actionFeedback && el('div', {
          style: { position: 'absolute', bottom: '135px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'none',
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '10px',
            padding: '6px 16px', fontSize: '12px', color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap',
            animation: 'fadeIn 0.2s ease-out' }
        }, actionFeedback),
        // ── Block rotation indicator (near shape selector) ──
        blockRotation > 0 && selectedShape > 0 && el('div', {
          style: { position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%) translateX(80px)', zIndex: 20, pointerEvents: 'none',
            background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: '6px',
            padding: '2px 8px', fontSize: '9px', color: '#fbbf24', fontWeight: 600 }
        }, '\u21BB ' + (blockRotation * 90) + '\u00b0 (R)'),
        // ── Measurement history panel (bottom-left, above position HUD) ──
        measureHistory.length > 0 && el('div', {
          style: { position: 'absolute', bottom: '80px', left: '8px', zIndex: 19,
            background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(6px)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '8px',
            padding: '6px 8px', fontSize: '9px', color: '#94a3b8', maxWidth: '150px' }
        },
          el('div', { style: { fontWeight: 700, fontSize: '8px', color: '#64748b', marginBottom: '3px', letterSpacing: '0.5px' } }, '\uD83D\uDCCF MEASUREMENTS'),
          measureHistory.slice(-5).reverse().map(function(mh, mi) {
            return el('div', { key: mi, style: { display: 'flex', justifyContent: 'space-between', gap: '4px', color: mi === 0 ? '#e2e8f0' : '#64748b', fontWeight: mi === 0 ? 600 : 400 } },
              el('span', null, mh.L + '\u00d7' + mh.W + '\u00d7' + mh.H),
              el('span', { style: { color: mi === 0 ? '#fbbf24' : '#475569' } }, '=' + mh.vol)
            );
          })
        ),
        // ── Block inventory widget (top-right, shows counts per type) ──
        engine && (engine.blocksPlaced || 0) > 0 && el('div', {
          style: { position: 'absolute', top: '48px', right: '8px', zIndex: 19, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(6px)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '10px', padding: '8px 10px', fontSize: '10px', maxWidth: '160px' }
        },
          el('div', { style: { fontWeight: 700, color: '#94a3b8', fontSize: '9px', marginBottom: '4px', letterSpacing: '0.5px' } }, 'BLOCKS PLACED'),
          // Real-time total volume counter
          (function() {
            var totalVol = 0;
            var bks = Object.keys(engine.blocks);
            for (var vi = 0; vi < bks.length; vi++) {
              var bm = engine.blocks[bks[vi]];
              if (bm && bm.userData && bm.userData.volume) totalVol += bm.userData.volume;
            }
            return el('div', { style: { fontWeight: 800, color: '#fbbf24', fontSize: '12px', marginBottom: '4px', textAlign: 'center' } },
              '\uD83D\uDCE6 ' + (totalVol === Math.floor(totalVol) ? totalVol : totalVol.toFixed(2)) + ' cu'
            );
          })(),
          (function() {
            var counts = {};
            var bk = Object.keys(engine.blocks);
            for (var bi = 0; bi < bk.length; bi++) {
              var bm = engine.blocks[bk[bi]];
              if (bm && bm.userData.blockType && bm.userData.blockType !== 'grass') {
                var bt = bm.userData.blockType;
                counts[bt] = (counts[bt] || 0) + 1;
              }
            }
            var typeKeys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
            if (typeKeys.length === 0) return el('div', { style: { color: '#475569', fontSize: '9px' } }, 'None yet');
            return typeKeys.slice(0, 6).map(function(tk) {
              var bt = BLOCK_TYPES.find(function(b) { return b.id === tk; });
              return el('div', { key: tk, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0', color: '#cbd5e1' } },
                el('span', null, (bt ? bt.emoji + ' ' : '') + tk),
                el('span', { style: { fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' } }, counts[tk])
              );
            });
          })()
        ),
        // ── Tutorial overlay (first-time users) ──
        !tutorialDismissed && tutorialStep < 4 && worldActive && el('div', {
          role: 'region', 'aria-label': 'Tutorial overlay: Step ' + (tutorialStep + 1) + ' of 4', 'aria-live': 'polite',
          style: { position: 'absolute', bottom: '140px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'none', textAlign: 'center', maxWidth: '340px' }
        },
          el('div', { style: { background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)', border: '2px solid rgba(124,58,237,0.5)', borderRadius: '14px', padding: '14px 20px', boxShadow: '0 8px 32px rgba(124,58,237,0.25)', pointerEvents: 'auto' } },
            el('div', { 'aria-hidden': 'true', style: { fontSize: '10px', color: '#a78bfa', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' } }, 'TUTORIAL \u2014 Step ' + (tutorialStep + 1) + ' of 4'),
            el('div', { role: 'status', style: { fontSize: '14px', color: '#e2e8f0', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 } },
              tutorialStep === 0 ? (isMobile ? '\uD83D\uDC46 Swipe right side to look. Drag left side to move.' : '\uD83D\uDDB1\uFE0F Click the 3D world to look around. Use WASD to move.') :
              tutorialStep === 1 ? (isMobile ? '\uD83D\uDC64 Walk near a purple character and tap the \uD83D\uDDE3\uFE0F button.' : '\uD83D\uDC64 Walk up to a purple character and press E to talk.') :
              tutorialStep === 2 ? (isMobile ? '\uD83D\uDCCF Point at the blue blocks and tap the \uD83D\uDCCF button.' : '\uD83D\uDCCF Point at the blue blocks and press M to measure.') :
              (isMobile ? '\uD83E\uDDF1 Point at a block and tap the \uD83E\uDDF1 button to place!' : '\uD83E\uDDF1 Right-click on any block face to place a new block!')
            ),
            // Progress dots
            el('div', { style: { display: 'flex', gap: '5px', justifyContent: 'center', marginBottom: '8px' } },
              [0,1,2,3].map(function(si) {
                return el('div', { key: si, style: { width: 8, height: 8, borderRadius: '50%', background: si < tutorialStep ? '#22c55e' : si === tutorialStep ? '#a78bfa' : 'rgba(100,116,139,0.4)', transition: 'all 0.3s' } });
              })
            ),
            el('div', { style: { display: 'flex', gap: '6px', justifyContent: 'center', pointerEvents: 'auto' } },
              el('button', {
                'aria-label': 'Skip tutorial and proceed to lesson',
                onClick: function() { upd({ tutorialStep: 4, tutorialDismissed: true }); },
                style: { background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '8px', color: '#94a3b8', fontSize: '10px', padding: '4px 12px', cursor: 'pointer' }
              }, 'Skip all'),
              el('button', {
                'aria-label': 'Next tutorial step',
                onClick: function() {
                  var nextStep = tutorialStep + 1;
                  if (nextStep >= 4) { upd({ tutorialStep: 4, tutorialDismissed: true }); }
                  else { upd('tutorialStep', nextStep); }
                },
                style: { background: '#7c3aed', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px', padding: '4px 14px', cursor: 'pointer', fontWeight: 700 }
              }, 'Next \u2192')
            )
          )
        ),
        // Crosshair — interactive (changes color based on target)
        (function() {
          var ct = engine ? (engine._crosshairTarget || 'none') : 'none';
          var chColor = ct === 'npc_question' ? '#fbbf24' : ct === 'npc' ? '#a78bfa' : ct === 'block' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
          var chGlow = ct === 'npc_question' ? '0 0 6px #fbbf24' : ct === 'npc' ? '0 0 4px #a78bfa' : '0 0 2px rgba(0,0,0,0.5)';
          var chSize = ct === 'npc_question' ? '5px' : ct === 'npc' ? '4px' : '3px';
          return el('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 10, pointerEvents: 'none', width: '22px', height: '22px', transition: 'all 0.15s ease' } },
            el('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: chSize, height: chSize, borderRadius: '50%', background: chColor, boxShadow: chGlow, transition: 'all 0.15s ease' } }),
            el('div', { style: { position: 'absolute', top: '50%', left: '0', transform: 'translateY(-50%)', width: '6px', height: '1px', background: chColor, transition: 'background 0.15s' } }),
            el('div', { style: { position: 'absolute', top: '50%', right: '0', transform: 'translateY(-50%)', width: '6px', height: '1px', background: chColor, transition: 'background 0.15s' } }),
            el('div', { style: { position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '1px', height: '6px', background: chColor, transition: 'background 0.15s' } }),
            el('div', { style: { position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', width: '1px', height: '6px', background: chColor, transition: 'background 0.15s' } }),
            // Target label hint
            ct === 'npc_question' && el('div', { style: { position: 'absolute', top: '14px', left: '50%', transform: 'translateX(-50%)', fontSize: '8px', color: '#fbbf24', fontWeight: 700, whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.8)' } }, 'Press E')
          );
        })(),
        // ── Lesson Intro Screen ──
        showLessonIntro && el('div', {
          style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(30,27,58,0.97) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }
        },
          el('div', { style: { maxWidth: '420px', width: '90%', textAlign: 'center' } },
            el('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '\uD83E\uDDF1'),
            el('div', { style: { fontSize: '22px', fontWeight: 800, color: '#e2e8f0', marginBottom: '6px' } }, currentLesson.title || 'Geometry World'),
            el('div', { style: { fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '16px' } }, currentLesson.description || ''),
            // Objectives preview
            currentLesson.objectives && el('div', { style: { textAlign: 'left', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px' } },
              el('div', { style: { fontWeight: 700, color: '#a78bfa', fontSize: '11px', marginBottom: '6px' } }, '\uD83C\uDFAF Objectives'),
              currentLesson.objectives.map(function(obj, i) {
                return el('div', { key: i, style: { display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '3px', fontSize: '11px', color: '#cbd5e1' } },
                  el('span', { style: { color: '#7c3aed' } }, (i + 1) + '.'),
                  el('span', null, obj)
                );
              })
            ),
            // Key formulas
            el('div', { style: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', padding: '10px', marginBottom: '20px', fontSize: '12px', color: '#fbbf24', fontWeight: 600 } },
              '\uD83D\uDCDD V = L \u00d7 W \u00d7 H \u2022 Area = L \u00d7 W'
            ),
            // NPC count
            el('div', { style: { fontSize: '11px', color: '#64748b', marginBottom: '16px' } },
              (currentLesson.npcs || []).length + ' NPCs \u2022 ' +
              (currentLesson.npcs || []).filter(function(n) { return n.question; }).length + ' questions \u2022 ' +
              (currentLesson.structures || []).length + ' structures'
            ),
            // Start button
            el('button', {
              onClick: function() { loadLessonByKey(activeLesson); },
              style: { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', border: 'none', borderRadius: '12px',
                padding: '14px 40px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(124,58,237,0.4)', letterSpacing: '0.5px' }
            }, '\u25B6\uFE0F Start Lesson'),
            // Skip intro for returning students
            el('button', {
              onClick: function() { loadLessonByKey(activeLesson); },
              style: { display: 'block', margin: '10px auto 0', background: 'none', border: 'none', color: '#64748b', fontSize: '10px', cursor: 'pointer' }
            }, 'or press Enter to jump in')
          )
        ),
        // ── Student Reflection Prompt (before Next Lesson) ──
        showReflection && score >= totalQ && totalQ > 0 && el('div', {
          style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 36, pointerEvents: 'auto',
            background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', border: '2px solid rgba(124,58,237,0.4)', borderRadius: '18px',
            padding: '24px 28px', maxWidth: '360px', textAlign: 'center', boxShadow: '0 8px 32px rgba(124,58,237,0.2)' }
        },
          el('div', { style: { fontSize: '28px', marginBottom: '8px' } }, '\uD83E\uDD14'),
          el('div', { style: { fontSize: '16px', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' } }, 'Quick Reflection'),
          el('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '12px' } }, 'Take a moment to think about what you learned:'),
          el('textarea', {
            value: reflectionText,
            onChange: function(ev) { upd('reflectionText', ev.target.value); },
            placeholder: 'What was the most interesting thing you discovered? What strategy helped you solve problems?',
            style: { width: '100%', height: '70px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px', color: '#e2e8f0', fontSize: '12px', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }
          }),
          el('div', { style: { display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' } },
            el('button', {
              onClick: function() {
                upd('showReflection', false);
                var eng = window[engineKey];
                if (eng && eng.logEvent) eng.logEvent('reflection', { text: reflectionText, lesson: currentLesson.title });
              },
              style: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
            }, reflectionText.trim() ? '\u2705 Save & Continue' : 'Skip'),
            el('button', {
              onClick: function() { upd('showReflection', false); },
              style: { background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '10px', padding: '8px 16px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }
            }, 'Skip')
          )
        ),
        // ── Lesson Completion overlay with Next Lesson ──
        score >= totalQ && totalQ > 0 && !showNpcDialog && !showReflection && el('div', {
          style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 35, pointerEvents: 'auto', textAlign: 'center',
            background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)', border: '2px solid rgba(251,191,36,0.5)', borderRadius: '20px',
            padding: '24px 32px', maxWidth: '380px', boxShadow: '0 12px 40px rgba(251,191,36,0.2)' }
        },
          el('div', { style: { fontSize: '48px', marginBottom: '8px' } }, '\uD83C\uDFC6'),
          el('div', { style: { fontSize: '20px', fontWeight: 800, color: '#fbbf24', marginBottom: '4px' } }, 'Lesson Complete!'),
          el('div', { style: { fontSize: '13px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.5 } },
            currentLesson.title + ' \u2014 ' + score + '/' + totalQ + ' questions answered'),
          el('div', { style: { fontSize: '11px', color: '#64748b', marginBottom: '16px' } },
            (engine ? (engine.blocksPlaced || 0) : 0) + ' blocks placed \u2022 ' +
            measureHistory.length + ' measurements taken'),
          // Next Lesson button
          (function() {
            var curIdx = LESSON_ORDER.indexOf(activeLesson);
            var nextKey = curIdx >= 0 && curIdx < LESSON_ORDER.length - 1 ? LESSON_ORDER[curIdx + 1] : null;
            var nextLesson = nextKey ? SAMPLE_LESSONS[nextKey] : null;
            return el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
              nextLesson && el('button', {
                onClick: function() {
                  upd({ activeLesson: nextKey, measureHistory: [] });
                  var eng = window[engineKey]; if (eng) eng.loadLesson(nextLesson);
                },
                style: { background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }
              }, '\u27A1\uFE0F Next: ' + (nextLesson.title || '').split(' \u2014')[0]),
              el('button', {
                onClick: function() {
                  var eng = window[engineKey]; if (eng) eng.loadLesson(currentLesson);
                  upd('measureHistory', []);
                },
                style: { background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)', borderRadius: '10px',
                  padding: '10px 20px', fontSize: '12px', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }
              }, '\uD83D\uDD04 Replay'),
              !nextLesson && el('div', { style: { textAlign: 'center', marginTop: '8px' } },
                el('div', { style: { fontSize: '32px', marginBottom: '4px' } }, '\uD83C\uDFC6\u2B50\uD83C\uDF1F'),
                el('div', { style: { fontSize: '16px', fontWeight: 800, color: '#fbbf24', marginBottom: '8px' } }, 'All Lessons Complete!'),
                el('div', { style: { fontSize: '11px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '8px' } },
                  'You\u2019ve mastered all 9 geometry lessons! Here\u2019s your journey:'),
                el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', color: '#cbd5e1' } },
                  el('div', { style: { background: 'rgba(124,58,237,0.15)', borderRadius: '8px', padding: '6px', textAlign: 'center' } },
                    el('div', { style: { fontSize: '18px', fontWeight: 800, color: '#a78bfa' } }, String(Object.keys(earnedBadges).length)),
                    'badges earned'),
                  el('div', { style: { background: 'rgba(251,191,36,0.15)', borderRadius: '8px', padding: '6px', textAlign: 'center' } },
                    el('div', { style: { fontSize: '18px', fontWeight: 800, color: '#fbbf24' } }, String(engine ? engine.blocksPlaced || 0 : 0)),
                    'blocks placed'),
                  el('div', { style: { background: 'rgba(34,197,94,0.15)', borderRadius: '8px', padding: '6px', textAlign: 'center' } },
                    el('div', { style: { fontSize: '18px', fontWeight: 800, color: '#22c55e' } }, String(measureHistory.length)),
                    'measurements'),
                  el('div', { style: { background: 'rgba(59,130,246,0.15)', borderRadius: '8px', padding: '6px', textAlign: 'center' } },
                    el('div', { style: { fontSize: '18px', fontWeight: 800, color: '#3b82f6' } }, String(score)),
                    'questions answered')
                ),
                el('div', { style: { fontSize: '10px', color: '#64748b', marginTop: '8px', fontStyle: 'italic' } },
                  '\u201CEvery block you placed made your brain stronger.\u201D')
              )
            );
          })()
        ),
        // ── Block count warning ──
        engine && Object.keys(engine.blocks).length > MAX_BLOCKS * 0.8 && el('div', {
          style: { position: 'absolute', top: '48px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, pointerEvents: 'none',
            background: Object.keys(engine.blocks).length >= MAX_BLOCKS ? 'rgba(239,68,68,0.9)' : 'rgba(251,191,36,0.85)',
            borderRadius: '8px', padding: '4px 14px', fontSize: '11px', color: '#fff', fontWeight: 700 }
        }, Object.keys(engine.blocks).length >= MAX_BLOCKS
          ? '\u26A0\uFE0F Block limit reached (' + MAX_BLOCKS + ') \u2014 remove some blocks for performance'
          : '\u26A0\uFE0F ' + Object.keys(engine.blocks).length + '/' + MAX_BLOCKS + ' blocks \u2014 approaching limit'),
        // NPC Dialog overlay
        showNpcDialog && engine && engine.npcs[dialogNpcIdx] && (function() {
          var npc = engine.npcs[dialogNpcIdx];
          var data = npc.data;
          var isAnswered = !!answeredNpcs[dialogNpcIdx];
          // Bilingual: auto-translate NPC dialogue when home language is set
          var transKey = dialogNpcIdx + '_' + homeLang;
          var translation = npcTranslations[transKey] || null;
          if (homeLang !== 'en' && !translation && callGemini && !npcTranslations[transKey + '_loading']) {
            var newTrans = Object.assign({}, npcTranslations);
            newTrans[transKey + '_loading'] = true;
            upd('npcTranslations', newTrans);
            var LANG_NAMES = { es: 'Spanish', fr: 'French', ar: 'Arabic', so: 'Somali', pt: 'Portuguese', vi: 'Vietnamese', zh: 'Simplified Chinese', sw: 'Swahili' };
            var langName = LANG_NAMES[homeLang] || homeLang;
            var textToTranslate = data.dialogue + (data.question ? '\n---\n' + data.question.text : '');
            callGemini('Translate the following geometry lesson NPC dialogue to ' + langName + '. '
              + 'Keep mathematical terms (volume, length, width, height, cubic units) in BOTH languages. '
              + 'For example: "Volume (volumen) = Length (longitud) x Width (ancho) x Height (altura)". '
              + 'Preserve numbers and formulas exactly. Respond with ONLY the translation, no explanation.\n\n' + textToTranslate, true)
              .then(function(result) {
                var parts = result.split('---');
                var ut = Object.assign({}, npcTranslations);
                ut[transKey] = { dialogue: (parts[0] || result).trim(), question: parts[1] ? parts[1].trim() : null };
                delete ut[transKey + '_loading'];
                upd('npcTranslations', ut);
              }).catch(function() {
                var ut = Object.assign({}, npcTranslations);
                delete ut[transKey + '_loading'];
                upd('npcTranslations', ut);
              });
          }
          var npcHexColor = '#' + (data.color || 0x7c3aed).toString(16).padStart(6, '0');
          return el('div', { style: { position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 30, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(100,116,139,0.25)', borderRadius: '16px', padding: '0', maxWidth: '440px', width: '90%', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' } },
            // Header bar with NPC color accent
            el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'linear-gradient(135deg, ' + npcHexColor + '22, ' + npcHexColor + '08)', borderBottom: '1px solid rgba(100,116,139,0.15)' } },
              // NPC avatar circle
              el('div', { style: { width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, ' + npcHexColor + ', ' + npcHexColor + '88)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontWeight: 800, flexShrink: 0, border: '2px solid ' + npcHexColor + '66' } }, data.name.charAt(0)),
              el('div', { style: { flex: 1 } },
                el('div', { style: { fontSize: '13px', fontWeight: 800, color: '#e2e8f0' } }, data.name),
                data.question && !isAnswered && el('div', { style: { fontSize: '9px', color: npcHexColor, fontWeight: 600, letterSpacing: '0.3px' } }, 'HAS A QUESTION')
              ),
              el('button', { 'aria-label': 'Close NPC dialog', onClick: function() { upd({ showNpcDialog: false }); }, style: { background: 'rgba(100,116,139,0.15)', border: 'none', color: '#94a3b8', fontSize: '14px', cursor: 'pointer', borderRadius: '6px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, '\u00d7')
            ),
            // Body content
            el('div', { style: { padding: '12px 16px' } },
            el('div', { style: { fontSize: '12px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: homeLang !== 'en' ? '4px' : '10px', minHeight: '20px' } },
              // Typewriter effect: reveal characters progressively
              npcTypewriterNpc === dialogNpcIdx && npcTypewriterPos < (data.dialogue || '').length
                ? el('span', null, (data.dialogue || '').slice(0, npcTypewriterPos), el('span', { style: { opacity: 0.4, animation: 'pulse 0.8s infinite' } }, '\u2588'))
                : data.dialogue
            ),
            // Bilingual translation line (click to hear)
            homeLang !== 'en' && translation && el('div', {
              onClick: function() {
                // Speak translation aloud using browser TTS
                if (window.speechSynthesis) {
                  var LANG_CODES = { es: 'es-ES', fr: 'fr-FR', ar: 'ar-SA', so: 'so-SO', pt: 'pt-BR', vi: 'vi-VN', zh: 'zh-CN', sw: 'sw-KE' };
                  var utt = new SpeechSynthesisUtterance(translation.dialogue);
                  utt.lang = LANG_CODES[homeLang] || homeLang;
                  utt.rate = 0.85;
                  window.speechSynthesis.cancel();
                  window.speechSynthesis.speak(utt);
                }
              },
              title: 'Click to hear translation spoken aloud',
              style: { fontSize: '12px', color: '#fbbf24', lineHeight: 1.5, marginBottom: '10px', fontStyle: 'italic', borderLeft: '3px solid #fbbf24', paddingLeft: '8px', cursor: 'pointer' }
            }, '\uD83D\uDD0A ' + translation.dialogue),
            homeLang !== 'en' && !translation && el('div', { style: { fontSize: '10px', color: '#64748b', marginBottom: '10px' } }, '\u23F3 Translating...'),
            data.question && !isAnswered && (function() {
              // Determine current question (base or follow-up)
              var curStep = npcFollowUpStep[dialogNpcIdx] || 0;
              var followUps = data.question.followUp || [];
              var curQ = curStep === 0 ? data.question : (followUps[curStep - 1] || data.question);
              var totalSteps = 1 + followUps.length;
              var isLastStep = curStep >= totalSteps - 1;

              return el('div', null,
                // Progress dots for multi-step questions
                totalSteps > 1 && el('div', { style: { display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '6px' } },
                  Array.apply(null, Array(totalSteps)).map(function(_, di) {
                    return el('div', { key: di, style: { width: 8, height: 8, borderRadius: '50%', background: di < curStep ? '#22c55e' : di === curStep ? '#7c3aed' : 'rgba(100,116,139,0.4)', transition: 'all 0.3s' } });
                  })
                ),
                el('div', { style: { fontSize: '11px', fontWeight: 700, color: '#7c3aed', marginBottom: homeLang !== 'en' ? '2px' : '6px' } }, curQ.text),
                homeLang !== 'en' && translation && translation.question && curStep === 0 && el('div', { style: { fontSize: '11px', color: '#fbbf24', marginBottom: '6px', fontStyle: 'italic' } }, translation.question),
                curQ.choices.map(function(choice, ci) {
                  return el('button', {
                    key: ci,
                    'aria-label': 'Answer option ' + (ci + 1) + ': ' + choice,
                    onClick: function() {
                      if (ci === curQ.correct) {
                        sfxCorrect();
                        upd('consecutiveWrong', 0);
                        if (typeof awardXP === 'function') awardXP('geometryWorld', 2, 'Step correct: ' + data.name);
                        var eng = window[engineKey];
                        if (eng && eng.logEvent) eng.logEvent('answer_correct', { npc: data.name, question: curQ.text, choice: choice, step: curStep });
                        // Check if there are more follow-up steps
                        if (!isLastStep) {
                          // Advance to next follow-up
                          var newFU = Object.assign({}, npcFollowUpStep);
                          newFU[dialogNpcIdx] = curStep + 1;
                          upd('npcFollowUpStep', newFU);
                          if (addToast) addToast('\u2705 Correct! Next step...', 'success');
                        } else {
                          // Final step — mark NPC as answered, award full score
                          var newAnswered = Object.assign({}, answeredNpcs);
                          newAnswered[dialogNpcIdx] = true;
                          var newScore = score + 1;
                          upd({ score: newScore, answeredNpcs: newAnswered, _scorePulse: Date.now() });
                          // Auto-save progress to localStorage
                          try { var pk = eng && eng._progressKey; if (pk) localStorage.setItem(pk, JSON.stringify({ score: newScore, answeredNpcs: newAnswered, npcFollowUpStep: npcFollowUpStep })); } catch(e) {}
                          if (addToast) addToast('\u2705 Correct! +1', 'success');
                          if (typeof awardXP === 'function') awardXP('geometryWorld', 5, 'Correct answer: ' + data.name);
                          if (typeof announceToSR === 'function') announceToSR('Correct! Score is now ' + newScore + ' of ' + totalQ);
                      if (window._alloHaptic) window._alloHaptic('correct');
                          // 3D confetti from NPC + celebration bounce
                          if (eng && npc.body) {
                            try { spawnPlaceParticles(eng, npc.body.position.x, npc.body.position.y + 1.5, npc.body.position.z); } catch(e) {}
                            npc._celebrateUntil = (eng.clock ? eng.clock.getElapsedTime() : 0) + 0.8;
                          }
                          // Check lesson completion
                          if (newScore >= totalQ && totalQ > 0) {
                            sfxComplete();
                            if (addToast) addToast('\uD83C\uDFC6 Lesson Complete! Look up...', 'success');
                              // Trigger reflection prompt after a delay
                              setTimeout(function() { upd({ showReflection: true, reflectionText: '' }); }, 5000);
                            if (typeof awardXP === 'function') awardXP('geometryWorld', 15, 'Lesson complete: ' + currentLesson.title);
                            if (eng && !eng.completionTriggered) {
                              eng.completionTriggered = true; eng.completionProgress = 0;
                              if (eng.logEvent) eng.logEvent('lesson_complete', { score: newScore, totalQuestions: totalQ, timeToComplete: ((Date.now() - eng.sessionStart) / 1000).toFixed(1) + 's', blocksPlaced: eng.blocksPlaced || 0 });
                              // Confetti burst from camera position
                              var camP = eng.camera.position;
                              var confettiColors = [0xfbbf24, 0x22c55e, 0x3b82f6, 0xef4444, 0xa78bfa, 0xf472b6, 0x06b6d4];
                              for (var ci = 0; ci < 25; ci++) {
                                try {
                                  var cGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
                                  var cMat = new THREE.MeshBasicMaterial({ color: confettiColors[ci % confettiColors.length], transparent: true, opacity: 1 });
                                  var cMesh = new THREE.Mesh(cGeo, cMat);
                                  cMesh.position.set(camP.x + (Math.random() - 0.5) * 3, camP.y + Math.random() * 2, camP.z + (Math.random() - 0.5) * 3);
                                  cMesh.userData._age = 0; cMesh.userData._life = 2 + Math.random();
                                  cMesh.userData._vel = { x: (Math.random() - 0.5) * 4, y: 3 + Math.random() * 3, z: (Math.random() - 0.5) * 4 };
                                  eng.scene.add(cMesh); eng._particles.push(cMesh);
                                } catch(e) {}
                              }
                            }
                          }
                        }
                        setTimeout(runAchievementCheck, 100);
                      } else {
                        sfxWrong(); if (window._alloHaptic) window._alloHaptic('wrong');
                        // NPC shake animation
                        var eng2 = window[engineKey];
                        if (eng2 && npc && npc._shakeUntil !== undefined) { npc._shakeUntil = (eng2.clock ? eng2.clock.getElapsedTime() : 0) + 0.5; }
                        if (eng2 && eng2.logEvent) eng2.logEvent('answer_wrong', { npc: data.name, question: curQ.text, chosenAnswer: choice, correctAnswer: curQ.choices[curQ.correct] });
                        var newWrong = consecutiveWrong + 1;
                        upd('consecutiveWrong', newWrong);
                        checkFrustration(newWrong);
                        setTimeout(runAchievementCheck, 100);
                        var hintText = '\u274C Not quite. ';
                        if (newWrong >= 3) {
                          hintText += 'Let\u2019s break it down: ' + curQ.choices[curQ.correct] + '. Try measuring with M key!';
                        } else if (newWrong >= 2) {
                          hintText += data.dialogue.indexOf('layer') >= 0 ? 'Count the blocks in one layer, then count how many layers tall.' : data.dialogue.indexOf('L-block') >= 0 ? 'Split it into two rectangles. Find each volume, then add.' : 'Count: how many blocks long? How many wide? How many tall? Multiply!';
                        } else {
                          hintText += 'Hint: think about ' + (data.dialogue.indexOf('layer') >= 0 ? 'counting the layers' : data.dialogue.indexOf('L-block') >= 0 ? 'splitting into two prisms' : 'L \u00d7 W \u00d7 H');
                        }
                        if (addToast) addToast(hintText, 'error');
                      }
                    },
                    style: { display: 'block', width: '100%', padding: '6px 12px', marginBottom: '4px', background: '#1e293b', border: '1px solid #334155', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }
                  }, choice);
                })
              );
            })(),
            isAnswered && el('div', { style: { borderTop: '1px solid rgba(34,197,94,0.2)', paddingTop: '8px', marginTop: '4px' } },
              el('div', { style: { color: '#4ade80', fontWeight: 700, fontSize: '12px', marginBottom: '6px' } }, '\u2705 Great job!'),
              el('div', { style: { fontSize: '11px', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(34,197,94,0.08)', borderRadius: '8px', padding: '8px 10px', border: '1px solid rgba(34,197,94,0.15)' } },
                // Bonus fun fact based on dialogue content
                data.dialogue.indexOf('volume') >= 0 || data.dialogue.indexOf('Volume') >= 0
                  ? '\uD83E\uDDE0 Fun fact: The word "volume" comes from Latin "volumen" meaning a roll of papyrus. Ancient mathematicians measured volume by filling containers with water!'
                  : data.dialogue.indexOf('area') >= 0 || data.dialogue.indexOf('Area') >= 0
                  ? '\uD83E\uDDE0 Fun fact: The ancient Egyptians used area calculations to resurvey farmland after Nile floods. That\u2019s how geometry (earth-measuring) got its name!'
                  : data.dialogue.indexOf('layer') >= 0
                  ? '\uD83E\uDDE0 Fun fact: A stack of 1,000 sheets of paper is about 4 inches tall. Each sheet is a "layer" \u2014 just like counting block layers to find volume!'
                  : data.dialogue.indexOf('L-block') >= 0 || data.dialogue.indexOf('composite') >= 0
                  ? '\uD83E\uDDE0 Fun fact: Architects decompose complex buildings into rectangular sections (just like you did!) to calculate materials needed for construction.'
                  : data.dialogue.indexOf('fraction') >= 0 || data.dialogue.indexOf('half') >= 0
                  ? '\uD83E\uDDE0 Fun fact: A pizza box is about 1728 cubic inches (12\u00d712\u00d712). If you eat half, you\u2019ve consumed 864 cubic inches of pizza-space!'
                  : '\uD83E\uDDE0 Fun fact: The largest known rectangular prism building is the Boeing Everett Factory at 472 million cubic feet \u2014 big enough to hold Disneyland!'
              )
            ),
            // ── AI Chat with NPC (ask anything) ──
            callGemini && el('div', { style: { marginTop: '10px', borderTop: '1px solid #334155', paddingTop: '8px' } },
              el('div', { style: { fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px' } }, '\uD83D\uDCAC Ask ' + data.name + ' anything:'),
              // Chat history for this NPC
              (npcChatHistory[dialogNpcIdx] || []).length > 0 && el('div', { style: { maxHeight: '100px', overflowY: 'auto', marginBottom: '6px' } },
                (npcChatHistory[dialogNpcIdx] || []).map(function(msg, mi) {
                  return el('div', { key: mi, style: { fontSize: '11px', marginBottom: '3px', color: msg.role === 'user' ? '#e2e8f0' : '#4ade80', paddingLeft: msg.role === 'user' ? '0' : '8px', borderLeft: msg.role === 'user' ? 'none' : '2px solid #4ade80' } },
                    msg.role === 'user' ? '\uD83D\uDDE3\uFE0F ' + msg.text : msg.text
                  );
                })
              ),
              el('div', { style: { display: 'flex', gap: '4px' } },
                el('input', {
                  type: 'text', value: npcChatInput,
                  onChange: function(ev) { upd('npcChatInput', ev.target.value); },
                  onKeyDown: function(ev) {
                    if (ev.key === 'Enter' && npcChatInput.trim() && !npcChatLoading && callGemini) {
                      var userMsg = npcChatInput.trim();
                      var history = (npcChatHistory[dialogNpcIdx] || []).concat([{ role: 'user', text: userMsg }]);
                      var newHist = Object.assign({}, npcChatHistory);
                      newHist[dialogNpcIdx] = history;
                      upd({ npcChatHistory: newHist, npcChatInput: '', npcChatLoading: true });

                      var npcPrompt = 'You are ' + data.name + ', a friendly geometry teacher NPC in a 3D block world. '
                        + 'You are standing near structures made of blocks. Each block is 1 cubic unit. '
                        + 'Your specialty: ' + data.dialogue + '\n'
                        + (measureResult ? 'The student recently measured a structure: L=' + measureResult.L + ' W=' + measureResult.W + ' H=' + measureResult.H + ' Volume=' + measureResult.boundingVolume + '\n' : '')
                        + 'The student asks: "' + userMsg + '"\n\n'
                        + 'Respond in 2-3 sentences. Be warm, encouraging, and age-appropriate. '
                        + 'Use concrete examples with blocks. If they ask about volume, reference L\u00d7W\u00d7H. '
                        + 'If they seem confused, break it down into simpler steps.';

                      callGemini(npcPrompt, true).then(function(response) {
                        var updatedHist = Object.assign({}, npcChatHistory);
                        updatedHist[dialogNpcIdx] = history.concat([{ role: 'npc', text: response }]);
                        upd({ npcChatHistory: updatedHist, npcChatLoading: false });
                        var eng = window[engineKey];
                        if (eng && eng.logEvent) eng.logEvent('npc_chat', { npc: data.name, question: userMsg, response: response.substring(0, 100) });
                      }).catch(function() {
                        var updatedHist = Object.assign({}, npcChatHistory);
                        updatedHist[dialogNpcIdx] = history.concat([{ role: 'npc', text: 'Hmm, I\u2019m having trouble thinking right now. Try asking in a different way!' }]);
                        upd({ npcChatHistory: updatedHist, npcChatLoading: false });
                      });
                    }
                  },
                  disabled: npcChatLoading,
                  placeholder: npcChatLoading ? 'Thinking...' : 'Ask a question...',
                  style: { flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '4px 8px', color: '#e2e8f0', fontSize: '11px', fontFamily: 'inherit' }
                }),
                el('button', {
                  onClick: function() {
                    // Trigger same as Enter key
                    if (!npcChatInput.trim() || npcChatLoading || !callGemini) return;
                    var userMsg = npcChatInput.trim();
                    var history = (npcChatHistory[dialogNpcIdx] || []).concat([{ role: 'user', text: userMsg }]);
                    var newHist = Object.assign({}, npcChatHistory);
                    newHist[dialogNpcIdx] = history;
                    upd({ npcChatHistory: newHist, npcChatInput: '', npcChatLoading: true });
                    var npcPrompt = 'You are ' + data.name + ', a friendly geometry teacher in a 3D block world. Each block = 1 cubic unit. '
                      + 'Context: ' + data.dialogue + ' '
                      + (measureResult ? 'Student measured: L=' + measureResult.L + ' W=' + measureResult.W + ' H=' + measureResult.H + ' V=' + measureResult.boundingVolume + '. ' : '')
                      + 'Student asks: "' + userMsg + '". Respond in 2-3 warm, concrete sentences.';
                    callGemini(npcPrompt, true).then(function(r) {
                      var uh = Object.assign({}, npcChatHistory); uh[dialogNpcIdx] = history.concat([{ role: 'npc', text: r }]);
                      upd({ npcChatHistory: uh, npcChatLoading: false });
                      try { localStorage.setItem('gw_chat_' + activeLesson, JSON.stringify(uh)); } catch(e) {}
                    }).catch(function() { upd('npcChatLoading', false); });
                  },
                  disabled: npcChatLoading || !npcChatInput.trim(),
                  style: { background: npcChatInput.trim() && !npcChatLoading ? '#7c3aed' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }
                }, npcChatLoading ? '\u23F3' : '\u2728')
              )
            )
            ) // close body content div
          );
        })(),
        // ── Growth Mindset Nudge Overlay (SEL + Academic Integration) ──
        showGrowthNudge && el('div', {
          style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 35,
            background: 'linear-gradient(135deg, rgba(15,23,42,0.97), rgba(30,41,59,0.97))',
            border: '2px solid #a78bfa', borderRadius: '18px', padding: '24px 28px', maxWidth: '380px', width: '85%',
            boxShadow: '0 0 40px rgba(167,139,250,0.3), 0 0 80px rgba(167,139,250,0.1)',
            textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }
        },
          el('div', { style: { fontSize: '32px', marginBottom: '10px' } }, '\uD83C\uDF31'),
          el('div', { style: { fontSize: '14px', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px', letterSpacing: '0.5px' } }, 'Growth Mindset Moment'),
          el('div', { style: { fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '16px' } }, growthNudgeMsg),
          el('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center' } },
            el('button', {
              onClick: function() { upd('showGrowthNudge', false); },
              style: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
            }, 'I\u2019ve got this! \uD83D\uDCAA'),
            callGemini && el('button', {
              onClick: function() {
                upd({ showGrowthNudge: false, showNpcDialog: false });
                var eng = window[engineKey];
                if (!eng || !callGemini) return;
                var wrong = (eng.sessionLog || []).filter(function(e) { return e.type === 'answer_wrong'; });
                var lastWrong = wrong.length > 0 ? wrong[wrong.length - 1] : null;
                var coachPrompt = 'You are a warm, encouraging growth mindset coach for a student (age 8-12) struggling with a geometry question in a 3D block world. '
                  + (lastWrong ? 'They just got this wrong: "' + (lastWrong.data.question || '') + '". The correct answer was: "' + (lastWrong.data.correctAnswer || '') + '". ' : '')
                  + 'In 2-3 sentences: (1) validate their effort, (2) give a concrete strategy for solving volume problems using blocks, (3) end with encouragement. '
                  + 'Use language a child would understand. Reference counting blocks, layers, or L\u00d7W\u00d7H.';
                callGemini(coachPrompt, true).then(function(response) {
                  if (addToast) addToast('\uD83C\uDF31 Coach: ' + response, 'info');
                  if (eng && eng.logEvent) eng.logEvent('growth_nudge_coach', { response: response.substring(0, 100) });
                });
              },
              style: { background: '#1e293b', color: '#a78bfa', border: '1px solid #7c3aed', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
            }, 'Help me think \uD83E\uDDE0')
          )
        ),
        // ── Peer Worlds Browser Overlay ──
        showPeerWorlds && el('div', {
          style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 36,
            background: 'rgba(15,23,42,0.97)', border: '2px solid #a78bfa', borderRadius: '16px',
            padding: '20px', maxWidth: '520px', width: '90%', maxHeight: '70%', overflowY: 'auto' }
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
            el('div', { style: { fontSize: '15px', fontWeight: 800, color: '#c4b5fd' } }, '\uD83D\uDCDA Class World Library'),
            el('div', { style: { display: 'flex', gap: '6px' } },
              el('button', { onClick: loadPeerWorlds, style: { background: 'none', border: 'none', color: '#7c3aed', fontSize: '12px', cursor: 'pointer', fontWeight: 600 } }, '\u21BB Refresh'),
              el('button', { 'aria-label': 'Close class worlds browser', onClick: function() { upd('showPeerWorlds', false); }, style: { background: 'none', border: 'none', color: '#6b7280', fontSize: '18px', cursor: 'pointer' } }, '\u00d7')
            )
          ),
          peerWorldsList.length === 0
            ? el('div', { style: { textAlign: 'center', padding: '24px', color: '#6b7280' } },
                el('div', { style: { fontSize: '32px', marginBottom: '8px' } }, '\uD83C\uDF0D'),
                el('div', { style: { fontSize: '13px' } }, 'No worlds shared yet! Build something in Creator Mode and click Share.')
              )
            : el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                peerWorldsList.map(function(world, wi) {
                  return el('div', {
                    key: wi,
                    style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'border-color 0.2s' },
                    onClick: function() {
                      var eng = window[engineKey];
                      if (!eng) return;
                      var wd = world.data;
                      if (wd.structures || wd.npcs) {
                        eng.loadLesson(wd);
                      } else if (wd.blocks) {
                        eng.clearWorld();
                        eng.scene.background.setRGB(0.53, 0.81, 0.92);
                        wd.blocks.forEach(function(b) { eng.placeBlock(b.x, b.y, b.z, b.type || 'stone'); });
                        if (wd.npcs) wd.npcs.forEach(function(n) { eng.createNPC(n); });
                      }
                      upd('showPeerWorlds', false);
                      if (addToast) addToast('\uD83C\uDF0D Loaded "' + world.title + '" by ' + world.author, 'success');
                      if (eng.logEvent) eng.logEvent('peer_world_loaded', { title: world.title, author: world.author });
                    }
                  },
                    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                      el('div', null,
                        el('div', { style: { fontWeight: 700, color: '#e2e8f0', fontSize: '13px' } }, '\uD83E\uDDF1 ' + world.title),
                        el('div', { style: { fontSize: '11px', color: '#94a3b8' } }, 'by ' + world.author)
                      ),
                      el('div', { style: { fontSize: '10px', color: '#64748b' } },
                        world.timestamp ? new Date(world.timestamp).toLocaleTimeString() : '',
                        el('div', null, (world.data.blocks ? world.data.blocks.length + ' blocks' : ''))
                      )
                    )
                  );
                })
              )
        ),
        // ── Teacher Command Center Overlay ──
        showTeacherView && el('div', {
          style: { position: 'absolute', top: '48px', right: '8px', zIndex: 22, background: 'rgba(15,23,42,0.97)',
            border: '2px solid #f87171', borderRadius: '14px', padding: '16px', width: '340px', maxHeight: '70%', overflowY: 'auto' }
        },
          el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
            el('div', { style: { fontWeight: 800, color: '#f87171', fontSize: '14px' } }, '\uD83D\uDCCA Teacher Dashboard'),
            el('button', { 'aria-label': 'Close teacher dashboard', onClick: toggleTeacherView, style: { background: 'none', border: 'none', color: '#6b7280', fontSize: '16px', cursor: 'pointer' } }, '\u00d7')
          ),
          // Live session info
          el('div', { style: { fontSize: '11px', color: '#94a3b8', marginBottom: '10px', padding: '6px 8px', background: '#0f172a', borderRadius: '6px' } },
            'Session: ' + sessionCode + ' \u2022 ' + Object.keys(studentProgressMap).length + ' students connected'
          ),
          // Student cards
          Object.keys(studentProgressMap).length === 0
            ? el('div', { style: { textAlign: 'center', padding: '20px', color: '#6b7280' } },
                el('div', { style: { fontSize: '24px', marginBottom: '6px' } }, '\uD83D\uDC65'),
                'Waiting for students to join...'
              )
            : el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                Object.keys(studentProgressMap).map(function(sid) {
                  var sp = studentProgressMap[sid];
                  var stats = sp.stats || {};
                  var accuracy = stats.quizAvg || 0;
                  var tierColor = accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? '#f59e0b' : '#ef4444';
                  var tierLabel = accuracy >= 80 ? 'T1' : accuracy >= 50 ? 'T2' : 'T3';
                  return el('div', {
                    key: sid,
                    style: { background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px' }
                  },
                    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                      el('div', { style: { fontWeight: 700, color: '#e2e8f0', fontSize: '12px' } }, sp.studentNickname || sid),
                      el('div', { style: { background: tierColor, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 } }, tierLabel + ' ' + Math.round(accuracy) + '%')
                    ),
                    // Stats row
                    el('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                      el('span', { style: { fontSize: '10px', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' } },
                        '\u2B50 ' + (stats.globalPoints || 0) + ' XP'),
                      stats.focusRatio !== undefined && el('span', { style: { fontSize: '10px', color: stats.focusRatio > 0.7 ? '#4ade80' : '#f59e0b', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' } },
                        '\uD83C\uDFAF ' + Math.round((stats.focusRatio || 0) * 100) + '% focus'),
                      el('span', { style: { fontSize: '10px', color: '#94a3b8', background: '#0f172a', padding: '2px 6px', borderRadius: '4px' } },
                        '\uD83D\uDD52 ' + (stats.engagedMinutes || 0) + 'min')
                    ),
                    // Last synced
                    sp.lastSynced && el('div', { style: { fontSize: '9px', color: '#475569', marginTop: '4px' } },
                      'Last sync: ' + new Date(sp.lastSynced).toLocaleTimeString())
                  );
                })
              ),
          // Collab players in geometry world
          Object.keys(collabPlayers).length > 0 && el('div', { style: { marginTop: '12px', borderTop: '1px solid #334155', paddingTop: '10px' } },
            el('div', { style: { fontWeight: 700, color: '#34d399', fontSize: '11px', marginBottom: '6px' } }, '\uD83E\uDDF1 In Geometry World Right Now'),
            Object.keys(collabPlayers).map(function(key) {
              var p = collabPlayers[key];
              return el('div', { key: key, style: { fontSize: '11px', color: '#cbd5e1', padding: '2px 0', display: 'flex', alignItems: 'center', gap: '6px' } },
                el('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color || '#34d399' } }),
                p.name,
                el('span', { style: { color: '#475569', fontSize: '9px' } },
                  p.position ? ' at (' + Math.round(p.position[0]) + ', ' + Math.round(p.position[2]) + ')' : '')
              );
            })
          )
        ),
        // ── Collaborative Player Indicators ──
        collabMode && Object.keys(collabPlayers).length > 0 && el('div', {
          style: { position: 'absolute', top: '48px', left: '8px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '4px' }
        },
          el('div', { style: { fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '2px' } }, '\uD83D\uDC65 Builders Online'),
          Object.keys(collabPlayers).map(function(key) {
            var p = collabPlayers[key];
            var isMe = p.name === playerName;
            return el('div', {
              key: key,
              style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '3px 8px',
                background: isMe ? 'rgba(5,150,105,0.3)' : 'rgba(15,23,42,0.8)',
                borderRadius: '6px', border: '1px solid ' + (isMe ? '#34d399' : '#334155') }
            },
              el('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: p.color || '#34d399' } }),
              el('span', { style: { color: isMe ? '#34d399' : '#cbd5e1', fontWeight: isMe ? 700 : 400 } }, p.name + (isMe ? ' (you)' : '')),
              p.position && el('span', { style: { color: '#64748b', fontSize: '9px' } },
                '(' + Math.round(p.position[0]) + ', ' + Math.round(p.position[2]) + ')')
            );
          })
        ),
        // 3D Canvas container (or fallback if WebGL unavailable)
        window[engineKey + '_failed']
          ? el('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: '12px', padding: '32px' } },
              el('div', { style: { textAlign: 'center', maxWidth: '400px' } },
                el('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '\uD83C\uDFAE'),
                el('div', { style: { color: '#f1f5f9', fontSize: '16px', fontWeight: 700, marginBottom: '8px' } }, 'WebGL Not Available'),
                el('div', { style: { color: '#94a3b8', fontSize: '12px', lineHeight: '1.6' } },
                  'Geometry World requires WebGL for 3D rendering. This environment may not support it. Try opening AlloFlow directly in Chrome, Firefox, or Edge instead of within an embedded frame.'
                )
              )
            )
          : el('div', {
              ref: function(node) {
                if (node && !window[engineKey] && threeReady) {
                  setTimeout(function() { initEngine(node); }, 100);
                }
              },
              role: 'img',
              'aria-label': 'Interactive 3D world view. Click to enter. ' + (currentLesson.title || 'Geometry World') + '. ' + score + ' of ' + totalQ + ' questions answered.',
              tabIndex: 0,
              style: { flex: 1, position: 'relative' }
            })
      );
    }
  });

  console.log('[StemLab] Geometry World tool registered');
})();
