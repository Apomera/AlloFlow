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
  var PATTERN_ORDER = ['glider','lwss','blinker','toad','beacon','pulsar','block','beehive','loaf','rpentomino','gosperGun'];

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

  function stepLife(g, wrap) {
    var rows = g.length, cols = g[0].length;
    var out = emptyGrid(rows, cols);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var n = 0;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            var rr = r + dr, cc = c + dc;
            if (wrap) { rr = (rr + rows) % rows; cc = (cc + cols) % cols; }
            else if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
            n += g[rr][cc];
          }
        }
        out[r][c] = (g[r][c] ? (n === 2 || n === 3) : (n === 3)) ? 1 : 0;
      }
    }
    return out;
  }

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

    // Life
    var ROWS = 26, COLS = 36, PX = 16;
    var sGrid = useState(function () { return stampPattern(emptyGrid(ROWS, COLS), 'glider', 2, 2); });
    var grid = sGrid[0], setGrid = sGrid[1];
    var sGen = useState(0); var gen = sGen[0], setGen = sGen[1];
    var sRun = useState(false); var running = sRun[0], setRunning = sRun[1];
    var sSpeed = useState(120); var speed = sSpeed[0], setSpeed = sSpeed[1];
    var sWrap = useState(true); var wrap = sWrap[0], setWrap = sWrap[1];
    var sBrush = useState(1); var brush = sBrush[0], setBrush = sBrush[1]; // 1 draw, 0 erase
    var sCursor = useState([13, 18]); var cursor = sCursor[0], setCursor = sCursor[1];
    var sStamp = useState('glider'); var stampKey = sStamp[0], setStampKey = sStamp[1];
    var sPopHist = useState([]); var popHist = sPopHist[0], setPopHist = sPopHist[1]; // live-cell count per generation (capped)

    // Elementary CA
    var CA_COLS = 81, CA_ROWS = 60, CA_PX = 6;
    var sRule = useState(30); var rule = sRule[0], setRule = sRule[1];
    var sCaSeed = useState('single'); var caSeed = sCaSeed[0], setCaSeed = sCaSeed[1];
    var bits = ruleToBits(rule);
    // Elementary CA uses a fixed 0-padded boundary (textbook default) so the
    // diagram is NOT silently coupled to the Life-tab wrap toggle.
    var caRows = React.useMemo(function () { return buildCaRows(rule, caSeed, CA_ROWS, CA_COLS, false); }, [rule, caSeed]);

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
      var id = setInterval(function () {
        setGrid(function (g) { return stepLife(g, wrap); });
        setGen(function (x) { return x + 1; });
      }, Math.max(40, speed));
      return function () { clearInterval(id); };
    }, [running, speed, wrap]);

    // auto-stop when every cell has died (pure-updater-safe)
    useEffect(function () {
      if (running && countPop(grid) === 0) { setRunning(false); announce('All cells died — paused.'); }
    }, [grid, running, announce]);

    // record live-cell population per generation for the population sparkline.
    // Keyed on `gen` (grid updates in the same batched render) so painting between
    // generations doesn't double-count; gen===0 (reset/clear/new pattern) restarts it.
    useEffect(function () {
      setPopHist(function (h) {
        var p = countPop(grid);
        return gen === 0 ? [p] : h.concat([p]).slice(-90);
      });
    }, [gen]);

    // record generations-run milestone whenever gen advances past thresholds
    useEffect(function () {
      if (gen >= 50) markQuest('ranLong', { maxGen: gen });
      else if (gen > 0) markQuest(null, { maxGen: gen });
    }, [gen, markQuest]);

    // ── Life cell ops ──
    function toggleCell(r, c, val) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      setGrid(function (g) {
        if (g[r][c] === val) return g;
        var ng = g.map(function (row) { return row.slice(); });
        ng[r][c] = val;
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

    function stepOnce() {
      setGrid(function (g) { var ng = stepLife(g, wrap); if (countPop(ng) === 0) announce('All cells died.'); return ng; });
      setGen(function (x) { return x + 1; });
    }
    function clearGrid() { setRunning(false); setGrid(emptyGrid(ROWS, COLS)); setGen(0); announce('Grid cleared.'); }
    function randomize() {
      setRunning(false);
      setGrid(randomGrid(ROWS, COLS, 0.30));
      setGen(0); announce('Random soup placed.'); markQuest('randomized');
    }
    function loadPattern(key) {
      setRunning(false);
      var pat = LIFE_PATTERNS[key]; if (!pat) return;
      var r0 = Math.max(0, Math.floor((ROWS - pat.h) / 2));
      var c0 = Math.max(0, Math.floor((COLS - pat.w) / 2));
      setGrid(stampPattern(emptyGrid(ROWS, COLS), key, r0, c0));
      setGen(0); setStampKey(key); setTab('life');
      announce('Loaded ' + pat.name + '.');
      markQuest('stamped'); if (pat.kind === 'gun') markQuest('sawGun'); if (pat.kind === 'spaceship') markQuest('sawShip');
    }
    function toggleRun() {
      var nr = !running; setRunning(nr); announce(nr ? 'Running.' : 'Paused at generation ' + gen + '.');
    }

    var pop = countPop(grid);

    // ── elementary CA ops ──
    function setRuleSafe(n) { var v = clampRule(n); setRule(v); markQuest('exploredRule'); if (v === 110) markQuest('saw110'); }
    function toggleRuleBit(i) {
      var nb = bits.slice(); nb[i] = nb[i] ? 0 : 1;
      setRuleSafe(bitsToRule(nb));
    }

    // ════════════════════ SUB-RENDERERS ════════════════════
    function btn(label, onClick, opts) {
      opts = opts || {};
      return h('button', {
        type: 'button', onClick: onClick,
        'aria-pressed': opts.pressed === undefined ? undefined : !!opts.pressed,
        title: opts.title || label,
        style: {
          padding: '7px 12px', borderRadius: '9px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
          border: '1px solid ' + (opts.primary ? C.accent : C.border),
          background: opts.pressed ? C.accent : (opts.primary ? C.accent : C.panel),
          color: (opts.pressed || opts.primary) ? '#ffffff' : C.text,
          whiteSpace: 'nowrap'
        }
      }, label);
    }

    function renderLifeGrid() {
      var W = COLS * PX, H = ROWS * PX;
      var rects = [];
      // background
      rects.push(h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.dead }));
      // grid lines (light) — drawn as a single path for DOM economy
      var lines = '';
      for (var gx = 0; gx <= COLS; gx++) lines += 'M' + (gx * PX) + ' 0V' + H;
      for (var gy = 0; gy <= ROWS; gy++) lines += 'M0 ' + (gy * PX) + 'H' + W;
      rects.push(h('path', { key: 'grid', d: lines, stroke: C.grid, strokeWidth: 1, fill: 'none', opacity: dark ? 0.5 : 0.8 }));
      // live cells
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (grid[r][c]) {
            rects.push(h('rect', {
              key: 'l' + r + '_' + c, x: c * PX + 1, y: r * PX + 1, width: PX - 2, height: PX - 2, rx: 2,
              className: 'born',
              fill: C.live
            }));
          }
        }
      }
      // empty-state hint (only when no cells are alive; default seed has a glider so the golden is unaffected)
      if (pop === 0) {
        rects.push(h('text', { key: 'empty', x: W / 2, y: H / 2, textAnchor: 'middle', fill: C.sub, style: { fontSize: '13px', fontStyle: 'italic' } }, 'Click or drag to draw cells — or press Random'));
      }
      // cursor
      rects.push(h('rect', {
        key: 'cursor', x: cursor[1] * PX, y: cursor[0] * PX, width: PX, height: PX,
        fill: 'none', stroke: C.cursor, strokeWidth: 2, rx: 2,
        style: { pointerEvents: 'none', filter: 'drop-shadow(0 0 3px ' + C.cursor + ')' }
      }));
      return h('svg', {
        ref: gridSvgRef, className: 'cellularlab-svg',
        viewBox: '0 0 ' + W + ' ' + H, width: '100%',
        role: 'img',
        'aria-roledescription': 'editable Game of Life grid',
        'aria-label': 'Game of Life grid, ' + ROWS + ' by ' + COLS + ' cells, ' + pop + ' alive. Click or drag to draw; arrow keys move a cursor, space toggles.',
        tabIndex: 0,
        onKeyDown: onGridKeyDown,
        onMouseDown: onGridPointerDown, onMouseMove: onGridPointerMove, onMouseUp: onGridPointerUp, onMouseLeave: onGridPointerUp,
        onTouchStart: function (e) { if (e.preventDefault) e.preventDefault(); onGridPointerDown(e); },
        onTouchMove: function (e) { if (e.preventDefault) e.preventDefault(); onGridPointerMove(e); },
        onTouchEnd: onGridPointerUp,
        style: {
          maxWidth: '560px', width: '100%', height: 'auto', borderRadius: '10px',
          border: '1px solid ' + C.border, touchAction: 'none', display: 'block',
          background: C.dead, cursor: 'crosshair'
        }
      }, rects);
    }

    function statChip(label, value) {
      return h('div', { key: label, style: { background: C.dead, border: '1px solid ' + C.border, borderRadius: '9px', padding: '6px 10px', minWidth: '74px', textAlign: 'center' } },
        h('div', { style: { fontSize: '10px', color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' } }, label),
        h('div', { style: { fontSize: '17px', color: C.text, fontWeight: 800 } }, value));
    }

    function renderLifeTab() {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          statChip('Generation', gen),
          statChip('Population', pop),
          h('div', { style: { flex: 1 } }),
          h('div', { 'aria-hidden': 'true', style: { fontSize: '11px', color: C.sub, maxWidth: '230px', lineHeight: 1.4 } },
            'A cell lives with 2–3 neighbours, is born with exactly 3, otherwise dies.')
        ),
        popHist.length > 1 && (function () {
          var W = 320, H = 44, pad = 3, n = popHist.length;
          var maxP = Math.max.apply(null, popHist) || 1;
          var sx = function (i) { return pad + (n === 1 ? 0 : i / (n - 1)) * (W - 2 * pad); };
          var sy = function (p) { return pad + (1 - p / maxP) * (H - 2 * pad); };
          var pts = popHist.map(function (p, i) { return sx(i).toFixed(1) + ',' + sy(p).toFixed(1); }).join(' ');
          return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('div', { style: { fontSize: '10px', color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' } }, 'Population history'),
            h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { flex: 1, height: H + 'px', maxWidth: '100%' }, role: 'img', 'aria-label': 'Live-cell population over the last ' + n + ' generations; currently ' + pop + ', peak ' + maxP + '.' },
              h('polyline', { points: pts, fill: 'none', stroke: '#22c55e', strokeWidth: 1.5 }),
              h('circle', { cx: sx(n - 1), cy: sy(popHist[n - 1]), r: 2.5, fill: '#22c55e' })),
            h('div', { style: { fontSize: '10px', color: C.sub, fontWeight: 700, whiteSpace: 'nowrap' } }, 'peak ' + maxP));
        })(),
        renderLifeGrid(),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          btn(running ? '⏸ Pause' : '▶ Play', toggleRun, { primary: true, title: running ? 'Pause the simulation' : 'Run the simulation' }),
          btn('⏭ Step', stepOnce, { title: 'Advance one generation' }),
          btn('🎲 Random', randomize, { title: 'Fill with a random soup' }),
          btn('🧹 Clear', clearGrid, { title: 'Empty the grid' })
        ),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          btn('✏️ Draw', function () { setBrush(1); }, { pressed: brush === 1, title: 'Click to add cells' }),
          btn('🩹 Erase', function () { setBrush(0); }, { pressed: brush === 0, title: 'Click to remove cells' }),
          btn(wrap ? '🔁 Wrap: on' : '⬛ Wrap: off', function () { setWrap(function (w) { return !w; }); }, { pressed: wrap, title: 'Toggle edge wrapping (toroidal grid)' }),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: C.sub, fontWeight: 700 } },
            'Speed',
            h('input', {
              type: 'range', min: 40, max: 600, step: 20, value: 640 - speed,
              'aria-label': 'Simulation speed',
              'aria-valuetext': (speed <= 140 ? 'Fast' : speed <= 340 ? 'Medium' : 'Slow') + ', ' + speed + ' milliseconds per generation',
              onChange: function (e) { setSpeed(640 - parseInt(e.target.value, 10)); },
              style: { width: '120px' }
            }))
        ),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          h('span', { style: { fontSize: '12px', color: C.sub, fontWeight: 700 } }, 'Quick stamp:'),
          PATTERN_ORDER.slice(0, 6).map(function (k) {
            return h('button', { key: k, type: 'button', onClick: function () { loadPattern(k); },
              style: { padding: '5px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', border: '1px solid ' + C.border, background: C.panel, color: C.text } },
              LIFE_PATTERNS[k].name);
          })
        )
      );
    }

    // ── elementary CA tab ──
    function renderRuleTable() {
      // 8 neighbourhood columns, each a mini 3-cell pattern over an output cell
      var cells = [];
      for (var i = 7; i >= 0; i--) {
        var l = (i >> 2) & 1, m = (i >> 1) & 1, rt = i & 1, out = bits[i];
        var x = (7 - i) * 64;
        var col = [];
        [l, m, rt].forEach(function (v, j) {
          col.push(h('rect', { key: 'n' + i + '_' + j, x: x + 8 + j * 16, y: 6, width: 14, height: 14, rx: 2, fill: v ? C.live : C.dead, stroke: C.border, strokeWidth: 1 }));
        });
        col.push(h('rect', { key: 'o' + i, x: x + 24, y: 30, width: 14, height: 14, rx: 2, fill: out ? C.live2 : C.dead, stroke: out ? C.live2 : C.border, strokeWidth: out ? 2 : 1 }));
        col.push(h('path', { key: 'a' + i, d: 'M' + (x + 31) + ' 22V28', stroke: C.sub, strokeWidth: 1.5 }));
        cells.push(h('g', {
          key: 'col' + i, role: 'button', tabIndex: 0,
          'aria-label': 'Neighbourhood ' + l + m + rt + ' produces ' + out + '. Activate to flip.',
          onClick: (function (idx) { return function () { toggleRuleBit(idx); }; })(i),
          onKeyDown: (function (idx) { return function (e) { if (e.key === ' ' || e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); toggleRuleBit(idx); } }; })(i),
          style: { cursor: 'pointer' }
        }, col));
      }
      return h('svg', { viewBox: '0 0 512 52', width: '100%', role: 'group', 'aria-label': 'Rule table for rule ' + rule + '. Each column maps a 3-cell neighbourhood to the next cell. Click a column to flip its output.', style: { maxWidth: '520px', display: 'block' } }, cells);
    }

    function renderCaDiagram() {
      var W = CA_COLS * CA_PX, H = CA_ROWS * CA_PX;
      var rects = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.dead })];
      for (var r = 0; r < caRows.length; r++) {
        for (var c = 0; c < CA_COLS; c++) {
          if (caRows[r][c]) rects.push(h('rect', { key: r + '_' + c, x: c * CA_PX, y: r * CA_PX, width: CA_PX, height: CA_PX, fill: C.live }));
        }
      }
      return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img',
        'aria-label': 'Space-time diagram for rule ' + rule + '. Time runs downward; each row is the next generation.',
        style: { maxWidth: '560px', width: '100%', height: 'auto', borderRadius: '10px', border: '1px solid ' + C.border, display: 'block', background: C.dead } }, rects);
    }

    function renderRulesTab() {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } },
          'A 1-D world: every cell looks at itself and its two neighbours, then a rule decides if it lives next. There are exactly 256 such rules.'),
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
          h('label', { style: { fontSize: '13px', fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: '8px' } },
            'Rule',
            h('input', { type: 'number', min: 0, max: 255, value: rule, 'aria-label': 'Wolfram rule number 0 to 255',
              onChange: function (e) { setRuleSafe(e.target.value); },
              style: { width: '74px', padding: '6px 8px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '15px', fontWeight: 800 } })),
          btn(caSeed === 'single' ? '● Single seed' : '▦ Random seed', function () { setCaSeed(function (s) { return s === 'single' ? 'random' : 'single'; }); }, { title: 'Toggle the starting row' }),
          h('div', { style: { fontSize: '12px', color: C.sub } }, 'binary ', h('code', { style: { color: C.text, fontWeight: 800 } }, ('00000000' + rule.toString(2)).slice(-8)))
        ),
        renderRuleTable(),
        renderCaDiagram(),
        h('div', { style: { fontSize: '11px', color: C.sub, marginTop: '-4px', textAlign: 'center' } },
          'Rule ' + rule + ' · ' + CA_ROWS + ' generations · time runs downward (top row = start)'),
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
        learnCard('The edge of chaos',
          'Class 4 rules sit between boring order (Class 1–2) and pure chaos (Class 3). That narrow band is where moving structures can carry information — which is why both Rule 110 and Conway\'s Life are powerful enough to compute anything a computer can.'),
        learnCard('Where this shows up for real',
          'Modelling forest fires and traffic jams, generating textures and terrain in games, error-correcting codes, simulating crystal growth and fluid flow, and as a gentle on-ramp to the big idea that complex behaviour need not have a complex cause.')
      );
    }

    // ════════════════════ SHELL ════════════════════
    var TABS = [
      { id: 'life', label: 'Life', icon: '🦠' },
      { id: 'rules', label: 'Rules', icon: '📜' },
      { id: 'patterns', label: 'Patterns', icon: '✨' },
      { id: 'learn', label: 'Learn', icon: '📖' }
    ];
    var body = tab === 'life' ? renderLifeTab()
      : tab === 'rules' ? renderRulesTab()
      : tab === 'patterns' ? renderPatternsTab()
      : renderLearnTab();
    var cellularRoutes = [
      { id: 'life', label: 'Life grid', detail: 'Draw, stamp, run.' },
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
          focusMetric('Rule', 'R' + rule))
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
              border: '1px solid ' + (active ? C.accent : 'transparent'), borderBottom: 'none',
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
    for (var c = 0; c < cols; c++) {
      if (seed === 'single') first.push(c === Math.floor(cols / 2) ? 1 : 0);
      else first.push(pseudo(c * 7.13 + rule * 0.7) < 0.5 ? 1 : 0);
    }
    var out = [first];
    for (var r = 1; r < rows; r++) out.push(stepRuleRow(out[r - 1], bits, !!wrap));
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REGISTER
  // ═══════════════════════════════════════════════════════════════════════
  window.StemLab.registerTool('cellularLab', {
    icon: '🧫',
    label: 'Cellular Automaton Lab',
    desc: "Watch complexity emerge from tiny rules: Conway's Game of Life (draw cells, stamp gliders & a Gosper gun, play/step/wrap) plus elementary 1-D Wolfram rules 0–255 with live rule tables and space-time diagrams. Pattern gallery + Wolfram-class explainer.",
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
      { id: 'cell_110', label: 'View Rule 110 (Turing-complete)', icon: '🧠',
        check: function (d) { return !!(d && d.saw110); },
        progress: function (d) { return (d && d.saw110) ? '✓' : 'pending'; } }
    ],
    render: function (ctx) {
      return ctx.React.createElement(CellularLab, { ctx: ctx });
    }
  });
})();
