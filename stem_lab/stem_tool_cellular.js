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
  var PATTERN_JOURNEY_CACHE = {};

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
    var sPatternFocus = useState('glider'); var patternFocusKey = sPatternFocus[0], setPatternFocusKey = sPatternFocus[1];

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
    var sPhaseCursor = useState(null); var phaseCursor = sPhaseCursor[0], setPhaseCursor = sPhaseCursor[1];
    var sForecastHorizon = useState(1); var forecastHorizon = sForecastHorizon[0], setForecastHorizon = sForecastHorizon[1];
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
    var caSensitivity = caRuleSensitivityProfile(bits, caAnalysis.neighborhoodCounts);
    var caCause = caCellCause(caRows, caInspectRow, caInspectCol, caWrap);
    var caInfluence = caCounterfactualInfluence(bits, caCause);
    var caSensitivityRow = analyzeCaSensitivityRow(caRows, caInspectRow, bits, caWrap);
    var caCone = caCausalCone(caRows, caInspectRow, caInspectCol, caWrap, 6);
    var caTemporalChange = caTemporalChangeCells(caRows, caInspectRow);
    var caSelectedTransition = caCellTransition(caRows, caInspectRow, caInspectCol);
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
    function resetTimeline() { historyRef.current = []; previousGridRef.current = null; transitionRef.current = { born: 0, survived: 0, died: 0 }; transitionHistoryRef.current = []; setPhaseCursor(null); }
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
      genRef.current = nextGen; setPhaseCursor(null); setGrid(next.grid); setGen(nextGen);
      if (speakOnExtinction && countPop(next.grid) === 0) announce('All cells died.');
    }
    function captureChallengeStart() { if (challenge && challengeStatus === 'active' && !challengeInitialRef.current) challengeInitialRef.current = { signature: gridSignature(grid), population: countPop(grid) }; }
    function stepOnce() { captureChallengeStart(); advanceOne(true); }
    function restoreLifeSnapshot(snapshot, message) {
      if (!snapshot) return;
      setRunning(false); rewindingRef.current = true; gridRef.current = snapshot.grid; agesRef.current = snapshot.ages; genRef.current = snapshot.gen;
      previousGridRef.current = snapshot.previousGrid; transitionRef.current = snapshot.transition; transitionHistoryRef.current = snapshot.transitionHistory;
      popHistRef.current = snapshot.popHist; maxPopRef.current = snapshot.maxPop;
      setGrid(snapshot.grid); setGen(snapshot.gen); setPopHist(snapshot.popHist); setMaxPop(snapshot.maxPop);
      setPhaseCursor(null); announce(message || ('Rewound to generation ' + snapshot.gen + '.'));
    }
    function rewindOne() {
      var snapshot = historyRef.current.pop(); if (!snapshot) return;
      restoreLifeSnapshot(snapshot);
    }
    function rewindToGeneration(targetGen) {
      var target = parseInt(targetGen, 10); if (!isFinite(target) || target >= genRef.current) return;
      var index = -1; for (var i = historyRef.current.length - 1; i >= 0; i--) if (historyRef.current[i].gen === target) { index = i; break; }
      if (index < 0) { announce('Generation ' + target + ' is outside the retained rewind history.'); return; }
      var snapshot = historyRef.current[index]; historyRef.current = historyRef.current.slice(0, index);
      restoreLifeSnapshot(snapshot, 'Phase portrait rewound to generation ' + target + '.');
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
    var forecastSeries = vizMode === 'forecast' ? projectLifeFuture(grid, agesRef.current, 8, wrap, birthRule, survivalRule) : [];
    var forecastPreview = forecastSeries[forecastHorizon - 1] || null;
    var forecastComparison = forecastPreview ? compareLifeStates(grid, forecastPreview.grid) : null;
    var forecastResidency = forecastSeries.length ? analyzeLifeForecastResidency(forecastSeries, forecastHorizon) : null;
    var forecastMotion = forecastSeries.length ? analyzeLifeForecastMotion(grid, forecastSeries, forecastHorizon, wrap) : null;

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
        var n = neighborCount(grid, r, c, wrap), alive = !!grid[r][c], futureAlive = !!(forecastPreview && forecastPreview.grid[r][c]), residency = forecastResidency ? forecastResidency.grid[r][c] : 0;
        if (vizMode === 'forecast' && residency) {
          var residencyRatio = residency / forecastHorizon;
          rects.push(h('rect', { key: 'forecastResidency' + r + '_' + c, 'data-life-forecast-residency': String(residency), x: c * PX + 0.18, y: r * PX + 0.18, width: Math.max(1, PX - 0.36), height: Math.max(1, PX - 0.36), rx: PX > 7 ? 2.4 : 0.8, fill: 'rgba(253,224,71,' + (0.025 + residencyRatio * 0.095).toFixed(3) + ')', stroke: 'rgba(253,224,71,' + (0.16 + residencyRatio * 0.5).toFixed(3) + ')', strokeWidth: Math.max(0.45, PX / 15), style: { filter: residencyRatio > 0.7 ? 'drop-shadow(0 0 ' + Math.max(1, PX / 4) + 'px rgba(253,224,71,0.5))' : 'none', pointerEvents: 'none' } }));
        }
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
      if (vizMode === 'forecast' && forecastMotion && forecastMotion.points.length) {
        var motionPath = '', motionPrevious = null;
        forecastMotion.points.forEach(function (point) {
          var motionX = (point.centerC + 0.5) * PX, motionY = (point.centerR + 0.5) * PX;
          var motionJump = motionPrevious && wrap && (Math.abs(point.centerR - motionPrevious.centerR) > ROWS / 3 || Math.abs(point.centerC - motionPrevious.centerC) > COLS / 3);
          motionPath += (!motionPrevious || motionJump ? 'M' : 'L') + motionX.toFixed(2) + ' ' + motionY.toFixed(2);
          motionPrevious = point;
        });
        if (forecastMotion.points.length > 1) rects.push(h('path', { key: 'forecastMotionTrail', 'data-life-forecast-motion': String(forecastHorizon), d: motionPath, fill: 'none', stroke: '#fde047', strokeWidth: Math.max(1.1, PX / 6), strokeDasharray: Math.max(2, PX / 2) + ' ' + Math.max(1.5, PX / 3), strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.82))', pointerEvents: 'none' } }));
        if (forecastMotion.selectedBounds) {
          var futureBounds = forecastMotion.selectedBounds, futureBoxX = futureBounds.minC * PX + 0.4, futureBoxY = futureBounds.minR * PX + 0.4, futureBoxW = futureBounds.width * PX - 0.8, futureBoxH = futureBounds.height * PX - 0.8;
          rects.push(h('rect', { key: 'forecastFootprint', 'data-life-forecast-footprint': String(forecastHorizon), 'data-width': String(futureBounds.width), 'data-height': String(futureBounds.height), 'data-density': futureBounds.density.toFixed(4), x: futureBoxX, y: futureBoxY, width: futureBoxW, height: futureBoxH, rx: Math.max(2, PX / 2), fill: 'rgba(253,224,71,0.025)', stroke: '#fde047', strokeWidth: Math.max(1, PX / 8), strokeDasharray: Math.max(3, PX / 1.6) + ' ' + Math.max(2, PX / 2.4), vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.62))', pointerEvents: 'none' } }));
          if (PX >= 7) rects.push(h('text', { key: 'forecastFootprintLabel', x: Math.min(W - 4, futureBoxX + 3), y: Math.max(8, futureBoxY - 3), fill: '#fef08a', style: { fontSize: Math.max(6, PX * 0.55) + 'px', fontWeight: 900, pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px #020617)' } }, '+' + forecastHorizon + ' | ' + futureBounds.width + 'x' + futureBounds.height));
        }
        forecastMotion.points.forEach(function (point) {
          if (!point.step) return;
          var selectedMotion = point.step === forecastHorizon, motionX = (point.centerC + 0.5) * PX, motionY = (point.centerR + 0.5) * PX;
          rects.push(h('circle', { key: 'forecastMotion' + point.step, 'data-life-forecast-motion-point': String(point.step), 'data-selected': selectedMotion ? 'true' : 'false', 'aria-hidden': 'true', cx: motionX, cy: motionY, r: selectedMotion ? Math.max(2.8, PX * 0.42) : Math.max(1.2, PX * 0.2), fill: selectedMotion ? '#fde047' : 'rgba(253,224,71,0.58)', stroke: selectedMotion ? '#ffffff' : '#fde047', strokeWidth: selectedMotion ? 1.15 : 0.55, vectorEffect: 'non-scaling-stroke', onMouseDown: function (e) { if (e.stopPropagation) e.stopPropagation(); }, onTouchStart: function (e) { if (e.stopPropagation) e.stopPropagation(); setForecastHorizon(point.step); }, onClick: function (e) { if (e.stopPropagation) e.stopPropagation(); setForecastHorizon(point.step); }, style: { filter: selectedMotion ? 'drop-shadow(0 0 5px rgba(253,224,71,0.95))' : 'none', pointerEvents: 'auto', cursor: 'pointer' } }));
        });
      }      if (vizMode === 'field' && scan) {
        var bx = scan.minC * PX + 0.45, by = scan.minR * PX + 0.45, bw = scan.width * PX - 0.9, bh = scan.height * PX - 0.9, cx = (scan.centerC + 0.5) * PX, cy = (scan.centerR + 0.5) * PX, arm = Math.max(4, PX * 0.8);
        rects.push(h('rect', { key: 'scanBounds', x: bx, y: by, width: bw, height: bh, rx: Math.max(2, PX / 2), fill: 'rgba(34,211,238,0.04)', stroke: '#22d3ee', strokeWidth: Math.max(1.1, PX / 7), strokeDasharray: Math.max(3, PX / 2) + ' ' + Math.max(2, PX / 3), vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.75))', pointerEvents: 'none' } }));
        rects.push(h('circle', { key: 'scanCenterOuter', cx: cx, cy: cy, r: Math.max(3.5, PX * 0.55), fill: 'rgba(251,191,36,0.12)', stroke: '#fbbf24', strokeWidth: Math.max(1, PX / 8), vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 5px rgba(251,191,36,0.9))', pointerEvents: 'none' } }));
        rects.push(h('path', { key: 'scanCenterCross', d: 'M' + (cx - arm) + ' ' + cy + 'H' + (cx + arm) + 'M' + cx + ' ' + (cy - arm) + 'V' + (cy + arm), stroke: '#fde68a', strokeWidth: Math.max(0.9, PX / 9), vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }));
        if (PX >= 7) rects.push(h('text', { key: 'scanLabel', x: Math.min(W - 4, bx + 3), y: Math.max(8, by - 3), fill: '#a5f3fc', style: { fontSize: Math.max(6, PX * 0.55) + 'px', fontWeight: 900, pointerEvents: 'none', filter: 'drop-shadow(0 1px 2px #020617)' } }, scan.width + 'x' + scan.height + ' · ' + Math.round(scan.density * 100) + '%'));
      }
      if (pop === 0) rects.push(h('text', { key: 'empty', x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: Math.max(9, Math.min(14, W / 30)) + 'px', fontStyle: 'italic' } }, 'Draw cells, choose a pattern, or make a random soup'));
      rects.push(h('rect', { key: 'cursor', x: cursor[1] * PX, y: cursor[0] * PX, width: PX, height: PX, fill: 'none', stroke: C.cursor, strokeWidth: Math.max(1.4, PX / 7), rx: 2, style: { pointerEvents: 'none', filter: 'drop-shadow(0 0 4px ' + C.cursor + ')' } }));
      return h('svg', { ref: gridSvgRef, className: 'cellularlab-svg', viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-roledescription': 'editable cellular automaton grid', 'aria-label': 'Cellular automaton grid, ' + ROWS + ' by ' + COLS + ', ' + pop + ' alive, generation ' + gen + ', rule B' + birthRule + ' slash S' + survivalRule + ', dynamics ' + dynamicsScan.label + ', ' + dynamicsScan.detail + (vizMode === 'forecast' && forecastPreview && forecastComparison ? ', future telescope at plus ' + forecastHorizon + ' generations, ' + forecastComparison.appeared + ' cells appear, ' + forecastComparison.retained + ' current cells remain, ' + forecastComparison.gone + ' current cells are gone, projected population ' + forecastComparison.population + ', ' + forecastResidency.activeCells + ' cells appear somewhere along the future path and ' + forecastResidency.persistentCells + ' persist throughout the inspected horizon' + (forecastMotion.distance == null ? ', no center of mass exists at the inspected horizon' : ', projected center-of-mass drift ' + forecastMotion.distance.toFixed(2) + ' cells, row shift ' + forecastMotion.deltaRow.toFixed(2) + ', column shift ' + forecastMotion.deltaCol.toFixed(2) + (forecastMotion.selectedBounds ? ', future footprint ' + forecastMotion.selectedBounds.width + ' by ' + forecastMotion.selectedBounds.height + ', density ' + Math.round(forecastMotion.selectedBounds.density * 100) + ' percent' : '')) : '') + (vizMode === 'field' && scan ? ', colony footprint ' + scan.width + ' by ' + scan.height + ', density ' + Math.round(scan.density * 100) + ' percent, center row ' + (scan.centerR + 1).toFixed(1) + ', column ' + (scan.centerC + 1).toFixed(1) : '') + (vizMode === 'change' && gen > 0 ? ', last transition ' + transitionRef.current.born + ' births, ' + transitionRef.current.survived + ' survivors, ' + transitionRef.current.died + ' deaths' : '') + '. Arrow keys move the cursor and space toggles a cell.', tabIndex: 0, onKeyDown: onGridKeyDown, onMouseDown: onGridPointerDown, onMouseMove: onGridPointerMove, onMouseUp: onGridPointerUp, onMouseLeave: onGridPointerUp, onTouchStart: function (e) { if (e.preventDefault) e.preventDefault(); onGridPointerDown(e); }, onTouchMove: function (e) { if (e.preventDefault) e.preventDefault(); onGridPointerMove(e); }, onTouchEnd: onGridPointerUp, style: { maxWidth: '620px', width: '100%', height: 'auto', borderRadius: '14px', border: '1px solid rgba(52,211,153,0.35)', touchAction: 'none', display: 'block', background: '#020617', cursor: 'crosshair', boxShadow: '0 22px 60px rgba(2,6,23,0.42), inset 0 0 42px rgba(16,185,129,0.08)' } }, rects);
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
    function lifePhaseChart() {
      var phase = analyzeLifePhase(transitionHistoryRef.current, 100), points = phase.points;
      if (points.length < 2) return null;
      var future = forecastSeries;
      var maxPopulation = phase.maxPopulation, maxTurnover = phase.maxTurnover;
      future.forEach(function (point) { maxPopulation = Math.max(maxPopulation, point.population); maxTurnover = Math.max(maxTurnover, point.turnover); });
      var W = 240, H = 112, left = 27, right = 8, top = 8, bottom = 19;
      var x = function (value) { return left + value / maxPopulation * (W - left - right); };
      var y = function (value) { return top + (1 - value / maxTurnover) * (H - top - bottom); };
      var trail = points.map(function (point) { return x(point.population).toFixed(1) + ',' + y(point.turnover).toFixed(1); }).join(' ');
      var latest = phase.latest, futureTrail = future.length ? [latest].concat(future).map(function (point) { return x(point.population).toFixed(1) + ',' + y(point.turnover).toFixed(1); }).join(' ') : '';
      var futureEnd = future.length ? future[future.length - 1] : null, futureSelected = future[forecastHorizon - 1] || null, selectedIndex = phaseCursor == null ? points.length - 1 : Math.max(0, Math.min(points.length - 1, phaseCursor)), selected = points[selectedIndex];
      function onPhasePointer(e) {
        var svg = e.currentTarget, rect = svg && svg.getBoundingClientRect ? svg.getBoundingClientRect() : null;
        if (!rect || !rect.width || !rect.height) return;
        var px = (e.clientX - rect.left) / rect.width * W, py = (e.clientY - rect.top) / rect.height * H;
        var nearest = points.length - 1, best = Infinity;
        for (var i = points.length - 1; i >= 0; i--) {
          var dx = x(points[i].population) - px, dy = y(points[i].turnover) - py, distance = dx * dx + dy * dy;
          if (distance < best) { best = distance; nearest = i; }
        }
        setPhaseCursor(nearest);
        if (points[nearest].gen < genRef.current) rewindToGeneration(points[nearest].gen);
        else announce('Generation ' + points[nearest].gen + ' is the current state.');
      }
      function onPhaseKeyDown(e) {
        var next = selectedIndex, handled = true;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next--;
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next++;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = points.length - 1;
        else if (e.key === 'Enter' || e.key === ' ') { if (e.preventDefault) e.preventDefault(); rewindToGeneration(selected.gen); return; }
        else handled = false;
        if (handled) { if (e.preventDefault) e.preventDefault(); setPhaseCursor(Math.max(0, Math.min(points.length - 1, next))); }
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, padding: '8px 10px', borderRadius: '13px', background: dark ? 'rgba(23,19,43,0.74)' : 'rgba(250,245,255,0.92)', border: '1px solid ' + (dark ? '#7c3aed' : '#a78bfa') } },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
          h('span', { style: { fontSize: '9px', color: dark ? '#c4b5fd' : '#6d28d9', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Phase portrait'),
          h('span', { role: 'status', 'aria-live': 'polite', style: { fontSize: '10px', color: C.text, fontWeight: 900 } }, 'Inspect gen ' + selected.gen + ' | Population ' + selected.population + ' | Turnover ' + selected.turnover),
          futureSelected && h('span', { 'data-life-forecast-selection': String(futureSelected.step), style: { fontSize: '9px', color: dark ? '#fef08a' : '#854d0e', fontWeight: 900 } }, 'Inspect +' + futureSelected.step + ' -> P' + futureSelected.population + ' / T' + futureSelected.turnover),
          futureEnd && h('span', { 'data-life-forecast-endpoint': String(futureEnd.step), style: { fontSize: '9px', color: dark ? '#fde68a' : '#92400e', fontWeight: 900 } }, 'Ghost +' + futureEnd.step + ' -> P' + futureEnd.population + ' / T' + futureEnd.turnover),
          h('span', { style: { marginLeft: 'auto', fontSize: '9px', color: C.sub, fontWeight: 800 } }, points.length + ' observed' + (future.length ? ' | ' + future.length + ' projected' : ''))
        ),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'slider', tabIndex: 0, 'data-life-phase-portrait': 'true', 'data-life-forecast-count': String(future.length), 'aria-label': 'Life phase-space time machine. Click a trajectory point to rewind. Use arrow keys to inspect retained generations and Enter to rewind.' + (futureEnd ? ' Dashed gold ghost orbit projects ' + future.length + ' uncommitted steps, ending at population ' + futureEnd.population + ' and turnover ' + futureEnd.turnover + '.' : '') + (futureSelected ? ' The future telescope is inspecting step ' + futureSelected.step + ', population ' + futureSelected.population + ', turnover ' + futureSelected.turnover + '.' : ''), 'aria-orientation': 'horizontal', 'aria-valuemin': 0, 'aria-valuemax': points.length - 1, 'aria-valuenow': selectedIndex, 'aria-valuetext': 'Generation ' + selected.gen + ', population ' + selected.population + ', turnover ' + selected.turnover + '. Latest generation ' + latest.gen + '.', onClick: onPhasePointer, onKeyDown: onPhaseKeyDown, style: { width: '100%', height: H + 'px', display: 'block', cursor: 'crosshair' } },
          [0.25,0.5,0.75].map(function (level) { return h('g', { key: level }, h('line', { x1: x(maxPopulation * level), x2: x(maxPopulation * level), y1: top, y2: H - bottom, stroke: dark ? 'rgba(196,181,253,0.12)' : 'rgba(109,40,217,0.12)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }), h('line', { x1: left, x2: W - right, y1: y(maxTurnover * level), y2: y(maxTurnover * level), stroke: dark ? 'rgba(196,181,253,0.12)' : 'rgba(109,40,217,0.12)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' })); }),
          h('line', { x1: left, x2: W - right, y1: H - bottom, y2: H - bottom, stroke: C.sub, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }),
          h('line', { x1: left, x2: left, y1: top, y2: H - bottom, stroke: C.sub, strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { points: trail, fill: 'none', stroke: '#a78bfa', strokeWidth: 1.8, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 3px rgba(167,139,250,0.65))', pointerEvents: 'none' } }),
          points.map(function (point, index) { var recency = (index + 1) / points.length; return h('circle', { key: point.gen + '_' + index, 'data-life-phase-point': String(point.gen), cx: x(point.population), cy: y(point.turnover), r: 1.2 + recency * 1.25, fill: '#a78bfa', opacity: 0.18 + recency * 0.62, style: { pointerEvents: 'none' } }); }),
          futureTrail && h('polyline', { 'data-life-forecast-orbit': 'true', points: futureTrail, fill: 'none', stroke: '#fde047', strokeWidth: 1.8, strokeDasharray: '4 3', vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.75))', pointerEvents: 'none' } }),
          future.map(function (point) { var inspected = point.step === forecastHorizon, size = inspected ? 3.5 : 2.1; return h('rect', { key: 'future' + point.step, 'data-life-forecast-step': String(point.step), 'data-population': String(point.population), 'data-turnover': String(point.turnover), 'data-selected': inspected ? 'true' : 'false', 'aria-hidden': 'true', x: x(point.population) - size, y: y(point.turnover) - size, width: size * 2, height: size * 2, transform: 'rotate(45 ' + x(point.population) + ' ' + y(point.turnover) + ')', fill: inspected || point.step === future.length ? '#fde047' : 'rgba(253,224,71,0.62)', stroke: inspected ? '#ffffff' : '#fde047', strokeWidth: inspected ? 1.25 : 0.7, vectorEffect: 'non-scaling-stroke', onClick: function (e) { if (e.stopPropagation) e.stopPropagation(); setForecastHorizon(point.step); }, style: { filter: inspected ? 'drop-shadow(0 0 5px rgba(253,224,71,0.95))' : 'none', pointerEvents: 'auto', cursor: 'pointer' } }); }),
          h('circle', { cx: x(latest.population), cy: y(latest.turnover), r: 6.2, fill: 'rgba(253,224,71,0.1)', stroke: '#fde047', strokeWidth: 1.2, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 5px rgba(253,224,71,0.85))', pointerEvents: 'none' } }),
          h('circle', { 'data-life-phase-latest': String(latest.gen), cx: x(latest.population), cy: y(latest.turnover), r: 2.5, fill: '#fde047', style: { pointerEvents: 'none' } }),
          h('circle', { 'data-life-phase-cursor': String(selected.gen), cx: x(selected.population), cy: y(selected.turnover), r: 8.2, fill: 'none', stroke: C.text, strokeWidth: 1.25, strokeDasharray: selectedIndex === points.length - 1 ? undefined : '3 2', vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(248,250,252,0.75))', pointerEvents: 'none' } }),
          h('text', { x: W - right, y: H - 4, textAnchor: 'end', fill: C.sub, fontSize: 8, fontWeight: 800, style: { pointerEvents: 'none' } }, 'population'),
          h('text', { x: 8, y: top, transform: 'rotate(-90 8 ' + top + ')', textAnchor: 'end', fill: C.sub, fontSize: 8, fontWeight: 800, style: { pointerEvents: 'none' } }, 'turnover')
        ),
        h('div', { style: { color: C.sub, fontSize: '9px', fontWeight: 800, textAlign: 'center' } }, future.length ? 'Violet = observed | click a gold diamond to inspect | Apply advances one step' : 'Click a point to rewind | arrows inspect time | Enter rewinds selected generation')
      );
    }    function renderLifeTab() {
      var spatialScan = populationBounds(grid), dynamics = detectDynamics(grid, gen, transitionHistoryRef.current);
      var dynamicsColor = dynamics.kind === 'stable' ? '#4ade80' : dynamics.kind === 'oscillator' ? '#c4b5fd' : dynamics.kind === 'spaceship' ? '#fbbf24' : dynamics.kind === 'extinct' ? '#fb7185' : '#67e8f9';
      var dynamicsIcon = dynamics.kind === 'stable' ? '◆' : dynamics.kind === 'oscillator' ? '↻' : dynamics.kind === 'spaceship' ? '↗' : dynamics.kind === 'extinct' ? '○' : dynamics.kind === 'ready' ? '◇' : '…';
      var rulePresets = [{ name: 'Conway', b: '3', s: '23' }, { name: 'Seeds', b: '2', s: '' }, { name: 'HighLife', b: '36', s: '23' }, { name: 'Day & Night', b: '3678', s: '34678' }, { name: 'Diamoeba', b: '35678', s: '5678' }];
      var challenges = [{ id: 'still', name: 'Still Life', note: 'Stay unchanged after one step.' }, { id: 'oscillator', name: 'Oscillator', note: 'Return to the starting pattern.' }, { id: 'extinction', name: 'Extinction', note: 'Design a pattern that dies out.' }, { id: 'methuselah', name: 'Methuselah', note: '<=5 cells survive 50 generations.' }, { id: 'maxpop', name: 'Population Boom', note: 'Exactly 5 cells; maximize the peak by gen 50.' }];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, statChip('Generation', gen, '#10b981'), statChip('Population', pop, '#22d3ee'), statChip('Peak', maxPop, '#f59e0b'), statChip('Rule', 'B' + birthRule + '/S' + survivalRule, '#a78bfa'), h('div', { style: { flex: 1 } }), h('span', { role: 'status', style: { padding: '6px 10px', borderRadius: '999px', background: running ? '#064e3b' : C.bg, color: running ? '#a7f3d0' : C.sub, border: '1px solid ' + (running ? '#10b981' : C.border), fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, running ? 'Running' : 'Paused')),
        transitionHistoryRef.current.length >= 2 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', alignItems: 'stretch' } }, populationChart(), lifePhaseChart()),
        gen > 0 && h('div', { role: 'status', 'aria-label': 'Last transition: ' + transitionRef.current.born + ' births, ' + transitionRef.current.survived + ' survivors, and ' + transitionRef.current.died + ' deaths.', style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 11px', borderRadius: '12px', background: dark ? 'linear-gradient(90deg, rgba(20,83,45,0.5), rgba(8,47,73,0.5), rgba(76,5,25,0.45))' : 'linear-gradient(90deg, #f0fdf4, #ecfeff, #fff1f2)', border: '1px solid ' + C.border, fontSize: '11px', fontWeight: 900 } }, h('span', { style: { color: C.sub, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '9px' } }, 'Last transition'), h('span', { style: { color: dark ? '#86efac' : '#15803d' } }, '+' + transitionRef.current.born + ' births'), h('span', { style: { color: dark ? '#67e8f9' : '#0e7490' } }, transitionRef.current.survived + ' survivors'), h('span', { style: { color: dark ? '#fda4af' : '#be123c' } }, '-' + transitionRef.current.died + ' deaths'), h('span', { style: { color: transitionRef.current.born > transitionRef.current.died ? (dark ? '#86efac' : '#15803d') : transitionRef.current.born < transitionRef.current.died ? (dark ? '#fda4af' : '#be123c') : C.sub } }, 'Net ' + (transitionRef.current.born > transitionRef.current.died ? '+' : '') + (transitionRef.current.born - transitionRef.current.died)), h('span', { style: { marginLeft: 'auto', color: C.sub, fontSize: '9px' } }, historyRef.current.length + ' / 100 rewind frames')),
        h('div', { ref: stageRef, id: 'cellularlab-stage', style: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', borderRadius: '18px', overflow: 'auto', background: 'radial-gradient(circle at 50% 42%, rgba(16,185,129,0.16), rgba(2,6,23,0.98) 68%)', border: '1px solid rgba(52,211,153,0.28)' } }, renderLifeGrid(), h('div', { 'aria-label': 'Dynamics detector: ' + dynamics.label + '. ' + dynamics.detail, style: { pointerEvents: 'none', position: 'absolute', zIndex: 2, top: '22px', right: '22px', maxWidth: '190px', padding: '7px 10px', borderRadius: '11px', textAlign: 'right', background: 'rgba(2,6,23,0.82)', border: '1px solid ' + dynamicsColor, color: '#f8fafc', boxShadow: '0 8px 28px rgba(2,6,23,0.38), 0 0 16px ' + dynamicsColor + '33', backdropFilter: 'blur(6px)' } }, h('div', { style: { color: dynamicsColor, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, h('span', { 'aria-hidden': 'true' }, dynamicsIcon + ' '), dynamics.label), h('div', { style: { marginTop: '2px', color: '#cbd5e1', fontSize: '9px', fontWeight: 700, lineHeight: 1.3 } }, dynamics.detail)), h('div', { 'aria-hidden': 'true', style: { pointerEvents: 'none', position: 'absolute', inset: 0, boxShadow: 'inset 0 0 50px rgba(34,211,238,0.06)' } })),
        h('div', { style: { display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' } }, btn(running ? 'Pause' : 'Run', toggleRun, { primary: true }), btn(vizMode === 'forecast' ? 'Apply forecast' : 'Step', stepOnce, { key: 'step', title: vizMode === 'forecast' ? 'Advance exactly one generation; later telescope steps remain uncommitted' : 'Advance one generation' }), btn('Rewind', rewindOne, { disabled: historyRef.current.length === 0, title: historyRef.current.length ? 'Rewind one generation' : 'Step or run to create rewind history' }), btn('Random', randomize), btn('Clear', clearGrid), btn('Fullscreen', toggleFullscreenLife), btn('Export PNG', exportLifePng)),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' } },
          h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '11px' } }, h('div', { style: { fontSize: '11px', fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } }, 'World controls'), h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '9px' } }, btn('Draw', function () { setBrush(1); }, { pressed: brush === 1 }), btn('Erase', function () { setBrush(0); }, { pressed: brush === 0 }), btn(wrap ? 'Wrap on' : 'Wrap off', function () { setWrap(function (w) { return !w; }); }, { pressed: wrap })), h('label', { style: { display: 'block', fontSize: '11px', color: C.sub, fontWeight: 800 } }, 'Speed: ' + Math.round(1000 / speed) + ' generations/sec', h('input', { type: 'range', min: 1, max: 25, value: Math.round(1000 / speed), onChange: function (e) { setSpeed(Math.round(1000 / parseInt(e.target.value, 10))); }, 'aria-label': 'Generations per second', style: { width: '100%', marginTop: '5px' } })), h('div', { style: { marginTop: '9px', fontSize: '11px', color: C.sub, fontWeight: 800 } }, 'Grid size'), h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' } }, [40,60,80,120].map(function (n) { return btn(n + ' x ' + n, function () { resizeLife(n); }, { pressed: lifeSize === n }); }))),
          h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '11px' } },
            h('div', { style: { fontSize: '11px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' } }, 'Scientific lens'),
            h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, [{ id:'normal',label:'Normal' },{ id:'forecast',label:'Next forecast' },{ id:'field',label:'Colony scan' },{ id:'change',label:'Change map' },{ id:'age',label:'Age map' },{ id:'xray',label:'Neighbor X-ray' }].map(function (v) { return btn(v.label, function () { setVizMode(v.id); }, { pressed: vizMode === v.id }); })),
            h('p', { style: { margin: '7px 0', fontSize: '10px', color: C.sub, lineHeight: 1.4 } }, vizMode === 'forecast' ? 'Look up to eight generations ahead without changing the experiment. Green cells appear by the inspected horizon; cyan cells remain; rose cells are gone. Gold residency glow strengthens where cells recur, while the dashed comet trail follows the projected center of mass and the ghost frame measures its future footprint.' : vizMode === 'field' ? 'Measure the colony footprint and center of mass. The gold trail tracks movement across generations.' : vizMode === 'change' ? 'See exactly what the last rule application changed. Rewind to compare earlier transitions.' : vizMode === 'age' ? 'Yellow cells are newborn; violet cells have survived many generations.' : vizMode === 'xray' ? 'Numbers are live-neighbor counts. Green outcomes satisfy the current B/S rule.' : 'Cell brightness responds to local neighborhood density.'),
            vizMode === 'forecast' && h('label', { style: { display: 'block', marginBottom: '7px', fontSize: '10px', color: C.text, fontWeight: 900 } },
              h('span', { 'data-life-forecast-horizon-label': String(forecastHorizon) }, 'Future telescope: +' + forecastHorizon + ' generation' + (forecastHorizon === 1 ? '' : 's')),
              h('input', { type: 'range', min: 1, max: 8, step: 1, value: forecastHorizon, onChange: function (e) { setForecastHorizon(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1))); }, 'aria-label': 'Forecast horizon in generations', 'data-life-forecast-horizon': String(forecastHorizon), style: { width: '100%', marginTop: '5px', accentColor: '#eab308' } })
            ),
            vizMode === 'forecast' && forecastPreview && forecastComparison && h('div', { role: 'status', 'aria-label': 'Forecast plus ' + forecastHorizon + ': ' + forecastComparison.appeared + ' cells appear, ' + forecastComparison.retained + ' current cells remain, ' + forecastComparison.gone + ' current cells are gone, projected population ' + forecastComparison.population + '.', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } },
              h('span', { style: { color: dark ? '#86efac' : '#15803d' } }, '+' + forecastComparison.appeared + ' appear'),
              h('span', { style: { color: dark ? '#67e8f9' : '#0e7490' } }, forecastComparison.retained + ' remain'),
              h('span', { style: { color: dark ? '#fda4af' : '#be123c' } }, '-' + forecastComparison.gone + ' gone'),
              h('span', null, 'Projected pop ' + forecastComparison.population),
              h('span', null, 'Step +' + forecastHorizon + ' turnover ' + forecastPreview.turnover),
              h('span', { 'data-life-forecast-residency-summary': String(forecastResidency.activeCells) }, forecastResidency.activeCells + ' path cells | ' + forecastResidency.persistentCells + ' persist throughout'),
              h('span', { 'data-life-forecast-motion-summary': forecastMotion.distance == null ? 'extinct' : forecastMotion.distance.toFixed(2) }, forecastMotion.distance == null ? 'No center at +' + forecastHorizon : 'Center drift ' + forecastMotion.distance.toFixed(2) + ' cells | r' + (forecastMotion.deltaRow >= 0 ? '+' : '') + forecastMotion.deltaRow.toFixed(2) + ' c' + (forecastMotion.deltaCol >= 0 ? '+' : '') + forecastMotion.deltaCol.toFixed(2)),
              forecastMotion.selectedBounds && h('span', { 'data-life-forecast-footprint-summary': String(forecastHorizon) }, 'Future footprint ' + forecastMotion.selectedBounds.width + 'x' + forecastMotion.selectedBounds.height + ' | ' + Math.round(forecastMotion.selectedBounds.density * 100) + '% dense')
            ),
            vizMode === 'field' && h('div', { role: 'status', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, spatialScan ? [h('span', { key:'footprint' }, 'Footprint ' + spatialScan.width + ' x ' + spatialScan.height), h('span', { key:'density' }, 'Density ' + Math.round(spatialScan.density * 100) + '%'), h('span', { key:'center' }, 'Center r' + (spatialScan.centerR + 1).toFixed(1) + ', c' + (spatialScan.centerC + 1).toFixed(1)), h('span', { key:'trail' }, Math.min(60, transitionHistoryRef.current.length) + ' trail points')] : h('span', null, 'No live cells to scan.')),
            vizMode === 'change' && h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' } }, [{ label:'Born', color:'#4ade80' },{ label:'Survived', color:'#22d3ee' },{ label:'Died', color:'#fb7185' }].map(function (item) { return h('span', { key: item.label, style: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '3px', background: item.color, boxShadow: '0 0 8px ' + item.color } }), item.label); })),
            vizMode === 'normal' && h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, [{h:150,c:'#10b981'},{h:190,c:'#06b6d4'},{h:45,c:'#f59e0b'},{h:320,c:'#ec4899'},{h:-1,c:'#e2e8f0'}].map(function (sw) { return h('button', { key: sw.h, type: 'button', onClick: function () { setLifeHue(sw.h); }, 'aria-label': 'Use ' + sw.c + ' cell palette', 'aria-pressed': lifeHue === sw.h, style: { width: '30px', height: '24px', borderRadius: '7px', border: '2px solid ' + (lifeHue === sw.h ? C.cursor : C.border), background: sw.c, cursor: 'pointer' } }); }))
          )
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
          var parentInfluence = activeCause ? caInfluence.parents[j] : null, decisive = !!(parentInfluence && parentInfluence.decisive);
          col.push(h('rect', { key: 'n' + i + '_' + j, 'data-ca-rule-parent-influence': parentInfluence ? (decisive ? 'decisive' : 'contextual') : undefined, x: x + 8 + j * 16, y: 6, width: 14, height: 14, rx: 2, fill: v ? C.live : C.dead, stroke: decisive ? '#4ade80' : (parentInfluence ? '#67e8f9' : C.border), strokeWidth: decisive ? 2.3 : (parentInfluence ? 1.6 : 1), strokeDasharray: parentInfluence && !decisive ? '3 2' : undefined }));
        });
        col.push(h('rect', { key: 'o' + i, x: x + 24, y: 30, width: 14, height: 14, rx: 2, fill: out ? C.live2 : C.dead, stroke: activeCause ? '#fde047' : (out ? C.live2 : C.border), strokeWidth: activeCause ? 2.2 : (out ? 2 : 1) }));
        col.push(h('path', { key: 'a' + i, d: 'M' + (x + 31) + ' 22V28', stroke: activeCause ? '#fde047' : C.sub, strokeWidth: activeCause ? 2 : 1.5 }));
        col.push(h('rect', { key: 'track' + i, x: x + 8, y: 49, width: 48, height: 4, rx: 2, fill: C.border, opacity: 0.48, style: { pointerEvents: 'none' } }));
        col.push(h('rect', { key: 'evidence' + i, 'data-neighborhood-evidence': String(i), 'data-count': String(usage), x: x + 8, y: 49, width: 48 * usage / maxUsage, height: 4, rx: 2, fill: '#fbbf24', style: { pointerEvents: 'none', filter: usage ? 'drop-shadow(0 0 3px rgba(251,191,36,0.55))' : 'none' } }));
        col.push(h('text', { key: 'pct' + i, x: x + 32, y: 63, textAnchor: 'middle', fill: activeCause ? '#fde047' : C.sub, fontSize: 8, fontWeight: 800, style: { pointerEvents: 'none' } }, (share * 100).toFixed(share >= 0.1 ? 0 : 1) + '%'));
        cells.push(h('g', {
          key: 'col' + i, role: 'button', tabIndex: 0, 'data-active-cause': activeCause ? 'true' : undefined,
          'aria-current': activeCause ? 'true' : undefined,
          'aria-label': 'Neighbourhood ' + l + m + rt + ' produces ' + out + '. Observed ' + usage + ' times, ' + (share * 100).toFixed(1) + ' percent of transitions.' + (activeCause ? ' This mapping produced the selected cell. Counterfactual test: ' + caInfluence.decisiveCount + ' of 3 parent bits are decisive.' : '') + ' Activate to flip.',
          onClick: (function (idx) { return function () { toggleRuleBit(idx); }; })(i),
          onKeyDown: (function (idx) { return function (e) { if (e.key === ' ' || e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); toggleRuleBit(idx); } }; })(i),
          style: { cursor: 'pointer' }
        }, col));
      }
      ['Left','Center','Right'].forEach(function (label, position) {
        var profile = caSensitivity.positions[position], baseX = 5 + position * 169, trackWidth = 158;
        cells.push(h('text', { key: 'channelLabel' + position, x: baseX, y: 75, fill: C.sub, fontSize: 8, fontWeight: 900, style: { pointerEvents: 'none' } }, label.toUpperCase()));
        cells.push(h('text', { key: 'channelRate' + position, x: baseX + trackWidth, y: 75, textAnchor: 'end', fill: C.text, fontSize: 8, fontWeight: 900, style: { pointerEvents: 'none' } }, Math.round(profile.rate * 100) + '%'));
        cells.push(h('rect', { key: 'channelTrack' + position, x: baseX, y: 80, width: trackWidth, height: 6, rx: 3, fill: C.border, opacity: 0.52, style: { pointerEvents: 'none' } }));
        cells.push(h('rect', { key: 'channelBar' + position, 'data-ca-sensitivity-channel': label.toLowerCase(), 'data-rate': profile.rate.toFixed(6), 'data-decisive-observations': String(profile.decisiveObservations), x: baseX, y: 80, width: trackWidth * profile.rate, height: 6, rx: 3, fill: '#4ade80', opacity: 0.9, style: { filter: profile.rate ? 'drop-shadow(0 0 4px rgba(74,222,128,0.65))' : 'none', pointerEvents: 'none' } }));
      });
      return h('div', { style: { maxWidth: '520px' } },
        h('svg', { viewBox: '0 0 512 92', width: '100%', role: 'group', 'aria-label': 'Rule table for rule ' + rule + ' with ' + usageTotal + ' neighborhood observations. Each column maps a 3-cell neighbourhood to the next cell. Gold bars and percentages show observed frequency. A gold outline marks the mapping responsible for the selected cell. Observed flip sensitivity is left ' + Math.round(caSensitivity.positions[0].rate * 100) + ' percent, center ' + Math.round(caSensitivity.positions[1].rate * 100) + ' percent, and right ' + Math.round(caSensitivity.positions[2].rate * 100) + ' percent. Click a column to flip its output.', style: { display: 'block' } }, cells),
        h('div', { style: { marginTop: '2px', color: C.sub, fontSize: '10px', fontWeight: 800, textAlign: 'center' } }, 'Neighborhood evidence | ' + usageTotal.toLocaleString() + ' observations | gold bars = frequency | gold frame = selected | lime channel bars = observed flip sensitivity')
      );
    }

    function renderCaDiagram() {
      var W = CA_COLS * CA_PX, H = CA_ROWS * CA_PX, selectedX = (caInspectCol + 0.5) * CA_PX, selectedY = (caInspectRow + 0.5) * CA_PX;
      var sensitivityText = caInfluence.parents.length ? ' Counterfactual test: ' + caInfluence.decisiveCount + ' of 3 parents are decisive; flipping a decisive parent changes the result.' : ' No parent counterfactual exists on the seed row.';
      var causeText = (caCause && caCause.pattern ? 'Generation ' + caInspectRow + ', column ' + (caInspectCol + 1) + ': parents ' + caCause.pattern + ' produced ' + caCause.output + '.' : 'Generation zero seed cell at column ' + (caInspectCol + 1) + ' has no parent neighborhood.') + sensitivityText + ' The ancestry cone traces ' + caCone.upstreamCount + ' upstream cells across ' + caCone.depth + ' generations.' + (caInspectRow > 0 ? ' ' + caTemporalChange.count + ' of ' + CA_COLS + ' cells changed from the prior generation. Counterfactual row scan: ' + caSensitivityRow.decisiveCells + ' of ' + CA_COLS + ' cells have at least one decisive parent, averaging ' + caSensitivityRow.mean.toFixed(2) + ' decisive parents per cell.' : ' This is the seed row, so no prior-generation comparison exists.') + ' Selected cell transition: ' + caSelectedTransition.label + '.';
      var rects = [h('desc', { key: 'desc', id: 'ca-diagram-desc' }, causeText + ' Use arrow keys to inspect adjacent cells, Page Up and Page Down to jump ten generations, and Home or End to move through time.'), h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.dead })];
      for (var r = 0; r < caRows.length; r++) {
        if (r > 0 && r % 10 === 0) rects.push(h('line', { key: 'guide' + r, x1: 0, x2: W, y1: r * CA_PX, y2: r * CA_PX, stroke: dark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.2)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }));
        var timeColor = contrast ? C.live : 'hsl(' + Math.round(158 + r / Math.max(1, caRows.length - 1) * 92) + ',82%,56%)';
        for (var c = 0; c < CA_COLS; c++) if (caRows[r][c]) rects.push(h('rect', { key: r + '_' + c, x: c * CA_PX, y: r * CA_PX, width: CA_PX, height: CA_PX, rx: 0.6, fill: timeColor }));
      }
      if (caWrap) rects.push(h('path', { key: 'boundaryRails', d: 'M1 0V' + H + 'M' + (W - 1) + ' 0V' + H, fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.5, strokeDasharray: '5 3', vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(196,181,253,0.75))', pointerEvents: 'none' } }));
      else rects.push(h('path', { key: 'boundaryRails', d: 'M1 0V' + H + 'M' + (W - 1) + ' 0V' + H, fill: 'none', stroke: '#fb7185', strokeWidth: 1.3, vectorEffect: 'non-scaling-stroke', opacity: 0.75, style: { pointerEvents: 'none' } }));
      rects.push(h('rect', { key: 'inspectRow', x: 0.7, y: caInspectRow * CA_PX + 0.7, width: W - 1.4, height: CA_PX - 1.4, fill: 'rgba(253,224,71,0.055)', stroke: 'none', style: { pointerEvents: 'none' } }));
      if (caInspectRow > 0 && caTemporalChange.count) {
        rects.push(h('rect', { key: 'temporalChangeBand', 'data-ca-temporal-change-band': String(caTemporalChange.count), x: 0, y: caInspectRow * CA_PX, width: W, height: CA_PX, fill: 'rgba(251,113,133,' + (0.035 + caTemporalChange.rate * 0.11).toFixed(3) + ')', stroke: '#fb7185', strokeWidth: 0.65, vectorEffect: 'non-scaling-stroke', opacity: 0.82, style: { pointerEvents: 'none' } }));
        caTemporalChange.cells.forEach(function (col) { rects.push(h('rect', { key: 'temporalChange' + col, 'data-ca-temporal-change-cell': String(col), x: col * CA_PX + 0.55, y: caInspectRow * CA_PX + 0.55, width: CA_PX - 1.1, height: CA_PX - 1.1, rx: 1, fill: 'none', stroke: '#fb7185', strokeWidth: 1.05, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 2px rgba(251,113,133,0.8))', pointerEvents: 'none' } })); });
      }
      if (caInspectRow > 0 && caSensitivityRow.cells.length) {
        rects.push(h('g', { key:'sensitivityBand', 'data-ca-sensitivity-band':String(caInspectRow), 'data-responsive-cells':String(caSensitivityRow.decisiveCells), 'data-mean-decisive':caSensitivityRow.mean.toFixed(6), 'aria-hidden':'true', style:{pointerEvents:'none'} },
          caSensitivityRow.cells.map(function (count,col) {
            if (!count) return null;
            var gx=(col+0.5)*CA_PX, gy=(caInspectRow+0.5)*CA_PX;
            if (count === 1) return h('circle', { key:'sensitivity'+col, 'data-ca-sensitivity-cell':String(col), 'data-decisive-count':'1', cx:gx, cy:gy, r:0.85, fill:'#a78bfa', style:{filter:'drop-shadow(0 0 2px rgba(167,139,250,0.9))'} });
            if (count === 2) return h('path', { key:'sensitivity'+col, 'data-ca-sensitivity-cell':String(col), 'data-decisive-count':'2', d:'M'+(gx-1.55)+' '+gy+'H'+(gx+1.55), stroke:'#67e8f9', strokeWidth:1.25, strokeLinecap:'round', vectorEffect:'non-scaling-stroke', style:{filter:'drop-shadow(0 0 2px rgba(103,232,249,0.9))'} });
            return h('rect', { key:'sensitivity'+col, 'data-ca-sensitivity-cell':String(col), 'data-decisive-count':'3', x:gx-1.25, y:gy-1.25, width:2.5, height:2.5, transform:'rotate(45 '+gx+' '+gy+')', fill:'#4ade80', stroke:'#dcfce7', strokeWidth:0.45, vectorEffect:'non-scaling-stroke', style:{filter:'drop-shadow(0 0 3px rgba(74,222,128,0.95))'} });
          })));
      }
      if (caCone.depth > 1) {
        var topLayer = caCone.layers[caCone.layers.length - 1], topCols = topLayer.nodes.map(function (node) { return node.col; });
        var minTop = Math.min.apply(Math, topCols), maxTop = Math.max.apply(Math, topCols);
        if (!caWrap || maxTop - minTop <= caCone.depth * 2) rects.push(h('path', { key: 'coneField', 'data-ca-cone-field': 'true', d: 'M' + selectedX + ' ' + selectedY + ' L' + ((minTop + 0.15) * CA_PX) + ' ' + ((topLayer.row + 0.5) * CA_PX) + ' L' + ((maxTop + 0.85) * CA_PX) + ' ' + ((topLayer.row + 0.5) * CA_PX) + ' Z', fill: 'rgba(167,139,250,0.075)', stroke: '#a78bfa', strokeWidth: 0.8, strokeDasharray: '3 3', vectorEffect: 'non-scaling-stroke', opacity: 0.72, style: { pointerEvents: 'none' } }));
        caCone.layers.slice(2).reverse().forEach(function (layer, reverseIndex) {
          var distance = caCone.depth - reverseIndex, fade = 1 - distance / (caCone.depth + 2);
          layer.nodes.forEach(function (node) { rects.push(h('rect', { key: 'ancestor' + distance + '_' + node.col, 'data-ca-ancestor-depth': String(distance), 'data-ca-ancestor-col': String(node.col), x: node.col * CA_PX + 0.75, y: layer.row * CA_PX + 0.75, width: CA_PX - 1.5, height: CA_PX - 1.5, rx: 1, fill: node.value ? 'rgba(167,139,250,' + (0.1 + fade * 0.18).toFixed(3) + ')' : 'rgba(103,232,249,0.025)', stroke: '#a78bfa', strokeWidth: 0.75, vectorEffect: 'non-scaling-stroke', opacity: 0.28 + fade * 0.5, style: { pointerEvents: 'none' } })); });
        });
      }
      if (caCause && caCause.parents.length) {
        caCause.parents.forEach(function (parent, parentIndex) {
          var influence = caInfluence.parents[parentIndex], decisive = !!(influence && influence.decisive);
          var parentX = parent.col == null ? (parentIndex === 0 ? 0 : W) : (parent.col + 0.5) * CA_PX;
          var parentY = (caInspectRow - 0.5) * CA_PX, pathColor = decisive ? '#4ade80' : (parent.wrapped ? '#c4b5fd' : '#67e8f9');
          rects.push(h('path', { key: 'causeLine' + parentIndex, 'data-ca-influence-path': decisive ? 'decisive' : 'contextual', d: 'M' + parentX + ' ' + parentY + ' L' + selectedX + ' ' + selectedY, fill: 'none', stroke: pathColor, strokeWidth: decisive ? 2.25 : 1.25, strokeDasharray: decisive ? undefined : (parent.wrapped ? '4 3' : '3 2'), vectorEffect: 'non-scaling-stroke', opacity: decisive ? 1 : 0.78, style: { filter: decisive ? 'drop-shadow(0 0 4px rgba(74,222,128,0.95))' : 'drop-shadow(0 0 3px rgba(103,232,249,0.65))', pointerEvents: 'none' } }));
          if (parent.col != null) {
            rects.push(h('rect', { key: 'causeParent' + parentIndex, 'data-ca-parent': String(parentIndex), 'data-ca-parent-influence': decisive ? 'decisive' : 'contextual', x: parent.col * CA_PX + 0.45, y: (caInspectRow - 1) * CA_PX + 0.45, width: CA_PX - 0.9, height: CA_PX - 0.9, rx: 1, fill: decisive ? (parent.value ? 'rgba(74,222,128,0.34)' : 'rgba(74,222,128,0.09)') : (parent.value ? 'rgba(103,232,249,0.2)' : 'rgba(103,232,249,0.055)'), stroke: decisive ? '#4ade80' : '#67e8f9', strokeWidth: decisive ? 1.9 : 1.25, strokeDasharray: decisive ? undefined : '2 1.5', vectorEffect: 'non-scaling-stroke', style: { filter: decisive ? 'drop-shadow(0 0 5px rgba(74,222,128,0.95))' : 'drop-shadow(0 0 3px rgba(103,232,249,0.7))', pointerEvents: 'none' } }));
            rects.push(decisive ? h('circle', { key: 'causeMarker' + parentIndex, cx: parentX, cy: parentY, r: 1.35, fill: '#4ade80', style: { pointerEvents: 'none' } }) : h('path', { key: 'causeMarker' + parentIndex, d: 'M' + (parentX - 1.5) + ' ' + parentY + 'H' + (parentX + 1.5), stroke: '#67e8f9', strokeWidth: 0.9, vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }));
          }
        });
      }
      rects.push(h('g', { key: 'selectedCellRow', role: 'row' },
        h('g', { id: 'ca-diagram-cell-' + caInspectRow + '-' + caInspectCol, role: 'gridcell', 'aria-selected': 'true', 'aria-label': causeText, 'data-ca-selected-row': String(caInspectRow), 'data-ca-selected-col': String(caInspectCol) },
          h('circle', { cx: selectedX, cy: selectedY, r: CA_PX * 1.18, fill: 'rgba(253,224,71,0.12)', stroke: '#fde047', strokeWidth: 1.7, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 6px rgba(253,224,71,0.95))', pointerEvents: 'none' } }),
          h('rect', { x: caInspectCol * CA_PX + 0.55, y: caInspectRow * CA_PX + 0.55, width: CA_PX - 1.1, height: CA_PX - 1.1, rx: 1, fill: caCause && caCause.output ? 'rgba(253,224,71,0.38)' : 'rgba(253,224,71,0.08)', stroke: '#fde047', strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }),
          h('g', { 'data-ca-selected-transition': caSelectedTransition.kind, 'data-from': caSelectedTransition.previous == null ? 'seed' : String(caSelectedTransition.previous), 'data-to': String(caSelectedTransition.current), 'aria-hidden': 'true', style: { pointerEvents: 'none' } },
            caSelectedTransition.kind === 'birth' ? h('path', { d: 'M' + (selectedX - 2) + ' ' + selectedY + 'H' + (selectedX + 2) + 'M' + selectedX + ' ' + (selectedY - 2) + 'V' + (selectedY + 2), stroke: '#4ade80', strokeWidth: 1.5, strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }) :
            caSelectedTransition.kind === 'death' ? h('path', { d: 'M' + (selectedX - 1.8) + ' ' + (selectedY - 1.8) + 'L' + (selectedX + 1.8) + ' ' + (selectedY + 1.8) + 'M' + (selectedX + 1.8) + ' ' + (selectedY - 1.8) + 'L' + (selectedX - 1.8) + ' ' + (selectedY + 1.8), stroke: '#fb7185', strokeWidth: 1.45, strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke' }) :
            caSelectedTransition.kind === 'stable-live' ? h('circle', { cx: selectedX, cy: selectedY, r: 1.55, fill: '#67e8f9', stroke: '#ecfeff', strokeWidth: 0.55, vectorEffect: 'non-scaling-stroke' }) :
            caSelectedTransition.kind === 'stable-empty' ? h('circle', { cx: selectedX, cy: selectedY, r: 1.7, fill: 'none', stroke: '#67e8f9', strokeWidth: 1.05, vectorEffect: 'non-scaling-stroke' }) :
            h('rect', { x: selectedX - 1.6, y: selectedY - 1.6, width: 3.2, height: 3.2, transform: 'rotate(45 ' + selectedX + ' ' + selectedY + ')', fill: '#c4b5fd', stroke: '#f5f3ff', strokeWidth: 0.55, vectorEffect: 'non-scaling-stroke' })
          )
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
      var selectedDensity = caAnalysis.densities[caInspectRow] || 0, selectedEntropy = caAnalysis.entropies[caInspectRow] || 0, selectedActivity = caAnalysis.activities[caInspectRow] || 0, selectedTemporalChange = caAnalysis.temporalChanges[caInspectRow] || 0, selectedLive = Math.round(selectedDensity * CA_COLS);
      var legend = [{ key:'density', label:'Density', value:Math.round(selectedDensity * 100) + '%', color:'#22d3ee' }, { key:'entropy', label:'Entropy', value:selectedEntropy.toFixed(2) + ' bits', color:'#a78bfa' }, { key:'activity', label:'Edge rate', value:Math.round(selectedActivity * 100) + '%', color:'#fbbf24' }, { key:'temporal', label:'Row change', value:Math.round(selectedTemporalChange * 100) + '% (' + caTemporalChange.count + ' cells)', color:'#fb7185' }];
      var causeSummary = (caCause && caCause.pattern ? 'Cell ' + (caInspectCol + 1) + ': ' + caCause.pattern + ' -> ' + caCause.output + ' via rule mapping ' + caCause.index : 'Cell ' + (caInspectCol + 1) + ': seed value ' + (caCause ? caCause.output : 0) + ' (no parents)') + ' | decisive ' + caInfluence.decisiveCount + '/3 | row responsive ' + caSensitivityRow.decisiveCells + '/' + CA_COLS + ', mean ' + caSensitivityRow.mean.toFixed(2) + ' | ' + caCone.depth + '-gen cone: ' + caCone.upstreamCount + ' upstream cells | transition ' + caSelectedTransition.label;
      function inspectSignalFromEvent(e) {
        var bounds = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
        if (!bounds || !bounds.width) return;
        var localX = Math.max(px, Math.min(W - px, (e.clientX - bounds.left) / bounds.width * W));
        setCaInspectRow(Math.max(0, Math.min(n - 1, Math.round((localX - px) / (W - px * 2) * (n - 1)))));
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '560px' } },
        h('div', { role: 'status', 'aria-live': 'polite', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { color: C.sub, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Generation ' + caInspectRow + ' | ' + selectedLive + ' live | click chart to inspect time'), h('span', { 'data-ca-cause-detail': 'true', style: { color: dark ? '#fde68a' : '#92400e', fontSize: '10px', fontWeight: 900 } }, causeSummary), legend.map(function (item) { return h('span', { key: item.key, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: C.text, fontSize: '10px', fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: item.key === 'entropy' ? '7px' : '10px', height: item.key === 'activity' ? '7px' : '3px', transform: item.key === 'activity' ? 'rotate(45deg)' : 'none', borderRadius: item.key === 'density' ? '999px' : '1px', background: item.color } }), item.label + ' ' + item.value); })),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 'Rule ' + rule + ' signal profile with ' + (caWrap ? 'wrapped ring boundaries' : 'fixed empty boundaries') + ' across ' + n + ' generations. Selected generation ' + caInspectRow + ': density ' + Math.round(selectedDensity * 100) + ' percent, entropy ' + selectedEntropy.toFixed(2) + ' bits per cell, spatial edge rate ' + Math.round(selectedActivity * 100) + ' percent, row-to-row change ' + Math.round(selectedTemporalChange * 100) + ' percent. Mean entropy across all generations ' + caAnalysis.meanEntropy.toFixed(2) + ' bits and mean row-to-row change ' + Math.round(caAnalysis.meanTemporalChange * 100) + ' percent. Click the chart to inspect a generation.', onClick: inspectSignalFromEvent, 'data-ca-signal-profile': 'true', style: { width: '100%', height: H + 'px', display: 'block', cursor: 'crosshair' } },
          [0,0.5,1].map(function (level) { return h('line', { key: level, x1: px, x2: W - px, y1: y(level), y2: y(level), stroke: dark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.2)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }); }),
          h('line', { x1: x(caInspectRow), x2: x(caInspectRow), y1: top, y2: H - bottom, stroke: '#fde047', strokeWidth: 1.3, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 3px rgba(253,224,71,0.8))' } }),
          h('polyline', { 'data-ca-signal': 'density', points: points(caAnalysis.densities), fill: 'none', stroke: '#22d3ee', strokeWidth: 2.1, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { 'data-ca-signal': 'entropy', points: points(caAnalysis.entropies), fill: 'none', stroke: '#a78bfa', strokeWidth: 1.8, vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { 'data-ca-signal': 'spatial-edge', points: points(caAnalysis.activities), fill: 'none', stroke: '#fbbf24', strokeWidth: 1.7, strokeDasharray: '4 3', vectorEffect: 'non-scaling-stroke' }),
          h('polyline', { 'data-ca-signal': 'temporal-change', points: points(caAnalysis.temporalChanges), fill: 'none', stroke: '#fb7185', strokeWidth: 1.65, strokeDasharray: '2 2', vectorEffect: 'non-scaling-stroke' }),
          h('circle', { cx: x(caInspectRow), cy: y(selectedDensity), r: 3.1, fill: '#22d3ee' }),
          h('rect', { x: x(caInspectRow) - 2.7, y: y(selectedEntropy) - 2.7, width: 5.4, height: 5.4, rx: 1, fill: '#a78bfa' }),
          h('rect', { x: x(caInspectRow) - 2.4, y: y(selectedActivity) - 2.4, width: 4.8, height: 4.8, transform: 'rotate(45 ' + x(caInspectRow) + ' ' + y(selectedActivity) + ')', fill: '#fbbf24' }),
          h('path', { 'data-ca-temporal-marker': String(caInspectRow), d: 'M' + (x(caInspectRow) - 3) + ' ' + (y(selectedTemporalChange) - 3) + 'L' + (x(caInspectRow) + 3) + ' ' + (y(selectedTemporalChange) + 3) + 'M' + (x(caInspectRow) + 3) + ' ' + (y(selectedTemporalChange) - 3) + 'L' + (x(caInspectRow) - 3) + ' ' + (y(selectedTemporalChange) + 3), stroke: '#fb7185', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke' }),
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
          'Rule ' + rule + ' · ' + CA_ROWS + ' generations · ' + (caWrap ? 'wrapped ring' : 'fixed edges') + ' · row scan: violet dot = 1, cyan dash = 2, lime diamond = 3 decisive parents | arrows move'),
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
    function patternThumb(key, preview) {
      preview = preview || analyzePatternEvolution(LIFE_PATTERNS[key], 4);
      var W = 64, H = 56, pad = 4, bounds = preview.bounds;
      var scale = Math.min((W - pad * 2) / Math.max(1, bounds.width), (H - pad * 2) / Math.max(1, bounds.height));
      var cellSize = Math.max(1.25, Math.min(6.5, scale * 0.72)), offsetX = (W - bounds.width * scale) / 2, offsetY = (H - bounds.height * scale) / 2;
      var futureSet = {}, marks = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.dead, rx: 5 })];
      preview.futureCells.forEach(function (cell) { futureSet[cell[0] + '_' + cell[1]] = true; });
      preview.initialCells.forEach(function (cell, index) {
        var overlap = !!futureSet[cell[0] + '_' + cell[1]], x = offsetX + (cell[1] - bounds.minC + 0.5) * scale - cellSize / 2, y = offsetY + (cell[0] - bounds.minR + 0.5) * scale - cellSize / 2;
        marks.push(h('rect', { key: 'initial' + index, x: x, y: y, width: cellSize, height: cellSize, rx: Math.min(1.3, cellSize / 4), fill: overlap ? '#f8fafc' : '#22d3ee', opacity: overlap ? 0.96 : 0.72, style: { filter: overlap ? 'drop-shadow(0 0 3px rgba(248,250,252,0.72))' : 'none' } }));
      });
      preview.futureCells.forEach(function (cell, index) {
        if (preview.initialSet[cell[0] + '_' + cell[1]]) return;
        var x = offsetX + (cell[1] - bounds.minC + 0.5) * scale - cellSize / 2, y = offsetY + (cell[0] - bounds.minR + 0.5) * scale - cellSize / 2;
        marks.push(h('rect', { key: 'future' + index, x: x, y: y, width: cellSize, height: cellSize, rx: Math.min(1.3, cellSize / 4), fill: '#fde047', opacity: 0.82, style: { filter: 'drop-shadow(0 0 3px rgba(253,224,71,0.58))' } }));
      });
      marks.push(h('text', { key: 'step', x: W - 3, y: 8, textAnchor: 'end', fill: '#fef08a', style: { fontSize: '7px', fontWeight: 900 } }, '+4'));
      return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: 64, height: 56, 'aria-hidden': 'true', 'data-pattern-evolution-preview': key, 'data-now': String(preview.initialCells.length), 'data-future': String(preview.futureCells.length), style: { display: 'block', flex: '0 0 auto' } }, marks);
    }
    function patternPulse(key, journey) {
      var W = 124, H = 30, left = 2, right = 2, top = 3, bottom = 4, plotW = W - left - right, plotH = H - top - bottom;
      var maxPop = Math.max(1, journey.maxPopulation), maxTurnover = Math.max(1, journey.maxTurnover), count = Math.max(1, journey.points.length - 1);
      function x(index) { return left + index / count * plotW; }
      function yPop(value) { return top + plotH - value / maxPop * plotH; }
      var populationPoints = journey.points.map(function (point, index) { return x(index).toFixed(1) + ',' + yPop(point.population).toFixed(1); }).join(' ');
      var areaPoints = left + ',' + (top + plotH) + ' ' + populationPoints + ' ' + (left + plotW) + ',' + (top + plotH);
      var marks = [
        h('path', { key: 'area', d: 'M' + areaPoints.replace(/ /g, 'L'), fill: 'rgba(34,211,238,0.11)', stroke: 'none' }),
        h('line', { key: 'axis', x1: left, y1: top + plotH, x2: left + plotW, y2: top + plotH, stroke: 'rgba(148,163,184,0.22)', strokeWidth: 0.7 }),
        h('polyline', { key: 'population', points: populationPoints, fill: 'none', stroke: '#22d3ee', strokeWidth: 1.65, strokeLinejoin: 'round', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 2px rgba(34,211,238,0.65))' } })
      ];
      journey.points.forEach(function (point, index) {
        if (!point.turnover) return;
        var barHeight = point.turnover / maxTurnover * Math.min(8, plotH * 0.38);
        marks.push(h('line', { key: 'turnover' + index, x1: x(index), y1: top + plotH, x2: x(index), y2: top + plotH - barHeight, stroke: '#fde047', strokeWidth: Math.max(0.75, plotW / journey.points.length * 0.38), opacity: 0.66, vectorEffect: 'non-scaling-stroke' }));
      });
      marks.push(h('circle', { key: 'end', cx: x(journey.points.length - 1), cy: yPop(journey.points[journey.points.length - 1].population), r: 1.8, fill: '#f8fafc', stroke: '#22d3ee', strokeWidth: 0.8, style: { filter: 'drop-shadow(0 0 3px rgba(248,250,252,0.8))' } }));
      return h('div', { style: { width: '100%', marginTop: '7px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '7px', marginBottom: '2px', color: C.sub, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' } },
          h('span', null, 'Evolution pulse · 16g'),
          h('span', { 'data-pattern-dynamics': key, style: { color: journey.kind === 'evolving' ? C.sub : C.accent } }, journey.shortLabel)),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: 30, role: 'img', 'data-pattern-pulse': key, 'data-pattern-status': journey.kind, 'data-pattern-period': journey.period == null ? '' : String(journey.period), 'aria-label': journey.summary, style: { display: 'block', overflow: 'visible' } }, marks));
    }
    function patternTemporalRibbon(key, journey) {
      var W=520, H=74, gap=7, frames=journey.frames || [], frameW=(W-gap*Math.max(0,frames.length-1))/Math.max(1,frames.length), bounds=journey.frameBounds;
      var scale=Math.min((frameW-12)/Math.max(1,bounds.width),(H-18)/Math.max(1,bounds.height)), cellSize=Math.max(1,Math.min(6,scale*0.72)), marks=[];
      frames.forEach(function (frame,index) {
        var x0=index*(frameW+gap), finalFrame=index===frames.length-1, color=finalFrame?'#fde047':'#22d3ee';
        marks.push(h('g', { key:'frame'+frame.step, 'data-pattern-ribbon-frame':String(frame.step), 'data-population':String(frame.population), transform:'translate('+x0+' 0)' },
          h('rect', { x:0, y:0, width:frameW, height:H-2, rx:6, fill:C.dead, stroke:finalFrame?'rgba(253,224,71,0.44)':'rgba(34,211,238,0.18)', strokeWidth:0.8 }),
          frame.cells.map(function (cell,cellIndex) {
            var cx=6+(cell[1]-bounds.minC+0.5)*scale-cellSize/2, cy=5+(cell[0]-bounds.minR+0.5)*scale-cellSize/2;
            return h('rect', { key:'cell'+cellIndex, x:cx, y:cy, width:cellSize, height:cellSize, rx:Math.min(1.2,cellSize/4), fill:color, opacity:0.72+index/Math.max(1,frames.length-1)*0.24, style:{filter:'drop-shadow(0 0 '+(finalFrame?3:2)+'px '+color+')'} });
          }),
          h('text', { x:frameW/2, y:H-7, textAnchor:'middle', fill:finalFrame?'#fef08a':C.sub, style:{fontSize:'8px',fontWeight:900} }, 'G'+frame.step+' · P'+frame.population)));
      });
      var populations=frames.map(function (frame) { return 'generation '+frame.step+' population '+frame.population; }).join(', ');
      return h('svg', { viewBox:'0 0 '+W+' '+H, width:'100%', role:'img', 'data-pattern-temporal-ribbon':key, 'data-frame-count':String(frames.length), 'data-union-width':String(bounds.width), 'data-union-height':String(bounds.height), 'aria-label':LIFE_PATTERNS[key].name+' temporal ribbon on one shared spatial frame: '+populations+'.', style:{display:'block',width:'100%',height:'auto',maxHeight:'92px',marginBottom:'5px'} }, marks);
    }
    function patternBehaviorAtlas(entries, activeKey) {
      var W = 520, H = 196, left = 48, right = 16, top = 16, bottom = 34, plotW = W - left - right, plotH = H - top - bottom;
      var maxPopulation = 1, maxTurnover = 1;
      entries.forEach(function (entry) {
        entry.totalTurnover = entry.journey.points.reduce(function (sum, point) { return sum + point.turnover; }, 0);
        maxPopulation = Math.max(maxPopulation, entry.journey.maxPopulation);
        maxTurnover = Math.max(maxTurnover, entry.totalTurnover);
      });
      function x(value) { return left + Math.sqrt(value / maxPopulation) * plotW; }
      function y(value) { return top + plotH - Math.sqrt(value / maxTurnover) * plotH; }
      var activeEntry = entries[0];
      entries.forEach(function (entry) { if (entry.key === activeKey) activeEntry = entry; });
      var colors = { still:'#94a3b8', oscillator:'#a78bfa', spaceship:'#22d3ee', extinct:'#fb7185', evolving:'#fde047' };
      var labels = { block:'Bk', beehive:'Bh', loaf:'Lf', boat:'Bt', blinker:'Bl', toad:'Td', beacon:'Bc', pulsar:'Pu', glider:'Gl', lwss:'LW', mwss:'MW', hwss:'HW', rpentomino:'R', acorn:'Ac', diehard:'Di', pihept:'Pi', gosperGun:'GG' };
      var marks = [];
      [0,0.25,0.5,0.75,1].forEach(function (fraction, index) {
        var gx = left + fraction * plotW, gy = top + fraction * plotH;
        marks.push(h('line', { key:'vx'+index, x1:gx, y1:top, x2:gx, y2:top+plotH, stroke:'rgba(148,163,184,0.14)', strokeWidth:0.7 }));
        marks.push(h('line', { key:'hy'+index, x1:left, y1:gy, x2:left+plotW, y2:gy, stroke:'rgba(148,163,184,0.14)', strokeWidth:0.7 }));
      });
      marks.push(h('line', { key:'xaxis', x1:left, y1:top+plotH, x2:left+plotW, y2:top+plotH, stroke:C.border, strokeWidth:1 }));
      marks.push(h('line', { key:'yaxis', x1:left, y1:top, x2:left, y2:top+plotH, stroke:C.border, strokeWidth:1 }));
      marks.push(h('text', { key:'x0', x:left, y:H-18, fill:C.sub, textAnchor:'middle', style:{fontSize:'8px'} }, '0'));
      marks.push(h('text', { key:'xm', x:x(maxPopulation/4), y:H-18, fill:C.sub, textAnchor:'middle', style:{fontSize:'8px'} }, String(Math.round(maxPopulation/4))));
      marks.push(h('text', { key:'xx', x:left+plotW, y:H-18, fill:C.sub, textAnchor:'middle', style:{fontSize:'8px'} }, String(maxPopulation)));
      marks.push(h('text', { key:'xl', x:left+plotW/2, y:H-5, fill:C.sub, textAnchor:'middle', style:{fontSize:'9px',fontWeight:800} }, 'Peak population in 16 generations'));
      marks.push(h('text', { key:'yl', x:10, y:top+plotH/2, fill:C.sub, textAnchor:'middle', transform:'rotate(-90 10 '+(top+plotH/2)+')', style:{fontSize:'9px',fontWeight:800} }, 'Total turnover'));
      var activeX=x(activeEntry.journey.maxPopulation), activeY=y(activeEntry.totalTurnover), activeColor=colors[activeEntry.journey.kind] || C.accent;
      marks.push(h('line', { key:'activeVertical', 'data-pattern-atlas-crosshair':'vertical', x1:activeX, y1:activeY, x2:activeX, y2:top+plotH, stroke:activeColor, strokeWidth:1, strokeDasharray:'3 3', opacity:0.72, vectorEffect:'non-scaling-stroke', style:{transition:'all 220ms ease'} }));
      marks.push(h('line', { key:'activeHorizontal', 'data-pattern-atlas-crosshair':'horizontal', x1:left, y1:activeY, x2:activeX, y2:activeY, stroke:activeColor, strokeWidth:1, strokeDasharray:'3 3', opacity:0.72, vectorEffect:'non-scaling-stroke', style:{transition:'all 220ms ease'} }));
      entries.forEach(function (entry, index) {
        var cx=x(entry.journey.maxPopulation), cy=y(entry.totalTurnover), color=colors[entry.journey.kind] || C.accent, selected=entry.key===activeEntry.key;
        var title=entry.pattern.name+': peak population '+entry.journey.maxPopulation+', total turnover '+entry.totalTurnover+', '+entry.journey.shortLabel+'.';
        marks.push(h('circle', { key:'halo'+entry.key, cx:cx, cy:cy, r:selected?13:8, fill:color, opacity:selected?0.2:0.09, style:{filter:'drop-shadow(0 0 '+(selected?9:5)+'px '+color+')',transition:'all 220ms ease'} }));
        marks.push(h('circle', { key:'point'+entry.key, 'data-pattern-atlas-point':entry.key, 'data-peak-population':String(entry.journey.maxPopulation), 'data-total-turnover':String(entry.totalTurnover), 'data-dynamics':entry.journey.kind, 'data-selected':selected?'true':'false', cx:cx, cy:cy, r:selected?6.2:4.1, fill:color, stroke:'#f8fafc', strokeWidth:selected?1.4:0.75, style:{transition:'all 220ms ease'} }, h('title', null, title)));
        marks.push(h('text', { key:'label'+entry.key, x:cx+(index%2?6:-6), y:cy-6-(index%3)*4, fill:selected?color:C.text, textAnchor:index%2?'start':'end', style:{fontSize:selected?'9px':'7.5px',fontWeight:900,pointerEvents:'none',filter:'drop-shadow(0 1px 2px '+C.bg+')',transition:'all 220ms ease'} }, labels[entry.key] || entry.pattern.name.slice(0,2)));
      });
      var legendKinds = ['still','oscillator','spaceship','evolving'];
      return h('div', { style:{margin:'2px 0 14px'} },
        h('div', { style:{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap',marginBottom:'4px'} },
          h('span', { style:{fontSize:'10px',color:C.text,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.06em'} }, 'Behavior atlas · shared scale'),
          legendKinds.map(function (kind) { return h('span', { key:kind, style:{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'9px',color:C.sub,fontWeight:800} }, h('span', { 'aria-hidden':'true', style:{width:'7px',height:'7px',borderRadius:'50%',background:colors[kind],boxShadow:'0 0 5px '+colors[kind]} }), kind); })),
        h('div', { role:'status', 'aria-live':'polite', 'data-pattern-atlas-selection':activeEntry.key, style:{fontSize:'10px',color:C.text,fontWeight:800,marginBottom:'2px'} },
          activeEntry.pattern.name+' · peak '+activeEntry.journey.maxPopulation+' · turnover '+activeEntry.totalTurnover+' · '+activeEntry.journey.shortLabel),
        patternTemporalRibbon(activeEntry.key, activeEntry.journey),
        h('svg', { viewBox:'0 0 '+W+' '+H, width:'100%', role:'img', 'data-pattern-behavior-atlas':'true', 'data-pattern-atlas-count':String(entries.length), 'data-pattern-atlas-active':activeEntry.key, 'aria-label':'Behavior atlas comparing all '+entries.length+' patterns on a shared scale. Horizontal position is peak population across 16 generations; vertical position is total births plus deaths. Currently inspecting '+activeEntry.pattern.name+', peak population '+activeEntry.journey.maxPopulation+', total turnover '+activeEntry.totalTurnover+', '+activeEntry.journey.shortLabel+'. Still lifes remain along the zero-turnover baseline, while oscillators, spaceships, and evolving seeds rise with activity.', style:{display:'block',width:'100%',height:'auto',maxHeight:'220px',overflow:'visible'} }, marks));
    }
    function renderPatternsTab() {
      var entries = PATTERN_ORDER.map(function (key) { return { key:key, pattern:LIFE_PATTERNS[key], journey:cachedPatternJourney(key, 16) }; });
      return h('div', null,
        h('p', { style: { margin: '0 0 12px', fontSize: '12px', color: C.sub, lineHeight: 1.5 } },
          'Classic Life forms shown as a four-generation double exposure. The shared-scale atlas compares how large and active each pattern becomes; tap a card to load it into Life.'),
        patternBehaviorAtlas(entries, patternFocusKey),
        h('div', { 'aria-label': 'Thumbnail legend: cyan is the starting pattern, gold is generation four, and white cells overlap.', style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 10px', color: C.sub, fontSize: '10px', fontWeight: 800 } }, [{ label:'Now', color:'#22d3ee' },{ label:'+4', color:'#fde047' },{ label:'Overlap', color:'#f8fafc' }].map(function (item) { return h('span', { key: item.label, style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } }, h('span', { 'aria-hidden': 'true', style: { width: '9px', height: '9px', borderRadius: '2px', background: item.color, boxShadow: '0 0 5px ' + item.color } }), item.label); })),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' } },
          entries.map(function (entry) {
            var key = entry.key, pat = entry.pattern, evolution = analyzePatternEvolution(pat, 4), journey = entry.journey;
            var active = patternFocusKey === key;
            return h('button', Object.assign({ key: key, type: 'button', 'data-pattern-key': key, 'data-pattern-atlas-active': active ? 'true' : 'false', 'aria-label': pat.name + ', ' + pat.kind + '. ' + evolution.initialCells.length + ' cells now, ' + evolution.futureCells.length + ' at generation four; ' + evolution.comparison.appeared + ' appear and ' + evolution.comparison.gone + ' disappear. ' + journey.summary + ' Load pattern.', onMouseEnter: function () { setPatternFocusKey(key); }, onFocus: function () { setPatternFocusKey(key); }, onClick: function () { loadPattern(key); } }, {
              style: { display: 'flex', gap: '10px', alignItems: 'center', textAlign: 'left', cursor: 'pointer',
                flexWrap: 'wrap', alignContent: 'flex-start', background: C.panel, border: '1px solid ' + (active ? C.accent : C.border), borderRadius: '12px', padding: '10px', boxShadow: active ? '0 0 0 1px ' + C.accent + ', 0 10px 28px rgba(16,185,129,0.16)' : 'none', transition: 'border-color 180ms ease, box-shadow 180ms ease' }
            }),
              patternThumb(key, evolution),
              h('div', { style: { minWidth: 0, flex: '1 1 64px' } },
                h('div', { style: { fontSize: '13px', fontWeight: 800, color: C.text } }, pat.name),
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.4px' } }, pat.kind),
                h('div', { style: { fontSize: '11px', color: C.sub, lineHeight: 1.4, marginTop: '2px' } }, pat.blurb)),
              patternPulse(key, journey));
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
          h('h1', { style: { margin: 0, fontSize: '17px', fontWeight: 800 } }, 'Cellular Automaton Lab'),
          h('div', { style: { fontSize: '11px', color: C.sub } }, 'Simple rules · surprising worlds'))
      ),
      h('section', { 'data-cellularlab-focus-panel': 'true', 'aria-label': 'Cellular Automaton Lab focus panel',
        style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(220px, 0.75fr)', gap: '12px',
          background: C.panel, border: '1px solid ' + C.border, borderRadius: '14px', padding: '12px',
          boxShadow: dark ? '0 18px 42px rgba(0,0,0,0.22)' : '0 16px 36px rgba(15,23,42,0.08)' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 } },
          h('div', null,
            h('div', { style: { fontSize: '10px', fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em' } }, 'Start here'),
            h('h2', { style: { margin: '2px 0 0', fontSize: '16px', fontWeight: 900, color: C.text } }, 'Pick the world you want to investigate')),
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
  function caCounterfactualInfluence(bits, cause) {
    if (!cause || cause.index == null || !bits || bits.length < 8) return { baseOutput: cause ? cause.output : 0, parents: [], decisiveCount: 0 };
    var baseOutput = bits[cause.index] ? 1 : 0, parents = [], decisiveCount = 0;
    for (var position = 0; position < 3; position++) {
      var alternateIndex = cause.index ^ (1 << (2 - position)), alternateOutput = bits[alternateIndex] ? 1 : 0;
      var decisive = alternateOutput !== baseOutput;
      if (decisive) decisiveCount++;
      parents.push({ position: position, decisive: decisive, alternateIndex: alternateIndex, alternateOutput: alternateOutput });
    }
    return { baseOutput: baseOutput, parents: parents, decisiveCount: decisiveCount };
  }
  function analyzeCaSensitivityRow(rows, rowIndex, bits, wrap) {
    rows = rows || [];
    if (!rows.length || rowIndex < 0 || rowIndex >= rows.length || !rows[rowIndex]) return { cells:[], histogram:[0,0,0,0], decisiveCells:0, mean:0, max:0 };
    var cells=[], histogram=[0,0,0,0], total=0, decisiveCells=0, max=0;
    for (var col=0; col<rows[rowIndex].length; col++) {
      var count=0;
      if (rowIndex > 0) count=caCounterfactualInfluence(bits,caCellCause(rows,rowIndex,col,wrap)).decisiveCount;
      cells.push(count); histogram[count]++; total+=count; if (count) decisiveCells++; max=Math.max(max,count);
    }
    return { cells:cells, histogram:histogram, decisiveCells:decisiveCells, mean:cells.length?total/cells.length:0, max:max };
  }
  function caRuleSensitivityProfile(bits, neighborhoodCounts) {
    var counts = neighborhoodCounts || [0,0,0,0,0,0,0,0];
    var total = counts.reduce(function (sum, count) { return sum + (count || 0); }, 0);
    var positions = [0,1,2].map(function (position) {
      var mask = 1 << (2 - position), decisiveObservations = 0;
      for (var index = 0; index < 8; index++) if ((bits[index] ? 1 : 0) !== (bits[index ^ mask] ? 1 : 0)) decisiveObservations += counts[index] || 0;
      return { position: position, decisiveObservations: decisiveObservations, rate: total ? decisiveObservations / total : 0 };
    });
    return { total: total, positions: positions };
  }
  function caCausalCone(rows, rowIndex, colIndex, wrap, depth) {
    rows = rows || [];
    if (!rows.length || rowIndex < 0 || rowIndex >= rows.length || colIndex < 0 || colIndex >= rows[rowIndex].length) return { layers: [], depth: 0, upstreamCount: 0 };
    var cols = rows[rowIndex].length, layers = [{ row: rowIndex, nodes: [{ col: colIndex, value: rows[rowIndex][colIndex] ? 1 : 0 }] }], frontier = [colIndex], upstreamCount = 0;
    var maxDepth = Math.min(Math.max(0, depth || 0), rowIndex);
    for (var distance = 1; distance <= maxDepth; distance++) {
      var seen = {}, next = [];
      frontier.forEach(function (sourceCol) {
        [-1,0,1].forEach(function (offset) {
          var candidate = sourceCol + offset;
          if (wrap) candidate = (candidate + cols) % cols;
          else if (candidate < 0 || candidate >= cols) return;
          if (!seen[candidate]) { seen[candidate] = true; next.push(candidate); }
        });
      });
      next.sort(function (a, b) { return a - b; });
      var sourceRow = rowIndex - distance;
      layers.push({ row: sourceRow, nodes: next.map(function (nodeCol) { return { col: nodeCol, value: rows[sourceRow][nodeCol] ? 1 : 0 }; }) });
      upstreamCount += next.length;
      frontier = next;
    }
    return { layers: layers, depth: layers.length - 1, upstreamCount: upstreamCount };
  }
  function caCellTransition(rows, rowIndex, colIndex) {
    if (!rows || rowIndex < 0 || rowIndex >= rows.length || !rows[rowIndex] || colIndex < 0 || colIndex >= rows[rowIndex].length) return { previous: null, current: 0, changed: false, kind: 'invalid', label: 'invalid cell' };
    var current = rows[rowIndex][colIndex] ? 1 : 0;
    if (rowIndex === 0) return { previous: null, current: current, changed: false, kind: 'seed', label: 'seed ' + current };
    var previous = rows[rowIndex - 1][colIndex] ? 1 : 0, changed = previous !== current;
    var kind = changed ? (current ? 'birth' : 'death') : (current ? 'stable-live' : 'stable-empty');
    var label = kind === 'birth' ? 'birth 0->1' : kind === 'death' ? 'death 1->0' : kind === 'stable-live' ? 'stable live 1->1' : 'stable empty 0->0';
    return { previous: previous, current: current, changed: changed, kind: kind, label: label };
  }  function caTemporalChangeCells(rows, rowIndex) {
    if (!rows || rowIndex <= 0 || rowIndex >= rows.length || !rows[rowIndex]) return { cells: [], count: 0, rate: 0 };
    var current = rows[rowIndex], previous = rows[rowIndex - 1], cells = [];
    for (var col = 0; col < current.length; col++) if (current[col] !== previous[col]) cells.push(col);
    return { cells: cells, count: cells.length, rate: current.length ? cells.length / current.length : 0 };
  }  function analyzeCaRows(rows, wrap) {
    var densities = [], entropies = [], activities = [], temporalChanges = [], neighborhoodCounts = [0,0,0,0,0,0,0,0];
    (rows || []).forEach(function (row, rowIndex) {
      var live = 0, changes = 0; for (var i = 0; i < row.length; i++) { live += row[i]; if (i > 0 && row[i] !== row[i - 1]) changes++; }
      var p = row.length ? live / row.length : 0;
      densities.push(p);
      entropies.push(p <= 0 || p >= 1 ? 0 : -(p * Math.log(p) / Math.log(2) + (1 - p) * Math.log(1 - p) / Math.log(2)));
      activities.push(row.length > 1 ? changes / (row.length - 1) : 0);
      var temporalChange = 0;
      if (rowIndex > 0 && row.length) for (var priorCell = 0; priorCell < row.length; priorCell++) if (row[priorCell] !== rows[rowIndex - 1][priorCell]) temporalChange++;
      temporalChanges.push(rowIndex > 0 && row.length ? temporalChange / row.length : 0);
      if (rowIndex < rows.length - 1) for (var c = 0; c < row.length; c++) {
        var left = wrap ? row[(c - 1 + row.length) % row.length] : (c > 0 ? row[c - 1] : 0);
        var right = wrap ? row[(c + 1) % row.length] : (c < row.length - 1 ? row[c + 1] : 0);
        neighborhoodCounts[(left << 2) | (row[c] << 1) | right]++;
      }
    });
    var mean = function (values) { return values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : 0; };
    return { densities: densities, entropies: entropies, activities: activities, temporalChanges: temporalChanges, neighborhoodCounts: neighborhoodCounts, neighborhoodTotal: neighborhoodCounts.reduce(function (sum, count) { return sum + count; }, 0), finalDensity: densities.length ? densities[densities.length - 1] : 0, meanDensity: mean(densities), meanEntropy: mean(entropies), meanActivity: mean(activities), meanTemporalChange: mean(temporalChanges) };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  function analyzeLifePhase(samples, limit) {
    var source = (samples || []).slice(-Math.max(1, limit || 100));
    var points = source.map(function (sample) { return { gen: sample.gen, population: sample.pop || 0, turnover: (sample.born || 0) + (sample.died || 0), births: sample.born || 0, deaths: sample.died || 0 }; });
    var maxPopulation = 1, maxTurnover = 1;
    points.forEach(function (point) { maxPopulation = Math.max(maxPopulation, point.population); maxTurnover = Math.max(maxTurnover, point.turnover); });
    return { points: points, maxPopulation: maxPopulation, maxTurnover: maxTurnover, latest: points.length ? points[points.length - 1] : null };
  }
  function analyzePatternEvolution(pattern, steps) {
    var pad = Math.max(4, steps + 2), rows = Math.max(1, (pattern && pattern.h || 1) + pad * 2), cols = Math.max(1, (pattern && pattern.w || 1) + pad * 2);
    var initial = emptyGrid(rows, cols), initialCells = [], initialSet = {};
    (pattern && pattern.cells || []).forEach(function (cell) { var r = cell[0] + pad, c = cell[1] + pad; if (r >= 0 && r < rows && c >= 0 && c < cols) { initial[r][c] = 1; initialCells.push([r,c]); initialSet[r + '_' + c] = true; } });
    var series = projectLifeFuture(initial, null, Math.max(0, steps || 0), false, '3', '23'), future = series.length ? series[series.length - 1].grid : initial;
    var futureCells = [], minR = rows, minC = cols, maxR = -1, maxC = -1;
    function include(r, c) { minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
    initialCells.forEach(function (cell) { include(cell[0], cell[1]); });
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (future[r][c]) { futureCells.push([r,c]); include(r,c); }
    if (maxR < 0) { minR = minC = 0; maxR = maxC = 0; }
    return { steps: Math.max(0, steps || 0), initialCells: initialCells, initialSet: initialSet, futureCells: futureCells, comparison: compareLifeStates(initial, future), bounds: { minR: minR, minC: minC, maxR: maxR, maxC: maxC, width: maxC - minC + 1, height: maxR - minR + 1 } };
  }
  function analyzePatternJourney(pattern, steps) {
    var limit = Math.max(1, steps || 16), pad = limit + 3, rows = Math.max(1, (pattern && pattern.h || 1) + pad * 2), cols = Math.max(1, (pattern && pattern.w || 1) + pad * 2);
    var grid = emptyGrid(rows, cols);
    (pattern && pattern.cells || []).forEach(function (cell) { var r = cell[0] + pad, c = cell[1] + pad; if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = 1; });
    var startBounds = populationBounds(grid), startShape = shapeFingerprint(grid), seenExact = {}, seenShape = {}, points = [{ step: 0, population: countPop(grid), turnover: 0, births: 0, deaths: 0 }], classification = null;
    var frameSteps = {}, frames = [], frameMinR = rows, frameMinC = cols, frameMaxR = -1, frameMaxC = -1;
    for (var sample = 0; sample <= 4; sample++) frameSteps[Math.round(limit * sample / 4)] = true;
    function captureFrame(source, frameStep) {
      var cells = [];
      for (var rr = 0; rr < source.length; rr++) for (var cc = 0; cc < source[rr].length; cc++) if (source[rr][cc]) {
        cells.push([rr,cc]); frameMinR = Math.min(frameMinR,rr); frameMinC = Math.min(frameMinC,cc); frameMaxR = Math.max(frameMaxR,rr); frameMaxC = Math.max(frameMaxC,cc);
      }
      frames.push({ step:frameStep, population:cells.length, cells:cells });
    }
    captureFrame(grid,0);
    seenExact[gridSignature(grid)] = { step: 0, bounds: startBounds };
    seenShape[startShape.signature] = { step: 0, bounds: startBounds };
    for (var step = 1; step <= limit; step++) {
      var next = stepLifeDetailed(grid, null, false, '3', '23'), bounds = populationBounds(next.grid), exact = gridSignature(next.grid), shape = shapeFingerprint(next.grid);
      points.push({ step: step, population: countPop(next.grid), turnover: next.born + next.died, births: next.born, deaths: next.died });
      if (!classification && !bounds) classification = { kind: 'extinct', step: step };
      if (!classification && seenExact[exact]) classification = { kind: step - seenExact[exact].step === 1 ? 'still' : 'oscillator', period: step - seenExact[exact].step, step: step };
      if (!classification && shape.signature && seenShape[shape.signature]) {
        var previous = seenShape[shape.signature], dr = bounds.minR - previous.bounds.minR, dc = bounds.minC - previous.bounds.minC;
        if (dr || dc) classification = { kind: 'spaceship', period: step - previous.step, dr: dr, dc: dc, step: step };
      }
      if (seenExact[exact] == null) seenExact[exact] = { step: step, bounds: bounds };
      if (shape.signature && seenShape[shape.signature] == null) seenShape[shape.signature] = { step: step, bounds: bounds };
      grid = next.grid;
      if (frameSteps[step]) captureFrame(grid,step);
    }
    if (frameMaxR < 0) { frameMinR = frameMinC = 0; frameMaxR = frameMaxC = 0; }
    classification = classification || { kind: 'evolving' };
    var shortLabel = classification.kind === 'still' ? 'Still · P1' : classification.kind === 'oscillator' ? 'Oscillator · P' + classification.period : classification.kind === 'spaceship' ? 'Moves · P' + classification.period : classification.kind === 'extinct' ? 'Extinct · G' + classification.step : 'Still evolving';
    var summary = classification.kind === 'still' ? 'Evolution pulse for 16 generations: population remains ' + points[0].population + '; detected still life with period 1.' : classification.kind === 'oscillator' ? 'Evolution pulse for 16 generations: detected oscillator with period ' + classification.period + '.' : classification.kind === 'spaceship' ? 'Evolution pulse for 16 generations: detected spaceship moving ' + classification.dr + ' rows and ' + classification.dc + ' columns every ' + classification.period + ' generations.' : classification.kind === 'extinct' ? 'Evolution pulse for 16 generations: population reaches zero at generation ' + classification.step + '.' : 'Evolution pulse for 16 generations: no repeated state or translated shape detected; population changes from ' + points[0].population + ' to ' + points[points.length - 1].population + '.';
    var maxPopulation = 1, maxTurnover = 1;
    points.forEach(function (point) { maxPopulation = Math.max(maxPopulation, point.population); maxTurnover = Math.max(maxTurnover, point.turnover); });
    return { points: points, frames:frames, frameBounds:{ minR:frameMinR, minC:frameMinC, maxR:frameMaxR, maxC:frameMaxC, width:frameMaxC-frameMinC+1, height:frameMaxR-frameMinR+1 }, kind: classification.kind, period: classification.period == null ? null : classification.period, dr: classification.dr == null ? null : classification.dr, dc: classification.dc == null ? null : classification.dc, detectedAt: classification.step == null ? null : classification.step, maxPopulation: maxPopulation, maxTurnover: maxTurnover, shortLabel: shortLabel, summary: summary };
  }  function cachedPatternJourney(key, steps) {
    var count = Math.max(1, steps || 16), cacheKey = key + '_' + count;
    if (!PATTERN_JOURNEY_CACHE[cacheKey]) PATTERN_JOURNEY_CACHE[cacheKey] = analyzePatternJourney(LIFE_PATTERNS[key], count);
    return PATTERN_JOURNEY_CACHE[cacheKey];
  }
  function analyzeLifeForecastMotion(currentGrid, series, horizon, wrap) {
    var limit = Math.max(0, Math.min((series || []).length, horizon || 0)), points = [], origin = currentGrid && currentGrid.length && currentGrid[0] ? populationBounds(currentGrid) : null;
    if (origin) points.push({ step: 0, centerR: origin.centerR, centerC: origin.centerC, population: origin.pop });
    for (var index = 0; index < limit; index++) {
      var scan = series[index] && series[index].grid ? populationBounds(series[index].grid) : null;
      if (scan) points.push({ step: index + 1, centerR: scan.centerR, centerC: scan.centerC, population: scan.pop });
    }
    var selectedScan = limit && series[limit - 1] && series[limit - 1].grid ? populationBounds(series[limit - 1].grid) : null;
    if (!origin || !selectedScan) return { points: points, horizon: limit, deltaRow: null, deltaCol: null, distance: null, extinct: !selectedScan, selectedBounds: selectedScan };
    var deltaRow = selectedScan.centerR - origin.centerR, deltaCol = selectedScan.centerC - origin.centerC;
    if (wrap) {
      var rowCount = currentGrid.length, colCount = rowCount ? currentGrid[0].length : 0;
      if (rowCount && Math.abs(deltaRow) > rowCount / 2) deltaRow += deltaRow > 0 ? -rowCount : rowCount;
      if (colCount && Math.abs(deltaCol) > colCount / 2) deltaCol += deltaCol > 0 ? -colCount : colCount;
    }
    return { points: points, horizon: limit, deltaRow: deltaRow, deltaCol: deltaCol, distance: Math.sqrt(deltaRow * deltaRow + deltaCol * deltaCol), extinct: false, selectedBounds: selectedScan };
  }  function analyzeLifeForecastResidency(series, horizon) {
    var limit = Math.max(0, Math.min((series || []).length, horizon || 0));
    var sample = limit && series[0] && series[0].grid, counts = sample ? emptyGrid(sample.length, sample[0].length) : [];
    for (var step = 0; step < limit; step++) for (var r = 0; r < series[step].grid.length; r++) for (var c = 0; c < series[step].grid[r].length; c++) if (series[step].grid[r][c]) counts[r][c]++;
    var activeCells = 0, persistentCells = 0;
    for (var row = 0; row < counts.length; row++) for (var col = 0; col < counts[row].length; col++) if (counts[row][col]) { activeCells++; if (counts[row][col] === limit) persistentCells++; }
    return { grid: counts, horizon: limit, activeCells: activeCells, persistentCells: persistentCells };
  }  function compareLifeStates(current, projected) {
    var retained = 0, appeared = 0, gone = 0;
    for (var r = 0; r < (current || []).length; r++) for (var c = 0; c < current[r].length; c++) {
      if (current[r][c] && projected[r][c]) retained++;
      else if (!current[r][c] && projected[r][c]) appeared++;
      else if (current[r][c] && !projected[r][c]) gone++;
    }
    return { retained: retained, appeared: appeared, gone: gone, population: retained + appeared };
  }
  function projectLifeFuture(grid, ages, steps, wrap, birthRule, survivalRule) {
    var current = (grid || []).map(function (row) { return row.slice(); });
    var currentAges = ages ? ages.map(function (row) { return row.slice(); }) : null, out = [];
    for (var step = 1; step <= Math.max(0, steps || 0); step++) {
      var next = stepLifeDetailed(current, currentAges, wrap, birthRule, survivalRule);
      out.push({ step: step, population: countPop(next.grid), turnover: next.born + next.died, births: next.born, survived: next.survived, deaths: next.died, grid: next.grid, ages: next.ages });
      current = next.grid; currentAges = next.ages;
    }
    return out;
  }
  window.__alloCellularPure = { emptyGrid: emptyGrid, randomGrid: randomGrid, countPop: countPop, populationBounds: populationBounds, shapeFingerprint: shapeFingerprint, detectDynamics: detectDynamics, neighborCount: neighborCount, stepLife: stepLife, stepLifeDetailed: stepLifeDetailed, parseLifeRule: parseLifeRule, gridSignature: gridSignature, stampPattern: stampPattern, ruleToBits: ruleToBits, bitsToRule: bitsToRule, stepRuleRow: stepRuleRow, buildCaRows: buildCaRows, caCellCause: caCellCause, caCounterfactualInfluence: caCounterfactualInfluence, analyzeCaSensitivityRow: analyzeCaSensitivityRow, caRuleSensitivityProfile: caRuleSensitivityProfile, caCausalCone: caCausalCone, caCellTransition: caCellTransition, caTemporalChangeCells: caTemporalChangeCells, analyzeCaRows: analyzeCaRows, analyzeLifePhase: analyzeLifePhase, analyzePatternEvolution: analyzePatternEvolution, analyzePatternJourney: analyzePatternJourney, analyzeLifeForecastMotion: analyzeLifeForecastMotion, analyzeLifeForecastResidency: analyzeLifeForecastResidency, compareLifeStates: compareLifeStates, projectLifeFuture: projectLifeFuture, patterns: LIFE_PATTERNS };

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
