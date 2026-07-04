// ============================================================
// stem_tool_gamestudio.js — Game Design Studio (STEM Lab)
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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _gsAC = null;
  function getGsAC() { if (!_gsAC) { try { _gsAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_gsAC && _gsAC.state === "suspended") { try { _gsAC.resume(); } catch(e) {} } return _gsAC; }
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
    { id: 'lava', label: 'Lava', emoji: '\uD83D\uDFE7', color: '#ef4444' },
    { id: 'ice', label: 'Ice', emoji: '\uD83E\uDEF5', color: '#bae6fd' },
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
    { id: 'treasure', label: 'Treasure', emoji: '\uD83D\uDC8E', color: '#06b6d4' }
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
      funFact: 'Most modern games run their game loop 60 times per second (60 FPS). That means the entire Input \u2192 Update \u2192 Render cycle completes in just 16 milliseconds!',
      realGame: 'In Super Mario Bros., the game loop reads if Mario is pressing jump (input), applies gravity and checks platform collisions (update), then draws Mario at his new position (render).',
      quiz: {
        question: 'A player presses the jump button and their character rises up on screen. What is the correct order of phases?',
        options: ['Render \u2192 Input \u2192 Update', 'Input \u2192 Update \u2192 Render', 'Update \u2192 Render \u2192 Input', 'Input \u2192 Render \u2192 Update'],
        correct: 1,
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
      funFact: 'Nintendo uses a philosophy called "Kishoten-ketsu" (introduction, development, twist, conclusion) to structure every single level in Mario games.',
      realGame: 'World 1-1 of Super Mario Bros. teaches you to jump, collect coins, hit blocks, and avoid enemies \u2014 all without a single word of instructions.',
      quiz: {
        question: 'You want to teach players a new "ice sliding" mechanic. What is the best approach?',
        options: [
          'Put ice right next to lava so they learn the danger immediately',
          'Show a small ice patch in a safe area first, then add hazards nearby later',
          'Write a text tutorial explaining how ice works',
          'Make the entire level ice so they have lots of practice'
        ],
        correct: 1,
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
      funFact: 'The original Pac-Man used tile-based collision, exactly like our Game Studio. Each character occupied one tile, and the game checked which tile the ghost and Pac-Man were on.',
      realGame: 'In Pac-Man, ghost collision uses the same tile-based approach we use here: if Pac-Man and a ghost are on the same grid cell, it\'s a collision!',
      quiz: {
        question: 'In a tile-based game, how do you check if the player collides with a coin?',
        options: [
          'Measure the pixel distance between them',
          'Check if they occupy the same grid cell',
          'See if their colors overlap on screen',
          'Wait for the player to press a "collect" button'
        ],
        correct: 1,
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
      funFact: 'In Pac-Man, each ghost has a unique AI personality: Blinky chases directly, Pinky aims 4 tiles ahead of Pac-Man, Inky uses complex targeting, and Clyde runs away when close!',
      realGame: 'Minecraft\'s Creeper uses a simple "chase when close, idle when far" pattern. This simple AI creates one of gaming\'s most iconic and terrifying enemies!',
      quiz: {
        question: 'Which enemy AI pattern creates the most PREDICTABLE behavior for the player?',
        options: ['Chase (follows player)', 'Patrol (walks back and forth)', 'Random (moves randomly)', 'Swarm (all enemies converge)'],
        correct: 1,
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
      funFact: 'The game "Vlambeer\'s Action" became famous for demonstrating "juice" \u2014 adding screen shake, particles, and sound to a boring game made it feel 10x better without changing gameplay!',
      realGame: 'When Mario collects a coin, you see it spin upward, hear "bling!", see a +200 score popup, and your coin counter increases. That\'s 4 layers of feedback for one tiny action!',
      quiz: {
        question: 'A player collects a coin but gets no feedback (no sound, no visual, just a silent score increase). What is the likely problem?',
        options: [
          'The game has a bug',
          'The player won\'t notice or feel rewarded for their action',
          'This is fine \u2014 the score changing is enough feedback',
          'The game needs more coins to compensate'
        ],
        correct: 1,
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
      funFact: 'Nintendo playtests every Mario level with people who have never seen it. They watch silently, taking notes on every death, every hesitation, and every moment of confusion.',
      realGame: 'The game Flappy Bird went through weeks of difficulty tuning. The gap between pipes, pipe speed, and gravity were all adjusted based on playtesting until the difficulty felt "just right."',
      quiz: {
        question: 'You built a level and 5 out of 5 playtesters died at the same spot. What should you do?',
        options: [
          'Tell them to get better at the game',
          'Make that section easier or add a hint/safe zone',
          'Remove that section entirely',
          'Add a "skip level" button'
        ],
        correct: 1,
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

  var CHALLENGES = [
    {
      id: 'first_steps', title: 'First Steps', icon: '\uD83D\uDC76', difficulty: 1, xp: 10,
      desc: 'Create your first playable level with a player, coins, and a goal.',
      hint: 'Place a Player, at least 3 Coins, and a Flag on your map. Keep it simple!',
      requirements: [
        { text: 'Place a player', check: function(t) { return hasTile(t, 'player'); } },
        { text: 'Place 3+ coins', check: function(t) { return countTile(t, 'coin') >= 3; } },
        { text: 'Place a goal flag', check: function(t) { return hasTile(t, 'flag'); } }
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
        { text: 'Player and flag placed', check: function(t) { return hasTile(t, 'player') && hasTile(t, 'flag'); } }
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
        }}
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
        { text: 'At least 1 NPC', check: function(t) { return hasTile(t, 'npc'); } }
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
        { text: 'Include walls for cover', check: function(t) { return countTile(t, 'wall') >= 8; } }
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
        { text: 'At least 30 total tiles placed', check: function(t) { return Object.keys(t).length >= 30; } }
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
      t['9,5']='enemy'; t['13,3']='enemy';
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
    makeStarter('Ice Cavern', 'puzzle', '\uD83E\uDEF5', 'Slide on ice to reach the exit!', function() {
      var t = {}, x, y;
      for (x = 0; x < 16; x++) { t[x+',0'] = 'wall'; t[x+',11'] = 'wall'; }
      for (y = 0; y < 12; y++) { t['0,'+y] = 'wall'; t['15,'+y] = 'wall'; }
      for (x = 1; x < 15; x++) for (y = 1; y < 11; y++) t[x+','+y] = 'ice';
      t['4,4'] = 'wall'; t['4,5'] = 'wall'; t['8,3'] = 'wall'; t['8,7'] = 'wall';
      t['12,5'] = 'wall'; t['12,6'] = 'wall'; t['6,8'] = 'wall';
      t['2,2'] = 'grass'; t['7,5'] = 'grass'; t['13,9'] = 'grass';
      t['5,2'] = 'coin'; t['10,4'] = 'coin'; t['3,8'] = 'coin';
      t['1,1'] = 'player'; t['14,10'] = 'flag';
      t['6,3'] = 'heart';
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
  // REGISTER TOOL
  // ============================================================

  window.StemLab.registerTool('gameStudio', {
    icon: '\uD83C\uDFAE',
    label: 'Game Design Studio',
    desc: 'Build, play & learn 2D game design',
    color: 'rose',
    category: 'creativity',
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      var callGemini = ctx.callGemini;
      var callImagen = ctx.callImagen;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;

      return (function() {
        // == State ==
        var _gs = labToolData && labToolData.gameStudio || {};
        var upd = function(patch) {

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('gameStudio', 'init', {
              first: 'Game Studio loaded. Design and build interactive games using a visual editor with sprites, physics, and event scripting.',
              repeat: 'Game Studio active.',
              terse: 'Game Studio.'
            }, { debounce: 800 });
          }
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { gameStudio: Object.assign({}, prev && prev.gameStudio || {}, patch) });
          });
        };

        var gsTab = _gs.tab || 'map';
        var gridW = _gs.gridW || 16;
        var gridH = _gs.gridH || 12;
        var gameType = _gs.gameType || 'topdown';
        var tiles = _gs.tiles || {};
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

        // Events
        var events = _gs.events || {};
        var advancedCode = _gs.advancedCode || false;

        // Play mode
        var isPlaying = _gs.isPlaying || false;
        var playScore = _gs.playScore || 0;
        var playLives = _gs.playLives || 3;
        var playKeys = _gs.playKeys || 0;
        var playMoves = _gs.playMoves || 0;
        var playMessage = _gs.playMessage || null;
        var playWon = _gs.playWon || false;
        var playDead = _gs.playDead || false;
        var enemyDirs = _gs.enemyDirs || {};
        var playCoinsCollected = _gs.playCoinsCollected || 0;

        // Learn tab
        var activeLesson = _gs.activeLesson || null;
        var learnCompleted = _gs.learnCompleted || {};
        var learnAnswer = _gs.learnAnswer || null;
        var learnShowResult = _gs.learnShowResult || false;

        // Challenges tab
        var challengeCompleted = _gs.challengeCompleted || {};

        // Projects
        var projectName = _gs.projectName || 'My Game';
        var aiPrompt = _gs.aiPrompt || '';
        var aiLoading = _gs.aiLoading || false;
        var aiResult = _gs.aiResult || null;

        // == Tabs ==
        var TABS = [
          { id: 'map', icon: '\uD83D\uDDFA\uFE0F', label: 'Map' },
          { id: 'sprite', icon: '\uD83C\uDFA8', label: __alloT('stem.gamestudio.sprites', 'Sprites') },
          { id: 'events', icon: '\u26A1', label: __alloT('stem.gamestudio.events', 'Events') },
          { id: 'play', icon: '\u25B6\uFE0F', label: __alloT('stem.gamestudio.play', 'Play') },
          { id: 'learn', icon: '\uD83C\uDF93', label: __alloT('stem.gamestudio.learn', 'Learn') },
          { id: 'challenges', icon: '\uD83C\uDFC6', label: __alloT('stem.gamestudio.challenges', 'Challenges') },
          { id: 'projects', icon: '\uD83D\uDCBE', label: __alloT('stem.gamestudio.projects', 'Projects') },
          { id: 'diffHunt', icon: '\uD83D\uDCC8', label: __alloT('stem.gamestudio.difficulty_tuner', 'Difficulty Tuner') }
        ];

        var _bg = 'linear-gradient(135deg, #fff1f2, #ffe4e6, #fce7f3)';

        // == Game Engine: Process a player move ==
        function processMove(dir) {
          if (playWon || playDead) return;
          var pKey = null;
          Object.keys(tiles).forEach(function(k) { if (tiles[k] === 'player') pKey = k; });
          if (!pKey) return;

          var pp = pKey.split(',').map(Number);
          var dx = 0, dy = 0;
          if (dir === 'up') dy = -1;
          if (dir === 'down') dy = 1;
          if (dir === 'left') dx = -1;
          if (dir === 'right') dx = 1;

          var nx = pp[0] + dx, ny = pp[1] + dy;
          if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) return;
          var nk = nx + ',' + ny;
          var dest = tiles[nk] || 'empty';

          if (dest === 'wall' || dest === 'platform') return;

          var newT = Object.assign({}, tiles);
          var nScore = playScore;
          var nLives = playLives;
          var nKeys = playKeys;
          var nMoves = playMoves + 1;
          var nCoins = playCoinsCollected;
          var msg = null;
          var won = false;
          var dead = false;

          // Door logic
          if (dest === 'door') {
            if (nKeys > 0) {
              nKeys--;
              msg = '\uD83D\uDD13 Door unlocked! Keys: ' + nKeys;
            } else {
              upd({ playMessage: '\uD83D\uDD12 You need a key to open this door!' });
              return;
            }
          }

          // Collectibles
          if (dest === 'coin') { nScore += 10; nCoins++; msg = '\uD83E\uDE99 +10'; }
          if (dest === 'gem') { nScore += 50; msg = '\uD83D\uDC8E +50!'; }
          if (dest === 'treasure') { nScore += 100; msg = '\uD83D\uDC8E +100! Treasure!'; }
          if (dest === 'key') { nKeys++; nScore += 5; msg = '\uD83D\uDD11 Key collected! Keys: ' + nKeys; }
          if (dest === 'heart') { nLives++; msg = '\u2764\uFE0F +1 Life!'; }

          // Portal teleportation
          if (dest === 'portal') {
            var portals = [];
            Object.keys(newT).forEach(function(k) { if (newT[k] === 'portal' && k !== nk) portals.push(k); });
            if (portals.length > 0) {
              var tp = portals[0].split(',').map(Number);
              // Clear both portal ends
              delete newT[pKey];
              delete newT[nk];
              // Find empty spot next to destination portal
              var landDirs = [[1,0],[-1,0],[0,1],[0,-1]];
              var landed = false;
              for (var li = 0; li < landDirs.length; li++) {
                var lk = (tp[0]+landDirs[li][0]) + ',' + (tp[1]+landDirs[li][1]);
                var ld = newT[lk] || 'empty';
                if (WALKABLE[ld] && ld !== 'portal' && ld !== 'door') {
                  newT[lk] = 'player';
                  landed = true;
                  break;
                }
              }
              if (!landed) newT[portals[0]] = 'player';
              msg = '\uD83C\uDF00 Teleported!';
              upd({ tiles: newT, playScore: nScore, playLives: nLives, playKeys: nKeys, playMoves: nMoves, playCoinsCollected: nCoins, playMessage: msg });
              return;
            }
          }

          // Win condition
          if (dest === 'flag') {
            won = true;
            var bonus = Math.max(0, 500 - nMoves * 2);
            nScore += 100 + bonus;
            msg = '\uD83C\uDFC6 You Win! Score: ' + nScore + ' (efficiency bonus: +' + bonus + ')';
            if (typeof awardStemXP === 'function') awardStemXP('gameStudio', 10, 'completed game');
            if (addToast) addToast('\uD83C\uDFC6 You Win! Score: ' + nScore, 'success');
          }

          // Hazards
          if (dest === 'lava' || dest === 'spikes') {
            nLives--;
            nScore = Math.max(0, nScore - 20);
            msg = dest === 'lava' ? '\uD83D\uDD25 Ouch! Lava! -1 life' : '\u26A0\uFE0F Spikes! -1 life';
            if (nLives <= 0) {
              dead = true;
              msg = '\uD83D\uDC80 Game Over! Final score: ' + nScore;
              if (addToast) addToast('\uD83D\uDC80 Game Over!', 'error');
            }
          }

          // Enemy collision
          if (dest === 'enemy') {
            nLives--;
            nScore = Math.max(0, nScore - 15);
            msg = '\uD83D\uDC7E Hit by enemy! -1 life';
            if (nLives <= 0) {
              dead = true;
              msg = '\uD83D\uDC80 Game Over! Final score: ' + nScore;
              if (addToast) addToast('\uD83D\uDC80 Game Over!', 'error');
            }
          }

          // Move player
          delete newT[pKey];
          if (!dead) newT[nk] = 'player';

          // Ice sliding: if destination is ice, keep moving in same direction
          if (dest === 'ice' && !won && !dead) {
            var slideX = nx, slideY = ny;
            var maxSlide = 20;
            while (maxSlide-- > 0) {
              var snx = slideX + dx, sny = slideY + dy;
              if (snx < 0 || snx >= gridW || sny < 0 || sny >= gridH) break;
              var snk = snx + ',' + sny;
              var sDest = newT[snk] || 'empty';
              if (sDest === 'wall' || sDest === 'platform' || sDest === 'door' || sDest === 'enemy') break;
              // Slide onto this tile
              delete newT[(slideX + ',' + slideY)];
              if (sDest === 'coin') { nScore += 10; nCoins++; }
              if (sDest === 'gem') { nScore += 50; }
              if (sDest === 'key') { nKeys++; }
              if (sDest === 'heart') { nLives++; }
              if (sDest === 'flag') { won = true; nScore += 100; msg = '\uD83C\uDFC6 You Win!'; break; }
              if (sDest === 'lava' || sDest === 'spikes') {
                nLives--;
                if (nLives <= 0) { dead = true; msg = '\uD83D\uDC80 Game Over!'; break; }
              }
              slideX = snx; slideY = sny;
              newT[snx + ',' + sny] = 'player';
              if ((newT[snk] || sDest) !== 'ice') break; // stop sliding when leaving ice
              nMoves++;
            }
            if (!msg) msg = '\uD83E\uDEF5 Wheee! Ice slide!';
          }

          // Enemy patrol AI (turn-based: enemies move after player)
          if (!won && !dead) {
            var eKeys = [];
            Object.keys(newT).forEach(function(k) { if (newT[k] === 'enemy') eKeys.push(k); });
            var newDirs = Object.assign({}, enemyDirs);
            eKeys.forEach(function(ek) {
              var ep = ek.split(',').map(Number);
              var eDir = newDirs[ek] || (ep[0] % 2 === 0 ? 'right' : 'left');
              var edx = eDir === 'left' ? -1 : eDir === 'right' ? 1 : 0;
              var edy = eDir === 'up' ? -1 : eDir === 'down' ? 1 : 0;

              // Chase player if within 3 tiles (Manhattan distance)
              var pPos = null;
              Object.keys(newT).forEach(function(k2) { if (newT[k2] === 'player') pPos = k2; });
              if (pPos) {
                var pxy = pPos.split(',').map(Number);
                var dist = Math.abs(pxy[0] - ep[0]) + Math.abs(pxy[1] - ep[1]);
                if (dist <= 3 && dist > 0) {
                  // Chase: move toward player
                  var cdx = pxy[0] > ep[0] ? 1 : pxy[0] < ep[0] ? -1 : 0;
                  var cdy = pxy[1] > ep[1] ? 1 : pxy[1] < ep[1] ? -1 : 0;
                  if (Math.abs(pxy[0] - ep[0]) >= Math.abs(pxy[1] - ep[1])) { edx = cdx; edy = 0; }
                  else { edx = 0; edy = cdy; }
                }
              }

              var enx = ep[0] + edx, eny = ep[1] + edy;
              var enk = enx + ',' + eny;
              var eDest = newT[enk] || 'empty';

              if (eDest === 'player') {
                // Enemy catches player
                nLives--;
                msg = '\uD83D\uDC7E Caught by enemy! -1 life';
                if (nLives <= 0) { dead = true; msg = '\uD83D\uDC80 Game Over!'; }
              } else if (WALKABLE[eDest] && eDest !== 'door' && eDest !== 'key' && eDest !== 'coin' && eDest !== 'flag' && eDest !== 'portal' && eDest !== 'heart' && eDest !== 'gem' && eDest !== 'treasure' && eDest !== 'player') {
                // Move enemy
                delete newT[ek];
                newT[enk] = 'enemy';
                delete newDirs[ek];
                newDirs[enk] = eDir;
              } else {
                // Blocked: reverse
                var rev = eDir === 'left' ? 'right' : eDir === 'right' ? 'left' : eDir === 'up' ? 'down' : 'up';
                delete newDirs[ek];
                newDirs[ek] = rev;
              }
            });
            upd({ tiles: newT, playScore: nScore, playLives: nLives, playKeys: nKeys, playMoves: nMoves, playCoinsCollected: nCoins, playMessage: msg, playWon: won, playDead: dead, enemyDirs: newDirs });
          } else {
            upd({ tiles: newT, playScore: nScore, playLives: nLives, playKeys: nKeys, playMoves: nMoves, playCoinsCollected: nCoins, playMessage: msg, playWon: won, playDead: dead });
          }
        }

        // Key handler for play mode
        function onPlayKey(e) {
          if (!isPlaying || playWon || playDead) return;
          var dir = null;
          if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'up';
          if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'down';
          if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'left';
          if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'right';
          if (dir) { e.preventDefault(); processMove(dir); }
        }

        // Event code generator (for display)
        function genCode(rule) {
          var lines = [];
          if (rule.trigger === 'onKey') lines.push('if (input.' + (rule.param || 'ArrowUp') + ') {');
          else if (rule.trigger === 'onCollide') lines.push('if (collision(\'' + (rule.param || 'wall') + '\')) {');
          else if (rule.trigger === 'onTimer') lines.push('setInterval(() => {');
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

        return h('div', { className: 'max-w-4xl mx-auto animate-in fade-in duration-300' },

          // ---- HEADER ----
          h('div', { className: 'mb-4 p-4 rounded-2xl border-2 border-rose-200', style: { background: _bg } },
            h('div', { className: 'flex items-center gap-3' },
              h('span', { style: { fontSize: '28px' } }, '\uD83C\uDFAE'),
              h('div', { className: 'flex-1' },
                h('h2', { className: 'text-lg font-black text-rose-900' }, __alloT('stem.gamestudio.game_design_studio', 'Game Design Studio')),
                h('p', { className: 'text-xs text-rose-600' }, __alloT('stem.gamestudio.build_playable_2d_games_learn_game_des', 'Build playable 2D games \u2022 Learn game design \u2022 Earn XP'))
              ),
              h('div', { className: 'text-right' },
                h('div', { className: 'text-[11px] font-bold text-rose-400' }, __alloT('stem.gamestudio.tiles_placed', 'TILES PLACED')),
                h('div', { className: 'text-lg font-black text-rose-700' }, Object.keys(tiles).length)
              )
            )
          ),

          // ---- TAB BAR ----
          h('div', { className: 'flex gap-1 mb-4 p-1 bg-rose-50 rounded-xl border border-rose-200 overflow-x-auto' },
            TABS.map(function(tab) {
              var isActive = gsTab === tab.id;
              return h('button', { key: tab.id,
                onClick: function() { upd({ tab: tab.id, playMessage: null }); },
                className: 'flex-1 py-2 px-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ' +
                  (isActive ? 'bg-white text-rose-800 shadow-md border border-rose-600' : 'text-rose-500 hover:text-rose-700 hover:bg-rose-100')
              }, tab.icon + ' ' + tab.label);
            })
          ),


          // ============================================================
          // MAP EDITOR TAB
          // ============================================================
          gsTab === 'map' && h('div', { className: 'space-y-4' },

            // Grid + game type controls
            h('div', { className: 'flex flex-wrap gap-3 items-center' },
              h('label', { className: 'text-xs font-bold text-rose-700' }, 'Grid:'),
              h('select', {
                value: gridW + 'x' + gridH,
                onChange: function(e) {
                  var p = e.target.value.split('x');
                  upd({ gridW: parseInt(p[0]), gridH: parseInt(p[1]), tiles: {} });
                },
                'aria-label': __alloT('stem.gamestudio.grid_size', 'Grid size'),
                className: 'text-xs border border-rose-600 rounded-lg px-2 py-1.5 bg-white'
              },
                ['8x6','12x8','16x12','20x15','24x18'].map(function(s) { return h('option', { key: s, value: s }, s); })
              ),
              h('label', { className: 'text-xs font-bold text-rose-700 ml-3' }, 'Type:'),
              h('select', {
                value: gameType,
                onChange: function(e) { upd({ gameType: e.target.value }); },
                'aria-label': __alloT('stem.gamestudio.game_type', 'Game type'),
                className: 'text-xs border border-rose-600 rounded-lg px-2 py-1.5 bg-white'
              },
                h('option', { value: 'topdown' }, __alloT('stem.gamestudio.top_down', '\uD83D\uDD3D Top-Down')),
                h('option', { value: 'platformer' }, __alloT('stem.gamestudio.platformer', '\uD83C\uDFC3 Platformer')),
                h('option', { value: 'puzzle' }, __alloT('stem.gamestudio.puzzle', '\uD83E\uDDE9 Puzzle'))
              ),
              // Danger overlay toggle
              h('label', { className: 'flex items-center gap-1.5 ml-auto text-xs font-bold text-orange-600 cursor-pointer' },
                h('input', { type: 'checkbox', checked: showDanger, onChange: function() { upd({ showDanger: !showDanger }); } }),
                __alloT('stem.gamestudio.danger_map', '\u26A0\uFE0F Danger Map')
              ),
              // AI Map Gen
              callGemini && h('button', { onClick: function() {
                  upd({ aiLoading: true });
                  var prompt = 'Generate a ' + gridW + 'x' + gridH + ' tile map for a ' + gameType + ' game as JSON. ' +
                    'Use ONLY these tile IDs: empty, grass, water, wall, lava, ice, sand, path, door, key, coin, gem, flag, spikes, heart, portal, platform, player, enemy, npc, treasure. ' +
                    'Return ONLY a JSON object like {"tiles":{"0,0":"grass","1,0":"wall",...}} where keys are "x,y". ' +
                    'Include exactly 1 player, 1 flag (goal), 3-5 enemies, 5-10 coins, 1-2 keys and doors, and appropriate terrain. ' +
                    (aiPrompt ? 'Theme: ' + aiPrompt + '. ' : '') + 'No markdown, no explanation, ONLY the JSON.';
                  callGemini(prompt).then(function(res) {
                    try {
                      var clean = res.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
                      var parsed = JSON.parse(clean);
                      if (parsed.tiles) upd({ tiles: parsed.tiles, aiLoading: false, aiResult: '\u2705 Map generated!' });
                      else upd({ aiLoading: false, aiResult: '\u26A0\uFE0F Invalid format' });
                    } catch(e) { upd({ aiLoading: false, aiResult: '\u274C Parse error' }); }
                  }).catch(function() { upd({ aiLoading: false, aiResult: '\u274C AI error' }); });
                },
                disabled: aiLoading,
                'aria-busy': aiLoading,
                'aria-label': aiLoading ? 'Generating game asset' : 'AI generate game asset',
                className: 'px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all ' +
                  (aiLoading ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-md')
              }, aiLoading ? '\u23F3 Generating...' : '\u2728 AI Generate')
            ),

            callGemini && h('div', { className: 'flex gap-2' },
              h('input', {
                type: 'text', value: aiPrompt,
                onChange: function(e) { upd({ aiPrompt: e.target.value }); },
                placeholder: __alloT('stem.gamestudio.theme_forest_maze_ice_castle_dungeon', 'Theme: forest maze, ice castle, dungeon...'),
                'aria-label': __alloT('stem.gamestudio.ai_map_generation_theme', 'AI map generation theme'),
                className: 'flex-1 text-xs border border-rose-600 rounded-lg px-2 py-1.5'
              }),
              aiResult && h('span', { className: 'text-xs font-bold self-center ' + (aiResult.charAt(0) === '\u2705' ? 'text-green-600' : 'text-red-500') }, aiResult)
            ),

            // Tile palette + brush tools
            h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xs font-bold text-rose-700' }, __alloT('stem.gamestudio.tiles', 'Tiles')),
                h('div', { className: 'flex gap-1 ml-auto' },
                  [{ id: 'brush', icon: '\u270F\uFE0F' }, { id: 'fill', icon: '\uD83E\uDEA3' }, { id: 'eraser', icon: '\uD83E\uDDF9' }, { id: 'eyedropper', icon: '\uD83D\uDCA7' }].map(function(bt) {
                    return h('button', { key: bt.id,
                      onClick: function() { upd({ brushTool: bt.id }); },
                      className: 'px-2 py-1 rounded text-sm transition-all ' + (brushTool === bt.id ? 'bg-rose-200 shadow-inner' : 'hover:bg-rose-50'),
                      title: bt.id
                    }, bt.icon);
                  })
                )
              ),
              h('div', { className: 'flex flex-wrap gap-1' },
                TILE_PALETTE.map(function(t) {
                  return h('button', { key: t.id,
                    onClick: function() { upd({ selectedTile: t.id, brushTool: 'brush' }); },
                    className: 'w-8 h-8 rounded border-2 flex items-center justify-center text-sm transition-all ' +
                      (selectedTile === t.id ? 'border-rose-500 shadow-md scale-110' : 'border-gray-200 hover:border-rose-600'),
                    style: { background: t.color },
                    title: t.label
                  }, t.emoji || '');
                })
              )
            ),

            // Tile grid
            h('div', {
              className: 'rounded-xl border-2 border-rose-200 bg-white p-2 overflow-auto',
              style: { maxHeight: '420px' }
            },
              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(' + gridW + ', 1fr)',
                  gap: '1px', background: '#e2e8f0', border: '1px solid var(--allo-stem-border, #cbd5e1)',
                  maxWidth: Math.min(gridW * 28, 700) + 'px'
                }
              },
                Array.from({ length: gridW * gridH }, function(_, i) {
                  var x = i % gridW, y = Math.floor(i / gridW);
                  var k = x + ',' + y;
                  var tId = tiles[k] || 'empty';
                  var tInfo = TILE_MAP[tId] || TILE_MAP.empty;
                  var danger = showDanger ? dangerAt(tiles, x, y) : 0;
                  var dangerOverlay = danger > 0 ? 'rgba(239,68,68,' + Math.min(0.6, danger * 0.15) + ')' : null;
                  return h('div', { 
                    key: k,
                    onClick: function() {
                      if (brushTool === 'eyedropper') { upd({ selectedTile: tId, brushTool: 'brush' }); }
                      else if (brushTool === 'eraser') { var nt = Object.assign({}, tiles); delete nt[k]; upd({ tiles: nt }); }
                      else if (brushTool === 'fill') {
                        var nt2 = Object.assign({}, tiles);
                        var target = nt2[k] || 'empty';
                        if (target !== selectedTile) { floodFill(nt2, x, y, target, selectedTile, gridW, gridH); upd({ tiles: nt2 }); }
                      }
                      else { var nt3 = Object.assign({}, tiles); nt3[k] = selectedTile; upd({ tiles: nt3 }); }
                    },
                    onMouseEnter: function(e) {
                      if (e.buttons === 1 && (brushTool === 'brush' || brushTool === 'eraser')) {
                        var nt = Object.assign({}, tiles);
                        if (brushTool === 'eraser') delete nt[k]; else nt[k] = selectedTile;
                        upd({ tiles: nt });
                      }
                    },
                    style: {
                      width: '100%', aspectRatio: '1',
                      background: dangerOverlay || tInfo.color,
                      cursor: 'crosshair', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: Math.min(24, Math.floor(600 / gridW)) + 'px',
                      userSelect: 'none', minWidth: '12px', minHeight: '12px'
                    }
                  }, (showDanger && danger > 0 && tId === 'empty') ? h('span', { style: { fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.9)' } }, danger) : (tInfo.emoji || ''));
                })
              )
            ),

            // Stats bar
            h('div', { className: 'flex flex-wrap gap-3 text-[11px] text-rose-500 font-bold' },
              h('span', null, '\uD83D\uDD0D ' + gridW + '\u00D7' + gridH + ' = ' + (gridW * gridH) + ' tiles'),
              h('span', null, '\uD83E\uDDD1 Players: ' + countTile(tiles, 'player')),
              h('span', null, '\uD83D\uDC7E Enemies: ' + countTile(tiles, 'enemy')),
              h('span', null, '\uD83E\uDE99 Coins: ' + countTile(tiles, 'coin')),
              h('span', null, '\uD83D\uDD11 Keys: ' + countTile(tiles, 'key')),
              h('span', null, '\uD83D\uDEAA Doors: ' + countTile(tiles, 'door')),
              h('span', null, '\uD83D\uDEA9 Flags: ' + countTile(tiles, 'flag'))
            )
          ),


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
                    onClick: function() { upd({ activeSprite: sp.id, spritePixels: Object.assign({}, sp.pixels), spriteColor: sp.color }); },
                    className: 'px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ' +
                      (activeSprite === sp.id ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-gray-200 hover:border-rose-600')
                  }, '\uD83C\uDFA8 ' + sp.name);
                }),
                h('button', { 'aria-label': 'New',
                  onClick: function() { upd({ activeSprite: 'custom_' + Date.now(), spritePixels: {}, spriteColor: '#e74c3c' }); },
                  className: 'px-3 py-2 rounded-lg border-2 border-dashed border-rose-600 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all'
                }, __alloT('stem.gamestudio.new', '\u2795 New'))
              )
            ),

            // Canvas + tools
            h('div', { className: 'flex gap-4 flex-wrap' },
              // 16x16 pixel canvas
              h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
                h('div', { 
                  style: {
                    display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)',
                    gap: '1px', background: '#e2e8f0', width: '320px', height: '320px',
                    border: '2px solid #94a3b8', borderRadius: '8px', overflow: 'hidden'
                  }
                },
                  Array.from({ length: 256 }, function(_, i) {
                    var sx = i % 16, sy = Math.floor(i / 16);
                    var sk = sx + ',' + sy;
                    var px = spritePixels[sk] || null;
                    var mkSk = (15 - sx) + ',' + sy;
                    return h('div', { 
                      key: sk,
                      onClick: function() {
                        var np = Object.assign({}, spritePixels);
                        if (spriteTool === 'erase') { delete np[sk]; if (spriteMirror) delete np[mkSk]; }
                        else if (spriteTool === 'fill') { for (var fi = 0; fi < 256; fi++) np[(fi % 16) + ',' + Math.floor(fi / 16)] = spriteColor; }
                        else { np[sk] = spriteColor; if (spriteMirror) np[mkSk] = spriteColor; }
                        upd({ spritePixels: np });
                      },
                      onMouseEnter: function(e) {
                        if (e.buttons === 1) {
                          var np = Object.assign({}, spritePixels);
                          if (spriteTool === 'erase') { delete np[sk]; if (spriteMirror) delete np[mkSk]; }
                          else { np[sk] = spriteColor; if (spriteMirror) np[mkSk] = spriteColor; }
                          upd({ spritePixels: np });
                        }
                      },
                      style: { background: px || (((sx + sy) % 2 === 0) ? '#f1f5f9' : '#e2e8f0'), cursor: 'crosshair' }
                    });
                  })
                )
              ),

              // Tools panel
              h('div', { className: 'flex-1 space-y-3', style: { minWidth: '180px' } },
                // Color picker
                h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
                  h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.color', 'Color')),
                  h('input', { type: 'color', value: spriteColor, onChange: function(e) { upd({ spriteColor: e.target.value }); }, className: 'w-full h-8 rounded cursor-pointer' }),
                  h('div', { className: 'flex gap-1 mt-2 flex-wrap' },
                    ['#e74c3c','#f39c12','#f1c40f','#2ecc71','#3498db','#9b59b6','#1abc9c','#ecf0f1','#34495e','#000000','#ffffff','#e67e22'].map(function(c) {
                      return h('button', { 'aria-label': __alloT('stem.gamestudio.mirror', 'Mirror'),
                        key: c,
                        onClick: function() { upd({ spriteColor: c }); },
                        className: 'w-6 h-6 rounded border-2 transition-all ' + (spriteColor === c ? 'border-rose-500 scale-110' : 'border-gray-300'),
                        style: { background: c }
                      });
                    })
                  )
                ),
                // Draw tools
                h('div', { className: 'p-3 rounded-xl border border-rose-200 bg-white' },
                  h('div', { className: 'text-xs font-bold text-rose-700 mb-2' }, __alloT('stem.gamestudio.tools', 'Tools')),
                  h('div', { className: 'flex gap-1' },
                    [{ id: 'draw', icon: '\u270F\uFE0F' }, { id: 'erase', icon: '\uD83E\uDDF9' }, { id: 'fill', icon: '\uD83E\uDEA3' }].map(function(t) {
                      return h('button', { 'aria-label': __alloT('stem.gamestudio.mirror_2', 'Mirror \u2194\uFE0F'),
                        key: t.id,
                        onClick: function() { upd({ spriteTool: t.id }); },
                        className: 'flex-1 py-1.5 rounded text-sm transition-all ' + (spriteTool === t.id ? 'bg-rose-200 shadow-inner font-bold' : 'hover:bg-rose-50')
                      }, t.icon);
                    })
                  ),
                  h('label', { className: 'flex items-center gap-2 mt-2 text-xs text-rose-600 cursor-pointer' },
                    h('input', { type: 'checkbox', checked: spriteMirror, onChange: function() { upd({ spriteMirror: !spriteMirror }); } }),
                    __alloT('stem.gamestudio.mirror_3', 'Mirror \u2194\uFE0F')
                  )
                ),
                // AI sprite gen
                callImagen && h('div', { className: 'p-3 rounded-xl border border-purple-200 bg-purple-50 space-y-2' },
                  h('div', { className: 'text-xs font-bold text-purple-700' }, __alloT('stem.gamestudio.ai_sprite_tools', '\uD83E\uDD16 AI Sprite Tools')),
                  h('input', { type: 'text', value: aiPrompt, onChange: function(e) { upd({ aiPrompt: e.target.value }); }, placeholder: __alloT('stem.gamestudio.a_fire_breathing_dragon', 'a fire-breathing dragon...'), 'aria-label': __alloT('stem.gamestudio.ai_sprite_generation_prompt', 'AI sprite generation prompt'), className: 'w-full text-xs border border-purple-600 rounded-lg px-2 py-1.5' }),
                  h('button', { onClick: function() {
                      if (!aiPrompt.trim()) return;
                      upd({ aiLoading: true });
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
                            upd({ spritePixels: np, aiLoading: false, aiResult: '\u2705 Sprite generated!' });
                          };
                          img.onerror = function() { upd({ aiLoading: false, aiResult: '\u274C Image load error' }); };
                          img.src = imgUrl;
                        }).catch(function(e) { upd({ aiLoading: false, aiResult: '\u274C ' + e.message }); });
                    },
                    disabled: aiLoading,
                    className: 'w-full px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all ' +
                      (aiLoading ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600')
                  }, aiLoading ? '\u23F3 Generating...' : '\u2728 AI Generate Sprite')
                ),
                // Clear
                h('button', { 'aria-label': __alloT('stem.gamestudio.clear_canvas', 'Clear Canvas'),
                  onClick: function() { upd({ spritePixels: {} }); },
                  className: 'w-full py-1.5 text-xs font-bold text-rose-500 border border-rose-600 rounded-lg hover:bg-rose-50 transition-all'
                }, __alloT('stem.gamestudio.clear_canvas_2', '\uD83D\uDDD1\uFE0F Clear Canvas'))
              )
            ),
            aiResult && h('div', { className: 'text-xs font-bold ' + (aiResult.charAt(0) === '\u2705' ? 'text-green-600' : 'text-red-500') }, aiResult)
          ),


          // ============================================================
          // EVENTS TAB
          // ============================================================
          gsTab === 'events' && h('div', { className: 'space-y-4' },

            h('div', { className: 'flex items-center justify-between' },
              h('h3', { className: 'text-sm font-black text-rose-800' }, __alloT('stem.gamestudio.event_rules', '\u26A1 Event Rules')),
              h('label', { className: 'flex items-center gap-2 text-xs font-bold text-rose-600 cursor-pointer' },
                h('input', { type: 'checkbox', checked: advancedCode, onChange: function() { upd({ advancedCode: !advancedCode }); } }),
                __alloT('stem.gamestudio.show_code', '\uD83D\uDCBB Show Code')
              )
            ),

            // Info box
            h('div', { className: 'p-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-700' },
              h('strong', null, __alloT('stem.gamestudio.how_events_work', 'How Events Work: ')),
              'Create "When X happens \u2192 Do Y" rules for each sprite. These rules define your game\'s behavior! ' +
              'Enemies patrol automatically in Play mode. Add rules to customize interactions.'
            ),

            // Sprite selector
            h('div', { className: 'text-xs font-bold text-rose-600 mb-1' }, __alloT('stem.gamestudio.select_sprite_to_add_rules', 'Select sprite to add rules:')),
            h('div', { className: 'flex flex-wrap gap-1 mb-3' },
              ['player','enemy','npc','treasure'].map(function(sid) {
                var sprEvents = events[sid] || [];
                var icons = { player: '\uD83E\uDDD1', enemy: '\uD83D\uDC7E', npc: '\uD83E\uDDD9', treasure: '\uD83D\uDC8E' };
                return h('button', { key: sid,
                  onClick: function() { upd({ activeSprite: sid }); },
                  className: 'px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ' +
                    (activeSprite === sid ? 'border-rose-400 bg-rose-100 shadow-md' : 'border-gray-200 hover:border-rose-600')
                }, (icons[sid] || '') + ' ' + sid.charAt(0).toUpperCase() + sid.slice(1) + ' (' + sprEvents.length + ')');
              })
            ),

            // Event rules
            activeSprite && (function() {
              var sprEvents = events[activeSprite] || [];
              var TRIGGERS = [
                { id: 'onKey', label: __alloT('stem.gamestudio.key_pressed', 'Key Pressed'), params: ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'] },
                { id: 'onCollide', label: __alloT('stem.gamestudio.collides_with', 'Collides With'), params: ['wall','coin','enemy','lava','door','key','npc','spikes','flag','portal','ice'] },
                { id: 'onTimer', label: __alloT('stem.gamestudio.every', 'Every'), params: ['0.5s','1s','2s','5s'] },
                { id: 'onStart', label: __alloT('stem.gamestudio.game_starts', 'Game Starts'), params: [] },
                { id: 'onTalk', label: __alloT('stem.gamestudio.player_talks', 'Player Talks'), params: [] }
              ];
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
                      h('select', {
                        value: rule.trigger || 'onKey',
                        onChange: function(e) {
                          var ne = Object.assign({}, events);
                          var arr = (ne[activeSprite] || []).slice();
                          arr[ri] = Object.assign({}, arr[ri], { trigger: e.target.value, param: '' });
                          ne[activeSprite] = arr; upd({ events: ne });
                        },
                        className: 'text-xs border border-rose-600 rounded px-1.5 py-1 bg-rose-50 font-bold'
                      }, TRIGGERS.map(function(t) { return h('option', { key: t.id, value: t.id }, t.label); })),
                      // Trigger param
                      (function() {
                        var trig = TRIGGERS.find(function(t) { return t.id === rule.trigger; });
                        if (!trig || !trig.params || trig.params.length === 0) return null;
                        return h('select', {
                          value: rule.param || '',
                          onChange: function(e) {
                            var ne = Object.assign({}, events); var arr = (ne[activeSprite] || []).slice();
                            arr[ri] = Object.assign({}, arr[ri], { param: e.target.value });
                            ne[activeSprite] = arr; upd({ events: ne });
                          },
                          className: 'text-xs border border-rose-600 rounded px-1.5 py-1'
                        }, h('option', { value: '' }, '\u2014'), trig.params.map(function(p) { return h('option', { key: p, value: p }, p); }));
                      })(),
                      h('span', { className: 'text-xs font-bold text-slate-600' }, '\u2192'),
                      h('select', {
                        value: rule.action || 'move',
                        onChange: function(e) {
                          var ne = Object.assign({}, events); var arr = (ne[activeSprite] || []).slice();
                          arr[ri] = Object.assign({}, arr[ri], { action: e.target.value, actionParam: '' });
                          ne[activeSprite] = arr; upd({ events: ne });
                        },
                        className: 'text-xs border border-rose-600 rounded px-1.5 py-1 bg-rose-50 font-bold'
                      }, ACTIONS.map(function(a) { return h('option', { key: a.id, value: a.id }, a.label); })),
                      // Action param
                      (function() {
                        var act = ACTIONS.find(function(a) { return a.id === rule.action; });
                        if (!act || !act.params || act.params.length === 0) return null;
                        return h('select', {
                          value: rule.actionParam || '',
                          onChange: function(e) {
                            var ne = Object.assign({}, events); var arr = (ne[activeSprite] || []).slice();
                            arr[ri] = Object.assign({}, arr[ri], { actionParam: e.target.value });
                            ne[activeSprite] = arr; upd({ events: ne });
                          },
                          className: 'text-xs border border-rose-600 rounded px-1.5 py-1'
                        }, h('option', { value: '' }, '\u2014'), act.params.map(function(p) { return h('option', { key: p, value: p }, p); }));
                      })(),
                      h('button', { 'aria-label': __alloT('stem.gamestudio.remove_item', 'Remove item'),
                        onClick: function() {
                          var ne = Object.assign({}, events); var arr = (ne[activeSprite] || []).slice();
                          arr.splice(ri, 1); ne[activeSprite] = arr; upd({ events: ne });
                        },
                        className: 'ml-auto text-rose-300 hover:text-red-500 transition-colors text-sm font-bold'
                      }, '\u2715')
                    ),
                    advancedCode && h('pre', { className: 'mt-2 p-2 rounded-lg bg-slate-900 text-green-400 text-[11px] font-mono overflow-x-auto' }, genCode(rule))
                  );
                }),
                sprEvents.length < 8 && h('button', { 'aria-label': __alloT('stem.gamestudio.add_rule', 'Add Rule ('),
                  onClick: function() {
                    var ne = Object.assign({}, events); var arr = (ne[activeSprite] || []).slice();
                    arr.push({ trigger: 'onKey', param: 'ArrowUp', action: 'move', actionParam: 'up' });
                    ne[activeSprite] = arr; upd({ events: ne });
                  },
                  className: 'w-full py-2 rounded-xl border-2 border-dashed border-rose-600 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all'
                }, '\u2795 Add Rule (' + sprEvents.length + '/8)')
              );
            })()
          ),


          // ============================================================
          // PLAY TAB (ENHANCED)
          // ============================================================
          gsTab === 'play' && h('div', { className: 'space-y-4' },

            // HUD
            h('div', { className: 'flex items-center gap-3 p-3 rounded-xl border border-rose-200 bg-white flex-wrap' },
              h('span', { className: 'text-xs font-bold text-amber-600' }, '\uD83E\uDE99 ' + playScore),
              h('span', { className: 'text-xs font-bold text-red-500' },
                '\u2764\uFE0F ' + Array.from({ length: Math.max(0, Math.min(playLives, 10)) }, function() { return '\u2665'; }).join('')
              ),
              playKeys > 0 && h('span', { className: 'text-xs font-bold text-yellow-600' }, '\uD83D\uDD11 \u00D7' + playKeys),
              h('span', { className: 'text-xs font-bold text-slate-600' }, '\uD83D\uDC63 Moves: ' + playMoves),
              playCoinsCollected > 0 && h('span', { className: 'text-xs font-bold text-amber-500' }, '\uD83E\uDE99 ' + playCoinsCollected + ' collected'),
              h('span', { className: 'text-xs font-bold text-slate-600 ml-auto' },
                gameType === 'topdown' ? '\uD83D\uDD3D Top-Down' : gameType === 'platformer' ? '\uD83C\uDFC3 Platformer' : '\uD83E\uDDE9 Puzzle'
              )
            ),

            // Game message
            playMessage && h('div', {
              className: 'p-2 rounded-lg text-xs font-bold text-center ' +
                (playWon ? 'bg-green-100 text-green-700 border border-green-300' :
                 playDead ? 'bg-red-100 text-red-700 border border-red-300' :
                 'bg-blue-50 text-blue-700 border border-blue-200')
            }, playMessage),

            // Game grid
            h('div', {
              className: 'rounded-xl border-2 ' + (isPlaying ? 'border-green-400' : 'border-rose-300') + ' bg-slate-900 p-1 overflow-auto outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1',
              style: { maxHeight: '450px' },
              tabIndex: 0,
              onKeyDown: onPlayKey
            },
              h('div', {
                style: {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(' + gridW + ', 1fr)',
                  gap: '1px', background: 'var(--allo-stem-panel, #1e293b)'
                }
              },
                Array.from({ length: gridW * gridH }, function(_, i) {
                  var x = i % gridW, y = Math.floor(i / gridW);
                  var k = x + ',' + y;
                  var tId = tiles[k] || 'empty';
                  var tInfo = TILE_MAP[tId] || TILE_MAP.empty;
                  return h('div', {
                    key: k,
                    style: {
                      aspectRatio: '1',
                      background: tId === 'empty' ? '#0f172a' : tInfo.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: Math.min(20, Math.floor(500 / gridW)) + 'px',
                      minWidth: '10px', minHeight: '10px', transition: 'background 0.15s', boxShadow: tId === 'player' ? '0 0 10px rgba(139,92,246,0.85)' : undefined
                    }
                  }, tInfo.emoji || '');
                })
              )
            ),

            // D-pad controls (touch-friendly)
            isPlaying && !playWon && !playDead && h('div', { className: 'flex justify-center' },
              h('div', { className: 'grid grid-cols-3 gap-1', style: { width: '140px' } },
                h('div', null),
                h('button', { onClick: function() { processMove('up'); }, className: 'p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold text-center active:scale-95 transition-all' }, '\u25B2'),
                h('div', null),
                h('button', { onClick: function() { processMove('left'); }, className: 'p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold text-center active:scale-95 transition-all' }, '\u25C0'),
                h('div', { className: 'p-3 rounded-lg bg-slate-800 text-center text-xs text-slate-300 font-bold' }, '\u2022'),
                h('button', { onClick: function() { processMove('right'); }, className: 'p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold text-center active:scale-95 transition-all' }, '\u25B6'),
                h('div', null),
                h('button', { 'aria-label': __alloT('stem.gamestudio.process_move', 'Process Move'), onClick: function() { processMove('down'); }, className: 'p-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-lg font-bold text-center active:scale-95 transition-all' }, '\u25BC'),
                h('div', null)
              )
            ),

            // Controls
            h('div', { className: 'flex gap-2 justify-center flex-wrap' },
              h('button', { onClick: function() {
                  if (isPlaying) {
                    upd({ isPlaying: false });
                  } else {
                    upd({ isPlaying: true, playScore: 0, playLives: 3, playKeys: 0, playMoves: 0, playMessage: null, playWon: false, playDead: false, playCoinsCollected: 0, enemyDirs: {} });
                  }
                },
                className: 'px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ' +
                  (isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600')
              }, isPlaying ? '\u23F9 Stop' : '\u25B6\uFE0F Start Game'),
              (playWon || playDead) && h('button', { 'aria-label': __alloT('stem.gamestudio.play_again', 'Play Again'),
                onClick: function() {
                  upd({ isPlaying: true, playScore: 0, playLives: 3, playKeys: 0, playMoves: 0, playMessage: null, playWon: false, playDead: false, playCoinsCollected: 0, enemyDirs: {} });
                },
                className: 'px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 shadow-md transition-all'
              }, __alloT('stem.gamestudio.play_again_2', '\uD83D\uDD04 Play Again')),
              h('div', { className: 'text-[11px] text-slate-600 self-center ml-2' }, __alloT('stem.gamestudio.arrow_keys_wasd_to_move_click_game_are', 'Arrow keys / WASD to move \u2022 Click game area first'))
            ),

            // Mechanics guide
            h('div', { className: 'p-3 rounded-xl border border-slate-400 bg-slate-50' },
              h('div', { className: 'text-xs font-bold text-slate-700 mb-2' }, __alloT('stem.gamestudio.game_mechanics', '\uD83C\uDFAE Game Mechanics')),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600' },
                [
                  ['\uD83E\uDE99 Coin', '+10 points'],
                  ['\uD83D\uDC8E Gem', '+50 points'],
                  ['\uD83D\uDD11 Key', 'Opens doors'],
                  ['\uD83D\uDEAA Door', 'Needs key'],
                  ['\u2764\uFE0F Heart', '+1 life'],
                  ['\uD83C\uDF00 Portal', 'Teleports you'],
                  ['\uD83E\uDEF5 Ice', 'Slide until wall'],
                  ['\uD83D\uDC7E Enemy', 'Patrols & chases!'],
                  ['\uD83D\uDD25 Lava', '-1 life'],
                  ['\u26A0\uFE0F Spikes', '-1 life'],
                  ['\uD83D\uDEA9 Flag', 'Win!'],
                  ['\uD83E\uDDD1 You', 'The hero!']
                ].map(function(m, i) {
                  return h('div', { key: i, className: 'flex gap-1 items-center' },
                    h('span', { className: 'font-bold' }, m[0]),
                    h('span', null, m[1])
                  );
                })
              )
            ),

            // AI Playtest Advisor
            callGemini && h('div', { className: 'p-3 rounded-xl border border-purple-200 bg-purple-50' },
              h('button', { onClick: function() {
                  upd({ aiLoading: true, aiResult: null });
                  var st = JSON.stringify({ gridW: gridW, gridH: gridH, gameType: gameType, tiles: tiles, events: events });
                  callGemini('You are a game design advisor for students. Analyze this game and give 3-5 short, constructive suggestions. Consider: win conditions, balance, variety, enemy placement, fun factor. Game: ' + st)
                    .then(function(res) { upd({ aiLoading: false, aiResult: '\uD83E\uDDE0 ' + res }); })
                    .catch(function() { upd({ aiLoading: false, aiResult: '\u274C AI error' }); });
                },
                disabled: aiLoading,
                className: 'w-full px-3 py-2 text-xs font-bold text-white rounded-lg transition-all ' +
                  (aiLoading ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600')
              }, aiLoading ? '\u23F3 Analyzing...' : '\uD83E\uDDE0 AI Review My Game'),
              aiResult && aiResult.indexOf('\uD83E\uDDE0') === 0 && h('div', {
                className: 'mt-2 p-3 rounded-lg bg-white border border-purple-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed'
              }, aiResult)
            )
          ),


          // ============================================================
          // LEARN TAB
          // ============================================================
          gsTab === 'learn' && h('div', { className: 'space-y-4' },

            // Header
            h('div', { className: 'p-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50' },
              h('div', { className: 'flex items-center gap-3' },
                h('span', { style: { fontSize: '28px' } }, '\uD83C\uDF93'),
                h('div', { className: 'flex-1' },
                  h('h3', { className: 'text-sm font-black text-indigo-900' }, __alloT('stem.gamestudio.game_design_academy', 'Game Design Academy')),
                  h('p', { className: 'text-xs text-indigo-600' }, __alloT('stem.gamestudio.learn_the_fundamentals_of_game_design_', 'Learn the fundamentals of game design through interactive lessons'))
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-lg font-black text-indigo-700' }, Object.keys(learnCompleted).length + '/' + LESSONS.length),
                  h('div', { className: 'text-[11px] font-bold text-indigo-400' }, 'COMPLETED')
                )
              ),
              // Progress bar
              h('div', { className: 'mt-3 h-2 rounded-full bg-indigo-200 overflow-hidden' },
                h('div', {
                  className: 'h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all',
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
                      if (showResult && isSelected && isCorrect) btnClass += 'border-green-500 bg-green-100 text-green-800';
                      else if (showResult && isSelected && !isCorrect) btnClass += 'border-red-400 bg-red-50 text-red-700';
                      else if (showResult && isCorrect) btnClass += 'border-green-400 bg-green-50 text-green-700';
                      else if (isSelected) btnClass += 'border-indigo-400 bg-indigo-100 text-indigo-800';
                      else btnClass += 'border-gray-200 bg-white hover:border-indigo-600 hover:bg-indigo-50 text-slate-700';
                      return h('button', { key: oi,
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
                      upd({ learnShowResult: true });
                      if (correct && !isComplete) {
                        var lc = Object.assign({}, learnCompleted);
                        lc[lesson.id] = true;
                        upd({ learnCompleted: lc, learnShowResult: true });
                        if (typeof awardStemXP === 'function') awardStemXP('gameStudio', 15, 'lesson: ' + lesson.title);
                        if (addToast) addToast('\uD83C\uDF93 Lesson complete! +15 XP', 'success');
                      }
                    },
                    className: 'mt-3 w-full py-2 rounded-lg text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 transition-all'
                  }, __alloT('stem.gamestudio.check_answer_2', 'Check Answer')),

                  learnShowResult && h('div', { 
                    className: 'mt-3 p-3 rounded-lg text-xs ' +
                      (learnAnswer === lesson.quiz.correct ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300')
                  },
                    h('div', { className: 'font-bold mb-1' }, learnAnswer === lesson.quiz.correct ? '\u2705 Correct!' : '\u274C Not quite!'),
                    h('p', null, lesson.quiz.explanation)
                  )
                ),

                // Next lesson
                learnShowResult && (function() {
                  var idx = LESSONS.findIndex(function(l) { return l.id === activeLesson; });
                  if (idx < LESSONS.length - 1) {
                    return h('button', { 'aria-label': __alloT('stem.gamestudio.next_lesson', 'Next Lesson:'),
                      onClick: function() { upd({ activeLesson: LESSONS[idx + 1].id, learnAnswer: null, learnShowResult: false }); },
                      className: 'w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all'
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
                    (isComplete ? 'border-green-600 bg-green-50' : 'border-indigo-200 bg-white hover:border-indigo-400')
                },
                  h('div', { className: 'flex items-start gap-3' },
                    h('span', { style: { fontSize: '24px' } }, lesson.icon),
                    h('div', { className: 'flex-1' },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-sm font-black ' + (isComplete ? 'text-green-800' : 'text-indigo-900') }, lesson.title),
                        isComplete && h('span', { className: 'text-xs font-bold text-green-800 bg-green-200 px-1.5 py-0.5 rounded' }, '\u2713')
                      ),
                      h('p', { className: 'text-[11px] text-slate-600 mt-0.5' }, __alloT('stem.gamestudio.' + (lesson.id) + '_desc', lesson.desc))
                    ),
                    h('span', { className: 'text-xs font-bold ' + (isComplete ? 'text-green-500' : 'text-indigo-400') }, 'Lesson ' + (li + 1))
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
            h('div', { className: 'p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50' },
              h('div', { className: 'flex items-center gap-3' },
                h('span', { style: { fontSize: '28px' } }, '\uD83C\uDFC6'),
                h('div', { className: 'flex-1' },
                  h('h3', { className: 'text-sm font-black text-amber-900' }, __alloT('stem.gamestudio.design_challenges', 'Design Challenges')),
                  h('p', { className: 'text-xs text-amber-600' }, __alloT('stem.gamestudio.apply_your_game_design_skills_build_le', 'Apply your game design skills! Build levels that meet specific objectives.'))
                ),
                h('div', { className: 'text-right' },
                  h('div', { className: 'text-lg font-black text-amber-700' }, Object.keys(challengeCompleted).length + '/' + CHALLENGES.length),
                  h('div', { className: 'text-[11px] font-bold text-amber-400' }, 'COMPLETED')
                )
              )
            ),

            // Challenge cards
            CHALLENGES.map(function(ch) {
              var isComplete = challengeCompleted[ch.id];
              var results = ch.requirements.map(function(req) {
                return { text: req.text, passed: req.check(tiles, gridW, gridH) };
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
                      h('span', { className: 'text-[11px] font-bold px-1.5 py-0.5 rounded ' +
                        (ch.difficulty === 1 ? 'bg-green-200 text-green-700' : ch.difficulty === 2 ? 'bg-amber-200 text-amber-700' : 'bg-red-200 text-red-700')
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
                      h('span', { className: 'w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ' +
                        (r.passed ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500')
                      }, r.passed ? '\u2713' : (ri + 1)),
                      h('span', { className: r.passed ? 'line-through' : '' }, r.text)
                    );
                  })
                ),

                // Hint
                !isComplete && !allPassed && h('div', { className: 'p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 mb-2' },
                  h('strong', null, 'Hint: '), __alloT('stem.gamestudio.' + (ch.id) + '_hint', ch.hint)
                ),

                // Complete button
                !isComplete && allPassed && h('button', { 'aria-label': __alloT('stem.gamestudio.claim', 'Claim'),
                  onClick: function() {
                    var cc = Object.assign({}, challengeCompleted);
                    cc[ch.id] = true;
                    upd({ challengeCompleted: cc });
                    if (typeof awardStemXP === 'function') awardStemXP('gameStudio', ch.xp, 'challenge: ' + ch.title);
                    if (addToast) addToast('\uD83C\uDFC6 Challenge complete! +' + ch.xp + ' XP', 'success');
                  },
                  className: 'w-full py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md transition-all'
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
              h('input', {
                type: 'text', value: projectName,
                onChange: function(e) { upd({ projectName: e.target.value }); },
                className: 'w-full text-sm border border-rose-600 rounded-lg px-3 py-2 font-bold'
              })
            ),

            // Export / Import / Share
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('button', { onClick: function() {
                  var gd = { version: 2, name: projectName, gridW: gridW, gridH: gridH, gameType: gameType, tiles: tiles, sprites: sprites, events: events, spritePixels: spritePixels };
                  var blob = new Blob([JSON.stringify(gd, null, 2)], { type: 'application/json' });
                  var url = URL.createObjectURL(blob);
                  var a = document.createElement('a');
                  a.href = url; a.download = (projectName || 'game').replace(/[^a-zA-Z0-9]/g, '_') + '.allogame';
                  a.click(); URL.revokeObjectURL(url);
                  if (addToast) addToast('\uD83D\uDCE4 Game exported!', 'success');
                  if (typeof awardStemXP === 'function') awardStemXP('gameStudio', 5, 'export game');
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
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                      try {
                        var data = JSON.parse(ev.target.result);
                        upd({
                          projectName: data.name || 'Imported Game',
                          gridW: data.gridW || 16, gridH: data.gridH || 12,
                          gameType: data.gameType || 'topdown',
                          tiles: data.tiles || {}, sprites: data.sprites || {},
                          events: data.events || {}, spritePixels: data.spritePixels || {}
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
                  var gd = { version: 2, name: projectName, gridW: gridW, gridH: gridH, gameType: gameType, tiles: tiles, sprites: sprites, events: events };
                  var code = btoa(unescape(encodeURIComponent(JSON.stringify(gd))));
                  navigator.clipboard.writeText(code).then(function() {
                    if (addToast) addToast('\uD83D\uDCCB Share code copied!', 'success');
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
                      var data = JSON.parse(json);
                      upd({
                        projectName: data.name || 'Shared Game',
                        gridW: data.gridW || 16, gridH: data.gridH || 12,
                        gameType: data.gameType || 'topdown',
                        tiles: data.tiles || {}, sprites: data.sprites || {},
                        events: data.events || {}
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
                      upd({ projectName: starter.name, gameType: starter.type, gridW: 16, gridH: 12, tiles: starter.tiles, tab: 'map' });
                      if (addToast) addToast('\uD83C\uDFAE Loaded "' + starter.name + '"!', 'success');
                    },
                    className: 'p-3 rounded-xl border-2 border-rose-600 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 text-left transition-all hover:shadow-md'
                  },
                    h('div', { className: 'text-2xl mb-1' }, starter.icon),
                    h('div', { className: 'text-xs font-bold text-rose-800' }, starter.name),
                    h('div', { className: 'text-[11px] text-rose-500' }, starter.desc)
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
                  h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.gamestudio.tiles_placed_2', 'Tiles Placed'))
                ),
                h('div', null,
                  h('div', { className: 'text-lg font-black text-slate-800' }, (function() {
                    var types = {};
                    Object.keys(tiles).forEach(function(k) { types[tiles[k]] = true; });
                    return Object.keys(types).length;
                  })()),
                  h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.gamestudio.tile_types', 'Tile Types'))
                ),
                h('div', null,
                  h('div', { className: 'text-lg font-black text-slate-800' }, Object.keys(spritePixels).length),
                  h('div', { className: 'text-[11px] text-slate-600' }, __alloT('stem.gamestudio.pixels_drawn', 'Pixels Drawn'))
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
              veryEasy: { label: __alloT('stem.gamestudio.very_easy', '🟢 Very Easy'), color: '#059669', bg: '#ecfdf5', border: '#86efac', deaths: 0, time: '< 2 min' },
              easy:     { label: __alloT('stem.gamestudio.easy', '🟢 Easy'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', deaths: 1, time: '2-5 min' },
              medium:   { label: __alloT('stem.gamestudio.medium', '🟡 Medium'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d', deaths: 4, time: '5-15 min' },
              hard:     { label: __alloT('stem.gamestudio.hard', '🟠 Hard'), color: '#ea580c', bg: '#fff7ed', border: '#fdba74', deaths: 12, time: '15-45 min' },
              expert:   { label: __alloT('stem.gamestudio.expert', '🔴 Expert'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', deaths: 40, time: '1+ hours' }
            }[state];
            // Build SVG difficulty curve from 5 progress points
            var curvePoints = [];
            for (var p = 0; p <= 100; p += 10) {
              var rampedDiff = diffScore * (0.3 + p / 100 * 0.7);
              curvePoints.push([20 + (p / 100) * 320, 130 - rampedDiff * 14]);
            }
            var pathStr = 'M ' + curvePoints.map(function(pt) { return pt[0].toFixed(1) + ',' + pt[1].toFixed(1); }).join(' L ');
            return h('div', { className: 'space-y-3' },
              h('div', { className: 'p-4 rounded-xl bg-white border border-rose-300 shadow-sm space-y-3' },
                h('h3', { className: 'text-sm font-black text-rose-700' }, __alloT('stem.gamestudio.difficulty_curve_tuner_discovery', '📈 Difficulty curve tuner — discovery')),
                h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' }, __alloT('stem.gamestudio.five_sliders_for_level_parameters_widg', 'Five sliders for level parameters. Widget classifies overall difficulty into 5 discrete tiers and renders the difficulty progression curve. No score on your tuning — the inquiry is in finding what shapes the curve.')),
                // Discrete state marker
                h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-lg font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-[11px] text-slate-700 mt-1' }, '~' + sm.deaths + ' deaths typical, completion time ' + sm.time),
                  h('div', { className: 'text-[10px] text-slate-600 mt-1 font-mono' }, 'Composite difficulty score = ' + diffScore.toFixed(2))
                ),
                // SVG difficulty curve visualization
                h('div', { className: 'p-2 rounded border border-slate-200 bg-slate-50' },
                  h('svg', { viewBox: '0 0 360 150', className: 'w-full h-32' },
                    // Axes
                    h('line', { x1: 20, y1: 130, x2: 340, y2: 130, stroke: '#94a3b8', strokeWidth: 1 }),
                    h('line', { x1: 20, y1: 20, x2: 20, y2: 130, stroke: '#94a3b8', strokeWidth: 1 }),
                    // Tier reference bands (very easy / easy / med / hard / expert)
                    h('rect', { x: 20, y: 116, width: 320, height: 14, fill: '#ecfdf5', opacity: 0.6 }),
                    h('rect', { x: 20, y: 95, width: 320, height: 21, fill: '#ecfeff', opacity: 0.6 }),
                    h('rect', { x: 20, y: 74, width: 320, height: 21, fill: '#fffbeb', opacity: 0.6 }),
                    h('rect', { x: 20, y: 53, width: 320, height: 21, fill: '#fff7ed', opacity: 0.6 }),
                    h('rect', { x: 20, y: 20, width: 320, height: 33, fill: '#fef2f2', opacity: 0.6 }),
                    // Difficulty curve
                    h('path', { d: pathStr, stroke: sm.color, strokeWidth: 2.5, fill: 'none' }),
                    // Curve point markers
                    curvePoints.filter(function(_, i) { return i % 2 === 0; }).map(function(pt, i) {
                      return h('circle', { key: 'cp' + i, cx: pt[0], cy: pt[1], r: 3, fill: sm.color });
                    }),
                    // Labels
                    h('text', { x: 175, y: 145, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, __alloT('stem.gamestudio.game_progress_0_100', 'Game progress 0% → 100%')),
                    h('text', { x: 10, y: 75, textAnchor: 'middle', fontSize: 10, fill: '#475569', transform: 'rotate(-90 10 75)' }, __alloT('stem.gamestudio.difficulty', 'Difficulty')),
                    h('text', { x: 348, y: 25, fontSize: 9, fill: '#b91c1c' }, __alloT('stem.gamestudio.expert_2', 'Expert')),
                    h('text', { x: 348, y: 88, fontSize: 9, fill: '#d97706' }, __alloT('stem.gamestudio.medium_2', 'Medium')),
                    h('text', { x: 348, y: 128, fontSize: 9, fill: '#059669' }, __alloT('stem.gamestudio.easy_2', 'Easy'))
                  ),
                  h('div', { className: 'text-[10px] text-slate-600 text-center italic mt-1' },
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
                      h('label', { htmlFor: 'dt-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-rose-700' }, iq[s.k])),
                      h('input', { id: 'dt-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-valuetext': (iq[s.k] + ({ enemies: ' enemies', patrolSpeed: '% speed', hazards: '% hazards', coins: '% coin abundance', health: ' HP' }[s.k] || '')), 'aria-label': s.l }));
                  })
                ),
                // Log + reset
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ e: iq.enemies, p: iq.patrolSpeed, h: iq.hazards, c: iq.coins, hp: iq.health, d: diffScore.toFixed(2), st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.gamestudio.log', '📋 Log')),
                  h('button', { onClick: function() { setIQ({ enemies: 5, patrolSpeed: 50, hazards: 30, coins: 50, health: 100, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.gamestudio.reset', '↺ Reset')),
                  (iq.log || []).length > 0 && h('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
                ),
                // Log table
                (iq.log || []).length > 0 && h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'text-[10px] w-full border-collapse text-slate-700' },
                    h('thead', null, h('tr', { className: 'bg-slate-100' },
                      ['enemies', 'patrol', 'hazards', 'coins', 'health', 'score', 'tier'].map(function(c, i) { return h('th', { key: 'h' + i, className: 'px-1 border border-slate-200 text-left' }, c); }))),
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
                h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.gamestudio.hypothesis_free_text_no_right_answer_w', 'Hypothesis (free text — no right answer): Which slider has the biggest effect on difficulty? Does the curve change shape, or just height?'),
                  className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                // Opt-in stuck prompts
                !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, __alloT('stem.gamestudio.stuck_show_open_prompts_no_answers', '🤔 Stuck — show open prompts (no answers)')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
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
                    h('label', { htmlFor: 'dt-und', className: 'text-[12px] font-bold text-emerald-900 cursor-pointer' },
                      __alloT('stem.gamestudio.i_think_i_understand_difficulty_tuning', 'I think I understand difficulty tuning now — let me explain it in my own words'))),
                  iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.gamestudio.explain_in_your_own_words_how_do_the_5', 'Explain in your own words: how do the 5 parameters jointly determine difficulty? What player-experience metric does each map to?'),
                    className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug', rows: 4 }),
                  iq.understood && (iq.explanation || '').trim().length >= 40 && h('div', { className: 'mt-2 text-[10px] italic text-emerald-700' },
                    __alloT('stem.gamestudio.saved_notice_nobody_checked_your_answe', '✓ Saved. Notice — nobody checked your answer. That is what learner-driven inquiry looks like.'))
                ),
                h('div', { className: 'mt-3 p-2 rounded bg-slate-50 border border-slate-200 text-[10px] italic text-slate-600' },
                  __alloT('stem.gamestudio.design_note_discrete_5_tier_difficulty', 'Design note: discrete 5-tier difficulty marker; SVG curve shows shape not score; no "right" tuning revealed — by design.'))
              )
            );
          })(),

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