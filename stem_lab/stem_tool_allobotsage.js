// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
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
// master skills in other STEAM Lab tools. Casting a spell requires a
// short retrieval-practice micro-challenge tied to the source tool.
// Phase 1 MVP: single-player, 10 spells, single-encounter expeditions.
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
if (typeof window !== 'undefined') {
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
}
// ═══ End Guard ═══

if (typeof window !== 'undefined' && !(window.StemLab.isRegistered && window.StemLab.isRegistered('alloBotSage'))) {

(function() {
  'use strict';

  var _absCombatGen = 0;
  var _absCombatTimers = [];
  var _absLastSeenKey = '';
  var _absLastVisitTick = 0;
  function clearCombatTimers() {
    _absCombatGen++;
    while (_absCombatTimers.length) {
      try { clearTimeout(_absCombatTimers.pop()); } catch (_) {}
    }
  }
  function scheduleCombat(fn, ms) {
    var gen = _absCombatGen;
    var id = setTimeout(function() {
      var idx = _absCombatTimers.indexOf(id);
      if (idx !== -1) _absCombatTimers.splice(idx, 1);
      if (gen !== _absCombatGen) return;
      fn();
    }, ms);
    _absCombatTimers.push(id);
    return id;
  }

  // ── Audio ──
  var _absAC = null;
  function isGloballyMuted() {
    if (typeof window === 'undefined') return true;
    var fnMuted = false;
    if (typeof window.__alloIsGlobalMuted === 'function') {
      try { fnMuted = !!window.__alloIsGlobalMuted(); } catch (_) { fnMuted = false; }
    }
    return fnMuted || !!window._alloGlobalMute;
  }
  function getAC() { if (isGloballyMuted()) return null; if (!_absAC) { try { _absAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_absAC && _absAC.state === 'suspended') { try { _absAC.resume(); } catch(e) {} } return _absAC; }
  function absTone(f, d, t, v) { if (isGloballyMuted()) return; var ac = getAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxCastReady() { absTone(660, 0.08, 'sine', 0.05); setTimeout(function() { absTone(880, 0.1, 'sine', 0.06); }, 70); }
  function sfxCastHit()   { absTone(440, 0.05, 'sawtooth', 0.05); setTimeout(function() { absTone(220, 0.15, 'sawtooth', 0.06); }, 50); }
  function sfxCastCrit()  { absTone(880, 0.06, 'square', 0.06); setTimeout(function() { absTone(1320, 0.08, 'sine', 0.07); }, 50); setTimeout(function() { absTone(1760, 0.12, 'sine', 0.08); }, 120); }
  function sfxBackfire()  { absTone(180, 0.15, 'sawtooth', 0.07); setTimeout(function() { absTone(120, 0.2, 'square', 0.05); }, 100); }
  function sfxUnlock()    { absTone(523, 0.08, 'sine', 0.06); setTimeout(function() { absTone(784, 0.1, 'sine', 0.07); }, 70); setTimeout(function() { absTone(1047, 0.2, 'sine', 0.08); }, 150); }
  function sfxVictory()   { [523, 659, 784, 1047].forEach(function(f, i) { setTimeout(function() { absTone(f, 0.12, 'sine', 0.07); }, i * 80); }); }
  function sfxClick()     { absTone(600, 0.03, 'sine', 0.04); }

  // ── a11y CSS + live region ──
  if (typeof document !== 'undefined' && document.head && !document.getElementById('abs-a11y-css')) {
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
      // ── Cinema-Grade 2D Live-Motion Polish (GPU-composited SVG keyframes) ──
      + ' @keyframes absHaloBreath { 0%,100% { opacity: 0.24; transform: scale(0.94); } 50% { opacity: 0.52; transform: scale(1.07); } }'
      + ' @keyframes absOrbitDrift { from { stroke-dashoffset: 32; } to { stroke-dashoffset: 0; } }'
      + ' @keyframes absConduitFlow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }'
      + ' @keyframes absBeaconPulse { 0%,100% { opacity: 0.22; transform: scale(0.92); } 50% { opacity: 0.56; transform: scale(1.22); } }'
      + ' @keyframes absGlintSweep { 0%,24% { transform: translateX(-80px); opacity: 0; } 48% { opacity: 0.36; } 72% { transform: translateX(140px); opacity: 0; } 100% { transform: translateX(140px); opacity: 0; } }'
      + ' @keyframes absStarTwinkle { 0%,100% { opacity: 0.26; } 50% { opacity: 0.85; } }'
      + ' .abs-twinkle { animation: absTwinkle 2.4s ease-in-out infinite; }'
      + ' .abs-drift-rise { animation: absDriftRise 6s ease-in-out infinite; }'
      + ' .abs-slow-spin { animation: absSlowSpin 8s linear infinite; transform-origin: center; transform-box: fill-box; }'
      + ' .abs-bubble { animation: absBubble 5s ease-in-out infinite; }'
      + ' .abs-halo-breath { animation: absHaloBreath 4.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }'
      + ' .abs-orbit-drift { animation: absOrbitDrift 9.5s linear infinite; }'
      + ' .abs-conduit-flow { animation: absConduitFlow 2.2s linear infinite; }'
      + ' .abs-conduit-flow-slow { animation: absConduitFlow 4.6s linear infinite; }'
      + ' .abs-beacon-pulse { animation: absBeaconPulse 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }'
      + ' .abs-glint-sweep { animation: absGlintSweep 5.8s ease-in-out infinite; }'
      + ' .abs-star-twinkle { animation: absStarTwinkle 3.8s ease-in-out infinite; }'
      + ' @media (prefers-reduced-motion: reduce) { .abs-halo-breath, .abs-orbit-drift, .abs-conduit-flow, .abs-conduit-flow-slow, .abs-beacon-pulse, .abs-glint-sweep, .abs-star-twinkle { animation: none !important; transition: none !important; } .abs-glint-sweep { display: none !important; } }'
      + ' .abs-workbench[data-abs-rm="1"] * { animation: none !important; transition: none !important; }'
      + ' .abs-workbench[data-abs-rm="1"] .abs-glint-sweep { display: none !important; }'
      + ' .abs-workbench[data-abs-hc="1"] * { animation: none !important; transition: none !important; }'
      + ' .abs-workbench[data-abs-hc="1"] .abs-svg-fx { display: none !important; }'
      + ' @media (forced-colors: active) { .abs-workbench * { animation: none !important; transition: none !important; } .abs-workbench .abs-svg-fx { display: none !important; } }'
      // ── Starbound Spellforge Observatory Workbench + Light / Dark / High-Contrast Parity ──
      + ' .abs-workbench { --abs-surface: #ffffff; --abs-surface-2: #f8fafc; --abs-border: #e2e8f0; --abs-ink: #0f172a; --abs-muted: #475569; --abs-accent: #7c3aed; --abs-accent-soft: #f5f3ff; }'
      + ' .abs-hero-deck { position: relative; border-radius: 18px; border: 1px solid rgba(167,139,250,0.42); background: linear-gradient(135deg, #17153b 0%, #3b1d7a 52%, #1e1b4b 100%); color: #f8fafc; box-shadow: 0 14px 32px rgba(30,27,75,0.28), inset 0 1px 0 rgba(255,255,255,0.12); overflow: hidden; }'
      + ' .abs-hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; background: rgba(167,139,250,0.22); border: 1px solid rgba(216,180,254,0.45); color: #ede9fe; }'
      + ' .abs-hero-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; background: rgba(15,23,42,0.44); border: 1px solid rgba(196,181,253,0.3); color: #f1f5f9; }'
      + ' .abs-hero-pill-gold { background: rgba(245,158,11,0.22); border-color: rgba(252,211,77,0.55); color: #fef3c7; }'
      + ' .abs-preset-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }'
      + ' .abs-preset-btn { min-height: 44px; display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 12px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.12); border: 1px solid rgba(221,214,254,0.35); color: #ffffff; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, transform 0.12s ease; }'
      + ' .abs-preset-btn:hover { background: rgba(255,255,255,0.22); border-color: #ddd6fe; transform: translateY(-1px); }'
      + ' .abs-preset-btn:focus-visible { outline: 3px solid #fde047; outline-offset: 2px; }'
      + ' .abs-stage-card { border-radius: 16px; border: 1px solid var(--abs-border); background: var(--abs-surface); box-shadow: 0 6px 20px rgba(15,23,42,0.06); padding: 14px; margin-bottom: 18px; }'
      + ' .abs-stage-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--abs-muted); }'
      + ' .abs-stage-sub { font-size: 12px; color: var(--abs-muted); }'
      + ' .abs-inquiry-preset { min-height: 44px; padding: 8px 12px; border-radius: 10px; font-size: 12px; font-weight: 700; border: 1px solid rgba(148,163,184,0.4); background: #0f172a; color: #f1f5f9; cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }'
      + ' .abs-inquiry-preset:hover { background: #1e293b; border-color: #a78bfa; }'
      + ' .abs-inquiry-preset:focus-visible { outline: 3px solid #fde047; outline-offset: 2px; }'
      + ' .dark .abs-workbench, .abs-workbench[data-abs-dark="1"] { --abs-surface: #0f172a; --abs-surface-2: #1e293b; --abs-border: #334155; --abs-ink: #f8fafc; --abs-muted: #cbd5e1; --abs-accent: #c4b5fd; --abs-accent-soft: #1e1b4b; }'
      + ' .dark .abs-stage-card, .abs-workbench[data-abs-dark="1"] .abs-stage-card { box-shadow: 0 8px 24px rgba(2,6,23,0.45); }'
      + ' .theme-contrast .abs-workbench, .abs-workbench[data-abs-hc="1"] { --abs-surface: #000000; --abs-surface-2: #000000; --abs-border: #ffffff; --abs-ink: #ffffff; --abs-muted: #facc15; --abs-accent: #facc15; --abs-accent-soft: #000000; }'
      + ' .theme-contrast .abs-hero-deck, .abs-workbench[data-abs-hc="1"] .abs-hero-deck { background: #000000 !important; border: 2px solid #facc15 !important; box-shadow: none !important; color: #ffffff !important; }'
      + ' .theme-contrast .abs-hero-badge, .abs-workbench[data-abs-hc="1"] .abs-hero-badge { background: #000000 !important; border: 2px solid #facc15 !important; color: #facc15 !important; }'
      + ' .theme-contrast .abs-hero-pill, .abs-workbench[data-abs-hc="1"] .abs-hero-pill { background: #000000 !important; border: 1px solid #ffffff !important; color: #ffffff !important; }'
      + ' .theme-contrast .abs-hero-pill-gold, .abs-workbench[data-abs-hc="1"] .abs-hero-pill-gold { border-color: #facc15 !important; color: #facc15 !important; }'
      + ' .theme-contrast .abs-preset-btn, .theme-contrast .abs-inquiry-preset, .abs-workbench[data-abs-hc="1"] .abs-preset-btn, .abs-workbench[data-abs-hc="1"] .abs-inquiry-preset { background: #000000 !important; border: 2px solid #facc15 !important; color: #ffffff !important; }'
      + ' .theme-contrast .abs-preset-btn:hover, .theme-contrast .abs-inquiry-preset:hover, .abs-workbench[data-abs-hc="1"] .abs-preset-btn:hover, .abs-workbench[data-abs-hc="1"] .abs-inquiry-preset:hover { background: #facc15 !important; color: #000000 !important; }'
      + ' .theme-contrast .abs-stage-card, .abs-workbench[data-abs-hc="1"] .abs-stage-card { background: #000000 !important; border: 2px solid #ffffff !important; box-shadow: none !important; color: #ffffff !important; }'
      + ' .theme-contrast .abs-stage-title, .theme-contrast .abs-stage-sub, .abs-workbench[data-abs-hc="1"] .abs-stage-title, .abs-workbench[data-abs-hc="1"] .abs-stage-sub { color: #facc15 !important; }'
      + ' .theme-contrast .abs-workbench *, .abs-workbench[data-abs-hc="1"] * { animation: none !important; transition: none !important; }'
      + ' .theme-contrast .abs-svg-fx, .abs-workbench[data-abs-hc="1"] .abs-svg-fx { display: none !important; }';
    document.head.appendChild(_s);
  }
  (function() {
    if (typeof document === 'undefined' || !document.body || document.getElementById('allo-live-allobotsage')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-allobotsage';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  // Daily claim and streak use LOCAL calendar dates, as the claim promises.
  // toISOString() is UTC, which reset the daily bonus at 5 pm in Portland.
  function sageLocalDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function sageIsYesterday(dateStr, now) {
    if (!dateStr) return false;
    var n = new Date(now);
    return sageLocalDate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1)) === dateStr;
  }

  function announceSR(msg) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('allo-live-allobotsage');
    if (el) { el.textContent = ''; setTimeout(function() { if (el.isConnected) el.textContent = msg; }, 50); }
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
        { prompt: 'What is a light-year a unit of?', options: ['time', 'velocity', 'distance', 'mass'], correctIndex: 2, explain: 'Distance light travels in one year \u2014 ~9.46 trillion km.' },
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
        { prompt: 'Which of these has the STRONGEST surface gravity?', options: ['Moon', 'Mars', 'Neptune', 'Jupiter'], correctIndex: 3, explain: 'Jupiter\u2019s surface gravity is ~2.5\u00d7 Earth\u2019s.' },
        { prompt: 'On the Moon (g = 1.62 m/s\u00b2), objects fall how compared to Earth?', options: ['slower', 'faster', 'same', 'sideways'], correctIndex: 0, explain: 'Lower g \u2192 smaller acceleration \u2192 slower fall.' },
        { prompt: 'What happens to your weight on Mars vs Earth?', options: ['about three times heavier', 'same', 'about 38% of Earth', 'zero'], correctIndex: 2, explain: 'Mars g = 3.72 m/s\u00b2 \u2248 38% of Earth\u2019s 9.8 m/s\u00b2.' },
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
        { prompt: 'The Sun is mostly made of which element?', options: ['nitrogen', 'iron', 'hydrogen', 'carbon'], correctIndex: 2, explain: 'Hydrogen (~74%) fusing into helium powers the Sun.' },
        { prompt: 'What process releases energy in the Sun\u2019s core?', options: ['combustion', 'fission', 'fusion', 'friction'], correctIndex: 2, explain: 'Nuclear fusion \u2014 hydrogen nuclei merging into helium.' },
        { prompt: 'Which layer of the Sun do we see with our eyes?', options: ['core', 'photosphere', 'corona', 'radiative zone'], correctIndex: 1, explain: 'The photosphere is the visible surface layer.' },
        { prompt: 'Solar flares are bursts of...', options: ['solid matter', 'radiation and charged particles', 'liquid sunlight', 'silent vibration of the solar wind'], correctIndex: 1, explain: 'Magnetic reconnection releases radiation + accelerated particles.' },
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
        { prompt: 'A supernova is...', options: ['a newborn star', 'an exploding massive star', 'a cold dead planet with no moons', 'a type of aurora'], correctIndex: 1, explain: 'End-of-life explosion of a massive star, seeding heavy elements.' },
        { prompt: 'The rainbow colors you see when starlight passes through a prism reveal the star\u2019s...', options: ['age only', 'mass only', 'composition', 'temperature only'], correctIndex: 2, explain: 'Absorption lines in a spectrum identify elements present.' },
        { prompt: 'Which telescope type uses a curved mirror to focus light?', options: ['refracting', 'reflecting', 'prismatic', 'laser'], correctIndex: 1, explain: 'Reflectors (like Hubble) use mirrors; refractors use lenses.' },
        { prompt: 'A galaxy is a collection of...', options: ['planets only', 'billions of stars + gas + dust', 'solar systems orbiting one giant star', 'black holes only'], correctIndex: 1, explain: 'Typical galaxy: 100 million to 1 trillion stars plus interstellar medium.' }
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
      color: 'var(--allo-stem-text-soft, #94a3b8)',
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
        { prompt: 'When you see a school bus with flashing red lights stopped ahead, you must...', options: ['pass carefully', 'honk and pass', 'stop completely', 'slow to 15 mph and pass'], correctIndex: 2, explain: 'Stop and wait until the lights stop flashing (most US states).' },
        { prompt: 'Safe following distance is typically measured by the...', options: ['3-second rule', '1-minute rule', 'license-plate rule', 'coin-flip rule'], correctIndex: 0, explain: 'Stay at least 3 seconds behind the car in front (more in bad weather).' },
        { prompt: 'Hydroplaning is most likely to happen when...', options: ['driving slow on dry road', 'driving fast on wet road', 'parked', 'backing up'], correctIndex: 1, explain: 'Water lifts tires off the road \u2014 worst at high speed on wet surfaces.' },
        { prompt: 'If your tires lose grip and the rear slides out, you should...', options: ['slam the brakes', 'steer the way you want to go', 'turn the wheel the opposite way', 'accelerate hard'], correctIndex: 1, explain: '\u201cSteer into the skid\u201d \u2014 point the wheels where you want to go.' },
        { prompt: 'Seat belts work best because they...', options: ['look nice', 'spread crash forces across the body', 'warm you up', 'increase comfort on long family car rides'], correctIndex: 1, explain: 'They distribute deceleration forces over the strong parts of the skeleton.' }
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
        { prompt: 'A PENTAGON-shaped sign usually means...', options: ['gas station / fuel services ahead', 'school zone / school crossing', 'hospital', 'rest stop'], correctIndex: 1, explain: 'Pentagon = school zone in US signage.' },
        { prompt: 'ORANGE signs usually indicate...', options: ['construction / work zone', 'hospital', 'campground', 'tourist info / attractions'], correctIndex: 0, explain: 'Orange = construction and temporary traffic controls.' },
        { prompt: 'A WHITE rectangle with black text usually means...', options: ['a warning', 'a regulation (speed limit, etc.)', 'a service', 'a scenic route or historic marker'], correctIndex: 1, explain: 'White rectangles = regulatory signs (speed limits, one-way, etc.).' },
        { prompt: 'A GREEN sign usually gives...', options: ['warnings', 'directional / guidance info', 'regulations and speed limits', 'hazards'], correctIndex: 1, explain: 'Green = guide signs (directions, distances, exits).' }
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
        { prompt: 'Why is highway MPG often higher than city MPG?', options: ['fewer hills', 'less stopping and accelerating', 'warmer engine running the whole time', 'softer tires'], correctIndex: 1, explain: 'Cities waste energy in stop-and-go; highways are closer to steady-state.' },
        { prompt: 'Underinflated tires...', options: ['improve MPG', 'increase rolling resistance (hurt MPG)', 'have no MPG effect as long as they roll', 'are always safer'], correctIndex: 1, explain: 'More deformation = more rolling resistance = lower MPG.' },
        { prompt: 'Idling for 2 minutes uses about as much fuel as driving...', options: ['1 mile', '5 miles', '10 miles', '50 miles'], correctIndex: 0, explain: 'Roughly ~1 mile \u2014 modern guidance: restart if stopped >30s.' },
        { prompt: 'A car doing 70 mph uses much more fuel than one doing 55 mph mostly because of...', options: ['gravity', 'drag (air resistance)', 'engine heat (hotter motor)', 'tire noise'], correctIndex: 1, explain: 'Drag rises with v\u00b2 \u2014 the 70\u219255 gap has an outsized energy cost.' },
        { prompt: 'Regenerative braking on hybrids/EVs recovers energy as...', options: ['sound', 'heat only, which warms up the cabin', 'electrical energy in the battery', 'gasoline'], correctIndex: 2, explain: 'The motor acts as a generator, charging the battery while slowing the car.' }
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
        { prompt: 'Which sound starts the word \u201cthunder\u201d?', options: ['/tr/', '/th/', '/d/', '/n/'], correctIndex: 1, explain: 'Digraph \u201cth\u201d is a single sound \u2014 the voiceless \u201cth\u201d in thunder.' },
        { prompt: 'Which pair RHYMES?', options: ['cat / dog', 'moon / spoon', 'cup / cap', 'leaf / leash'], correctIndex: 1, explain: 'Rhymes share ending sounds \u2014 moon/spoon both end in /u:n/.' },
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
        { prompt: 'Which word rhymes with \u201cblue\u201d?', options: ['bowl', 'bee', 'shoe', 'by'], correctIndex: 2, explain: '\u201cshoe\u201d and \u201cblue\u201d both end in /u:/.' },
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
        { prompt: 'Which element is MOST essential for a story?', options: ['a character with a goal', 'a glossary', 'a bibliography and index', 'page numbers'], correctIndex: 0, explain: 'A character pursuing something is the spine of narrative.' },
        { prompt: 'The \u201cclimax\u201d of a story is usually...', options: ['the opening line', 'the peak moment of tension', 'the last paragraph of the book', 'the author\u2019s name'], correctIndex: 1, explain: 'Climax = the turning point where conflict peaks.' },
        { prompt: 'Which opening HOOKS the reader best?', options: ['“It was a normal Tuesday, and nothing at all was going to happen.”', '\u201cThe phone rang for the twenty-first time that morning.\u201d', '\u201cThis is a story.\u201d', '\u201cChapter 1.\u201d'], correctIndex: 1, explain: 'Specific, curious detail pulls readers in.' },
        { prompt: '\u201cShowing, not telling\u201d means...', options: ['no dialogue allowed', 'describe behavior and senses instead of stating feelings', 'use bullet points', 'write in past tense only, so the reader is not told what is happening now'], correctIndex: 1, explain: 'Instead of \u201cshe was nervous,\u201d write \u201cher hands trembled on the door handle.\u201d' },
        { prompt: 'A story told from \u201cshe ran, she thought, she wondered\u201d uses which POV?', options: ['first person', 'second person', 'third person', 'no POV'], correctIndex: 2, explain: 'Third person uses she/he/they as the narrator\u2019s referent.' },
        { prompt: 'What is a \u201cstakes\u201d question in a story?', options: ['what the hero ate for breakfast that morning', 'what the character stands to lose or gain', 'the publication date', 'page count'], correctIndex: 1, explain: 'Stakes are what matters \u2014 without them, tension collapses.' }
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
        { prompt: 'Which is a compound sentence?', options: ['It rained.', 'It rained hard all morning long today.', 'It rained, and the garden flooded.', 'Rain.'], correctIndex: 2, explain: 'Compound = two independent clauses joined by a conjunction (here, \u201cand\u201d).' }
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
        { prompt: 'The BEST strategy if you hit an unknown word is...', options: ['skip and guess', 'use context clues from surrounding sentences', 'give up on the passage and read a different one', 'only check the title'], correctIndex: 1, explain: 'Context clues unlock meaning without breaking flow.' },
        { prompt: '\u201cMain idea\u201d of a paragraph means...', options: ['the longest sentence in the paragraph', 'the overall point it\u2019s making', 'the first word', 'any quote'], correctIndex: 1, explain: 'Main idea = what the paragraph is really saying, not just details.' },
        { prompt: 'Which is a SIGNAL of a supporting detail?', options: ['\u201cfor example\u201d', '\u201cin conclusion\u201d', '\u201cwho are you\u201d', '\u201cpage 1\u201d'], correctIndex: 0, explain: '\u201cFor example\u201d introduces a detail supporting the main idea.' },
        { prompt: 'When reading, to tell FACT from OPINION, ask...', options: ['does it rhyme?', 'can it be proven or tested?', 'is it short?', 'is it printed in italics or bold?'], correctIndex: 1, explain: 'Facts are verifiable; opinions are beliefs or judgments.' },
        { prompt: 'If a text defines a key word in a glossary, you should...', options: ['ignore it', 'use it to clarify meaning', 'memorize the page number it is on', 'skip to the end'], correctIndex: 1, explain: 'Glossary entries are reading aids \u2014 use them actively.' },
        { prompt: 'Re-reading a confusing passage is...', options: ['always unnecessary', 'a strong strategy used by skilled readers', 'against the rules', 'for beginners only, not for skilled readers'], correctIndex: 1, explain: 'Skilled readers re-read constantly \u2014 it\u2019s a core comprehension tool.' }
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
        { prompt: 'What does \u201cinfer\u201d mean?', options: ['ignore', 'figure out from clues', 'repeat it word-for-word', 'avoid'], correctIndex: 1, explain: 'To infer = to draw a conclusion from evidence you\u2019re given.' },
        { prompt: 'A prefix like \u201cun-\u201d usually makes a word...', options: ['opposite / negative', 'louder', 'longer', 'fancier and much longer'], correctIndex: 0, explain: '\u201cUn-\u201d flips meaning: happy \u2192 unhappy.' },
        { prompt: 'A \u201cthesis\u201d in nonfiction is...', options: ['a picture', 'the main claim the author argues', 'a joke', 'an index entry at the back of the book'], correctIndex: 1, explain: 'Thesis = the central argument the rest of the text supports.' },
        { prompt: '\u201cSkim\u201d reading means...', options: ['read every single word slowly', 'scan quickly for the gist', 'skip entirely', 'read upside down'], correctIndex: 1, explain: 'Skimming = fast sweep for main ideas, not deep comprehension.' },
        { prompt: 'The suffix \u201c-less\u201d usually means...', options: ['more', 'without / lacking', 'again', 'before / earlier on'], correctIndex: 1, explain: 'Hope + less = without hope.' },
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
        { prompt: 'Touch typing means you...', options: ['type while tapping the screen', 'type without looking at the keys', 'type very softly', 'type with only one finger at a time'], correctIndex: 1, explain: 'Eyes stay on the screen; fingers find keys by muscle memory.' },
        { prompt: 'Which finger should press the letter F?', options: ['left middle', 'left index', 'right index', 'left thumb'], correctIndex: 1, explain: 'The left index finger rests on F (notice the small bump that helps you find it without looking).' },
        { prompt: 'Which finger presses the space bar?', options: ['index', 'pinky', 'either thumb', 'the ring finger'], correctIndex: 2, explain: 'Thumbs hover over the space bar; use whichever is free.' },
        { prompt: 'The small bump on the F and J keys is called...', options: ['a decoration on the keys', 'a home bump', 'a finger rest ridge', 'a lock'], correctIndex: 2, explain: 'The ridges help you find the home row without looking down.' },
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
        { prompt: 'Consistent practice with LOW bars (e.g., 10 WPM at 80% accuracy) is called...', options: ['cheating', 'mastery learning', 'pressure typing drills', 'speed racing'], correctIndex: 1, explain: 'Mastery learning: meeting thresholds at your pace builds durable skill.' },
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
        { prompt: 'Which is NOT a real type of orbit?', options: ['polar', 'geostationary', 'ellipsoidal-static', 'sun-synchronous polar'], correctIndex: 2, explain: 'The other three are real; ellipsoidal-static is invented.' },
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
        { prompt: 'A box plot shows...', options: ['only the mean', 'the five-number summary', 'a frequency table of counts', 'percentages only'], correctIndex: 1, explain: 'Min, Q1, median, Q3, max — quartiles + extremes.' },
        { prompt: 'In a normal distribution, ~68% of data falls within how many standard deviations of the mean?', options: ['1', '2', '3', '4'], correctIndex: 0, explain: 'Empirical rule: 68% within 1σ, 95% within 2σ, 99.7% within 3σ.' },
        { prompt: 'Which measure of center is MOST affected by outliers?', options: ['median', 'mean', 'mode', 'range'], correctIndex: 1, explain: 'Mean shifts toward extreme values; median resists.' },
        { prompt: 'A correlation of −0.9 means the variables are...', options: ['unrelated', 'weakly but positively related', 'strongly negatively related', 'identical'], correctIndex: 2, explain: 'Close to −1 = strong inverse relationship.' },
        { prompt: 'Which is a sample, not a population?', options: ['every student in the U.S.', 'every Maine 8th grader', '50 randomly chosen Maine 8th graders', 'every 8th grader who has ever lived anywhere'], correctIndex: 2, explain: 'A sample is a subset chosen from the population.' }
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
        { prompt: 'You should check your blind spot by...', options: ['looking only at your mirrors', 'turning your head briefly', 'closing your eyes', 'asking a passenger'], correctIndex: 1, explain: 'Mirrors miss the area beside your rear corners — head-check before lane changes.' },
        { prompt: 'What does a flashing yellow light mean?', options: ['stop completely and wait', 'proceed with caution', 'speed up', 'turn left only'], correctIndex: 1, explain: 'Caution — slow down and watch for hazards.' },
        { prompt: 'When merging onto a highway, you should...', options: ['stop at the end of the ramp', 'match the speed of traffic', 'drive 10 mph slower than traffic', 'flash your brights'], correctIndex: 1, explain: 'Match traffic speed — merging slow forces others to brake.' },
        { prompt: 'Hydroplaning is most likely when...', options: ['roads are dry', 'roads first get wet', 'snow has packed the surface', 'temperatures are below 0°F'], correctIndex: 1, explain: 'Oil + water + first rain = slickest moment. Slow down.' },
        { prompt: 'Which is the SAFER following distance in heavy rain?', options: ['1 second', '2 seconds', '3.5 seconds', '4–6 seconds'], correctIndex: 3, explain: 'Doubling/tripling the 3-second rule accounts for stopping distance on wet roads.' }
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
        { prompt: 'A blend like "st" in "stop" means...', options: ['both letters are silent', 'two letters that make one combined sound', 'two letters where each sound is heard', 'a syllable break'], correctIndex: 2, explain: 'Blend = each consonant keeps its sound (/s/ + /t/).' },
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
        { prompt: 'Every syllable contains...', options: ['exactly two consonant sounds', 'exactly one vowel sound', 'a silent letter', 'a digraph'], correctIndex: 1, explain: 'A syllable always has one vowel sound at its core.' },
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
        { prompt: 'A paragraph usually starts with a...', options: ['conclusion line', 'topic sentence', 'quotation', 'list'], correctIndex: 1, explain: 'Topic sentence states the main idea; everything else supports it.' },
        { prompt: 'Which transition word shows CONTRAST?', options: ['therefore', 'however', 'similarly', 'finally'], correctIndex: 1, explain: 'However signals a shift; therefore = cause, similarly = comparison, finally = sequence.' },
        { prompt: 'Evidence in writing usually appears as...', options: ['only your personal opinion', 'examples, quotes, or data', 'only emojis', 'questions'], correctIndex: 1, explain: 'Strong writing supports claims with concrete evidence.' },
        { prompt: 'A "claim" in argument writing is...', options: ['a fact you cannot question', 'your debatable position', 'someone else\'s opinion only', 'a list of dates'], correctIndex: 1, explain: 'Claim = your stance — must be debatable AND supportable.' },
        { prompt: 'Which sentence is a strong topic sentence?', options: ['I will tell you about dogs, and then I will tell you some more things about dogs.', 'Dogs make excellent companions because of their loyalty and intelligence.', 'Dogs.', 'My dog is named Max.'], correctIndex: 1, explain: 'Specific, debatable, previews reasons.' },
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
        { prompt: 'Which is correctly punctuated dialogue?', options: ['"Hello," she said.', '"Hello" she said.', '"Hello" she said,', '"Hello", she said.'], correctIndex: 0, explain: 'Comma INSIDE the quotes when a speaker tag follows.' },
        { prompt: 'In dialogue, every new speaker gets a...', options: ['new chapter heading', 'new paragraph', 'new font', 'new page'], correctIndex: 1, explain: 'Standard: each speaker change = new paragraph for clarity.' },
        { prompt: 'Which is a "show, don\'t tell" version of "She was angry"?', options: ['She felt very mad.', 'She was extremely angry.', 'She slammed the door, jaw tight.', 'She was angry, so very very angry.'], correctIndex: 2, explain: 'Show through action and detail; let the reader infer the emotion.' },
        { prompt: 'A dialogue tag is the...', options: ['punctuation', 'phrase identifying who spoke', 'a description of the setting', 'quoted thought'], correctIndex: 1, explain: 'Tag = "she said," "he asked," etc. — pairs the line with a speaker.' },
        { prompt: 'Which weakens dialogue?', options: ['speaking in the character\'s voice', 'using "said" most of the time', 'long info-dumps mid-conversation', 'short, varied lines'], correctIndex: 2, explain: 'Info-dumps make characters sound like narrators. Keep talk natural.' },
        { prompt: 'Which is more vivid?', options: ['"Yes," he said happily.', '"Yes!" he grinned, already grabbing his coat.', '"Yes," he agreed positively and enthusiastically.', '"Yes," he was happy.'], correctIndex: 1, explain: 'Action beat + body language > explaining the emotion in the tag.' }
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
        { prompt: 'Annotating a text means...', options: ['memorizing every word', 'making notes, marks, and questions on the text', 'reading silently with no marks or notes of any kind', 'only highlighting nouns'], correctIndex: 1, explain: 'Active marking — questions, summaries, vocabulary, connections.' },
        { prompt: 'Which is the BEST annotation for an unfamiliar word?', options: ['Cross it out', 'Write a synonym in the margin', 'Skip it', 'Underline it twice in red pencil'], correctIndex: 1, explain: 'Margin synonym keeps you in the text and builds vocabulary.' },
        { prompt: 'Marking the main idea of a paragraph helps you...', options: ['waste time', 'skim later for key points', 'rewrite the text', 'make the page look shorter'], correctIndex: 1, explain: 'Annotated main ideas are recall-anchors during review.' },
        { prompt: 'A "?" in the margin usually means...', options: ['interesting fact', 'I disagree', 'I don\'t understand this', 'this is the title of the book'], correctIndex: 2, explain: 'Question mark flags confusion to revisit later.' },
        { prompt: 'Which is NOT a useful annotation?', options: ['summary in your own words', 'connection to other texts', 'a smiley face every paragraph', 'an argument response in the margin'], correctIndex: 2, explain: 'Smiley spam adds no comprehension benefit.' },
        { prompt: 'When using digital annotation tools, what should you do BEFORE moving to a new text?', options: ['nothing', 'export or save your notes', 'delete all of your annotations', 'rename the file'], correctIndex: 1, explain: 'Saving preserves the cognitive trail for review.' }
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
        { prompt: 'A good summary is mainly...', options: ['longer than the original', 'in the original\'s own words, copied exactly', 'in your own words, capturing the gist', 'a list of every detail'], correctIndex: 2, explain: 'Paraphrased + condensed; tests true understanding.' },
        { prompt: 'Which detail belongs in a summary?', options: ['the main argument', 'an obscure example', 'the author\'s middle name', 'the pagination'], correctIndex: 0, explain: 'Summaries focus on main ideas, not trivia.' },
        { prompt: 'When summarizing, you should...', options: ['copy whole sentences', 'paraphrase using synonyms + restructured sentences', 'skip the conclusion', 'invent a few extra details to make it more interesting'], correctIndex: 1, explain: 'Paraphrasing builds comprehension; copying = plagiarism.' },
        { prompt: 'Which is a "main idea" sentence?', options: ['It rained yesterday.', 'Climate change threatens coastal cities through rising seas.', 'Some say.', 'Page 12 is interesting, and so are pages 13, 14, 15, and 16.'], correctIndex: 1, explain: 'States the central claim with specifics.' },
        { prompt: 'A summary should be __ than the original.', options: ['longer', 'shorter', 'the exact same length', 'twice as long'], correctIndex: 1, explain: 'Compression is the point — typically 10-25% of length.' },
        { prompt: 'When you finish a chapter, summarizing in your own words is an example of...', options: ['skimming', 'retrieval practice', 'outlining', 'transcribing the text'], correctIndex: 1, explain: 'You pull the ideas back from memory — strongest learning evidence.' }
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
        { prompt: 'Typing accuracy is calculated as...', options: ['words typed ÷ minutes spent typing × 100', 'correct chars ÷ total chars × 100', 'mistakes only', 'time × WPM'], correctIndex: 1, explain: 'Accuracy = % of characters typed correctly.' },
        { prompt: 'WPM stands for...', options: ['Words Per Minute', 'Writing Per Minute', 'Word Pattern Math', 'Wonder Per Minute'], correctIndex: 0, explain: 'Standard speed metric in typing tests.' },
        { prompt: 'Which finger types the letter "F"?', options: ['left index', 'left middle', 'right index', 'right pinky'], correctIndex: 0, explain: 'Left index — F has the home-row bump for orientation.' },
        { prompt: 'What\'s the average typing speed for adults?', options: ['10 WPM', '40 WPM', '120 WPM', '500 WPM'], correctIndex: 1, explain: '~40 WPM is average; 60+ is fast; 100+ is professional.' },
        { prompt: 'The home row keys for the LEFT hand are...', options: ['Q W E R', 'A S D F', 'Z X C V', '1 2 3 4'], correctIndex: 1, explain: 'A S D F — fingers rest here in default position.' },
        { prompt: 'To type accurately, you should focus on...', options: ['speed only', 'correctness first, then speed', 'using only one finger at a time', 'keyboard appearance'], correctIndex: 1, explain: 'Accuracy first builds muscle memory; speed grows naturally.' }
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
        { prompt: 'The QWERTY layout was originally designed to...', options: ['speed up typing', 'prevent typewriter jams', 'help kids learn', 'fit onto small keyboards'], correctIndex: 1, explain: 'Christopher Sholes laid it out so common letter pairs were apart, reducing jams.' },
        { prompt: 'An alternative keyboard layout designed for efficiency is called...', options: ['Dvorak', 'Cyrillic', 'Klingon', 'Morse'], correctIndex: 0, explain: 'Dvorak places vowels on the home row; some claim faster typing.' },
        { prompt: 'On QWERTY, which key is to the LEFT of "S"?', options: ['A', 'D', 'W', 'Q'], correctIndex: 0, explain: 'A — left of S on the home row.' },
        { prompt: 'The space bar is typically pressed by your...', options: ['pinky', 'ring finger', 'thumb', 'index'], correctIndex: 2, explain: 'Either thumb. The longest, strongest digit handles the most-used key.' },
        { prompt: 'Touch typing means typing without...', options: ['using a mouse or trackpad', 'looking at the keys', 'making sound', 'a chair'], correctIndex: 1, explain: 'Eyes on the screen, fingers on home row, by feel.' },
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
        { prompt: 'Which is an example of a compound word?', options: ['friendliness', 'playground', 'running', 'quickly'], correctIndex: 1, explain: 'Compound = two whole words combined: play + ground.' },
        { prompt: 'Reading fluency is measured by speed AND...', options: ['volume', 'accuracy + expression', 'handwriting', 'spelling and handwriting only'], correctIndex: 1, explain: 'Fluent reading = accurate + paced + expressive (prosody).' },
        { prompt: 'If a student types \u201cteh\u201d instead of \u201cthe,\u201d that\u2019s a...', options: ['transposition error', 'missed letter', 'capital letter problem', 'space error'], correctIndex: 0, explain: 'Transposition = two letters swapped. Common in fast typing.' },
        { prompt: 'Which punctuation usually ends a sentence?', options: ['comma', 'period', 'apostrophe', 'colon'], correctIndex: 1, explain: 'Periods end declarative statements. Questions end with ? and strong emotion with !.' },
        { prompt: 'The word \u201cIEP\u201d in schools stands for...', options: ['Incredible Education Plan', 'Individualized Education Program', 'International Exam Panel', 'Instructional Education Project Plan'], correctIndex: 1, explain: 'IEP = federal plan for students receiving special education services.' }
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
        { prompt: 'Aquarium nitrogen cycle: ammonia is converted by bacteria into...', options: ['oxygen and carbon dioxide', 'salt', 'nitrite then nitrate', 'water'], correctIndex: 2, explain: 'Beneficial bacteria oxidize ammonia → nitrite → nitrate, which plants use.' },
        { prompt: 'Which is a sign of a HEALTHY tank?', options: ['cloudy water', 'algae taking over the glass and gravel', 'fish swimming actively + clear water', 'no plants'], correctIndex: 2, explain: 'Active fish + clear water + balanced biology = healthy.' },
        { prompt: 'Why do fish have gills?', options: ['for camouflage', 'to extract oxygen from water', 'to swim faster', 'to breathe air at the surface'], correctIndex: 1, explain: 'Gills pull dissolved oxygen out of water using a thin membrane.' }
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
        { prompt: 'Decomposers like fungi and bacteria...', options: ['kill all plants', 'recycle dead matter into soil nutrients', 'are unnecessary', 'photosynthesize to make all of their own food'], correctIndex: 1, explain: 'Decomposers return nutrients to the soil so producers can use them again.' },
        { prompt: 'A species that has NO natural predators in a new environment is called...', options: ['endangered', 'invasive', 'native', 'extinct'], correctIndex: 1, explain: 'Invasive species often outcompete natives because nothing keeps them in check.' },
        { prompt: 'Photosynthesis converts CO₂ + water into...', options: ['nitrogen + oxygen', 'glucose + oxygen', 'protein + water', 'salt + sugar'], correctIndex: 1, explain: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ (glucose) + 6O₂.' },
        { prompt: 'Removing a top predator from an ecosystem usually...', options: ['has no effect', 'reduces all populations', 'causes prey populations to boom then crash', 'turns the whole area into a dry, empty desert'], correctIndex: 2, explain: 'Trophic cascade — prey overgraze, eventually crashing food supply.' },
        { prompt: 'Which is an example of MUTUALISM?', options: ['lion hunting a zebra herd', 'flea on dog', 'bee pollinating flower', 'mold on bread'], correctIndex: 2, explain: 'Both bee and flower benefit — bee gets nectar, flower gets pollinated.' }
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
        { prompt: 'Positive reinforcement means...', options: ['adding something pleasant after a behavior', 'taking away something pleasant after a behavior', 'punishing wrong behavior', 'ignoring all behavior'], correctIndex: 0, explain: 'Add a reward to increase the likelihood the behavior happens again.' },
        { prompt: 'Negative reinforcement is...', options: ['punishment', 'removing an unpleasant thing to increase a behavior', 'no reward', 'random reward given after some behaviors but not others'], correctIndex: 1, explain: 'NOT punishment — removing something aversive to encourage behavior (e.g., taking off seatbelt buzzer when you buckle up).' },
        { prompt: 'A "fixed ratio" reinforcement schedule rewards every...', options: ['random Nth response (e.g., sometimes the 3rd)', 'response', 'fixed Nth response (e.g., every 5th)', 'minute that passes'], correctIndex: 2, explain: 'Fixed ratio = reward after a set number of responses (FR-5 = every 5th).' },
        { prompt: 'Operant conditioning was most associated with which scientist?', options: ['Freud', 'Bandura', 'Skinner', 'Piaget'], correctIndex: 2, explain: 'B.F. Skinner formalized operant conditioning with the Skinner box.' },
        { prompt: 'Extinction in behavior science means...', options: ['the species died out and the behavior with it', 'the behavior fades when reinforcement stops', 'the trainer left', 'memory was erased'], correctIndex: 1, explain: 'Stop reinforcing → behavior gradually decreases → eventually disappears.' }
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
        { prompt: 'Red blood cells carry oxygen using which protein?', options: ['insulin', 'hemoglobin', 'fibrinogen', 'keratin'], correctIndex: 1, explain: 'Hemoglobin binds O₂ in lungs and releases it in tissues.' },
        { prompt: 'Which organ filters blood and produces urine?', options: ['liver', 'pancreas', 'kidneys', 'spleen'], correctIndex: 2, explain: 'Kidneys filter waste; produce urine that exits via the ureters.' },
        { prompt: 'The largest organ of the human body is the...', options: ['brain', 'liver', 'lungs', 'skin'], correctIndex: 3, explain: 'Skin — surface area ~2 m² in adults.' },
        { prompt: 'Neurons send signals using...', options: ['mechanical bumps only, passed from cell to cell like dominoes', 'electrical impulses + chemical neurotransmitters', 'magnetic waves', 'sound'], correctIndex: 1, explain: 'Action potential travels electrically, then chemicals cross the synapse.' },
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
        { prompt: 'A color\'s value refers to its...', options: ['hue', 'lightness/darkness', 'saturation', 'temperature (warm/cool)'], correctIndex: 1, explain: 'Value = how light or dark — independent of hue or saturation.' },
        { prompt: 'Saturation describes a color\'s...', options: ['brightness or darkness only', 'purity / vividness', 'temperature', 'size on canvas'], correctIndex: 1, explain: 'A highly saturated color is intense; a desaturated one is grayish.' },
        { prompt: 'Which is a WARM color?', options: ['blue', 'green', 'red-orange', 'blue-violet'], correctIndex: 2, explain: 'Reds, oranges, yellows — associated with warmth/sun/fire.' },
        { prompt: 'In a painting, the area where the viewer\'s eye is drawn first is called the...', options: ['background layer', 'focal point', 'horizon', 'frame'], correctIndex: 1, explain: 'Focal point — created via contrast, isolation, or composition.' }
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
        { prompt: 'The pitch difference between C and the next higher C is one...', options: ['note', 'tone', 'octave', 'perfect fifth'], correctIndex: 2, explain: 'Octave = doubled frequency. C4 is 261.6 Hz; C5 is 523.2 Hz.' },
        { prompt: 'Tempo is measured in...', options: ['Hertz', 'beats per minute', 'decibels', 'notes per measure'], correctIndex: 1, explain: 'BPM — how many beats fit in 60 seconds.' },
        { prompt: 'A song in 4/4 time has how many beats per measure?', options: ['2', '3', '4', '6'], correctIndex: 2, explain: 'Top number of time signature = beats per measure.' },
        { prompt: 'Forte means...', options: ['soft', 'loud', 'fast', 'slow'], correctIndex: 1, explain: 'Italian dynamics: forte = loud, piano = soft, mezzo = medium.' },
        { prompt: 'A major chord is built from which intervals (in semitones)?', options: ['1-2', '3-4', '4-3', '5-7'], correctIndex: 2, explain: 'Major triad = root + 4 semitones (major 3rd) + 3 semitones (minor 3rd).' },
        { prompt: 'Sound waves travel through air as...', options: ['transverse waves', 'longitudinal compression waves', 'electromagnetic radiation waves', 'gravity ripples'], correctIndex: 1, explain: 'Sound is a longitudinal pressure wave — compressions and rarefactions.' }
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
        { prompt: 'When light passes through a prism it splits into colors because different wavelengths...', options: ['travel at different speeds in a vacuum', 'bend by different amounts in glass', 'have different mass', 'reflect more strongly'], correctIndex: 1, explain: 'Refractive index varies with wavelength → different bending angles → spectrum.' },
        { prompt: 'The fastest known speed in the universe is...', options: ['speed of sound', 'speed of light in vacuum', 'speed of an electron', 'orbital speed of the Earth'], correctIndex: 1, explain: '~299,792,458 m/s — a fundamental constant.' },
        { prompt: 'Visible light is what part of the electromagnetic spectrum?', options: ['radio waves and microwaves together', 'a narrow band between UV and IR', 'X-rays', 'gamma rays'], correctIndex: 1, explain: 'Roughly 380-700 nm wavelength — tiny slice of the EM spectrum.' },
        { prompt: 'Newton\'s second law states F = ?', options: ['mv', 'ma', 'mgh', 'qE'], correctIndex: 1, explain: 'Force = mass × acceleration. Bigger mass or bigger accel = bigger force.' },
        { prompt: 'Energy is conserved means...', options: ['energy can be destroyed', 'energy is always created', 'energy changes form but total stays constant', 'energy slowly decreases over time until it is gone'], correctIndex: 2, explain: 'First law of thermodynamics — energy is converted, not lost or gained.' },
        { prompt: 'Which object falls FASTER on the Moon in a vacuum?', options: ['a feather', 'a hammer', 'both fall at the same rate', 'neither falls without any air'], correctIndex: 2, explain: 'No air resistance → all objects accelerate equally under gravity. Apollo 15 demonstrated this.' }
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
        { prompt: 'A SHORT CIRCUIT happens when...', options: ['the battery dies', 'current bypasses the load with very low resistance', 'a switch is open', 'a fuse blows on purpose to protect the whole circuit'], correctIndex: 1, explain: 'Low-resistance bypass → very high current → heat → fire risk.' },
        { prompt: 'A resistor\'s job is to...', options: ['store energy', 'limit current flow', 'amplify voltage', 'switch automatically'], correctIndex: 1, explain: 'Resistors convert electrical energy into heat, limiting current.' },
        { prompt: 'Power dissipated by a resistor (in watts) = ?', options: ['V × I', 'V + I', 'V / I', 'V − I'], correctIndex: 0, explain: 'P = V × I (also P = I²R or V²/R via Ohm\'s law).' }
      ]
    }
  ];
  // Move each question's correct answer onto a cycling target slot. As
  // authored, 58% of 248 answers across the 39 challenge banks sat at index 1; the position scanner had excused this file on phantom
  // arithmetic (any `* n + m %` expression counts as a "rotation"), so the
  // bias shipped. Slot-targeted rather than a fixed shift so the distribution
  // is exactly uniform; runs once at module load so the order is stable across
  // renders, sessions and exports. Same pattern as economicslab / galaxy /
  // advocacy.
  (function () {
    var SLOTS = [0, 2, 1, 3];
    var counter = 0;
    SPELLBOOK.forEach(function (sage) {
      ((sage && sage.challengeBank) || []).forEach(function (item) {
        if (!item || !Array.isArray(item.options) || typeof item.correctIndex !== 'number') return;
        var len = item.options.length;
        if (len < 2 || item.correctIndex < 0 || item.correctIndex >= len) return;
        var target = SLOTS[counter++ % SLOTS.length] % len;
        var shift = (item.correctIndex - target + len) % len;
        if (!shift) return;
        item.options = item.options.slice(shift).concat(item.options.slice(0, shift));
        item.correctIndex = target;
      });
    });
  })();


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

  // Returns the full question pool for a spell: static bank + cached AI + offline generated bank.
  function getMergedBank(spell, aiCache, offlineCache) {
    if (!spell) return [];
    var staticBank = Array.isArray(spell.challengeBank) ? spell.challengeBank : [];
    var aiBank = (aiCache && Array.isArray(aiCache[spell.id])) ? aiCache[spell.id] : [];
    var offlineBank = (offlineCache && Array.isArray(offlineCache[spell.id])) ? offlineCache[spell.id] : [];
    if (aiBank.length === 0 && offlineBank.length === 0) return staticBank;
    var seen = {};
    var out = [];
    staticBank.concat(aiBank).concat(offlineBank).forEach(function(q) {
      if (!q || typeof q.prompt !== 'string' || !Array.isArray(q.options) || q.options.length < 2) return;
      if (seen[q.prompt]) return;
      seen[q.prompt] = true;
      out.push(q);
    });
    return out;
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
  //   plus: aiGenerated / offlineGenerated questions get +0.3 to surface variety
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
      // Generated questions get a small variety boost so the merged bank doesn't
      // ignore them once SRS has accumulated stats on static questions.
      if (qq.aiGenerated || qq.offlineGenerated) w += 0.3;
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
  // ALLOBOTSAGE_ENGINE — Pure deterministic offline synthesizer,
  // per-distractor misconception diagnosis, & calibration analytics
  // (Zero React / zero DOM — exported as _engine & window.AlloBotSagePure)
  // ═══════════════════════════════════════════════════════════════
  function _sageHash(str) {
    var hVal = 2166136261 >>> 0;
    var txt = String(str || '');
    for (var i = 0; i < txt.length; i++) {
      hVal ^= txt.charCodeAt(i);
      hVal = Math.imul(hVal, 16777619) >>> 0;
    }
    return hVal >>> 0;
  }

  function _sagePrng(seedNum) {
    var state = (seedNum >>> 0) || 1;
    return function() {
      state = (state + 0x6D2B79F5) >>> 0;
      var z = Math.imul(state ^ (state >>> 15), 1 | state);
      z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
      return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
  }

  function _sageGcd(a, b) {
    var x = Math.abs(Math.round(a));
    var y = Math.abs(Math.round(b));
    while (y !== 0) {
      var tmp = x % y;
      x = y;
      y = tmp;
    }
    return x || 1;
  }

  function _sageFrac(n, d) {
    var g = _sageGcd(n, d);
    var sn = Math.round(n / g);
    var sd = Math.round(d / g);
    return sd === 1 ? String(sn) : (sn + '/' + sd);
  }

  function _sageRandInt(rng, lo, hi) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  function _sageClassifyDomain(spell) {
    var id = (spell && spell.id) ? String(spell.id) : '';
    var src = (spell && spell.sourceTool) ? String(spell.sourceTool) : '';
    var el = (spell && spell.element) ? String(spell.element) : '';
    if (id === 'fraction_fire') return 'math_fractions';
    if (id === 'algebra_arc') return 'math_algebra';
    if (id === 'geometry_grasp') return 'math_geometry';
    if (id === 'probability_pulse' || id === 'statistic_strike') return 'math_stats';
    if (id === 'voltage_verse' || src === 'circuit') return 'physics_circuits';
    if (id === 'prism_proof' || src === 'physics' || el === 'light') return 'physics_conservation';
    if (src === 'spaceExplorer' || el === 'gravity') return 'space_astronomy';
    if (src === 'ecosystem' || src === 'aquarium' || src === 'anatomy' || src === 'behaviorLab' || el === 'life' || el === 'water' || el === 'body') return 'ecology_biology';
    if (src === 'roadReady') return 'road_kinematics';
    if (src === 'typingPractice' || el === 'precision' || el === 'focus' || el === 'logic') return 'logic_cs';
    if (src === 'artStudio' || src === 'music' || el === 'color') return 'arts_acoustics';
    if (src === 'wordSounds' || src === 'writeCraft' || src === 'immersiveReader' || el === 'word' || el === 'sound' || el === 'mind') return 'literacy_logic';
    if (src === 'mathLab') return 'math_fractions';
    return 'mixed_stem';
  }

  function _sageBuildQuestion(prompt, correctText, distractorSpecs, explain, targetSlot, domain) {
    var used = {};
    used[String(correctText)] = true;
    var cleanDistractors = [];
    for (var i = 0; i < distractorSpecs.length && cleanDistractors.length < 3; i++) {
      var spec = distractorSpecs[i];
      if (!spec) continue;
      var txt = String(spec.text);
      if (!txt || used[txt]) continue;
      used[txt] = true;
      cleanDistractors.push({ text: txt, whyNot: String(spec.whyNot || '') });
    }
    var fallbackIdx = 1;
    while (cleanDistractors.length < 3) {
      var cand = String(correctText) + ' (' + fallbackIdx + ')';
      fallbackIdx++;
      if (!used[cand]) {
        used[cand] = true;
        cleanDistractors.push({ text: cand, whyNot: 'This alternative does not satisfy the target relationship.' });
      }
    }
    var slot = ((targetSlot % 4) + 4) % 4;
    var options = [];
    var whyNot = [];
    var dCursor = 0;
    for (var pos = 0; pos < 4; pos++) {
      if (pos === slot) {
        options.push(String(correctText));
        whyNot.push(null);
      } else {
        options.push(cleanDistractors[dCursor].text);
        whyNot.push(cleanDistractors[dCursor].whyNot);
        dCursor++;
      }
    }
    return {
      prompt: String(prompt),
      options: options,
      correctIndex: slot,
      explain: String(explain),
      whyNot: whyNot,
      offlineGenerated: true,
      domain: domain
    };
  }

  function _sageGenMathFractions(rng, variant, slot) {
    if (variant === 0) {
      var baseNum = _sageRandInt(rng, 2, 5);
      var baseDen = baseNum + _sageRandInt(rng, 2, 5);
      var g0 = _sageGcd(baseNum, baseDen);
      baseNum = Math.round(baseNum / g0);
      baseDen = Math.round(baseDen / g0);
      var scale = _sageRandInt(rng, 2, 6);
      var ans = (baseNum * scale) + '/' + (baseDen * scale);
      return _sageBuildQuestion(
        'Which fraction is equivalent to ' + baseNum + '/' + baseDen + ' when scaled by a factor of ' + scale + '?',
        ans,
        [
          { text: (baseNum + scale) + '/' + (baseDen + scale), whyNot: 'Adding ' + scale + ' to both numerator and denominator changes the ratio instead of keeping the fraction equivalent.' },
          { text: (baseDen * scale) + '/' + (baseNum * scale), whyNot: 'Swapping numerator and denominator forms the reciprocal rather than an equivalent value.' },
          { text: (baseNum * scale) + '/' + baseDen, whyNot: 'Multiplying only the numerator scales the fraction\'s value by ' + scale + ' instead of keeping it equal.' }
        ],
        'Multiplying both numerator and denominator by ' + scale + ' multiplies by ' + scale + '/' + scale + ' = 1, giving ' + ans + '.',
        slot, 'math_fractions'
      );
    }
    if (variant === 1) {
      var partA = _sageRandInt(rng, 2, 5);
      var partB = partA + _sageRandInt(rng, 1, 4);
      var mult = _sageRandInt(rng, 2, 7);
      var givenA = partA * mult;
      var ansB = partB * mult;
      return _sageBuildQuestion(
        'A potion mixes ' + partA + ' parts stardust to ' + partB + ' parts crystal. For ' + givenA + ' parts stardust, how many parts crystal keep the same ratio?',
        String(ansB),
        [
          { text: String(partB + (givenA - partA)), whyNot: 'Adding the difference (' + (givenA - partA) + ') breaks proportional scaling; ratios must be multiplied by the same factor (' + mult + ').' },
          { text: String(givenA), whyNot: 'Using ' + givenA + ' forces a 1:1 ratio instead of preserving ' + partA + ':' + partB + '.' },
          { text: String(partB * (mult + 1)), whyNot: 'Scaling crystal by ' + (mult + 1) + ' while stardust scales by ' + mult + ' overshoots the ' + partA + ':' + partB + ' proportion.' }
        ],
        'Since ' + givenA + ' \u00f7 ' + partA + ' = ' + mult + ', multiply ' + partB + ' by ' + mult + ' to keep the ratio constant: ' + ansB + ' parts crystal.',
        slot, 'math_fractions'
      );
    }
    if (variant === 2) {
      var d1 = _sageRandInt(rng, 2, 5);
      var d2 = d1 + _sageRandInt(rng, 1, 4);
      var ansSum = _sageFrac(d1 + d2, d1 * d2);
      return _sageBuildQuestion(
        'What is 1/' + d1 + ' + 1/' + d2 + ' in simplest form?',
        ansSum,
        [
          { text: _sageFrac(2, d1 + d2), whyNot: 'Adding numerators and denominators straight across (2/(' + d1 + '+' + d2 + ')) skips finding a common denominator.' },
          { text: '1/' + (d1 * d2), whyNot: '1/' + (d1 * d2) + ' is the product (1/' + d1 + ' \u00d7 1/' + d2 + '), not the sum.' },
          { text: _sageFrac(d1 + d2, d1 * d2 + 1), whyNot: 'The shared denominator is ' + d1 + ' \u00d7 ' + d2 + ' = ' + (d1 * d2) + ', giving (' + d2 + ' + ' + d1 + ')/' + (d1 * d2) + ' = ' + ansSum + '.' }
        ],
        'Convert to common denominator ' + (d1 * d2) + ': ' + d2 + '/' + (d1 * d2) + ' + ' + d1 + '/' + (d1 * d2) + ' = ' + ansSum + '.',
        slot, 'math_fractions'
      );
    }
    if (variant === 3) {
      var den = _sageRandInt(rng, 3, 8);
      var num = _sageRandInt(rng, 1, den - 1);
      var g1 = _sageGcd(num, den);
      num = Math.round(num / g1);
      den = Math.round(den / g1);
      var unit = _sageRandInt(rng, 2, 7);
      var whole = den * unit;
      var ansVal = num * unit;
      return _sageBuildQuestion(
        'What is ' + num + '/' + den + ' of ' + whole + '?',
        String(ansVal),
        [
          { text: String(whole - num), whyNot: 'Subtracting ' + num + ' treats a fraction of a quantity like subtraction instead of splitting into ' + den + ' equal parts.' },
          { text: String(num * den), whyNot: 'Multiplying numerator by denominator ignores the whole amount (' + whole + ').' },
          { text: String((num + 1) * unit), whyNot: 'Each 1/' + den + ' share equals ' + unit + ', so ' + (num + 1) + ' shares overshoots ' + num + '/' + den + '.' }
        ],
        'Split ' + whole + ' into ' + den + ' equal parts (' + unit + ' each), then take ' + num + ' parts: ' + num + ' \u00d7 ' + unit + ' = ' + ansVal + '.',
        slot, 'math_fractions'
      );
    }
    var pctPool = [20, 25, 40, 60, 75, 80, 30, 70, 90, 10];
    var pct = pctPool[_sageRandInt(rng, 0, pctPool.length - 1)];
    var ansFrac = _sageFrac(pct, 100);
    var compFrac = _sageFrac(100 - pct, 100);
    var parts = ansFrac.split('/');
    var flipped = parts.length === 2 ? (parts[1] + '/' + parts[0]) : (ansFrac + '/10');
    return _sageBuildQuestion(
      'Which simplified fraction is equal to ' + pct + '%?',
      ansFrac,
      [
        { text: compFrac, whyNot: compFrac + ' equals ' + (100 - pct) + '% (the leftover complement), not ' + pct + '%.' },
        { text: flipped, whyNot: 'Flipping the fraction creates a value greater than 1 (>100%), whereas ' + pct + '% is less than 1 whole.' },
        { text: pct + '/10', whyNot: 'Percent means parts per 100 (not parts per 10), so dividing by 10 makes the value tenfold too large.' }
      ],
      pct + '% means ' + pct + '/100, which simplifies to ' + ansFrac + '.',
      slot, 'math_fractions'
    );
  }

  function _sageGenMathAlgebra(rng, variant, slot) {
    if (variant === 0) {
      var a = _sageRandInt(rng, 2, 6);
      var x = _sageRandInt(rng, 2, 9);
      var b = _sageRandInt(rng, 2, 12);
      var c = a * x + b;
      return _sageBuildQuestion(
        'Solve for x: ' + a + 'x + ' + b + ' = ' + c,
        'x = ' + x,
        [
          { text: 'x = ' + Math.round((c + b) / a), whyNot: 'Adding ' + b + ' to ' + c + ' goes the wrong way; use the inverse operation and subtract ' + b + ' first.' },
          { text: 'x = ' + (c - b), whyNot: (c - b) + ' equals ' + a + 'x before dividing both sides by ' + a + '.' },
          { text: 'x = ' + (x + 2), whyNot: 'Substituting x = ' + (x + 2) + ' gives ' + (a * (x + 2) + b) + ', which does not balance ' + c + '.' }
        ],
        'Subtract ' + b + ' from both sides (' + a + 'x = ' + (c - b) + '), then divide by ' + a + ' to get x = ' + x + '.',
        slot, 'math_algebra'
      );
    }
    if (variant === 1) {
      var base = _sageRandInt(rng, 2, 5);
      var exp = _sageRandInt(rng, 2, 3);
      var off = _sageRandInt(rng, 2, 9);
      var powVal = Math.pow(base, exp);
      var ans = powVal + off;
      var expSym = exp === 2 ? '\u00b2' : '\u00b3';
      return _sageBuildQuestion(
        'Evaluate ' + base + expSym + ' + ' + off + '.',
        String(ans),
        [
          { text: String(base * exp + off), whyNot: 'An exponent means repeated multiplication (' + base + expSym + ' = ' + powVal + '), not ' + base + ' \u00d7 ' + exp + '.' },
          { text: String(powVal), whyNot: powVal + ' evaluates ' + base + expSym + ' only, omitting the + ' + off + ' term.' },
          { text: String(powVal - off), whyNot: 'Subtracting ' + off + ' flips the + sign in the expression.' }
        ],
        'Evaluate the power first (' + base + expSym + ' = ' + powVal + '), then add ' + off + ' to get ' + ans + '.',
        slot, 'math_algebra'
      );
    }
    if (variant === 2) {
      var k = _sageRandInt(rng, 2, 7);
      var m = _sageRandInt(rng, 2, 8);
      var ansExpr = k + 'x + ' + (k * m);
      return _sageBuildQuestion(
        'Expand using the distributive property: ' + k + '(x + ' + m + ')',
        ansExpr,
        [
          { text: k + 'x + ' + m, whyNot: 'Leaving +' + m + ' unchanged forgets to distribute ' + k + ' to the second term inside parentheses.' },
          { text: k + 'x + ' + (k + m), whyNot: 'The distributive property multiplies ' + k + ' \u00d7 ' + m + ' = ' + (k * m) + ', rather than adding ' + k + ' + ' + m + '.' },
          { text: (k + m) + 'x', whyNot: 'Unlike terms x and ' + m + ' cannot be combined into a single coefficient before multiplying.' }
        ],
        'Multiply ' + k + ' by both terms inside parentheses: ' + k + '\u00b7x + ' + k + '\u00b7' + m + ' = ' + ansExpr + '.',
        slot, 'math_algebra'
      );
    }
    if (variant === 3) {
      var slope = _sageRandInt(rng, 2, 6);
      var yInt = _sageRandInt(rng, 1, 7);
      var dx = _sageRandInt(rng, 2, 5);
      var y2 = yInt + slope * dx;
      return _sageBuildQuestion(
        'A line passes through (0, ' + yInt + ') and (' + dx + ', ' + y2 + '). What is its slope?',
        String(slope),
        [
          { text: String(yInt), whyNot: yInt + ' is the y-intercept (starting height at x = 0), not the slope (rate of change).' },
          { text: String(slope * dx), whyNot: (slope * dx) + ' is only the vertical rise (' + y2 + ' \u2212 ' + yInt + ') without dividing by the horizontal run (' + dx + ').' },
          { text: _sageFrac(dx, slope * dx), whyNot: 'Dividing run by rise inverts the slope formula; slope is rise \u00f7 run.' }
        ],
        'Slope = (y\u2082 \u2212 y\u2081) \u00f7 (x\u2082 \u2212 x\u2081) = (' + y2 + ' \u2212 ' + yInt + ') \u00f7 ' + dx + ' = ' + slope + '.',
        slot, 'math_algebra'
      );
    }
    var div = _sageRandInt(rng, 3, 8);
    var quot = _sageRandInt(rng, 4, 11);
    var prod = div * quot;
    return _sageBuildQuestion(
      'Solve for n: n \u00f7 ' + div + ' = ' + quot,
      'n = ' + prod,
      [
        { text: 'n = ' + (quot + div), whyNot: 'Adding ' + div + ' does not undo division; multiplication is the inverse of division.' },
        { text: 'n = ' + Math.max(1, quot - div), whyNot: 'Subtracting ' + div + ' shrinks n instead of undoing division by ' + div + '.' },
        { text: 'n = ' + (div * (quot + 1)), whyNot: (div * (quot + 1)) + ' \u00f7 ' + div + ' = ' + (quot + 1) + ', which is 1 too high.' }
      ],
      'Multiply both sides by ' + div + ' to undo division: n = ' + quot + ' \u00d7 ' + div + ' = ' + prod + '.',
      slot, 'math_algebra'
    );
  }

  function _sageGenMathGeometry(rng, variant, slot) {
    if (variant === 0) {
      var b = _sageRandInt(rng, 2, 7) * 2;
      var ht = _sageRandInt(rng, 3, 9);
      var area = (b * ht) / 2;
      return _sageBuildQuestion(
        'What is the area of a triangle with base ' + b + ' cm and height ' + ht + ' cm?',
        area + ' cm\u00b2',
        [
          { text: (b * ht) + ' cm\u00b2', whyNot: (b * ht) + ' cm\u00b2 is base \u00d7 height (a full rectangle), forgetting the 1/2 factor for a triangle.' },
          { text: (b + ht) + ' cm\u00b2', whyNot: 'Adding base and height combines linear edges instead of computing two-dimensional area.' },
          { text: (2 * (b + ht)) + ' cm\u00b2', whyNot: '2(b + h) computes a rectangle\'s perimeter, not a triangle\'s area.' }
        ],
        'Triangle area = \u00bd \u00d7 base \u00d7 height = \u00bd \u00d7 ' + b + ' \u00d7 ' + ht + ' = ' + area + ' cm\u00b2.',
        slot, 'math_geometry'
      );
    }
    if (variant === 1) {
      var a1 = _sageRandInt(rng, 25, 75);
      var a2 = _sageRandInt(rng, 30, 80);
      var a3 = 180 - a1 - a2;
      return _sageBuildQuestion(
        'Two interior angles of a triangle measure ' + a1 + '\u00b0 and ' + a2 + '\u00b0. What is the third angle?',
        a3 + '\u00b0',
        [
          { text: (360 - a1 - a2) + '\u00b0', whyNot: '360\u00b0 is the angle sum of a quadrilateral; a triangle\'s interior angles sum to 180\u00b0.' },
          { text: (a1 + a2) + '\u00b0', whyNot: (a1 + a2) + '\u00b0 is the sum of the first two angles, before subtracting from 180\u00b0.' },
          { text: Math.abs(a1 - a2) + '\u00b0', whyNot: 'Subtracting the two known angles does not make all three angles total 180\u00b0.' }
        ],
        'Interior angles of any triangle sum to 180\u00b0: 180\u00b0 \u2212 (' + a1 + '\u00b0 + ' + a2 + '\u00b0) = ' + a3 + '\u00b0.',
        slot, 'math_geometry'
      );
    }
    if (variant === 2) {
      var scale = _sageRandInt(rng, 1, 5);
      var leg1 = 3 * scale;
      var leg2 = 4 * scale;
      var hyp = 5 * scale;
      return _sageBuildQuestion(
        'A right triangle has legs of ' + leg1 + ' m and ' + leg2 + ' m. How long is the hypotenuse?',
        hyp + ' m',
        [
          { text: (leg1 + leg2) + ' m', whyNot: 'Adding legs (' + leg1 + ' + ' + leg2 + ') breaks the Pythagorean theorem; use a\u00b2 + b\u00b2 = c\u00b2, not a + b = c.' },
          { text: (hyp * hyp) + ' m', whyNot: (hyp * hyp) + ' equals c\u00b2 before taking the square root to find c.' },
          { text: (6 * scale) + ' m', whyNot: 'Check ' + leg1 + '\u00b2 + ' + leg2 + '\u00b2 = ' + (hyp * hyp) + ', whose square root is ' + hyp + ', not ' + (6 * scale) + '.' }
        ],
        'By the Pythagorean theorem: \u221a(' + leg1 + '\u00b2 + ' + leg2 + '\u00b2) = \u221a' + (hyp * hyp) + ' = ' + hyp + ' m.',
        slot, 'math_geometry'
      );
    }
    if (variant === 3) {
      var len = _sageRandInt(rng, 4, 11);
      var wid = _sageRandInt(rng, 2, 7);
      if (len === wid) len += 2;
      var perim = 2 * (len + wid);
      return _sageBuildQuestion(
        'A rectangular garden is ' + len + ' m long and ' + wid + ' m wide. What is its perimeter?',
        perim + ' m',
        [
          { text: (len * wid) + ' m', whyNot: (len * wid) + ' is the area (length \u00d7 width), not the perimeter around the edges.' },
          { text: (len + wid) + ' m', whyNot: (len + wid) + ' m counts only one length and one width instead of all four sides.' },
          { text: (2 * len + wid) + ' m', whyNot: 'Counting only one width omits the opposite edge of the rectangle.' }
        ],
        'Perimeter sums all four sides: 2 \u00d7 (' + len + ' + ' + wid + ') = ' + perim + ' m.',
        slot, 'math_geometry'
      );
    }
    var ang = _sageRandInt(rng, 22, 78);
    var supp = 180 - ang;
    return _sageBuildQuestion(
      'Two angles are supplementary. If one measures ' + ang + '\u00b0, what is the other angle?',
      supp + '\u00b0',
      [
        { text: (90 - ang) + '\u00b0', whyNot: (90 - ang) + '\u00b0 is the complementary angle (summing to 90\u00b0); supplementary angles sum to 180\u00b0.' },
        { text: (360 - ang) + '\u00b0', whyNot: '360\u00b0 is a full rotation, whereas supplementary angles form a straight 180\u00b0 line.' },
        { text: ang + '\u00b0', whyNot: 'Equal angles are supplementary only when both equal 90\u00b0; ' + ang + '\u00b0 + ' + ang + '\u00b0 = ' + (2 * ang) + '\u00b0.' }
      ],
      'Supplementary angles sum to 180\u00b0, so 180\u00b0 \u2212 ' + ang + '\u00b0 = ' + supp + '\u00b0.',
      slot, 'math_geometry'
    );
  }

  function _sageGenMathStats(rng, variant, slot) {
    if (variant === 0) {
      var red = _sageRandInt(rng, 2, 5);
      var blue = _sageRandInt(rng, 2, 5);
      var green = _sageRandInt(rng, 1, 4);
      var tot = red + blue + green;
      var ans = _sageFrac(red, tot);
      return _sageBuildQuestion(
        'A pouch holds ' + red + ' red, ' + blue + ' blue, and ' + green + ' green runes. What is P(red) on one random draw?',
        ans,
        [
          { text: _sageFrac(red, blue + green), whyNot: 'Dividing red by non-red compares part-to-part instead of favorable outcomes over total outcomes (' + tot + ').' },
          { text: _sageFrac(blue + green, tot), whyNot: 'That is the probability of NOT drawing a red rune (the complement).' },
          { text: '1/' + red, whyNot: 'Putting the count of red runes in the denominator shrinks probability as red runes increase.' }
        ],
        'Probability = favorable \u00f7 total = ' + red + '/' + tot + ' = ' + ans + '.',
        slot, 'math_stats'
      );
    }
    if (variant === 1) {
      var mBase = _sageRandInt(rng, 6, 15);
      var dA = _sageRandInt(rng, 1, 4);
      var dB = _sageRandInt(rng, 2, 5);
      var nums = [mBase - dB, mBase - dA, mBase + dA, mBase + dB];
      var sum4 = mBase * 4;
      var range4 = (mBase + dB) - (mBase - dB);
      return _sageBuildQuestion(
        'What is the mean (average) of the dataset [' + nums.join(', ') + ']?',
        String(mBase),
        [
          { text: String(sum4), whyNot: sum4 + ' is the total sum before dividing by the 4 data points.' },
          { text: String(range4), whyNot: range4 + ' is the range (maximum minus minimum), not the arithmetic mean.' },
          { text: String(mBase + dB), whyNot: (mBase + dB) + ' is the largest value (maximum), not the center average.' }
        ],
        'Sum the 4 values (' + sum4 + ') and divide by 4: ' + sum4 + ' \u00f7 4 = ' + mBase + '.',
        slot, 'math_stats'
      );
    }
    if (variant === 2) {
      var s0 = _sageRandInt(rng, 2, 6);
      var s1 = s0 + _sageRandInt(rng, 2, 4);
      var med = s1 + _sageRandInt(rng, 2, 5);
      var s3 = med + _sageRandInt(rng, 2, 5);
      var s4 = s3 + _sageRandInt(rng, 2, 6);
      var unsorted = [s3, s0, s4, med, s1];
      return _sageBuildQuestion(
        'What is the median of the values [' + unsorted.join(', ') + ']?',
        String(med),
        [
          { text: String(s4), whyNot: s4 + ' sits in the middle only BEFORE sorting; you must order values from least to greatest first.' },
          { text: String(s4 - s0), whyNot: (s4 - s0) + ' is the range (spread), not the middle value (median).' },
          { text: String(s1), whyNot: 'Sorted order is [' + [s0, s1, med, s3, s4].join(', ') + '], so ' + s1 + ' is the 2nd value, not the middle (3rd).' }
        ],
        'Sort first: [' + [s0, s1, med, s3, s4].join(', ') + ']. The middle (3rd) value is ' + med + '.',
        slot, 'math_stats'
      );
    }
    if (variant === 3) {
      var sides = [4, 6, 8, 10][_sageRandInt(rng, 0, 3)];
      var ansInd = '1/' + (2 * sides);
      return _sageBuildQuestion(
        'You flip a fair coin and roll a fair ' + sides + '-sided die. What is P(Heads AND rolling a 1)?',
        ansInd,
        [
          { text: _sageFrac(sides + 2, 2 * sides), whyNot: 'Adding 1/2 + 1/' + sides + ' applies to mutually exclusive OR events; independent AND events multiply.' },
          { text: '1/' + sides, whyNot: '1/' + sides + ' accounts only for the die and ignores the 1/2 coin-flip probability.' },
          { text: _sageFrac(2, sides), whyNot: 'Multiplying by 2 increases probability instead of taking half of 1/' + sides + '.' }
        ],
        'For independent events, multiply probabilities: (1/2) \u00d7 (1/' + sides + ') = ' + ansInd + '.',
        slot, 'math_stats'
      );
    }
    var loV = _sageRandInt(rng, 3, 12);
    var hiV = loV + _sageRandInt(rng, 8, 22);
    var mid1 = loV + _sageRandInt(rng, 2, 5);
    var mid2 = hiV - _sageRandInt(rng, 2, 5);
    var rngAns = hiV - loV;
    return _sageBuildQuestion(
      'What is the range of the dataset [' + [mid2, loV, hiV, mid1].join(', ') + ']?',
      String(rngAns),
      [
        { text: String(hiV + loV), whyNot: 'Range measures spread via max \u2212 min, not max + min.' },
        { text: String(Math.round((hiV + loV) / 2)), whyNot: 'Averaging the extremes gives the midrange rather than the total spread.' },
        { text: String(mid2 - mid1), whyNot: 'Range uses the overall maximum (' + hiV + ') and minimum (' + loV + '), not inner values.' }
      ],
      'Range = maximum \u2212 minimum = ' + hiV + ' \u2212 ' + loV + ' = ' + rngAns + '.',
      slot, 'math_stats'
    );
  }

  function _sageGenPhysics(rng, variant, slot, isCircuit) {
    if (variant === 0 || (isCircuit && variant === 3)) {
      var cur = _sageRandInt(rng, 2, 6);
      var res = _sageRandInt(rng, 3, 12);
      var volt = cur * res;
      return _sageBuildQuestion(
        'A circuit draws ' + cur + ' A of current through a ' + res + ' \u03a9 resistor. By Ohm\u2019s law, what voltage is across the resistor?',
        volt + ' V',
        [
          { text: (cur + res) + ' V', whyNot: 'Ohm\u2019s law multiplies current by resistance (V = I \u00d7 R); you cannot add amps and ohms.' },
          { text: _sageFrac(res, cur) + ' V', whyNot: 'Dividing R by I inverts Ohm\u2019s law; higher current through a resistor requires higher voltage.' },
          { text: _sageFrac(cur, res) + ' V', whyNot: 'Dividing I by R gives the wrong relationship; V = I \u00d7 R.' }
        ],
        'Ohm\u2019s law: V = I \u00d7 R = ' + cur + ' A \u00d7 ' + res + ' \u03a9 = ' + volt + ' V.',
        slot, isCircuit ? 'physics_circuits' : 'physics_conservation'
      );
    }
    if (variant === 1) {
      var vP = _sageRandInt(rng, 4, 12);
      var iP = _sageRandInt(rng, 2, 5);
      var watts = vP * iP;
      return _sageBuildQuestion(
        'A lamp runs at ' + vP + ' V and draws ' + iP + ' A. How much electrical power does it use?',
        watts + ' W',
        [
          { text: (vP + iP) + ' W', whyNot: 'Electrical power is P = V \u00d7 I, not V + I.' },
          { text: _sageFrac(vP, iP) + ' W', whyNot: 'V \u00f7 I computes resistance in ohms, not power in watts.' },
          { text: Math.max(1, vP - iP) + ' W', whyNot: 'Subtracting current from voltage mixes different physical units.' }
        ],
        'Electrical power P = V \u00d7 I = ' + vP + ' V \u00d7 ' + iP + ' A = ' + watts + ' W.',
        slot, isCircuit ? 'physics_circuits' : 'physics_conservation'
      );
    }
    if (variant === 2) {
      var totE = _sageRandInt(rng, 6, 15) * 10;
      var remPe = _sageRandInt(rng, 1, Math.floor(totE / 10) - 2) * 10;
      var ke = totE - remPe;
      return _sageBuildQuestion(
        'A frictionless coaster starts with ' + totE + ' J of potential energy and 0 J of kinetic energy. When potential energy drops to ' + remPe + ' J, what is its kinetic energy?',
        ke + ' J',
        [
          { text: (totE + remPe) + ' J', whyNot: 'Adding ' + remPe + ' J to ' + totE + ' J would create extra energy, violating energy conservation.' },
          { text: remPe + ' J', whyNot: 'KE equals PE only at the exact midpoint (' + (totE / 2) + ' J), not at ' + remPe + ' J.' },
          { text: '0 J', whyNot: 'Without friction, lost potential energy converts into kinetic energy rather than vanishing.' }
        ],
        'Conservation of mechanical energy: PE + KE = ' + totE + ' J, so KE = ' + totE + ' \u2212 ' + remPe + ' = ' + ke + ' J.',
        slot, 'physics_conservation'
      );
    }
    if (variant === 3) {
      var mass = _sageRandInt(rng, 2, 9);
      var accel = _sageRandInt(rng, 2, 7);
      var force = mass * accel;
      return _sageBuildQuestion(
        'What net force accelerates a ' + mass + ' kg probe at ' + accel + ' m/s\u00b2?',
        force + ' N',
        [
          { text: (mass + accel) + ' N', whyNot: 'Newton\u2019s second law is F = m \u00d7 a, not m + a.' },
          { text: _sageFrac(mass, accel) + ' N', whyNot: 'Dividing mass by acceleration predicts less force for larger acceleration, reversing F = ma.' },
          { text: (force * 2) + ' N', whyNot: 'Doubling m \u00d7 a overestimates force; 1 N accelerates 1 kg at 1 m/s\u00b2.' }
        ],
        'Newton\u2019s second law: F = m \u00d7 a = ' + mass + ' kg \u00d7 ' + accel + ' m/s\u00b2 = ' + force + ' N.',
        slot, 'physics_conservation'
      );
    }
    var spd = _sageRandInt(rng, 3, 12);
    var dur = _sageRandInt(rng, 4, 9);
    var dist = spd * dur;
    return _sageBuildQuestion(
      'A glider travels at a steady ' + spd + ' m/s for ' + dur + ' seconds. How far does it travel?',
      dist + ' m',
      [
        { text: (spd + dur) + ' m', whyNot: 'Distance equals speed \u00d7 time; adding m/s and seconds mixes incompatible units.' },
        { text: _sageFrac(spd, dur) + ' m', whyNot: 'Dividing speed by time calculates acceleration (m/s\u00b2), not distance (m).' },
        { text: Math.abs(spd - dur) + ' m', whyNot: 'Subtracting time from speed does not accumulate meters traveled per second.' }
      ],
      'At constant speed, distance = speed \u00d7 time = ' + spd + ' m/s \u00d7 ' + dur + ' s = ' + dist + ' m.',
      slot, 'physics_conservation'
    );
  }

  function _sageGenSpace(rng, variant, slot) {
    if (variant === 0) {
      var roverM = _sageRandInt(rng, 10, 40) * 5;
      var grav = [2, 4, 8, 10][_sageRandInt(rng, 0, 3)];
      var weight = roverM * grav;
      return _sageBuildQuestion(
        'A rover has a mass of ' + roverM + ' kg. On a moon with surface gravity ' + grav + ' m/s\u00b2, what is its weight and mass?',
        weight + ' N; mass stays ' + roverM + ' kg',
        [
          { text: weight + ' N; mass drops to ' + Math.round(roverM / 2) + ' kg', whyNot: 'Mass is the amount of matter and stays constant everywhere; only weight changes with gravity.' },
          { text: (roverM + grav) + ' N; mass stays ' + roverM + ' kg', whyNot: 'Weight is mass \u00d7 gravity (W = mg), not mass + gravity.' },
          { text: roverM + ' N; weight never changes', whyNot: 'Weight depends on local gravitational acceleration g, so it changes from world to world.' }
        ],
        'Weight W = m \u00d7 g = ' + roverM + ' \u00d7 ' + grav + ' = ' + weight + ' N, while mass remains ' + roverM + ' kg everywhere.',
        slot, 'space_astronomy'
      );
    }
    if (variant === 1) {
      var kDist = _sageRandInt(rng, 2, 5);
      var kSq = kDist * kDist;
      return _sageBuildQuestion(
        'If the distance between two moons increases by a factor of ' + kDist + ', their gravitational pull becomes:',
        '1/' + kSq + ' as strong',
        [
          { text: '1/' + kDist + ' as strong', whyNot: 'Gravity obeys an inverse-square law (1/r\u00b2), so it weakens faster than 1/r.' },
          { text: kSq + ' times stronger', whyNot: 'Moving bodies farther apart weakens gravitational attraction rather than strengthening it.' },
          { text: 'Unchanged', whyNot: 'Gravitational force decreases rapidly as the separation distance grows.' }
        ],
        'By Newton\u2019s inverse-square law (F \u221d 1/r\u00b2), scaling distance by ' + kDist + ' scales gravity by 1/' + kDist + '\u00b2 = 1/' + kSq + '.',
        slot, 'space_astronomy'
      );
    }
    if (variant === 2) {
      var secs = _sageRandInt(rng, 2, 9);
      var km = secs * 300000;
      return _sageBuildQuestion(
        'Light travels ~300,000 km/s in vacuum. Roughly how far does a laser pulse travel in ' + secs + ' seconds?',
        km.toLocaleString('en-US') + ' km',
        [
          { text: Math.round(300000 / secs).toLocaleString('en-US') + ' km', whyNot: 'Dividing speed by time shrinks distance as time grows; distance = speed \u00d7 time.' },
          { text: (secs * 30000).toLocaleString('en-US') + ' km', whyNot: 'That drops a factor of ten (30,000 km/s instead of 300,000 km/s).' },
          { text: (300000 + secs).toLocaleString('en-US') + ' km', whyNot: 'Speed (km/s) and time (s) must be multiplied, not added.' }
        ],
        'Distance = c \u00d7 t = 300,000 km/s \u00d7 ' + secs + ' s = ' + km.toLocaleString('en-US') + ' km.',
        slot, 'space_astronomy'
      );
    }
    if (variant === 3) {
      var innerAu = _sageRandInt(rng, 1, 3);
      var outerAu = innerAu + _sageRandInt(rng, 3, 8);
      return _sageBuildQuestion(
        'Exoplanet A orbits at ' + innerAu + ' AU and Exoplanet B orbits the same star at ' + outerAu + ' AU. Which completes an orbit faster?',
        'Exoplanet A (closer orbit)',
        [
          { text: 'Exoplanet B (farther orbit)', whyNot: 'Farther planets experience weaker stellar gravity and travel a longer orbital path, so they orbit slower.' },
          { text: 'Both take the exact same time', whyNot: 'Kepler\u2019s third law (P\u00b2 \u221d a\u00b3) ties orbital period strongly to orbital radius.' },
          { text: 'Only the more massive planet orbits faster', whyNot: 'Orbital speed around a much heavier star depends on orbital distance, not the planet\u2019s mass.' }
        ],
        'By Kepler\u2019s laws, closer orbits (' + innerAu + ' AU vs ' + outerAu + ' AU) have stronger gravity, higher speed, and shorter years.',
        slot, 'space_astronomy'
      );
    }
    var starPairs = [
      { hot: 'blue-white', cool: 'red' },
      { hot: 'blue', cool: 'orange' }
    ];
    var sp = starPairs[_sageRandInt(rng, 0, starPairs.length - 1)];
    return _sageBuildQuestion(
      'Between a ' + sp.hot + ' star and a ' + sp.cool + ' star of similar size, which has the higher surface temperature?',
      'The ' + sp.hot + ' star',
      [
        { text: 'The ' + sp.cool + ' star', whyNot: 'Even though red/orange feel warm in art, in physics shorter blue wavelengths come from much hotter surfaces.' },
        { text: 'Both always share the same temperature', whyNot: 'A star\u2019s peak color shifts directly with its surface temperature (Wien\u2019s law).' },
        { text: 'Color depends only on distance from Earth', whyNot: 'Intrinsic star color reflects photosphere temperature, not mere proximity.' }
      ],
      'Hotter objects peak at shorter, higher-energy wavelengths, so ' + sp.hot + ' stars are hotter than ' + sp.cool + ' stars.',
      slot, 'space_astronomy'
    );
  }

  function _sageGenEcology(rng, variant, slot) {
    if (variant === 0) {
      var prodE = _sageRandInt(rng, 2, 9) * 1000;
      var secE = Math.round(prodE / 100);
      return _sageBuildQuestion(
        'Producers capture ' + prodE + ' kcal of energy. Using the 10% trophic rule, about how much reaches secondary consumers (2 steps up)?',
        secE + ' kcal',
        [
          { text: Math.round(prodE / 10) + ' kcal', whyNot: Math.round(prodE / 10) + ' kcal is the primary-consumer level (1 step up), not secondary consumers (2 steps up).' },
          { text: prodE + ' kcal', whyNot: 'Roughly 90% of energy is lost as heat and metabolism at each step, so 100% never transfers.' },
          { text: Math.round(prodE / 2) + ' kcal', whyNot: 'Trophic transfers retain roughly 10% per level rather than 50%.' }
        ],
        'Two 10% steps: ' + prodE + ' \u2192 ' + Math.round(prodE / 10) + ' (primary) \u2192 ' + secE + ' kcal (secondary).',
        slot, 'ecology_biology'
      );
    }
    if (variant === 1) {
      var cap = _sageRandInt(rng, 4, 9) * 50;
      var over = cap + _sageRandInt(rng, 2, 4) * 50;
      return _sageBuildQuestion(
        'A reef\u2019s carrying capacity is ' + cap + ' fish, but the population spikes to ' + over + '. What happens next without new resources?',
        'Competition rises and population declines back toward ' + cap,
        [
          { text: 'Population keeps doubling indefinitely', whyNot: 'Limited food, oxygen, and shelter prevent exponential growth above carrying capacity.' },
          { text: 'Carrying capacity automatically doubles to ' + (cap * 2), whyNot: 'Overshooting a habitat\u2019s limit degrades resources rather than expanding them.' },
          { text: 'All predators immediately vanish', whyNot: 'Abundant prey tends to sustain or attract predators rather than eliminate them.' }
        ],
        'Above carrying capacity (' + cap + '), limiting factors tighten until births and deaths balance near ' + cap + '.',
        slot, 'ecology_biology'
      );
    }
    if (variant === 2) {
      return _sageBuildQuestion(
        'In a healthy aquarium nitrogen cycle, beneficial bacteria convert toxic ammonia (NH\u2083) into which sequence?',
        'Nitrite (NO\u2082\u207b) first, then less-toxic nitrate (NO\u2083\u207b)',
        [
          { text: 'Pure oxygen directly with no intermediate', whyNot: 'Nitrifying bacteria oxidize ammonia stepwise through nitrite to nitrate, not directly into oxygen.' },
          { text: 'Nitrate first, then back into ammonia', whyNot: 'That reverses the biological oxidation order; nitrite comes before nitrate.' },
          { text: 'Solid salt crystals that sink harmlessly', whyNot: 'Nitrogen waste stays dissolved as nitrogen compounds that plants or water changes remove.' }
        ],
        'Two groups of nitrifying bacteria convert ammonia \u2192 nitrite \u2192 nitrate, keeping fish safe.',
        slot, 'ecology_biology'
      );
    }
    if (variant === 3) {
      var hr = _sageRandInt(rng, 6, 10) * 10;
      var mins = _sageRandInt(rng, 2, 5);
      var beats = hr * mins;
      return _sageBuildQuestion(
        'A resting heart beats ' + hr + ' times per minute to circulate oxygenated blood. How many beats occur in ' + mins + ' minutes?',
        beats + ' beats',
        [
          { text: (hr + mins) + ' beats', whyNot: 'Rate (beats/min) and time (min) multiply; adding them mixes units.' },
          { text: Math.round(hr / mins) + ' beats', whyNot: 'Dividing heart rate by time shrinks total beats as time increases.' },
          { text: (beats + hr) + ' beats', whyNot: 'That counts ' + (mins + 1) + ' minutes instead of ' + mins + ' minutes.' }
        ],
        'Total beats = rate \u00d7 time = ' + hr + ' bpm \u00d7 ' + mins + ' min = ' + beats + ' beats.',
        slot, 'ecology_biology'
      );
    }
    return _sageBuildQuestion(
      'Buckling a seatbelt stops an annoying dashboard chime, so a driver buckles up more often. In behavior science, what is this?',
      'Negative reinforcement (removing an aversive stimulus increases behavior)',
      [
        { text: 'Positive punishment', whyNot: 'Punishment decreases a behavior, whereas buckling up becomes MORE frequent here.' },
        { text: 'Negative punishment', whyNot: 'Negative punishment removes a pleasant item to reduce behavior; removing an annoyance increases behavior.' },
        { text: 'Extinction', whyNot: 'Extinction weakens an unrewarded behavior over time rather than strengthening a habit.' }
      ],
      'Reinforcement always increases behavior; "negative" means removing an unpleasant stimulus (the chime).',
      slot, 'ecology_biology'
    );
  }

  function _sageGenRoad(rng, variant, slot) {
    if (variant === 0) {
      var fps = _sageRandInt(rng, 4, 9) * 10;
      var sec = _sageRandInt(rng, 3, 4);
      var gapFt = fps * sec;
      return _sageBuildQuestion(
        'At ' + fps + ' ft/s, how many feet do you cover during a safe ' + sec + '-second following gap?',
        gapFt + ' ft',
        [
          { text: (fps + sec) + ' ft', whyNot: 'Distance equals speed \u00d7 time, not speed + time.' },
          { text: Math.round(fps / sec) + ' ft', whyNot: 'Dividing speed by seconds underestimates the stopping buffer dramatically.' },
          { text: (fps * 2) + ' ft', whyNot: 'That only leaves a 2-second buffer instead of the full ' + sec + '-second gap.' }
        ],
        'Following distance = speed \u00d7 time = ' + fps + ' ft/s \u00d7 ' + sec + ' s = ' + gapFt + ' ft.',
        slot, 'road_kinematics'
      );
    }
    if (variant === 1) {
      var factor = _sageRandInt(rng, 2, 3);
      var sq = factor * factor;
      return _sageBuildQuestion(
        'If a vehicle\u2019s speed increases by a factor of ' + factor + ', its kinetic energy and braking distance scale by:',
        sq + '\u00d7',
        [
          { text: factor + '\u00d7', whyNot: 'Kinetic energy grows with the SQUARE of speed (KE = \u00bdmv\u00b2), not linearly.' },
          { text: (factor + 1) + '\u00d7', whyNot: 'Adding 1 underestimates quadratic scaling (' + factor + '\u00b2 = ' + sq + ').' },
          { text: '1/' + factor + '\u00d7', whyNot: 'Higher speed demands longer braking distance, never shorter.' }
        ],
        'Because kinetic energy scales with v\u00b2, ' + factor + '\u00d7 speed requires ' + factor + '\u00b2 = ' + sq + '\u00d7 braking distance.',
        slot, 'road_kinematics'
      );
    }
    if (variant === 2) {
      var mpg = _sageRandInt(rng, 5, 9) * 5;
      var gals = _sageRandInt(rng, 3, 8);
      var miles = mpg * gals;
      return _sageBuildQuestion(
        'A hybrid averages ' + mpg + ' miles per gallon. How many gallons are needed for a ' + miles + '-mile trip?',
        gals + ' gallons',
        [
          { text: (miles + mpg) + ' gallons', whyNot: 'Fuel needed equals distance \u00f7 mpg; adding miles and mpg mixes units.' },
          { text: (gals + 2) + ' gallons', whyNot: (gals + 2) + ' gallons at ' + mpg + ' mpg would cover ' + (mpg * (gals + 2)) + ' miles.' },
          { text: Math.max(1, gals - 1) + ' gallons', whyNot: Math.max(1, gals - 1) + ' gallons only reaches ' + (mpg * Math.max(1, gals - 1)) + ' miles, falling short.' }
        ],
        'Gallons = total miles \u00f7 mpg = ' + miles + ' \u00f7 ' + mpg + ' = ' + gals + ' gallons.',
        slot, 'road_kinematics'
      );
    }
    if (variant === 3) {
      var reactFt = _sageRandInt(rng, 4, 8) * 10;
      var brakeFt = _sageRandInt(rng, 7, 14) * 10;
      var totalStop = reactFt + brakeFt;
      return _sageBuildQuestion(
        'A car travels ' + reactFt + ' ft during driver reaction time and ' + brakeFt + ' ft while braking. What is total stopping distance?',
        totalStop + ' ft',
        [
          { text: brakeFt + ' ft', whyNot: 'Braking distance alone ignores the ' + reactFt + ' ft covered before your foot hits the brake.' },
          { text: (brakeFt - reactFt) + ' ft', whyNot: 'Reaction and braking distances add together rather than canceling out.' },
          { text: reactFt + ' ft', whyNot: 'Reaction distance only accounts for the time before braking even begins.' }
        ],
        'Total stopping distance = reaction distance + braking distance = ' + reactFt + ' + ' + brakeFt + ' = ' + totalStop + ' ft.',
        slot, 'road_kinematics'
      );
    }
    return _sageBuildQuestion(
      'Before changing lanes on a multi-lane road, which check catches vehicles hidden from side mirrors?',
      'A quick shoulder glance into the blind spot after signaling and checking mirrors',
      [
        { text: 'Relying on the rearview mirror alone', whyNot: 'Mirrors leave blind zones along the rear quarters where adjacent cars disappear.' },
        { text: 'Braking sharply before signaling', whyNot: 'Sudden braking without signaling creates a rear-end hazard instead of clearing the lane.' },
        { text: 'Speeding up without signaling', whyNot: 'Skipping turn signals prevents nearby drivers from anticipating your merge.' }
      ],
      'Signal, check mirrors, and glance over your shoulder to confirm the blind spot is clear.',
      slot, 'road_kinematics'
    );
  }

  function _sageGenLogicCs(rng, variant, slot) {
    if (variant === 0) {
      var aVal = _sageRandInt(rng, 0, 1) === 1;
      var bVal = _sageRandInt(rng, 0, 1) === 1;
      var cVal = _sageRandInt(rng, 0, 1) === 1;
      var exprRes = (aVal && bVal) || (!cVal);
      return _sageBuildQuestion(
        'Evaluate the Boolean logic: (' + (aVal ? 'TRUE' : 'FALSE') + ' AND ' + (bVal ? 'TRUE' : 'FALSE') + ') OR (NOT ' + (cVal ? 'TRUE' : 'FALSE') + ')',
        exprRes ? 'TRUE' : 'FALSE',
        [
          { text: exprRes ? 'FALSE' : 'TRUE', whyNot: 'Check each part: (' + aVal + ' AND ' + bVal + ') is ' + (aVal && bVal) + ', and (NOT ' + cVal + ') is ' + (!cVal) + '; OR needs only one TRUE.' },
          { text: 'UNDEFINED', whyNot: 'Every Boolean expression with TRUE/FALSE inputs evaluates deterministically to TRUE or FALSE.' },
          { text: 'BOTH TRUE AND FALSE', whyNot: 'In classical Boolean logic, a statement evaluates to exactly one truth value.' }
        ],
        'AND is TRUE only if both inputs are TRUE (' + (aVal && bVal) + '); NOT flips ' + cVal + ' to ' + (!cVal) + '; OR gives ' + (exprRes ? 'TRUE' : 'FALSE') + '.',
        slot, 'logic_cs'
      );
    }
    if (variant === 1) {
      var dec = _sageRandInt(rng, 5, 14);
      var bin = dec.toString(2);
      while (bin.length < 4) bin = '0' + bin;
      return _sageBuildQuestion(
        'Convert the 4-bit binary number ' + bin + ' to base-10 decimal.',
        String(dec),
        [
          { text: String(dec + 2), whyNot: 'Check the place values (8, 4, 2, 1); adding the 1-bits in ' + bin + ' equals ' + dec + ', not ' + (dec + 2) + '.' },
          { text: String(Math.max(1, dec - 1)), whyNot: 'Check the rightmost 1s bit carefully — place values double from right to left (1, 2, 4, 8).' },
          { text: String(bin.split('').reduce(function(acc, ch) { return acc + (ch === '1' ? 1 : 0); }, 0)), whyNot: 'Counting how many 1-bits appear ignores binary place values (8, 4, 2, 1).' }
        ],
        'Sum the powers of 2 where bit = 1 (8, 4, 2, 1): ' + bin + '\u2082 = ' + dec + '\u2081\u2080.',
        slot, 'logic_cs'
      );
    }
    if (variant === 2) {
      var mins = _sageRandInt(rng, 2, 4);
      var netWpm = _sageRandInt(rng, 25, 55);
      var errs = _sageRandInt(rng, 2, 6);
      var totalW = netWpm * mins + errs;
      return _sageBuildQuestion(
        'A typist enters ' + totalW + ' words in ' + mins + ' minutes with ' + errs + ' uncorrected errors. What is net WPM: (words \u2212 errors) \u00f7 minutes?',
        netWpm + ' WPM',
        [
          { text: Math.round(totalW / mins) + ' WPM', whyNot: 'Dividing total words without subtracting errors gives gross WPM instead of net WPM.' },
          { text: (totalW - errs) + ' WPM', whyNot: (totalW - errs) + ' is net words total before dividing by ' + mins + ' minutes.' },
          { text: Math.round((totalW + errs) / mins) + ' WPM', whyNot: 'Errors reduce net speed rather than adding to it.' }
        ],
        'Net WPM = (' + totalW + ' \u2212 ' + errs + ') \u00f7 ' + mins + ' = ' + netWpm + ' WPM.',
        slot, 'logic_cs'
      );
    }
    if (variant === 3) {
      var totK = _sageRandInt(rng, 4, 10) * 20;
      var missK = _sageRandInt(rng, 1, Math.floor(totK / 20)) * 2;
      var accPct = Math.round(((totK - missK) / totK) * 100);
      var errPct = Math.round((missK / totK) * 100);
      return _sageBuildQuestion(
        'Out of ' + totK + ' keystrokes, ' + missK + ' were errors. What is the typing accuracy?',
        accPct + '%',
        [
          { text: errPct + '%', whyNot: errPct + '% is the error rate, not the accuracy rate (100% \u2212 error rate).' },
          { text: (totK - missK) + '%', whyNot: (totK - missK) + ' is the raw count of correct keys, not a percentage out of ' + totK + '.' },
          { text: Math.min(100, accPct + 5) + '%', whyNot: 'Check (' + (totK - missK) + ' \u00f7 ' + totK + ') \u00d7 100 = ' + accPct + '%.' }
        ],
        'Accuracy = (' + (totK - missK) + ' \u00f7 ' + totK + ') \u00d7 100 = ' + accPct + '%.',
        slot, 'logic_cs'
      );
    }
    return _sageBuildQuestion(
      'Why do touch-typists anchor their index fingers on the F and J home-row bumps?',
      'To locate every key by touch without looking down, boosting speed and accuracy',
      [
        { text: 'Because F and J are the only keys used in coding', whyNot: 'F and J are tactile landmarks for reaching all 26 letters, not the only keys typed.' },
        { text: 'To type strictly with two index fingers', whyNot: 'Home row distributes keys across all eight fingers plus thumbs.' },
        { text: 'To turn Caps Lock off automatically', whyNot: 'The bumps are physical orientation guides and do not toggle keyboard modifiers.' }
      ],
      'Tactile bumps on F and J let your hands return to home row without breaking visual focus on the screen.',
      slot, 'logic_cs'
    );
  }

  function _sageGenArtsAcoustics(rng, variant, slot) {
    if (variant === 0) {
      var bpm = _sageRandInt(rng, 6, 14) * 10;
      var mins = _sageRandInt(rng, 2, 4);
      var beats = bpm * mins;
      return _sageBuildQuestion(
        'A track plays at ' + bpm + ' BPM for ' + mins + ' minutes. How many beats occur in total?',
        beats + ' beats',
        [
          { text: (bpm + mins) + ' beats', whyNot: 'BPM (beats per minute) multiplies by minutes; adding them mixes units.' },
          { text: Math.round(bpm / mins) + ' beats', whyNot: 'Dividing tempo by duration shrinks total beats as the song gets longer.' },
          { text: (bpm * (mins + 1)) + ' beats', whyNot: 'That counts ' + (mins + 1) + ' minutes instead of ' + mins + ' minutes.' }
        ],
        'Total beats = BPM \u00d7 minutes = ' + bpm + ' \u00d7 ' + mins + ' = ' + beats + ' beats.',
        slot, 'arts_acoustics'
      );
    }
    if (variant === 1) {
      var baseHz = [110, 220, 260, 440][_sageRandInt(rng, 0, 3)];
      var octs = _sageRandInt(rng, 1, 2);
      var nextHz = baseHz * Math.pow(2, octs);
      return _sageBuildQuestion(
        'A pitch vibrates at ' + baseHz + ' Hz. Raising it by ' + octs + ' octave' + (octs > 1 ? 's' : '') + ' produces what frequency?',
        nextHz + ' Hz',
        [
          { text: (baseHz + octs * 100) + ' Hz', whyNot: 'Octaves double frequency multiplicatively (\u00d72 per octave) rather than adding a fixed Hz step.' },
          { text: Math.round(baseHz / Math.pow(2, octs)) + ' Hz', whyNot: 'Halving frequency drops the pitch down an octave instead of raising it.' },
          { text: (baseHz * (octs + 2)) + ' Hz', whyNot: 'Each octave multiplies frequency by 2, so ' + octs + ' octave(s) multiplies by ' + Math.pow(2, octs) + '.' }
        ],
        'Each octave doubles frequency: ' + baseHz + ' Hz \u00d7 2^' + octs + ' = ' + nextHz + ' Hz.',
        slot, 'arts_acoustics'
      );
    }
    if (variant === 2) {
      var pairs = [
        { a: 'red', b: 'green', ans: 'yellow', explain: 'Additive RGB light: red + green light stimulates both cones to appear yellow.' },
        { a: 'red', b: 'blue', ans: 'magenta', explain: 'Additive RGB light: red + blue light combines into magenta.' },
        { a: 'green', b: 'blue', ans: 'cyan', explain: 'Additive RGB light: green + blue light combines into cyan.' }
      ];
      var p = pairs[_sageRandInt(rng, 0, pairs.length - 1)];
      return _sageBuildQuestion(
        'On a stage or screen (additive light), mixing ' + p.a + ' light and ' + p.b + ' light produces:',
        p.ans,
        [
          { text: 'black', whyNot: 'Black is the absence of light; adding light wavelengths increases brightness.' },
          { text: 'brown', whyNot: 'Brown happens with subtractive paint pigments absorbing light, not additive stage light.' },
          { text: 'gray', whyNot: 'Equal amounts of all three RGB primaries make white/gray, not two primaries alone.' }
        ],
        p.explain,
        slot, 'arts_acoustics'
      );
    }
    if (variant === 3) {
      var meas = _sageRandInt(rng, 4, 9);
      var beatsPer = [3, 4, 6][_sageRandInt(rng, 0, 2)];
      var totB = meas * beatsPer;
      return _sageBuildQuestion(
        'A phrase lasts ' + meas + ' measures in ' + beatsPer + '/4 time. How many beats are in the phrase?',
        totB + ' beats',
        [
          { text: (meas + beatsPer) + ' beats', whyNot: 'Each of the ' + meas + ' measures holds ' + beatsPer + ' beats, so multiply rather than add.' },
          { text: (meas * 4) + ' beats', whyNot: 'The bottom number (4) names the quarter-note beat unit; the top number (' + beatsPer + ') counts beats per measure.' },
          { text: Math.max(1, meas - beatsPer) + ' beats', whyNot: 'Subtracting beats per measure from measure count does not sum total beats.' }
        ],
        'In ' + beatsPer + '/4 time, each measure has ' + beatsPer + ' beats: ' + meas + ' \u00d7 ' + beatsPer + ' = ' + totB + ' beats.',
        slot, 'arts_acoustics'
      );
    }
    return _sageBuildQuestion(
      'Why do complementary colors (opposite on the color wheel) stand out strongly when placed side by side?',
      'They share no overlapping primary hue, creating maximum visual contrast',
      [
        { text: 'They have identical wavelengths', whyNot: 'Identical wavelengths produce the same hue, not high-contrast complements.' },
        { text: 'They always share the same lightness value', whyNot: 'Value (light/dark) is independent of whether two hues sit opposite on the color wheel.' },
        { text: 'They blend into brighter neon hues in paint', whyNot: 'Mixing complementary paints subtracts wavelengths and neutralizes toward gray/brown.' }
      ],
      'Complementary pairs (like blue/orange or red/green) sit opposite on the wheel and maximize chromatic contrast.',
      slot, 'arts_acoustics'
    );
  }

  function _sageGenLiteracy(rng, variant, slot) {
    if (variant === 0) {
      var words = [
        { w: 'imagination', syl: 5, split: 'i-mag-i-na-tion' },
        { w: 'observatory', syl: 5, split: 'ob-ser-va-to-ry' },
        { w: 'constellation', syl: 4, split: 'con-stel-la-tion' },
        { w: 'laboratory', syl: 4, split: 'lab-o-ra-to-ry' },
        { w: 'telescope', syl: 3, split: 'tel-e-scope' }
      ];
      var wd = words[_sageRandInt(rng, 0, words.length - 1)];
      return _sageBuildQuestion(
        'How many syllables are in the word "' + wd.w + '"?',
        String(wd.syl),
        [
          { text: String(wd.syl - 1), whyNot: 'Break it aloud (' + wd.split + ') — each spoken vowel sound counts as one syllable (' + wd.syl + ').' },
          { text: String(wd.syl + 1), whyNot: 'Silent or paired letters do not create extra beats; "' + wd.split + '" has ' + wd.syl + ' syllables.' },
          { text: String(wd.syl + 2), whyNot: 'Count spoken vowel beats (' + wd.split + '), not individual vowel letters.' }
        ],
        '"' + wd.w + '" breaks into ' + wd.syl + ' spoken vowel beats: ' + wd.split + '.',
        slot, 'literacy_logic'
      );
    }
    if (variant === 1) {
      var roots = [
        { prefix: 'bio-', meaning: 'life', example: 'biology / biosphere' },
        { prefix: 'tele-', meaning: 'far / distant', example: 'telescope / telegraph' },
        { prefix: 'geo-', meaning: 'Earth / land', example: 'geology / geography' },
        { prefix: 'micro-', meaning: 'small', example: 'microscope / microbe' }
      ];
      var rt = roots[_sageRandInt(rng, 0, roots.length - 1)];
      var wrongMeanings = roots.filter(function(r) { return r.prefix !== rt.prefix; });
      return _sageBuildQuestion(
        'Knowing the Greek root "' + rt.prefix + '" helps decode "' + rt.example + '". What does "' + rt.prefix + '" mean?',
        rt.meaning,
        wrongMeanings.map(function(wm) {
          return { text: wm.meaning, whyNot: '"' + wm.meaning + '" is the meaning of "' + wm.prefix + '" (as in ' + wm.example + '), not "' + rt.prefix + '".' };
        }),
        'The root "' + rt.prefix + '" means "' + rt.meaning + '", unlocking words like ' + rt.example + '.',
        slot, 'literacy_logic'
      );
    }
    if (variant === 2) {
      return _sageBuildQuestion(
        'Which revision changes the passive sentence "The comet was tracked by the crew" into active voice?',
        'The crew tracked the comet.',
        [
          { text: 'The comet had been tracked by the crew.', whyNot: 'That keeps the object ("comet") in subject position with a "be + past participle" verb — still passive.' },
          { text: 'Was the comet tracked by the crew?', whyNot: 'Turning a passive sentence into a question leaves it in passive voice.' },
          { text: 'The comet was being tracked.', whyNot: 'Dropping the actor ("by the crew") still leaves the sentence passive.' }
        ],
        'Active voice puts the doer ("The crew") in the subject slot performing the verb ("tracked").',
        slot, 'literacy_logic'
      );
    }
    if (variant === 3) {
      return _sageBuildQuestion(
        'When an unfamiliar word appears in a science passage, which strategy gives the most reliable clue to its meaning?',
        'Check surrounding context clues (definitions, contrasts, examples) plus word roots',
        [
          { text: 'Skip the entire paragraph without checking meaning', whyNot: 'Skipping key domain vocabulary can break comprehension of the whole claim.' },
          { text: 'Guess solely from the word\u2019s first letter', whyNot: 'First letters rarely indicate meaning; context and morphology carry actual semantics.' },
          { text: 'Assume it means the same thing as a shorter rhyming word', whyNot: 'Rhyming words usually have unrelated meanings (e.g., "fusion" vs "illusion").' }
        ],
        'Combining context clues (restatements, contrasts, examples) with prefixes/roots reliably decodes new words.',
        slot, 'literacy_logic'
      );
    }
    return _sageBuildQuestion(
      'What makes a summary stronger than copying a paragraph word-for-word?',
      'It distills only the central claim and key supporting evidence in your own words',
      [
        { text: 'It includes every minor detail and quote verbatim', whyNot: 'Keeping every minor detail turns a summary into a transcript instead of a synthesis.' },
        { text: 'It adds personal opinions not present in the source', whyNot: 'An objective summary reports the author\u2019s ideas without injecting outside opinions.' },
        { text: 'It only copies the first and last sentences', whyNot: 'Key evidence often lives in the middle of a passage, not just the edges.' }
      ],
      'Paraphrasing main ideas + core evidence forces active retrieval and checks real understanding.',
      slot, 'literacy_logic'
    );
  }

  function generateOfflineSpellQuestions(spellOrId, seed, existingPrompts) {
    var spell = (typeof spellOrId === 'string') ? findSpell(spellOrId) : spellOrId;
    if (!spell) {
      spell = { id: String(spellOrId || 'sage_general'), name: 'Sage Practice', sourceTool: 'mathLab', element: 'aether' };
    }
    var domain = _sageClassifyDomain(spell);
    var existingSet = {};
    if (Array.isArray(existingPrompts)) {
      existingPrompts.forEach(function(p) { if (typeof p === 'string') existingSet[p] = true; });
    } else if (existingPrompts && typeof existingPrompts === 'object') {
      if (typeof existingPrompts.forEach === 'function') {
        existingPrompts.forEach(function(p) { if (typeof p === 'string') existingSet[p] = true; });
      } else {
        Object.keys(existingPrompts).forEach(function(k) { if (existingPrompts[k]) existingSet[k] = true; });
      }
    }
    var numericSeed = (typeof seed === 'number' && isFinite(seed)) ? Math.floor(seed) : _sageHash(String(seed || '1'));
    var baseHash = _sageHash((spell.id || 'spell') + ':' + domain + ':' + numericSeed);
    var slotBase = baseHash % 4;
    var results = [];
    var seenOut = {};

    function produceOne(dom, variant, rng, slot) {
      if (dom === 'math_fractions') return _sageGenMathFractions(rng, variant, slot);
      if (dom === 'math_algebra') return _sageGenMathAlgebra(rng, variant, slot);
      if (dom === 'math_geometry') return _sageGenMathGeometry(rng, variant, slot);
      if (dom === 'math_stats') return _sageGenMathStats(rng, variant, slot);
      if (dom === 'physics_circuits') return _sageGenPhysics(rng, variant, slot, true);
      if (dom === 'physics_conservation') return _sageGenPhysics(rng, variant, slot, false);
      if (dom === 'space_astronomy') return _sageGenSpace(rng, variant, slot);
      if (dom === 'ecology_biology') return _sageGenEcology(rng, variant, slot);
      if (dom === 'road_kinematics') return _sageGenRoad(rng, variant, slot);
      if (dom === 'logic_cs') return _sageGenLogicCs(rng, variant, slot);
      if (dom === 'arts_acoustics') return _sageGenArtsAcoustics(rng, variant, slot);
      if (dom === 'literacy_logic') return _sageGenLiteracy(rng, variant, slot);
      var mixedDomains = ['math_fractions', 'physics_conservation', 'ecology_biology', 'logic_cs', 'math_geometry'];
      return produceOne(mixedDomains[variant % mixedDomains.length], variant, rng, slot);
    }

    var fallbackDomains = ['math_fractions', 'math_algebra', 'math_geometry', 'physics_conservation', 'ecology_biology', 'logic_cs'];
    for (var qi = 0; qi < 5; qi++) {
      var targetSlot = (slotBase + qi) % 4;
      var picked = null;
      for (var attempt = 0; attempt < 12; attempt++) {
        var rng = _sagePrng((baseHash + qi * 7919 + attempt * 104729) >>> 0);
        var activeDom = attempt < 8 ? domain : fallbackDomains[(qi + attempt) % fallbackDomains.length];
        var cand = produceOne(activeDom, (qi + attempt) % 5, rng, targetSlot);
        if (cand && !existingSet[cand.prompt] && !seenOut[cand.prompt]) {
          picked = cand;
          break;
        }
      }
      if (!picked) {
        var fallbackRng = _sagePrng((baseHash + qi * 31337 + 99991) >>> 0);
        picked = _sageGenMathAlgebra(fallbackRng, qi % 5, targetSlot);
      }
      if (picked && !seenOut[picked.prompt]) {
        seenOut[picked.prompt] = true;
        results.push(picked);
      }
    }
    return results;
  }

  function _sageExtractNumber(str) {
    var s = String(str || '').trim();
    var fracM = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fracM && Number(fracM[2]) !== 0) return Number(fracM[1]) / Number(fracM[2]);
    var numM = s.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!numM) return null;
    var val = Number(numM[0].replace(/,/g, ''));
    return isFinite(val) ? val : null;
  }

  function diagnoseSageDistractor(spellOrId, question, chosenIdx) {
    var spell = (typeof spellOrId === 'string') ? findSpell(spellOrId) : spellOrId;
    if (!question || !Array.isArray(question.options) || question.options.length === 0) {
      return {
        isCorrect: false,
        chosenOption: '',
        correctOption: '',
        whyNot: 'Review the target domain principle before recasting.',
        principle: '',
        summary: 'Review the target domain principle before recasting.'
      };
    }
    var cIdx = (typeof question.correctIndex === 'number' && question.correctIndex >= 0 && question.correctIndex < question.options.length)
      ? Math.floor(question.correctIndex) : 0;
    var pIdx = (typeof chosenIdx === 'number' && chosenIdx >= 0 && chosenIdx < question.options.length)
      ? Math.floor(chosenIdx) : -1;
    var correctOption = String(question.options[cIdx] || '');
    var chosenOption = pIdx >= 0 ? String(question.options[pIdx] || '') : '';
    var principle = String(question.explain || '');
    if (pIdx === cIdx) {
      return {
        isCorrect: true,
        chosenOption: chosenOption,
        correctOption: correctOption,
        whyNot: null,
        principle: principle,
        summary: '"' + correctOption + '" matches the target principle: ' + principle
      };
    }
    // 1. Pre-authored or procedurally synthesized per-distractor whyNot
    if (Array.isArray(question.whyNot) && pIdx >= 0 && typeof question.whyNot[pIdx] === 'string' && question.whyNot[pIdx].trim()) {
      var authored = question.whyNot[pIdx].trim();
      return {
        isCorrect: false,
        chosenOption: chosenOption,
        correctOption: correctOption,
        whyNot: authored,
        principle: principle,
        summary: 'Why "' + chosenOption + '" misses: ' + authored + (principle ? ' Target rule: ' + principle : '')
      };
    }
    // 2. Deterministic contrastive misconception diagnosis for static & AI banks
    var lowerChosen = chosenOption.toLowerCase();
    var lowerCorrect = correctOption.toLowerCase();
    var lowerPrompt = String(question.prompt || '').toLowerCase();
    var domain = _sageClassifyDomain(spell);
    var reason = '';

    var numChosen = _sageExtractNumber(chosenOption);
    var numCorrect = _sageExtractNumber(correctOption);
    if (numChosen !== null && numCorrect !== null && numChosen !== numCorrect) {
      if (numChosen === -numCorrect) {
        reason = '"' + chosenOption + '" has the opposite sign of "' + correctOption + '"; re-check the direction or sign rule.';
      } else if (numCorrect !== 0 && Math.abs(numChosen / numCorrect) >= 1.9 && Math.abs(numChosen / numCorrect) <= 2.1) {
        reason = '"' + chosenOption + '" is double the target value ("' + correctOption + '") — check whether a factor of 1/2 or divisor was missed.';
      } else if (numChosen !== 0 && Math.abs(numCorrect / numChosen) >= 1.9 && Math.abs(numCorrect / numChosen) <= 2.1) {
        reason = '"' + chosenOption + '" is half the target value ("' + correctOption + '") — check whether both sides or a factor of 2 were included.';
      } else if (numChosen > numCorrect) {
        reason = '"' + chosenOption + '" overestimates the target value ("' + correctOption + '"); verify the operation and scaling step.';
      } else {
        reason = '"' + chosenOption + '" underestimates the target value ("' + correctOption + '"); verify the operation and scaling step.';
      }
    } else if (/(volts|amps|ohms|watts|hertz|decibels|bpm|seconds|minutes|hours|days|time|distance|mass|velocity)/.test(lowerChosen)
      && /(volts|amps|ohms|watts|hertz|decibels|bpm|seconds|minutes|hours|days|time|distance|mass|velocity)/.test(lowerCorrect)) {
      reason = '"' + chosenOption + '" measures a different physical quantity or scale than "' + correctOption + '" for what the prompt asks.';
    } else if (/(perimeter|area|volume|circumference|mean|median|mode|range)/.test(lowerChosen)
      && /(perimeter|area|volume|circumference|mean|median|mode|range)/.test(lowerCorrect)) {
      reason = '"' + chosenOption + '" describes a different mathematical measure than "' + correctOption + '".';
    } else if (domain === 'space_astronomy') {
      reason = '"' + chosenOption + '" does not match the orbital, light-travel, or planetary property asked here; "' + correctOption + '" fits the astronomy rule.';
    } else if (domain === 'physics_circuits' || domain === 'physics_conservation') {
      reason = '"' + chosenOption + '" breaks the circuit/conservation relationship tested here, whereas "' + correctOption + '" satisfies it.';
    } else if (domain === 'ecology_biology') {
      reason = '"' + chosenOption + '" plays a different biological or ecological role than what the prompt specifies ("' + correctOption + '").';
    } else if (domain === 'road_kinematics') {
      reason = '"' + chosenOption + '" increases collision or misjudgment risk under this traffic rule; "' + correctOption + '" is the safe protocol.';
    } else if (domain === 'arts_acoustics') {
      reason = '"' + chosenOption + '" reflects a different color or musical property than "' + correctOption + '".';
    } else if (domain === 'math_fractions' || domain === 'math_algebra' || domain === 'math_geometry' || domain === 'math_stats') {
      reason = '"' + chosenOption + '" applies a different mathematical rule than the one needed to reach "' + correctOption + '".';
    } else if (lowerPrompt.indexOf('not') !== -1 || lowerPrompt.indexOf('except') !== -1) {
      reason = 'Watch the negative wording in the prompt: "' + chosenOption + '" fits the main group, while "' + correctOption + '" is the intended answer.';
    } else {
      reason = '"' + chosenOption + '" contrasts with the key concept pointing to "' + correctOption + '".';
    }

    return {
      isCorrect: false,
      chosenOption: chosenOption,
      correctOption: correctOption,
      whyNot: reason,
      principle: principle,
      summary: 'Why "' + chosenOption + '" misses: ' + reason + (principle ? ' Target principle: ' + principle : '')
    };
  }

  function summarizeConfidenceCalibration(statsOrLog) {
    var buckets = {
      high: { right: 0, wrong: 0, total: 0, accuracyPct: null },
      med:  { right: 0, wrong: 0, total: 0, accuracyPct: null },
      low:  { right: 0, wrong: 0, total: 0, accuracyPct: null }
    };
    var total = 0;
    var totalRight = 0;

    function record(conf, wasRight) {
      if (conf !== 'high' && conf !== 'med' && conf !== 'low') return;
      buckets[conf].total++;
      total++;
      if (wasRight) {
        buckets[conf].right++;
        totalRight++;
      } else {
        buckets[conf].wrong++;
      }
    }

    if (Array.isArray(statsOrLog)) {
      statsOrLog.forEach(function(entry) {
        if (!entry || typeof entry !== 'object') return;
        record(entry.confidence || entry.lastConfidence, entry.result === 'crit' || entry.result === 'hit');
      });
    } else if (statsOrLog && typeof statsOrLog === 'object') {
      Object.keys(statsOrLog).forEach(function(k) {
        var st = statsOrLog[k];
        if (!st || typeof st !== 'object' || !st.lastConfidence) return;
        record(st.lastConfidence, st.lastResult === 'crit' || st.lastResult === 'hit');
      });
    }

    ['high', 'med', 'low'].forEach(function(lvl) {
      if (buckets[lvl].total > 0) {
        buckets[lvl].accuracyPct = Math.round((buckets[lvl].right / buckets[lvl].total) * 100);
      }
    });

    var overallAccuracy = total > 0 ? Math.round((totalRight / total) * 100) : null;
    var status = 'uncalibrated';
    var guidance = 'Tag your confidence before answering to calibrate your feeling-of-knowing.';
    if (total > 0) {
      if (buckets.high.total >= 2 && buckets.high.accuracyPct < 70) {
        status = 'overconfident';
        guidance = 'Pause to verify before locking in "Know it" — recent high-confidence casts missed at ' + (100 - buckets.high.accuracyPct) + '%.';
      } else if (buckets.low.total >= 2 && buckets.low.accuracyPct >= 65) {
        status = 'underconfident';
        guidance = 'You know more than you think — your "Guessing" picks are landing at ' + buckets.low.accuracyPct + '% accuracy.';
      } else if (buckets.high.total >= 1 && buckets.high.accuracyPct >= 80) {
        status = 'calibrated';
        guidance = 'Strong calibration — your "Know it" calls are landing at ' + buckets.high.accuracyPct + '% accuracy.';
      } else {
        status = 'building';
        guidance = 'Calibration tracking active (' + totalRight + '/' + total + ' right across tagged casts).';
      }
    }

    return {
      total: total,
      totalRight: totalRight,
      overallAccuracy: overallAccuracy,
      buckets: buckets,
      calibrationStatus: status,
      calibrationGuidance: guidance
    };
  }

  var ALLOBOTSAGE_ENGINE = Object.freeze({
    generateOfflineSpellQuestions: generateOfflineSpellQuestions,
    diagnoseSageDistractor: diagnoseSageDistractor,
    summarizeConfidenceCalibration: summarizeConfidenceCalibration,
    getMergedBank: getMergedBank,
    pickWeighted: pickWeighted,
    computeUnlockedSpells: computeUnlockedSpells,
    computeNewlyUnlocked: computeNewlyUnlocked,
    findSpell: findSpell,
    getSpellDamage: getSpellDamage,
    upgradeCost: upgradeCost,
    difficultyById: difficultyById,
    sectorById: sectorById,
    sageLocalDate: sageLocalDate,
    sageIsYesterday: sageIsYesterday,
    SPELL_COUNT: SPELLBOOK.length
  });
  if (typeof window !== 'undefined') {
    window.AlloBotSagePure = ALLOBOTSAGE_ENGINE;
  }

  // ═══════════════════════════════════════════════════════════════
  // Register tool
  // ═══════════════════════════════════════════════════════════════
  // ── Stable view identities (module scope) ──
  // Components defined inside render() get a new function identity every host
  // re-render, so React unmounts/remounts them on ANY toolData write, tearing
  // DOM and dropping keyboard focus (see dev-tools/scan_render_scoped_components.cjs).
  // stableType() hands React a stable wrapper type and swaps the fresh closure
  // in each render. Gate: tests/stem_component_identity_gates.test.js.
  var _stableViewTypes = {};
  function stableType(name, impl) {
    var slot = _stableViewTypes[name];
    if (!slot) {
      slot = _stableViewTypes[name] = { impl: null, Type: null };
      slot.Type = function StableView(props) { return slot.impl(props); };
    }
    slot.impl = impl;
    return slot.Type;
  }
  window.StemLab.registerTool('alloBotSage', {
    _engine: ALLOBOTSAGE_ENGINE,
    icon: '\uD83E\uDDD9\u200D\u2642\uFE0F',
    label: 'AlloBot: Starbound Sage',
    desc: 'A cozy sci-fi roguelite where AlloBot\u2019s spells unlock as you master other STEAM Lab tools. Cast by demonstrating what you learned.',
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; };
      var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
      // The back button, the tool label and the spell-list headings sit on the
      // HOST surface - white in light and dark, pure BLACK in the contrast
      // theme, where slate-600 measured 2.77:1.
      var isContrast = !!(ctx.isContrast || ctx.theme === 'contrast');
      var isDark = !isContrast && !!(ctx.isDark || ctx.theme === 'dark');
      var reduceMotion = !!(ctx && ctx.reduceMotion);
      var isEmbedded = !!(ctx && ctx.embedded);
      var onHostInk = isContrast ? ' text-white' : '';
      var React = (ctx && ctx.React) || (typeof window !== 'undefined' && window.React);
      if (!React) return null;
      var h = React.createElement;
      var toolData = (ctx.toolData && typeof ctx.toolData === 'object' && !Array.isArray(ctx.toolData)) ? ctx.toolData : {};
      var addToast = ctx.addToast || function() {};
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool || function() {};
      var awardXP = ctx.awardXP || function() {};
      var callGemini = ctx.callGemini || null;
      var callTTS = typeof ctx.callTTS === 'function' ? ctx.callTTS : null;
      var aiOn = (function() {
        if (ctx.aiAvailable === false || ctx.aiHintsEnabled === false || typeof callGemini !== 'function' || callGemini._alloQrBlocked) return false;
        if (typeof window !== 'undefined' && (window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true)) return false;
        try { if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function' && window.__alloAiUsable('text', callGemini) === false) return false; } catch (_) {}
        return true;
      })();

      function safeObj(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
      function safeNum(v, fb) { return (typeof v === 'number' && isFinite(v)) ? v : fb; }

      var d = safeObj(toolData.alloBotSage);
      var aiChallengeCache = safeObj(d.aiChallengeCache);
      var offlineChallengeCache = safeObj(d.offlineChallengeCache);
      var offlineSeeds = safeObj(d._offlineSeeds);
      var aiInFlightMap = safeObj(d._aiInFlight);
      var castCountsMap = safeObj(d.castCounts);
      var questionStatsMap = safeObj(d.questionStats);
      var spellLevelsMap = safeObj(d.spellLevels);
      var sectorsClearedMapAll = safeObj(d.sectorsCleared);
      var bossesDefeatedMapAll = safeObj(d.bossesDefeated);

      // Pure batched state updaters (React 18 StrictMode safe — never call side effects inside updaterFn).
      function updateSageAtomic(updaterFn) {
        var setter = (typeof ctx.setToolData === 'function')
          ? ctx.setToolData
          : (typeof ctx.setLabToolData === 'function' ? ctx.setLabToolData : null);
        if (setter) {
          setter(function(prev) {
            var safePrev = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? prev : {};
            var cur = (safePrev.alloBotSage && typeof safePrev.alloBotSage === 'object' && !Array.isArray(safePrev.alloBotSage)) ? safePrev.alloBotSage : {};
            var patch = updaterFn(cur);
            if (!patch || typeof patch !== 'object') return safePrev;
            return Object.assign({}, safePrev, { alloBotSage: Object.assign({}, cur, patch) });
          });
        } else if (typeof ctx.updateMulti === 'function') {
          var patchObj = updaterFn(d);
          if (patchObj && typeof patchObj === 'object') ctx.updateMulti('alloBotSage', patchObj);
        }
      }
      function updSage(patch) {
        if (!patch || typeof patch !== 'object') return;
        if (typeof ctx.updateMulti === 'function') ctx.updateMulti('alloBotSage', patch);
        else updateSageAtomic(function() { return patch; });
      }
      function updKey(k, v) {
        if (typeof ctx.update === 'function') ctx.update('alloBotSage', k, v);
        else { var p = {}; p[k] = v; updateSageAtomic(function() { return p; }); }
      }

      // Mute-aware Read Aloud via host ctx.callTTS(..., { force: true }).
      function readAloud(text) {
        var clean = String(text || '').trim();
        if (!clean) return;
        if (isGloballyMuted()) {
          addToast(t('stem.allobotsage.audio_muted_toast', 'Audio is muted — unmute in the header to hear Read Aloud.'), 'info');
          return;
        }
        if (callTTS) {
          try { callTTS(clean, undefined, undefined, { force: true }); } catch (_) {}
        } else {
          announceSR(clean);
        }
      }

      function readAloudBtn(text, ariaLabel, compact) {
        if (!text) return null;
        return h('button', {
          type: 'button',
          onClick: function() { readAloud(text); },
          className: (compact ? 'px-2 py-1 text-[0.625rem]' : 'px-2.5 py-1.5 text-xs')
            + ' inline-flex items-center gap-1 rounded-lg font-bold bg-violet-100 hover:bg-violet-200 text-violet-900 border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors shrink-0',
          'aria-label': ariaLabel || t('stem.allobotsage.read_aloud_aria', 'Read aloud')
        }, h('span', { 'aria-hidden': 'true' }, '\uD83D\uDD0A'), h('span', null, t('stem.allobotsage.read_aloud_btn', 'Read aloud')));
      }

      // Generate or reroll fresh questions for one or more spells.
      // Seamlessly upgrades to Gemini when aiOn is true, and uses the pure deterministic
      // offline synthesizer when offline (or if Gemini fails / returns empty).
      function generateOfflinePackForSpells(spellIds, isReroll) {
        var validIds = (Array.isArray(spellIds) ? spellIds : []).filter(function(id) { return !!findSpell(id); });
        if (validIds.length === 0) return 0;
        var addedTotal = 0;
        var generatedBySpell = {};
        var nextSeedBySpell = {};
        validIds.forEach(function(id) {
          var sp = findSpell(id);
          if (!sp) return;
          var prevSeed = safeNum(offlineSeeds[id], 0);
          var nextSeed = prevSeed + 1;
          var existingPrompts = getMergedBank(sp, aiChallengeCache, isReroll ? {} : offlineChallengeCache).map(function(q) { return q.prompt; });
          var fresh = ALLOBOTSAGE_ENGINE.generateOfflineSpellQuestions(sp, nextSeed, existingPrompts);
          if (fresh.length > 0) {
            generatedBySpell[id] = fresh;
            nextSeedBySpell[id] = nextSeed;
            addedTotal += fresh.length;
          }
        });
        if (addedTotal > 0) {
          updateSageAtomic(function(cur) {
            var curOff = safeObj(cur.offlineChallengeCache);
            var curSeeds = safeObj(cur._offlineSeeds);
            return {
              offlineChallengeCache: Object.assign({}, curOff, generatedBySpell),
              _offlineSeeds: Object.assign({}, curSeeds, nextSeedBySpell)
            };
          });
        }
        return addedTotal;
      }

      // ── Persistent state ──
      var phase            = (typeof d.phase === 'string' && d.phase) ? d.phase : 'hub'; // hub | loadout | expedition | debrief
      var essence          = safeNum(d.essence, 0);
      var expeditionsDone  = safeNum(d.expeditionsCompleted, 0);
      var totalCasts       = safeNum(d.totalCasts, 0);
      var critCasts        = safeNum(d.critCasts, 0);
      // Saved state is INPUT: `||` is a NULL guard, not a TYPE guard.
      var seenSpells = Array.isArray(d.seenSpells) ? d.seenSpells.filter(function(x) { return typeof x === 'string'; }) : [];
      var equippedLoadout = Array.isArray(d.equippedLoadout) ? d.equippedLoadout.filter(function(x) { return typeof x === 'string'; }) : [];

      // ── Transient expedition state ──
      // A bare {} passed the old object check and then threw on
      // expedition.enemy.hp and expedition.castLog.length. A partial run is
      // not resumable, so require the fields every consumer reads.
      var expedition = (d.expedition && typeof d.expedition === 'object' && !Array.isArray(d.expedition)
        && d.expedition.enemy && typeof d.expedition.enemy === 'object' && !Array.isArray(d.expedition.enemy)
        && Array.isArray(d.expedition.castLog)) ? d.expedition : null;
      // expedition shape: { enemy: {id, hp, maxHp, atk, icon, name, flavor}, turn: 'player'|'enemy', log: [], playerHp, playerMaxHp }

      // Unlock detection
      var currentlyUnlocked = computeUnlockedSpells(toolData);
      var newlyUnlocked = computeNewlyUnlocked(toolData, seenSpells);

      // If new spells just appeared, defer toasts + seen-marking off the render stack.
      if (newlyUnlocked.length > 0 && phase === 'hub') {
        var mergedSeen = seenSpells.concat(newlyUnlocked);
        var seenKey = mergedSeen.join(',');
        if (_absLastSeenKey !== seenKey) {
          _absLastSeenKey = seenKey;
          Promise.resolve().then(function() {
            newlyUnlocked.forEach(function(id) {
              var s = findSpell(id);
              if (!s) return;
              try {
                addToast(
                  t('stem.allobotsage.toast_new_rune_unlocked', '{icon} New rune! "{name}" sparks in your grimoire')
                    .replace('{icon}', s.icon)
                    .replace('{name}', s.name),
                  'success'
                );
              } catch(e) {}
              announceSR(t('stem.allobotsage.sr_new_spell_unlocked', 'New spell unlocked: {name}').replace('{name}', s.name));
            });
            sfxUnlock();
            updKey('seenSpells', mergedSeen);
          });
        }
      }

      // ─────────────────────────────────────────────────
      // ── Shared UI helpers
      // ─────────────────────────────────────────────────
      function backBtn(onClick, label) {
        var resolvedLabel = label || t('stem.allobotsage.back_label', 'Back');
        return h('button', {
          type: 'button',
          onClick: onClick,
          className: 'transition-colors inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 focus:ring-2 focus:ring-violet-400 focus:outline-none' + onHostInk,
          'aria-label': resolvedLabel
        }, ArrowLeft ? h(ArrowLeft, { className: 'w-3.5 h-3.5' }) : h('span', null, '\u2190'), h('span', null, resolvedLabel));
      }

      // Mastery tier from cumulative cast count. Returns null below the first
      // threshold so beginners don't see a "tier 0" badge.
      function masteryTier(count) {
        if (count >= 50) return { name: t('stem.allobotsage.sage', 'Sage'),   bg: 'rgba(251,191,36,0.18)',   border: '#fbbf24', text: '#92400e', icon: '\uD83C\uDF1F' };
        if (count >= 20) return { name: t('stem.allobotsage.master', 'Master'), bg: 'rgba(139,92,246,0.18)',   border: '#8b5cf6', text: '#5b21b6', icon: '\u2728' };
        if (count >= 5)  return { name: t('stem.allobotsage.adept', 'Adept'),  bg: 'rgba(59,130,246,0.15)',   border: '#3b82f6', text: '#1d4ed8', icon: '\u25C6' };
        return null;
      }

      function spellCard(s, opts) {
        opts = opts || {};
        var unlocked = opts.unlocked;
        var onClick = opts.onClick;
        var equipped = opts.equipped;
        var usageCount = opts.usageCount || 0;
        var tier = masteryTier(usageCount);
        var cardBaseAria = unlocked
          ? (equipped
              ? t('stem.allobotsage.aria_spell_equipped', '{name} (equipped)').replace('{name}', s.name)
              : t('stem.allobotsage.aria_spell_unlocked', '{name} (unlocked)').replace('{name}', s.name))
          : t('stem.allobotsage.aria_spell_locked', '{name} (locked: {hint})').replace('{name}', s.name).replace('{hint}', s.unlockHint);
        var cardAria = tier
          ? t('stem.allobotsage.aria_spell_with_tier', '{base}, {tier} tier ({count} casts)')
              .replace('{base}', cardBaseAria)
              .replace('{tier}', tier.name)
              .replace('{count}', String(usageCount))
          : cardBaseAria;
        var tierTitle = tier
          ? t('stem.allobotsage.title_mastery_tier', '{tier} ({count} casts)').replace('{tier}', tier.name).replace('{count}', String(usageCount))
          : '';
        return h('button', {
          type: 'button',
          key: s.id,
          onClick: onClick,
          disabled: !unlocked && !opts.alwaysClickable,
          className: 'text-left p-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 '
            + (unlocked
              ? (equipped ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-400 hover:bg-violet-50/50')
              : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'),
          'aria-label': cardAria,
          style: unlocked ? { boxShadow: '0 1px 0 ' + s.color + '20' } : {}
        },
          h('div', { className: 'flex items-center gap-2 mb-1' },
            h('span', { className: 'text-2xl', 'aria-hidden': 'true', style: { filter: unlocked ? '' : 'grayscale(1)' } }, unlocked ? s.icon : '\uD83D\uDD12'),
            h('span', { className: 'font-bold text-sm', style: { color: unlocked ? s.color: 'var(--allo-stem-text-soft, #94a3b8)' } }, s.name),
            tier && unlocked && h('span', {
              className: 'text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-md',
              style: { background: tier.bg, border: '1px solid ' + tier.border, color: tier.text },
              title: tierTitle
            }, tier.icon + ' ' + tier.name),
            equipped && h('span', { className: 'ml-auto text-[0.625rem] font-bold text-violet-600 uppercase tracking-wide' }, t('stem.allobotsage.equipped', 'Equipped'))
          ),
          h('div', { className: 'text-[0.6875rem] text-slate-600 leading-snug' },
            unlocked
              ? (s.sourceLabel + ' \u00b7 ' + s.baseDamage + ' dmg \u00b7 crit \u00d7' + s.critMultiplier.toFixed(1))
              : ('Locked \u2014 ' + s.unlockHint)
          ),
          unlocked && usageCount > 0 && h('div', { className: 'mt-1 text-[0.625rem] text-slate-500 font-mono' }, '\uD83D\uDD2E ' + usageCount + ' cast' + (usageCount > 1 ? 's' : '')),
          unlocked && h('div', { className: 'mt-1 text-[0.625rem] italic text-slate-600 leading-snug' }, s.flavor)
        );
      }

      // AlloBot avatar (simple inline SVG \u2014 wizard variant).
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
        var robeFill = robeTier >= 1 ? '#6d28d9' : '#4c1d95';
        var auraRadius = wandTier === 0 ? 0 : (5 + wandTier * 4);
        var auraOpacity = wandTier === 0 ? 0 : (0.25 + wandTier * 0.20);
        var auraColor = wandTier >= 3 ? '#fde047' : (wandTier >= 2 ? '#fbbf24' : '#a78bfa');
        var noAnim = reduceMotion || isContrast;
        var auraClass = noAnim ? '' : (wandTier >= 3 ? 'abs-wand-aura' : (wandTier >= 2 ? 'abs-wand-flicker' : ''));
        var wrapperClass = noAnim ? '' : (mood === 'victory' ? 'abs-backflip' : 'abs-float');
        var hc = !!isContrast;
        var uid = 'abs-av-' + mood + '-' + wandTier + '-' + robeTier;
        return h('svg', { viewBox: '0 0 120 140', className: wrapperClass, width: 96, height: 112, 'aria-hidden': 'true' },
          h('defs', null,
            h('radialGradient', { id: uid + '-visor', cx: '38%', cy: '32%', r: '72%' },
              h('stop', { offset: '0%', stopColor: '#a5f3fc' }),
              h('stop', { offset: '55%', stopColor: '#22d3ee' }),
              h('stop', { offset: '100%', stopColor: '#0e7490' })
            ),
            !hc && h('radialGradient', { id: uid + '-head', cx: '36%', cy: '28%', r: '70%' },
              h('stop', { offset: '0%', stopColor: '#ffffff' }),
              h('stop', { offset: '62%', stopColor: '#e0e7ff' }),
              h('stop', { offset: '100%', stopColor: '#a5b4fc' })
            ),
            !hc && h('linearGradient', { id: uid + '-hat', x1: '0', y1: '0', x2: '1', y2: '1' },
              h('stop', { offset: '0%', stopColor: robeTier >= 1 ? '#7c3aed' : '#5b21b6' }),
              h('stop', { offset: '100%', stopColor: '#2e1065' })
            ),
            !hc && h('linearGradient', { id: uid + '-robe', x1: '0', y1: '0', x2: '0', y2: '1' },
              h('stop', { offset: '0%', stopColor: robeFill }),
              h('stop', { offset: '100%', stopColor: '#1e1b4b' })
            ),
            !hc && h('radialGradient', { id: uid + '-halo', cx: '50%', cy: '50%', r: '50%' },
              h('stop', { offset: '0%', stopColor: moodColor, stopOpacity: 0.32 }),
              h('stop', { offset: '100%', stopColor: moodColor, stopOpacity: 0 })
            ),
            wandTier > 0 && h('radialGradient', { id: uid + '-wand', cx: '50%', cy: '50%', r: '50%' },
              h('stop', { offset: '0%', stopColor: auraColor, stopOpacity: Math.min(1, auraOpacity + 0.30) }),
              h('stop', { offset: '58%', stopColor: auraColor, stopOpacity: auraOpacity * 0.45 }),
              h('stop', { offset: '100%', stopColor: auraColor, stopOpacity: 0 })
            )
          ),
          !hc && h('circle', { className: noAnim ? 'abs-svg-fx' : 'abs-svg-fx abs-halo-breath', cx: 60, cy: 76, r: 44, fill: 'url(#' + uid + '-halo)' }),
          !hc && h('circle', { className: noAnim ? 'abs-svg-fx' : 'abs-svg-fx abs-orbit-drift', cx: 60, cy: 74, r: 48, fill: 'none', stroke: 'rgba(196,181,253,0.34)', strokeWidth: 1.1, strokeDasharray: '4 6' }),
          !hc && h('ellipse', { className: 'abs-svg-fx', cx: 60, cy: 132, rx: 30, ry: 4.5, fill: '#020617', opacity: 0.48 }),
          wandTier > 0 && !hc && h('circle', { cx: 112, cy: 64, r: auraRadius, fill: 'url(#' + uid + '-wand)', className: 'abs-svg-fx ' + auraClass }),
          h('ellipse', { cx: 60, cy: 45, rx: 28, ry: 5.5, fill: hc ? '#000000' : '#3b0764', stroke: hc ? '#facc15' : '#a78bfa', strokeWidth: 1.2 }),
          h('polygon', { points: '60,3 38,44 82,44', fill: hc ? '#000000' : 'url(#' + uid + '-hat)', stroke: hc ? '#ffffff' : 'rgba(196,181,253,0.45)', strokeWidth: 1.1, strokeLinejoin: 'round' }),
          h('polygon', { points: '55,13 55,44 65,44 65,13', fill: hc ? '#facc15' : '#8b5cf6', opacity: hc ? 0.35 : 0.72 }),
          h('path', { d: 'M 42 40 Q 60 44 78 40', stroke: hc ? '#facc15' : '#fde047', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }),
          h('polygon', { className: !noAnim ? 'abs-star-twinkle' : undefined, points: '60,21 61.5,24.8 65.5,26 61.5,27.2 60,31 58.5,27.2 54.5,26 58.5,24.8', fill: '#fde047' }),
          h('circle', { cx: 60, cy: 6, r: 3.4, fill: '#fbbf24', stroke: '#fef9c3', strokeWidth: 0.8 }),
          h('ellipse', { cx: 60, cy: 110, rx: 36, ry: 22, fill: hc ? '#000000' : 'url(#' + uid + '-robe)', stroke: hc ? '#ffffff' : 'rgba(167,139,250,0.42)', strokeWidth: 1.3 }),
          !hc && h('path', { className: 'abs-svg-fx', d: 'M 33 102 Q 60 95 87 102', stroke: 'rgba(221,214,254,0.28)', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' }),
          robeTier >= 2 && h('path', { d: 'M 28 109 Q 60 102 92 109', stroke: '#fde047', strokeWidth: 2.6, fill: 'none', strokeLinecap: 'round' }),
          h('rect', { x: 28, y: 63, width: 6, height: 14, rx: 3, fill: hc ? '#facc15' : moodColor }),
          h('rect', { x: 86, y: 63, width: 6, height: 14, rx: 3, fill: hc ? '#facc15' : moodColor }),
          h('circle', { cx: 60, cy: 70, r: 28, fill: hc ? '#000000' : 'url(#' + uid + '-head)', stroke: hc ? '#facc15' : moodColor, strokeWidth: 2.2 }),
          h('rect', { x: 40, y: 62, width: 40, height: 15, rx: 7.5, fill: hc ? '#000000' : 'url(#' + uid + '-visor)', stroke: hc ? '#ffffff' : 'rgba(165,243,252,0.55)', strokeWidth: 1 }),
          !hc && h('path', { className: 'abs-svg-fx', d: 'M 45 65.5 L 75 65.5', stroke: '#ffffff', strokeOpacity: 0.45, strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('circle', { cx: 50, cy: 69.5, r: 2.7, fill: hc ? '#facc15' : '#ffffff' }),
          h('circle', { cx: 70, cy: 69.5, r: 2.7, fill: hc ? '#facc15' : '#ffffff' }),
          !hc && h('circle', { className: 'abs-svg-fx', cx: 50.8, cy: 68.7, r: 0.9, fill: '#ecfeff' }),
          !hc && h('circle', { className: 'abs-svg-fx', cx: 70.8, cy: 68.7, r: 0.9, fill: '#ecfeff' }),
          h('path', { d: sadMouth ? 'M 52 83 Q 60 77 68 83' : 'M 52 81 Q 60 87 68 81', stroke: hc ? '#ffffff' : moodColor, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' }),
          h('g', (opts.idleTwist && !noAnim) ? { className: 'abs-idle-twist' } : null,
            h('line', { x1: 90, y1: 96, x2: 112, y2: 64, stroke: hc ? '#ffffff' : '#92400e', strokeWidth: 3.4, strokeLinecap: 'round' }),
            h('line', { x1: 106, y1: 72.5, x2: 110, y2: 66.8, stroke: '#fde047', strokeWidth: 4, strokeLinecap: 'round' }),
            h('circle', { cx: 112, cy: 64, r: 5.2, fill: hc ? '#facc15' : moodColor, stroke: '#ffffff', strokeWidth: 1.1, className: noAnim ? '' : 'abs-pulse' }),
            !hc && h('circle', { className: 'abs-svg-fx', cx: 110.8, cy: 62.5, r: 1.6, fill: '#ffffff', opacity: 0.9 })
          )
        );
      }

      // \u2500\u2500\u2500 Confetti burst overlay (Phase A) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
      function VictoryConfettiBurst() {
        if (reduceMotion || isContrast) return null;
        var pieces = [];
        var colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fde047'];
        for (var ci = 0; ci < 18; ci++) {
          var angle = (ci / 18) * 6.283;
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
        var todayStr = sageLocalDate(new Date());
        var lastClaim = d.dailyClaimedOn || null;
        var dailyAvailable = lastClaim !== todayStr;
        var streakState = (d.streak && typeof d.streak === 'object' && !Array.isArray(d.streak)) ? d.streak : { count: 0, lastDate: null, longest: 0, milestones: {} };
        function isYesterday(dateStr) { return sageIsYesterday(dateStr, Date.now()); }
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
          updateSageAtomic(function(cur) {
            return {
              dailyClaimedOn: todayStr,
              essence: safeNum(cur.essence, essence) + totalBonus,
              lastVisit: Date.now(),
              streak: { count: newCount, lastDate: todayStr, longest: newLongest, milestones: milestones }
            };
          });
          if (milestoneBonus > 0) {
            addToast(
              t('stem.allobotsage.toast_streak_milestone', '\uD83D\uDD25 {label} +{bonus} bonus essence on top of daily!')
                .replace('{label}', milestoneLabel)
                .replace('{bonus}', String(milestoneBonus)),
              'success'
            );
            announceSR('Streak milestone: ' + milestoneLabel + ' Plus ' + milestoneBonus + ' bonus.');
          } else {
            addToast(
              t('stem.allobotsage.toast_daily_bonus', '\u2B50 Daily bonus: +{bonus} essence ({domains} domains tended) \u00B7 {streak}-day streak')
                .replace('{bonus}', String(bonus))
                .replace('{domains}', String(n))
                .replace('{streak}', String(newCount)),
              'success'
            );
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

        // Mark visit off the render stack (throttled to >60s)
        if ((!d.lastVisit || (nowMs - d.lastVisit) > 60000) && (nowMs - _absLastVisitTick) > 60000) {
          _absLastVisitTick = nowMs;
          Promise.resolve().then(function() { updKey('lastVisit', nowMs); });
        }

        // ── Trophy shelf: one trophy per source tool with unlocked spells ──
        var sourceTally = {};
        unlockedSpells.forEach(function(s) {
          if (!sourceTally[s.sourceTool]) sourceTally[s.sourceTool] = { label: s.sourceLabel.split(' ')[0], icon: s.icon, count: 0, color: s.color };
          sourceTally[s.sourceTool].count += 1;
        });
        // Canonical source-tool list (keeps empty slots visible as "Yet to earn")
        var canonicalSources = [
          { key: 'spaceExplorer',   label: t('stem.allobotsage.space_explorer', 'Space Explorer'),   icon: '\uD83C\uDF0C' },
          { key: 'mathLab',         label: t('stem.allobotsage.math_lab', 'Math Lab'),         icon: '\uD83D\uDD22' },
          { key: 'roadReady',       label: 'RoadReady',        icon: '\uD83D\uDE97' },
          { key: 'wordSounds',      label: t('stem.allobotsage.word_sounds', 'Word Sounds'),      icon: '\uD83D\uDD24' },
          { key: 'writeCraft',      label: 'WriteCraft',       icon: '\u270D\uFE0F' },
          { key: 'immersiveReader', label: t('stem.allobotsage.immersive_reader', 'Immersive Reader'), icon: '\uD83D\uDCD6' }
        ];

        var activeDomainCount = Object.keys(sourceTally).length;
        var masteryPct = SPELLBOOK.length > 0 ? Math.round((unlockedSpells.length / SPELLBOOK.length) * 100) : 0;
        var wandTierHub = unlockedSpells.length === 0 ? 0 : unlockedSpells.length < 4 ? 1 : unlockedSpells.length < 10 ? 2 : 3;
        var robeTierHub = unlockedSpells.length >= 15 ? 2 : unlockedSpells.length >= 5 ? 1 : 0;
        var ringRadius = 22;
        var ringCirc = 2 * Math.PI * ringRadius;
        var ringOffset = ringCirc * (1 - Math.min(1, Math.max(0, masteryPct / 100)));

        return h('div', { className: 'abs-workbench max-w-4xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade') + ' relative', 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          // ── Spell Preview Modal (overlay) ──
          // Renders when d.previewingSpellId is set. Shows 2-3 sample challenge
          // questions, per-spell SRS health, and a "Drill in Study Hall" jump.
          // Solves a real UX gap: previously the only way to see a spell's
          // questions was to cast it in combat (high-stakes), so students
          // couldn't make informed choices about which spell to practice.
          d.previewingSpellId && h(stableType('SpellPreviewDialog', function SpellPreviewDialog() {
            var dialogRef = React.useRef(null);
            var closeButtonRef = React.useRef(null);
            var openerRef = React.useRef(null);
            var ps = findSpell(d.previewingSpellId);
            function closePreview() {
              sfxClick();
              updKey('previewingSpellId', null);
            }
            React.useEffect(function() {
              var opener = document.activeElement;
              openerRef.current = opener && typeof opener.focus === 'function' ? opener : null;
              var initialFocus = closeButtonRef.current || dialogRef.current;
              if (initialFocus && typeof initialFocus.focus === 'function') initialFocus.focus();
              return function() {
                var previousFocus = openerRef.current;
                if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
                  previousFocus.focus();
                }
              };
            }, []);
            function handlePreviewKeyDown(e) {
              if (e.key === 'Escape') {
                if (e.isComposing || (e.nativeEvent && e.nativeEvent.isComposing) || e.keyCode === 229) return;
                e.preventDefault();
                e.stopPropagation();
                closePreview();
                return;
              }
              if (e.key !== 'Tab' || !dialogRef.current) return;
              var focusable = Array.prototype.slice.call(dialogRef.current.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              )).filter(function(node) { return node.getAttribute('aria-hidden') !== 'true'; });
              if (focusable.length === 0) {
                e.preventDefault();
                dialogRef.current.focus();
                return;
              }
              var first = focusable[0];
              var last = focusable[focusable.length - 1];
              var active = document.activeElement;
              if (!dialogRef.current.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
              } else if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
              }
            }
            if (!ps) return null;
            var bank = getMergedBank(ps, aiChallengeCache, offlineChallengeCache);
            var stats = questionStatsMap;
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
            if (unseenSample) samples.push({ q: unseenSample, tag: 'New — you haven\'t tried this yet', color: 'var(--allo-stem-text-soft, #64748b)' });
            if (samples.length === 0 && bank.length > 0) {
              // Fallback: just show first 2 from bank
              samples = bank.slice(0, 2).map(function(qq) { return { q: qq, tag: 'Sample question', color: 'var(--allo-stem-text-soft, #64748b)' }; });
            }
            // Cast count from castCounts
            var castN = (d.castCounts || {})[ps.id] || 0;
            return h('div', {
              ref: dialogRef,
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': 'abs-preview-title',
              tabIndex: -1,
              style: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'auto' },
              onKeyDown: handlePreviewKeyDown,
              onClick: function(e) { if (e.target === e.currentTarget) closePreview(); }
            },
              h('div', {
                style: { maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', border: '2px solid ' + ps.color, borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }
              },
                // Header
                h('div', { className: 'p-4 flex items-center gap-3', style: { background: 'linear-gradient(135deg, ' + ps.color + '25, ' + ps.color + '10)' } },
                  h('span', { className: 'text-4xl' }, ps.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { id: 'abs-preview-title', className: 'text-lg font-bold', style: { color: ps.color } }, ps.name),
                    h('div', { className: 'text-[0.6875rem] text-slate-600 mt-0.5' }, ps.sourceLabel + ' · ' + ps.element + ' · ' + ps.baseDamage + ' base dmg · crit ×' + ps.critMultiplier.toFixed(1))
                  ),
                  h('button', {
                    ref: closeButtonRef,
                    type: 'button',
                    onClick: closePreview,
                    className: 'transition-colors text-2xl text-slate-600 hover:text-slate-800 font-bold leading-none focus:ring-2 focus:ring-violet-400 focus:outline-none rounded px-2',
                    'aria-label': t('stem.allobotsage.close_preview', 'Close preview')
                  }, '×')
                ),
                // Flavor + stats strip
                h('div', { className: 'px-4 py-2 text-[0.75rem] italic text-slate-600 border-b border-slate-200' }, '"' + ps.flavor + '"'),
                h('div', { className: 'px-4 py-2 grid grid-cols-3 gap-2 text-center border-b border-slate-200' },
                  h('div', null,
                    h('div', { className: 'text-[0.5625rem] font-bold text-slate-600 uppercase tracking-wider' }, t('stem.allobotsage.casts', 'Casts')),
                    h('div', { className: 'text-base font-bold text-violet-700' }, castN)
                  ),
                  h('div', null,
                    h('div', { className: 'text-[0.5625rem] font-bold text-slate-600 uppercase tracking-wider' }, t('stem.allobotsage.questions', 'Questions')),
                    h('div', { className: 'text-base font-bold text-slate-700' }, bank.length, h('span', { className: 'text-[0.625rem] text-slate-600 font-normal' }, ' (' + pSeen + ' seen)'))
                  ),
                  h('div', null,
                    h('div', { className: 'text-[0.5625rem] font-bold text-slate-600 uppercase tracking-wider' }, t('stem.allobotsage.accuracy', 'Accuracy')),
                    h('div', { className: 'text-base font-bold ' + (pAccPct === null ? 'text-slate-600' : pAccPct >= 75 ? 'text-emerald-600' : pAccPct >= 50 ? 'text-amber-600' : 'text-red-600') }, pAccPct === null ? '—' : pAccPct + '%')
                  )
                ),
                // Sample questions
                h('div', { className: 'p-4' },
                  h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-2' }, '📋 Sample Questions (' + samples.length + ')'),
                  h('div', { className: 'space-y-2' },
                    samples.map(function(samp, si) {
                      var qq = samp.q;
                      return h('div', { key: 'samp-' + si, className: 'p-3 rounded-lg border border-slate-200 bg-slate-50' },
                        h('div', { className: 'flex items-center gap-1 mb-1' },
                          h('span', { className: 'text-[0.5625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded', style: { color: samp.color, background: samp.color + '15' } }, samp.tag),
                          qq.aiGenerated && h('span', { className: 'text-[0.5625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700' }, t('stem.allobotsage.ai', '✨ AI')),
                          qq.offlineGenerated && h('span', { className: 'text-[0.5625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900' }, t('stem.allobotsage.offline_pack_badge', '⚙ Practice Pack'))
                        ),
                        h('p', { className: 'text-[0.75rem] font-semibold text-slate-800 mb-2' }, qq.prompt),
                        h('div', { className: 'space-y-1' },
                          qq.options.map(function(opt, oi) {
                            var isCorrect = oi === qq.correctIndex;
                            return h('div', {
                              key: 'samp-opt-' + oi,
                              className: 'text-[0.6875rem] p-1.5 rounded ' + (isCorrect ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300' : 'bg-white text-slate-600 border border-slate-200')
                            },
                              h('span', { className: 'inline-block w-5 font-bold' }, String.fromCharCode(65 + oi) + '.'),
                              opt,
                              isCorrect && h('span', { className: 'ml-1' }, '✓')
                            );
                          })
                        ),
                        h('div', { className: 'mt-2 text-[0.625rem] italic text-slate-500' }, '→ ' + qq.explain)
                      );
                    })
                  )
                ),
                // CTA: drill in Study Hall
                h('div', { className: 'px-4 pb-4 flex gap-2' },
                  h('button', {
                    type: 'button',
                    onClick: function() {
                      sfxClick();
                      updSage({ phase: 'practice', practiceSpellId: ps.id, practiceQuestion: null, practiceSession: { correct: 0, attempted: 0 }, previewingSpellId: null });
                    },
                    className: 'transition-colors flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-300 focus:outline-none',
                    'aria-label': t('stem.allobotsage.aria_drill_in_study_hall', 'Drill {name} in Study Hall').replace('{name}', ps.name)
                  }, t('stem.allobotsage.drill_in_study_hall', '📚 Drill in Study Hall')),
                  h('button', {
                    type: 'button',
                    onClick: closePreview,
                    className: 'transition-colors px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 focus:ring-2 focus:ring-slate-500 focus:outline-none'
                  }, t('stem.allobotsage.close', 'Close'))
                )
              )
            );
          }), null),

          // Header
          h('div', { className: 'flex items-center gap-3 mb-4' },
            !isEmbedded && backBtn(function() { sfxClick(); setStemLabTool(null); }, t('stem.allobotsage.back_to_lab', 'Back to Lab')),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[0.625rem] text-slate-600 font-semibold uppercase tracking-wider' + onHostInk }, t('stem.allobotsage.spellforge', 'Spellforge'))
          ),

          // Hero row: Starbound Spellforge Observatory Deck
          // ── Phase B: wand-tier + robe-tier scale with mastery ──
          // wandTier:  0 (no spells) → 1 (1-3) → 2 (4-9) → 3 (10+)
          // robeTier:  0 (default) → 1 (5+ spells) → 2 (15+ spells)
          h('div', { className: 'abs-hero-deck p-4 md:p-6 mb-4' },
            h('div', { className: 'flex flex-col sm:flex-row sm:items-center gap-4' },
              h('div', { className: 'flex items-center gap-3 shrink-0' },
                allobotAvatar(visitMood, {
                  wandTier: wandTierHub,
                  robeTier: robeTierHub,
                  idleTwist: true // Phase C: micro-flourish on the hub avatar
                }),
                // Grimoire Mastery Arc Gauge (non-spoiler mastery progress)
                (function() {
                  var arcCol = isContrast ? '#facc15' : (wandTierHub >= 3 ? '#fde047' : '#a78bfa');
                  var tipAng = -Math.PI / 2 + (Math.max(0, Math.min(100, masteryPct)) / 100) * Math.PI * 2;
                  var tipX = 30 + ringRadius * Math.cos(tipAng);
                  var tipY = 30 + ringRadius * Math.sin(tipAng);
                  return h('svg', { viewBox: '0 0 60 60', width: 58, height: 58, 'aria-hidden': 'true', className: 'shrink-0 hidden sm:block' },
                    !isContrast && h('defs', null,
                      h('radialGradient', { id: 'abs-mg-well', cx: '50%', cy: '40%', r: '56%' },
                        h('stop', { offset: '0%', stopColor: '#312e81', stopOpacity: 0.72 }),
                        h('stop', { offset: '100%', stopColor: '#090d1f', stopOpacity: 0.94 })
                      ),
                      h('linearGradient', { id: 'abs-mg-arc', x1: '0', y1: '0', x2: '1', y2: '1' },
                        h('stop', { offset: '0%', stopColor: wandTierHub >= 3 ? '#fef08a' : '#c4b5fd' }),
                        h('stop', { offset: '100%', stopColor: wandTierHub >= 3 ? '#f59e0b' : '#38bdf8' })
                      )
                    ),
                    h('circle', { cx: 30, cy: 30, r: 28, fill: isContrast ? '#000000' : 'url(#abs-mg-well)', stroke: isContrast ? '#ffffff' : 'rgba(196,181,253,0.35)', strokeWidth: 1 }),
                    [0, 1, 2, 3, 4, 5, 6, 7].map(function(ti) {
                      var ta = (ti / 8) * Math.PI * 2 - Math.PI / 2;
                      return h('line', { key: 'mt-' + ti, x1: (30 + 25.5 * Math.cos(ta)).toFixed(1), y1: (30 + 25.5 * Math.sin(ta)).toFixed(1), x2: (30 + 27.5 * Math.cos(ta)).toFixed(1), y2: (30 + 27.5 * Math.sin(ta)).toFixed(1), stroke: isContrast ? '#facc15' : 'rgba(221,214,254,0.4)', strokeWidth: 0.9 });
                    }),
                    h('circle', { cx: 30, cy: 30, r: ringRadius, fill: 'none', stroke: isContrast ? 'rgba(255,255,255,0.28)' : 'rgba(196,181,253,0.24)', strokeWidth: 4.5 }),
                    !isContrast && h('circle', {
                      className: 'abs-svg-fx abs-halo-breath',
                      cx: 30, cy: 30, r: ringRadius, fill: 'none',
                      stroke: arcCol, strokeWidth: 8.5, strokeOpacity: 0.22, strokeLinecap: 'round',
                      strokeDasharray: ringCirc.toFixed(1), strokeDashoffset: ringOffset.toFixed(1),
                      transform: 'rotate(-90 30 30)'
                    }),
                    h('circle', {
                      cx: 30, cy: 30, r: ringRadius, fill: 'none',
                      stroke: isContrast ? '#facc15' : 'url(#abs-mg-arc)', strokeWidth: 4.5, strokeLinecap: 'round',
                      strokeDasharray: ringCirc.toFixed(1), strokeDashoffset: ringOffset.toFixed(1),
                      transform: 'rotate(-90 30 30)'
                    }),
                    masteryPct > 2 && !isContrast && h('circle', { className: 'abs-svg-fx abs-beacon-pulse', cx: tipX.toFixed(1), cy: tipY.toFixed(1), r: 5.5, fill: arcCol, opacity: 0.36 }),
                    masteryPct > 2 && h('circle', { cx: tipX.toFixed(1), cy: tipY.toFixed(1), r: 2.4, fill: '#ffffff', stroke: arcCol, strokeWidth: 1 }),
                    h('text', { x: 30, y: 29, fill: '#f8fafc', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, masteryPct + '%'),
                    h('text', { x: 30, y: 40, fill: isContrast ? '#facc15' : '#ddd6fe', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, 'T' + wandTierHub)
                  );
                })()
              ),
              h('div', { className: 'flex-1 min-w-0' },
                h('div', { className: 'flex flex-wrap items-center gap-2 mb-1.5' },
                  h('span', { className: 'abs-hero-badge' },
                    h('svg', { viewBox: '0 0 20 20', width: 14, height: 14, 'aria-hidden': 'true' },
                      !isContrast && h('defs', null,
                        h('radialGradient', { id: 'abs-crest-g', cx: '50%', cy: '50%', r: '50%' },
                          h('stop', { offset: '0%', stopColor: '#fde047', stopOpacity: 0.45 }),
                          h('stop', { offset: '100%', stopColor: '#fde047', stopOpacity: 0 })
                        )
                      ),
                      !isContrast && h('circle', { className: 'abs-svg-fx abs-halo-breath', cx: 10, cy: 10, r: 9.2, fill: 'url(#abs-crest-g)' }),
                      h('circle', { className: !isContrast ? 'abs-orbit-drift' : undefined, cx: 10, cy: 10, r: 8.2, fill: 'none', stroke: '#fde047', strokeWidth: 1.4, strokeDasharray: '3 2' }),
                      h('polygon', { points: '10,2.5 12,8 17.5,10 12,12 10,17.5 8,12 2.5,10 8,8', fill: '#fde047' }),
                      h('circle', { cx: 10, cy: 10, r: 1.7, fill: '#ffffff' })
                    ),
                    t('stem.allobotsage.starbound_spellforge_badge', 'Starbound Spellforge · Retrieval Roguelite')
                  )
                ),
                h('h1', { className: 'text-xl md:text-2xl font-bold tracking-tight' }, t('stem.allobotsage.allobot_starbound_sage', 'AlloBot: Starbound Sage')),
                h('p', { className: 'text-sm text-violet-100 mt-1 italic' }, greeting),
                h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                  h('div', { className: 'abs-hero-pill' }, '\u2728 ' + unlockedSpells.length + '/' + SPELLBOOK.length + ' ' + t('stem.allobotsage.spells_label', 'spells')),
                  h('div', { className: 'abs-hero-pill' }, '\uD83E\uDDED ' + activeDomainCount + '/6 ' + t('stem.allobotsage.domains_label', 'domains')),
                  h('div', { className: 'abs-hero-pill' }, '\uD83D\uDD2E ' + totalCasts + ' ' + t('stem.allobotsage.casts_lower', 'casts')),
                  h('div', { className: 'abs-hero-pill' }, '\uD83C\uDF0C ' + expeditionsDone + ' ' + t('stem.allobotsage.expeditions_label', 'expeditions')),
                  // Streak chip \u2014 color glows when streak is active (>= 1 day) and intensifies at milestones
                  streakDisplay > 0 && h('div', {
                    className: 'abs-hero-pill abs-hero-pill-gold',
                    title: t('stem.allobotsage.title_longest_streak', 'Longest streak: {days} days').replace('{days}', String(streakState.longest || streakDisplay))
                  }, '\uD83D\uDD25 ' + streakDisplay + '-day streak'),
                  h('div', { className: 'abs-hero-pill abs-hero-pill-gold' }, '\u2B50 ' + essence + ' ' + t('stem.allobotsage.essence_label', 'essence'))
                ),
                // Quick-Launch Observatory Presets (44px touch targets, non-spoiler)
                h('div', { className: 'abs-preset-bar', role: 'group', 'aria-label': t('stem.allobotsage.quick_launch_presets', 'Quick launch studio modes') },
                  h('button', {
                    type: 'button',
                    className: 'abs-preset-btn',
                    onClick: function() { sfxClick(); updKey('phase', 'inquiry'); },
                    'aria-label': t('stem.allobotsage.open_ai_workload_inquiry', 'Open AI Workload Inquiry Lab')
                  }, '\uD83D\uDD2C ' + t('stem.allobotsage.ai_workload_inquiry_btn', 'AI Workload Inquiry')),
                  h('button', {
                    type: 'button',
                    className: 'abs-preset-btn',
                    onClick: function() { sfxClick(); updKey('phase', 'dashboard'); },
                    'aria-label': t('stem.allobotsage.open_progress_telemetry', 'Open Progress Telemetry Dashboard')
                  }, '\uD83D\uDCCA ' + t('stem.allobotsage.progress_telemetry_btn', 'Progress Telemetry')),
                  unlockedSpells.length > 0
                    ? h('button', {
                        type: 'button',
                        className: 'abs-preset-btn',
                        onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: null, practiceQuestion: null, practiceSession: null }); },
                        'aria-label': t('stem.allobotsage.quick_study_hall_aria', 'Launch untimed Study Hall drill')
                      }, '\uD83D\uDCDA ' + t('stem.allobotsage.study_hall_btn', 'Study Hall Drill'))
                    : (ctx.setStemLabTool && h('button', {
                        type: 'button',
                        className: 'abs-preset-btn',
                        onClick: function() { sfxClick(); try { ctx.setStemLabTool('spaceExplorer'); } catch(e) {} },
                        'aria-label': t('stem.allobotsage.launch_space_explorer_starter', 'Open Space Explorer to unlock your first spell')
                      }, '\uD83D\uDE80 ' + t('stem.allobotsage.unlock_in_space_explorer', 'Start in Space Explorer')))
                )
              )
            )
          ),

          // ── Visual Stage: Grimoire Constellation & Domain Resonance Map ──
          (function() {
            var constellationNodes = [
              { key: 'spaceExplorer',   short: t('stem.allobotsage.node_space', 'Space'),     x: 68,  y: 36, color: '#a855f7' },
              { key: 'mathLab',         short: t('stem.allobotsage.node_math', 'Math'),       x: 150, y: 26, color: '#38bdf8' },
              { key: 'roadReady',       short: t('stem.allobotsage.node_road', 'RoadReady'),  x: 270, y: 26, color: '#f59e0b' },
              { key: 'wordSounds',      short: t('stem.allobotsage.node_words', 'Words'),     x: 352, y: 36, color: '#ec4899' },
              { key: 'writeCraft',      short: t('stem.allobotsage.node_write', 'Write'),     x: 112, y: 94, color: '#34d399' },
              { key: 'immersiveReader', short: t('stem.allobotsage.node_reader', 'Reader'),   x: 308, y: 94, color: '#60a5fa' }
            ];
            var cx = 210, cy = 62;
            return h('section', { className: 'abs-stage-card', 'aria-label': t('stem.allobotsage.constellation_map_section', 'Grimoire domain constellation map') },
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
                h('div', { className: 'abs-stage-title' }, '\u2728 ' + t('stem.allobotsage.grimoire_constellation_title', 'Grimoire Constellation & Domain Resonance')),
                h('div', { className: 'abs-stage-sub font-semibold' }, activeDomainCount + '/6 ' + t('stem.allobotsage.domains_attuned', 'domains attuned') + ' \u00B7 ' + masteryPct + '% ' + t('stem.allobotsage.forged', 'forged'))
              ),
              h('svg', {
                viewBox: '0 0 420 124',
                width: '100%',
                height: 124,
                role: 'img',
                'aria-label': t('stem.allobotsage.constellation_svg_aria', 'Grimoire constellation showing six STEAM domains connected to the central Spellforge core, with active domains illuminated'),
                style: { display: 'block', borderRadius: 12, background: isContrast ? '#000000' : '#090d1f', border: isContrast ? '2px solid #ffffff' : '1px solid rgba(139,92,246,0.38)' }
              },
                !isContrast && h('defs', null,
                  h('radialGradient', { id: 'abs-const-sky', cx: '50%', cy: '50%', r: '62%' },
                    h('stop', { offset: '0%', stopColor: '#2e1065', stopOpacity: 0.85 }),
                    h('stop', { offset: '58%', stopColor: '#111834', stopOpacity: 0.96 }),
                    h('stop', { offset: '100%', stopColor: '#030712', stopOpacity: 1 })
                  ),
                  h('radialGradient', { id: 'abs-const-core', cx: '38%', cy: '32%', r: '68%' },
                    h('stop', { offset: '0%', stopColor: '#6d28d9' }),
                    h('stop', { offset: '60%', stopColor: '#312e81' }),
                    h('stop', { offset: '100%', stopColor: '#1e1b4b' })
                  ),
                  h('radialGradient', { id: 'abs-const-spec', cx: '32%', cy: '28%', r: '66%' },
                    h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.58 }),
                    h('stop', { offset: '55%', stopColor: '#ffffff', stopOpacity: 0.05 }),
                    h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: 0.22 })
                  )
                ),
                // Deep starfield observatory stage
                h('rect', { x: 0, y: 0, width: 420, height: 124, rx: 12, fill: isContrast ? '#000000' : 'url(#abs-const-sky)' }),
                !isContrast && [[24,18,1],[44,88,0.8],[94,16,1.1],[186,14,0.9],[240,108,1],[334,15,1.1],[392,26,0.9],[396,86,1.2],[168,108,0.8],[292,16,0.9]].map(function(st, si) {
                  return h('circle', { key: 'sf-' + si, className: 'abs-svg-fx abs-star-twinkle', cx: st[0], cy: st[1], r: st[2], fill: '#e0e7ff', opacity: 0.45, style: { animationDelay: (si * 0.37) + 's' } });
                }),
                // Dual astrolabe orbital reference rings
                h('ellipse', { className: !isContrast ? 'abs-orbit-drift' : undefined, cx: cx, cy: cy, rx: 152, ry: 46, fill: 'none', stroke: isContrast ? '#facc15' : 'rgba(167,139,250,0.24)', strokeWidth: 1.1, strokeDasharray: '4 4' }),
                h('ellipse', { cx: cx, cy: cy, rx: 90, ry: 29, fill: 'none', stroke: isContrast ? '#ffffff' : 'rgba(148,163,184,0.22)', strokeWidth: 0.9 }),
                // Dual-pass glowing resonance conduits from each domain to central Spellforge core
                constellationNodes.map(function(nd) {
                  var active = !!(sourceTally[nd.key] && sourceTally[nd.key].count > 0);
                  var midX = (nd.x + cx) / 2;
                  var midY = (nd.y + cy) / 2;
                  return h('g', { key: 'beam-' + nd.key },
                    !isContrast && active && h('line', { className: 'abs-svg-fx', x1: nd.x, y1: nd.y, x2: cx, y2: cy, stroke: nd.color, strokeWidth: 6, strokeOpacity: 0.22, strokeLinecap: 'round' }),
                    h('line', {
                      className: !isContrast && !active ? 'abs-conduit-flow-slow' : undefined,
                      x1: nd.x, y1: nd.y, x2: cx, y2: cy,
                      stroke: active ? (isContrast ? '#facc15' : nd.color) : 'rgba(148,163,184,0.32)',
                      strokeWidth: active ? 2.2 : 1.2,
                      strokeDasharray: active ? '' : '3 3',
                      strokeLinecap: 'round'
                    }),
                    !isContrast && active && h('line', { className: 'abs-svg-fx abs-conduit-flow', x1: nd.x, y1: nd.y, x2: cx, y2: cy, stroke: '#ffffff', strokeWidth: 1.4, strokeDasharray: '5 19', strokeOpacity: 0.78, strokeLinecap: 'round' }),
                    active && h('circle', { cx: midX, cy: midY, r: 2.3, fill: isContrast ? '#facc15' : '#ffffff', stroke: isContrast ? '#000000' : nd.color, strokeWidth: 1 })
                  );
                }),
                // Central Spellforge Reactor Core
                !isContrast && h('circle', { className: 'abs-svg-fx abs-halo-breath', cx: cx, cy: cy, r: 27, fill: '#8b5cf6', opacity: 0.24 }),
                h('circle', { className: !isContrast ? 'abs-orbit-drift' : undefined, cx: cx, cy: cy, r: 23, fill: 'none', stroke: isContrast ? '#facc15' : 'rgba(196,181,253,0.45)', strokeWidth: 1, strokeDasharray: '3 3' }),
                h('circle', { cx: cx, cy: cy, r: 19, fill: isContrast ? '#000000' : 'url(#abs-const-core)', stroke: isContrast ? '#facc15' : '#ddd6fe', strokeWidth: 2 }),
                h('text', { x: cx, y: cy + 4, fill: '#ffffff', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, unlockedSpells.length + '/' + SPELLBOOK.length),
                // Sculpted domain star nodes
                constellationNodes.map(function(nd) {
                  var tally = sourceTally[nd.key];
                  var count = tally ? tally.count : 0;
                  var active = count > 0;
                  var labelY = nd.y < 60 ? nd.y + 22 : nd.y + 20;
                  return h('g', { key: 'node-' + nd.key },
                    active && !isContrast && h('circle', { className: 'abs-svg-fx abs-beacon-pulse', cx: nd.x, cy: nd.y, r: 15.5, fill: nd.color, opacity: 0.28 }),
                    h('circle', {
                      cx: nd.x, cy: nd.y, r: 9.8,
                      fill: active ? (isContrast ? '#facc15' : nd.color) : '#1e293b',
                      stroke: active ? '#ffffff' : '#94a3b8',
                      strokeWidth: active ? 2 : 1.3
                    }),
                    active && !isContrast && h('circle', { className: 'abs-svg-fx', cx: nd.x, cy: nd.y, r: 9.8, fill: 'url(#abs-const-spec)' }),
                    h('text', { x: nd.x, y: nd.y + 3.5, fill: active ? (isContrast ? '#000000' : '#ffffff') : '#cbd5e1', fontSize: 10, fontWeight: 800, textAnchor: 'middle' }, count),
                    h('text', { x: nd.x, y: labelY, fill: active ? '#f8fafc' : '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, nd.short)
                  );
                })
              ),
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mt-2 abs-stage-sub' },
                h('span', null, t('stem.allobotsage.constellation_legend_lit', 'Bright star = spells forged in domain \u00B7 Dim star = open tool below to ignite')),
                h('span', { className: 'font-semibold' }, t('stem.allobotsage.wand_tier_readout', 'Wand Tier') + ' ' + wandTierHub + '/3')
              )
            );
          })(),

          // Daily bonus
          dailyAvailable && unlockedSpells.length > 0 && h('button', {
            type: 'button',
            onClick: claimDaily,
            className: 'w-full mb-3 rounded-xl p-3 text-left border-2 border-amber-600 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 focus:ring-2 focus:ring-amber-400 focus:outline-none transition abs-pulse',
            'aria-label': t('stem.allobotsage.claim_daily_essence_bonus', 'Claim daily essence bonus')
          },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-3xl' }, '\uD83C\uDF81'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm text-amber-900' }, t('stem.allobotsage.daily_bonus_ready', 'Daily Bonus ready!')),
                h('div', { className: 'text-[0.6875rem] text-amber-700' }, t('stem.allobotsage.essence_scales_with_how_many_source_to', 'Essence scales with how many source tools you\u2019ve tended.'))
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
                    h('strong', { className: 'text-base text-amber-900' }, t('stem.allobotsage.welcome_future_sage', 'Welcome, future Sage!'))
                  ),
                  h('p', { className: 'mb-2 text-amber-900 leading-relaxed' },
                    t('stem.allobotsage.sage_spells_unlock_when_you_make_progr', 'Sage spells unlock when you make progress in OTHER STEAM Lab tools \u2014 Space Explorer, Math Lab, RoadReady, and more. Each spell is a retrieval-practice ability: you cast by answering a question from that tool\'s domain.')
                  ),
                  h('p', { className: 'mb-2 text-amber-900 leading-relaxed' },
                    h('strong', null, t('stem.allobotsage.how_to_start', 'How to start: ')), t('stem.allobotsage.scroll_down_to_yet_to_discover_and_cli', 'scroll down to "Yet to discover" and click any spell\'s '),
                    h('span', { className: 'inline-block px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono text-[0.625rem]' }, t('stem.allobotsage.open_tool_name', '\u2192 Open [tool name]')),
                    t('stem.allobotsage.button_that_ll_take_you_to_the_tool_th', ' button. That\'ll take you to the tool that unlocks it.')
                  ),
                  h('p', { className: 'text-[0.75rem] text-amber-700 italic' },
                    t('stem.allobotsage.practice_across_alloflow_counts_here', 'Your practice across AlloFlow counts here. Even a single mission, problem, or drill in another tool will start unlocking spells here.')
                  )
                )
              : [
                  h('button', {
                    type: 'button',
                    key: 'expedition',
                    onClick: function() {
                      sfxClick();
                      var defaults = unlockedSpells.slice(0, 3).map(function(s) { return s.id; });
                      updSage({ phase: 'loadout', equippedLoadout: equippedLoadout.length >= 1 ? equippedLoadout : defaults });
                    },
                    className: 'transition-colors flex-1 px-6 py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 focus:ring-2 focus:ring-violet-300 focus:outline-none shadow-lg'
                  }, t('stem.allobotsage.begin_expedition_3_rooms_boss', '\uD83C\uDF0C Begin Expedition (3 rooms \u2192 boss)')),
                  h('button', {
                    type: 'button',
                    key: 'shop',
                    onClick: function() { sfxClick(); updKey('phase', 'shop'); },
                    className: 'transition-colors px-5 py-3 rounded-xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 focus:ring-2 focus:ring-amber-600 focus:outline-none'
                  }, t('stem.allobotsage.spell_shop', '\uD83D\uDD2E Spell Shop'))
                ]
          ),

          // \u2500\u2500 Pedagogy row: Study Hall + Review Tough Questions \u2500\u2500
          // These are the no-stakes learning surfaces. Study Hall = untimed
          // drill; Review = flashcard queue of questions you got wrong.
          unlockedSpells.length > 0 && (function() {
            // Compute how many tough questions are queued (across the whole grimoire)
            var statsHub = questionStatsMap;
            var toughCount = 0;
            SPELLBOOK.forEach(function(sp) {
              var bank = getMergedBank(sp, aiChallengeCache, offlineChallengeCache);
              bank.forEach(function(qq) {
                var st = statsHub[qq.prompt];
                if (st && st.lastResult === 'backfire') toughCount++;
              });
            });
            return h('div', { className: 'flex flex-col md:flex-row gap-2 mb-5' },
              h('button', {
                type: 'button',
                onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: null, practiceQuestion: null, practiceSession: null }); },
                className: 'transition-colors flex-1 px-5 py-2.5 rounded-xl font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none flex items-center justify-center gap-2',
                'aria-label': t('stem.allobotsage.open_study_hall_untimed_practice_mode', 'Open Study Hall \u2014 untimed practice mode')
              },
                h('span', { className: 'text-xl' }, '\uD83D\uDCDA'),
                h('div', { className: 'text-left' },
                  h('div', { className: 'text-sm' }, t('stem.allobotsage.study_hall', 'Study Hall')),
                  h('div', { className: 'text-[0.625rem] text-emerald-600 font-normal' }, t('stem.allobotsage.untimed_drill_no_damage_full_explanati', 'Untimed drill \u00B7 no damage \u00B7 full explanations'))
                )
              ),
              h('button', {
                type: 'button',
                onClick: function() { sfxClick(); updSage({ phase: 'review_mistakes', reviewIdx: 0, reviewRevealed: false }); },
                className: 'transition-colors flex-1 px-5 py-2.5 rounded-xl font-bold text-red-800 bg-red-50 hover:bg-red-100 border-2 border-red-200 focus:ring-2 focus:ring-red-500 focus:outline-none flex items-center justify-center gap-2',
                'aria-label': t('stem.allobotsage.aria_review_tough_queued', 'Review tough questions \u2014 {count} queued').replace('{count}', String(toughCount))
              },
                h('span', { className: 'text-xl' }, '\uD83C\uDFAF'),
                h('div', { className: 'text-left' },
                  h('div', { className: 'text-sm flex items-center gap-2' },
                    t('stem.allobotsage.review_tough', 'Review Tough'),
                    toughCount > 0 && h('span', { className: 'text-[0.625rem] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full' }, toughCount)
                  ),
                  h('div', { className: 'text-[0.625rem] text-red-600 font-normal' },
                    toughCount === 0
                      ? 'No mistakes yet \u2014 keep playing'
                      : 'Re-study what you got wrong'
                  )
                )
              ),
              h('button', {
                type: 'button',
                onClick: function() { sfxClick(); updKey('phase', 'dashboard'); },
                className: 'transition-colors flex-1 px-5 py-2.5 rounded-xl font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 focus:ring-2 focus:ring-sky-600 focus:outline-none flex items-center justify-center gap-2',
                'aria-label': t('stem.allobotsage.view_your_progress_dashboard', 'View your progress dashboard')
              },
                h('span', { className: 'text-xl' }, '\uD83D\uDCCA'),
                h('div', { className: 'text-left' },
                  h('div', { className: 'text-sm' }, t('stem.allobotsage.your_progress', 'Your Progress')),
                  h('div', { className: 'text-[0.625rem] text-sky-600 font-normal' }, t('stem.allobotsage.accuracy_calibration_sectors_bosses', 'Accuracy \u00B7 calibration \u00B7 sectors \u00B7 bosses'))
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
            return h('section', { 'aria-label': t('stem.allobotsage.achievement_gallery', 'Achievement gallery'), className: 'mb-5' },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('h2', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1' },
                  h('span', null, t('stem.allobotsage.achievements', '🏅 Achievements')),
                  h('span', { className: 'text-violet-700' }, '(' + earnedCount + '/' + hookEval.length + ')')
                ),
                h('button', {
                  type: 'button',
                  onClick: function() { sfxClick(); updKey('galleryOpen', !galleryOpen); },
                  className: 'transition-colors ml-auto text-[0.625rem] text-slate-500 hover:text-slate-800 font-semibold focus:ring-2 focus:ring-violet-400 focus:outline-none rounded px-2 py-0.5',
                  'aria-expanded': galleryOpen
                }, galleryOpen ? 'Collapse' : 'Expand')
              ),
              galleryOpen && h('div', { className: 'rounded-xl p-3 border border-slate-200 bg-white' },
                h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
                  // Earned first, then unearned
                  hookEval.slice().sort(function(a, b) { return (b.earned ? 1 : 0) - (a.earned ? 1 : 0); }).map(function(h2) {
                    return h('div', {
                      key: 'ach-' + h2.id,
                      className: 'flex items-center gap-2 p-2 rounded-lg text-[0.6875rem] ' + (h2.earned ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'),
                      'aria-label': h2.earned
                        ? t('stem.allobotsage.aria_achievement_earned', '{label} (earned)').replace('{label}', h2.label)
                        : t('stem.allobotsage.aria_achievement_progress', '{label} (in progress: {progress})').replace('{label}', h2.label).replace('{progress}', String(h2.progress))
                    },
                      h('span', { className: 'text-base', style: { filter: h2.earned ? '' : 'grayscale(0.5) opacity(0.65)' } }, h2.icon),
                      h('div', { className: 'flex-1 min-w-0' },
                        h('div', { className: 'font-semibold truncate ' + (h2.earned ? 'text-emerald-900' : 'text-slate-700') }, h2.label),
                        h('div', { className: 'text-[0.5625rem] ' + (h2.earned ? 'text-emerald-700' : 'text-slate-600') }, h2.earned ? '✓ Earned' : h2.progress)
                      )
                    );
                  })
                )
              )
            );
          })(),

          // Trophy shelf
          unlockedSpells.length > 0 && h('section', { 'aria-label': t('stem.allobotsage.trophy_shelf', 'Trophy shelf'), className: 'mb-5' },
            h('h2', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.allobotsage.trophy_shelf_2', '\uD83C\uDFC6 Trophy Shelf')),
            h('div', { className: 'rounded-xl p-3 border-2 border-amber-200/50 bg-gradient-to-b from-amber-50/50 to-white' },
              h('div', { className: 'grid grid-cols-3 gap-2' },
                canonicalSources.map(function(src) {
                  var tally = sourceTally[src.key];
                  var earned = !!tally && tally.count > 0;
                  return h('div', {
                    key: src.key,
                    className: 'text-center p-2 rounded-lg ' + (earned ? 'bg-white border border-amber-200' : 'bg-slate-50 border border-dashed border-slate-300'),
                    'aria-label': earned
                      ? t('stem.allobotsage.aria_trophy_earned', '{label}: {count} spells earned').replace('{label}', src.label).replace('{count}', String(tally.count))
                      : t('stem.allobotsage.aria_trophy_none', '{label}: no spells yet').replace('{label}', src.label)
                  },
                    h('div', { className: 'text-2xl', style: { filter: earned ? '' : 'grayscale(1) opacity(0.5)' } }, src.icon),
                    h('div', { className: 'text-[0.6875rem] font-bold mt-1 ' + (earned ? 'text-amber-900' : 'text-slate-600') }, src.label),
                    h('div', { className: 'text-[0.625rem] ' + (earned ? 'text-amber-700' : 'text-slate-600') },
                      earned ? (tally.count + ' spell' + (tally.count > 1 ? 's' : '')) : 'yet to earn'
                    )
                  );
                })
              )
            )
          ),

          // Grimoire
          h('section', { 'aria-label': t('stem.allobotsage.grimoire', 'Grimoire'), className: 'mb-4' },
            h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
              h('h2', { className: 'text-sm font-bold text-slate-700 flex items-center gap-2' + onHostInk },
                h('span', null, t('stem.allobotsage.grimoire_2', '\uD83D\uDCDC Grimoire')),
                unlockedSpells.length > 0 && h('span', { className: 'text-[0.625rem] font-normal text-slate-600' },
                  '(' + unlockedSpells.length + ' unlocked)'
                )
              ),
              unlockedSpells.length > 0 && h('button', {
                type: 'button',
                onClick: function() {
                  sfxClick();
                  var targetIds = unlockedSpells.slice(0, 6).map(function(sp) { return sp.id; });
                  var added = generateOfflinePackForSpells(targetIds, true);
                  if (added > 0) {
                    addToast(
                      t('stem.allobotsage.toast_offline_grimoire_reroll', '\u2699\uFE0F Practice Generator: +{count} fresh questions ready across your grimoire')
                        .replace('{count}', String(added)),
                      'success'
                    );
                  }
                },
                className: 'ml-auto px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-violet-100 hover:bg-violet-200 text-violet-900 border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 transition-colors',
                'aria-label': t('stem.allobotsage.aria_grimoire_reroll_practice', 'Generate or reroll fresh offline practice questions for unlocked spells')
              }, t('stem.allobotsage.grimoire_reroll_practice_btn', '\u2699\uFE0F Reroll Practice Pack'))
            ),
            unlockedSpells.length > 0 && h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-4' },
              unlockedSpells.map(function(s) { return spellCard(s, { unlocked: true, usageCount: castCountsMap[s.id] || 0, onClick: function() { sfxClick(); updKey('previewingSpellId', s.id); } }); })
            ),
            lockedSpells.length > 0 && h('div', null,
              h('h3', { className: 'text-[0.6875rem] font-semibold text-slate-600 uppercase tracking-wider mb-2' + onHostInk }, 'Yet to discover (' + lockedSpells.length + ')'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                lockedSpells.map(function(s) {
                  return h('div', { key: 'locked-wrap-' + s.id, className: 'flex flex-col gap-1' },
                    spellCard(s, { unlocked: false }),
                    // Cross-tool jump button: makes the "play source tool to unlock"
                    // loop one-click. Closes the distance between Sage and the
                    // STEAM Lab tools that feed it.
                    ctx.setStemLabTool && h('button', {
                      type: 'button',
                      onClick: function() {
                        sfxClick();
                        try { ctx.setStemLabTool(s.sourceTool); } catch(e) {}
                      },
                      className: 'text-[0.625rem] text-slate-500 hover:text-violet-700 font-semibold py-1 px-2 rounded-md hover:bg-violet-50 focus:ring-2 focus:ring-violet-400 focus:outline-none transition flex items-center gap-1 self-end',
                      'aria-label': t('stem.allobotsage.aria_open_source_tool', 'Open {tool} to work toward unlocking {spell}').replace('{tool}', s.sourceLabel).replace('{spell}', s.name)
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

      // ══ AI-WORKLOAD INQUIRY widget (H7b'') ══
      if (phase === 'inquiry') {
        // A string is truthy and passes `||` straight through, leaving
        // iq.aiAssist and iq.log undefined. Merge over the defaults so a
        // partial or wrong-typed saved object still has every field.
        var _iqDefaults = { aiAssist: 50, learnerEffort: 50, novelty: 5, errorCost: 5, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        var iq = Object.assign({}, _iqDefaults, (d.aiInquiry && typeof d.aiInquiry === 'object' && !Array.isArray(d.aiInquiry)) ? d.aiInquiry : {});
        if (!Array.isArray(iq.log)) iq.log = [];
        ['aiAssist', 'learnerEffort', 'novelty', 'errorCost'].forEach(function(k) {
          if (typeof iq[k] !== 'number' || !isFinite(iq[k])) iq[k] = _iqDefaults[k];
        });
        var setIQ = function(patch) { updKey('aiInquiry', Object.assign({}, iq, patch)); };
        var setKey = function(k, v) { var p = {}; p[k] = v; setIQ(p); };
        // learning gain = effort × novelty, dampened by over-assist
        var overAssist = Math.max(0, iq.aiAssist + iq.learnerEffort - 100);
        var learnGain = (iq.learnerEffort / 100) * iq.novelty * 1.2 - (overAssist / 100) * 3;
        var efficiency = (iq.aiAssist / 100) * iq.novelty * 0.8 + (100 - iq.aiAssist) / 100 * 0.2;
        var risk = iq.errorCost * (1 - iq.learnerEffort / 100) * (iq.aiAssist / 100);
        var state = learnGain > 5 && risk < 3 ? 'ideal' : learnGain > 3 && risk < 5 ? 'productive' : risk > 6 ? 'risky' : learnGain < 1 ? 'shortcircuit' : 'mixed';
        var sm = ({
          ideal: { label: t('stem.allobotsage.ideal_ai_partnership', 'Ideal AI partnership'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: t('stem.allobotsage.ai_scaffolds_while_learner_does_most_o', 'AI scaffolds while learner does most of the cognitive work. Genuine learning + reasonable safety.') },
          productive: { label: t('stem.allobotsage.productive', 'Productive'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: t('stem.allobotsage.real_learning_happens_with_ai_assist_t', 'Real learning happens with AI assist. Trade-offs balanced.') },
          mixed: { label: t('stem.allobotsage.mixed_signals', 'Mixed signals'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: t('stem.allobotsage.some_learning_some_risk_watch_for_over', 'Some learning, some risk. Watch for over-reliance creep.') },
          risky: { label: t('stem.allobotsage.risky', 'Risky'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: t('stem.allobotsage.high_error_cost_low_learner_effort_ai_', 'High error cost + low learner effort + AI in the loop = brittle outputs that look correct but fail in production.') },
          shortcircuit: { label: t('stem.allobotsage.learning_short_circuit', 'Learning short-circuit'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: t('stem.allobotsage.ai_doing_all_the_work_learner_gets_ans', 'AI doing all the work. Learner gets answer but no understanding. Skills atrophy or never develop.') }
        })[state];
        return h('div', { className: 'abs-workbench', 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0', style: { padding: 14, borderRadius: 12, background: isContrast ? '#000000' : sm.bg, border: '1px solid ' + (isContrast ? '#ffffff' : sm.border), color: '#e8f0f5', maxWidth: 720, margin: '0 auto' } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, t('stem.allobotsage.ai_workload_inquiry_who_is_doing_the_t', '🔬 AI Workload Inquiry — Who Is Doing The Thinking?')),
          h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, t('stem.allobotsage.set_ai_assistance_level_learner_effort', 'Set AI assistance level, learner effort, task novelty, and error cost, then observe how the modeled learning state changes. The result updates live; record a hypothesis or pattern you notice.')),
          h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: sm.color, color: '#000', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label + ' · learn ' + learnGain.toFixed(1) + ' · risk ' + risk.toFixed(1)),
          h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }, role: 'group', 'aria-label': t('stem.allobotsage.inquiry_presets_group', 'Workload inquiry scenario presets') },
            h('button', { type: 'button', className: 'abs-inquiry-preset', onClick: function() { setIQ({ aiAssist: 25, learnerEffort: 75, novelty: 8, errorCost: 4 }); } }, t('stem.allobotsage.preset_balanced_copilot', 'Balanced Co-Pilot')),
            h('button', { type: 'button', className: 'abs-inquiry-preset', onClick: function() { setIQ({ aiAssist: 90, learnerEffort: 10, novelty: 7, errorCost: 8 }); } }, t('stem.allobotsage.preset_shortcircuit_risk', 'Short-Circuit Risk')),
            h('button', { type: 'button', className: 'abs-inquiry-preset', onClick: function() { setIQ({ aiAssist: 10, learnerEffort: 85, novelty: 6, errorCost: 9 }); } }, t('stem.allobotsage.preset_high_stakes_solo', 'High-Stakes Solo'))
          ),
          (function() {
            var dotX = 24 + Math.min(312, Math.max(0, risk * 24 + 156));
            var dotY = 72 - Math.min(46, Math.max(-46, learnGain * 5));
            var pillY = dotY > 72 ? 32 : 98;
            return h('svg', { width: '100%', height: 144, viewBox: '0 0 360 144', role: 'img', 'aria-label': t('stem.allobotsage.workload_learning_risk_chart', 'Workload, learning, and risk chart'), style: { background: isContrast ? '#000000' : '#060a18', borderRadius: 10, marginBottom: 10, border: isContrast ? '2px solid #ffffff' : '1px solid rgba(148,163,184,0.30)' } },
              !isContrast && h('defs', null,
                h('radialGradient', { id: 'abs-iq-well', cx: '50%', cy: '50%', r: '62%' },
                  h('stop', { offset: '0%', stopColor: '#131d36' }),
                  h('stop', { offset: '100%', stopColor: '#030712' })
                ),
                h('linearGradient', { id: 'abs-iq-good', x1: '0', y1: '0', x2: '1', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#22c55e', stopOpacity: 0.22 }),
                  h('stop', { offset: '100%', stopColor: '#22c55e', stopOpacity: 0.03 })
                ),
                h('linearGradient', { id: 'abs-iq-bad', x1: '0', y1: '0', x2: '1', y2: '1' },
                  h('stop', { offset: '0%', stopColor: '#ef4444', stopOpacity: 0.04 }),
                  h('stop', { offset: '100%', stopColor: '#ef4444', stopOpacity: 0.24 })
                )
              ),
              // Studio quadrant backdrop
              h('rect', { x: 0, y: 0, width: 360, height: 144, rx: 10, fill: isContrast ? '#000000' : 'url(#abs-iq-well)' }),
              h('rect', { x: 18, y: 18, width: 162, height: 54, rx: 4, fill: isContrast ? 'rgba(255,255,255,0.06)' : 'url(#abs-iq-good)' }),
              h('rect', { x: 180, y: 72, width: 162, height: 54, rx: 4, fill: isContrast ? 'rgba(250,204,21,0.08)' : 'url(#abs-iq-bad)' }),
              h('rect', { x: 18, y: 18, width: 324, height: 108, rx: 4, fill: 'none', stroke: isContrast ? '#ffffff' : 'rgba(148,163,184,0.22)', strokeWidth: 0.9 }),
              // Cross-axis dividers
              h('line', { x1: 180, y1: 18, x2: 180, y2: 126, stroke: isContrast ? '#ffffff' : '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }),
              h('line', { x1: 18, y1: 72, x2: 342, y2: 72, stroke: isContrast ? '#ffffff' : '#64748b', strokeWidth: 1, strokeDasharray: '3 3' }),
              // Laser crosshair projections to axes from active operating point
              h('line', { className: !isContrast ? 'abs-conduit-flow-slow' : undefined, x1: dotX, y1: 18, x2: dotX, y2: 126, stroke: isContrast ? '#facc15' : sm.color, strokeWidth: 0.9, strokeDasharray: '2 3', opacity: 0.45 }),
              h('line', { className: !isContrast ? 'abs-conduit-flow-slow' : undefined, x1: 18, y1: dotY, x2: 342, y2: dotY, stroke: isContrast ? '#facc15' : sm.color, strokeWidth: 0.9, strokeDasharray: '2 3', opacity: 0.45 }),
              // Axis labels
              h('text', { x: 180, y: 13, fill: isContrast ? '#facc15' : '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, t('stem.allobotsage.high_learning', 'High Learning')),
              h('text', { x: 180, y: 139, fill: isContrast ? '#facc15' : '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, t('stem.allobotsage.low_learning', 'Low Learning')),
              h('text', { x: 24, y: 68, fill: isContrast ? '#ffffff' : '#86efac', fontSize: 10, fontWeight: 700 }, t('stem.allobotsage.safe_axis', 'Safe')),
              h('text', { x: 336, y: 68, fill: isContrast ? '#facc15' : '#fca5a5', fontSize: 10, fontWeight: 700, textAnchor: 'end' }, t('stem.allobotsage.risky_axis', 'Risky')),
              // Luminous telemetry beacon at operating point
              !isContrast && h('circle', { className: 'abs-svg-fx abs-beacon-pulse', cx: dotX, cy: dotY, r: 16, fill: 'none', stroke: sm.color, strokeWidth: 1.4, opacity: 0.48 }),
              !isContrast && h('circle', { className: 'abs-svg-fx abs-beacon-pulse', cx: dotX, cy: dotY, r: 13.5, fill: sm.color, opacity: 0.24 }),
              h('circle', { cx: dotX, cy: dotY, r: 7.5, fill: isContrast ? '#facc15' : sm.color, stroke: '#ffffff', strokeWidth: 2 }),
              !isContrast && h('circle', { className: 'abs-svg-fx', cx: dotX - 2, cy: dotY - 2, r: 2.1, fill: '#ffffff', opacity: 0.85 }),
              // Non-colliding frosted state badge pill
              h('rect', { x: 102, y: pillY - 12, width: 156, height: 18, rx: 9, fill: isContrast ? '#000000' : 'rgba(15,23,42,0.88)', stroke: isContrast ? '#facc15' : sm.color, strokeWidth: 1 }),
              h('text', { x: 180, y: pillY, fill: isContrast ? '#facc15' : sm.color, fontSize: 10.5, textAnchor: 'middle', fontWeight: 800 }, sm.label)
            );
          })(),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 12px', marginBottom: 10 } },
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, t('stem.allobotsage.ai_assistance', 'AI assistance (%)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.aiAssist)),
              h('input', { type: 'range', min: 0, max: 100, step: 5, value: iq.aiAssist, onChange: function(e) { setKey('aiAssist', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, t('stem.allobotsage.learner_effort', 'Learner effort (%)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.learnerEffort)),
              h('input', { type: 'range', min: 0, max: 100, step: 5, value: iq.learnerEffort, onChange: function(e) { setKey('learnerEffort', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, t('stem.allobotsage.task_novelty_1_10', 'Task novelty (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.novelty)),
              h('input', { type: 'range', min: 1, max: 10, step: 1, value: iq.novelty, onChange: function(e) { setKey('novelty', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            ),
            h('label', { style: { fontSize: 11 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } }, h('span', null, t('stem.allobotsage.error_cost_1_10', 'Error cost (1-10)')), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.errorCost)),
              h('input', { type: 'range', min: 1, max: 10, step: 1, value: iq.errorCost, onChange: function(e) { setKey('errorCost', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { type: 'button', onClick: function() {
              var stamp = new Date().toISOString().slice(11, 19);
              setIQ({ log: iq.log.concat([{ t: stamp, ai: iq.aiAssist, le: iq.learnerEffort, nov: iq.novelty, ec: iq.errorCost, lg: learnGain.toFixed(1), rk: risk.toFixed(1), state: sm.label }]) });
            }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, t('stem.allobotsage.log_this_workload_split', '📋 Log this workload split')),
            h('button', { type: 'button', onClick: function() { setIQ({ aiAssist: 50, learnerEffort: 50, novelty: 5, errorCost: 5 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, t('stem.allobotsage.reset', 'Reset')),
            h('button', { type: 'button', onClick: function() { updKey('phase', 'hub'); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: '#94a3b8', cursor: 'pointer' } }, t('stem.allobotsage.hub', '← Hub'))
          ),
          iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: '#0a0a1a', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
            iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · ai' + e.ai + ' le' + e.le + ' nov' + e.nov + ' ec' + e.ec + ' → learn ' + e.lg + ' risk ' + e.rk); })
          ),
          h('label', { style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, t('stem.allobotsage.your_hypothesis_when_does_ai_assist_he', 'Your hypothesis (when does AI assist help vs hurt? Where would you draw the line?)')),
          h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: t('stem.allobotsage.e_g_on_high_novelty_tasks_ai_is_a_brai', 'e.g., on high-novelty tasks AI is a brainstorm partner; on routine work it short-circuits skill...'), 'aria-label': t('stem.allobotsage.hypothesis_input', 'AI workload hypothesis'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
          !iq.stuckRevealed && h('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: '#0a0a1a', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, t('stem.allobotsage.i_m_stuck_show_open_questions', "🤔 I'm stuck — show open questions")),
          iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: '#0a0a1a', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
            h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, t('stem.allobotsage.open_questions_no_answer_key', 'Open questions (no answer key)')),
            h('ul', { style: { margin: 0, paddingLeft: 16 } },
              h('li', null, t('stem.allobotsage.ai_assist_learner_effort_sums_to_100_w', 'AI assist + learner effort sums to > 100 — what does over-assist do to learning gain?')),
              h('li', null, t('stem.allobotsage.why_does_novelty_matter_for_both_learn', 'Why does novelty matter for both learning AND risk?')),
              h('li', null, t('stem.allobotsage.when_is_ai_doing_90_of_the_work_actual', 'When is AI doing 90% of the work actually the right call? (Hint: error cost low, novelty low, time-pressured production.)')),
              h('li', null, t('stem.allobotsage.how_would_you_design_a_class_where_ai_', 'How would you design a class where AI is allowed but doesn\'t short-circuit learning?'))
            )
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
            h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
            h('span', null, t('stem.allobotsage.i_can_explain_why_this_ai_effort_novel', 'I can explain why this AI/effort/novelty/cost combo yields this state.'))
          ),
          iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: t('stem.allobotsage.explain_in_your_own_words', 'Explain in your own words...'), 'aria-label': t('stem.allobotsage.explanation_input', 'AI workload explanation'), style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
          h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, t('stem.allobotsage.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget — no score, no reveal, no answer dump. "Learning gain" is a heuristic; real measures need pre/post assessment, transfer tasks, retention checks. AI assist effects vary by domain (creative vs technical vs reflective).'))
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: LOADOUT
      // ─────────────────────────────────────────────────
      if (phase === 'loadout') {
        var loadoutSet = {};
        equippedLoadout.forEach(function(id) { loadoutSet[id] = true; });
        var available = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });
        var safeDifficulty = (typeof d.difficulty === 'string' && DIFFICULTY_PROFILES[d.difficulty]) ? d.difficulty : 'standard';
        var safeSelectedSector = (typeof d.selectedSector === 'string' && d.selectedSector) ? d.selectedSector : 'crystal_nebula';
        function toggleSpell(id) {
          var next;
          if (loadoutSet[id]) {
            next = equippedLoadout.filter(function(x) { return x !== id; });
          } else {
            if (equippedLoadout.length >= 3) {
              addToast(t('stem.allobotsage.toast_loadout_full', 'Loadout is full \u2014 unequip a spell first'), 'info');
              return;
            }
            next = equippedLoadout.concat([id]);
          }
          sfxClick();
          updKey('equippedLoadout', next);
        }
        return h('div', { className: 'abs-workbench max-w-3xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(function() { sfxClick(); updKey('phase', 'hub'); }, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge')),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[0.625rem] text-slate-600 font-semibold uppercase tracking-wider' + onHostInk }, t('stem.allobotsage.loadout', 'Loadout'))
          ),
          h('h2', { className: 'text-lg font-bold mb-1' }, t('stem.allobotsage.choose_your_spells', 'Choose your spells')),
          h('p', { className: 'text-sm text-slate-600 mb-4' },
            t('stem.allobotsage.equip_up_to_3_spells_you_can_only_cast', 'Equip up to 3 spells. You can only cast equipped spells on this Expedition.')
          ),
          h('div', { className: 'mb-4 p-3 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-900' },
            h('strong', null, 'Equipped: '),
            equippedLoadout.length,
            '/3 '
          ),

          // \u2500\u2500 Difficulty selector (UDL "multiple means of engagement") \u2500\u2500
          h('section', { 'aria-label': t('stem.allobotsage.choose_your_challenge_level', 'Choose your challenge level'), className: 'mb-4 p-3 rounded-xl border-2 border-slate-200 bg-white' },
            h('div', { className: 'text-[0.6875rem] font-bold text-slate-700 uppercase tracking-wider mb-2' }, t('stem.allobotsage.challenge_level', '\u2699\ufe0f Challenge level')),
            h('p', { className: 'text-[0.625rem] text-slate-500 mb-2 italic' }, t('stem.allobotsage.pick_what_fits_today_you_can_change_th', 'Pick what fits today. You can change this any expedition. Harder difficulty = bigger essence reward.')),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
              ['easy', 'standard', 'hard'].map(function(diffId) {
                var dp = DIFFICULTY_PROFILES[diffId];
                var picked = safeDifficulty === diffId;
                return h('button', {
                  type: 'button',
                  key: 'diff-' + diffId,
                  onClick: function() { sfxClick(); updKey('difficulty', diffId); },
                  className: 'text-left p-2.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (picked ? 'shadow-md' : 'hover:border-slate-400'),
                  style: picked ? { borderColor: dp.color, background: dp.color + '12' } : { borderColor: '#e2e8f0', background: '#fff' },
                  'aria-pressed': picked,
                  'aria-label': t('stem.allobotsage.aria_difficulty_option', '{name} difficulty. {desc} Reward multiplier {mult}x.')
                    .replace('{name}', dp.name)
                    .replace('{desc}', __alloT('stem.allobotsage.' + diffId + '_desc', dp.desc))
                    .replace('{mult}', String(dp.essenceMult))
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-xl' }, dp.icon),
                    h('span', { className: 'font-bold text-sm', style: { color: dp.color } }, dp.name),
                    picked && h('span', { className: 'ml-auto text-violet-700 font-bold text-xs' }, '\u2713')
                  ),
                  h('div', { className: 'text-[0.625rem] leading-snug text-slate-600 mb-1' }, __alloT('stem.allobotsage.' + (diffId) + '_desc', dp.desc)),
                  h('div', { className: 'text-[0.5625rem] text-slate-500 font-mono' },
                    'crit \u2264' + dp.critWindowSec + 's \u00b7 ' + dp.rooms + ' rooms \u00b7 ' + dp.playerHp + ' HP \u00b7 ' + dp.essenceMult + 'x essence'
                  )
                );
              })
            )
          ),

          // \u2500\u2500 Loadout presets \u2500\u2500
          available.length >= 3 && (function() {
            var presets = (Array.isArray(d.loadoutPresets) ? d.loadoutPresets : []).filter(function(p) {
              return p && typeof p === 'object' && typeof p.name === 'string' && Array.isArray(p.spellIds);
            });
            async function saveAsPreset() {
              if (equippedLoadout.length === 0) {
                addToast(t('stem.allobotsage.toast_equip_before_preset', 'Equip at least 1 spell before saving a preset'), 'info');
                return;
              }
              if (presets.length >= 3) {
                addToast(t('stem.allobotsage.toast_presets_full', 'Preset slots are full \u2014 delete one to save a new preset'), 'info');
                return;
              }
              var defaultName = 'Preset ' + (presets.length + 1);
              async function requestPresetName() {
                var promptModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.PromptDialog && window.AlloModules.PromptDialog.PromptDialog;
                var promptApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.prompt;
                var unavailable = t('stem.allobotsage.toast_preset_naming_unavailable', 'Preset naming is unavailable, so your loadout was not saved.');
                if (typeof promptModule !== 'function' || typeof promptApi !== 'function') {
                  addToast(unavailable, 'warning');
                  announceSR(unavailable);
                  return null;
                }
                try {
                  return await promptApi(t('stem.allobotsage.prompt_name_preset', 'Name this preset:'), defaultName, {
                    title: t('stem.allobotsage.title_name_loadout_preset', 'Name loadout preset'),
                    placeholder: t('stem.allobotsage.placeholder_preset_example', 'For example: Crystal Nebula spells'),
                    confirmText: t('stem.allobotsage.confirm_save_preset', 'Save preset'),
                    cancelText: t('stem.allobotsage.cancel_btn', 'Cancel'),
                    maxLength: 24
                  });
                } catch (e) {
                  var failed = t('stem.allobotsage.toast_preset_dialog_failed', 'The preset name dialog could not open, so your loadout was not saved.');
                  addToast(failed, 'warning');
                  announceSR(failed);
                  return null;
                }
              }
              var name = await requestPresetName();
              if (name === null) { announceSR(__alloT('stem.allobotsage.sr_preset_save_cancelled', 'Preset save cancelled.')); return; }
              name = (String(name).trim() || defaultName).slice(0, 24);
              sfxClick();
              updKey('loadoutPresets', presets.concat([{ name: name, spellIds: equippedLoadout.slice() }]));
              addToast(t('stem.allobotsage.toast_saved_preset', '\ud83d\udcbe Saved preset: {name}').replace('{name}', name), 'success');
            }
            function loadPreset(p) {
              sfxClick();
              var valid = p.spellIds.filter(function(id) { return currentlyUnlocked.indexOf(id) !== -1; });
              updKey('equippedLoadout', valid);
              var skipped = p.spellIds.length - valid.length;
              addToast(
                skipped > 0
                  ? t('stem.allobotsage.toast_loaded_preset_skipped', 'Loaded preset: {name} ({skipped} locked skipped)')
                      .replace('{name}', p.name)
                      .replace('{skipped}', String(skipped))
                  : t('stem.allobotsage.toast_loaded_preset', 'Loaded preset: {name}').replace('{name}', p.name),
                'info'
              );
            }
            function deletePreset(idx) {
              sfxClick();
              var next = presets.slice();
              next.splice(idx, 1);
              updKey('loadoutPresets', next);
            }
            return h('section', { 'aria-label': t('stem.allobotsage.loadout_presets', 'Loadout presets'), className: 'mb-4 p-3 rounded-xl border-2 border-slate-200 bg-slate-50' },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600' }, '\ud83d\udcbe Loadout Presets ' + (presets.length > 0 ? '(' + presets.length + '/3)' : '')),
                h('button', {
                  type: 'button',
                  onClick: saveAsPreset,
                  disabled: presets.length >= 3 || equippedLoadout.length === 0,
                  className: 'transition-colors text-[0.625rem] font-bold py-1 px-2 rounded-md bg-slate-700 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-slate-400 focus:outline-none',
                  title: presets.length >= 3
                    ? t('stem.allobotsage.title_preset_slots_full', 'Preset slots full')
                    : equippedLoadout.length === 0
                      ? t('stem.allobotsage.title_equip_one_first', 'Equip at least 1 spell first')
                      : t('stem.allobotsage.title_save_current_preset', 'Save current loadout as a preset')
                }, t('stem.allobotsage.save_current', '+ Save current'))
              ),
              presets.length === 0
                ? h('div', { className: 'text-[0.6875rem] text-slate-500 italic' }, t('stem.allobotsage.no_presets_yet_build_a_loadout_you_lik', 'No presets yet. Build a loadout you like and click "Save current" to keep it for next time.'))
                : h('div', { className: 'flex flex-col gap-1.5' },
                    presets.map(function(p, idx) {
                      return h('div', {
                        key: 'preset-' + idx,
                        className: 'flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200'
                      },
                        h('button', {
                          type: 'button',
                          onClick: function() { loadPreset(p); },
                          className: 'flex-1 text-left text-[0.6875rem] font-semibold text-violet-700 hover:underline focus:ring-2 focus:ring-violet-400 focus:outline-none rounded',
                          'aria-label': t('stem.allobotsage.aria_load_preset', 'Load preset {name}').replace('{name}', p.name)
                        }, '\ud83d\udcc2 ' + p.name),
                        h('div', { className: 'flex items-center gap-1' },
                          p.spellIds.slice(0, 3).map(function(id) {
                            var sp = findSpell(id);
                            return sp ? h('span', { key: 'pi-' + id, className: 'text-base', title: sp.name, style: { opacity: currentlyUnlocked.indexOf(id) !== -1 ? 1 : 0.35 } }, sp.icon) : null;
                          })
                        ),
                        h('button', {
                          type: 'button',
                          onClick: async function() {
                            var confirmModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ConfirmDialog && window.AlloModules.ConfirmDialog.ConfirmDialog;
                            var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
                            var unavailable = t('stem.allobotsage.toast_preset_delete_unavailable', 'Preset deletion is unavailable right now, so the preset was kept.');
                            if (typeof confirmModule !== 'function' || typeof confirmApi !== 'function') {
                              addToast(unavailable, 'warning');
                              announceSR(unavailable);
                              return;
                            }
                            var confirmed = false;
                            try {
                              confirmed = await confirmApi(
                                t('stem.allobotsage.confirm_delete_preset_msg', 'Delete preset "{name}"?').replace('{name}', p.name),
                                {
                                  title: t('stem.allobotsage.title_delete_loadout_preset', 'Delete loadout preset'),
                                  confirmText: t('stem.allobotsage.confirm_delete_preset', 'Delete preset'),
                                  cancelText: t('stem.allobotsage.cancel_keep_preset', 'Keep preset'),
                                  tone: 'warning'
                                }
                              );
                            } catch (e) {
                              addToast(unavailable, 'warning');
                              announceSR(unavailable);
                              return;
                            }
                            if (confirmed) { deletePreset(idx); announceSR('Deleted preset: ' + p.name); }
                            else announceSR(__alloT('stem.allobotsage.sr_preset_kept', 'Preset kept.'));
                          },
                          className: 'transition-colors text-[0.75rem] text-slate-600 hover:text-red-600 px-1 focus:ring-2 focus:ring-red-400 focus:outline-none rounded',
                          'aria-label': t('stem.allobotsage.aria_delete_preset', 'Delete preset {name}').replace('{name}', p.name)
                        }, '\ud83d\uddd1')
                      );
                    })
                  )
            );
          })(),

          // Question Bank panel — Offline Practice Generator when offline, seamlessly upgrading to Gemini when aiOn is true.
          equippedLoadout.length > 0 && h('section', {
            'aria-label': aiOn
              ? t('stem.allobotsage.ai_question_banks', 'AI question banks')
              : t('stem.allobotsage.offline_practice_generator_aria', 'Offline practice question generator'),
            className: 'mb-4 p-3 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50'
          },
            h('div', { className: 'flex items-center justify-between gap-2 mb-2' },
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1' },
                  aiOn
                    ? t('stem.allobotsage.infinite_question_bank', '\u2728 Infinite Question Bank')
                    : t('stem.allobotsage.offline_practice_generator_title', '\u2699\ufe0f Offline Practice Generator')
                ),
                h('div', { className: 'text-[0.625rem] text-violet-700 mt-0.5' },
                  aiOn
                    ? t('stem.allobotsage.static_questions_never_run_out_gemini_', 'Static questions never run out \u2014 Gemini generates fresh ones on top.')
                    : t('stem.allobotsage.offline_practice_generator_desc', 'No internet or AI needed \u2014 synthesize fresh deterministic retrieval-practice packs per spell.')
                ),
                aiOn && h('div', { className: 'text-[0.625rem] text-amber-700 mt-0.5 font-semibold' }, t('stem.allobotsage.ai_generated_questions_can_be_wrong_ev', '\u26a0\ufe0f AI-generated questions can be wrong (even the marked answer) \u2014 if one looks off, tell your teacher.'))
              ),
              aiOn
                ? h('button', {
                    type: 'button',
                    onClick: function() {
                      if (!aiOn) return;
                      sfxClick();
                      var inFlight = Object.assign({}, aiInFlightMap);
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
                        addToast(t('stem.allobotsage.toast_ai_already_cached', 'All equipped spells already have AI questions cached'), 'info');
                        return;
                      }
                      updKey('_aiInFlight', inFlight);
                      addToast(
                        t('stem.allobotsage.toast_generating_fresh_questions', 'Generating fresh questions for {count} spells...')
                          .replace('{count}', String(promises.length)),
                        'info'
                      );
                      Promise.all(promises).then(function(results) {
                        var addedCount = 0;
                        var emptyIds = [];
                        results.forEach(function(r) {
                          if (r && Array.isArray(r.qs) && r.qs.length > 0) {
                            addedCount += r.qs.length;
                          } else if (r && r.id) {
                            emptyIds.push(r.id);
                          }
                        });
                        updateSageAtomic(function(cur) {
                          var freshCache = Object.assign({}, safeObj(cur.aiChallengeCache));
                          var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                          results.forEach(function(r) {
                            if (!r || !r.id) return;
                            delete freshFlight[r.id];
                            if (Array.isArray(r.qs) && r.qs.length > 0) {
                              freshCache[r.id] = r.qs;
                            }
                          });
                          return { aiChallengeCache: freshCache, _aiInFlight: freshFlight };
                        });
                        if (addedCount > 0) {
                          addToast(t('stem.allobotsage.toast_ai_questions_ready', '+{count} AI questions ready').replace('{count}', String(addedCount)), 'success');
                        } else if (emptyIds.length > 0) {
                          var offAdded = generateOfflinePackForSpells(emptyIds, true);
                          addToast(
                            t('stem.allobotsage.toast_offline_fallback_ready', '\u2699\ufe0f +{count} offline practice questions ready')
                              .replace('{count}', String(offAdded)),
                            'info'
                          );
                        }
                      }).catch(function(err) {
                        console.warn('[AlloBotSage] Pre-load AI questions failed:', err);
                        updateSageAtomic(function(cur) {
                          var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                          equippedLoadout.forEach(function(spellId) { delete freshFlight[spellId]; });
                          return { _aiInFlight: freshFlight };
                        });
                        addToast(t('stem.allobotsage.toast_ai_generate_failed', 'Failed to generate AI questions. Try again.'), 'error');
                      });
                    },
                    className: 'transition-colors px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold text-white bg-violet-700 hover:bg-violet-800 focus:ring-2 focus:ring-violet-300 focus:outline-none'
                  }, t('stem.allobotsage.pre_load', '\u2728 Pre-load'))
                : h('button', {
                    type: 'button',
                    onClick: function() {
                      sfxClick();
                      var addedOff = generateOfflinePackForSpells(equippedLoadout, true);
                      if (addedOff > 0) {
                        addToast(
                          t('stem.allobotsage.toast_offline_pack_generated', '\u2699\ufe0f +{count} fresh offline practice questions ready')
                            .replace('{count}', String(addedOff)),
                          'success'
                        );
                      }
                    },
                    className: 'transition-colors px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold text-white bg-violet-700 hover:bg-violet-800 focus:ring-2 focus:ring-violet-300 focus:outline-none',
                    'aria-label': t('stem.allobotsage.aria_generate_offline_pack', 'Generate fresh offline practice questions for equipped spells')
                  }, t('stem.allobotsage.generate_offline_pack_btn', '\u2699\ufe0f Generate Pack'))
            ),
            // Per-spell question bank status row
            h('div', { className: 'flex flex-col gap-1' },
              equippedLoadout.map(function(spellId) {
                var s = findSpell(spellId);
                if (!s) return null;
                var aiCount = Array.isArray(aiChallengeCache[spellId]) ? aiChallengeCache[spellId].length : 0;
                var offCount = Array.isArray(offlineChallengeCache[spellId]) ? offlineChallengeCache[spellId].length : 0;
                var staticCount = (s.challengeBank || []).length;
                var inFlight = !!aiInFlightMap[spellId];
                return h('div', {
                  key: 'ai-' + spellId,
                  className: 'flex items-center gap-2 text-[0.6875rem] py-0.5'
                },
                  h('span', { className: 'flex-shrink-0' }, s.icon),
                  h('span', { className: 'font-bold flex-1 truncate', style: { color: s.color } }, s.name),
                  h('span', { className: 'text-slate-600 text-[0.625rem]' }, staticCount + ' static'),
                  aiOn
                    ? (inFlight
                        ? h('span', { className: 'text-violet-600 text-[0.625rem] font-bold' + (reduceMotion ? '' : ' abs-pulse') }, t('stem.allobotsage.generating', '\u23f3 generating...'))
                        : aiCount > 0
                          ? h('span', { className: 'text-violet-900 text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-violet-100 border border-violet-300' }, '\u2728 +' + aiCount + ' AI')
                          : h('span', { className: 'text-slate-600 text-[0.625rem] italic' }, t('stem.allobotsage.no_ai_yet', 'no AI yet')))
                    : (offCount > 0
                        ? h('span', { className: 'text-emerald-900 text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-300' }, '\u2699\ufe0f +' + offCount)
                        : h('span', { className: 'text-slate-600 text-[0.625rem] italic' }, t('stem.allobotsage.offline_ready_hint', 'ready to generate'))),
                  aiOn && aiCount > 0 && !inFlight && h('button', {
                    type: 'button',
                    onClick: function() {
                      if (!aiOn) return;
                      sfxClick();
                      var inFlightLocal = Object.assign({}, aiInFlightMap);
                      inFlightLocal[spellId] = true;
                      updKey('_aiInFlight', inFlightLocal);
                      aiGenerateChallenges(s, callGemini, toolData).then(function(qs) {
                        updateSageAtomic(function(cur) {
                          var freshCache = Object.assign({}, safeObj(cur.aiChallengeCache));
                          var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                          delete freshFlight[spellId];
                          if (qs.length > 0) freshCache[spellId] = qs;
                          return { aiChallengeCache: freshCache, _aiInFlight: freshFlight };
                        });
                        if (qs.length > 0) {
                          addToast(
                            t('stem.allobotsage.toast_spell_rerolled', '\u2728 {name} rerolled (+{count} new)')
                              .replace('{name}', s.name)
                              .replace('{count}', String(qs.length)),
                            'success'
                          );
                        }
                      }).catch(function(err) {
                        console.warn('[AlloBotSage] Reroll failed for ' + spellId + ':', err);
                        updateSageAtomic(function(cur) {
                          var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                          delete freshFlight[spellId];
                          return { _aiInFlight: freshFlight };
                        });
                        addToast(t('stem.allobotsage.toast_spell_reroll_failed', 'Failed to reroll {name}. Try again.').replace('{name}', s.name), 'error');
                      });
                    },
                    'aria-label': t('stem.allobotsage.aria_regenerate_ai_questions', 'Regenerate AI questions for {name}').replace('{name}', s.name),
                    className: 'transition-colors text-violet-700 hover:text-violet-900 text-[0.625rem] focus:outline-none focus:ring-1 focus:ring-violet-400 rounded px-1'
                  }, '\ud83d\udd04'),
                  !aiOn && h('button', {
                    type: 'button',
                    onClick: function() {
                      sfxClick();
                      var addedOne = generateOfflinePackForSpells([spellId], true);
                      if (addedOne > 0) {
                        addToast(
                          t('stem.allobotsage.toast_offline_spell_rerolled', '\u2699\ufe0f {name} practice pack rerolled (+{count} fresh)')
                            .replace('{name}', s.name)
                            .replace('{count}', String(addedOne)),
                          'success'
                        );
                      }
                    },
                    'aria-label': t('stem.allobotsage.aria_reroll_offline_questions', 'Reroll offline practice questions for {name}').replace('{name}', s.name),
                    className: 'transition-colors text-violet-700 hover:text-violet-900 text-[0.625rem] focus:outline-none focus:ring-1 focus:ring-violet-400 rounded px-1'
                  }, '\ud83d\udd04')
                );
              })
            )
          ),

          // Sector picker \u2014 richer cards showing the sector's enemy/boss pool
          h('section', { 'aria-label': t('stem.allobotsage.sector', 'Sector'), className: 'mb-5' },
            h('h3', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.allobotsage.choose_a_sector', '\uD83C\uDF0C Choose a sector')),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
              SECTORS.map(function(sec) {
                var unlocked = expeditionsDone >= sec.unlockAt;
                var selected = safeSelectedSector === sec.id;
                var labelAria = unlocked
                  ? (selected
                      ? t('stem.allobotsage.aria_sector_selected', '{name} (selected)').replace('{name}', sec.name)
                      : t('stem.allobotsage.aria_sector_unlocked', '{name} (unlocked)').replace('{name}', sec.name))
                  : t('stem.allobotsage.aria_sector_locked', '{name} (locked: complete {count} expeditions)').replace('{name}', sec.name).replace('{count}', String(sec.unlockAt));
                var sectorNormals = ENEMIES.filter(function(e) {
                  return !e.boss && e.sectors && e.sectors.indexOf(sec.id) !== -1;
                });
                var sectorBosses = ENEMIES.filter(function(e) {
                  return e.boss && sec.bossPool && sec.bossPool.indexOf(e.id) !== -1;
                });
                return h('button', {
                  type: 'button',
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
                      h('div', { className: 'text-[0.625rem] mt-0.5 ' + (selected ? 'opacity-95 font-bold' : 'text-amber-600 font-bold') },
                        unlocked
                          ? ('\u2728 Essence \u00d7' + sec.essenceMult.toFixed(2))
                          : ('Clear ' + sec.unlockAt + ' expedition' + (sec.unlockAt > 1 ? 's' : '') + ' to unlock')
                      )
                    )
                  ),
                  h('div', { className: 'text-[0.6875rem] mb-3 ' + (selected ? 'opacity-95' : 'text-slate-600') + ' italic leading-snug' }, __alloT('stem.allobotsage.' + (sec.id) + '_subtitle', sec.subtitle)),
                  unlocked && sectorBosses.length > 0 && h('div', { className: 'mb-2' },
                    h('div', { className: 'text-[0.5625rem] font-bold uppercase tracking-wider mb-1 ' + (selected ? 'opacity-80' : 'text-slate-400') }, t('stem.allobotsage.bosses', 'Bosses')),
                    h('div', { className: 'flex flex-wrap gap-1' },
                      sectorBosses.map(function(b) {
                        return h('div', {
                          key: b.id,
                          className: 'flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.625rem] font-semibold',
                          style: selected ? { background: 'rgba(255,255,255,0.18)' } : { background: '#fef3c7', color: '#92400e' },
                          title: b.name + ' \u2014 ' + b.flavor
                        },
                          h('span', { 'aria-hidden': 'true' }, b.icon),
                          h('span', null, b.name.replace(/^The /, ''))
                        );
                      })
                    )
                  ),
                  unlocked && sectorNormals.length > 0 && h('div', null,
                    h('div', { className: 'text-[0.5625rem] font-bold uppercase tracking-wider mb-1 ' + (selected ? 'opacity-80' : 'text-slate-400') }, 'Foes (' + sectorNormals.length + ')'),
                    h('div', { className: 'flex flex-wrap gap-0.5', 'aria-hidden': 'true' },
                      sectorNormals.map(function(en) {
                        return h('span', {
                          key: en.id,
                          className: 'text-base',
                          title: t('stem.allobotsage.title_enemy_stats', '{name} \u2014 {flavor} (HP {hp}, ATK {atk})')
                            .replace('{name}', en.name)
                            .replace('{flavor}', en.flavor)
                            .replace('{hp}', String(en.hp))
                            .replace('{atk}', String(en.atk))
                        }, en.icon);
                      })
                    )
                  ),
                  unlocked && sectorBosses.length > 0 && selected && h('div', { className: 'mt-2 text-[0.625rem] opacity-90' },
                    h('div', { className: 'flex items-center gap-1 font-bold' }, t('stem.allobotsage.selected', '\u2728 Selected'))
                  )
                );
              })
            )
          ),

          // Spells
          h('h3', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2' }, '\uD83D\uDCDC Equip spells (' + equippedLoadout.length + '/3)'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mb-5' },
            available.map(function(s) {
              return spellCard(s, {
                unlocked: true,
                equipped: !!loadoutSet[s.id],
                usageCount: castCountsMap[s.id] || 0,
                onClick: function() { toggleSpell(s.id); }
              });
            })
          ),
          // \u2500\u2500 Goal-setting \u2500\u2500
          h('section', { 'aria-label': t('stem.allobotsage.set_goals_for_this_expedition', 'Set goals for this expedition'), className: 'mb-4 p-3 rounded-xl border-2 border-violet-200 bg-violet-50/40' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-violet-900 uppercase tracking-wider' }, t('stem.allobotsage.set_your_goals_optional', '\ud83c\udfaf Set your goals (optional)')),
                h('div', { className: 'text-[0.625rem] text-violet-700 mt-0.5' }, t('stem.allobotsage.research_specific_goals_improve_perfor', 'Research: specific goals improve performance + focus. Pick any.'))
              ),
              h('button', {
                type: 'button',
                onClick: function() { sfxClick(); updKey('selectedGoals', []); },
                className: 'transition-colors text-[0.625rem] text-violet-600 hover:text-violet-900 font-semibold underline focus:ring-2 focus:ring-violet-400 focus:outline-none rounded'
              }, t('stem.allobotsage.skip_clear_all', 'Skip / clear all'))
            ),
            (function() {
              var selectedGoals = Array.isArray(d.selectedGoals) ? d.selectedGoals : [];
              var GOALS = [
                { id: 'crit_5',      icon: '\u2728', label: t('stem.allobotsage.land_5_critical_casts', 'Land 5 critical casts'),          desc: t('stem.allobotsage.rewards_fast_correct_retrieval', 'Rewards fast + correct retrieval') },
                { id: 'spell_variety', icon: '\ud83c\udf08', label: t('stem.allobotsage.use_all_3_equipped_spells', 'Use all 3 equipped spells'),     desc: t('stem.allobotsage.rewards_versatility_not_one_trick', 'Rewards versatility, not one-trick') },
                { id: 'no_death',    icon: '\ud83d\udee1\ufe0f', label: t('stem.allobotsage.finish_run_without_dying', 'Finish run without dying'),     desc: t('stem.allobotsage.rewards_strategy_healing_choices', 'Rewards strategy + healing choices') },
                { id: 'interrupt',   icon: '\u26a1', label: t('stem.allobotsage.interrupt_a_boss_special', 'Interrupt a boss SPECIAL'),       desc: t('stem.allobotsage.crit_during_the_winding_phase', 'Crit during the WINDING phase') }
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
                    type: 'button',
                    key: 'goal-' + g.id,
                    onClick: function() { toggleGoal(g.id); },
                    className: 'text-left p-2 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (picked ? 'border-violet-500 bg-violet-100' : 'border-slate-200 bg-white hover:border-violet-300'),
                    'aria-pressed': picked,
                    'aria-label': picked
                      ? t('stem.allobotsage.aria_goal_selected', '{label} (selected)').replace('{label}', g.label)
                      : g.label
                  },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-lg' }, g.icon),
                      h('div', { className: 'flex-1' },
                        h('div', { className: 'text-[0.6875rem] font-bold ' + (picked ? 'text-violet-900' : 'text-slate-700') }, g.label),
                        h('div', { className: 'text-[0.625rem] ' + (picked ? 'text-violet-700' : 'text-slate-600') }, g.desc)
                      ),
                      picked && h('span', { className: 'text-violet-700 font-bold' }, '\u2713')
                    )
                  );
                })
              );
            })()
          ),
          h('button', {
            type: 'button',
            disabled: equippedLoadout.length === 0,
            onClick: function() {
              if (equippedLoadout.length === 0) return;
              sfxClick();
              var sector = sectorById(safeSelectedSector);
              var diffProfile = difficultyById(safeDifficulty);
              var roomsPlan = buildRoomsPlan(sector.id, diffProfile.rooms);
              var firstRoom = roomsPlan[0];
              var combinedEssenceMult = sector.essenceMult * diffProfile.essenceMult;
              var exp = {
                id: 'exp-' + Date.now() + '-' + sector.id + '-' + expeditionsDone,
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
                castLog: [],
                pendingCast: null,
                lastBackfireFeedback: null,
                goals: (Array.isArray(d.selectedGoals) ? d.selectedGoals : []).slice(),
                goalsStartCrits: critCasts,
                goalsStartInterrupts: safeNum(d.interruptCount, 0),
                goalsSpellsUsed: {}
              };
              updSage({ phase: 'expedition', expedition: exp });
              announceSR('Expedition begins in the ' + sector.name + ' on ' + diffProfile.name + ' difficulty. ' + firstRoom.name + ' appears in room 1 of ' + diffProfile.rooms + '.');
            },
            className: 'transition-colors w-full py-3 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed focus:ring-2 focus:ring-violet-300 focus:outline-none'
          }, equippedLoadout.length === 0 ? 'Equip at least 1 spell' : '\u2728 Launch Expedition (' + difficultyById(safeDifficulty).rooms + ' rooms)')
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: EXPEDITION (single encounter MVP)
      // ─────────────────────────────────────────────────
      if (phase === 'expedition' && expedition) {
        var exp = expedition;
        var enemy = safeObj(exp.enemy);
        var rawPending = exp.pendingCast;
        var pendingCast = (rawPending && typeof rawPending === 'object' && !Array.isArray(rawPending)
          && rawPending.challenge && typeof rawPending.challenge === 'object'
          && Array.isArray(rawPending.challenge.options)) ? rawPending : null;
        var spellLevels = spellLevelsMap;
        var roomsPlan = Array.isArray(exp.roomsPlan) ? exp.roomsPlan : [];
        var roomIndex = safeNum(exp.roomIndex, 0);
        var totalRooms = roomsPlan.length || ROOMS_PER_EXPEDITION;
        var isBossRoom = !!(enemy && enemy.boss);
        var curPlayerHp = safeNum(exp.playerHp, 60);
        var curPlayerMaxHp = Math.max(1, safeNum(exp.playerMaxHp, 60));
        var curEnemyHp = safeNum(enemy.hp, 0);
        var curEnemyMaxHp = Math.max(1, safeNum(enemy.maxHp, 1));
        var curEnemyAtk = safeNum(enemy.atk, 10);

        function mutateExp(patch) {
          updateSageAtomic(function(cur) {
            var curExp = (cur.expedition && typeof cur.expedition === 'object' && !Array.isArray(cur.expedition)) ? cur.expedition : exp;
            return { expedition: Object.assign({}, curExp, patch) };
          });
        }

        var sectorMult = safeNum(exp.essenceMult, 1.0);
        function scaledReward(baseReward) { return Math.max(1, Math.round(baseReward * sectorMult)); }

        function finishExpedition(victory, extraEssence, extraRoomsCleared) {
          var addEss = safeNum(extraEssence, 0);
          var addRooms = safeNum(extraRoomsCleared, 0);
          var finalRoomsCleared = safeNum(exp.roomsCleared, 0) + addRooms;
          var baseEarned = safeNum(exp.essenceEarned, 0) + addEss;
          var bonus = victory ? scaledReward(5) : 0;
          var sectorsClearedNow = Object.assign({}, sectorsClearedMapAll);
          var bossesDefeatedNow = Object.assign({}, bossesDefeatedMapAll);
          var firstClearBonus = 0;
          var firstClearSector = null;
          if (victory) {
            if (exp.sectorId && !sectorsClearedNow[exp.sectorId]) {
              sectorsClearedNow[exp.sectorId] = true;
              firstClearBonus = scaledReward(20);
              firstClearSector = exp.sectorName || exp.sectorId;
            }
            var lastRoom = roomsPlan[roomsPlan.length - 1];
            if (lastRoom && lastRoom.boss && lastRoom.id) {
              bossesDefeatedNow[lastRoom.id] = true;
            }
          }
          var reward = baseEarned + bonus + firstClearBonus;
          var expDedupKey = (typeof exp.id === 'string' && exp.id)
            ? exp.id
            : ((exp.sectorId || 'sector') + ':' + finalRoomsCleared + ':' + (Array.isArray(exp.castLog) ? exp.castLog.length : 0) + ':' + (enemy.id || 'boss'));
          var prevCreditedIds = safeObj(d._creditedExpIds);
          var shouldAwardXp = !!(victory && !prevCreditedIds[expDedupKey]);
          var xpPoints = 15 + finalRoomsCleared * 3;

          // Single pure batched state transition: merges final room clear, debrief, essence, sector/boss progress, and XP dedup ledger.
          updateSageAtomic(function(cur) {
            var curExp = (cur.expedition && typeof cur.expedition === 'object' && !Array.isArray(cur.expedition)) ? cur.expedition : exp;
            var curCredited = Object.assign({}, safeObj(cur._creditedExpIds));
            if (cur.phase === 'debrief' && curExp && curExp.id && exp.id && curExp.id === exp.id) {
              return null;
            }
            var curEssence = safeNum(cur.essence, essence);
            var curExpDone = safeNum(cur.expeditionsCompleted, expeditionsDone);
            var curSectors = Object.assign({}, safeObj(cur.sectorsCleared), victory ? sectorsClearedNow : {});
            var curBosses = Object.assign({}, safeObj(cur.bossesDefeated), victory ? bossesDefeatedNow : {});
            var mergedRooms = Math.max(safeNum(curExp.roomsCleared, 0), finalRoomsCleared);
            var mergedEarned = Math.max(safeNum(curExp.essenceEarned, 0), baseEarned);
            var patch = {
              phase: 'debrief',
              essence: curEssence + reward,
              expedition: Object.assign({}, curExp, {
                pendingCast: null,
                roomsCleared: mergedRooms,
                essenceEarned: mergedEarned,
                result: victory ? 'victory' : 'defeat',
                reward: reward,
                firstClearBonus: firstClearBonus,
                firstClearSector: firstClearSector
              })
            };
            if (victory) {
              patch.sectorsCleared = curSectors;
              patch.bossesDefeated = curBosses;
              patch.expeditionsCompleted = curExpDone + 1;
              if (!curCredited[expDedupKey]) {
                curCredited[expDedupKey] = true;
                var cKeys = Object.keys(curCredited);
                if (cKeys.length > 80) {
                  var trimmed = {};
                  cKeys.slice(-80).forEach(function(ck) { trimmed[ck] = true; });
                  curCredited = trimmed;
                }
                patch._creditedExpIds = curCredited;
              }
            }
            return patch;
          });

          announceSR(victory ? 'Expedition complete! +' + reward + ' essence earned.' : 'Expedition ended after ' + finalRoomsCleared + ' rooms. +' + reward + ' essence earned.');
          if (victory) {
            sfxVictory();
            if (shouldAwardXp) {
              try { awardXP('alloBotSage', xpPoints, 'Expedition victory'); } catch(e) {}
            }
            if (firstClearBonus > 0) {
              addToast(
                t('stem.allobotsage.toast_first_clear_sector', '\uD83C\uDFC6 First clear of {sector}! +{bonus} bonus essence')
                  .replace('{sector}', String(firstClearSector || ''))
                  .replace('{bonus}', String(firstClearBonus)),
                'success'
              );
            }
          }
        }

        function advanceRoom(clearReward) {
          var clearedIdx = roomIndex;
          var reward = clearReward || 0;
          var nextIdx = clearedIdx + 1;
          if (nextIdx >= totalRooms) {
            return null;
          }
          var nextRoom = Object.assign({}, roomsPlan[nextIdx]);
          var healAmount = Math.round(curPlayerMaxHp * 0.2);
          var newPlayerHp = Math.min(curPlayerMaxHp, curPlayerHp + healAmount);
          var roomLabel = (nextIdx + 1) + ' of ' + totalRooms + (nextRoom.boss ? ' (BOSS)' : nextRoom.type === 'shrine' ? ' (Shrine)' : '');
          var nextLog = (Array.isArray(exp.log) ? exp.log : []).concat([
            { text: '\u2728 Room ' + (clearedIdx + 1) + ' cleared! +' + reward + ' essence. (+' + healAmount + ' HP restored)', kind: 'player' },
            { text: 'Room ' + roomLabel + ': ' + nextRoom.name + ' appears. ' + nextRoom.flavor, kind: 'info' }
          ]);
          if (nextLog.length > 18) nextLog = nextLog.slice(-18);
          mutateExp({
            roomIndex: nextIdx,
            roomsCleared: safeNum(exp.roomsCleared, 0) + 1,
            essenceEarned: safeNum(exp.essenceEarned, 0) + reward,
            enemy: nextRoom,
            playerHp: newPlayerHp,
            turn: 'player',
            pendingCast: null,
            log: nextLog
          });
          announceSR('Room cleared. Room ' + roomLabel + ' begins. ' + nextRoom.name + '.');
          return nextIdx;
        }

        function restAtShrine() {
          if (!enemy || enemy.type !== 'shrine') return;
          sfxUnlock();
          var healAmount = Math.round(curPlayerMaxHp * 0.35);
          var newPlayerHp = Math.min(curPlayerMaxHp, curPlayerHp + healAmount);
          var shrineEssence = scaledReward(3);
          var entry = { text: '\u26E9\uFE0F Rested at the shrine (+' + healAmount + ' HP, +' + shrineEssence + ' essence).', kind: 'player' };
          mutateExp({ playerHp: newPlayerHp, log: (Array.isArray(exp.log) ? exp.log : []).concat([entry]) });
          announceSR(__alloT('stem.allobotsage.sr_rested_at_shrine_advancing', 'Rested at shrine. Advancing.'));
          scheduleCombat(function() {
            if (roomIndex < totalRooms - 1) {
              advanceRoom(shrineEssence);
            } else {
              finishExpedition(true, shrineEssence, 1);
            }
          }, 600);
        }

        function enemyTurn() {
          var isBoss = !!enemy.boss;
          var bossPhase = enemy.bossPhase || 'normal';
          var normalCount = enemy.normalCount || 0;
          var entry;
          var newHp = curPlayerHp;
          var newEnemy;
          var specName = (enemy.specialName || 'SPECIAL ATTACK');
          var specFlavor = (enemy.specialFlavor || '');

          if (isBoss && bossPhase === 'winding') {
            var multiplier = enemy.interrupted ? 0.5 : 1.6;
            var rawDmg = curEnemyAtk * multiplier;
            var specDmg = Math.max(1, Math.round(rawDmg - Math.floor(Math.random() * 3)));
            newHp = Math.max(0, curPlayerHp - specDmg);
            entry = enemy.interrupted
              ? { text: '🛡️ ' + enemy.name + '’s ' + specName + ' is staggered — only ' + specDmg + ' dmg lands.', kind: 'enemy' }
              : { text: '💥 ' + enemy.name + ' unleashes ' + specName + ' — ' + specDmg + ' dmg!' + (specFlavor ? ' (' + specFlavor + ')' : ''), kind: 'boss-special' };
            newEnemy = Object.assign({}, enemy, { bossPhase: 'normal', normalCount: 0, interrupted: false });
          } else if (isBoss && normalCount >= 2) {
            entry = { text: '⚠️ ' + enemy.name + ' begins to gather ' + specName + (specFlavor ? ' — ' + specFlavor : '') + '. CRIT next cast to interrupt!', kind: 'boss-telegraph' };
            newEnemy = Object.assign({}, enemy, { bossPhase: 'winding', interrupted: false });
          } else {
            var dmg = Math.max(1, curEnemyAtk - Math.floor(Math.random() * 4));
            newHp = Math.max(0, curPlayerHp - dmg);
            entry = { text: enemy.name + ' strikes for ' + dmg + ' damage.', kind: 'enemy' };
            newEnemy = isBoss
              ? Object.assign({}, enemy, { normalCount: normalCount + 1 })
              : enemy;
          }

          var nextLog = (Array.isArray(exp.log) ? exp.log : []).concat([entry]);
          if (nextLog.length > 18) nextLog = nextLog.slice(-18);
          if (newHp <= 0) {
            mutateExp({ playerHp: 0, log: nextLog, enemy: newEnemy });
            scheduleCombat(function() { finishExpedition(false); }, 600);
            return;
          }
          mutateExp({ playerHp: newHp, turn: 'player', log: nextLog, enemy: newEnemy });
          announceSR(entry.text + ' Your turn.');
        }

        function startCast(spellId) {
          var s = findSpell(spellId);
          if (!s) return;
          if (exp.turn !== 'player') return;
          var bank = getMergedBank(s, aiChallengeCache, offlineChallengeCache);
          var challenge = pickWeighted(bank, questionStatsMap);
          if (!challenge) return;
          sfxCastReady();
          mutateExp({
            pendingCast: {
              spellId: spellId,
              challenge: challenge,
              startedAt: Date.now(),
              selectedIndex: null,
              resolved: false,
              aiSourced: !!challenge.aiGenerated,
              offlineSourced: !!challenge.offlineGenerated
            }
          });
          announceSR('Casting ' + s.name + '. ' + challenge.prompt);
          var existingAi = Array.isArray(aiChallengeCache[spellId]) ? aiChallengeCache[spellId] : [];
          if (existingAi.length === 0 && aiOn) {
            if (!aiInFlightMap[spellId]) {
              var inFlight = Object.assign({}, aiInFlightMap);
              inFlight[spellId] = true;
              updKey('_aiInFlight', inFlight);
              aiGenerateChallenges(s, callGemini, toolData).then(function(qs) {
                updateSageAtomic(function(cur) {
                  var freshCache = Object.assign({}, safeObj(cur.aiChallengeCache));
                  var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                  delete freshFlight[spellId];
                  if (qs.length > 0) {
                    freshCache[spellId] = qs;
                    return { aiChallengeCache: freshCache, _aiInFlight: freshFlight };
                  }
                  return { _aiInFlight: freshFlight };
                });
              }).catch(function(err) {
                console.warn('[AlloBotSage] Background AI generation failed for ' + spellId + ':', err);
                updateSageAtomic(function(cur) {
                  var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                  delete freshFlight[spellId];
                  return { _aiInFlight: freshFlight };
                });
              });
            }
          }
        }

        function resolveChallenge(selectedIndex) {
          if (!pendingCast || pendingCast.resolved) return;
          var s = findSpell(pendingCast.spellId);
          var challenge = pendingCast.challenge;
          if (!s || !challenge) return;
          var lvl = safeNum(spellLevels[s.id], 0);
          var leveledBase = getSpellDamage(s, lvl);
          var elapsed = (Date.now() - safeNum(pendingCast.startedAt, Date.now())) / 1000;
          var correct = selectedIndex === challenge.correctIndex;
          var critWindow = safeNum(exp.critWindowSec, 6);
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
          var diag = !correct ? ALLOBOTSAGE_ENGINE.diagnoseSageDistractor(s, challenge, selectedIndex) : null;
          var newEnemyHp = Math.max(0, curEnemyHp - dmg);
          var lvlTag = lvl > 0 ? ' [Lv' + lvl + ']' : '';
          var text;
          if (result === 'crit') text = '\u2B50 CRITICAL ' + s.name + lvlTag + ' \u2014 ' + dmg + ' dmg! (' + elapsed.toFixed(1) + 's)';
          else if (result === 'hit') text = s.name + lvlTag + ' strikes for ' + dmg + ' dmg.';
          else text = '\u26A1 ' + s.name + lvlTag + ' backfires. Enemy grazed for ' + dmg + '. ' + (diag && diag.whyNot ? diag.whyNot + ' ' : '') + '(' + challenge.explain + ')';
          var willInterrupt = !!enemy.boss && enemy.bossPhase === 'winding' && result === 'crit';
          var nowStamp = Date.now();
          var backfireSnap = diag ? {
            spellName: s.name,
            prompt: challenge.prompt,
            chosenOption: diag.chosenOption,
            correctOption: diag.correctOption,
            whyNot: diag.whyNot,
            explain: challenge.explain
          } : exp.lastBackfireFeedback || null;

          // Single pure batched updater consolidating totalCasts, critCasts, castCounts, questionStats, interruptCount, and expedition!
          updateSageAtomic(function(cur) {
            var curExp = (cur.expedition && typeof cur.expedition === 'object' && !Array.isArray(cur.expedition)) ? cur.expedition : exp;
            var curCounts = Object.assign({}, safeObj(cur.castCounts));
            curCounts[s.id] = safeNum(curCounts[s.id], 0) + 1;
            var curStats = Object.assign({}, safeObj(cur.questionStats));
            var prevStat = safeObj(curStats[challenge.prompt]);
            curStats[challenge.prompt] = {
              lastResult: result,
              lastSeen: nowStamp,
              attempts: safeNum(prevStat.attempts, 0) + 1,
              correctCount: safeNum(prevStat.correctCount, 0) + (correct ? 1 : 0),
              lastConfidence: pendingCast.confidence || null
            };
            var curLog = (Array.isArray(curExp.log) ? curExp.log : []).concat([{ text: text, kind: result === 'backfire' ? 'backfire' : 'player' }]);
            var nextEnemy = Object.assign({}, safeObj(curExp.enemy), { hp: newEnemyHp });
            if (willInterrupt) {
              nextEnemy.interrupted = true;
              curLog = curLog.concat([{ text: '🛡️ ' + enemy.name + '’s special is interrupted by your critical strike!', kind: 'player' }]);
            }
            if (curLog.length > 18) curLog = curLog.slice(-18);
            var nextCastLog = (Array.isArray(curExp.castLog) ? curExp.castLog : []).concat([{
              spellId: s.id,
              result: result,
              confidence: pendingCast.confidence || null,
              prompt: challenge.prompt,
              wasBoss: !!enemy.boss
            }]);
            if (nextCastLog.length > 60) nextCastLog = nextCastLog.slice(-60);
            var nextGoalsSpells = Object.assign({}, safeObj(curExp.goalsSpellsUsed));
            nextGoalsSpells[s.id] = true;

            var patch = {
              totalCasts: safeNum(cur.totalCasts, totalCasts) + 1,
              castCounts: curCounts,
              questionStats: curStats,
              expedition: Object.assign({}, curExp, {
                enemy: nextEnemy,
                pendingCast: Object.assign({}, pendingCast, {
                  selectedIndex: selectedIndex,
                  resolved: true,
                  damage: dmg,
                  result: result,
                  whyNot: diag ? diag.whyNot : null,
                  chosenOption: diag ? diag.chosenOption : null,
                  correctOption: diag ? diag.correctOption : null
                }),
                log: curLog,
                castLog: nextCastLog,
                goalsSpellsUsed: nextGoalsSpells,
                lastBackfireFeedback: backfireSnap
              })
            };
            if (result === 'crit') patch.critCasts = safeNum(cur.critCasts, critCasts) + 1;
            if (willInterrupt) patch.interruptCount = safeNum(cur.interruptCount, 0) + 1;
            return patch;
          });

          announceSR(text + (willInterrupt ? ' Boss special interrupted!' : ''));

          scheduleCombat(function() {
            if (newEnemyHp <= 0) {
              var clearReward = scaledReward(PER_ROOM_ESSENCE[roomIndex] || 10);
              if (roomIndex < totalRooms - 1) {
                advanceRoom(clearReward);
              } else {
                finishExpedition(true, clearReward, 1);
              }
              return;
            }
            mutateExp({ pendingCast: null, turn: 'enemy' });
            scheduleCombat(function() { enemyTurn(); }, 550);
          }, result === 'backfire' ? 2200 : 1400);
        }

        // ── Render encounter ──
        var enemyPct = Math.max(0, Math.min(100, Math.round((curEnemyHp / curEnemyMaxHp) * 100)));
        var playerPct = Math.max(0, Math.min(100, Math.round((curPlayerHp / curPlayerMaxHp) * 100)));
        var expLastBackfire = (exp.lastBackfireFeedback && typeof exp.lastBackfireFeedback === 'object') ? exp.lastBackfireFeedback : null;

        return h('div', { className: 'abs-workbench max-w-3xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          // Top bar
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', {
              type: 'button',
              onClick: async function() {
                var confirmModule = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ConfirmDialog && window.AlloModules.ConfirmDialog.ConfirmDialog;
                var confirmApi = typeof window !== 'undefined' && window.AlloFlowUX && window.AlloFlowUX.confirm;
                var unavailable = t('stem.allobotsage.toast_exit_unavailable', 'Expedition exit is unavailable right now, so your progress was kept.');
                if (typeof confirmModule !== 'function' || typeof confirmApi !== 'function') {
                  addToast(unavailable, 'warning');
                  announceSR(unavailable);
                  return;
                }
                var confirmed = false;
                try {
                  confirmed = await confirmApi(
                    t('stem.allobotsage.confirm_abandon_msg', 'Abandon this Expedition? Progress in this run will be lost.'),
                    {
                      title: t('stem.allobotsage.title_abandon_expedition', 'Abandon expedition'),
                      confirmText: t('stem.allobotsage.confirm_abandon_btn', 'Abandon expedition'),
                      cancelText: t('stem.allobotsage.cancel_keep_expedition', 'Keep expedition'),
                      tone: 'warning'
                    }
                  );
                } catch (e) {
                  addToast(unavailable, 'warning');
                  announceSR(unavailable);
                  return;
                }
                if (confirmed) {
                  clearCombatTimers();
                  sfxClick();
                  updSage({ phase: 'hub', expedition: null });
                  announceSR(__alloT('stem.allobotsage.sr_expedition_abandoned_returned_to_the_hub', 'Expedition abandoned. Returned to the hub.'));
                } else announceSR(__alloT('stem.allobotsage.sr_expedition_continued', 'Expedition continued.'));
              },
              className: 'transition-colors text-xs font-semibold text-slate-600 hover:text-slate-800 underline' + onHostInk
            }, t('stem.allobotsage.abandon', 'Abandon')),
            h('div', { className: 'flex-1 text-center' },
              h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-widest text-violet-600' },
                (exp.sectorName || 'Expedition')
                + (enemy && enemy.type === 'shrine' ? ' \u00b7 Shrine'
                    : isBossRoom ? ' \u00b7 Boss'
                    : '')
              ),
              h('div', {
                className: 'flex items-center justify-center gap-1 mt-0.5',
                'aria-label': t('stem.allobotsage.aria_room_progress', 'Room {current} of {total}')
                  .replace('{current}', String(roomIndex + 1))
                  .replace('{total}', String(totalRooms))
              },
                roomsPlan.map(function(_r, i) {
                  var cleared = i < safeNum(exp.roomsCleared, 0);
                  var current = i === roomIndex;
                  return h('span', {
                    key: 'room-' + i,
                    className: 'inline-block w-2.5 h-2.5 rounded-full ' + (cleared ? 'bg-emerald-500' : current ? ('bg-violet-500' + (reduceMotion ? '' : ' abs-pulse')) : 'bg-slate-300'),
                    'aria-hidden': 'true'
                  });
                }),
                h('span', { className: 'ml-2 text-[0.625rem] text-slate-600' + onHostInk }, 'Room ' + (roomIndex + 1) + '/' + totalRooms)
              )
            ),
            h('div', { className: 'text-xs text-slate-600' + onHostInk }, 'Turn: ', h('span', { className: 'font-bold ' + (exp.turn === 'player' ? 'text-violet-600' : 'text-red-600') }, exp.turn === 'player' ? 'You' : enemy.name))
          ),

          // Battlefield
          enemy.type !== 'shrine' && h('div', {
            className: 'rounded-2xl p-5 mb-3',
            style: { background: isContrast ? '#000000' : (sectorById(exp.sectorId).bgGradient || 'linear-gradient(135deg, #1e1b4b 0%, #3b0764 100%)'), border: isContrast ? '2px solid #ffffff' : 'none', color: 'white', position: 'relative', overflow: 'hidden', minHeight: '200px' }
          },
            !reduceMotion && !isContrast && h('div', {
              'aria-hidden': 'true',
              style: { position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }
            },
              (function() {
                var sectorId = exp.sectorId;
                var particles = [];
                var i;
                if (sectorId === 'crystal_nebula') {
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
              h('div', { className: 'text-center flex-1' },
                allobotAvatar(curPlayerHp < curPlayerMaxHp * 0.3 ? 'hurt' : 'happy'),
                h('div', { className: 'text-xs font-bold mt-1' }, 'AlloBot'),
                h('div', { className: 'w-full h-2 bg-white/20 rounded-full mt-1 overflow-hidden' },
                  h('div', {
                    className: 'h-full transition-all',
                    style: { width: playerPct + '%', background: playerPct > 50 ? '#34d399' : playerPct > 25 ? '#fbbf24' : '#ef4444' }
                  })
                ),
                h('div', { className: 'text-[0.625rem] mt-0.5 text-violet-200' }, curPlayerHp + ' / ' + curPlayerMaxHp + ' HP')
              ),
              h('div', { className: 'text-3xl text-violet-300' + (reduceMotion ? '' : ' abs-pulse'), 'aria-hidden': 'true' }, 'VS'),
              h('div', { className: 'text-center flex-1' },
                h('div', { className: 'text-6xl' + (reduceMotion ? '' : ' abs-float'), style: { filter: curEnemyHp < curEnemyMaxHp * 0.3 ? 'hue-rotate(-30deg)' : '' } }, enemy.icon),
                h('div', { className: 'text-xs font-bold mt-1' }, enemy.name),
                h('div', { className: 'w-full h-2 bg-white/20 rounded-full mt-1 overflow-hidden' },
                  h('div', {
                    className: 'h-full transition-all',
                    style: { width: enemyPct + '%', background: '#ef4444' }
                  })
                ),
                h('div', { className: 'text-[0.625rem] mt-0.5 text-violet-200' }, curEnemyHp + ' / ' + curEnemyMaxHp + ' HP')
              )
            ),
            h('p', { className: 'text-[0.6875rem] text-center text-violet-200 mt-3 italic' }, enemy.flavor)
          ),

          // Boss telegraph warning
          enemy.type !== 'shrine' && enemy.boss && enemy.bossPhase === 'winding' && !enemy.interrupted && h('div', {
            role: 'alert',
            className: 'rounded-xl p-3 mb-3' + (reduceMotion ? '' : ' abs-pulse'),
            style: { background: 'linear-gradient(90deg, #7f1d1d 0%, #ef4444 100%)', color: 'white' }
          },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-3xl' }, '\u26a0\ufe0f'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm' },
                  enemy.name + ' is winding up: ',
                  h('span', { className: 'italic' }, enemy.specialName || 'SPECIAL ATTACK')
                ),
                enemy.specialFlavor && h('div', { className: 'text-[0.6875rem] text-red-200 mt-0.5 italic' }, '\u201c' + enemy.specialFlavor + '\u201d'),
                h('div', { className: 'text-[0.6875rem] text-red-100 mt-0.5' }, t('stem.allobotsage.land_a_critical_cast_correct_under_6_s', 'Land a CRITICAL cast (correct + under 6 seconds) to interrupt and reduce the damage.'))
              )
            )
          ),
          // Boss interrupt confirmation
          enemy.type !== 'shrine' && enemy.boss && enemy.bossPhase === 'winding' && enemy.interrupted && h('div', {
            role: 'status',
            className: 'rounded-xl p-3 mb-3',
            style: { background: 'linear-gradient(90deg, #064e3b 0%, #10b981 100%)', color: 'white' }
          },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-3xl' }, '\ud83d\udee1\ufe0f'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm' }, t('stem.allobotsage.interrupt_landed', 'INTERRUPT LANDED')),
                h('div', { className: 'text-[0.6875rem] text-emerald-100 mt-0.5' }, enemy.name + '\u2019s special will deal reduced damage when it resolves.')
              )
            )
          ),

          // Shrine room
          enemy.type === 'shrine' && h('div', { className: 'rounded-2xl p-6 mb-3 text-center', style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #064e3b 0%, #14b8a6 100%)', border: isContrast ? '2px solid #ffffff' : 'none', color: 'white' } },
            h('div', { className: 'flex items-center justify-center gap-6 mb-3' },
              allobotAvatar(curPlayerHp < curPlayerMaxHp * 0.5 ? 'idle' : 'happy'),
              h('div', { className: 'text-7xl' + (reduceMotion ? '' : ' abs-float'), 'aria-hidden': 'true' }, enemy.icon)
            ),
            h('h3', { className: 'text-lg font-bold' }, enemy.name),
            h('p', { className: 'text-sm text-emerald-100 italic mt-1 mb-4' }, enemy.flavor),
            h('div', { className: 'flex flex-wrap gap-2 justify-center mb-4' },
              h('div', { className: 'px-3 py-1.5 rounded-lg bg-white/15 text-xs' }, '+' + Math.round(curPlayerMaxHp * 0.35) + ' HP'),
              h('div', { className: 'px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-100 text-xs font-bold' }, '+' + scaledReward(3) + ' \u2B50 Essence')
            ),
            h('button', {
              type: 'button',
              onClick: function() { restAtShrine(); },
              className: 'transition-colors px-6 py-2.5 rounded-xl font-bold text-emerald-800 bg-white hover:bg-emerald-50 focus:ring-2 focus:ring-white focus:outline-none shadow-lg'
            }, t('stem.allobotsage.rest_at_the_shrine', '\u26E9\uFE0F Rest at the shrine'))
          ),

          // Spell bar
          enemy.type !== 'shrine' && exp.turn === 'player' && !pendingCast && h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2 mb-3' },
            equippedLoadout.map(function(id) {
              var s = findSpell(id);
              if (!s) return null;
              var lvl = safeNum(spellLevels[s.id], 0);
              var leveledDmg = getSpellDamage(s, lvl);
              return h('button', {
                type: 'button',
                key: id,
                onClick: function() { startCast(id); },
                className: 'p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-violet-500 hover:bg-violet-50 focus:ring-2 focus:ring-violet-400 focus:outline-none transition text-left',
                style: { borderLeft: '4px solid ' + s.color },
                'aria-label': t('stem.allobotsage.aria_cast_spell', 'Cast {name} (Level {level}) \u2014 {damage} base damage')
                  .replace('{name}', s.name)
                  .replace('{level}', String(lvl))
                  .replace('{damage}', String(leveledDmg))
              },
                h('div', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-xl' }, s.icon),
                  h('div', { className: 'flex-1 min-w-0' },
                    h('div', { className: 'font-bold text-sm flex items-center gap-1', style: { color: s.color } },
                      s.name,
                      lvl > 0 && h('span', { className: 'text-[0.5625rem] px-1 py-0.5 rounded bg-amber-100 text-amber-900 font-bold' }, 'Lv' + lvl)
                    ),
                    h('div', { className: 'text-[0.625rem] text-slate-600' }, leveledDmg + ' dmg \u00b7 ' + s.sourceLabel)
                  )
                )
              );
            })
          ),

          // Cast challenge overlay
          pendingCast && (function() {
            var s = findSpell(pendingCast.spellId);
            if (!s) return null;
            var c = pendingCast.challenge;
            var resolved = !!pendingCast.resolved;
            var confidence = pendingCast.confidence || null;
            var calSummary = ALLOBOTSAGE_ENGINE.summarizeConfidenceCalibration(questionStatsMap);
            var castDiag = (resolved && pendingCast.result === 'backfire')
              ? ALLOBOTSAGE_ENGINE.diagnoseSageDistractor(s, c, pendingCast.selectedIndex)
              : null;
            var promptSpeech = s.name + '. ' + c.prompt + ' ' + c.options.map(function(o, oi) { return String.fromCharCode(65 + oi) + ': ' + o; }).join('. ');
            var explainSpeech = castDiag
              ? ('Backfire. ' + castDiag.whyNot + ' ' + c.explain)
              : ((pendingCast.result === 'crit' ? 'Critical hit! ' : 'Hit. ') + c.explain);
            function calibrationNote(conf, res) {
              if (!conf) return null;
              var wasCorrect = res === 'hit' || res === 'crit';
              if (conf === 'high' && wasCorrect)  return { tone: 'good',    text: t('stem.allobotsage.calibrated_you_said_you_knew_it_and_yo', '🎯 Calibrated: you said you knew it — and you did.') };
              if (conf === 'high' && !wasCorrect) return { tone: 'caution', text: t('stem.allobotsage.overconfident_felt_sure_but_missed_wor', '⚠ Overconfident: felt sure but missed. Worth a second look in Study Hall.') };
              if (conf === 'low'  && wasCorrect)  return { tone: 'good',    text: t('stem.allobotsage.lucky_guess_but_maybe_you_knew_more_th', '🎁 Lucky guess — but maybe you knew more than you thought!') };
              if (conf === 'low'  && !wasCorrect) return { tone: 'neutral', text: t('stem.allobotsage.self_aware_you_flagged_the_doubt_and_t', '🎯 Self-aware: you flagged the doubt, and the doubt was right. Add to Review.') };
              if (conf === 'med'  && wasCorrect)  return { tone: 'good',    text: t('stem.allobotsage.pretty_sure_paid_off', '✓ Pretty sure paid off.') };
              if (conf === 'med'  && !wasCorrect) return { tone: 'neutral', text: t('stem.allobotsage.worth_reviewing_this_one', 'Worth reviewing this one.') };
              return null;
            }
            var calNote = resolved ? calibrationNote(confidence, pendingCast.result) : null;
            return h('div', {
              className: 'rounded-2xl p-4 mb-3 border-2' + (reduceMotion ? '' : ' abs-fade'),
              style: {
                borderColor: isContrast ? '#facc15' : s.color,
                background: isContrast ? '#000000' : ('linear-gradient(135deg, #fff 0%, ' + s.color + '15 100%)')
              }
            },
              h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                h('span', { className: 'text-2xl' + (reduceMotion ? '' : ' abs-spin'), 'aria-hidden': 'true' }, s.icon),
                h('div', null,
                  h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-widest', style: { color: isContrast ? '#facc15' : s.color } }, t('stem.allobotsage.casting', 'Casting')),
                  h('div', { className: 'text-base font-bold', style: { color: isContrast ? '#ffffff' : s.color } }, s.name)
                ),
                pendingCast.offlineSourced && h('span', { className: 'text-[0.5625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300' }, t('stem.allobotsage.offline_pack_badge', '⚙ Practice Pack')),
                h('div', { className: 'ml-auto flex items-center gap-2' },
                  readAloudBtn(promptSpeech, t('stem.allobotsage.aria_read_combat_prompt', 'Read combat spell question aloud'), true),
                  h('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.allobotsage.faster_correct_critical', 'Faster + correct = critical!'))
                )
              ),
              pendingCast.aiSourced ? h('div', { className: 'flex items-start gap-1.5 mb-2 px-2 py-1 rounded-lg', style: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)' } },
                h('span', { 'aria-hidden': 'true' }, '⚠️'),
                h('span', { className: 'text-[0.625rem] font-semibold leading-snug', style: { color: '#b45309' } }, t('stem.allobotsage.ai_generated_question_the_marked_answe', 'AI-generated question — the marked answer could be wrong. If it looks off, tell your teacher.'))
              ) : null,
              h('p', { className: 'text-sm font-semibold text-slate-800 mb-3', role: 'group', 'aria-label': t('stem.allobotsage.challenge_prompt', 'Challenge prompt') }, c.prompt),
              // ── Pre-Cast Strategy Confidence Calibration (optional, metacognitive) ──
              !resolved && h('div', { className: 'mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-1.5' },
                  h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-700' }, t('stem.allobotsage.confidence_check_optional', '🧠 Confidence check (optional)')),
                  calSummary.total > 0 && h('div', { className: 'text-[0.625rem] font-semibold text-violet-900 bg-violet-100 px-2 py-0.5 rounded-full' },
                    t('stem.allobotsage.precast_calibration_badge', 'Calibration: {acc}% ({right}/{total})')
                      .replace('{acc}', String(calSummary.overallAccuracy))
                      .replace('{right}', String(calSummary.totalRight))
                      .replace('{total}', String(calSummary.total))
                  )
                ),
                h('div', { className: 'text-[0.625rem] text-slate-600 mb-1.5' }, calSummary.calibrationGuidance),
                h('div', { className: 'grid grid-cols-3 gap-1.5' },
                  [
                    { level: 'low',  icon: '🤷', label: t('stem.allobotsage.guessing', 'Guessing'),    color: '#475569' },
                    { level: 'med',  icon: '🤔', label: t('stem.allobotsage.pretty_sure', 'Pretty sure'), color: '#1d4ed8' },
                    { level: 'high', icon: '🔥', label: t('stem.allobotsage.know_it', 'Know it'),     color: '#15803d' }
                  ].map(function(opt) {
                    var picked = confidence === opt.level;
                    return h('button', {
                      type: 'button',
                      key: 'conf-' + opt.level,
                      onClick: function() {
                        sfxClick();
                        mutateExp({ pendingCast: Object.assign({}, pendingCast, { confidence: opt.level }) });
                      },
                      className: 'text-[0.6875rem] py-1.5 rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (picked ? 'font-bold' : 'font-normal hover:bg-white'),
                      style: picked ? { borderColor: opt.color, background: opt.color + '14', color: opt.color } : { borderColor: '#cbd5e1', color: '#334155', background: '#ffffff' },
                      'aria-label': picked
                        ? t('stem.allobotsage.aria_confidence_selected', '{label} (selected)').replace('{label}', opt.label)
                        : opt.label,
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
                    type: 'button',
                    key: i,
                    disabled: resolved,
                    onClick: function() { if (!resolved) resolveChallenge(i); },
                    className: 'text-left px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-violet-400 '
                      + (resolved
                        ? (isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                          : (isSelected ? 'border-red-400 bg-red-50 text-red-900' : 'border-slate-400 bg-slate-50 text-slate-600'))
                        : 'transition-colors border-slate-300 bg-white hover:border-violet-500 hover:bg-violet-50')
                  },
                    h('span', { className: 'inline-block w-6 h-6 mr-2 rounded-full text-[0.6875rem] font-bold text-center leading-6 ' + (resolved && isCorrect ? 'bg-emerald-700 text-white' : resolved && isSelected ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600') }, String.fromCharCode(65 + i)),
                    opt
                  );
                })
              ),
              resolved && h('div', { className: 'mt-3 p-2.5 rounded-lg ' + (castDiag ? 'bg-red-50 border border-red-200 text-red-900' : 'bg-slate-50 border border-slate-200 text-slate-700') + ' text-[0.6875rem]' },
                h('div', { className: 'flex items-start justify-between gap-2' },
                  h('div', { className: 'flex-1' },
                    h('div', null,
                      h('strong', null, pendingCast.result === 'crit' ? 'Critical hit!' : pendingCast.result === 'hit' ? 'Hit.' : 'Backfire.'),
                      ' ', c.explain
                    ),
                    castDiag && castDiag.whyNot && h('div', { className: 'mt-1.5 pt-1.5 border-t border-red-200 text-red-900' },
                      h('strong', null, t('stem.allobotsage.why_choice_misses_label', 'Why your choice misses: ')),
                      castDiag.whyNot
                    )
                  ),
                  readAloudBtn(explainSpeech, t('stem.allobotsage.aria_read_cast_feedback', 'Read cast explanation aloud'), true)
                )
              ),
              calNote && h('div', {
                className: 'mt-2 p-2 rounded-lg text-[0.6875rem] font-medium',
                style: {
                  background: calNote.tone === 'good' ? '#ecfdf5' : calNote.tone === 'caution' ? '#fef3c7' : '#f1f5f9',
                  color: calNote.tone === 'good' ? '#065f46' : calNote.tone === 'caution' ? '#92400e' : '#334155',
                  border: '1px solid ' + (calNote.tone === 'good' ? '#a7f3d0' : calNote.tone === 'caution' ? '#fcd34d' : '#cbd5e1')
                }
              }, calNote.text)
            );
          })(),

          // Persistent Last Backfire Misconception Review Card (stays readable & listenable after enemy turn)
          !pendingCast && expLastBackfire && h('div', {
            className: 'rounded-xl p-3 mb-3 border border-amber-300 bg-amber-50 text-amber-900 text-xs',
            role: 'region',
            'aria-label': t('stem.allobotsage.aria_last_backfire_review', 'Last backfire misconception feedback')
          },
            h('div', { className: 'flex items-start justify-between gap-2' },
              h('div', { className: 'flex-1' },
                h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-amber-900 mb-0.5' },
                  t('stem.allobotsage.last_backfire_heading', '\u26A1 Last Backfire Check') + ' \u00B7 ' + expLastBackfire.spellName
                ),
                h('div', { className: 'leading-snug' },
                  h('strong', null, t('stem.allobotsage.why_choice_misses_label', 'Why your choice misses: ')),
                  expLastBackfire.whyNot
                ),
                h('div', { className: 'mt-1 text-[0.6875rem]' },
                  h('strong', null, t('stem.allobotsage.target_principle_label', 'Target principle: ')),
                  expLastBackfire.explain
                )
              ),
              readAloudBtn(
                expLastBackfire.spellName + ' backfire feedback. ' + expLastBackfire.whyNot + ' Target principle: ' + expLastBackfire.explain,
                t('stem.allobotsage.aria_read_backfire_review', 'Read last backfire explanation aloud'),
                true
              )
            )
          ),

          // Log
          h('div', { className: 'rounded-xl bg-slate-50 border border-slate-400 p-3 max-h-40 overflow-y-auto' },
            h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-1' }, 'Log'),
            (Array.isArray(exp.log) ? exp.log : []).slice().reverse().slice(0, 8).map(function(entry, i) {
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
        var statsForToughCount = questionStatsMap;
        Object.keys(statsForToughCount).forEach(function(k) {
          if (statsForToughCount[k] && statsForToughCount[k].lastResult === 'backfire') globalToughCount++;
        });
        var totalCalibrated = Object.keys(runConfidence).reduce(function(acc, lvl) { return acc + runConfidence[lvl].right + runConfidence[lvl].wrong; }, 0);
        var debriefCalSummary = ALLOBOTSAGE_ENGINE.summarizeConfidenceCalibration(runCastLog);
        var debriefSummarySpeech = (result === 'victory'
          ? ('Expedition Complete. You cleared all ' + totalRoomsD + ' rooms of the ' + (expedition.sectorName || 'sector') + ' and earned ' + reward + ' essence.')
          : ('Valiant effort. Cleared ' + roomsCleared + ' of ' + totalRoomsD + ' rooms and earned ' + reward + ' essence.'))
          + (runTotals.total > 0 ? (' Casts: ' + runTotals.total + ', criticals: ' + runTotals.crits + ', backfires: ' + runTotals.backfires + '.') : '')
          + (debriefCalSummary.total > 0 ? (' ' + debriefCalSummary.calibrationGuidance) : '');
        return h('div', { className: 'abs-workbench max-w-2xl mx-auto p-4 md:p-6 text-center' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          result === 'victory' && h('div', {
            style: { position: 'relative', display: 'inline-block', marginBottom: 8 }
          },
            allobotAvatar('victory', {
              wandTier: currentlyUnlocked.length >= 10 ? 3 : currentlyUnlocked.length >= 4 ? 2 : currentlyUnlocked.length >= 1 ? 1 : 0,
              robeTier: currentlyUnlocked.length >= 15 ? 2 : currentlyUnlocked.length >= 5 ? 1 : 0
            }),
            h(stableType('VictoryConfettiBurst', VictoryConfettiBurst), null)
          ),
          h('div', {
            className: 'rounded-2xl p-6 mb-4',
            style: {
              background: isContrast
                ? '#000000'
                : (result === 'victory'
                    ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)'),
              border: isContrast ? '2px solid #facc15' : 'none',
              color: 'white'
            }
          },
            h('div', { className: 'text-6xl mb-2' + (reduceMotion ? '' : ' abs-pulse') }, result === 'victory' ? '\u2728' : '\uD83D\uDCA5'),
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
            h('div', { className: 'mt-1 flex flex-wrap items-center justify-center gap-2' },
              h('div', { className: 'inline-block px-4 py-2 rounded-xl bg-white/20 font-bold text-lg' }, '+' + reward + ' \u2B50 Essence'),
              readAloudBtn(debriefSummarySpeech, t('stem.allobotsage.aria_read_debrief_feedback', 'Read debrief summary aloud'), false)
            )
          ),
          // \u2500\u2500 Goal evaluation (Locke & Latham closure) \u2500\u2500
          // For each goal the student picked at the start, check whether they
          // hit it. Specific goals + outcome feedback = the closing loop of
          // goal-setting theory. Renders only if any goals were active.
          (expedition.goals && expedition.goals.length > 0) && (function() {
            var goals = expedition.goals;
            var critsThisRun = (d.critCasts || 0) - (expedition.goalsStartCrits || 0);
            var interruptsThisRun = ((typeof d.interruptCount === 'number' && isFinite(d.interruptCount)) ? d.interruptCount : 0) - (expedition.goalsStartInterrupts || 0);
            var spellsUsed = Object.keys(expedition.goalsSpellsUsed || {}).length;
            var GOAL_DEFS = {
              crit_5:        { icon: '\u2728', label: t('stem.allobotsage.land_5_critical_casts_2', 'Land 5 critical casts'),     check: function() { return critsThisRun >= 5; },        progress: critsThisRun + '/5 crits' },
              spell_variety: { icon: '\ud83c\udf08', label: t('stem.allobotsage.use_all_3_equipped_spells_2', 'Use all 3 equipped spells'), check: function() { return spellsUsed >= 3; },          progress: spellsUsed + ' spell' + (spellsUsed !== 1 ? 's' : '') + ' used' },
              no_death:      { icon: '\ud83d\udee1\ufe0f', label: t('stem.allobotsage.finish_without_dying', 'Finish without dying'),     check: function() { return result === 'victory'; },     progress: result === 'victory' ? 'Survived \u2713' : 'Fell' },
              interrupt:     { icon: '\u26a1', label: t('stem.allobotsage.interrupt_a_boss_special_2', 'Interrupt a boss SPECIAL'),  check: function() { return interruptsThisRun >= 1; },   progress: interruptsThisRun + ' interrupt' + (interruptsThisRun !== 1 ? 's' : '') }
            };
            var metCount = goals.filter(function(gid) { return GOAL_DEFS[gid] && GOAL_DEFS[gid].check(); }).length;
            var allMet = metCount === goals.length;
            return h('section', {
              className: 'rounded-xl border-2 p-3 mb-4 text-left',
              style: { borderColor: allMet ? '#16a34a' : '#94a3b8', background: allMet ? '#ecfdf5' : '#f8fafc' },
              'aria-label': t('stem.allobotsage.aria_goal_progress', 'Goal progress: {met} of {total} met')
                .replace('{met}', String(metCount))
                .replace('{total}', String(goals.length))
            },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider', style: { color: allMet ? '#065f46' : '#475569' } },
                  '\ud83c\udfaf Goal Progress: ' + metCount + ' / ' + goals.length + ' met'
                ),
                allMet && h('span', { className: 'text-[0.625rem] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300' }, t('stem.allobotsage.all_goals_met', '\u2728 All goals met!'))
              ),
              h('div', { className: 'space-y-1' },
                goals.map(function(gid) {
                  var def = GOAL_DEFS[gid];
                  if (!def) return null;
                  var met = def.check();
                  return h('div', {
                    key: 'goal-result-' + gid,
                    className: 'flex items-center gap-2 p-1.5 rounded-md text-[0.6875rem] ' + (met ? 'bg-emerald-100 text-emerald-900' : 'bg-white border border-slate-200 text-slate-600')
                  },
                    h('span', { className: 'text-base' }, met ? '\u2705' : '\u25cb'),
                    h('span', { className: 'flex-1 font-semibold' }, def.icon + ' ' + def.label),
                    h('span', { className: 'text-[0.625rem] ' + (met ? 'text-emerald-700' : 'text-slate-400') }, def.progress)
                  );
                })
              )
            );
          })(),

          // \u2500\u2500 This Run's Breakdown \u2500\u2500
          // Per-spell performance for THIS expedition. The textual reflection
          // moment students will actually use, not a cumulative dashboard.
          runCastLog.length > 0 && h('section', { className: 'rounded-xl border-2 border-slate-200 bg-slate-50 p-3 mb-4 text-left', 'aria-label': t('stem.allobotsage.this_run_s_breakdown', 'This run\'s breakdown') },
            h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-2 text-center' }, t('stem.allobotsage.this_run_per_spell_breakdown', '\uD83D\uDD0D This Run \u2014 Per-Spell Breakdown')),
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
                    h('div', { className: 'text-[0.625rem] text-slate-500' }, st.total + ' cast' + (st.total > 1 ? 's' : '') + ' \u00B7 ' + st.crits + ' crit \u00B7 ' + st.hits + ' hit \u00B7 ' + st.backfires + ' backfire' + (st.backfires !== 1 ? 's' : ''))
                  ),
                  h('div', { className: 'text-right' },
                    h('div', { className: 'font-bold text-sm', style: { color: rateColor } }, rate + '%'),
                    h('div', { className: 'text-[0.5625rem] text-slate-400 uppercase tracking-wide' }, 'correct')
                  )
                );
              })
            ),
            // \u2500\u2500 Confidence calibration summary (if any confidence was set) \u2500\u2500
            totalCalibrated > 0 && h('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
              h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.allobotsage.confidence_calibration', '\uD83E\uDDE0 Confidence Calibration')),
              // Calibration CHART: accuracy by stated confidence. Well-calibrated
              // = bars RISE from Guessing -> Knew it (the dashed reference). A
              // low "Knew it" bar = overconfidence; a high "Guessing" bar = you
              // knew more than you thought. Makes the 3 percentages a picture.
              (function() {
                var order = [
                  { level: 'low',  label: t('stem.allobotsage.guessing_2', 'Guessing'),    icon: '\uD83E\uDD37' },
                  { level: 'med',  label: t('stem.allobotsage.pretty_sure_2', 'Pretty sure'), icon: '\uD83E\uDD14' },
                  { level: 'high', label: t('stem.allobotsage.knew_it', 'Knew it'),     icon: '\uD83D\uDD25' }
                ];
                var W = 240, Hh = 104, padL = 12, padB = 26, padT = 12, bw = 50, gap = 22;
                var sy = function(p) { return padT + (Hh - padT - padB) * (1 - p / 100); };
                var x1Ref = padL + bw / 2;
                var x3Ref = padL + 2 * (bw + gap) + bw / 2;
                return h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + Hh, style: { maxWidth: 300, display: 'block', margin: '0 auto 8px', borderRadius: 8 }, role: 'img', 'aria-label': t('stem.allobotsage.accuracy_by_stated_confidence_well_cal', 'Accuracy by stated confidence; well-calibrated bars rise from Guessing to Knew it.') },
                  !isContrast && h('defs', null,
                    h('linearGradient', { id: 'abs-cal-well', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#f8fafc' }),
                      h('stop', { offset: '100%', stopColor: '#f1f5f9' })
                    ),
                    h('linearGradient', { id: 'abs-cal-good', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#34d399' }),
                      h('stop', { offset: '100%', stopColor: '#15803d' })
                    ),
                    h('linearGradient', { id: 'abs-cal-warn', x1: '0', y1: '0', x2: '0', y2: '1' },
                      h('stop', { offset: '0%', stopColor: '#fbbf24' }),
                      h('stop', { offset: '100%', stopColor: '#d97706' })
                    ),
                    h('linearGradient', { id: 'abs-cal-glint', x1: '0', y1: '0', x2: '1', y2: '0.2' },
                      h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0 }),
                      h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.42 }),
                      h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })
                    ),
                    order.map(function(o, i) {
                      var rc = runConfidence[o.level], tot = rc.right + rc.wrong, x = padL + i * (bw + gap);
                      if (tot === 0) return null;
                      var pct = Math.round(rc.right / tot * 100);
                      var barH = Math.max(2, (Hh - padB) - sy(pct));
                      return h('clipPath', { key: 'cc-' + i, id: 'abs-cal-clip-' + i },
                        h('rect', { x: x, y: sy(pct), width: bw, height: barH, rx: 4 })
                      );
                    })
                  ),
                  // Recessed studio calibration well
                  h('rect', { x: 0, y: 0, width: W, height: Hh, rx: 8, fill: isContrast ? '#000000' : 'url(#abs-cal-well)', stroke: isContrast ? '#ffffff' : 'rgba(148,163,184,0.32)', strokeWidth: 1 }),
                  // Horizontal grid references (50%, 100%) + baseline
                  [50, 100].map(function(gv) {
                    return h('line', { key: 'cg-' + gv, x1: padL - 4, y1: sy(gv), x2: W - 8, y2: sy(gv), stroke: isContrast ? 'rgba(255,255,255,0.22)' : 'rgba(148,163,184,0.28)', strokeWidth: 0.7, strokeDasharray: '2 2' });
                  }),
                  h('line', { x1: padL - 4, y1: Hh - padB, x2: W - 8, y2: Hh - padB, stroke: isContrast ? '#ffffff' : '#94a3b8', strokeWidth: 1 }),
                  // Well-calibrated reference slope line
                  h('line', { className: !isContrast ? 'abs-conduit-flow-slow' : undefined, x1: x1Ref, y1: sy(50), x2: x3Ref, y2: sy(90), stroke: isContrast ? '#facc15' : '#6366f1', strokeWidth: 1.4, strokeDasharray: '3 3', opacity: 0.75 }),
                  order.map(function(o, i) {
                    var rc = runConfidence[o.level], tot = rc.right + rc.wrong, x = padL + i * (bw + gap);
                    var targetY = sy(50 + i * 20);
                    if (tot === 0) return h('g', { key: i },
                      h('text', { x: x + bw / 2, y: sy(0) - 4, textAnchor: 'middle', fontSize: 9, fill: isContrast ? '#ffffff' : '#94a3b8' }, '\u2014'),
                      h('text', { x: x + bw / 2, y: Hh - padB + 12, textAnchor: 'middle', fontSize: 10 }, o.icon),
                      h('text', { x: x + bw / 2, y: Hh - padB + 21, textAnchor: 'middle', fontSize: 7.5, fill: isContrast ? '#facc15' : '#64748b' }, o.label)
                    );
                    var pct = Math.round(rc.right / tot * 100), col = pct >= 70 ? '#16a34a' : '#d97706';
                    var barH = Math.max(2, (Hh - padB) - sy(pct));
                    return h('g', { key: i },
                      h('rect', { x: x, y: sy(pct), width: bw, height: barH, rx: 4, fill: isContrast ? '#facc15' : (pct >= 70 ? 'url(#abs-cal-good)' : 'url(#abs-cal-warn)'), stroke: isContrast ? '#ffffff' : col, strokeWidth: 0.8 }),
                      !isContrast && h('g', { clipPath: 'url(#abs-cal-clip-' + i + ')', className: 'abs-svg-fx' },
                        h('rect', { className: 'abs-glint-sweep', x: x, y: sy(pct), width: 22, height: barH, fill: 'url(#abs-cal-glint)', style: { animationDelay: (i * 0.6) + 's' } })
                      ),
                      !isContrast && h('rect', { className: 'abs-svg-fx', x: x + 2, y: sy(pct) + 1, width: bw - 4, height: Math.min(3, barH * 0.35), rx: 1.5, fill: '#ffffff', opacity: 0.35 }),
                      h('circle', { cx: x + bw / 2, cy: targetY, r: 2.3, fill: '#ffffff', stroke: isContrast ? '#facc15' : '#6366f1', strokeWidth: 1.1 }),
                      h('text', { x: x + bw / 2, y: sy(pct) - 3, textAnchor: 'middle', fontSize: 10, fontWeight: 800, fill: isContrast ? '#facc15' : col }, pct + '%'),
                      h('text', { x: x + bw / 2, y: Hh - padB + 12, textAnchor: 'middle', fontSize: 10 }, o.icon),
                      h('text', { x: x + bw / 2, y: Hh - padB + 21, textAnchor: 'middle', fontSize: 7.5, fill: isContrast ? '#ffffff' : '#475569', fontWeight: 700 }, o.label));
                  }),
                  h('text', { x: W - 6, y: sy(90) - 4, textAnchor: 'end', fontSize: 7.5, fill: isContrast ? '#facc15' : '#6366f1', fontWeight: 700, fontStyle: 'italic' }, t('stem.allobotsage.well_calibrated', 'well-calibrated \u2192'))
                );
              })(),
              h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                [
                  { level: 'high', icon: '\uD83D\uDD25', label: t('stem.allobotsage.knew_it_2', 'Knew it') },
                  { level: 'med',  icon: '\uD83E\uDD14', label: t('stem.allobotsage.pretty_sure_3', 'Pretty sure') },
                  { level: 'low',  icon: '\uD83E\uDD37', label: t('stem.allobotsage.guessing_3', 'Guessing') }
                ].map(function(opt) {
                  var rc = runConfidence[opt.level];
                  var tot = rc.right + rc.wrong;
                  if (tot === 0) return h('div', { key: 'cal-' + opt.level, className: 'p-2 rounded-lg bg-slate-50 text-[0.625rem] text-slate-500' },
                    h('div', null, opt.icon, ' ' + opt.label),
                    h('div', { className: 'text-[0.5625rem] mt-0.5' }, '\u2014')
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
                    className: 'p-2 rounded-lg bg-white border border-slate-200 text-[0.625rem]'
                  },
                    h('div', { className: 'font-bold' }, opt.icon, ' ' + opt.label),
                    h('div', { className: 'font-bold mt-0.5', style: { color: pct >= 70 ? '#16a34a' : '#f59e0b' } }, rc.right + '/' + tot, ' (' + pct + '%)'),
                    note && h('div', { className: 'text-[0.5625rem] italic mt-0.5 text-slate-500' }, note)
                  );
                })
              )
            )
          ),
          // \u2500\u2500 Smart next-step CTAs \u2500\u2500
          // Contextual recommendations driven by the run's actual outcome.
          // Goal: move the student to whichever activity will help them most.
          h('div', { className: 'flex flex-col gap-2 mb-4', 'aria-label': t('stem.allobotsage.recommended_next_steps', 'Recommended next steps') },
            // Backfire-driven CTA: review tough questions
            globalToughCount > 0 && h('button', {
              type: 'button',
              onClick: function() { sfxClick(); updSage({ phase: 'review_mistakes', reviewIdx: 0, reviewRevealed: false, expedition: null }); },
              className: 'transition-colors p-3 rounded-xl border-2 border-red-300 bg-red-50 hover:bg-red-100 text-left flex items-center gap-3 focus:ring-2 focus:ring-red-500 focus:outline-none'
            },
              h('div', { className: 'text-2xl' }, '\uD83C\uDFAF'),
              h('div', { className: 'flex-1' },
                h('div', { className: 'font-bold text-sm text-red-900' }, 'Review ' + globalToughCount + ' tough question' + (globalToughCount > 1 ? 's' : '')),
                h('div', { className: 'text-[0.625rem] text-red-700' }, t('stem.allobotsage.re_study_what_you_got_wrong_mark_got_i', 'Re-study what you got wrong. Mark "Got it now" once you understand.'))
              ),
              h('div', { className: 'text-red-600 font-bold' }, '\u2192')
            ),
            // Weakest-spell CTA: drill it in Study Hall
            weakestSpell && weakestRate < 0.7 && (function() {
              var ws = findSpell(weakestSpell);
              if (!ws) return null;
              return h('button', {
                type: 'button',
                onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: weakestSpell, practiceQuestion: null, practiceSession: { correct: 0, attempted: 0 }, expedition: null }); },
                className: 'transition-colors p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-left flex items-center gap-3 focus:ring-2 focus:ring-emerald-600 focus:outline-none'
              },
                h('div', { className: 'text-2xl' }, ws.icon),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'font-bold text-sm text-emerald-900' }, 'Drill ' + ws.name + ' in Study Hall'),
                  h('div', { className: 'text-[0.625rem] text-emerald-700' }, 'Untimed practice \u2014 your weakest spell this run (' + Math.round(weakestRate * 100) + '% correct). Build it up with no pressure.')
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
                h('div', { className: 'font-bold text-sm text-amber-900' }, t('stem.allobotsage.overconfidence_detected', 'Overconfidence detected')),
                h('div', { className: 'text-[0.625rem] text-amber-700' }, 'You felt sure on ' + runConfidence.high.wrong + ' questions you got wrong. Those are the ones to review first \u2014 feeling-of-knowing fooled you.')
              )
            )
          ),
          h('div', { className: 'grid grid-cols-3 gap-2 mb-4 text-sm' },
            h('div', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-400' },
              h('div', { className: 'text-[0.625rem] font-bold text-slate-600 uppercase' }, t('stem.allobotsage.total_casts', 'Total Casts')),
              h('div', { className: 'text-xl font-bold text-violet-600' }, totalCasts)
            ),
            h('div', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-400' },
              h('div', { className: 'text-[0.625rem] font-bold text-slate-600 uppercase' }, t('stem.allobotsage.critical_casts', 'Critical Casts')),
              h('div', { className: 'text-xl font-bold text-amber-600' }, critCasts)
            ),
            h('div', { className: 'p-3 rounded-xl bg-slate-50 border border-slate-400' },
              h('div', { className: 'text-[0.625rem] font-bold text-slate-600 uppercase' }, t('stem.allobotsage.rooms_cleared', 'Rooms Cleared')),
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
            'aria-label': t('stem.allobotsage.reflection_prompt', 'Reflection prompt')
          },
            h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-sky-700 mb-1' }, t('stem.allobotsage.optional_reflection', '📝 Optional — Reflection')),
            h('p', { className: 'text-[0.6875rem] text-sky-900 mb-2' },
              t('stem.allobotsage.what_is_one_thing_you_learned_or_notic', 'What is ONE thing you learned or noticed this run? (Writing it strengthens memory more than just thinking it.)')
            ),
            h('textarea', {
              key: 'reflection-input',
              defaultValue: '',
              id: 'abs-reflection-textarea',
              'aria-label': t('stem.allobotsage.run_reflection', 'Run reflection'),
              maxLength: 200,
              rows: 2,
              placeholder: t('stem.allobotsage.e_g_the_bee_flower_question_keeps_trip', 'e.g., "The bee/flower question keeps tripping me up — mutualism = both benefit"'),
              className: 'w-full p-2 rounded-md border border-sky-600 bg-white text-[0.75rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400'
            }),
            h('div', { className: 'flex justify-end mt-2' },
              h('button', {
                type: 'button',
                onClick: function() {
                  var ta = document.getElementById('abs-reflection-textarea');
                  if (!ta) return;
                  var text = (ta.value || '').trim();
                  if (text.length === 0) {
                    addToast(t('stem.allobotsage.toast_type_reflection_first', 'Type a quick reflection first (even one sentence helps)'), 'info');
                    return;
                  }
                  sfxClick();
                  var nextReflections = (Array.isArray(d.reflections) ? d.reflections : []).concat([{
                    text: text,
                    sectorName: expedition.sectorName || null,
                    difficulty: expedition.difficulty || 'standard',
                    result: result,
                    at: Date.now()
                  }]);
                  if (nextReflections.length > 30) nextReflections = nextReflections.slice(-30);
                  updKey('reflections', nextReflections);
                  ta.value = '';
                  addToast(t('stem.allobotsage.toast_reflection_saved', '📝 Reflection saved — view it any time in Your Progress'), 'success');
                  announceSR(__alloT('stem.allobotsage.sr_reflection_saved', 'Reflection saved.'));
                },
                className: 'transition-colors px-4 py-1.5 rounded-lg text-[0.6875rem] font-bold text-white bg-sky-700 hover:bg-sky-800 focus:ring-2 focus:ring-sky-300 focus:outline-none'
              }, t('stem.allobotsage.save_reflection', 'Save reflection'))
            )
          ),
          h('div', { className: 'flex flex-wrap gap-2 justify-center' },
            h('button', {
              type: 'button',
              onClick: function() { sfxClick(); updSage({ phase: 'hub', expedition: null }); },
              className: 'transition-colors px-5 py-2.5 rounded-xl font-bold text-white bg-violet-600 hover:bg-violet-700 focus:ring-2 focus:ring-violet-300 focus:outline-none'
            }, t('stem.allobotsage.return_to_spellforge', 'Return to Spellforge')),
            h('button', {
              type: 'button',
              onClick: function() { sfxClick(); updSage({ phase: 'shop', expedition: null }); },
              className: 'transition-colors px-5 py-2.5 rounded-xl font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 focus:ring-2 focus:ring-amber-600 focus:outline-none'
            }, t('stem.allobotsage.visit_spell_shop', '\u2B50 Visit Spell Shop')),
            h('button', {
              type: 'button',
              onClick: function() { sfxClick(); updSage({ phase: 'loadout', expedition: null }); },
              className: 'transition-colors px-5 py-2.5 rounded-xl font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 focus:ring-2 focus:ring-violet-500 focus:outline-none'
            }, t('stem.allobotsage.another_expedition', 'Another Expedition'))
          )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: SHOP (spend essence to upgrade spells)
      // ─────────────────────────────────────────────────
      if (phase === 'shop') {
        var spellLvls = spellLevelsMap;
        var unlockedSpells2 = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });

        function upgrade(spellId) {
          var s = findSpell(spellId);
          if (!s) return;
          var lvl = safeNum(spellLvls[spellId], 0);
          if (lvl >= SPELL_LEVEL_CAP) {
            addToast(t('stem.allobotsage.toast_spell_max_level', '{name} is already at max level').replace('{name}', s.name), 'info');
            return;
          }
          var cost = upgradeCost(lvl);
          if (essence < cost) {
            addToast(
              t('stem.allobotsage.toast_need_essence', 'Need {cost} essence (you have {have})')
                .replace('{cost}', String(cost))
                .replace('{have}', String(essence)),
              'error'
            );
            return;
          }
          sfxUnlock();
          updateSageAtomic(function(cur) {
            var curLvls = Object.assign({}, safeObj(cur.spellLevels));
            var curEss = safeNum(cur.essence, essence);
            var curL = safeNum(curLvls[spellId], lvl);
            var curCost = upgradeCost(curL);
            if (curL >= SPELL_LEVEL_CAP || curEss < curCost) return null;
            curLvls[spellId] = curL + 1;
            return { spellLevels: curLvls, essence: curEss - curCost };
          });
          addToast(
            t('stem.allobotsage.toast_spell_upgraded', '\u2728 {name} \u2192 Lv{level}')
              .replace('{name}', s.name)
              .replace('{level}', String(lvl + 1)),
            'success'
          );
          announceSR(s.name + ' upgraded to level ' + (lvl + 1) + '.');
        }

        return h('div', { className: 'abs-workbench max-w-3xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(function() { sfxClick(); updKey('phase', 'hub'); }, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge')),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[0.625rem] text-slate-600 font-semibold uppercase tracking-wider' + onHostInk }, t('stem.allobotsage.spell_shop_2', 'Spell Shop'))
          ),
          h('div', { className: 'rounded-2xl p-4 mb-4', style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #78350f 0%, #f59e0b 100%)', border: isContrast ? '2px solid #facc15' : 'none', color: 'white' } },
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'text-4xl' + (reduceMotion ? '' : ' abs-float') }, '\uD83D\uDD2E'),
              h('div', { className: 'flex-1' },
                h('h1', { className: 'text-xl font-bold' }, t('stem.allobotsage.etching_workshop', 'Etching Workshop')),
                h('p', { className: 'text-sm text-amber-100 mt-1' }, t('stem.allobotsage.spend_essence_to_deepen_the_runes_of_e', 'Spend essence to deepen the runes of each spell. Higher levels = more base damage + bigger crits.'))
              ),
              h('div', { className: 'text-right' },
                h('div', { className: 'text-[0.625rem] font-bold text-amber-200 uppercase' }, t('stem.allobotsage.essence', 'Essence')),
                h('div', { className: 'text-2xl font-bold' }, '\u2B50 ' + essence)
              )
            )
          ),
          unlockedSpells2.length === 0
            ? h('div', { className: 'rounded-xl p-6 text-center bg-slate-50 border border-slate-400 text-sm text-slate-600' },
                t('stem.allobotsage.no_spells_to_upgrade_yet_unlock_spells', 'No spells to upgrade yet. Unlock spells by playing other STEAM Lab tools.')
              )
            : h('div', { className: 'space-y-2' },
                unlockedSpells2.map(function(s) {
                  var lvl = safeNum(spellLvls[s.id], 0);
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
                        lvl > 0 && h('span', { className: 'text-[0.5625rem] px-1 py-0.5 rounded bg-amber-100 text-amber-900 font-bold' }, 'Lv' + lvl),
                        maxed && h('span', { className: 'text-[0.5625rem] px-1 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold' }, 'MAX')
                      ),
                      h('div', { className: 'text-[0.6875rem] text-slate-600' }, s.sourceLabel),
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
                      h('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.allobotsage.damage', 'Damage')),
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
                      type: 'button',
                      disabled: maxed || !canAfford,
                      onClick: function() { upgrade(s.id); },
                      className: 'px-3 py-2 rounded-lg font-bold text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none '
                        + (maxed
                          ? 'bg-emerald-100 text-emerald-900 cursor-default'
                          : canAfford
                            ? 'transition-colors bg-amber-700 hover:bg-amber-800 text-white'
                            : 'bg-slate-100 text-slate-600 cursor-not-allowed'),
                      'aria-label': maxed
                        ? t('stem.allobotsage.aria_spell_maxed', '{name} is maxed').replace('{name}', s.name)
                        : t('stem.allobotsage.aria_upgrade_spell', 'Upgrade {name} for {cost} essence').replace('{name}', s.name).replace('{cost}', String(cost))
                    }, maxed ? 'Maxed' : ('\u2B50 ' + cost))
                  );
                })
              )
        );
      }

      // ─────────────────────────────────────────────────
      // ── PHASE: PRACTICE (Study Hall — untimed drill)
      // ─────────────────────────────────────────────────
      if (phase === 'practice') {
        var practiceSpellId = typeof d.practiceSpellId === 'string' ? d.practiceSpellId : null;
        var practiceSpell = practiceSpellId ? findSpell(practiceSpellId) : null;
        var rawPracticeQ = d.practiceQuestion;
        var validPracticeQ = (rawPracticeQ && typeof rawPracticeQ === 'object' && !Array.isArray(rawPracticeQ)
          && rawPracticeQ.q && typeof rawPracticeQ.q === 'object'
          && typeof rawPracticeQ.q.prompt === 'string' && Array.isArray(rawPracticeQ.q.options) && rawPracticeQ.q.options.length > 0)
          ? rawPracticeQ : null;
        var rawSession = safeObj(d.practiceSession);
        var practiceStats = {
          correct: safeNum(rawSession.correct, 0),
          attempted: safeNum(rawSession.attempted, 0)
        };

        function startPractice(spellId) {
          var sp = findSpell(spellId);
          if (!sp) return;
          var bank = getMergedBank(sp, aiChallengeCache, offlineChallengeCache);
          var q = pickWeighted(bank, questionStatsMap);
          updSage({ practiceSpellId: spellId, practiceQuestion: { q: q, answered: false, selectedIndex: null }, practiceSession: { correct: 0, attempted: 0 } });
          if (q) announceSR('Study Hall: ' + sp.name + '. ' + q.prompt);
        }

        function rerollStudyHallBank(sp) {
          if (!sp) return;
          sfxClick();
          if (aiOn) {
            if (aiInFlightMap[sp.id]) return;
            var inFlightLocal = Object.assign({}, aiInFlightMap);
            inFlightLocal[sp.id] = true;
            updKey('_aiInFlight', inFlightLocal);
            addToast(
              t('stem.allobotsage.toast_study_generating_ai', 'Generating fresh AI questions for {name}...')
                .replace('{name}', sp.name),
              'info'
            );
            aiGenerateChallenges(sp, callGemini, toolData).then(function(qs) {
              if (qs.length > 0) {
                updateSageAtomic(function(cur) {
                  var freshCache = Object.assign({}, safeObj(cur.aiChallengeCache));
                  var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                  delete freshFlight[sp.id];
                  freshCache[sp.id] = qs;
                  return {
                    aiChallengeCache: freshCache,
                    _aiInFlight: freshFlight,
                    practiceQuestion: { q: qs[0], answered: false, selectedIndex: null }
                  };
                });
                addToast(
                  t('stem.allobotsage.toast_spell_rerolled', '\u2728 {name} rerolled (+{count} new)')
                    .replace('{name}', sp.name)
                    .replace('{count}', String(qs.length)),
                  'success'
                );
              } else {
                var offQs = ALLOBOTSAGE_ENGINE.generateOfflineSpellQuestions(sp, safeNum(offlineSeeds[sp.id], 0) + 1, getMergedBank(sp, aiChallengeCache, {}).map(function(x) { return x.prompt; }));
                updateSageAtomic(function(cur) {
                  var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                  delete freshFlight[sp.id];
                  var curOff = Object.assign({}, safeObj(cur.offlineChallengeCache));
                  var curSeeds = Object.assign({}, safeObj(cur._offlineSeeds));
                  curOff[sp.id] = offQs;
                  curSeeds[sp.id] = safeNum(curSeeds[sp.id], 0) + 1;
                  return {
                    _aiInFlight: freshFlight,
                    offlineChallengeCache: curOff,
                    _offlineSeeds: curSeeds,
                    practiceQuestion: offQs.length > 0 ? { q: offQs[0], answered: false, selectedIndex: null } : cur.practiceQuestion
                  };
                });
                addToast(
                  t('stem.allobotsage.toast_offline_spell_rerolled', '\u2699\ufe0f {name} practice pack rerolled (+{count} fresh)')
                    .replace('{name}', sp.name)
                    .replace('{count}', String(offQs.length)),
                  'info'
                );
              }
            }).catch(function() {
              var offQs2 = ALLOBOTSAGE_ENGINE.generateOfflineSpellQuestions(sp, safeNum(offlineSeeds[sp.id], 0) + 1, getMergedBank(sp, aiChallengeCache, {}).map(function(x) { return x.prompt; }));
              updateSageAtomic(function(cur) {
                var freshFlight = Object.assign({}, safeObj(cur._aiInFlight));
                delete freshFlight[sp.id];
                var curOff = Object.assign({}, safeObj(cur.offlineChallengeCache));
                var curSeeds = Object.assign({}, safeObj(cur._offlineSeeds));
                curOff[sp.id] = offQs2;
                curSeeds[sp.id] = safeNum(curSeeds[sp.id], 0) + 1;
                return {
                  _aiInFlight: freshFlight,
                  offlineChallengeCache: curOff,
                  _offlineSeeds: curSeeds,
                  practiceQuestion: offQs2.length > 0 ? { q: offQs2[0], answered: false, selectedIndex: null } : cur.practiceQuestion
                };
              });
              addToast(
                t('stem.allobotsage.toast_offline_spell_rerolled', '\u2699\ufe0f {name} practice pack rerolled (+{count} fresh)')
                  .replace('{name}', sp.name)
                  .replace('{count}', String(offQs2.length)),
                'info'
              );
            });
            return;
          }
          var nextSeed = safeNum(offlineSeeds[sp.id], 0) + 1;
          var existingPrompts = getMergedBank(sp, aiChallengeCache, {}).map(function(x) { return x.prompt; });
          var freshPack = ALLOBOTSAGE_ENGINE.generateOfflineSpellQuestions(sp, nextSeed, existingPrompts);
          if (freshPack.length > 0) {
            updateSageAtomic(function(cur) {
              var curOff = Object.assign({}, safeObj(cur.offlineChallengeCache));
              var curSeeds = Object.assign({}, safeObj(cur._offlineSeeds));
              curOff[sp.id] = freshPack;
              curSeeds[sp.id] = nextSeed;
              return {
                offlineChallengeCache: curOff,
                _offlineSeeds: curSeeds,
                practiceQuestion: { q: freshPack[0], answered: false, selectedIndex: null }
              };
            });
            addToast(
              t('stem.allobotsage.toast_offline_spell_rerolled', '\u2699\ufe0f {name} practice pack rerolled (+{count} fresh)')
                .replace('{name}', sp.name)
                .replace('{count}', String(freshPack.length)),
              'success'
            );
          }
        }

        function exitPractice() {
          sfxClick();
          updSage({ phase: 'hub', practiceSpellId: null, practiceQuestion: null, practiceSession: null });
        }

        // Spell-picker subview (no spell chosen yet)
        if (!practiceSpell) {
          var unlockedForPractice = SPELLBOOK.filter(function(s) { return currentlyUnlocked.indexOf(s.id) !== -1; });
          return h('div', { className: 'abs-workbench max-w-3xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
            h('div', { className: 'flex items-center gap-3 mb-4' },
              backBtn(exitPractice, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge')),
              h('div', { className: 'flex-1' }),
              h('div', { className: 'text-[0.625rem] text-slate-600 font-semibold uppercase tracking-wider' + onHostInk }, t('stem.allobotsage.study_hall_2', 'Study Hall'))
            ),
            h('div', { className: 'rounded-2xl p-4 md:p-5 mb-4', style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', border: isContrast ? '2px solid #facc15' : 'none', color: 'white' } },
              h('div', { className: 'flex items-center gap-3 flex-wrap' },
                h('div', { className: 'text-4xl' + (reduceMotion ? '' : ' abs-float') }, '📚'),
                h('div', { className: 'flex-1' },
                  h('h1', { className: 'text-xl font-bold' }, t('stem.allobotsage.study_hall_3', 'Study Hall')),
                  h('p', { className: 'text-sm text-emerald-100 mt-1' }, t('stem.allobotsage.untimed_practice_no_hp_no_damage_just_', 'Untimed practice. No HP. No damage. Just retrieval + explanations. Failed questions resurface sooner.'))
                ),
                unlockedForPractice.length > 0 && h('button', {
                  type: 'button',
                  onClick: function() {
                    sfxClick();
                    var addedAll = generateOfflinePackForSpells(unlockedForPractice.slice(0, 6).map(function(s) { return s.id; }), true);
                    if (addedAll > 0) {
                      addToast(
                        t('stem.allobotsage.toast_offline_pack_generated', '\u2699\ufe0f +{count} fresh offline practice questions ready')
                          .replace('{count}', String(addedAll)),
                        'success'
                      );
                    }
                  },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-white transition-colors',
                  'aria-label': t('stem.allobotsage.aria_study_hall_generate_all', 'Generate fresh practice questions for Study Hall spells')
                }, t('stem.allobotsage.study_hall_generate_pack_btn', '\u2699\ufe0f Fresh Practice Packs'))
              )
            ),
            unlockedForPractice.length === 0
              ? h('div', { className: 'rounded-xl p-6 text-center bg-slate-50 border border-slate-300 text-sm text-slate-600' },
                  t('stem.allobotsage.no_spells_unlocked_yet_play_other_stem', 'No spells unlocked yet. Play other STEAM Lab tools to unlock spells, then come back here to practice.')
                )
              : h('div', null,
                  h('h2', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2' + onHostInk }, t('stem.allobotsage.choose_a_spell_to_practice', '🧪 Choose a spell to practice')),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                    unlockedForPractice.map(function(s) {
                      var bank = getMergedBank(s, aiChallengeCache, offlineChallengeCache);
                      var stats = questionStatsMap;
                      var seen = 0, mistakes = 0;
                      bank.forEach(function(qq) {
                        var st = stats[qq.prompt];
                        if (st) { seen++; if (st.lastResult === 'backfire') mistakes++; }
                      });
                      var unseen = bank.length - seen;
                      return h('button', {
                        type: 'button',
                        key: s.id,
                        onClick: function() { sfxClick(); startPractice(s.id); },
                        className: 'text-left p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition',
                        style: { borderLeft: '4px solid ' + s.color },
                        'aria-label': mistakes > 0
                          ? t('stem.allobotsage.aria_practice_spell_tough', 'Practice {name}, {count} tough questions waiting')
                              .replace('{name}', s.name)
                              .replace('{count}', String(mistakes))
                          : t('stem.allobotsage.aria_practice_spell', 'Practice {name}').replace('{name}', s.name)
                      },
                        h('div', { className: 'flex items-center gap-2 mb-1' },
                          h('span', { className: 'text-2xl' }, s.icon),
                          h('span', { className: 'font-bold text-sm', style: { color: s.color } }, s.name),
                          mistakes > 0 && h('span', { className: 'ml-auto text-[0.625rem] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded' }, '⚠ ' + mistakes + ' tough')
                        ),
                        h('div', { className: 'text-[0.6875rem] text-slate-600' }, s.sourceLabel + ' · ' + bank.length + ' questions'),
                        h('div', { className: 'text-[0.625rem] text-slate-600 mt-0.5' },
                          seen + ' practiced · ' + unseen + ' new'
                        )
                      );
                    })
                  )
                )
          );
        }

        // Active question subview (resilient if practiceQuestion was null or malformed)
        var activeBank = getMergedBank(practiceSpell, aiChallengeCache, offlineChallengeCache);
        var practiceQ = validPracticeQ || (activeBank.length > 0 ? { q: activeBank[0], answered: false, selectedIndex: null } : null);
        if (!practiceQ || !practiceQ.q) {
          return h('div', { className: 'abs-workbench max-w-2xl mx-auto p-4 md:p-6', 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
            backBtn(exitPractice, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge'))
          );
        }
        var practiceAnswered = !!practiceQ.answered;
        function answerPractice(selectedIndex) {
          if (!practiceSpell || !practiceQ || practiceAnswered) return;
          var correct = selectedIndex === practiceQ.q.correctIndex;
          var diag = ALLOBOTSAGE_ENGINE.diagnoseSageDistractor(practiceSpell, practiceQ.q, selectedIndex);
          var nowTs = Date.now();
          updateSageAtomic(function(cur) {
            var nextStats = Object.assign({}, safeObj(cur.questionStats));
            var prev = safeObj(nextStats[practiceQ.q.prompt]);
            nextStats[practiceQ.q.prompt] = {
              lastResult: correct ? 'hit' : 'backfire',
              lastSeen: nowTs,
              attempts: safeNum(prev.attempts, 0) + 1,
              correctCount: safeNum(prev.correctCount, 0) + (correct ? 1 : 0)
            };
            var nextCounts = Object.assign({}, safeObj(cur.castCounts));
            nextCounts[practiceSpell.id] = safeNum(nextCounts[practiceSpell.id], 0) + 1;
            var curSess = safeObj(cur.practiceSession);
            var nextSession = {
              correct: safeNum(curSess.correct, practiceStats.correct) + (correct ? 1 : 0),
              attempted: safeNum(curSess.attempted, practiceStats.attempted) + 1
            };
            return {
              practiceQuestion: Object.assign({}, practiceQ, {
                answered: true,
                selectedIndex: selectedIndex,
                wasCorrect: correct,
                whyNot: diag ? diag.whyNot : null
              }),
              questionStats: nextStats,
              castCounts: nextCounts,
              practiceSession: nextSession,
              totalCasts: safeNum(cur.totalCasts, totalCasts) + 1
            };
          });
          if (correct) sfxCastHit(); else sfxBackfire();
          announceSR((correct ? 'Correct. ' : ('Not quite. ' + (diag && diag.whyNot ? diag.whyNot + ' ' : ''))) + practiceQ.q.explain);
        }
        function nextPractice() {
          if (!practiceSpell) return;
          var bank = getMergedBank(practiceSpell, aiChallengeCache, offlineChallengeCache);
          var q = pickWeighted(bank, questionStatsMap);
          updKey('practiceQuestion', { q: q, answered: false, selectedIndex: null });
          if (q) announceSR('Next question. ' + q.prompt);
        }

        var pq = practiceQ.q;
        var bankSize = activeBank.length;
        var selectedIdx = practiceQ.selectedIndex;
        var wasCorrect = !!practiceQ.wasCorrect;
        var practiceDiag = (practiceAnswered && !wasCorrect)
          ? ALLOBOTSAGE_ENGINE.diagnoseSageDistractor(practiceSpell, pq, selectedIdx)
          : null;
        var studyPromptSpeech = practiceSpell.name + '. ' + pq.prompt + ' ' + pq.options.map(function(o, oi) { return String.fromCharCode(65 + oi) + ': ' + o; }).join('. ');
        var studyExplainSpeech = wasCorrect
          ? ('Correct. ' + pq.explain)
          : ('Not quite. ' + (practiceDiag && practiceDiag.whyNot ? practiceDiag.whyNot + ' ' : '') + 'Target principle: ' + pq.explain);
        return h('div', { className: 'abs-workbench max-w-2xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', {
              type: 'button',
              onClick: function() { sfxClick(); updSage({ practiceSpellId: null, practiceQuestion: null }); },
              className: 'transition-colors text-xs font-semibold text-slate-600 hover:text-slate-800 underline' + onHostInk
            }, t('stem.allobotsage.change_spell', '← Change spell')),
            h('div', { className: 'flex-1 text-center' },
              h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-widest text-emerald-700' }, t('stem.allobotsage.study_hall_untimed', '📚 Study Hall — Untimed')),
              h('div', { className: 'text-[0.6875rem] text-slate-600' + onHostInk },
                practiceStats.correct + '/' + practiceStats.attempted + ' correct this session · ' + bankSize + ' total questions'
              )
            ),
            h('button', {
              type: 'button',
              onClick: exitPractice,
              className: 'transition-colors text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline' + onHostInk
            }, t('stem.allobotsage.end_session', 'End session'))
          ),
          // Spell header + Practice Generator / Reroll
          h('div', { className: 'rounded-xl p-3 mb-3 flex items-center gap-3 flex-wrap', style: { background: isContrast ? '#000000' : (practiceSpell.color + '14'), border: '1px solid ' + (isContrast ? '#facc15' : (practiceSpell.color + '40')) } },
            h('span', { className: 'text-3xl' }, practiceSpell.icon),
            h('div', { className: 'flex-1 min-w-0' },
              h('div', { className: 'font-bold', style: { color: isContrast ? '#facc15' : practiceSpell.color } }, practiceSpell.name),
              h('div', { className: 'text-[0.625rem] text-slate-600' + onHostInk }, practiceSpell.sourceLabel + ' · ' + practiceSpell.element)
            ),
            h('button', {
              type: 'button',
              onClick: function() { rerollStudyHallBank(practiceSpell); },
              className: 'px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors',
              'aria-label': aiOn
                ? t('stem.allobotsage.aria_study_reroll_ai', 'Generate or reroll fresh AI questions for {name}').replace('{name}', practiceSpell.name)
                : t('stem.allobotsage.aria_study_reroll_offline', 'Generate or reroll fresh offline practice questions for {name}').replace('{name}', practiceSpell.name)
            }, aiOn
              ? t('stem.allobotsage.study_reroll_ai_btn', '\u2728 Fresh AI Pack')
              : t('stem.allobotsage.study_reroll_offline_btn', '\u2699\ufe0f Reroll Pack'))
          ),
          // Question
          h('div', { className: 'rounded-2xl p-5 mb-3 border-2 border-slate-200 bg-white' },
            h('div', { className: 'flex items-start justify-between gap-2 mb-3' },
              h('div', { className: 'flex-1' },
                pq.offlineGenerated && h('span', { className: 'inline-block mb-1 text-[0.5625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300' }, t('stem.allobotsage.offline_pack_badge', '⚙ Practice Pack')),
                pq.aiGenerated && h('span', { className: 'inline-block mb-1 text-[0.5625rem] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-300' }, t('stem.allobotsage.ai', '✨ AI')),
                h('p', { className: 'text-sm font-semibold text-slate-800 leading-relaxed' }, pq.prompt)
              ),
              readAloudBtn(studyPromptSpeech, t('stem.allobotsage.aria_read_study_prompt', 'Read Study Hall question aloud'), true)
            ),
            h('div', { className: 'grid grid-cols-1 gap-2' },
              pq.options.map(function(opt, oi) {
                var isSelected = selectedIdx === oi;
                var isCorrect = oi === pq.correctIndex;
                var revealed = practiceAnswered;
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
                var optAria = revealed
                  ? (isCorrect
                      ? t('stem.allobotsage.aria_option_correct', 'Option {num}: {text} (correct)').replace('{num}', String(oi + 1)).replace('{text}', opt)
                      : isSelected
                        ? t('stem.allobotsage.aria_option_incorrect', 'Option {num}: {text} (your answer, incorrect)').replace('{num}', String(oi + 1)).replace('{text}', opt)
                        : t('stem.allobotsage.aria_option_plain', 'Option {num}: {text}').replace('{num}', String(oi + 1)).replace('{text}', opt))
                  : t('stem.allobotsage.aria_option_plain', 'Option {num}: {text}').replace('{num}', String(oi + 1)).replace('{text}', opt);
                return h('button', {
                  type: 'button',
                  key: 'opt-' + oi,
                  onClick: revealed ? null : function() { answerPractice(oi); },
                  disabled: revealed,
                  className: cls,
                  'aria-label': optAria
                },
                  h('span', { className: 'inline-block w-6 font-bold' }, String.fromCharCode(65 + oi) + '.'),
                  opt,
                  revealed && isCorrect && h('span', { className: 'ml-2' }, '✓'),
                  revealed && isSelected && !isCorrect && h('span', { className: 'ml-2' }, '✗')
                );
              })
            ),
            // Explanation + per-distractor whyNot diagnosis
            practiceAnswered && h('div', {
              className: 'mt-4 p-3 rounded-lg',
              style: { background: wasCorrect ? '#ecfdf5' : '#fef2f2', border: '1px solid ' + (wasCorrect ? '#a7f3d0' : '#fecaca') }
            },
              h('div', { className: 'flex items-start justify-between gap-2' },
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider mb-1', style: { color: wasCorrect ? '#065f46' : '#991b1b' } },
                    wasCorrect ? '✓ Correct — why this is right' : '✗ Not quite — misconception & target principle'
                  ),
                  !wasCorrect && practiceDiag && practiceDiag.whyNot && h('div', { className: 'text-[0.75rem] leading-relaxed mb-1.5 text-red-900' },
                    h('strong', null, t('stem.allobotsage.why_choice_misses_label', 'Why your choice misses: ')),
                    practiceDiag.whyNot
                  ),
                  h('div', { className: 'text-[0.75rem] leading-relaxed', style: { color: wasCorrect ? '#065f46' : '#7f1d1d' } },
                    !wasCorrect && h('strong', null, t('stem.allobotsage.target_principle_label', 'Target principle: ')),
                    pq.explain
                  )
                ),
                readAloudBtn(studyExplainSpeech, t('stem.allobotsage.aria_read_study_explanation', 'Read Study Hall explanation aloud'), true)
              )
            )
          ),
          practiceAnswered && h('div', { className: 'flex gap-2 justify-end' },
            h('button', {
              type: 'button',
              onClick: function() { sfxClick(); nextPractice(); },
              className: 'transition-colors px-5 py-2.5 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-300 focus:outline-none'
            }, t('stem.allobotsage.next_question', 'Next question →'))
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
        var allStats = questionStatsMap;
        var toughList = [];
        SPELLBOOK.forEach(function(sp) {
          var bank = getMergedBank(sp, aiChallengeCache, offlineChallengeCache);
          bank.forEach(function(qq) {
            var st = allStats[qq.prompt];
            if (st && st.lastResult === 'backfire') {
              toughList.push({ spell: sp, q: qq, stat: st });
            }
          });
        });
        toughList.sort(function(a, b) { return (b.stat.lastSeen || 0) - (a.stat.lastSeen || 0); });

        var reviewIdx = (Number.isInteger(d.reviewIdx) && d.reviewIdx >= 0) ? d.reviewIdx : 0;
        var reviewRevealed = !!d.reviewRevealed;
        var current = toughList[reviewIdx];

        function gotIt() {
          if (!current) return;
          sfxCastHit();
          var nowTs = Date.now();
          updateSageAtomic(function(cur) {
            var nextStats = Object.assign({}, safeObj(cur.questionStats));
            var prev = safeObj(nextStats[current.q.prompt]);
            nextStats[current.q.prompt] = {
              lastResult: 'hit',
              lastSeen: nowTs,
              attempts: safeNum(prev.attempts, 0) + 1,
              correctCount: safeNum(prev.correctCount, 0) + 1
            };
            return { questionStats: nextStats, reviewIdx: reviewIdx + 1, reviewRevealed: false };
          });
          announceSR(__alloT('stem.allobotsage.sr_marked_as_understood_next_question', 'Marked as understood. Next question.'));
        }
        function stillTough() {
          if (!current) return;
          sfxBackfire();
          var nowTs = Date.now();
          updateSageAtomic(function(cur) {
            var nextStats = Object.assign({}, safeObj(cur.questionStats));
            var prev = safeObj(nextStats[current.q.prompt]);
            nextStats[current.q.prompt] = Object.assign({}, prev, {
              lastResult: 'backfire',
              lastSeen: nowTs,
              attempts: safeNum(prev.attempts, 0) + 1
            });
            return { questionStats: nextStats, reviewIdx: reviewIdx + 1, reviewRevealed: false };
          });
          announceSR(__alloT('stem.allobotsage.sr_still_tough_keeping_in_review_queue_next_question', 'Still tough — keeping in review queue. Next question.'));
        }
        function exitReview() {
          sfxClick();
          updSage({ phase: 'hub', reviewIdx: 0, reviewRevealed: false });
        }

        if (toughList.length === 0) {
          return h('div', { className: 'abs-workbench max-w-2xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
            h('div', { className: 'flex items-center gap-3 mb-4' },
              backBtn(exitReview, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge')),
              h('div', { className: 'flex-1' }),
              h('div', { className: 'text-[0.625rem] text-slate-600 font-semibold uppercase tracking-wider' + onHostInk }, t('stem.allobotsage.review', 'Review'))
            ),
            h('div', { className: 'rounded-2xl p-8 text-center', style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', border: isContrast ? '2px solid #facc15' : 'none', color: 'white' } },
              h('div', { className: 'text-6xl mb-3' }, '✨'),
              h('h2', { className: 'text-2xl font-bold mb-2' }, t('stem.allobotsage.clean_slate', 'Clean slate!')),
              h('p', { className: 'text-sm text-emerald-100' }, t('stem.allobotsage.no_questions_in_the_review_queue_eithe', 'No questions in the review queue. Either you haven\'t played enough yet, or you\'re crushing it. Try Study Hall for low-stakes practice, or launch an expedition.'))
            )
          );
        }

        if (reviewIdx >= toughList.length) {
          return h('div', { className: 'abs-workbench max-w-2xl mx-auto p-4 md:p-6 text-center' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
            h('div', { className: 'rounded-2xl p-8', style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', border: isContrast ? '2px solid #facc15' : 'none', color: 'white' } },
              h('div', { className: 'text-6xl mb-3' }, '🎓'),
              h('h2', { className: 'text-2xl font-bold mb-2' }, t('stem.allobotsage.review_complete', 'Review complete!')),
              h('p', { className: 'text-sm text-emerald-100 mb-4' }, 'You reviewed ' + toughList.length + ' tough question' + (toughList.length > 1 ? 's' : '') + '. Strong work — that\'s how learning sticks.'),
              h('button', { type: 'button', onClick: exitReview, className: 'transition-colors px-6 py-2.5 rounded-xl font-bold text-emerald-800 bg-white hover:bg-emerald-50' }, t('stem.allobotsage.back_to_spellforge', 'Back to Spellforge'))
            )
          );
        }

        var rq = current.q;
        var reviewSpeech = rq.prompt + (reviewRevealed ? (' Correct answer: ' + rq.options[rq.correctIndex] + '. ' + rq.explain) : '');
        return h('div', { className: 'abs-workbench max-w-2xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          h('div', { className: 'flex items-center gap-3 mb-3' },
            backBtn(exitReview, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge')),
            h('div', { className: 'flex-1 text-center' },
              h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-widest text-red-700' }, t('stem.allobotsage.review_tough_questions', '🎯 Review Tough Questions')),
              h('div', { className: 'text-[0.6875rem] text-slate-600' + onHostInk }, 'Card ' + (reviewIdx + 1) + ' of ' + toughList.length)
            ),
            h('div', { style: { width: '60px' } })
          ),
          h('div', { className: 'rounded-xl p-2 mb-3 flex items-center gap-2 text-[0.6875rem]', style: { background: current.spell.color + '14', border: '1px solid ' + current.spell.color + '40' } },
            h('span', null, current.spell.icon),
            h('span', { className: 'font-semibold', style: { color: current.spell.color } }, current.spell.name),
            h('span', { className: 'text-slate-600' }, '·'),
            h('span', { className: 'text-slate-600' }, current.spell.sourceLabel),
            h('span', { className: 'ml-auto text-slate-600' }, current.stat.attempts + ' attempt' + (current.stat.attempts > 1 ? 's' : ''))
          ),
          h('div', { className: 'rounded-2xl p-5 mb-3 border-2 border-red-200 bg-red-50' },
            h('div', { className: 'flex items-center justify-between gap-2 mb-2' },
              h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-red-700' }, t('stem.allobotsage.question', '❓ Question')),
              readAloudBtn(reviewSpeech, t('stem.allobotsage.aria_read_review_card', 'Read review card aloud'), true)
            ),
            h('p', { className: 'text-sm font-semibold text-slate-800 leading-relaxed mb-4' }, rq.prompt),
            h('div', { className: 'grid grid-cols-1 gap-1.5' },
              rq.options.map(function(opt, oi) {
                var isCorrect = oi === rq.correctIndex;
                return h('div', {
                  key: 'rev-opt-' + oi,
                  className: 'text-[0.75rem] p-2 rounded ' + (reviewRevealed && isCorrect ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300' : 'bg-white text-slate-700 border border-slate-200'),
                  'aria-label': (reviewRevealed && isCorrect)
                    ? t('stem.allobotsage.aria_review_option_correct', 'Option {num} (correct answer)').replace('{num}', String(oi + 1))
                    : t('stem.allobotsage.aria_review_option_plain', 'Option {num}').replace('{num}', String(oi + 1))
                },
                  h('span', { className: 'inline-block w-6 font-bold' }, String.fromCharCode(65 + oi) + '.'),
                  opt,
                  reviewRevealed && isCorrect && h('span', { className: 'ml-2' }, '✓')
                );
              })
            ),
            !reviewRevealed && h('button', {
              type: 'button',
              onClick: function() { sfxClick(); updKey('reviewRevealed', true); },
              className: 'transition-colors mt-4 w-full py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-200 focus:outline-none'
            }, t('stem.allobotsage.reveal_answer_explanation', '👁 Reveal answer + explanation')),
            reviewRevealed && h('div', { className: 'mt-4 p-3 rounded-lg bg-white border border-emerald-200' },
              h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 mb-1' }, t('stem.allobotsage.why_this_is_correct', '✓ Why this is correct')),
              h('div', { className: 'text-[0.75rem] leading-relaxed text-slate-800' }, rq.explain)
            )
          ),
          reviewRevealed && h('div', { className: 'flex gap-2' },
            h('button', {
              type: 'button',
              onClick: stillTough,
              className: 'transition-colors flex-1 py-2.5 rounded-xl font-bold text-red-700 bg-red-50 hover:bg-red-100 border-2 border-red-200 focus:ring-2 focus:ring-red-500 focus:outline-none'
            }, t('stem.allobotsage.still_tough_keep_in_queue', 'Still tough — keep in queue')),
            h('button', {
              type: 'button',
              onClick: gotIt,
              className: 'transition-colors flex-1 py-2.5 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-300 focus:outline-none'
            }, t('stem.allobotsage.got_it_now', 'Got it now ✓'))
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
        var dashStats = questionStatsMap;
        var totalAttempts = 0, totalCorrect = 0, totalCrits = 0;
        Object.keys(dashStats).forEach(function(k) {
          var st0 = dashStats[k];
          if (!st0 || typeof st0 !== 'object') return;
          totalAttempts += safeNum(st0.attempts, 0);
          totalCorrect += safeNum(st0.correctCount, 0);
          if (st0.lastResult === 'crit') totalCrits++;
        });
        var accuracyPct = totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts * 100) : 0;
        var critPct = totalCasts > 0 ? Math.round(critCasts / totalCasts * 100) : 0;

        var calData = { high: { right: 0, total: 0 }, med: { right: 0, total: 0 }, low: { right: 0, total: 0 } };
        Object.keys(dashStats).forEach(function(k) {
          var st = dashStats[k];
          if (!st || typeof st !== 'object' || !st.lastConfidence || !calData[st.lastConfidence]) return;
          var wasRight = st.lastResult === 'hit' || st.lastResult === 'crit';
          calData[st.lastConfidence].total++;
          if (wasRight) calData[st.lastConfidence].right++;
        });

        var sourceTally = {};
        SPELLBOOK.forEach(function(sp) {
          if (!sourceTally[sp.sourceTool]) sourceTally[sp.sourceTool] = { label: sp.sourceLabel, icon: sp.icon, unlocked: 0, total: 0, casts: 0 };
          sourceTally[sp.sourceTool].total++;
          if (currentlyUnlocked.indexOf(sp.id) !== -1) sourceTally[sp.sourceTool].unlocked++;
          sourceTally[sp.sourceTool].casts += safeNum(castCountsMap[sp.id], 0);
        });

        var spellAccuracy = [];
        SPELLBOOK.forEach(function(sp) {
          if (currentlyUnlocked.indexOf(sp.id) === -1) return;
          var bank = getMergedBank(sp, aiChallengeCache, offlineChallengeCache);
          var attempts = 0, correct = 0;
          bank.forEach(function(qq) {
            var st = dashStats[qq.prompt];
            if (st) { attempts += safeNum(st.attempts, 0); correct += safeNum(st.correctCount, 0); }
          });
          if (attempts >= 3) {
            spellAccuracy.push({ spell: sp, rate: correct / attempts, attempts: attempts });
          }
        });
        spellAccuracy.sort(function(a, b) { return a.rate - b.rate; });
        var weakest = spellAccuracy.slice(0, 3);
        var strongest = spellAccuracy.slice().reverse().slice(0, 3);
        var estMinutes = Math.round(totalCasts * 25 / 60);

        var sectorsClearedMap = sectorsClearedMapAll;
        var bossesDefeatedMap = bossesDefeatedMapAll;
        var bossesAll = ENEMIES.filter(function(e) { return e.boss; });

        function dashBack() { sfxClick(); updKey('phase', 'hub'); }

        return h('div', { className: 'abs-workbench max-w-4xl mx-auto p-4 md:p-6' + (reduceMotion ? '' : ' abs-fade'), 'data-abs-hc': isContrast ? '1' : '0', 'data-abs-dark': isDark ? '1' : '0', 'data-abs-rm': reduceMotion ? '1' : '0' },
          h('div', { className: 'flex items-center gap-3 mb-4' },
            backBtn(dashBack, t('stem.allobotsage.back_to_spellforge_btn', 'Back to Spellforge')),
            h('div', { className: 'flex-1' }),
            h('div', { className: 'text-[0.625rem] text-slate-600 font-semibold uppercase tracking-wider' + onHostInk }, t('stem.allobotsage.your_progress_2', 'Your Progress'))
          ),
          // Headline + AlloBot
          h('div', { className: 'rounded-2xl p-4 md:p-5 mb-4', style: { background: 'linear-gradient(135deg, #0c4a6e 0%, #0ea5e9 100%)', color: 'white' } },
            h('div', { className: 'flex items-center gap-4' },
              h('div', { className: 'text-5xl' }, '📊'),
              h('div', { className: 'flex-1' },
                h('h1', { className: 'text-xl md:text-2xl font-bold' }, t('stem.allobotsage.your_progress_3', 'Your Progress')),
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
              h('div', { className: 'text-[0.5625rem] font-bold text-emerald-700 uppercase tracking-wider' }, t('stem.allobotsage.accuracy_2', 'Accuracy')),
              h('div', { className: 'text-2xl font-bold text-emerald-600 mt-1' }, accuracyPct + '%'),
              h('div', { className: 'text-[0.5625rem] text-slate-400 mt-0.5' }, totalCorrect + '/' + totalAttempts + ' correct')
            ),
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-amber-200 text-center' },
              h('div', { className: 'text-[0.5625rem] font-bold text-amber-700 uppercase tracking-wider' }, t('stem.allobotsage.crit_rate', 'Crit Rate')),
              h('div', { className: 'text-2xl font-bold text-amber-600 mt-1' }, critPct + '%'),
              h('div', { className: 'text-[0.5625rem] text-slate-400 mt-0.5' }, (d.critCasts || 0) + ' crits')
            ),
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-violet-200 text-center' },
              h('div', { className: 'text-[0.5625rem] font-bold text-violet-700 uppercase tracking-wider' }, t('stem.allobotsage.spells_unlocked', 'Spells Unlocked')),
              h('div', { className: 'text-2xl font-bold text-violet-600 mt-1' }, currentlyUnlocked.length + '/' + SPELLBOOK.length),
              h('div', { className: 'text-[0.5625rem] text-slate-400 mt-0.5' }, Math.round(currentlyUnlocked.length / SPELLBOOK.length * 100) + '% complete')
            ),
            h('div', { className: 'p-3 rounded-xl bg-white border-2 border-rose-200 text-center' },
              h('div', { className: 'text-[0.5625rem] font-bold text-rose-700 uppercase tracking-wider' }, t('stem.allobotsage.interrupts', 'Interrupts')),
              h('div', { className: 'text-2xl font-bold text-rose-600 mt-1' }, ((typeof d.interruptCount === 'number' && isFinite(d.interruptCount)) ? d.interruptCount : 0)),
              h('div', { className: 'text-[0.5625rem] text-slate-400 mt-0.5' }, t('stem.allobotsage.boss_specials_blocked', 'boss specials blocked'))
            )
          ),
          // Sectors + bosses progress
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-4' },
            // Sectors
            h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
              h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.allobotsage.sectors_cleared', '🌌 Sectors Cleared')),
              h('div', { className: 'space-y-1' },
                SECTORS.map(function(sec) {
                  var cleared = !!sectorsClearedMap[sec.id];
                  var unlocked = (d.expeditionsCompleted || 0) >= sec.unlockAt;
                  return h('div', {
                    key: 'dash-sec-' + sec.id,
                    className: 'flex items-center gap-2 p-2 rounded-lg text-[0.6875rem] ' + (cleared ? 'bg-emerald-50 border border-emerald-200' : unlocked ? 'bg-slate-50 border border-slate-200' : 'bg-slate-50 border border-slate-200 opacity-50')
                  },
                    h('span', { className: 'text-lg' }, cleared ? '✅' : unlocked ? '○' : '🔒'),
                    h('span', { className: 'font-semibold flex-1' }, sec.name),
                    h('span', { className: 'text-[0.625rem] text-slate-400' },
                      cleared ? 'Cleared' : unlocked ? 'Available' : 'Unlock at ' + sec.unlockAt + ' expeditions'
                    )
                  );
                })
              )
            ),
            // Bosses
            h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3' },
              h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-2' }, '💀 Bosses Defeated (' + Object.keys(bossesDefeatedMap).length + '/' + bossesAll.length + ')'),
              h('div', { className: 'grid grid-cols-3 gap-1' },
                bossesAll.map(function(b) {
                  var defeated = !!bossesDefeatedMap[b.id];
                  return h('div', {
                    key: 'dash-boss-' + b.id,
                    className: 'flex flex-col items-center p-1.5 rounded-lg text-center text-[0.5625rem] ' + (defeated ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200 opacity-60'),
                    title: defeated
                      ? t('stem.allobotsage.title_boss_defeated', '{name} (defeated)').replace('{name}', b.name)
                      : t('stem.allobotsage.title_boss_undefeated', '{name} (not yet defeated)').replace('{name}', b.name)
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
              h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-emerald-700 mb-2' }, t('stem.allobotsage.top_spells', '💪 Top Spells')),
              strongest.length === 0
                ? h('div', { className: 'text-[0.6875rem] text-slate-500 italic' }, t('stem.allobotsage.cast_each_spell_at_least_3_times_to_se', 'Cast each spell at least 3 times to see your strongest.'))
                : h('div', { className: 'space-y-1' },
                    strongest.map(function(item) {
                      return h('div', { key: 'top-' + item.spell.id, className: 'flex items-center gap-2 text-[0.6875rem] p-1.5 rounded-lg bg-white border border-emerald-200' },
                        h('span', { className: 'text-base' }, item.spell.icon),
                        h('span', { className: 'flex-1 font-semibold', style: { color: item.spell.color } }, item.spell.name),
                        h('span', { className: 'font-bold text-emerald-700' }, Math.round(item.rate * 100) + '%'),
                        h('span', { className: 'text-[0.5625rem] text-slate-400' }, '(' + item.attempts + ')')
                      );
                    })
                  )
            ),
            h('section', { className: 'rounded-xl border border-rose-200 bg-rose-50 p-3' },
              h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-rose-700 mb-2' }, t('stem.allobotsage.spells_to_strengthen', '🎯 Spells to Strengthen')),
              weakest.length === 0
                ? h('div', { className: 'text-[0.6875rem] text-slate-500 italic' }, t('stem.allobotsage.no_weak_spots_flagged_yet_keep_casting', 'No weak spots flagged yet. Keep casting!'))
                : h('div', { className: 'space-y-1' },
                    weakest.map(function(item) {
                      return h('button', {
                        type: 'button',
                        key: 'weak-' + item.spell.id,
                        onClick: function() { sfxClick(); updSage({ phase: 'practice', practiceSpellId: item.spell.id, practiceQuestion: null, practiceSession: { correct: 0, attempted: 0 } }); },
                        className: 'w-full flex items-center gap-2 text-[0.6875rem] p-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 focus:ring-2 focus:ring-rose-400 focus:outline-none transition text-left',
                        'aria-label': t('stem.allobotsage.aria_practice_in_study_hall', 'Practice {name} in Study Hall').replace('{name}', item.spell.name)
                      },
                        h('span', { className: 'text-base' }, item.spell.icon),
                        h('span', { className: 'flex-1 font-semibold', style: { color: item.spell.color } }, item.spell.name),
                        h('span', { className: 'font-bold text-rose-700' }, Math.round(item.rate * 100) + '%'),
                        h('span', { className: 'text-[0.5625rem] text-rose-600 font-bold' }, t('stem.allobotsage.drill', 'Drill →'))
                      );
                    })
                  )
            )
          ),
          // Calibration health (only if any confidence levels logged)
          (calData.high.total + calData.med.total + calData.low.total) > 0 && h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3 mb-4' },
            h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.allobotsage.confidence_calibration_health', '🧠 Confidence Calibration Health')),
            h('p', { className: 'text-[0.625rem] text-slate-500 mb-2 italic' }, t('stem.allobotsage.when_you_say_you_know_it_and_you_do_th', 'When you say you "know it" and you do — that\'s calibration. Mismatch (over/under-confidence) is the hidden cost in learning.')),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              [
                { level: 'high', icon: '🔥', label: t('stem.allobotsage.knew_it_3', 'Knew it') },
                { level: 'med',  icon: '🤔', label: t('stem.allobotsage.pretty_sure_4', 'Pretty sure') },
                { level: 'low',  icon: '🤷', label: t('stem.allobotsage.guessing_4', 'Guessing') }
              ].map(function(opt) {
                var c = calData[opt.level];
                if (c.total === 0) return h('div', { key: 'cd-' + opt.level, className: 'p-2 rounded-lg bg-slate-50 text-center text-[0.625rem] text-slate-500' },
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
                  className: 'p-2 rounded-lg text-center text-[0.625rem] border ' + (calNote === 'overconfident' ? 'bg-amber-50 border-amber-200' : calNote === 'underconfident' ? 'bg-sky-50 border-sky-200' : 'bg-emerald-50 border-emerald-200')
                },
                  h('div', { className: 'font-bold' }, opt.icon + ' ' + opt.label),
                  h('div', { className: 'text-base font-bold mt-1' }, pct + '%'),
                  h('div', { className: 'text-[0.5625rem] text-slate-400' }, c.right + '/' + c.total),
                  calNote && h('div', { className: 'text-[0.5625rem] italic mt-0.5 ' + (calNote === 'overconfident' ? 'text-amber-700' : calNote === 'underconfident' ? 'text-sky-700' : 'text-emerald-700') }, calNote)
                );
              })
            )
          ),
          // Source-tool mastery domains
          h('section', { className: 'rounded-xl border border-slate-200 bg-white p-3 mb-4' },
            h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 mb-2' }, t('stem.allobotsage.source_tool_mastery', '🌐 Source-Tool Mastery')),
            h('div', { className: 'space-y-1' },
              Object.keys(sourceTally).map(function(k) {
                var tallyItem = sourceTally[k];
                var pct = tallyItem.total > 0 ? Math.round(tallyItem.unlocked / tallyItem.total * 100) : 0;
                return h('div', { key: 'st-' + k, className: 'flex items-center gap-2 text-[0.6875rem] p-1.5 rounded-lg bg-slate-50 border border-slate-200' },
                  h('span', { className: 'text-base' }, tallyItem.icon),
                  h('span', { className: 'flex-1 font-semibold text-slate-700' }, tallyItem.label),
                  h('span', { className: 'text-[0.625rem] text-slate-500' }, tallyItem.unlocked + '/' + tallyItem.total + ' spells · ' + tallyItem.casts + ' cast' + (tallyItem.casts !== 1 ? 's' : '')),
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
            h('h2', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-sky-700 mb-2' }, t('stem.allobotsage.reflection_journal', '📝 Reflection Journal')),
            (function() {
              var reflections = Array.isArray(d.reflections) ? d.reflections : [];
              if (reflections.length === 0) {
                return h('p', { className: 'text-[0.6875rem] text-sky-700 italic' },
                  t('stem.allobotsage.no_reflections_saved_yet_after_each_ex', 'No reflections saved yet. After each expedition, write one thing you noticed or learned. Future you will thank present you.')
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
                  return h('div', { key: 'refl-' + idx, className: 'p-2 rounded-lg bg-white border border-sky-200 text-[0.6875rem]' },
                    h('p', { className: 'text-slate-800 leading-snug mb-1' }, '"' + r.text + '"'),
                    h('div', { className: 'text-[0.5625rem] text-sky-600 flex items-center gap-2' },
                      h('span', null, when),
                      r.sectorName && h('span', null, '· ' + r.sectorName),
                      r.difficulty && h('span', null, '· ' + r.difficulty),
                      r.result === 'victory' && h('span', null, t('stem.allobotsage.victory', '· ✅ victory')),
                      r.result === 'defeat' && h('span', null, t('stem.allobotsage.fell', '· 💥 fell'))
                    )
                  );
                })
              );
            })()
          )
        );
      }

      // Fallback
      return h('div', { className: 'text-center p-6 text-slate-600 text-sm' }, t('stem.allobotsage.loading_allobot_sage', 'Loading AlloBot Sage...'));
    }
  });

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_allobotsage.js');
})();

} // end dedup guard
