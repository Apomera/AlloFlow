// ═══════════════════════════════════════════════════════════════
// stem_tool_angles.js — Angle Explorer Plugin
// Real protractor reading and drawing (rotated base rays, double scale,
// movable protractor, named misconceptions), benchmark estimation,
// missing-angle puzzles (complementary to transversals), radians in pi
// form, non-visual equivalents, grade bands, teacher hooks, and the
// original explorer, challenges and reference library. Stage B: polygon
// angle-sum investigation (claim, evidence, reasoning), exterior walk and
// tiling, circle theorems, the unit circle, real contexts (clocks, bearings,
// ramps, roofs), compass constructions, and pointer-capture drags.
// Registered tool ID: "protractor"
// ═══════════════════════════════════════════════════════════════

function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  // Contrast theme: hovered buttons, owned by this tool (allo-angles-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-angles-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-angles-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"protractor\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"protractor\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"protractor\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}.theme-contrast [data-stem-tool-shell=\"protractor\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h):is([aria-label],[title]):not(:has(*)){text-shadow:0 0 1px #000,0 0 1px #000,0 0 1px #000!important}";
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 1.4.3 high contrast: host buttons go black with green ink; drop the gradient painted over that black
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-angles-hc-css')) return;
    var st = document.createElement('style');
    // The hub's contrast remap blacks out -50 panels and lightens -600/-700 ink only:
    // the darker -800/-900/-950 ink and pale -100/-200 tints this tool uses need the same.
    st.id = 'allo-angles-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"protractor\"] button[class*=\"bg-gradient\"]{background-image:none!important}.theme-contrast [data-stem-tool-shell=\"protractor\"] [class*=\"text-\"][class*=\"-800\"],.theme-contrast [data-stem-tool-shell=\"protractor\"] [class*=\"text-\"][class*=\"-900\"],.theme-contrast [data-stem-tool-shell=\"protractor\"] [class*=\"text-\"][class*=\"-950\"]{color:#ffffff!important}.theme-contrast [data-stem-tool-shell=\"protractor\"] [class*=\"bg-\"][class*=\"-100\"],.theme-contrast [data-stem-tool-shell=\"protractor\"] [class*=\"bg-\"][class*=\"-200\"]{background-color:#000000!important}";
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-angles')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-angles';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) { /* silent */ }
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) { /* silent */ }
  }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxTick() { playTone(1200, 0.02, 'square', 0.03); }

  // ══════════════════════════════════════════════════════════════
  // ── Angle engine: pure functions, no render state. Exported as
  //    window.StemLab.anglesCore so tests run the math itself.
  //    Directions are degrees counterclockwise from "east"; SVG y
  //    points down, so a point is (x + r cos, y - r sin).
  // ══════════════════════════════════════════════════════════════
  var ANG = (function() {
    var PI = Math.PI;
    function normDeg(a) { a = a % 360; if (a < 0) a += 360; return a; }
    function classify(a) {
      if (a === 0) return 'Zero';
      if (a < 90) return 'Acute';
      if (a === 90) return 'Right';
      if (a < 180) return 'Obtuse';
      if (a === 180) return 'Straight';
      if (a < 360) return 'Reflex';
      return 'Full';
    }
    // The smaller angle between two ray directions (0..180).
    function between(d1, d2) { var x = Math.abs(normDeg(d1) - normDeg(d2)); return x > 180 ? 360 - x : x; }
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var r = a % b; a = b; b = r; } return a || 1; }
    function pt(x, y, r, deg) { var a = deg * PI / 180; return { x: x + r * Math.cos(a), y: y - r * Math.sin(a) }; }
    // Whole degrees as a reduced multiple of pi: 90 -> "π/2", 270 -> "3π/2".
    function piForm(deg) {
      var n = Math.round(deg);
      if (n === 0) return '0';
      var g = gcd(n, 180), num = n / g, den = 180 / g;
      var s = (num === 1 ? '' : num === -1 ? '−' : String(num).replace('-', '−')) + 'π';
      return den === 1 ? s : s + '/' + den;
    }
    // A typed number: "47", "47°", "-3", "2.5". Anything else is NaN.
    function toNum(v) {
      if (typeof v === 'number') return isFinite(v) ? v : NaN;
      var s = String(v == null ? '' : v).replace(/−/g, '-').replace(/°|deg(rees?)?/gi, '').trim();
      return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
    }
    // A typed radian measure: "5π/6", "5pi/6", "pi", "2π", "(3/4)π", "3/4 pi" or a decimal like "2.618".
    function parseRadians(v) {
      if (typeof v === 'number') return isFinite(v) ? v : NaN;
      var s = String(v == null ? '' : v).toLowerCase().replace(/−/g, '-').replace(/\s+/g, '').replace(/π|pi/g, 'p').replace(/rad(ians?)?$/, '');
      if (!s) return NaN;
      var m = s.match(/^([+-]?)(\d+(?:\.\d+)?)?\*?p(?:\/(\d+(?:\.\d+)?))?$/);
      if (m) {
        var c = m[2] ? parseFloat(m[2]) : 1, den = m[3] ? parseFloat(m[3]) : 1;
        if (!den) return NaN;
        return (m[1] === '-' ? -1 : 1) * c * PI / den;
      }
      m = s.match(/^([+-]?)\(?(\d+)\/(\d+)\)?\*?p$/);
      if (m) { var dd = parseFloat(m[3]); if (!dd) return NaN; return (m[1] === '-' ? -1 : 1) * parseFloat(m[2]) / dd * PI; }
      return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s) ? parseFloat(s) : NaN;
    }
    // Readings of a direction seen from the protractor centre. The inner scale
    // counts up counterclockwise from the right end of the baseline (the
    // direction `rot`); the outer scale counts up from the left end. Null when
    // the direction falls below the baseline, off the half circle.
    function scaleReading(rot, dir) {
      var rel = normDeg(dir - rot);
      if (rel > 180.5 && rel < 359.5) return null;
      if (rel >= 359.5) rel = 0;
      rel = Math.min(rel, 180);
      return { inner: rel, outer: 180 - rel };
    }
    // Where a ray from the vertex crosses the scale circle (radius R round the
    // protractor centre), read from the centre: what a student sees on the scale.
    function rayReading(vx, vy, dir, place, R) {
      if (!place) return null;
      var a = dir * PI / 180, ux = Math.cos(a), uy = -Math.sin(a);
      var fx = vx - place.x, fy = vy - place.y;
      var b = fx * ux + fy * uy, c = fx * fx + fy * fy - R * R, disc = b * b - c;
      if (disc < 0) return null;
      var tHit = -b + Math.sqrt(disc);
      if (tHit <= 0) return null;
      var hx = vx + tHit * ux - place.x, hy = vy + tHit * uy - place.y;
      return scaleReading(place.rot, normDeg(Math.atan2(-hy, hx) * 180 / PI));
    }
    var VERTEX_TOL = 4;      // centre counts as "on the vertex" within this many units
    var VERTEX_SNAP = 8;     // a drag or key move this close snaps onto the vertex
    function otherDir(task) { return normDeg(task.base + task.open * task.m); }
    // Grade a typed protractor reading against the measure, and name the misconception.
    function diagnoseReading(task, answer, place) {
      var v = toNum(answer);
      if (!isFinite(v)) return { code: 'nan' };
      var tol = task.tol || 1, m = task.m;
      if (Math.abs(v - m) <= tol) return { code: 'ok' };
      if (Math.abs(m - 90) > tol && Math.abs(v - (180 - m)) <= tol) return { code: 'wrong_scale' };
      if (Math.abs(v - (360 - m)) <= tol) return { code: 'reflex' };
      var dist = place ? Math.sqrt(Math.pow(place.x - task.vx, 2) + Math.pow(place.y - task.vy, 2)) : Infinity;
      if (dist > VERTEX_TOL) return { code: 'vertex_off' };
      var rb = scaleReading(place.rot, task.base), ro = scaleReading(place.rot, otherDir(task));
      if (rb && ro && ((Math.abs(v - ro.inner) <= tol && rb.inner > tol) || (Math.abs(v - ro.outer) <= tol && rb.outer > tol))) return { code: 'wrong_zero' };
      if (Math.abs(v - m) <= 3 * tol + 2) return { code: 'close' };
      return { code: 'off' };
    }
    // Grade a drawn ray: the angle it makes with the base ray, either side.
    function diagnoseDrawing(task, drawDir) {
      var drawn = Math.round(between(task.base, drawDir)), tol = task.tol || 1, m = task.m;
      if (Math.abs(drawn - m) <= tol) return { code: 'ok', drawn: drawn };
      if (Math.abs(m - 90) > tol && Math.abs(drawn - (180 - m)) <= tol) return { code: 'wrong_scale', drawn: drawn };
      if (Math.abs(drawn - m) <= 3 * tol + 2) return { code: 'close', drawn: drawn };
      return { code: 'off', drawn: drawn };
    }
    function diagnoseCompare(task, choice) {
      if (choice === task.answer) return { code: 'ok' };
      var longer = task.a.len > task.b.len ? 'A' : (task.b.len > task.a.len ? 'B' : null);
      if (longer && choice === longer) return { code: 'ray_length' };
      return { code: 'off' };
    }
    // Benchmarks for estimation: brackets between 0, 45, 90, 135, 180, 270 and 360.
    var BENCH = [0, 45, 90, 135, 180, 270, 360];
    function benchIndex(m) {
      for (var i = 0; i < BENCH.length - 1; i++) if (m > BENCH[i] && m < BENCH[i + 1]) return i;
      return -1;
    }
    function nearBench(m, gap) { for (var i = 0; i < BENCH.length; i++) if (Math.abs(m - BENCH[i]) < gap) return true; return false; }
    function rnd(rng) { var r = (typeof rng === 'function') ? rng() : Math.random(); return (typeof r === 'number' && r >= 0 && r < 1) ? r : 0; }
    function randInt(rng, lo, hi) { return lo + Math.floor(rnd(rng) * (hi - lo + 1)); }
    function pick(rng, arr) { return arr[Math.floor(rnd(rng) * arr.length) % arr.length]; }
    var LEVELS = ['g4', 'g57', 'g8'];
    function levelFromBand(band) { return band === 'g912' ? 'g8' : (band === 'g68' ? 'g57' : (band === 'k2' || band === 'g35') ? 'g4' : 'g57'); }
    function readTol(level) { return level === 'g4' ? 2 : 1; }
    // A measuring task: the vertex, a base ray at any rotation, and an opening
    // to the left (counterclockwise, +1) or the right (clockwise, -1).
    function makeMeasureTask(rng, level) {
      var m;
      if (level === 'g4' && rnd(rng) < 0.6) m = 5 * randInt(rng, 3, 33);
      else m = randInt(rng, 12, 168);
      var base = randInt(rng, 0, 359), open = rnd(rng) < 0.5 ? 1 : -1;
      var offs = [[-80, 60], [80, 60], [-70, -60], [70, -70], [0, 90]];
      var o = pick(rng, offs);
      return { base: base, open: open, m: m, vx: 210, vy: 175, tol: readTol(level), start: { x: 210 + o[0], y: 175 + o[1], rot: 0 } };
    }
    function makeDrawTask(rng, level) {
      var t = makeMeasureTask(rng, level);
      t.drawStart = normDeg(t.base + t.open * (t.m < 90 ? 150 : 30));
      return t;
    }
    function makeCompareTask(rng) {
      var same = rnd(rng) < 0.25;
      var small = randInt(rng, 25, 120);
      var big = same ? small : small + randInt(rng, 15, 45);
      var bigFirst = rnd(rng) < 0.5;
      var trap = rnd(rng) < 0.75; // the smaller opening gets the longer rays
      var mA = bigFirst ? big : small, mB = bigFirst ? small : big;
      var long = 120, short = 60;
      var lenA, lenB;
      if (same) { lenA = rnd(rng) < 0.5 ? long : short; lenB = lenA === long ? short : long; }
      else if (trap) { lenA = mA < mB ? long : short; lenB = mB < mA ? long : short; }
      else { lenA = mA > mB ? long : short; lenB = mB > mA ? long : short; }
      return { a: { m: mA, len: lenA, base: randInt(rng, 0, 359) }, b: { m: mB, len: lenB, base: randInt(rng, 0, 359) }, answer: same ? 'same' : (mA > mB ? 'A' : 'B') };
    }
    // An off-grid estimation target, kept clear of the benchmarks.
    function makeEstimate(rng, level) {
      var hi = level === 'g4' ? 175 : 355, m = 0, guard = 0;
      do { m = randInt(rng, 8, hi); guard++; } while ((m % 15 === 0 || nearBench(m, 5)) && guard < 50);
      return { target: m, base: level === 'g4' ? 15 * randInt(rng, 0, 23) : randInt(rng, 0, 359) };
    }
    function estimateTol(level, streak) {
      var base = level === 'g4' ? 10 : (level === 'g57' ? 8 : 6);
      return Math.max(3, base - Math.floor((streak || 0) / 3));
    }

    // ── Missing-angle puzzles ──
    var PUZZLE_KINDS = { g4: ['comp', 'supp', 'point'], g57: ['comp', 'supp', 'vert', 'point', 'tri'], g8: ['comp', 'supp', 'vert', 'point', 'tri', 'trans', 'rad'] };
    // Two parallel lines cut by a transversal. Intersection i (0 top, 1 bottom),
    // corner p: 0 upper-right, 1 upper-left, 2 lower-left, 3 lower-right. The
    // transversal leaves the intersection upward at direction alpha.
    function transValue(alpha, p) { return p % 2 === 0 ? alpha : 180 - alpha; }
    function transRelation(i1, p1, i2, p2) {
      if (i1 === i2) { if (p1 === p2) return 'same'; return ((p1 + 2) % 4 === p2) ? 'vertical' : 'linear'; }
      if (p1 === p2) return 'corresponding';
      var interior = function(i, p) { return i === 0 ? (p === 2 || p === 3) : (p === 0 || p === 1); };
      var right = function(p) { return p === 0 || p === 3; };
      var in1 = interior(i1, p1), in2 = interior(i2, p2), sameSide = right(p1) === right(p2);
      if (in1 && in2) return sameSide ? 'co_interior' : 'alt_interior';
      if (!in1 && !in2) return sameSide ? 'co_exterior' : 'alt_exterior';
      return null;
    }
    var EQUAL_RELS = { vertical: true, corresponding: true, alt_interior: true, alt_exterior: true };
    var RAD_DEGS = [30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];
    function makePuzzle(kind, rng, level) {
      var g4 = level === 'g4';
      var r5 = function(lo, hi) { return g4 ? 5 * randInt(rng, Math.ceil(lo / 5), Math.floor(hi / 5)) : randInt(rng, lo, hi); };
      var rot = randInt(rng, 0, 11) * 30 + (g4 ? 0 : randInt(rng, 0, 20));
      var p;
      if (kind === 'comp') {
        var a = r5(10, 80);
        p = { kind: kind, a: a, answer: 90 - a, rot: rot, id: 'comp:' + a };
      } else if (kind === 'supp') {
        var s; do { s = r5(20, 160); } while (Math.abs(s - 90) < 6);
        p = { kind: kind, a: s, answer: 180 - s, rot: rot, id: 'supp:' + s };
      } else if (kind === 'vert') {
        var v; do { v = randInt(rng, 25, 155); } while (Math.abs(v - 90) < 6);
        var ask = rnd(rng) < 0.5 ? 'vertical' : 'linear';
        var askPos = ask === 'vertical' ? 2 : (rnd(rng) < 0.5 ? 1 : 3);
        p = { kind: kind, a: v, ask: ask, askPos: askPos, answer: ask === 'vertical' ? v : 180 - v, rot: rot, id: 'vert:' + v + ':' + askPos };
      } else if (kind === 'point') {
        var n = g4 ? 3 : (rnd(rng) < 0.5 ? 3 : 4), parts = [], sum = 0, guard = 0;
        do {
          parts = []; sum = 0;
          for (var i = 0; i < n - 1; i++) { var x = r5(40, 140); parts.push(x); sum += x; }
          guard++;
        } while ((360 - sum < 30 || 360 - sum > 200) && guard < 60);
        if (360 - sum < 30 || 360 - sum > 200) { parts = n === 3 ? [100, 120] : [80, 90, 100]; sum = parts.reduce(function(q, w) { return q + w; }, 0); }
        p = { kind: kind, parts: parts, answer: 360 - sum, rot: rot, id: 'point:' + parts.join('-') };
      } else if (kind === 'tri') {
        var A, B, guard2 = 0;
        do { A = randInt(rng, 25, 110); B = randInt(rng, 25, 110); guard2++; } while ((A + B > 155 || A + B < 70) && guard2 < 60);
        if (A + B > 155 || A + B < 70) { A = 50; B = 60; }
        var C = 180 - A - B, which = randInt(rng, 0, 2);
        var angs = [A, B, C];
        p = { kind: kind, angles: angs, which: which, answer: angs[which], id: 'tri:' + angs.join('-') + ':' + which };
      } else if (kind === 'trans') {
        var al; do { al = randInt(rng, 35, 145); } while (Math.abs(al - 90) < 8);
        var rel = null, i1 = 0, p1 = 0, i2 = 1, p2 = 0, guard3 = 0;
        do {
          i1 = randInt(rng, 0, 1); p1 = randInt(rng, 0, 3); i2 = randInt(rng, 0, 1); p2 = randInt(rng, 0, 3);
          rel = transRelation(i1, p1, i2, p2); guard3++;
        } while ((rel === null || rel === 'same' || (i1 === i2 && rnd(rng) < 0.6)) && guard3 < 80);
        if (rel === null || rel === 'same') { i1 = 0; p1 = 2; i2 = 1; p2 = 0; rel = 'alt_interior'; }
        p = { kind: kind, alpha: al, given: { i: i1, p: p1 }, ask: { i: i2, p: p2 }, rel: rel, a: transValue(al, p1), answer: transValue(al, p2), id: 'trans:' + al + ':' + i1 + p1 + i2 + p2 };
      } else {
        var deg = pick(rng, RAD_DEGS), dir = rnd(rng) < 0.5 ? 'toRad' : 'toDeg';
        p = { kind: 'rad', deg: deg, dir: dir, answer: dir === 'toRad' ? piForm(deg) : deg, id: 'rad:' + deg + ':' + dir };
      }
      return p;
    }
    function near(v, x, tol) { return isFinite(v) && Math.abs(v - x) <= (tol == null ? 0.5 : tol); }
    // Grade a puzzle answer and name the misconception behind a wrong one.
    function diagnosePuzzle(p, answer) {
      if (p.kind === 'rad') {
        if (p.dir === 'toRad') {
          var r = parseRadians(answer), want = p.deg * PI / 180;
          if (!isFinite(r)) return { code: 'nan' };
          if (Math.abs(r - want) <= 0.01) return { code: 'ok' };
          if (Math.abs(r - want / 2) <= 0.01) return { code: 'rad_used_360' };
          if (near(r, p.deg)) return { code: 'rad_typed_degrees' };
          return { code: 'off' };
        }
        var dv = toNum(answer);
        if (!isFinite(dv)) return { code: 'nan' };
        if (near(dv, p.deg)) return { code: 'ok' };
        if (near(dv, p.deg * 2)) return { code: 'rad_pi_is_360' };
        if (near(dv, p.deg * PI / 180, 0.02)) return { code: 'rad_typed_radians' };
        return { code: 'off' };
      }
      var v = toNum(answer);
      if (!isFinite(v)) return { code: 'nan' };
      if (near(v, p.answer)) return { code: 'ok' };
      if (p.kind === 'comp') { if (near(v, 180 - p.a)) return { code: 'used_180' }; if (near(v, p.a)) return { code: 'copied_given' }; }
      if (p.kind === 'supp') { if (near(v, 90 - p.a)) return { code: 'used_90' }; if (near(v, p.a)) return { code: 'copied_given' }; }
      if (p.kind === 'vert') {
        if (p.ask === 'vertical' && near(v, 180 - p.a)) return { code: 'vert_is_supp' };
        if (p.ask === 'linear' && near(v, p.a)) return { code: 'linear_is_equal' };
      }
      if (p.kind === 'point') {
        var sum = p.parts.reduce(function(q, w) { return q + w; }, 0);
        if (near(v, 180 - sum) || near(v, sum - 180)) return { code: 'point_used_180' };
        if (near(v, sum)) return { code: 'gave_sum' };
      }
      if (p.kind === 'tri') {
        var known = p.angles.filter(function(_, i) { return i !== p.which; });
        var ks = known[0] + known[1];
        if (near(v, 360 - ks)) return { code: 'tri_used_360' };
        if (near(v, ks)) return { code: 'gave_sum' };
      }
      if (p.kind === 'trans') {
        if (EQUAL_RELS[p.rel] && near(v, 180 - p.answer)) return { code: 'trans_equal_as_supp' };
        if (!EQUAL_RELS[p.rel] && near(v, p.a)) return { code: 'trans_supp_as_equal' };
      }
      if (Math.abs(v - p.answer) <= 10) return { code: 'arith' };
      return { code: 'off' };
    }
    // The reason that justifies a puzzle's answer (claim-evidence-reasoning step).
    function puzzleReason(p) {
      if (p.kind === 'comp') return 'comp';
      if (p.kind === 'supp') return 'linear';
      if (p.kind === 'vert') return p.ask === 'vertical' ? 'vertical' : 'linear';
      if (p.kind === 'point') return 'point';
      if (p.kind === 'tri') return 'tri';
      if (p.kind === 'trans') return p.rel;
      return null;
    }
    // A credited-items map that never grows past `cap` entries (oldest out first).
    function creditKey(map, key, cap) {
      var m = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
      if (Object.prototype.hasOwnProperty.call(m, key)) return { isNew: false, map: m };
      var next = {}, keys = Object.keys(m);
      keys.sort(function(x, y) { return (Number(m[x]) || 0) - (Number(m[y]) || 0); });
      var limit = cap || 600;
      keys.slice(Math.max(0, keys.length - limit + 1)).forEach(function(k) { next[k] = m[k]; });
      next[key] = Date.now();
      return { isNew: true, map: next };
    }
    // A clock-face position for a direction: east is 3 o'clock, north is 12.
    function clockHour(dir) { var hr = Math.round((90 - normDeg(dir)) / 30); hr = ((hr % 12) + 12) % 12; return hr === 0 ? 12 : hr; }
    return {
      normDeg: normDeg, classify: classify, between: between, gcd: gcd, pt: pt, piForm: piForm, toNum: toNum,
      parseRadians: parseRadians, scaleReading: scaleReading, rayReading: rayReading, otherDir: otherDir,
      VERTEX_TOL: VERTEX_TOL, VERTEX_SNAP: VERTEX_SNAP, diagnoseReading: diagnoseReading, diagnoseDrawing: diagnoseDrawing,
      diagnoseCompare: diagnoseCompare, BENCH: BENCH, benchIndex: benchIndex, LEVELS: LEVELS, levelFromBand: levelFromBand,
      readTol: readTol, makeMeasureTask: makeMeasureTask, makeDrawTask: makeDrawTask, makeCompareTask: makeCompareTask,
      makeEstimate: makeEstimate, estimateTol: estimateTol, PUZZLE_KINDS: PUZZLE_KINDS, transValue: transValue,
      transRelation: transRelation, EQUAL_RELS: EQUAL_RELS, makePuzzle: makePuzzle, diagnosePuzzle: diagnosePuzzle,
      puzzleReason: puzzleReason, creditKey: creditKey, clockHour: clockHour, rnd: rnd, randInt: randInt, pick: pick, near: near
    };
  })();
  // ══════════════════════════════════════════════════════════════
  // ── Stage B engine: polygon angle sums, tessellation, circle theorems,
  //    the unit circle, real contexts and compass constructions. Pure
  //    functions on ANG (window.StemLab.anglesCore) so tests run them.
  // ══════════════════════════════════════════════════════════════
  (function() {
    var PI = Math.PI, normDeg = ANG.normDeg, toNum = ANG.toNum, rnd = ANG.rnd, randInt = ANG.randInt, pick = ANG.pick, near = ANG.near;
    function seedRng(seed) { var s = seed >>> 0; return function() { s = (s + 0x6D2B79F5) >>> 0; var q = Math.imul(s ^ (s >>> 15), 1 | s); q = (q + Math.imul(q ^ (q >>> 7), 61 | q)) ^ q; return ((q ^ (q >>> 14)) >>> 0) / 4294967296; }; }
    function r1(x) { return Math.round(x * 10) / 10; }
    function r2(x) { return Math.round(x * 100) / 100; }

    // ── Polygons ──
    function polySum(n) { return (n - 2) * 180; }
    function regInterior(n) { return (n - 2) * 180 / n; }
    function regExterior(n) { return 360 / n; }
    // A convex polygon with whole-degree angles: n exterior turns that add to
    // 360, with the last two sides solved so the walk closes. Points fit a
    // W x H box (SVG y down), counterclockwise on screen.
    function makePolygon(rng, n, W, H, regular) {
      W = W || 320; H = H || 240;
      var ext = null, L = null, hd = null, i;
      for (var tries = 0; tries < 400 && !L; tries++) {
        ext = [];
        if (regular) { for (i = 0; i < n; i++) ext.push(360 / n); }
        else {
          var w = [], tot = 0, s = 0;
          for (i = 0; i < n; i++) { var x = 0.6 + rnd(rng); w.push(x); tot += x; }
          for (i = 0; i < n; i++) { ext.push(Math.round(w[i] / tot * 360)); s += ext[i]; }
          ext[n - 1] += 360 - s;
          if (ext.some(function(e) { return e < 15 || e > 150; })) continue;
        }
        hd = [0];
        for (i = 1; i < n; i++) hd.push(hd[i - 1] + ext[i]);
        var lens = [], sx = 0, sy = 0;
        for (i = 0; i < n - 2; i++) { lens.push(regular ? 1 : 0.6 + 0.8 * rnd(rng)); sx += lens[i] * Math.cos(hd[i] * PI / 180); sy += lens[i] * Math.sin(hd[i] * PI / 180); }
        var ux = Math.cos(hd[n - 2] * PI / 180), uy = Math.sin(hd[n - 2] * PI / 180), vx = Math.cos(hd[n - 1] * PI / 180), vy = Math.sin(hd[n - 1] * PI / 180);
        var det = ux * vy - uy * vx;
        if (Math.abs(det) < 1e-9) continue;
        var a = (-sx * vy + vx * sy) / det, b = (-ux * sy + sx * uy) / det;
        if (!regular && (a < 0.35 || a > 2.2 || b < 0.35 || b > 2.2)) continue;
        if (regular && (a <= 0 || b <= 0)) continue;
        L = lens.concat([a, b]);
      }
      if (!L) return makePolygon(rng, n, W, H, true);
      var raw = [{ x: 0, y: 0 }];
      for (i = 0; i < n - 1; i++) raw.push({ x: raw[i].x + L[i] * Math.cos(hd[i] * PI / 180), y: raw[i].y + L[i] * Math.sin(hd[i] * PI / 180) });
      var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      raw.forEach(function(p) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); });
      var m = 34, sc = Math.min((W - 2 * m) / ((maxx - minx) || 1), (H - 2 * m) / ((maxy - miny) || 1));
      var cxb = (minx + maxx) / 2, cyb = (miny + maxy) / 2;
      var pts = raw.map(function(p) { return { x: W / 2 + (p.x - cxb) * sc, y: H / 2 - (p.y - cyb) * sc }; });
      return { n: n, pts: pts, exterior: ext.slice(), interior: ext.map(function(e) { return 180 - e; }) };
    }
    // The interior angle at vertex k, measured from the points (SVG y down).
    function vertexAngle(pts, k) {
      var n = pts.length, p = pts[k], a = pts[(k + n - 1) % n], b = pts[(k + 1) % n];
      var d1 = Math.atan2(-(a.y - p.y), a.x - p.x) * 180 / PI, d2 = Math.atan2(-(b.y - p.y), b.x - p.x) * 180 / PI;
      return ANG.between(d1, d2);
    }
    function isAdjacent(n, i, j) { var dd = Math.abs(i - j); return dd === 1 || dd === n - 1; }
    // Two diagonals of a convex polygon cross when exactly one end of one lies strictly between the ends of the other.
    function chordsCross(p, q) {
      var a = p[0], b = p[1], c = q[0], e = q[1];
      if (a === c || a === e || b === c || b === e) return false;
      var lo = Math.min(a, b), hi = Math.max(a, b);
      var inC = c > lo && c < hi, inE = e > lo && e < hi;
      return inC !== inE;
    }
    function addDiagonal(n, diags, i, j) {
      var ds = Array.isArray(diags) ? diags : [];
      if (!(i >= 0 && i < n && j >= 0 && j < n) || i === j) return { code: 'same', diags: ds };
      if (isAdjacent(n, i, j)) return { code: 'side', diags: ds };
      var k = [Math.min(i, j), Math.max(i, j)];
      for (var q = 0; q < ds.length; q++) {
        if (ds[q][0] === k[0] && ds[q][1] === k[1]) return { code: 'dup', diags: ds };
        if (chordsCross(ds[q], k)) return { code: 'cross', diags: ds, with: ds[q] };
      }
      return { code: 'ok', diags: ds.concat([k]) };
    }
    // The regions a set of non-crossing diagonals cuts a convex n-gon into
    // (vertex lists). Complete when every region is a triangle.
    function polyRegions(n, diags) {
      var regions = [[]];
      for (var i = 0; i < n; i++) regions[0].push(i);
      (Array.isArray(diags) ? diags : []).forEach(function(dg) {
        for (var r = 0; r < regions.length; r++) {
          var reg = regions[r], ia = reg.indexOf(dg[0]), ib = reg.indexOf(dg[1]);
          if (ia === -1 || ib === -1) continue;
          var lo = Math.min(ia, ib), hi = Math.max(ia, ib);
          if (hi - lo < 2 || (lo === 0 && hi === reg.length - 1)) continue;
          var part1 = reg.slice(lo, hi + 1), part2 = reg.slice(hi).concat(reg.slice(0, lo + 1));
          regions.splice(r, 1, part1, part2);
          return;
        }
      });
      return regions;
    }
    function triangulated(n, diags) { var rs = polyRegions(n, diags); return rs.length === n - 2 && rs.every(function(r) { return r.length === 3; }); }
    // One row of the investigation: triangles counted and the angle sum.
    function diagnosePolyRow(n, tri, sum) {
      var t = toNum(tri), s = toNum(sum);
      if (!isFinite(t) || !isFinite(s)) return { code: 'nan' };
      var triOk = t === n - 2, sumOk = near(s, polySum(n));
      if (triOk && sumOk) return { code: 'ok' };
      if (!triOk) {
        if (t === n) return { code: 'tri_counted_sides' };
        if (t === n - 3) return { code: 'tri_counted_diagonals' };
        return { code: 'tri_off' };
      }
      if (near(s, n * 180)) return { code: 'sum_n180' };
      if (near(s, 360) && n !== 4) return { code: 'sum_360' };
      return { code: 'sum_arith' };
    }
    var PG_CLAIMS = {
      c_n2: function(n) { return (n - 2) * 180; },
      c_n: function(n) { return n * 180; },
      c_360: function() { return 360; },
      c_n1_90: function(n) { return (n - 1) * 90; }
    };
    // A claim fits the evidence when it predicts every recorded row.
    function claimCheck(id, runs) {
      var f = PG_CLAIMS[id];
      if (!f) return { fits: false, breaks: null };
      var ns = Object.keys(runs || {}).map(Number).filter(function(n) { return isFinite(n) && runs[n] && isFinite(runs[n].sum); }).sort(function(a, b) { return a - b; });
      for (var i = 0; i < ns.length; i++) if (f(ns[i]) !== runs[ns[i]].sum) return { fits: false, breaks: ns[i], predicted: f(ns[i]), measured: runs[ns[i]].sum };
      return { fits: true, breaks: null };
    }
    // Practice: sums, sides from a sum, a missing angle, regular and exterior angles.
    var PG_KINDS = { g4: ['sum', 'missing'], g57: ['sum', 'sides', 'missing', 'regular'], g8: ['sum', 'sides', 'missing', 'regular', 'ext', 'extn'] };
    function makePolyTask(kind, rng, level) {
      var g4 = level === 'g4', n;
      if (kind === 'sides') { n = randInt(rng, 5, 12); return { kind: kind, n: n, s: polySum(n), answer: n, id: 'pg:sides:' + n }; }
      if (kind === 'missing') {
        n = g4 ? 4 : randInt(rng, 4, 7);
        var seed = randInt(rng, 1, 999999999), shape = makePolygon(seedRng(seed), n, 320, 230);
        var which = randInt(rng, 0, n - 1);
        return { kind: kind, n: n, seed: seed, angles: shape.interior, which: which, answer: shape.interior[which], id: 'pg:miss:' + shape.interior.join('-') + ':' + which };
      }
      if (kind === 'regular' || kind === 'ext') {
        n = pick(rng, [5, 6, 8, 9, 10, 12]);
        return { kind: kind, n: n, answer: kind === 'ext' ? regExterior(n) : regInterior(n), id: 'pg:' + kind + ':' + n };
      }
      if (kind === 'extn') { n = pick(rng, [5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]); return { kind: kind, n: n, e: regExterior(n), answer: n, id: 'pg:extn:' + n }; }
      n = randInt(rng, 3, g4 ? 6 : 12);
      return { kind: 'sum', n: n, answer: polySum(n), id: 'pg:sum:' + n };
    }
    function diagnosePolyTask(p, answer) {
      var v = toNum(answer);
      if (!isFinite(v)) return { code: 'nan' };
      if (near(v, p.answer)) return { code: 'ok' };
      var n = p.n;
      if (p.kind === 'sum') {
        if (near(v, n * 180)) return { code: 'n180' };
        if (near(v, 360) && n !== 4) return { code: 'sum360' };
      }
      if (p.kind === 'sides') {
        if (near(v, p.s / 180)) return { code: 'sides_forgot_2' };
        if (near(v, p.s / 180 + 1)) return { code: 'sides_off_one' };
      }
      if (p.kind === 'missing') {
        var known = 0;
        p.angles.forEach(function(a, i) { if (i !== p.which) known += a; });
        if (n !== 4 && near(v, 360 - known)) return { code: 'sum360' };
        if (near(v, n * 180 - known)) return { code: 'n180' };
        if (near(v, known)) return { code: 'gave_sum' };
      }
      if (p.kind === 'regular') {
        if (near(v, polySum(n))) return { code: 'reg_gave_total' };
        if (near(v, regExterior(n))) return { code: 'int_ext_swap' };
      }
      if (p.kind === 'ext') {
        if (near(v, regInterior(n))) return { code: 'int_ext_swap' };
        if (near(v, 360)) return { code: 'ext_gave_total' };
      }
      if (p.kind === 'extn') {
        if (near(v, 180 / p.e)) return { code: 'extn_used_180' };
        if (near(v, 360 / (180 - p.e))) return { code: 'int_ext_swap' };
      }
      if (p.kind !== 'sides' && p.kind !== 'extn' && Math.abs(v - p.answer) <= 20) return { code: 'arith' };
      return { code: 'off' };
    }
    // ── Tessellation ──
    var TILE_NS = [3, 4, 5, 6, 7, 8, 9, 10, 12];
    function tileFit(n) {
      var a = regInterior(n), q = 360 / a, k = Math.floor(q + 1e-9);
      var whole = Math.abs(q - Math.round(q)) < 1e-9;
      return { n: n, interior: a, quotient: q, copies: k, gap: whole ? 0 : 360 - k * a, overlap: whole ? 0 : (k + 1) * a - 360, tiles: whole };
    }
    function vertexSum(list) { return (Array.isArray(list) ? list : []).reduce(function(s, n) { return s + regInterior(n); }, 0); }
    function vertexFits(list) { return Array.isArray(list) && list.length >= 3 && Math.abs(vertexSum(list) - 360) < 1e-9; }
    var TILE_CLAIMS = {
      t_divides: function(n) { return tileFit(n).tiles; },
      t_even: function(n) { return n % 2 === 0; },
      t_all: function() { return true; },
      t_lt7: function(n) { return n < 7; }
    };
    // A tiling claim against the student's rows; if those all fit, the first polygon anywhere that breaks it.
    function tileClaimCheck(id, rows) {
      var f = TILE_CLAIMS[id];
      if (!f) return { fits: false };
      var tested = Object.keys(rows || {}).map(Number).filter(function(n) { return TILE_NS.indexOf(n) !== -1; }).sort(function(a, b) { return a - b; });
      for (var i = 0; i < tested.length; i++) if (f(tested[i]) !== tileFit(tested[i]).tiles) return { fits: false, breaks: tested[i], tested: true };
      for (i = 0; i < TILE_NS.length; i++) if (f(TILE_NS[i]) !== tileFit(TILE_NS[i]).tiles) return { fits: false, breaks: TILE_NS[i], tested: false };
      return { fits: true };
    }

    // ── Circle theorems (angles in degrees, counterclockwise from east) ──
    function angleAt(P, A, B) {
      var d1 = Math.atan2(-(A.y - P.y), A.x - P.x) * 180 / PI, d2 = Math.atan2(-(B.y - P.y), B.x - P.x) * 180 / PI;
      return ANG.between(d1, d2);
    }
    // The arc from A to B that does NOT contain P (0..360).
    function arcOpposite(aDeg, bDeg, pDeg) {
      var ccw = normDeg(bDeg - aDeg);
      return normDeg(pDeg - aDeg) < ccw ? 360 - ccw : ccw;
    }
    function onArc(deg, fromDeg, sweep) { return normDeg(deg - fromDeg) < sweep; }
    function makeCircleTask(kind, rng, level) {
      var g4 = level === 'g4', g8 = level === 'g8';
      if (kind === 'semi') {
        var rot = randInt(rng, 0, 11) * 30, phi = 2 * randInt(rng, 13, 77);
        var ask = (g4 || rnd(rng) < 0.3) ? 'apb' : 'other';
        return { kind: kind, a: normDeg(rot + 180), b: rot, p: normDeg(rot + phi), phi: phi, ask: ask, given: phi / 2, answer: ask === 'apb' ? 90 : 90 - phi / 2, id: 'ci:semi:' + phi + ':' + ask };
      }
      if (kind === 'cyclic') {
        var gaps = null;
        for (var g = 0; g < 60 && !gaps; g++) {
          var t = [2 * randInt(rng, 25, 70), 2 * randInt(rng, 25, 70), 2 * randInt(rng, 25, 70)];
          var last = 360 - t[0] - t[1] - t[2];
          if (last >= 50 && last <= 140) gaps = t.concat([last]);
        }
        if (!gaps) gaps = [80, 100, 90, 90];
        var a0 = randInt(rng, 0, 359), pos = [a0];
        for (var i = 0; i < 3; i++) pos.push(normDeg(pos[i] + gaps[i]));
        var angs = [(gaps[1] + gaps[2]) / 2, (gaps[2] + gaps[3]) / 2, (gaps[3] + gaps[0]) / 2, (gaps[0] + gaps[1]) / 2];
        var giv = rnd(rng) < 0.5 ? 0 : 1;
        return { kind: kind, pos: pos, gaps: gaps, angles: angs, givenIdx: giv, askIdx: giv + 2, given: angs[giv], answer: angs[giv + 2], id: 'ci:cyc:' + gaps.join('-') + ':' + giv };
      }
      var m = g4 ? 20 * randInt(rng, 2, 8) : 2 * randInt(rng, 20, 80);
      var a = randInt(rng, 0, 359), b = normDeg(a + m), ask2 = rnd(rng) < 0.5 ? 'insc' : 'cent', p;
      if (g8 && m >= 60 && rnd(rng) < 0.3) { ask2 = 'minor'; p = normDeg(a + randInt(rng, 15, m - 15)); }
      else p = normDeg(a + m + randInt(rng, 30, 360 - m - 30));
      var ans = ask2 === 'insc' ? m / 2 : ask2 === 'cent' ? m : 180 - m / 2;
      return { kind: 'inscribed', a: a, b: b, p: p, m: m, ask: ask2, given: ask2 === 'cent' ? m / 2 : m, answer: ans, id: 'ci:insc:' + m + ':' + ask2 };
    }
    function diagnoseCircle(p, answer) {
      var v = toNum(answer);
      if (!isFinite(v)) return { code: 'nan' };
      if (near(v, p.answer)) return { code: 'ok' };
      if (p.kind === 'inscribed') {
        if (p.ask === 'insc') { if (near(v, p.m)) return { code: 'insc_equal_central' }; if (near(v, 2 * p.m)) return { code: 'insc_double' }; if (near(v, 180 - p.m / 2)) return { code: 'insc_other_arc' }; }
        if (p.ask === 'cent') { if (near(v, p.given)) return { code: 'insc_equal_central' }; if (near(v, p.given / 2)) return { code: 'cent_half' }; }
        if (p.ask === 'minor') { if (near(v, p.m / 2)) return { code: 'insc_other_arc' }; if (near(v, p.m)) return { code: 'insc_equal_central' }; }
      }
      if (p.kind === 'semi') {
        if (p.ask === 'other') { if (near(v, 180 - p.given)) return { code: 'semi_no_right' }; if (near(v, p.given)) return { code: 'semi_equal' }; if (near(v, 90)) return { code: 'semi_gave_90' }; }
        if (p.ask === 'apb' && near(v, 180)) return { code: 'semi_straight' };
      }
      if (p.kind === 'cyclic') {
        if (near(v, p.given)) return { code: 'cyc_equal' };
        if (near(v, 360 - p.given)) return { code: 'cyc_360' };
        if (near(v, 90 - p.given) || near(v, p.given - 90)) return { code: 'cyc_90' };
      }
      if (Math.abs(v - p.answer) <= 6) return { code: 'arith' };
      return { code: 'off' };
    }

    // ── Unit circle ──
    var EXACT = [['-1', -1], ['-√3/2', -Math.sqrt(3) / 2], ['-√2/2', -Math.SQRT1_2], ['-1/2', -0.5], ['0', 0], ['1/2', 0.5], ['√2/2', Math.SQRT1_2], ['√3/2', Math.sqrt(3) / 2], ['1', 1]];
    function exactId(v) { for (var i = 0; i < EXACT.length; i++) if (Math.abs(v - EXACT[i][1]) < 1e-9) return EXACT[i][0]; return null; }
    function exactVal(id) { for (var i = 0; i < EXACT.length; i++) if (EXACT[i][0] === id) return EXACT[i][1]; return NaN; }
    function quadrant(deg) { var dd = normDeg(deg); if (Math.abs(dd % 90) < 1e-9) return 0; return Math.floor(dd / 90) + 1; }
    function refAngle(deg) {
      var dd = normDeg(deg), q = quadrant(dd);
      if (q === 0) return (dd % 180 === 0) ? 0 : 90;
      return q === 1 ? dd : q === 2 ? 180 - dd : q === 3 ? dd - 180 : 360 - dd;
    }
    function trigExact(deg) { var a = deg * PI / 180; return { cos: exactId(Math.cos(a)), sin: exactId(Math.sin(a)) }; }
    var SPECIAL_DEGS = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
    var UNIT_KINDS = { g4: ['conv', 'ref'], g57: ['conv', 'ref', 'coord'], g8: ['conv', 'ref', 'coord', 'radnum', 'pinum'] };
    var PI_FORMS = [[1, 2, 1], [1, 4, 1], [1, 3, 2], [1, 6, 1], [2, 3, 1], [3, 4, 2], [1, 2, 3], [1, 1, 1]];
    function makeUnitTask(kind, rng, level) {
      var offAxis = SPECIAL_DEGS.filter(function(x) { return x % 90 !== 0; });
      if (kind === 'ref') {
        var dg = level === 'g8' && rnd(rng) < 0.5 ? (function() { var x; do { x = randInt(rng, 91, 359); } while (x % 90 === 0); return x; })() : pick(rng, offAxis.filter(function(x) { return x > 90; }));
        return { kind: kind, deg: dg, answer: refAngle(dg), id: 'uc:ref:' + dg };
      }
      if (kind === 'coord') {
        var cd = rnd(rng) < 0.85 ? pick(rng, offAxis) : pick(rng, [90, 180, 270]);
        var fn = rnd(rng) < 0.5 ? 'cos' : 'sin';
        return { kind: kind, deg: cd, fn: fn, answer: trigExact(cd)[fn], id: 'uc:coord:' + cd + ':' + fn };
      }
      if (kind === 'radnum') { var rr = pick(rng, [0.5, 1, 1.5, 2, 2.5, 3, 4, 5]); return { kind: kind, r: rr, answer: r1(rr * 180 / PI), id: 'uc:radnum:' + rr }; }
      if (kind === 'pinum') { var f = pick(rng, PI_FORMS); return { kind: kind, k: f[0], den: f[1], c: f[2], answer: r2(f[0] * PI / f[1] + f[2]), id: 'uc:pinum:' + f.join('-') }; }
      var deg = pick(rng, SPECIAL_DEGS.filter(function(x) { return x > 0; }).concat([360])), dir = rnd(rng) < 0.5 ? 'toRad' : 'toDeg';
      return { kind: 'conv', deg: deg, dir: dir, answer: dir === 'toRad' ? ANG.piForm(deg) : deg, id: 'uc:conv:' + deg + ':' + dir };
    }
    function diagnoseUnit(p, answer) {
      if (p.kind === 'conv') return ANG.diagnosePuzzle({ kind: 'rad', deg: p.deg, dir: p.dir }, answer);
      if (p.kind === 'coord') {
        var id = String(answer == null ? '' : answer);
        if (!id || exactVal(id) !== exactVal(id)) return { code: 'nan' };
        if (id === p.answer) return { code: 'ok' };
        var want = exactVal(p.answer), got = exactVal(id), other = trigExact(p.deg)[p.fn === 'cos' ? 'sin' : 'cos'], ov = exactVal(other);
        if (want !== 0 && Math.abs(got + want) < 1e-9) return { code: 'sign_quadrant' };
        if (Math.abs(got - ov) < 1e-9 || (ov !== 0 && Math.abs(Math.abs(got) - Math.abs(ov)) < 1e-9)) return { code: 'swap_sin_cos' };
        return { code: 'off' };
      }
      var v = toNum(answer);
      if (!isFinite(v)) return { code: 'nan' };
      if (p.kind === 'ref') {
        var q = quadrant(p.deg);
        if (near(v, p.answer)) return { code: 'ok' };
        if (q !== 2 && near(v, 180 - p.deg)) return { code: 'ref_180_minus' };
        if (p.deg > 90 && near(v, p.deg)) return { code: 'ref_gave_theta' };
        if (near(v, 90 - p.answer)) return { code: 'ref_from_y' };
        if (Math.abs(v - p.answer) <= 5) return { code: 'arith' };
        return { code: 'off' };
      }
      if (p.kind === 'radnum') {
        if (near(v, p.answer, 0.6)) return { code: 'ok' };
        if (near(v, p.r * 180, 1)) return { code: 'rad_times_180' };
        if (near(v, p.r, 0.01)) return { code: 'rad_typed_radians' };
        if (near(v, p.r * PI / 180, 0.005)) return { code: 'rad_wrong_way' };
        return { code: 'off' };
      }
      if (near(v, p.answer, 0.015)) return { code: 'ok' };
      if (near(v, p.k * 180 / p.den + p.c, 0.5)) return { code: 'pi_is_180_number' };
      if (near(v, p.k * PI / p.den, 0.015)) return { code: 'arith' };
      return { code: 'off' };
    }

    // ── Real contexts ──
    function clockAngle(h, m) { var x = Math.abs(30 * (h % 12) - 5.5 * m) % 360; return x > 180 ? 360 - x : x; }
    function clockStatic(h, m) { var x = Math.abs(30 * (h % 12) - 6 * m) % 360; return x > 180 ? 360 - x : x; }
    var COMPASS_PTS = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    // N 40° E style: measured from N or S toward E or W.
    function quadBearing(ns, x, ew) { if (ns === 'N') return ew === 'E' ? x : normDeg(360 - x); return ew === 'E' ? 180 - x : 180 + x; }
    function makeCtxTask(kind, rng, level) {
      var g4 = level === 'g4', g8 = level === 'g8';
      if (kind === 'bearing') {
        var v = g4 ? 'point' : pick(rng, g8 ? ['back', 'turn', 'quad'] : ['back', 'turn', 'point']);
        if (v === 'point') { var cp = pick(rng, COMPASS_PTS.slice(1)); return { kind: kind, v: v, pt: cp[0], answer: cp[1], id: 'cx:brg:pt:' + cp[0] }; }
        if (v === 'back') { var b; do { b = randInt(rng, 5, 355); } while (b % 90 === 0); return { kind: kind, v: v, b: b, answer: normDeg(b + 180), id: 'cx:brg:back:' + b }; }
        if (v === 'turn') { var from = 5 * randInt(rng, 0, 71), to; do { to = 5 * randInt(rng, 0, 71); } while (Math.abs(to - from) < 20); return { kind: kind, v: v, from: from, to: to, answer: normDeg(to - from), id: 'cx:brg:turn:' + from + ':' + to }; }
        var ns = rnd(rng) < 0.5 ? 'N' : 'S', ew = rnd(rng) < 0.5 ? 'E' : 'W', x = randInt(rng, 10, 80);
        return { kind: kind, v: 'quad', ns: ns, x: x, ew: ew, answer: quadBearing(ns, x, ew), id: 'cx:brg:q:' + ns + x + ew };
      }
      if (kind === 'pitch') {
        var pv = g4 ? 'vertical' : pick(rng, g8 ? ['tan', 'rise', 'ada'] : ['vertical', 'ada']);
        if (pv === 'vertical') { var a = 5 * randInt(rng, 3, 15); return { kind: kind, v: pv, a: a, answer: 90 - a, id: 'cx:pt:vert:' + a }; }
        if (pv === 'ada') { var rise = randInt(rng, 1, 4) * 6, ok = rnd(rng) < 0.5, run = ok ? 12 * rise + randInt(rng, 0, 3) * 6 : 12 * rise - randInt(rng, 1, 4) * 6; return { kind: kind, v: pv, rise: rise, run: run, answer: run >= 12 * rise ? 'yes' : 'no', id: 'cx:pt:ada:' + rise + ':' + run }; }
        if (pv === 'tan') { var rr = randInt(rng, 2, 12); return { kind: kind, v: pv, rise: rr, run: 12, answer: r1(Math.atan(rr / 12) * 180 / PI), id: 'cx:pt:tan:' + rr }; }
        var ang = 5 * randInt(rng, 3, 9); return { kind: kind, v: 'rise', a: ang, run: 12, answer: r1(12 * Math.tan(ang * PI / 180)), id: 'cx:pt:rise:' + ang };
      }
      var h = randInt(rng, 1, 12), m = g4 ? pick(rng, [0, 30]) : g8 ? randInt(rng, 0, 59) : 5 * randInt(rng, 0, 11);
      return { kind: 'clock', h: h, m: m, answer: clockAngle(h, m), id: 'cx:clock:' + h + ':' + m };
    }
    function diagnoseCtx(p, answer) {
      if (p.kind === 'pitch' && p.v === 'ada') {
        var c = String(answer || '');
        if (c !== 'yes' && c !== 'no') return { code: 'nan' };
        return { code: c === p.answer ? 'ok' : 'ada_wrong' };
      }
      var v = toNum(answer);
      if (!isFinite(v)) return { code: 'nan' };
      if (p.kind === 'clock') {
        if (near(v, p.answer, 0.26)) return { code: 'ok' };
        var st = clockStatic(p.h, p.m);
        if (Math.abs(st - p.answer) > 0.3 && near(v, st, 0.26)) return { code: 'clock_hour_static' };
        if (p.answer !== 180 && near(v, 360 - p.answer, 0.26)) return { code: 'clock_reflex' };
        return { code: Math.abs(v - p.answer) <= 10 ? 'arith' : 'off' };
      }
      if (p.kind === 'bearing') {
        if (v >= 0 && v <= 360 && near(normDeg(v), p.answer)) return { code: 'ok' };
        if (p.v === 'back' && (near(v, p.b + 180) || near(v, p.b - 180))) return { code: 'bearing_no_wrap' };
        if (p.v === 'turn' && near(v, 360 - p.answer)) return { code: 'turn_ccw' };
        if (p.v === 'quad' && near(v, p.x)) return { code: 'quad_gave_angle' };
        if (p.v !== 'turn' && p.answer % 180 !== 0 && near(normDeg(v), normDeg(360 - p.answer))) return { code: 'bearing_ccw' };
        if ((p.v === 'point' || p.v === 'quad') && near(normDeg(v), normDeg(90 - p.answer))) return { code: 'bearing_from_east' };
        return { code: 'off' };
      }
      if (p.v === 'vertical') {
        if (near(v, p.answer)) return { code: 'ok' };
        if (near(v, 180 - p.a)) return { code: 'used_180' };
        if (near(v, p.a)) return { code: 'copied_given' };
        return { code: Math.abs(v - p.answer) <= 10 ? 'arith' : 'off' };
      }
      if (p.v === 'tan') {
        if (near(v, p.answer, 0.3)) return { code: 'ok' };
        if (near(v, 90 - p.answer, 0.3)) return { code: 'pitch_complement' };
        if (p.rise < 12 && near(v, Math.asin(p.rise / 12) * 180 / PI, 0.3)) return { code: 'pitch_used_sin' };
        if (near(v, p.rise / 12 * 100, 0.6)) return { code: 'pitch_percent' };
        return { code: 'off' };
      }
      if (near(v, p.answer, 0.15)) return { code: 'ok' };
      if (near(v, 12 * Math.sin(p.a * PI / 180), 0.15)) return { code: 'pitch_used_sin' };
      if (near(v, 12 / Math.tan(p.a * PI / 180), 0.15)) return { code: 'pitch_complement' };
      return { code: 'off' };
    }

    // ── Compass-and-straightedge constructions ──
    function dist(p, q) { return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y)); }
    function circleCircle(c1, ra, c2, rb) {
      var dd = dist(c1, c2);
      if (dd < 1e-9 || dd > ra + rb + 1e-9 || dd < Math.abs(ra - rb) - 1e-9) return [];
      var a = (ra * ra - rb * rb + dd * dd) / (2 * dd), h2 = ra * ra - a * a, h = h2 > 0 ? Math.sqrt(h2) : 0;
      var mx = c1.x + a * (c2.x - c1.x) / dd, my = c1.y + a * (c2.y - c1.y) / dd;
      return [{ x: mx + h * (c2.y - c1.y) / dd, y: my - h * (c2.x - c1.x) / dd }, { x: mx - h * (c2.y - c1.y) / dd, y: my + h * (c2.x - c1.x) / dd }];
    }
    function dirOf(from, to) { return normDeg(Math.atan2(-(to.y - from.y), to.x - from.x) * 180 / PI); }
    // How far a ray can run inside the box, capped at maxL.
    function rayLenInBox(o, dir, W, H, margin, maxL) {
      var u = ANG.pt(0, 0, 1, dir), L = maxL;
      if (u.x > 1e-9) L = Math.min(L, (W - margin - o.x) / u.x);
      if (u.x < -1e-9) L = Math.min(L, (margin - o.x) / u.x);
      if (u.y > 1e-9) L = Math.min(L, (H - margin - o.y) / u.y);
      if (u.y < -1e-9) L = Math.min(L, (margin - o.y) / u.y);
      return Math.max(40, L);
    }
    var CON_W = 400, CON_H = 300;
    function makeConstruction(kind, rng) {
      if (kind === 'copy') {
        var mc = randInt(rng, 35, 110), basec = randInt(rng, 0, 20), Bc = { x: 70, y: 150 };
        var q = randInt(rng, -10, 15), P = { x: 215, y: 255 };
        return { kind: 'copy', m: mc, base: basec, q: q, B: Bc, P: P, lenBA: rayLenInBox(Bc, basec + mc, 200, CON_H, 12, 120), lenBC: rayLenInBox(Bc, basec, 200, CON_H, 12, 120), lenPQ: rayLenInBox(P, q, CON_W, CON_H, 12, 170), steps: [], id: 'con:copy:' + mc + ':' + basec + ':' + q };
      }
      var m = randInt(rng, 40, 140), base = randInt(rng, -15, 25), bis = base + m / 2;
      var B = { x: CON_W / 2 - 80 * Math.cos(bis * PI / 180), y: CON_H / 2 + 70 * Math.sin(bis * PI / 180) };
      return { kind: 'bisect', m: m, base: base, B: B, lenBA: rayLenInBox(B, base + m, CON_W, CON_H, 12, 200), lenBC: rayLenInBox(B, base, CON_W, CON_H, 12, 200), steps: [], id: 'con:bisect:' + m + ':' + base };
    }
    // Every named point the construction has so far: given points, then the ones its arcs made.
    function conPoints(con) {
      var P = { B: con.B };
      P.A = ANG.pt(con.B.x, con.B.y, con.lenBA, con.base + con.m);
      P.C = ANG.pt(con.B.x, con.B.y, con.lenBC, con.base);
      var s = con.steps || [];
      if (con.kind === 'copy') { P.P = con.P; P.Q = ANG.pt(con.P.x, con.P.y, con.lenPQ, con.q); }
      if (s[0]) { P.D = ANG.pt(con.B.x, con.B.y, s[0].r, con.base + con.m); P.E = ANG.pt(con.B.x, con.B.y, s[0].r, con.base); }
      if (con.kind === 'bisect') {
        if (s[1] && s[2]) {
          var xs = circleCircle(P[s[1].centre], s[1].r, P[s[2].centre], s[2].r);
          if (xs.length) P.F = dist(xs[0], con.B) >= dist(xs[1], con.B) ? xs[0] : xs[1];
        }
      } else {
        if (s[1]) P.E2 = ANG.pt(con.P.x, con.P.y, s[1].r, con.q);
        if (s[1] && s[2]) {
          var ys = circleCircle(con.P, s[1].r, P.E2, s[2].r);
          var ccw = ys.filter(function(X) { var ux = P.E2.x - con.P.x, uy = -(P.E2.y - con.P.y), vx = X.x - con.P.x, vy = -(X.y - con.P.y); return ux * vy - uy * vx > 1e-9; });
          if (ccw.length) P.D2 = ccw[0];
        }
      }
      return P;
    }
    function conDone(con) { var s = con.steps || []; return s.length > 0 && s[s.length - 1].tool === 'line'; }
    // Try one compass or straightedge action. A useless action is refused with
    // a named reason; a legal but imperfect one is drawn (its effect shows later).
    function conApply(con, act) {
      var s = con.steps || [], st = s.length, P = conPoints(con);
      var next = function() { return Object.assign({}, con, { steps: s.concat([act]) }); };
      if (!act || (act.tool !== 'compass' && act.tool !== 'line')) return { code: 'bad', con: con };
      if (conDone(con)) return { code: 'done_already', con: con };
      if (act.tool === 'compass') {
        if (!P[act.centre]) return { code: 'no_point', con: con };
        var r = Number(act.r);
        if (!isFinite(r) || r < 10) return { code: 'arc_tiny', con: con };
        if (st === 0) {
          if (act.centre !== 'B') return { code: 'first_at_vertex', con: con };
          if (r < 20) return { code: 'arc_tiny', con: con };
          var room = Math.min(con.lenBA, con.lenBC) - 4;
          if (con.kind === 'copy') room = Math.min(room, con.lenPQ - 4);
          if (r > room) return { code: 'arc_off_rays', con: con };
          return { code: 'ok', con: next() };
        }
        if (con.kind === 'bisect') {
          if (st >= 3) return { code: 'use_straightedge', con: con };
          if (act.centre !== 'D' && act.centre !== 'E') return { code: 'arc_from_DE', con: con };
          if (st === 2 && act.centre === s[1].centre) return { code: 'other_point', con: con };
          var nc = next();
          if (st === 2 && !conPoints(nc).F) return { code: 'arcs_miss', con: nc };
          return { code: 'ok', con: nc };
        }
        if (st >= 3) return { code: 'use_straightedge', con: con };
        if (st === 1 && act.centre !== 'P') return { code: 'copy_arc_at_P', con: con };
        if (st === 1 && r > con.lenPQ - 4) return { code: 'arc_off_rays', con: con };
        if (st === 2 && act.centre !== 'E2') return { code: 'copy_arc_at_E2', con: con };
        var nc2 = next();
        if (st === 2 && !conPoints(nc2).D2) return { code: 'arcs_miss', con: nc2 };
        return { code: 'ok', con: nc2 };
      }
      if (st < 3) return { code: 'line_too_soon', con: con };
      var vertex = con.kind === 'bisect' ? 'B' : 'P', cross = con.kind === 'bisect' ? 'F' : 'D2';
      if (!P[cross]) return { code: 'arcs_miss', con: con };
      if (act.from !== vertex && act.through !== vertex) return { code: 'line_not_vertex', con: con };
      var other = act.from === vertex ? act.through : act.from;
      if (other !== cross) return { code: 'line_through_cross', con: con };
      return { code: 'ok', con: Object.assign({}, con, { steps: s.concat([{ tool: 'line', from: vertex, through: cross }]) }) };
    }
    // Measure the finished construction with a protractor.
    function conVerify(con) {
      var P = conPoints(con), s = con.steps || [];
      if (!conDone(con)) return null;
      if (con.kind === 'bisect') {
        var bd = dirOf(con.B, P.F), a1 = ANG.between(con.base + con.m, bd), a2 = ANG.between(bd, con.base);
        return { a1: a1, a2: a2, ok: Math.abs(a1 - a2) <= 0.5, widthChanged: Math.abs(s[1].r - s[2].r) > 0.5 };
      }
      var cd = dirOf(con.P, P.D2), copied = ANG.between(con.q, cd), de = dist(P.D, P.E);
      return { copied: copied, target: con.m, ok: Math.abs(copied - con.m) <= 0.5, firstWidthChanged: Math.abs(s[0].r - s[1].r) > 0.5, widthNotDE: Math.abs(s[2].r - de) > 0.5, de: de };
    }

    var B = {
      seedRng: seedRng, polySum: polySum, regInterior: regInterior, regExterior: regExterior, makePolygon: makePolygon, vertexAngle: vertexAngle,
      isAdjacent: isAdjacent, chordsCross: chordsCross, addDiagonal: addDiagonal, polyRegions: polyRegions, triangulated: triangulated,
      diagnosePolyRow: diagnosePolyRow, PG_CLAIMS: PG_CLAIMS, claimCheck: claimCheck, PG_KINDS: PG_KINDS, makePolyTask: makePolyTask, diagnosePolyTask: diagnosePolyTask,
      TILE_NS: TILE_NS, tileFit: tileFit, vertexSum: vertexSum, vertexFits: vertexFits, TILE_CLAIMS: TILE_CLAIMS, tileClaimCheck: tileClaimCheck,
      angleAt: angleAt, arcOpposite: arcOpposite, onArc: onArc, makeCircleTask: makeCircleTask, diagnoseCircle: diagnoseCircle,
      EXACT: EXACT, exactId: exactId, exactVal: exactVal, quadrant: quadrant, refAngle: refAngle, trigExact: trigExact, SPECIAL_DEGS: SPECIAL_DEGS,
      UNIT_KINDS: UNIT_KINDS, makeUnitTask: makeUnitTask, diagnoseUnit: diagnoseUnit,
      clockAngle: clockAngle, clockStatic: clockStatic, COMPASS_PTS: COMPASS_PTS, quadBearing: quadBearing, makeCtxTask: makeCtxTask, diagnoseCtx: diagnoseCtx,
      dist: dist, circleCircle: circleCircle, dirOf: dirOf, CON_W: CON_W, CON_H: CON_H, makeConstruction: makeConstruction, conPoints: conPoints,
      conDone: conDone, conApply: conApply, conVerify: conVerify
    };
    Object.keys(B).forEach(function(k) { ANG[k] = B[k]; });
  })();

  window.StemLab.anglesCore = ANG;


  // ══════════════════════════════════════════════════════════════
  // ── Polygon Angle Data ──
  // ══════════════════════════════════════════════════════════════
  var polygonData = [
    { sides: 3, icon: '🔺' },
    { sides: 4, icon: '■' },
    { sides: 5, icon: '⬟' },
    { sides: 6, icon: '⬡' },
    { sides: 7, icon: '⬢' },
    { sides: 8, icon: '🛑' },
    { sides: 9, icon: '○' },
    { sides: 10, icon: '⬣' },
    { sides: 12, icon: '⬢' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badge Definitions (names and descriptions are translated in render) ──
  // ══════════════════════════════════════════════════════════════
  var badgeDefs = [
    { id: 'first_angle',  icon: '📐' },
    { id: 'right_on',     icon: '👍' },
    { id: 'straight_up',  icon: '↔️' },
    { id: 'full_circle',  icon: '⭕' },
    { id: 'acute_eye',    icon: '👁️' },
    { id: 'streak_5',     icon: '🔥' },
    { id: 'streak_10',    icon: '⭐' },
    { id: 'speed_demon',  icon: '⚡' },
    { id: 'estimator',    icon: '🎯' },
    { id: 'all_types',    icon: '🏆' },
    { id: 'polygon_pro',  icon: '⬡' },
    { id: 'century',      icon: '💯' }
  ];

  // Quest labels are read outside render: they use the translator from the last render.
  var __anglesLastT = null;
  function __alloT(k, fb) {
    var v = null;
    try { v = __anglesLastT ? __anglesLastT(k, fb) : null; } catch (e) { v = null; }
    return (v == null || v === k || v === '') ? fb : v;
  }
  function __anglesFill(s, o) { return __alloOneWord(String(s).replace(/\{(\w+)\}/g, function(m, k) { return Object.prototype.hasOwnProperty.call(o, k) ? String(o[k]) : m; })); }
  window.StemLab.registerTool('protractor', {
    icon: '📐', label: 'Angle Explorer',
    desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
    color: 'purple', category: 'math',
    questHooks: [
      { id: 'pin_3_angles', get label() { return __alloT('stem.angles.quest_pin3', 'Save 3 angle measurements'); }, icon: '📍', check: function(d) { return (d.anglePins || []).length >= 3; },
        progress: function(d) { return __anglesFill(__alloT('stem.angles.quest_pins_of', '{k}/{n} pins'), { k: (d.anglePins || []).length, n: 3 }); } },
      { id: 'use_bisector', get label() { return __alloT('stem.angles.quest_bisector', 'Use the angle bisector tool'); }, icon: '✂️', check: function(d) { return d.showBisector || false; },
        progress: function(d) { return d.showBisector ? __alloT('stem.angles.quest_used', 'Used!') : __alloT('stem.angles.quest_toggle_bisector', 'Toggle bisector'); } },
      { id: 'explore_challenges', get label() { return __alloT('stem.angles.quest_challenges', 'Try the angle challenges tab'); }, icon: '🎯', check: function(d) { return d.activeTab === 'challenges'; },
        progress: function(d) { return d.activeTab === 'challenges' ? __alloT('stem.angles.quest_exploring', 'Exploring!') : __alloT('stem.angles.quest_open_challenges', 'Open challenges tab'); } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      // i18n: t(key, English). A host t() that echoes a missing key, returns
      // undefined or throws falls back to the English text.
      var t = function(k, fb) {
        var v;
        try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; }
        return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v;
      };
      __anglesLastT = t;
      // Fill {placeholders}; a function replacement keeps "$&" in values literal.
      // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
      function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
      var fill = function(s, o) {
        var out = String(s);
        Object.keys(o || {}).forEach(function(k) { out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), function() { return String(o[k]); }); });
        return __alloOneWord(out);
      };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : function() {};
      var celebrate = ctx.celebrate;
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark || isContrast;
      var isTeacher = ctx.isTeacherMode === true;
      // Student AI-off: no window.callGemini alias; AI controls render only when the host says text AI is usable.
      var _anglesAiFn = ctx.callGemini;
      var _anglesAiOn = ctx.aiAvailable !== false && typeof _anglesAiFn === 'function' && !_anglesAiFn._alloQrBlocked && !(window.__alloStudentAiDisabled === true && !isTeacher);
      var aiAllowed = ctx.aiHintsEnabled !== false && ctx.aiAvailable !== false;
      var callGemini = aiAllowed && _anglesAiOn ? _anglesAiFn : null;
      var announce = function(msg) {
        if (!msg) return;
        if (typeof ctx.announceToSR === 'function') { try { ctx.announceToSR(msg); return; } catch (e) { /* fall through */ } }
        var lr = document.getElementById('allo-live-angles');
        if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 40); }
      };

      // Badges and credits this mounted instance already paid out. Two checks in
      // one tick both saw the pre-award state and paid the same badge twice.
      var badgeGuardRef = React.useRef({});
      var creditGuardRef = React.useRef({});
      var sweepRef = React.useRef({ timers: [], osc: null });
      // The drag in progress (its cleanup), so a closed tool leaves no window listeners.
      var dragRef = React.useRef(null);
      // Last protractor placement state seen during a drag, so a snap is announced once.
      var snapRef = React.useRef({ onV: false, aligned: false });
      // Phones: the level's core tabs plus "More" (view state only, not saved).
      var NARROW_MQ = '(max-width: 639px)';
      var narrowState = React.useState(function() { try { return !!(window.matchMedia && window.matchMedia(NARROW_MQ).matches); } catch (e) { return false; } });
      var isNarrow = narrowState[0], setNarrow = narrowState[1];
      // The tab row is rebuilt across the breakpoint (a phone turning): keep focus in it.
      var narrowFocusRef = React.useRef(null);
      React.useEffect(function() {
        var was = narrowFocusRef.current;
        narrowFocusRef.current = null;
        if (!was || (document.activeElement && document.activeElement !== document.body)) return;
        var el = document.getElementById(was) || document.querySelector('[data-angles-root] [role="tab"][tabindex="0"]');
        if (el) el.focus();
      }, [isNarrow]);
      var tabsMoreState = React.useState(false);
      var tabsMoreOpen = tabsMoreState[0], setTabsMoreOpen = tabsMoreState[1];
      React.useEffect(function() {
        var mq = null;
        try { mq = window.matchMedia ? window.matchMedia(NARROW_MQ) : null; } catch (e) { mq = null; }
        if (!mq) return undefined;
        var on = function() {
          var a = document.activeElement;
          narrowFocusRef.current = a && a.id && a.id.indexOf('stem-angles-tab-') === 0 ? a.id : (a && a.getAttribute && a.getAttribute('data-angles-tabs-more') ? 'more' : null);
          setNarrow(!!mq.matches);
        };
        on();
        if (mq.addEventListener) mq.addEventListener('change', on); else if (mq.addListener) mq.addListener(on);
        return function() { if (mq.removeEventListener) mq.removeEventListener('change', on); else if (mq.removeListener) mq.removeListener(on); };
      }, []);
      var stopSweep = function() {
        var s = sweepRef.current;
        (s.timers || []).forEach(function(id) { clearTimeout(id); });
        s.timers = [];
        if (s.osc) { try { s.osc.stop(); } catch (e) { /* already stopped */ } s.osc = null; }
      };
      React.useEffect(function() {
        return function() {
          stopSweep();
          if (dragRef.current) dragRef.current();
          // A speed round left running kept ticking after the tool closed; pause it.
          if (window.__anglesSpeedTimer) {
            clearTimeout(window.__anglesSpeedTimer); window.__anglesSpeedTimer = null;
            window.__anglesSpeedPaused = true;
            try { if (ctx.update) ctx.update('protractor', 'speedPaused', true); } catch (e) { /* host gone */ }
          }
        };
      }, []);

      // ── Original state (hosted in main module) ──
      var angleValue = ctx.angleValue != null ? ctx.angleValue : 45;
      var setAngleValue = ctx.setAngleValue || function() {};
      var angleChallenge = ctx.angleChallenge || null;
      var setAngleChallenge = ctx.setAngleChallenge || function() {};
      var angleFeedback = ctx.angleFeedback || null;
      var setAngleFeedback = ctx.setAngleFeedback || function() {};
      var setToolSnapshots = ctx.setToolSnapshots;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore || function() {};

      // ── Extended state (via toolData.protractor) ──
      var d = (ctx.toolData && ctx.toolData.protractor) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('protractor', key); }
        else { if (ctx.update) ctx.update('protractor', key, val); }
      };
      // Merge into the LATEST saved state (badges, credits, tallies): two writes in
      // one tick from a stale render snapshot overwrote each other.
      var updMerge = function(fn) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var cur = (prev && prev.protractor) || {};
            return Object.assign({}, prev, { protractor: Object.assign({}, cur, fn(cur)) });
          });
        } else upd(fn(d));
      };
      var plain = function(v) { return !!v && typeof v === 'object' && !Array.isArray(v); };
      var num = function(v, dflt) { return (typeof v === 'number' && isFinite(v)) ? v : dflt; };

      var soundEnabled = d.soundEnabled != null ? !!d.soundEnabled : true;
      var teacher = plain(d.teacher) ? d.teacher : {};
      // Level (grade band): the teacher's lock, else the student's pick, else the host band.
      var bandLevel = ANG.levelFromBand(ctx.gradeBand);
      var lockLevel = ANG.LEVELS.indexOf(teacher.lockLevel) !== -1 ? teacher.lockLevel : null;
      var level = lockLevel || (ANG.LEVELS.indexOf(d.level) !== -1 ? d.level : bandLevel);
      // Band-aware layout: the level's core activities first, then every other
      // activity; the Reference library stays last. A new student opens on the first.
      var TAB_ORDER_BY_LEVEL = {
        g4: ['protractor', 'challenges', 'explore', 'puzzles', 'polygons', 'contexts', 'circles', 'construct', 'tools', 'reference'],
        g57: ['puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'circles', 'construct', 'tools', 'reference'],
        g8: ['circles', 'construct', 'puzzles', 'polygons', 'contexts', 'protractor', 'challenges', 'explore', 'tools', 'reference']
      };
      var CORE_TABS = { g4: ['protractor', 'challenges'], g57: ['puzzles', 'polygons', 'contexts'], g8: ['circles', 'construct'] };
      var ANGLE_TAB_ORDER = TAB_ORDER_BY_LEVEL[level] || TAB_ORDER_BY_LEVEL.g57;
      var coreTabs = CORE_TABS[level] || [];
      var ANGLE_TAB_ALL = ANGLE_TAB_ORDER;
      var lockTab = (!isTeacher && ANGLE_TAB_ALL.indexOf(teacher.lockTab) !== -1) ? teacher.lockTab : null;
      var savedTab = ANGLE_TAB_ALL.indexOf(d.activeTab) !== -1 ? d.activeTab : ANGLE_TAB_ORDER[0];
      var activeTab = lockTab && savedTab !== 'reference' ? lockTab : savedTab;
      var showBisector = d.showBisector || false;
      var showSecondRay = d.showSecondRay || false;
      var secondAngle = num(d.secondAngle, 120);
      // Saved state is INPUT: `||` is a NULL guard, not a TYPE guard.
      var anglePins = Array.isArray(d.anglePins) ? d.anglePins.filter(function(p) { return p && typeof p.deg === 'number' && isFinite(p.deg); }) : [];
      var snapEnabled = d.snapEnabled != null ? d.snapEnabled : false;

      var allowReveal = teacher.noReveal !== true;

      // AI Tutor state (a persisted aiLoading from a closed tool must not spin forever)
      var aiAdvice = typeof d.aiAdvice === 'string' ? d.aiAdvice : '';
      var aiLoading = !!d.aiLoading && !!window.__anglesAiInFlight;

      // Speed Round state
      var speedActive = d.speedActive || false;
      var speedScore = num(d.speedScore, 0);
      var speedTimeLeft = num(d.speedTimeLeft, 30);
      var speedPaused = !!d.speedPaused;
      var speedTarget = plain(d.speedTarget) ? d.speedTarget : null;

      // Estimate Mode state
      var estimateActive = d.estimateActive || false;
      var estimateTarget = num(d.estimateTarget, 0);
      var estimateBase = num(d.estimateBase, 0);
      var estimateGuess = d.estimateGuess || '';
      var estimateResult = plain(d.estimateResult) ? d.estimateResult : null;
      var estimateCount = num(d.estimateCount, 0);
      var estimateBench = typeof d.estimateBench === 'number' ? d.estimateBench : null;

      // Streak counter
      var streak = num(d.streak, 0);
      var bestStreak = num(d.bestStreak, 0);

      // Badge state
      var earnedBadges = plain(d.earnedBadges) ? d.earnedBadges : {};
      var showBadges = d.showBadges || false;

      // Angle history log
      var angleHistory = Array.isArray(d.angleHistory) ? d.angleHistory.filter(function(e) { return e && typeof e.deg === 'number' && isFinite(e.deg); }) : [];

      // Polygon explorer
      var selectedPolygon = num(d.selectedPolygon, 3);
      var polygonsExplored = plain(d.polygonsExplored) ? d.polygonsExplored : {};

      // Clock calculator
      var clockHour = num(d.clockHour, 3);
      var clockMinute = num(d.clockMinute, 0);

      // Triangle angle sum
      var triAngle1 = num(d.triAngle1, 60);
      var triAngle2 = num(d.triAngle2, 60);

      // Unit conversion
      var angleUnit = ['deg', 'rad', 'pi', 'grad', 'turns'].indexOf(d.angleUnit) !== -1 ? d.angleUnit : 'deg';

      // Types seen for badge tracking
      var typesSeen = plain(d.typesSeen) ? d.typesSeen : {};
      var credited = plain(d.credited) ? d.credited : {};
      var misTally = plain(d.misTally) ? d.misTally : {};
      var missedLog = Array.isArray(d.missedLog) ? d.missedLog.filter(function(m) { return m && typeof m.code === 'string'; }) : [];

      // ══════════════════════════════════════════════════════════════
      // ── Angle Classification (English ids; translated for display) ──
      // ══════════════════════════════════════════════════════════════
      var classifyAngle = ANG.classify;
      var CLASS_LABEL = {
        Zero: t('stem.angles.cls_zero', 'Zero'), Acute: t('stem.angles.cls_acute', 'Acute'), Right: t('stem.angles.cls_right', 'Right'),
        Obtuse: t('stem.angles.cls_obtuse', 'Obtuse'), Straight: t('stem.angles.cls_straight', 'Straight'), Reflex: t('stem.angles.cls_reflex', 'Reflex'),
        Full: t('stem.angles.cls_full', 'Full')
      };
      var clsLabel = function(c) { return CLASS_LABEL[c] || c; };
      var angleClass = classifyAngle(angleValue);
      // An open classify question or estimate must not print its own answer.
      // A wrong first try leaves feedback on screen but the question still open.
      var hideClass = !!(angleChallenge && angleChallenge.type === 'classify' && !angleChallenge.done) || (estimateActive && !estimateResult);
      var hideNumbers = estimateActive && !estimateResult;

      // ── Class colors ──
      var classColors = {};
      classColors['Zero'] = { text: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
      classColors['Acute'] = { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
      classColors['Right'] = { text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
      classColors['Obtuse'] = { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
      classColors['Straight'] = { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' };
      classColors['Reflex'] = { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
      classColors['Full'] = { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' };
      var cc = classColors[angleClass] || classColors['Acute'];

      // ── Angle conversion ──
      var toRadians = function(deg) { return (deg * Math.PI / 180).toFixed(4); };
      var toGradians = function(deg) { return (deg * 400 / 360).toFixed(2); };
      var toTurns = function(deg) { return (deg / 360).toFixed(4); };
      var fmtUnit = function(deg) {
        return angleUnit === 'rad' ? fill(t('stem.angles.unit_rad_value', '{v} rad'), { v: toRadians(deg) })
          : angleUnit === 'pi' ? fill(t('stem.angles.unit_pi_value', '{v} rad'), { v: ANG.piForm(deg) })
          : angleUnit === 'grad' ? fill(t('stem.angles.unit_grad_value', '{v} grad'), { v: toGradians(deg) })
          : angleUnit === 'turns' ? fill(t('stem.angles.unit_turns_value', '{v} turns'), { v: toTurns(deg) })
          : deg + '°';
      };
      var convertedAngle = fmtUnit(angleValue);

      // ── Supplementary / Complementary ──
      var complementary = angleValue <= 90 ? (90 - angleValue) : null;
      var supplementary = angleValue <= 180 ? (180 - angleValue) : null;
      // Vertical angles come from two crossing lines, so each is between 0 and 180.
      var verticalAngle = (angleValue > 0 && angleValue < 180) ? angleValue : null;
      var explementary = 360 - angleValue; // explement (conjugate)

      // ══════════════════════════════════════════════════════════════
      // ── SVG Geometry ──
      // ══════════════════════════════════════════════════════════════
      var cx = 200, cy = 200, r = 160, rayLen = 170;
      // The responsive 400-unit viewBox renders at about 300 CSS px on a
      // 320px viewport. A 17-unit radius keeps each ray handle above the
      // WCAG 2.5.8 24px minimum while preserving the full protractor in view.
      var rayHandleRadius = 17;
      var rad = angleValue * Math.PI / 180;
      var rayEndX = cx + rayLen * Math.cos(-rad);
      var rayEndY = cy + rayLen * Math.sin(-rad);
      var arcR = 60;
      var arcEndX = cx + arcR * Math.cos(-rad);
      var arcEndY = cy + arcR * Math.sin(-rad);
      var largeArc = angleValue > 180 ? 1 : 0;

      // Bisector ray
      var bisectorRad = (angleValue / 2) * Math.PI / 180;
      var bisEndX = cx + (rayLen * 0.85) * Math.cos(-bisectorRad);
      var bisEndY = cy + (rayLen * 0.85) * Math.sin(-bisectorRad);

      // Second ray
      var rad2 = secondAngle * Math.PI / 180;
      var ray2EndX = cx + rayLen * Math.cos(-rad2);
      var ray2EndY = cy + rayLen * Math.sin(-rad2);
      var angleBetween = Math.abs(secondAngle - angleValue);
      if (angleBetween > 180) angleBetween = 360 - angleBetween;

      var clockAngle = ANG.clockAngle(clockHour, clockMinute);

      // ── Polygon interior angle ──
      var polyInterior = ANG.regInterior, polyExterior = ANG.regExterior, polyAngleSum = ANG.polySum;
      var POLY_NAME = { 3: t('stem.angles.poly_triangle', 'Triangle'), 4: t('stem.angles.poly_square', 'Square'), 5: t('stem.angles.poly_pentagon', 'Pentagon'), 6: t('stem.angles.poly_hexagon', 'Hexagon'), 7: t('stem.angles.poly_heptagon', 'Heptagon'), 8: t('stem.angles.poly_octagon', 'Octagon'), 9: t('stem.angles.poly_nonagon', 'Nonagon'), 10: t('stem.angles.poly_decagon', 'Decagon'), 12: t('stem.angles.poly_dodecagon', 'Dodecagon') };

      // ── Triangle angle sum ──
      var triAngle3 = 180 - triAngle1 - triAngle2;
      var triValid = triAngle3 > 0 && triAngle1 > 0 && triAngle2 > 0;

      // ══════════════════════════════════════════════════════════════
      // ── Snap Helper ──
      // ══════════════════════════════════════════════════════════════
      var snapAngle = function(deg) {
        if (!snapEnabled) return deg;
        return Math.round(deg / 15) * 15;
      };

      // ══════════════════════════════════════════════════════════════
      // ── Drag Handlers ──
      // ══════════════════════════════════════════════════════════════
      // One drag at a time, in SVG viewBox units. Pointer Events with pointer
      // capture where the browser has them (mouse, pen and touch alike), so a
      // drag keeps working when the finger or cursor leaves the handle or the
      // SVG; mouse or touch events otherwise. It ends on up, cancel, lost
      // capture or unmount. Draggable shapes carry touch-action: none.
      var HAS_POINTER = typeof window !== 'undefined' && typeof window.PointerEvent === 'function';
      var beginDrag = function(startEvt, onPoint) {
        var type = startEvt && startEvt.type;
        var isPointer = type === 'pointerdown', isTouch = type === 'touchstart';
        if (isPointer && startEvt.isPrimary === false) return;
        if (!isTouch && typeof startEvt.button === 'number' && startEvt.button !== 0) return;
        var target = startEvt.currentTarget || startEvt.target;
        var svgEl = target && target.closest ? target.closest('svg') : null;
        if (!svgEl) return;
        if (dragRef.current) dragRef.current();
        if (isPointer && startEvt.cancelable) startEvt.preventDefault();
        if (startEvt.stopPropagation) startEvt.stopPropagation();
        var pid = isPointer ? startEvt.pointerId : null;
        if (isPointer && target.setPointerCapture) { try { target.setPointerCapture(pid); } catch (e) { /* capture unsupported */ } }
        var toPt = function(x, y) {
          var rect = svgEl.getBoundingClientRect();
          var vb = svgEl.viewBox && svgEl.viewBox.baseVal;
          var Wv = (vb && vb.width) || rect.width || 1, Hv = (vb && vb.height) || rect.height || 1;
          return { x: (x - rect.left) * Wv / (rect.width || Wv), y: (y - rect.top) * Hv / (rect.height || Hv) };
        };
        var first = isTouch ? (startEvt.touches && startEvt.touches[0]) : startEvt;
        if (!first) return;
        var tid = isTouch ? first.identifier : null;
        var p0 = toPt(first.clientX, first.clientY);
        var moveType = isPointer ? 'pointermove' : (isTouch ? 'touchmove' : 'mousemove');
        var endTypes = isPointer ? ['pointerup', 'pointercancel'] : (isTouch ? ['touchend', 'touchcancel'] : ['mouseup']);
        var move = function(ev) {
          var src = ev;
          if (isPointer && ev.pointerId !== pid) return;
          if (isTouch) {
            src = null;
            var list = ev.touches || [];
            for (var i = 0; i < list.length; i++) if (list[i].identifier === tid) src = list[i];
            if (!src) return;
          }
          if ((isTouch || isPointer) && ev.cancelable) ev.preventDefault();
          onPoint(toPt(src.clientX, src.clientY), p0);
        };
        var cleanup = function() {
          window.removeEventListener(moveType, move);
          endTypes.forEach(function(et) { window.removeEventListener(et, end); });
          if (isPointer) {
            target.removeEventListener('lostpointercapture', end);
            try { if (target.hasPointerCapture && target.hasPointerCapture(pid)) target.releasePointerCapture(pid); } catch (e) { /* already released */ }
          }
          if (dragRef.current === cleanup) dragRef.current = null;
        };
        var end = function(ev) {
          if (isPointer && ev && ev.pointerId != null && ev.pointerId !== pid) return;
          if (isTouch && ev && ev.changedTouches) {
            var hit = false;
            for (var i = 0; i < ev.changedTouches.length; i++) if (ev.changedTouches[i].identifier === tid) hit = true;
            if (!hit) return;
          }
          cleanup();
        };
        window.addEventListener(moveType, move, { passive: false });
        endTypes.forEach(function(et) { window.addEventListener(et, end); });
        if (isPointer) target.addEventListener('lostpointercapture', end);
        dragRef.current = cleanup;
      };
      // Handler props for a draggable shape: pointer events, or mouse + touch.
      var dragProps = function(fn) { return HAS_POINTER ? { onPointerDown: fn } : { onMouseDown: fn, onTouchStart: fn }; };
      var noTap = function() {};
      var grabStyle = function(cursor) { return { cursor: cursor, display: 'block', touchAction: 'none' }; };
      var exploreAngleAt = function(p) {
        var deg = Math.round(Math.atan2(-(p.y - cy), p.x - cx) * 180 / Math.PI);
        if (deg < 0) deg += 360;
        return snapAngle(deg);
      };
      var handleDrag = function(startEvt) { beginDrag(startEvt, function(p) { setAngleValue(exploreAngleAt(p)); setAngleFeedback(null); }); };
      var handleDrag2 = function(startEvt) { beginDrag(startEvt, function(p) { upd('secondAngle', exploreAngleAt(p)); }); };
      // Keyboard equivalent for the pointer-only ray handles (WCAG 2.1.1 / 2.5.7).
      var handleAngleKey = function(e, current, setter, afterChange) {
        // With snap on, a 5-degree step rounded straight back to where it started.
        var step = (e.shiftKey || snapEnabled) ? 15 : 5;
        var next;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(0, current - step);
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(360, current + step);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = 360;
        else return;
        e.preventDefault();
        setter(snapAngle(next));
        if (afterChange) afterChange();
      };

      // ══════════════════════════════════════════════════════════════
      // ── Credit, badges and the missed-items tally ──
      // ══════════════════════════════════════════════════════════════
      // Pay XP once per distinct item, ever (credited ids persist with the work).
      var creditOnce = function(key, points, reason) {
        if (creditGuardRef.current[key] || Object.prototype.hasOwnProperty.call(credited, key)) return false;
        creditGuardRef.current[key] = true;
        updMerge(function(cur) { return { credited: ANG.creditKey(cur.credited, key, 600).map }; });
        awardXP('protractor', points, reason);
        return true;
      };
      var tallyMiss = function(kind, code, item) {
        if (!code || code === 'ok' || code === 'nan') return;
        updMerge(function(cur) {
          var tally = Object.assign({}, plain(cur.misTally) ? cur.misTally : {});
          tally[code] = (Number(tally[code]) || 0) + 1;
          var log = (Array.isArray(cur.missedLog) ? cur.missedLog : []).slice(0, 29);
          log.unshift({ kind: kind, code: code, item: String(item || '').slice(0, 80), ts: Date.now() });
          return { misTally: tally, missedLog: log };
        });
      };
      var BADGE_TEXT = {
        first_angle: [t('stem.angles.badge_first_angle', 'First Angle'), t('stem.angles.first_angle_desc', 'Create your first angle')],
        right_on: [t('stem.angles.badge_right_on', 'Right On!'), t('stem.angles.right_on_desc', 'Create a perfect 90° angle')],
        straight_up: [t('stem.angles.badge_straight_up', 'Straight Up'), t('stem.angles.straight_up_desc', 'Create a 180° angle')],
        full_circle: [t('stem.angles.badge_full_circle', 'Full Circle'), t('stem.angles.full_circle_desc', 'Explore 360°')],
        acute_eye: [t('stem.angles.badge_acute_eye', 'Acute Eye'), t('stem.angles.acute_eye_desc', 'Correctly classify 5 acute angles')],
        streak_5: [t('stem.angles.badge_streak_5', 'On Fire'), t('stem.angles.streak_5_desc', '5 correct answers in a row')],
        streak_10: [t('stem.angles.badge_streak_10', 'Unstoppable'), t('stem.angles.streak_10_desc', '10 correct answers in a row')],
        speed_demon: [t('stem.angles.badge_speed_demon', 'Speed Demon'), t('stem.angles.speed_demon_desc', 'Score 10+ in speed round')],
        estimator: [t('stem.angles.badge_estimator', 'Sharp Estimator'), t('stem.angles.estimator_desc_v2', 'Estimate within tolerance three times')],
        all_types: [t('stem.angles.badge_all_types', 'Angle Master'), t('stem.angles.all_types_desc', 'Classify all 5 angle types correctly')],
        polygon_pro: [t('stem.angles.badge_polygon_pro', 'Polygon Pro'), t('stem.angles.polygon_pro_desc', 'Explore polygon angles for 5+ shapes')],
        century: [t('stem.angles.badge_century', 'Century Club'), t('stem.angles.century_desc', 'Answer 100 challenges total')]
      };
      // One check per answer, merged into the latest saved badges.
      var checkBadges = function(updates) {
        var awarded = [];
        var check = function(id, cond) {
          if (cond && !earnedBadges[id] && !badgeGuardRef.current[id]) { badgeGuardRef.current[id] = true; awarded.push(id); }
        };
        var s = updates || {};
        var curStreak = s.streak != null ? s.streak : streak;
        var curTotal = exploreScore.total + (s.totalDelta || 0);
        var curEstCount = s.estimateCount != null ? s.estimateCount : estimateCount;
        var curSpeedScore = s.speedScore != null ? s.speedScore : speedScore;
        var curTypesSeen = s.typesSeen || typesSeen;
        var curPolygons = s.polygonsExplored || polygonsExplored;

        check('first_angle', angleValue > 0);
        check('right_on', angleValue === 90);
        check('straight_up', angleValue === 180);
        check('full_circle', angleValue === 360 || angleValue === 0);
        check('acute_eye', (curTypesSeen['Acute'] || 0) >= 5);
        check('streak_5', curStreak >= 5);
        check('streak_10', curStreak >= 10);
        check('speed_demon', curSpeedScore >= 10);
        check('estimator', curEstCount >= 3);
        check('all_types', (curTypesSeen['Acute'] || 0) >= 1 && (curTypesSeen['Right'] || 0) >= 1 && (curTypesSeen['Obtuse'] || 0) >= 1 && (curTypesSeen['Straight'] || 0) >= 1 && (curTypesSeen['Reflex'] || 0) >= 1);
        check('polygon_pro', Object.keys(curPolygons).length >= 5);
        check('century', curTotal >= 100);

        if (awarded.length > 0) {
          var now = Date.now();
          updMerge(function(cur) {
            var nb = Object.assign({}, plain(cur.earnedBadges) ? cur.earnedBadges : {});
            awarded.forEach(function(bid) { if (!nb[bid]) nb[bid] = now; });
            return { earnedBadges: nb };
          });
          awarded.forEach(function(bid) {
            var badge = badgeDefs.find(function(b) { return b.id === bid; });
            var name = (BADGE_TEXT[bid] || [bid])[0];
            if (addToast) addToast(fill(t('stem.angles.badge_toast', '🏅 Badge: {icon} {name}!'), { icon: badge ? badge.icon : '', name: name }), 'success');
            // No XP for a speed badge: speed is not a learning achievement.
            if (bid !== 'speed_demon') awardXP('protractor_badge_' + bid, 5, fill(t('stem.angles.badge_xp_reason', 'Badge: {name}'), { name: name }));
          });
          if (soundEnabled) sfxBadge();
          if (celebrate) celebrate();
        }
      };

      // ══════════════════════════════════════════════════════════════
      // ── Challenge Logic ──
      // ══════════════════════════════════════════════════════════════
      var targetAngles = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330];

      // `extra` joins the same single badge check (estimateCount etc.).
      var recordCorrect = function(classType, extra) {
        var newStreak = streak + 1;
        var newBest = Math.max(bestStreak, newStreak);
        var newTypes = Object.assign({}, typesSeen);
        if (classType) newTypes[classType] = (newTypes[classType] || 0) + 1;
        upd({ streak: newStreak, bestStreak: newBest, typesSeen: newTypes });
        if (soundEnabled) sfxCorrect();
        checkBadges(Object.assign({ streak: newStreak, totalDelta: 1, typesSeen: newTypes }, extra || {}));
      };

      var recordWrong = function() {
        upd('streak', 0);
        if (soundEnabled) sfxWrong();
      };

      // Tolerance shrinks with streak (progressive difficulty)
      var tolerance = Math.max(1, 5 - Math.floor(streak / 3));

      var angleSubmissionPending = false;
      var checkAngle = function() {
        if (!angleChallenge || angleSubmissionPending ||
            (angleFeedback && (angleFeedback.correct || angleChallenge.type === 'classify'))) return;
        angleSubmissionPending = true;
        if (angleChallenge.type === 'create') {
          var diff = Math.abs(angleValue - angleChallenge.target);
          var ok = diff <= tolerance;
          var tries = num(angleChallenge.tries, 0) + 1;
          var msgOk = fill(t('stem.angles.fb_create_ok', '✅ Correct! {deg}° is a {cls} angle (tolerance ±{tol}°).'), { deg: angleValue, cls: clsLabel(classifyAngle(angleValue)), tol: tolerance });
          var msgNo = fill(t('stem.angles.fb_create_no', '❌ You made {deg}°. The target is {target}° (within {tol}°).'), { deg: angleValue, target: angleChallenge.target, tol: tolerance }) + ' ' + tryMoreText(tries);
          announce(ok ? msgOk : msgNo);
          setAngleFeedback(ok ? { correct: true, msg: msgOk } : { correct: false, msg: msgNo });
          if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
          else if (ok) setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
          // Moving the ray clears the feedback, which re-opened Check on a scored
          // challenge; marking it done makes one answer count once.
          if (ok) { setAngleChallenge(Object.assign({}, angleChallenge, { done: true, tries: tries })); creditOnce('create:' + angleChallenge.target, tries === 1 ? 5 : 3, 'create angle'); recordCorrect(classifyAngle(angleChallenge.target)); }
          else { setAngleChallenge(Object.assign({}, angleChallenge, { tries: tries })); recordWrong(); }
        }
      };
      var revealCreate = function() {
        if (!angleChallenge || angleChallenge.type !== 'create' || angleChallenge.done || num(angleChallenge.tries, 0) < 2 || !allowReveal) return;
        var msg = fill(t('stem.angles.fb_create_reveal', 'Here is {target}°. See where the ray crosses the scale, counting from 0 on the base ray.'), { target: angleChallenge.target });
        setAngleValue(angleChallenge.target);
        setAngleChallenge(Object.assign({}, angleChallenge, { done: true, revealed: true }));
        setAngleFeedback({ correct: false, revealed: true, msg: msg });
        announce(msg);
      };
      // Classify: a second try after a miss (the picked type is crossed off), then a reveal on demand.
      var classifyPicks = angleChallenge && Array.isArray(angleChallenge.picks) ? angleChallenge.picks : [];
      var answerClassify = function(cls) {
        if (!angleChallenge || angleSubmissionPending || angleChallenge.done || classifyPicks.indexOf(cls) !== -1) return;
        angleSubmissionPending = true;
        var correctClass = classifyAngle(angleChallenge.target);
        var ok = cls === correctClass, picks = classifyPicks.concat([cls]), tries = picks.length;
        var msg = ok
          ? fill(t('stem.angles.fb_classify_ok', '✅ Correct! {deg}° is {cls}.'), { deg: angleChallenge.target, cls: clsLabel(correctClass) })
          : fill(t('stem.angles.fb_classify_try', '❌ Not {pick}. Compare {deg}° with a right angle (90°) and a straight line (180°).'), { deg: angleChallenge.target, pick: clsLabel(cls) }) + ' ' + tryMoreText(tries);
        announce(msg);
        setAngleFeedback({ correct: ok, msg: msg });
        setAngleChallenge(Object.assign({}, angleChallenge, { picks: picks, tries: tries, done: ok }));
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
        else if (ok) setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
        if (ok) { creditOnce('classify:' + angleChallenge.target, tries === 1 ? 5 : 3, 'classify angle'); recordCorrect(correctClass); }
        else { recordWrong(); tallyMiss('classify', 'classify_wrong', angleChallenge.target + '°'); }
      };
      var revealClassify = function() {
        if (!angleChallenge || angleChallenge.type !== 'classify' || angleChallenge.done || classifyPicks.length < 2 || !allowReveal) return;
        var msg = fill(t('stem.angles.fb_classify_reveal', '{deg}° is {cls}.'), { deg: angleChallenge.target, cls: clsLabel(classifyAngle(angleChallenge.target)) });
        setAngleChallenge(Object.assign({}, angleChallenge, { done: true, revealed: true }));
        setAngleFeedback({ correct: false, revealed: true, msg: msg });
        announce(msg);
      };

      // ── Estimate Mode (predict a benchmark, type an estimate, then check) ──
      var startEstimate = function() {
        var e = ANG.makeEstimate(Math.random, level);
        setAngleValue(e.target);
        upd({ estimateActive: true, estimateTarget: e.target, estimateBase: e.base, estimateGuess: '', estimateResult: null, estimateBench: null, estimateTries: 0, estimateMiss: null });
      };
      // A miss keeps the angle hidden: it says only too big or too small, and whether the range was right.
      var estimateTries = num(d.estimateTries, 0);
      var estimateMiss = plain(d.estimateMiss) && isFinite(d.estimateMiss.guess) ? d.estimateMiss : null;
      var revealEstimate = function() {
        if (!estimateActive || estimateResult || estimateTries < 2 || !allowReveal) return;
        var g = estimateMiss ? estimateMiss.guess : 0, benchIdx = ANG.benchIndex(estimateTarget);
        upd({ estimateResult: { guess: g, target: estimateTarget, diff: Math.abs(g - estimateTarget), ok: false, exact: false, tol: ANG.estimateTol(level, streak), benchOk: estimateBench == null ? null : estimateBench === benchIdx, bench: benchIdx, revealed: true } });
        announce(fill(t('stem.angles.est_reveal_sr', 'The angle measures {target} degrees.'), { target: estimateTarget }));
      };

      var checkEstimate = function() {
        if (angleSubmissionPending || estimateResult) return;
        // A blank box is not a guess of 0; a decimal guess rounds to a whole degree.
        var guessText = String(estimateGuess == null ? '' : estimateGuess).trim();
        if (guessText === '') return;
        var guess = Math.round(Number(guessText));
        if (!Number.isSafeInteger(guess)) return;
        angleSubmissionPending = true;
        var diff = Math.abs(guess - estimateTarget);
        var estTolerance = ANG.estimateTol(level, streak);
        var ok = diff <= estTolerance;
        var exact = diff === 0;
        var benchIdx = ANG.benchIndex(estimateTarget);
        var benchOk = estimateBench == null ? null : estimateBench === benchIdx;
        var tries = estimateTries + 1;
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
        else if (ok) setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
        if (ok) {
          var newEstCount = estimateCount + 1;
          upd({ estimateResult: { guess: guess, target: estimateTarget, diff: diff, ok: true, exact: exact, tol: estTolerance, benchOk: benchOk, bench: benchIdx, tries: tries }, estimateCount: newEstCount, estimateTries: tries });
          creditOnce('estimate:' + estimateTarget + ':' + estimateBase, tries === 1 ? (exact ? 10 : 5) : 3, 'estimate angle');
          recordCorrect(classifyAngle(estimateTarget), { estimateCount: newEstCount });
          announce(fill(t('stem.angles.est_ok_sr', 'Close: you guessed {guess} degrees and the angle is {target} degrees.'), { guess: guess, target: estimateTarget }));
          return;
        }
        recordWrong();
        tallyMiss('estimate', benchOk === false ? 'bench_wrong' : 'estimate_off', estimateTarget + '°');
        upd({ estimateTries: tries, estimateMiss: { guess: guess, high: guess > estimateTarget, benchOk: benchOk } });
        announce(estimateMissText({ guess: guess, high: guess > estimateTarget, benchOk: benchOk }, tries));
      };
      var estimateMissText = function(m, tries) {
        return fill(m.high ? t('stem.angles.est_high', 'Not within ±{tol}°: {guess}° is too big.') : t('stem.angles.est_low', 'Not within ±{tol}°: {guess}° is too small.'), { tol: ANG.estimateTol(level, streak), guess: m.guess })
          + (m.benchOk === true ? ' ' + t('stem.angles.bench_ok', 'Your benchmark range was right.') : m.benchOk === false ? ' ' + t('stem.angles.bench_wrong_try', 'Your benchmark range was not right either.') : '')
          + ' ' + tryMoreText(tries);
      };

      // ── Speed Round ──
      var startSpeedRound = function() {
        var target = targetAngles[Math.floor(Math.random() * targetAngles.length)];
        upd({ speedActive: true, speedPaused: false, speedScore: 0, speedTimeLeft: 30, speedTarget: { angle: target, type: classifyAngle(target) } });
        // Drive the countdown from a LOCAL counter + a window score mirror. The captured
        // ctx.toolData is a per-render snapshot, so the old code read a STALE speedTimeLeft.
        window.__anglesSpeedScore = 0;
        window.__anglesSpeedPaused = false;
        if (window.__anglesSpeedTimer) { clearTimeout(window.__anglesSpeedTimer); }
        var timeLeft = 30;
        var countdown = function() {
          if (window.__anglesSpeedPaused) { window.__anglesSpeedTimer = null; return; }
          timeLeft -= 1;
          if (timeLeft <= 0) {
            window.__anglesSpeedTimer = null;
            window.__anglesSpeedResume = null;
            window.__anglesSpeedAddTime = null;
            var finalScore = window.__anglesSpeedScore || 0;
            upd({ speedActive: false, speedTimeLeft: 0 });
            if (addToast) addToast(fill(t('stem.angles.speed_over', '⏱️ Time’s up! Score: {n}'), { n: finalScore }), 'info');
            checkBadges({ speedScore: finalScore });
            return;
          }
          upd('speedTimeLeft', timeLeft);
          if (soundEnabled) sfxTick();
          window.__anglesSpeedTimer = setTimeout(countdown, 1000);
        };
        window.__anglesSpeedResume = function() { if (!window.__anglesSpeedTimer && !window.__anglesSpeedPaused && timeLeft > 0) window.__anglesSpeedTimer = setTimeout(countdown, 1000); };
        window.__anglesSpeedAddTime = function(seconds) { if (timeLeft > 0) { timeLeft += seconds; upd('speedTimeLeft', timeLeft); } };
        window.__anglesSpeedTimer = setTimeout(countdown, 1000);
      };

      var toggleSpeedPause = function() {
        if (!speedActive) return;
        window.__anglesSpeedPaused = !window.__anglesSpeedPaused;
        upd('speedPaused', window.__anglesSpeedPaused);
        if (window.__anglesSpeedPaused) { if (window.__anglesSpeedTimer) clearTimeout(window.__anglesSpeedTimer); window.__anglesSpeedTimer = null; }
        else if (window.__anglesSpeedResume) window.__anglesSpeedResume();
      };
      var extendSpeedRound = function() { if (speedActive && window.__anglesSpeedAddTime) window.__anglesSpeedAddTime(15); };

      var answerSpeed = function(cls) {
        if (!speedTarget || speedPaused) return;
        var ok = cls === speedTarget.type;
        if (ok) {
          var newScore = speedScore + 1;
          window.__anglesSpeedScore = newScore; // mirror for the countdown's final read (ctx.toolData is stale in its closure)
          var nextAngle = targetAngles[Math.floor(Math.random() * targetAngles.length)];
          upd({ speedScore: newScore, speedTarget: { angle: nextAngle, type: classifyAngle(nextAngle) } });
          if (soundEnabled) sfxCorrect();
          setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total + 1 }; });
        } else {
          if (soundEnabled) sfxWrong();
          setExploreScore(function(prev) { return { correct: prev.correct, total: prev.total + 1 }; });
          // A miss moves on; otherwise pressing every button scored each target.
          var missNext = targetAngles[Math.floor(Math.random() * targetAngles.length)];
          upd({ speedTarget: { angle: missNext, type: classifyAngle(missNext) } });
        }
      };

      // ── AI Tutor ──
      // Only offered when the host allows AI and no hidden answer is on screen.
      var askAITutor = function() {
        if (!callGemini || window.__anglesAiInFlight || hideNumbers || hideClass) return;
        window.__anglesAiReqId = (window.__anglesAiReqId || 0) + 1;
        var thisReqId = window.__anglesAiReqId;
        window.__anglesAiInFlight = true;
        upd({ aiLoading: true });
        var desc = 'The student is exploring ' + angleValue + '° (' + angleClass + ' angle). '
          + 'Score: ' + exploreScore.correct + '/' + exploreScore.total + '. Streak: ' + streak + '. '
          + 'Complementary: ' + (complementary != null ? complementary + '°' : 'N/A') + ', Supplementary: ' + (supplementary != null ? supplementary + '°' : 'N/A') + '.';
        var prompt = 'You are a friendly math tutor in a kids\' angle explorer game. ' + desc +
          ' Give 2-3 SHORT, encouraging tips about angles. Include one fun real-world angle fact. '
          + 'Keep it fun for ages 8-14. Return JSON: { "tips": ["tip1","tip2","tip3"], "funFact": "..." }';
        Promise.resolve(callGemini(prompt, true, false, 0.8)).then(function(resp) {
          if (thisReqId !== window.__anglesAiReqId) return;
          window.__anglesAiInFlight = false;
          try {
            var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g, '').replace(/```/g, '').trim()) : resp;
            var text = '';
            if (parsed && parsed.tips) parsed.tips.forEach(function(tip, i) { text += (i > 0 ? '\n' : '') + tip; });
            if (parsed && parsed.funFact) text += '\n\n📐 ' + parsed.funFact;
            upd({ aiAdvice: text || t('stem.angles.ai_fallback', 'Try exploring different angles!'), aiLoading: false });
          } catch (e) { upd({ aiAdvice: typeof resp === 'string' ? resp : t('stem.angles.ai_fallback', 'Try exploring different angles!'), aiLoading: false }); }
        }).catch(function() {
          if (thisReqId !== window.__anglesAiReqId) return;
          window.__anglesAiInFlight = false;
          upd({ aiAdvice: t('stem.angles.ai_error', '⚠️ Could not reach the AI tutor. Try again later!'), aiLoading: false });
        });
      };

      // ── Pin current angle (never while an estimate hides the angle) ──
      var pinAngle = function() {
        if (hideNumbers) return;
        var pins = (anglePins || []).slice();
        if (pins.length >= 8) { if (addToast) addToast(t('stem.angles.max_pins', '⚠️ Max 8 pins! Remove one first.'), 'error'); return; }
        pins.push({ deg: angleValue, cls: angleClass, color: cc.text.replace('text-', '') });
        upd('anglePins', pins);
        if (soundEnabled) sfxClick();
        announce(fill(t('stem.angles.pinned_sr', 'Pinned {deg} degrees.'), { deg: angleValue }));
      };

      var removePin = function(idx) {
        var pins = (anglePins || []).slice();
        pins.splice(idx, 1);
        upd('anglePins', pins);
      };

      // ── History logger ──
      var logAngle = function(angle, action) {
        var hist = (angleHistory || []).slice();
        hist.unshift({ deg: angle, cls: classifyAngle(angle), action: action, ts: Date.now() });
        if (hist.length > 20) hist = hist.slice(0, 20);
        upd('angleHistory', hist);
      };

      // ── SVG Export ──
      var exportSVG = function() {
        var svgEl = document.querySelector('[data-protractor-svg]');
        if (!svgEl) { if (addToast) addToast(t('stem.angles.svg_not_ready', '⚠️ Open the Explore tab to export its diagram.'), 'error'); return; }
        var svgData = new XMLSerializer().serializeToString(svgEl);
        var blob = new Blob([svgData], { type: 'image/svg+xml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'angle_explorer_' + (hideNumbers ? 'estimate' : angleValue + 'deg') + '_' + Date.now() + '.svg'; a.click();
        setTimeout(function() { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 1000);
        if (addToast) addToast(t('stem.angles.svg_exported', '📐 SVG exported!'), 'success');
      };

      // ══════════════════════════════════════════════════════════════
      // ── Non-visual equivalents: text clock, descriptions, sonified sweep ──
      // ══════════════════════════════════════════════════════════════
      var clockText = function(dir) { return fill(t('stem.angles.clock_pos', 'about {h} o’clock'), { h: ANG.clockHour(dir) }); };
      // A glide from one ray to the other: one second per right angle, with a
      // soft beat at every 45-degree benchmark passed and a bell at the end.
      var playSweep = function(sweepDeg) {
        stopSweep();
        var ac = getAudioCtx();
        if (!ac) { announce(t('stem.angles.sound_unavailable', 'Sound is not available on this device.')); return; }
        var deg = Math.max(0, Math.min(360, Math.abs(sweepDeg)));
        var dur = Math.max(0.15, deg / 90);
        try {
          if (ac.state === 'suspended' && ac.resume) ac.resume();
          var osc = ac.createOscillator(), gain = ac.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(260, ac.currentTime);
          osc.frequency.linearRampToValueAtTime(260 + deg * 2.4, ac.currentTime + dur);
          gain.gain.setValueAtTime(0.06, ac.currentTime);
          gain.gain.setValueAtTime(0.06, ac.currentTime + dur);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur + 0.1);
          osc.connect(gain); gain.connect(ac.destination);
          osc.start(); osc.stop(ac.currentTime + dur + 0.12);
          sweepRef.current.osc = osc;
        } catch (e) { /* audio unavailable */ }
        var s = sweepRef.current;
        for (var b = 45; b < deg; b += 45) {
          (function(at) { s.timers.push(setTimeout(function() { playTone(660, 0.05, 'triangle', 0.07); }, Math.round(at / 90 * 1000))); })(b);
        }
        s.timers.push(setTimeout(function() { playTone(988, 0.25, 'sine', 0.09); sweepRef.current.osc = null; }, Math.round(dur * 1000)));
      };
      var sweepHelp = t('stem.angles.sweep_help', 'The tone rises as it turns from one ray to the other: one second for every right angle, a soft beat at every 45°, and a bell when it reaches the second ray.');


      // ══════════════════════════════════════════════════════════════
      // ── Palette: SVG colours cannot use CSS vars; pick by theme ──
      // ══════════════════════════════════════════════════════════════
      var P = isDark ? {
        panel: '#0f172a', ink: '#e2e8f0', muted: '#cbd5e1', base: '#e2e8f0', ray: '#c4b5fd', draw: '#5eead4', hint: '#fbbf24',
        protFill: 'rgba(30,64,175,0.42)', protStroke: '#7dd3fc', tick: '#e2e8f0', inner: '#93c5fd', outer: '#fca5a5', vertex: '#f8fafc', arc: '#c4b5fd', given: '#fde68a', unknown: '#f9a8d4', line: '#cbd5e1', snap: '#86efac'
      } : {
        panel: '#ffffff', ink: '#1e293b', muted: '#475569', base: '#334155', ray: '#6d28d9', draw: '#0f766e', hint: '#92400e',
        protFill: 'rgba(224,242,254,0.62)', protStroke: '#0369a1', tick: '#0f172a', inner: '#1d4ed8', outer: '#b91c1c', vertex: '#0f172a', arc: '#6d28d9', given: '#92400e', unknown: '#be185d', line: '#334155', snap: '#15803d'
      };
      // Deterministic generator for default items (no state is written during render).
      var seeded = ANG.seedRng;
      var validTask = function(tk) { return plain(tk) && isFinite(tk.base) && isFinite(tk.m) && tk.m > 0 && tk.m < 180 && (tk.open === 1 || tk.open === -1) && isFinite(tk.vx) && isFinite(tk.vy); };
      var validPlace = function(p) { return plain(p) && isFinite(p.x) && isFinite(p.y) && isFinite(p.rot); };
      var readTolNow = ANG.readTol(level);

      // ══════════════════════════════════════════════════════════════
      // ── Protractor tab: read, draw and compare angles ──
      // ══════════════════════════════════════════════════════════════
      var PW = 420, PH = 350, PR = 125, RAYL = 150;
      var mMode = ['read', 'draw', 'compare'].indexOf(d.mMode) !== -1 ? d.mMode : 'read';
      var mTask = validTask(d.mTask) ? d.mTask : { base: 25, open: 1, m: 55, vx: 210, vy: 175, tol: readTolNow, start: { x: 130, y: 240, rot: 0 } };
      var mPlace = validPlace(d.mPlace) ? d.mPlace : mTask.start;
      var mAnswer = typeof d.mAnswer === 'string' ? d.mAnswer : '';
      var mTries = num(d.mTries, 0);
      var mResult = plain(d.mResult) ? d.mResult : null;
      var dTask = validTask(d.dTask) ? d.dTask : { base: 200, open: -1, m: 70, vx: 210, vy: 175, tol: readTolNow, start: { x: 290, y: 240, rot: 0 }, drawStart: 230 };
      var dPlace = validPlace(d.dPlace) ? d.dPlace : dTask.start;
      var dDir = num(d.dDir, num(dTask.drawStart, ANG.normDeg(dTask.base + 30)));
      var dTries = num(d.dTries, 0);
      var dResult = plain(d.dResult) ? d.dResult : null;
      var cTask = (plain(d.cTask) && plain(d.cTask.a) && plain(d.cTask.b)) ? d.cTask : ANG.makeCompareTask(seeded(11));
      var cTries = num(d.cTries, 0);
      var cResult = plain(d.cResult) ? d.cResult : null;
      var mSolved = num(d.mSolved, 0);
      var isDrawMode = mMode === 'draw';
      var curTask = isDrawMode ? dTask : mTask;
      var curPlace = isDrawMode ? dPlace : mPlace;
      var curResult = isDrawMode ? dResult : mResult;
      var curLocked = !!(curResult && (curResult.ok || curResult.revealed));
      // Placement feedback: is the centre on the vertex, and does the baseline lie
      // along the base ray (either end)? Neither says which scale to read.
      var snapState = function(place, tk) {
        var onV = Math.sqrt(Math.pow(place.x - tk.vx, 2) + Math.pow(place.y - tk.vy, 2)) <= ANG.VERTEX_TOL;
        var diff = ANG.normDeg(place.rot - tk.base) % 180, off = Math.min(diff, 180 - diff);
        return { onV: onV, aligned: onV && off < 0.5 };
      };
      var BASE_SNAP = 3;
      // Lined up on the base ray but facing away: the other ray passes under no scale.
      // The student can see this, so saying it names no scale.
      var missesScale = function(place) { return !isDrawMode && !curLocked && snapState(place, curTask).aligned && !ANG.rayReading(curTask.vx, curTask.vy, ANG.otherDir(curTask), place, PR - 2); };
      var flipText = function() { return t('stem.angles.snap_flip', 'The other ray misses the scale. Turn the protractor half a turn so the scale covers the opening.'); };
      var setPlace = function(p, byDrag) {
        var np = { x: Math.max(10, Math.min(PW - 10, p.x)), y: Math.max(10, Math.min(PH - 10, p.y)), rot: Math.round(ANG.normDeg(p.rot)) };
        var held = byDrag ? snapRef.current : { onV: false, aligned: false };
        if (Math.sqrt(Math.pow(np.x - curTask.vx, 2) + Math.pow(np.y - curTask.vy, 2)) < ANG.VERTEX_SNAP + (held.onV ? 4 : 0)) { np.x = curTask.vx; np.y = curTask.vy; }
        // A drag that brings the baseline within a few degrees of the base ray's line
        // snaps onto it, at whichever end is nearer. Keys turn one degree exactly, so
        // they never snap (a snap would undo a one-degree turn away).
        if (byDrag && np.x === curTask.vx && np.y === curTask.vy) {
          var dRel = ANG.normDeg(np.rot - curTask.base), dOff = Math.min(dRel % 180, 180 - dRel % 180);
          if (dOff <= BASE_SNAP + (held.aligned ? 2 : 0)) np.rot = Math.round(ANG.normDeg((dRel <= 90 || dRel >= 270) ? curTask.base : curTask.base + 180));
        }
        if (isDrawMode) upd({ dTask: dTask, dPlace: np }); else upd({ mTask: mTask, mPlace: np });
        var was = snapRef.current, now = snapState(np, curTask);
        if (byDrag) {
          var msgs = [];
          if (now.onV && !was.onV) msgs.push(t('stem.angles.snap_centre_sr', 'The centre is on the vertex.'));
          if (now.aligned && !was.aligned) { msgs.push(t('stem.angles.snap_base_sr', 'The baseline lies along the base ray.')); if (missesScale(np)) msgs.push(flipText()); }
          if (msgs.length) { announce(msgs.join(' ')); if (soundEnabled) sfxClick(); }
        }
        snapRef.current = now;
        return np;
      };
      var correctPlace = function(tk) { return { x: tk.vx, y: tk.vy, rot: tk.open === 1 ? tk.base : ANG.normDeg(tk.base + 180) }; };
      var newMeasureTask = function(mode) {
        var m2 = mode || mMode;
        stopSweep();
        if (m2 === 'compare') { upd({ mMode: 'compare', cTask: ANG.makeCompareTask(Math.random), cTries: 0, cResult: null }); return; }
        if (m2 === 'draw') {
          var dt = ANG.makeDrawTask(Math.random, level);
          upd({ mMode: 'draw', dTask: dt, dPlace: dt.start, dDir: dt.drawStart, dTries: 0, dResult: null });
          announce(fill(t('stem.angles.draw_new_sr', 'New task: draw an angle of {m} degrees from the base ray.'), { m: dt.m }));
          return;
        }
        var nt = ANG.makeMeasureTask(Math.random, level);
        upd({ mMode: 'read', mTask: nt, mPlace: nt.start, mAnswer: '', mTries: 0, mResult: null });
        announce(t('stem.angles.read_new_sr', 'New angle to measure. Move the protractor onto the vertex.'));
      };

      // Protractor drags go through the shared pointer-capture core.
      var bindDrag = function(startEvt, onPoint) { beginDrag(startEvt, onPoint); };
      var startMoveDrag = function(e) {
        if (curLocked) return;
        var place0 = { x: curPlace.x, y: curPlace.y, rot: curPlace.rot };
        snapRef.current = snapState(curPlace, curTask);
        bindDrag(e, function(p, p0) { setPlace({ x: place0.x + (p.x - p0.x), y: place0.y + (p.y - p0.y), rot: place0.rot }, true); });
      };
      var startRotateDrag = function(e) {
        if (curLocked) return;
        var place0 = { x: curPlace.x, y: curPlace.y, rot: curPlace.rot };
        snapRef.current = snapState(curPlace, curTask);
        // The knob sits at the top of the protractor: 90 degrees from its baseline.
        bindDrag(e, function(p) { setPlace({ x: place0.x, y: place0.y, rot: Math.atan2(-(p.y - place0.y), p.x - place0.x) * 180 / Math.PI - 90 }, true); });
      };
      var startDrawDrag = function(e) {
        if (!isDrawMode || curLocked) return;
        bindDrag(e, function(p) { upd({ dTask: dTask, dDir: Math.round(ANG.normDeg(Math.atan2(-(p.y - dTask.vy), p.x - dTask.vx) * 180 / Math.PI)) }); });
      };
      var nudge = function(dx, dy, drot) {
        if (curLocked) return;
        var np = setPlace({ x: curPlace.x + dx, y: curPlace.y + dy, rot: curPlace.rot + drot });
        announce(placeSentence(np) + (missesScale(np) ? ' ' + flipText() : ''));
      };
      var onProtractorKey = function(e) {
        var big = e.shiftKey ? 2 : 10;
        if (e.key === 'ArrowLeft') nudge(-big, 0, 0);
        else if (e.key === 'ArrowRight') nudge(big, 0, 0);
        else if (e.key === 'ArrowUp') nudge(0, -big, 0);
        else if (e.key === 'ArrowDown') nudge(0, big, 0);
        else if (e.key === 'PageUp') nudge(0, 0, e.shiftKey ? 15 : 1);
        else if (e.key === 'PageDown') nudge(0, 0, e.shiftKey ? -15 : -1);
        else if (e.key === 'End') nudge(0, 0, 180);
        else return;
        e.preventDefault();
      };
      var onDrawKey = function(e) {
        if (curLocked) return;
        var step = e.shiftKey ? 10 : 1, nd = null;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nd = dDir + step;
        else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nd = dDir - step;
        else return;
        e.preventDefault();
        nd = Math.round(ANG.normDeg(nd));
        upd({ dTask: dTask, dDir: nd });
        var rr = ANG.rayReading(dTask.vx, dTask.vy, nd, dPlace, PR - 2);
        announce(rr ? fill(t('stem.angles.draw_key_sr', 'Your ray points {clock}. It crosses the inner scale at {i} and the outer scale at {o}.'), { clock: clockText(nd), i: Math.round(rr.inner), o: Math.round(rr.outer) })
          : fill(t('stem.angles.draw_key_sr_off', 'Your ray points {clock}. It does not cross the protractor scale.'), { clock: clockText(nd) }));
      };

      // What a sighted student sees, in words: the centre, the baseline and each crossing.
      var placeSentence = function(place) {
        var dx = Math.round(place.x - curTask.vx), dy = Math.round(place.y - curTask.vy);
        var onV = Math.sqrt(dx * dx + dy * dy) <= ANG.VERTEX_TOL;
        if (onV && snapState(place, curTask).aligned) return fill(t('stem.angles.place_on_vertex_aligned', 'The protractor centre is on the vertex, and its baseline lies along the base ray. The baseline points {clock}.'), { clock: clockText(place.rot) });
        if (onV) return fill(t('stem.angles.place_on_vertex', 'The protractor centre is on the vertex. Its baseline points {clock}.'), { clock: clockText(place.rot) });
        return fill(t('stem.angles.place_off_vertex', 'The protractor centre is {dx} units {lr} and {dy} units {ud} the vertex. Its baseline points {clock}.'), {
          dx: Math.abs(dx), lr: dx < 0 ? t('stem.angles.dir_left_of', 'left of') : t('stem.angles.dir_right_of', 'right of'),
          dy: Math.abs(dy), ud: dy < 0 ? t('stem.angles.dir_above', 'above') : t('stem.angles.dir_below', 'below'), clock: clockText(place.rot)
        });
      };
      var crossSentence = function(which, dir, place) {
        var rr = ANG.rayReading(curTask.vx, curTask.vy, dir, place, PR - 2);
        var name = which === 'base' ? t('stem.angles.ray_base', 'The base ray') : (which === 'draw' ? t('stem.angles.ray_yours', 'Your ray') : t('stem.angles.ray_other', 'The other ray'));
        if (!rr) return fill(t('stem.angles.cross_none', '{ray} points {clock} and does not cross the protractor scale.'), { ray: name, clock: clockText(dir) });
        return fill(t('stem.angles.cross_both', '{ray} points {clock} and crosses the inner scale at {i} and the outer scale at {o}.'), { ray: name, clock: clockText(dir), i: Math.round(rr.inner), o: Math.round(rr.outer) });
      };

      var protractorGroup = function(place, interactive) {
        var kids = [];
        kids.push(h('path', { key: 'body', d: 'M ' + (-PR) + ' 0 A ' + PR + ' ' + PR + ' 0 0 1 ' + PR + ' 0 Z', fill: P.protFill, stroke: P.protStroke, strokeWidth: 1.5 }));
        kids.push(h('path', { key: 'ring', d: 'M ' + (-(PR - 28)) + ' 0 A ' + (PR - 28) + ' ' + (PR - 28) + ' 0 0 1 ' + (PR - 28) + ' 0', fill: 'none', stroke: P.protStroke, strokeWidth: 0.6, strokeDasharray: '2,3' }));
        for (var dg = 0; dg <= 180; dg++) {
          var len = dg % 10 === 0 ? 13 : (dg % 5 === 0 ? 9 : 5);
          var a1 = ANG.pt(0, 0, PR, dg), a2 = ANG.pt(0, 0, PR - len, dg);
          kids.push(h('line', { key: 'k' + dg, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: P.tick, strokeWidth: dg % 10 === 0 ? 1.1 : 0.6 }));
        }
        for (var lb = 0; lb <= 180; lb += 10) {
          var po = ANG.pt(0, 0, PR - 21, lb), pin = ANG.pt(0, 0, PR - 36, lb);
          kids.push(h('text', { key: 'o' + lb, x: po.x, y: po.y + (lb % 180 === 0 ? -4 : 3.5), textAnchor: 'middle', fill: P.outer, style: { fontSize: 10, fontWeight: 700 } }, String(180 - lb)));
          kids.push(h('text', { key: 'i' + lb, x: pin.x, y: pin.y + (lb % 180 === 0 ? -4 : 3.5), textAnchor: 'middle', fill: P.inner, style: { fontSize: 10, fontWeight: 700 } }, String(lb)));
        }
        kids.push(h('line', { key: 'bl', x1: -PR, y1: 0, x2: PR, y2: 0, stroke: P.protStroke, strokeWidth: 1.5 }));
        kids.push(h('line', { key: 'c1', x1: -9, y1: 0, x2: 9, y2: 0, stroke: P.tick, strokeWidth: 1.6 }));
        kids.push(h('line', { key: 'c2', x1: 0, y1: -9, x2: 0, y2: 0, stroke: P.tick, strokeWidth: 1.6 }));
        kids.push(h('circle', { key: 'c3', cx: 0, cy: 0, r: 2.5, fill: 'none', stroke: P.tick, strokeWidth: 1.2 }));
        var body = h('g', { key: 'bodyg', 'aria-hidden': 'true', 'data-angles-prot-body': 'true', style: interactive ? grabStyle(!curLocked ? 'move' : 'default') : { cursor: 'default', touchAction: 'auto' }, onClick: interactive ? noTap : undefined, onPointerDown: interactive && HAS_POINTER ? startMoveDrag : undefined, onMouseDown: interactive && !HAS_POINTER ? startMoveDrag : undefined, onTouchStart: interactive && !HAS_POINTER ? startMoveDrag : undefined }, kids);
        var knob = interactive && !curLocked && h('g', Object.assign({ key: 'knob', 'aria-hidden': 'true', 'data-angles-knob': 'true', style: grabStyle('grab'), onClick: noTap }, dragProps(startRotateDrag)),
          h('line', { x1: 0, y1: -PR, x2: 0, y2: -PR - 10, stroke: P.protStroke, strokeWidth: 1.5 }),
          h('circle', { cx: 0, cy: -PR - 22, r: 13, fill: P.panel, stroke: P.protStroke, strokeWidth: 2 }),
          h('text', { x: 0, y: -PR - 17, textAnchor: 'middle', fill: P.protStroke, style: { fontSize: 14, fontWeight: 700 } }, '↻'),
          // 44 px for a finger even at 320 px wide, where the drawn knob is 17 px.
          h('circle', { 'data-angles-knob-hit': 'true', cx: 0, cy: -PR - 22, r: 34, fill: 'transparent' }));
        return h('g', { transform: 'translate(' + place.x + ' ' + place.y + ') rotate(' + (-place.rot) + ')' }, body, knob);
      };
      var arcPath = function(x, y, rr, fromDeg, sweep) {
        // sweep > 0 counterclockwise (math), < 0 clockwise
        var a = ANG.pt(x, y, rr, fromDeg), b = ANG.pt(x, y, rr, fromDeg + sweep);
        var large = Math.abs(sweep) > 180 ? 1 : 0, sw = sweep > 0 ? 0 : 1;
        return 'M ' + a.x + ' ' + a.y + ' A ' + rr + ' ' + rr + ' 0 ' + large + ' ' + sw + ' ' + b.x + ' ' + b.y;
      };

      var renderMeasureSvg = function() {
        var tk = curTask, other = ANG.otherDir(tk);
        var baseEnd = ANG.pt(tk.vx, tk.vy, RAYL, tk.base), otherEnd = ANG.pt(tk.vx, tk.vy, RAYL, other);
        var drawEnd = ANG.pt(tk.vx, tk.vy, RAYL, dDir);
        var place = curPlace;
        var showAnswer = curLocked;
        var snapNow = snapState(place, tk);
        var kids = [];
        kids.push(h('rect', { key: 'bg', x: 0, y: 0, width: PW, height: PH, fill: P.panel }));
        // The base ray turns green and thicker once the baseline lies along it.
        kids.push(h('line', { key: 'base', 'data-angles-base-snapped': snapNow.aligned ? 'true' : 'false', x1: tk.vx, y1: tk.vy, x2: baseEnd.x, y2: baseEnd.y, stroke: snapNow.aligned ? P.snap : P.base, strokeWidth: snapNow.aligned ? 5 : 3, strokeLinecap: 'round' }));
        if (!isDrawMode) {
          kids.push(h('line', { key: 'other', x1: tk.vx, y1: tk.vy, x2: otherEnd.x, y2: otherEnd.y, stroke: P.ray, strokeWidth: 3, strokeLinecap: 'round' }));
          kids.push(h('path', { key: 'arc', d: arcPath(tk.vx, tk.vy, 26, tk.base, tk.open * tk.m), fill: 'none', stroke: P.arc, strokeWidth: 1.6 }));
        } else {
          if (showAnswer) kids.push(h('line', { key: 'want', x1: tk.vx, y1: tk.vy, x2: otherEnd.x, y2: otherEnd.y, stroke: P.hint, strokeWidth: 2, strokeDasharray: '6,4' }));
          kids.push(h('line', { key: 'drawn', x1: tk.vx, y1: tk.vy, x2: drawEnd.x, y2: drawEnd.y, stroke: P.draw, strokeWidth: 3, strokeLinecap: 'round' }));
        }
        kids.push(protractorGroup(place, true));
        // A ring round the vertex once the centre sits on it.
        if (snapNow.onV) kids.push(h('circle', { key: 'vring', 'data-angles-vertex-ring': 'true', cx: tk.vx, cy: tk.vy, r: 11, fill: 'none', stroke: P.snap, strokeWidth: 2.5 }));
        kids.push(h('circle', { key: 'vx', cx: tk.vx, cy: tk.vy, r: 3.5, fill: P.vertex }));
        var lab = ANG.pt(tk.vx, tk.vy, 16, tk.base + 200);
        kids.push(h('text', { key: 'vl', x: lab.x, y: lab.y + 4, textAnchor: 'middle', fill: P.ink, style: { fontSize: 12, fontWeight: 700 } }, 'V'));
        if (isDrawMode && !curLocked) {
          kids.push(h('circle', { key: 'dh', cx: drawEnd.x, cy: drawEnd.y, r: 16, fill: P.draw, fillOpacity: 0.18, stroke: P.draw, strokeWidth: 2, tabIndex: 0, role: 'slider',
            'aria-label': t('stem.angles.a11y_draw_ray', 'Ray you are drawing'), 'aria-valuemin': 1, 'aria-valuemax': 12, 'aria-valuenow': ANG.clockHour(dDir), 'aria-valuetext': clockText(dDir),
            'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown', style: grabStyle('grab'), onClick: noTap, onPointerDown: HAS_POINTER ? startDrawDrag : undefined, onMouseDown: HAS_POINTER ? undefined : startDrawDrag, onTouchStart: HAS_POINTER ? undefined : startDrawDrag, onKeyDown: onDrawKey }));
        }
        if (showAnswer) {
          var labDir = tk.base + tk.open * tk.m / 2, lp = ANG.pt(tk.vx, tk.vy, 44, labDir);
          kids.push(h('text', { key: 'ans', x: lp.x, y: lp.y + 4, textAnchor: 'middle', fill: P.hint, style: { fontSize: 13, fontWeight: 800 } }, tk.m + '°'));
        }
        // The focusable protractor: arrow keys move it, Page Up / Page Down turn it.
        kids.push(h('circle', { key: 'focus', cx: place.x, cy: place.y, r: 16, fill: 'transparent', stroke: P.hint, strokeWidth: 2, strokeDasharray: '3,3', tabIndex: curLocked ? -1 : 0,
          role: 'group', 'aria-roledescription': t('stem.angles.a11y_movable_protractor', 'movable protractor'),
          'aria-label': t('stem.angles.a11y_protractor_keys_v2', 'Protractor. Arrow keys move it; Shift for small steps. Page Up and Page Down turn it one degree; Shift for 15 degrees. End turns it half a turn.'),
          'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown End',
          'aria-describedby': 'stem-angles-prot-desc', 'data-angles-protractor': 'true', style: grabStyle(curLocked ? 'default' : 'move'), onClick: noTap,
          onKeyDown: onProtractorKey, onPointerDown: HAS_POINTER ? startMoveDrag : undefined, onMouseDown: HAS_POINTER ? undefined : startMoveDrag, onTouchStart: HAS_POINTER ? undefined : startMoveDrag }));
        return h('svg', { viewBox: '0 0 ' + PW + ' ' + PH, role: 'group', 'aria-label': isDrawMode ? t('stem.angles.a11y_draw_scene', 'A base ray, the ray you are drawing, and a movable protractor') : t('stem.angles.a11y_read_scene', 'An angle to measure and a movable protractor'),
          'data-angles-measure-svg': 'true', style: { width: '100%', height: 'auto', maxWidth: 560, display: 'block', margin: '0 auto', touchAction: 'pan-y', borderRadius: 12 } }, kids);
      };

      var renderCompareSvg = function() {
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: 420, height: 220, fill: P.panel })];
        [['A', cTask.a, 105], ['B', cTask.b, 315]].forEach(function(row) {
          var nm = row[0], an = row[1], vx = row[2], vy = 120, L = an.len * 0.75;
          var e1 = ANG.pt(vx, vy, L, an.base), e2 = ANG.pt(vx, vy, L, an.base + an.m);
          kids.push(h('line', { key: nm + '1', x1: vx, y1: vy, x2: e1.x, y2: e1.y, stroke: P.base, strokeWidth: 3, strokeLinecap: 'round' }));
          kids.push(h('line', { key: nm + '2', x1: vx, y1: vy, x2: e2.x, y2: e2.y, stroke: P.ray, strokeWidth: 3, strokeLinecap: 'round' }));
          kids.push(h('path', { key: nm + 'a', d: arcPath(vx, vy, 18, an.base, an.m), fill: 'none', stroke: P.arc, strokeWidth: 1.6 }));
          kids.push(h('circle', { key: nm + 'v', cx: vx, cy: vy, r: 3, fill: P.vertex }));
          kids.push(h('text', { key: nm + 't', x: vx, y: 212, textAnchor: 'middle', fill: P.ink, style: { fontSize: 16, fontWeight: 800 } }, nm));
          if (cResult && (cResult.ok || cResult.revealed)) {
            var lp = ANG.pt(vx, vy, 34, an.base + an.m / 2);
            kids.push(h('text', { key: nm + 'm', x: lp.x, y: lp.y + 4, textAnchor: 'middle', fill: P.hint, style: { fontSize: 12, fontWeight: 800 } }, an.m + '°'));
          }
        });
        return h('svg', { viewBox: '0 0 420 220', role: 'img', 'aria-label': t('stem.angles.a11y_compare_scene', 'Two angles, A and B, with rays of different lengths'), style: { width: '100%', height: 'auto', maxWidth: 560, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };

      var MIS_TEXT = {
        wrong_scale: t('stem.angles.mis_wrong_scale', 'You read the other scale. Find the 0 that sits on the base ray, and count up on that same scale.'),
        reflex: t('stem.angles.mis_reflex', 'That is the angle all the way round the outside. The opening between these two rays is less than 180°.'),
        vertex_off: t('stem.angles.mis_vertex_off', 'The protractor’s centre is not on the vertex, so the scale reading is off. Move the centre mark onto the vertex first.'),
        wrong_zero: t('stem.angles.mis_wrong_zero', 'The base ray is not on 0, so the number where the other ray crosses is not the angle. Turn the protractor until the base ray lines up with 0, or subtract the two readings.'),
        close: t('stem.angles.mis_close', 'Close. Count the small 1° ticks from the nearest labelled ten.'),
        off: t('stem.angles.mis_off', 'Not quite. Put the centre on the vertex, line the baseline up with the base ray, and read the scale that starts at 0 on the base ray.'),
        nan: t('stem.angles.mis_nan', 'Type a number of degrees, for example 65.'),
        ray_length: t('stem.angles.mis_ray_length', 'Longer rays do not make a bigger angle. An angle’s size is the amount of turn between its rays: compare the openings, not the lengths.'),
        compare_off: t('stem.angles.mis_compare_off', 'Look again at how far each angle opens. Imagine laying one angle on top of the other at the vertex.')
      };
      var MIS_LABEL = {
        wrong_scale: t('stem.angles.misl_wrong_scale', 'Read the wrong protractor scale'),
        reflex: t('stem.angles.misl_reflex', 'Gave the outside (reflex) angle'),
        vertex_off: t('stem.angles.misl_vertex_off', 'Protractor centre not on the vertex'),
        wrong_zero: t('stem.angles.misl_wrong_zero', 'Counted from the wrong zero'),
        close: t('stem.angles.misl_close', 'Close: tick-counting slip'),
        off: t('stem.angles.misl_off', 'Other reading error'),
        ray_length: t('stem.angles.misl_ray_length', 'Judged size by ray length'),
        compare_off: t('stem.angles.misl_compare_off', 'Compared openings wrongly'),
        classify_wrong: t('stem.angles.misl_classify_wrong', 'Named the wrong angle type'),
        bench_wrong: t('stem.angles.misl_bench_wrong', 'Picked the wrong benchmark range'),
        estimate_off: t('stem.angles.misl_estimate_off', 'Estimate outside the tolerance'),
        used_180: t('stem.angles.misl_used_180', 'Complementary: used 180° instead of 90°'),
        used_90: t('stem.angles.misl_used_90', 'Straight line: used 90° instead of 180°'),
        copied_given: t('stem.angles.misl_copied_given', 'Copied the given angle'),
        vert_is_supp: t('stem.angles.misl_vert_is_supp', 'Treated vertical angles as adding to 180°'),
        linear_is_equal: t('stem.angles.misl_linear_is_equal', 'Treated a linear pair as equal'),
        point_used_180: t('stem.angles.misl_point_used_180', 'Around a point: used 180° instead of 360°'),
        gave_sum: t('stem.angles.misl_gave_sum', 'Gave the sum of the known angles'),
        tri_used_360: t('stem.angles.misl_tri_used_360', 'Triangle: used 360° instead of 180°'),
        trans_equal_as_supp: t('stem.angles.misl_trans_equal_as_supp', 'Parallel lines: equal pair treated as adding to 180°'),
        trans_supp_as_equal: t('stem.angles.misl_trans_supp_as_equal', 'Parallel lines: supplementary pair treated as equal'),
        rad_used_360: t('stem.angles.misl_rad_used_360', 'Radians: used 2π for a half turn'),
        rad_typed_degrees: t('stem.angles.misl_rad_typed_degrees', 'Radians: typed degrees'),
        rad_pi_is_360: t('stem.angles.misl_rad_pi_is_360', 'Radians: took π as 360°'),
        rad_typed_radians: t('stem.angles.misl_rad_typed_radians', 'Radians: left the answer in radians'),
        arith: t('stem.angles.misl_arith', 'Arithmetic slip'),
        reason_wrong: t('stem.angles.misl_reason_wrong', 'Picked a reason that does not fit'),
        tri_counted_sides: t('stem.angles.misl_tri_sides', 'Polygons: counted sides instead of triangles'),
        tri_counted_diagonals: t('stem.angles.misl_tri_diags', 'Polygons: counted diagonals instead of triangles'),
        tri_off: t('stem.angles.misl_tri_off', 'Polygons: miscounted the triangles'),
        sum_n180: t('stem.angles.misl_sum_n180', 'Polygons: used n × 180° for the angle sum'),
        sum_360: t('stem.angles.misl_sum_360', 'Polygons: assumed every angle sum is 360°'),
        sum_arith: t('stem.angles.misl_sum_arith', 'Polygons: multiplied the triangles wrongly'),
        pg_claim_wrong: t('stem.angles.misl_pg_claim', 'Polygons: chose a rule the evidence breaks'),
        pg_why_wrong: t('stem.angles.misl_pg_why', 'Polygons: chose a reason that does not explain the rule'),
        walk_why_wrong: t('stem.angles.misl_walk_why', 'Exterior angles: misexplained the 360° total'),
        tile_gap: t('stem.angles.misl_tile_gap', 'Tiling: said a polygon tiles when copies leave a gap'),
        tile_missed: t('stem.angles.misl_tile_missed', 'Tiling: missed a polygon that tiles'),
        tile_claim_wrong: t('stem.angles.misl_tile_claim', 'Tiling: chose a statement the evidence breaks'),
        n180: t('stem.angles.misl_n180', 'Polygons: used n × 180°'),
        sum360: t('stem.angles.misl_sum360', 'Polygons: used 360° for a polygon that is not four-sided'),
        sides_forgot_2: t('stem.angles.misl_sides_forgot_2', 'Polygons: gave the number of triangles, not sides'),
        sides_off_one: t('stem.angles.misl_sides_off_one', 'Polygons: sides off by one'),
        reg_gave_total: t('stem.angles.misl_reg_total', 'Regular polygon: gave the total, not one angle'),
        int_ext_swap: t('stem.angles.misl_int_ext', 'Mixed up interior and exterior angles'),
        ext_gave_total: t('stem.angles.misl_ext_total', 'Exterior angles: gave the 360° total'),
        extn_used_180: t('stem.angles.misl_extn_180', 'Exterior angles: used 180° instead of 360°'),
        pg_off: t('stem.angles.misl_pg_off', 'Polygons: other error'),
        insc_equal_central: t('stem.angles.misl_insc_equal', 'Circles: took the inscribed angle as equal to the central angle'),
        insc_double: t('stem.angles.misl_insc_double', 'Circles: doubled instead of halving'),
        insc_other_arc: t('stem.angles.misl_insc_arc', 'Circles: used the wrong arc'),
        cent_half: t('stem.angles.misl_cent_half', 'Circles: halved instead of doubling'),
        semi_no_right: t('stem.angles.misl_semi_no_right', 'Semicircle: forgot the right angle at P'),
        semi_equal: t('stem.angles.misl_semi_equal', 'Semicircle: assumed the base angles are equal'),
        semi_gave_90: t('stem.angles.misl_semi_90', 'Semicircle: gave the right angle for the wrong corner'),
        semi_straight: t('stem.angles.misl_semi_straight', 'Semicircle: took the angle at P as straight'),
        cyc_equal: t('stem.angles.misl_cyc_equal', 'Cyclic quadrilateral: opposite angles taken as equal'),
        cyc_360: t('stem.angles.misl_cyc_360', 'Cyclic quadrilateral: used 360° for an opposite pair'),
        cyc_90: t('stem.angles.misl_cyc_90', 'Cyclic quadrilateral: used 90° for an opposite pair'),
        ci_off: t('stem.angles.misl_ci_off', 'Circles: other error'),
        sign_quadrant: t('stem.angles.misl_sign_quadrant', 'Unit circle: wrong sign for the quadrant'),
        swap_sin_cos: t('stem.angles.misl_swap', 'Unit circle: swapped sine and cosine'),
        ref_180_minus: t('stem.angles.misl_ref_180', 'Reference angle: used 180° − θ outside quadrant II'),
        ref_gave_theta: t('stem.angles.misl_ref_theta', 'Reference angle: gave the angle itself'),
        ref_from_y: t('stem.angles.misl_ref_y', 'Reference angle: measured to the y-axis'),
        rad_times_180: t('stem.angles.misl_rad_180', 'Radians: multiplied by 180, as if 1 radian were 180°'),
        rad_wrong_way: t('stem.angles.misl_rad_wrong_way', 'Radians: converted the wrong way'),
        pi_is_180_number: t('stem.angles.misl_pi_180', 'Radians: treated π as the number 180'),
        uc_off: t('stem.angles.misl_uc_off', 'Unit circle: other error'),
        clock_hour_static: t('stem.angles.misl_clock_static', 'Clocks: left the hour hand on the hour'),
        clock_reflex: t('stem.angles.misl_clock_reflex', 'Clocks: gave the larger angle'),
        bearing_no_wrap: t('stem.angles.misl_bearing_wrap', 'Bearings: went past 360°'),
        turn_ccw: t('stem.angles.misl_turn_ccw', 'Bearings: turned the wrong way'),
        quad_gave_angle: t('stem.angles.misl_quad', 'Bearings: gave the angle from N or S, not the bearing'),
        bearing_ccw: t('stem.angles.misl_bearing_ccw', 'Bearings: measured counterclockwise'),
        bearing_from_east: t('stem.angles.misl_bearing_east', 'Bearings: measured from east'),
        pitch_complement: t('stem.angles.misl_pitch_comp', 'Slopes: used the angle with the vertical'),
        pitch_used_sin: t('stem.angles.misl_pitch_sin', 'Slopes: used sine instead of tangent'),
        pitch_percent: t('stem.angles.misl_pitch_percent', 'Slopes: gave the percent grade, not the angle'),
        ada_wrong: t('stem.angles.misl_ada', 'Ramps: misjudged the 1:12 rule'),
        cx_off: t('stem.angles.misl_cx_off', 'Real-world problems: other error'),
        con_width_changed: t('stem.angles.misl_con_width', 'Constructions: changed the compass width between matching arcs'),
        con_first_width_changed: t('stem.angles.misl_con_first', 'Constructions: the copied arc used a different width'),
        con_width_not_de: t('stem.angles.misl_con_de', 'Constructions: did not set the compass to the chord DE')
      };

      // ── One rule on every tab: a wrong answer gets named feedback and another
      //    try; after two tries a "Show the answer" button (no credit) and, when
      //    the host allows AI, a nudge from ctx.getHint. Nothing reveals itself.
      var canAskAi = typeof ctx.getHint === 'function' && aiAllowed;
      var tryMoreText = function(tries) {
        return tries >= 2 && allowReveal ? t('stem.angles.try_again_or_show', 'Try again, or show the answer below.') : t('stem.angles.try_again', 'Try again.');
      };
      // ai = { q: question, wrong: the student's answer, right: answer text, text: a hint already given, save: fn(text) }
      var afterTwo = function(key, tries, locked, onReveal, ai) {
        if (locked || !(tries >= 2)) return null;
        var aiText = ai && typeof ai.text === 'string' ? ai.text : '';
        return h('div', { key: 'after2-' + key, className: 'flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 p-2', 'data-angles-after-two': key },
          h('p', { className: 'w-full text-xs font-bold text-slate-800' }, allowReveal
            ? t('stem.angles.after_two', 'You have had two tries. Keep going with the hints, or show the answer. A shown answer earns no points.')
            : t('stem.angles.after_two_keep', 'You have had two tries. Keep going: read the hints and check each step.')),
          allowReveal && onReveal && h('button', { type: 'button', onClick: onReveal, 'data-angles-reveal': key, style: { minHeight: 44 },
            className: 'px-3 py-2 rounded-lg text-xs font-bold border-2 border-slate-700 bg-white text-slate-900 hover:bg-slate-100' }, t('stem.angles.show_answer_btn', '👁 Show the answer')),
          ai && canAskAi && !aiText && h('button', { type: 'button', 'data-angles-ai': key, style: { minHeight: 44 },
            onClick: function() {
              try {
                ctx.getHint('protractor', String(ai.q), String(ai.wrong == null ? '' : ai.wrong), String(ai.right), tries, function(text) {
                  var s = String(text || '').slice(0, 600);
                  if (!s) return;
                  ai.save(s); announce(s);
                });
              } catch (e) { /* the offline path keeps working */ }
            },
            className: 'px-3 py-2 rounded-lg text-xs font-bold border border-pink-700 bg-pink-50 text-pink-900 hover:bg-pink-100' }, t('stem.angles.ai_hint_btn', '✨ Ask the AI for a nudge')),
          aiText && h('p', { className: 'w-full text-xs text-pink-950 bg-pink-50 border border-pink-300 rounded-lg p-2', 'data-angles-ai-text': key }, aiText));
      };

      var checkReading = function() {
        if (angleSubmissionPending || curLocked || isDrawMode) return;
        var diag = ANG.diagnoseReading(mTask, mAnswer, mPlace);
        if (diag.code === 'nan') { upd({ mTask: mTask, mResult: { code: 'nan' } }); announce(MIS_TEXT.nan); return; }
        angleSubmissionPending = true;
        var tries = mTries + 1, id = 'read:' + mTask.base + ':' + mTask.open + ':' + mTask.m;
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (diag.code === 'ok' ? 1 : 0), total: prev.total + 1 }; });
        else if (diag.code === 'ok') setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
        if (diag.code === 'ok') {
          upd({ mTask: mTask, mPlace: mPlace, mTries: tries, mResult: { code: 'ok', ok: true }, mSolved: mSolved + 1 });
          creditOnce(id, tries === 1 ? 5 : 3, 'protractor reading');
          recordCorrect(null);
          announce(fill(t('stem.angles.read_ok', 'Yes: the angle measures {m}°.'), { m: mTask.m }));
          return;
        }
        recordWrong();
        tallyMiss('read', diag.code, mTask.m + '°');
        upd({ mTask: mTask, mPlace: mPlace, mTries: tries, mResult: { code: diag.code } });
        announce((MIS_TEXT[diag.code] || MIS_TEXT.off) + ' ' + tryMoreText(tries));
      };
      // Reveals are on demand, after two tries, and earn nothing.
      var revealReading = function() {
        if (curLocked || isDrawMode || mTries < 2 || !allowReveal) return;
        upd({ mTask: mTask, mResult: { code: (mResult && mResult.code) || 'off', revealed: true }, mPlace: correctPlace(mTask) });
        announce(fill(t('stem.angles.read_reveal_sr', 'The angle measures {m} degrees. The protractor is now placed correctly.'), { m: mTask.m }));
      };
      var revealDrawing = function() {
        if (curLocked || !isDrawMode || dTries < 2 || !allowReveal) return;
        var res = Object.assign({ code: 'off' }, dResult || {}, { revealed: true });
        upd({ dTask: dTask, dPlace: correctPlace(dTask), dDir: dDir, dResult: res });
        announce(drawFeedback(res));
      };
      var revealCompare = function() {
        if ((cResult && (cResult.ok || cResult.revealed)) || cTries < 2 || !allowReveal) return;
        upd({ cTask: cTask, cResult: Object.assign({ code: 'compare_off' }, cResult || {}, { revealed: true }) });
        announce(fill(t('stem.angles.cmp_reveal', 'Angle A opens {a}° and angle B opens {b}°.'), { a: cTask.a.m, b: cTask.b.m }));
      };
      var checkDrawing = function() {
        if (angleSubmissionPending || curLocked || !isDrawMode) return;
        angleSubmissionPending = true;
        var diag = ANG.diagnoseDrawing(dTask, dDir);
        var tries = dTries + 1, id = 'draw:' + dTask.base + ':' + dTask.m;
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (diag.code === 'ok' ? 1 : 0), total: prev.total + 1 }; });
        else if (diag.code === 'ok') setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
        if (diag.code === 'ok') {
          upd({ dTask: dTask, dPlace: dPlace, dDir: dDir, dTries: tries, dResult: { code: 'ok', ok: true, drawn: diag.drawn }, mSolved: mSolved + 1 });
          creditOnce(id, tries === 1 ? 5 : 3, 'protractor drawing');
          recordCorrect(null);
          announce(fill(t('stem.angles.draw_ok', 'Yes: your ray makes {m}° with the base ray.'), { m: diag.drawn }));
          return;
        }
        recordWrong();
        tallyMiss('draw', diag.code, dTask.m + '°');
        upd({ dTask: dTask, dPlace: dPlace, dDir: dDir, dTries: tries, dResult: { code: diag.code, drawn: diag.drawn } });
        announce(drawFeedback({ code: diag.code, drawn: diag.drawn }, tries));
      };
      var drawFeedback = function(res, tries) {
        if (!res) return '';
        if (res.ok) return fill(t('stem.angles.draw_ok', 'Yes: your ray makes {m}° with the base ray.'), { m: res.drawn });
        var head = fill(t('stem.angles.draw_made', 'Your ray makes {d}° with the base ray; the target is {m}°.'), { d: res.drawn, m: dTask.m });
        var why = res.code === 'wrong_scale' ? t('stem.angles.draw_wrong_scale', 'That is 180° minus the target: you counted on the other scale. Start from the 0 on the base ray.')
          : res.code === 'close' ? t('stem.angles.draw_close', 'Close. Turn your ray one tick at a time.')
          : t('stem.angles.draw_off', 'Put the centre on the vertex, line up 0 with the base ray, then count up to the target on that scale.');
        var tail = res.revealed ? t('stem.angles.draw_reveal', 'The dashed ray shows the target, with the protractor placed correctly.') : tryMoreText(tries == null ? dTries : tries);
        return head + ' ' + why + ' ' + tail;
      };
      var answerCompare = function(choice) {
        if (angleSubmissionPending || (cResult && (cResult.ok || cResult.revealed))) return;
        angleSubmissionPending = true;
        var diag = ANG.diagnoseCompare(cTask, choice);
        var tries = cTries + 1, id = 'cmp:' + cTask.a.m + ':' + cTask.b.m + ':' + cTask.a.len;
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (diag.code === 'ok' ? 1 : 0), total: prev.total + 1 }; });
        if (diag.code === 'ok') {
          upd({ cTask: cTask, cTries: tries, cResult: { code: 'ok', ok: true, choice: choice } });
          if (tries === 1) creditOnce(id, 2, 'compare angles');
          recordCorrect(null);
          announce(fill(t('stem.angles.cmp_ok', 'Yes. Angle A opens {a}° and angle B opens {b}°.'), { a: cTask.a.m, b: cTask.b.m }));
          return;
        }
        recordWrong();
        var code = diag.code === 'ray_length' ? 'ray_length' : 'compare_off';
        tallyMiss('compare', code, cTask.a.m + '/' + cTask.b.m);
        upd({ cTask: cTask, cTries: tries, cResult: { code: code, choice: choice } });
        announce(MIS_TEXT[code] + ' ' + tryMoreText(tries));
      };

      // Read / Draw / Compare is one radio group: one tab stop, arrow keys switch.
      var M_MODES = ['read', 'draw', 'compare'];
      var onModeKey = function(e) {
        var i = M_MODES.indexOf(mMode), n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % 3;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i + 2) % 3;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = 2;
        else return;
        e.preventDefault();
        upd('mMode', M_MODES[n]); stopSweep();
        var grp = e.currentTarget && e.currentTarget.parentNode;
        var nb = grp && grp.querySelector('[data-angles-mode="' + M_MODES[n] + '"]');
        if (nb) nb.focus();
      };
      var modeBtn = function(id, label) {
        var on = mMode === id;
        return h('button', { key: id, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', tabIndex: on ? 0 : -1, 'data-angles-mode': id, onKeyDown: onModeKey, onClick: function() { upd('mMode', id); stopSweep(); },
          style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-sm font-bold border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (on ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-violet-800 border-violet-600 hover:bg-violet-50') }, label);
      };
      var smallBtn = function(key, label, aria, onClick, disabled) {
        return h('button', { key: key, type: 'button', 'aria-label': aria, onClick: onClick, disabled: !!disabled,
          style: { minHeight: 44, minWidth: 44 }, className: 'px-2 py-1 rounded-lg text-sm font-bold border border-sky-700 bg-sky-50 text-sky-900 hover:bg-sky-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-500' }, label);
      };

      var renderProtractorTab = function() {
        var tk = curTask, other = ANG.otherDir(tk);
        // The full steps are open for a student's first task, then fold away.
        var stepsOpen = mSolved < 1 || d.mShowSteps === true;
        var snapNow = snapState(curPlace, tk);
        var snapItem = function(key, done, label) {
          return h('li', { key: key, 'data-done': done ? 'true' : 'false', className: 'flex items-center gap-1 rounded-full border px-2 py-1 ' + (done ? 'bg-green-50 border-green-700 text-green-900' : 'bg-white border-slate-400 text-slate-800') },
            h('span', { 'aria-hidden': 'true' }, done === null ? '→' : done ? '✓' : '○'), label,
            done !== null && h('span', { style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, done ? t('stem.angles.snap_done_sr', '(done)') : t('stem.angles.snap_todo_sr', '(not yet)')));
        };
        var promptText = mMode === 'compare' ? t('stem.angles.cmp_prompt', 'Which angle is larger: A or B? Or are they the same size?')
          : isDrawMode ? fill(t('stem.angles.draw_prompt', 'Draw an angle of {m}°. The base ray starts at the vertex V. Turn the green ray, using the protractor to measure.'), { m: dTask.m })
          : t('stem.angles.read_prompt', 'How many degrees is the angle at V? Move the protractor’s centre onto the vertex, turn its baseline onto the base ray, and read the scale that starts at 0.');
        var resBox = null;
        if (mMode === 'read' && mResult) {
          var okR = !!mResult.ok;
          var txt = okR ? fill(t('stem.angles.read_ok', 'Yes: the angle measures {m}°.'), { m: mTask.m })
            : mResult.revealed ? (MIS_TEXT[mResult.code] || MIS_TEXT.off) + ' ' + fill(t('stem.angles.read_reveal', 'The angle measures {m}°. The protractor now sits on the vertex with 0 on the base ray; read the {scale} scale.'), { m: mTask.m, scale: mTask.open === 1 ? t('stem.angles.scale_inner', 'inner (blue)') : t('stem.angles.scale_outer', 'outer (red)') })
            : (MIS_TEXT[mResult.code] || MIS_TEXT.off) + (mResult.code === 'nan' ? '' : ' ' + tryMoreText(mTries));
          resBox = h('p', { role: 'status', 'data-angles-read-result': mResult.code, className: 'mt-2 p-2 rounded-lg text-sm font-bold border ' + (okR ? 'bg-green-50 text-green-800 border-green-600' : 'bg-amber-50 text-amber-900 border-amber-600') }, txt);
        }
        if (isDrawMode && dResult) {
          resBox = h('p', { role: 'status', 'data-angles-draw-result': dResult.code, className: 'mt-2 p-2 rounded-lg text-sm font-bold border ' + (dResult.ok ? 'bg-green-50 text-green-800 border-green-600' : 'bg-amber-50 text-amber-900 border-amber-600') }, drawFeedback(dResult));
        }
        var desc = mMode === 'compare' ? null : [
          placeSentence(curPlace),
          crossSentence('base', tk.base, curPlace),
          isDrawMode ? crossSentence('draw', dDir, curPlace) : crossSentence('other', other, curPlace)
        ].join(' ');
        return h('div', { className: 'space-y-3' },
          h('div', { className: 'flex flex-wrap gap-2', role: 'radiogroup', 'aria-label': t('stem.angles.a11y_protractor_modes', 'Protractor activities') },
            modeBtn('read', t('stem.angles.mode_read', '🔍 Read an angle')),
            modeBtn('draw', t('stem.angles.mode_draw', '✏️ Draw an angle')),
            modeBtn('compare', t('stem.angles.mode_compare', '⚖️ Compare angles'))
          ),
          h('p', { className: 'text-sm font-bold text-slate-800' }, promptText),
          h('div', { className: 'rounded-xl border-2 border-sky-200 bg-white p-2' }, mMode === 'compare' ? renderCompareSvg() : renderMeasureSvg(),
            // Live placement checklist: it ticks as the protractor lands, never names a scale.
            mMode !== 'compare' && h('ul', { className: 'mt-2 flex flex-wrap gap-1.5 text-xs font-bold', 'aria-label': t('stem.angles.a11y_snap_list', 'Protractor placement'), 'data-angles-snap': (snapNow.onV ? 'v' : '') + (snapNow.aligned ? 'b' : '') },
              snapItem('v', snapNow.onV, t('stem.angles.snap_centre', 'Centre on the vertex V')),
              snapItem('b', snapNow.aligned, t('stem.angles.snap_base', 'Baseline along the base ray')),
              snapItem('r', null, missesScale(curPlace) ? flipText() : t('stem.angles.snap_then', 'Then count from the 0 that sits on the base ray')))),
          mMode !== 'compare' && h('div', { className: 'flex flex-wrap gap-1.5 items-center', role: 'group', 'aria-label': t('stem.angles.a11y_move_turn', 'Move and turn the protractor') },
            h('span', { className: 'text-xs font-bold text-slate-700 mr-1' }, t('stem.angles.move_label', 'Move:')),
            smallBtn('ml', '←', t('stem.angles.a11y_move_left', 'Move protractor left'), function() { nudge(-10, 0, 0); }, curLocked),
            smallBtn('mu', '↑', t('stem.angles.a11y_move_up', 'Move protractor up'), function() { nudge(0, -10, 0); }, curLocked),
            smallBtn('md', '↓', t('stem.angles.a11y_move_down', 'Move protractor down'), function() { nudge(0, 10, 0); }, curLocked),
            smallBtn('mr', '→', t('stem.angles.a11y_move_right', 'Move protractor right'), function() { nudge(10, 0, 0); }, curLocked),
            h('span', { className: 'text-xs font-bold text-slate-700 ml-2 mr-1' }, t('stem.angles.turn_label', 'Turn:')),
            smallBtn('r15', '↺15°', t('stem.angles.a11y_turn_ccw15', 'Turn protractor 15 degrees counterclockwise'), function() { nudge(0, 0, 15); }, curLocked),
            smallBtn('r1', '↺1°', t('stem.angles.a11y_turn_ccw1', 'Turn protractor 1 degree counterclockwise'), function() { nudge(0, 0, 1); }, curLocked),
            smallBtn('rm1', '↻1°', t('stem.angles.a11y_turn_cw1', 'Turn protractor 1 degree clockwise'), function() { nudge(0, 0, -1); }, curLocked),
            smallBtn('rm15', '↻15°', t('stem.angles.a11y_turn_cw15', 'Turn protractor 15 degrees clockwise'), function() { nudge(0, 0, -15); }, curLocked),
            isDrawMode && smallBtn('dccw', t('stem.angles.ray_ccw', 'Ray ↺1°'), t('stem.angles.a11y_ray_ccw', 'Turn your ray 1 degree counterclockwise'), function() { onDrawKey({ key: 'ArrowLeft', shiftKey: false, preventDefault: function() {} }); }, curLocked),
            isDrawMode && smallBtn('dcw', t('stem.angles.ray_cw', 'Ray ↻1°'), t('stem.angles.a11y_ray_cw', 'Turn your ray 1 degree clockwise'), function() { onDrawKey({ key: 'ArrowRight', shiftKey: false, preventDefault: function() {} }); }, curLocked)
          ),
          mMode !== 'compare' && h('details', { open: stepsOpen, 'data-angles-steps': stepsOpen ? 'open' : 'closed', className: 'rounded-lg border border-sky-300 bg-sky-50 p-2 text-sm text-sky-950' },
            h('summary', { className: 'font-bold cursor-pointer', style: { minHeight: 24 } }, t('stem.angles.steps_title', 'How to use a protractor')),
            h('ol', { className: 'list-decimal ml-5 mt-1 space-y-0.5' },
              h('li', null, t('stem.angles.step_1', 'Put the centre mark (the small cross) exactly on the vertex V.')),
              h('li', null, t('stem.angles.step_2', 'Turn the protractor so its straight baseline lies along the base ray.')),
              h('li', null, t('stem.angles.step_3', 'Find the scale that reads 0 where the base ray is: blue counts up from the right end, red from the left end.')),
              h('li', null, t('stem.angles.step_4', 'Follow that same scale to where the other ray crosses it. Count single-degree ticks after the last labelled ten.'))
            )
          ),
          desc && h('div', { className: 'rounded-lg border border-slate-300 bg-slate-50 p-2' },
            h('p', { className: 'text-xs font-bold uppercase tracking-wide text-slate-700' }, t('stem.angles.what_protractor_shows', 'What the protractor shows')),
            h('p', { id: 'stem-angles-prot-desc', 'data-angles-prot-desc': 'true', className: 'text-sm text-slate-800' }, desc),
            !isDrawMode && h('button', { type: 'button', onClick: function() { playSweep(tk.m); }, 'aria-describedby': 'stem-angles-sweep-help', style: { minHeight: 44 },
              className: 'mt-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-700 text-white hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400' }, t('stem.angles.hear_angle', '🔊 Hear the opening')),
            !isDrawMode && h('p', { id: 'stem-angles-sweep-help', className: 'text-xs text-slate-700 mt-1' }, sweepHelp)
          ),
          mMode === 'read' && h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('label', { className: 'text-sm font-bold text-slate-800', htmlFor: 'stem-angles-read-input' }, t('stem.angles.read_label', 'Your reading (degrees):')),
            h('input', { id: 'stem-angles-read-input', type: 'text', inputMode: 'decimal', value: mAnswer, disabled: curLocked, autoComplete: 'off',
              onChange: function(e) { upd({ mTask: mTask, mAnswer: e.target.value, mResult: mResult && mResult.code === 'nan' ? null : mResult }); },
              onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); checkReading(); } },
              className: 'w-28 px-3 py-2 border-2 border-violet-600 rounded-lg text-sm font-bold text-slate-900', style: { minHeight: 44 } }),
            h('button', { type: 'button', 'aria-label': t('stem.angles.check_reading', 'Check my reading'), onClick: checkReading, disabled: curLocked, style: { minHeight: 44 },
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50' }, t('stem.angles.check_btn', '✔ Check'))
          ),
          isDrawMode && h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('button', { type: 'button', 'aria-label': t('stem.angles.check_drawing', 'Check my drawing'), onClick: checkDrawing, disabled: curLocked, style: { minHeight: 44 },
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50' }, t('stem.angles.check_btn', '✔ Check'))
          ),
          mMode === 'compare' && h('div', { className: 'space-y-2' },
            h('p', { className: 'text-sm text-slate-800' }, fill(t('stem.angles.cmp_desc', 'Angle A: rays point {a1} and {a2}; its rays are {la}. Angle B: rays point {b1} and {b2}; its rays are {lb}.'), {
              a1: clockText(cTask.a.base), a2: clockText(cTask.a.base + cTask.a.m), la: cTask.a.len > cTask.b.len ? t('stem.angles.rays_long', 'long') : (cTask.a.len < cTask.b.len ? t('stem.angles.rays_short', 'short') : t('stem.angles.rays_equal', 'the same length')),
              b1: clockText(cTask.b.base), b2: clockText(cTask.b.base + cTask.b.m), lb: cTask.b.len > cTask.a.len ? t('stem.angles.rays_long', 'long') : (cTask.b.len < cTask.a.len ? t('stem.angles.rays_short', 'short') : t('stem.angles.rays_equal', 'the same length'))
            })),
            h('div', { className: 'flex flex-wrap gap-2' },
              smallBtn('hA', t('stem.angles.hear_a', '🔊 Hear A'), t('stem.angles.a11y_hear_a', 'Hear the opening of angle A'), function() { playSweep(cTask.a.m); }),
              smallBtn('hB', t('stem.angles.hear_b', '🔊 Hear B'), t('stem.angles.a11y_hear_b', 'Hear the opening of angle B'), function() { playSweep(cTask.b.m); })
            ),
            h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_compare_choices', 'Your answer') },
              [['A', t('stem.angles.cmp_a', 'A is larger')], ['B', t('stem.angles.cmp_b', 'B is larger')], ['same', t('stem.angles.cmp_same', 'Same size')]].map(function(o) {
                var locked = !!(cResult && (cResult.ok || cResult.revealed));
                var isAns = locked && o[0] === cTask.answer;
                return h('button', { key: o[0], type: 'button', onClick: function() { answerCompare(o[0]); }, disabled: locked, style: { minHeight: 44 },
                  className: 'px-4 py-2 rounded-lg text-sm font-bold border-2 ' + (isAns ? 'bg-green-100 border-green-700 text-green-900' : 'bg-white border-violet-600 text-violet-800 hover:bg-violet-50') }, o[1]);
              })
            ),
            cResult && h('p', { role: 'status', className: 'p-2 rounded-lg text-sm font-bold border ' + (cResult.ok ? 'bg-green-50 text-green-800 border-green-600' : 'bg-amber-50 text-amber-900 border-amber-600') },
              cResult.ok ? fill(t('stem.angles.cmp_ok', 'Yes. Angle A opens {a}° and angle B opens {b}°.'), { a: cTask.a.m, b: cTask.b.m })
                : (MIS_TEXT[cResult.code] || MIS_TEXT.compare_off) + ' ' + (cResult.revealed ? fill(t('stem.angles.cmp_reveal', 'Angle A opens {a}° and angle B opens {b}°.'), { a: cTask.a.m, b: cTask.b.m }) : tryMoreText(cTries))),
            afterTwo('compare', cTries, !!(cResult && (cResult.ok || cResult.revealed)), revealCompare)
          ),
          resBox,
          mMode === 'read' && mResult && mResult.code !== 'nan' && afterTwo('read', mTries, curLocked, revealReading),
          isDrawMode && afterTwo('draw', dTries, curLocked, revealDrawing),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function() { newMeasureTask(); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' },
              mMode === 'compare' ? t('stem.angles.next_compare', '➡ New pair') : isDrawMode ? t('stem.angles.next_draw', '➡ New angle to draw') : t('stem.angles.next_read', '➡ New angle to read')),
            mMode !== 'compare' && !stepsOpen && h('button', { type: 'button', onClick: function(e) { var pnl = e.currentTarget.closest('[role="tabpanel"]'), sm = pnl && pnl.querySelector('[data-angles-steps] > summary'); if (sm) sm.focus(); upd('mShowSteps', true); }, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold border border-sky-700 text-sky-900 bg-white hover:bg-sky-50' }, t('stem.angles.show_steps', 'Show the steps again'))
          )
        );
      };


      // ══════════════════════════════════════════════════════════════
      // ── Missing-angle puzzles (relationships, transversals, radians) ──
      // ══════════════════════════════════════════════════════════════
      var levelKinds = ANG.PUZZLE_KINDS[level] || ANG.PUZZLE_KINDS.g57;
      var KIND_LABEL = {
        mix: t('stem.angles.kind_mix', 'Mixed'), comp: t('stem.angles.kind_comp', 'Complementary'), supp: t('stem.angles.kind_supp', 'Straight line'),
        vert: t('stem.angles.kind_vert', 'Crossing lines'), point: t('stem.angles.kind_point', 'Around a point'), tri: t('stem.angles.kind_tri', 'Triangle'),
        trans: t('stem.angles.kind_trans', 'Parallel lines'), rad: t('stem.angles.kind_rad', 'Radians')
      };
      var pzKind = (d.pzKind === 'mix' || levelKinds.indexOf(d.pzKind) !== -1) ? d.pzKind : 'mix';
      var validPuzzle = function(p) {
        if (!plain(p) || typeof p.kind !== 'string' || typeof p.id !== 'string') return false;
        if (p.kind === 'rad') return isFinite(p.deg) && (p.dir === 'toRad' || p.dir === 'toDeg');
        if (p.kind === 'point') return Array.isArray(p.parts) && p.parts.every(function(x) { return isFinite(x); }) && isFinite(p.answer);
        if (p.kind === 'tri') return Array.isArray(p.angles) && p.angles.length === 3 && isFinite(p.which);
        if (p.kind === 'trans') return isFinite(p.alpha) && plain(p.given) && plain(p.ask) && typeof p.rel === 'string';
        return isFinite(p.a) && isFinite(p.answer);
      };
      var pzUsable = validPuzzle(d.pz) && (levelKinds.indexOf(d.pz.kind) !== -1);
      var pz = pzUsable ? d.pz : ANG.makePuzzle(pzKind === 'mix' ? levelKinds[0] : pzKind, seeded(23), level);
      // Tries, answer and result belong to the saved puzzle. When the level swaps the
      // puzzle they must not carry over ("Correct: x = 75°" on a puzzle never tried).
      var pzAnswer = pzUsable && typeof d.pzAnswer === 'string' ? d.pzAnswer : '';
      var pzTries = pzUsable ? num(d.pzTries, 0) : 0;
      var pzResult = pzUsable && plain(d.pzResult) ? d.pzResult : null;
      var pzHint = pzUsable ? Math.max(0, Math.min(2, num(d.pzHint, 0))) : 0;
      var pzOrphaned = !pzUsable && !!(d.pzAnswer || d.pzTries || d.pzResult || d.pzHint || d.pzReason || d.pzEst);
      React.useEffect(function() {
        if (pzOrphaned) upd({ pz: pz, pzAnswer: '', pzTries: 0, pzResult: null, pzHint: 0, pzReason: null, pzAiHint: null, pzEst: null });
      }, [pzOrphaned]);
      var pzSolved = plain(d.pzSolved) ? d.pzSolved : {};
      var pzReason = pzUsable && plain(d.pzReason) ? d.pzReason : null;
      var pzLocked = !!(pzResult && (pzResult.ok || pzResult.revealed));
      var REL_TEXT = {
        comp: t('stem.angles.reason_comp', 'Complementary angles add to 90°.'),
        linear: t('stem.angles.reason_linear', 'Angles on a straight line add to 180°.'),
        vertical: t('stem.angles.reason_vertical', 'Vertical angles (across a crossing) are equal.'),
        point: t('stem.angles.reason_point', 'Angles around a point add to 360°.'),
        tri: t('stem.angles.reason_tri', 'The angles of a triangle add to 180°.'),
        corresponding: t('stem.angles.reason_corresponding', 'Corresponding angles at parallel lines are equal.'),
        alt_interior: t('stem.angles.reason_alt_interior', 'Alternate interior angles at parallel lines are equal.'),
        alt_exterior: t('stem.angles.reason_alt_exterior', 'Alternate exterior angles at parallel lines are equal.'),
        co_interior: t('stem.angles.reason_co_interior', 'Co-interior (same-side interior) angles at parallel lines add to 180°.'),
        co_exterior: t('stem.angles.reason_co_exterior', 'Same-side exterior angles at parallel lines add to 180°.')
      };
      var REL_NAME = {
        vertical: t('stem.angles.rel_vertical', 'vertical'), linear: t('stem.angles.rel_linear', 'linear pair'), corresponding: t('stem.angles.rel_corresponding', 'corresponding'),
        alt_interior: t('stem.angles.rel_alt_interior', 'alternate interior'), alt_exterior: t('stem.angles.rel_alt_exterior', 'alternate exterior'),
        co_interior: t('stem.angles.rel_co_interior', 'co-interior'), co_exterior: t('stem.angles.rel_co_exterior', 'same-side exterior')
      };
      var PZ_MIS = {
        used_180: t('stem.angles.pzm_used_180', 'You subtracted from 180°. The square corner mark means the two parts make a right angle: 90°.'),
        used_90: t('stem.angles.pzm_used_90', 'You subtracted from 90°. These two angles sit on a straight line, which is a half turn: 180°.'),
        copied_given: t('stem.angles.pzm_copied_given', 'That is the size of the angle you were given. x is the other part.'),
        vert_is_supp: t('stem.angles.pzm_vert_is_supp', 'x is across the crossing from the given angle, not beside it. Vertical angles are equal; only side-by-side angles add to 180°.'),
        linear_is_equal: t('stem.angles.pzm_linear_is_equal', 'x is beside the given angle on a straight line, not across from it. Side-by-side angles on a line add to 180°.'),
        point_used_180: t('stem.angles.pzm_point_used_180', 'Angles all the way around a point make a full turn: 360°, not 180°.'),
        gave_sum: t('stem.angles.pzm_gave_sum', 'That is the total of the angles you know. Subtract it from the whole to find x.'),
        tri_used_360: t('stem.angles.pzm_tri_used_360', 'A triangle’s three angles add to 180°, not 360°. Try tearing the corners off a paper triangle: they make a straight line.'),
        trans_equal_as_supp: t('stem.angles.pzm_trans_equal_as_supp', 'These two angles are in matching positions, so they are equal. Only pairs on the same side, between or outside the parallels, add to 180°.'),
        trans_supp_as_equal: t('stem.angles.pzm_trans_supp_as_equal', 'These two angles are not in matching positions: one is acute and the other obtuse. They add to 180°.'),
        rad_used_360: t('stem.angles.pzm_rad_used_360', 'A half turn, 180°, is π radians. You used 2π for 180°, which halves the answer.'),
        rad_typed_degrees: t('stem.angles.pzm_rad_typed_degrees', 'That is still in degrees. Convert: multiply by π and divide by 180.'),
        rad_pi_is_360: t('stem.angles.pzm_rad_pi_is_360', 'π radians is a half turn, 180°, not 360°.'),
        rad_typed_radians: t('stem.angles.pzm_rad_typed_radians', 'That is the size in radians. Give the answer in degrees.'),
        arith: t('stem.angles.pzm_arith', 'Your method looks right but the arithmetic is off. Check your subtraction.'),
        off: t('stem.angles.pzm_off', 'Not quite. Name the relationship first, then write an equation for x.'),
        nan: t('stem.angles.pzm_nan', 'Type a number, for example 35.'),
        nan_rad: t('stem.angles.pzm_nan_rad', 'Type a radian measure such as 3π/4 (you can type pi for π) or a decimal.')
      };
      var sumOf = function(arr) { return arr.reduce(function(q, w) { return q + w; }, 0); };
      var pzPrompt = function(p) {
        if (p.kind === 'comp') return fill(t('stem.angles.pz_comp', 'The two angles together make a right angle. One is {a}°. Find x.'), { a: p.a });
        if (p.kind === 'supp') return fill(t('stem.angles.pz_supp', 'The two angles sit on a straight line. One is {a}°. Find x.'), { a: p.a });
        if (p.kind === 'vert') return fill(t('stem.angles.pz_vert', 'Two straight lines cross. One angle is {a}°. Find the angle marked x.'), { a: p.a });
        if (p.kind === 'point') return fill(t('stem.angles.pz_point', '{n} angles meet around a point. The known ones are {list}. Find x.'), { n: p.parts.length + 1, list: p.parts.map(function(v) { return v + '°'; }).join(', ') });
        if (p.kind === 'tri') { var kn = p.angles.filter(function(_, i) { return i !== p.which; }); return fill(t('stem.angles.pz_tri', 'A triangle has angles of {k1}° and {k2}°. Find the third angle, x.'), { k1: kn[0], k2: kn[1] }); }
        if (p.kind === 'trans') return fill(t('stem.angles.pz_trans', 'Two parallel lines are cut by a transversal. One angle is {a}°. Find the angle marked x.'), { a: p.a });
        if (p.dir === 'toRad') return fill(t('stem.angles.pz_rad_to', 'Write {deg}° in radians, as a multiple of π (for example 3π/4).'), { deg: p.deg });
        return fill(t('stem.angles.pz_rad_from', 'Write {pi} radians in degrees.'), { pi: ANG.piForm(p.deg) });
      };
      var CORNER = [t('stem.angles.corner_ur', 'upper right'), t('stem.angles.corner_ul', 'upper left'), t('stem.angles.corner_ll', 'lower left'), t('stem.angles.corner_lr', 'lower right')];
      var cornerAt = function(dir) { return CORNER[Math.floor(ANG.normDeg(dir) / 90) % 4]; };
      var pzDescribe = function(p) {
        if (p.kind === 'comp') return fill(t('stem.angles.pzd_comp', 'Diagram: a right angle, marked with a small square, is split by a ray into an angle of {a}° and an angle x.'), { a: p.a });
        if (p.kind === 'supp') return fill(t('stem.angles.pzd_supp', 'Diagram: a straight line with a ray from a point on it, making an angle of {a}° on one side and x on the other.'), { a: p.a });
        // Name each corner from where it sits in the rotated diagram (its middle direction), not its index.
        if (p.kind === 'vert') return fill(t('stem.angles.pzd_vert', 'Diagram: two lines cross, making four angles. The {g} angle is {a}°. x is the {x} angle, {where}.'), { g: cornerAt((p.rot || 0) + p.a / 2), a: p.a, x: cornerAt((p.rot || 0) + [p.a / 2, p.a + (180 - p.a) / 2, 180 + p.a / 2, 180 + p.a + (180 - p.a) / 2][p.askPos]), where: p.ask === 'vertical' ? t('stem.angles.pzd_across', 'across the crossing from it') : t('stem.angles.pzd_beside', 'beside it on one of the lines') });
        if (p.kind === 'point') return fill(t('stem.angles.pzd_point', 'Diagram: {n} rays from one point make {n} angles that go all the way round: {list} and x.'), { n: p.parts.length + 1, list: p.parts.map(function(v) { return v + '°'; }).join(', ') });
        if (p.kind === 'tri') return t('stem.angles.pzd_tri', 'Diagram: a triangle with two angles labelled and the third marked x.');
        if (p.kind === 'trans') return fill(t('stem.angles.pzd_trans', 'Diagram: two horizontal parallel lines, top and bottom, crossed by a slanted transversal. At the {gi} crossing, the {gp} angle is {a}°. x is the {xp} angle at the {xi} crossing.'), {
          gi: p.given.i === 0 ? t('stem.angles.top', 'top') : t('stem.angles.bottom', 'bottom'), gp: CORNER[p.given.p], a: p.a,
          xi: p.ask.i === 0 ? t('stem.angles.top', 'top') : t('stem.angles.bottom', 'bottom'), xp: CORNER[p.ask.p] });
        return fill(t('stem.angles.pzd_rad', 'Diagram: an angle of {deg}° drawn from the positive x-axis on a circle.'), { deg: p.dir === 'toRad' ? p.deg : '?' });
      };
      var pzHintText = function(p, lvl) {
        var kn;
        if (lvl === 1) {
          if (p.kind === 'comp') return t('stem.angles.pzh1_comp', 'The square corner mark tells you the two parts add up to 90°.');
          if (p.kind === 'supp') return t('stem.angles.pzh1_supp', 'A straight line is a half turn: the two parts add up to 180°.');
          if (p.kind === 'vert') return t('stem.angles.pzh1_vert', 'Where two lines cross, angles across from each other are equal, and side-by-side angles on a line add to 180°.');
          if (p.kind === 'point') return t('stem.angles.pzh1_point', 'A full turn around a point is 360°.');
          if (p.kind === 'tri') return t('stem.angles.pzh1_tri', 'The three angles of any triangle add up to 180°.');
          if (p.kind === 'trans') return fill(t('stem.angles.pzh1_trans', 'Parallel lines make the same angles at both crossings, so only two sizes appear: {a}° and 180° − {a}°.'), { a: p.a });
          return t('stem.angles.pzh1_rad', 'A half turn is 180°, which is π radians.');
        }
        if (p.kind === 'comp') return fill(t('stem.angles.pzh2_comp', 'Write it as an equation: {a} + x = 90.'), { a: p.a });
        if (p.kind === 'supp') return fill(t('stem.angles.pzh2_supp', 'Write it as an equation: {a} + x = 180.'), { a: p.a });
        if (p.kind === 'vert') return fill(t('stem.angles.pzh2_vert', 'Is x across the crossing from {a}°, or beside it on a straight line?'), { a: p.a });
        if (p.kind === 'point') return fill(t('stem.angles.pzh2_point', 'The known angles total {s}°. Write {s} + x = 360.'), { s: sumOf(p.parts) });
        if (p.kind === 'tri') { kn = p.angles.filter(function(_, i) { return i !== p.which; }); return fill(t('stem.angles.pzh2_tri', 'Write it as an equation: {k1} + {k2} + x = 180.'), { k1: kn[0], k2: kn[1] }); }
        if (p.kind === 'trans') return t('stem.angles.pzh2_trans', 'Compare the shapes: if x looks acute like the given angle, the two are equal; if one is acute and the other obtuse, they add to 180°.');
        return p.dir === 'toRad' ? fill(t('stem.angles.pzh2_rad_to', 'Work out {deg}/180, simplify the fraction, then attach π.'), { deg: p.deg }) : t('stem.angles.pzh2_rad_from', 'Replace π with 180° and multiply.');
      };
      // A worked example is another item of the same kind. One with a different id could
      // still print this item's answer (300° -> radians beside 5π/3 -> degrees, sin 300° beside
      // cos 300°), so skip any example whose numbers include the answer.
      var numMatch = function(s) { return String(s == null ? '' : s).match(/[−-]?√?\d+(?:\.\d+)?π?(?:\/\d+)?|[−-]?π(?:\/\d+)?/g) || []; };
      // "300/180" also shows 300 and 180; "5π/3" and "√3/2" stay whole.
      var numTokens = function(s) {
        var out = [];
        numMatch(s).forEach(function(tk) { out.push(tk); if (tk.indexOf('/') !== -1 && !/[π√]/.test(tk)) tk.replace(/^[−-]/, '').split('/').forEach(function(x) { out.push(x); }); });
        return out;
      };
      var pickWorked = function(make, base, step, p, textOf, answerText) {
        var ans = numMatch(answerText)[0] || '';
        for (var g = 0; g < 40; g++) {
          var ex = make(seeded(base + g * step + p.id.length));
          if (ex.id === p.id) continue;
          var txt = textOf(ex);
          if (!ans || numTokens(txt).indexOf(ans) === -1) return txt;
        }
        return null;
      };
      // A fully worked example of the same kind with different numbers (shown on a
      // student's first puzzle of a kind), then just the set-up, then nothing.
      var pzWorked = function(p) { return pickWorked(function(r) { return ANG.makePuzzle(p.kind, r, level); }, 101, 7, p, pzWorkedText, pzAnswerText(p)); };
      var pzWorkedText = function(ex) {
        if (ex.kind === 'comp') return fill(t('stem.angles.pzw_comp', 'Worked example: one part is {a}°. The parts make 90°, so x = 90° − {a}° = {x}°.'), { a: ex.a, x: ex.answer });
        if (ex.kind === 'supp') return fill(t('stem.angles.pzw_supp', 'Worked example: one angle on the line is {a}°. A straight line is 180°, so x = 180° − {a}° = {x}°.'), { a: ex.a, x: ex.answer });
        if (ex.kind === 'vert') return fill(t('stem.angles.pzw_vert', 'Worked example: two lines cross and one angle is {a}°. The angle across from it is also {a}°; each angle beside it is 180° − {a}° = {b}°.'), { a: ex.a, b: 180 - ex.a });
        if (ex.kind === 'point') return fill(t('stem.angles.pzw_point', 'Worked example: the known angles are {list}, totalling {s}°. A full turn is 360°, so x = 360° − {s}° = {x}°.'), { list: ex.parts.map(function(v) { return v + '°'; }).join(', '), s: sumOf(ex.parts), x: ex.answer });
        if (ex.kind === 'tri') { var kn = ex.angles.filter(function(_, i) { return i !== ex.which; }); return fill(t('stem.angles.pzw_tri', 'Worked example: a triangle has angles {k1}° and {k2}°. They total {s}°, so x = 180° − {s}° = {x}°.'), { k1: kn[0], k2: kn[1], s: kn[0] + kn[1], x: ex.answer }); }
        if (ex.kind === 'trans') return fill(t('stem.angles.pzw_trans', 'Worked example: the given angle is {a}° and x is its {rel} partner. {rule} So x = {x}°.'), { a: ex.a, rel: REL_NAME[ex.rel] || ex.rel, rule: REL_TEXT[ex.rel] || '', x: ex.answer });
        return ex.dir === 'toRad' ? fill(t('stem.angles.pzw_rad_to', 'Worked example: {deg}° = {deg}/180 × π = {pi}.'), { deg: ex.deg, pi: ANG.piForm(ex.deg) })
          : fill(t('stem.angles.pzw_rad_from', 'Worked example: {pi} = {pi} × 180°/π = {deg}°.'), { pi: ANG.piForm(ex.deg), deg: ex.deg });
      };
      var pzSetup = function(p) { return p.kind === 'vert' || p.kind === 'trans' || p.kind === 'rad' ? pzHintText(p, 1) : pzHintText(p, 2); };
      var pzAnswerText = function(p) { return p.kind === 'rad' && p.dir === 'toRad' ? ANG.piForm(p.deg) : p.answer + '°'; };

      var newPuzzle = function(kindArg) {
        var k = kindArg || pzKind;
        var kind = k === 'mix' ? levelKinds[Math.floor(Math.random() * levelKinds.length)] : k;
        var np = null, g = 0;
        do { np = ANG.makePuzzle(kind, Math.random, level); g++; } while (np.id === pz.id && g < 10);
        upd({ pzKind: k, pz: np, pzAnswer: '', pzTries: 0, pzResult: null, pzHint: 0, pzReason: null, pzAiHint: null, pzEst: null });
        announce(pzPrompt(np));
      };
      var checkPuzzle = function() {
        if (angleSubmissionPending || pzLocked) return;
        var diag = ANG.diagnosePuzzle(pz, pzAnswer);
        if (diag.code === 'nan') { upd({ pz: pz, pzResult: { code: 'nan' } }); announce(pz.kind === 'rad' && pz.dir === 'toRad' ? PZ_MIS.nan_rad : PZ_MIS.nan); return; }
        angleSubmissionPending = true;
        var tries = pzTries + 1;
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (diag.code === 'ok' ? 1 : 0), total: prev.total + 1 }; });
        else if (diag.code === 'ok') setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
        if (diag.code === 'ok') {
          var solved = Object.assign({}, pzSolved); solved[pz.kind] = (Number(solved[pz.kind]) || 0) + 1;
          upd({ pz: pz, pzTries: tries, pzResult: { code: 'ok', ok: true }, pzSolved: solved });
          creditOnce('pz:' + pz.id, tries === 1 ? 5 : 3, 'angle puzzle');
          recordCorrect(null);
          announce(fill(t('stem.angles.pz_ok', 'Correct: x = {x}.'), { x: pzAnswerText(pz) }));
          return;
        }
        recordWrong();
        tallyMiss('puzzle:' + pz.kind, diag.code, pz.id);
        upd({ pz: pz, pzTries: tries, pzResult: { code: diag.code, typed: pzAnswer }, pzHint: Math.max(pzHint, 1) });
        var gapNow = estGapFor(pzAnswer);
        announce((PZ_MIS[diag.code] || PZ_MIS.off) + ' ' + tryMoreText(tries) + (gapNow ? ' ' + estGapText(gapNow) : ''));
      };
      var revealPuzzle = function() {
        if (pzLocked || pzTries < 2 || !allowReveal) return;
        upd({ pz: pz, pzResult: Object.assign({ code: 'off' }, pzResult || {}, { revealed: true }) });
        announce(fill(t('stem.angles.pz_reveal', 'The answer is x = {x}.'), { x: pzAnswerText(pz) }));
      };
      // Claim-evidence-reasoning: after a correct answer, choose the rule that justifies it.
      var reasonId = ANG.puzzleReason(pz);
      var reasonOptions = (function() {
        if (!reasonId) return [];
        var pool = Object.keys(REL_TEXT).filter(function(k) { return k !== reasonId; });
        var rng = seeded(pz.id.length * 31 + (pz.answer | 0));
        var picks = [reasonId];
        while (picks.length < 4 && pool.length) { picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]); }
        return picks.sort(function(x, y) { return (REL_TEXT[x] < REL_TEXT[y]) ? -1 : 1; });
      })();
      var reasonStep = !!reasonId && level !== 'g4' && !!(pzResult && pzResult.ok);
      var answerReason = function(rid) {
        if (angleSubmissionPending || (pzReason && (pzReason.ok || pzReason.revealed))) return;
        angleSubmissionPending = true;
        var tries = ((pzReason && pzReason.tries) || 0) + 1;
        var ok = rid === reasonId;
        if (ok) { upd({ pz: pz, pzReason: { ok: true, pick: rid, tries: tries } }); if (tries === 1) creditOnce('why:' + pz.id, 2, 'angle reason'); announce(t('stem.angles.reason_ok', 'Yes, that rule justifies your answer.')); return; }
        tallyMiss('reason', 'reason_wrong', pz.id);
        upd({ pz: pz, pzReason: { ok: false, pick: rid, tries: tries } });
        announce(t('stem.angles.reason_no', 'That rule does not match this diagram. Look at where x sits compared with the given angle.') + ' ' + tryMoreText(tries));
      };
      // The reason step used to show the rule on its second miss even with reveals switched off.
      var revealReason = function() {
        if (!pzReason || pzReason.ok || pzReason.revealed || (pzReason.tries || 0) < 2 || !allowReveal) return;
        upd({ pz: pz, pzReason: Object.assign({}, pzReason, { revealed: true }) });
        announce(fill(t('stem.angles.reason_reveal', 'The rule that fits is: {r}'), { r: REL_TEXT[reasonId] }));
      };
      // The host's getHint refuses before two attempts, so the nudge waits for two tries.
      var pzAiFor = plain(d.pzAiHint) && d.pzAiHint.id === pz.id ? String(d.pzAiHint.text || '') : '';

      // ── Estimate x by dragging, before typing. The drawing is to scale, so the
      //    dial shows no number until the puzzle is checked; it locks when the
      //    student locks it or starts typing, and it never earns points. ──
      var pzEstOn = pz.kind !== 'rad' && isFinite(pz.answer);
      var pzEst = plain(d.pzEst) && d.pzEst.id === pz.id ? d.pzEst : null;
      var estHas = !!(pzEst && typeof pzEst.deg === 'number' && isFinite(pzEst.deg) && pzEst.deg > 0);
      var estDeg = estHas ? Math.max(1, Math.min(359, Math.round(pzEst.deg))) : 0;
      var estClosed = !!(pzEst && pzEst.locked) || pzTries > 0 || pzLocked;
      var setEst = function(deg) {
        if (estClosed) return;
        var v = Math.round(ANG.normDeg(deg));
        upd({ pz: pz, pzEst: { id: pz.id, deg: Math.max(0, Math.min(359, v)), locked: false } });
      };
      var lockEst = function() {
        if (estClosed || !estHas) return;
        // The Lock button goes away with this; the next job is typing x.
        var pzIn = document.getElementById('stem-angles-pz-input');
        if (pzIn) pzIn.focus();
        upd({ pz: pz, pzEst: { id: pz.id, deg: estDeg, locked: true } });
        announce(t('stem.angles.est_locked_sr', 'Estimate locked. Now work out x and type it.'));
      };
      // Typing an answer locks the estimate (or closes it unused): it stays a prediction.
      var estPatchOnType = function() {
        if (!pzEstOn || estClosed) return {};
        return { pzEst: estHas ? { id: pz.id, deg: estDeg, locked: true } : { id: pz.id, deg: null, locked: true, skipped: true } };
      };
      // Compares the student's answer with the student's own estimate, never with x.
      var estGapFor = function(txt) {
        if (!pzEstOn || !estHas) return null;
        var typed = parseFloat(String(txt).replace(',', '.'));
        if (!isFinite(typed) || Math.abs(typed - estDeg) <= 30) return null;
        return typed > estDeg ? 'above' : 'below';
      };
      var estGapText = function(gap) {
        return gap === 'above' ? t('stem.angles.est_gap_above', 'Your answer is much larger than your estimate. Look at the drawing again: which one fits x?')
          : t('stem.angles.est_gap_below', 'Your answer is much smaller than your estimate. Look at the drawing again: which one fits x?');
      };
      var estBenchText = function(deg) {
        if (!(deg > 0)) return t('stem.angles.est_none', 'No opening yet');
        var bi = ANG.benchIndex(deg);
        return bi === -1 ? fill(t('stem.angles.est_at_bench', 'Exactly {n}°'), { n: deg }) : BENCH_LABEL[bi];
      };
      var EW = 240, EH = 200, EVX = 120, EVY = 100, EL = 80;
      var startEstDrag = function(e) {
        if (estClosed) return;
        beginDrag(e, function(p) { setEst(Math.atan2(-(p.y - EVY), p.x - EVX) * 180 / Math.PI); });
      };
      var renderEstDial = function() {
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: EW, height: EH, fill: P.panel })];
        var baseEnd = ANG.pt(EVX, EVY, EL, 0), armEnd = ANG.pt(EVX, EVY, EL, estDeg);
        kids.push(h('line', { key: 'b', x1: EVX, y1: EVY, x2: baseEnd.x, y2: baseEnd.y, stroke: P.line, strokeWidth: 3, strokeLinecap: 'round' }));
        // After the check, the true size of x (dashed) beside the estimate.
        if (pzLocked) {
          var tEnd = ANG.pt(EVX, EVY, EL, pz.answer);
          kids.push(h('path', { key: 'ta', d: arcPath(EVX, EVY, 34, 0, Math.min(359.5, pz.answer)), fill: 'none', stroke: P.given, strokeWidth: 2, strokeDasharray: '5,3' }));
          kids.push(h('line', { key: 't', 'data-angles-est-true': 'true', x1: EVX, y1: EVY, x2: tEnd.x, y2: tEnd.y, stroke: P.given, strokeWidth: 2.5, strokeDasharray: '6,4' }));
        }
        if (estHas) {
          kids.push(h('path', { key: 'a', d: arcPath(EVX, EVY, 24, 0, estDeg), fill: 'none', stroke: P.unknown, strokeWidth: 2.5 }));
          kids.push(h('line', { key: 'arm', x1: EVX, y1: EVY, x2: armEnd.x, y2: armEnd.y, stroke: P.unknown, strokeWidth: 3, strokeLinecap: 'round' }));
        }
        kids.push(h('circle', { key: 'v', cx: EVX, cy: EVY, r: 3.5, fill: P.vertex }));
        if (!estClosed) {
          kids.push(h('circle', { key: 'hdv', 'aria-hidden': 'true', cx: armEnd.x, cy: armEnd.y, r: 16, fill: P.unknown, fillOpacity: 0.18, stroke: P.unknown, strokeWidth: 2, style: { pointerEvents: 'none' } }));
          kids.push(h('circle', Object.assign({ key: 'hd', 'aria-hidden': 'true', 'data-angles-est-handle': 'true', cx: armEnd.x, cy: armEnd.y, r: 22, fill: 'transparent', style: grabStyle('grab'), onClick: noTap }, dragProps(startEstDrag))));
        }
        return h('svg', { viewBox: '0 0 ' + EW + ' ' + EH, role: 'img', 'data-angles-est-dial': 'true',
          'aria-label': pzLocked && estHas ? fill(t('stem.angles.a11y_est_dial_done', 'Your estimate of x, {e}°, beside the true size of x, {x}°.'), { e: estDeg, x: pz.answer })
            : fill(t('stem.angles.a11y_est_dial', 'Your estimate of x: {b}.'), { b: estBenchText(estDeg) }),
          style: { width: '100%', maxWidth: 240, height: 'auto', display: 'block', touchAction: 'pan-y', borderRadius: 12 } }, kids);
      };
      var renderEstimateStep = function() {
        // Checked with no estimate: nothing to compare (the dial would draw x with no words for it).
        if (!pzEstOn || (pzLocked && !estHas)) return null;
        var skipped = !!(pzEst && pzEst.skipped);
        var status = pzLocked ? (estHas ? fill(t('stem.angles.est_compare', 'Your estimate was about {e}°; x is {x}°.'), { e: estDeg, x: pz.answer }) + ' ' + (Math.abs(estDeg - pz.answer) <= 10 ? t('stem.angles.est_dial_close', 'A sharp eye: within 10°.') : Math.abs(estDeg - pz.answer) <= 25 ? t('stem.angles.est_near', 'In the right range.') : t('stem.angles.est_far', 'Next time, compare x with a right angle first.')) : null)
          : estClosed ? (skipped || !estHas ? t('stem.angles.est_skipped', 'No estimate this time.') : t('stem.angles.est_locked', 'Estimate locked. Work out x below.'))
          : t('stem.angles.est_open', 'No numbers until you check: judge it by eye.');
        return h('div', { className: 'rounded-xl border-2 border-pink-200 bg-white p-2', 'data-angles-est': pzLocked ? 'done' : estClosed ? 'locked' : 'open' },
          !estClosed && h('p', { className: 'text-sm font-bold text-slate-800', id: 'stem-angles-est-h' }, t('stem.angles.est_title', 'First, estimate x: drag the pink arm, or use the slider, until the opening looks the same size as x.')),
          h('div', { className: 'mt-1 flex flex-wrap items-center gap-3' },
            h('div', { style: { flex: '0 1 240px', minWidth: 0 } }, renderEstDial()),
            h('div', { className: 'min-w-0 flex-1 space-y-2', style: { flexBasis: '12rem' } },
              h('input', { type: 'range', min: 0, max: 359, step: 1, value: estDeg, disabled: estClosed, 'data-angles-est-slider': 'true',
                'aria-label': t('stem.angles.a11y_est_slider', 'Your estimate of x'), 'aria-describedby': estClosed ? undefined : 'stem-angles-est-h', 'aria-valuetext': estBenchText(estDeg),
                onChange: function(e) { setEst(parseInt(e.target.value, 10) || 0); },
                className: 'w-full accent-pink-700', style: { minHeight: 44 } }),
              !estClosed && h('button', { type: 'button', onClick: lockEst, disabled: !estHas, 'data-angles-est-lock': 'true', style: { minHeight: 44 },
                className: 'px-3 py-2 rounded-lg text-sm font-bold border-2 border-pink-700 bg-pink-50 text-pink-900 hover:bg-pink-100 disabled:opacity-50' }, t('stem.angles.est_lock_btn', '🔒 Lock my estimate')),
              h('p', { className: 'text-xs font-bold text-slate-800', 'data-angles-est-status': 'true' }, status)))
        );
      };

      // ── Puzzle diagrams ──
      var label = function(key, x, y, txt, col) { return h('text', { key: key, x: x, y: y + 4, textAnchor: 'middle', fill: col, style: { fontSize: 13, fontWeight: 800 } }, txt); };
      var renderPuzzleSvg = function(p) {
        var W = 360, H = 260, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })];
        var xLab = pzLocked ? pzAnswerText(p) : 'x';
        var line = function(key, a, b, extra) { return h('line', Object.assign({ key: key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: P.line, strokeWidth: 2.5, strokeLinecap: 'round' }, extra || {})); };
        var vx = 180, vy = 150, L = 110;
        if (p.kind === 'comp' || p.kind === 'supp' || p.kind === 'point' || p.kind === 'vert' || p.kind === 'rad') {
          var dirs = [], given = [], unknown = null, rot = p.rot || 0;
          if (p.kind === 'comp') { dirs = [rot, rot + p.a, rot + 90]; given = [[rot, p.a]]; unknown = [rot + p.a, 90 - p.a];
            var c1 = ANG.pt(vx, vy, 14, rot), c2 = ANG.pt(vx, vy, 14, rot + 90), c3 = ANG.pt(c1.x, c1.y, 14, rot + 90);
            kids.push(h('path', { key: 'sq', d: 'M ' + c1.x + ' ' + c1.y + ' L ' + c3.x + ' ' + c3.y + ' L ' + c2.x + ' ' + c2.y, fill: 'none', stroke: P.line, strokeWidth: 1.5 }));
          } else if (p.kind === 'supp') { dirs = [rot, rot + 180, rot + p.a]; given = [[rot, p.a]]; unknown = [rot + p.a, 180 - p.a]; }
          else if (p.kind === 'point') {
            var acc = rot; dirs = [rot];
            p.parts.forEach(function(v) { given.push([acc, v]); acc += v; dirs.push(acc); });
            unknown = [acc, p.answer];
          } else if (p.kind === 'vert') {
            dirs = [rot, rot + p.a, rot + 180, rot + 180 + p.a]; given = [[rot, p.a]];
            var starts = [rot, rot + p.a, rot + 180, rot + 180 + p.a], sizes = [p.a, 180 - p.a, p.a, 180 - p.a];
            unknown = [starts[p.askPos], sizes[p.askPos]];
          } else { dirs = [0, p.deg]; vx = 180; vy = 130; L = 95;
            kids.push(h('circle', { key: 'uc', cx: vx, cy: vy, r: L, fill: 'none', stroke: P.muted, strokeWidth: 1, strokeDasharray: '3,4' }));
            given = []; unknown = null;
            kids.push(h('path', { key: 'ra', d: arcPath(vx, vy, 30, 0, Math.min(359.9, p.deg)), fill: 'none', stroke: P.arc, strokeWidth: 2 }));
          }
          dirs.forEach(function(dd, i) { kids.push(line('r' + i, { x: vx, y: vy }, ANG.pt(vx, vy, L, dd))); });
          if (p.kind === 'vert') { /* the lines extend through the vertex already */ }
          given.forEach(function(g, i) {
            kids.push(h('path', { key: 'ga' + i, d: arcPath(vx, vy, 30 + (i % 2) * 6, g[0], g[1]), fill: 'none', stroke: P.given, strokeWidth: 2 }));
            var lp = ANG.pt(vx, vy, 54 + (i % 2) * 8, g[0] + g[1] / 2);
            kids.push(label('gl' + i, lp.x, lp.y, g[1] + '°', P.given));
          });
          if (unknown) {
            kids.push(h('path', { key: 'ua', d: arcPath(vx, vy, 24, unknown[0], unknown[1]), fill: 'none', stroke: P.unknown, strokeWidth: 2.5 }));
            var up = ANG.pt(vx, vy, 46, unknown[0] + unknown[1] / 2);
            kids.push(label('ul', up.x, up.y, xLab, P.unknown));
          }
          if (p.kind === 'rad') { var rl = ANG.pt(vx, vy, 52, Math.min(p.deg, 359) / 2); kids.push(label('rl', rl.x, rl.y, p.dir === 'toRad' ? p.deg + '°' : ANG.piForm(p.deg), P.given)); }
          kids.push(h('circle', { key: 'v', cx: vx, cy: vy, r: 3.5, fill: P.vertex }));
        } else if (p.kind === 'tri') {
          var A = p.angles[0], B = p.angles[1], Cang = p.angles[2];
          var ax = 0, ay = 0, bx = 1, by = 0;
          var acLen = Math.sin(B * Math.PI / 180) / Math.sin(Cang * Math.PI / 180);
          var cpt = { x: ax + acLen * Math.cos(A * Math.PI / 180), y: ay - acLen * Math.sin(A * Math.PI / 180) };
          var pts = [{ x: ax, y: ay }, { x: bx, y: by }, cpt];
          var minX = Math.min(0, cpt.x), maxX = Math.max(1, cpt.x), minY = Math.min(0, cpt.y), maxY = 0;
          var sc = Math.min((W - 80) / (maxX - minX), (H - 70) / ((maxY - minY) || 1));
          var tp = pts.map(function(q) { return { x: 40 + (q.x - minX) * sc, y: (H - 30) + (q.y - maxY) * sc }; });
          kids.push(h('polygon', { key: 'tri', points: tp.map(function(q) { return q.x + ',' + q.y; }).join(' '), fill: 'none', stroke: P.line, strokeWidth: 2.5, strokeLinejoin: 'round' }));
          var cen = { x: (tp[0].x + tp[1].x + tp[2].x) / 3, y: (tp[0].y + tp[1].y + tp[2].y) / 3 };
          tp.forEach(function(q, i) {
            var dx = cen.x - q.x, dy = cen.y - q.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
            var lx = q.x + dx / dl * 30, ly = q.y + dy / dl * 30;
            var isX = i === p.which;
            kids.push(label('tl' + i, lx, ly, isX ? xLab : p.angles[i] + '°', isX ? P.unknown : P.given));
          });
        } else if (p.kind === 'trans') {
          var yT = 90, yB = 180, cxT = 180, slope = Math.tan(p.alpha * Math.PI / 180);
          var xt = cxT + ((yB - yT) / 2) / slope, xb = cxT - ((yB - yT) / 2) / slope;
          kids.push(line('pt', { x: 20, y: yT }, { x: W - 20, y: yT }));
          kids.push(line('pb', { x: 20, y: yB }, { x: W - 20, y: yB }));
          var far1 = ANG.pt(xt, yT, 75, p.alpha), far2 = ANG.pt(xb, yB, 75, p.alpha + 180);
          kids.push(line('tr', far2, far1));
          [[W - 40, yT], [W - 40, yB]].forEach(function(q, i) { kids.push(h('path', { key: 'ar' + i, d: 'M ' + (q[0] - 6) + ' ' + (q[1] - 5) + ' L ' + q[0] + ' ' + q[1] + ' L ' + (q[0] - 6) + ' ' + (q[1] + 5), fill: 'none', stroke: P.line, strokeWidth: 1.5 })); });
          var cornerStart = function(pp) { return [0, p.alpha, 180, 180 + p.alpha][pp]; };
          var cornerSize = function(pp) { return pp % 2 === 0 ? p.alpha : 180 - p.alpha; };
          var at = function(i) { return i === 0 ? { x: xt, y: yT } : { x: xb, y: yB }; };
          var g0 = at(p.given.i), x0 = at(p.ask.i);
          kids.push(h('path', { key: 'tga', d: arcPath(g0.x, g0.y, 18, cornerStart(p.given.p), cornerSize(p.given.p)), fill: 'none', stroke: P.given, strokeWidth: 2 }));
          var glp = ANG.pt(g0.x, g0.y, 36, cornerStart(p.given.p) + cornerSize(p.given.p) / 2);
          kids.push(label('tgl', glp.x, glp.y, p.a + '°', P.given));
          kids.push(h('path', { key: 'txa', d: arcPath(x0.x, x0.y, 14, cornerStart(p.ask.p), cornerSize(p.ask.p)), fill: 'none', stroke: P.unknown, strokeWidth: 2.5 }));
          var xlp = ANG.pt(x0.x, x0.y, 32, cornerStart(p.ask.p) + cornerSize(p.ask.p) / 2);
          kids.push(label('txl', xlp.x, xlp.y, xLab, P.unknown));
        }
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': pzDescribe(p), 'data-angles-puzzle-svg': p.kind, style: { width: '100%', height: 'auto', maxWidth: 460, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };

      var renderPuzzlesTab = function() {
        var solvedOfKind = Number(pzSolved[pz.kind]) || 0;
        var fade = solvedOfKind === 0 ? 'full' : (solvedOfKind === 1 ? 'setup' : 'none');
        var pzWorkedNow = fade === 'full' && !pzLocked ? pzWorked(pz) : null;
        var isRadTo = pz.kind === 'rad' && pz.dir === 'toRad';
        var resText = null;
        if (pzResult) {
          resText = pzResult.ok ? fill(t('stem.angles.pz_ok', 'Correct: x = {x}.'), { x: pzAnswerText(pz) })
            : pzResult.code === 'nan' ? (isRadTo ? PZ_MIS.nan_rad : PZ_MIS.nan)
            : (PZ_MIS[pzResult.code] || PZ_MIS.off) + ' ' + (pzResult.revealed ? fill(t('stem.angles.pz_reveal', 'The answer is x = {x}.'), { x: pzAnswerText(pz) }) : tryMoreText(pzTries));
        }
        var reasonDone = !!(pzReason && (pzReason.ok || pzReason.revealed));
        return h('div', { className: 'space-y-3' },
          h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_puzzle_kinds', 'Puzzle type') },
            ['mix'].concat(levelKinds).map(function(k) {
              var on = pzKind === k;
              return h('button', { key: k, type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: function() { newPuzzle(k); }, style: { minHeight: 44 },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold border-2 ' + (on ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-800 border-emerald-600 hover:bg-emerald-50') }, KIND_LABEL[k]);
            })
          ),
          h('p', { className: 'text-sm font-bold text-slate-800', 'data-angles-puzzle-prompt': 'true' }, pzPrompt(pz)),
          fade === 'full' && !pzLocked && pzWorkedNow && h('p', { className: 'text-sm rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-emerald-950', 'data-angles-worked': 'full' }, pzWorkedNow),
          fade === 'setup' && !pzLocked && h('p', { className: 'text-sm rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-emerald-950', 'data-angles-worked': 'setup' }, fill(t('stem.angles.pz_setup', 'Set-up: {s} Now finish it yourself.'), { s: pzSetup(pz) })),
          h('div', { className: 'rounded-xl border-2 border-emerald-200 bg-white p-2' }, renderPuzzleSvg(pz)),
          h('p', { className: 'text-xs text-slate-700' }, pzDescribe(pz)),
          renderEstimateStep(),
          h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('label', { htmlFor: 'stem-angles-pz-input', className: 'text-sm font-bold text-slate-800' }, isRadTo ? t('stem.angles.pz_label_rad', 'x in radians =') : t('stem.angles.pz_label', 'x (degrees) =')),
            h('input', { id: 'stem-angles-pz-input', type: 'text', inputMode: isRadTo ? 'text' : 'decimal', autoComplete: 'off', value: pzAnswer, disabled: pzLocked,
              onChange: function(e) {
                var patch = estPatchOnType();
                upd(Object.assign({ pz: pz, pzAnswer: e.target.value }, patch));
                if (patch.pzEst && patch.pzEst.deg) announce(t('stem.angles.est_autolock_sr', 'Your estimate is now locked.'));
              },
              onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); checkPuzzle(); } },
              className: 'w-32 px-3 py-2 border-2 border-emerald-600 rounded-lg text-sm font-bold text-slate-900', style: { minHeight: 44 } }),
            h('button', { type: 'button', 'aria-label': t('stem.angles.check_puzzle', 'Check my answer'), onClick: checkPuzzle, disabled: pzLocked, style: { minHeight: 44 },
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50' }, t('stem.angles.check_btn', '✔ Check')),
            !pzLocked && pzHint < 2 && h('button', { type: 'button', onClick: function() { upd({ pz: pz, pzHint: pzHint + 1 }); announce(pzHintText(pz, pzHint + 1)); }, style: { minHeight: 44 },
              className: 'px-3 py-2 rounded-lg text-xs font-bold border border-amber-700 bg-amber-50 text-amber-900 hover:bg-amber-100' },
              pzHint === 0 ? t('stem.angles.hint_1_btn', '💡 Hint') : t('stem.angles.hint_2_btn', '💡 Another hint'))
          ),
          isRadTo && h('p', { className: 'text-xs text-slate-700' }, t('stem.angles.pz_rad_typing', 'Type π as pi, for example 3pi/4. A decimal such as 2.356 also works.')),
          pzHint >= 1 && !pzLocked && h('ul', { className: 'text-sm list-disc ml-5 text-amber-950', 'aria-label': t('stem.angles.a11y_hints', 'Hints') },
            h('li', null, pzHintText(pz, 1)),
            pzHint >= 2 && h('li', null, pzHintText(pz, 2))
          ),
          resText && h('p', { role: 'status', 'data-angles-pz-result': pzResult.code, className: 'p-2 rounded-lg text-sm font-bold border ' + (pzResult.ok ? 'bg-green-50 text-green-800 border-green-600' : 'bg-amber-50 text-amber-900 border-amber-600') }, resText),
          // A wrong answer far from the student's own estimate gets a sense check (no numbers).
          (function() {
            if (pzLocked || !pzResult || pzResult.ok || pzResult.code === 'nan' || pzResult.typed !== pzAnswer) return null;
            var gap = estGapFor(pzAnswer);
            return gap ? h('p', { className: 'text-sm text-pink-950 rounded-lg border border-pink-300 bg-pink-50 p-2', 'data-angles-est-gap': gap }, estGapText(gap)) : null;
          })(),
          pzResult && !pzResult.ok && afterTwo('pz', pzTries, pzLocked, revealPuzzle,
            { q: pzPrompt(pz), wrong: pzAnswer, right: pzAnswerText(pz), text: pzAiFor, save: function(s) { upd({ pzAiHint: { id: pz.id, text: s } }); } }),
          pzLocked && pzResult.revealed && h('p', { className: 'text-sm text-slate-800' }, pzWorkedFor(pz)),
          reasonStep && h('fieldset', { className: 'rounded-lg border border-violet-300 bg-violet-50 p-2' },
            h('legend', { className: 'text-sm font-bold text-violet-900 px-1' }, t('stem.angles.reason_q', 'Which rule justifies your answer?')),
            h('div', { className: 'flex flex-col gap-1.5' },
              reasonOptions.map(function(rid) {
                var isRight = reasonDone && rid === reasonId;
                return h('button', { key: rid, type: 'button', disabled: reasonDone, onClick: function() { answerReason(rid); }, 'aria-pressed': pzReason && pzReason.pick === rid ? 'true' : 'false', style: { minHeight: 44 },
                  className: 'text-left px-3 py-2 rounded-lg text-sm border-2 ' + (isRight ? 'bg-green-100 border-green-700 text-green-900 font-bold' : 'bg-white border-violet-400 text-violet-950 hover:bg-violet-100') }, REL_TEXT[rid]);
              })
            ),
            pzReason && h('p', { role: 'status', className: 'mt-1 text-sm font-bold ' + (pzReason.ok ? 'text-green-800' : 'text-amber-900') },
              pzReason.ok ? t('stem.angles.reason_ok', 'Yes, that rule justifies your answer.')
                : pzReason.revealed ? fill(t('stem.angles.reason_reveal', 'The rule that fits is: {r}'), { r: REL_TEXT[reasonId] })
                : t('stem.angles.reason_no', 'That rule does not match this diagram. Look at where x sits compared with the given angle.') + ' ' + tryMoreText(pzReason.tries || 0)),
            pzReason && !pzReason.ok && afterTwo('reason', pzReason.tries || 0, reasonDone, revealReason)
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function() { newPuzzle(); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' }, t('stem.angles.next_puzzle', '➡ Next puzzle')),
            typeof setStemLabTool === 'function' && level !== 'g4' && h('button', { type: 'button', onClick: function() { setStemLabTool('geometryProver'); }, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold border border-violet-700 text-violet-900 bg-white hover:bg-violet-50' }, t('stem.angles.link_prover', '🔺 Prove it in Geometry Prover'))
          )
        );
      };
      // The worked solution for the CURRENT puzzle, shown only after a reveal.
      var pzWorkedFor = function(p) {
        if (p.kind === 'comp') return fill(t('stem.angles.pzs_comp', 'Solution: x = 90° − {a}° = {x}°.'), { a: p.a, x: p.answer });
        if (p.kind === 'supp') return fill(t('stem.angles.pzs_supp', 'Solution: x = 180° − {a}° = {x}°.'), { a: p.a, x: p.answer });
        if (p.kind === 'vert') return p.ask === 'vertical' ? fill(t('stem.angles.pzs_vert_eq', 'Solution: x is across the crossing from {a}°, so x = {a}°.'), { a: p.a }) : fill(t('stem.angles.pzs_vert_lin', 'Solution: x is beside {a}° on a straight line, so x = 180° − {a}° = {x}°.'), { a: p.a, x: p.answer });
        if (p.kind === 'point') return fill(t('stem.angles.pzs_point', 'Solution: x = 360° − {s}° = {x}°.'), { s: sumOf(p.parts), x: p.answer });
        if (p.kind === 'tri') { var kn = p.angles.filter(function(_, i) { return i !== p.which; }); return fill(t('stem.angles.pzs_tri', 'Solution: x = 180° − {k1}° − {k2}° = {x}°.'), { k1: kn[0], k2: kn[1], x: p.answer }); }
        if (p.kind === 'trans') return fill(t('stem.angles.pzs_trans', 'Solution: x and the {a}° angle are {rel} angles. {rule} So x = {x}°.'), { a: p.a, rel: REL_NAME[p.rel] || p.rel, rule: REL_TEXT[p.rel] || '', x: p.answer });
        return p.dir === 'toRad' ? fill(t('stem.angles.pzs_rad_to', 'Solution: {deg}° = {deg}/180 × π = {pi}.'), { deg: p.deg, pi: ANG.piForm(p.deg) }) : fill(t('stem.angles.pzs_rad_from', 'Solution: {pi} × 180°/π = {deg}°.'), { pi: ANG.piForm(p.deg), deg: p.deg });
      };



      // ══════════════════════════════════════════════════════════════
      // ── Stage B: shared task card (predict, named misconception, a second
      //    try, then a reveal with no credit), used by four new tabs ──
      // ══════════════════════════════════════════════════════════════
      Object.assign(P, isDark ? {
        shadeA: 'rgba(96,165,250,0.30)', shadeB: 'rgba(196,181,253,0.30)', ok: '#86efac', warn: '#fca5a5', compass: '#fdba74', soft: '#334155'
      } : {
        shadeA: 'rgba(59,130,246,0.16)', shadeB: 'rgba(139,92,246,0.16)', ok: '#15803d', warn: '#b91c1c', compass: '#c2410c', soft: '#cbd5e1'
      });
      var TASK_SEED = { pgp: 31, cit: 41, uct: 51, cxt: 61 };
      var taskState = function(pf, task) {
        return { pf: pf, task: task, answer: typeof d[pf + 'A'] === 'string' ? d[pf + 'A'] : '', tries: num(d[pf + 'Tries'], 0),
          result: plain(d[pf + 'Res']) ? d[pf + 'Res'] : null, hint: Math.max(0, Math.min(2, num(d[pf + 'Hint'], 0))) };
      };
      var tsLocked = function(st) { return !!(st.result && (st.result.ok || st.result.revealed)); };
      var tsPatch = function(st, obj) { var o = {}; o[st.pf + 'T'] = st.task; Object.keys(obj).forEach(function(k) { o[st.pf + k] = obj[k]; }); return o; };
      var solvedMap = function(key) { return plain(d[key]) ? d[key] : {}; };
      var runTaskCheck = function(st, cfg, value) {
        if (angleSubmissionPending || tsLocked(st)) return;
        var ans = value != null ? value : st.answer;
        var diag = cfg.diagnose(st.task, ans);
        if (diag.code === 'nan') { upd(tsPatch(st, { A: String(ans == null ? '' : ans), Res: { code: 'nan' } })); announce(cfg.nanText(st.task)); return; }
        angleSubmissionPending = true;
        var tries = st.tries + 1;
        if (tries === 1) setExploreScore(function(prev) { return { correct: prev.correct + (diag.code === 'ok' ? 1 : 0), total: prev.total + 1 }; });
        else if (diag.code === 'ok') setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total }; });
        if (diag.code === 'ok') {
          var solved = Object.assign({}, solvedMap(cfg.solvedKey)), k = cfg.kindOf(st.task);
          solved[k] = (Number(solved[k]) || 0) + 1;
          var patch = tsPatch(st, { A: String(ans), Tries: tries, Res: { code: 'ok', ok: true } });
          patch[cfg.solvedKey] = solved;
          upd(patch);
          // A yes/no question is certain on its second try: credit the first try only.
          if (tries === 1 || !(cfg.binary && cfg.binary(st.task))) creditOnce(st.task.id, tries === 1 ? 5 : 3, cfg.reason);
          recordCorrect(null);
          announce(cfg.okText(st.task));
          return;
        }
        recordWrong();
        tallyMiss(cfg.tallyKind + ':' + cfg.kindOf(st.task), diag.code === 'off' ? cfg.offCode : diag.code, st.task.id);
        upd(tsPatch(st, { A: String(ans), Tries: tries, Res: { code: diag.code }, Hint: Math.max(st.hint, 1) }));
        announce(cfg.misText(diag.code, st.task) + ' ' + tryMoreText(tries));
      };
      var revealTask = function(st, cfg) {
        if (tsLocked(st) || st.tries < 2 || !allowReveal) return;
        upd(tsPatch(st, { Res: Object.assign({ code: 'off' }, st.result || {}, { revealed: true }) }));
        announce(cfg.revealText(st.task));
      };
      // A saved AI nudge belongs to one question: { id, text }.
      var taskAiText = function(st) { var a = d[st.pf + 'Ai']; return plain(a) && a.id === st.task.id ? String(a.text || '') : ''; };
      var newTask = function(st, cfg, kind) {
        var nt = null, g = 0;
        do { nt = cfg.make(kind, Math.random, level); g++; } while (nt.id === st.task.id && g < 12);
        var o = {}; o[st.pf + 'T'] = nt; o[st.pf + 'A'] = ''; o[st.pf + 'Tries'] = 0; o[st.pf + 'Res'] = null; o[st.pf + 'Hint'] = 0; o[st.pf + 'Ai'] = null;
        if (cfg.extraReset) Object.assign(o, cfg.extraReset);
        upd(o);
        announce(cfg.prompt(nt));
      };
      var resultClass = function(ok) { return 'p-2 rounded-lg text-sm font-bold border ' + (ok ? 'bg-green-50 text-green-800 border-green-600' : 'bg-amber-50 text-amber-900 border-amber-600'); };
      var choiceBtnClass = function(on, right) { return 'px-3 py-2 rounded-lg text-sm font-bold border-2 ' + (right ? 'bg-green-100 border-green-700 text-green-900' : on ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-600 text-slate-900 hover:bg-slate-100'); };
      var subModeBtn = function(key, on, label, onClick) {
        return h('button', { key: key, type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: onClick, style: { minHeight: 44 },
          className: 'px-3 py-2 rounded-lg text-sm font-bold border-2 focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (on ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-violet-800 border-violet-600 hover:bg-violet-50') }, label);
      };
      // The card: prompt, fading worked example, diagram + words, answer, hints, result, solution.
      var renderTaskCard = function(st, cfg) {
        var locked = tsLocked(st), res = st.result, task = st.task;
        var solvedOfKind = Number(solvedMap(cfg.solvedKey)[cfg.kindOf(task)]) || 0;
        var fade = solvedOfKind === 0 ? 'full' : (solvedOfKind === 1 ? 'setup' : 'none');
        var inputId = 'stem-angles-' + st.pf + '-input';
        // A kind with no diagram drew an empty frame; build the diagram and its words first.
        var diagNode = cfg.diagram ? cfg.diagram(task, locked) : null, descText = cfg.describe ? cfg.describe(task, locked) : null;
        var workedText = fade === 'full' && !locked && cfg.worked ? cfg.worked(task) : null;
        var resText = null;
        if (res) {
          resText = res.ok ? cfg.okText(task) : res.code === 'nan' ? cfg.nanText(task)
            : cfg.misText(res.code, task) + ' ' + (res.revealed ? cfg.revealText(task) : tryMoreText(st.tries));
        }
        return h('div', { className: 'space-y-3', 'data-angles-task': st.pf },
          cfg.kinds && cfg.kinds.length > 1 && h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': cfg.kindsLabel },
            cfg.kinds.map(function(k) {
              var on = cfg.kindSel === k[0];
              return h('button', { key: k[0], type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: function() { cfg.onKind(k[0]); }, style: { minHeight: 44 },
                className: 'px-3 py-1.5 rounded-lg text-xs font-bold border-2 ' + (on ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-emerald-800 border-emerald-600 hover:bg-emerald-50') }, k[1]);
            })),
          h('p', { className: 'text-sm font-bold text-slate-800', 'data-angles-task-prompt': st.pf }, cfg.prompt(task)),
          workedText && h('p', { className: 'text-sm rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-emerald-950', 'data-angles-task-worked': 'full' }, workedText),
          fade === 'setup' && !locked && cfg.setup && h('p', { className: 'text-sm rounded-lg border border-emerald-300 bg-emerald-50 p-2 text-emerald-950', 'data-angles-task-worked': 'setup' }, fill(t('stem.angles.pz_setup', 'Set-up: {s} Now finish it yourself.'), { s: cfg.setup(task) })),
          diagNode && h('div', { className: 'rounded-xl border-2 border-slate-200 bg-white p-2', 'data-angles-task-diagram': st.pf }, diagNode),
          descText && h('p', { className: 'text-xs text-slate-700', 'data-angles-task-desc': st.pf }, descText),
          cfg.choices ? h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': cfg.inputLabel },
            cfg.choices(task).map(function(c) {
              var right = locked && c[0] === String(task.answer);
              return h('button', { key: c[0], type: 'button', disabled: locked, 'aria-label': c[2] || undefined, 'aria-pressed': st.answer === c[0] ? 'true' : 'false',
                onClick: function() { runTaskCheck(st, cfg, c[0]); }, style: { minHeight: 44, minWidth: 44 }, className: choiceBtnClass(st.answer === c[0] && !right, right) }, c[1]);
            }))
          : h('div', { className: 'flex flex-wrap gap-2 items-center' },
            h('label', { htmlFor: inputId, className: 'text-sm font-bold text-slate-800' }, cfg.inputLabel),
            h('input', { id: inputId, type: 'text', inputMode: cfg.inputMode || 'decimal', autoComplete: 'off', value: st.answer, disabled: locked,
              onChange: function(e) { upd(tsPatch(st, { A: e.target.value, Res: res && res.code === 'nan' ? null : res })); },
              onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); runTaskCheck(st, cfg); } },
              className: 'w-32 px-3 py-2 border-2 border-emerald-600 rounded-lg text-sm font-bold text-slate-900', style: { minHeight: 44 } }),
            h('button', { type: 'button', 'aria-label': cfg.checkLabel, onClick: function() { runTaskCheck(st, cfg); }, disabled: locked, style: { minHeight: 44 },
              className: 'px-4 py-2 rounded-lg text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50' }, t('stem.angles.check_btn', '✔ Check'))),
          cfg.typingHelp && h('p', { className: 'text-xs text-slate-700' }, cfg.typingHelp(task)),
          !locked && st.hint < 2 && h('button', { type: 'button', onClick: function() { upd(tsPatch(st, { Hint: st.hint + 1 })); announce(cfg.hintText(task, st.hint + 1)); }, style: { minHeight: 44 },
            className: 'px-3 py-2 rounded-lg text-xs font-bold border border-amber-700 bg-amber-50 text-amber-900 hover:bg-amber-100' },
            st.hint === 0 ? t('stem.angles.hint_1_btn', '💡 Hint') : t('stem.angles.hint_2_btn', '💡 Another hint')),
          st.hint >= 1 && !locked && h('ul', { className: 'text-sm list-disc ml-5 text-amber-950', 'aria-label': t('stem.angles.a11y_hints', 'Hints') },
            h('li', null, cfg.hintText(task, 1)), st.hint >= 2 && h('li', null, cfg.hintText(task, 2))),
          resText && h('p', { role: 'status', 'data-angles-task-result': res.code, className: resultClass(!!res.ok) }, resText),
          res && !res.ok && res.code !== 'nan' && afterTwo(st.pf, st.tries, locked, function() { revealTask(st, cfg); },
            { q: cfg.prompt(task), wrong: st.answer, right: cfg.answerText ? cfg.answerText(task) : String(task.answer), text: taskAiText(st),
              save: function(s) { var o = {}; o[st.pf + 'Ai'] = { id: task.id, text: s }; upd(o); } }),
          locked && res.revealed && cfg.solution && h('p', { className: 'text-sm text-slate-800', 'data-angles-task-solution': st.pf }, cfg.solution(task)),
          locked && cfg.after && cfg.after(task),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function() { newTask(st, cfg, cfg.nextKind()); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' }, cfg.nextLabel || t('stem.angles.next_question', '➡ Next question')),
            cfg.links)
        );
      };
      // A predict / claim / reason question with named feedback, a second try, then the answer.
      var renderChoiceStep = function(opts) {
        var s = plain(opts.state) ? opts.state : null, done = !!(s && (s.ok || s.revealed));
        return h('fieldset', { className: 'rounded-lg border border-violet-300 bg-violet-50 p-2', 'data-angles-step': opts.id },
          h('legend', { className: 'text-sm font-bold text-violet-900 px-1' }, opts.legend),
          h('div', { className: 'flex flex-col gap-1.5' },
            opts.options.map(function(o) {
              var right = done && o[0] === opts.correct;
              return h('button', { key: o[0], type: 'button', disabled: done || !!opts.disabled, 'aria-pressed': s && s.pick === o[0] ? 'true' : 'false', onClick: function() { opts.onPick(o[0]); }, style: { minHeight: 44 },
                className: 'text-left px-3 py-2 rounded-lg text-sm border-2 ' + (right ? 'bg-green-100 border-green-700 text-green-900 font-bold' : (s && s.pick === o[0]) ? 'bg-violet-200 border-violet-700 text-violet-950' : 'bg-white border-violet-400 text-violet-950 hover:bg-violet-100') }, o[1]);
            })),
          s && s.msg && h('p', { role: 'status', className: 'mt-1 text-sm font-bold ' + (s.ok ? 'text-green-800' : 'text-amber-900') }, s.msg),
          s && !s.ok && opts.stateKey && afterTwo(opts.id, s.tries || 0, done, function() { revealChoice(opts.stateKey, s); })
        );
      };
      var revealChoice = function(key, s) {
        if (!s || s.ok || s.revealed || (s.tries || 0) < 2 || !allowReveal) return;
        var o = {};
        o[key] = Object.assign({}, s, { revealed: true, msg: (s.wrong ? s.wrong + ' ' : '') + (s.revealMsg || '') });
        upd(o);
        announce(o[key].msg);
      };
      // Grade a choice step: s = { pick, ok, tries, revealed, msg }.
      var gradeChoice = function(key, prev, pick, ok, wrongMsg, okMsg, revealMsg, creditId, reason, misCode) {
        if (angleSubmissionPending || (prev && (prev.ok || prev.revealed))) return;
        angleSubmissionPending = true;
        var tries = ((prev && prev.tries) || 0) + 1;
        var o = {};
        if (ok) {
          o[key] = { pick: pick, ok: true, tries: tries, msg: okMsg };
          upd(o);
          if (creditId) creditOnce(creditId, tries === 1 ? 5 : 3, reason);
          announce(okMsg);
          return true;
        }
        if (misCode) tallyMiss(reason, misCode, creditId || key);
        o[key] = { pick: pick, ok: false, tries: tries, wrong: wrongMsg, revealMsg: revealMsg, msg: (wrongMsg ? wrongMsg + ' ' : '') + tryMoreText(tries) };
        upd(o);
        announce(o[key].msg);
        return false;
      };
      var vname = function(i) { return 'ABCDEFGHIJKL'.charAt(i); };
      var PG_NAME = {
        3: t('stem.angles.pg_name_3', 'Triangle'), 4: t('stem.angles.pg_name_4', 'Quadrilateral'), 5: t('stem.angles.pg_name_5', 'Pentagon'), 6: t('stem.angles.pg_name_6', 'Hexagon'),
        7: t('stem.angles.pg_name_7', 'Heptagon'), 8: t('stem.angles.pg_name_8', 'Octagon'), 9: t('stem.angles.pg_name_9', 'Nonagon'), 10: t('stem.angles.pg_name_10', 'Decagon'),
        11: t('stem.angles.pg_name_11', 'Hendecagon'), 12: t('stem.angles.pg_name_12', 'Dodecagon')
      };
      var regName = function(n) { return n === 4 ? t('stem.angles.pg_name_square', 'Square') : pgName(n); };
      var pgName = function(n) { return PG_NAME[n] || fill(t('stem.angles.pg_name_n', '{n}-gon'), { n: n }); };
      var degList = function(arr) { return arr.map(function(v) { return v + '°'; }).join(', '); };
      var fmt1 = function(x) { return String(Math.round(x * 10) / 10); };

      // ══════════════════════════════════════════════════════════════
      // ── Polygons tab: angle-sum investigation (claim, evidence, reasoning),
      //    the exterior-angle walk, which regular polygons tile, practice ──
      // ══════════════════════════════════════════════════════════════
      var PGW = 320, PGH = 240;
      var pgMode = ['sum', 'ext', 'tile', 'practice'].indexOf(d.pgMode) !== -1 ? d.pgMode : 'sum';
      var pgInv = plain(d.pgInv) ? d.pgInv : {};
      var pgN = (typeof d.pgN === 'number' && d.pgN >= 3 && d.pgN <= 10) ? Math.round(d.pgN) : 5;
      var pgSeed = typeof d.pgSeed === 'number' && isFinite(d.pgSeed) ? d.pgSeed : 5150;
      var pgShape = ANG.makePolygon(ANG.seedRng(pgSeed), pgN, PGW, PGH);
      // Vertex indexes must be whole numbers: a saved 0.5 indexed no point and crashed the render.
      var pgDiags = Array.isArray(d.pgDiags) ? d.pgDiags.filter(function(x) { return Array.isArray(x) && x.length === 2 && Number.isInteger(x[0]) && Number.isInteger(x[1]) && x[0] >= 0 && x[1] < pgN && x[0] < x[1] && !ANG.isAdjacent(pgN, x[0], x[1]); }) : [];
      // Drop any saved diagonal that crosses an earlier one (old or edited state).
      pgDiags = pgDiags.reduce(function(acc, x) { var r = ANG.addDiagonal(pgN, acc, x[0], x[1]); return r.code === 'ok' ? r.diags : acc; }, []);
      var pgSel = (Number.isInteger(d.pgSel) && d.pgSel >= 0 && d.pgSel < pgN) ? d.pgSel : null;
      var pgDone = ANG.triangulated(pgN, pgDiags);
      var pgRuns = plain(d.pgRuns) ? d.pgRuns : {};
      var pgRunNs = Object.keys(pgRuns).map(Number).filter(function(n) { return n >= 3 && n <= 10 && plain(pgRuns[n]) && isFinite(pgRuns[n].sum); }).sort(function(a, b) { return a - b; });
      var pgCleanRuns = {}; pgRunNs.forEach(function(n) { pgCleanRuns[n] = pgRuns[n]; });
      var pgRow = plain(d.pgRow) && d.pgRow.n === pgN ? d.pgRow : null;
      var pgTri = typeof d.pgTri === 'string' ? d.pgTri : '', pgSumIn = typeof d.pgSumIn === 'string' ? d.pgSumIn : '';
      var pgPred = plain(d.pgPred) ? d.pgPred : null;
      var pgShapePatch = function() { return { pgN: pgN, pgSeed: pgSeed }; };
      var PG_PRED = [
        ['p_add180', t('stem.angles.pg_pred_add180', 'Each extra side adds the same amount to the total.')],
        ['p_360', t('stem.angles.pg_pred_360', 'Every polygon’s angles add to 360°.')],
        ['p_n180', t('stem.angles.pg_pred_n180', 'The total is 180° times the number of sides.')],
        ['p_size', t('stem.angles.pg_pred_size', 'It depends on how big the polygon is drawn.')]
      ];
      var PG_CLAIM_TXT = [
        ['c_n2', t('stem.angles.pg_claim_n2', 'Angle sum = (n − 2) × 180°')],
        ['c_n', t('stem.angles.pg_claim_n', 'Angle sum = n × 180°')],
        ['c_360', t('stem.angles.pg_claim_360', 'Angle sum = 360° for every polygon')],
        ['c_n1_90', t('stem.angles.pg_claim_n1_90', 'Angle sum = (n − 1) × 90°')]
      ];
      var PG_WHY = [
        ['r_tri', t('stem.angles.pg_why_tri', 'From one vertex, n − 3 diagonals cut the polygon into n − 2 triangles. Each triangle’s angles add to 180°, and together they fill the polygon’s corners exactly.')],
        ['r_sides', t('stem.angles.pg_why_sides', 'Each side of the polygon adds 180° to the total.')],
        ['r_centre', t('stem.angles.pg_why_centre', 'Joining every vertex to the centre makes n triangles, so the total is n × 180°.')],
        ['r_size', t('stem.angles.pg_why_size', 'Polygons with more sides are bigger, so their angles are bigger.')]
      ];
      var PG_WHY_MIS = {
        r_sides: t('stem.angles.pg_whym_sides', 'Sides are not where the angles come from. Look at what each new diagonal makes.'),
        r_centre: t('stem.angles.pg_whym_centre', 'Triangles from the centre also include the 360° round the centre point, which are not corners of the polygon. Take those away and you get (n − 2) × 180°.'),
        r_size: t('stem.angles.pg_whym_size', 'Size does not matter: your evidence used shapes of different sizes and the totals still followed the rule.')
      };
      var DIAG_MSG = {
        side: t('stem.angles.pg_diag_side', 'Those two vertices are next to each other: that is a side, not a diagonal.'),
        dup: t('stem.angles.pg_diag_dup', 'That diagonal is already drawn.'),
        cross: t('stem.angles.pg_diag_cross', 'That diagonal would cross one you already drew. Diagonals that split a polygon into triangles never cross.'),
        same: t('stem.angles.pg_diag_same', 'Choose two different vertices.')
      };
      var pgNewShape = function(n) {
        var seed = Math.floor(Math.random() * 999999999) + 1;
        upd({ pgN: n, pgSeed: seed, pgDiags: [], pgSel: null, pgTri: '', pgSumIn: '', pgRow: null });
        announce(fill(t('stem.angles.pg_new_shape_sr', 'A new polygon with {n} sides, vertices {first} to {last}. Choose two vertices that are not next to each other to draw a diagonal.'), { n: n, first: 'A', last: vname(n - 1) }));
      };
      var pgSelectVertex = function(i) {
        if (!(pgPred && pgPred.locked)) return;
        if (pgSel == null) { upd(Object.assign(pgShapePatch(), { pgSel: i })); announce(fill(t('stem.angles.pg_sel_sr', 'Vertex {v} selected. Choose another vertex to draw a diagonal from {v}.'), { v: vname(i) })); return; }
        if (pgSel === i) { upd(Object.assign(pgShapePatch(), { pgSel: null })); announce(t('stem.angles.pg_unsel_sr', 'Selection cleared.')); return; }
        var r = ANG.addDiagonal(pgN, pgDiags, pgSel, i);
        if (r.code !== 'ok') { upd(Object.assign(pgShapePatch(), { pgSel: null })); announce(DIAG_MSG[r.code] || DIAG_MSG.same); return; }
        var doneNow = ANG.triangulated(pgN, r.diags);
        upd(Object.assign(pgShapePatch(), { pgDiags: r.diags, pgSel: null }));
        announce(fill(t('stem.angles.pg_diag_sr', 'Diagonal {a}{b} drawn. The polygon is in {k} pieces.'), { a: vname(pgSel), b: vname(i), k: r.diags.length + 1 }) + (doneNow ? ' ' + t('stem.angles.pg_done_sr', 'Every piece is now a triangle.') : ''));
      };
      var pgCheckRow = function() {
        if (angleSubmissionPending || !pgDone || (pgRow && (pgRow.ok || pgRow.revealed))) return;
        var diag = ANG.diagnosePolyRow(pgN, pgTri, pgSumIn);
        if (diag.code === 'nan') { upd(Object.assign(pgShapePatch(), { pgRow: { n: pgN, code: 'nan', tries: pgRow ? pgRow.tries : 0 } })); announce(t('stem.angles.pg_row_nan', 'Type a whole number of triangles and the angle sum in degrees.')); return; }
        angleSubmissionPending = true;
        var tries = ((pgRow && pgRow.tries) || 0) + 1;
        var runs = Object.assign({}, pgCleanRuns);
        if (diag.code === 'ok') {
          runs[pgN] = { tri: pgN - 2, sum: ANG.polySum(pgN) };
          upd(Object.assign(pgShapePatch(), { pgRuns: runs, pgRow: { n: pgN, code: 'ok', ok: true, tries: tries } }));
          creditOnce('pg:row:' + pgN, tries === 1 ? 5 : 3, 'polygon evidence');
          recordCorrect(null);
          announce(fill(t('stem.angles.pg_row_ok', 'Recorded: {n} sides, {t} triangles, {s}°.'), { n: pgN, t: pgN - 2, s: ANG.polySum(pgN) }));
          return;
        }
        recordWrong();
        tallyMiss('polygon evidence', diag.code, pgN + '-gon');
        upd(Object.assign(pgShapePatch(), { pgRow: { n: pgN, code: diag.code, tries: tries } }));
        announce(pgRowMis(diag.code) + ' ' + tryMoreText(tries));
      };
      var revealPgRow = function() {
        if (!pgRow || pgRow.ok || pgRow.revealed || (pgRow.tries || 0) < 2 || !allowReveal) return;
        var runs = Object.assign({}, pgCleanRuns);
        runs[pgN] = { tri: pgN - 2, sum: ANG.polySum(pgN), revealed: true };
        upd(Object.assign(pgShapePatch(), { pgRuns: runs, pgRow: Object.assign({}, pgRow, { revealed: true }) }));
        announce(fill(t('stem.angles.pg_row_reveal', 'This polygon makes {t} triangles, so its angles add to {t} × 180° = {s}°.'), { t: pgN - 2, s: ANG.polySum(pgN) }));
      };
      var pgRowMis = function(code) {
        return code === 'tri_counted_sides' ? t('stem.angles.pg_rowm_sides', 'That is the number of sides. Count the triangles the diagonals made: the shaded pieces.')
          : code === 'tri_counted_diagonals' ? t('stem.angles.pg_rowm_diags', 'That is the number of diagonals. Count the triangles (pieces) instead: there is always one more piece than diagonals.')
          : code === 'tri_off' ? t('stem.angles.pg_rowm_tri', 'Count the shaded triangles again, one at a time.')
          : code === 'sum_n180' ? t('stem.angles.pg_rowm_n180', 'You multiplied 180° by the number of sides. Multiply by the number of triangles.')
          : code === 'sum_360' ? t('stem.angles.pg_rowm_360', '360° is the total for four-sided shapes only. Each triangle brings 180°.')
          : t('stem.angles.pg_rowm_sum', 'Your triangle count is right. Multiply it by 180° again.');
      };
      var pgPick = function(id) { if (pgPred && pgPred.locked) return; upd({ pgPred: { pick: id, locked: false } }); };
      var pgLockPred = function() {
        if (!pgPred || pgPred.locked) return;
        upd({ pgPred: { pick: pgPred.pick, locked: true }, pgInv: Object.assign({}, pgInv, { pred: true }) });
        announce(t('stem.angles.pg_pred_locked', 'Prediction locked in. Now collect evidence: cut polygons into triangles.'));
      };
      var pgClaim = plain(d.pgClaim) ? d.pgClaim : null, pgWhy = plain(d.pgWhy) ? d.pgWhy : null;
      var pgAnswerClaim = function(id) {
        if (pgRunNs.length < 3) return;
        var cc = ANG.claimCheck(id, pgCleanRuns);
        var wrong = cc.fits ? '' : fill(t('stem.angles.pg_claim_breaks', 'Your row for {n} sides shows {m}°, but this claim predicts {p}°.'), { n: cc.breaks, m: cc.measured, p: cc.predicted });
        var ok = gradeChoice('pgClaim', pgClaim, id, cc.fits, wrong, t('stem.angles.pg_claim_ok', 'Yes: that rule fits every row of your evidence.'),
          t('stem.angles.pg_claim_reveal', 'The rule that fits every row is: angle sum = (n − 2) × 180°.'), 'pg:claim', 'polygon claim', 'pg_claim_wrong');
        if (ok) upd({ pgInv: Object.assign({}, pgInv, { claim: true }) });
      };
      var pgAnswerWhy = function(id) {
        gradeChoice('pgWhy', pgWhy, id, id === 'r_tri', PG_WHY_MIS[id] || '', t('stem.angles.pg_why_ok', 'Yes. That is why the rule works for every polygon, not just the ones you drew.'),
          fill(t('stem.angles.pg_why_reveal', 'The reason: {r}'), { r: PG_WHY[0][1] }), 'pg:why', 'polygon reason', 'pg_why_wrong');
      };
      var predSupported = pgPred && (pgPred.pick === 'p_add180');
      var renderPolySvg = function() {
        var pts = pgShape.pts, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: PGW, height: PGH, fill: P.panel })];
        if (pgDone) {
          ANG.polyRegions(pgN, pgDiags).forEach(function(reg, ri) {
            kids.push(h('polygon', { key: 'rg' + ri, points: reg.map(function(i) { return pts[i].x + ',' + pts[i].y; }).join(' '), fill: ri % 2 ? P.shadeB : P.shadeA, stroke: 'none' }));
          });
        }
        kids.push(h('polygon', { key: 'poly', points: pts.map(function(p) { return p.x + ',' + p.y; }).join(' '), fill: 'none', stroke: P.line, strokeWidth: 2.5, strokeLinejoin: 'round' }));
        pgDiags.forEach(function(dg, i) { kids.push(h('line', { key: 'dg' + i, x1: pts[dg[0]].x, y1: pts[dg[0]].y, x2: pts[dg[1]].x, y2: pts[dg[1]].y, stroke: P.ray, strokeWidth: 2, strokeDasharray: '6,3' })); });
        var cxm = pts.reduce(function(s, p) { return s + p.x; }, 0) / pgN, cym = pts.reduce(function(s, p) { return s + p.y; }, 0) / pgN;
        pts.forEach(function(p, i) {
          var sel = pgSel === i, dx = p.x - cxm, dy = p.y - cym, dl = Math.sqrt(dx * dx + dy * dy) || 1;
          kids.push(h('circle', { key: 'v' + i, cx: p.x, cy: p.y, r: sel ? 9 : 6, fill: sel ? P.hint : P.vertex, stroke: P.panel, strokeWidth: 2, style: { cursor: 'pointer' }, onClick: function() { pgSelectVertex(i); } }));
          kids.push(h('text', { key: 'l' + i, x: p.x + dx / dl * 18, y: p.y + dy / dl * 18 + 5, textAnchor: 'middle', fill: P.ink, style: { fontSize: 14, fontWeight: 800 } }, vname(i)));
          if (pgRow && (pgRow.ok || pgRow.revealed)) {
            kids.push(h('text', { key: 'a' + i, x: p.x - dx / dl * 22, y: p.y - dy / dl * 22 + 4, textAnchor: 'middle', fill: P.hint, style: { fontSize: 10.5, fontWeight: 800 } }, pgShape.interior[i] + '°'));
          }
        });
        return h('svg', { viewBox: '0 0 ' + PGW + ' ' + PGH, role: 'img', 'data-angles-poly-svg': 'true',
          'aria-label': fill(t('stem.angles.pg_svg', 'A polygon with {n} sides, vertices A to {last}, and {k} diagonals.'), { n: pgN, last: vname(pgN - 1), k: pgDiags.length }),
          style: { width: '100%', height: 'auto', maxWidth: 480, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };
      var pgRegionsText = function() {
        var regs = ANG.polyRegions(pgN, pgDiags);
        var diagText = pgDiags.length ? fill(t('stem.angles.pg_desc_diags', 'Diagonals drawn: {list}.'), { list: pgDiags.map(function(x) { return vname(x[0]) + vname(x[1]); }).join(', ') }) : t('stem.angles.pg_desc_nodiags', 'No diagonals yet.');
        var pieces = fill(t('stem.angles.pg_desc_pieces', 'Pieces: {list}.'), { list: regs.map(function(r) { return r.map(vname).join(''); }).join('; ') });
        return diagText + ' ' + pieces;
      };
      var renderSumInvestigation = function() {
        var predLocked = !!(pgPred && pgPred.locked);
        var rowLocked = !!(pgRow && (pgRow.ok || pgRow.revealed));
        var canClaim = pgRunNs.length >= 3;
        return h('div', { className: 'space-y-3', 'data-angles-pg-sum': 'true' },
          h('div', { className: 'rounded-lg border-2 border-violet-300 bg-white p-3' },
            h('p', { className: 'text-xs font-black uppercase tracking-wide text-violet-800' }, t('stem.angles.pg_q_label', 'Investigation question')),
            h('p', { className: 'text-sm font-bold text-slate-900' }, t('stem.angles.pg_question', 'How does the sum of a polygon’s interior angles depend on its number of sides?'))),
          h('fieldset', { className: 'rounded-lg border border-violet-300 bg-violet-50 p-2', 'data-angles-step': 'pg-predict' },
            h('legend', { className: 'text-sm font-bold text-violet-900 px-1' }, t('stem.angles.pg_predict_legend', 'Step 1. Predict before you collect evidence')),
            h('div', { className: 'flex flex-col gap-1.5' }, PG_PRED.map(function(o) {
              var on = !!pgPred && pgPred.pick === o[0];
              return h('button', { key: o[0], type: 'button', disabled: predLocked, 'aria-pressed': on ? 'true' : 'false', onClick: function() { pgPick(o[0]); }, style: { minHeight: 44 },
                className: 'text-left px-3 py-2 rounded-lg text-sm border-2 ' + (on ? 'bg-violet-200 border-violet-700 text-violet-950 font-bold' : 'bg-white border-violet-400 text-violet-950 hover:bg-violet-100') }, o[1]);
            })),
            !predLocked && h('button', { type: 'button', onClick: pgLockPred, disabled: !pgPred, style: { minHeight: 44 }, className: 'mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50' }, t('stem.angles.pg_lock_pred', '🔒 Lock in my prediction')),
            predLocked && h('p', { className: 'mt-1 text-xs font-bold text-violet-900' }, t('stem.angles.pg_pred_is_locked', 'Your prediction is locked in.'))),
          !predLocked ? h('p', { className: 'text-sm text-slate-700' }, t('stem.angles.pg_evidence_wait', 'Lock in a prediction to start collecting evidence.')) :
          h('div', { className: 'space-y-2 rounded-lg border border-sky-300 bg-sky-50 p-2', 'data-angles-step': 'pg-evidence' },
            h('p', { className: 'text-sm font-bold text-sky-950' }, t('stem.angles.pg_evidence_title', 'Step 2. Evidence: cut polygons into triangles')),
            h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_pg_sides', 'Number of sides') },
              [3, 4, 5, 6, 7, 8, 9, 10].map(function(n) {
                var on = pgN === n;
                return h('button', { key: n, type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: function() { pgNewShape(n); }, style: { minHeight: 44, minWidth: 44 },
                  className: 'px-2 py-1 rounded-lg text-sm font-bold border-2 ' + (on ? 'bg-sky-800 text-white border-sky-800' : 'bg-white text-sky-900 border-sky-700 hover:bg-sky-100') + (pgCleanRuns[n] ? ' underline' : '') },
                  fill(t('stem.angles.pg_sides_btn', '{n} sides'), { n: n }));
              })),
            h('p', { className: 'text-sm text-sky-950' }, t('stem.angles.pg_evidence_how', 'Choose a vertex, then another vertex that is not next to it, to draw a diagonal. Keep going until every piece is a triangle. Diagonals may not cross.')),
            h('div', { className: 'rounded-xl border-2 border-sky-200 bg-white p-2' }, renderPolySvg()),
            h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_pg_vertices', 'Vertices: choose two to draw a diagonal') },
              pgShape.pts.map(function(_, i) {
                return h('button', { key: i, type: 'button', 'aria-pressed': pgSel === i ? 'true' : 'false', disabled: pgDone, onClick: function() { pgSelectVertex(i); }, style: { minHeight: 44, minWidth: 44 },
                  'aria-label': fill(t('stem.angles.a11y_pg_vertex', 'Vertex {v}'), { v: vname(i) }),
                  className: 'px-2 py-1 rounded-lg text-sm font-black border-2 disabled:opacity-50 ' + (pgSel === i ? 'bg-amber-700 text-white border-amber-800' : 'bg-white text-slate-900 border-slate-600 hover:bg-slate-100') }, vname(i));
              }),
              h('button', { type: 'button', onClick: function() { upd(Object.assign(pgShapePatch(), { pgDiags: pgDiags.slice(0, -1), pgSel: null, pgRow: rowLocked ? pgRow : null })); }, disabled: !pgDiags.length || rowLocked, style: { minHeight: 44 }, className: 'px-3 py-1 rounded-lg text-xs font-bold border border-slate-600 bg-white text-slate-900 disabled:opacity-50' }, t('stem.angles.pg_undo', '↶ Undo diagonal'))),
            h('p', { className: 'text-xs text-slate-800', 'data-angles-pg-desc': 'true' }, pgRegionsText()),
            pgDone && h('div', { className: 'flex flex-wrap gap-2 items-end' },
              h('label', { className: 'text-xs font-bold text-slate-800 flex flex-col gap-1' }, t('stem.angles.pg_tri_label', 'Triangles'),
                h('input', { type: 'text', inputMode: 'numeric', autoComplete: 'off', value: pgTri, disabled: rowLocked, onChange: function(e) { upd(Object.assign(pgShapePatch(), { pgTri: e.target.value })); }, className: 'w-20 px-2 py-2 border-2 border-sky-700 rounded-lg text-sm font-bold text-slate-900', style: { minHeight: 44 } })),
              h('label', { className: 'text-xs font-bold text-slate-800 flex flex-col gap-1' }, t('stem.angles.pg_sum_label', 'Angle sum (degrees)'),
                h('input', { type: 'text', inputMode: 'numeric', autoComplete: 'off', value: pgSumIn, disabled: rowLocked, onChange: function(e) { upd(Object.assign(pgShapePatch(), { pgSumIn: e.target.value })); },
                  onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); pgCheckRow(); } }, className: 'w-28 px-2 py-2 border-2 border-sky-700 rounded-lg text-sm font-bold text-slate-900', style: { minHeight: 44 } })),
              h('button', { type: 'button', onClick: pgCheckRow, disabled: rowLocked, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-sky-800 text-white hover:bg-sky-900 disabled:opacity-50' }, t('stem.angles.pg_record', '✔ Record this row'))),
            pgRow && pgRow.code && h('p', { role: 'status', 'data-angles-pg-row': pgRow.code, className: resultClass(!!pgRow.ok) },
              pgRow.ok ? fill(t('stem.angles.pg_row_ok', 'Recorded: {n} sides, {t} triangles, {s}°.'), { n: pgN, t: pgN - 2, s: ANG.polySum(pgN) })
                : pgRow.code === 'nan' ? t('stem.angles.pg_row_nan', 'Type a whole number of triangles and the angle sum in degrees.')
                : pgRowMis(pgRow.code) + ' ' + (pgRow.revealed ? fill(t('stem.angles.pg_row_reveal', 'This polygon makes {t} triangles, so its angles add to {t} × 180° = {s}°.'), { t: pgN - 2, s: ANG.polySum(pgN) }) : tryMoreText(pgRow.tries || 0))),
            pgRow && !pgRow.ok && pgRow.code !== 'nan' && afterTwo('pg-row', pgRow.tries || 0, rowLocked, revealPgRow),
            rowLocked && h('p', { className: 'text-xs text-slate-800' }, fill(t('stem.angles.pg_measured', 'Check with a protractor: the corners measure {list}, a total of {s}°, whatever the shape.'), { list: degList(pgShape.interior), s: pgShape.interior.reduce(function(s, v) { return s + v; }, 0) }))
          ),
          predLocked && h('table', { className: 'w-full text-sm border-collapse bg-white rounded-lg', style: { overflowWrap: 'anywhere' }, 'data-angles-pg-table': 'true' },
            h('caption', { className: 'text-left text-xs font-black uppercase tracking-wide text-slate-800 py-1' }, t('stem.angles.pg_table_caption', 'Your evidence')),
            h('thead', null, h('tr', null,
              [t('stem.angles.pg_col_n', 'Sides (n)'), t('stem.angles.pg_col_name', 'Polygon'), t('stem.angles.pg_col_tri', 'Triangles'), t('stem.angles.pg_col_sum', 'Angle sum'), t('stem.angles.pg_col_ratio', 'Sum ÷ 180°')].map(function(c, i) {
                return h('th', { key: i, scope: 'col', className: 'text-left border-b border-slate-400 px-1 py-1' }, c);
              }))),
            h('tbody', null, pgRunNs.length === 0 ? h('tr', null, h('td', { colSpan: 5, className: 'px-1 py-1 text-slate-700' }, t('stem.angles.pg_table_empty', 'No rows yet.')))
              : pgRunNs.map(function(n) {
                var r = pgCleanRuns[n];
                return h('tr', { key: n }, h('td', { className: 'px-1 py-1 border-b border-slate-200 font-bold' }, String(n)), h('td', { className: 'px-1 py-1 border-b border-slate-200' }, pgName(n)),
                  h('td', { className: 'px-1 py-1 border-b border-slate-200' }, String(r.tri)), h('td', { className: 'px-1 py-1 border-b border-slate-200' }, r.sum + '°' + (r.revealed ? ' ' + t('stem.angles.pg_shown_mark', '(shown)') : '')),
                  h('td', { className: 'px-1 py-1 border-b border-slate-200' }, String(r.sum / 180)));
              }))),
          predLocked && (canClaim ? renderChoiceStep({ id: 'pg-claim', stateKey: 'pgClaim', legend: t('stem.angles.pg_claim_legend', 'Step 3. Claim: which rule fits all your evidence?'), options: PG_CLAIM_TXT, state: pgClaim, correct: 'c_n2', onPick: pgAnswerClaim })
            : h('p', { className: 'text-sm text-slate-700' }, fill(t('stem.angles.pg_need_rows', 'Record at least 3 different polygons before you make a claim. You have {k}.'), { k: pgRunNs.length }))),
          pgClaim && (pgClaim.ok || pgClaim.revealed) && h('p', { className: 'text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-900', 'data-angles-pg-reflect': 'true' },
            fill(predSupported ? t('stem.angles.pg_pred_yes', 'You predicted: “{p}” Your evidence supports that: each extra side adds one more triangle, 180°.') : t('stem.angles.pg_pred_no', 'You predicted: “{p}” Your evidence does not support that: the total grows by 180° for each extra side.'), { p: (PG_PRED.filter(function(o) { return o[0] === pgPred.pick; })[0] || ['', ''])[1] })),
          pgClaim && (pgClaim.ok || pgClaim.revealed) && renderChoiceStep({ id: 'pg-why', stateKey: 'pgWhy', legend: t('stem.angles.pg_why_legend', 'Step 4. Reasoning: why does the rule work?'), options: PG_WHY, state: pgWhy, correct: 'r_tri', onPick: pgAnswerWhy }),
          pgWhy && (pgWhy.ok || pgWhy.revealed) && h('button', { type: 'button', onClick: function() { upd({ pgMode: 'practice' }); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' }, t('stem.angles.pg_to_practice', '➡ Use the rule: practice'))
        );
      };

      // ── Exterior-angle walk: one full turn round any convex polygon ──
      var pgWalk = plain(d.pgWalk) && Number.isInteger(d.pgWalk.n) && d.pgWalk.n >= 3 && d.pgWalk.n <= 8 && isFinite(d.pgWalk.seed) ? d.pgWalk : { n: 5, seed: 777, step: 0 };
      var walkShape = ANG.makePolygon(ANG.seedRng(pgWalk.seed), pgWalk.n, PGW, PGH);
      var walkStep = Math.max(0, Math.min(pgWalk.n, Math.round(num(pgWalk.step, 0))));
      var walkRuns = plain(d.pgWalkRuns) ? d.pgWalkRuns : {};
      var walkRunNs = Object.keys(walkRuns).map(Number).filter(function(n) { return n >= 3 && n <= 8; }).sort(function(a, b) { return a - b; });
      var walkPred = plain(d.pgWalkPred) ? d.pgWalkPred : null;
      var walkWhy = plain(d.pgWalkWhy) ? d.pgWalkWhy : null;
      // Turn k happens at vertex (k + 1) mod n; the last one faces you the way you started.
      var walkTurns = []; for (var wk = 0; wk < walkStep; wk++) walkTurns.push(walkShape.exterior[(wk + 1) % pgWalk.n]);
      var walkTotal = walkTurns.reduce(function(s, v) { return s + v; }, 0);
      var WALK_PRED = [
        ['w_180', '180°'], ['w_360', '360°'],
        ['w_sum', t('stem.angles.pg_walk_pred_sum', 'The same as the interior angle sum')],
        ['w_dep', t('stem.angles.pg_walk_pred_dep', 'It depends on the shape')]
      ];
      var WALK_WHY = [
        ['ww_turn', t('stem.angles.pg_walkwhy_turn', 'You end up facing the way you started, so altogether you made exactly one full turn.')],
        ['ww_reg', t('stem.angles.pg_walkwhy_reg', 'Each exterior angle is 360° ÷ n.')],
        ['ww_int', t('stem.angles.pg_walkwhy_int', 'The interior angles add to 360°.')],
        ['ww_four', t('stem.angles.pg_walkwhy_four', 'Because a turn has four right angles.')]
      ];
      var WALK_MIS = {
        ww_reg: t('stem.angles.pg_walkm_reg', 'That is only true when every corner is the same. Your walks used uneven shapes and still made 360°.'),
        ww_int: t('stem.angles.pg_walkm_int', 'The interior angles add to (n − 2) × 180°, which is only 360° for four sides.'),
        ww_four: t('stem.angles.pg_walkm_four', 'A full turn is 360°, but that does not explain why your turns add up to one full turn.')
      };
      var walkNew = function(n) { upd({ pgWalk: { n: n, seed: Math.floor(Math.random() * 999999999) + 1, step: 0 } }); announce(fill(t('stem.angles.pg_walk_new_sr', 'A new polygon with {n} sides. You stand at A, facing B.'), { n: n })); };
      var walkGo = function() {
        if (!(walkPred && walkPred.locked) || walkStep >= pgWalk.n) return;
        var ns = walkStep + 1, turn = walkShape.exterior[ns % pgWalk.n], tot = walkTotal + turn;
        var patch = { pgWalk: { n: pgWalk.n, seed: pgWalk.seed, step: ns } };
        if (ns === pgWalk.n) { var wr = Object.assign({}, walkRuns); wr[pgWalk.n] = tot; patch.pgWalkRuns = wr; }
        upd(patch);
        announce(ns === pgWalk.n ? fill(t('stem.angles.pg_walk_end_sr', 'You turned {e}° and now face the way you started. Total turning: {tot}°.'), { e: turn, tot: tot })
          : fill(t('stem.angles.pg_walk_step_sr', 'At corner {v} you turned {e}°. Total so far: {tot}°.'), { v: vname(ns % pgWalk.n), e: turn, tot: tot }));
      };
      var renderWalkSvg = function() {
        var pts = walkShape.pts, n = pgWalk.n, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: PGW, height: PGH, fill: P.panel })];
        kids.push(h('polygon', { key: 'poly', points: pts.map(function(p) { return p.x + ',' + p.y; }).join(' '), fill: P.shadeA, stroke: P.muted, strokeWidth: 1.5 }));
        for (var k = 0; k < walkStep; k++) {
          var a = pts[k], b = pts[(k + 1) % n];
          kids.push(h('line', { key: 'w' + k, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: P.ray, strokeWidth: 3.5, strokeLinecap: 'round' }));
          // The turn at b: from the incoming heading (dashed extension) to the outgoing side.
          var c = pts[(k + 2) % n], hin = ANG.dirOf(a, b), hout = ANG.dirOf(b, c), ext = ANG.pt(b.x, b.y, 34, hin);
          kids.push(h('line', { key: 'x' + k, x1: b.x, y1: b.y, x2: ext.x, y2: ext.y, stroke: P.muted, strokeWidth: 1.5, strokeDasharray: '4,3' }));
          kids.push(h('path', { key: 'e' + k, d: arcPath(b.x, b.y, 20, hin, ANG.normDeg(hout - hin)), fill: 'none', stroke: P.hint, strokeWidth: 2 }));
          var lp = ANG.pt(b.x, b.y, 32, hin + ANG.normDeg(hout - hin) / 2);
          kids.push(h('text', { key: 'el' + k, x: lp.x, y: lp.y + 4, textAnchor: 'middle', fill: P.hint, style: { fontSize: 11, fontWeight: 800 } }, walkShape.exterior[(k + 1) % n] + '°'));
        }
        pts.forEach(function(p, i) { kids.push(h('circle', { key: 'v' + i, cx: p.x, cy: p.y, r: 4, fill: P.vertex })); kids.push(h('text', { key: 'l' + i, x: p.x, y: p.y - 9, textAnchor: 'middle', fill: P.ink, style: { fontSize: 12, fontWeight: 800 } }, vname(i))); });
        var here = pts[walkStep % n], hd = ANG.dirOf(pts[walkStep % n], pts[(walkStep + 1) % n]), tip = ANG.pt(here.x, here.y, 22, hd);
        kids.push(h('line', { key: 'me', x1: here.x, y1: here.y, x2: tip.x, y2: tip.y, stroke: P.draw, strokeWidth: 4, strokeLinecap: 'round' }));
        kids.push(h('circle', { key: 'mec', cx: here.x, cy: here.y, r: 7, fill: P.draw }));
        return h('svg', { viewBox: '0 0 ' + PGW + ' ' + PGH, role: 'img', 'data-angles-walk-svg': 'true', 'aria-label': fill(t('stem.angles.pg_walk_svg', 'A polygon with {n} sides. You have turned at {k} corners.'), { n: n, k: walkStep }),
          style: { width: '100%', height: 'auto', maxWidth: 480, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };
      var renderWalk = function() {
        var predLocked = !!(walkPred && walkPred.locked);
        return h('div', { className: 'space-y-3', 'data-angles-pg-walk': 'true' },
          h('p', { className: 'text-sm font-bold text-slate-900' }, t('stem.angles.pg_walk_q', 'Walk all the way round a polygon, turning at each corner. When you face the way you started, how much have you turned altogether?')),
          h('fieldset', { className: 'rounded-lg border border-violet-300 bg-violet-50 p-2', 'data-angles-step': 'walk-predict' },
            h('legend', { className: 'text-sm font-bold text-violet-900 px-1' }, t('stem.angles.pg_walk_pred_legend', 'Predict the total turn')),
            h('div', { className: 'flex flex-wrap gap-1.5' }, WALK_PRED.map(function(o) {
              var on = !!walkPred && walkPred.pick === o[0];
              return h('button', { key: o[0], type: 'button', disabled: predLocked, 'aria-pressed': on ? 'true' : 'false', onClick: function() { upd({ pgWalkPred: { pick: o[0], locked: false } }); }, style: { minHeight: 44 }, className: choiceBtnClass(on, false) }, o[1]);
            })),
            !predLocked && h('button', { type: 'button', disabled: !walkPred, onClick: function() { upd({ pgWalkPred: { pick: walkPred.pick, locked: true } }); announce(t('stem.angles.pg_pred_locked_walk', 'Prediction locked in. Start walking.')); }, style: { minHeight: 44 }, className: 'mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50' }, t('stem.angles.pg_lock_pred', '🔒 Lock in my prediction'))),
          predLocked && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_pg_sides', 'Number of sides') },
              [3, 4, 5, 6, 7, 8].map(function(n) { return subModeBtn('w' + n, pgWalk.n === n, fill(t('stem.angles.pg_sides_btn', '{n} sides'), { n: n }), function() { walkNew(n); }); })),
            h('div', { className: 'rounded-xl border-2 border-violet-200 bg-white p-2' }, renderWalkSvg()),
            h('p', { className: 'text-sm text-slate-900', 'data-angles-walk-desc': 'true' }, walkStep === 0 ? t('stem.angles.pg_walk_start', 'You stand at A, facing B. No turns yet.')
              : fill(t('stem.angles.pg_walk_so_far', 'Turns so far: {list}. Total: {tot}°.'), { list: degList(walkTurns), tot: walkTotal })),
            h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', onClick: walkGo, disabled: walkStep >= pgWalk.n, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50' }, t('stem.angles.pg_walk_go', '👣 Walk to the next corner and turn')),
              walkStep >= pgWalk.n && h('button', { type: 'button', onClick: function() { walkNew(pgWalk.n === 8 ? 3 : pgWalk.n + 1); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' }, t('stem.angles.pg_walk_again', '➡ Try another polygon'))),
            walkRunNs.length > 0 && h('table', { className: 'text-sm border-collapse bg-white', style: { overflowWrap: 'anywhere' }, 'data-angles-walk-table': 'true' },
              h('caption', { className: 'text-left text-xs font-black uppercase tracking-wide text-slate-800 py-1' }, t('stem.angles.pg_walk_table', 'Total turning')),
              h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left border-b border-slate-400 px-2' }, t('stem.angles.pg_col_n', 'Sides (n)')), h('th', { scope: 'col', className: 'text-left border-b border-slate-400 px-2' }, t('stem.angles.pg_col_turn', 'Total turn')))),
              h('tbody', null, walkRunNs.map(function(n) { return h('tr', { key: n }, h('td', { className: 'px-2 border-b border-slate-200' }, String(n)), h('td', { className: 'px-2 border-b border-slate-200' }, walkRuns[n] + '°')); }))),
            walkRunNs.length >= 2 && h('p', { className: 'text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-900' },
              fill(walkPred.pick === 'w_360' ? t('stem.angles.pg_walk_pred_yes', 'You predicted {p}. Your walks agree: every polygon turned 360°.') : t('stem.angles.pg_walk_pred_no', 'You predicted {p}. Your walks show something else: every polygon turned 360°.'), { p: (WALK_PRED.filter(function(o) { return o[0] === walkPred.pick; })[0] || ['', ''])[1] })),
            walkRunNs.length >= 2 && renderChoiceStep({ id: 'walk-why', stateKey: 'pgWalkWhy', legend: t('stem.angles.pg_walkwhy_legend', 'Why is the total always 360°?'), options: WALK_WHY, state: walkWhy, correct: 'ww_turn',
              onPick: function(id) { if (gradeChoice('pgWalkWhy', walkWhy, id, id === 'ww_turn', WALK_MIS[id] || '', t('stem.angles.pg_walkwhy_ok', 'Yes. And at every corner the interior and exterior angles make a straight line, 180°, so the interior angles add to n × 180° − 360° = (n − 2) × 180°.'), fill(t('stem.angles.pg_why_reveal', 'The reason: {r}'), { r: WALK_WHY[0][1] }), 'pg:walkwhy', 'exterior reason', 'walk_why_wrong')) upd({ pgInv: Object.assign({}, pgInv, { ext: true }) }); } }))
        );
      };

      // ── Which regular polygons tile? ──
      var tilePred = plain(d.pgTilePred) ? d.pgTilePred : { picks: {}, locked: false };
      var tilePicks = plain(tilePred.picks) ? tilePred.picks : {};
      var tileSel = ANG.TILE_NS.indexOf(d.pgTileSel) !== -1 ? d.pgTileSel : 5;
      var tileRows = plain(d.pgTileRows) ? d.pgTileRows : {};
      var tileRowNs = ANG.TILE_NS.filter(function(n) { return plain(tileRows[n]) && (tileRows[n].ok || tileRows[n].revealed); });
      var tileCur = plain(tileRows[tileSel]) ? tileRows[tileSel] : null;
      var tileClaim = plain(d.pgTileClaim) ? d.pgTileClaim : null;
      var tileMix = Array.isArray(d.pgMix) ? d.pgMix.filter(function(n) { return ANG.TILE_NS.indexOf(n) !== -1; }).slice(0, 6) : [];
      var TILE_CLAIM_TXT = [
        ['t_divides', t('stem.angles.pg_tclaim_div', 'A regular polygon tiles on its own only when its interior angle divides 360° exactly.')],
        ['t_even', t('stem.angles.pg_tclaim_even', 'Regular polygons with an even number of sides tile.')],
        ['t_all', t('stem.angles.pg_tclaim_all', 'Every regular polygon tiles.')],
        ['t_lt7', t('stem.angles.pg_tclaim_lt7', 'Regular polygons with fewer than 7 sides tile.')]
      ];
      var tileAnswer = function(ans) {
        if (angleSubmissionPending || !tilePred.locked || (tileCur && (tileCur.ok || tileCur.revealed))) return;
        angleSubmissionPending = true;
        var fit = ANG.tileFit(tileSel), ok = (ans === 'yes') === fit.tiles, tries = ((tileCur && tileCur.tries) || 0) + 1;
        var rows = Object.assign({}, tileRows);
        // Yes or no: the second try is certain, so only a first try earns XP.
        if (ok) { rows[tileSel] = { pick: ans, ok: true, tries: tries }; upd({ pgTileRows: rows }); if (tries === 1) creditOnce('pg:tile:' + tileSel, 3, 'tiling evidence'); recordCorrect(null); announce(tileFact(fit)); return; }
        recordWrong();
        var code = fit.tiles ? 'tile_missed' : 'tile_gap';
        tallyMiss('tiling', code, tileSel + '-gon');
        rows[tileSel] = { pick: ans, ok: false, tries: tries };
        upd({ pgTileRows: rows });
        announce(tileMis(fit) + ' ' + tryMoreText(tries));
      };
      var revealTile = function() {
        if (!tileCur || tileCur.ok || tileCur.revealed || (tileCur.tries || 0) < 2 || !allowReveal) return;
        var rows = Object.assign({}, tileRows);
        rows[tileSel] = Object.assign({}, tileCur, { revealed: true });
        upd({ pgTileRows: rows });
        announce(tileFact(ANG.tileFit(tileSel)));
      };
      var tileFact = function(fit) {
        return fit.tiles ? fill(t('stem.angles.pg_tile_yes', 'Yes: {k} copies of {a}° make exactly 360°, with no gap and no overlap.'), { k: fit.copies, a: fmt1(fit.interior) })
          : fill(t('stem.angles.pg_tile_no', 'No: {k} copies of {a}° make {u}°, leaving a {g}° gap, and one more copy would overlap by {o}°.'), { k: fit.copies, a: fmt1(fit.interior), u: fmt1(fit.copies * fit.interior), g: fmt1(fit.gap), o: fmt1(fit.overlap) });
      };
      var tileMis = function(fit) {
        return fit.tiles ? t('stem.angles.pg_tilem_missed', 'Look at the copies around the point again: do they close up with no gap?')
          : t('stem.angles.pg_tilem_gap', 'Close is not enough. Copies around a point must make exactly 360°: count how many fit and look for a gap.');
      };
      var renderTileSvg = function(n) {
        var W = 320, H = 240, O = { x: 160, y: 120 }, fit = ANG.tileFit(n), a = fit.interior, e = 360 / n, s = n <= 4 ? 70 : n <= 6 ? 60 : n <= 9 ? 44 : 34;
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })];
        var copy = function(j, extra) {
          var pts = [O], hd = j * a, cur = O;
          for (var k = 0; k < n - 1; k++) { cur = ANG.pt(cur.x, cur.y, s, hd); pts.push(cur); hd += e; }
          return h('polygon', Object.assign({ key: 'c' + j, points: pts.map(function(p) { return p.x + ',' + p.y; }).join(' '), fill: j % 2 ? P.shadeB : P.shadeA, stroke: P.line, strokeWidth: 1.6 }, extra || {}));
        };
        for (var j = 0; j < fit.copies; j++) kids.push(copy(j));
        if (!fit.tiles) kids.push(copy(fit.copies, { fill: 'none', stroke: P.warn, strokeWidth: 2, strokeDasharray: '5,4' }));
        kids.push(h('circle', { key: 'o', cx: O.x, cy: O.y, r: 4, fill: P.vertex }));
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'data-angles-tile-svg': n, 'aria-label': fill(t('stem.angles.pg_tile_svg', 'Copies of a regular polygon with {n} sides fitted around one point.'), { n: n }),
          style: { width: '100%', height: 'auto', maxWidth: 420, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };
      var renderTiling = function() {
        var fit = ANG.tileFit(tileSel), curDone = !!(tileCur && (tileCur.ok || tileCur.revealed));
        var mixSum = ANG.vertexSum(tileMix);
        return h('div', { className: 'space-y-3', 'data-angles-pg-tile': 'true' },
          h('p', { className: 'text-sm font-bold text-slate-900' }, t('stem.angles.pg_tile_q', 'Which regular polygons can cover a floor on their own, with no gaps and no overlaps?')),
          h('fieldset', { className: 'rounded-lg border border-violet-300 bg-violet-50 p-2', 'data-angles-step': 'tile-predict' },
            h('legend', { className: 'text-sm font-bold text-violet-900 px-1' }, t('stem.angles.pg_tile_pred_legend', 'Predict: mark every polygon you think will tile')),
            h('div', { className: 'flex flex-wrap gap-1.5' }, ANG.TILE_NS.map(function(n) {
              var on = !!tilePicks[n];
              return h('button', { key: n, type: 'button', disabled: !!tilePred.locked, 'aria-pressed': on ? 'true' : 'false', onClick: function() { var pk = Object.assign({}, tilePicks); if (pk[n]) delete pk[n]; else pk[n] = true; upd({ pgTilePred: { picks: pk, locked: false } }); }, style: { minHeight: 44 }, className: choiceBtnClass(on, false) }, regName(n));
            })),
            !tilePred.locked && h('button', { type: 'button', onClick: function() { upd({ pgTilePred: { picks: tilePicks, locked: true } }); announce(t('stem.angles.pg_tile_locked', 'Prediction locked in. Test each polygon.')); }, style: { minHeight: 44 }, className: 'mt-2 px-4 py-2 rounded-lg text-sm font-bold bg-violet-700 text-white hover:bg-violet-800' }, t('stem.angles.pg_lock_pred', '🔒 Lock in my prediction'))),
          tilePred.locked && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_pg_tile_pick', 'Polygon to test') },
              ANG.TILE_NS.map(function(n) { return subModeBtn('t' + n, tileSel === n, regName(n), function() { upd({ pgTileSel: n }); }); })),
            h('div', { className: 'rounded-xl border-2 border-violet-200 bg-white p-2' }, renderTileSvg(tileSel)),
            h('p', { className: 'text-sm text-slate-900', 'data-angles-tile-desc': 'true' }, fill(t('stem.angles.pg_tile_desc', 'Each corner of a regular {name} is {a}°. {k} copies fit round the point, using {u}° of the 360°.'), { name: regName(tileSel), a: fmt1(fit.interior), k: fit.copies, u: fmt1(fit.copies * fit.interior) }) + (fit.tiles ? '' : ' ' + t('stem.angles.pg_tile_desc_next', 'The dashed outline shows where one more copy would go.'))),
            h('div', { className: 'flex flex-wrap gap-2 items-center', role: 'group', 'aria-label': fill(t('stem.angles.a11y_pg_tile_ans', 'Can a regular {name} tile on its own?'), { name: regName(tileSel) }) },
              h('span', { className: 'text-sm font-bold text-slate-800' }, fill(t('stem.angles.a11y_pg_tile_ans', 'Can a regular {name} tile on its own?'), { name: regName(tileSel) })),
              [['yes', t('stem.angles.yes', 'Yes')], ['no', t('stem.angles.no', 'No')]].map(function(o) {
                var right = curDone && (o[0] === 'yes') === fit.tiles;
                return h('button', { key: o[0], type: 'button', disabled: curDone, onClick: function() { tileAnswer(o[0]); }, style: { minHeight: 44, minWidth: 64 }, className: choiceBtnClass(tileCur && tileCur.pick === o[0] && !right, right) }, o[1]);
              })),
            tileCur && h('p', { role: 'status', className: resultClass(!!tileCur.ok) }, tileCur.ok ? tileFact(fit) : tileMis(fit) + ' ' + (tileCur.revealed ? tileFact(fit) : tryMoreText(tileCur.tries || 0))),
            tileCur && !tileCur.ok && afterTwo('tile', tileCur.tries || 0, curDone, revealTile),
            tileRowNs.length > 0 && h('table', { className: 'w-full text-sm border-collapse bg-white', style: { overflowWrap: 'anywhere' }, 'data-angles-tile-table': 'true' },
              h('caption', { className: 'text-left text-xs font-black uppercase tracking-wide text-slate-800 py-1' }, t('stem.angles.pg_table_caption', 'Your evidence')),
              h('thead', null, h('tr', null, [t('stem.angles.pg_col_name', 'Polygon'), t('stem.angles.pg_col_int', 'Each angle'), t('stem.angles.pg_col_fit', '360° ÷ angle'), t('stem.angles.pg_col_tiles', 'Tiles?')].map(function(c, i) { return h('th', { key: i, scope: 'col', className: 'text-left border-b border-slate-400 px-1' }, c); }))),
              h('tbody', null, tileRowNs.map(function(n) { var f = ANG.tileFit(n); return h('tr', { key: n }, h('td', { className: 'px-1 border-b border-slate-200' }, regName(n)), h('td', { className: 'px-1 border-b border-slate-200' }, fmt1(f.interior) + '°'), h('td', { className: 'px-1 border-b border-slate-200' }, String(Math.round(f.quotient * 100) / 100)), h('td', { className: 'px-1 border-b border-slate-200 font-bold' }, f.tiles ? t('stem.angles.yes', 'Yes') : t('stem.angles.no', 'No'))); }))),
            tileRowNs.length >= 4 ? renderChoiceStep({ id: 'tile-claim', stateKey: 'pgTileClaim', legend: t('stem.angles.pg_tclaim_legend', 'Claim: which statement fits your evidence?'), options: TILE_CLAIM_TXT, state: tileClaim, correct: 't_divides',
              onPick: function(id) {
                var cc = ANG.tileClaimCheck(id, (function() { var o = {}; tileRowNs.forEach(function(n) { o[n] = true; }); return o; })());
                var wrong = cc.fits ? '' : cc.tested ? fill(t('stem.angles.pg_tclaim_breaks', 'Your {name} row does not fit that statement.'), { name: regName(cc.breaks) }) : fill(t('stem.angles.pg_tclaim_untested', 'Test the {name} before you decide: it does not fit that statement.'), { name: regName(cc.breaks) });
                if (gradeChoice('pgTileClaim', tileClaim, id, cc.fits, wrong, t('stem.angles.pg_tclaim_ok', 'Yes: only the triangle (60°), the square (90°) and the hexagon (120°) divide 360° exactly.'), t('stem.angles.pg_tclaim_reveal', 'The statement that fits: a regular polygon tiles on its own only when its interior angle divides 360° exactly.'), 'pg:tileclaim', 'tiling claim', 'tile_claim_wrong')) upd({ pgInv: Object.assign({}, pgInv, { tile: true }) });
              } })
              : h('p', { className: 'text-sm text-slate-700' }, fill(t('stem.angles.pg_tile_need', 'Test at least 4 polygons before you make a claim. You have tested {k}.'), { k: tileRowNs.length })),
            tileClaim && (tileClaim.ok || tileClaim.revealed) && h('p', { className: 'text-sm rounded-lg border border-slate-300 bg-white p-2 text-slate-900', 'data-angles-tile-reflect': 'true' },
              (function() {
                var right = ANG.TILE_NS.filter(function(n) { return !!tilePicks[n] === ANG.tileFit(n).tiles; }).length;
                return fill(t('stem.angles.pg_tile_reflect', 'Your prediction was right for {r} of {total} polygons. The ones that tile: triangle, square and hexagon.'), { r: right, total: ANG.TILE_NS.length });
              })())),
          h('details', { className: 'rounded-lg border border-slate-300 bg-white p-2' },
            h('summary', { className: 'font-bold cursor-pointer text-sm text-slate-900', style: { minHeight: 24 } }, t('stem.angles.pg_mix_title', 'Going further: mix polygons at one point')),
            h('p', { className: 'text-xs text-slate-800 mt-1' }, t('stem.angles.pg_mix_how', 'Add regular polygons round one point. They can meet there when their angles add to exactly 360° (for example two octagons and a square).')),
            h('div', { className: 'flex flex-wrap gap-1.5 mt-1' },
              [3, 4, 6, 8, 12].map(function(n) { return h('button', { key: n, type: 'button', disabled: tileMix.length >= 6, onClick: function() { upd({ pgMix: tileMix.concat([n]) }); }, style: { minHeight: 44 }, className: 'px-2 py-1 rounded-lg text-xs font-bold border border-slate-600 bg-white text-slate-900 disabled:opacity-50' }, fill(t('stem.angles.pg_mix_add', '+ {name}'), { name: regName(n) })); }),
              h('button', { type: 'button', disabled: !tileMix.length, onClick: function() { upd({ pgMix: tileMix.slice(0, -1) }); }, style: { minHeight: 44 }, className: 'px-2 py-1 rounded-lg text-xs font-bold border border-slate-600 bg-white text-slate-900 disabled:opacity-50' }, t('stem.angles.pg_mix_remove', '↶ Remove last'))),
            h('p', { role: 'status', className: 'text-sm mt-1 text-slate-900', 'data-angles-mix': ANG.vertexFits(tileMix) ? 'fits' : 'no' },
              tileMix.length === 0 ? t('stem.angles.pg_mix_empty', 'No polygons yet.')
                : fill(ANG.vertexFits(tileMix) ? t('stem.angles.pg_mix_fits', '{list}: {sum}°. These meet exactly at one point.') : mixSum > 360 ? t('stem.angles.pg_mix_over', '{list}: {sum}°. Too much: they overlap.') : t('stem.angles.pg_mix_under', '{list}: {sum}°. There is still a gap.'),
                  { list: tileMix.map(regName).join(' + '), sum: fmt1(mixSum) })))
        );
      };

      // ── Polygon practice: generated, graded, never runs out ──
      var pgKinds = ANG.PG_KINDS[level] || ANG.PG_KINDS.g57;
      var pgpKind = (d.pgpKind === 'mix' || pgKinds.indexOf(d.pgpKind) !== -1) ? d.pgpKind : 'mix';
      var validPgTask = function(p) { return plain(p) && typeof p.id === 'string' && pgKinds.indexOf(p.kind) !== -1 && isFinite(p.n) && isFinite(p.answer) && (p.kind !== 'missing' || (Array.isArray(p.angles) && p.angles.length === p.n && isFinite(p.which) && isFinite(p.seed))); };
      var pgpTask = validPgTask(d.pgpT) ? d.pgpT : ANG.makePolyTask(pgpKind === 'mix' ? pgKinds[0] : pgpKind, seeded(TASK_SEED.pgp), level);
      var pgpSt = taskState('pgp', pgpTask);
      var pgKnown = function(p) { var s = 0; p.angles.forEach(function(a, i) { if (i !== p.which) s += a; }); return s; };
      var PGP_KIND_LABEL = { mix: t('stem.angles.kind_mix', 'Mixed'), sum: t('stem.angles.pgk_sum', 'Angle sum'), sides: t('stem.angles.pgk_sides', 'Number of sides'), missing: t('stem.angles.pgk_missing', 'Missing angle'), regular: t('stem.angles.pgk_regular', 'Regular polygon'), ext: t('stem.angles.pgk_ext', 'Exterior angle'), extn: t('stem.angles.pgk_extn', 'Sides from exterior') };
      var pgpPrompt = function(p) {
        if (p.kind === 'sides') return fill(t('stem.angles.pgp_sides', 'The interior angles of a polygon add up to {s}°. How many sides does it have?'), { s: p.s });
        if (p.kind === 'missing') return fill(t('stem.angles.pgp_missing', 'A polygon with {n} sides has angles of {list} and x. Find x.'), { n: p.n, list: degList(p.angles.filter(function(_, i) { return i !== p.which; })) });
        if (p.kind === 'regular') return fill(t('stem.angles.pgp_regular', 'Find each interior angle of a regular polygon with {n} sides.'), { n: p.n });
        if (p.kind === 'ext') return fill(t('stem.angles.pgp_ext', 'Find each exterior angle of a regular polygon with {n} sides.'), { n: p.n });
        if (p.kind === 'extn') return fill(t('stem.angles.pgp_extn', 'Each exterior angle of a regular polygon is {e}°. How many sides does it have?'), { e: fmt1(p.e) });
        return fill(t('stem.angles.pgp_sum', 'A polygon has {n} sides. What do its interior angles add up to?'), { n: p.n });
      };
      var pgpHint = function(p, lvl) {
        if (lvl === 1) {
          if (p.kind === 'sides') return t('stem.angles.pgph1_sides', 'Each triangle inside the polygon brings 180°.');
          if (p.kind === 'missing') return t('stem.angles.pgph1_missing', 'Find the total first: (n − 2) × 180°.');
          if (p.kind === 'regular') return t('stem.angles.pgph1_regular', 'Find the total first, then share it equally between the corners.');
          if (p.kind === 'ext' || p.kind === 'extn') return t('stem.angles.pgph1_ext', 'Walking once round any polygon turns you through 360° in total.');
          return t('stem.angles.pgph1_sum', 'From one vertex, diagonals cut a polygon with n sides into n − 2 triangles.');
        }
        if (p.kind === 'sides') return fill(t('stem.angles.pgph2_sides', 'Triangles = {s} ÷ 180. The polygon has 2 more sides than triangles.'), { s: p.s });
        if (p.kind === 'missing') return fill(t('stem.angles.pgph2_missing', 'The total is {total}°. Subtract the angles you know, which add to {known}°.'), { total: ANG.polySum(p.n), known: pgKnown(p) });
        if (p.kind === 'regular') return fill(t('stem.angles.pgph2_regular', 'The total is {total}°. Divide it by {n}.'), { total: ANG.polySum(p.n), n: p.n });
        if (p.kind === 'ext') return fill(t('stem.angles.pgph2_ext', 'Share 360° between {n} equal corners: 360 ÷ {n}.'), { n: p.n });
        if (p.kind === 'extn') return fill(t('stem.angles.pgph2_extn', 'How many turns of {e}° make 360°? Work out 360 ÷ {e}.'), { e: fmt1(p.e) });
        return fill(t('stem.angles.pgph2_sum', 'Work out ({n} − 2) × 180.'), { n: p.n });
      };
      var pgpExplain = function(p, head) {
        var s = ANG.polySum(p.n);
        var body = p.kind === 'sides' ? fill(t('stem.angles.pgps_sides', '{s}° ÷ 180° = {t} triangles, and a polygon has 2 more sides than triangles, so it has {n} sides.'), { s: p.s, t: p.s / 180, n: p.n })
          : p.kind === 'missing' ? fill(t('stem.angles.pgps_missing', 'A polygon with {n} sides has angles adding to {total}°. The known angles add to {known}°, so x = {total}° − {known}° = {x}°.'), { n: p.n, total: s, known: pgKnown(p), x: p.answer })
          : p.kind === 'regular' ? fill(t('stem.angles.pgps_regular', 'A regular polygon with {n} sides has angles adding to {total}°, so each is {total}° ÷ {n} = {x}°.'), { n: p.n, total: s, x: fmt1(p.answer) })
          : p.kind === 'ext' ? fill(t('stem.angles.pgps_ext', 'The exterior angles add to 360°, so each of the {n} equal ones is 360° ÷ {n} = {x}°.'), { n: p.n, x: fmt1(p.answer) })
          : p.kind === 'extn' ? fill(t('stem.angles.pgps_extn', 'If each exterior angle is {e}°, there are 360° ÷ {e}° = {n} of them, so {n} sides.'), { e: fmt1(p.e), n: p.n })
          : fill(t('stem.angles.pgps_sum', 'A polygon with {n} sides splits into {t} triangles, so its angles add to {t} × 180° = {s}°.'), { n: p.n, t: p.n - 2, s: s });
        return fill(head, { s: body });
      };
      var PGP_MIS = {
        n180: t('stem.angles.pgpm_n180', 'You multiplied 180° by the number of sides. From one vertex a polygon only splits into n − 2 triangles.'),
        sum360: t('stem.angles.pgpm_360', '360° is the total for four-sided shapes only. More sides means more triangles inside.'),
        sides_forgot_2: t('stem.angles.pgpm_forgot2', 'That is the number of triangles. A polygon has 2 more sides than the triangles it splits into.'),
        sides_off_one: t('stem.angles.pgpm_off1', 'Check again: triangles = sum ÷ 180, and sides = triangles + 2.'),
        gave_sum: t('stem.angles.pzm_gave_sum', 'That is the total of the angles you know. Subtract it from the whole to find x.'),
        reg_gave_total: t('stem.angles.pgpm_total', 'That is the total of all the angles. Share it equally between the corners.'),
        int_ext_swap: t('stem.angles.pgpm_swap', 'You mixed up the interior and exterior angles. At each corner, interior + exterior = 180°.'),
        ext_gave_total: t('stem.angles.pgpm_exttotal', '360° is the total of all the exterior angles. Share it between the corners.'),
        extn_used_180: t('stem.angles.pgpm_ext180', 'The exterior angles add to 360°, not 180°.'),
        arith: t('stem.angles.pzm_arith', 'Your method looks right but the arithmetic is off. Check your subtraction.'),
        off: t('stem.angles.pgpm_off', 'Not quite. Start from the triangles: a polygon with n sides has (n − 2) × 180° inside.')
      };
      var renderPgpSvg = function(p) {
        var W = 320, H = 230, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })];
        var n = p.n > 12 ? 12 : p.n, shape = p.kind === 'missing' ? ANG.makePolygon(ANG.seedRng(p.seed), p.n, W, H) : ANG.makePolygon(ANG.seedRng(7), n, W, H, true);
        var pts = shape.pts, cxm = pts.reduce(function(s, q) { return s + q.x; }, 0) / pts.length, cym = pts.reduce(function(s, q) { return s + q.y; }, 0) / pts.length;
        kids.push(h('polygon', { key: 'p', points: pts.map(function(q) { return q.x + ',' + q.y; }).join(' '), fill: P.shadeA, stroke: P.line, strokeWidth: 2.5 }));
        if (p.kind === 'missing') pts.forEach(function(q, i) {
          var dx = cxm - q.x, dy = cym - q.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
          kids.push(h('text', { key: 'a' + i, x: q.x + dx / dl * 24, y: q.y + dy / dl * 24 + 4, textAnchor: 'middle', fill: i === p.which ? P.unknown : P.given, style: { fontSize: 12, fontWeight: 800 } }, i === p.which ? (tsLocked(pgpSt) ? p.answer + '°' : 'x') : p.angles[i] + '°'));
        });
        if (p.kind === 'extn' && p.n > 12) kids.push(h('text', { key: 'note', x: W / 2, y: H - 8, textAnchor: 'middle', fill: P.muted, style: { fontSize: 11 } }, t('stem.angles.pgp_not_to_scale', 'Not drawn to scale')));
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': pgpDescribe(p), style: { width: '100%', height: 'auto', maxWidth: 420, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };
      var pgpDescribe = function(p) {
        if (p.kind === 'missing') return fill(t('stem.angles.pgpd_missing', 'Diagram: a polygon with {n} sides. Its corners are labelled {list}, going round.'), { n: p.n, list: p.angles.map(function(a, i) { return i === p.which ? 'x' : a + '°'; }).join(', ') });
        if (p.kind === 'sum' || p.kind === 'sides') return t('stem.angles.pgpd_any', 'Diagram: a polygon. Any polygon with the same number of sides has the same angle sum.');
        return t('stem.angles.pgpd_regular', 'Diagram: a regular polygon, with all sides and all angles equal.');
      };
      var pgpCfg = {
        diagnose: ANG.diagnosePolyTask, solvedKey: 'pgSolved', kindOf: function(p) { return p.kind; }, reason: 'polygon practice', tallyKind: 'polygon', offCode: 'pg_off',
        make: function(k, rng) { var kind = k === 'mix' ? pgKinds[Math.floor(rnd01(rng) * pgKinds.length)] : k; return ANG.makePolyTask(kind, rng, level); },
        prompt: pgpPrompt, hintText: pgpHint, answerText: function(p) { return pgpAnswerText(p); },
        worked: function(p) { return pickWorked(function(r) { return ANG.makePolyTask(p.kind, r, level); }, 301, 13, p, function(ex) { return pgpExplain(ex, t('stem.angles.pgp_worked', 'Worked example: {s}')); }, pgpAnswerText(p)); },
        setup: function(p) { return pgpHint(p, 2); },
        solution: function(p) { return pgpExplain(p, t('stem.angles.pgp_solution', 'Solution: {s}')); },
        okText: function(p) { return fill(t('stem.angles.pgp_ok', 'Correct: {x}.'), { x: pgpAnswerText(p) }); },
        revealText: function(p) { return fill(t('stem.angles.pgp_reveal', 'The answer is {x}.'), { x: pgpAnswerText(p) }); },
        nanText: function() { return t('stem.angles.pzm_nan', 'Type a number, for example 35.'); },
        misText: function(code) { return PGP_MIS[code] || PGP_MIS.off; },
        // "How many sides?" drew a polygon with that many sides: no picture until the item is done.
        diagram: function(p, locked) { return (p.kind === 'sides' || p.kind === 'extn') && !locked ? null : renderPgpSvg(p); },
        describe: function(p, locked) { return (p.kind === 'sides' || p.kind === 'extn') && !locked ? null : pgpDescribe(p); },
        inputLabel: t('stem.angles.pgp_label', 'Your answer:'), checkLabel: t('stem.angles.check_puzzle', 'Check my answer'),
        kinds: ['mix'].concat(pgKinds).map(function(k) { return [k, PGP_KIND_LABEL[k] || k]; }), kindsLabel: t('stem.angles.a11y_pgp_kinds', 'Question type'), kindSel: pgpKind,
        onKind: function(k) { upd({ pgpKind: k }); newTask(pgpSt, pgpCfg, k); }, nextKind: function() { return pgpKind; }
      };
      var pgpAnswerText = function(p) { return (p.kind === 'sides' || p.kind === 'extn') ? fill(t('stem.angles.pgp_n_sides', '{n} sides'), { n: p.answer }) : fmt1(p.answer) + '°'; };
      var rnd01 = ANG.rnd;

      var renderPolygonsTab = function() {
        return h('div', { className: 'space-y-3', 'data-angles-polygons': pgMode },
          h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_pg_modes', 'Polygon activities') },
            subModeBtn('sum', pgMode === 'sum', t('stem.angles.pg_mode_sum', '🔺 Angle sum investigation'), function() { upd('pgMode', 'sum'); }),
            subModeBtn('ext', pgMode === 'ext', t('stem.angles.pg_mode_ext', '👣 Exterior angle walk'), function() { upd('pgMode', 'ext'); }),
            subModeBtn('tile', pgMode === 'tile', t('stem.angles.pg_mode_tile', '🧱 Which polygons tile?'), function() { upd('pgMode', 'tile'); }),
            subModeBtn('practice', pgMode === 'practice', t('stem.angles.pg_mode_practice', '✏️ Practice'), function() { upd('pgMode', 'practice'); })),
          pgMode === 'sum' ? renderSumInvestigation() : pgMode === 'ext' ? renderWalk() : pgMode === 'tile' ? renderTiling() : renderTaskCard(pgpSt, pgpCfg)
        );
      };


      // ══════════════════════════════════════════════════════════════
      // ── Circles tab: inscribed angle, angle in a semicircle, cyclic
      //    quadrilateral (predict, then move a point and watch), unit circle ──
      // ══════════════════════════════════════════════════════════════
      var CW = 360, CH = 300, CO = { x: 180, y: 150 }, CR = 115;
      var cpt = function(deg) { return ANG.pt(CO.x, CO.y, CR, deg); };
      var ciMode = ['inscribed', 'semi', 'cyclic', 'unit'].indexOf(d.ciMode) !== -1 ? d.ciMode : 'inscribed';
      var ciKind = ciMode === 'unit' ? 'inscribed' : ciMode;
      var validCiTask = function(p) {
        if (!plain(p) || typeof p.id !== 'string' || p.kind !== ciKind || !isFinite(p.answer) || !isFinite(p.given)) return false;
        if (p.kind === 'cyclic') return Array.isArray(p.pos) && p.pos.length === 4 && p.pos.every(isFinite) && Array.isArray(p.angles) && p.angles.length === 4 && (p.givenIdx === 0 || p.givenIdx === 1);
        return isFinite(p.a) && isFinite(p.b) && isFinite(p.p) && typeof p.ask === 'string';
      };
      var citTask = validCiTask(d.citT) ? d.citT : ANG.makeCircleTask(ciKind, seeded(TASK_SEED.cit + ciKind.length), level);
      var citSt = taskState('cit', citTask);
      var citLocked = tsLocked(citSt);
      // Positions while exploring after the check (degrees on the circle).
      var ciLive = plain(d.ciLive) && d.ciLive.id === citTask.id ? d.ciLive : null;
      var ciPts = (function() {
        if (citTask.kind === 'cyclic') { var ps = ciLive && Array.isArray(ciLive.pos) && ciLive.pos.length === 4 && ciLive.pos.every(isFinite) ? ciLive.pos : citTask.pos; return { pos: ps.slice() }; }
        var src = ciLive && isFinite(ciLive.a) && isFinite(ciLive.b) && isFinite(ciLive.p) ? ciLive : citTask;
        return { a: src.a, b: src.b, p: src.p };
      })();
      var ciMoveOpts = citTask.kind === 'inscribed' ? ['p', 'b'] : citTask.kind === 'semi' ? ['p'] : ['0', '1', '2', '3'];
      var ciMove = ciMoveOpts.indexOf(d.ciMove) !== -1 ? d.ciMove : ciMoveOpts[0];
      var ciPointName = function(k) { return k === 'p' ? 'P' : k === 'b' ? 'B' : k === 'a' ? 'A' : 'ABCD'.charAt(Number(k)); };
      var ciDegOf = function(k) { return citTask.kind === 'cyclic' ? ciPts.pos[Number(k)] : ciPts[k]; };
      var ciTryMove = function(k, deg) {
        if (!citLocked) return false;
        var nd = Math.round(ANG.normDeg(deg)), next;
        if (citTask.kind === 'cyclic') {
          var i = Number(k), prev = ciPts.pos[(i + 3) % 4], nxt = ciPts.pos[(i + 1) % 4];
          var rel = ANG.normDeg(nd - prev), span = ANG.normDeg(nxt - prev);
          if (!(rel > 8 && rel < span - 8)) return false;
          var pos = ciPts.pos.slice(); pos[i] = nd;
          next = { id: citTask.id, pos: pos };
        } else {
          var others = ['a', 'b', 'p'].filter(function(x) { return x !== k; }).map(function(x) { return ciPts[x]; });
          if (others.some(function(o) { return ANG.between(o, nd) < (k === 'b' ? 10 : 4); })) return false;
          next = Object.assign({ id: citTask.id, a: ciPts.a, b: ciPts.b, p: ciPts.p }); next[k] = nd;
        }
        upd({ ciLive: next, citT: citTask });
        return true;
      };
      var ciMeasure = function(pts) {
        if (citTask.kind === 'cyclic') {
          var V = pts.pos.map(cpt), ang = V.map(function(v, i) { return Math.round(ANG.angleAt(v, V[(i + 3) % 4], V[(i + 1) % 4]) * 10) / 10; });
          return { angles: ang };
        }
        var A = cpt(pts.a), B = cpt(pts.b), Pp = cpt(pts.p);
        var out = { apb: Math.round(ANG.angleAt(Pp, A, B) * 10) / 10 };
        if (citTask.kind === 'inscribed') out.arc = Math.round(ANG.arcOpposite(pts.a, pts.b, pts.p) * 10) / 10;
        else { out.pab = Math.round(ANG.angleAt(A, Pp, B) * 10) / 10; out.pba = Math.round(ANG.angleAt(B, Pp, A) * 10) / 10; }
        return out;
      };
      var ciReadout = function() {
        var m = ciMeasure(ciPts);
        if (citTask.kind === 'cyclic') {
          var a = m.angles;
          return fill(t('stem.angles.ci_read_cyc', 'Measured: ∠A = {a}°, ∠B = {b}°, ∠C = {c}°, ∠D = {d}°. Opposite pairs: ∠A + ∠C = {ac}° and ∠B + ∠D = {bd}°.'), { a: a[0], b: a[1], c: a[2], d: a[3], ac: Math.round((a[0] + a[2]) * 10) / 10, bd: Math.round((a[1] + a[3]) * 10) / 10 });
        }
        if (citTask.kind === 'semi') return fill(t('stem.angles.ci_read_semi', 'Measured: ∠APB = {apb}°, ∠PAB = {pab}°, ∠PBA = {pba}°.'), m);
        return fill(t('stem.angles.ci_read_insc', 'Measured: the inscribed angle ∠APB = {apb}°. The arc AB on the far side from P has a central angle of {arc}°, twice as big.'), m);
      };
      var ciKey = function(e) {
        var step = e.shiftKey ? 10 : 2, dd = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') dd = step; else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') dd = -step; else return;
        e.preventDefault();
        if (ciTryMove(ciMove, ciDegOf(ciMove) + dd)) {
          var np = Object.assign({}, ciPts);
          if (citTask.kind === 'cyclic') { np.pos = ciPts.pos.slice(); np.pos[Number(ciMove)] = Math.round(ANG.normDeg(ciDegOf(ciMove) + dd)); } else np[ciMove] = Math.round(ANG.normDeg(ciDegOf(ciMove) + dd));
          var save = ciPts; ciPts = np; var msg = ciReadout(); ciPts = save;
          announce(fill(t('stem.angles.ci_moved_sr', '{pt} is at about {clock}. {read}'), { pt: ciPointName(ciMove), clock: clockText(ANG.normDeg(ciDegOf(ciMove) + dd)), read: msg }));
        } else announce(t('stem.angles.ci_blocked_sr', 'That point cannot move any further that way.'));
      };
      var startCiDrag = function(e) {
        if (!citLocked) return;
        beginDrag(e, function(p) { ciTryMove(ciMove, Math.atan2(-(p.y - CO.y), p.x - CO.x) * 180 / Math.PI); });
      };
      var renderCircleSvg = function(task, locked) {
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: CW, height: CH, fill: P.panel }), h('circle', { key: 'c', cx: CO.x, cy: CO.y, r: CR, fill: 'none', stroke: P.line, strokeWidth: 2 })];
        var lbl = function(key, pt, txt, col, off) { var dx = pt.x - CO.x, dy = pt.y - CO.y, dl = Math.sqrt(dx * dx + dy * dy) || 1, o = off || 16; return h('text', { key: key, x: pt.x + dx / dl * o, y: pt.y + dy / dl * o + 5, textAnchor: 'middle', fill: col || P.ink, style: { fontSize: 14, fontWeight: 800 } }, txt); };
        var angLbl = function(key, at, d1, d2, txt, col) {
          var mid = ANG.normDeg(d1 + ANG.normDeg(d2 - d1) / 2); if (ANG.normDeg(d2 - d1) > 180) mid = ANG.normDeg(mid + 180);
          var q = ANG.pt(at.x, at.y, 30, mid);
          return h('text', { key: key, x: q.x, y: q.y + 4, textAnchor: 'middle', fill: col, style: { fontSize: 12.5, fontWeight: 800 } }, txt);
        };
        var m = ciMeasure(ciPts), handleKey = ciMove, handleDeg = ciDegOf(ciMove);
        if (task.kind === 'cyclic') {
          var V = ciPts.pos.map(cpt);
          kids.push(h('polygon', { key: 'q', points: V.map(function(v) { return v.x + ',' + v.y; }).join(' '), fill: P.shadeA, stroke: P.ray, strokeWidth: 2.5 }));
          V.forEach(function(v, i) {
            kids.push(h('circle', { key: 'v' + i, cx: v.x, cy: v.y, r: 4, fill: P.vertex }));
            kids.push(lbl('l' + i, v, 'ABCD'.charAt(i)));
            var d1 = ANG.dirOf(v, V[(i + 3) % 4]), d2 = ANG.dirOf(v, V[(i + 1) % 4]);
            var txt = locked ? m.angles[i] + '°' : i === task.givenIdx ? task.given + '°' : i === task.askIdx ? '?' : '';
            if (txt) kids.push(angLbl('al' + i, v, Math.min(d1, d2) === d1 ? d1 : d2, Math.min(d1, d2) === d1 ? d2 : d1, txt, i === task.askIdx && !locked ? P.unknown : P.hint));
          });
        } else {
          var A = cpt(ciPts.a), B = cpt(ciPts.b), Pp = cpt(ciPts.p);
          if (task.kind === 'inscribed') {
            kids.push(h('line', { key: 'oa', x1: CO.x, y1: CO.y, x2: A.x, y2: A.y, stroke: P.muted, strokeWidth: 2 }));
            kids.push(h('line', { key: 'ob', x1: CO.x, y1: CO.y, x2: B.x, y2: B.y, stroke: P.muted, strokeWidth: 2 }));
            var arcM = ANG.arcOpposite(ciPts.a, ciPts.b, ciPts.p), pSideA = ANG.normDeg(ciPts.p - ciPts.a) < ANG.normDeg(ciPts.b - ciPts.a), from = pSideA ? ciPts.b : ciPts.a;
            // A minor-arc item gives the arc P sits on: mark and label that arc until the check
            // (it used to put the minor arc's measure on the major arc).
            if (task.ask === 'minor' && !locked) { arcM = 360 - arcM; from = pSideA ? ciPts.a : ciPts.b; }
            kids.push(h('path', { key: 'arc', d: arcPath(CO.x, CO.y, CR, from, arcM), fill: 'none', stroke: P.hint, strokeWidth: 5, strokeOpacity: 0.75 }));
            kids.push(h('path', { key: 'ca', d: arcPath(CO.x, CO.y, 22, from, arcM), fill: 'none', stroke: P.arc, strokeWidth: 1.6 }));
            var ctxt = locked ? m.arc + '°' : task.ask === 'cent' ? '?' : task.given + '°';
            var cq = ANG.pt(CO.x, CO.y, 36, from + arcM / 2);
            kids.push(h('text', { key: 'cl', x: cq.x, y: cq.y + 4, textAnchor: 'middle', fill: !locked && task.ask === 'cent' ? P.unknown : P.hint, style: { fontSize: 12.5, fontWeight: 800 } }, ctxt));
            kids.push(h('circle', { key: 'o', cx: CO.x, cy: CO.y, r: 3.5, fill: P.vertex }));
            kids.push(h('text', { key: 'ol', x: CO.x - 12, y: CO.y - 8, fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, 'O'));
          } else {
            kids.push(h('line', { key: 'dia', x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: P.muted, strokeWidth: 2 }));
            kids.push(h('circle', { key: 'o', cx: CO.x, cy: CO.y, r: 3.5, fill: P.vertex }));
          }
          kids.push(h('line', { key: 'pa', x1: Pp.x, y1: Pp.y, x2: A.x, y2: A.y, stroke: P.ray, strokeWidth: 2.5 }));
          kids.push(h('line', { key: 'pb', x1: Pp.x, y1: Pp.y, x2: B.x, y2: B.y, stroke: P.ray, strokeWidth: 2.5 }));
          if (task.kind === 'semi') kids.push(h('line', { key: 'ab', x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: P.ray, strokeWidth: 2.5 }));
          var pd1 = ANG.dirOf(Pp, A), pd2 = ANG.dirOf(Pp, B);
          var ptxt = locked ? m.apb + '°' : (task.kind === 'inscribed' ? (task.ask === 'cent' ? task.given + '°' : '?') : (task.ask === 'apb' ? '?' : ''));
          if (ptxt) kids.push(angLbl('pl', Pp, Math.min(pd1, pd2), Math.max(pd1, pd2), ptxt, !locked && ptxt === '?' ? P.unknown : P.hint));
          if (task.kind === 'semi' && (locked || task.ask === 'other')) {
            kids.push(angLbl('al', A, Math.min(ANG.dirOf(A, Pp), ANG.dirOf(A, B)), Math.max(ANG.dirOf(A, Pp), ANG.dirOf(A, B)), locked ? m.pab + '°' : task.given + '°', P.hint));
            kids.push(angLbl('bl', B, Math.min(ANG.dirOf(B, Pp), ANG.dirOf(B, A)), Math.max(ANG.dirOf(B, Pp), ANG.dirOf(B, A)), locked ? m.pba + '°' : '?', locked ? P.hint : P.unknown));
          }
          [['A', A], ['B', B], ['P', Pp]].forEach(function(row) { kids.push(h('circle', { key: 'd' + row[0], cx: row[1].x, cy: row[1].y, r: 4, fill: P.vertex })); kids.push(lbl('n' + row[0], row[1], row[0])); });
        }
        if (locked) {
          var hp = cpt(handleDeg);
          kids.push(h('circle', { key: 'handle', cx: hp.x, cy: hp.y, r: 16, fill: P.draw, fillOpacity: 0.2, stroke: P.draw, strokeWidth: 2.5, tabIndex: 0, role: 'slider',
            'data-angles-ci-handle': handleKey, 'aria-label': fill(t('stem.angles.a11y_ci_handle', 'Point {pt} on the circle'), { pt: ciPointName(handleKey) }),
            'aria-valuemin': 0, 'aria-valuemax': 359, 'aria-valuenow': Math.round(handleDeg), 'aria-valuetext': clockText(handleDeg), 'aria-describedby': 'stem-angles-ci-readout',
            'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown', style: { cursor: 'grab', touchAction: 'none' }, onKeyDown: ciKey, onPointerDown: HAS_POINTER ? startCiDrag : undefined, onMouseDown: HAS_POINTER ? undefined : startCiDrag, onTouchStart: HAS_POINTER ? undefined : startCiDrag }));
        }
        return h('svg', { viewBox: '0 0 ' + CW + ' ' + CH, role: 'group', 'aria-label': ciDescribe(task, locked), 'data-angles-circle-svg': task.kind, style: { width: '100%', height: 'auto', maxWidth: 460, display: 'block', margin: '0 auto', borderRadius: 12, touchAction: locked ? 'pinch-zoom' : 'auto' } }, kids);
      };
      var ciDescribe = function(task, locked) {
        if (task.kind === 'cyclic') return fill(t('stem.angles.cid_cyc', 'Diagram: four points A, B, C and D on a circle, joined in order to make a quadrilateral. ∠{g} = {v}°; ∠{x} is marked ?.'), { g: 'ABCD'.charAt(task.givenIdx), v: task.given, x: 'ABCD'.charAt(task.askIdx) }) + (locked ? ' ' + ciReadout() : '');
        if (task.kind === 'semi') return (task.ask === 'apb' ? t('stem.angles.cid_semi_apb', 'Diagram: AB is a diameter of the circle. P is another point on the circle, joined to A and B. ∠APB is marked ?.')
          : fill(t('stem.angles.cid_semi_other', 'Diagram: AB is a diameter of the circle. P is another point on the circle, joined to A and B. ∠PAB = {g}°; ∠PBA is marked ?.'), { g: task.given })) + (locked ? ' ' + ciReadout() : '');
        var base = task.ask === 'cent' ? fill(t('stem.angles.cid_insc_cent', 'Diagram: points A, B and P on a circle with centre O. The inscribed angle ∠APB = {g}°. The central angle ∠AOB, on the arc away from P, is marked ?.'), { g: task.given })
          : task.ask === 'minor' ? fill(t('stem.angles.cid_insc_minor', 'Diagram: points A, B and P on a circle with centre O. The minor arc AB has a central angle of {g}°, and P is on that minor arc. ∠APB is marked ?.'), { g: task.given })
          : fill(t('stem.angles.cid_insc', 'Diagram: points A, B and P on a circle with centre O. The central angle ∠AOB = {g}°, on the arc away from P. The inscribed angle ∠APB is marked ?.'), { g: task.given });
        return base + (locked ? ' ' + ciReadout() : '');
      };
      var ciPrompt = function(p) {
        if (p.kind === 'cyclic') return fill(t('stem.angles.cip_cyc', 'ABCD is a quadrilateral with all four corners on a circle. ∠{g} = {v}°. Predict ∠{x}.'), { g: 'ABCD'.charAt(p.givenIdx), v: p.given, x: 'ABCD'.charAt(p.askIdx) });
        if (p.kind === 'semi') return p.ask === 'apb' ? t('stem.angles.cip_semi_apb', 'AB is a diameter and P is on the circle. Predict ∠APB.') : fill(t('stem.angles.cip_semi_other', 'AB is a diameter and P is on the circle. ∠PAB = {g}°. Predict ∠PBA.'), { g: p.given });
        if (p.ask === 'cent') return fill(t('stem.angles.cip_cent', 'The inscribed angle ∠APB is {g}°. Predict the central angle ∠AOB on the same arc.'), { g: p.given });
        if (p.ask === 'minor') return fill(t('stem.angles.cip_minor', 'The minor arc AB has a central angle of {g}°, and P sits on that minor arc. Predict ∠APB.'), { g: p.given });
        return fill(t('stem.angles.cip_insc', 'The central angle ∠AOB is {g}°. Predict the inscribed angle ∠APB.'), { g: p.given });
      };
      var CI_MIS = {
        insc_equal_central: t('stem.angles.cim_equal', 'The inscribed angle is not equal to the central angle. The angle at the edge is half the angle at the centre on the same arc.'),
        insc_double: t('stem.angles.cim_double', 'You doubled it. The angle at the centre is the big one: the inscribed angle is half of it.'),
        insc_other_arc: t('stem.angles.cim_other_arc', 'Check which arc P is looking at: the inscribed angle is half of the arc on the far side from P.'),
        cent_half: t('stem.angles.cim_cent_half', 'You halved it. The central angle is twice the inscribed angle.'),
        semi_no_right: t('stem.angles.cim_semi_no_right', 'You used 180° − ∠PAB, which leaves out the third angle. The angle at P in a semicircle is 90°, so ∠PBA = 90° − ∠PAB.'),
        semi_equal: t('stem.angles.cim_semi_equal', 'The two base angles are only equal when P is exactly halfway round. The angle at P is 90°, so the other two add to 90°.'),
        semi_gave_90: t('stem.angles.cim_semi_90', '90° is the angle at P, not at B. The other two angles share the remaining 90°.'),
        semi_straight: t('stem.angles.cim_semi_straight', 'AB is a straight line, but the angle at P is not. The angle at P in a semicircle is half of 180°: a right angle.'),
        cyc_equal: t('stem.angles.cim_cyc_equal', 'Opposite angles are equal in a parallelogram, but in a cyclic quadrilateral they add to 180°.'),
        cyc_360: t('stem.angles.cim_cyc_360', 'All four angles add to 360°, but an opposite pair adds to 180°.'),
        cyc_90: t('stem.angles.cim_cyc_90', 'Opposite angles of a cyclic quadrilateral add to 180°, not 90°.'),
        arith: t('stem.angles.pzm_arith', 'Your method looks right but the arithmetic is off. Check your subtraction.'),
        off: t('stem.angles.cim_off', 'Not quite. Which theorem links these two angles? Use the hint.')
      };
      var ciHint = function(p, lvl) {
        if (p.kind === 'cyclic') return lvl === 1 ? t('stem.angles.cih1_cyc', 'Each angle of a cyclic quadrilateral is half of the arc opposite it. Two opposite angles look at the whole circle between them.') : fill(t('stem.angles.cih2_cyc', 'Opposite angles add to 180°: ∠{x} = 180° − {v}°.'), { x: 'ABCD'.charAt(p.askIdx), v: p.given });
        if (p.kind === 'semi') return lvl === 1 ? t('stem.angles.cih1_semi', 'The diameter AB is an arc of 180°. The angle at P is half of it.') : (p.ask === 'apb' ? t('stem.angles.cih2_semi_apb', 'Half of 180° is…') : fill(t('stem.angles.cih2_semi', 'The angle at P is 90°. The triangle’s angles add to 180°: ∠PBA = 180° − 90° − {g}°.'), { g: p.given }));
        if (lvl === 1) return t('stem.angles.cih1_insc', 'An angle at the edge of a circle is half the angle at the centre that stands on the same arc.');
        if (p.ask === 'cent') return fill(t('stem.angles.cih2_cent', 'The central angle is twice the inscribed angle: 2 × {g}°.'), { g: p.given });
        if (p.ask === 'minor') return fill(t('stem.angles.cih2_minor', 'P looks at the major arc, which is 360° − {g}°. Halve that.'), { g: p.given });
        return fill(t('stem.angles.cih2_insc', 'Halve the central angle: {g}° ÷ 2.'), { g: p.given });
      };
      var ciSolution = function(p, head) {
        var body = p.kind === 'cyclic' ? fill(t('stem.angles.cis_cyc', 'opposite angles of a cyclic quadrilateral add to 180°, so ∠{x} = 180° − {v}° = {a}°.'), { x: 'ABCD'.charAt(p.askIdx), v: p.given, a: p.answer })
          : p.kind === 'semi' ? (p.ask === 'apb' ? t('stem.angles.cis_semi_apb', 'an angle in a semicircle is a right angle, so ∠APB = 90°.') : fill(t('stem.angles.cis_semi', '∠APB = 90° (angle in a semicircle), so ∠PBA = 180° − 90° − {g}° = {a}°.'), { g: p.given, a: p.answer }))
          : p.ask === 'cent' ? fill(t('stem.angles.cis_cent', 'the angle at the centre is twice the angle at the edge, so ∠AOB = 2 × {g}° = {a}°.'), { g: p.given, a: p.answer })
          : p.ask === 'minor' ? fill(t('stem.angles.cis_minor', 'P stands on the major arc of 360° − {g}° = {maj}°, so ∠APB = {maj}° ÷ 2 = {a}°.'), { g: p.given, maj: 360 - p.given, a: p.answer })
          : fill(t('stem.angles.cis_insc', 'the angle at the edge is half the angle at the centre, so ∠APB = {g}° ÷ 2 = {a}°.'), { g: p.given, a: p.answer });
        return fill(head, { s: body });
      };
      var renderCiExplore = function() {
        return h('div', { className: 'space-y-2 rounded-lg border border-teal-300 bg-teal-50 p-2', 'data-angles-ci-explore': 'true' },
          h('p', { className: 'text-sm font-bold text-teal-950' }, t('stem.angles.ci_explore_title', 'Now test it: move a point and watch the measurements.')),
          ciMoveOpts.length > 1 && h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_ci_pick', 'Point to move') },
            ciMoveOpts.map(function(k) { return subModeBtn('mv' + k, ciMove === k, fill(t('stem.angles.ci_move_pt', 'Move {pt}'), { pt: ciPointName(k) }), function() { upd({ ciMove: k, citT: citTask }); }); })),
          h('div', { className: 'flex flex-wrap gap-1.5', role: 'group', 'aria-label': t('stem.angles.a11y_ci_buttons', 'Move the point round the circle') },
            smallBtn('ccw10', '↺10°', fill(t('stem.angles.a11y_ci_ccw', 'Move {pt} 10 degrees counterclockwise'), { pt: ciPointName(ciMove) }), function() { ciKey({ key: 'ArrowRight', shiftKey: true, preventDefault: function() {} }); }),
            smallBtn('ccw2', '↺2°', fill(t('stem.angles.a11y_ci_ccw2', 'Move {pt} 2 degrees counterclockwise'), { pt: ciPointName(ciMove) }), function() { ciKey({ key: 'ArrowRight', shiftKey: false, preventDefault: function() {} }); }),
            smallBtn('cw2', '↻2°', fill(t('stem.angles.a11y_ci_cw2', 'Move {pt} 2 degrees clockwise'), { pt: ciPointName(ciMove) }), function() { ciKey({ key: 'ArrowLeft', shiftKey: false, preventDefault: function() {} }); }),
            smallBtn('cw10', '↻10°', fill(t('stem.angles.a11y_ci_cw', 'Move {pt} 10 degrees clockwise'), { pt: ciPointName(ciMove) }), function() { ciKey({ key: 'ArrowLeft', shiftKey: true, preventDefault: function() {} }); })),
          h('p', { id: 'stem-angles-ci-readout', className: 'text-sm font-bold text-teal-950', 'data-angles-ci-readout': 'true' }, ciReadout()),
          h('p', { className: 'text-xs text-teal-950' }, citTask.kind === 'inscribed' ? t('stem.angles.ci_explore_insc', 'Drag P round the circle: while P stays on the same arc, ∠APB does not change. Move B to change the arc.')
            : citTask.kind === 'semi' ? t('stem.angles.ci_explore_semi', 'Drag P anywhere on the circle: ∠APB stays 90°.') : t('stem.angles.ci_explore_cyc', 'Drag any corner: the four angles change, but each opposite pair still adds to 180°.'))
        );
      };
      var citCfg = {
        diagnose: ANG.diagnoseCircle, solvedKey: 'ciSolved', kindOf: function(p) { return p.kind; }, reason: 'circle theorem', tallyKind: 'circle', offCode: 'ci_off',
        make: function(k, rng) { return ANG.makeCircleTask(ciKind, rng, level); }, prompt: ciPrompt, hintText: ciHint, answerText: function(p) { return p.answer + '°'; },
        worked: function(p) { return pickWorked(function(r) { return ANG.makeCircleTask(p.kind, r, level); }, 401, 17, p, function(ex) { return fill(t('stem.angles.cip_worked', 'Worked example: {q} Answer: {s}'), { q: ciPrompt(ex), s: ciSolution(ex, '{s}') }); }, p.answer + '°'); },
        setup: function(p) { return ciHint(p, 1); }, solution: function(p) { return ciSolution(p, t('stem.angles.ci_solution', 'Solution: {s}')); },
        okText: function(p) { return fill(t('stem.angles.ci_ok', 'Correct: {a}°. Now check it by moving the point.'), { a: p.answer }); },
        revealText: function(p) { return fill(t('stem.angles.ci_reveal', 'The angle is {a}°.'), { a: p.answer }); },
        nanText: function() { return t('stem.angles.pzm_nan', 'Type a number, for example 35.'); }, misText: function(code) { return CI_MIS[code] || CI_MIS.off; },
        diagram: renderCircleSvg, inputLabel: t('stem.angles.ci_label', 'Your prediction (degrees):'), checkLabel: t('stem.angles.ci_check', 'Check my prediction'),
        nextKind: function() { return ciKind; }, after: function() { return renderCiExplore(); }, extraReset: { ciLive: null }
      };

      // ── Unit circle: degrees and radians, reference angles, (cos θ, sin θ) ──
      var UW = 360, UH = 320, UO = { x: 180, y: 160 }, UR = 120;
      var ucView = d.ucView === 'practice' ? 'practice' : 'explore';
      var ucDeg = Math.round(ANG.normDeg(num(d.ucDeg, 30)));
      var ucSnap = d.ucSnap !== false;
      var EX_SHOW = function(id) { return id == null ? null : id.replace(/^-/, '−'); };
      var exSpoken = function(id) {
        if (id == null) return '';
        var neg = id.charAt(0) === '-', core = neg ? id.slice(1) : id;
        var w = core === '1/2' ? t('stem.angles.uc_sp_half', 'one half') : core === '√2/2' ? t('stem.angles.uc_sp_r2', 'root 2 over 2') : core === '√3/2' ? t('stem.angles.uc_sp_r3', 'root 3 over 2') : core === '0' ? t('stem.angles.uc_sp_0', 'zero') : t('stem.angles.uc_sp_1', 'one');
        return neg ? fill(t('stem.angles.uc_sp_neg', 'minus {v}'), { v: w }) : w;
      };
      var trigText = function(deg, fn) { var ex = ANG.trigExact(deg)[fn]; var v = fn === 'cos' ? Math.cos(deg * Math.PI / 180) : Math.sin(deg * Math.PI / 180); return ex != null ? EX_SHOW(ex) + ' ≈ ' + (Math.round(v * 1000) / 1000).toFixed(3).replace('-', '−') : (Math.round(v * 1000) / 1000).toFixed(3).replace('-', '−'); };
      var QUAD_NAME = [t('stem.angles.uc_q_axis', 'on an axis'), t('stem.angles.uc_q1', 'quadrant I'), t('stem.angles.uc_q2', 'quadrant II'), t('stem.angles.uc_q3', 'quadrant III'), t('stem.angles.uc_q4', 'quadrant IV')];
      var ucSet = function(nd, say) {
        var v = Math.round(ANG.normDeg(nd));
        upd('ucDeg', v);
        if (say) announce(fill(t('stem.angles.uc_sr', 'θ = {deg}°, {rad} radians, {q}. Reference angle {ref}°. cos θ = {c}, sin θ = {s}.'), { deg: v, rad: ANG.piForm(v), q: QUAD_NAME[ANG.quadrant(v)], ref: ANG.refAngle(v), c: trigText(v, 'cos'), s: trigText(v, 'sin') }));
      };
      var ucKey = function(e) {
        var step = e.shiftKey ? 1 : 15, nd = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nd = ucDeg + step; else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nd = ucDeg - step;
        else if (e.key === 'Home') nd = 0; else return;
        e.preventDefault(); ucSet(nd, true);
      };
      var startUcDrag = function(e) {
        beginDrag(e, function(p) { var a = Math.atan2(-(p.y - UO.y), p.x - UO.x) * 180 / Math.PI; if (ucSnap) a = Math.round(a / 15) * 15; ucSet(a, false); });
      };
      var renderUnitSvg = function(deg, opts) {
        var o = opts || {}, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: UW, height: UH, fill: P.panel })];
        kids.push(h('line', { key: 'xa', x1: 20, y1: UO.y, x2: UW - 20, y2: UO.y, stroke: P.muted, strokeWidth: 1.5 }));
        kids.push(h('line', { key: 'ya', x1: UO.x, y1: 18, x2: UO.x, y2: UH - 18, stroke: P.muted, strokeWidth: 1.5 }));
        kids.push(h('circle', { key: 'c', cx: UO.x, cy: UO.y, r: UR, fill: 'none', stroke: P.line, strokeWidth: 2 }));
        if (o.signs) [['(+, +)', 45], ['(−, +)', 135], ['(−, −)', 225], ['(+, −)', 315]].forEach(function(s, i) { var q = ANG.pt(UO.x, UO.y, UR * 0.62, s[1]); kids.push(h('text', { key: 'sg' + i, x: q.x, y: q.y + 4, textAnchor: 'middle', fill: P.muted, style: { fontSize: 12, fontWeight: 700 } }, s[0])); });
        ANG.SPECIAL_DEGS.forEach(function(a) { var q = ANG.pt(UO.x, UO.y, UR, a); kids.push(h('circle', { key: 'sp' + a, cx: q.x, cy: q.y, r: 2.2, fill: P.muted })); });
        kids.push(h('text', { key: 'x1', x: UO.x + UR + 6, y: UO.y - 6, fill: P.ink, style: { fontSize: 11, fontWeight: 700 } }, '1'));
        kids.push(h('text', { key: 'y1', x: UO.x + 6, y: UO.y - UR - 4, fill: P.ink, style: { fontSize: 11, fontWeight: 700 } }, '1'));
        var Pp = ANG.pt(UO.x, UO.y, UR, deg), foot = { x: Pp.x, y: UO.y };
        kids.push(h('path', { key: 'th', d: arcPath(UO.x, UO.y, 24, 0, deg === 0 ? 0.01 : deg), fill: 'none', stroke: P.arc, strokeWidth: 1.8 }));
        if (o.showRef) {
          kids.push(h('line', { key: 'drop', x1: Pp.x, y1: Pp.y, x2: foot.x, y2: foot.y, stroke: P.hint, strokeWidth: 2, strokeDasharray: '5,3' }));
          var ref = ANG.refAngle(deg), q = ANG.quadrant(deg);
          if (q !== 0) { var fromRef = q === 1 ? 0 : q === 2 ? 180 - ref : q === 3 ? 180 : 360 - ref; kids.push(h('path', { key: 'ref', d: arcPath(UO.x, UO.y, 40, fromRef, ref), fill: 'none', stroke: P.hint, strokeWidth: 2.5 })); }
        }
        kids.push(h('line', { key: 'op', x1: UO.x, y1: UO.y, x2: Pp.x, y2: Pp.y, stroke: P.ray, strokeWidth: 3 }));
        kids.push(h('circle', { key: 'p', cx: Pp.x, cy: Pp.y, r: 5, fill: P.ray }));
        if (o.coordLabel) {
          var ex = ANG.trigExact(deg), lx = Pp.x + (Pp.x >= UO.x ? 10 : -10), ly = Pp.y + (Pp.y <= UO.y ? -12 : 20);
          kids.push(h('text', { key: 'cl', x: lx, y: ly, textAnchor: Pp.x >= UO.x ? 'start' : 'end', fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, ex.cos != null && ex.sin != null ? '(' + EX_SHOW(ex.cos) + ', ' + EX_SHOW(ex.sin) + ')' : '(' + trigText(deg, 'cos') + ', ' + trigText(deg, 'sin') + ')'));
        }
        if (o.interactive) kids.push(h('circle', { key: 'h', cx: Pp.x, cy: Pp.y, r: 16, fill: P.draw, fillOpacity: 0.18, stroke: P.draw, strokeWidth: 2.5, tabIndex: 0, role: 'slider', 'data-angles-uc-handle': 'true',
          'aria-label': t('stem.angles.a11y_uc_handle', 'Point P on the unit circle'), 'aria-valuemin': 0, 'aria-valuemax': 359, 'aria-valuenow': deg, 'aria-valuetext': fill(t('stem.angles.uc_valuetext', '{deg} degrees'), { deg: deg }),
          'aria-describedby': 'stem-angles-uc-readout', 'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home', style: { cursor: 'grab', touchAction: 'none' },
          onKeyDown: ucKey, onPointerDown: HAS_POINTER ? startUcDrag : undefined, onMouseDown: HAS_POINTER ? undefined : startUcDrag, onTouchStart: HAS_POINTER ? undefined : startUcDrag }));
        return h('svg', { viewBox: '0 0 ' + UW + ' ' + UH, role: o.interactive ? 'group' : 'img', 'data-angles-unit-svg': o.interactive ? 'explore' : 'task', 'aria-label': o.label || '',
          style: { width: '100%', height: 'auto', maxWidth: 440, display: 'block', margin: '0 auto', borderRadius: 12, touchAction: o.interactive ? 'pinch-zoom' : 'auto' } }, kids);
      };
      var renderUnitExplore = function() {
        var ex = ANG.trigExact(ucDeg), q = ANG.quadrant(ucDeg);
        var rows = [
          [t('stem.angles.uc_row_deg', 'θ in degrees'), ucDeg + '°'],
          [t('stem.angles.uc_row_rad', 'θ in radians'), ANG.piForm(ucDeg) + ' ≈ ' + (ucDeg * Math.PI / 180).toFixed(3)],
          [t('stem.angles.uc_row_quad', 'Where P is'), QUAD_NAME[q]],
          [t('stem.angles.uc_row_ref', 'Reference angle'), ANG.refAngle(ucDeg) + '°'],
          [t('stem.angles.uc_row_cos', 'cos θ (x-coordinate)'), trigText(ucDeg, 'cos')],
          [t('stem.angles.uc_row_sin', 'sin θ (y-coordinate)'), trigText(ucDeg, 'sin')]
        ];
        return h('div', { className: 'space-y-2', 'data-angles-uc-explore': 'true' },
          h('div', { className: 'rounded-xl border-2 border-indigo-200 bg-white p-2' }, renderUnitSvg(ucDeg, { interactive: true, signs: true, showRef: true, coordLabel: ex.cos != null && ex.sin != null, label: t('stem.angles.a11y_uc_svg', 'The unit circle. Move P with the arrow keys or by dragging.') })),
          h('div', { className: 'flex flex-wrap gap-1.5 items-center', role: 'group', 'aria-label': t('stem.angles.a11y_uc_buttons', 'Move P') },
            smallBtn('u15m', '↻15°', t('stem.angles.a11y_uc_cw15', 'Turn P 15 degrees clockwise'), function() { ucSet(ucDeg - 15, true); }),
            smallBtn('u1m', '↻1°', t('stem.angles.a11y_uc_cw1', 'Turn P 1 degree clockwise'), function() { ucSet(ucDeg - 1, true); }),
            smallBtn('u1p', '↺1°', t('stem.angles.a11y_uc_ccw1', 'Turn P 1 degree counterclockwise'), function() { ucSet(ucDeg + 1, true); }),
            smallBtn('u15p', '↺15°', t('stem.angles.a11y_uc_ccw15', 'Turn P 15 degrees counterclockwise'), function() { ucSet(ucDeg + 15, true); }),
            h('label', { className: 'flex items-center gap-1 text-xs font-bold text-slate-800', style: { minHeight: 44 } },
              h('input', { type: 'checkbox', checked: ucSnap, onChange: function() { upd('ucSnap', !ucSnap); }, style: { width: 20, height: 20 } }), t('stem.angles.uc_snap', 'Snap drags to 15°'))),
          h('table', { className: 'w-full text-sm border-collapse bg-white', style: { overflowWrap: 'anywhere' }, id: 'stem-angles-uc-readout', 'data-angles-uc-table': 'true' },
            h('caption', { className: 'text-left text-xs font-black uppercase tracking-wide text-slate-800 py-1' }, t('stem.angles.uc_table_caption', 'Point P right now')),
            h('tbody', null, rows.map(function(r, i) { return h('tr', { key: i }, h('th', { scope: 'row', className: 'text-left font-bold px-1 py-1 border-b border-slate-200' }, r[0]), h('td', { className: 'px-1 py-1 border-b border-slate-200' }, r[1])); }))),
          h('table', { className: 'w-full text-sm border-collapse bg-white', style: { overflowWrap: 'anywhere' }, 'data-angles-uc-signs': 'true' },
            h('caption', { className: 'text-left text-xs font-black uppercase tracking-wide text-slate-800 py-1' }, t('stem.angles.uc_signs_caption', 'Signs by quadrant')),
            h('thead', null, h('tr', null, [t('stem.angles.uc_col_quad', 'Quadrant'), t('stem.angles.uc_col_angles', 'Angles'), t('stem.angles.uc_col_cos', 'cos θ'), t('stem.angles.uc_col_sin', 'sin θ')].map(function(c, i) { return h('th', { key: i, scope: 'col', className: 'text-left border-b border-slate-400 px-1' }, c); }))),
            h('tbody', null, [[QUAD_NAME[1], '0° – 90°', '+', '+'], [QUAD_NAME[2], '90° – 180°', '−', '+'], [QUAD_NAME[3], '180° – 270°', '−', '−'], [QUAD_NAME[4], '270° – 360°', '+', '−']].map(function(r, i) {
              return h('tr', { key: i, className: ANG.quadrant(ucDeg) === i + 1 ? 'bg-indigo-50 font-bold' : '' }, r.map(function(c, j) { return h(j === 0 ? 'th' : 'td', { key: j, scope: j === 0 ? 'row' : undefined, className: 'text-left px-1 border-b border-slate-200' }, c); }));
            }))),
          h('div', { className: 'rounded-lg border border-amber-400 bg-amber-50 p-2 text-sm text-amber-950 space-y-1', 'data-angles-uc-watch': 'true' },
            h('p', { className: 'font-black' }, t('stem.angles.uc_watch_title', 'Watch out for two common mistakes')),
            h('p', null, t('stem.angles.uc_watch_pi', '“π = 180” is not true as a number. π radians is a half turn, the same turn as 180°, but π itself is the number 3.14159… So π/2 + 1 is about 2.57, not 91, and 1 radian is about 57.3°.')),
            h('p', null, t('stem.angles.uc_watch_sign', 'The sign depends on the quadrant. The reference angle gives the size of cos θ and sin θ; the quadrant gives the sign. In quadrant II, x is negative, so cos θ is negative.'))),
          h('button', { type: 'button', onClick: function() { upd('ucView', 'practice'); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' }, t('stem.angles.uc_to_practice', '➡ Practise'))
        );
      };
      var ucKinds = ANG.UNIT_KINDS[level] || ANG.UNIT_KINDS.g57;
      var uctKind = (d.uctKind === 'mix' || ucKinds.indexOf(d.uctKind) !== -1) ? d.uctKind : 'mix';
      var validUcTask = function(p) {
        if (!plain(p) || typeof p.id !== 'string' || ucKinds.indexOf(p.kind) === -1) return false;
        if (p.kind === 'coord') return isFinite(p.deg) && (p.fn === 'cos' || p.fn === 'sin') && typeof p.answer === 'string';
        if (p.kind === 'conv') return isFinite(p.deg) && (p.dir === 'toRad' || p.dir === 'toDeg');
        if (p.kind === 'pinum') return isFinite(p.k) && isFinite(p.den) && isFinite(p.c) && isFinite(p.answer);
        if (p.kind === 'radnum') return isFinite(p.r) && isFinite(p.answer);
        return isFinite(p.deg) && isFinite(p.answer);
      };
      var uctTask = validUcTask(d.uctT) ? d.uctT : ANG.makeUnitTask(uctKind === 'mix' ? ucKinds[0] : uctKind, seeded(TASK_SEED.uct), level);
      var uctSt = taskState('uct', uctTask);
      var UC_KIND_LABEL = { mix: t('stem.angles.kind_mix', 'Mixed'), conv: t('stem.angles.uck_conv', 'Degrees ↔ radians'), ref: t('stem.angles.uck_ref', 'Reference angle'), coord: t('stem.angles.uck_coord', 'Coordinates'), radnum: t('stem.angles.uck_radnum', 'Radians as numbers'), pinum: t('stem.angles.uck_pinum', 'π as a number') };
      var ucPrompt = function(p) {
        if (p.kind === 'ref') return fill(t('stem.angles.ucp_ref', 'Find the reference angle of {deg}°.'), { deg: p.deg });
        if (p.kind === 'coord') return fill(p.fn === 'cos' ? t('stem.angles.ucp_cos', 'Without a calculator, what is cos {deg}°?') : t('stem.angles.ucp_sin', 'Without a calculator, what is sin {deg}°?'), { deg: p.deg });
        if (p.kind === 'radnum') return fill(t('stem.angles.ucp_radnum', 'Convert {r} radians to degrees, to one decimal place.'), { r: p.r });
        if (p.kind === 'pinum') return fill(t('stem.angles.ucp_pinum', 'Work out {e} as a decimal number, to two decimal places.'), { e: (p.k === 1 ? '' : p.k) + 'π' + (p.den === 1 ? '' : '/' + p.den) + ' + ' + p.c });
        return p.dir === 'toRad' ? fill(t('stem.angles.pz_rad_to', 'Write {deg}° in radians, as a multiple of π (for example 3π/4).'), { deg: p.deg }) : fill(t('stem.angles.pz_rad_from', 'Write {pi} radians in degrees.'), { pi: ANG.piForm(p.deg) });
      };
      var UC_MIS = {
        sign_quadrant: t('stem.angles.ucm_sign', 'Right size, wrong sign. Look at the quadrant: there x (cos) or y (sin) is on the negative side.'),
        swap_sin_cos: t('stem.angles.ucm_swap', 'That is the other coordinate. cos θ is the x-coordinate (across); sin θ is the y-coordinate (up).'),
        ref_180_minus: t('stem.angles.ucm_ref180', '180° − θ only works in quadrant II. Measure the reference angle to the nearest part of the x-axis.'),
        ref_gave_theta: t('stem.angles.ucm_reftheta', 'That is the angle itself. The reference angle is the acute angle between the ray and the x-axis.'),
        ref_from_y: t('stem.angles.ucm_refy', 'You measured to the y-axis. Reference angles are always measured to the x-axis.'),
        rad_times_180: t('stem.angles.ucm_times180', 'You multiplied by 180, as if one radian were 180°. π radians is 180°, so one radian is 180° ÷ π ≈ 57.3°.'),
        rad_typed_radians: t('stem.angles.pzm_rad_typed_radians', 'That is the size in radians. Give the answer in degrees.'),
        rad_wrong_way: t('stem.angles.ucm_wrongway', 'You converted the wrong way. To go from radians to degrees, multiply by 180 and divide by π.'),
        pi_is_180_number: t('stem.angles.ucm_pi180', 'You used π = 180. π radians is the same turn as 180°, but the number π is 3.14159…'),
        rad_used_360: t('stem.angles.pzm_rad_used_360', 'A half turn, 180°, is π radians. You used 2π for 180°, which halves the answer.'),
        rad_typed_degrees: t('stem.angles.pzm_rad_typed_degrees', 'That is still in degrees. Convert: multiply by π and divide by 180.'),
        rad_pi_is_360: t('stem.angles.pzm_rad_pi_is_360', 'π radians is a half turn, 180°, not 360°.'),
        arith: t('stem.angles.ucm_arith', 'Nearly. Check your arithmetic and rounding.'),
        off: t('stem.angles.ucm_off', 'Not quite. Use the hint, or explore the point on the unit circle first.')
      };
      var ucHint = function(p, lvl) {
        if (p.kind === 'ref') return lvl === 1 ? t('stem.angles.uch1_ref', 'The reference angle is the acute angle between the ray and the nearest part of the x-axis.') : fill(t('stem.angles.uch2_ref', '{deg}° is in {q}. Measure from {axis}° to {deg}°.'), { deg: p.deg, q: QUAD_NAME[ANG.quadrant(p.deg)], axis: ANG.quadrant(p.deg) <= 2 ? (ANG.quadrant(p.deg) === 1 ? 0 : 180) : (ANG.quadrant(p.deg) === 3 ? 180 : 360) });
        if (p.kind === 'coord') return lvl === 1 ? fill(t('stem.angles.uch1_coord', 'Find the reference angle ({ref}°) and its {fn} value, then decide the sign from the quadrant.'), { ref: ANG.refAngle(p.deg), fn: p.fn }) : fill(t('stem.angles.uch2_coord', '{deg}° is in {q}: there cos θ is {cs} and sin θ is {ss}.'), { deg: p.deg, q: QUAD_NAME[ANG.quadrant(p.deg)], cs: Math.cos(p.deg * Math.PI / 180) < -1e-9 ? t('stem.angles.uc_negative', 'negative') : Math.cos(p.deg * Math.PI / 180) > 1e-9 ? t('stem.angles.uc_positive', 'positive') : t('stem.angles.uc_zero', 'zero'), ss: Math.sin(p.deg * Math.PI / 180) < -1e-9 ? t('stem.angles.uc_negative', 'negative') : Math.sin(p.deg * Math.PI / 180) > 1e-9 ? t('stem.angles.uc_positive', 'positive') : t('stem.angles.uc_zero', 'zero') });
        if (p.kind === 'radnum') return lvl === 1 ? t('stem.angles.uch1_radnum', 'π radians = 180°, so 1 radian = 180° ÷ π.') : fill(t('stem.angles.uch2_radnum', 'Work out {r} × 180 ÷ 3.14159.'), { r: p.r });
        if (p.kind === 'pinum') return lvl === 1 ? t('stem.angles.uch1_pinum', 'Here π is a number, about 3.14159, not 180.') : fill(t('stem.angles.uch2_pinum', 'Work out {k} × 3.14159 ÷ {den}, then add {c}.'), { k: p.k, den: p.den, c: p.c });
        return lvl === 1 ? t('stem.angles.pzh1_rad', 'A half turn is 180°, which is π radians.') : (p.dir === 'toRad' ? fill(t('stem.angles.pzh2_rad_to', 'Work out {deg}/180, simplify the fraction, then attach π.'), { deg: p.deg }) : t('stem.angles.pzh2_rad_from', 'Replace π with 180° and multiply.'));
      };
      var ucAnswerText = function(p) { return p.kind === 'coord' ? EX_SHOW(p.answer) : p.kind === 'conv' ? (p.dir === 'toRad' ? ANG.piForm(p.deg) : p.deg + '°') : p.kind === 'pinum' ? String(p.answer) : p.answer + '°'; };
      var ucSolution = function(p) {
        if (p.kind === 'ref') return fill(t('stem.angles.ucs_ref', 'Solution: {deg}° is in {q}, so the reference angle is {ref}°.'), { deg: p.deg, q: QUAD_NAME[ANG.quadrant(p.deg)], ref: p.answer });
        if (p.kind === 'coord') return fill(t('stem.angles.ucs_coord', 'Solution: the point at {deg}° is ({c}, {s}), so {fn} {deg}° = {a}.'), { deg: p.deg, c: EX_SHOW(ANG.trigExact(p.deg).cos), s: EX_SHOW(ANG.trigExact(p.deg).sin), fn: p.fn, a: EX_SHOW(p.answer) });
        if (p.kind === 'radnum') return fill(t('stem.angles.ucs_radnum', 'Solution: {r} × 180° ÷ π ≈ {a}°.'), { r: p.r, a: p.answer });
        if (p.kind === 'pinum') return fill(t('stem.angles.ucs_pinum', 'Solution: {k} × 3.14159 ÷ {den} + {c} ≈ {a}.'), { k: p.k, den: p.den, c: p.c, a: p.answer });
        return p.dir === 'toRad' ? fill(t('stem.angles.pzs_rad_to', 'Solution: {deg}° = {deg}/180 × π = {pi}.'), { deg: p.deg, pi: ANG.piForm(p.deg) }) : fill(t('stem.angles.pzs_rad_from', 'Solution: {pi} × 180°/π = {deg}°.'), { pi: ANG.piForm(p.deg), deg: p.deg });
      };
      var uctCfg = {
        diagnose: ANG.diagnoseUnit, solvedKey: 'ucSolved', kindOf: function(p) { return p.kind; }, reason: 'unit circle', tallyKind: 'unit circle', offCode: 'uc_off',
        make: function(k, rng) { var kind = k === 'mix' ? ucKinds[Math.floor(rnd01(rng) * ucKinds.length)] : k; return ANG.makeUnitTask(kind, rng, level); },
        prompt: ucPrompt, hintText: ucHint, answerText: ucAnswerText,
        worked: function(p) { return pickWorked(function(r) { return ANG.makeUnitTask(p.kind, r, level); }, 501, 19, p, function(ex) { return fill(t('stem.angles.ucp_worked', 'Worked example: {q} {s}'), { q: ucPrompt(ex), s: ucSolution(ex) }); }, ucAnswerText(p)); },
        setup: function(p) { return ucHint(p, 1); }, solution: ucSolution,
        okText: function(p) { return fill(t('stem.angles.pgp_ok', 'Correct: {x}.'), { x: ucAnswerText(p) }); },
        revealText: function(p) { return fill(t('stem.angles.pgp_reveal', 'The answer is {x}.'), { x: ucAnswerText(p) }); },
        nanText: function(p) { return p.kind === 'conv' && p.dir === 'toRad' ? t('stem.angles.pzm_nan_rad', 'Type a radian measure such as 3π/4 (you can type pi for π) or a decimal.') : p.kind === 'coord' ? t('stem.angles.ucm_choose', 'Choose one of the values.') : t('stem.angles.pzm_nan', 'Type a number, for example 35.'); },
        misText: function(code) { return UC_MIS[code] || UC_MIS.off; },
        diagram: function(p, locked) { return (p.kind === 'ref' || p.kind === 'coord') ? renderUnitSvg(p.deg, { showRef: locked, coordLabel: locked, label: fill(t('stem.angles.a11y_uc_task_svg', 'The unit circle with a ray at {deg}°, ending at point P.'), { deg: p.deg }) }) : null; },
        describe: function(p, locked) { return (p.kind === 'ref' || p.kind === 'coord') ? fill(t('stem.angles.ucd_task', 'Diagram: a ray from the origin at {deg}° counterclockwise from the positive x-axis, meeting the unit circle at P ({clock}).'), { deg: p.deg, clock: clockText(p.deg) }) + (locked ? ' ' + fill(t('stem.angles.ucd_task_done', 'P is at ({c}, {s}); the reference angle is {ref}°.'), { c: trigText(p.deg, 'cos'), s: trigText(p.deg, 'sin'), ref: ANG.refAngle(p.deg) }) : '') : null; },
        choices: null, inputMode: 'text',
        inputLabel: t('stem.angles.pgp_label', 'Your answer:'), checkLabel: t('stem.angles.check_puzzle', 'Check my answer'),
        typingHelp: function(p) { return p.kind === 'conv' && p.dir === 'toRad' ? t('stem.angles.pz_rad_typing', 'Type π as pi, for example 3pi/4. A decimal such as 2.356 also works.') : null; },
        kinds: ['mix'].concat(ucKinds).map(function(k) { return [k, UC_KIND_LABEL[k] || k]; }), kindsLabel: t('stem.angles.a11y_pgp_kinds', 'Question type'), kindSel: uctKind,
        onKind: function(k) { upd({ uctKind: k }); newTask(uctSt, uctCfg, k); }, nextKind: function() { return uctKind; }
      };
      if (uctTask.kind === 'coord') {
        uctCfg.choices = function() { return ANG.EXACT.map(function(e) { return [e[0], EX_SHOW(e[0]), exSpoken(e[0])]; }); };
        uctCfg.inputLabel = fill(uctTask.fn === 'cos' ? t('stem.angles.a11y_uc_choose_cos', 'Choose cos {deg}°') : t('stem.angles.a11y_uc_choose_sin', 'Choose sin {deg}°'), { deg: uctTask.deg });
      }
      var renderCirclesTab = function() {
        var hs = level !== 'g8';
        return h('div', { className: 'space-y-3', 'data-angles-circles': ciMode },
          h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_ci_modes', 'Circle activities') },
            subModeBtn('inscribed', ciMode === 'inscribed', t('stem.angles.ci_btn_insc', '◔ Inscribed angle'), function() { upd({ ciMode: 'inscribed' }); }),
            subModeBtn('semi', ciMode === 'semi', t('stem.angles.ci_btn_semi', '◓ Angle in a semicircle'), function() { upd({ ciMode: 'semi' }); }),
            subModeBtn('cyclic', ciMode === 'cyclic', t('stem.angles.ci_btn_cyc', '◇ Cyclic quadrilateral'), function() { upd({ ciMode: 'cyclic' }); }),
            subModeBtn('unit', ciMode === 'unit', t('stem.angles.ci_btn_unit', '◯ Unit circle'), function() { upd({ ciMode: 'unit' }); })),
          hs && h('p', { className: 'text-xs font-bold text-slate-700' }, t('stem.angles.ci_level_note', 'Circle theorems and the unit circle are high-school topics (grades 9–12). You are welcome to explore them.')),
          ciMode === 'unit' ? h('div', { className: 'space-y-3' },
            h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_uc_views', 'Unit circle activities') },
              subModeBtn('ucx', ucView === 'explore', t('stem.angles.uc_explore_btn', 'Explore'), function() { upd('ucView', 'explore'); }),
              subModeBtn('ucp', ucView === 'practice', t('stem.angles.uc_practice_btn', 'Practise'), function() { upd('ucView', 'practice'); })),
            ucView === 'explore' ? renderUnitExplore() : renderTaskCard(uctSt, uctCfg))
          : h('div', { className: 'space-y-2' },
            h('p', { className: 'text-sm text-slate-800' }, ciMode === 'inscribed' ? t('stem.angles.ci_intro_insc', 'An inscribed angle has its vertex on the circle. Compare it with the central angle at O that stands on the same arc.')
              : ciMode === 'semi' ? t('stem.angles.ci_intro_semi', 'P is any point on a circle, and AB is a diameter. What happens to the angle at P?')
              : t('stem.angles.ci_intro_cyc', 'A cyclic quadrilateral has all four corners on one circle. How are its opposite angles related?')),
            !citLocked && h('p', { className: 'text-xs text-slate-700' }, t('stem.angles.ci_locked_note', 'Predict first. After you check, you can move the points and watch the angles.')),
            renderTaskCard(citSt, citCfg))
        );
      };


      // ══════════════════════════════════════════════════════════════
      // ── Real contexts tab: clock hands, compass bearings, ramps and roofs ──
      // ══════════════════════════════════════════════════════════════
      var cxMode = ['clock', 'bearing', 'pitch'].indexOf(d.cxMode) !== -1 ? d.cxMode : 'clock';
      var validCxTask = function(p) {
        if (!plain(p) || typeof p.id !== 'string' || p.kind !== cxMode || p.answer == null) return false;
        if (p.kind === 'clock') return isFinite(p.h) && isFinite(p.m);
        if (p.kind === 'bearing') return p.v === 'point' ? typeof p.pt === 'string' : p.v === 'back' ? isFinite(p.b) : p.v === 'turn' ? isFinite(p.from) && isFinite(p.to) : (p.v === 'quad' && isFinite(p.x) && (p.ns === 'N' || p.ns === 'S') && (p.ew === 'E' || p.ew === 'W'));
        return p.v === 'ada' ? isFinite(p.rise) && isFinite(p.run) : p.v === 'tan' ? isFinite(p.rise) : isFinite(p.a);
      };
      var cxtTask = validCxTask(d.cxtT) ? d.cxtT : ANG.makeCtxTask(cxMode, seeded(TASK_SEED.cxt + cxMode.length), level);
      var cxtSt = taskState('cxt', cxtTask);
      var pad3 = function(v) { var s = String(Math.round(v)); while (s.length < 3) s = '0' + s; return s; };
      var timeText = function(p) { return p.h + ':' + (p.m < 10 ? '0' : '') + p.m; };
      var DIR_NAME = { N: t('stem.angles.cx_dir_n', 'north'), NE: t('stem.angles.cx_dir_ne', 'north-east'), E: t('stem.angles.cx_dir_e', 'east'), SE: t('stem.angles.cx_dir_se', 'south-east'), S: t('stem.angles.cx_dir_s', 'south'), SW: t('stem.angles.cx_dir_sw', 'south-west'), W: t('stem.angles.cx_dir_w', 'west'), NW: t('stem.angles.cx_dir_nw', 'north-west') };
      var AB = { N: t('stem.angles.cx_ab_n', 'N'), S: t('stem.angles.cx_ab_s', 'S'), E: t('stem.angles.cx_ab_e', 'E'), W: t('stem.angles.cx_ab_w', 'W') };
      var quadText = function(p) { return AB[p.ns] + ' ' + p.x + '° ' + AB[p.ew]; };
      var cxPrompt = function(p) {
        if (p.kind === 'clock') return fill(t('stem.angles.cxp_clock', 'What is the smaller angle between the hands of a clock at {time}?'), { time: timeText(p) });
        if (p.kind === 'bearing') {
          if (p.v === 'point') return fill(t('stem.angles.cxp_point', 'A hiker walks due {dir}. Write that direction as a three-figure bearing.'), { dir: DIR_NAME[p.pt] || p.pt });
          if (p.v === 'back') return fill(t('stem.angles.cxp_back', 'A boat sails from A to B on a bearing of {b}°. On what bearing must it sail to go straight back from B to A?'), { b: pad3(p.b) });
          if (p.v === 'turn') return fill(t('stem.angles.cxp_turn', 'A ship heading on a bearing of {from}° turns clockwise until it heads on {to}°. How many degrees did it turn?'), { from: pad3(p.from), to: pad3(p.to) });
          return fill(t('stem.angles.cxp_quad', 'A plane flies {q}. Write this as a three-figure bearing.'), { q: quadText(p) });
        }
        if (p.v === 'vertical') return fill(t('stem.angles.cxp_vertical', 'A roof rafter meets the flat ceiling at {a}°. A vertical post holds up the top of the rafter. What angle does the rafter make with the post?'), { a: p.a });
        if (p.v === 'ada') return fill(t('stem.angles.cxp_ada', 'A ramp rises {rise} inches over a run of {run} inches. The ADA rule needs at least 12 inches of run for every 1 inch of rise. Does this ramp meet the rule?'), { rise: p.rise, run: p.run });
        if (p.v === 'tan') return fill(t('stem.angles.cxp_tan', 'A roof has a {r}/12 pitch: it rises {r} inches for every 12 inches across. What angle does it make with the horizontal, to one decimal place?'), { r: p.rise });
        return fill(t('stem.angles.cxp_rise', 'A roof makes {a}° with the horizontal. How many inches does it rise for every 12 inches across, to one decimal place?'), { a: p.a });
      };
      var cxHint = function(p, lvl) {
        if (p.kind === 'clock') return lvl === 1 ? t('stem.angles.cxh1_clock', 'The minute hand turns 6° every minute. The hour hand turns 30° every hour, and also 0.5° every minute.')
          : fill(t('stem.angles.cxh2_clock', 'At {time} the minute hand is at {mm}° and the hour hand at {hh}°, both measured clockwise from 12. Subtract; if the gap is more than 180°, take it from 360°.'), { time: timeText(p), mm: p.m * 6, hh: fmt1((p.h % 12) * 30 + p.m * 0.5) });
        if (p.kind === 'bearing') {
          if (lvl === 1) return t('stem.angles.cxh1_bearing', 'Bearings are measured clockwise from north and written with three figures: east is 090°.');
          if (p.v === 'point') return t('stem.angles.cxh2_point', 'Count clockwise from north: a quarter turn is 90° and half of that is 45°.');
          if (p.v === 'back') return t('stem.angles.cxh2_back', 'Going straight back is a half turn: add 180°, or subtract 180° if the bearing is 180° or more.');
          if (p.v === 'turn') return fill(t('stem.angles.cxh2_turn', 'Work out {to} − {from}. If the answer is negative, add 360.'), { to: p.to, from: p.from });
          return fill(t('stem.angles.cxh2_quad', '{q} means: face {ns}, then turn {x}° toward {ew}. Where is that, measured clockwise from north?'), { q: quadText(p), ns: DIR_NAME[p.ns], x: p.x, ew: DIR_NAME[p.ew] });
        }
        if (p.v === 'vertical') return lvl === 1 ? t('stem.angles.cxh1_vertical', 'The ceiling and the post meet at a right angle, so the rafter makes a right triangle with them.') : fill(t('stem.angles.cxh2_vertical', 'The two acute angles of a right triangle are complementary: {a} + x = 90.'), { a: p.a });
        if (p.v === 'ada') return lvl === 1 ? t('stem.angles.cxh1_ada', 'Multiply the rise by 12 to find the shortest run the rule allows.') : fill(t('stem.angles.cxh2_ada', '12 × {rise} = {need} inches. Is {run} at least {need}?'), { rise: p.rise, need: 12 * p.rise, run: p.run });
        if (p.v === 'tan') return lvl === 1 ? t('stem.angles.cxh1_tan', 'In the right triangle, tan(angle) = rise ÷ run.') : fill(t('stem.angles.cxh2_tan', 'Use the tan⁻¹ key in degree mode: tan⁻¹({r} ÷ 12).'), { r: p.rise });
        return lvl === 1 ? t('stem.angles.cxh1_rise', 'tan(angle) = rise ÷ run, so rise = run × tan(angle).') : fill(t('stem.angles.cxh2_rise', 'Work out 12 × tan {a}° with the calculator in degree mode.'), { a: p.a });
      };
      var cxAnswerText = function(p) {
        if (p.kind === 'bearing') return p.v === 'turn' ? p.answer + '°' : pad3(p.answer) + '°';
        if (p.v === 'ada') return p.answer === 'yes' ? t('stem.angles.cx_ada_yes', 'Yes, it meets the rule') : t('stem.angles.cx_ada_no', 'No, it is too steep');
        if (p.v === 'rise') return fill(t('stem.angles.cx_inches', '{n} inches'), { n: p.answer });
        return p.answer + '°';
      };
      var cxSolution = function(p) {
        if (p.kind === 'clock') { var mm = p.m * 6, hh = (p.h % 12) * 30 + p.m * 0.5, gap = Math.abs(hh - mm); return fill(t('stem.angles.cxs_clock', 'Solution: minute hand {mm}°, hour hand {hh}°, gap {gap}°. The smaller angle is {a}°.'), { mm: mm, hh: fmt1(hh), gap: fmt1(gap), a: p.answer }); }
        if (p.kind === 'bearing') {
          if (p.v === 'point') return fill(t('stem.angles.cxs_point', 'Solution: due {dir} is {a}° clockwise from north: bearing {b}°.'), { dir: DIR_NAME[p.pt], a: p.answer, b: pad3(p.answer) });
          if (p.v === 'back') return fill(t('stem.angles.cxs_back', 'Solution: turn round by 180°: {b}° {op} 180° = {a}°.'), { b: pad3(p.b), op: p.b < 180 ? '+' : '−', a: pad3(p.answer) });
          if (p.v === 'turn') return fill(t('stem.angles.cxs_turn', 'Solution: clockwise from {from}° to {to}° is {a}°.'), { from: pad3(p.from), to: pad3(p.to), a: p.answer });
          return fill(t('stem.angles.cxs_quad', 'Solution: {q} is {a}° clockwise from north: bearing {b}°.'), { q: quadText(p), a: p.answer, b: pad3(p.answer) });
        }
        if (p.v === 'vertical') return fill(t('stem.angles.cxs_vertical', 'Solution: x = 90° − {a}° = {x}°.'), { a: p.a, x: p.answer });
        if (p.v === 'ada') return fill(t('stem.angles.cxs_ada', 'Solution: the rule needs at least 12 × {rise} = {need} inches of run. This ramp has {run} inches, so the answer is {ans}.'), { rise: p.rise, need: 12 * p.rise, run: p.run, ans: cxAnswerText(p) });
        if (p.v === 'tan') return fill(t('stem.angles.cxs_tan', 'Solution: tan⁻¹({r} ÷ 12) ≈ {a}°.'), { r: p.rise, a: p.answer });
        return fill(t('stem.angles.cxs_rise', 'Solution: 12 × tan {a}° ≈ {x} inches.'), { a: p.a, x: p.answer });
      };
      var cxMis = function(code, p) {
        if (code === 'clock_hour_static') return fill(t('stem.angles.cxm_static', 'You left the hour hand pointing exactly at {h}. By {time} it has moved {mv}° on toward the next number (0.5° for every minute).'), { h: p.h, time: timeText(p), mv: fmt1(p.m * 0.5) });
        if (code === 'clock_reflex') return t('stem.angles.cxm_reflex', 'That is the bigger angle, the long way round. The question asks for the smaller one.');
        if (code === 'bearing_no_wrap') return t('stem.angles.cxm_wrap', 'Bearings run from 000° to 359°. If adding 180° takes you past 360°, subtract 180° instead.');
        if (code === 'turn_ccw') return t('stem.angles.cxm_turn_ccw', 'That is the turn the other way, counterclockwise. The ship turned clockwise.');
        if (code === 'quad_gave_angle') return fill(t('stem.angles.cxm_quad', 'That is the angle measured from {ns}. A bearing is measured clockwise from north, all the way round.'), { ns: DIR_NAME[p.ns] });
        if (code === 'bearing_ccw') return t('stem.angles.cxm_ccw', 'You measured counterclockwise. Bearings go clockwise from north.');
        if (code === 'bearing_from_east') return t('stem.angles.cxm_east', 'You measured from east, like an angle in a maths diagram. Bearings start at north and go clockwise.');
        if (code === 'used_180') return t('stem.angles.cxm_used180', 'The ceiling and the post make 90°, not 180°: the two angles are complementary.');
        if (code === 'copied_given') return t('stem.angles.pzm_copied_given', 'That is the size of the angle you were given. x is the other part.');
        if (code === 'pitch_complement') return p.v === 'rise' ? t('stem.angles.cxm_rise_comp', 'You divided instead of multiplying: rise = 12 × tan(angle).') : t('stem.angles.cxm_tan_comp', 'That is the angle with the vertical. Measure from the horizontal: tan(angle) = rise ÷ run.');
        if (code === 'pitch_used_sin') return t('stem.angles.cxm_sin', 'You used sine. The rise and the run are the opposite and adjacent sides, so use tangent.');
        if (code === 'pitch_percent') return t('stem.angles.cxm_percent', 'That is the slope as a percent (rise ÷ run × 100), not an angle.');
        if (code === 'ada_wrong') return fill(t('stem.angles.cxm_ada', 'For a rise of {rise} inches the rule needs at least 12 × {rise} = {need} inches of run. This ramp has {run}.'), { rise: p.rise, need: 12 * p.rise, run: p.run });
        if (code === 'arith') return t('stem.angles.ucm_arith', 'Nearly. Check your arithmetic and rounding.');
        return t('stem.angles.cxm_off', 'Not quite. Draw a quick sketch, then use the hint.');
      };
      var renderClockSvg = function(p, locked) {
        var W = 240, H = 240, O = { x: 120, y: 120 }, R = 100, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel }), h('circle', { key: 'f', cx: O.x, cy: O.y, r: R, fill: 'none', stroke: P.line, strokeWidth: 2.5 })];
        for (var k = 1; k <= 12; k++) { var q = ANG.pt(O.x, O.y, R - 16, 90 - k * 30); kids.push(h('text', { key: 'n' + k, x: q.x, y: q.y + 5, textAnchor: 'middle', fill: P.ink, style: { fontSize: 14, fontWeight: 800 } }, String(k))); }
        for (var m = 0; m < 60; m++) { var a1 = ANG.pt(O.x, O.y, R, 90 - m * 6), a2 = ANG.pt(O.x, O.y, R - (m % 5 ? 4 : 8), 90 - m * 6); kids.push(h('line', { key: 'm' + m, x1: a1.x, y1: a1.y, x2: a2.x, y2: a2.y, stroke: P.tick, strokeWidth: m % 5 ? 0.8 : 1.6 })); }
        var hd = 90 - ((p.h % 12) * 30 + p.m * 0.5), md = 90 - p.m * 6, he = ANG.pt(O.x, O.y, 52, hd), me = ANG.pt(O.x, O.y, 78, md);
        if (locked) {
          var sweep = ANG.normDeg(hd - md); var from = md, sw = sweep; if (sweep > 180) { from = hd; sw = 360 - sweep; }
          kids.push(h('path', { key: 'arc', d: arcPath(O.x, O.y, 30, from, sw), fill: 'none', stroke: P.hint, strokeWidth: 2.5 }));
          var lp = ANG.pt(O.x, O.y, 44, from + sw / 2); kids.push(h('text', { key: 'al', x: lp.x, y: lp.y + 4, textAnchor: 'middle', fill: P.hint, style: { fontSize: 12, fontWeight: 800 } }, p.answer + '°'));
        }
        kids.push(h('line', { key: 'hh', x1: O.x, y1: O.y, x2: he.x, y2: he.y, stroke: P.base, strokeWidth: 6, strokeLinecap: 'round' }));
        kids.push(h('line', { key: 'mh', x1: O.x, y1: O.y, x2: me.x, y2: me.y, stroke: P.ray, strokeWidth: 3.5, strokeLinecap: 'round' }));
        kids.push(h('circle', { key: 'c', cx: O.x, cy: O.y, r: 5, fill: P.vertex }));
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'data-angles-cx-svg': 'clock', 'aria-label': cxDescribe(p, locked), style: { width: '100%', height: 'auto', maxWidth: 260, display: 'block', margin: '0 auto' } }, kids);
      };
      var renderBearingSvg = function(p, locked) {
        var W = 320, H = 260, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })];
        var screen = function(b) { return 90 - b; };
        var north = function(key, o, L) { var n = ANG.pt(o.x, o.y, L, 90); kids.push(h('line', { key: key, x1: o.x, y1: o.y, x2: n.x, y2: n.y, stroke: P.muted, strokeWidth: 1.6, strokeDasharray: '5,3' })); kids.push(h('text', { key: key + 't', x: n.x, y: n.y - 5, textAnchor: 'middle', fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, AB.N)); };
        var ray = function(key, o, b, L, col, w) { var e = ANG.pt(o.x, o.y, L, screen(b)); kids.push(h('line', { key: key, x1: o.x, y1: o.y, x2: e.x, y2: e.y, stroke: col, strokeWidth: w || 3, strokeLinecap: 'round' })); return e; };
        var cwArc = function(key, o, b, r, txt, col) { if (b <= 0.01) return; kids.push(h('path', { key: key, d: arcPath(o.x, o.y, r, 90, -b), fill: 'none', stroke: col, strokeWidth: 2 })); var lp = ANG.pt(o.x, o.y, r + 14, 90 - b / 2); kids.push(h('text', { key: key + 't', x: lp.x, y: lp.y + 4, textAnchor: 'middle', fill: col, style: { fontSize: 12, fontWeight: 800 } }, txt)); };
        if (p.v === 'back') {
          var C = { x: 160, y: 140 }, u = ANG.pt(0, 0, 70, screen(p.b)), A = { x: C.x - u.x, y: C.y - u.y }, Bp = { x: C.x + u.x, y: C.y + u.y };
          north('na', A, 60); north('nb', Bp, 60);
          kids.push(h('line', { key: 'ab', x1: A.x, y1: A.y, x2: Bp.x, y2: Bp.y, stroke: P.ray, strokeWidth: 3 }));
          cwArc('ga', A, p.b, 22, pad3(p.b) + '°', P.given);
          cwArc('gb', Bp, locked ? p.answer : 0, 30, pad3(p.answer) + '°', P.hint);
          if (!locked) { var q = ANG.pt(Bp.x, Bp.y, 26, screen(p.b) + 180); kids.push(h('text', { key: 'qm', x: q.x, y: q.y + 4, textAnchor: 'middle', fill: P.unknown, style: { fontSize: 14, fontWeight: 900 } }, '?')); }
          [['A', A], ['B', Bp]].forEach(function(r) { kids.push(h('circle', { key: 'd' + r[0], cx: r[1].x, cy: r[1].y, r: 4, fill: P.vertex })); kids.push(h('text', { key: 'l' + r[0], x: r[1].x + 10, y: r[1].y + 16, fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, r[0])); });
        } else {
          var O = { x: 160, y: 135 };
          north('n', O, 100);
          if (p.v === 'quad') {
            var sp = ANG.pt(O.x, O.y, 100, -90), ep = ANG.pt(O.x, O.y, 100, 0), wp = ANG.pt(O.x, O.y, 100, 180);
            kids.push(h('line', { key: 'ns', x1: O.x, y1: O.y, x2: sp.x, y2: sp.y, stroke: P.muted, strokeWidth: 1.6, strokeDasharray: '5,3' }));
            kids.push(h('line', { key: 'ew', x1: wp.x, y1: wp.y, x2: ep.x, y2: ep.y, stroke: P.muted, strokeWidth: 1.6, strokeDasharray: '5,3' }));
            kids.push(h('text', { key: 'st', x: sp.x, y: sp.y + 14, textAnchor: 'middle', fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, AB.S));
            kids.push(h('text', { key: 'et', x: ep.x + 10, y: ep.y + 4, textAnchor: 'middle', fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, AB.E));
            kids.push(h('text', { key: 'wt', x: wp.x - 10, y: wp.y + 4, textAnchor: 'middle', fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, AB.W));
            ray('r', O, p.answer, 95, P.ray);
            var axis = p.ns === 'N' ? 90 : -90, toward = (p.ns === 'N') === (p.ew === 'E') ? -1 : 1;
            kids.push(h('path', { key: 'qa', d: arcPath(O.x, O.y, 28, axis, toward * p.x), fill: 'none', stroke: P.given, strokeWidth: 2 }));
            var ql = ANG.pt(O.x, O.y, 44, axis + toward * p.x / 2); kids.push(h('text', { key: 'qt', x: ql.x, y: ql.y + 4, textAnchor: 'middle', fill: P.given, style: { fontSize: 12, fontWeight: 800 } }, p.x + '°'));
            if (locked) cwArc('ans', O, p.answer, 58, pad3(p.answer) + '°', P.hint);
          } else if (p.v === 'turn') {
            ray('r1', O, p.from, 95, P.base); ray('r2', O, p.to, 95, P.ray);
            cwArc('f', O, p.from, 26, pad3(p.from) + '°', P.given);
            var tsw = ANG.normDeg(p.to - p.from);
            kids.push(h('path', { key: 'tr', d: arcPath(O.x, O.y, 52, screen(p.from), -tsw), fill: 'none', stroke: locked ? P.hint : P.unknown, strokeWidth: 2.5, strokeDasharray: locked ? undefined : '5,3' }));
            var tl = ANG.pt(O.x, O.y, 68, screen(p.from) - tsw / 2); kids.push(h('text', { key: 'tt', x: tl.x, y: tl.y + 4, textAnchor: 'middle', fill: locked ? P.hint : P.unknown, style: { fontSize: 13, fontWeight: 900 } }, locked ? p.answer + '°' : '?'));
          } else {
            ray('r', O, p.answer, 95, P.ray);
            var dl = ANG.pt(O.x, O.y, 112, screen(p.answer)); kids.push(h('text', { key: 'dt', x: dl.x, y: dl.y + 4, textAnchor: 'middle', fill: P.ink, style: { fontSize: 12, fontWeight: 800 } }, DIR_NAME[p.pt] || ''));
            if (locked) cwArc('ans', O, p.answer, 34, pad3(p.answer) + '°', P.hint);
          }
          kids.push(h('circle', { key: 'o', cx: O.x, cy: O.y, r: 4, fill: P.vertex }));
        }
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'data-angles-cx-svg': 'bearing', 'aria-label': cxDescribe(p, locked), style: { width: '100%', height: 'auto', maxWidth: 380, display: 'block', margin: '0 auto' } }, kids);
      };
      var renderPitchSvg = function(p, locked) {
        var W = 340, H = 220, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })];
        var ang = p.v === 'ada' ? Math.atan(p.rise / p.run) * 180 / Math.PI * 3 : p.v === 'tan' ? Math.atan(p.rise / 12) * 180 / Math.PI : p.a;
        // Fit the triangle in the box at its true angle: capping the rise drew every angle over ~33° at ~33°.
        var tanA = Math.tan(ang * Math.PI / 180), runPx = Math.min(250, 160 / tanA), riseOf = runPx * tanA;
        var R0 = { x: 290, y: 185 }, L0 = { x: R0.x - runPx, y: R0.y }, T0 = { x: R0.x, y: R0.y - riseOf };
        var bis = function(o, r, dir) { var q = ANG.pt(o.x, o.y, r, dir); return { x: q.x, y: q.y + 4 }; };
        kids.push(h('line', { key: 'base', x1: L0.x, y1: L0.y, x2: R0.x, y2: R0.y, stroke: P.base, strokeWidth: 3 }));
        kids.push(h('line', { key: 'post', x1: R0.x, y1: R0.y, x2: T0.x, y2: T0.y, stroke: P.base, strokeWidth: 3 }));
        kids.push(h('line', { key: 'slope', x1: L0.x, y1: L0.y, x2: T0.x, y2: T0.y, stroke: P.ray, strokeWidth: 4, strokeLinecap: 'round' }));
        kids.push(h('rect', { key: 'sq', x: R0.x - 12, y: R0.y - 12, width: 12, height: 12, fill: 'none', stroke: P.muted, strokeWidth: 1.5 }));
        var slopeDeg = ANG.dirOf(L0, T0);
        var lab = function(key, x, y, txt, col) { kids.push(h('text', { key: key, x: x, y: y, textAnchor: 'middle', fill: col || P.ink, style: { fontSize: 12.5, fontWeight: 800 } }, txt)); };
        if (p.v === 'vertical') {
          kids.push(h('path', { key: 'a1', d: arcPath(L0.x, L0.y, 34, 0, slopeDeg), fill: 'none', stroke: P.given, strokeWidth: 2 }));
          var a1p = bis(L0, 54, slopeDeg / 2), a2p = bis(T0, 58, 225 + p.a / 2);
          lab('a1t', a1p.x, a1p.y, p.a + '°', P.given);
          kids.push(h('path', { key: 'a2', d: arcPath(T0.x, T0.y, 26, -90, -(90 - p.a)), fill: 'none', stroke: locked ? P.hint : P.unknown, strokeWidth: 2 }));
          lab('a2t', a2p.x, a2p.y, locked ? p.answer + '°' : 'x', locked ? P.hint : P.unknown);
          lab('cl', (L0.x + R0.x) / 2, L0.y + 22, t('stem.angles.cx_ceiling', 'ceiling'));
          lab('pl', R0.x + 22, (R0.y + T0.y) / 2, t('stem.angles.cx_post', 'post'));
        } else {
          lab('run', (L0.x + R0.x) / 2, L0.y + 22, p.v === 'ada' ? fill(t('stem.angles.cx_run_in', 'run {n} in'), { n: p.run }) : fill(t('stem.angles.cx_run_in', 'run {n} in'), { n: 12 }));
          lab('rise', R0.x + 26, (R0.y + T0.y) / 2 + 4, p.v === 'ada' ? fill(t('stem.angles.cx_rise_in', 'rise {n} in'), { n: p.rise }) : p.v === 'tan' ? fill(t('stem.angles.cx_rise_in', 'rise {n} in'), { n: p.rise }) : (locked ? fill(t('stem.angles.cx_rise_in', 'rise {n} in'), { n: p.answer }) : '?'), p.v === 'rise' && !locked ? P.unknown : P.ink);
          if (p.v !== 'ada') {
            kids.push(h('path', { key: 'a1', d: arcPath(L0.x, L0.y, 40, 0, slopeDeg), fill: 'none', stroke: p.v === 'tan' && !locked ? P.unknown : P.given, strokeWidth: 2 }));
            var a1q = bis(L0, 62, slopeDeg / 2);
            lab('a1t', a1q.x, a1q.y, p.v === 'tan' ? (locked ? p.answer + '°' : '?') : p.a + '°', p.v === 'tan' && !locked ? P.unknown : P.given);
          } else lab('ns', W / 2, 18, t('stem.angles.cx_not_scale', 'Steepness exaggerated, not to scale'), P.muted);
        }
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'data-angles-cx-svg': 'pitch', 'aria-label': cxDescribe(p, locked), style: { width: '100%', height: 'auto', maxWidth: 420, display: 'block', margin: '0 auto' } }, kids);
      };
      var cxDescribe = function(p, locked) {
        // On the hour, the hour hand has not moved past the hour yet.
        if (p.kind === 'clock') return (p.m === 0 ? fill(t('stem.angles.cxd_clock_hour', 'Diagram: a clock showing {time}. The minute hand points at 12 and the hour hand points exactly at {h}.'), { time: timeText(p), h: p.h })
          : fill(t('stem.angles.cxd_clock', 'Diagram: a clock showing {time}. The minute hand points at the {mpos}-minute mark; the hour hand has moved past {h} toward {h1}.'), { time: timeText(p), mpos: p.m, h: p.h, h1: p.h % 12 + 1 })) + (locked ? ' ' + fill(t('stem.angles.cxd_done', 'The angle is marked {a}°.'), { a: p.answer }) : '');
        if (p.kind === 'bearing') {
          if (p.v === 'back') return fill(t('stem.angles.cxd_back', 'Diagram: A and B, each with a north line. The line from A to B is on a bearing of {b}° from A. The bearing from B back to A is marked ?.'), { b: pad3(p.b) });
          if (p.v === 'turn') return fill(t('stem.angles.cxd_turn', 'Diagram: a north line and two headings, {from}° and {to}°, with the clockwise turn between them marked ?.'), { from: pad3(p.from), to: pad3(p.to) });
          if (p.v === 'quad') return fill(t('stem.angles.cxd_quad', 'Diagram: north–south and east–west lines, and a direction {x}° from {ns} toward {ew}.'), { x: p.x, ns: DIR_NAME[p.ns], ew: DIR_NAME[p.ew] });
          return fill(t('stem.angles.cxd_point', 'Diagram: a north line and an arrow pointing due {dir}.'), { dir: DIR_NAME[p.pt] });
        }
        if (p.v === 'vertical') return fill(t('stem.angles.cxd_vertical', 'Diagram: a right triangle made by the flat ceiling, a vertical post and the sloping rafter. The rafter meets the ceiling at {a}°; the angle between the rafter and the post is marked x.'), { a: p.a });
        if (p.v === 'ada') return fill(t('stem.angles.cxd_ada', 'Diagram: a ramp as a right triangle: rise {rise} inches, run {run} inches.'), { rise: p.rise, run: p.run });
        if (p.v === 'tan') return fill(t('stem.angles.cxd_tan', 'Diagram: a roof as a right triangle: rise {r} inches over a run of 12 inches. The angle with the horizontal is marked ?.'), { r: p.rise });
        return fill(t('stem.angles.cxd_rise', 'Diagram: a roof as a right triangle at {a}° to the horizontal, with a run of 12 inches. The rise is marked ?.'), { a: p.a });
      };
      var CX_KIND_LABEL = { clock: t('stem.angles.cx_mode_clock', '🕒 Clock hands'), bearing: t('stem.angles.cx_mode_bearing', '🧭 Compass bearings'), pitch: t('stem.angles.cx_mode_pitch', '🏠 Ramps and roofs') };
      var cxtCfg = {
        diagnose: ANG.diagnoseCtx, solvedKey: 'cxSolved', kindOf: function(p) { return p.kind; }, reason: 'angle in context', tallyKind: 'context', offCode: 'cx_off',
        make: function(k, rng) { return ANG.makeCtxTask(cxMode, rng, level); }, prompt: cxPrompt, hintText: cxHint, answerText: cxAnswerText,
        worked: function(p) { return pickWorked(function(r) { return ANG.makeCtxTask(p.kind, r, level); }, 601, 23, p, function(ex) { return fill(t('stem.angles.ucp_worked', 'Worked example: {q} {s}'), { q: cxPrompt(ex), s: cxSolution(ex) }); }, cxAnswerText(p)); },
        setup: function(p) { return cxHint(p, 1); }, solution: cxSolution,
        okText: function(p) { return fill(t('stem.angles.pgp_ok', 'Correct: {x}.'), { x: cxAnswerText(p) }); },
        revealText: function(p) { return fill(t('stem.angles.pgp_reveal', 'The answer is {x}.'), { x: cxAnswerText(p) }); },
        nanText: function(p) { return p.v === 'ada' ? t('stem.angles.ucm_choose', 'Choose one of the values.') : t('stem.angles.pzm_nan', 'Type a number, for example 35.'); },
        misText: cxMis,
        diagram: function(p, locked) { return p.kind === 'clock' ? renderClockSvg(p, locked) : p.kind === 'bearing' ? renderBearingSvg(p, locked) : renderPitchSvg(p, locked); },
        describe: cxDescribe, inputLabel: cxtTask.kind === 'bearing' && cxtTask.v !== 'turn' ? t('stem.angles.cx_label_bearing', 'Bearing (degrees):') : cxtTask.v === 'rise' ? t('stem.angles.cx_label_inches', 'Rise (inches):') : t('stem.angles.pz_label', 'x (degrees) ='),
        checkLabel: t('stem.angles.check_puzzle', 'Check my answer'), nextKind: function() { return cxMode; }, binary: function(p) { return p.v === 'ada'; },
        choices: cxtTask.v === 'ada' ? function() { return [['yes', t('stem.angles.cx_ada_yes', 'Yes, it meets the rule')], ['no', t('stem.angles.cx_ada_no', 'No, it is too steep')]]; } : null
      };
      if (cxtTask.v === 'ada') cxtCfg.inputLabel = t('stem.angles.cx_ada_q', 'Does the ramp meet the rule?');
      var renderContextsTab = function() {
        return h('div', { className: 'space-y-3', 'data-angles-contexts': cxMode },
          h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_cx_modes', 'Kinds of real-world problem') },
            ['clock', 'bearing', 'pitch'].map(function(k) { return subModeBtn(k, cxMode === k, CX_KIND_LABEL[k], function() { if (cxMode !== k) upd({ cxMode: k, cxtT: null, cxtA: '', cxtTries: 0, cxtRes: null, cxtHint: 0 }); }); })),
          renderTaskCard(cxtSt, cxtCfg));
      };

      // ══════════════════════════════════════════════════════════════
      // ── Construct tab: bisect and copy an angle with a simulated compass
      //    and straightedge, all by buttons, menus and a width slider ──
      // ══════════════════════════════════════════════════════════════
      var conKind = d.conKind === 'copy' ? 'copy' : 'bisect';
      var validPt = function(p) { return plain(p) && isFinite(p.x) && isFinite(p.y); };
      var validCon = function(c) {
        return plain(c) && c.kind === conKind && typeof c.id === 'string' && validPt(c.B) && isFinite(c.m) && isFinite(c.base) && isFinite(c.lenBA) && isFinite(c.lenBC) && Array.isArray(c.steps) &&
          (c.kind !== 'copy' || (validPt(c.P) && isFinite(c.q) && isFinite(c.lenPQ)));
      };
      // Replay saved steps through the engine so a tampered or stale save cannot draw nonsense.
      var conReplay = function(c) {
        var cur = Object.assign({}, c, { steps: [] });
        for (var i = 0; i < c.steps.length; i++) {
          var r = ANG.conApply(cur, c.steps[i]);
          if (r.code !== 'ok' && r.code !== 'arcs_miss') break;
          cur = r.con;
          if (r.code === 'arcs_miss') break;
        }
        return cur;
      };
      var con = conReplay(validCon(d.con) ? d.con : ANG.makeConstruction(conKind, seeded(conKind === 'copy' ? 71 : 73)));
      var conPts = ANG.conPoints(con);
      var conFinished = ANG.conDone(con);
      var conVer = ANG.conVerify(con);
      var conTool = d.conTool === 'line' ? 'line' : 'compass';
      var conW = Math.max(10, Math.min(220, num(d.conW, 60)));
      var conPtNames = Object.keys(conPts);
      var conCentre = conPts[d.conCentre] ? d.conCentre : 'B';
      var conFrom = conPts[d.conFrom] ? d.conFrom : (conKind === 'copy' ? 'P' : 'B');
      var conThrough = conPts[d.conThrough] ? d.conThrough : (conPts.F ? 'F' : conPts.D2 ? 'D2' : conPtNames[conPtNames.length - 1]);
      var conMa = conPts[d.conMa] ? d.conMa : (conPts.D ? 'D' : 'B'), conMb = conPts[d.conMb] ? d.conMb : (conPts.E ? 'E' : 'A');
      var conMsg = plain(d.conMsg) ? d.conMsg : null;
      var PTN = { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', P: 'P', Q: 'Q', E2: 'E′', D2: 'D′' };
      var conSolved = solvedMap('conSolved');
      var conSave = function(patch) { upd(Object.assign({ con: con, conKind: conKind }, patch)); };
      var CON_MSG = {
        first_at_vertex: t('stem.angles.cnm_first', 'Start with the compass needle on the vertex B, so the first arc crosses both rays at the same distance from B.'),
        arc_tiny: t('stem.angles.cnm_tiny', 'That compass width is too small to work with. Open it wider.'),
        arc_off_rays: t('stem.angles.cnm_wide', 'That arc is too wide: it would not cross the rays. Close the compass a little.'),
        arc_from_DE: t('stem.angles.cnm_from_de', 'Next, put the needle on D or E, where your first arc crossed the rays.'),
        other_point: t('stem.angles.cnm_other', 'You already drew an arc from that point. Now use the other one.'),
        arcs_miss: t('stem.angles.cnm_miss', 'Those two arcs do not cross. Undo, then make the compass wider than half the distance between the two points.'),
        use_straightedge: t('stem.angles.cnm_straight', 'The arcs are done. Now use the straightedge.'),
        line_too_soon: t('stem.angles.cnm_too_soon', 'There is no crossing point to draw through yet. Keep using the compass.'),
        line_not_vertex: t('stem.angles.cnm_not_vertex', 'The new ray must start at the vertex of the angle.'),
        line_through_cross: t('stem.angles.cnm_through', 'Draw through the point where your arcs cross.'),
        copy_arc_at_P: t('stem.angles.cnm_at_p', 'Next, put the needle on P and draw an arc with the same width, crossing the new ray.'),
        copy_arc_at_E2: t('stem.angles.cnm_at_e2', 'Now put the needle on E′, where your last arc crossed the new ray.'),
        no_point: t('stem.angles.cnm_no_point', 'That point is not on the drawing yet.'),
        done_already: t('stem.angles.cnm_done', 'This construction is finished. Start a new one.'),
        bad: t('stem.angles.cnm_bad', 'Choose the compass or the straightedge first.')
      };
      var CON_GUIDE = conKind === 'bisect' ? [
        t('stem.angles.cng_b1', 'Needle on B. Draw an arc that crosses both rays: the crossings are D (on BA) and E (on BC).'),
        t('stem.angles.cng_b2', 'Needle on D. Open the compass wider than half of DE and draw an arc inside the angle.'),
        t('stem.angles.cng_b3', 'Keep the same width. Needle on E: draw an arc that crosses the last one at F.'),
        t('stem.angles.cng_b4', 'Straightedge: draw the ray from B through F. It cuts the angle into two equal halves.')
      ] : [
        t('stem.angles.cng_c1', 'Needle on B. Draw an arc that crosses BA at D and BC at E.'),
        t('stem.angles.cng_c2', 'Keep the same width. Needle on P: draw an arc that crosses the new ray at E′.'),
        t('stem.angles.cng_c3', 'Open the compass to the length DE, then put the needle on E′ and draw an arc that crosses your last arc at D′.'),
        t('stem.angles.cng_c4', 'Straightedge: draw the ray from P through D′. The angle D′PE′ is a copy of angle ABC.')
      ];
      var conStepText = function(c) {
        var P2 = ANG.conPoints(c), out = [];
        (c.steps || []).forEach(function(s, i) {
          if (s.tool === 'line') { out.push(fill(t('stem.angles.cnd_line', 'Ray from {v} through {x}.'), { v: PTN[s.from], x: PTN[s.through] })); return; }
          var line = fill(t('stem.angles.cnd_arc', 'Arc {k}: needle on {c}, width {w}.'), { k: i + 1, c: PTN[s.centre], w: fmt1(s.r) });
          if (i === 0) line += ' ' + t('stem.angles.cnd_de', 'It crosses BA at D and BC at E.');
          if (c.kind === 'bisect' && i === 2) line += ' ' + (P2.F ? t('stem.angles.cnd_f', 'The last two arcs cross at F.') : t('stem.angles.cnd_nof', 'The last two arcs do not cross.'));
          if (c.kind === 'copy' && i === 1) line += ' ' + t('stem.angles.cnd_e2', 'It crosses the new ray at E′.');
          if (c.kind === 'copy' && i === 2) line += ' ' + (P2.D2 ? t('stem.angles.cnd_d2', 'It crosses the arc from P at D′.') : t('stem.angles.cnd_nod2', 'It does not cross the arc from P.'));
          out.push(line);
        });
        return out;
      };
      var conVerifyText = function(c, v) {
        if (!v) return '';
        var s = c.steps;
        if (c.kind === 'bisect') {
          if (v.ok) return fill(t('stem.angles.cnv_b_ok', 'Measured with a protractor: ∠ABF = {a1}° and ∠FBC = {a2}°. Your ray BF bisects the angle.'), { a1: fmt1(v.a1), a2: fmt1(v.a2) });
          return fill(t('stem.angles.cnv_b_no', 'Measured with a protractor: ∠ABF = {a1}° and ∠FBC = {a2}°, which are not equal. Your arcs from D and E used different widths ({w1} and {w2}), so F is not the same distance from D and E. Undo and keep the width the same.'), { a1: fmt1(v.a1), a2: fmt1(v.a2), w1: fmt1(s[1].r), w2: fmt1(s[2].r) });
        }
        if (v.ok) return fill(t('stem.angles.cnv_c_ok', 'Measured with a protractor: ∠D′PE′ = {c}° and ∠ABC = {m}°. A perfect copy.'), { c: fmt1(v.copied), m: c.m });
        if (v.firstWidthChanged) return fill(t('stem.angles.cnv_c_first', 'Measured: ∠D′PE′ = {c}°, but ∠ABC = {m}°. The arc from P used width {w1}, and the arc from B used {w0}. They must match so that PE′ is the same length as BE.'), { c: fmt1(v.copied), m: c.m, w1: fmt1(s[1].r), w0: fmt1(s[0].r) });
        return fill(t('stem.angles.cnv_c_de', 'Measured: ∠D′PE′ = {c}°, but ∠ABC = {m}°. The arc from E′ must use the width DE ({de}); yours was {w}. Use “Open the compass to a segment” with D and E.'), { c: fmt1(v.copied), m: c.m, de: fmt1(v.de), w: fmt1(s[2].r) });
      };
      var conAct = function() {
        if (angleSubmissionPending) return;
        var act = conTool === 'compass' ? { tool: 'compass', centre: conCentre, r: conW } : { tool: 'line', from: conFrom, through: conThrough };
        var r = ANG.conApply(con, act);
        if (r.code !== 'ok' && r.code !== 'arcs_miss') { conSave({ conMsg: { code: r.code } }); announce(CON_MSG[r.code] || CON_MSG.bad); return; }
        var lines = conStepText(r.con), last = lines[lines.length - 1];
        if (!ANG.conDone(r.con)) {
          conSave({ con: r.con, conMsg: { code: r.code } });
          announce(last + (r.code === 'arcs_miss' ? ' ' + CON_MSG.arcs_miss : ''));
          return;
        }
        angleSubmissionPending = true;
        var v = ANG.conVerify(r.con);
        if (v.ok) {
          var sv = Object.assign({}, conSolved); sv[conKind] = (Number(sv[conKind]) || 0) + 1;
          conSave({ con: r.con, conMsg: { code: 'verified' }, conSolved: sv });
          creditOnce(r.con.id, 5, 'construction');
          recordCorrect(null);
        } else {
          conSave({ con: r.con, conMsg: { code: 'verify_off' } });
          recordWrong();
          tallyMiss('construction:' + conKind, conKind === 'bisect' ? 'con_width_changed' : (v.firstWidthChanged ? 'con_first_width_changed' : 'con_width_not_de'), r.con.id);
        }
        announce(last + ' ' + conVerifyText(r.con, v));
      };
      var conUndo = function() { if (!con.steps.length) return; conSave({ con: Object.assign({}, con, { steps: con.steps.slice(0, -1) }), conMsg: null }); announce(t('stem.angles.cn_undone', 'Last step undone.')); };
      var conNew = function(kind) { var k = kind || conKind; upd({ conKind: k, con: ANG.makeConstruction(k, Math.random), conMsg: null, conTool: 'compass', conCentre: 'B' }); announce(k === 'bisect' ? t('stem.angles.cn_new_b', 'New angle ABC to bisect.') : t('stem.angles.cn_new_c', 'New angle ABC to copy onto the ray from P.')); };
      var renderConSvg = function() {
        var W = ANG.CON_W, H = ANG.CON_H, kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })], s = con.steps;
        var seg = function(key, a, b, col, w, dash) { kids.push(h('line', { key: key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: col, strokeWidth: w || 2.5, strokeLinecap: 'round', strokeDasharray: dash })); };
        seg('ba', con.B, conPts.A, P.base, 3); seg('bc', con.B, conPts.C, P.base, 3);
        kids.push(h('path', { key: 'am', d: arcPath(con.B.x, con.B.y, 18, con.base, con.m), fill: 'none', stroke: P.arc, strokeWidth: 1.6 }));
        if (con.kind === 'copy') seg('pq', con.P, conPts.Q, P.base, 3);
        var arcAt = function(key, c, r, mid, half) { kids.push(h('path', { key: key, d: arcPath(c.x, c.y, r, mid - half, 2 * half), fill: 'none', stroke: P.compass, strokeWidth: 2 })); };
        s.forEach(function(st, i) {
          if (st.tool === 'line') {
            var v = con.kind === 'bisect' ? con.B : con.P, x = conPts[st.through], dir = ANG.dirOf(v, x), L = 400;
            var u = ANG.pt(0, 0, 1, dir); if (u.x > 1e-9) L = Math.min(L, (W - 8 - v.x) / u.x); if (u.x < -1e-9) L = Math.min(L, (8 - v.x) / u.x); if (u.y > 1e-9) L = Math.min(L, (H - 8 - v.y) / u.y); if (u.y < -1e-9) L = Math.min(L, (8 - v.y) / u.y);
            seg('ln' + i, v, ANG.pt(v.x, v.y, L, dir), conVer && conVer.ok ? P.ok : P.ray, 3);
            return;
          }
          var c = conPts[st.centre];
          if (i === 0) { arcAt('arc' + i, c, st.r, con.base + con.m / 2, con.m / 2 + 14); return; }
          if (con.kind === 'copy' && i === 1) { arcAt('arc' + i, c, st.r, con.q + (con.m + 30) / 2, (con.m + 30) / 2 + 10); return; }
          var target = con.kind === 'bisect' ? (conPts.F || ANG.pt(con.B.x, con.B.y, s[0].r * 1.7, con.base + con.m / 2)) : (conPts.D2 || ANG.pt(con.P.x, con.P.y, s[1].r, con.q + con.m));
          arcAt('arc' + i, c, st.r, ANG.dirOf(c, target), 38);
        });
        if (!conFinished && conTool === 'compass' && conPts[conCentre]) kids.push(h('circle', { key: 'prev', cx: conPts[conCentre].x, cy: conPts[conCentre].y, r: conW, fill: 'none', stroke: P.compass, strokeWidth: 1, strokeDasharray: '3,5', strokeOpacity: 0.7 }));
        Object.keys(conPts).forEach(function(k) {
          var q = conPts[k];
          kids.push(h('circle', { key: 'p' + k, cx: q.x, cy: q.y, r: 3.5, fill: P.vertex }));
          kids.push(h('text', { key: 't' + k, x: q.x + 8, y: q.y - 7, fill: P.ink, style: { fontSize: 13, fontWeight: 800 } }, PTN[k] || k));
        });
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'data-angles-con-svg': con.kind,
          'aria-label': con.kind === 'bisect' ? t('stem.angles.a11y_con_b', 'Angle ABC with your compass arcs and lines.') : t('stem.angles.a11y_con_c', 'Angle ABC, the new ray from P, and your compass arcs and lines.'),
          style: { width: '100%', height: 'auto', maxWidth: 520, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };
      var ptSelect = function(id, label, value, onChange) {
        return h('label', { className: 'text-xs font-bold text-slate-800 flex flex-col gap-1', htmlFor: id }, label,
          h('select', { id: id, value: value, onChange: function(e) { onChange(e.target.value); }, style: { minHeight: 44, minWidth: 64 }, className: 'rounded-lg border border-slate-600 px-2 text-sm bg-white text-slate-900' },
            conPtNames.map(function(k) { return h('option', { key: k, value: k }, PTN[k] || k); })));
      };
      var renderConstructTab = function() {
        var guideIdx = Math.min(CON_GUIDE.length - 1, con.kind === 'bisect' ? con.steps.length : (con.steps.length >= 3 ? 3 : con.steps.length));
        var showGuide = !(Number(conSolved[conKind]) > 0) || d.conGuide === true;
        var msgOk = conMsg && (conMsg.code === 'ok' || conMsg.code === 'verified');
        var msgText = !conMsg ? '' : conMsg.code === 'verified' || conMsg.code === 'verify_off' ? conVerifyText(con, conVer)
          : conMsg.code === 'ok' ? (conStepText(con).slice(-1)[0] || '') : conMsg.code === 'arcs_miss' ? CON_MSG.arcs_miss : (CON_MSG[conMsg.code] || '');
        return h('div', { className: 'space-y-3', 'data-angles-construct': conKind },
          h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_con_modes', 'Construction') },
            subModeBtn('bisect', conKind === 'bisect', t('stem.angles.cn_mode_b', '✂️ Bisect an angle'), function() { if (conKind !== 'bisect') conNew('bisect'); }),
            subModeBtn('copy', conKind === 'copy', t('stem.angles.cn_mode_c', '📋 Copy an angle'), function() { if (conKind !== 'copy') conNew('copy'); })),
          h('p', { className: 'text-sm font-bold text-slate-900' }, conKind === 'bisect' ? t('stem.angles.cn_goal_b', 'Goal: cut angle ABC into two equal angles using only a compass and a straightedge (no protractor until the end).')
            : t('stem.angles.cn_goal_c', 'Goal: make an angle at P, on the new ray, exactly equal to angle ABC, using only a compass and a straightedge.')),
          showGuide ? h('ol', { className: 'list-decimal ml-5 text-sm text-sky-950 rounded-lg border border-sky-300 bg-sky-50 p-2 pl-6 space-y-0.5', 'data-angles-con-guide': 'full' },
              CON_GUIDE.map(function(g, i) { return h('li', { key: i, className: i === guideIdx && !conFinished ? 'font-bold' : '' }, g); }))
            : h('div', { className: 'flex flex-wrap gap-2 items-center' },
              h('button', { type: 'button', onClick: function() { announce(CON_GUIDE[guideIdx]); upd('conHintShown', guideIdx + 1); }, disabled: conFinished, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold border border-amber-700 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50' }, t('stem.angles.cn_hint', '💡 What next?')),
              h('button', { type: 'button', onClick: function() { upd('conGuide', true); }, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold border border-sky-700 text-sky-900 bg-white hover:bg-sky-50' }, t('stem.angles.show_steps', 'Show the steps again')),
              d.conHintShown === guideIdx + 1 && !conFinished && h('p', { className: 'text-sm text-amber-950 w-full', 'data-angles-con-hint': 'true' }, CON_GUIDE[guideIdx])),
          h('div', { className: 'rounded-xl border-2 border-orange-200 bg-white p-2' }, renderConSvg()),
          h('div', { className: 'rounded-lg border border-slate-300 bg-slate-50 p-2' },
            h('p', { className: 'text-xs font-bold uppercase tracking-wide text-slate-700' }, t('stem.angles.cn_drawn', 'What you have drawn')),
            con.steps.length === 0 ? h('p', { className: 'text-sm text-slate-800' }, con.kind === 'bisect' ? fill(t('stem.angles.cnd_start_b', 'Angle ABC opens {m}°, measured counterclockwise from ray BC to ray BA. Nothing drawn yet.'), { m: con.m }) : t('stem.angles.cnd_start_c', 'Angle ABC, and a new ray from P toward Q. Nothing drawn yet.'))
              : h('ol', { className: 'list-decimal ml-5 text-sm text-slate-800', 'data-angles-con-steps': 'true' }, conStepText(con).map(function(s, i) { return h('li', { key: i }, s); }))),
          !conFinished && h('div', { className: 'space-y-2 rounded-lg border border-orange-300 bg-orange-50 p-2' },
            h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.angles.a11y_con_tool', 'Tool') },
              subModeBtn('tc', conTool === 'compass', t('stem.angles.cn_compass', '🧭 Compass'), function() { conSave({ conTool: 'compass' }); }),
              subModeBtn('tl', conTool === 'line', t('stem.angles.cn_straightedge', '📏 Straightedge'), function() { conSave({ conTool: 'line' }); })),
            conTool === 'compass' ? h('div', { className: 'flex flex-wrap gap-3 items-end' },
              ptSelect('stem-angles-con-centre', t('stem.angles.cn_needle', 'Needle at'), conCentre, function(v) { conSave({ conCentre: v }); }),
              h('div', { className: 'flex flex-col gap-1 min-w-0', style: { flex: '1 1 12rem' } },
                h('label', { htmlFor: 'stem-angles-con-width', className: 'text-xs font-bold text-slate-800' }, fill(t('stem.angles.cn_width', 'Compass width: {w}'), { w: fmt1(conW) })),
                h('input', { id: 'stem-angles-con-width', type: 'range', min: 10, max: 220, step: 0.5, value: conW, 'aria-valuetext': fill(t('stem.angles.cn_width_vt', '{w} units'), { w: fmt1(conW) }),
                  onChange: function(e) { conSave({ conW: Number(e.target.value) }); }, className: 'w-full accent-orange-600', style: { minHeight: 44 } })),
              h('button', { type: 'button', onClick: conAct, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-orange-700 text-white hover:bg-orange-800' }, t('stem.angles.cn_draw_arc', '✏️ Draw arc')))
            : h('div', { className: 'flex flex-wrap gap-3 items-end' },
              ptSelect('stem-angles-con-from', t('stem.angles.cn_from', 'From'), conFrom, function(v) { conSave({ conFrom: v }); }),
              ptSelect('stem-angles-con-through', t('stem.angles.cn_through', 'Through'), conThrough, function(v) { conSave({ conThrough: v }); }),
              h('button', { type: 'button', onClick: conAct, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-orange-700 text-white hover:bg-orange-800' }, t('stem.angles.cn_draw_line', '📏 Draw the ray'))),
            conTool === 'compass' && h('details', { className: 'text-sm' },
              h('summary', { className: 'font-bold cursor-pointer text-slate-900', style: { minHeight: 24 } }, t('stem.angles.cn_measure', 'Open the compass to a segment')),
              h('div', { className: 'flex flex-wrap gap-3 items-end mt-1' },
                ptSelect('stem-angles-con-ma', t('stem.angles.cn_seg_from', 'Point'), conMa, function(v) { conSave({ conMa: v }); }),
                ptSelect('stem-angles-con-mb', t('stem.angles.cn_seg_to', 'to point'), conMb, function(v) { conSave({ conMb: v }); }),
                h('button', { type: 'button', disabled: conMa === conMb, onClick: function() { var w = Math.round(ANG.dist(conPts[conMa], conPts[conMb]) * 100) / 100; conSave({ conW: Math.max(10, Math.min(220, w)) }); announce(fill(t('stem.angles.cn_set_sr', 'Compass opened to {a}{b}: width {w}.'), { a: PTN[conMa], b: PTN[conMb], w: fmt1(w) })); }, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold border border-orange-700 bg-white text-orange-900 disabled:opacity-50' }, t('stem.angles.cn_set_width', 'Set the width'))))),
          msgText && h('p', { role: 'status', 'data-angles-con-msg': conMsg.code, className: resultClass(!!msgOk) }, msgText),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: conUndo, disabled: !con.steps.length || (conVer && conVer.ok), style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-sm font-bold border border-slate-600 bg-white text-slate-900 disabled:opacity-50' }, t('stem.angles.cn_undo', '↶ Undo last step')),
            h('button', { type: 'button', onClick: function() { conNew(); }, style: { minHeight: 44 }, className: 'px-4 py-2 rounded-lg text-sm font-bold bg-slate-800 text-white hover:bg-slate-900' }, t('stem.angles.cn_new', '➡ New angle')),
            typeof setStemLabTool === 'function' && h('button', { type: 'button', onClick: function() { setStemLabTool('geometryProver'); }, style: { minHeight: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold border border-violet-700 text-violet-900 bg-white hover:bg-violet-50' }, t('stem.angles.link_prover', '🔺 Prove it in Geometry Prover')))
        );
      };

      // ══════════════════════════════════════════════════════════════
      // ── Real-world examples (by English class id) ──
      // ══════════════════════════════════════════════════════════════
      var realWorldExamples = {
        'Zero':    [{ icon: '📐', example: t('stem.angles.rw_zero_1', 'A ruler lying flat: both edges overlap') }],
        'Acute':   [
          { icon: '🍕', example: t('stem.angles.rw_acute_1', 'A slice of pizza (about 30° to 45°)') },
          { icon: '✂️', example: t('stem.angles.rw_acute_2', 'Scissors slightly open') },
          { icon: '⛰️', example: t('stem.angles.rw_acute_3', 'A steep mountain slope') },
          { icon: '🕒', example: t('stem.angles.rw_acute_4', 'Clock at 1:00 (30°)') }
        ],
        'Right':   [
          { icon: '📚', example: t('stem.angles.rw_right_1', 'Corner of a book or paper') },
          { icon: '🏠', example: t('stem.angles.rw_right_2', 'Where a wall meets the floor') },
          { icon: '✚️', example: t('stem.angles.rw_right_3', 'A plus sign (+) has four 90° angles') },
          { icon: '🕒', example: t('stem.angles.rw_right_4', 'Clock at 3:00 or 9:00') }
        ],
        'Obtuse':  [
          { icon: '🥏', example: t('stem.angles.rw_obtuse_1', 'A boomerang’s bend') },
          { icon: '📺', example: t('stem.angles.rw_obtuse_2', 'A reclining chair leaned back') },
          { icon: '🕒', example: t('stem.angles.rw_obtuse_3', 'Clock at 4:00 (120°)') }
        ],
        'Straight':  [
          { icon: '↔️', example: t('stem.angles.rw_straight_1', 'A perfectly straight line') },
          { icon: '🕒', example: t('stem.angles.rw_straight_2', 'Clock at 6:00') },
          { icon: '🛣️', example: t('stem.angles.rw_straight_3', 'A road going in both directions') }
        ],
        'Reflex':  [
          { icon: '🔄', example: t('stem.angles.rw_reflex_1', 'The outside angle of an open door') },
          { icon: '⭕', example: t('stem.angles.rw_reflex_2', 'Most of a full rotation') },
          { icon: '🕒', example: t('stem.angles.rw_reflex_3', 'Clock at 7:00, measured clockwise from the minute hand to the hour hand') }
        ],
        'Full':    [{ icon: '⭕', example: t('stem.angles.rw_full_1', 'One complete rotation (360°): a full circle') }]
      };

      // ── Tick marks (labels hidden while an estimate is open) ──
      var tickAngles = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];
      var tickElements = tickAngles.map(function(a) {
        var ar = a * Math.PI / 180;
        var major = a % 90 === 0;
        var mid = a % 30 === 0;
        var tickLen = major ? 12 : mid ? 8 : 4;
        var els = [
          h('line', { key: 'tk' + a, x1: cx + (r - tickLen) * Math.cos(-ar), y1: cy + (r - tickLen) * Math.sin(-ar), x2: cx + (r + 2) * Math.cos(-ar), y2: cy + (r + 2) * Math.sin(-ar), stroke: major ? P.ray : P.muted, strokeWidth: major ? 2 : mid ? 1.5 : 0.8 })
        ];
        if (a % 30 === 0 && !hideNumbers) {
          els.push(h('text', { key: 'tl' + a, x: cx + (r + 16) * Math.cos(-ar), y: cy + (r + 16) * Math.sin(-ar) + 3, textAnchor: 'middle', fill: P.arc, className: 'text-[0.6875rem] font-mono select-none' }, a + '°'));
        }
        return h(React.Fragment, { key: 'tg' + a }, els);
      });

      // Pin markers on protractor
      var pinElements = hideNumbers ? [] : (anglePins || []).map(function(pin, i) {
        var pr = pin.deg * Math.PI / 180;
        var px = cx + (rayLen * 0.7) * Math.cos(-pr);
        var py = cy + (rayLen * 0.7) * Math.sin(-pr);
        return h('g', { key: 'pin' + i },
          h('circle', { cx: px, cy: py, r: 10, fill: '#fde68a', stroke: '#b45309', strokeWidth: 1.5 }),
          h('text', { x: px, y: py + 3, textAnchor: 'middle', fill: '#78350f', className: 'text-[0.625rem] font-bold select-none' }, pin.deg + '°')
        );
      });

      // The explorer protractor. hideReadout drops the number at the vertex (a create challenge).
      var renderExploreSvg = function(opts) {
        var o = opts || {};
        var hideRead = hideNumbers || !!o.hideReadout;
        var svgLabel = hideRead
          ? fill(t('stem.angles.a11y_explore_svg_hidden', 'Interactive protractor. The ray points {clock}.'), { clock: clockText(angleValue) })
          : (hideClass ? fill(t('stem.angles.a11y_explore_svg_noclass', 'Interactive protractor showing {deg}.'), { deg: convertedAngle })
            : fill(t('stem.angles.a11y_explore_svg', 'Interactive protractor showing {deg}, a {cls} angle.'), { deg: convertedAngle, cls: clsLabel(angleClass) }));
        return h('svg', { width: 400, height: 420, viewBox: '0 0 400 420', preserveAspectRatio: 'xMidYMid meet', className: 'select-none', role: 'group', 'aria-label': svgLabel, 'data-protractor-svg': true, style: { width: '100%', height: 'auto', maxWidth: 400, minWidth: 0, flex: '1 1 400px', touchAction: hideNumbers ? 'auto' : 'pinch-zoom' } },
          // Its own themed panel: in the hub's dark theme the tool sits on a white card.
          h('rect', { x: 0, y: 0, width: 400, height: 420, rx: 12, fill: P.panel }),
          h('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: P.arc, strokeWidth: 1 }),
          angleValue > 0 && angleValue < 360 && h('path', {
            d: 'M ' + cx + ' ' + cy + ' L ' + (cx + arcR) + ' ' + cy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + arcEndX + ' ' + arcEndY + ' Z',
            fill: 'hsla(270,80%,60%,0.1)', stroke: 'none'
          }),
          tickElements,
          pinElements,
          h('line', { x1: cx, y1: cy, x2: cx + rayLen, y2: cy, stroke: P.base, strokeWidth: 2 }),
          h('line', { x1: cx, y1: cy, x2: rayEndX, y2: rayEndY, stroke: P.ray, strokeWidth: 3, strokeLinecap: 'round' }),
          showBisector && h('line', { x1: cx, y1: cy, x2: bisEndX, y2: bisEndY, stroke: P.hint, strokeWidth: 1.5, strokeDasharray: '6,3', strokeLinecap: 'round' }),
          showBisector && !hideRead && h('text', { x: bisEndX + 8, y: bisEndY - 4, fill: P.hint, className: 'text-[0.6875rem] font-bold select-none' }, (angleValue / 2).toFixed(1) + '°'),
          showSecondRay && h('line', { x1: cx, y1: cy, x2: ray2EndX, y2: ray2EndY, stroke: P.draw, strokeWidth: 2.5, strokeLinecap: 'round', strokeDasharray: '8,3' }),
          showSecondRay && h('circle', { cx: ray2EndX, cy: ray2EndY, r: rayHandleRadius, fill: P.draw, fillOpacity: 0.15, stroke: P.draw, strokeWidth: 1.5, className: 'cursor-grab', role: 'slider', tabIndex: 0, 'aria-label': t('stem.angles.a11y_second_angle_ray_handle', 'Second angle ray handle'), 'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End', 'aria-valuemin': 0, 'aria-valuemax': 360, 'aria-valuenow': secondAngle, 'aria-valuetext': fill(t('stem.angles.deg_value', '{n} degrees'), { n: secondAngle }), style: { touchAction: 'none' }, onPointerDown: HAS_POINTER ? handleDrag2 : undefined, onMouseDown: HAS_POINTER ? undefined : handleDrag2, onTouchStart: HAS_POINTER ? undefined : handleDrag2, onKeyDown: function(e) { handleAngleKey(e, secondAngle, function(next) { upd('secondAngle', next); }); } }),
          // The angle between the rays would give away a hidden estimate.
          showSecondRay && !hideRead && h('text', { x: cx, y: cy + arcR + 22, textAnchor: 'middle', fill: P.draw, className: 'text-[0.6875rem] font-bold select-none' }, fill(t('stem.angles.between_label', '∠ Between: {n}°'), { n: angleBetween })),
          angleValue > 0 && angleValue < 360 && h('path', {
            d: 'M ' + (cx + arcR) + ' ' + cy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + arcEndX + ' ' + arcEndY,
            fill: 'none', stroke: P.arc, strokeWidth: 1.5
          }),
          angleValue === 90 && h('rect', { x: cx, y: cy - 14, width: 14, height: 14, fill: 'none', stroke: P.ok, strokeWidth: 2 }),
          h('text', { x: cx + arcR * 0.5 * Math.cos(-rad / 2), y: cy + arcR * 0.5 * Math.sin(-rad / 2) + 4, textAnchor: 'middle', fill: P.ink, className: 'text-sm font-bold select-none' },
            hideRead ? '?' : convertedAngle
          ),
          // Draggable handle. While a number is hidden, it reports no number either.
          h('circle', { cx: rayEndX, cy: rayEndY, r: rayHandleRadius, fill: P.ray, fillOpacity: 0.2, stroke: P.ray, strokeWidth: 2, className: 'cursor-grab', role: 'slider', tabIndex: hideNumbers ? -1 : 0, 'aria-label': t('stem.angles.a11y_angle_ray_handle', 'Angle ray handle'), 'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End', 'aria-valuemin': 0, 'aria-valuemax': 360, 'aria-valuenow': hideNumbers ? undefined : angleValue, 'aria-valuetext': hideNumbers ? '?' : convertedAngle, 'aria-disabled': hideNumbers ? 'true' : undefined, style: { filter: 'drop-shadow(0 2px 3px rgba(124,58,237,0.45))', touchAction: 'none' }, onPointerDown: hideNumbers || !HAS_POINTER ? undefined : handleDrag, onMouseDown: hideNumbers || HAS_POINTER ? undefined : handleDrag, onTouchStart: hideNumbers || HAS_POINTER ? undefined : handleDrag, onKeyDown: hideNumbers ? undefined : function(e) { handleAngleKey(e, angleValue, function(next) { setAngleValue(next); }, function() { setAngleFeedback(null); }); } }),
          h('circle', { cx: cx, cy: cy, r: 4, fill: P.vertex }),
          h('text', { x: cx - 12, y: cy + 5, fill: P.muted, className: 'text-[0.6875rem] font-mono select-none' }, 'V')
        );
      };

      // A bare angle (no scale) for estimating; after the check a protractor sits on it.
      var renderEstimateSvg = function() {
        var W = 360, H = 250, vx = 180, vy = 140, L = 110;
        var e1 = ANG.pt(vx, vy, L, estimateBase), e2 = ANG.pt(vx, vy, L, estimateBase + estimateTarget);
        var kids = [h('rect', { key: 'bg', x: 0, y: 0, width: W, height: H, fill: P.panel })];
        if (estimateResult) {
          var pl = { x: vx, y: vy, rot: estimateTarget <= 180 ? estimateBase : ANG.normDeg(estimateBase + estimateTarget) };
          var sc = 0.72;
          kids.push(h('g', { key: 'pg', transform: 'translate(' + vx + ' ' + vy + ') scale(' + sc + ') translate(' + (-vx) + ' ' + (-vy) + ')' }, protractorGroup(pl, false)));
        }
        kids.push(h('line', { key: 'b', x1: vx, y1: vy, x2: e1.x, y2: e1.y, stroke: P.base, strokeWidth: 3, strokeLinecap: 'round' }));
        kids.push(h('line', { key: 'o', x1: vx, y1: vy, x2: e2.x, y2: e2.y, stroke: P.ray, strokeWidth: 3, strokeLinecap: 'round' }));
        kids.push(h('path', { key: 'a', d: arcPath(vx, vy, 22, estimateBase, estimateTarget), fill: 'none', stroke: P.arc, strokeWidth: 1.8 }));
        kids.push(h('circle', { key: 'v', cx: vx, cy: vy, r: 3.5, fill: P.vertex }));
        if (estimateResult) {
          var lp = ANG.pt(vx, vy, 44, estimateBase + estimateTarget / 2);
          kids.push(h('text', { key: 'ans', x: lp.x, y: lp.y + 4, textAnchor: 'middle', fill: P.hint, style: { fontSize: 13, fontWeight: 800 } }, estimateTarget + '°'));
        }
        return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'data-angles-estimate-svg': 'true',
          'aria-label': estimateResult ? fill(t('stem.angles.a11y_est_svg_done', 'The angle measures {m} degrees.'), { m: estimateTarget }) : fill(t('stem.angles.a11y_est_svg', 'An angle to estimate. The first ray points {c1}; the second ray points {c2}.'), { c1: clockText(estimateBase), c2: clockText(estimateBase + estimateTarget) }),
          style: { width: '100%', height: 'auto', maxWidth: 420, display: 'block', margin: '0 auto', borderRadius: 12 } }, kids);
      };
      var BENCH_LABEL = [
        t('stem.angles.bench_0', 'Less than 45°'), t('stem.angles.bench_1', 'Between 45° and 90°'), t('stem.angles.bench_2', 'Between 90° and 135°'),
        t('stem.angles.bench_3', 'Between 135° and 180°'), t('stem.angles.bench_4', 'Between 180° and 270°'), t('stem.angles.bench_5', 'More than 270°')
      ];
      var benchCount = (level === 'g4' && estimateTarget < 180) ? 4 : 6;

      // ══════════════════════════════════════════════════════════════
      // ── Tabs ──
      // ══════════════════════════════════════════════════════════════
      var visibleTabs = lockTab ? ANGLE_TAB_ORDER.filter(function(id) { return id === lockTab || id === 'reference'; }) : ANGLE_TAB_ORDER;
      // Phones fold the tab row to the core tabs (and the open one); "More" shows the rest.
      var tabsFoldable = isNarrow && !lockTab && coreTabs.length > 0;
      var shownTabs = tabsFoldable && !tabsMoreOpen ? visibleTabs.filter(function(id) { return coreTabs.indexOf(id) !== -1 || id === activeTab; }) : visibleTabs;
      var TAB_LABEL = {
        protractor: t('stem.angles.tab_protractor', 'Protractor'), explore: t('stem.angles.tab_explore', 'Explore'), challenges: t('stem.angles.tab_challenges', 'Challenges'),
        puzzles: t('stem.angles.tab_puzzles', 'Angle puzzles'), polygons: t('stem.angles.tab_polygons', 'Polygons'), circles: t('stem.angles.tab_circles', 'Circles'),
        contexts: t('stem.angles.tab_contexts', 'Real world'), construct: t('stem.angles.tab_construct', 'Construct'), tools: t('stem.angles.tab_tools', 'Tools'), reference: t('stem.angles.tab_reference', 'Reference')
      };
      var TAB_ICON = { protractor: '📏', explore: '📐', challenges: '🎯', puzzles: '🧩', polygons: '⬟', circles: '◯', contexts: '🧭', construct: '✂️', tools: '🛠️', reference: '📚' };
      var tabBtn = function(id, label, icon) {
        var active = activeTab === id;
        var tabIndex = shownTabs.indexOf(id);
        var isCore = coreTabs.indexOf(id) !== -1 && !lockTab;
        // The first activity after the core ones starts a new row.
        var firstMore = !lockTab && !isNarrow && coreTabs.length > 0 && tabIndex === coreTabs.length;
        return h('button', { key: id, id: 'stem-angles-tab-' + id, type: 'button', 'data-angles-core-tab': isCore ? 'true' : undefined,
          'aria-describedby': isCore ? 'stem-angles-core-note' : undefined,
          onClick: function() { upd('activeTab', id); if (soundEnabled) sfxClick(); },
          onKeyDown: function(e) {
            var next = tabIndex;
            if (e.key === 'ArrowRight') next = (tabIndex + 1) % shownTabs.length;
            else if (e.key === 'ArrowLeft') next = (tabIndex - 1 + shownTabs.length) % shownTabs.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = shownTabs.length - 1;
            else return;
            e.preventDefault();
            var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
            if (tabs[next]) tabs[next].focus();
            upd('activeTab', shownTabs[next]);
          },
          role: 'tab', 'aria-selected': active,
          'aria-controls': 'stem-angles-panel-' + id,
          tabIndex: active ? 0 : -1,
          style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', gridColumnStart: firstMore ? 1 : undefined, flex: isNarrow ? '1 1 auto' : undefined }, className: 'px-3 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ' +
            (active ? 'bg-purple-700 text-white shadow-md' : isCore ? 'bg-purple-50 text-purple-800 hover:bg-purple-100 border-2 border-purple-700' : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-600')
        }, isCore && h('span', { 'aria-hidden': 'true' }, '★ '), icon + ' ' + label);
      };
      // Levels are named by the skill first; the grades are a guide.
      var LEVEL_LABEL = { g4: t('stem.angles.level_g4_v2', 'Measuring angles (Grades 4–5)'), g57: t('stem.angles.level_g57_v2', 'Angle relationships (Grades 6–8)'), g8: t('stem.angles.level_g8_v2', 'Transversals, circles and radians (Grade 8 and up)') };
      // One control for the level: a menu, so it costs one tab stop, not three.
      var levelControl = function(where) {
        var id = 'stem-angles-level-' + where;
        return h('div', { className: 'flex flex-wrap items-center gap-2', 'data-angles-level': where },
          h('label', { htmlFor: id, className: 'text-xs font-bold text-slate-800' }, t('stem.angles.level_label', 'Level:')),
          h('select', { id: id, value: level, disabled: !!lockLevel, 'data-angles-level-select': 'true',
            onChange: function(e) { var v = e.target.value; if (!lockLevel && ANG.LEVELS.indexOf(v) !== -1) { upd('level', v); announce(fill(t('stem.angles.level_changed_sr', 'Level: {level}.'), { level: LEVEL_LABEL[v] })); } },
            style: { minHeight: 44, maxWidth: '100%', minWidth: 0 }, className: 'rounded-lg border border-slate-500 bg-white px-2 text-sm font-bold text-slate-900 disabled:opacity-60' },
            ANG.LEVELS.map(function(lv) { return h('option', { key: lv, value: lv }, LEVEL_LABEL[lv]); })),
          lockLevel && h('span', { className: 'text-xs text-slate-700' }, t('stem.angles.level_locked', '🔒 set by your teacher')));
      };
      // "Start" moves focus to the activity it opened (the protractor when there is one).
      var focusTask = function() {
        setTimeout(function() {
          try {
            var root = document.querySelector('[data-angles-root]');
            var panel = root && root.querySelector('[role="tabpanel"]:not([hidden])');
            if (!panel) return;
            var target = panel.querySelector('[data-angles-protractor][tabindex="0"]') || panel;
            target.focus();
            if (target.scrollIntoView) target.scrollIntoView({ block: 'center' });
          } catch (e) { /* focus is best effort */ }
        }, 60);
      };

      // ══════════════════════════════════════════════════════════════
      // ── "Start here": a short ordered path for the level. Each tick is
      //    read from progress the tool already saves (credited items, solved
      //    counts, investigation flags), so it needs no new state.
      // ══════════════════════════════════════════════════════════════
      var creditedCount = function(prefix) { return Object.keys(credited).filter(function(k) { return k.indexOf(prefix) === 0; }).length; };
      var sumCounts = function(m) { return plain(m) ? Object.keys(m).reduce(function(s, k) { var v = Number(m[k]); return s + (isFinite(v) && v > 0 ? v : 0); }, 0) : 0; };
      var goTab = function(tab, extra) { upd(Object.assign({ activeTab: tab }, extra || {})); };
      var PATH_STEPS = {
        g4: [
          { id: 'read', label: t('stem.angles.path_g4_read', 'Read an angle with the protractor'), done: creditedCount('read:') >= 1, go: function() { goTab('protractor', { mMode: 'read' }); } },
          { id: 'draw', label: t('stem.angles.path_g4_draw', 'Draw an angle with the protractor'), done: creditedCount('draw:') >= 1, go: function() { goTab('protractor', { mMode: 'draw' }); } },
          { id: 'estimate', label: t('stem.angles.path_g4_estimate', 'Estimate an angle with benchmarks'), done: estimateCount >= 1, go: function() { goTab('challenges'); if (!estimateActive) startEstimate(); } },
          { id: 'compare', label: t('stem.angles.path_g4_compare', 'Compare two angles: do longer rays matter?'), done: creditedCount('cmp:') >= 1, go: function() { goTab('protractor', { mMode: 'compare' }); } },
          { id: 'classify', label: t('stem.angles.path_g4_classify', 'Name angle types: acute, right, obtuse'), done: creditedCount('classify:') >= 1, go: function() {
            goTab('challenges', { estimateActive: false, estimateResult: null });
            if (!angleChallenge || angleChallenge.type !== 'classify' || angleChallenge.done) { var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)]; setAngleChallenge({ type: 'classify', target: ta }); setAngleValue(ta); setAngleFeedback(null); }
          } },
          { id: 'puzzle', label: t('stem.angles.path_g4_puzzle', 'Find a missing angle'), done: sumCounts(pzSolved) >= 1, go: function() { goTab('puzzles'); } }
        ],
        g57: [
          { id: 'puzzles', label: t('stem.angles.path_g57_puzzles', 'Solve 3 missing-angle puzzles'), done: sumCounts(pzSolved) >= 3, go: function() { goTab('puzzles'); } },
          { id: 'why', label: t('stem.angles.path_g57_why', 'Justify an answer with the rule that fits'), done: creditedCount('why:') >= 1, go: function() { goTab('puzzles'); } },
          { id: 'pgsum', label: t('stem.angles.path_g57_pgsum', 'Investigate polygon angle sums: claim, evidence, reasoning'), done: !!pgInv.claim, go: function() { goTab('polygons', { pgMode: 'sum' }); } },
          { id: 'pgext', label: t('stem.angles.path_g57_pgext', 'Walk round a polygon and add up the turns'), done: !!pgInv.ext, go: function() { goTab('polygons', { pgMode: 'ext' }); } },
          { id: 'context', label: t('stem.angles.path_g57_context', 'Solve 2 real-world angle problems'), done: sumCounts(d.cxSolved) >= 2, go: function() { goTab('contexts'); } }
        ],
        g8: [
          { id: 'circle', label: t('stem.angles.path_g8_circle', 'Solve 2 circle-theorem problems'), done: sumCounts(d.ciSolved) >= 2, go: function() { goTab('circles', { ciMode: ciMode === 'unit' ? 'inscribed' : ciMode }); } },
          { id: 'unit', label: t('stem.angles.path_g8_unit', 'Get 3 unit-circle questions right'), done: sumCounts(d.ucSolved) >= 3, go: function() { goTab('circles', { ciMode: 'unit', ucView: 'practice' }); } },
          { id: 'bisect', label: t('stem.angles.path_g8_bisect', 'Bisect an angle with compass and straightedge'), done: (Number(solvedMap('conSolved').bisect) || 0) >= 1, go: function() { goTab('construct'); if (conKind !== 'bisect') conNew('bisect'); } },
          { id: 'copy', label: t('stem.angles.path_g8_copy', 'Copy an angle with compass and straightedge'), done: (Number(solvedMap('conSolved').copy) || 0) >= 1, go: function() { goTab('construct'); if (conKind !== 'copy') conNew('copy'); } },
          { id: 'trans', label: t('stem.angles.path_g8_trans', 'Find angles at parallel lines cut by a transversal'), done: (Number(pzSolved.trans) || 0) >= 1, go: function() { goTab('puzzles'); if (pz.kind !== 'trans') newPuzzle('trans'); } }
        ]
      };
      var pathSteps = PATH_STEPS[level] || PATH_STEPS.g57;
      var pathDone = pathSteps.filter(function(s) { return s.done; }).length;
      var pathNext = pathSteps.filter(function(s) { return !s.done; })[0] || null;
      var renderLearningPath = function() {
        if (lockTab) return null;
        // Folded: one "Next" line with Start; every step and the level sit behind "All steps".
        return h('section', { 'aria-labelledby': 'stem-angles-path-h', 'data-angles-path': level, className: 'rounded-xl border-2 border-violet-300 bg-violet-50 px-3 py-2 space-y-1' },
          h('div', { className: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
            h('h4', { id: 'stem-angles-path-h', className: 'text-sm font-black text-violet-950' }, fill(t('stem.angles.path_title', 'Start here: your path for {level}'), { level: LEVEL_LABEL[level] })),
            h('p', { className: 'text-xs font-bold text-violet-900', 'data-angles-path-count': pathDone }, fill(t('stem.angles.path_count', '{n} of {total} done'), { n: pathDone, total: pathSteps.length })),
            h('p', { className: 'min-w-0 flex-1 text-sm font-bold text-violet-950', style: { flexBasis: '14rem' }, 'data-angles-path-next': pathNext ? pathNext.id : 'none' },
              pathNext ? fill(t('stem.angles.path_next_line', 'Next: {step}'), { step: pathNext.label }) : t('stem.angles.path_all_done', 'Every step is done. Pick any activity.')),
            pathNext && h('button', { type: 'button', 'data-angles-path-start': pathNext.id,
              'aria-label': fill(t('stem.angles.path_start_aria', 'Start the next step: {step}'), { step: pathNext.label }),
              onClick: function() { pathNext.go(); if (soundEnabled) sfxClick(); announce(pathNext.label); focusTask(); }, style: { minHeight: 44, minWidth: 44 },
              className: 'px-4 py-2 rounded-lg text-sm font-black bg-violet-700 text-white hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400' }, t('stem.angles.path_start', 'Start ▸'))),
          h('details', { 'data-angles-path-more': 'true', className: 'text-xs text-violet-950' },
            h('summary', { className: 'cursor-pointer font-bold', style: { paddingTop: 14, paddingBottom: 14 } }, fill(t('stem.angles.path_more', 'All {n} steps, and the level'), { n: pathSteps.length })),
            h('div', { className: 'space-y-2 pb-1' },
            levelControl('path'),
          h('ol', { className: 'grid gap-1.5 sm:grid-cols-2' }, pathSteps.map(function(s, i) {
            var isNext = pathNext && pathNext.id === s.id;
            return h('li', { key: s.id, 'data-angles-path-step': s.id, 'data-done': s.done ? 'true' : 'false' },
              h('button', { type: 'button', onClick: function() { s.go(); if (soundEnabled) sfxClick(); announce(s.label); focusTask(); },
                'aria-current': isNext ? 'step' : undefined, style: { minHeight: 44 },
                className: 'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold border ' + (s.done ? 'bg-green-50 border-green-700 text-green-900' : isNext ? 'bg-white border-violet-700 border-2 text-violet-950' : 'bg-white border-violet-400 text-violet-950') + ' hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500' },
                h('span', { 'aria-hidden': 'true', className: 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full ' + (s.done ? 'bg-green-700 text-white' : 'bg-violet-200 text-violet-950') }, s.done ? '✓' : String(i + 1)),
                h('span', null, s.label),
                h('span', { className: 'ml-auto text-[0.6875rem] font-black ' + (s.done ? 'text-green-800' : 'text-violet-800') }, s.done ? t('stem.angles.path_done', 'Done') : isNext ? t('stem.angles.path_next', 'Next') : '')));
          })),
          coreTabs.length > 0 && h('p', { id: 'stem-angles-core-note', className: 'text-xs text-violet-900' }, fill(t('stem.angles.core_note', '★ marks the core activities for {level}. Every other activity is still open.'), { level: LEVEL_LABEL[level] })))));
      };

      // ══════════════════════════════════════════════════════════════
      // ── Teacher panel (ctx.isTeacherMode only) ──
      // ══════════════════════════════════════════════════════════════
      var setTeacher = function(patch) { updMerge(function(cur) { return { teacher: Object.assign({}, plain(cur.teacher) ? cur.teacher : {}, patch) }; }); };
      var tallyRows = Object.keys(misTally).filter(function(k) { return Number(misTally[k]) > 0; }).sort(function(a, b) { return misTally[b] - misTally[a]; });
      var renderTeacherPanel = function() {
        if (!isTeacher) return null;
        return h('section', { 'aria-labelledby': 'stem-angles-teacher-h', 'data-angles-teacher': 'true', className: 'rounded-xl border-2 border-slate-400 bg-slate-50 p-3 space-y-3' },
          h('h4', { id: 'stem-angles-teacher-h', className: 'text-sm font-black text-slate-900' }, t('stem.angles.teacher_title', '🎓 Teacher controls')),
          h('div', { className: 'grid gap-3 sm:grid-cols-3' },
            h('label', { className: 'min-w-0 text-xs font-bold text-slate-800 flex flex-col gap-1' }, t('stem.angles.teacher_lock_level', 'Lock the level'),
              h('select', { value: teacher.lockLevel || '', onChange: function(e) { setTeacher({ lockLevel: e.target.value || null }); }, style: { minHeight: 44, maxWidth: '100%', minWidth: 0 }, className: 'w-full rounded-lg border border-slate-500 px-2 text-sm' },
                h('option', { value: '' }, t('stem.angles.teacher_no_lock', 'No lock (students choose)')),
                ANG.LEVELS.map(function(lv) { return h('option', { key: lv, value: lv }, LEVEL_LABEL[lv]); }))),
            h('label', { className: 'min-w-0 text-xs font-bold text-slate-800 flex flex-col gap-1' }, t('stem.angles.teacher_lock_tab', 'Lock the activity'),
              h('select', { value: teacher.lockTab || '', onChange: function(e) { setTeacher({ lockTab: e.target.value || null }); }, style: { minHeight: 44, maxWidth: '100%', minWidth: 0 }, className: 'w-full rounded-lg border border-slate-500 px-2 text-sm' },
                h('option', { value: '' }, t('stem.angles.teacher_all_tabs', 'All activities open')),
                ['protractor', 'explore', 'challenges', 'puzzles', 'polygons', 'circles', 'contexts', 'construct', 'tools'].map(function(id) { return h('option', { key: id, value: id }, TAB_LABEL[id]); }))),
            h('label', { className: 'text-xs font-bold text-slate-800 flex items-center gap-2', style: { minHeight: 44 } },
              h('input', { type: 'checkbox', checked: allowReveal, onChange: function() { setTeacher({ noReveal: allowReveal }); }, style: { width: 20, height: 20 } }),
              t('stem.angles.teacher_reveal', 'Show the answer after two wrong tries'))
          ),
          h('div', null,
            h('p', { className: 'text-xs font-bold uppercase tracking-wide text-slate-800' }, t('stem.angles.teacher_missed', 'Missed items by misconception')),
            tallyRows.length === 0 ? h('p', { className: 'text-sm text-slate-700' }, t('stem.angles.teacher_none', 'No missed items recorded yet.'))
              : h('table', { className: 'mt-1 w-full text-sm border-collapse', 'data-angles-tally': 'true' },
                  h('thead', null, h('tr', null,
                    h('th', { scope: 'col', className: 'text-left border-b border-slate-400 py-1' }, t('stem.angles.teacher_col_mis', 'Misconception')),
                    h('th', { scope: 'col', className: 'text-right border-b border-slate-400 py-1' }, t('stem.angles.teacher_col_count', 'Times')))),
                  h('tbody', null, tallyRows.map(function(k) {
                    return h('tr', { key: k }, h('td', { className: 'py-1 border-b border-slate-200' }, MIS_LABEL[k] || k), h('td', { className: 'py-1 border-b border-slate-200 text-right font-bold' }, String(misTally[k])));
                  }))),
            missedLog.length > 0 && h('details', { className: 'mt-2 text-xs text-slate-800' },
              h('summary', { className: 'font-bold cursor-pointer', style: { minHeight: 24 } }, fill(t('stem.angles.teacher_recent', 'Recent misses ({n})'), { n: missedLog.length })),
              h('ul', { className: 'list-disc ml-5' }, missedLog.slice(0, 15).map(function(m, i) {
                return h('li', { key: i }, fill(t('stem.angles.teacher_recent_row', '{kind}: {mis} ({item})'), { kind: m.kind, mis: MIS_LABEL[m.code] || m.code, item: m.item || '' }));
              }))),
            tallyRows.length > 0 && (d.teacherConfirmClear
              ? h('div', { className: 'mt-2 flex gap-2 items-center', role: 'group', 'aria-label': t('stem.angles.teacher_confirm_label', 'Confirm clearing the tally') },
                  h('span', { className: 'text-xs font-bold text-red-800' }, t('stem.angles.teacher_confirm_q', 'Clear the whole tally?')),
                  h('button', { type: 'button', onClick: function() { upd({ misTally: {}, missedLog: [], teacherConfirmClear: false }); announce(t('stem.angles.teacher_cleared', 'Tally cleared.')); }, style: { minHeight: 44 }, className: 'px-3 py-1 rounded-lg text-xs font-bold bg-red-700 text-white' }, t('stem.angles.teacher_yes_clear', 'Yes, clear')),
                  h('button', { type: 'button', onClick: function() { upd('teacherConfirmClear', false); }, style: { minHeight: 44 }, className: 'px-3 py-1 rounded-lg text-xs font-bold border border-slate-500 bg-white' }, t('stem.angles.teacher_cancel', 'Cancel')))
              : h('button', { type: 'button', onClick: function() { upd('teacherConfirmClear', true); }, style: { minHeight: 44 }, className: 'mt-2 px-3 py-1 rounded-lg text-xs font-bold border border-red-700 text-red-800 bg-white' }, t('stem.angles.teacher_clear', 'Clear the tally')))
          )
        );
      };

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      var angleNext = activeTab === 'protractor' ? t('stem.angles.next_protractor', 'Put the protractor centre on the vertex, line up the baseline, then read from the 0 on the base ray.')
        : activeTab === 'puzzles' ? t('stem.angles.next_puzzles', 'Name the relationship first, then write an equation for x.')
        : activeTab === 'polygons' ? t('stem.angles.next_polygons', 'Predict first, then cut polygons into triangles and record what you find.')
        : activeTab === 'circles' ? t('stem.angles.next_circles', 'Predict the angle, check it, then move a point and see what stays the same.')
        : activeTab === 'contexts' ? t('stem.angles.next_contexts', 'Sketch the situation, mark the angle you want, then pick the rule that links it to what you know.')
        : activeTab === 'construct' ? t('stem.angles.next_construct', 'Keep the compass width steady between matching arcs, and check your result with a protractor at the end.')
        : activeTab === 'challenges' ? t('stem.angles.next_challenges', 'Estimate with benchmarks first: is it more or less than 90°?')
        : anglePins.length === 0 ? t('stem.angles.next_explore_pin', 'Estimate the angle, measure it precisely, then save the result as evidence.')
        : showBisector ? t('stem.angles.next_bisector', 'Verify that the bisector creates two equal angles.')
        : t('stem.angles.next_compare_partner', 'Compare this angle with a complementary, supplementary, or reflex partner.');
      var exploreDesc = hideNumbers
        ? fill(t('stem.angles.explore_desc_hidden', 'The base ray points toward 3 o’clock. The other ray points {clock}.'), { clock: clockText(angleValue) })
        : fill(t('stem.angles.explore_desc', 'The base ray points toward 3 o’clock. The other ray points {clock}. The opening is {deg}, turned counterclockwise.'), { clock: clockText(angleValue), deg: convertedAngle });

      var buildMainView = function(libraryNode) {
        var hideRead = hideNumbers;
        return h('div', { 'data-angles-root': 'true', className: 'space-y-3 max-w-5xl mx-auto animate-in fade-in duration-200' },

        // ── Header ──
        h('section', { 'data-protractor-command': 'true', className: 'overflow-hidden rounded-2xl border border-violet-300/40 bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 text-white shadow-xl' },
          // Compact: back, title and the next move on one band. The Explore angle and
          // pin count show on Explore only; elsewhere that angle was a decoy answer.
          h('div', { className: 'px-3 py-2 sm:px-4' },
            h('div', { className: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
              h('button', { type: 'button', onClick: function() { if (setStemLabTool) setStemLabTool(null); }, style: { minHeight: 44, minWidth: 44 }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-violet-300', 'aria-label': t('stem.angles.back_to_tools', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
              h('h3', { className: 'text-lg font-black tracking-tight sm:text-xl' }, t('stem.angles.angle_explorer', '📐 Angle Explorer')),
              // The protractor tab's own prompt already gives this move, so the hero skips it there.
              activeTab !== 'protractor' && h('p', { className: 'min-w-0 flex-1 text-sm font-semibold text-violet-100', style: { flexBasis: '16rem' }, 'data-angles-next-move': 'true' }, angleNext),
              activeTab === 'explore' && h('div', { className: 'flex gap-2', 'data-angles-metrics': 'true' },
                [
                  { key: 'angle', label: t('stem.angles.metric_angle', 'Angle'), value: hideRead ? '?' : String(convertedAngle) },
                  { key: 'pins', label: t('stem.angles.metric_pins', 'Pins'), value: String(anglePins.length) }
                ].map(function(metric) {
                  return h('div', { key: metric.key, 'data-angles-metric': metric.key, className: 'min-w-0 rounded-xl border border-white/15 bg-white/10 px-3 py-1 text-center' },
                    h('div', { className: 'truncate text-sm font-black text-white', title: metric.value }, metric.value),
                    h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider text-violet-200' }, metric.label)
                  );
                })
              )
            )
          )
        ),
        renderLearningPath(),

        // ── Tab Navigation ──
        !tabsFoldable && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(7.5rem, 1fr))' }, className: 'gap-2', role: 'tablist', 'aria-label': t('stem.angles.angle_explorer_sections', 'Angle Explorer sections') },
          visibleTabs.map(function(id) { return tabBtn(id, TAB_LABEL[id], TAB_ICON[id]); })
        ),
        // Phones: the tabs wrap beside one "More" disclosure (outside the tablist, which holds only tabs).
        tabsFoldable && h('div', { 'data-angles-tabs-fold': tabsMoreOpen ? 'open' : 'folded', style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, alignItems: 'start' } },
          h('div', { id: 'stem-angles-tablist', style: { display: 'flex', flexWrap: 'wrap', gap: 8, minWidth: 0 }, role: 'tablist', 'aria-label': t('stem.angles.angle_explorer_sections', 'Angle Explorer sections') },
            shownTabs.map(function(id) { return tabBtn(id, TAB_LABEL[id], TAB_ICON[id]); })),
          h('button', { type: 'button', 'data-angles-tabs-more': 'true', 'aria-expanded': tabsMoreOpen ? 'true' : 'false', 'aria-controls': 'stem-angles-tablist',
            onClick: function() { setTabsMoreOpen(!tabsMoreOpen); if (soundEnabled) sfxClick(); },
            style: { minHeight: 44, minWidth: 44 }, className: 'px-3 py-2 rounded-lg text-xs font-bold bg-white text-purple-800 hover:bg-purple-50 border border-purple-600 focus:outline-none focus:ring-2 focus:ring-violet-400' },
            tabsMoreOpen ? t('stem.angles.tabs_fewer', 'Show fewer') : fill(t('stem.angles.tabs_more', 'More ({n})'), { n: visibleTabs.length - shownTabs.length }))),
        lockTab && h('p', { className: 'text-xs font-bold text-slate-700' }, t('stem.angles.tab_locked_note', '🔒 Your teacher has chosen this activity.')),
        // The level menu lives in the path's "All steps"; with the path hidden by a tab lock it stands here.
        lockTab && (['protractor', 'challenges', 'puzzles', 'polygons', 'circles', 'contexts'].indexOf(activeTab) !== -1) && levelControl('row'),

        // ── Topic-accent hero band per tab ──
        (function() {
          var TAB_META = {
            protractor: { accent: '#0369a1', soft: 'rgba(3,105,161,0.10)', icon: '📏', title: t('stem.angles.hero_protractor', 'Protractor: read, draw and compare angles'), hint: t('stem.angles.hero_protractor_d', 'A protractor has two scales because an angle can open either way. Always start counting from the 0 that sits on the base ray (CCSS 4.MD.6).') },
            explore:    { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '📐', title: t('stem.angles.explore_drag_the_protractor_name_the_a', 'Explore — drag the protractor, name the angle'), hint: t('stem.angles.acute_90_right_90_obtuse_90_180_straig', 'Acute < 90°, right = 90°, obtuse 90–180°, straight = 180°, reflex > 180°. The protractor was invented around 1801; the half-circle version still runs every geometry class.') },
            challenges: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '🎯', title: t('stem.angles.challenges_estimate_classify_measure', 'Challenges — estimate, classify, measure'),     hint: t('stem.angles.estimation_builds_spatial_sense_precis', 'Estimation builds spatial sense; precise measurement builds the protractor habit. Common Core 4.MD.5–7: angles as fractions of a full turn (1/360 of a rotation).') },
            puzzles:    { accent: '#047857', soft: 'rgba(4,120,87,0.10)',   icon: '🧩', title: t('stem.angles.hero_puzzles', 'Angle puzzles: find the missing angle'), hint: t('stem.angles.hero_puzzles_d', 'Angle measures add (4.MD.7). Complementary, supplementary, vertical and triangle facts (7.G.5) and parallel lines cut by a transversal (8.G.5) let you find unknown angles.') },
            polygons:   { accent: '#6d28d9', soft: 'rgba(109,40,217,0.10)', icon: '⬟', title: t('stem.angles.hero_polygons', 'Polygons: angle sums, exterior angles and tilings'), hint: t('stem.angles.hero_polygons_d', 'Cut a polygon into triangles from one vertex to find its angle sum (8.G.5). Walk round it to meet the exterior angles, and find out which regular polygons tile.') },
            circles:    { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '◯', title: t('stem.angles.hero_circles', 'Circles: angle theorems and the unit circle'), hint: t('stem.angles.hero_circles_d', 'Inscribed angles, angles in a semicircle and cyclic quadrilaterals (HSG.C.A.2, HSG.C.A.3); radians and the unit circle (HSF.TF.A.1, HSF.TF.A.2).') },
            contexts:   { accent: '#b45309', soft: 'rgba(180,83,9,0.10)', icon: '🧭', title: t('stem.angles.hero_contexts', 'Real world: clocks, bearings, ramps and roofs'), hint: t('stem.angles.hero_contexts_d', 'Angles solve real problems: the gap between clock hands, a ship’s bearing home, and how steep a ramp or roof is (7.G.5, HSG.SRT.C.8).') },
            construct:  { accent: '#c2410c', soft: 'rgba(194,65,12,0.10)', icon: '✂️', title: t('stem.angles.hero_construct', 'Construct: bisect and copy angles'), hint: t('stem.angles.hero_construct_d', 'With only a compass and a straightedge you can cut an angle exactly in half and copy it anywhere (HSG.CO.D.12).') },
            tools:      { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '🛠',  title: t('stem.angles.hero_tools', 'Tools: clock angles, unit converter, history'), hint: t('stem.angles.hero_tools_d', 'Clock hands, degrees, radians, gradians and turns are all ways of measuring the same amount of turn.') },
            reference:  { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '📚', title: t('stem.angles.hero_reference', 'Reference: angle facts and the geometry library'), hint: t('stem.angles.complementary_sum_to_90_supplementary_', 'Complementary sum to 90°; supplementary to 180°; vertical pairs are equal; alternate interior angles match when lines are parallel. These four facts unlock most middle-school proofs.') }
          };
          var meta = TAB_META[activeTab] || TAB_META.explore;
          // The protractor's prompt and steps already say this: keep only its heading, for screen readers.
          if (activeTab === 'protractor') return h('h3', { 'data-angles-band-sr': 'protractor', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, meta.title);
          return h('div', {
            style: {
              margin: '0 0 12px', padding: '12px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55', borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: isContrast ? '#ffffff' : 'rgb(' + [16, 8, 0].map(function (s) { return Math.round((parseInt(meta.accent.slice(1), 16) >> s & 255) * 0.55); }).join(',') + ')', fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: isContrast ? '#ffffff' : '#475569', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // Inactive tabs keep an (empty, hidden) panel so every aria-controls target exists.
        shownTabs.filter(function(id) { return id !== activeTab; }).map(function(id) {
          return h('div', { key: 'hp-' + id, id: 'stem-angles-panel-' + id, role: 'tabpanel', 'aria-labelledby': 'stem-angles-tab-' + id, hidden: true });
        }),

        h('div', { id: 'stem-angles-panel-' + activeTab, role: 'tabpanel',
          'aria-labelledby': 'stem-angles-tab-' + activeTab, tabIndex: 0 },
          activeTab === 'protractor' && renderProtractorTab(),
          activeTab === 'puzzles' && renderPuzzlesTab(),
          activeTab === 'polygons' && renderPolygonsTab(),
          activeTab === 'circles' && renderCirclesTab(),
          activeTab === 'contexts' && renderContextsTab(),
          activeTab === 'construct' && renderConstructTab(),

          // ══════════════════════════════════════════════════════════
          // ── TAB: Explore ──
          // ══════════════════════════════════════════════════════════
          activeTab === 'explore' && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-2 sm:p-3 flex justify-center relative overflow-x-auto' },
            h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, (hideRead ? '' : convertedAngle + (hideClass ? '' : ', ' + fill(t('stem.angles.sr_cls_angle', '{cls} angle'), { cls: clsLabel(angleClass) })))),
            renderExploreSvg(),
            h('div', { className: 'absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ' + cc.bg + ' ' + cc.text + ' ' + cc.border + ' border' }, hideClass ? '?' : clsLabel(angleClass))
          ),

          // ── Controls row ──
          h('div', { className: 'grid grid-cols-2 gap-2 sm:grid-cols-4' },
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center' },
              h('div', { className: 'text-[0.6875rem] font-bold text-purple-700 uppercase mb-0.5' }, t('stem.angles.angle', 'Angle')),
              h('div', { className: 'text-xl font-bold text-purple-800' }, hideRead ? '?' : convertedAngle)
            ),
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center' },
              h('div', { className: 'text-[0.6875rem] font-bold text-purple-700 uppercase mb-0.5' }, t('stem.angles.type', 'Type')),
              h('div', { className: 'text-base font-bold ' + cc.text }, hideClass ? '?' : clsLabel(angleClass))
            ),
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center' },
              h('div', { className: 'text-[0.6875rem] font-bold text-purple-700 uppercase mb-0.5' }, t('stem.angles.explement', 'Explement')),
              h('div', { className: 'text-base font-bold text-slate-700' }, hideRead ? '?' : explementary + '°')
            ),
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center col-span-1' },
              h('label', { htmlFor: 'stem-angles-unit', className: 'block text-[0.6875rem] font-bold text-purple-700 uppercase mb-0.5' }, t('stem.angles.unit', 'Unit')),
              h('select', { id: 'stem-angles-unit', value: angleUnit, onChange: function(e) { upd('angleUnit', e.target.value); }, 'aria-label': t('stem.angles.angle_unit', 'Angle unit'), style: { minHeight: 32 }, className: 'text-xs font-bold text-purple-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer w-full text-center' },
                h('option', { value: 'deg' }, t('stem.angles.degrees', 'Degrees')),
                h('option', { value: 'rad' }, t('stem.angles.radians', 'Radians')),
                h('option', { value: 'pi' }, t('stem.angles.radians_pi', 'Radians (π form)')),
                h('option', { value: 'grad' }, t('stem.angles.gradians', 'Gradians')),
                h('option', { value: 'turns' }, t('stem.angles.turns', 'Turns'))
              )
            )
          ),

          // Slider
          h('div', { className: 'bg-white rounded-xl p-3 border border-purple-100' },
            h('input', { type: 'range', min: 0, max: 360, step: snapEnabled ? 15 : undefined, value: angleValue, onChange: function(e) { setAngleValue(snapAngle(parseInt(e.target.value, 10))); setAngleFeedback(null); }, 'aria-valuetext': hideRead ? '?' : convertedAngle, disabled: estimateActive, 'aria-label': t('stem.angles.angle_value_slider', 'Angle value slider'), className: 'w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600', style: { boxSizing: 'content-box', padding: '8px 0', backgroundClip: 'content-box' } }),
            // WCAG 2.5.7: the second ray handle is drag-only otherwise; this range sets it by click or tap.
            showSecondRay && h('input', { type: 'range', min: 0, max: 360, step: snapEnabled ? 15 : undefined, value: secondAngle, 'data-angles-second-slider': 'true', onChange: function(e) { upd('secondAngle', snapAngle(parseInt(e.target.value, 10))); }, disabled: estimateActive, 'aria-label': t('stem.angles.a11y_second_angle_ray_handle', 'Second angle ray handle'), className: 'w-full h-2 bg-cyan-200 rounded-lg appearance-none cursor-pointer accent-cyan-600', style: { boxSizing: 'content-box', padding: '8px 0', backgroundClip: 'content-box' } }),
            h('div', { className: 'flex justify-between mt-1 flex-wrap gap-1' },
              h('span', { className: 'text-[0.6875rem] text-slate-600' }, '0°'),
              h('div', { className: 'flex gap-3 flex-wrap' },
                h('label', { className: 'flex items-center gap-1 text-[0.6875rem] text-slate-700 cursor-pointer', style: { minHeight: 24 } },
                  h('input', { type: 'checkbox', checked: snapEnabled, onChange: function() { upd('snapEnabled', !snapEnabled); }, className: 'accent-purple-500' }),
                  t('stem.angles.snap_15', 'Snap 15°')
                ),
                h('label', { className: 'flex items-center gap-1 text-[0.6875rem] text-slate-700 cursor-pointer', style: { minHeight: 24 } },
                  h('input', { type: 'checkbox', checked: showBisector, onChange: function() { upd('showBisector', !showBisector); }, className: 'accent-amber-500' }),
                  t('stem.angles.bisector', 'Bisector')
                ),
                h('label', { className: 'flex items-center gap-1 text-[0.6875rem] text-slate-700 cursor-pointer', style: { minHeight: 24 } },
                  h('input', { type: 'checkbox', checked: showSecondRay, onChange: function() { upd('showSecondRay', !showSecondRay); }, className: 'accent-cyan-500' }),
                  t('stem.angles.2nd_ray', '2nd Ray')
                )
              ),
              h('span', { className: 'text-[0.6875rem] text-slate-600' }, '360°')
            )
          ),

          // Quick angle buttons + Pin
          h('div', { className: 'flex gap-1.5 flex-wrap' },
            [0, 30, 45, 60, 90, 120, 135, 150, 180, 270, 360].map(function(a) {
              return h('button', { type: 'button', 'aria-label': fill(t('stem.angles.a11y_set_angle', 'Set angle to {n} degrees'), { n: a }), 'aria-pressed': !estimateActive && angleValue === a, disabled: estimateActive, key: a, onClick: function() { setAngleValue(a); setAngleFeedback(null); if (soundEnabled) sfxClick(); logAngle(a, 'quick'); },
                style: { minHeight: 32, minWidth: 40 },
                className: 'px-2 py-1 rounded-lg text-[0.6875rem] font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ' + (!estimateActive && angleValue === a ? 'bg-purple-700 text-white shadow' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-600')
              }, a + '°');
            }),
            h('button', { type: 'button', 'aria-label': t('stem.angles.a11y_pin_angle', 'Pin this angle on the protractor'), onClick: pinAngle, disabled: hideRead, style: { minHeight: 32 }, className: 'px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-600 transition-all disabled:opacity-50', title: t('stem.angles.pin_this_angle_on_protractor', 'Pin this angle on protractor') }, t('stem.angles.pin', '📌 Pin'))
          ),

          // Pinned angles
          anglePins.length > 0 && !hideRead && h('div', { className: 'flex gap-1.5 flex-wrap items-center' },
            h('span', { className: 'text-[0.6875rem] text-slate-700 font-bold' }, t('stem.angles.pins_label', 'Pins:')),
            anglePins.map(function(pin, i) {
              return h('button', { type: 'button', 'aria-label': fill(t('stem.angles.a11y_remove_pin', 'Remove the pin at {n} degrees'), { n: pin.deg }), key: i, onClick: function() { removePin(i); }, style: { minHeight: 32 }, className: 'px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-amber-100 text-amber-800 border border-amber-600 hover:bg-red-100 hover:text-red-700 hover:border-red-700 transition-all', title: t('stem.angles.click_to_remove', 'Click to remove') },
                pin.deg + '° ✕'
              );
            })
          ),

          // ── Describe and hear (non-visual equivalents) ──
          h('div', { className: 'rounded-xl border border-slate-300 bg-slate-50 p-3 space-y-1' },
            h('p', { className: 'text-xs font-bold uppercase tracking-wide text-slate-700' }, t('stem.angles.describe_title', 'Describe and hear the angle')),
            h('p', { className: 'text-sm text-slate-800', 'data-angles-explore-desc': 'true' }, exploreDesc),
            h('button', { type: 'button', onClick: function() { playSweep(angleValue); }, 'aria-describedby': 'stem-angles-explore-sweep-help', style: { minHeight: 44 },
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-700 text-white hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400' }, t('stem.angles.hear_angle', '🔊 Hear the opening')),
            h('p', { id: 'stem-angles-explore-sweep-help', className: 'text-xs text-slate-700' }, sweepHelp)
          ),

          // ── Supplementary / Complementary / Relationships ──
          !hideRead && h('div', { className: 'flex gap-2 flex-wrap' },
            complementary != null && h('div', { className: 'flex-1 bg-blue-50 rounded-lg p-2 border border-blue-100 text-center min-w-[120px]' },
              h('div', { className: 'text-[0.6875rem] font-bold text-blue-700 uppercase' }, t('stem.angles.complementary_2', 'Complementary')),
              h('div', { className: 'text-sm font-bold text-blue-700' }, complementary + '°'),
              h('div', { className: 'text-[0.6875rem] text-blue-800' }, angleValue + '° + ' + complementary + '° = 90°')
            ),
            supplementary != null && h('div', { className: 'flex-1 bg-teal-50 rounded-lg p-2 border border-teal-100 text-center min-w-[120px]' },
              h('div', { className: 'text-[0.6875rem] font-bold text-teal-700 uppercase' }, t('stem.angles.supplementary', 'Supplementary')),
              h('div', { className: 'text-sm font-bold text-teal-700' }, supplementary + '°'),
              h('div', { className: 'text-[0.6875rem] text-teal-700' }, angleValue + '° + ' + supplementary + '° = 180°')
            ),
            h('div', { className: 'flex-1 bg-indigo-50 rounded-lg p-2 border border-indigo-100 text-center min-w-[120px]' },
              h('div', { className: 'text-[0.6875rem] font-bold text-indigo-700 uppercase' }, t('stem.angles.vertical_angle', 'Vertical Angle')),
              verticalAngle != null
                ? h(React.Fragment, null,
                    h('div', { className: 'text-sm font-bold text-indigo-700' }, verticalAngle + '°'),
                    h('div', { className: 'text-[0.6875rem] text-indigo-800' }, t('stem.angles.vertical_angles_are_equal', 'Vertical angles are equal!')))
                : h('div', { className: 'text-[0.6875rem] text-indigo-800' }, t('stem.angles.vertical_none', 'None: two crossing lines only make angles between 0° and 180°.'))
            )
          ),

          // ── Real-world examples ──
          !hideClass && h('div', { className: cc.bg + ' rounded-xl p-3 border ' + cc.border },
            h('div', { className: 'text-[0.6875rem] font-bold ' + cc.text + ' uppercase mb-1.5' }, fill(t('stem.angles.real_world_title', '🌍 Real-World {cls} Angles'), { cls: clsLabel(angleClass) })),
            h('div', { className: 'space-y-1' },
              (realWorldExamples[angleClass] || []).map(function(ex, i) {
                return h('div', { key: i, className: 'flex items-center gap-2 text-xs text-slate-700' },
                  h('span', { className: 'text-base', 'aria-hidden': 'true' }, ex.icon),
                  h('span', null, ex.example)
                );
              })
            )
          ),

          // ── AI Tutor (host AI allowed, nothing hidden on screen) ──
          callGemini && !hideRead && !hideClass && h('div', { className: 'bg-pink-50 rounded-xl p-3 border border-pink-200' },
            h('div', { className: 'flex items-center gap-2 mb-1.5' },
              h('span', { className: 'text-[0.6875rem] font-bold text-pink-700 uppercase' }, t('stem.angles.ai_angle_tutor', '🤖 AI Angle Tutor')),
              h('button', { type: 'button', 'aria-label': t('stem.angles.a11y_ask_ai', 'Ask the AI tutor for angle tips'), onClick: askAITutor, disabled: aiLoading, style: { minHeight: 32 }, className: 'ml-auto px-3 py-1 text-[0.6875rem] font-bold rounded-full transition-all ' + (aiLoading ? 'bg-pink-200 text-pink-800 cursor-wait' : 'bg-pink-700 text-white hover:bg-pink-600 cursor-pointer') },
                aiLoading ? t('stem.angles.ai_thinking', '⏳ Thinking...') : t('stem.angles.ai_ask', '✨ Ask for Tips'))
            ),
            aiAdvice
              ? h('div', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, aiAdvice)
              : h('div', { className: 'text-xs text-pink-700' }, t('stem.angles.click_to_get_personalized_angle_tips_2', 'Click to get personalized angle tips!'))
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Challenges ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'challenges' && h('div', { className: 'space-y-3' },
          h('div', { className: 'flex items-center gap-2 text-[0.6875rem] flex-wrap' },
            h('span', { className: 'text-slate-700' + (ctx.isContrast ? ' text-white' : '') }, t('stem.angles.difficulty', 'Difficulty:')),
            h('span', { className: 'font-bold ' + (tolerance <= 2 ? 'text-red-700' : tolerance <= 3 ? 'text-orange-700' : 'text-green-700') },
              tolerance <= 2 ? fill(t('stem.angles.diff_expert', '🔥 Expert (±{n}°)'), { n: tolerance }) : tolerance <= 3 ? fill(t('stem.angles.diff_medium', '⚡ Medium (±{n}°)'), { n: tolerance }) : fill(t('stem.angles.diff_easy', '🌿 Easy (±{n}°)'), { n: tolerance })
            ),
            streak > 0 && h('span', { className: 'text-amber-700 font-bold' }, fill(t('stem.angles.streak_line', '🔥 Streak: {n}'), { n: streak }))
          ),

          // ── Challenge buttons ──
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            h('button', { type: 'button', 'aria-label': t('stem.angles.create', 'Create'),
              onClick: function() {
                var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)];
                setAngleChallenge({ type: 'create', target: ta }); setAngleValue(0); setAngleFeedback(null);
                upd({ estimateActive: false, estimateResult: null });
                logAngle(ta, 'create_challenge');
              },
              style: { minHeight: 44 }, className: 'py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md'
            }, t('stem.angles.create_2', '🎯 Create')),
            h('button', { type: 'button', 'aria-label': t('stem.angles.classify', 'Classify'),
              onClick: function() {
                var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)];
                setAngleChallenge({ type: 'classify', target: ta }); setAngleValue(ta); setAngleFeedback(null);
                upd({ estimateActive: false, estimateResult: null });
                logAngle(ta, 'classify_challenge');
              },
              style: { minHeight: 44 }, className: 'py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md'
            }, t('stem.angles.classify_2', '🧠 Classify')),
            h('button', { type: 'button', 'aria-label': t('stem.angles.estimate', 'Estimate'),
              onClick: startEstimate, style: { minHeight: 44 },
              className: 'py-2.5 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-bold rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-md'
            }, t('stem.angles.estimate_2', '👁️ Estimate')),
            h('button', { type: 'button', 'aria-label': t('stem.angles.speed_round', 'Speed Round'),
              onClick: startSpeedRound, disabled: speedActive, style: { minHeight: 44 },
              className: 'py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold rounded-lg text-sm hover:from-red-600 hover:to-rose-600 transition-all shadow-md disabled:opacity-50'
            }, t('stem.angles.speed_round_2', '⚡ Speed Round'))
          ),

          // ── Speed Round UI ──
          speedActive && h('div', { className: 'bg-red-50 rounded-xl p-4 border-2 border-red-300 animate-in fade-in' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'text-sm font-bold text-red-700' }, t('stem.angles.speed_round_3', '⚡ Speed Round')),
              h('div', { className: 'flex gap-3 items-center' },
                h('div', { className: 'text-lg font-bold text-red-700' }, '⏱ ' + speedTimeLeft + 's'),
                h('div', { className: 'text-lg font-bold text-emerald-700' }, '✔ ' + speedScore)
              )
            ),
            h('div', { className: 'flex gap-2 justify-end mb-2' },
              h('button', { type: 'button', 'aria-label': speedPaused ? t('stem.angles.resume_speed_round', 'Resume speed round') : t('stem.angles.pause_speed_round', 'Pause speed round'), 'aria-pressed': speedPaused ? 'true' : 'false', onClick: toggleSpeedPause, style: { minHeight: 32 }, className: 'px-3 py-1 rounded-lg text-xs font-bold bg-red-700 text-white hover:bg-red-800' }, speedPaused ? t('stem.angles.resume', 'Resume') : t('stem.angles.pause', 'Pause')),
              h('button', { type: 'button', 'aria-label': t('stem.angles.add_fifteen_seconds', 'Add 15 seconds'), onClick: extendSpeedRound, style: { minHeight: 32 }, className: 'px-3 py-1 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800' }, '+15s')
            ),
            speedTarget && h('div', null,
              h('div', { className: 'text-center mb-2' },
                h('div', { className: 'text-3xl font-bold text-red-800' }, speedTarget.angle + '°'),
                h('div', { className: 'text-xs text-red-700' }, t('stem.angles.what_type_of_angle_is_this', 'What type of angle is this?'))
              ),
              h('div', { className: 'flex gap-2 flex-wrap justify-center' },
                ['Acute', 'Right', 'Obtuse', 'Straight', 'Reflex'].map(function(cls) {
                  return h('button', { type: 'button', key: cls, onClick: function() { answerSpeed(cls); }, style: { minHeight: 44 },
                    className: 'px-4 py-2 rounded-lg text-sm font-bold bg-white border-2 border-red-600 text-red-700 hover:bg-red-100 hover:border-red-400 transition-all cursor-pointer'
                  }, clsLabel(cls));
                })
              )
            )
          ),

          // ── Estimate Mode UI: predict a benchmark, type an estimate, then check ──
          estimateActive && h('div', { className: 'bg-amber-50 rounded-xl p-4 border-2 border-amber-300 space-y-2' },
            h('div', { className: 'text-sm font-bold text-amber-800' }, t('stem.angles.estimate_the_angle', '👁️ Estimate the Angle!')),
            h('div', { className: 'text-xs text-amber-900' }, t('stem.angles.estimate_steps', 'No scale and no numbers: first compare the opening with the benchmarks, then type your best estimate.')),
            h('div', { className: 'rounded-lg bg-white border border-amber-300 p-1' }, renderEstimateSvg()),
            h('div', { className: 'flex flex-wrap gap-2' },
              smallBtn('esth', t('stem.angles.hear_angle', '🔊 Hear the opening'), t('stem.angles.a11y_hear_estimate', 'Hear the opening of the angle to estimate'), function() { playSweep(estimateTarget); })
            ),
            h('fieldset', { className: 'rounded-lg border border-amber-400 p-2' },
              h('legend', { className: 'text-xs font-bold text-amber-900 px-1' }, t('stem.angles.bench_q', 'Step 1: Which benchmark range is it in?')),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                BENCH_LABEL.slice(0, benchCount).map(function(lbl, i) {
                  var on = estimateBench === i;
                  var showRight = !!estimateResult && estimateResult.bench === i;
                  return h('button', { key: i, type: 'button', 'aria-pressed': on ? 'true' : 'false', disabled: !!estimateResult, onClick: function() { upd('estimateBench', i); }, style: { minHeight: 44 },
                    className: 'px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 ' + (showRight ? 'bg-green-100 border-green-700 text-green-900' : on ? 'bg-amber-700 border-amber-700 text-white' : 'bg-white border-amber-600 text-amber-900 hover:bg-amber-100') }, lbl);
                })
              )
            ),
            h('div', { className: 'flex gap-2 items-center' },
              h('input', { type: 'number', min: 0, max: 360, value: estimateGuess, disabled: !!estimateResult, placeholder: t('stem.angles.your_guess', 'Your guess...'),
                onChange: function(e) { upd('estimateGuess', e.target.value); },
                'aria-label': t('stem.angles.angle_estimate_guess_in_degrees', 'Angle estimate guess in degrees'), style: { minHeight: 44 },
                className: 'flex-1 px-3 py-2 border-2 border-amber-600 rounded-lg text-sm font-bold text-amber-800 focus:border-amber-500'
              }),
              h('span', { className: 'text-sm text-amber-800', 'aria-hidden': 'true' }, '°'),
              h('button', { type: 'button', 'aria-label': t('stem.angles.check', 'Check'), onClick: checkEstimate, disabled: !!estimateResult, style: { minHeight: 44 }, className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800 transition-all disabled:opacity-50' }, t('stem.angles.check_2', '✔ Check'))
            ),
            estimateMiss && !estimateResult && h('p', { role: 'status', 'data-angles-est-miss': estimateMiss.high ? 'high' : 'low', className: 'p-2 rounded-lg text-sm font-bold bg-amber-100 text-amber-950 border border-amber-600' }, estimateMissText(estimateMiss, estimateTries)),
            !estimateResult && afterTwo('estimate', estimateTries, false, revealEstimate),
            estimateResult && h('div', { role: 'status', className: 'p-2 rounded-lg text-sm font-bold ' + (estimateResult.ok ? 'bg-green-100 text-green-800 border border-green-400' : 'bg-red-100 text-red-800 border border-red-400') },
              estimateResult.ok
                ? (estimateResult.exact ? fill(t('stem.angles.est_exact', '🎯 Perfect! Exactly {target}°!'), { target: estimateResult.target }) : fill(t('stem.angles.est_close', '✅ Close! You guessed {guess}°; the angle is {target}° (off by {diff}°).'), { guess: estimateResult.guess, target: estimateResult.target, diff: estimateResult.diff }))
                : fill(t('stem.angles.est_off', '❌ Off by {diff}°. You guessed {guess}°; the angle is {target}°.'), { diff: estimateResult.diff, guess: estimateResult.guess, target: estimateResult.target }),
              estimateResult.benchOk != null && h('span', { className: 'block text-xs mt-1' }, estimateResult.benchOk ? t('stem.angles.bench_ok', 'Your benchmark range was right.') : fill(t('stem.angles.bench_no', 'The angle was in the range “{r}”.'), { r: BENCH_LABEL[estimateResult.bench] || '' })),
              h('button', { type: 'button', 'aria-label': t('stem.angles.next', 'Next'), onClick: startEstimate, style: { minHeight: 32 }, className: 'ml-2 text-xs font-bold underline' }, t('stem.angles.next_2', '➡ Next'))
            ),
            h('button', { type: 'button', 'aria-label': t('stem.angles.exit_estimate_mode', 'Exit Estimate Mode'), onClick: function() { upd({ estimateActive: false, estimateResult: null }); setAngleValue(45); }, style: { minHeight: 32 }, className: 'text-xs text-amber-800 font-bold hover:underline' }, t('stem.angles.exit_estimate_mode_2', '✖ Exit Estimate Mode'))
          ),

          // ── Create/Classify Challenge UI (with the protractor right here) ──
          angleChallenge && !estimateActive && !speedActive && h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-200' },
            h('p', { className: 'text-sm font-bold text-purple-800 mb-2' },
              angleChallenge.type === 'create'
                ? fill(t('stem.angles.create_prompt', '🎯 Create a {n}° angle (within ±{tol}°)'), { n: angleChallenge.target, tol: tolerance })
                : fill(t('stem.angles.classify_prompt', '🧠 What type of angle is {n}°?'), { n: angleChallenge.target })
            ),
            angleChallenge.type === 'create' && h('div', { className: 'bg-white rounded-xl border border-purple-200 p-2 flex justify-center mb-2' }, renderExploreSvg({ hideReadout: !angleFeedback })),
            angleChallenge.type === 'create' && h('input', { type: 'range', min: 0, max: 360, value: angleValue, 'data-angles-create-slider': 'true', onChange: function(e) { setAngleValue(parseInt(e.target.value, 10)); setAngleFeedback(null); },
              'aria-label': t('stem.angles.a11y_create_slider', 'Turn the ray'), 'aria-valuetext': fill(t('stem.angles.create_valuetext', 'The ray crosses the scale at {n}'), { n: angleValue }), disabled: !!angleChallenge.done,
              className: 'w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600 mb-2', style: { boxSizing: 'content-box', padding: '8px 0', backgroundClip: 'content-box' } }),
            angleChallenge.type === 'create' && h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-purple-700' }, t('stem.angles.your_angle', 'Your angle: '), h('span', { className: 'font-bold text-purple-900' }, angleFeedback ? (angleValue + '°') : '❓')),
              h('button', { type: 'button', 'aria-label': t('stem.angles.check_3', 'Check'), onClick: checkAngle, disabled: !!(angleFeedback && angleFeedback.correct) || !!angleChallenge.done, style: { minHeight: 44 }, className: 'ml-auto px-4 py-1.5 bg-purple-700 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all disabled:opacity-50' }, t('stem.angles.check_4', '✔ Check'))
            ),
            angleChallenge.type === 'classify' && h('div', { className: 'flex gap-2 flex-wrap' },
              ['Acute', 'Right', 'Obtuse', 'Straight', 'Reflex'].map(function(cls) {
                var picked = classifyPicks.indexOf(cls) !== -1, right = !!angleChallenge.done && cls === classifyAngle(angleChallenge.target);
                return h('button', { type: 'button', key: cls,
                  onClick: function() { answerClassify(cls); },
                  disabled: picked || !!angleChallenge.done, 'aria-pressed': picked ? 'true' : 'false', style: { minHeight: 44 },
                  className: 'px-3 py-2 rounded-lg text-sm font-bold transition-all border disabled:cursor-default ' +
                    (right ? 'bg-green-100 border-green-700 text-green-800' : (picked || angleChallenge.done) ? 'bg-slate-50 border-slate-400 text-slate-700' + (picked ? ' line-through' : '') : 'bg-white border-purple-600 text-purple-700 hover:bg-purple-100 hover:border-purple-400 cursor-pointer')
                }, clsLabel(cls));
              })
            ),
            angleFeedback && h('p', { role: 'status', className: 'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-700' : 'text-red-700') }, angleFeedback.msg),
            afterTwo('challenge-' + angleChallenge.type, num(angleChallenge.tries, 0), !!angleChallenge.done, angleChallenge.type === 'create' ? revealCreate : revealClassify),
            (angleFeedback || angleChallenge.done) && h('button', { type: 'button', 'aria-label': t('stem.angles.next_challenge', 'Next Challenge'),
              onClick: function() {
                var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)];
                setAngleChallenge({ type: angleChallenge.type, target: ta });
                if (angleChallenge.type === 'create') setAngleValue(0);
                else setAngleValue(ta);
                setAngleFeedback(null);
              },
              style: { minHeight: 32 }, className: 'mt-2 text-xs text-purple-700 font-bold hover:underline'
            }, t('stem.angles.next_challenge_2', '➡ Next Challenge'))
          ),

          // Reset
          h('div', { className: 'flex gap-2' },
            h('button', { type: 'button', 'aria-label': t('stem.angles.reset', 'Reset'),
              onClick: function() { setAngleValue(45); setAngleChallenge(null); setAngleFeedback(null); if (window.__anglesSpeedTimer) { clearTimeout(window.__anglesSpeedTimer); window.__anglesSpeedTimer = null; } window.__anglesSpeedPaused = false; upd({ estimateActive: false, speedActive: false, speedPaused: false, estimateResult: null }); },
              style: { minHeight: 44 }, className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
            }, t('stem.angles.reset_2', '↺ Reset'))
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Tools ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'tools' && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-white rounded-xl p-4 border border-sky-200' },
            h('div', { className: 'text-xs font-bold text-sky-700 uppercase mb-3' }, t('stem.angles.clock_angle_calculator', '🕒 Clock Angle Calculator')),
            h('div', { className: 'flex gap-4 items-center justify-center mb-3' },
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-sky-700 mb-1' }, t('stem.angles.hour', 'Hour')),
                h('select', { value: clockHour, onChange: function(e) { upd('clockHour', parseInt(e.target.value, 10)); }, 'aria-label': t('stem.angles.clock_hour', 'Clock hour'), style: { minHeight: 44 }, className: 'px-3 py-1.5 border-2 border-sky-500 rounded-lg text-sm font-bold text-sky-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' },
                  [1,2,3,4,5,6,7,8,9,10,11,12].map(function(hr) { return h('option', { key: hr, value: hr }, hr); })
                )
              ),
              h('span', { className: 'text-2xl font-bold text-sky-700', 'aria-hidden': 'true' }, ':'),
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-sky-700 mb-1' }, t('stem.angles.minute', 'Minute')),
                h('select', { value: clockMinute, onChange: function(e) { upd('clockMinute', parseInt(e.target.value, 10)); }, 'aria-label': t('stem.angles.clock_minute', 'Clock minute'), style: { minHeight: 44 }, className: 'px-3 py-1.5 border-2 border-sky-500 rounded-lg text-sm font-bold text-sky-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' },
                  [0,5,10,15,20,25,30,35,40,45,50,55].map(function(m) { return h('option', { key: m, value: m }, m < 10 ? '0' + m : m); })
                )
              )
            ),
            h('div', { className: 'flex justify-center mb-3' },
              h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, fill(t('stem.angles.clock_sr', 'Clock {time}, hands {deg} degrees apart'), { time: clockHour + ':' + (clockMinute < 10 ? '0' : '') + clockMinute, deg: clockAngle.toFixed(1) })),
              h('svg', { width: 120, height: 120, role: 'img', 'aria-label': fill(t('stem.angles.clock_svg', 'Clock showing {time}; hands {deg} degrees apart'), { time: clockHour + ':' + (clockMinute < 10 ? '0' : '') + clockMinute, deg: clockAngle.toFixed(1) }) },
                h('rect', { x: 0, y: 0, width: 120, height: 120, rx: 10, fill: P.panel }),
                h('circle', { cx: 60, cy: 60, r: 55, fill: 'none', stroke: P.muted, strokeWidth: 2 }),
                [1,2,3,4,5,6,7,8,9,10,11,12].map(function(n) {
                  var na = (n * 30 - 90) * Math.PI / 180;
                  return h('text', { key: n, x: 60 + 42 * Math.cos(na), y: 60 + 42 * Math.sin(na) + 4, textAnchor: 'middle', fill: P.ink, className: 'text-[0.6875rem] font-bold select-none' }, n);
                }),
                (function() {
                  var ha = ((clockHour % 12) * 30 + clockMinute * 0.5 - 90) * Math.PI / 180;
                  return h('line', { x1: 60, y1: 60, x2: 60 + 28 * Math.cos(ha), y2: 60 + 28 * Math.sin(ha), stroke: P.ink, strokeWidth: 3, strokeLinecap: 'round' });
                })(),
                (function() {
                  var ma = (clockMinute * 6 - 90) * Math.PI / 180;
                  return h('line', { x1: 60, y1: 60, x2: 60 + 40 * Math.cos(ma), y2: 60 + 40 * Math.sin(ma), stroke: P.ray, strokeWidth: 2, strokeLinecap: 'round' });
                })(),
                h('circle', { cx: 60, cy: 60, r: 3, fill: P.vertex })
              )
            ),
            h('div', { className: 'text-center' },
              h('div', { className: 'text-2xl font-bold text-sky-800' }, clockAngle.toFixed(1) + '°'),
              h('div', { className: 'text-xs text-sky-700' }, fill(t('stem.angles.clock_between', 'Angle between the hands at {time}'), { time: clockHour + ':' + (clockMinute < 10 ? '0' : '') + clockMinute })),
              h('div', { className: 'text-[0.6875rem] mt-1 font-bold ' + (classColors[classifyAngle(Math.round(clockAngle))] || classColors['Acute']).text }, fill(t('stem.angles.sr_cls_angle', '{cls} angle'), { cls: clsLabel(classifyAngle(Math.round(clockAngle))) })),
              h('button', { type: 'button', 'aria-label': t('stem.angles.show_on_protractor', 'Show on protractor'), onClick: function() { setAngleValue(Math.round(clockAngle)); upd('activeTab', 'explore'); }, style: { minHeight: 32 }, className: 'mt-2 text-[0.6875rem] font-bold text-sky-700 underline' }, t('stem.angles.show_on_protractor_2', '→ Show on protractor'))
            )
          ),

          // ── Angle Unit Converter ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-green-200' },
            h('div', { className: 'text-xs font-bold text-green-700 uppercase mb-3' }, t('stem.angles.angle_unit_converter', '🔄 Angle Unit Converter')),
            hideRead ? h('p', { className: 'text-sm text-slate-700' }, t('stem.angles.converter_hidden', 'Hidden while an estimate is open.')) :
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-3' },
              [[t('stem.angles.degrees_2', 'Degrees'), angleValue + '°'], [t('stem.angles.radians_2', 'Radians'), toRadians(angleValue)], [t('stem.angles.radians_pi_short', 'Radians (π)'), ANG.piForm(angleValue)], [t('stem.angles.gradians_2', 'Gradians'), toGradians(angleValue)], [t('stem.angles.turns_2', 'Turns'), toTurns(angleValue)]].map(function(row, i) {
                return h('div', { key: i, className: 'bg-green-50 rounded-lg p-3 text-center' },
                  h('div', { className: 'text-[0.6875rem] font-bold text-green-700 uppercase' }, row[0]),
                  h('div', { className: 'text-lg font-bold text-green-800' }, row[1]));
              })
            ),
            h('div', { className: 'mt-2 text-[0.6875rem] text-green-700 text-center' },
              t('stem.angles.rad_180_200_grad_0_5_turns', 'π rad = 180° = 200 grad = 0.5 turns'))
          ),

          // ── Angle History ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold text-slate-700 uppercase' }, t('stem.angles.recent_angles', '📜 Recent Angles')),
              angleHistory.length > 0 && h('button', { type: 'button', 'aria-label': t('stem.angles.a11y_clear_history', 'Clear the recent angles list'), onClick: function() { upd('angleHistory', []); }, style: { minHeight: 32 }, className: 'text-[0.6875rem] text-slate-700 hover:text-red-700' }, t('stem.angles.clear_2', 'Clear'))
            ),
            angleHistory.length === 0
              ? h('div', { className: 'text-xs text-slate-700 text-center py-2' }, t('stem.angles.no_angles_explored_yet', 'No angles explored yet'))
              : h('div', { className: 'flex gap-1.5 flex-wrap' },
                  angleHistory.slice(0, 15).map(function(entry, i) {
                    return h('button', { type: 'button', 'aria-label': fill(t('stem.angles.a11y_history_chip', 'Show {n} degrees on the explorer'), { n: entry.deg }), key: i, onClick: function() { setAngleValue(entry.deg); upd('activeTab', 'explore'); }, style: { minHeight: 32 },
                      className: 'px-2 py-1 rounded-full text-[0.6875rem] font-bold bg-slate-100 text-slate-700 hover:bg-purple-100 hover:text-purple-700 border border-slate-400 transition-all'
                    }, entry.deg + '°');
                  })
                )
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Reference (angle facts first, then the library) ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'reference' && h('div', { className: 'space-y-3' },
          h('div', { className: 'bg-white rounded-xl p-4 border border-purple-200' },
            h('div', { className: 'text-xs font-bold text-purple-700 uppercase mb-3' }, t('stem.angles.angle_types_reference', '📖 Angle Types Reference')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
              [
                { type: 'Acute', range: '0° < θ < 90°', icon: '🔵', ex: 45, color: 'blue' },
                { type: 'Right', range: 'θ = 90°', icon: '🟢', ex: 90, color: 'green' },
                { type: 'Obtuse', range: '90° < θ < 180°', icon: '🟠', ex: 135, color: 'orange' },
                { type: 'Straight', range: 'θ = 180°', icon: '↔️', ex: 180, color: 'rose' },
                { type: 'Reflex', range: '180° < θ < 360°', icon: '🔴', ex: 270, color: 'red' },
                { type: 'Full', range: 'θ = 360°', icon: '⭕', ex: 360, color: 'purple' }
              ].map(function(ref) {
                var go = function() { setAngleValue(ref.ex); if (soundEnabled) sfxClick(); upd('activeTab', 'explore'); };
                return h('button', { key: ref.type, type: 'button', 'aria-label': fill(t('stem.angles.a11y_ref_card', 'Show a {cls} angle ({n}°) on the explorer'), { cls: clsLabel(ref.type), n: ref.ex }), onClick: go,
                  className: 'text-left p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md bg-' + ref.color + '-50 border-' + ref.color + '-200'
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg', 'aria-hidden': 'true' }, ref.icon),
                    h('span', { className: 'font-bold text-sm text-' + ref.color + '-700' }, clsLabel(ref.type))
                  ),
                  h('div', { className: 'text-[0.6875rem] text-' + ref.color + '-700 font-mono' }, ref.range),
                  h('div', { className: 'text-[0.6875rem] text-' + ref.color + '-700 mt-0.5' }, fill(t('stem.angles.example_n', 'Example: {n}°'), { n: ref.ex }))
                );
              })
            )
          ),
          h('div', { className: 'bg-white rounded-xl p-4 border border-indigo-200' },
            h('div', { className: 'text-xs font-bold text-indigo-700 uppercase mb-3' }, t('stem.angles.angle_relationships', '🔗 Angle Relationships')),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              [
                { name: t('stem.angles.complementary_3', 'Complementary'), desc: t('stem.angles.two_angles_that_add_to_90', 'Two angles that add to 90°'), example: '30° + 60° = 90°', icon: '🧩', color: 'blue' },
                { name: t('stem.angles.supplementary_2', 'Supplementary'), desc: t('stem.angles.two_angles_that_add_to_180', 'Two angles that add to 180°'), example: '60° + 120° = 180°', icon: '⚖️', color: 'teal' },
                { name: t('stem.angles.vertical', 'Vertical'), desc: t('stem.angles.opposite_angles_formed_by_intersecting', 'Opposite angles formed by intersecting lines; always equal'), example: '∠A = ∠C', icon: '✖', color: 'purple' },
                { name: t('stem.angles.adjacent', 'Adjacent'), desc: t('stem.angles.angles_that_share_a_common_vertex_and_', 'Angles that share a common vertex and side'), example: '∠AOB + ∠BOC', icon: '👉', color: 'green' }
              ].map(function(rel) {
                return h('div', { key: rel.icon, className: 'min-w-0 p-3 rounded-xl bg-' + rel.color + '-50 border border-' + rel.color + '-200' },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-base', 'aria-hidden': 'true' }, rel.icon),
                    h('span', { className: 'text-sm font-bold text-' + rel.color + '-700', style: { overflowWrap: 'anywhere' } }, rel.name)
                  ),
                  h('div', { className: 'text-[0.6875rem] text-' + rel.color + '-700 mb-1' }, rel.desc),
                  h('div', { className: 'text-[0.6875rem] text-' + rel.color + '-700 font-mono' }, rel.example)
                );
              })
            )
          ),
          h('div', { className: 'bg-white rounded-xl p-4 border border-emerald-200' },
            h('div', { className: 'text-xs font-bold text-emerald-700 uppercase mb-3' }, t('stem.angles.triangle_angle_sum_a_b_c_180', '🔺 Triangle Angle Sum (∠A + ∠B + ∠C = 180°)')),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-emerald-700 mb-1' }, '∠A'),
                h('input', { type: 'range', min: 5, max: 170, value: triAngle1, onChange: function(e) { upd('triAngle1', parseInt(e.target.value, 10)); }, className: 'w-full accent-emerald-500', 'aria-valuetext': triAngle1 + '°', 'aria-label': t('stem.angles.a11y_tri_a', 'Angle A') }),
                h('div', { className: 'text-center text-sm font-bold text-emerald-800' }, triAngle1 + '°')
              ),
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-emerald-700 mb-1' }, '∠B'),
                h('input', { type: 'range', min: 5, max: 170, value: triAngle2, onChange: function(e) { upd('triAngle2', parseInt(e.target.value, 10)); }, className: 'w-full accent-emerald-500', 'aria-valuetext': triAngle2 + '°', 'aria-label': t('stem.angles.a11y_tri_b', 'Angle B') }),
                h('div', { className: 'text-center text-sm font-bold text-emerald-800' }, triAngle2 + '°')
              ),
              h('div', null,
                h('div', { className: 'text-[0.6875rem] font-bold text-emerald-700 mb-1' }, t('stem.angles.c_computed', '∠C (computed)')),
                h('div', { className: 'text-center text-2xl font-bold mt-1 ' + (triValid ? 'text-emerald-700' : 'text-red-700') }, triAngle3 + '°')
              )
            ),
            h('div', { className: 'text-center text-xs font-bold ' + (triValid ? 'text-emerald-700' : 'text-red-700') },
              triValid
                ? '✅ ' + triAngle1 + '° + ' + triAngle2 + '° + ' + triAngle3 + '° = 180°'
                : t('stem.angles.tri_invalid', '⚠️ Not a triangle: ∠C must be more than 0°.')
            ),
            triValid && h('div', { className: 'mt-2 text-[0.6875rem] text-emerald-700 text-center' },
              fill(t('stem.angles.tri_kind', 'This is a {sides} {angles} triangle.'), {
                sides: (triAngle1 === 60 && triAngle2 === 60) ? t('stem.angles.tri_equilateral', 'equilateral') : (triAngle1 === triAngle2 || triAngle1 === triAngle3 || triAngle2 === triAngle3) ? t('stem.angles.tri_isosceles', 'isosceles') : t('stem.angles.tri_scalene', 'scalene'),
                angles: [triAngle1, triAngle2, triAngle3].some(function(a) { return a === 90; }) ? t('stem.angles.tri_right', 'right') : [triAngle1, triAngle2, triAngle3].some(function(a) { return a > 90; }) ? t('stem.angles.tri_obtuse', 'obtuse') : t('stem.angles.tri_acute', 'acute')
              })
            )
          ),
          h('div', { className: 'bg-white rounded-xl p-4 border border-violet-200' },
            h('div', { className: 'text-xs font-bold text-violet-700 uppercase mb-3' }, t('stem.angles.polygon_interior_angles', '⬡ Polygon Interior Angles')),
            h('div', { className: 'flex gap-2 flex-wrap mb-3' },
              polygonData.map(function(p) {
                var active = selectedPolygon === p.sides;
                return h('button', { type: 'button', key: p.sides, 'aria-pressed': active ? 'true' : 'false', onClick: function() {
                  var explored = Object.assign({}, polygonsExplored);
                  explored[p.sides] = true;
                  upd({ selectedPolygon: p.sides, polygonsExplored: explored });
                  checkBadges({ polygonsExplored: explored });
                },
                  style: { minHeight: 32 },
                  className: 'px-2 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all ' +
                    (active ? 'bg-violet-700 text-white shadow' : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-600')
                }, h('span', { 'aria-hidden': 'true' }, p.icon + ' '), POLY_NAME[p.sides]);
              })
            ),
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('div', { className: 'bg-violet-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[0.6875rem] font-bold text-violet-700 uppercase' }, t('stem.angles.interior_angle', 'Interior Angle')),
                h('div', { className: 'text-xl font-bold text-violet-800' }, polyInterior(selectedPolygon).toFixed(1) + '°')
              ),
              h('div', { className: 'bg-violet-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[0.6875rem] font-bold text-violet-700 uppercase' }, t('stem.angles.exterior_angle', 'Exterior Angle')),
                h('div', { className: 'text-xl font-bold text-violet-800' }, polyExterior(selectedPolygon).toFixed(1) + '°')
              ),
              h('div', { className: 'bg-violet-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[0.6875rem] font-bold text-violet-700 uppercase' }, t('stem.angles.angle_sum', 'Angle Sum')),
                h('div', { className: 'text-xl font-bold text-violet-800' }, polyAngleSum(selectedPolygon) + '°')
              )
            ),
            h('div', { className: 'mt-2 text-[0.6875rem] text-violet-700 text-center' },
              fill(t('stem.angles.poly_formula', 'Formula: interior = (n − 2) × 180° ÷ n, where n = {n}'), { n: selectedPolygon }))
          ),
          libraryNode
        ),
        renderTeacherPanel()
        ),
        // Score, badges, sound and export sit after the activity, so the first tab stops reach the protractor.
        h('div', { className: 'flex flex-wrap items-center justify-between gap-2', 'data-angles-toolbar': 'true' },
          h('div', { className: 'flex items-center gap-2' },
            h('div', { className: 'text-xs font-bold text-emerald-700' }, fill(t('stem.angles.score_line', '✔ {c}/{n}'), { c: exploreScore.correct, n: exploreScore.total })),
            streak > 0 && h('div', { className: 'text-xs font-bold text-amber-700' }, '🔥 ' + streak),
            bestStreak > 0 && h('div', { className: 'text-[0.6875rem] text-slate-600' }, fill(t('stem.angles.best_streak', 'Best: {n}'), { n: bestStreak }))
          ),
          h('div', { className: 'flex items-center gap-1' },
            h('button', { type: 'button', onClick: function() { upd('showBadges', !showBadges); }, 'aria-expanded': showBadges ? 'true' : 'false',
              'aria-label': fill(t('stem.angles.a11y_badges_btn', 'Badges: {n} of {total} earned'), { n: Object.keys(earnedBadges).length, total: badgeDefs.length }),
              style: { minHeight: 32, minWidth: 32 }, className: 'text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border transition-all ' + (showBadges ? 'bg-amber-100 border-amber-600 text-amber-700' : 'bg-slate-100 border-slate-400 text-slate-600 hover:bg-slate-200') },
              '🏅 ' + Object.keys(earnedBadges).length + '/' + badgeDefs.length),
            h('button', { type: 'button', onClick: function() { upd('soundEnabled', !soundEnabled); }, 'aria-label': t('stem.angles.sound_effects', 'Sound effects'), 'aria-pressed': soundEnabled ? 'true' : 'false',
              title: t('stem.angles.sound_effects', 'Sound effects'), style: { minHeight: 32, minWidth: 32 }, className: 'text-sm px-1.5 py-0.5 rounded transition-colors hover:bg-slate-100' },
              soundEnabled ? '🔊' : '🔇'),
            h('button', { type: 'button', 'aria-label': t('stem.angles.a11y_save_snapshot', 'Save a snapshot of this angle'), disabled: hideRead,
              onClick: function() {
                if (hideRead || typeof setToolSnapshots !== 'function') return;
                var snap = { id: 'snap-' + Date.now(), tool: 'protractor', label: fill(t('stem.angles.snapshot_label', 'Angle: {n}°'), { n: angleValue }), data: { angle: angleValue }, timestamp: Date.now() };
                setToolSnapshots(function(prev) { return (prev || []).concat([snap]); });
                if (addToast) addToast(t('stem.angles.snapshot_saved', '📸 Snapshot saved!'), 'success');
                logAngle(angleValue, 'snapshot');
              },
              style: { minHeight: 32, minWidth: 32 }, className: 'text-[0.6875rem] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5 transition-all disabled:opacity-50'
            }, '📸'),
            h('button', { type: 'button', 'aria-label': t('stem.angles.a11y_download_svg', 'Download the explorer diagram as an SVG image'), onClick: exportSVG, style: { minHeight: 32 }, className: 'text-[0.6875rem] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5 transition-all' },
              t('stem.angles.svg', '📥 SVG'))
          )
        ),

        // ── Badge Drawer ──
        showBadges && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, t('stem.angles.achievement_badges', '🏅 Achievement Badges')),
          h('ul', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            badgeDefs.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              var txt = BADGE_TEXT[badge.id] || [badge.id, ''];
              return h('li', { key: badge.id, className: 'flex items-center gap-2 p-2 rounded-lg transition-all ' + (earned ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-slate-400') },
                h('span', { className: 'text-lg', 'aria-hidden': 'true', style: earned ? {} : { filter: 'grayscale(1)', opacity: 0.6 } }, badge.icon),
                h('div', null,
                  h('div', { className: 'text-[0.6875rem] font-bold ' + (earned ? 'text-amber-800' : 'text-slate-700') }, txt[0] + (earned ? '' : ' ' + t('stem.angles.badge_locked', '(not yet)'))),
                  h('div', { className: 'text-[0.6875rem] ' + (earned ? 'text-amber-800' : 'text-slate-600') }, txt[1])
                )
              );
            })
          )
        ),

        h('div', { 'data-angles-coach': 'true', style: isContrast ? { backgroundImage: 'none', backgroundColor: '#000000' } : undefined, className: 'bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100 text-xs text-purple-800 leading-relaxed' },
          streak >= 10 ? fill(t('stem.angles.coach_streak10', '🔥 Incredible {n}-streak! You’re an angle genius!'), { n: streak })
            : streak >= 5 ? fill(t('stem.angles.coach_streak5', '⚡ {n} in a row! Keep the streak alive!'), { n: streak })
            : exploreScore.total === 0 && pathNext ? fill(t('stem.angles.coach_welcome_path', '📐 Welcome! Start with the next step on your path: {step}.'), { step: pathNext.label })
            : exploreScore.correct > 0 && exploreScore.correct === exploreScore.total ? t('stem.angles.coach_perfect', '⭐ Perfect score! Try the angle puzzles next.')
            : !hideClass && angleClass === 'Right' ? t('stem.angles.coach_right', '👍 A right angle (90°) is everywhere — corners of books, screens, and buildings!')
            : !hideClass && angleClass === 'Obtuse' ? t('stem.angles.coach_obtuse', '🤔 Obtuse angles are wider than 90°. A clock at 4:00 shows ≈120°!')
            : !hideClass && angleClass === 'Reflex' ? t('stem.angles.coach_reflex', '🔄 Reflex angles go past 180° — they wrap more than halfway around!')
            : t('stem.angles.coach_default', '💡 Tip: Architects use precise angles to design buildings. The Eiffel Tower’s legs lean in at about 54°.')
        )
      );
      };

      // ── Angles reference library: interactive geometry reference sections ──
      // Library state lives in ctx.toolData.angles (the plugin-bridge surface).
      var d2 = (ctx.toolData && ctx.toolData.angles) || {};
      var expSection = d2.expSection || null;
      function setExp(patch) {
        ctx.setToolData(function(prev) {
          var prior = (prev && prev.angles) || {};
          return Object.assign({}, prev, { angles: Object.assign({}, prior, patch) });
        });
      }

      var ANGLE_TYPES = [
        { name: t('stem.angles.zero', 'Zero'), range: '0\u00B0', icon: '\u2014', desc: t('stem.angles.two_rays_overlap_exactly_no_rotation', 'Two rays overlap exactly. No rotation.') },
        { name: t('stem.angles.acute', 'Acute'), range: '0\u00B0 < \u03B8 < 90\u00B0', icon: '<', desc: t('stem.angles.less_than_a_right_angle_pizza_slice_le', 'Less than a right angle. Pizza slice, "less than square".') },
        { name: t('stem.angles.right', 'Right'), range: '90\u00B0', icon: '\u2310', desc: t('stem.angles.exactly_90_corner_of_a_square_perpendi', 'Exactly 90\u00B0. Corner of a square. Perpendicular lines.') },
        { name: t('stem.angles.obtuse', 'Obtuse'), range: '90\u00B0 < \u03B8 < 180\u00B0', icon: '>', desc: t('stem.angles.between_right_and_straight_wider_than_', 'Between right and straight. Wider than square corner.') },
        { name: t('stem.angles.straight', 'Straight'), range: '180\u00B0', icon: '\u2014', desc: t('stem.angles.half_rotation_the_two_rays_form_a_stra', 'Half rotation. The two rays form a straight line.') },
        { name: t('stem.angles.reflex', 'Reflex'), range: '180\u00B0 < \u03B8 < 360\u00B0', icon: '\u21BA', desc: t('stem.angles.greater_than_a_straight_angle_measure_', 'Greater than a straight angle. Measure the "outside" of the angle.') },
        { name: t('stem.angles.full_rotation', 'Full rotation'), range: '360\u00B0', icon: '\u25CB', desc: t('stem.angles.complete_turn_the_two_rays_overlap_exa', 'Complete turn. The two rays overlap exactly (like 0\u00B0, but went all the way around).') }
      ];

      var ANGLE_RELATIONSHIPS = [
        { name: t('stem.angles.complementary_4', 'Complementary'), condition: t('stem.angles.lib_sum_to_90', 'Sum to 90\u00B0'), example: '30\u00B0 + 60\u00B0 = 90\u00B0', visual: t('stem.angles.lib_two_angles_fit_together_to_make_a_right_angl', 'Two angles fit together to make a right angle.') },
        { name: t('stem.angles.supplementary_3', 'Supplementary'), condition: t('stem.angles.lib_sum_to_180', 'Sum to 180\u00B0'), example: '110\u00B0 + 70\u00B0 = 180\u00B0', visual: t('stem.angles.lib_two_angles_fit_together_to_make_a_straight_l', 'Two angles fit together to make a straight line.') },
        { name: t('stem.angles.vertical_vertically_opposite', 'Vertical (vertically opposite)'), condition: t('stem.angles.lib_equal', 'Equal'), example: t('stem.angles.lib_x_shape_opposite_angles_are_equal', 'X-shape: opposite angles are equal'), visual: t('stem.angles.lib_two_intersecting_lines_make_4_angles_in_2_eq', 'Two intersecting lines make 4 angles in 2 equal pairs.') },
        { name: t('stem.angles.adjacent_2', 'Adjacent'), condition: t('stem.angles.lib_share_a_vertex_ray', 'Share a vertex + ray'), example: t('stem.angles.lib_no_specific_sum', 'No specific sum'), visual: t('stem.angles.lib_two_angles_next_to_each_other_on_either_side', 'Two angles next to each other on either side of a common ray.') },
        { name: t('stem.angles.linear_pair', 'Linear pair'), condition: t('stem.angles.lib_adjacent_supplementary_sum_180', 'Adjacent + supplementary (sum 180\u00B0)'), example: t('stem.angles.lib_on_a_straight_line', 'On a straight line'), visual: t('stem.angles.lib_special_case_of_adjacent_supplementary', 'Special case of adjacent + supplementary.') },
        { name: t('stem.angles.corresponding_parallel_lines_transvers', 'Corresponding (parallel lines + transversal)'), condition: t('stem.angles.lib_equal', 'Equal'), example: t('stem.angles.lib_same_position_at_each_intersection', 'Same position at each intersection'), visual: t('stem.angles.lib_like_position_angles_when_a_line_crosses_two', 'Like-position angles when a line crosses two parallel lines.') },
        { name: t('stem.angles.alternate_interior', 'Alternate interior'), condition: t('stem.angles.lib_equal', 'Equal'), example: t('stem.angles.lib_z_pattern', 'Z-pattern'), visual: t('stem.angles.lib_between_the_parallel_lines_on_opposite_sides', 'Between the parallel lines, on opposite sides of the transversal.') },
        { name: t('stem.angles.alternate_exterior', 'Alternate exterior'), condition: t('stem.angles.lib_equal', 'Equal'), example: t('stem.angles.lib_outside_the_parallels', 'Outside the parallels'), visual: t('stem.angles.lib_outside_the_parallel_lines_on_opposite_sides', 'Outside the parallel lines, on opposite sides of the transversal.') },
        { name: t('stem.angles.co_interior_consecutive_interior', 'Co-interior (consecutive interior)'), condition: t('stem.angles.lib_supplementary_sum_180', 'Supplementary (sum 180\u00B0)'), example: t('stem.angles.lib_c_pattern', 'C-pattern'), visual: t('stem.angles.lib_between_the_parallels_on_the_same_side_of_th', 'Between the parallels on the same side of the transversal.') }
      ];

      var POLYGON_ANGLES = [
        { sides: 3, name: t('stem.angles.triangle', 'Triangle'), interiorSum: '180\u00B0', regularInterior: '60\u00B0', exteriorEach: '120\u00B0', notes: t('stem.angles.lib_sum_is_constant_equilateral_all_60', 'Sum is constant. Equilateral all 60\u00B0.') },
        { sides: 4, name: t('stem.angles.quadrilateral', 'Quadrilateral'), interiorSum: '360\u00B0', regularInterior: '90\u00B0', exteriorEach: '90\u00B0', notes: t('stem.angles.lib_square_regular_has_all_90_sum_holds_even_for', 'Square (regular) has all 90\u00B0. Sum holds even for irregular shapes.') },
        { sides: 5, name: t('stem.angles.pentagon', 'Pentagon'), interiorSum: '540\u00B0', regularInterior: '108\u00B0', exteriorEach: '72\u00B0', notes: t('stem.angles.lib_regular_108_interior', 'Regular: ~108\u00B0 interior.') },
        { sides: 6, name: t('stem.angles.hexagon', 'Hexagon'), interiorSum: '720\u00B0', regularInterior: '120\u00B0', exteriorEach: '60\u00B0', notes: t('stem.angles.lib_regular_hexagons_tile_the_plane_perfectly_ho', 'Regular hexagons tile the plane perfectly (honeycomb).') },
        { sides: 7, name: t('stem.angles.heptagon', 'Heptagon'), interiorSum: '900\u00B0', regularInterior: '~128.6\u00B0', exteriorEach: '~51.4\u00B0', notes: t('stem.angles.lib_cannot_be_constructed_with_compass_straighte', 'Cannot be constructed with compass + straightedge alone.') },
        { sides: 8, name: t('stem.angles.octagon', 'Octagon'), interiorSum: '1080\u00B0', regularInterior: '135\u00B0', exteriorEach: '45\u00B0', notes: t('stem.angles.lib_stop_signs', 'STOP signs.') },
        { sides: 9, name: t('stem.angles.nonagon', 'Nonagon'), interiorSum: '1260\u00B0', regularInterior: '140\u00B0', exteriorEach: '40\u00B0', notes: t('stem.angles.lib_also_called_enneagon', 'Also called enneagon.') },
        { sides: 10, name: t('stem.angles.decagon', 'Decagon'), interiorSum: '1440\u00B0', regularInterior: '144\u00B0', exteriorEach: '36\u00B0', notes: t('stem.angles.lib_regular_decagons_have_10_fold_rotational_sym', 'Regular decagons have 10-fold rotational symmetry.') },
        { sides: 12, name: t('stem.angles.dodecagon', 'Dodecagon'), interiorSum: '1800\u00B0', regularInterior: '150\u00B0', exteriorEach: '30\u00B0', notes: t('stem.angles.lib_some_coins_uk_1_since_2017', 'Some coins (UK \u00A31 since 2017).') },
        { sides: 'n', name: t('stem.angles.n_gon_general', 'n-gon (general)'), interiorSum: '(n\u22122) \u00D7 180\u00B0', regularInterior: '(n\u22122) \u00D7 180\u00B0 / n', exteriorEach: '360\u00B0 / n', notes: t('stem.angles.lib_as_n_the_polygon_approaches_a_circle', 'As n \u2192 \u221E, the polygon approaches a circle.') }
      ];

      var TRIG_REF = [
        { fn: 'sin \u03B8', mnemonic: t('stem.angles.lib_opposite_hypotenuse', 'opposite / hypotenuse'), range: '\u22121 \u2264 sin \u2264 1', notes: t('stem.angles.lib_positive_in_q1_0_90_q2_90_180_sin_30_0_5_sin', 'Positive in Q1 (0-90\u00B0) + Q2 (90-180\u00B0). sin 30\u00B0=0.5, sin 45\u00B0=\u221A2/2, sin 60\u00B0=\u221A3/2, sin 90\u00B0=1.') },
        { fn: 'cos \u03B8', mnemonic: t('stem.angles.lib_adjacent_hypotenuse', 'adjacent / hypotenuse'), range: '\u22121 \u2264 cos \u2264 1', notes: t('stem.angles.lib_positive_in_q1_q4_cos_0_1_cos_30_3_2_cos_45', 'Positive in Q1 + Q4. cos 0\u00B0=1, cos 30\u00B0=\u221A3/2, cos 45\u00B0=\u221A2/2, cos 60\u00B0=0.5, cos 90\u00B0=0.') },
        { fn: 'tan \u03B8', mnemonic: t('stem.angles.lib_opposite_adjacent_sin_cos', 'opposite / adjacent = sin/cos'), range: '\u2212\u221E to +\u221E', notes: t('stem.angles.lib_undefined_at_90_270_tan_30_1_3_tan_45_1_tan', 'Undefined at 90\u00B0, 270\u00B0. tan 30\u00B0=1/\u221A3, tan 45\u00B0=1, tan 60\u00B0=\u221A3.') },
        { fn: 'csc \u03B8', mnemonic: t('stem.angles.lib_1_sin_hyp_opp', '1 / sin = hyp / opp'), range: '|csc| \u2265 1', notes: t('stem.angles.lib_reciprocal_of_sine_undefined_where_sin_0_0_1', 'Reciprocal of sine. Undefined where sin = 0 (0\u00B0, 180\u00B0, 360\u00B0).') },
        { fn: 'sec \u03B8', mnemonic: t('stem.angles.lib_1_cos_hyp_adj', '1 / cos = hyp / adj'), range: '|sec| \u2265 1', notes: t('stem.angles.lib_reciprocal_of_cosine_undefined_where_cos_0_9', 'Reciprocal of cosine. Undefined where cos = 0 (90\u00B0, 270\u00B0).') },
        { fn: 'cot \u03B8', mnemonic: t('stem.angles.lib_1_tan_adj_opp_cos_sin', '1 / tan = adj / opp = cos/sin'), range: t('stem.angles.lib_all_reals', 'all reals'), notes: t('stem.angles.lib_reciprocal_of_tangent_undefined_where_sin_0', 'Reciprocal of tangent. Undefined where sin = 0.') }
      ];

      var ANGLE_UNITS = [
        { unit: t('stem.angles.lib_degrees', 'Degrees'), symbol: '\u00B0', fullCircle: '360\u00B0', use: t('stem.angles.lib_everyday_geometry_navigation_surveying_divid', 'Everyday geometry, navigation, surveying. Divides naturally (90, 60, 45, 30, 18, 15...).') },
        { unit: t('stem.angles.lib_radians', 'Radians'), symbol: 'rad', fullCircle: t('stem.angles.lib_2_rad_6_283', '2\u03C0 rad \u2248 6.283'), use: t('stem.angles.lib_math_calculus_physics_arc_length_r_when_is_i', 'Math, calculus, physics. Arc length = r \u00D7 \u03B8 when \u03B8 is in radians. Natural unit for trig derivatives.') },
        { unit: t('stem.angles.lib_gradians_gons', 'Gradians (gons)'), symbol: 'g', fullCircle: t('stem.angles.lib_400_gons', '400 gons'), use: t('stem.angles.lib_european_surveying_100_gons_right_angle_deci', 'European surveying. 100 gons = right angle. Decimal-friendly.') },
        { unit: t('stem.angles.lib_turns_revolutions', 'Turns (revolutions)'), symbol: 'rev', fullCircle: t('stem.angles.lib_1_turn', '1 turn'), use: t('stem.angles.lib_rotational_mechanics_engineering_1_rev_min_1', 'Rotational mechanics, engineering. 1 rev/min = 1 RPM.') },
        { unit: t('stem.angles.lib_arc_minutes', 'Arc minutes'), symbol: '\u2032', fullCircle: '21,600 \u2032', use: t('stem.angles.lib_astronomy_surveying_1_60_moon_s_apparent_dia', 'Astronomy, surveying. 1\u00B0 = 60\u2032. Moon\'s apparent diameter ~30\u2032.') },
        { unit: t('stem.angles.lib_arc_seconds', 'Arc seconds'), symbol: '\u2033', fullCircle: '1,296,000 \u2033', use: t('stem.angles.lib_astronomy_1_60_hubble_can_resolve_0_05_angle', 'Astronomy. 1\u2032 = 60\u2033. Hubble can resolve ~0.05\u2033 angles.') },
        { unit: t('stem.angles.lib_milliradians_mils', 'Milliradians (mils)'), symbol: t('stem.angles.lib_mrad', 'mrad'), fullCircle: t('stem.angles.lib_6283_mrad', '~6283 mrad'), use: t('stem.angles.lib_ballistics_military_scopes_1_m_at_1_km_dista', 'Ballistics, military scopes. ~1 m at 1 km distance. 1 mrad \u2248 3.4 arc minutes.') }
      ];

      var SPECIAL_ANGLES = [
        { deg: '0\u00B0', rad: '0', sin: '0', cos: '1', tan: '0', notes: t('stem.angles.lib_identity_reference', 'Identity reference.') },
        { deg: '30\u00B0', rad: '\u03C0/6', sin: '1/2', cos: '\u221A3/2', tan: '1/\u221A3', notes: t('stem.angles.lib_half_of_an_equilateral_triangle', 'Half of an equilateral triangle.') },
        { deg: '45\u00B0', rad: '\u03C0/4', sin: '\u221A2/2', cos: '\u221A2/2', tan: '1', notes: t('stem.angles.lib_isosceles_right_triangle_sin_and_cos_equal', 'Isosceles right triangle. Sin and cos equal.') },
        { deg: '60\u00B0', rad: '\u03C0/3', sin: '\u221A3/2', cos: '1/2', tan: '\u221A3', notes: t('stem.angles.lib_equilateral_triangle_vertex', 'Equilateral triangle vertex.') },
        { deg: '90\u00B0', rad: '\u03C0/2', sin: '1', cos: '0', tan: 'undef', notes: t('stem.angles.lib_maximum_sin_tan_blows_up', 'Maximum sin. Tan blows up.') },
        { deg: '120\u00B0', rad: '2\u03C0/3', sin: '\u221A3/2', cos: '\u22121/2', tan: '\u2212\u221A3', notes: t('stem.angles.lib_quadrant_2', 'Quadrant 2.') },
        { deg: '135\u00B0', rad: '3\u03C0/4', sin: '\u221A2/2', cos: '\u2212\u221A2/2', tan: '\u22121', notes: t('stem.angles.lib_quadrant_2_mirror_of_45', 'Quadrant 2 mirror of 45\u00B0.') },
        { deg: '150\u00B0', rad: '5\u03C0/6', sin: '1/2', cos: '\u2212\u221A3/2', tan: '\u22121/\u221A3', notes: t('stem.angles.lib_quadrant_2_mirror_of_30', 'Quadrant 2 mirror of 30\u00B0.') },
        { deg: '180\u00B0', rad: '\u03C0', sin: '0', cos: '\u22121', tan: '0', notes: t('stem.angles.lib_half_rotation', 'Half rotation.') },
        { deg: '270\u00B0', rad: '3\u03C0/2', sin: '\u22121', cos: '0', tan: 'undef', notes: t('stem.angles.lib_minimum_sin_tan_blows_up_again', 'Minimum sin. Tan blows up again.') },
        { deg: '360\u00B0', rad: '2\u03C0', sin: '0', cos: '1', tan: '0', notes: t('stem.angles.lib_full_rotation_back_to_start', 'Full rotation = back to start.') }
      ];

      var REAL_WORLD_ANGLES = [
        { thing: t('stem.angles.lib_pizza_slice_8_cuts', 'Pizza slice (8 cuts)'), angle: '45\u00B0', notes: t('stem.angles.lib_360_8_45_per_slice', '360\u00B0 / 8 = 45\u00B0 per slice.') },
        { thing: t('stem.angles.lib_hexagon_honeycomb_cell', 'Hexagon honeycomb cell'), angle: '120\u00B0', notes: t('stem.angles.lib_each_interior_angle_of_a_regular_hexagon', 'Each interior angle of a regular hexagon.') },
        { thing: t('stem.angles.lib_skyscraper_corner', 'Skyscraper corner'), angle: '90\u00B0', notes: t('stem.angles.lib_most_buildings_use_right_angles_for_structur', 'Most buildings use right angles for structural simplicity.') },
        { thing: t('stem.angles.lib_yield_sign', 'Yield sign'), angle: '60\u00B0', notes: t('stem.angles.lib_equilateral_triangle', 'Equilateral triangle.') },
        { thing: t('stem.angles.lib_stop_sign', 'Stop sign'), angle: '135\u00B0', notes: t('stem.angles.lib_regular_octagon_interior_angles', 'Regular octagon interior angles.') },
        { thing: t('stem.angles.lib_eiffel_tower_incline_legs', 'Eiffel Tower incline (legs)'), angle: '54\u00B0', notes: t('stem.angles.lib_helps_the_structure_resist_wind', 'Helps the structure resist wind.') },
        { thing: t('stem.angles.lib_earth_s_axial_tilt', 'Earth\'s axial tilt'), angle: '23.5\u00B0', notes: t('stem.angles.lib_causes_seasons_tilted_relative_to_orbital_pl', 'Causes seasons. Tilted relative to orbital plane.') },
        { thing: t('stem.angles.lib_critical_angle_water_air_refraction', 'Critical angle (water/air, refraction)'), angle: '~48.6\u00B0', notes: t('stem.angles.lib_beyond_this_angle_light_is_totally_internall', 'Beyond this angle, light is totally internally reflected. Used in fiber optics.') },
        { thing: t('stem.angles.lib_snowflake_symmetry', 'Snowflake symmetry'), angle: t('stem.angles.lib_60_6_fold', '60\u00B0 (6-fold)'), notes: t('stem.angles.lib_hexagonal_ice_crystals_always_have_6_fold_sy', 'Hexagonal ice crystals always have 6-fold symmetry.') },
        { thing: t('stem.angles.lib_dna_helix_angle', 'DNA helix angle'), angle: '~36\u00B0', notes: t('stem.angles.lib_each_base_pair_rotates_36_around_the_helix_a', 'Each base pair rotates ~36\u00B0 around the helix axis (~10 bp per turn).') },
        { thing: t('stem.angles.lib_highway_curve_banking', 'Highway curve banking'), angle: t('stem.angles.lib_varies_5_10', 'varies (5-10\u00B0)'), notes: t('stem.angles.lib_tilts_road_so_gravity_component_balances_cen', 'Tilts road so gravity component balances centripetal force at design speed.') },
        { thing: t('stem.angles.lib_sun_at_zenith_equator_equinox_2', 'Sun at zenith (equator, equinox)'), angle: '90\u00B0', notes: t('stem.angles.lib_sun_directly_overhead_only_happens_between_t', 'Sun directly overhead. Only happens between Tropics during the year.') }
      ];

      var ANGLE_TRICKS = [
        { trick: t('stem.angles.lib_sum_of_angles_in_triangle_180', 'Sum of angles in triangle = 180\u00B0'), use: t('stem.angles.lib_find_missing_angle_if_you_know_the_other_two', 'Find missing angle if you know the other two: 180 \u2212 (a + b).') },
        { trick: t('stem.angles.lib_exterior_angle_of_triangle_sum_of_remote_int', 'Exterior angle of triangle = sum of remote interior'), use: t('stem.angles.lib_faster_than_calculating_then_subtracting_fro', 'Faster than calculating + then subtracting from 180.') },
        { trick: t('stem.angles.lib_angles_in_same_segment_of_circle_are_equal', 'Angles in same segment of circle are equal'), use: t('stem.angles.lib_inscribed_angle_theorem_subtend_same_arc_equ', 'Inscribed angle theorem. Subtend same arc \u2192 equal.') },
        { trick: t('stem.angles.lib_inscribed_angle_1_2_central_angle', 'Inscribed angle = \u00BD central angle'), use: t('stem.angles.lib_central_inscribed_angle_subtend_same_arc_ins', 'Central + inscribed angle subtend same arc; inscribed is exactly half.') },
        { trick: t('stem.angles.lib_tangent_radius_at_point_of_contact', 'Tangent \u22A5 radius at point of contact'), use: t('stem.angles.lib_right_angle_at_tangent_point_useful_for_many', 'Right angle at tangent point. Useful for many circle problems.') },
        { trick: t('stem.angles.lib_pythagorean_identity', 'Pythagorean identity'), use: t('stem.angles.lib_sin2_cos2_1_find_one_trig_value_from_another', 'sin\u00B2\u03B8 + cos\u00B2\u03B8 = 1. Find one trig value from another.') },
        { trick: t('stem.angles.lib_cast_rule_quadrant_signs', 'CAST rule (quadrant signs)'), use: t('stem.angles.lib_c_iv_cos_a_i_all_s_ii_sin_t_iii_tan_memorize', 'C(IV: cos+), A(I: all+), S(II: sin+), T(III: tan+). Memorize quadrant signs of trig functions.') },
        { trick: t('stem.angles.lib_sin_180_sin', 'sin(180\u00B0 \u2212 \u03B8) = sin \u03B8'), use: t('stem.angles.lib_supplementary_angles_have_same_sine_useful_i', 'Supplementary angles have same sine. Useful in triangle problems.') },
        { trick: t('stem.angles.lib_cos_360_cos', 'cos(360\u00B0 \u2212 \u03B8) = cos \u03B8'), use: t('stem.angles.lib_cosine_is_symmetric_about_0_cosine_is_an_eve', 'Cosine is symmetric about 0\u00B0 (cosine is an even function).') },
        { trick: t('stem.angles.lib_doubling_formula_sin_2_2_sin_cos', 'Doubling formula: sin 2\u03B8 = 2 sin \u03B8 cos \u03B8'), use: t('stem.angles.lib_compute_trig_of_doubled_angle_from_original', 'Compute trig of doubled angle from original.') }
      ];

      var COMPASS_BEARINGS = [
        { dir: 'N', bearing: '0\u00B0' }, { dir: 'NNE', bearing: '22.5\u00B0' }, { dir: 'NE', bearing: '45\u00B0' }, { dir: 'ENE', bearing: '67.5\u00B0' },
        { dir: 'E', bearing: '90\u00B0' }, { dir: 'ESE', bearing: '112.5\u00B0' }, { dir: 'SE', bearing: '135\u00B0' }, { dir: 'SSE', bearing: '157.5\u00B0' },
        { dir: 'S', bearing: '180\u00B0' }, { dir: 'SSW', bearing: '202.5\u00B0' }, { dir: 'SW', bearing: '225\u00B0' }, { dir: 'WSW', bearing: '247.5\u00B0' },
        { dir: 'W', bearing: '270\u00B0' }, { dir: 'WNW', bearing: '292.5\u00B0' }, { dir: 'NW', bearing: '315\u00B0' }, { dir: 'NNW', bearing: '337.5\u00B0' }
      ];

      var ANGLES_GLOSSARY = [
        { term: t('stem.angles.lib_vertex', 'Vertex'), def: t('stem.angles.lib_the_common_endpoint_of_two_rays_that_form_an', 'The common endpoint of two rays that form an angle.') },
        { term: t('stem.angles.lib_ray', 'Ray'), def: t('stem.angles.lib_half_of_a_line_starts_at_a_point_extends_inf', 'Half of a line \u2014 starts at a point, extends infinitely in one direction.') },
        // The vertex angle is formed BY the equal sides; it used to read "opposite
        // the equal sides", the same place given for the base angles below.
        { term: t('stem.angles.lib_vertex_angle', 'Vertex angle'), def: t('stem.angles.lib_in_an_isosceles_triangle_the_angle_formed_by', 'In an isosceles triangle, the angle formed by the two equal sides. It is opposite the base.') },
        { term: t('stem.angles.lib_base_angle', 'Base angle'), def: t('stem.angles.lib_in_an_isosceles_triangle_one_of_the_two_equa', 'In an isosceles triangle, one of the two equal angles at the ends of the base. Each is opposite one of the equal sides.') },
        { term: t('stem.angles.lib_bisector', 'Bisector'), def: t('stem.angles.lib_a_ray_that_divides_an_angle_into_two_equal_a', 'A ray that divides an angle into two equal angles.') },
        { term: t('stem.angles.lib_perpendicular', 'Perpendicular'), def: t('stem.angles.lib_two_lines_that_meet_at_a_right_angle_90', 'Two lines that meet at a right angle (90\u00B0).') },
        { term: t('stem.angles.lib_parallel', 'Parallel'), def: t('stem.angles.lib_two_lines_that_never_meet_same_slope_always', 'Two lines that never meet (same slope). Always equidistant.') },
        { term: t('stem.angles.lib_transversal', 'Transversal'), def: t('stem.angles.lib_a_line_that_crosses_two_or_more_other_lines', 'A line that crosses two or more other lines.') },
        { term: t('stem.angles.lib_coterminal_angles', 'Coterminal angles'), def: t('stem.angles.lib_angles_with_same_initial_terminal_sides_but', 'Angles with same initial + terminal sides but different rotations. E.g., 30\u00B0 and 390\u00B0 are coterminal.') },
        { term: t('stem.angles.lib_reference_angle', 'Reference angle'), def: t('stem.angles.lib_the_acute_angle_between_the_terminal_side_an', 'The acute angle between the terminal side and the x-axis. Always between 0\u00B0 and 90\u00B0.') },
        { term: t('stem.angles.lib_polar_angle', 'Polar angle (\u03B8)'), def: t('stem.angles.lib_in_polar_coordinates_the_angle_from_the_posi', 'In polar coordinates, the angle from the positive x-axis to the point.') },
        { term: t('stem.angles.lib_azimuth', 'Azimuth'), def: t('stem.angles.lib_horizontal_angle_measured_clockwise_from_a_r', 'Horizontal angle measured clockwise from a reference direction (usually north). Used in navigation, astronomy.') },
        { term: t('stem.angles.lib_altitude_angle', 'Altitude angle'), def: t('stem.angles.lib_vertical_angle_above_the_horizon_0_horizon_9', 'Vertical angle above the horizon. 0\u00B0 = horizon, 90\u00B0 = zenith.') },
        { term: t('stem.angles.lib_angle_of_incidence', 'Angle of incidence'), def: t('stem.angles.lib_angle_between_incoming_ray_and_normal_to_sur', 'Angle between incoming ray and normal to surface.') },
        { term: t('stem.angles.lib_angle_of_refraction', 'Angle of refraction'), def: t('stem.angles.lib_angle_between_refracted_ray_and_normal_snell', 'Angle between refracted ray and normal. Snell\'s law relates the two.') },
        { term: t('stem.angles.lib_angle_of_elevation', 'Angle of elevation'), def: t('stem.angles.lib_angle_above_horizontal_to_a_point_above_e_g', 'Angle above horizontal to a point above (e.g., top of a tree).') },
        { term: t('stem.angles.lib_angle_of_depression', 'Angle of depression'), def: t('stem.angles.lib_angle_below_horizontal_to_a_point_below', 'Angle below horizontal to a point below.') }
      ];

      function expHeader() {
        return h('div', { 'data-angles-ref-head': 'true', style: isContrast ? { backgroundImage: 'none', backgroundColor: '#000000' } : undefined, className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-rose-900' }, t('stem.angles.angles_reference_library', '\uD83D\uDCD0 Angles Reference Library')),
            h('div', { className: 'text-[0.6875rem] text-rose-700 mt-0.5' }, t('stem.angles.interactive_geometry_references_pick_a', 'Interactive geometry references \u2014 pick a topic.'))
          ),
          expSection && h('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'px-3 py-1 rounded-md text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100'
          }, t('stem.angles.close_section', '\u2715 Close section'))
        );
      }

      function expTabBar() {
        // 47 angle/geometry sections grouped into 6 cohesive domains. All
        // IDs preserved. Groups: Angles & Trig \u00B7 Shapes & Solids \u00B7 Coords
        // & Transforms \u00B7 Real World \u00B7 Math History \u00B7 Reference.
        var TAB_GROUPS = [
          { id: 'angles', label: t('stem.angles.angles_trig', 'Angles & Trig'), color: 'rose', tabs: [
            { id: 'types', label: t('stem.angles.types', 'Types'), icon: '<' },
            { id: 'relationships', label: t('stem.angles.relationships', 'Relationships'), icon: '\u2AEF' },
            { id: 'special', label: t('stem.angles.special_angles', 'Special angles'), icon: '\u2605' },
            { id: 'units', label: t('stem.angles.angle_units', 'Angle units'), icon: '\u00B0' },
            { id: 'trig', label: t('stem.angles.trig_functions', 'Trig functions'), icon: 'sin' },
            { id: 'pythag', label: t('stem.angles.pythagorean', 'Pythagorean'), icon: 'a\u00B2+b\u00B2' },
            { id: 'theorems', label: t('stem.angles.classic_theorems', 'Classic theorems'), icon: '\u220E' },
            { id: 'tricks', label: t('stem.angles.shortcuts', 'Shortcuts'), icon: '\u26A1' }
          ] },
          { id: 'shapes', label: t('stem.angles.shapes_solids', 'Shapes & Solids'), color: 'amber', tabs: [
            { id: 'triangles', label: t('stem.angles.triangle_types', 'Triangle types'), icon: '\u25B3' },
            { id: 'polygons', label: t('stem.angles.polygon_angles', 'Polygon angles'), icon: '\u2B21' },
            { id: 'circle', label: t('stem.angles.circle_geometry', 'Circle geometry'), icon: '\u25EF' },
            { id: 'conics', label: t('stem.angles.conic_sections', 'Conic sections'), icon: '\u25C9' },
            { id: 'solids', label: t('stem.angles.3d_solids', '3D solids'), icon: '\u2B22' },
            { id: 'platonic', label: t('stem.angles.platonic_solids', 'Platonic solids'), icon: '\u2B21' },
            { id: 'curves', label: t('stem.angles.famous_curves', 'Famous curves'), icon: '\u223F' },
            { id: 'shapes_iq', label: t('stem.angles.shape_facts', 'Shape facts'), icon: '\u25C7' }
          ] },
          { id: 'coords', label: t('stem.angles.coords_transforms', 'Coords & Transforms'), color: 'cyan', tabs: [
            { id: 'coords', label: t('stem.angles.coordinates', 'Coordinates'), icon: '(x,y)' },
            { id: 'vectors', label: t('stem.angles.vectors', 'Vectors'), icon: '\u2192' },
            { id: 'transform', label: t('stem.angles.transformations', 'Transformations'), icon: '\u21BB' },
            { id: 'symmetry', label: t('stem.angles.symmetry', 'Symmetry'), icon: '\u27C2' },
            { id: 'tilings', label: t('stem.angles.tessellations', 'Tessellations'), icon: '\u2B21' },
            { id: 'tessell2', label: t('stem.angles.famous_tilings', 'Famous tilings'), icon: '\u25C7' },
            { id: 'fractals', label: t('stem.angles.fractals', 'Fractals'), icon: '\u2744' },
            { id: 'noneuclid', label: t('stem.angles.lib_non_euclidean', 'Non-Euclidean'), icon: '\u2295' },
            { id: 'goldenratio', label: t('stem.angles.golden_ratio', 'Golden ratio'), icon: '\u03C6' }
          ] },
          { id: 'world', label: t('stem.angles.real_world', 'Real World'), color: 'emerald', tabs: [
            { id: 'world', label: t('stem.angles.lib_real_world', 'Real-world'), icon: '\uD83C\uDF0D' },
            { id: 'practical', label: t('stem.angles.practical_angles', 'Practical angles'), icon: '\uD83D\uDEE0' },
            { id: 'tools', label: t('stem.angles.measuring_tools', 'Measuring tools'), icon: '\uD83D\uDCCF' },
            { id: 'compass', label: t('stem.angles.compass', 'Compass'), icon: '\uD83E\uDDED' },
            { id: 'sundial', label: t('stem.angles.sundials', 'Sundials'), icon: '\u263C' },
            { id: 'sports', label: t('stem.angles.angles_in_sports', 'Angles in sports'), icon: '\uD83C\uDFC6' },
            { id: 'art', label: t('stem.angles.angles_in_art', 'Angles in art'), icon: '\uD83C\uDFA8' },
            { id: 'origami', label: t('stem.angles.origami_geometry', 'Origami geometry'), icon: '\u2726' },
            { id: 'building_angles', label: t('stem.angles.roof_ramp_pitch', 'Roof + ramp pitch'), icon: '\u25E2' },
            { id: 'buildings', label: t('stem.angles.famous_structures', 'Famous structures'), icon: '\uD83C\uDFDB' },
            { id: 'flag_design', label: t('stem.angles.flag_geometry', 'Flag geometry'), icon: '\uD83D\uDEA9' },
            { id: 'projection', label: t('stem.angles.map_projections', 'Map projections'), icon: '\uD83D\uDDFA' },
            { id: 'rivers', label: t('stem.angles.earth_measurements', 'Earth measurements'), icon: '\uD83C\uDF0E' },
            { id: 'cities', label: t('stem.angles.city_coordinates', 'City coordinates'), icon: '\uD83C\uDF06' },
            { id: 'mountains', label: t('stem.angles.mountains_peaks', 'Mountains + peaks'), icon: '\u26F0' },
            { id: 'planets', label: t('stem.angles.planet_data', 'Planet data'), icon: '\uD83E\uDE90' }
          ] },
          { id: 'history', label: t('stem.angles.history_careers', 'History & Careers'), color: 'violet', tabs: [
            { id: 'famous', label: t('stem.angles.history', 'History'), icon: '\uD83D\uDD70' },
            { id: 'mathematicians', label: t('stem.angles.mathematicians', 'Mathematicians'), icon: '\uD83D\uDC68\u200D\uD83C\uDFEB' },
            { id: 'careers', label: t('stem.angles.careers_using_angles', 'Careers using angles'), icon: '\uD83D\uDCBC' }
          ] },
          { id: 'reference', label: t('stem.angles.reference', 'Reference'), color: 'slate', tabs: [
            { id: 'constants', label: t('stem.angles.math_constants', 'Math constants'), icon: '\u03C0' },
            { id: 'puzzles', label: t('stem.angles.geometry_puzzles', 'Geometry puzzles'), icon: '\uD83E\uDDE9' },
            { id: 'glossary', label: t('stem.angles.glossary', 'Glossary'), icon: '\uD83D\uDCD6' }
          ] }
        , { id: 'pisaCross', label: t('stem.angles.pisa_linked_reps', 'Pisa: linked reps'), icon: '\uD83D\uDDFC' }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return h('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[0.6875rem] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-' + accent + '-50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return h('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            // A standalone entry (no .tabs — e.g. the Pisa linked-reps tab) renders as a single
            // button. Without this guard `g.tabs.map` threw "Cannot read properties of undefined
            // (reading 'map')" and crashed the whole protractor tool on render.
            if (!g.tabs) return renderBtn(g, g.color || 'slate');
            return h('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              h('span', { 'aria-hidden': 'true', className: 'text-[0.625rem] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              g.tabs.map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      function renderTypesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.types_of_angles_by_size', '< Types of angles by size')),
          h('div', { className: 'space-y-2' },
            ANGLE_TYPES.map(function(a, i) {
              return h('div', { key: 'a'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-xl text-rose-600 font-mono' }, a.icon),
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, a.name),
                  h('span', { className: 'text-[0.6875rem] font-bold ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono' }, a.range)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, a.desc)
              );
            })
          )
        );
      }

      function renderRelationshipsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angle_pair_relationships', '\u2AEF Angle pair relationships')),
          h('div', { className: 'space-y-2' },
            ANGLE_RELATIONSHIPS.map(function(r, i) {
              return h('div', { key: 'r'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, r.name),
                  h('span', { className: 'text-[0.625rem] font-bold ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, r.condition)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-0.5' }, h('strong', null, t('stem.angles.lib_example', 'Example: ')), r.example),
                h('div', { className: 'text-[0.6875rem] text-slate-600 italic' }, r.visual)
              );
            })
          )
        );
      }

      function renderPolygonsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.polygon_angle_sums', '\u2B21 Polygon angle sums')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.interior_angle_sum_n_2_180_for_any_n_s', 'Interior angle sum = (n \u2212 2) \u00D7 180\u00B0 for any n-sided polygon. Each exterior angle of a REGULAR polygon = 360\u00B0/n. Sum of exterior angles always = 360\u00B0.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['n', t('stem.angles.lib_name', 'Name'), t('stem.angles.lib_sum_interior', 'Sum interior'), t('stem.angles.lib_each_regular', 'Each (regular)'), t('stem.angles.lib_each_exterior', 'Each exterior'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                POLYGON_ANGLES.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-bold text-slate-800' }, p.sides),
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.name),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, p.interiorSum),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, p.regularInterior),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, p.exteriorEach),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderTrigSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.sin_trigonometric_functions', 'sin Trigonometric functions')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.soh_cah_toa_sine_opp_hyp_cosine_adj_hy', 'SOH-CAH-TOA: Sine = Opp/Hyp, Cosine = Adj/Hyp, Tangent = Opp/Adj. The trig functions express ratios of right-triangle sides; extended to all angles via the unit circle.')),
          h('div', { className: 'space-y-2' },
            TRIG_REF.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-base font-black text-rose-700 font-mono min-w-[48px]' }, t.fn),
                  h('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, t.mnemonic),
                  h('span', { className: 'text-[0.625rem] font-mono ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, t.range)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      function renderSpecialSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.special_angles_unit_circle', '\u2605 Special angles (unit circle)')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.these_angles_their_trig_values_are_wor', 'These angles + their trig values are worth memorizing \u2014 they appear constantly in math, physics, and engineering.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_degrees', 'Degrees'), t('stem.angles.lib_radians', 'Radians'), t('stem.angles.lib_sin', 'sin'), t('stem.angles.lib_cos', 'cos'), t('stem.angles.lib_tan', 'tan'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SPECIAL_ANGLES.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-bold text-slate-800' }, s.deg),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.rad),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.sin),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.cos),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.tan),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderUnitsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angle_units_2', '\u00B0 Angle units')),
          h('div', { className: 'space-y-2' },
            ANGLE_UNITS.map(function(u, i) {
              return h('div', { key: 'u'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, u.unit),
                  h('span', { className: 'text-[0.6875rem] font-bold ml-2 text-rose-700' }, u.symbol),
                  h('span', { className: 'text-[0.625rem] font-mono ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, u.fullCircle)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, u.use)
              );
            })
          ),
          h('div', { className: 'mt-3 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[0.6875rem] text-amber-900' },
            h('strong', null, t('stem.angles.conversions', '\uD83D\uDD01 Conversions: ')), t('stem.angles.1_rad_180_57_296_1_180_0_01745_rad_1_g', '1 rad = 180/\u03C0 \u2248 57.296\u00B0. 1\u00B0 = \u03C0/180 \u2248 0.01745 rad. 1 gon = 0.9\u00B0. Most calculators have a degrees/radians mode toggle \u2014 make sure you\'re in the right mode!')
          )
        );
      }

      function renderWorldSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.real_world_angles', '\uD83C\uDF0D Real-world angles')),
          h('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            REAL_WORLD_ANGLES.map(function(r, i) {
              return h('div', { key: 'r'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, r.thing),
                  h('span', { className: 'text-[0.6875rem] font-mono ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold' }, r.angle)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, r.notes)
              );
            })
          )
        );
      }

      function renderTricksSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angle_problem_solving_shortcuts', '\u26A1 Angle problem-solving shortcuts')),
          h('div', { className: 'space-y-2' },
            ANGLE_TRICKS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-2.5 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, t.trick),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.use)
              );
            })
          )
        );
      }

      function renderCompassSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.compass_bearings_16_point', '\uD83E\uDDED Compass bearings (16-point)')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.bearings_measured_clockwise_from_north', 'Bearings measured CLOCKWISE from north. Standard 16-point compass has 22.5\u00B0 between adjacent directions.')),
          h('div', { className: 'grid grid-cols-4 gap-2' },
            COMPASS_BEARINGS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded-md bg-slate-50 border border-slate-200 text-center' },
                h('div', { className: 'text-base font-black text-rose-700' }, c.dir),
                h('div', { className: 'text-[0.625rem] font-mono text-slate-600' }, c.bearing)
              );
            })
          )
        );
      }

      // ── Cycle 5 of the inquiry-learning study: CROSS-REPRESENTATION LINKING ──
      // Three live representations of the same trigonometric scenario:
      // (1) SVG of the Leaning Tower at variable lean angle,
      // (2) right-triangle decomposition with labeled sides,
      // (3) the symbolic equation tan(θ) = opposite/adjacent.
      // Manipulating any ONE updates all three. Designed to address Cycle 4's critic gap:
      // real visualizations in a topic that naturally calls for them.
      function renderPisaCrossSection() {
        var state = d2.pisaCross || { angleDeg: 4.0, towerHeight: 56, quizMode: false, quizQ: null, quizAns: '', quizRevealed: false };
        function setPC(patch) {
          ctx.setToolData(function(prev) {
            var prior = (prev && prev.angles) || {};
            var st = Object.assign({}, prior.pisaCross || state, patch);
            return Object.assign({}, prev, { angles: Object.assign({}, prior, { pisaCross: st }) });
          });
        }
        var theta = state.angleDeg;
        var towerH = state.towerHeight;
        var thetaRad = theta * Math.PI / 180;
        // For a leaning tower of height H tilted at angle θ from vertical:
        //   horizontal displacement of top from base = H * sin(θ)   (this is the 'opposite')
        //   vertical projection on ground             = H * cos(θ)   (this is the 'adjacent')
        // The tilt-triangle angle at the base IS θ; tan(θ) = horizontal_disp / vertical_proj
        var opp = towerH * Math.sin(thetaRad);
        var adj = towerH * Math.cos(thetaRad);
        var hyp = towerH;
        var tanVal = opp / adj;
        // ── SVG: leaning tower ──
        function towerSVG() {
          var cx = 130, baseY = 200, towerWidth = 30, towerVisualHeight = 140;
          var topCx = cx + towerVisualHeight * Math.sin(thetaRad);
          var topCy = baseY - towerVisualHeight * Math.cos(thetaRad);
          // Tower as parallelogram (4 corners)
          var halfW = towerWidth / 2;
          var corners = [
            { x: cx - halfW, y: baseY },
            { x: cx + halfW, y: baseY },
            { x: topCx + halfW * Math.cos(thetaRad), y: topCy + halfW * Math.sin(thetaRad) },
            { x: topCx - halfW * Math.cos(thetaRad), y: topCy - halfW * Math.sin(thetaRad) }
          ];
          var pathStr = 'M ' + corners.map(function(c) { return c.x.toFixed(1) + ',' + c.y.toFixed(1); }).join(' L ') + ' Z';
          return h('svg', { viewBox: '0 0 260 220', width: '100%', role: 'img', 'aria-label': t('stem.angles.angle_diagram', 'Angle diagram showing the current tower or triangle measurements.'), style: { height: 'auto', maxWidth: 280, background: 'linear-gradient(180deg,#f0f9ff 0%,#e0f2fe 60%,#bae6fd 100%)', borderRadius: 8 } },
            // Ground
            h('line', { x1: 5, y1: baseY, x2: 255, y2: baseY, stroke: '#92400e', strokeWidth: 2 }),
            h('rect', { x: 5, y: baseY, width: 250, height: 20, fill: '#fed7aa' }),
            // Faint vertical guide (where tower WOULD be if not tilted)
            h('line', { x1: cx, y1: baseY, x2: cx, y2: baseY - towerVisualHeight, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3,3' }),
            // Tower itself
            h('path', { d: pathStr, fill: '#fbbf24', stroke: '#92400e', strokeWidth: 1.5, opacity: 0.95 }),
            // Crown / cross at top
            h('circle', { cx: topCx, cy: topCy, r: 3, fill: '#dc2626' }),
            // Opposite-side annotation (red horizontal at top, from vertical guide to top of tower)
            h('line', { x1: cx, y1: topCy, x2: topCx, y2: topCy, stroke: '#dc2626', strokeWidth: 2 }),
            h('text', { x: (cx + topCx)/2, y: topCy - 5, textAnchor: 'middle', fontSize: 10, fill: '#dc2626', fontWeight: 'bold' }, 'opp ≈ ' + opp.toFixed(2) + ' m'),
            // Angle arc at base
            h('path', { d: 'M ' + cx + ',' + (baseY - 26) + ' A 26,26 0 0,1 ' + (cx + 26 * Math.sin(thetaRad)).toFixed(1) + ',' + (baseY - 26 * Math.cos(thetaRad)).toFixed(1), fill: 'none', stroke: '#7c3aed', strokeWidth: 2 }),
            h('text', { x: cx + 14, y: baseY - 30, fontSize: 10, fill: '#7c3aed', fontWeight: 'bold' }, 'θ = ' + theta.toFixed(1) + '°'),
            // Caption
            h('text', { x: 130, y: 215, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, t('stem.angles.tower_of_pisa_actual_lean_4', 'Tower of Pisa — actual lean ≈ 4°'))
          );
        }
        // ── SVG: extracted triangle ──
        function triangleSVG() {
          // Render a clean right triangle with labeled sides
          var triBase = 200;
          var triLeft = 30;
          // Constrain to visible space
          // One scale for both legs keeps the drawn angle equal to theta; clamping
          // each leg alone drew 23.3 deg for a labelled 15 deg.
          var visK = Math.min(3, 180 / Math.max(adj, 1e-9), 140 / Math.max(opp, 1e-9));
          var visAdj = adj * visK;
          var visOpp = opp * visK;
          var rb_x = triLeft + visAdj;
          var rt_x = triLeft;
          var rt_y = triBase - visOpp;
          return h('svg', { viewBox: '0 0 260 220', width: '100%', role: 'img', 'aria-label': t('stem.angles.angle_diagram', 'Angle diagram showing the current tower or triangle measurements.'), style: { height: 'auto', maxWidth: 280, background: '#fafafa', borderRadius: 8, border: '1px solid #e2e8f0' } },
            // Triangle
            h('polygon', { points: triLeft+','+triBase+' '+rb_x+','+triBase+' '+rt_x+','+rt_y, fill: 'rgba(251,191,36,0.3)', stroke: '#92400e', strokeWidth: 2 }),
            // Right angle marker
            h('rect', { x: triLeft, y: triBase - 12, width: 12, height: 12, fill: 'none', stroke: '#475569', strokeWidth: 1.5 }),
            // Side labels
            h('text', { x: (triLeft + rb_x)/2, y: triBase + 14, textAnchor: 'middle', fontSize: 10, fill: '#475569' }, t('stem.angles.adjacent_cos', 'adjacent (cos θ)')),
            h('text', { x: (triLeft + rb_x)/2, y: triBase + 26, textAnchor: 'middle', fontSize: 10, fill: '#0f766e', fontWeight: 'bold' }, adj.toFixed(2) + ' m'),
            h('text', { x: triLeft - 6, y: (triBase + rt_y)/2, textAnchor: 'end', fontSize: 10, fill: '#475569' }, t('stem.angles.lib_opposite', 'opposite')),
            h('text', { x: triLeft - 6, y: (triBase + rt_y)/2 + 12, textAnchor: 'end', fontSize: 10, fill: '#dc2626', fontWeight: 'bold' }, opp.toFixed(2) + ' m'),
            // hypotenuse label
            h('text', { x: (rb_x + rt_x)/2 + 10, y: (triBase + rt_y)/2 - 8, fontSize: 10, fill: '#475569' }, 'hyp = ' + hyp.toFixed(0) + ' m'),
            // angle label
            h('text', { x: rb_x - 30, y: triBase - 5, fontSize: 11, fill: '#7c3aed', fontWeight: 'bold' }, 'θ = ' + theta.toFixed(1) + '°')
          );
        }
        // ── Quiz: present ONE representation, hide the others, learner solves the inverse ──
        var QUIZ_QS = [
          { id: 'q1', given: t('stem.angles.lib_opposite_2_5_m', 'opposite = 2.5 m'), given2: t('stem.angles.lib_adjacent_18_0_m', 'adjacent = 18.0 m'), ask: t('stem.angles.lib_tilt_angle_in_degrees', 'tilt angle θ (in degrees)?'), expected: Math.atan(2.5/18.0) * 180 / Math.PI, tolerance: 1.0 },
          { id: 'q2', given: t('stem.angles.lib_tilt_angle_6', 'tilt angle = 6°'), given2: t('stem.angles.lib_tower_height_50_m', 'tower height = 50 m'), ask: t('stem.angles.lib_horizontal_lean_at_top_m', 'horizontal lean at top (m)?'), expected: 50 * Math.sin(6 * Math.PI / 180), tolerance: 0.5 },
          { id: 'q3', given: t('stem.angles.lib_tilt_angle_3', 'tilt angle = 3°'), given2: t('stem.angles.lib_horizontal_lean_at_top_2_0_m', 'horizontal lean at top = 2.0 m'), ask: t('stem.angles.lib_tower_height_m', 'tower height (m)?'), expected: 2.0 / Math.sin(3 * Math.PI / 180), tolerance: 3.0 }
        ];
        function startQuiz(q) {
          setPC({ quizMode: true, quizQ: q.id, quizAns: '', quizRevealed: false });
        }
        function submitQuiz() {
          setPC({ quizRevealed: true });
        }
        var currentQuiz = QUIZ_QS.find(function(q) { return q.id === state.quizQ; });
        var userAns = parseFloat(state.quizAns);
        var correct = currentQuiz && !isNaN(userAns) && Math.abs(userAns - currentQuiz.expected) <= currentQuiz.tolerance;
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, t('stem.angles.pisa_linked_representations', '🗼 Pisa: linked representations')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
            t('stem.angles.three_views_of_the_same_trigonometric_', 'Three views of the SAME trigonometric setup. Drag the angle (or tower height) slider — every representation updates simultaneously. Then take the inverse-problem quiz: solve a real measurement from only one representation.')),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3 mb-3' },
            h('div', null,
              h('div', { className: 'text-[0.625rem] uppercase font-bold text-slate-500 tracking-wider mb-1' }, t('stem.angles.1_phenomenon_the_tower', '1. Phenomenon — the tower')),
              towerSVG()
            ),
            h('div', null,
              h('div', { className: 'text-[0.625rem] uppercase font-bold text-slate-500 tracking-wider mb-1' }, t('stem.angles.2_geometric_decomposition', '2. Geometric decomposition')),
              triangleSVG()
            )
          ),
          h('div', { className: 'mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200' },
            h('div', { className: 'text-[0.625rem] uppercase font-bold text-rose-700 tracking-wider mb-1' }, t('stem.angles.3_equation', '3. Equation')),
            h('div', { className: 'font-mono text-[1rem] text-rose-900 text-center my-2' }, t('stem.angles.tan_opposite_adjacent', 'tan(θ) = opposite / adjacent')),
            h('div', { className: 'font-mono text-[0.875rem] text-rose-800 text-center' },
              'tan(' + theta.toFixed(1) + '°) = ' + opp.toFixed(2) + ' / ' + adj.toFixed(2) + ' = ' + tanVal.toFixed(4)
            ),
            h('div', { className: 'text-[0.6875rem] text-rose-700 italic text-center mt-1' }, t('stem.angles.change_the_angle_and_watch_all_three_u', 'Change the angle and watch all three update together — this is what "the same idea, three representations" means.'))
          ),
          h('div', { className: 'p-3 rounded-lg bg-slate-50 border border-slate-200 mb-3' },
            h('label', { htmlFor: 'pisaAngle', className: 'block text-[0.6875rem] font-bold text-slate-700' }, t('stem.angles.lib_tilt_angle', 'Tilt angle θ: ') + theta.toFixed(1) + '°'),
            h('input', { id: 'pisaAngle', type: 'range', min: 0, max: 30, step: 0.1, value: theta, onChange: function(e) { setPC({ angleDeg: parseFloat(e.target.value) }); }, className: 'w-full', 'aria-valuetext': theta.toFixed(1) + '°', 'aria-label': t('stem.angles.tilt_angle_in_degrees', 'Tilt angle in degrees') }),
            h('label', { htmlFor: 'pisaHeight', className: 'block text-[0.6875rem] font-bold text-slate-700 mt-2' }, t('stem.angles.lib_tower_height', 'Tower height: ') + towerH + ' m'),
            h('input', { id: 'pisaHeight', type: 'range', min: 20, max: 100, step: 1, value: towerH, onChange: function(e) { setPC({ towerHeight: parseInt(e.target.value, 10) }); }, className: 'w-full', 'aria-valuetext': towerH + ' m', 'aria-label': t('stem.angles.tower_height_in_meters', 'Tower height in meters') }),
            h('p', { className: 'text-[0.625rem] text-slate-500 italic mt-1' }, t('stem.angles.pisa_is_roughly_56_m_tall_leaning_4_to', '(Pisa is roughly 56 m tall, leaning ≈ 4° today)'))
          ),
          h('div', { className: 'p-3 rounded-lg bg-amber-50 border border-amber-200' },
            h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-2' }, t('stem.angles.inverse_problem_quiz', '🧩 Inverse-problem quiz')),
            h('p', { className: 'text-[0.6875rem] text-amber-800 mb-2' }, t('stem.angles.each_quiz_gives_you_partial_info_use_t', 'Each quiz gives you partial info. Use the relationships you discovered above to compute the missing value.')),
            h('div', { className: 'flex flex-wrap gap-1 mb-2' },
              QUIZ_QS.map(function(q, i) {
                return h('button', { key: q.id, onClick: function() { startQuiz(q); },
                  className: 'px-2 py-1 rounded text-[0.6875rem] font-bold border transition-colors focus:ring-2 focus:ring-amber-400 focus:outline-none ' + (state.quizQ === q.id ? 'bg-amber-200 text-amber-900 border-amber-400' : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-100')
                }, fill(t('stem.angles.lib_quiz_n', 'Quiz #{n}'), { n: i + 1 }));
              })
            ),
            currentQuiz && h('div', { className: 'mt-2 p-2 rounded bg-white border border-amber-300' },
              h('div', { className: 'text-[0.75rem] text-slate-700 mb-1' }, h('strong', null, t('stem.angles.lib_given', 'Given: ')), currentQuiz.given + '; ' + currentQuiz.given2),
              h('div', { className: 'text-[0.75rem] text-slate-700 mb-2' }, h('strong', null, t('stem.angles.lib_find', 'Find: ')), currentQuiz.ask),
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('input', { type: 'number', step: 'any', value: state.quizAns, onChange: function(e) { setPC({ quizAns: e.target.value, quizRevealed: false }); }, placeholder: t('stem.angles.your_answer', 'your answer'), className: 'px-2 py-1 rounded border border-slate-300 text-[0.75rem] w-32 focus:ring-2 focus:ring-amber-400 focus:outline-none', 'aria-label': t('stem.angles.your_answer_2', 'Your answer') }),
                h('button', { onClick: submitQuiz, disabled: state.quizAns === '', className: 'px-3 py-1 rounded text-[0.6875rem] font-bold bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-400 focus:outline-none' }, t('stem.angles.check_5', 'Check')),
                state.quizRevealed && h('span', { className: 'text-[0.6875rem] font-bold ' + (correct ? 'text-green-700' : 'text-rose-700') }, correct ? '✓ Within tolerance' : '✗ Expected ≈ ' + currentQuiz.expected.toFixed(2))
              ),
              state.quizRevealed && h('p', { className: 'text-[0.6875rem] text-slate-700 mt-1 italic' }, t('stem.angles.tip_rearrange_tan_opp_adj_if_you_know_', 'Tip: rearrange tan(θ) = opp/adj — if you know θ and one side, you can solve for the other. If you know both sides, take arctan.'))
            )
          )
        );
      }

      function renderGlossarySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angles_glossary', '\uD83D\uDCD6 Angles glossary')),
          h('div', { className: 'space-y-1' },
            ANGLES_GLOSSARY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900' }, g.term),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — More geometry references (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var PYTHAG_TRIPLES = [
        { a: 3, b: 4, c: 5, notes: t('stem.angles.lib_smallest_primitive_triple_egyptians_used_3_4', 'Smallest primitive triple. Egyptians used 3:4:5 ropes to make right angles.') },
        { a: 5, b: 12, c: 13, notes: t('stem.angles.lib_second_smallest_primitive', 'Second smallest primitive.') },
        { a: 8, b: 15, c: 17, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 7, b: 24, c: 25, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 20, b: 21, c: 29, notes: t('stem.angles.lib_primitive_legs_close_in_length', 'Primitive — legs close in length.') },
        { a: 9, b: 40, c: 41, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 12, b: 35, c: 37, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 11, b: 60, c: 61, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 28, b: 45, c: 53, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 33, b: 56, c: 65, notes: t('stem.angles.lib_primitive', 'Primitive.') },
        { a: 16, b: 63, c: 65, notes: t('stem.angles.lib_primitive_two_triples_with_hypotenuse_65', 'Primitive. Two triples with hypotenuse 65.') },
        { a: 6, b: 8, c: 10, notes: t('stem.angles.lib_2_of_3_4_5_multiples_are_also_pythagorean_ju', '2× of (3,4,5). Multiples are also Pythagorean (just not primitive).') },
        { a: 9, b: 12, c: 15, notes: '3× of (3,4,5).' }
      ];

      var TRIANGLE_TYPES = [
        { type: t('stem.angles.lib_equilateral', 'Equilateral'), sides: t('stem.angles.lib_all_3_sides_equal', 'All 3 sides equal'), angles: t('stem.angles.lib_all_60', 'All 60°'), notes: t('stem.angles.lib_three_lines_of_symmetry_maximum_area_for_giv', 'Three lines of symmetry. Maximum area for given perimeter (among triangles).') },
        { type: t('stem.angles.lib_isosceles', 'Isosceles'), sides: t('stem.angles.lib_two_sides_equal', 'Two sides equal'), angles: t('stem.angles.lib_two_equal_base_angles', 'Two equal base angles'), notes: t('stem.angles.lib_single_line_of_symmetry_through_apex', 'Single line of symmetry through apex.') },
        { type: t('stem.angles.lib_scalene', 'Scalene'), sides: t('stem.angles.lib_no_sides_equal', 'No sides equal'), angles: t('stem.angles.lib_no_angles_equal', 'No angles equal'), notes: t('stem.angles.lib_no_special_symmetry', 'No special symmetry.') },
        { type: t('stem.angles.lib_right', 'Right'), sides: t('stem.angles.lib_no_constraint', 'No constraint'), angles: t('stem.angles.lib_one_90_angle', 'One 90° angle'), notes: t('stem.angles.lib_pythagoras_applies_hypotenuse_is_longest_sid', 'Pythagoras applies. Hypotenuse is longest side.') },
        { type: t('stem.angles.lib_acute', 'Acute'), sides: t('stem.angles.lib_no_constraint', 'No constraint'), angles: t('stem.angles.lib_all_angles_90', 'All angles < 90°'), notes: t('stem.angles.lib_all_three_angles_are_acute', 'All three angles are acute.') },
        { type: t('stem.angles.lib_obtuse', 'Obtuse'), sides: t('stem.angles.lib_no_constraint', 'No constraint'), angles: t('stem.angles.lib_one_angle_90', 'One angle > 90°'), notes: t('stem.angles.lib_only_one_angle_can_be_obtuse_sum_is_180', 'Only one angle can be obtuse — sum is 180°.') },
        { type: t('stem.angles.lib_right_isosceles', 'Right isosceles'), sides: t('stem.angles.lib_two_equal_legs', 'Two equal legs'), angles: '90°, 45°, 45°', notes: t('stem.angles.lib_hypotenuse_leg_2_diagonal_of_a_square', 'Hypotenuse = leg × √2. Diagonal of a square.') },
        { type: '30-60-90', sides: t('stem.angles.lib_ratio_1_3_2', 'Ratio 1 : √3 : 2'), angles: '30°, 60°, 90°', notes: t('stem.angles.lib_half_of_an_equilateral_triangle', 'Half of an equilateral triangle.') }
      ];

      var TRIANGLE_FORMULAS = [
        { name: t('stem.angles.area_base_height', 'Area (base × height)'), formula: 'A = ½·b·h', notes: t('stem.angles.lib_most_common_b_and_h_must_be_perpendicular', 'Most common. b and h must be perpendicular.') },
        { name: t('stem.angles.area_heron_s_formula', 'Area (Heron\'s formula)'), formula: 'A = √[s(s−a)(s−b)(s−c)], s = (a+b+c)/2', notes: t('stem.angles.lib_uses_three_sides_only_no_angles_needed', 'Uses three sides only. No angles needed.') },
        { name: t('stem.angles.area_two_sides_included_angle', 'Area (two sides + included angle)'), formula: 'A = ½·a·b·sin C', notes: t('stem.angles.lib_when_you_know_two_sides_and_the_angle_betwee', 'When you know two sides and the angle between them.') },
        { name: t('stem.angles.law_of_sines', 'Law of Sines'), formula: 'a/sin A = b/sin B = c/sin C = 2R', notes: t('stem.angles.lib_r_circumradius_useful_when_you_know_one_side', 'R = circumradius. Useful when you know one side + opposite angle.') },
        { name: t('stem.angles.law_of_cosines', 'Law of Cosines'), formula: 'c² = a² + b² − 2ab·cos C', notes: t('stem.angles.lib_generalization_of_pythagoras_cos_c_0_c_90_py', 'Generalization of Pythagoras. Cos C = 0 (C=90°) → Pythagoras.') },
        { name: t('stem.angles.sum_of_angles', 'Sum of angles'), formula: 'A + B + C = 180°', notes: t('stem.angles.lib_euclidean_flat_triangles_sum_180_on_sphere', 'Euclidean (flat) triangles. Sum > 180° on sphere.') },
        { name: t('stem.angles.pythagorean_theorem', 'Pythagorean theorem'), formula: 'a² + b² = c²', notes: t('stem.angles.lib_right_triangles_only_c_hypotenuse', 'Right triangles only. c = hypotenuse.') },
        { name: t('stem.angles.triangle_inequality', 'Triangle inequality'), formula: t('stem.angles.lib_a_b_c_and_permutations', 'a + b > c (and permutations)'), notes: t('stem.angles.lib_sum_of_any_two_sides_third_side', 'Sum of any two sides > third side.') },
        { name: t('stem.angles.centroid', 'Centroid'), formula: t('stem.angles.lib_intersection_of_medians', 'Intersection of medians'), notes: t('stem.angles.lib_center_of_mass_divides_each_median_2_1_from', 'Center of mass. Divides each median 2:1 from vertex.') },
        { name: t('stem.angles.circumcenter', 'Circumcenter'), formula: t('stem.angles.lib_intersection_of_perpendicular_bisectors', 'Intersection of perpendicular bisectors'), notes: t('stem.angles.lib_center_of_circumscribed_circle_passes_throug', 'Center of circumscribed circle (passes through all 3 vertices).') },
        { name: t('stem.angles.incenter', 'Incenter'), formula: t('stem.angles.lib_intersection_of_angle_bisectors', 'Intersection of angle bisectors'), notes: t('stem.angles.lib_center_of_inscribed_circle_tangent_to_all_3', 'Center of inscribed circle (tangent to all 3 sides).') },
        { name: t('stem.angles.orthocenter', 'Orthocenter'), formula: t('stem.angles.lib_intersection_of_altitudes', 'Intersection of altitudes'), notes: t('stem.angles.lib_inside_acute_triangles_outside_obtuse_at_rig', 'Inside acute triangles, outside obtuse, at right-angle vertex of right triangles.') }
      ];

      var CIRCLE_FACTS = [
        { name: t('stem.angles.circumference', 'Circumference'), formula: 'C = 2πr = πd', notes: t('stem.angles.lib_d_diameter_3_14159', 'd = diameter. π ≈ 3.14159...') },
        { name: t('stem.angles.area', 'Area'), formula: 'A = πr²', notes: t('stem.angles.lib_maximum_area_for_given_perimeter_isoperimetr', 'Maximum area for given perimeter (isoperimetric inequality).') },
        { name: t('stem.angles.arc_length', 'Arc length'), formula: t('stem.angles.lib_s_r_in_radians', 's = r·θ (θ in radians)'), notes: 'Or s = (θ°/360°)·2πr.' },
        { name: t('stem.angles.sector_area', 'Sector area'), formula: t('stem.angles.lib_a_1_2_r2_in_radians', 'A = ½·r²·θ (θ in radians)'), notes: 'Or A = (θ°/360°)·πr².' },
        { name: t('stem.angles.chord_length', 'Chord length'), formula: 'L = 2r·sin(θ/2)', notes: t('stem.angles.lib_central_angle_to_the_chord', 'θ = central angle to the chord.') },
        { name: t('stem.angles.inscribed_angle_theorem', 'Inscribed angle theorem'), formula: t('stem.angles.lib_inscribed_angle_1_2_central_angle_2', 'Inscribed angle = ½ central angle'), notes: t('stem.angles.lib_both_subtend_the_same_arc', 'Both subtend the same arc.') },
        { name: t('stem.angles.thales_theorem', 'Thales\' theorem'), formula: t('stem.angles.lib_angle_inscribed_in_semicircle_90', 'Angle inscribed in semicircle = 90°'), notes: t('stem.angles.lib_special_case_of_inscribed_angle_theorem', 'Special case of inscribed angle theorem.') },
        { name: t('stem.angles.power_of_a_point', 'Power of a point'), formula: t('stem.angles.lib_for_two_secants_pa_pb_pc_pd', 'For two secants: PA·PB = PC·PD'), notes: t('stem.angles.lib_holds_for_any_two_lines_through_p_intersecti', 'Holds for any two lines through P intersecting circle.') },
        { name: t('stem.angles.equation_of_circle_center_h_k', 'Equation of circle (center h,k)'), formula: '(x−h)² + (y−k)² = r²', notes: t('stem.angles.lib_standard_form', 'Standard form.') },
        { name: t('stem.angles.lib_tangent_radius', 'Tangent-radius'), formula: t('stem.angles.lib_tangent_radius_at_point_of_contact_2', 'Tangent ⊥ radius at point of contact'), notes: t('stem.angles.lib_right_angle_between_radius_and_tangent_line', 'Right angle between radius and tangent line.') }
      ];

      var SOLID_VOLUMES = [
        { name: t('stem.angles.cube', 'Cube'), V: 's³', SA: '6s²', notes: t('stem.angles.lib_6_faces_12_edges_8_vertices_all_edges_equal', '6 faces, 12 edges, 8 vertices. All edges equal.') },
        { name: t('stem.angles.rectangular_prism_box', 'Rectangular prism (box)'), V: 'lwh', SA: '2(lw + lh + wh)', notes: t('stem.angles.lib_6_faces_12_edges_8_vertices', '6 faces, 12 edges, 8 vertices.') },
        { name: t('stem.angles.sphere', 'Sphere'), V: '(4/3)πr³', SA: '4πr²', notes: t('stem.angles.lib_maximum_volume_for_given_surface_area_soap_b', 'Maximum volume for given surface area. Soap bubbles minimize surface area.') },
        { name: t('stem.angles.cylinder', 'Cylinder'), V: 'πr²h', SA: '2πr² + 2πrh', notes: t('stem.angles.lib_like_a_prism_but_with_circular_ends', 'Like a prism but with circular ends.') },
        { name: t('stem.angles.cone', 'Cone'), V: '(1/3)πr²h', SA: t('stem.angles.lib_r2_r_l_l_slant', 'πr² + πr·ℓ (ℓ = slant)'), notes: t('stem.angles.lib_volume_1_3_of_cylinder_with_same_r_and_h', 'Volume = 1/3 of cylinder with same r and h.') },
        { name: t('stem.angles.square_pyramid', 'Square pyramid'), V: '(1/3)s²h', SA: 's² + 2s·ℓ', notes: t('stem.angles.lib_egyptian_pyramids_volume_1_3_of_prism_with_s', 'Egyptian pyramids. Volume = 1/3 of prism with same base + height.') },
        { name: t('stem.angles.triangular_prism', 'Triangular prism'), V: '(1/2)bh·L', SA: t('stem.angles.lib_sum_of_5_faces', 'sum of 5 faces'), notes: t('stem.angles.lib_cross_section_is_triangle_toblerone_bar', 'Cross-section is triangle. Toblerone bar.') },
        { name: t('stem.angles.tetrahedron_regular', 'Tetrahedron (regular)'), V: 's³/(6√2)', SA: 's²·√3', notes: t('stem.angles.lib_4_triangular_faces_simplest_3d_shape_just_4', '4 triangular faces. Simplest 3D shape (just 4 vertices).') },
        { name: t('stem.angles.octahedron_regular', 'Octahedron (regular)'), V: '(√2/3)s³', SA: '2s²·√3', notes: t('stem.angles.lib_8_triangular_faces_diamond_crystal_shape', '8 triangular faces. Diamond crystal shape.') },
        { name: t('stem.angles.dodecahedron_regular', 'Dodecahedron (regular)'), V: '(15+7√5)/4·s³', SA: '3·s²·√(25+10√5)', notes: t('stem.angles.lib_12_pentagonal_faces_plato_linked_to_the_heav', '12 pentagonal faces. Plato linked to "the heavens".') },
        { name: t('stem.angles.icosahedron_regular', 'Icosahedron (regular)'), V: '(5(3+√5)/12)·s³', SA: '5·s²·√3', notes: t('stem.angles.lib_20_triangular_faces_most_spherelike_platonic', '20 triangular faces. Most spherelike Platonic solid.') }
      ];

      var TRANSFORMATIONS = [
        { name: t('stem.angles.translation', 'Translation'), effect: t('stem.angles.lib_slides_shape_no_rotation_no_reflection_no_re', 'Slides shape (no rotation, no reflection, no resize)'), preserves: t('stem.angles.lib_size_shape_orientation', 'Size, shape, orientation'), notes: t('stem.angles.lib_just_adds_a_vector_to_every_point_x_y_x_a_y', 'Just adds a vector to every point. (x,y) → (x+a, y+b).') },
        { name: t('stem.angles.rotation', 'Rotation'), effect: t('stem.angles.lib_turns_shape_around_a_fixed_point', 'Turns shape around a fixed point'), preserves: t('stem.angles.lib_size_shape', 'Size, shape'), notes: t('stem.angles.lib_specified_by_center_angle_around_origin_x_y', 'Specified by center + angle. Around origin: (x,y) → (x·cos θ − y·sin θ, x·sin θ + y·cos θ).') },
        { name: t('stem.angles.reflection', 'Reflection'), effect: t('stem.angles.lib_mirrors_shape_across_a_line', 'Mirrors shape across a line'), preserves: t('stem.angles.lib_size_shape_but_reverses_orientation_chiralit', 'Size, shape (but reverses orientation/chirality)'), notes: t('stem.angles.lib_across_x_axis_x_y_x_y_across_y_axis_x_y_x_y', 'Across x-axis: (x,y) → (x,−y). Across y-axis: (x,y) → (−x,y). Across y=x: (x,y) → (y,x).') },
        { name: t('stem.angles.glide_reflection', 'Glide reflection'), effect: t('stem.angles.lib_reflection_translation_along_the_line_of_ref', 'Reflection + translation along the line of reflection'), preserves: t('stem.angles.lib_size_shape_reverses_orientation', 'Size, shape (reverses orientation)'), notes: t('stem.angles.lib_footprints_in_sand_are_a_glide_reflection_pa', 'Footprints in sand are a glide reflection pattern.') },
        { name: t('stem.angles.dilation_scaling', 'Dilation (scaling)'), effect: t('stem.angles.lib_stretches_shrinks_shape_from_a_center', 'Stretches/shrinks shape from a center'), preserves: t('stem.angles.lib_shape_similarity_but_not_size', 'Shape (similarity), but not size'), notes: t('stem.angles.lib_factor_k_x_y_kx_ky_k_1_enlargement_0_k_1_red', 'Factor k: (x,y) → (kx, ky). k > 1 = enlargement; 0 < k < 1 = reduction; k < 0 = reflection through center.') },
        { name: t('stem.angles.shear', 'Shear'), effect: t('stem.angles.lib_skews_shape_parallel_lines_stay_parallel_but', 'Skews shape — parallel lines stay parallel but slide'), preserves: t('stem.angles.lib_area', 'Area'), notes: t('stem.angles.lib_horizontal_shear_x_y_x_k_y_y_italic_fonts_ar', 'Horizontal shear: (x,y) → (x + k·y, y). Italic fonts are sheared.') },
        { name: t('stem.angles.identity', 'Identity'), effect: t('stem.angles.lib_does_nothing', 'Does nothing'), preserves: t('stem.angles.lib_everything', 'Everything'), notes: t('stem.angles.lib_the_trivial_transformation', 'The trivial transformation.') },
        { name: t('stem.angles.composition', 'Composition'), effect: t('stem.angles.lib_apply_one_after_another', 'Apply one after another'), preserves: t('stem.angles.lib_depends_on_the_composition', 'Depends on the composition'), notes: t('stem.angles.lib_order_matters_rotate_then_translate_translat', 'Order matters! Rotate-then-translate ≠ translate-then-rotate (in general).') }
      ];

      var COORD_SYSTEMS = [
        { name: t('stem.angles.cartesian_rectangular_2d', 'Cartesian (rectangular) 2D'), coords: '(x, y)', use: t('stem.angles.lib_most_common_standard_graph_paper', 'Most common. Standard graph paper.'), notes: t('stem.angles.lib_x_axis_horizontal_y_axis_vertical_origin_0_0', 'x-axis horizontal, y-axis vertical. Origin (0,0).') },
        { name: t('stem.angles.cartesian_rectangular_3d', 'Cartesian (rectangular) 3D'), coords: '(x, y, z)', use: t('stem.angles.lib_standard_for_3d_graphics_physics', 'Standard for 3D graphics, physics.'), notes: t('stem.angles.lib_right_handed_thumb_x_index_y_middle_z', 'Right-handed: thumb x, index y, middle z.') },
        { name: t('stem.angles.polar_2d', 'Polar 2D'), coords: '(r, θ)', use: t('stem.angles.lib_circular_radial_symmetry', 'Circular/radial symmetry.'), notes: t('stem.angles.lib_r_distance_from_origin_angle_from_x_axis_x_r', 'r = distance from origin, θ = angle from +x axis. x = r cos θ, y = r sin θ.') },
        { name: t('stem.angles.cylindrical_3d', 'Cylindrical 3D'), coords: '(r, θ, z)', use: t('stem.angles.lib_cylinders_helices_axial_symmetry', 'Cylinders, helices, axial symmetry.'), notes: t('stem.angles.lib_polar_in_plane_z_height_used_for_solenoids_p', 'Polar in plane + z height. Used for solenoids, pipe flow.') },
        { name: t('stem.angles.spherical_3d', 'Spherical 3D'), coords: '(ρ, θ, φ)', use: t('stem.angles.lib_spheres_planetary_motion_antennas', 'Spheres, planetary motion, antennas.'), notes: t('stem.angles.lib_distance_from_origin_conventions_vary_on_whi', 'ρ = distance from origin; conventions vary on which angle is θ vs φ.') },
        { name: t('stem.angles.geographic_lat_lon', 'Geographic (lat, lon)'), coords: '(lat, lon)', use: t('stem.angles.lib_earth_surface', 'Earth surface.'), notes: t('stem.angles.lib_latitude_90_s_pole_to_90_n_pole_longitude_18', 'Latitude: −90° (S pole) to +90° (N pole). Longitude: −180° to +180° from prime meridian.') },
        { name: t('stem.angles.utm_universal_transverse_mercator', 'UTM (Universal Transverse Mercator)'), coords: 'zone + (E, N)', use: t('stem.angles.lib_local_scale_maps_surveys', 'Local-scale maps, surveys.'), notes: t('stem.angles.lib_projects_earth_onto_cylinder_less_distortion', 'Projects Earth onto cylinder. Less distortion at small scales than lat/lon.') },
        { name: t('stem.angles.homogeneous_projective', 'Homogeneous (projective)'), coords: '(x, y, w) or (x, y, z, w)', use: t('stem.angles.lib_computer_graphics_projective_geometry', 'Computer graphics, projective geometry.'), notes: t('stem.angles.lib_adds_a_weight_coordinate_enables_translation', 'Adds a "weight" coordinate. Enables translations as matrix multiplication.') }
      ];

      var VECTOR_NOTES = [
        { topic: t('stem.angles.lib_what_is_a_vector', 'What is a vector'), detail: t('stem.angles.quantity_with_both_magnitude_and_direc', 'Quantity with both magnitude AND direction. Drawn as arrow. Examples: velocity, force, displacement.') },
        { topic: t('stem.angles.lib_scalar_vs_vector', 'Scalar vs vector'), detail: t('stem.angles.scalar_just_a_number_mass_temperature_', 'Scalar = just a number (mass, temperature, time). Vector = magnitude + direction.') },
        { topic: t('stem.angles.lib_vector_addition_head_to_tail', 'Vector addition (head-to-tail)'), detail: t('stem.angles.place_tail_of_second_at_head_of_first_', 'Place tail of second at head of first. Resultant = first tail to second head.') },
        { topic: t('stem.angles.lib_vector_addition_parallelogram', 'Vector addition (parallelogram)'), detail: t('stem.angles.place_tails_together_diagonal_of_paral', 'Place tails together. Diagonal of parallelogram = resultant.') },
        { topic: t('stem.angles.lib_components', 'Components'), detail: t('stem.angles.vector_v_at_angle_v_v_cos_v_y_v_sin', 'Vector v at angle θ: vₓ = v·cos θ, v_y = v·sin θ.') },
        { topic: t('stem.angles.lib_magnitude', 'Magnitude'), detail: t('stem.angles.v_v_v_y_v_z_pythagoras_in_any_dimensio', '|v| = √(vₓ² + v_y² + v_z²). Pythagoras in any dimension.') },
        { topic: t('stem.angles.lib_unit_vector', 'Unit vector'), detail: t('stem.angles.magnitude_1_v_v_v_often_called_the_dir', 'Magnitude 1. v̂ = v / |v|. Often called the "direction" of v.') },
        { topic: t('stem.angles.lib_dot_product', 'Dot product'), detail: t('stem.angles.a_b_a_b_cos_gives_scalar_zero_when_per', 'a·b = |a||b|cos θ. Gives scalar. Zero when perpendicular. Negative when angle > 90°.') },
        { topic: t('stem.angles.lib_cross_product_3d_only', 'Cross product (3D only)'), detail: t('stem.angles.a_b_a_b_sin_n_gives_vector_perpendicul', 'a×b = |a||b|sin θ · n̂. Gives vector PERPENDICULAR to both. Magnitude = area of parallelogram.') },
        { topic: t('stem.angles.lib_right_hand_rule_cross', 'Right-hand rule (cross)'), detail: t('stem.angles.curl_fingers_from_a_to_b_thumb_points_', 'Curl fingers from a to b. Thumb points in direction of a×b. (Right-handed coordinates.)') },
        { topic: t('stem.angles.lib_linear_combination', 'Linear combination'), detail: t('stem.angles.c_a_c_b_generates_a_plane_or_line_of_v', 'c₁·a + c₂·b. Generates a plane (or line) of vectors.') },
        { topic: t('stem.angles.lib_real_world_forces', 'Real-world: forces'), detail: t('stem.angles.newton_s_2nd_law_f_ma_net_force_is_vec', 'Newton\'s 2nd law: F = ma. Net force is vector sum of all forces.') },
        { topic: t('stem.angles.lib_real_world_navigation', 'Real-world: navigation'), detail: t('stem.angles.airplane_heading_wind_vector_ground_ve', 'Airplane heading + wind vector → ground velocity (vector sum).') }
      ];

      var SYMMETRY_TYPES = [
        { name: t('stem.angles.reflection_mirror_symmetry', 'Reflection (mirror) symmetry'), count: t('stem.angles.lib_one_or_more_axes', 'one or more axes'), example: t('stem.angles.lib_butterfly_1_axis_snowflake_6_axes_letter_a_1', 'Butterfly (1 axis), snowflake (6 axes), letter A (1 axis vertical)'), notes: t('stem.angles.lib_shape_unchanged_when_reflected_across_the_ax', 'Shape unchanged when reflected across the axis.') },
        { name: t('stem.angles.rotational_symmetry', 'Rotational symmetry'), count: t('stem.angles.lib_n_fold_rotation_360_n', 'n-fold (rotation 360°/n)'), example: t('stem.angles.lib_pinwheel_4_fold_starfish_5_fold_honeycomb_ce', 'Pinwheel (4-fold), starfish (5-fold), honeycomb cell (6-fold)'), notes: t('stem.angles.lib_looks_identical_after_rotating_360_n', 'Looks identical after rotating 360°/n.') },
        { name: t('stem.angles.translational_symmetry', 'Translational symmetry'), count: t('stem.angles.lib_unlimited_along_translation_vector', 'unlimited (along translation vector)'), example: t('stem.angles.lib_wallpaper_brick_wall_fence', 'Wallpaper, brick wall, fence'), notes: t('stem.angles.lib_pattern_repeats_by_translation', 'Pattern repeats by translation.') },
        { name: t('stem.angles.glide_reflection_2', 'Glide reflection'), count: '—', example: t('stem.angles.lib_footprints_frieze_patterns', 'Footprints, frieze patterns'), notes: t('stem.angles.lib_reflect_translate_combined', 'Reflect + translate combined.') },
        { name: t('stem.angles.point_symmetry_centrosymmetric', 'Point symmetry (centrosymmetric)'), count: t('stem.angles.lib_2_fold_rotation_about_a_point', '2-fold rotation about a point'), example: t('stem.angles.lib_letter_s_letter_z_recycling_logo', 'Letter S, letter Z, recycling logo'), notes: t('stem.angles.lib_looks_identical_when_rotated_180_about_cente', 'Looks identical when rotated 180° about center.') },
        { name: t('stem.angles.bilateral_symmetry', 'Bilateral symmetry'), count: t('stem.angles.lib_1_mirror_axis', '1 mirror axis'), example: t('stem.angles.lib_vertebrate_animals_you_most_leaves', 'Vertebrate animals (you!), most leaves'), notes: t('stem.angles.lib_left_right_halves_are_mirror_images', 'Left/right halves are mirror images.') },
        { name: t('stem.angles.radial_symmetry', 'Radial symmetry'), count: t('stem.angles.lib_rotational', 'rotational'), example: t('stem.angles.lib_sea_stars_daisies_jellyfish', 'Sea stars, daisies, jellyfish'), notes: t('stem.angles.lib_multiple_mirror_lines_through_a_center', 'Multiple mirror lines through a center.') },
        { name: t('stem.angles.crystallographic_groups', 'Crystallographic groups'), count: t('stem.angles.lib_17_wallpaper_230_3d_space_groups', '17 wallpaper, 230 3D space groups'), example: t('stem.angles.lib_crystals_m_c_escher_tilings', 'Crystals, M.C. Escher tilings'), notes: t('stem.angles.lib_mathematically_classified_symmetry_of_repeat', 'Mathematically classified symmetry of repeating patterns.') }
      ];

      var TILING_FACTS = [
        { name: t('stem.angles.regular_tessellations_3_only', 'Regular tessellations (3 only)'), detail: t('stem.angles.equilateral_triangle_square_regular_he', 'Equilateral triangle, square, regular hexagon. Only regular polygons that tile the plane.') },
        { name: t('stem.angles.why_only_3', 'Why only 3?'), detail: t('stem.angles.interior_angle_must_divide_360_triangl', 'Interior angle must divide 360°. Triangle 60° (×6), square 90° (×4), hexagon 120° (×3). Pentagon 108° doesn\'t divide 360° → can\'t tile alone.') },
        { name: t('stem.angles.semiregular_archimedean_tessellations', 'Semiregular (Archimedean) tessellations'), detail: t('stem.angles.8_in_total_combine_multiple_regular_po', '8 in total. Combine multiple regular polygons; same arrangement at each vertex.') },
        { name: t('stem.angles.penrose_tilings_1974', 'Penrose tilings (1974)'), detail: t('stem.angles.aperiodic_tiling_never_repeats_exactly', 'Aperiodic tiling — never repeats exactly. 5-fold symmetry. Inspired discovery of quasicrystals.') },
        { name: t('stem.angles.honeycomb_conjecture', 'Honeycomb conjecture'), detail: t('stem.angles.hexagonal_tiling_minimizes_total_perim', 'Hexagonal tiling minimizes total perimeter for given area. Proven by Hales (1999). Why bees use hexagons.') },
        { name: t('stem.angles.voronoi_diagrams', 'Voronoi diagrams'), detail: t('stem.angles.each_region_points_closest_to_one_seed', 'Each region = points closest to one "seed" point. Appears in nature (giraffe spots, mud cracks, cell organization).') },
        { name: t('stem.angles.hyperbolic_tilings', 'Hyperbolic tilings'), detail: t('stem.angles.on_a_hyperbolic_plane_regular_pentagon', 'On a hyperbolic plane, regular pentagons (and many other shapes) CAN tile. M.C. Escher\'s "Circle Limit" series.') },
        { name: t('stem.angles.wang_tiles_1961', 'Wang tiles (1961)'), detail: t('stem.angles.colored_squares_that_must_match_neighb', 'Colored squares that must match neighbors on edges. Can simulate Turing machine → tiling problem is undecidable in general.') },
        { name: t('stem.angles.einstein_tile_2023', '"Einstein" tile (2023)'), detail: t('stem.angles.a_single_tile_that_aperiodically_tiles', 'A single tile that aperiodically tiles the plane (the "hat" and "spectre" shapes). Major recent discovery.') }
      ];

      var GEOMETRY_HISTORY = [
        { year: t('stem.angles.lib_3000_bce', '~3000 BCE'), who: t('stem.angles.lib_egyptians_babylonians', 'Egyptians + Babylonians'), what: t('stem.angles.lib_used_3_4_5_ropes_to_lay_out_right_angles_for', 'Used 3-4-5 ropes to lay out right angles for pyramids + buildings.') },
        { year: t('stem.angles.lib_300_bce', '~300 BCE'), who: t('stem.angles.lib_euclid', 'Euclid'), what: t('stem.angles.lib_elements_13_books_axiomatized_geometry_basis', '"Elements" — 13 books axiomatized geometry. Basis of geometry for 2000+ years.') },
        { year: t('stem.angles.lib_250_bce', '~250 BCE'), who: t('stem.angles.lib_archimedes', 'Archimedes'), what: t('stem.angles.lib_calculated_to_high_precision_volume_surface', 'Calculated π to high precision. Volume + surface area of sphere. Almost developed integral calculus.') },
        { year: '~150 CE', who: t('stem.angles.lib_ptolemy', 'Ptolemy'), what: t('stem.angles.lib_trigonometry_tables_geocentric_model_of_sola', 'Trigonometry tables. Geocentric model of solar system (Almagest).') },
        { year: '~830 CE', who: t('stem.angles.lib_al_khwarizmi', 'al-Khwarizmi'), what: t('stem.angles.lib_founded_algebra_al_jabr_linked_to_geometry_a', 'Founded algebra ("al-jabr"). Linked to geometry. "Algorithm" derives from his name.') },
        { year: '1637', who: t('stem.angles.lib_rene_descartes', 'René Descartes'), what: t('stem.angles.lib_analytic_geometry_coordinates_link_algebra_g', 'Analytic geometry — coordinates link algebra + geometry. "Cartesian" named for him.') },
        { year: '1675', who: t('stem.angles.lib_isaac_newton_leibniz', 'Isaac Newton + Leibniz'), what: t('stem.angles.lib_independently_developed_calculus_tangent_lin', 'Independently developed calculus. Tangent lines + areas → infinitesimal geometry.') },
        { year: '1820s', who: t('stem.angles.lib_lobachevsky_bolyai_gauss', 'Lobachevsky + Bolyai + Gauss'), what: t('stem.angles.lib_non_euclidean_geometry_parallel_postulate_no', 'Non-Euclidean geometry — parallel postulate not required.') },
        { year: '1854', who: t('stem.angles.lib_bernhard_riemann', 'Bernhard Riemann'), what: t('stem.angles.lib_differential_geometry_curved_manifolds_basis', 'Differential geometry — curved manifolds. Basis of Einstein\'s general relativity.') },
        { year: '1872', who: t('stem.angles.lib_felix_klein', 'Felix Klein'), what: t('stem.angles.lib_erlangen_program_classified_geometries_by_th', 'Erlangen program — classified geometries by their symmetry groups.') },
        { year: '1899', who: t('stem.angles.lib_david_hilbert', 'David Hilbert'), what: t('stem.angles.lib_axiomatized_euclidean_geometry_more_rigorous', 'Axiomatized Euclidean geometry more rigorously than Euclid himself.') },
        { year: '1915', who: t('stem.angles.lib_albert_einstein', 'Albert Einstein'), what: t('stem.angles.lib_general_relativity_gravity_is_curvature_of_s', 'General relativity: gravity is curvature of spacetime. Pure geometry of physics.') },
        { year: '1975', who: t('stem.angles.lib_benoit_mandelbrot', 'Benoit Mandelbrot'), what: t('stem.angles.lib_fractals_shapes_with_infinite_detail_at_ever', 'Fractals — shapes with infinite detail at every scale.') },
        { year: '2003', who: t('stem.angles.lib_grigori_perelman', 'Grigori Perelman'), what: t('stem.angles.lib_proved_poincare_conjecture_a_millennium_priz', 'Proved Poincaré conjecture (a Millennium Prize problem). Declined the $1M prize.') }
      ];

      var ANGLE_CAREERS = [
        { career: t('stem.angles.lib_architect', 'Architect'), use: t('stem.angles.lib_angles_in_building_design_roof_pitches_struc', 'Angles in building design — roof pitches, structural braces, sight lines. CAD software computes structural angles.') },
        { career: t('stem.angles.lib_surveyor', 'Surveyor'), use: t('stem.angles.lib_theodolites_measure_horizontal_vertical_angl', 'Theodolites measure horizontal + vertical angles. Triangulation determines land boundaries, elevations.') },
        { career: t('stem.angles.lib_civil_engineer', 'Civil engineer'), use: t('stem.angles.lib_road_banking_angles_bridge_truss_angles_dam', 'Road banking angles, bridge truss angles, dam slopes. Loads decomposed into perpendicular components.') },
        { career: t('stem.angles.lib_astronomer', 'Astronomer'), use: t('stem.angles.lib_telescope_pointing_parallax_measurements_ver', 'Telescope pointing, parallax measurements (very small angles), star positions in arcseconds.') },
        { career: t('stem.angles.lib_pilot_navigator', 'Pilot / navigator'), use: t('stem.angles.lib_compass_headings_glide_slopes_bearings_air_t', 'Compass headings, glide slopes, bearings. Air traffic control headings always in degrees.') },
        { career: t('stem.angles.lib_photographer_cinematographer', 'Photographer / cinematographer'), use: t('stem.angles.lib_field_of_view_fov_dutch_tilts_sun_angles_len', 'Field of view (FOV), Dutch tilts, sun angles. Lens choices determined by angle of view.') },
        { career: t('stem.angles.lib_carpenter', 'Carpenter'), use: t('stem.angles.lib_miter_saw_angles_for_picture_frames_roof_raf', 'Miter saw angles for picture frames, roof rafters, stair stringers. Speed square is angle reference.') },
        { career: t('stem.angles.lib_sailor', 'Sailor'), use: t('stem.angles.lib_wind_angle_point_of_sail_compass_headings_ce', 'Wind angle (point of sail), compass headings, celestial navigation with sextant.') },
        { career: t('stem.angles.lib_optometrist', 'Optometrist'), use: t('stem.angles.lib_astigmatism_axes_measured_in_degrees_prism_p', 'Astigmatism axes measured in degrees. Prism prescription for binocular vision problems.') },
        { career: t('stem.angles.lib_animator_game_dev', 'Animator / game dev'), use: t('stem.angles.lib_bone_rotations_in_rigs_camera_frustums_light', 'Bone rotations in rigs, camera frustums, lighting angles.') },
        { career: t('stem.angles.lib_athletic_coach', 'Athletic coach'), use: t('stem.angles.lib_optimal_launch_angles_for_projectiles_shot_p', 'Optimal launch angles for projectiles (shot put ~38°, long jump ~21°, javelin ~30-35°).') },
        { career: t('stem.angles.lib_geologist', 'Geologist'), use: t('stem.angles.lib_strike_and_dip_of_rock_layers_measured_with', 'Strike and dip of rock layers — measured with Brunton compass.') },
        { career: t('stem.angles.lib_robotics_engineer', 'Robotics engineer'), use: t('stem.angles.lib_joint_angles_of_robot_arms_sensor_field_of_v', 'Joint angles of robot arms, sensor field of view, path planning.') },
        { career: t('stem.angles.lib_anesthesiologist', 'Anesthesiologist'), use: t('stem.angles.lib_needle_insertion_angles_for_nerve_blocks_epi', 'Needle insertion angles for nerve blocks, epidurals.') }
      ];

      function renderPythagSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.a_b_pythagorean_theorem', 'a²+b² Pythagorean theorem')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.in_a_right_triangle_a_b_c_where_c_is_t', 'In a right triangle, a² + b² = c² where c is the hypotenuse. Sets of integers (a, b, c) that satisfy this are called Pythagorean triples. A "primitive" triple has no common factor.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['a', 'b', 'c', t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PYTHAG_TRIPLES.map(function(t, i) {
                  return h('tr', { key: 't'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, t.a),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, t.b),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, t.c),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem] italic' }, t.notes)
                  );
                })
              )
            )
          ),
          h('div', { className: 'mt-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-[0.6875rem] text-rose-900' },
            h('strong', null, t('stem.angles.generating_primitive_triples', 'Generating primitive triples: ')), t('stem.angles.for_positive_integers_m_n_with_no_comm', 'For positive integers m > n with no common factor and not both odd, a = m² − n², b = 2mn, c = m² + n². Tries m=2, n=1 → (3,4,5).')
          )
        );
      }

      function renderTrianglesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.triangle_types_and_formulas', '△ Triangle types and formulas')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.classification', 'Classification')),
            h('div', { className: 'space-y-1' },
              TRIANGLE_TYPES.map(function(t, i) {
                return h('div', { key: 't'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    h('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, t.type),
                    h('span', { className: 'text-[0.625rem] text-rose-700 font-mono ml-auto' }, t.angles)
                  ),
                  h('div', { className: 'text-[0.625rem] text-slate-700 italic mb-0.5' }, t.sides),
                  h('div', { className: 'text-[0.625rem] text-slate-700' }, t.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.key_formulas', 'Key formulas')),
          h('div', { className: 'space-y-1' },
            TRIANGLE_FORMULAS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, f.name),
                  h('span', { className: 'text-[0.6875rem] font-mono ml-auto text-rose-700 font-bold' }, f.formula)
                ),
                h('div', { className: 'text-[0.625rem] text-slate-700' }, f.notes)
              );
            })
          )
        );
      }

      function renderCircleSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.circle_geometry_2', '◯ Circle geometry')),
          h('div', { className: 'space-y-1' },
            CIRCLE_FACTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[0.6875rem] font-mono ml-auto text-rose-700 font-bold' }, c.formula)
                ),
                h('div', { className: 'text-[0.625rem] text-slate-700' }, c.notes)
              );
            })
          )
        );
      }

      function renderSolidsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.3d_solids_volumes_and_surface_areas', '⬢ 3D solids — volumes and surface areas')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_solid', 'Solid'), t('stem.angles.lib_volume_v', 'Volume (V)'), t('stem.angles.lib_surface_area_sa', 'Surface area (SA)'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SOLID_VOLUMES.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.name),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, s.V),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 text-[0.625rem]' }, s.SA),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderTransformSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.geometric_transformations', '↻ Geometric transformations')),
          h('div', { className: 'space-y-2' },
            TRANSFORMATIONS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, t.name),
                h('div', { className: 'text-[0.6875rem] text-rose-700 font-bold mb-1' }, t.effect),
                h('div', { className: 'text-[0.625rem] text-slate-700 mb-1' }, h('strong', null, __alloT('stem.angles.lib_preserves', 'Preserves: ')), t.preserves),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      function renderCoordsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.x_y_coordinate_systems', '(x,y) Coordinate systems')),
          h('div', { className: 'space-y-2' },
            COORD_SYSTEMS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[0.6875rem] font-mono text-rose-700 font-bold ml-auto px-2 py-0.5 rounded bg-rose-100' }, c.coords)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, h('strong', null, t('stem.angles.lib_use', 'Use: ')), c.use),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderVectorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.vectors_2', '→ Vectors')),
          h('div', { className: 'space-y-1' },
            VECTOR_NOTES.map(function(v, i) {
              return h('div', { key: 'v'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, v.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, v.detail)
              );
            })
          )
        );
      }

      function renderSymmetrySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.symmetry_2', '⟂ Symmetry')),
          h('div', { className: 'space-y-2' },
            SYMMETRY_TYPES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, s.name),
                  h('span', { className: 'text-[0.625rem] text-rose-700 font-mono ml-auto' }, s.count)
                ),
                h('div', { className: 'text-[0.625rem] text-slate-700 italic mb-1' }, t('stem.angles.lib_example', 'Example: ') + s.example),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderTilingsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.tessellations_tilings', '⬡ Tessellations & tilings')),
          h('div', { className: 'space-y-2' },
            TILING_FACTS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, t.name),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.detail)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.history_of_geometry', '🕰 History of geometry')),
          h('div', { className: 'space-y-2' },
            GEOMETRY_HISTORY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  h('span', { className: 'text-[0.625rem] font-mono text-rose-700 font-bold' }, g.year),
                  h('span', { className: 'text-[0.75rem] font-black text-rose-900' }, g.who)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, g.what)
              );
            })
          )
        );
      }

      function renderCareersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.careers_that_use_angles_every_day', '💼 Careers that use angles every day')),
          h('div', { className: 'space-y-2' },
            ANGLE_CAREERS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, c.career),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.use)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'types') return renderTypesSection();
        if (expSection === 'relationships') return renderRelationshipsSection();
        if (expSection === 'polygons') return renderPolygonsSection();
        if (expSection === 'trig') return renderTrigSection();
        if (expSection === 'special') return renderSpecialSection();
        if (expSection === 'units') return renderUnitsSection();
        if (expSection === 'world') return renderWorldSection();
        if (expSection === 'tricks') return renderTricksSection();
        if (expSection === 'compass') return renderCompassSection();
        if (expSection === 'pythag') return renderPythagSection();
        if (expSection === 'triangles') return renderTrianglesSection();
        if (expSection === 'circle') return renderCircleSection();
        if (expSection === 'solids') return renderSolidsSection();
        if (expSection === 'transform') return renderTransformSection();
        if (expSection === 'coords') return renderCoordsSection();
        if (expSection === 'vectors') return renderVectorsSection();
        if (expSection === 'symmetry') return renderSymmetrySection();
        if (expSection === 'tilings') return renderTilingsSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'careers') return renderCareersSection();
        if (expSection === 'conics') return renderConicsSection();
        if (expSection === 'platonic') return renderPlatonicSection();
        if (expSection === 'fractals') return renderFractalsSection();
        if (expSection === 'noneuclid') return renderNoneuclidSection();
        if (expSection === 'projection') return renderProjectionSection();
        if (expSection === 'sundial') return renderSundialSection();
        if (expSection === 'goldenratio') return renderGoldenRatioSection();
        if (expSection === 'origami') return renderOrigamiSection();
        if (expSection === 'sports') return renderSportsSection();
        if (expSection === 'art') return renderArtSection();
        if (expSection === 'tools') return renderToolsSection();
        if (expSection === 'constants') return renderConstantsSection();
        if (expSection === 'rivers') return renderRiversSection();
        if (expSection === 'buildings') return renderBuildingsSection();
        if (expSection === 'curves') return renderCurvesSection();
        if (expSection === 'mathematicians') return renderMathematiciansSection();
        if (expSection === 'practical') return renderPracticalSection();
        if (expSection === 'puzzles') return renderPuzzlesSection();
        if (expSection === 'tessell2') return renderTessell2Section();
        if (expSection === 'cities') return renderCitiesSection();
        if (expSection === 'mountains') return renderMountainsSection();
        if (expSection === 'planets') return renderPlanetsSection();
        if (expSection === 'building_angles') return renderBuildingAnglesSection();
        if (expSection === 'flag_design') return renderFlagDesignSection();
        if (expSection === 'shapes_iq') return renderShapesIqSection();
        if (expSection === 'theorems') return renderTheoremsSection();
        if (expSection === 'pisaCross') return renderPisaCrossSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var CLASSIC_THEOREMS = [
        { theorem: t('stem.angles.lib_pythagorean_theorem', 'Pythagorean theorem'), statement: t('stem.angles.lib_a2_b2_c2_for_right_triangles', 'a² + b² = c² for right triangles'), notes: t('stem.angles.lib_pre_dates_pythagoras_babylonians_knew_it_370', 'Pre-dates Pythagoras; Babylonians knew it. >370 distinct proofs exist.') },
        { theorem: t('stem.angles.lib_thales_s_theorem', 'Thales\'s theorem'), statement: t('stem.angles.lib_inscribed_angle_in_semicircle_90', 'Inscribed angle in semicircle = 90°'), notes: t('stem.angles.lib_special_case_of_inscribed_angle_theorem', 'Special case of inscribed angle theorem.') },
        { theorem: t('stem.angles.lib_triangle_inequality', 'Triangle inequality'), statement: t('stem.angles.lib_a_b_c_for_any_two_sides_third', 'a + b > c (for any two sides + third)'), notes: t('stem.angles.lib_generalizes_to_distance_is_shortest_along_st', 'Generalizes to: distance is "shortest along straight line".') },
        { theorem: t('stem.angles.lib_law_of_cosines', 'Law of cosines'), statement: t('stem.angles.lib_c2_a2_b2_2ab_cos_c', 'c² = a² + b² − 2ab cos C'), notes: t('stem.angles.lib_generalization_of_pythagoras_c_90_pythagoras', 'Generalization of Pythagoras. C=90° → Pythagoras.') },
        { theorem: t('stem.angles.lib_euler_s_formula_polyhedra', 'Euler\'s formula (polyhedra)'), statement: t('stem.angles.lib_v_e_f_2_for_convex_polyhedron', 'V − E + F = 2 for convex polyhedron'), notes: t('stem.angles.lib_holds_for_all_5_platonic_solids_many_others', 'Holds for all 5 Platonic solids + many others.') },
        { theorem: t('stem.angles.lib_four_color_theorem', 'Four-color theorem'), statement: t('stem.angles.lib_every_planar_map_can_be_colored_with_4_color', 'Every planar map can be colored with 4 colors'), notes: t('stem.angles.lib_first_major_theorem_proved_by_computer_1976', 'First major theorem proved by computer (1976).') },
        { theorem: t('stem.angles.lib_fermat_s_last_theorem', 'Fermat\'s last theorem'), statement: t('stem.angles.lib_no_integer_solutions_to_an_bn_cn_for_n_2', 'No integer solutions to aⁿ + bⁿ = cⁿ for n > 2'), notes: t('stem.angles.lib_conjectured_1637_proved_1994_by_andrew_wiles', 'Conjectured 1637, proved 1994 by Andrew Wiles.') },
        { theorem: t('stem.angles.lib_go_del_s_incompleteness', 'Gödel\'s incompleteness'), statement: t('stem.angles.lib_any_consistent_formal_system_contains_true_s', 'Any consistent formal system contains true statements unprovable in that system'), notes: t('stem.angles.lib_devastated_formalist_program_in_mathematics', 'Devastated formalist program in mathematics (1931).') },
        { theorem: t('stem.angles.lib_banach_tarski_paradox', 'Banach-Tarski paradox'), statement: t('stem.angles.lib_a_solid_ball_can_be_split_reassembled_into_t', 'A solid ball can be split + reassembled into two identical balls'), notes: t('stem.angles.lib_uses_non_measurable_pieces_axiom_of_choice', 'Uses non-measurable pieces + axiom of choice.') },
        { theorem: t('stem.angles.lib_bayes_theorem', 'Bayes\' theorem'), statement: 'P(A|B) = P(B|A) · P(A) / P(B)', notes: t('stem.angles.lib_foundation_of_probabilistic_inference_modern', 'Foundation of probabilistic inference + modern ML.') },
        { theorem: t('stem.angles.lib_central_limit_theorem', 'Central limit theorem'), statement: t('stem.angles.lib_sum_of_many_independent_random_variables_ten', 'Sum of many independent random variables tends to normal distribution'), notes: t('stem.angles.lib_why_bell_curve_appears_so_often', 'Why bell curve appears so often.') },
        { theorem: t('stem.angles.lib_euclidean_parallel_postulate', 'Euclidean parallel postulate'), statement: t('stem.angles.lib_through_a_point_not_on_a_line_exactly_one_pa', 'Through a point not on a line, exactly one parallel line exists'), notes: t('stem.angles.lib_equivalent_forms_triangle_angles_sum_to_180', 'Equivalent forms: triangle angles sum to 180°, Pythagoras holds. Dropping it gives non-Euclidean geometries.') },
        { theorem: t('stem.angles.lib_stokes_theorem', 'Stokes\' theorem'), statement: t('stem.angles.lib_integral_of_curl_over_surface_integral_aroun', 'Integral of curl over surface = integral around boundary'), notes: t('stem.angles.lib_unifies_green_s_divergence_fundamental_theor', 'Unifies Green\'s, divergence, fundamental theorem of calculus. Foundation of vector calculus.') },
        { theorem: t('stem.angles.lib_noether_s_theorem', 'Noether\'s theorem'), statement: t('stem.angles.lib_every_continuous_symmetry_implies_a_conserva', 'Every continuous symmetry implies a conservation law'), notes: t('stem.angles.lib_time_symmetry_conservation_of_energy_space_s', 'Time symmetry → conservation of energy. Space symmetry → momentum. Rotation → angular momentum.') },
        { theorem: t('stem.angles.lib_poincare_conjecture', 'Poincaré conjecture'), statement: t('stem.angles.lib_a_simply_connected_3_manifold_is_a_3_sphere', 'A simply-connected 3-manifold is a 3-sphere'), notes: t('stem.angles.lib_proved_by_grigori_perelman_2003_he_declined', 'Proved by Grigori Perelman (2003). He declined the $1M Millennium Prize and the Fields Medal.') },
        { theorem: t('stem.angles.lib_hairy_ball_theorem', 'Hairy ball theorem'), statement: t('stem.angles.lib_cannot_comb_a_hairy_ball_flat_without_creati', 'Cannot comb a hairy ball flat without creating a cowlick'), notes: t('stem.angles.lib_there_is_always_at_least_one_point_on_a_sphe', 'There is always at least one point on a sphere where wind speed = 0. Implications for weather.') },
        { theorem: t('stem.angles.lib_brouwer_fixed_point_theorem', 'Brouwer fixed-point theorem'), statement: t('stem.angles.lib_continuous_map_from_a_disk_to_itself_has_at', 'Continuous map from a disk to itself has at least one fixed point'), notes: t('stem.angles.lib_stir_a_cup_of_coffee_at_least_one_point_ends', 'Stir a cup of coffee — at least one point ends up where it started.') },
        { theorem: t('stem.angles.lib_borsuk_ulam_theorem', 'Borsuk-Ulam theorem'), statement: t('stem.angles.lib_for_any_continuous_map_s2_r2_two_antipodal_p', 'For any continuous map S² → R², two antipodal points map to the same point'), notes: t('stem.angles.lib_at_any_moment_two_antipodal_places_on_earth', 'At any moment, two antipodal places on Earth share exact same temperature + pressure.') }
      ];

      function renderTheoremsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.classic_mathematical_theorems', '∎ Classic mathematical theorems')),
          h('div', { className: 'space-y-2' },
            CLASSIC_THEOREMS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-1' }, t.theorem),
                h('div', { className: 'text-[0.6875rem] text-slate-800 font-mono mb-1' }, t.statement),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed italic' }, t.notes)
              );
            })
          )
        );
      }

      var SHAPE_FACTS = [
        { fact: t('stem.angles.circle_has_most_area_for_a_perimeter', 'Circle has most area for a perimeter'), detail: t('stem.angles.isoperimetric_inequality_4_a_p_equalit', 'Isoperimetric inequality: 4πA ≤ P². Equality only for circles. Why soap bubbles + planets are round.') },
        { fact: t('stem.angles.sphere_has_most_volume_for_a_surface_a', 'Sphere has most volume for a surface area'), detail: t('stem.angles.3d_version_of_above_single_bubbles_are', '3D version of above. Single bubbles are spheres; merged bubbles meet at 120° angles.') },
        { fact: t('stem.angles.regular_hexagons_tile_most_efficiently', 'Regular hexagons tile most efficiently'), detail: t('stem.angles.honeycomb_conjecture_proven_1999_by_ha', 'Honeycomb conjecture (proven 1999 by Hales): hexagonal tiling has lowest total edge length per area among any partition.') },
        { fact: t('stem.angles.triangle_is_most_rigid_shape', 'Triangle is most rigid shape'), detail: t('stem.angles.cannot_be_deformed_without_changing_si', 'Cannot be deformed without changing side lengths. Why bridges + roof trusses use triangles.') },
        { fact: t('stem.angles.squares_stack_densely_100', 'Squares stack densely (100%)'), detail: t('stem.angles.square_tiles_fill_the_plane_with_no_ga', 'Square tiles fill the plane with no gaps. Same for rectangles + parallelograms.') },
        { fact: t('stem.angles.circles_tile_poorly', 'Circles tile poorly'), detail: t('stem.angles.hexagonal_packing_of_circles_fills_90_', 'Hexagonal packing of circles fills ~90.7% of plane (best possible). Square packing only ~78.5%.') },
        { fact: t('stem.angles.sphere_packing_in_3d', 'Sphere packing in 3D'), detail: t('stem.angles.fcc_hcp_both_achieve_74_density_kepler', 'FCC + HCP both achieve ~74% density (Kepler conjecture, proven 2014 by Hales).') },
        { fact: t('stem.angles.five_regular_polyhedra', 'Five regular polyhedra'), detail: t('stem.angles.only_5_in_3d_tetrahedron_cube_octahedr', 'Only 5 in 3D: tetrahedron, cube, octahedron, dodecahedron, icosahedron. (Plato discussed.)') },
        { fact: t('stem.angles.tetrahedron_is_simplest', 'Tetrahedron is simplest'), detail: t('stem.angles.4_vertices_6_edges_4_faces_minimum_3d_', '4 vertices, 6 edges, 4 faces. Minimum 3D shape.') },
        { fact: t('stem.angles.sphere_cube_cylinder_volumes', 'Sphere/cube/cylinder volumes'), detail: t('stem.angles.for_sphere_inscribed_in_cylinder_h_2r_', 'For sphere inscribed in cylinder (h = 2r): V_sphere = 2/3 × V_cylinder. (Archimedes\'s favorite result.)') },
        { fact: t('stem.angles.4d_hypercube_tesseract', '4D hypercube (tesseract)'), detail: t('stem.angles.16_vertices_32_edges_24_faces_8_cells_', '16 vertices, 32 edges, 24 faces, 8 cells. Can be unfolded into 8 cubes (per Salvador Dalí).') },
        { fact: t('stem.angles.m_bius_strip', 'Möbius strip'), detail: t('stem.angles.single_sided_surface_cut_down_middle_l', 'Single-sided surface. Cut down middle → longer single loop. Cut at 1/3 → two interlocked rings (one Möbius).') },
        { fact: t('stem.angles.klein_bottle', 'Klein bottle'), detail: t('stem.angles.closed_non_orientable_surface_inside_o', 'Closed non-orientable surface. Inside = outside. Can be made in 3D only with self-intersection.') },
        { fact: t('stem.angles.reuleaux_triangle', 'Reuleaux triangle'), detail: t('stem.angles.curve_of_constant_width_not_a_circle_c', 'Curve of constant width (not a circle!). Can roll a board on three Reuleaux rollers smoothly. Drill bits use it.') },
        { fact: t('stem.angles.antiprism', 'Antiprism'), detail: t('stem.angles.two_parallel_polygons_rotated_360_2n_c', 'Two parallel polygons rotated 360°/2n, connected by triangles. Tetrahedron is the simplest antiprism.') },
        { fact: t('stem.angles.snub_cube', 'Snub cube'), detail: t('stem.angles.has_chirality_left_right_handed_forms_', 'Has chirality — left- + right-handed forms. One of two chiral Archimedean solids (other is snub dodecahedron).') },
        { fact: t('stem.angles.hyperbolic_paraboloid_saddle', 'Hyperbolic paraboloid (saddle)'), detail: t('stem.angles.equation_z_xy_straight_lines_lie_on_it', 'Equation z = xy. Straight lines lie on it in 2 families. Used in Pringles + some roofs.') },
        { fact: t('stem.angles.stable_polyhedron_count', 'Stable polyhedron count'), detail: t('stem.angles.gomboc_2006_is_first_known_mono_monost', '"Gomboc" (2006) is first known mono-monostatic — one stable + one unstable equilibrium. Like a self-righting Weeble.') },
        { fact: t('stem.angles.egg_shape_oval_tessellation', 'Egg shape (oval) tessellation'), detail: t('stem.angles.cannot_tile_plane_alone_gaps_but_7_egg', 'Cannot tile plane alone — gaps. But 7 egg-shapes form a hex-like cluster.') },
        { fact: t('stem.angles.polyhedra_in_nature', 'Polyhedra in nature'), detail: t('stem.angles.common_in_crystals_cube_nacl_octahedro', 'Common in crystals: cube (NaCl), octahedron (diamond, fluorite), dodecahedron (pyrite, garnet).') },
        { fact: t('stem.angles.buckyball_c', 'Buckyball (C₆₀)'), detail: t('stem.angles.truncated_icosahedron_60_carbons_like_', 'Truncated icosahedron. 60 carbons. Like soccer ball pattern. Discovered 1985.') },
        { fact: t('stem.angles.dna_double_helix', 'DNA double helix'), detail: t('stem.angles.helical_10_5_base_pairs_per_turn_major', 'Helical, ~10.5 base pairs per turn. Major + minor grooves. Constant diameter ~2 nm.') },
        { fact: t('stem.angles.honeycomb_cells', 'Honeycomb cells'), detail: t('stem.angles.hexagonal_prisms_with_rhombic_bottoms_', 'Hexagonal prisms with rhombic bottoms. Bees do not consciously calculate — biophysics naturally minimizes surface area.') },
        { fact: t('stem.angles.spaghetti_theorem', '"Spaghetti theorem"'), detail: t('stem.angles.drop_spaghetti_at_random_average_numbe', 'Drop spaghetti at random — average number of intersections = (L/πd) × π × n. Used to estimate π in classroom.') }
      ];

      function renderShapesIqSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.surprising_shape_facts', '◇ Surprising shape facts')),
          h('div', { className: 'space-y-1' },
            SHAPE_FACTS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, f.fact),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      var FLAG_GEOMETRY = [
        { flag: t('stem.angles.lib_united_states', 'United States'), ratio: '1.0 : 1.9', features: t('stem.angles.lib_50_stars_in_alternating_rows_of_6_5_13_strip', '50 stars in alternating rows of 6/5; 13 stripes'), notes: t('stem.angles.lib_stars_on_union_canton_5_rows_of_6_4_rows_of', 'Stars on union (canton): 5 rows of 6 + 4 rows of 5. Each star points up.') },
        { flag: t('stem.angles.lib_united_kingdom_union_jack', 'United Kingdom (Union Jack)'), ratio: '1 : 2', features: t('stem.angles.lib_crosses_of_st_george_st_andrew_st_patrick_co', 'Crosses of St. George, St. Andrew, St. Patrick combined'), notes: t('stem.angles.lib_asymmetric_has_a_correct_up_orientation_flyi', 'Asymmetric — has a correct "up" orientation. Flying upside-down is distress signal.') },
        { flag: t('stem.angles.lib_france', 'France'), ratio: '2 : 3', features: t('stem.angles.lib_blue_white_red_vertical_stripes_equal', 'Blue, white, red vertical stripes (equal)'), notes: t('stem.angles.lib_tricolore_inspired_many_revolutionary_flags', 'Tricolore inspired many revolutionary flags worldwide.') },
        { flag: t('stem.angles.lib_japan', 'Japan'), ratio: '2 : 3', features: t('stem.angles.lib_white_field_with_red_circle_in_center', 'White field with red circle in center'), notes: t('stem.angles.lib_circle_radius_3_10_of_width_center_of_flag', 'Circle radius = 3/10 of width. Center of flag.') },
        { flag: t('stem.angles.lib_china', 'China'), ratio: '2 : 3', features: t('stem.angles.lib_5_yellow_stars_on_red_field', '5 yellow stars on red field'), notes: t('stem.angles.lib_large_star_4_small_stars_arc_smaller_stars_h', 'Large star + 4 small stars arc; smaller stars have one point facing the large star\'s center.') },
        { flag: t('stem.angles.lib_canada', 'Canada'), ratio: '1 : 2', features: t('stem.angles.lib_white_square_1_1_with_11_point_maple_leaf_fl', 'White square (1:1) with 11-point maple leaf flanked by red bars'), notes: t('stem.angles.lib_11_points_5_left_5_right_1_base_adopted_1965', '11 points: 5 left, 5 right, 1 base. Adopted 1965.') },
        { flag: t('stem.angles.lib_switzerland', 'Switzerland'), ratio: t('stem.angles.lib_1_1_square', '1 : 1 (square)'), features: t('stem.angles.lib_red_field_with_white_cross', 'Red field with white cross'), notes: t('stem.angles.lib_one_of_only_two_square_national_flags_other', 'One of only two square national flags (other: Vatican City).') },
        { flag: t('stem.angles.lib_nepal', 'Nepal'), ratio: t('stem.angles.lib_unique_non_rectangular', 'unique non-rectangular'), features: t('stem.angles.lib_two_stacked_triangular_pennants', 'Two stacked triangular pennants'), notes: t('stem.angles.lib_only_non_rectangular_national_flag_constitut', 'Only non-rectangular national flag. Constitution specifies exact geometric construction.') },
        { flag: t('stem.angles.lib_israel', 'Israel'), ratio: '8 : 11', features: t('stem.angles.lib_white_field_two_blue_horizontal_stripes_star', 'White field, two blue horizontal stripes, Star of David in center'), notes: t('stem.angles.lib_star_of_david_two_overlapping_equilateral_tr', 'Star of David = two overlapping equilateral triangles.') },
        { flag: t('stem.angles.lib_brazil', 'Brazil'), ratio: '7 : 10', features: t('stem.angles.lib_green_field_yellow_rhombus_blue_disc_with_st', 'Green field, yellow rhombus, blue disc with stars + motto'), notes: t('stem.angles.lib_stars_represent_constellations_visible_from', 'Stars represent constellations visible from Rio at moment of independence proclamation.') },
        { flag: t('stem.angles.lib_south_africa', 'South Africa'), ratio: '2 : 3', features: t('stem.angles.lib_y_shape_pall_horizontal_y_dividing_6_colors', 'Y-shape pall (horizontal Y) dividing 6 colors'), notes: t('stem.angles.lib_adopted_1994_six_colors_represent_the_new_de', 'Adopted 1994. Six colors represent the new democracy.') },
        { flag: 'EU', ratio: '2 : 3', features: t('stem.angles.lib_12_yellow_stars_in_circle_on_blue_field', '12 yellow stars in circle on blue field'), notes: t('stem.angles.lib_12_symbol_of_perfection_not_member_count_sta', '12 = symbol of perfection (not member count). Stars 5-pointed, pointed up.') },
        { flag: t('stem.angles.lib_nato', 'NATO'), ratio: '3 : 4', features: t('stem.angles.lib_dark_blue_field_with_white_compass_rose_circ', 'Dark blue field with white compass rose + circle'), notes: t('stem.angles.lib_compass_rose_4_cardinal_directions_symbolizi', 'Compass rose = 4 cardinal directions, symbolizing unity of purpose.') },
        { flag: t('stem.angles.lib_olympic', 'Olympic'), ratio: '2 : 3', features: t('stem.angles.lib_5_interlocking_rings_blue_yellow_black_green', '5 interlocking rings (blue, yellow, black, green, red) on white field'), notes: t('stem.angles.lib_five_rings_five_inhabited_continents_six_col', 'Five rings = five inhabited continents. Six colors (with white field) cover all national flags at time of design.') },
        { flag: t('stem.angles.lib_pirate_jolly_roger', 'Pirate (Jolly Roger)'), ratio: t('stem.angles.lib_varies', 'varies'), features: t('stem.angles.lib_skull_above_crossed_bones', 'Skull above crossed bones'), notes: t('stem.angles.lib_different_captains_had_distinct_designs_edwa', 'Different captains had distinct designs. Edward Teach (Blackbeard) had skeleton + spear + heart.') }
      ];

      var FLAG_GEOMETRY_NOTES = [
        { topic: t('stem.angles.lib_vexillology', 'Vexillology'), detail: t('stem.angles.study_of_flags_comes_from_latin_vexill', 'Study of flags. Comes from Latin vexillum (flag carried by Roman cavalry).') },
        { topic: t('stem.angles.lib_good_flag_design_principles_nava', 'Good flag design principles (NAVA)'), detail: t('stem.angles.keep_it_simple_a_child_can_draw_from_m', 'Keep it simple (a child can draw from memory), use meaningful symbolism, 2-3 basic colors, no lettering or seals, be distinctive.') },
        { topic: t('stem.angles.lib_aspect_ratios', 'Aspect ratios'), detail: t('stem.angles.most_common_2_3_e_g_france_germany_us_', 'Most common: 2:3 (e.g., France, Germany). US is 1:1.9. UK is 1:2. Some unusual: Switzerland 1:1, Nepal non-rectangular.') },
        { topic: t('stem.angles.lib_charges', 'Charges'), detail: t('stem.angles.symbols_added_to_flag_stars_crosses_an', 'Symbols added to flag (stars, crosses, animals). Heraldic vocabulary describes positioning.') },
        { topic: t('stem.angles.lib_canton', 'Canton'), detail: t('stem.angles.upper_left_rectangle_about_1_4_the_fla', 'Upper-left rectangle (about 1/4 the flag). US stars go here. Australia, NZ also use canton design.') },
        { topic: t('stem.angles.lib_field', 'Field'), detail: t('stem.angles.background_color_colors_of_flag', 'Background color/colors of flag.') },
        { topic: t('stem.angles.lib_hoist_fly', 'Hoist + fly'), detail: t('stem.angles.hoist_side_attached_to_pole_fly_opposi', 'Hoist = side attached to pole. Fly = opposite (free) side.') },
        { topic: t('stem.angles.lib_color_symbolism_common', 'Color symbolism (common)'), detail: t('stem.angles.red_courage_revolution_blood_blue_ocea', 'Red = courage, revolution, blood. Blue = ocean, sky, freedom. Green = land, nature, Islam. White = peace, purity. Yellow/Gold = wealth, sun.') },
        { topic: t('stem.angles.lib_distress_signals', 'Distress signals'), detail: t('stem.angles.flying_flag_upside_down_where_asymmetr', 'Flying flag upside-down (where asymmetric); flying flag at half-staff = mourning.') },
        { topic: t('stem.angles.lib_nato_un_flags', 'NATO + UN flags'), detail: t('stem.angles.light_blue_with_map_un_or_compass_nato', 'Light blue with map (UN) or compass (NATO). Intentionally avoid national/religious symbols.') }
      ];

      function renderFlagDesignSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.flag_geometry_2', '🚩 Flag geometry')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.flags_are_codified_geometry_every_nati', 'Flags are codified geometry. Every national flag has precise specifications: aspect ratio, color codes, charge positions, star angles.')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.selected_national_organizational_flags', 'Selected national + organizational flags')),
            h('div', { className: 'space-y-2' },
              FLAG_GEOMETRY.map(function(f, i) {
                return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, f.flag),
                    h('span', { className: 'text-[0.625rem] text-rose-700 font-mono ml-auto px-2 py-0.5 rounded bg-rose-100' }, f.ratio)
                  ),
                  h('div', { className: 'text-[0.625rem] text-slate-700 mb-1' }, h('strong', null, t('stem.angles.lib_features', 'Features: ')), f.features),
                  h('div', { className: 'text-[0.625rem] text-slate-600 italic' }, f.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.flag_design_principles', 'Flag design principles')),
          h('div', { className: 'space-y-1' },
            FLAG_GEOMETRY_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.6875rem] font-black text-rose-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final angles data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ROOF_PITCHES = [
        { name: t('stem.angles.1_12_flat_ish', '1:12 (flat-ish)'), degrees: '4.76°', percent: '8.3%', notes: t('stem.angles.lib_membrane_roofs_only_too_shallow_for_shingles', 'Membrane roofs only. Too shallow for shingles. Drainage barely works.') },
        { name: '2:12', degrees: '9.46°', percent: '16.7%', notes: t('stem.angles.lib_low_slope_some_metal_membrane_below_shingle', 'Low-slope. Some metal + membrane. Below shingle minimum.') },
        { name: '3:12', degrees: '14.04°', percent: '25.0%', notes: t('stem.angles.lib_minimum_recommended_for_asphalt_shingles', 'Minimum recommended for asphalt shingles.') },
        { name: '4:12', degrees: '18.43°', percent: '33.3%', notes: t('stem.angles.lib_common_modern_residential_pitch', 'Common modern residential pitch.') },
        { name: '5:12', degrees: '22.62°', percent: '41.7%', notes: t('stem.angles.lib_typical_residential', 'Typical residential.') },
        { name: t('stem.angles.6_12_standard', '6:12 (standard)'), degrees: '26.57°', percent: '50.0%', notes: t('stem.angles.lib_very_common_good_water_snow_shed_walkable_wi', 'Very common. Good water/snow shed. Walkable with care.') },
        { name: '7:12', degrees: '30.26°', percent: '58.3%', notes: t('stem.angles.lib_steeper_traditional_requires_safety_gear_to', 'Steeper traditional. Requires safety gear to work on.') },
        { name: '8:12', degrees: '33.69°', percent: '66.7%', notes: t('stem.angles.lib_steep_common_in_colder_climates_sheds_snow', 'Steep. Common in colder climates (sheds snow).') },
        { name: '9:12', degrees: '36.87°', percent: '75.0%', notes: t('stem.angles.lib_steep_traditional_cathedral_ceilings', 'Steep traditional. Cathedral ceilings.') },
        { name: '10:12', degrees: '39.81°', percent: '83.3%', notes: t('stem.angles.lib_very_steep_victorian_tudor_styles', 'Very steep. Victorian + Tudor styles.') },
        { name: t('stem.angles.12_12_45', '12:12 (45°)'), degrees: '45.00°', percent: '100.0%', notes: t('stem.angles.lib_a_frame_strong_shedding_distinctive_look', 'A-frame. Strong shedding. Distinctive look.') },
        { name: '18:12', degrees: '56.31°', percent: '150.0%', notes: t('stem.angles.lib_extreme_some_chalets_churches_steep_enough_t', 'Extreme. Some chalets + churches. Steep enough to be dangerous to work on.') },
        { name: t('stem.angles.24_12_steep', '24:12 (steep)'), degrees: '63.43°', percent: '200.0%', notes: t('stem.angles.lib_very_rare_in_residential_gothic_chalet_style', 'Very rare in residential. Gothic + chalet styles.') }
      ];

      var RAMP_GRADES = [
        { use: t('stem.angles.lib_wheelchair_ada_standard', 'Wheelchair (ADA standard)'), grade: '1:12', degrees: '4.76°', notes: t('stem.angles.lib_max_for_public_accessibility_1_inch_rise_per', 'Max for public accessibility. 1 inch rise per 12 inches run. 30 ft ramp for 30 inches rise.') },
        { use: t('stem.angles.lib_wheelchair_preferred', 'Wheelchair (preferred)'), grade: '1:16-1:20', degrees: '2.86-3.58°', notes: t('stem.angles.lib_easier_than_1_12_used_where_space_allows', 'Easier than 1:12. Used where space allows.') },
        { use: t('stem.angles.lib_wheelchair_max_short', 'Wheelchair (max short)'), grade: '1:8', degrees: '7.13°', notes: t('stem.angles.lib_for_very_short_runs_only_3_inches_rise', 'For very short runs only (< 3 inches rise).') },
        { use: t('stem.angles.lib_pedestrian_sidewalk_max', 'Pedestrian sidewalk max'), grade: '1:20', degrees: '2.86°', notes: t('stem.angles.lib_no_ramp_considered_needed_below_this_ada_cro', 'No ramp considered needed below this. ADA cross-slope: max 2%.') },
        { use: t('stem.angles.lib_bike_path_max', 'Bike path max'), grade: '5%', degrees: '2.86°', notes: t('stem.angles.lib_comfortable_8_considered_max_for_most_cyclis', 'Comfortable. 8% considered max for most cyclists.') },
        { use: t('stem.angles.lib_driveway_typical', 'Driveway typical'), grade: t('stem.angles.lib_12_max', '12% max'), degrees: '6.84°', notes: t('stem.angles.lib_steeper_risks_bottoming_out_cars_snow_proble', 'Steeper risks bottoming out cars + snow problems.') },
        { use: t('stem.angles.lib_driveway_max_cities_allow', 'Driveway max (cities allow)'), grade: '20%', degrees: '11.31°', notes: t('stem.angles.lib_san_francisco_hills_some_neighborhoods_lille', 'San Francisco hills + some neighborhoods. Lillet Street ~31.5%.') },
        { use: t('stem.angles.lib_highway_interstate_max', 'Highway interstate max'), grade: '6%', degrees: '3.43°', notes: t('stem.angles.lib_federal_interstate_standard_mountain_interst', 'Federal interstate standard. Mountain interstates up to 7%.') },
        { use: t('stem.angles.lib_highway_secondary', 'Highway secondary'), grade: '7-9%', degrees: '4-5.14°', notes: t('stem.angles.lib_steeper_allowed_on_lower_volume_roads', 'Steeper allowed on lower-volume roads.') },
        { use: t('stem.angles.lib_railroad_standard', 'Railroad standard'), grade: '1-2%', degrees: '0.57-1.15°', notes: t('stem.angles.lib_steel_on_steel_friction_is_limiting_factor', 'Steel-on-steel friction is limiting factor.') },
        { use: t('stem.angles.lib_railroad_mountain_max', 'Railroad mountain (max)'), grade: '4-5%', degrees: '2.29-2.86°', notes: t('stem.angles.lib_special_equipment_or_cog_rack_needed_for_ste', 'Special equipment or cog/rack needed for steeper.') },
        { use: t('stem.angles.lib_cog_railway', 'Cog railway'), grade: 'up to ~48%', degrees: '~25.6°', notes: t('stem.angles.lib_pikes_peak_cog_railway_mount_washington_cog', 'Pikes Peak Cog Railway, Mount Washington Cog Railway.') },
        { use: t('stem.angles.lib_funicular', 'Funicular'), grade: 'up to ~31%', degrees: '~17.2°', notes: t('stem.angles.lib_two_cars_counterbalance_via_cable', 'Two cars counterbalance via cable.') },
        { use: t('stem.angles.lib_loading_ramp_truck', 'Loading ramp (truck)'), grade: '15-30%', degrees: '8.5-16.7°', notes: t('stem.angles.lib_varies_by_application_steeper_shorter_but_ha', 'Varies by application. Steeper = shorter but harder.') },
        { use: t('stem.angles.lib_skate_ramp_mini', 'Skate ramp (mini)'), grade: '~80% (38°)', degrees: '38°+', notes: t('stem.angles.lib_quarter_pipes_go_to_vertical_90_at_top', 'Quarter pipes go to vertical (90°) at top.') },
        { use: t('stem.angles.lib_roller_coaster_max_drop', 'Roller coaster max drop'), grade: '~80-90°', degrees: t('stem.angles.lib_80_90_some_past_vertical', '80-90° (some past vertical)'), notes: t('stem.angles.lib_drops_past_90_overhanging_mumbo_jumbo_takabi', 'Drops past 90° (overhanging): Mumbo Jumbo, Takabisha.') }
      ];

      function renderBuildingAnglesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.roof_pitch_ramp_grade_tables', '◢ Roof pitch + ramp grade tables')),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.roof_pitches_rise_run_notation', 'Roof pitches (rise:run notation)')),
            h('p', { className: 'text-[0.6875rem] text-slate-700 mb-2' }, t('stem.angles.x_12_means_x_inches_rise_per_12_inches', 'X:12 means X inches rise per 12 inches of horizontal run.')),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
                h('thead', null,
                  h('tr', { className: 'bg-slate-100' },
                    [t('stem.angles.lib_pitch_x_12', 'Pitch (X:12)'), t('stem.angles.lib_angle', 'Angle'), t('stem.angles.lib_slope', '% slope'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                      return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                h('tbody', null,
                  ROOF_PITCHES.map(function(r, i) {
                    return h('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, r.name),
                      h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, r.degrees),
                      h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, r.percent),
                      h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, r.notes)
                    );
                  })
                )
              )
            )
          ),
          h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.ramp_grades_transportation_slopes', 'Ramp grades + transportation slopes')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_use_case', 'Use case'), t('stem.angles.lib_grade', 'Grade'), t('stem.angles.lib_angle', 'Angle'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                RAMP_GRADES.map(function(g, i) {
                  return h('tr', { key: 'g'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, g.use),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, g.grade),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, g.degrees),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, g.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var MOUNTAINS = [
        { peak: t('stem.angles.lib_mount_everest', 'Mount Everest'), height: '8,848.86 m', range: t('stem.angles.lib_himalaya', 'Himalaya'), country: t('stem.angles.lib_nepal_china', 'Nepal/China'), notes: t('stem.angles.lib_highest_point_on_earth_above_sea_level_slope', 'Highest point on Earth above sea level. Slope angles up to 60° on some sections.') },
        { peak: t('stem.angles.lib_k2_mount_godwin_austen', 'K2 (Mount Godwin-Austen)'), height: '8,611 m', range: t('stem.angles.lib_karakoram', 'Karakoram'), country: t('stem.angles.lib_pakistan_china', 'Pakistan/China'), notes: t('stem.angles.lib_second_highest_much_harder_more_dangerous_th', 'Second highest. Much harder + more dangerous than Everest.') },
        { peak: t('stem.angles.lib_kangchenjunga', 'Kangchenjunga'), height: '8,586 m', range: t('stem.angles.lib_himalaya', 'Himalaya'), country: t('stem.angles.lib_nepal_india', 'Nepal/India'), notes: t('stem.angles.lib_third_highest_five_peaks_locals_consider_it', 'Third highest. Five peaks; locals consider it sacred.') },
        { peak: t('stem.angles.lib_annapurna_i', 'Annapurna I'), height: '8,091 m', range: t('stem.angles.lib_himalaya', 'Himalaya'), country: t('stem.angles.lib_nepal', 'Nepal'), notes: t('stem.angles.lib_among_the_most_dangerous_8000ers_32_fatality', 'Among the most dangerous 8000ers (~32% fatality rate).') },
        { peak: t('stem.angles.lib_aconcagua', 'Aconcagua'), height: '6,961 m', range: t('stem.angles.lib_andes', 'Andes'), country: t('stem.angles.lib_argentina', 'Argentina'), notes: t('stem.angles.lib_highest_outside_asia_non_technical_climb_mos', 'Highest outside Asia. Non-technical climb (mostly walk-up).') },
        { peak: t('stem.angles.lib_denali_mount_mckinley', 'Denali (Mount McKinley)'), height: '6,190 m', range: t('stem.angles.lib_alaska_range', 'Alaska Range'), country: t('stem.angles.lib_usa', 'USA'), notes: t('stem.angles.lib_highest_in_north_america_extreme_cold_altitu', 'Highest in North America. Extreme cold + altitude.') },
        { peak: t('stem.angles.lib_mount_kilimanjaro', 'Mount Kilimanjaro'), height: '5,895 m', range: t('stem.angles.lib_standalone', 'standalone'), country: t('stem.angles.lib_tanzania', 'Tanzania'), notes: t('stem.angles.lib_highest_in_africa_volcanic_glaciers_receding', 'Highest in Africa. Volcanic. Glaciers receding fast.') },
        { peak: t('stem.angles.lib_mont_blanc', 'Mont Blanc'), height: '4,808 m', range: t('stem.angles.lib_alps', 'Alps'), country: t('stem.angles.lib_france_italy', 'France/Italy'), notes: t('stem.angles.lib_highest_in_western_europe', 'Highest in western Europe.') },
        { peak: t('stem.angles.lib_mount_elbrus', 'Mount Elbrus'), height: '5,642 m', range: t('stem.angles.lib_caucasus', 'Caucasus'), country: t('stem.angles.lib_russia', 'Russia'), notes: t('stem.angles.lib_highest_in_europe_geographic_definition_vari', 'Highest in Europe (geographic definition varies).') },
        { peak: t('stem.angles.lib_mount_whitney', 'Mount Whitney'), height: '4,421 m', range: t('stem.angles.lib_sierra_nevada', 'Sierra Nevada'), country: t('stem.angles.lib_usa', 'USA'), notes: t('stem.angles.lib_highest_in_contiguous_us_85_mi_from_badwater', 'Highest in contiguous US. ~85 mi from Badwater (lowest in US).') },
        { peak: t('stem.angles.lib_mount_fuji', 'Mount Fuji'), height: '3,776 m', range: t('stem.angles.lib_standalone', 'standalone'), country: t('stem.angles.lib_japan', 'Japan'), notes: t('stem.angles.lib_iconic_stratovolcano_symmetrical_slopes_30_3', 'Iconic stratovolcano. Symmetrical slopes ~30-35°.') },
        { peak: t('stem.angles.lib_mount_olympus', 'Mount Olympus'), height: '2,917 m', range: t('stem.angles.lib_standalone', 'standalone'), country: t('stem.angles.lib_greece', 'Greece'), notes: t('stem.angles.lib_highest_in_greece_mythological_home_of_greek', 'Highest in Greece. Mythological home of Greek gods.') },
        { peak: t('stem.angles.lib_mount_etna', 'Mount Etna'), height: t('stem.angles.lib_3_357_m_grows', '~3,357 m (grows)'), range: t('stem.angles.lib_standalone', 'standalone'), country: t('stem.angles.lib_italy_sicily', 'Italy (Sicily)'), notes: t('stem.angles.lib_most_active_volcano_in_europe_frequent_erupt', 'Most active volcano in Europe. Frequent eruptions change height.') },
        { peak: t('stem.angles.lib_mauna_kea', 'Mauna Kea'), height: t('stem.angles.lib_4_207_m_above_sea_10_200_m_from_base', '4,207 m (above sea); ~10,200 m from base'), range: t('stem.angles.lib_standalone', 'standalone'), country: t('stem.angles.lib_usa_hawaii', 'USA (Hawaii)'), notes: t('stem.angles.lib_tallest_from_base_hosts_world_class_observat', 'Tallest from base. Hosts world-class observatories.') },
        { peak: t('stem.angles.lib_olympus_mons_mars', 'Olympus Mons (Mars)'), height: '~21,900 m', range: t('stem.angles.lib_standalone', 'standalone'), country: t('stem.angles.lib_mars', 'Mars'), notes: t('stem.angles.lib_tallest_known_mountain_in_solar_system_3_eve', 'Tallest known mountain in solar system. ~3× Everest.') }
      ];

      var PLANET_DATA = [
        { planet: t('stem.angles.lib_mercury', 'Mercury'), diameter: '4,879 km', distance: '0.39 AU', day: t('stem.angles.lib_58_6_earth_days', '58.6 Earth days'), year: t('stem.angles.lib_88_earth_days', '88 Earth days'), tilt: '0.034°', notes: t('stem.angles.lib_no_atmosphere_extreme_temperature_swings_180', 'No atmosphere. Extreme temperature swings (−180°C to +430°C).') },
        { planet: t('stem.angles.lib_venus', 'Venus'), diameter: '12,104 km', distance: '0.72 AU', day: t('stem.angles.lib_243_earth_days_retrograde', '243 Earth days (retrograde)'), year: t('stem.angles.lib_225_earth_days', '225 Earth days'), tilt: '177.4°', notes: t('stem.angles.lib_day_longer_than_year_hellish_atmosphere_96_c', 'Day longer than year. Hellish atmosphere (96% CO₂, ~92 atm, 462°C).') },
        { planet: t('stem.angles.lib_earth', 'Earth'), diameter: '12,742 km', distance: '1.00 AU', day: '23.93 hr', year: t('stem.angles.lib_365_25_days', '365.25 days'), tilt: '23.44°', notes: t('stem.angles.lib_tilt_causes_seasons_only_known_life_bearing', 'Tilt causes seasons. Only known life-bearing planet.') },
        { planet: t('stem.angles.lib_mars', 'Mars'), diameter: '6,779 km', distance: '1.52 AU', day: '24.6 hr', year: t('stem.angles.lib_687_earth_days', '687 Earth days'), tilt: '25.19°', notes: t('stem.angles.lib_similar_day_length_to_earth_water_ice_eviden', 'Similar day length to Earth. Water ice + evidence of ancient oceans.') },
        { planet: t('stem.angles.lib_jupiter', 'Jupiter'), diameter: '139,820 km', distance: '5.20 AU', day: '9.93 hr', year: t('stem.angles.lib_11_86_earth_years', '11.86 Earth years'), tilt: '3.13°', notes: t('stem.angles.lib_largest_planet_could_fit_all_other_planets_i', 'Largest planet. Could fit all other planets inside. Great Red Spot storm.') },
        { planet: t('stem.angles.lib_saturn', 'Saturn'), diameter: '116,460 km', distance: '9.58 AU', day: '10.7 hr', year: t('stem.angles.lib_29_4_earth_years', '29.4 Earth years'), tilt: '26.73°', notes: t('stem.angles.lib_most_famous_rings_lower_density_than_water_w', 'Most famous rings. Lower density than water — would float.') },
        { planet: t('stem.angles.lib_uranus', 'Uranus'), diameter: '50,724 km', distance: '19.22 AU', day: t('stem.angles.lib_17_2_hr_retrograde', '17.2 hr (retrograde)'), year: t('stem.angles.lib_84_earth_years', '84 Earth years'), tilt: '97.77°', notes: t('stem.angles.lib_rotates_on_its_side_pale_blue_from_methane', 'Rotates on its side. Pale blue from methane.') },
        { planet: t('stem.angles.lib_neptune', 'Neptune'), diameter: '49,244 km', distance: '30.05 AU', day: '16.1 hr', year: t('stem.angles.lib_165_earth_years', '165 Earth years'), tilt: '28.32°', notes: t('stem.angles.lib_strongest_winds_in_solar_system_2_100_km_h_h', 'Strongest winds in solar system (2,100 km/h). Has never completed an orbit since discovery (1846).') },
        { planet: t('stem.angles.lib_pluto_dwarf', 'Pluto (dwarf)'), diameter: '2,377 km', distance: t('stem.angles.lib_39_5_au_avg', '39.5 AU avg'), day: t('stem.angles.lib_6_4_earth_days', '6.4 Earth days'), year: t('stem.angles.lib_248_earth_years', '248 Earth years'), tilt: '122.5°', notes: t('stem.angles.lib_reclassified_as_dwarf_planet_2006_has_5_moon', 'Reclassified as dwarf planet (2006). Has 5 moons. Heart-shaped Tombaugh Regio.') },
        { planet: t('stem.angles.lib_moon_earth_s', 'Moon (Earth\'s)'), diameter: '3,474 km', distance: t('stem.angles.lib_0_0026_au_from_earth', '0.0026 AU from Earth'), day: t('stem.angles.lib_27_3_earth_days_tidally_locked', '27.3 Earth days (tidally locked)'), year: t('stem.angles.lib_orbits_earth_in_27_3_days', 'orbits Earth in 27.3 days'), tilt: '6.68°', notes: t('stem.angles.lib_same_face_always_toward_earth_tides_arise_fr', 'Same face always toward Earth. Tides arise from Moon\'s gravity.') },
        { planet: t('stem.angles.lib_ceres_dwarf', 'Ceres (dwarf)'), diameter: '940 km', distance: '2.77 AU', day: '9 hr', year: t('stem.angles.lib_4_6_earth_years', '4.6 Earth years'), tilt: '4°', notes: t('stem.angles.lib_largest_object_in_asteroid_belt_visited_by_d', 'Largest object in asteroid belt. Visited by Dawn (2015).') },
        { planet: t('stem.angles.lib_eris_dwarf', 'Eris (dwarf)'), diameter: '2,326 km', distance: t('stem.angles.lib_67_8_au_avg', '67.8 AU avg'), day: '25.9 hr', year: t('stem.angles.lib_558_earth_years', '558 Earth years'), tilt: t('stem.angles.lib_unknown', 'unknown'), notes: t('stem.angles.lib_discovery_triggered_pluto_demotion_slightly', 'Discovery triggered Pluto demotion. Slightly more massive than Pluto.') }
      ];

      var SOLAR_SYSTEM_FACTS = [
        { fact: t('stem.angles.total_solar_system_mass', 'Total solar system mass'), detail: t('stem.angles.sun_99_86_jupiter_0_095_everything_els', 'Sun = 99.86%. Jupiter = 0.095%. Everything else = 0.045%.') },
        { fact: t('stem.angles.astronomical_unit_au', 'Astronomical Unit (AU)'), detail: t('stem.angles.149_597_870_700_m_defined_exactly_ligh', '149,597,870,700 m. Defined exactly. Light takes ~8.3 min to cross 1 AU.') },
        { fact: t('stem.angles.lib_light_year', 'Light-year'), detail: t('stem.angles.9_461_10_m_distance_light_travels_in_1', '9.461×10¹⁵ m. Distance light travels in 1 Julian year.') },
        { fact: t('stem.angles.parsec', 'Parsec'), detail: t('stem.angles.3_26_light_years_distance_at_which_1_a', '~3.26 light-years. Distance at which 1 AU subtends 1 arcsecond.') },
        { fact: t('stem.angles.voyager_1_distance', 'Voyager 1 distance'), detail: t('stem.angles.165_au_2024_fastest_human_made_object_', '~165 AU (2024). Fastest human-made object leaving solar system. Still receiving data.') },
        { fact: t('stem.angles.sun_mass', 'Sun mass'), detail: t('stem.angles.1_989_10_kg_333_000_earth_masses', '1.989×10³⁰ kg. ~333,000 Earth masses.') },
        { fact: t('stem.angles.sun_fusion', 'Sun fusion'), detail: t('stem.angles.620_million_tons_of_h_he_every_second_', '~620 million tons of H → He every second. Loses ~4 million tons as energy (E = mc²).') },
        { fact: t('stem.angles.solar_wind', 'Solar wind'), detail: t('stem.angles.stream_of_charged_particles_400_800_km', 'Stream of charged particles. ~400-800 km/s near Earth. Creates auroras + sculpts comet tails.') }
      ];

      function renderMountainsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.notable_peaks_their_slopes', '⛰ Notable peaks + their slopes')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_peak', 'Peak'), t('stem.angles.lib_height', 'Height'), t('stem.angles.lib_range', 'Range'), t('stem.angles.lib_country', 'Country'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MOUNTAINS.map(function(m, i) {
                  return h('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.peak),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, m.height),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, m.range),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, m.country),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, m.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderPlanetsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.solar_system_planets_dwarf_planets', '🪐 Solar system planets + dwarf planets')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.axial_tilt_drives_seasons_tilt_90_mean', 'Axial tilt drives seasons. Tilt > 90° means retrograde rotation (Venus, Uranus, Pluto).')),
          h('div', { className: 'overflow-x-auto mb-3' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_planet', 'Planet'), t('stem.angles.lib_diameter', 'Diameter'), t('stem.angles.lib_distance', 'Distance'), t('stem.angles.lib_day', 'Day'), t('stem.angles.lib_year', 'Year'), t('stem.angles.lib_tilt', 'Tilt'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PLANET_DATA.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.planet),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, p.diameter),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, p.distance),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, p.day),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, p.year),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, p.tilt),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, p.notes)
                  );
                })
              )
            )
          ),
          h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, t('stem.angles.solar_system_facts', 'Solar system facts')),
          h('div', { className: 'space-y-1' },
            SOLAR_SYSTEM_FACTS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.6875rem] font-black text-rose-900 mb-0.5' }, f.fact),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var GEOMETRY_PUZZLES = [
        { name: t('stem.angles.k_nigsberg_bridges', 'Königsberg bridges'), description: t('stem.angles.can_you_cross_each_of_the_7_bridges_of', 'Can you cross each of the 7 bridges of Königsberg exactly once?'), answer: t('stem.angles.no_euler_proved_1736_you_need_each_nod', 'No. Euler proved (1736) you need each node to have even degree, except possibly 2 odd-degree nodes. Königsberg had 4 odd-degree nodes. Founded graph theory.') },
        { name: t('stem.angles.squaring_the_circle', 'Squaring the circle'), description: t('stem.angles.using_only_compass_straightedge_constr', 'Using only compass + straightedge, construct a square with same area as a given circle.'), answer: t('stem.angles.impossible_is_transcendental_lindemann', 'Impossible. π is transcendental (Lindemann 1882). Cannot be constructed with finite C+S operations.') },
        { name: t('stem.angles.doubling_the_cube', 'Doubling the cube'), description: t('stem.angles.construct_a_cube_with_twice_the_volume', 'Construct a cube with twice the volume of a given cube using compass + straightedge.'), answer: t('stem.angles.impossible_requires_2_which_is_algebra', 'Impossible. Requires ∛2, which is algebraic of degree 3, but C+S only produces 2ⁿ-degree numbers.') },
        { name: t('stem.angles.trisecting_an_angle', 'Trisecting an angle'), description: t('stem.angles.divide_an_arbitrary_angle_into_3_equal', 'Divide an arbitrary angle into 3 equal parts with compass + straightedge.'), answer: t('stem.angles.impossible_in_general_some_specific_an', 'Impossible in general. Some specific angles (e.g., 180°) can be. Origami CAN trisect arbitrary angles.') },
        { name: t('stem.angles.two_circle_problem', 'Two-circle problem'), description: t('stem.angles.given_two_circles_how_do_they_relate', 'Given two circles, how do they relate?'), answer: t('stem.angles.5_cases_separate_externally_tangent_in', '5 cases: separate, externally tangent, intersecting (2 points), internally tangent, one inside the other.') },
        { name: t('stem.angles.four_color_theorem', 'Four color theorem'), description: t('stem.angles.can_every_planar_map_be_colored_with_4', 'Can every planar map be colored with 4 colors so no adjacent regions share a color?'), answer: t('stem.angles.yes_proven_by_appel_haken_1976_first_m', 'Yes. Proven by Appel + Haken (1976) — first major theorem proved with computer assistance.') },
        { name: t('stem.angles.brachistochrone', 'Brachistochrone'), description: t('stem.angles.what_path_from_a_to_b_b_lower_minimize', 'What path from A to B (B lower) minimizes time of sliding object under gravity?'), answer: t('stem.angles.cycloid_posed_by_bernoulli_1696_solved', 'Cycloid. Posed by Bernoulli (1696). Solved by Newton overnight + by 4 others including Leibniz.') },
        { name: t('stem.angles.pizza_theorem', 'Pizza theorem'), description: t('stem.angles.cut_a_circular_pizza_into_8_sectors_wi', 'Cut a circular pizza into 8 sectors with cuts through one point (not necessarily center). Alternating pieces have equal area.'), answer: t('stem.angles.true_for_any_odd_multiple_of_4_sectors', 'True for any odd-multiple-of-4 sectors. Works for 8, 12, 16, ...') },
        { name: t('stem.angles.mrs_miniver_problem', 'Mrs. Miniver problem'), description: t('stem.angles.for_what_radii_of_intersecting_circles', 'For what radii of intersecting circles do the moon-shape ("lune") + lens have equal area?'), answer: t('stem.angles.ratio_depends_solved_analytically_roma', 'Ratio depends — solved analytically. Romantic geometry from a 1942 novel.') },
        { name: t('stem.angles.steinmetz_solid', 'Steinmetz solid'), description: t('stem.angles.intersection_of_two_perpendicular_cyli', 'Intersection of two perpendicular cylinders of same radius.'), answer: t('stem.angles.has_4_vertices_looks_like_a_4_faced_cu', 'Has 4 vertices, looks like a 4-faced cushion. Volume = (16/3)r³.') },
        { name: t('stem.angles.buffon_s_needle', 'Buffon\'s needle'), description: t('stem.angles.drop_a_needle_of_length_l_onto_paralle', 'Drop a needle of length L onto parallel lines spaced d apart. What\'s the probability it crosses a line?'), answer: t('stem.angles.2l_d_for_l_d_method_to_compute_by_drop', '2L/(πd) for L ≤ d. Method to compute π by dropping needles!') },
        { name: t('stem.angles.tarski_circle_squaring', 'Tarski circle-squaring'), description: t('stem.angles.can_you_cut_a_circle_into_pieces_rearr', 'Can you cut a circle into pieces + rearrange them into a square of equal area?'), answer: t('stem.angles.yes_laczkovich_1990_with_10_pieces_cho', 'Yes (Laczkovich 1990) — with ~10⁵⁰ pieces. Choice axiom required. Cannot use scissors-style cuts; pieces are bizarre.') },
        { name: t('stem.angles.banach_tarski_paradox', 'Banach-Tarski paradox'), description: t('stem.angles.can_you_cut_a_ball_into_pieces_rearran', 'Can you cut a ball into pieces + rearrange them into two balls of the same size?'), answer: t('stem.angles.yes_requires_axiom_of_choice_non_measu', 'Yes — requires axiom of choice + non-measurable pieces. Defies intuition but mathematically valid.') },
        { name: t('stem.angles.soap_film_minimal_surface', 'Soap film minimal surface'), description: t('stem.angles.why_do_soap_films_take_certain_shapes', 'Why do soap films take certain shapes?'), answer: t('stem.angles.they_minimize_surface_area_catenoid_be', 'They minimize surface area. Catenoid (between rings), Plateau border (junctions). Yields beautiful geometry.') }
      ];

      var FAMOUS_TILINGS = [
        { name: t('stem.angles.square_tiling', 'Square tiling'), detail: t('stem.angles.simplest_regular_tiling_schl_fli_symbo', 'Simplest regular tiling. Schläfli symbol {4,4}.') },
        { name: t('stem.angles.triangular_tiling', 'Triangular tiling'), detail: t('stem.angles.6_triangles_around_each_vertex_3_6', '6 triangles around each vertex. {3,6}.') },
        { name: t('stem.angles.hexagonal_tiling', 'Hexagonal tiling'), detail: t('stem.angles.3_hexagons_around_each_vertex_6_3_hone', '3 hexagons around each vertex. {6,3}. Honeycomb. Most efficient.') },
        { name: t('stem.angles.truncated_square_tiling', 'Truncated square tiling'), detail: t('stem.angles.octagons_squares_4_8_8_hispanic_coloni', 'Octagons + squares (4.8.8). Hispanic colonial tile patterns.') },
        { name: t('stem.angles.truncated_hexagonal_tiling', 'Truncated hexagonal tiling'), detail: t('stem.angles.dodecagons_triangles_3_12_12_some_pave', 'Dodecagons + triangles (3.12.12). Some pavements.') },
        { name: t('stem.angles.snub_square_tiling', 'Snub square tiling'), detail: t('stem.angles.squares_triangles_3_3_4_3_4_chiral_has', 'Squares + triangles (3.3.4.3.4). Chiral — has handedness.') },
        { name: t('stem.angles.rhombic_tiling', 'Rhombic tiling'), detail: t('stem.angles.just_rhombi_can_be_combined_to_make_pe', 'Just rhombi. Can be combined to make Penrose tilings.') },
        { name: t('stem.angles.penrose_tiling_p3', 'Penrose tiling (P3)'), detail: t('stem.angles.two_rhombi_fat_thin_aperiodic_never_re', 'Two rhombi (fat + thin). Aperiodic — never repeats. 5-fold symmetry.') },
        { name: t('stem.angles.penrose_tiling_p2', 'Penrose tiling (P2)'), detail: t('stem.angles.kite_dart_aperiodic_with_5_fold_symmet', 'Kite + dart. Aperiodic with 5-fold symmetry.') },
        { name: t('stem.angles.pinwheel_tiling', 'Pinwheel tiling'), detail: t('stem.angles.right_triangles_arranged_in_pinwheels_', 'Right triangles arranged in pinwheels. Aperiodic. Used in tiles at Federation Square (Melbourne).') },
        { name: t('stem.angles.hat_einstein_tile_2023', '"Hat" einstein tile (2023)'), detail: t('stem.angles.single_polygon_that_tiles_aperiodicall', 'Single polygon that tiles aperiodically. Major recent discovery by Smith, Myers, Kaplan, Goodman-Strauss.') },
        { name: t('stem.angles.spectre_einstein_tile_2023', '"Spectre" einstein tile (2023)'), detail: t('stem.angles.improvement_on_hat_uses_only_direct_no', 'Improvement on hat — uses only direct (not reflected) tiles.') },
        { name: t('stem.angles.cairo_pentagonal', 'Cairo pentagonal'), detail: t('stem.angles.5_sided_tiles_found_in_cairo_street_pa', '5-sided tiles. Found in Cairo street paving. Each tile has 4 angles of ~120° + one of 90°.') },
        { name: t('stem.angles.demiregular_tilings', 'Demiregular tilings'), detail: t('stem.angles.use_2_vertex_types_14_distinct_ones_so', 'Use 2 vertex types. 14 distinct ones (some debate). More complex than Archimedean.') },
        { name: t('stem.angles.voronoi_tessellation', 'Voronoi tessellation'), detail: t('stem.angles.divide_plane_into_cells_closest_to_eac', 'Divide plane into cells closest to each "seed" point. Appears in nature (giraffe spots, foam).') },
        { name: t('stem.angles.delaunay_triangulation', 'Delaunay triangulation'), detail: t('stem.angles.triangle_mesh_with_property_that_no_po', 'Triangle mesh with property that no point is inside any triangle\'s circumcircle. Dual of Voronoi.') },
        { name: t('stem.angles.15_pentagon_types', '15 pentagon types'), detail: t('stem.angles.15_distinct_convex_pentagon_shapes_can', '15 distinct convex pentagon shapes can tile the plane. Last one found 2015 (Mann, McLoud, Von Derau). Marjorie Rice found 4 as amateur in 1970s.') },
        { name: t('stem.angles.hyperbolic_7_3_tiling', 'Hyperbolic {7,3} tiling'), detail: t('stem.angles.heptagons_impossible_in_euclidean_tile', 'Heptagons (impossible in Euclidean) tile hyperbolic plane with 3 around each vertex. Drawn by Escher.') },
        { name: t('stem.angles.truchet_tiles', 'Truchet tiles'), detail: t('stem.angles.square_tiles_with_curves_or_diagonals_', 'Square tiles with curves or diagonals. Random orientation → maze-like patterns.') }
      ];

      var WORLD_CITIES = [
        { city: t('stem.angles.lib_reykjavik', 'Reykjavik'), lat: '64.13°N', lon: '21.94°W', notes: t('stem.angles.lib_northernmost_capital_solstice_extremes_4_hr', 'Northernmost capital. Solstice extremes: ~4 hr / 21 hr daylight.') },
        { city: t('stem.angles.lib_helsinki', 'Helsinki'), lat: '60.17°N', lon: '24.94°E', notes: t('stem.angles.lib_finnish_capital_6_hr_daylight_in_december', 'Finnish capital. ~6 hr daylight in December.') },
        { city: t('stem.angles.lib_stockholm', 'Stockholm'), lat: '59.33°N', lon: '18.07°E', notes: t('stem.angles.lib_swedish_capital', 'Swedish capital.') },
        { city: t('stem.angles.lib_moscow', 'Moscow'), lat: '55.75°N', lon: '37.62°E', notes: t('stem.angles.lib_russian_capital', 'Russian capital.') },
        { city: t('stem.angles.lib_london', 'London'), lat: '51.51°N', lon: '0.13°W', notes: t('stem.angles.lib_near_prime_meridian_0_greenwich_is_in_london', 'Near prime meridian (0°). Greenwich is in London.') },
        { city: t('stem.angles.lib_berlin', 'Berlin'), lat: '52.52°N', lon: '13.40°E', notes: t('stem.angles.lib_german_capital', 'German capital.') },
        { city: t('stem.angles.lib_paris', 'Paris'), lat: '48.86°N', lon: '2.35°E', notes: t('stem.angles.lib_french_capital', 'French capital.') },
        { city: t('stem.angles.lib_vienna', 'Vienna'), lat: '48.21°N', lon: '16.37°E', notes: t('stem.angles.lib_austrian_capital', 'Austrian capital.') },
        { city: t('stem.angles.lib_new_york', 'New York'), lat: '40.71°N', lon: '74.01°W', notes: t('stem.angles.lib_same_latitude_as_madrid_beijing', 'Same latitude as Madrid + Beijing.') },
        { city: t('stem.angles.lib_madrid', 'Madrid'), lat: '40.42°N', lon: '3.70°W', notes: t('stem.angles.lib_spanish_capital', 'Spanish capital.') },
        { city: t('stem.angles.lib_beijing', 'Beijing'), lat: '39.90°N', lon: '116.41°E', notes: t('stem.angles.lib_chinese_capital', 'Chinese capital.') },
        { city: t('stem.angles.lib_tokyo', 'Tokyo'), lat: '35.68°N', lon: '139.69°E', notes: t('stem.angles.lib_japanese_capital_largest_metro_area', 'Japanese capital. Largest metro area.') },
        { city: t('stem.angles.lib_cairo', 'Cairo'), lat: '30.05°N', lon: '31.24°E', notes: t('stem.angles.lib_egyptian_capital_on_the_nile', 'Egyptian capital. On the Nile.') },
        { city: t('stem.angles.lib_new_delhi', 'New Delhi'), lat: '28.61°N', lon: '77.21°E', notes: t('stem.angles.lib_indian_capital', 'Indian capital.') },
        { city: t('stem.angles.lib_mexico_city', 'Mexico City'), lat: '19.43°N', lon: '99.13°W', notes: t('stem.angles.lib_2_250_m_elevation', '~2,250 m elevation.') },
        { city: t('stem.angles.lib_bangkok', 'Bangkok'), lat: '13.76°N', lon: '100.50°E', notes: t('stem.angles.lib_thai_capital', 'Thai capital.') },
        { city: t('stem.angles.lib_lagos', 'Lagos'), lat: '6.52°N', lon: '3.38°E', notes: t('stem.angles.lib_largest_city_in_africa', 'Largest city in Africa.') },
        { city: t('stem.angles.lib_jakarta', 'Jakarta'), lat: '6.21°S', lon: '106.85°E', notes: t('stem.angles.lib_indonesian_capital_sinking_10_cm_year', 'Indonesian capital. Sinking ~10 cm/year.') },
        { city: t('stem.angles.lib_nairobi', 'Nairobi'), lat: '1.29°S', lon: '36.82°E', notes: t('stem.angles.lib_kenyan_capital_equatorial', 'Kenyan capital. Equatorial.') },
        { city: t('stem.angles.lib_singapore', 'Singapore'), lat: '1.35°N', lon: '103.82°E', notes: t('stem.angles.lib_equatorial_city_state_tropical_year_round', 'Equatorial city-state. Tropical year-round.') },
        { city: t('stem.angles.lib_quito', 'Quito'), lat: '0.19°S', lon: '78.45°W', notes: t('stem.angles.lib_capital_nearest_to_equator_2_850_m_elevation', 'Capital nearest to equator. 2,850 m elevation.') },
        { city: t('stem.angles.lib_sa_o_paulo', 'São Paulo'), lat: '23.55°S', lon: '46.63°W', notes: t('stem.angles.lib_largest_city_in_southern_hemisphere', 'Largest city in southern hemisphere.') },
        { city: t('stem.angles.lib_sydney', 'Sydney'), lat: '33.87°S', lon: '151.21°E', notes: t('stem.angles.lib_australian_east_coast', 'Australian east coast.') },
        { city: t('stem.angles.lib_buenos_aires', 'Buenos Aires'), lat: '34.61°S', lon: '58.38°W', notes: t('stem.angles.lib_argentine_capital', 'Argentine capital.') },
        { city: t('stem.angles.lib_auckland', 'Auckland'), lat: '36.85°S', lon: '174.76°E', notes: t('stem.angles.lib_largest_nz_city', 'Largest NZ city.') },
        { city: t('stem.angles.lib_wellington', 'Wellington'), lat: '41.29°S', lon: '174.78°E', notes: t('stem.angles.lib_nz_capital_southernmost_capital', 'NZ capital. Southernmost capital.') },
        { city: t('stem.angles.lib_mcmurdo_station', 'McMurdo Station'), lat: '77.85°S', lon: '166.67°E', notes: t('stem.angles.lib_largest_antarctic_research_station', 'Largest Antarctic research station.') },
        { city: t('stem.angles.lib_south_pole', 'South Pole'), lat: '90.00°S', lon: 'all', notes: t('stem.angles.lib_all_directions_are_north_from_here_2_835_m_e', 'All directions are north from here. ~2,835 m elevation (on ice).') },
        { city: t('stem.angles.lib_north_pole', 'North Pole'), lat: '90.00°N', lon: 'all', notes: t('stem.angles.lib_all_directions_are_south_on_floating_sea_ice', 'All directions are south. On floating sea ice — no fixed surface.') }
      ];

      function renderPuzzlesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.famous_geometry_puzzles', '🧩 Famous geometry puzzles')),
          h('div', { className: 'space-y-2' },
            GEOMETRY_PUZZLES.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-1' }, p.name),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1 italic' }, p.description),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, h('strong', null, '→ '), p.answer)
              );
            })
          )
        );
      }

      function renderTessell2Section() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.famous_tilings_of_the_plane', '◇ Famous tilings of the plane')),
          h('div', { className: 'space-y-1' },
            FAMOUS_TILINGS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, t.name),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.detail)
              );
            })
          )
        );
      }

      function renderCitiesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.world_city_coordinates', '🌆 World city coordinates')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.latitude_longitude_in_decimal_degrees_', 'Latitude + longitude in decimal degrees. Lat: 0° = equator, ±90° = poles. Lon: 0° = Greenwich, ±180° = international date line area.')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_city', 'City'), t('stem.angles.lib_latitude', 'Latitude'), t('stem.angles.lib_longitude', 'Longitude'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                WORLD_CITIES.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.city),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, c.lat),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, c.lon),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var MATH_CONSTANTS = [
        { symbol: 'π (pi)', value: '3.14159265358979...', notes: t('stem.angles.lib_ratio_of_circle_s_circumference_to_diameter', 'Ratio of circle\'s circumference to diameter. Irrational + transcendental.') },
        { symbol: 'e', value: '2.71828182845904...', notes: t('stem.angles.lib_base_of_natural_logarithm_limit_of_1_1_n_n_a', 'Base of natural logarithm. Limit of (1 + 1/n)ⁿ as n → ∞. Irrational + transcendental.') },
        { symbol: t('stem.angles.lib_phi_golden_ratio', 'φ (phi, golden ratio)'), value: '1.61803398874989...', notes: t('stem.angles.lib_1_5_2_satisfies_2_1', '(1+√5)/2. Satisfies φ² = φ + 1.') },
        { symbol: '√2', value: '1.41421356237309...', notes: t('stem.angles.lib_pythagoras_s_diagonal_of_unit_square_first_k', 'Pythagoras\'s diagonal of unit square. First known irrational number.') },
        { symbol: '√3', value: '1.73205080756887...', notes: t('stem.angles.lib_diagonal_of_unit_cube_face_appears_in_equila', 'Diagonal of unit cube face. Appears in equilateral triangle altitude.') },
        { symbol: '√5', value: '2.23606797749979...', notes: t('stem.angles.lib_diagonal_of_1_2_rectangle_component_of', 'Diagonal of 1×2 rectangle. Component of φ.') },
        { symbol: t('stem.angles.lib_euler_mascheroni', 'γ (Euler-Mascheroni)'), value: '0.57721566490153...', notes: t('stem.angles.lib_limit_of_1_1_2_1_n_ln_n_unknown_if_irrationa', 'Limit of (1 + 1/2 + ... + 1/n) − ln n. Unknown if irrational.') },
        { symbol: 'ln 2', value: '0.69314718055994...', notes: t('stem.angles.lib_natural_log_of_2_appears_in_radioactive_deca', 'Natural log of 2. Appears in radioactive decay (half-life formula).') },
        { symbol: 'log₁₀ 2', value: '0.30102999566398...', notes: t('stem.angles.lib_doubling_30_extra_useful_for_decibels', 'Doubling = ~30% extra. Useful for decibels.') },
        { symbol: t('stem.angles.lib_catalan_s_constant_g', 'Catalan\'s constant (G)'), value: '0.91596559417721...', notes: t('stem.angles.lib_sum_of_1_n_2n_1_2_unknown_if_irrational', 'Sum of (−1)ⁿ/(2n+1)². Unknown if irrational.') },
        { symbol: t('stem.angles.lib_ape_ry_s_constant_3', 'Apéry\'s constant ζ(3)'), value: '1.20205690315959...', notes: t('stem.angles.lib_sum_of_1_n3_proven_irrational_by_ape_ry_1978', 'Sum of 1/n³. Proven irrational by Apéry (1978).') },
        { symbol: t('stem.angles.lib_conway_s_constant', 'Conway\'s constant'), value: '1.30357726903429...', notes: t('stem.angles.lib_growth_rate_of_look_and_say_sequence_algebra', 'Growth rate of look-and-say sequence. Algebraic of degree 71.') },
        { symbol: t('stem.angles.lib_feigenbaum', 'Feigenbaum δ'), value: '4.66920160910299...', notes: t('stem.angles.lib_period_doubling_ratio_in_chaos_theory_appear', 'Period-doubling ratio in chaos theory. Appears in many systems.') },
        { symbol: t('stem.angles.lib_planck_length', 'Planck length'), value: '1.616×10⁻³⁵ m', notes: t('stem.angles.lib_smallest_meaningful_length_in_physics', 'Smallest meaningful length in physics.') },
        { symbol: t('stem.angles.lib_avogadro_number', 'Avogadro number'), value: '6.02214076×10²³', notes: t('stem.angles.lib_particles_per_mole_exact_defined_since_2019', 'Particles per mole. Exact (defined since 2019).') },
        { symbol: t('stem.angles.lib_speed_of_light_c', 'Speed of light (c)'), value: '299,792,458 m/s', notes: t('stem.angles.lib_exact_defines_the_meter', 'Exact. Defines the meter.') },
        { symbol: t('stem.angles.lib_gravitational_constant_g', 'Gravitational constant (G)'), value: '6.674×10⁻¹¹ N·m²/kg²', notes: t('stem.angles.lib_force_between_two_1_kg_masses_1_m_apart_6_7', 'Force between two 1 kg masses 1 m apart: ~6.7×10⁻¹¹ N.') },
        { symbol: '180/π', value: '57.29577951308232...', notes: t('stem.angles.lib_convert_radians_to_degrees_multiply_by_this', 'Convert radians to degrees: multiply by this.') },
        { symbol: 'π/180', value: '0.01745329251994...', notes: t('stem.angles.lib_convert_degrees_to_radians_multiply_by_this', 'Convert degrees to radians: multiply by this.') }
      ];

      var EARTH_DATA = [
        { measurement: t('stem.angles.lib_equatorial_radius', 'Equatorial radius'), value: '6,378.137 km', notes: t('stem.angles.lib_defined_by_wgs84_gps_reference', 'Defined by WGS84 (GPS reference).') },
        { measurement: t('stem.angles.lib_polar_radius', 'Polar radius'), value: '6,356.752 km', notes: t('stem.angles.lib_earth_is_slightly_oblate_flattened_at_poles', 'Earth is slightly oblate (flattened at poles).') },
        { measurement: t('stem.angles.lib_mean_radius', 'Mean radius'), value: '6,371.0 km', notes: t('stem.angles.lib_often_used_for_general_calculations', 'Often used for general calculations.') },
        { measurement: t('stem.angles.lib_circumference_equator', 'Circumference (equator)'), value: '40,075 km', notes: t('stem.angles.lib_original_definition_of_meter_10_000_km_from', 'Original definition of meter: 10,000 km from pole to equator (slightly off).') },
        { measurement: t('stem.angles.lib_surface_area', 'Surface area'), value: '510,072,000 km²', notes: t('stem.angles.lib_71_ocean_29_land', '~71% ocean, ~29% land.') },
        { measurement: t('stem.angles.lib_land_area', 'Land area'), value: '148,940,000 km²', notes: t('stem.angles.lib_29_2_of_surface', '~29.2% of surface.') },
        { measurement: t('stem.angles.lib_ocean_area', 'Ocean area'), value: '361,132,000 km²', notes: t('stem.angles.lib_70_8_of_surface', '~70.8% of surface.') },
        { measurement: t('stem.angles.lib_volume', 'Volume'), value: '1.0832×10¹² km³', notes: t('stem.angles.lib_1_trillion_km3', '~1 trillion km³.') },
        { measurement: t('stem.angles.lib_mass', 'Mass'), value: '5.972×10²⁴ kg', notes: t('stem.angles.lib_6_septillion_kg', '~6 septillion kg.') },
        { measurement: t('stem.angles.lib_density_mean', 'Density (mean)'), value: '5.514 g/cm³', notes: t('stem.angles.lib_densest_planet_in_solar_system', 'Densest planet in solar system.') },
        { measurement: t('stem.angles.lib_distance_to_sun_mean', 'Distance to Sun (mean)'), value: '149,598,023 km', notes: t('stem.angles.lib_1_au_astronomical_unit', '1 AU (Astronomical Unit).') },
        { measurement: t('stem.angles.lib_distance_to_sun_perihelion', 'Distance to Sun (perihelion)'), value: '147,098,074 km', notes: t('stem.angles.lib_closest_in_early_january', 'Closest, in early January.') },
        { measurement: t('stem.angles.lib_distance_to_sun_aphelion', 'Distance to Sun (aphelion)'), value: '152,097,701 km', notes: t('stem.angles.lib_farthest_in_early_july', 'Farthest, in early July.') },
        { measurement: t('stem.angles.lib_orbital_period', 'Orbital period'), value: t('stem.angles.lib_365_256_days', '365.256 days'), notes: t('stem.angles.lib_1_sidereal_year_civil_year_365_25_days_with', '~1 sidereal year. Civil year = 365.25 days (with leap years).') },
        { measurement: t('stem.angles.lib_axial_tilt_obliquity', 'Axial tilt (obliquity)'), value: '23.44°', notes: t('stem.angles.lib_causes_seasons_slowly_varies_22_24_5_on_41_0', 'Causes seasons. Slowly varies (22°-24.5° on ~41,000 yr cycle).') },
        { measurement: t('stem.angles.lib_rotation_period_sidereal', 'Rotation period (sidereal)'), value: '23 h 56 min 4.1 s', notes: t('stem.angles.lib_solar_day_24_h_because_earth_also_moves_arou', 'Solar day = 24 h because Earth also moves around Sun.') },
        { measurement: t('stem.angles.lib_highest_point_everest', 'Highest point (Everest)'), value: t('stem.angles.lib_8_848_86_m_above_sea_level', '8,848.86 m above sea level'), notes: t('stem.angles.lib_but_mount_chimborazo_is_the_farthest_from_ea', 'But Mount Chimborazo is the farthest from Earth\'s center (because of equatorial bulge).') },
        { measurement: t('stem.angles.lib_lowest_point_challenger_deep', 'Lowest point (Challenger Deep)'), value: t('stem.angles.lib_10_935_m_below_sea_level', '−10,935 m below sea level'), notes: t('stem.angles.lib_mariana_trench_pressure_1_086_atm', 'Mariana Trench. Pressure ~1,086 atm.') },
        { measurement: t('stem.angles.lib_highest_altitude_human_iss', 'Highest altitude human (ISS)'), value: t('stem.angles.lib_400_km_low_earth_orbit', '~400 km (low Earth orbit)'), notes: t('stem.angles.lib_inhabited_continuously_since_november_2000', 'Inhabited continuously since November 2000.') },
        { measurement: t('stem.angles.lib_atmosphere_mass', 'Atmosphere mass'), value: '5.15×10¹⁸ kg', notes: t('stem.angles.lib_1_millionth_of_earth_s_mass', '~1 millionth of Earth\'s mass.') },
        { measurement: t('stem.angles.lib_magnetic_field_surface', 'Magnetic field (surface)'), value: '~25-65 μT', notes: t('stem.angles.lib_strongest_near_poles_flips_periodically_last', 'Strongest near poles. Flips periodically (last ~780,000 yr ago).') }
      ];

      var FAMOUS_BUILDINGS = [
        { building: t('stem.angles.lib_great_pyramid_of_giza', 'Great Pyramid of Giza'), height: t('stem.angles.lib_146_6_m_original_138_8_m_today', '146.6 m original / 138.8 m today'), built: t('stem.angles.lib_2560_bce', '~2560 BCE'), angles: t('stem.angles.lib_slope_51_84_each_face', 'Slope 51.84° (each face)'), notes: t('stem.angles.lib_tallest_human_structure_for_3_800_years_base', 'Tallest human structure for 3,800+ years. Base ratio surprisingly close to 2π.') },
        { building: t('stem.angles.lib_eiffel_tower', 'Eiffel Tower'), height: '330 m', built: '1889', angles: t('stem.angles.lib_legs_54_from_horizontal', 'Legs 54° from horizontal'), notes: t('stem.angles.lib_was_tallest_in_world_until_1930_chrysler_bui', 'Was tallest in world until 1930 (Chrysler Building).') },
        { building: t('stem.angles.lib_sydney_opera_house', 'Sydney Opera House'), height: '65 m', built: '1973', angles: t('stem.angles.lib_sails_are_sections_of_a_sphere', 'Sails are sections of a sphere'), notes: t('stem.angles.lib_iconic_curves_are_spherical_segment_shells', 'Iconic curves are spherical-segment shells.') },
        { building: t('stem.angles.lib_burj_khalifa', 'Burj Khalifa'), height: '828 m', built: '2010', angles: t('stem.angles.lib_tapers_in_three_y_arms', 'Tapers in three Y-arms'), notes: t('stem.angles.lib_tallest_building_in_the_world_y_shape_minimi', 'Tallest building in the world. Y-shape minimizes wind load.') },
        { building: t('stem.angles.lib_taipei_101', 'Taipei 101'), height: '508 m', built: '2004', angles: t('stem.angles.lib_8_tier_pagoda_inspired', '8-tier pagoda inspired'), notes: t('stem.angles.lib_tuned_mass_damper_660_ton_sphere_at_top_coun', 'Tuned mass damper (660-ton sphere) at top counters wind sway.') },
        { building: t('stem.angles.lib_cn_tower', 'CN Tower'), height: '553 m', built: '1976', angles: t('stem.angles.lib_tapering_cylinder', 'Tapering cylinder'), notes: t('stem.angles.lib_tallest_free_standing_structure_1976_2007', 'Tallest free-standing structure 1976-2007.') },
        { building: t('stem.angles.lib_hagia_sophia', 'Hagia Sophia'), height: t('stem.angles.lib_55_m_to_top_of_dome', '55 m to top of dome'), built: '537 CE', angles: t('stem.angles.lib_pendentive_dome', 'Pendentive dome'), notes: t('stem.angles.lib_innovation_pendentives_transfer_dome_weight', 'Innovation: pendentives transfer dome weight to 4 piers, allowing large dome on square base.') },
        { building: t('stem.angles.lib_pantheon_rome', 'Pantheon (Rome)'), height: t('stem.angles.lib_43_3_m_dome', '43.3 m dome'), built: '126 CE', angles: t('stem.angles.lib_hemisphere_perfect_dome', 'Hemisphere = perfect dome'), notes: t('stem.angles.lib_largest_unreinforced_concrete_dome_in_the_wo', 'Largest unreinforced concrete dome in the world. Oculus 8.7 m wide at top.') },
        { building: t('stem.angles.lib_notre_dame_paris', 'Notre Dame (Paris)'), height: t('stem.angles.lib_69_m_towers_96_m_spire_pre_2019', '69 m (towers) / 96 m (spire pre-2019)'), built: '1163-1345', angles: t('stem.angles.lib_pointed_gothic_arches', 'Pointed Gothic arches'), notes: t('stem.angles.lib_flying_buttresses_transfer_roof_loads_outwar', 'Flying buttresses transfer roof loads outward. Spire collapsed in 2019 fire.') },
        { building: t('stem.angles.lib_leaning_tower_of_pisa', 'Leaning Tower of Pisa'), height: '57 m', built: '1372', angles: t('stem.angles.lib_currently_leans_3_97', 'Currently leans ~3.97°'), notes: t('stem.angles.lib_was_up_to_5_5_before_1990s_stabilization', 'Was up to 5.5° before 1990s stabilization.') },
        { building: t('stem.angles.lib_empire_state_building', 'Empire State Building'), height: '443 m', built: '1931', angles: t('stem.angles.lib_setback_design_zoning_law', 'Setback design (zoning law)'), notes: t('stem.angles.lib_setbacks_were_required_by_nyc_zoning_to_allo', 'Setbacks were required by NYC zoning to allow sunlight to reach streets.') },
        { building: t('stem.angles.lib_sears_willis_tower', 'Sears (Willis) Tower'), height: '527 m', built: '1973', angles: t('stem.angles.lib_9_bundled_tubes', '9 bundled tubes'), notes: t('stem.angles.lib_tube_structure_invented_by_fazlur_khan_revol', 'Tube structure invented by Fazlur Khan revolutionized tall building design.') },
        { building: t('stem.angles.lib_st_louis_gateway_arch', 'St. Louis Gateway Arch'), height: '192 m', built: '1965', angles: t('stem.angles.lib_catenary_curve', 'Catenary curve'), notes: t('stem.angles.lib_mathematical_curve_assumed_by_hanging_chain', 'Mathematical curve assumed by hanging chain. Inverted = stable arch.') },
        { building: t('stem.angles.lib_stonehenge', 'Stonehenge'), height: 'Up to 7.3 m', built: t('stem.angles.lib_3000_1500_bce', '~3000-1500 BCE'), angles: t('stem.angles.lib_solstice_alignments', 'Solstice alignments'), notes: t('stem.angles.lib_heel_stone_aligns_with_summer_solstice_sunri', 'Heel Stone aligns with summer solstice sunrise.') },
        { building: t('stem.angles.lib_great_wall_of_china', 'Great Wall of China'), length: t('stem.angles.lib_21_000_km_total', '~21,000 km total'), built: t('stem.angles.lib_7th_c_bce_17th_c_ce', '7th c. BCE - 17th c. CE'), angles: t('stem.angles.lib_follows_terrain', 'Follows terrain'), notes: t('stem.angles.lib_different_dynasties_built_different_sections', 'Different dynasties built different sections. Most surviving sections are Ming dynasty.') }
      ];

      var FAMOUS_CURVES = [
        { name: t('stem.angles.circle', 'Circle'), equation: 'x² + y² = r²', notes: t('stem.angles.lib_all_points_equidistant_from_center', 'All points equidistant from center.') },
        { name: t('stem.angles.ellipse', 'Ellipse'), equation: 'x²/a² + y²/b² = 1', notes: t('stem.angles.lib_sum_of_distances_to_two_foci_is_constant_pla', 'Sum of distances to two foci is constant. Planetary orbits.') },
        { name: t('stem.angles.parabola', 'Parabola'), equation: 'y = ax²', notes: t('stem.angles.lib_all_points_equidistant_from_focus_directrix', 'All points equidistant from focus + directrix.') },
        { name: t('stem.angles.hyperbola', 'Hyperbola'), equation: 'x²/a² − y²/b² = 1', notes: t('stem.angles.lib_difference_of_distances_to_two_foci_is_const', 'Difference of distances to two foci is constant.') },
        { name: t('stem.angles.logarithmic_spiral', 'Logarithmic spiral'), equation: 'r = a·e^(bθ)', notes: t('stem.angles.lib_constant_angle_between_radius_tangent_nautil', 'Constant angle between radius + tangent. Nautilus shells, galaxies.') },
        { name: t('stem.angles.archimedean_spiral', 'Archimedean spiral'), equation: 'r = a + bθ', notes: t('stem.angles.lib_equal_spacing_between_coils_vinyl_records_sp', 'Equal spacing between coils. Vinyl records, springs.') },
        { name: t('stem.angles.catenary', 'Catenary'), equation: 'y = a·cosh(x/a)', notes: t('stem.angles.lib_shape_of_hanging_chain_different_from_parabo', 'Shape of hanging chain. Different from parabola.') },
        { name: t('stem.angles.brachistochrone_cycloid', 'Brachistochrone (cycloid)'), equation: t('stem.angles.lib_parametric_x_r_t_sin_t_y_r_1_cos_t', 'parametric: x = r(t − sin t), y = r(1 − cos t)'), notes: t('stem.angles.lib_curve_of_fastest_descent_under_gravity_found', 'Curve of fastest descent under gravity. Found by Bernoulli (1696).') },
        { name: t('stem.angles.tractrix', 'Tractrix'), equation: t('stem.angles.lib_parametric', 'parametric'), notes: t('stem.angles.lib_dog_curve_path_of_object_dragged_behind_movi', '"Dog curve" — path of object dragged behind moving point.') },
        { name: t('stem.angles.lissajous_figures', 'Lissajous figures'), equation: t('stem.angles.lib_parametric_sin_cos', 'parametric sin/cos'), notes: t('stem.angles.lib_closed_curves_from_perpendicular_oscillation', 'Closed curves from perpendicular oscillations at different frequencies. Oscilloscope art.') },
        { name: t('stem.angles.helix', 'Helix'), equation: t('stem.angles.lib_3d_parametric', '3D parametric'), notes: t('stem.angles.lib_dna_backbone_springs_screw_threads', 'DNA backbone. Springs. Screw threads.') },
        { name: t('stem.angles.sine_wave', 'Sine wave'), equation: 'y = A sin(ωt + φ)', notes: t('stem.angles.lib_fundamental_oscillation_most_natural_soundin', 'Fundamental oscillation. Most natural-sounding tone.') },
        { name: t('stem.angles.cosine_wave', 'Cosine wave'), equation: 'y = A cos(ωt + φ)', notes: t('stem.angles.lib_same_as_sine_but_90_phase_shifted', 'Same as sine but 90° phase shifted.') },
        { name: t('stem.angles.bell_curve_gaussian', 'Bell curve (Gaussian)'), equation: 'y = e^(−x²)', notes: t('stem.angles.lib_normal_distribution_shape', 'Normal distribution shape.') },
        { name: t('stem.angles.heart_curve_cardioid', 'Heart curve (cardioid)'), equation: 'r = a(1 + cos θ)', notes: t('stem.angles.lib_heart_shape_apple_s_logo_valentine', 'Heart shape. Apple\'s logo + valentine.') },
        { name: t('stem.angles.trefoil_knot', 'Trefoil knot'), equation: t('stem.angles.lib_3d_parametric', '3D parametric'), notes: t('stem.angles.lib_simplest_nontrivial_mathematical_knot', 'Simplest nontrivial mathematical knot.') },
        { name: t('stem.angles.m_bius_strip_2', 'Möbius strip'), equation: t('stem.angles.lib_boundary_parametric', 'Boundary parametric'), notes: t('stem.angles.lib_one_sided_surface_cut_down_middle_longer_sin', 'One-sided surface. Cut down middle → longer single loop.') },
        { name: t('stem.angles.klein_bottle_2', 'Klein bottle'), equation: t('stem.angles.lib_4d_no_inside_outside', '4D — no inside/outside'), notes: t('stem.angles.lib_non_orientable_surface_can_be_made_in_3d_onl', 'Non-orientable surface. Can be made in 3D only with self-intersection.') }
      ];

      var GREAT_MATHEMATICIANS = [
        { name: t('stem.angles.pythagoras', 'Pythagoras'), year: t('stem.angles.lib_570_495_bce', '~570-495 BCE'), contrib: t('stem.angles.lib_pythagorean_theorem_founded_mystical_mathema', 'Pythagorean theorem. Founded mystical mathematical brotherhood. May not have personally proved the theorem named for him.') },
        { name: t('stem.angles.euclid', 'Euclid'), year: t('stem.angles.lib_325_265_bce', '~325-265 BCE'), contrib: t('stem.angles.lib_elements_13_books_axiomatizing_geometry_most', '"Elements" — 13 books axiomatizing geometry. Most influential math textbook ever.') },
        { name: t('stem.angles.archimedes', 'Archimedes'), year: t('stem.angles.lib_287_212_bce', '~287-212 BCE'), contrib: t('stem.angles.lib_pi_to_several_digits_lever_screw_war_machine', 'Pi to several digits. Lever, screw, war machines. "Eureka!" displacement principle.') },
        { name: t('stem.angles.hypatia', 'Hypatia'), year: '~370-415 CE', contrib: t('stem.angles.lib_alexandrian_mathematician_astronomer_philoso', 'Alexandrian mathematician + astronomer + philosopher. One of first known female mathematicians.') },
        { name: t('stem.angles.lib_al_khwarizmi', 'al-Khwarizmi'), year: '~780-850', contrib: t('stem.angles.lib_founded_algebra_al_jabr_algorithm_comes_from', 'Founded algebra ("al-jabr"). "Algorithm" comes from his Latinized name.') },
        { name: t('stem.angles.fibonacci_leonardo_of_pisa', 'Fibonacci (Leonardo of Pisa)'), year: '~1170-1250', contrib: t('stem.angles.lib_introduced_hindu_arabic_numerals_to_europe_f', 'Introduced Hindu-Arabic numerals to Europe. Fibonacci sequence (from a rabbit-population problem).') },
        { name: t('stem.angles.ren_descartes', 'René Descartes'), year: '1596-1650', contrib: t('stem.angles.lib_analytic_geometry_cartesian_coordinates_link', 'Analytic geometry (Cartesian coordinates linking algebra to geometry). "I think, therefore I am."') },
        { name: t('stem.angles.pierre_de_fermat', 'Pierre de Fermat'), year: '1601-1665', contrib: t('stem.angles.lib_number_theory_famous_last_theorem_unproved_f', 'Number theory. Famous Last Theorem (unproved for 358 years!). Probability with Pascal.') },
        { name: t('stem.angles.blaise_pascal', 'Blaise Pascal'), year: '1623-1662', contrib: t('stem.angles.lib_probability_theory_pascal_s_triangle_mechani', 'Probability theory. Pascal\'s triangle. Mechanical calculator. Pascal\'s wager.') },
        { name: t('stem.angles.isaac_newton', 'Isaac Newton'), year: '1643-1727', contrib: t('stem.angles.lib_calculus_independent_of_leibniz_laws_of_moti', 'Calculus (independent of Leibniz). Laws of motion + gravitation. Optics.') },
        { name: t('stem.angles.gottfried_leibniz', 'Gottfried Leibniz'), year: '1646-1716', contrib: t('stem.angles.lib_calculus_with_modern_notation_binary_number', 'Calculus (with modern notation). Binary number system. Concept of momentum.') },
        { name: t('stem.angles.leonhard_euler', 'Leonhard Euler'), year: '1707-1783', contrib: t('stem.angles.lib_most_prolific_mathematician_ever_notation_f', 'Most prolific mathematician ever. Notation (f(x), e, i, π, Σ, sin, cos). Euler\'s identity e^(iπ) + 1 = 0.') },
        { name: t('stem.angles.carl_friedrich_gauss', 'Carl Friedrich Gauss'), year: '1777-1855', contrib: t('stem.angles.lib_prince_of_mathematicians_number_theory_stati', 'Prince of mathematicians. Number theory, statistics, geometry, electromagnetism, geodesy.') },
        { name: t('stem.angles.variste_galois', 'Évariste Galois'), year: '1811-1832', contrib: t('stem.angles.lib_founded_group_theory_galois_theory_wrote_his', 'Founded group theory + Galois theory. Wrote his theories the night before dying in a duel at age 20.') },
        { name: t('stem.angles.bernhard_riemann', 'Bernhard Riemann'), year: '1826-1866', contrib: t('stem.angles.lib_riemann_sums_integration_riemann_hypothesis', 'Riemann sums (integration). Riemann hypothesis ($1M Millennium Prize). Curved geometry (basis of relativity).') },
        { name: t('stem.angles.sofia_kovalevskaya', 'Sofia Kovalevskaya'), year: '1850-1891', contrib: t('stem.angles.lib_first_woman_to_earn_a_doctorate_in_mathemati', 'First woman to earn a doctorate in mathematics. Partial differential equations. Rotation of bodies.') },
        { name: t('stem.angles.georg_cantor', 'Georg Cantor'), year: '1845-1918', contrib: t('stem.angles.lib_set_theory_different_sizes_of_infinity_diago', 'Set theory. Different sizes of infinity. Diagonal argument.') },
        { name: t('stem.angles.henri_poincar', 'Henri Poincaré'), year: '1854-1912', contrib: t('stem.angles.lib_topology_founder_chaos_theory_three_body_pro', 'Topology founder. Chaos theory (three-body problem). Poincaré conjecture (solved 2003 by Perelman).') },
        { name: t('stem.angles.david_hilbert', 'David Hilbert'), year: '1862-1943', contrib: t('stem.angles.lib_hilbert_s_23_problems_shaped_20th_c_math_fou', 'Hilbert\'s 23 problems shaped 20th c math. Foundations of mathematics. Quantum mechanics.') },
        { name: t('stem.angles.emmy_noether', 'Emmy Noether'), year: '1882-1935', contrib: t('stem.angles.lib_abstract_algebra_noether_s_theorem_every_sym', 'Abstract algebra. Noether\'s theorem (every symmetry → conservation law) — foundational in physics.') },
        { name: t('stem.angles.srinivasa_ramanujan', 'Srinivasa Ramanujan'), year: '1887-1920', contrib: t('stem.angles.lib_self_taught_indian_genius_discovered_thousan', 'Self-taught Indian genius. Discovered thousands of identities, many proved decades later. Died at 32.') },
        { name: t('stem.angles.alan_turing', 'Alan Turing'), year: '1912-1954', contrib: t('stem.angles.lib_theoretical_computer_science_turing_machine', 'Theoretical computer science. Turing machine, Turing test. Broke Enigma in WWII.') },
        { name: t('stem.angles.john_von_neumann', 'John von Neumann'), year: '1903-1957', contrib: t('stem.angles.lib_game_theory_computer_architecture_von_neuman', 'Game theory, computer architecture (von Neumann architecture). Manhattan Project. Quantum mechanics formalism.') },
        { name: t('stem.angles.paul_erd_s', 'Paul Erdős'), year: '1913-1996', contrib: t('stem.angles.lib_most_prolific_20th_c_mathematician_1500_pape', 'Most prolific 20th c mathematician (~1500 papers). Itinerant life. Erdős number = collaboration distance to him.') },
        { name: t('stem.angles.andrew_wiles', 'Andrew Wiles'), year: '1953-', contrib: t('stem.angles.lib_proved_fermat_s_last_theorem_1994_358_years', 'Proved Fermat\'s Last Theorem (1994), 358 years after Fermat\'s famous margin.') },
        { name: t('stem.angles.maryam_mirzakhani', 'Maryam Mirzakhani'), year: '1977-2017', contrib: t('stem.angles.lib_first_woman_to_win_fields_medal_2014_riemann', 'First woman to win Fields Medal (2014). Riemann surfaces + their moduli. Died at 40 of cancer.') }
      ];

      var PRACTICAL_ANGLES = [
        { context: t('stem.angles.lib_ramp_accessibility_ada', 'Ramp accessibility (ADA)'), angle: t('stem.angles.lib_4_76_1_12_slope', '≤ 4.76° (1:12 slope)'), notes: t('stem.angles.lib_us_ada_standard_1_inch_rise_per_12_inches_ru', 'US ADA standard. 1 inch rise per 12 inches run.') },
        { context: t('stem.angles.lib_wheelchair_ramp_residential', 'Wheelchair ramp residential'), angle: '≤ 2.86° (1:20)', notes: t('stem.angles.lib_recommended_where_space_allows_easier_than_1', 'Recommended where space allows. Easier than 1:12.') },
        { context: t('stem.angles.lib_stair_rise_run_us', 'Stair rise/run (US)'), angle: '~30-37°', notes: t('stem.angles.lib_typical_7_rise_11_run_32_5_irc_code_max_73_4', 'Typical: 7" rise, 11" run → ~32.5°. IRC code: max 7¾" rise.') },
        { context: t('stem.angles.lib_roof_pitch_residential', 'Roof pitch (residential)'), angle: '14° (3:12) to 45° (12:12)', notes: t('stem.angles.lib_steeper_sheds_water_snow_faster_more_usable', 'Steeper = sheds water/snow faster, more usable attic. Lower = easier installation.') },
        { context: t('stem.angles.lib_solar_panel_tilt_mid_latitude', 'Solar panel tilt (mid-latitude)'), angle: t('stem.angles.lib_latitude_15_seasonal', '≈ latitude (±15° seasonal)'), notes: t('stem.angles.lib_maximize_annual_energy_adjustable_mounts_swa', 'Maximize annual energy. Adjustable mounts swap winter (steeper) vs summer (shallower).') },
        { context: t('stem.angles.lib_highway_curve_banking', 'Highway curve banking'), angle: '~3-10°', notes: t('stem.angles.lib_tilt_provides_centripetal_force_assistance_a', 'Tilt provides centripetal force assistance at design speed.') },
        { context: t('stem.angles.lib_highway_max_grade', 'Highway max grade'), angle: '~3-6° (5-10%)', notes: t('stem.angles.lib_interstate_standard_mountain_roads_up_to_7', 'Interstate standard. Mountain roads up to ~7%.') },
        { context: t('stem.angles.lib_railroad_max_grade', 'Railroad max grade'), angle: '~1-2%', notes: t('stem.angles.lib_steel_on_steel_limits_traction_cog_rack_rail', 'Steel-on-steel limits traction. Cog/rack railways for steeper.') },
        { context: t('stem.angles.lib_driveway_max', 'Driveway max'), angle: '~12% (~7°)', notes: t('stem.angles.lib_steeper_risks_scraping_car_undersides_bad_in', 'Steeper risks scraping car undersides + bad in snow.') },
        { context: t('stem.angles.lib_earth_s_axial_tilt', 'Earth\'s axial tilt'), angle: '23.5°', notes: t('stem.angles.lib_causes_seasons', 'Causes seasons.') },
        { context: t('stem.angles.lib_sun_at_zenith_equator_equinox', 'Sun at zenith (equator equinox)'), angle: t('stem.angles.lib_90_altitude', '90° altitude'), notes: t('stem.angles.lib_directly_overhead', 'Directly overhead.') },
        { context: t('stem.angles.lib_highway_sight_line', 'Highway sight line'), angle: t('stem.angles.lib_depends_on_speed', 'depends on speed'), notes: t('stem.angles.lib_aashto_formulas_decision_sight_distance_grow', 'AASHTO formulas. Decision sight distance grows with speed.') },
        { context: t('stem.angles.lib_drone_gimbal_compensation', 'Drone gimbal compensation'), angle: t('stem.angles.lib_continuous', 'continuous'), notes: t('stem.angles.lib_imu_stabilized_camera_gimbal_keeps_shot_leve', 'IMU-stabilized camera gimbal keeps shot level.') },
        { context: t('stem.angles.lib_eye_hfov_binocular', 'Eye HFOV (binocular)'), angle: '~120°', notes: t('stem.angles.lib_total_horizontal_visual_field_with_both_eyes', 'Total horizontal visual field with both eyes.') },
        { context: t('stem.angles.lib_eye_hfov_each', 'Eye HFOV (each)'), angle: '~150-200°', notes: t('stem.angles.lib_includes_far_peripheral_stereopsis_only_120', 'Includes far peripheral. Stereopsis only ~120° overlap.') },
        { context: t('stem.angles.lib_camera_fov_50mm_lens_35mm_full_frame', 'Camera FOV (50mm lens, 35mm full-frame)'), angle: t('stem.angles.lib_46_diagonal', '~46° diagonal'), notes: t('stem.angles.lib_normal_lens_close_to_human_comfortable_view', '"Normal" lens — close to human comfortable view.') },
        { context: t('stem.angles.lib_wide_angle_24mm', 'Wide-angle (24mm)'), angle: t('stem.angles.lib_84_diagonal', '~84° diagonal'), notes: t('stem.angles.lib_landscape_architecture', 'Landscape, architecture.') },
        { context: t('stem.angles.lib_fisheye_8mm', 'Fisheye (8mm)'), angle: t('stem.angles.lib_180_diagonal', '~180° diagonal'), notes: t('stem.angles.lib_distorted_hemispheric_view', 'Distorted, hemispheric view.') },
        { context: t('stem.angles.lib_telephoto_200mm', 'Telephoto (200mm)'), angle: t('stem.angles.lib_12_diagonal', '~12° diagonal'), notes: t('stem.angles.lib_wildlife_sports', 'Wildlife, sports.') },
        { context: t('stem.angles.lib_tv_viewing_optimum', 'TV viewing optimum'), angle: t('stem.angles.lib_30_horizontal_fov', '~30° horizontal FOV'), notes: t('stem.angles.lib_thx_recommends_higher_40_for_more_cinematic', 'THX recommends. Higher (~40°) for more cinematic.') }
      ];

      function renderConstantsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.mathematical_physical_constants', 'π Mathematical + physical constants')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_symbol', 'Symbol'), t('stem.angles.lib_value', 'Value'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MATH_CONSTANTS.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-black text-rose-700' }, c.symbol),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, c.value),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderRiversSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.earth_measurements_2', '🌎 Earth measurements')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_measurement', 'Measurement'), t('stem.angles.lib_value', 'Value'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                EARTH_DATA.map(function(e, i) {
                  return h('tr', { key: 'e'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, e.measurement),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, e.value),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, e.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderBuildingsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.famous_structures_their_angles', '🏛 Famous structures + their angles')),
          h('div', { className: 'space-y-2' },
            FAMOUS_BUILDINGS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, b.building),
                  h('span', { className: 'text-[0.625rem] text-rose-700 font-mono ml-auto px-2 py-0.5 rounded bg-rose-100' }, b.height)
                ),
                h('div', { className: 'flex items-baseline gap-3 text-[0.625rem] mb-1 flex-wrap' },
                  h('span', { className: 'font-mono text-slate-600' }, t('stem.angles.lib_built', 'Built: ') + b.built),
                  h('span', { className: 'font-mono text-rose-700 font-bold' }, b.angles)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, b.notes)
              );
            })
          )
        );
      }

      function renderCurvesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.famous_mathematical_curves', '∿ Famous mathematical curves')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_curve', 'Curve'), t('stem.angles.lib_equation', 'Equation'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                FAMOUS_CURVES.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.name),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, c.equation),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMathematiciansSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.great_mathematicians', '👨‍🏫 Great mathematicians')),
          h('div', { className: 'space-y-2' },
            GREAT_MATHEMATICIANS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-rose-900' }, m.name),
                  h('span', { className: 'text-[0.625rem] font-mono text-slate-500 ml-auto' }, m.year)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, m.contrib)
              );
            })
          )
        );
      }

      function renderPracticalSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.practical_angle_standards', '🛠 Practical angle standards')),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_context', 'Context'), t('stem.angles.lib_angle', 'Angle'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PRACTICAL_ANGLES.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.context),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[0.625rem]' }, p.angle),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var CONIC_SECTIONS = [
        { name: t('stem.angles.circle_2', 'Circle'), eccentricity: 'e = 0', equation: 'x² + y² = r²', cut: t('stem.angles.lib_plane_perpendicular_to_cone_axis', 'Plane perpendicular to cone axis'), use: t('stem.angles.lib_wheels_gears_orbits_almost_most_planetary_or', 'Wheels, gears, orbits (almost — most planetary orbits are slightly elliptical).') },
        { name: t('stem.angles.ellipse_2', 'Ellipse'), eccentricity: '0 < e < 1', equation: 'x²/a² + y²/b² = 1', cut: t('stem.angles.lib_oblique_plane_through_cone_both_nappes_uncut', 'Oblique plane through cone (both nappes uncut)'), use: t('stem.angles.lib_planetary_orbits_kepler_s_1st_law_whispering', 'Planetary orbits (Kepler\'s 1st law). Whispering galleries (St. Paul\'s Cathedral).') },
        { name: t('stem.angles.parabola_2', 'Parabola'), eccentricity: 'e = 1', equation: 'y² = 4ax', cut: t('stem.angles.lib_plane_parallel_to_cone_s_slant_side', 'Plane parallel to cone\'s slant side'), use: t('stem.angles.lib_satellite_dishes_parallel_rays_focus_to_one', 'Satellite dishes (parallel rays focus to one point). Projectile motion (in vacuum). Suspension bridge cables.') },
        { name: t('stem.angles.hyperbola_2', 'Hyperbola'), eccentricity: 'e > 1', equation: 'x²/a² − y²/b² = 1', cut: t('stem.angles.lib_plane_parallel_to_axis_cuts_both_nappes', 'Plane parallel to axis (cuts both nappes)'), use: t('stem.angles.lib_sundials_hyperbolic_mirrors_comet_orbits_som', 'Sundials. Hyperbolic mirrors. Comet orbits (some). Long-baseline navigation (LORAN).') },
        { name: t('stem.angles.degenerate_point', 'Degenerate (point)'), eccentricity: '—', equation: 'x² + y² = 0', cut: t('stem.angles.lib_plane_through_apex_perpendicular_to_axis', 'Plane through apex perpendicular to axis'), use: '—' },
        { name: t('stem.angles.degenerate_line', 'Degenerate (line)'), eccentricity: '—', equation: 'y² = 0 (and y = 0)', cut: t('stem.angles.lib_plane_through_apex_along_slant', 'Plane through apex along slant'), use: '—' },
        { name: t('stem.angles.degenerate_two_lines', 'Degenerate (two lines)'), eccentricity: '—', equation: 'x² − y² = 0', cut: t('stem.angles.lib_plane_through_apex_through_both_nappes', 'Plane through apex through both nappes'), use: '—' }
      ];

      var PLATONIC_SOLIDS = [
        { name: t('stem.angles.tetrahedron', 'Tetrahedron'), faces: t('stem.angles.lib_4_triangles', '4 triangles'), vertices: 4, edges: 6, dual: t('stem.angles.lib_self_dual', 'self-dual'), notes: t('stem.angles.lib_simplest_3d_shape_vertex_angle_70_5', 'Simplest 3D shape. Vertex angle ~70.5°.') },
        { name: t('stem.angles.cube_hexahedron', 'Cube (hexahedron)'), faces: t('stem.angles.lib_6_squares', '6 squares'), vertices: 8, edges: 12, dual: t('stem.angles.lib_octahedron', 'octahedron'), notes: t('stem.angles.lib_most_familiar_all_angles_90', 'Most familiar. All angles 90°.') },
        { name: t('stem.angles.octahedron', 'Octahedron'), faces: t('stem.angles.lib_8_triangles', '8 triangles'), vertices: 6, edges: 12, dual: t('stem.angles.lib_cube', 'cube'), notes: t('stem.angles.lib_diamond_crystals_two_pyramids_base_to_base', 'Diamond crystals. Two pyramids base-to-base.') },
        { name: t('stem.angles.dodecahedron', 'Dodecahedron'), faces: t('stem.angles.lib_12_pentagons', '12 pentagons'), vertices: 20, edges: 30, dual: t('stem.angles.lib_icosahedron', 'icosahedron'), notes: t('stem.angles.lib_plato_associated_with_the_heavens_5th_elemen', 'Plato associated with "the heavens" (5th element).') },
        { name: t('stem.angles.icosahedron', 'Icosahedron'), faces: t('stem.angles.lib_20_triangles', '20 triangles'), vertices: 12, edges: 30, dual: t('stem.angles.lib_dodecahedron', 'dodecahedron'), notes: t('stem.angles.lib_most_spherelike_platonic_solid_d20_die_in_ta', 'Most spherelike Platonic solid. D20 die in tabletop games.') }
      ];

      var PLATONIC_NOTES = [
        { note: t('stem.angles.why_only_5', 'Why only 5?'), detail: t('stem.angles.at_each_vertex_you_need_3_polygons_who', 'At each vertex, you need 3+ polygons whose angle sum is < 360° (else flat or impossible). Only 5 combinations work for regular polygons.') },
        { note: t('stem.angles.euler_s_formula', 'Euler\'s formula'), detail: t('stem.angles.v_e_f_2_holds_for_every_convex_polyhed', 'V − E + F = 2 holds for every convex polyhedron (including all 5 Platonic solids).') },
        { note: t('stem.angles.duality', 'Duality'), detail: t('stem.angles.connecting_face_centers_of_a_platonic_', 'Connecting face centers of a Platonic solid gives its "dual". Cube ↔ octahedron; dodecahedron ↔ icosahedron; tetrahedron ↔ itself.') },
        { note: t('stem.angles.archimedean_solids', 'Archimedean solids'), detail: t('stem.angles.13_semi_regular_solids_same_arrangemen', '13 semi-regular solids — same arrangement at each vertex, but multiple polygon types. Includes truncated icosahedron (soccer ball pattern).') },
        { note: t('stem.angles.kepler_poinsot_polyhedra', 'Kepler-Poinsot polyhedra'), detail: t('stem.angles.4_regular_star_polyhedra_with_pentagra', '4 regular star polyhedra with pentagram faces or vertices. Non-convex.') }
      ];

      var FRACTAL_NOTES = [
        { name: t('stem.angles.koch_snowflake', 'Koch snowflake'), detail: t('stem.angles.start_with_triangle_on_each_side_repla', 'Start with triangle. On each side, replace middle third with two sides of a smaller triangle. Repeat. Infinite perimeter, finite area.') },
        { name: t('stem.angles.sierpinski_triangle', 'Sierpinski triangle'), detail: t('stem.angles.start_with_triangle_remove_middle_smal', 'Start with triangle. Remove middle (smaller) triangle. Repeat on each remaining triangle. Hausdorff dimension log(3)/log(2) ≈ 1.585.') },
        { name: t('stem.angles.cantor_set', 'Cantor set'), detail: t('stem.angles.remove_middle_third_of_segment_repeat_', 'Remove middle third of segment. Repeat on each remaining segment. Uncountably infinite but total length zero.') },
        { name: t('stem.angles.mandelbrot_set', 'Mandelbrot set'), detail: t('stem.angles.points_c_where_iterating_z_z_c_stays_b', 'Points c where iterating z = z² + c stays bounded. Infinite detail at any zoom. Discovered 1980.') },
        { name: t('stem.angles.julia_set', 'Julia set'), detail: t('stem.angles.for_each_c_points_z_where_iterating_z_', 'For each c, points z where iterating z = z² + c stays bounded. Each c gives a different Julia set; together they tile the Mandelbrot set.') },
        { name: t('stem.angles.dragon_curve', 'Dragon curve'), detail: t('stem.angles.fold_a_strip_of_paper_in_half_repeated', 'Fold a strip of paper in half repeatedly; unfold each fold at 90°. Or recursive replacement of segments.') },
        { name: t('stem.angles.barnsley_fern', 'Barnsley fern'), detail: t('stem.angles.iterated_function_system_random_select', 'Iterated function system. Random selection of 4 affine maps produces a fern shape.') },
        { name: t('stem.angles.hausdorff_dimension', 'Hausdorff dimension'), detail: t('stem.angles.fractional_dimension_coastline_1_2_1_3', 'Fractional dimension. Coastline ~1.2-1.3 depending on country. Captures "roughness" beyond integer dimensions.') },
        { name: t('stem.angles.lib_self_similarity', 'Self-similarity'), detail: t('stem.angles.defining_property_strict_self_similari', 'Defining property. Strict self-similarity (Koch) or statistical (coastlines).') },
        { name: t('stem.angles.real_world_fractals', 'Real-world fractals'), detail: t('stem.angles.coastlines_trees_lungs_bronchi_blood_v', 'Coastlines, trees, lungs (bronchi), blood vessels, river networks, mountain ranges, clouds, lightning.') }
      ];

      var NONEUCLID_FACTS = [
        { topic: t('stem.angles.lib_euclidean_geometry', 'Euclidean geometry'), detail: t('stem.angles.flat_plane_parallel_postulate_holds_an', 'Flat plane. Parallel postulate holds. Angles in triangle sum to exactly 180°.') },
        { topic: t('stem.angles.lib_spherical_geometry', 'Spherical geometry'), detail: t('stem.angles.surface_of_sphere_triangle_angles_sum_', 'Surface of sphere. Triangle angles sum to MORE than 180°. Excess proportional to area. Used in navigation.') },
        { topic: t('stem.angles.lib_hyperbolic_geometry', 'Hyperbolic geometry'), detail: t('stem.angles.saddle_shaped_surface_triangle_angles_', 'Saddle-shaped surface. Triangle angles sum to LESS than 180°. Many parallels through a point not on a line.') },
        { topic: t('stem.angles.lib_geodesics', 'Geodesics'), detail: t('stem.angles.shortest_paths_on_a_surface_straight_l', 'Shortest paths on a surface. Straight lines (Euclidean); great circles (sphere); hyperbolic lines.') },
        { topic: t('stem.angles.lib_great_circles', 'Great circles'), detail: t('stem.angles.largest_circles_on_a_sphere_equator_me', 'Largest circles on a sphere. Equator + meridians. Plane flights follow great-circle paths.') },
        { topic: t('stem.angles.lib_curvature', 'Curvature'), detail: t('stem.angles.euclidean_0_spherical_positive_hyperbo', 'Euclidean = 0. Spherical = positive. Hyperbolic = negative. Curvature determines geometry.') },
        { topic: t('stem.angles.lib_sum_of_angles_excess', 'Sum of angles excess'), detail: t('stem.angles.on_sphere_of_radius_r_triangle_area_r_', 'On sphere of radius R, triangle area = R² × (angle sum − π).') },
        { topic: t('stem.angles.lib_real_world_spherical_gps', 'Real-world spherical: GPS'), detail: t('stem.angles.positions_on_earth_s_surface_use_spher', 'Positions on Earth\'s surface use spherical (or more precisely, ellipsoidal) geometry.') },
        { topic: t('stem.angles.lib_real_world_spherical_airplane_routes', 'Real-world spherical: airplane routes'), detail: t('stem.angles.nyc_to_tokyo_is_shortest_via_the_arcti', 'NYC to Tokyo is shortest via the Arctic, not straight east — that\'s the great circle.') },
        { topic: t('stem.angles.lib_general_relativity', 'General relativity'), detail: t('stem.angles.spacetime_is_curved_by_mass_energy_geo', 'Spacetime is curved by mass-energy. Geodesics through curved spacetime ARE the paths of free-falling objects.') }
      ];

      var MAP_PROJECTIONS = [
        { name: t('stem.angles.mercator', 'Mercator'), preserves: t('stem.angles.lib_angles_conformal', 'Angles (conformal)'), distorts: t('stem.angles.lib_areas_massively_near_poles', 'Areas (massively near poles)'), use: t('stem.angles.lib_marine_navigation_straight_lines_on_map_cons', 'Marine navigation — straight lines on map = constant compass bearing.') },
        { name: t('stem.angles.lib_gall_peters', 'Gall-Peters'), preserves: t('stem.angles.lib_areas', 'Areas'), distorts: t('stem.angles.lib_shapes_elongated', 'Shapes (elongated)'), use: t('stem.angles.lib_equal_area_focus_used_to_challenge_mercator', 'Equal-area focus. Used to challenge Mercator\'s "Europe is bigger" distortion.') },
        { name: t('stem.angles.robinson', 'Robinson'), preserves: t('stem.angles.lib_neither_perfectly', 'Neither perfectly'), distorts: t('stem.angles.lib_some_of_both', 'Some of both'), use: t('stem.angles.lib_compromise_national_geographic_used_1988_199', 'Compromise. National Geographic used 1988-1998.') },
        { name: t('stem.angles.winkel_tripel', 'Winkel tripel'), preserves: t('stem.angles.lib_neither_perfectly', 'Neither perfectly'), distorts: t('stem.angles.lib_minimizes_total', 'Minimizes total'), use: t('stem.angles.lib_national_geographic_since_1998', 'National Geographic since 1998.') },
        { name: t('stem.angles.mollweide', 'Mollweide'), preserves: t('stem.angles.lib_areas', 'Areas'), distorts: t('stem.angles.lib_shapes_near_edges', 'Shapes near edges'), use: t('stem.angles.lib_equal_area_used_for_global_thematic_maps', 'Equal-area. Used for global thematic maps.') },
        { name: t('stem.angles.sinusoidal', 'Sinusoidal'), preserves: t('stem.angles.lib_areas_distances_along_equator_meridians', 'Areas, distances along equator + meridians'), distorts: t('stem.angles.lib_shapes', 'Shapes'), use: t('stem.angles.lib_old_projection_variant_interrupted_to_reduce', 'Old projection. Variant: interrupted to reduce distortion.') },
        { name: t('stem.angles.albers_conic', 'Albers conic'), preserves: t('stem.angles.lib_areas', 'Areas'), distorts: t('stem.angles.lib_shapes', 'Shapes'), use: t('stem.angles.lib_conic_projection_common_for_continental_us_m', 'Conic projection. Common for continental US maps.') },
        { name: t('stem.angles.lambert_conformal_conic', 'Lambert conformal conic'), preserves: t('stem.angles.lib_angles_shapes_locally', 'Angles + shapes (locally)'), distorts: t('stem.angles.lib_areas', 'Areas'), use: t('stem.angles.lib_aeronautical_charts_faa_sectionals', 'Aeronautical charts. FAA sectionals.') },
        { name: t('stem.angles.azimuthal_equidistant', 'Azimuthal equidistant'), preserves: t('stem.angles.lib_distances_from_center_point', 'Distances from center point'), distorts: t('stem.angles.lib_areas_shapes_far_from_center', 'Areas + shapes far from center'), use: t('stem.angles.lib_un_logo_useful_for_showing_distances_bearing', 'UN logo. Useful for showing distances + bearings from one location.') },
        { name: t('stem.angles.goode_s_homolosine', 'Goode\'s homolosine'), preserves: t('stem.angles.lib_areas', 'Areas'), distorts: t('stem.angles.lib_splits_continents', 'Splits continents'), use: t('stem.angles.lib_interrupted_to_keep_continent_shapes_accurat', 'Interrupted to keep continent shapes accurate.') }
      ];

      var SUNDIAL_NOTES = [
        { topic: t('stem.angles.lib_how_they_work', 'How they work'), detail: t('stem.angles.a_vertical_or_angled_gnomon_casts_a_sh', 'A vertical or angled "gnomon" casts a shadow. As Earth rotates, shadow moves across markings.') },
        { topic: t('stem.angles.lib_gnomon_angle', 'Gnomon angle'), detail: t('stem.angles.for_accuracy_gnomon_must_be_parallel_t', 'For accuracy, gnomon must be parallel to Earth\'s axis — angle to horizontal = local latitude.') },
        { topic: t('stem.angles.lib_equatorial_sundial', 'Equatorial sundial'), detail: t('stem.angles.dial_plate_perpendicular_to_gnomon_par', 'Dial plate perpendicular to gnomon (parallel to equator). Hour lines evenly spaced 15° apart.') },
        { topic: t('stem.angles.lib_horizontal_sundial', 'Horizontal sundial'), detail: t('stem.angles.dial_plate_parallel_to_ground_hour_lin', 'Dial plate parallel to ground. Hour lines NOT evenly spaced — formula: tan(hour line angle) = sin(latitude) × tan(hour angle).') },
        { topic: t('stem.angles.lib_vertical_sundial', 'Vertical sundial'), detail: t('stem.angles.dial_on_a_wall_hour_lines_depend_on_wa', 'Dial on a wall. Hour lines depend on wall\'s azimuth + latitude.') },
        { topic: t('stem.angles.lib_equation_of_time', 'Equation of time'), detail: t('stem.angles.sundial_time_differs_from_clock_time_b', 'Sundial time differs from clock time by up to ~16 minutes through the year. Due to Earth\'s elliptical orbit + axial tilt.') },
        { topic: t('stem.angles.lib_analemma', 'Analemma'), detail: t('stem.angles.figure_8_trace_of_sun_s_position_at_sa', 'Figure-8 trace of sun\'s position at same clock time each day for a year. Shown on some advanced sundials.') },
        { topic: t('stem.angles.lib_time_zones_complication', 'Time zones complication'), detail: t('stem.angles.sundial_shows_local_apparent_solar_tim', 'Sundial shows LOCAL apparent solar time. Differs from civil time by longitude offset within timezone + DST.') },
        { topic: t('stem.angles.lib_heliochronometer', 'Heliochronometer'), detail: t('stem.angles.very_precise_sundials_with_corrections', 'Very precise sundials with corrections for equation of time + longitude. Accurate to seconds.') }
      ];

      var GOLDEN_RATIO = [
        { fact: t('stem.angles.value', 'Value'), detail: t('stem.angles.phi_1_61803398874989_irrational_roots_', 'φ (phi) ≈ 1.61803398874989... Irrational. Roots of x² = x + 1.') },
        { fact: t('stem.angles.algebraic_definition', 'Algebraic definition'), detail: t('stem.angles.a_line_divided_so_that_whole_larger_la', 'A line divided so that whole : larger = larger : smaller. (a+b)/a = a/b = φ.') },
        { fact: t('stem.angles.fibonacci_connection', 'Fibonacci connection'), detail: t('stem.angles.ratio_of_consecutive_fibonacci_numbers', 'Ratio of consecutive Fibonacci numbers approaches φ: 1, 1, 2, 3, 5, 8, 13, 21 → 21/13 ≈ 1.615.') },
        { fact: t('stem.angles.golden_rectangle', 'Golden rectangle'), detail: t('stem.angles.long_side_short_side_remove_a_square_r', 'Long side / short side = φ. Remove a square → remaining rectangle is also golden.') },
        { fact: t('stem.angles.golden_spiral', 'Golden spiral'), detail: t('stem.angles.logarithmic_spiral_with_growth_factor_', 'Logarithmic spiral with growth factor φ per quarter turn. Approximated by Fibonacci squares + arcs.') },
        { fact: t('stem.angles.pentagram', 'Pentagram'), detail: t('stem.angles.ratios_of_pentagram_diagonals_to_sides', 'Ratios of pentagram diagonals to sides = φ. Pythagoras knew this.') },
        { fact: t('stem.angles.in_nature', 'In nature'), detail: t('stem.angles.spiral_arrangements_in_sunflowers_pine', 'Spiral arrangements in sunflowers, pinecones, nautilus shells. Reflects optimal packing for growing meristems.') },
        { fact: t('stem.angles.in_art_overstated', 'In art (overstated)'), detail: t('stem.angles.often_claimed_in_parthenon_mona_lisa_e', 'Often claimed in Parthenon, Mona Lisa, etc. — most claims unsupported. Real golden ratio art: 20th-century deliberate use (Le Corbusier, Dali).') },
        { fact: t('stem.angles.aesthetic_claim', '"Aesthetic" claim'), detail: t('stem.angles.long_believed_humans_find_golden_ratio', 'Long believed humans find golden ratio most beautiful. Robust evidence weaker than popular accounts suggest.') },
        { fact: t('stem.angles.continued_fraction', 'Continued fraction'), detail: t('stem.angles.1_1_1_1_1_1_most_irrational_number_slo', 'φ = 1 + 1/(1 + 1/(1 + 1/(...))). Most irrational number — slowest converging continued fraction.') }
      ];

      var ORIGAMI_FACTS = [
        { fact: t('stem.angles.mathematical_origami', 'Mathematical origami'), detail: t('stem.angles.active_research_area_can_solve_cubic_e', 'Active research area. Can solve cubic equations (impossible with compass + straightedge alone). Connect to algebra.') },
        { fact: t('stem.angles.maekawa_s_theorem', 'Maekawa\'s theorem'), detail: t('stem.angles.at_any_flat_foldable_vertex_mountain_f', 'At any flat-foldable vertex, |# mountain folds − # valley folds| = 2.') },
        { fact: t('stem.angles.kawasaki_s_theorem', 'Kawasaki\'s theorem'), detail: t('stem.angles.at_a_flat_foldable_vertex_alternating_', 'At a flat-foldable vertex, alternating angles around the vertex sum to 180°.') },
        { fact: t('stem.angles.7_fold_limit_paper', '7-fold limit (paper)'), detail: t('stem.angles.standard_paper_can_be_folded_in_half_7', 'Standard paper can be folded in half ~7 times. Each fold doubles thickness. After 7, paper is too stiff. Record (with special equipment + huge paper): 12 folds.') },
        { fact: t('stem.angles.crease_pattern_3d', 'Crease pattern → 3D'), detail: t('stem.angles.flat_sheet_can_fold_into_virtually_any', 'Flat sheet can fold into virtually any 3D shape with enough creases. Modern origami extremely complex.') },
        { fact: t('stem.angles.real_world_space_telescopes', 'Real-world: space telescopes'), detail: t('stem.angles.james_webb_space_telescope_sunshield_f', 'James Webb Space Telescope sunshield folded for launch (origami principles), unfolded in space.') },
        { fact: t('stem.angles.real_world_airbags', 'Real-world: airbags'), detail: t('stem.angles.folded_efficiently_to_fit_in_compartme', 'Folded efficiently to fit in compartment, unfold rapidly.') },
        { fact: t('stem.angles.real_world_stents', 'Real-world: stents'), detail: t('stem.angles.origami_inspired_medical_stents_fold_t', 'Origami-inspired medical stents fold tiny for insertion, expand in artery.') },
        { fact: t('stem.angles.miura_fold', 'Miura fold'), detail: t('stem.angles.parallelogram_based_fold_lets_large_su', 'Parallelogram-based fold lets large surface (solar panel) deploy from compact bundle via single pull.') },
        { fact: t('stem.angles.kirigami', 'Kirigami'), detail: t('stem.angles.cuts_allowed_in_addition_to_folds_used', 'Cuts allowed in addition to folds. Used for pop-up books + scientific structures.') }
      ];

      var SPORTS_ANGLES = [
        { sport: t('stem.angles.lib_basketball_shot_arc', 'Basketball shot arc'), angle: t('stem.angles.lib_optimal_launch_45_52_above_horizontal', 'Optimal launch: ~45-52° above horizontal'), notes: t('stem.angles.lib_higher_arc_more_forgiving_on_rim_but_harder', 'Higher arc = more forgiving on rim — but harder to control distance.') },
        { sport: t('stem.angles.lib_soccer_free_kick', 'Soccer free kick'), angle: t('stem.angles.lib_optimal_launch_20_30', 'Optimal launch: ~20-30°'), notes: t('stem.angles.lib_trade_off_between_hang_time_speed_past_defen', 'Trade-off between hang time + speed past defenders.') },
        { sport: t('stem.angles.lib_long_jump', 'Long jump'), angle: t('stem.angles.lib_optimal_launch_21_23_not_45', 'Optimal launch: ~21-23° (NOT 45°)'), notes: t('stem.angles.lib_launch_height_higher_than_landing_height_bio', 'Launch height higher than landing height; biomechanical limits reduce optimum.') },
        { sport: t('stem.angles.lib_shot_put', 'Shot put'), angle: '~38°', notes: t('stem.angles.lib_less_than_45_because_release_height_landing', 'Less than 45° because release height > landing height.') },
        { sport: t('stem.angles.lib_javelin', 'Javelin'), angle: '~30-36°', notes: t('stem.angles.lib_aerodynamic_lift_makes_optimum_less_than_bal', 'Aerodynamic lift makes optimum less than ballistic 45°.') },
        { sport: t('stem.angles.lib_discus', 'Discus'), angle: '~33-38°', notes: t('stem.angles.lib_like_javelin_aerodynamic_lift_matters', 'Like javelin, aerodynamic lift matters.') },
        { sport: t('stem.angles.lib_golf', 'Golf'), angle: t('stem.angles.lib_driver_loft_9_12_wedge_52_60', 'Driver loft ~9-12°, wedge ~52-60°'), notes: t('stem.angles.lib_higher_loft_higher_trajectory_more_spin_less', 'Higher loft = higher trajectory + more spin = less distance.') },
        { sport: t('stem.angles.lib_pool_billiards', 'Pool / billiards'), angle: t('stem.angles.lib_cushion_angles_angle_in_angle_out_with_engli', 'Cushion angles: angle in = angle out (with English/spin modifying)'), notes: t('stem.angles.lib_pure_geometry_plus_spin_english_for_control', 'Pure geometry, plus spin (English) for control.') },
        { sport: t('stem.angles.lib_tennis_serve', 'Tennis serve'), angle: t('stem.angles.lib_toss_angle_racket_angle_ball_spin', 'Toss angle, racket angle, ball spin'), notes: t('stem.angles.lib_topspin_curves_ball_down_allows_hard_hit_lan', 'Topspin curves ball down (allows hard hit landing in court).') },
        { sport: t('stem.angles.lib_skiing_tilt', 'Skiing tilt'), angle: t('stem.angles.lib_edge_angle_controls_carve_radius', 'Edge angle controls carve radius'), notes: t('stem.angles.lib_higher_edge_angle_tighter_turn_ski_sidecut_t', 'Higher edge angle = tighter turn. Ski sidecut + tilt define carve.') },
        { sport: t('stem.angles.lib_pole_vault', 'Pole vault'), angle: t('stem.angles.lib_pole_plant_85_90_take_off_angle', 'Pole plant ~85-90°, take-off angle'), notes: t('stem.angles.lib_plant_pole_nearly_vertical_to_convert_horizo', 'Plant pole nearly vertical to convert horizontal speed to height.') },
        { sport: t('stem.angles.lib_ski_jumping', 'Ski jumping'), angle: t('stem.angles.lib_in_run_take_off_10_11_down_hill_36_37', 'In-run, take-off ~10-11° down, hill ~36-37°'), notes: t('stem.angles.lib_jumpers_angle_bodies_into_v_shape_for_aerody', 'Jumpers angle bodies into V-shape for aerodynamic lift.') }
      ];

      var ART_ANGLES = [
        { topic: t('stem.angles.lib_linear_perspective', 'Linear perspective'), detail: t('stem.angles.parallel_lines_converge_to_vanishing_p', 'Parallel lines converge to vanishing points. 1-point (looking down a road), 2-point (corner of building), 3-point (looking up at a tower).') },
        { topic: t('stem.angles.lib_vanishing_point', 'Vanishing point'), detail: t('stem.angles.where_parallel_lines_appear_to_meet_on', 'Where parallel lines appear to meet on horizon. Determined by viewer\'s position + line direction.') },
        { topic: t('stem.angles.lib_eye_level_horizon', 'Eye level / horizon'), detail: t('stem.angles.horizontal_line_at_viewer_s_eye_height', 'Horizontal line at viewer\'s eye height. All vanishing points lie on it (for lines parallel to ground).') },
        { topic: t('stem.angles.lib_foreshortening', 'Foreshortening'), detail: t('stem.angles.objects_pointing_at_viewer_appear_comp', 'Objects pointing at viewer appear compressed. Drawing a hand pointed at viewer = challenge.') },
        { topic: t('stem.angles.lib_rule_of_thirds', 'Rule of thirds'), detail: t('stem.angles.divide_canvas_photo_into_9_equal_secti', 'Divide canvas/photo into 9 equal sections. Place subjects on intersections for dynamic composition.') },
        { topic: t('stem.angles.lib_dutch_angle_camera_tilt', 'Dutch angle (camera tilt)'), detail: t('stem.angles.camera_tilted_off_horizontal_creates_u', 'Camera tilted off-horizontal creates unease, instability, dynamism.') },
        { topic: t('stem.angles.lib_angle_of_light', 'Angle of light'), detail: t('stem.angles.sun_angle_determines_shadow_length_dir', 'Sun angle determines shadow length + direction. Low angle (golden hour) = long shadows + warm color.') },
        { topic: t('stem.angles.lib_renaissance_perspective', 'Renaissance perspective'), detail: t('stem.angles.brunelleschi_1413_demonstrated_mathema', 'Brunelleschi (~1413) demonstrated mathematical linear perspective. Alberti formalized it (1435).') },
        { topic: t('stem.angles.lib_atmospheric_perspective', 'Atmospheric perspective'), detail: t('stem.angles.distant_objects_appear_bluer_less_dist', 'Distant objects appear bluer + less distinct due to atmospheric scattering.') },
        { topic: t('stem.angles.lib_sacred_geometry_in_art', 'Sacred geometry in art'), detail: t('stem.angles.some_traditions_use_specific_angles_ra', 'Some traditions use specific angles + ratios (Islamic geometric patterns, Indian mandalas, gothic cathedrals).') },
        { topic: t('stem.angles.lib_m_c_escher', 'M.C. Escher'), detail: t('stem.angles.mathematical_artist_impossible_objects', 'Mathematical artist. Impossible objects (Penrose triangles), tessellations, hyperbolic geometry.') },
        { topic: t('stem.angles.lib_origami_art', 'Origami art'), detail: t('stem.angles.folding_angles_crease_patterns_produce', 'Folding angles + crease patterns produce 3D sculptures from flat paper.') }
      ];

      var MEASURING_TOOLS = [
        { tool: t('stem.angles.lib_protractor', 'Protractor'), use: t('stem.angles.lib_measure_or_draw_angles_0_180_semicircle_or_0', 'Measure or draw angles 0-180° (semicircle) or 0-360° (full).'), notes: t('stem.angles.lib_standard_school_tool', 'Standard school tool.') },
        { tool: t('stem.angles.lib_theodolite', 'Theodolite'), use: t('stem.angles.lib_surveying_horizontal_vertical_angles_with_hi', 'Surveying. Horizontal + vertical angles with high precision.'), notes: t('stem.angles.lib_telescope_on_calibrated_rotating_mounts', 'Telescope on calibrated rotating mounts.') },
        { tool: t('stem.angles.lib_total_station', 'Total station'), use: t('stem.angles.lib_modern_survey_instrument_theodolite_electron', 'Modern survey instrument. Theodolite + electronic distance measurement.'), notes: t('stem.angles.lib_computes_3d_coordinates_directly', 'Computes 3D coordinates directly.') },
        { tool: t('stem.angles.lib_sextant', 'Sextant'), use: t('stem.angles.lib_marine_navigation_measure_angle_between_hori', 'Marine navigation. Measure angle between horizon + celestial body.'), notes: t('stem.angles.lib_determines_latitude_brought_maritime_navigat', 'Determines latitude. Brought maritime navigation to high accuracy.') },
        { tool: t('stem.angles.lib_inclinometer', 'Inclinometer'), use: t('stem.angles.lib_measure_tilt_or_slope_from_horizontal', 'Measure tilt or slope from horizontal.'), notes: t('stem.angles.lib_smartphone_has_one_accelerometer_based_level', 'Smartphone has one (accelerometer-based level app).') },
        { tool: t('stem.angles.lib_compass_drawing', 'Compass (drawing)'), use: t('stem.angles.lib_draw_circles_arcs', 'Draw circles + arcs.'), notes: t('stem.angles.lib_two_legged_holds_pencil_at_fixed_distance_fr', 'Two-legged. Holds pencil at fixed distance from pivot.') },
        { tool: t('stem.angles.lib_set_square_triangle', 'Set square (triangle)'), use: t('stem.angles.lib_draw_specific_angles_45_45_90_or_30_60_90', 'Draw specific angles: 45°-45°-90° or 30°-60°-90°.'), notes: t('stem.angles.lib_combine_with_t_square_for_parallel_lines', 'Combine with T-square for parallel lines.') },
        { tool: t('stem.angles.lib_speed_square_carpentry', 'Speed square (carpentry)'), use: t('stem.angles.lib_mark_right_angles_45_angles_roof_pitches', 'Mark right angles, 45° angles, roof pitches.'), notes: t('stem.angles.lib_triangular_metal_plastic_lots_of_built_in_ma', 'Triangular metal/plastic. Lots of built-in markings.') },
        { tool: t('stem.angles.lib_bevel_gauge', 'Bevel gauge'), use: t('stem.angles.lib_transfer_angles_between_locations', 'Transfer angles between locations.'), notes: t('stem.angles.lib_adjustable_locks_at_any_angle', 'Adjustable, locks at any angle.') },
        { tool: t('stem.angles.lib_goniometer', 'Goniometer'), use: t('stem.angles.lib_measure_joint_angles_in_physical_therapy', 'Measure joint angles in physical therapy.'), notes: t('stem.angles.lib_specialized_for_human_body_movement', 'Specialized for human body movement.') },
        { tool: t('stem.angles.lib_sundial_gnomon', 'Sundial (gnomon)'), use: t('stem.angles.lib_tells_time_from_shadow_angle', 'Tells time from shadow angle.'), notes: t('stem.angles.lib_ancient_still_works_without_batteries', 'Ancient. Still works without batteries.') },
        { tool: t('stem.angles.lib_plumb_bob', 'Plumb bob'), use: t('stem.angles.lib_establishes_vertical_90_from_level_ground', 'Establishes vertical (90° from level ground).'), notes: t('stem.angles.lib_string_weight_gravity_does_the_work', 'String + weight. Gravity does the work.') },
        { tool: t('stem.angles.lib_spirit_level', 'Spirit level'), use: t('stem.angles.lib_establishes_horizontal_90_from_gravity', 'Establishes horizontal (90° from gravity).'), notes: t('stem.angles.lib_bubble_in_liquid_filled_tube_modern_versions', 'Bubble in liquid-filled tube. Modern versions have laser variants.') },
        { tool: t('stem.angles.lib_smartphone_sensors', 'Smartphone (sensors)'), use: t('stem.angles.lib_apps_use_accelerometer_gyroscope_for_tilt_he', 'Apps use accelerometer + gyroscope for tilt + heading.'), notes: t('stem.angles.lib_many_free_angle_measuring_apps', 'Many free angle-measuring apps.') }
      ];

      function renderConicsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.conic_sections_2', '◉ Conic sections')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.curves_formed_when_a_plane_intersects_', 'Curves formed when a plane intersects a (double) cone. The angle of the plane to the cone\'s axis determines the curve type.')),
          h('div', { className: 'space-y-2' },
            CONIC_SECTIONS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[0.625rem] font-mono text-rose-700 ml-auto px-2 py-0.5 rounded bg-rose-100' }, c.eccentricity)
                ),
                h('div', { className: 'text-[0.6875rem] font-mono text-rose-700 font-bold mb-1' }, c.equation),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, h('strong', null, t('stem.angles.lib_cut', 'Cut: ')), c.cut),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.use)
              );
            })
          )
        );
      }

      function renderPlatonicSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.platonic_solids_2', '⬡ Platonic solids')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.the_only_5_convex_regular_polyhedra_al', 'The only 5 convex regular polyhedra. All faces are congruent regular polygons, same number meeting at each vertex.')),
          h('div', { className: 'overflow-x-auto mb-3' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  [t('stem.angles.lib_name', 'Name'), t('stem.angles.lib_faces', 'Faces'), 'V', 'E', t('stem.angles.lib_dual', 'Dual'), t('stem.angles.lib_notes', 'Notes')].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PLATONIC_SOLIDS.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.name),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, p.faces),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, p.vertices),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, p.edges),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, p.dual),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, p.notes)
                  );
                })
              )
            )
          ),
          h('div', { className: 'space-y-1' },
            PLATONIC_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.6875rem] font-black text-rose-900 mb-0.5' }, n.note),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderFractalsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.fractals_2', '❄ Fractals')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.shapes_that_exhibit_self_similarity_at', 'Shapes that exhibit self-similarity at every scale. Coined by Benoit Mandelbrot (1975) from Latin fractus, "broken".')),
          h('div', { className: 'space-y-2' },
            FRACTAL_NOTES.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, f.name),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderNoneuclidSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.non_euclidean_geometry', '⊕ Non-Euclidean geometry')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.geometries_on_curved_surfaces_euclid_s', 'Geometries on curved surfaces. Euclid\'s parallel postulate doesn\'t hold. Discovered 1820s (Lobachevsky, Bolyai, Gauss).')),
          h('div', { className: 'space-y-1' },
            NONEUCLID_FACTS.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderProjectionSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.map_projections_2', '🗺 Map projections')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.projecting_curved_earth_onto_a_flat_ma', 'Projecting curved Earth onto a flat map ALWAYS distorts something — angles, areas, distances, or shapes. Each projection optimizes for different uses.')),
          h('div', { className: 'space-y-2' },
            MAP_PROJECTIONS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, m.name),
                h('div', { className: 'text-[0.6875rem] text-rose-700 font-bold mb-1' }, t('stem.angles.lib_preserves', 'Preserves: ') + m.preserves),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, h('strong', null, t('stem.angles.lib_distorts', 'Distorts: ')), m.distorts),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, h('strong', null, t('stem.angles.lib_use', 'Use: ')), m.use)
              );
            })
          )
        );
      }

      function renderSundialSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.sundials_2', '☼ Sundials')),
          h('div', { className: 'space-y-1' },
            SUNDIAL_NOTES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, s.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.detail)
              );
            })
          )
        );
      }

      function renderGoldenRatioSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.golden_ratio_2', 'φ Golden ratio')),
          h('div', { className: 'p-2.5 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-amber-900 mb-3' },
            h('strong', null, t('stem.angles.reality_check', '⚠ Reality check: ')), t('stem.angles.many_popular_claims_about_the_golden_r', 'Many popular claims about the golden ratio in art, architecture, and "beauty" are unsupported or invented retroactively. The mathematical properties are real + beautiful; the cultural claims often aren\'t.')
          ),
          h('div', { className: 'space-y-1' },
            GOLDEN_RATIO.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, g.fact),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, g.detail)
              );
            })
          )
        );
      }

      function renderOrigamiSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.origami_geometry_2', '✦ Origami geometry')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.origami_connects_geometry_to_engineeri', 'Origami connects geometry to engineering, biology, and design. Mathematical theorems govern what folds are possible.')),
          h('div', { className: 'space-y-1' },
            ORIGAMI_FACTS.map(function(o, i) {
              return h('div', { key: 'o'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, o.fact),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, o.detail)
              );
            })
          )
        );
      }

      function renderSportsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angles_in_sports_2', '🏆 Angles in sports')),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, t('stem.angles.many_athletic_skills_depend_on_launch_', 'Many athletic skills depend on launch angles. The classic "45° is optimal" is true only for projectiles launched + landing at the same height (without air resistance).')),
          h('div', { className: 'space-y-2' },
            SPORTS_ANGLES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, s.sport),
                  h('span', { className: 'text-[0.6875rem] font-mono text-rose-700 font-bold ml-auto px-2 py-0.5 rounded bg-rose-100' }, s.angle)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderArtSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angles_in_art_perspective', '🎨 Angles in art + perspective')),
          h('div', { className: 'space-y-1' },
            ART_ANGLES.map(function(a, i) {
              return h('div', { key: 'a'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-rose-900 mb-0.5' }, a.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, a.detail)
              );
            })
          )
        );
      }

      function renderToolsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, t('stem.angles.angle_measuring_tools', '📏 Angle-measuring tools')),
          h('div', { className: 'space-y-2' },
            MEASURING_TOOLS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, t.tool),
                h('div', { className: 'text-[0.6875rem] text-rose-700 font-bold mb-1' }, __alloT('stem.angles.lib_use', 'Use: ') + t.use),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }


      // The library sits behind the activities: it renders on the Reference tab only.
      var __anglesExpansions = activeTab === 'reference' ? h('div', { className: 'mt-4 max-w-4xl mx-auto', 'data-angles-library': 'true' },
        expHeader(),
        expTabBar(),
        expSection && h('div', { className: 'mt-2' }, renderActiveSection())
      ) : null;

      return buildMainView(__anglesExpansions);
    }
  });
})();
