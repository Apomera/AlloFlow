// ============================================================
// stem_tool_gamestudio.js — Game Design Studio (STEAM Lab)
// Standalone CDN plugin — extracted & enhanced
// ============================================================

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

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  // Contrast theme: hovered buttons, owned by this tool (allo-gamestudio-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-gamestudio-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-gamestudio-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"gameStudio\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"gameStudio\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"gameStudio\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}.theme-contrast [data-stem-tool-shell=\"gameStudio\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h):is([aria-label],[title]):not(:has(*)){text-shadow:0 0 1px #000,0 0 1px #000,0 0 1px #000!important}";
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();
  // WCAG 1.4.3 high contrast: the pale rose header goes black
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-gamestudio-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-gamestudio-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"gameStudio\"] [style*=\"gradient(\"][style*=\"rgb(255, 241, 242)\"]:not(:empty):not(svg,canvas,video,iframe,object){background:#000!important}";
    document.head.appendChild(st);
  })();
  // Studio workbench visual polish + reduced-motion + contrast parity
  (function() {
    if (typeof document === 'undefined' || !document.head || typeof document.getElementById !== 'function' || document.getElementById('allo-gamestudio-studio-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-gamestudio-studio-css';
    st.textContent = [
      '#allo-game-studio .gs-panel { box-shadow: 0 6px 18px -10px rgba(136,19,55,0.18); transition: border-color 0.15s ease, box-shadow 0.15s ease; }',
      '#allo-game-studio .gs-card-hover { transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease; }',
      '#allo-game-studio .gs-card-hover:hover { transform: translateY(-1px); box-shadow: 0 8px 18px -10px rgba(136,19,55,0.28); }',
      '#allo-game-studio button:focus-visible, #allo-game-studio select:focus-visible, #allo-game-studio input:focus-visible, #allo-game-studio textarea:focus-visible { outline: 3px solid #be123c !important; outline-offset: 2px !important; }',
      '@keyframes gs-halo-pulse { 0%, 100% { filter: drop-shadow(0 2px 3px rgba(2,6,23,0.75)) drop-shadow(0 0 4px rgba(251,191,36,0.55)); } 50% { filter: drop-shadow(0 2px 3px rgba(2,6,23,0.75)) drop-shadow(0 0 9px rgba(251,191,36,0.9)); } }',
      '@keyframes gs-cursor-pulse { 0%, 100% { box-shadow: inset 0 0 0 2px rgba(251,191,36,0.92), 0 0 0 1px rgba(251,191,36,0.35); } 50% { box-shadow: inset 0 0 0 2.5px rgba(253,224,71,1), 0 0 10px rgba(251,191,36,0.65); } }',
      '@keyframes gs-player-aura { 0%, 100% { transform: scale(1); filter: drop-shadow(0 2px 3px rgba(2,6,23,0.85)) drop-shadow(0 0 5px rgba(196,181,253,0.78)); } 50% { transform: scale(1.06); filter: drop-shadow(0 3px 4px rgba(2,6,23,0.85)) drop-shadow(0 0 10px rgba(167,139,250,0.98)); } }',
      '@keyframes gs-portal-pulse { 0%, 100% { transform: scale(0.95) rotate(-4deg); opacity: 0.9; } 50% { transform: scale(1.08) rotate(4deg); opacity: 1; } }',
      '@keyframes gs-lava-shimmer { 0%, 100% { opacity: 0.9; } 50% { opacity: 1; filter: brightness(1.12); } }',
      '@keyframes gs-sprite-bob { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-1.2px); } }',
      '@keyframes gs-loop-flow { to { stroke-dashoffset: -14; } }',
      '@keyframes gs-curve-beacon { 0% { opacity: 0.72; transform: scale(0.9); } 100% { opacity: 0.05; transform: scale(2.15); } }',
      '#allo-game-studio .gs-glow-collect { animation: gs-halo-pulse 2.2s ease-in-out infinite; }',
      '#allo-game-studio .gs-tile-cell { transition: transform 0.1s ease, filter 0.12s ease; }',
      // The app makes every [role=button] 44 px tall on touch screens; that stretched map squares and sprite pixels into tall bars. They stay square.
      '#allo-game-studio [data-gs-cell], #allo-game-studio [data-gs-px] { min-height: 0 !important; }',
      '#allo-game-studio .gs-tile-cell:hover { filter: brightness(1.12); z-index: 2; }',
      '#allo-game-studio .gs-tile-cell-cur { position: relative; z-index: 3; animation: gs-cursor-pulse 1.5s ease-in-out infinite; }',
      '#allo-game-studio .gs-pixel-cell-cur { position: relative; z-index: 3; outline: 2px solid #be123c; outline-offset: -2px; animation: gs-cursor-pulse 1.6s ease-in-out infinite; }',
      '#allo-game-studio .gs-player-aura { display: inline-block; animation: gs-player-aura 1.9s ease-in-out infinite; }',
      '#allo-game-studio .gs-portal-pulse { display: inline-block; animation: gs-portal-pulse 2.4s ease-in-out infinite; }',
      '#allo-game-studio .gs-lava-shimmer { animation: gs-lava-shimmer 2.1s ease-in-out infinite; }',
      '#allo-game-studio .gs-sprite-bob { animation: gs-sprite-bob 2.2s ease-in-out infinite; }',
      '#allo-game-studio .gs-loop-flow { animation: gs-loop-flow 1.4s linear infinite; }',
      '#allo-game-studio .gs-curve-beacon { transform-box: fill-box; transform-origin: center; animation: gs-curve-beacon 2.2s ease-out infinite; }',
      '.theme-contrast #allo-game-studio .gs-hero, .theme-contrast #allo-game-studio .gs-panel, .theme-contrast #allo-game-studio .gs-bezel { background: #000000 !important; color: #ffffff !important; border-color: #fbbf24 !important; box-shadow: none !important; }',
      '.theme-contrast #allo-game-studio .gs-glow-collect, .theme-contrast #allo-game-studio .gs-player-aura, .theme-contrast #allo-game-studio .gs-portal-pulse, .theme-contrast #allo-game-studio .gs-lava-shimmer, .theme-contrast #allo-game-studio .gs-sprite-bob, .theme-contrast #allo-game-studio .gs-loop-flow, .theme-contrast #allo-game-studio .gs-curve-beacon, .theme-contrast #allo-game-studio .gs-tile-cell-cur, .theme-contrast #allo-game-studio .gs-pixel-cell-cur { animation: none !important; filter: none !important; }',
      '.theme-contrast #allo-game-studio .gs-tile-cell-cur, .theme-contrast #allo-game-studio .gs-pixel-cell-cur { outline: 2px solid #ffff00 !important; outline-offset: -2px !important; box-shadow: none !important; }',
      '.theme-contrast #allo-game-studio .gs-fx-canvas { display: none !important; }',
      '.theme-contrast #allo-game-studio .gs-curve-beacon { opacity: 0 !important; }',
      // High contrast: every map square and sprite pixel gets a black edge on a yellow grid, so each one stands out whatever its color.
      '.theme-contrast #allo-game-studio .gs-paint-grid { background: #ffff00 !important; }',
      '.theme-contrast #allo-game-studio [data-gs-cell], .theme-contrast #allo-game-studio [data-gs-px] { border: 1px solid #000000 !important; }',
      // The app inks every span yellow there; danger counts sit on light tiles, so give them a black chip.
      '.theme-contrast #allo-game-studio .gs-danger-num { background: #000000 !important; color: #ffff00 !important; padding: 0 3px; border-radius: 3px; }',
      // Buttons turn black there, so the color swatch shows on its child, inset to leave room for the selected ring.
      '.theme-contrast #allo-game-studio .gs-swatch-fill { inset: 4px !important; }',
      '.theme-contrast #allo-game-studio .gs-chart-ink { fill: #ffff00 !important; }',
      '.theme-contrast #allo-game-studio details > summary { border: 2px solid #ffff00 !important; border-radius: 8px; padding-left: 10px !important; padding-right: 10px !important; }',
      '.theme-contrast #allo-game-studio button:focus-visible { outline-color: #ffff00 !important; }',
      // Light and dark (light card) themes: placeholders 4.7:1 on white. The contrast theme keeps the app's own.
      '#allo-game-studio:not(.theme-contrast *) input::placeholder, #allo-game-studio:not(.theme-contrast *) textarea::placeholder { color: #64748b; }',
      '@media (prefers-reduced-motion: reduce) { #allo-game-studio .gs-card-hover, #allo-game-studio .gs-panel, #allo-game-studio .gs-tile-cell { transition: none !important; transform: none !important; } #allo-game-studio .gs-glow-collect, #allo-game-studio .gs-player-aura, #allo-game-studio .gs-portal-pulse, #allo-game-studio .gs-lava-shimmer, #allo-game-studio .gs-sprite-bob, #allo-game-studio .gs-loop-flow, #allo-game-studio .gs-curve-beacon, #allo-game-studio .gs-tile-cell-cur, #allo-game-studio .gs-pixel-cell-cur { animation: none !important; } #allo-game-studio .gs-curve-beacon { opacity: 0.25 !important; transform: none !important; } #allo-game-studio .gs-fx-canvas { display: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _gsAC = null;
  function getGsAC() { if (!_gsAC) { try { _gsAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_gsAC && _gsAC.state === "suspended") { try { _gsAC.resume(); } catch(e) {} } return _gsAC; }
  function gsTone(f,d,tp,v) { var ac = getGsAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxGsClick() { gsTone(600, 0.03, "sine", 0.04); }
  function sfxGsSuccess() { gsTone(523, 0.08, "sine", 0.07); setTimeout(function() { gsTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { gsTone(784, 0.1, "sine", 0.08); }, 140); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-gamestudio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-gamestudio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ============================================================
  // CONSTANTS
  // ============================================================

  var TILE_PALETTE = [
    { id: 'empty', label: 'Empty', emoji: '', color: '#f8fafc' },
    { id: 'grass', label: 'Grass', emoji: '\uD83D\uDFE9', color: '#22c55e' },
    { id: 'water', label: 'Water', emoji: '\uD83D\uDFE6', color: '#3b82f6' },
    { id: 'wall', label: 'Wall', emoji: '\u2B1B', color: '#374151' },
    { id: 'lava', label: 'Lava', emoji: '\uD83D\uDD25', color: '#ef4444' },
    { id: 'ice', label: 'Ice', emoji: '\uD83E\uDDCA', color: '#bae6fd' },
    { id: 'sand', label: 'Sand', emoji: '\uD83D\uDFE8', color: '#fcd34d' },
    { id: 'path', label: 'Path', emoji: '\uD83D\uDFEB', color: '#a16207' },
    { id: 'door', label: 'Door', emoji: '\uD83D\uDEAA', color: '#92400e' },
    { id: 'key', label: 'Key', emoji: '\uD83D\uDD11', color: '#eab308' },
    { id: 'coin', label: 'Coin', emoji: '\uD83E\uDE99', color: '#fbbf24' },
    { id: 'gem', label: 'Gem', emoji: '\uD83D\uDC8E', color: '#06b6d4' },
    { id: 'flag', label: 'Flag', emoji: '\uD83D\uDEA9', color: '#16a34a' },
    { id: 'spikes', label: 'Spikes', emoji: '\u26A0\uFE0F', color: '#dc2626' },
    { id: 'heart', label: 'Heart', emoji: '\u2764\uFE0F', color: '#ec4899' },
    { id: 'portal', label: 'Portal', emoji: '\uD83C\uDF00', color: '#7c3aed' },
    { id: 'platform', label: 'Platform', emoji: '\u2796', color: 'var(--allo-stem-text-soft, #94a3b8)' },
    { id: 'player', label: 'Player', emoji: '\uD83E\uDDD1', color: '#8b5cf6' },
    { id: 'enemy', label: 'Enemy', emoji: '\uD83D\uDC7E', color: '#f43f5e' },
    { id: 'npc', label: 'NPC', emoji: '\uD83E\uDDD9', color: '#6366f1' },
    { id: 'treasure', label: 'Treasure', emoji: '\uD83D\uDCB0', color: '#0e7490' },
    { id: 'crate', label: 'Crate', emoji: '\uD83D\uDCE6', color: '#78350f' },
    { id: 'target', label: 'Target', emoji: '\uD83C\uDFAF', color: '#ede9fe' }
  ];

  var TILE_MAP = {};
  TILE_PALETTE.forEach(function(t) { TILE_MAP[t.id] = t; });

  var WALKABLE = { empty: 1, grass: 1, path: 1, sand: 1, ice: 1, coin: 1, gem: 1, key: 1, flag: 1, heart: 1, portal: 1, treasure: 1, door: 1, player: 1 };

  var SPRITE_PRESETS = [
    { id: 'hero', name: 'Hero', color: '#8b5cf6', pixels: { '7,2':'#8b5cf6','8,2':'#8b5cf6','6,3':'#8b5cf6','7,3':'#fbbf24','8,3':'#fbbf24','9,3':'#8b5cf6','6,4':'#8b5cf6','7,4':'#fff','8,4':'#fff','9,4':'#8b5cf6','7,5':'#8b5cf6','8,5':'#8b5cf6','5,6':'#3b82f6','6,6':'#3b82f6','7,6':'#3b82f6','8,6':'#3b82f6','9,6':'#3b82f6','10,6':'#3b82f6','6,7':'#3b82f6','7,7':'#3b82f6','8,7':'#3b82f6','9,7':'#3b82f6','7,8':'#3b82f6','8,8':'#3b82f6','6,9':'#374151','7,9':'#374151','8,9':'#374151','9,9':'#374151','6,10':'#374151','7,10':'#374151','8,10':'#374151','9,10':'#374151' } },
    { id: 'slime', name: 'Slime', color: '#22c55e', pixels: { '6,6':'#22c55e','7,6':'#22c55e','8,6':'#22c55e','9,6':'#22c55e','5,7':'#22c55e','6,7':'#22c55e','7,7':'#fff','8,7':'#fff','9,7':'#22c55e','10,7':'#22c55e','5,8':'#22c55e','6,8':'#22c55e','7,8':'#22c55e','8,8':'#22c55e','9,8':'#22c55e','10,8':'#22c55e','6,9':'#22c55e','7,9':'#22c55e','8,9':'#22c55e','9,9':'#22c55e' } },
    { id: 'chest', name: 'Chest', color: '#92400e', pixels: { '5,6':'#92400e','6,6':'#92400e','7,6':'#92400e','8,6':'#92400e','9,6':'#92400e','10,6':'#92400e','5,7':'#92400e','6,7':'#fbbf24','7,7':'#fbbf24','8,7':'#fbbf24','9,7':'#fbbf24','10,7':'#92400e','5,8':'#92400e','6,8':'#92400e','7,8':'#eab308','8,8':'#eab308','9,8':'#92400e','10,8':'#92400e','5,9':'#a16207','6,9':'#a16207','7,9':'#a16207','8,9':'#a16207','9,9':'#a16207','10,9':'#a16207' } },
    { id: 'ghost', name: 'Ghost', color: '#a78bfa', pixels: { '6,3':'#a78bfa','7,3':'#a78bfa','8,3':'#a78bfa','9,3':'#a78bfa','5,4':'#a78bfa','6,4':'#a78bfa','7,4':'#fff','8,4':'#fff','9,4':'#a78bfa','10,4':'#a78bfa','5,5':'#a78bfa','6,5':'#a78bfa','7,5':'#312e81','8,5':'#312e81','9,5':'#a78bfa','10,5':'#a78bfa','5,6':'#a78bfa','6,6':'#a78bfa','7,6':'#a78bfa','8,6':'#a78bfa','9,6':'#a78bfa','10,6':'#a78bfa','5,7':'#a78bfa','6,7':'#a78bfa','7,7':'#a78bfa','8,7':'#a78bfa','9,7':'#a78bfa','10,7':'#a78bfa','5,8':'#a78bfa','7,8':'#a78bfa','9,8':'#a78bfa' } },
    { id: 'dragon', name: 'Dragon', color: '#ef4444', pixels: { '8,2':'#ef4444','9,2':'#ef4444','7,3':'#ef4444','8,3':'#fbbf24','9,3':'#ef4444','10,3':'#ef4444','6,4':'#ef4444','7,4':'#ef4444','8,4':'#fff','9,4':'#ef4444','5,5':'#ef4444','6,5':'#ef4444','7,5':'#ef4444','8,5':'#ef4444','9,5':'#ef4444','10,5':'#ef4444','4,6':'#ef4444','5,6':'#ef4444','6,6':'#ef4444','7,6':'#ef4444','8,6':'#ef4444','9,6':'#ef4444','10,6':'#ef4444','11,6':'#ef4444','5,7':'#ef4444','6,7':'#ef4444','8,7':'#ef4444','10,7':'#ef4444','5,8':'#b91c1c','6,8':'#b91c1c','8,8':'#b91c1c','10,8':'#b91c1c' } },
    { id: 'coin_sprite', name: 'Coin', color: '#eab308', pixels: { '6,4':'#eab308','7,4':'#eab308','8,4':'#eab308','9,4':'#eab308','5,5':'#eab308','6,5':'#fbbf24','7,5':'#fbbf24','8,5':'#fbbf24','9,5':'#eab308','10,5':'#eab308','5,6':'#eab308','6,6':'#fbbf24','7,6':'#fde68a','8,6':'#fbbf24','9,6':'#eab308','10,6':'#eab308','5,7':'#eab308','6,7':'#fbbf24','7,7':'#fbbf24','8,7':'#fbbf24','9,7':'#eab308','10,7':'#eab308','6,8':'#eab308','7,8':'#eab308','8,8':'#eab308','9,8':'#eab308' } }
  ];

  // ============================================================
  // GAME DESIGN LESSONS
  // ============================================================

  var LESSONS = [
    {
      id: 'gameloop', title: 'The Game Loop', icon: '\uD83D\uDD04',
      desc: 'How every game processes a single frame',
      concept: 'Every game runs a continuous cycle called the Game Loop with three phases:\n\n' +
        '1. INPUT \u2014 Read what the player is doing (pressing keys, clicking)\n' +
        '2. UPDATE \u2014 Change the game world (move characters, check collisions, update scores)\n' +
        '3. RENDER \u2014 Draw everything to the screen\n\n' +
        'This cycle repeats many times per second to create the illusion of movement. In Game Design Studio, each arrow key press triggers all three phases: we read your key (input), check collisions and move your player (update), then redraw the grid (render).',
      funFact: 'A game that runs at 60 frames per second (60 FPS) goes around its game loop 60 times every second. That leaves only about 16.7 milliseconds for each Input \u2192 Update \u2192 Render cycle!',
      realGame: 'In Super Mario Bros., the game loop reads if Mario is pressing jump (input), applies gravity and checks platform collisions (update), then draws Mario at his new position (render).',
      quiz: {
        question: 'A player presses the jump button and their character rises up on screen. What is the correct order of phases?',
        options: ['Render \u2192 Input \u2192 Update', 'Update \u2192 Render \u2192 Input', 'Input \u2192 Update \u2192 Render', 'Input \u2192 Render \u2192 Update'],
        correct: 2,
        why: [
          'Render draws the screen. It cannot go first, because nothing has changed yet to draw.',
          'Update needs to know what the player pressed, so Input has to come before it.',
          '',
          'If you draw before you update, the screen shows the old spot, one frame late.'
        ],
        explanation: 'First we READ the button press (Input), then CALCULATE the new position using physics (Update), then DRAW the character higher on screen (Render).'
      }
    },
    {
      id: 'leveldesign', title: 'Level Design 101', icon: '\uD83D\uDDFA\uFE0F',
      desc: 'Pacing, flow, and teaching through play',
      concept: 'Great levels teach players without words. Key principles:\n\n' +
        '\u2022 SAFE ZONE \u2014 Start players in a safe area so they can learn controls\n' +
        '\u2022 INTRODUCE \u2192 PRACTICE \u2192 CHALLENGE \u2014 Show a new mechanic in a safe way, let them practice, then test them\n' +
        '\u2022 PACING \u2014 Alternate between intense and calm sections\n' +
        '\u2022 BREADCRUMBS \u2014 Use coins or visual cues to guide players along the intended path\n' +
        '\u2022 RISK vs REWARD \u2014 Place valuable items near dangers to create interesting choices',
      // https://www.nintendolife.com/news/2012/04/super_mario_3d_land_director_shares_level_design_inspirations
      funFact: 'The director of Super Mario 3D Land has said its levels follow "kishotenketsu" (introduction, development, twist, conclusion), a four-part way of telling a story.',
      // World 1-1 built to teach without instructions: https://www.gamedeveloper.com/design/how-miyamoto-built-i-super-mario-bros-i-legendary-world-1-1
      realGame: 'World 1-1 of Super Mario Bros. teaches you to jump, collect coins, hit blocks, and avoid enemies \u2014 all without a single word of instructions.',
      quiz: {
        question: 'You want to teach players a new "ice sliding" mechanic. What is the best approach?',
        options: [
          'Show a small ice patch somewhere safe, then add danger later',
          'Put the ice right next to lava so players learn the danger fast',
          'Write a long text tutorial that explains how ice works first',
          'Make the whole level ice so players get lots of practice at once'
        ],
        correct: 0,
        why: [
          '',
          'Players have not learned the sliding yet, so they slide into lava and feel cheated.',
          'Most players skip text. Good levels teach by letting you try the idea.',
          'All ice at once is a lot to learn, with no safe place to practice.'
        ],
        explanation: 'Introduce mechanics safely first! A small ice patch with no hazards lets players discover the sliding behavior. Then you can add challenge later once they understand it.'
      }
    },
    {
      id: 'collision', title: 'Collision Detection', icon: '\uD83D\uDCA5',
      desc: 'How games know when objects touch',
      concept: 'Collision detection is how a game checks if two objects are overlapping or touching. Common methods:\n\n' +
        '\u2022 TILE-BASED \u2014 Check if two objects are on the same grid cell (that\'s what we use!)\n' +
        '\u2022 BOUNDING BOX (AABB) \u2014 Draw rectangles around objects, check if rectangles overlap\n' +
        '\u2022 CIRCLE \u2014 Check if the distance between centers is less than the sum of radii\n' +
        '\u2022 PIXEL-PERFECT \u2014 Check actual pixel overlap (expensive but precise)\n\n' +
        'In our Game Studio, when you move your player onto a coin tile, the game detects the collision and triggers the "collect" response.',
      // https://www.gamedeveloper.com/design/passing-through-ghosts-in-pac-man ; https://www.gamedeveloper.com/design/the-pac-man-dossier
      funFact: 'The original Pac-Man used tile-based collision, exactly like our Game Studio. Each character occupied one tile, and the game checked which tile the ghost and Pac-Man were on.',
      realGame: 'In Pac-Man, ghost collision uses the same tile-based approach we use here: if Pac-Man and a ghost are on the same grid cell, it\'s a collision!',
      quiz: {
        question: 'In a tile-based game, how do you check if the player collides with a coin?',
        options: [
          'Measure the pixel distance between them',
          'See if their colors overlap on screen',
          'Wait for the player to press a "collect" button',
          'Check if they occupy the same grid cell'
        ],
        correct: 3,
        why: [
          'That works for smooth movement. On a tile grid each thing is in one cell, so comparing cells is simpler and exact.',
          'Colors are only how things look. The game checks positions, not colors.',
          'A button press is input, not a collision. The game should notice the touch by itself.',
          ''
        ],
        explanation: 'In tile-based games, collision is simple: check if two objects share the same grid cell. If the player moves to a cell containing a coin, that\'s a collision!'
      }
    },
    {
      id: 'enemyai', title: 'Enemy AI Patterns', icon: '\uD83D\uDC7E',
      desc: 'Making enemies feel alive and challenging',
      concept: 'Enemy AI doesn\'t need to be smart \u2014 it needs to be FUN. Common patterns:\n\n' +
        '\u2022 PATROL \u2014 Walk back and forth along a set path (predictable, fair)\n' +
        '\u2022 CHASE \u2014 Move toward the player when they\'re nearby (creates tension)\n' +
        '\u2022 IDLE \u2014 Stand still until triggered (good for ambushes)\n' +
        '\u2022 RANDOM \u2014 Move in random directions (unpredictable, chaotic)\n\n' +
        'The best games mix patterns. In our Game Studio, enemies patrol back and forth. When you\'re close, they chase you!',
      // Ghost targets (Pinky 4 tiles ahead, Clyde retreats inside 8 tiles): https://www.gamedeveloper.com/design/the-pac-man-dossier
      funFact: 'In Pac-Man, each ghost has a unique AI personality: Blinky chases directly, Pinky aims 4 tiles ahead of Pac-Man, Inky uses complex targeting, and Clyde runs away when close!',
      // https://minecraft.wiki/w/Creeper
      realGame: 'Minecraft\'s Creeper uses a simple "chase when close, wander when far" pattern: it wanders around until a player comes within about 16 blocks, then it chases. That simple rule is enough to make it scary!',
      quiz: {
        question: 'Which enemy AI pattern creates the most PREDICTABLE behavior for the player?',
        options: ['Chase (follows player)', 'Patrol (walks back and forth)', 'Random (moves randomly)', 'Swarm (all enemies close in at once)'],
        correct: 1,
        why: [
          'A chaser reacts to you, so its path changes every time you move.',
          '',
          'Random moves cannot be predicted at all. That is the opposite of predictable.',
          'Many enemies closing in at once is hard to read and plan around.'
        ],
        explanation: 'Patrol enemies are the most predictable because they follow a fixed path. Players can learn the pattern and time their moves \u2014 perfect for teaching spatial reasoning!'
      }
    },
    {
      id: 'feedback', title: 'Feedback & Juice', icon: '\u2728',
      desc: 'Making your game feel satisfying and responsive',
      concept: 'Game "juice" is all the small effects that make actions feel satisfying:\n\n' +
        '\u2022 VISUAL \u2014 Screen shake, particle effects, color flashes\n' +
        '\u2022 AUDIO \u2014 Sound effects for every action (collect, jump, hit)\n' +
        '\u2022 NUMERICAL \u2014 Score popups, damage numbers, combo counters\n' +
        '\u2022 HAPTIC \u2014 Controller vibration, screen pulse\n\n' +
        'Good feedback tells the player: "Your action mattered!" Even our simple Game Studio shows toast messages, XP awards, and score changes as feedback.',
      funFact: 'Game studio Vlambeer\'s famous talk "The Art of Screenshake" demonstrates "juice" live \u2014 adding screen shake, particles, and sound to a plain shooter makes it feel much better without changing the gameplay rules at all!',
      // Talk: https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games
      // Coins are worth 200 points in Super Mario Bros.: https://www.mariowiki.com/Point
      realGame: 'When Mario collects a coin, you see it spin upward, hear "bling!", see a +200 score popup, and your coin counter increases. That\'s 4 layers of feedback for one tiny action!',
      quiz: {
        question: 'A player collects a coin but gets no feedback (no sound, no visual, just a silent score increase). What is the likely problem?',
        options: [
          'The game has a bug',
          'This is fine: the score change is enough',
          'The game needs more coins to make up for it',
          'The player may not notice the reward'
        ],
        correct: 3,
        why: [
          'Nothing is broken: the score did go up. The problem is how it feels.',
          'A number changing in a corner is easy to miss. Players need a clear signal.',
          'More coins with no feedback are still easy to miss.',
          ''
        ],
        explanation: 'Without feedback, players don\'t feel rewarded. They might not even notice they collected anything! Every player action should have clear, immediate feedback.'
      }
    },
    {
      id: 'playtesting', title: 'Playtesting & Iteration', icon: '\uD83D\uDD0D',
      desc: 'The secret to making great games',
      concept: 'No game is perfect on the first try. The design cycle is:\n\n' +
        '1. BUILD \u2014 Create a level or feature\n' +
        '2. TEST \u2014 Play it yourself and watch others play\n' +
        '3. OBSERVE \u2014 Note where players get stuck, confused, or bored\n' +
        '4. ITERATE \u2014 Make changes based on what you observed\n' +
        '5. REPEAT \u2014 Go back to step 2!\n\n' +
        'Key questions during playtesting: Where do players die most? Is it too easy or too hard? Do players understand what to do? Is it fun?',
      // https://iwataasks.nintendo.com/interviews/wii/nsmb/2/4 (Mario Club test-plays and debugs Nintendo games)
      funFact: 'Nintendo works with a testing company, Mario Club, whose players test-play games and hunt for bugs while the games are still being made.',
      // https://iwataasks.nintendo.com/interviews/wii/nsmb/2/3 (the team met to watch each other's demo play)
      realGame: 'While making New Super Mario Bros. Wii, the developers held a meeting to watch each other play the game and talk about what they saw.',
      quiz: {
        question: 'You built a level and 5 out of 5 playtesters died at the same spot. What should you do?',
        options: [
          'Make that spot easier or add a hint',
          'Tell the testers to get better at it',
          'Delete that whole part of the level',
          'Add a button that skips the level'
        ],
        correct: 0,
        why: [
          '',
          'If every tester fails in the same place, the level is the problem, not the players.',
          'Deleting it throws the idea away. Tuning it keeps the fun part.',
          'A skip button hides the problem instead of fixing it.'
        ],
        explanation: 'If everyone fails at the same spot, the level needs adjustment \u2014 not the players! Add a visual hint, make the timing more forgiving, or add a safe zone before the challenge.'
      }
    }
  ];

  // ============================================================
  // DESIGN CHALLENGES
  // ============================================================

  function countTile(tiles, id) {
    var c = 0;
    Object.keys(tiles).forEach(function(k) { if (tiles[k] === id) c++; });
    return c;
  }

  function hasTile(tiles, id) { return countTile(tiles, id) >= 1; }

  function hasWallBorder(tiles, w, h) {
    for (var x = 0; x < w; x++) {
      if (tiles[x + ',0'] !== 'wall' || tiles[x + ',' + (h - 1)] !== 'wall') return false;
    }
    for (var y = 0; y < h; y++) {
      if (tiles['0,' + y] !== 'wall' || tiles[(w - 1) + ',' + y] !== 'wall') return false;
    }
    return true;
  }

  // ============================================================
  // GAME ENGINE: one set of rules for Play, "Test my level", the challenges,
  // the Danger Map and the Difficulty Tuner. Pure functions (no React, no DOM),
  // so every number the studio shows about a level comes from here.
  // The design map is never changed by playing: a play "world" keeps the map as
  // a read-only base plus a small list of changes (coins taken, doors opened).
  // ============================================================
  var GS_E = (function() {
    var KNOWN = { empty: 1, grass: 1, water: 1, wall: 1, lava: 1, ice: 1, sand: 1, path: 1, door: 1, key: 1, coin: 1, gem: 1, flag: 1, spikes: 1, heart: 1, portal: 1, platform: 1, player: 1, enemy: 1, npc: 1, treasure: 1, crate: 1, target: 1 };
    // A crate blocks like a wall; in a Puzzle game the player can push it (tryMove).
    var BLOCK = { wall: 1, platform: 1, water: 1, npc: 1, crate: 1 };
    var SOLID = { wall: 1, platform: 1, door: 1 };
    var HURT = { lava: 1, spikes: 1 };
    var POINTS = { coin: 10, gem: 50, treasure: 100 };
    var ENEMY_OK = { empty: 1, grass: 1, path: 1, sand: 1, ice: 1, coin: 1, gem: 1, treasure: 1, key: 1, heart: 1, target: 1 };
    // Squares a pushed crate can slide into.
    var CRATE_OK = { empty: 1, grass: 1, path: 1, sand: 1, target: 1 };
    // What an "Every N moves" player rule can do.
    var TIMER_ACTS = { move: 1, jump: 1, collect: 1, loseLife: 1, gravity: 1, teleport: 1 };
    // "2", "2 moves" or an old "2s" -> 2. 0 means nothing picked yet.
    function timerN(p) { var n = parseFloat(String(p || '')); return isFinite(n) && n > 0 ? Math.max(1, Math.min(9, Math.round(n))) : 0; }
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    var KEY_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    var TOUCH_ACTS = { collect: 1, stop: 1, destroy: 1, teleport: 1, bounce: 1, winGame: 1, loseLife: 1, gravity: 1, jump: 1, push: 1, move: 1 };
    var ENEMY_MODES = { 'toward-player': 1, random: 1, left: 1, right: 1, up: 1, down: 1 };
    var DEF = { lives: 3, chase: 3, jump: 3 };

    function clampInt(v, lo, hi, d) { var n = Math.floor(Number(v)); return isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; }

    // Turn the Events tab rules into what Play runs. Every rule gets a status:
    // runs:true means the engine below acts on it; runs:false carries a reason code.
    function compileRules(events) {
      var out = { touch: {}, keys: {}, gravity: null, enemy: null, timers: [], period: 1, list: [] };
      ['player', 'enemy', 'npc', 'treasure'].forEach(function(sp) {
        var arr = events && Array.isArray(events[sp]) ? events[sp] : [];
        arr.slice(0, 8).forEach(function(r, i) {
          if (!r || typeof r !== 'object') return;
          var trig = String(r.trigger || 'onKey'), tp = String(r.param || ''), act = String(r.action || 'move'), ap = String(r.actionParam || '');
          var info = { id: sp + ':' + i, sprite: sp, index: i, trigger: trig, param: tp, action: act, actionParam: ap, runs: false, why: '' };
          var a = { id: info.id, action: act, param: ap };
          var touchOn = null;
          if (sp === 'player') {
            if (trig === 'onCollide') { if (KNOWN[tp] && tp !== 'player') touchOn = tp; else info.why = 'pick'; }
            else if (trig === 'onTalk') touchOn = 'npc';
            else if (trig === 'onKey') {
              if (!tp) info.why = 'pick';
              else if ((act === 'move' && DIRS[ap]) || act === 'jump') { out.keys[tp] = a; info.runs = true; }
              else info.why = 'keyAct';
            } else if (trig === 'onStart') {
              if (act === 'gravity' && (ap === 'on' || ap === 'off')) { out.gravity = ap === 'on'; info.runs = true; }
              else info.why = 'startAct';
            } else if (trig === 'onTimer') {
              // Play takes turns, so "Every" counts the player's moves.
              var tn = timerN(tp);
              info.every = tn;
              if (!tn) info.why = 'pick';
              else if (TIMER_ACTS[act] && (act !== 'move' || DIRS[ap]) && (act !== 'gravity' || ap === 'on' || ap === 'off')) { out.timers.push({ id: info.id, n: tn, action: act, param: ap }); info.runs = true; }
              else info.why = 'timerAct';
            } else info.why = 'pick';
          } else if (sp === 'enemy') {
            var en = trig === 'onTimer' ? timerN(tp) : 1;
            if (trig === 'onTimer' && !en) info.why = 'pick';
            else if ((trig === 'onStart' || trig === 'onTimer') && ((act === 'move' && ENEMY_MODES[ap]) || act === 'stop')) {
              out.enemy = { id: info.id, mode: act === 'stop' ? 'stop' : ap, every: en }; info.runs = true; info.every = en;
            } else if (trig === 'onCollide' && tp === 'wall' && act === 'bounce') { info.runs = true; info.why = 'builtIn'; }
            else info.why = 'enemyAct';
          } else {
            if (trig === 'onCollide' || trig === 'onTalk') touchOn = sp;
            else info.why = trig === 'onTimer' ? 'timerWho' : 'pick';
          }
          if (touchOn) {
            if (TOUCH_ACTS[act]) { (out.touch[touchOn] = out.touch[touchOn] || []).push(a); info.runs = true; info.touch = touchOn; }
            else info.why = act === 'aiTalk' ? 'ai' : 'touchAct';
          }
          out.list.push(info);
        });
      });
      // Turns until every "Every N moves" rule lines up again (the level check needs it).
      var ns = out.timers.map(function(t) { return t.n; });
      if (out.enemy && out.enemy.every > 1) ns.push(out.enemy.every);
      ns.forEach(function(n) { out.period = out.period * n / gcd(out.period, n); });
      return out;
    }

    function settings(o) {
      o = o || {};
      var rules = compileRules(o.events);
      return {
        puzzle: !!o.puzzle,
        gravity: rules.gravity !== null ? rules.gravity : !!o.gravity,
        lives: clampInt(o.lives, 1, 9, DEF.lives),
        chase: clampInt(o.chase, 0, 8, DEF.chase),
        jump: DEF.jump,
        rules: rules
      };
    }

    function tileAt(w, x, y) {
      var k = x + ',' + y;
      if (Object.prototype.hasOwnProperty.call(w.chg, k)) return w.chg[k];
      return w.base[k] || 'empty';
    }
    function setTile(w, x, y, id) { w.chg[x + ',' + y] = id; }
    function clearTile(w, x, y) { w.chg[x + ',' + y] = (w.under && w.under[x + ',' + y]) || 'empty'; }
    function inB(w, x, y) { return x >= 0 && y >= 0 && x < w.W && y < w.H; }
    function enemyAt(w, x, y) { for (var i = 0; i < w.en.length; i++) if (w.en[i][0] === x && w.en[i][1] === y) return i; return -1; }
    // Puzzle rule: how many target squares have a crate on them.
    function covered(w) { var n = 0, t = w.tg || []; for (var i = 0; i < t.length; i++) if (Object.prototype.hasOwnProperty.call(w.chg, t[i]) && w.chg[t[i]] === 'crate') n++; return n; }
    function goalOpen(w, S) { return !S.puzzle || covered(w) >= (w.tg || []).length; }
    // In a Puzzle game, walking into a crate pushes it one square if that square is free floor.
    function pushCrate(w, nx, ny, dx, dy) {
      var bx = nx + dx, by = ny + dy;
      if (!inB(w, bx, by) || enemyAt(w, bx, by) >= 0 || !CRATE_OK[tileAt(w, bx, by)]) return false;
      var k = nx + ',' + ny, b = w.base[k], bk = bx + ',' + by;
      setTile(w, bx, by, 'crate');
      w.chg[k] = CRATE_OK[b] ? b : ((w.under && w.under[k]) || 'empty');
      // Keep one spelling per layout so the level check does not search the same state twice.
      if (w.base[bk] === 'crate') delete w.chg[bk];
      if (w.chg[k] === (b || 'empty')) delete w.chg[k];
      return true;
    }

    function init(tiles, W, H, o) {
      var S = settings(o);
      var base = {}, en = [], px = -1, py = -1, flags = 0, tg = [];
      var ks = Object.keys(tiles || {}).map(function(k) { var p = String(k).split(','); return [Number(p[0]), Number(p[1]), k]; })
        .filter(function(p) { return Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H; })
        .sort(function(a, b) { return a[1] - b[1] || a[0] - b[0]; });
      // Pieces (player, enemies, pickups, doors) sit on the floor around them, so a
      // square looks and behaves like that floor once the piece is gone.
      var under = {};
      var FLOOR = { grass: 1, path: 1, sand: 1 };
      ks.forEach(function(p) {
        var id = tiles[p[2]];
        if (!(id === 'player' || id === 'enemy' || id === 'door' || id === 'key' || id === 'heart' || id === 'crate' || POINTS[id])) return;
        var cnt = {}, bestF = null;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function(d) { var n = tiles[(p[0] + d[0]) + ',' + (p[1] + d[1])]; if (FLOOR[n]) { cnt[n] = (cnt[n] || 0) + 1; if (!bestF || cnt[n] > cnt[bestF]) bestF = n; } });
        if (bestF) under[p[0] + ',' + p[1]] = bestF;
      });
      ks.forEach(function(p) {
        var id = tiles[p[2]];
        if (!KNOWN[id] || id === 'empty') return;
        if (id === 'player' || id === 'enemy') { var uf = under[p[0] + ',' + p[1]]; if (uf) base[p[0] + ',' + p[1]] = uf; }
        if (id === 'player') { if (px < 0) { px = p[0]; py = p[1]; } return; }
        if (id === 'enemy') {
          var m = S.rules.enemy && S.rules.enemy.mode;
          en.push([p[0], p[1], (m === 'up' || m === 'down') && !S.gravity ? m : (m === 'left' || m === 'right') ? m : (p[0] % 2 === 0 ? 'right' : 'left')]);
          return;
        }
        if (id === 'flag') flags++;
        if (id === 'target') tg.push(p[0] + ',' + p[1]);
        base[p[0] + ',' + p[1]] = id;
      });
      return { W: W, H: H, base: base, under: under, chg: {}, tg: tg, px: px, py: py, sx: px, sy: py, en: en, flags: flags,
        lives: S.lives, keys: 0, score: 0, coins: 0, moves: 0, hurts: 0, won: false, dead: false, grav: S.gravity,
        msg: null, fired: [], hurtLog: [], fx: null };
    }

    function clone(w) {
      return { W: w.W, H: w.H, base: w.base, under: w.under, chg: Object.assign({}, w.chg), tg: w.tg || [], px: w.px, py: w.py, sx: w.sx, sy: w.sy,
        en: w.en.map(function(e) { return e.slice(); }), flags: w.flags, lives: w.lives, keys: w.keys, score: w.score, coins: w.coins,
        moves: w.moves, hurts: w.hurts, won: w.won, dead: w.dead, grav: w.grav, msg: null, fired: [], hurtLog: w.hurtLog.slice(-12), fx: null };
    }

    function hurt(w, what) {
      w.lives--; w.hurts++;
      w.score = Math.max(0, w.score - (what === 'enemy' ? 15 : 20));
      w.hurtLog.push(what);
      w.msg = { k: 'hurt', what: what };
      w.fxKind = 'hazard';
      if (w.lives <= 0) { w.lives = 0; w.dead = true; w.msg = { k: 'dead', what: what }; }
    }
    function win(w) {
      if (w.won) return;
      w.won = true;
      var bonus = Math.max(0, 500 - w.moves * 2);
      w.score += 100 + bonus;
      w.msg = { k: 'win', bonus: bonus };
      w.fxKind = 'goal';
    }
    // In side view you stand on walls, platforms, doors and anything else that blocks.
    function supports(id) { return !!(SOLID[id] || BLOCK[id]); }
    function grounded(w) {
      if (w.py >= w.H - 1) return true;
      return supports(tileAt(w, w.px, w.py + 1));
    }
    // A deterministic "random" empty square, so the level check can replay it.
    function randomEmpty(w) {
      var cells = [];
      for (var y = 0; y < w.H; y++) for (var x = 0; x < w.W; x++) {
        var t = tileAt(w, x, y);
        if ((t === 'empty' || t === 'grass' || t === 'path' || t === 'sand') && enemyAt(w, x, y) < 0 && !(x === w.px && y === w.py)) cells.push([x, y]);
      }
      if (!cells.length) return null;
      return cells[(w.moves * 7919 + w.px * 31 + w.py * 17) % cells.length];
    }

    // Rules that decide whether the player may enter a square (stop, bounce, push).
    function preRules(w, T, nx, ny, dx, dy, S) {
      var acts = S.rules.touch[T] || [];
      for (var i = 0; i < acts.length; i++) {
        var a = acts[i];
        if (a.action === 'stop' || a.action === 'bounce') { w.fired.push(a.id); return 'block'; }
        if (a.action === 'push') {
          w.fired.push(a.id);
          var bx = nx + dx, by = ny + dy;
          if (!inB(w, bx, by) || enemyAt(w, bx, by) >= 0) return 'block';
          var bt = tileAt(w, bx, by);
          if (!(bt === 'empty' || bt === 'grass' || bt === 'path' || bt === 'sand')) return 'block';
          setTile(w, bx, by, T); clearTile(w, nx, ny);
          return 'pushed';
        }
      }
      return 'ok';
    }
    // Rules that run after the player touches a square (or bumps into it).
    function postRules(w, T, nx, ny, S) {
      var acts = S.rules.touch[T] || [];
      for (var i = 0; i < acts.length && !w.dead && !w.won; i++) {
        var a = acts[i];
        if (a.action === 'stop' || a.action === 'bounce' || a.action === 'push') continue;
        w.fired.push(a.id);
        if (a.action === 'collect') { if (a.param === '+key') w.keys++; else w.score += 1; }
        else if (a.action === 'loseLife') hurt(w, 'rule');
        else if (a.action === 'winGame') win(w);
        else if (a.action === 'destroy') { if (a.param === 'self') { w.lives = 0; w.dead = true; w.msg = { k: 'dead', what: 'rule' }; } else clearTile(w, nx, ny); }
        else if (a.action === 'teleport') {
          var dest = a.param === 'random-empty' ? randomEmpty(w) : [w.sx, w.sy];
          if (dest) { w.px = dest[0]; w.py = dest[1]; w.fxKind = 'portal'; }
        }
        else if (a.action === 'gravity') w.grav = a.param !== 'off';
        else if (a.action === 'jump') rise(w, clampInt(a.param, 1, 5, 3), S);
        else if (a.action === 'move' && DIRS[a.param]) {
          var d = DIRS[a.param], qx = w.px + d[0], qy = w.py + d[1];
          if (inB(w, qx, qy) && !BLOCK[tileAt(w, qx, qy)] && tileAt(w, qx, qy) !== 'door' && enemyAt(w, qx, qy) < 0) { w.px = qx; w.py = qy; arrive(w, S, false); }
        }
      }
    }

    // What the square the player just arrived on does.
    function arrive(w, S, allowRules) {
      var T = tileAt(w, w.px, w.py);
      if (POINTS[T]) { w.score += POINTS[T]; if (T === 'coin') w.coins++; clearTile(w, w.px, w.py); w.msg = { k: 'points', tile: T, n: POINTS[T] }; w.fxKind = 'collect'; }
      else if (T === 'key') { w.keys++; w.score += 5; clearTile(w, w.px, w.py); w.msg = { k: 'key', n: w.keys }; w.fxKind = 'key'; }
      else if (T === 'heart') { w.lives++; clearTile(w, w.px, w.py); w.msg = { k: 'life' }; w.fxKind = 'collect'; }
      else if (HURT[T]) hurt(w, T);
      else if (T === 'flag') { if (goalOpen(w, S)) win(w); else w.msg = { k: 'flagLocked', on: covered(w), of: w.tg.length }; }
      else if (T === 'ice' && !w.fxKind) w.fxKind = 'ice';
      if (allowRules !== false && !w.dead) postRules(w, T, w.px, w.py, S);
      return T;
    }

    function rise(w, n, S) {
      for (var i = 0; i < n && !w.dead && !w.won; i++) {
        var nx = w.px, ny = w.py - 1;
        if (!inB(w, nx, ny)) break;
        var T = tileAt(w, nx, ny);
        if (BLOCK[T] || T === 'door') { if (preRules(w, T, nx, ny, 0, -1, S) === 'ok') postRules(w, T, nx, ny, S); break; }
        var ei = enemyAt(w, nx, ny);
        if (ei >= 0) { w.en.splice(ei, 1); hurt(w, 'enemy'); }
        w.px = nx; w.py = ny;
        arrive(w, S);
        if (T === 'portal') break;
      }
      w.jumped = true;
    }

    function portalJump(w) {
      var here = w.px + ',' + w.py, dest = null;
      for (var y = 0; y < w.H && !dest; y++) for (var x = 0; x < w.W && !dest; x++) {
        if ((x + ',' + y) !== here && tileAt(w, x, y) === 'portal') dest = [x, y];
      }
      if (!dest) return;
      var land = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < land.length; i++) {
        var lx = dest[0] + land[i][0], ly = dest[1] + land[i][1];
        if (!inB(w, lx, ly) || enemyAt(w, lx, ly) >= 0) continue;
        var lt = tileAt(w, lx, ly);
        if (!BLOCK[lt] && !HURT[lt] && lt !== 'portal' && lt !== 'door') { w.px = lx; w.py = ly; w.msg = { k: 'portal' }; w.fxKind = 'portal'; return; }
      }
      w.px = dest[0]; w.py = dest[1]; w.msg = { k: 'portal' }; w.fxKind = 'portal';
    }

    // Try to walk one square. Returns true if the player moved.
    function tryMove(w, dx, dy, S) {
      var nx = w.px + dx, ny = w.py + dy;
      if (!inB(w, nx, ny)) return false;
      var T = tileAt(w, nx, ny);
      if (T === 'crate' && S.puzzle) {
        if (!pushCrate(w, nx, ny, dx, dy)) { w.msg = { k: 'crateStuck' }; return false; }
        T = tileAt(w, nx, ny);
        w.msg = { k: 'push', on: covered(w), of: (w.tg || []).length };
        w.fxKind = 'push';
      }
      if (BLOCK[T] || (T === 'door' && w.keys <= 0)) {
        if (T === 'door') w.msg = { k: 'locked' };
        if (preRules(w, T, nx, ny, dx, dy, S) === 'ok') postRules(w, T, nx, ny, S);
        return false;
      }
      var pre = preRules(w, T, nx, ny, dx, dy, S);
      if (pre === 'block') { w.msg = w.msg || { k: 'blocked', tile: T }; return false; }
      if (pre === 'pushed') T = 'empty';
      var ei = enemyAt(w, nx, ny);
      if (ei >= 0) { w.en.splice(ei, 1); hurt(w, 'enemy'); }
      if (T === 'door') { w.keys--; clearTile(w, nx, ny); w.msg = { k: 'door', n: w.keys }; T = 'empty'; }
      w.px = nx; w.py = ny;
      if (w.dead) return true;
      arrive(w, S);
      if (w.dead || w.won) return true;
      if (T === 'portal') { portalJump(w); return true; }
      // Ice: keep sliding the same way until you leave the ice or something stops you.
      if (T === 'ice' && (!w.grav || dy === 0)) {
        var maxSlide = 30;
        while (maxSlide-- > 0 && !w.dead && !w.won) {
          var snx = w.px + dx, sny = w.py + dy;
          if (!inB(w, snx, sny)) break;
          var sDest = tileAt(w, snx, sny);
          if (BLOCK[sDest] || sDest === 'door' || enemyAt(w, snx, sny) >= 0) break;
          if (preRules(w, sDest, snx, sny, dx, dy, S) !== 'ok') break;
          w.px = snx; w.py = sny; w.slid = true;
          arrive(w, S);
          if (sDest === 'portal') { portalJump(w); break; }
          if (sDest !== 'ice') break;
        }
        if (!w.msg && w.slid) w.msg = { k: 'slide' };
      }
      return true;
    }

    function canEnemyEnter(w, x, y) {
      if (!inB(w, x, y) || !ENEMY_OK[tileAt(w, x, y)] || enemyAt(w, x, y) >= 0) return false;
      if (w.grav && y < w.H - 1 && !supports(tileAt(w, x, y + 1))) return false;
      return true;
    }

    function moveEnemies(w, S) {
      var mode = S.rules.enemy ? S.rules.enemy.mode : null;
      if (mode === 'stop' || !w.en.length) return;
      // "Every N moves": enemies take a step only on every Nth move (slower enemies).
      if (S.rules.enemy && S.rules.enemy.every > 1 && w.moves % S.rules.enemy.every !== 0) return;
      if (S.rules.enemy) w.fired.push(S.rules.enemy.id);
      for (var i = 0; i < w.en.length && !w.dead; i++) {
        var e = w.en[i], dir = e[2];
        var dist = Math.abs(w.px - e[0]) + Math.abs(w.py - e[1]);
        var range = mode === 'toward-player' ? 999 : S.chase;
        if (dist > 0 && dist <= range) {
          var cdx = w.px > e[0] ? 1 : w.px < e[0] ? -1 : 0, cdy = w.py > e[1] ? 1 : w.py < e[1] ? -1 : 0;
          if (w.grav || Math.abs(w.px - e[0]) >= Math.abs(w.py - e[1])) dir = cdx > 0 ? 'right' : cdx < 0 ? 'left' : dir;
          else dir = cdy > 0 ? 'down' : 'up';
        } else if (mode === 'random') {
          dir = ['up', 'right', 'down', 'left'][(w.moves * 13 + i * 7 + e[0] * 3 + e[1]) % 4];
          if (w.grav && (dir === 'up' || dir === 'down')) dir = dir === 'up' ? 'left' : 'right';
        }
        var d = DIRS[dir] || DIRS.right, ex = e[0] + d[0], ey = e[1] + d[1];
        if (ex === w.px && ey === w.py) { w.en.splice(i, 1); i--; hurt(w, 'enemy'); continue; }
        if (canEnemyEnter(w, ex, ey)) { e[0] = ex; e[1] = ey; e[2] = dir; }
        else e[2] = dir === 'left' ? 'right' : dir === 'right' ? 'left' : dir === 'up' ? 'down' : 'up';
      }
    }

    // One turn: the player acts, gravity pulls (side view), then enemies move.
    // input is a key name: ArrowUp/ArrowDown/ArrowLeft/ArrowRight or Space.
    function step(w0, input, S) {
      if (!w0 || w0.won || w0.dead || w0.px < 0) return w0;
      var kr = S.rules.keys[input], dir = KEY_DIR[input] || null, jumpN = S.jump;
      if (kr) { if (kr.action === 'move') dir = kr.param; else { dir = 'up'; jumpN = clampInt(kr.param, 1, 5, S.jump); } }
      else if (input === 'Space') dir = w0.grav ? 'up' : null;
      if (!dir || !DIRS[dir]) return w0;
      var w = clone(w0);
      if (kr) w.fired.push(kr.id);
      w.moves++;
      var fx = w.px, fy = w.py;
      w.fxKind = null; w.jumped = false; w.slid = false;
      if (w.grav && dir === 'up') { if (grounded(w)) rise(w, jumpN, S); }
      else if (w.grav && dir === 'down') { /* in side view, Down just lets gravity work */ }
      else tryMove(w, DIRS[dir][0], DIRS[dir][1], S);
      // "Every N moves" player rules run after the player's own move.
      for (var ti = 0; ti < S.rules.timers.length && !w.won && !w.dead; ti++) {
        var tr = S.rules.timers[ti];
        if (w.moves % tr.n !== 0) continue;
        w.fired.push(tr.id);
        if (tr.action === 'move') tryMove(w, DIRS[tr.param][0], DIRS[tr.param][1], S);
        else if (tr.action === 'jump') { if (!w.grav || grounded(w)) rise(w, clampInt(tr.param, 1, 5, S.jump), S); }
        else if (tr.action === 'collect') { if (tr.param === '+key') w.keys++; else w.score += 1; }
        else if (tr.action === 'loseLife') hurt(w, 'rule');
        else if (tr.action === 'gravity') w.grav = tr.param === 'on';
        else if (tr.action === 'teleport') {
          var td = tr.param === 'random-empty' ? randomEmpty(w) : [w.sx, w.sy];
          if (td) { w.px = td[0]; w.py = td[1]; w.fxKind = 'portal'; }
        }
      }
      if (w.grav && !w.won && !w.dead && !w.jumped && !grounded(w)) {
        var ny = w.py + 1, T = tileAt(w, w.px, ny);
        var ei = enemyAt(w, w.px, ny);
        if (ei >= 0) { w.en.splice(ei, 1); hurt(w, 'enemy'); }
        if (!w.dead) { w.py = ny; var at = arrive(w, S); if (at === 'portal') portalJump(w); }
      }
      if (!w.won && !w.dead) moveEnemies(w, S);
      w.fx = { fx: fx, fy: fy, tx: w.px, ty: w.py, kind: w.fxKind || 'step' };
      delete w.fxKind; delete w.jumped; delete w.slid;
      return w;
    }

    // Score-only pickups never change what can happen next, so states that differ
    // only in which coins were taken are the same for "can it be won".
    // For "where can you get to", rules that only change score or lives on a pickup do not matter either.
    var MOVE_ACTS = { stop: 1, bounce: 1, push: 1, teleport: 1, move: 1, jump: 1, gravity: 1, destroy: 1, winGame: 1 };
    function stateKey(w, S, forReach) {
      var ch = Object.keys(w.chg).filter(function(k) {
        var b = w.base[k];
        if (!POINTS[b]) return true;
        var acts = S.rules.touch[b];
        if (!acts) return false;
        return !forReach || acts.some(function(a) { return MOVE_ACTS[a.action]; });
      }).sort();
      return w.px + ',' + w.py + '|' + w.lives + '|' + w.keys + '|' + (w.grav ? 1 : 0) + '|' + ch.map(function(k) { return k + '=' + w.chg[k]; }).join(';') + '|' + w.en.map(function(e) { return e.join(','); }).join(';') + (S.rules.period > 1 ? '|t' + (w.moves % S.rules.period) : '');
    }

    function heapOps() {
      var a = [];
      function less(x, y) { return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]); }
      return {
        size: function() { return a.length; },
        push: function(item) { a.push(item); var i = a.length - 1; while (i > 0) { var p = (i - 1) >> 1; if (less(a[i], a[p])) { var t = a[i]; a[i] = a[p]; a[p] = t; i = p; } else break; } },
        pop: function() { var top = a[0], last = a.pop(); if (a.length) { a[0] = last; var i = 0; for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && less(a[l], a[m])) m = l; if (r < a.length && less(a[r], a[m])) m = r; if (m === i) break; var t = a[i]; a[i] = a[m]; a[m] = t; i = m; } } return top; }
      };
    }

    // Search the ways the level can be played with the same step() as Play:
    // fewest lives lost first, then fewest moves. winnable is true (found a win),
    // false (searched everything, no win) or null (too many possibilities to finish).
    function solve(tiles, W, H, o, cap) {
      var S = settings(o);
      var w0 = init(tiles, W, H, o);
      var res = { hasPlayer: w0.px >= 0, hasFlag: w0.flags > 0, winnable: false, complete: true, moves: 0, livesLost: 0, keysUsed: 0, path: [], inputs: [], reach: {}, coinsTotal: 0, coinsReach: 0, explored: 0, startLives: S.lives,
        puzzle: S.puzzle, targets: S.puzzle ? w0.tg.length : 0, crates: 0 };
      var flags = [], fancy = !!S.gravity || S.rules.gravity !== null || S.rules.timers.some(function(t) { return t.action !== 'collect' && t.action !== 'loseLife'; });
      Object.keys(w0.base).forEach(function(k) {
        var b = w0.base[k];
        if (b === 'crate') res.crates++;
        if (b === 'coin') res.coinsTotal++;
        if (b === 'flag') flags.push(k.split(',').map(Number));
        if (b === 'ice' || b === 'portal') fancy = true;
      });
      Object.keys(S.rules.touch).forEach(function(t) { S.rules.touch[t].forEach(function(a) { if (a.action !== 'collect' && a.action !== 'loseLife' && a.action !== 'stop' && a.action !== 'bounce' && a.action !== 'destroy') fancy = true; }); });
      if (w0.px < 0) return res;
      cap = cap || 40000;
      var inputs = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
      Object.keys(S.rules.keys).forEach(function(k) { if (inputs.indexOf(k) < 0) inputs.push(k); });
      // Distance to the nearest flag guides the search. It never overestimates on
      // plain maps; maps that can move you several squares in one turn skip it.
      function est(w) {
        if (fancy || !flags.length) return 0;
        var m = 1e9; for (var f = 0; f < flags.length; f++) m = Math.min(m, Math.abs(flags[f][0] - w.px) + Math.abs(flags[f][1] - w.py));
        return m;
      }
      var nodes = [{ w: w0, parent: -1, input: null }], q = heapOps(), seen = {}, best = -1;
      q.push([est(w0), 0]);
      seen[stateKey(w0, S)] = 1;
      while (q.size()) {
        if (res.explored >= cap) { res.complete = false; break; }
        var top = q.pop(), w = nodes[top[1]].w;
        res.explored++;
        if (w.won) { best = top[1]; break; }
        if (w.dead) continue;
        for (var i = 0; i < inputs.length; i++) {
          var n = step(w, inputs[i], S);
          if (n === w) continue;
          var key = stateKey(n, S);
          if (seen[key]) continue;
          seen[key] = 1;
          nodes.push({ w: n, parent: top[1], input: inputs[i] });
          q.push([n.hurts * 100000 + n.moves + est(n), nodes.length - 1]);
        }
      }
      if (best >= 0) {
        var bw = nodes[best].w, chain = [];
        for (var c = best; c >= 0; c = nodes[c].parent) chain.push(nodes[c]);
        chain.reverse();
        res.winnable = true; res.complete = true;
        res.moves = bw.moves; res.livesLost = bw.hurts;
        res.path = chain.map(function(nd) { return [nd.w.px, nd.w.py]; });
        res.inputs = chain.slice(1).map(function(nd) { return nd.input; });
        Object.keys(bw.chg).forEach(function(k) { if (w0.base[k] === 'door' && bw.chg[k] !== 'door') res.keysUsed++; });
      } else if (!res.complete) res.winnable = null;
      // Where can the player get to at all? Same rules, enemies left out
      // (they can hurt you but never wall you in for good).
      var r0 = clone(w0); r0.en = []; r0.lives = 99;
      var rq = [r0], rseen = {}, rc = 0, rh = 0;
      rseen[stateKey(r0, S, true)] = 1;
      res.reachComplete = true;
      while (rh < rq.length) {
        if (++rc > cap) { res.reachComplete = false; break; }
        var rw = rq[rh++];
        res.reach[rw.px + ',' + rw.py] = 1;
        if (rw.won || rw.dead) continue;
        for (var j = 0; j < inputs.length; j++) {
          var rn = step(rw, inputs[j], S);
          if (rn === rw) continue;
          rn.lives = 99;
          var rk = stateKey(rn, S, true);
          if (rseen[rk]) continue;
          rseen[rk] = 1; rq.push(rn);
        }
      }
      Object.keys(w0.base).forEach(function(k) { if (w0.base[k] === 'coin' && res.reach[k]) res.coinsReach++; });
      return res;
    }

    // Squares where an enemy (from where it starts) is close enough to chase you.
    function chaseZone(tiles, W, H, o) {
      var S = settings(o), z = {};
      var mode = S.rules.enemy ? S.rules.enemy.mode : null;
      if (mode === 'stop' || S.chase <= 0 && mode !== 'toward-player') return z;
      var range = mode === 'toward-player' ? 999 : S.chase;
      Object.keys(tiles || {}).forEach(function(k) {
        if (tiles[k] !== 'enemy') return;
        var p = k.split(',').map(Number);
        for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
          var d = Math.abs(x - p[0]) + Math.abs(y - p[1]);
          if (d > 0 && d <= range) z[x + ',' + y] = (z[x + ',' + y] || 0) + 1;
        }
      });
      return z;
    }

    return { DEF: DEF, BLOCK: BLOCK, HURT: HURT, POINTS: POINTS, settings: settings, compileRules: compileRules, init: init, step: step, solve: solve, tileAt: tileAt, enemyAt: enemyAt, chaseZone: chaseZone, timerN: timerN, covered: covered };
  })();

  // Small cache so the challenge list and the tuner do not search the same map twice.
  var _gsSolveCache = [];
  function gsSolveCached(tiles, w, h, o) {
    var sig = JSON.stringify([w, h, tiles, o || {}]);
    for (var i = 0; i < _gsSolveCache.length; i++) if (_gsSolveCache[i][0] === sig) return _gsSolveCache[i][1];
    var r = GS_E.solve(tiles || {}, w || 16, h || 12, o || {});
    _gsSolveCache.unshift([sig, r]);
    if (_gsSolveCache.length > 24) _gsSolveCache.pop();
    return r;
  }
  function gsCanWin(t, w, h, o) { return gsSolveCached(t, w, h, o).winnable; }

  var CHALLENGES = [
    {
      id: 'first_steps', title: 'First Steps', icon: '\uD83D\uDC76', difficulty: 1, xp: 10,
      desc: 'Create your first playable level with a player, coins, and a goal.',
      hint: 'Place a Player, at least 3 Coins, and a Flag on your map. Keep it simple!',
      requirements: [
        { text: 'Place a player', check: function(t) { return hasTile(t, 'player'); } },
        { text: 'Place 3+ coins', check: function(t) { return countTile(t, 'coin') >= 3; } },
        { text: 'Place a goal flag', check: function(t) { return hasTile(t, 'flag'); } },
        { engine: true, text: 'A player can reach the flag', check: function(t, w, h, o) { return gsCanWin(t, w, h, o) === true; } },
        { engine: true, text: 'Every coin can be reached', check: function(t, w, h, o) { var r = gsSolveCached(t, w, h, o); return r.coinsTotal > 0 && r.reachComplete && r.coinsReach === r.coinsTotal; } }
      ]
    },
    {
      id: 'maze_builder', title: 'Maze Builder', icon: '\uD83E\uDDF1', difficulty: 1, xp: 15,
      desc: 'Build a walled maze with walls around the border and internal walls.',
      hint: 'Surround your map with walls, then add internal walls to create corridors. Don\'t forget a player and flag!',
      requirements: [
        { text: 'Walls around the border', check: function(t, w, h) { return hasWallBorder(t, w, h); } },
        { text: '10+ internal walls', check: function(t, w, h) {
          var border = 0;
          for (var x = 0; x < w; x++) { if (t[x+',0'] === 'wall') border++; if (t[x+','+(h-1)] === 'wall') border++; }
          for (var y = 1; y < h - 1; y++) { if (t['0,'+y] === 'wall') border++; if (t[(w-1)+','+y] === 'wall') border++; }
          return countTile(t, 'wall') - border >= 10;
        }},
        { text: 'Player and flag placed', check: function(t) { return hasTile(t, 'player') && hasTile(t, 'flag'); } },
        { engine: true, text: 'The maze can be solved', check: function(t, w, h, o) { return gsCanWin(t, w, h, o) === true; } }
      ]
    },
    {
      id: 'danger_zone', title: 'Danger Zone', icon: '\u26A0\uFE0F', difficulty: 2, xp: 20,
      desc: 'Design a level with hazards (lava/spikes) and safe paths around them.',
      hint: 'Place lava or spikes as obstacles, then make sure there\'s always a safe path for the player. Add coins near danger for risk/reward!',
      requirements: [
        { text: '3+ hazard tiles (lava/spikes)', check: function(t) { return countTile(t, 'lava') + countTile(t, 'spikes') >= 3; } },
        { text: 'Player and flag placed', check: function(t) { return hasTile(t, 'player') && hasTile(t, 'flag'); } },
        { text: '5+ safe walkable tiles', check: function(t) { return countTile(t, 'grass') + countTile(t, 'path') + countTile(t, 'sand') >= 5; } },
        { text: 'At least 1 coin near a hazard', check: function(t) {
          var found = false;
          Object.keys(t).forEach(function(k) {
            if (t[k] !== 'coin') return;
            var p = k.split(',').map(Number);
            [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d) {
              var nk = (p[0]+d[0]) + ',' + (p[1]+d[1]);
              if (t[nk] === 'lava' || t[nk] === 'spikes') found = true;
            });
          });
          return found;
        }},
        { engine: true, text: 'A safe route: you can win without losing a life', check: function(t, w, h, o) { var r = gsSolveCached(t, w, h, o); return r.winnable === true && r.livesLost === 0; } }
      ]
    },
    {
      id: 'key_master', title: 'Key Master', icon: '\uD83D\uDD11', difficulty: 2, xp: 25,
      desc: 'Create a puzzle where the player must find keys to unlock doors.',
      hint: 'Place doors that block the path and keys the player must collect first. The player needs a key in inventory to pass through a door!',
      requirements: [
        { text: '2+ doors placed', check: function(t) { return countTile(t, 'door') >= 2; } },
        { text: '2+ keys placed', check: function(t) { return countTile(t, 'key') >= 2; } },
        { text: 'Player and flag placed', check: function(t) { return hasTile(t, 'player') && hasTile(t, 'flag'); } },
        { text: 'At least 1 NPC', check: function(t) { return hasTile(t, 'npc'); } },
        { engine: true, text: 'A player can win', check: function(t, w, h, o) { return gsCanWin(t, w, h, o) === true; } },
        { engine: true, text: 'Without keys, nobody can win (the doors really block the way)', check: function(t, w, h, o) {
          if (gsCanWin(t, w, h, o) !== true) return false;
          var noKeys = {};
          Object.keys(t).forEach(function(k) { if (t[k] !== 'key') noKeys[k] = t[k]; });
          return gsCanWin(noKeys, w, h, o) === false;
        }}
      ]
    },
    {
      id: 'enemy_gauntlet', title: 'Enemy Gauntlet', icon: '\uD83D\uDC7E', difficulty: 3, xp: 30,
      desc: 'Create a level packed with enemies! Include safe zones between enemy groups.',
      hint: 'Place 5+ enemies but also create safe zones (areas with no enemies nearby) so the player can rest. Add hearts for extra lives!',
      requirements: [
        { text: '5+ enemies', check: function(t) { return countTile(t, 'enemy') >= 5; } },
        { text: '2+ hearts for healing', check: function(t) { return countTile(t, 'heart') >= 2; } },
        { text: 'Player and flag placed', check: function(t) { return hasTile(t, 'player') && hasTile(t, 'flag'); } },
        { text: 'Include walls for cover', check: function(t) { return countTile(t, 'wall') >= 8; } },
        { engine: true, text: 'A player can win', check: function(t, w, h, o) { return gsCanWin(t, w, h, o) === true; } }
      ]
    },
    {
      id: 'master_designer', title: 'Master Designer', icon: '\uD83C\uDFC6', difficulty: 3, xp: 50,
      desc: 'Create a complex level using at least 8 different tile types with all key mechanics.',
      hint: 'Use a wide variety of tiles: walls, hazards, keys, doors, enemies, coins, hearts, NPCs, and portals. Show mastery of all game design concepts!',
      requirements: [
        { text: '8+ different tile types used', check: function(t) {
          var types = {};
          Object.keys(t).forEach(function(k) { types[t[k]] = true; });
          return Object.keys(types).length >= 8;
        }},
        { text: 'Key + door puzzle', check: function(t) { return hasTile(t, 'key') && hasTile(t, 'door'); } },
        { text: '3+ enemies', check: function(t) { return countTile(t, 'enemy') >= 3; } },
        { text: 'NPC + coins + flag', check: function(t) { return hasTile(t, 'npc') && countTile(t, 'coin') >= 3 && hasTile(t, 'flag'); } },
        { text: 'At least 30 total tiles placed', check: function(t) { return Object.keys(t).length >= 30; } },
        { engine: true, text: 'A player can win', check: function(t, w, h, o) { return gsCanWin(t, w, h, o) === true; } }
      ]
    }
  ];

  // ============================================================
  // STARTER PROJECTS
  // ============================================================

  function makeStarter(name, type, icon, desc, buildFn) {
    return { name: name, type: type, icon: icon, desc: desc, tiles: buildFn() };
  }

  var STARTERS = [
    makeStarter('Coin Collector', 'topdown', '\uD83E\uDE99', 'Navigate a maze, collect all coins!', function() {
      var t = {};
      var x, y;
      for (x = 0; x < 16; x++) { t[x+',0'] = 'wall'; t[x+',11'] = 'wall'; }
      for (y = 0; y < 12; y++) { t['0,'+y] = 'wall'; t['15,'+y] = 'wall'; }
      for (x = 1; x < 15; x++) for (y = 1; y < 11; y++) t[x+','+y] = 'grass';
      for (x = 3; x < 8; x++) t[x+',3'] = 'wall';
      for (x = 8; x < 13; x++) t[x+',6'] = 'wall';
      for (x = 3; x < 7; x++) t[x+',8'] = 'wall';
      t['3,2']='coin'; t['7,2']='coin'; t['12,2']='coin'; t['2,5']='coin'; t['6,5']='coin';
      t['10,4']='coin'; t['4,9']='coin'; t['8,9']='coin'; t['12,9']='coin'; t['13,4']='coin';
      t['1,1']='player'; t['14,10']='flag';
      t['5,5']='enemy'; t['11,8']='enemy'; t['9,2']='enemy';
      return t;
    }),
    makeStarter('Sky Jumper', 'platformer', '\uD83C\uDFC3', 'Jump across platforms, avoid spikes!', function() {
      var t = {}, x;
      for (x = 0; x < 16; x++) t[x+',11'] = 'platform';
      for (x = 2; x < 6; x++) t[x+',8'] = 'platform';
      for (x = 7; x < 11; x++) t[x+',6'] = 'platform';
      for (x = 11; x < 15; x++) t[x+',4'] = 'platform';
      for (x = 3; x < 7; x++) t[x+',3'] = 'platform';
      t['3,7']='coin'; t['4,7']='coin'; t['8,5']='coin'; t['9,5']='coin';
      t['12,3']='coin'; t['13,3']='coin'; t['5,2']='coin';
      t['6,10']='spikes'; t['7,10']='spikes';
      t['1,10']='player'; t['4,2']='flag';
      // 9,5 and 13,3 already hold coins — placing enemies there silently
      // erased 2 of the 7 coins. Neighboring platform-top cells are free.
      t['10,5']='enemy'; t['14,3']='enemy';
      return t;
    }),
    makeStarter('Puzzle Dungeon', 'puzzle', '\uD83E\uDDE9', 'Find keys to unlock doors!', function() {
      var t = {}, x, y;
      for (x = 0; x < 16; x++) { t[x+',0'] = 'wall'; t[x+',11'] = 'wall'; }
      for (y = 0; y < 12; y++) { t['0,'+y] = 'wall'; t['15,'+y] = 'wall'; }
      for (x = 1; x < 15; x++) for (y = 1; y < 11; y++) t[x+','+y] = 'path';
      for (y = 1; y < 11; y++) { t['5,'+y] = 'wall'; t['10,'+y] = 'wall'; }
      t['5,5'] = 'door'; t['10,5'] = 'door';
      t['3,3'] = 'key'; t['8,2'] = 'key';
      t['13,3'] = 'treasure'; t['13,8'] = 'treasure';
      t['1,1'] = 'player'; t['14,10'] = 'flag';
      t['3,8'] = 'npc'; t['8,8'] = 'npc';
      return t;
    }),
    makeStarter('Ice Cavern', 'puzzle', '\uD83E\uDDCA', 'Slide on ice to reach the exit!', function() {
      var t = {}, x, y;
      for (x = 0; x < 16; x++) { t[x+',0'] = 'wall'; t[x+',11'] = 'wall'; }
      for (y = 0; y < 12; y++) { t['0,'+y] = 'wall'; t['15,'+y] = 'wall'; }
      for (x = 1; x < 15; x++) for (y = 1; y < 11; y++) t[x+','+y] = 'ice';
      // The old layout could be won in 2 slides and no coin could be reached (the
      // level check found it). These 6 rocks make a 9-move puzzle with every coin reachable.
      t['6,1'] = 'wall'; t['8,5'] = 'wall'; t['10,9'] = 'wall';
      t['14,4'] = 'wall'; t['9,3'] = 'wall'; t['12,10'] = 'wall';
      t['5,2'] = 'coin'; t['10,4'] = 'coin'; t['3,8'] = 'coin';
      t['1,1'] = 'player'; t['14,10'] = 'flag';
      t['6,3'] = 'heart';
      return t;
    }),
    // Puzzle rule: crates move only when pushed, and the flag opens when every target has a crate.
    // The engine solves it in 71 moves; the second crate must be pushed from its left side.
    makeStarter('Crate Push', 'puzzle', '📦', 'Push crates onto the targets to open the flag!', function() {
      var rows = [
        '################',
        '#P...#....######',
        '#.C..#..o.######',
        '#....#....######',
        '##.###....######',
        '#...#..o..##...#',
        '#T........##.F.#',
        '#########.####.#',
        '#......C..T....#',
        '#.##########.###',
        '#..............#',
        '################'
      ];
      var key = { '#': 'wall', '.': 'grass', P: 'player', C: 'crate', T: 'target', F: 'flag', o: 'coin' }, t = {};
      rows.forEach(function(r, y) { for (var x = 0; x < r.length; x++) t[x + ',' + y] = key[r.charAt(x)]; });
      return t;
    })
  ];

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  function floodFill(tc, x, y, target, fill, w, h) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    var k = x + ',' + y;
    var cur = tc[k] || 'empty';
    if (cur !== target || cur === fill) return;
    tc[k] = fill;
    floodFill(tc, x + 1, y, target, fill, w, h);
    floodFill(tc, x - 1, y, target, fill, w, h);
    floodFill(tc, x, y + 1, target, fill, w, h);
    floodFill(tc, x, y - 1, target, fill, w, h);
  }

  // ---- Looks: a drawn sprite shown in place of a piece's emoji. Looks never reach the engine. ----
  var LOOK_ROLES = ['player', 'enemy', 'coin', 'flag'];
  // Only 16x16 pixel keys and plain hex colors survive (saves, imports and share codes).
  function gsCleanPixels(src) {
    var out = {};
    if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
    Object.keys(src).slice(0, 512).forEach(function(k) {
      var m = /^(\d{1,2}),(\d{1,2})$/.exec(k), v = src[k];
      if (!m || Number(m[1]) > 15 || Number(m[2]) > 15 || typeof v !== 'string' || !/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v)) return;
      out[Number(m[1]) + ',' + Number(m[2])] = v.toLowerCase();
    });
    return out;
  }
  function gsCleanLooks(src) {
    var out = {};
    if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
    LOOK_ROLES.forEach(function(r) { var p = gsCleanPixels(src[r]); if (Object.keys(p).length) out[r] = p; });
    return out;
  }
  // One SVG path per color (a few elements per square instead of one per pixel).
  function gsLookPaths(px) {
    var by = {};
    Object.keys(px).forEach(function(k) { var p = k.split(','); (by[px[k]] = by[px[k]] || []).push('M' + p[0] + ' ' + p[1] + 'h1v1h-1z'); });
    return Object.keys(by).sort().map(function(c) { return [c, by[c].join('')]; });
  }

  function dangerAt(tiles, x, y) {
    var dangers = ['lava', 'spikes', 'enemy'];
    var dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
    var score = 0;
    dirs.forEach(function(d) {
      var nk = (x + d[0]) + ',' + (y + d[1]);
      if (dangers.indexOf(tiles[nk]) >= 0) score++;
    });
    return score;
  }

  // ============================================================
  // ZERO-GC PLAYTEST 2D CANVAS FX ENGINE (pre-allocated typed arrays)
  // ============================================================
  var GS_MAX_DUST = 48;
  var GS_MAX_RINGS = 12;
  var GS_MAX_TRAIL = 8;
  var _gsDustX = new Float32Array(GS_MAX_DUST);
  var _gsDustY = new Float32Array(GS_MAX_DUST);
  var _gsDustVX = new Float32Array(GS_MAX_DUST);
  var _gsDustVY = new Float32Array(GS_MAX_DUST);
  var _gsDustR = new Float32Array(GS_MAX_DUST);
  var _gsDustLife = new Float32Array(GS_MAX_DUST);
  var _gsDustMax = new Float32Array(GS_MAX_DUST);
  var _gsDustKind = new Uint8Array(GS_MAX_DUST);
  var _gsDustHead = 0;

  var _gsRingX = new Float32Array(GS_MAX_RINGS);
  var _gsRingY = new Float32Array(GS_MAX_RINGS);
  var _gsRingR = new Float32Array(GS_MAX_RINGS);
  var _gsRingMaxR = new Float32Array(GS_MAX_RINGS);
  var _gsRingLife = new Float32Array(GS_MAX_RINGS);
  var _gsRingMax = new Float32Array(GS_MAX_RINGS);
  var _gsRingKind = new Uint8Array(GS_MAX_RINGS);
  var _gsRingHead = 0;

  var _gsTrailX = new Float32Array(GS_MAX_TRAIL);
  var _gsTrailY = new Float32Array(GS_MAX_TRAIL);
  var _gsTrailLife = new Float32Array(GS_MAX_TRAIL);
  var _gsTrailMax = new Float32Array(GS_MAX_TRAIL);
  var _gsTrailHead = 0;

  var _gsFxSeq = 0;
  var _gsFxSeed = 1337;
  function _gsRand() {
    _gsFxSeed = (_gsFxSeed * 1664525 + 1013904223) >>> 0;
    return (_gsFxSeed & 0xffff) / 65536;
  }

  function _gsSpawnDust(nx, ny, vx, vy, r, life, kind) {
    var i = _gsDustHead;
    _gsDustHead = (i + 1) % GS_MAX_DUST;
    _gsDustX[i] = nx;
    _gsDustY[i] = ny;
    _gsDustVX[i] = vx;
    _gsDustVY[i] = vy;
    _gsDustR[i] = r;
    _gsDustLife[i] = life;
    _gsDustMax[i] = life;
    _gsDustKind[i] = kind;
  }

  function _gsSpawnRing(nx, ny, maxR, life, kind) {
    var i = _gsRingHead;
    _gsRingHead = (i + 1) % GS_MAX_RINGS;
    _gsRingX[i] = nx;
    _gsRingY[i] = ny;
    _gsRingR[i] = 0.008;
    _gsRingMaxR[i] = maxR;
    _gsRingLife[i] = life;
    _gsRingMax[i] = life;
    _gsRingKind[i] = kind;
  }

  function _gsSpawnTrail(nx, ny) {
    var i = _gsTrailHead;
    _gsTrailHead = (i + 1) % GS_MAX_TRAIL;
    _gsTrailX[i] = nx;
    _gsTrailY[i] = ny;
    _gsTrailLife[i] = 0.28;
    _gsTrailMax[i] = 0.28;
  }

  // Emit normalized (0..1) playtest movement dust, motion trail & collectible/goal shockwave rings
  function gsEmitPlayFx(fromX, fromY, toX, toY, gridW, gridH, kind) {
    if (!gridW || !gridH) return;
    var fx = (fromX + 0.5) / gridW;
    var fy = (fromY + 0.5) / gridH;
    var tx = (toX + 0.5) / gridW;
    var ty = (toY + 0.5) / gridH;
    var dvx = (fx - tx) * 0.45;
    var dvy = (fy - ty) * 0.45;
    var i, ang, spd;
    // Motion-blur afterimage trail on departing cell + midpoint
    _gsSpawnTrail(fx, fy);
    _gsSpawnTrail((fx + tx) * 0.5, (fy + ty) * 0.5);
    // Velocity/step dust puffs kicked back behind player
    var dustCount = kind === 'ice' ? 7 : 5;
    var dustKind = kind === 'ice' ? 1 : 0;
    for (i = 0; i < dustCount; i++) {
      ang = _gsRand() * 6.2831853;
      spd = 0.04 + _gsRand() * 0.09;
      _gsSpawnDust(
        fx + (_gsRand() - 0.5) * (0.4 / gridW),
        fy + (_gsRand() - 0.5) * (0.4 / gridH),
        dvx + Math.cos(ang) * spd,
        dvy + Math.sin(ang) * spd - 0.015,
        2.2 + _gsRand() * 2.4,
        0.34 + _gsRand() * 0.22,
        dustKind
      );
    }
    // Event-specific shockwave rings & burst particles
    if (kind === 'collect' || kind === 'key') {
      _gsSpawnRing(tx, ty, 1.35 / Math.min(gridW, gridH), 0.48, kind === 'key' ? 4 : 0);
      for (i = 0; i < 8; i++) {
        ang = (i / 8) * 6.2831853 + _gsRand() * 0.35;
        spd = 0.09 + _gsRand() * 0.09;
        _gsSpawnDust(tx, ty, Math.cos(ang) * spd, Math.sin(ang) * spd, 2.0 + _gsRand() * 1.8, 0.45, 3);
      }
    } else if (kind === 'goal') {
      _gsSpawnRing(tx, ty, 2.4 / Math.min(gridW, gridH), 0.72, 1);
      _gsSpawnRing(tx, ty, 1.55 / Math.min(gridW, gridH), 0.52, 0);
      for (i = 0; i < 14; i++) {
        ang = (i / 14) * 6.2831853;
        spd = 0.11 + _gsRand() * 0.12;
        _gsSpawnDust(tx, ty, Math.cos(ang) * spd, Math.sin(ang) * spd, 2.4 + _gsRand() * 2.2, 0.68, i % 2 === 0 ? 4 : 3);
      }
    } else if (kind === 'portal') {
      _gsSpawnRing(fx, fy, 1.4 / Math.min(gridW, gridH), 0.46, 2);
      _gsSpawnRing(tx, ty, 1.65 / Math.min(gridW, gridH), 0.54, 2);
      for (i = 0; i < 10; i++) {
        ang = (i / 10) * 6.2831853;
        spd = 0.08 + _gsRand() * 0.08;
        _gsSpawnDust(tx, ty, Math.cos(ang) * spd, Math.sin(ang) * spd, 2.2 + _gsRand() * 1.8, 0.5, 4);
      }
    } else if (kind === 'hazard') {
      _gsSpawnRing(tx, ty, 1.5 / Math.min(gridW, gridH), 0.44, 3);
      for (i = 0; i < 9; i++) {
        ang = _gsRand() * 6.2831853;
        spd = 0.1 + _gsRand() * 0.11;
        _gsSpawnDust(tx, ty, Math.cos(ang) * spd, Math.sin(ang) * spd, 2.3 + _gsRand() * 2.0, 0.44, 2);
      }
    } else if (kind === 'ice') {
      _gsSpawnRing(tx, ty, 1.05 / Math.min(gridW, gridH), 0.36, 4);
    }
    _gsFxSeq++;
  }

  function _gsResetFxPools() {
    _gsDustLife.fill(0);
    _gsRingLife.fill(0);
    _gsTrailLife.fill(0);
  }

  function GsPlayFxOverlay(props) {
    var React = props.React;
    var canvasRef = React.useRef(null);
    var rafRef = React.useRef(0);
    React.useEffect(function() {
      var canvas = canvasRef.current;
      if (!canvas || typeof canvas.getContext !== 'function') return;
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        try {
          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        } catch (_) {}
      }
      if (typeof canvas.closest === 'function' && canvas.closest('.theme-contrast')) return;
      var c2d = null;
      try { c2d = canvas.getContext('2d'); } catch (_) { return; }
      if (!c2d) return;

      var lastTs = 0;
      var running = true;

      function syncSize() {
        var rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : null;
        var w = rect && rect.width > 8 ? Math.round(rect.width) : 320;
        var h = rect && rect.height > 8 ? Math.round(rect.height) : 240;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        return [w, h];
      }

      function step(ts) {
        if (!running) return;
        if (typeof canvas.closest === 'function' && canvas.closest('.theme-contrast')) {
          c2d.clearRect(0, 0, canvas.width || 1, canvas.height || 1);
          rafRef.current = 0;
          return;
        }
        var dt = lastTs ? Math.min(0.05, Math.max(0.004, (ts - lastTs) / 1000)) : 0.016;
        lastTs = ts;
        var dims = syncSize();
        var w = dims[0], h = dims[1];
        c2d.clearRect(0, 0, w, h);

        var active = 0;
        var i, t, alpha, px, py, rad;
        var cellR = Math.max(5, Math.min(w / Math.max(1, props.gridW), h / Math.max(1, props.gridH)) * 0.42);
        var hasRadial = typeof c2d.createRadialGradient === 'function';
        var hasEllipse = typeof c2d.ellipse === 'function';

        // 1. Subtle player motion-blur afterimage trail
        for (i = 0; i < GS_MAX_TRAIL; i++) {
          if (_gsTrailLife[i] <= 0) continue;
          _gsTrailLife[i] -= dt;
          if (_gsTrailLife[i] <= 0) continue;
          active++;
          t = _gsTrailLife[i] / _gsTrailMax[i];
          px = _gsTrailX[i] * w;
          py = _gsTrailY[i] * h;
          rad = cellR * (0.65 + t * 0.42);
          alpha = t * 0.34;
          if (hasRadial) {
            var tg = c2d.createRadialGradient(px, py, 0, px, py, rad);
            tg.addColorStop(0, 'rgba(196,181,253,' + alpha.toFixed(3) + ')');
            tg.addColorStop(1, 'rgba(139,92,246,0)');
            c2d.fillStyle = tg;
          } else {
            c2d.fillStyle = 'rgba(167,139,250,' + (alpha * 0.65).toFixed(3) + ')';
          }
          c2d.beginPath();
          if (hasEllipse) c2d.ellipse(px, py, rad, rad * 0.85, 0, 0, 6.2831853);
          else c2d.arc(px, py, rad, 0, 6.2831853);
          c2d.fill();
        }

        // 2. Glowing collectible / goal / portal / hazard shockwave rings
        for (i = 0; i < GS_MAX_RINGS; i++) {
          if (_gsRingLife[i] <= 0) continue;
          _gsRingLife[i] -= dt;
          if (_gsRingLife[i] <= 0) continue;
          active++;
          t = 1 - (_gsRingLife[i] / _gsRingMax[i]);
          var ease = 1 - (1 - t) * (1 - t);
          px = _gsRingX[i] * w;
          py = _gsRingY[i] * h;
          rad = (_gsRingR[i] + (_gsRingMaxR[i] - _gsRingR[i]) * ease) * Math.min(w, h);
          alpha = (1 - t) * 0.82;
          var rk = _gsRingKind[i];
          var strokeRgb = rk === 1 ? '52,211,153' : rk === 2 ? '192,132,252' : rk === 3 ? '251,113,133' : rk === 4 ? '103,232,249' : '251,191,36';
          c2d.strokeStyle = 'rgba(' + strokeRgb + ',' + alpha.toFixed(3) + ')';
          c2d.lineWidth = Math.max(1.2, (1 - t) * 3.4);
          c2d.beginPath();
          c2d.arc(px, py, Math.max(2, rad), 0, 6.2831853);
          c2d.stroke();
        }

        // 3. Velocity / jump dust puffs & burst motes
        for (i = 0; i < GS_MAX_DUST; i++) {
          if (_gsDustLife[i] <= 0) continue;
          _gsDustLife[i] -= dt;
          if (_gsDustLife[i] <= 0) continue;
          active++;
          _gsDustX[i] += _gsDustVX[i] * dt;
          _gsDustY[i] += _gsDustVY[i] * dt;
          _gsDustVX[i] *= 0.92;
          _gsDustVY[i] *= 0.92;
          t = _gsDustLife[i] / _gsDustMax[i];
          px = _gsDustX[i] * w;
          py = _gsDustY[i] * h;
          rad = _gsDustR[i] * (0.45 + (1 - t) * 0.85);
          alpha = t * 0.72;
          var dk = _gsDustKind[i];
          var dustRgb = dk === 1 ? '186,230,253' : dk === 2 ? '251,146,60' : dk === 3 ? '253,224,71' : dk === 4 ? '167,139,250' : '226,232,240';
          c2d.fillStyle = 'rgba(' + dustRgb + ',' + alpha.toFixed(3) + ')';
          c2d.beginPath();
          c2d.arc(px, py, Math.max(1, rad), 0, 6.2831853);
          c2d.fill();
        }

        if (active > 0 && typeof requestAnimationFrame === 'function') {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = 0;
        }
      }

      if (typeof requestAnimationFrame === 'function') {
        rafRef.current = requestAnimationFrame(step);
      }
      return function() {
        running = false;
        if (rafRef.current && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
        }
      };
    }, [props.fxSeq, props.gridW, props.gridH, props.isPlaying]);

    return React.createElement('canvas', {
      ref: canvasRef,
      className: 'gs-fx-canvas',
      'aria-hidden': 'true',
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5
      }
    });
  }

  // ============================================================
  // REGISTER TOOL
  // ============================================================

  window.StemLab.registerTool('gameStudio', {
    icon: '\uD83C\uDFAE',
    label: 'Game Design Studio',
    desc: 'Build, play & learn 2D game design',
    color: 'rose',
    category: 'creativity',
    gradeRange: '4-10',
    // No quest hooks existed, so nothing checked that the frame-loop idea -- the
    // concept this tool exists to teach -- ever landed. The Learn lessons already
    // carry real quiz questions and record per-lesson completion in learnCompleted,
    // so the first hook is understanding-gated, not activity-gated.
    questDataKey: 'gameStudio',
    questHooks: [
      { id: 'gs_lessons', label: 'Pass the quiz in 3 design lessons', icon: '🎓',
        check: function (d) { return Object.keys((d && d.learnCompleted) || {}).length >= 3; },
        progress: function (d) { return Math.min(3, Object.keys((d && d.learnCompleted) || {}).length) + '/3'; } },
      { id: 'gs_challenge', label: 'Complete a design challenge', icon: '🎯',
        check: function (d) { return Object.keys((d && d.challengeCompleted) || {}).length >= 1; },
        progress: function (d) { return Object.keys((d && d.challengeCompleted) || {}).length >= 1 ? 'Done' : 'Not yet'; } },
      { id: 'gs_playtest', label: 'Win a playtest of your own level', icon: '🏆',
        check: function (d) { return !!(d && (d.everWon || d.playWon)); },
        progress: function (d) { return (d && (d.everWon || d.playWon)) ? 'Won' : 'Keep testing'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var __alloAriaFill = function (template, values) { return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(values, k) ? String(values[k]) : m; }); };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      // Null unless the host says the kind is usable (blocked student fns are truthy); every AI control gates on these.
      var callGemini = (ctx.aiAvailable !== false && typeof ctx.callGemini === 'function') ? ctx.callGemini : null;
      var callImagen = (ctx.aiImagesAvailable !== false && typeof ctx.callImagen === 'function') ? ctx.callImagen : null;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;

      var _gsAiLoadingState = React.useState(false);
      var aiLoading = _gsAiLoadingState[0], setAiLoading = _gsAiLoadingState[1];
      // Undo / redo history for map edits (kept per visit, not saved).
      var _gsHist = React.useRef({ past: [], future: [], dragging: false });
      // The same for the sprite pixel grid.
      var _gsSpHist = React.useRef({ past: [], future: [] });
      var _gsPlayRef = React.useRef(null);
      return (function() {
        // == State ==
        var _gs = labToolData && labToolData.gameStudio || {};
        // ── Canvas narration: init (render-level, debounced by host) ──
        if (typeof canvasNarrate === 'function') {
          canvasNarrate('gameStudio', 'init', {
            first: 'Game Studio loaded. Design and build interactive games using a visual editor with sprites, physics, and event scripting.',
            repeat: 'Game Studio active.',
            terse: 'Game Studio.'
          }, { debounce: 800 });
        }
        var upd = function(patch) {
          // Saves from the old version kept the real map in playBackupTiles while a game
          // ran (play used to rewrite the map). Any new map write retires that copy.
          if (patch && Object.prototype.hasOwnProperty.call(patch, 'tiles') && !Object.prototype.hasOwnProperty.call(patch, 'playBackupTiles')) patch = Object.assign({ playBackupTiles: null }, patch);
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { gameStudio: Object.assign({}, prev && prev.gameStudio || {}, patch) });
          });
        };

        var gsTab = _gs.tab || 'map';
        var gridW = _gs.gridW || 16;
        var gridH = _gs.gridH || 12;
        var gameType = _gs.gameType || 'topdown';
        var tiles = (_gs.playBackupTiles && typeof _gs.playBackupTiles === 'object' && !Array.isArray(_gs.playBackupTiles)) ? _gs.playBackupTiles : (_gs.tiles || {});
        var selectedTile = _gs.selectedTile || 'grass';
        var brushTool = _gs.brushTool || 'brush';
        var showDanger = _gs.showDanger || false;

        // Sprite editor
        var sprites = _gs.sprites || {};
        var activeSprite = _gs.activeSprite || null;
        var spritePixels = _gs.spritePixels || {};
        var spriteColor = _gs.spriteColor || '#e74c3c';
        var spriteTool = _gs.spriteTool || 'draw';
        var spriteMirror = _gs.spriteMirror || false;
        // Drawn looks for the Player, Enemy, Coin and Flag. They change the picture only, never the rules.
        var looks = gsCleanLooks(_gs.looks);
        var lookEl = {};
        LOOK_ROLES.forEach(function(r) {
          if (!looks[r]) return;
          // Frame the drawing itself (not the empty 16x16 canvas), so a small drawing still fills its square.
          var x0 = 16, y0 = 16, x1 = 0, y1 = 0;
          Object.keys(looks[r]).forEach(function(k) { var p = k.split(','), px = Number(p[0]), py = Number(p[1]); x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px + 1); y1 = Math.max(y1, py + 1); });
          var side = Math.max(x1 - x0, y1 - y0, 4) + 1;
          var vb = [(x0 + x1 - side) / 2, (y0 + y1 - side) / 2, side, side].join(' ');
          lookEl[r] = h('svg', { viewBox: vb, width: '100%', height: '100%', 'aria-hidden': 'true', focusable: 'false', 'data-gs-look': r,
            style: { display: 'block', shapeRendering: 'crispEdges', pointerEvents: 'none', filter: 'drop-shadow(0 0 0.6px #ffffff) drop-shadow(0 0 0.6px #ffffff) drop-shadow(0 1px 1px rgba(2,6,23,0.7))' } },
            gsLookPaths(looks[r]).map(function(pc) { return h('path', { key: pc[0], d: pc[1], fill: pc[0] }); }));
        });
        // The picture for a piece: its drawn look if there is one, else its emoji.
        var pieceArt = function(id, size) {
          if (lookEl[id]) return h('span', { 'aria-hidden': 'true', style: { display: 'flex', flexShrink: 0, width: size || '82%', height: size || '82%', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' } }, lookEl[id]);
          return null;
        };

        // Keyboard route for the two paint grids (WCAG 2.1.1): one cell is in the tab
        // order, arrow keys move it, Enter/Space applies the current tool there.
        var tileCur = (_gs.tileCur >= 0 && _gs.tileCur < gridW * gridH) ? _gs.tileCur : 0;
        var spriteCur = (_gs.spriteCur >= 0 && _gs.spriteCur < 256) ? _gs.spriteCur : 0;
        var gsGridKey = function(e, idx, cols, rows, curField, paint) {
          var k = e.key, x = idx % cols, y = Math.floor(idx / cols), n = idx;
          if (k === 'Enter' || k === ' ') { e.preventDefault(); paint(); return; }
          if (k === 'ArrowRight') n = y * cols + Math.min(cols - 1, x + 1);
          else if (k === 'ArrowLeft') n = y * cols + Math.max(0, x - 1);
          else if (k === 'ArrowDown') n = Math.min(rows - 1, y + 1) * cols + x;
          else if (k === 'ArrowUp') n = Math.max(0, y - 1) * cols + x;
          else if (k === 'Home') n = y * cols;
          else if (k === 'End') n = y * cols + cols - 1;
          else return;
          e.preventDefault();
          if (n === idx) return;
          var patch = {}; patch[curField] = n; upd(patch);
          var next = e.currentTarget.parentNode && e.currentTarget.parentNode.children[n];
          if (next && next.focus) next.focus();
        };

        // Events
        // Saved rules are read defensively: a damaged save (a rule list that is not a list) used to crash the tab.
        var events = (function(src) {
          var o = {};
          if (src && typeof src === 'object' && !Array.isArray(src)) Object.keys(src).forEach(function(k) {
            if (Array.isArray(src[k])) o[k] = src[k].filter(function(r) { return r && typeof r === 'object'; });
          });
          return o;
        })(_gs.events);
        var advancedCode = _gs.advancedCode || false;
        var evSprite = ['player', 'enemy', 'npc', 'treasure'].indexOf(_gs.eventSprite) >= 0 ? _gs.eventSprite : 'player';

        // Play mode
        // The game runs in its own world (GS_E) so playing never changes the map.
        var rulesCfg = (_gs.rules && typeof _gs.rules === 'object') ? _gs.rules : {};
        var engineOpts = { gravity: gameType === 'platformer', events: events, lives: rulesCfg.lives, chase: rulesCfg.chase };
        // Puzzle's own rule (crates + targets). Added only when on, so saved level checks of other types stay valid.
        if (gameType === 'puzzle') engineOpts.puzzle = true;
        var engineS = GS_E.settings(engineOpts);
        var playWorld = (_gs.playWorld && typeof _gs.playWorld === 'object' && _gs.playWorld.base && typeof _gs.playWorld.base === 'object' && _gs.playWorld.chg && Array.isArray(_gs.playWorld.en) && Array.isArray(_gs.playWorld.hurtLog) && _gs.playWorld.W === gridW && _gs.playWorld.H === gridH) ? _gs.playWorld : null;
        // A save that says "playing" but has no usable game (older version, damaged data) starts a fresh game.
        if (!playWorld && _gs.isPlaying) playWorld = GS_E.init(tiles, gridW, gridH, engineOpts);
        var isPlaying = !!(_gs.isPlaying && playWorld);
        var playScore = playWorld ? playWorld.score : 0;
        var playLives = playWorld ? playWorld.lives : engineS.lives;
        var playKeys = playWorld ? playWorld.keys : 0;
        var playMoves = playWorld ? playWorld.moves : 0;
        var playMessage = _gs.playMessage || null;
        var playWon = !!(playWorld && playWorld.won);
        var playDead = !!(playWorld && playWorld.dead);
        var playCoinsCollected = playWorld ? playWorld.coins : 0;
        var ruleFires = _gs.ruleFires || {};
        var levelSig = function() { return JSON.stringify([gridW, gridH, gameType, tiles]); };

        // Learn tab
        var activeLesson = _gs.activeLesson || null;
        var learnCompleted = _gs.learnCompleted || {};
        // Option A is index 0; "|| null" used to turn it into "nothing picked", so A could never be checked.
        var learnAnswer = (typeof _gs.learnAnswer === 'number') ? _gs.learnAnswer : null;
        var learnShowResult = _gs.learnShowResult || false;

        // Challenges tab
        var challengeCompleted = _gs.challengeCompleted || {};

        // Projects
        var projectName = _gs.projectName || 'My Game';
        var aiPrompt = _gs.aiPrompt || '';
        var aiResult = _gs.aiResult || null;

        // == Tabs ==
        // Five tabs up top (was eight). Lessons, Challenges and the Difficulty Tuner sit together
        // under Learn; Projects (save, load, share) opens from a header button. Every view keeps
        // its tab value and its gs-tab-<id> element.
        var TABS = [
          { id: 'map', icon: '\uD83D\uDDFA\uFE0F', label: 'Map' },
          { id: 'play', icon: '\u25B6\uFE0F', label: __alloT('stem.gamestudio.play', 'Play') },
          { id: 'sprite', icon: '\uD83C\uDFA8', label: __alloT('stem.gamestudio.sprites', 'Sprites') },
          { id: 'events', icon: '\u26A1', label: __alloT('stem.gamestudio.events', 'Events') },
          { id: 'learnHub', icon: '\uD83C\uDF93', label: __alloT('stem.gamestudio.learn_hub', 'Learn & Goals') }
        ];
        var GOAL_TABS = [
          { id: 'learn', icon: '\uD83D\uDCD6', label: __alloT('stem.gamestudio.lessons_tab', 'Lessons') },
          { id: 'challenges', icon: '\uD83C\uDFC6', label: __alloT('stem.gamestudio.challenges', 'Challenges') },
          { id: 'diffHunt', icon: '\uD83D\uDCC8', label: __alloT('stem.gamestudio.difficulty_tuner', 'Difficulty Tuner') }
        ];
        var goalIds = GOAL_TABS.map(function(x) { return x.id; });

        var _bg = 'linear-gradient(135deg, #fff1f2, #ffe4e6, #fce7f3)';

        // == Play: one player turn, run by the shared game engine (GS_E.step) ==
        var tileName = function(id) { return (TILE_MAP[id] && TILE_MAP[id].label) || String(id); };
        var tileIcon = function(id) { return (TILE_MAP[id] && TILE_MAP[id].emoji) || ''; };
        var gsHash = function(str) { var hsh = 5381; for (var i = 0; i < str.length; i++) hsh = ((hsh << 5) + hsh + str.charCodeAt(i)) | 0; return 'h' + (hsh >>> 0).toString(16); };
        // A plain-English sentence for one Events rule, built from what the engine compiled.
        var ruleSentence = function(info) {
          var who = info.sprite === 'player' ? __alloT('stem.gamestudio.rule_who_player', 'the player') : tileName(info.sprite);
          var ACT = { collect: __alloT('stem.gamestudio.rule_act_collect', 'add to the score'), stop: __alloT('stem.gamestudio.rule_act_stop', 'stop the player'), destroy: __alloT('stem.gamestudio.rule_act_destroy', 'remove it'), teleport: __alloT('stem.gamestudio.rule_act_teleport', 'teleport the player'), bounce: __alloT('stem.gamestudio.rule_act_bounce', 'bounce the player back'), winGame: __alloT('stem.gamestudio.rule_act_win', 'win the game'), loseLife: __alloT('stem.gamestudio.rule_act_lose', 'take 1 life'), gravity: __alloT('stem.gamestudio.rule_act_gravity', 'switch gravity'), jump: __alloT('stem.gamestudio.rule_act_jump', 'jump'), push: __alloT('stem.gamestudio.rule_act_push', 'push it one square'), move: __alloT('stem.gamestudio.rule_act_move', 'move') };
          var act = (ACT[info.action] || info.action) + (info.actionParam ? ' (' + info.actionParam + ')' : '');
          if (info.runs && info.why === 'builtIn') return __alloT('stem.gamestudio.rule_builtin', 'Enemies already turn around at walls, so this rule is always on.');
          if (info.runs && info.touch) return __alloT('stem.gamestudio.rule_runs_touch', 'Runs in Play: when the player touches {tile}, {act}.').replace('{tile}', tileName(info.touch)).replace('{act}', act);
          if (info.runs && info.trigger === 'onKey') return __alloT('stem.gamestudio.rule_runs_key', 'Runs in Play: pressing {key} makes the player {act}.').replace('{key}', info.param).replace('{act}', act);
          // Enemy rules first: an enemy "Game Starts" rule used to be read as a gravity rule.
          if (info.runs && info.sprite === 'enemy' && info.every > 1) return __alloT('stem.gamestudio.rule_runs_enemy_every', 'Runs in Play: each enemy will {act} once every {n} moves, so enemies are slower than you.').replace('{act}', act).replace('{n}', info.every);
          if (info.runs && info.sprite === 'enemy') return __alloT('stem.gamestudio.rule_runs_enemy', 'Runs in Play: every turn, each enemy will {act}.').replace('{act}', act);
          if (info.runs && info.trigger === 'onStart') return __alloT('stem.gamestudio.rule_runs_start', 'Runs in Play: when the game starts, gravity is {p}.').replace('{p}', info.actionParam);
          if (info.runs && info.trigger === 'onTimer') {
            var TACT = {
              move: __alloT('stem.gamestudio.timer_act_move', 'the player moves {p} one square'),
              jump: __alloT('stem.gamestudio.timer_act_jump', 'the player jumps'),
              collect: info.actionParam === '+key' ? __alloT('stem.gamestudio.timer_act_key', 'the player gets a key') : __alloT('stem.gamestudio.timer_act_collect', 'the score goes up by 1'),
              loseLife: __alloT('stem.gamestudio.timer_act_lose', 'the player loses 1 life'),
              gravity: __alloT('stem.gamestudio.timer_act_gravity', 'gravity turns {p}'),
              teleport: info.actionParam === 'random-empty' ? __alloT('stem.gamestudio.timer_act_tp_random', 'the player jumps to a random empty square') : __alloT('stem.gamestudio.timer_act_tp_start', 'the player goes back to the start')
            };
            var what = (TACT[info.action] || act).replace('{p}', info.actionParam);
            return info.every === 1
              ? __alloT('stem.gamestudio.rule_runs_timer_1', 'Runs in Play: after every move, {act}.').replace('{act}', what)
              : __alloT('stem.gamestudio.rule_runs_timer', 'Runs in Play: after every {n} moves, {act}.').replace('{n}', info.every).replace('{act}', what);
          }
          var WHY = {
            pick: __alloT('stem.gamestudio.rule_why_pick_v2', 'Pick the missing choice (what it touches, which key, or how many moves) to switch this rule on.'),
            timer: __alloT('stem.gamestudio.rule_why_timer', 'Play takes turns (one step per key press), so timer rules do not run.'),
            timerAct: __alloT('stem.gamestudio.rule_why_timer_act', 'An Every rule can Move (up, down, left or right), Jump, Collect, Lose Life, switch Gravity on or off, or Teleport.'),
            timerWho: __alloT('stem.gamestudio.rule_why_timer_who', 'Only the Player and Enemies can have an Every rule. Use Collides With for this one.'),
            ai: __alloT('stem.gamestudio.rule_why_ai', 'AI talk does not run inside Play.'),
            keyAct: __alloT('stem.gamestudio.rule_why_key', 'A key rule can only Move or Jump.'),
            startAct: __alloT('stem.gamestudio.rule_why_start', 'A Game Starts rule can only switch Gravity on or off.'),
            enemyAct: __alloT('stem.gamestudio.rule_why_enemy', 'Enemy rules that run: Game Starts or Every, then Move (a direction, toward-player, random) or Stop.'),
            touchAct: __alloT('stem.gamestudio.rule_why_touch', 'This action does not run when something is touched.')
          };
          return __alloT('stem.gamestudio.rule_not_run', 'Does not run in Play yet: ') + (WHY[info.why] || '') + ' (' + who + ')';
        };
        // What each tile does, in the words of the engine's rules (one place, used by the
        // palette, its hover text and the Play legend).
        var tileRule = function(id) {
          var R = {
            empty: __alloT('stem.gamestudio.rule_empty', 'Open space. Erases a square.'),
            grass: __alloT('stem.gamestudio.rule_floor', 'Floor. Walk on it.'),
            path: __alloT('stem.gamestudio.rule_floor', 'Floor. Walk on it.'),
            sand: __alloT('stem.gamestudio.rule_floor', 'Floor. Walk on it.'),
            water: __alloT('stem.gamestudio.rule_water', 'Blocks you and enemies, like a wall.'),
            wall: __alloT('stem.gamestudio.rule_wall', 'Blocks you. In side view you can stand on it.'),
            platform: __alloT('stem.gamestudio.rule_wall', 'Blocks you. In side view you can stand on it.'),
            lava: __alloT('stem.gamestudio.rule_lava', 'Hurts: lose 1 life each time you step in.'),
            spikes: __alloT('stem.gamestudio.rule_lava', 'Hurts: lose 1 life each time you step in.'),
            ice: __alloT('stem.gamestudio.rule_ice', 'Slippery: you keep sliding the same way until you leave the ice or hit something.'),
            door: __alloT('stem.gamestudio.rule_door', 'Locked. Walk into it with a key to open it (uses the key).'),
            key: __alloT('stem.gamestudio.rule_key', 'Pick it up to open one door. +5 points.'),
            coin: __alloT('stem.gamestudio.rule_coin', '+10 points.'),
            gem: __alloT('stem.gamestudio.rule_gem', '+50 points.'),
            treasure: __alloT('stem.gamestudio.rule_treasure', '+100 points.'),
            heart: __alloT('stem.gamestudio.rule_heart', '+1 life.'),
            flag: __alloT('stem.gamestudio.rule_flag', 'The goal. Reach it to win.'),
            portal: __alloT('stem.gamestudio.rule_portal', 'Step in to come out next to the other portal.'),
            player: __alloT('stem.gamestudio.rule_player', 'Where the player starts. Use one.'),
            enemy: __alloT('stem.gamestudio.rule_enemy', 'Walks back and forth. Chases you when you are {n} or fewer steps away. Touching one costs 1 life and knocks it out.').replace('{n}', engineS.chase),
            npc: __alloT('stem.gamestudio.rule_npc', 'A character who blocks the way. Give it a rule in Events to make it do something.'),
            crate: gameType === 'puzzle'
              ? __alloT('stem.gamestudio.rule_crate_puzzle', 'Walk into it to push it one square. You can push, but never pull. It stops at walls and other crates.')
              : __alloT('stem.gamestudio.rule_crate_other', 'Blocks you like a wall. Switch the Type to Puzzle to push crates.'),
            target: gameType === 'puzzle'
              ? __alloT('stem.gamestudio.rule_target_puzzle', 'Push a crate onto it. The flag stays locked until every target has a crate.')
              : __alloT('stem.gamestudio.rule_target_other', 'Floor. In a Puzzle game, crates must cover every target before the flag opens.')
          };
          return R[id] || '';
        };
        var playMsgText = function(w) {
          var m = w && w.msg, out = '';
          if (m) {
            if (m.k === 'points') out = tileIcon(m.tile) + ' ' + __alloT('stem.gamestudio.msg_points', '+{n} points').replace('{n}', m.n);
            else if (m.k === 'key') out = '🔑 ' + __alloT('stem.gamestudio.msg_key', 'You picked up a key. Keys: {n}').replace('{n}', m.n);
            else if (m.k === 'life') out = '❤️ ' + __alloT('stem.gamestudio.msg_life', '+1 life!');
            else if (m.k === 'hurt') out = (m.what === 'lava' ? '🔥 ' + __alloT('stem.gamestudio.msg_lava', 'Ouch! Lava. -1 life') : m.what === 'spikes' ? '⚠️ ' + __alloT('stem.gamestudio.msg_spikes', 'Spikes! -1 life') : m.what === 'enemy' ? '👾 ' + __alloT('stem.gamestudio.msg_enemy', 'An enemy got you! -1 life') : '⚡ ' + __alloT('stem.gamestudio.msg_rule_hurt', 'A rule took a life! -1 life'));
            else if (m.k === 'dead') out = '💀 ' + __alloT('stem.gamestudio.msg_dead', 'Game over: out of lives.');
            else if (m.k === 'win') out = '🏆 ' + __alloT('stem.gamestudio.msg_win', 'You win! Score {score} (speed bonus +{bonus})').replace('{score}', w.score).replace('{bonus}', m.bonus);
            else if (m.k === 'locked') out = '🔒 ' + __alloT('stem.gamestudio.msg_locked', 'Locked. You need a key.');
            else if (m.k === 'door') out = '🔓 ' + __alloT('stem.gamestudio.msg_door', 'Door opened! Keys left: {n}').replace('{n}', m.n);
            else if (m.k === 'portal') out = '🌀 ' + __alloT('stem.gamestudio.msg_portal', 'Whoosh! Through the portal.');
            else if (m.k === 'slide') out = '🧊 ' + __alloT('stem.gamestudio.msg_slide', 'Wheee! Sliding on ice.');
            else if (m.k === 'blocked') out = '✋ ' + __alloT('stem.gamestudio.msg_blocked', 'A rule stops you here.');
            else if (m.k === 'push') out = '📦 ' + __alloT('stem.gamestudio.msg_push', 'Pushed! Targets covered: {a} of {b}.').replace('{a}', m.on).replace('{b}', m.of);
            else if (m.k === 'crateStuck') out = '📦 ' + __alloT('stem.gamestudio.msg_crate_stuck', 'The crate will not move: something is behind it.');
            else if (m.k === 'flagLocked') out = '🔒 ' + __alloT('stem.gamestudio.msg_flag_locked', 'The flag is locked. Cover every target with a crate first ({a} of {b}).').replace('{a}', m.on).replace('{b}', m.of);
          }
          if (w && w.fired && w.fired.length) {
            var seenIds = {};
            w.fired.forEach(function(id) {
              if (seenIds[id]) return; seenIds[id] = 1;
              var info = engineS.rules.list.find(function(r) { return r.id === id; });
              if (info && info.sprite !== 'enemy') out += (out ? '  ' : '') + '⚡ ' + __alloT('stem.gamestudio.msg_rule_fired', 'Rule {n} fired').replace('{n}', (info.sprite === 'player' ? '' : tileName(info.sprite) + ' ') + (info.index + 1));
            });
          }
          return out || null;
        };
        if (!isPlaying) _gsPlayRef.current = null;
        else if (!_gsPlayRef.current || _gsPlayRef.current.base !== playWorld.base || _gsPlayRef.current.moves < playWorld.moves) _gsPlayRef.current = playWorld;

        var focusPlayViewport = function() {
          setTimeout(function() { try { var el = document.getElementById('gs-play-viewport'); if (el) el.focus(); } catch (_) {} }, 40);
        };
        var startGame = function(extra) {
          _gsResetFxPools();
          var w = GS_E.init(tiles, gridW, gridH, engineOpts);
          if (w.px < 0) {
            _gsPlayRef.current = null;
            upd(Object.assign({ isPlaying: false, playWorld: null, playWon: false, playDead: false, playMessage: '🧑 ' + __alloT('stem.gamestudio.msg_no_player', 'Place a Player tile on the map first. That is where the game starts.') }, extra || {}));
            return;
          }
          w.fc = {};
          _gsPlayRef.current = w;
          upd(Object.assign({ isPlaying: true, playWorld: w, playWon: false, playDead: false, playMessage: null }, extra || {}));
          focusPlayViewport();
        };
        var stopGame = function() {
          _gsResetFxPools();
          _gsPlayRef.current = null;
          upd({ isPlaying: false, playWorld: null, playMessage: null, playWon: false, playDead: false });
        };
        function processMove(input) {
          var w0 = _gsPlayRef.current || playWorld;
          if (!isPlaying || !w0 || w0.won || w0.dead) return;
          var w = GS_E.step(w0, input, engineS);
          if (w === w0) return;
          w.fc = Object.assign({}, w0.fc || {});
          w.fired.forEach(function(id) { w.fc[id] = (w.fc[id] || 0) + 1; });
          _gsPlayRef.current = w;
          if (w.fx) gsEmitPlayFx(w.fx.fx, w.fx.fy, w.fx.tx, w.fx.ty, gridW, gridH, w.fx.kind);
          var patch = { playWorld: w, playMessage: playMsgText(w), ruleFires: w.fc };
          if (w.won && !w0.won) {
            // XP once per level layout, for at most 5 layouts: winning the same map again is practice, not new mastery.
            var sig = gsHash(levelSig());
            var wl = Object.assign({}, _gs.wonLevels || {});
            if (!wl[sig] && Object.keys(wl).length < 5) {
              wl[sig] = 1;
              if (typeof awardStemXP === 'function') awardStemXP('gameStudio', 10, 'won a playtest of a new level');
            }
            patch.wonLevels = wl; patch.everWon = true; patch.playWon = true;
            if (addToast) addToast('🏆 ' + __alloT('stem.gamestudio.toast_win', 'You win! Score: {score}').replace('{score}', w.score), 'success');
            try { sfxGsSuccess(); } catch (_) {}
          } else if (w.dead && !w0.dead) {
            patch.playDead = true;
            if (addToast) addToast('💀 ' + __alloT('stem.gamestudio.toast_over', 'Game over!'), 'error');
          }
          upd(patch);
        }

        // Keys for play: arrows / WASD to move, Space to jump in side view.
        function onPlayKey(e) {
          var k = e.key, input = null;
          if (k === 'ArrowUp' || k === 'w' || k === 'W') input = 'ArrowUp';
          else if (k === 'ArrowDown' || k === 's' || k === 'S') input = 'ArrowDown';
          else if (k === 'ArrowLeft' || k === 'a' || k === 'A') input = 'ArrowLeft';
          else if (k === 'ArrowRight' || k === 'd' || k === 'D') input = 'ArrowRight';
          else if (k === ' ' || k === 'Spacebar') input = 'Space';
          if (!input) return;
          e.preventDefault();
          if (!isPlaying) { startGame(); return; }
          if (playWon || playDead) return;
          processMove(input);
        }

        // Map edits go through here so Undo can step back.
        var setTiles = function(nt, opts) {
          var hst = _gsHist.current;
          if (!(opts && opts.noHistory)) {
            hst.past.push(tiles);
            if (hst.past.length > 40) hst.past.shift();
            hst.future = [];
          }
          // A changed map ends any game in progress, so the next Play uses the new map.
          var endGame = isPlaying ? { isPlaying: false, playWorld: null, playMessage: null } : {};
          if (isPlaying) _gsPlayRef.current = null;
          upd(Object.assign({ tiles: nt }, endGame, (opts && opts.extra) || {}));
        };
        var undoMap = function() {
          var hst = _gsHist.current;
          if (!hst.past.length) return;
          hst.future.push(tiles);
          upd(Object.assign({ tiles: hst.past.pop() }, isPlaying ? { isPlaying: false, playWorld: null } : {}));
        };
        var redoMap = function() {
          var hst = _gsHist.current;
          if (!hst.future.length) return;
          hst.past.push(tiles);
          upd(Object.assign({ tiles: hst.future.pop() }, isPlaying ? { isPlaying: false, playWorld: null } : {}));
        };
        // Sprite pixel edits go through here so Undo can step back. A drag adds one step.
        var setSpritePixels = function(np, opts) {
          var sh = _gsSpHist.current;
          if (!(opts && opts.noHistory)) {
            sh.past.push(spritePixels);
            if (sh.past.length > 40) sh.past.shift();
            sh.future = [];
          }
          upd(Object.assign({ spritePixels: np }, (opts && opts.extra) || {}));
        };
        var undoSprite = function() {
          var sh = _gsSpHist.current;
          if (!sh.past.length) return;
          sh.future.push(spritePixels);
          upd({ spritePixels: sh.past.pop() });
        };
        var redoSprite = function() {
          var sh = _gsSpHist.current;
          if (!sh.future.length) return;
          sh.past.push(spritePixels);
          upd({ spritePixels: sh.future.pop() });
        };
        // Draw or Erase one pixel (and its mirror twin). Null when nothing would change.
        var spriteStroke = function(base, sx, sy) {
          var np = Object.assign({}, base), changed = false;
          (spriteMirror ? [sx + ',' + sy, (15 - sx) + ',' + sy] : [sx + ',' + sy]).forEach(function(k) {
            if (spriteTool === 'erase') { if (np[k]) { delete np[k]; changed = true; } }
            else if (np[k] !== spriteColor) { np[k] = spriteColor; changed = true; }
          });
          return changed ? np : null;
        };
        // Drag drawing on the sprite grid: the same pointer approach as the map. Mouse always;
        // touch only when the Paint / Scroll toggle says Paint, so a finger can still scroll the page.
        var spriteDragOk = spriteTool === 'draw' || spriteTool === 'erase';
        // Read live each render, like the map's toggle.
        var spriteCoarse = false;
        try { spriteCoarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(any-pointer: coarse)').matches; } catch (_) { spriteCoarse = false; }
        var spriteDragPaint = function(i) {
          var sh = _gsSpHist.current;
          if (!(i >= 0 && i < 256) || sh.lastIdx === i) return;
          sh.lastIdx = i;
          var np = spriteStroke(sh.live || spritePixels, i % 16, Math.floor(i / 16));
          if (!np) return;
          var first = !sh.painted;
          sh.painted = true; sh.live = np;
          setSpritePixels(np, first ? null : { noHistory: true });
        };
        var spriteEndDrag = function(e) {
          var sh = _gsSpHist.current;
          if (sh.ptr == null || (e && e.pointerId != null && sh.ptr !== e.pointerId)) return;
          // The click that follows a drawn press must not draw (and add an Undo step) again.
          if (sh.painted) sh.skipClickUntil = Date.now() + 450;
          sh.ptr = null; sh.live = null; sh.painted = false; sh.lastIdx = -1;
        };
        var spritePxAt = function(cx, cy) {
          var el = null;
          try { el = document.elementFromPoint(cx, cy); } catch (_) { el = null; }
          var cell = el && el.closest ? el.closest('[data-gs-pxi]') : null;
          return cell ? Number(cell.getAttribute('data-gs-pxi')) : -1;
        };
        var spritePointer = {
          onPointerDown: function(e) {
            if (!spriteDragOk) return;
            var isMouse = e.pointerType === 'mouse';
            if (isMouse ? e.button !== 0 : !_gs.touchPaint) return;
            var sh = _gsSpHist.current;
            sh.ptr = e.pointerId; sh.live = null; sh.painted = false; sh.lastIdx = -1;
            try { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
            spriteDragPaint(spritePxAt(e.clientX, e.clientY));
          },
          onPointerMove: function(e) { if (_gsSpHist.current.ptr === e.pointerId) spriteDragPaint(spritePxAt(e.clientX, e.clientY)); },
          onPointerUp: spriteEndDrag, onPointerCancel: spriteEndDrag, onLostPointerCapture: spriteEndDrag
        };
        // Keep only squares inside the grid that hold a real tile (imports, AI maps, old saves).
        var cleanTiles = function(src, W, H) {
          var out = {}, playerSeen = false;
          if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
          Object.keys(src).slice(0, 2000).forEach(function(k) {
            var m = /^(\d{1,2}),(\d{1,2})$/.exec(k), v = src[k];
            if (!m || typeof v !== 'string' || !TILE_MAP[v] || v === 'empty') return;
            var x = Number(m[1]), y = Number(m[2]);
            if (x >= W || y >= H) return;
            if (v === 'player') { if (playerSeen) return; playerSeen = true; }
            out[x + ',' + y] = v;
          });
          return out;
        };
        // Rules from a file: only the four rule lists, at most 8 rules each, plain text fields.
        var cleanEvents = function(src) {
          var out = {};
          if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
          ['player', 'enemy', 'npc', 'treasure'].forEach(function(sp) {
            if (!Array.isArray(src[sp])) return;
            out[sp] = src[sp].slice(0, 8).filter(function(r) { return r && typeof r === 'object'; }).map(function(r) {
              var str = function(v) { return typeof v === 'string' ? v.slice(0, 40) : ''; };
              return { trigger: str(r.trigger) || 'onKey', param: str(r.param), action: str(r.action) || 'move', actionParam: str(r.actionParam) };
            });
          });
          return out;
        };
        var playersOnMap = countTile(tiles, 'player');

        // Event code generator (for display)
        function genCode(rule) {
          var lines = [];
          if (rule.trigger === 'onKey') lines.push('if (input.' + (rule.param || 'ArrowUp') + ') {');
          else if (rule.trigger === 'onCollide') lines.push('if (collision(\'' + (rule.param || 'wall') + '\')) {');
          else if (rule.trigger === 'onTimer') lines.push('if (moves % ' + (GS_E.timerN(rule.param) || 'N') + ' === 0) {');
          else if (rule.trigger === 'onStart') lines.push('onGameStart(() => {');
          else if (rule.trigger === 'onTalk') lines.push('onInteract(\'talk\', () => {');
          var dirs = { up: 'y -= speed', down: 'y += speed', left: 'x -= speed', right: 'x += speed', 'toward-player': 'moveToward(player)', random: 'moveRandom()' };
          if (rule.action === 'move') lines.push('  sprite.' + (dirs[rule.actionParam] || 'y -= speed') + ';');
          else if (rule.action === 'collect') lines.push('  score += 1;');
          else if (rule.action === 'destroy') lines.push('  ' + (rule.actionParam || 'self') + '.destroy();');
          else if (rule.action === 'winGame') lines.push('  gameWin();');
          else if (rule.action === 'loseLife') lines.push('  lives -= 1;');
          else if (rule.action === 'jump') lines.push('  sprite.vy = -' + ((rule.actionParam || 3) * 2) + ';');
          else if (rule.action === 'gravity') lines.push('  physics.gravity = ' + (rule.actionParam === 'on') + ';');
          else if (rule.action === 'aiTalk') lines.push('  const reply = await callAI(npcPrompt);', '  showDialog(reply);');
          else lines.push('  ' + (rule.action || 'noop') + '();');
          lines.push('}');
          return lines.join('\n');
        }

        // ============================================================
        // RENDER
        // ============================================================
        var lessonsDoneCount = Object.keys(learnCompleted).length;
        var challengesDoneCount = Object.keys(challengeCompleted).length;
        var tileCount = Object.keys(tiles).length;
        var activeBrushInfo = TILE_MAP[selectedTile] || TILE_MAP.grass;
        var mainTab = goalIds.indexOf(gsTab) >= 0 ? 'learnHub' : gsTab;
        // The Learn group opens on the view the student used last.
        var goGsTab = function(id) {
          var view = id === 'learnHub' ? (goalIds.indexOf(_gs.lastGoal) >= 0 ? _gs.lastGoal : 'learn') : id;
          var patch = { tab: view, playMessage: null };
          if (goalIds.indexOf(view) >= 0) patch.lastGoal = view;
          upd(patch);
          try { var el = document.getElementById('gs-tab-' + id); if (el) el.focus(); } catch (_) {}
        };
        var tabKeyFor = function(ids, cur) {
          return function(e) {
            var idx = ids.indexOf(cur), next = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = ids[(idx + 1) % ids.length];
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = ids[(idx - 1 + ids.length) % ids.length];
            else if (e.key === 'Home') next = ids[0];
            else if (e.key === 'End') next = ids[ids.length - 1];
            if (next) { e.preventDefault(); goGsTab(next); }
          };
        };
        var onGsTabKey = tabKeyFor(TABS.map(function(x) { return x.id; }), mainTab);
        var onGoalTabKey = tabKeyFor(goalIds, gsTab);
        // On the Projects view no top tab is selected; Map keeps the tab stop so the row stays reachable.
        var mainStop = TABS.some(function(x) { return x.id === mainTab; }) ? mainTab : 'map';

        return h('div', { id: 'allo-game-studio', className: 'max-w-4xl mx-auto animate-in fade-in duration-300' },

          // ---- STUDIO WORKBENCH HEADER ----
          h('div', { className: 'gs-hero gs-panel mb-4 p-4 rounded-2xl border-2 border-rose-300', style: { background: _bg } },
            h('div', { className: 'flex flex-wrap items-center gap-3' },
              // Bespoke pixel-gamepad emblem SVG
              h('div', { className: 'w-12 h-12 rounded-xl bg-rose-700 flex items-center justify-center shadow-sm shrink-0', 'aria-hidden': 'true' },
                h('svg', { viewBox: '0 0 32 32', width: 28, height: 28, focusable: 'false' },
                  h('rect', { x: 3, y: 9, width: 26, height: 14, rx: 6, fill: '#fff1f2' }),
                  h('rect', { x: 8, y: 14, width: 6, height: 2, rx: 1, fill: '#be123c' }),
                  h('rect', { x: 10, y: 12, width: 2, height: 6, rx: 1, fill: '#be123c' }),
                  h('circle', { cx: 21, cy: 14, r: 1.6, fill: '#be123c' }),
                  h('circle', { cx: 24, cy: 17, r: 1.6, fill: '#7c3aed' })
                )
              ),
              h('div', { className: 'flex-1 min-w-[200px]' },
                h('div', { className: 'flex flex-wrap items-center gap-2' },
                  h('h2', { className: 'text-lg md:text-xl font-black text-rose-950 m-0' }, __alloT('stem.gamestudio.game_design_studio', 'Game Design Studio')),
                  h('span', { className: 'text-[0.6875rem] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-rose-800 border border-rose-300' }, __alloT('stem.gamestudio.engine_badge', '2D Game Engine · Tech'))
                ),
                h('p', { className: 'text-xs font-bold text-rose-900 mt-0.5 mb-0' }, __alloT('stem.gamestudio.header_tagline_v2', 'Build a level, play it, change one thing.'))
              ),
              // Live workbench metric pills + the way to Projects (save, load, share)
              h('div', { className: 'flex flex-wrap gap-1.5 items-center' },
                h('button', { id: 'gs-tab-projects', type: 'button', 'aria-current': gsTab === 'projects' ? 'page' : undefined,
                  onClick: function() { upd({ tab: 'projects', playMessage: null }); },
                  style: { minHeight: '44px' },
                  className: 'px-3 py-1 rounded-xl text-xs font-black border-2 cursor-pointer ' + (gsTab === 'projects' ? 'bg-rose-700 text-white border-rose-800' : 'bg-white text-rose-900 border-rose-600 hover:bg-rose-50')
                }, '\ud83d\udcbe ' + __alloT('stem.gamestudio.projects_btn', 'Save & share')),
                // (The tiles-placed count lives in Save & share > Project Stats, so the header fits one row on a phone.)
                h('div', { className: 'px-2.5 py-1 rounded-xl bg-white border border-indigo-300 text-center' },
                  h('div', { className: 'text-[0.625rem] font-bold text-indigo-800 uppercase tracking-wide' }, __alloT('stem.gamestudio.lessons_pill', 'LESSONS')),
                  h('div', { className: 'text-sm font-black text-indigo-950 leading-tight' }, lessonsDoneCount + '/' + LESSONS.length)
                ),
                h('div', { className: 'px-2.5 py-1 rounded-xl bg-white border border-amber-300 text-center' },
                  h('div', { className: 'text-[0.625rem] font-bold text-amber-800 uppercase tracking-wide' }, __alloT('stem.gamestudio.quests_pill', 'CHALLENGES')),
                  h('div', { className: 'text-sm font-black text-amber-950 leading-tight' }, challengesDoneCount + '/' + CHALLENGES.length)
                )
              )
            )
          ),

          // ---- TAB BAR (WAI-ARIA tablist with roving tabindex & arrow keys) ----
          h('div', { role: 'tablist', 'aria-label': __alloT('stem.gamestudio.sections_label', 'Game Design Studio workspaces'), className: 'flex flex-wrap gap-1 mb-4 p-1.5 bg-rose-50 rounded-xl border border-rose-300' },
            TABS.map(function(tab) {
              var isActive = mainTab === tab.id;
              return h('button', { key: tab.id, id: 'gs-tab-' + tab.id, type: 'button',
                role: 'tab', 'aria-selected': isActive ? 'true' : 'false', 'aria-controls': 'gs-tabpanel', tabIndex: mainStop === tab.id ? 0 : -1,
                onClick: function() { goGsTab(tab.id); },
                onKeyDown: onGsTabKey,
                style: { flex: '1 1 auto', minHeight: '44px' },
                className: 'py-2 px-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ' +
                  (isActive ? 'bg-white text-rose-900 shadow-sm border border-rose-700 ring-1 ring-rose-700' : 'text-rose-800 hover:text-rose-950 hover:bg-rose-100 border border-rose-500')
              }, tab.icon + ' ' + tab.label);
            })
          ),

          // Second row, only inside Learn & Goals
          mainTab === 'learnHub' && h('div', { role: 'tablist', 'aria-label': __alloT('stem.gamestudio.goals_tabs_label', 'Learn and goals'), className: 'flex flex-wrap gap-1 -mt-2 mb-4 p-1 bg-indigo-50 rounded-xl border border-indigo-300' },
            GOAL_TABS.map(function(tab) {
              var isActive = gsTab === tab.id;
              return h('button', { key: tab.id, id: 'gs-tab-' + tab.id, type: 'button',
                role: 'tab', 'aria-selected': isActive ? 'true' : 'false', 'aria-controls': 'gs-tabpanel', tabIndex: isActive ? 0 : -1,
                onClick: function() { goGsTab(tab.id); },
                onKeyDown: onGoalTabKey,
                style: { flex: '1 1 auto', minHeight: '44px' },
                className: 'py-1.5 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ' +
                  (isActive ? 'bg-white text-indigo-950 shadow-sm border border-indigo-700 ring-1 ring-indigo-700' : 'text-indigo-900 hover:bg-indigo-100 border border-indigo-500')
              }, tab.icon + ' ' + tab.label);
            })
          ),

          gsTab === 'projects' && h('div', { className: 'gs-panel flex flex-wrap items-center justify-between gap-2 -mt-2 mb-3 p-2.5 rounded-xl bg-white border border-rose-300' },
            h('h3', { className: 'text-sm font-black text-rose-900 m-0' }, '💾 ' + __alloT('stem.gamestudio.projects_title', 'Save, load and share your game')),
            h('button', { type: 'button', onClick: function() { goGsTab('map'); }, style: { minHeight: '44px' },
              className: 'px-3 py-1.5 rounded-xl text-xs font-bold text-rose-900 bg-white border border-rose-600 hover:bg-rose-50' }, '← ' + __alloT('stem.gamestudio.back_to_map', 'Back to the map'))
          ),

          h('div', { role: 'tabpanel', id: 'gs-tabpanel', 'aria-labelledby': 'gs-tab-' + gsTab },

          // ============================================================
          // MAP EDITOR TAB
          // ============================================================
          gsTab === 'map' && (function() {
            var check = _gs.levelCheck && _gs.levelCheck.sig === gsHash(levelSig() + JSON.stringify(engineOpts)) ? _gs.levelCheck : null;
            var staleCheck = !!(_gs.levelCheck && !check);
            var routeSet = {};
            if (check && check.winnable && _gs.showRoute && Array.isArray(check.path)) check.path.forEach(function(p) { routeSet[p[0] + ',' + p[1]] = 1; });
            var zone = showDanger ? GS_E.chaseZone(tiles, gridW, gridH, engineOpts) : {};
            var runCheck = function() {
              var r = GS_E.solve(tiles, gridW, gridH, engineOpts);
              var lc = { sig: gsHash(levelSig() + JSON.stringify(engineOpts)), hasPlayer: r.hasPlayer, hasFlag: r.hasFlag, winnable: r.winnable, moves: r.moves, livesLost: r.livesLost, keysUsed: r.keysUsed, coinsReach: r.coinsReach, coinsTotal: r.coinsTotal, reachComplete: r.reachComplete, startLives: r.startLives, path: r.path.slice(0, 400), targets: r.targets, crates: r.crates };
              upd({ levelCheck: lc });
            };
            var checkText = function(c) {
              if (!c.hasPlayer) return __alloT('stem.gamestudio.check_no_player', 'No player yet. Put a Player tile where the game should start.');
              if (c.winnable === null) return __alloT('stem.gamestudio.check_too_big', 'This level has too many possibilities for the quick check. Play it to test it.');
              if (!c.winnable && c.hasFlag && c.targets > c.crates) return __alloT('stem.gamestudio.check_few_crates', 'Nobody can win this level: there are {t} targets but only {c} crates, so the flag never opens.').replace('{t}', c.targets).replace('{c}', c.crates);
              if (!c.winnable) return (c.hasFlag ? __alloT('stem.gamestudio.check_no_win', 'Nobody can win this level. The engine tried every way, and none reaches the flag.') : __alloT('stem.gamestudio.check_no_flag', 'Nobody can win this level: there is no Flag (goal) yet.'));
              var s = __alloT('stem.gamestudio.check_win', 'Yes, it can be won! The best route takes {moves} moves and loses {lost} of {lives} lives.').replace('{moves}', c.moves).replace('{lost}', c.livesLost).replace('{lives}', c.startLives);
              if (c.targets) s += ' ' + __alloT('stem.gamestudio.check_targets', 'It pushes a crate onto all {n} targets first.').replace('{n}', c.targets);
              if (c.keysUsed) s += ' ' + __alloT('stem.gamestudio.check_keys', 'It opens {n} door(s) on the way.').replace('{n}', c.keysUsed);
              return s;
            };
            var coinText = function(c) {
              if (!c.hasPlayer || !c.coinsTotal) return null;
              return '🪙 ' + __alloT('stem.gamestudio.check_coins', 'Coins a player can reach: {a} of {b}.').replace('{a}', c.coinsReach).replace('{b}', c.coinsTotal) + (c.reachComplete ? '' : ' ' + __alloT('stem.gamestudio.check_coins_partial', '(at least)'));
            };
            var tool44 = { minHeight: '44px', minWidth: '44px' };
            // ---- Drag painting (mouse, and touch when the Paint/Scroll toggle says Paint) ----
            // Read live each render, so a tablet with a keyboard dock or a touch laptop gets the toggle too.
            var coarse = false;
            try { coarse = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(any-pointer: coarse)').matches; } catch (_) { coarse = false; }
            var touchPaint = !!_gs.touchPaint;
            var dragOk = brushTool === 'brush' || brushTool === 'eraser';
            var cellIndexAt = function(cx, cy) {
              var el = null;
              try { el = document.elementFromPoint(cx, cy); } catch (_) { el = null; }
              var cell = el && el.closest ? el.closest('[data-gs-cell]') : null;
              return cell ? Number(cell.getAttribute('data-gs-cell')) : -1;
            };
            // One drag builds on its own latest map (events can arrive before React re-renders),
            // and only its first square adds an Undo step, so Undo takes back the whole drag.
            var dragPaint = function(i) {
              var hst = _gsHist.current;
              if (!(i >= 0 && i < gridW * gridH) || hst.lastIdx === i) return;
              hst.lastIdx = i;
              var k = (i % gridW) + ',' + Math.floor(i / gridW);
              var nt = Object.assign({}, hst.live || tiles);
              if (brushTool === 'eraser') { if (!nt[k]) return; delete nt[k]; }
              else {
                if (nt[k] === selectedTile || (selectedTile === 'empty' && !nt[k])) return;
                if (selectedTile === 'player') Object.keys(nt).forEach(function(pk) { if (nt[pk] === 'player') delete nt[pk]; });
                if (selectedTile === 'empty') delete nt[k]; else nt[k] = selectedTile;
              }
              var first = !hst.painted;
              hst.painted = true; hst.live = nt;
              setTiles(nt, first ? null : { noHistory: true });
            };
            var endDrag = function(e) {
              var hst = _gsHist.current;
              if (hst.ptr == null || (e && e.pointerId != null && hst.ptr !== e.pointerId)) return;
              // The click that follows a painted press must not paint (and add an Undo step) again.
              if (hst.painted) hst.skipClickUntil = Date.now() + 450;
              hst.ptr = null; hst.live = null; hst.painted = false; hst.lastIdx = -1;
            };
            var gridPointer = {
              onPointerDown: function(e) {
                if (!dragOk) return;
                var isMouse = e.pointerType === 'mouse';
                if (isMouse ? e.button !== 0 : !touchPaint) return;
                var hst = _gsHist.current;
                hst.ptr = e.pointerId; hst.live = null; hst.painted = false; hst.lastIdx = -1;
                try { if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
                dragPaint(cellIndexAt(e.clientX, e.clientY));
              },
              onPointerMove: function(e) { if (_gsHist.current.ptr === e.pointerId) dragPaint(cellIndexAt(e.clientX, e.clientY)); },
              onPointerUp: endDrag, onPointerCancel: endDrag, onLostPointerCapture: endDrag
            };
            return h('div', { className: 'space-y-3' },

            // ---- Start here: pick a level, play it, change one thing, play again ----
            h('div', { className: 'gs-panel p-3 rounded-xl border border-rose-200 bg-white space-y-2.5' },
              h('p', { className: 'text-xs font-bold text-rose-900 m-0' }, __alloT('stem.gamestudio.start_steps', '1. Pick a level  →  2. Play it  →  3. Change one thing  →  4. Play again')),
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('span', { className: 'text-xs font-extrabold text-rose-900' }, __alloT('stem.gamestudio.quick_load', 'Quick-Load Level:')),
                STARTERS.map(function(st) {
                  return h('button', { key: st.name, type: 'button',
                    onClick: function() { setTiles(Object.assign({}, st.tiles), { extra: { projectName: st.name, gameType: st.type, gridW: 16, gridH: 12 } }); if (addToast) addToast('🎮 Loaded "' + st.name + '"!', 'success'); },
                    style: { minHeight: '44px' },
                    className: 'px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-900 border border-rose-500 hover:border-rose-600 hover:bg-rose-100 transition-colors cursor-pointer'
                  }, st.icon + ' ' + st.name);
                })
              ),
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('button', { type: 'button', onClick: function() { startGame({ tab: 'play' }); },
                  style: { minHeight: '44px' },
                  className: 'px-4 py-2 rounded-xl text-sm font-black text-white bg-green-700 hover:bg-green-800 shadow-md cursor-pointer'
                }, '▶️ ' + __alloT('stem.gamestudio.play_this_level', 'Play this level')),
                h('button', { type: 'button', onClick: runCheck,
                  style: { minHeight: '44px' },
                  className: 'px-3 py-2 rounded-xl text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-500 hover:bg-indigo-100 cursor-pointer'
                }, '🧪 ' + __alloT('stem.gamestudio.test_level', 'Can it be won? Test it')),
                h('div', { className: 'flex gap-1 ml-auto' },
                  h('button', { type: 'button', onClick: undoMap, disabled: !_gsHist.current.past.length, 'aria-label': __alloT('stem.gamestudio.undo', 'Undo map change'), title: __alloT('stem.gamestudio.undo', 'Undo map change'), style: tool44,
                    className: 'rounded-lg text-base border border-slate-500 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 cursor-pointer' }, '↶'),
                  h('button', { type: 'button', onClick: redoMap, disabled: !_gsHist.current.future.length, 'aria-label': __alloT('stem.gamestudio.redo', 'Redo map change'), title: __alloT('stem.gamestudio.redo', 'Redo map change'), style: tool44,
                    className: 'rounded-lg text-base border border-slate-500 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 cursor-pointer' }, '↷'),
                  tileCount > 0 && h('button', { type: 'button',
                    onClick: function() { setTiles({}); },
                    style: { minHeight: '44px' },
                    className: 'px-2.5 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-500 hover:bg-slate-100 cursor-pointer'
                  }, '🧹 ' + __alloT('stem.gamestudio.clear_map', 'Clear Map'))
                )
              ),
              playMessage && !isPlaying && h('div', { role: 'status', className: 'text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5' }, playMessage),
              (playersOnMap > 1) && h('div', { className: 'text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5' },
                __alloT('stem.gamestudio.warn_players', 'There are {n} Player tiles. Only the top-left one plays; the others are ignored.').replace('{n}', playersOnMap))
            ),

            // ---- Game type (changes the rules) + one disclosure for the rest ----
            h('div', { className: 'gs-panel p-3 rounded-xl border border-rose-200 bg-white flex flex-wrap gap-3 items-center' },
              h('label', { className: 'flex items-center gap-1.5 text-xs font-bold text-rose-800' },
                __alloT('stem.gamestudio.type_label', 'Type:'),
                h('select', {
                  value: gameType,
                  onChange: function(e) { upd({ gameType: e.target.value }); },
                  'aria-label': __alloT('stem.gamestudio.game_type', 'Game type'),
                  style: { minHeight: '40px' },
                  className: 'text-xs border border-rose-600 rounded-lg px-2 py-1.5 bg-white text-slate-900 font-bold'
                },
                  h('option', { value: 'topdown' }, __alloT('stem.gamestudio.top_down', '🔽 Top-Down')),
                  h('option', { value: 'platformer' }, __alloT('stem.gamestudio.platformer', '🏃 Platformer')),
                  h('option', { value: 'puzzle' }, __alloT('stem.gamestudio.puzzle', '🧩 Puzzle'))
                )
              ),
              h('span', { className: 'text-[0.75rem] text-slate-700' }, gameType === 'platformer'
                ? __alloT('stem.gamestudio.type_rule_side', 'Side view: gravity pulls you down 1 square each move. Up (or Space) jumps 3 squares when you stand on something.')
                : gameType === 'puzzle'
                  ? __alloT('stem.gamestudio.type_rule_puzzle', 'Puzzle: walk into a crate to push it one square (no pulling). The flag stays locked until a crate sits on every target.')
                  : __alloT('stem.gamestudio.type_rule_top', 'Top-down: no gravity. Move one square at a time in any direction.')),
              h('label', { className: 'flex items-center gap-1.5 ml-auto text-xs font-bold text-orange-900 cursor-pointer px-2.5 rounded-lg bg-orange-50 border border-orange-300', style: { minHeight: '44px' } },
                h('input', { type: 'checkbox', checked: showDanger, onChange: function() { upd({ showDanger: !showDanger }); } }),
                __alloT('stem.gamestudio.danger_map', '⚠️ Danger Map')
              ),
              h('details', { className: 'w-full' },
                h('summary', { className: 'text-xs font-bold text-rose-800 cursor-pointer py-1' }, '⚙️ ' + __alloT('stem.gamestudio.more_map_settings', 'More map settings (grid size, AI map)')),
                h('div', { className: 'flex flex-wrap gap-3 items-center pt-2' },
                  h('label', { className: 'flex items-center gap-1.5 text-xs font-bold text-rose-800' },
                    __alloT('stem.gamestudio.grid_label', 'Grid:'),
                    h('select', {
                      value: gridW + 'x' + gridH,
                      onChange: function(e) {
                        var p = e.target.value.split('x'), nw = parseInt(p[0], 10), nh = parseInt(p[1], 10);
                        // Keep everything that still fits instead of wiping the map.
                        setTiles(cleanTiles(tiles, nw, nh), { extra: { gridW: nw, gridH: nh, tileCur: 0 } });
                      },
                      'aria-label': __alloT('stem.gamestudio.grid_size', 'Grid size'),
                      className: 'text-xs border border-rose-600 rounded-lg px-2 py-1.5 bg-white text-slate-900 font-bold'
                    },
                      ['8x6','12x8','16x12','20x15','24x18'].map(function(s) { return h('option', { key: s, value: s }, s); })
                    )
                  ),
                  // AI Map Gen
                  callGemini && h('button', { onClick: function() {
                      if (aiPrompt && String(aiPrompt).trim()) {
                        var _gsChecker = (window.__alloShared && window.__alloShared.SafetyContentChecker) || window.SafetyContentChecker || null;
                        var _gsFlags = null;
                        try { _gsFlags = (_gsChecker && _gsChecker.check) ? _gsChecker.check(String(aiPrompt)) : null; } catch (_) { _gsFlags = null; }
                        var _gsCrit = Array.isArray(_gsFlags) && _gsFlags.find(function(f) { return f && f.severity === 'critical' && !(f.category === 'harm_to_others' && /^(attack|shoot)$/i.test(String(f.match || '').trim())); });
                        if (_gsCrit) {
                          if (typeof ctx.onSafetyFlag === 'function') {
                            try { ctx.onSafetyFlag(Object.assign({}, _gsCrit, { source: 'stem_gameStudio_map_prompt', context: String(aiPrompt).slice(0, 100), aiGenerated: false })); } catch (_) {}
                          }
                          upd({ aiLoading: false, aiResult: 'Paused for safety — please talk to a trusted adult, call or text 988, or text HOME to 741741. You are not alone.' });
                          return;
                        }
                      }
                      upd({ aiLoading: true });
                      var prompt = 'Generate a ' + gridW + 'x' + gridH + ' tile map for a ' + gameType + ' game as JSON. ' +
                        'Use ONLY these tile IDs: empty, grass, water, wall, lava, ice, sand, path, door, key, coin, gem, flag, spikes, heart, portal, platform, player, enemy, npc, treasure, crate, target. ' +
                        'Return ONLY a JSON object like {"tiles":{"0,0":"grass","1,0":"wall",...}} where keys are "x,y". ' +
                        'Include exactly 1 player, 1 flag (goal), 3-5 enemies, 5-10 coins, 1-2 keys and doors, and appropriate terrain. ' +
                        (aiPrompt ? 'Theme: ' + aiPrompt + '. ' : '') + 'No markdown, no explanation, ONLY the JSON.';
                      callGemini(prompt).then(function(res) {
                        try {
                          var clean = res.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
                          var parsed = JSON.parse(clean, function(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
                          if (parsed && parsed.tiles) { setTiles(cleanTiles(parsed.tiles, gridW, gridH), { extra: { aiLoading: false, aiResult: '✅ Map generated! Test it: can it be won?' } }); }
                          else upd({ aiLoading: false, aiResult: '⚠️ Invalid format' });
                        } catch(e) { upd({ aiLoading: false, aiResult: '❌ Parse error' }); }
                      }).catch(function() { upd({ aiLoading: false, aiResult: '❌ AI error' }); });
                    },
                    disabled: aiLoading,
                    'aria-busy': aiLoading,
                    'aria-label': aiLoading ? __alloT('stem.gamestudio.a11y_generating_game_asset', 'Generating game asset') : __alloT('stem.gamestudio.a11y_ai_generate_game_asset', 'AI generate game asset'),
                    className: 'px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all ' +
                      (aiLoading ? 'bg-gray-500' : 'bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800 shadow-sm')
                  }, aiLoading ? '⏳ Generating...' : '✨ AI Generate')
                ),
                callGemini && h('div', { className: 'flex gap-2 pt-2' },
                  h('input', {
                    type: 'text', value: aiPrompt,
                    onChange: function(e) { upd({ aiPrompt: e.target.value }); },
                    placeholder: __alloT('stem.gamestudio.theme_forest_maze_ice_castle_dungeon', 'Theme: forest maze, ice castle, dungeon...'),
                    'aria-label': __alloT('stem.gamestudio.ai_map_generation_theme', 'AI map generation theme'),
                    className: 'flex-1 text-xs border border-rose-600 rounded-lg px-2.5 py-2 bg-white text-slate-900'
                  }),
                  aiResult && h('span', { className: 'text-xs font-bold self-center ' + (aiResult.charAt(0) === '✅' ? 'text-green-700' : 'text-red-700') }, aiResult)
                )
              )
            ),

            // ---- Tile palette + brush tools; the chosen tile's rule is always written out ----
            h('div', { className: 'gs-panel p-3.5 rounded-xl border border-rose-200 bg-white' },
              h('div', { className: 'flex flex-wrap items-center gap-2 mb-2.5' },
                h('span', { className: 'text-xs font-extrabold text-rose-900 uppercase tracking-wide' }, __alloT('stem.gamestudio.tiles', 'Tiles')),
                h('span', { className: 'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-900 border border-rose-300' },
                  h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: activeBrushInfo.color, border: '1px solid rgba(15,23,42,0.3)' } }),
                  (activeBrushInfo.emoji ? activeBrushInfo.emoji + ' ' : '') + activeBrushInfo.label + ' · ' + brushTool
                ),
                h('div', { className: 'flex gap-1 ml-auto' },
                  [{ id: 'brush', icon: '✏️', label: __alloT('stem.gamestudio.map_tool_brush', 'Map tool: Brush') }, { id: 'fill', icon: '🪣', label: __alloT('stem.gamestudio.map_tool_fill', 'Map tool: Fill') }, { id: 'eraser', icon: '🧹', label: __alloT('stem.gamestudio.map_tool_eraser', 'Map tool: Eraser') }, { id: 'eyedropper', icon: '💧', label: __alloT('stem.gamestudio.map_tool_eyedropper', 'Map tool: Pick a tile from the map') }].map(function(bt) {
                    return h('button', { key: bt.id,
                      'aria-pressed': brushTool === bt.id,
                      onClick: function() { upd({ brushTool: bt.id }); },
                      style: tool44,
                      className: 'px-2.5 py-1.5 rounded-lg text-sm border transition-all cursor-pointer ' + (brushTool === bt.id ? 'bg-rose-100 border-rose-600 shadow-inner' : 'border-slate-500 hover:bg-rose-50'),
                      'aria-label': bt.label,
                      title: bt.label
                    }, bt.icon);
                  })
                )
              ),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                TILE_PALETTE.map(function(t) {
                  return h('button', { key: t.id,
                    'aria-label': t.label,
                    'aria-pressed': selectedTile === t.id,
                    onClick: function() { upd({ selectedTile: t.id, brushTool: 'brush' }); },
                    className: 'relative rounded-lg border-2 flex items-center justify-center text-base transition-all cursor-pointer ' +
                      (selectedTile === t.id ? 'border-rose-700 ring-2 ring-rose-300 shadow-sm scale-105' : 'border-slate-500 hover:border-rose-600'),
                    style: { background: t.color, width: '44px', height: '44px' },
                    title: t.label + ': ' + tileRule(t.id)
                  },
                    // The tile color also sits on a child, so it survives the high-contrast theme's black buttons.
                    h('span', { 'aria-hidden': 'true', className: 'gs-swatch-fill', style: { position: 'absolute', inset: 0, borderRadius: '4px', backgroundColor: t.color } }),
                    h('span', { style: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, pieceArt(t.id, '30px') || t.emoji || ''));
                })
              ),
              h('p', { className: 'mt-2 mb-0 text-xs text-slate-800 leading-snug', 'aria-live': 'polite' },
                h('strong', null, (activeBrushInfo.emoji ? activeBrushInfo.emoji + ' ' : '') + activeBrushInfo.label + ': '),
                tileRule(activeBrushInfo.id))
            ),

            // ---- Tile grid viewport frame ----
            h('div', {
              className: 'gs-panel rounded-2xl border-2 border-rose-300 bg-slate-900 p-3 overflow-auto',
              style: {
                maxHeight: '560px',
                background: gameType === 'platformer'
                  ? 'linear-gradient(180deg, #0b1936 0%, #172554 54%, #0f172a 100%)'
                  : gameType === 'puzzle'
                    ? 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 65%, #020617 100%)'
                    : 'radial-gradient(circle at 50% 35%, #11243a 0%, #0f172a 68%, #020617 100%)',
                boxShadow: 'inset 0 0 32px rgba(2,6,23,0.72), 0 12px 28px -12px rgba(15,23,42,0.55)'
              }
            },
              h('div', { className: 'flex flex-wrap items-center justify-between gap-2 text-[0.75rem] font-bold text-slate-200 mb-2' },
                h('span', null, '🗺️ ' + projectName + ' (' + gridW + '×' + gridH + ')'),
                showDanger && engineS.chase === 0 && !engineS.rules.enemy ? h('span', { className: 'text-amber-200' }, __alloT('stem.gamestudio.danger_no_chase', 'Enemy chase range is 0: enemies only patrol. Yellow rings mark squares that hurt.')) : showDanger && h('span', { className: 'text-amber-200' }, '⚠️ ' + __alloT('stem.gamestudio.danger_legend', 'Red = an enemy can chase you there (enemies chase when you are {n} or fewer steps away). Number = how many enemies. Yellow ring = it hurts.').replace('{n}', engineS.chase))
              ),
              // Touch screens: choose what a finger drag on the map does. Taps always paint.
              coarse && h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                h('div', { role: 'group', 'aria-label': __alloT('stem.gamestudio.touch_mode_label', 'What a finger drag on the map does'), className: 'inline-flex rounded-xl overflow-hidden border-2 border-rose-300' },
                  [{ on: false, icon: '✋', label: __alloT('stem.gamestudio.touch_scroll', 'Scroll') }, { on: true, icon: '🖌️', label: __alloT('stem.gamestudio.touch_paint', 'Paint') }].map(function(m) {
                    var act = touchPaint === m.on;
                    return h('button', { key: m.label, type: 'button', 'aria-pressed': act ? 'true' : 'false', onClick: function() { upd({ touchPaint: m.on }); },
                      style: { minHeight: '44px', minWidth: '88px' },
                      className: 'px-3 text-xs font-black ' + (act ? 'bg-rose-200 text-rose-950' : 'bg-slate-800 text-slate-100') }, m.icon + ' ' + m.label);
                  })
                ),
                h('span', { className: 'text-[0.75rem] font-bold text-slate-200' }, touchPaint
                  ? (dragOk ? __alloT('stem.gamestudio.touch_paint_hint', 'Drag a finger to paint. Undo takes back a whole drag.') : __alloT('stem.gamestudio.touch_paint_tool', 'Drag paints with the Brush or Eraser. Tap to use this tool.'))
                  : __alloT('stem.gamestudio.touch_scroll_hint', 'Drag to scroll the page. Tap a square to paint it.'))
              ),
              h('div', Object.assign({
                role: 'group', className: 'gs-paint-grid',
                'aria-label': __alloT('stem.gamestudio.tile_grid_label', 'Level map. Arrow keys move between tiles; Enter or Space uses the current tool.'),
                style: {
                  touchAction: (coarse && touchPaint && dragOk) ? 'none' : undefined,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(' + gridW + ', 1fr)',
                  gap: '1px', background: 'rgba(51,65,85,0.68)', border: '2px solid rgba(148,163,184,0.42)', borderRadius: '10px', overflow: 'hidden',
                  // Cells stay at least 24 px (WCAG 2.5.8) — on a phone the map scrolls sideways inside its frame.
                  maxWidth: Math.max(Math.min(gridW * 30, 720), gridW * 25) + 'px', minWidth: (gridW * 25) + 'px', margin: '0 auto',
                  boxShadow: '0 10px 26px rgba(2,6,23,0.55)'
                }
              }, gridPointer),
                Array.from({ length: gridW * gridH }, function(_, i) {
                  var x = i % gridW, y = Math.floor(i / gridW);
                  var k = x + ',' + y;
                  var tId = TILE_MAP[tiles[k]] ? tiles[k] : 'empty';
                  var tInfo = TILE_MAP[tId] || TILE_MAP.empty;
                  var danger = (showDanger && !GS_E.BLOCK[tId]) ? (zone[k] || 0) : 0;
                  var hurtsHere = showDanger && (tId === 'lava' || tId === 'spikes' || tId === 'enemy');
                  var onRoute = !!routeSet[k];
                  var isSolidTile = tId === 'wall' || tId === 'platform' || tId === 'door' || tId === 'ice' || tId === 'grass' || tId === 'sand';
                  var isBeaconTile = tId === 'player' || tId === 'flag' || tId === 'portal' || tId === 'coin' || tId === 'gem' || tId === 'key' || tId === 'heart' || tId === 'lava' || tId === 'enemy';
                  // Opaque (the same look as the old see-through shades), so the high-contrast yellow grid does not tint them.
                  var emptyShade = (x + y) % 2 === 0 ? '#141c2f' : '#192439';
                  var tileBg = tId === 'empty' ? emptyShade : tInfo.color;
                  var dangerImg = danger > 0 ? 'linear-gradient(rgba(239,68,68,' + Math.min(0.62, 0.2 + danger * 0.14) + '), rgba(239,68,68,' + Math.min(0.62, 0.2 + danger * 0.14) + '))' : undefined;
                  var tileShadow = hurtsHere ? 'inset 0 0 0 2px #fde047'
                    : tId === 'player' ? 'inset 0 0 12px rgba(167,139,250,0.65), 0 0 8px rgba(139,92,246,0.5)'
                    : tId === 'flag' ? 'inset 0 0 12px rgba(52,211,153,0.65)'
                    : tId === 'portal' ? 'inset 0 0 12px rgba(192,132,252,0.7)'
                    : tId === 'lava' ? 'inset 0 0 10px rgba(251,146,60,0.8)'
                    : tId === 'crate' ? 'inset 0 0 0 2px #fbbf24, inset 0 3px 0 rgba(255,255,255,0.25)'
                    : isSolidTile ? 'inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(2,6,23,0.42)'
                    : undefined;
                  var paintTile = function(opts) {
                    if (brushTool === 'eyedropper') { upd({ selectedTile: tId, brushTool: 'brush' }); return; }
                    var nt = Object.assign({}, tiles);
                    if (brushTool === 'eraser') { if (!nt[k]) return; delete nt[k]; }
                    else if (brushTool === 'fill' && selectedTile !== 'player') {
                      var target = nt[k] || 'empty';
                      if (target === selectedTile) return;
                      floodFill(nt, x, y, target, selectedTile, gridW, gridH);
                    } else {
                      if (nt[k] === selectedTile) return;
                      // One player: placing the Player moves it here.
                      if (selectedTile === 'player') Object.keys(nt).forEach(function(pk) { if (nt[pk] === 'player') delete nt[pk]; });
                      if (selectedTile === 'empty') delete nt[k]; else nt[k] = selectedTile;
                    }
                    setTiles(nt, opts);
                  };
                  var cellLabel = __alloT('stem.gamestudio.tile_cell', 'Column {x}, row {y}: {tile}').replace('{x}', x + 1).replace('{y}', y + 1).replace('{tile}', tInfo.label)
                    + (onRoute ? ', ' + __alloT('stem.gamestudio.cell_on_route', 'on the best route') : '')
                    + (danger > 0 ? ', ' + __alloT('stem.gamestudio.cell_chase', '{n} enemy can chase you here').replace('{n}', danger) : '');
                  return h('div', {
                    key: k, role: 'button', tabIndex: i === tileCur ? 0 : -1,
                    className: 'gs-tile-cell' + (i === tileCur ? ' gs-tile-cell-cur' : ''),
                    'aria-label': cellLabel,
                    onKeyDown: function(e) { gsGridKey(e, i, gridW, gridH, 'tileCur', paintTile); },
                    onFocus: function() { if (i !== tileCur) upd({ tileCur: i }); },
                    'data-gs-cell': i,
                    // Mouse and touch presses paint in the grid's pointer handlers; a click from the
                    // keyboard, a screen reader or a touch tap in Scroll mode paints here.
                    onClick: function() { if (Date.now() < (_gsHist.current.skipClickUntil || 0)) return; paintTile(); },
                    style: {
                      width: '100%', aspectRatio: '1', position: 'relative',
                      backgroundColor: tileBg,
                      backgroundImage: dangerImg,
                      boxShadow: tileShadow,
                      cursor: 'crosshair', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: Math.min(22, Math.floor(560 / gridW)) + 'px',
                      userSelect: 'none', minWidth: '12px', minHeight: '12px'
                    }
                  }, (danger > 0 && (tId === 'empty' || tId === 'grass' || tId === 'path' || tId === 'sand' || tId === 'ice'))
                    ? h('span', { 'aria-hidden': 'true', className: 'gs-danger-num', style: { fontSize: '12px', fontWeight: 900, color: '#ffffff', textShadow: '0 1px 2px #000' } }, danger)
                    : (pieceArt(tId) || (tInfo.emoji ? h('span', { 'aria-hidden': 'true', style: { filter: isBeaconTile ? 'drop-shadow(0 2px 2px rgba(2,6,23,0.72))' : 'drop-shadow(0 1px 1px rgba(2,6,23,0.45))' } }, tInfo.emoji) : '')),
                    onRoute && h('span', { 'aria-hidden': 'true', style: { position: 'absolute', width: '34%', height: '34%', borderRadius: '50%', background: '#fde047', border: '2px solid #713f12', boxShadow: '0 0 4px rgba(0,0,0,0.6)', opacity: 0.92, pointerEvents: 'none' } }));
                })
              )
            ),

            // ---- Level check result (from the game engine) ----
            (check || staleCheck) && h('div', { role: 'status', className: 'gs-panel p-3 rounded-xl border-2 ' + (check && check.winnable ? 'border-emerald-400 bg-emerald-50' : 'border-indigo-300 bg-indigo-50') + ' space-y-1.5' },
              staleCheck && h('p', { className: 'text-xs font-bold text-indigo-950 m-0' }, '🔄 ' + __alloT('stem.gamestudio.check_stale', 'You changed the level (or its rules). Test it again to see what changed.')),
              check && h('p', { className: 'text-sm font-bold m-0 ' + (check.winnable ? 'text-emerald-950' : 'text-indigo-950') }, (check.winnable ? '✅ ' : '🧪 ') + checkText(check)),
              check && coinText(check) && h('p', { className: 'text-xs text-slate-800 m-0' }, coinText(check)),
              check && check.winnable && h('label', { className: 'inline-flex items-center gap-2 text-xs font-bold text-emerald-950 cursor-pointer', style: { minHeight: '44px' } },
                h('input', { type: 'checkbox', checked: !!_gs.showRoute, onChange: function() { upd({ showRoute: !_gs.showRoute }); } }),
                __alloT('stem.gamestudio.show_route', 'Show the best route on the map (gold dots)')),
              check && h('p', { className: 'text-[0.75rem] text-slate-700 m-0' }, __alloT('stem.gamestudio.check_how', 'How it knows: the game engine plays every possible move, using the same rules as Play, and keeps the route that loses the fewest lives, then takes the fewest moves.'))
            ),

            // Stats bar (pill chips)
            h('div', { className: 'flex flex-wrap gap-2 text-xs text-rose-900 font-bold' },
              [
                '🔍 ' + gridW + '×' + gridH + ' = ' + (gridW * gridH),
                '🧑 Players: ' + countTile(tiles, 'player'),
                '👾 Enemies: ' + countTile(tiles, 'enemy'),
                '🪙 Coins: ' + countTile(tiles, 'coin'),
                '🔑 Keys: ' + countTile(tiles, 'key'),
                '🚪 Doors: ' + countTile(tiles, 'door'),
                '🚩 Flags: ' + countTile(tiles, 'flag')
              ].map(function(stat, si) {
                return h('span', { key: si, className: 'px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200' }, stat);
              })
            )
          );
          })(),


          // ============================================================
          // SPRITE EDITOR TAB
          // ============================================================
          gsTab === 'sprite' && h('div', { className: 'space-y-4' },

            // Presets
            h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
              h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.sprite_presets', 'Sprite Presets')),
              h('div', { className: 'flex flex-wrap gap-2' },
                SPRITE_PRESETS.map(function(sp) {
                  return h('button', { key: sp.id,
                    'aria-pressed': activeSprite === sp.id,
                    onClick: function() { setSpritePixels(Object.assign({}, sp.pixels), { extra: { activeSprite: sp.id, spriteColor: sp.color } }); },
                    className: 'px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ' +
                      (activeSprite === sp.id ? 'border-rose-600 bg-rose-50 shadow-md' : 'border-slate-500 hover:border-rose-600')
                  }, '\uD83C\uDFA8 ' + sp.name);
                }),
                h('button', { 'aria-label': __alloT('stem.gamestudio.aria_new_sprite', 'New sprite'),
                  onClick: function() { setSpritePixels({}, { extra: { activeSprite: 'custom_' + Date.now(), spriteColor: '#e74c3c' } }); },
                  className: 'px-3 py-2 rounded-lg border-2 border-dashed border-rose-600 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-all'
                }, __alloT('stem.gamestudio.new', '\u2795 New'))
              )
            ),

            // Canvas + tools
            h('div', { className: 'flex gap-4 flex-wrap items-start' },
              // 16x16 pixel canvas + Live Multi-Scale SVG Preview
              h('div', { className: 'gs-panel p-3.5 rounded-xl border border-rose-200 bg-white space-y-3', style: { maxWidth: '100%' } },
                // Touch screens: choose what a finger drag on the pixels does (shared with the map). Taps always draw.
                spriteCoarse && h('div', { className: 'flex flex-wrap items-center gap-2' },
                  h('div', { role: 'group', 'aria-label': __alloT('stem.gamestudio.touch_mode_sprite_label', 'What a finger drag on the pixels does'), className: 'inline-flex rounded-xl overflow-hidden border-2 border-rose-700' },
                    [{ on: false, icon: '✋', label: __alloT('stem.gamestudio.touch_scroll', 'Scroll') }, { on: true, icon: '🖌️', label: __alloT('stem.gamestudio.touch_paint', 'Paint') }].map(function(m) {
                      var act = !!_gs.touchPaint === m.on;
                      return h('button', { key: m.label, type: 'button', 'aria-pressed': act ? 'true' : 'false', onClick: function() { upd({ touchPaint: m.on }); },
                        style: { minHeight: '44px', minWidth: '88px' },
                        className: 'px-3 text-xs font-black ' + (act ? 'bg-rose-700 text-white' : 'bg-white text-rose-950') }, m.icon + ' ' + m.label);
                    })
                  ),
                  h('span', { className: 'text-[0.75rem] font-bold text-slate-800', style: { maxWidth: '320px' } }, _gs.touchPaint
                    ? (spriteDragOk ? __alloT('stem.gamestudio.touch_sprite_paint_hint', 'Drag a finger to draw. Undo takes back a whole drag.') : __alloT('stem.gamestudio.touch_sprite_paint_tool', 'Drag draws with Draw or Erase. Tap to fill.'))
                    : __alloT('stem.gamestudio.touch_sprite_scroll_hint', 'Drag to scroll the page. Tap a pixel to draw it.'))
                ),
                h('div', Object.assign({
                  role: 'group', className: 'gs-paint-grid',
                  'aria-label': __alloT('stem.gamestudio.sprite_grid_label', 'Sprite pixels, 16 by 16. Arrow keys move between pixels; Enter or Space uses the current tool.'),
                  style: {
                    touchAction: (spriteCoarse && _gs.touchPaint && spriteDragOk) ? 'none' : undefined,
                    display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)',
                    gap: '1px', background: '#cbd5e1', width: 'min(320px, 100%)', aspectRatio: '1',
                    border: '2px solid #64748b', borderRadius: '10px', overflow: 'hidden'
                  }
                }, spritePointer),
                  Array.from({ length: 256 }, function(_, i) {
                    var sx = i % 16, sy = Math.floor(i / 16);
                    var sk = sx + ',' + sy;
                    var px = spritePixels[sk] || null;
                    var paintPixel = function() {
                      if (spriteTool === 'fill') {
                        var nf = {};
                        for (var fi = 0; fi < 256; fi++) nf[(fi % 16) + ',' + Math.floor(fi / 16)] = spriteColor;
                        setSpritePixels(nf);
                        return;
                      }
                      var np = spriteStroke(spritePixels, sx, sy);
                      if (np) setSpritePixels(np);
                    };
                    return h('div', {
                      key: sk, role: 'button', tabIndex: i === spriteCur ? 0 : -1, 'data-gs-px': 1, 'data-gs-pxi': i,
                      className: i === spriteCur ? 'gs-pixel-cell-cur' : undefined,
                      'aria-label': __alloT('stem.gamestudio.pixel_cell', 'Pixel column {x}, row {y}: {color}').replace('{x}', sx + 1).replace('{y}', sy + 1).replace('{color}', px || __alloT('stem.gamestudio.pixel_empty', 'empty')),
                      onKeyDown: function(e) { gsGridKey(e, i, 16, 16, 'spriteCur', paintPixel); },
                      onFocus: function() { if (i !== spriteCur) upd({ spriteCur: i }); },
                      // Mouse and touch presses draw in the grid's pointer handlers; a click from the
                      // keyboard, a screen reader or a touch tap in Scroll mode draws here.
                      onClick: function() { if (Date.now() < (_gsSpHist.current.skipClickUntil || 0)) return; paintPixel(); },
                      style: {
                        // backgroundColor, not background: high contrast blacks out an inline "background: white", which hid white pixels.
                        backgroundColor: px || (((sx + sy) % 2 === 0) ? '#f1f5f9' : '#e2e8f0'),
                        boxShadow: px ? 'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(15,23,42,0.22)' : undefined,
                        borderRight: spriteMirror && sx === 7 ? '1px solid rgba(225,29,72,0.55)' : undefined,
                        cursor: 'crosshair'
                      }
                    });
                  })
                ),
                // Live multi-scale SVG preview strip (specular bevel + grounded contact shadow)
                (function() {
                  var keys = Object.keys(spritePixels);
                  var rects = keys.map(function(pk) {
                    var xy = pk.split(',');
                    var rx = parseInt(xy[0], 10), ry = parseInt(xy[1], 10);
                    return h('rect', { key: pk, x: rx, y: ry, width: 1, height: 1, fill: spritePixels[pk] });
                  });
                  var specTop = keys.filter(function(pk) {
                    var xy = pk.split(',');
                    return !spritePixels[xy[0] + ',' + (parseInt(xy[1], 10) - 1)];
                  }).map(function(pk) {
                    var xy = pk.split(',');
                    return h('rect', { key: 'sp' + pk, x: parseInt(xy[0], 10), y: parseInt(xy[1], 10), width: 1, height: 0.28, fill: 'rgba(255,255,255,0.38)' });
                  });
                  return h('div', { className: 'flex items-center justify-between gap-2 pt-2 border-t border-slate-200 flex-wrap' },
                    h('span', { className: 'text-xs font-bold text-slate-700' }, '👁️ ' + __alloT('stem.gamestudio.live_preview', 'Live Sprite Preview')),
                    h('div', { className: 'flex items-center gap-2' },
                      h('div', { className: 'p-1.5 rounded-lg border border-slate-300 bg-slate-50 flex items-center justify-center', title: __alloT('stem.gamestudio.preview_2x_light', '2× light preview') },
                        h('svg', { viewBox: '0 0 16 18', width: 32, height: 36, style: { shapeRendering: 'crispEdges', display: 'block' }, 'aria-hidden': 'true' },
                          keys.length > 0 && h('ellipse', { cx: 8, cy: 16.4, rx: 5.2, ry: 1.1, fill: 'rgba(15,23,42,0.18)', style: { shapeRendering: 'auto' } }),
                          rects, specTop
                        )
                      ),
                      h('div', { className: 'p-1.5 rounded-lg border border-slate-600 flex items-center justify-center', style: { background: 'radial-gradient(circle at 50% 42%, #1e293b 0%, #090e1c 100%)', boxShadow: 'inset 0 0 12px rgba(2,6,23,0.85)' }, title: __alloT('stem.gamestudio.preview_3x_dark', '3× dark arcade preview') },
                        h('svg', { viewBox: '0 0 16 18', width: 48, height: 54, style: { shapeRendering: 'crispEdges', display: 'block' }, 'aria-hidden': 'true' },
                          keys.length > 0 && h('ellipse', { cx: 8, cy: 16.4, rx: 5.5, ry: 1.2, fill: 'rgba(0,0,0,0.55)', style: { shapeRendering: 'auto' } }),
                          h('g', { className: keys.length > 0 ? 'gs-sprite-bob' : undefined }, rects, specTop)
                        )
                      )
                    )
                  );
                })()
              ),

              // Tools panel
              h('div', { className: 'flex-1 space-y-3', style: { minWidth: '180px' } },
                // Color picker
                h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
                  h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.color', 'Color')),
                  h('input', { 'aria-label': __alloT('stem.gamestudio.color', 'Color'), type: 'color', value: spriteColor, onChange: function(e) { upd({ spriteColor: e.target.value }); }, className: 'w-full h-8 rounded cursor-pointer border border-slate-500' }),
                  h('div', { className: 'flex gap-1 mt-2 flex-wrap' },
                    ['#e74c3c','#f39c12','#f1c40f','#2ecc71','#3498db','#9b59b6','#1abc9c','#ecf0f1','#34495e','#000000','#ffffff','#e67e22'].map(function(c) {
                      return h('button', { 'aria-label': __alloT('stem.gamestudio.aria_sprite_color', 'Sprite color: {name}').split('{name}').join(({ '#e74c3c': __alloT('stem.gamestudio.swatch_red', 'Red'), '#f39c12': __alloT('stem.gamestudio.swatch_orange', 'Orange'), '#f1c40f': __alloT('stem.gamestudio.swatch_yellow', 'Yellow'), '#2ecc71': __alloT('stem.gamestudio.swatch_green', 'Green'), '#3498db': __alloT('stem.gamestudio.swatch_blue', 'Blue'), '#9b59b6': __alloT('stem.gamestudio.swatch_purple', 'Purple'), '#1abc9c': __alloT('stem.gamestudio.swatch_teal', 'Teal'), '#ecf0f1': __alloT('stem.gamestudio.swatch_light_gray', 'Light gray'), '#34495e': __alloT('stem.gamestudio.swatch_dark_slate', 'Dark slate'), '#000000': __alloT('stem.gamestudio.swatch_black', 'Black'), '#ffffff': __alloT('stem.gamestudio.swatch_white', 'White'), '#e67e22': __alloT('stem.gamestudio.swatch_dark_orange', 'Dark orange') })[c] || c),
                        key: c,
                        'aria-pressed': spriteColor === c,
                        onClick: function() { upd({ spriteColor: c }); },
                        className: 'w-7 h-7 rounded border-2 transition-all relative ' + (spriteColor === c ? 'border-rose-700 ring-2 ring-rose-300 scale-110' : 'border-slate-500'),
                        style: { background: c }
                      },
                        // The color also sits on a child: the high-contrast theme paints every button black
                        // (and any inline "background: white"), so this uses backgroundColor.
                        h('span', { 'aria-hidden': 'true', className: 'gs-swatch-fill', style: { position: 'absolute', inset: 0, borderRadius: '2px', backgroundColor: c } }));
                    })
                  )
                ),
                // Draw tools
                h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
                  h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.tools', 'Tools')),
                  h('div', { className: 'flex gap-1' },
                    [{ id: 'draw', icon: '\u270F\uFE0F' }, { id: 'erase', icon: '\uD83E\uDDF9' }, { id: 'fill', icon: '\uD83E\uDEA3' }].map(function(t) {
                      return h('button', { 'aria-label': t.id === 'erase' ? __alloT('stem.gamestudio.aria_sprite_tool_erase', 'Sprite tool: Erase') : t.id === 'fill' ? __alloT('stem.gamestudio.aria_sprite_tool_fill', 'Sprite tool: Fill') : __alloT('stem.gamestudio.aria_sprite_tool_draw', 'Sprite tool: Draw'),
                        key: t.id,
                        'aria-pressed': spriteTool === t.id,
                        onClick: function() { upd({ spriteTool: t.id }); },
                        style: { minHeight: 44 },
                        className: 'flex-1 py-1.5 rounded text-sm transition-all border ' + (spriteTool === t.id ? 'bg-rose-200 border-rose-600 shadow-inner font-bold' : 'border-slate-500 hover:bg-rose-50')
                      }, t.icon);
                    })
                  ),
                  h('label', { className: 'flex items-center gap-2 mt-2 text-xs text-rose-600 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: spriteMirror, onChange: function() { upd({ spriteMirror: !spriteMirror }); } }),
                    __alloT('stem.gamestudio.mirror_3', 'Mirror \u2194\uFE0F')
                  ),
                  h('div', { className: 'flex gap-1 mt-2' },
                    h('button', { type: 'button', onClick: undoSprite, disabled: !_gsSpHist.current.past.length, 'aria-label': __alloT('stem.gamestudio.undo_sprite', 'Undo sprite change'), title: __alloT('stem.gamestudio.undo_sprite', 'Undo sprite change'), style: { minHeight: '44px', minWidth: '44px' },
                      className: 'rounded-lg text-base border border-slate-500 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 cursor-pointer' }, '\u21B6'),
                    h('button', { type: 'button', onClick: redoSprite, disabled: !_gsSpHist.current.future.length, 'aria-label': __alloT('stem.gamestudio.redo_sprite', 'Redo sprite change'), title: __alloT('stem.gamestudio.redo_sprite', 'Redo sprite change'), style: { minHeight: '44px', minWidth: '44px' },
                      className: 'rounded-lg text-base border border-slate-500 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 cursor-pointer' }, '\u21B7')
                  )
                ),
                // AI sprite gen
                callImagen && h('div', { className: 'p-3 rounded-xl border border-purple-200 bg-purple-50 space-y-2' },
                  h('div', { className: 'text-xs font-bold text-purple-700' }, __alloT('stem.gamestudio.ai_sprite_tools', '\uD83E\uDD16 AI Sprite Tools')),
                  h('input', { type: 'text', value: aiPrompt, onChange: function(e) { upd({ aiPrompt: e.target.value }); }, placeholder: __alloT('stem.gamestudio.a_fire_breathing_dragon', 'a fire-breathing dragon...'), 'aria-label': __alloT('stem.gamestudio.ai_sprite_generation_prompt', 'AI sprite generation prompt'), className: 'w-full text-xs border border-purple-600 rounded-lg px-2 py-1.5' }),
                  h('button', { onClick: function() {
                      if (!aiPrompt.trim()) return;
                      setAiLoading(true);
                      callImagen('Pixel art game sprite 16x16: ' + aiPrompt + '. Simple, clear, colorful, white background.', 256)
                        .then(function(imgUrl) {
                          var img = new Image(); img.crossOrigin = 'anonymous';
                          img.onload = function() {
                            var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = 16; c.height = 16;
                            var cx = c.getContext('2d'); cx.drawImage(img, 0, 0, 16, 16);
                            var data = cx.getImageData(0, 0, 16, 16).data;
                            var np = {};
                            for (var i = 0; i < 256; i++) {
                              var idx = i * 4;
                              if (data[idx + 3] > 50) {
                                np[(i % 16) + ',' + Math.floor(i / 16)] = '#' + ((1 << 24) + (data[idx] << 16) + (data[idx + 1] << 8) + data[idx + 2]).toString(16).slice(1);
                              }
                            }
                            setAiLoading(false);
                            setSpritePixels(np, { extra: { aiResult: '\u2705 Sprite generated!' } });
                          };
                          img.onerror = function() { setAiLoading(false); upd({ aiResult: '\u274C Image load error' }); };
                          img.src = imgUrl;
                        }).catch(function(e) { setAiLoading(false); upd({ aiResult: '\u274C ' + e.message }); });
                    },
                    disabled: aiLoading,
                    className: 'w-full px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all ' +
                      (aiLoading ? 'bg-slate-600' : 'bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-800 hover:to-pink-800')
                  }, aiLoading ? '\u23F3 Generating...' : '\u2728 AI Generate Sprite')
                ),
                // Clear
                h('button', { 'aria-label': __alloT('stem.gamestudio.clear_canvas', 'Clear Canvas'),
                  onClick: function() { if (Object.keys(spritePixels).length) setSpritePixels({}); },
                  className: 'w-full py-1.5 text-xs font-bold text-rose-700 border border-rose-600 rounded-lg hover:bg-rose-50 transition-all'
                }, __alloT('stem.gamestudio.clear_canvas_2', '\uD83D\uDDD1\uFE0F Clear Canvas'))
              )
            ),

            // ---- Use the drawing as the look of a game piece (Map, Play and the level test) ----
            (function() {
              var hasDrawing = Object.keys(gsCleanPixels(spritePixels)).length > 0;
              var roleName = { player: __alloT('stem.gamestudio.look_player', 'Player'), enemy: __alloT('stem.gamestudio.look_enemy', 'Enemy'), coin: __alloT('stem.gamestudio.look_coin', 'Coin'), flag: __alloT('stem.gamestudio.look_flag', 'Goal flag') };
              var setLook = function(r, px) {
                var nl = Object.assign({}, looks);
                if (px) nl[r] = px; else delete nl[r];
                upd({ looks: nl });
                var msg = px ? __alloT('stem.gamestudio.look_set', 'Your drawing is now the {who} look. The rules did not change.').replace('{who}', roleName[r])
                  : __alloT('stem.gamestudio.look_reset', 'The {who} has its default look again.').replace('{who}', roleName[r]);
                if (addToast) addToast((px ? '\uD83C\uDFA8 ' : '\u21BA ') + msg, 'success');
                if (typeof announceToSR === 'function') { try { announceToSR(msg); } catch (_) {} }
              };
              return h('div', { className: 'gs-panel p-3.5 rounded-xl border-2 border-rose-300 bg-white space-y-2.5' },
                h('h3', { className: 'text-sm font-black text-rose-900 m-0' }, '\uD83C\uDFAE ' + __alloT('stem.gamestudio.looks_title', 'Use your drawing in the game')),
                h('p', { className: 'text-xs text-slate-800 m-0' }, __alloT('stem.gamestudio.looks_intro', 'Pick a piece. Your drawing becomes how it looks on the map and in Play. Only the picture changes: an Enemy with your drawing still chases you, and a Coin is still worth {n} points.').replace('{n}', GS_E.POINTS.coin)),
                !hasDrawing && h('p', { className: 'text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5 m-0' }, __alloT('stem.gamestudio.looks_draw_first', 'Draw something on the pixel grid first (or pick a preset).')),
                h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                  LOOK_ROLES.map(function(r) {
                    var custom = !!looks[r];
                    return h('div', { key: r, className: 'p-2 rounded-xl border border-slate-300 bg-slate-50 flex flex-col items-center gap-1.5' },
                      h('div', { 'aria-hidden': 'true', className: 'rounded-lg flex items-center justify-center', style: { width: '48px', height: '48px', background: (TILE_MAP[r] || {}).color || '#334155', fontSize: '26px' } },
                        pieceArt(r, '40px') || (TILE_MAP[r] || {}).emoji || ''),
                      h('div', { className: 'text-xs font-black text-slate-900' }, roleName[r]),
                      h('div', { className: 'text-[0.75rem] text-slate-700' }, custom ? __alloT('stem.gamestudio.look_custom', 'Your drawing') : __alloT('stem.gamestudio.look_default', 'Default look')),
                      h('button', { type: 'button', disabled: !hasDrawing,
                        'aria-label': __alloT('stem.gamestudio.look_use_aria', 'Use my drawing as the {who} look').replace('{who}', roleName[r]),
                        onClick: function() { var px = gsCleanPixels(spritePixels); if (Object.keys(px).length) setLook(r, px); },
                        style: { minHeight: '44px' },
                        className: 'w-full px-2 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:bg-slate-400 disabled:cursor-not-allowed'
                      }, __alloT('stem.gamestudio.look_use', 'Use my drawing')),
                      custom && h('button', { type: 'button',
                        'aria-label': __alloT('stem.gamestudio.look_reset_aria', 'Back to the default {who} look').replace('{who}', roleName[r]),
                        onClick: function() { setLook(r, null); },
                        style: { minHeight: '44px' },
                        className: 'w-full px-2 py-1.5 rounded-lg text-xs font-bold text-rose-900 bg-white border border-rose-600 hover:bg-rose-50'
                      }, '\u21BA ' + __alloT('stem.gamestudio.look_reset_btn', 'Default look'))
                    );
                  })
                ),
                Object.keys(looks).length > 0 && h('button', { type: 'button', onClick: function() { goGsTab('map'); }, style: { minHeight: '44px' },
                  className: 'px-3 py-2 rounded-xl text-xs font-bold text-rose-900 bg-rose-50 border border-rose-600 hover:bg-rose-100' }, '\uD83D\uDDFA\uFE0F ' + __alloT('stem.gamestudio.look_see_map', 'See it on the map'))
              );
            })(),
            aiResult && h('div', { className: 'text-xs font-bold ' + (aiResult.charAt(0) === '\u2705' ? 'text-green-600' : 'text-red-500') }, aiResult)
          ),


          // ============================================================
          // EVENTS TAB
          // ============================================================
          gsTab === 'events' && h('div', { className: 'space-y-4' },

            h('div', { className: 'flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-200' },
              h('h3', { className: 'text-sm font-black text-rose-800' }, __alloT('stem.gamestudio.event_rules', '\u26A1 Event Rules')),
              h('label', { className: 'flex items-center gap-2 text-xs font-bold text-rose-600 cursor-pointer' },
                h('input', { type: 'checkbox', checked: advancedCode, onChange: function() { upd({ advancedCode: !advancedCode }); } }),
                __alloT('stem.gamestudio.show_code', '\uD83D\uDCBB Show Code')
              )
            ),

            // Info box
            h('div', { className: 'p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-700' },
              h('strong', null, __alloT('stem.gamestudio.how_events_work', 'How Events Work: ')),
              __alloT('stem.gamestudio.how_events_work_body_v2', 'Make "When X happens \u2192 Do Y" rules. Each rule says if Play runs it. Try one: Player, Collides With coin \u2192 Lose Life. Then play and watch what happens.')
            ),

            // Sprite selector
            h('div', { className: 'text-xs font-bold text-rose-600 mb-1' }, __alloT('stem.gamestudio.select_sprite_to_add_rules', 'Select sprite to add rules:')),
            h('div', { className: 'flex flex-wrap gap-1 mb-3' },
              ['player','enemy','npc','treasure'].map(function(sid) {
                var sprEvents = events[sid] || [];
                var icons = { player: '\uD83E\uDDD1', enemy: '\uD83D\uDC7E', npc: '\uD83E\uDDD9', treasure: '\uD83D\uDC8E' };
                return h('button', { key: sid,
                  'aria-pressed': evSprite === sid,
                  onClick: function() { upd({ eventSprite: sid }); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ' +
                    (evSprite === sid ? 'border-rose-600 bg-rose-100 text-rose-950 shadow-md' : 'border-slate-500 bg-white text-slate-900 hover:border-rose-600')
                }, (icons[sid] || '') + ' ' + sid.charAt(0).toUpperCase() + sid.slice(1) + ' (' + sprEvents.length + ')');
              })
            ),

            // Event rules
            (function() {
              var sprEvents = events[evSprite] || [];
              var TRIGGERS = [
                { id: 'onKey', label: __alloT('stem.gamestudio.key_pressed', 'Key Pressed'), params: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'] },
                { id: 'onCollide', label: __alloT('stem.gamestudio.collides_with', 'Collides With'), params: ['wall','coin','enemy','lava','door','key','npc','spikes','flag','portal','ice'] },
                // Play takes turns, so "Every" counts moves, not seconds.
                { id: 'onTimer', label: __alloT('stem.gamestudio.every', 'Every'), params: ['1','2','3','4','5'] },
                { id: 'onStart', label: __alloT('stem.gamestudio.game_starts', 'Game Starts'), params: [] },
                { id: 'onTalk', label: __alloT('stem.gamestudio.player_talks', 'Player Talks'), params: [] }
              ];
              // Only the triggers Play can run for each sprite are offered (a saved rule keeps its own, with a note why).
              var TRIG_OK = { player: ['onKey', 'onCollide', 'onTimer', 'onStart', 'onTalk'], enemy: ['onStart', 'onTimer', 'onCollide'], npc: ['onCollide', 'onTalk'], treasure: ['onCollide', 'onTalk'] };
              var ACTIONS = [
                { id: 'move', label: __alloT('stem.gamestudio.move', 'Move'), params: ['up','down','left','right','toward-player','random'] },
                { id: 'collect', label: __alloT('stem.gamestudio.collect', 'Collect'), params: ['+1 score','+key'] },
                { id: 'stop', label: __alloT('stem.gamestudio.stop', 'Stop'), params: [] },
                { id: 'destroy', label: __alloT('stem.gamestudio.destroy', 'Destroy'), params: ['self','other'] },
                { id: 'teleport', label: __alloT('stem.gamestudio.teleport', 'Teleport'), params: ['start','random-empty'] },
                { id: 'bounce', label: __alloT('stem.gamestudio.bounce', 'Bounce'), params: [] },
                { id: 'winGame', label: __alloT('stem.gamestudio.win_game', 'Win Game!'), params: [] },
                { id: 'loseLife', label: __alloT('stem.gamestudio.lose_life', 'Lose Life'), params: [] },
                { id: 'gravity', label: __alloT('stem.gamestudio.gravity', 'Gravity'), params: ['on','off'] },
                { id: 'jump', label: __alloT('stem.gamestudio.jump', 'Jump'), params: ['1','2','3','4','5'] },
                { id: 'push', label: __alloT('stem.gamestudio.push', 'Push'), params: [] },
                { id: 'aiTalk', label: __alloT('stem.gamestudio.ai_npc_talk', 'AI NPC Talk'), params: [] }
              ];

              return h('div', { className: 'space-y-2' },
                sprEvents.map(function(rule, ri) {
                  return h('div', { key: ri, className: 'p-3 rounded-xl border border-rose-200 bg-white' },
                    h('div', { className: 'flex gap-2 items-center flex-wrap' },
                      h('span', { className: 'text-xs font-bold text-slate-600' }, __alloT('stem.gamestudio.when', 'When')),
                      h('select', { 'aria-label': __alloT('stem.gamestudio.when', 'When'),
                        value: rule.trigger || 'onKey',
                        onChange: function(e) {
                          var ne = Object.assign({}, events);
                          var arr = (ne[evSprite] || []).slice();
                          arr[ri] = Object.assign({}, arr[ri], { trigger: e.target.value, param: e.target.value === 'onTimer' ? '2' : '' });
                          ne[evSprite] = arr; upd({ events: ne });
                        },
                        className: 'text-xs border border-rose-600 rounded px-1.5 py-1 bg-rose-50 font-bold'
                      }, TRIGGERS.filter(function(t) { return TRIG_OK[evSprite].indexOf(t.id) >= 0 || t.id === (rule.trigger || 'onKey'); }).map(function(t) { return h('option', { key: t.id, value: t.id }, t.label); })),
                      // Trigger param
                      (function() {
                        var trig = TRIGGERS.find(function(t) { return t.id === rule.trigger; });
                        if (!trig || !trig.params || trig.params.length === 0) return null;
                        var isTimer = trig.id === 'onTimer';
                        return h('select', { 'aria-label': isTimer ? __alloT('stem.gamestudio.timer_param_label', 'How many moves') : __alloT('stem.gamestudio.trigger_param_label', 'Trigger parameter'),
                          value: isTimer ? (GS_E.timerN(rule.param) ? String(GS_E.timerN(rule.param)) : '') : (rule.param || ''),
                          onChange: function(e) {
                            var ne = Object.assign({}, events); var arr = (ne[evSprite] || []).slice();
                            arr[ri] = Object.assign({}, arr[ri], { param: e.target.value });
                            ne[evSprite] = arr; upd({ events: ne });
                          },
                          className: 'text-xs border border-rose-600 rounded px-1.5 py-1'
                        }, h('option', { value: '' }, '\u2014'), trig.params.map(function(p) {
                          return h('option', { key: p, value: p }, isTimer ? (p === '1' ? __alloT('stem.gamestudio.every_1_move', '1 move') : __alloT('stem.gamestudio.every_n_moves', '{n} moves').replace('{n}', p)) : p);
                        }));
                      })(),
                      h('span', { className: 'text-xs font-bold text-slate-600' }, '\u2192'),
                      h('select', {
                        // Named by hand. The only thing preceding this select is
                        // a span holding an arrow glyph, which is a visual
                        // separator in the "When [event] -> [action]" rule row,
                        // not a caption. Borrowing it would have named the
                        // control "arrow".
                        'aria-label': __alloT('stem.gamestudio.a11y_action', 'Action'),
                        value: rule.action || 'move',
                        onChange: function(e) {
                          var ne = Object.assign({}, events); var arr = (ne[evSprite] || []).slice();
                          arr[ri] = Object.assign({}, arr[ri], { action: e.target.value, actionParam: '' });
                          ne[evSprite] = arr; upd({ events: ne });
                        },
                        className: 'text-xs border border-rose-600 rounded px-1.5 py-1 bg-rose-50 font-bold'
                      }, ACTIONS.map(function(a) { return h('option', { key: a.id, value: a.id }, a.label); })),
                      // Action param
                      (function() {
                        var act = ACTIONS.find(function(a) { return a.id === rule.action; });
                        if (!act || !act.params || act.params.length === 0) return null;
                        return h('select', { 'aria-label': __alloT('stem.gamestudio.action_param_label', 'Action parameter'),
                          value: rule.actionParam || '',
                          onChange: function(e) {
                            var ne = Object.assign({}, events); var arr = (ne[evSprite] || []).slice();
                            arr[ri] = Object.assign({}, arr[ri], { actionParam: e.target.value });
                            ne[evSprite] = arr; upd({ events: ne });
                          },
                          className: 'text-xs border border-rose-600 rounded px-1.5 py-1'
                        }, h('option', { value: '' }, '\u2014'), act.params.map(function(p) { return h('option', { key: p, value: p }, p); }));
                      })(),
                      h('button', { 'aria-label': __alloT('stem.gamestudio.aria_remove_rule', 'Remove rule {n}').split('{n}').join(String(ri + 1)),
                        onClick: function() {
                          var ne = Object.assign({}, events); var arr = (ne[evSprite] || []).slice();
                          arr.splice(ri, 1); ne[evSprite] = arr; upd({ events: ne });
                        },
                        className: 'ml-auto text-rose-700 hover:text-red-700 transition-colors text-sm font-bold'
                      }, '\u2715')
                    ),
                    (function() {
                      var info = engineS.rules.list.find(function(r) { return r.sprite === evSprite && r.index === ri; });
                      if (!info) return null;
                      var fired = ruleFires[info.id] || 0;
                      return h('p', { className: 'mt-2 mb-0 text-[0.75rem] font-semibold ' + (info.runs ? 'text-emerald-900' : 'text-amber-900') },
                        (info.runs ? '✅ ' : '⏸️ ') + ruleSentence(info) + (info.runs && fired ? ' ⚡ ' + __alloT('stem.gamestudio.rule_fired_count', 'Times it fired in your last game: {n}.').replace('{n}', fired) : ''));
                    })(),
                    advancedCode && h('pre', { className: 'mt-2 p-2 rounded-lg bg-slate-900 text-green-400 text-[0.6875rem] font-mono overflow-x-auto' }, genCode(rule))
                  );
                }),
                sprEvents.length < 8 && h('button', { 'aria-label': __alloT('stem.gamestudio.aria_add_rule', 'Add Rule ({n} of 8 used)').split('{n}').join(String(sprEvents.length)),
                  onClick: function() {
                    var ne = Object.assign({}, events); var arr = (ne[evSprite] || []).slice();
                    // A new rule starts as one that visibly changes the game, so a first try shows cause and effect.
                    arr.push(({ player: { trigger: 'onCollide', param: 'coin', action: 'loseLife', actionParam: '' }, enemy: { trigger: 'onStart', param: '', action: 'move', actionParam: 'toward-player' }, npc: { trigger: 'onTalk', param: '', action: 'collect', actionParam: '+key' }, treasure: { trigger: 'onCollide', param: '', action: 'winGame', actionParam: '' } })[evSprite]);
                    ne[evSprite] = arr; upd({ events: ne });
                  },
                  className: 'w-full py-2 rounded-xl border-2 border-dashed border-rose-600 text-xs font-bold text-rose-700 hover:bg-rose-50 transition-all'
                }, '\u2795 Add Rule (' + sprEvents.length + '/8)'),
                h('button', { type: 'button', onClick: function() { startGame({ tab: 'play' }); }, style: { minHeight: '44px' },
                  className: 'w-full py-2 rounded-xl text-xs font-black text-white bg-green-700 hover:bg-green-800' }, '\u25b6\ufe0f ' + __alloT('stem.gamestudio.try_rules', 'Try these rules: play the level'))
              );
            })()
          ),


          // ============================================================
          // PLAY TAB (ENHANCED)
          // ============================================================
          gsTab === 'play' && (function() {
            var W = playWorld;
            var ended = playWon || playDead;
            var preview = W ? null : GS_E.init(tiles, gridW, gridH, engineOpts);
            var view = W || preview;
            var best = ended ? gsSolveCached(tiles, gridW, gridH, engineOpts) : null;
            var hurtNow = !!(W && W.msg && (W.msg.k === 'hurt' || W.msg.k === 'dead'));
            var dirName = { up: __alloT('stem.gamestudio.dir_up', 'up'), right: __alloT('stem.gamestudio.dir_right', 'right'), down: __alloT('stem.gamestudio.dir_down', 'down'), left: __alloT('stem.gamestudio.dir_left', 'left') };
            var around = function() {
              if (!W || W.px < 0) return '';
              var parts = [];
              [['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0]].forEach(function(d) {
                var ax = W.px + d[1], ay = W.py + d[2];
                if (ax < 0 || ay < 0 || ax >= gridW || ay >= gridH) { parts.push(dirName[d[0]] + ': ' + __alloT('stem.gamestudio.edge', 'edge')); return; }
                parts.push(dirName[d[0]] + ': ' + (GS_E.enemyAt(W, ax, ay) >= 0 ? tileName('enemy') : tileName(GS_E.tileAt(W, ax, ay))));
              });
              return __alloT('stem.gamestudio.sr_position', 'You are at column {x}, row {y}. Lives {l}, keys {k}. Around you: ').replace('{x}', W.px + 1).replace('{y}', W.py + 1).replace('{l}', W.lives).replace('{k}', W.keys) + parts.join(', ') + '.';
            };
            var hurtSummary = function() {
              var c = {};
              (W && W.hurtLog || []).forEach(function(w) { c[w] = (c[w] || 0) + 1; });
              return Object.keys(c).map(function(k) { return (k === 'rule' ? __alloT('stem.gamestudio.hurt_rule', 'a rule') : tileName(k)) + ' ×' + c[k]; }).join(', ');
            };
            var dpadBtn = function(label, input, glyph) {
              return h('button', { type: 'button', 'aria-label': label, onClick: function() { processMove(input); },
                style: { minWidth: '56px', minHeight: '56px' },
                className: 'rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xl font-bold text-center active:scale-95 transition-all select-none' }, glyph);
            };
            var sideView = view ? view.grav : gameType === 'platformer';
            return h('div', { className: 'space-y-3' },

            // Arcade Console HUD Bezel
            h('div', { className: 'gs-bezel gs-panel flex items-center gap-2.5 p-3 rounded-2xl border-2 border-slate-700 bg-slate-900 text-white flex-wrap' },
              h('span', { className: 'inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-full ' + (playWon ? 'bg-emerald-700 text-white' : playDead ? 'bg-rose-700 text-white' : isPlaying ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-700 text-slate-200') },
                playWon ? '🏆 VICTORY' : playDead ? '💀 GAME OVER' : isPlaying ? '● LIVE' : '⏸ READY'
              ),
              h('span', { className: 'text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-amber-300' }, '⭐ ' + playScore),
              h('span', { className: 'text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-rose-300', 'aria-label': __alloT('stem.gamestudio.lives_aria', '{n} lives').replace('{n}', playLives) },
                '❤️ ' + Array.from({ length: Math.max(0, Math.min(playLives, 10)) }, function() { return '♥'; }).join('')
              ),
              playKeys > 0 && h('span', { className: 'text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-yellow-300' }, '🔑 ×' + playKeys),
              engineS.puzzle && view && view.tg && view.tg.length > 0 && (function() {
                var on = GS_E.covered(view), of = view.tg.length;
                return h('span', { className: 'text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-800 border ' + (on >= of ? 'border-emerald-400 text-emerald-200' : 'border-slate-600 text-violet-200') },
                  '🎯 ' + __alloT('stem.gamestudio.hud_targets', 'Targets {a}/{b}').replace('{a}', on).replace('{b}', of) + (on >= of ? ' · ' + __alloT('stem.gamestudio.hud_flag_open', 'flag open') : ''));
              })(),
              h('span', { className: 'text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-200' }, '👣 Moves: ' + playMoves),
              playCoinsCollected > 0 && h('span', { className: 'text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-amber-200' }, '🪙 ' + playCoinsCollected + ' collected'),
              h('span', { className: 'text-xs font-bold text-slate-200 ml-auto' },
                gameType === 'topdown' ? '🔽 Top-Down' : gameType === 'platformer' ? '🏃 Platformer' : '🧩 Puzzle'
              )
            ),

            // Result card: what happened, and how it compares with the engine's best route
            ended && h('div', { role: 'status', className: 'gs-panel p-3.5 rounded-xl border-2 space-y-2 ' + (playWon ? 'border-emerald-500 bg-emerald-50' : 'border-rose-400 bg-rose-50') },
              h('p', { className: 'text-sm font-black m-0 ' + (playWon ? 'text-emerald-950' : 'text-rose-950') }, playWon
                ? '🏆 ' + __alloT('stem.gamestudio.result_win', 'You won in {moves} moves! Score {score}.').replace('{moves}', playMoves).replace('{score}', playScore)
                : '💀 ' + __alloT('stem.gamestudio.result_lose', 'Out of lives after {moves} moves.').replace('{moves}', playMoves)),
              playDead && hurtSummary() && h('p', { className: 'text-xs text-rose-950 m-0' }, __alloT('stem.gamestudio.result_hurt', 'What hurt you: ') + hurtSummary()),
              best && best.winnable === true && h('p', { className: 'text-xs text-slate-800 m-0' },
                __alloT('stem.gamestudio.result_best', 'The game engine\'s best route: {m} moves, losing {l} lives.').replace('{m}', best.moves).replace('{l}', best.livesLost) + ' ' +
                (playWon && playMoves <= best.moves ? __alloT('stem.gamestudio.result_matched', 'You matched it!') : __alloT('stem.gamestudio.result_try', 'Can you match it?'))),
              best && best.winnable === false && h('p', { className: 'text-xs text-slate-800 m-0' }, __alloT('stem.gamestudio.result_unwinnable', 'The game engine says nobody can win this level as it is. Change one thing on the map.')),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', 'aria-label': __alloT('stem.gamestudio.play_again', 'Play Again'), onClick: function() { startGame(); },
                  style: { minHeight: '44px' }, className: 'px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md' }, __alloT('stem.gamestudio.play_again_2', '🔄 Play Again')),
                h('button', { type: 'button', onClick: function() { stopGame(); upd({ tab: 'map' }); },
                  style: { minHeight: '44px' }, className: 'px-4 py-2 rounded-xl text-xs font-bold text-rose-900 bg-white border-2 border-rose-600 hover:bg-rose-50' }, '✏️ ' + __alloT('stem.gamestudio.change_one_thing', 'Change one thing on the map'))
              )
            ),

            // Game message (live)
            !ended && h('div', { role: 'status', 'aria-live': 'polite',
              className: 'p-2 rounded-lg text-xs font-bold text-center min-h-[2.25rem] ' + (hurtNow ? 'bg-red-100 text-red-900 border border-red-300' : 'bg-blue-50 text-blue-900 border border-blue-200') },
              playMessage || (isPlaying ? (sideView ? __alloT('stem.gamestudio.hint_side', 'Arrows or WASD to move. Up or Space jumps.') : (engineS.puzzle && view && view.tg && view.tg.length) ? __alloT('stem.gamestudio.hint_puzzle', 'Arrows or WASD to move. Push a crate onto every target, then reach the flag.') : __alloT('stem.gamestudio.hint_top', 'Arrows or WASD to move. Reach the flag!')) : __alloT('stem.gamestudio.hint_ready', 'Press Start, or click the game and press an arrow key.'))),
            h('div', { className: 'sr-only', 'aria-live': 'polite', style: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, isPlaying ? around() : ''),

            // Live playtest arcade viewport: sized so the whole level always fits
            h('div', {
              id: 'gs-play-viewport',
              role: 'application',
              'aria-label': __alloT('stem.gamestudio.play_viewport_aria', 'Game playtest viewport. Use arrow keys or WASD to move.'),
              className: 'rounded-xl border-4 bg-slate-900 p-2 outline-none focus:ring-4 focus:ring-indigo-400 focus:ring-offset-1',
              style: {
                position: 'relative',
                borderColor: playWon ? '#34d399' : (playDead || hurtNow) ? '#f43f5e' : isPlaying ? '#4ade80' : '#fda4af',
                background: gameType === 'platformer'
                  ? 'linear-gradient(180deg, #0b1936 0%, #1e3a5f 58%, #0f172a 100%)'
                  : gameType === 'puzzle'
                    ? 'radial-gradient(circle at 50% 35%, #231942 0%, #0f172a 68%, #020617 100%)'
                    : 'radial-gradient(circle at 50% 40%, #11223a 0%, #0b1324 68%, #020617 100%)',
                boxShadow: isPlaying
                  ? 'inset 0 0 32px rgba(2,6,23,0.78), 0 0 18px rgba(52,211,153,0.22)'
                  : 'inset 0 0 32px rgba(2,6,23,0.78)'
              },
              tabIndex: 0,
              onKeyDown: onPlayKey
            },
              h('div', {
                style: {
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(' + gridW + ', 1fr)',
                  gap: '1px', background: 'rgba(30,41,59,0.55)', borderRadius: '8px', overflow: 'hidden',
                  width: 'min(100%, ' + Math.round(gridW * 440 / gridH) + 'px)', margin: '0 auto'
                }
              },
                Array.from({ length: gridW * gridH }, function(_, i) {
                  var x = i % gridW, y = Math.floor(i / gridW);
                  var k = x + ',' + y;
                  var terrain = view ? GS_E.tileAt(view, x, y) : (tiles[k] || 'empty');
                  var isP = !!(view && view.px === x && view.py === y);
                  var isE = !!(view && GS_E.enemyAt(view, x, y) >= 0);
                  var tId = isP ? 'player' : isE ? 'enemy' : terrain;
                  var tInfo = TILE_MAP[tId] || TILE_MAP.empty;
                  var tTerr = TILE_MAP[terrain] || TILE_MAP.empty;
                  var isSolid = terrain === 'wall' || terrain === 'platform' || terrain === 'door' || terrain === 'ice' || terrain === 'grass' || terrain === 'sand';
                  var isCollect = tId === 'coin' || tId === 'gem' || tId === 'key' || tId === 'heart' || tId === 'flag' || tId === 'portal' || tId === 'treasure';
                  var baseBg = terrain === 'empty' ? ((x + y) % 2 === 0 ? 'rgba(15,23,42,0.72)' : 'rgba(19,30,50,0.76)') : terrain === 'lava' ? 'radial-gradient(circle at 50% 50%, #fb923c, #dc2626 78%)' : tTerr.color;
                  var playCellBg = isP ? 'radial-gradient(circle at 50% 45%, rgba(167,139,250,0.55), rgba(139,92,246,0.25) 70%), ' + (terrain === 'empty' ? '#1e1b4b' : tTerr.color)
                    : tId === 'flag' ? 'radial-gradient(circle at 50% 45%, rgba(52,211,153,0.48), ' + tInfo.color + ' 72%)'
                    : tId === 'portal' ? 'radial-gradient(circle at 50% 45%, rgba(216,180,254,0.58), ' + tInfo.color + ' 72%)'
                    : baseBg;
                  // Puzzle: a crate sitting on a target gets a green ring and a check mark.
                  var onTarget = tId === 'crate' && !!(view && view.base && view.base[k] === 'target');
                  var playShadow = isP ? ((hurtNow ? '0 0 0 3px #f43f5e, ' : '') + '0 0 12px rgba(139,92,246,0.88), inset 0 1px 0 rgba(255,255,255,0.4)')
                    : onTarget ? 'inset 0 0 0 3px #4ade80, 0 0 10px rgba(74,222,128,0.8)'
                    : tId === 'crate' ? 'inset 0 0 0 2px #fbbf24, inset 0 3px 0 rgba(255,255,255,0.25)'
                    : isE ? '0 0 9px rgba(244,63,94,0.68), inset 0 0 0 2px rgba(244,63,94,0.75)'
                    : tId === 'flag' ? '0 0 10px rgba(52,211,153,0.7), inset 0 1px 0 rgba(255,255,255,0.35)'
                    : tId === 'portal' ? '0 0 10px rgba(192,132,252,0.75)'
                    : terrain === 'lava' ? 'inset 0 0 8px rgba(254,215,170,0.65)'
                    : isSolid ? 'inset 0 2px 0 rgba(255,255,255,0.28), inset 0 -2px 0 rgba(2,6,23,0.45)'
                    : undefined;
                  var spriteClass = isP ? 'gs-player-aura' : tId === 'portal' ? 'gs-portal-pulse' : isCollect ? 'gs-glow-collect' : undefined;
                  var art = lookEl[tId] || null;
                  return h('div', {
                    key: k,
                    className: terrain === 'lava' && !isP ? 'gs-lava-shimmer' : undefined,
                    style: {
                      position: 'relative',
                      aspectRatio: '1',
                      background: playCellBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: Math.min(22, Math.floor(520 / gridW)) + 'px',
                      minWidth: '10px', minHeight: '10px', transition: 'background 0.15s',
                      boxShadow: playShadow
                    }
                  }, art ? h('span', { 'aria-hidden': 'true', className: spriteClass, style: { display: 'flex', width: '84%', height: '84%', alignItems: 'center', justifyContent: 'center' } }, art)
                    : tInfo.emoji ? h('span', {
                    'aria-hidden': 'true',
                    className: spriteClass,
                    style: { filter: isP ? 'drop-shadow(0 2px 3px rgba(2,6,23,0.85)) drop-shadow(0 0 5px rgba(196,181,253,0.85))' : 'drop-shadow(0 2px 2px rgba(2,6,23,0.72))' }
                  }, tInfo.emoji) : '',
                    onTarget && h('span', { 'aria-hidden': 'true', style: { position: 'absolute', right: '1px', bottom: '0px', fontSize: '12px', fontWeight: 900, lineHeight: 1, color: '#052e16', background: '#4ade80', borderRadius: '4px', padding: '0 2px' } }, '✓'));
                }),
                h(GsPlayFxOverlay, { React: React, gridW: gridW, gridH: gridH, fxSeq: _gsFxSeq, isPlaying: isPlaying })
              ),
              // Not started yet: one big button on top of the level preview
              !isPlaying && h('div', { style: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.45)', borderRadius: '10px' } },
                h('button', { type: 'button', onClick: function() { startGame(); },
                  style: { minHeight: '56px' },
                  className: 'px-6 py-3 rounded-2xl text-base font-black text-white bg-green-700 hover:bg-green-800 shadow-xl border-2 border-green-300' }, '▶️ ' + __alloT('stem.gamestudio.start_game', 'Start Game')))
            ),

            // D-pad controls (touch-friendly, 56 px buttons)
            isPlaying && !ended && h('div', { className: 'flex justify-center' },
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: '6px' } },
                h('div', null),
                dpadBtn(sideView ? __alloT('stem.gamestudio.aria_jump', 'Jump') : __alloT('stem.gamestudio.aria_move_up', 'Move up'), 'ArrowUp', sideView ? '⬆' : '▲'),
                h('div', null),
                dpadBtn(__alloT('stem.gamestudio.aria_move_left', 'Move left'), 'ArrowLeft', '◀'),
                h('div', { 'aria-hidden': 'true', className: 'rounded-xl bg-slate-800' }),
                dpadBtn(__alloT('stem.gamestudio.aria_move_right', 'Move right'), 'ArrowRight', '▶'),
                h('div', null),
                dpadBtn(sideView ? __alloT('stem.gamestudio.aria_wait_fall', 'Wait (let gravity pull you down)') : __alloT('stem.gamestudio.aria_move_down', 'Move down'), 'ArrowDown', '▼'),
                h('div', null)
              )
            ),

            // Controls
            h('div', { className: 'flex gap-2 justify-center flex-wrap items-center' },
              isPlaying && h('button', { type: 'button', onClick: stopGame, style: { minHeight: '44px' },
                className: 'px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md bg-red-700 hover:bg-red-800'
              }, '⏹ Stop'),
              // Puzzles can get stuck (a crate in a corner): start over without leaving Play.
              isPlaying && !ended && h('button', { type: 'button', onClick: function() { startGame(); }, style: { minHeight: '44px' },
                className: 'px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md bg-blue-700 hover:bg-blue-800'
              }, '🔄 ' + __alloT('stem.gamestudio.restart', 'Restart')),
              h('button', { type: 'button', onClick: function() { stopGame(); upd({ tab: 'map' }); }, style: { minHeight: '44px' },
                className: 'px-4 py-2 rounded-xl text-xs font-bold text-rose-900 bg-white border border-rose-600 hover:bg-rose-50' }, '✏️ ' + __alloT('stem.gamestudio.edit_map', 'Edit the map'))
            ),

            // The rules of THIS level, written out (only tiles that are on the map)
            h('div', { className: 'p-3 rounded-xl border border-slate-400 bg-white' },
              h('div', { className: 'text-xs font-bold text-slate-800 mb-2' }, __alloT('stem.gamestudio.game_mechanics_v2', '🎮 The rules of this level')),
              h('ul', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[0.75rem] text-slate-800 m-0 p-0 list-none' },
                TILE_PALETTE.filter(function(tp) { return tp.id !== 'empty' && countTile(tiles, tp.id) > 0; }).map(function(tp) {
                  return h('li', { key: tp.id, className: 'flex gap-1.5 items-start' },
                    pieceArt(tp.id, '18px') || h('span', { 'aria-hidden': 'true' }, tp.emoji),
                    h('span', null, h('strong', null, tp.label + ': '), tileRule(tp.id)));
                }),
                engineS.rules.list.filter(function(r) { return r.runs && r.why !== 'builtIn'; }).map(function(r) {
                  return h('li', { key: 'r' + r.id, className: 'flex gap-1.5 items-start sm:col-span-2' }, h('span', { 'aria-hidden': 'true' }, '⚡'), h('span', null, ruleSentence(r)));
                })
              )
            ),

            // AI Playtest Advisor
            callGemini && h('div', { className: 'p-3 rounded-xl border border-purple-200 bg-purple-50' },
              h('button', { onClick: function() {
                  setAiLoading(true);
                  upd({ aiResult: null });
                  var st = JSON.stringify({ gridW: gridW, gridH: gridH, gameType: gameType, tiles: tiles, events: events });
                  callGemini('You are a game design advisor for students. Analyze this game and give 3-5 short, constructive suggestions. Consider: win conditions, balance, variety, enemy placement, fun factor. Game: ' + st)
                    .then(function(res) { setAiLoading(false); upd({ aiResult: '🧠 ' + res }); })
                    .catch(function() { setAiLoading(false); upd({ aiResult: '❌ AI error' }); });
                },
                disabled: aiLoading,
                className: 'w-full px-3 py-2 text-xs font-bold text-white rounded-lg transition-all ' +
                  (aiLoading ? 'bg-slate-600' : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800')
              }, aiLoading ? '⏳ Analyzing...' : '🧠 AI Review My Game'),
              aiResult && aiResult.indexOf('🧠') === 0 && h('div', {
                className: 'mt-2 p-3 rounded-lg bg-white border border-purple-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed'
              }, aiResult)
            )
          );
          })(),


          // ============================================================
          // LEARN TAB
          // ============================================================
          gsTab === 'learn' && h('div', { className: 'space-y-4' },

            // Header + Inline SVG Game Loop Schematic
            h('div', { className: 'gs-panel p-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 space-y-3' },
              h('div', { className: 'flex flex-wrap items-center gap-3' },
                h('span', { style: { fontSize: '28px' }, 'aria-hidden': 'true' }, '\uD83C\uDF93'),
                h('div', { className: 'flex-1 min-w-[180px]' },
                  h('h3', { className: 'text-sm font-black text-indigo-950' }, __alloT('stem.gamestudio.game_design_academy', 'Game Design Academy')),
                  h('p', { className: 'text-xs text-indigo-800' }, __alloT('stem.gamestudio.learn_the_fundamentals_of_game_design_', 'Learn the fundamentals of game design through interactive lessons'))
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-lg font-black text-indigo-800' }, Object.keys(learnCompleted).length + '/' + LESSONS.length),
                  h('div', { className: 'text-[0.6875rem] font-bold text-indigo-700' }, 'COMPLETED')
                )
              ),
              // Visual Game Loop SVG (Input -> Update -> Render -> 60fps cycle)
              h('svg', { viewBox: '0 0 360 54', className: 'w-full max-w-md mx-auto block', role: 'img', 'aria-label': __alloT('stem.gamestudio.game_loop_diagram_aria', 'Game loop diagram: Input feeds Update, which feeds Render, looping at 60 frames per second') },
                h('defs', null,
                  h('linearGradient', { id: 'gs-loop-node', x1: '0', y1: '0', x2: '0', y2: '1' },
                    h('stop', { offset: '0%', stopColor: '#ffffff' }),
                    h('stop', { offset: '100%', stopColor: '#eef2ff' })
                  )
                ),
                h('path', { className: 'gs-loop-flow', d: 'M308 36 C308 49, 53 49, 53 38', fill: 'none', stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.78 }),
                h('polygon', { points: '49,40 53,34 57,40', fill: '#6366f1', opacity: 0.85 }),
                h('rect', { x: 6, y: 6, width: 94, height: 28, rx: 8, fill: 'url(#gs-loop-node)', stroke: '#4f46e5', strokeWidth: 1.6 }),
                h('text', { x: 53, y: 24, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#312e81' }, '1. INPUT'),
                h('path', { d: 'M102 20 L128 20', stroke: '#4f46e5', strokeWidth: 2, strokeLinecap: 'round' }),
                h('polygon', { points: '125,16 133,20 125,24', fill: '#4f46e5' }),
                h('rect', { x: 134, y: 6, width: 94, height: 28, rx: 8, fill: 'url(#gs-loop-node)', stroke: '#7c3aed', strokeWidth: 1.6 }),
                h('text', { x: 181, y: 24, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#4c1d95' }, '2. UPDATE'),
                h('path', { d: 'M230 20 L256 20', stroke: '#7c3aed', strokeWidth: 2, strokeLinecap: 'round' }),
                h('polygon', { points: '253,16 261,20 253,24', fill: '#7c3aed' }),
                h('rect', { x: 262, y: 6, width: 92, height: 28, rx: 8, fill: 'url(#gs-loop-node)', stroke: '#be123c', strokeWidth: 1.6 }),
                h('text', { x: 308, y: 24, textAnchor: 'middle', fontSize: 11, fontWeight: 800, fill: '#881337' }, '3. RENDER')
              ),
              // Progress bar
              h('div', { className: 'h-2.5 rounded-full bg-indigo-200 overflow-hidden' },
                h('div', {
                  className: 'h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all',
                  style: { width: (Object.keys(learnCompleted).length / LESSONS.length * 100) + '%' }
                })
              )
            ),

            // Lesson detail or lesson list
            activeLesson ? (function() {
              var lesson = LESSONS.find(function(l) { return l.id === activeLesson; });
              if (!lesson) return null;
              var isComplete = learnCompleted[lesson.id];
              return h('div', { className: 'space-y-4' },
                // Back + title
                h('button', { 'aria-label': __alloT('stem.gamestudio.back_to_lessons', 'Back to lessons'),
                  onClick: function() { upd({ activeLesson: null, learnAnswer: null, learnShowResult: false }); },
                  className: 'text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors'
                }, __alloT('stem.gamestudio.back_to_lessons_2', '\u2190 Back to lessons')),

                h('div', { className: 'p-4 rounded-xl border border-indigo-200 bg-white' },
                  h('h3', { className: 'text-base font-black text-indigo-900 mb-1' }, lesson.icon + ' ' + lesson.title),
                  h('p', { className: 'text-xs text-slate-600 whitespace-pre-wrap leading-relaxed' }, lesson.concept)
                ),

                // Fun fact
                h('div', { className: 'p-3 rounded-xl border border-amber-200 bg-amber-50' },
                  h('div', { className: 'text-xs font-bold text-amber-700 mb-1' }, __alloT('stem.gamestudio.did_you_know', '\uD83D\uDCA1 Did You Know?')),
                  h('p', { className: 'text-xs text-amber-800' }, lesson.funFact)
                ),

                // Real game example
                h('div', { className: 'p-3 rounded-xl border border-green-200 bg-green-50' },
                  h('div', { className: 'text-xs font-bold text-green-700 mb-1' }, __alloT('stem.gamestudio.real_game_example', '\uD83C\uDFAE Real Game Example')),
                  h('p', { className: 'text-xs text-green-800' }, lesson.realGame)
                ),

                // Quiz
                h('div', { className: 'p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50' },
                  h('div', { className: 'text-xs font-bold text-indigo-800 mb-3' }, __alloT('stem.gamestudio.knowledge_check', '\uD83E\uDDE0 Knowledge Check')),
                  h('p', { className: 'text-sm font-bold text-slate-800 mb-3' }, lesson.quiz.question),
                  h('div', { className: 'space-y-2' },
                    lesson.quiz.options.map(function(opt, oi) {
                      var isSelected = learnAnswer === oi;
                      var isCorrect = oi === lesson.quiz.correct;
                      var showResult = learnShowResult;
                      var btnClass = 'w-full p-3 rounded-lg text-left text-xs font-bold transition-all border-2 ';
                      // A wrong pick is marked, but the right option is never lit up: the student tries again.
                      if (showResult && isSelected && isCorrect) btnClass += 'border-green-700 bg-green-100 text-green-800';
                      else if (showResult && isSelected && !isCorrect) btnClass += 'border-red-600 bg-red-50 text-red-700';
                      else if (isSelected) btnClass += 'border-indigo-600 bg-indigo-100 text-indigo-800';
                      else btnClass += 'border-slate-500 bg-white hover:border-indigo-600 hover:bg-indigo-50 text-slate-700';
                      return h('button', { key: oi,
                        'aria-pressed': isSelected,
                        onClick: function() {
                          if (learnShowResult) return;
                          upd({ learnAnswer: oi });
                        },
                        className: btnClass
                      }, String.fromCharCode(65 + oi) + '. ' + opt);
                    })
                  ),

                  // Submit / result
                  !learnShowResult && learnAnswer !== null && h('button', { 'aria-label': __alloT('stem.gamestudio.check_answer', 'Check Answer'),
                    onClick: function() {
                      var correct = learnAnswer === lesson.quiz.correct;
                      var missed = Object.assign({}, _gs.learnMissed || {});
                      if (!correct) { missed[lesson.id] = true; upd({ learnShowResult: true, learnMissed: missed }); return; }
                      upd({ learnShowResult: true });
                      if (!isComplete) {
                        var lc = Object.assign({}, learnCompleted);
                        lc[lesson.id] = true;
                        upd({ learnCompleted: lc, learnShowResult: true });
                        // XP only for a first-try answer; after a miss, trying the other options is not mastery.
                        if (!missed[lesson.id]) {
                          if (typeof awardStemXP === 'function') awardStemXP('gameStudio', 15, 'lesson: ' + lesson.title);
                          if (addToast) addToast('\uD83C\uDF93 Lesson complete! +15 XP', 'success');
                        } else if (addToast) addToast('\uD83C\uDF93 ' + __alloT('stem.gamestudio.lesson_done_noxp', 'Lesson complete! (XP is for a first-try answer.)'), 'success');
                      }
                    },
                    className: 'mt-3 w-full py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all'
                  }, __alloT('stem.gamestudio.check_answer_2', 'Check Answer')),

                  learnShowResult && h('div', { role: 'status',
                    className: 'mt-3 p-3 rounded-lg text-xs ' +
                      (learnAnswer === lesson.quiz.correct ? 'bg-green-100 text-green-900 border border-green-300' : 'bg-red-50 text-red-900 border border-red-300')
                  },
                    h('div', { className: 'font-bold mb-1' }, learnAnswer === lesson.quiz.correct ? '\u2705 Correct!' : '\u274C Not quite!'),
                    h('p', { className: 'm-0' }, learnAnswer === lesson.quiz.correct ? lesson.quiz.explanation : ((lesson.quiz.why && lesson.quiz.why[learnAnswer]) || '')),
                    learnAnswer !== lesson.quiz.correct && h('button', { type: 'button', onClick: function() { upd({ learnAnswer: null, learnShowResult: false }); },
                      style: { minHeight: '44px' },
                      className: 'mt-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800' }, '\uD83D\uDD01 ' + __alloT('stem.gamestudio.try_again', 'Try again'))
                  )
                ),

                // Next lesson
                learnShowResult && learnAnswer === lesson.quiz.correct && (function() {
                  var idx = LESSONS.findIndex(function(l) { return l.id === activeLesson; });
                  if (idx < LESSONS.length - 1) {
                    return h('button', { 'aria-label': __alloT('stem.gamestudio.aria_next_lesson', 'Next Lesson: {title}').split('{title}').join(LESSONS[idx + 1].title),
                      onClick: function() { upd({ activeLesson: LESSONS[idx + 1].id, learnAnswer: null, learnShowResult: false }); },
                      className: 'w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-600 transition-all'
                    }, 'Next Lesson: ' + LESSONS[idx + 1].icon + ' ' + LESSONS[idx + 1].title + ' \u2192');
                  }
                  return h('div', { className: 'text-center text-xs font-bold text-indigo-600 p-3' }, __alloT('stem.gamestudio.you_ve_completed_all_lessons_now_apply', '\uD83C\uDF89 You\'ve completed all lessons! Now apply what you\'ve learned in the Challenges tab.'));
                })()
              );
            })() :

            // Lesson grid
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              LESSONS.map(function(lesson, li) {
                var isComplete = learnCompleted[lesson.id];
                return h('button', { key: lesson.id,
                  onClick: function() { upd({ activeLesson: lesson.id, learnAnswer: null, learnShowResult: false }); },
                  className: 'p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ' +
                    (isComplete ? 'border-green-600 bg-green-50' : 'border-indigo-500 bg-white hover:border-indigo-700')
                },
                  h('div', { className: 'flex items-start gap-3' },
                    h('span', { style: { fontSize: '24px' } }, lesson.icon),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-sm font-black ' + (isComplete ? 'text-green-800' : 'text-indigo-900') }, lesson.title),
                        isComplete && h('span', { className: 'text-xs font-bold text-green-800 bg-green-200 px-1.5 py-0.5 rounded' }, '\u2713')
                      ),
                      h('p', { className: 'text-[0.6875rem] text-slate-600 mt-0.5' }, __alloT('stem.gamestudio.' + (lesson.id) + '_desc', lesson.desc))
                    ),
                    h('span', { className: 'text-xs font-bold ' + (isComplete ? 'text-green-700' : 'text-indigo-700') }, 'Lesson ' + (li + 1))
                  )
                );
              })
            )
          ),


          // ============================================================
          // CHALLENGES TAB
          // ============================================================
          gsTab === 'challenges' && h('div', { className: 'space-y-4' },

            // Header
            h('div', { className: 'gs-panel p-4 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50' },
              h('div', { className: 'flex items-center gap-3' },
                h('span', { style: { fontSize: '28px' }, 'aria-hidden': 'true' }, '\uD83C\uDFC6'),
                h('div', { className: 'flex-1' },
                  h('h3', { className: 'text-sm font-black text-amber-950' }, __alloT('stem.gamestudio.design_challenges', 'Design Challenges')),
                  h('p', { className: 'text-xs text-amber-900' }, __alloT('stem.gamestudio.apply_your_game_design_skills_build_le', 'Apply your game design skills! Build levels that meet specific objectives.')),
                  h('p', { className: 'text-xs text-amber-900 mt-1 mb-0' }, __alloT('stem.gamestudio.challenge_engine_note', 'Some goals are checked by the game engine: it plays your level every possible way, so placing the tiles is not enough. The level has to really work.'))
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-lg font-black text-amber-900' }, Object.keys(challengeCompleted).length + '/' + CHALLENGES.length),
                  h('div', { className: 'text-[0.6875rem] font-bold text-amber-800' }, 'COMPLETED')
                )
              ),
              h('div', { className: 'mt-3 h-2.5 rounded-full bg-amber-200 overflow-hidden' },
                h('div', {
                  className: 'h-full rounded-full bg-gradient-to-r from-amber-600 to-orange-600 transition-all',
                  style: { width: (Object.keys(challengeCompleted).length / CHALLENGES.length * 100) + '%' }
                })
              )
            ),

            // Challenge cards
            CHALLENGES.map(function(ch) {
              var isComplete = challengeCompleted[ch.id];
              var results = ch.requirements.map(function(req) {
                return { text: req.text, engine: !!req.engine, passed: !!req.check(tiles, gridW, gridH, engineOpts) };
              });
              var allPassed = results.every(function(r) { return r.passed; });
              return h('div', {
                key: ch.id,
                className: 'p-4 rounded-xl border-2 transition-all ' +
                  (isComplete ? 'border-green-300 bg-green-50' : 'border-amber-200 bg-white')
              },
                h('div', { className: 'flex items-start gap-3 mb-3' },
                  h('span', { style: { fontSize: '24px' } }, ch.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-sm font-black ' + (isComplete ? 'text-green-800' : 'text-amber-900') }, ch.title),
                      h('span', { className: 'text-[0.6875rem] font-bold px-1.5 py-0.5 rounded ' +
                        (ch.difficulty === 1 ? 'bg-green-200 text-green-800' : ch.difficulty === 2 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800')
                      }, ch.difficulty === 1 ? 'Beginner' : ch.difficulty === 2 ? 'Intermediate' : 'Advanced'),
                      isComplete && h('span', { className: 'text-xs font-bold text-green-800 bg-green-200 px-1.5 py-0.5 rounded' }, '\u2713 +' + ch.xp + ' XP')
                    ),
                    h('p', { className: 'text-xs text-slate-600 mt-1' }, __alloT('stem.gamestudio.' + (ch.id) + '_desc', ch.desc))
                  )
                ),

                // Requirements checklist
                h('div', { className: 'space-y-1.5 mb-3' },
                  results.map(function(r, ri) {
                    return h('div', {
                      key: ri,
                      className: 'flex items-center gap-2 text-xs ' + (r.passed ? 'text-green-700' : 'text-slate-500')
                    },
                      h('span', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-[0.6875rem] font-bold ' +
                        (r.passed ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700')
                      }, r.passed ? '\u2713' : (ri + 1)),
                      h('span', { className: r.passed ? 'line-through' : '' }, r.text + (r.engine ? ' (' + __alloT('stem.gamestudio.engine_checked', 'the game engine plays it to check') + ')' : ''))
                    );
                  })
                ),

                // Hint
                !isComplete && !allPassed && h('div', { className: 'p-2 rounded-lg bg-amber-50 border border-amber-200 text-[0.6875rem] text-amber-700 mb-2' },
                  h('strong', null, 'Hint: '), __alloT('stem.gamestudio.' + (ch.id) + '_hint', ch.hint)
                ),

                // Complete button
                !isComplete && allPassed && h('button', { 'aria-label': __alloT('stem.gamestudio.aria_claim_xp', 'Claim {n} XP').split('{n}').join(String(ch.xp)),
                  onClick: function() {
                    var cc = Object.assign({}, challengeCompleted);
                    cc[ch.id] = true;
                    upd({ challengeCompleted: cc });
                    if (typeof awardStemXP === 'function') awardStemXP('gameStudio', ch.xp, 'challenge: ' + ch.title);
                    if (addToast) addToast('\uD83C\uDFC6 Challenge complete! +' + ch.xp + ' XP', 'success');
                  },
                  className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-700 hover:to-orange-700 shadow-md transition-all'
                }, '\uD83C\uDFC6 Claim ' + ch.xp + ' XP!'),

                // Already complete badge
                isComplete && h('div', { className: 'text-center text-xs font-bold text-green-600 py-1' }, __alloT('stem.gamestudio.challenge_completed', '\u2705 Challenge completed!'))
              );
            }),

            // Total XP display
            h('div', { className: 'text-center p-3 rounded-xl border border-amber-200 bg-amber-50' },
              h('div', { className: 'text-xs font-bold text-amber-700' }, __alloT('stem.gamestudio.total_challenge_xp_earned', 'Total Challenge XP Earned')),
              h('div', { className: 'text-2xl font-black text-amber-800' },
                CHALLENGES.reduce(function(sum, ch) { return sum + (challengeCompleted[ch.id] ? ch.xp : 0); }, 0) + ' XP'
              )
            )
          ),


          // ============================================================
          // PROJECTS TAB
          // ============================================================
          gsTab === 'projects' && h('div', { className: 'space-y-4' },

            // Project name
            h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
              h('label', { className: 'text-xs font-bold text-rose-700 mb-1 block' }, __alloT('stem.gamestudio.project_name', 'Project Name')),
              h('input', { 'aria-label': __alloT('stem.gamestudio.project_name', 'Project Name'),
                type: 'text', value: projectName,
                onChange: function(e) { upd({ projectName: e.target.value }); },
                className: 'w-full text-sm border border-rose-600 rounded-lg px-3 py-2 font-bold'
              })
            ),

            // Export / Import / Share
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('button', { onClick: function() {
                  var gd = { version: 2, name: projectName, gridW: gridW, gridH: gridH, gameType: gameType, tiles: tiles, sprites: sprites, events: events, spritePixels: spritePixels, looks: looks };
                  var blob = new Blob([JSON.stringify(gd, null, 2)], { type: 'application/json' });
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement('a');
                  a.href = url; a.download = (projectName || 'game').replace(/[^a-zA-Z0-9]/g, '_') + '.allogame';
                  a.click(); setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
                  if (addToast) addToast('\uD83D\uDCE4 Game exported!', 'success');
                  // Once only: exporting again is not new learning.
                  if (!_gs.exportedOnce) { if (typeof awardStemXP === 'function') awardStemXP('gameStudio', 5, 'export game'); upd({ exportedOnce: true }); }
                },
                className: 'p-3 rounded-xl border-2 border-rose-600 bg-rose-50 hover:bg-rose-100 text-center transition-all hover:shadow-md'
              },
                h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDCE4'),
                h('div', { className: 'text-xs font-bold text-rose-700' }, __alloT('stem.gamestudio.export', 'Export'))
              ),
              h('button', { onClick: function() {
                  var inp = document.createElement('input');
                  inp.type = 'file'; inp.accept = '.allogame,.json';
                  inp.onchange = function(e) {
                    var file = e.target.files[0]; if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { if (addToast) addToast('\u274C File exceeds the 5 MB limit', 'error'); return; }
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                      try {
                        var data = JSON.parse(ev.target.result, function(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
                        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid object');
                        var safeW = Math.max(4, Math.min(24, Math.floor(Number(data.gridW)) || 16));
                        var safeH = Math.max(4, Math.min(18, Math.floor(Number(data.gridH)) || 12));
                        var safeType = ['topdown', 'platformer', 'puzzle'].indexOf(data.gameType) >= 0 ? data.gameType : 'topdown';
                        upd({
                          projectName: typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 80) : 'Imported Game',
                          gridW: safeW, gridH: safeH,
                          gameType: safeType, isPlaying: false, playWorld: null,
                          tiles: cleanTiles(data.tiles, safeW, safeH),
                          sprites: (data.sprites && typeof data.sprites === 'object' && !Array.isArray(data.sprites)) ? data.sprites : {},
                          events: cleanEvents(data.events),
                          looks: gsCleanLooks(data.looks),
                          spritePixels: (data.spritePixels && typeof data.spritePixels === 'object' && !Array.isArray(data.spritePixels)) ? data.spritePixels : {}
                        });
                        if (addToast) addToast('\uD83D\uDCE5 Game imported!', 'success');
                      } catch(err) { if (addToast) addToast('\u274C Invalid file', 'error'); }
                    };
                    reader.readAsText(file);
                  };
                  inp.click();
                },
                className: 'p-3 rounded-xl border-2 border-rose-600 bg-rose-50 hover:bg-rose-100 text-center transition-all hover:shadow-md'
              },
                h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDCE5'),
                h('div', { className: 'text-xs font-bold text-rose-700' }, __alloT('stem.gamestudio.import', 'Import'))
              ),
              h('button', { onClick: function() {
                  var gd = { version: 2, name: projectName, gridW: gridW, gridH: gridH, gameType: gameType, tiles: tiles, sprites: sprites, events: events, looks: looks };
                  var code = btoa(unescape(encodeURIComponent(JSON.stringify(gd))));
                  Promise.resolve((window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(value) : Promise.reject(new Error('Clipboard unavailable')); })(code)).then(function() {
                    if (addToast) addToast('\uD83D\uDCCB Share code copied!', 'success');
                  }, function() {
                    if (addToast) addToast('Copy failed', 'error');
                  });
                },
                className: 'p-3 rounded-xl border-2 border-rose-600 bg-rose-50 hover:bg-rose-100 text-center transition-all hover:shadow-md'
              },
                h('div', { className: 'text-2xl mb-1' }, '\uD83D\uDCCB'),
                h('div', { className: 'text-xs font-bold text-rose-700' }, __alloT('stem.gamestudio.share_code', 'Share Code'))
              )
            ),

            // Import share code
            h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
              h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.import_from_share_code', '\uD83D\uDCCB Import from Share Code')),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'text', placeholder: __alloT('stem.gamestudio.paste_share_code', 'Paste share code...'),
                  'aria-label': __alloT('stem.gamestudio.paste_share_code_to_import_a_game', 'Paste share code to import a game'),
                  id: 'gs-share-import',
                  className: 'flex-1 text-xs border border-rose-600 rounded-lg px-2 py-1.5'
                }),
                h('button', { 'aria-label': __alloT('stem.gamestudio.load', 'Load'),
                  onClick: function() {
                    var el = document.getElementById('gs-share-import');
                    if (!el || !el.value.trim()) return;
                    try {
                      var json = decodeURIComponent(escape(atob(el.value.trim())));
                      var data = JSON.parse(json, function(k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; });
                      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid share code');
                      var safeW = Math.max(4, Math.min(24, Math.floor(Number(data.gridW)) || 16));
                      var safeH = Math.max(4, Math.min(18, Math.floor(Number(data.gridH)) || 12));
                      var safeType = ['topdown', 'platformer', 'puzzle'].indexOf(data.gameType) >= 0 ? data.gameType : 'topdown';
                      upd({
                        projectName: typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 80) : 'Shared Game',
                        gridW: safeW, gridH: safeH,
                        gameType: safeType, isPlaying: false, playWorld: null,
                        tiles: cleanTiles(data.tiles, safeW, safeH),
                        sprites: (data.sprites && typeof data.sprites === 'object' && !Array.isArray(data.sprites)) ? data.sprites : {},
                        events: cleanEvents(data.events),
                        looks: gsCleanLooks(data.looks)
                      });
                      el.value = '';
                      if (addToast) addToast('\uD83D\uDCE5 Game loaded!', 'success');
                    } catch(err) { if (addToast) addToast('\u274C Invalid share code', 'error'); }
                  },
                  className: 'px-3 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-lg transition-all'
                }, __alloT('stem.gamestudio.load_2', 'Load'))
              )
            ),

            // Starter projects
            h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
              h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.starter_projects', '\uD83C\uDFAE Starter Projects')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                STARTERS.map(function(starter) {
                  return h('button', { key: starter.name,
                    onClick: function() {
                      _gsPlayRef.current = null;
                      setTiles(Object.assign({}, starter.tiles), { extra: { projectName: starter.name, gameType: starter.type, gridW: 16, gridH: 12, tab: 'map', isPlaying: false, playWorld: null } });
                      if (addToast) addToast('\uD83C\uDFAE Loaded "' + starter.name + '"!', 'success');
                    },
                    className: 'p-3 rounded-xl border-2 border-rose-600 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 text-left transition-all hover:shadow-md'
                  },
                    h('div', { className: 'text-2xl mb-1' }, starter.icon),
                    h('div', { className: 'text-xs font-bold text-rose-800' }, starter.name),
                    h('div', { className: 'text-[0.6875rem] text-rose-700' }, starter.desc)
                  );
                })
              )
            ),

            // Quick stats
            h('div', { className: 'p-3 rounded-xl border border-slate-400 bg-slate-50' },
              h('div', { className: 'text-xs font-bold text-slate-700 mb-2' }, __alloT('stem.gamestudio.project_stats', '\uD83D\uDCCA Project Stats')),
              h('div', { className: 'grid grid-cols-3 gap-3 text-center' },
                h('div', null,
                  h('div', { className: 'text-lg font-black text-slate-800' }, Object.keys(tiles).length),
                  h('div', { className: 'text-[0.6875rem] text-slate-600' }, __alloT('stem.gamestudio.tiles_placed_2', 'Tiles Placed'))
                ),
                h('div', null,
                  h('div', { className: 'text-lg font-black text-slate-800' }, (function() {
                    var types = {};
                    Object.keys(tiles).forEach(function(k) { types[tiles[k]] = true; });
                    return Object.keys(types).length;
                  })()),
                  h('div', { className: 'text-[0.6875rem] text-slate-600' }, __alloT('stem.gamestudio.tile_types', 'Tile Types'))
                ),
                h('div', null,
                  h('div', { className: 'text-lg font-black text-slate-800' }, Object.keys(spritePixels).length),
                  h('div', { className: 'text-[0.6875rem] text-slate-600' }, __alloT('stem.gamestudio.pixels_drawn', 'Pixels Drawn'))
                )
              )
            )
          ),

          // === H7b'' RICH inquiry widget: difficulty curve tuner ===
          gsTab === 'diffHunt' && (function() {
            var iq = _gs._diffHunt || { enemies: 5, patrolSpeed: 50, hazards: 30, coins: 50, health: 100, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
            function setIQ(patch) { upd({ _diffHunt: Object.assign({}, iq, patch) }); }
            var diffScore = (iq.enemies / 10) * 2 + (iq.patrolSpeed / 100) * 1.5 + (iq.hazards / 100) * 1.8 - (iq.coins / 100) * 0.8 - (iq.health / 200);
            var state;
            if (diffScore < 1) state = 'veryEasy';
            else if (diffScore < 2.5) state = 'easy';
            else if (diffScore < 4) state = 'medium';
            else if (diffScore < 6) state = 'hard';
            else state = 'expert';
            var sm = {
              veryEasy: { label: __alloT('stem.gamestudio.very_easy', '🟢 Very Easy'), color: '#047857', bg: '#ecfdf5', border: '#86efac', deaths: 0, time: '< 2 min' },
              easy:     { label: __alloT('stem.gamestudio.easy', '🟢 Easy'), color: '#0e7490', bg: '#ecfeff', border: '#67e8f9', deaths: 1, time: '2-5 min' },
              medium:   { label: __alloT('stem.gamestudio.medium', '🟡 Medium'), color: '#b45309', bg: '#fffbeb', border: '#fcd34d', deaths: 4, time: '5-15 min' },
              hard:     { label: __alloT('stem.gamestudio.hard', '🟠 Hard'), color: '#c2410c', bg: '#fff7ed', border: '#fdba74', deaths: 12, time: '15-45 min' },
              expert:   { label: __alloT('stem.gamestudio.expert', '🔴 Expert'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', deaths: 40, time: '1+ hours' }
            }[state];
            // Build SVG difficulty curve from 11 progress points (clamped inside chart bounds)
            var curvePoints = [];
            for (var p = 0; p <= 100; p += 10) {
              var rampedDiff = diffScore * (0.3 + p / 100 * 0.7);
              var cy = Math.max(22, Math.min(130, 130 - rampedDiff * 14));
              curvePoints.push([36 + (p / 100) * 304, cy]);
            }
            var pathStr = 'M ' + curvePoints.map(function(pt) { return pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' L ');
            var areaStr = pathStr + ' L 340,130 L 36,130 Z';
            // ---- Measured on the student's own level by the game engine ----
            var meas = gsSolveCached(tiles, gridW, gridH, engineOpts);
            var mZone = GS_E.chaseZone(tiles, gridW, gridH, engineOpts);
            var routeChase = 0, routeClose = 0;
            (meas.path || []).forEach(function(p) {
              var pk = p[0] + ',' + p[1];
              if (mZone[pk]) routeChase++;
              if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(function(d) { var nt = tiles[(p[0] + d[0]) + ',' + (p[1] + d[1])]; return nt === 'lava' || nt === 'spikes'; })) routeClose++;
            });
            var mLog = Array.isArray(_gs.measureLog) ? _gs.measureLog : [];
            var setRule = function(k, v) { var nr = Object.assign({}, rulesCfg); nr[k] = v; upd({ rules: nr }); };
            var winTxt = meas.winnable === true ? __alloT('stem.gamestudio.m_yes', 'Yes') : meas.winnable === false ? __alloT('stem.gamestudio.m_no', 'No') : __alloT('stem.gamestudio.m_unknown', 'Too big to check');
            var stat = function(label, value, note) {
              return h('div', { className: 'p-2.5 rounded-xl border border-slate-300 bg-slate-50' },
                h('div', { className: 'text-[0.75rem] font-bold text-slate-700' }, label),
                h('div', { className: 'text-lg font-black text-slate-900 leading-tight' }, value),
                note && h('div', { className: 'text-[0.75rem] text-slate-700' }, note));
            };
            var measurePanel = h('div', { className: 'gs-panel p-4 rounded-2xl bg-white border-2 border-indigo-300 space-y-3' },
              h('h3', { className: 'text-sm font-black text-indigo-950 m-0' }, '📏 ' + __alloT('stem.gamestudio.measure_title', 'Measure your level (the game engine plays it)')),
              h('p', { className: 'text-[0.75rem] text-slate-800 m-0' }, __alloT('stem.gamestudio.measure_intro', 'Change ONE rule or ONE thing on the map. Predict what will change. Then read the new numbers, and play it to feel the difference.')),
              !meas.hasPlayer ? h('p', { className: 'text-xs font-bold text-amber-900 m-0' }, __alloT('stem.gamestudio.check_no_player', 'No player yet. Put a Player tile where the game should start.')) :
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2', role: 'status' },
                stat(__alloT('stem.gamestudio.m_can_win', 'Can it be won?'), winTxt),
                stat(__alloT('stem.gamestudio.m_moves', 'Fewest moves to win'), meas.winnable ? meas.moves : '—'),
                stat(__alloT('stem.gamestudio.m_lives', 'Lives lost on the safest route'), meas.winnable ? meas.livesLost + ' / ' + meas.startLives : '—'),
                stat(__alloT('stem.gamestudio.m_coins', 'Coins a player can reach'), meas.coinsReach + ' / ' + meas.coinsTotal),
                stat(__alloT('stem.gamestudio.m_chase', 'Route squares an enemy can chase'), meas.winnable ? routeChase : '—', __alloT('stem.gamestudio.m_chase_note', 'Counted from where enemies start.')),
                stat(__alloT('stem.gamestudio.m_close', 'Route squares next to lava or spikes'), meas.winnable ? routeClose : '—')
              ),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                h('div', null,
                  h('label', { htmlFor: 'gs-rule-lives', className: 'block text-[0.75rem] font-bold text-slate-800' }, __alloT('stem.gamestudio.rule_lives', 'Starting lives: ') , h('span', { className: 'font-mono text-indigo-800' }, engineS.lives)),
                  h('input', { id: 'gs-rule-lives', type: 'range', min: 1, max: 5, step: 1, value: engineS.lives, className: 'w-full', style: { minHeight: '32px' },
                    'aria-valuetext': engineS.lives + ' ' + __alloT('stem.gamestudio.lives_word', 'lives'),
                    onChange: function(e) { setRule('lives', parseInt(e.target.value, 10)); } })),
                h('div', null,
                  h('label', { htmlFor: 'gs-rule-chase', className: 'block text-[0.75rem] font-bold text-slate-800' }, __alloT('stem.gamestudio.rule_chase', 'Enemy chase range (steps): '), h('span', { className: 'font-mono text-indigo-800' }, engineS.chase)),
                  h('input', { id: 'gs-rule-chase', type: 'range', min: 0, max: 6, step: 1, value: engineS.chase, className: 'w-full', style: { minHeight: '32px' },
                    'aria-valuetext': engineS.chase + ' ' + __alloT('stem.gamestudio.steps_word', 'steps'),
                    onChange: function(e) { setRule('chase', parseInt(e.target.value, 10)); } }))
              ),
              h('p', { className: 'text-[0.75rem] text-slate-700 m-0' }, __alloT('stem.gamestudio.rules_used_everywhere', 'These rules are used everywhere: in Play, in the level test and in the challenges.')),
              h('div', { className: 'flex flex-wrap gap-2' },
                meas.hasPlayer && h('button', { type: 'button', style: { minHeight: '44px' },
                  onClick: function() { upd({ measureLog: mLog.concat([{ n: projectName, l: engineS.lives, c: engineS.chase, w: winTxt, m: meas.winnable ? meas.moves : '—', lost: meas.winnable ? meas.livesLost : '—', co: meas.coinsReach + '/' + meas.coinsTotal, ch: meas.winnable ? routeChase : '—' }]).slice(-8) }); },
                  className: 'px-3 py-2 rounded-lg text-xs font-bold text-indigo-950 bg-indigo-50 border border-indigo-500 hover:bg-indigo-100' }, '📋 ' + __alloT('stem.gamestudio.save_measure', 'Save this measurement')),
                h('button', { type: 'button', style: { minHeight: '44px' }, onClick: function() { startGame({ tab: 'play' }); },
                  className: 'px-3 py-2 rounded-lg text-xs font-black text-white bg-green-700 hover:bg-green-800' }, '▶️ ' + __alloT('stem.gamestudio.play_it', 'Play it')),
                mLog.length > 0 && h('button', { type: 'button', style: { minHeight: '44px' }, onClick: function() { upd({ measureLog: [] }); },
                  className: 'px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-500' }, '↺ ' + __alloT('stem.gamestudio.clear_log', 'Clear log'))
              ),
              mLog.length > 0 && h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'text-[0.75rem] w-full border-collapse text-slate-800' },
                  h('thead', null, h('tr', { className: 'bg-slate-100' },
                    [__alloT('stem.gamestudio.col_level', 'level'), __alloT('stem.gamestudio.col_lives', 'lives'), __alloT('stem.gamestudio.col_chase', 'chase'), __alloT('stem.gamestudio.col_win', 'can win'), __alloT('stem.gamestudio.col_moves', 'moves'), __alloT('stem.gamestudio.col_lost', 'lives lost'), __alloT('stem.gamestudio.col_coins', 'coins'), __alloT('stem.gamestudio.col_chased', 'chased squares')].map(function(c, i) { return h('th', { scope: 'col', key: 'mh' + i, className: 'px-1 border border-slate-200 text-left' }, c); }))),
                  h('tbody', null, mLog.map(function(o, idx) {
                    return h('tr', { key: 'ml' + idx }, [o.n, o.l, o.c, o.w, o.m, o.lost, o.co, o.ch].map(function(v, j) { return h('td', { key: j, className: 'px-1 border border-slate-200 font-mono' }, String(v)); }));
                  }))
                )
              )
            );
            return h('div', { className: 'space-y-3' },
              measurePanel,
              h('details', { className: 'gs-panel rounded-2xl bg-white border-2 border-rose-200' },
                h('summary', { className: 'p-3 text-xs font-bold text-rose-900 cursor-pointer', style: { minHeight: '44px' } }, '💭 ' + __alloT('stem.gamestudio.formula_summary', 'Thought experiment: a made-up difficulty formula (it does not look at your map)')),
              h('div', { className: 'p-4 pt-0 space-y-3' },
                h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
                  h('h3', { className: 'text-sm font-black text-rose-900 m-0' }, __alloT('stem.gamestudio.difficulty_curve_tuner_discovery', '📈 Difficulty curve tuner — discovery')),
                  // Quick preset profiles
                  h('div', { className: 'flex flex-wrap gap-1.5' },
                    [
                      { id: 'cozy', label: '🌱 Cozy', v: { enemies: 2, patrolSpeed: 20, hazards: 10, coins: 85, health: 160 } },
                      { id: 'balanced', label: '⚖️ Balanced', v: { enemies: 6, patrolSpeed: 50, hazards: 35, coins: 50, health: 100 } },
                      { id: 'gauntlet', label: '🔥 Boss Gauntlet', v: { enemies: 16, patrolSpeed: 85, hazards: 80, coins: 20, health: 50 } }
                    ].map(function(pr) {
                      return h('button', { key: pr.id, type: 'button', onClick: function() { setIQ(pr.v); },
                        className: 'px-2.5 py-1 rounded-full text-[0.6875rem] font-bold bg-rose-50 text-rose-900 border border-rose-500 hover:bg-rose-100 cursor-pointer'
                      }, pr.label);
                    })
                  )
                ),
                h('p', { className: 'text-[0.75rem] text-slate-700 leading-relaxed' }, __alloT('stem.gamestudio.five_sliders_for_level_parameters_widg', 'Five sliders for level parameters. Widget classifies overall difficulty into 5 discrete tiers and renders the difficulty progression curve. No score on your tuning — the inquiry is in finding what shapes the curve.')),
                // Discrete state marker
                h('div', { className: 'gs-panel p-3.5 rounded-xl text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-lg font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-xs text-slate-800 font-semibold mt-1' }, __alloT('stem.gamestudio.formula_only_note', 'This tier comes from the made-up formula below. It does not play your level, so it cannot tell you deaths or time.')),
                  h('div', { className: 'text-[0.6875rem] text-slate-700 mt-1 font-mono' }, 'Composite difficulty score = ' + diffScore.toFixed(2))
                ),
                // SVG difficulty curve visualization (wide viewBox with clean right-side labels inside bounds)
                h('div', { className: 'p-3 rounded-xl border border-slate-300 bg-slate-50' },
                  h('svg', { role: 'img', 'aria-label': __alloT('stem.gamestudio.curve_img', 'Difficulty curve chart'), viewBox: '0 0 400 156', className: 'w-full h-auto block', style: { maxHeight: '200px' } },
                    // Tier reference bands (very easy / easy / med / hard / expert)
                    h('rect', { x: 36, y: 116, width: 304, height: 14, fill: '#dcfce7', opacity: 0.75 }),
                    h('rect', { x: 36, y: 95, width: 304, height: 21, fill: '#cffafe', opacity: 0.75 }),
                    h('rect', { x: 36, y: 74, width: 304, height: 21, fill: '#fef3c7', opacity: 0.75 }),
                    h('rect', { x: 36, y: 53, width: 304, height: 21, fill: '#ffedd5', opacity: 0.75 }),
                    h('rect', { x: 36, y: 20, width: 304, height: 33, fill: '#fee2e2', opacity: 0.75 }),
                    // Horizontal grid rules
                    [53, 74, 95, 116].map(function(gy) {
                      return h('line', { key: 'g' + gy, x1: 36, y1: gy, x2: 340, y2: gy, stroke: '#cbd5e1', strokeWidth: 0.8, strokeDasharray: '3 3' });
                    }),
                    // Axes
                    h('line', { x1: 36, y1: 130, x2: 340, y2: 130, stroke: '#64748b', strokeWidth: 1.5 }),
                    h('line', { x1: 36, y1: 20, x2: 36, y2: 130, stroke: '#64748b', strokeWidth: 1.5 }),
                    // Area under curve + smooth stroke
                    h('path', { d: areaStr, fill: sm.color, opacity: 0.16 }),
                    h('path', { d: pathStr, stroke: sm.color, strokeWidth: 3, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }),
                    // Curve point markers + luminous endpoint beacon
                    curvePoints.length > 0 && h('circle', { className: 'gs-curve-beacon', cx: curvePoints[curvePoints.length - 1][0], cy: curvePoints[curvePoints.length - 1][1], r: 5.2, fill: 'none', stroke: sm.color, strokeWidth: 1.4, 'aria-hidden': 'true' }),
                    curvePoints.filter(function(_, i) { return i % 2 === 0; }).map(function(pt, i) {
                      return h('circle', { key: 'cp' + i, cx: pt[0], cy: pt[1], r: 3.5, fill: '#ffffff', stroke: sm.color, strokeWidth: 2 });
                    }),
                    // Labels (strictly within 0..400 x 0..156 bounds)
                    h('text', { className: 'gs-chart-ink', x: 188, y: 149, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: '#334155' }, __alloT('stem.gamestudio.game_progress_0_100', 'Game progress 0% → 100%')),
                    h('text', { className: 'gs-chart-ink', x: 14, y: 76, textAnchor: 'middle', fontSize: 10, fontWeight: 700, fill: '#334155', transform: 'rotate(-90 14 76)' }, __alloT('stem.gamestudio.difficulty', 'Difficulty')),
                    h('text', { className: 'gs-chart-ink', x: 346, y: 39, fontSize: 9, fontWeight: 700, fill: '#991b1b' }, __alloT('stem.gamestudio.expert_2', 'Expert')),
                    h('text', { className: 'gs-chart-ink', x: 346, y: 88, fontSize: 9, fontWeight: 700, fill: '#92400e' }, __alloT('stem.gamestudio.medium_2', 'Medium')),
                    h('text', { className: 'gs-chart-ink', x: 346, y: 126, fontSize: 9, fontWeight: 700, fill: '#065f46' }, __alloT('stem.gamestudio.easy_2', 'Easy'))
                  ),
                  h('div', { className: 'text-[0.6875rem] text-slate-700 text-center italic mt-1' },
                    __alloT('stem.gamestudio.curve_shows_difficulty_ramping_over_ga', 'Curve shows difficulty ramping over game progress. Compare different parameter combinations.'))
                ),
                // Sliders
                h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                  [{ k: 'enemies', l: 'Enemies', mn: 0, mx: 20, st: 1 },
                   { k: 'patrolSpeed', l: 'Patrol speed', mn: 0, mx: 100, st: 5 },
                   { k: 'hazards', l: 'Hazards', mn: 0, mx: 100, st: 5 },
                   { k: 'coins', l: 'Coin abundance', mn: 0, mx: 100, st: 5 },
                   { k: 'health', l: 'Player health', mn: 1, mx: 200, st: 5 }].map(function(s) {
                    return h('div', { key: s.k },
                      h('label', { htmlFor: 'dt-' + s.k, className: 'block text-[0.6875rem] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-rose-700' }, iq[s.k])),
                      h('input', { id: 'dt-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-valuetext': __alloAriaFill({ enemies: __alloT('stem.gamestudio.a11y_value_enemies', '{value} enemies'), patrolSpeed: __alloT('stem.gamestudio.a11y_value_percent_speed', '{value}% speed'), hazards: __alloT('stem.gamestudio.a11y_value_percent_hazards', '{value}% hazards'), coins: __alloT('stem.gamestudio.a11y_value_percent_coin_abundance', '{value}% coin abundance'), health: __alloT('stem.gamestudio.a11y_value_hp', '{value} HP') }[s.k] || '{value}', { value: iq[s.k] }), 'aria-label': s.l }));
                  })
                ),
                // Log + reset
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ e: iq.enemies, p: iq.patrolSpeed, h: iq.hazards, c: iq.coins, hp: iq.health, d: diffScore.toFixed(2), st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[0.6875rem] font-bold text-slate-700 border border-slate-500' }, __alloT('stem.gamestudio.log', '📋 Log')),
                  h('button', { onClick: function() { setIQ({ enemies: 5, patrolSpeed: 50, hazards: 30, coins: 50, health: 100, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[0.6875rem] font-semibold text-slate-600 border border-slate-500' }, __alloT('stem.gamestudio.reset', '↺ Reset')),
                  (iq.log || []).length > 0 && h('span', { className: 'text-[0.625rem] text-slate-500 italic' }, (iq.log || []).length + ' logged')
                ),
                // Log table
                (iq.log || []).length > 0 && h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'text-[0.625rem] w-full border-collapse text-slate-700' },
                    h('thead', null, h('tr', { className: 'bg-slate-100' },
                      ['enemies', 'patrol', 'hazards', 'coins', 'health', 'score', 'tier'].map(function(c, i) { return h('th', { scope: 'col', key: 'h' + i, className: 'px-1 border border-slate-200 text-left' }, c); }))),
                    h('tbody', null, iq.log.map(function(o, idx) {
                      return h('tr', { key: 'lr' + idx },
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.e),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.p),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.h),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.c),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.hp),
                        h('td', { className: 'px-1 border border-slate-200 font-mono' }, o.d),
                        h('td', { className: 'px-1 border border-slate-200' }, o.st));
                    }))
                  )
                ),
                // Hypothesis textarea
                h('textarea', { 'aria-label': __alloT('stem.gamestudio.hypothesis_input', 'Difficulty curve hypothesis'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.gamestudio.hypothesis_free_text_no_right_answer_w', 'Hypothesis (free text — no right answer): Which slider has the biggest effect on difficulty? Does the curve change shape, or just height?'),
                  className: 'w-full text-[0.75rem] border border-slate-500 rounded p-2 font-mono leading-snug', rows: 3 }),
                // Opt-in stuck prompts
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[0.6875rem] font-bold text-amber-800 border border-amber-600' }, __alloT('stem.gamestudio.stuck_show_open_prompts_no_answers', '🤔 Stuck — show open prompts (no answers)')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-700 leading-relaxed' },
                  h('div', { className: 'font-bold text-amber-900 mb-1' }, __alloT('stem.gamestudio.open_prompts_investigate_by_manipulati', 'Open prompts — investigate by manipulating:')),
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, __alloT('stem.gamestudio.hold_4_sliders_steady_move_1_watch_the', 'Hold 4 sliders steady. Move 1. Watch the curve. Repeat with each.')),
                    h('li', null, __alloT('stem.gamestudio.find_two_combinations_that_yield_the_s', 'Find two combinations that yield the same tier. What do they share?')),
                    h('li', null, __alloT('stem.gamestudio.what_player_friendly_design_choices_lo', 'What player-friendly design choices (lots of coins, lots of health) compensate for high enemy count?')),
                    h('li', null, __alloT('stem.gamestudio.real_games_use_difficulty_curves_that_', 'Real games use "difficulty curves" that ramp slowly then plateau. Investigate why.')),
                    h('li', null, __alloT('stem.gamestudio.log_4_5_medium_observations_look_at_co', 'Log 4-5 "medium" observations. Look at composite score — is there a single threshold?')))),
                // Self-mark
                h('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('input', { type: 'checkbox', id: 'dt-und', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                    h('label', { htmlFor: 'dt-und', className: 'text-[0.75rem] font-bold text-emerald-900 cursor-pointer' },
                      __alloT('stem.gamestudio.i_think_i_understand_difficulty_tuning', 'I think I understand difficulty tuning now — let me explain it in my own words'))),
                  iq.understood && h('textarea', { 'aria-label': __alloT('stem.gamestudio.explanation_input', 'Difficulty curve explanation'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.gamestudio.explain_in_your_own_words_how_do_the_5', 'Explain in your own words: how do the 5 parameters jointly determine difficulty? What player-experience metric does each map to?'),
                    className: 'w-full text-[0.75rem] border border-emerald-600 rounded p-2 font-mono leading-snug', rows: 4 }),
                  iq.understood && (iq.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[0.625rem] italic text-emerald-700' },
                    __alloT('stem.gamestudio.saved_notice_nobody_checked_your_answe', '✓ Saved. Notice — nobody checked your answer. That is what learner-driven inquiry looks like.'))
                ),
                h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[0.625rem] italic text-slate-600' },
                  __alloT('stem.gamestudio.design_note_discrete_5_tier_difficulty', 'Design note: discrete 5-tier difficulty marker; SVG curve shows shape not score; no "right" tuning revealed — by design.'))
              ))
            );
          })()
          ), // end tabpanel

          // ---- BACK BUTTON ----
          h('div', { className: 'mt-6 text-center' },
            h('button', { 'aria-label': __alloT('stem.gamestudio.back_to_tools', 'Back to Tools'),
              onClick: function() { setStemLabTool(null); },
              className: 'px-6 py-2.5 text-sm font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-600 rounded-xl transition-all'
            }, __alloT('stem.gamestudio.back_to_tools_2', '\u2190 Back to Tools'))
          )
        );
      })();
    }
  });
})();