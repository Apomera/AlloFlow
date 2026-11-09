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
// Architecture notes (matches the STEAM Lab plugin contract):
//   - registerTool('cellularLab', { … , render(ctx) })
//   - render returns a React component element; the component owns all
//     transient sim state via React hooks (ctx.React.useState/useEffect).
//   - Persisted state lives in ctx.toolData._cellularLab: quest milestones
//     (write-once), plus (2026-11-03) an XP ledger, level, teacher settings,
//     run log, prediction cards, investigations, missions and practice stats.
//     Nothing is written per generation.
//   - 2026-11-03 deep pass: Practice / Investigate / Missions / Teacher tabs,
//     seeded soups, fast typed-array engine (lifeRun), real-world models,
//     roving-cursor grid, full i18n (stem.cellular.*), sonification.
//   - 2026-11-03 stage B: More worlds tab (Seeds, Brian's Brain, any B/S/C
//     rule on Moore or von Neumann neighbourhoods, Langton's ant with a
//     measured highway, a 9-12 rule hunt), K-5 glider mission, forest-model
//     critique (CER), one-row seed grid, translated atlas labels, PNG fallback.
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
      '@media (max-width: 720px) { [data-cellularlab-focus-panel] { grid-template-columns: 1fr !important; } [data-cellularlab-route-grid] { grid-template-columns: 1fr !important; } [data-cellularlab-status-grid] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }',
      '[data-cellularlab-tool] button:focus-visible, [data-cellularlab-tool] input:focus-visible, [data-cellularlab-tool] select:focus-visible, [data-cellularlab-tool] textarea:focus-visible, [data-cellularlab-tool] [role="grid"]:focus-visible, [data-cellularlab-tool] [role="slider"]:focus-visible, [data-cellularlab-tool] g[role="button"]:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }',
      '[data-cellularlab-tool] g[role="button"]:focus-visible rect { stroke: #f59e0b; stroke-width: 3px; }',
      '[data-cell-life-row] { display: grid; grid-template-columns: minmax(0, 640px) minmax(240px, 1fr); grid-template-areas: "stage transport" "stage stats" "stage cards"; grid-template-rows: auto auto 1fr; gap: 12px; align-items: start; }',
      '[data-cell-life-row] > [data-cell-area="stage"] { grid-area: stage; } [data-cell-life-row] > [data-cell-area="transport"] { grid-area: transport; } [data-cell-life-row] > [data-cell-area="stats"] { grid-area: stats; } [data-cell-life-row] > [data-cell-area="cards"] { grid-area: cards; }',
      '@media (max-width: 720px) { [data-cell-life-row] { grid-template-columns: minmax(0, 1fr); grid-template-areas: "transport" "stage" "stats" "cards"; grid-template-rows: auto; } }',
      '[data-cellularlab-tool] summary { cursor: pointer; } [data-cellularlab-tool] summary:focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }',
      '@media (prefers-reduced-motion: reduce) { .cellularlab-svg rect.born { animation: none !important; } [data-cellularlab-tool] * { transition: none !important; } }'
    ].join('\n');
    if (document.head) document.head.appendChild(_st);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  DATA
  // ═══════════════════════════════════════════════════════════════════════

  // Life patterns as live-cell offsets {r,c} from a top-left origin.
  var LIFE_PATTERNS = {
    glider:    { name: 'Glider', kind: 'spaceship', w: 3, h: 3,
      blurb: 'The smallest spaceship: it moves one cell diagonally every 4 generations.',
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
    // MWSS (11 cells) and HWSS (13 cells): until 2026-11-03 both carried a stray
    // cell at [2,0], so they exploded instead of flying.
    mwss:      { name: 'Middleweight spaceship', kind: 'spaceship', w: 6, h: 5,
      blurb: 'A larger spaceship: it moves 2 cells sideways every 4 generations.',
      cells: [[0,2],[1,0],[1,4],[2,5],[3,0],[3,5],[4,1],[4,2],[4,3],[4,4],[4,5]] },
    hwss:      { name: 'Heavyweight spaceship', kind: 'spaceship', w: 7, h: 5,
      blurb: 'The largest of the basic sideways spaceships: 2 cells every 4 generations.',
      cells: [[0,2],[0,3],[1,0],[1,5],[2,6],[3,0],[3,6],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6]] },
    // Methuselah and gun blurbs say what an ENDLESS plane does and where this
    // finite lab can (or cannot) reproduce it; tests run every claim.
    acorn:     { name: 'Acorn', kind: 'methuselah', w: 7, h: 3,
      blurb: 'Only seven cells, yet on an endless plane it keeps changing for 5,206 generations. That needs a far bigger world than this lab, so here its gliders reach the edges and it settles much sooner.',
      cells: [[0,1],[1,3],[2,0],[2,1],[2,4],[2,5],[2,6]] },
    diehard:   { name: 'Diehard', kind: 'methuselah', w: 8, h: 3,
      blurb: 'Seven cells that vanish completely at generation 130, on every grid size here.',
      cells: [[0,6],[1,0],[1,1],[2,1],[2,5],[2,6],[2,7]] },
    pihept:    { name: 'Pi-heptomino', kind: 'methuselah', w: 3, h: 3,
      blurb: 'A seven-cell seed that settles after 173 generations, here on any grid of 60 × 60 or larger.',
      cells: [[0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,2]] },
    rpentomino:{ name: 'R-pentomino', kind: 'methuselah', w: 3, h: 3,
      blurb: 'Five cells that keep changing for 1,103 generations on an endless plane. Load it on 120 × 120 with fixed edges to reproduce that number here.',
      fits: { size: 120, wrap: false },
      cells: [[0,1],[0,2],[1,0],[1,1],[2,1]] },
    gosperGun: { name: 'Gosper glider gun', kind: 'gun', w: 36, h: 9,
      blurb: 'Fires a new glider every 30 generations. On an endless plane it grows forever. Here, with fixed edges, the gliders vanish at the border and the gun keeps firing; with wrapping edges they fly round and wreck it.',
      fits: { wrap: false },
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
  // A typed rule number: the whole number 0-255, or null for an empty, partial
  // or out-of-range draft (the field keeps the draft instead of snapping to 30).
  function parseRuleNumber(text) {
    var s = String(text == null ? '' : text).trim();
    if (!/^\d{1,3}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= 0 && n <= 255 ? n : null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  i18n: module-level translator so pure text helpers can use ctx.t too.
  // ═══════════════════════════════════════════════════════════════════════
  var cellTranslate = null;
  function t(key, fallback) {
    var v = null;
    try { v = typeof cellTranslate === 'function' ? cellTranslate(key, fallback) : null; } catch (e) { v = null; }
    return (v == null || v === '' || v === key) ? fallback : v;
  }
  // Fills {name} placeholders with a replacer FUNCTION, so "$&" in a value is literal.
  // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
  function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
  function fmt(template, values) {
    return __alloOneWord(String(template).replace(/\{(\w+)\}/g, function (m, name) { return values && values[name] != null ? String(values[name]) : m; }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SEEDED RANDOMNESS (reproducible soups: same seed, same soup)
  // ═══════════════════════════════════════════════════════════════════════
  function mulberry32(seed) {
    var a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normSeed(seed) { var n = Math.floor(Math.abs(Number(seed))); return isFinite(n) && n > 0 ? (n % 1000000) || 1 : 1; }
  function seededRng(seed, salt) { return mulberry32((Math.imul(normSeed(seed), 2654435761) ^ (salt || 0)) >>> 0); }
  function clamp01(p) { p = Number(p); return isFinite(p) ? Math.max(0, Math.min(1, p)) : 0; }
  function soupGrid(rows, cols, density, seed) {
    var rnd = seededRng(seed, 0x51), p = clamp01(density), g = emptyGrid(rows, cols);
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) g[r][c] = rnd() < p ? 1 : 0;
    return g;
  }
  function seededRow(cols, density, seed) {
    var rnd = seededRng(seed, 0xca), p = clamp01(density), row = [];
    for (var c = 0; c < cols; c++) row.push(rnd() < p ? 1 : 0);
    return row;
  }
  function freshSeed() { return 1 + Math.floor(Math.random() * 999999); }

  // ═══════════════════════════════════════════════════════════════════════
  //  FAST LIFE ENGINE (flat typed arrays) for trials, jump-ahead and checks.
  //  Same rule as stepLifeDetailed; a test pins the two engines together.
  // ═══════════════════════════════════════════════════════════════════════
  function lifeRun(grid, opts) {
    opts = opts || {};
    var rows = grid.length, cols = rows ? grid[0].length : 0, n = rows * cols, wrap = !!opts.wrap;
    var births = parseLifeRule(opts.birth, '3'), survives = parseLifeRule(opts.survive, '23');
    var B = new Uint8Array(9), S = new Uint8Array(9);
    for (var k = 0; k <= 8; k++) { B[k] = births[k] ? 1 : 0; S[k] = survives[k] ? 1 : 0; }
    var cur = new Uint8Array(n), nxt = new Uint8Array(n);
    for (var r0 = 0; r0 < rows; r0++) for (var c0 = 0; c0 < cols; c0++) cur[r0 * cols + c0] = grid[r0][c0] ? 1 : 0;
    var up = new Int32Array(rows), down = new Int32Array(rows), left = new Int32Array(cols), right = new Int32Array(cols);
    for (var ri = 0; ri < rows; ri++) { up[ri] = ri > 0 ? ri - 1 : (wrap ? rows - 1 : -1); down[ri] = ri < rows - 1 ? ri + 1 : (wrap ? 0 : -1); }
    for (var ci = 0; ci < cols; ci++) { left[ci] = ci > 0 ? ci - 1 : (wrap ? cols - 1 : -1); right[ci] = ci < cols - 1 ? ci + 1 : (wrap ? 0 : -1); }
    function step() {
      for (var r = 0; r < rows; r++) {
        var ru = up[r], rd = down[r], base = r * cols, bu = ru * cols, bd = rd * cols;
        for (var c = 0; c < cols; c++) {
          var cl = left[c], cr = right[c], m = 0;
          if (ru >= 0) { if (cl >= 0) m += cur[bu + cl]; m += cur[bu + c]; if (cr >= 0) m += cur[bu + cr]; }
          if (cl >= 0) m += cur[base + cl];
          if (cr >= 0) m += cur[base + cr];
          if (rd >= 0) { if (cl >= 0) m += cur[bd + cl]; m += cur[bd + c]; if (cr >= 0) m += cur[bd + cr]; }
          nxt[base + c] = cur[base + c] ? S[m] : B[m];
        }
      }
      var tmp = cur; cur = nxt; nxt = tmp;
    }
    function hashOf() {
      var h1 = 2166136261, h2 = 5381, pop = 0;
      for (var i = 0; i < n; i++) if (cur[i]) { pop++; h1 = Math.imul(h1 ^ i, 16777619); h2 = (Math.imul(h2, 33) + i) | 0; }
      return { key: (h1 >>> 0) + ':' + (h2 >>> 0) + ':' + pop, pop: pop };
    }
    function toGrid() { var out = []; for (var r = 0; r < rows; r++) { var row = []; for (var c = 0; c < cols; c++) row.push(cur[r * cols + c]); out.push(row); } return out; }
    if (opts.exactSteps != null) {
      var peakPop = 0, stepPops = [];
      for (var s = 0; s < opts.exactSteps; s++) { step(); var sp = 0; for (var pi = 0; pi < n; pi++) sp += cur[pi]; stepPops.push(sp); if (sp > peakPop) peakPop = sp; }
      return { grid: toGrid(), steps: opts.exactSteps, peakPop: peakPop, pops: stepPops };
    }
    var maxGen = Math.max(0, opts.maxGen == null ? 1000 : opts.maxGen), every = Math.max(1, Math.ceil(maxGen / 400));
    var h0 = hashOf(), seen = {}, pops = [h0.pop], peak = h0.pop, result = null;
    seen[h0.key] = 0;
    if (!h0.pop) result = { lifetime: 0, end: 'extinct', period: null, endPop: 0 };
    for (var g = 1; !result && g <= maxGen; g++) {
      step();
      var hs = hashOf();
      if (g % every === 0) pops.push(hs.pop);
      if (hs.pop > peak) peak = hs.pop;
      if (!hs.pop) result = { lifetime: g, end: 'extinct', period: null, endPop: 0 };
      else if (seen[hs.key] != null) { var first = seen[hs.key]; result = { lifetime: first, end: g - first === 1 ? 'still' : 'cycle', period: g - first, endPop: hs.pop }; }
      else seen[hs.key] = g;
    }
    if (!result) result = { lifetime: null, end: 'unsettled', period: null, endPop: hashOf().pop };
    result.startPop = h0.pop; result.peakPop = peak; result.pops = pops; result.maxGen = maxGen;
    if (opts.keepGrid) result.grid = toGrid();
    return result;
  }
  function lifeJump(grid, steps, wrap, birth, survive) { return lifeRun(grid, { exactSteps: Math.max(0, steps | 0), wrap: wrap, birth: birth, survive: survive }).grid; }
  // Separate groups of live cells (8-connected; across the seam when wrapped).
  function countGroups(grid, wrap) {
    var rows = grid.length, cols = rows ? grid[0].length : 0, seen = new Uint8Array(rows * cols), groups = 0, largest = 0;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      if (!grid[r][c] || seen[r * cols + c]) continue;
      groups++; var size = 0, stack = [r * cols + c]; seen[r * cols + c] = 1;
      while (stack.length) {
        var idx = stack.pop(), rr = Math.floor(idx / cols), cc = idx % cols; size++;
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var nr = rr + dr, nc = cc + dc;
          if (wrap) { nr = (nr + rows) % rows; nc = (nc + cols) % cols; }
          else if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          var ni = nr * cols + nc;
          if (grid[nr][nc] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
        }
      }
      if (size > largest) largest = size;
    }
    return { groups: groups, largest: largest };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REAL-WORLD MODELS (missions): forest fire, Rule 184 traffic, epidemic.
  // ═══════════════════════════════════════════════════════════════════════
  // Forest fire: trees (1) catch from a burning (2) north/south/east/west
  // neighbour, then burn out (3). The whole left edge is lit at the start.
  function forestInit(size, density, seed) {
    var rnd = seededRng(seed, 0xf0), cells = [], trees = 0;
    for (var i = 0; i < size * size; i++) { var tree = rnd() < clamp01(density) ? 1 : 0; cells.push(tree); trees += tree; }
    var burning = 0;
    for (var r = 0; r < size; r++) if (cells[r * size] === 1) { cells[r * size] = 2; burning++; }
    return { model: 'forest', size: size, cells: cells, trees: trees, burning: burning, step: 0 };
  }
  function forestStep(st) {
    var size = st.size, cells = st.cells, out = cells.slice(), burning = 0;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
      var i = r * size + c;
      if (cells[i] === 2) out[i] = 3;
      else if (cells[i] === 1 && ((r > 0 && cells[i - size] === 2) || (r < size - 1 && cells[i + size] === 2) || (c > 0 && cells[i - 1] === 2) || (c < size - 1 && cells[i + 1] === 2))) { out[i] = 2; burning++; }
    }
    return { model: 'forest', size: size, cells: out, trees: st.trees, burning: burning, step: st.step + 1 };
  }
  function forestSummary(st) {
    var burnt = 0, crossed = false, size = st.size;
    for (var i = 0; i < st.cells.length; i++) if (st.cells[i] >= 2) burnt++;
    for (var r = 0; r < size; r++) if (st.cells[r * size + size - 1] >= 2) crossed = true;
    return { trees: st.trees, burnt: burnt, burnedFraction: st.trees ? burnt / st.trees : 0, crossed: crossed, steps: st.step, done: st.burning === 0 };
  }
  function forestRun(size, density, seed) {
    var st = forestInit(size, density, seed);
    while (st.burning > 0 && st.step < size * size) st = forestStep(st);
    return { state: st, summary: forestSummary(st) };
  }
  // Rule 184 traffic on a ring road: a car (1) moves one cell right when the
  // cell ahead is empty. Flow = cars that moved per cell per step.
  function trafficInit(length, density, seed) {
    var rnd = seededRng(seed, 0x18), cars = Math.round(clamp01(density) * length), order = [], row = [];
    for (var i = 0; i < length; i++) { order.push(i); row.push(0); }
    for (var j = length - 1; j > 0; j--) { var k = Math.floor(rnd() * (j + 1)), tmp = order[j]; order[j] = order[k]; order[k] = tmp; }
    for (var c = 0; c < cars; c++) row[order[c]] = 1;
    return row;
  }
  function trafficRun(length, density, seed, steps, warmup) {
    var row = trafficInit(length, density, seed), bits = ruleToBits(184), rowsOut = [row], flowSum = 0, counted = 0, cars = 0, stopped = 0;
    for (var i = 0; i < length; i++) cars += row[i];
    steps = steps || 200; warmup = warmup == null ? 100 : warmup;
    for (var s = 0; s < steps; s++) {
      var moved = 0; stopped = 0;
      for (var c = 0; c < length; c++) if (row[c]) { if (!row[(c + 1) % length]) moved++; else stopped++; }
      if (s >= warmup) { flowSum += moved / length; counted++; }
      row = stepRuleRow(row, bits, true);
      if (rowsOut.length < 60) rowsOut.push(row);
    }
    return { length: length, cars: cars, density: length ? cars / length : 0, flow: counted ? flowSum / counted : 0, stoppedFraction: cars ? stopped / cars : 0, rows: rowsOut };
  }
  // Epidemic: susceptible (0) people catch it from each infected (1) neighbour
  // (8 around) with chance beta per step, stay infectious for `days` steps,
  // then recover (2). Vaccinated people (3) never catch it.
  var EPI_BETA = 0.35, EPI_DAYS = 3;
  function epidemicInit(size, coverage, seed) {
    var rnd = seededRng(seed, 0xe9), cells = [], timers = [], vaccinated = 0, n = size * size;
    for (var i = 0; i < n; i++) { var v = rnd() < clamp01(coverage) ? 3 : 0; cells.push(v); timers.push(0); if (v === 3) vaccinated++; }
    var centre = Math.floor(size / 2) * size + Math.floor(size / 2), zero = -1, best = Infinity;
    for (var j = 0; j < n; j++) if (cells[j] === 0) { var dr = Math.floor(j / size) - Math.floor(size / 2), dc = j % size - Math.floor(size / 2), d = dr * dr + dc * dc; if (d < best || (d === best && j < zero)) { best = d; zero = j; } }
    if (zero >= 0) { cells[zero] = 1; timers[zero] = EPI_DAYS; }
    return { model: 'epidemic', size: size, cells: cells, timers: timers, vaccinated: vaccinated, everInfected: zero >= 0 ? 1 : 0, infected: zero >= 0 ? 1 : 0, peak: zero >= 0 ? 1 : 0, step: 0, rnd: rnd, centre: centre };
  }
  function epidemicStep(st) {
    var size = st.size, cells = st.cells, out = cells.slice(), timers = st.timers.slice(), newly = 0, infected = 0;
    for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) {
      var i = r * size + c;
      if (cells[i] === 1) { timers[i]--; if (timers[i] <= 0) out[i] = 2; continue; }
      if (cells[i] !== 0) continue;
      var k = 0;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; var nr = r + dr, nc = c + dc; if (nr >= 0 && nr < size && nc >= 0 && nc < size && cells[nr * size + nc] === 1) k++; }
      if (k && st.rnd() < 1 - Math.pow(1 - EPI_BETA, k)) { out[i] = 1; timers[i] = EPI_DAYS; newly++; }
    }
    for (var j = 0; j < out.length; j++) if (out[j] === 1) infected++;
    return { model: 'epidemic', size: size, cells: out, timers: timers, vaccinated: st.vaccinated, everInfected: st.everInfected + newly, infected: infected, peak: Math.max(st.peak, infected), step: st.step + 1, rnd: st.rnd };
  }
  function epidemicSummary(st) {
    var people = st.size * st.size - st.vaccinated;
    return { people: people, vaccinated: st.vaccinated, everInfected: st.everInfected, attackRate: people ? st.everInfected / people : 0, peak: st.peak, steps: st.step, done: st.infected === 0 };
  }
  function epidemicRun(size, coverage, seed) {
    var st = epidemicInit(size, coverage, seed);
    while (st.infected > 0 && st.step < 1000) st = epidemicStep(st);
    return { state: st, summary: epidemicSummary(st) };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ELEMENTARY CA: measured behaviour + Wolfram-class practice bank.
  // ═══════════════════════════════════════════════════════════════════════
  // Measured on a ring from a seeded random row: uniform (all one colour),
  // periodic (a later row repeats an earlier one, maybe shifted), or irregular.
  function caMeasure(rule, seed, cols, rows) {
    cols = cols || 81; rows = rows || 240;
    var out = buildCaRows(rule, seededRow(cols, 0.5, seed), rows, cols, true), last = out[rows - 1], uniform = true;
    for (var i = 1; i < cols; i++) if (last[i] !== last[0]) uniform = false;
    var density = 0, tail = Math.min(40, rows);
    for (var r = rows - tail; r < rows; r++) for (var c = 0; c < cols; c++) density += out[r][c];
    density /= tail * cols;
    if (uniform) return { kind: 'uniform', period: 1, shift: 0, density: density, rows: out };
    for (var p = 1; p <= 40; p++) {
      var prev = out[rows - 1 - p];
      for (var shift = -p; shift <= p; shift++) {
        var same = true;
        for (var x = 0; x < cols && same; x++) if (last[x] !== prev[((x - shift) % cols + cols) % cols]) same = false;
        if (same) return { kind: 'periodic', period: p, shift: shift, density: density, rows: out };
      }
    }
    return { kind: 'irregular', period: null, shift: null, density: density, rows: out };
  }
  // Standard examples of each class (class 4 = Rule 110 and its mirror and
  // complement images). A test checks classes 1-3 against caMeasure.
  var CLASS_BANK = { 1: [0, 8, 32, 40, 128, 136, 160, 168], 2: [2, 4, 12, 50, 56, 108, 184, 232], 3: [18, 22, 30, 45, 60, 90, 105, 126, 146, 150], 4: [110, 124, 137, 193] };
  function classOfRule(rule) { for (var k = 1; k <= 4; k++) if (CLASS_BANK[k].indexOf(rule) !== -1) return k; return null; }
  function makeClassProblem(seed) {
    var rnd = seededRng(seed, 0xc1), cls = 1 + Math.floor(rnd() * 4), bank = CLASS_BANK[cls];
    return { seed: normSeed(seed), rule: bank[Math.floor(rnd() * bank.length)], cls: cls };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GENERATED PRACTICE: predict the next generation of a small board.
  // ═══════════════════════════════════════════════════════════════════════
  function neighbourCounts(board, wrap) { return board.map(function (row, r) { return row.map(function (v, c) { return neighborCount(board, r, c, wrap); }); }); }
  function makeNextGenProblem(seed, band) {
    var size = band === 'k5' ? 4 : band === 'g912' ? 6 : 5, rnd = seededRng(seed, 0x9e), birth = '3', survive = '23';
    if (band === 'g912' && rnd() < 0.3) birth = '36';
    var board = null, next = null;
    for (var tries = 0; tries < 80; tries++) {
      board = emptyGrid(size, size);
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) board[r][c] = rnd() < 0.42 ? 1 : 0;
      next = stepLifeDetailed(board, null, false, birth, survive);
      if (next.born >= 1 && next.died >= 1 && next.survived >= 1) break;
    }
    return { seed: normSeed(seed), size: size, birth: birth, survive: survive, board: board, next: next.grid, counts: neighbourCounts(board, false) };
  }
  // Grades an answer board and names the misconception behind each wrong cell.
  function gradeNextGen(problem, answer) {
    var tags = { overcrowd: 0, lonely: 0, missed_birth: 0, false_birth: 0, missed_survival: 0 }, wrong = 0;
    for (var r = 0; r < problem.size; r++) for (var c = 0; c < problem.size; c++) {
      var truth = problem.next[r][c] ? 1 : 0, ans = answer && answer[r] && answer[r][c] ? 1 : 0;
      if (truth === ans) continue;
      wrong++;
      var alive = !!problem.board[r][c], k = problem.counts[r][c];
      if (alive && ans) tags[k >= 4 ? 'overcrowd' : 'lonely']++;
      else if (alive) tags.missed_survival++;
      else if (ans) tags.false_birth++;
      else tags.missed_birth++;
    }
    var top = null;
    Object.keys(tags).forEach(function (k) { if (tags[k] && (!top || tags[k] > tags[top])) top = k; });
    return { correct: wrong === 0, wrong: wrong, tags: tags, top: top };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  TRIAL LOG + CSV
  // ═══════════════════════════════════════════════════════════════════════
  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function buildCsv(header, rows) { return [header.map(csvCell).join(',')].concat(rows.map(function (row) { return row.map(csvCell).join(','); })).join('\r\n'); }
  function fitRunLog(list) { return (Array.isArray(list) ? list : []).filter(function (r) { return r && typeof r === 'object' && typeof r.kind === 'string'; }).slice(-200); }

  // ═══════════════════════════════════════════════════════════════════════
  //  DESIGN CHALLENGES (pure verdicts; the component words the messages)
  //  s = { gen, initialSig, initialPop, sig, pop, peak, repeatOf }
  //  repeatOf = the earlier generation (since the start) with this exact grid.
  // ═══════════════════════════════════════════════════════════════════════
  function challengeVerdict(id, s) {
    if (!s || s.gen < 1) return null;
    var fail = function (code, v) { return { status: 'fail', code: code, values: v || {} }; };
    var ok = function (code, v) { return { status: 'success', code: code, values: v || {} }; };
    if (!s.initialPop) return fail('need_cells');
    if (id === 'still') {
      if (s.gen === 1) return s.sig === s.initialSig ? ok('still_ok') : fail('still_changed');
      return null;
    }
    if (id === 'oscillator') {
      if (!s.pop) return fail('osc_died', { gen: s.gen });
      if (s.gen === 1 && s.sig === s.initialSig) return fail('osc_is_still');
      if (s.gen >= 2 && s.sig === s.initialSig) return ok('osc_ok', { period: s.gen });
      if (s.gen >= 30) return fail('osc_timeout');
      return null;
    }
    if (id === 'extinction') {
      if (s.initialPop < 4) return fail('ext_need4');
      if (!s.pop) return s.gen === 1 ? fail('ext_too_fast') : ok('ext_ok', { gen: s.gen });
      if (s.repeatOf != null) return fail('ext_settled', { gen: s.repeatOf, period: s.gen - s.repeatOf });
      if (s.gen >= 200) return fail('ext_timeout');
      return null;
    }
    if (id === 'methuselah') {
      if (s.initialPop > 5) return fail('meth_too_many');
      if (!s.pop) return fail('meth_died', { gen: s.gen });
      if (s.repeatOf != null) return fail('meth_settled', { gen: s.repeatOf, period: s.gen - s.repeatOf });
      // shipOf = an earlier generation with the same shape somewhere else (a glider is a spaceship).
      if (s.shipOf != null) return fail('meth_ship', { gen: s.shipOf, period: s.gen - s.shipOf });
      if (s.gen >= 50) return ok('meth_ok', { cells: s.initialPop });
      return null;
    }
    if (id === 'maxpop') {
      if (s.initialPop !== 5) return fail('boom_need5');
      if (s.gen >= 50) return s.peak > 5 ? ok('boom_ok', { peak: s.peak }) : fail('boom_no_growth', { peak: s.peak });
      return null;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PREDICT → CHECK → EXPLAIN cards. The answer is never typed in: each
  //  card's check RUNS the model and the correct option is read off the run.
  // ═══════════════════════════════════════════════════════════════════════
  var PCE_CARDS = [
    { id: 'bigger', options: ['big', 'small', 'same'], bands: ['k5', 'g68', 'g912'] },
    { id: 'glider', options: ['slide', 'reborn'], bands: ['k5', 'g68', 'g912'] },
    { id: 'soup', options: ['still_random', 'sparse', 'full'], bands: ['k5', 'g68', 'g912'] },
    { id: 'edges', options: ['both', 'fixed_only', 'wrap_only'], bands: ['g68', 'g912'] },
    { id: 'rules', options: ['stripe', 'triangle', 'random'], bands: ['g68', 'g912'] }
  ];
  function centred(size, key) { var pat = LIFE_PATTERNS[key]; return stampPattern(emptyGrid(size, size), key, Math.max(0, Math.floor((size - pat.h) / 2)), Math.max(0, Math.floor((size - pat.w) / 2))); }
  var PCE_CACHE = {};
  function pceEvidence(id, seed) {
    var cacheKey = id + ':' + (id === 'soup' ? normSeed(seed) : 0);
    if (PCE_CACHE[cacheKey]) return PCE_CACHE[cacheKey];
    var ev = null;
    if (id === 'bigger') {
      var small = lifeRun(centred(120, 'rpentomino'), { wrap: false, maxGen: 1600 });
      var square = emptyGrid(120, 120); for (var r = 57; r < 63; r++) for (var c = 57; c < 63; c++) square[r][c] = 1;
      var big = lifeRun(square, { wrap: false, maxGen: 1600 });
      ev = { smallCells: small.startPop, smallLife: small.lifetime, smallEnd: small.end, bigCells: big.startPop, bigLife: big.lifetime, bigEnd: big.end };
      ev.answer = small.lifetime > big.lifetime ? 'small' : small.lifetime < big.lifetime ? 'big' : 'same';
    } else if (id === 'glider') {
      var g = centred(12, 'glider'), ages = ageGridFor(g), born = 0, died = 0, start = shapeFingerprint(g);
      for (var s = 0; s < 4; s++) { var nx = stepLifeDetailed(g, ages, false, '3', '23'); born += nx.born; died += nx.died; g = nx.grid; ages = nx.ages; }
      var oldest = 0; for (var ar = 0; ar < ages.length; ar++) for (var ac = 0; ac < ages[ar].length; ac++) if (g[ar][ac]) oldest = Math.max(oldest, ages[ar][ac]);
      var end = shapeFingerprint(g);
      // Life cells never change position, so a moving shape is births + deaths.
      ev = { born: born, died: died, oldest: oldest, sameShape: start.signature === end.signature, dr: end.minR - start.minR, dc: end.minC - start.minC, answer: born > 0 && died > 0 ? 'reborn' : 'slide' };
    } else if (id === 'soup') {
      var soup = soupGrid(40, 40, 0.35, seed), startPop = countPop(soup), later = lifeJump(soup, 500, true, '3', '23'), endPop = countPop(later);
      ev = { seed: normSeed(seed), startDensity: startPop / 1600, endDensity: endPop / 1600, startPop: startPop, endPop: endPop, groups: countGroups(later, true).groups };
      // "Thinned out" = at most half the starting density remains.
      ev.answer = ev.endDensity <= ev.startDensity * 0.5 ? 'sparse' : ev.endDensity > 0.85 ? 'full' : 'still_random';
    } else if (id === 'edges') {
      var wrapRun = lifeRun(centred(40, 'gosperGun'), { wrap: true, maxGen: 1200 }), fixedRun = lifeRun(centred(40, 'gosperGun'), { wrap: false, maxGen: 1200 });
      var firing = function (run) { return run.end === 'cycle' && run.period % 30 === 0; };
      ev = { wrapEnd: wrapRun.end, wrapLife: wrapRun.lifetime, wrapPop: wrapRun.endPop, wrapFiring: firing(wrapRun), fixedEnd: fixedRun.end, fixedPeriod: fixedRun.period, fixedPop: fixedRun.endPop, fixedFiring: firing(fixedRun) };
      ev.answer = ev.wrapFiring && ev.fixedFiring ? 'both' : ev.fixedFiring ? 'fixed_only' : ev.wrapFiring ? 'wrap_only' : 'neither';
    } else if (id === 'rules') {
      var rows = buildCaRows(30, 'single', 96, 193, false), centre = rows.map(function (row) { return row[96]; }), ones = centre.reduce(function (a, b) { return a + b; }, 0), repeats = false;
      for (var p = 1; p <= 24 && !repeats; p++) { var same = true; for (var i = 48; i < centre.length; i++) if (centre[i] !== centre[i - p]) { same = false; break; } if (same) repeats = true; }
      ev = { bits: centre.slice(0, 32).join(''), ones: ones, total: centre.length, repeats: repeats, entries: 8 };
      ev.answer = !repeats && ones / centre.length > 0.35 && ones / centre.length < 0.65 ? 'random' : 'stripe';
    }
    PCE_CACHE[cacheKey] = ev;
    return ev;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HOST / MOTION / BAND HELPERS
  // ═══════════════════════════════════════════════════════════════════════
  var SR_ONLY = { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };
  var BANDS = ['k5', 'g68', 'g912'];
  var TAB_ORDERS = {
    k5: ['life', 'missions', 'practice', 'worlds', 'patterns', 'investigate', 'learn', 'rules', 'teacher'],
    g68: ['life', 'practice', 'investigate', 'missions', 'worlds', 'patterns', 'rules', 'learn', 'teacher'],
    g912: ['life', 'rules', 'practice', 'worlds', 'missions', 'investigate', 'patterns', 'learn', 'teacher']
  };
  var NOTICE_IDS = ['n1', 'n2', 'n3', 'n4'];
  // Learning path ("Start here"): ordered steps per band, each ticked from
  // saved progress only (p = the _cellularLab slice, x = derived counts).
  function pathSteps(band, p, x) {
    p = p && typeof p === 'object' ? p : {}; x = x || {};
    var n = function (v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; };
    if (band === 'k5') return [
      { id: 'draw', tab: 'life', done: p.drew === true && n(p.maxGen) >= 10 },
      { id: 'notice', tab: 'life', focus: 'cell-notice', done: n(x.notice) >= 2, have: n(x.notice), need: 2 },
      { id: 'glider', tab: 'missions', mission: 'glider', done: x.gliderDone === true, have: Math.min(3, n(x.gliderSolved)), need: 3 }
    ];
    if (band === 'g912') return [
      { id: 'rulespace', tab: 'rules', done: p.exploredRule === true && p.saw110 === true },
      { id: 'classes', tab: 'practice', mode: 'classes', done: n(x.classSolved) >= 3, have: Math.min(3, n(x.classSolved)), need: 3 },
      { id: 'hunt', tab: 'worlds', view: 'hunt', done: x.huntCompared === true },
      { id: 'critique', tab: 'missions', mission: 'forest', focus: 'cell-ffmodel', done: x.ffDone === true }
    ];
    return [
      { id: 'challenges', tab: 'life', focus: 'cell-challenges', done: n(x.challenges) >= 2, have: Math.min(2, n(x.challenges)), need: 2 },
      { id: 'practice', tab: 'practice', mode: 'nextgen', done: n(x.ngSolved) >= 3, have: Math.min(3, n(x.ngSolved)), need: 3 },
      { id: 'cer', tab: 'investigate', done: n(x.cerDone) >= 1 },
      { id: 'missions', tab: 'missions', mission: 'forest', done: n(x.missionsDone) >= 1 }
    ];
  }
  // Langton's ant sonification: pitch follows the distance from the start
  // square, 220 Hz at the start, up one octave every 20 squares (max 3).
  function antPitch(st) { var d = Math.sqrt(st.r * st.r + st.c * st.c); return 220 * Math.pow(2, Math.min(3, d / 20)); }
  // A random-search estimate bucket for a rate per 12 rules.
  function huntBucket(k, n) { if (!n) return null; var r = k / n; return r >= 7 / 12 ? 'most' : r >= 2.5 / 12 ? 'few' : r > 0 ? 'one' : 'none'; }
  // ctx.gradeBand is 'k2' | 'g35' | 'g68' | 'g912'; no band = grades 6-8 view.
  function bandFromHost(gb) { gb = String(gb || '').toLowerCase(); return gb === 'k2' || gb === 'g35' ? 'k5' : gb === 'g912' ? 'g912' : 'g68'; }
  var PHONE_QUERY = '(max-width: 639px)', ZOOM_CELL_PX = 18;
  function phoneWidthNow() { try { var mq = typeof window !== 'undefined' && window.matchMedia && window.matchMedia(PHONE_QUERY); return !!(mq && mq.matches && /max-width/.test(String(mq.media))); } catch (e) { return false; } }
  function prefersReducedMotion() { try { return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  // Reduced motion: at most one generation per second while running.
  function tickDelay(speed) { var base = Math.max(40, speed || 120); return prefersReducedMotion() ? Math.max(1000, base) : base; }
  // Headless trial cap scales with grid area so one trial stays well under a second.
  function trialCap(size) { return size <= 60 ? 3000 : size <= 80 ? 2500 : 1600; }

  // ═══════════════════════════════════════════════════════════════════════
  //  TRANSLATED WORDS FOR DATA (keys are static literals for the scanner)
  // ═══════════════════════════════════════════════════════════════════════
  // Two-letter labels on the behaviour atlas (translated like every other word).
  function atlasAbbr(key) {
    switch (key) {
      case 'block': return t('stem.cellular.abbr_block', 'Bk');
      case 'beehive': return t('stem.cellular.abbr_beehive', 'Bh');
      case 'loaf': return t('stem.cellular.abbr_loaf', 'Lf');
      case 'boat': return t('stem.cellular.abbr_boat', 'Bt');
      case 'blinker': return t('stem.cellular.abbr_blinker', 'Bl');
      case 'toad': return t('stem.cellular.abbr_toad', 'Td');
      case 'beacon': return t('stem.cellular.abbr_beacon', 'Bc');
      case 'pulsar': return t('stem.cellular.abbr_pulsar', 'Pu');
      case 'glider': return t('stem.cellular.abbr_glider', 'Gl');
      case 'lwss': return t('stem.cellular.abbr_lwss', 'LW');
      case 'mwss': return t('stem.cellular.abbr_mwss', 'MW');
      case 'hwss': return t('stem.cellular.abbr_hwss', 'HW');
      case 'rpentomino': return t('stem.cellular.abbr_rpentomino', 'R');
      case 'acorn': return t('stem.cellular.abbr_acorn', 'Ac');
      case 'diehard': return t('stem.cellular.abbr_diehard', 'Di');
      case 'pihept': return t('stem.cellular.abbr_pihept', 'Pi');
      case 'gosperGun': return t('stem.cellular.abbr_gosperGun', 'GG');
      default: return String(patName(key)).slice(0, 2);
    }
  }
  function patName(key) {
    switch (key) {
      case 'glider': return t('stem.cellular.pat_glider_name', 'Glider');
      case 'lwss': return t('stem.cellular.pat_lwss_name', 'Lightweight spaceship');
      case 'blinker': return t('stem.cellular.pat_blinker_name', 'Blinker');
      case 'toad': return t('stem.cellular.pat_toad_name', 'Toad');
      case 'beacon': return t('stem.cellular.pat_beacon_name', 'Beacon');
      case 'pulsar': return t('stem.cellular.pat_pulsar_name', 'Pulsar');
      case 'block': return t('stem.cellular.pat_block_name', 'Block');
      case 'beehive': return t('stem.cellular.pat_beehive_name', 'Beehive');
      case 'loaf': return t('stem.cellular.pat_loaf_name', 'Loaf');
      case 'boat': return t('stem.cellular.pat_boat_name', 'Boat');
      case 'mwss': return t('stem.cellular.pat_mwss_name', 'Middleweight spaceship');
      case 'hwss': return t('stem.cellular.pat_hwss_name', 'Heavyweight spaceship');
      case 'acorn': return t('stem.cellular.pat_acorn_name', 'Acorn');
      case 'diehard': return t('stem.cellular.pat_diehard_name', 'Diehard');
      case 'pihept': return t('stem.cellular.pat_pihept_name', 'Pi-heptomino');
      case 'rpentomino': return t('stem.cellular.pat_rpentomino_name', 'R-pentomino');
      case 'gosperGun': return t('stem.cellular.pat_gosperGun_name', 'Gosper glider gun');
      default: return LIFE_PATTERNS[key] ? LIFE_PATTERNS[key].name : String(key || '');
    }
  }
  function patBlurb(key) {
    switch (key) {
      case 'glider': return t('stem.cellular.pat_glider_blurb', 'The smallest spaceship: it moves one cell diagonally every 4 generations.');
      case 'lwss': return t('stem.cellular.pat_lwss_blurb', 'Glides straight across the grid.');
      case 'blinker': return t('stem.cellular.pat_blinker_blurb', 'Period-2 oscillator: flips between a row and a column.');
      case 'toad': return t('stem.cellular.pat_toad_blurb', 'Period-2 oscillator.');
      case 'beacon': return t('stem.cellular.pat_beacon_blurb', 'Period 2: two blocks blink at each other.');
      case 'pulsar': return t('stem.cellular.pat_pulsar_blurb', 'Period-3 oscillator, one of the most common large ones.');
      case 'block': return t('stem.cellular.pat_block_blurb', 'The simplest still life: it never changes.');
      case 'beehive': return t('stem.cellular.pat_beehive_blurb', 'A stable still life.');
      case 'loaf': return t('stem.cellular.pat_loaf_blurb', 'A stable still life.');
      case 'boat': return t('stem.cellular.pat_boat_blurb', 'A compact five-cell still life.');
      case 'mwss': return t('stem.cellular.pat_mwss_blurb', 'A larger spaceship: it moves 2 cells sideways every 4 generations.');
      case 'hwss': return t('stem.cellular.pat_hwss_blurb', 'The largest of the basic sideways spaceships: 2 cells every 4 generations.');
      case 'acorn': return t('stem.cellular.pat_acorn_blurb', 'Only seven cells, yet on an endless plane it keeps changing for 5,206 generations. That needs a far bigger world than this lab, so here its gliders reach the edges and it settles much sooner.');
      case 'diehard': return t('stem.cellular.pat_diehard_blurb', 'Seven cells that vanish completely at generation 130, on every grid size here.');
      case 'pihept': return t('stem.cellular.pat_pihept_blurb', 'A seven-cell seed that settles after 173 generations, here on any grid of 60 × 60 or larger.');
      case 'rpentomino': return t('stem.cellular.pat_rpentomino_blurb', 'Five cells that keep changing for 1,103 generations on an endless plane. Load it on 120 × 120 with fixed edges to reproduce that number here.');
      case 'gosperGun': return t('stem.cellular.pat_gosperGun_blurb', 'Fires a new glider every 30 generations. On an endless plane it grows forever. Here, with fixed edges, the gliders vanish at the border and the gun keeps firing; with wrapping edges they fly round and wreck it.');
      default: return LIFE_PATTERNS[key] ? LIFE_PATTERNS[key].blurb : '';
    }
  }
  function caTransitionWords(tr) {
    switch (tr.kind) {
      case 'birth': return t('stem.cellular.tr_birth', 'born (0 to 1)');
      case 'death': return t('stem.cellular.tr_death', 'died (1 to 0)');
      case 'stable-live': return t('stem.cellular.tr_stable_live', 'stayed alive (1 to 1)');
      case 'stable-empty': return t('stem.cellular.tr_stable_empty', 'stayed empty (0 to 0)');
      case 'seed': return fmt(t('stem.cellular.tr_seed', 'seed value {v}'), { v: tr.current });
      default: return t('stem.cellular.tr_invalid', 'no cell');
    }
  }
  function kindName(kind) {
    switch (kind) {
      case 'still': return t('stem.cellular.kind_still', 'Still life');
      case 'oscillator': return t('stem.cellular.kind_oscillator', 'Oscillator');
      case 'spaceship': return t('stem.cellular.kind_spaceship', 'Spaceship');
      case 'methuselah': return t('stem.cellular.kind_methuselah', 'Methuselah');
      case 'gun': return t('stem.cellular.kind_gun', 'Gun');
      case 'extinct': return t('stem.cellular.kind_extinct', 'Extinct');
      case 'evolving': return t('stem.cellular.kind_evolving', 'Still evolving');
      default: return String(kind || '');
    }
  }
  // Dynamics detector words (detectDynamics returns codes + numbers).
  function dynWords(d, generation) {
    if (!d) return { label: '', detail: '' };
    switch (d.kind) {
      case 'ready': return { label: t('stem.cellular.dyn_ready', 'Ready'), detail: t('stem.cellular.dyn_ready_detail', 'Run or step to begin.') };
      case 'extinct': return { label: t('stem.cellular.dyn_extinct', 'Extinct'), detail: t('stem.cellular.dyn_extinct_detail', 'The population reached zero.') };
      case 'stable': return { label: t('stem.cellular.dyn_still', 'Still life'), detail: t('stem.cellular.dyn_still_detail', 'Unchanged after one generation.') };
      case 'oscillator': return { label: t('stem.cellular.dyn_osc', 'Oscillator'), detail: fmt(t('stem.cellular.dyn_osc_detail', 'Repeats every {p} generations.'), { p: d.period }) };
      case 'spaceship': return { label: t('stem.cellular.dyn_ship', 'Spaceship'), detail: fmt(t('stem.cellular.dyn_ship_detail', 'Moves {dr} rows and {dc} columns every {p} generations.'), { dr: d.dr, dc: d.dc, p: d.period }) };
      default: return { label: t('stem.cellular.dyn_evolving', 'Evolving'), detail: fmt(t('stem.cellular.dyn_evolving_detail', 'No repeat in the last {n} generations.'), { n: Math.min(100, generation || 0) }) };
    }
  }
  function journeyWords(j) {
    if (j.kind === 'still') return { short: t('stem.cellular.jr_still_short', 'Still, period 1'), summary: fmt(t('stem.cellular.jr_still', 'Over 16 generations the population stays at {n}: a still life with period 1.'), { n: j.points[0].population }) };
    if (j.kind === 'oscillator') return { short: fmt(t('stem.cellular.jr_osc_short', 'Oscillator, period {p}'), { p: j.period }), summary: fmt(t('stem.cellular.jr_osc', 'Over 16 generations: an oscillator with period {p}.'), { p: j.period }) };
    if (j.kind === 'spaceship') return { short: fmt(t('stem.cellular.jr_ship_short', 'Moves, period {p}'), { p: j.period }), summary: fmt(t('stem.cellular.jr_ship', 'Over 16 generations: a spaceship moving {dr} rows and {dc} columns every {p} generations.'), { dr: j.dr, dc: j.dc, p: j.period }) };
    if (j.kind === 'extinct') return { short: fmt(t('stem.cellular.jr_extinct_short', 'Extinct at generation {g}'), { g: j.detectedAt }), summary: fmt(t('stem.cellular.jr_extinct', 'The population reaches zero at generation {g}.'), { g: j.detectedAt }) };
    return { short: t('stem.cellular.jr_evolving_short', 'Still evolving'), summary: fmt(t('stem.cellular.jr_evolving', 'Over 16 generations no state repeats and no shape moves; the population changes from {a} to {b}.'), { a: j.points[0].population, b: j.points[j.points.length - 1].population }) };
  }
  function endWords(row) {
    switch (row.end) {
      case 'extinct': return t('stem.cellular.end_extinct', 'died out');
      case 'still': return t('stem.cellular.end_still', 'froze into still lifes');
      case 'cycle': return fmt(t('stem.cellular.end_cycle', 'repeats every {p} generations'), { p: row.period });
      case 'unsettled': return t('stem.cellular.end_unsettled', 'still changing at the cap');
      case 'uniform': return t('stem.cellular.end_uniform', 'became uniform');
      case 'periodic': return fmt(t('stem.cellular.end_periodic', 'repeats every {p} rows'), { p: row.period });
      case 'irregular': return t('stem.cellular.end_irregular', 'irregular, no repeat found');
      default: return String(row.end || '');
    }
  }
  function trialOutcome(row) {
    if (row.end === 'unsettled') return fmt(t('stem.cellular.trial_unsettled', 'started with {start} cells and was still changing at generation {cap}.'), { start: row.startPop, cap: row.cap });
    if (row.end === 'extinct') return fmt(t('stem.cellular.trial_extinct', 'started with {start} cells and died out at generation {gen}.'), { start: row.startPop, gen: row.lifetime });
    return fmt(t('stem.cellular.trial_settled', 'started with {start} cells and settled at generation {gen} with {end} cells ({how}).'), { start: row.startPop, gen: row.lifetime, end: row.endPop, how: endWords(row) });
  }
  function caKindWords(m) {
    if (m.kind === 'uniform') return t('stem.cellular.ca_uniform', 'every cell ends the same colour (like Class 1).');
    if (m.kind === 'periodic') return fmt(t('stem.cellular.ca_periodic', 'rows repeat every {p} steps, shifted {s} cells (like Class 2).'), { p: m.period, s: m.shift });
    return t('stem.cellular.ca_irregular', 'no repeat within 40 steps (Class 3 or 4 behaviour).');
  }
  function challengeName(id) {
    switch (id) {
      case 'still': return t('stem.cellular.ch_still', 'Still Life');
      case 'oscillator': return t('stem.cellular.ch_osc', 'Oscillator');
      case 'extinction': return t('stem.cellular.ch_ext', 'Extinction');
      case 'methuselah': return t('stem.cellular.ch_meth', 'Methuselah');
      case 'maxpop': return t('stem.cellular.ch_boom', 'Population Boom');
      default: return String(id || '');
    }
  }
  function challengeMessage(v) {
    var x = v.values || {};
    switch (v.code) {
      case 'need_cells': return t('stem.cellular.chm_need_cells', 'Place some live cells first, then step or run.');
      case 'still_ok': return t('stem.cellular.chm_still_ok', 'Still life confirmed: unchanged after one generation.');
      case 'still_changed': return t('stem.cellular.chm_still_changed', 'The pattern changed. In a still life every live cell needs 2 or 3 live neighbours, and no empty cell may have exactly 3.');
      case 'osc_ok': return fmt(t('stem.cellular.chm_osc_ok', 'Oscillator found: it changed, then came back after {period} generations.'), x);
      case 'osc_is_still': return t('stem.cellular.chm_osc_is_still', 'That pattern never changed, so it is a still life (period 1), not an oscillator. An oscillator must change and then come back.');
      case 'osc_died': return fmt(t('stem.cellular.chm_osc_died', 'Everything died at generation {gen}, so nothing came back.'), x);
      case 'osc_timeout': return t('stem.cellular.chm_osc_timeout', 'No return to the start within 30 generations. Try three cells in a row.');
      case 'ext_need4': return t('stem.cellular.chm_ext_need4', 'Start with at least 4 live cells; one or two lonely cells die at once, which is too easy.');
      case 'ext_too_fast': return t('stem.cellular.chm_ext_too_fast', 'Every cell died in the first step, so nothing was ever born or survived. Design a start that lives for at least one generation and then dies out.');
      case 'ext_ok': return fmt(t('stem.cellular.chm_ext_ok', 'Total extinction at generation {gen}.'), x);
      case 'ext_settled': return fmt(t('stem.cellular.chm_ext_settled', 'It settled into a repeating state at generation {gen} (period {period}), so it will never die out.'), x);
      case 'ext_timeout': return t('stem.cellular.chm_ext_timeout', 'Still alive after 200 generations.');
      case 'meth_too_many': return t('stem.cellular.chm_meth_too_many', 'Start with five cells or fewer.');
      case 'meth_died': return fmt(t('stem.cellular.chm_meth_died', 'It died out at generation {gen}. A methuselah keeps changing for a long time.'), x);
      case 'meth_settled': return fmt(t('stem.cellular.chm_meth_settled', 'It settled at generation {gen} into a pattern that repeats every {period} generations. A methuselah is still changing at generation 50.'), x);
      case 'meth_ship': return fmt(t('stem.cellular.chm_meth_ship', 'From generation {gen} the same shape just moves across the grid, every {period} generations: that is a spaceship. A methuselah keeps changing its shape for a long time.'), x);
      case 'meth_ok': return fmt(t('stem.cellular.chm_meth_ok', '{cells} cells were still changing at generation 50: a methuselah.'), x);
      case 'boom_need5': return t('stem.cellular.chm_boom_need5', 'Population Boom needs exactly five starting cells.');
      case 'boom_ok': return fmt(t('stem.cellular.chm_boom_ok', 'Five cells grew to a peak of {peak} cells by generation 50.'), x);
      case 'boom_no_growth': return fmt(t('stem.cellular.chm_boom_no_growth', 'The peak was only {peak} cells. Try a shape whose empty neighbours have exactly 3 live neighbours.'), x);
      default: return '';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  RULE FAMILIES (stage B): Life-like and "Generations" rules on a Moore
  //  (8 around) or von Neumann (4 around) neighbourhood. Seeds = B2/S,
  //  Brian's Brain = B2/S/C3 (alive -> dying -> off; only alive cells count).
  //  B0 is left out on purpose: it lights all empty space at once.
  // ═══════════════════════════════════════════════════════════════════════
  var NB_MOORE = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], NB_VN = [[-1, 0], [0, -1], [0, 1], [1, 0]];
  var FAMILY_PRESETS = {
    life: { birth: '3', survive: '23', states: 2 },
    seeds: { birth: '2', survive: '', states: 2 },
    brain: { birth: '2', survive: '', states: 3 }
  };
  var FAMILY_ORDER = ['life', 'seeds', 'brain'];
  function famRule(birth, survive, states, nb) {
    var vn = nb === 'vn', max = vn ? 4 : 8, B = new Uint8Array(9), S = new Uint8Array(9), b = '', s = '';
    String(birth == null ? '' : birth).split('').forEach(function (ch) { var n = parseInt(ch, 10); if (n >= 1 && n <= max) B[n] = 1; });
    String(survive == null ? '' : survive).split('').forEach(function (ch) { var n = parseInt(ch, 10); if (n >= 0 && n <= max) S[n] = 1; });
    for (var k = 0; k <= 8; k++) { if (B[k]) b += k; if (S[k]) s += k; }
    var c = parseInt(states, 10); c = isFinite(c) ? Math.max(2, Math.min(5, c)) : 2;
    return { B: B, S: S, states: c, nb: vn ? 'vn' : 'moore', birth: b, survive: s, max: max };
  }
  // Golly-style notation: B3/S23, B2/S/C3, a trailing V for von Neumann.
  function famRuleName(rule) { return 'B' + rule.birth + '/S' + rule.survive + (rule.states > 2 ? '/C' + rule.states : '') + (rule.nb === 'vn' ? 'V' : ''); }
  function famIsLife(rule) { return rule.birth === '3' && rule.survive === '23' && rule.states === 2 && rule.nb === 'moore'; }
  function famStep(cells, rows, cols, rule, wrap) {
    var out = new Uint8Array(rows * cols), offs = rule.nb === 'vn' ? NB_VN : NB_MOORE, B = rule.B, S = rule.S, C = rule.states;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var i = r * cols + c, s = cells[i];
      if (s >= 2) { out[i] = s + 1 < C ? s + 1 : 0; continue; }
      var n = 0;
      for (var k = 0; k < offs.length; k++) {
        var rr = r + offs[k][0], cc = c + offs[k][1];
        if (wrap) { rr = (rr + rows) % rows; cc = (cc + cols) % cols; } else if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
        if (cells[rr * cols + cc] === 1) n++;
      }
      out[i] = s === 1 ? (S[n] ? 1 : (C > 2 ? 2 : 0)) : (B[n] ? 1 : 0);
    }
    return out;
  }
  function famCounts(cells) { var alive = 0, dying = 0; for (var i = 0; i < cells.length; i++) { if (cells[i] === 1) alive++; else if (cells[i] >= 2) dying++; } return { alive: alive, dying: dying }; }
  function famSoup(rows, cols, patch, density, seed) {
    var rnd = seededRng(seed, 0xfa), cells = new Uint8Array(rows * cols), p = clamp01(density), r0 = Math.floor((rows - patch) / 2), c0 = Math.floor((cols - patch) / 2);
    for (var r = 0; r < patch; r++) for (var c = 0; c < patch; c++) if (rnd() < p) cells[(r0 + r) * cols + c0 + c] = 1;
    return cells;
  }
  function famHash(cells) { var h1 = 2166136261, h2 = 5381; for (var i = 0; i < cells.length; i++) if (cells[i]) { h1 = Math.imul(h1 ^ (i * 7 + cells[i]), 16777619); h2 = (Math.imul(h2, 33) + i * 5 + cells[i]) | 0; } return (h1 >>> 0) + ':' + (h2 >>> 0); }
  // Objects = cells (any non-zero state) within 2 cells of each other; the
  // signature keeps each cell's state, so a Brian's Brain glider's dying
  // trail is part of its shape.
  function famObjects(cells, rows, cols) {
    var seen = new Uint8Array(rows * cols), out = [];
    for (var i0 = 0; i0 < cells.length; i0++) {
      if (!cells[i0] || seen[i0]) continue;
      var stack = [i0], list = []; seen[i0] = 1;
      while (stack.length) {
        var idx = stack.pop(), r = Math.floor(idx / cols), c = idx % cols; list.push(idx);
        for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
          var nr = r + dr, nc = c + dc; if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          var ni = nr * cols + nc; if (cells[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
        }
      }
      var minR = rows, minC = cols;
      list.forEach(function (x) { minR = Math.min(minR, Math.floor(x / cols)); minC = Math.min(minC, x % cols); });
      var parts = list.map(function (x) { return [Math.floor(x / cols) - minR, x % cols - minC, cells[x]]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      out.push({ sig: parts.map(function (p) { return p.join(','); }).join('|'), minR: minR, minC: minC, n: list.length });
    }
    return out;
  }
  function wrapDelta(d, size) { d = ((d % size) + size) % size; return d > size / 2 ? d - size : d; }
  // Spaceship = an object that reappears with the same shape (and states)
  // shifted by d after p generations AND by 2d after 2p generations.
  function famFindSpaceship(frames, rows, cols, maxP, nb) {
    var objs = frames.map(function (f) { return null; });
    function at(k) { if (!objs[k]) objs[k] = famObjects(frames[k], rows, cols); return objs[k]; }
    var base = at(0).filter(function (o) { return o.n >= 3 && o.n <= 400; }), vn = nb === 'vn';
    if (!base.length || base.length > 80) return null;
    for (var p = 1; p <= maxP && 2 * p < frames.length; p++) {
      var one = at(p), two = at(2 * p);
      for (var a = 0; a < base.length; a++) {
        // An object still sitting where it was is a still life or oscillator, even if a copy sits d away.
        var stays = false;
        for (var s0 = 0; s0 < one.length && !stays; s0++) if (one[s0].sig === base[a].sig && one[s0].minR === base[a].minR && one[s0].minC === base[a].minC) stays = true;
        if (stays) continue;
        for (var b = 0; b < one.length; b++) {
          if (one[b].sig !== base[a].sig) continue;
          var dr = wrapDelta(one[b].minR - base[a].minR, rows), dc = wrapDelta(one[b].minC - base[a].minC, cols);
          // Nothing outruns light: one cell per generation (4-around: one step).
          if ((!dr && !dc) || (vn ? Math.abs(dr) + Math.abs(dc) > p : Math.max(Math.abs(dr), Math.abs(dc)) > p)) continue;
          for (var q = 0; q < two.length; q++) {
            if (two[q].sig === base[a].sig && wrapDelta(two[q].minR - base[a].minR, rows) === wrapDelta(2 * dr, rows) && wrapDelta(two[q].minC - base[a].minC, cols) === wrapDelta(2 * dc, cols)) return { period: p, dr: dr, dc: dc, cells: base[a].n };
          }
        }
      }
    }
    return null;
  }
  // Measures one seeded 8 x 8 patch (50% alive) in the middle of a wrapping
  // 48 x 48 world. Outcome: dies | spaceship | settles | explodes | chaotic.
  function famMeasure(rule, seed, opts) {
    opts = opts || {};
    var size = opts.size || 48, patch = opts.patch || 8, maxGen = opts.maxGen || 160, maxP = opts.maxPeriod || 16, area = size * size;
    var cur = opts.cells ? Uint8Array.from(opts.cells) : famSoup(size, size, patch, opts.density == null ? 0.5 : opts.density, seed);
    var start = famCounts(cur).alive, peak = start, seen = {}, cycle = null, g = 0;
    seen[famHash(cur)] = 0;
    for (g = 1; g <= maxGen; g++) {
      cur = famStep(cur, size, size, rule, true);
      var ct = famCounts(cur), live = ct.alive + ct.dying;
      if (ct.alive > peak) peak = ct.alive;
      if (!live) return { outcome: 'dies', gen: g, start: start, peak: peak, seed: normSeed(seed) };
      var hk = famHash(cur);
      if (seen[hk] != null) { cycle = { first: seen[hk], period: g - seen[hk] }; break; }
      seen[hk] = g;
    }
    var endGen = Math.min(g, maxGen), end = famCounts(cur), frames = [cur], f = cur;
    if (end.alive + end.dying <= 1500) { for (var k = 1; k <= 2 * maxP; k++) { f = famStep(f, size, size, rule, true); frames.push(f); } }
    var ship = frames.length > 1 ? famFindSpaceship(frames, size, size, maxP, rule.nb) : null;
    var res = { start: start, peak: peak, gen: endGen, endAlive: end.alive, endDying: end.dying, seed: normSeed(seed) };
    if (ship) { res.outcome = 'spaceship'; res.ship = ship; }
    else if (cycle) { res.outcome = 'settles'; res.period = cycle.period; res.gen = cycle.first; }
    else if (end.alive + end.dying >= Math.max(4 * start, area * 0.12)) res.outcome = 'explodes';
    else res.outcome = 'chaotic';
    return res;
  }
  var FAM_OUTCOMES = ['dies', 'settles', 'spaceship', 'explodes', 'chaotic'];
  function famMeasureMany(rule, seeds, opts) {
    var runs = seeds.map(function (s) { return famMeasure(rule, s, opts); }), tally = {};
    FAM_OUTCOMES.forEach(function (o) { tally[o] = 0; });
    runs.forEach(function (r) { tally[r.outcome]++; });
    var top = FAM_OUTCOMES.reduce(function (a, o) { return tally[o] > tally[a] ? o : a; }, FAM_OUTCOMES[0]);
    return { runs: runs, tally: tally, top: top, ship: runs.filter(function (r) { return r.ship; })[0] || null };
  }
  // A random rule from the totalistic rule space (no B0). opts.generations
  // allows 3-state rules; opts.noLowBirth leaves out B1 and B2.
  function famRandomRule(rnd, nb, opts) {
    opts = opts || {};
    var max = nb === 'vn' ? 4 : 8, lo = opts.noLowBirth ? 3 : 1, b = '', s = '';
    for (var k = lo; k <= max; k++) if (rnd() < 0.3) b += k;
    if (!b) b = String(lo + Math.floor(rnd() * Math.min(3, max - lo + 1)));
    for (var j = 0; j <= max; j++) if (rnd() < 0.35) s += j;
    return famRule(b, s, opts.generations && rnd() < 0.4 ? 3 : 2, nb);
  }
  // Every rule one change away: add or remove one birth or survival digit.
  function famNeighbourRules(rule) {
    var out = [];
    function flip(str, d) { return str.indexOf(String(d)) !== -1 ? str.replace(String(d), '') : str + d; }
    for (var b = 1; b <= rule.max; b++) { var nb = flip(rule.birth, b); if (nb) out.push(famRule(nb, rule.survive, rule.states, rule.nb)); }
    for (var s = 0; s <= rule.max; s++) out.push(famRule(rule.birth, flip(rule.survive, s), rule.states, rule.nb));
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  LANGTON'S ANT (stage B): on a white square turn right, on a black
  //  square turn left; flip the square; step forward. Endless plane (a map
  //  of black squares), so the highway is never cut short by an edge.
  // ═══════════════════════════════════════════════════════════════════════
  var ANT_DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // up, right, down, left as [row, col]
  function antInit() { return { r: 0, c: 0, dir: 0, black: {}, blackCount: 0, step: 0 }; }
  function antAdvance(st, n, log) {
    for (var i = 0; i < n; i++) {
      var key = st.r + ',' + st.c, wasBlack = st.black[key] === 1;
      if (wasBlack) { st.dir = (st.dir + 3) % 4; delete st.black[key]; st.blackCount--; }
      else { st.dir = (st.dir + 1) % 4; st.black[key] = 1; st.blackCount++; }
      st.r += ANT_DIRS[st.dir][0]; st.c += ANT_DIRS[st.dir][1]; st.step++;
      if (log) { log.turns.push(wasBlack ? 0 : 1); log.pos.push([st.r, st.c]); }
    }
    return st;
  }
  function antAt(step) { return antAdvance(antInit(), Math.max(0, step | 0)); }
  // Measured, not quoted: the first step from which every later move repeats
  // the move 104 steps earlier, and how far one 104-step period carries it.
  var ANT_HIGHWAY = null;
  function antHighway() {
    if (ANT_HIGHWAY) return ANT_HIGHWAY;
    var total = 12000, period = 104, log = { turns: [], pos: [[0, 0]] }, st = antAdvance(antInit(), total, log), last = -1;
    for (var i = total - period - 1; i >= 0; i--) if (log.turns[i] !== log.turns[i + period]) { last = i; break; }
    var onset = last + 1, ok = total - onset >= 3 * period;
    var p0 = log.pos[onset], p1 = log.pos[onset + period];
    ANT_HIGHWAY = ok ? { onset: onset, period: period, dr: p1[0] - p0[0], dc: p1[1] - p0[1], total: total, blackAtEnd: st.blackCount } : { onset: null, period: null, total: total };
    return ANT_HIGHWAY;
  }
  // Generated highway prediction: where is the ant at step `target`?
  function makeAntProblem(seed, band) {
    var hw = antHighway(), rnd = seededRng(seed, 0xa7), base = Math.ceil((hw.onset + hw.period) / 100) * 100;
    var k = 3 + Math.floor(rnd() * (band === 'k5' ? 5 : 20)), extra = band === 'g912' && rnd() < 0.6 ? 1 + Math.floor(rnd() * 103) : 0;
    var target = base + k * hw.period + extra, p0 = antAt(base), p1 = antAt(target);
    return { seed: normSeed(seed), base: base, baseR: p0.r, baseC: p0.c, k: k, extra: extra, target: target, r: p1.r, c: p1.c, dr: hw.dr, dc: hw.dc, period: hw.period };
  }
  function gradeAntProblem(pr, col, row) {
    col = Number(col); row = Number(row);
    if (!isFinite(col) || !isFinite(row)) return { correct: false, tag: 'blank' };
    if (col === pr.c && row === pr.r) return { correct: true, tag: null };
    var same = function (dr, dc) { return row === pr.baseR + dr && col === pr.baseC + dc; };
    if (pr.extra && same(pr.k * pr.dr, pr.k * pr.dc)) return { correct: false, tag: 'extra' };
    if (same(pr.dr, pr.dc)) return { correct: false, tag: 'one_period' };
    if (same(-pr.k * pr.dr, -pr.k * pr.dc)) return { correct: false, tag: 'direction' };
    if (row === pr.baseR && col === pr.baseC) return { correct: false, tag: 'no_move' };
    return { correct: false, tag: 'off' };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  K-5 GLIDER MISSION (stage B): which way does a glider fly, and can you
  //  aim it at the star? Every answer is checked by running Life.
  // ═══════════════════════════════════════════════════════════════════════
  var GLIDER_HEADINGS = {
    se: [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
    sw: [[0, 1], [1, 0], [2, 2], [2, 1], [2, 0]],
    ne: [[2, 1], [1, 2], [0, 0], [0, 1], [0, 2]],
    nw: [[2, 1], [1, 0], [0, 2], [0, 1], [0, 0]]
  };
  var GLIDER_ORDER = ['nw', 'ne', 'sw', 'se'];
  var GLIDER_SIZE = 13, GLIDER_STARS = { se: [11, 11], sw: [11, 1], ne: [1, 11], nw: [1, 1] };
  function gliderBoard(heading) {
    var g = emptyGrid(GLIDER_SIZE, GLIDER_SIZE);
    (GLIDER_HEADINGS[heading] || GLIDER_HEADINGS.se).forEach(function (rc) { g[5 + rc[0]][5 + rc[1]] = 1; });
    return g;
  }
  // Which way the shape actually moved in 4 generations (run, not looked up).
  function gliderMeasure(heading) {
    var g = gliderBoard(heading), a = shapeFingerprint(g), b = shapeFingerprint(lifeJump(g, 4, false, '3', '23'));
    var dr = b.minR - a.minR, dc = b.minC - a.minC;
    return { dr: dr, dc: dc, heading: (dr > 0 ? 's' : 'n') + (dc > 0 ? 'e' : 'w') };
  }
  // First generation at which the star square holds a live cell (or null).
  function gliderReaches(heading, star, maxGen) {
    var g = gliderBoard(heading);
    for (var gen = 0; gen <= (maxGen || 30); gen++) { if (g[star[0]][star[1]]) return gen; g = stepLife(g, false, '3', '23'); }
    return null;
  }
  function makeGliderRound(seed) {
    var rnd = seededRng(seed, 0x61);
    return { seed: normSeed(seed), heading: GLIDER_ORDER[Math.floor(rnd() * 4)], star: GLIDER_ORDER[Math.floor(rnd() * 4)] };
  }
  function gliderPickTag(truth, pick) {
    if (pick === truth) return null;
    var vt = truth.charAt(0), ht = truth.charAt(1), vp = pick.charAt(0), hp = pick.charAt(1);
    if (vt !== vp && ht !== hp) return 'opposite';
    return vt !== vp ? 'updown' : 'leftright';
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPONENT
  // ═══════════════════════════════════════════════════════════════════════
  function CellularLab(props) {
    var ctx = props.ctx;
    var React = ctx.React;
    var h = React.createElement;
    var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;
    // Every visible string goes through the module translator t(key, fallback).
    cellTranslate = typeof ctx.t === 'function' ? ctx.t : null;
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
    // The tool paints its own background (C.bg on the root), so dark mode
    // (ctx.isDark) and contrast mode both get a dark surface with light ink.
    var contrast = !!ctx.isContrast || ctx.theme === 'contrast', dark = contrast || !!ctx.isDark;
    var C = {
      bg: dark ? '#0b1220' : '#f8fafc',
      panel: dark ? '#0f172a' : '#ffffff',
      border: dark ? '#1e293b' : '#e2e8f0',
      grid: dark ? '#1e293b' : '#e5e7eb',
      dead: dark ? '#111827' : '#f1f5f9',
      live: contrast ? (dark ? '#ffffff' : '#000000') : (dark ? '#34d399' : '#047857'),
      live2: contrast ? (dark ? '#fde047' : '#1d4ed8') : (dark ? '#22d3ee' : '#0ea5e9'),
      text: dark ? '#e2e8f0' : '#1e293b',
      sub: dark ? '#94a3b8' : '#475569',
      accent: dark ? '#34d399' : '#047857',
      accentBg: dark ? '#064e3b' : '#d1fae5',
      cursor: '#f59e0b'
    };

    // ── transient state ──
    var sTab = useState('life'); var tab = sTab[0], setTab = sTab[1];
    var sPatternFocus = useState('glider'); var patternFocusKey = sPatternFocus[0], setPatternFocusKey = sPatternFocus[1];
    var sPatternMeasure = useState(null); var patternMeasure = sPatternMeasure[0], setPatternMeasure = sPatternMeasure[1];

    // Life — the canonical 2-D engine shared by science and creative exploration.
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
    // Seeded soups: same seed + density + size = the same soup (re-roll for a new one).
    var sSoupSeed = useState(1); var soupSeed = sSoupSeed[0], setSoupSeed = sSoupSeed[1];
    var sSoupDensity = useState(30); var soupDensity = sSoupDensity[0], setSoupDensity = sSoupDensity[1];
    var sSoupSeedDraft = useState('1'); var soupSeedDraft = sSoupSeedDraft[0], setSoupSeedDraft = sSoupSeedDraft[1];
    // Where the current start came from, so a logged trial can say so.
    var startInfoRef = useRef({ source: 'pattern', pattern: 'glider', density: null, seed: null });
    var challengeSeenRef = useRef({}), challengePeakRef = useRef(0), challengeShapeRef = useRef({});
    var sTrialMsg = useState(''); var trialMsg = sTrialMsg[0], setTrialMsg = sTrialMsg[1];
    var sNarrate = useState(false); var narrate = sNarrate[0], setNarrate = sNarrate[1];
    var sSound = useState(false); var soundOn = sSound[0], setSoundOn = sSound[1];
    var audioRef = useRef(null), soundTimerRef = useRef(null), notesRef = useRef([]);
    var reducedMotion = prefersReducedMotion();
    // Engagement pass (2026-11-04): Step and explain; predict-then-run (the
    // answer is classified only after the guess is locked, from the run itself);
    // lookedRef = starts whose future this session has already shown (no XP).
    var sExplain = useState(false); var explainOn = sExplain[0], setExplainOn = sExplain[1];
    // Phone width: the status badge leaves the grid, and the neighbour numbers get a zoom.
    var sPhone = useState(function () { return phoneWidthNow(); }); var phoneWidth = sPhone[0], setPhoneWidth = sPhone[1];
    var gridTapRef = useRef(null);
    useEffect(function () {
      if (typeof window === 'undefined' || !window.matchMedia) return undefined;
      var mq = window.matchMedia(PHONE_QUERY);
      if (!mq || !mq.addEventListener) return undefined;
      var onChange = function () { setPhoneWidth(phoneWidthNow()); };
      mq.addEventListener('change', onChange);
      setPhoneWidth(phoneWidthNow());
      return function () { mq.removeEventListener('change', onChange); };
    }, []);
    var sPredict = useState({ pick: null, committed: null, result: null }); var predict = sPredict[0], setPredict = sPredict[1];
    var predictRef = useRef(predict); predictRef.current = predict;
    var lookedRef = useRef({ n: 0, keys: {}, overflow: false }), strokeValRef = useRef(1), ruleSigRef = useRef(''), lastTouchRef = useRef(0);

    // ── saved slice (toolData._cellularLab): quests, XP ledger, band, teacher
    //    settings, run log, cards, investigations, missions, practice ──
    var saved = (ctx.toolData && ctx.toolData._cellularLab && typeof ctx.toolData._cellularLab === 'object') ? ctx.toolData._cellularLab : {};
    var teacherCfg = saved.teacher && typeof saved.teacher === 'object' ? saved.teacher : {};
    var isTeacher = ctx.isTeacherMode === true;
    var hostBand = bandFromHost(ctx.gradeBand);
    var band = BANDS.indexOf(teacherCfg.lockBand) !== -1 ? teacherCfg.lockBand : BANDS.indexOf(saved.band) !== -1 ? saved.band : hostBand;
    var runLog = fitRunLog(saved.runLog);

    // Elementary CA
    var CA_COLS = 81, CA_ROWS = 60, CA_PX = 6;
    var sRule = useState(30); var rule = sRule[0], setRule = sRule[1];
    // The typed text is a draft: empty or out-of-range text stays in the field
    // with an error instead of snapping to a default (typing "9" after clearing
    // used to produce 309 -> 255).
    var sRuleDraft = useState('30'); var ruleDraft = sRuleDraft[0], setRuleDraft = sRuleDraft[1];
    var sCaRowSeed = useState(1); var caRowSeed = sCaRowSeed[0], setCaRowSeed = sCaRowSeed[1];
    var sCaSeed = useState('single'); var caSeed = sCaSeed[0], setCaSeed = sCaSeed[1];
    var sCaWrap = useState(false); var caWrap = sCaWrap[0], setCaWrap = sCaWrap[1];
    var sCustomSeed = useState(function () { var row = []; for (var i = 0; i < CA_COLS; i++) row.push(i === Math.floor(CA_COLS / 2) ? 1 : 0); return row; }); var customSeed = sCustomSeed[0], setCustomSeed = sCustomSeed[1];
    var sSeedCursor = useState(Math.floor(CA_COLS / 2)); var seedCursor = sSeedCursor[0], setSeedCursor = sSeedCursor[1];
    var sCaInspect = useState(CA_ROWS - 1); var caInspectRow = sCaInspect[0], setCaInspectRow = sCaInspect[1];
    var sCaInspectCol = useState(Math.floor(CA_COLS / 2)); var caInspectCol = sCaInspectCol[0], setCaInspectCol = sCaInspectCol[1];
    var bits = ruleToBits(rule);
    // Elementary CA owns its boundary topology independently from the Life grid:
    // fixed zero-padding is the textbook default; wrap joins both ends as a ring.
    var caRows = React.useMemo(function () { return buildCaRows(rule, caSeed === 'custom' ? customSeed : caSeed === 'random' ? seededRow(CA_COLS, 0.5, caRowSeed) : caSeed, CA_ROWS, CA_COLS, caWrap); }, [rule, caSeed, customSeed, caWrap, caRowSeed]);
    var caAnalysis = React.useMemo(function () { return analyzeCaRows(caRows, caWrap); }, [caRows, caWrap]);
    // The space-time picture itself (background, guides, one path per row)
    // only changes with the rows and the theme, so it is built once per change.
    var caRowsEl = React.useMemo(function () {
      var W = CA_COLS * CA_PX, H = CA_ROWS * CA_PX, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: C.dead })];
      for (var r = 0; r < caRows.length; r++) {
        if (r > 0 && r % 10 === 0) kids.push(h('line', { key: 'guide' + r, x1: 0, x2: W, y1: r * CA_PX, y2: r * CA_PX, stroke: dark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.2)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }));
        var timeColor = contrast ? C.live : 'hsl(' + Math.round(158 + r / Math.max(1, caRows.length - 1) * 92) + ',82%,56%)';
        // One path per generation row (was one rect per live cell).
        var rowPath = '';
        for (var c = 0; c < CA_COLS; c++) if (caRows[r][c]) rowPath += 'M' + (c * CA_PX) + ' ' + (r * CA_PX) + 'h' + CA_PX + 'v' + CA_PX + 'h-' + CA_PX + 'z';
        if (rowPath) kids.push(h('path', { key: 'row' + r, d: rowPath, fill: timeColor }));
      }
      return h('g', { key: 'caRows', 'data-ca-rows': 'true' }, kids);
    }, [caRows, dark, contrast]);
    // Derived inspector data: pure functions of the rows and the inspected
    // cell, so they are memoised instead of recomputed on every render of
    // every tab.
    var caDerived = React.useMemo(function () {
      var cause = caCellCause(caRows, caInspectRow, caInspectCol, caWrap);
      return {
        sensitivity: caRuleSensitivityProfile(bits, caAnalysis.neighborhoodCounts), cause: cause, influence: caCounterfactualInfluence(bits, cause),
        sensitivityRow: analyzeCaSensitivityRow(caRows, caInspectRow, bits, caWrap), cone: caCausalCone(caRows, caInspectRow, caInspectCol, caWrap, 6),
        temporalChange: caTemporalChangeCells(caRows, caInspectRow), transition: caCellTransition(caRows, caInspectRow, caInspectCol)
      };
    }, [caRows, caAnalysis, rule, caInspectRow, caInspectCol, caWrap]);
    var caSensitivity = caDerived.sensitivity, caCause = caDerived.cause, caInfluence = caDerived.influence, caSensitivityRow = caDerived.sensitivityRow;
    var caCone = caDerived.cone, caTemporalChange = caDerived.temporalChange, caSelectedTransition = caDerived.transition;
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
    // General write into the saved slice: fn(current) returns a patch object,
    // or null for "no change" (so repeated clicks never re-render the host).
    var patchSaved = useCallback(function (fn) {
      var cx = ctxRef.current;
      if (!cx || typeof cx.setToolData !== 'function') return;
      cx.setToolData(function (prev) {
        var cur = (prev && prev._cellularLab && typeof prev._cellularLab === 'object') ? prev._cellularLab : {};
        var patch = fn(cur);
        if (!patch) return prev;
        var n = Object.assign({}, prev); n._cellularLab = Object.assign({}, cur, patch); return n;
      });
    }, []);
    // XP once per distinct item: the ledger lives in the saved slice, and the
    // award fires only when this call is the one that writes the ledger entry.
    var awardedRef = useRef({});
    var awardOnce = useCallback(function (ledgerKey, activityId, points, reason) {
      var cx = ctxRef.current, cur = (cx && cx.toolData && cx.toolData._cellularLab) || {};
      if ((cur.xp && cur.xp[ledgerKey]) || awardedRef.current[ledgerKey]) return false;
      awardedRef.current[ledgerKey] = true;
      patchSaved(function (s) { if (s.xp && s.xp[ledgerKey]) return null; var x = Object.assign({}, s.xp || {}); x[ledgerKey] = true; return { xp: x }; });
      if (cx && typeof cx.awardXP === 'function') { try { cx.awardXP(activityId, points, reason); } catch (_) {} }
      return true;
    }, [patchSaved]);

    // ── the play loop (only auto-steps when running; SSR never runs effects).
    //    The setGrid updater stays PURE — extinction is handled in its own
    //    effect below so we never call setState inside another setter. ──
    // A timeout chain, not an interval: every tick re-reads
    // prefers-reduced-motion, so turning it on mid-run slows the next frame to
    // one generation per second. The pending timer is cleared on pause/unmount.
    useEffect(function () {
      if (!running) return undefined;
      var id = null, alive = true;
      function tick() {
        if (!alive) return;
        advanceOne(false);
        id = setTimeout(tick, tickDelay(speed));
      }
      id = setTimeout(tick, tickDelay(speed));
      return function () { alive = false; if (id != null) clearTimeout(id); };
    }, [running, speed, wrap, birthRule, survivalRule]);

    // auto-stop when every cell has died (pure-updater-safe)
    useEffect(function () {
      if (running && countPop(grid) === 0) { setRunning(false); announce(t('stem.cellular.sr_all_died_paused', 'All cells died. Paused.')); }
    }, [grid, running, announce]);

    // Population sonification: one short tone per generation while running,
    // pitch rising with population. Audio lives in refs only, closed on unmount.
    useEffect(function () {
      if (!soundOn || !running || gen === 0) return;
      playPopTone(countPop(grid), ROWS * COLS, 0.09);
    }, [gen]);
    // Narration: while running with narration on, a short spoken update every
    // 10 generations (not every frame, so a screen reader is not flooded).
    useEffect(function () {
      if (!narrate || !running || gen === 0 || gen % 10 !== 0) return;
      announce(describeLifeShort());
    }, [gen]);
    useEffect(function () {
      return function () {
        if (soundTimerRef.current) { clearTimeout(soundTimerRef.current); soundTimerRef.current = null; }
        notesRef.current.forEach(function (nt) { try { nt.gain.disconnect(); } catch (_) {} try { nt.osc.disconnect(); } catch (_) {} });
        notesRef.current = [];
        var a = audioRef.current; audioRef.current = null;
        if (a && a.own && a.ctx && typeof a.ctx.close === 'function') { try { a.ctx.close(); } catch (_) {} }
      };
    }, []);

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
    // Challenge checks run through the pure challengeVerdict(); the extra
    // bookkeeping here (repeat map, peak) is reset whenever a challenge starts.
    useEffect(function () {
      if (challengeStatus !== 'active' || !challengeInitialRef.current || gen < 1) return;
      var initial = challengeInitialRef.current, currentPop = countPop(grid), sig = gridSignature(grid);
      var seenMap = challengeSeenRef.current, repeatOf = seenMap[sig] != null && seenMap[sig] < gen ? seenMap[sig] : null;
      if (seenMap[sig] == null) seenMap[sig] = gen;
      // Same shape at an earlier generation but somewhere else = the whole pattern is travelling.
      var shape = shapeFingerprint(grid), shapes = challengeShapeRef.current, was = shape.signature ? shapes[shape.signature] : null, shipOf = null;
      if (was && was.gen < gen && (was.minR !== shape.minR || was.minC !== shape.minC)) shipOf = was.gen;
      if (shape.signature && !was) shapes[shape.signature] = { gen: gen, minR: shape.minR, minC: shape.minC };
      challengePeakRef.current = Math.max(challengePeakRef.current, currentPop);
      var verdict = challengeVerdict(challenge, { gen: gen, initialSig: initial.signature, initialPop: initial.population, sig: sig, pop: currentPop, peak: challengePeakRef.current, repeatOf: repeatOf, shipOf: shipOf });
      if (!verdict) return;
      var msg = challengeMessage(verdict);
      setChallengeStatus(verdict.status); setChallengeMsg(msg); setRunning(false); announce(msg);
      if (verdict.status === 'success') {
        markQuest('challengeCompleted');
        patchSaved(function (s) { var cd = s.challengesDone && typeof s.challengesDone === 'object' ? s.challengesDone : {}; if (cd[challenge]) return null; var d = Object.assign({}, cd); d[challenge] = true; return { challengesDone: d }; });
        awardOnce('challenge_' + challenge, 'cellularLab', 10, fmt(t('stem.cellular.xp_challenge', 'Cellular Automaton Lab challenge solved: {name}'), { name: challengeName(challenge) }));
      }
    }, [grid, gen, challenge, challengeStatus, markQuest, announce]);
    // Predict-then-run: classified after the commit only, by the badge's own
    // shape/repeat tracking on the student's run.
    useEffect(function () {
      var p = predictRef.current;
      if (!p.committed || p.result || gen <= p.committed.gen) return;
      var dyn = detectDynamics(grid, gen, transitionHistoryRef.current), outcome = predictOutcomeOf(dyn);
      if (!outcome && gen - p.committed.gen < PREDICT_TIMEOUT) return;
      finishPredict(outcome, dyn);
    }, [gen]);
    useEffect(function () {
      var sig = birthRule + '/' + survivalRule + '/' + (wrap ? 'w' : 'f');
      if (ruleSigRef.current && ruleSigRef.current !== sig) cancelPredict(true);
      ruleSigRef.current = sig;
    }, [birthRule, survivalRule, wrap]);

    function toggleCell(r, c, val) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      cancelPredict(true);
      // Editing mid-challenge makes the edited grid a fresh generation-0 start.
      if (challengeStatus === 'active' && challengeInitialRef.current) { challengeInitialRef.current = null; genRef.current = 0; setGen(0); setRunning(false); }
      startInfoRef.current = { source: 'drawn' };
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
      // With the Draw brush, a stroke that starts on a live square erases, so a
      // click toggles a square the way Space does on the keyboard.
      strokeValRef.current = brush === 1 && grid[rc[0]] && grid[rc[0]][rc[1]] ? 0 : brush;
      setCursor(rc);
      toggleCell(rc[0], rc[1], strokeValRef.current);
    }
    function onGridPointerMove(e) {
      if (!paintingRef.current) return;
      var rc = cellFromEvent(e); if (!rc) return;
      toggleCell(rc[0], rc[1], strokeValRef.current);
    }
    function onGridPointerUp() { paintingRef.current = false; }

    // Words for one cell under the keyboard cursor (also the active gridcell's name).
    function cellWords(r, c) {
      var alive = !!(grid[r] && grid[r][c]), n = neighborCount(grid, r, c, wrap);
      var words = fmt(alive ? t('stem.cellular.cell_alive', 'Row {row}, column {col}: alive, {n} live neighbours.') : t('stem.cellular.cell_empty', 'Row {row}, column {col}: empty, {n} live neighbours.'), { row: r + 1, col: c + 1, n: n });
      var fate = explainShown && lifeExplain && lifeExplain.fate ? lifeExplain.fate[r * COLS + c] : null;
      return fate ? words + ' ' + fateWords(fate, n) : words;
    }
    // Roving keyboard cursor over the Life grid: arrows move one cell, Home/End
    // jump to the row ends, Page Up/Down move 5 rows, Ctrl+Home/End jump to the
    // corners; Space or Enter toggles, Delete or Backspace clears. Plain letter
    // keys do nothing, so nothing fires by accident.
    function onGridKeyDown(e) {
      var r = cursor[0], c = cursor[1], handled = true, moved = true;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
      else if (e.key === 'ArrowDown') r = Math.min(ROWS - 1, r + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') c = Math.min(COLS - 1, c + 1);
      else if (e.key === 'PageUp') r = Math.max(0, r - 5);
      else if (e.key === 'PageDown') r = Math.min(ROWS - 1, r + 5);
      else if (e.key === 'Home') { c = 0; if (e.ctrlKey) r = 0; }
      else if (e.key === 'End') { c = COLS - 1; if (e.ctrlKey) r = ROWS - 1; }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Delete' || e.key === 'Backspace') {
        moved = false;
        var nv = (e.key === 'Delete' || e.key === 'Backspace') ? 0 : (grid[r][c] ? 0 : 1);
        toggleCell(r, c, nv);
        announce(fmt(nv ? t('stem.cellular.sr_cell_now_alive', 'Row {row}, column {col} is now alive.') : t('stem.cellular.sr_cell_now_empty', 'Row {row}, column {col} is now empty.'), { row: r + 1, col: c + 1 }));
      } else { handled = false; moved = false; }
      if (handled && e.preventDefault) e.preventDefault();
      if (moved) { setCursor([r, c]); announce(cellWords(r, c)); }
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
      markLooked(startKeyOf(current, wrap, birthRule, survivalRule));
      transitionHistoryRef.current.push({ gen: nextGen, pop: countPop(next.grid), born: next.born, survived: next.survived, died: next.died, centerR: spatial ? spatial.centerR : null, centerC: spatial ? spatial.centerC : null, width: spatial ? spatial.width : 0, height: spatial ? spatial.height : 0, density: spatial ? spatial.density : 0, signature: gridSignature(next.grid), shapeSignature: afterShape.signature, minR: afterShape.minR, minC: afterShape.minC, previousSignature: gridSignature(current), previousShapeSignature: beforeShape.signature, previousMinR: beforeShape.minR, previousMinC: beforeShape.minC });
      if (transitionHistoryRef.current.length > 100) transitionHistoryRef.current.shift();
      genRef.current = nextGen; setPhaseCursor(null); setGrid(next.grid); setGen(nextGen);
      if (speakOnExtinction && countPop(next.grid) === 0) announce(t('stem.cellular.sr_all_died', 'All cells died.'));
    }
    function captureChallengeStart() {
      if (challenge && challengeStatus === 'active' && !challengeInitialRef.current) {
        var sig = gridSignature(gridRef.current);
        challengeInitialRef.current = { signature: sig, population: countPop(gridRef.current) };
        challengeSeenRef.current = {}; challengeSeenRef.current[sig] = 0; challengePeakRef.current = 0;
        var sh0 = shapeFingerprint(gridRef.current); challengeShapeRef.current = {};
        if (sh0.signature) challengeShapeRef.current[sh0.signature] = { gen: 0, minR: sh0.minR, minC: sh0.minC };
      }
    }
    function stepOnce() { captureChallengeStart(); advanceOne(true); }
    function restoreLifeSnapshot(snapshot, message) {
      if (!snapshot) return;
      setRunning(false); rewindingRef.current = true; gridRef.current = snapshot.grid; agesRef.current = snapshot.ages; genRef.current = snapshot.gen;
      previousGridRef.current = snapshot.previousGrid; transitionRef.current = snapshot.transition; transitionHistoryRef.current = snapshot.transitionHistory;
      popHistRef.current = snapshot.popHist; maxPopRef.current = snapshot.maxPop;
      setGrid(snapshot.grid); setGen(snapshot.gen); setPopHist(snapshot.popHist); setMaxPop(snapshot.maxPop);
      setPhaseCursor(null); announce(message || fmt(t('stem.cellular.sr_rewound', 'Rewound to generation {gen}.'), { gen: snapshot.gen }));
    }
    function rewindOne() {
      var snapshot = historyRef.current.pop(); if (!snapshot) return;
      restoreLifeSnapshot(snapshot);
    }
    function rewindToGeneration(targetGen) {
      var target = parseInt(targetGen, 10); if (!isFinite(target) || target >= genRef.current) return;
      var index = -1; for (var i = historyRef.current.length - 1; i >= 0; i--) if (historyRef.current[i].gen === target) { index = i; break; }
      if (index < 0) { announce(fmt(t('stem.cellular.sr_rewind_outside', 'Generation {gen} is outside the kept rewind history.'), { gen: target })); return; }
      var snapshot = historyRef.current[index]; historyRef.current = historyRef.current.slice(0, index);
      restoreLifeSnapshot(snapshot, fmt(t('stem.cellular.sr_phase_rewound', 'Phase portrait rewound to generation {gen}.'), { gen: target }));
    }
    // One place that installs a new generation-0 world (clear, soup, pattern,
    // resize, challenge start) so every path resets the same bookkeeping.
    function installStart(next, info, size) {
      setRunning(false); resetTimeline(); cancelPredict(false);
      if (size) { setLifeSize(size); setCursor(function (cu) { return [Math.min(cu[0], size - 1), Math.min(cu[1], size - 1)]; }); }
      gridRef.current = next; setGrid(next); agesRef.current = ageGridFor(next);
      genRef.current = 0; setGen(0); setMaxPop(countPop(next)); setPopHist([]);
      challengeInitialRef.current = null; startInfoRef.current = info || { source: 'drawn' };
    }
    function clearGrid() { installStart(emptyGrid(ROWS, COLS), { source: 'drawn' }); announce(t('stem.cellular.sr_cleared', 'Grid cleared.')); }
    // A seeded soup: the same seed, density and grid size always give the same soup.
    function randomize(seedOverride) {
      var seed = seedOverride != null ? normSeed(seedOverride) : soupSeed, density = soupDensity / 100;
      installStart(soupGrid(ROWS, COLS, density, seed), { source: 'soup', density: density, seed: seed });
      setSoupSeed(seed); setSoupSeedDraft(String(seed));
      announce(fmt(t('stem.cellular.sr_soup', 'Random soup placed: {pct}% alive, seed {seed}.'), { pct: soupDensity, seed: seed })); markQuest('randomized');
    }
    function rerollSoup() { randomize(freshSeed()); }
    // K-5 "Notice and wonder": the student ticks each experiment they tried.
    function toggleNotice(id) {
      var on = plainObj(saved.notice)[id] === true;
      patchSaved(function (s) { var n = Object.assign({}, plainObj(s.notice)); if (n[id] === true) delete n[id]; else n[id] = true; return { notice: n }; });
      announce(on ? t('stem.cellular.sr_notice_off', 'Experiment unticked.') : t('stem.cellular.sr_notice_on', 'Experiment ticked as tried.'));
    }
    function resizeLife(nextSize) {
      var n = parseInt(nextSize, 10); installStart(emptyGrid(n, n), { source: 'drawn' }, n); setCursor([Math.floor(n / 2), Math.floor(n / 2)]);
      announce(fmt(t('stem.cellular.sr_resized', 'Grid resized to {n} by {n}.'), { n: n }));
    }
    // Same test as the tab list: a teacher sees every tab, and a student's section lock leaves one.
    function lifeTabOpen() { return isTeacher || !teacherCfg.lockTab || teacherCfg.lockTab === 'life' || !ALL_TABS.some(function (x) { return x.id === teacherCfg.lockTab; }); }
    function beginChallenge(id) {
      if (!lifeTabOpen()) return;
      installStart(emptyGrid(ROWS, COLS), { source: 'drawn' }); setChallenge(id); setChallengeStatus('active');
      setChallengeMsg(t('stem.cellular.ch_start', 'Draw a starting pattern, then run or step to test it.')); setTab('life'); focusLifeGrid('cell-challenge-strip');
      announce(fmt(t('stem.cellular.sr_challenge_started', 'Challenge started: {name}. The grid is cleared for your design.'), { name: challengeName(id) }));
    }
    // opts.fit loads a pattern on the grid size and edges where its published
    // numbers can be reproduced (see the pattern's `fits`).
    function loadPattern(key, opts) {
      var pat = LIFE_PATTERNS[key]; if (!pat) return;
      var fit = opts && opts.fit && pat.fits ? pat.fits : null, size = fit && fit.size ? fit.size : lifeSize;
      var r0 = Math.max(0, Math.floor((size - pat.h) / 2)), c0 = Math.max(0, Math.floor((size - pat.w) / 2));
      installStart(stampPattern(emptyGrid(size, size), key, r0, c0), { source: 'pattern', pattern: key }, size !== lifeSize ? size : null);
      if (fit && fit.wrap != null) setWrap(fit.wrap);
      setStampKey(key); setTab('life');
      announce(fit ? fmt(t('stem.cellular.sr_loaded_fit', 'Loaded {name} on a {n} by {n} grid with {edges}.'), { name: patName(key), n: size, edges: (fit.wrap === false ? t('stem.cellular.edges_fixed_lower', 'fixed edges') : t('stem.cellular.edges_wrap_lower', 'wrapping edges')) }) : fmt(t('stem.cellular.sr_loaded', 'Loaded {name}.'), { name: patName(key) }));
      markQuest('stamped'); if (pat.kind === 'gun') markQuest('sawGun'); if (pat.kind === 'spaceship') markQuest('sawShip');
    }
    function toggleRun() {
      var nr = !running; if (nr) { captureChallengeStart(); setExplainOn(false); } setRunning(nr);
      announce(nr ? (prefersReducedMotion() ? t('stem.cellular.sr_running_reduced', 'Running at one generation per second because reduced motion is on.') : t('stem.cellular.sr_running', 'Running.')) : fmt(t('stem.cellular.sr_paused', 'Paused at generation {gen}.'), { gen: gen }));
    }
    // Jump ahead instantly (no animation): useful with reduced motion and for
    // long runs. Rewind history restarts from the new generation.
    function jumpAhead(steps) {
      // Challenges check every generation, so they only step or run.
      if (challenge && challengeStatus === 'active') return;
      markLooked(lifeKey(gridRef.current));
      var jumped = lifeRun(gridRef.current, { exactSteps: Math.max(0, steps | 0), wrap: wrap, birth: birthRule, survive: survivalRule }), next = jumped.grid, nextGen = genRef.current + steps;
      setRunning(false); resetTimeline(); gridRef.current = next; agesRef.current = ageGridFor(next); genRef.current = nextGen;
      // The [gen] effect adds the last generation itself.
      maxPopRef.current = Math.max(maxPopRef.current, jumped.peakPop); popHistRef.current = popHistRef.current.concat(jumped.pops).slice(-300);
      setMaxPop(maxPopRef.current); setPopHist(popHistRef.current.slice(0, -1));
      setGrid(next); setGen(nextGen);
      announce(fmt(t('stem.cellular.sr_jumped', 'Jumped ahead to generation {gen}: {pop} cells alive.'), { gen: nextGen, pop: countPop(next) }));
    }
    // Run the current start headlessly until it settles (or the cap) and log it.
    function runTrial(both) {
      var start = gridRef.current, base = startInfoRef.current || { source: 'drawn' }, cap = trialCap(ROWS);
      var wraps = both ? [true, false] : [wrap], rows = [];
      wraps.forEach(function (w) { markLooked(startKeyOf(start, w, birthRule, survivalRule)); });
      wraps.forEach(function (w) {
        var res = lifeRun(start, { wrap: w, birth: birthRule, survive: survivalRule, maxGen: cap });
        rows.push({ kind: base.source === 'soup' ? 'soup' : 'life', source: base.source, pattern: base.pattern || '', density: base.density != null ? Math.round(base.density * 100) / 100 : '', seed: base.seed || '', size: ROWS, wrap: w, rule: 'B' + birthRule + '/S' + survivalRule, startPop: res.startPop, lifetime: res.lifetime, end: res.end, period: res.period, endPop: res.endPop, peakPop: res.peakPop, cap: cap });
      });
      addRunRows(rows);
      var r0 = rows[0], msg = rows.length === 2 ? fmt(t('stem.cellular.trial_both', 'Logged 2 trials of the same start. Wrapping edges: {a}. Fixed edges: {b}.'), { a: trialOutcome(rows[0]), b: trialOutcome(rows[1]) }) : fmt(t('stem.cellular.trial_one', 'Logged a trial: {outcome}'), { outcome: trialOutcome(r0) });
      setTrialMsg(msg); announce(msg); markQuest('loggedTrial');
    }
    function runSoupBatch(count) {
      var rows = [], cap = trialCap(ROWS), density = soupDensity / 100;
      for (var i = 0; i < count; i++) {
        var seed = freshSeed(), g = soupGrid(ROWS, COLS, density, seed), res = lifeRun(g, { wrap: wrap, birth: birthRule, survive: survivalRule, maxGen: cap });
        rows.push({ kind: 'soup', source: 'soup', pattern: '', density: Math.round(density * 100) / 100, seed: seed, size: ROWS, wrap: wrap, rule: 'B' + birthRule + '/S' + survivalRule, startPop: res.startPop, lifetime: res.lifetime, end: res.end, period: res.period, endPop: res.endPop, peakPop: res.peakPop, cap: cap });
      }
      addRunRows(rows);
      var msg = fmt(t('stem.cellular.trial_batch', 'Logged {n} random soups at {pct}% alive on a {size} by {size} grid.'), { n: count, pct: soupDensity, size: ROWS });
      setTrialMsg(msg); announce(msg); markQuest('loggedTrial');
    }
    function addRunRows(rows) {
      patchSaved(function (s) {
        var log = fitRunLog(s.runLog), next = s.runNext || (log.length ? Math.max.apply(Math, log.map(function (r) { return r.id || 0; })) + 1 : 1);
        rows.forEach(function (r) { log.push(Object.assign({ id: next++ }, r)); });
        return { runLog: log.slice(-200), runNext: next };
      });
    }

    // ── Step and explain + predict-then-run (2026-11-04) ──
    function lifeKey(g) { return startKeyOf(g, wrap, birthRule, survivalRule); }
    function markLooked(key) { var lk = lookedRef.current; if (lk.keys[key]) return; if (lk.n >= 20000) { lk.overflow = true; return; } lk.keys[key] = true; lk.n++; }
    function fateWords(f, n) {
      switch (f) {
        case 'born': return t('stem.cellular.ex_cell_born', 'Next step: it comes alive.');
        case 'stays': return t('stem.cellular.ex_cell_stays', 'Next step: it stays alive.');
        case 'few': return t('stem.cellular.ex_cell_few', 'Next step: it dies of loneliness.');
        case 'many': return t('stem.cellular.ex_cell_many', 'Next step: it dies of crowding.');
        case 'gap': return fmt(t('stem.cellular.ex_cell_gap', 'Next step: it dies, because {n} is not on the survive list.'), { n: n });
        case 'none': return t('stem.cellular.ex_cell_none', 'Next step: it dies, because nothing survives under this rule.');
        default: return t('stem.cellular.ex_cell_empty', 'Next step: it stays empty.');
      }
    }
    function explainWordsFor(ex, g) {
      if (!ex || !ex.alive) return t('stem.cellular.ex_empty', 'The grid is empty, so nothing happens. Draw some squares first.');
      var parts = [fmt(t('stem.cellular.ex_head', 'Next step, generation {g} to {g2}. Born: {born}. Stay alive: {stay}. Die: {died}.'), { g: g, g2: g + 1, born: ex.born, stay: ex.stay, died: ex.died })];
      if (!ex.born && !ex.died) parts.push(t('stem.cellular.ex_still', 'Nothing changes: every live square stays and none is born.'));
      if (ex.born) parts.push(fmt(t('stem.cellular.ex_born_why', 'Every new square had a neighbour count on the birth list, B{b}.'), { b: birthRule }));
      if (ex.few) parts.push(fmt(t('stem.cellular.ex_few', 'Dying of loneliness, with fewer than {min} live neighbours: {n}.'), { min: ex.minS, n: ex.few }));
      if (ex.many) parts.push(fmt(t('stem.cellular.ex_many', 'Dying of crowding, with more than {max} live neighbours: {n}.'), { max: ex.maxS, n: ex.many }));
      if (ex.gap) parts.push(fmt(t('stem.cellular.ex_gap', 'Dying because their count is not on the survive list, S{s}: {n}.'), { s: survivalRule, n: ex.gap }));
      if (ex.none) parts.push(t('stem.cellular.ex_none', 'Every live square dies, because the survive list is empty.'));
      return parts.join(' ');
    }
    function openExplain() {
      if (running) return;
      var g = gridRef.current; setExplainOn(true); markLooked(lifeKey(g));
      announce(explainWordsFor(explainLifeStep(g, wrap, birthRule, survivalRule), genRef.current));
      setPathFocus('cell-do-step');
    }
    function doExplainedStep() {
      stepOnce();
      var g = gridRef.current; markLooked(lifeKey(g));
      announce(explainWordsFor(explainLifeStep(g, wrap, birthRule, survivalRule), genRef.current));
    }
    function closeExplain() { setExplainOn(false); setPathFocus('cell-step-explain'); }
    function closeChallenge() { setChallenge(null); setChallengeStatus('idle'); setChallengeMsg(''); challengeInitialRef.current = null; focusLifeGrid(); }
    function predictName(id) {
      switch (id) {
        case 'dies': return t('stem.cellular.pr_opt_dies', 'Dies out');
        case 'settles': return t('stem.cellular.pr_opt_settles', 'Settles and stops changing');
        case 'repeats': return t('stem.cellular.pr_opt_repeats', 'Repeats, blinking back and forth');
        default: return t('stem.cellular.pr_opt_flies', 'Flies away across the grid');
      }
    }
    function cancelPredict(keepPick) {
      var p = predictRef.current;
      if (!p.committed && !p.result && (keepPick || !p.pick)) return;
      var next = { pick: keepPick ? p.pick : null, committed: null, result: null };
      predictRef.current = next; setPredict(next);
    }
    function pickPredict(id) { setPredict(function (q) { return q.committed ? q : { pick: id, committed: null, result: null }; }); }
    // Locks the guess, then runs. XP (1, at most PREDICT_XP_CAP starts) only for a
    // right guess on a drawn or soup start whose future was not shown before.
    function commitPredict() {
      var p = predictRef.current, g = gridRef.current;
      if (!p.pick || p.committed || running || (challenge && challengeStatus === 'active') || !countPop(g)) return;
      var key = lifeKey(g), ledger = plainObj(saved.xp), earned = 0;
      for (var k in ledger) if (k.indexOf('pr_') === 0 && ledger[k] === true) earned++;
      var noXp = (startInfoRef.current && startInfoRef.current.source === 'pattern') || isGalleryShape(g, wrap, birthRule, survivalRule) ? 'pattern' : (lookedRef.current.keys[key] || lookedRef.current.overflow) ? 'looked' : ledger[key] === true ? 'again' : earned >= PREDICT_XP_CAP ? 'cap' : null;
      var next = { pick: p.pick, committed: { pick: p.pick, gen: genRef.current, key: key, noXp: noXp }, result: null };
      predictRef.current = next; setPredict(next); setExplainOn(false);
      setRunning(true);
      announce(fmt(t('stem.cellular.pr_locked', 'Guess locked in: {guess}. Running now.'), { guess: predictName(p.pick) }));
      setPathFocus('cell-predict');
    }
    function shortWay(d, size) { var a = Math.abs(d); return wrap ? Math.min(a, size - a) : a; }
    function finishPredict(outcome, dyn) {
      var p = predictRef.current; if (!p.committed || p.result) return;
      var right = !!outcome && outcome === p.committed.pick;
      // "Died out at" is the first generation with no live squares, even if the check ran later.
      var atGen = genRef.current;
      if (outcome === 'dies') transitionHistoryRef.current.some(function (sm) { if (sm.gen > p.committed.gen && sm.pop === 0) { atGen = sm.gen; return true; } return false; });
      var res = { outcome: outcome || 'unsure', right: right, gen: atGen, period: (dyn && dyn.period) || 0, dr: shortWay((dyn && dyn.dr) || 0, ROWS), dc: shortWay((dyn && dyn.dc) || 0, COLS), fixedEdges: !wrap, noXp: right ? p.committed.noXp : null };
      var next = { pick: p.pick, committed: p.committed, result: res };
      predictRef.current = next; setPredict(next);
      if (outcome) patchSaved(function (s) { var lp = plainObj(s.lifePredict), made = Math.max(0, Math.floor(Number(lp.made) || 0)), rt = Math.max(0, Math.floor(Number(lp.right) || 0)); return { lifePredict: { made: made + 1, right: rt + (right ? 1 : 0) } }; });
      if (right && !p.committed.noXp) awardOnce(p.committed.key, 'cellularLab_predict', 1, t('stem.cellular.xp_predict', 'Cellular Automaton Lab: predicted what a new start would do'));
      var ae = typeof document !== 'undefined' ? document.activeElement : null;
      if (ae && ae.id === 'cell-predict-skip') setPathFocus('cell-predict-again');
      announce(predictResultText(res, p.committed));
    }
    // Runs the remaining generations at once (no animation), stopping as soon as
    // the tracking classifies the run.
    function skipToResult() {
      var p = predictRef.current; if (!p.committed || p.result) return;
      setRunning(false);
      var limit = p.committed.gen + PREDICT_TIMEOUT;
      while (genRef.current < limit) {
        advanceOne(false);
        var skipPop = countPop(gridRef.current);
        maxPopRef.current = Math.max(maxPopRef.current, skipPop); popHistRef.current = popHistRef.current.concat([skipPop]).slice(-300);
        if (predictOutcomeOf(detectDynamics(gridRef.current, genRef.current, transitionHistoryRef.current))) break;
      }
      // The [gen] effect adds the last generation itself.
      setMaxPop(maxPopRef.current); setPopHist(popHistRef.current.slice(0, -1));
    }
    function predictResultText(res, committed) {
      if (res.outcome === 'unsure') return fmt(t('stem.cellular.pr_out_unsure', 'After {n} generations it was still changing, so none of the four fits yet. Keep it running and watch.'), { n: res.gen - committed.gen });
      var parts = [res.right ? t('stem.cellular.pr_right', 'Your guess was right.') : fmt(t('stem.cellular.pr_wrong', 'Not this time: you guessed “{guess}”.'), { guess: predictName(committed.pick) })];
      if (res.outcome === 'dies') parts.push(fmt(t('stem.cellular.pr_out_dies', 'It died out: no live squares were left at generation {g}.'), { g: res.gen }));
      else if (res.outcome === 'settles') parts.push(fmt(t('stem.cellular.pr_out_settles', 'It settled: by generation {g} it had stopped changing.'), { g: res.gen }));
      else if (res.outcome === 'repeats') parts.push(fmt(t('stem.cellular.pr_out_repeats', 'It repeats: by generation {g} it was cycling every {p} generations.'), { g: res.gen, p: res.period }));
      else parts.push(fmt(t('stem.cellular.pr_out_flies_v2', 'It flies: the same shape came back somewhere else. Generations it took: {p}. Rows moved: {rows}. Columns moved: {cols}.'), { p: res.period, rows: res.dr, cols: res.dc }));
      if (res.outcome === 'flies' && res.fixedEdges) parts.push(t('stem.cellular.pr_out_flies_wall', 'The edges are fixed, so this shape will hit a wall when it gets there, and that will change what it does.'));
      if (!res.right) parts.push(t('stem.cellular.pr_wrong_tip', 'Use Step and explain to see which squares are born or die, and why.'));
      else if (res.noXp === 'pattern') parts.push(t('stem.cellular.pr_noxp_pattern', 'No XP: gallery patterns are named in Patterns, so draw your own start or make a soup to earn XP.'));
      else if (res.noXp === 'looked') parts.push(t('stem.cellular.pr_noxp_looked', 'No XP: this start had already been run, forecast or explained.'));
      else if (res.noXp === 'again') parts.push(t('stem.cellular.pr_noxp_again', 'No XP: you already earned XP for this start.'));
      else if (res.noXp === 'cap') parts.push(t('stem.cellular.pr_noxp_cap', 'No XP: prediction XP is used up (5 starts).'));
      else parts.push(t('stem.cellular.pr_xp', 'You earned 1 XP for a start you had not watched before.'));
      return parts.join(' ');
    }
    function renderPredictCard() {
      var p = predict, locked = !!p.committed, res = p.result, lp = plainObj(saved.lifePredict);
      var made = Math.max(0, Math.floor(Number(lp.made) || 0)), right = Math.max(0, Math.floor(Number(lp.right) || 0));
      return h('section', { id: 'cell-predict', tabIndex: -1, 'data-life-predict': locked ? (res ? 'done' : 'locked') : 'open', 'aria-labelledby': 'cell-predict-title', style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: '7px' } },
        h('h3', { id: 'cell-predict-title', style: { margin: 0, fontSize: '12px', fontWeight: 900, color: C.accent } }, t('stem.cellular.pr_title', 'Predict, then run')),
        h('fieldset', { disabled: locked, style: { border: 0, margin: 0, padding: 0, minWidth: 0 } },
          h('legend', { style: { padding: 0, marginBottom: '4px', fontSize: '12px', fontWeight: 800, color: C.text } }, t('stem.cellular.pr_question', 'What will the shape on the grid do?')),
          LIFE_PREDICT_OPTIONS.map(function (id) {
            return h('label', { key: id, style: { display: 'flex', gap: '8px', alignItems: 'center', minHeight: '32px', fontSize: '12px', color: C.text, cursor: locked ? 'default' : 'pointer' } },
              h('input', { type: 'radio', name: 'cell-life-predict', value: id, checked: p.pick === id, onChange: function () { pickPredict(id); }, style: { width: '18px', height: '18px', flex: '0 0 auto', margin: 0 } }), predictName(id));
          })),
        !locked && btn(t('stem.cellular.pr_lock', 'Lock in my guess and run'), commitPredict, { key: 'prLock', id: 'cell-predict-lock', primary: true, big: true, disabled: !p.pick || pop === 0 || running }),
        !locked && (pop === 0 || running) && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, pop === 0 ? t('stem.cellular.pr_need_cells', 'Draw a start first.') : t('stem.cellular.pr_need_pause', 'Pause first, then predict.')),
        locked && !res && h('p', { role: 'status', style: { margin: 0, fontSize: '12px', color: C.text, fontWeight: 700 } }, fmt(t('stem.cellular.pr_watching', 'Your guess: {guess}. Watching the grid for the answer.'), { guess: predictName(p.committed.pick) })),
        locked && !res && btn(t('stem.cellular.pr_skip', 'Skip to the result'), skipToResult, { key: 'prSkip', id: 'cell-predict-skip' }),
        res && feedbackBox(res.right, predictResultText(res, p.committed), { 'data-predict-result': res.outcome === 'unsure' ? 'unsure' : res.right ? 'right' : 'wrong' }),
        res && btn(t('stem.cellular.pr_again', 'Predict again'), function () { var nx = { pick: null, committed: null, result: null }; predictRef.current = nx; setPredict(nx); setPathFocus('cell-predict'); }, { key: 'prAgain', id: 'cell-predict-again' }),
        made > 0 && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, fmt(t('stem.cellular.pr_tally', 'Your predictions so far: {right} right out of {made}.'), { right: right, made: made })));
    }

    var pop = countPop(grid);
    var forecastSeries = vizMode === 'forecast' ? projectLifeFuture(grid, agesRef.current, 8, wrap, birthRule, survivalRule) : [];
    var forecastPreview = forecastSeries[forecastHorizon - 1] || null;
    var forecastComparison = forecastPreview ? compareLifeStates(grid, forecastPreview.grid) : null;
    var forecastResidency = forecastSeries.length ? analyzeLifeForecastResidency(forecastSeries, forecastHorizon) : null;
    var forecastMotion = forecastSeries.length ? analyzeLifeForecastMotion(grid, forecastSeries, forecastHorizon, wrap) : null;
    // Step and explain (never on Practice boards: Life tab only) and the X-ray
    // summary read the next step off the engine; any look ahead marks the start.
    var explainShown = explainOn && !running && tab === 'life';
    var lifeExplain = (explainShown || (vizMode === 'xray' && tab === 'life')) ? explainLifeStep(grid, wrap, birthRule, survivalRule) : null;
    if (tab === 'life' && (explainShown || vizMode === 'xray' || vizMode === 'forecast')) markLooked(lifeKey(grid));
    // The numbers are 58% of a cell: at the fitted 7 px cell they read at 4 px, so on a
    // phone the grid grows while they show. It scrolls inside the stage; the page does not.
    var gridZoomed = phoneWidth && tab === 'life' && lifeSize <= 60 && PX >= 8 && (explainShown || vizMode === 'xray');
    useEffect(function () {
      if (!gridZoomed) { gridTapRef.current = null; return; }
      var stage = stageRef.current; if (!stage) return;
      var b = populationBounds(gridRef.current);
      var mid = (b ? b.centerC + 0.5 : COLS / 2) * ZOOM_CELL_PX;
      stage.scrollLeft = Math.max(0, mid - stage.clientWidth / 2);
    }, [gridZoomed, lifeSize]);

    // ── live description of the grid (text equivalent of the picture) ──
    function describeLifeShort() {
      var p = countPop(gridRef.current);
      if (!p) return fmt(t('stem.cellular.desc_short_empty', 'Generation {gen}: no live cells.'), { gen: genRef.current });
      return fmt(t('stem.cellular.desc_short', 'Generation {gen}: {pop} live cells in {groups} groups.'), { gen: genRef.current, pop: p, groups: countGroups(gridRef.current, wrap).groups });
    }
    function describeLifeLong(dyn, scan) {
      var parts = [], dw = dynWords(dyn, gen);
      if (!scan) parts.push(fmt(t('stem.cellular.desc_empty', 'Generation {gen}. The {rows} by {cols} grid is empty.'), { gen: gen, rows: ROWS, cols: COLS }));
      else {
        var groups = countGroups(grid, wrap);
        parts.push(fmt(t('stem.cellular.desc_main', 'Generation {gen}. {pop} live cells on a {rows} by {cols} grid, in {groups} separate groups; the largest has {largest} cells.'), { gen: gen, pop: scan.pop, rows: ROWS, cols: COLS, groups: groups.groups, largest: groups.largest }));
        parts.push(fmt(t('stem.cellular.desc_span', 'They span rows {r1} to {r2} and columns {c1} to {c2}, centred near row {cr}, column {cc}.'), { r1: scan.minR + 1, r2: scan.maxR + 1, c1: scan.minC + 1, c2: scan.maxC + 1, cr: Math.round(scan.centerR + 1), cc: Math.round(scan.centerC + 1) }));
      }
      parts.push(fmt(t('stem.cellular.desc_rule', 'Rule B{b}/S{s}, {edges}.'), { b: birthRule, s: survivalRule, edges: wrap ? t('stem.cellular.edges_wrap_lower', 'wrapping edges') : t('stem.cellular.edges_fixed_lower', 'fixed edges') }));
      parts.push(fmt(t('stem.cellular.desc_dynamics', 'Dynamics: {label}. {detail}'), { label: dw.label, detail: dw.detail }));
      if (vizMode === 'forecast' && forecastComparison) parts.push(fmt(t('stem.cellular.desc_forecast', 'Forecast {h} generations ahead: {appear} cells appear, {remain} stay and {gone} are gone, for a population of {pop}.'), { h: forecastHorizon, appear: forecastComparison.appeared, remain: forecastComparison.retained, gone: forecastComparison.gone, pop: forecastComparison.population }));
      if (vizMode === 'change' && gen > 0) parts.push(fmt(t('stem.cellular.desc_change', 'Last step: {born} births, {survived} survivors and {died} deaths.'), { born: transitionRef.current.born, survived: transitionRef.current.survived, died: transitionRef.current.died }));
      return parts.join(' ');
    }
    // ── population sonification (Web Audio; host context when it exists) ──
    function getAudio() {
      try {
        if (typeof window === 'undefined' || window._alloGlobalMute) return null;
        try { if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return null; } catch (e1) {}
        if (window.StemLab && typeof window.StemLab.audioContext === 'function') { var hc = window.StemLab.audioContext(); if (hc) return hc; }
        var Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return null;
        if (!audioRef.current || audioRef.current.ctx.state === 'closed') audioRef.current = { ctx: new Ctor(), own: true };
        var ac = audioRef.current.ctx; if (ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (_) {} }
        return ac;
      } catch (e) { return null; }
    }
    // Pitch from 220 Hz (empty) up two octaves (half the grid alive), log scale.
    function popPitch(p, cells) { var frac = cells ? Math.min(1, p / (cells * 0.5)) : 0; return 220 * Math.pow(2, 2 * Math.sqrt(frac)); }
    function playPopTone(p, cells, dur, when) { return playFreq(p ? popPitch(p, cells) : 110, dur, when, p ? 'triangle' : 'sine'); }
    function playFreq(freq, dur, when, type) {
      var ac = getAudio(); if (!ac) return false;
      try {
        var t0 = ac.currentTime + (when || 0), osc = ac.createOscillator(), gainNode = ac.createGain();
        osc.type = type || 'triangle'; osc.frequency.setValueAtTime(freq, t0);
        gainNode.gain.setValueAtTime(0.0001, t0); gainNode.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gainNode); gainNode.connect(ac.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
        // Keep notes still to come, so unmount can silence them on a shared (host) context.
        var now = ac.currentTime;
        notesRef.current = notesRef.current.filter(function (nt) { return nt.ac !== ac || nt.end > now; }).concat([{ ac: ac, osc: osc, gain: gainNode, end: t0 + dur + 0.02 }]);
        return true;
      } catch (e) { return false; }
    }
    // An optional, button-started sound for a board (off by default). If the
    // browser has no audio, it says so and stays off.
    function soundToggle(id, on, setOn) {
      // A toggle button: the name stays the same and aria-pressed carries the state.
      return btn(t('stem.cellular.btn_board_sound', 'Play each step as a note'), function () {
        if (!on && !getAudio()) { announce(t('stem.cellular.sr_no_audio', 'Sound is not available here.')); return; }
        setOn(!on); announce(!on ? t('stem.cellular.sr_sound_on', 'Sound on.') : t('stem.cellular.sr_sound_off', 'Sound off.'));
      }, { key: 'snd-' + id, pressed: on });
    }
    // Plays the kept population history as a short melody (up to 64 notes).
    function playPopHistory() {
      var series = popHistRef.current.slice(-64);
      if (series.length < 2) { announce(t('stem.cellular.sr_no_history', 'Step or run first; there is no population history to play yet.')); return; }
      var ok = true;
      series.forEach(function (p, i) { if (!playPopTone(p, ROWS * COLS, 0.11, i * 0.12)) ok = false; });
      var lo = Math.min.apply(Math, series), hi = Math.max.apply(Math, series);
      announce(ok ? fmt(t('stem.cellular.sr_playing_history', 'Playing {n} generations: higher notes mean more live cells. Lowest {lo}, highest {hi}.'), { n: series.length, lo: lo, hi: hi }) : t('stem.cellular.sr_no_audio', 'Sound is not available here.'));
    }

    // ── elementary CA ops ──
    function setRuleSafe(n) { var v = clampRule(n); setRule(v); setRuleDraft(String(v)); markQuest('exploredRule'); if (v === 110) markQuest('saw110'); }
    function onRuleDraft(text) {
      var clean = String(text == null ? '' : text).replace(/[^0-9]/g, '').slice(0, 3);
      setRuleDraft(clean);
      var v = parseRuleNumber(clean);
      if (v != null) { setRule(v); markQuest('exploredRule'); if (v === 110) markQuest('saw110'); }
    }
    var ruleDraftValid = parseRuleNumber(ruleDraft) != null;
    function logCaRule() {
      var m = caMeasure(rule, caRowSeed);
      addRunRows([{ kind: 'ca', source: 'rule', rule: 'R' + rule, ruleNumber: rule, seed: caRowSeed, size: 81, wrap: true, density: Math.round(m.density * 100) / 100, end: m.kind, period: m.period, shift: m.shift, lifetime: '', startPop: '', endPop: '' }]);
      var msg = fmt(t('stem.cellular.ca_logged', 'Logged Rule {rule}: {behaviour}'), { rule: rule, behaviour: caKindWords(m) });
      setTrialMsg(msg); announce(msg); markQuest('loggedTrial');
    }
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
      else if (e.key === ' ' || e.key === 'Enter') { toggleCustomSeedCell(seedCursor); announce(fmt(customSeed[seedCursor] ? t('stem.cellular.seed_cell_empty', 'Seed cell {n}, empty') : t('stem.cellular.seed_cell_alive', 'Seed cell {n}, alive'), { n: seedCursor + 1 })); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { toggleCustomSeedCell(seedCursor, 0); announce(fmt(t('stem.cellular.seed_cell_empty', 'Seed cell {n}, empty'), { n: seedCursor + 1 })); }
      else handled = false;
      if (handled) { if (e.preventDefault) e.preventDefault(); setSeedCursor(Math.max(0, Math.min(CA_COLS - 1, next))); }
    }
    function clearCustomSeed() { var row = []; for (var i = 0; i < CA_COLS; i++) row.push(0); setCustomSeed(row); setCaSeed('custom'); announce(t('stem.cellular.sr_seed_cleared', 'Custom seed cleared.')); }
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
        key: opts.key || label, id: opts.id || undefined, type: 'button', onClick: onClick, disabled: !!opts.disabled,
        'aria-pressed': opts.pressed === undefined ? undefined : !!opts.pressed,
        'aria-label': opts.ariaLabel || undefined,
        title: opts.title || undefined,
        style: {
          padding: opts.big ? '9px 14px' : '7px 12px', minHeight: opts.big ? '44px' : '32px', borderRadius: '9px', cursor: opts.disabled ? 'not-allowed' : 'pointer', opacity: opts.disabled ? 0.45 : 1, fontSize: opts.big ? '13px' : '12px', fontWeight: 700,
          // primary/pressed buttons use a fixed emerald-700 so white text clears
          // 4.5:1 in both themes (the shared C.accent is emerald-400/600 → fails).
          border: '1px solid ' + ((opts.primary || opts.pressed) ? '#047857' : C.border),
          background: (opts.pressed || opts.primary) ? '#047857' : C.panel,
          color: (opts.pressed || opts.primary) ? '#ffffff' : C.text,
          whiteSpace: 'nowrap'
        }
      }, label);
    }
    // Cache for pure, handler-free SVG elements (pattern thumbnails and pulse
    // charts). The key holds every input the element depends on (theme
    // colours, translated text), so a reused element is always current, and
    // React skips re-rendering an element it has seen before.
    var elCacheRef = useRef({ n: 0, map: {} });
    function cachedEl(cacheKey, build) {
      var c = elCacheRef.current;
      if (!Object.prototype.hasOwnProperty.call(c.map, cacheKey)) { if (c.n >= 240) { c.map = {}; c.n = 0; } c.map[cacheKey] = build(); c.n++; }
      return c.map[cacheKey];
    }
    // One hint-ladder look in every section: one button that adds the next
    // hint ("Hint 1 of 3") and a numbered list of the hints shown so far.
    function hintLadder(id, level, texts, onMore, opts) {
      opts = opts || {};
      var max = texts.length, shown = texts.slice(0, Math.max(0, Math.min(level, max)));
      return h('div', { key: 'ladder-' + id, 'data-hint-ladder': id, style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' } },
        btn(level >= max ? t('stem.cellular.hint_all_shown', 'All hints shown') : fmt(t('stem.cellular.hint_n_of', 'Hint {n} of {k}'), { n: level + 1, k: max }), function () { if (level < max) { onMore(level + 1); announce(texts[level]); } }, { key: 'hint-' + id, disabled: level >= max || !!opts.disabled }),
        shown.length > 0 && h('ol', { 'aria-label': t('stem.cellular.hints_aria', 'Hints so far'), style: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: C.text, lineHeight: 1.5 } }, shown.map(function (tx, i) { return h('li', { key: i }, tx); })));
    }
    // One feedback-box look: green when right, amber for "not yet".
    // Pale right/try-again colours, except in the contrast theme: the host forces
    // yellow text there, which is unreadable on a pale box.
    function statusTone(ok) { return contrast ? { background: '#000000', color: '#ffff00', border: '2px solid #ffff00' } : { background: ok ? '#d1fae5' : '#fef3c7', color: ok ? '#065f46' : '#78350f' }; }
    function feedbackBox(ok, content, extra) {
      return h('div', Object.assign({ role: 'status', style: Object.assign({ padding: '9px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }, statusTone(ok)) }, extra || {}), content);
    }

    function lifeFill(neighbours, age, r, c) {
      if (contrast) return C.live;
      if (vizMode === 'field') return '#67e8f9';
      if (vizMode === 'change') return previousGridRef.current && previousGridRef.current[r] && previousGridRef.current[r][c] ? '#22d3ee' : '#4ade80';
      if (vizMode === 'age') { var a = Math.min(1, Math.max(0, (age || 1) - 1) / 45); return 'hsl(' + Math.round(48 + a * 220) + ',88%,66%)'; }
      if (vizMode === 'xray') { var xc = ['#94a3b8','#64748b','#ef4444','#22c55e','#f59e0b','#f97316','#ef4444','#dc2626','#e11d48']; return xc[neighbours] || C.live; }
      if (lifeHue < 0) return '#f8fafc';
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
      var liveBuckets = {}, bucketOrder = [], cellSide = Math.max(1, PX - 1.3), liveLayerIndex = rects.length;
      var exView = explainShown && lifeExplain ? lifeExplain : null, exDie = '', exBorn = '', exNums = !!exView && lifeSize <= 60 && PX >= 8, exSide = Math.max(1, PX - 2);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var n = neighborCount(grid, r, c, wrap), alive = !!grid[r][c], futureAlive = !!(forecastPreview && forecastPreview.grid[r][c]), residency = forecastResidency ? forecastResidency.grid[r][c] : 0;
        if (exView) {
          // Explaining the next step: solid cyan stays, rose outline dies, dashed green is born.
          var fate = exView.fate[r * COLS + c];
          if (alive && fate === 'stays') { if (!liveBuckets['ex|stay']) { liveBuckets['ex|stay'] = { fill: '#22d3ee', glow: '', d: [] }; bucketOrder.push('ex|stay'); } liveBuckets['ex|stay'].d.push('M' + (c * PX + 0.65) + ' ' + (r * PX + 0.65) + 'h' + cellSide + 'v' + cellSide + 'h-' + cellSide + 'z'); }
          else if (alive) exDie += 'M' + (c * PX + 1) + ' ' + (r * PX + 1) + 'h' + exSide + 'v' + exSide + 'h-' + exSide + 'z';
          else if (fate === 'born') exBorn += 'M' + (c * PX + 1) + ' ' + (r * PX + 1) + 'h' + exSide + 'v' + exSide + 'h-' + exSide + 'z';
          if (exNums && (alive || fate === 'born')) rects.push(h('text', { key: 'ex' + r + '_' + c, x: c * PX + PX / 2, y: r * PX + PX * 0.7, textAnchor: 'middle', fill: alive && fate === 'stays' ? '#0f172a' : '#ffffff', style: { fontSize: Math.max(5, PX * 0.58) + 'px', fontWeight: 900, pointerEvents: 'none' } }, String(n)));
          continue;
        }
        if (vizMode === 'forecast' && residency) {
          var residencyRatio = residency / forecastHorizon;
          rects.push(h('rect', { key: 'forecastResidency' + r + '_' + c, 'data-life-forecast-residency': String(residency), x: c * PX + 0.18, y: r * PX + 0.18, width: Math.max(1, PX - 0.36), height: Math.max(1, PX - 0.36), rx: PX > 7 ? 2.4 : 0.8, fill: 'rgba(253,224,71,' + (0.025 + residencyRatio * 0.095).toFixed(3) + ')', stroke: 'rgba(253,224,71,' + (0.16 + residencyRatio * 0.5).toFixed(3) + ')', strokeWidth: Math.max(0.45, PX / 15), style: { filter: residencyRatio > 0.7 ? 'drop-shadow(0 0 ' + Math.max(1, PX / 4) + 'px rgba(253,224,71,0.5))' : 'none', pointerEvents: 'none' } }));
        }
        if (alive) {
          // Live cells are batched into one path per colour (a 120 x 120 soup
          // used to be ~14,000 separate SVG rects, redrawn every generation).
          var fillKey = vizMode === 'forecast' ? (futureAlive ? '#22d3ee' : '#fb7185') : lifeFill(n, agesRef.current[r] && agesRef.current[r][c], r, c);
          var glowKey = vizMode === 'forecast' ? (futureAlive ? 'rgba(34,211,238,0.9)' : 'rgba(251,113,133,0.9)') : vizMode === 'field' ? 'rgba(103,232,249,0.9)' : vizMode === 'normal' && n >= 2 && n <= 3 ? C.live : '';
          var bucketKey = fillKey + '|' + glowKey;
          if (!liveBuckets[bucketKey]) { liveBuckets[bucketKey] = { fill: fillKey, glow: glowKey, d: [] }; bucketOrder.push(bucketKey); }
          liveBuckets[bucketKey].d.push('M' + (c * PX + 0.65) + ' ' + (r * PX + 0.65) + 'h' + cellSide + 'v' + cellSide + 'h-' + cellSide + 'z');
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
      var glowOk = lifeSize <= 60 && !(running && lifeSize > 40), exLayers = [];
      if (exDie) exLayers.push(h('path', { key: 'exDie', 'data-life-explain-layer': 'die', d: exDie, fill: 'rgba(251,113,133,0.28)', stroke: '#fb7185', strokeWidth: Math.max(0.8, PX / 7), style: { pointerEvents: 'none' } }));
      if (exBorn) exLayers.push(h('path', { key: 'exBorn', 'data-life-explain-layer': 'born', d: exBorn, fill: 'rgba(74,222,128,0.18)', stroke: '#4ade80', strokeWidth: Math.max(0.8, PX / 7), strokeDasharray: PX >= 7 ? '2 1.5' : undefined, style: { pointerEvents: 'none' } }));
      rects.splice.apply(rects, [liveLayerIndex, 0].concat(bucketOrder.map(function (bk, bi) {
        var b = liveBuckets[bk];
        return h('path', { key: 'live' + bi, 'data-life-live-layer': 'true', d: b.d.join(''), fill: b.fill, style: { filter: glowOk && b.glow ? 'drop-shadow(0 0 ' + Math.max(1, PX / 4) + 'px ' + b.glow + ')' : 'none', pointerEvents: 'none' } });
      }), exLayers));
      if (vizMode === 'forecast' && !exView && forecastMotion && forecastMotion.points.length) {
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
      if (pop === 0) rects.push(h('text', { key: 'empty', x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#cbd5e1', style: { fontSize: Math.max(9, Math.min(14, W / 30)) + 'px', fontStyle: 'italic' } }, t('stem.cellular.grid_empty_hint', 'Draw cells, choose a pattern, or make a random soup')));
      rects.push(h('rect', { key: 'cursor', x: cursor[1] * PX, y: cursor[0] * PX, width: PX, height: PX, fill: 'none', stroke: C.cursor, strokeWidth: Math.max(1.4, PX / 7), rx: 2, style: { pointerEvents: 'none', filter: 'drop-shadow(0 0 4px ' + C.cursor + ')' } }));
      // The picture is aria-hidden; the focusable wrapper is a real grid whose
      // ONE rendered gridcell (the cursor cell) is its aria-activedescendant,
      // so the grid is one tab stop however large it is.
      var svg = h('svg', { ref: gridSvgRef, className: 'cellularlab-svg', viewBox: '0 0 ' + W + ' ' + H, width: '100%', 'aria-hidden': 'true', focusable: 'false', onMouseDown: function (e) { if (Date.now() - lastTouchRef.current > 1000) onGridPointerDown(e); }, onMouseMove: onGridPointerMove, onMouseUp: onGridPointerUp, onMouseLeave: onGridPointerUp, onTouchStart: function (e) {
        lastTouchRef.current = Date.now();
        // Zoomed, a finger moves the view and a tap changes one square; a stroke would paint while scrolling.
        if (gridZoomed) { var t0 = e.touches && e.touches[0]; gridTapRef.current = t0 ? { clientX: t0.clientX, clientY: t0.clientY } : null; return; }
        onGridPointerDown(e);
      }, onTouchMove: function (e) {
        if (gridZoomed) { var t1 = e.touches && e.touches[0], t0 = gridTapRef.current; if (t0 && t1 && Math.abs(t1.clientX - t0.clientX) + Math.abs(t1.clientY - t0.clientY) > 10) gridTapRef.current = null; return; }
        onGridPointerMove(e);
      }, onTouchEnd: function () {
        lastTouchRef.current = Date.now();
        if (gridZoomed && gridTapRef.current) { var tap = gridTapRef.current; gridTapRef.current = null; onGridPointerDown(tap); }
        onGridPointerUp();
      }, onTouchCancel: function () { gridTapRef.current = null; onGridPointerUp(); }, style: { maxWidth: gridZoomed ? 'none' : '620px', width: gridZoomed ? (COLS * ZOOM_CELL_PX) + 'px' : '100%', height: 'auto', borderRadius: '14px', border: '1px solid rgba(52,211,153,0.35)', touchAction: gridZoomed ? 'pan-x pan-y' : 'none', display: 'block', background: '#020617', cursor: 'crosshair', boxShadow: '0 22px 60px rgba(2,6,23,0.42), inset 0 0 42px rgba(16,185,129,0.08)' } }, rects);
      var activeId = 'cell-life-active-cell';
      return h('div', { style: gridZoomed ? { flex: 'none', width: (COLS * ZOOM_CELL_PX) + 'px' } : { maxWidth: '620px', width: '100%' } },
        h('div', { id: 'cell-life-grid', role: 'grid', tabIndex: 0, 'data-life-grid': 'true', 'aria-label': fmt(t('stem.cellular.grid_label', 'Life grid, {rows} by {cols}. Arrow keys move the cursor; Space toggles a cell.'), { rows: ROWS, cols: COLS }), 'aria-describedby': 'cell-life-grid-desc', 'aria-rowcount': ROWS, 'aria-colcount': COLS, 'aria-activedescendant': activeId, onKeyDown: onGridKeyDown, style: { width: '100%', borderRadius: '14px' } },
          svg,
          h('div', { role: 'row', 'aria-rowindex': cursor[0] + 1, style: SR_ONLY },
            h('div', { role: 'gridcell', id: activeId, 'aria-colindex': cursor[1] + 1, 'aria-selected': 'true' }, cellWords(cursor[0], cursor[1])))),
        h('p', { id: 'cell-life-grid-desc', style: SR_ONLY }, describeLifeLong(dynamicsScan, scan)));
    }

    function statChip(label, value, accent) {
      return h('div', { key: label, style: { background: dark ? 'rgba(15,23,42,0.82)' : '#ffffff', border: '1px solid ' + (accent || C.border), borderRadius: '11px', padding: '7px 10px', minWidth: '78px', textAlign: 'center', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' } }, h('div', { style: { fontSize: '9px', color: C.sub, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' } }, label), h('div', { style: { fontSize: '17px', color: C.text, fontWeight: 900, marginTop: '2px' } }, value));
    }
    function sanitizeRule(value) { var seen = {}, out = ''; String(value || '').replace(/[^0-8]/g, '').split('').forEach(function (n) { if (!seen[n]) { seen[n] = true; out += n; } }); return out.split('').sort().join(''); }
    // Real fullscreen is refused inside a sandboxed embed (the Canvas surface), where
    // this bare requestFullscreen() rejected with nothing listening — the button did
    // nothing and said nothing. The shared host helper tries real fullscreen and falls
    // back to a CSS fill-frame with Escape to leave, so it always does something.
    function toggleFullscreenLife() { var node = stageRef.current; if (!node || typeof document === 'undefined') return; if (typeof window !== 'undefined' && typeof window.__alloStemFS === 'function') { window.__alloStemFS(node); return; } if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); else { var enter = node.requestFullscreen || node.webkitRequestFullscreen; if (enter) { try { var p = enter.call(node); if (p && p.catch) p.catch(function () {}); } catch (e) {} } } }
    // PNG export. Downloads are blocked inside Gemini Canvas, so the picture is
    // ALSO shown on the page (save it from there) and can open in a new window.
    var sPngShot = useState(null); var pngShot = sPngShot[0], setPngShot = sPngShot[1];
    function exportLifePng() {
      var svg = gridSvgRef.current; if (!svg || typeof XMLSerializer === 'undefined') return;
      var url = null, image = null, shotGen = gen;
      var failed = function () { announce(t('stem.cellular.sr_png_failed', 'PNG export is not available in this browser.')); };
      try { url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' })); image = new Image(); } catch (e) { failed(); return; }
      image.onload = function () {
        var data = null;
        try { var canvas = document.createElement('canvas'), size = 1200; canvas.width = size; canvas.height = size; var g = canvas.getContext('2d'); g.fillStyle = '#020617'; g.fillRect(0, 0, size, size); g.drawImage(image, 0, 0, size, size); data = canvas.toDataURL('image/png'); } catch (e) { data = null; }
        try { URL.revokeObjectURL(url); } catch (_) {}
        if (!data || data.indexOf('data:image/png') !== 0) { failed(); return; }
        setPngShot({ url: data, gen: shotGen });
        try { var link = document.createElement('a'); link.download = 'cellular-automaton-gen-' + shotGen + '.png'; link.href = data; document.body.appendChild(link); link.click(); document.body.removeChild(link); } catch (_) {}
        announce(t('stem.cellular.sr_png_ready', 'PNG ready. If nothing downloaded, save the picture shown under the buttons, or open it in a new window.'));
      };
      image.onerror = function () { try { URL.revokeObjectURL(url); } catch (_) {} failed(); };
      image.src = url;
    }
    function escHtml(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
    function pngAlt(shot) { return fmt(t('stem.cellular.png_alt', 'Picture of the Life grid at generation {g}.'), { g: shot.gen }); }
    function openPngWindow() {
      if (!pngShot) return;
      var w = null;
      try { w = window.open('', '_blank'); } catch (e) { w = null; }
      if (!w || !w.document) { announce(t('stem.cellular.sr_png_blocked', 'The new window was blocked. Save the picture shown under the buttons instead (right-click or long-press it).')); return; }
      try { w.document.open(); w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + escHtml(t('stem.cellular.png_window_title', 'Cellular Automaton Lab picture')) + '</title></head><body style="margin:0;background:#020617;display:flex;justify-content:center"><img alt="' + escHtml(pngAlt(pngShot)) + '" src="' + pngShot.url + '" style="max-width:100%;height:auto"></body></html>'); w.document.close(); } catch (e2) {}
      announce(t('stem.cellular.sr_png_window', 'The picture opened in a new window.'));
    }
    function renderPngShot() {
      if (!pngShot) return null;
      return h('figure', { 'data-png-shot': 'true', style: { margin: 0, display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap', padding: '8px', borderRadius: '10px', border: '1px solid ' + C.border, background: C.panel } },
        h('img', { src: pngShot.url, alt: pngAlt(pngShot), style: { width: '160px', height: '160px', borderRadius: '6px', border: '1px solid ' + C.border } }),
        h('figcaption', { style: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: C.text, maxWidth: '320px' } },
          t('stem.cellular.png_caption', 'Your PNG. If the download did not start, right-click or long-press the picture to save it, or open it in a new window.'),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            btn(t('stem.cellular.btn_png_window', 'Open the image in a new window'), openPngWindow, { key: 'pngwin' }),
            btn(t('stem.cellular.btn_png_close', 'Close the picture'), function () { setPngShot(null); }, { key: 'pngclose' }))));
    }
    function populationChart() {
      var samples = transitionHistoryRef.current.slice(-100); if (samples.length < 2) return null;
      var W = 520, H = 76, pad = 7, n = samples.length, ceiling = 1;
      samples.forEach(function (s) { ceiling = Math.max(ceiling, s.pop, s.born, s.died); });
      var x = function (i) { return pad + i / Math.max(1, n - 1) * (W - pad * 2); };
      var y = function (value) { return pad + (1 - value / ceiling) * (H - pad * 2); };
      var points = function (key) { return samples.map(function (s, i) { return x(i).toFixed(1) + ',' + y(s[key]).toFixed(1); }).join(' '); };
      var latest = samples[n - 1], net = latest.born - latest.died;
      var legend = [{ key:'pop', label:t('stem.cellular.chart_population', 'Population'), color:'#22d3ee', value:latest.pop }, { key:'born', label:t('stem.cellular.chart_births', 'Births'), color:'#4ade80', value:latest.born }, { key:'died', label:t('stem.cellular.chart_deaths', 'Deaths'), color:'#fb7185', value:latest.died }];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0, padding: '8px 10px', borderRadius: '13px', background: dark ? 'rgba(15,23,42,0.72)' : 'rgba(248,250,252,0.9)', border: '1px solid ' + C.border } },
        h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { fontSize: '9px', color: C.sub, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, fmt(t('stem.cellular.chart_signal_title', 'Evolution signal: {n} generations'), { n: n })), legend.map(function (item) { return h('span', { key: item.key, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: C.text, fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: item.key === 'born' ? '8px' : '10px', height: item.key === 'died' ? '8px' : '3px', transform: item.key === 'died' ? 'rotate(45deg)' : 'none', background: item.color, borderRadius: item.key === 'pop' ? '999px' : '1px', boxShadow: '0 0 7px ' + item.color } }), fmt(t('stem.cellular.chart_legend_value', '{label} {value}'), { label: item.label, value: item.value })); }), h('span', { style: { marginLeft: 'auto', fontSize: '10px', color: net > 0 ? (dark ? '#86efac' : '#15803d') : net < 0 ? (dark ? '#fda4af' : '#be123c') : C.sub, fontWeight: 900 } }, fmt(t('stem.cellular.chart_net', 'Net {n}'), { n: (net > 0 ? '+' : '') + net }))),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': fmt(t('stem.cellular.chart_signal_aria', 'Evolution over {n} generations. Latest population {pop}, births {born}, deaths {died}, net change {net}. Scale zero to {max} cells.'), { n: n, pop: latest.pop, born: latest.born, died: latest.died, net: net, max: ceiling }), style: { width: '100%', height: H + 'px', display: 'block' } },
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
        else announce(fmt(t('stem.cellular.sr_phase_current', 'Generation {gen} is the current state.'), { gen: points[nearest].gen }));
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
          h('span', { style: { fontSize: '9px', color: dark ? '#c4b5fd' : '#6d28d9', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, t('stem.cellular.phase_title', 'Phase portrait')),
          h('span', { role: 'status', 'aria-live': 'polite', style: { fontSize: '10px', color: C.text, fontWeight: 900 } }, fmt(t('stem.cellular.phase_inspect', 'Generation {gen}: population {pop}, turnover {turn}'), { gen: selected.gen, pop: selected.population, turn: selected.turnover })),
          futureSelected && h('span', { 'data-life-forecast-selection': String(futureSelected.step), style: { fontSize: '9px', color: dark ? '#fef08a' : '#854d0e', fontWeight: 900 } }, fmt(t('stem.cellular.phase_future_pick', 'Forecast +{step}: population {pop}, turnover {turn}'), { step: futureSelected.step, pop: futureSelected.population, turn: futureSelected.turnover })),
          futureEnd && h('span', { 'data-life-forecast-endpoint': String(futureEnd.step), style: { fontSize: '9px', color: dark ? '#fde68a' : '#92400e', fontWeight: 900 } }, fmt(t('stem.cellular.phase_future_end', 'Ghost end +{step}: population {pop}, turnover {turn}'), { step: futureEnd.step, pop: futureEnd.population, turn: futureEnd.turnover })),
          h('span', { style: { marginLeft: 'auto', fontSize: '9px', color: C.sub, fontWeight: 800 } }, future.length ? fmt(t('stem.cellular.phase_counts_future', '{n} observed, {m} projected'), { n: points.length, m: future.length }) : fmt(t('stem.cellular.phase_counts', '{n} observed'), { n: points.length }))
        ),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'slider', tabIndex: 0, 'data-life-phase-portrait': 'true', 'data-life-forecast-count': String(future.length), 'aria-label': t('stem.cellular.phase_aria', 'Phase portrait time machine: population across, turnover up. Arrow keys inspect kept generations; Enter rewinds to the selected one.'), 'aria-orientation': 'horizontal', 'aria-valuemin': 0, 'aria-valuemax': points.length - 1, 'aria-valuenow': selectedIndex, 'aria-valuetext': fmt(t('stem.cellular.phase_valuetext', 'Generation {gen}, population {pop}, turnover {turn}. Latest generation {latest}.'), { gen: selected.gen, pop: selected.population, turn: selected.turnover, latest: latest.gen }), onClick: onPhasePointer, onKeyDown: onPhaseKeyDown, style: { width: '100%', height: H + 'px', display: 'block', cursor: 'crosshair' } },
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
          h('text', { x: W - right, y: H - 4, textAnchor: 'end', fill: C.sub, fontSize: 8, fontWeight: 800, style: { pointerEvents: 'none' } }, t('stem.cellular.phase_axis_pop', 'population')),
          h('text', { x: 8, y: top, transform: 'rotate(-90 8 ' + top + ')', textAnchor: 'end', fill: C.sub, fontSize: 8, fontWeight: 800, style: { pointerEvents: 'none' } }, t('stem.cellular.phase_axis_turnover', 'turnover'))
        ),
        h('div', { style: { color: C.sub, fontSize: '9px', fontWeight: 800, textAlign: 'center' } }, future.length ? t('stem.cellular.phase_help_future', 'Violet points are observed. Click a gold diamond to inspect a forecast step; Apply forecast advances one step.') : t('stem.cellular.phase_help', 'Click a point to rewind. Arrow keys inspect time; Enter rewinds to the selected generation.'))
      );
    }    function renderLifeTab() {
      var spatialScan = populationBounds(grid), dynamics = detectDynamics(grid, gen, transitionHistoryRef.current), dynText = dynWords(dynamics, gen);
      var dynamicsColor = dynamics.kind === 'stable' ? '#4ade80' : dynamics.kind === 'oscillator' ? '#c4b5fd' : dynamics.kind === 'spaceship' ? '#fbbf24' : dynamics.kind === 'extinct' ? '#fb7185' : '#67e8f9';
      var dynamicsIcon = dynamics.kind === 'stable' ? '◆' : dynamics.kind === 'oscillator' ? '↻' : dynamics.kind === 'spaceship' ? '↗' : dynamics.kind === 'extinct' ? '○' : dynamics.kind === 'ready' ? '◇' : '…';
      var rulePresets = [{ name: t('stem.cellular.preset_conway', 'Conway'), b: '3', s: '23' }, { name: t('stem.cellular.preset_seeds', 'Seeds'), b: '2', s: '' }, { name: t('stem.cellular.preset_highlife', 'HighLife'), b: '36', s: '23' }, { name: t('stem.cellular.preset_daynight', 'Day & Night'), b: '3678', s: '34678' }, { name: t('stem.cellular.preset_diamoeba', 'Diamoeba'), b: '35678', s: '5678' }];
      var k5 = band === 'k5';
      var challenges = [
        { id: 'still', note: k5 ? t('stem.cellular.ch_still_note_k5', 'Make a shape that never changes.') : t('stem.cellular.ch_still_note', 'Stay unchanged after one step.') },
        { id: 'oscillator', note: k5 ? t('stem.cellular.ch_osc_note_k5', 'Make a shape that changes and then comes back, like a blinking light.') : t('stem.cellular.ch_osc_note', 'Change, then return to the starting pattern.') },
        { id: 'extinction', note: t('stem.cellular.ch_ext_note', 'At least 4 cells that live for a while, then all die.') },
        { id: 'methuselah', note: t('stem.cellular.ch_meth_note', 'Five cells or fewer that are still changing at generation 50.') },
        { id: 'maxpop', note: t('stem.cellular.ch_boom_note', 'Exactly 5 cells; grow the biggest peak by generation 50.') }
      ].filter(function (ch) { return !k5 || ch.id === 'still' || ch.id === 'oscillator'; });
      var done = saved.challengesDone || {};
      var challengeActive = challenge && challengeStatus === 'active';
      var lensBtns = [{ id: 'normal', label: t('stem.cellular.lens_normal', 'Normal') }, { id: 'forecast', label: t('stem.cellular.lens_forecast', 'Next forecast') }, { id: 'field', label: t('stem.cellular.lens_field', 'Colony scan') }, { id: 'change', label: t('stem.cellular.lens_change', 'Change map') }, { id: 'age', label: t('stem.cellular.lens_age', 'Age map') }, { id: 'xray', label: t('stem.cellular.lens_xray', 'Neighbour X-ray') }];
      var lensHelp = vizMode === 'forecast' ? t('stem.cellular.lens_forecast_help', 'Look up to eight generations ahead without changing the experiment. Green cells appear by the chosen step, cyan cells stay, rose cells are gone. The gold glow is strongest where cells keep coming back; the dashed trail follows the centre of the colony.') : vizMode === 'field' ? t('stem.cellular.lens_field_help', 'Measure the colony footprint and centre. The gold trail tracks movement across generations.') : vizMode === 'change' ? t('stem.cellular.lens_change_help', 'See exactly what the last step changed. Rewind to compare earlier steps.') : vizMode === 'age' ? t('stem.cellular.lens_age_help', 'Yellow cells are newborn; violet cells have survived many generations.') : vizMode === 'xray' ? t('stem.cellular.lens_xray_help', 'Numbers are live-neighbour counts (on grids of 60 × 60 or smaller). Green numbers satisfy the current B/S rule.') : t('stem.cellular.lens_normal_help', 'Cell brightness shows how crowded each cell is.');
      var panel = function (key, kids, extra) { return h.apply(null, ['section', Object.assign({ key: key, style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '11px' } }, extra || {})].concat(kids)); };
      var heading = function (text, color) { return h('h3', { style: { margin: '0 0 8px', fontSize: '11px', fontWeight: 900, color: color || C.accent, textTransform: 'uppercase', letterSpacing: '0.06em' } }, text); };
      var disclosure = function (key, title, kids) {
        return h('details', { key: key, 'data-life-more': key, style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '0 11px' } },
          h('summary', { style: { padding: '12px 2px', lineHeight: '20px', fontSize: '12px', fontWeight: 900, color: C.text } }, title),
          h.apply(null, ['div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '11px' } }].concat(kids)));
      };
      // Challenge strip: the challenge happens on the grid (draw, Run, verdict).
      var challengeNow = challenge ? challenges.filter(function (ch) { return ch.id === challenge; })[0] : null;
      var chStage = !challenge ? 0 : (challengeStatus === 'success' || challengeStatus === 'fail') ? 3 : (challengeInitialRef.current || pop > 0) ? 2 : 1;
      var challengeStrip = challenge ? h('section', { id: 'cell-challenge-strip', 'data-challenge-strip': challenge, tabIndex: -1, 'aria-labelledby': 'cell-chs-title', style: { background: dark ? '#261d0c' : '#fffbeb', border: '1px solid #f59e0b', borderRadius: '13px', padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: '7px' } },
        h('h3', { id: 'cell-chs-title', style: { margin: 0, fontSize: '13px', fontWeight: 900, color: dark ? '#fcd34d' : '#92400e' } }, fmt(t('stem.cellular.chs_title', 'Challenge: {name}'), { name: challengeName(challenge) })),
        challengeNow && h('p', { style: { margin: 0, fontSize: '12px', color: C.text } }, challengeNow.note),
        h('ol', { 'aria-label': t('stem.cellular.chs_steps_aria', 'Challenge steps'), style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: '6px', flexWrap: 'wrap' } }, [t('stem.cellular.chs_step1', 'Draw your start on the grid'), t('stem.cellular.chs_step2', 'Press Run or Step'), t('stem.cellular.chs_step3', 'Read the verdict')].map(function (label, i) {
          var cur = chStage === i + 1, past = chStage > i + 1;
          return h('li', { key: i, 'aria-current': cur ? 'step' : undefined, style: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, border: '1px solid ' + (cur ? '#d97706' : C.border), background: cur ? (dark ? '#78350f' : '#fef3c7') : C.panel, color: C.text } },
            h('span', { 'aria-hidden': 'true' }, past ? '✓' : String(i + 1)), label, past && h('span', { style: SR_ONLY }, t('stem.cellular.chs_done_sr', '(done)')));
        })),
        h('div', { role: 'status', style: { padding: '8px 10px', borderRadius: '9px', background: contrast ? '#000000' : challengeStatus === 'success' ? '#d1fae5' : challengeStatus === 'fail' ? '#fee2e2' : (dark ? '#422006' : '#fff7ed'), color: contrast ? '#ffff00' : challengeStatus === 'success' ? '#065f46' : challengeStatus === 'fail' ? '#991b1b' : (dark ? '#fde68a' : '#92400e'), border: contrast ? '2px solid #ffff00' : undefined, fontSize: '12px', fontWeight: 800 } }, fmt(challengeStatus === 'success' ? t('stem.cellular.ch_status_success', 'Success: {msg}') : challengeStatus === 'fail' ? t('stem.cellular.ch_status_fail', 'Try again: {msg}') : t('stem.cellular.ch_status_active', 'Challenge: {msg}'), { msg: challengeMsg })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(t('stem.cellular.chs_restart', 'Start over'), function () { beginChallenge(challenge); }, { key: 'chRestart' }),
          btn(t('stem.cellular.chs_other', 'Choose another challenge'), function () { setPathFocus('cell-challenges'); }, { key: 'chOther' }),
          btn(t('stem.cellular.chs_close', 'Close the challenge'), closeChallenge, { key: 'chClose' }))) : null;
      // Transport bar beside the grid: run controls and the live counts (shown once).
      var transport = h('div', { 'data-cell-area': 'transport', 'data-cell-transport': 'true', role: 'group', 'aria-label': t('stem.cellular.transport_aria', 'Run controls'), style: { display: 'flex', flexDirection: 'column', gap: '8px', background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '10px', minWidth: 0 } },
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
          btn(running ? t('stem.cellular.btn_pause', 'Pause') : t('stem.cellular.btn_run', 'Run'), toggleRun, { key: 'run', primary: true, big: true }),
          btn(vizMode === 'forecast' ? t('stem.cellular.btn_apply_forecast', 'Apply forecast') : t('stem.cellular.btn_step', 'Step'), stepOnce, { key: 'step', big: true, title: vizMode === 'forecast' ? t('stem.cellular.btn_apply_forecast_title', 'Advance exactly one generation; later forecast steps stay uncommitted.') : t('stem.cellular.btn_step_title', 'Advance one generation') }),
          btn(t('stem.cellular.btn_rewind', 'Rewind'), rewindOne, { key: 'rewind', big: true, disabled: historyRef.current.length === 0, title: historyRef.current.length ? t('stem.cellular.btn_rewind_title', 'Rewind one generation') : t('stem.cellular.btn_rewind_none', 'Step or run to create rewind history') }),
          btn(t('stem.cellular.btn_clear', 'Clear'), clearGrid, { key: 'clear', big: true })),
        reducedMotion && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.reduced_note', 'Reduced motion is on: Run shows one generation per second, and the jump buttons skip ahead with no animation.')));
      var transportStats = h('div', { 'data-cell-area': 'stats', style: { display: 'flex', flexDirection: 'column', gap: '6px', background: C.panel, border: '1px solid ' + C.border, borderRadius: '13px', padding: '10px 10px 0', minWidth: 0 } },
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } }, statChip(t('stem.cellular.stat_generation', 'Generation'), gen, '#10b981'), statChip(t('stem.cellular.stat_population', 'Population'), pop, '#22d3ee'), statChip(t('stem.cellular.stat_peak', 'Peak'), maxPop, '#f59e0b'),
          h('span', { role: 'status', style: { padding: '6px 10px', borderRadius: '999px', background: running ? '#064e3b' : C.bg, color: running ? '#a7f3d0' : C.sub, border: '1px solid ' + (running ? '#10b981' : C.border), fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, running ? (reducedMotion ? t('stem.cellular.status_running_slow', 'Running slowly (reduced motion)') : t('stem.cellular.status_running', 'Running')) : t('stem.cellular.status_paused', 'Paused'))),
        h('details', { 'data-life-more': 'transport' },
          h('summary', { style: { padding: '12px 2px', lineHeight: '20px', fontSize: '12px', fontWeight: 800, color: C.text } }, t('stem.cellular.more_controls', 'More: jump ahead, fullscreen, picture')),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', paddingBottom: '4px' } },
          btn(t('stem.cellular.btn_jump10', 'Jump +10'), function () { jumpAhead(10); }, { key: 'j10', disabled: !!challengeActive, ariaLabel: t('stem.cellular.btn_jump10_aria', 'Jump ahead 10 generations instantly'), title: challengeActive ? t('stem.cellular.jump_challenge_off', 'Challenges are checked every generation, so use Step or Run.') : undefined }),
          btn(t('stem.cellular.btn_jump100', 'Jump +100'), function () { jumpAhead(100); }, { key: 'j100', disabled: !!challengeActive, ariaLabel: t('stem.cellular.btn_jump100_aria', 'Jump ahead 100 generations instantly'), title: challengeActive ? t('stem.cellular.jump_challenge_off', 'Challenges are checked every generation, so use Step or Run.') : undefined }),
          btn(t('stem.cellular.btn_fullscreen', 'Fullscreen'), toggleFullscreenLife, { key: 'fs' }),
          btn(t('stem.cellular.btn_export_png', 'Export PNG'), exportLifePng, { key: 'png' }))));
      // Live rule card: plain words from the parsed B/S rule, plus Step and explain.
      var ruleWords = lifeRuleWords(birthRule, survivalRule);
      var ruleCard = h('section', { 'data-life-rule-card': 'B' + birthRule + '/S' + survivalRule, 'aria-labelledby': 'cell-rulecard-title', style: { background: dark ? '#17132b' : '#faf5ff', border: '1px solid #a78bfa', borderRadius: '13px', padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: '7px' } },
        h('h3', { id: 'cell-rulecard-title', style: { margin: 0, fontSize: '12px', fontWeight: 900, color: dark ? '#c4b5fd' : '#6d28d9' } }, fmt(t('stem.cellular.rc_title', 'The rule in plain words: B{b}/S{s}'), { b: birthRule, s: survivalRule })),
        h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', lineHeight: 1.5, color: C.text } }, h('li', null, ruleWords.birth), h('li', null, ruleWords.survive)),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          !explainShown && btn(t('stem.cellular.btn_step_explain', 'Step and explain'), openExplain, { key: 'stepExplain', id: 'cell-step-explain', big: true, disabled: running, title: running ? t('stem.cellular.step_explain_paused', 'Pause first, then explain the next step.') : t('stem.cellular.step_explain_title', 'Shows what the next step will do to every square, and why, before it happens.') }),
          explainShown && btn(t('stem.cellular.btn_do_step', 'Do this step'), doExplainedStep, { key: 'doStep', id: 'cell-do-step', primary: true, big: true }),
          explainShown && btn(t('stem.cellular.btn_stop_explain', 'Stop explaining'), closeExplain, { key: 'stopExplain', big: true })),
        explainShown && h('p', { id: 'cell-explain-summary', 'data-life-explain': String(gen), style: { margin: 0, fontSize: '12px', lineHeight: 1.5, color: C.text, fontWeight: 600 } }, explainWordsFor(lifeExplain, gen)),
        explainShown && h('p', { style: { margin: 0, fontSize: '11px', lineHeight: 1.45, color: C.sub } }, t('stem.cellular.ex_legend', 'On the grid: solid cyan squares stay alive, rose outlined squares die and dashed green squares come alive. The numbers count live neighbours.')));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        challengeStrip,
        h('div', { id: 'cell-life-row', 'data-cell-life-row': 'true' },
        h('div', { 'data-cell-area': 'stage', ref: stageRef, id: 'cellularlab-stage', style: { minWidth: 0, position: 'relative', display: 'flex', flexDirection: phoneWidth ? 'column' : undefined, gap: phoneWidth ? '8px' : undefined, alignItems: phoneWidth ? (gridZoomed ? 'flex-start' : 'stretch') : 'center', justifyContent: gridZoomed ? 'flex-start' : 'center', padding: '14px', borderRadius: '18px', overflow: 'auto', background: 'radial-gradient(circle at 50% 42%, rgba(16,185,129,0.16), rgba(2,6,23,0.98) 68%)', border: '1px solid rgba(52,211,153,0.28)' } }, renderLifeGrid(), gridZoomed && h('p', { 'data-life-zoom-note': 'true', style: { order: -1, position: 'sticky', left: 0, margin: 0, maxWidth: '100%', fontSize: '12px', lineHeight: 1.4, fontWeight: 700, color: '#e2e8f0' } }, t('stem.cellular.zoom_note', 'Zoomed in so you can read the numbers. Swipe to move around; tap a square to change it.')), h('div', { 'aria-hidden': 'true', 'data-life-badge': gen === 0 ? 'draw' : dynamics.kind, style: { pointerEvents: 'none', position: phoneWidth ? 'sticky' : 'absolute', zIndex: 2, order: phoneWidth ? -2 : undefined, alignSelf: phoneWidth ? 'flex-start' : undefined, left: phoneWidth ? 0 : undefined, top: phoneWidth ? undefined : '22px', right: phoneWidth ? undefined : '22px', maxWidth: phoneWidth ? '100%' : '190px', padding: '7px 10px', borderRadius: '11px', textAlign: phoneWidth ? 'left' : 'right', background: 'rgba(2,6,23,0.82)', border: '1px solid ' + dynamicsColor, color: '#f8fafc', boxShadow: '0 8px 28px rgba(2,6,23,0.38), 0 0 16px ' + dynamicsColor + '33' } }, h('div', { style: { color: dynamicsColor, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, gen === 0 ? '✎ ' + t('stem.cellular.badge_draw_label', 'Your turn') : dynamicsIcon + ' ' + dynText.label), h('div', { style: { marginTop: '2px', color: '#cbd5e1', fontSize: '9px', fontWeight: 700, lineHeight: 1.3 } }, gen === 0 ? t('stem.cellular.badge_draw_run', 'Click squares to draw, then press Run.') : dynText.detail))),
          transport,
          transportStats,
          h('div', { 'data-cell-area': 'cards', style: { display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 } }, ruleCard, challengeActive ? null : renderPredictCard())),
        !k5 && gen > 0 && h('div', { 'data-life-last-step': 'true', style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 11px', borderRadius: '12px', background: dark ? 'linear-gradient(90deg, rgba(20,83,45,0.5), rgba(8,47,73,0.5), rgba(76,5,25,0.45))' : 'linear-gradient(90deg, #f0fdf4, #ecfeff, #fff1f2)', border: '1px solid ' + C.border, fontSize: '11px', fontWeight: 900 } },
          h('span', { style: { color: C.sub, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: '9px' } }, t('stem.cellular.last_transition', 'Last step')),
          h('span', { style: { color: dark ? '#86efac' : '#15803d' } }, fmt(t('stem.cellular.tr_births', '+{n} births'), { n: transitionRef.current.born })),
          h('span', { style: { color: dark ? '#67e8f9' : '#0e7490' } }, fmt(t('stem.cellular.tr_survivors', '{n} survivors'), { n: transitionRef.current.survived })),
          h('span', { style: { color: dark ? '#fda4af' : '#be123c' } }, fmt(t('stem.cellular.tr_deaths', '-{n} deaths'), { n: transitionRef.current.died })),
          h('span', { style: { color: transitionRef.current.born > transitionRef.current.died ? (dark ? '#86efac' : '#15803d') : transitionRef.current.born < transitionRef.current.died ? (dark ? '#fda4af' : '#be123c') : C.sub } }, fmt(t('stem.cellular.chart_net', 'Net {n}'), { n: (transitionRef.current.born > transitionRef.current.died ? '+' : '') + (transitionRef.current.born - transitionRef.current.died) })),
          h('span', { style: { marginLeft: 'auto', color: C.sub, fontSize: '9px' } }, fmt(t('stem.cellular.rewind_frames', '{n} of 100 rewind frames'), { n: historyRef.current.length }))),
        !k5 && transitionHistoryRef.current.length >= 2 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', alignItems: 'stretch' } }, populationChart(), lifePhaseChart()),
        k5 && transitionHistoryRef.current.length >= 2 && populationChart(),
        renderPngShot(),
        h('section', { id: 'cell-challenges', tabIndex: -1, style: { background: dark ? '#261d0c' : '#fffbeb', border: '1px solid #f59e0b', borderRadius: '13px', padding: '11px' } },
          heading(t('stem.cellular.challenges_title', 'Pattern challenges: 10 XP each, the first time'), dark ? '#fcd34d' : '#b45309'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '7px' } }, challenges.map(function (ch) {
            var active = challenge === ch.id;
            return h('button', { key: ch.id, type: 'button', onClick: function () { beginChallenge(ch.id); }, 'aria-pressed': active, style: { textAlign: 'left', padding: '8px', minHeight: '44px', borderRadius: '9px', cursor: 'pointer', border: '1px solid ' + (active ? '#d97706' : C.border), background: active ? (dark ? '#78350f' : '#fef3c7') : C.panel, color: C.text } },
              h('span', { style: { display: 'block', fontSize: '11px', fontWeight: 900 } }, challengeName(ch.id) + (done[ch.id] ? ' ✓' : '')),
              h('span', { style: { display: 'block', marginTop: '2px', fontSize: '10px', color: active ? C.text : C.sub, lineHeight: 1.35 } }, ch.note),
              done[ch.id] && h('span', { style: SR_ONLY }, t('stem.cellular.ch_done_sr', 'Completed.')));
          }))),
        disclosure('shapes', t('stem.cellular.more_shapes', 'Start shapes: patterns and random soup'), [
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { fontSize: '11px', color: C.sub, fontWeight: 900 } }, t('stem.cellular.quick_patterns', 'Quick patterns:')), PATTERN_ORDER.slice(0, 8).map(function (k) { return btn(patName(k), function () { loadPattern(k); }, { key: 'qp' + k, pressed: stampKey === k }); })),
        panel('soup', [
          heading(t('stem.cellular.soup_title', 'Random soup')),
          h('div', { key: 'soupRow', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } },
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: C.text, fontWeight: 800, minWidth: '180px', flex: '1 1 180px' } }, fmt(t('stem.cellular.soup_density', 'Starting density: {pct}% alive'), { pct: soupDensity }),
              h('input', { type: 'range', min: 5, max: 80, step: 5, value: soupDensity, 'aria-valuetext': fmt(t('stem.cellular.soup_density_value', '{pct} percent alive'), { pct: soupDensity }), onChange: function (e) { setSoupDensity(Math.max(5, Math.min(80, parseInt(e.target.value, 10) || 30))); }, style: { width: '100%', minHeight: '24px' } })),
            h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: C.text, fontWeight: 800 } }, t('stem.cellular.soup_seed', 'Seed'),
              h('input', { type: 'text', inputMode: 'numeric', value: soupSeedDraft, onChange: function (e) { var v = String(e.target.value).replace(/[^0-9]/g, '').slice(0, 6); setSoupSeedDraft(v); if (v) setSoupSeed(normSeed(v)); }, style: { width: '90px', padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontFamily: 'monospace' } })),
            btn(t('stem.cellular.btn_make_soup', 'Make soup'), function () { randomize(); }, { key: 'make', title: t('stem.cellular.btn_make_soup_title', 'Same seed, same soup') }),
            btn(t('stem.cellular.btn_reroll', 'Re-roll'), rerollSoup, { key: 'reroll', title: t('stem.cellular.btn_reroll_title', 'Pick a new seed and make a new soup') })),
          h('p', { key: 'soupNote', style: { margin: '6px 0 0', fontSize: '10px', color: C.sub } }, t('stem.cellular.soup_note', 'The same seed, density and grid size always make the same soup, so a classmate can repeat your experiment.'))
        ])
        ]),
        disclosure('world', t('stem.cellular.more_world', 'World settings: brush, edges, speed and grid size'), [
          panel('world', [
            heading(t('stem.cellular.world_title', 'World controls')),
            h('div', { key: 'brush', style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '9px' } }, btn(t('stem.cellular.btn_draw', 'Draw'), function () { setBrush(1); }, { key: 'draw', pressed: brush === 1 }), btn(t('stem.cellular.btn_erase', 'Erase'), function () { setBrush(0); }, { key: 'erase', pressed: brush === 0 }), btn(t('stem.cellular.btn_wrap', 'Wrapping edges'), function () { setWrap(function (w) { return !w; }); }, { key: 'wrap', pressed: wrap, title: wrap ? t('stem.cellular.wrap_on_title', 'On: cells leaving one side come back on the other.') : t('stem.cellular.wrap_off_title', 'Off: the edges are fixed, and outside counts as empty.') })),
            h('label', { key: 'speed', style: { display: 'block', fontSize: '11px', color: C.sub, fontWeight: 800 } }, fmt(t('stem.cellular.speed_label', 'Speed: {n} generations per second'), { n: Math.round(1000 / speed) }), h('input', { type: 'range', min: 1, max: 25, value: Math.round(1000 / speed), onChange: function (e) { setSpeed(Math.round(1000 / parseInt(e.target.value, 10))); }, style: { width: '100%', marginTop: '5px', minHeight: '24px' } })),
            h('div', { key: 'sizeLbl', id: 'cell-size-label', style: { marginTop: '9px', fontSize: '11px', color: C.sub, fontWeight: 800 } }, t('stem.cellular.grid_size', 'Grid size')),
            h('div', { key: 'sizes', role: 'group', 'aria-labelledby': 'cell-size-label', style: { display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' } }, [40, 60, 80, 120].map(function (n) { return btn(fmt(t('stem.cellular.size_n', '{n} × {n}'), { n: n }), function () { resizeLife(n); }, { key: 'sz' + n, pressed: lifeSize === n }); }))
          ])
        ]),
        disclosure('see', k5 ? t('stem.cellular.more_hear', 'Hear and describe') : t('stem.cellular.more_see', 'Lenses, sound and description'), [
          !k5 && panel('lens', [
            heading(t('stem.cellular.lens_title', 'Scientific lens'), dark ? '#c4b5fd' : '#6d28d9'),
            h('div', { key: 'lensBtns', style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, lensBtns.map(function (v) { return btn(v.label, function () { setVizMode(v.id); }, { key: 'lens' + v.id, pressed: vizMode === v.id }); })),
            h('p', { key: 'lensHelp', style: { margin: '7px 0', fontSize: '10px', color: C.sub, lineHeight: 1.4 } }, lensHelp),
            vizMode === 'forecast' && h('label', { key: 'horizon', style: { display: 'block', marginBottom: '7px', fontSize: '10px', color: C.text, fontWeight: 900 } },
              h('span', { 'data-life-forecast-horizon-label': String(forecastHorizon) }, fmt(forecastHorizon === 1 ? t('stem.cellular.horizon_one', 'Look ahead: 1 generation') : t('stem.cellular.horizon_many', 'Look ahead: {n} generations'), { n: forecastHorizon })),
              h('input', { type: 'range', min: 1, max: 8, step: 1, value: forecastHorizon, onChange: function (e) { setForecastHorizon(Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1))); }, 'data-life-forecast-horizon': String(forecastHorizon), style: { width: '100%', marginTop: '5px', accentColor: '#eab308', minHeight: '24px' } })),
            vizMode === 'forecast' && forecastPreview && forecastComparison && h('div', { key: 'fcStats', role: 'status', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } },
              h('span', { style: { color: dark ? '#86efac' : '#15803d' } }, fmt(t('stem.cellular.fc_appear', '+{n} appear'), { n: forecastComparison.appeared })),
              h('span', { style: { color: dark ? '#67e8f9' : '#0e7490' } }, fmt(t('stem.cellular.fc_remain', '{n} stay'), { n: forecastComparison.retained })),
              h('span', { style: { color: dark ? '#fda4af' : '#be123c' } }, fmt(t('stem.cellular.fc_gone', '-{n} gone'), { n: forecastComparison.gone })),
              h('span', null, fmt(t('stem.cellular.fc_pop', 'Forecast population {n}'), { n: forecastComparison.population })),
              h('span', null, fmt(t('stem.cellular.fc_turnover', 'Turnover at +{h}: {n}'), { h: forecastHorizon, n: forecastPreview.turnover })),
              h('span', { 'data-life-forecast-residency-summary': String(forecastResidency.activeCells) }, fmt(t('stem.cellular.fc_residency', '{a} path cells, {p} present throughout'), { a: forecastResidency.activeCells, p: forecastResidency.persistentCells })),
              h('span', { 'data-life-forecast-motion-summary': forecastMotion.distance == null ? 'extinct' : forecastMotion.distance.toFixed(2) }, forecastMotion.distance == null ? fmt(t('stem.cellular.fc_no_centre', 'No colony left at +{h}'), { h: forecastHorizon }) : fmt(t('stem.cellular.fc_drift', 'Centre drifts {d} cells (rows {r}, columns {c})'), { d: forecastMotion.distance.toFixed(2), r: (forecastMotion.deltaRow >= 0 ? '+' : '') + forecastMotion.deltaRow.toFixed(2), c: (forecastMotion.deltaCol >= 0 ? '+' : '') + forecastMotion.deltaCol.toFixed(2) })),
              forecastMotion.selectedBounds && h('span', { 'data-life-forecast-footprint-summary': String(forecastHorizon) }, fmt(t('stem.cellular.fc_footprint', 'Future footprint {w} × {h}, {pct}% filled'), { w: forecastMotion.selectedBounds.width, h: forecastMotion.selectedBounds.height, pct: Math.round(forecastMotion.selectedBounds.density * 100) }))),
            vizMode === 'field' && h('div', { key: 'fieldStats', role: 'status', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginBottom: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, spatialScan ? [h('span', { key: 'footprint' }, fmt(t('stem.cellular.field_footprint', 'Footprint {w} × {h}'), { w: spatialScan.width, h: spatialScan.height })), h('span', { key: 'density' }, fmt(t('stem.cellular.field_density', '{pct}% filled'), { pct: Math.round(spatialScan.density * 100) })), h('span', { key: 'center' }, fmt(t('stem.cellular.field_centre', 'Centre row {r}, column {c}'), { r: (spatialScan.centerR + 1).toFixed(1), c: (spatialScan.centerC + 1).toFixed(1) })), h('span', { key: 'trail' }, fmt(t('stem.cellular.field_trail', '{n} trail points'), { n: Math.min(60, transitionHistoryRef.current.length) }))] : h('span', null, t('stem.cellular.field_empty', 'No live cells to scan.'))),
            vizMode === 'xray' && lifeExplain && h('p', { key: 'xraySum', 'data-life-xray-summary': 'true', style: { margin: '0 0 6px', fontSize: '11px', color: C.text, fontWeight: 700 } }, fmt(t('stem.cellular.xray_summary', 'X-ray summary for the next step. Born: {born}. Stay alive: {stay}. Die: {died}.'), { born: lifeExplain.born, stay: lifeExplain.stay, died: lifeExplain.died })),
            vizMode === 'change' && h('div', { key: 'changeLegend', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' } }, [{ label: t('stem.cellular.legend_born', 'Born'), color: '#4ade80' }, { label: t('stem.cellular.legend_survived', 'Survived'), color: '#22d3ee' }, { label: t('stem.cellular.legend_died', 'Died'), color: '#fb7185' }].map(function (item) { return h('span', { key: item.label, style: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: C.text, fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '3px', background: item.color, boxShadow: '0 0 8px ' + item.color } }), item.label); })),
            vizMode === 'normal' && h('div', { key: 'swatches', role: 'group', 'aria-label': t('stem.cellular.palette_group', 'Cell colour'), style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, [{ h: 150, c: '#10b981', name: t('stem.cellular.colour_green', 'Green') }, { h: 190, c: '#06b6d4', name: t('stem.cellular.colour_cyan', 'Cyan') }, { h: 45, c: '#f59e0b', name: t('stem.cellular.colour_amber', 'Amber') }, { h: 320, c: '#ec4899', name: t('stem.cellular.colour_pink', 'Pink') }, { h: -1, c: '#e2e8f0', name: t('stem.cellular.colour_grey', 'Grey') }].map(function (sw) { return h('button', { key: sw.h, type: 'button', onClick: function () { setLifeHue(sw.h); }, 'aria-label': fmt(t('stem.cellular.colour_use', 'Use {name} cells'), { name: sw.name }), 'aria-pressed': lifeHue === sw.h, style: { width: '30px', height: '28px', borderRadius: '7px', border: '2px solid ' + (lifeHue === sw.h ? C.cursor : C.border), background: sw.c, cursor: 'pointer' } }); }))
          ]),
          panel('access', [
            heading(t('stem.cellular.access_title', 'Hear and describe')),
            h('p', { key: 'desc', 'data-life-description': 'true', style: { margin: '0 0 8px', fontSize: '11px', color: C.text, lineHeight: 1.45 } }, describeLifeLong(dynamics, spatialScan)),
            h('div', { key: 'accBtns', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              btn(t('stem.cellular.btn_read_desc', 'Read description'), function () { announce(describeLifeLong(dynamics, spatialScan)); }, { key: 'read' }),
              btn(t('stem.cellular.btn_narrate', 'Narrate while running'), function () { setNarrate(function (v) { return !v; }); }, { key: 'narr', pressed: narrate, title: t('stem.cellular.btn_narrate_title', 'Speaks a short update every 10 generations while running.') }),
              btn(t('stem.cellular.btn_sound', 'Population sound'), function () { setSoundOn(function (v) { return !v; }); }, { key: 'snd', pressed: soundOn, title: t('stem.cellular.btn_sound_title', 'A short note each generation while running: higher means more live cells.') }),
              btn(t('stem.cellular.btn_play_history', 'Play population history'), playPopHistory, { key: 'hist' }))
          ])
        ]),
        !k5 && disclosure('rules', t('stem.cellular.more_rules', 'Rule editor and trial log'), [
        !k5 && h('section', { style: { background: dark ? '#17132b' : '#faf5ff', border: '1px solid #a78bfa', borderRadius: '13px', padding: '11px' } },
          heading(t('stem.cellular.rule_editor_title', 'Life-like rule editor'), dark ? '#c4b5fd' : '#6d28d9'),
          h('p', { style: { margin: '0 0 8px', fontSize: '11px', color: C.sub } }, t('stem.cellular.rule_editor_help', 'B lists the neighbour counts that create a cell. S lists the counts that let a cell survive.')),
          h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h('label', { style: { fontSize: '11px', fontWeight: 800, color: C.text } }, t('stem.cellular.birth_label', 'Birth (B)'), h('input', { value: birthRule, onChange: function (e) { setBirthRule(sanitizeRule(e.target.value)); }, style: { display: 'block', width: '94px', marginTop: '3px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #8b5cf6', background: C.panel, color: C.text, fontFamily: 'monospace' } })),
            h('label', { style: { fontSize: '11px', fontWeight: 800, color: C.text } }, t('stem.cellular.survive_label', 'Survival (S)'), h('input', { value: survivalRule, onChange: function (e) { setSurvivalRule(sanitizeRule(e.target.value)); }, style: { display: 'block', width: '94px', marginTop: '3px', padding: '6px 8px', borderRadius: '8px', border: '1px solid #8b5cf6', background: C.panel, color: C.text, fontFamily: 'monospace' } })),
            h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'end' } }, rulePresets.map(function (rp) { return btn(rp.name, function () { setBirthRule(rp.b); setSurvivalRule(rp.s); announce(fmt(t('stem.cellular.sr_preset', '{name} rules loaded: B{b}/S{s}.'), { name: rp.name, b: rp.b, s: rp.s })); }, { key: 'preset' + rp.b + rp.s, pressed: birthRule === rp.b && survivalRule === rp.s, title: 'B' + rp.b + '/S' + rp.s }); })))),
        !k5 && panel('trial', [
          heading(t('stem.cellular.trial_title', 'Log a trial')),
          h('p', { key: 'trialHelp', style: { margin: '0 0 8px', fontSize: '11px', color: C.sub, lineHeight: 1.45 } }, fmt(t('stem.cellular.trial_help', 'Runs the current start out of sight until it dies, freezes or repeats (up to {cap} generations), then adds a row to the run log in Investigate.'), { cap: trialCap(ROWS) })),
          h('div', { key: 'trialBtns', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            btn(t('stem.cellular.btn_log_trial', 'Log this start'), function () { runTrial(false); }, { key: 'logOne', disabled: pop === 0 }),
            btn(t('stem.cellular.btn_log_both', 'Log with both edge types'), function () { runTrial(true); }, { key: 'logBoth', disabled: pop === 0 }),
            btn(fmt(t('stem.cellular.btn_log_soups', 'Log 5 soups at {pct}%'), { pct: soupDensity }), function () { runSoupBatch(5); }, { key: 'logSoups' })),
          trialMsg && h('p', { key: 'trialMsg', role: 'status', style: { margin: '8px 0 0', fontSize: '11px', color: C.text, fontWeight: 700 } }, trialMsg)
        ])
        ]),
        k5 && panel('notice', [
          heading(t('stem.cellular.notice_title', 'Notice and wonder')),
          h('p', { key: 'noticeHow', style: { margin: '0 0 6px', fontSize: '11px', color: C.sub } }, t('stem.cellular.notice_how', 'Try an experiment, then tick it. Talk about what you noticed and what you wonder.')),
          h('ul', { key: 'noticeList', style: { listStyle: 'none', margin: 0, padding: 0, fontSize: '12px', color: C.text, lineHeight: 1.5 } },
            [['n1', t('stem.cellular.notice_1', 'Draw three cells in a row and press Step. What changed? Press Step again.')],
              ['n2', t('stem.cellular.notice_2', 'Make a 2 × 2 square. Does it ever change? Why might that be?')],
              ['n3', t('stem.cellular.notice_3', 'Load the Glider and press Run. Which way does it travel?')],
              ['n4', t('stem.cellular.notice_4', 'Make a random soup. Count the shapes left after 100 generations.')]].map(function (it) {
              var on = plainObj(saved.notice)[it[0]] === true;
              return h('li', { key: it[0], style: { marginBottom: '4px' } }, h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', minHeight: '28px', cursor: 'pointer' } },
                h('input', { type: 'checkbox', 'data-notice': it[0], checked: on, onChange: function () { toggleNotice(it[0]); }, style: { width: '18px', height: '18px', flex: '0 0 auto', marginTop: '1px' } }), it[1]));
            }))
        ], { id: 'cell-notice', tabIndex: -1 })
      );
    }
    // Elementary CA tab
    function renderSeedEditor() {
      var W = CA_COLS * CA_PX, H = 24, live = customSeed.reduce(function (sum, value) { return sum + value; }, 0), cells = [h('rect', { key: 'seedBg', x: 0, y: 0, width: W, height: H, rx: 6, fill: C.dead })];
      if (caWrap) cells.push(h('path', { key: 'seedTopology', d: 'M3 3C' + (W * 0.22) + ' -2 ' + (W * 0.78) + ' -2 ' + (W - 3) + ' 3', fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 3px rgba(196,181,253,0.85))', pointerEvents: 'none' } }));
      else cells.push(h('path', { key: 'seedTopology', d: 'M1 2V22M' + (W - 1) + ' 2V22', stroke: '#fb7185', strokeWidth: 1.4, vectorEffect: 'non-scaling-stroke', style: { pointerEvents: 'none' } }));
      customSeed.forEach(function (value, i) { cells.push(h('rect', { key: i, x: i * CA_PX + 0.6, y: 3, width: CA_PX - 1.2, height: H - 6, rx: 1.2, fill: value ? '#22d3ee' : (dark ? '#111827' : '#e2e8f0'), stroke: (caWrap && (i === 0 || i === CA_COLS - 1)) ? '#c4b5fd' : value ? '#67e8f9' : 'rgba(148,163,184,0.18)', strokeWidth: (caWrap && (i === 0 || i === CA_COLS - 1)) ? 1.2 : 0.7, style: { filter: value ? 'drop-shadow(0 0 3px rgba(34,211,238,0.8))' : 'none', pointerEvents: 'none' } })); });
      cells.push(h('rect', { key: 'seedCursor', x: seedCursor * CA_PX + 0.25, y: 1.5, width: CA_PX - 0.5, height: H - 3, rx: 1.5, fill: 'none', stroke: '#fde047', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke', style: { filter: 'drop-shadow(0 0 4px rgba(253,224,71,0.9))', pointerEvents: 'none' } }));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '560px' } },
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, h('span', { style: { color: C.sub, fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.07em' } }, fmt(caWrap ? t('stem.cellular.seed_title_wrap', 'Custom seed: {n} alive, wrapping ring') : t('stem.cellular.seed_title_fixed', 'Custom seed: {n} alive, fixed edges'), { n: live })), h('span', { style: { color: C.sub, fontSize: '10px' } }, t('stem.cellular.seed_help', 'Click cells, or use the arrow keys and Space.')), h('span', { style: { flex: 1 } }), btn(t('stem.cellular.btn_clear_seed', 'Clear seed'), clearCustomSeed, { key: 'clearSeed', title: t('stem.cellular.btn_clear_seed_title', 'Clear all custom seed cells') })),
        // One-row grid: the picture is aria-hidden and the ONE rendered gridcell
        // (the cursor cell, inside a real role=row) is the active descendant.
        h('div', { role: 'grid', tabIndex: 0, 'data-seed-grid': 'true', 'aria-rowcount': 1, 'aria-colcount': CA_COLS, 'aria-activedescendant': 'ca-seed-active-cell', 'aria-label': fmt(t('stem.cellular.seed_aria', 'Custom first row with {n} live cells. Left and right arrows move the cursor, Space toggles a cell and Delete clears it.'), { n: live }), onKeyDown: onSeedKeyDown, style: { width: '100%', maxWidth: '560px', borderRadius: '7px' } },
          h('svg', { ref: seedSvgRef, viewBox: '0 0 ' + W + ' ' + H, width: '100%', 'aria-hidden': 'true', focusable: 'false', onClick: onSeedPointer, style: { width: '100%', maxWidth: '560px', height: 'auto', display: 'block', cursor: 'crosshair', borderRadius: '7px', border: '1px solid ' + C.border, background: C.dead } }, cells),
          h('div', { role: 'row', 'aria-rowindex': 1, style: SR_ONLY },
            h('div', { role: 'gridcell', id: 'ca-seed-active-cell', 'aria-colindex': seedCursor + 1, 'aria-selected': 'true' }, fmt(customSeed[seedCursor] ? t('stem.cellular.seed_cell_alive', 'Seed cell {n}, alive') : t('stem.cellular.seed_cell_empty', 'Seed cell {n}, empty'), { n: seedCursor + 1 }))))
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
          'aria-label': fmt(t('stem.cellular.rt_entry', 'Neighbourhood {pattern} gives {out}. Seen {n} times, {pct} percent of steps. Press to flip.'), { pattern: '' + l + m + rt, out: out, n: usage, pct: (share * 100).toFixed(1) }) + (activeCause ? ' ' + fmt(t('stem.cellular.rt_entry_cause', 'This entry made the selected cell; {k} of its 3 parents are decisive.'), { k: caInfluence.decisiveCount }) : ''),
          onClick: (function (idx) { return function () { toggleRuleBit(idx); }; })(i),
          onKeyDown: (function (idx) { return function (e) { if (e.key === ' ' || e.key === 'Enter') { if (e.preventDefault) e.preventDefault(); toggleRuleBit(idx); } }; })(i),
          style: { cursor: 'pointer' }
        }, col));
      }
      [{ id: 'left', label: t('stem.cellular.rt_left', 'LEFT') }, { id: 'center', label: t('stem.cellular.rt_centre', 'CENTRE') }, { id: 'right', label: t('stem.cellular.rt_right', 'RIGHT') }].forEach(function (ch, position) {
        var label = ch.id, profile = caSensitivity.positions[position], baseX = 5 + position * 169, trackWidth = 158;
        cells.push(h('text', { key: 'channelLabel' + position, x: baseX, y: 75, fill: C.sub, fontSize: 8, fontWeight: 900, style: { pointerEvents: 'none' } }, ch.label));
        cells.push(h('text', { key: 'channelRate' + position, x: baseX + trackWidth, y: 75, textAnchor: 'end', fill: C.text, fontSize: 8, fontWeight: 900, style: { pointerEvents: 'none' } }, Math.round(profile.rate * 100) + '%'));
        cells.push(h('rect', { key: 'channelTrack' + position, x: baseX, y: 80, width: trackWidth, height: 6, rx: 3, fill: C.border, opacity: 0.52, style: { pointerEvents: 'none' } }));
        cells.push(h('rect', { key: 'channelBar' + position, 'data-ca-sensitivity-channel': label.toLowerCase(), 'data-rate': profile.rate.toFixed(6), 'data-decisive-observations': String(profile.decisiveObservations), x: baseX, y: 80, width: trackWidth * profile.rate, height: 6, rx: 3, fill: '#4ade80', opacity: 0.9, style: { filter: profile.rate ? 'drop-shadow(0 0 4px rgba(74,222,128,0.65))' : 'none', pointerEvents: 'none' } }));
      });
      return h('div', { style: { maxWidth: '520px' } },
        h('svg', { viewBox: '0 0 512 92', width: '100%', role: 'group', 'aria-label': fmt(t('stem.cellular.rt_aria', 'Rule table for Rule {rule}: 8 entries, each mapping a 3-cell neighbourhood to the next cell. {n} neighbourhoods observed. Flip sensitivity: left {l} percent, centre {c} percent, right {r} percent. Press an entry to flip its output.'), { rule: rule, n: usageTotal, l: Math.round(caSensitivity.positions[0].rate * 100), c: Math.round(caSensitivity.positions[1].rate * 100), r: Math.round(caSensitivity.positions[2].rate * 100) }), style: { display: 'block' } }, cells),
        h('div', { style: { marginTop: '2px', color: C.sub, fontSize: '10px', fontWeight: 800, textAlign: 'center' } }, fmt(t('stem.cellular.rt_caption', 'Neighbourhood evidence: {n} observations. Gold bars show how often each entry is used, a gold frame marks the selected cell, and green bars show how often flipping that parent would change the result.'), { n: usageTotal.toLocaleString() }))
      );
    }

    function renderCaDiagram() {
      var W = CA_COLS * CA_PX, H = CA_ROWS * CA_PX, selectedX = (caInspectCol + 0.5) * CA_PX, selectedY = (caInspectRow + 0.5) * CA_PX;
      var causeParts = [];
      causeParts.push(caCause && caCause.pattern ? fmt(t('stem.cellular.ca_cause', 'Generation {gen}, column {col}: parents {pattern} gave {out}.'), { gen: caInspectRow, col: caInspectCol + 1, pattern: caCause.pattern, out: caCause.output }) : fmt(t('stem.cellular.ca_cause_seed', 'Generation 0, column {col}: a seed cell with no parents.'), { col: caInspectCol + 1 }));
      if (caInfluence.parents.length) causeParts.push(fmt(t('stem.cellular.ca_decisive', '{k} of its 3 parents are decisive: flipping one of them would change this cell.'), { k: caInfluence.decisiveCount }));
      causeParts.push(fmt(t('stem.cellular.ca_cone', 'Its ancestry cone reaches {n} cells over {d} generations.'), { n: caCone.upstreamCount, d: caCone.depth }));
      if (caInspectRow > 0) causeParts.push(fmt(t('stem.cellular.ca_row_change', '{n} of {cols} cells changed from the generation before.'), { n: caTemporalChange.count, cols: CA_COLS }));
      causeParts.push(fmt(t('stem.cellular.ca_transition', 'This cell: {label}.'), { label: caTransitionWords(caSelectedTransition) }));
      var causeText = causeParts.join(' ');
      var rects = [h('desc', { key: 'desc', id: 'ca-diagram-desc' }, causeText + ' ' + t('stem.cellular.ca_keys', 'Arrow keys move between cells, Page Up and Page Down jump ten generations, and Home and End go to the first and last generation.')), caRowsEl];
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
        'aria-label': fmt(caWrap ? t('stem.cellular.ca_diagram_aria_wrap', 'Space-time diagram for Rule {rule} on a wrapping ring: time runs downward. Click a cell or use the arrow keys.') : t('stem.cellular.ca_diagram_aria_fixed', 'Space-time diagram for Rule {rule} with fixed edges: time runs downward. Click a cell or use the arrow keys.'), { rule: rule }),
        'aria-describedby': 'ca-diagram-desc', 'aria-rowcount': CA_ROWS, 'aria-colcount': CA_COLS, 'aria-activedescendant': 'ca-diagram-cell-' + caInspectRow + '-' + caInspectCol,
        onClick: inspectCaFromEvent, onKeyDown: onCaDiagramKeyDown,
        style: { maxWidth: '560px', width: '100%', height: 'auto', borderRadius: '10px', border: '1px solid ' + C.border, display: 'block', background: C.dead, boxShadow: '0 18px 42px rgba(2,6,23,0.22)', cursor: 'crosshair' } }, rects);
    }
    function renderCaAnalysis() {
      var W = 520, H = 92, px = 10, top = 7, bottom = 17, n = caAnalysis.densities.length;
      var x = function (i) { return px + i / Math.max(1, n - 1) * (W - px * 2); }, y = function (v) { return top + (1 - v) * (H - top - bottom); };
      var points = function (values) { return values.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' '); };
      var selectedDensity = caAnalysis.densities[caInspectRow] || 0, selectedEntropy = caAnalysis.entropies[caInspectRow] || 0, selectedActivity = caAnalysis.activities[caInspectRow] || 0, selectedTemporalChange = caAnalysis.temporalChanges[caInspectRow] || 0, selectedLive = Math.round(selectedDensity * CA_COLS);
      var legend = [{ key:'density', label:fmt(t('stem.cellular.sig_density', 'Density {v}%'), { v: Math.round(selectedDensity * 100) }), color:'#22d3ee' }, { key:'entropy', label:fmt(t('stem.cellular.sig_entropy', 'Entropy {v} bits'), { v: selectedEntropy.toFixed(2) }), color:'#a78bfa' }, { key:'activity', label:fmt(t('stem.cellular.sig_edges', 'Edge rate {v}%'), { v: Math.round(selectedActivity * 100) }), color:'#fbbf24' }, { key:'temporal', label:fmt(t('stem.cellular.sig_change', 'Row change {v}% ({n} cells)'), { v: Math.round(selectedTemporalChange * 100), n: caTemporalChange.count }), color:'#fb7185' }];
      var causeSummary = caCause && caCause.pattern ? fmt(t('stem.cellular.sig_cause', 'Cell {col}: {pattern} gives {out} (entry {idx}); {k} of 3 parents decisive; {cells} of {cols} cells in this row have a decisive parent; {d}-generation cone of {up} cells; {tr}.'), { col: caInspectCol + 1, pattern: caCause.pattern, out: caCause.output, idx: caCause.index, k: caInfluence.decisiveCount, cells: caSensitivityRow.decisiveCells, cols: CA_COLS, d: caCone.depth, up: caCone.upstreamCount, tr: caTransitionWords(caSelectedTransition) }) : fmt(t('stem.cellular.sig_cause_seed', 'Cell {col}: seed value {v}, no parents.'), { col: caInspectCol + 1, v: caCause ? caCause.output : 0 });
      function inspectSignalFromEvent(e) {
        var bounds = e.currentTarget && e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : null;
        if (!bounds || !bounds.width) return;
        var localX = Math.max(px, Math.min(W - px, (e.clientX - bounds.left) / bounds.width * W));
        setCaInspectRow(Math.max(0, Math.min(n - 1, Math.round((localX - px) / (W - px * 2) * (n - 1)))));
      }
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '5px', maxWidth: '560px' } },
        h('div', { role: 'status', 'aria-live': 'polite', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { color: C.sub, fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' } }, fmt(t('stem.cellular.sig_header', 'Generation {gen}: {n} live. Click the chart to inspect a time.'), { gen: caInspectRow, n: selectedLive })), h('span', { 'data-ca-cause-detail': 'true', style: { color: dark ? '#fde68a' : '#92400e', fontSize: '10px', fontWeight: 900 } }, causeSummary), legend.map(function (item) { return h('span', { key: item.key, style: { display: 'inline-flex', alignItems: 'center', gap: '4px', color: C.text, fontSize: '10px', fontWeight: 800 } }, h('span', { 'aria-hidden': 'true', style: { width: item.key === 'entropy' ? '7px' : '10px', height: item.key === 'activity' ? '7px' : '3px', transform: item.key === 'activity' ? 'rotate(45deg)' : 'none', borderRadius: item.key === 'density' ? '999px' : '1px', background: item.color } }), item.label); })),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': fmt(t('stem.cellular.sig_aria', 'Signal profile of Rule {rule} over {n} generations. At generation {gen}: density {d} percent, entropy {e} bits per cell, edge rate {a} percent, row change {c} percent. Averages: entropy {me} bits, row change {mc} percent.'), { rule: rule, n: n, gen: caInspectRow, d: Math.round(selectedDensity * 100), e: selectedEntropy.toFixed(2), a: Math.round(selectedActivity * 100), c: Math.round(selectedTemporalChange * 100), me: caAnalysis.meanEntropy.toFixed(2), mc: Math.round(caAnalysis.meanTemporalChange * 100) }), onClick: inspectSignalFromEvent, 'data-ca-signal-profile': 'true', style: { width: '100%', height: H + 'px', display: 'block', cursor: 'crosshair' } },
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
          h('text', { x: px, y: H - 3, fill: C.sub, style: { fontSize: '8px', fontWeight: 700 } }, fmt(t('stem.cellular.sig_axis_gen', 'gen {n}'), { n: 0 })),
          h('text', { x: W - px, y: H - 3, textAnchor: 'end', fill: C.sub, style: { fontSize: '8px', fontWeight: 700 } }, fmt(t('stem.cellular.sig_axis_gen', 'gen {n}'), { n: n - 1 }))
        )
      );
    }

    function famousBlurb(n) {
      switch (n) {
        case 30: return t('stem.cellular.rule30_blurb', 'Chaotic: it has been used as a random-number generator, and it looks random even from a single live cell.');
        case 90: return t('stem.cellular.rule90_blurb', 'The XOR rule: one live cell draws the Sierpiński triangle, but a random start looks chaotic.');
        case 110: return t('stem.cellular.rule110_blurb', 'Proven Turing-complete: in principle it can compute anything a computer can.');
        case 184: return t('stem.cellular.rule184_blurb', 'A traffic model: cars (1s) move right whenever the cell ahead is empty.');
        case 250: return t('stem.cellular.rule250_blurb', 'A simple repeating pattern.');
        case 18: return t('stem.cellular.rule18_blurb', 'A nested Sierpiński-like fractal on a sparse background.');
        case 60: return t('stem.cellular.rule60_blurb', "An additive rule (Pascal's triangle mod 2): a one-sided Sierpiński fractal from one cell, chaotic from a random start.");
        case 122: return t('stem.cellular.rule122_blurb', 'Complex, irregular growth.');
        default: return '';
      }
    }
    function renderRulesTab() {
      var fr = null; for (var i = 0; i < FAMOUS_RULES.length; i++) if (FAMOUS_RULES[i].n === rule) fr = FAMOUS_RULES[i];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } },
          t('stem.cellular.rules_intro', 'A one-dimensional world: every cell looks at itself and its two neighbours, and the rule decides whether it is alive next step. There are exactly 256 such rules. Select any cell in the diagram to trace its three parents and the rule entry that made it.')),
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
          h('label', { htmlFor: 'cell-rule-number', style: { fontSize: '13px', fontWeight: 800, color: C.text } }, t('stem.cellular.rule_label', 'Rule (0 to 255)')),
          h('input', { id: 'cell-rule-number', type: 'text', inputMode: 'numeric', value: ruleDraft, 'aria-invalid': ruleDraftValid ? 'false' : 'true', 'aria-describedby': ruleDraftValid ? undefined : 'cell-rule-error',
            onChange: function (e) { onRuleDraft(e.target.value); },
            onBlur: function () { if (!ruleDraftValid) setRuleDraft(String(rule)); },
            style: { width: '74px', padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + (ruleDraftValid ? C.border : '#dc2626'), background: C.panel, color: C.text, fontSize: '15px', fontWeight: 800 } }),
          btn(t('stem.cellular.seed_single', 'Single cell start'), function () { setCaSeed('single'); }, { pressed: caSeed === 'single', key: 'singleSeed' }),
          btn(t('stem.cellular.seed_random', 'Random start'), function () { setCaSeed('random'); }, { pressed: caSeed === 'random', key: 'randomSeed' }),
          caSeed === 'random' && btn(t('stem.cellular.btn_reroll_row', 'Re-roll row'), function () { var s = freshSeed(); setCaRowSeed(s); announce(fmt(t('stem.cellular.sr_row_rerolled', 'New random start, seed {seed}.'), { seed: s })); }, { key: 'rerollRow' }),
          btn(t('stem.cellular.seed_custom', 'Custom start'), function () { setCaSeed('custom'); }, { pressed: caSeed === 'custom', key: 'customSeed' }),
          btn(t('stem.cellular.btn_wrap', 'Wrapping edges'), function () { setCaWrap(function (value) { return !value; }); }, { pressed: caWrap, key: 'caBoundary', title: caWrap ? t('stem.cellular.ca_wrap_on', 'On: the first and last cells are neighbours (a ring).') : t('stem.cellular.ca_wrap_off', 'Off: cells beyond each edge count as empty.') }),
          h('div', { style: { fontSize: '12px', color: C.sub } }, t('stem.cellular.binary', 'Binary:') + ' ', h('code', { style: { color: C.text, fontWeight: 800 } }, ('00000000' + rule.toString(2)).slice(-8))),
          band !== 'k5' && btn(t('stem.cellular.btn_log_rule', 'Log this rule'), logCaRule, { key: 'logRule', title: t('stem.cellular.btn_log_rule_title', 'Measure the rule from a random start on a ring and add it to the run log') })
        ),
        !ruleDraftValid && h('p', { id: 'cell-rule-error', role: 'alert', style: { margin: 0, fontSize: '12px', fontWeight: 800, color: dark ? '#fca5a5' : '#b91c1c' } }, fmt(t('stem.cellular.rule_error', 'Enter a whole number from 0 to 255. The diagram still shows Rule {rule}.'), { rule: rule })),
        caSeed === 'random' && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, fmt(t('stem.cellular.row_seed_note', 'Random start seed {seed}: about half the cells alive. The same seed gives the same row for every rule, so you can compare rules fairly.'), { seed: caRowSeed })),
        trialMsg && h('p', { role: 'status', style: { margin: 0, fontSize: '11px', color: C.text, fontWeight: 700 } }, trialMsg),
        caSeed === 'custom' && renderSeedEditor(),
        renderRuleTable(),
        renderCaDiagram(),
        renderCaAnalysis(),
        h('div', { style: { fontSize: '11px', color: C.sub, marginTop: '-4px', textAlign: 'center' } },
          fmt(caWrap ? t('stem.cellular.ca_caption_wrap', 'Rule {rule}, {rows} generations, wrapping ring. Row scan marks: violet dot = 1, cyan dash = 2, green diamond = 3 decisive parents.') : t('stem.cellular.ca_caption_fixed', 'Rule {rule}, {rows} generations, fixed edges. Row scan marks: violet dot = 1, cyan dash = 2, green diamond = 3 decisive parents.'), { rule: rule, rows: CA_ROWS })),
        h('div', null,
          h('div', { id: 'cell-famous-label', style: { fontSize: '12px', color: C.sub, fontWeight: 700, marginBottom: '6px' } }, t('stem.cellular.famous_title', 'Try a famous rule:')),
          h('div', { role: 'group', 'aria-labelledby': 'cell-famous-label', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            FAMOUS_RULES.map(function (f) {
              var active = f.n === rule;
              return h('button', { key: f.n, type: 'button', onClick: function () { setRuleSafe(f.n); },
                title: famousBlurb(f.n), 'aria-pressed': active ? 'true' : 'false',
                style: { padding: '6px 10px', minHeight: '32px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                  border: '1px solid ' + (active ? C.accent : C.border), background: active ? C.accentBg : C.panel, color: C.text } },
                band === 'g912' ? fmt(t('stem.cellular.famous_with_class', 'Rule {n} (Class {c})'), { n: f.n, c: f.cls }) : fmt(t('stem.cellular.famous_plain', 'Rule {n}'), { n: f.n }));
            })
          )
        ),
        fr && h('div', { role: 'note', style: { background: C.accentBg, border: '1px solid ' + C.accent, borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: C.text, lineHeight: 1.5 } },
          h('strong', null, fmt(t('stem.cellular.famous_plain', 'Rule {n}'), { n: fr.n }) + ' '), famousBlurb(fr.n),
          fr.n === 184 && h('span', null, ' ', t('stem.cellular.rule184_mission_link', 'Try the Traffic jam mission to measure how many cars get through.')))
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
          h('span', null, t('stem.cellular.pulse_title', 'First 16 generations')),
          h('span', { 'data-pattern-dynamics': key, style: { color: journey.kind === 'evolving' ? C.sub : C.accent } }, journeyWords(journey).short)),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: 30, role: 'img', 'data-pattern-pulse': key, 'data-pattern-status': journey.kind, 'data-pattern-period': journey.period == null ? '' : String(journey.period), 'aria-label': journeyWords(journey).summary, style: { display: 'block', overflow: 'visible' } }, marks));
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
          h('text', { x:frameW/2, y:H-7, textAnchor:'middle', fill:finalFrame?'#fef08a':C.sub, style:{fontSize:'8px',fontWeight:900} }, fmt(t('stem.cellular.ribbon_label', 'G{g} · P{p}'), { g: frame.step, p: frame.population }))));
      });
      var populations=frames.map(function (frame) { return fmt(t('stem.cellular.ribbon_frame', 'generation {g}: {p} cells'), { g: frame.step, p: frame.population }); }).join('; ');
      return h('svg', { viewBox:'0 0 '+W+' '+H, width:'100%', role:'img', 'data-pattern-temporal-ribbon':key, 'data-frame-count':String(frames.length), 'data-union-width':String(bounds.width), 'data-union-height':String(bounds.height), 'aria-label':fmt(t('stem.cellular.ribbon_aria', '{name} snapshots on one shared frame: {list}.'), { name: patName(key), list: populations }), style:{display:'block',width:'100%',height:'auto',maxHeight:'92px',marginBottom:'5px'} }, marks);
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
      marks.push(h('text', { key:'xl', x:left+plotW/2, y:H-5, fill:C.sub, textAnchor:'middle', style:{fontSize:'9px',fontWeight:800} }, t('stem.cellular.atlas_x', 'Peak population in 16 generations')));
      marks.push(h('text', { key:'yl', x:10, y:top+plotH/2, fill:C.sub, textAnchor:'middle', transform:'rotate(-90 10 '+(top+plotH/2)+')', style:{fontSize:'9px',fontWeight:800} }, t('stem.cellular.atlas_y', 'Total turnover')));
      var activeX=x(activeEntry.journey.maxPopulation), activeY=y(activeEntry.totalTurnover), activeColor=colors[activeEntry.journey.kind] || C.accent;
      marks.push(h('line', { key:'activeVertical', 'data-pattern-atlas-crosshair':'vertical', x1:activeX, y1:activeY, x2:activeX, y2:top+plotH, stroke:activeColor, strokeWidth:1, strokeDasharray:'3 3', opacity:0.72, vectorEffect:'non-scaling-stroke', style:{transition:'all 220ms ease'} }));
      marks.push(h('line', { key:'activeHorizontal', 'data-pattern-atlas-crosshair':'horizontal', x1:left, y1:activeY, x2:activeX, y2:activeY, stroke:activeColor, strokeWidth:1, strokeDasharray:'3 3', opacity:0.72, vectorEffect:'non-scaling-stroke', style:{transition:'all 220ms ease'} }));
      entries.forEach(function (entry, index) {
        var cx=x(entry.journey.maxPopulation), cy=y(entry.totalTurnover), color=colors[entry.journey.kind] || C.accent, selected=entry.key===activeEntry.key;
        var title=fmt(t('stem.cellular.atlas_point', '{name}: peak population {peak}, total turnover {turn}, {kind}.'), { name: patName(entry.key), peak: entry.journey.maxPopulation, turn: entry.totalTurnover, kind: journeyWords(entry.journey).short });
        marks.push(h('circle', { key:'halo'+entry.key, cx:cx, cy:cy, r:selected?13:8, fill:color, opacity:selected?0.2:0.09, style:{filter:'drop-shadow(0 0 '+(selected?9:5)+'px '+color+')',transition:'all 220ms ease'} }));
        marks.push(h('circle', { key:'point'+entry.key, 'data-pattern-atlas-point':entry.key, 'data-peak-population':String(entry.journey.maxPopulation), 'data-total-turnover':String(entry.totalTurnover), 'data-dynamics':entry.journey.kind, 'data-selected':selected?'true':'false', cx:cx, cy:cy, r:selected?6.2:4.1, fill:color, stroke:'#f8fafc', strokeWidth:selected?1.4:0.75, style:{transition:'all 220ms ease'} }, h('title', null, title)));
        marks.push(h('text', { key:'label'+entry.key, x:cx+(index%2?6:-6), y:cy-6-(index%3)*4, fill:selected?color:C.text, textAnchor:index%2?'start':'end', style:{fontSize:selected?'9px':'7.5px',fontWeight:900,pointerEvents:'none',filter:'drop-shadow(0 1px 2px '+C.bg+')',transition:'all 220ms ease'} }, atlasAbbr(entry.key)));
      });
      var legendKinds = ['still','oscillator','spaceship','evolving'];
      return h('div', { style:{margin:'2px 0 14px'} },
        h('div', { style:{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap',marginBottom:'4px'} },
          h('span', { style:{fontSize:'10px',color:C.text,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.06em'} }, t('stem.cellular.atlas_title', 'Behaviour atlas (shared scale)')),
          legendKinds.map(function (kind) { return h('span', { key:kind, style:{display:'inline-flex',alignItems:'center',gap:'4px',fontSize:'9px',color:C.sub,fontWeight:800} }, h('span', { 'aria-hidden':'true', style:{width:'7px',height:'7px',borderRadius:'50%',background:colors[kind],boxShadow:'0 0 5px '+colors[kind]} }), kindName(kind)); })),
        h('div', { role:'status', 'aria-live':'polite', 'data-pattern-atlas-selection':activeEntry.key, style:{fontSize:'10px',color:C.text,fontWeight:800,marginBottom:'2px'} },
          fmt(t('stem.cellular.atlas_point', '{name}: peak population {peak}, total turnover {turn}, {kind}.'), { name: patName(activeEntry.key), peak: activeEntry.journey.maxPopulation, turn: activeEntry.totalTurnover, kind: journeyWords(activeEntry.journey).short })),
        patternTemporalRibbon(activeEntry.key, activeEntry.journey),
        h('svg', { viewBox:'0 0 '+W+' '+H, width:'100%', role:'img', 'data-pattern-behavior-atlas':'true', 'data-pattern-atlas-count':String(entries.length), 'data-pattern-atlas-active':activeEntry.key, 'aria-label':fmt(t('stem.cellular.atlas_aria', 'Behaviour atlas of {n} patterns. Across: peak population over 16 generations. Up: total births plus deaths. Still lifes sit on the bottom line; oscillators, spaceships and evolving seeds rise with activity. Selected: {name}.'), { n: entries.length, name: patName(activeEntry.key) }), style:{display:'block',width:'100%',height:'auto',maxHeight:'220px',overflow:'visible'} }, marks));
    }
    function renderPatternsTab() {
      var entries = PATTERN_ORDER.map(function (key) { return { key:key, pattern:LIFE_PATTERNS[key], journey:cachedPatternJourney(key, 16) }; });
      // Measure a pattern on the CURRENT grid size and edges, so the numbers a
      // student sees for this lab come from a run, not from a book.
      function measureHere(key) {
        var pat = LIFE_PATTERNS[key], g = stampPattern(emptyGrid(lifeSize, lifeSize), key, Math.max(0, Math.floor((lifeSize - pat.h) / 2)), Math.max(0, Math.floor((lifeSize - pat.w) / 2)));
        var res = lifeRun(g, { wrap: wrap, maxGen: trialCap(lifeSize) });
        var row = { kind: 'life', source: 'pattern', pattern: key, density: '', seed: '', size: lifeSize, wrap: wrap, rule: 'B3/S23', startPop: res.startPop, lifetime: res.lifetime, end: res.end, period: res.period, endPop: res.endPop, peakPop: res.peakPop, cap: trialCap(lifeSize) };
        addRunRows([row]);
        var msg = fmt(wrap ? t('stem.cellular.measure_msg_wrap', '{name} on {n} × {n} with wrapping edges {outcome}') : t('stem.cellular.measure_msg_fixed', '{name} on {n} × {n} with fixed edges {outcome}'), { name: patName(key), n: lifeSize, outcome: trialOutcome(row) });
        setPatternMeasure({ key: key, text: msg }); announce(msg);
      }
      return h('div', null,
        h('p', { style: { margin: '0 0 12px', fontSize: '12px', color: C.sub, lineHeight: 1.5 } },
          t('stem.cellular.patterns_intro', 'Classic Life forms shown as a double exposure of now and four generations later. The atlas compares how big and how busy each pattern becomes. Load a card into Life, or measure it on your current grid.')),
        patternBehaviorAtlas(entries, patternFocusKey),
        h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 10px', color: C.sub, fontSize: '10px', fontWeight: 800 } }, [{ label: t('stem.cellular.thumb_now', 'Now'), color: '#22d3ee' }, { label: t('stem.cellular.thumb_plus4', '+4 generations'), color: '#fde047' }, { label: t('stem.cellular.thumb_overlap', 'Both'), color: '#f8fafc' }].map(function (item) { return h('span', { key: item.label, style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } }, h('span', { 'aria-hidden': 'true', style: { width: '9px', height: '9px', borderRadius: '2px', background: item.color, boxShadow: '0 0 5px ' + item.color } }), item.label); })),
        patternMeasure && h('p', { role: 'status', style: { margin: '0 0 10px', fontSize: '12px', color: C.text, fontWeight: 700 } }, patternMeasure.text),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '10px' } },
          entries.map(function (entry) {
            var key = entry.key, pat = entry.pattern, journey = entry.journey, jw = journeyWords(journey);
            var active = patternFocusKey === key;
            return h('div', { key: key, 'data-pattern-key': key, 'data-pattern-atlas-active': active ? 'true' : 'false', onMouseEnter: function () { setPatternFocusKey(key); },
              style: { display: 'flex', flexDirection: 'column', gap: '6px', background: C.panel, border: '1px solid ' + (active ? C.accent : C.border), borderRadius: '12px', padding: '10px', boxShadow: active ? '0 0 0 1px ' + C.accent + ', 0 10px 28px rgba(16,185,129,0.16)' : 'none' } },
              h('button', { type: 'button', 'aria-label': fmt(t('stem.cellular.card_aria', 'Load {name} ({kind}). {blurb}'), { name: patName(key), kind: kindName(pat.kind), blurb: patBlurb(key) }), onFocus: function () { setPatternFocusKey(key); }, onClick: function () { loadPattern(key); },
                style: { display: 'flex', gap: '10px', alignItems: 'center', textAlign: 'left', cursor: 'pointer', flexWrap: 'wrap', background: 'transparent', border: 'none', padding: 0, color: C.text } },
                cachedEl('thumb|' + key + '|' + C.dead, function () { return patternThumb(key, analyzePatternEvolution(pat, 4)); }),
                h('span', { style: { minWidth: 0, flex: '1 1 64px', display: 'block' } },
                  h('span', { style: { display: 'block', fontSize: '13px', fontWeight: 800, color: C.text } }, patName(key)),
                  h('span', { style: { display: 'block', fontSize: '10px', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.4px' } }, kindName(pat.kind)))),
              h('p', { style: { margin: 0, fontSize: '11px', color: C.sub, lineHeight: 1.4 } }, patBlurb(key)),
              cachedEl(['pulse', key, C.sub, C.accent, jw.short, jw.summary, t('stem.cellular.pulse_title', 'First 16 generations')].join('|'), function () { return patternPulse(key, journey); }),
              h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } },
                pat.fits && btn(pat.fits.size ? fmt(t('stem.cellular.btn_fit_size', 'Load on {n} × {n}, fixed edges'), { n: pat.fits.size }) : t('stem.cellular.btn_fit_edges', 'Load with fixed edges'), function () { loadPattern(key, { fit: true }); }, { key: 'fit' + key }),
                (pat.kind === 'methuselah' || pat.kind === 'gun') && band !== 'k5' && btn(t('stem.cellular.btn_measure_here', 'Measure on my grid'), function () { measureHere(key); }, { key: 'measure' + key, ariaLabel: fmt(t('stem.cellular.btn_measure_aria', 'Measure {name} on the current grid and log it'), { name: patName(key) }) })));
          })
        )
      );
    }

    // ── learn ──
    function learnCard(key, title, body) {
      return h('section', { key: key, style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px 14px' } },
        h('h3', { style: { margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: C.text } }, title),
        h('div', { style: { fontSize: '12.5px', color: C.sub, lineHeight: 1.6 } }, body));
    }
    function classWords(n) {
      switch (n) {
        case 1: return { name: t('stem.cellular.class1_name', 'Class 1: uniform'), desc: t('stem.cellular.class1_desc', 'Everything dies or freezes into one colour. Boring but predictable.') };
        case 2: return { name: t('stem.cellular.class2_name', 'Class 2: periodic'), desc: t('stem.cellular.class2_desc', 'Settles into stable or repeating structures: stripes, simple repeats and oscillators.') };
        case 3: return { name: t('stem.cellular.class3_name', 'Class 3: chaotic'), desc: t('stem.cellular.class3_desc', 'Looks random and never settles. Small changes spread everywhere (like Rule 30).') };
        default: return { name: t('stem.cellular.class4_name', 'Class 4: complex'), desc: t('stem.cellular.class4_desc', 'The “edge of chaos”: particles that move and collide on a steady background. These rules can compute (Rule 110, Conway’s Life).') };
      }
    }
    // Opens another STEM tool only when the host can actually load it.
    function toolReachable(id) {
      try { return typeof ctx.setStemLabTool === 'function' && !!window.StemLab && !!((window.StemLab.isRegistered && window.StemLab.isRegistered(id)) || typeof window.__alloEnsureStemPluginLoaded === 'function'); } catch (e) { return false; }
    }
    function openTool(id, name) {
      var ok = false;
      try { ok = !!(window.StemLab.isRegistered && window.StemLab.isRegistered(id)); } catch (e) { ok = false; }
      if (!ok) { try { ok = typeof window.__alloEnsureStemPluginLoaded === 'function' && window.__alloEnsureStemPluginLoaded(id) !== false; } catch (e2) { ok = false; } }
      if (!ok || typeof ctx.setStemLabTool !== 'function') { announce(fmt(t('stem.cellular.tool_unavailable', '{name} is not available in this build.'), { name: name })); return; }
      ctx.setStemLabTool(id);
    }
    function crossLink(id, name, why) {
      if (!toolReachable(id)) return null;
      return h('button', { key: 'link' + id, type: 'button', onClick: function () { openTool(id, name); }, 'aria-label': fmt(t('stem.cellular.open_tool', 'Open {name}: {why}'), { name: name, why: why }), style: { textAlign: 'left', padding: '8px 10px', minHeight: '44px', borderRadius: '10px', border: '1px solid ' + C.border, background: C.bg, color: C.text, cursor: 'pointer', fontSize: '12px' } },
        h('strong', { style: { display: 'block' } }, name), h('span', { style: { color: C.sub, fontSize: '11px' } }, why));
    }
    function renderLearnTab() {
      var links = [crossLink('epidemicSim', t('stem.cellular.link_epidemic', 'Epidemic Simulator'), t('stem.cellular.link_epidemic_why', 'Compare the grid outbreak with a whole-population SIR model.')), crossLink('fireEcology', t('stem.cellular.link_fire', 'Fire Ecology'), t('stem.cellular.link_fire_why', 'See why real forests need some fire.')), crossLink('codingPlayground', t('stem.cellular.link_coding', 'Coding Playground'), t('stem.cellular.link_coding_why', 'Write the Life rule as a program.')), crossLink('logicLab', t('stem.cellular.link_logic', 'Logic Lab'), t('stem.cellular.link_logic_why', 'Rule tables are truth tables: build them with logic gates.'))].filter(Boolean);
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        learnCard('what', t('stem.cellular.learn_what_title', 'What is a cellular automaton?'),
          t('stem.cellular.learn_what', 'A grid of cells that each follow one tiny rule, all updating together step by step. No cell is in charge, yet simple local rules build gliders, oscillators and patterns that look designed. That surprise is called emergence.')),
        learnCard('rule', t('stem.cellular.learn_rule_title', "Conway's Game of Life (the rule)"),
          h('ul', { style: { margin: 0, paddingLeft: '18px' } },
            h('li', null, t('stem.cellular.learn_rule_1', 'Each cell is alive or empty and looks at its 8 neighbours.')),
            h('li', null, h('strong', null, t('stem.cellular.learn_rule_2', 'A live cell with 2 or 3 live neighbours survives.'))),
            h('li', null, h('strong', null, t('stem.cellular.learn_rule_3', 'An empty cell with exactly 3 live neighbours is born.'))),
            h('li', null, t('stem.cellular.learn_rule_4', 'Every other live cell dies, of loneliness (0 or 1 neighbours) or crowding (4 or more). The rule is written B3/S23.')))),
        band !== 'k5' && learnCard('classes', t('stem.cellular.learn_classes_title', "Wolfram's four classes"),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
            [1, 2, 3, 4].map(function (n) { var w = classWords(n); return h('p', { key: n, style: { margin: 0 } }, h('strong', { style: { color: C.text } }, w.name + ' '), w.desc); }))),
        band !== 'k5' && learnCard('lenses', t('stem.cellular.learn_lenses_title', 'Life-like rules and scientific lenses'),
          t('stem.cellular.learn_lenses', 'Conway is one point in a larger rule space. Edit the B/S rule to explore Seeds, HighLife, Day & Night and Diamoeba. Next forecast turns the rule into a testable prediction; Colony scan measures motion; Age map shows which cells survive longest; Neighbour X-ray shows the counts behind every birth and death.')),
        learnCard('edges', t('stem.cellular.learn_edges_title', 'Why the edges matter'),
          t('stem.cellular.learn_edges', 'A real grid is finite. With wrapping edges a glider leaving one side comes back on the other, like a video-game world; with fixed edges the outside counts as empty, so gliders die at the border. Famous numbers such as “the R-pentomino settles after 1,103 generations” are for an endless plane, so check how big your world must be before you compare.')),
        learnCard('neighbours', t('stem.cellular.learn_nb_title', 'Who counts as a neighbour?'),
          t('stem.cellular.learn_nb', 'The same birth and survival numbers can mean very different worlds. With the Moore neighbourhood a cell counts all 8 cells around it; with the von Neumann neighbourhood only the 4 that share a side. Try Brian’s Brain both ways in More worlds and measure what changes.')),
        learnCard('ant', t('stem.cellular.learn_ant_title', 'Order out of a mess'),
          t('stem.cellular.learn_ant', 'Langton’s ant follows two rules and nothing else changes, yet after thousands of messy steps it starts building a straight “highway”. Nobody designed the highway: it emerges. Use it to predict where the ant will be long before it gets there.')),
        learnCard('chaos', t('stem.cellular.learn_chaos_title', 'The edge of chaos'),
          t('stem.cellular.learn_chaos', 'Class 4 rules sit between boring order (Classes 1 and 2) and pure chaos (Class 3). In that narrow band, moving structures can carry information, which is why both Rule 110 and Conway’s Life can compute anything a computer can.')),
        learnCard('real', t('stem.cellular.learn_real_title', 'Where this shows up for real'),
          t('stem.cellular.learn_real', 'Forest fires, traffic jams and the spread of disease are all modelled with grids like this (try the Missions tab). Games use them for textures and caves, engineers for crystal growth and fluid flow. The big idea: complex behaviour does not need a complex cause.')),
        links.length ? learnCard('links', t('stem.cellular.links_title', 'Related tools'), h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' } }, links)) : null
      );
    }

    // ════════════════════ PRACTICE (generated, never runs out) ════════════════════
    var sPracticeMode = useState('nextgen'); var practiceMode = sPracticeMode[0], setPracticeMode = sPracticeMode[1];
    var sNgSeed = useState(1); var ngSeed = sNgSeed[0], setNgSeed = sNgSeed[1];
    var ngProblem = React.useMemo(function () { return makeNextGenProblem(ngSeed, band); }, [ngSeed, band]);
    var sNgAnswer = useState(null); var ngAnswerRaw = sNgAnswer[0], setNgAnswer = sNgAnswer[1];
    var ngAnswer = ngAnswerRaw && ngAnswerRaw.length === ngProblem.size ? ngAnswerRaw : emptyGrid(ngProblem.size, ngProblem.size);
    var sNgCursor = useState([0, 0]); var ngCursor = sNgCursor[0], setNgCursor = sNgCursor[1];
    var sNgState = useState({ tries: 0, hint: 0, feedback: null, revealed: false, solved: false }); var ngState = sNgState[0], setNgState = sNgState[1];
    var ngCellRefs = useRef({});
    var sClsSeed = useState(1); var clsSeed = sClsSeed[0], setClsSeed = sClsSeed[1];
    var clsProblem = React.useMemo(function () { return makeClassProblem(clsSeed); }, [clsSeed]);
    var clsRows = React.useMemo(function () { return buildCaRows(clsProblem.rule, seededRow(81, 0.5, clsProblem.seed), 60, 81, true); }, [clsProblem]);
    var sClsState = useState({ pick: null, tries: 0, feedback: null, revealed: false, solved: false }); var clsState = sClsState[0], setClsState = sClsState[1];
    var practiceStats = saved.practice && typeof saved.practice === 'object' ? saved.practice : {};
    var allowReveal = teacherCfg.noReveal !== true;

    function bumpPractice(fn) {
      patchSaved(function (s) {
        var old = s.practice && typeof s.practice === 'object' ? s.practice : {}, num = function (v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; };
        var obj = function (v) { var o = {}; if (v && typeof v === 'object' && !Array.isArray(v)) Object.keys(v).forEach(function (k) { o[k] = num(v[k]); }); return o; };
        var p = { attempts: num(old.attempts), solved: num(old.solved), firstTry: num(old.firstTry), revealed: num(old.revealed), missed: obj(old.missed), classAttempts: num(old.classAttempts), classSolved: num(old.classSolved), classFirstTry: num(old.classFirstTry), classMissed: obj(old.classMissed) };
        fn(p); return { practice: p };
      });
    }
    function newNgProblem() { setNgSeed(freshSeed()); setNgAnswer(null); setNgCursor([0, 0]); setNgState({ tries: 0, hint: 0, feedback: null, revealed: false, solved: false }); announce(t('stem.cellular.sr_new_problem', 'New board. Predict the next generation.')); }
    function toggleNgCell(r, c) {
      if (ngState.solved || ngState.revealed) return;
      var next = ngAnswer.map(function (row) { return row.slice(); }); next[r][c] = next[r][c] ? 0 : 1; setNgAnswer(next);
      announce(fmt(next[r][c] ? t('stem.cellular.sr_ng_alive', 'Row {row}, column {col}: alive next.') : t('stem.cellular.sr_ng_empty', 'Row {row}, column {col}: empty next.'), { row: r + 1, col: c + 1 }));
    }
    function misconceptionText(tag, n) {
      switch (tag) {
        case 'overcrowd': return fmt(t('stem.cellular.mis_overcrowd', '{n} of your live cells have 4 or more live neighbours. Crowding kills: those cells die.'), { n: n });
        case 'lonely': return fmt(t('stem.cellular.mis_lonely', '{n} of your live cells have fewer than 2 live neighbours. Loneliness kills: those cells die.'), { n: n });
        case 'missed_birth': return fmt(t('stem.cellular.mis_missed_birth_v2', 'You missed {n} births. An empty cell with exactly {b} live neighbours comes alive.'), { n: n, b: ngProblem.birth.split('').join(t('stem.cellular.or_word', ' or ')) });
        case 'false_birth': return fmt(t('stem.cellular.mis_false_birth', '{n} of your new cells are not born. An empty cell needs exactly the birth count (here B{b}), not just “a few” neighbours.'), { n: n, b: ngProblem.birth });
        case 'missed_survival': return fmt(t('stem.cellular.mis_missed_survival', '{n} cells should survive: a live cell with 2 or 3 live neighbours stays alive.'), { n: n });
        default: return '';
      }
    }
    function misconceptionName(tag) {
      switch (tag) {
        case 'overcrowd': return t('stem.cellular.misname_overcrowd', 'Kept an overcrowded cell alive');
        case 'lonely': return t('stem.cellular.misname_lonely', 'Kept a lonely cell alive');
        case 'missed_birth': return t('stem.cellular.misname_missed_birth_v2', 'Missed a birth (an empty cell with the birth count)');
        case 'false_birth': return t('stem.cellular.misname_false_birth_v2', 'Made a birth without the birth count');
        case 'missed_survival': return t('stem.cellular.misname_missed_survival', 'Let a cell with 2 or 3 die');
        default: return String(tag);
      }
    }
    function checkNg() {
      if (ngState.solved || ngState.revealed) return;
      var g = gradeNextGen(ngProblem, ngAnswer), tries = ngState.tries + 1;
      if (g.correct) {
        setNgState(Object.assign({}, ngState, { tries: tries, solved: true, feedback: { ok: true } }));
        bumpPractice(function (p) { p.attempts++; p.solved++; if (tries === 1) p.firstTry++; });
        awardOnce('ng_' + band + '_' + ngProblem.seed, 'cellularLab_practice', 2, t('stem.cellular.xp_practice', 'Predicted the next Life generation'));
        announce(tries === 1 ? t('stem.cellular.sr_ng_right_first', 'Correct on the first try.') : t('stem.cellular.sr_ng_right', 'Correct.'));
        return;
      }
      setNgState(Object.assign({}, ngState, { tries: tries, feedback: { ok: false, grade: g } }));
      bumpPractice(function (p) { p.attempts++; Object.keys(g.tags).forEach(function (k) { if (g.tags[k]) p.missed[k] = (p.missed[k] || 0) + 1; }); });
      announce(fmt(t('stem.cellular.sr_ng_wrong', '{n} cells are not right yet.'), { n: g.wrong }) + ' ' + misconceptionText(g.top, g.tags[g.top]));
    }
    function revealNg() {
      if (!allowReveal || ngState.tries < 2 || ngState.solved) return;
      setNgState(Object.assign({}, ngState, { revealed: true, hint: 3 })); setNgAnswer(ngProblem.next.map(function (row) { return row.slice(); }));
      bumpPractice(function (p) { p.revealed++; });
      announce(t('stem.cellular.sr_ng_revealed', 'The answer is shown with every neighbour count. No XP for this board; try a new one.'));
    }
    function onNgKeyDown(e) {
      var r = ngCursor[0], c = ngCursor[1], n = ngProblem.size, handled = true;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1); else if (e.key === 'ArrowDown') r = Math.min(n - 1, r + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1); else if (e.key === 'ArrowRight') c = Math.min(n - 1, c + 1);
      else if (e.key === 'Home') c = 0; else if (e.key === 'End') c = n - 1;
      else if (e.key === ' ' || e.key === 'Enter') { toggleNgCell(r, c); }
      else handled = false;
      if (!handled) return;
      if (e.preventDefault) e.preventDefault();
      if (r !== ngCursor[0] || c !== ngCursor[1]) { setNgCursor([r, c]); var el = ngCellRefs.current[r + '_' + c]; if (el && el.focus) el.focus(); }
    }
    // Worked support that fades: full counts at first, then live cells only,
    // then none; hints bring them back on request.
    var ngFade = band === 'k5' ? 'full' : (practiceStats.solved || 0) < 1 ? 'full' : (practiceStats.solved || 0) < 3 ? 'partial' : 'none';
    function ngShowCount(r, c) {
      if (ngState.revealed || ngState.hint >= 3 || ngFade === 'full') return true;
      if (ngState.hint >= 2 || ngFade === 'partial') return !!ngProblem.board[r][c];
      return false;
    }
    function boardCellStyle(alive, size) { return { width: size + 'px', height: size + 'px', borderRadius: '6px', border: '1px solid ' + (dark ? '#475569' : '#94a3b8'), background: alive ? (dark ? '#34d399' : '#047857') : (dark ? '#0f172a' : '#ffffff'), color: alive ? (dark ? '#052e16' : '#ffffff') : C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 900 }; }
    function renderNextGen() {
      var n = ngProblem.size, cell = n >= 6 ? 36 : 44, fb = ngState.feedback;
      var nowBoard = h('div', { role: 'img', 'aria-label': fmt(t('stem.cellular.ng_now_aria', 'Current generation, {n} by {n}: {list}.'), { n: n, list: ngProblem.board.map(function (row, r) { return fmt(t('stem.cellular.ng_row_words', 'row {r}: {cells}'), { r: r + 1, cells: row.map(function (v, c) { return ngShowCount(r, c) ? (v ? fmt(t('stem.cellular.ng_alive_count', 'alive ({k})'), { k: ngProblem.counts[r][c] }) : fmt(t('stem.cellular.ng_empty_count', 'empty ({k})'), { k: ngProblem.counts[r][c] })) : (v ? t('stem.cellular.ng_alive', 'alive') : t('stem.cellular.ng_empty', 'empty')); }).join(', ') }); }).join('; ') }), style: { display: 'grid', gridTemplateColumns: 'repeat(' + n + ', ' + cell + 'px)', gap: '3px' } },
        ngProblem.board.map(function (row, r) { return row.map(function (v, c) { return h('div', { key: r + '_' + c, 'aria-hidden': 'true', style: boardCellStyle(!!v, cell) }, ngShowCount(r, c) ? String(ngProblem.counts[r][c]) : ''); }); }));
      var answerBoard = h('div', { role: 'grid', 'aria-label': fmt(t('stem.cellular.ng_answer_aria', 'Your prediction, {n} by {n}. Arrow keys move; Space marks a cell alive or empty.'), { n: n }), 'aria-rowcount': n, 'aria-colcount': n, onKeyDown: onNgKeyDown, style: { display: 'grid', gap: '3px' } },
        ngAnswer.map(function (row, r) {
          return h('div', { key: 'r' + r, role: 'row', 'aria-rowindex': r + 1, style: { display: 'grid', gridTemplateColumns: 'repeat(' + n + ', ' + cell + 'px)', gap: '3px' } }, row.map(function (v, c) {
            var focusHere = ngCursor[0] === r && ngCursor[1] === c;
            return h('div', { key: c, role: 'gridcell', 'aria-colindex': c + 1, 'aria-selected': v ? 'true' : 'false', tabIndex: focusHere ? 0 : -1, ref: function (el) { ngCellRefs.current[r + '_' + c] = el; },
              'aria-label': fmt(v ? t('stem.cellular.ng_cell_alive', 'Row {row}, column {col}: alive next') : t('stem.cellular.ng_cell_empty', 'Row {row}, column {col}: empty next'), { row: r + 1, col: c + 1 }),
              onClick: function () { setNgCursor([r, c]); toggleNgCell(r, c); }, onFocus: function () { if (!focusHere) setNgCursor([r, c]); },
              style: Object.assign(boardCellStyle(!!v, cell), { cursor: 'pointer', outline: focusHere ? '3px solid ' + C.cursor : 'none', outlineOffset: '1px' }) }, v ? '●' : '');
          }));
        }));
      var hintText = fmt(t('stem.cellular.ng_hint1_v2', 'Rule {rule}: an empty cell is born with exactly {b} live neighbours; a live cell survives with {s} live neighbours; every other live cell dies.'), { rule: 'B' + ngProblem.birth + '/S' + ngProblem.survive, b:ngProblem.birth.split('').join(t('stem.cellular.or_word', ' or ')), s: ngProblem.survive.split('').join(t('stem.cellular.or_word', ' or ')) });
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } }, fmt(t('stem.cellular.ng_intro', 'Mark which cells will be alive in the next generation. Rule B{b}/S{s}; cells outside the board count as empty. Numbers show live-neighbour counts while you are learning.'), { b: ngProblem.birth, s: ngProblem.survive })),
        ngFade !== 'full' && !ngState.revealed && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, ngFade === 'partial' ? t('stem.cellular.ng_fade_partial', 'Support fading: counts are shown on live cells only. Hints can show more.') : t('stem.cellular.ng_fade_none', 'On your own now: no counts unless you ask for a hint.')),
        h('div', { style: { display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' } },
          h('div', null, h('h4', { style: { margin: '0 0 6px', fontSize: '12px', color: C.text } }, t('stem.cellular.ng_now', 'Now')), nowBoard),
          h('div', null, h('h4', { style: { margin: '0 0 6px', fontSize: '12px', color: C.text } }, t('stem.cellular.ng_next', 'Your prediction: next generation')), answerBoard)),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(t('stem.cellular.btn_check', 'Check'), checkNg, { key: 'check', primary: true, disabled: ngState.solved || ngState.revealed }),
          btn(t('stem.cellular.btn_copy_now', 'Start from a copy of now'), function () { if (!ngState.solved && !ngState.revealed) { setNgAnswer(ngProblem.board.map(function (row) { return row.slice(); })); announce(t('stem.cellular.sr_copied', 'Your prediction now starts as a copy of the current board.')); } }, { key: 'copy', disabled: ngState.solved || ngState.revealed }),
          ngState.tries >= 2 && !ngState.solved && !ngState.revealed && allowReveal && btn(t('stem.cellular.btn_reveal', 'Show the answer (no XP)'), revealNg, { key: 'reveal' }),
          btn(t('stem.cellular.btn_new_board', 'New board'), newNgProblem, { key: 'new' })),
        !ngState.revealed && hintLadder('ng', ngState.hint, [hintText, t('stem.cellular.ng_hint2_text', 'Neighbour counts are now shown on the live cells of the board.'), t('stem.cellular.ng_hint3_text', 'Every neighbour count is now shown. Go cell by cell: born, survives or dies?')], function (lv) { setNgState(Object.assign({}, ngState, { hint: lv })); }, { disabled: ngState.solved }),
        fb && feedbackBox(fb.ok,
          fb.ok ? (ngState.tries === 1 ? t('stem.cellular.ng_right_first', 'Correct on the first try! Every birth, survival and death is right.') : t('stem.cellular.ng_right', 'Correct! Every birth, survival and death is right.')) :
            h('div', null, h('p', { style: { margin: '0 0 4px' } }, fmt(t('stem.cellular.ng_wrong', '{n} cells are not right yet.'), { n: fb.grade.wrong })),
              h('ul', { style: { margin: 0, paddingLeft: '18px' } }, Object.keys(fb.grade.tags).filter(function (k) { return fb.grade.tags[k]; }).map(function (k) { return h('li', { key: k }, misconceptionText(k, fb.grade.tags[k])); })),
              h('p', { style: { margin: '4px 0 0' } }, ngState.tries >= 2 ? (allowReveal ? t('stem.cellular.ng_second_miss', 'Use the hints, fix your cells and check again, or show the answer.') : t('stem.cellular.ng_second_miss_noreveal', 'Use the hints, fix your cells and check again.')) : t('stem.cellular.ng_first_miss', 'Fix your prediction and check again.')))),
        ngState.revealed && h('p', { style: { margin: 0, fontSize: '12px', color: C.text } }, t('stem.cellular.ng_worked', 'Worked answer: the counts on the left show each cell’s live neighbours. Live cells with 2 or 3 stay; empty cells with exactly the birth count are born; all others are empty next.')),
        h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, fmt(t('stem.cellular.ng_stats', 'Boards solved: {s}. First-try: {f}.'), { s: practiceStats.solved || 0, f: practiceStats.firstTry || 0 }))
      );
    }
    // Wolfram class practice: a seeded random start on a ring of 81 cells.
    function clsFeedbackText(pick, actual) {
      var key = pick + '_' + actual;
      switch (key) {
        case '3_2': return t('stem.cellular.clsmis_3_2', 'Busy is not the same as chaotic. These rows repeat, maybe shifted sideways: look for a row that matches an earlier one.');
        case '2_3': return t('stem.cellular.clsmis_2_3', 'Look for an exact repeat. Triangles of many sizes that never line up mean the rows never repeat: that is chaos.');
        case '1_2': return t('stem.cellular.clsmis_1_2', 'Not everything dies out here: some structures stay still or move steadily, and that is Class 2.');
        case '2_1': return t('stem.cellular.clsmis_2_1', 'Every cell ends up the same colour, so nothing is left to repeat. That is Class 1.');
        case '3_4': return t('stem.cellular.clsmis_3_4', 'Look for particles: lines that travel across a steady, repeating background and collide. Organised structures on a background are Class 4.');
        case '4_3': return t('stem.cellular.clsmis_4_3', 'There is no steady background here; the whole row stays noisy. That is Class 3.');
        case '1_3': case '1_4': return t('stem.cellular.clsmis_1_x', 'The pattern does not die out: it is still busy at the bottom of the diagram.');
        case '3_1': case '4_1': case '2_4': return t('stem.cellular.clsmis_x_1', 'Compare the top of the diagram with the bottom: what is left at the end?');
        default: return t('stem.cellular.clsmis_default', 'Compare the bottom rows with the class descriptions and try again.');
      }
    }
    function checkCls(pick) {
      if (clsState.solved || clsState.revealed) return;
      var tries = clsState.tries + 1, ok = pick === clsProblem.cls;
      setClsState({ pick: pick, tries: tries, hint: clsState.hint || 0, feedback: ok ? { ok: true } : { ok: false, text: clsFeedbackText(pick, clsProblem.cls) }, revealed: false, solved: ok });
      bumpPractice(function (p) { p.classAttempts++; if (ok) { p.classSolved++; if (tries === 1) p.classFirstTry++; } else { var k = pick + 'as' + clsProblem.cls; p.classMissed[k] = (p.classMissed[k] || 0) + 1; } });
      // A four-option choice pays only within two tries, so clicking every class earns nothing.
      if (ok && tries <= 2) awardOnce('cls_' + clsProblem.rule, 'cellularLab_classes', 2, t('stem.cellular.xp_class', 'Identified a Wolfram class'));
      announce(ok ? fmt(t('stem.cellular.sr_cls_right', 'Correct: Class {c}.'), { c: clsProblem.cls }) : clsFeedbackText(pick, clsProblem.cls));
    }
    function renderClassPractice() {
      var W = 81 * 5, H = 60 * 5, paths = [];
      clsRows.forEach(function (row, r) { var d = ''; row.forEach(function (v, c) { if (v) d += 'M' + (c * 5) + ' ' + (r * 5) + 'h5v5h-5z'; }); if (d) paths.push(h('path', { key: r, d: d, fill: dark ? '#34d399' : '#065f46' })); });
      // Non-visual equivalent: density and change, decade by decade.
      var decades = [];
      for (var d0 = 0; d0 < 60; d0 += 10) {
        var dens = 0, chg = 0;
        for (var r = d0; r < d0 + 10; r++) { for (var c = 0; c < 81; c++) { dens += clsRows[r][c]; if (r > 0 && clsRows[r][c] !== clsRows[r - 1][c]) chg++; } }
        decades.push({ from: d0, to: d0 + 9, dens: Math.round(dens / 810 * 100), chg: Math.round(chg / 810 * 100) });
      }
      var fb = clsState.feedback;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } }, t('stem.cellular.cls_intro', 'A mystery rule starts from a random row on a ring of 81 cells. Time runs downward. Which Wolfram class is it?')),
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': t('stem.cellular.cls_svg_aria', 'Space-time diagram of the mystery rule. The table below gives the same information as numbers.'), style: { maxWidth: '420px', display: 'block', background: dark ? '#020617' : '#f8fafc', border: '1px solid ' + C.border, borderRadius: '8px' } }, paths),
        h('table', { style: { borderCollapse: 'collapse', fontSize: '11px', color: C.text, maxWidth: '420px' } },
          h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px', color: C.text } }, t('stem.cellular.cls_table_caption', 'Every 10 generations: cells alive, and cells that changed each step')),
          h('thead', null, h('tr', null, [t('stem.cellular.cls_th_gens', 'Generations'), t('stem.cellular.cls_th_alive', 'Alive'), t('stem.cellular.cls_th_change', 'Changing')].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '2px 8px', borderBottom: '1px solid ' + C.border } }, x); }))),
          h('tbody', null, decades.map(function (dd) { return h('tr', { key: dd.from }, h('td', { style: { padding: '2px 8px' } }, fmt(t('stem.cellular.cls_range', '{a} to {b}'), { a: dd.from, b: dd.to })), h('td', { style: { padding: '2px 8px' } }, dd.dens + '%'), h('td', { style: { padding: '2px 8px' } }, dd.chg + '%')); }))),
        h('div', { role: 'group', 'aria-label': t('stem.cellular.cls_choices', 'Choose a class'), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px' } }, [1, 2, 3, 4].map(function (n) {
          var w = classWords(n), picked = clsState.pick === n;
          return h('button', { key: n, type: 'button', onClick: function () { checkCls(n); }, disabled: clsState.solved || clsState.revealed, 'aria-pressed': picked ? 'true' : 'false', style: { textAlign: 'left', padding: '8px', minHeight: '44px', borderRadius: '9px', cursor: 'pointer', border: '1px solid ' + (picked ? C.accent : C.border), background: picked ? C.accentBg : C.panel, color: C.text, opacity: (clsState.solved || clsState.revealed) && !picked ? 0.7 : 1 } }, h('strong', { style: { display: 'block', fontSize: '12px' } }, w.name), h('span', { style: { fontSize: '11px', color: C.sub } }, w.desc));
        })),
        !clsState.revealed && hintLadder('cls', clsState.hint || 0, [t('stem.cellular.cls_hint1', 'Look at the bottom rows first: has everything died out or turned one colour? That is Class 1.'), t('stem.cellular.cls_hint2', 'If something is left, look for a row that matches an earlier row, maybe shifted sideways. Exact repeats mean Class 2.'), t('stem.cellular.cls_hint3', 'No repeats at all? A row that stays noisy everywhere is Class 3; particles travelling on a steady background are Class 4.')], function (lv) { setClsState(Object.assign({}, clsState, { hint: lv })); }, { disabled: clsState.solved }),
        fb && feedbackBox(fb.ok, fb.ok ? fmt(t('stem.cellular.cls_right', 'Correct: Rule {rule} is Class {c}.'), { rule: clsProblem.rule, c: clsProblem.cls }) : fb.text + ' ' + (clsState.tries >= 2 ? (allowReveal ? t('stem.cellular.cls_second_miss', 'Use the hints and try again, or show the answer.') : t('stem.cellular.cls_second_miss_noreveal', 'Use the hints and try again.')) : t('stem.cellular.cls_try_again', 'Try again.'))),
        clsState.revealed && h('p', { role: 'status', style: { margin: 0, fontSize: '12px', color: C.text } }, fmt(t('stem.cellular.cls_revealed', 'Answer: Rule {rule} is {name}. No XP for this one.'), { rule: clsProblem.rule, name: classWords(clsProblem.cls).name })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          clsState.tries >= 2 && !clsState.solved && !clsState.revealed && allowReveal && btn(t('stem.cellular.btn_reveal', 'Show the answer (no XP)'), function () { setClsState(Object.assign({}, clsState, { revealed: true })); bumpPractice(function (p) { p.revealed++; }); }, { key: 'clsReveal' }),
          (clsState.solved || clsState.revealed) && btn(fmt(t('stem.cellular.btn_open_rule', 'Open Rule {rule} in the Rules tab'), { rule: clsProblem.rule }), function () { setRuleSafe(clsProblem.rule); setCaSeed('random'); setCaRowSeed(clsProblem.seed); setCaWrap(true); setTab('rules'); }, { key: 'clsOpen' }),
          btn(t('stem.cellular.btn_new_rule', 'New mystery rule'), function () { setClsSeed(freshSeed()); setClsState({ pick: null, tries: 0, hint: 0, feedback: null, revealed: false, solved: false }); }, { key: 'clsNew' })),
        h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, fmt(t('stem.cellular.cls_stats', 'Rules classified: {s}. First-try: {f}.'), { s: practiceStats.classSolved || 0, f: practiceStats.classFirstTry || 0 }))
      );
    }
    function renderPracticeTab() {
      var modes = [{ id: 'nextgen', label: t('stem.cellular.pr_nextgen', 'Predict the next generation') }].concat(band === 'g912' ? [{ id: 'classes', label: t('stem.cellular.pr_classes', 'Name the Wolfram class') }] : []);
      var mode = band === 'g912' ? practiceMode : 'nextgen';
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        modes.length > 1 && h('div', { role: 'group', 'aria-label': t('stem.cellular.pr_modes', 'Practice type'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, modes.map(function (m) { return btn(m.label, function () { setPracticeMode(m.id); }, { key: m.id, pressed: mode === m.id }); })),
        mode === 'classes' ? renderClassPractice() : renderNextGen());
    }

    // ════════════════════ INVESTIGATE: predict → check → explain ════════════════════
    var pceSaved = saved.pce && typeof saved.pce === 'object' ? saved.pce : {};
    var sPceDraft = useState({}); var pceDraft = sPceDraft[0], setPceDraft = sPceDraft[1];
    var sPceOpen = useState(null); var pceOpen = sPceOpen[0], setPceOpen = sPceOpen[1];
    function pceText(id) {
      switch (id) {
        case 'bigger': return {
          title: t('stem.cellular.pce_bigger_title', 'Does a bigger start live longer?'),
          q: t('stem.cellular.pce_bigger_q', 'On a big 120 × 120 grid with fixed edges, which start keeps changing for longer: 5 cells in an R-pentomino shape, or a solid 6 × 6 square of 36 cells?'),
          opts: { big: t('stem.cellular.pce_bigger_big', 'The 36-cell square: more cells means more life.'), small: t('stem.cellular.pce_bigger_small', 'The 5-cell R-pentomino.'), same: t('stem.cellular.pce_bigger_same', 'About the same: both settle quickly.') },
          mis: { big: t('stem.cellular.pce_bigger_mis_big', 'Misconception: “a bigger start lives longer.” In Life, crowding kills: a cell with 4 or more live neighbours dies. Most of a solid square is overcrowded, so it collapses almost at once.'), same: t('stem.cellular.pce_bigger_mis_same', 'The square does settle quickly, but the R-pentomino does not: its lopsided shape keeps making new births at its edges for a very long time.') },
          explain: t('stem.cellular.pce_bigger_explain', 'Why can a small start outlast a big one? Use the words neighbours and crowding.'),
          ev: function (e) { return fmt(t('stem.cellular.pce_bigger_ev', 'The R-pentomino ({sc} cells) kept changing until generation {sl}. The square ({bc} cells) settled at generation {bl}.'), { sc: e.smallCells, sl: e.smallLife, bc: e.bigCells, bl: e.bigLife }); },
          tryIt: function () { loadPattern('rpentomino', { fit: true }); }
        };
        case 'glider': return {
          title: t('stem.cellular.pce_glider_title', 'Do the cells of a glider travel?'),
          q: t('stem.cellular.pce_glider_q', 'When a glider moves across the grid, what happens to its cells?'),
          opts: { slide: t('stem.cellular.pce_glider_slide', 'The same five cells slide along together.'), reborn: t('stem.cellular.pce_glider_reborn', 'Cells die at the back and new cells are born at the front.') },
          mis: { slide: t('stem.cellular.pce_glider_mis_slide', 'Misconception: “the cells travel.” A Life cell never moves; it can only live or die where it is. Motion is a pattern of births and deaths.') },
          explain: t('stem.cellular.pce_glider_explain', 'Explain how a shape can move when no cell ever moves.'),
          // ages count generations alive including the first, so the oldest cell was born at 5 - oldest.
          ev: function (e) { return fmt(t('stem.cellular.pce_glider_ev_v2', 'In 4 generations the glider moved {dr} row down and {dc} column across, with {born} births and {died} deaths. The oldest cell at the end was born at generation {since}, so no cell made the whole trip from generation 0.'), { dr: e.dr, dc: e.dc, born: e.born, died: e.died, since: Math.max(0, 5 - e.oldest) }); },
          tryIt: function () { loadPattern('glider'); setVizMode('age'); }
        };
        case 'soup': return {
          title: t('stem.cellular.pce_soup_title', 'Does random stay random?'),
          q: t('stem.cellular.pce_soup_q', 'A 40 × 40 grid starts as a random soup with about 35% of cells alive. What will it look like after 500 generations?'),
          opts: { still_random: t('stem.cellular.pce_soup_random', 'Just as random and busy as at the start.'), sparse: t('stem.cellular.pce_soup_sparse', 'Mostly empty, with a few small still lifes and blinkers.'), full: t('stem.cellular.pce_soup_full', 'Packed full of live cells.') },
          mis: { still_random: t('stem.cellular.pce_soup_mis_random', 'Misconception: “random stays random.” Simple local rules sort a random start: crowded and lonely cells die, and what survives settles into a few stable shapes.'), full: t('stem.cellular.pce_soup_mis_full', 'Life cannot fill up: a cell with 4 or more neighbours dies of crowding, so a full grid would die at once.') },
          explain: t('stem.cellular.pce_soup_explain', 'Why does a random soup thin out and settle down? Mention crowding or loneliness.'),
          ev: function (e) { return fmt(t('stem.cellular.pce_soup_ev', 'Seed {seed}: {sp}% alive at the start and {ep}% alive after 500 generations, in {groups} separate groups.'), { seed: e.seed, sp: Math.round(e.startDensity * 100), ep: (e.endDensity * 100).toFixed(1), groups: e.groups }); },
          tryIt: function (e) { var s = e && e.seed ? e.seed : soupSeed; installStart(soupGrid(40, 40, 0.35, s), { source: 'soup', density: 0.35, seed: s }, 40); setWrap(true); setSoupDensity(35); setSoupSeed(s); setSoupSeedDraft(String(s)); setTab('life'); }
        };
        case 'edges': return {
          title: t('stem.cellular.pce_edges_title', 'Do the edges matter?'),
          q: t('stem.cellular.pce_edges_q', 'The Gosper glider gun is loaded on a 40 × 40 grid twice: once with wrapping edges and once with fixed edges. After 1,200 generations, which gun is still firing?'),
          opts: { both: t('stem.cellular.pce_edges_both', 'Both: the edges do not matter.'), fixed_only: t('stem.cellular.pce_edges_fixed', 'Only the gun with fixed edges.'), wrap_only: t('stem.cellular.pce_edges_wrap', 'Only the gun with wrapping edges.') },
          mis: { both: t('stem.cellular.pce_edges_mis_both', 'Misconception: “the edges don’t matter.” A finite world must do something with gliders that reach its edge. With wrapping edges they come back round and smash into the gun.'), wrap_only: t('stem.cellular.pce_edges_mis_wrap', 'With wrapping edges nothing ever leaves: the gliders fly round the world and crash back into the gun. With fixed edges they die at the border, so the gun is safe.') },
          explain: t('stem.cellular.pce_edges_explain', 'Why do the edges change the result? What would happen on an endless plane?'),
          ev: function (e) { return fmt(t('stem.cellular.pce_edges_ev', 'Wrapping edges: the gun was wrecked and the grid froze at generation {wl} with {wp} cells. Fixed edges: the gun keeps firing, repeating every {fp} generations.'), { wl: e.wrapLife, wp: e.wrapPop, fp: e.fixedPeriod }); },
          tryIt: function () { resizeLife(40); loadPattern('gosperGun'); }
        };
        default: return {
          title: t('stem.cellular.pce_rules_title', 'Does complex behaviour need a complex rule?'),
          q: t('stem.cellular.pce_rules_q', 'Rule 30 is one of the 256 rules, and the whole rule is just 8 yes-or-no answers. Starting from one live cell, what does it draw?'),
          opts: { stripe: t('stem.cellular.pce_rules_stripe', 'A simple stripe or repeating pattern.'), triangle: t('stem.cellular.pce_rules_triangle', 'A neat nested triangle.'), random: t('stem.cellular.pce_rules_random', 'A pattern that looks random.') },
          mis: { stripe: t('stem.cellular.pce_rules_mis_stripe', 'Misconception: “complex behaviour needs complex rules.” Rule 30’s 8 entries are as simple as any rule’s, yet its pattern never repeats.'), triangle: t('stem.cellular.pce_rules_mis_triangle', 'That is Rule 90. Rule 30 starts like a triangle, but its right side turns irregular and never repeats.') },
          explain: t('stem.cellular.pce_rules_explain', 'How can such a short rule produce something that looks random?'),
          ev: function (e) { return fmt(t('stem.cellular.pce_rules_ev', 'Rule 30 has {entries} entries. Its centre column over {total} steps has {ones} ones and {zeros} zeros and never repeats. It begins {bits}.'), { entries: e.entries, total: e.total, ones: e.ones, zeros: e.total - e.ones, bits: e.bits }); },
          tryIt: function () { setRuleSafe(30); setCaSeed('single'); setTab('rules'); }
        };
      }
    }
    function pcePatch(id, patch) { patchSaved(function (s) { var all = Object.assign({}, s.pce || {}); all[id] = Object.assign({}, all[id] || {}, patch); return { pce: all }; }); }
    function lockPrediction(card) {
      var pick = pceDraft[card.id]; if (!pick || (pceSaved[card.id] && pceSaved[card.id].pick)) return;
      pcePatch(card.id, { pick: pick });
      announce(t('stem.cellular.sr_pce_locked', 'Prediction locked in. Now run the check.'));
    }
    function runPceCheck(card) {
      var st = pceSaved[card.id] || {}; if (!st.pick || st.checked) return;
      var ev = pceEvidence(card.id, card.id === 'soup' ? soupSeed : 0), txt = pceText(card.id), correct = st.pick === ev.answer;
      pcePatch(card.id, { checked: true, correct: correct, evidence: ev, answer: ev.answer });
      announce(txt.ev(ev) + ' ' + (correct ? t('stem.cellular.pce_matched', 'Your prediction matched the evidence.') : (txt.mis[st.pick] || t('stem.cellular.pce_not_matched', 'Your prediction did not match the evidence.'))));
    }
    function savePceExplain(card) {
      var st = pceSaved[card.id] || {}, text = String(pceDraft['x_' + card.id] != null ? pceDraft['x_' + card.id] : (st.explain || '')).trim();
      if (!st.checked || text.length < 20) return;
      pcePatch(card.id, { explain: text.slice(0, 1200), done: true });
      awardOnce('pce_' + card.id, 'cellularLab_pce', 3, t('stem.cellular.xp_pce', 'Predicted, checked against a run, and explained'));
      announce(t('stem.cellular.sr_pce_done', 'Explanation saved. Card complete.'));
    }
    function renderPceCard(card) {
      var raw = pceSaved[card.id] && typeof pceSaved[card.id] === 'object' ? pceSaved[card.id] : {}, txt = pceText(card.id);
      var st = Object.assign({}, raw, { pick: card.options.indexOf(raw.pick) !== -1 ? raw.pick : null, explain: typeof raw.explain === 'string' ? raw.explain : '' });
      // Evidence is re-derived from the model on every render (cached), never trusted from saved data.
      if (st.pick && st.checked) { st.evidence = pceEvidence(card.id, card.id === 'soup' ? normSeed((raw.evidence && raw.evidence.seed) || soupSeed) : 0); st.answer = st.evidence.answer; st.correct = st.pick === st.answer; } else st.checked = false;
      var locked = !!st.pick, draftPick = locked ? st.pick : pceDraft[card.id];
      var explainDraft = pceDraft['x_' + card.id] != null ? pceDraft['x_' + card.id] : (st.explain || '');
      var groupName = 'pce-' + card.id;
      return h('section', { key: card.id, 'data-pce-card': card.id, style: { background: C.panel, border: '1px solid ' + (st.done ? C.accent : C.border), borderRadius: '12px', padding: '12px' } },
        h('h3', { style: { margin: '0 0 4px', fontSize: '14px', color: C.text } }, txt.title + (st.done ? ' ✓' : '')),
        h('p', { style: { margin: '0 0 8px', fontSize: '12px', color: C.text, lineHeight: 1.5 } }, txt.q),
        h('fieldset', { style: { border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' } },
          h('legend', { style: SR_ONLY }, t('stem.cellular.pce_predict_legend', 'Your prediction')),
          card.options.map(function (opt) {
            var isAnswer = st.checked && st.answer === opt;
            return h('label', { key: opt, style: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: C.text, padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + (draftPick === opt ? C.accent : C.border), background: isAnswer ? C.accentBg : 'transparent', cursor: locked ? 'default' : 'pointer' } },
              h('input', { type: 'radio', name: groupName, value: opt, checked: draftPick === opt, disabled: locked, onChange: function () { var d = Object.assign({}, pceDraft); d[card.id] = opt; setPceDraft(d); }, style: { marginTop: '2px', width: '18px', height: '18px' } }),
              h('span', null, txt.opts[opt], isAnswer ? h('strong', null, ' ' + t('stem.cellular.pce_evidence_says', '(what the run showed)')) : null));
          })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' } },
          !locked && btn(t('stem.cellular.btn_lock_prediction', 'Lock in my prediction'), function () { lockPrediction(card); }, { key: 'lock', primary: true, disabled: !pceDraft[card.id] }),
          locked && !st.checked && btn(t('stem.cellular.btn_run_check', 'Run the check'), function () { runPceCheck(card); }, { key: 'check', primary: true }),
          st.checked && btn(t('stem.cellular.btn_try_it', 'Try it in the lab'), function () { txt.tryIt(st.evidence); }, { key: 'try' })),
        st.checked && st.evidence && h('div', { role: 'status', style: { marginTop: '8px', padding: '9px 11px', borderRadius: '10px', fontSize: '12px', background: statusTone(st.correct).background, color: statusTone(st.correct).color, border: statusTone(st.correct).border } },
          h('p', { style: { margin: '0 0 4px', fontWeight: 800 } }, st.correct ? t('stem.cellular.pce_matched', 'Your prediction matched the evidence.') : t('stem.cellular.pce_not_matched', 'Your prediction did not match the evidence.')),
          h('p', { style: { margin: '0 0 4px' } }, txt.ev(st.evidence)),
          !st.correct && txt.mis[st.pick] && h('p', { style: { margin: 0 } }, txt.mis[st.pick])),
        st.checked && h('div', { style: { marginTop: '8px' } },
          h('label', { htmlFor: 'pce-explain-' + card.id, style: { display: 'block', fontSize: '12px', fontWeight: 800, color: C.text, marginBottom: '4px' } }, txt.explain),
          h('textarea', { id: 'pce-explain-' + card.id, rows: 3, value: explainDraft, onChange: function (e) { var d = Object.assign({}, pceDraft); d['x_' + card.id] = String(e.target.value).slice(0, 1200); setPceDraft(d); }, style: { width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.bg, color: C.text, fontSize: '12px' } }),
          h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' } },
            btn(st.done ? t('stem.cellular.btn_update_expl', 'Update explanation') : t('stem.cellular.btn_save_expl', 'Save explanation'), function () { savePceExplain(card); }, { key: 'save', disabled: String(explainDraft).trim().length < 20 }),
            String(explainDraft).trim().length < 20 && h('span', { style: { fontSize: '11px', color: C.sub } }, t('stem.cellular.pce_need_words', 'Write at least a full sentence (20 characters).')))));
    }

    // ════════════════════ RUN LOG + CER ════════════════════
    var sCerOpen = useState('density'); var cerOpenRaw = sCerOpen[0], setCerOpen = sCerOpen[1];
    var sCerDraft = useState({}); var cerDraft = sCerDraft[0], setCerDraft = sCerDraft[1];
    var sCerHint = useState(''); var cerHint = sCerHint[0], setCerHint = sCerHint[1];
    var sCsvShown = useState(false); var csvShown = sCsvShown[0], setCsvShown = sCsvShown[1];
    var sClearAsk = useState(false); var clearAsk = sClearAsk[0], setClearAsk = sClearAsk[1];
    var CER_INVS = [
      { id: 'density', kinds: ['soup'], bands: ['g68', 'g912'], idea: /(crowd|lonel|isolat|neighbo|birth|born|die|dies|death|surviv)/i },
      { id: 'edges', kinds: ['life', 'soup'], bands: ['g68', 'g912'], idea: /(wrap|edge|border|boundar|glider|collid|crash|escape|leave|torus)/i },
      { id: 'classes', kinds: ['ca'], bands: ['g912'], idea: /(class|chao|period|repeat|random|complex|simple|uniform|entrop)/i }
    ].filter(function (inv) { return inv.bands.indexOf(band) !== -1; });
    function cerWords(id) {
      if (id === 'density') return { title: t('stem.cellular.cer_density_title', 'Soup density and lifetime'), q: t('stem.cellular.cer_density_q', 'How does the starting density of a random soup affect how long it keeps changing?'), how: t('stem.cellular.cer_density_how', 'In the Life tab, set the density and press “Log 5 soups” for at least three densities (try 10%, 30%, 50% and 70%) on one grid size with the same edges. Then pick rows here.'), rowsNeed: t('stem.cellular.cer_density_rows', 'At least 3 picked rows with 3 different densities'), fairNeed: t('stem.cellular.cer_density_fair', 'Picked rows share grid size, edges and rule (only density changes)') };
      if (id === 'edges') return { title: t('stem.cellular.cer_edges_title', 'Wrapping or fixed edges'), q: t('stem.cellular.cer_edges_q', 'Do the edges of the world change what a pattern does?'), how: t('stem.cellular.cer_edges_how', 'In the Life tab, load a pattern or soup and press “Log with both edge types”. Do it for two or more starts, then pick the pairs here.'), rowsNeed: t('stem.cellular.cer_edges_rows', 'At least 2 picked rows'), fairNeed: t('stem.cellular.cer_edges_fair', 'Two picked rows have the same start and differ only in their edges') };
      return { title: t('stem.cellular.cer_classes_title', 'Simple rules, complex behaviour'), q: t('stem.cellular.cer_classes_q', 'Can a very simple rule produce complex behaviour?'), how: t('stem.cellular.cer_classes_how', 'In the Rules tab, press “Log this rule” for several rules (try 30, 90, 110, 184 and 250). Then pick rows here.'), rowsNeed: t('stem.cellular.cer_classes_rows', 'At least 3 picked rule rows'), fairNeed: t('stem.cellular.cer_classes_fair', 'Picked rules show at least two different behaviours') };
    }
    var cerOpen = CER_INVS.some(function (x) { return x.id === cerOpenRaw; }) ? cerOpenRaw : (CER_INVS[0] ? CER_INVS[0].id : null);
    var cerSavedAll = saved.cer && typeof saved.cer === 'object' ? saved.cer : {};
    function cerState(id) { var s = cerSavedAll[id] && typeof cerSavedAll[id] === 'object' ? cerSavedAll[id] : {}; var d = cerDraft[id] || {}; return { picks: Array.isArray(s.picks) ? s.picks : [], claim: d.claim != null ? d.claim : (s.claim || ''), evidence: d.evidence != null ? d.evidence : (s.evidence || ''), reasoning: d.reasoning != null ? d.reasoning : (s.reasoning || ''), done: !!s.done }; }
    function cerPatch(id, patch) { patchSaved(function (s) { var all = Object.assign({}, s.cer || {}); all[id] = Object.assign({}, all[id] || {}, patch); return { cer: all }; }); }
    function startKey(r) { return [r.source, r.pattern || '', r.density === '' || r.density == null ? '' : r.density, r.seed || '', r.size, r.rule].join('|'); }
    function cerChecks(inv, st) {
      var rows = st.picks.map(function (id) { return runLog.filter(function (r) { return r.id === id; })[0]; }).filter(Boolean);
      var rowsOk = false, fairOk = false;
      if (inv.id === 'density') {
        var dens = {}; rows.forEach(function (r) { dens[r.density] = true; });
        rowsOk = rows.length >= 3 && Object.keys(dens).length >= 3;
        fairOk = rows.length >= 2 && rows.every(function (r) { return r.size === rows[0].size && r.wrap === rows[0].wrap && r.rule === rows[0].rule; });
      } else if (inv.id === 'edges') {
        rowsOk = rows.length >= 2;
        for (var i = 0; i < rows.length; i++) for (var j = i + 1; j < rows.length; j++) if (startKey(rows[i]) === startKey(rows[j]) && rows[i].wrap !== rows[j].wrap) fairOk = true;
      } else {
        var kinds = {}; rows.forEach(function (r) { kinds[r.end] = true; });
        rowsOk = rows.length >= 3; fairOk = Object.keys(kinds).length >= 2;
      }
      return [
        { id: 'rows', ok: rowsOk, text: cerWords(inv.id).rowsNeed },
        { id: 'fair', ok: fairOk, text: cerWords(inv.id).fairNeed },
        { id: 'claim', ok: st.claim.trim().length >= 15, text: t('stem.cellular.cer_need_claim', 'A claim of at least one full sentence') },
        { id: 'number', ok: /\d/.test(st.evidence) && st.evidence.trim().length >= 15, text: t('stem.cellular.cer_need_number', 'Evidence that quotes numbers from your rows') },
        { id: 'idea', ok: st.reasoning.trim().length >= 30 && inv.idea.test(st.reasoning), text: t('stem.cellular.cer_need_idea', 'Reasoning that uses a science idea (for example neighbours, crowding, edges or repeating)') }
      ];
    }
    function completeCer(inv) {
      var st = cerState(inv.id), checks = cerChecks(inv, st);
      if (!checks.every(function (c) { return c.ok; })) return;
      cerPatch(inv.id, { claim: st.claim, evidence: st.evidence, reasoning: st.reasoning, done: true });
      awardOnce('cer_' + inv.id, 'cellularLab_cer', 15, t('stem.cellular.xp_cer', 'Completed a claim-evidence-reasoning investigation'));
      announce(t('stem.cellular.sr_cer_done', 'Investigation complete. Your claim, evidence and reasoning are saved.'));
    }
    function togglePick(invId, rowId) {
      var st = cerState(invId), on = st.picks.indexOf(rowId) !== -1;
      if (!on && st.picks.length >= 8) { announce(t('stem.cellular.sr_pick_max', 'Eight rows is the most you can pick. Unpick one first.')); return; }
      cerPatch(invId, { picks: on ? st.picks.filter(function (x) { return x !== rowId; }) : st.picks.concat([rowId]) });
    }
    var cerCanAsk = typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false;
    function askCerHint(inv) {
      if (!cerCanAsk) return;
      var st = cerState(inv.id), w = cerWords(inv.id);
      setCerHint(t('stem.cellular.cer_hint_wait', 'Asking for feedback…'));
      try { ctx.getHint('cellularLab-cer-' + inv.id, w.q, (st.claim + ' ' + st.evidence + ' ' + st.reasoning).slice(0, 900), inv.id, 0, function (text) { setCerHint(String(text || '')); }); } catch (e) { setCerHint(''); }
    }
    function rowStartWords(r) {
      if (r.kind === 'ca') return fmt(t('stem.cellular.log_start_rule', 'Rule {n}, random row seed {seed}'), { n: r.ruleNumber, seed: r.seed });
      if (r.source === 'soup') return fmt(t('stem.cellular.log_start_soup', 'Soup {pct}%, seed {seed}'), { pct: Math.round(Number(r.density) * 100), seed: r.seed });
      if (r.source === 'pattern') return patName(r.pattern);
      return t('stem.cellular.log_start_drawn', 'Drawn by hand');
    }
    var LOG_HEADER = ['id', 'kind', 'start', 'pattern', 'density', 'seed', 'size', 'edges', 'rule', 'start_cells', 'lifetime', 'end_state', 'period', 'end_cells', 'peak_cells', 'cap'];
    function csvText() { return buildCsv(LOG_HEADER, runLog.map(function (r) { return [r.id, r.kind, r.source, r.pattern || '', r.density, r.seed, r.size, r.wrap ? 'wrap' : 'fixed', r.rule, r.startPop, r.lifetime == null ? '' : r.lifetime, r.end, r.period == null ? '' : r.period, r.endPop, r.peakPop == null ? '' : r.peakPop, r.cap == null ? '' : r.cap]; })); }
    function downloadCsv() {
      try {
        var blob = new Blob([csvText()], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'cellular-run-log.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
        announce(t('stem.cellular.sr_csv_saved', 'CSV download started. If nothing downloads here, use Show CSV and copy the text.'));
      } catch (e) { setCsvShown(true); }
    }
    // Scatter: soup rows only, lifetime against starting density (hollow = still
    // changing at the cap, drawn at the cap).
    function renderLogChart() {
      var pts = runLog.filter(function (r) { return r.kind === 'soup' && r.density !== '' && r.density != null; });
      if (pts.length < 2) return h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.chart_need_soups', 'Log at least two soups to see the density chart.'));
      var W = 360, H = 200, L = 46, R = 10, T = 10, B = 34, maxY = 1;
      pts.forEach(function (r) { maxY = Math.max(maxY, r.lifetime == null ? (r.cap || 0) : r.lifetime); });
      var x = function (d) { return L + d * (W - L - R); }, y = function (v) { return T + (1 - v / maxY) * (H - T - B); };
      var ink = dark ? '#e2e8f0' : '#1e293b', dot = dark ? '#34d399' : '#047857';
      var groups = {}; pts.forEach(function (r) { var k = String(r.density); (groups[k] = groups[k] || []).push(r.lifetime == null ? r.cap : r.lifetime); });
      var summary = Object.keys(groups).sort(function (a, b) { return a - b; }).map(function (k) { var v = groups[k], m = v.reduce(function (a, b) { return a + b; }, 0) / v.length; return fmt(t('stem.cellular.chart_group', '{pct}%: mean {m} over {n} runs'), { pct: Math.round(Number(k) * 100), m: Math.round(m), n: v.length }); }).join('; ');
      return h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': fmt(t('stem.cellular.chart_aria', 'Scatter chart of soup lifetime against starting density. {summary}.'), { summary: summary }), style: { maxWidth: '420px', display: 'block' } },
        h('line', { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: ink, strokeWidth: 1 }), h('line', { x1: L, y1: T, x2: L, y2: H - B, stroke: ink, strokeWidth: 1 }),
        [0, 0.25, 0.5, 0.75, 1].map(function (d) { return h('text', { key: 'xt' + d, x: x(d), y: H - B + 13, textAnchor: 'middle', fill: ink, fontSize: 10 }, Math.round(d * 100) + '%'); }),
        [0, 0.5, 1].map(function (f) { return h('text', { key: 'yt' + f, x: L - 4, y: y(maxY * f) + 3, textAnchor: 'end', fill: ink, fontSize: 10 }, String(Math.round(maxY * f))); }),
        h('text', { x: (L + W - R) / 2, y: H - 4, textAnchor: 'middle', fill: ink, fontSize: 10, fontWeight: 700 }, t('stem.cellular.chart_x', 'starting density')),
        h('text', { x: 10, y: (T + H - B) / 2, textAnchor: 'middle', fill: ink, fontSize: 10, fontWeight: 700, transform: 'rotate(-90 10 ' + ((T + H - B) / 2) + ')' }, t('stem.cellular.chart_y', 'generations until settled')),
        pts.map(function (r, i) { var v = r.lifetime == null ? r.cap : r.lifetime, open = r.lifetime == null; return h('circle', { key: 'p' + r.id, cx: x(Number(r.density)) + ((i % 5) - 2) * 2, cy: y(v), r: 4, fill: open ? 'none' : dot, stroke: dot, strokeWidth: 1.6 }); }));
    }
    function renderRunLog(inv) {
      var st = inv ? cerState(inv.id) : null;
      return h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } },
        h('h3', { style: { margin: '0 0 6px', fontSize: '14px', color: C.text } }, fmt(t('stem.cellular.log_title', 'Run log ({n} trials)'), { n: runLog.length })),
        runLog.length === 0 ? h('p', { style: { margin: 0, fontSize: '12px', color: C.sub } }, t('stem.cellular.log_empty', 'No trials yet. Use “Log this start”, “Log with both edge types” or “Log 5 soups” in the Life tab, “Log this rule” in the Rules tab, or “Measure on my grid” in Patterns.')) :
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
            renderLogChart(),
            h('div', { style: { overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }, tabIndex: 0, role: 'region', 'aria-label': t('stem.cellular.log_region', 'Run log table (scrolls)') },
              h('table', { style: { borderCollapse: 'collapse', fontSize: '11px', color: C.text, minWidth: '640px', width: '100%' } },
                h('caption', { style: SR_ONLY }, t('stem.cellular.log_caption', 'Trials, newest last')),
                h('thead', null, h('tr', null, [inv ? t('stem.cellular.log_th_pick', 'Pick') : null, '#', t('stem.cellular.log_th_start', 'Start'), t('stem.cellular.log_th_world', 'World'), t('stem.cellular.log_th_cells', 'Start cells'), t('stem.cellular.log_th_life', 'Settled at'), t('stem.cellular.log_th_end', 'End state'), t('stem.cellular.log_th_endcells', 'End cells')].filter(function (x) { return x != null; }).map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid ' + C.border, position: 'sticky', top: 0, background: C.panel } }, x); }))),
                h('tbody', null, runLog.map(function (r) {
                  var pickable = inv && inv.kinds.indexOf(r.kind) !== -1, picked = st && st.picks.indexOf(r.id) !== -1;
                  return h('tr', { key: r.id, style: { background: picked ? C.accentBg : 'transparent' } },
                    inv ? h('td', { style: { padding: '3px 6px' } }, pickable ? h('input', { type: 'checkbox', checked: picked, disabled: st.done, onChange: function () { togglePick(inv.id, r.id); }, 'aria-label': fmt(t('stem.cellular.log_pick_aria', 'Use trial {n} as evidence'), { n: r.id }), style: { width: '18px', height: '18px' } }) : null) : null,
                    h('td', { style: { padding: '3px 6px' } }, String(r.id)),
                    h('td', { style: { padding: '3px 6px' } }, rowStartWords(r)),
                    h('td', { style: { padding: '3px 6px' } }, r.kind === 'ca' ? t('stem.cellular.log_world_ring', '81-cell ring') : fmt(r.wrap ? t('stem.cellular.log_world_wrap', '{n} × {n}, wrapping, {rule}') : t('stem.cellular.log_world_fixed', '{n} × {n}, fixed edges, {rule}'), { n: r.size, rule: r.rule })),
                    h('td', { style: { padding: '3px 6px' } }, r.startPop === '' ? '–' : String(r.startPop)),
                    h('td', { style: { padding: '3px 6px' } }, r.kind === 'ca' ? '–' : r.lifetime == null ? fmt(t('stem.cellular.log_over_cap', 'over {cap}'), { cap: r.cap }) : String(r.lifetime)),
                    h('td', { style: { padding: '3px 6px' } }, endWords(r)),
                    h('td', { style: { padding: '3px 6px' } }, r.endPop === '' || r.endPop == null ? '–' : String(r.endPop)));
                })))),
            h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              btn(t('stem.cellular.btn_csv', 'Download CSV'), downloadCsv, { key: 'csv' }),
              btn(csvShown ? t('stem.cellular.btn_hide_csv', 'Hide CSV') : t('stem.cellular.btn_show_csv', 'Show CSV'), function () { setCsvShown(!csvShown); }, { key: 'showcsv', pressed: csvShown }),
              !clearAsk && btn(t('stem.cellular.btn_clear_log', 'Clear log'), function () { setClearAsk(true); }, { key: 'clearlog' }),
              clearAsk && h('span', { role: 'group', 'aria-label': t('stem.cellular.clear_confirm_group', 'Confirm clearing the log'), style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } },
                h('span', { style: { fontSize: '12px', color: C.text, fontWeight: 700 } }, t('stem.cellular.clear_confirm', 'Delete every trial?')),
                btn(t('stem.cellular.btn_yes_clear', 'Yes, clear'), function () { patchSaved(function () { return { runLog: [] }; }); setClearAsk(false); announce(t('stem.cellular.sr_log_cleared', 'Run log cleared.')); }, { key: 'yes' }),
                btn(t('stem.cellular.btn_cancel', 'Cancel'), function () { setClearAsk(false); }, { key: 'no' }))),
            csvShown && h('div', null, h('label', { htmlFor: 'cell-csv-text', style: { display: 'block', fontSize: '11px', fontWeight: 800, color: C.text, marginBottom: '4px' } }, t('stem.cellular.csv_label', 'CSV text (select all and copy)')), h('textarea', { id: 'cell-csv-text', readOnly: true, rows: 6, value: csvText(), style: { width: '100%', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '11px', background: C.bg, color: C.text, border: '1px solid ' + C.border, borderRadius: '8px' } }))));
    }
    function renderCer(inv) {
      var st = cerState(inv.id), w = cerWords(inv.id), checks = cerChecks(inv, st), ready = checks.every(function (c) { return c.ok; });
      var field = function (key, label, rows) {
        return h('div', { key: key }, h('label', { htmlFor: 'cer-' + inv.id + '-' + key, style: { display: 'block', fontSize: '12px', fontWeight: 800, color: C.text, margin: '6px 0 3px' } }, label),
          h('textarea', { id: 'cer-' + inv.id + '-' + key, rows: rows, value: st[key], disabled: st.done, onChange: function (e) { var all = Object.assign({}, cerDraft), d = Object.assign({}, all[inv.id] || {}); d[key] = String(e.target.value).slice(0, 1200); all[inv.id] = d; setCerDraft(all); }, onBlur: function () { var p = {}; p[key] = st[key]; cerPatch(inv.id, p); }, style: { width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.bg, color: C.text, fontSize: '12px' } }));
      };
      return h('section', { style: { background: C.panel, border: '1px solid ' + (st.done ? C.accent : C.border), borderRadius: '12px', padding: '12px' } },
        h('h3', { style: { margin: '0 0 4px', fontSize: '14px', color: C.text } }, w.title + (st.done ? ' ✓' : '')),
        h('p', { style: { margin: '0 0 4px', fontSize: '13px', fontWeight: 800, color: C.text } }, w.q),
        h('p', { style: { margin: '0 0 6px', fontSize: '12px', color: C.sub, lineHeight: 1.5 } }, w.how),
        field('claim', t('stem.cellular.cer_claim', 'Claim: your answer to the question'), 2),
        field('evidence', t('stem.cellular.cer_evidence', 'Evidence: numbers from the rows you picked'), 3),
        field('reasoning', t('stem.cellular.cer_reasoning', 'Reasoning: the science idea that links the evidence to the claim'), 3),
        h('ul', { 'aria-label': t('stem.cellular.cer_checklist', 'Checklist'), style: { listStyle: 'none', margin: '8px 0', padding: 0, fontSize: '12px', color: C.text } }, checks.map(function (c) { return h('li', { key: c.id, style: { display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '2px' } }, h('span', { 'aria-hidden': 'true', style: { color: c.ok ? (dark ? '#34d399' : '#047857') : C.sub, fontWeight: 900 } }, c.ok ? '✓' : '○'), h('span', null, c.text + ' ', h('span', { style: SR_ONLY }, c.ok ? t('stem.cellular.check_done', '(done)') : t('stem.cellular.check_todo', '(not yet)')))); })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(st.done ? t('stem.cellular.cer_completed', 'Completed') : t('stem.cellular.btn_complete_cer', 'Complete investigation'), function () { completeCer(inv); }, { key: 'done', primary: !st.done, disabled: st.done || !ready }),
          st.done && btn(t('stem.cellular.btn_edit_cer', 'Edit again'), function () { cerPatch(inv.id, { done: false }); }, { key: 'edit' }),
          cerCanAsk && !st.done && btn(t('stem.cellular.btn_ai_feedback', 'Get feedback on my reasoning'), function () { askCerHint(inv); }, { key: 'ai' })),
        cerHint && h('p', { role: 'status', style: { margin: '8px 0 0', fontSize: '12px', color: C.text } }, cerHint));
    }
    function renderInvestigateTab() {
      var cards = PCE_CARDS.filter(function (c) { return c.bands.indexOf(band) !== -1; });
      var inv = CER_INVS.filter(function (x) { return x.id === cerOpen; })[0] || null;
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
        h('h3', { style: { margin: 0, fontSize: '15px', color: C.text } }, t('stem.cellular.pce_heading', 'Predict, check, explain')),
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub } }, t('stem.cellular.pce_intro', 'Commit to a prediction first. The check runs the real simulation, so the answer comes from the model, not from a key.')),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' } }, cards.map(renderPceCard)),
        CER_INVS.length > 0 && h('h3', { style: { margin: '6px 0 0', fontSize: '15px', color: C.text } }, t('stem.cellular.cer_heading', 'Claim, evidence, reasoning')),
        CER_INVS.length > 1 && h('div', { role: 'group', 'aria-label': t('stem.cellular.cer_pick_inv', 'Choose an investigation'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, CER_INVS.map(function (x) { return btn(cerWords(x.id).title + (cerSavedAll[x.id] && cerSavedAll[x.id].done ? ' ✓' : ''), function () { setCerOpen(x.id); setCerHint(''); }, { key: 'inv' + x.id, pressed: cerOpen === x.id }); })),
        inv && renderCer(inv),
        renderRunLog(inv)
      );
    }

    // ════════════════════ MISSIONS: forest fire, traffic, epidemic ════════════════════
    var missionsSaved = saved.missions && typeof saved.missions === 'object' ? saved.missions : {};
    var sMission = useState(band === 'k5' ? 'glider' : 'forest'); var missionId = sMission[0], setMissionId = sMission[1];
    var sModelParam = useState({ forest: 55, traffic: 30, epidemic: 30 }); var modelParam = sModelParam[0], setModelParam = sModelParam[1];
    var sModelSeed = useState({ forest: 1, traffic: 1, epidemic: 1 }); var modelSeed = sModelSeed[0], setModelSeed = sModelSeed[1];
    var sModelView = useState(null); var modelView = sModelView[0], setModelView = sModelView[1];
    var sModelPlaying = useState(false); var modelPlaying = sModelPlaying[0], setModelPlaying = sModelPlaying[1];
    var modelStateRef = useRef(null);
    var sMissionDraft = useState({}); var missionDraft = sMissionDraft[0], setMissionDraft = sMissionDraft[1];
    var sMissionMsg = useState({}); var missionMsg = sMissionMsg[0], setMissionMsg = sMissionMsg[1];
    // Animated replay of forest/epidemic: a timeout chain that re-checks
    // reduced motion each frame (reduced motion jumps straight to the end).
    useEffect(function () {
      if (!modelPlaying) return undefined;
      var id = null, alive = true;
      function frame() {
        if (!alive) return;
        var st = modelStateRef.current;
        if (!st) { setModelPlaying(false); return; }
        var done = st.model === 'forest' ? st.burning === 0 : st.infected === 0;
        if (done || prefersReducedMotion()) {
          while (st && !(st.model === 'forest' ? st.burning === 0 : st.infected === 0) && st.step < 2000) st = st.model === 'forest' ? forestStep(st) : epidemicStep(st);
          modelStateRef.current = st; setModelView({ mid: st.model, st: st }); setModelPlaying(false); finishModelRun(st); return;
        }
        st = st.model === 'forest' ? forestStep(st) : epidemicStep(st);
        modelStateRef.current = st; setModelView({ mid: st.model, st: st });
        id = setTimeout(frame, 90);
      }
      id = setTimeout(frame, 90);
      return function () { alive = false; if (id != null) clearTimeout(id); };
    }, [modelPlaying]);
    function missionPatch(mid, fn) { patchSaved(function (s) { var all = Object.assign({}, s.missions || {}); var cur = Object.assign({ trials: [] }, all[mid] || {}); var p = fn(cur); if (!p) return null; all[mid] = Object.assign(cur, p); return { missions: all }; }); }
    function mState(mid) { var m = missionsSaved[mid] && typeof missionsSaved[mid] === 'object' ? missionsSaved[mid] : {}; return { trials: (Array.isArray(m.trials) ? m.trials : []).filter(function (tr) { return tr && typeof tr === 'object' && isFinite(tr.p); }), done: m.done === true, tries: isFinite(m.tries) ? Number(m.tries) : 0, answer: m.answer, revealed: m.revealed === true }; }
    // Multiple-choice mission questions: after two wrong answers the student
    // may ask for the answer; it never pays XP (submitMission pays only within two tries).
    function revealMission(mid) {
      var ms = mState(mid), q = missionQuestion(mid);
      if (ms.done || q.numeric || ms.tries < 2 || !allowReveal) return;
      var right = q.opts.filter(function (o) { return o.id === q.answer; })[0];
      missionPatch(mid, function () { return { revealed: true }; });
      var text = fmt(t('stem.cellular.mission_revealed', 'Answer: “{answer}” Choose it and press Submit to finish the mission. No XP for a shown answer.'), { answer: right ? right.label : '' });
      var mm = Object.assign({}, missionMsg); mm[mid] = { ok: false, text: text }; setMissionMsg(mm); announce(text);
    }
    function addTrials(mid, list) { missionPatch(mid, function (cur) { return { trials: cur.trials.concat(list).slice(-120) }; }); }
    function trialFromRun(mid, p, seed, summary) {
      if (mid === 'forest') return { p: p, seed: seed, crossed: summary.crossed, burned: Math.round(summary.burnedFraction * 1000) / 1000 };
      if (mid === 'epidemic') return { p: p, seed: seed, attack: Math.round(summary.attackRate * 1000) / 1000, peak: summary.peak };
      return { p: p, seed: seed, flow: Math.round(summary.flow * 1000) / 1000, stopped: Math.round(summary.stoppedFraction * 1000) / 1000 };
    }
    function finishModelRun(st) {
      var mid = st.model, p = modelParam[mid] / 100, seed = modelSeed[mid];
      var sum = mid === 'forest' ? forestSummary(st) : epidemicSummary(st), tr = trialFromRun(mid, p, seed, sum);
      addTrials(mid, [tr]); announce(trialWords(mid, tr));
    }
    function trialWords(mid, tr) {
      if (mid === 'forest') return fmt(tr.crossed ? t('stem.cellular.ff_trial_crossed', 'Trees {pct}%: the fire crossed the forest and burned {b}% of the trees.') : t('stem.cellular.ff_trial_stopped', 'Trees {pct}%: the fire died out and burned {b}% of the trees.'), { pct: Math.round(tr.p * 100), b: Math.round(tr.burned * 100) });
      if (mid === 'epidemic') return fmt(t('stem.cellular.ep_trial', 'Vaccinated {pct}%: {a}% of unvaccinated people caught it (peak {peak} sick at once).'), { pct: Math.round(tr.p * 100), a: Math.round(tr.attack * 100), peak: tr.peak });
      return fmt(t('stem.cellular.tf_trial', 'Car density {pct}%: {f} cars moved per cell per step; {s}% of cars were stuck at the end.'), { pct: Math.round(tr.p * 100), f: tr.flow.toFixed(3), s: Math.round(tr.stopped * 100) });
    }
    function runModelOnce(mid) {
      var p = modelParam[mid] / 100, seed = freshSeed(), ms = Object.assign({}, modelSeed); ms[mid] = seed; setModelSeed(ms);
      if (mid === 'traffic') { var run = trafficRun(80, p, seed, 200, 100); setModelView({ mid: mid, traffic: run }); var tr = trialFromRun(mid, run.cars / 80, seed, run); addTrials(mid, [tr]); announce(trialWords(mid, tr)); return; }
      var st = mid === 'forest' ? forestInit(30, p, seed) : epidemicInit(40, p, seed);
      modelStateRef.current = st; setModelView({ mid: mid, st: st }); setModelPlaying(true);
    }
    function runModelBatch(mid, n) {
      var p = modelParam[mid] / 100, list = [], last = null;
      for (var i = 0; i < n; i++) {
        var seed = freshSeed();
        if (mid === 'forest') { var f = forestRun(30, p, seed); list.push(trialFromRun(mid, p, seed, f.summary)); last = { mid: mid, st: f.state }; }
        else if (mid === 'epidemic') { var e = epidemicRun(40, p, seed); list.push(trialFromRun(mid, p, seed, e.summary)); last = { mid: mid, st: e.state }; }
        else { var tr = trafficRun(80, p, seed, 200, 100); list.push(trialFromRun(mid, tr.cars / 80, seed, tr)); last = { mid: mid, traffic: tr }; }
      }
      setModelPlaying(false); modelStateRef.current = null; setModelView(last); addTrials(mid, list);
      announce(fmt(t('stem.cellular.sr_batch_done', 'Ran {n} trials at {pct}%.'), { n: n, pct: modelParam[mid] }));
    }
    // Per-parameter summaries of the student's own trials.
    function groupTrials(mid, list) {
      var g = {};
      list.forEach(function (tr) { var k = Math.round(tr.p * 100); (g[k] = g[k] || []).push(tr); });
      return Object.keys(g).map(Number).sort(function (a, b) { return a - b; }).map(function (k) {
        var v = g[k], n = v.length;
        if (mid === 'forest') return { pct: k, n: n, value: v.filter(function (x) { return x.crossed; }).length / n };
        if (mid === 'epidemic') return { pct: k, n: n, value: v.reduce(function (a, x) { return a + x.attack; }, 0) / n };
        return { pct: k, n: n, value: v.reduce(function (a, x) { return a + x.flow; }, 0) / n };
      });
    }
    // Mission goals are checked against the student's OWN trials.
    function missionGoals(mid, groups) {
      if (mid === 'forest') {
        if (band === 'k5') return [
          { id: 'sparse', ok: groups.some(function (g) { return g.pct <= 45; }), text: t('stem.cellular.ff_goal_k5_sparse', 'Light a thin forest (45% trees or fewer).') },
          { id: 'thick', ok: groups.some(function (g) { return g.pct >= 75; }), text: t('stem.cellular.ff_goal_k5_thick', 'Light a thick forest (75% trees or more).') }];
        return [
          { id: 'low', ok: groups.some(function (g) { return g.n >= 3 && g.value <= 0.2; }), text: t('stem.cellular.ff_goal_low', 'Find a tree density where the fire crosses in at most 1 of 5 runs (at least 3 runs there).') },
          { id: 'high', ok: groups.some(function (g) { return g.n >= 3 && g.value >= 0.8; }), text: t('stem.cellular.ff_goal_high', 'Find a tree density where the fire crosses in at least 4 of 5 runs (at least 3 runs there).') }];
      }
      if (mid === 'epidemic') return [
        { id: 'high', ok: groups.some(function (g) { return g.n >= 3 && g.value < 0.1; }), text: t('stem.cellular.ep_goal_safe', 'Find a vaccination level where, on average, fewer than 10% catch it (at least 3 runs there).') },
        { id: 'low', ok: groups.some(function (g) { return g.n >= 3 && g.value > 0.3 && groups.some(function (h2) { return h2.n >= 3 && h2.value < 0.1 && h2.pct - g.pct >= 20; }); }), text: t('stem.cellular.ep_goal_contrast', 'Show a level at least 20 points lower where more than 30% catch it (at least 3 runs there).') }];
      return [
        { id: 'spread', ok: groups.length >= 4 && groups.some(function (g) { return g.pct <= 30; }) && groups.some(function (g) { return g.pct >= 70; }), text: t('stem.cellular.tf_goal_spread', 'Run at least 4 different densities, including one at 30% or less and one at 70% or more.') }];
    }
    function missionQuestion(mid) {
      if (mid === 'forest' && band === 'k5') return { q: t('stem.cellular.ff_q_k5', 'Which forest did the fire cross?'), opts: [{ id: 'thick', label: t('stem.cellular.ff_a_thick', 'The thick forest') }, { id: 'sparse', label: t('stem.cellular.ff_a_sparse', 'The thin forest') }], answer: 'thick', mis: { sparse: t('stem.cellular.ff_mis_sparse', 'Look at your runs again: in a thin forest the gaps between trees stop the fire.') } };
      if (mid === 'forest') return { q: t('stem.cellular.ff_q', 'Estimate the tipping point: the tree density (in %) where the fire starts to cross most of the time.'), numeric: true };
      if (mid === 'epidemic') return { q: t('stem.cellular.ep_q', 'Why does vaccinating some people protect people who are not vaccinated?'), opts: [{ id: 'blocks', label: t('stem.cellular.ep_a_blocks', 'Vaccinated people break the chains the infection would travel along.') }, { id: 'cures', label: t('stem.cellular.ep_a_cures', 'The vaccine cures people who are already sick.') }, { id: 'luck', label: t('stem.cellular.ep_a_luck', 'It is just luck; vaccination only protects the vaccinated person.') }], answer: 'blocks', mis: { cures: t('stem.cellular.ep_mis_cures', 'In this model nobody is cured early: sick people stay sick for 3 steps whatever happens. Look at what vaccinated cells do to the paths between sick and healthy people.'), luck: t('stem.cellular.ep_mis_luck', 'Your runs show a pattern, not luck: above a certain level outbreaks stay small every time. Vaccinated people are gaps the infection cannot cross.') } };
      return { q: t('stem.cellular.tf_q', 'Above the density that moves the most cars, what happens as you add more cars?'), opts: [{ id: 'jams', label: t('stem.cellular.tf_a_jams', 'Jams form, and fewer cars get through each step.') }, { id: 'faster', label: t('stem.cellular.tf_a_faster', 'More cars get through, because there are more cars.') }, { id: 'same', label: t('stem.cellular.tf_a_same', 'Nothing changes.') }], answer: 'jams', mis: { faster: t('stem.cellular.tf_mis_faster', 'Misconception: “more cars means more traffic moved.” Check your table: above about half full, each extra car blocks the car behind it.'), same: t('stem.cellular.tf_mis_same', 'Check your table: the cars moved per step go down above about half full.') } };
    }
    function submitMission(mid, groups) {
      var ms = mState(mid), goals = missionGoals(mid, groups);
      if (ms.done || !goals.every(function (g) { return g.ok; })) return;
      var q = missionQuestion(mid), ans = missionDraft[mid], msg = '', ok = false;
      if (q.numeric) {
        var est = parseFloat(String(ans == null ? '' : ans).replace(',', '.'));
        var lows = groups.filter(function (g) { return g.n >= 3 && g.value <= 0.2; }).map(function (g) { return g.pct; }), highs = groups.filter(function (g) { return g.n >= 3 && g.value >= 0.8; }).map(function (g) { return g.pct; });
        var lo = Math.max.apply(Math, lows), hi = Math.min.apply(Math, highs);
        if (!isFinite(est)) msg = t('stem.cellular.ff_need_number', 'Type a number of percent, for example 60.');
        else if (lo >= hi) msg = t('stem.cellular.ff_messy', 'Your low and high densities overlap. Run more trials so each density has a clear result.');
        else if (est < lo || est > hi) msg = fmt(t('stem.cellular.ff_outside', 'Your own data says the tipping point is between {lo}% and {hi}%. Choose a number in that range.'), { lo: lo, hi: hi });
        else if (est < 50 || est > 70) msg = fmt(t('stem.cellular.ff_narrow', 'That fits your data, but your range ({lo}% to {hi}%) is wide. Run trials between them to narrow it down.'), { lo: lo, hi: hi });
        else ok = true;
        if (ok) msg = fmt(t('stem.cellular.ff_ok', 'Yes: about {est}%. Below the tipping point the gaps stop the fire; above it, connected paths of trees almost always cross. Scientists call this a percolation threshold (about 59% on an endless square grid).'), { est: est });
      } else {
        if (!ans) return;
        ok = ans === q.answer;
        if (mid === 'traffic' && ok) {
          var best = groups.reduce(function (a, g) { return !a || g.value > a.value ? g : a; }, null);
          if (!best || best.pct < 40 || best.pct > 60) { ok = false; msg = t('stem.cellular.tf_need_middle', 'Right idea, but your best density is not near the middle yet. Try densities between 40% and 60%.'); }
          else msg = fmt(t('stem.cellular.tf_ok', 'Yes. In your runs the most cars moved at {pct}% full ({f} cars per cell per step). Below half full every car can move; above it, cars block each other and jams travel backwards.'), { pct: best.pct, f: best.value.toFixed(3) });
        } else msg = ok ? (mid === 'epidemic' ? t('stem.cellular.ep_ok', 'Yes. Vaccinated people are gaps the infection cannot cross. Above a threshold the gaps cut every path, which is called herd immunity.') : t('stem.cellular.ff_ok_k5', 'Yes! In the thick forest the trees touch, so the fire can travel all the way across.')) : (q.mis[ans] || t('stem.cellular.mission_wrong', 'Not quite. Look at your table and try again.'));
      }
      var tries = ms.tries + (ok ? 0 : 1);
      missionPatch(mid, function () { return ok ? { done: true, answer: ans, tries: tries } : { tries: tries }; });
      var mm = Object.assign({}, missionMsg); mm[mid] = { ok: ok, text: msg }; setMissionMsg(mm);
      announce(msg);
      // Multiple-choice answers earn XP only within two tries, so guessing every option pays nothing.
      if (ok && (q.numeric || ms.tries < 2)) awardOnce('mission_' + mid, 'cellularLab_missions', 15, fmt(t('stem.cellular.xp_mission', 'Cellular Automaton Lab mission complete: {name}'), { name: missionTitle(mid) }));
    }
    function missionTitle(mid) { if (mid === 'glider') return t('stem.cellular.gl_title', 'Glider mission: hit the star'); return mid === 'forest' ? t('stem.cellular.ff_title', 'Forest fire: find the tipping point') : mid === 'epidemic' ? t('stem.cellular.ep_title', 'Epidemic: how many must be vaccinated?') : t('stem.cellular.tf_title', 'Traffic jam: Rule 184 on a ring road'); }
    function missionIntro(mid) {
      if (mid === 'forest') return t('stem.cellular.ff_intro', 'Each cell is a tree or bare ground. The whole left edge catches fire; fire spreads to touching trees (up, down, left, right), then burns out. Does it reach the right edge?');
      if (mid === 'epidemic') return t('stem.cellular.ep_intro', 'Each cell is a person. One person in the middle is sick. Each step, every healthy neighbour of a sick person (8 around) has a 35% chance of catching it from each sick neighbour. Sick people recover after 3 steps. Vaccinated people never catch it.');
      return t('stem.cellular.tf_intro', 'A ring road of 80 cells. Each step, every car moves one cell right if the cell ahead is empty. That is exactly Rule 184. How many cars get through per step?');
    }
    function renderModelView() {
      var v = modelView; if (!v || v.mid !== missionId) return null;
      if (v.traffic) {
        var rows = v.traffic.rows, W2 = 80 * 5, H2 = rows.length * 5, d = '';
        rows.forEach(function (row, r) { row.forEach(function (x, c) { if (x) d += 'M' + (c * 5) + ' ' + (r * 5) + 'h5v5h-5z'; }); });
        return h('figure', { style: { margin: 0 } }, h('svg', { viewBox: '0 0 ' + W2 + ' ' + H2, width: '100%', role: 'img', 'aria-label': fmt(t('stem.cellular.tf_svg_aria', 'Space-time diagram of {cars} cars on an 80-cell ring road over {n} steps; time runs downward and cars move right. Jams show as diagonal bands running left.'), { cars: v.traffic.cars, n: rows.length }), style: { maxWidth: '480px', display: 'block', background: dark ? '#020617' : '#f8fafc', border: '1px solid ' + C.border, borderRadius: '8px' } }, h('path', { d: d, fill: dark ? '#fbbf24' : '#b45309' })),
          h('figcaption', { style: { fontSize: '11px', color: C.sub, marginTop: '4px' } }, t('stem.cellular.tf_caption', 'Each row is one step; each dot is a car.')));
      }
      var st = v.st, size = st.size, cellPx = 10, colours = st.model === 'forest' ? { 1: dark ? '#22c55e' : '#15803d', 2: '#f97316', 3: dark ? '#a8a29e' : '#78716c' } : { 1: '#ef4444', 2: dark ? '#60a5fa' : '#2563eb', 3: dark ? '#a3e635' : '#4d7c0f' };
      var paths = {}; st.cells.forEach(function (x, i) { if (!x) return; var r = Math.floor(i / size), c = i % size; paths[x] = (paths[x] || '') + 'M' + (c * cellPx) + ' ' + (r * cellPx) + 'h' + cellPx + 'v' + cellPx + 'h-' + cellPx + 'z'; });
      var sum = st.model === 'forest' ? forestSummary(st) : epidemicSummary(st);
      var desc = st.model === 'forest' ? fmt(t('stem.cellular.ff_desc', 'Step {step}: {burning} trees burning, {burnt} of {trees} trees burnt so far. {crossed}'), { step: st.step, burning: st.burning, burnt: sum.burnt, trees: sum.trees, crossed: sum.crossed ? t('stem.cellular.ff_reached', 'The fire has reached the right edge.') : t('stem.cellular.ff_not_reached', 'The fire has not reached the right edge.') }) : fmt(t('stem.cellular.ep_desc', 'Step {step}: {sick} sick now, {ever} caught it so far, {vacc} vaccinated.'), { step: st.step, sick: st.infected, ever: st.everInfected, vacc: st.vaccinated });
      var legend = st.model === 'forest' ? [[1, t('stem.cellular.ff_tree', 'tree')], [2, t('stem.cellular.ff_burning', 'burning')], [3, t('stem.cellular.ff_burnt', 'burnt')]] : [[1, t('stem.cellular.ep_sick', 'sick')], [2, t('stem.cellular.ep_recovered', 'recovered')], [3, t('stem.cellular.ep_vaccinated', 'vaccinated')]];
      return h('figure', { style: { margin: 0 } },
        h('svg', { viewBox: '0 0 ' + (size * cellPx) + ' ' + (size * cellPx), width: '100%', 'aria-hidden': 'true', style: { maxWidth: '360px', display: 'block', background: dark ? '#0f172a' : '#fafaf9', border: '1px solid ' + C.border, borderRadius: '8px' } }, Object.keys(paths).map(function (k) { return h('path', { key: k, d: paths[k], fill: colours[k] }); })),
        h('figcaption', { style: { fontSize: '11px', color: C.text, marginTop: '4px' } },
          h('span', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '3px' } }, legend.map(function (l) { return h('span', { key: l[0], style: { display: 'inline-flex', gap: '4px', alignItems: 'center' } }, h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '2px', background: colours[l[0]] } }), l[1]); })),
          h('span', { 'aria-live': modelPlaying ? 'off' : 'polite' }, desc)));
    }
    function renderMission(mid) {
      var ms = mState(mid), groups = groupTrials(mid, ms.trials), goals = missionGoals(mid, groups), q = missionQuestion(mid), goalsOk = goals.every(function (g) { return g.ok; }), msg = missionMsg[mid];
      var paramLabel = mid === 'forest' ? t('stem.cellular.ff_param', 'Trees: {pct}% of the ground') : mid === 'epidemic' ? t('stem.cellular.ep_param', 'Vaccinated: {pct}% of people') : t('stem.cellular.tf_param', 'Cars: {pct}% of the road');
      var range = mid === 'forest' ? [30, 90, 5] : mid === 'epidemic' ? [0, 90, 10] : [5, 95, 5];
      var valueHead = mid === 'forest' ? t('stem.cellular.ff_col', 'Fire crossed') : mid === 'epidemic' ? t('stem.cellular.ep_col', 'Average caught it') : t('stem.cellular.tf_col', 'Cars moved per cell per step');
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('h3', { style: { margin: 0, fontSize: '15px', color: C.text } }, missionTitle(mid) + (ms.done ? ' ✓' : '')),
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } }, missionIntro(mid)),
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } },
          h('label', { style: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 800, color: C.text, minWidth: '220px' } }, fmt(paramLabel, { pct: modelParam[mid] }),
            h('input', { type: 'range', min: range[0], max: range[1], step: range[2], value: modelParam[mid], 'aria-valuetext': fmt(paramLabel, { pct: modelParam[mid] }), onChange: function (e) { var mp = Object.assign({}, modelParam); mp[mid] = parseInt(e.target.value, 10); setModelParam(mp); }, style: { width: '100%', minHeight: '24px' } })),
          btn(mid === 'traffic' ? t('stem.cellular.btn_run_model_traffic', 'Run one trial') : t('stem.cellular.btn_run_model', 'Run one trial (watch)'), function () { runModelOnce(mid); }, { key: 'one', primary: true, disabled: modelPlaying }),
          btn(t('stem.cellular.btn_run_model5', 'Run 5 trials'), function () { runModelBatch(mid, 5); }, { key: 'five', disabled: modelPlaying })),
        renderModelView(),
        groups.length > 0 && h('table', { style: { borderCollapse: 'collapse', fontSize: '12px', color: C.text, maxWidth: '480px' } },
          h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px', color: C.text } }, t('stem.cellular.mission_table', 'Your trials')),
          h('thead', null, h('tr', null, [mid === 'forest' ? t('stem.cellular.ff_col_p', 'Trees') : mid === 'epidemic' ? t('stem.cellular.ep_col_p', 'Vaccinated') : t('stem.cellular.tf_col_p', 'Car density'), t('stem.cellular.col_runs', 'Runs'), valueHead].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '3px 8px', borderBottom: '1px solid ' + C.border } }, x); }))),
          h('tbody', null, groups.map(function (g) { return h('tr', { key: g.pct }, h('td', { style: { padding: '3px 8px' } }, g.pct + '%'), h('td', { style: { padding: '3px 8px' } }, String(g.n)), h('td', { style: { padding: '3px 8px' } }, mid === 'traffic' ? g.value.toFixed(3) : mid === 'forest' ? fmt(t('stem.cellular.ff_rate', '{k} of {n}'), { k: Math.round(g.value * g.n), n: g.n }) : Math.round(g.value * 100) + '%')); }))),
        h('h4', { style: { margin: '4px 0 0', fontSize: '13px', color: C.text } }, t('stem.cellular.mission_goals', 'Goals')),
        h('ul', { style: { listStyle: 'none', margin: 0, padding: 0, fontSize: '12px', color: C.text } }, goals.map(function (g) { return h('li', { key: g.id, style: { display: 'flex', gap: '6px', marginBottom: '3px' } }, h('span', { 'aria-hidden': 'true', style: { color: g.ok ? (dark ? '#34d399' : '#047857') : C.sub, fontWeight: 900 } }, g.ok ? '✓' : '○'), h('span', null, g.text + ' ', h('span', { style: SR_ONLY }, g.ok ? t('stem.cellular.check_done', '(done)') : t('stem.cellular.check_todo', '(not yet)')))); })),
        goalsOk && !ms.done && h('div', { style: { padding: '10px', borderRadius: '10px', border: '1px solid ' + C.border, background: C.bg } },
          h('p', { id: 'mq-' + mid, style: { margin: '0 0 6px', fontSize: '12px', fontWeight: 800, color: C.text } }, q.q),
          q.numeric ? h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
            h('input', { type: 'text', inputMode: 'decimal', 'aria-labelledby': 'mq-' + mid, value: missionDraft[mid] || '', onChange: function (e) { var d = Object.assign({}, missionDraft); d[mid] = String(e.target.value).slice(0, 6); setMissionDraft(d); }, style: { width: '80px', padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text } }),
            h('span', { style: { fontSize: '12px', color: C.text } }, '%'),
            btn(t('stem.cellular.btn_submit', 'Submit'), function () { submitMission(mid, groups); }, { key: 'sub', primary: true })) :
            h('fieldset', { style: { border: 'none', margin: 0, padding: 0 } }, h('legend', { style: SR_ONLY }, q.q),
              q.opts.map(function (o) { return h('label', { key: o.id, style: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: C.text, padding: '4px 0', minHeight: '28px' } }, h('input', { type: 'radio', name: 'mq-radio-' + mid, checked: missionDraft[mid] === o.id, onChange: function () { var d = Object.assign({}, missionDraft); d[mid] = o.id; setMissionDraft(d); }, style: { width: '18px', height: '18px' } }), o.label); }),
              btn(t('stem.cellular.btn_submit', 'Submit'), function () { submitMission(mid, groups); }, { key: 'sub', primary: true, disabled: !missionDraft[mid] }))),
        msg && feedbackBox(msg.ok, msg.text),
        goalsOk && !ms.done && !q.numeric && ms.tries >= 2 && !ms.revealed && allowReveal && h('div', null, btn(t('stem.cellular.btn_reveal', 'Show the answer (no XP)'), function () { revealMission(mid); }, { key: 'mreveal' })),
        ms.done && !msg && h('p', { style: { margin: 0, fontSize: '12px', color: C.text } }, t('stem.cellular.mission_done', 'Mission complete. Keep experimenting if you like.')),
        mid === 'epidemic' && crossLink('epidemicSim', t('stem.cellular.link_epidemic', 'Epidemic Simulator'), t('stem.cellular.link_epidemic_why', 'Compare the grid outbreak with a whole-population SIR model.')),
        mid === 'forest' && band !== 'k5' && renderForestModel(groups),
        mid === 'forest' && crossLink('fireEcology', t('stem.cellular.link_fire', 'Fire Ecology'), t('stem.cellular.link_fire_why', 'See why real forests need some fire.')),
        mid === 'traffic' && btn(t('stem.cellular.btn_open_184', 'See Rule 184 in the Rules tab'), function () { setRuleSafe(184); setCaSeed('random'); setCaWrap(true); setTab('rules'); }, { key: 'r184' })
      );
    }
    function renderMissionsTab() {
      var mids = band === 'k5' ? ['glider', 'forest'] : ['forest', 'traffic', 'epidemic'];
      var missionDone = function (m) { return m === 'glider' ? (gliderSaved.done === true || countOf(gliderSaved.solved) >= 3) : mState(m).done; };
      var current = mids.indexOf(missionId) !== -1 ? missionId : mids[0];
      var done = saved.challengesDone || {};
      var lifeMissions = band === 'k5' ? ['still', 'oscillator'] : ['still', 'oscillator', 'extinction', 'methuselah', 'maxpop'];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        lifeTabOpen() && h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } },
          h('h3', { style: { margin: '0 0 6px', fontSize: '14px', color: C.text } }, t('stem.cellular.life_missions', 'Life design missions')),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, lifeMissions.map(function (id) { return btn(challengeName(id) + (done[id] ? ' ✓' : ''), function () { beginChallenge(id); }, { key: 'lm' + id, ariaLabel: fmt(done[id] ? t('stem.cellular.lm_aria_done', 'Start the {name} challenge in the Life tab (completed)') : t('stem.cellular.lm_aria', 'Start the {name} challenge in the Life tab'), { name: challengeName(id) }) }); }))),
        h('div', { role: 'group', 'aria-label': t('stem.cellular.model_missions', 'Real-world model missions'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, mids.map(function (m) { return btn(missionTitle(m) + (missionDone(m) ? ' ✓' : ''), function () { setMissionId(m); setModelPlaying(false); }, { key: 'm' + m, pressed: current === m }); })),
        h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } }, current === 'glider' ? renderGliderMission() : renderMission(current))
      );
    }

    // ════════════════════ TEACHER PANEL (ctx.isTeacherMode only) ════════════════════
    var sResetAsk = useState(false); var resetAsk = sResetAsk[0], setResetAsk = sResetAsk[1];
    function teacherPatch(patch) { patchSaved(function (s) { return { teacher: Object.assign({}, s.teacher || {}, patch) }; }); }
    function renderTeacherTab() {
      var p = practiceStats, missed = p.missed || {}, cls = p.classMissed || {};
      var missedRows = Object.keys(missed).sort(function (a, b) { return missed[b] - missed[a]; });
      var antMissed = plainObj(antSaved.missed), antMissRows = ['extra', 'one_period', 'direction', 'no_move', 'off'].filter(function (k) { return countOf(antMissed[k]) > 0; });
      var antMissName = function (k) { return k === 'extra' ? t('stem.cellular.tm_ant_extra', 'Ant highway: forgot the extra steps after the whole periods') : k === 'one_period' ? t('stem.cellular.tm_ant_one', 'Ant highway: used one period instead of several') : k === 'direction' ? t('stem.cellular.tm_ant_dir', 'Ant highway: moved the wrong way') : k === 'no_move' ? t('stem.cellular.tm_ant_nomove', 'Ant highway: thought the ant stays still') : t('stem.cellular.tm_ant_off', 'Ant highway: other wrong position'); };
      var bandName = function (b) { return b === 'k5' ? t('stem.cellular.band_k5', 'Grades K–5') : b === 'g912' ? t('stem.cellular.band_912', 'Grades 9–12') : t('stem.cellular.band_68', 'Grades 6–8'); };
      var row = function (label, value) { return h('tr', { key: label }, h('th', { scope: 'row', style: { textAlign: 'left', padding: '3px 8px', fontWeight: 700 } }, label), h('td', { style: { padding: '3px 8px' } }, value)); };
      var selStyle = { padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text };
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub } }, t('stem.cellular.teacher_intro', 'Only you see this tab. Settings apply to this device’s saved Cellular Lab work.')),
        h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
          h('h3', { style: { margin: 0, fontSize: '14px', color: C.text } }, t('stem.cellular.teacher_settings', 'Settings')),
          h('label', { style: { fontSize: '12px', color: C.text, fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, t('stem.cellular.teacher_lock_band', 'Lock the level'),
            h('select', { value: teacherCfg.lockBand || '', onChange: function (e) { teacherPatch({ lockBand: e.target.value || null }); }, style: selStyle },
              h('option', { value: '' }, t('stem.cellular.teacher_no_lock', 'Not locked')), BANDS.map(function (b) { return h('option', { key: b, value: b }, bandName(b)); }))),
          h('label', { style: { fontSize: '12px', color: C.text, fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, t('stem.cellular.teacher_lock_tab', 'Keep students on one section'),
            h('select', { value: teacherCfg.lockTab || '', onChange: function (e) { teacherPatch({ lockTab: e.target.value || null }); }, style: selStyle },
              h('option', { value: '' }, t('stem.cellular.teacher_all_tabs', 'All sections')), ALL_TABS.filter(function (tb) { return tb.id !== 'teacher'; }).map(function (tb) { return h('option', { key: tb.id, value: tb.id }, tb.label); }))),
          h('label', { style: { fontSize: '12px', color: C.text, fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center' } },
            h('input', { type: 'checkbox', checked: teacherCfg.noReveal !== true, onChange: function (e) { teacherPatch({ noReveal: !e.target.checked }); }, style: { width: '18px', height: '18px' } }),
            t('stem.cellular.teacher_reveal_all', 'Allow “Show the answer” after two tries in every section: Practice, Langton’s ant, the glider mission and mission questions (no XP when used)'))),
        h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } },
          h('h3', { style: { margin: '0 0 6px', fontSize: '14px', color: C.text } }, t('stem.cellular.teacher_summary', 'Progress summary')),
          h('table', { style: { borderCollapse: 'collapse', fontSize: '12px', color: C.text } }, h('tbody', null,
            row(t('stem.cellular.ts_level', 'Level in use'), bandName(band)),
            row(t('stem.cellular.ts_path', 'Learning path'), fmt(t('stem.cellular.ts_path_v', '{done} of {n} steps done: {list}'), { done: pathDoneN, n: PATH.length, list: PATH.map(function (st) { return fmt(t('stem.cellular.ts_path_item', '{name}: {status}'), { name: pathTitle(st.id), status: st.done ? t('stem.cellular.ts_done', 'done') : t('stem.cellular.ts_open', 'open') }); }).join('; ') })),
            row(t('stem.cellular.ts_boards', 'Next-generation boards'), fmt(t('stem.cellular.ts_boards_v', '{s} solved, {f} first try, {a} checks, {r} answers shown'), { s: p.solved || 0, f: p.firstTry || 0, a: p.attempts || 0, r: p.revealed || 0 })),
            row(t('stem.cellular.ts_classes', 'Wolfram classes'), fmt(t('stem.cellular.ts_classes_v', '{s} classified, {f} first try, {a} attempts'), { s: p.classSolved || 0, f: p.classFirstTry || 0, a: p.classAttempts || 0 })),
            row(t('stem.cellular.ts_challenges', 'Challenges solved'), ['still', 'oscillator', 'extinction', 'methuselah', 'maxpop'].filter(function (id) { return saved.challengesDone && typeof saved.challengesDone === 'object' && saved.challengesDone[id] === true; }).map(challengeName).join(', ') || t('stem.cellular.ts_none', 'none yet')),
            row(t('stem.cellular.ts_pce', 'Prediction cards'), PCE_CARDS.map(function (c) { var s = pceSaved[c.id]; return pceText(c.id).title + ': ' + (!s || !s.pick ? t('stem.cellular.ts_pce_none', 'not started') : !s.checked ? t('stem.cellular.ts_pce_locked', 'predicted') : (s.correct ? t('stem.cellular.ts_pce_right', 'prediction right') : t('stem.cellular.ts_pce_wrong', 'prediction wrong')) + (s.done ? ', ' + t('stem.cellular.ts_pce_explained', 'explained') : '')); }).join('; ')),
            row(t('stem.cellular.ts_cer', 'Investigations'), ['density', 'edges', 'classes'].map(function (id) { return cerWords(id).title + ': ' + (cerSavedAll[id] && cerSavedAll[id].done ? t('stem.cellular.ts_done', 'done') : t('stem.cellular.ts_open', 'open')); }).join('; ')),
            row(t('stem.cellular.ts_missions', 'Missions'), ['forest', 'traffic', 'epidemic'].map(function (m) { var s = mState(m); return missionTitle(m) + ': ' + (s.done ? t('stem.cellular.ts_done', 'done') : fmt(t('stem.cellular.ts_trials', '{n} trials'), { n: s.trials.length })) + (s.tries ? ' ' + fmt(t('stem.cellular.ts_wrong_answers', '({n} wrong answers)'), { n: s.tries }) : ''); }).join('; ')),
            row(t('stem.cellular.gl_title', 'Glider mission: hit the star'), fmt(t('stem.cellular.ts_glider_v', '{s} of 3 rounds solved, {r} of {g} direction guesses right'), { s: Math.min(3, countOf(gliderSaved.solved)), r: countOf(gliderSaved.guessRight), g: countOf(gliderSaved.guesses) })),
            row(t('stem.cellular.ffm_title', 'The model as an argument'), (function () { var f = ffSaved(); return f.done === true ? t('stem.cellular.ts_done', 'done') : fmt(t('stem.cellular.ts_ffm_v', 'open; sort checked {n} times'), { n: countOf(f.sortChecks) }); })()),
            row(t('stem.cellular.wv_ant', 'Langton’s ant'), !antSaved.locked ? t('stem.cellular.ts_pce_none', 'not started') : fmt(t('stem.cellular.ts_ant_v', 'long run: {p}; {s} positions solved, {a} checks, {r} answers shown'), { p: !antSaved.checked ? t('stem.cellular.ts_pce_locked', 'predicted') : antSaved.correct ? t('stem.cellular.ts_pce_right', 'prediction right') : t('stem.cellular.ts_pce_wrong', 'prediction wrong'), s: countOf(antSaved.solved), a: countOf(antSaved.attempts), r: countOf(antSaved.revealed) })),
            row(t('stem.cellular.wv_hunt', 'Rule hunt'), fmt(t('stem.cellular.ts_hunt_v', '{n} rules searched, {k} spaceship rules measured; family predictions {r} of {p} right'), { n: countOf(huntSaved.tested), k: huntFound.length, r: countOf(worldsSaved.predictedRight), p: countOf(worldsSaved.predicted) })),
            row(t('stem.cellular.ts_log', 'Run log'), fmt(t('stem.cellular.ts_log_v', '{n} trials'), { n: runLog.length }))))),
        h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } },
          h('h3', { style: { margin: '0 0 6px', fontSize: '14px', color: C.text } }, t('stem.cellular.teacher_missed', 'Missed items (misconceptions seen in Practice)')),
          missedRows.length || Object.keys(cls).length || antMissRows.length ? h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: C.text } },
            missedRows.map(function (k) { return h('li', { key: k }, fmt(t('stem.cellular.teacher_missed_row', '{name}: {n} times'), { name: misconceptionName(k), n: missed[k] })); }),
            antMissRows.map(function (k) { return h('li', { key: 'ant' + k }, fmt(t('stem.cellular.teacher_missed_row', '{name}: {n} times'), { name: antMissName(k), n: countOf(antMissed[k]) })); }),
            Object.keys(cls).map(function (k) { var parts = k.split('as'); return h('li', { key: 'c' + k }, fmt(t('stem.cellular.teacher_missed_cls', 'Called a Class {a} rule Class {b}: {n} times'), { a: parts[1], b: parts[0], n: cls[k] })); })) :
            h('p', { style: { margin: 0, fontSize: '12px', color: C.sub } }, t('stem.cellular.teacher_no_missed', 'No missed items yet.'))),
        h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } },
          h('h3', { style: { margin: '0 0 6px', fontSize: '14px', color: C.text } }, t('stem.cellular.teacher_reset_title', 'Start fresh')),
          !resetAsk ? btn(t('stem.cellular.btn_reset', 'Clear saved work on this device'), function () { setResetAsk(true); }, { key: 'reset' }) :
            h('div', { role: 'group', 'aria-label': t('stem.cellular.reset_confirm_group', 'Confirm clearing saved work'), style: { display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' } },
              h('span', { style: { fontSize: '12px', color: C.text, fontWeight: 700 } }, t('stem.cellular.reset_confirm_b', 'Clear the run log, cards, investigations, missions, practice stats and More worlds progress? XP already earned stays, and cannot be earned twice.')),
              btn(t('stem.cellular.btn_yes_clear', 'Yes, clear'), function () { patchSaved(function () { return { runLog: [], pce: {}, cer: {}, missions: {}, practice: {}, challengesDone: {}, glider: {}, ant: {}, ruleHunt: {}, worlds: {}, notice: {} }; }); setResetAsk(false); announce(t('stem.cellular.sr_reset_done', 'Saved work cleared.')); }, { key: 'yes' }),
              btn(t('stem.cellular.btn_cancel', 'Cancel'), function () { setResetAsk(false); }, { key: 'no' })))
      );
    }

    // ════════════════════ MORE WORLDS (stage B) ════════════════════
    // Rule families (Life, Seeds, Brian's Brain or any B/S/C rule) on a Moore
    // or von Neumann neighbourhood, Langton's ant, and a rule hunt (9-12).
    var FAM_SIZE = 48, FAM_PX = 10;
    function plainObj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    function countOf(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.floor(v) : 0; }
    var worldsSaved = plainObj(saved.worlds), antSaved = plainObj(saved.ant), huntSaved = plainObj(saved.ruleHunt), gliderSaved = plainObj(saved.glider);
    var huntFound = (Array.isArray(huntSaved.found) ? huntSaved.found : []).filter(function (f) { return f && typeof f === 'object' && typeof f.rule === 'string' && isFinite(f.p) && isFinite(f.dr) && isFinite(f.dc); });
    var sWorldView = useState('family'); var worldView = sWorldView[0], setWorldView = sWorldView[1];
    var sFam = useState({ preset: 'brain', birth: '2', survive: '', states: 3, nb: 'moore' }); var fam = sFam[0], setFam = sFam[1];
    var famR = famRule(fam.birth, fam.survive, fam.states, fam.nb), famName = famRuleName(famR);
    var famRef = useRef(famR); famRef.current = famR;
    var sFamSeed = useState(1); var famSeed = sFamSeed[0], setFamSeed = sFamSeed[1];
    var sFamCells = useState(function () { return famSoup(FAM_SIZE, FAM_SIZE, 8, 0.5, 1); }); var famCells = sFamCells[0], setFamCells = sFamCells[1];
    var famCellsRef = useRef(famCells); famCellsRef.current = famCells;
    var sFamGen = useState(0); var famGen = sFamGen[0], setFamGen = sFamGen[1];
    var sFamRun = useState(false); var famRunning = sFamRun[0], setFamRunning = sFamRun[1];
    var sFamCursor = useState([24, 24]); var famCursor = sFamCursor[0], setFamCursor = sFamCursor[1];
    var sFamPred = useState({}); var famPred = sFamPred[0], setFamPred = sFamPred[1];
    var sFamResult = useState(null); var famResult = sFamResult[0], setFamResult = sFamResult[1];
    var famSvgRef = useRef(null);
    // Run loop: a timeout chain that re-reads reduced motion every frame.
    useEffect(function () {
      if (!famRunning) return undefined;
      var id = null, alive = true;
      function tick() {
        if (!alive) return;
        var next = famStep(famCellsRef.current, FAM_SIZE, FAM_SIZE, famRef.current, true), ct = famCounts(next);
        famCellsRef.current = next; setFamCells(next); setFamGen(function (g) { return g + 1; });
        if (!ct.alive && !ct.dying) { setFamRunning(false); announce(t('stem.cellular.sr_all_died_paused', 'All cells died. Paused.')); return; }
        id = setTimeout(tick, prefersReducedMotion() ? 1000 : 110);
      }
      id = setTimeout(tick, prefersReducedMotion() ? 1000 : 110);
      return function () { alive = false; if (id != null) clearTimeout(id); };
    }, [famRunning]);
    // Optional sonification: one note per generation change (Run, Step or
    // Jump), pitch rising with the number of live cells. Off by default.
    var sFamSound = useState(false); var famSound = sFamSound[0], setFamSound = sFamSound[1];
    useEffect(function () {
      if (!famSound || famGen === 0) return;
      playPopTone(famCounts(famCellsRef.current).alive, FAM_SIZE * FAM_SIZE, 0.09);
    }, [famGen]);
    function presetName(id) {
      if (id === 'life') return t('stem.cellular.fam_life', 'Conway’s Life');
      if (id === 'seeds') return t('stem.cellular.fam_seeds', 'Seeds');
      if (id === 'brain') return t('stem.cellular.fam_brain', 'Brian’s Brain');
      return t('stem.cellular.fam_custom', 'My rule');
    }
    function presetBlurb(id) {
      if (id === 'life') return t('stem.cellular.fam_life_blurb', 'B3/S23: born with exactly 3 live neighbours, survives with 2 or 3.');
      if (id === 'seeds') return t('stem.cellular.fam_seeds_blurb', 'B2/S: a cell is born with exactly 2 live neighbours, and no cell ever survives to the next generation.');
      if (id === 'brain') return t('stem.cellular.fam_brain_blurb', 'B2/S/C3: like Seeds, but a cell that was alive spends one generation dying before it is empty. Dying cells do not count as live neighbours.');
      return t('stem.cellular.fam_custom_blurb', 'Your own rule: choose the birth and survival numbers below.');
    }
    function isPresetRule(rule) { return FAMILY_ORDER.some(function (id) { var p = FAMILY_PRESETS[id]; return rule.birth === p.birth && rule.survive === p.survive && rule.states === p.states; }); }
    function famChange(patch) { setFamResult(null); setFamPred({}); setFam(function (f) { return Object.assign({}, f, patch); }); }
    function famPreset(id) {
      var p = FAMILY_PRESETS[id]; famChange({ preset: id, birth: p.birth, survive: p.survive, states: p.states });
      announce(fmt(t('stem.cellular.sr_fam_preset', '{name} chosen: rule {rule}.'), { name: presetName(id), rule: famRuleName(famRule(p.birth, p.survive, p.states, fam.nb)) }));
    }
    function famToggleDigit(kind, d) {
      var str = kind === 'b' ? fam.birth : fam.survive, has = str.indexOf(String(d)) !== -1, patch = { preset: 'custom' };
      patch[kind === 'b' ? 'birth' : 'survive'] = has ? str.replace(String(d), '') : str + d;
      famChange(patch);
      var rule = famRule(kind === 'b' ? patch.birth : fam.birth, kind === 'b' ? fam.survive : patch.survive, fam.states, fam.nb);
      announce(fmt(t('stem.cellular.sr_fam_rule', 'Rule is now {rule}.'), { rule: famRuleName(rule) }));
    }
    function famSetNb(nb) {
      if (nb === fam.nb) return;
      famChange({ nb: nb });
      announce(nb === 'vn' ? t('stem.cellular.sr_nb_vn', 'Von Neumann neighbourhood: each cell counts the 4 cells that share a side.') : t('stem.cellular.sr_nb_moore', 'Moore neighbourhood: each cell counts all 8 cells around it.'));
    }
    function famLoadSeed(seed) {
      var s = normSeed(seed), c = famSoup(FAM_SIZE, FAM_SIZE, 8, 0.5, s);
      setFamSeed(s); famCellsRef.current = c; setFamCells(c); setFamGen(0); setFamRunning(false);
      return s;
    }
    function famNewPatch() { var s = famLoadSeed(freshSeed()); announce(fmt(t('stem.cellular.sr_fam_patch', 'New random 8 × 8 patch, seed {seed}.'), { seed: s })); }
    function famClear() { var c = new Uint8Array(FAM_SIZE * FAM_SIZE); famCellsRef.current = c; setFamCells(c); setFamGen(0); setFamRunning(false); announce(t('stem.cellular.sr_cleared', 'Grid cleared.')); }
    function famWords(cells, g) {
      var ct = famCounts(cells);
      return famR.states > 2 ? fmt(t('stem.cellular.fam_words_dying', 'Generation {g}: {a} alive cells and {d} dying cells.'), { g: g, a: ct.alive, d: ct.dying }) : fmt(t('stem.cellular.fam_words', 'Generation {g}: {a} alive cells.'), { g: g, a: ct.alive });
    }
    function famAdvance(n) {
      var cur = famCellsRef.current;
      for (var i = 0; i < n; i++) cur = famStep(cur, FAM_SIZE, FAM_SIZE, famR, true);
      famCellsRef.current = cur; setFamCells(cur); setFamGen(famGen + n);
      announce(famWords(cur, famGen + n));
    }
    function famNeighbours(r, c) {
      var n = 0, offs = fam.nb === 'vn' ? NB_VN : NB_MOORE;
      offs.forEach(function (o) { var rr = (r + o[0] + FAM_SIZE) % FAM_SIZE, cc = (c + o[1] + FAM_SIZE) % FAM_SIZE; if (famCells[rr * FAM_SIZE + cc] === 1) n++; });
      return n;
    }
    function famCellWords(r, c) {
      var s = famCells[r * FAM_SIZE + c], v = { row: r + 1, col: c + 1, n: famNeighbours(r, c) };
      if (s === 1) return fmt(t('stem.cellular.fam_cell_alive', 'Row {row}, column {col}: alive, {n} live neighbours.'), v);
      if (s >= 2) return fmt(t('stem.cellular.fam_cell_dying', 'Row {row}, column {col}: dying, {n} live neighbours.'), v);
      return fmt(t('stem.cellular.fam_cell_empty', 'Row {row}, column {col}: empty, {n} live neighbours.'), v);
    }
    function famSetCell(r, c, v) {
      var next = Uint8Array.from(famCellsRef.current); next[r * FAM_SIZE + c] = v;
      famCellsRef.current = next; setFamCells(next);
    }
    function onFamKeyDown(e) {
      var r = famCursor[0], c = famCursor[1], handled = true, moved = true, last = FAM_SIZE - 1;
      if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
      else if (e.key === 'ArrowDown') r = Math.min(last, r + 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight') c = Math.min(last, c + 1);
      else if (e.key === 'PageUp') r = Math.max(0, r - 5);
      else if (e.key === 'PageDown') r = Math.min(last, r + 5);
      else if (e.key === 'Home') { c = 0; if (e.ctrlKey) r = 0; }
      else if (e.key === 'End') { c = last; if (e.ctrlKey) r = last; }
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'Delete' || e.key === 'Backspace') {
        moved = false;
        var nv = (e.key === 'Delete' || e.key === 'Backspace') ? 0 : (famCells[r * FAM_SIZE + c] ? 0 : 1);
        famSetCell(r, c, nv);
        announce(fmt(nv ? t('stem.cellular.sr_cell_now_alive', 'Row {row}, column {col} is now alive.') : t('stem.cellular.sr_cell_now_empty', 'Row {row}, column {col} is now empty.'), { row: r + 1, col: c + 1 }));
      } else { handled = false; moved = false; }
      if (handled && e.preventDefault) e.preventDefault();
      if (moved) { setFamCursor([r, c]); announce(famCellWords(r, c)); }
    }
    function onFamClick(e) {
      var svg = famSvgRef.current; if (!svg || !svg.getBoundingClientRect) return;
      var rect = svg.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      var c = Math.floor((e.clientX - rect.left) / rect.width * FAM_SIZE), r = Math.floor((e.clientY - rect.top) / rect.height * FAM_SIZE);
      if (r < 0 || r >= FAM_SIZE || c < 0 || c >= FAM_SIZE) return;
      setFamCursor([r, c]); famSetCell(r, c, famCells[r * FAM_SIZE + c] ? 0 : 1);
    }
    var FAM_COLOURS = contrast ? ['', dark ? '#ffffff' : '#ffffff', '#fde047', '#fb923c', '#f472b6'] : ['', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
    function renderFamBoard() {
      var W = FAM_SIZE * FAM_PX, paths = {}, side = FAM_PX - 1;
      for (var i = 0; i < famCells.length; i++) { var s = famCells[i]; if (!s) continue; var x = (i % FAM_SIZE) * FAM_PX + 0.5, y = Math.floor(i / FAM_SIZE) * FAM_PX + 0.5; paths[s] = (paths[s] || '') + 'M' + x + ' ' + y + 'h' + side + 'v' + side + 'h-' + side + 'z'; }
      var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: W, fill: '#020617' })];
      Object.keys(paths).forEach(function (k) { kids.push(h('path', { key: 's' + k, 'data-fam-state': k, d: paths[k], fill: FAM_COLOURS[Math.min(4, Number(k))] })); });
      kids.push(h('rect', { key: 'cursor', x: famCursor[1] * FAM_PX, y: famCursor[0] * FAM_PX, width: FAM_PX, height: FAM_PX, fill: 'none', stroke: C.cursor, strokeWidth: 2, pointerEvents: 'none' }));
      var activeId = 'cell-fam-active-cell';
      return h('div', { style: { maxWidth: '480px', width: '100%' } },
        h('div', { role: 'grid', tabIndex: 0, 'data-fam-grid': 'true', 'aria-label': fmt(t('stem.cellular.fam_grid_label', 'Rule-family grid, {n} by {n}, edges wrap. Arrow keys move the cursor; Space toggles a cell.'), { n: FAM_SIZE }), 'aria-describedby': 'cell-fam-desc', 'aria-rowcount': FAM_SIZE, 'aria-colcount': FAM_SIZE, 'aria-activedescendant': activeId, onKeyDown: onFamKeyDown, style: { width: '100%', borderRadius: '12px' } },
          h('svg', { ref: famSvgRef, viewBox: '0 0 ' + W + ' ' + W, width: '100%', 'aria-hidden': 'true', focusable: 'false', onClick: onFamClick, style: { display: 'block', width: '100%', height: 'auto', borderRadius: '12px', border: '1px solid ' + C.border, cursor: 'crosshair' } }, kids),
          h('div', { role: 'row', 'aria-rowindex': famCursor[0] + 1, style: SR_ONLY },
            h('div', { role: 'gridcell', id: activeId, 'aria-colindex': famCursor[1] + 1, 'aria-selected': 'true' }, famCellWords(famCursor[0], famCursor[1])))),
        h('p', { id: 'cell-fam-desc', style: { margin: '6px 0 0', fontSize: '12px', color: C.text } }, famWords(famCells, famGen) + ' ' + fmt(t('stem.cellular.fam_desc_rule', 'Rule {rule}, edges wrap.'), { rule: famName })));
    }
    function nbDiagram(nb) {
      var cells = [];
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
        var centre = r === 1 && c === 1, counted = !centre && (nb === 'moore' || r === 1 || c === 1);
        cells.push(h('rect', { key: r + '_' + c, x: c * 9 + 1, y: r * 9 + 1, width: 8, height: 8, rx: 1, fill: centre ? (dark ? '#f8fafc' : '#0f172a') : counted ? (dark ? '#34d399' : '#047857') : 'none', stroke: dark ? '#94a3b8' : '#475569', strokeWidth: 0.8 }));
      }
      return h('svg', { viewBox: '0 0 28 28', width: 28, height: 28, 'aria-hidden': 'true', focusable: 'false', style: { flex: '0 0 auto' } }, cells);
    }
    function outcomeName(o) {
      switch (o) {
        case 'dies': return t('stem.cellular.out_dies', 'Dies out');
        case 'settles': return t('stem.cellular.out_settles', 'Settles (still or repeating)');
        case 'spaceship': return t('stem.cellular.out_spaceship', 'Makes a spaceship');
        case 'explodes': return t('stem.cellular.out_explodes', 'Explodes (spreads through the world)');
        default: return t('stem.cellular.out_chaotic', 'Keeps changing with no repeat');
      }
    }
    function outcomeTop(o, n, of) {
      var v = { n: n, total: of };
      switch (o) {
        case 'dies': return fmt(t('stem.cellular.top_dies', 'Most patches died out ({n} of {total}).'), v);
        case 'settles': return fmt(t('stem.cellular.top_settles', 'Most patches settled into still or repeating shapes ({n} of {total}).'), v);
        case 'spaceship': return fmt(t('stem.cellular.top_spaceship', 'Most patches made a spaceship ({n} of {total}).'), v);
        case 'explodes': return fmt(t('stem.cellular.top_explodes', 'Most patches exploded through the world ({n} of {total}).'), v);
        default: return fmt(t('stem.cellular.top_chaotic', 'Most patches kept changing with no repeat ({n} of {total}).'), v);
      }
    }
    function shipWords(ship) {
      var ar = Math.abs(ship.dr), ac = Math.abs(ship.dc), v = { n: ship.cells, d: Math.max(ar, ac), p: ship.period, dr: ar, dc: ac };
      if (!ar || !ac) return fmt(t('stem.cellular.ship_orth', 'A {n}-cell spaceship moving straight, {d} cells every {p} generations.'), v);
      if (ar === ac) return fmt(t('stem.cellular.ship_diag', 'A {n}-cell spaceship moving diagonally, {d} cells every {p} generations.'), v);
      return fmt(t('stem.cellular.ship_oblique', 'A {n}-cell spaceship moving at a slant, {dr} rows and {dc} columns every {p} generations.'), v);
    }
    function runDetail(run) {
      if (run.outcome === 'dies') return fmt(t('stem.cellular.run_dies', 'Gone by generation {g}.'), { g: run.gen });
      if (run.outcome === 'spaceship') return shipWords(run.ship);
      if (run.outcome === 'settles') return run.period === 1 ? fmt(t('stem.cellular.run_still', 'Still from generation {g}.'), { g: run.gen }) : fmt(t('stem.cellular.run_cycle', 'Repeats every {p} generations from generation {g}.'), { p: run.period, g: run.gen });
      if (run.outcome === 'explodes') return fmt(t('stem.cellular.run_explodes', '{n} cells by generation {g}.'), { n: run.endAlive + run.endDying, g: run.gen });
      return fmt(t('stem.cellular.run_chaotic', '{n} cells and no repeat by generation {g}.'), { n: run.endAlive + run.endDying, g: run.gen });
    }
    // Named-misconception feedback built from the rule itself, never from a key.
    function famWhy(pick, top, rule) {
      if (pick === top) return '';
      if (pick === 'dies' && !rule.survive) return t('stem.cellular.why_nosurvive', 'Misconception: “no survival means it dies out.” Births can keep a pattern going even when no cell survives: new cells are born next to the old ones.');
      if ((pick === 'settles' || pick === 'dies') && top === 'explodes' && (rule.B[1] || rule.B[2])) return t('stem.cellular.why_lowbirth', 'A low birth number (B1 or B2) makes births easy: almost any empty cell beside the patch is born, so it spreads.');
      if (pick === 'explodes' && rule.nb === 'vn') return t('stem.cellular.why_vn', 'With only 4 neighbours each cell sees fewer live cells, so birth numbers are harder to reach and growth is harder.');
      if (pick === 'spaceship') return t('stem.cellular.why_ship', 'A spaceship needs a shape that rebuilds itself one step over. Most rules do not have one that a random patch finds.');
      if (top === 'spaceship') return t('stem.cellular.why_found_ship', 'Look at the table: some patches broke up into small shapes that kept their form and travelled. That is a spaceship.');
      return t('stem.cellular.why_table', 'Look at the table to see what each patch did.');
    }
    function recordDiscovery(rule, run) {
      var name = famRuleName(rule);
      patchSaved(function (s) {
        var hs = plainObj(s.ruleHunt), found = Array.isArray(hs.found) ? hs.found.filter(function (f) { return f && typeof f === 'object' && typeof f.rule === 'string'; }) : [];
        if (found.some(function (f) { return f.rule === name; })) return null;
        found = found.concat([{ rule: name, birth: rule.birth, survive: rule.survive, states: rule.states, nb: rule.nb, seed: run.seed, dr: run.ship.dr, dc: run.ship.dc, p: run.ship.period, n: run.ship.cells }]).slice(-24);
        return { ruleHunt: Object.assign({}, hs, { found: found }) };
      });
      // XP only for a rule the student made or found (not a ready-made preset).
      if (!isPresetRule(rule)) awardOnce('rulehunt_first', 'cellularLab_hunt', 15, t('stem.cellular.xp_hunt', 'Cellular Automaton Lab: found and measured a spaceship in a new rule'));
    }
    function lockFamPred() {
      if (!famPred.pick) return;
      setFamPred({ pick: famPred.pick, locked: true });
      announce(t('stem.cellular.sr_pred_locked', 'Prediction locked. Now measure.'));
    }
    function runFamMeasure() {
      if (!famPred.locked) return;
      var seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], m = famMeasureMany(famR, seeds), correct = m.tally[famPred.pick] === m.tally[m.top];
      setFamResult({ m: m, rule: famName, pick: famPred.pick, correct: correct });
      patchSaved(function (s) { var w = Object.assign({}, plainObj(s.worlds)); w.predicted = countOf(w.predicted) + 1; if (correct) w.predictedRight = countOf(w.predictedRight) + 1; return { worlds: w }; });
      if (m.ship) recordDiscovery(famR, m.ship);
      announce((correct ? t('stem.cellular.pred_match', 'Your prediction matches the measurement.') : t('stem.cellular.pred_nomatch', 'Your prediction does not match the measurement.')) + ' ' + outcomeTop(m.top, m.tally[m.top], seeds.length));
    }
    function watchSeed(rule, seed) {
      setFam({ preset: isPresetRule(rule) && FAMILY_ORDER.filter(function (id) { var p = FAMILY_PRESETS[id]; return rule.birth === p.birth && rule.survive === p.survive && rule.states === p.states; })[0] || 'custom', birth: rule.birth, survive: rule.survive, states: rule.states, nb: rule.nb });
      famRef.current = famRule(rule.birth, rule.survive, rule.states, rule.nb);
      setFamResult(null); setFamPred({});
      var s = famLoadSeed(seed); setWorldView('family');
      announce(fmt(t('stem.cellular.sr_watch', 'Loaded rule {rule} with patch {seed}. Press Run to watch.'), { rule: famRuleName(famRef.current), seed: s }));
    }
    function digitBtn(kind, d) {
      var on = (kind === 'b' ? famR.B : famR.S)[d] === 1, off = d > famR.max;
      return h('button', { key: kind + d, type: 'button', onClick: function () { famToggleDigit(kind, d); }, disabled: off, 'aria-pressed': on ? 'true' : 'false',
        'aria-label': fmt(kind === 'b' ? t('stem.cellular.digit_b_aria', 'Born with {n} live neighbours') : t('stem.cellular.digit_s_aria', 'Survives with {n} live neighbours'), { n: d }),
        style: { minWidth: '32px', minHeight: '32px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: off ? 'not-allowed' : 'pointer', opacity: off ? 0.4 : 1, border: '1px solid ' + (on ? '#047857' : C.border), background: on ? '#047857' : C.panel, color: on ? '#ffffff' : C.text } }, String(d));
    }
    function renderFamily() {
      var ct = famCounts(famCells), selStyle = { padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text };
      var res = famResult && famResult.rule === famName ? famResult : null;
      var legend = [[1, t('stem.cellular.fam_alive', 'alive')]];
      for (var st = 2; st < famR.states; st++) legend.push([st, famR.states > 3 ? fmt(t('stem.cellular.fam_dying_n', 'dying, step {n}'), { n: st - 1 }) : t('stem.cellular.fam_dying', 'dying')]);
      var b = [], s = [];
      for (var d = 1; d <= 8; d++) b.push(digitBtn('b', d));
      for (var e = 0; e <= 8; e++) s.push(digitBtn('s', e));
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('div', { role: 'group', 'aria-label': t('stem.cellular.fam_presets', 'Rule families'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          FAMILY_ORDER.map(function (id) { return btn(presetName(id), function () { famPreset(id); }, { key: 'fp' + id, pressed: fam.preset === id }); })),
        h('p', { style: { margin: 0, fontSize: '12px', color: C.text, lineHeight: 1.5 } }, h('strong', null, presetName(fam.preset) + ' · ' + famName + ' '), presetBlurb(fam.preset)),
        h('fieldset', { style: { border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 10px', margin: 0 } },
          h('legend', { style: { fontSize: '12px', fontWeight: 800, color: C.text, padding: '0 4px' } }, t('stem.cellular.nb_legend', 'Neighbourhood: which cells count as neighbours?')),
          [['moore', t('stem.cellular.nb_moore', 'Moore: all 8 cells around')], ['vn', t('stem.cellular.nb_vn', 'Von Neumann: the 4 cells that share a side')]].map(function (o) {
            return h('label', { key: o[0], style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '32px' } },
              h('input', { type: 'radio', name: 'cell-fam-nb', value: o[0], checked: fam.nb === o[0], onChange: function () { famSetNb(o[0]); }, style: { width: '18px', height: '18px' } }), nbDiagram(o[0]), o[1]);
          }),
          fam.nb === 'vn' && h('p', { style: { margin: '4px 0 0', fontSize: '11px', color: C.sub } }, t('stem.cellular.nb_vn_note', 'With 4 neighbours a cell can never have more than 4 live neighbours, so the numbers 5 to 8 switch off.'))),
        // K-5 explores the three ready-made families; the rule editor is for grade 6 up.
        band !== 'k5' && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('div', { role: 'group', 'aria-label': t('stem.cellular.digits_b_group', 'Birth numbers'), style: { display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { fontSize: '12px', fontWeight: 800, color: C.text, minWidth: '72px' } }, t('stem.cellular.digits_b', 'Born (B):')), b),
          h('div', { role: 'group', 'aria-label': t('stem.cellular.digits_s_group', 'Survival numbers'), style: { display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' } }, h('span', { style: { fontSize: '12px', fontWeight: 800, color: C.text, minWidth: '72px' } }, t('stem.cellular.digits_s', 'Survives (S):')), s),
          h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', fontWeight: 800, color: C.text, flexWrap: 'wrap' } }, t('stem.cellular.states_label', 'Cell states'),
            h('select', { value: String(famR.states), onChange: function (ev) { famChange({ preset: 'custom', states: parseInt(ev.target.value, 10) || 2 }); }, style: selStyle },
              h('option', { value: '2' }, t('stem.cellular.states_2', '2: alive or empty')), h('option', { value: '3' }, t('stem.cellular.states_3', '3: alive, dying, empty')), h('option', { value: '4' }, t('stem.cellular.states_4', '4: alive, two dying steps, empty')), h('option', { value: '5' }, t('stem.cellular.states_5', '5: alive, three dying steps, empty')))),
          h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.b0_note', 'B0 is left out: it would make every empty cell in the world come alive at once.'))),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } },
          statChip(t('stem.cellular.stat_generation', 'Generation'), famGen, '#10b981'), statChip(t('stem.cellular.fam_alive_chip', 'Alive'), ct.alive, '#22d3ee'), famR.states > 2 && statChip(t('stem.cellular.fam_dying_chip', 'Dying'), ct.dying, '#60a5fa'), statChip(t('stem.cellular.stat_rule', 'Rule'), famName, '#a78bfa')),
        renderFamBoard(),
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: C.text } }, legend.map(function (l) { return h('span', { key: l[0], style: { display: 'inline-flex', gap: '4px', alignItems: 'center' } }, h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '2px', background: FAM_COLOURS[Math.min(4, l[0])], border: '1px solid #020617' } }), l[1]); })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(famRunning ? t('stem.cellular.btn_pause', 'Pause') : t('stem.cellular.btn_run', 'Run'), function () { setFamRunning(!famRunning); }, { key: 'frun', primary: true }),
          btn(t('stem.cellular.btn_step', 'Step'), function () { famAdvance(1); }, { key: 'fstep', disabled: famRunning }),
          btn(t('stem.cellular.btn_jump10', 'Jump +10'), function () { famAdvance(10); }, { key: 'fj10', disabled: famRunning, ariaLabel: t('stem.cellular.btn_jump10_aria', 'Jump ahead 10 generations instantly') }),
          btn(t('stem.cellular.btn_fam_patch', 'New random patch'), famNewPatch, { key: 'fpatch' }),
          btn(t('stem.cellular.btn_fam_reload', 'Restart this patch'), function () { famLoadSeed(famSeed); announce(fmt(t('stem.cellular.sr_fam_restart', 'Patch {seed} restarted at generation 0.'), { seed: famSeed })); }, { key: 'freload' }),
          btn(t('stem.cellular.btn_clear', 'Clear'), famClear, { key: 'fclear' }),
          soundToggle('fam', famSound, function (on) { setFamSound(on); if (on) playPopTone(ct.alive, FAM_SIZE * FAM_SIZE, 0.12); })),
        famSound && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.fam_sound_note', 'Sound is on: each generation plays a note. Higher notes mean more live cells; a steady note means the population has settled.')),
        reducedMotion && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.fam_reduced', 'Reduced motion is on: Run shows one generation per second.')),
        // Predict, then measure: ten seeded patches, each classified by running it.
        h('section', { 'data-fam-predict': 'true', style: { background: C.bg, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' } },
          h('h4', { style: { margin: '0 0 4px', fontSize: '13px', color: C.text } }, t('stem.cellular.fam_pred_title', 'Predict, then measure')),
          h('p', { style: { margin: '0 0 6px', fontSize: '12px', color: C.sub } }, fmt(t('stem.cellular.fam_pred_intro', 'What will rule {rule} do to a small random patch (8 × 8, half alive) in the middle of an empty world? Commit first; the lab then runs 10 patches and classifies each one.'), { rule: famName })),
          h('fieldset', { style: { border: 'none', margin: 0, padding: 0 } }, h('legend', { style: SR_ONLY }, t('stem.cellular.fam_pred_legend', 'Your prediction')),
            FAM_OUTCOMES.map(function (o) { return h('label', { key: o, style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'radio', name: 'cell-fam-pred', value: o, checked: famPred.pick === o, disabled: !!famPred.locked, onChange: function () { setFamPred({ pick: o }); }, style: { width: '18px', height: '18px' } }), outcomeName(o)); })),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' } },
            !famPred.locked && btn(t('stem.cellular.btn_lock', 'Lock in my prediction'), lockFamPred, { key: 'flock', primary: true, disabled: !famPred.pick }),
            famPred.locked && !res && btn(t('stem.cellular.btn_measure10', 'Measure 10 patches'), runFamMeasure, { key: 'fmeasure', primary: true }),
            res && btn(t('stem.cellular.btn_predict_again', 'Predict another rule'), function () { setFamPred({}); setFamResult(null); }, { key: 'fagain' })),
          res && h('div', { role: 'status', style: { marginTop: '8px', padding: '9px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: statusTone(res.correct).background, color: statusTone(res.correct).color, border: statusTone(res.correct).border } },
            (res.correct ? t('stem.cellular.pred_match', 'Your prediction matches the measurement.') : t('stem.cellular.pred_nomatch', 'Your prediction does not match the measurement.')) + ' ' + outcomeTop(res.m.top, res.m.tally[res.m.top], res.m.runs.length) + (famWhy(res.pick, res.m.top, famR) ? ' ' + famWhy(res.pick, res.m.top, famR) : '')),
          res && h('div', { style: { overflowX: 'auto' } }, h('table', { style: { borderCollapse: 'collapse', fontSize: '11px', color: C.text, marginTop: '8px', width: '100%' } },
            h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px' } }, fmt(t('stem.cellular.fam_table_caption', 'Ten patches under rule {rule}'), { rule: res.rule })),
            h('thead', null, h('tr', null, [t('stem.cellular.col_patch', 'Patch'), t('stem.cellular.col_result', 'Result'), t('stem.cellular.col_detail', 'Detail'), t('stem.cellular.col_watch', 'Watch')].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid ' + C.border } }, x); }))),
            h('tbody', null, res.m.runs.map(function (run) { return h('tr', { key: run.seed }, h('td', { style: { padding: '3px 6px' } }, String(run.seed)), h('td', { style: { padding: '3px 6px' } }, outcomeName(run.outcome)), h('td', { style: { padding: '3px 6px' } }, runDetail(run)), h('td', { style: { padding: '3px 6px' } }, btn(t('stem.cellular.btn_watch', 'Watch'), function () { watchSeed(famR, run.seed); }, { key: 'w' + run.seed, ariaLabel: fmt(t('stem.cellular.btn_watch_aria', 'Watch patch {seed} on the grid'), { seed: run.seed }) }))); }))))),
        crossLink('epidemicSim', t('stem.cellular.link_epidemic', 'Epidemic Simulator'), t('stem.cellular.link_brain_why', 'Brian’s Brain cells go alive, then dying, then empty, like infected, recovering and susceptible people.'))
      );
    }

    // ── Langton's ant ──
    var antRef = useRef(null); if (!antRef.current) antRef.current = antInit();
    var sAntTick = useState(0); var setAntTick = sAntTick[1];
    var sAntRun = useState(false); var antRunning = sAntRun[0], setAntRunning = sAntRun[1];
    var sAntLog = useState([]); var antLog = sAntLog[0], setAntLog = sAntLog[1];
    var sAntPick = useState(''); var antPick = sAntPick[0], setAntPick = sAntPick[1];
    var sAntExplain = useState(''); var antExplain = sAntExplain[0], setAntExplain = sAntExplain[1];
    var sAntProb = useState(null); var antProb = sAntProb[0], setAntProb = sAntProb[1];
    var sAntAns = useState({ col: '', row: '' }); var antAns = sAntAns[0], setAntAns = sAntAns[1];
    var sAntTry = useState({ tries: 0, hint: 0, status: 'open', msg: '' }); var antTry = sAntTry[0], setAntTry = sAntTry[1];
    var sAntSound = useState(false); var antSound = sAntSound[0], setAntSound = sAntSound[1];
    var antSoundRef = useRef(false); antSoundRef.current = antSound;
    var antHw = antHighway();
    // A restored progress-only slice may carry checked without the pick
    // (the autosave keeps flags, not answers): it still counts as locked.
    var antLocked = (antSaved.locked === true && typeof antSaved.pick === 'string') || antSaved.checked === true;
    function antCap() {
      if (!antLocked) return 2000;
      if (antProb && antTry.status === 'open') return antProb.base + 2 * antProb.period;
      return Infinity;
    }
    function antCapWords(cap) { return !antLocked ? fmt(t('stem.cellular.ant_cap_lock', 'Lock in your prediction first: until then the ant stops at step {n}.'), { n: cap }) : fmt(t('stem.cellular.ant_cap_problem', 'While your position prediction is open, the ant stops at step {n}. Use the pattern instead!'), { n: cap }); }
    function antGo(n) {
      var st = antRef.current, cap = antCap(), room = cap - st.step;
      if (room <= 0) { setAntRunning(false); announce(antCapWords(cap)); return false; }
      antAdvance(st, Math.min(n, room)); setAntTick(st.step);
      if (antSoundRef.current) playFreq(antPitch(st), 0.08);
      if (n > room) { setAntRunning(false); announce(antCapWords(cap)); return false; }
      return true;
    }
    useEffect(function () {
      if (!antRunning) return undefined;
      var id = null, alive = true;
      function tick() {
        if (!alive) return;
        var slow = prefersReducedMotion();
        if (!antGo(slow ? 200 : 25)) return;
        id = setTimeout(tick, slow ? 1000 : 50);
      }
      id = setTimeout(tick, prefersReducedMotion() ? 1000 : 50);
      return function () { alive = false; if (id != null) clearTimeout(id); };
    }, [antRunning, antLocked, antProb, antTry.status]);
    useEffect(function () { if (tab !== 'worlds') { setFamRunning(false); setAntRunning(false); } }, [tab]);
    function antDirWord(dir) { return dir === 0 ? t('stem.cellular.ant_up', 'up') : dir === 1 ? t('stem.cellular.ant_right', 'right') : dir === 2 ? t('stem.cellular.ant_down', 'down') : t('stem.cellular.ant_left', 'left'); }
    function antWhere(st) { return fmt(t('stem.cellular.ant_where', 'Step {s}: the ant is at column {c}, row {r} (counted from where it started; right and down are positive), facing {dir}. {b} squares are black.'), { s: st.step, c: st.c, r: st.r, dir: antDirWord(st.dir), b: st.blackCount }); }
    function antHighwayNow(st) { return antHw.onset != null && st.step >= antHw.onset + 2 * antHw.period; }
    function antStepAndLog(n) {
      if (antGo(n)) { var st = antRef.current; setAntLog(antLog.concat([{ step: st.step, c: st.c, r: st.r }]).slice(-12)); announce(antWhere(st)); }
    }
    function antReset() { antRef.current = antInit(); setAntRunning(false); setAntLog([]); setAntTick(0); announce(t('stem.cellular.sr_ant_reset', 'The ant is back at the start on an all-white plane.')); }
    function antLock() {
      if (!antPick) return;
      patchSaved(function (s) { var a = plainObj(s.ant); if (a.locked) return null; return { ant: Object.assign({}, a, { pick: antPick, locked: true }) }; });
      announce(t('stem.cellular.sr_ant_locked', 'Prediction locked. Now run the ant past step 11,000 and check.'));
    }
    function antCheckLong() {
      var st = antRef.current; if (!antLocked || st.step < 11000) return;
      var truth = antHw.onset != null ? 'highway' : 'mess', ok = antSaved.pick === truth;
      patchSaved(function (s) { var a = plainObj(s.ant); return { ant: Object.assign({}, a, { checked: true, correct: ok }) }; });
      announce(ok ? t('stem.cellular.ant_long_ok_sr', 'Your prediction was right.') : t('stem.cellular.ant_long_no_sr', 'Your prediction did not match the run.'));
    }
    function antLongFeedback() {
      var v = { onset: antHw.onset, p: antHw.period };
      var base = fmt(t('stem.cellular.ant_long_truth', 'The run shows it: the ant made a messy, symmetric-then-chaotic blob for {onset} steps, then started a “highway”: the same {p} moves over and over, carrying it 2 squares diagonally each time, forever.'), v);
      if (antSaved.pick === 'highway') return t('stem.cellular.ant_long_ok', 'Right!') + ' ' + base;
      if (typeof antSaved.pick !== 'string') return (antSaved.correct === true ? t('stem.cellular.ant_long_ok', 'Right!') + ' ' : '') + base;
      if (antSaved.pick === 'loop') return t('stem.cellular.ant_mis_loop', 'Misconception: “the ant gets stuck in a loop.” Each visit flips the square, so the ant never sees the same picture twice in the same place.') + ' ' + base;
      return t('stem.cellular.ant_mis_mess', 'Misconception: “a messy start means it stays messy.” Order appeared out of the mess with no change of rule. Scientists call this emergence.') + ' ' + base;
    }
    function antSaveExplain() {
      if (antExplain.trim().length < 20 || !antSaved.checked) return;
      patchSaved(function (s) { var a = plainObj(s.ant); return a.explained ? null : { ant: Object.assign({}, a, { explained: true }) }; });
      awardOnce('ant_longrun', 'cellularLab_ant', 3, t('stem.cellular.xp_ant_long', 'Cellular Automaton Lab: predicted, tested and explained Langton’s ant'));
      announce(t('stem.cellular.sr_explain_saved', 'Explanation saved.'));
    }
    function antNewProblem() {
      var pr = makeAntProblem(freshSeed(), band);
      // Start from a fresh ant so no earlier run or log row shows the answer.
      antRef.current = antInit(); setAntRunning(false); setAntLog([]); setAntTick(0);
      setAntProb(pr); setAntAns({ col: '', row: '' }); setAntTry({ tries: 0, hint: 0, status: 'open', msg: '' });
      announce(fmt(t('stem.cellular.ant_prob_q', 'At step {base} the ant is at column {c}, row {r}. Where will it be at step {target}?'), { base: pr.base, c: pr.baseC, r: pr.baseR, target: pr.target }));
    }
    function antMisText(tag, pr) {
      switch (tag) {
        case 'blank': return t('stem.cellular.ant_mis_blank', 'Type a whole number in both boxes (use a minus sign for left or up).');
        case 'extra': return fmt(t('stem.cellular.ant_mis_extra', 'Close: that is where the ant is after {k} whole periods. There are {x} more steps after that. Use the viewer to see what those first {x} steps of a period do.'), { k: pr.k, x: pr.extra });
        case 'one_period': return t('stem.cellular.ant_mis_one', 'That is only one period of 104 steps. Count how many periods fit between the two steps, then multiply.');
        case 'direction': return t('stem.cellular.ant_mis_dir', 'Right distance, wrong direction. Step 104 once and watch which way the column and row numbers change.');
        case 'no_move': return t('stem.cellular.ant_mis_nomove', 'The ant does not stay still: on the highway it keeps travelling.');
        default: return t('stem.cellular.ant_mis_off', 'Not yet. Find how far the ant moves in one 104-step period, then count the periods.');
      }
    }
    function antCheckProblem() {
      if (!antProb || antTry.status !== 'open') return;
      var g = gradeAntProblem(antProb, String(antAns.col).trim() === '' ? NaN : antAns.col, String(antAns.row).trim() === '' ? NaN : antAns.row);
      if (g.tag === 'blank') { setAntTry(Object.assign({}, antTry, { msg: antMisText('blank', antProb) })); announce(antMisText('blank', antProb)); return; }
      var tries = antTry.tries + 1;
      patchSaved(function (s) { var a = Object.assign({}, plainObj(s.ant)), miss = Object.assign({}, plainObj(a.missed)); a.attempts = countOf(a.attempts) + 1; if (g.correct) a.solved = countOf(a.solved) + 1; else miss[g.tag] = countOf(miss[g.tag]) + 1; a.missed = miss; return { ant: a }; });
      if (g.correct) {
        var msg = fmt(t('stem.cellular.ant_prob_ok', 'Yes! At step {target} the ant is at column {c}, row {r}. The highway let you predict it without running every step.'), { target: antProb.target, c: antProb.c, r: antProb.r });
        setAntTry({ tries: tries, hint: antTry.hint, status: 'solved', msg: msg }); announce(msg);
        if (tries <= 2) awardOnce('ant_' + antProb.seed, 'cellularLab_ant', 3, t('stem.cellular.xp_ant_prob', 'Cellular Automaton Lab: predicted the ant’s position from its highway'));
        return;
      }
      var mis = antMisText(g.tag, antProb);
      setAntTry({ tries: tries, hint: antTry.hint, status: 'open', msg: mis }); announce(mis);
    }
    function antReveal() {
      if (!antProb || antTry.tries < 2 || teacherCfg.noReveal === true) return;
      patchSaved(function (s) { var a = Object.assign({}, plainObj(s.ant)); a.revealed = countOf(a.revealed) + 1; return { ant: a }; });
      var msg = fmt(t('stem.cellular.ant_reveal', 'Answer: column {c}, row {r}. From step {base}, {k} periods move the ant {k} × ({dc}, {dr}); then {x} more steps. No XP for a shown answer.'), { c: antProb.c, r: antProb.r, base: antProb.base, k: antProb.k, dc: antProb.dc, dr: antProb.dr, x: antProb.extra });
      setAntTry(Object.assign({}, antTry, { status: 'revealed', msg: msg })); announce(msg);
    }
    function antHintText(level, pr) {
      if (level === 1) return t('stem.cellular.ant_hint1', 'Hint 1: on the highway the ant repeats the same 104 steps again and again.');
      if (level === 2) return fmt(t('stem.cellular.ant_hint2', 'Hint 2: go to step {base}, press “Step 104” twice and write down the column and row each time. How much do they change per period?'), { base: pr.base });
      return pr.extra ? fmt(t('stem.cellular.ant_hint3x', 'Hint 3: from step {base} to step {target} there are {k} whole periods of 104, plus {x} extra steps.'), { base: pr.base, target: pr.target, k: pr.k, x: pr.extra }) : fmt(t('stem.cellular.ant_hint3', 'Hint 3: from step {base} to step {target} there are {k} whole periods of 104.'), { base: pr.base, target: pr.target, k: pr.k });
    }
    function renderAntView() {
      var st = antRef.current, minR = Math.min(0, st.r), maxR = Math.max(0, st.r), minC = Math.min(0, st.c), maxC = Math.max(0, st.c), d = '';
      Object.keys(st.black).forEach(function (k) { var p = k.split(','), r = +p[0], c = +p[1]; if (r < minR) minR = r; if (r > maxR) maxR = r; if (c < minC) minC = c; if (c > maxC) maxC = c; d += 'M' + c + ' ' + r + 'h1v1h-1z'; });
      var span = Math.max(21, maxR - minR + 5, maxC - minC + 5), x0 = Math.floor((minC + maxC) / 2 - span / 2), y0 = Math.floor((minR + maxR) / 2 - span / 2);
      var ax = st.c + 0.5, ay = st.r + 0.5, tri = st.dir === 0 ? [[0, -0.45], [0.38, 0.35], [-0.38, 0.35]] : st.dir === 1 ? [[0.45, 0], [-0.35, 0.38], [-0.35, -0.38]] : st.dir === 2 ? [[0, 0.45], [-0.38, -0.35], [0.38, -0.35]] : [[-0.45, 0], [0.35, -0.38], [0.35, 0.38]];
      var stroke = Math.max(0.04, span / 300);
      return h('figure', { style: { margin: 0 } },
        h('svg', { viewBox: x0 + ' ' + y0 + ' ' + span + ' ' + span, width: '100%', 'aria-hidden': 'true', focusable: 'false', 'data-ant-view': 'true', style: { display: 'block', maxWidth: '420px', background: '#f8fafc', border: '1px solid ' + C.border, borderRadius: '10px' } },
          h('path', { d: d, fill: '#0f172a' }),
          h('circle', { cx: 0.5, cy: 0.5, r: 0.5, fill: 'none', stroke: '#2563eb', strokeWidth: stroke * 2 }),
          h('polygon', { points: tri.map(function (p) { return (ax + p[0] * Math.max(1, span / 40)) + ',' + (ay + p[1] * Math.max(1, span / 40)); }).join(' '), fill: '#dc2626', stroke: '#ffffff', strokeWidth: stroke })),
        h('figcaption', { style: { fontSize: '12px', color: C.text, marginTop: '4px' } },
          h('span', { 'aria-live': antRunning ? 'off' : 'polite' }, antWhere(st) + ' ' + (antHighwayNow(st) ? fmt(t('stem.cellular.ant_on_highway', 'It is on its highway: every {p} steps it repeats the same moves.'), { p: antHw.period }) : t('stem.cellular.ant_no_highway', 'No repeating pattern yet.'))),
          h('span', { style: { display: 'block', color: C.sub, fontSize: '11px' } }, t('stem.cellular.ant_legend', 'Black squares are black; the red arrow is the ant; the blue ring marks where it started.'))));
    }
    function renderAnt() {
      var st = antRef.current, cap = antCap(), k5 = band === 'k5', opts = [['mess', t('stem.cellular.ant_opt_mess', 'It keeps making a messy blob forever.')], ['highway', t('stem.cellular.ant_opt_highway', 'It builds a straight road and travels away forever.')], ['loop', t('stem.cellular.ant_opt_loop', 'It gets stuck going round a small loop.')]];
      var inputStyle = { width: '80px', padding: '6px 8px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text };
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.text, lineHeight: 1.5 } }, t('stem.cellular.ant_intro', 'Langton’s ant walks on a plane of white squares. On a white square it turns right; on a black square it turns left. Then it flips the colour of the square and steps forward. That is the whole rule.')),
        renderAntView(),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(antRunning ? t('stem.cellular.btn_pause', 'Pause') : t('stem.cellular.btn_run', 'Run'), function () { setAntRunning(!antRunning); }, { key: 'arun', primary: true }),
          btn(t('stem.cellular.btn_step', 'Step'), function () { antStepAndLog(1); }, { key: 'astep', disabled: antRunning }),
          btn(t('stem.cellular.btn_step104', 'Step 104'), function () { antStepAndLog(104); }, { key: 'a104', disabled: antRunning, ariaLabel: t('stem.cellular.btn_step104_aria', 'Move the ant 104 steps at once') }),
          btn(t('stem.cellular.btn_ant1000', 'Jump +1,000'), function () { antStepAndLog(1000); }, { key: 'a1000', disabled: antRunning, ariaLabel: t('stem.cellular.btn_ant1000_aria', 'Move the ant 1,000 steps at once') }),
          antProb && antProb.base > st.step && btn(fmt(t('stem.cellular.btn_ant_goto', 'Go to step {n}'), { n: antProb.base }), function () { antStepAndLog(antProb.base - antRef.current.step); }, { key: 'agoto' }),
          // Only after the long-run prediction is locked: computes every step at once.
          antLocked && !antSaved.checked && st.step < 11000 && btn(t('stem.cellular.btn_ant_11000', 'Jump to step 11,000'), function () { antStepAndLog(11000 - antRef.current.step); }, { key: 'a11000', primary: true, disabled: antRunning, ariaLabel: t('stem.cellular.btn_ant_11000_aria', 'Compute every step up to step 11,000 at once') }),
          btn(t('stem.cellular.btn_ant_reset', 'Reset the ant'), antReset, { key: 'areset' }),
          soundToggle('ant', antSound, function (on) { antSoundRef.current = on; setAntSound(on); if (on) playFreq(antPitch(antRef.current), 0.12); })),
        antSound && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.ant_sound_note', 'Sound is on: each move plays a note. The farther the ant is from where it started, the higher the note. Listen to the wandering phase, then to the highway.')),
        isFinite(cap) && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, antCapWords(cap)),
        reducedMotion && h('p', { style: { margin: 0, fontSize: '11px', color: C.sub } }, t('stem.cellular.ant_reduced', 'Reduced motion is on: Run moves the ant 200 steps each second with no animation in between.')),
        antLog.length > 0 && h('table', { style: { borderCollapse: 'collapse', fontSize: '11px', color: C.text } },
          h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px' } }, t('stem.cellular.ant_log_caption', 'Where the ant was after each button press')),
          h('thead', null, h('tr', null, [t('stem.cellular.ant_col_step', 'Step'), t('stem.cellular.ant_col_col', 'Column'), t('stem.cellular.ant_col_row', 'Row')].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '2px 8px', borderBottom: '1px solid ' + C.border } }, x); }))),
          h('tbody', null, antLog.map(function (row, i) { return h('tr', { key: i + '_' + row.step }, h('td', { style: { padding: '2px 8px' } }, String(row.step)), h('td', { style: { padding: '2px 8px' } }, String(row.c)), h('td', { style: { padding: '2px 8px' } }, String(row.r))); }))),
        // Long-run prediction (every band): commit, run, check.
        h('section', { 'data-ant-predict': 'true', style: { background: C.bg, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' } },
          h('h4', { style: { margin: '0 0 6px', fontSize: '13px', color: C.text } }, t('stem.cellular.ant_long_q', 'Predict: what will the ant be doing after 11,000 steps?')),
          h('fieldset', { style: { border: 'none', margin: 0, padding: 0 } }, h('legend', { style: SR_ONLY }, t('stem.cellular.ant_long_q', 'Predict: what will the ant be doing after 11,000 steps?')),
            opts.map(function (o) { var chosen = antLocked ? antSaved.pick === o[0] : antPick === o[0]; return h('label', { key: o[0], style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'radio', name: 'cell-ant-long', value: o[0], checked: chosen, disabled: antLocked, onChange: function () { setAntPick(o[0]); }, style: { width: '18px', height: '18px' } }), o[1]); })),
          !antLocked && btn(t('stem.cellular.btn_lock', 'Lock in my prediction'), antLock, { key: 'alock', primary: true, disabled: !antPick }),
          antLocked && !antSaved.checked && h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
            btn(t('stem.cellular.btn_ant_check', 'Check my prediction'), antCheckLong, { key: 'acheck', primary: true, disabled: st.step < 11000 }),
            st.step < 11000 && h('span', { style: { fontSize: '11px', color: C.sub } }, fmt(t('stem.cellular.ant_need_steps', 'Run the ant to step 11,000 first (now at step {n}).'), { n: st.step }) + ' ' + t('stem.cellular.ant_jump_note', '“Jump to step 11,000” computes every step at once, so you do not have to wait.'))),
          antSaved.checked && h('div', { role: 'status', style: { marginTop: '6px', padding: '9px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: statusTone(antSaved.correct).background, color: statusTone(antSaved.correct).color, border: statusTone(antSaved.correct).border } }, antLongFeedback()),
          antSaved.checked && !antSaved.explained && h('div', { style: { marginTop: '6px' } },
            h('label', { htmlFor: 'cell-ant-explain', style: { display: 'block', fontSize: '12px', fontWeight: 800, color: C.text, marginBottom: '3px' } }, t('stem.cellular.ant_explain_label', 'In one sentence: how can such a simple rule make a road appear?')),
            h('textarea', { id: 'cell-ant-explain', rows: 2, value: antExplain, onChange: function (e) { setAntExplain(String(e.target.value).slice(0, 600)); }, style: { width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '12px' } }),
            btn(t('stem.cellular.btn_save_explain', 'Save my explanation'), antSaveExplain, { key: 'aexp', disabled: antExplain.trim().length < 20 })),
          antSaved.explained && h('p', { style: { margin: '6px 0 0', fontSize: '12px', color: C.text } }, t('stem.cellular.ant_explained', 'Explanation saved. ✓'))),
        // Highway position predictions (grades 6 and up), generated without end.
        !k5 && antSaved.checked && h('section', { 'data-ant-problem': 'true', style: { background: C.bg, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' } },
          h('h4', { style: { margin: '0 0 6px', fontSize: '13px', color: C.text } }, t('stem.cellular.ant_prob_title', 'Use the highway to predict')),
          !antProb ? btn(t('stem.cellular.btn_ant_problem', 'Give me a position to predict'), antNewProblem, { key: 'anew', primary: true }) :
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('p', { id: 'cell-ant-q', style: { margin: 0, fontSize: '12px', fontWeight: 800, color: C.text } }, fmt(t('stem.cellular.ant_prob_q', 'At step {base} the ant is at column {c}, row {r}. Where will it be at step {target}?'), { base: antProb.base, c: antProb.baseC, r: antProb.baseR, target: antProb.target })),
              h('div', { role: 'group', 'aria-labelledby': 'cell-ant-q', style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } },
                h('label', { style: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', color: C.text, fontWeight: 700 } }, t('stem.cellular.ant_col_label', 'Column (right is +)'), h('input', { type: 'text', inputMode: 'numeric', value: antAns.col, disabled: antTry.status !== 'open', onChange: function (e) { setAntAns({ col: String(e.target.value).replace(/[^0-9\-]/g, '').slice(0, 6), row: antAns.row }); }, style: inputStyle })),
                h('label', { style: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', color: C.text, fontWeight: 700 } }, t('stem.cellular.ant_row_label', 'Row (down is +)'), h('input', { type: 'text', inputMode: 'numeric', value: antAns.row, disabled: antTry.status !== 'open', onChange: function (e) { setAntAns({ col: antAns.col, row: String(e.target.value).replace(/[^0-9\-]/g, '').slice(0, 6) }); }, style: inputStyle })),
                antTry.status === 'open' && btn(t('stem.cellular.btn_check', 'Check'), antCheckProblem, { key: 'acheckp', primary: true }),
                antTry.status === 'open' && antTry.tries >= 2 && teacherCfg.noReveal !== true && btn(t('stem.cellular.btn_show_answer', 'Show the answer'), antReveal, { key: 'areveal' }),
                antTry.status !== 'open' && btn(t('stem.cellular.btn_ant_next', 'Next position'), antNewProblem, { key: 'anext', primary: true })),
              antTry.status === 'open' && hintLadder('ant', antTry.hint, [antHintText(1, antProb), antHintText(2, antProb), antHintText(3, antProb)], function (lv) { setAntTry(Object.assign({}, antTry, { hint: lv })); }),
              antTry.status !== 'open' && antTry.hint > 0 && h('ol', { 'aria-label': t('stem.cellular.hints_aria', 'Hints so far'), style: { margin: 0, paddingLeft: '20px', fontSize: '12px', color: C.text, lineHeight: 1.5 } }, [1, 2, 3].filter(function (l) { return l <= antTry.hint; }).map(function (l) { return h('li', { key: l }, antHintText(l, antProb)); })),
              antTry.msg && feedbackBox(antTry.status === 'solved', antTry.msg))));
    }

    // ── Rule hunt (grades 9-12): search the totalistic rule space live ──
    var sHuntRun = useState(false); var huntRunning = sHuntRun[0], setHuntRunning = sHuntRun[1];
    var sHuntProg = useState({ done: 0, total: 0, current: '' }); var huntProg = sHuntProg[0], setHuntProg = sHuntProg[1];
    var sHuntRes = useState([]); var huntRes = sHuntRes[0], setHuntRes = sHuntRes[1];
    var sHuntStrat = useState('random'); var huntStrat = sHuntStrat[0], setHuntStrat = sHuntStrat[1];
    var sHuntNoLow = useState(true); var huntNoLow = sHuntNoLow[0], setHuntNoLow = sHuntNoLow[1];
    var sHuntGens = useState(false); var huntGens = sHuntGens[0], setHuntGens = sHuntGens[1];
    var sHuntPick = useState(''); var huntPick = sHuntPick[0], setHuntPick = sHuntPick[1];
    var huntTimerRef = useRef(null), huntJobRef = useRef(null);
    useEffect(function () { return function () { if (huntTimerRef.current) clearTimeout(huntTimerRef.current); huntTimerRef.current = null; huntJobRef.current = null; }; }, []);
    var huntStratSaved = plainObj(huntSaved.strat);
    function stratCount(id) { var s = plainObj(huntStratSaved[id]); return { n: countOf(s.n), ships: Math.min(countOf(s.ships), countOf(s.n)) }; }
    function finishHunt(job) {
      if (!job || job.finished) return;
      job.finished = true; huntJobRef.current = null; if (huntTimerRef.current) { clearTimeout(huntTimerRef.current); huntTimerRef.current = null; }
      var n = job.out.length, ships = job.out.filter(function (r) { return r.ship; }).length;
      patchSaved(function (s) { var hs = Object.assign({}, plainObj(s.ruleHunt)), strat = Object.assign({}, plainObj(hs.strat)), cur = plainObj(strat[job.strategy]); strat[job.strategy] = { n: countOf(cur.n) + n, ships: countOf(cur.ships) + ships }; hs.strat = strat; hs.tested = countOf(hs.tested) + n; return { ruleHunt: hs }; });
      setHuntRunning(false);
      announce(fmt(t('stem.cellular.sr_hunt_done', 'Search finished: {n} rules tested, {k} with a spaceship.'), { n: n, k: ships }));
    }
    function startHunt(count) {
      if (huntRunning) return;
      var rnd = seededRng(freshSeed(), 0x5ea), rules = [], seen = {};
      if (huntStrat === 'near') {
        var pool = famNeighbourRules(famR);
        for (var j = pool.length - 1; j > 0; j--) { var k = Math.floor(rnd() * (j + 1)), tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp; }
        rules = pool.slice(0, count);
      } else {
        for (var i = 0; i < count * 3 && rules.length < count; i++) { var r = famRandomRule(rnd, fam.nb, { generations: huntGens, noLowBirth: huntNoLow }), nm = famRuleName(r); if (!seen[nm]) { seen[nm] = true; rules.push(r); } }
      }
      var job = { queue: rules, out: [], strategy: huntStrat, centre: famName, finished: false };
      huntJobRef.current = job; setHuntRunning(true); setHuntProg({ done: 0, total: rules.length, current: '' });
      announce(fmt(t('stem.cellular.sr_hunt_start', 'Searching {n} rules. Results appear in the table as each rule is measured.'), { n: rules.length }));
      function next() {
        huntTimerRef.current = null;
        if (huntJobRef.current !== job || job.finished) return;
        if (!job.queue.length) { finishHunt(job); return; }
        var rule = job.queue.shift(), m = famMeasureMany(rule, [1, 2, 3]);
        var row = { id: job.strategy + ':' + famRuleName(rule) + ':' + (job.out.length + huntRes.length), rule: rule, name: famRuleName(rule), strategy: job.strategy, centre: job.centre, tally: m.tally, top: m.top, ship: m.ship };
        job.out.push(row);
        setHuntRes(function (prev) { return [row].concat(prev).slice(0, 80); });
        setHuntProg({ done: job.out.length, total: job.out.length + job.queue.length, current: row.name });
        if (m.ship) recordDiscovery(rule, m.ship);
        huntTimerRef.current = setTimeout(next, 0);
      }
      huntTimerRef.current = setTimeout(next, 0);
    }
    function huntVerdict() {
      var a = stratCount('random'), b = stratCount('near');
      if (a.n < 10 || b.n < 10) return null;
      var ra = a.ships / a.n, rb = b.ships / b.n, data = rb - ra > 0.1 ? 'near' : ra - rb > 0.1 ? 'random' : 'same';
      return { random: ra, near: rb, data: data };
    }
    function huntLock() {
      if (!huntPick) return;
      patchSaved(function (s) { var hs = plainObj(s.ruleHunt); if (hs.pick) return null; return { ruleHunt: Object.assign({}, hs, { pick: huntPick }) }; });
      announce(t('stem.cellular.sr_pred_locked_hunt', 'Prediction locked. Now test at least 10 rules with each search.'));
    }
    // Completing the two-search comparison (after a locked prediction) is the verified achievement.
    var huntReady = !!(huntVerdict() && typeof huntSaved.pick === 'string' && huntSaved.pick);
    useEffect(function () {
      if (!huntReady || huntSaved.compared) return;
      patchSaved(function (s) { var hs = plainObj(s.ruleHunt); return hs.compared ? null : { ruleHunt: Object.assign({}, hs, { compared: true }) }; });
      awardOnce('hunt_compare', 'cellularLab_hunt', 5, t('stem.cellular.xp_hunt_compare', 'Cellular Automaton Lab: compared two ways of searching rule space'));
    }, [huntReady]);
    // Rarity estimate for random searches: committed first, then compared only
    // with the random rules tested AFTER the lock (estBase = the counts then).
    var sHuntEst = useState(''); var huntEstPick = sHuntEst[0], setHuntEstPick = sHuntEst[1];
    var huntEstBase = plainObj(huntSaved.estBase), huntEstLocked = typeof huntSaved.estimate === 'string' || huntEstBase.n != null;
    function huntEstLock() {
      if (!huntEstPick || huntEstLocked) return;
      var cur = stratCount('random');
      patchSaved(function (s) { var hs = plainObj(s.ruleHunt); if (typeof hs.estimate === 'string') return null; return { ruleHunt: Object.assign({}, hs, { estimate: huntEstPick, estBase: { n: cur.n, ships: cur.ships } }) }; });
      announce(t('stem.cellular.sr_est_locked', 'Estimate locked. Now search at least 12 random rules.'));
    }
    function huntEstWords(id) {
      if (id === 'most') return t('stem.cellular.est_most', 'Most of them: 7 or more of 12 random rules will have a spaceship.');
      if (id === 'few') return t('stem.cellular.est_few', 'A few: 3 to 6 of 12.');
      if (id === 'one') return t('stem.cellular.est_one', 'One or two of 12.');
      return t('stem.cellular.est_none', 'Probably none of the 12.');
    }
    function renderHuntEstimate() {
      var cur = stratCount('random'), n = Math.max(0, cur.n - countOf(huntEstBase.n)), k = Math.max(0, Math.min(n, cur.ships - countOf(huntEstBase.ships)));
      var est = typeof huntSaved.estimate === 'string' ? huntSaved.estimate : '', bucket = huntBucket(k, n), enough = n >= 12;
      var pct = function (x) { return Math.round(x * 1000) / 10 + '%'; };
      return h('section', { 'data-hunt-estimate': 'true', style: { background: C.bg, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' } },
        h('h4', { style: { margin: '0 0 4px', fontSize: '13px', color: C.text } }, t('stem.cellular.est_title', 'Before a random search: how rare are spaceships?')),
        h('p', { style: { margin: '0 0 6px', fontSize: '12px', color: C.text, lineHeight: 1.5 } }, t('stem.cellular.est_intro', 'Some behaviours are very rare in rule space, so a search that finds no spaceship is a real result, not a broken search. Estimate first, then let your own searches answer.')),
        h('fieldset', { style: { border: 'none', margin: 0, padding: 0 } }, h('legend', { style: { fontSize: '12px', fontWeight: 800, color: C.text } }, t('stem.cellular.est_q', 'Out of 12 random rules, how many will have a spaceship?')),
          ['most', 'few', 'one', 'none'].map(function (id) { return h('label', { key: id, style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'radio', name: 'cell-hunt-est', value: id, checked: huntEstLocked ? est === id : huntEstPick === id, disabled: huntEstLocked, onChange: function () { setHuntEstPick(id); }, style: { width: '18px', height: '18px' } }), huntEstWords(id)); })),
        !huntEstLocked && btn(t('stem.cellular.btn_lock_est', 'Lock in my estimate'), huntEstLock, { key: 'hestlock', primary: true, disabled: !huntEstPick }),
        huntEstLocked && !enough && h('p', { style: { margin: '6px 0 0', fontSize: '11px', color: C.sub } }, fmt(t('stem.cellular.est_need', 'Search at least 12 random rules since your estimate to compare (so far {n}).'), { n: n })),
        huntEstLocked && enough && feedbackBox(est ? est === bucket : true,
          fmt(t('stem.cellular.est_data', 'Since your estimate, your random searches tested {n} rules and {k} had a spaceship ({pct}).'), { n: n, k: k, pct: pct(k / n) }) + ' ' +
          (est ? (est === bucket ? t('stem.cellular.est_match', 'Your estimate matches your data.') : t('stem.cellular.est_nomatch', 'Your estimate does not match your data.')) + ' ' : '') +
          (k === 0 ? fmt(t('stem.cellular.est_zero', 'Finding none in {n} rules does not prove there are none: it says they are rare. With 0 hits in {n} tries, the “rule of three” puts the true rate below about {ub}% (3 ÷ {n}).'), { n: n, ub: Math.round(300 / n * 10) / 10 }) : fmt(t('stem.cellular.est_some', 'That is about 1 rule in {x}.'), { x: Math.max(1, Math.round(n / k)) })),
          { style: { marginTop: '6px', padding: '9px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: statusTone((est ? est === bucket : true)).background, color: statusTone((est ? est === bucket : true)).color, border: statusTone((est ? est === bucket : true)).border } }));
    }
    function tallyWords(tally) { return FAM_OUTCOMES.filter(function (o) { return tally[o]; }).map(function (o) { return fmt(t('stem.cellular.tally_item', '{name}: {n}'), { name: outcomeName(o), n: tally[o] }); }).join('; '); }
    function renderHunt() {
      // A restored progress-only slice keeps "compared" but not the pick: the
      // prediction stays locked ('?') and the verdict reports the data only.
      var v = huntVerdict(), lockedPick = typeof huntSaved.pick === 'string' ? huntSaved.pick : huntSaved.compared === true ? '?' : '', digits = [];
      var maxD = fam.nb === 'vn' ? 4 : 8;
      for (var dgt = 1; dgt <= maxD; dgt++) { var withD = huntRes.filter(function (r) { return r.rule.B[dgt]; }); digits.push({ d: dgt, n: withD.length, ships: withD.filter(function (r) { return r.ship; }).length }); }
      var pct = function (x) { return Math.round(x * 100) + '%'; };
      var predOpts = [['random', t('stem.cellular.hunt_opt_random', 'Random rules will give more spaceships.')], ['near', t('stem.cellular.hunt_opt_near', 'Rules one change away from a spaceship rule will give more.')], ['same', t('stem.cellular.hunt_opt_same', 'Both searches will give about the same.')]];
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('p', { style: { margin: 0, fontSize: '12px', color: C.text, lineHeight: 1.5 } }, fmt(t('stem.cellular.hunt_intro', 'A totalistic rule only looks at how many neighbours are alive. Leaving out B0, there are {moore} two-state rules with 8 neighbours and {vn} with 4. Each rule below is measured on 3 seeded patches; a spaceship counts only if the same shape reappears shifted after p and again after 2p generations.'), { moore: '131,072', vn: '512' })),
        h('section', { style: { background: C.bg, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' } },
          h('h4', { style: { margin: '0 0 6px', fontSize: '13px', color: C.text } }, t('stem.cellular.hunt_q', 'Investigation: where in rule space do spaceships live?')),
          h('fieldset', { style: { border: 'none', margin: 0, padding: 0 } }, h('legend', { style: SR_ONLY }, t('stem.cellular.hunt_q', 'Investigation: where in rule space do spaceships live?')),
            predOpts.map(function (o) { return h('label', { key: o[0], style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'radio', name: 'cell-hunt-pred', value: o[0], checked: lockedPick ? lockedPick === o[0] : huntPick === o[0], disabled: !!lockedPick, onChange: function () { setHuntPick(o[0]); }, style: { width: '18px', height: '18px' } }), o[1]); })),
          !lockedPick && btn(t('stem.cellular.btn_lock', 'Lock in my prediction'), huntLock, { key: 'hlock', primary: true, disabled: !huntPick }),
          h('table', { style: { borderCollapse: 'collapse', fontSize: '12px', color: C.text, marginTop: '6px' } },
            h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px' } }, t('stem.cellular.hunt_compare_caption', 'Your searches so far (saved)')),
            h('thead', null, h('tr', null, [t('stem.cellular.hunt_col_search', 'Search'), t('stem.cellular.hunt_col_tested', 'Rules tested'), t('stem.cellular.hunt_col_ships', 'With a spaceship')].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '3px 8px', borderBottom: '1px solid ' + C.border } }, x); }))),
            h('tbody', null, [['random', t('stem.cellular.hunt_random', 'Random rules')], ['near', t('stem.cellular.hunt_near', 'One change from my rule')]].map(function (sx) { var c = stratCount(sx[0]); return h('tr', { key: sx[0] }, h('th', { scope: 'row', style: { textAlign: 'left', padding: '3px 8px', fontWeight: 700 } }, sx[1]), h('td', { style: { padding: '3px 8px' } }, String(c.n)), h('td', { style: { padding: '3px 8px' } }, c.n ? fmt(t('stem.cellular.hunt_rate', '{k} ({pct})'), { k: c.ships, pct: pct(c.ships / c.n) }) : '–')); }))),
          !v && h('p', { style: { margin: '6px 0 0', fontSize: '11px', color: C.sub } }, t('stem.cellular.hunt_need', 'Test at least 10 rules with each search to compare them.')),
          v && lockedPick && h('div', { role: 'status', style: { marginTop: '6px', padding: '9px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: statusTone(lockedPick === v.data || lockedPick === '?').background, color: statusTone(lockedPick === v.data || lockedPick === '?').color, border: statusTone(lockedPick === v.data || lockedPick === '?').border } },
            fmt(t('stem.cellular.hunt_verdict_data', 'Your data: {near} of near rules and {random} of random rules made a spaceship.'), { near: pct(v.near), random: pct(v.random) }) + ' ' + (lockedPick === '?' ? '' : (lockedPick === v.data ? t('stem.cellular.hunt_verdict_ok', 'Your prediction matches your data.') : t('stem.cellular.hunt_verdict_no', 'Your prediction does not match your data.')) + ' ') + (v.data === 'near' ? t('stem.cellular.hunt_why_near', 'Spaceships cluster: a rule that already supports a travelling shape often keeps it when one number changes, while most random rules die, freeze or explode.') : t('stem.cellular.hunt_why_other', 'Check which rule you searched around: near a rule with no spaceships, one change rarely creates one.')))),
        renderHuntEstimate(),
        h('fieldset', { style: { border: '1px solid ' + C.border, borderRadius: '10px', padding: '8px 10px', margin: 0 } },
          h('legend', { style: { fontSize: '12px', fontWeight: 800, color: C.text, padding: '0 4px' } }, t('stem.cellular.hunt_how', 'How to search')),
          [['random', t('stem.cellular.hunt_random_long', 'Random rules from the whole space (uses the neighbourhood chosen in Rule families)')], ['near', fmt(t('stem.cellular.hunt_near_long', 'Every rule one change away from {rule} (add or remove one number)'), { rule: famName })]].map(function (o) { return h('label', { key: o[0], style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'radio', name: 'cell-hunt-strat', value: o[0], checked: huntStrat === o[0], disabled: huntRunning, onChange: function () { setHuntStrat(o[0]); }, style: { width: '18px', height: '18px' } }), o[1]); }),
          huntStrat === 'random' && h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'checkbox', checked: huntNoLow, disabled: huntRunning, onChange: function (e) { setHuntNoLow(!!e.target.checked); }, style: { width: '18px', height: '18px' } }), t('stem.cellular.hunt_nolow', 'Leave out B1 and B2 (they make almost everything explode)')),
          huntStrat === 'random' && h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'checkbox', checked: huntGens, disabled: huntRunning, onChange: function (e) { setHuntGens(!!e.target.checked); }, style: { width: '18px', height: '18px' } }), t('stem.cellular.hunt_gens', 'Include 3-state rules like Brian’s Brain'))),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
          btn(t('stem.cellular.btn_hunt', 'Search 12 rules'), function () { startHunt(12); }, { key: 'hgo', primary: true, disabled: huntRunning }),
          huntRunning && btn(t('stem.cellular.btn_hunt_stop', 'Stop'), function () { finishHunt(huntJobRef.current); }, { key: 'hstop' }),
          (huntRunning || huntProg.total > 0) && h('progress', { max: huntProg.total || 1, value: huntProg.done, 'aria-label': t('stem.cellular.hunt_progress', 'Search progress'), style: { minWidth: '140px' } }),
          (huntRunning || huntProg.total > 0) && h('span', { 'aria-live': 'off', style: { fontSize: '12px', color: C.text } }, fmt(t('stem.cellular.hunt_prog', 'Measured {d} of {n} rules. Last: {rule}.'), { d: huntProg.done, n: huntProg.total, rule: huntProg.current || '–' }))),
        huntRes.length > 0 && h('div', { style: { overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }, tabIndex: 0, role: 'region', 'aria-label': t('stem.cellular.hunt_region', 'Rule hunt results (scrolls)') },
          h('table', { style: { borderCollapse: 'collapse', fontSize: '11px', color: C.text, width: '100%' } },
            h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px' } }, t('stem.cellular.hunt_caption', 'Rules measured this session (newest first)')),
            h('thead', null, h('tr', null, [t('stem.cellular.hunt_col_rule', 'Rule'), t('stem.cellular.hunt_col_search', 'Search'), t('stem.cellular.hunt_col_patches', '3 patches'), t('stem.cellular.hunt_col_ship', 'Spaceship'), t('stem.cellular.col_watch', 'Watch')].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid ' + C.border, position: 'sticky', top: 0, background: C.panel } }, x); }))),
            h('tbody', null, huntRes.map(function (row) {
              return h('tr', { key: row.id, style: { background: row.ship ? C.accentBg : 'transparent' } },
                h('td', { style: { padding: '3px 6px', fontFamily: 'monospace' } }, row.name),
                h('td', { style: { padding: '3px 6px' } }, row.strategy === 'near' ? fmt(t('stem.cellular.hunt_near_of', 'near {rule}'), { rule: row.centre }) : t('stem.cellular.hunt_random_short', 'random')),
                h('td', { style: { padding: '3px 6px' } }, tallyWords(row.tally)),
                h('td', { style: { padding: '3px 6px' } }, row.ship ? shipWords(row.ship.ship) : '–'),
                h('td', { style: { padding: '3px 6px' } }, btn(t('stem.cellular.btn_watch', 'Watch'), function () { watchSeed(row.rule, row.ship ? row.ship.seed : 1); }, { key: 'hw', ariaLabel: fmt(t('stem.cellular.btn_watch_rule_aria', 'Watch rule {rule} in Rule families'), { rule: row.name }) })));
            })))),
        huntRes.length > 0 && h('table', { style: { borderCollapse: 'collapse', fontSize: '11px', color: C.text } },
          h('caption', { style: { textAlign: 'left', fontWeight: 800, marginBottom: '4px' } }, t('stem.cellular.hunt_digits_caption', 'Birth numbers and spaceships in this session’s searches')),
          h('thead', null, h('tr', null, [t('stem.cellular.hunt_col_digit', 'Birth number'), t('stem.cellular.hunt_col_tested', 'Rules tested'), t('stem.cellular.hunt_col_ships', 'With a spaceship')].map(function (x) { return h('th', { key: x, scope: 'col', style: { textAlign: 'left', padding: '2px 8px', borderBottom: '1px solid ' + C.border } }, x); }))),
          h('tbody', null, digits.map(function (r) { return h('tr', { key: r.d }, h('th', { scope: 'row', style: { textAlign: 'left', padding: '2px 8px' } }, 'B' + r.d), h('td', { style: { padding: '2px 8px' } }, String(r.n)), h('td', { style: { padding: '2px 8px' } }, String(r.ships))); }))),
        h('section', { style: { background: C.bg, border: '1px solid ' + C.border, borderRadius: '12px', padding: '10px' } },
          h('h4', { style: { margin: '0 0 6px', fontSize: '13px', color: C.text } }, fmt(t('stem.cellular.hunt_found_title', 'Spaceship rules you have measured ({n})'), { n: huntFound.length })),
          huntFound.length === 0 ? h('p', { style: { margin: 0, fontSize: '12px', color: C.sub } }, t('stem.cellular.hunt_found_none', 'None yet. Measure a rule in Rule families or run a search.')) :
            h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: C.text } }, huntFound.map(function (f) { var rule = famRule(f.birth, f.survive, f.states, f.nb); return h('li', { key: f.rule, style: { marginBottom: '4px' } }, h('span', { style: { fontFamily: 'monospace', fontWeight: 800 } }, f.rule), ' ', shipWords({ dr: Number(f.dr), dc: Number(f.dc), period: Number(f.p), cells: Number(f.n) || 0 }), ' ', btn(t('stem.cellular.btn_watch', 'Watch'), function () { watchSeed(rule, f.seed || 1); }, { key: 'fw', ariaLabel: fmt(t('stem.cellular.btn_watch_rule_aria', 'Watch rule {rule} in Rule families'), { rule: f.rule }) })); })))
      );
    }
    function renderWorldsTab() {
      var views = [['family', t('stem.cellular.wv_family', 'Rule families')], ['ant', t('stem.cellular.wv_ant', 'Langton’s ant')]];
      if (band === 'g912' || isTeacher) views.push(['hunt', t('stem.cellular.wv_hunt', 'Rule hunt')]);
      var cur = views.some(function (v) { return v[0] === worldView; }) ? worldView : 'family';
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
        h('div', { role: 'group', 'aria-label': t('stem.cellular.wv_group', 'Choose a world'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, views.map(function (v) { return btn(v[1], function () { setWorldView(v[0]); }, { key: 'wv' + v[0], pressed: cur === v[0] }); })),
        h('section', { style: { background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', padding: '12px' } }, cur === 'ant' ? renderAnt() : cur === 'hunt' ? renderHunt() : renderFamily()));
    }

    // ════════════════════ K-5 GLIDER MISSION (stage B) ════════════════════
    var sGl = useState(function () { return makeGliderRound(1); }); var glRound = sGl[0], setGlRound = sGl[1];
    var sGlState = useState({ phase: 'predict', tries: 0, part1: false, launches: 0, msg: '', ok: false }); var glState = sGlState[0], setGlState = sGlState[1];
    var sGlBoard = useState(function () { return { grid: gliderBoard(glRound.heading), gen: 0 }; }); var glBoard = sGlBoard[0], setGlBoard = sGlBoard[1];
    var sGlAim = useState(''); var glAim = sGlAim[0], setGlAim = sGlAim[1];
    var sGlPlay = useState(null); var glPlay = sGlPlay[0], setGlPlay = sGlPlay[1];
    var glBoardRef = useRef(glBoard); glBoardRef.current = glBoard;
    // Animated glider: a timeout chain; reduced motion jumps to the last frame.
    useEffect(function () {
      if (!glPlay) return undefined;
      var id = null, alive = true;
      function frame() {
        if (!alive) return;
        var b = glBoardRef.current;
        if (b.gen >= glPlay.until || prefersReducedMotion()) {
          var g = b.grid, gen = b.gen;
          while (gen < glPlay.until) { g = stepLife(g, false, '3', '23'); gen++; }
          setGlBoard({ grid: g, gen: gen }); var done = glPlay; setGlPlay(null);
          if (done.msg) { setGlState(function (s) { return Object.assign({}, s, { msg: done.msg, ok: !!done.ok }); }); announce(done.msg); }
          return;
        }
        var nb = { grid: stepLife(b.grid, false, '3', '23'), gen: b.gen + 1 };
        glBoardRef.current = nb; setGlBoard(nb);
        id = setTimeout(frame, 280);
      }
      id = setTimeout(frame, 280);
      return function () { alive = false; if (id != null) clearTimeout(id); };
    }, [glPlay]);
    function headingName(hd) {
      if (hd === 'nw') return t('stem.cellular.gl_nw', 'Up and left');
      if (hd === 'ne') return t('stem.cellular.gl_ne', 'Up and right');
      if (hd === 'sw') return t('stem.cellular.gl_sw', 'Down and left');
      return t('stem.cellular.gl_se', 'Down and right');
    }
    function headingPhrase(hd) {
      if (hd === 'nw') return t('stem.cellular.gl_p_nw', 'up and to the left');
      if (hd === 'ne') return t('stem.cellular.gl_p_ne', 'up and to the right');
      if (hd === 'sw') return t('stem.cellular.gl_p_sw', 'down and to the left');
      return t('stem.cellular.gl_p_se', 'down and to the right');
    }
    function cornerName(hd) {
      if (hd === 'nw') return t('stem.cellular.gl_corner_nw', 'top-left corner');
      if (hd === 'ne') return t('stem.cellular.gl_corner_ne', 'top-right corner');
      if (hd === 'sw') return t('stem.cellular.gl_corner_sw', 'bottom-left corner');
      return t('stem.cellular.gl_corner_se', 'bottom-right corner');
    }
    var GL_ARROWS = { nw: '↖', ne: '↗', sw: '↙', se: '↘' };
    function gliderCellsWords(grid) {
      var cells = [];
      for (var r = 0; r < grid.length; r++) for (var c = 0; c < grid[r].length; c++) if (grid[r][c]) cells.push(fmt(t('stem.cellular.gl_cell', 'row {r} column {c}'), { r: r + 1, c: c + 1 }));
      return cells.join(', ');
    }
    function gliderShapeWords(hd) {
      // The clue a sighted student reads off the picture, in words.
      var row = hd.charAt(0) === 's' ? t('stem.cellular.gl_row_bottom', 'Its row of 3 is at the bottom.') : t('stem.cellular.gl_row_top', 'Its row of 3 is at the top.');
      var col = hd.charAt(1) === 'e' ? t('stem.cellular.gl_col_right_v2', 'One more cell touches the right end of that row, making an L.') : t('stem.cellular.gl_col_left_v2', 'One more cell touches the left end of that row, making an L.');
      return row + ' ' + col;
    }
    function newGliderRound() {
      var rd = makeGliderRound(freshSeed());
      setGlRound(rd); setGlPlay(null); setGlAim('');
      setGlState({ phase: 'predict', tries: 0, part1: false, launches: 0, hint: 0, msg: '', ok: false });
      setGlBoard({ grid: gliderBoard(rd.heading), gen: 0 });
      announce(t('stem.cellular.gl_new', 'A new glider is ready. Which way will it fly?'));
    }
    function gliderGuess(pick) {
      if (glState.phase !== 'predict' || glPlay) return;
      var truth = gliderMeasure(glRound.heading).heading, tag = gliderPickTag(truth, pick), tries = glState.tries + 1;
      patchSaved(function (s) { var g = Object.assign({}, plainObj(s.glider)); g.guesses = countOf(g.guesses) + 1; if (!tag) g.guessRight = countOf(g.guessRight) + 1; return { glider: g }; });
      if (!tag) {
        // Right within two tries earns the round's first part; later is practice.
        var msg = fmt(t('stem.cellular.gl_right', 'Yes! Watch it fly {dir}.'), { dir: headingPhrase(truth) });
        setGlState({ phase: 'aim', tries: tries, part1: tries <= 2, launches: 0, hint: glState.hint || 0, msg: msg, ok: true }); announce(msg);
        setGlBoard({ grid: gliderBoard(glRound.heading), gen: 0 }); setGlPlay({ until: 8 });
        return;
      }
      var mis = tag === 'opposite' ? t('stem.cellular.gl_mis_opposite_v2', 'That is the opposite way. Find the row of 3 and the one cell that touches an end of it, making an L: the glider flies toward the corner of the L. Try again.') : tag === 'updown' ? t('stem.cellular.gl_mis_updown', 'Left or right is right, but check up or down: the glider moves toward the side where its row of 3 is. Try again.') : t('stem.cellular.gl_mis_leftright_v2', 'Up or down is right, but check left or right: the glider moves toward the end of its row of 3 that has the extra cell beside it. Try again.');
      if (tries >= 2 && allowReveal) mis += ' ' + t('stem.cellular.gl_or_show', 'You can also press “Show me where it flies”.');
      setGlState(Object.assign({}, glState, { tries: tries, msg: mis, ok: false })); announce(mis);
    }
    // On demand after two wrong guesses (never automatic); a shown answer earns no credit.
    function gliderReveal() {
      if (glState.phase !== 'predict' || glState.tries < 2 || !allowReveal || glPlay) return;
      var truth = gliderMeasure(glRound.heading).heading, msg = fmt(t('stem.cellular.gl_show_v2', 'Watch where it really goes: {dir}. It flies toward the corner of the L made by its row of 3 and the cell touching one end of it.'), { dir: headingPhrase(truth) });
      patchSaved(function (s) { var g = Object.assign({}, plainObj(s.glider)); g.revealed = countOf(g.revealed) + 1; return { glider: g }; });
      setGlState({ phase: 'aim', tries: glState.tries, part1: false, launches: 0, hint: glState.hint || 0, msg: msg, ok: false }); announce(msg);
      setGlBoard({ grid: gliderBoard(glRound.heading), gen: 0 }); setGlPlay({ until: 8 });
    }
    function gliderLaunch() {
      if (glState.phase !== 'aim' || !glAim || glPlay) return;
      var reach = gliderReaches(glAim, GLIDER_STARS[glRound.star], 24), first = glState.launches === 0, solved = reach != null && first && glState.part1;
      var msg = reach != null ? fmt(t('stem.cellular.gl_hit', 'It reached the star at generation {g}!'), { g: reach }) : t('stem.cellular.gl_miss', 'It missed the star. Look at which corner the star is in, and pick the glider that flies that way.');
      setGlBoard({ grid: gliderBoard(glAim), gen: 0 });
      setGlState(Object.assign({}, glState, { launches: glState.launches + 1, phase: reach != null ? 'done' : 'aim', msg: '' }));
      setGlPlay({ until: reach != null ? reach : 20, msg: msg, ok: reach != null });
      if (reach != null) {
        var g0 = plainObj(saved.glider), solvedNow = countOf(g0.solved) + (solved ? 1 : 0);
        patchSaved(function (s) { var g = Object.assign({}, plainObj(s.glider)); g.played = countOf(g.played) + 1; if (solved) g.solved = countOf(g.solved) + 1; if (countOf(g.solved) >= 3) g.done = true; return { glider: g }; });
        if (solvedNow >= 3) awardOnce('mission_glider', 'cellularLab_missions', 15, fmt(t('stem.cellular.xp_mission', 'Cellular Automaton Lab mission complete: {name}'), { name: t('stem.cellular.gl_title', 'Glider mission: hit the star') }));
      }
    }
    function gliderPic(hd, size) {
      var cells = GLIDER_HEADINGS[hd].map(function (rc) { return h('rect', { key: rc.join('_'), x: rc[1] * 6 + 1, y: rc[0] * 6 + 1, width: 5, height: 5, fill: dark ? '#34d399' : '#047857' }); });
      return h('svg', { viewBox: '0 0 19 19', width: size, height: size, 'aria-hidden': 'true', focusable: 'false' }, h('rect', { x: 0, y: 0, width: 19, height: 19, fill: 'none', stroke: dark ? '#94a3b8' : '#475569', strokeWidth: 0.6 }), cells);
    }
    function renderGliderBoard() {
      var S = GLIDER_SIZE, px = 24, W = S * px, star = GLIDER_STARS[glRound.star], d = '';
      glBoard.grid.forEach(function (row, r) { row.forEach(function (v, c) { if (v) d += 'M' + (c * px + 2) + ' ' + (r * px + 2) + 'h' + (px - 4) + 'v' + (px - 4) + 'h-' + (px - 4) + 'z'; }); });
      var lines = ''; for (var i = 0; i <= S; i++) lines += 'M' + (i * px) + ' 0V' + W + 'M0 ' + (i * px) + 'H' + W;
      var sx = star[1] * px + px / 2, sy = star[0] * px + px / 2, pts = [];
      for (var k = 0; k < 10; k++) { var rad = k % 2 ? px * 0.2 : px * 0.46, ang = -Math.PI / 2 + k * Math.PI / 5; pts.push((sx + rad * Math.cos(ang)).toFixed(1) + ',' + (sy + rad * Math.sin(ang)).toFixed(1)); }
      var showStar = glState.phase !== 'predict';
      return h('figure', { style: { margin: 0 } },
        h('svg', { viewBox: '0 0 ' + W + ' ' + W, width: '100%', 'aria-hidden': 'true', focusable: 'false', 'data-glider-board': 'true', style: { display: 'block', maxWidth: '312px', background: dark ? '#0f172a' : '#ffffff', border: '1px solid ' + C.border, borderRadius: '10px' } },
          h('path', { d: lines, stroke: dark ? '#334155' : '#cbd5e1', strokeWidth: 1, fill: 'none' }),
          showStar && h('polygon', { points: pts.join(' '), fill: '#f59e0b', stroke: dark ? '#fde68a' : '#78350f', strokeWidth: 1.2 }),
          h('path', { d: d, fill: dark ? '#34d399' : '#047857' })),
        h('figcaption', { style: { fontSize: '12px', color: C.text, marginTop: '4px' } },
          h('span', { 'aria-live': glPlay ? 'off' : 'polite' }, fmt(t('stem.cellular.gl_board_desc', 'Generation {g}. Live cells: {cells}.'), { g: glBoard.gen, cells: gliderCellsWords(glBoard.grid) || t('stem.cellular.gl_none', 'none') }) + (glState.phase === 'predict' ? ' ' + gliderShapeWords(glRound.heading) : '') + (showStar ? ' ' + fmt(t('stem.cellular.gl_star_desc', 'The star is in the {corner}.'), { corner: cornerName(glRound.star) }) : ''))));
    }
    function renderGliderMission() {
      var solved = countOf(gliderSaved.solved), done = gliderSaved.done === true || solved >= 3;
      return h('div', { 'data-glider-mission': 'true', style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        h('h3', { style: { margin: 0, fontSize: '15px', color: C.text } }, t('stem.cellular.gl_title', 'Glider mission: hit the star') + (done ? ' ✓' : '')),
        h('p', { style: { margin: 0, fontSize: '12px', color: C.sub, lineHeight: 1.5 } }, t('stem.cellular.gl_intro', 'A glider is a little shape that travels across the Life grid. First guess which way this one will fly. Then aim a glider at the star.')),
        h('p', { style: { margin: 0, fontSize: '12px', fontWeight: 800, color: C.text } }, fmt(t('stem.cellular.gl_progress', 'Rounds solved: {n} of 3 (guess right, then hit the star on the first launch).'), { n: Math.min(3, solved) })),
        renderGliderBoard(),
        glState.phase === 'predict' && h('div', null,
          h('p', { id: 'cell-gl-q', style: { margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: C.text } }, t('stem.cellular.gl_q1', 'Which way will this glider fly?')),
          h('div', { role: 'group', 'aria-labelledby': 'cell-gl-q', style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 160px))', gap: '6px' } },
            GLIDER_ORDER.map(function (hd) { return h('button', { key: hd, type: 'button', onClick: function () { gliderGuess(hd); }, disabled: !!glPlay, style: { minHeight: '44px', borderRadius: '10px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '13px', fontWeight: 800, cursor: 'pointer' } }, h('span', { 'aria-hidden': 'true' }, GL_ARROWS[hd] + ' '), headingName(hd)); })),
          h('div', { style: { marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' } },
            hintLadder('glider', glState.hint || 0, [t('stem.cellular.gl_hint1_v2', 'Find the row of 3 cells, and the one cell that touches an end of that row.'), t('stem.cellular.gl_hint2_v2', 'Together they make an L. The glider flies toward the corner of the L.')], function (lv) { setGlState(Object.assign({}, glState, { hint: lv })); }, { disabled: !!glPlay }),
            glState.tries >= 2 && allowReveal && h('div', null, btn(t('stem.cellular.btn_gl_show', 'Show me where it flies (no credit)'), gliderReveal, { key: 'glshow', disabled: !!glPlay })))),
        glState.phase === 'aim' && h('div', null,
          h('p', { id: 'cell-gl-aim', style: { margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: C.text } }, fmt(t('stem.cellular.gl_q2', 'Now pick the glider that will reach the star in the {corner}.'), { corner: cornerName(glRound.star) })),
          h('div', { role: 'radiogroup', 'aria-labelledby': 'cell-gl-aim', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
            GLIDER_ORDER.map(function (hd) { var on = glAim === hd; return h('button', { key: hd, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', 'aria-label': fmt(t('stem.cellular.gl_pick_aria', 'Glider that flies {dir}'), { dir: headingPhrase(hd) }), onClick: function () { setGlAim(hd); }, disabled: !!glPlay, style: { minWidth: '56px', minHeight: '56px', borderRadius: '10px', border: '2px solid ' + (on ? '#047857' : C.border), background: on ? C.accentBg : C.panel, cursor: 'pointer', padding: '4px' } }, gliderPic(hd, 40)); })),
          h('div', { style: { marginTop: '6px' } }, btn(t('stem.cellular.btn_launch', 'Launch'), gliderLaunch, { key: 'glaunch', primary: true, disabled: !glAim || !!glPlay }))),
        glState.msg && feedbackBox(glState.ok, glState.msg),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(glState.phase === 'done' ? t('stem.cellular.btn_gl_next', 'Next round') : t('stem.cellular.btn_gl_new', 'New glider'), newGliderRound, { key: 'glnew', primary: glState.phase === 'done', disabled: !!glPlay })),
        done && h('p', { style: { margin: 0, fontSize: '12px', color: C.text } }, t('stem.cellular.gl_done', 'Mission complete! You can read a glider like a scientist. Keep playing if you like.')));
    }

    // ════════════════════ FOREST MODEL AS AN ARGUMENT (stage B) ════════════════════
    // What the model includes is read off forestStep itself; "left out" items
    // are things this model has no variable for. No outside sources are cited.
    var FF_ITEMS = [{ id: 'touch', inModel: true }, { id: 'wind', inModel: false }, { id: 'onestep', inModel: true }, { id: 'embers', inModel: false }, { id: 'gaps', inModel: true }, { id: 'terrain', inModel: false }, { id: 'same', inModel: true }, { id: 'people', inModel: false }];
    var FF_STRENGTHS = ['threshold', 'gaps', 'chance'];
    var sFfDraft = useState({}); var ffDraft = sFfDraft[0], setFfDraft = sFfDraft[1];
    var sFfSort = useState({}); var ffSortDraft = sFfSort[0], setFfSortDraft = sFfSort[1];
    var sFfMsg = useState(null); var ffMsg = sFfMsg[0], setFfMsg = sFfMsg[1];
    function ffItemText(id) {
      switch (id) {
        case 'touch': return t('stem.cellular.ffm_touch', 'Fire spreads only to trees that touch a burning tree (up, down, left or right).');
        case 'wind': return t('stem.cellular.ffm_wind', 'Wind pushes the fire faster in one direction.');
        case 'onestep': return t('stem.cellular.ffm_onestep', 'Every tree burns for exactly one step, then it is gone.');
        case 'embers': return t('stem.cellular.ffm_embers', 'Burning embers fly over gaps and start new fires further away.');
        case 'gaps': return t('stem.cellular.ffm_gaps', 'Bare ground with no trees stops the fire.');
        case 'terrain': return t('stem.cellular.ffm_terrain', 'Hills, wet ground and different kinds of plants change how fire spreads.');
        case 'same': return t('stem.cellular.ffm_same', 'All trees are the same, and a tree next to a fire always catches.');
        default: return t('stem.cellular.ffm_people', 'Firefighters and firebreaks can stop a fire.');
      }
    }
    function ffItemWhy(id) {
      switch (id) {
        case 'touch': return t('stem.cellular.ffw_touch', 'Look at the rule: fire reaches only a touching tree, up, down, left or right. That is exactly what the model does.');
        case 'wind': return t('stem.cellular.ffw_wind', 'Nothing in the model has a direction: fire spreads the same way up, down, left and right. There is no wind.');
        case 'onestep': return t('stem.cellular.ffw_onestep', 'Watch one run: each burning cell turns to ash on the very next step.');
        case 'embers': return t('stem.cellular.ffw_embers', 'In the model fire can only reach a touching tree, so it can never jump a gap.');
        case 'gaps': return t('stem.cellular.ffw_gaps', 'Your thin-forest runs show it: the fire stops where there are no trees.');
        case 'terrain': return t('stem.cellular.ffw_terrain', 'Every cell in the model is a tree or bare ground. There are no hills, no wet ground and no kinds of plants.');
        case 'same': return t('stem.cellular.ffw_same', 'In the model a tree next to a burning tree always catches. No tree is wetter or harder to burn.');
        default: return t('stem.cellular.ffw_people', 'Nobody acts in the model: once lit, the fire runs until it has nothing left to burn.');
      }
    }
    function ffStrengthText(id) {
      if (id === 'threshold') return t('stem.cellular.ffs_threshold', 'There is a tipping point: thin fuel stops a fire, thick fuel lets it cross.');
      if (id === 'gaps') return t('stem.cellular.ffs_gaps', 'Gaps in the fuel slow or stop the spread.');
      return t('stem.cellular.ffs_chance', 'The same tree density can give different results by chance.');
    }
    function ffSaved() { var c = plainObj(saved.cer); return plainObj(c.ffmodel); }
    function ffPatch(patch) { patchSaved(function (s) { var all = Object.assign({}, plainObj(s.cer)); all.ffmodel = Object.assign({}, plainObj(all.ffmodel), patch); return { cer: all }; }); }
    function ffState() {
      var s = ffSaved(), d = ffDraft, sort = Object.assign({}, plainObj(s.sort), ffSortDraft);
      var list = function (v) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : []; };
      return { sort: sort, sortOk: s.sortOk === true, sortChecks: countOf(s.sortChecks), limits: list(s.limits), strengths: list(s.strengths), claim: d.claim != null ? d.claim : (typeof s.claim === 'string' ? s.claim : ''), evidence: d.evidence != null ? d.evidence : (typeof s.evidence === 'string' ? s.evidence : ''), reasoning: d.reasoning != null ? d.reasoning : (typeof s.reasoning === 'string' ? s.reasoning : ''), done: s.done === true };
    }
    function ffCheckSort() {
      var st = ffState(), wrong = FF_ITEMS.filter(function (it) { return st.sort[it.id] !== (it.inModel ? 'in' : 'out'); });
      var unanswered = FF_ITEMS.filter(function (it) { return !st.sort[it.id]; }).length;
      if (unanswered) { var m0 = t('stem.cellular.ffm_need_all', 'Sort all eight statements first.'); setFfMsg({ ok: false, text: m0 }); announce(m0); return; }
      ffPatch({ sort: st.sort, sortChecks: st.sortChecks + 1, sortOk: !wrong.length });
      // First check: only how many are wrong (no per-item answers); the why for each comes from the second check on.
      var text = !wrong.length ? t('stem.cellular.ffm_sort_ok', 'All eight sorted correctly. The four things the model leaves out are its limitations; the four it includes are its assumptions.')
        : st.sortChecks < 1 ? fmt(t('stem.cellular.ffm_sort_count', 'Statements that need another look: {n} of 8. Read each statement again, compare it with the rule, then check again.'), { n: wrong.length })
        : fmt(t('stem.cellular.ffm_sort_wrong_v2', 'Statements that need another look: {n} of 8. Here is why:'), { n: wrong.length }) + ' ' + wrong.map(function (it) { return ffItemWhy(it.id); }).join(' ');
      setFfMsg({ ok: !wrong.length, text: text }); announce(text);
    }
    function ffChecks(st, groups) {
      var dense = groups.filter(function (g) { return g.n >= 3; }).length;
      return [
        { id: 'sort', ok: st.sortOk, text: t('stem.cellular.ffc_sort', 'All eight statements sorted correctly') },
        { id: 'data', ok: dense >= 2, text: t('stem.cellular.ffc_data', 'Your trials include at least 2 tree densities with at least 3 runs each') },
        { id: 'claim', ok: st.claim.trim().length >= 15, text: t('stem.cellular.cer_need_claim', 'A claim of at least one full sentence') },
        { id: 'evidence', ok: /\d/.test(st.evidence) && st.evidence.trim().length >= 15, text: t('stem.cellular.cer_need_number', 'Evidence that quotes numbers from your rows') },
        { id: 'strength', ok: st.strengths.length >= 1, text: t('stem.cellular.ffc_strength', 'At least one thing the model shows well') },
        { id: 'limits', ok: st.limits.length >= 2, text: t('stem.cellular.ffc_limits', 'At least two limitations') },
        { id: 'reasoning', ok: st.reasoning.trim().length >= 40, text: t('stem.cellular.ffc_reasoning', 'Reasoning (a few sentences) that weighs the strength against the limitations') }
      ];
    }
    function ffToggle(listKey, id) {
      var st = ffState(), cur = st[listKey], next = cur.indexOf(id) !== -1 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]), p = {};
      p[listKey] = next; ffPatch(p);
    }
    function ffComplete(groups) {
      var st = ffState(); if (st.done || !ffChecks(st, groups).every(function (c) { return c.ok; })) return;
      ffPatch({ claim: st.claim, evidence: st.evidence, reasoning: st.reasoning, done: true });
      awardOnce('cer_ffmodel', 'cellularLab_cer', 15, t('stem.cellular.xp_ffmodel', 'Cellular Automaton Lab: argued how good the forest-fire model is'));
      announce(t('stem.cellular.sr_cer_done', 'Investigation complete. Your claim, evidence and reasoning are saved.'));
    }
    function renderForestModel(groups) {
      var st = ffState(), checks = ffChecks(st, groups), ready = checks.every(function (c) { return c.ok; });
      var field = function (key, label, rows) {
        return h('div', { key: key }, h('label', { htmlFor: 'cer-ffmodel-' + key, style: { display: 'block', fontSize: '12px', fontWeight: 800, color: C.text, margin: '6px 0 3px' } }, label),
          h('textarea', { id: 'cer-ffmodel-' + key, rows: rows, value: st[key], disabled: st.done, onChange: function (e) { var d = Object.assign({}, ffDraft); d[key] = String(e.target.value).slice(0, 1200); setFfDraft(d); }, onBlur: function () { var p = {}; p[key] = st[key]; ffPatch(p); }, style: { width: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, fontSize: '12px' } }));
      };
      var box = function (listKey, id, label) { var on = st[listKey].indexOf(id) !== -1; return h('label', { key: listKey + id, style: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: C.text, padding: '3px 0', minHeight: '28px' } }, h('input', { type: 'checkbox', checked: on, disabled: st.done, onChange: function () { ffToggle(listKey, id); }, style: { width: '18px', height: '18px', flex: '0 0 auto' } }), label); };
      return h('section', { 'data-ff-model': 'true', id: 'cell-ffmodel', tabIndex: -1, style: { background: C.bg, border: '1px solid ' + (st.done ? C.accent : C.border), borderRadius: '12px', padding: '12px' } },
        h('h4', { style: { margin: '0 0 4px', fontSize: '14px', color: C.text } }, t('stem.cellular.ffm_title', 'The model as an argument') + (st.done ? ' ✓' : '')),
        h('p', { style: { margin: '0 0 6px', fontSize: '13px', fontWeight: 800, color: C.text } }, t('stem.cellular.ffm_q', 'How good is this forest-fire model as a model of real fires?')),
        h('p', { style: { margin: '0 0 8px', fontSize: '12px', color: C.sub, lineHeight: 1.5 } }, t('stem.cellular.ffm_how', 'Every model keeps some things and leaves others out. Step 1: sort each statement. Step 2: argue how good the model is, using your own trials as evidence.')),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, FF_ITEMS.map(function (it) {
          var val = st.sort[it.id] || '';
          return h('fieldset', { key: it.id, style: { border: '1px solid ' + C.border, borderRadius: '8px', padding: '6px 8px', margin: 0 } },
            h('legend', { style: { fontSize: '12px', color: C.text, fontWeight: 700, padding: '0 4px' } }, ffItemText(it.id)),
            h('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap' } }, [['in', t('stem.cellular.ffm_in', 'The model includes this')], ['out', t('stem.cellular.ffm_out', 'The model leaves this out')]].map(function (o) {
              return h('label', { key: o[0], style: { display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: C.text, minHeight: '28px' } }, h('input', { type: 'radio', name: 'ffm-' + it.id, value: o[0], checked: val === o[0], disabled: st.done || st.sortOk, onChange: function () { var d = Object.assign({}, ffSortDraft); d[it.id] = o[0]; setFfSortDraft(d); }, style: { width: '18px', height: '18px' } }), o[1]);
            })));
        })),
        !st.sortOk && h('div', { style: { marginTop: '6px' } }, btn(t('stem.cellular.btn_check_sort', 'Check my sort'), ffCheckSort, { key: 'ffsort', primary: true })),
        ffMsg && h('div', { role: 'status', style: { marginTop: '6px', padding: '9px 11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: statusTone(ffMsg.ok).background, color: statusTone(ffMsg.ok).color, border: statusTone(ffMsg.ok).border } }, ffMsg.text),
        st.sortOk && h('div', { style: { marginTop: '8px' } },
          h('fieldset', { style: { border: 'none', margin: 0, padding: 0 } }, h('legend', { style: { fontSize: '12px', fontWeight: 800, color: C.text } }, t('stem.cellular.ffm_strengths', 'What the model shows well (pick at least one)')), FF_STRENGTHS.map(function (id) { return box('strengths', id, ffStrengthText(id)); })),
          h('fieldset', { style: { border: 'none', margin: '6px 0 0', padding: 0 } }, h('legend', { style: { fontSize: '12px', fontWeight: 800, color: C.text } }, t('stem.cellular.ffm_limits', 'Limitations you will discuss (pick at least two)')), FF_ITEMS.filter(function (it) { return !it.inModel; }).map(function (it) { return box('limits', it.id, ffItemText(it.id)); })),
          field('claim', t('stem.cellular.ffm_claim', 'Claim: how good is the model, and good for what?'), 2),
          field('evidence', t('stem.cellular.ffm_evidence', 'Evidence: numbers from your forest trials'), 3),
          field('reasoning', t('stem.cellular.ffm_reasoning', 'Reasoning: why the strength matters, and how the limitations could change real results'), 4)),
        h('ul', { 'aria-label': t('stem.cellular.cer_checklist', 'Checklist'), style: { listStyle: 'none', margin: '8px 0', padding: 0, fontSize: '12px', color: C.text } }, checks.map(function (c) { return h('li', { key: c.id, style: { display: 'flex', gap: '6px', alignItems: 'flex-start', marginBottom: '2px' } }, h('span', { 'aria-hidden': 'true', style: { color: c.ok ? (dark ? '#34d399' : '#047857') : C.sub, fontWeight: 900 } }, c.ok ? '✓' : '○'), h('span', null, c.text + ' ', h('span', { style: SR_ONLY }, c.ok ? t('stem.cellular.check_done', '(done)') : t('stem.cellular.check_todo', '(not yet)')))); })),
        h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
          btn(st.done ? t('stem.cellular.cer_completed', 'Completed') : t('stem.cellular.btn_complete_cer', 'Complete investigation'), function () { ffComplete(groups); }, { key: 'ffdone', primary: !st.done, disabled: st.done || !ready }),
          st.done && btn(t('stem.cellular.btn_edit_cer', 'Edit again'), function () { ffPatch({ done: false }); }, { key: 'ffedit' })));
    }

    // ── Learning path ("Start here") ──
    var noticeSaved = plainObj(saved.notice), cdSaved = plainObj(saved.challengesDone);
    var PATH = pathSteps(band, saved, {
      notice: NOTICE_IDS.filter(function (k) { return noticeSaved[k] === true; }).length,
      gliderDone: gliderSaved.done === true || countOf(gliderSaved.solved) >= 3, gliderSolved: gliderSaved.solved,
      challenges: Object.keys(cdSaved).filter(function (k) { return cdSaved[k] === true; }).length,
      ngSolved: practiceStats.solved, classSolved: practiceStats.classSolved,
      cerDone: CER_INVS.filter(function (inv) { return plainObj(cerSavedAll[inv.id]).done === true; }).length,
      missionsDone: ['forest', 'traffic', 'epidemic'].filter(function (m) { return mState(m).done; }).length,
      huntCompared: huntSaved.compared === true, ffDone: ffSaved().done === true
    });
    function pathTitle(id) {
      switch (id) {
        case 'draw': return t('stem.cellular.path_draw', 'Draw and observe');
        case 'notice': return t('stem.cellular.path_notice', 'Notice and wonder');
        case 'glider': return t('stem.cellular.path_glider', 'Glider mission');
        case 'challenges': return t('stem.cellular.path_challenges', 'Life challenges');
        case 'practice': return t('stem.cellular.path_practice', 'Practice predictions');
        case 'cer': return t('stem.cellular.path_cer', 'CER investigation');
        case 'missions': return t('stem.cellular.path_missions', 'Model mission');
        case 'rulespace': return t('stem.cellular.path_rulespace', 'Rule space');
        case 'classes': return t('stem.cellular.path_classes', 'Wolfram classes');
        case 'hunt': return t('stem.cellular.path_hunt', 'Rule hunt');
        default: return t('stem.cellular.path_critique', 'Model critique');
      }
    }
    function pathHow(id) {
      switch (id) {
        case 'draw': return t('stem.cellular.path_draw_how', 'Draw some cells, then press Step or Run and watch what happens.');
        case 'notice': return t('stem.cellular.path_notice_how', 'Try the experiments under “Notice and wonder” and tick the ones you tried.');
        case 'glider': return t('stem.cellular.path_glider_how', 'Guess which way a glider flies, then aim one at a star.');
        case 'challenges': return t('stem.cellular.path_challenges_how', 'Design patterns that pass the challenge checks.');
        case 'practice': return t('stem.cellular.path_practice_how', 'Predict the next generation, cell by cell.');
        case 'cer': return t('stem.cellular.path_cer_how', 'Run your own trials, then write a claim, evidence and reasoning.');
        case 'missions': return t('stem.cellular.path_missions_how', 'Use a cellular model to answer a real-world question.');
        case 'rulespace': return t('stem.cellular.path_rulespace_how', 'Explore elementary rules, including Rule 110.');
        case 'classes': return t('stem.cellular.path_classes_how', 'Name the Wolfram class of mystery rules.');
        case 'hunt': return t('stem.cellular.path_hunt_how', 'Predict, then search rule space for spaceships in two ways.');
        default: return t('stem.cellular.path_critique_how', 'Judge the forest-fire model: what it includes, what it leaves out, and how good it is.');
      }
    }
    var pathDoneN = PATH.filter(function (st) { return st.done; }).length;
    var pathNext = PATH.filter(function (st) { return !st.done; })[0] || null;
    var sPathFocus = useState(null); var pathFocus = sPathFocus[0], setPathFocus = sPathFocus[1];
    var scrollToRef = useRef(null);
    useEffect(function () {
      if (!pathFocus) return;
      var el = document.getElementById(pathFocus) || document.getElementById('cell-panel'), sc = scrollToRef.current ? document.getElementById(scrollToRef.current) : null;
      scrollToRef.current = null;
      if (sc && typeof sc.scrollIntoView === 'function') { try { sc.scrollIntoView({ block: 'start' }); } catch (_) {} }
      if (el && typeof el.focus === 'function') { try { if (sc) el.focus({ preventScroll: true }); else el.focus(); } catch (_) {} }
      setPathFocus(null);
    }, [pathFocus]);
    // Moves focus to the Life grid, first scrolling the given block (the
    // challenge strip, or the grid row) to the top so Run is in view too.
    function focusLifeGrid(scrollId) { scrollToRef.current = scrollId || 'cell-life-row'; setPathFocus('cell-life-grid'); }
    function pathGo(st) {
      // Step 1 lands on the grid: Life challenges starts the first unsolved one.
      if (st.id === 'challenges' && challenge && challengeStatus === 'active') { setTab('life'); focusLifeGrid('cell-challenge-strip'); return; }
      if (st.id === 'challenges') { var cd = plainObj(saved.challengesDone); beginChallenge(['still', 'oscillator', 'extinction', 'methuselah', 'maxpop'].filter(function (id) { return cd[id] !== true; })[0] || 'still'); return; }
      if (st.id === 'draw') { setTab('life'); focusLifeGrid(); announce(fmt(t('stem.cellular.sr_section', '{name} selected.'), { name: pathTitle(st.id) })); return; }
      if (st.mission) { setMissionId(st.mission); setModelPlaying(false); }
      if (st.mode) setPracticeMode(st.mode);
      if (st.view) setWorldView(st.view);
      setTab(st.tab); setPathFocus(st.focus || 'cell-panel');
      announce(fmt(t('stem.cellular.sr_section', '{name} selected.'), { name: pathTitle(st.id) }));
    }
    function renderPath() {
      var bandWord = band === 'k5' ? t('stem.cellular.band_k5', 'Grades K–5') : band === 'g912' ? t('stem.cellular.band_912', 'Grades 9–12') : t('stem.cellular.band_68', 'Grades 6–8');
      return h('div', { 'data-cellularlab-path': band, style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        h('p', { id: 'cell-path-title', style: { margin: 0, fontSize: '12px', fontWeight: 800, color: C.text } }, fmt(t('stem.cellular.path_title', 'Your path for {band}: {done} of {n} steps done'), { band: bandWord, done: pathDoneN, n: PATH.length })),
        h('ol', { 'aria-labelledby': 'cell-path-title', style: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' } },
          PATH.map(function (st, i) {
            var open = TABS.some(function (tb) { return tb.id === st.tab; }), isNext = pathNext === st;
            var status = st.done ? t('stem.cellular.path_status_done', 'Done') : !open ? t('stem.cellular.path_status_closed', 'Not open right now') : st.need ? fmt(isNext ? t('stem.cellular.path_status_count_next', '{have} of {need} · Up next') : t('stem.cellular.path_status_count', '{have} of {need}'), { have: st.have || 0, need: st.need }) : isNext ? t('stem.cellular.path_status_next', 'Up next') : t('stem.cellular.path_status_todo', 'Not started');
            return h('li', { key: st.id, style: { margin: 0 } },
              h('button', { type: 'button', 'data-path-step': st.id, 'data-done': st.done ? 'true' : 'false', disabled: !open, onClick: function () { pathGo(st); },
                style: { width: '100%', minHeight: '64px', textAlign: 'left', cursor: open ? 'pointer' : 'not-allowed', opacity: open ? 1 : 0.6, borderRadius: '12px', padding: '9px 10px', display: 'flex', gap: '8px', alignItems: 'flex-start',
                  border: '1px solid ' + (st.done || isNext ? C.accent : C.border), background: st.done ? C.accentBg : C.bg, color: C.text } },
                h('span', { 'aria-hidden': 'true', style: { flex: '0 0 auto', width: '22px', height: '22px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, background: st.done ? '#047857' : C.panel, color: st.done ? '#ffffff' : C.text, border: '1px solid ' + (st.done ? '#047857' : C.border) } }, st.done ? '✓' : String(i + 1)),
                h('span', { style: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } },
                  h('span', { style: { fontSize: '12px', fontWeight: 900 } }, pathTitle(st.id)),
                  h('span', { style: { fontSize: '11px', lineHeight: 1.35, color: C.text } }, pathHow(st.id)),
                  h('span', { style: { fontSize: '11px', fontWeight: 800, color: st.done ? (dark ? '#a7f3d0' : '#065f46') : C.sub } }, status))));
          })),
        pathDoneN === PATH.length && h('p', { style: { margin: 0, fontSize: '11px', color: C.text } }, t('stem.cellular.path_all_done', 'Path complete! Every other section is still open below.')));
    }
    // ════════════════════ SHELL ════════════════════
    var ALL_TABS = [
      { id: 'life', label: t('stem.cellular.tab_life', 'Life Worlds'), icon: '🦠' },
      { id: 'rules', label: t('stem.cellular.tab_rules', 'Rules'), icon: '📜' },
      { id: 'patterns', label: t('stem.cellular.tab_patterns', 'Patterns'), icon: '✨' },
      { id: 'worlds', label: t('stem.cellular.tab_worlds', 'More worlds'), icon: '🐜' },
      { id: 'practice', label: t('stem.cellular.tab_practice', 'Practice'), icon: '🎯' },
      { id: 'investigate', label: t('stem.cellular.tab_investigate', 'Investigate'), icon: '🔬' },
      { id: 'missions', label: t('stem.cellular.tab_missions', 'Missions'), icon: '🌲' },
      { id: 'learn', label: t('stem.cellular.tab_learn', 'Learn'), icon: '📖' },
      { id: 'teacher', label: t('stem.cellular.tab_teacher', 'Teacher'), icon: '🧑‍🏫' }
    ];
    // Each band sees its core sections first (Life stays first: it is the
    // default view); every section is still reachable.
    var TAB_ORDER = TAB_ORDERS[band] || TAB_ORDERS.g68;
    ALL_TABS.sort(function (a, b) { return TAB_ORDER.indexOf(a.id) - TAB_ORDER.indexOf(b.id); });
    // Visible sections: K-5 has no Rules tab; the Teacher tab is teacher-only;
    // a teacher's section lock leaves students on that one section.
    var TABS = ALL_TABS.filter(function (tb) {
      if (tb.id === 'teacher') return isTeacher;
      if (!isTeacher && teacherCfg.lockTab && ALL_TABS.some(function (x) { return x.id === teacherCfg.lockTab; })) return tb.id === teacherCfg.lockTab;
      if (tb.id === 'rules') return band !== 'k5';
      return true;
    });
    if (!TABS.some(function (tb) { return tb.id === tab; })) tab = TABS[0].id;
    var CELLULAR_TAB_IDS = TABS.map(function (tb) { return tb.id; });
    var cellularTabKeyDown = function (e, index) {
      var nextIndex = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % CELLULAR_TAB_IDS.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + CELLULAR_TAB_IDS.length - 1) % CELLULAR_TAB_IDS.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = CELLULAR_TAB_IDS.length - 1;
      if (nextIndex < 0) return;
      e.preventDefault();
      var tabs = e.currentTarget && e.currentTarget.parentNode
        ? e.currentTarget.parentNode.querySelectorAll('[role="tab"]')
        : [];
      var nextTab = tabs[nextIndex];
      if (nextTab) {
        nextTab.focus();
        nextTab.click();
      }
    };
    var body = tab === 'life' ? renderLifeTab()
      : tab === 'rules' ? renderRulesTab()
      : tab === 'patterns' ? renderPatternsTab()
      : tab === 'worlds' ? renderWorldsTab()
      : tab === 'practice' ? renderPracticeTab()
      : tab === 'investigate' ? renderInvestigateTab()
      : tab === 'missions' ? renderMissionsTab()
      : tab === 'teacher' ? renderTeacherTab()
      : renderLearnTab();
    var bandLocked = BANDS.indexOf(teacherCfg.lockBand) !== -1;
    var bandOptions = [{ id: 'k5', label: t('stem.cellular.band_k5', 'Grades K–5') }, { id: 'g68', label: t('stem.cellular.band_68', 'Grades 6–8') }, { id: 'g912', label: t('stem.cellular.band_912', 'Grades 9–12') }];

    return h('div', { 'data-cellularlab-tool': 'true', 'data-band': band, style: { display: 'flex', flexDirection: 'column', gap: '14px', color: C.text, background: C.bg, borderRadius: 12, fontFamily: 'inherit' } },
      // header
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
        (ctx.setStemLabTool ? h('button', { type: 'button', onClick: function () { ctx.setStemLabTool(''); }, 'aria-label': t('stem.cellular.back_aria', 'Back to STEAM Lab'),
          style: { padding: '6px 10px', minHeight: '32px', borderRadius: '8px', border: '1px solid ' + C.border, background: C.panel, color: C.text, cursor: 'pointer', fontSize: '12px', fontWeight: 700 } }, t('stem.cellular.back', '← Back')) : null),
        h('div', { style: { fontSize: '22px' }, 'aria-hidden': 'true' }, '🧫'),
        h('div', null,
          h('h1', { style: { margin: 0, fontSize: '17px', fontWeight: 800 } }, t('stem.cellular.title', 'Cellular Automaton Lab')),
          h('div', { style: { fontSize: '11px', color: C.sub } }, t('stem.cellular.subtitle', 'Simple rules, surprising worlds')))
      ),
      h('section', { 'data-cellularlab-focus-panel': 'true', 'aria-label': t('stem.cellular.focus_aria', 'Cellular Automaton Lab focus panel'),
        style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px',
          background: C.panel, border: '1px solid ' + C.border, borderRadius: '14px', padding: '12px',
          boxShadow: dark ? '0 18px 42px rgba(0,0,0,0.22)' : '0 16px 36px rgba(15,23,42,0.08)' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '9px', minWidth: 0 } },
          h('div', null,
            h('div', { style: { fontSize: '10px', fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em' } }, t('stem.cellular.start_here', 'Start here')),
            h('h2', { style: { margin: '2px 0 0', fontSize: '16px', fontWeight: 900, color: C.text } }, t('stem.cellular.pick_world', 'Pick the world you want to investigate'))),
          renderPath(),
          h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
            h('span', { id: 'cell-band-label', style: { fontSize: '11px', fontWeight: 800, color: C.sub } }, t('stem.cellular.band_label', 'Level:')),
            h('div', { role: 'group', 'aria-labelledby': 'cell-band-label', style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, bandOptions.map(function (b) {
              return btn(b.label, function () { if (bandLocked) return; patchSaved(function (s) { return s.band === b.id ? null : { band: b.id }; }); announce(fmt(t('stem.cellular.sr_band', 'Level set to {name}.'), { name: b.label })); }, { key: 'band' + b.id, pressed: band === b.id, disabled: bandLocked && band !== b.id });
            })),
            bandLocked && h('span', { style: { fontSize: '11px', color: C.sub } }, t('stem.cellular.band_locked', 'Your teacher set this level.')))
        )
      ),
      // tabs
      h('div', { role: 'tablist', 'aria-label': t('stem.cellular.tabs_aria', 'Cellular Automaton Lab sections'), style: { display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid ' + C.border, paddingBottom: '8px' } },
        TABS.map(function (tb, ti) {
          var active = tab === tb.id;
          return h('button', {
            key: tb.id, type: 'button', className: 'cellularlab-tab', role: 'tab',
            id: 'cell-tab-' + tb.id, 'aria-controls': 'cell-panel', 'aria-selected': active ? 'true' : 'false',
            tabIndex: active ? 0 : -1,
            onKeyDown: function (e) { cellularTabKeyDown(e, ti); },
            onClick: function () { setTab(tb.id); },
            style: { padding: '7px 13px', minHeight: '32px', borderRadius: '9px 9px 0 0', cursor: 'pointer', fontSize: '13px', fontWeight: 800,
              borderTop: '1px solid ' + (active ? C.accent : 'transparent'), borderRight: '1px solid ' + (active ? C.accent : 'transparent'), borderBottom: 'none', borderLeft: '1px solid ' + (active ? C.accent : 'transparent'),
              background: active ? C.accentBg : 'transparent', color: active ? (dark ? '#a7f3d0' : '#065f46') : C.sub }
          }, h('span', { 'aria-hidden': 'true' }, tb.icon + ' '), tb.label);
        })
      ),
      h('div', { id: 'cell-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'cell-tab-' + tab }, body),
      // visually-hidden SR live region (component-owned; see announce())
      h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: SR_ONLY }, liveMsg)
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
  // ── Engagement pass (2026-11-04): the plain-language rule card, a one-step
  //    explanation (forecast + X-ray for the next step) and predict-then-run.
  //    Everything is read off the same engine the grid runs (parseLifeRule +
  //    neighborCount = stepLifeDetailed's own rule). ──
  var LIFE_PREDICT_OPTIONS = ['dies', 'settles', 'repeats', 'flies'];
  var PREDICT_XP_CAP = 5, PREDICT_TIMEOUT = 300;
  function ruleCounts(text) { var set = parseLifeRule(text, ''), out = []; for (var n = 0; n <= 8; n++) if (set[n]) out.push(n); return out; }
  function countList(list) {
    if (list.length === 1) return String(list[0]);
    return fmt(t('stem.cellular.rc_list_or', '{list} or {last}'), { list: list.slice(0, -1).join(', '), last: list[list.length - 1] });
  }
  function lifeRuleWords(birthRule, survivalRule) {
    var b = ruleCounts(birthRule), s = ruleCounts(survivalRule);
    var birth = !b.length ? t('stem.cellular.rc_birth_none', 'An empty square never comes alive.')
      : b.length === 1 ? fmt(t('stem.cellular.rc_birth_one', 'An empty square comes alive when exactly {n} of its 8 neighbours are alive.'), { n: b[0] })
      : fmt(t('stem.cellular.rc_birth_many', 'An empty square comes alive when {list} of its 8 neighbours are alive.'), { list: countList(b) });
    var survive = !s.length ? t('stem.cellular.rc_survive_none', 'A live square always dies at the next step.')
      : s.length === 9 ? t('stem.cellular.rc_survive_all', 'A live square never dies.')
      : s.length === 1 ? fmt(t('stem.cellular.rc_survive_one', 'A live square stays alive with exactly {n} live neighbours. With any other number it dies.'), { n: s[0] })
      : fmt(t('stem.cellular.rc_survive_many', 'A live square stays alive with {list} live neighbours. With any other number it dies.'), { list: countList(s) });
    return { birth: birth, survive: survive, b: b, s: s };
  }
  // What the next step does to every square, and why. fate per cell:
  // born | stays | few (below the lowest survive count) | many (above the
  // highest) | gap (between them, not listed) | none (nothing survives) | empty.
  function explainLifeStep(g, wrap, birthRule, survivalRule) {
    var rows = g.length, cols = rows ? g[0].length : 0, births = parseLifeRule(birthRule, '3'), survives = parseLifeRule(survivalRule, '23');
    var s = ruleCounts(survivalRule), minS = s.length ? s[0] : null, maxS = s.length ? s[s.length - 1] : null;
    var ex = { born: 0, stay: 0, died: 0, few: 0, many: 0, gap: 0, none: 0, alive: 0, minS: minS, maxS: maxS, fate: new Array(rows * cols), nextPop: 0 };
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var n = neighborCount(g, r, c, wrap), i = r * cols + c, f;
      if (g[r][c]) {
        ex.alive++;
        if (survives[n]) { f = 'stays'; ex.stay++; }
        else { ex.died++; f = minS == null ? 'none' : n < minS ? 'few' : n > maxS ? 'many' : 'gap'; ex[f]++; }
      } else if (births[n]) { f = 'born'; ex.born++; }
      else f = 'empty';
      ex.fate[i] = f;
    }
    ex.nextPop = ex.born + ex.stay;
    return ex;
  }
  // The four predict-then-run answers, read off detectDynamics (the badge's own
  // shape/repeat tracking); null while the run is still evolving.
  function predictOutcomeOf(dyn) { if (!dyn) return null; return dyn.kind === 'extinct' ? 'dies' : dyn.kind === 'stable' ? 'settles' : dyn.kind === 'oscillator' ? 'repeats' : dyn.kind === 'spaceship' ? 'flies' : null; }
  function hash36(s) { var h1 = 2166136261; for (var i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619); } return (h1 >>> 0).toString(36); }
  // Moves a wrapped axis so the longest empty stretch sits at the ends: a shape
  // across the seam then reads the same as one in the middle of the grid.
  function unrollAxis(cells, axis, size) {
    var used = new Uint8Array(size), best = 0, bestEnd = -1, run = 0;
    cells.forEach(function (rc) { used[rc[axis]] = 1; });
    for (var i = 0; i < size * 2; i++) { if (used[i % size]) run = 0; else { run++; if (run > best && run <= size) { best = run; bestEnd = i; } } }
    if (!best) return cells;
    var start = (bestEnd + 1) % size;
    return cells.map(function (rc) { var o = rc.slice(); o[axis] = (rc[axis] - start + size) % size; return o; });
  }
  // One text for a shape wherever it sits, in any of its 8 turns and mirrors
  // (above 64 squares nobody redraws one by hand, so only its position is ignored).
  function canonicalShape(g, wrap) {
    var rows = g.length, cols = rows ? g[0].length : 0, cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (g[r][c]) cells.push([r, c]);
    if (!cells.length) return '';
    if (wrap) { cells = unrollAxis(cells, 0, rows); cells = unrollAxis(cells, 1, cols); }
    var best = null, turns = cells.length > 64 ? 1 : 8;
    for (var t8 = 0; t8 < turns; t8++) {
      var pts = cells.map(function (rc) { var a = t8 & 4 ? rc[1] : rc[0], b = t8 & 4 ? rc[0] : rc[1]; return [t8 & 1 ? -a : a, t8 & 2 ? -b : b]; });
      var minA = Infinity, minB = Infinity;
      pts.forEach(function (p) { if (p[0] < minA) minA = p[0]; if (p[1] < minB) minB = p[1]; });
      var text = pts.map(function (p) { return (p[0] - minA) * 1024 + (p[1] - minB); }).sort(function (x, y) { return x - y; }).join(',');
      if (best === null || text < best) best = text;
    }
    return best;
  }
  // A start is its shape and its rule. Size and edges stay out: flipping the edges
  // or resizing does not make a watched or already paid start new.
  function startKeyOf(g, wrap, birthRule, survivalRule) { return 'pr_' + hash36(canonicalShape(g, wrap) + '|B' + birthRule + '/S' + survivalRule); }
  // The gallery's shapes as the Patterns tab draws them (first 4 generations), for
  // starts redrawn by hand. They only behave as named under Life's own rule.
  var galleryShapes = null;
  function isGalleryShape(g, wrap, birthRule, survivalRule) {
    if (birthRule !== '3' || survivalRule !== '23') return false;
    if (!galleryShapes) {
      galleryShapes = {};
      Object.keys(LIFE_PATTERNS).forEach(function (k) {
        var pat = LIFE_PATTERNS[k], size = Math.max(pat.w, pat.h) + 24, gr = stampPattern(emptyGrid(size, size), k, 12, 12);
        var phases = pat.kind === 'still' || pat.kind === 'oscillator' || pat.kind === 'spaceship' ? 4 : 1;
        for (var i = 0; i < phases; i++) { galleryShapes[canonicalShape(gr, false)] = true; gr = stepLife(gr, false, '3', '23'); }
      });
    }
    return galleryShapes[canonicalShape(g, wrap)] === true;
  }
  window.__alloCellularPure = { emptyGrid: emptyGrid, randomGrid: randomGrid, countPop: countPop, populationBounds: populationBounds, shapeFingerprint: shapeFingerprint, detectDynamics: detectDynamics, neighborCount: neighborCount, stepLife: stepLife, stepLifeDetailed: stepLifeDetailed, parseLifeRule: parseLifeRule, gridSignature: gridSignature, stampPattern: stampPattern, ruleToBits: ruleToBits, bitsToRule: bitsToRule, stepRuleRow: stepRuleRow, buildCaRows: buildCaRows, caCellCause: caCellCause, caCounterfactualInfluence: caCounterfactualInfluence, analyzeCaSensitivityRow: analyzeCaSensitivityRow, caRuleSensitivityProfile: caRuleSensitivityProfile, caCausalCone: caCausalCone, caCellTransition: caCellTransition, caTemporalChangeCells: caTemporalChangeCells, analyzeCaRows: analyzeCaRows, analyzeLifePhase: analyzeLifePhase, analyzePatternEvolution: analyzePatternEvolution, analyzePatternJourney: analyzePatternJourney, analyzeLifeForecastMotion: analyzeLifeForecastMotion, analyzeLifeForecastResidency: analyzeLifeForecastResidency, compareLifeStates: compareLifeStates, projectLifeFuture: projectLifeFuture, patterns: LIFE_PATTERNS,
    parseRuleNumber: parseRuleNumber, mulberry32: mulberry32, soupGrid: soupGrid, seededRow: seededRow, lifeRun: lifeRun, lifeJump: lifeJump, countGroups: countGroups,
    forestInit: forestInit, forestStep: forestStep, forestSummary: forestSummary, forestRun: forestRun, trafficRun: trafficRun, epidemicInit: epidemicInit, epidemicStep: epidemicStep, epidemicSummary: epidemicSummary, epidemicRun: epidemicRun,
    caMeasure: caMeasure, CLASS_BANK: CLASS_BANK, classOfRule: classOfRule, makeClassProblem: makeClassProblem, makeNextGenProblem: makeNextGenProblem, gradeNextGen: gradeNextGen,
    buildCsv: buildCsv, fitRunLog: fitRunLog, challengeVerdict: challengeVerdict, pceEvidence: pceEvidence, PCE_CARDS: PCE_CARDS,
    famRule: famRule, famRuleName: famRuleName, famIsLife: famIsLife, famStep: famStep, famCounts: famCounts, famSoup: famSoup, famObjects: famObjects, famFindSpaceship: famFindSpaceship, famMeasure: famMeasure, famMeasureMany: famMeasureMany, famRandomRule: famRandomRule, famNeighbourRules: famNeighbourRules, FAMILY_PRESETS: FAMILY_PRESETS, FAM_OUTCOMES: FAM_OUTCOMES,
    antInit: antInit, antAdvance: antAdvance, antAt: antAt, antHighway: antHighway, makeAntProblem: makeAntProblem, gradeAntProblem: gradeAntProblem,
    GLIDER_HEADINGS: GLIDER_HEADINGS, GLIDER_STARS: GLIDER_STARS, gliderBoard: gliderBoard, gliderMeasure: gliderMeasure, gliderReaches: gliderReaches, makeGliderRound: makeGliderRound, gliderPickTag: gliderPickTag, atlasAbbr: atlasAbbr, seededRng: seededRng,
    pathSteps: pathSteps, TAB_ORDERS: TAB_ORDERS, antPitch: antPitch, huntBucket: huntBucket,
    lifeRuleWords: lifeRuleWords, explainLifeStep: explainLifeStep, predictOutcomeOf: predictOutcomeOf, startKeyOf: startKeyOf, canonicalShape: canonicalShape, isGalleryShape: isGalleryShape, LIFE_PREDICT_OPTIONS: LIFE_PREDICT_OPTIONS, PREDICT_XP_CAP: PREDICT_XP_CAP, PREDICT_TIMEOUT: PREDICT_TIMEOUT };

  // Contrast theme: hovered buttons, owned by this tool (allo-cellular-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-cellular-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-cellular-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"cellularLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"cellularLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"cellularLab\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  window.StemLab.registerTool('cellularLab', {
    icon: '\u25A6',
    label: 'Cellular Automaton Lab',
    desc: "Explore 2-D Life-like worlds and all 256 elementary Wolfram rules: seeded experiments with a run log, predict-check-explain cards, generated practice, claim-evidence-reasoning investigations, forest-fire, traffic, epidemic and K-5 glider missions, plus Seeds, Brian's Brain and Langton's ant with Moore or von Neumann neighbourhoods and a live rule-space spaceship hunt.",
    color: 'emerald',
    category: 'math',
    // Labels are getters: they read the translator the last render installed
    // (cellTranslate), so the host's quest list follows the student's language.
    questHooks: [
      { id: 'cell_draw', get label() { return t('stem.cellular.quest_draw', 'Draw cells on the grid'); }, icon: '✏️',
        check: function (d) { return !!(d && d.drew); },
        progress: function (d) { return (d && d.drew) ? '✓' : t('stem.cellular.quest_pending', 'pending'); } },
      { id: 'cell_run', get label() { return t('stem.cellular.quest_run', 'Run Life for 50+ generations'); }, icon: '▶️',
        check: function (d) { return !!(d && d.ranLong); },
        progress: function (d) { var g = (d && d.maxGen) || 0; return g >= 50 ? '✓' : fmt(t('stem.cellular.quest_best_gen', 'best: gen {g}'), { g: g }); } },
      { id: 'cell_stamp', get label() { return t('stem.cellular.quest_stamp', 'Stamp a pattern from the library'); }, icon: '✨',
        check: function (d) { return !!(d && d.stamped); },
        progress: function (d) { return (d && d.stamped) ? '✓' : t('stem.cellular.quest_pending', 'pending'); } },
      { id: 'cell_gun', get label() { return t('stem.cellular.quest_gun', 'Load the Gosper glider gun'); }, icon: '🔫',
        check: function (d) { return !!(d && d.sawGun); },
        progress: function (d) { return (d && d.sawGun) ? '✓' : t('stem.cellular.quest_pending', 'pending'); } },
      { id: 'cell_rule', get label() { return t('stem.cellular.quest_rule', 'Explore an elementary rule'); }, icon: '📜',
        check: function (d) { return !!(d && d.exploredRule); },
        progress: function (d) { return (d && d.exploredRule) ? '✓' : t('stem.cellular.quest_pending', 'pending'); } },
      { id: 'cell_challenge', get label() { return t('stem.cellular.quest_challenge', 'Complete a pattern design challenge'); }, icon: '🎯',
        check: function (d) { return !!(d && d.challengeCompleted); },
        progress: function (d) { return (d && d.challengeCompleted) ? t('stem.cellular.quest_complete', 'complete') : t('stem.cellular.quest_pending', 'pending'); } },
      { id: 'cell_110', get label() { return t('stem.cellular.quest_110', 'View Rule 110 (Turing-complete)'); }, icon: '🧠',
        check: function (d) { return !!(d && d.saw110); },
        progress: function (d) { return (d && d.saw110) ? '✓' : t('stem.cellular.quest_pending', 'pending'); } }
    ],
    render: function (ctx) {
      return ctx.React.createElement(CellularLab, { ctx: ctx });
    }
  });
})();
