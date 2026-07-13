/* eslint-disable */
// stem_tool_cellular.js — Cellular Automaton Lab
// ---------------------------------------------------------------------------
// Interactive emergence playground. Two engines, no external libraries, all
// inline SVG:
//   • Life     — Conway's Game of Life (B3/S23). Draw cells, play/step, stamp
//                a pattern library (glider, pulsar, Gosper gun, LWSS…), wrap.
//   • Rules    — Elementary 1-D cellular automata. Pick any Wolfram rule 0–255
//                (toggle its 8 neighbourhood outputs or type the number), seed
//                a single cell or random row, watch the space-time diagram grow.
//                Famous rules tagged with their Wolfram class.
//   • Patterns — gallery of classic Life forms (still lifes / oscillators /
//                spaceships / guns); click to load into Life.
//   • Learn    — what cellular automata are, Conway's rules, Wolfram's four
//                classes, the "edge of chaos", and where this shows up for real.
//
// Architecture notes (matches the STEM Lab plugin contract):
//   - registerTool('cellularLab', { … , render(ctx) })
//   - render returns a React component element; the component owns all
//     transient sim state via React hooks (ctx.React.useState/useEffect).
//   - Quest milestones are the ONLY thing persisted to ctx.toolData (guarded so
//     a milestone writes at most once → no per-generation host re-render storm).
//   - SSR-safe: the component renders with the stub ctx (no effects run, no
//     auto-play); initial state is computed by pure helpers that never throw.
//   - Theme via ctx.isDark / ctx.isContrast; motion respects the global STEM
//     prefers-reduced-motion reset (we also default Play to OFF).
(function () {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_cellular.js loaded before StemLab registry — bailing');
    return;
  }

  // ── one-time CSS: a gentle birth pulse (honours reduced-motion via the
  //    global STEM reset which clamps animation-duration). ──
  if (typeof document !== 'undefined' && !document.getElementById('cellularlab-css')) {
    var _st = document.createElement('style');
    _st.id = 'cellularlab-css';
    _st.textContent = [
      '@keyframes cellularlab-pop { 0% { transform: scale(0.4); opacity: 0.2; } 100% { transform: scale(1); opacity: 1; } }',
      '.cellularlab-svg rect.born { animation: cellularlab-pop 220ms ease-out; transform-box: fill-box; transform-origin: center; }',
      '.cellularlab-tab:focus-visible, .cellularlab-route-button:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }',
      '#cellularlab-stage:fullscreen { width: 100vw; height: 100vh; border-radius: 0 !important; padding: 24px !important; background: radial-gradient(circle at center, rgba(16,185,129,.18), #020617 70%) !important; }',
      '#cellularlab-stage:fullscreen .cellularlab-svg { max-width: min(92vw, 92vh) !important; max-height: 92vh !important; }',
      '@media (max-width: 720px) { [data-cellularlab-focus-panel] { grid-template-columns: 1fr !important; } [data-cellularlab-route-grid] { grid-template-columns: 1fr !important; } [data-cellularlab-status-grid] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }'
    ].join('\n');
    if (document.head) document.head.appendChild(_st);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DATA
  // ═══════════════════════════════════════════════════════════════════════

  // Life patterns as live-cell offsets {r,c} from a top-left origin.
  var LIFE_PATTERNS = {
    glider:    { name: 'Glider', kind: 'spaceship', w: 3, h: 3,
      blurb: 'The smallest spaceship — walks diagonally forever.',
      cells: [[0,1],[1,2],[2,0],[2,1],[2,2]] },
    lwss:      { name: 'Lightweight spaceship', kind: 'spaceship', w: 5, h: 4,
      blurb: 'Glides straight across the grid.',
      cells: [[0,1],[0,4],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,4]] },
    blinker:   { name: 'Blinker', kind: 'oscillator', w: 3, h: 1,
      blurb: 'Period-2 oscillator — flips between a row and a column.',
      cells: [[0,0],[0,1],[0,2]] },
    toad:      { name: 'Toad', kind: 'oscillator', w: 4, h: 2,
      blurb: 'Period-2 oscillator.',
      cells: [[0,1],[0,2],[0,3],[1,0],[1,1],[1,2]] },
    beacon:    { name: 'Beacon', kind: 'oscillator', w: 4, h: 4,
      blurb: 'Period-2 — two blocks blink at each other.',
      cells: [[0,0],[0,1],[1,0],[1,1],[2,2],[2,3],[3,2],[3,3]] },
    pulsar:    { name: 'Pulsar', kind: 'oscillator', w: 13, h: 13,
      blurb: 'Period-3 oscillator — one of the most common large ones.',
      cells: (function () {
        var base = [2,3,4,8,9,10];
        var pts = [];
        base.forEach(function (c) { [0,5,7,12].forEach(function (r) { pts.push([r, c]); }); });
        base.forEach(function (r) { [0,5,7,12].forEach(function (c) { pts.push([r, c]); }); });
        return pts;
      })() },
    block:     { name: 'Block', kind: 'still', w: 2, h: 2,
      blurb: 'The simplest still life — never changes.',
      cells: [[0,0],[0,1],[1,0],[1,1]] },
    beehive:   { name: 'Beehive', kind: 'still', w: 4, h: 3,
      blurb: 'A stable still life.',
      cells: [[0,1],[0,2],[1,0],[1,3],[2,1],[2,2]] },
    loaf:      { name: 'Loaf', kind: 'still', w: 4, h: 4,
      blurb: 'A stable still life.',
      cells: [[0,1],[0,2],[1,0],[1,3],[2,1],[2,3],[3,2]] },
    boat:      { name: 'Boat', kind: 'still', w: 3, h: 3,
      blurb: 'A compact five-cell still life.',
      cells: [[0,0],[0,1],[1,0],[1,2],[2,1]] },
    mwss:      { name: 'Middleweight spaceship', kind: 'spaceship', w: 6, h: 5,
      blurb: 'A larger horizontal spaceship with a distinctive wake.',
      cells: [[0,2],[1,0],[1,4],[2,0],[2,5],[3,0],[3,5],[4,1],[4,2],[4,3],[4,4],[4,5]] },
    hwss:      { name: 'Heavyweight spaceship', kind: 'spaceship', w: 7, h: 5,
      blurb: 'The largest of the basic orthogonal spaceships.',
      cells: [[0,2],[0,3],[1,0],[1,5],[2,0],[2,6],[3,0],[3,6],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6]] },
    acorn:     { name: 'Acorn', kind: 'methuselah', w: 7, h: 3,
      blurb: 'Only seven cells, but it evolves for 5,206 generations.',
      cells: [[0,1],[1,3],[2,0],[2,1],[2,4],[2,5],[2,6]] },
    diehard:   { name: 'Diehard', kind: 'methuselah', w: 8, h: 3,
      blurb: 'Seven cells that vanish completely after generation 130.',
      cells: [[0,6],[1,0],[1,1],[2,1],[2,5],[2,6],[2,7]] },
    pihept:    { name: 'Pi-heptomino', kind: 'methuselah', w: 3, h: 3,
      blurb: 'A seven-cell seed that stabilizes after 173 generations.',
      cells: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,2]] },
    rpentomino:{ name: 'R-pentomino', kind: 'methuselah', w: 3, h: 3,
      blurb: 'Tiny but chaotic — stabilises only after 1103 generations.',
      cells: [[0,1],[0,2],[1,0],[1,1],[2,1]] },
    gosperGun: { name: 'Gosper glider gun', kind: 'gun', w: 36, h: 9,
      blurb: 'Emits a glider every 30 generations — proves Life can grow forever.',
      cells: [[0,24],[1,22],[1,24],[2,12],[2,13],[2,20],[2,21],[2,34],[2,35],
        [3,11],[3,15],[3,20],[3,21],[3,34],[3,35],[4,0],[4,1],[4,10],[4,16],[4,20],[4,21],
        [5,0],[5,1],[5,10],[5,14],[5,16],[5,17],[5,22],[5,24],[6,10],[6,16],[6,24],
        [7,11],[7,15],[8,12],[8,13]] }
  };
  var PATTERN_ORDER = ['block','beehive','loaf','boat','blinker','toad','beacon','pulsar','glider','lwss','mwss','hwss','rpentomino','acorn','diehard','pihept','gosperGun'];

  // Famous elementary rules with Wolfram-class commentary.
  var FAMOUS_RULES = [
    { n: 30,  name: 'Rule 30',  cls: 3, blurb: 'Chaotic — used as a random-number generator. Looks random from a single seed.' },
    { n: 90,  name: 'Rule 90',  cls: 3, blurb: 'Additive (XOR) rule: a single live cell draws the Sierpiński triangle, but a random start is chaotic.' },
    { n: 110, name: 'Rule 110', cls: 4, blurb: 'Proven Turing-complete: it can, in principle, compute anything.' },
    { n: 184, name: 'Rule 184', cls: 2, blurb: 'A traffic model — cars (1s) moving right without collisions.' },
    { n: 250, name: 'Rule 250', cls: 2, blurb: 'A simple repeating pattern.' },
    { n: 18,  name: 'Rule 18',  cls: 3, blurb: 'A nested Sierpiński-like fractal on a sparse background.' },
    { n: 60,  name: 'Rule 60',  cls: 3, blurb: "Additive rule (Pascal's triangle mod 2): a one-sided Sierpiński fractal from one cell, chaotic from random." },
    { n: 122, name: 'Rule 122', cls: 3, blurb: 'Complex, irregular growth.' }
  ];

  var WOLFRAM_CLASSES = [
    { n: 1, name: 'Class 1 — Uniform', desc: 'Everything dies or freezes to a single stable state. Boring but predictable.' },
    { n: 2, name: 'Class 2 — Periodic', desc: 'Settles into stable or repeating structures — stripes, simple repeats, and oscillators.' },
    { n: 3, name: 'Class 3 — Chaotic', desc: 'Looks random and never settles. Small changes spread everywhere (like Rule 30).' },
    { n: 4, name: 'Class 4 — Complex', desc: 'The "edge of chaos": localised structures that move and interact. Can compute (Rule 110, Conway\'s Life).' }
  ];

  // ═══════════════════════════════════════════════════════════════════════
  //  PURE HELPERS (no React, no DOM) — used by initial state + steps
  // ═══════════════════════════════════════════════════════════════════════
  function emptyGrid(rows, cols) {
    var g = [];
    for (var r = 0; r < rows; r++) { var row = []; for (var c = 0; c < cols; c++) row.push(0); g.push(row); }
    return g;
  }
  function randomGrid(rows, cols, p) {
    var g = emptyGrid(rows, cols);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) g[r][c] = (pseudo(r * 131 + c * 977 + rows * 17) < p) ? 1 : 0;
    return g;
  }
  // Deterministic pseudo-random in [0,1) so SSR + reseeds are reproducible
  // without Date/Math.random (which are also fine at runtime, but this keeps
  // the smoke render stable). A simple hashed sine.
  function pseudo(x) { var s = Math.sin(x * 12.9898) * 43758.5453; return s - Math.floor(s); }

  function countPop(g) { var n = 0; for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) n += g[r][c]; return n; }
  function populationBounds(g) {
    var pop = 0, minR = g.length, maxR = -1, minC = g[0].length, maxC = -1, sumR = 0, sumC = 0;
    for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) if (g[r][c]) { pop++; minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); sumR += r; sumC += c; }
    if (!pop) return null;
    var width = maxC - minC + 1, height = maxR - minR + 1;
    return { pop: pop, minR: minR, maxR: maxR, minC: minC, maxC: maxC, width: width, height: height, area: width * height, density: pop / (width * height), centerR: sumR / pop, centerC: sumC / pop };
  }

  function parseLifeRule(value, fallback) {
    var raw = String(value == null ? fallback : value), set = {};
    for (var i = 0; i < raw.length; i++) { var n = parseInt(raw.charAt(i), 10); if (!isNaN(n) && n >= 0 && n <= 8) set[n] = true; }
    return set;
  }
  function neighborCount(g, r, c, wrap) {
    var rows = g.length, cols = g[0].length, n = 0;
    for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      var rr = r + dr, cc = c + dc;
      if (wrap) { rr = (rr + rows) % rows; cc = (cc + cols) % cols; }
      else if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
      n += g[rr][cc];
    }
    return n;
  }
  function stepLifeDetailed(g, ages, wrap, birthRule, survivalRule) {
    var rows = g.length, cols = g[0].length, out = emptyGrid(rows, cols), nextAges = emptyGrid(rows, cols);
    var births = parseLifeRule(birthRule, '3'), survives = parseLifeRule(survivalRule, '23'), born = 0, survived = 0, died = 0;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var n = neighborCount(g, r, c, wrap), alive = !!g[r][c];
      if ((alive && survives[n]) || (!alive && births[n])) { out[r][c] = 1; nextAges[r][c] = alive ? ((ages && ages[r] && ages[r][c]) || 1) + 1 : 1; alive ? survived++ : born++; }
      else if (alive) died++;
    }
    return { grid: out, ages: nextAges, born: born, survived: survived, died: died };
  }
  function stepLife(g, wrap, birthRule, survivalRule) { return stepLifeDetailed(g, null, wrap, birthRule, survivalRule).grid; }
  function gridSignature(g) { var cells = []; for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) if (g[r][c]) cells.push(r + ',' + c); return cells.join('|'); }
  function shapeFingerprint(g) {
    var bounds = populationBounds(g), cells = [];
    if (!bounds) return { signature: '', minR: null, minC: null };
    for (var r = bounds.minR; r <= bounds.maxR; r++) for (var c = bounds.minC; c <= bounds.maxC; c++) if (g[r][c]) cells.push((r - bounds.minR) + ',' + (c - bounds.minC));
    return { signature: cells.join('|'), minR: bounds.minR, minC: bounds.minC };
  }
  function detectDynamics(g, generation, history) {
    if (generation <= 0) return { kind: 'ready', label: 'Ready', detail: 'Run or step to begin' };
    var bounds = populationBounds(g); if (!bounds) return { kind: 'extinct', label: 'Extinct', detail: 'Population reached zero' };
    var signature = gridSignature(g), shape = shapeFingerprint(g), candidates = [], timeline = history || [], first = timeline[0];
    if (first && first.previousSignature != null) candidates.push({ gen: first.gen - 1, signature: first.previousSignature, shapeSignature: first.previousShapeSignature, minR: first.previousMinR, minC: first.previousMinC });
    timeline.forEach(function (sample) { if (sample.gen < generation) candidates.push(sample); });
    for (var i = candidates.length - 1; i >= 0; i--) if (candidates[i].signature === signature) { var exactPeriod = generation - candidates[i].gen; return exactPeriod === 1 ? { kind: 'stable', label: 'Still life', detail: 'Unchanged after one generation', period: 1 } : { kind: 'oscillator', label: 'Oscillator', detail: 'Repeats every ' + exactPeriod + ' generations', period: exactPeriod }; }
    for (var j = candidates.length - 1; j >= 0; j--) if (candidates[j].shapeSignature === shape.signature) { var period = generation - candidates[j].gen, dr = shape.minR - candidates[j].minR, dc = shape.minC - candidates[j].minC; if (dr || dc) return { kind: 'spaceship', label: 'Spaceship', detail: 'Moves ' + (dr >= 0 ? '+' : '') + dr + ' row, ' + (dc >= 0 ? '+' : '') + dc + ' col every ' + period + ' generations', period: period, dr: dr, dc: dc }; }
    return { kind: 'evolving', label: 'Evolving', detail: 'No repeat in the last ' + Math.min(100, generation) + ' generations' };
  }
  function ageGridFor(g) { var ages = emptyGrid(g.length, g[0].length); for (var r = 0; r < g.length; r++) for (var c = 0; c < g[r].length; c++) if (g[r][c]) ages[r][c] = 1; return ages; }

  function stampPattern(g, patKey, r0, c0) {
    var pat = LIFE_PATTERNS[patKey]; if (!pat) return g;
    var rows = g.length, cols = g[0].length;
    var ng = g.map(function (row) { return row.slice(); });
    pat.cells.forEach(function (rc) {
      var r = r0 + rc[0], c = c0 + rc[1];
      if (r >= 0 && r < rows && c >= 0 && c < cols) ng[r][c] = 1;
    });
    return ng;
  }

  // Elementary 1-D CA: rule is an 8-element array indexed by the 3-bit
  // neighbourhood value (left<<2 | center<<1 | right).
  function ruleToBits(n) {
    var bits = [];
    for (var i = 0; i < 8; i++) bits.push((n >> i) & 1);
    return bits; // bits[neighbourhood] = output
  }
  function bitsToRule(bits) { var n = 0; for (var i = 0; i < 8; i++) if (bits[i]) n |= (1 << i); return n; }
  function stepRuleRow(row, bits, wrap) {
    var cols = row.length, out = [];
    for (var c = 0; c < cols; c++) {
      var l = wrap ? row[(c - 1 + cols) % cols] : (c - 1 >= 0 ? row[c - 1] : 0);
      var m = row[c];
      var rt = wrap ? row[(c + 1) % cols] : (c + 1 < cols ? row[c + 1] : 0);
      out.push(bits[(l << 2) | (m << 1) | rt]);
    }
    return out;
  }
  function clampRule(n) { n = parseInt(n, 10); if (isNaN(n)) n = 30; return Math.max(0, Math.min(255, n)); }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPONENT
  // ═══════════════════════════════════════════════════════════════════════
  function CellularLab(props) {
    var ctx = props.ctx;
    var React = ctx.React;
    var h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;
    var t = (typeof ctx.t === 'function') ? ctx.t : function (k) { return k; };
    // Stable ctx handle so quest writes / announcements don't churn effects when
    // the host rebuilds ctx each render.
    var ctxRef = useRef(ctx); ctxRef.current = ctx;
    // Component-owned SR live region (rendered below) so keyboard-grid feedback
    // works even if the host doesn't provide announceToSR.
    var sLive = useState(''); var liveMsg = sLive[0], setLiveMsg = sLive[1];
    var announce = useCallback(function (m) {
      setLiveMsg(String(m || ''));
      var cx = ctxRef.current;
      if (cx && typeof cx.announceToSR === 'function') { try { cx.announceToSR(m); } catch (_) {} }
    }, []);

    // ── theme ──
    var dark = !!ctx.isDark, contrast = !!ctx.isContrast;
    var C = {
      bg: dark ? '#0b1220' : '#f8fafc',
      panel: dark ? '#0f172a' : '#ffffff',
      border: dark ? '#1e293b' : '#e2e8f0',
      grid: dark ? '#1e293b' : '#e5e7eb',
      dead: dark ? '#111827' : '#f1f5f9',
      live: contrast ? (dark ? '#ffffff' : '#000000') : (dark ? '#34d399' : '#059669'),
      live2: contrast ? (dark ? '#fde047' : '#1d4ed8') : (dark ? '#22d3ee' : '#0ea5e9'),
      text: dark ? '#e2e8f0' : '#1e293b',
      sub: dark ? '#94a3b8' : '#64748b',
      accent: dark ? '#34d399' : '#059669',
      accentBg: dark ? '#064e3b' : '#d1fae5',
      cursor: '#f59e0b'
    };

    // ── transient state ──
    var sTab = useState('life'); var tab = sTab[0], setTab = sTab[1];

    // Life â€” the canonical 2-D engine shared by science and creative exploration.
    var sLifeSize = useState(40); var lifeSize = sLifeSize[0], setLifeSize = sLifeSize[1];
    var ROWS = lifeSize, COLS = lifeSize, PX = Math.max(4, Math.floor(560 / lifeSize));
    var sGrid = useState(function () { return stampPattern(emptyGrid(ROWS, COLS), 'glider', 2, 2); });
    var grid = sGrid[0], setGrid = sGrid[1];
    var agesRef = useRef(ageGridFor(grid));
    var sGen = useState(0); var gen = sGen[0], setGen = sGen[1];
    var sRun = useState(false); var running = sRun[0], setRunning = sRun[1];
    var sSpeed = useState(120); var speed = sSpeed[0], setSpeed = sSpeed[1];
    var sWrap = useState(true); var wrap = sWrap[0], setWrap = sWrap[1];
    var sBrush = useState(1); var brush = sBrush[0], setBrush = sBrush[1];
    var sCursor = useState([13, 18]); var cursor = sCursor[0], setCursor = sCursor[1];
    var sStamp = useState('glider'); var stampKey = sStamp[0], setStampKey = sStamp[1];
    var sPopHist = useState([]); var popHist = sPopHist[0], setPopHist = sPopHist[1];
    var popHistRef = useRef(popHist); popHistRef.current = popHist;
    var sBirth = useState('3'); var birthRule = sBirth[0], setBirthRule = sBirth[1];
    var sSurvive = useState('23'); var survivalRule = sSurvive[0], setSurvivalRule = sSurvive[1];
    var sViz = useState('normal'); var vizMode = sViz[0], setVizMode = sViz[1];
    var sHue = useState(150); var lifeHue = sHue[0], setLifeHue = sHue[1];
    var sMaxPop = useState(5); var maxPop = sMaxPop[0], setMaxPop = sMaxPop[1];
    var maxPopRef = useRef(maxPop); maxPopRef.current = maxPop;
    var sChallenge = useState(null); var challenge = sChallenge[0], setChallenge = sChallenge[1];
    var sChallengeStatus = useState('idle'); var challengeStatus = sChallengeStatus[0], setChallengeStatus = sChallengeStatus[1];
    var sChallengeMsg = useState(''); var challengeMsg = sChallengeMsg[0], setChallengeMsg = sChallengeMsg[1];
    var challengeInitialRef = useRef(null), stageRef = useRef(null);
    var gridRef = useRef(grid), genRef = useRef(gen), historyRef = useRef([]), previousGridRef = useRef(null), rewindingRef = useRef(false);
    var transitionRef = useRef({ born: 0, survived: 0, died: 0 }), transitionHistoryRef = useRef([]);
    gridRef.current = grid; genRef.current = gen;

    // Elementary CA
    var CA_COLS = 81, CA_ROWS = 60, CA_PX = 6;
    var sRule = useState(30); var rule = sRule[0], setRule = sRule[1];
    var sCaSeed = useState('single'); var caSeed = sCaSeed[0], setCaSeed = sCaSeed[1];
    var sCaWrap = useState(false); var caWrap = sCaWrap[0], setCaWrap = sCaWrap[1];
    var sCustomSeed = useState(function () { var row = []; for (var i = 0; i < CA_COLS; i++) row.push(i === Math.floor(CA_COLS / 2) ? 1 : 0); return row; }); var customSeed = sCustomSeed[0], setCustomSeed = sCustomSeed[1];
    var sSeedCursor = useState(Math.floor(CA_COLS / 2)); var seedCursor = sSeedCursor[0], setSeedCursor = sSeedCursor[1];
    var sCaInspect = useState(CA_ROWS - 1); var caInspectRow = sCaInspect[0], setCaInspectRow = sCaInspect[1];
    var sCaInspectCol = useState(Math.floor(CA_COLS / 2)); var caInspectCol = sCaInspectCol[0], setCaInspectCol = sCaInspectCol[1];
    var bits = ruleToBits(rule);
    // Elementary CA owns its boundary topology independently from the Life grid:
    // fixed zero-padding is the textbook default; wrap joins both ends as a ring.
    var caRows = React.useMemo(function () { return buildCaRows(rule, caSeed === 'custom' ? customSeed : caSeed, CA_ROWS, CA_COLS, caWrap); }, [rule, caSeed, customSeed, caWrap]);
    var caAnalysis = React.useMemo(function () { return analyzeCaRows(caRows, caWrap); }, [caRows, caWrap]);
    var caCause = caCellCause(caRows, caInspectRow, caInspectCol, caWrap);
    var caSvgRef = useRef(null), seedSvgRef = useRef(null);

    var paintingRef = useRef(false);
    var gridSvgRef = useRef(null);

    // ── quest persistence (write-once milestones) ──
    // The host resolves a tool's quest slice as toolData[id] || toolData['_'+id],
    // so for id 'cellularLab' we MUST persist under '_cellularLab' and the hooks
    // read fields directly off that slice (see registerTool below).
    var markQuest = useCallback(function (flag, extra) {
      var cx = ctxRef.current;
      if (!cx || typeof cx.setToolData !== 'function') return;
      cx.setToolData(function (prev) {
        var cur = Object.assign({}, (prev && prev._cellularLab) || {});
        var changed = false;
        if (flag && !cur[flag]) { cur[flag] = true; changed = true; }
        if (extra) { for (var k in extra) { if (extra[k] > (cur[k] || 0)) { cur[k] = extra[k]; changed = true; } } }
        if (!changed) return prev;
        var n = Object.assign({}, prev); n._cellularLab = cur; return n;
      });
    }, []);

    // ── the play loop (only auto-steps when running; SSR never runs effects).
    //    The setGrid updater stays PURE — extinction is handled in its own
    //    effect below so we never call setState inside another setter. ──
    useEffect(function () {
      if (!running) return undefined;
      var id = setInterval(function () { advanceOne(false); }, Math.max(40, speed));
      return function () { clearInterval(id); };
    }, [running, speed, wrap, birthRule, survivalRule]);

    // auto-stop when every cell has died (pure-updater-safe)
    useEffect(function () {
      if (running && countPop(grid) === 0) { setRunning(false); announce('All cells died — paused.'); }
    }, [grid, running, announce]);

    // record live-cell population per generation for the population sparkline.
    // Keyed on `gen` (grid updates in the same batched render) so painting between
    // generations doesn't double-count; gen===0 (reset/clear/new pattern) restarts it.
    useEffect(function () {
      if (rewindingRef.current) { rewindingRef.current = false; return; }
      var p = countPop(grid);
      setMaxPop(function (m) { var next = gen === 0 ? p : Math.max(m, p); maxPopRef.current = next; return next; });
      setPopHist(function (h) { var next = gen === 0 ? [p] : h.concat([p]).slice(-300); popHistRef.current = next; return next; });
    }, [gen]);

    // record generations-run milestone whenever gen advances past thresholds
    useEffect(function () {
      if (gen >= 50) markQuest('ranLong', { maxGen: gen });
      else if (gen > 0) markQuest(null, { maxGen: gen });
    }, [gen, markQuest]);

    // ── Life cell ops ──
    useEffect(function () {
      if (challengeStatus !== 'active' || !challengeInitialRef.current || gen < 1) return;
      var initial = challengeInitialRef.current, currentPop = countPop(grid), sig = gridSignature(grid), outcome = null;
      if (challenge === 'still' && gen === 1) outcome = sig === initial.signature && currentPop > 0 ? ['success', 'Still life confirmed: unchanged after one generation.'] : ['fail', 'The pattern changed. Try a 2Ã—2 block.'];
      else if (challenge === 'oscillator' && gen >= 2 && sig === initial.signature && currentPop > 0) outcome = ['success', 'Oscillator found with period ' + gen + '.'];
      else if (challenge === 'oscillator' && gen > 30) outcome = ['fail', 'No repeat within 30 generations. Try three cells in a row.'];
      else if (challenge === 'extinction' && initial.population === 0 && gen === 1) outcome = ['fail', 'Place at least one live cell before testing extinction.'];
      else if (challenge === 'extinction' && initial.population > 0 && currentPop === 0) outcome = ['success', 'Total extinction at generation ' + gen + '.'];
      else if (challenge === 'extinction' && gen > 200) outcome = ['fail', 'Still alive after 200 generations.'];
      else if (challenge === 'methuselah' && initial.population > 5) outcome = ['fail', 'Start with five cells or fewer.'];
      else if (challenge === 'methuselah' && gen >= 50 && currentPop > 0) outcome = ['success', initial.population + ' cells survived 50 generations.'];
      else if (challenge === 'maxpop' && initial.population !== 5) outcome = ['fail', 'Population Boom requires exactly five starting cells.'];
      else if (challenge === 'maxpop' && gen >= 50) outcome = ['success', 'Five cells reached a peak population of ' + Math.max(maxPop, currentPop) + '.'];
      if (outcome) { setChallengeStatus(outcome[0]); setChallengeMsg(outcome[1]); setRunning(false); if (outcome[0] === 'success') { markQuest('challengeCompleted'); var cx = ctxRef.current; if (cx && typeof cx.awardXP === 'function') try { cx.awardXP('cellularLab', 10, challenge + ' challenge'); } catch (_) {} announce(outcome[1]); } }
    }, [grid, gen, challenge, challengeStatus, maxPop, markQuest, announce]);

    function toggleCell(r, c, val) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      setGrid(function (g) {
        if (g[r][c] === val) return g;
        var ng = g.map(function (row) { return row.slice(); });
        ng[r][c] = val;
        var na = agesRef.current.map(function (row) { return row.slice(); }); na[r][c] = val ? 1 : 0; agesRef.current = na;
        resetTimeline(); gridRef.current = ng;
        return ng;
      });
      markQuest('drew');
    }
    function cellFromEvent(e) {
      var svg = gridSvgRef.current; if (!svg || !svg.getBoundingClientRect) return null;
      var rect = svg.getBoundingClientRect();
      var pt = (e.touches && e.touches[0]) ? e.touches[0] : e;
      var c = Math.floor((pt.clientX - rect.left) / rect.width * COLS);
      var r = Math.floor((pt.clientY - rect.top) / rect.height * ROWS);
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
      return [r, c];
    }
    function onGridPointerDown(e) {
      var rc = cellFromEvent(e); if (!rc) return;
      paintingRef.current = true;
      setCursor(rc);
      toggleCell(rc[0], rc[1], brush);
    }
    function onGridPointerMove(e) {
      if (!paintingRef.current) return;
      var rc = cellFromEvent(e); if (!rc) return;
      toggleCell(rc[0], rc[1], brush);
    }
    function onGridPointerUp() { paintingRef.current = false; }

    function onGridKeyDown(e) {
      var r = cursor[0], c = cursor[1], handled = true;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
      else if (e.key === 'ArrowDown') r = Math.min(ROWS - 1, r + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') c = Math.min(COLS - 1, c + 1);
      else if (e.key === ' ' || e.key === 'Enter') {
        var nv = grid[r][c] ? 0 : 1;
        toggleCell(r, c, nv);
        announce(nv ? ('Cell ' + (r + 1) + ',' + (c + 1) + ' alive') : ('Cell ' + (r + 1) + ',' + (c + 1) + ' empty'));
        handled = true;
      } else handled = false;
      if (handled) {
        if (e.preventDefault) e.preventDefault();
        if (e.key.indexOf('Arrow') === 0) { setCursor([r, c]); announce('Cursor at row ' + (r + 1) + ', column ' + (c + 1) + (grid[r][c] ? ', alive' : ', empty')); }
      }
    }

    function cloneGrid(g) { return g.map(function (row) { return row.slice(); }); }
    function resetTimeline() { historyRef.current = []; previousGridRef.current = null; transitionRef.current = { born: 0, survived: 0, died: 0 }; transitionHistoryRef.current = []; }
    function advanceOne(speakOnExtinction) {
      var current = gridRef.current, currentAges = agesRef.current, next = stepLifeDetailed(current, currentAges, wrap, birthRule, survivalRule);
      historyRef.current.push({ grid: cloneGrid(current), ages: cloneGrid(currentAges), gen: genRef.current, previousGrid: previousGridRef.current ? cloneGrid(previousGridRef.current) : null, transition: Object.assign({}, transitionRef.current), transitionHistory: transitionHistoryRef.current.slice(), popHist: popHistRef.current.slice(), maxPop: maxPopRef.current });
      if (historyRef.current.length > 100) historyRef.current.shift();
      previousGridRef.current = cloneGrid(current);
      transitionRef.current = { born: next.born, survived: next.survived, died: next.died };
      agesRef.current = next.ages; gridRef.current = next.grid;
      var nextGen = genRef.current + 1;
      var spatial = populationBounds(next.grid), beforeShape = shapeFingerprint(current), afterShape = shapeFingerprint(next.grid);
      transitionHistoryRef.current.push({ gen: nextGen, pop: countPop(next.grid), born: next.born, survived: next.survived, died: next.died, centerR: spatial ? spatial.centerR : null, centerC: spatial ? spatial.centerC : null, width: spatial ? spatial.width : 0, height: spatial ? spatial.height : 0, density: spatial ? spatial.density : 0, signature: gridSignature(next.grid), shapeSignature: afterShape.signature, minR: afterShape.minR, minC: afterShape.minC, previousSignature: gridSignature(current), previousShapeSignature: beforeShape.signature, previousMinR: beforeShape.minR, previousMinC: beforeShape.minC });
      if (transitionHistoryRef.current.length > 100) transitionHistoryRef.current.shift();
      genRef.current = nextGen; setGrid(next.grid); setGen(nextGen);
      if (speakOnExtinction && countPop(next.grid) === 0) announce('All cells died.');
    }
    function captureChallengeStart() { if (challenge && challengeStatus === 'active' && !challengeInitialRef.current) challengeInitialRef.current = { signature: gridSignature(grid), population: countPop(grid) }; }
    function stepOnce() { captureChallengeStart(); advanceOne(true); }
    function rewindOne() {
      var snapshot = historyRef.current.pop(); if (!snapshot) return;
      setRunning(false); rewindingRef.current = true; gridRef.current = snapshot.grid; agesRef.current = snapshot.ages; genRef.current = snapshot.gen;
      previousGridRef.current = snapshot.previousGrid; transitionRef.current = snapshot.transition; transitionHistoryRef.current = snapshot.transitionHistory;
      popHistRef.current = snapshot.popHist; maxPopRef.current = snapshot.maxPop;
      setGrid(snapshot.grid); setGen(snapshot.gen); setPopHist(snapshot.popHist); setMaxPop(snapshot.maxPop);
      announce('Rewound to generation ' + snapshot.gen + '.');
    }
    function clearGrid() { var empty = emptyGrid(ROWS, COLS); setRunning(false); resetTimeline(); gridRef.current = empty; setGrid(empty); agesRef.current = ageGridFor(empty); genRef.current = 0; setGen(0); setMaxPop(0); challengeInitialRef.current = null; announce('Grid cleared.'); }
    function randomize() {
      var next = randomGrid(ROWS, COLS, 0.30); setRunning(false); resetTimeline(); gridRef.current = next; setGrid(next); agesRef.current = ageGridFor(next);
      genRef.current = 0; setGen(0); setMaxPop(countPop(next)); challengeInitialRef.current = null; announce('Random soup placed.'); markQuest('randomized');
    }
    function resizeLife(nextSize) { var n = parseInt(nextSize, 10), empty = emptyGrid(n, n); setRunning(false); resetTimeline(); setLifeSize(n); gridRef.current = empty; setGrid(empty); agesRef.current = ageGridFor(empty); setCursor([Math.floor(n / 2), Math.floor(n / 2)]); genRef.current = 0; setGen(0); setMaxPop(0); setPopHist([]); challengeInitialRef.current = null; announce('Grid resized to ' + n + ' by ' + n + '.'); }
    function beginChallenge(id) { var empty = emptyGrid(ROWS, COLS); setRunning(false); resetTimeline(); gridRef.current = empty; setGrid(empty); agesRef.current = ageGridFor(empty); genRef.current = 0; setGen(0); setMaxPop(0); setPopHist([]); setChallenge(id); setChallengeStatus('active'); setChallengeMsg('Draw a starting pattern, then run or step to test it.'); challengeInitialRef.current = null; }
    function loadPattern(key) {
      setRunning(false);
      var pat = LIFE_PATTERNS[key]; if (!pat) return;
      var r0 = Math.max(0, Math.floor((ROWS - pat.h) / 2));
      var c0 = Math.max(0, Math.floor((COLS - pat.w) / 2));
      var next = stampPattern(emptyGrid(ROWS, COLS), key, r0, c0); resetTimeline(); gridRef.current = next; setGrid(next); agesRef.current = ageGridFor(next);
      genRef.current = 0; setGen(0); setMaxPop(countPop(next)); setPopHist([]); challengeInitialRef.current = null; setStampKey(key); setTab('life');
      announce('Loaded ' + pat.name + '.');
      markQuest('stamped'); if (pat.kind === 'gun') markQuest('sawGun'); if (pat.kind === 'spaceship') markQuest('sawShip');
    }
    function toggleRun() {
      var nr = !running; if (nr) captureChallengeStart(); setRunning(nr); announce(nr ? 'Running.' : 'Paused at generation ' + gen + '.');
    }

    var pop = countPop(grid);
    var forecastPreview = vizMode === 'forecast' ? stepLifeDetailed(grid, agesRef.current, wrap, birthRule, survivalRule) : null;

    // ── elementary CA ops ──
    function setRuleSafe(n) { var v = clampRule(n); setRule(v); markQuest('exploredRule'); if (v === 110) markQuest('saw110'); }
    function toggleRuleBit(i) {
      var nb = bits.slice(); nb[i] = nb[i] ? 0 : 1;
      setRuleSafe(bitsToRule(nb));
    }
    function toggleCustomSeedCell(index, forcedValue) {
      if (index < 0 || index >= CA_COLS) return;
      setCustomSeed(function (row) { var next = row.slice(); next[index] = forcedValue == null ? (next[index] ? 0 : 1) : forcedValue; return next; });
      setCaSeed('custom'); markQuest('exploredRule');
    }
    function seedCellFromEvent(e) {
      var svg = seedSvgRef.current; if (!svg || !svg.getBoundingClientRect) return null;
      var rect = svg.getBoundingClientRect(); if (!rect.width) return null;
      return Math.max(0, Math.min(CA_COLS - 1, Math.floor((e.clientX - rect.left) / rect.width * CA_COLS)));
    }
    function onSeedPointer(e) { var index = seedCellFromEvent(e); if (index == null) return; setSeedCursor(index); toggleCustomSeedCell(index); }
    function onSeedKeyDown(e) {
      var next = seedCursor, handled = true;
      if (e.key === 'ArrowLeft') next--;
      else if (e.key === 'ArrowRight') next++;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = CA_COLS - 1;
      else if (e.key === ' ' || e.key === 'Enter') toggleCustomSeedCell(seedCursor);
      else if (e.key === 'Delete' || e.key === 'Backspace') toggleCustomSeedCell(seedCursor, 0);
      else handled = false;
      if (handled) { if (e.preventDefault) e.preventDefault(); setSeedCursor(Math.max(0, Math.min(CA_COLS - 1, next))); }
    }
    function clearCustomSeed() { var row = []; for (var i = 0; i < CA_COLS; i++) row.push(0); setCustomSeed(row); setCaSeed('custom'); announce('Custom seed cleared.'); }
    function inspectCaFromEvent(e) {
      var svg = caSvgRef.current; if (!svg || !svg.getBoundingClientRect) return;
      var rect = svg.getBoundingClientRect(); if (!rect.height || !rect.width) return;
      setCaInspectRow(Math.max(0, Math.min(CA_ROWS - 1, Math.floor((e.clientY - rect.top) / rect.height * CA_ROWS))));
      setCaInspectCol(Math.max(0, Math.min(CA_COLS - 1, Math.floor((e.clientX - rect.left) / rect.width * CA_COLS))));
    }
    function onCaDiagramKeyDown(e) {
      var nextRow = caInspectRow, nextCol = caInspectCol, handled = true;
      if (e.key === 'ArrowUp') nextRow--;
      else if (e.key === 'ArrowDown') nextRow++;
      else if (e.key === 'ArrowLeft') nextCol--;
      else if (e.key === 'ArrowRight') nextCol++;
      else if (e.key === 'PageUp') nextRow -= 10;
      else if (e.key === 'PageDown') nextRow += 10;
      else if (e.key === 'Home') nextRow = 0;
      else if (e.key === 'End') nextRow = CA_ROWS - 1;
      else handled = false;
      if (handled) { if (e.preventDefault) e.preventDefault(); setCaInspectRow(Math.max(0, Math.min(CA_ROWS - 1, nextRow))); setCaInspectCol(Math.max(0, Math.min(CA_COLS - 1, nextCol))); }
    }

    // ════════════════════ SUB-RENDERERS ════════════════════
    function btn(label, onClick, opts) {
      opts = opts || {};
      return h('button', {
        key: opts.key || label, type: 'button', onClick: onClick, disabled: !!opts.disabled,
        'aria-pressed': opts.pressed === undefined ? undefined : !!opts.pressed,
        title: opts.title || label,
        style: {
          padding: '7px 12px', borderRadius: '9px', cursor: opts.disabled ? 'not-allowed' : 'pointer', opacity: opts.disabled ? 0.45 : 1, fontSize: '12px', fontWeight: 700,
          // primary/pressed buttons use a fixed emerald-700 so white text clears
          // 4.5:1 in both themes (the shared C.accent is emerald-400/600 → fails).
          border: '1px solid ' + ((opts.primary || opts.pressed) ? '#047857' : C.border),
          background: (opts.pressed || opts.primary) ? '#047857' : C.panel,
          color: (opts.pressed || opts.primary) ? '#ffffff' : C.text,
          whiteSpace: 'nowrap'
        }
      }, label);
    }

    function lifeFill(neighbours, age, r, c) {
      if (contrast) return C.live;
      if (vizMode === 'field') return '#67e8f9';
      if (vizMode === 'change') return previousGridRef.current && previousGridRef.current[r] && previousGridRef.current[r][c] ? '#22d3ee' : '#4ade80';
      if (vizMode === 'age') { var a = Math.min(1, Math.max(0, (age || 1) - 1) / 45); return 'hsl(' + Math.round(48 + a * 220) + ',88%,' + Math.round(62 - a * 18) + '%)'; }
      if (vizMode === 'xray') { var xc = ['#334155','#64748b','#ef4444','#22c55e','#f59e0b','#f97316','#ef4444','#dc2626','#991b1b']; return xc[neighbours] || C.live; }
      if (lifeHue < 0) return dark ? '#f8fafc' : '#334155';
      return 'hsl(' + lifeHue + ',82%,' + (45 + Math.min(4, neighbours) * 4) + '%)';
    }
    function renderLifeGrid() {
      var W = COLS * PX, H = ROWS * PX, scan = populationBounds(grid), dynamicsScan = detectDynamics(grid, gen, transitionHistoryRef.current), rects = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: dark ? '#020617' : '#07130f' })];
      if (lifeSize <= 80) { var lines = ''; for (var gx = 0; gx <= COLS; gx++) lines += 'M' + (gx * PX) + ' 0V' + H; for (var gy = 0; gy <= ROWS; gy++) lines += 'M0 ' + (gy * PX) + 'H' + W; rects.push(h('path', { key: 'grid', d: lines, stroke: 'rgba(148,163,184,0.16)', strokeWidth: Math.max(0.45, PX / 16), fill: 'none' })); }
      if (vizMode === 'field') {
        var track = transitionHistoryRef.current.filter(function (sample) { return sample.centerR != null && sample.centerC != null; }).slice(-60), trail = '', prior = null;
        track.forEach(function (sample) { var tx = (sample.centerC + 0.5) * PX, ty = (sample.centerR + 0.5) * PX, jump = prior && (Math.abs(sample.centerR - prior.centerR) > ROWS / 3 || Math.abs(sample.centerC - prior.centerC) > COLS / 3); trail += (!prior || jump ? 'M' : 'L') + tx.toFixed(2) + ' ' + ty.toFixed(2); prior = sample; });
        if (track.length > 1) rects.push(h('path', { key: 'centroidTrail', d: trail, fill: 'none', stroke: '#fbbf24', strokeWidth: Math.max(1.2, PX / 5), strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke', opacity: 0.8, style: { filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.75))', pointerEvents: 'none' } }));
      }
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var n = neighborCount(grid, r, c, wrap), alive = !!grid[r][c], futureAlive = !!(forecastPreview && forecastPreview.grid[r][c]);
        if (alive) {
          rects.push(h('rect', { key: 'l' + r + '_' + c, x: c * PX + 0.65, y: r * PX + 0.65, width: Math.max(1, PX - 1.3), height: Math.max(1, PX - 1.3), rx: PX > 7 ? 2 : 0.7, className: 'born', fill: vizMode === 'forecast' ? (futureAlive ? '#22d3ee' : '#fb7185') : lifeFill(n, agesRef.current[r] && agesRef.current[r][c], r, c), style: { filter: vizMode === 'forecast' ? 'drop-shadow(0 0 ' + Math.max(1, PX / 3) + 'px ' + (futureAlive ? 'rgba(34,211,238,0.9)' : 'rgba(251,113,133,0.9)') + ')' : vizMode === 'field' ? 'drop-shadow(0 0 ' + Math.max(1, PX / 3) + 'px rgba(103,232,249,0.9))' : vizMode === 'normal' && n >= 2 && n <= 3 ? 'drop-shadow(0 0 ' + Math.max(1, PX / 4) + 'px ' + C.live + ')' : 'none' } }));
          if (vizMode === 'forecast' && !futureAlive && PX >= 7) rects.push(h('path', { key: 'forecastDeath' + r + '_' + c, d: 'M' + (c * PX + PX * 0.25) + ' ' + (r * PX + PX * 0.25) + 'L' + (c * PX + PX * 0.75) + ' ' + (r * PX + PX * 0.75) + 'M' + (c * PX + PX * 0.75) + ' ' + (r * PX + PX * 0.25) + 'L' + (c * PX + PX * 0.25) + ' ' + (r * PX + PX * 0.75), stroke: '#ffe4e6', strokeWidth: Math.max(0.8, PX / 9), strokeLinecap: 'round', style: { pointerEvents: 'none' } }));
          if (vizMode === 'xray' && lifeSize <= 60 && PX >= 8) rects.push(h('text', { key: 'n' + r + '_' + c, x: c * PX + PX / 2, y: r * PX + PX * 0.7, textAnchor: 'middle', fill: (parseLifeRule(survivalRule, '23')[n] ? '#ffffff' : '#fee2e2'), style: { fontSize: Math.max(5, PX * 0.58) + 'px', fontWeight: 900, pointerEvents: 'none' } }, String(n)));
        } else if (vizMode === 'forecast' && futureAlive) {
          rects.push(h('rect', { key: 'forecastBirth' + r + '_' + c, x: c * PX + 0.9, y: r * PX + 0.9, width: Math.max(1, PX - 1.8), height: Math.max(1, PX - 1.8), rx: PX > 7 ? 2 : 0.7, fill: 'rgba(74,222,128,0.24)', stroke: '#4ade80', strokeWidth: Math.max(0.75, PX / 10), strokeDasharray: PX >= 7 ? '2 1' : undefined, style: { filter: 'drop-shadow(0 0 ' + Math.max(1, PX / 4) + 'px rgba(74,222,128,0.85))', pointerEvents: 'none' } }));
          if (PX >= 7) rects.push(h('path', { key: 'forecastPlus' + r + '_' + c, d: 'M' + (c * PX + PX * 0.28) + ' ' + (r * PX + PX * 0.5) + 'H' + (c * PX + PX * 0.72) + 'M' + (c * PX + PX * 0.5) + ' ' + (r * PX + PX * 0.28) + 'V' + (r * PX + PX * 0.72), stroke: '#dcfce7', strokeWidth: Math.max(0.8, PX / 9), strokeLinecap: 'round', style: { pointerEvents: 'none' } }));
        } else if (vizMode === 'change' && previousGridRef.current && previousGridRef.current[r] && previousGridRef.current[r][c]) {
          rects.push(h('rect', { key: 'gone' + r + '_' + c, x: c * PX + 0.9, y: r * PX + 0.9, width: Math.max(1, PX - 1.8), height: Math.max(1, PX - 1.8), rx: PX > 7 ? 2 : 0.7, fill: 'rgba(248,113,113,0.18)', stroke: '#fb7185', strokeWidth: Math.max(0.65, PX / 11), style: { filter: 'drop-shadow(0 0 ' + Math.max(1, PX / 5) + 'px rgba(251,113,133,0.7))' } }));
          if (PX >= 7) { rects.push(h('path', { key: 'goneX' + r + '_' + c, d: 'M' + (c * PX + PX * 0.28) + ' ' + (r * PX + PX * 0.28) + 'L' + (c * PX + PX * 0.72) + ' ' + (r * PX + PX * 0.72) + 'M' + (c * PX + PX * 0.72) + ' ' + (r * PX + PX * 0.28) + 'L' + (c * PX + PX * 0.28) + ' ' + (r * PX + PX * 0.72), stroke: '#fecdd3', strokeWidth: Math.max(0.7, PX / 10), strokeLinecap: 'round' })); }
        } else if (vizMode === 'xray' && lifeSize <= 60 && PX >= 8 && n > 0) {
          rects.push(h('text', { key: 'd' + r + '_' + c, x: c * PX + PX / 2, y: r * PX + PX * 0.7, textAnchor: 'middle', fill: parseLifeRule(birthRule, '3')[n] ? '#86efac' : 'rgba(148,163,184,0.34)', style: { fontSize: Math.max(5, PX * 0.5) + 'px', fontWeight: 800, pointerEvents: 'none' } }, String(n)));
        }
      }
      if (vizMode === 'field' && scan) {
        var bx = scan.minC * PX + 0.45, by = scan.minR * PX + 0.45, bw = scan.width * PX - 0.9, bh = scan.height * PX - 0.9, cx = (scan.centerC + 0.5) * PX, cy = (scan.centerR + 0.5) * PX, arm = Math.max(4, PX * 0.8);
        rects.push(h('rect', { key: 'scanBounds', x: bx, y: by, width: bw, height: bh, rx: Math.max(2, PX / 2), fill: 'rgba(34,211,238,0.04)', stroke: '#22d3ee', strokeWidth: Math.max(1.1, PX / 7), strokeDasharray: Math.max(3, PX / 2) + ' ' + Math.max(2, PX / 3), vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.75))', pointerEvents: 'none' } }));
        rects.push(h('circle', { key: 'scanCenterOuter', cx: cx, cy: cy, r: Math.max(3.5, PX * 0.55), fill: 'rgba(251,191,36,0.12)', stroke: '#fbbf24', strokeWidth: Math.max(1, PX / 8), vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.9))', pointerEvents: 'none' } }));
        rects.push(h('path', { key: 'scanCenterCross', d: 'M' + (cx - arm) + ' ' + cy + 'H' + (cx + arm) + 'M' + cx + ' ' + (cy - arm) + 'V' + (cy + arm), stroke: '#fde68a', strokeWidth: Math.max(0.9, PX / 9), vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }));
        if (PX >= 7) rects.push(h('text', { key: 'scanLabel', x: Math.min(W - 4, bx + 3), y: Math.max(8, by - 3), fill: '#a5f3fc', style: { fontSize: Math.max(6, PX * 0.55) + 'px', fontWeight: 900, pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px #020617)' } }, scan.width + 'x' + scan.height + ' · ' + Math.round(scan.density * 100) + '%'));
      }
      if (pop === 0) rects.push(h('text', { key: 'empty', x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: Math.max(9, Math.min(14, W / 30)) + 'px', fontStyle: 'italic' } }, 'Draw cells, choose a pattern, or make a random soup'));
      rects.push(h('rect', { key: 'cursor', x: cursor[1] * PX, y: cursor[0] * PX, width: PX, height: PX, fill: 'none', stroke: C.cursor, strokeWidth: Math.max(1.4, PX / 7), rx: 2, style: { pointerEvents: 'none', filter: 'drop-shadow(0 0 4px ' + C.cursor + ')' } }));
      return h('svg', { ref: gridSvgRef, className: 'cellularlab-svg', viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-roledescription': 'editable cellular automaton grid', 'aria-label': 'Cellular automaton grid, ' + ROWS + ' by ' + COLS + ', ' + pop + ' alive, generation ' + gen + ', rule B' + birthRule + ' slash S' + survivalRule + ', dynamics ' + dynamicsScan.label + ', ' + dynamicsScan.detail + (vizMode === 'forecast' && forecastPreview ? ', next-step forecast ' + forecastPreview.born + ' births, ' + forecastPreview.survived + ' survivors, ' + forecastPreview.died + ' deaths, projected population ' + (forecastPreview.born + forecastPreview.survived) : '') + (vizMode === 'field' && scan ? ', colony footprint ' + scan.width + ' by ' + scan.height + ', density ' + Math.round(scan.density * 100) + ' percent, center row ' + (scan.centerR + 1).toFixed(1) + ', column ' + (scan.centerC + 1).toFixed(1) : '') + (vizMode === 'change' && gen > 0 ? ', last transition ' + transitionRef.current.born + ' births, ' + transitionRef.current.survived + ' survivors, ' + transitionRef.current.died + ' deaths' : '') + '. Arrow keys move the cursor and space toggles a cell.', tabIndex: 0, onKeyDown: onGridKeyDown, onMouseDown: onGridPointerDown, onMouseMove: onGridPointerMove, onMouseUp: onGridPointerUp, onMouseLeave: onGridPointerUp, onTouchStart: function (e) { if (e.preventDefault) e.preventDefault(); onGridPointerDown(e); }, onTouchMove: function (e) { if (e.preventDefault) e.preventDefault(); onGridPointerMove(e); }, onTouchEnd: onGridPointerUp, style: { maxWidth: '620px', width: '100%', height: 'auto', borderRadius: '14px', border: '1px solid rgba(52,211,153,0.35)', touchAction: 'none', display: 'block', background: '#020617', cursor: 'crosshair', boxShadow: '0 22px 60px rgba(2,6,23,0.42), inset 0 0 42px rgba(16,185,129,0.08)' } }, rects);
    }

    function statChip(label, value, accent) {
      return h('div', { key: label, style: { background: dark ? 'rgba(15,23,42,0.82)' : '#ffffff', border: '1px solid ' + (accent || C.border), borderRadius: '11px', padding: '7px 10px', minWidth: '78px', textAlign: 'center', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' } }, h('div', { style: { fontSize: '9px', color: C.sub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' } }, label), h('div', { style: { fontSize: '17px', color: C.text, fontWeight: 900, marginTop: '2px' } }, value));
    }
    function sanitizeRule(value) { var seen = {}, out = ''; String(value || '').replace(/[^0-8]/g, '').split('').forEach(function (n) { if (!seen[n]) { seen[n] = true; out += n; } }); return out.split('').sort().join(''); }
    function toggleFullscreenLife() { var node = stageRef.current; if (!node || typeof document === 'undefined') return; if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); else if (node.requestFullscreen) node.requestFullscreen(); }
    function exportLifePng() {
      var svg = gridSvgRef.current; if (!svg || typeof XMLSerializer === 'undefined') return;
      var raw = new XMLSerializer().serializeToString(svg), blob = new Blob([raw], { type: 'image/svg+xml;charset=utf-8' }), url = URL.createObjectURL(blob), image = new Image();
      image.onload = function () { var canvas = document.createElement('canvas'), size = 1200; canvas.width = size; canvas.height = size; var g = canvas.getContext('2d'); g.fillStyle = '#020617'; g.fillRect(0, 0, size, size); g.drawImage(image, 0, 0, size, size); URL.revokeObjectURL(url); var link = document.createElement('a'); link.download = 'cellular-automaton-gen-' + gen + '.png'; link.href = canvas.toDataURL('image/png'); link.click(); announce('PNG exported.'); };
      image.onerror = function () { URL.revokeObjectURL(url); announce('PNG export was not available in this browser.'); }; image.src = url;
    }
    function populationChart() {
      var samples = transitionHistoryRef.current.slice(-100); if (samples.length < 2) return null;
      var W = 520, H = 76, pad = 7, n = samples.length, ceiling = 1;
      samples.forEach(function (s) { ceiling = Math.max(ceiling, s.pop, s.born, s.died); });
      var x = function (i) { return pad + i / Math.max(1, n - 1) * (W - pad * 2); };
      var y = function (value) { return pad + (1 - value / ceiling) * (H - pad * 2); };
      var points = function (key) { return samples.map(function (s, i) { return x(i).toFixed(1) + ',' + y(s[key]).toFixed(1); }).join(' '); };
      var latest = samples[n - 1], net = latest.born - latest.died;
      var legend = [{ key:'pop', label:'Population', color:'#22d3ee', value:latest.pop }, { key:'born', label:'Births', color:'#4ade80', value:latest.born }, { key:'died', label:'Deaths', color:'#fb7185', value:latest.died }];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, padding: '8px 10px', borderRadius: '13px', background: dark ? 'rgba(15,23,42,0.72)' : 'rgba(248,250,252,0.9)', border: '1px solid ' + C.border } },
        h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { fontSize: '9px', color: C.sub, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Evolution signal · ' + n + ' generations'), legend.map(function (item) { return h('span', { key: item.key, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: C.text, fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: item.key === 'born' ? '8px' : '10px', height: item.key === 'died' ? '8px' : '3px', transform: item.key === 'died' ? 'rotate(45deg)' : 'none', background: item.color, borderRadius: item.key === 'pop' ? '999px' : '1px', boxShadow: '0 0 7px ' + item.color } }), item.label + ' ' + item.value); }), h('span', { style: { marginLeft: 'auto', fontSize: '10px', color: net > 0 ? (dark ? '#86efac' : '#15803d') : net < 0 ? (dark ? '#fda4af' : '#be123c') : C.sub, fontWeight: 900 } }, 'Net ' + (net > 0 ? '+' : '') + net)),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Evolution over ' + n + ' generations. Latest population ' + latest.pop + ', births ' + latest.born + ', deaths ' + latest.died + ', net change ' + net + '. Scale zero to ' + ceiling + ' cells.', style: { width: '100%', height: H + 'px', display: 'block' } },
          h('defs', null, h('linearGradient', { id: 'cellEvolutionFill', x1: '0', y1: '0', x2: '0', y2: '1' }, h('stop', { offset: '0%', stopColor: '#22d3ee', stopOpacity: 0.24 }), h('stop', { offset: '100%', stopColor: '#22d3ee', stopOpacity: 0.01 }))),
          [0.25,0.5,0.75].map(function (level) { return h('line', { key: level, x1: pad, x2: W - pad, y1: y(ceiling * level), y2: y(ceiling * level), stroke: dark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.18)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }); }),
          h('polygon', { points: points('pop') + ' ' + x(n - 1) + ',' + (H - pad) + ' ' + x(0) + ',' + (H - pad), fill: 'url(#cellEvolutionFill)' }),
          h('polyline', { points: points('pop'), fill: 'none', stroke: '#22d3ee', strokeWidth: 2.3, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { points: points('born'), fill: 'none', stroke: '#4ade80', strokeWidth: 1.7, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { points: points('died'), fill: 'none', stroke: '#fb7185', strokeWidth: 1.7, strokeDasharray: '4 3', vectorEffect: 'non-scaling-stroke' }),
          h('circle', { cx: x(n - 1), cy: y(latest.pop), r: 3.2, fill: '#22d3ee', stroke: dark ? '#0f172a' : '#ffffff', strokeWidth: 1.3 }),
          h('rect', { x: x(n - 1) - 2.7, y: y(latest.born) - 2.7, width: 5.4, height: 5.4, rx: 1, fill: '#4ade80' }),
          h('rect', { x: x(n - 1) - 2.5, y: y(latest.died) - 2.5, width: 5, height: 5, transform: 'rotate(45 ' + x(n - 1) + ' ' + y(latest.died) + ')', fill: '#fb7185' })
        )
      );
    }
    function renderLifeTab() {
      var spatialScan = populationBounds(grid), dynamics = detectDynamics(grid, gen, transitionHistoryRef.current);
      var dynamicsColor = dynamics.kind === 'stable' ? '#4ade80' : dynamics.kind === 'oscillator' ? '#c4b5fd' : dynamics.kind === 'spaceship' ? '#fbbf24' : dynamics.kind === 'extinct' ? '#fb7185' : '#67e8f9';
      var dynamicsIcon = dynamics.kind === 'stable' ? '◆' : dynamics.kind === 'oscillator' ? '↻' : dynamics.kind === 'spaceship' ? '↗' : dynamics.kind === 'extinct' ? '○' : dynamics.kind === 'ready' ? '◇' : '…';
      var rulePresets = [{ name: 'Conway', b: '3', s: '23' }, { name: 'Seeds', b: '2', s: '' }, { name: 'HighLife', b: '36', s: '23' }, { name: 'Day & Night', b: '3678', s: '34678' }, { name: 'Diamoeba', b: '35678', s: '5678' }];
      var challenges = [{ id: 'still', name: 'Still Life', note: 'Stay unchanged after one step.' }, { id: 'oscillator', name: 'Oscillator', note: 'Return to the starting pattern.' }, { id: 'extinction', name: 'Extinction', note: 'Design a pattern that dies out.' }, { id: 'methuselah', name: 'Methuselah', note: '<=5 cells survive 50 generations.' }, { id: 'maxpop', name: 'Population Boom', note: 'Exactly 5 cells; maximize the peak by gen 50.' }];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, statChip('Generation', gen, '#10b981'), statChip('Population', pop, '#22d3ee'), statChip('Peak', maxPop, '#f59e0b'), statChip('Rule', 'B' + birthRule + '/S' + survivalRule, '#a78bfa'), h('div', { style: { flex: 1 } }), h('span', { role: 'status', style: { padding: '6px 10px', borderRadius: '999px', background: running ? '#064e3b' : C.bg, color: running ? '#a7f3d0' : C.sub, border: '1px solid ' + (running ? '#10b981' : C.border), fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, running ? 'Running' : 'Paused')),
        populationChart(),
        gen > 0 && h('div', { role: 'status', 'aria-label': 'Last transition: ' + transitionRef.current.born + ' births, ' + transitionRef.current.survived + ' survivors, and ' + transitionRef.current.died + ' deaths.', style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 11px', borderRadius: '12px', background: dark ? 'linear-gradient(90deg, rgba(20,83,45,0.5), rgba(8,47,73,0.5), rgba(76,5,25,0.45))' : 'linear-gradient(90deg, #f0fdf4, #ecfeff, #fff1f2)', border: '1px solid ' + C.border, fontSize: '11px', fontWeight: 900 } }, h('span', { style: { color: C.sub, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '9px' } }, 'Last transition'), h('span', { style: { color: dark ? '#86efac' : '#15803d' } }, '+' + transitionRef.current.born + ' births'), h('span', { style: { color: dark ? '#67e8f9' : '#0e7490' } }, transitionRef.current.survived + ' survivors'), h('span', { style: { color: dark ? '#fda4af' : '#be123c' } }, '-' + transitionRef.current.died + ' deaths'), h('span', { style: { color: transitionRef.current.born > transitionRef.current.died ? (dark ? '#86efac' : '#15803d') : transitionRef.current.born < transitionRef.current.died ? (dark ? '#fda4af' : '#be123c') : C.sub } }, 'Net ' + (transitionRef.current.born > transitionRef.current.died ? '+' : '') + (transitionRef.current.born - transitionRef.current.died)), h('span', { style: { marginLeft: 'auto', color: C.sub, fontSize: '9px' } }, historyRef.current.length + ' / 100 rewind frames')),
        h('div', { ref: stageRef, id: 'cellularlab-stage', style: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', borderRadius: '18px', overflow: 'auto', background: 'radial-gradient(circle at 50% 42%, rgba(16,185,129,0.16), rgba(2,6,23,0.98) 68%)', border: '1px solid rgba(52,211,153,0.28)' } }, renderLifeGrid(), h('div', { 'aria-label': 'Dynamics detector: ' + dynamics.label + '. ' + dynamics.detail, style: { pointerEvents: 'none', position: 'absolute', zIndex: 2, top: '22px', right: '22px', maxWidth: '190px', padding: '7px 10px', borderRadius: '11px', textAlign: 'right', background: 'rgba(2,6,23,0.82)', border: '1px solid ' + dynamicsColor, color: '#f8fafc', boxShadow: '0 8px 28px rgba(2,6,23,0.38), 0 0 16px ' + dynamicsColor + '33', backdropFilter: 'blur(6px)' } }, h('div', { style: { color: dynamicsColor, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, h('span', { 'aria-hidden': 'true' }, dynamicsIcon + ' '), dynamics.label), h('div', { style: { marginTop: '2px', color: '#cbd5e1', fontSize: '9px', fontWeight: 700, lineHeight: 1.3 } }, dynamics.detail)), h('div', { 'aria-hidden': 'true', style: { pointerEvents: 'none', position: 'absolute', inset: 0, boxShadow: 'inset 0 0 50px rgba(34,211,238,0.06)' } })),
        h('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' } }, btn(running ? 'Pause' : 'Run', toggleRun, { primary: true }), btn(vizMode === 'forecast' ? 'Apply forecast' : 'Step', stepOnce, { key: 'step', title: vizMode === 'forecast' ? 'Apply the predicted generation' : 'Advance one generation' }), btn('Rewind', rewindOne, { disabled: historyRef.current.length === 0, title: historyRef.current.length ? 'Rewind one generation' : 'Step or run to create rewind history' }), btn('Random', randomize), btn('Clear', clearGrid), btn('Fullscreen', toggleFullscreenLife), btn('Export PNG', exportLifePng)),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' } },
          h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '11px' } }, h('div', { style: { fontSize: '11px', fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } }, 'World controls'), h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '9px' } }, btn('Draw', function () { setBrush(1); }, { pressed: brush === 1 }), btn('Erase', function () { setBrush(0); }, { pressed: brush === 0 }), btn(wrap ? 'Wrap on' : 'Wrap off', function () { setWrap(function (w) { return !w; }); }, { pressed: wrap })), h('label', { style: { display: 'block', fontSize: '11px', color: C.sub, fontWeight: 800 } }, 'Speed: ' + Math.round(1000 / speed) + ' generations/sec', h('input', { type: 'range', min: 1, max: 25, value: Math.round(1000 / speed), onChange: function (e) { setSpeed(Math.round(1000 / parseInt(e.target.value, 10))); }, 'aria-label': 'Generations per second', style: { width: '100%', marginTop: '5px' } })), h('div', { style: { marginTop: '9px', fontSize: '11px', color: C.sub, fontWeight: 800 } }, 'Grid size'), h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' } }, [40,60,80,120].map(function (n) { return btn(n + ' x ' + n, function () { resizeLife(n); }, { pressed: lifeSize === n }); }))),
          h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '11px' } }, h('div', { style: { fontSize: '11px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } }, 'Scientific lens'), h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, [{ id:'normal',label:'Normal' },{ id:'forecast',label:'Next forecast' },{ id:'field',label:'Colony scan' },{ id:'change',label:'Change map' },{ id:'age',label:'Age map' },{ id:'xray',label:'Neighbor X-ray' }].map(function (v) { return btn(v.label, function () { setVizMode(v.id); }, { pressed: vizMode === v.id }); })), h('p', { style: { margin: '7px 0', fontSize: '10px', color: C.sub, lineHeight: 1.4 } }, vizMode === 'forecast' ? 'Preview the next rule application before stepping. Green pluses are births; cyan cells survive; rose crosses die.' : vizMode === 'field' ? 'Measure the colony footprint and center of mass. The gold trail tracks movement across generations.' : vizMode === 'change' ? 'See exactly what the last rule application changed. Rewind to compare earlier transitions.' : vizMode === 'age' ? 'Yellow cells are newborn; violet cells have survived many generations.' : vizMode === 'xray' ? 'Numbers are live-neighbor counts. Green outcomes satisfy the current B/S rule.' : 'Cell brightness responds to local neighborhood density.'), vizMode === 'forecast' && forecastPreview && h('div', { role: 'status', 'aria-label': 'Forecast: ' + forecastPreview.born + ' births, ' + forecastPreview.survived + ' survivors, ' + forecastPreview.died + ' deaths, projected population ' + (forecastPreview.born + forecastPreview.survived) + '.', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, h('span', { style: { color: dark ? '#86efac' : '#15803d' } }, '+' + forecastPreview.born + ' births'), h('span', { style: { color: dark ? '#67e8f9' : '#0e7490' } }, forecastPreview.survived + ' survive'), h('span', { style: { color: dark ? '#fda4af' : '#be123c' } }, '-' + forecastPreview.died + ' deaths'), h('span', null, 'Projected pop ' + (forecastPreview.born + forecastPreview.survived)), h('span', null, 'Net ' + (forecastPreview.born - forecastPreview.died >= 0 ? '+' : '') + (forecastPreview.born - forecastPreview.died))), vizMode === 'field' && h('div', { role: 'status', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, spatialScan ? [h('span', { key:'footprint' }, 'Footprint ' + spatialScan.width + ' x ' + spatialScan.height), h('span', { key:'density' }, 'Density ' + Math.round(spatialScan.density * 100) + '%'), h('span', { key:'center' }, 'Center r' + (spatialScan.centerR + 1).toFixed(1) + ', c' + (spatialScan.centerC + 1).toFixed(1)), h('span', { key:'trail' }, Math.min(60, transitionHistoryRef.current.length) + ' trail points')] : h('span', null, 'No live cells to scan.')), vizMode === 'change' && h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' } }, [{ label:'Born', color:'#4ade80' },{ label:'Survived', color:'#22d3ee' },{ label:'Died', color:'#fb7185' }].map(function (item) { return h('span', { key: item.label, style: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '3px', background: item.color, boxShadow: '0 0 8px ' + item.color } }), item.label); })), vizMode === 'normal' && h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, [{h:150,c:'#10b981'},{h:190,c:'#06b6d4'},{h:45,c:'#f59e0b'},{h:320,c:'#ec4899'},{h:-1,c:'#e2e8f0'}].map(function (sw) { return h('button', { key: sw.h, type: 'button', onClick: function () { setLifeHue(sw.h); }, 'aria-label': 'Use ' + sw.c + ' cell palette', 'aria-pressed': lifeHue === sw.h, style: { width: '30px', height: '24px', borderRadius: '7px', border: '2px solid ' + (lifeHue === sw.h ? C.cursor : C.border), background: sw.c, cursor: 'pointer' } }); })))
        ),
        h('section', { style: { background: dark ? '#17132b' : '#faf5ff', border: '1px solid #a78bfa', borderRadius: '13px', padding: '11px' } }, h('div', { style: { fontSize: '11px', fontWeight: 900, color: dark ? '#c4b5fd' : '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Life-like rule editor'), h('p', { style: { margin: '5px 0 8px', fontSize: '11px', color: C.sub } }, 'B lists neighbor counts that create a cell. S lists counts that let a cell survive.'), h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, h('label', { style: { fontSize: '11px', fontWeight: 800, color: C.text } }, 'Birth B', h('input', { value: birthRule, onChange: function (e) { setBirthRule(sanitizeRule(e.target.value)); }, 'aria-label': 'Birth rule', style: { display: 'block', width: '94px', marginTop: '3px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #8b5cf6', background: C.panel, color: C.text, fontFamily: 'monospace' } })), h('label', { style: { fontSize: '11px', fontWeight: 800, color: C.text } }, 'Survival S', h('input', { value: survivalRule, onChange: function (e) { setSurvivalRule(sanitizeRule(e.target.value)); }, 'aria-label': 'Survival rule', style: { display: 'block', width: '94px', marginTop: '3px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #8b5cf6', background: C.panel, color: C.text, fontFamily: 'monospace' } })), h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'end' } }, rulePresets.map(function (rp) { return btn(rp.name, function () { setBirthRule(rp.b); setSurvivalRule(rp.s); announce(rp.name + ' rules loaded.'); }, { pressed: birthRule === rp.b && survivalRule === rp.s, title: 'B' + rp.b + '/S' + rp.s }); })))),
        h('section', { style: { background: dark ? '#261d0c' : '#fffbeb', border: '1px solid #f59e0b', borderRadius: '13px', padding: '11px' } }, h('div', { style: { fontSize: '11px', fontWeight: 900, color: dark ? '#fcd34d' : '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Pattern challenges: +10 XP'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '7px', marginTop: '8px' } }, challenges.map(function (ch) { var active = challenge === ch.id; return h('button', { key: ch.id, type: 'button', onClick: function () { beginChallenge(ch.id); }, 'aria-pressed': active, style: { textAlign: 'left', padding: '8px', borderRadius: '9px', cursor: 'pointer', border: '1px solid ' + (active ? '#d97706' : C.border), background: active ? (dark ? '#78350f' : '#fef3c7') : C.panel, color: C.text } }, h('div', { style: { fontSize: '11px', fontWeight: 900 } }, ch.name), h('div', { style: { marginTop: '2px', fontSize: '10px', color: active ? C.text : C.sub, lineHeight: 1.35 } }, ch.note)); })), challenge && h('div', { role: 'status', style: { marginTop: '8px', padding: '8px 10px', borderRadius: '9px', background: challengeStatus === 'success' ? '#d1fae5' : challengeStatus === 'fail' ? '#fee2e2' : (dark ? '#422006' : '#fff7ed'), color: challengeStatus === 'success' ? '#065f46' : challengeStatus === 'fail' ? '#991b1b' : (dark ? '#fde68a' : '#92400e'), fontSize: '11px', fontWeight: 800 } }, (challengeStatus === 'success' ? 'Success: ' : challengeStatus === 'fail' ? 'Try again: ' : 'Challenge: ') + challengeMsg)),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { fontSize: '11px', color: C.sub, fontWeight: 900 } }, 'Quick patterns:'), PATTERN_ORDER.slice(0, 8).map(function (k) { return btn(LIFE_PATTERNS[k].name, function () { loadPattern(k); }, { pressed: stampKey === k }); }))
      );
    }

    // Elementary CA tab
    function renderSeedEditor() {
      var W = CA_COLS * CA_PX, H = 24, live = customSeed.reduce(function (sum, value) { return sum + value; }, 0), cells = [h('rect', { key: 'seedBg', x: 0, y: 0, width: W, height: H, rx: 6, fill: C.dead })];
      if (caWrap) cells.push(h('path', { key: 'seedTopology', d: 'M3 3C' + (W * 0.22) + ' -2 ' + (W * 0.78) + ' -2 ' + (W - 3) + ' 3', fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 3px rgba(196,181,253,0.85))', pointerEvents: 'none' } }));
      else cells.push(h('path', { key: 'seedTopology', d: 'M1 2V22M' + (W - 1) + ' 2V22', stroke: '#fb7185', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }));
      customSeed.forEach(function (value, i) { cells.push(h('rect', { key: i, id: 'ca-seed-cell-' + i, role: 'gridcell', 'aria-label': 'Seed cell ' + (i + 1) + ', ' + (value ? 'alive' : 'empty'), 'aria-selected': seedCursor === i ? 'true' : 'false', x: i * CA_PX + 0.6, y: 3, width: CA_PX - 1.2, height: H - 6, rx: 1.2, fill: value ? '#22d3ee' : (dark ? '#111827' : '#e2e8f0'), stroke: (caWrap && (i === 0 || i === CA_COLS - 1)) ? '#c4b5fd' : value ? '#67e8f9' : 'rgba(148,163,184,0.18)', strokeWidth: (caWrap && (i === 0 || i === CA_COLS - 1)) ? 1.2 : 0.7, style: { filter: value ? 'drop-shadow(0 0 3px rgba(34,211,238,0.8))' : 'none', pointerEvents: 'none' } })); });
      cells.push(h('rect', { key: 'seedCursor', x: seedCursor * CA_PX + 0.25, y: 1.5, width: CA_PX - 0.5, height: H - 3, rx: 1.5, fill: 'none', stroke: '#fde047', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.9))', pointerEvents: 'none' } }));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '560px' } },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { color: C.sub, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em' } }, 'Custom seed · ' + live + ' alive · ' + (caWrap ? 'wrap ring' : 'fixed edges')), h('span', { style: { color: C.sub, fontSize: '10px' } }, 'Click cells or use arrows + Space'), h('span', { style: { flex: 1 } }), btn('Clear seed', clearCustomSeed, { key: 'clearSeed', title: 'Clear all custom seed cells' })),
        h('svg', { ref: seedSvgRef, viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'grid', tabIndex: 0, 'aria-rowcount': 1, 'aria-colcount': CA_COLS, 'aria-activedescendant': 'ca-seed-cell-' + seedCursor, 'aria-label': 'Custom initial row with ' + live + ' live cells and ' + (caWrap ? 'wrapped ring boundaries.' : 'fixed empty boundaries.') + ' Left and right arrows move the cursor. Space toggles a cell. Delete clears it.', onClick: onSeedPointer, onKeyDown: onSeedKeyDown, style: { width: '100%', maxWidth: '560px', height: 'auto', display: 'block', cursor: 'crosshair', borderRadius: '7px', border: '1px solid ' + C.border, background: C.dead } }, cells)
      );
    }
    function renderRuleTable() {
      // 8 neighbourhood columns: output mapping, observed usage, and the mapping
      // currently responsible for the selected space-time cell.
      var cells = [], usageCounts = caAnalysis.neighborhoodCounts || [], usageTotal = caAnalysis.neighborhoodTotal || 0;
      var maxUsage = Math.max.apply(Math, usageCounts.concat([1]));
      for (var i = 7; i >= 0; i--) {
        var l = (i >> 2) & 1, m = (i >> 1) & 1, rt = i & 1, out = bits[i];
        var x = (7 - i) * 64, usage = usageCounts[i] || 0, share = usageTotal ? usage / usageTotal : 0;
        var activeCause = !!(caCause && caCause.index === i), col = [];
        col.push(h('rect', { key: 'heat' + i, x: x + 3, y: 2, width: 58, height: 62, rx: 6, fill: C.live2, opacity: 0.04 + share * 0.38, stroke: activeCause ? '#fde047' : 'none', strokeWidth: activeCause ? 2.2 : 0, style: { pointerEvents: 'none', filter: activeCause ? 'drop-shadow(0 0 6px rgba(253,224,71,0.9))' : 'none' } }));
        [l, m, rt].forEach(function (v, j) {
          col.push(h('rect', { key: 'n' + i + '_' + j, x: x + 8 + j * 16, y: 6, width: 14, height: 14, rx: 2, fill: v ? C.live : C.dead, stroke: activeCause ? '#fde047' : C.border, strokeWidth: activeCause ? 1.6 : 1 }));
        });
        col.push(h('rect', { key: 'o' + i, x: x + 24, y: 30, width: 14, height: 14, rx: 2, fill: out ? C.live2 : C.dead, stroke: activeCause ? '#fde047' : (out ? C.live2 : C.border), strokeWidth: activeCause ? 2.2 : (out ? 2 : 1) }));
        col.push(h('path', { key: 'a' + i, d: 'M' + (x + 31) + ' 22V28', stroke: activeCause ? '#fde047' : C.sub, strokeWidth: activeCause ? 2 : 1.5 }));
        col.push(h('rect', { key: 'track' + i, x: x + 8, y: 49, width: 48, height: 4, rx: 2, fill: C.border, opacity: 0.48, style: { pointerEvents: 'none' } }));
        col.push(h('rect', { key: 'evidence' + i, 'data-neighborhood-evidence': String(i), 'data-count': String(usage), x: x + 8, y: 49, width: 48 * usage / maxUsage, height: 4, rx: 2, fill: '#fbbf24', style: { pointerEvents: 'none', filter: usage ? 'drop-shadow(0 0 3px rgba(251,191,36,0.55))' : 'none' } }));
        col.push(h('text', { key: 'pct' + i, x: x + 32, y: 63, textAnchor: 'middle', fill: activeCause ? '#fde047' : C.sub, fontSize: 8, fontWeight: 800, style: { pointerEvents: 'none' } }, (share * 100).toFixed(share >= 0.1 ? 0 : 1) + '%'));
        cells.push(h('g', {
          key: 'col' + i, role: 'button', tabIndex: 0, 'data-active-cause': activeCause ? 'true' : undefined,
          'aria-current': activeCause ? 'true' : undefined,
          'aria-label': 'Neighbourhood ' + l + m + rt + ' produces ' + out + '. Observed ' + usage + ' times, ' + (share * 100).toFixed(1) + ' percent of transitions.' + (activeCause ? ' This mapping produced the selected cell.' : '') + ' Activate to flip.',
          onClick: (function (idx) { return function () { toggleRuleBit(idx); }; })(i),
          onKeyDown: (function (idx) { return function (e) { if (e.key === ' ' || e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); toggleRuleBit(idx); } }; })(i),
          style: { cursor: 'pointer' }
        }, col));
      }
      return h('div', { style: { maxWidth: '520px' } },
        h('svg', { viewBox: '0 0 512 68', width: '100%', role: 'group', 'aria-label': 'Rule table for rule ' + rule + ' with ' + usageTotal + ' neighborhood observations. Each column maps a 3-cell neighbourhood to the next cell. Gold bars and percentages show observed frequency. A gold outline marks the mapping responsible for the selected cell. Click a column to flip its output.', style: { display: 'block' } }, cells),
        h('div', { style: { marginTop: '2px', color: C.sub, fontSize: '10px', fontWeight: 800, textAlign: 'center' } }, 'Neighborhood evidence | ' + usageTotal.toLocaleString() + ' observations | gold outline = selected cell cause')
      );
    }

    function renderCaDiagram() {
      var W = CA_COLS * CA_PX, H = CA_ROWS * CA_PX, selectedX = (caInspectCol + 0.5) * CA_PX, selectedY = (caInspectRow + 0.5) * CA_PX;
      var causeText = caCause && caCause.pattern ? 'Generation ' + caInspectRow + ', column ' + (caInspectCol + 1) + ': parents ' + caCause.pattern + ' produced ' + caCause.output + '.' : 'Generation zero seed cell at column ' + (caInspectCol + 1) + ' has no parent neighborhood.';
      var rects = [h('desc', { key: 'desc', id: 'ca-diagram-desc' }, causeText + ' Use arrow keys to inspect adjacent cells, Page Up and Page Down to jump ten generations, and Home or End to move through time.'), h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.dead })];
      for (var r = 0; r < caRows.length; r++) {
        if (r > 0 && r % 10 === 0) rects.push(h('line', { key: 'guide' + r, x1: 0, x2: W, y1: r * CA_PX, y2: r * CA_PX, stroke: dark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.2)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }));
        var timeColor = contrast ? C.live : 'hsl(' + Math.round(158 + r / Math.max(1, caRows.length - 1) * 92) + ',82%,56%)';
        for (var c = 0; c < CA_COLS; c++) if (caRows[r][c]) rects.push(h('rect', { key: r + '_' + c, x: c * CA_PX, y: r * CA_PX, width: CA_PX, height: CA_PX, rx: 0.6, fill: timeColor }));
      }
      if (caWrap) rects.push(h('path', { key: 'boundaryRails', d: 'M1 0V' + H + 'M' + (W - 1) + ' 0V' + H, fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.5, strokeDasharray: '5 3', vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(196,181,253,0.75))', pointerEvents: 'none' } }));
      else rects.push(h('path', { key: 'boundaryRails', d: 'M1 0V' + H + 'M' + (W - 1) + ' 0V' + H, fill: 'none', stroke: '#fb7185', strokeWidth: 1.3, vectorEffect: 'non-scaling-stroke', opacity: 0.75, style: { pointerEvents: 'none' } }));
      rects.push(h('rect', { key: 'inspectRow', x: 0.7, y: caInspectRow * CA_PX + 0.7, width: W - 1.4, height: CA_PX - 1.4, fill: 'rgba(253,224,71,0.055)', stroke: 'none', style: { pointerEvents: 'none' } }));
      if (caCause && caCause.parents.length) {
        caCause.parents.forEach(function (parent, parentIndex) {
          var parentX = parent.col == null ? (parentIndex === 0 ? 0 : W) : (parent.col + 0.5) * CA_PX;
          var parentY = (caInspectRow - 0.5) * CA_PX;
          rects.push(h('path', { key: 'causeLine' + parentIndex, d: 'M' + parentX + ' ' + parentY + ' L' + selectedX + ' ' + selectedY, fill: 'none', stroke: parent.wrapped ? '#c4b5fd' : '#67e8f9', strokeWidth: parent.wrapped ? 1.8 : 1.35, strokeDasharray: parent.wrapped ? '4 3' : undefined, vectorEffect: 'non-scaling-stroke', opacity: 0.9, style: { filter: 'drop-shadow(0 0 3px rgba(103,232,249,0.75))', pointerEvents: 'none' } }));
          if (parent.col != null) rects.push(h('rect', { key: 'causeParent' + parentIndex, 'data-ca-parent': String(parentIndex), x: parent.col * CA_PX + 0.45, y: (caInspectRow - 1) * CA_PX + 0.45, width: CA_PX - 0.9, height: CA_PX - 0.9, rx: 1, fill: parent.value ? 'rgba(103,232,249,0.28)' : 'rgba(103,232,249,0.08)', stroke: '#67e8f9', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(103,232,249,0.9))', pointerEvents: 'none' } }));
        });
      }
      rects.push(h('g', { key: 'selectedCellRow', role: 'row' },
        h('g', { id: 'ca-diagram-cell-' + caInspectRow + '-' + caInspectCol, role: 'gridcell', 'aria-selected': 'true', 'aria-label': causeText, 'data-ca-selected-row': String(caInspectRow), 'data-ca-selected-col': String(caInspectCol) },
          h('circle', { cx: selectedX, cy: selectedY, r: CA_PX * 1.18, fill: 'rgba(253,224,71,0.12)', stroke: '#fde047', strokeWidth: 1.7, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.95))', pointerEvents: 'none' } }),
          h('rect', { x: caInspectCol * CA_PX + 0.55, y: caInspectRow * CA_PX + 0.55, width: CA_PX - 1.1, height: CA_PX - 1.1, rx: 1, fill: caCause && caCause.output ? 'rgba(253,224,71,0.38)' : 'rgba(253,224,71,0.08)', stroke: '#fde047', strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } })
        )
      ));
      return h('svg', { ref: caSvgRef, viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'grid', tabIndex: 0,
        'aria-label': 'Interactive space-time causal inspector for rule ' + rule + ' with ' + (caWrap ? 'wrapped ring boundaries' : 'fixed empty boundaries') + '. Click a cell or use arrow keys to move.',
        'aria-describedby': 'ca-diagram-desc', 'aria-rowcount': CA_ROWS, 'aria-colcount': CA_COLS, 'aria-activedescendant': 'ca-diagram-cell-' + caInspectRow + '-' + caInspectCol,
        onClick: inspectCaFromEvent, onKeyDown: onCaDiagramKeyDown,
        style: { maxWidth: '560px', width: '100%', height: 'auto', borderRadius: '10px', border: '1px solid ' + C.border, display: 'block', background: C.dead, boxShadow: '0 18px 42px rgba(2,6,23,0.22)', cursor: 'crosshair' } }, rects);
    }
    function renderCaAnalysis() {
      var W = 520, H = 92, px = 10, top = 7, bottom = 17, n = caAnalysis.densities.length;
      var x = function (i) { return px + i / Math.max(1, n - 1) * (W - px * 2); }, y = function (v) { return top + (1 - v) * (H - top - bottom); };
      var points = function (values) { return values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' '); };
      var selectedDensity = caAnalysis.densities[caInspectRow] || 0, selectedEntropy = caAnalysis.entropies[caInspectRow] || 0, selectedActivity = caAnalysis.activities[caInspectRow] || 0, selectedLive = Math.round(selectedDensity * CA_COLS);
      var legend = [{ key:'density', label:'Density', value:Math.round(selectedDensity * 100) + '%', color:'#22d3ee' }, { key:'entropy', label:'Entropy', value:selectedEntropy.toFixed(2) + ' bits', color:'#a78bfa' }, { key:'activity', label:'Activity', value:Math.round(selectedActivity * 100) + '%', color:'#fbbf24' }];
      var causeSummary = caCause && caCause.pattern ? 'Cell ' + (caInspectCol + 1) + ': ' + caCause.pattern + ' -> ' + caCause.output + ' via rule mapping ' + caCause.index : 'Cell ' + (caInspectCol + 1) + ': seed value ' + (caCause ? caCause.output : 0) + ' (no parents)';
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '560px' } },
        h('div', { role: 'status', 'aria-live': 'polite', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { color: C.sub, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Generation ' + caInspectRow + ' | ' + selectedLive + ' live'), h('span', { 'data-ca-cause-detail': 'true', style: { color: dark ? '#fde68a' : '#92400e', fontSize: '10px', fontWeight: 900 } }, causeSummary), legend.map(function (item) { return h('span', { key: item.key, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: C.text, fontSize: '10px', fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: item.key === 'entropy' ? '7px' : '10px', height: item.key === 'activity' ? '7px' : '3px', transform: item.key === 'activity' ? 'rotate(45deg)' : 'none', borderRadius: item.key === 'density' ? '999px' : '1px', background: item.color } }), item.label + ' ' + item.value); })),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Rule ' + rule + ' signal profile with ' + (caWrap ? 'wrapped ring boundaries' : 'fixed empty boundaries') + ' across ' + n + ' generations. Selected generation ' + caInspectRow + ': density ' + Math.round(selectedDensity * 100) + ' percent, entropy ' + selectedEntropy.toFixed(2) + ' bits per cell, activity ' + Math.round(selectedActivity * 100) + ' percent. Mean entropy across all generations ' + caAnalysis.meanEntropy.toFixed(2) + ' bits.', style: { width: '100%', height: H + 'px', display: 'block' } },
          [0,0.5,1].map(function (level) { return h('line', { key: level, x1: px, x2: W - px, y1: y(level), y2: y(level), stroke: dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.2)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }); }),
          h('line', { x1: x(caInspectRow), x2: x(caInspectRow), y1: top, y2: H - bottom, stroke: '#fde047', strokeWidth: 1.3, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 3px rgba(253,224,71,0.8))' } }),
          h('polyline', { points: points(caAnalysis.densities), fill: 'none', stroke: '#22d3ee', strokeWidth: 2.1, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { points: points(caAnalysis.entropies), fill: 'none', stroke: '#a78bfa', strokeWidth: 1.8, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { points: points(caAnalysis.activities), fill: 'none', stroke: '#fbbf24', strokeWidth: 1.7, strokeDasharray: '4 3', vectorEffect: 'non-scaling-stroke' }),
          h('circle', { cx: x(caInspectRow), cy: y(selectedDensity), r: 3.1, fill: '#22d3ee' }),
          h('rect', { x: x(caInspectRow) - 2.7, y: y(selectedEntropy) - 2.7, width: 5.4, height: 5.4, rx: 1, fill: '#a78bfa' }),
          h('rect', { x: x(caInspectRow) - 2.4, y: y(selectedActivity) - 2.4, width: 4.8, height: 4.8, transform: 'rotate(45 ' + x(caInspectRow) + ' ' + y(selectedActivity) + ')', fill: '#fbbf24' }),
          h('text', { x: px, y: H - 3, fill: C.sub, style: { fontSize: '8px', fontWeight: 700 } }, 'gen 0'),
          h('text', { x: W - px, y: H - 3, textAnchor: 'end', fill: C.sub, style: { fontSize: '8px', fontWeight: 700 } }, 'gen ' + (n - 1))
        )
      );
    }

    function renderRulesTab() {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } },
          'A 1-D world: every cell looks at itself and its two neighbours, then a rule decides if it lives next. There are exactly 256 rules; fixed edges and wrapped-ring boundaries reveal different edge behavior. Select any result cell to trace its three parents and exact rule mapping.'),
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
          h('label', { style: { fontSize: '13px', fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: '8px' } },
            'Rule',
            h('input', { type: 'number', min: 0, max: 255, value: rule, 'aria-label': 'Wolfram rule number 0 to 255',
              onChange: function (e) { setRuleSafe(e.target.value); },
              style: { width: '74px', padding: '6px 8px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '15px', fontWeight: 800 } })),
          btn('Single seed', function () { setCaSeed('single'); }, { pressed: caSeed === 'single', key: 'singleSeed' }),
          btn('Random seed', function () { setCaSeed('random'); }, { pressed: caSeed === 'random', key: 'randomSeed' }),
          btn('Custom seed', function () { setCaSeed('custom'); }, { pressed: caSeed === 'custom', key: 'customSeed' }),
          btn(caWrap ? 'Wrap ring' : 'Fixed edges', function () { setCaWrap(function (value) { return !value; }); }, { pressed: caWrap, key: 'caBoundary', title: caWrap ? 'Join the first and last cells' : 'Cells beyond each edge stay empty' }),
          h('div', { style: { fontSize: '12px', color: C.sub } }, 'binary ', h('code', { style: { color: C.text, fontWeight: 800 } }, ('00000000' + rule.toString(2)).slice(-8)))
        ),
        caSeed === 'custom' && renderSeedEditor(),
        renderRuleTable(),
        renderCaDiagram(),
        renderCaAnalysis(),
        h('div', { style: { fontSize: '11px', color: C.sub, marginTop: '-4px', textAlign: 'center' } },
          'Rule ' + rule + ' · ' + CA_ROWS + ' generations · ' + (caWrap ? 'wrapped ring' : 'fixed edges') + ' · click any cell | arrow keys move | Page Up/Down jumps through time'),
        h('div', null,
          h('div', { style: { fontSize: '12px', color: C.sub, fontWeight: 700, marginBottom: '6px' } }, 'Try a famous rule:'),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            FAMOUS_RULES.map(function (fr) {
              var active = fr.n === rule;
              return h('button', { key: fr.n, type: 'button', onClick: function () { setRuleSafe(fr.n); },
                title: fr.blurb, 'aria-pressed': active ? 'true' : 'false',
                style: { padding: '6px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  border: '1px solid ' + (active ? C.accent : C.border), background: active ? C.accentBg : C.panel, color: C.text } },
                fr.name + ' · C' + fr.cls);
            })
          )
        ),
        (function () {
          var fr = null; for (var i = 0; i < FAMOUS_RULES.length; i++) if (FAMOUS_RULES[i].n === rule) fr = FAMOUS_RULES[i];
          if (!fr) return null;
          return h('div', { role: 'note', style: { background: C.accentBg, border: '1px solid ' + C.accent, borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: C.text, lineHeight: 1.5 } },
            h('strong', null, fr.name + ' '), fr.blurb);
        })()
      );
    }

    // ── patterns gallery ──
    function patternThumb(key) {
      var pat = LIFE_PATTERNS[key];
      var size = 7, px = 9; // thumbnail grid
      var maxR = 0, maxC = 0; pat.cells.forEach(function (rc) { maxR = Math.max(maxR, rc[0]); maxC = Math.max(maxC, rc[1]); });
      var sc = Math.min(1, (size - 1) / Math.max(1, Math.max(maxR, maxC)));
      var rects = [h('rect', { key: 'bg', x: 0, y: 0, width: size * px, height: size * px, fill: C.dead, rx: 4 })];
      pat.cells.forEach(function (rc, i) {
        var r = Math.round(rc[0] * sc), c = Math.round(rc[1] * sc);
        rects.push(h('rect', { key: i, x: c * px + 1, y: r * px + 1, width: px - 2, height: px - 2, rx: 1, fill: C.live }));
      });
      return h('svg', { viewBox: '0 0 ' + (size * px) + ' ' + (size * px), width: 56, height: 56, 'aria-hidden': 'true', style: { display: 'block' } }, rects);
    }
    function renderPatternsTab() {
      return h('div', null,
        h('p', { style: { margin: '0 0 12px', fontSize: '12px', color: C.sub, lineHeight: 1.5 } },
          'Classic Life forms. Tap one to drop it on the grid and press Play.'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' } },
          PATTERN_ORDER.map(function (key) {
            var pat = LIFE_PATTERNS[key];
            return h('button', Object.assign({ key: key, type: 'button', onClick: function () { loadPattern(key); } }, {
              style: { display: 'flex', gap: '10px', alignItems: 'center', textAlign: 'left', cursor: 'pointer',
                background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' }
            }),
              patternThumb(key),
              h('div', { style: { minWidth: 0 } },
                h('div', { style: { fontSize: '13px', fontWeight: 800, color: C.text } }, pat.name),
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.4px' } }, pat.kind),
                h('div', { style: { fontSize: '11px', color: C.sub, lineHeight: 1.4, marginTop: '2px' } }, pat.blurb)));
          })
        )
      );
    }

    // ── learn ──
    function learnCard(title, body) {
      return h('div', { key: title, style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px 14px' } },
        h('div', { style: { fontSize: '14px', fontWeight: 800, color: C.text, marginBottom: '6px' } }, title),
        h('div', { style: { fontSize: '12.5px', color: C.sub, lineHeight: 1.6 } }, body));
    }
    function renderLearnTab() {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        learnCard('What is a cellular automaton?',
          'A grid of cells that each follow one tiny rule, updating together step by step. No cell is in charge — yet simple local rules can build gliders, oscillators, and patterns that look designed. That surprise is called emergence.'),
        learnCard("Conway's Game of Life (the rule)",
          h('span', null, 'Each cell is alive or dead and looks at its 8 neighbours: ',
            h('strong', null, 'a live cell with 2 or 3 live neighbours survives'), '; ',
            h('strong', null, 'a dead cell with exactly 3 live neighbours is born'), '; everything else dies of loneliness or overcrowding. Written as ',
            h('code', { style: { color: C.text } }, 'B3/S23'), '.')),
        learnCard("Wolfram's four classes",
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            WOLFRAM_CLASSES.map(function (w) {
              return h('div', { key: w.n }, h('strong', { style: { color: C.text } }, w.name + ': '), w.desc);
            }))),
        learnCard('Life-like rules and scientific lenses',
          'Conway is one point in a larger rule space. Edit B/S notation to explore Seeds, HighLife, Day & Night, and Diamoeba. Next Forecast turns the current B/S rule into a testable prediction; Colony Scan measures spatial motion; Age Map reveals survivor longevity; Neighbor X-ray exposes the evidence behind every birth and death.'),
        learnCard('Design challenges',
          'Build a still life, discover an oscillator, engineer total extinction, or search for a tiny Methuselah. The starting arrangement is your independent variable and population over time is your evidence.'),
        learnCard('The edge of chaos',
          'Class 4 rules sit between boring order (Class 1–2) and pure chaos (Class 3). That narrow band is where moving structures can carry information — which is why both Rule 110 and Conway\'s Life are powerful enough to compute anything a computer can.'),
        learnCard('Where this shows up for real',
          'Modelling forest fires and traffic jams, generating textures and terrain in games, error-correcting codes, simulating crystal growth and fluid flow, and as a gentle on-ramp to the big idea that complex behaviour need not have a complex cause.')
      );
    }

    // ════════════════════ SHELL ════════════════════
    var TABS = [
      { id: 'life', label: 'Life Worlds', icon: '🦠' },
      { id: 'rules', label: 'Rules', icon: '📜' },
      { id: 'patterns', label: 'Patterns', icon: '✨' },
      { id: 'learn', label: 'Learn', icon: '📖' }
    ];
    var body = tab === 'life' ? renderLifeTab()
      : tab === 'rules' ? renderRulesTab()
      : tab === 'patterns' ? renderPatternsTab()
      : renderLearnTab();
    var cellularRoutes = [
      { id: 'life', label: 'Life worlds', detail: 'Draw, analyze, challenge.' },
      { id: 'rules', label: 'Rule lab', detail: 'Test 1-D rules.' },
      { id: 'patterns', label: 'Pattern shelf', detail: 'Load classic forms.' },
      { id: 'learn', label: 'Field notes', detail: 'Connect the ideas.' }
    ];
    function focusMetric(label, value) {
      return h('div', { key: label, style: { minWidth: 0, background: C.bg, border: '1px solid ' + C.border, borderRadius: '11px', padding: '9px 10px' } },
        h('div', { style: { fontSize: '10px', fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '0.04em' } }, label),
        h('div', { style: { marginTop: '3px', fontSize: '14px', fontWeight: 900, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, value));
    }

    return h('div', { 'data-cellularlab-tool': 'true', style: { display: 'flex', flexDirection: 'column', gap: '14px', color: C.text, fontFamily: 'inherit' } },
      // header
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
        (ctx.setStemLabTool ? h('button', { type: 'button', onClick: function () { ctx.setStemLabTool(''); }, 'aria-label': 'Back to STEM Lab',
          style: { padding: '6px 10px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, cursor: 'pointer', fontSize: '12px', fontWeight: 700 } }, '← Back') : null),
        h('div', { style: { fontSize: '22px' }, 'aria-hidden': 'true' }, '🧫'),
        h('div', null,
          h('div', { style: { fontSize: '17px', fontWeight: 800 } }, 'Cellular Automaton Lab'),
          h('div', { style: { fontSize: '11px', color: C.sub } }, 'Simple rules · surprising worlds'))
      ),
      h('section', { 'data-cellularlab-focus-panel': 'true', 'aria-label': 'Cellular Automaton Lab focus panel',
        style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(220px, 0.75fr)', gap: '12px',
          background: C.panel, border: '1px solid ' + C.border, borderRadius: '14px', padding: '12px',
          boxShadow: dark ? '0 18px 42px rgba(0,0,0,0.22)' : '0 16px 36px rgba(15,23,42,0.08)' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 } },
          h('div', null,
            h('div', { style: { fontSize: '10px', fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Start here'),
            h('div', { style: { marginTop: '2px', fontSize: '16px', fontWeight: 900, color: C.text } }, 'Pick the world you want to investigate')),
          h('div', { 'data-cellularlab-route-grid': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px' } },
            cellularRoutes.map(function (route) {
              var active = tab === route.id;
              return h('button', { key: route.id, type: 'button', className: 'cellularlab-route-button',
                'aria-pressed': active ? 'true' : 'false',
                onClick: function () { setTab(route.id); announce(route.label + ' selected.'); },
                style: { minHeight: '76px', textAlign: 'left', cursor: 'pointer', borderRadius: '12px', padding: '10px',
                  border: '1px solid ' + (active ? C.accent : C.border), background: active ? C.accentBg : C.bg,
                  color: C.text, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' } },
                h('span', { style: { fontSize: '12px', fontWeight: 900 } }, route.label),
                h('span', { style: { fontSize: '11px', lineHeight: 1.35, color: active ? C.text : C.sub } }, route.detail));
            }))
        ),
        h('div', { 'data-cellularlab-status-grid': 'true', style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', alignContent: 'start' } },
          focusMetric('Mode', running ? 'Running' : 'Paused'),
          focusMetric('Cells', pop),
          focusMetric('Generation', gen),
          focusMetric('Rule', tab === 'life' ? ('B' + birthRule + '/S' + survivalRule) : ('R' + rule)))
      ),
      // tabs
      h('div', { role: 'tablist', 'aria-label': 'Cellular Automaton Lab sections', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid ' + C.border, paddingBottom: '8px' } },
        TABS.map(function (tb) {
          var active = tab === tb.id;
          return h('button', {
            key: tb.id, type: 'button', className: 'cellularlab-tab', role: 'tab',
            id: 'cell-tab-' + tb.id, 'aria-controls': 'cell-panel', 'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onClick: function () { setTab(tb.id); announce(tb.label + ' tab'); },
            style: { padding: '7px 13px', borderRadius: '9px 9px 0 0', cursor: 'pointer', fontSize: '13px', fontWeight: 800,
              borderTop: '1px solid ' + (active ? C.accent : 'transparent'), borderRight: '1px solid ' + (active ? C.accent : 'transparent'), borderBottom: 'none', borderLeft: '1px solid ' + (active ? C.accent : 'transparent'),
              background: active ? C.accentBg : 'transparent', color: active ? C.accent : C.sub }
          }, h('span', { 'aria-hidden': 'true' }, tb.icon + ' '), tb.label);
        })
      ),
      h('div', { id: 'cell-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'cell-tab-' + tab }, body),
      // visually-hidden SR live region (component-owned; see announce())
      h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 } }, liveMsg)
    );
  }

  // build the elementary-CA space-time rows (pure; used in useMemo + would be
  // SSR-safe). Seed: single centre cell, or a deterministic pseudo-random row.
  function buildCaRows(rule, seed, rows, cols, wrap) {
    var bits = ruleToBits(rule);
    var first = [];
    if (Array.isArray(seed)) { for (var ci = 0; ci < cols; ci++) first.push(seed[ci] ? 1 : 0); }
    else for (var c = 0; c < cols; c++) {
      if (seed === 'single') first.push(c === Math.floor(cols / 2) ? 1 : 0);
      else first.push(pseudo(c * 7.13 + rule * 0.7) < 0.5 ? 1 : 0);
    }
    var out = [first];
    for (var r = 1; r < rows; r++) out.push(stepRuleRow(out[r - 1], bits, !!wrap));
    return out;
  }
  function caCellCause(rows, rowIndex, colIndex, wrap) {
    rows = rows || [];
    if (!rows.length || rowIndex < 0 || rowIndex >= rows.length || colIndex < 0 || colIndex >= rows[rowIndex].length) return null;
    var cause = { row: rowIndex, col: colIndex, output: rows[rowIndex][colIndex] ? 1 : 0, index: null, pattern: null, parents: [] };
    if (rowIndex === 0) return cause;
    var parentRow = rows[rowIndex - 1], cols = parentRow.length;
    [-1,0,1].forEach(function (offset) {
      var rawCol = colIndex + offset, actualCol = rawCol;
      if (wrap) actualCol = (rawCol + cols) % cols;
      else if (rawCol < 0 || rawCol >= cols) actualCol = null;
      cause.parents.push({ col: actualCol, value: actualCol == null ? 0 : (parentRow[actualCol] ? 1 : 0), outside: actualCol == null, wrapped: !!wrap && actualCol !== rawCol });
    });
    cause.index = (cause.parents[0].value << 2) | (cause.parents[1].value << 1) | cause.parents[2].value;
    cause.pattern = '' + cause.parents[0].value + cause.parents[1].value + cause.parents[2].value;
    return cause;
  }
  function analyzeCaRows(rows, wrap) {
    var densities = [], entropies = [], activities = [], neighborhoodCounts = [0,0,0,0,0,0,0,0];
    (rows || []).forEach(function (row, rowIndex) {
      var live = 0, changes = 0; for (var i = 0; i < row.length; i++) { live += row[i]; if (i > 0 && row[i] !== row[i - 1]) changes++; }
      var p = row.length ? live / row.length : 0;
      densities.push(p);
      entropies.push(p <= 0 || p >= 1 ? 0 : -(p * Math.log(p) / Math.log(2) + (1 - p) * Math.log(1 - p) / Math.log(2)));
      activities.push(row.length > 1 ? changes / (row.length - 1) : 0);
      if (rowIndex < rows.length - 1) for (var c = 0; c < row.length; c++) {
        var left = wrap ? row[(c - 1 + row.length) % row.length] : (c > 0 ? row[c - 1] : 0);
        var right = wrap ? row[(c + 1) % row.length] : (c < row.length - 1 ? row[c + 1] : 0);
        neighborhoodCounts[(left << 2) | (row[c] << 1) | right]++;
      }
    });
    var mean = function (values) { return values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : 0; };
    return { densities: densities, entropies: entropies, activities: activities, neighborhoodCounts: neighborhoodCounts, neighborhoodTotal: neighborhoodCounts.reduce(function (sum, count) { return sum + count; }, 0), finalDensity: densities.length ? densities[densities.length - 1] : 0, meanDensity: mean(densities), meanEntropy: mean(entropies), meanActivity: mean(activities) };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  window.__alloCellularPure = { emptyGrid: emptyGrid, randomGrid: randomGrid, countPop: countPop, populationBounds: populationBounds, shapeFingerprint: shapeFingerprint, detectDynamics: detectDynamics, neighborCount: neighborCount, stepLife: stepLife, stepLifeDetailed: stepLifeDetailed, parseLifeRule: parseLifeRule, gridSignature: gridSignature, stampPattern: stampPattern, ruleToBits: ruleToBits, bitsToRule: bitsToRule, stepRuleRow: stepRuleRow, buildCaRows: buildCaRows, caCellCause: caCellCause, analyzeCaRows: analyzeCaRows, patterns: LIFE_PATTERNS };

  window.StemLab.registerTool('cellularLab', {
    icon: '🧫',
    label: 'Cellular Automaton Lab',
    desc: "Explore 2-D Life-like worlds with custom B/S rules, predictive and scientific lenses, challenges, 17 classic patterns, dynamic grids, export, and population evidence - plus all 256 elementary 1-D Wolfram rules.",
    color: 'emerald',
    category: 'math',
    questHooks: [
      { id: 'cell_draw', label: 'Draw cells on the grid', icon: '✏️',
        check: function (d) { return !!(d && d.drew); },
        progress: function (d) { return (d && d.drew) ? '✓' : 'pending'; } },
      { id: 'cell_run', label: 'Run Life for 50+ generations', icon: '▶️',
        check: function (d) { return !!(d && d.ranLong); },
        progress: function (d) { var g = (d && d.maxGen) || 0; return g >= 50 ? '✓' : ('best: gen ' + g); } },
      { id: 'cell_stamp', label: 'Stamp a pattern from the library', icon: '✨',
        check: function (d) { return !!(d && d.stamped); },
        progress: function (d) { return (d && d.stamped) ? '✓' : 'pending'; } },
      { id: 'cell_gun', label: 'Load the Gosper glider gun', icon: '🔫',
        check: function (d) { return !!(d && d.sawGun); },
        progress: function (d) { return (d && d.sawGun) ? '✓' : 'pending'; } },
      { id: 'cell_rule', label: 'Explore an elementary rule', icon: '📜',
        check: function (d) { return !!(d && d.exploredRule); },
        progress: function (d) { return (d && d.exploredRule) ? '✓' : 'pending'; } },
      { id: 'cell_challenge', label: 'Complete a pattern design challenge', icon: 'target',
        check: function (d) { return !!(d && d.challengeCompleted); },
        progress: function (d) { return (d && d.challengeCompleted) ? 'complete' : 'pending'; } },      { id: 'cell_110', label: 'View Rule 110 (Turing-complete)', icon: '🧠',
        check: function (d) { return !!(d && d.saw110); },
        progress: function (d) { return (d && d.saw110) ? '✓' : 'pending'; } }
    ],
    render: function (ctx) {
      return ctx.React.createElement(CellularLab, { ctx: ctx });
    }
  });
})();
