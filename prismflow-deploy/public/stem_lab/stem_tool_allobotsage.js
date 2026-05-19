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
// stem_tool_allobotsage.js — AlloBot: Starbound Sage
// A roguelite spell-crafter where AlloBot's spells unlock as students
// master skills in other STEM Lab tools. Casting a spell requires a
// short retrieval-practice micro-challenge tied to the source tool.
// Phase 1 MVP: single-player, 10 spells, single-encounter expeditions.
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('alloBotSage'))) {

(function() {
  'use strict';

  // ── Audio ──
  var _absAC = null;
  function getAC() { if (!_absAC) { try { _absAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_absAC && _absAC.state === 'suspended') { try { _absAC.resume(); } catch(e) {} } return _absAC; }
  function absTone(f, d, t, v) { var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxCastReady() { absTone(660, 0.08, 'sine', 0.05); setTimeout(function() { absTone(880, 0.1, 'sine', 0.06); }, 70); }
  function sfxCastHit()   { absTone(440, 0.05, 'sawtooth', 0.05); setTimeout(function() { absTone(220, 0.15, 'sawtooth', 0.06); }, 50); }
  function sfxCastCrit()  { absTone(880, 0.06, 'square', 0.06); setTimeout(function() { absTone(1320, 0.08, 'sine', 0.07); }, 50); setTimeout(function() { absTone(1760, 0.12, 'sine', 0.08); }, 120); }
  function sfxBackfire()  { absTone(180, 0.15, 'sawtooth', 0.07); setTimeout(function() { absTone(120, 0.2, 'square', 0.05); }, 100); }
  function sfxUnlock()    { absTone(523, 0.08, 'sine', 0.06); setTimeout(function() { absTone(784, 0.1, 'sine', 0.07); }, 70); setTimeout(function() { absTone(1047, 0.2, 'sine', 0.08); }, 150); }
  function sfxVictory()   { [523, 659, 784, 1047].forEach(function(f, i) { setTimeout(function() { absTone(f, 0.12, 'sine', 0.07); }, i * 80); }); }
  function sfxClick()     { absTone(600, 0.03, 'sine', 0.04); }

  // ── a11y CSS + live region ──
  if (!document.getElementById('abs-a11y-css')) {
    var _s = document.createElement('style');
    _s.id = 'abs-a11y-css';
    _s.textContent = '@media (prefers-reduced-motion: reduce) { .abs-anim, .abs-pulse, .abs-float, .abs-backflip, .abs-confetti, .abs-wand-aura, .abs-wand-flicker, .abs-idle-twist { animation: none !important; transition: none !important; } }'
      + ' @keyframes absPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }'
      + ' @keyframes absFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }'
      + ' @keyframes absSpin { to { transform: rotate(360deg); } }'
      + ' @keyframes absFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }'
      // ── Phase A: victory celebration keyframes ──
      // absBackflip = full 360° rotate + slight rise then settle, ~1.4s.
      // absConfetti = particle drop + fade for the burst overlay.
      + ' @keyframes absBackflip { 0% { transform: translateY(0) rotate(0deg); } 35% { transform: translateY(-22px) rotate(180deg); } 70% { transform: translateY(-6px) rotate(360deg); } 100% { transform: translateY(0) rotate(360deg); } }'
      + ' @keyframes absConfetti { 0% { transform: translate(0,0) rotate(0deg); opacity: 1; } 100% { transform: translate(var(--abs-cdx, 0), var(--abs-cdy, 80px)) rotate(540deg); opacity: 0; } }'
      // ── Phase B: wand-tier aura keyframes ──
      // absWandAura pulses the radial-gradient ring radius/opacity for tier 3 (10+ unlocks).
      + ' @keyframes absWandAura { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.18); } }'
      + ' @keyframes absWandFlicker { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }'
      // ── Phase C: hub idle micro-flourish (small antenna twist / wand wiggle) ──
      + ' @keyframes absIdleTwist { 0%,80%,100% { transform: rotate(0deg); } 88% { transform: rotate(-6deg); } 94% { transform: rotate(4deg); } }'
      + ' .abs-pulse { animation: absPulse 1.4s ease-in-out infinite; }'
      + ' .abs-float { animation: absFloat 3s ease-in-out infinite; }'
      + ' .abs-spin  { animation: absSpin 3s linear infinite; }'
      + ' .abs-fade  { animation: absFade 0.3s ease-out; }'
      + ' .abs-backflip { animation: absBackflip 1.4s cubic-bezier(0.4, 0, 0.2, 1) 1; }'
      + ' .abs-confetti-piece { position: absolute; width: 8px; height: 8px; pointer-events: none; will-change: transform, opacity; animation: absConfetti 1.2s ease-out forwards; }'
      + ' .abs-wand-aura { animation: absWandAura 2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }'
      + ' .abs-wand-flicker { animation: absWandFlicker 1.6s ease-in-out infinite; }'
      + ' .abs-idle-twist { animation: absIdleTwist 6s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }'
      // ── Phase 5: per-sector ambient particle effects (battlefield) ──
      // absTwinkle: stars in Crystal Nebula — pulsing opacity.
      // absDriftRise: pages/glyphs in Whispering Archive — drift upward, fade.
      // absSlowSpin: gears in Ember Clockwork — slow rotate.
      // absBubble: bubbles in Deep Tide — rise + fade out at top.
      + ' @keyframes absTwinkle { 0%,100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }'
      + ' @keyframes absDriftRise { 0% { transform: translateY(20px) rotate(-4deg); opacity: 0; } 15% { opacity: 0.6; } 85% { opacity: 0.6; } 100% { transform: translateY(-60px) rotate(8deg); opacity: 0; } }'
      + ' @keyframes absSlowSpin { to { transform: rotate(360deg); } }'
      + ' @keyframes absBubble { 0% { transform: translateY(0) scale(0.7); opacity: 0; } 20% { opacity: 0.55; } 90% { opacity: 0.55; } 100% { transform: translateY(-140px) scale(1); opacity: 0; } }'
      + ' .abs-twinkle { animation: absTwinkle 2.4s ease-in-out infinite; }'
      + ' .abs-drift-rise { animation: absDriftRise 6s ease-in-out infinite; }'
      + ' .abs-slow-spin { animation: absSlowSpin 8s linear infinite; transform-origin: center; transform-box: fill-box; }'
      + ' .abs-bubble { animation: absBubble 5s ease-in-out infinite; }';
    document.head.appendChild(_s);
  }
  (function() {
    if (document.getElementById('allo-live-allobotsage')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-allobotsage';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function announceSR(msg) {
    var el = document.getElementById('allo-live-allobotsage');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // ═══════════════════════════════════════════════════════════════
  // SPELLBOOK — Phase 1 MVP: 10 spells across 3 source tools
  // Each spell has:
  //   unlock(d)      — predicate over toolData; returns true when spell is earned
  //   unlockHint     — human-readable condition shown on locked spells
  //   challengeBank  — array of {prompt, options, correctIndex, explain}
  //   baseDamage, critMultiplier, element, icon, color
  // ═══════════════════════════════════════════════════════════════
  var SPELLBOOK = [
    // ── Space Explorer spells ─────────────────────────────────
    {
      id: 'quantum_leap',
      name: 'Quantum Leap',
      element: 'aether',
      icon: '\u2728',
      color: '#a855f7',
      sourceTool: 'spaceExplorer',
      sourceLabel: 'Space Explorer',
      unlock: function(d) { return ((d.spaceExplorer || {}).completedMissions || 0) >= 1; },
      unlockHint: 'Complete 1 mission in Space Explorer',
      baseDamage: 22,
      critMultiplier: 2.0,
      flavor: 'A shimmer of quantum probability lances toward the foe.',
      challengeBank: [
        { prompt: 'Which planet orbits the Sun most quickly?', options: ['Jupiter', 'Mercury', 'Neptune', 'Saturn'], correctIndex: 1, explain: 'Closer orbits = faster orbital periods (Kepler\u2019s third law).' },
        { prompt: 'Light from the Sun takes roughly how long to reach Earth?', options: ['8 minutes', '8 seconds', '8 hours', '8 days'], correctIndex: 0, explain: 'About 8 minutes \u2014 150 million km \u00f7 c.' },
        { prompt: 'What is a light-year a unit of?', options: ['time', 'speed', 'distance', 'mass'], correctIndex: 2, explain: 'Distance light travels in one year \u2014 ~9.46 trillion km.' },
        { prompt: 'Which force keeps planets in orbit around the Sun?', options: ['friction', 'magnetism', 'gravity', 'tension'], correctIndex: 2, explain: 'Gravity between Sun and planet provides the centripetal pull.' },
        { prompt: 'Which planet has the most moons?', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 3, explain: 'Saturn currently holds the title with 140+ confirmed moons.' },
        { prompt: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correctIndex: 1, explain: 'Iron oxide (rust) on Mars\u2019 surface gives it the reddish color.' },
        { prompt: 'Which is LARGEST by volume?', options: ['Earth', 'Mars', 'Neptune', 'Jupiter'], correctIndex: 3, explain: 'Jupiter \u2014 you could fit about 1,300 Earths inside it.' }
      ]
    },
    {
      id: 'gravity_well',
      name: 'Gravity Well',
      element: 'gravity',
      icon: '\uD83C\uDF0C',
      color: '#6366f1',
      sourceTool: 'spaceExplorer',
      sourceLabel: 'Space Explorer',
      unlock: function(d) { return ((d.spaceExplorer || {}).completedMissions || 0) >= 3; },
      unlockHint: 'Complete 3 missions in Space Explorer',
      baseDamage: 30,
      critMultiplier: 2.2,
      flavor: 'Bends spacetime into a crushing singularity at the target.',
      challengeBank: [
        { prompt: 'Which of these has the STRONGEST surface gravity?', options: ['Moon', 'Mars', 'Earth', 'Jupiter'], correctIndex: 3, explain: 'Jupiter\u2019s surface gravity is ~2.5\u00d7 Earth\u2019s.' },
        { prompt: 'On the Moon (g = 1.62 m/s\u00b2), objects fall how compared to Earth?', options: ['slower', 'faster', 'same', 'sideways'], correctIndex: 0, explain: 'Lower g \u2192 smaller acceleration \u2192 slower fall.' },
        { prompt: 'What happens to your weight on Mars vs Earth?', options: ['3\u00d7 heavier', 'same', 'about 38% of Earth', 'zero'], correctIndex: 2, explain: 'Mars g = 3.72 m/s\u00b2 \u2248 38% of Earth\u2019s 9.8 m/s\u00b2.' },
        { prompt: 'A black hole\u2019s event horizon is the point where...', options: ['light can escape easily', 'not even light escapes', 'gravity reverses', 'time stops globally'], correctIndex: 1, explain: 'Past the event horizon, escape velocity exceeds the speed of light.' },
        { prompt: 'Astronauts on the ISS feel weightless because they are...', options: ['outside Earth\u2019s gravity', 'in continuous free fall', 'too small to feel gravity', 'spinning fast'], correctIndex: 1, explain: 'The ISS and astronauts fall around Earth together \u2014 free fall = apparent weightlessness.' },
        { prompt: 'Which pair of objects experiences the STRONGEST gravity between them?', options: ['2 apples next to each other', 'Earth and a bowling ball', 'Earth and the Moon', 'You and your phone'], correctIndex: 2, explain: 'F = Gm\u2081m\u2082/r\u00b2 \u2014 huge masses dominate even at large distance.' }
      ]
    },
    {
      id: 'solar_flare',
      name: 'Solar Flare',
      element: 'flame',
      icon: '\u2600\uFE0F',
      color: '#f59e0b',
      sourceTool: 'spaceExplorer',
      sourceLabel: 'Space Explorer',
      unlock: function(d) { return ((d.spaceExplorer || {}).totalScience || 0) >= 150; },
      unlockHint: 'Earn 150 science points in Space Explorer',
      baseDamage: 26,
      critMultiplier: 2.0,
      flavor: 'A lance of plasma erupts from AlloBot\u2019s wand.',
      challengeBank: [
        { prompt: 'The Sun is mostly made of which element?', options: ['oxygen', 'iron', 'hydrogen', 'carbon'], correctIndex: 2, explain: 'Hydrogen (~74%) fusing into helium powers the Sun.' },
        { prompt: 'What process releases energy in the Sun\u2019s core?', options: ['combustion', 'fission', 'fusion', 'friction'], correctIndex: 2, explain: 'Nuclear fusion \u2014 hydrogen nuclei merging into helium.' },
        { prompt: 'Which layer of the Sun do we see with our eyes?', options: ['core', 'photosphere', 'corona', 'radiative zone'], correctIndex: 1, explain: 'The photosphere is the visible surface layer.' },
        { prompt: 'Solar flares are bursts of...', options: ['solid matter', 'radiation and charged particles', 'liquid sunlight', 'silent vibration'], correctIndex: 1, explain: 'Magnetic reconnection releases radiation + accelerated particles.' },
        { prompt: 'When a solar flare hits Earth\u2019s atmosphere, it can cause...', options: ['auroras', 'earthquakes', 'tides', 'eclipses'], correctIndex: 0, explain: 'Charged particles exciting upper-atmosphere gases produce the aurora.' },
        { prompt: 'Which star is closest to Earth?', options: ['Proxima Centauri', 'Sirius', 'the Sun', 'Polaris'], correctIndex: 2, explain: 'The Sun is our star \u2014 only ~8 light-minutes away.' }
      ]
    },
    {
      id: 'nebula_cloak',
      name: 'Nebula Cloak',
      element: 'void',
      icon: '\uD83C\uDF2B\uFE0F',
      color: '#0ea5e9',
      sourceTool: 'spaceExplorer',
      sourceLabel: 'Space Explorer',
      unlock: function(d) { return (((d.spaceExplorer || {}).unlockedTech) || []).length >= 2; },
      unlockHint: 'Unlock 2 technologies in Space Explorer',
      baseDamage: 18,
      critMultiplier: 1.8,
      flavor: 'A shroud of cosmic dust protects the caster and strikes foes.',
      challengeBank: [
        { prompt: 'A nebula is mostly made of...', options: ['gas and dust', 'solid rock', 'liquid water', 'plasma fields only'], correctIndex: 0, explain: 'Interstellar gas (mostly hydrogen) and dust grains.' },
        { prompt: 'Stars are born in...', options: ['black holes', 'nebulae', 'galaxies only', 'supernovae only'], correctIndex: 1, explain: 'Gravitational collapse inside nebulae forms new stars.' },
        { prompt: 'A supernova is...', options: ['a newborn star', 'an exploding massive star', 'a cold dead planet', 'a type of aurora'], correctIndex: 1, explain: 'End-of-life explosion of a massive star, seeding heavy elements.' },
        { prompt: 'The rainbow colors you see when starlight passes through a prism reveal the star\u2019s...', options: ['age only', 'mass only', 'composition', 'temperature only'], correctIndex: 2, explain: 'Absorption lines in a spectrum identify elements present.' },
        { prompt: 'Which telescope type uses a curved mirror to focus light?', options: ['refracting', 'reflecting', 'prismatic', 'laser'], correctIndex: 1, explain: 'Reflectors (like Hubble) use mirrors; refractors use lenses.' },
        { prompt: 'A galaxy is a collection of...', options: ['planets only', 'billions of stars + gas + dust', 'solar systems in one star', 'black holes only'], correctIndex: 1, explain: 'Typical galaxy: 100 million to 1 trillion stars plus interstellar medium.' }
      ]
    },

    // ── Math Lab spells ─────────────────────────────────
    {
      id: 'fraction_fire',
      name: 'Fraction Fire',
      element: 'flame',
      icon: '\uD83D\uDD25',
      color: '#ef4444',
      sourceTool: 'mathLab',
      sourceLabel: 'Math Lab (Fractions)',
      // Soft unlock: any activity in fractions tool. Field names are pragmatic
      // guesses \u2014 tolerant of absent data.
      unlock: function(d) {
        var m = d.fractions || d.mathLab || {};
        var f = d.fractions || {};
        return (m.activitiesCompleted || 0) >= 2 || (f.problemsSolved || 0) >= 2 || (m.fractionsCompleted || 0) >= 1;
      },
      unlockHint: 'Solve 2 problems in Math Lab \u2192 Fractions',
      baseDamage: 20,
      critMultiplier: 2.0,
      flavor: 'Flames in exact proportion incinerate the enemy.',
      challengeBank: [
        { prompt: 'Simplify 6/8', options: ['3/4', '2/4', '6/8', '1/2'], correctIndex: 0, explain: '6\u00f72 / 8\u00f72 = 3/4.' },
        { prompt: 'Which fraction equals 1/2?', options: ['2/5', '3/6', '4/10', '5/9'], correctIndex: 1, explain: '3/6 = 1/2.' },
        { prompt: '1/4 + 1/4 = ?', options: ['2/8', '1/2', '2/4 only', 'undefined'], correctIndex: 1, explain: '2/4 simplifies to 1/2.' },
        { prompt: 'Which is greater: 2/3 or 3/5?', options: ['2/3', '3/5', 'equal', 'cannot compare'], correctIndex: 0, explain: '2/3 \u2248 0.67 > 3/5 = 0.60.' },
        { prompt: 'Simplify 10/15', options: ['2/3', '5/6', '3/4', '1/2'], correctIndex: 0, explain: '10\u00f75 / 15\u00f75 = 2/3.' },
        { prompt: '1/3 + 1/6 = ?', options: ['1/9', '2/9', '1/2', '2/3'], correctIndex: 2, explain: 'LCD 6: 2/6 + 1/6 = 3/6 = 1/2.' },
        { prompt: '2/3 of 12 is...', options: ['4', '6', '8', '9'], correctIndex: 2, explain: '12 \u00f7 3 = 4; 4 \u00d7 2 = 8.' },
        { prompt: 'Which decimal equals 3/4?', options: ['0.34', '0.43', '0.75', '0.80'], correctIndex: 2, explain: '3 \u00f7 4 = 0.75.' }
      ]
    },
    {
      id: 'algebra_arc',
      name: 'Algebra Arc',
      element: 'lightning',
      icon: '\u26A1',
      color: '#eab308',
      sourceTool: 'mathLab',
      sourceLabel: 'Math Lab (Algebra)',
      unlock: function(d) {
        var a = d.algebraCAS || d.inequality || d.funcGrapher || {};
        var m = d.mathLab || {};
        return (a.solved || 0) >= 1 || (m.algebraProblems || 0) >= 1;
      },
      unlockHint: 'Solve 1 equation in Math Lab \u2192 Algebra',
      baseDamage: 28,
      critMultiplier: 2.1,
      flavor: 'A bolt of variables arcs between foes.',
      challengeBank: [
        { prompt: 'Solve for x: x + 7 = 12', options: ['x = 5', 'x = 19', 'x = 12', 'x = -5'], correctIndex: 0, explain: '12 - 7 = 5.' },
        { prompt: 'Solve for x: 3x = 21', options: ['x = 3', 'x = 7', 'x = 18', 'x = 24'], correctIndex: 1, explain: '21 \u00f7 3 = 7.' },
        { prompt: 'Solve for x: 2x + 4 = 10', options: ['x = 2', 'x = 3', 'x = 4', 'x = 7'], correctIndex: 1, explain: '2x = 6 \u2192 x = 3.' },
        { prompt: 'Solve for x: 5x \u2212 3 = 22', options: ['x = 4', 'x = 5', 'x = 6', 'x = 25'], correctIndex: 1, explain: '5x = 25 \u2192 x = 5.' },
        { prompt: 'If y = 2x + 1 and x = 3, what is y?', options: ['5', '6', '7', '9'], correctIndex: 2, explain: 'y = 2(3)+1 = 7.' },
        { prompt: 'Solve: x/4 = 3', options: ['x = 0.75', 'x = 4', 'x = 7', 'x = 12'], correctIndex: 3, explain: 'Multiply both sides by 4 \u2192 x = 12.' },
        { prompt: 'Simplify: 3(x + 2)', options: ['3x + 2', '3x + 6', 'x + 6', '3x \u2212 6'], correctIndex: 1, explain: 'Distribute: 3\u00b7x + 3\u00b72 = 3x + 6.' }
      ]
    },
    {
      id: 'geometry_grasp',
      name: 'Geometry Grasp',
      element: 'stone',
      icon: '\u25C7',
      color: '#10b981',
      sourceTool: 'mathLab',
      sourceLabel: 'Math Lab (Geometry)',
      unlock: function(d) {
        var g = d.geoSandbox || d.geometryWorld || d.angles || d.areamodel || {};
        return (g.activitiesCompleted || 0) >= 1 || (g.shapesBuilt || 0) >= 1 || (g.correct || 0) >= 1;
      },
      unlockHint: 'Complete 1 activity in Math Lab \u2192 Geometry',
      baseDamage: 24,
      critMultiplier: 1.9,
      flavor: 'Crystalline shards arrange themselves in perfect polygons.',
      challengeBank: [
        { prompt: 'How many sides does a hexagon have?', options: ['5', '6', '7', '8'], correctIndex: 1, explain: 'Hex- = 6.' },
        { prompt: 'A triangle has angles 60\u00b0, 70\u00b0, and ?', options: ['40\u00b0', '50\u00b0', '60\u00b0', '90\u00b0'], correctIndex: 1, explain: 'Angles sum to 180\u00b0: 180 - 60 - 70 = 50.' },
        { prompt: 'Area of a rectangle with sides 4 and 5?', options: ['9', '18', '20', '25'], correctIndex: 2, explain: 'Area = length \u00d7 width = 4 \u00d7 5 = 20.' },
        { prompt: 'Perimeter of a square with side length 6?', options: ['12', '18', '24', '36'], correctIndex: 2, explain: 'Perimeter = 4 \u00d7 side = 4 \u00d7 6 = 24.' },
        { prompt: 'Area of a triangle with base 8 and height 5?', options: ['13', '20', '30', '40'], correctIndex: 1, explain: 'Area = \u00bd \u00d7 base \u00d7 height = \u00bd \u00d7 8 \u00d7 5 = 20.' },
        { prompt: 'Angles in a right angle measure how many degrees?', options: ['45\u00b0', '60\u00b0', '90\u00b0', '180\u00b0'], correctIndex: 2, explain: 'Right angle = 90\u00b0 (a quarter turn).' },
        { prompt: 'Area of a circle with radius 3 (use \u03c0 \u2248 3.14)?', options: ['~9.4', '~18.8', '~28.3', '~38.5'], correctIndex: 2, explain: 'A = \u03c0r\u00b2 = \u03c0 \u00d7 9 \u2248 28.3.' }
      ]
    },

    // ── RoadReady spells ─────────────────────────────────
    {
      id: 'road_ward',
      name: 'Road Ward',
      element: 'stone',
      icon: '\uD83D\uDEE1\uFE0F',
      color: '#94a3b8',
      sourceTool: 'roadReady',
      sourceLabel: 'RoadReady',
      unlock: function(d) {
        var r = d.roadReady || {};
        return (r.permitAnswered || 0) >= 3 || (r.scenariosCompleted || 0) >= 1 || r.permitPassed === true;
      },
      unlockHint: 'Answer 3 permit questions in RoadReady',
      baseDamage: 20,
      critMultiplier: 1.9,
      flavor: 'A wall of defensive driving instinct blocks the attack.',
      challengeBank: [
        { prompt: 'At a 4-way stop, a car arrives the same moment as you on your RIGHT. Who goes first?', options: ['you go first', 'the other car', 'whoever honks', 'both at once'], correctIndex: 1, explain: 'The car on your right has right-of-way at a 4-way stop.' },
        { prompt: 'A flashing RED traffic light means...', options: ['treat as stop sign', 'go faster', 'yield only', 'construction ahead'], correctIndex: 0, explain: 'Flashing red = full stop, then proceed when safe.' },
        { prompt: 'When you see a school bus with flashing red lights stopped ahead, you must...', options: ['pass carefully', 'honk and pass', 'stop completely', 'slow to 15 mph'], correctIndex: 2, explain: 'Stop and wait until the lights stop flashing (most US states).' },
        { prompt: 'Safe following distance is typically measured by the...', options: ['3-second rule', '1-minute rule', 'license-plate rule', 'coin-flip rule'], correctIndex: 0, explain: 'Stay at least 3 seconds behind the car in front (more in bad weather).' },
        { prompt: 'Hydroplaning is most likely to happen when...', options: ['driving slow on dry road', 'driving fast on wet road', 'parked', 'backing up'], correctIndex: 1, explain: 'Water lifts tires off the road \u2014 worst at high speed on wet surfaces.' },
        { prompt: 'If your tires lose grip and the rear slides out, you should...', options: ['slam the brakes', 'steer the way you want to go', 'turn the wheel opposite', 'accelerate hard'], correctIndex: 1, explain: '\u201cSteer into the skid\u201d \u2014 point the wheels where you want to go.' },
        { prompt: 'Seat belts work best because they...', options: ['look nice', 'spread crash forces across the body', 'warm you up', 'increase comfort'], correctIndex: 1, explain: 'They distribute deceleration forces over the strong parts of the skeleton.' }
      ]
    },
    {
      id: 'signal_sigil',
      name: 'Signal Sigil',
      element: 'aether',
      icon: '\uD83D\uDEA6',
      color: '#8b5cf6',
      sourceTool: 'roadReady',
      sourceLabel: 'RoadReady',
      unlock: function(d) {
        var r = d.roadReady || {};
        return (r.signsIdentified || 0) >= 3 || (r.permitAnswered || 0) >= 5;
      },
      unlockHint: 'Identify 3 signs in RoadReady',
      baseDamage: 22,
      critMultiplier: 2.0,
      flavor: 'A glowing glyph forces enemies to obey traffic law.',
      challengeBank: [
        { prompt: 'A YELLOW diamond sign usually means...', options: ['mandatory action', 'warning', 'regulation', 'rest area'], correctIndex: 1, explain: 'Yellow diamonds are warning signs.' },
        { prompt: 'A RED octagon sign means...', options: ['yield', 'stop', 'merge', 'no entry'], correctIndex: 1, explain: 'Red octagon = STOP.' },
        { prompt: 'An inverted (upside-down) TRIANGLE means...', options: ['yield', 'stop', 'school zone', 'construction'], correctIndex: 0, explain: 'Yield to cross traffic.' },
        { prompt: 'A PENTAGON-shaped sign usually means...', options: ['gas station', 'school zone / school crossing', 'hospital', 'rest stop'], correctIndex: 1, explain: 'Pentagon = school zone in US signage.' },
        { prompt: 'ORANGE signs usually indicate...', options: ['construction / work zone', 'hospital', 'campground', 'tourist info'], correctIndex: 0, explain: 'Orange = construction and temporary traffic controls.' },
        { prompt: 'A WHITE rectangle with black text usually means...', options: ['a warning', 'a regulation (speed limit, etc.)', 'a service', 'a scenic route'], correctIndex: 1, explain: 'White rectangles = regulatory signs (speed limits, one-way, etc.).' },
        { prompt: 'A GREEN sign usually gives...', options: ['warnings', 'directional / guidance info', 'regulations', 'hazards'], correctIndex: 1, explain: 'Green = guide signs (directions, distances, exits).' }
      ]
    },
    {
      id: 'hypermile_hex',
      name: 'Hypermile Hex',
      element: 'gravity',
      icon: '\u26FD',
      color: '#059669',
      sourceTool: 'roadReady',
      sourceLabel: 'RoadReady',
      unlock: function(d) {
        var r = d.roadReady || {};
        return (r.hypermileSessions || 0) >= 1 || (r.bestMPG || 0) >= 30;
      },
      unlockHint: 'Complete 1 Hypermile session in RoadReady',
      baseDamage: 32,
      critMultiplier: 2.3,
      flavor: 'Converts the enemy\u2019s wasted motion into energy drain.',
      challengeBank: [
        { prompt: 'Which driving habit BEST improves fuel efficiency?', options: ['rapid acceleration', 'steady speed', 'slamming brakes', 'idling often'], correctIndex: 1, explain: 'Steady speed \u2192 less kinetic energy wasted in braking/acceleration.' },
        { prompt: 'Air resistance (drag) grows how with speed?', options: ['linearly', 'quadratically', 'not at all', 'exponentially then drops'], correctIndex: 1, explain: 'Drag \u221d v\u00b2 \u2014 doubling speed quadruples drag.' },
        { prompt: 'Why is highway MPG often higher than city MPG?', options: ['fewer hills', 'less stopping and accelerating', 'warmer engine', 'softer tires'], correctIndex: 1, explain: 'Cities waste energy in stop-and-go; highways are closer to steady-state.' },
        { prompt: 'Underinflated tires...', options: ['improve MPG', 'increase rolling resistance (hurt MPG)', 'have no MPG effect', 'are always safer'], correctIndex: 1, explain: 'More deformation = more rolling resistance = lower MPG.' },
        { prompt: 'Idling for 2 minutes uses about as much fuel as driving...', options: ['1 mile', '5 miles', '10 miles', '50 miles'], correctIndex: 0, explain: 'Roughly ~1 mile \u2014 modern guidance: restart if stopped >30s.' },
        { prompt: 'A car doing 70 mph uses much more fuel than one doing 55 mph mostly because of...', options: ['gravity', 'drag (air resistance)', 'engine heat', 'tire noise'], correctIndex: 1, explain: 'Drag rises with v\u00b2 \u2014 the 70\u219255 gap has an outsized energy cost.' },
        { prompt: 'Regenerative braking on hybrids/EVs recovers energy as...', options: ['sound', 'heat only', 'electrical energy in the battery', 'gasoline'], correctIndex: 2, explain: 'The motor acts as a generator, charging the battery while slowing the car.' }
      ]
    },

    // ── Word Sounds spells ─────────────────────────────────
    {
      id: 'phonic_bolt',
      name: 'Phonic Bolt',
      element: 'lightning',
      icon: '\uD83D\uDD0A',
      color: '#0ea5e9',
      sourceTool: 'wordSounds',
      sourceLabel: 'Word Sounds',
      unlock: function(d) {
        var w = d.wordSounds || d.wordSoundsSetup || {};
        return (w.wordsCompleted || 0) >= 3 || (w.soundsMastered || 0) >= 2 || (w.sessionsCompleted || 0) >= 1;
      },
      unlockHint: 'Complete 3 words in Word Sounds',
      baseDamage: 22,
      critMultiplier: 2.0,
      flavor: 'A clear, ringing phoneme cracks the foe.',
      challengeBank: [
        { prompt: 'Which sound starts the word \u201cthunder\u201d?', options: ['/t/', '/th/', '/d/', '/n/'], correctIndex: 1, explain: 'Digraph \u201cth\u201d is a single sound \u2014 the voiceless \u201cth\u201d in thunder.' },
        { prompt: 'Which pair RHYMES?', options: ['cat / dog', 'moon / spoon', 'cup / cap', 'leaf / loaf'], correctIndex: 1, explain: 'Rhymes share ending sounds \u2014 moon/spoon both end in /u:n/.' },
        { prompt: 'How many syllables in \u201cbutterfly\u201d?', options: ['1', '2', '3', '4'], correctIndex: 2, explain: 'but-ter-fly \u2014 3 syllables (clap it out).' },
        { prompt: 'Which word has a SHORT \u201ca\u201d sound?', options: ['cake', 'mat', 'rain', 'play'], correctIndex: 1, explain: 'Short \u201ca\u201d = /\u00e6/ as in mat. The others use long \u201ca\u201d = /e\u026a/.' },
        { prompt: 'The digraph \u201csh\u201d makes what sound?', options: ['/s/ + /h/ separately', '/sh/ as in \u201cshoe\u201d', '/ch/', '/z/'], correctIndex: 1, explain: 'Digraph = two letters, one sound. \u201csh\u201d = /\u0283/ as in shoe.' },
        { prompt: 'Which word BLENDS three consonants at the start?', options: ['stop', 'slip', 'strap', 'smile'], correctIndex: 2, explain: '\u201cstrap\u201d begins with the blend /s/+/t/+/r/.' }
      ]
    },
    {
      id: 'rhyme_ring',
      name: 'Rhyme Ring',
      element: 'aether',
      icon: '\uD83D\uDD14',
      color: '#22d3ee',
      sourceTool: 'wordSounds',
      sourceLabel: 'Word Sounds',
      unlock: function(d) {
        var w = d.wordSounds || d.wordSoundsSetup || {};
        return (w.wordsCompleted || 0) >= 8 || (w.rhymesMatched || 0) >= 4 || (w.sessionsCompleted || 0) >= 3;
      },
      unlockHint: 'Complete 8 words (or 4 rhymes) in Word Sounds',
      baseDamage: 24,
      critMultiplier: 2.0,
      flavor: 'A ringing echo of paired sounds stuns the target.',
      challengeBank: [
        { prompt: 'Which word does NOT rhyme with the others?', options: ['bright', 'fight', 'kite', 'kit'], correctIndex: 3, explain: '\u201ckit\u201d has short /i/; the others share long /a\u026at/.' },
        { prompt: 'Which word rhymes with \u201cblue\u201d?', options: ['bow', 'bee', 'shoe', 'by'], correctIndex: 2, explain: '\u201cshoe\u201d and \u201cblue\u201d both end in /u:/.' },
        { prompt: 'Which is a near-rhyme (same ending vowel, different consonant)?', options: ['cat / dog', 'red / head', 'bike / boat', 'day / dock'], correctIndex: 1, explain: 'Both end in /\u025bd/.' },
        { prompt: 'Which word has TWO syllables?', options: ['happy', 'cat', 'banana', 'elephant'], correctIndex: 0, explain: 'hap-py = 2. Cat = 1. Banana = 3. Elephant = 3.' },
        { prompt: 'The onset of \u201cplay\u201d is...', options: ['p', 'l', 'pl', 'ay'], correctIndex: 2, explain: 'Onset = all consonants BEFORE the first vowel. \u201cpl\u201d is the onset; \u201cay\u201d is the rime.' },
        { prompt: 'Which word has a SILENT letter?', options: ['cat', 'knee', 'ball', 'jump'], correctIndex: 1, explain: 'The \u201ck\u201d in \u201cknee\u201d is silent.' }
      ]
    },

    // ── WriteCraft spells ─────────────────────────────────
    {
      id: 'narrative_nova',
      name: 'Narrative Nova',
      element: 'flame',
      icon: '\uD83D\uDCD6',
      color: '#f97316',
      sourceTool: 'writeCraft',
      sourceLabel: 'WriteCraft',
      unlock: function(d) {
        var w = d.writeCraft || {};
        return (w.storiesDrafted || 0) >= 1 || (w.paragraphsWritten || 0) >= 3 || (w.sessionsCompleted || 0) >= 1;
      },
      unlockHint: 'Draft 1 story (or 3 paragraphs) in WriteCraft',
      baseDamage: 30,
      critMultiplier: 2.2,
      flavor: 'A narrative arc ignites, scorching the foe across acts.',
      challengeBank: [
        { prompt: 'Which element is MOST essential for a story?', options: ['a character with a goal', 'a glossary', 'a bibliography', 'page numbers'], correctIndex: 0, explain: 'A character pursuing something is the spine of narrative.' },
        { prompt: 'The \u201cclimax\u201d of a story is usually...', options: ['the opening line', 'the peak moment of tension', 'the last paragraph', 'the author\u2019s name'], correctIndex: 1, explain: 'Climax = the turning point where conflict peaks.' },
        { prompt: 'Which opening HOOKS the reader best?', options: ['\u201cIt was a normal Tuesday.\u201d', '\u201cThe phone rang for the twenty-first time that morning.\u201d', '\u201cThis is a story.\u201d', '\u201cChapter 1.\u201d'], correctIndex: 1, explain: 'Specific, curious detail pulls readers in.' },
        { prompt: '\u201cShowing, not telling\u201d means...', options: ['no dialogue allowed', 'describe behavior and senses instead of stating feelings', 'use bullet points', 'write in past tense only'], correctIndex: 1, explain: 'Instead of \u201cshe was nervous,\u201d write \u201cher hands trembled on the door handle.\u201d' },
        { prompt: 'A story told from \u201cshe ran, she thought, she wondered\u201d uses which POV?', options: ['first person', 'second person', 'third person', 'no POV'], correctIndex: 2, explain: 'Third person uses she/he/they as the narrator\u2019s referent.' },
        { prompt: 'What is a \u201cstakes\u201d question in a story?', options: ['what the hero ate', 'what the character stands to lose or gain', 'the publication date', 'page count'], correctIndex: 1, explain: 'Stakes are what matters \u2014 without them, tension collapses.' }
      ]
    },
    {
      id: 'verb_vortex',
      name: 'Verb Vortex',
      element: 'void',
      icon: '\uD83C\uDF2A\uFE0F',
      color: '#d946ef',
      sourceTool: 'writeCraft',
      sourceLabel: 'WriteCraft',
      unlock: function(d) {
        var w = d.writeCraft || {};
        return (w.revisionsMade || 0) >= 1 || (w.strongVerbsUsed || 0) >= 3 || (w.paragraphsWritten || 0) >= 5;
      },
      unlockHint: 'Revise 1 passage (or use 3 strong verbs) in WriteCraft',
      baseDamage: 20,
      critMultiplier: 2.4,
      flavor: 'Weak verbs are replaced mid-strike \u2014 the blow lands twice.',
      challengeBank: [
        { prompt: 'Which is the STRONGEST verb?', options: ['walked', 'went', 'strode', 'moved'], correctIndex: 2, explain: '\u201cStrode\u201d carries purpose and rhythm; the others are vague.' },
        { prompt: 'Which sentence uses active voice?', options: ['The ball was thrown by Maya.', 'Maya threw the ball.', 'The ball was thrown.', 'Thrown was the ball.'], correctIndex: 1, explain: 'Active voice = subject acts on object (Maya \u2192 threw \u2192 ball).' },
        { prompt: 'Which word is a VERB?', options: ['quick', 'jump', 'yellow', 'table'], correctIndex: 1, explain: '\u201cJump\u201d is an action; the others are adjective/adjective/noun.' },
        { prompt: 'Replace \u201cgot\u201d in \u201cShe got the book\u201d with a stronger verb:', options: ['grabbed', 'wanted', 'thought', 'was'], correctIndex: 0, explain: '\u201cGrabbed\u201d is vivid; \u201cwanted/thought/was\u201d changes meaning.' },
        { prompt: 'An adverb USUALLY describes...', options: ['a noun', 'a verb', 'a preposition', 'a comma'], correctIndex: 1, explain: 'Adverbs modify verbs (\u201cshe ran quickly\u201d) \u2014 also adjectives and other adverbs.' },
        { prompt: 'Which is a compound sentence?', options: ['It rained.', 'It rained hard all morning.', 'It rained, and the garden flooded.', 'Rain.'], correctIndex: 2, explain: 'Compound = two independent clauses joined by a conjunction (here, \u201cand\u201d).' }
      ]
    },

    // ── Immersive Reader spells ─────────────────────────────────
    {
      id: 'focus_flare',
      name: 'Focus Flare',
      element: 'aether',
      icon: '\uD83D\uDD0D',
      color: '#14b8a6',
      sourceTool: 'immersiveReader',
      sourceLabel: 'Immersive Reader',
      unlock: function(d) {
        var r = d.immersiveReader || {};
        return (r.sessionsCompleted || 0) >= 1 || (r.wordsRead || 0) >= 50 || (r.timeSpent || 0) >= 120;
      },
      unlockHint: 'Complete 1 Immersive Reader session',
      baseDamage: 24,
      critMultiplier: 2.0,
      flavor: 'Focus narrows the world to a single point of light.',
      challengeBank: [
        { prompt: 'The BEST strategy if you hit an unknown word is...', options: ['skip and guess', 'use context clues from surrounding sentences', 'give up on the passage', 'only check the title'], correctIndex: 1, explain: 'Context clues unlock meaning without breaking flow.' },
        { prompt: '\u201cMain idea\u201d of a paragraph means...', options: ['the longest sentence', 'the overall point it\u2019s making', 'the first word', 'any quote'], correctIndex: 1, explain: 'Main idea = what the paragraph is really saying, not just details.' },
        { prompt: 'Which is a SIGNAL of a supporting detail?', options: ['\u201cfor example\u201d', '\u201cin conclusion\u201d', '\u201cwho are you\u201d', '\u201cpage 1\u201d'], correctIndex: 0, explain: '\u201cFor example\u201d introduces a detail supporting the main idea.' },
        { prompt: 'When reading, to tell FACT from OPINION, ask...', options: ['does it rhyme?', 'can it be proven or tested?', 'is it short?', 'is it in italics?'], correctIndex: 1, explain: 'Facts are verifiable; opinions are beliefs or judgments.' },
        { prompt: 'If a text defines a key word in a glossary, you should...', options: ['ignore it', 'use it to clarify meaning', 'memorize the page number', 'skip to the end'], correctIndex: 1, explain: 'Glossary entries are reading aids \u2014 use them actively.' },
        { prompt: 'Re-reading a confusing passage is...', options: ['always unnecessary', 'a strong strategy used by skilled readers', 'against the rules', 'for beginners only'], correctIndex: 1, explain: 'Skilled readers re-read constantly \u2014 it\u2019s a core comprehension tool.' }
      ]
    },
    {
      id: 'context_cipher',
      name: 'Context Cipher',
      element: 'void',
      icon: '\uD83D\uDD76\uFE0F',
      color: '#6d28d9',
      sourceTool: 'immersiveReader',
      sourceLabel: 'Immersive Reader',
      unlock: function(d) {
        var r = d.immersiveReader || {};
        return (r.sessionsCompleted || 0) >= 3 || (r.wordsRead || 0) >= 200 || (r.definitionsViewed || 0) >= 5;
      },
      unlockHint: 'Complete 3 Immersive Reader sessions (or view 5 definitions)',
      baseDamage: 18,
      critMultiplier: 2.5,
      flavor: 'Turns an enemy\u2019s meaning against it \u2014 devastating when truly understood.',
      challengeBank: [
        { prompt: 'What does \u201cinfer\u201d mean?', options: ['ignore', 'figure out from clues', 'repeat word-for-word', 'avoid'], correctIndex: 1, explain: 'To infer = to draw a conclusion from evidence you\u2019re given.' },
        { prompt: 'A prefix like \u201cun-\u201d usually makes a word...', options: ['opposite / negative', 'louder', 'longer', 'fancier'], correctIndex: 0, explain: '\u201cUn-\u201d flips meaning: happy \u2192 unhappy.' },
        { prompt: 'A \u201cthesis\u201d in nonfiction is...', options: ['a picture', 'the main claim the author argues', 'a joke', 'an index entry'], correctIndex: 1, explain: 'Thesis = the central argument the rest of the text supports.' },
        { prompt: '\u201cSkim\u201d reading means...', options: ['read every word slowly', 'scan quickly for the gist', 'skip entirely', 'read upside down'], correctIndex: 1, explain: 'Skimming = fast sweep for main ideas, not deep comprehension.' },
        { prompt: 'The suffix \u201c-less\u201d usually means...', options: ['more', 'without / lacking', 'again', 'before'], correctIndex: 1, explain: 'Hope + less = without hope.' },
        { prompt: 'If a character says one thing but does the OPPOSITE, that\u2019s...', options: ['sarcasm', 'irony', 'alliteration', 'plagiarism'], correctIndex: 1, explain: 'Irony: a contrast between expectation and reality.' }
      ]
    },

    // ── Typing Practice spells ─────────────────────────────────
    // Pull-based integration: predicates read d.typingPractice directly.
    // Encourages structured-drill progression + accommodation exploration.
    {
      id: 'home_row_focus',
      name: 'Home Row Focus',
      element: 'focus',
      icon: '\u2328\uFE0F',
      color: '#60a5fa',
      sourceTool: 'typingPractice',
      sourceLabel: 'Typing Practice',
      unlock: function(d) { return ((d.typingPractice || {}).masteryLevel || 0) >= 1; },
      unlockHint: 'Clear the Home Row tier in Typing Practice',
      baseDamage: 18,
      critMultiplier: 2.0,
      flavor: 'Steady fingers anchor to the home row, and the spell lands precisely where intended.',
      challengeBank: [
        { prompt: 'Which keys are the LEFT-HAND home row (resting fingers)?', options: ['q w e r', 'a s d f', 'z x c v', '1 2 3 4'], correctIndex: 1, explain: 'Left home row: a (pinky), s (ring), d (middle), f (index).' },
        { prompt: 'Which keys are the RIGHT-HAND home row?', options: ['p o i u', 'j k l ;', 'n m , .', '7 8 9 0'], correctIndex: 1, explain: 'Right home row: j (index), k (middle), l (ring), ; (pinky).' },
        { prompt: 'Touch typing means you...', options: ['type while tapping the screen', 'type without looking at the keys', 'type very softly', 'type only one finger at a time'], correctIndex: 1, explain: 'Eyes stay on the screen; fingers find keys by muscle memory.' },
        { prompt: 'Which finger should press the letter F?', options: ['left middle', 'left index', 'right index', 'left thumb'], correctIndex: 1, explain: 'The left index finger rests on F (notice the small bump that helps you find it without looking).' },
        { prompt: 'Which finger presses the space bar?', options: ['index', 'pinky', 'either thumb', 'ring finger'], correctIndex: 2, explain: 'Thumbs hover over the space bar; use whichever is free.' },
        { prompt: 'The small bump on the F and J keys is called...', options: ['a decoration', 'a home bump', 'a finger rest ridge', 'a lock'], correctIndex: 2, explain: 'The ridges help you find the home row without looking down.' },
        { prompt: 'WPM stands for...', options: ['Words Per Minute', 'Writing Practice Mode', 'Weight Per Millisecond', 'Word Placement Model'], correctIndex: 0, explain: 'WPM = (characters typed / 5) divided by minutes.' }
      ]
    },
    {
      id: 'fluent_keys',
      name: 'Fluent Keys',
      element: 'aether',
      icon: '\uD83E\uDE84',
      color: '#a855f7',
      sourceTool: 'typingPractice',
      sourceLabel: 'Typing Practice',
      unlock: function(d) { return (((d.typingPractice || {}).sessions || []).length) >= 10; },
      unlockHint: 'Complete 10 Typing Practice sessions',
      baseDamage: 24,
      critMultiplier: 2.2,
      flavor: 'Words flow from mind to screen without friction \u2014 the enemy cannot keep up.',
      challengeBank: [
        { prompt: 'Which accommodation would MOST help a student with dyslexia type?', options: ['racing mode', 'OpenDyslexic font', 'louder beeps', 'a smaller keyboard'], correctIndex: 1, explain: 'Dyslexia-friendly fonts reduce letter-confusion (b/d, p/q).' },
        { prompt: '\u201cError-tolerant mode\u201d helps most with...', options: ['dysgraphia', 'running fast', 'memory loss', 'hearing'], correctIndex: 0, explain: 'Dysgraphia can make motor output mismatch intent \u2014 auto-advance keeps progress flowing.' },
        { prompt: 'If your accuracy is 90%, out of 100 keystrokes you got how many right?', options: ['10', '90', '100', '9'], correctIndex: 1, explain: '90% of 100 = 90 correct keystrokes.' },
        { prompt: 'Consistent practice with LOW bars (e.g., 10 WPM at 80% accuracy) is called...', options: ['cheating', 'mastery learning', 'pressure typing', 'speed racing'], correctIndex: 1, explain: 'Mastery learning: meeting thresholds at your pace builds durable skill.' },
        { prompt: 'Which is NOT a healthy typing habit?', options: ['look at the screen', 'rest your wrists neutrally', 'press as hard as you can', 'take breaks'], correctIndex: 2, explain: 'Light keystrokes protect your joints; hard pressing adds injury risk.' },
        { prompt: '\u201cPersonal best\u201d tracking compares you to...', options: ['every other student', 'only yourself', 'the class average', 'a national standard'], correctIndex: 1, explain: 'Personal best = you vs. your past self. No peer ranking.' },
        { prompt: 'In typing, a \u201cbaseline\u201d is...', options: ['the bottom of the keyboard', 'your first measured score', 'a warning light', 'the target WPM'], correctIndex: 1, explain: 'Baseline = starting measurement, so growth over time is visible.' }
      ]
    },
    {
      id: 'orbital_oath',
      name: 'Orbital Oath',
      element: 'gravity',
      icon: '\uD83D\uDEF0\uFE0F',
      color: '#22d3ee',
      sourceTool: 'spaceExplorer',
      sourceLabel: 'Space Explorer',
      unlock: function(d) { return ((d.spaceExplorer || {}).completedMissions || 0) >= 5; },
      unlockHint: 'Complete 5 missions in Space Explorer',
      baseDamage: 32,
      critMultiplier: 2.1,
      flavor: 'A pact with momentum itself; the foe is yanked into your gravity well.',
      challengeBank: [
        { prompt: 'Geosynchronous satellites stay above the same spot on Earth because their orbital period equals...', options: ['1 hour', 'one Earth day', 'one Earth year', 'one lunar cycle'], correctIndex: 1, explain: '~24 hours, so the satellite circles at the same rate Earth spins.' },
        { prompt: 'Lower orbits move...', options: ['slower', 'faster', 'the same speed as higher orbits', 'in reverse'], correctIndex: 1, explain: 'Closer in = stronger gravity = faster orbital speed.' },
        { prompt: 'Which is NOT a real type of orbit?', options: ['polar', 'geostationary', 'ellipsoidal-static', 'sun-synchronous'], correctIndex: 2, explain: 'The other three are real; ellipsoidal-static is invented.' },
        { prompt: 'When a spacecraft fires its engines opposite its motion, it...', options: ['speeds up', 'slows down', 'changes color', 'pauses orbit'], correctIndex: 1, explain: 'Retrograde burn — used to lower an orbit or de-orbit.' },
        { prompt: 'The Moon is moving away from Earth at about...', options: ['38 cm per year', '38 km per year', '38 m per second', '38 km per second'], correctIndex: 0, explain: 'Tidal interaction transfers angular momentum, slowly receding the Moon.' },
        { prompt: 'A "transfer orbit" between two planets is called a...', options: ['Hohmann transfer', 'Hyperbolic glide', 'Lagrange spin', 'Roche jump'], correctIndex: 0, explain: 'Hohmann transfer — the most fuel-efficient two-burn path.' },
        { prompt: 'The International Space Station orbits at roughly what altitude?', options: ['40 km', '400 km', '4,000 km', '40,000 km'], correctIndex: 1, explain: 'About 400 km — low Earth orbit.' }
      ]
    },
    {
      id: 'probability_pulse',
      name: 'Probability Pulse',
      element: 'logic',
      icon: '\uD83C\uDFB2',
      color: '#10b981',
      sourceTool: 'mathLab',
      sourceLabel: 'Math Lab',
      unlock: function(d) { return ((d.mathLab || {}).problemsSolved || 0) >= 8; },
      unlockHint: 'Solve 8 Math Lab problems',
      baseDamage: 24,
      critMultiplier: 2.3,
      flavor: 'A wave of dice-energy. The result is statistically painful.',
      challengeBank: [
        { prompt: 'Rolling a fair 6-sided die, what is the probability of getting a 4?', options: ['1/2', '1/4', '1/6', '1/3'], correctIndex: 2, explain: 'One favorable outcome out of six equally likely outcomes = 1/6.' },
        { prompt: 'A coin is flipped twice. P(both heads) = ?', options: ['1/2', '1/3', '1/4', '1/8'], correctIndex: 2, explain: '(1/2) × (1/2) = 1/4 — independent events multiply.' },
        { prompt: 'In a deck of 52 cards, P(drawing any heart) = ?', options: ['1/13', '1/4', '1/2', '1/52'], correctIndex: 1, explain: '13 hearts out of 52 cards = 13/52 = 1/4.' },
        { prompt: 'If P(rain) = 0.3, then P(no rain) = ?', options: ['0.3', '0.5', '0.7', '1.3'], correctIndex: 2, explain: 'Complement: 1 − 0.3 = 0.7. Probabilities of complementary events sum to 1.' },
        { prompt: 'Mean of {2, 4, 4, 6, 9} = ?', options: ['4', '4.5', '5', '5.5'], correctIndex: 2, explain: '(2+4+4+6+9)/5 = 25/5 = 5.' },
        { prompt: 'Median of {3, 7, 1, 9, 4} = ?', options: ['3', '4', '5', '7'], correctIndex: 1, explain: 'Sorted: 1, 3, 4, 7, 9. Middle value = 4.' },
        { prompt: 'Mode of {2, 3, 3, 5, 7} = ?', options: ['2', '3', '5', '7'], correctIndex: 1, explain: 'Mode = most frequently occurring. 3 appears twice.' }
      ]
    },
    {
      id: 'statistic_strike',
      name: 'Statistic Strike',
      element: 'logic',
      icon: '\uD83D\uDCCA',
      color: '#0891b2',
      sourceTool: 'mathLab',
      sourceLabel: 'Math Lab',
      unlock: function(d) { return ((d.mathLab || {}).problemsSolved || 0) >= 15; },
      unlockHint: 'Solve 15 Math Lab problems',
      baseDamage: 28,
      critMultiplier: 2,
      flavor: 'A bar chart materializes mid-air and slams the foe with the average.',
      challengeBank: [
        { prompt: 'Range of {12, 4, 18, 7, 22, 9} = ?', options: ['10', '15', '18', '22'], correctIndex: 2, explain: 'Range = max − min = 22 − 4 = 18.' },
        { prompt: 'A box plot shows...', options: ['only the mean', 'the five-number summary', 'a frequency table', 'percentages only'], correctIndex: 1, explain: 'Min, Q1, median, Q3, max — quartiles + extremes.' },
        { prompt: 'In a normal distribution, ~68% of data falls within how many standard deviations of the mean?', options: ['1', '2', '3', '4'], correctIndex: 0, explain: 'Empirical rule: 68% within 1σ, 95% within 2σ, 99.7% within 3σ.' },
        { prompt: 'Which measure of center is MOST affected by outliers?', options: ['median', 'mean', 'mode', 'range'], correctIndex: 1, explain: 'Mean shifts toward extreme values; median resists.' },
        { prompt: 'A correlation of −0.9 means the variables are...', options: ['unrelated', 'weakly related', 'strongly negatively related', 'identical'], correctIndex: 2, explain: 'Close to −1 = strong inverse relationship.' },
        { prompt: 'Which is a sample, not a population?', options: ['every student in the U.S.', 'every Maine 8th grader', '50 randomly chosen Maine 8th graders', 'every 8th grader who has ever lived'], correctIndex: 2, explain: 'A sample is a subset chosen from the population.' }
      ]
    },
    {
      id: 'defensive_ward',
      name: 'Defensive Ward',
      element: 'shield',
      icon: '\uD83D\uDEE1\uFE0F',
      color: '#0ea5e9',
      sourceTool: 'roadReady',
      sourceLabel: 'RoadReady',
      unlock: function(d) { return ((d.roadReady || {}).permitTestPassed) === true; },
      unlockHint: 'Pass the RoadReady permit test',
      baseDamage: 20,
      critMultiplier: 2.4,
      flavor: 'Mirror, signal, blessing. The foe gets a polite warning before harm.',
      challengeBank: [
        { prompt: 'The minimum following distance recommended in good conditions is...', options: ['1 second', '2 seconds', '3 seconds', '10 seconds'], correctIndex: 2, explain: 'The 3-second rule — pick a fixed point, count after the car ahead passes it.' },
        { prompt: 'You should check your blind spot by...', options: ['looking only at mirrors', 'turning your head briefly', 'closing your eyes', 'asking a passenger'], correctIndex: 1, explain: 'Mirrors miss the area beside your rear corners — head-check before lane changes.' },
        { prompt: 'What does a flashing yellow light mean?', options: ['stop completely', 'proceed with caution', 'speed up', 'turn left only'], correctIndex: 1, explain: 'Caution — slow down and watch for hazards.' },
        { prompt: 'When merging onto a highway, you should...', options: ['stop at the end of the ramp', 'match the speed of traffic', 'drive 10 mph slower than traffic', 'flash your brights'], correctIndex: 1, explain: 'Match traffic speed — merging slow forces others to brake.' },
        { prompt: 'Hydroplaning is most likely when...', options: ['roads are dry', 'roads first get wet', 'snow has packed the surface', 'temperatures are below 0°F'], correctIndex: 1, explain: 'Oil + water + first rain = slickest moment. Slow down.' },
        { prompt: 'Which is the SAFER following distance in heavy rain?', options: ['1 second', '2 seconds', '3 seconds', '4–6 seconds'], correctIndex: 3, explain: 'Doubling/tripling the 3-second rule accounts for stopping distance on wet roads.' }
      ]
    },
    {
      id: 'decoding_dirge',
      name: 'Decoding Dirge',
      element: 'sound',
      icon: '\uD83C\uDFBC',
      color: '#f97316',
      sourceTool: 'wordSounds',
      sourceLabel: 'Word Sounds',
      unlock: function(d) { return ((d.wordSounds || {}).completedDrills || 0) >= 5; },
      unlockHint: 'Complete 5 Word Sounds drills',
      baseDamage: 24,
      critMultiplier: 2,
      flavor: 'Letters split into phonemes. The foe sounds out its own defeat.',
      challengeBank: [
        { prompt: 'The "sh" in "ship" is a...', options: ['blend', 'digraph', 'silent letter', 'diphthong'], correctIndex: 1, explain: 'Digraph — two letters making ONE sound (here /sh/).' },
        { prompt: 'How many phonemes (sounds) are in "fish"?', options: ['2', '3', '4', '5'], correctIndex: 1, explain: '/f/ /i/ /sh/ — three phonemes (sh is one sound).' },
        { prompt: 'Which is a CVC word?', options: ['cake', 'truck', 'sit', 'dream'], correctIndex: 2, explain: 'CVC = consonant-vowel-consonant. s-i-t fits.' },
        { prompt: 'The "magic e" in "cake" makes the vowel sound...', options: ['short', 'long', 'silent', 'doubled'], correctIndex: 1, explain: 'Silent e signals the preceding vowel says its name (long sound).' },
        { prompt: 'A blend like "st" in "stop" means...', options: ['both letters are silent', 'two letters with one combined sound', 'two letters where each sound is heard', 'a syllable break'], correctIndex: 2, explain: 'Blend = each consonant keeps its sound (/s/ + /t/).' },
        { prompt: 'Which word has a long /e/ sound?', options: ['bed', 'see', 'set', 'best'], correctIndex: 1, explain: '"see" — the ee makes a long /e/. The others are short.' }
      ]
    },
    {
      id: 'syllable_seal',
      name: 'Syllable Seal',
      element: 'sound',
      icon: '\uD83D\uDD21',
      color: '#fb923c',
      sourceTool: 'wordSounds',
      sourceLabel: 'Word Sounds',
      unlock: function(d) { return ((d.wordSounds || {}).completedDrills || 0) >= 12; },
      unlockHint: 'Complete 12 Word Sounds drills',
      baseDamage: 28,
      critMultiplier: 2.1,
      flavor: 'Words break apart at the syllable line and bind the foe in pieces.',
      challengeBank: [
        { prompt: 'How many syllables in "elephant"?', options: ['2', '3', '4', '5'], correctIndex: 1, explain: 'el-e-phant = 3 syllables.' },
        { prompt: 'A "closed syllable" ends in...', options: ['a vowel', 'a consonant', 'silent e', 'two consonants'], correctIndex: 1, explain: 'Closed syllable: vowel followed by a consonant (cat, bug, run). Vowel = short.' },
        { prompt: 'How many syllables in "happy"?', options: ['1', '2', '3', '4'], correctIndex: 1, explain: 'hap-py = 2 syllables. Each has a vowel sound.' },
        { prompt: 'Which is an "open syllable"?', options: ['cat', 'go', 'fish', 'jump'], correctIndex: 1, explain: 'Open: ends in a vowel, says its long name (go, hi, me).' },
        { prompt: 'Every syllable contains...', options: ['exactly two consonants', 'exactly one vowel sound', 'a silent letter', 'a digraph'], correctIndex: 1, explain: 'A syllable always has one vowel sound at its core.' },
        { prompt: 'Compound word "sunshine" has how many syllables?', options: ['1', '2', '3', '4'], correctIndex: 1, explain: 'sun-shine = 2 syllables.' }
      ]
    },
    {
      id: 'paragraph_pact',
      name: 'Paragraph Pact',
      element: 'word',
      icon: '\uD83D\uDCDD',
      color: '#84cc16',
      sourceTool: 'writeCraft',
      sourceLabel: 'WriteCraft',
      unlock: function(d) { return ((d.writeCraft || {}).draftsCompleted || 0) >= 2; },
      unlockHint: 'Complete 2 WriteCraft drafts',
      baseDamage: 26,
      critMultiplier: 2.1,
      flavor: 'Topic, support, transition, conclusion. The foe is structurally outranked.',
      challengeBank: [
        { prompt: 'A paragraph usually starts with a...', options: ['conclusion', 'topic sentence', 'quotation', 'list'], correctIndex: 1, explain: 'Topic sentence states the main idea; everything else supports it.' },
        { prompt: 'Which transition word shows CONTRAST?', options: ['therefore', 'however', 'similarly', 'finally'], correctIndex: 1, explain: 'However signals a shift; therefore = cause, similarly = comparison, finally = sequence.' },
        { prompt: 'Evidence in writing usually appears as...', options: ['only personal opinion', 'examples, quotes, or data', 'only emojis', 'questions'], correctIndex: 1, explain: 'Strong writing supports claims with concrete evidence.' },
        { prompt: 'A "claim" in argument writing is...', options: ['a fact you cannot question', 'your debatable position', 'someone else\'s opinion only', 'a list of dates'], correctIndex: 1, explain: 'Claim = your stance — must be debatable AND supportable.' },
        { prompt: 'Which sentence is a strong topic sentence?', options: ['I will tell you about dogs.', 'Dogs make excellent companions because of their loyalty and intelligence.', 'Dogs.', 'My dog is named Max.'], correctIndex: 1, explain: 'Specific, debatable, previews reasons.' },
        { prompt: 'A 5-paragraph essay typically has how many BODY paragraphs?', options: ['1', '2', '3', '5'], correctIndex: 2, explain: 'Intro + 3 body + conclusion = 5 paragraphs.' }
      ]
    },
    {
      id: 'dialogue_dart',
      name: 'Dialogue Dart',
      element: 'word',
      icon: '\uD83D\uDCAC',
      color: '#65a30d',
      sourceTool: 'writeCraft',
      sourceLabel: 'WriteCraft',
      unlock: function(d) { return ((d.writeCraft || {}).draftsCompleted || 0) >= 5; },
      unlockHint: 'Complete 5 WriteCraft drafts',
      baseDamage: 22,
      critMultiplier: 2.4,
      flavor: 'Quoted speech turns sharp. The foe is interrupted mid-sentence.',
      challengeBank: [
        { prompt: 'Which is correctly punctuated dialogue?', options: ['"Hello," she said.', '"Hello" she said.', '"Hello" she said,', '"Hello", she said'], correctIndex: 0, explain: 'Comma INSIDE the quotes when a speaker tag follows.' },
        { prompt: 'In dialogue, every new speaker gets a...', options: ['new chapter', 'new paragraph', 'new font', 'new page'], correctIndex: 1, explain: 'Standard: each speaker change = new paragraph for clarity.' },
        { prompt: 'Which is a "show, don\'t tell" version of "She was angry"?', options: ['She felt very mad.', 'She was extremely angry.', 'She slammed the door, jaw tight.', 'She was angry, very angry.'], correctIndex: 2, explain: 'Show through action and detail; let the reader infer the emotion.' },
        { prompt: 'A dialogue tag is the...', options: ['punctuation', 'phrase identifying who spoke', 'description of setting', 'quoted thought'], correctIndex: 1, explain: 'Tag = "she said," "he asked," etc. — pairs the line with a speaker.' },
        { prompt: 'Which weakens dialogue?', options: ['speaking in the character\'s voice', 'using "said" most of the time', 'long info-dumps mid-conversation', 'short, varied lines'], correctIndex: 2, explain: 'Info-dumps make characters sound like narrators. Keep talk natural.' },
        { prompt: 'Which is more vivid?', options: ['"Yes," he said happily.', '"Yes!" he grinned, already grabbing his coat.', '"Yes" he agreed positively.', '"Yes," he was happy.'], correctIndex: 1, explain: 'Action beat + body language > explaining the emotion in the tag.' }
      ]
    },
    {
      id: 'annotation_aegis',
      name: 'Annotation Aegis',
      element: 'mind',
      icon: '\uD83D\uDD0D',
      color: '#3b82f6',
      sourceTool: 'immersiveReader',
      sourceLabel: 'Immersive Reader',
      unlock: function(d) { return ((d.immersiveReader || {}).sessionsCompleted || 0) >= 3; },
      unlockHint: 'Complete 3 Immersive Reader sessions',
      baseDamage: 24,
      critMultiplier: 2.2,
      flavor: 'Highlighter-purple glyphs flicker over the foe, exposing every weak point.',
      challengeBank: [
        { prompt: 'Annotating a text means...', options: ['memorizing every word', 'making notes, marks, and questions on the text', 'reading silently with no marks', 'only highlighting nouns'], correctIndex: 1, explain: 'Active marking — questions, summaries, vocabulary, connections.' },
        { prompt: 'Which is the BEST annotation for an unfamiliar word?', options: ['Cross it out', 'Write a synonym in the margin', 'Skip it', 'Underline twice'], correctIndex: 1, explain: 'Margin synonym keeps you in the text and builds vocabulary.' },
        { prompt: 'Marking the main idea of a paragraph helps you...', options: ['waste time', 'skim later for key points', 'rewrite the text', 'make the page shorter'], correctIndex: 1, explain: 'Annotated main ideas are recall-anchors during review.' },
        { prompt: 'A "?" in the margin usually means...', options: ['interesting fact', 'I disagree', 'I don\'t understand this', 'this is the title'], correctIndex: 2, explain: 'Question mark flags confusion to revisit later.' },
        { prompt: 'Which is NOT a useful annotation?', options: ['summary in your own words', 'connection to other texts', 'a smiley face every paragraph', 'argument response in margin'], correctIndex: 2, explain: 'Smiley spam adds no comprehension benefit.' },
        { prompt: 'When using digital annotation tools, what should you do BEFORE moving to a new text?', options: ['nothing', 'export or save your notes', 'delete all annotations', 'rename the file'], correctIndex: 1, explain: 'Saving preserves the cognitive trail for review.' }
      ]
    },
    {
      id: 'summary_sigil',
      name: 'Summary Sigil',
      element: 'mind',
      icon: '\uD83D\uDCCB',
      color: '#1d4ed8',
      sourceTool: 'immersiveReader',
      sourceLabel: 'Immersive Reader',
      unlock: function(d) { return ((d.immersiveReader || {}).sessionsCompleted || 0) >= 6; },
      unlockHint: 'Complete 6 Immersive Reader sessions',
      baseDamage: 28,
      critMultiplier: 2,
      flavor: 'A perfect single-sentence distillation strikes the foe at its thesis.',
      challengeBank: [
        { prompt: 'A good summary is mainly...', options: ['longer than the original', 'in the original\'s own words', 'in your own words, capturing the gist', 'a list of every detail'], correctIndex: 2, explain: 'Paraphrased + condensed; tests true understanding.' },
        { prompt: 'Which detail belongs in a summary?', options: ['the main argument', 'an obscure example', 'the author\'s middle name', 'the pagination'], correctIndex: 0, explain: 'Summaries focus on main ideas, not trivia.' },
        { prompt: 'When summarizing, you should...', options: ['copy whole sentences', 'paraphrase using synonyms + restructured sentences', 'skip the conclusion', 'invent extra details'], correctIndex: 1, explain: 'Paraphrasing builds comprehension; copying = plagiarism.' },
        { prompt: 'Which is a "main idea" sentence?', options: ['It rained yesterday.', 'Climate change threatens coastal cities through rising seas.', 'Some say.', 'Page 12 is interesting.'], correctIndex: 1, explain: 'States the central claim with specifics.' },
        { prompt: 'A summary should be __ than the original.', options: ['longer', 'shorter', 'the exact same length', 'twice as long'], correctIndex: 1, explain: 'Compression is the point — typically 10-25% of length.' },
        { prompt: 'When you finish a chapter, summarizing in your own words is an example of...', options: ['skimming', 'retrieval practice', 'outlining', 'transcribing'], correctIndex: 1, explain: 'You pull the ideas back from memory — strongest learning evidence.' }
      ]
    },
    {
      id: 'accuracy_aura',
      name: 'Accuracy Aura',
      element: 'precision',
      icon: '\uD83C\uDFAF',
      color: '#ec4899',
      sourceTool: 'typingPractice',
      sourceLabel: 'Typing Practice',
      unlock: function(d) { return ((d.typingPractice || {}).sessionsCompleted || 0) >= 4; },
      unlockHint: 'Complete 4 Typing sessions',
      baseDamage: 22,
      critMultiplier: 2.3,
      flavor: 'No backspaces. Every character a clean, lethal keystroke.',
      challengeBank: [
        { prompt: 'Typing accuracy is calculated as...', options: ['words ÷ minutes', 'correct chars ÷ total chars × 100', 'mistakes only', 'time × WPM'], correctIndex: 1, explain: 'Accuracy = % of characters typed correctly.' },
        { prompt: 'WPM stands for...', options: ['Words Per Minute', 'Writing Per Minute', 'Word Pattern Math', 'Wonder Per Minute'], correctIndex: 0, explain: 'Standard speed metric in typing tests.' },
        { prompt: 'Which finger types the letter "F"?', options: ['left index', 'left middle', 'right index', 'right pinky'], correctIndex: 0, explain: 'Left index — F has the home-row bump for orientation.' },
        { prompt: 'What\'s the average typing speed for adults?', options: ['10 WPM', '40 WPM', '120 WPM', '500 WPM'], correctIndex: 1, explain: '~40 WPM is average; 60+ is fast; 100+ is professional.' },
        { prompt: 'The home row keys for the LEFT hand are...', options: ['Q W E R', 'A S D F', 'Z X C V', '1 2 3 4'], correctIndex: 1, explain: 'A S D F — fingers rest here in default position.' },
        { prompt: 'To type accurately, you should focus on...', options: ['speed only', 'correctness first, then speed', 'using only one finger', 'keyboard appearance'], correctIndex: 1, explain: 'Accuracy first builds muscle memory; speed grows naturally.' }
      ]
    },
    {
      id: 'qwerty_quake',
      name: 'QWERTY Quake',
      element: 'precision',
      icon: '\u2328\uFE0F',
      color: '#db2777',
      sourceTool: 'typingPractice',
      sourceLabel: 'Typing Practice',
      unlock: function(d) { return ((d.typingPractice || {}).bestWPM || 0) >= 30; },
      unlockHint: 'Reach 30 WPM in Typing Practice',
      baseDamage: 30,
      critMultiplier: 2.1,
      flavor: 'A keyboard rumbles open beneath the foe — the letters spell their fate.',
      challengeBank: [
        { prompt: 'The QWERTY layout was originally designed to...', options: ['speed up typing', 'prevent typewriter jams', 'help kids learn', 'fit small keyboards'], correctIndex: 1, explain: 'Christopher Sholes laid it out so common letter pairs were apart, reducing jams.' },
        { prompt: 'An alternative keyboard layout designed for efficiency is called...', options: ['Dvorak', 'Cyrillic', 'Klingon', 'Morse'], correctIndex: 0, explain: 'Dvorak places vowels on the home row; some claim faster typing.' },
        { prompt: 'On QWERTY, which key is to the LEFT of "S"?', options: ['A', 'D', 'W', 'Q'], correctIndex: 0, explain: 'A — left of S on the home row.' },
        { prompt: 'The space bar is typically pressed by your...', options: ['pinky', 'ring finger', 'thumb', 'index'], correctIndex: 2, explain: 'Either thumb. The longest, strongest digit handles the most-used key.' },
        { prompt: 'Touch typing means typing without...', options: ['using a mouse', 'looking at the keys', 'making sound', 'a chair'], correctIndex: 1, explain: 'Eyes on the screen, fingers on home row, by feel.' },
        { prompt: 'A typing GOAL for an 8th grader is roughly...', options: ['10 WPM', '25-35 WPM', '60-80 WPM', '120+ WPM'], correctIndex: 1, explain: '25-35 WPM is a reasonable middle-school target; varies by student.' }
      ]
    }
  ,
    {
      id: 'ready_words',
      name: 'Ready Words',
      element: 'word',
      icon: '\uD83D\uDCDD',
      color: '#34d399',
      sourceTool: 'typingPractice',
      sourceLabel: 'Typing Practice',
      unlock: function(d) {
        var pb = ((d.typingPractice || {}).personalBest || {})['common-words'];
        return pb && pb.wpm >= 15;
      },
      unlockHint: 'Reach 15 WPM on Common Words in Typing Practice',
      baseDamage: 28,
      critMultiplier: 2.1,
      flavor: 'Ready words strike like arrows \u2014 precise, certain, and fast.',
      challengeBank: [
        { prompt: 'The word \u201cthe\u201d is the MOST common word in English. True or false?', options: ['true', 'false'], correctIndex: 0, explain: '\u201cThe\u201d ranks #1 by frequency in English corpora.' },
        { prompt: 'High-frequency words that students should read without sounding out are called...', options: ['sight words', 'rhyme words', 'silent words', 'long words'], correctIndex: 0, explain: 'Sight words are recognized instantly \u2014 speeds up reading + writing.' },
        { prompt: 'Which is an example of a compound word?', options: ['kindness', 'playground', 'running', 'quickly'], correctIndex: 1, explain: 'Compound = two whole words combined: play + ground.' },
        { prompt: 'Reading fluency is measured by speed AND...', options: ['volume', 'accuracy + expression', 'handwriting', 'spelling only'], correctIndex: 1, explain: 'Fluent reading = accurate + paced + expressive (prosody).' },
        { prompt: 'If a student types \u201cteh\u201d instead of \u201cthe,\u201d that\u2019s a...', options: ['transposition error', 'missed letter', 'capital letter problem', 'space error'], correctIndex: 0, explain: 'Transposition = two letters swapped. Common in fast typing.' },
        { prompt: 'Which punctuation usually ends a sentence?', options: ['comma', 'period', 'apostrophe', 'colon'], correctIndex: 1, explain: 'Periods end declarative statements. Questions end with ? and strong emotion with !.' },
        { prompt: 'The word \u201cIEP\u201d in schools stands for...', options: ['Incredible Education Plan', 'Individualized Education Program', 'International Exam Panel', 'Instructional Education Project'], correctIndex: 1, explain: 'IEP = federal plan for students receiving special education services.' }
      ]
    },
    {
      id: 'tidewell_torrent',
      name: 'Tidewell Torrent',
      element: 'water',
      icon: '\uD83C\uDF0A',
      color: '#06b6d4',
      sourceTool: 'aquarium',
      sourceLabel: 'Aquarium',
      unlock: function(d) { return ((d.aquarium || {}).speciesObserved || 0) >= 3; },
      unlockHint: 'Observe 3 species in Aquarium',
      baseDamage: 26,
      critMultiplier: 2.1,
      flavor: 'A briny surge erupts at the foe — every fish you ever fed shows up.',
      challengeBank: [
        { prompt: 'Saltwater fish typically...', options: ['drink lots of water', 'rarely drink water', 'absorb salt through skin', 'do not need water'], correctIndex: 0, explain: 'Saltwater fish drink lots and excrete salt to stay osmotically balanced.' },
        { prompt: 'A coral reef is built mostly by tiny animals called...', options: ['barnacles', 'polyps', 'plankton', 'urchins'], correctIndex: 1, explain: 'Coral polyps secrete calcium carbonate exoskeletons that form the reef.' },
        { prompt: 'Which of these is a freshwater fish?', options: ['clownfish', 'tuna', 'goldfish', 'shark'], correctIndex: 2, explain: 'Goldfish are freshwater. The other three live in saltwater.' },
        { prompt: 'Aquarium nitrogen cycle: ammonia is converted by bacteria into...', options: ['oxygen', 'salt', 'nitrite then nitrate', 'water'], correctIndex: 2, explain: 'Beneficial bacteria oxidize ammonia → nitrite → nitrate, which plants use.' },
        { prompt: 'Which is a sign of a HEALTHY tank?', options: ['cloudy water', 'algae taking over', 'fish swimming actively + clear water', 'no plants'], correctIndex: 2, explain: 'Active fish + clear water + balanced biology = healthy.' },
        { prompt: 'Why do fish have gills?', options: ['for camouflage', 'to extract oxygen from water', 'to swim faster', 'to breathe air'], correctIndex: 1, explain: 'Gills pull dissolved oxygen out of water using a thin membrane.' }
      ]
    },
    {
      id: 'ecosphere_embrace',
      name: 'Ecosphere Embrace',
      element: 'life',
      icon: '\uD83C\uDF33',
      color: '#22c55e',
      sourceTool: 'ecosystem',
      sourceLabel: 'Ecosystem',
      unlock: function(d) { return ((d.ecosystem || {}).balanceTurns || 0) >= 5; },
      unlockHint: 'Reach 5 balanced turns in Ecosystem',
      baseDamage: 28,
      critMultiplier: 2,
      flavor: 'A miniature biome wraps the foe; predators and prey choose sides.',
      challengeBank: [
        { prompt: 'In a food chain, primary consumers eat...', options: ['other consumers', 'plants/producers', 'decomposers', 'sunlight directly'], correctIndex: 1, explain: 'Primary consumers (herbivores) eat the producers (plants).' },
        { prompt: 'Decomposers like fungi and bacteria...', options: ['kill all plants', 'recycle dead matter into soil nutrients', 'are unnecessary', 'photosynthesize'], correctIndex: 1, explain: 'Decomposers return nutrients to the soil so producers can use them again.' },
        { prompt: 'A species that has NO natural predators in a new environment is called...', options: ['endangered', 'invasive', 'native', 'extinct'], correctIndex: 1, explain: 'Invasive species often outcompete natives because nothing keeps them in check.' },
        { prompt: 'Photosynthesis converts CO₂ + water into...', options: ['nitrogen + oxygen', 'glucose + oxygen', 'protein + water', 'salt + sugar'], correctIndex: 1, explain: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ (glucose) + 6O₂.' },
        { prompt: 'Removing a top predator from an ecosystem usually...', options: ['has no effect', 'reduces all populations', 'causes prey populations to boom then crash', 'turns the area to desert'], correctIndex: 2, explain: 'Trophic cascade — prey overgraze, eventually crashing food supply.' },
        { prompt: 'Which is an example of MUTUALISM?', options: ['lion and zebra', 'flea on dog', 'bee pollinating flower', 'mold on bread'], correctIndex: 2, explain: 'Both bee and flower benefit — bee gets nectar, flower gets pollinated.' }
      ]
    },
    {
      id: 'behavior_beacon',
      name: 'Behavior Beacon',
      element: 'mind',
      icon: '\uD83E\uDDE0',
      color: '#8b5cf6',
      sourceTool: 'behaviorLab',
      sourceLabel: 'Behavior Lab',
      unlock: function(d) { return ((d.behaviorLab || {}).experimentsRun || 0) >= 4; },
      unlockHint: 'Run 4 experiments in Behavior Lab',
      baseDamage: 24,
      critMultiplier: 2.2,
      flavor: 'Conditioned reflexes flicker; the foe trains itself into your trap.',
      challengeBank: [
        { prompt: 'Pavlov\'s dogs salivated at a bell because the bell became associated with...', options: ['fear', 'food', 'pain', 'a person'], correctIndex: 1, explain: 'Classical conditioning: neutral stimulus (bell) paired with food.' },
        { prompt: 'Positive reinforcement means...', options: ['adding something pleasant after a behavior', 'taking away something pleasant', 'punishing wrong behavior', 'ignoring all behavior'], correctIndex: 0, explain: 'Add a reward to increase the likelihood the behavior happens again.' },
        { prompt: 'Negative reinforcement is...', options: ['punishment', 'removing an unpleasant thing to increase a behavior', 'no reward', 'random reward'], correctIndex: 1, explain: 'NOT punishment — removing something aversive to encourage behavior (e.g., taking off seatbelt buzzer when you buckle up).' },
        { prompt: 'A "fixed ratio" reinforcement schedule rewards every...', options: ['random Nth response', 'response', 'fixed Nth response (e.g., every 5th)', 'minute that passes'], correctIndex: 2, explain: 'Fixed ratio = reward after a set number of responses (FR-5 = every 5th).' },
        { prompt: 'Operant conditioning was most associated with which scientist?', options: ['Freud', 'Pavlov', 'Skinner', 'Piaget'], correctIndex: 2, explain: 'B.F. Skinner formalized operant conditioning with the Skinner box.' },
        { prompt: 'Extinction in behavior science means...', options: ['the species died out', 'the behavior fades when reinforcement stops', 'the trainer left', 'memory was erased'], correctIndex: 1, explain: 'Stop reinforcing → behavior gradually decreases → eventually disappears.' }
      ]
    },
    {
      id: 'anatomy_arc',
      name: 'Anatomy Arc',
      element: 'body',
      icon: '\uD83E\uDEC0',
      color: '#dc2626',
      sourceTool: 'anatomy',
      sourceLabel: 'Anatomy',
      unlock: function(d) { return ((d.anatomy || {}).systemsExplored || 0) >= 3; },
      unlockHint: 'Explore 3 body systems in Anatomy',
      baseDamage: 26,
      critMultiplier: 2.1,
      flavor: 'A diagram of every organ flickers across the foe — every weak point glows.',
      challengeBank: [
        { prompt: 'The heart has how many chambers?', options: ['2', '3', '4', '6'], correctIndex: 2, explain: '2 atria + 2 ventricles = 4 chambers.' },
        { prompt: 'Red blood cells carry oxygen using which protein?', options: ['insulin', 'hemoglobin', 'collagen', 'keratin'], correctIndex: 1, explain: 'Hemoglobin binds O₂ in lungs and releases it in tissues.' },
        { prompt: 'Which organ filters blood and produces urine?', options: ['liver', 'pancreas', 'kidneys', 'spleen'], correctIndex: 2, explain: 'Kidneys filter waste; produce urine that exits via the ureters.' },
        { prompt: 'The largest organ of the human body is the...', options: ['brain', 'liver', 'lungs', 'skin'], correctIndex: 3, explain: 'Skin — surface area ~2 m² in adults.' },
        { prompt: 'Neurons send signals using...', options: ['mechanical bumps only', 'electrical impulses + chemical neurotransmitters', 'magnetic waves', 'sound'], correctIndex: 1, explain: 'Action potential travels electrically, then chemicals cross the synapse.' },
        { prompt: 'Which body system fights infections?', options: ['digestive', 'immune', 'endocrine', 'skeletal'], correctIndex: 1, explain: 'Immune system: white blood cells, lymph nodes, spleen, antibodies.' }
      ]
    },
    {
      id: 'chromatic_choir',
      name: 'Chromatic Choir',
      element: 'color',
      icon: '\uD83C\uDFA8',
      color: '#ec4899',
      sourceTool: 'artStudio',
      sourceLabel: 'Art Studio',
      unlock: function(d) { return ((d.artStudio || {}).creationsCompleted || 0) >= 3; },
      unlockHint: 'Complete 3 creations in Art Studio',
      baseDamage: 26,
      critMultiplier: 2.2,
      flavor: 'Seven hues blast outward in a singing arc.',
      challengeBank: [
        { prompt: 'The three PRIMARY colors of light are...', options: ['red, yellow, blue', 'red, green, blue', 'cyan, magenta, yellow', 'black, white, gray'], correctIndex: 1, explain: 'Light uses additive primaries: RGB. Paint uses subtractive primaries (CMY or RYB).' },
        { prompt: 'Mixing all primary colors of LIGHT produces...', options: ['black', 'white', 'brown', 'gray'], correctIndex: 1, explain: 'Additive mixing: R+G+B → white. (Paint subtractive mixing → near-black.)' },
        { prompt: 'Two colors directly opposite on the color wheel are called...', options: ['analogous', 'monochromatic', 'complementary', 'triadic'], correctIndex: 2, explain: 'Complementary pairs (red/green, blue/orange) create high contrast.' },
        { prompt: 'A color\'s value refers to its...', options: ['hue', 'lightness/darkness', 'saturation', 'temperature'], correctIndex: 1, explain: 'Value = how light or dark — independent of hue or saturation.' },
        { prompt: 'Saturation describes a color\'s...', options: ['brightness only', 'purity / vividness', 'temperature', 'size on canvas'], correctIndex: 1, explain: 'A highly saturated color is intense; a desaturated one is grayish.' },
        { prompt: 'Which is a WARM color?', options: ['blue', 'green', 'red-orange', 'violet'], correctIndex: 2, explain: 'Reds, oranges, yellows — associated with warmth/sun/fire.' },
        { prompt: 'In a painting, the area where the viewer\'s eye is drawn first is called the...', options: ['background', 'focal point', 'horizon', 'frame'], correctIndex: 1, explain: 'Focal point — created via contrast, isolation, or composition.' }
      ]
    },
    {
      id: 'harmonic_havoc',
      name: 'Harmonic Havoc',
      element: 'sound',
      icon: '\uD83C\uDFB5',
      color: '#a855f7',
      sourceTool: 'music',
      sourceLabel: 'Music Lab',
      unlock: function(d) { return ((d.music || {}).songsCompleted || 0) >= 2; },
      unlockHint: 'Complete 2 songs in Music Lab',
      baseDamage: 28,
      critMultiplier: 2,
      flavor: 'A perfect fifth resolves into something violent.',
      challengeBank: [
        { prompt: 'A standard major scale has how many notes?', options: ['5', '7', '8', '12'], correctIndex: 1, explain: '7 unique notes (do re mi fa sol la ti); 8 counting the octave.' },
        { prompt: 'The pitch difference between C and the next higher C is one...', options: ['note', 'tone', 'octave', 'fifth'], correctIndex: 2, explain: 'Octave = doubled frequency. C4 is 261.6 Hz; C5 is 523.2 Hz.' },
        { prompt: 'Tempo is measured in...', options: ['Hertz', 'beats per minute', 'decibels', 'notes per measure'], correctIndex: 1, explain: 'BPM — how many beats fit in 60 seconds.' },
        { prompt: 'A song in 4/4 time has how many beats per measure?', options: ['2', '3', '4', '6'], correctIndex: 2, explain: 'Top number of time signature = beats per measure.' },
        { prompt: 'Forte means...', options: ['soft', 'loud', 'fast', 'slow'], correctIndex: 1, explain: 'Italian dynamics: forte = loud, piano = soft, mezzo = medium.' },
        { prompt: 'A major chord is built from which intervals (in semitones)?', options: ['1-2', '3-4', '4-3', '5-7'], correctIndex: 2, explain: 'Major triad = root + 4 semitones (major 3rd) + 3 semitones (minor 3rd).' },
        { prompt: 'Sound waves travel through air as...', options: ['transverse waves', 'longitudinal compression waves', 'electromagnetic radiation', 'gravity ripples'], correctIndex: 1, explain: 'Sound is a longitudinal pressure wave — compressions and rarefactions.' }
      ]
    },
    {
      id: 'prism_proof',
      name: 'Prism Proof',
      element: 'light',
      icon: '\uD83D\uDD06',
      color: '#0ea5e9',
      sourceTool: 'physics',
      sourceLabel: 'Physics Lab',
      unlock: function(d) { return ((d.physics || {}).experimentsCompleted || 0) >= 3; },
      unlockHint: 'Complete 3 Physics Lab experiments',
      baseDamage: 30,
      critMultiplier: 2.1,
      flavor: 'A single beam splits into seven knives.',
      challengeBank: [
        { prompt: 'When light passes through a prism it splits into colors because different wavelengths...', options: ['have different speeds in vacuum', 'bend by different amounts in glass', 'have different mass', 'reflect more strongly'], correctIndex: 1, explain: 'Refractive index varies with wavelength → different bending angles → spectrum.' },
        { prompt: 'The fastest known speed in the universe is...', options: ['speed of sound', 'speed of light in vacuum', 'speed of an electron', 'orbital speed of Earth'], correctIndex: 1, explain: '~299,792,458 m/s — a fundamental constant.' },
        { prompt: 'Visible light is what part of the electromagnetic spectrum?', options: ['radio waves', 'a narrow band between UV and IR', 'X-rays', 'gamma rays'], correctIndex: 1, explain: 'Roughly 380-700 nm wavelength — tiny slice of the EM spectrum.' },
        { prompt: 'Newton\'s second law states F = ?', options: ['mv', 'ma', 'mgh', 'qE'], correctIndex: 1, explain: 'Force = mass × acceleration. Bigger mass or bigger accel = bigger force.' },
        { prompt: 'Energy is conserved means...', options: ['energy can be destroyed', 'energy is always created', 'energy changes form but total stays constant', 'energy decreases over time'], correctIndex: 2, explain: 'First law of thermodynamics — energy is converted, not lost or gained.' },
        { prompt: 'Which object falls FASTER on the Moon in a vacuum?', options: ['a feather', 'a hammer', 'both fall at the same rate', 'neither falls'], correctIndex: 2, explain: 'No air resistance → all objects accelerate equally under gravity. Apollo 15 demonstrated this.' }
      ]
    },
    {
      id: 'voltage_verse',
      name: 'Voltage Verse',
      element: 'lightning',
      icon: '\u26A1',
      color: '#facc15',
      sourceTool: 'circuit',
      sourceLabel: 'Circuit Lab',
      unlock: function(d) { return ((d.circuit || {}).circuitsBuilt || 0) >= 2; },
      unlockHint: 'Build 2 working circuits',
      baseDamage: 27,
      critMultiplier: 2.2,
      flavor: 'Words turn into wire turn into current turn into a strike.',
      challengeBank: [
        { prompt: 'Ohm\'s law states that V = ?', options: ['I + R', 'I × R', 'I / R', 'R / I'], correctIndex: 1, explain: 'Voltage = current × resistance. Foundational electrical relationship.' },
        { prompt: 'Voltage is measured in...', options: ['amps', 'volts', 'ohms', 'watts'], correctIndex: 1, explain: 'Volt (V) — named for Alessandro Volta.' },
        { prompt: 'In a SERIES circuit, components are connected...', options: ['one after another, single path', 'in branches with multiple paths', 'wirelessly', 'with capacitors only'], correctIndex: 0, explain: 'Series = single loop. If one component breaks, current stops.' },
        { prompt: 'A SHORT CIRCUIT happens when...', options: ['the battery dies', 'current bypasses the load with very low resistance', 'a switch is open', 'a fuse blows on purpose'], correctIndex: 1, explain: 'Low-resistance bypass → very high current → heat → fire risk.' },
        { prompt: 'A resistor\'s job is to...', options: ['store energy', 'limit current flow', 'amplify voltage', 'switch automatically'], correctIndex: 1, explain: 'Resistors convert electrical energy into heat, limiting current.' },
        { prompt: 'Power dissipated by a resistor (in watts) = ?', options: ['V × I', 'V + I', 'V / I', 'V − I'], correctIndex: 0, explain: 'P = V × I (also P = I²R or V²/R via Ohm\'s law).' }
      ]
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // ENEMIES — expanded sector-themed roster
  // Each enemy is tagged with sectors[] so buildRoomsPlan samples from the
  // correct themed pool. Crystal Nebula = cosmic, Whispering Archive =
  // literary/glyphic, Ember Clockwork = math/logic/mechanical.
  // ═══════════════════════════════════════════════════════════════
  var ENEMIES = [
    // ── Crystal Nebula (cosmic theme) ──
    { id: 'void_imp', name: 'Void Imp', icon: '\uD83D\uDC7E', hp: 40, atk: 8, flavor: 'A mischievous wisp of nothingness.', sectors: ['crystal_nebula'] },
    { id: 'star_wraith', name: 'Star Wraith', icon: '\uD83D\uDC7B', hp: 70, atk: 14, flavor: 'A remnant of a collapsed star.', sectors: ['crystal_nebula'] },
    { id: 'signal_shade', name: 'Signal Shade', icon: '\uD83D\uDC7A', hp: 60, atk: 12, flavor: 'A phantom of distorted transmission.', sectors: ['crystal_nebula'] },
    { id: 'comet_specter', name: 'Comet Specter', icon: '\u2604\uFE0F', hp: 50, atk: 13, flavor: 'A streaking ghost of frozen ammonia.', sectors: ['crystal_nebula'] },
    { id: 'nebula_drake', name: 'Nebula Drake', icon: '\uD83D\uDC09', hp: 95, atk: 12, flavor: 'A slow-bodied drift coiled in stardust.', sectors: ['crystal_nebula'] },
    { id: 'ion_wisp', name: 'Ion Wisp', icon: '\u26A1', hp: 30, atk: 15, flavor: 'Tiny, electric, painfully eager.', sectors: ['crystal_nebula'] },
    { id: 'gravity_whisper', name: 'Gravity Whisper', icon: '\uD83C\uDF0C', hp: 60, atk: 11, flavor: 'A pull where there should be empty space.', sectors: ['crystal_nebula'] },
    { id: 'void_jellyfish', name: 'Void Jellyfish', icon: '\uD83E\uDEBC', hp: 45, atk: 10, flavor: 'Translucent, slow, sting-laced ribbons.', sectors: ['crystal_nebula'] },
    // ── Whispering Archive (literary/glyphic theme) ──
    { id: 'rune_moth', name: 'Rune Moth', icon: '\uD83E\uDD8B', hp: 35, atk: 10, flavor: 'Fragile but quick — flutters through logic.', sectors: ['whispering_archive'] },
    { id: 'glyph_golem', name: 'Glyph Golem', icon: '\uD83D\uDDFF', hp: 85, atk: 13, flavor: 'Slow, heavy, inscribed with forgotten runes.', sectors: ['whispering_archive'] },
    { id: 'syntax_serpent', name: 'Syntax Serpent', icon: '\uD83D\uDC0D', hp: 55, atk: 13, flavor: 'Coils of clauses that bite back at fragments.', sectors: ['whispering_archive'] },
    { id: 'marginalia_phantom', name: 'Marginalia Phantom', icon: '\uD83D\uDCDC', hp: 50, atk: 11, flavor: 'A note that scribbled itself into a body.', sectors: ['whispering_archive'] },
    { id: 'ink_revenant', name: 'Ink Revenant', icon: '\uD83D\uDD8B\uFE0F', hp: 80, atk: 12, flavor: 'A walking puddle of unsaid words.', sectors: ['whispering_archive'] },
    { id: 'footnote_familiar', name: 'Footnote Familiar', icon: '\uD83D\uDD16', hp: 30, atk: 9, flavor: 'A small annotation with sharp opinions.', sectors: ['whispering_archive'] },
    { id: 'scribe_specter', name: 'Scribe Specter', icon: '\u270D\uFE0F', hp: 65, atk: 12, flavor: 'A copyist who never finished one final book.', sectors: ['whispering_archive'] },
    { id: 'dactyl_demon', name: 'Dactyl Demon', icon: '\uD83D\uDC7F', hp: 45, atk: 14, flavor: 'A meter-stomping rhythm that hits on stress.', sectors: ['whispering_archive'] },
    // ── Ember Clockwork (math/logic/mechanical theme) ──
    { id: 'data_gremlin', name: 'Data Gremlin', icon: '\uD83D\uDC79', hp: 55, atk: 11, flavor: 'Corrupts your grimoire if given the chance.', sectors: ['ember_clockwork'] },
    { id: 'spiral_spook', name: 'Spiral Spook', icon: '\uD83C\uDF00', hp: 65, atk: 12, flavor: 'A recursive echo that repeats itself.', sectors: ['ember_clockwork'] },
    { id: 'cog_wraith', name: 'Cog Wraith', icon: '\u2699\uFE0F', hp: 75, atk: 13, flavor: 'A clockwork ghost spinning out of true.', sectors: ['ember_clockwork'] },
    { id: 'fraction_shade', name: 'Fraction Shade', icon: '\u00BD', hp: 50, atk: 11, flavor: 'A half of something that wants to be whole.', sectors: ['ember_clockwork'] },
    { id: 'equation_eel', name: 'Equation Eel', icon: '\u2248', hp: 60, atk: 14, flavor: 'Long, slick, balanced — then suddenly not.', sectors: ['ember_clockwork'] },
    { id: 'theorem_thug', name: 'Theorem Thug', icon: '\uD83D\uDCD0', hp: 90, atk: 13, flavor: 'A tank of axioms with QED on its knuckles.', sectors: ['ember_clockwork'] },
    { id: 'axiom_eater', name: 'Axiom Eater', icon: '\uD83D\uDC7B', hp: 70, atk: 12, flavor: 'Devours postulates and burps them out reversed.', sectors: ['ember_clockwork'] },
    { id: 'modulus_mite', name: 'Modulus Mite', icon: '\uD83D\uDD27', hp: 35, atk: 13, flavor: 'Tiny remainder of a divided foe.', sectors: ['ember_clockwork'] },
    // ── Bosses ──
    // Crystal Nebula bosses
    { id: 'lichcopy', name: 'The Lichcopy', icon: '\uD83D\uDC80', hp: 120, atk: 18, flavor: 'A mirror-self of AlloBot gone cold.', sectors: ['crystal_nebula'], boss: true, specialName: 'Cold Reflection', specialFlavor: 'Mirrors your last spell as cryo-frost.' },
    { id: 'void_leviathan', name: 'Void Leviathan', icon: '\uD83D\uDC32', hp: 140, atk: 17, flavor: 'A drifting titan of cosmic silence.', sectors: ['crystal_nebula'], boss: true, specialName: 'Cosmic Engulf', specialFlavor: 'Swallows you in a starless tide.' },
    { id: 'starless_oracle', name: 'The Starless Oracle', icon: '\uD83D\uDD2E', hp: 130, atk: 19, flavor: 'It saw your spell before you cast it.', sectors: ['crystal_nebula'], boss: true, specialName: 'Foretelling Strike', specialFlavor: 'Already saw the wound it gives you.' },
    // Whispering Archive bosses
    { id: 'paradox_clone', name: 'The Paradox Clone', icon: '\uD83D\uDD78\uFE0F', hp: 130, atk: 19, flavor: 'An impossible contradiction of AlloBot’s runes.', sectors: ['whispering_archive'], boss: true, specialName: 'Self-Reference Spiral', specialFlavor: 'A loop of "this attack" damaging "this attack".' },
    { id: 'tome_tyrant', name: 'The Tome Tyrant', icon: '\uD83D\uDCD8', hp: 145, atk: 16, flavor: 'A book heavy enough to read its readers.', sectors: ['whispering_archive'], boss: true, specialName: 'Spine Slam', specialFlavor: 'A 4,000-page hardcover, slammed shut.' },
    { id: 'gnomon_grandmaster', name: 'The Gnomon Grandmaster', icon: '\u23F3', hp: 125, atk: 18, flavor: 'Casts shadows of arguments you cannot answer.', sectors: ['whispering_archive'], boss: true, specialName: 'Cast Shadow', specialFlavor: 'A sundial spike of dusk falls across you.' },
    // Ember Clockwork bosses
    { id: 'equilibrium_engine', name: 'Equilibrium Engine', icon: '\u2696\uFE0F', hp: 150, atk: 17, flavor: 'A perfect balance, hostile to imbalance.', sectors: ['ember_clockwork'], boss: true, specialName: 'Counterweight Drop', specialFlavor: 'The scale of the encounter tips, sharply.' },
    { id: 'prime_progenitor', name: 'The Prime Progenitor', icon: '\u2734\uFE0F', hp: 135, atk: 19, flavor: 'Indivisible. Annoyed by composites.', sectors: ['ember_clockwork'], boss: true, specialName: 'Indivisible Smite', specialFlavor: 'A blow that cannot be reduced.' },
    { id: 'entropy_emperor', name: 'The Entropy Emperor', icon: '\uD83D\uDD25', hp: 160, atk: 18, flavor: 'Disorder, crowned and ascending.', sectors: ['ember_clockwork'], boss: true, specialName: 'Heat-Death Whisper', specialFlavor: 'All order yields, briefly, to chaos.' },,
    // ── Deep Tide (marine/biology theme) ──
    { id: 'reef_revenant', name: 'Reef Revenant', icon: '\uD83D\uDC1A', hp: 50, atk: 11, flavor: 'A bleached coral skeleton that still pulses.', sectors: ['deep_tide'] },
    { id: 'echo_anemone', name: 'Echo Anemone', icon: '\uD83C\uDF38', hp: 45, atk: 10, flavor: 'It repeats the last sound it heard.', sectors: ['deep_tide'] },
    { id: 'jelly_phantom', name: 'Jelly Phantom', icon: '\uD83E\uDEBC', hp: 40, atk: 13, flavor: 'Translucent, drifting, lethal.', sectors: ['deep_tide'] },
    { id: 'sargasso_strangler', name: 'Sargasso Strangler', icon: '\uD83C\uDF3F', hp: 75, atk: 12, flavor: 'Living seaweed with very specific grudges.', sectors: ['deep_tide'] },
    { id: 'volt_eel', name: 'Voltaic Eel', icon: '\uD83D\uDC0D', hp: 55, atk: 14, flavor: 'A current with teeth.', sectors: ['deep_tide'] },
    { id: 'shoal_specter', name: 'Shoal Specter', icon: '\uD83D\uDC1F', hp: 40, atk: 11, flavor: 'A school of ghosts moving as one.', sectors: ['deep_tide'] },
    { id: 'crustacean_courier', name: 'Crustacean Courier', icon: '\uD83E\uDD80', hp: 80, atk: 12, flavor: 'Carries old letters. Pinches.', sectors: ['deep_tide'] },
    { id: 'barnacle_baleful', name: 'Baleful Barnacle', icon: '\uD83D\uDC0C', hp: 90, atk: 11, flavor: 'Slow, armored, very tired of you.', sectors: ['deep_tide'] }    // Deep Tide bosses
,
    { id: 'tidal_thrall', name: 'The Tidal Thrall', icon: '\uD83C\uDF0A', hp: 140, atk: 17, flavor: 'A wave that learned a face.', sectors: ['deep_tide'], boss: true, specialName: 'Riptide Rebuke', specialFlavor: 'A fist of water shaped like a question.' },
    { id: 'abyssal_chant', name: 'The Abyssal Chant', icon: '\uD83D\uDC19', hp: 135, atk: 19, flavor: 'Sings in three pitches at once. None pleasant.', sectors: ['deep_tide'], boss: true, specialName: 'Pressure Hymn', specialFlavor: 'The deep itself bears down on your bones.' },
    { id: 'kraken_kalmar', name: 'Kraken Kalmar', icon: '\uD83E\uDD91', hp: 155, atk: 17, flavor: 'Old as a continental shelf. Lonely.', sectors: ['deep_tide'], boss: true, specialName: 'Tentacle Litany', specialFlavor: 'Eight grasping verses, one grim conclusion.' },
    // ── Aurora Atelier (art / music / color theme) ──
    { id: 'chromatic_specter', name: 'Chromatic Specter', icon: '\uD83C\uDFA8', hp: 55, atk: 12, flavor: 'A wraith with seven hues and no name.', sectors: ['aurora_atelier'] },
    { id: 'crescendo_clamor', name: 'Crescendo Clamor', icon: '\uD83C\uDFBA', hp: 65, atk: 14, flavor: 'A sustained note that learned malice.', sectors: ['aurora_atelier'] },
    { id: 'palette_phantom', name: 'Palette Phantom', icon: '\uD83D\uDD8C\uFE0F', hp: 50, atk: 11, flavor: 'Drips primary colors onto reality.', sectors: ['aurora_atelier'] },
    { id: 'harmonic_haunt', name: 'Harmonic Haunt', icon: '\uD83C\uDFB6', hp: 60, atk: 13, flavor: 'Three voices, one terrible intention.', sectors: ['aurora_atelier'] },
    { id: 'gilded_grotesque', name: 'Gilded Grotesque', icon: '\uD83D\uDC51', hp: 85, atk: 12, flavor: 'Gold leaf hides what gold leaf hides.', sectors: ['aurora_atelier'] },
    { id: 'vellum_vortex', name: 'Vellum Vortex', icon: '\uD83D\uDCDC', hp: 70, atk: 13, flavor: 'Old paper spinning faster than old paper should.', sectors: ['aurora_atelier'] },
    { id: 'pigment_pest', name: 'Pigment Pest', icon: '\uD83D\uDC1E', hp: 35, atk: 14, flavor: 'Small. Vivid. Furious.', sectors: ['aurora_atelier'] },
    { id: 'frieze_fiend', name: 'Frieze Fiend', icon: '\uD83D\uDDFF', hp: 95, atk: 11, flavor: 'A relief carving that learned how to leave the wall.', sectors: ['aurora_atelier'] },
    // ── Aurora Atelier bosses ──
    { id: 'canvas_caesar', name: 'Canvas Caesar', icon: '\uD83D\uDDBC\uFE0F', hp: 150, atk: 18, flavor: 'Painted himself an empire. Refuses to be unframed.', sectors: ['aurora_atelier'], boss: true, specialName: 'Brushstroke Decree', specialFlavor: 'A single, perfect stroke divides the room.' },
    { id: 'maestro_mortis', name: 'Maestro Mortis', icon: '\uD83C\uDFAD', hp: 145, atk: 19, flavor: 'Conducts an orchestra of one — yours.', sectors: ['aurora_atelier'], boss: true, specialName: 'Crescendo Cataclysm', specialFlavor: 'The final movement, played at the loudest dynamic available.' },
    { id: 'prism_paragon', name: 'The Prism Paragon', icon: '\uD83D\uDD06', hp: 160, atk: 17, flavor: 'Pure white light, sharpened on every angle.', sectors: ['aurora_atelier'], boss: true, specialName: 'Spectral Decomposition', specialFlavor: 'Light fractures around you. So do you.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTORS — themed expedition locations
  // Each sector has a background gradient, essence multiplier, boss pool,
  // and an unlock threshold (expeditions completed).
  // ═══════════════════════════════════════════════════════════════
  var SECTORS = [
    {
      id: 'crystal_nebula',
      name: 'Crystal Nebula',
      subtitle: 'Glittering dust and slow-moving shards',
      bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)',
      accent: '#a855f7',
      essenceMult: 1.0,
      bossPool: ['lichcopy', 'void_leviathan', 'starless_oracle'],
      unlockAt: 0,
      flavor: 'Where AlloBot first learned to spark a spell. Gentle, but full of lessons.'
    },
    {
      id: 'whispering_archive',
      name: 'Whispering Archive',
      subtitle: 'A library of forgotten runes, guarded by words',
      bgGradient: 'linear-gradient(135deg, #7c2d12 0%, #b45309 100%)',
      accent: '#f59e0b',
      essenceMult: 1.15,
      bossPool: ['paradox_clone', 'tome_tyrant', 'gnomon_grandmaster'],
      unlockAt: 1,
      flavor: 'Literary spells ring louder here. Pages turn on their own.'
    },
    {
      id: 'ember_clockwork',
      name: 'Ember Clockwork',
      subtitle: 'Gears of starlight and tides of molten logic',
      bgGradient: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)',
      accent: '#38bdf8',
      essenceMult: 1.3,
      bossPool: ['equilibrium_engine', 'prime_progenitor', 'entropy_emperor'],
      unlockAt: 3,
      flavor: 'The hardest trials \u2014 but the richest essence. Masters only.'
    },
    {
      id: 'deep_tide',
      name: 'Deep Tide',
      subtitle: 'Coral spires and a hush of pressure',
      bgGradient: 'linear-gradient(135deg, #064e3b 0%, #0e7490 100%)',
      accent: '#22d3ee',
      essenceMult: 1.2,
      bossPool: ['tidal_thrall', 'abyssal_chant', 'kraken_kalmar'],
      unlockAt: 2,
      flavor: 'A drowned cathedral of life. Every spell echoes back through the water.'
    },
    {
      id: 'aurora_atelier',
      name: 'Aurora Atelier',
      subtitle: 'A drifting studio of color and chord',
      bgGradient: 'linear-gradient(135deg, #831843 0%, #312e81 100%)',
      accent: '#f472b6',
      essenceMult: 1.4,
      bossPool: ['canvas_caesar', 'maestro_mortis', 'prism_paragon'],
      unlockAt: 4,
      flavor: 'Where palette knives sing and the chord of light itself sharpens. Mastery only.'
    }
  ];

  function sectorById(id) { for (var i = 0; i < SECTORS.length; i++) if (SECTORS[i].id === id) return SECTORS[i]; return SECTORS[0]; }

  // ═══════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════
  var ROOMS_PER_EXPEDITION = 3;
  var PER_ROOM_ESSENCE = [6, 9, 18];       // reward per cleared room (last room = boss)
  var SPELL_LEVEL_CAP = 5;
  var DAMAGE_PER_LEVEL = 3;

  // ═══════════════════════════════════════════════════════════════
  // Difficulty profiles — UDL "multiple means of engagement"
  // ═══════════════════════════════════════════════════════════════
  // Each profile shapes: how long the student has to crit, how many rooms
  // they face, their starting HP, and the essence multiplier on rewards.
  // Easy = build confidence (longer crit window, fewer rooms, more HP,
  // smaller reward). Standard = balanced. Hard = sharpen retrieval speed
  // under pressure (tight window, more rooms, less HP, bigger reward).
  // Students pick at loadout — explicit choice is the UDL move.
  var DIFFICULTY_PROFILES = {
    easy:     { id: 'easy',     name: 'Easy',     icon: '🌱', desc: 'Build confidence — longer crit window, fewer rooms.', critWindowSec: 8,  rooms: 2, playerHp: 80, essenceMult: 0.85, color: '#10b981' },
    standard: { id: 'standard', name: 'Standard', icon: '⚖️', desc: 'Balanced challenge — 6-second crit window, 3 rooms.',     critWindowSec: 6,  rooms: 3, playerHp: 60, essenceMult: 1.0,  color: '#3b82f6' },
    hard:     { id: 'hard',     name: 'Hard',     icon: '🔥', desc: 'Sharpen retrieval speed — short window, 4 rooms.',         critWindowSec: 4,  rooms: 4, playerHp: 50, essenceMult: 1.3,  color: '#dc2626' }
  };
  function difficultyById(id) { return DIFFICULTY_PROFILES[id] || DIFFICULTY_PROFILES.standard; }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Upgrade cost curve: lvl 1 = 10, lvl 2 = 15, lvl 3 = 20, lvl 4 = 25, lvl 5 = 30
  function upgradeCost(currentLevel) { return 10 + currentLevel * 5; }
  function getSpellDamage(spell, level) { return spell.baseDamage + (level || 0) * DAMAGE_PER_LEVEL; }

  // Build a room plan for a given sector. Room count varies by difficulty:
  //   2 rooms (easy) = 1 combat + 1 boss
  //   3 rooms (standard) = 1 combat + 1 shrine-or-combat + 1 boss
  //   4 rooms (hard) = 1 combat + 1 shrine-or-combat + 1 combat (harder) + 1 boss
  // Last room is ALWAYS the boss (pulled from sector.bossPool).
  function buildRoomsPlan(sectorId, roomCount) {
    roomCount = roomCount || ROOMS_PER_EXPEDITION;
    var sector = sectorById(sectorId);
    // Sector-themed normal pool: enemy must list this sector in sectors[].
    // Fallback to all non-boss enemies if (somehow) the pool is empty.
    var nonBoss = ENEMIES.filter(function(e) {
      return !e.boss && e.sectors && e.sectors.indexOf(sectorId) !== -1;
    });
    if (nonBoss.length === 0) nonBoss = ENEMIES.filter(function(e) { return !e.boss; });
    var bossCandidates = ENEMIES.filter(function(e) {
      return e.boss && sector.bossPool.indexOf(e.id) !== -1;
    });
    if (bossCandidates.length === 0) bossCandidates = ENEMIES.filter(function(e) { return e.boss; });

    function combatRoom(mult) {
      var e = pickRandom(nonBoss);
      return {
        type: 'combat',
        id: e.id, name: e.name, icon: e.icon, flavor: e.flavor,
        hp: Math.round(e.hp * mult), maxHp: Math.round(e.hp * mult),
        atk: e.atk, boss: false
      };
    }
    function bossRoom() {
      var e = pickRandom(bossCandidates);
      return {
        type: 'combat',
        id: e.id, name: e.name, icon: e.icon, flavor: e.flavor,
        hp: e.hp, maxHp: e.hp, atk: e.atk, boss: true
      };
    }
    function shrineRoom() {
      return {
        type: 'shrine',
        id: 'shrine',
        name: 'Quiet Shrine',
        icon: '\u26E9\uFE0F',
        flavor: 'A pocket of stillness. The Spellforge\u2019s warmth reaches here.',
        hp: 0, maxHp: 0, atk: 0, boss: false
      };
    }

    // Build the room sequence based on count
    var plan = [];
    if (roomCount <= 2) {
      // Easy: 1 combat + boss
      plan = [combatRoom(1.0), bossRoom()];
    } else if (roomCount >= 4) {
      // Hard: 1 combat + 1 shrine-or-combat + 1 tougher combat + boss
      var middle1 = Math.random() < 0.4 ? shrineRoom() : combatRoom(1.15);
      plan = [combatRoom(1.0), middle1, combatRoom(1.25), bossRoom()];
    } else {
      // Standard: original 3-room layout
      var middle = Math.random() < 0.4 ? shrineRoom() : combatRoom(1.15);
      plan = [combatRoom(1.0), middle, bossRoom()];
    }
    return plan;
  }

  // Compute which spells are currently unlocked.
  function computeUnlockedSpells(toolData) {
    return SPELLBOOK.filter(function(s) { try { return !!s.unlock(toolData || {}); } catch(e) { return false; } }).map(function(s) { return s.id; });
  }

  // Compute spells newly unlocked since last visit (set difference vs seenSpells).
  function computeNewlyUnlocked(toolData, seen) {
    var unlocked = computeUnlockedSpells(toolData);
    var seenSet = {};
    (seen || []).forEach(function(id) { seenSet[id] = true; });
    return unlocked.filter(function(id) { return !seenSet[id]; });
  }

  function findSpell(id) { for (var i = 0; i < SPELLBOOK.length; i++) if (SPELLBOOK[i].id === id) return SPELLBOOK[i]; return null; }

  // ═══════════════════════════════════════════════════════════════
  // AI-generated challenge bank (infinite questions via Gemini)
  // ═══════════════════════════════════════════════════════════════
  // Each spell ships with a static challengeBank as a baseline floor.
  // This helper kicks off a background Gemini call to generate more
  // questions in the same style + domain. Generated questions are
  // validated against the same shape the static bank uses, then merged
  // into d.aiChallengeCache[spellId] for use on future casts.
  //
  // Failure modes (network, malformed JSON, validation reject) all
  // return [] so the static bank still works as fallback. The cast
  // mechanic never blocks on AI — generation is fire-and-forget.
  function aiGenerateChallenges(spell, callGemini, toolData) {
    if (!callGemini || !spell) return Promise.resolve([]);
    var examples = (spell.challengeBank || []).slice(0, 2);
    var examplesJson = JSON.stringify(examples, null, 2);
    var srcLabel = spell.sourceLabel || spell.sourceTool || 'general';
    var srcData = (toolData && toolData[spell.sourceTool]) || {};
    var srcSummary = '';
    try {
      // Small one-line summary of source-tool progress so the AI can pitch
      // questions at roughly the right depth (e.g., "completed 5 missions").
      var keys = Object.keys(srcData).filter(function(k) {
        var v = srcData[k];
        return typeof v === 'number' || typeof v === 'boolean';
      });
      if (keys.length > 0) {
        srcSummary = 'Student progress in ' + srcLabel + ': '
          + keys.slice(0, 4).map(function(k) { return k + '=' + srcData[k]; }).join(', ') + '.';
      }
    } catch (e) {}

    var prompt = [
      'You are generating retrieval-practice questions for a sci-fi educational roguelite called "AlloBot Sage".',
      'Each spell has a domain. Generate 5 NEW multiple-choice questions for the spell named "' + spell.name + '"',
      '(element: ' + (spell.element || 'general') + ', source domain: ' + srcLabel + ').',
      'Target audience: middle-school students (grades 6-8). Questions must be factually accurate, clearly worded,',
      'with EXACTLY one unambiguous correct answer and 3 plausible distractors.',
      srcSummary,
      '',
      'Style examples from this spell\'s domain (do NOT duplicate these):',
      examplesJson,
      '',
      'Return ONLY a JSON array of exactly 5 NEW questions. Each question must have this exact shape:',
      '{ "prompt": "Question text?", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explain": "1-2 sentence why" }',
      '',
      'Do NOT wrap in markdown. Do NOT add commentary. Output ONLY the JSON array now:'
    ].join('\n');

    return callGemini(prompt, true).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      // Strip code fences if Gemini wrapped the array.
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      // Find the outer array brackets.
      var startIdx = raw.indexOf('[');
      var endIdx = raw.lastIndexOf(']');
      if (startIdx < 0 || endIdx <= startIdx) return [];
      var sliced = raw.substring(startIdx, endIdx + 1);
      var parsed;
      try { parsed = JSON.parse(sliced); } catch (e) { return []; }
      if (!Array.isArray(parsed)) return [];
      // Validate each question. Reject malformed entries silently.
      return parsed.filter(function(q) {
        return q && typeof q.prompt === 'string' && q.prompt.length > 0
          && Array.isArray(q.options) && q.options.length === 4
          && q.options.every(function(o) { return typeof o === 'string' && o.length > 0; })
          && typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 && Math.floor(q.correctIndex) === q.correctIndex
          && typeof q.explain === 'string' && q.explain.length > 0;
      }).map(function(q) {
        return {
          prompt: String(q.prompt),
          options: q.options.map(String),
          correctIndex: Math.floor(q.correctIndex),
          explain: String(q.explain),
          aiGenerated: true
        };
      });
    }).catch(function() { return []; });
  }

  // Returns the full question pool for a spell: static bank + cached AI bank.
  function getMergedBank(spell, aiCache) {
    var staticBank = spell.challengeBank || [];
    var aiBank = (aiCache && aiCache[spell.id]) || [];
    if (aiBank.length === 0) return staticBank;
    return staticBank.concat(aiBank);
  }

  // ═══════════════════════════════════════════════════════════════
  // Spaced-repetition weighted pick (the heart of the SRS layer)
  // ═══════════════════════════════════════════════════════════════
  // Each question has a stable key (its prompt text). We track per-question
  // stats in d.questionStats: { [prompt]: { lastResult, lastSeen, attempts } }.
  // The pick function biases toward questions the student has gotten WRONG
  // recently and away from questions answered correctly (especially crits).
  // This implements the core retrieval-practice principle: surface what you
  // don't yet know more often than what you do.
  //
  // Weights (tunable):
  //   never seen        → 1.0   (baseline new question)
  //   last 'backfire'   → 3.0   (HEAVY boost — student needs this question)
  //   last 'hit'        → 0.6   (slight de-prioritize — they got it)
  //   last 'crit'       → 0.25  (strong de-prioritize — they know it cold)
  //   plus: "stale" bonus +0.5 for any question not seen in 10+ minutes
  //   plus: aiGenerated questions get +0.3 to surface variety
  function pickWeighted(bank, stats) {
    if (!bank || bank.length === 0) return null;
    if (!stats || Object.keys(stats).length === 0) return pickRandom(bank);
    var now = Date.now();
    var weights = bank.map(function(qq) {
      var s = stats[qq.prompt];
      var w = 1.0;
      if (!s) w = 1.0;
      else if (s.lastResult === 'backfire') w = 3.0;
      else if (s.lastResult === 'hit') w = 0.6;
      else if (s.lastResult === 'crit') w = 0.25;
      // Stale bonus — anything not seen in 10+ minutes gets a small boost
      if (s && s.lastSeen && (now - s.lastSeen) > 600000) w += 0.5;
      // AI questions get a small variety boost so the merged bank doesn't
      // ignore them once SRS has accumulated stats on static questions.
      if (qq.aiGenerated) w += 0.3;
      return w;
    });
    var total = weights.reduce(function(a, b) { return a + b; }, 0);
    if (total <= 0) return pickRandom(bank);
    var r = Math.random() * total;
    for (var i = 0; i < bank.length; i++) {
      r -= weights[i];
      if (r <= 0) return bank[i];
    }
    return bank[bank.length - 1];
  }

  // ═══════════════════════════════════════════════════════════════
  // Register tool
  // ═══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('alloBotSage', {
    icon: '\uD83E\uDDD9\u200D\u2642\uFE0F',
    label: 'AlloBot: Starbound Sage',
    desc: 'A cozy sci-fi roguelite where AlloBot\u2019s spells unlock as you master other STEM Lab tools. Cast by demonstrating what you learned.',
    color: 'violet',
    category: 'Games',
    questHooks: [
      // \u2500\u2500 First-step quests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      { id: 'first_expedition',  label: 'Complete your first Expedition',     icon: '\u2728',        check: function(d) { return ((d.alloBotSage || {}).expeditionsCompleted || 0) >= 1; }, progress: function(d) { return ((d.alloBotSage || {}).expeditionsCompleted || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'crit_first',        label: 'Land your first CRITICAL cast',      icon: '\u2B50',        check: function(d) { return ((d.alloBotSage || {}).critCasts || 0) >= 1; },           progress: function(d) { return ((d.alloBotSage || {}).critCasts || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'interrupt_first',   label: 'Interrupt a boss SPECIAL',           icon: '\uD83D\uDEE1\uFE0F', check: function(d) { return ((d.alloBotSage || {}).interruptCount || 0) >= 1; },  progress: function(d) { return ((d.alloBotSage || {}).interruptCount || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      // \u2500\u2500 Spell-collection quests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      { id: 'learn_3_spells',    label: 'Unlock 3 spells from other tools',   icon: '\uD83D\uDCDC', check: function(d) { return computeUnlockedSpells(d).length >= 3; },   progress: function(d) { return computeUnlockedSpells(d).length + '/3'; } },
      { id: 'learn_10_spells',   label: 'Unlock 10 spells (half the grimoire)', icon: '\uD83D\uDCD6', check: function(d) { return computeUnlockedSpells(d).length >= 10; }, progress: function(d) { return computeUnlockedSpells(d).length + '/10'; } },
      { id: 'learn_20_spells',   label: 'Unlock 20 spells',                   icon: '\uD83D\uDCDA', check: function(d) { return computeUnlockedSpells(d).length >= 20; }, progress: function(d) { return computeUnlockedSpells(d).length + '/20'; } },
      { id: 'learn_all_spells',  label: 'Unlock the complete grimoire',       icon: '\uD83C\uDFC6', check: function(d) { return computeUnlockedSpells(d).length >= SPELLBOOK.length; }, progress: function(d) { return computeUnlockedSpells(d).length + '/' + SPELLBOOK.length; } },
      // \u2500\u2500 Cast-volume quests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      { id: 'cast_10',           label: 'Cast 10 spells across expeditions',  icon: '\uD83D\uDD2E', check: function(d) { return ((d.alloBotSage || {}).totalCasts || 0) >= 10; },  progress: function(d) { return ((d.alloBotSage || {}).totalCasts || 0) + '/10'; } },
      { id: 'cast_100',          label: 'Cast 100 spells',                    icon: '\uD83D\uDD2E', check: function(d) { return ((d.alloBotSage || {}).totalCasts || 0) >= 100; }, progress: function(d) { return ((d.alloBotSage || {}).totalCasts || 0) + '/100'; } },
      { id: 'crit_25',           label: 'Land 25 CRITICAL casts',             icon: '\u2728',       check: function(d) { return ((d.alloBotSage || {}).critCasts || 0) >= 25; },   progress: function(d) { return ((d.alloBotSage || {}).critCasts || 0) + '/25'; } },
      // \u2500\u2500 Sector-clear quests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      { id: 'clear_crystal_nebula',     label: 'Clear the Crystal Nebula',     icon: '\uD83C\uDF0C', check: function(d) { return !!((d.alloBotSage || {}).sectorsCleared || {}).crystal_nebula; },     progress: function(d) { return ((d.alloBotSage || {}).sectorsCleared || {}).crystal_nebula ? 'Done!' : 'Not yet'; } },
      { id: 'clear_whispering_archive', label: 'Clear the Whispering Archive', icon: '\uD83D\uDCDC', check: function(d) { return !!((d.alloBotSage || {}).sectorsCleared || {}).whispering_archive; }, progress: function(d) { return ((d.alloBotSage || {}).sectorsCleared || {}).whispering_archive ? 'Done!' : 'Not yet'; } },
      { id: 'clear_ember_clockwork',    label: 'Clear the Ember Clockwork',    icon: '\u2699\uFE0F', check: function(d) { return !!((d.alloBotSage || {}).sectorsCleared || {}).ember_clockwork; },    progress: function(d) { return ((d.alloBotSage || {}).sectorsCleared || {}).ember_clockwork ? 'Done!' : 'Not yet'; } },
      { id: 'clear_deep_tide',          label: 'Clear the Deep Tide',          icon: '\uD83C\uDF0A', check: function(d) { return !!((d.alloBotSage || {}).sectorsCleared || {}).deep_tide; },          progress: function(d) { return ((d.alloBotSage || {}).sectorsCleared || {}).deep_tide ? 'Done!' : 'Not yet'; } },
      { id: 'clear_aurora_atelier',     label: 'Clear the Aurora Atelier',     icon: '\uD83C\uDFA8', check: function(d) { return !!((d.alloBotSage || {}).sectorsCleared || {}).aurora_atelier; },     progress: function(d) { return ((d.alloBotSage || {}).sectorsCleared || {}).aurora_atelier ? 'Done!' : 'Not yet'; } },
      { id: 'clear_all_sectors',        label: 'Clear all 5 sectors',          icon: '\uD83C\uDFC6', check: function(d) { var s = ((d.alloBotSage || {}).sectorsCleared || {}); return ['crystal_nebula','whispering_archive','ember_clockwork','deep_tide','aurora_atelier'].every(function(id) { return s[id]; }); }, progress: function(d) { var s = ((d.alloBotSage || {}).sectorsCleared || {}); return ['crystal_nebula','whispering_archive','ember_clockwork','deep_tide','aurora_atelier'].filter(function(id) { return s[id]; }).length + '/5'; } },
      // \u2500\u2500 Boss-defeat quests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      { id: 'defeat_3_bosses',   label: 'Defeat 3 unique bosses',  icon: '\uD83D\uDC80', check: function(d) { return Object.keys((d.alloBotSage || {}).bossesDefeated || {}).length >= 3; },  progress: function(d) { return Object.keys((d.alloBotSage || {}).bossesDefeated || {}).length + '/3'; } },
      { id: 'defeat_all_bosses', label: 'Defeat all 15 bosses',    icon: '\uD83D\uDC51', check: function(d) { return Object.keys((d.alloBotSage || {}).bossesDefeated || {}).length >= 15; }, progress: function(d) { return Object.keys((d.alloBotSage || {}).bossesDefeated || {}).length + '/15'; } },
      // \u2500\u2500 Mastery + AI quests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      { id: 'max_one_spell',     label: 'Upgrade a spell to LV 5',  icon: '\uD83C\uDF1F', check: function(d) { var lv = ((d.alloBotSage || {}).spellLevels || {}); return Object.keys(lv).some(function(k) { return lv[k] >= 5; }); }, progress: function(d) { var lv = ((d.alloBotSage || {}).spellLevels || {}); var max = Object.keys(lv).reduce(function(m, k) { return Math.max(m, lv[k] || 0); }, 0); return max + '/5'; } },
      { id: 'ai_first_bank',     label: 'Generate AI questions for a spell', icon: '\u2728', check: function(d) { var c = ((d.alloBotSage || {}).aiChallengeCache || {}); return Object.keys(c).some(function(k) { return (c[k] || []).length > 0; }); }, progress: function(d) { var c = ((d.alloBotSage || {}).aiChallengeCache || {}); var total = Object.keys(c).reduce(function(t, k) { return t + (c[k] || []).length; }, 0); return total + ' AI questions'; } }
    ],
    render: function(ctx) {
      var React = window.React;
      var h = React.createElement;
      var toolData = ctx.toolData || {};
      var addToast = ctx.addToast || function() {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool || function() {};
      var awardXP = ctx.awardXP || function() {};
      var callGemini = ctx.callGemini || null;

      var d = toolData.alloBotSage || {};
      var aiChallengeCache = d.aiChallengeCache || {};

      // Helpers to patch alloBotSage state.
      function updSage(patch) { ctx.updateMulti('alloBotSage', patch); }
      function updKey(k, v) { ctx.update('alloBotSage', k, v); }

      // ── Persistent state ──
      var phase            = d.phase || 'hub'; // hub | loadout | expedition | debrief
      var essence          = d.essence || 0;
      var expeditionsDone  = d.expeditionsCompleted || 0;
      var totalCasts       = d.totalCasts || 0;
      var critCasts        = d.critCasts || 0;
      var seenSpells       = d.seenSpells || [];
      var equippedLoadout  = d.equippedLoadout || [];

      // ── Transient expedition state ──
      var expedition       = d.expedition || null;
      // expedition shape: { enemy: {id, hp, maxHp, atk, icon, name, flavor}, turn: 'player'|'enemy', log: [], playerHp, playerMaxHp }

      // Unlock detection
      var currentlyUnlocked = computeUnlockedSpells(toolData);
      var newlyUnlocked = computeNewlyUnlocked(toolData, seenSpells);

      // If new spells just appeared, fire toasts + mark them seen.
      if (newlyUnlocked.length > 0 && phase === 'hub') {
        newlyUnlocked.forEach(function(id) {
          var s = findSpell(id);
          if (!s) return;
          try { addToast(s.icon + ' New rune! \u201c' + s.name + '\u201d sparks in your grimoire', 'success'); } catch(e) {}
          announceSR('New spell unlocked: ' + s.name);
        });
        sfxUnlock();
        var mergedSeen = seenSpells.concat(newlyUnlocked);
        // Defer so we don't loop inside render — context deferSafe already wraps setToolData.
        updKey('seenSpells', mergedSeen);
      }

      // ─────────────────────────────────────────────────
      // ── Shared UI helpers
      // ─────────────────────────────────────────────────
      function backBtn(onClick, label) {
        return h('button', {
          onClick: onClick,
          className: 'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 focus:ring-2 focus:ring-violet-400 focus:outline-none',
          'aria-label': label || 'Back'
        }, ArrowLeft ? h(ArrowLeft, { className: 'w-3.5 h-3.5' }) : h('span', null, '\u2190'), h('span', null, label || 'Back'));
      }

      // Mastery tier from cumulative cast count. Returns null below the first
      // threshold so beginners don't see a "tier 0" badge.
      function masteryTier(count) {
        if (count >= 50) return { name: 'Sage',   bg: 'rgba(251,191,36,0.18)',   border: '#fbbf24', text: '#92400e', icon: '\uD83C\uDF1F' };
        if (count >= 20) return { name: 'Master', bg: 'rgba(139,92,246,0.18)',   border: '#8b5cf6', text: '#5b21b6', icon: '\u2728' };
        if (count >= 5)  return { name: 'Adept',  bg: 'rgba(59,130,246,0.15)',   border: '#3b82f6', text: '#1d4ed8', icon: '\u25C6' };
        return null;
      }

      function spellCard(s, opts) {
        opts = opts || {};
        var unlocked = opts.unlocked;
        var onClick = opts.onClick;
        var equipped = opts.equipped;
        var usageCount = opts.usageCount || 0;
        var tier = masteryTier(usageCount);
        return h('button', {
          key: s.id,
          onClick: onClick,
          disabled: !unlocked && !opts.alwaysClickable,
          className: 'text-left p-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 '
            + (unlocked
              ? (equipped ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-400 hover:bg-violet-50/50')
              : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'),
          'aria-label': s.name + (unlocked ? (equipped ? ' (equipped)' : ' (unlocked)') : ' (locked: ' + s.unlockHint + ')') + (tier ? ', ' + tier.name + ' tier (' + usageCount + ' casts)' : ''),
          style: unlocked ? { boxShadow: '0 1px 0 ' + s.color + '20' } : {}
        },
          h('div', { className: 'flex items-center gap-2 mb-1' },
            h('span', { className: 'text-2xl', 'aria-hidden': 'true', style: { filter: unlocked ? '' : 'grayscale(1)' } }, unlocked ? s.icon : '\uD83D\uDD12'),
            h('span', { className: 'font-bold text-sm', style: { color: unlocked ? s.color : '#94a3b8' } }, s.name),
            tier && unlocked && h('span', {
              className: 'text-[9px] font-bold px-1.5 py-0.5 rounded-md',
              style: { background: tier.bg, border: '1px solid ' + tier.border, color: tier.text },
              title: tier.name + ' (' + usageCount + ' casts)'
            }, tier.icon + ' ' + tier.name),
            equipped && h('span', { className: 'ml-auto text-[10px] font-bold text-violet-600 uppercase tracking-wide' }, 'Equipped')
          ),
          h('div', { className: 'text-[11px] text-slate-300 leading-snug' },
            unlocked
              ? (s.sourceLabel + ' \u00b7 ' + s.baseDamage + ' dmg \u00b7 crit \u00d7' + s.critMultiplier.toFixed(1))
              : ('Locked \u2014 ' + s.unlockHint)
          ),
          unlocked && usageCount > 0 && h('div', { className: 'mt-1 text-[10px] text-slate-500 font-mono' }, '\uD83D\uDD2E ' + usageCount + ' cast' + (usageCount > 1 ? 's' : '')),
          unlocked && h('div', { className: 'mt-1 text-[10px] italic text-slate-400 leading-snug' }, s.flavor)
        );
      }

      // AlloBot avatar (simple inline SVG \u2014 wizard variant).
      // \u2500\u2500\u2500 Param plumbing \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      // mood        \u2014 'idle' | 'happy' | 'sad' | 'hurt' | 'cast' | 'victory'
      //               'victory' inherits 'happy' colors plus triggers a
      //               1.4s backflip via the .abs-backflip class.
      // opts.wandTier \u2014 0..3. Drives the wand-tip aura intensity:
      //                 0 = no aura (no spells unlocked yet)
      //                 1 = dim glow ring         (1\u20133 spells)
      //                 2 = bright glow + flicker (4\u20139 spells)
      //                 3 = full pulsing aura     (10+ spells)
      // opts.robeTier \u2014 0..2. 0 = base purple, 1 = brighter saturation
      //                 (5+ spells), 2 = + gold accent stripe (15+).
      // opts.idleTwist \u2014 true = adds .abs-idle-twist micro-flourish to wand
      //                  (Phase C, used on the hub avatar).
      function allobotAvatar(mood, opts) {
        opts = opts || {};
        var wandTier = opts.wandTier || 0;
        var robeTier = opts.robeTier || 0;
        var moodColor = mood === 'cast' ? '#a855f7'
                      : mood === 'hurt' ? '#ef4444'
                      : (mood === 'happy' || mood === 'victory') ? '#34d399'
                      : mood === 'sad' ? '#94a3b8'
                      : '#6366f1';
        var sadMouth = (mood === 'hurt' || mood === 'sad');
        // Robe progression: brighter purple at tier 1, gold accent at tier 2.
        var robeFill = robeTier >= 1 ? '#6d28d9' : '#4c1d95';
        var hatFill  = robeTier >= 1 ? '#5b21b6' : '#4c1d95';
        // Wand-tier aura: render a halo behind the wand tip whose radius +
        // opacity scale with tier. Tier 3 also gets a pulsing animation.
        var auraRadius = wandTier === 0 ? 0 : (5 + wandTier * 4);
        var auraOpacity = wandTier === 0 ? 0 : (0.25 + wandTier * 0.20);
        var auraColor = wandTier >= 3 ? '#fde047' : (wandTier >= 2 ? '#fbbf24' : '#a78bfa');
        var auraClass = wandTier >= 3 ? 'abs-wand-aura' : (wandTier >= 2 ? 'abs-wand-flicker' : '');
        var wrapperClass = mood === 'victory' ? 'abs-backflip' : 'abs-float';
        return h('svg', { viewBox: '0 0 120 140', className: wrapperClass, width: 96, height: 112, 'aria-hidden': 'true' },
          h('defs', null,
            h('radialGradient', { id: 'absVisor' },
              h('stop', { offset: '0%', stopColor: '#67e8f9' }),
              h('stop', { offset: '100%', stopColor: '#0e7490' })
            ),
            wandTier > 0 && h('radialGradient', { id: 'absWandAuraGrad' },
              h('stop', { offset: '0%', stopColor: auraColor, stopOpacity: auraOpacity + 0.25 }),
              h('stop', { offset: '60%', stopColor: auraColor, stopOpacity: auraOpacity * 0.45 }),
              h('stop', { offset: '100%', stopColor: auraColor, stopOpacity: 0 })
            )
          ),
          // Wand-tip aura (rendered FIRST so it sits behind the wand stick).
          wandTier > 0 && h('circle', { cx: 116, cy: 66, r: auraRadius, fill: 'url(#absWandAuraGrad)', className: auraClass }),
          // Wizard hat
          h('polygon', { points: '60,2 38,44 82,44', fill: hatFill }),
          h('polygon', { points: '55,12 55,44 65,44 65,12', fill: '#7c3aed' }),
          h('circle', { cx: 60, cy: 6, r: 3, fill: '#fbbf24' }),
          // Body/robe
          h('ellipse', { cx: 60, cy: 110, rx: 36, ry: 22, fill: robeFill }),
          // Robe gold accent stripe (tier 2 milestone \u2014 15+ spells)
          robeTier >= 2 && h('path', { d: 'M 28 108 Q 60 102 92 108', stroke: '#fde047', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }),
          // Head
          h('circle', { cx: 60, cy: 70, r: 28, fill: '#e0e7ff', stroke: moodColor, strokeWidth: 2 }),
          // Visor
          h('rect', { x: 40, y: 62, width: 40, height: 14, rx: 7, fill: 'url(#absVisor)' }),
          // Eyes
          h('circle', { cx: 50, cy: 69, r: 2.5, fill: '#fff' }),
          h('circle', { cx: 70, cy: 69, r: 2.5, fill: '#fff' }),
          // Mouth
          h('path', { d: sadMouth ? 'M 52 82 Q 60 76 68 82' : 'M 52 80 Q 60 86 68 80', stroke: moodColor, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
          // Wand stick + tip \u2014 group so the optional idle twist applies cleanly.
          h('g', opts.idleTwist ? { className: 'abs-idle-twist' } : null,
            h('line', { x1: 92, y1: 96, x2: 116, y2: 66, stroke: '#78350f', strokeWidth: 3, strokeLinecap: 'round' }),
            h('circle', { cx: 116, cy: 66, r: 5, fill: moodColor, className: 'abs-pulse' })
          )
        );
      }

      // \u2500\u2500\u2500 Confetti burst overlay (Phase A) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      // Renders 18 small colored squares that fly outward + fade. Used on
      // the debrief screen when result === 'victory'. Pure CSS animation;
      // unmounts when parent unmounts (no setInterval to clean up).
      function VictoryConfettiBurst() {
        var pieces = [];
        var colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fde047'];
        for (var ci = 0; ci < 18; ci++) {
          var angle = (ci / 18) * 6.283; // 2\u03c0
          var dist = 60 + Math.random() * 40;
          pieces.push(h('span', {
            key: 'cf-' + ci,
            className: 'abs-confetti-piece',
            style: {
              background: colors[ci % colors.length],
              left: '50%', top: '50%',
              borderRadius: ci % 2 === 0 ? '50%' : '2px',
              animationDelay: (Math.random() * 0.15) + 's',
              '--abs-cdx': (Math.cos(angle) * dist).toFixed(0) + 'px',
              '--abs-cdy': (Math.sin(angle) * dist - 20).toFixed(0) + 'px'
            }
          }));
        }
        return h('div', {
          'aria-hidden': 'true',
          style: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }
        }, pieces);
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: HUB (Spellforge)
      // ─────────────────────────────────────────────────
      if (phase === 'hub') {
        var lockedSpells   = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) === -1; });
        var unlockedSpells = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });

        // ── Daily essence bonus ──
        // Claimed once per calendar day (local time). Bonus scales with unique source tools mastered.
        var todayStr = new Date().toISOString().slice(0, 10);
        var lastClaim = d.dailyClaimedOn || null;
        var dailyAvailable = lastClaim !== todayStr;
        var streakState = d.streak || { count: 0, lastDate: null, longest: 0, milestones: {} };
        function isYesterday(dateStr) {
          if (!dateStr) return false;
          var y = new Date();
          y.setUTCDate(y.getUTCDate() - 1);
          return y.toISOString().slice(0, 10) === dateStr;
        }
        // Display value: snap to 0 if the saved streak's lastDate is stale
        // (older than yesterday). It'll reset on the next claim anyway.
        var streakDisplay = streakState.count || 0;
        if (streakState.lastDate !== todayStr && !isYesterday(streakState.lastDate) && streakState.lastDate !== null) {
          streakDisplay = 0;
        }
        function claimDaily() {
          var sourcesTouched = {};
          unlockedSpells.forEach(function(s) { sourcesTouched[s.sourceTool] = true; });
          var n = Math.max(1, Object.keys(sourcesTouched).length);
          var bonus = 5 + n * 3;
          // \u2500\u2500 Streak math \u2500\u2500
          // Yesterday \u2192 increment. Today (no-op) \u2192 keep. Older/null \u2192 reset to 1.
          // One-time milestone bonuses fire at 3/7/30 days.
          var prevStreak = streakState.count || 0;
          var prevDate = streakState.lastDate;
          var newCount;
          if (prevDate === todayStr) { newCount = prevStreak; }
          else if (isYesterday(prevDate)) { newCount = prevStreak + 1; }
          else { newCount = 1; }
          var newLongest = Math.max(streakState.longest || 0, newCount);
          var milestones = Object.assign({}, streakState.milestones || {});
          var milestoneBonus = 0;
          var milestoneLabel = '';
          if (newCount >= 30 && !milestones.m30) { milestoneBonus = 60; milestoneLabel = '30-day streak!'; milestones.m30 = todayStr; }
          else if (newCount >= 7 && !milestones.m7) { milestoneBonus = 25; milestoneLabel = '7-day streak!'; milestones.m7 = todayStr; }
          else if (newCount >= 3 && !milestones.m3) { milestoneBonus = 10; milestoneLabel = '3-day streak!'; milestones.m3 = todayStr; }
          var totalBonus = bonus + milestoneBonus;
          sfxUnlock();
          updSage({
            dailyClaimedOn: todayStr,
            essence: essence + totalBonus,
            lastVisit: Date.now(),
            streak: { count: newCount, lastDate: todayStr, longest: newLongest, milestones: milestones }
          });
          if (milestoneBonus > 0) {
            addToast('\uD83D\uDD25 ' + milestoneLabel + ' +' + milestoneBonus + ' bonus essence on top of daily!', 'success');
            announceSR('Streak milestone: ' + milestoneLabel + ' Plus ' + milestoneBonus + ' bonus.');
          } else {
            addToast('\u2B50 Daily bonus: +' + bonus + ' essence (' + n + ' domains tended) \u00B7 ' + newCount + '-day streak', 'success');
            announceSR('Daily bonus claimed: plus ' + bonus + ' essence. Streak: ' + newCount + ' days.');
          }
        }

        // ── AlloBot mood by time-since-visit ──
        var nowMs = Date.now();
        var daysSinceVisit = d.lastVisit ? (nowMs - d.lastVisit) / 86400000 : 0;
        var visitMood = !d.lastVisit ? 'idle'
                      : daysSinceVisit < 1 ? 'happy'
                      : daysSinceVisit < 3 ? 'idle'
                      : 'sad';
        var greeting = !d.lastVisit
          ? 'AlloBot gently hums \u2014 the Spellforge is waking for the first time.'
          : daysSinceVisit < 0.1 ? 'AlloBot bobs excitedly \u2014 ready for another expedition?'
          : daysSinceVisit < 1 ? 'AlloBot glances up from the grimoire. \u201cBack so soon? Wonderful.\u201d'
          : daysSinceVisit < 3 ? 'AlloBot is quietly re-reading your spells, waiting for you.'
          : daysSinceVisit < 7 ? 'AlloBot\u2019s visor dims slightly. They missed you.'
          : 'AlloBot blinks awake. \u201cIt\u2019s been a while. I kept your grimoire safe.\u201d';

        // Mark visit (fire-and-forget; throttled by setToolData\u2019s state equality)
        if (!d.lastVisit || (nowMs - d.lastVisit) > 60000) {
          updKey('lastVisit', nowMs);
        }

        // ── Trophy shelf: one trophy per source tool with unlocked spells ──
        var sourceTally = {};
        unlockedSpells.forEach(function(s) {
          if (!sourceTally[s.sourceTool]) sourceTally[s.sourceTool] = { label: s.sourceLabel.split(' ')[0], icon: s.icon, count: 0, color: s.color };
          sourceTally[s.sourceTool].count += 1;
        });
        // Canonical source-tool list (keeps empty slots visible as "Yet to earn")
        var canonicalSources = [
          { key: 'spaceExplorer',   label: 'Space Explorer',   icon: '\uD83C\uDF0C' },
          { key: 'mathLab',         label: 'Math Lab',         icon: '\uD83D\uDD22' },
          { key: 'roadReady',       label: 'RoadReady',        icon: '\uD83D\uDE97' },
          { key: 'wordSounds',      label: 'Word Sounds',      icon: '\uD83D\uDD24' },
          { key: 'writeCraft',      label: 'WriteCraft',       icon: '\u270D\uFE0F' },
          { key: 'immersiveReader', label: 'Immersive Reader', icon: '\uD83D\uDCD6' }
        ];

        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 abs-fade relative' },
          // ── Spell Preview Modal (overlay) ──
          // Renders when d.previewingSpellId is set. Shows 2-3 sample challenge
          // questions, per-spell SRS health, and a "Drill in Study Hall" jump.
          // Solves a real UX gap: previously the only way to see a spell's
          // questions was to cast it in combat (high-stakes), so students
          // couldn't make informed choices about which spell to practice.
          d.previewingSpellId && (function() {
            var ps = findSpell(d.previewingSpellId);
            if (!ps) return null;
            var bank = getMergedBank(ps, aiChallengeCache);
            var stats = d.questionStats || {};
            // Per-spell aggregate: total attempts + correct on this spell's questions
            var pAttempts = 0, pCorrect = 0, pSeen = 0;
            bank.forEach(function(qq) {
              var st = stats[qq.prompt];
              if (st) { pSeen++; pAttempts += st.attempts || 0; pCorrect += st.correctCount || 0; }
            });
            var pAccPct = pAttempts > 0 ? Math.round(pCorrect / pAttempts * 100) : null;
            // Pick 3 sample questions: prefer 1 seen-and-failed, 1 seen-and-correct, 1 unseen
            // (so the preview is informative across the student's experience).
            var failedSample = null, correctSample = null, unseenSample = null;
            for (var bi = 0; bi < bank.length; bi++) {
              var st2 = stats[bank[bi].prompt];
              if (!st2 && !unseenSample) unseenSample = bank[bi];
              else if (st2 && st2.lastResult === 'backfire' && !failedSample) failedSample = bank[bi];
              else if (st2 && (st2.lastResult === 'hit' || st2.lastResult === 'crit') && !correctSample) correctSample = bank[bi];
              if (failedSample && correctSample && unseenSample) break;
            }
            var samples = [];
            if (failedSample) samples.push({ q: failedSample, tag: 'You backfired on this one', color: '#dc2626' });
            if (correctSample) samples.push({ q: correctSample, tag: 'You got this one right', color: '#16a34a' });
            if (unseenSample) samples.push({ q: unseenSample, tag: 'New — you haven\'t tried this yet', color: '#64748b' });
            if (samples.length === 0 && bank.length > 0) {
              // Fallback: just show first 2 from bank
              samples = bank.slice(0, 2).map(function(qq) { return { q: qq, tag: 'Sample question', color: '#64748b' }; });
            }
            // Cast count from castCounts
            var castN = (d.castCounts || {})[ps.id] || 0;
            return h('div', {
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': 'abs-preview-title',
              style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' },
              onClick: function(e) { if (e.target === e.currentTarget) { sfxClick(); updKey('previewingSpellId', null); } }
            },
              h('div', {
                style: { maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', border: '2px solid ' + ps.color, borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
              },
                // Header
                h('div', { className: 'p-4 flex items-center gap-3', style: { background: 'linear-gradient(135deg, ' + ps.color + '25, ' + ps.color + '10)' } },
                  h('span', { className: 'text-4xl' }, ps.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { id: 'abs-preview-title', className: 'text-lg font-bold', style: { color: ps.color } }, ps.name),
                    h('div', { className: 'text-[11px] text-slate-600 mt-0.5' }, ps.sourceLabel + ' · ' + ps.element + ' · ' + ps.baseDamage + ' base dmg · crit ×' + ps.critMultiplier.toFixed(1))
                  ),
                  h('button', {
                    onClick: function() { sfxClick(); updKey('previewingSpellId', null); },
                    className: 'text-2xl text-slate-400 hover:text-slate-700 font-bold leading-none focus:ring-2 focus:ring-violet-400 focus:outline-none rounded px-2',
                    'aria-label': 'Close preview'
                  }, '×')
                ),
                // Flavor + stats strip
                h('div', { className: 'px-4 py-2 text-[12px] italic text-slate-600 border-b border-slate-200' }, '"' + ps.flavor + '"'),
                h('div', { className: 'px-4 py-2 grid grid-cols-3 gap-2 text-center border-b border-slate-200' },
                  h('div', null,
                    h('div', { className: 'text-[9px] font-bold text-slate-400 uppercase tracking-wider' }, 'Casts'),
                    h('div', { className: 'text-base font-bold text-violet-700' }, castN)
                  ),
                  h('div', null,
                    h('div', { className: 'text-[9px] font-bold text-slate-400 uppercase tracking-wider' }, 'Questions'),
                    h('div', { className: 'text-base font-bold text-slate-700' }, bank.length, h('span', { className: 'text-[10px] text-slate-400 font-normal' }, ' (' + pSeen + ' seen)'))
                  ),
                  h('div', null,
                    h('div', { className: 'text-[9px] font-bold text-slate-400 uppercase tracking-wider' }, 'Accuracy'),
                    h('div', { className: 'text-base font-bold ' + (pAccPct === null ? 'text-slate-400' : pAccPct >= 75 ? 'text-emerald-600' : pAccPct >= 50 ? 'text-amber-600' : 'text-red-600') }, pAccPct === null ? '—' : pAccPct + '%')
                  )
                ),
                // Sample questions
                h('div', { className: 'p-4' },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2' }, '📋 Sample Questions (' + samples.length + ')'),
                  h('div', { className: 'space-y-2' },
                    samples.map(function(samp, si) {
                      var qq = samp.q;
                      return h('div', { key: 'samp-' + si, className: 'p-3 rounded-lg border border-slate-200 bg-slate-50' },
                        h('div', { className: 'flex items-center gap-1 mb-1' },
                          h('span', { className: 'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', style: { color: samp.color, background: samp.color + '15' } }, samp.tag),
                          qq.aiGenerated && h('span', { className: 'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700' }, '✨ AI')
                        ),
                        h('p', { className: 'text-[12px] font-semibold text-slate-800 mb-2' }, qq.prompt),
                        h('div', { className: 'space-y-1' },
                          qq.options.map(function(opt, oi) {
                            var isCorrect = oi === qq.correctIndex;
                            return h('div', {
                              key: 'samp-opt-' + oi,
                              className: 'text-[11px] p-1.5 rounded ' + (isCorrect ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300' : 'bg-white text-slate-600 border border-slate-200')
                            },
                              h('span', { className: 'inline-block w-5 font-bold' }, String.fromCharCode(65 + oi) + '.'),
                              opt,
                              isCorrect && h('span', { className: 'ml-1' }, '✓')
                            );
                          })
                        ),
                        h('div', { className: 'mt-2 text-[10px] italic text-slate-500' }, '→ ' + qq.explain)
                      );
                    })
                  )
                ),
                // CTA: drill in Study Hall
                h('div', { className: 'px-4 pb-4 flex gap-2' },
                  h('button', {
                    onClick: function() {
                      sfxClick();
                      updSage({ phase: 'practice', practiceSpellId: ps.id, practiceQuestion: null, practiceSession: { correct: 0, attempted: 0 }, previewingSpellId: null });
                    },
                    className: 'flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none',
                    'aria-label': 'Drill ' + ps.name + ' in Study Hall'
                  }, '📚 Drill in Study Hall'),
                  h('button', {
                    onClick: function() { sfxClick(); updKey('previewingSpellId', null); },
                    className: 'px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-slate-400 focus:outline-none'
                  }, 'Close')
                )
              )
            );
          })(),

          // Header
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(function() { sfxClick(); setStemLabTool(null); }, 'Back to Lab'),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[10px] text-slate-300 font-semibold uppercase tracking-wider' }, 'Spellforge')
          ),

          // Hero row: AlloBot + headline
          // ── Phase B: wand-tier + robe-tier scale with mastery ──
          // wandTier:  0 (no spells) → 1 (1-3) → 2 (4-9) → 3 (10+)
          // robeTier:  0 (default) → 1 (5+ spells) → 2 (15+ spells)
          h('div', { className: 'rounded-2xl p-4 md:p-6 mb-4', style: { background: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 100%)', color: 'white' } },
            h('div', { className: 'flex items-center gap-4' },
              allobotAvatar(visitMood, {
                wandTier: unlockedSpells.length === 0 ? 0
                          : unlockedSpells.length < 4 ? 1
                          : unlockedSpells.length < 10 ? 2
                          : 3,
                robeTier: unlockedSpells.length >= 15 ? 2
                          : unlockedSpells.length >= 5 ? 1
                          : 0,
                idleTwist: true // Phase C: micro-flourish on the hub avatar
              }),
              h('div', { className: 'flex-1 min-w-0' },
                h('h1', { className: 'text-xl md:text-2xl font-bold' }, 'AlloBot: Starbound Sage'),
                h('p', { className: 'text-sm text-violet-200 mt-1 italic' }, greeting),
                h('div', { className: 'flex flex-wrap gap-2 mt-3 text-xs' },
                  h('div', { className: 'px-2.5 py-1 rounded-lg bg-white/10' }, '\u2728 ' + unlockedSpells.length + '/' + SPELLBOOK.length + ' spells'),
                  h('div', { className: 'px-2.5 py-1 rounded-lg bg-white/10' }, '\uD83D\uDD2E ' + totalCasts + ' casts'),
                  h('div', { className: 'px-2.5 py-1 rounded-lg bg-white/10' }, '\uD83C\uDF0C ' + expeditionsDone + ' expeditions'),
                  // Streak chip \u2014 color glows when streak is active (>= 1 day) and intensifies at milestones
                  streakDisplay > 0 && h('div', {
                    className: 'px-2.5 py-1 rounded-lg font-semibold ' + (streakDisplay >= 7 ? 'bg-orange-400/30 text-orange-100' : 'bg-amber-400/15 text-amber-100'),
                    title: 'Longest streak: ' + (streakState.longest || streakDisplay) + ' days'
                  }, '\uD83D\uDD25 ' + streakDisplay + '-day streak'),
                  h('div', { className: 'px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-200 font-semibold' }, '\u2B50 ' + essence + ' essence')
                )
              )
            )
          ),

          // Daily bonus
          dailyAvailable && unlockedSpells.length > 0 && h('button', {
            onClick: claimDaily,
            className: 'w-full mb-3 rounded-xl p-3 text-left border-2 border-amber-600 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 focus:ring-2 focus:ring-amber-400 focus:outline-none transition abs-pulse',
            'aria-label': 'Claim daily essence bonus'
          },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF81'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm text-amber-900' }, 'Daily Bonus ready!'),
                h('div', { className: 'text-[11px] text-amber-700' }, 'Essence scales with how many source tools you\u2019ve tended.')
              ),
              h('div', { className: 'text-amber-600 font-bold' }, '\u2192')
            )
          ),

          // Call-to-action row
          h('div', { className: 'flex flex-col md:flex-row gap-2 mb-5' },
            unlockedSpells.length === 0
              ? h('div', { className: 'rounded-xl p-4 bg-amber-50 border-2 border-amber-200 text-sm text-amber-800 w-full' },
                  // Friendly first-time orientation. The lockedSpells grid below
                  // already has direct "Open Source Tool \u2192" buttons per spell,
                  // so this card primarily explains the loop + points there.
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('span', { className: 'text-2xl' }, '\ud83d\udc4b'),
                    h('strong', { className: 'text-base text-amber-900' }, 'Welcome, future Sage!')
                  ),
                  h('p', { className: 'mb-2 text-amber-900 leading-relaxed' },
                    'Sage spells unlock when you make progress in OTHER STEM Lab tools \u2014 Space Explorer, Math Lab, RoadReady, and more. Each spell is a retrieval-practice ability: you cast by answering a question from that tool\'s domain.'
                  ),
                  h('p', { className: 'mb-2 text-amber-900 leading-relaxed' },
                    h('strong', null, 'How to start: '), 'scroll down to "Yet to discover" and click any spell\'s ',
                    h('span', { className: 'inline-block px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[10px]' }, '\u2192 Open [tool name]'),
                    ' button. That\'ll take you to the tool that unlocks it.'
                  ),
                  h('p', { className: 'text-[12px] text-amber-700 italic' },
                    'AlloBot is watching your progress everywhere. Even a single mission, problem, or drill in another tool will start unlocking spells here.'
                  )
                )
              : [
                  h('button', {
                    key: 'expedition',
                    onClick: function() {
                      sfxClick();
                      var defaults = unlockedSpells.slice(0, 3).map(function(s) { return s.id; });
                      updSage({ phase: 'loadout', equippedLoadout: equippedLoadout.length >= 1 ? equippedLoadout : defaults });
                    },
                    className: 'flex-1 px-6 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 focus:ring-2 focus:ring-violet-400 focus:outline-none shadow-lg'
                  }, '\uD83C\uDF0C Begin Expedition (3 rooms \u2192 boss)'),
                  h('button', {
                    key: 'shop',
                    onClick: function() { sfxClick(); updKey('phase', 'shop'); },
                    className: 'px-5 py-3 rounded-xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 focus:ring-2 focus:ring-amber-400 focus:outline-none'
                  }, '\uD83D\uDD2E Spell Shop')
                ]
          ),

          // \u2500\u2500 Pedagogy row: Study Hall + Review Tough Questions \u2500\u2500
          // These are the no-stakes learning surfaces. Study Hall = untimed
          // drill; Review = flashcard queue of questions you got wrong.
          unlockedSpells.length > 0 && (function() {
            // Compute how many tough questions are queued (across the whole grimoire)
            var statsHub = d.questionStats || {};
            var toughCount = 0;
            SPELLBOOK.forEach(function(sp) {
              var bank = getMergedBank(sp, aiChallengeCache);
              bank.forEach(function(qq) {
                var st = statsHub[qq.prompt];
                if (st && st.lastResult === 'backfire') toughCount++;
              });
            });
            return h('div', { className: 'flex flex-col md:flex-row gap-2 mb-5' },
              h('button', {
                onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: null, practiceQuestion: null, practiceSession: null }); },
                className: 'flex-1 px-5 py-2.5 rounded-xl font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none flex items-center justify-center gap-2',
                'aria-label': 'Open Study Hall \u2014 untimed practice mode'
              },
                h('span', { className: 'text-xl' }, '\uD83D\uDCDA'),
                h('div', { className: 'text-left' },
                  h('div', { className: 'text-sm' }, 'Study Hall'),
                  h('div', { className: 'text-[10px] text-emerald-600 font-normal' }, 'Untimed drill \u00B7 no damage \u00B7 full explanations')
                )
              ),
              h('button', {
                onClick: function() { sfxClick(); updSage({ phase: 'review_mistakes', reviewIdx: 0, reviewRevealed: false }); },
                className: 'flex-1 px-5 py-2.5 rounded-xl font-bold text-red-800 bg-red-50 hover:bg-red-100 border-2 border-red-200 focus:ring-2 focus:ring-red-400 focus:outline-none flex items-center justify-center gap-2',
                'aria-label': 'Review tough questions \u2014 ' + toughCount + ' queued'
              },
                h('span', { className: 'text-xl' }, '\uD83C\uDFAF'),
                h('div', { className: 'text-left' },
                  h('div', { className: 'text-sm flex items-center gap-2' },
                    'Review Tough',
                    toughCount > 0 && h('span', { className: 'text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full' }, toughCount)
                  ),
                  h('div', { className: 'text-[10px] text-red-600 font-normal' },
                    toughCount === 0
                      ? 'No mistakes yet \u2014 keep playing'
                      : 'Re-study what you got wrong'
                  )
                )
              ),
              h('button', {
                onClick: function() { sfxClick(); updKey('phase', 'dashboard'); },
                className: 'flex-1 px-5 py-2.5 rounded-xl font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 focus:ring-2 focus:ring-sky-400 focus:outline-none flex items-center justify-center gap-2',
                'aria-label': 'View your progress dashboard'
              },
                h('span', { className: 'text-xl' }, '\uD83D\uDCCA'),
                h('div', { className: 'text-left' },
                  h('div', { className: 'text-sm' }, 'Your Progress'),
                  h('div', { className: 'text-[10px] text-sky-600 font-normal' }, 'Accuracy \u00B7 calibration \u00B7 sectors \u00B7 bosses')
                )
              )
            );
          })(),

          // ── Achievement Gallery ──
          // Reads the same questHooks the global StemLab Quest Log uses, but
          // renders them inline here so students see the badge grid without
          // having to leave Sage. Earned first, then unearned (with progress).
          unlockedSpells.length > 0 && (function() {
            var hookSrc = (window.StemLab && window.StemLab._registry && window.StemLab._registry.alloBotSage && window.StemLab._registry.alloBotSage.questHooks) || [];
            if (!hookSrc || hookSrc.length === 0) return null;
            // Evaluate each hook against toolData. Bucket into earned/unearned.
            var hookEval = hookSrc.map(function(qh) {
              var earned = false;
              try { earned = !!qh.check(toolData); } catch (e) {}
              var progressText = '';
              try { progressText = qh.progress ? qh.progress(toolData) : (earned ? 'Done!' : 'Not yet'); } catch(e) { progressText = ''; }
              return { id: qh.id, label: qh.label, icon: qh.icon, earned: earned, progress: progressText };
            });
            var earnedCount = hookEval.filter(function(h2) { return h2.earned; }).length;
            // Show open by default once student earns 1+; collapse if none earned yet
            var galleryOpen = d.galleryOpen !== false; // default true
            return h('section', { 'aria-label': 'Achievement gallery', className: 'mb-5' },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('h2', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1' },
                  h('span', null, '🏅 Achievements'),
                  h('span', { className: 'text-violet-700' }, '(' + earnedCount + '/' + hookEval.length + ')')
                ),
                h('button', {
                  onClick: function() { sfxClick(); updKey('galleryOpen', !galleryOpen); },
                  className: 'ml-auto text-[10px] text-slate-500 hover:text-slate-800 font-semibold focus:ring-2 focus:ring-violet-400 focus:outline-none rounded px-2 py-0.5',
                  'aria-expanded': galleryOpen
                }, galleryOpen ? 'Collapse' : 'Expand')
              ),
              galleryOpen && h('div', { className: 'rounded-xl p-3 border border-slate-200 bg-white' },
                h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
                  // Earned first, then unearned
                  hookEval.slice().sort(function(a, b) { return (b.earned ? 1 : 0) - (a.earned ? 1 : 0); }).map(function(h2) {
                    return h('div', {
                      key: 'ach-' + h2.id,
                      className: 'flex items-center gap-2 p-2 rounded-lg text-[11px] ' + (h2.earned ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'),
                      'aria-label': h2.label + (h2.earned ? ' (earned)' : ' (in progress: ' + h2.progress + ')')
                    },
                      h('span', { className: 'text-base', style: { filter: h2.earned ? '' : 'grayscale(0.5) opacity(0.65)' } }, h2.icon),
                      h('div', { className: 'flex-1 min-w-0' },
                        h('div', { className: 'font-semibold truncate ' + (h2.earned ? 'text-emerald-900' : 'text-slate-700') }, h2.label),
                        h('div', { className: 'text-[9px] ' + (h2.earned ? 'text-emerald-700' : 'text-slate-400') }, h2.earned ? '✓ Earned' : h2.progress)
                      )
                    );
                  })
                )
              )
            );
          })(),

          // Trophy shelf
          unlockedSpells.length > 0 && h('section', { 'aria-label': 'Trophy shelf', className: 'mb-5' },
            h('h2', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2' }, '\uD83C\uDFC6 Trophy Shelf'),
            h('div', { className: 'rounded-xl p-3 border-2 border-amber-200/50 bg-gradient-to-b from-amber-50/50 to-white' },
              h('div', { className: 'grid grid-cols-3 gap-2' },
                canonicalSources.map(function(src) {
                  var tally = sourceTally[src.key];
                  var earned = !!tally && tally.count > 0;
                  return h('div', {
                    key: src.key,
                    className: 'text-center p-2 rounded-lg ' + (earned ? 'bg-white border border-amber-200' : 'bg-slate-50 border border-dashed border-slate-300'),
                    'aria-label': src.label + (earned ? ': ' + tally.count + ' spells earned' : ': no spells yet')
                  },
                    h('div', { className: 'text-2xl', style: { filter: earned ? '' : 'grayscale(1) opacity(0.5)' } }, src.icon),
                    h('div', { className: 'text-[11px] font-bold mt-1 ' + (earned ? 'text-amber-900' : 'text-slate-400') }, src.label),
                    h('div', { className: 'text-[10px] ' + (earned ? 'text-amber-700' : 'text-slate-400') },
                      earned ? (tally.count + ' spell' + (tally.count > 1 ? 's' : '')) : 'yet to earn'
                    )
                  );
                })
              )
            )
          ),

          // Grimoire
          h('section', { 'aria-label': 'Grimoire', className: 'mb-4' },
            h('h2', { className: 'text-sm font-bold text-slate-700 mb-2 flex items-center gap-2' },
              h('span', null, '\uD83D\uDCDC Grimoire'),
              unlockedSpells.length > 0 && h('span', { className: 'text-[10px] font-normal text-slate-300' },
                '(' + unlockedSpells.length + ' unlocked)'
              )
            ),
            unlockedSpells.length > 0 && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-4' },
              unlockedSpells.map(function(s) { return spellCard(s, { unlocked: true, usageCount: (d.castCounts || {})[s.id] || 0, onClick: function() { sfxClick(); updKey('previewingSpellId', s.id); } }); })
            ),
            lockedSpells.length > 0 && h('div', null,
              h('h3', { className: 'text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2' }, 'Yet to discover (' + lockedSpells.length + ')'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                lockedSpells.map(function(s) {
                  return h('div', { key: 'locked-wrap-' + s.id, className: 'flex flex-col gap-1' },
                    spellCard(s, { unlocked: false }),
                    // Cross-tool jump button: makes the "play source tool to unlock"
                    // loop one-click. Closes the distance between Sage and the
                    // STEM Lab tools that feed it.
                    ctx.setStemLabTool && h('button', {
                      onClick: function() {
                        sfxClick();
                        try { ctx.setStemLabTool(s.sourceTool); } catch(e) {}
                      },
                      className: 'text-[10px] text-slate-500 hover:text-violet-700 font-semibold py-1 px-2 rounded-md hover:bg-violet-50 focus:ring-2 focus:ring-violet-400 focus:outline-none transition flex items-center gap-1 self-end',
                      'aria-label': 'Open ' + s.sourceLabel + ' to work toward unlocking ' + s.name
                    },
                      h('span', null, '→ Open ' + s.sourceLabel)
                    )
                  );
                })
              )
            )
          )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: LOADOUT
      // ─────────────────────────────────────────────────
      if (phase === 'loadout') {
        var loadoutSet = {};
        equippedLoadout.forEach(function(id) { loadoutSet[id] = true; });
        var available = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });
        function toggleSpell(id) {
          var next;
          if (loadoutSet[id]) {
            next = equippedLoadout.filter(function(x) { return x !== id; });
          } else {
            if (equippedLoadout.length >= 3) {
              addToast('Loadout is full \u2014 unequip a spell first', 'info');
              return;
            }
            next = equippedLoadout.concat([id]);
          }
          sfxClick();
          updKey('equippedLoadout', next);
        }
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 abs-fade' },
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(function() { sfxClick(); updKey('phase', 'hub'); }, 'Back to Spellforge'),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[10px] text-slate-300 font-semibold uppercase tracking-wider' }, 'Loadout')
          ),
          h('h2', { className: 'text-lg font-bold mb-1' }, 'Choose your spells'),
          h('p', { className: 'text-sm text-slate-300 mb-4' },
            'Equip up to 3 spells. You can only cast equipped spells on this Expedition.'
          ),
          h('div', { className: 'mb-4 p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-900' },
            h('strong', null, 'Equipped: '),
            equippedLoadout.length,
            '/3 '
          ),

          // \u2500\u2500 Difficulty selector (UDL "multiple means of engagement") \u2500\u2500
          // Students pick their challenge level. Easy = build confidence;
          // Standard = balanced; Hard = sharpen retrieval speed under pressure.
          // The reward multiplier rises with difficulty to honor the harder path.
          h('section', { 'aria-label': 'Choose your challenge level', className: 'mb-4 p-3 rounded-xl border-2 border-slate-200 bg-white' },
            h('div', { className: 'text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2' }, '\u2699\ufe0f Challenge level'),
            h('p', { className: 'text-[10px] text-slate-500 mb-2 italic' }, 'Pick what fits today. You can change this any expedition. Harder difficulty = bigger essence reward.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
              ['easy', 'standard', 'hard'].map(function(diffId) {
                var dp = DIFFICULTY_PROFILES[diffId];
                var picked = (d.difficulty || 'standard') === diffId;
                return h('button', {
                  key: 'diff-' + diffId,
                  onClick: function() { sfxClick(); updKey('difficulty', diffId); },
                  className: 'text-left p-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (picked ? 'shadow-md' : 'hover:border-slate-400'),
                  style: picked ? { borderColor: dp.color, background: dp.color + '12' } : { borderColor: '#e2e8f0', background: '#fff' },
                  'aria-pressed': picked,
                  'aria-label': dp.name + ' difficulty. ' + dp.desc + ' Reward multiplier ' + dp.essenceMult + 'x.'
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-xl' }, dp.icon),
                    h('span', { className: 'font-bold text-sm', style: { color: dp.color } }, dp.name),
                    picked && h('span', { className: 'ml-auto text-violet-700 font-bold text-xs' }, '\u2713')
                  ),
                  h('div', { className: 'text-[10px] leading-snug text-slate-600 mb-1' }, dp.desc),
                  h('div', { className: 'text-[9px] text-slate-500 font-mono' },
                    'crit \u2264' + dp.critWindowSec + 's \u00b7 ' + dp.rooms + ' rooms \u00b7 ' + dp.playerHp + ' HP \u00b7 ' + dp.essenceMult + 'x essence'
                  )
                );
              })
            )
          ),

          // \u2500\u2500 Loadout presets \u2500\u2500
          // 3 named slots. With 39 spells in the grimoire, swapping for different
          // sectors gets tedious; presets let students save common configurations.
          available.length >= 3 && (function() {
            var presets = d.loadoutPresets || [];
            function saveAsPreset() {
              if (equippedLoadout.length === 0) {
                addToast('Equip at least 1 spell before saving a preset', 'info');
                return;
              }
              if (presets.length >= 3) {
                addToast('Preset slots are full \u2014 delete one to save a new preset', 'info');
                return;
              }
              var defaultName = 'Preset ' + (presets.length + 1);
              var name = (typeof prompt === 'function') ? prompt('Name this preset:', defaultName) : defaultName;
              if (name === null) return; // cancelled
              name = (name || defaultName).slice(0, 24);
              sfxClick();
              updKey('loadoutPresets', presets.concat([{ name: name, spellIds: equippedLoadout.slice() }]));
              addToast('\ud83d\udcbe Saved preset: ' + name, 'success');
            }
            function loadPreset(p) {
              sfxClick();
              // Filter to spells that are still unlocked (in case content changed)
              var valid = p.spellIds.filter(function(id) { return currentlyUnlocked.indexOf(id) !== -1; });
              updKey('equippedLoadout', valid);
              addToast('Loaded preset: ' + p.name + (valid.length < p.spellIds.length ? ' (' + (p.spellIds.length - valid.length) + ' locked spell' + (p.spellIds.length - valid.length > 1 ? 's' : '') + ' skipped)' : ''), 'info');
            }
            function deletePreset(idx) {
              sfxClick();
              var next = presets.slice();
              next.splice(idx, 1);
              updKey('loadoutPresets', next);
            }
            return h('section', { 'aria-label': 'Loadout presets', className: 'mb-4 p-3 rounded-xl border-2 border-slate-200 bg-slate-50' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600' }, '\ud83d\udcbe Loadout Presets ' + (presets.length > 0 ? '(' + presets.length + '/3)' : '')),
                h('button', {
                  onClick: saveAsPreset,
                  disabled: presets.length >= 3 || equippedLoadout.length === 0,
                  className: 'text-[10px] font-bold py-1 px-2 rounded-md bg-slate-700 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-slate-400 focus:outline-none',
                  title: presets.length >= 3 ? 'Preset slots full' : equippedLoadout.length === 0 ? 'Equip at least 1 spell first' : 'Save current loadout as a preset'
                }, '+ Save current')
              ),
              presets.length === 0
                ? h('div', { className: 'text-[11px] text-slate-500 italic' }, 'No presets yet. Build a loadout you like and click "Save current" to keep it for next time.')
                : h('div', { className: 'flex flex-col gap-1.5' },
                    presets.map(function(p, idx) {
                      return h('div', {
                        key: 'preset-' + idx,
                        className: 'flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200'
                      },
                        h('button', {
                          onClick: function() { loadPreset(p); },
                          className: 'flex-1 text-left text-[11px] font-semibold text-violet-700 hover:underline focus:ring-2 focus:ring-violet-400 focus:outline-none rounded',
                          'aria-label': 'Load preset ' + p.name
                        }, '\ud83d\udcc2 ' + p.name),
                        h('div', { className: 'flex items-center gap-1' },
                          p.spellIds.slice(0, 3).map(function(id) {
                            var sp = findSpell(id);
                            return sp ? h('span', { key: 'pi-' + id, className: 'text-base', title: sp.name, style: { opacity: currentlyUnlocked.indexOf(id) !== -1 ? 1 : 0.35 } }, sp.icon) : null;
                          })
                        ),
                        h('button', {
                          onClick: function() { if (typeof confirm !== 'function' || confirm('Delete preset "' + p.name + '"?')) deletePreset(idx); },
                          className: 'text-[12px] text-slate-400 hover:text-red-600 px-1 focus:ring-2 focus:ring-red-400 focus:outline-none rounded',
                          'aria-label': 'Delete preset ' + p.name
                        }, '\ud83d\uddd1')
                      );
                    })
                  )
            );
          })(),

          // AI question bank panel \u2014 pre-load + per-spell AI status.
          // Only renders when callGemini is wired AND at least 1 spell is equipped.
          callGemini && equippedLoadout.length > 0 && h('section', { 'aria-label': 'AI question banks', className: 'mb-4 p-3 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50' },
            h('div', { className: 'flex items-center justify-between gap-2 mb-2' },
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1' }, '\u2728 Infinite Question Bank'),
                h('div', { className: 'text-[10px] text-violet-700 mt-0.5' }, 'Static questions never run out \u2014 Gemini generates fresh ones on top.')
              ),
              h('button', {
                onClick: function() {
                  // Fire off generation for any equipped spell that has no AI cache yet.
                  // Already-cached spells are skipped (use refresh button to reroll).
                  if (!callGemini) return;
                  sfxClick();
                  var inFlight = Object.assign({}, d._aiInFlight || {});
                  var promises = [];
                  equippedLoadout.forEach(function(spellId) {
                    if (inFlight[spellId]) return;
                    if ((aiChallengeCache[spellId] || []).length > 0) return;
                    inFlight[spellId] = true;
                    var s = findSpell(spellId);
                    if (!s) return;
                    promises.push(aiGenerateChallenges(s, callGemini, toolData).then(function(qs) {
                      return { id: spellId, qs: qs };
                    }));
                  });
                  if (promises.length === 0) {
                    addToast('All equipped spells already have AI questions cached', 'info');
                    return;
                  }
                  updKey('_aiInFlight', inFlight);
                  addToast('Generating fresh questions for ' + promises.length + ' spell' + (promises.length > 1 ? 's' : '') + '...', 'info');
                  Promise.all(promises).then(function(results) {
                    var freshD = (ctx.toolData && ctx.toolData.alloBotSage) || {};
                    var freshCache = Object.assign({}, freshD.aiChallengeCache || {});
                    var freshFlight = Object.assign({}, freshD._aiInFlight || {});
                    var addedCount = 0;
                    results.forEach(function(r) {
                      delete freshFlight[r.id];
                      if (r.qs.length > 0) {
                        freshCache[r.id] = r.qs;
                        addedCount += r.qs.length;
                      }
                    });
                    ctx.updateMulti('alloBotSage', { aiChallengeCache: freshCache, _aiInFlight: freshFlight });
                    addToast('+' + addedCount + ' AI questions ready', 'success');
                  });
                },
                className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 focus:ring-2 focus:ring-violet-400 focus:outline-none'
              }, '\u2728 Pre-load')
            ),
            // Per-spell AI status row
            h('div', { className: 'flex flex-col gap-1' },
              equippedLoadout.map(function(spellId) {
                var s = findSpell(spellId);
                if (!s) return null;
                var aiCount = (aiChallengeCache[spellId] || []).length;
                var staticCount = (s.challengeBank || []).length;
                var inFlight = !!(d._aiInFlight && d._aiInFlight[spellId]);
                return h('div', {
                  key: 'ai-' + spellId,
                  className: 'flex items-center gap-2 text-[11px] py-0.5'
                },
                  h('span', { className: 'flex-shrink-0' }, s.icon),
                  h('span', { className: 'font-bold flex-1 truncate', style: { color: s.color } }, s.name),
                  h('span', { className: 'text-slate-500 text-[10px]' }, staticCount + ' static'),
                  inFlight
                    ? h('span', { className: 'text-violet-600 text-[10px] font-bold abs-pulse' }, '\u23f3 generating...')
                    : aiCount > 0
                      ? h('span', { className: 'text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-100 border border-violet-300' }, '\u2728 +' + aiCount + ' AI')
                      : h('span', { className: 'text-slate-400 text-[10px] italic' }, 'no AI yet'),
                  aiCount > 0 && !inFlight && h('button', {
                    onClick: function() {
                      // Reroll the AI bank for THIS spell.
                      if (!callGemini) return;
                      sfxClick();
                      var inFlightLocal = Object.assign({}, d._aiInFlight || {});
                      inFlightLocal[spellId] = true;
                      updKey('_aiInFlight', inFlightLocal);
                      aiGenerateChallenges(s, callGemini, toolData).then(function(qs) {
                        var freshD = (ctx.toolData && ctx.toolData.alloBotSage) || {};
                        var freshCache = Object.assign({}, freshD.aiChallengeCache || {});
                        var freshFlight = Object.assign({}, freshD._aiInFlight || {});
                        delete freshFlight[spellId];
                        if (qs.length > 0) freshCache[spellId] = qs;
                        ctx.updateMulti('alloBotSage', { aiChallengeCache: freshCache, _aiInFlight: freshFlight });
                        if (qs.length > 0) addToast('\u2728 ' + s.name + ' rerolled (+' + qs.length + ' new)', 'success');
                      });
                    },
                    'aria-label': 'Regenerate AI questions for ' + s.name,
                    className: 'text-violet-500 hover:text-violet-700 text-[10px] focus:outline-none focus:ring-1 focus:ring-violet-400 rounded'
                  }, '\ud83d\udd04')
                );
              })
            )
          ),

          // Sector picker \u2014 richer cards showing the sector's enemy/boss pool
          h('section', { 'aria-label': 'Sector', className: 'mb-5' },
            h('h3', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2' }, '\uD83C\uDF0C Choose a sector'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              SECTORS.map(function(sec) {
                var unlocked = expeditionsDone >= sec.unlockAt;
                var selected = (d.selectedSector || 'crystal_nebula') === sec.id;
                var labelAria = sec.name + (unlocked ? (selected ? ' (selected)' : ' (unlocked)') : ' (locked: complete ' + sec.unlockAt + ' expeditions)');
                // Pre-compute the sector's normal + boss pools for the preview
                var sectorNormals = ENEMIES.filter(function(e) {
                  return !e.boss && e.sectors && e.sectors.indexOf(sec.id) !== -1;
                });
                var sectorBosses = ENEMIES.filter(function(e) {
                  return e.boss && sec.bossPool && sec.bossPool.indexOf(e.id) !== -1;
                });
                return h('button', {
                  key: sec.id,
                  disabled: !unlocked,
                  onClick: function() {
                    if (!unlocked) return;
                    sfxClick();
                    updKey('selectedSector', sec.id);
                  },
                  className: 'text-left p-4 rounded-xl border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 '
                    + (unlocked
                      ? (selected ? 'border-violet-500 shadow-lg' : 'border-slate-200 hover:border-violet-400')
                      : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'),
                  style: unlocked
                    ? { background: selected ? sec.bgGradient : '#fff', color: selected ? '#fff' : '#0f172a', minHeight: '210px' }
                    : { minHeight: '210px' },
                  'aria-label': labelAria
                },
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('div', { className: 'text-3xl', 'aria-hidden': 'true' }, unlocked ? '\uD83C\uDF0C' : '\uD83D\uDD12'),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'font-bold text-sm leading-tight' }, sec.name),
                      h('div', { className: 'text-[10px] mt-0.5 ' + (selected ? 'opacity-95 font-bold' : 'text-amber-600 font-bold') },
                        unlocked
                          ? ('\u2728 Essence \u00d7' + sec.essenceMult.toFixed(2))
                          : ('Clear ' + sec.unlockAt + ' expedition' + (sec.unlockAt > 1 ? 's' : '') + ' to unlock')
                      )
                    )
                  ),
                  h('div', { className: 'text-[11px] mb-3 ' + (selected ? 'opacity-95' : 'text-slate-600') + ' italic leading-snug' }, sec.subtitle),
                  // Boss preview
                  unlocked && sectorBosses.length > 0 && h('div', { className: 'mb-2' },
                    h('div', { className: 'text-[9px] font-bold uppercase tracking-wider mb-1 ' + (selected ? 'opacity-80' : 'text-slate-400') }, 'Bosses'),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      sectorBosses.map(function(b) {
                        return h('div', {
                          key: b.id,
                          className: 'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold',
                          style: selected ? { background: 'rgba(255,255,255,0.18)' } : { background: '#fef3c7', color: '#92400e' },
                          title: b.name + ' \u2014 ' + b.flavor
                        },
                          h('span', { 'aria-hidden': 'true' }, b.icon),
                          h('span', null, b.name.replace(/^The /, ''))
                        );
                      })
                    )
                  ),
                  // Enemy preview (normals)
                  unlocked && sectorNormals.length > 0 && h('div', null,
                    h('div', { className: 'text-[9px] font-bold uppercase tracking-wider mb-1 ' + (selected ? 'opacity-80' : 'text-slate-400') }, 'Foes (' + sectorNormals.length + ')'),
                    h('div', { className: 'flex flex-wrap gap-0.5', 'aria-hidden': 'true' },
                      sectorNormals.map(function(en) {
                        return h('span', {
                          key: en.id,
                          className: 'text-base',
                          title: en.name + ' \u2014 ' + en.flavor + ' (HP ' + en.hp + ', ATK ' + en.atk + ')'
                        }, en.icon);
                      })
                    )
                  ),
                  unlocked && sectorBosses.length > 0 && selected && h('div', { className: 'mt-2 text-[10px] opacity-90' },
                    h('div', { className: 'flex items-center gap-1 font-bold' }, '\u2728 Selected')
                  )
                );
              })
            )
          ),

          // Spells
          h('h3', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2' }, '\uD83D\uDCDC Equip spells (' + equippedLoadout.length + '/3)'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-5' },
            available.map(function(s) {
              return spellCard(s, {
                unlocked: true,
                equipped: !!loadoutSet[s.id],
                usageCount: (d.castCounts || {})[s.id] || 0,
                onClick: function() { toggleSpell(s.id); }
              });
            })
          ),
          // \u2500\u2500 Goal-setting (Locke & Latham: specific + challenging + attainable goals improve performance) \u2500\u2500
          // Multi-select 3 goal types. State persists in d.selectedGoals so it's
          // remembered across expeditions. Tracked during run, celebrated at debrief.
          h('section', { 'aria-label': 'Set goals for this expedition', className: 'mb-4 p-3 rounded-xl border-2 border-violet-200 bg-violet-50/40' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-violet-900 uppercase tracking-wider' }, '\ud83c\udfaf Set your goals (optional)'),
                h('div', { className: 'text-[10px] text-violet-700 mt-0.5' }, 'Research: specific goals improve performance + focus. Pick any.')
              ),
              h('button', {
                onClick: function() { sfxClick(); updKey('selectedGoals', []); },
                className: 'text-[10px] text-violet-600 hover:text-violet-900 font-semibold underline focus:ring-2 focus:ring-violet-400 focus:outline-none rounded'
              }, 'Skip / clear all')
            ),
            (function() {
              var selectedGoals = d.selectedGoals || [];
              var GOALS = [
                { id: 'crit_5',      icon: '\u2728', label: 'Land 5 critical casts',          desc: 'Rewards fast + correct retrieval' },
                { id: 'spell_variety', icon: '\ud83c\udf08', label: 'Use all 3 equipped spells',     desc: 'Rewards versatility, not one-trick' },
                { id: 'no_death',    icon: '\ud83d\udee1\ufe0f', label: 'Finish run without dying',     desc: 'Rewards strategy + healing choices' },
                { id: 'interrupt',   icon: '\u26a1', label: 'Interrupt a boss SPECIAL',       desc: 'Crit during the WINDING phase' }
              ];
              function toggleGoal(gid) {
                sfxClick();
                var next = selectedGoals.indexOf(gid) !== -1
                  ? selectedGoals.filter(function(x) { return x !== gid; })
                  : selectedGoals.concat([gid]);
                updKey('selectedGoals', next);
              }
              return h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-1.5' },
                GOALS.map(function(g) {
                  var picked = selectedGoals.indexOf(g.id) !== -1;
                  return h('button', {
                    key: 'goal-' + g.id,
                    onClick: function() { toggleGoal(g.id); },
                    className: 'text-left p-2 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (picked ? 'border-violet-500 bg-violet-100' : 'border-slate-200 bg-white hover:border-violet-300'),
                    'aria-pressed': picked,
                    'aria-label': g.label + (picked ? ' (selected)' : '')
                  },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-lg' }, g.icon),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'text-[11px] font-bold ' + (picked ? 'text-violet-900' : 'text-slate-700') }, g.label),
                        h('div', { className: 'text-[10px] ' + (picked ? 'text-violet-700' : 'text-slate-400') }, g.desc)
                      ),
                      picked && h('span', { className: 'text-violet-700 font-bold' }, '\u2713')
                    )
                  );
                })
              );
            })()
          ),
          h('button', {
            disabled: equippedLoadout.length === 0,
            onClick: function() {
              if (equippedLoadout.length === 0) return;
              sfxClick();
              var pickedSectorId = d.selectedSector || 'crystal_nebula';
              var sector = sectorById(pickedSectorId);
              // Apply the picked difficulty profile to room count, HP, crit window,
              // and essence reward. The sector's own multiplier stacks on top.
              var diffProfile = difficultyById(d.difficulty || 'standard');
              var roomsPlan = buildRoomsPlan(sector.id, diffProfile.rooms);
              var firstRoom = roomsPlan[0];
              var combinedEssenceMult = sector.essenceMult * diffProfile.essenceMult;
              var exp = {
                sectorId: sector.id,
                sectorName: sector.name,
                essenceMult: combinedEssenceMult,
                difficulty: diffProfile.id,
                critWindowSec: diffProfile.critWindowSec,
                roomsPlan: roomsPlan,
                roomIndex: 0,
                roomsCleared: 0,
                essenceEarned: 0,
                enemy: Object.assign({}, firstRoom),
                playerHp: diffProfile.playerHp, playerMaxHp: diffProfile.playerHp,
                turn: 'player',
                log: [
                  { text: 'Expedition begins \u2014 sector: ' + sector.name + ' \u00b7 difficulty: ' + diffProfile.name + ' (' + diffProfile.critWindowSec + 's crit window).', kind: 'info' },
                  firstRoom.type === 'shrine'
                    ? { text: 'A ' + firstRoom.name + ' greets you. ' + firstRoom.flavor, kind: 'info' }
                    : { text: 'A ' + firstRoom.name + ' materializes. ' + firstRoom.flavor, kind: 'info' }
                ],
                pendingCast: null,
                // Snapshot the run-start state so debrief can compute goal progress
                goals: (d.selectedGoals || []).slice(),
                goalsStartCrits: critCasts,
                goalsStartInterrupts: d.interruptCount || 0,
                goalsSpellsUsed: {}
              };
              updSage({ phase: 'expedition', expedition: exp });
              announceSR('Expedition begins in the ' + sector.name + ' on ' + diffProfile.name + ' difficulty. ' + firstRoom.name + ' appears in room 1 of ' + diffProfile.rooms + '.');
            },
            className: 'w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-400 focus:outline-none'
          }, equippedLoadout.length === 0 ? 'Equip at least 1 spell' : '\u2728 Launch Expedition (3 rooms)')
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: EXPEDITION (single encounter MVP)
      // ─────────────────────────────────────────────────
      if (phase === 'expedition' && expedition) {
        var exp = expedition;
        var enemy = exp.enemy;
        var pendingCast = exp.pendingCast || null;
        var spellLevels = d.spellLevels || {};
        var roomsPlan = exp.roomsPlan || [];
        var roomIndex = exp.roomIndex || 0;
        var totalRooms = roomsPlan.length || ROOMS_PER_EXPEDITION;
        var isBossRoom = !!(enemy && enemy.boss);

        function mutateExp(patch) { updKey('expedition', Object.assign({}, exp, patch)); }
        function appendLog(entry) {
          var nl = (exp.log || []).concat([entry]);
          if (nl.length > 18) nl = nl.slice(-18);
          mutateExp({ log: nl });
        }

        var sectorMult = (exp.essenceMult != null) ? exp.essenceMult : 1.0;
        function scaledReward(baseReward) { return Math.max(1, Math.round(baseReward * sectorMult)); }

        function finishExpedition(victory) {
          var baseEarned = exp.essenceEarned || 0;
          var bonus = victory ? scaledReward(5) : 0; // completion bonus for last boss
          // First-clear bonus: clearing a sector for the first time gives +20 essence
          // and is logged in d.sectorsCleared so achievements can fire.
          var sectorsClearedNow = Object.assign({}, d.sectorsCleared || {});
          var bossesDefeatedNow = Object.assign({}, d.bossesDefeated || {});
          var firstClearBonus = 0;
          var firstClearSector = null;
          if (victory) {
            if (exp.sectorId && !sectorsClearedNow[exp.sectorId]) {
              sectorsClearedNow[exp.sectorId] = true;
              firstClearBonus = scaledReward(20);
              firstClearSector = exp.sectorName || exp.sectorId;
            }
            // Track boss defeated (final room boss)
            var lastRoom = (exp.roomsPlan || [])[(exp.roomsPlan || []).length - 1];
            if (lastRoom && lastRoom.boss && lastRoom.id) {
              bossesDefeatedNow[lastRoom.id] = true;
            }
          }
          var reward = baseEarned + bonus + firstClearBonus;
          announceSR(victory ? 'Expedition complete! +' + reward + ' essence earned.' : 'Expedition ended after ' + (exp.roomsCleared || 0) + ' rooms. +' + reward + ' essence earned.');
          var debriefPatch = {
            phase: 'debrief',
            expedition: Object.assign({}, exp, {
              result: victory ? 'victory' : 'defeat',
              reward: reward,
              firstClearBonus: firstClearBonus,
              firstClearSector: firstClearSector
            })
          };
          if (victory) {
            debriefPatch.sectorsCleared = sectorsClearedNow;
            debriefPatch.bossesDefeated = bossesDefeatedNow;
            debriefPatch.expeditionsCompleted = expeditionsDone + 1;
          }
          updSage(debriefPatch);
          if (victory) {
            sfxVictory();
            try { awardXP('alloBotSage', 15 + (exp.roomsCleared || 0) * 3); } catch(e) {}
            if (firstClearBonus > 0) {
              addToast('🏆 First clear of ' + firstClearSector + '! +' + firstClearBonus + ' bonus essence', 'success');
            }
          }
          updKey('essence', essence + reward);
        }

        // Advance to the next room after clearing the current one.
        // `clearReward` is the essence granted for clearing THIS room (0 by default).
        function advanceRoom(clearReward) {
          var clearedIdx = roomIndex;
          var reward = clearReward || 0;
          var nextIdx = clearedIdx + 1;
          if (nextIdx >= totalRooms) {
            return null;
          }
          var nextRoom = Object.assign({}, roomsPlan[nextIdx]);
          var healAmount = Math.round(exp.playerMaxHp * 0.2);
          var newPlayerHp = Math.min(exp.playerMaxHp, exp.playerHp + healAmount);
          var roomLabel = (nextIdx + 1) + ' of ' + totalRooms + (nextRoom.boss ? ' (BOSS)' : nextRoom.type === 'shrine' ? ' (Shrine)' : '');
          var nextLog = (exp.log || []).concat([
            { text: '\u2728 Room ' + (clearedIdx + 1) + ' cleared! +' + reward + ' essence. (+' + healAmount + ' HP restored)', kind: 'player' },
            { text: 'Room ' + roomLabel + ': ' + nextRoom.name + ' appears. ' + nextRoom.flavor, kind: (nextRoom.type === 'shrine' ? 'info' : 'info') }
          ]);
          if (nextLog.length > 18) nextLog = nextLog.slice(-18);
          mutateExp({
            roomIndex: nextIdx,
            roomsCleared: (exp.roomsCleared || 0) + 1,
            essenceEarned: (exp.essenceEarned || 0) + reward,
            enemy: nextRoom,
            playerHp: newPlayerHp,
            turn: 'player',
            pendingCast: null,
            log: nextLog
          });
          announceSR('Room cleared. Room ' + roomLabel + ' begins. ' + nextRoom.name + '.');
          return nextIdx;
        }

        // Shrine room: rest action (restore HP + small essence).
        function restAtShrine() {
          if (!enemy || enemy.type !== 'shrine') return;
          sfxUnlock();
          var healAmount = Math.round(exp.playerMaxHp * 0.35);
          var newPlayerHp = Math.min(exp.playerMaxHp, exp.playerHp + healAmount);
          var shrineEssence = scaledReward(3);
          var entry = { text: '\u26E9\uFE0F Rested at the shrine (+' + healAmount + ' HP, +' + shrineEssence + ' essence).', kind: 'player' };
          // Announce and advance.
          mutateExp({ playerHp: newPlayerHp, log: (exp.log || []).concat([entry]) });
          announceSR('Rested at shrine. Advancing.');
          // Use advanceRoom so shrine "clear" counts toward roomsCleared + gives essence.
          setTimeout(function() {
            if (roomIndex < totalRooms - 1) {
              advanceRoom(shrineEssence);
            } else {
              // Edge case (shouldn\u2019t happen \u2014 boss is always last): just finish.
              mutateExp({ essenceEarned: (exp.essenceEarned || 0) + shrineEssence, roomsCleared: (exp.roomsCleared || 0) + 1 });
              setTimeout(function() { finishExpedition(true); }, 80);
            }
          }, 600);
        }

        // Boss telegraph mechanic — bosses cycle through:
        //   NORMAL → NORMAL → WINDING (telegraph; no damage) → SPECIAL (1.6× dmg)
        // During the WINDING turn, a CRIT cast interrupts the special, reducing
        // it to 0.5× damage. This rewards fast accurate retrieval at the
        // dramatic moments and gives bosses tactical identity beyond bigger HP.
        function enemyTurn() {
          var isBoss = !!enemy.boss;
          var bossPhase = enemy.bossPhase || 'normal';
          var normalCount = enemy.normalCount || 0;
          var entry;
          var newHp = exp.playerHp;
          var newEnemy;

          // Each boss has a named special with its own flavor. Falls back to
          // generic "SPECIAL ATTACK" text if a boss doesn't define them.
          var specName = (enemy.specialName || 'SPECIAL ATTACK');
          var specFlavor = (enemy.specialFlavor || '');

          if (isBoss && bossPhase === 'winding') {
            // SPECIAL attack this turn — was the player able to interrupt?
            var multiplier = enemy.interrupted ? 0.5 : 1.6;
            var rawDmg = enemy.atk * multiplier;
            var specDmg = Math.max(1, Math.round(rawDmg - Math.floor(Math.random() * 3)));
            newHp = Math.max(0, exp.playerHp - specDmg);
            entry = enemy.interrupted
              ? { text: '🛡️ ' + enemy.name + '’s ' + specName + ' is staggered — only ' + specDmg + ' dmg lands.', kind: 'enemy' }
              : { text: '💥 ' + enemy.name + ' unleashes ' + specName + ' — ' + specDmg + ' dmg!' + (specFlavor ? ' (' + specFlavor + ')' : ''), kind: 'boss-special' };
            newEnemy = Object.assign({}, enemy, { bossPhase: 'normal', normalCount: 0, interrupted: false });
          } else if (isBoss && normalCount >= 2) {
            // Time to wind up — no damage this turn, telegraph the special.
            entry = { text: '⚠️ ' + enemy.name + ' begins to gather ' + specName + (specFlavor ? ' — ' + specFlavor : '') + '. CRIT next cast to interrupt!', kind: 'boss-telegraph' };
            newEnemy = Object.assign({}, enemy, { bossPhase: 'winding', interrupted: false });
          } else {
            // Normal attack — for both bosses (in normal phase) and regular enemies.
            var dmg = Math.max(1, enemy.atk - Math.floor(Math.random() * 4));
            newHp = Math.max(0, exp.playerHp - dmg);
            entry = { text: enemy.name + ' strikes for ' + dmg + ' damage.', kind: 'enemy' };
            newEnemy = isBoss
              ? Object.assign({}, enemy, { normalCount: normalCount + 1 })
              : enemy;
          }

          var nextLog = (exp.log || []).concat([entry]);
          if (nextLog.length > 18) nextLog = nextLog.slice(-18);
          if (newHp <= 0) {
            // Defeat path
            mutateExp({ playerHp: 0, log: nextLog, enemy: newEnemy });
            setTimeout(function() { finishExpedition(false); }, 600);
            return;
          }
          mutateExp({ playerHp: newHp, turn: 'player', log: nextLog, enemy: newEnemy });
          announceSR(entry.text + ' Your turn.');
        }

        // If we have a pendingCast, we're in the challenge overlay.
        function startCast(spellId) {
          var s = findSpell(spellId);
          if (!s) return;
          if (exp.turn !== 'player') return;
          // Merged bank: static + AI cache. AI questions appended to floor.
          // Pick weighted by SRS stats so recently-failed questions resurface.
          var bank = getMergedBank(s, aiChallengeCache);
          var challenge = pickWeighted(bank, d.questionStats || {});
          sfxCastReady();
          mutateExp({
            pendingCast: {
              spellId: spellId,
              challenge: challenge,
              startedAt: Date.now(),
              selectedIndex: null,
              resolved: false,
              aiSourced: !!challenge.aiGenerated
            }
          });
          announceSR('Casting ' + s.name + '. ' + challenge.prompt);
          // Lazy AI fetch: if no AI cache for this spell yet, fire a background
          // request. The questions arrive within a few seconds and are merged
          // for the next cast. THIS cast already used static bank.
          var existingAi = (aiChallengeCache[spellId] || []);
          if (existingAi.length === 0 && callGemini) {
            // Mark in-flight so we don't double-fire if startCast runs again.
            if (!d._aiInFlight || !d._aiInFlight[spellId]) {
              var inFlight = Object.assign({}, d._aiInFlight || {});
              inFlight[spellId] = true;
              updKey('_aiInFlight', inFlight);
              aiGenerateChallenges(s, callGemini, toolData).then(function(qs) {
                var freshD = (ctx.toolData && ctx.toolData.alloBotSage) || {};
                var freshCache = Object.assign({}, freshD.aiChallengeCache || {});
                var freshFlight = Object.assign({}, freshD._aiInFlight || {});
                delete freshFlight[spellId];
                if (qs.length > 0) {
                  freshCache[spellId] = qs;
                  ctx.updateMulti('alloBotSage', { aiChallengeCache: freshCache, _aiInFlight: freshFlight });
                } else {
                  ctx.updateMulti('alloBotSage', { _aiInFlight: freshFlight });
                }
              });
            }
          }
        }

        function resolveChallenge(selectedIndex) {
          if (!pendingCast || pendingCast.resolved) return;
          var s = findSpell(pendingCast.spellId);
          var challenge = pendingCast.challenge;
          var lvl = spellLevels[s.id] || 0;
          var leveledBase = getSpellDamage(s, lvl);
          var elapsed = (Date.now() - pendingCast.startedAt) / 1000;
          var correct = selectedIndex === challenge.correctIndex;
          // Crit window varies by difficulty (set at expedition start).
          // Default to 6s (standard) when older runs replay state without it.
          var critWindow = (exp.critWindowSec != null) ? exp.critWindowSec : 6;
          var fast = elapsed < critWindow;
          var dmg = 0;
          var result;
          if (correct && fast) {
            dmg = Math.round(leveledBase * s.critMultiplier);
            result = 'crit';
            sfxCastCrit();
          } else if (correct) {
            dmg = leveledBase;
            result = 'hit';
            sfxCastHit();
          } else {
            dmg = Math.floor(leveledBase / 3);
            result = 'backfire';
            sfxBackfire();
          }
          var newEnemyHp = Math.max(0, enemy.hp - dmg);
          var lvlTag = lvl > 0 ? ' [Lv' + lvl + ']' : '';
          var text;
          if (result === 'crit') text = '\u2B50 CRITICAL ' + s.name + lvlTag + ' \u2014 ' + dmg + ' dmg! (' + elapsed.toFixed(1) + 's)';
          else if (result === 'hit') text = s.name + lvlTag + ' strikes for ' + dmg + ' dmg.';
          else text = '\u26A1 ' + s.name + lvlTag + ' backfires. Enemy grazed for ' + dmg + '. (' + challenge.explain + ')';
          var nextLog = (exp.log || []).concat([{ text: text, kind: result === 'backfire' ? 'backfire' : 'player' }]);
          if (nextLog.length > 18) nextLog = nextLog.slice(-18);

          // Stats
          updKey('totalCasts', totalCasts + 1);
          if (result === 'crit') updKey('critCasts', critCasts + 1);
          // Per-spell mastery counter (drives the tier badge in the grimoire)
          var nextCounts = Object.assign({}, d.castCounts || {});
          nextCounts[s.id] = (nextCounts[s.id] || 0) + 1;
          updKey('castCounts', nextCounts);
          // ── Spaced repetition + confidence ledger ──
          // Record this question's result so future picks can weight it.
          // Also captures any confidence level the student set, which over
          // time lets us detect calibration patterns (overconfidence drives
          // the worst backfires; under-confidence often masks real knowing).
          var nextStats = Object.assign({}, d.questionStats || {});
          var prevStat = nextStats[challenge.prompt] || { attempts: 0, correctCount: 0 };
          nextStats[challenge.prompt] = {
            lastResult: result,
            lastSeen: Date.now(),
            attempts: (prevStat.attempts || 0) + 1,
            correctCount: (prevStat.correctCount || 0) + (correct ? 1 : 0),
            lastConfidence: pendingCast.confidence || null
          };
          updKey('questionStats', nextStats);

          // Boss-telegraph interrupt: a CRIT during the boss's WINDING phase
          // reduces the next special to 0.5×. Logged + announced for clarity.
          // Also bumps d.interruptCount for the achievement check.
          var willInterrupt = !!enemy.boss && enemy.bossPhase === 'winding' && result === 'crit';
          var nextEnemy = Object.assign({}, enemy, { hp: newEnemyHp });
          if (willInterrupt) {
            nextEnemy.interrupted = true;
            nextLog = nextLog.concat([{ text: '🛡️ ' + enemy.name + '’s special is interrupted by your critical strike!', kind: 'player' }]);
            if (nextLog.length > 18) nextLog = nextLog.slice(-18);
            updKey('interruptCount', (d.interruptCount || 0) + 1);
          }
          // ── Per-run cast log (fuels the enriched debrief screen) ──
          // Each entry records: spell id, result, confidence, prompt, was-boss.
          // Capped at 60 entries to keep state small even on long runs.
          var nextCastLog = (exp.castLog || []).concat([{
            spellId: s.id,
            result: result,
            confidence: pendingCast.confidence || null,
            prompt: challenge.prompt,
            wasBoss: !!enemy.boss
          }]);
          if (nextCastLog.length > 60) nextCastLog = nextCastLog.slice(-60);
          // Goal-tracking: mark this spell as used in the run's spells-used set.
          var nextGoalsSpells = Object.assign({}, exp.goalsSpellsUsed || {});
          nextGoalsSpells[s.id] = true;

          mutateExp({
            enemy: nextEnemy,
            pendingCast: Object.assign({}, pendingCast, { selectedIndex: selectedIndex, resolved: true, damage: dmg, result: result }),
            log: nextLog,
            castLog: nextCastLog,
            goalsSpellsUsed: nextGoalsSpells
          });
          announceSR(text + (willInterrupt ? ' Boss special interrupted!' : ''));

          setTimeout(function() {
            if (newEnemyHp <= 0) {
              var clearReward = scaledReward(PER_ROOM_ESSENCE[roomIndex] || 10);
              if (roomIndex < totalRooms - 1) {
                advanceRoom(clearReward);
              } else {
                // Final room cleared \u2192 expedition victory
                mutateExp({
                  pendingCast: null,
                  roomsCleared: (exp.roomsCleared || 0) + 1,
                  essenceEarned: (exp.essenceEarned || 0) + clearReward
                });
                setTimeout(function() { finishExpedition(true); }, 100);
              }
              return;
            }
            // Enemy turn
            mutateExp({ pendingCast: null, turn: 'enemy' });
            setTimeout(function() { enemyTurn(); }, 550);
          }, 1400);
        }

        // ── Render encounter ──
        var enemyPct = Math.round((enemy.hp / enemy.maxHp) * 100);
        var playerPct = Math.round((exp.playerHp / exp.playerMaxHp) * 100);

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 abs-fade' },
          // Top bar
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', {
              onClick: function() {
                if (confirm('Abandon this Expedition? Progress in this run will be lost.')) {
                  sfxClick();
                  updSage({ phase: 'hub', expedition: null });
                }
              },
              className: 'text-xs font-semibold text-slate-300 hover:text-slate-800 underline'
            }, 'Abandon'),
            h('div', { className: 'flex-1 text-center' },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-widest text-violet-600' },
                (exp.sectorName || 'Expedition')
                + (enemy && enemy.type === 'shrine' ? ' \u00b7 Shrine'
                    : isBossRoom ? ' \u00b7 Boss'
                    : '')
              ),
              h('div', { className: 'flex items-center justify-center gap-1 mt-0.5', 'aria-label': 'Room ' + (roomIndex + 1) + ' of ' + totalRooms },
                roomsPlan.map(function(_r, i) {
                  var cleared = i < (exp.roomsCleared || 0);
                  var current = i === roomIndex;
                  return h('span', {
                    key: 'room-' + i,
                    className: 'inline-block w-2.5 h-2.5 rounded-full ' + (cleared ? 'bg-emerald-500' : current ? 'bg-violet-500 abs-pulse' : 'bg-slate-300'),
                    'aria-hidden': 'true'
                  });
                }),
                h('span', { className: 'ml-2 text-[10px] text-slate-300' }, 'Room ' + (roomIndex + 1) + '/' + totalRooms)
              )
            ),
            h('div', { className: 'text-xs text-slate-300' }, 'Turn: ', h('span', { className: 'font-bold ' + (exp.turn === 'player' ? 'text-violet-600' : 'text-red-600') }, exp.turn === 'player' ? 'You' : enemy.name))
          ),

          // Battlefield (sector-tinted gradient + ambient particles per sector).
          // Particles are absolutely-positioned children behind the player/enemy
          // row so they don't interfere with interactions. Each sector gets its
          // own thematic ambient set: stars (nebula), drifting pages (archive),
          // spinning gears (clockwork), rising bubbles (deep tide).
          enemy.type !== 'shrine' && h('div', {
            className: 'rounded-2xl p-5 mb-3',
            style: { background: (sectorById(exp.sectorId).bgGradient || 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)'), color: 'white', position: 'relative', overflow: 'hidden', minHeight: '200px' }
          },
            // Ambient particle layer (deterministic seed per sector so positions are stable)
            h('div', {
              'aria-hidden': 'true',
              style: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }
            },
              (function() {
                var sectorId = exp.sectorId;
                var particles = [];
                var i;
                if (sectorId === 'crystal_nebula') {
                  // 18 small twinkling stars at pseudo-random positions
                  for (i = 0; i < 18; i++) {
                    var sLeft = ((i * 53) % 100);
                    var sTop = ((i * 37) % 100);
                    var sSize = 2 + (i % 3);
                    var sDelay = (i * 0.17) % 2.4;
                    particles.push(h('span', {
                      key: 'star-' + i,
                      className: 'abs-twinkle',
                      style: {
                        position: 'absolute',
                        left: sLeft + '%', top: sTop + '%',
                        width: sSize + 'px', height: sSize + 'px',
                        background: '#fff',
                        borderRadius: '50%',
                        boxShadow: '0 0 ' + (sSize * 2) + 'px rgba(255,255,255,0.6)',
                        animationDelay: sDelay + 's'
                      }
                    }));
                  }
                } else if (sectorId === 'whispering_archive') {
                  // 8 drifting glyphs / page fragments
                  var glyphs = ['📜', '✒', '✦', '𝔄', 'ℜ', '✧', '※', '𝔚'];
                  for (i = 0; i < 8; i++) {
                    particles.push(h('span', {
                      key: 'glyph-' + i,
                      className: 'abs-drift-rise',
                      style: {
                        position: 'absolute',
                        left: ((i * 13 + 7) % 90) + '%',
                        top: ((i * 27) % 80) + '%',
                        fontSize: (12 + (i % 3) * 4) + 'px',
                        animationDelay: ((i * 0.7) % 6) + 's',
                        animationDuration: (5 + (i % 4)) + 's',
                        color: 'rgba(254, 240, 138, 0.5)'
                      }
                    }, glyphs[i]));
                  }
                } else if (sectorId === 'ember_clockwork') {
                  // 6 slow-spinning gears
                  for (i = 0; i < 6; i++) {
                    particles.push(h('span', {
                      key: 'gear-' + i,
                      className: 'abs-slow-spin',
                      style: {
                        position: 'absolute',
                        left: ((i * 19 + 5) % 90) + '%',
                        top: ((i * 31) % 80) + '%',
                        fontSize: (16 + (i % 3) * 6) + 'px',
                        animationDuration: (5 + (i % 4) * 2) + 's',
                        animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
                        opacity: 0.18
                      }
                    }, '⚙'));
                  }
                } else if (sectorId === 'deep_tide') {
                  // 14 rising bubbles
                  for (i = 0; i < 14; i++) {
                    var bSize = 4 + (i % 4) * 2;
                    particles.push(h('span', {
                      key: 'bubble-' + i,
                      className: 'abs-bubble',
                      style: {
                        position: 'absolute',
                        left: ((i * 11 + 3) % 95) + '%',
                        bottom: '0%',
                        width: bSize + 'px', height: bSize + 'px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(125,211,252,0.3))',
                        animationDelay: ((i * 0.43) % 5) + 's',
                        animationDuration: (4 + (i % 3)) + 's'
                      }
                    }));
                  }
                } else if (sectorId === 'aurora_atelier') {
                  // 10 drifting brushstrokes / music notes in alternating pink+violet
                  var brushIcons = ['🖌', '♪', '🎨', '♫', '✦', '♩', '🎶', '✧', '🎼', '♬'];
                  var brushColors = ['rgba(244,114,182,0.55)', 'rgba(167,139,250,0.55)', 'rgba(253,224,71,0.5)'];
                  for (i = 0; i < 10; i++) {
                    particles.push(h('span', {
                      key: 'brush-' + i,
                      className: 'abs-drift-rise',
                      style: {
                        position: 'absolute',
                        left: ((i * 17 + 5) % 92) + '%',
                        top: ((i * 23) % 70) + '%',
                        fontSize: (14 + (i % 3) * 5) + 'px',
                        animationDelay: ((i * 0.6) % 5.5) + 's',
                        animationDuration: (4.5 + (i % 4)) + 's',
                        color: brushColors[i % brushColors.length]
                      }
                    }, brushIcons[i]));
                  }
                }
                return particles;
              })()
            ),
            h('div', { className: 'flex items-center justify-between gap-4', style: { position: 'relative', zIndex: 1 } },
              // Player
              h('div', { className: 'text-center flex-1' },
                allobotAvatar(exp.playerHp < exp.playerMaxHp * 0.3 ? 'hurt' : 'happy'),
                h('div', { className: 'text-xs font-bold mt-1' }, 'AlloBot'),
                h('div', { className: 'w-full h-2 bg-white/20 rounded-full mt-1 overflow-hidden' },
                  h('div', {
                    className: 'h-full transition-all',
                    style: { width: playerPct + '%', background: playerPct > 50 ? '#34d399' : playerPct > 25 ? '#fbbf24' : '#ef4444' }
                  })
                ),
                h('div', { className: 'text-[10px] mt-0.5 text-violet-200' }, exp.playerHp + ' / ' + exp.playerMaxHp + ' HP')
              ),
              h('div', { className: 'text-3xl text-violet-300 abs-pulse', 'aria-hidden': 'true' }, 'VS'),
              // Enemy
              h('div', { className: 'text-center flex-1' },
                h('div', { className: 'text-6xl abs-float', style: { filter: enemy.hp < enemy.maxHp * 0.3 ? 'hue-rotate(-30deg)' : '' } }, enemy.icon),
                h('div', { className: 'text-xs font-bold mt-1' }, enemy.name),
                h('div', { className: 'w-full h-2 bg-white/20 rounded-full mt-1 overflow-hidden' },
                  h('div', {
                    className: 'h-full transition-all',
                    style: { width: enemyPct + '%', background: '#ef4444' }
                  })
                ),
                h('div', { className: 'text-[10px] mt-0.5 text-violet-200' }, enemy.hp + ' / ' + enemy.maxHp + ' HP')
              )
            ),
            h('p', { className: 'text-[11px] text-center text-violet-200 mt-3 italic' }, enemy.flavor)
          ),

          // Boss telegraph warning \u2014 visible when boss is winding up a special.
          // Shows the boss's NAMED special (e.g., "Cold Reflection") with flavor
          // so each boss feels distinct, not just bigger HP.
          enemy.type !== 'shrine' && enemy.boss && enemy.bossPhase === 'winding' && !enemy.interrupted && h('div', {
            role: 'alert',
            className: 'rounded-xl p-3 mb-3 abs-pulse',
            style: { background: 'linear-gradient(90deg, #7f1d1d 0%, #ef4444 100%)', color: 'white' }
          },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-3xl' }, '\u26a0\ufe0f'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm' },
                  enemy.name + ' is winding up: ',
                  h('span', { className: 'italic' }, enemy.specialName || 'SPECIAL ATTACK')
                ),
                enemy.specialFlavor && h('div', { className: 'text-[11px] text-red-200 mt-0.5 italic' }, '\u201c' + enemy.specialFlavor + '\u201d'),
                h('div', { className: 'text-[11px] text-red-100 mt-0.5' }, 'Land a CRITICAL cast (correct + under 6 seconds) to interrupt and reduce the damage.')
              )
            )
          ),
          // Boss interrupt confirmation \u2014 shown after a successful interrupt.
          enemy.type !== 'shrine' && enemy.boss && enemy.bossPhase === 'winding' && enemy.interrupted && h('div', {
            role: 'status',
            className: 'rounded-xl p-3 mb-3',
            style: { background: 'linear-gradient(90deg, #064e3b 0%, #10b981 100%)', color: 'white' }
          },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-3xl' }, '\ud83d\udee1\ufe0f'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm' }, 'INTERRUPT LANDED'),
                h('div', { className: 'text-[11px] text-emerald-100 mt-0.5' }, enemy.name + '\u2019s special will deal reduced damage when it resolves.')
              )
            )
          ),

          // Shrine room (peaceful \u2014 rest + small essence)
          enemy.type === 'shrine' && h('div', { className: 'rounded-2xl p-6 mb-3 text-center', style: { background: 'linear-gradient(135deg, #064e3b 0%, #14b8a6 100%)', color: 'white' } },
            h('div', { className: 'flex items-center justify-center gap-6 mb-3' },
              allobotAvatar(exp.playerHp < exp.playerMaxHp * 0.5 ? 'idle' : 'happy'),
              h('div', { className: 'text-7xl abs-float', 'aria-hidden': 'true' }, enemy.icon)
            ),
            h('h3', { className: 'text-lg font-bold' }, enemy.name),
            h('p', { className: 'text-sm text-emerald-100 italic mt-1 mb-4' }, enemy.flavor),
            h('div', { className: 'flex flex-wrap gap-2 justify-center mb-4' },
              h('div', { className: 'px-3 py-1.5 rounded-lg bg-white/15 text-xs' }, '+' + Math.round(exp.playerMaxHp * 0.35) + ' HP'),
              h('div', { className: 'px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-100 text-xs font-bold' }, '+' + scaledReward(3) + ' \u2B50 Essence')
            ),
            h('button', {
              onClick: function() { restAtShrine(); },
              className: 'px-6 py-2.5 rounded-xl font-bold text-emerald-800 bg-white hover:bg-emerald-50 focus:ring-2 focus:ring-white focus:outline-none shadow-lg'
            }, '\u26E9\uFE0F Rest at the shrine')
          ),

          // Spell bar (combat rooms only, player turn, no active cast)
          enemy.type !== 'shrine' && exp.turn === 'player' && !pendingCast && h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2 mb-3' },
            equippedLoadout.map(function(id) {
              var s = findSpell(id);
              if (!s) return null;
              var lvl = spellLevels[s.id] || 0;
              var leveledDmg = getSpellDamage(s, lvl);
              return h('button', {
                key: id,
                onClick: function() { startCast(id); },
                className: 'p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-violet-500 hover:bg-violet-50 focus:ring-2 focus:ring-violet-400 focus:outline-none transition text-left',
                style: { borderLeft: '4px solid ' + s.color },
                'aria-label': 'Cast ' + s.name + ' (Level ' + lvl + ') \u2014 ' + leveledDmg + ' base damage'
              },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-xl' }, s.icon),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('div', { className: 'font-bold text-sm flex items-center gap-1', style: { color: s.color } },
                      s.name,
                      lvl > 0 && h('span', { className: 'text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold' }, 'Lv' + lvl)
                    ),
                    h('div', { className: 'text-[10px] text-slate-300' }, leveledDmg + ' dmg \u00b7 ' + s.sourceLabel)
                  )
                )
              );
            })
          ),

          // Cast challenge overlay
          pendingCast && (function() {
            var s = findSpell(pendingCast.spellId);
            var c = pendingCast.challenge;
            var resolved = pendingCast.resolved;
            var confidence = pendingCast.confidence || null;
            // Confidence-calibration metacognitive notes shown after resolve.
            // Teaches students to compare feeling-of-knowing vs outcome.
            function calibrationNote(conf, result) {
              if (!conf) return null;
              var wasCorrect = result === 'hit' || result === 'crit';
              if (conf === 'high' && wasCorrect)  return { tone: 'good',    text: '🎯 Calibrated: you said you knew it — and you did.' };
              if (conf === 'high' && !wasCorrect) return { tone: 'caution', text: '⚠ Overconfident: felt sure but missed. Worth a second look in Study Hall.' };
              if (conf === 'low'  && wasCorrect)  return { tone: 'good',    text: '🎁 Lucky guess — but maybe you knew more than you thought!' };
              if (conf === 'low'  && !wasCorrect) return { tone: 'neutral', text: '🎯 Self-aware: you flagged the doubt, and the doubt was right. Add to Review.' };
              if (conf === 'med'  && wasCorrect)  return { tone: 'good',    text: '✓ Pretty sure paid off.' };
              if (conf === 'med'  && !wasCorrect) return { tone: 'neutral', text: 'Worth reviewing this one.' };
              return null;
            }
            var calNote = resolved ? calibrationNote(confidence, pendingCast.result) : null;
            return h('div', {
              className: 'rounded-2xl p-4 mb-3 border-2 abs-fade',
              style: {
                borderColor: s.color,
                background: 'linear-gradient(135deg, #fff 0%, ' + s.color + '15 100%)'
              }
            },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-2xl abs-spin', 'aria-hidden': 'true' }, s.icon),
                h('div', null,
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-widest', style: { color: s.color } }, 'Casting'),
                  h('div', { className: 'text-base font-bold', style: { color: s.color } }, s.name)
                ),
                h('div', { className: 'ml-auto text-[10px] text-slate-300' }, 'Faster + correct = critical!')
              ),
              h('p', { className: 'text-sm font-semibold text-slate-800 mb-3', role: 'group', 'aria-label': 'Challenge prompt' }, c.prompt),
              // ── Confidence calibration (optional, metacognitive) ──
              // Three quick buttons. Picking one is optional — answer is always
              // clickable. If a level is set, the post-resolve note compares
              // their feeling-of-knowing to the actual result. Builds calibration.
              !resolved && h('div', { className: 'mb-3' },
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1' }, '🧠 Confidence check (optional)'),
                h('div', { className: 'grid grid-cols-3 gap-1.5' },
                  [
                    { level: 'low',  icon: '🤷', label: 'Guessing',    color: '#94a3b8' },
                    { level: 'med',  icon: '🤔', label: 'Pretty sure', color: '#3b82f6' },
                    { level: 'high', icon: '🔥', label: 'Know it',     color: '#16a34a' }
                  ].map(function(opt) {
                    var picked = confidence === opt.level;
                    return h('button', {
                      key: 'conf-' + opt.level,
                      onClick: function() {
                        sfxClick();
                        mutateExp({ pendingCast: Object.assign({}, pendingCast, { confidence: opt.level }) });
                      },
                      className: 'text-[11px] py-1.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (picked ? 'font-bold' : 'font-normal hover:bg-slate-50'),
                      style: picked ? { borderColor: opt.color, background: opt.color + '14', color: opt.color } : { borderColor: '#e2e8f0', color: '#64748b' },
                      'aria-label': opt.label + (picked ? ' (selected)' : ''),
                      'aria-pressed': picked
                    },
                      h('span', { className: 'mr-1' }, opt.icon),
                      opt.label
                    );
                  })
                )
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                c.options.map(function(opt, i) {
                  var isSelected = resolved && pendingCast.selectedIndex === i;
                  var isCorrect = resolved && i === c.correctIndex;
                  return h('button', {
                    key: i,
                    disabled: resolved,
                    onClick: function() { if (!resolved) resolveChallenge(i); },
                    className: 'text-left px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 '
                      + (resolved
                        ? (isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                          : (isSelected ? 'border-red-400 bg-red-50 text-red-900' : 'border-slate-200 bg-slate-50 text-slate-400'))
                        : 'border-slate-300 bg-white hover:border-violet-500 hover:bg-violet-50')
                  },
                    h('span', { className: 'inline-block w-6 h-6 mr-2 rounded-full text-[11px] font-bold text-center leading-6 ' + (resolved && isCorrect ? 'bg-emerald-500 text-white' : resolved && isSelected ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600') }, String.fromCharCode(65 + i)),
                    opt
                  );
                })
              ),
              resolved && h('div', { className: 'mt-3 p-2 rounded-lg bg-slate-50 text-[11px] text-slate-700' },
                h('strong', null, pendingCast.result === 'crit' ? 'Critical hit!' : pendingCast.result === 'hit' ? 'Hit.' : 'Backfire.'),
                ' ', c.explain
              ),
              // Calibration metacognitive feedback — only if student set a confidence
              calNote && h('div', {
                className: 'mt-2 p-2 rounded-lg text-[11px] font-medium',
                style: {
                  background: calNote.tone === 'good' ? '#ecfdf5' : calNote.tone === 'caution' ? '#fef3c7' : '#f1f5f9',
                  color: calNote.tone === 'good' ? '#065f46' : calNote.tone === 'caution' ? '#92400e' : '#334155',
                  border: '1px solid ' + (calNote.tone === 'good' ? '#a7f3d0' : calNote.tone === 'caution' ? '#fcd34d' : '#cbd5e1')
                }
              }, calNote.text)
            );
          })(),

          // Log
          h('div', { className: 'rounded-xl bg-slate-50 border border-slate-400 p-3 max-h-40 overflow-y-auto' },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-1' }, 'Log'),
            (exp.log || []).slice().reverse().slice(0, 8).map(function(entry, i) {
              var color = entry.kind === 'player' ? 'text-violet-700'
                        : entry.kind === 'enemy'  ? 'text-red-700'
                        : entry.kind === 'backfire' ? 'text-amber-700'
                        : 'text-slate-600';
              return h('div', { key: i, className: 'text-xs leading-snug ' + color }, entry.text);
            })
          )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: DEBRIEF
      // ─────────────────────────────────────────────────
      if (phase === 'debrief' && expedition) {
        var result = expedition.result || 'victory';
        var reward = expedition.reward || 0;
        var roomsCleared = expedition.roomsCleared || 0;
        var totalRoomsD = (expedition.roomsPlan || []).length || ROOMS_PER_EXPEDITION;
        // ── Per-run pedagogy: analyze this expedition's castLog ──
        // Build per-spell breakdown + confidence calibration summary +
        // identify the weakest spell (lowest correct rate). These power the
        // enriched debrief and the smart next-step CTAs.
        var runCastLog = expedition.castLog || [];
        var runBySpell = {};
        var runTotals = { crits: 0, hits: 0, backfires: 0, total: 0 };
        var runConfidence = { high: { right: 0, wrong: 0 }, med: { right: 0, wrong: 0 }, low: { right: 0, wrong: 0 } };
        runCastLog.forEach(function(c) {
          if (!runBySpell[c.spellId]) runBySpell[c.spellId] = { crits: 0, hits: 0, backfires: 0, total: 0 };
          runBySpell[c.spellId].total++;
          if (c.result === 'crit') { runBySpell[c.spellId].crits++; runTotals.crits++; }
          else if (c.result === 'hit') { runBySpell[c.spellId].hits++; runTotals.hits++; }
          else { runBySpell[c.spellId].backfires++; runTotals.backfires++; }
          runTotals.total++;
          if (c.confidence) {
            var wasRight = c.result === 'crit' || c.result === 'hit';
            runConfidence[c.confidence][wasRight ? 'right' : 'wrong']++;
          }
        });
        // Weakest spell in this run = lowest correct rate, must have ≥2 attempts
        var weakestSpell = null;
        var weakestRate = 1.0;
        Object.keys(runBySpell).forEach(function(spellId) {
          var st = runBySpell[spellId];
          if (st.total < 2) return;
          var rate = (st.crits + st.hits) / st.total;
          if (rate < weakestRate) { weakestRate = rate; weakestSpell = spellId; }
        });
        // Tough-questions global count (drives the Review CTA)
        var globalToughCount = 0;
        var statsForToughCount = d.questionStats || {};
        Object.keys(statsForToughCount).forEach(function(k) {
          if (statsForToughCount[k].lastResult === 'backfire') globalToughCount++;
        });
        var totalCalibrated = Object.keys(runConfidence).reduce(function(t, lvl) { return t + runConfidence[lvl].right + runConfidence[lvl].wrong; }, 0);
        return h('div', { className: 'max-w-2xl mx-auto p-4 md:p-6 text-center abs-fade' },
          // \u2500\u2500 Phase A: victory celebration \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
          // On result='victory', show a backflipping AlloBot with wand-tier
          // glow + a confetti burst overlay. The mood='victory' string makes
          // allobotAvatar swap its wrapper class to .abs-backflip (one full
          // rotation, ~1.4s). Pieces are positioned absolutely inside the
          // wrapper so they fountain outward from the avatar's center.
          result === 'victory' && h('div', {
            style: { position: 'relative', display: 'inline-block', marginBottom: 8 }
          },
            allobotAvatar('victory', {
              wandTier: unlockedSpells.length >= 10 ? 3 : unlockedSpells.length >= 4 ? 2 : unlockedSpells.length >= 1 ? 1 : 0,
              robeTier: unlockedSpells.length >= 15 ? 2 : unlockedSpells.length >= 5 ? 1 : 0
            }),
            h(VictoryConfettiBurst, null)
          ),
          h('div', {
            className: 'rounded-2xl p-6 mb-4',
            style: {
              background: result === 'victory'
                ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)'
                : 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
              color: 'white'
            }
          },
            h('div', { className: 'text-6xl mb-2 abs-pulse' }, result === 'victory' ? '\u2728' : '\uD83D\uDCA5'),
            h('h2', { className: 'text-2xl font-bold mb-1' }, result === 'victory' ? 'Expedition Complete' : 'Valiant Effort'),
            h('p', { className: 'text-sm opacity-90 mb-2' },
              result === 'victory'
                ? 'You cleared all ' + totalRoomsD + ' rooms of the ' + (expedition.sectorName || 'sector') + '. AlloBot returns with new understanding.'
                : 'Cleared ' + roomsCleared + '/' + totalRoomsD + ' rooms. The Spellforge heals AlloBot. Your runes remain \u2014 try again when ready.'
            ),
            h('div', { className: 'inline-flex gap-1 mb-3 justify-center', 'aria-hidden': 'true' },
              Array.from({ length: totalRoomsD }).map(function(_r, i) {
                var cleared = i < roomsCleared;
                return h('span', {
                  key: 'debrief-room-' + i,
                  className: 'inline-block w-3 h-3 rounded-full ' + (cleared ? 'bg-white' : 'bg-white/30')
                });
              })
            ),
            h('div', { className: 'mt-1 inline-block px-4 py-2 rounded-xl bg-white/20 font-bold text-lg' }, '+' + reward + ' \u2B50 Essence')
          ),
          // \u2500\u2500 Goal evaluation (Locke & Latham closure) \u2500\u2500
          // For each goal the student picked at the start, check whether they
          // hit it. Specific goals + outcome feedback = the closing loop of
          // goal-setting theory. Renders only if any goals were active.
          (expedition.goals && expedition.goals.length > 0) && (function() {
            var goals = expedition.goals;
            var critsThisRun = (d.critCasts || 0) - (expedition.goalsStartCrits || 0);
            var interruptsThisRun = (d.interruptCount || 0) - (expedition.goalsStartInterrupts || 0);
            var spellsUsed = Object.keys(expedition.goalsSpellsUsed || {}).length;
            var GOAL_DEFS = {
              crit_5:        { icon: '\u2728', label: 'Land 5 critical casts',     check: function() { return critsThisRun >= 5; },        progress: critsThisRun + '/5 crits' },
              spell_variety: { icon: '\ud83c\udf08', label: 'Use all 3 equipped spells', check: function() { return spellsUsed >= 3; },          progress: spellsUsed + ' spell' + (spellsUsed !== 1 ? 's' : '') + ' used' },
              no_death:      { icon: '\ud83d\udee1\ufe0f', label: 'Finish without dying',     check: function() { return result === 'victory'; },     progress: result === 'victory' ? 'Survived \u2713' : 'Fell' },
              interrupt:     { icon: '\u26a1', label: 'Interrupt a boss SPECIAL',  check: function() { return interruptsThisRun >= 1; },   progress: interruptsThisRun + ' interrupt' + (interruptsThisRun !== 1 ? 's' : '') }
            };
            var metCount = goals.filter(function(gid) { return GOAL_DEFS[gid] && GOAL_DEFS[gid].check(); }).length;
            var allMet = metCount === goals.length;
            return h('section', {
              className: 'rounded-xl border-2 p-3 mb-4 text-left',
              style: { borderColor: allMet ? '#16a34a' : '#94a3b8', background: allMet ? '#ecfdf5' : '#f8fafc' },
              'aria-label': 'Goal progress: ' + metCount + ' of ' + goals.length + ' met'
            },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider', style: { color: allMet ? '#065f46' : '#475569' } },
                  '\ud83c\udfaf Goal Progress: ' + metCount + ' / ' + goals.length + ' met'
                ),
                allMet && h('span', { className: 'text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300' }, '\u2728 All goals met!')
              ),
              h('div', { className: 'space-y-1' },
                goals.map(function(gid) {
                  var def = GOAL_DEFS[gid];
                  if (!def) return null;
                  var met = def.check();
                  return h('div', {
                    key: 'goal-result-' + gid,
                    className: 'flex items-center gap-2 p-1.5 rounded-md text-[11px] ' + (met ? 'bg-emerald-100 text-emerald-900' : 'bg-white border border-slate-200 text-slate-600')
                  },
                    h('span', { className: 'text-base' }, met ? '\u2705' : '\u25cb'),
                    h('span', { className: 'flex-1 font-semibold' }, def.icon + ' ' + def.label),
                    h('span', { className: 'text-[10px] ' + (met ? 'text-emerald-700' : 'text-slate-400') }, def.progress)
                  );
                })
              )
            );
          })(),

          // \u2500\u2500 This Run's Breakdown \u2500\u2500
          // Per-spell performance for THIS expedition. The textual reflection
          // moment students will actually use, not a cumulative dashboard.
          runCastLog.length > 0 && h('section', { className: 'rounded-xl border-2 border-slate-200 bg-slate-50 p-3 mb-4 text-left', 'aria-label': 'This run\'s breakdown' },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2 text-center' }, '\uD83D\uDD0D This Run \u2014 Per-Spell Breakdown'),
            h('div', { className: 'flex flex-col gap-1.5' },
              Object.keys(runBySpell).map(function(spellId) {
                var sp = findSpell(spellId);
                if (!sp) return null;
                var st = runBySpell[spellId];
                var rate = st.total > 0 ? Math.round(((st.crits + st.hits) / st.total) * 100) : 0;
                var rateColor = rate >= 80 ? '#16a34a' : rate >= 50 ? '#f59e0b' : '#dc2626';
                return h('div', {
                  key: 'breakdown-' + spellId,
                  className: 'flex items-center gap-2 p-2 rounded-lg bg-white border',
                  style: { borderColor: sp.color + '40' }
                },
                  h('span', { className: 'text-lg' }, sp.icon),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('div', { className: 'font-bold text-xs', style: { color: sp.color } }, sp.name),
                    h('div', { className: 'text-[10px] text-slate-500' }, st.total + ' cast' + (st.total > 1 ? 's' : '') + ' \u00B7 ' + st.crits + ' crit \u00B7 ' + st.hits + ' hit \u00B7 ' + st.backfires + ' backfire' + (st.backfires !== 1 ? 's' : ''))
                  ),
                  h('div', { className: 'text-right' },
                    h('div', { className: 'font-bold text-sm', style: { color: rateColor } }, rate + '%'),
                    h('div', { className: 'text-[9px] text-slate-400 uppercase tracking-wide' }, 'correct')
                  )
                );
              })
            ),
            // \u2500\u2500 Confidence calibration summary (if any confidence was set) \u2500\u2500
            totalCalibrated > 0 && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2' }, '\uD83E\uDDE0 Confidence Calibration'),
              h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                [
                  { level: 'high', icon: '\uD83D\uDD25', label: 'Knew it' },
                  { level: 'med',  icon: '\uD83E\uDD14', label: 'Pretty sure' },
                  { level: 'low',  icon: '\uD83E\uDD37', label: 'Guessing' }
                ].map(function(opt) {
                  var rc = runConfidence[opt.level];
                  var tot = rc.right + rc.wrong;
                  if (tot === 0) return h('div', { key: 'cal-' + opt.level, className: 'p-2 rounded-lg bg-slate-50 text-[10px] text-slate-400' },
                    h('div', null, opt.icon, ' ' + opt.label),
                    h('div', { className: 'text-[9px] mt-0.5' }, '\u2014')
                  );
                  var pct = Math.round(rc.right / tot * 100);
                  // Calibration interpretation:
                  // High + low accuracy = overconfident
                  // Low + high accuracy = under-confident (knew more than they thought)
                  var note = '';
                  if (opt.level === 'high' && pct < 70) note = 'overconfident';
                  else if (opt.level === 'low' && pct > 60) note = 'you knew more than you thought';
                  else if (opt.level === 'high' && pct >= 80) note = 'well-calibrated';
                  return h('div', {
                    key: 'cal-' + opt.level,
                    className: 'p-2 rounded-lg bg-white border border-slate-200 text-[10px]'
                  },
                    h('div', { className: 'font-bold' }, opt.icon, ' ' + opt.label),
                    h('div', { className: 'font-bold mt-0.5', style: { color: pct >= 70 ? '#16a34a' : '#f59e0b' } }, rc.right + '/' + tot, ' (' + pct + '%)'),
                    note && h('div', { className: 'text-[9px] italic mt-0.5 text-slate-500' }, note)
                  );
                })
              )
            )
          ),
          // \u2500\u2500 Smart next-step CTAs \u2500\u2500
          // Contextual recommendations driven by the run's actual outcome.
          // Goal: move the student to whichever activity will help them most.
          h('div', { className: 'flex flex-col gap-2 mb-4', 'aria-label': 'Recommended next steps' },
            // Backfire-driven CTA: review tough questions
            globalToughCount > 0 && h('button', {
              onClick: function() { sfxClick(); updSage({ phase: 'review_mistakes', reviewIdx: 0, reviewRevealed: false, expedition: null }); },
              className: 'p-3 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-left flex items-center gap-3 focus:ring-2 focus:ring-red-400 focus:outline-none'
            },
              h('div', { className: 'text-2xl' }, '\uD83C\uDFAF'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm text-red-900' }, 'Review ' + globalToughCount + ' tough question' + (globalToughCount > 1 ? 's' : '')),
                h('div', { className: 'text-[10px] text-red-700' }, 'Re-study what you got wrong. Mark "Got it now" once you understand.')
              ),
              h('div', { className: 'text-red-600 font-bold' }, '\u2192')
            ),
            // Weakest-spell CTA: drill it in Study Hall
            weakestSpell && weakestRate < 0.7 && (function() {
              var ws = findSpell(weakestSpell);
              if (!ws) return null;
              return h('button', {
                onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: weakestSpell, practiceQuestion: null, practiceSession: { correct: 0, attempted: 0 }, expedition: null }); },
                className: 'p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-left flex items-center gap-3 focus:ring-2 focus:ring-emerald-400 focus:outline-none'
              },
                h('div', { className: 'text-2xl' }, ws.icon),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-emerald-900' }, 'Drill ' + ws.name + ' in Study Hall'),
                  h('div', { className: 'text-[10px] text-emerald-700' }, 'Untimed practice \u2014 your weakest spell this run (' + Math.round(weakestRate * 100) + '% correct). Build it up with no pressure.')
                ),
                h('div', { className: 'text-emerald-600 font-bold' }, '\u2192')
              );
            })(),
            // Calibration-driven CTA \u2014 if a student was confident + wrong, suggest review
            runConfidence.high.wrong >= 2 && h('div', {
              className: 'p-3 rounded-xl border-2 border-amber-300 bg-amber-50 text-left flex items-center gap-3'
            },
              h('div', { className: 'text-2xl' }, '\u26A0\uFE0F'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm text-amber-900' }, 'Overconfidence detected'),
                h('div', { className: 'text-[10px] text-amber-700' }, 'You felt sure on ' + runConfidence.high.wrong + ' questions you got wrong. Those are the ones to review first \u2014 feeling-of-knowing fooled you.')
              )
            )
          ),
          h('div', { className: 'grid grid-cols-3 gap-2 mb-4 text-sm' },
            h('div', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-400' },
              h('div', { className: 'text-[10px] font-bold text-slate-300 uppercase' }, 'Total Casts'),
              h('div', { className: 'text-xl font-bold text-violet-600' }, totalCasts)
            ),
            h('div', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-400' },
              h('div', { className: 'text-[10px] font-bold text-slate-300 uppercase' }, 'Critical Casts'),
              h('div', { className: 'text-xl font-bold text-amber-600' }, critCasts)
            ),
            h('div', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-400' },
              h('div', { className: 'text-[10px] font-bold text-slate-300 uppercase' }, 'Rooms Cleared'),
              h('div', { className: 'text-xl font-bold text-emerald-600' }, roomsCleared + '/' + totalRoomsD)
            )
          ),
          // ── Reflection prompt (elaborative encoding) ──
          // Optional free-text. Pedagogical research: writing in your own words
          // what you learned strengthens memory consolidation more than passive
          // re-reading. Capped at 200 chars to keep it bite-sized; stored in
          // d.reflections[] for the Reflection Journal in the dashboard.
          h('section', {
            className: 'rounded-xl border-2 border-sky-200 bg-sky-50 p-3 mb-4 text-left',
            'aria-label': 'Reflection prompt'
          },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-1' }, '📝 Optional — Reflection'),
            h('p', { className: 'text-[11px] text-sky-900 mb-2' },
              'What is ONE thing you learned or noticed this run? (Writing it strengthens memory more than just thinking it.)'
            ),
            h('textarea', {
              key: 'reflection-input',
              defaultValue: '',
              id: 'abs-reflection-textarea',
              maxLength: 200,
              rows: 2,
              placeholder: 'e.g., "The bee/flower question keeps tripping me up — mutualism = both benefit"',
              className: 'w-full p-2 rounded-md border border-sky-300 bg-white text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400'
            }),
            h('div', { className: 'flex justify-end mt-2' },
              h('button', {
                onClick: function() {
                  var ta = document.getElementById('abs-reflection-textarea');
                  if (!ta) return;
                  var text = (ta.value || '').trim();
                  if (text.length === 0) {
                    addToast('Type a quick reflection first (even one sentence helps)', 'info');
                    return;
                  }
                  sfxClick();
                  var nextReflections = (d.reflections || []).concat([{
                    text: text,
                    sectorName: expedition.sectorName || null,
                    difficulty: expedition.difficulty || 'standard',
                    result: result,
                    at: Date.now()
                  }]);
                  // Cap at 30 most recent
                  if (nextReflections.length > 30) nextReflections = nextReflections.slice(-30);
                  updKey('reflections', nextReflections);
                  ta.value = '';
                  addToast('📝 Reflection saved — view it any time in Your Progress', 'success');
                  announceSR('Reflection saved.');
                },
                className: 'px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-sky-600 hover:bg-sky-700 focus:ring-2 focus:ring-sky-400 focus:outline-none'
              }, 'Save reflection')
            )
          ),
          h('div', { className: 'flex flex-wrap gap-2 justify-center' },
            h('button', {
              onClick: function() { sfxClick(); updSage({ phase: 'hub', expedition: null }); },
              className: 'px-5 py-2.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 focus:ring-2 focus:ring-violet-400 focus:outline-none'
            }, 'Return to Spellforge'),
            h('button', {
              onClick: function() { sfxClick(); updSage({ phase: 'shop', expedition: null }); },
              className: 'px-5 py-2.5 rounded-xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 focus:ring-2 focus:ring-amber-400 focus:outline-none'
            }, '\u2B50 Visit Spell Shop'),
            h('button', {
              onClick: function() { sfxClick(); updSage({ phase: 'loadout', expedition: null }); },
              className: 'px-5 py-2.5 rounded-xl font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 focus:ring-2 focus:ring-violet-400 focus:outline-none'
            }, 'Another Expedition')
          )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: SHOP (spend essence to upgrade spells)
      // ─────────────────────────────────────────────────
      if (phase === 'shop') {
        var spellLvls = d.spellLevels || {};
        var unlockedSpells2 = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });

        function upgrade(spellId) {
          var s = findSpell(spellId);
          if (!s) return;
          var lvl = spellLvls[spellId] || 0;
          if (lvl >= SPELL_LEVEL_CAP) { addToast(s.name + ' is already at max level', 'info'); return; }
          var cost = upgradeCost(lvl);
          if (essence < cost) { addToast('Need ' + cost + ' essence (you have ' + essence + ')', 'error'); return; }
          sfxUnlock();
          var newLvls = Object.assign({}, spellLvls);
          newLvls[spellId] = lvl + 1;
          updSage({ spellLevels: newLvls, essence: essence - cost });
          addToast('\u2728 ' + s.name + ' \u2192 Lv' + (lvl + 1), 'success');
          announceSR(s.name + ' upgraded to level ' + (lvl + 1) + '.');
        }

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 abs-fade' },
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(function() { sfxClick(); updKey('phase', 'hub'); }, 'Back to Spellforge'),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[10px] text-slate-300 font-semibold uppercase tracking-wider' }, 'Spell Shop')
          ),
          h('div', { className: 'rounded-2xl p-4 mb-4', style: { background: 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)', color: 'white' } },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-4xl abs-float' }, '\uD83D\uDD2E'),
              h('div', { className: 'flex-1' },
                h('h1', { className: 'text-xl font-bold' }, 'Etching Workshop'),
                h('p', { className: 'text-sm text-amber-100 mt-1' }, 'Spend essence to deepen the runes of each spell. Higher levels = more base damage + bigger crits.')
              ),
              h('div', { className: 'text-right' },
                h('div', { className: 'text-[10px] font-bold text-amber-200 uppercase' }, 'Essence'),
                h('div', { className: 'text-2xl font-bold' }, '\u2B50 ' + essence)
              )
            )
          ),
          unlockedSpells2.length === 0
            ? h('div', { className: 'rounded-xl p-6 text-center bg-slate-50 border border-slate-400 text-sm text-slate-600' },
                'No spells to upgrade yet. Unlock spells by playing other STEM Lab tools.'
              )
            : h('div', { className: 'space-y-2' },
                unlockedSpells2.map(function(s) {
                  var lvl = spellLvls[s.id] || 0;
                  var maxed = lvl >= SPELL_LEVEL_CAP;
                  var cost = maxed ? 0 : upgradeCost(lvl);
                  var canAfford = essence >= cost;
                  var currentDmg = getSpellDamage(s, lvl);
                  var nextDmg = maxed ? currentDmg : getSpellDamage(s, lvl + 1);
                  return h('div', {
                    key: s.id,
                    className: 'flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-white',
                    style: { borderLeft: '4px solid ' + s.color }
                  },
                    h('span', { className: 'text-2xl' }, s.icon),
                    h('div', { className: 'flex-1 min-w-0' },
                      h('div', { className: 'font-bold text-sm flex items-center gap-1', style: { color: s.color } },
                        s.name,
                        lvl > 0 && h('span', { className: 'text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-bold' }, 'Lv' + lvl),
                        maxed && h('span', { className: 'text-[9px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold' }, 'MAX')
                      ),
                      h('div', { className: 'text-[11px] text-slate-300' }, s.sourceLabel),
                      // Level pips
                      h('div', { className: 'flex gap-1 mt-1' },
                        Array.from({ length: SPELL_LEVEL_CAP }).map(function(_p, i) {
                          return h('span', {
                            key: 'pip-' + i,
                            className: 'inline-block w-3 h-2 rounded-sm ' + (i < lvl ? '' : 'bg-slate-200'),
                            style: i < lvl ? { background: s.color } : {},
                            'aria-hidden': 'true'
                          });
                        })
                      )
                    ),
                    h('div', { className: 'text-right' },
                      h('div', { className: 'text-[10px] text-slate-300' }, 'Damage'),
                      h('div', { className: 'text-sm font-bold' },
                        maxed
                          ? h('span', { style: { color: s.color } }, currentDmg)
                          : h('span', null,
                              h('span', { className: 'text-slate-600' }, currentDmg),
                              h('span', { className: 'text-slate-400 mx-1' }, '\u2192'),
                              h('span', { style: { color: s.color } }, nextDmg)
                            )
                      )
                    ),
                    h('button', {
                      disabled: maxed || !canAfford,
                      onClick: function() { upgrade(s.id); },
                      className: 'px-3 py-2 rounded-lg font-bold text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none '
                        + (maxed
                          ? 'bg-emerald-100 text-emerald-700 cursor-default'
                          : canAfford
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'),
                      'aria-label': maxed ? s.name + ' is maxed' : 'Upgrade ' + s.name + ' for ' + cost + ' essence'
                    }, maxed ? 'Maxed' : ('\u2B50 ' + cost))
                  );
                })
              )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: PRACTICE (Study Hall — untimed drill)
      // ─────────────────────────────────────────────────
      // Pedagogical core: low-stakes retrieval practice with full explanations
      // visible after each answer. No timer, no HP, no enemies. SRS still
      // weights the picks so weak questions resurface; correct answers still
      // count toward castCounts so mastery tiers advance. This is the
      // "deliberate practice" mode for students who need more retrievals
      // before performance.
      if (phase === 'practice') {
        var practiceSpellId = d.practiceSpellId;
        var practiceSpell = practiceSpellId ? findSpell(practiceSpellId) : null;
        var practiceQ = d.practiceQuestion || null;
        var practiceAnswered = !!(practiceQ && practiceQ.answered);
        var practiceStats = { correct: 0, attempted: 0 };
        if (d.practiceSession) { practiceStats = d.practiceSession; }

        function startPractice(spellId) {
          var sp = findSpell(spellId);
          if (!sp) return;
          var bank = getMergedBank(sp, aiChallengeCache);
          var q = pickWeighted(bank, d.questionStats || {});
          updSage({ practiceSpellId: spellId, practiceQuestion: { q: q, answered: false, selectedIndex: null }, practiceSession: { correct: 0, attempted: 0 } });
          announceSR('Study Hall: ' + sp.name + '. ' + q.prompt);
        }
        function answerPractice(selectedIndex) {
          if (!practiceSpell || !practiceQ || practiceAnswered) return;
          var correct = selectedIndex === practiceQ.q.correctIndex;
          // Update SRS stats — practice mode classifies as 'hit' (correct, untimed)
          // or 'backfire' (incorrect). Never 'crit' (no time pressure).
          var nextStats = Object.assign({}, d.questionStats || {});
          var prev = nextStats[practiceQ.q.prompt] || { attempts: 0, correctCount: 0 };
          nextStats[practiceQ.q.prompt] = {
            lastResult: correct ? 'hit' : 'backfire',
            lastSeen: Date.now(),
            attempts: (prev.attempts || 0) + 1,
            correctCount: (prev.correctCount || 0) + (correct ? 1 : 0)
          };
          // Bump per-spell cast count + session stats
          var nextCounts = Object.assign({}, d.castCounts || {});
          nextCounts[practiceSpell.id] = (nextCounts[practiceSpell.id] || 0) + 1;
          var nextSession = {
            correct: practiceStats.correct + (correct ? 1 : 0),
            attempted: practiceStats.attempted + 1
          };
          updSage({
            practiceQuestion: Object.assign({}, practiceQ, { answered: true, selectedIndex: selectedIndex, wasCorrect: correct }),
            questionStats: nextStats,
            castCounts: nextCounts,
            practiceSession: nextSession,
            totalCasts: (d.totalCasts || 0) + 1
          });
          if (correct) sfxCastHit(); else sfxBackfire();
          announceSR((correct ? 'Correct. ' : 'Not quite. ') + practiceQ.q.explain);
        }
        function nextPractice() {
          if (!practiceSpell) return;
          var bank = getMergedBank(practiceSpell, aiChallengeCache);
          var q = pickWeighted(bank, d.questionStats || {});
          updKey('practiceQuestion', { q: q, answered: false, selectedIndex: null });
          announceSR('Next question. ' + q.prompt);
        }
        function exitPractice() {
          sfxClick();
          updSage({ phase: 'hub', practiceSpellId: null, practiceQuestion: null, practiceSession: null });
        }

        // Spell-picker subview (no spell chosen yet)
        if (!practiceSpell) {
          var unlockedForPractice = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 abs-fade' },
            h('div', { className: 'flex items-center gap-3 mb-4' },
              backBtn(exitPractice, 'Back to Spellforge'),
              h('div', { className: 'flex-1' }),
              h('div', { className: 'text-[10px] text-slate-300 font-semibold uppercase tracking-wider' }, 'Study Hall')
            ),
            h('div', { className: 'rounded-2xl p-4 md:p-5 mb-4', style: { background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', color: 'white' } },
              h('div', { className: 'flex items-center gap-3' },
                h('div', { className: 'text-4xl abs-float' }, '📚'),
                h('div', { className: 'flex-1' },
                  h('h1', { className: 'text-xl font-bold' }, 'Study Hall'),
                  h('p', { className: 'text-sm text-emerald-100 mt-1' }, 'Untimed practice. No HP. No damage. Just retrieval + explanations. Failed questions resurface sooner.')
                )
              )
            ),
            unlockedForPractice.length === 0
              ? h('div', { className: 'rounded-xl p-6 text-center bg-slate-50 border border-slate-300 text-sm text-slate-600' },
                  'No spells unlocked yet. Play other STEM Lab tools to unlock spells, then come back here to practice.'
                )
              : h('div', null,
                  h('h2', { className: 'text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2' }, '🧪 Choose a spell to practice'),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                    unlockedForPractice.map(function(s) {
                      // Compute SRS health for this spell — % of its questions answered correctly in last attempt.
                      var bank = getMergedBank(s, aiChallengeCache);
                      var stats = d.questionStats || {};
                      var seen = 0, mistakes = 0;
                      bank.forEach(function(qq) {
                        var st = stats[qq.prompt];
                        if (st) { seen++; if (st.lastResult === 'backfire') mistakes++; }
                      });
                      var unseen = bank.length - seen;
                      return h('button', {
                        key: s.id,
                        onClick: function() { sfxClick(); startPractice(s.id); },
                        className: 'text-left p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition',
                        style: { borderLeft: '4px solid ' + s.color },
                        'aria-label': 'Practice ' + s.name + (mistakes > 0 ? ', ' + mistakes + ' tough questions waiting' : '')
                      },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('span', { className: 'text-2xl' }, s.icon),
                          h('span', { className: 'font-bold text-sm', style: { color: s.color } }, s.name),
                          mistakes > 0 && h('span', { className: 'ml-auto text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded' }, '⚠ ' + mistakes + ' tough')
                        ),
                        h('div', { className: 'text-[11px] text-slate-600' }, s.sourceLabel + ' · ' + bank.length + ' questions'),
                        h('div', { className: 'text-[10px] text-slate-400 mt-0.5' },
                          seen + ' practiced · ' + unseen + ' new'
                        )
                      );
                    })
                  )
                )
          );
        }

        // Active question subview
        var pq = practiceQ.q;
        var bankSize = getMergedBank(practiceSpell, aiChallengeCache).length;
        var selectedIdx = practiceQ.selectedIndex;
        var wasCorrect = practiceQ.wasCorrect;
        return h('div', { className: 'max-w-2xl mx-auto p-4 md:p-6 abs-fade' },
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', {
              onClick: function() { sfxClick(); updSage({ practiceSpellId: null, practiceQuestion: null }); },
              className: 'text-xs font-semibold text-slate-500 hover:text-slate-800 underline'
            }, '← Change spell'),
            h('div', { className: 'flex-1 text-center' },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-widest text-emerald-700' }, '📚 Study Hall — Untimed'),
              h('div', { className: 'text-[11px] text-slate-500' },
                practiceStats.correct + '/' + practiceStats.attempted + ' correct this session · ' + bankSize + ' total questions'
              )
            ),
            h('button', {
              onClick: exitPractice,
              className: 'text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline'
            }, 'End session')
          ),
          // Spell header
          h('div', { className: 'rounded-xl p-3 mb-3 flex items-center gap-3', style: { background: practiceSpell.color + '14', border: '1px solid ' + practiceSpell.color + '40' } },
            h('span', { className: 'text-3xl' }, practiceSpell.icon),
            h('div', { className: 'flex-1' },
              h('div', { className: 'font-bold', style: { color: practiceSpell.color } }, practiceSpell.name),
              h('div', { className: 'text-[10px] text-slate-500' }, practiceSpell.sourceLabel + ' · ' + practiceSpell.element)
            )
          ),
          // Question
          h('div', { className: 'rounded-2xl p-5 mb-3 border-2 border-slate-200 bg-white' },
            h('p', { className: 'text-sm font-semibold text-slate-800 mb-3 leading-relaxed' }, pq.prompt),
            h('div', { className: 'grid grid-cols-1 gap-2' },
              pq.options.map(function(opt, oi) {
                var isSelected = selectedIdx === oi;
                var isCorrect = oi === pq.correctIndex;
                var revealed = practiceAnswered;
                // Color states: unanswered = neutral, answered+correct = green, answered+wrong-selected = red, answered+correct-not-picked = green outline
                var cls = 'text-left p-3 rounded-lg border-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 transition ';
                if (!revealed) {
                  cls += 'border-slate-200 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer';
                } else if (isCorrect) {
                  cls += 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 text-red-900';
                } else {
                  cls += 'border-slate-200 bg-slate-50 opacity-60';
                }
                return h('button', {
                  key: 'opt-' + oi,
                  onClick: revealed ? null : function() { answerPractice(oi); },
                  disabled: revealed,
                  className: cls,
                  'aria-label': 'Option ' + (oi + 1) + ': ' + opt + (revealed ? (isCorrect ? ' (correct)' : isSelected ? ' (your answer, incorrect)' : '') : '')
                },
                  h('span', { className: 'inline-block w-6 font-bold' }, String.fromCharCode(65 + oi) + '.'),
                  opt,
                  revealed && isCorrect && h('span', { className: 'ml-2' }, '✓'),
                  revealed && isSelected && !isCorrect && h('span', { className: 'ml-2' }, '✗')
                );
              })
            ),
            // Explanation — ALWAYS visible after answer (key pedagogical move)
            practiceAnswered && h('div', {
              className: 'mt-4 p-3 rounded-lg',
              style: { background: wasCorrect ? '#ecfdf5' : '#fef2f2', border: '1px solid ' + (wasCorrect ? '#a7f3d0' : '#fecaca') }
            },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-wider mb-1', style: { color: wasCorrect ? '#065f46' : '#991b1b' } },
                wasCorrect ? '✓ Correct — why this is right' : '✗ Not quite — why the correct answer is right'
              ),
              h('div', { className: 'text-[12px] leading-relaxed', style: { color: wasCorrect ? '#065f46' : '#7f1d1d' } }, pq.explain)
            )
          ),
          // Footer actions
          practiceAnswered && h('div', { className: 'flex gap-2 justify-end' },
            h('button', {
              onClick: function() { sfxClick(); nextPractice(); },
              className: 'px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none'
            }, 'Next question →')
          )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: REVIEW_MISTAKES (flashcard queue)
      // ─────────────────────────────────────────────────
      // Surfaces every question whose lastResult is 'backfire' across the
      // entire grimoire. Students can deliberately re-study what they got
      // wrong. Marking "Got it now" updates the question's lastResult to
      // 'hit' so it drops back into the normal SRS rotation rather than
      // being permanently boosted.
      if (phase === 'review_mistakes') {
        var allStats = d.questionStats || {};
        // Build a list of {spell, question, stat} for every backfired question.
        var toughList = [];
        SPELLBOOK.forEach(function(sp) {
          var bank = getMergedBank(sp, aiChallengeCache);
          bank.forEach(function(qq) {
            var st = allStats[qq.prompt];
            if (st && st.lastResult === 'backfire') {
              toughList.push({ spell: sp, q: qq, stat: st });
            }
          });
        });
        // Sort: most-recently-failed first (so freshest mistakes are top-of-queue)
        toughList.sort(function(a, b) { return (b.stat.lastSeen || 0) - (a.stat.lastSeen || 0); });

        var reviewIdx = d.reviewIdx || 0;
        var reviewRevealed = !!d.reviewRevealed;
        var current = toughList[reviewIdx];

        function gotIt() {
          if (!current) return;
          sfxCastHit();
          var nextStats = Object.assign({}, d.questionStats || {});
          var prev = nextStats[current.q.prompt] || { attempts: 0, correctCount: 0 };
          nextStats[current.q.prompt] = {
            lastResult: 'hit', // Demote from 'backfire' so SRS weight drops
            lastSeen: Date.now(),
            attempts: (prev.attempts || 0) + 1,
            correctCount: (prev.correctCount || 0) + 1
          };
          updSage({ questionStats: nextStats, reviewIdx: reviewIdx + 1, reviewRevealed: false });
          announceSR('Marked as understood. Next question.');
        }
        function stillTough() {
          if (!current) return;
          sfxBackfire();
          // Keep result as backfire (lastSeen updated, attempts bumped)
          var nextStats = Object.assign({}, d.questionStats || {});
          var prev = nextStats[current.q.prompt] || { attempts: 0 };
          nextStats[current.q.prompt] = Object.assign({}, prev, {
            lastResult: 'backfire',
            lastSeen: Date.now(),
            attempts: (prev.attempts || 0) + 1
          });
          updSage({ questionStats: nextStats, reviewIdx: reviewIdx + 1, reviewRevealed: false });
          announceSR('Still tough — keeping in review queue. Next question.');
        }
        function exitReview() {
          sfxClick();
          updSage({ phase: 'hub', reviewIdx: 0, reviewRevealed: false });
        }

        if (toughList.length === 0) {
          return h('div', { className: 'max-w-2xl mx-auto p-4 md:p-6 abs-fade' },
            h('div', { className: 'flex items-center gap-3 mb-4' },
              backBtn(exitReview, 'Back to Spellforge'),
              h('div', { className: 'flex-1' }),
              h('div', { className: 'text-[10px] text-slate-300 font-semibold uppercase tracking-wider' }, 'Review')
            ),
            h('div', { className: 'rounded-2xl p-8 text-center', style: { background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', color: 'white' } },
              h('div', { className: 'text-6xl mb-3' }, '✨'),
              h('h2', { className: 'text-2xl font-bold mb-2' }, 'Clean slate!'),
              h('p', { className: 'text-sm text-emerald-100' }, 'No questions in the review queue. Either you haven\'t played enough yet, or you\'re crushing it. Try Study Hall for low-stakes practice, or launch an expedition.')
            )
          );
        }

        if (reviewIdx >= toughList.length) {
          return h('div', { className: 'max-w-2xl mx-auto p-4 md:p-6 abs-fade text-center' },
            h('div', { className: 'rounded-2xl p-8', style: { background: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', color: 'white' } },
              h('div', { className: 'text-6xl mb-3' }, '🎓'),
              h('h2', { className: 'text-2xl font-bold mb-2' }, 'Review complete!'),
              h('p', { className: 'text-sm text-emerald-100 mb-4' }, 'You reviewed ' + toughList.length + ' tough question' + (toughList.length > 1 ? 's' : '') + '. Strong work — that\'s how learning sticks.'),
              h('button', { onClick: exitReview, className: 'px-6 py-2.5 rounded-xl font-bold text-emerald-800 bg-white hover:bg-emerald-50' }, 'Back to Spellforge')
            )
          );
        }

        var rq = current.q;
        return h('div', { className: 'max-w-2xl mx-auto p-4 md:p-6 abs-fade' },
          h('div', { className: 'flex items-center gap-3 mb-3' },
            backBtn(exitReview, 'Back to Spellforge'),
            h('div', { className: 'flex-1 text-center' },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-widest text-red-700' }, '🎯 Review Tough Questions'),
              h('div', { className: 'text-[11px] text-slate-500' }, 'Card ' + (reviewIdx + 1) + ' of ' + toughList.length)
            ),
            h('div', { style: { width: '60px' } })
          ),
          // Spell context
          h('div', { className: 'rounded-xl p-2 mb-3 flex items-center gap-2 text-[11px]', style: { background: current.spell.color + '14', border: '1px solid ' + current.spell.color + '40' } },
            h('span', null, current.spell.icon),
            h('span', { className: 'font-semibold', style: { color: current.spell.color } }, current.spell.name),
            h('span', { className: 'text-slate-400' }, '·'),
            h('span', { className: 'text-slate-600' }, current.spell.sourceLabel),
            h('span', { className: 'ml-auto text-slate-400' }, current.stat.attempts + ' attempt' + (current.stat.attempts > 1 ? 's' : ''))
          ),
          // Question (flashcard style: prompt visible, answer revealed on click)
          h('div', { className: 'rounded-2xl p-5 mb-3 border-2 border-red-200 bg-red-50' },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-red-700 mb-2' }, '❓ Question'),
            h('p', { className: 'text-sm font-semibold text-slate-800 leading-relaxed mb-4' }, rq.prompt),
            h('div', { className: 'grid grid-cols-1 gap-1.5' },
              rq.options.map(function(opt, oi) {
                var isCorrect = oi === rq.correctIndex;
                return h('div', {
                  key: 'rev-opt-' + oi,
                  className: 'text-[12px] p-2 rounded ' + (reviewRevealed && isCorrect ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300' : 'bg-white text-slate-700 border border-slate-200'),
                  'aria-label': 'Option ' + (oi + 1) + (reviewRevealed && isCorrect ? ' (correct answer)' : '')
                },
                  h('span', { className: 'inline-block w-6 font-bold' }, String.fromCharCode(65 + oi) + '.'),
                  opt,
                  reviewRevealed && isCorrect && h('span', { className: 'ml-2' }, '✓')
                );
              })
            ),
            !reviewRevealed && h('button', {
              onClick: function() { sfxClick(); updKey('reviewRevealed', true); },
              className: 'mt-4 w-full py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none'
            }, '👁 Reveal answer + explanation'),
            reviewRevealed && h('div', { className: 'mt-4 p-3 rounded-lg bg-white border border-emerald-200' },
              h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1' }, '✓ Why this is correct'),
              h('div', { className: 'text-[12px] leading-relaxed text-slate-800' }, rq.explain)
            )
          ),
          // Action buttons (only after reveal)
          reviewRevealed && h('div', { className: 'flex gap-2' },
            h('button', {
              onClick: stillTough,
              className: 'flex-1 py-2.5 rounded-xl font-bold text-red-700 bg-red-50 hover:bg-red-100 border-2 border-red-200 focus:ring-2 focus:ring-red-400 focus:outline-none'
            }, 'Still tough — keep in queue'),
            h('button', {
              onClick: gotIt,
              className: 'flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none'
            }, 'Got it now ✓')
          )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: DASHBOARD (Your Progress)
      // ─────────────────────────────────────────────────
      // Surfaces the student's cumulative learning data. Currently every
      // metric is computable but invisible. This view aggregates it so
      // students can SEE growth — accuracy, calibration, struggling spells,
      // sectors cleared, bosses defeated, time invested.
      if (phase === 'dashboard') {
        var dashStats = d.questionStats || {};
        // Aggregate accuracy across ALL recorded casts.
        var totalAttempts = 0, totalCorrect = 0, totalCrits = 0;
        Object.keys(dashStats).forEach(function(k) {
          totalAttempts += (dashStats[k].attempts || 0);
          totalCorrect += (dashStats[k].correctCount || 0);
          if (dashStats[k].lastResult === 'crit') totalCrits++;
        });
        var accuracyPct = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : 0;
        var critPct = (d.totalCasts || 0) > 0 ? Math.round((d.critCasts || 0) / (d.totalCasts || 1) * 100) : 0;

        // Confidence calibration health across all stats with confidence.
        var calData = { high: { right: 0, total: 0 }, med: { right: 0, total: 0 }, low: { right: 0, total: 0 } };
        Object.keys(dashStats).forEach(function(k) {
          var st = dashStats[k];
          if (!st.lastConfidence) return;
          var wasRight = st.lastResult === 'hit' || st.lastResult === 'crit';
          calData[st.lastConfidence].total++;
          if (wasRight) calData[st.lastConfidence].right++;
        });

        // Source-tool tallies — for the "mastery domains" panel.
        var sourceTally = {};
        SPELLBOOK.forEach(function(sp) {
          if (!sourceTally[sp.sourceTool]) sourceTally[sp.sourceTool] = { label: sp.sourceLabel, icon: sp.icon, unlocked: 0, total: 0, casts: 0 };
          sourceTally[sp.sourceTool].total++;
          if (currentlyUnlocked.indexOf(sp.id) !== -1) sourceTally[sp.sourceTool].unlocked++;
          sourceTally[sp.sourceTool].casts += ((d.castCounts || {})[sp.id] || 0);
        });

        // Top 3 weakest spells (by accuracy across all attempts, min 3 attempts).
        var spellAccuracy = [];
        SPELLBOOK.forEach(function(sp) {
          if (currentlyUnlocked.indexOf(sp.id) === -1) return;
          var bank = getMergedBank(sp, aiChallengeCache);
          var attempts = 0, correct = 0;
          bank.forEach(function(qq) {
            var st = dashStats[qq.prompt];
            if (st) { attempts += st.attempts || 0; correct += st.correctCount || 0; }
          });
          if (attempts >= 3) {
            spellAccuracy.push({ spell: sp, rate: correct / attempts, attempts: attempts });
          }
        });
        spellAccuracy.sort(function(a, b) { return a.rate - b.rate; });
        var weakest = spellAccuracy.slice(0, 3);
        var strongest = spellAccuracy.slice().reverse().slice(0, 3);

        // Estimated time invested — rough proxy: each cast ~ 25 seconds (read + answer + result)
        var estMinutes = Math.round((d.totalCasts || 0) * 25 / 60);

        var sectorsClearedMap = d.sectorsCleared || {};
        var bossesDefeatedMap = d.bossesDefeated || {};
        var bossesAll = ENEMIES.filter(function(e) { return e.boss; });

        function dashBack() { sfxClick(); updKey('phase', 'hub'); }

        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 abs-fade' },
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(dashBack, 'Back to Spellforge'),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[10px] text-slate-300 font-semibold uppercase tracking-wider' }, 'Your Progress')
          ),
          // Headline + AlloBot
          h('div', { className: 'rounded-2xl p-4 md:p-5 mb-4', style: { background: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)', color: 'white' } },
            h('div', { className: 'flex items-center gap-4' },
              h('div', { className: 'text-5xl' }, '📊'),
              h('div', { className: 'flex-1' },
                h('h1', { className: 'text-xl md:text-2xl font-bold' }, 'Your Progress'),
                h('p', { className: 'text-sm text-sky-100 mt-1' },
                  totalAttempts === 0
                    ? 'No data yet. Cast a few spells and your stats will fill in here.'
                    : 'Across ' + totalAttempts + ' attempt' + (totalAttempts > 1 ? 's' : '') + ' on ' + Object.keys(dashStats).length + ' unique question' + (Object.keys(dashStats).length > 1 ? 's' : '') + ' · est. ' + estMinutes + ' min practiced.'
                )
              )
            )
          ),
          // 4 headline KPIs
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2 mb-4' },
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-emerald-200 text-center' },
              h('div', { className: 'text-[9px] font-bold text-emerald-700 uppercase tracking-wider' }, 'Accuracy'),
              h('div', { className: 'text-2xl font-bold text-emerald-600 mt-1' }, accuracyPct + '%'),
              h('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, totalCorrect + '/' + totalAttempts + ' correct')
            ),
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-amber-200 text-center' },
              h('div', { className: 'text-[9px] font-bold text-amber-700 uppercase tracking-wider' }, 'Crit Rate'),
              h('div', { className: 'text-2xl font-bold text-amber-600 mt-1' }, critPct + '%'),
              h('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, (d.critCasts || 0) + ' crits')
            ),
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-violet-200 text-center' },
              h('div', { className: 'text-[9px] font-bold text-violet-700 uppercase tracking-wider' }, 'Spells Unlocked'),
              h('div', { className: 'text-2xl font-bold text-violet-600 mt-1' }, currentlyUnlocked.length + '/' + SPELLBOOK.length),
              h('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, Math.round(currentlyUnlocked.length / SPELLBOOK.length * 100) + '% complete')
            ),
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-rose-200 text-center' },
              h('div', { className: 'text-[9px] font-bold text-rose-700 uppercase tracking-wider' }, 'Interrupts'),
              h('div', { className: 'text-2xl font-bold text-rose-600 mt-1' }, (d.interruptCount || 0)),
              h('div', { className: 'text-[9px] text-slate-400 mt-0.5' }, 'boss specials blocked')
            )
          ),
          // Sectors + bosses progress
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-4' },
            // Sectors
            h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
              h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2' }, '🌌 Sectors Cleared'),
              h('div', { className: 'space-y-1' },
                SECTORS.map(function(sec) {
                  var cleared = !!sectorsClearedMap[sec.id];
                  var unlocked = (d.expeditionsCompleted || 0) >= sec.unlockAt;
                  return h('div', {
                    key: 'dash-sec-' + sec.id,
                    className: 'flex items-center gap-2 p-2 rounded-lg text-[11px] ' + (cleared ? 'bg-emerald-50 border border-emerald-200' : unlocked ? 'bg-slate-50 border border-slate-200' : 'bg-slate-50 border border-slate-200 opacity-50')
                  },
                    h('span', { className: 'text-lg' }, cleared ? '✅' : unlocked ? '○' : '🔒'),
                    h('span', { className: 'font-semibold flex-1' }, sec.name),
                    h('span', { className: 'text-[10px] text-slate-400' },
                      cleared ? 'Cleared' : unlocked ? 'Available' : 'Unlock at ' + sec.unlockAt + ' expeditions'
                    )
                  );
                })
              )
            ),
            // Bosses
            h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
              h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2' }, '💀 Bosses Defeated (' + Object.keys(bossesDefeatedMap).length + '/' + bossesAll.length + ')'),
              h('div', { className: 'grid grid-cols-3 gap-1' },
                bossesAll.map(function(b) {
                  var defeated = !!bossesDefeatedMap[b.id];
                  return h('div', {
                    key: 'dash-boss-' + b.id,
                    className: 'flex flex-col items-center p-1.5 rounded-lg text-center text-[9px] ' + (defeated ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200 opacity-60'),
                    title: b.name + (defeated ? ' (defeated)' : ' (not yet defeated)')
                  },
                    h('span', { className: 'text-lg', style: { filter: defeated ? '' : 'grayscale(1)' } }, b.icon),
                    h('span', { className: 'truncate w-full font-semibold ' + (defeated ? 'text-amber-900' : 'text-slate-400') }, b.name.replace(/^The /, ''))
                  );
                })
              )
            )
          ),
          // Strongest + weakest spells
          (strongest.length > 0 || weakest.length > 0) && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-4' },
            h('section', { className: 'rounded-xl border border-emerald-200 bg-emerald-50 p-3' },
              h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2' }, '💪 Top Spells'),
              strongest.length === 0
                ? h('div', { className: 'text-[11px] text-slate-500 italic' }, 'Cast each spell at least 3 times to see your strongest.')
                : h('div', { className: 'space-y-1' },
                    strongest.map(function(item) {
                      return h('div', { key: 'top-' + item.spell.id, className: 'flex items-center gap-2 text-[11px] p-1.5 rounded-lg bg-white border border-emerald-200' },
                        h('span', { className: 'text-base' }, item.spell.icon),
                        h('span', { className: 'flex-1 font-semibold', style: { color: item.spell.color } }, item.spell.name),
                        h('span', { className: 'font-bold text-emerald-700' }, Math.round(item.rate * 100) + '%'),
                        h('span', { className: 'text-[9px] text-slate-400' }, '(' + item.attempts + ')')
                      );
                    })
                  )
            ),
            h('section', { className: 'rounded-xl border border-rose-200 bg-rose-50 p-3' },
              h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-rose-700 mb-2' }, '🎯 Spells to Strengthen'),
              weakest.length === 0
                ? h('div', { className: 'text-[11px] text-slate-500 italic' }, 'No weak spots flagged yet. Keep casting!')
                : h('div', { className: 'space-y-1' },
                    weakest.map(function(item) {
                      return h('button', {
                        key: 'weak-' + item.spell.id,
                        onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: item.spell.id, practiceQuestion: null, practiceSession: { correct: 0, attempted: 0 } }); },
                        className: 'w-full flex items-center gap-2 text-[11px] p-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 focus:ring-2 focus:ring-rose-400 focus:outline-none transition text-left',
                        'aria-label': 'Practice ' + item.spell.name + ' in Study Hall'
                      },
                        h('span', { className: 'text-base' }, item.spell.icon),
                        h('span', { className: 'flex-1 font-semibold', style: { color: item.spell.color } }, item.spell.name),
                        h('span', { className: 'font-bold text-rose-700' }, Math.round(item.rate * 100) + '%'),
                        h('span', { className: 'text-[9px] text-rose-600 font-bold' }, 'Drill →')
                      );
                    })
                  )
            )
          ),
          // Calibration health (only if any confidence levels logged)
          (calData.high.total + calData.med.total + calData.low.total) > 0 && h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3 mb-4' },
            h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2' }, '🧠 Confidence Calibration Health'),
            h('p', { className: 'text-[10px] text-slate-500 mb-2 italic' }, 'When you say you "know it" and you do — that\'s calibration. Mismatch (over/under-confidence) is the hidden cost in learning.'),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              [
                { level: 'high', icon: '🔥', label: 'Knew it' },
                { level: 'med',  icon: '🤔', label: 'Pretty sure' },
                { level: 'low',  icon: '🤷', label: 'Guessing' }
              ].map(function(opt) {
                var c = calData[opt.level];
                if (c.total === 0) return h('div', { key: 'cd-' + opt.level, className: 'p-2 rounded-lg bg-slate-50 text-center text-[10px] text-slate-400' },
                  h('div', null, opt.icon + ' ' + opt.label),
                  h('div', { className: 'mt-1' }, '—')
                );
                var pct = Math.round(c.right / c.total * 100);
                var calNote = '';
                if (opt.level === 'high' && pct < 70) calNote = 'overconfident';
                else if (opt.level === 'low' && pct >= 60) calNote = 'underconfident';
                else if (opt.level === 'high' && pct >= 85) calNote = 'sharp';
                return h('div', {
                  key: 'cd-' + opt.level,
                  className: 'p-2 rounded-lg text-center text-[10px] border ' + (calNote === 'overconfident' ? 'bg-amber-50 border-amber-200' : calNote === 'underconfident' ? 'bg-sky-50 border-sky-200' : 'bg-emerald-50 border-emerald-200')
                },
                  h('div', { className: 'font-bold' }, opt.icon + ' ' + opt.label),
                  h('div', { className: 'text-base font-bold mt-1' }, pct + '%'),
                  h('div', { className: 'text-[9px] text-slate-400' }, c.right + '/' + c.total),
                  calNote && h('div', { className: 'text-[9px] italic mt-0.5 ' + (calNote === 'overconfident' ? 'text-amber-700' : calNote === 'underconfident' ? 'text-sky-700' : 'text-emerald-700') }, calNote)
                );
              })
            )
          ),
          // Source-tool mastery domains
          h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3 mb-4' },
            h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-2' }, '🌐 Source-Tool Mastery'),
            h('div', { className: 'space-y-1' },
              Object.keys(sourceTally).map(function(k) {
                var t = sourceTally[k];
                var pct = t.total > 0 ? Math.round(t.unlocked / t.total * 100) : 0;
                return h('div', { key: 'st-' + k, className: 'flex items-center gap-2 text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-200' },
                  h('span', { className: 'text-base' }, t.icon),
                  h('span', { className: 'flex-1 font-semibold text-slate-700' }, t.label),
                  h('span', { className: 'text-[10px] text-slate-500' }, t.unlocked + '/' + t.total + ' spells · ' + t.casts + ' cast' + (t.casts !== 1 ? 's' : '')),
                  h('div', { className: 'w-16 h-2 rounded-full bg-slate-200 overflow-hidden' },
                    h('div', { className: 'h-full bg-violet-500', style: { width: pct + '%' } })
                  )
                );
              })
            )
          ),
          // ── Reflection Journal ──
          // Surfaces the student's own written reflections from past debriefs.
          // Reading your own past observations is its own form of retrieval +
          // re-encoding (elaborative practice). Empty state explains the loop.
          h('section', { className: 'rounded-xl border border-sky-200 bg-sky-50 p-3 mb-4' },
            h('h2', { className: 'text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-2' }, '📝 Reflection Journal'),
            (function() {
              var reflections = d.reflections || [];
              if (reflections.length === 0) {
                return h('p', { className: 'text-[11px] text-sky-700 italic' },
                  'No reflections saved yet. After each expedition, write one thing you noticed or learned. Future you will thank present you.'
                );
              }
              // Show newest first, cap to 10 in dashboard
              var recent = reflections.slice().reverse().slice(0, 10);
              return h('div', { className: 'space-y-1.5' },
                recent.map(function(r, idx) {
                  var when = '';
                  try {
                    var dt = new Date(r.at);
                    var now = Date.now();
                    var diffDays = (now - r.at) / 86400000;
                    if (diffDays < 1) when = 'Today';
                    else if (diffDays < 2) when = 'Yesterday';
                    else when = Math.floor(diffDays) + ' days ago';
                  } catch(e) { when = ''; }
                  return h('div', { key: 'refl-' + idx, className: 'p-2 rounded-lg bg-white border border-sky-200 text-[11px]' },
                    h('p', { className: 'text-slate-800 leading-snug mb-1' }, '"' + r.text + '"'),
                    h('div', { className: 'text-[9px] text-sky-600 flex items-center gap-2' },
                      h('span', null, when),
                      r.sectorName && h('span', null, '· ' + r.sectorName),
                      r.difficulty && h('span', null, '· ' + r.difficulty),
                      r.result === 'victory' && h('span', null, '· ✅ victory'),
                      r.result === 'defeat' && h('span', null, '· 💥 fell')
                    )
                  );
                })
              );
            })()
          )
        );
      }

      // Fallback
      return h('div', { className: 'text-center p-6 text-slate-600 text-sm' }, 'Loading AlloBot Sage...');
    }
  });

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_allobotsage.js');
})();

} // end dedup guard
