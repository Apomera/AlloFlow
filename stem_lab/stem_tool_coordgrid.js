// ═══════════════════════════════════════════
// stem_tool_coordgrid.js — Coordinate Grid Plugin (Enhanced v3)
// 3 tabs: Explore, Quadrant Tour, Real-World Maps
// + sound effects (mutable), 10 badges, AI tutor, plot/slope/distance challenges,
//   quadrant color overlay, reflection viewer, walk-the-coordinate animator,
//   multi-representation panel (ordered pair / words / vector / movement arrows),
//   real-world coordinate systems (chess, battleship, lat/long w/ city presets),
//   atmospheric backgrounds, marker slide, focus ring, keyboard shortcuts
// Deep pass 2026-11-03: grade bands (5: quadrant I, 6: four quadrants + grid-line
//   distance + polygons, 8: Pythagoras + slope), seven generated tasks with named
//   misconceptions, two tries before a reveal, hint ladders, fading worked examples,
//   predict-then-check reflections/translations, a keyboard grid cursor, "describe my
//   points", the shared alloGraphAccess core for curves, teacher hooks, dark palette.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

// STEM_GRADING_CORE_BEGIN v1 (copied verbatim into each tool that grades; tests/stem_grading_core.test.js keeps the copies identical)
(function () {
  var MINUS = String.fromCharCode(0x2212);
  // A typed answer as a number: "-3", "2.5", "1,000", "3/4", "1 1/2" and the typographic minus.
  // Anything else (units, words, "1/0") is NaN, so a caller can tell "not a number" from "wrong".
  function toNumber(value) {
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;
    var s = value.split(MINUS).join('-').replace(/\s+/g, ' ').trim();
    if (!s) return NaN;
    if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    var m = s.match(/^([+-]?)(\d+) (\d+)\/(\d+)$/);
    if (m) {
      var den = +m[4];
      if (!den) return NaN;
      var mixed = +m[2] + (+m[3]) / den;
      return m[1] === '-' ? -mixed : mixed;
    }
    m = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)) ?\/ ?([+-]?(?:\d+\.?\d*|\.\d+))$/);
    if (m) {
      var d = parseFloat(m[2]);
      return d ? parseFloat(m[1]) / d : NaN;
    }
    return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(s) ? parseFloat(s) : NaN;
  }
  // Equal within an absolute tolerance, a relative one, or float noise, whichever is largest.
  function sameNumber(a, b, opts) {
    var x = toNumber(a), y = toNumber(b);
    if (!isFinite(x) || !isFinite(y)) return false;
    var o = opts || {};
    var tol = Math.max(+o.tolerance || 0, (+o.relative || 0) * Math.abs(y), 1e-9 * Math.max(1, Math.abs(y)));
    return Math.abs(x - y) <= tol;
  }
  // Credit an item once: returns whether `key` is new and the next seen-map to store.
  // The map is never mutated, so it can live in tool state.
  function creditOnce(seen, key) {
    var map = seen && typeof seen === 'object' && !Array.isArray(seen) ? seen : {};
    var k = String(key);
    if (Object.prototype.hasOwnProperty.call(map, k)) return { isNew: false, seen: map };
    var next = {};
    for (var p in map) if (Object.prototype.hasOwnProperty.call(map, p)) next[p] = map[p];
    next[k] = true;
    return { isNew: true, seen: next };
  }
  var api = { version: 1, toNumber: toNumber, sameNumber: sameNumber, creditOnce: creditOnce };
  var current = window.StemLab.grading;
  if (!current || !(current.version >= api.version)) window.StemLab.grading = api;
})();
// STEM_GRADING_CORE_END

(function() {
  'use strict';
  // Shared accessible-graph core, pasted byte-for-byte from stem_tool_graphcalc.js
  // (describe, hear and step through the function plotter). Do not edit here.
  // == alloGraphAccess core v2 (keep byte-identical in graphcalc + funcgrapher) ==
  // Describe, hear and step through a sampled curve. Both graphing tools carry this
  // block; the first copy loaded installs window.StemLab._graphAccess. Samples are
  // [{x, y}] with y null where the curve is undefined; text goes through the caller's
  // t(key, fallback). Nothing here writes toolData; the AudioContext stays in this closure.
  // v2: one root engine, rate of change, exact family features, hints and worked examples.
  // A newer copy replaces an older one, so a stale cached v1 never hides v2.
  (function () {
    if (!window.StemLab || (window.StemLab._graphAccess && window.StemLab._graphAccess.version >= 2)) return;
    var FMIN = 220, FMAX = 880, PANMAX = 0.8, CLICKHZ = 1600, SECONDS = 4;
    function fin(v) { return typeof v === 'number' && isFinite(v); }
    function tOf(t) {
      return function (key, fb) { var v = null; try { v = typeof t === 'function' ? t(key, fb) : null; } catch (e) { v = null; } return (v == null || v === key) ? fb : v; };
    }
    function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
    function fill(s, map) { return __alloOneWord(String(s).replace(/\{(\w+)\}/g, function (m, k) { return map && map[k] != null ? String(map[k]) : m; })); }
    // Two decimals, a true minus sign (read as "minus"), no "-0".
    function num(v) {
      if (!fin(v)) return '?';
      var r = Math.round(v * 100) / 100;
      if (r === 0) r = 0;
      var s = String(r);
      return s.charAt(0) === '-' ? '−' + s.slice(1) : s;
    }
    function listOf(items, __alloT) {
      if (items.length < 2) return items.join('');
      return items.slice(0, -1).join(', ') + ' ' + __alloT('stem.graph_access.and', 'and') + ' ' + items[items.length - 1];
    }
    function evalAt(ev, x) { var v; try { v = ev(x); } catch (e) { v = NaN; } return fin(v) ? v : null; }
    function sample(evaluate, xmin, xmax, n) {
      var out = [];
      if (typeof evaluate !== 'function' || !fin(xmin) || !fin(xmax) || !(xmax > xmin)) return out;
      n = fin(n) && n >= 2 ? Math.floor(n) : 201;
      for (var i = 0; i < n; i++) {
        var x = i === n - 1 ? xmax : xmin + (xmax - xmin) * i / (n - 1);
        if (Math.abs(x) < (xmax - xmin) * 1e-12) x = 0;
        out.push({ x: x, y: evalAt(evaluate, x) });
      }
      return out;
    }
    // A jump between two finite samples: a pole or a step, not a steep stretch.
    function jumpAt(ev, x0, y0, x1, y1, span) {
      if (!(Math.abs(y1 - y0) > span)) return null;
      if (!ev) return (y0 > 0) !== (y1 > 0) ? (x0 + x1) / 2 : null;
      var a = x0, b = x1, ya = y0, yb = y1;
      for (var k = 0; k < 30; k++) {
        var m = (a + b) / 2, ym = evalAt(ev, m);
        if (ym === null) return m;
        if (Math.abs(ym - ya) >= Math.abs(yb - ym)) { b = m; yb = ym; } else { a = m; ya = ym; }
      }
      return Math.abs(yb - ya) > span * 1e-3 ? (a + b) / 2 : null;
    }
    // Where the curve stops being defined, between an undefined x and a defined x.
    function edgeAt(ev, xu, xd) {
      if (!ev) return xd;
      for (var k = 0; k < 40; k++) { var m = (xu + xd) / 2; if (evalAt(ev, m) !== null) xd = m; else xu = m; }
      return xd;
    }
    function refineZero(ev, a, ya, b, yb) {
      if (!ev) return a - ya * (b - a) / (yb - ya);
      for (var k = 0; k < 60; k++) {
        var m = (a + b) / 2, ym = evalAt(ev, m);
        if (ym === null) break;
        if (ym === 0) return m;
        if ((ym < 0) === (ya < 0)) { a = m; ya = ym; } else { b = m; yb = ym; }
      }
      return Math.abs(ya) <= Math.abs(yb) ? a : b;
    }
    function refineTurn(ev, a, b, isMax, fallback) {
      if (!ev) return fallback;
      var r = (Math.sqrt(5) - 1) / 2, c = b - r * (b - a), d = a + r * (b - a);
      function f(x) { var v = evalAt(ev, x); return v === null ? Infinity : (isMax ? -v : v); }
      var fc = f(c), fd = f(d);
      for (var k = 0; k < 60; k++) {
        if (fc < fd) { b = d; d = c; fd = fc; c = b - r * (b - a); fc = f(c); }
        else { a = c; c = d; fc = fd; d = a + r * (b - a); fd = f(d); }
      }
      var x = (a + b) / 2, y = evalAt(ev, x);
      if (y === null) return fallback;
      return (isMax ? y >= fallback.y : y <= fallback.y) ? { x: x, y: y } : fallback;
    }
    // Key features of one sampled curve. opts: evaluate, ymin, ymax, zeros (x list from a
    // better root finder; it replaces the sample scan).
    function analyse(samples, opts) {
      opts = opts || {};
      var ev = typeof opts.evaluate === 'function' ? opts.evaluate : null;
      var pts = (Array.isArray(samples) ? samples : []).filter(function (s) { return s && fin(s.x); }).map(function (s) { return { x: s.x, y: fin(s.y) ? s.y : null }; });
      var n = pts.length;
      var out = { defined: false, runs: [], gaps: [], zeros: [], extrema: [], intervals: [], yIntercept: null, ends: { left: null, right: null }, xmin: n ? pts[0].x : 0, xmax: n ? pts[n - 1].x : 0, ymin: opts.ymin, ymax: opts.ymax };
      if (n < 2) return out;
      var xmin = pts[0].x, xmax = pts[n - 1].x, step = (xmax - xmin) / (n - 1);
      var ys = []; pts.forEach(function (p) { if (p.y !== null) ys.push(p.y); });
      if (!ys.length) return out;
      out.defined = true;
      var dataLo = Math.min.apply(null, ys), dataHi = Math.max.apply(null, ys);
      var lo = fin(opts.ymin) ? opts.ymin : dataLo, hi = fin(opts.ymax) ? opts.ymax : dataHi;
      var span = hi > lo ? hi - lo : Math.max(1, Math.abs(hi));
      var flat = span * 1e-9, zeroTol = span * 1e-12;
      function clean(x) { var r = Math.round(x); if (Math.abs(x - r) < Math.max(1e-9, step * 1e-6)) x = r; return x === 0 ? 0 : x; }
      function cleanY(y) { return Math.abs(y) < zeroTol ? 0 : y; }
      var runs = [], cur = null, i, k;
      for (i = 0; i < n; i++) {
        var p = pts[i];
        if (p.y === null) { cur = null; continue; }
        if (cur && jumpAt(ev, pts[i - 1].x, pts[i - 1].y, p.x, p.y, span) !== null) cur = null;
        if (!cur) { cur = []; runs.push(cur); }
        p.i = i; cur.push(p);
      }
      out.runs = runs;
      var first = runs[0][0], lastRun = runs[runs.length - 1], last = lastRun[lastRun.length - 1];
      if (first.i > 0) out.gaps.push({ kind: 'left', x: clean(edgeAt(ev, pts[first.i - 1].x, first.x)) });
      for (k = 1; k < runs.length; k++) {
        var A = runs[k - 1][runs[k - 1].length - 1], B = runs[k][0];
        if (B.i - A.i <= 2) {
          var bx = B.i - A.i === 1 ? jumpAt(ev, A.x, A.y, B.x, B.y, span) : (A.x + B.x) / 2;
          out.gaps.push({ kind: 'break', x: clean(bx === null ? (A.x + B.x) / 2 : bx) });
        } else out.gaps.push({ kind: 'missing', from: clean(edgeAt(ev, pts[A.i + 1].x, A.x)), to: clean(edgeAt(ev, pts[B.i - 1].x, B.x)) });
      }
      if (last.i < n - 1) out.gaps.push({ kind: 'right', x: clean(edgeAt(ev, pts[last.i + 1].x, last.x)) });
      var zeros = out.zeros;
      // Zeros handed in by the root engine are kept as found (two close roots stay two).
      function addZero(x, kind) {
        x = clean(x);
        var near = given && !out.alongAxis ? Math.max(1e-10, step * 1e-6) : step * 0.5;
        for (var z = 0; z < zeros.length; z++) if (Math.abs(zeros[z].x - x) <= near) return;
        zeros.push({ x: x, y: 0, kind: kind });
      }
      out.alongAxis = ys.every(function (y) { return Math.abs(y) <= zeroTol; });
      var given = Array.isArray(opts.zeros);
      if (out.alongAxis) given = true;
      else if (given) opts.zeros.forEach(function (z) { var zx = fin(z) ? z : (z && fin(z.x) ? z.x : null); if (zx !== null && zx >= xmin - 1e-9 && zx <= xmax + 1e-9) addZero(zx, 'cross'); });
      else runs.forEach(function (run) {
        for (var j = 0; j < run.length; j++) {
          var s = run[j];
          if (Math.abs(s.y) <= zeroTol) { addZero(s.x, 'cross'); continue; }
          var t2 = run[j + 1];
          if (t2 && Math.abs(t2.y) > zeroTol && (s.y < 0) !== (t2.y < 0)) addZero(refineZero(ev, s.x, s.y, t2.x, t2.y), 'cross');
        }
      });
      runs.forEach(function (run) {
        var dir = 0;
        for (var j = 1; j < run.length; j++) {
          var dy = run[j].y - run[j - 1].y, d = Math.abs(dy) <= flat ? 0 : (dy > 0 ? 1 : -1);
          if (d === 0) continue;
          if (dir !== 0 && d !== dir) {
            var isMax = dir > 0, at = run[j - 1];
            var e = refineTurn(ev, run[Math.max(0, j - 2)].x, run[j].x, isMax, { x: at.x, y: at.y });
            out.extrema.push({ x: clean(e.x), y: cleanY(e.y), kind: isMax ? 'max' : 'min' });
          }
          dir = d;
        }
      });
      out.extrema.forEach(function (e) { if (!given && Math.abs(e.y) <= Math.max(zeroTol, 1e-9)) addZero(e.x, 'touch'); });
      zeros.sort(function (a, b) { return a.x - b.x; });
      zeros.forEach(function (z, zi) {
        var gap = Infinity;
        if (zi > 0) gap = z.x - zeros[zi - 1].x;
        if (zi < zeros.length - 1) gap = Math.min(gap, zeros[zi + 1].x - z.x);
        var d = Math.max(Math.min(step * 0.5, gap / 2), 1e-6), l = ev ? evalAt(ev, z.x - d) : null, r = ev ? evalAt(ev, z.x + d) : null;
        if (l !== null && r !== null && Math.abs(l) > zeroTol && Math.abs(r) > zeroTol && (l > 0) === (r > 0)) z.kind = 'touch';
      });
      runs.forEach(function (run) {
        var a = run[0], b = run[run.length - 1];
        var cuts = [{ x: a.x, y: a.y }].concat(out.extrema.filter(function (e) { return e.x > a.x && e.x < b.x; })).concat([{ x: b.x, y: b.y }]);
        var level = run.every(function (s) { return Math.abs(s.y - a.y) <= flat * 10; });
        for (var c = 1; c < cuts.length; c++) {
          if (cuts[c].x - cuts[c - 1].x < step * 0.5) continue;
          var dy = cuts[c].y - cuts[c - 1].y;
          out.intervals.push({ from: clean(cuts[c - 1].x), to: clean(cuts[c].x), dir: level || Math.abs(dy) <= flat ? 'constant' : (dy > 0 ? 'increasing' : 'decreasing') });
        }
      });
      if (xmin <= 0 && xmax >= 0) {
        var y0 = null;
        if (ev) y0 = evalAt(ev, 0);
        else pts.forEach(function (p) { if (p.x === 0) y0 = p.y; });
        out.yIntercept = { x: 0, y: y0 === null ? null : cleanY(y0) };
      }
      var reach = Math.max(2, Math.round((n - 1) * 0.04));
      function trend(run, left) {
        if (run.length < 2) return null;
        var s0 = left ? run[0] : run[run.length - 1], s1 = left ? run[Math.min(run.length - 1, reach)] : run[Math.max(0, run.length - 1 - reach)];
        var dy = s0.y - s1.y;
        if (Math.abs(dy) <= span * 0.002) return { trend: 'levels', y: cleanY(s0.y) };
        if (dy > 0) return { trend: fin(opts.ymax) && s0.y > opts.ymax ? 'past_top' : 'increases' };
        return { trend: fin(opts.ymin) && s0.y < opts.ymin ? 'past_bottom' : 'decreases' };
      }
      out.ends = { left: trend(runs[0], true), right: trend(lastRun, false) };
      return out;
    }
    // Plain-language summary. opts: t, name, evaluate, zeros, ymin, ymax, hide {zeros, yIntercept}.
    function describeGraph(samples, opts) {
      opts = opts || {};
      var __alloT = tOf(opts.t), f = analyse(samples, opts), hide = opts.hide || {};
      var lead = opts.name ? fill(__alloT('stem.graph_access.graph_of', 'Graph of {name}.'), { name: opts.name }) : '';
      if (!f.defined) {
        var none = __alloT('stem.graph_access.empty', 'No part of this graph is in the current window.');
        return { text: (lead + ' ' + none).trim(), short: (lead + ' ' + none).trim(), features: f, points: [] };
      }
      var zeros = hide.zeros ? [] : f.zeros.filter(function (z) { return !(hide.yIntercept && z.x === 0); });
      var turns = f.extrema.filter(function (e) { return !(hide.yIntercept && e.x === 0) && !(hide.zeros && e.y === 0); });
      var yint = f.yIntercept && !hide.yIntercept && !(hide.zeros && f.yIntercept.y === 0) ? f.yIntercept : null;
      var parts = [], shortParts = [];
      var gapText = f.gaps.map(function (g) {
        if (g.kind === 'left') return fill(__alloT('stem.graph_access.gap_left', 'There is no graph left of x = {x}.'), { x: num(g.x) });
        if (g.kind === 'right') return fill(__alloT('stem.graph_access.gap_right', 'There is no graph right of x = {x}.'), { x: num(g.x) });
        if (g.kind === 'break') return fill(__alloT('stem.graph_access.gap_break', 'The graph breaks at x = {x}.'), { x: num(g.x) });
        return fill(__alloT('stem.graph_access.gap_missing', 'There is no graph from x = {from} to x = {to}.'), { from: num(g.from), to: num(g.to) });
      });
      parts.push(gapText.length ? gapText.join(' ') : fill(__alloT('stem.graph_access.domain_all', 'It is drawn across the whole window, from x = {from} to x = {to}.'), { from: num(f.xmin), to: num(f.xmax) }));
      var zeroText = hide.zeros ? __alloT('stem.graph_access.zeros_hidden', 'Explore with keys to find where it meets the x-axis.')
        : f.alongAxis ? __alloT('stem.graph_access.zeros_along', 'It lies along the x-axis across this window.')
        : !zeros.length ? __alloT('stem.graph_access.zeros_none', 'It does not meet the x-axis in this window.')
        : fill(__alloT('stem.graph_access.zeros_list', 'It meets the x-axis at {list}.'), { list: listOf(zeros.slice(0, 6).map(function (z) { return 'x = ' + num(z.x) + (z.kind === 'touch' ? ' ' + __alloT('stem.graph_access.zero_touches', '(touching, not crossing)') : ''); }), __alloT) + (zeros.length > 6 ? ' ' + fill(__alloT('stem.graph_access.and_more', 'and {n} more'), { n: zeros.length - 6 }) : '') });
      parts.push(zeroText); shortParts.push(zeroText);
      if (yint) {
        var yText = yint.y === null ? __alloT('stem.graph_access.yint_undefined', 'It is undefined at x = 0, so there is no y-intercept.') : fill(__alloT('stem.graph_access.yint', 'It crosses the y-axis at y = {y}.'), { y: num(yint.y) });
        parts.push(yText); shortParts.push(yText);
      }
      function turnText(e) { return fill(e.kind === 'max' ? __alloT('stem.graph_access.turn_max', 'a local maximum at ({x}, {y})') : __alloT('stem.graph_access.turn_min', 'a local minimum at ({x}, {y})'), { x: num(e.x), y: num(e.y) }); }
      var oscillates = turns.length >= 4;
      if (oscillates) {
        var osc = fill(__alloT('stem.graph_access.oscillates', 'It rises and falls repeatedly, with {n} turning points in this window, including {list}.'), { n: turns.length, list: listOf(turns.slice(0, 2).map(turnText), __alloT) });
        parts.push(osc); shortParts.push(osc);
      } else if (turns.length) {
        var tt = fill(__alloT('stem.graph_access.turning_points', 'It has {list}.'), { list: listOf(turns.map(turnText), __alloT) });
        parts.push(tt); shortParts.push(tt);
      } else parts.push(__alloT('stem.graph_access.no_turns', 'It has no turning points in this window.'));
      if (!oscillates && f.intervals.length) {
        parts.push(fill(__alloT('stem.graph_access.intervals', 'Reading left to right, it is {list}.'), { list: listOf(f.intervals.map(function (iv) {
          var word = iv.dir === 'increasing' ? __alloT('stem.graph_access.increasing', 'increasing') : iv.dir === 'decreasing' ? __alloT('stem.graph_access.decreasing', 'decreasing') : __alloT('stem.graph_access.constant', 'constant');
          return fill(__alloT('stem.graph_access.interval', '{dir} from x = {from} to x = {to}'), { dir: word, from: num(iv.from), to: num(iv.to) });
        }), __alloT) }));
      }
      function trendText(e) { return trendWords(e, __alloT); }
      if (!oscillates && f.ends.left) parts.push(fill(__alloT('stem.graph_access.end_left', 'As x moves left, y {trend}.'), { trend: trendText(f.ends.left) }));
      if (!oscillates && f.ends.right) parts.push(fill(__alloT('stem.graph_access.end_right', 'As x moves right, y {trend}.'), { trend: trendText(f.ends.right) }));
      if (fin(opts.ymin) && fin(opts.ymax)) parts.push(fill(__alloT('stem.graph_access.window', 'Window: x from {x0} to {x1}, y from {y0} to {y1}.'), { x0: num(f.xmin), x1: num(f.xmax), y0: num(opts.ymin), y1: num(opts.ymax) }));
      var points = [];
      zeros.forEach(function (z) { points.push({ x: z.x, y: 0, kind: z.kind === 'touch' ? 'touch' : 'zero' }); });
      if (yint) points.push({ x: 0, y: yint.y, kind: 'yint' });
      turns.forEach(function (e) { points.push({ x: e.x, y: e.y, kind: e.kind }); });
      f.gaps.forEach(function (g) {
        if (g.kind === 'break') points.push({ x: g.x, y: null, kind: 'break' });
        else if (g.kind === 'left') points.push({ x: g.x, y: opts.evaluate ? evalAt(opts.evaluate, g.x) : null, kind: 'start' });
        else if (g.kind === 'right') points.push({ x: g.x, y: opts.evaluate ? evalAt(opts.evaluate, g.x) : null, kind: 'end' });
        else { points.push({ x: g.from, y: opts.evaluate ? evalAt(opts.evaluate, g.from) : null, kind: 'end' }); points.push({ x: g.to, y: opts.evaluate ? evalAt(opts.evaluate, g.to) : null, kind: 'start' }); }
      });
      points.sort(function (a, b) { return a.x - b.x; });
      return { text: [lead].concat(parts).join(' ').trim(), short: [lead].concat(shortParts).join(' ').trim(), features: f, points: points };
    }
    function trendWords(e, __alloT) {
      if (!e) return '';
      if (e.trend === 'levels') return fill(__alloT('stem.graph_access.trend_levels', 'levels off near y = {y}'), { y: num(e.y) });
      if (e.trend === 'past_top') return __alloT('stem.graph_access.trend_past_top', 'increases past the top of the window');
      if (e.trend === 'past_bottom') return __alloT('stem.graph_access.trend_past_bottom', 'decreases past the bottom of the window');
      return e.trend === 'increases' ? __alloT('stem.graph_access.trend_increases', 'increases') : __alloT('stem.graph_access.trend_decreases', 'decreases');
    }
    function featureLabel(kind, __alloT) {
      if (kind === 'zero') return __alloT('stem.graph_access.feature_zero', 'meets the x-axis');
      if (kind === 'touch') return __alloT('stem.graph_access.feature_touch', 'touches the x-axis');
      if (kind === 'yint') return __alloT('stem.graph_access.feature_yint', 'y-intercept');
      if (kind === 'max') return __alloT('stem.graph_access.feature_max', 'local maximum');
      if (kind === 'min') return __alloT('stem.graph_access.feature_min', 'local minimum');
      if (kind === 'break') return __alloT('stem.graph_access.feature_break', 'break in the graph');
      if (kind === 'start') return __alloT('stem.graph_access.feature_start', 'the graph starts here');
      if (kind === 'end') return __alloT('stem.graph_access.feature_end', 'the graph ends here');
      return '';
    }
    // Samples with the key features merged in, in x order, for keyboard stepping.
    function explorePoints(samples, desc, t) {
      var __alloT = tOf(t), out = (Array.isArray(samples) ? samples : []).filter(function (s) { return s && fin(s.x); }).map(function (s) { return { x: s.x, y: fin(s.y) ? s.y : null, kind: '', feature: '' }; });
      var tol = out.length > 1 ? (out[out.length - 1].x - out[0].x) / (out.length - 1) * 1e-6 : 1e-9;
      ((desc && desc.points) || []).forEach(function (p) {
        var item = { x: p.x, y: fin(p.y) ? p.y : null, kind: p.kind, feature: featureLabel(p.kind, __alloT) }, j = 0;
        while (j < out.length && out[j].x < p.x - tol) j++;
        if (j < out.length && Math.abs(out[j].x - p.x) <= tol) {
          if (out[j].feature) item.feature = out[j].feature + ', ' + item.feature;
          out[j] = item;
        } else out.splice(j, 0, item);
      });
      return out;
    }
    function pointText(p, t) {
      var __alloT = tOf(t);
      if (!p) return '';
      var s = p.y === null ? fill(__alloT('stem.graph_access.point_undefined', 'x = {x}, y is undefined'), { x: num(p.x) }) : fill(__alloT('stem.graph_access.point', 'x = {x}, y = {y}'), { x: num(p.x), y: num(p.y) });
      return p.feature ? s + ': ' + p.feature : s;
    }
    function stepIndex(points, index, key) {
      var n = Array.isArray(points) ? points.length : 0;
      if (!n) return { index: -1, handled: false };
      var i = fin(index) && index >= 0 && index < n ? index : -1;
      if (key === 'ArrowRight') return { index: Math.min(n - 1, i + 1), handled: true, edge: i === n - 1 };
      if (key === 'ArrowLeft') return { index: i < 0 ? 0 : Math.max(0, i - 1), handled: true, edge: i === 0 };
      if (key === 'Home') return { index: 0, handled: true };
      if (key === 'End') return { index: n - 1, handled: true };
      if (key === 'PageDown' || key === 'PageUp') {
        var dir = key === 'PageDown' ? 1 : -1;
        for (var j = (i < 0 && dir < 0 ? n : i) + dir; j >= 0 && j < n; j += dir) if (points[j].feature) return { index: j, handled: true };
        return { index: i < 0 ? 0 : i, handled: true, none: true };
      }
      return { index: i, handled: false };
    }
    // Spoken updates, throttled: the first is immediate, a burst collapses to its last.
    var speech = { last: 0, timer: null, pending: null };
    function liveRegion(text) {
      var el = document.getElementById('allo-live-graph-access');
      if (!el) {
        el = document.createElement('div'); el.id = 'allo-live-graph-access';
        el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-atomic', 'true'); el.setAttribute('role', 'status'); el.className = 'sr-only';
        el.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
        document.body.appendChild(el);
      }
      el.textContent = ''; el.textContent = text;
    }
    function say(text, announce) {
      if (!text) return;
      var fn = typeof announce === 'function' ? announce : liveRegion, now = Date.now();
      if (!speech.timer && now - speech.last >= 150) { speech.last = now; try { fn(text); } catch (e) {} return; }
      speech.pending = { text: text, fn: fn };
      if (!speech.timer) speech.timer = setTimeout(function () {
        var p = speech.pending; speech.timer = null; speech.pending = null;
        if (p) { speech.last = Date.now(); try { p.fn(p.text); } catch (e) {} }
      }, 150);
    }
    // A button press is its own event: announce now and drop any queued step update.
    function sayNow(text, announce) {
      if (!text) return;
      if (speech.timer) { clearTimeout(speech.timer); speech.timer = null; speech.pending = null; }
      speech.last = Date.now();
      try { (typeof announce === 'function' ? announce : liveRegion)(text); } catch (e) {}
    }
    function stepperKeyDown(e, cfg) {
      cfg = cfg || {};
      var r = stepIndex(cfg.points, cfg.index, e && e.key);
      if (!r.handled) return false;
      if (e.preventDefault) e.preventDefault();
      var __alloT = tOf(cfg.t), text = pointText(cfg.points[r.index], cfg.t);
      if (r.none) text = __alloT('stem.graph_access.no_more_features', 'No more key features this way.') + ' ' + text;
      else if (r.edge) text = __alloT('stem.graph_access.at_edge', 'Edge of the window.') + ' ' + text;
      if (typeof cfg.onMove === 'function' && r.index !== cfg.index) cfg.onMove(r.index);
      say(text, cfg.announce);
      return true;
    }
    // Pitch follows y (log scale between ymin and ymax), pan follows x, a click marks each
    // x-axis crossing, and an undefined stretch or a jump is silence between segments.
    function sonifyPlan(samples, opts) {
      opts = opts || {};
      var pts = (Array.isArray(samples) ? samples : []).filter(function (s) { return s && fin(s.x); });
      if (pts.length < 2) return null;
      var x0 = pts[0].x, x1 = pts[pts.length - 1].x;
      if (!(x1 > x0)) return null;
      for (var i = 1; i < pts.length; i++) if (!(pts[i].x > pts[i - 1].x)) return null;
      var ys = pts.filter(function (p) { return fin(p.y); }).map(function (p) { return p.y; });
      if (!ys.length) return null;
      var lo = fin(opts.ymin) ? opts.ymin : Math.min.apply(null, ys), hi = fin(opts.ymax) ? opts.ymax : Math.max.apply(null, ys);
      if (!(hi > lo)) { lo -= 1; hi += 1; }
      var duration = fin(opts.seconds) && opts.seconds > 0 ? Math.min(20, opts.seconds) : SECONDS;
      var ratio = FMAX / FMIN, ev = typeof opts.evaluate === 'function' ? opts.evaluate : null;
      function frac(x) { return (x - x0) / (x1 - x0); }
      function freq(y) { return FMIN * Math.pow(ratio, Math.min(1, Math.max(0, (y - lo) / (hi - lo)))); }
      var segments = [], cur = null, prev = null;
      pts.forEach(function (p) {
        if (!fin(p.y)) { cur = null; prev = null; return; }
        if (cur && prev && jumpAt(ev, prev.x, prev.y, p.x, p.y, hi - lo) !== null) cur = null;
        if (!cur) { cur = []; segments.push(cur); }
        cur.push(Object.freeze({ t: frac(p.x) * duration, freq: freq(p.y), pan: PANMAX * (2 * frac(p.x) - 1), x: p.x, y: p.y }));
        prev = p;
      });
      var zx = Array.isArray(opts.zeros) ? opts.zeros.map(function (z) { return fin(z) ? z : (z && fin(z.x) ? z.x : null); }).filter(function (z) { return z !== null && z >= x0 && z <= x1; })
        : analyse(pts, { evaluate: ev, ymin: lo, ymax: hi }).zeros.map(function (z) { return z.x; });
      var cues = zx.sort(function (a, b) { return a - b; }).map(function (z) { return Object.freeze({ t: frac(z) * duration, kind: 'zero', x: z, freq: CLICKHZ }); });
      var sounding = 0;
      segments.forEach(function (s) { sounding += s[s.length - 1].t - s[0].t; });
      return Object.freeze({ duration: duration, segments: Object.freeze(segments.map(function (s) { return Object.freeze(s); })), cues: Object.freeze(cues), x0: x0, x1: x1, ymin: lo, ymax: hi, silentFraction: Math.max(0, 1 - sounding / duration) });
    }
    var audio = { ctx: null, handle: null };
    function audioCtx() {
      var SL = window.StemLab;
      try { if (SL && typeof SL.audioContext === 'function') return SL.audioContext(); } catch (e) {}
      if (audio.ctx && audio.ctx.state !== 'closed') { if (audio.ctx.state === 'suspended' && audio.ctx.resume) { try { audio.ctx.resume(); } catch (e) {} } return audio.ctx; }
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      try { audio.ctx = new Ctor(); } catch (e) { audio.ctx = null; }
      return audio.ctx;
    }
    function isMuted() { return !!window._alloGlobalMute; }
    function isPlaying(key) { return !!audio.handle && (key == null || audio.handle.key === key); }
    function stop() { var hd = audio.handle; audio.handle = null; if (hd) hd.stop(); }
    // Call only from a click or key press. Returns { key, duration, stop } or null.
    function playPlan(plan, opts) {
      opts = opts || {};
      stop();
      if (!plan || !plan.segments || opts.muted || isMuted()) return null;
      var ac = audioCtx();
      if (!ac || typeof ac.createOscillator !== 'function' || typeof ac.createGain !== 'function') return null;
      var nodes = [], ended = false, timer = null;
      var handle = { key: opts.key == null ? null : opts.key, duration: plan.duration, stop: function () {} };
      function finish() {
        if (ended) return;
        ended = true; if (timer) clearTimeout(timer);
        if (audio.handle === handle) audio.handle = null;
        if (typeof opts.onEnd === 'function') { try { opts.onEnd(); } catch (e) {} }
      }
      function voice(type, f, at, until, peak) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.setValueAtTime(f, at);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + 0.02);
        g.gain.setValueAtTime(peak, Math.max(at + 0.025, until - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, until + 0.02);
        o.connect(g);
        nodes.push({ osc: o, gain: g });
        return { o: o, g: g };
      }
      try {
        var t0 = ac.currentTime + 0.06;
        plan.segments.forEach(function (seg) {
          var start = t0 + seg[0].t, end = Math.max(start + 0.05, t0 + seg[seg.length - 1].t);
          var v = voice('sine', seg[0].freq, start, end, 0.09), pan = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
          if (pan) pan.pan.setValueAtTime(seg[0].pan, start);
          for (var j = 1; j < seg.length; j++) {
            v.o.frequency.exponentialRampToValueAtTime(seg[j].freq, t0 + seg[j].t);
            if (pan) pan.pan.linearRampToValueAtTime(seg[j].pan, t0 + seg[j].t);
          }
          if (pan) { v.g.connect(pan); pan.connect(ac.destination); } else v.g.connect(ac.destination);
          v.o.start(start); v.o.stop(end + 0.06);
        });
        plan.cues.forEach(function (c) {
          var at = t0 + c.t, v = voice('triangle', c.freq, at, at + 0.04, 0.08);
          v.g.connect(ac.destination); v.o.start(at); v.o.stop(at + 0.1);
        });
        timer = setTimeout(finish, (plan.duration + 0.35) * 1000);
      } catch (e) {
        nodes.forEach(function (nd) { try { nd.osc.stop(); } catch (er) {} try { nd.osc.disconnect(); } catch (er) {} });
        finish(); return null;
      }
      handle.stop = function () {
        if (ended) return;
        nodes.forEach(function (nd) { try { nd.gain.gain.cancelScheduledValues(0); nd.gain.gain.setValueAtTime(0.0001, ac.currentTime); } catch (e) {} try { nd.osc.stop(); } catch (e) {} try { nd.osc.disconnect(); } catch (e) {} });
        finish();
      };
      audio.handle = handle;
      return handle;
    }
    function speak(text, callTTS) {
      if (!text || isMuted()) return false;
      if (typeof callTTS === 'function') {
        try { var r = callTTS(text, undefined, undefined, { force: true }); if (r && typeof r.catch === 'function') r.catch(function () {}); return true; } catch (e) {}
      }
      try {
        if (window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
          var u = new window.SpeechSynthesisUtterance(text); u.rate = 0.95;
          window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); return true;
        }
      } catch (e) {}
      return false;
    }
    // First differences and ratios between consecutive rows, for linear-vs-exponential reasoning.
    function differencesTable(rows) {
      var out = [], dxs = [];
      function r12(v) { var r = Number(v.toPrecision(12)); return r === 0 ? 0 : r; }
      (Array.isArray(rows) ? rows : []).forEach(function (row, i) {
        var x = row && fin(row.x) ? row.x : null, y = row && fin(row.y) ? row.y : null, prev = i > 0 ? out[i - 1] : null;
        var item = { x: x, y: y, dy: null, ratio: null, d2: null };
        if (prev && prev.y !== null && y !== null) { item.dy = r12(y - prev.y); if (prev.y !== 0) item.ratio = r12(y / prev.y); }
        if (prev && prev.dy !== null && item.dy !== null) item.d2 = r12(item.dy - prev.dy);
        if (prev && prev.x !== null && x !== null) dxs.push(x - prev.x);
        out.push(item);
      });
      function same(list) {
        if (list.length < 2 || list.some(function (v) { return v === null; })) return false;
        return list.every(function (v) { return Math.abs(v - list[0]) <= 1e-9 * Math.max(1, Math.abs(list[0])); });
      }
      var diffs = out.slice(1).map(function (r) { return r.dy; }), ratios = out.slice(1).map(function (r) { return r.ratio; }), d2s = out.slice(2).map(function (r) { return r.d2; });
      var equalSteps = dxs.length === out.length - 1 && dxs.length > 0 && same(dxs.length > 1 ? dxs : dxs.concat(dxs));
      var pattern = out.length < 3 ? 'short' : !equalSteps ? 'unequal' : same(diffs) && diffs[0] === 0 ? 'constant' : same(diffs) ? 'linear' : same(ratios) ? 'exponential' : same(d2s) ? 'quadratic' : 'neither';
      return { rows: out, equalSteps: equalSteps, pattern: pattern, difference: same(diffs) ? diffs[0] : null, ratio: same(ratios) ? ratios[0] : null, secondDifference: same(d2s) ? d2s[0] : null };
    }
    function differencesSummary(table, t) {
      var __alloT = tOf(t), p = table && table.pattern;
      if (p === 'short') return __alloT('stem.graph_access.diff_short', 'Add more rows to compare differences.');
      if (p === 'unequal') return __alloT('stem.graph_access.diff_unequal', 'The x steps are not equal, so the differences cannot be compared.');
      if (p === 'constant') return __alloT('stem.graph_access.diff_constant', 'Every difference is 0: y stays the same.');
      if (p === 'linear') return fill(__alloT('stem.graph_access.diff_linear', 'Each equal step in x adds the same amount ({d}) to y: a linear pattern.'), { d: num(table.difference) });
      if (p === 'exponential') return fill(__alloT('stem.graph_access.diff_exponential', 'Each equal step in x multiplies y by the same factor ({r}): an exponential pattern.'), { r: num(table.ratio) });
      if (p === 'quadratic') return fill(__alloT('stem.graph_access.diff_quadratic', 'The differences change by the same amount ({d}) each step: a quadratic pattern.'), { d: num(table.secondDifference) });
      return __alloT('stem.graph_access.diff_neither', 'Neither the differences nor the ratios are constant.');
    }
    // Function Grapher's nine families, so another tool can hand a curve over exactly.
    function familyValue(type, a, b, c, x) {
      if (type === 'linear') return a * x + b;
      if (type === 'quadratic') return a * x * x + b * x + c;
      if (type === 'trig') return a * Math.sin(b * x + c);
      if (type === 'cubic') return a * x * x * x + b * x + c;
      if (type === 'exponential') return a * Math.exp(b * x) + c;
      if (type === 'absolute') return a * Math.abs(x + b) + c;
      if (type === 'sqrt') return a * Math.sqrt(x + b) + c;
      if (type === 'log') return a * Math.log(x + b) + c;
      if (type === 'rational') return a / (x + b) + c;
      return NaN;
    }
    var MATCH_XS = [-3.7, -2.6, -1.45, -0.55, 0.35, 1.2, 2.15, 3.05, 3.9, 4.65];
    function solveLinear(M, v) {
      var n = v.length, A = M.map(function (row, i) { return row.concat([v[i]]); });
      for (var c = 0; c < n; c++) {
        var p = c;
        for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
        if (Math.abs(A[p][c]) < 1e-12) return null;
        var tmp = A[c]; A[c] = A[p]; A[p] = tmp;
        for (var r2 = 0; r2 < n; r2++) if (r2 !== c) { var f = A[r2][c] / A[c][c]; for (var k = c; k <= n; k++) A[r2][k] -= f * A[c][k]; }
      }
      return A.map(function (row, i) { return row[n] / row[i]; });
    }
    // The family and slider values (a, b, c on 0.1 steps within [-5, 5]) that reproduce the
    // curve exactly at ten probe points, or null.
    function matchFamily(evaluate) {
      if (typeof evaluate !== 'function') return null;
      var ys = MATCH_XS.map(function (x) { return evalAt(evaluate, x); });
      if (ys.filter(function (y) { return y !== null; }).length < 4) return null;
      var scale = 1;
      ys.forEach(function (y) { if (y !== null) scale = Math.max(scale, Math.abs(y)); });
      function r1(v) { var r = Math.round(v * 10) / 10; return r === 0 ? 0 : r; }
      function verify(type, a, b, c) {
        if (![a, b, c].every(function (v) { return fin(v) && Math.abs(v) <= 5 + 1e-9; })) return false;
        var used = 0;
        for (var i = 0; i < MATCH_XS.length; i++) {
          var f = familyValue(type, a, b, c, MATCH_XS[i]), ok = fin(f);
          if (ok !== (ys[i] !== null)) return false;
          if (!ok) continue;
          used++;
          if (Math.abs(f - ys[i]) > 1e-6 * scale) return false;
        }
        return used >= 4;
      }
      function tryFit(type, basis, map) {
        var rows = [], vals = [];
        for (var i = 0; i < MATCH_XS.length; i++) {
          var r = basis(MATCH_XS[i]), ok = r.every(fin);
          if (ok !== (ys[i] !== null)) return null;
          if (ok) { rows.push(r); vals.push(ys[i]); }
        }
        if (rows.length < 4) return null;
        var m = rows[0].length, M = [], v = [];
        for (var p = 0; p < m; p++) { M.push([]); v.push(0); for (var q = 0; q < m; q++) M[p].push(0); }
        rows.forEach(function (row, k) { for (var p2 = 0; p2 < m; p2++) { v[p2] += row[p2] * vals[k]; for (var q2 = 0; q2 < m; q2++) M[p2][q2] += row[p2] * row[q2]; } });
        var sol = solveLinear(M, v);
        if (!sol) return null;
        var cands = map(sol) || [];
        for (var j = 0; j < cands.length; j++) {
          var a = r1(cands[j][0]), b = r1(cands[j][1]), c = r1(cands[j][2]);
          if (verify(type, a, b, c)) return { type: type, a: a, b: b, c: c };
        }
        return null;
      }
      var hit = tryFit('linear', function (x) { return [x, 1]; }, function (p) { return [[p[0], p[1], 0]]; })
        || tryFit('quadratic', function (x) { return [x * x, x, 1]; }, function (p) { return Math.abs(p[0]) < 1e-9 ? [] : [p]; })
        || tryFit('cubic', function (x) { return [x * x * x, x, 1]; }, function (p) { return Math.abs(p[0]) < 1e-9 ? [] : [p]; });
      if (hit) return hit;
      var families = ['exponential', 'absolute', 'sqrt', 'log', 'rational', 'trig'];
      function basisFor(type, b) {
        if (type === 'exponential') return function (x) { return [Math.exp(b * x), 1]; };
        if (type === 'absolute') return function (x) { return [Math.abs(x + b), 1]; };
        if (type === 'sqrt') return function (x) { return [Math.sqrt(x + b), 1]; };
        if (type === 'log') return function (x) { return [Math.log(x + b), 1]; };
        if (type === 'rational') return function (x) { return [1 / (x + b), 1]; };
        return function (x) { return [Math.sin(b * x), Math.cos(b * x)]; };
      }
      function mapFor(type, b) {
        if (type === 'trig') return function (p) {
          var amp = Math.sqrt(p[0] * p[0] + p[1] * p[1]), ph = Math.atan2(p[1], p[0]);
          if (amp < 1e-9) return [];
          var alt = ph > 0 ? ph - Math.PI : ph + Math.PI;
          return [[amp, b, ph], [-amp, b, alt]];
        };
        return function (p) { return Math.abs(p[0]) < 1e-9 ? [] : [[p[0], b, p[1]]]; };
      }
      // Positive b first, so sin(x) comes back as a = 1, b = 1 rather than a = -1, b = -1.
      for (var fi = 0; fi < families.length; fi++) {
        for (var bi = 0; bi <= 100; bi++) {
          var b = bi <= 50 ? bi / 10 : (50 - bi) / 10;
          if (b === 0 && (families[fi] === 'exponential' || families[fi] === 'trig')) continue;
          hit = tryFit(families[fi], basisFor(families[fi], b), mapFor(families[fi], b));
          if (hit) return hit;
        }
      }
      return null;
    }
    // Canvas and SVG colours per app theme, each curve with its own dash so colour is
    // never the only cue. Canvas cannot read CSS var(), so these are literal.
    var PALETTES = {
      light: { bg: '#ffffff', grid: '#c3cedb', axis: '#334155', label: '#1e293b', muted: '#475569', curves: ['#1d4ed8', '#be185d', '#047857', '#b45309', '#6d28d9', '#c2410c'] },
      dark: { bg: '#0f172a', grid: '#3a4a61', axis: '#94a3b8', label: '#e2e8f0', muted: '#cbd5e1', curves: ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'] },
      contrast: { bg: '#000000', grid: '#6b7280', axis: '#ffffff', label: '#ffffff', muted: '#ffffff', curves: ['#ffff00', '#00ffff', '#ffffff', '#ff80ff', '#80ff80', '#ffb366'] }
    };
    var DASHES = [[], [10, 5], [2, 5], [12, 4, 2, 4], [6, 6], [16, 6]];
    function palette(theme) {
      var p = PALETTES[theme] || PALETTES.light;
      return { theme: PALETTES[theme] ? theme : 'light', bg: p.bg, grid: p.grid, axis: p.axis, label: p.label, muted: p.muted,
        curve: function (i) { var k = ((i % 6) + 6) % 6; return { color: p.curves[k], dash: DASHES[k].slice() }; } };
    }
    // A 1-2-5 tick step that keeps labels at least minPx apart.
    function niceStep(range, pixels, minPx) {
      if (!(range > 0) || !(pixels > 0)) return 1;
      var raw = range * (minPx || 40) / pixels, p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / p;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
    }
    // Describe / Hear / explore-with-keys controls. cfg: id, t, desc, points, index,
    // samples, sonify, open, onToggle, onIndex, onChange, announce, callTTS, styles.
    function panel(React, cfg) {
      cfg = cfg || {};
      var h = React.createElement, __alloT = tOf(cfg.t), id = String(cfg.id || 'graph-access'), st = cfg.styles || {};
      var desc = cfg.desc || { text: '', points: [] }, points = cfg.points || [];
      var idx = fin(cfg.index) && cfg.index >= 0 && cfg.index < points.length ? cfg.index : -1;
      var playing = isPlaying(id);
      function changed() { if (typeof cfg.onChange === 'function') cfg.onChange(); }
      function hear() {
        if (isPlaying(id)) { stop(); sayNow(__alloT('stem.graph_access.sound_stopped', 'Sound stopped.'), cfg.announce); changed(); return; }
        if (isMuted()) { sayNow(__alloT('stem.graph_access.sound_muted', 'Sound is muted. Turn sound on to hear the graph.'), cfg.announce); return; }
        var plan = sonifyPlan(cfg.samples || [], cfg.sonify || {});
        var hd = plan ? playPlan(plan, { key: id, onEnd: changed }) : null;
        if (!hd) { sayNow(__alloT('stem.graph_access.sound_unavailable', 'Sound is not available here.'), cfg.announce); return; }
        sayNow(fill(__alloT('stem.graph_access.sound_playing', 'Playing the graph from left to right in {s} seconds. Higher pitch means a greater y-value, a click marks each x-axis crossing, and silence marks a gap.'), { s: num(plan.duration) }), cfg.announce);
        changed();
      }
      function read() {
        if (isMuted()) { sayNow(__alloT('stem.graph_access.sound_muted', 'Sound is muted. Turn sound on to hear the graph.'), cfg.announce); return; }
        if (!speak(desc.text, cfg.callTTS)) sayNow(desc.text, cfg.announce);
      }
      var row = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' };
      return h('div', { 'data-graph-access': id, style: st.wrap },
        h('div', { style: row },
          h('button', { type: 'button', 'data-graph-access-describe': true, 'aria-expanded': !!cfg.open, 'aria-controls': id + '-text', onClick: cfg.onToggle, style: st.button }, __alloT('stem.graph_access.describe', 'Describe this graph')),
          h('button', { type: 'button', 'data-graph-access-hear': playing ? 'playing' : 'idle', onClick: hear, style: st.button }, playing ? __alloT('stem.graph_access.stop', 'Stop') : __alloT('stem.graph_access.hear', 'Hear this graph')),
          cfg.open ? h('button', { type: 'button', 'data-graph-access-read': true, onClick: read, style: st.button }, __alloT('stem.graph_access.read_aloud', 'Read aloud')) : null,
          cfg.extra || null),
        h('p', { id: id + '-text', 'data-graph-access-text': true, hidden: !cfg.open, style: Object.assign({ margin: '8px 0 0', lineHeight: 1.5 }, st.text, cfg.open ? null : { display: 'none' }) }, cfg.open ? desc.text : ''),
        h('div', { role: 'application', tabIndex: 0, 'data-graph-access-explore': true, 'aria-label': __alloT('stem.graph_access.explore_label', 'Explore the graph with keys'), 'aria-describedby': id + '-help',
          onKeyDown: function (e) { stepperKeyDown(e, { points: points, index: idx, t: cfg.t, announce: cfg.announce, onMove: cfg.onIndex }); }, style: Object.assign({ marginTop: 8 }, st.region) },
          h('span', { 'data-graph-access-point': true }, idx >= 0 ? pointText(points[idx], cfg.t) : __alloT('stem.graph_access.explore_start', 'Select this box, then press the Right arrow or Page Down to start.'))),
        h('p', { id: id + '-help', style: Object.assign({ margin: '4px 0 0' }, st.help) }, __alloT('stem.graph_access.explore_help', 'Left and Right arrows step along the curve. Page Down and Page Up jump to the next or previous key feature. Home and End go to the edges.')));
    }
    // ── v2 ── Root x-values from the shared scanner, snapped and kept apart the way analyse()
    // does, so chips, descriptions and sound list the same roots. xs is undefined when the
    // curve is zero at every sample (analyse then says it lies along the axis).
    function zerosOf(evaluate, xmin, xmax) {
      var scan = gcScanRoots(evaluate, xmin, xmax);
      if (scan.error) return { xs: [], scan: scan };
      if (scan.zeroThroughoutSamples) return { xs: undefined, scan: scan };
      var step = (xmax - xmin) / 200, tol = Math.max(1e-9, step * 1e-6), xs = [];
      scan.candidates.forEach(function (c) {
        var x = c.x, r = Math.round(x);
        if (Math.abs(x - r) < tol) x = r;
        if (x === 0) x = 0;
        if (!xs.some(function (o) { return Math.abs(o - x) <= Math.max(1e-10, step * 1e-6); })) xs.push(x);
      });
      return { xs: xs, scan: scan };
    }
    // Average rate of change between two points of one curve.
    function rateOfChange(evaluate, x1, x2) {
      if (typeof evaluate !== 'function' || !fin(x1) || !fin(x2) || x1 === x2) return null;
      var y1 = evalAt(evaluate, x1), y2 = evalAt(evaluate, x2), dy = y1 === null || y2 === null ? null : y2 - y1;
      return { x1: x1, y1: y1, x2: x2, y2: y2, dx: x2 - x1, dy: dy, rate: dy === null ? null : dy / (x2 - x1) };
    }
    // From x1 to x2 in n equal steps, with first differences and ratios.
    function rateSteps(evaluate, x1, x2, n) {
      var rows = [];
      n = fin(n) && n >= 2 ? Math.floor(n) : 4;
      if (typeof evaluate === 'function' && fin(x1) && fin(x2) && x1 !== x2) {
        for (var i = 0; i <= n; i++) { var x = i === n ? x2 : x1 + (x2 - x1) * i / n; rows.push({ x: Number(x.toPrecision(12)), y: evalAt(evaluate, x) }); }
      }
      return differencesTable(rows);
    }
    function sig(v) { if (!fin(v)) return '—'; var r = Number(v.toPrecision(4)); if (r === 0) r = 0; var s = String(r); return s.charAt(0) === '-' ? '−' + s.slice(1) : s; }
    function paren(v) { return fin(v) && v < 0 ? '(' + num(v) + ')' : num(v); }
    // Intervals: { lo, hi, loC, hiC }; an infinite end is always open.
    function iv(lo, hi, loC, hiC) { return { lo: lo, hi: hi, loC: !!loC && fin(lo), hiC: !!hiC && fin(hi) }; }
    function intervalText(list) {
      if (!Array.isArray(list) || !list.length) return '∅';
      return list.map(function (r) {
        if (r.lo === r.hi) return '{' + num(r.lo) + '}';
        return (r.lo === -Infinity ? '(−∞' : (r.loC ? '[' : '(') + num(r.lo)) + ', ' + (r.hi === Infinity ? '∞)' : num(r.hi) + (r.hiC ? ']' : ')'));
      }).join(' ∪ ');
    }
    var FAMILIES = ['linear', 'quadratic', 'cubic', 'trig', 'exponential', 'absolute', 'sqrt', 'log', 'rational'];
    // Exact features of Function Grapher's families, worked out from the rule (not from samples).
    function familyFeatures(type, a, b, c) {
      if (FAMILIES.indexOf(type) < 0 || ![a, b, c].every(fin)) return null;
      function f(x) { return familyValue(type, a, b, c, x); }
      function inf(s) { return s > 0 ? Infinity : -Infinity; }
      var ALL = [iv(-Infinity, Infinity)];
      var o = { exact: true, domain: ALL, range: ALL, inc: [], dec: [], flat: [], extrema: [], ends: [], vAsym: [], hAsym: [], levels: [], breaks: [], period: null };
      function constant(k, dom) {
        o.domain = dom || ALL; o.range = [iv(k, k, true, true)]; o.flat = o.domain;
        if (o.domain[0].lo === -Infinity) o.ends.push({ at: -Infinity, to: k });
        if (o.domain[o.domain.length - 1].hi === Infinity) o.ends.push({ at: Infinity, to: k });
        return o;
      }
      function line(m, q) {
        if (m === 0) return constant(q);
        (m > 0 ? o.inc : o.dec).push(iv(-Infinity, Infinity));
        o.ends.push({ at: -Infinity, to: inf(-m) }, { at: Infinity, to: inf(m) });
        return o;
      }
      if (type === 'linear') return line(a, b);
      if (type === 'quadratic' || type === 'cubic') {
        if (a === 0) return line(b, c);
        if (type === 'quadratic') {
          var xv = -b / (2 * a), yv = f(xv);
          o.range = [a > 0 ? iv(yv, Infinity, true) : iv(-Infinity, yv, false, true)];
          o.dec.push(a > 0 ? iv(-Infinity, xv) : iv(xv, Infinity));
          o.inc.push(a > 0 ? iv(xv, Infinity) : iv(-Infinity, xv));
          o.extrema.push({ x: xv, y: yv, kind: a > 0 ? 'min' : 'max', scope: 'absolute' });
          o.ends.push({ at: -Infinity, to: inf(a) }, { at: Infinity, to: inf(a) });
          return o;
        }
        o.ends.push({ at: -Infinity, to: inf(-a) }, { at: Infinity, to: inf(a) });
        if (b / a >= 0) { (a > 0 ? o.inc : o.dec).push(iv(-Infinity, Infinity)); return o; }
        var r = Math.sqrt(-b / (3 * a)), up = a > 0 ? o.inc : o.dec, down = a > 0 ? o.dec : o.inc;
        up.push(iv(-Infinity, -r), iv(r, Infinity)); down.push(iv(-r, r));
        o.extrema.push({ x: -r, y: f(-r), kind: a > 0 ? 'max' : 'min', scope: 'local' }, { x: r, y: f(r), kind: a > 0 ? 'min' : 'max', scope: 'local' });
        return o;
      }
      if (type === 'trig') {
        if (a === 0 || b === 0) return constant(f(0));
        var P = 2 * Math.PI / Math.abs(b), A = Math.abs(a);
        var rep = function (x) { x = ((x % P) + P) % P; return x > P / 2 + 1e-12 ? x - P : x; };
        var xMax = rep(((a > 0 ? 1 : -1) * Math.PI / 2 - c) / b), xMin = rep(xMax + P / 2);
        o.range = [iv(-A, A, true, true)];
        o.inc.push(iv(xMin, xMin + P / 2)); o.dec.push(iv(xMax, xMax + P / 2));
        o.extrema.push({ x: xMax, y: A, kind: 'max', scope: 'periodic' }, { x: xMin, y: -A, kind: 'min', scope: 'periodic' });
        o.period = { p: P, amp: A, mid: 0 };
        o.ends.push({ at: -Infinity, to: 'osc' }, { at: Infinity, to: 'osc' });
        return o;
      }
      if (type === 'exponential') {
        if (a === 0 || b === 0) return constant(f(0));
        o.range = [a > 0 ? iv(c, Infinity) : iv(-Infinity, c)];
        (a * b > 0 ? o.inc : o.dec).push(iv(-Infinity, Infinity));
        o.hAsym.push(c);
        if (b > 0) o.ends.push({ at: -Infinity, to: c }, { at: Infinity, to: inf(a) });
        else o.ends.push({ at: -Infinity, to: inf(a) }, { at: Infinity, to: c });
        return o;
      }
      if (type === 'absolute') {
        if (a === 0) return constant(c);
        o.range = [a > 0 ? iv(c, Infinity, true) : iv(-Infinity, c, false, true)];
        (a > 0 ? o.dec : o.inc).push(iv(-Infinity, -b)); (a > 0 ? o.inc : o.dec).push(iv(-b, Infinity));
        o.extrema.push({ x: -b, y: c, kind: a > 0 ? 'min' : 'max', scope: 'absolute' });
        o.ends.push({ at: -Infinity, to: inf(a) }, { at: Infinity, to: inf(a) });
        return o;
      }
      if (type === 'sqrt') {
        var sdom = [iv(-b, Infinity, true)];
        if (a === 0) return constant(c, sdom);
        o.domain = sdom; o.range = [a > 0 ? iv(c, Infinity, true) : iv(-Infinity, c, false, true)];
        (a > 0 ? o.inc : o.dec).push(iv(-b, Infinity));
        o.extrema.push({ x: -b, y: c, kind: a > 0 ? 'min' : 'max', scope: 'endpoint' });
        o.ends.push({ at: Infinity, to: inf(a) });
        return o;
      }
      if (type === 'log') {
        var ldom = [iv(-b, Infinity)];
        if (a === 0) return constant(c, ldom);
        o.domain = ldom; (a > 0 ? o.inc : o.dec).push(iv(-b, Infinity)); o.vAsym.push(-b);
        o.ends.push({ at: -b, side: 'right', to: inf(-a) }, { at: Infinity, to: inf(a) });
        return o;
      }
      var rdom = [iv(-Infinity, -b), iv(-b, Infinity)];
      if (a === 0) return constant(c, rdom);
      o.domain = rdom; o.range = [iv(-Infinity, c), iv(c, Infinity)];
      (a > 0 ? o.dec : o.inc).push(iv(-Infinity, -b), iv(-b, Infinity));
      o.vAsym.push(-b); o.hAsym.push(c);
      o.ends.push({ at: -Infinity, to: c }, { at: -b, side: 'left', to: inf(-a) }, { at: -b, side: 'right', to: inf(a) }, { at: Infinity, to: c });
      return o;
    }
    // Features read from one window's samples, for a rule with no family model.
    function windowFeatures(f, evaluate) {
      var o = { exact: false, domain: [], range: [], inc: [], dec: [], flat: [], extrema: [], ends: [], vAsym: [], hAsym: [], levels: [], breaks: [], period: null, window: f ? [f.xmin, f.xmax] : [0, 0] };
      if (!f || !f.defined) return o;
      var ev = typeof evaluate === 'function' ? evaluate : null, span = fin(f.ymax) && fin(f.ymin) && f.ymax > f.ymin ? f.ymax - f.ymin : 1;
      // A value too large to plot at a break is a pole, not a point of the graph.
      function at(x) { if (!ev) return true; var v = evalAt(ev, x); return v !== null && Math.abs(v) < span * 1e6; }
      var lo = f.xmin, loC = true;
      f.gaps.forEach(function (g) {
        if (lo === null) return;
        if (g.kind === 'left') { lo = g.x; loC = at(g.x); }
        else if (g.kind === 'break') { o.breaks.push(g.x); if (at(g.x)) return; o.domain.push(iv(lo, g.x, loC, false)); lo = g.x; loC = false; }
        else if (g.kind === 'missing') { o.domain.push(iv(lo, g.from, loC, at(g.from))); lo = g.to; loC = at(g.to); }
        else { o.domain.push(iv(lo, g.x, loC, at(g.x))); lo = null; }
      });
      if (lo !== null) o.domain.push(iv(lo, f.xmax, loC, true));
      f.runs.map(function (run) {
        var ys = run.map(function (p) { return p.y; });
        f.extrema.forEach(function (e) { if (e.x >= run[0].x && e.x <= run[run.length - 1].x) ys.push(e.y); });
        return [Math.min.apply(null, ys), Math.max.apply(null, ys)];
      }).sort(function (p, q) { return p[0] - q[0]; }).forEach(function (s) {
        var last = o.range[o.range.length - 1];
        if (last && s[0] <= last.hi) last.hi = Math.max(last.hi, s[1]); else o.range.push(iv(s[0], s[1], true, true));
      });
      f.intervals.forEach(function (r) { (r.dir === 'increasing' ? o.inc : r.dir === 'decreasing' ? o.dec : o.flat).push(iv(r.from, r.to)); });
      o.extrema = f.extrema.map(function (e) { return { x: e.x, y: e.y, kind: e.kind, scope: 'local' }; });
      if (f.ends.left) o.ends.push({ at: 'left', trend: f.ends.left });
      if (f.ends.right) o.ends.push({ at: 'right', trend: f.ends.right });
      [f.ends.left, f.ends.right].forEach(function (e) { if (e && e.trend === 'levels' && o.levels.indexOf(e.y) < 0) o.levels.push(e.y); });
      return o;
    }
    // Plain-language rows for the features panel (interval notation for sets).
    function featureRows(o, t) {
      var __alloT = tOf(t);
      if (!o) return [];
      var none = __alloT('stem.graph_access.kf_none', 'none'), nowhere = __alloT('stem.graph_access.kf_nowhere', 'nowhere');
      var every = o.period ? ' ' + fill(__alloT('stem.graph_access.kf_every', '(and again every {p} units along x)'), { p: num(o.period.p) }) : '';
      function ext(e) {
        var s = e.scope === 'absolute' ? (e.kind === 'max' ? __alloT('stem.graph_access.kf_abs_max', 'an absolute maximum at ({x}, {y})') : __alloT('stem.graph_access.kf_abs_min', 'an absolute minimum at ({x}, {y})'))
          : e.scope === 'endpoint' ? (e.kind === 'max' ? __alloT('stem.graph_access.kf_end_max', 'a maximum at the endpoint ({x}, {y})') : __alloT('stem.graph_access.kf_end_min', 'a minimum at the endpoint ({x}, {y})'))
          : e.scope === 'periodic' ? (e.kind === 'max' ? __alloT('stem.graph_access.kf_wave_max', 'maximum value {y} at x = {x}') : __alloT('stem.graph_access.kf_wave_min', 'minimum value {y} at x = {x}'))
          : (e.kind === 'max' ? __alloT('stem.graph_access.turn_max', 'a local maximum at ({x}, {y})') : __alloT('stem.graph_access.turn_min', 'a local minimum at ({x}, {y})'));
        return fill(s, { x: num(e.x), y: num(e.y) });
      }
      function inft(v) { return v === Infinity ? '∞' : v === -Infinity ? '−∞' : num(v); }
      function endText(e) {
        if (e.at === 'left' || e.at === 'right') return fill(e.at === 'left' ? __alloT('stem.graph_access.end_left', 'As x moves left, y {trend}.') : __alloT('stem.graph_access.end_right', 'As x moves right, y {trend}.'), { trend: trendWords(e.trend, __alloT) });
        if (e.to === 'osc') return fill(__alloT('stem.graph_access.kf_end_osc', 'As x → {at}, y keeps rising and falling between {lo} and {hi}.'), { at: inft(e.at), lo: num(o.range[0].lo), hi: num(o.range[0].hi) });
        return fill(__alloT('stem.graph_access.kf_end_to', 'As x → {at}, y → {to}.'), { at: inft(e.at) + (e.side === 'left' ? '⁻' : e.side === 'right' ? '⁺' : ''), to: inft(e.to) });
      }
      var asym = [];
      if (o.vAsym.length) asym.push(fill(__alloT('stem.graph_access.kf_vasym', 'vertical: x = {list}'), { list: o.vAsym.map(num).join(', ') }));
      if (o.hAsym.length) asym.push(fill(__alloT('stem.graph_access.kf_hasym', 'horizontal: y = {list}'), { list: o.hAsym.map(num).join(', ') }));
      if (o.breaks.length) asym.push(fill(__alloT('stem.graph_access.kf_breaks', 'the graph breaks at x = {list}: check for a vertical asymptote or a jump'), { list: o.breaks.map(num).join(', ') }));
      if (o.levels.length) asym.push(fill(__alloT('stem.graph_access.kf_levels', 'it levels off near y = {list} at a window edge'), { list: o.levels.map(num).join(', ') }));
      var rows = [
        { id: 'domain', label: __alloT('stem.graph_access.kf_domain', 'Domain'), value: intervalText(o.domain) },
        { id: 'range', label: __alloT('stem.graph_access.kf_range', 'Range'), value: intervalText(o.range) },
        { id: 'inc', label: __alloT('stem.graph_access.kf_increasing', 'Increasing on'), value: o.inc.length ? intervalText(o.inc) + every : nowhere },
        { id: 'dec', label: __alloT('stem.graph_access.kf_decreasing', 'Decreasing on'), value: o.dec.length ? intervalText(o.dec) + every : nowhere }
      ];
      if (o.flat.length) rows.push({ id: 'flat', label: __alloT('stem.graph_access.kf_constant', 'Constant on'), value: intervalText(o.flat) });
      return rows.concat([
        { id: 'ext', label: __alloT('stem.graph_access.kf_extrema', 'Turning points and extreme values'), value: o.extrema.length ? listOf(o.extrema.map(ext), __alloT) + every : none },
        { id: 'ends', label: __alloT('stem.graph_access.kf_ends', 'End behaviour'), value: o.ends.length ? o.ends.map(endText).join(' ') : none },
        { id: 'asym', label: __alloT('stem.graph_access.kf_asymptotes', 'Asymptotes and breaks'), value: asym.length ? asym.join('; ') : none }
      ]);
    }
    function polyText(terms) {
      var s = '';
      terms.forEach(function (tm) {
        var v = tm[0], body = tm[1];
        if (!v) return;
        var part = body ? (Math.abs(v) === 1 ? body : num(Math.abs(v)) + body) : num(Math.abs(v));
        s += s ? (v < 0 ? ' − ' : ' + ') + part : (v < 0 ? '−' : '') + part;
      });
      return s || '0';
    }
    function factorText(r) { return r === 0 ? 'x' : '(x ' + (r > 0 ? '− ' : '+ ') + num(Math.abs(r)) + ')'; }
    // Three examples per skill; every number in a step comes from evaluating the example.
    function workedSet(kind, t) {
      var __alloT = tOf(t);
      if (kind === 'yint') {
        return [
          { f: function (x) { return 2 * x * x - 3 * x + 5; }, eq: polyText([[2, 'x²'], [-3, 'x'], [5, '']]), sub: '2(0)² − 3(0) + 5', work: '0 − 0 + 5' },
          { f: function (x) { return -x * x * x + 4 * x - 1; }, eq: polyText([[-1, 'x³'], [4, 'x'], [-1, '']]), sub: '−(0)³ + 4(0) − 1', work: '0 + 0 − 1' },
          { f: function (x) { return 3 * Math.pow(2, x) + 1; }, eq: '3·2^x + 1', sub: '3·2^0 + 1', work: '3·1 + 1' }
        ].map(function (ex) {
          var y = evalAt(ex.f, 0);
          return { problem: fill(__alloT('stem.graph_access.we_y_problem', 'Find the y-intercept of f(x) = {eq}.'), { eq: ex.eq }), answer: '(0, ' + num(y) + ')', steps: [
            __alloT('stem.graph_access.we_y_where', 'The y-intercept is where the graph crosses the y-axis, where x = 0.'),
            fill(__alloT('stem.graph_access.we_y_sub', 'Substitute x = 0: f(0) = {expr}.'), { expr: ex.sub }),
            fill(__alloT('stem.graph_access.we_y_work', 'Work it out: {work} = {y}.'), { work: ex.work, y: num(y) }),
            fill(__alloT('stem.graph_access.we_y_point', 'So the graph crosses the y-axis at (0, {y}).'), { y: num(y) })] };
        });
      }
      if (kind === 'transform') {
        return [{ a: 1, h: 2, k: -1 }, { a: -2, h: -1, k: 3 }, { a: 0.5, h: 3, k: 2 }].map(function (p) {
          var f = function (x) { return p.a * (x - p.h) * (x - p.h) + p.k; };
          var eq = 'y = ' + (p.a === 1 ? '' : p.a === -1 ? '−' : num(p.a)) + factorText(p.h) + '²' + (p.k ? (p.k > 0 ? ' + ' : ' − ') + num(Math.abs(p.k)) : '');
          var fx = [];
          if (p.a < 0) fx.push(__alloT('stem.graph_access.we_a_flip', 'flipped over the x-axis'));
          if (Math.abs(p.a) > 1) fx.push(__alloT('stem.graph_access.we_a_stretch', 'stretched vertically (narrower)'));
          if (Math.abs(p.a) < 1) fx.push(__alloT('stem.graph_access.we_a_compress', 'compressed vertically (wider)'));
          var effect = fx.length ? listOf(fx, __alloT) : __alloT('stem.graph_access.we_a_same', 'the same shape as y = x²');
          return { problem: fill(__alloT('stem.graph_access.we_t_problem', 'How is {eq} moved from the parent y = x²?'), { eq: eq }), answer: '(' + num(p.h) + ', ' + num(p.k) + ')', steps: [
            fill(__alloT('stem.graph_access.we_t_form', 'Match it to y = a(x − h)² + k: {eq} has a = {a}, h = {h}, k = {k}.'), { eq: eq, a: num(p.a), h: num(p.h), k: num(p.k) }),
            fill(__alloT('stem.graph_access.we_t_h', 'Inside the square, h = {h}: the graph moves {dir} {n} units.'), { h: num(p.h), n: num(Math.abs(p.h)), dir: p.h > 0 ? __alloT('stem.graph_access.we_right', 'right') : __alloT('stem.graph_access.we_left', 'left') }),
            fill(__alloT('stem.graph_access.we_t_k', 'Outside, k = {k}: the graph moves {dir} {n} units.'), { k: num(p.k), n: num(Math.abs(p.k)), dir: p.k > 0 ? __alloT('stem.graph_access.we_up', 'up') : __alloT('stem.graph_access.we_down', 'down') }),
            fill(__alloT('stem.graph_access.we_t_a', 'The factor a = {a}: the parabola is {effect}.'), { a: num(p.a), effect: effect }),
            fill(__alloT('stem.graph_access.we_t_vertex', 'The vertex moves from (0, 0) to ({h}, {k}). Check: f({h}) = {y}.'), { h: num(p.h), k: num(p.k), y: num(evalAt(f, p.h)) })] };
        });
      }
      if (kind === 'rate') {
        return [
          { f: function (x) { return x * x; }, eq: 'x²', x1: 1, x2: 3 },
          { f: function (x) { return 3 * x - 1; }, eq: '3x − 1', x1: -1, x2: 2 },
          { f: function (x) { return Math.pow(2, x); }, eq: '2^x', x1: 0, x2: 3 }
        ].map(function (ex) {
          var r = rateOfChange(ex.f, ex.x1, ex.x2);
          return { problem: fill(__alloT('stem.graph_access.we_r_problem', 'Find the average rate of change of f(x) = {eq} from x = {x1} to x = {x2}.'), { eq: ex.eq, x1: num(ex.x1), x2: num(ex.x2) }), answer: num(r.rate), steps: [
            fill(__alloT('stem.graph_access.we_r_def', 'Average rate of change = (f({x2}) − f({x1})) ÷ ({x2} − {x1}).'), { x1: paren(ex.x1), x2: num(ex.x2) }),
            fill(__alloT('stem.graph_access.we_r_values', 'Evaluate: f({x1}) = {y1} and f({x2}) = {y2}.'), { x1: num(r.x1), y1: num(r.y1), x2: num(r.x2), y2: num(r.y2) }),
            fill(__alloT('stem.graph_access.we_r_diff', 'Δy = {y2} − {y1} = {dy} and Δx = {x2} − {x1} = {dx}.'), { y2: num(r.y2), y1: paren(r.y1), dy: num(r.dy), x2: num(r.x2), x1: paren(r.x1), dx: num(r.dx) }),
            fill(__alloT('stem.graph_access.we_r_rate', 'Rate = {dy} ÷ {dx} = {rate}: on average, y changes by {rate} for each 1 added to x.'), { dy: num(r.dy), dx: num(r.dx), rate: num(r.rate) })] };
        });
      }
      return [[-2, 3], [-4, 2], [1, 5]].map(function (pr) {
        var B = -(pr[0] + pr[1]), C = pr[0] * pr[1], f = function (x) { return x * x + B * x + C; };
        var eq = polyText([[1, 'x²'], [B, 'x'], [C, '']]), xs = zerosOf(f, -10, 10).xs || [];
        return { problem: fill(__alloT('stem.graph_access.we_z_problem', 'Find the zeros of f(x) = {eq}.'), { eq: eq }), answer: xs.map(num).join(', '), steps: [
          fill(__alloT('stem.graph_access.we_z_set', 'Set f(x) = 0: {eq} = 0.'), { eq: eq }),
          fill(__alloT('stem.graph_access.we_z_pair', 'Find two numbers that multiply to {c} and add to {b}: {p} and {q}.'), { c: num(C), b: num(B), p: num(-pr[0]), q: num(-pr[1]) }),
          fill(__alloT('stem.graph_access.we_z_factor', 'Factor: {factored} = 0.'), { factored: factorText(pr[0]) + factorText(pr[1]) }),
          fill(__alloT('stem.graph_access.we_z_solve', 'A product is 0 only when a factor is 0, so x = {r1} or x = {r2}.'), { r1: num(pr[0]), r2: num(pr[1]) }),
          fill(__alloT('stem.graph_access.we_z_check', 'Check on the graph: it meets the x-axis at x = {list}.'), { list: listOf(xs.map(num), __alloT) })] };
      });
    }
    // Teacher exports: CSV rows, a file download, and printing through a new window that holds
    // the content (window.print() on the tool's own page is ignored in Gemini Canvas).
    function csvText(rows) {
      return rows.map(function (r) { return r.map(function (v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\n');
    }
    function downloadText(name, text, mime) {
      try {
        var url = URL.createObjectURL(new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' })), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        return true;
      } catch (e) { return false; }
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function printReport(title, rows, extra) {
      var w = null;
      try { w = window.open('', '_blank'); } catch (e) { w = null; }
      if (!w || !w.document) return false;
      w.document.open();
      w.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>body{font-family:system-ui,sans-serif;margin:24px;color:#0f172a;background:#fff}table{border-collapse:collapse}th,td{border:1px solid #64748b;padding:4px 8px;text-align:left}pre{white-space:pre-wrap}</style></head><body><h1>' + esc(title) + '</h1><table><tbody>' +
        rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' + (extra ? '<pre>' + esc(extra) + '</pre>' : '') + '<script>window.onload=function(){window.print();};<\/script></body></html>');
      w.document.close();
      return true;
    }
    // Nudge, strategy, worked step, answer: one more each press.
    function hintLadder(React, cfg) {
      cfg = cfg || {};
      var h = React.createElement, __alloT = tOf(cfg.t), st = cfg.styles || {}, steps = Array.isArray(cfg.steps) ? cfg.steps : [], id = String(cfg.id || 'hints');
      if (!steps.length) return null;
      var lv = fin(cfg.level) ? Math.max(0, Math.min(steps.length, Math.floor(cfg.level))) : 0;
      var names = [__alloT('stem.graph_access.hint_nudge', 'Nudge'), __alloT('stem.graph_access.hint_strategy', 'Strategy'), __alloT('stem.graph_access.hint_worked', 'Worked step'), __alloT('stem.graph_access.hint_answer', 'Answer')];
      function more() {
        var next = Math.min(steps.length, lv + 1);
        if (typeof cfg.onLevel === 'function') cfg.onLevel(next);
        sayNow((names[next - 1] || '') + ': ' + steps[next - 1], cfg.announce);
      }
      return h('div', { 'data-hint-ladder': id, 'data-hint-level': lv, style: Object.assign({ marginTop: 8 }, st.card) },
        h('p', { style: Object.assign({ margin: 0, fontWeight: 700 }, st.text) }, __alloT('stem.graph_access.hint_title', 'Hints')),
        lv ? h('ol', { style: Object.assign({ margin: '6px 0', paddingLeft: 22 }, st.text) }, steps.slice(0, lv).map(function (s, i) { return h('li', { key: i, 'data-hint-step': i + 1, style: { marginTop: 4 } }, h('strong', null, (names[i] || '') + ': '), s); })) : null,
        lv < steps.length ? h('button', { type: 'button', 'data-hint-next': lv + 1, onClick: more, style: Object.assign({ marginTop: 6 }, st.button) },
          lv === steps.length - 1 ? __alloT('stem.graph_access.hint_show_answer', 'Show the answer') : lv ? fill(__alloT('stem.graph_access.hint_more', 'Next hint ({n} of {m})'), { n: lv + 1, m: steps.length }) : __alloT('stem.graph_access.hint_next', 'Show a hint')) : null,
        cfg.noXpNote && lv >= steps.length - 1 ? h('p', { style: Object.assign({ margin: '6px 0 0' }, st.help) }, __alloT('stem.graph_access.hint_answer_note', 'Once the answer is shown, this question earns no XP.')) : null);
    }
    // Two points on the curve, a predict-then-check on the direction, a calculation the
    // student can check, a hint ladder, and equal steps that contrast Δy with ratios.
    // cfg: id, t, evaluate, name, key, x1, x2, min, max, step, state, onSet, onCorrect, announce, styles.
    function ratePanel(React, cfg) {
      cfg = cfg || {};
      var h = React.createElement, __alloT = tOf(cfg.t), st = cfg.styles || {}, id = String(cfg.id || 'rate'), s = cfg.state || {}, key = String(cfg.key || '');
      function set(patch) { if (typeof cfg.onSet === 'function') cfg.onSet(patch); }
      var r = rateOfChange(cfg.evaluate, cfg.x1, cfg.x2);
      var pred = s.pred && s.pred.key === key ? s.pred.choice : '', shown = s.shown === key, hint = s.hint && s.hint.key === key && fin(s.hint.level) ? s.hint.level : 0;
      var check = s.check && s.check.key === key ? s.check : null, guess = s.guess && s.guess.key === key && typeof s.guess.text === 'string' ? s.guess.text : '';
      var dir = !r || r.dy === null ? '' : Math.abs(r.dy) <= 1e-12 * Math.max(1, Math.abs(r.y1)) ? 'flat' : r.dy > 0 ? 'up' : 'down';
      var line = Object.assign({ margin: '6px 0 0' }, st.text);
      var dirSay = { up: __alloT('stem.graph_access.roc_dir_up', 'Δy is positive, so y goes up from A to B'), down: __alloT('stem.graph_access.roc_dir_down', 'Δy is negative, so y goes down from A to B'), flat: __alloT('stem.graph_access.roc_dir_flat', 'Δy is 0, so y stays the same from A to B') };
      function verdict(choice) {
        if (!dir) return '';
        if (choice === 'unsure') return fill(__alloT('stem.graph_access.roc_look', 'Now look: {dir}.'), { dir: dirSay[dir] });
        return fill(choice === dir ? __alloT('stem.graph_access.roc_match', 'Your prediction matched: {dir}.') : __alloT('stem.graph_access.roc_miss', 'Not what you predicted: {dir}.'), { dir: dirSay[dir] });
      }
      function slider(which, label) {
        var x = which === 'x1' ? cfg.x1 : cfg.x2, vt = pointText({ x: x, y: evalAt(cfg.evaluate, x) }, cfg.t);
        return h('label', { style: Object.assign({ display: 'block', marginTop: 8, fontWeight: 700 }, st.text) }, label + ': ' + vt,
          h('input', { type: 'range', 'data-rate-slider': which, min: cfg.min, max: cfg.max, step: cfg.step, value: x, 'aria-valuetext': vt,
            onChange: function (e) { var v = Number(e.target.value), p = {}; if (fin(v)) { p[which] = v; set(p); } }, style: { display: 'block', width: '100%', minHeight: 28, margin: '4px 0 0' } }));
      }
      function parseGuess(text) {
        var m = /^\s*([−-])?\s*(\d+(?:\.\d*)?|\.\d+)\s*(?:\/\s*(\d+(?:\.\d*)?))?\s*$/.exec(String(text));
        if (!m) return NaN;
        var v = Number(m[2]) / (m[3] ? Number(m[3]) : 1);
        return m[1] ? -v : v;
      }
      function doCheck() {
        if (!r || r.rate === null) return;
        var g = parseGuess(guess), ok = fin(g) && Math.abs(g - r.rate) <= 0.01 + 1e-9 * Math.abs(r.rate);
        set({ check: { key: key, ok: ok } });
        sayNow(ok ? fill(__alloT('stem.graph_access.roc_correct', 'Correct: the average rate of change is {rate}.'), { rate: num(r.rate) }) : __alloT('stem.graph_access.roc_wrong', 'Not yet. Find Δy and Δx, then divide Δy by Δx.'), cfg.announce);
        if (ok && !shown && hint < 4 && typeof cfg.onCorrect === 'function') cfg.onCorrect(key);
      }
      var steps = r && r.dy !== null ? [
        __alloT('stem.graph_access.hint_rate_nudge', 'Average rate of change compares how much y changes with how much x changes.'),
        __alloT('stem.graph_access.hint_rate_strategy', 'Subtract the y-values to get Δy, subtract the x-values in the same order to get Δx, then divide Δy by Δx.'),
        fill(__alloT('stem.graph_access.we_r_diff', 'Δy = {y2} − {y1} = {dy} and Δx = {x2} − {x1} = {dx}.'), { y2: num(r.y2), y1: paren(r.y1), dy: num(r.dy), x2: num(r.x2), x1: paren(r.x1), dx: num(r.dx) }),
        fill(__alloT('stem.graph_access.hint_rate_answer', 'Δy ÷ Δx = {dy} ÷ {dx} = {rate}.'), { dy: num(r.dy), dx: paren(r.dx), rate: num(r.rate) })
      ] : [];
      var table = s.stepsOpen ? rateSteps(cfg.evaluate, cfg.x1, cfg.x2, 4) : null, cell = { padding: '2px 8px', textAlign: 'right' };
      var note = !table ? '' : table.pattern === 'linear' ? __alloT('stem.graph_access.roc_linear_note', 'Equal steps add the same Δy, so the average rate is the same between any two points: a linear function.')
        : table.pattern === 'exponential' ? __alloT('stem.graph_access.roc_exp_note', 'Equal steps multiply y by the same ratio, so Δy keeps changing and the average rate depends on where you look: an exponential function.')
        : table.pattern === 'constant' || table.pattern === 'short' || table.pattern === 'unequal' ? '' : __alloT('stem.graph_access.roc_other_note', 'The Δy values change from step to step, so the average rate depends on which two points you choose.');
      return h('section', { 'data-rate-panel': id, 'aria-labelledby': id + '-title', style: st.wrap },
        h('h3', { id: id + '-title', style: Object.assign({ margin: 0, fontSize: 16, fontWeight: 800 }, st.text) }, __alloT('stem.graph_access.roc_title', 'Average rate of change')),
        h('p', { style: line }, fill(__alloT('stem.graph_access.roc_intro', 'Choose two points on {name}: drag A and B on the graph, or use these sliders.'), { name: cfg.name || 'f(x)' })),
        slider('x1', __alloT('stem.graph_access.roc_point_a', 'Point A')),
        slider('x2', __alloT('stem.graph_access.roc_point_b', 'Point B')),
        !r ? h('p', { role: 'status', style: line }, __alloT('stem.graph_access.roc_same', 'Choose two different x-values.'))
        : r.dy === null ? h('p', { role: 'status', style: line }, __alloT('stem.graph_access.roc_undefined', 'The curve is undefined at A or at B. Move that point onto the curve.'))
        : h('div', null,
          h('fieldset', { 'data-rate-predict': true, style: Object.assign({ borderRadius: 8, padding: '6px 8px', margin: '8px 0 0', minWidth: 0 }, st.card) },
            h('legend', { style: Object.assign({ fontWeight: 700, padding: '0 4px' }, st.text) }, __alloT('stem.graph_access.roc_predict_q', 'Predict first: from A to B, does y go up, go down, or stay the same?')),
            [['up', __alloT('stem.graph_access.roc_up', 'Goes up')], ['down', __alloT('stem.graph_access.roc_down', 'Goes down')], ['flat', __alloT('stem.graph_access.roc_flat', 'Stays the same')], ['unsure', __alloT('stem.graph_access.roc_unsure', 'Not sure yet')]].map(function (o) {
              return h('label', { key: o[0], style: Object.assign({ display: 'flex', alignItems: 'center', gap: 6, minHeight: 32 }, st.text) },
                h('input', { type: 'radio', name: id + '-pred', value: o[0], checked: pred === o[0], onChange: function () { set({ pred: { key: key, choice: o[0] } }); sayNow(verdict(o[0]), cfg.announce); }, style: { width: 18, height: 18, margin: 0, flexShrink: 0 } }), o[1]);
            })),
          pred ? h('p', { 'data-rate-pred-result': pred === 'unsure' ? 'unsure' : pred === dir ? 'match' : 'miss', style: line }, verdict(pred)) : null,
          pred ? h('div', null,
            h('label', { style: Object.assign({ display: 'block', marginTop: 8, fontWeight: 700 }, st.text) }, __alloT('stem.graph_access.roc_try', 'Calculate the average rate of change from A to B'),
              h('input', { type: 'text', inputMode: 'decimal', 'data-rate-guess': true, value: guess, onChange: function (e) { set({ guess: { key: key, text: e.target.value.slice(0, 40) } }); }, onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); doCheck(); } }, style: Object.assign({ display: 'block', width: '100%', maxWidth: 220, minHeight: 36, marginTop: 4 }, st.input) })),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 } },
              h('button', { type: 'button', 'data-rate-check': true, onClick: doCheck, style: st.button }, __alloT('stem.graph_access.roc_check', 'Check my rate')),
              h('button', { type: 'button', 'data-rate-show': true, 'aria-expanded': shown, onClick: function () { set({ shown: shown ? '' : key }); }, style: st.button }, shown ? __alloT('stem.graph_access.roc_hide', 'Hide the calculation') : __alloT('stem.graph_access.roc_show', 'Show the calculation'))),
            check ? h('p', { role: 'status', 'data-rate-check-result': check.ok ? 'correct' : 'wrong', style: line }, check.ok ? fill(__alloT('stem.graph_access.roc_correct', 'Correct: the average rate of change is {rate}.'), { rate: num(r.rate) }) : __alloT('stem.graph_access.roc_wrong', 'Not yet. Find Δy and Δx, then divide Δy by Δx.')) : null,
            shown ? h('p', { 'data-rate-result': true, style: line }, fill(__alloT('stem.graph_access.roc_result', 'Δy = {dy} and Δx = {dx}, so the average rate of change is Δy ÷ Δx = {rate}.'), { dy: num(r.dy), dx: num(r.dx), rate: num(r.rate) })) : null,
            hintLadder(React, { id: id + '-hints', t: cfg.t, steps: steps, level: hint, onLevel: function (n) { set({ hint: { key: key, level: n } }); }, announce: cfg.announce, styles: st, noXpNote: true })) : null,
          h('button', { type: 'button', 'data-rate-steps': true, 'aria-expanded': !!s.stepsOpen, onClick: function () { set({ stepsOpen: !s.stepsOpen }); }, style: Object.assign({ marginTop: 8 }, st.button) }, __alloT('stem.graph_access.roc_steps', 'Compare equal steps from A to B')),
          table ? h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.graph_access.roc_steps_caption', 'A to B in four equal steps'), style: { overflowX: 'auto', marginTop: 6 } },
            h('table', { 'data-rate-steps-table': true, style: Object.assign({ borderCollapse: 'collapse', fontFamily: 'monospace' }, st.text) },
              h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, __alloT('stem.graph_access.roc_steps_caption', 'A to B in four equal steps')),
              h('thead', null, h('tr', null, ['x', 'y', 'Δy', __alloT('stem.graph_access.roc_ratio', 'ratio')].map(function (c) { return h('th', { key: c, scope: 'col', style: cell }, c); }))),
              h('tbody', null, table.rows.map(function (row, i) { return h('tr', { key: i }, [row.x, row.y, row.dy, row.ratio].map(function (v, j) { return h('td', { key: j, style: cell }, sig(v)); })); })))) : null,
          table ? h('p', { 'data-rate-steps-summary': table.pattern, style: line }, differencesSummary(table, cfg.t) + (note ? ' ' + note : '')) : null));
    }
    // Domain, range and key features, each predicted first and then revealed.
    // cfg: id, t, info (familyFeatures or windowFeatures), key, state, onSet, announce, styles.
    function featuresPanel(React, cfg) {
      cfg = cfg || {};
      var h = React.createElement, __alloT = tOf(cfg.t), st = cfg.styles || {}, id = String(cfg.id || 'features'), s = cfg.state || {}, key = String(cfg.key || ''), info = cfg.info;
      var rows = featureRows(info, cfg.t), same = s.key === key;
      var shown = same && s.revealed && typeof s.revealed === 'object' ? s.revealed : {}, preds = same && s.preds && typeof s.preds === 'object' ? s.preds : {};
      function save(revealed, p) { if (typeof cfg.onSet === 'function') cfg.onSet({ key: key, revealed: revealed, preds: p }); }
      var line = Object.assign({ margin: '6px 0 0' }, st.text);
      var note = !info ? '' : info.exact ? __alloT('stem.graph_access.kf_exact', 'Exact: worked out from the rule of the function, not read off the picture.')
        : fill(__alloT('stem.graph_access.kf_window', 'Estimated from samples between x = {x0} and x = {x1}: only what this window shows, not the whole function.'), { x0: num(info.window[0]), x1: num(info.window[1]) });
      return h('section', { 'data-features-panel': id, 'aria-labelledby': id + '-title', style: st.wrap },
        h('h3', { id: id + '-title', style: Object.assign({ margin: 0, fontSize: 16, fontWeight: 800 }, st.text) }, __alloT('stem.graph_access.kf_title', 'Domain, range and key features')),
        h('p', { style: line }, __alloT('stem.graph_access.kf_intro', 'Predict each feature, then reveal it and compare. Interval notation: [ ] includes an endpoint, ( ) leaves it out, ∪ joins pieces.')),
        note ? h('p', { 'data-features-source': info.exact ? 'exact' : 'window', style: line }, note) : null,
        !rows.length ? h('p', { style: line }, __alloT('stem.graph_access.kf_empty', 'Enter a function to see its features.')) : null,
        rows.map(function (row) {
          var open = !!shown[row.id], pid = id + '-pred-' + row.id, mine = typeof preds[row.id] === 'string' ? preds[row.id] : '';
          return h('div', { key: row.id, 'data-features-row': row.id, style: Object.assign({ marginTop: 8, padding: 8, borderRadius: 8 }, st.card) },
            h('label', { htmlFor: pid, style: Object.assign({ display: 'block', fontWeight: 700 }, st.text) }, row.label),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 4 } },
              h('input', { id: pid, type: 'text', value: mine, 'aria-describedby': open ? id + '-ans-' + row.id : undefined, onChange: function (e) { var p = Object.assign({}, preds); p[row.id] = e.target.value.slice(0, 200); save(shown, p); }, style: Object.assign({ flex: '1 1 140px', minWidth: 0, minHeight: 36 }, st.input) }),
              h('button', { type: 'button', 'data-features-reveal': row.id, 'aria-expanded': open, 'aria-controls': id + '-ans-' + row.id, onClick: function () { var r = Object.assign({}, shown); r[row.id] = !open; save(r, preds); if (!open) sayNow(row.label + ': ' + row.value, cfg.announce); }, style: st.button },
                open ? __alloT('stem.graph_access.kf_hide', 'Hide') : __alloT('stem.graph_access.kf_reveal', 'Reveal'))),
            h('p', { id: id + '-ans-' + row.id, 'data-features-answer': row.id, hidden: !open, style: Object.assign({}, line, open ? null : { display: 'none' }) },
              open ? row.value + (mine.trim() ? ' ' + fill(__alloT('stem.graph_access.kf_yours', '(You predicted: {v})'), { v: mine.trim() }) : '') : ''));
        }),
        rows.length ? h('button', { type: 'button', 'data-features-reveal-all': true, onClick: function () { var r = {}; rows.forEach(function (row) { r[row.id] = true; }); save(r, preds); }, style: Object.assign({ marginTop: 8 }, st.button) }, __alloT('stem.graph_access.kf_reveal_all', 'Reveal all')) : null);
    }
    // A worked example that fades: example 1 is fully worked, each later one leaves one more
    // final step for the student. cfg: id, t, state, onSet, announce, styles.
    function workedPanel(React, cfg) {
      cfg = cfg || {};
      var h = React.createElement, __alloT = tOf(cfg.t), st = cfg.styles || {}, id = String(cfg.id || 'worked'), s = cfg.state || {};
      var kinds = [['zeros', __alloT('stem.graph_access.we_kind_zeros', 'Finding zeros')], ['yint', __alloT('stem.graph_access.we_kind_yint', 'Finding the y-intercept')], ['transform', __alloT('stem.graph_access.we_kind_transform', 'Transformations')], ['rate', __alloT('stem.graph_access.we_kind_rate', 'Rate of change')]];
      var kind = kinds.some(function (k) { return k[0] === s.kind; }) ? s.kind : 'zeros', list = workedSet(kind, cfg.t);
      var idx = fin(s.index) ? Math.max(0, Math.min(list.length - 1, Math.floor(s.index))) : 0, ex = list[idx], n = ex.steps.length, fadeFrom = n - idx;
      var count = fin(s.shown) ? Math.max(1, Math.min(n, Math.floor(s.shown))) : 1;
      var opened = s.opened && typeof s.opened === 'object' ? s.opened : {}, yours = s.yours && typeof s.yours === 'object' ? s.yours : {};
      function set(patch) { if (typeof cfg.onSet === 'function') cfg.onSet(Object.assign({ kind: kind, index: idx, shown: count, opened: opened, yours: yours }, patch)); }
      function go(i) { set({ index: i, shown: 1, opened: {}, yours: {} }); }
      var line = Object.assign({ margin: '6px 0 0' }, st.text);
      return h('section', { 'data-worked-panel': id, 'aria-labelledby': id + '-title', style: st.wrap },
        h('h3', { id: id + '-title', style: Object.assign({ margin: 0, fontSize: 16, fontWeight: 800 }, st.text) }, __alloT('stem.graph_access.we_title', 'Worked examples')),
        h('p', { style: line }, __alloT('stem.graph_access.we_fade_note', 'Study example 1 step by step. Each later example leaves more of the last steps for you to write.')),
        h('div', { role: 'group', 'aria-label': __alloT('stem.graph_access.we_pick', 'Choose a skill'), style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 } },
          kinds.map(function (k) { return h('button', { key: k[0], type: 'button', 'data-worked-kind': k[0], 'aria-pressed': k[0] === kind, onClick: function () { set({ kind: k[0], index: 0, shown: 1, opened: {}, yours: {} }); }, style: Object.assign({}, st.button, k[0] === kind ? { fontWeight: 800, borderWidth: 3 } : null) }, k[1]); })),
        h('p', { 'data-worked-problem': true, style: Object.assign({}, line, { fontWeight: 700 }) }, fill(__alloT('stem.graph_access.we_example', 'Example {n} of {m}'), { n: idx + 1, m: list.length }) + ': ' + ex.problem),
        h('ol', { style: Object.assign({ margin: '6px 0 0', paddingLeft: 22 }, st.text) }, ex.steps.slice(0, count).map(function (text, i) {
          if (i < fadeFrom) return h('li', { key: i, 'data-worked-step': i + 1, style: { marginTop: 4 } }, text);
          var tid = id + '-yours-' + i;
          return h('li', { key: i, 'data-worked-step': i + 1, 'data-worked-yours': opened[i] ? 'shown' : 'open', style: { marginTop: 4 } },
            h('label', { htmlFor: tid, style: { display: 'block', fontWeight: 700 } }, __alloT('stem.graph_access.we_your_turn', 'Your turn: write this step, then show it to check.')),
            h('textarea', { id: tid, rows: 2, value: typeof yours[i] === 'string' ? yours[i] : '', onChange: function (e) { var y = Object.assign({}, yours); y[i] = e.target.value.slice(0, 500); set({ yours: y }); }, style: Object.assign({ display: 'block', width: '100%', marginTop: 4 }, st.input) }),
            opened[i] ? h('p', { 'data-worked-check': i + 1, style: line }, fill(__alloT('stem.graph_access.we_compare', 'Compare with: {step}'), { step: text }))
              : h('button', { type: 'button', 'data-worked-show': i + 1, onClick: function () { var o = Object.assign({}, opened); o[i] = true; set({ opened: o }); sayNow(text, cfg.announce); }, style: Object.assign({ marginTop: 4 }, st.button) }, __alloT('stem.graph_access.we_show_step', 'Show this step')));
        })),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
          count < n ? h('button', { type: 'button', 'data-worked-next': true, onClick: function () { set({ shown: count + 1 }); sayNow(count < fadeFrom ? ex.steps[count] : __alloT('stem.graph_access.we_your_turn', 'Your turn: write this step, then show it to check.'), cfg.announce); }, style: st.button }, __alloT('stem.graph_access.we_next_step', 'Show the next step')) : null,
          idx > 0 ? h('button', { type: 'button', 'data-worked-prev': true, onClick: function () { go(idx - 1); }, style: st.button }, __alloT('stem.graph_access.we_prev', 'Previous example')) : null,
          idx < list.length - 1 ? h('button', { type: 'button', 'data-worked-next-example': true, onClick: function () { go(idx + 1); }, style: st.button }, __alloT('stem.graph_access.we_next_example', 'Next example: more steps for you')) : null));
    }
    window.StemLab._graphAccess = Object.freeze({
      version: 2, sample: sample, analyse: analyse, describeGraph: describeGraph, explorePoints: explorePoints, pointText: pointText,
      stepIndex: stepIndex, stepperKeyDown: stepperKeyDown, announce: say, announceNow: sayNow, sonifyPlan: sonifyPlan, playPlan: playPlan, stop: stop,
      isPlaying: isPlaying, isMuted: isMuted, speak: speak, differencesTable: differencesTable, differencesSummary: differencesSummary,
      familyValue: familyValue, matchFamily: matchFamily, palette: palette, niceStep: niceStep, formatNumber: num, fill: fill, panel: panel,
      scanRoots: gcScanRoots, zerosOf: zerosOf, rateOfChange: rateOfChange, rateSteps: rateSteps, intervalText: intervalText, familyFeatures: familyFeatures,
      windowFeatures: windowFeatures, featureRows: featureRows, workedSet: workedSet, hintLadder: hintLadder, ratePanel: ratePanel, featuresPanel: featuresPanel, workedPanel: workedPanel,
      csvText: csvText, downloadText: downloadText, printReport: printReport
    });
  })();
  // The one root engine (calculator Analyze, chips, descriptions and sound in both tools).
  // Numerical candidates, with a substitution residual and the search interval attached.
  // Declared outside the install closure above so it hoists into the tool's own scope.
  function gcScanRoots(evaluate, min, max) {
    var count=500,tolerance=1e-8,results=[],invalid=0;
    if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min||!Number.isFinite(max-min))return {candidates:[],error:'Choose a finite increasing x interval.',errorCode:'interval'};
    var step=(max-min)/count,xTolerance=Math.max(1e-10,step*1e-6),samples=[];
    function value(x){try{var y=evaluate(x);if(typeof y==='number'&&Number.isFinite(y))return y;}catch(e){}invalid++;return NaN;}
    function add(x,y,method,lo,hi){
      if(!Number.isFinite(y)||Math.abs(y)>tolerance)return;
      if(results.some(function(r){return Math.abs(r.x-x)<=xTolerance;}))return;
      results.push({x:x,residual:Math.abs(y),method:method,bracket:[lo,hi]});
    }
    for(var i=0;i<=count;i++){var x=min+(max-min)*(i/count),y=value(x);samples.push({x:x,y:y});if(y===0)add(x,y,'sample zero',x,x);}
    if(samples.every(function(sample){return sample.y===0;}))return {candidates:[],zeroThroughoutSamples:true,interval:[min,max],samples:count+1,step:step,tolerance:tolerance,invalidEvaluations:invalid};
    for(var j=1;j<samples.length;j++){
      var a=samples[j-1],b=samples[j];
      if(!Number.isFinite(a.y)||!Number.isFinite(b.y)||a.y===0||b.y===0||Math.sign(a.y)===Math.sign(b.y))continue;
      var lo=a.x,hi=b.x,yl=a.y,best=Math.abs(a.y)<Math.abs(b.y)?a:b;
      for(var k=0;k<64;k++){
        var mid=lo+(hi-lo)/2;if(mid===lo||mid===hi)break;
        var ym=value(mid);if(!Number.isFinite(ym)){best=null;break;}
        if(!best||Math.abs(ym)<Math.abs(best.y))best={x:mid,y:ym};
        if(ym===0){lo=hi=mid;break;}
        if(Math.sign(yl)!==Math.sign(ym))hi=mid;else{lo=mid;yl=ym;}
      }
      // A jump can change sign without approaching zero. Require substantial residual reduction.
      if(best&&Math.abs(best.y)<=Math.max(Math.abs(a.y),Math.abs(b.y))*1e-4)add(best.x,best.y,'sign change',lo,hi);
    }
    // A local minimum of |f| can reveal a touching root that a sign-change scan misses.
    for(var m=1;m<samples.length-1;m++){
      var left=samples[m-1],center=samples[m],right=samples[m+1];
      if(!Number.isFinite(left.y)||!Number.isFinite(center.y)||!Number.isFinite(right.y)||center.y===0||!(Math.abs(center.y)<Math.abs(left.y)&&Math.abs(center.y)<Math.abs(right.y)))continue;
      var l=left.x,r=right.x,ratio=(Math.sqrt(5)-1)/2,c=r-ratio*(r-l),e=l+ratio*(r-l),fc=value(c),fe=value(e);
      for(var n=0;n<48&&Number.isFinite(fc)&&Number.isFinite(fe);n++){
        if(Math.abs(fc)<Math.abs(fe)){r=e;e=c;fe=fc;c=r-ratio*(r-l);fc=value(c);}
        else{l=c;c=e;fc=fe;e=l+ratio*(r-l);fe=value(e);}
      }
      var cx=Math.abs(fc)<Math.abs(fe)?c:e,cy=Math.abs(fc)<Math.abs(fe)?fc:fe;
      if(Math.abs(cy)<=Math.max(Math.abs(left.y),Math.abs(right.y))*1e-4)add(cx,cy,'touching-root candidate',l,r);
    }
    // A root on a window edge (sin x at ±2π) has no sign change inside the window; the
    // edge value must also be far below its neighbour's, so a decaying tail is not one.
    [[samples[0],samples[1]],[samples[count],samples[count-1]]].forEach(function(p){
      var s=p[0],nb=p[1];
      if(Number.isFinite(s.y)&&s.y!==0&&Number.isFinite(nb.y)&&Math.abs(s.y)<=tolerance&&Math.abs(s.y)<=Math.abs(nb.y)*1e-4)add(s.x,s.y,'window edge',s.x,s.x);
    });
    results.sort(function(a,b){return a.x-b.x;});
    return {candidates:results,interval:[min,max],samples:count+1,step:step,tolerance:tolerance,invalidEvaluations:invalid};
  }
  // == end alloGraphAccess core v2 ==
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  // WCAG 1.4.3 high contrast (generated by gen_hc.cjs)
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-coordgrid-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-coordgrid-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"coordinate\"] [style]:is([style*=\"background: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(255, 255, 255)\"],[style*=\"background: rgb(245, 158, 11)\"],[style*=\"background-color: rgb(245, 158, 11)\"],[style*=\"background: rgb(34, 197, 94)\"],[style*=\"background-color: rgb(34, 197, 94)\"],[style*=\"background: rgb(217, 249, 157)\"],[style*=\"background-color: rgb(217, 249, 157)\"],[style*=\"background: rgba(255, 255, 255, 0.5)\"],[style*=\"background-color: rgba(255, 255, 255, 0.5)\"],[style*=\"background: rgb(236, 253, 245)\"],[style*=\"background-color: rgb(236, 253, 245)\"],[style*=\"background: rgb(236, 254, 255)\"],[style*=\"background-color: rgb(236, 254, 255)\"],[style*=\"background: rgb(245, 243, 255)\"],[style*=\"background-color: rgb(245, 243, 255)\"],[style*=\"background: rgb(255, 251, 235)\"],[style*=\"background-color: rgb(255, 251, 235)\"],[style*=\"background: rgb(241, 245, 249)\"],[style*=\"background-color: rgb(241, 245, 249)\"],[style*=\"background: rgb(254, 242, 242)\"],[style*=\"background-color: rgb(254, 242, 242)\"]):not(:empty):not(svg,canvas,video,iframe,object){background-color:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] :is(.allo-cg-bg-explore,.allo-cg-bg-quadrants,.allo-cg-bg-challenges,.allo-cg-bg-maps):not(:empty):not(svg,canvas,video,iframe,object){background:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] [style]:is([style*=\"gradient(\"][style*=\"rgb(224, 242, 254)\"]):not(:empty):not(svg,canvas,video,iframe,object){background:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] [style]:is([style^=\"color: rgb(220, 38, 38)\"],[style*=\"; color: rgb(220, 38, 38)\"],[style^=\"color: rgb(124, 58, 237)\"],[style*=\"; color: rgb(124, 58, 237)\"],[style^=\"color: rgb(37, 99, 235)\"],[style*=\"; color: rgb(37, 99, 235)\"],[style^=\"color: rgb(147, 51, 234)\"],[style*=\"; color: rgb(147, 51, 234)\"],[style^=\"color: rgb(4, 120, 87)\"],[style*=\"; color: rgb(4, 120, 87)\"],[style^=\"color: rgb(14, 116, 144)\"],[style*=\"; color: rgb(14, 116, 144)\"],[style^=\"color: rgb(109, 40, 217)\"],[style*=\"; color: rgb(109, 40, 217)\"],[style^=\"color: rgb(180, 83, 9)\"],[style*=\"; color: rgb(180, 83, 9)\"],[style^=\"color: rgb(71, 85, 105)\"],[style*=\"; color: rgb(71, 85, 105)\"]){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style^=\"color: rgb(220, 38, 38)\"],[style*=\"; color: rgb(220, 38, 38)\"],[style^=\"color: rgb(124, 58, 237)\"],[style*=\"; color: rgb(124, 58, 237)\"],[style^=\"color: rgb(37, 99, 235)\"],[style*=\"; color: rgb(37, 99, 235)\"],[style^=\"color: rgb(147, 51, 234)\"],[style*=\"; color: rgb(147, 51, 234)\"],[style^=\"color: rgb(4, 120, 87)\"],[style*=\"; color: rgb(4, 120, 87)\"],[style^=\"color: rgb(14, 116, 144)\"],[style*=\"; color: rgb(14, 116, 144)\"],[style^=\"color: rgb(109, 40, 217)\"],[style*=\"; color: rgb(109, 40, 217)\"],[style^=\"color: rgb(180, 83, 9)\"],[style*=\"; color: rgb(180, 83, 9)\"],[style^=\"color: rgb(71, 85, 105)\"],[style*=\"; color: rgb(71, 85, 105)\"]):is([style*=\"background: rgb\"],[style*=\"background-color: rgb\"],[style*=\"background: linear\"]):not([style*=\"background: rgba(\"],[style*=\"background-color: rgba(\"]):not(:is([style*=\"background: rgb(255, 255, 255)\"],[style*=\"background-color: rgb(255, 255, 255)\"],[style*=\"background: rgb(245, 158, 11)\"],[style*=\"background-color: rgb(245, 158, 11)\"],[style*=\"background: rgb(34, 197, 94)\"],[style*=\"background-color: rgb(34, 197, 94)\"],[style*=\"background: rgb(217, 249, 157)\"],[style*=\"background-color: rgb(217, 249, 157)\"],[style*=\"background: rgba(255, 255, 255, 0.5)\"],[style*=\"background-color: rgba(255, 255, 255, 0.5)\"],[style*=\"background: rgb(236, 253, 245)\"],[style*=\"background-color: rgb(236, 253, 245)\"],[style*=\"background: rgb(236, 254, 255)\"],[style*=\"background-color: rgb(236, 254, 255)\"],[style*=\"background: rgb(245, 243, 255)\"],[style*=\"background-color: rgb(245, 243, 255)\"],[style*=\"background: rgb(255, 251, 235)\"],[style*=\"background-color: rgb(255, 251, 235)\"],[style*=\"background: rgb(241, 245, 249)\"],[style*=\"background-color: rgb(241, 245, 249)\"],[style*=\"background: rgb(254, 242, 242)\"],[style*=\"background-color: rgb(254, 242, 242)\"])):not(button:not(:hover)){color:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style*=\"background: rgb(99, 102, 241)\"],[style*=\"background-color: rgb(99, 102, 241)\"],[style*=\"background: rgb(59, 130, 246)\"],[style*=\"background-color: rgb(59, 130, 246)\"],[style*=\"background: rgb(239, 68, 68)\"],[style*=\"background-color: rgb(239, 68, 68)\"],[style*=\"background: rgb(22, 163, 74)\"],[style*=\"background-color: rgb(22, 163, 74)\"],[style*=\"background: rgb(168, 85, 247)\"],[style*=\"background-color: rgb(168, 85, 247)\"],[style*=\"background: rgb(8, 145, 178)\"],[style*=\"background-color: rgb(8, 145, 178)\"],[style*=\"background: rgb(16, 185, 129)\"],[style*=\"background-color: rgb(16, 185, 129)\"],[style*=\"background: rgb(160, 130, 109)\"],[style*=\"background-color: rgb(160, 130, 109)\"]):not(:empty):not(button:not(:hover)){color:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] a:not([style*=\"background\"]):not([class*=\"bg-\"]:not([class*=\"-50\"],[class*=\"-100\"],[class*=\"bg-white\"])){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] button[class*=\"bg-gradient-to-\"]:not(:empty):not(svg,canvas,video,iframe,object){background:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}.theme-contrast [data-stem-tool-shell=\"coordinate\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h):is([aria-label],[title]):not(:has(*)){text-shadow:0 0 1px #000,0 0 1px #000,0 0 1px #000!important}";
    document.head.appendChild(st);
  })();
  // end WCAG 1.4.3 high contrast
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-coordgrid')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-coordgrid';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Coord-grid v3: atmospheric backgrounds + slide/pulse + focus ring
  (function() {
    if (document.getElementById('allo-coordgrid-v3-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-coordgrid-v3-css';
    st.textContent = [
      '@keyframes allo-cg-point-pulse { 0% { filter: drop-shadow(0 0 0 rgba(8,145,178,0.6)); } 50% { filter: drop-shadow(0 0 6px rgba(8,145,178,0.6)); } 100% { filter: drop-shadow(0 0 0 rgba(8,145,178,0.6)); } }',
      '@keyframes allo-cg-pop { 0% { transform: scale(1); } 30% { transform: scale(1.22); } 60% { transform: scale(0.94); } 100% { transform: scale(1); } }',
      '@keyframes allo-cg-splash { 0% { r: 6; opacity: 0.9; stroke-width: 3; } 100% { r: 30; opacity: 0; stroke-width: 0.5; } }',
      '@keyframes allo-cg-trail-fade { 0% { opacity: 0; } 100% { opacity: 0.6; } }',
      '.allo-cg-splash { animation: allo-cg-splash 0.6s ease-out forwards; pointer-events: none; }',
      '.allo-cg-quad-rect { transition: opacity 0.32s ease; }',
      '.allo-cg-trail { animation: allo-cg-trail-fade 0.5s ease-out forwards; pointer-events: none; }',
      '.allo-cg-bg-explore { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(8,145,178,0.10) 0%, rgba(8,145,178,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-bg-quadrants { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(147,51,234,0.10) 0%, rgba(147,51,234,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-bg-maps { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-walker { transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1); transform-box: fill-box; transform-origin: center; }',
      '.allo-cg-pop { animation: allo-cg-pop 0.5s ease-out; transform-box: fill-box; transform-origin: center; }',
      '.allo-cg-point-pulse { animation: allo-cg-point-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }',
      '.allo-cg-fill { transition: fill 0.28s ease, opacity 0.28s ease, transform 0.28s ease; }',
      'svg.allo-cg-grid:focus { outline: 3px solid rgba(8,145,178,0.55); outline-offset: 2px; border-radius: 4px; }',
      'svg.allo-cg-grid:focus-visible { outline: 3px solid rgba(8,145,178,0.55); outline-offset: 2px; border-radius: 4px; }',
      '.allo-cg-app:focus { outline: 3px solid #c2410c; outline-offset: 3px; }',
      '.allo-cg-app:focus:not(:focus-visible) { outline: none; }',
      'rect.allo-cg-sq:focus { outline: none; stroke: #1e3a8a; stroke-width: 4px; }',
      '@keyframes allo-cg-walk-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }',
      '@keyframes allo-cg-walk-show { from { opacity: 0; } to { opacity: 1; } }',
      '.allo-cg-walk-a { stroke-dasharray: 1; animation: allo-cg-walk-draw 0.6s ease-out both; }',
      '.allo-cg-walk-b { stroke-dasharray: 1; animation: allo-cg-walk-draw 0.6s ease-out 0.6s both; }',
      '.allo-cg-walk-ha { animation: allo-cg-walk-show 0.2s ease-out 0.5s both; }',
      '.allo-cg-walk-hb { animation: allo-cg-walk-show 0.2s ease-out 1.1s both; }',
      '@media (prefers-reduced-motion: reduce) { .allo-cg-walk-a, .allo-cg-walk-b, .allo-cg-walk-ha, .allo-cg-walk-hb { animation: none !important; stroke-dashoffset: 0; opacity: 1; } }',
      '@media (prefers-reduced-motion: reduce) { .allo-cg-walker, .allo-cg-fill { transition: none !important; } .allo-cg-pop, .allo-cg-point-pulse { animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  // \u2500\u2500 Coordinate Grid core: task generators, graders and misconception diagnosis.
  // Pure functions (no React, no state); the registered tool exposes them as
  // _core so tests run the math itself. rng defaults to Math.random.
  var CG_CORE = (function () {
    function rint(rng, a, b) { return a + Math.floor((rng || Math.random)() * (b - a + 1)); }
    function pick(rng, arr) { return arr[rint(rng, 0, arr.length - 1)]; }
    function nonzero(rng, lo, hi) { var v = 0, n = 0; while (v === 0 && n++ < 100) v = rint(rng, lo, hi); return v || 1; }
    function same(a, b) { return !!a && !!b && a.x === b.x && a.y === b.y; }
    function pt(x, y) { return { x: x, y: y }; }
    var LEVELS = ['g5', 'g6', 'g8'];
    function validLevel(l) { return LEVELS.indexOf(l) >= 0 ? l : null; }
    // Grade 5 works in quadrant I (5.G.1-2); grade 6 uses all four quadrants and
    // distances along a grid line (6.NS.8, 6.G.3); grade 8 adds Pythagoras and slope.
    function bandFor(gradeLevel, gradeBand) {
      var g = String(gradeLevel || '').toLowerCase();
      var m = g.match(/(\d+)\s*(st|nd|rd|th)/);
      if (m) { var n = +m[1]; return n <= 5 ? 'g5' : n <= 7 ? 'g6' : 'g8'; }
      if (g.indexOf('kinder') === 0 || g.indexOf('pre') === 0) return 'g5';
      if (/college|graduate|adult/.test(g)) return 'g8';
      var b = String(gradeBand || '');
      return b === 'k2' || b === 'g35' ? 'g5' : b === 'g912' ? 'g8' : 'g6';
    }
    // Tasks that belong to each level; the rest are offered as stretch tasks.
    var LEVEL_TASKS = {
      g5: ['plot', 'name', 'translate', 'distance', 'polygon'],
      g6: ['plot', 'name', 'reflect', 'translate', 'distance', 'polygon'],
      g8: ['plot', 'name', 'reflect', 'translate', 'distance', 'polygon', 'slope']
    };
    var ALL_TASKS = ['plot', 'name', 'reflect', 'translate', 'distance', 'polygon', 'slope'];
    function inLevel(level, task) { return (LEVEL_TASKS[validLevel(level) || 'g6'] || []).indexOf(task) >= 0; }

    // A point whose x and y differ (so a swap is detectable) and, beyond grade 5,
    // whose |x| and |y| differ (so a sign slip and a swap never coincide).
    function genPoint(level, rng, opts) {
      var o = opts || {};
      if (level === 'g5') {
        var x = rint(rng, 0, 9), y = rint(rng, 0, 9), n = 0;
        if (!o.allowZero) { x = rint(rng, 1, 9); y = rint(rng, 1, 9); }
        while (y === x && n++ < 50) y = rint(rng, o.allowZero ? 0 : 1, 9);
        if (y === x) y = x === 9 ? 8 : x + 1;
        return pt(x, y);
      }
      if (o.allowZero && (rng || Math.random)() < 0.15) {
        var v = nonzero(rng, -8, 8);
        return (rng || Math.random)() < 0.5 ? pt(v, 0) : pt(0, v);
      }
      var p = pt(nonzero(rng, -8, 8), nonzero(rng, -8, 8)), k = 0;
      while (Math.abs(p.y) === Math.abs(p.x) && k++ < 50) p.y = nonzero(rng, -8, 8);
      if (Math.abs(p.y) === Math.abs(p.x)) p.y = p.x > 0 ? -((Math.abs(p.x) % 8) + 1) : (Math.abs(p.x) % 8) + 1;
      return p;
    }
    // The commonest ordered-pair slips, in the order a teacher would name them.
    function diagnosePoint(a, t) {
      if (!a || !t) return 'other';
      if (same(a, t)) return 'correct';
      if (t.x !== t.y && a.x === t.y && a.y === t.x) return 'swapped';
      if (t.x !== 0 && t.y !== 0 && a.x === -t.x && a.y === -t.y) return 'sign_both';
      if (t.x !== 0 && a.x === -t.x && a.y === t.y) return 'sign_x';
      if (t.y !== 0 && a.x === t.x && a.y === -t.y) return 'sign_y';
      if (Math.abs(a.x - t.x) + Math.abs(a.y - t.y) === 1) return 'off_by_one';
      return 'other';
    }
    function genPlot(level, rng) { var p = genPoint(level, rng, { allowZero: true }); return { type: 'plot', target: p, view: level === 'g5' ? 'q1' : null }; }
    function genName(level, rng) { var p = genPoint(level, rng, { allowZero: true }); return { type: 'name', target: p, view: level === 'g5' ? 'q1' : null }; }

    function reflectPoint(p, axis) { return axis === 'x' ? pt(p.x, -p.y) : axis === 'y' ? pt(-p.x, p.y) : pt(-p.x, -p.y); }
    function genReflect(level, rng) {
      var p = genPoint(level === 'g5' ? 'g6' : level, rng);
      var axis = level === 'g8' ? pick(rng, ['x', 'y', 'origin']) : pick(rng, ['x', 'y']);
      return { type: 'reflect', p: p, axis: axis, answer: reflectPoint(p, axis), view: null };
    }
    function diagnoseReflect(a, item) {
      var p = item.p, img = item.answer;
      if (same(a, img)) return 'correct';
      if (same(a, p)) return 'no_change';
      if (item.axis !== 'origin' && same(a, reflectPoint(p, item.axis === 'x' ? 'y' : 'x'))) return 'wrong_axis';
      if (item.axis !== 'origin' && same(a, reflectPoint(p, 'origin'))) return 'both_flipped';
      if (item.axis === 'origin' && (same(a, reflectPoint(p, 'x')) || same(a, reflectPoint(p, 'y')))) return 'one_flipped';
      if (same(a, pt(p.y, p.x))) return 'swapped';
      var d = diagnosePoint(a, img);
      return d === 'swapped' || d === 'off_by_one' ? d : 'other';
    }

    function genTranslate(level, rng) {
      var lo = level === 'g5' ? 0 : -9, hi = level === 'g5' ? 10 : 9;
      for (var i = 0; i < 400; i++) {
        var p = level === 'g5' ? pt(rint(rng, 0, 9), rint(rng, 0, 9)) : pt(rint(rng, -7, 7), rint(rng, -7, 7));
        var v = { dx: nonzero(rng, -6, 6), dy: nonzero(rng, -6, 6) };
        if (Math.abs(v.dx) === Math.abs(v.dy)) continue;
        var img = pt(p.x + v.dx, p.y + v.dy);
        if (img.x < lo || img.x > hi || img.y < lo || img.y > hi) continue;
        return { type: 'translate', p: p, v: v, answer: img, view: level === 'g5' ? 'q1' : null };
      }
      return { type: 'translate', p: pt(2, 3), v: { dx: 4, dy: 1 }, answer: pt(6, 4), view: level === 'g5' ? 'q1' : null };
    }
    function diagnoseTranslate(a, item) {
      var p = item.p, v = item.v, img = item.answer;
      if (same(a, img)) return 'correct';
      if (same(a, p)) return 'no_change';
      if (same(a, pt(p.x + v.dy, p.y + v.dx))) return 'swapped_vector';
      if (same(a, pt(p.x - v.dx, p.y - v.dy))) return 'opposite';
      if (same(a, pt(p.x - v.dx, p.y + v.dy)) || same(a, pt(p.x + v.dx, p.y - v.dy))) return 'one_direction';
      if (same(a, pt(p.x + v.dx, p.y)) || same(a, pt(p.x, p.y + v.dy))) return 'one_coordinate';
      var d = diagnosePoint(a, img);
      return d === 'swapped' || d === 'off_by_one' ? d : 'other';
    }

    // Grades 5-6: a horizontal or vertical segment, so the distance is a count of
    // units (6.NS.8, crossing an axis half the time beyond grade 5). Grade 8: any
    // two points, distance by the Pythagorean theorem, rounded to tenths.
    function genDistance(level, rng) {
      var p1, p2, n = 0;
      if (level === 'g8') {
        do {
          p1 = pt(rint(rng, -6, 6), rint(rng, -6, 6));
          p2 = pt(rint(rng, -6, 6), rint(rng, -6, 6));
        } while ((p1.x === p2.x || p1.y === p2.y) && n++ < 200);
        if (p1.x === p2.x || p1.y === p2.y) { p1 = pt(-2, 1); p2 = pt(2, 4); }
        var d = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        return { type: 'distance', kind: 'pythag', p1: p1, p2: p2, distance: Math.round(d * 10) / 10, view: null };
      }
      var horizontal = (rng || Math.random)() < 0.5;
      var a, b, c;
      if (level === 'g5') {
        c = rint(rng, 1, 9); a = rint(rng, 0, 9); b = rint(rng, 0, 9);
        while (b === a && n++ < 50) b = rint(rng, 0, 9);
        if (b === a) b = a === 9 ? 2 : a + 2;
      } else {
        c = nonzero(rng, -8, 8);
        if ((rng || Math.random)() < 0.5) { a = -rint(rng, 1, 8); b = rint(rng, 1, 8); }
        else { a = nonzero(rng, -8, 8); b = nonzero(rng, -8, 8); while (b === a && n++ < 50) b = nonzero(rng, -8, 8); if (b === a) b = -a; }
        if ((rng || Math.random)() < 0.5) { var tmp = a; a = b; b = tmp; }
      }
      p1 = horizontal ? pt(a, c) : pt(c, a);
      p2 = horizontal ? pt(b, c) : pt(c, b);
      return { type: 'distance', kind: 'axis', p1: p1, p2: p2, distance: Math.abs(b - a), view: level === 'g5' ? 'q1' : null };
    }
    function distanceOk(ans, item) {
      if (!isFinite(ans)) return false;
      if (item.kind === 'axis') return Math.abs(ans - item.distance) < 1e-9;
      return Math.abs(ans - item.distance) < 0.06;
    }
    function diagnoseDistance(ans, item) {
      if (distanceOk(ans, item)) return 'correct';
      var dx = Math.abs(item.p2.x - item.p1.x), dy = Math.abs(item.p2.y - item.p1.y);
      var close = function (v) { return Math.abs(ans - v) < 0.06; };
      if (ans < 0) return 'negative';
      if (item.kind === 'axis' || dx === 0 || dy === 0) {
        var u = item.p1.x === item.p2.x ? [item.p1.y, item.p2.y] : [item.p1.x, item.p2.x];
        if (u[0] * u[1] < 0 && close(Math.abs(Math.abs(u[0]) - Math.abs(u[1])))) return 'subtracted_across_axis';
        if (close(item.distance + 1)) return 'counted_points';
        if (close(Math.abs(u[0]) + Math.abs(u[1])) && u[0] * u[1] > 0) return 'added_same_side';
        return 'other';
      }
      if (close(dx + dy)) return 'added_legs';
      if (close(dx * dx + dy * dy)) return 'no_sqrt';
      if (close(dx) || close(dy)) return 'one_leg';
      return 'other';
    }

    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % t; a = t; } return a || 1; }
    function slopeOf(p1, p2) {
      var dy = p2.y - p1.y, dx = p2.x - p1.x;
      if (dx === 0) return { rise: dy, run: 0, value: 'undefined', display: 'undefined' };
      var g = gcd(dy, dx), num = dy / g, den = dx / g;
      if (den < 0) { num = -num; den = -den; }
      return { rise: dy, run: dx, value: dy / dx, display: den === 1 ? '' + num : num + '/' + den };
    }
    function genSlope(level, rng) {
      var p1, p2, n = 0;
      do { p1 = pt(rint(rng, -6, 6), rint(rng, -6, 6)); p2 = pt(rint(rng, -6, 6), rint(rng, -6, 6)); } while (same(p1, p2) && n++ < 100);
      if (same(p1, p2)) p2 = pt(p1.x + 2, p1.y + 3);
      return { type: 'slope', p1: p1, p2: p2, slopeData: slopeOf(p1, p2), view: null };
    }
    // Rise and run may be read from either end, as long as both come from the same
    // end: (6, 3) and (-6, -3) describe the same segment.
    function gradeSlope(riseAns, runAns, slopeText, cs) {
      var grading = window.StemLab && window.StemLab.grading;
      var text = String(slopeText == null ? '' : slopeText).replace(/\u2212/g, '-').replace(/\s+/g, '').toLowerCase();
      var num = grading ? grading.toNumber(String(slopeText == null ? '' : slopeText)) : NaN;
      if (!isFinite(num) && grading) num = grading.toNumber(text);
      var forward = riseAns === cs.rise && runAns === cs.run;
      var backward = riseAns === -cs.rise && runAns === -cs.run;
      var pairOk = forward || backward;
      var slopeOk = cs.run === 0 ? text === 'undefined' : (text === cs.display || (grading ? grading.sameNumber(num, cs.value, { tolerance: 0.005 }) : false));
      var code = 'correct';
      if (!(pairOk && slopeOk)) {
        if (!pairOk && cs.run !== 0 && cs.rise !== 0 && ((riseAns === cs.rise && runAns === -cs.run) || (riseAns === -cs.rise && runAns === cs.run))) code = 'mixed_direction';
        else if (!pairOk && riseAns != null && runAns != null && ((riseAns === cs.run && runAns === cs.rise) || (riseAns === -cs.run && runAns === -cs.rise))) code = 'rise_run_swapped';
        else if (!slopeOk && cs.run !== 0 && cs.rise !== 0 && isFinite(num) && Math.abs(num - cs.run / cs.rise) < 0.005) code = 'reciprocal';
        else if (!slopeOk && cs.run !== 0 && cs.rise !== 0 && isFinite(num) && Math.abs(num + cs.value) < 0.005) code = 'slope_sign';
        else if (pairOk && !slopeOk) code = 'slope_from_pair';
        else code = 'other';
      }
      return { riseOk: pairOk, runOk: pairOk, slopeOk: slopeOk, allCorrect: pairOk && slopeOk, code: code, reversed: backward && !forward };
    }

    function shoelace(vs) {
      var s = 0;
      for (var i = 0; i < vs.length; i++) { var a = vs[i], b = vs[(i + 1) % vs.length]; s += a.x * b.y - b.x * a.y; }
      return Math.abs(s) / 2;
    }
    function perimeterOf(vs) {
      var s = 0;
      for (var i = 0; i < vs.length; i++) { var a = vs[i], b = vs[(i + 1) % vs.length]; s += Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)); }
      return Math.round(s * 1000) / 1000;
    }
    // 6.G.3: polygons drawn from coordinates, side lengths read from coordinates
    // that share an x or a y. Rectangles in quadrant I for grade 5.
    function genPolygon(level, rng) {
      var shape = level === 'g5' ? 'rect' : pick(rng, ['rect', 'rect', 'tri', 'L']);
      var vs, w, hgt, x0, y0;
      if (level === 'g5') {
        w = rint(rng, 2, 6); hgt = rint(rng, 2, 6); x0 = rint(rng, 0, 10 - w); y0 = rint(rng, 0, 10 - hgt);
      } else {
        w = rint(rng, 3, 8); hgt = rint(rng, 3, 7); x0 = rint(rng, -8, 8 - w); y0 = rint(rng, -8, 8 - hgt);
        if (x0 > 0 && x0 + w > 0 && (rng || Math.random)() < 0.6) x0 = -rint(rng, 1, Math.min(8, w));
      }
      if (shape === 'rect') vs = [pt(x0, y0), pt(x0 + w, y0), pt(x0 + w, y0 + hgt), pt(x0, y0 + hgt)];
      else if (shape === 'tri') vs = [pt(x0, y0), pt(x0 + w, y0), pt(x0, y0 + hgt)];
      else {
        var cw = rint(rng, 1, w - 1), ch = rint(rng, 1, hgt - 1);
        vs = [pt(x0, y0), pt(x0 + w, y0), pt(x0 + w, y0 + hgt - ch), pt(x0 + w - cw, y0 + hgt - ch), pt(x0 + w - cw, y0 + hgt), pt(x0, y0 + hgt)];
      }
      var ask = shape === 'tri' ? 'area' : pick(rng, ['area', 'perimeter']);
      var area = shoelace(vs), per = perimeterOf(vs);
      return { type: 'polygon', shape: shape, vertices: vs, ask: ask, w: w, h: hgt, area: area, perimeter: per, answer: ask === 'area' ? area : per, view: level === 'g5' ? 'q1' : null };
    }
    function diagnosePolygon(ans, item) {
      if (!isFinite(ans)) return 'other';
      var close = function (v) { return Math.abs(ans - v) < 1e-6; };
      if (close(item.answer)) return 'correct';
      if (item.shape !== 'tri' && close(item.ask === 'area' ? item.perimeter : item.area)) return 'area_perimeter_swap';
      if (item.shape === 'tri' && close(item.area * 2)) return 'no_half';
      if (item.shape === 'rect' && item.ask === 'perimeter' && close(item.w + item.h)) return 'half_perimeter';
      if (item.shape === 'rect' && ((item.ask === 'perimeter' && close(item.perimeter + 4)) || (item.ask === 'area' && close((item.w + 1) * (item.h + 1))))) return 'counted_points';
      return 'other';
    }
    function generate(type, level, rng) {
      var lv = validLevel(level) || 'g6';
      if (type === 'plot') return genPlot(lv, rng);
      if (type === 'name') return genName(lv, rng);
      if (type === 'reflect') return genReflect(lv, rng);
      if (type === 'translate') return genTranslate(lv, rng);
      if (type === 'distance') return genDistance(lv, rng);
      if (type === 'polygon') return genPolygon(lv, rng);
      if (type === 'slope') return genSlope(lv, rng);
      return null;
    }
    // One key per distinct item: the reveal lock and the credit map share it. The
    // slope and distance shapes match the keys saved before 2026-11-03.
    function itemKey(ch) {
      if (!ch || typeof ch !== 'object') return null;
      var P = function (p) { return p && isFinite(p.x) && isFinite(p.y) ? p.x + ',' + p.y : '?'; };
      if ((ch.type === 'slope' || ch.type === 'distance') && ch.p1 && ch.p2) return ch.type + ':' + P(ch.p1) + '>' + P(ch.p2);
      if ((ch.type === 'plot' || ch.type === 'name') && ch.target) return ch.type + ':' + P(ch.target);
      if (ch.type === 'reflect' && ch.p) return 'reflect:' + ch.axis + ':' + P(ch.p);
      if (ch.type === 'translate' && ch.p && ch.v) return 'translate:' + P(ch.p) + '+' + ch.v.dx + ',' + ch.v.dy;
      if (ch.type === 'polygon' && Array.isArray(ch.vertices)) return 'polygon:' + ch.ask + ':' + ch.vertices.map(P).join(';');
      return null;
    }
    // A saved challenge is trusted only if its numbers are finite; anything else
    // (an old or hand-edited save) is dropped instead of crashing the render.
    function cleanChallenge(ch) {
      if (!ch || typeof ch !== 'object') return null;
      var okP = function (p) { return !!p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y); };
      if (ch.type === 'plot' || ch.type === 'name') return okP(ch.target) ? ch : null;
      if (ch.type === 'slope') return okP(ch.p1) && okP(ch.p2) && ch.slopeData ? ch : null;
      if (ch.type === 'distance') {
        if (!okP(ch.p1) || !okP(ch.p2) || !isFinite(ch.distance)) return null;
        return ch.kind ? ch : Object.assign({}, ch, { kind: (ch.p1.x === ch.p2.x || ch.p1.y === ch.p2.y) ? 'axis' : 'pythag' });
      }
      if (ch.type === 'reflect') return okP(ch.p) && okP(ch.answer) ? ch : null;
      if (ch.type === 'translate') return okP(ch.p) && okP(ch.answer) && ch.v && isFinite(ch.v.dx) && isFinite(ch.v.dy) ? ch : null;
      if (ch.type === 'polygon') return Array.isArray(ch.vertices) && ch.vertices.length >= 3 && ch.vertices.every(okP) && isFinite(ch.answer) ? ch : null;
      return null;
    }
    function quadrantOf(x, y) {
      if (x === 0 && y === 0) return 'origin';
      if (x === 0) return 'yaxis';
      if (y === 0) return 'xaxis';
      return x > 0 ? (y > 0 ? 'I' : 'IV') : (y > 0 ? 'II' : 'III');
    }
    // Each band's core tabs come first, then extra practice, then Play (map games).
    var CORE_TABS = { g5: ['explore', 'patterns', 'treasure'], g6: ['explore', 'transform', 'patterns', 'treasure'], g8: ['transform', 'explore', 'patterns'] };
    var ALL_TABS = ['explore', 'transform', 'patterns', 'treasure', 'quadrants', 'quadHunt', 'maps'];
    function tabOrder(level, hidePlay) {
      var core = CORE_TABS[validLevel(level) || 'g6'];
      return core.concat(ALL_TABS.filter(function (id) { return core.indexOf(id) < 0 && !(hidePlay && id === 'maps'); }));
    }
    // "Start here": 3 to 6 ordered activities per band, each ticked by a counter
    // the tool already keeps (goal = how many solves count as done).
    // 5.G.1-2 and 5.OA.3; 6.NS.6-8, 6.G.3 and 6.EE.9; 8.G.1-4, 8.EE.6 and 8.G.8.
    // A sixth entry names a narrower skill than its counter (a grade 5 plot has no
    // negative coordinate; a distance along a grid line is not a Pythagorean one):
    // that step counts the distinct items of that kind in creditedItems instead.
    var PATHS = {
      g5: [['plot5', 'explore', 'plot', 'plotsSolved', 3], ['name5', 'explore', 'name', 'namesSolved', 3], ['patterns', 'patterns', 'patterns', 'patternsSolved', 2], ['treasure5', 'treasure', 'treasure', 'treasuresFound', 1]],
      g6: [['plot6', 'explore', 'plot', 'plotsSolved', 3, 'plotNeg'], ['reflect', 'explore', 'reflect', 'reflectsSolved', 2], ['distance6', 'explore', 'distance', 'distanceSolved', 2, 'axisDist'], ['polygon', 'explore', 'polygon', 'polygonsSolved', 2], ['table', 'patterns', 'table', 'tablesSolved', 2]],
      g8: [['sequence', 'transform', 'sequence', 'sequencesSolved', 2], ['rotate', 'transform', 'rotate', 'rotationsSolved', 2], ['dilate', 'transform', 'dilate', 'dilationsSolved', 2], ['judge', 'transform', 'judge', 'judgesSolved', 1], ['slope', 'explore', 'slope', 'slopesSolved', 2], ['pythag', 'explore', 'distance', 'distanceSolved', 2, 'pythag']]
    };
    function pathFor(level, opts) {
      var o = opts || {};
      return PATHS[validLevel(level) || 'g6'].filter(function (r) { return !(o.noDilate && r[2] === 'dilate'); })
        .map(function (r) { return { id: r[0], tab: r[1], task: r[2], counter: r[3], goal: r[4], credit: r[5] || null }; });
    }
    // Distinct credited items by kind, from the creditedItems keys (itemKey shapes).
    function creditedKinds(credited) {
      var out = { plotNeg: 0, axisDist: 0, pythag: 0 };
      Object.keys(credited && typeof credited === 'object' ? credited : {}).forEach(function (k) {
        var m = /^distance:(-?\d+),(-?\d+)>(-?\d+),(-?\d+)$/.exec(k);
        if (m) { if (m[1] !== m[3] && m[2] !== m[4]) out.pythag++; else out.axisDist++; return; }
        m = /^plot:(-?\d+),(-?\d+)$/.exec(k);
        if (m && (+m[1] < 0 || +m[2] < 0)) out.plotNeg++;
      });
      return out;
    }
    return {
      CORE_TABS: CORE_TABS, ALL_TABS: ALL_TABS, tabOrder: tabOrder, pathFor: pathFor, creditedKinds: creditedKinds,
      LEVELS: LEVELS, ALL_TASKS: ALL_TASKS, LEVEL_TASKS: LEVEL_TASKS, bandFor: bandFor, validLevel: validLevel, inLevel: inLevel,
      genPoint: genPoint, diagnosePoint: diagnosePoint, reflectPoint: reflectPoint, diagnoseReflect: diagnoseReflect,
      diagnoseTranslate: diagnoseTranslate, distanceOk: distanceOk, diagnoseDistance: diagnoseDistance, slopeOf: slopeOf,
      gradeSlope: gradeSlope, shoelace: shoelace, perimeterOf: perimeterOf, diagnosePolygon: diagnosePolygon,
      generate: generate, itemKey: itemKey, cleanChallenge: cleanChallenge, quadrantOf: quadrantOf, same: same
    };
  })();

  // Stage B core (pure, exposed through _core): transformation sequences and
  // dilations (8.G.1-4), two numerical patterns as ordered pairs (5.OA.3), tables
  // to graphs (6.EE.9) and treasure-hunt missions with coordinate and distance clues.
  var CG_MORE = (function () {
    function rint(rng, a, b) { return a + Math.floor((rng || Math.random)() * (b - a + 1)); }
    function pick(rng, arr) { return arr[rint(rng, 0, arr.length - 1)]; }
    function chance(rng, p) { return (rng || Math.random)() < p; }
    function shuffle(rng, arr) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rint(rng, 0, i); var tmp = a[i]; a[i] = a[j]; a[j] = tmp; } return a; }
    function pt(x, y) { return { x: x, y: y }; }
    function fix(v) { var r = Math.round(v * 1e6) / 1e6; return r === 0 ? 0 : r; }
    function samePt(a, b) { return !!a && !!b && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6; }
    function isInt(v) { return typeof v === 'number' && isFinite(v) && Math.abs(v - Math.round(v)) < 1e-9; }
    function okP(p) { return !!p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y); }
    function inBox(p, lo, hi) { return p.x >= lo && p.x <= hi && p.y >= lo && p.y <= hi; }
    function nz(rng, lo, hi) { var v = 0, n = 0; while (v === 0 && n++ < 50) v = rint(rng, lo, hi); return v || 1; }

    // \u2500\u2500 Transformations (8.G.1-4) \u2500\u2500
    var LINES = ['x', 'y', 'yx', 'ynx', 'xa', 'yb'];
    var OTHER_LINE = { x: 'y', y: 'x', yx: 'ynx', ynx: 'yx', xa: 'yb', yb: 'xa' };
    function applyStep(p, s) {
      if (!s || !okP(p)) return p;
      var cx = +s.cx || 0, cy = +s.cy || 0;
      if (s.kind === 'translate') return pt(fix(p.x + (+s.dx || 0)), fix(p.y + (+s.dy || 0)));
      if (s.kind === 'reflect') {
        var a = +s.a || 0;
        if (s.line === 'x') return pt(p.x, fix(-p.y));
        if (s.line === 'y') return pt(fix(-p.x), p.y);
        if (s.line === 'yx') return pt(p.y, p.x);
        if (s.line === 'ynx') return pt(fix(-p.y), fix(-p.x));
        if (s.line === 'xa') return pt(fix(2 * a - p.x), p.y);
        if (s.line === 'yb') return pt(p.x, fix(2 * a - p.y));
        return p;
      }
      if (s.kind === 'rotate') {
        var dx = p.x - cx, dy = p.y - cy, ang = ((Math.round(+s.angle || 0) % 360) + 360) % 360;
        if (ang === 90) return pt(fix(cx - dy), fix(cy + dx));
        if (ang === 180) return pt(fix(cx - dx), fix(cy - dy));
        if (ang === 270) return pt(fix(cx + dy), fix(cy - dx));
        return p;
      }
      if (s.kind === 'dilate') {
        var k = +s.k;
        if (!isFinite(k) || k <= 0) return p;
        return pt(fix(cx + k * (p.x - cx)), fix(cy + k * (p.y - cy)));
      }
      return p;
    }
    function applySeq(fig, steps) { return fig.map(function (p) { return (steps || []).reduce(applyStep, p); }); }
    // A step from saved state or the builder, or null when it is not a real move.
    function cleanStep(s) {
      if (!s || typeof s !== 'object') return null;
      var n = function (v) { if (v === '' || v == null) return null; var x = Number(v); return isFinite(x) ? x : null; };
      if (s.kind === 'translate') {
        var dx = n(s.dx), dy = n(s.dy);
        if (dx === null || dy === null || !isInt(dx) || !isInt(dy) || Math.abs(dx) > 20 || Math.abs(dy) > 20 || (dx === 0 && dy === 0)) return null;
        return { kind: 'translate', dx: dx, dy: dy };
      }
      if (s.kind === 'reflect') {
        if (LINES.indexOf(s.line) < 0) return null;
        var a = s.line === 'xa' || s.line === 'yb' ? n(s.a) : 0;
        if (a === null || !isInt(a) || Math.abs(a) > 10) return null;
        return { kind: 'reflect', line: s.line, a: a };
      }
      if (s.kind === 'rotate') {
        var ang = n(s.angle), cx = s.cx == null || s.cx === '' ? 0 : n(s.cx), cy = s.cy == null || s.cy === '' ? 0 : n(s.cy);
        if ([90, 180, 270].indexOf(ang) < 0 || cx === null || cy === null || !isInt(cx) || !isInt(cy) || Math.abs(cx) > 10 || Math.abs(cy) > 10) return null;
        return { kind: 'rotate', angle: ang, cx: cx, cy: cy };
      }
      if (s.kind === 'dilate') {
        var k = n(s.k);
        if (k === null || !(k > 0) || k > 10 || k === 1) return null;
        return { kind: 'dilate', k: k, cx: 0, cy: 0 };
      }
      return null;
    }
    function cleanSteps(list) { return Array.isArray(list) ? list.map(cleanStep).filter(Boolean).slice(0, 6) : []; }
    function sameFigure(f1, f2) {
      if (!Array.isArray(f1) || !Array.isArray(f2) || f1.length !== f2.length) return false;
      var used = [];
      return f1.every(function (p) {
        for (var i = 0; i < f2.length; i++) if (!used[i] && samePt(p, f2[i])) { used[i] = true; return true; }
        return false;
      });
    }
    function signedArea(vs) { var s = 0; for (var i = 0; i < vs.length; i++) { var a = vs[i], b = vs[(i + 1) % vs.length]; s += a.x * b.y - b.x * a.y; } return s / 2; }
    function sqSides(vs) { var out = []; for (var i = 0; i < vs.length; i++) { var a = vs[i], b = vs[(i + 1) % vs.length]; out.push(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)); } return out; }
    function scalene(vs) {
      var d = sqSides(vs).slice().sort(function (a, b) { return a - b; });
      return d[0] > 0 && d[0] !== d[1] && d[1] !== d[2] && Math.abs(signedArea(vs)) > 0;
    }
    // Size of `target` as a multiple of `img` (vertex i matches vertex i).
    function sizeRatio(img, target) { var a = sqSides(img), b = sqSides(target); return a[0] > 0 ? Math.sqrt(b[0] / a[0]) : NaN; }
    function isTranslationOf(f1, f2) {
      if (f1.length !== f2.length) return false;
      var dx = f2[0].x - f1[0].x, dy = f2[0].y - f1[0].y;
      return f1.every(function (p, i) { return samePt(pt(p.x + dx, p.y + dy), f2[i]); });
    }
    // A scalene triangle (no reflection or turn maps it onto itself), no vertex at
    // the origin, compact enough to read. even: every coordinate even (halving).
    function genTriangle(rng, lo, hi, even) {
      for (var i = 0; i < 500; i++) {
        var vs = [];
        for (var j = 0; j < 3; j++) { var x = rint(rng, lo, hi), y = rint(rng, lo, hi); vs.push(even ? pt(2 * x, 2 * y) : pt(x, y)); }
        if (!scalene(vs)) continue;
        if (vs.some(function (p) { return p.x === 0 && p.y === 0; })) continue;
        var xs = vs.map(function (p) { return p.x; }), ys = vs.map(function (p) { return p.y; });
        var span = even ? 8 : 5;
        if (Math.max.apply(null, xs) - Math.min.apply(null, xs) > span || Math.max.apply(null, ys) - Math.min.apply(null, ys) > span) continue;
        return vs;
      }
      return even ? [pt(2, 2), pt(6, 2), pt(2, 4)] : [pt(1, 1), pt(4, 1), pt(1, 3)];
    }
    function moveKinds(level) { return level === 'g5' ? ['translate'] : level === 'g6' ? ['translate', 'reflect'] : ['translate', 'reflect', 'rotate']; }
    function randomStep(kind, level, rng) {
      if (kind === 'translate') {
        var lo = level === 'g5' ? -2 : -6, hi = level === 'g5' ? 5 : 6, dx = 0, dy = 0, n = 0;
        while (dx === 0 && dy === 0 && n++ < 20) { dx = rint(rng, lo, hi); dy = rint(rng, lo, hi); }
        return { kind: 'translate', dx: dx || 3, dy: dy };
      }
      if (kind === 'reflect') return { kind: 'reflect', line: level === 'g8' ? pick(rng, ['x', 'y', 'yx']) : pick(rng, ['x', 'y']), a: 0 };
      if (kind === 'rotate') return { kind: 'rotate', angle: pick(rng, [90, 180, 270]), cx: 0, cy: 0 };
      return { kind: 'dilate', k: pick(rng, [2, 0.5]), cx: 0, cy: 0 };
    }
    // "Map triangle ABC onto triangle DEF": DEF is ABC under a hidden sequence.
    // Grade 5 slides in quadrant I; grade 6 adds reflections in the axes; grade 8
    // composes two or three moves with rotations (and, for similarity, a dilation).
    function genSequence(level, rng, opts) {
      var o = opts || {};
      var lv = level === 'g5' || level === 'g6' ? level : 'g8';
      var similar = lv === 'g8' && !!o.similar;
      var lo = lv === 'g5' ? 0 : -10, hi = 10;
      var kinds = moveKinds(lv);
      for (var tries = 0; tries < 800; tries++) {
        var A = lv === 'g5' ? genTriangle(rng, 0, 5) : similar ? genTriangle(rng, -3, 3, true) : genTriangle(rng, -5, 5);
        var n = lv === 'g5' ? 1 : lv === 'g6' ? rint(rng, 1, 2) : rint(rng, 2, 3);
        var steps = [], last = null, guard = 0;
        while (steps.length < n && guard++ < 20) {
          var k = pick(rng, kinds);
          if (k === last && kinds.length > 1) continue;
          steps.push(randomStep(k, lv, rng)); last = k;
        }
        if (similar) steps.splice(rint(rng, 0, steps.length), 0, randomStep('dilate', lv, rng));
        var B = applySeq(A, steps);
        if (!B.every(function (p) { return isInt(p.x) && isInt(p.y) && inBox(p, lo, hi); })) continue;
        if (sameFigure(A, B)) continue;
        if (lv === 'g8' && isTranslationOf(A, B)) continue;
        if (A.some(function (p) { return B.some(function (q) { return samePt(p, q); }); })) continue;
        return { type: 'sequence', A: A, B: B, steps: steps, similar: similar };
      }
      return { type: 'sequence', A: [pt(1, 1), pt(4, 1), pt(1, 3)], B: [pt(6, 2), pt(9, 2), pt(6, 4)], steps: [{ kind: 'translate', dx: 5, dy: 1 }], similar: false };
    }
    function permutations(arr) {
      if (arr.length <= 1) return [arr.slice()];
      var out = [];
      arr.forEach(function (x, i) { permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); });
      return out;
    }
    // The student's sequence against the target. Each named slip is a one-change
    // repair of their own sequence: if undoing that slip maps ABC onto DEF, that
    // was the slip. Otherwise say what kind of move is still missing.
    function diagnoseSequence(steps, task) {
      var list = cleanSteps(steps);
      if (!list.length) return 'empty';
      var hits = function (alt) { return sameFigure(applySeq(task.A, alt), task.B); };
      if (hits(list)) return 'correct';
      var swap = function (i, s) { var c = list.slice(); c[i] = Object.assign({}, list[i], s); return c; };
      var i, s;
      // The right moves in the wrong order is named first: it is the truest
      // account even when a one-number change would also happen to work.
      if (list.length >= 2 && list.length <= 4) {
        var perms = permutations(list.map(function (_, j) { return j; }));
        for (var p = 1; p < perms.length; p++) if (hits(perms[p].map(function (j) { return list[j]; }))) return 'order_matters';
      }
      for (i = 0; i < list.length; i++) {
        s = list[i];
        if (s.kind === 'rotate' && s.angle !== 180 && hits(swap(i, { angle: 360 - s.angle }))) return 'rotation_direction';
        if (s.kind === 'reflect' && hits(swap(i, { line: OTHER_LINE[s.line] }))) return 'wrong_mirror';
        if (s.kind === 'translate') {
          if (hits(swap(i, { dx: s.dy, dy: s.dx }))) return 'swapped_vector';
          if (hits(swap(i, { dx: -s.dx, dy: -s.dy }))) return 'opposite';
          if (hits(swap(i, { dx: -s.dx })) || hits(swap(i, { dy: -s.dy }))) return 'one_direction';
        }
        if (s.kind === 'dilate' && hits(swap(i, { k: 1 / s.k }))) return 'reciprocal_scale';
      }
      for (i = 0; i < list.length; i++) {
        s = list[i];
        if (s.kind !== 'rotate') continue;
        for (var cx = -10; cx <= 10; cx++) for (var cy = -10; cy <= 10; cy++) {
          if (cx === s.cx && cy === s.cy) continue;
          if (hits(swap(i, { cx: cx, cy: cy }))) return 'wrong_centre';
        }
      }
      var img = applySeq(task.A, list);
      var r = sizeRatio(img, task.B);
      if (isFinite(r) && Math.abs(r - 1) > 1e-6) return task.similar && !list.some(function (q) { return q.kind === 'dilate'; }) ? 'needs_dilation' : 'size_wrong';
      if ((signedArea(img) > 0) !== (signedArea(task.B) > 0)) return 'needs_reflection';
      if (isTranslationOf(img, task.B)) return 'needs_translation';
      return 'needs_rotation';
    }
    function slipStep(s, rng) {
      if (s.kind === 'rotate' && s.angle !== 180) return { step: Object.assign({}, s, { angle: 360 - s.angle }), code: 'rotation_direction' };
      if (s.kind === 'rotate') return { step: Object.assign({}, s, { cx: s.cx + pick(rng, [1, -1, 2]), cy: s.cy + pick(rng, [1, -2]) }), code: 'wrong_centre' };
      if (s.kind === 'reflect') return { step: Object.assign({}, s, { line: OTHER_LINE[s.line] }), code: 'wrong_mirror' };
      if (s.kind === 'translate') return s.dx !== s.dy ? { step: { kind: 'translate', dx: s.dy, dy: s.dx }, code: 'swapped_vector' } : { step: { kind: 'translate', dx: -s.dx, dy: s.dy }, code: 'one_direction' };
      return { step: Object.assign({}, s, { k: 1 / s.k }), code: 'reciprocal_scale' };
    }
    function invertStep(s) {
      if (s.kind === 'translate') return { kind: 'translate', dx: -s.dx, dy: -s.dy };
      if (s.kind === 'rotate') return Object.assign({}, s, { angle: (360 - s.angle) % 360 });
      if (s.kind === 'dilate') return Object.assign({}, s, { k: 1 / s.k });
      return s;
    }
    // Every single move the builder offers (translations, reflections in any
    // offered line, quarter and half turns about any centre).
    var ALT_MOVES = null;
    function altMoves() {
      if (ALT_MOVES) return ALT_MOVES;
      var out = [], a, b;
      for (a = -20; a <= 20; a++) for (b = -20; b <= 20; b++) if (a || b) out.push({ kind: 'translate', dx: a, dy: b });
      LINES.forEach(function (l) { if (l === 'xa' || l === 'yb') { for (a = -10; a <= 10; a++) out.push({ kind: 'reflect', line: l, a: a }); } else out.push({ kind: 'reflect', line: l, a: 0 }); });
      [90, 180, 270].forEach(function (ang) { for (a = -10; a <= 10; a++) for (b = -10; b <= 10; b++) out.push({ kind: 'rotate', angle: ang, cx: a, cy: b }); });
      return (ALT_MOVES = out);
    }
    // Could a step OTHER than `wrong` be swapped for one move a student at this
    // level can build, so that Kai's sequence then maps ABC onto DEF? Then "which
    // step is wrong" would have two right answers. Grade 6 builds translations and
    // reflections in the axes; grade 8 builds every move above.
    function otherStepRepairs(A, B, steps, wrong, level) {
      var pool = altMoves().filter(function (s) { return level === 'g8' || s.kind === 'translate' || (s.kind === 'reflect' && (s.line === 'x' || s.line === 'y')); });
      for (var i = 0; i < steps.length; i++) {
        if (i === wrong) continue;
        var before = applySeq(A, steps.slice(0, i));
        var need = applySeq(B, steps.slice(i + 1).map(invertStep).reverse());
        for (var j = 0; j < pool.length; j++) {
          if (!samePt(applyStep(before[0], pool[j]), need[0])) continue;
          var alt = steps.slice(); alt[i] = pool[j];
          if (sameFigure(applySeq(A, alt), B)) return true;
        }
      }
      return false;
    }
    // "Does Kai's sequence map ABC onto DEF?" Half the time it does; otherwise one
    // step carries a named slip, and the student finds the step. Kai always uses at
    // least two steps, so the choices (each step, or "no step is wrong") number at
    // least three and a second try is never a coin flip. A slipped sequence is kept
    // only if no other step could be the one to change.
    function genJudge(level, rng, opts) {
      var lv = level === 'g5' ? 'g6' : level;
      var wantYes = chance(rng, 0.5);
      for (var i = 0; i < 300; i++) {
        var base = genSequence(lv, rng, opts);
        if (base.steps.length < 2) continue;
        if (wantYes) return { type: 'judge', A: base.A, B: base.B, proposed: base.steps, maps: true, wrongStep: -1, slip: null, fixStep: null, similar: base.similar };
        var idx = rint(rng, 0, base.steps.length - 1);
        var sl = slipStep(base.steps[idx], rng);
        var prop = base.steps.slice(); prop[idx] = sl.step;
        if (!cleanStep(sl.step)) continue;
        var img = applySeq(base.A, prop);
        if (sameFigure(img, base.B) || !img.every(function (q) { return inBox(q, -10, 10); })) continue;
        if (otherStepRepairs(base.A, base.B, prop, idx, lv)) continue;
        return { type: 'judge', A: base.A, B: base.B, proposed: prop, maps: false, wrongStep: idx, slip: sl.code, fixStep: base.steps[idx], similar: base.similar };
      }
      var g = genSequence(lv, rng, opts);
      return { type: 'judge', A: g.A, B: g.B, proposed: g.steps, maps: true, wrongStep: -1, slip: null, fixStep: null, similar: g.similar };
    }
    function rotatePt(p, angle, c) { return applyStep(p, { kind: 'rotate', angle: angle, cx: c.x, cy: c.y }); }
    function rotateSlips(item) {
      var P = item.p, C = item.c, a = item.angle, out = [];
      var dx = P.x - C.x, dy = P.y - C.y;
      out.push({ code: 'no_change', p: P });
      if (a !== 180) out.push({ code: 'rotation_direction', p: rotatePt(P, 360 - a, C) });
      if (C.x !== 0 || C.y !== 0) {
        out.push({ code: 'wrong_centre', p: rotatePt(P, a, pt(0, 0)) });
        if (a !== 180) out.push({ code: 'wrong_centre', p: rotatePt(P, 360 - a, pt(0, 0)) });
      }
      out.push({ code: 'reflected_not_rotated', p: pt(C.x + dx, C.y - dy) }, { code: 'reflected_not_rotated', p: pt(C.x - dx, C.y + dy) });
      out.push({ code: 'swap_no_sign', p: pt(C.x + dy, C.y + dx) });
      return out;
    }
    // Predict a rotation: about the origin, or (grade 8) about another centre C.
    function genRotate(level, rng) {
      for (var i = 0; i < 400; i++) {
        var P = pt(rint(rng, -7, 7), rint(rng, -7, 7));
        var C = level === 'g8' && chance(rng, 0.5) ? pt(rint(rng, -4, 4), rint(rng, -4, 4)) : pt(0, 0);
        var dx = P.x - C.x, dy = P.y - C.y;
        if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) continue;
        var angle = pick(rng, [90, 180, 270]);
        var ans = rotatePt(P, angle, C);
        if (!inBox(ans, -10, 10)) continue;
        var item = { type: 'rotate', p: P, angle: angle, c: C, answer: ans };
        if (rotateSlips(item).some(function (s) { return samePt(s.p, ans); })) continue;
        return item;
      }
      return { type: 'rotate', p: pt(3, 1), angle: 90, c: pt(0, 0), answer: pt(-1, 3) };
    }
    function firstSlip(ans, slips, answer) {
      if (samePt(ans, answer)) return 'correct';
      for (var i = 0; i < slips.length; i++) if (samePt(ans, slips[i].p)) return slips[i].code;
      return 'other';
    }
    function diagnoseRotate(ans, item) { return firstSlip(ans, rotateSlips(item), item.answer); }
    // The named dilation slip: scaling the sides while one vertex stays put
    // (the triangle grows from a corner, not from the centre of dilation).
    function dilateSlips(item) {
      var V = item.A[item.q], k = item.k, out = [{ code: 'no_change', p: V }];
      item.A.forEach(function (W, i) { if (i !== item.q) out.push({ code: 'sides_not_centre', p: pt(fix(W.x + k * (V.x - W.x)), fix(W.y + k * (V.y - W.y))) }); });
      out.push({ code: 'added_scale', p: pt(fix(V.x + k), fix(V.y + k)) });
      out.push({ code: 'reciprocal_scale', p: pt(fix(V.x / k), fix(V.y / k)) });
      out.push({ code: 'one_coordinate_scaled', p: pt(fix(V.x * k), V.y) }, { code: 'one_coordinate_scaled', p: pt(V.x, fix(V.y * k)) });
      return out;
    }
    function genDilate(level, rng) {
      for (var i = 0; i < 500; i++) {
        var k = pick(rng, [2, 3, 0.5]);
        var A = k === 0.5 ? genTriangle(rng, -4, 4, true) : genTriangle(rng, k === 3 ? -3 : -4, k === 3 ? 3 : 4);
        var img = A.map(function (p) { return pt(fix(k * p.x), fix(k * p.y)); });
        if (!img.every(function (p) { return isInt(p.x) && isInt(p.y) && inBox(p, -10, 10); })) continue;
        var q = rint(rng, 0, 2);
        var item = { type: 'dilate', A: A, k: k, q: q, answer: img[q], image: img };
        if (dilateSlips(item).some(function (s) { return samePt(s.p, item.answer); })) continue;
        return item;
      }
      var A0 = [pt(1, 1), pt(4, 1), pt(1, 3)];
      return { type: 'dilate', A: A0, k: 2, q: 1, answer: pt(8, 2), image: A0.map(function (p) { return pt(2 * p.x, 2 * p.y); }) };
    }
    function diagnoseDilate(ans, item) { return firstSlip(ans, dilateSlips(item), item.answer); }
    // Similarity: a right triangle with legs on grid lines and its dilation from
    // the origin. Ask the scale factor, or the length of an image side.
    function scaleSlips(item) {
      var k = item.k, L = item.len;
      if (item.ask === 'k') return [{ code: 'reciprocal_scale', v: 1 / k }, { code: 'difference_not_ratio', v: (k - 1) * L }, { code: 'difference_not_ratio', v: (1 - k) * L }];
      return [{ code: 'same_length', v: L }, { code: 'added_scale', v: L + k }, { code: 'reciprocal_scale', v: L / k }];
    }
    function genScale(level, rng) {
      for (var i = 0; i < 500; i++) {
        var k = pick(rng, [2, 3, 0.5, 1.5]);
        var even = k === 0.5 || k === 1.5;
        var w = rint(rng, 1, 4), hh = rint(rng, 1, 4);
        if (w === hh) continue;
        var x0 = rint(rng, -4, 2), y0 = rint(rng, -4, 2);
        var m = even ? 2 : 1;
        var A = [pt(m * x0, m * y0), pt(m * (x0 + w), m * y0), pt(m * x0, m * (y0 + hh))];
        if (A.some(function (p) { return p.x === 0 && p.y === 0; })) continue;
        var img = A.map(function (p) { return pt(fix(k * p.x), fix(k * p.y)); });
        if (!img.every(function (p) { return isInt(p.x) && isInt(p.y) && inBox(p, -10, 10); })) continue;
        if (A.some(function (p) { return img.some(function (q) { return samePt(p, q); }); })) continue;
        var ask = chance(rng, 0.5) ? 'k' : 'side';
        var L = m * w;
        var item = { type: 'scale', A: A, image: img, k: k, ask: ask, len: L, answer: ask === 'k' ? k : fix(k * L) };
        if (scaleSlips(item).some(function (s) { return Math.abs(s.v - item.answer) < 1e-6; })) continue;
        return item;
      }
      var B0 = [pt(1, 1), pt(4, 1), pt(1, 3)];
      return { type: 'scale', A: B0, image: B0.map(function (p) { return pt(2 * p.x, 2 * p.y); }), k: 2, ask: 'k', len: 3, answer: 2 };
    }
    function diagnoseScale(v, item) {
      if (!isFinite(v)) return 'other';
      if (Math.abs(v - item.answer) < 1e-6) return 'correct';
      var sl = scaleSlips(item);
      for (var i = 0; i < sl.length; i++) if (Math.abs(v - sl[i].v) < 1e-6) return sl[i].code;
      return 'other';
    }

    // \u2500\u2500 Two numerical patterns (5.OA.3) \u2500\u2500
    function genPatterns(level, rng) {
      var p = rint(rng, 1, 3), r = pick(rng, [2, 3, 4]);
      if (p * r * 4 > 36) r = 2;
      var q = p * r, A = [], B = [];
      for (var i = 0; i < 5; i++) { A.push(i * p); B.push(i * q); }
      return { type: 'patterns', addA: p, addB: q, ratio: r, A: A, B: B };
    }
    // Terms 1-4 of one pattern: right, the wrong step, the other pattern's rule,
    // or multiplying instead of adding.
    function diagnoseTerms(vals, start, add, otherAdd) {
      if (vals.some(function (v) { return !isFinite(v); })) return 'incomplete';
      var want = vals.map(function (_, i) { return start + (i + 1) * add; });
      if (vals.every(function (v, i) { return Math.abs(v - want[i]) < 1e-9; })) return 'correct';
      var d = vals[0] - start;
      var steady = vals.every(function (v, i) { return Math.abs(v - (start + (i + 1) * d)) < 1e-9; });
      if (steady && Math.abs(d - otherAdd) < 1e-9 && otherAdd !== add) return 'pattern_other_rule';
      if (steady) return 'pattern_wrong_step';
      var mult = add > 1 && vals.every(function (v, i) { return Math.abs(v - Math.pow(add, i + 1)) < 1e-9; });
      if (mult) return 'pattern_multiplied';
      return 'other';
    }
    function diagnoseFill(valsA, valsB, task) {
      var a = diagnoseTerms(valsA, task.A[0], task.addA, task.addB), b = diagnoseTerms(valsB, task.B[0], task.addB, task.addA);
      if (a === 'incomplete' || b === 'incomplete') return { code: 'incomplete', which: null };
      if (a === 'correct' && b === 'correct') return { code: 'correct', which: null };
      return a !== 'correct' ? { code: a, which: 'A' } : { code: b, which: 'B' };
    }
    function samePairs(p1, p2) { return sameFigure(p1, p2); }
    // Plotted points against the ordered pairs: swapped (y, x), row numbers used
    // for x, some missing, extras.
    function diagnosePairs(points, target, rowPairs) {
      var pts = (points || []).filter(okP);
      if (!pts.length) return 'incomplete';
      if (samePairs(pts, target)) return 'correct';
      if (samePairs(pts, target.map(function (p) { return pt(p.y, p.x); }))) return 'swapped';
      if (rowPairs && samePairs(pts, rowPairs)) return 'used_row_number';
      var hitsAll = pts.every(function (p) { return target.some(function (q) { return samePt(p, q); }); });
      if (hitsAll) return 'missing_points';
      if (target.every(function (q) { return pts.some(function (p) { return samePt(p, q); }); })) return 'extra_points';
      return 'other';
    }
    function diagnoseRelation(v, task) {
      if (!isFinite(v)) return 'other';
      if (Math.abs(v - task.ratio) < 1e-9) return 'correct';
      if (Math.abs(v - (task.addB - task.addA)) < 1e-9) return 'additive_relation';
      if (Math.abs(v - task.addB) < 1e-9) return 'gave_step';
      if (Math.abs(v - 1 / task.ratio) < 1e-9) return 'inverted_ratio';
      return 'other';
    }

    // \u2500\u2500 Tables to graphs (6.EE.9) \u2500\u2500
    var TABLE_CONTEXTS = ['plant', 'savings', 'walk', 'pool', 'stack'];
    function genTable(level, rng) {
      for (var i = 0; i < 200; i++) {
        var m, b;
        if (level === 'g8') { m = rint(rng, 2, 5); b = rint(rng, 1, 6); }
        else if (level === 'g6') { if (chance(rng, 0.5)) { m = rint(rng, 2, 5); b = 0; } else { m = 1; b = rint(rng, 2, 8); } }
        else { m = rint(rng, 2, 4); b = 0; }
        var xstep = chance(rng, 0.4) ? 2 : 1;
        var xs = [0, 1, 2, 3, 4].map(function (j) { return j * xstep; });
        var ys = xs.map(function (x) { return m * x + b; });
        if (ys[4] > 40) continue;
        var askX = xs[4] + xstep * rint(rng, 2, 3);
        return { type: 'table', ctx: pick(rng, TABLE_CONTEXTS), m: m, b: b, xstep: xstep, xs: xs, ys: ys, askX: askX, askY: m * askX + b };
      }
      return { type: 'table', ctx: 'plant', m: 2, b: 3, xstep: 1, xs: [0, 1, 2, 3, 4], ys: [3, 5, 7, 9, 11], askX: 7, askY: 17 };
    }
    function tablePairs(task) { return task.xs.map(function (x, i) { return pt(x, task.ys[i]); }); }
    function tableRowPairs(task) { return task.xstep === 1 ? null : task.ys.map(function (y, i) { return pt(i, y); }); }
    function diagnoseEquation(mv, bv, task) {
      if (!isFinite(mv) || !isFinite(bv)) return 'incomplete';
      var m = task.m, b = task.b, eq = function (a, c) { return Math.abs(a - c) < 1e-9; };
      if (eq(mv, m) && eq(bv, b)) return 'correct';
      if (b !== m && eq(mv, b) && eq(bv, m)) return 'swapped_rate_start';
      if (task.xstep !== 1 && eq(mv, m * task.xstep) && eq(bv, b)) return 'step_per_row';
      if (b !== 0 && eq(mv, m) && eq(bv, 0)) return 'forgot_start';
      if (b === 0 && eq(mv, 1) && eq(bv, m)) return 'added_not_multiplied';
      if (b !== 0 && eq(mv, task.ys[1] / task.xs[1]) && eq(bv, 0)) return 'rate_from_first';
      return 'other';
    }
    function diagnoseTablePredict(v, task) {
      if (!isFinite(v)) return 'other';
      if (Math.abs(v - task.askY) < 1e-9) return 'correct';
      if (task.b !== 0 && Math.abs(v - task.m * task.askX) < 1e-9) return 'forgot_start';
      if (task.xstep !== 1 && Math.abs(v - (task.m * task.xstep * task.askX + task.b)) < 1e-9) return 'step_per_row';
      return 'other';
    }

    // \u2500\u2500 Treasure-hunt missions \u2500\u2500
    var LANDMARKS = ['palm', 'well', 'cave', 'rock', 'hut', 'flag', 'dock', 'bridge'];
    var CLUE_KINDS = ['same_x', 'same_y', 'grid_dist', 'x_gt', 'x_lt', 'y_gt', 'y_lt', 'quadrant', 'sum', 'opp_x', 'abs_y', 'euclid'];
    function quadOf(p) { return p.x === 0 || p.y === 0 ? null : p.x > 0 ? (p.y > 0 ? 'I' : 'IV') : (p.y > 0 ? 'II' : 'III'); }
    function clueHolds(c, p, lms) {
      var L = typeof c.lm === 'number' && lms[c.lm] ? lms[c.lm].p : null;
      switch (c.kind) {
        case 'same_x': return !!L && p.x === L.x;
        case 'same_y': return !!L && p.y === L.y;
        case 'grid_dist': return !!L && ((p.x === L.x && Math.abs(p.y - L.y) === c.n) || (p.y === L.y && Math.abs(p.x - L.x) === c.n));
        case 'x_gt': return !!L && p.x > L.x;
        case 'x_lt': return !!L && p.x < L.x;
        case 'y_gt': return !!L && p.y > L.y;
        case 'y_lt': return !!L && p.y < L.y;
        case 'quadrant': return quadOf(p) === c.q;
        case 'sum': return p.x + p.y === c.n;
        case 'opp_x': return !!L && p.x === -L.x;
        case 'abs_y': return Math.abs(p.y) === c.n;
        case 'euclid': return !!L && Math.pow(p.x - L.x, 2) + Math.pow(p.y - L.y, 2) === c.n * c.n;
      }
      return false;
    }
    function missionPoints(m) { var out = []; for (var x = m.lo; x <= m.hi; x++) for (var y = m.lo; y <= m.hi; y++) out.push(pt(x, y)); return out; }
    function missionCandidates(m, upto) {
      var cl = upto == null ? m.clues : m.clues.slice(0, upto);
      return missionPoints(m).filter(function (p) { return cl.every(function (c) { return clueHolds(c, p, m.lms); }); });
    }
    // Clues are built around the hidden spot, each true of it, and kept only if
    // they narrow the search; a mission needs 2-4 clues, no single clue settles
    // it, and together they leave exactly one spot.
    function genMission(level, rng) {
      var lo = level === 'g5' ? 0 : -8, hi = level === 'g5' ? 10 : 8;
      var all = missionPoints({ lo: lo, hi: hi });
      var TRIPLES = [[3, 4, 5], [4, 3, 5], [0, 5, 5], [5, 0, 5], [6, 8, 10], [8, 6, 10]];
      for (var attempt = 0; attempt < 400; attempt++) {
        var T = pt(rint(rng, lo + 1, hi - 1), rint(rng, lo + 1, hi - 1));
        if (level !== 'g5' && (T.x === 0 || T.y === 0)) continue;
        var names = shuffle(rng, LANDMARKS), lms = [];
        var addLm = function (p) {
          if (!inBox(p, lo, hi) || samePt(p, T) || lms.some(function (l) { return samePt(l.p, p); }) || lms.length >= 3) return -1;
          lms.push({ id: names[lms.length], p: p });
          return lms.length - 1;
        };
        var mk = {
          same_x: function () { var i = addLm(pt(T.x, T.y + nz(rng, -5, 5))); return i < 0 ? null : { kind: 'same_x', lm: i }; },
          same_y: function () { var i = addLm(pt(T.x + nz(rng, -5, 5), T.y)); return i < 0 ? null : { kind: 'same_y', lm: i }; },
          grid_dist: function () { var d = rint(rng, 2, 5), dir = pick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]]); var i = addLm(pt(T.x - dir[0] * d, T.y - dir[1] * d)); return i < 0 ? null : { kind: 'grid_dist', lm: i, n: d }; },
          x_gt: function () { var i = addLm(pt(T.x - rint(rng, 1, 4), rint(rng, lo, hi))); return i < 0 ? null : { kind: 'x_gt', lm: i }; },
          x_lt: function () { var i = addLm(pt(T.x + rint(rng, 1, 4), rint(rng, lo, hi))); return i < 0 ? null : { kind: 'x_lt', lm: i }; },
          y_gt: function () { var i = addLm(pt(rint(rng, lo, hi), T.y - rint(rng, 1, 4))); return i < 0 ? null : { kind: 'y_gt', lm: i }; },
          y_lt: function () { var i = addLm(pt(rint(rng, lo, hi), T.y + rint(rng, 1, 4))); return i < 0 ? null : { kind: 'y_lt', lm: i }; },
          quadrant: function () { var q = quadOf(T); return q ? { kind: 'quadrant', q: q } : null; },
          sum: function () { return { kind: 'sum', n: T.x + T.y }; },
          opp_x: function () { if (T.x === 0) return null; var i = addLm(pt(-T.x, rint(rng, lo, hi))); return i < 0 ? null : { kind: 'opp_x', lm: i }; },
          abs_y: function () { return T.y === 0 ? null : { kind: 'abs_y', n: Math.abs(T.y) }; },
          euclid: function () { var tr = pick(rng, TRIPLES), sx = pick(rng, [1, -1]), sy = pick(rng, [1, -1]); var i = addLm(pt(T.x - sx * tr[0], T.y - sy * tr[1])); return i < 0 ? null : { kind: 'euclid', lm: i, n: tr[2] }; }
        };
        var kinds = level === 'g5' ? ['same_x', 'same_y', 'grid_dist', 'x_gt', 'x_lt', 'y_gt', 'y_lt']
          : level === 'g6' ? ['same_x', 'same_y', 'grid_dist', 'x_gt', 'x_lt', 'y_gt', 'y_lt', 'quadrant', 'sum', 'opp_x', 'abs_y']
          : ['same_x', 'same_y', 'grid_dist', 'x_gt', 'y_lt', 'quadrant', 'sum', 'opp_x', 'euclid', 'euclid'];
        var order = shuffle(rng, kinds), clues = [], cand = all;
        for (var k = 0; k < order.length && clues.length < 4; k++) {
          var keep = lms.length;
          var c = mk[order[k]]();
          if (!c) { lms.length = keep; continue; }
          var next = cand.filter(function (p) { return clueHolds(c, p, lms); });
          if (next.length >= 1 && next.length < cand.length) { clues.push(c); cand = next; if (cand.length === 1 && clues.length >= 2) break; }
          else lms.length = keep;
        }
        if (cand.length !== 1 || clues.length < 2 || !samePt(cand[0], T)) continue;
        if (clues.some(function (c) { return all.filter(function (p) { return clueHolds(c, p, lms); }).length === 1; })) continue;
        return { type: 'mission', lo: lo, hi: hi, T: T, lms: lms, clues: clues, digs: [], marks: [] };
      }
      return { type: 'mission', lo: 0, hi: 10, T: pt(4, 6), lms: [{ id: 'well', p: pt(4, 2) }, { id: 'palm', p: pt(8, 6) }], clues: [{ kind: 'same_x', lm: 0 }, { kind: 'same_y', lm: 1 }], digs: [], marks: [] };
    }
    function diagnoseDig(p, m) {
      var broken = [];
      m.clues.forEach(function (c, i) { if (!clueHolds(c, p, m.lms)) broken.push(i); });
      if (samePt(p, m.T)) return { code: 'correct', broken: [] };
      var code = m.T.x !== m.T.y && p.x === m.T.y && p.y === m.T.x ? 'swapped' : Math.abs(p.x - m.T.x) + Math.abs(p.y - m.T.y) === 1 ? 'off_by_one' : 'other';
      return { code: code, broken: broken };
    }

    // \u2500\u2500 Saved-state guards: a malformed save is dropped, never rendered \u2500\u2500
    var TF_TASKS = ['sequence', 'judge', 'rotate', 'dilate', 'scale'];
    var LEVEL_TF = { g5: ['sequence'], g6: ['sequence', 'judge'], g8: ['sequence', 'judge', 'rotate', 'dilate', 'scale'] };
    var PT_TASKS = ['patterns', 'table'];
    var LEVEL_PT = { g5: ['patterns'], g6: ['patterns', 'table'], g8: ['patterns', 'table'] };
    function tri(f) { return Array.isArray(f) && f.length === 3 && f.every(okP); }
    function nums(a, n) { return Array.isArray(a) && a.length === n && a.every(function (v) { return typeof v === 'number' && isFinite(v); }); }
    function cleanTf(t) {
      if (!t || typeof t !== 'object' || TF_TASKS.indexOf(t.type) < 0) return null;
      if (t.type === 'sequence') return tri(t.A) && tri(t.B) && cleanSteps(t.steps).length > 0 ? t : null;
      if (t.type === 'judge') return tri(t.A) && tri(t.B) && cleanSteps(t.proposed).length === (Array.isArray(t.proposed) ? t.proposed.length : -1) && typeof t.maps === 'boolean' && (t.maps || (isInt(t.wrongStep) && t.wrongStep >= 0 && t.wrongStep < t.proposed.length && !!cleanStep(t.fixStep))) ? t : null;
      if (t.type === 'rotate') return okP(t.p) && okP(t.c) && okP(t.answer) && [90, 180, 270].indexOf(t.angle) >= 0 ? t : null;
      if (t.type === 'dilate') return tri(t.A) && tri(t.image) && okP(t.answer) && isInt(t.q) && t.q >= 0 && t.q < 3 && typeof t.k === 'number' && t.k > 0 ? t : null;
      if (t.type === 'scale') return tri(t.A) && tri(t.image) && typeof t.k === 'number' && t.k > 0 && (t.ask === 'k' || t.ask === 'side') && isFinite(t.answer) && isFinite(t.len) ? t : null;
      return null;
    }
    function cleanPt(t) {
      if (!t || typeof t !== 'object') return null;
      if (t.type === 'patterns') return nums(t.A, 5) && nums(t.B, 5) && isFinite(t.addA) && isFinite(t.addB) && isFinite(t.ratio) && t.ratio > 0 ? t : null;
      if (t.type === 'table') return nums(t.xs, 5) && nums(t.ys, 5) && isFinite(t.m) && isFinite(t.b) && isFinite(t.askX) && isFinite(t.askY) && (t.xstep === 1 || t.xstep === 2) && TABLE_CONTEXTS.indexOf(t.ctx) >= 0 ? t : null;
      return null;
    }
    function cleanMission(m) {
      if (!m || typeof m !== 'object' || !okP(m.T) || !isInt(m.lo) || !isInt(m.hi) || m.hi - m.lo < 4 || m.hi - m.lo > 20) return null;
      if (!Array.isArray(m.lms) || m.lms.length > 4 || !m.lms.every(function (l) { return l && LANDMARKS.indexOf(l.id) >= 0 && okP(l.p); })) return null;
      if (!Array.isArray(m.clues) || m.clues.length < 1 || m.clues.length > 5 || !m.clues.every(function (c) { return c && CLUE_KINDS.indexOf(c.kind) >= 0 && (c.lm == null || (isInt(c.lm) && c.lm >= 0 && c.lm < m.lms.length)); })) return null;
      var cand = missionCandidates(m);
      if (cand.length !== 1 || !samePt(cand[0], m.T)) return null;
      var pts = function (a) { return Array.isArray(a) ? a.filter(function (p) { return okP(p) && isInt(p.x) && isInt(p.y); }).slice(-60) : []; };
      return Object.assign({}, m, { digs: pts(m.digs), marks: pts(m.marks) });
    }
    var P = function (p) { return p.x + ',' + p.y; };
    function tfKey(t) {
      if (!t) return null;
      if (t.type === 'sequence' || t.type === 'judge') return t.type + ':' + t.A.map(P).join(';') + '>' + t.B.map(P).join(';') + (t.type === 'judge' ? ':' + (t.maps ? 'y' : 'n' + t.wrongStep) : '');
      if (t.type === 'rotate') return 'rotate:' + P(t.p) + '@' + P(t.c) + ':' + t.angle;
      if (t.type === 'dilate') return 'dilate:' + t.A.map(P).join(';') + 'x' + t.k + ':' + t.q;
      if (t.type === 'scale') return 'scale:' + t.A.map(P).join(';') + 'x' + t.k + ':' + t.ask;
      return null;
    }
    function ptKey(t) {
      if (!t) return null;
      if (t.type === 'patterns') return 'patterns:' + t.addA + ',' + t.addB;
      if (t.type === 'table') return 'table:' + t.ctx + ':' + t.m + ',' + t.b + ',' + t.xstep;
      return null;
    }
    function thKey(m) { return m ? 'treasure:' + P(m.T) + ':' + m.clues.map(function (c) { return c.kind + (c.lm != null ? m.lms[c.lm].id + P(m.lms[c.lm].p) : '') + (c.n != null ? c.n : '') + (c.q || ''); }).join('|') : null; }
    return {
      applyStep: applyStep, applySeq: applySeq, cleanStep: cleanStep, cleanSteps: cleanSteps, sameFigure: sameFigure, signedArea: signedArea,
      scalene: scalene, sizeRatio: sizeRatio, isTranslationOf: isTranslationOf, genTriangle: genTriangle, moveKinds: moveKinds,
      genSequence: genSequence, diagnoseSequence: diagnoseSequence, genJudge: genJudge, otherStepRepairs: otherStepRepairs, genRotate: genRotate, rotateSlips: rotateSlips,
      diagnoseRotate: diagnoseRotate, genDilate: genDilate, dilateSlips: dilateSlips, diagnoseDilate: diagnoseDilate, genScale: genScale,
      diagnoseScale: diagnoseScale, genPatterns: genPatterns, diagnoseFill: diagnoseFill, diagnosePairs: diagnosePairs,
      diagnoseRelation: diagnoseRelation, genTable: genTable, tablePairs: tablePairs, tableRowPairs: tableRowPairs,
      diagnoseEquation: diagnoseEquation, diagnoseTablePredict: diagnoseTablePredict, LANDMARKS: LANDMARKS, CLUE_KINDS: CLUE_KINDS,
      clueHolds: clueHolds, missionCandidates: missionCandidates, genMission: genMission, diagnoseDig: diagnoseDig,
      TF_TASKS: TF_TASKS, LEVEL_TF: LEVEL_TF, PT_TASKS: PT_TASKS, LEVEL_PT: LEVEL_PT, TABLE_CONTEXTS: TABLE_CONTEXTS,
      cleanTf: cleanTf, cleanPt: cleanPt, cleanMission: cleanMission, tfKey: tfKey, ptKey: ptKey, thKey: thKey
    };
  })();

  // Quest labels are read by the hub outside a render, so they translate through
  // the translator of the last render (English until the tool has rendered once).
  var cgQuestT = null;
  // True while the tool moves focus itself (Start, Next, Quick game): the grid's
  // focus handler then stays silent, so it does not talk over the prompt.
  var cgQuietFocus = false;
  function __alloT(key, fallback) {
    var v = null;
    try { v = typeof cgQuestT === 'function' ? cgQuestT(key, fallback) : null; } catch (e) { v = null; }
    return v == null || v === key ? fallback : String(v);
  }
  function cgFillN(s, n) { return String(s).replace('{n}', function () { return String(n); }); }
  function cgCount(d, k) { var v = d && d[k]; return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0; }

  window.StemLab.registerTool('coordinate', {
    icon: '\uD83D\uDCCD', label: 'Coordinate Grid',
    _core: Object.assign({}, CG_CORE, CG_MORE),
    desc: 'Plot points, draw lines, calculate slope/distance/midpoint with sound effects and badges.',
    color: 'cyan', category: 'math',
    // State lives under _coordGrid (not the tool id) \u2014 this tells the hub's
    // quest checker where to look so the hooks below actually see progress.
    questDataKey: '_coordGrid',
    questHooks: [
      { id: 'plot_3', get label() { return __alloT('stem.coordgrid.quest_plot_3', 'Solve 3 plot-the-point challenges'); }, icon: '\uD83D\uDCCD', check: function(d) { return cgCount(d, 'plotsSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_plot_3_p', '{n}/3 plotted'), cgCount(d, 'plotsSolved')); } },
      { id: 'slope_3', get label() { return __alloT('stem.coordgrid.quest_slope_3', 'Solve 3 slope challenges'); }, icon: '\uD83D\uDCD0', check: function(d) { return cgCount(d, 'slopesSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_slope_3_p', '{n}/3 slopes'), cgCount(d, 'slopesSolved')); } },
      { id: 'distance_3', get label() { return __alloT('stem.coordgrid.quest_distance_3', 'Solve 3 distance challenges'); }, icon: '\uD83D\uDCCF', check: function(d) { return cgCount(d, 'distanceSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_distance_3_p', '{n}/3 distances'), cgCount(d, 'distanceSolved')); } },
      { id: 'streak_5', get label() { return __alloT('stem.coordgrid.quest_streak_5', 'Reach a streak of 5'); }, icon: '\uD83D\uDD25', check: function(d) { return cgCount(d, 'bestStreak') >= 5; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_streak_5_p', 'best {n}/5'), cgCount(d, 'bestStreak')); } },
      { id: 'name_3', get label() { return __alloT('stem.coordgrid.quest_name_3', 'Name 3 marked points'); }, icon: '\uD83D\uDD0D', check: function(d) { return cgCount(d, 'namesSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_name_3_p', '{n}/3 named'), cgCount(d, 'namesSolved')); } },
      { id: 'transform_3', get label() { return __alloT('stem.coordgrid.quest_transform_3', 'Predict 3 reflections or translations'); }, icon: '\uD83E\uDE9E', check: function(d) { return cgCount(d, 'reflectsSolved') + cgCount(d, 'translatesSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_transform_3_p', '{n}/3 predicted'), cgCount(d, 'reflectsSolved') + cgCount(d, 'translatesSolved')); } },
      { id: 'polygon_3', get label() { return __alloT('stem.coordgrid.quest_polygon_3', 'Solve 3 polygon perimeter or area problems'); }, icon: '\uD83D\uDD37', check: function(d) { return cgCount(d, 'polygonsSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_polygon_3_p', '{n}/3 polygons'), cgCount(d, 'polygonsSolved')); } },
      { id: 'sequence_3', get label() { return __alloT('stem.coordgrid.quest_sequence_3', 'Map 3 figures with a transformation sequence'); }, icon: '\uD83D\uDD04', check: function(d) { return cgCount(d, 'sequencesSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_sequence_3_p', '{n}/3 sequences'), cgCount(d, 'sequencesSolved')); } },
      { id: 'pattern_table_3', get label() { return __alloT('stem.coordgrid.quest_pattern_table_3', 'Graph 3 patterns or tables'); }, icon: '\uD83D\uDCCA', check: function(d) { return cgCount(d, 'patternsSolved') + cgCount(d, 'tablesSolved') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_pattern_table_3_p', '{n}/3 graphed'), cgCount(d, 'patternsSolved') + cgCount(d, 'tablesSolved')); } },
      { id: 'treasure_3', get label() { return __alloT('stem.coordgrid.quest_treasure_3', 'Find 3 treasures from coordinate clues'); }, icon: '\uD83D\uDDDD\uFE0F', check: function(d) { return cgCount(d, 'treasuresFound') >= 3; }, progress: function(d) { return cgFillN(__alloT('stem.coordgrid.quest_treasure_3_p', '{n}/3 found'), cgCount(d, 'treasuresFound')); } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;
      if (typeof t === 'function') cgQuestT = t;
      var isContrast = !!ctx.isContrast;
      var isDark = !!ctx.isDark;
      var themeSurface = isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc');
      var themeInk = isContrast ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a');
      var themeBorder = isContrast ? '#fbbf24' : (isDark ? '#475569' : '#cbd5e1');
      // Grid palette: literal colours (SVG presentation attributes), graphics at
      // 3:1 or better and text at 4.5:1 or better on each theme's grid surface.
      var GP = isContrast ? {
        bg: '#000000', surface: '#000000', minor: '#9ca3af', axis: '#ffffff', label: '#ffff00', point: '#00ffff', pointStroke: '#000000',
        cursor: '#ffff00', mystery: '#ff8800', image: '#ff66ff', line: '#00ffff', rise: '#ff8080', run: '#80c0ff', poly: '#66ff66',
        polyFill: 'rgba(102,255,102,0.18)', ink: '#ffffff', muted: '#ffff00', card: '#000000', cardBorder: '#ffffff', good: '#66ff66', bad: '#ff8080', btnBg: '#000000', btnInk: '#ffff00', btnBorder: '#ffff00', accent: '#ffff00'
      } : isDark ? {
        bg: '#0f172a', surface: '#0f172a', minor: '#64748b', axis: '#e2e8f0', label: '#cbd5e1', point: '#22d3ee', pointStroke: '#0f172a',
        cursor: '#fb923c', mystery: '#fb923c', image: '#c4b5fd', line: '#a5b4fc', rise: '#fca5a5', run: '#93c5fd', poly: '#86efac',
        polyFill: 'rgba(134,239,172,0.16)', ink: '#f8fafc', muted: '#cbd5e1', card: '#1e293b', cardBorder: '#64748b', good: '#86efac', bad: '#fca5a5', btnBg: '#1e293b', btnInk: '#e0f2fe', btnBorder: '#64748b', accent: '#67e8f9'
      } : {
        bg: '#ffffff', surface: '#ffffff', minor: '#7c8aa0', axis: '#334155', label: '#475569', point: '#0e7490', pointStroke: '#ffffff',
        cursor: '#c2410c', mystery: '#c2410c', image: '#6d28d9', line: '#4338ca', rise: '#b91c1c', run: '#1d4ed8', poly: '#15803d',
        polyFill: 'rgba(21,128,61,0.12)', ink: '#0f172a', muted: '#475569', card: '#f8fafc', cardBorder: '#94a3b8', good: '#15803d', bad: '#b91c1c', btnBg: '#ffffff', btnInk: '#0e7490', btnBorder: '#0e7490', accent: '#0e7490'
      };
      var cardStyle = { background: GP.card, color: GP.ink, border: '1px solid ' + GP.cardBorder, borderRadius: 12, padding: 12 };
      var btnStyle = { minHeight: 44, minWidth: 44, padding: '6px 12px', borderRadius: 8, border: '2px solid ' + GP.btnBorder, background: GP.btnBg, color: GP.btnInk, fontWeight: 700, fontSize: 13, cursor: 'pointer' };
      var btnOn = function (on) { return on ? Object.assign({}, btnStyle, { background: GP.btnInk, color: GP.btnBg }) : btnStyle; };
      var inputStyle = { minHeight: 44, padding: '6px 10px', borderRadius: 8, border: '2px solid ' + GP.cardBorder, background: isDark && !isContrast ? '#0f172a' : (isContrast ? '#000000' : '#ffffff'), color: GP.ink, fontSize: 15, fontFamily: 'monospace', width: '6rem' };
      // Fill {name} placeholders with a function so a $ in a value is never expanded.
      // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
      function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
      var fill = function (s, map) {
        var out = String(s);
        Object.keys(map || {}).forEach(function (k) { out = out.split('{' + k + '}').join(String(map[k])); });
        return __alloOneWord(out);
      };
      // A number as a reader hears it: a true minus sign, no "-0".
      var fmt = function (v) {
        if (typeof v !== 'number' || !isFinite(v)) return String(v);
        var r = Math.round(v * 100) / 100;
        if (r === 0) r = 0;
        return r < 0 ? '−' + String(-r) : String(r);
      };
      var pairText = function (p) { return '(' + fmt(p.x) + ', ' + fmt(p.y) + ')'; };
      // ── State handling ──
      var setToolSnapshots = ctx.setToolSnapshots;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = typeof ctx.setExploreScore === 'function' ? ctx.setExploreScore : function () {};
      var gridRange = ctx.gridRange && isFinite(ctx.gridRange.min) && isFinite(ctx.gridRange.max) && ctx.gridRange.max > ctx.gridRange.min ? ctx.gridRange : { min: -10, max: 10 };
      if (typeof addToast !== 'function') addToast = function () {};
      if (typeof awardXP !== 'function') awardXP = function () {};
      var hostAnnounces = typeof announceToSR === 'function';
      if (!hostAnnounces) announceToSR = function () {};
      // Announce through the host's channel when it has one, else this tool's own
      // polite live region (both at once made a screen reader say everything twice).
      var say = function (msg) {
        if (!msg) return;
        if (hostAnnounces) { try { announceToSR(msg); return; } catch (e) {} }
        try {
          var lr = document.getElementById('allo-live-coordgrid');
          if (!lr) {
            lr = document.createElement('div'); lr.id = 'allo-live-coordgrid';
            lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
            lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
            document.body.appendChild(lr);
          }
          lr.textContent = ''; lr.textContent = String(msg);
        } catch (e2) {}
      };
      var reduceMotion = false;
      try { reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
      // Unmount: stop graph sound, pending walk timers and the window key handler.
      React.useEffect(function () {
        return function () {
          try { var ga = window.StemLab && window.StemLab._graphAccess; if (ga && ga.stop) ga.stop(); } catch (e) {}
          (window._coordGridTimers || []).forEach(function (id) { clearTimeout(id); });
          window._coordGridTimers = [];
          if (window._coordGridKeyHandler) { window.removeEventListener('keydown', window._coordGridKeyHandler); window._coordGridKeyHandler = null; }
        };
      }, []);
      // Which keyboard grid has focus ('explore', 'tf', 'pt', 'th'): view-only,
      // so it never outlives the tool. (It used to persist as _coordGrid.gridFocused,
      // which stayed true after unmount and drew a stale cursor on the next visit.)
      var focusPair = React.useState(null);
      var focusApp = focusPair[0], setFocusApp = focusPair[1];
      var later = function (fn, ms) {
        var id = setTimeout(fn, ms);
        window._coordGridTimers = (window._coordGridTimers || []).filter(function (x) { return x !== id; }).concat([id]).slice(-20);
        return id;
      };
      // Scroll a task's box into view and focus its grid (Start, Next, Quick game).
      // The prompt was just announced, so the grid's own focus message is skipped.
      var focusGrid = function (sel, boxSel) {
        var n = 0;
        var go = function () {
          var el = document.querySelector(sel);
          if (!el) { if (n++ < 10) later(go, 40); return; }
          var box = (boxSel && document.querySelector(boxSel)) || el;
          var still = false;
          try { still = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
          // The box comes to the top, unless that leaves most of the control off screen:
          // focus must stay visible, so then the control itself comes into view.
          var target = box, block = 'start';
          try {
            var viewH = window.innerHeight, sc = el.parentElement;
            while (sc && sc !== document.body) { var oy = window.getComputedStyle(sc).overflowY; if ((oy === 'auto' || oy === 'scroll') && sc.clientHeight) { viewH = sc.clientHeight; break; } sc = sc.parentElement; }
            var er = el.getBoundingClientRect();
            if (er.top - box.getBoundingClientRect().top + er.height / 2 > viewH) { target = el; block = 'nearest'; }
          } catch (e) {}
          try { if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: block, behavior: still ? 'auto' : 'smooth' }); } catch (e) {}
          cgQuietFocus = true;
          try { el.focus({ preventScroll: true }); } catch (e) { try { el.focus(); } catch (e2) {} }
          cgQuietFocus = false;
        };
        later(go, 0);
      };
      // A control that had focus can go away (Check is disabled when an item ends; Show
      // the answer and Dig here disappear). Focus then lands on the result line, not on
      // the page. Does nothing while focus is still on a working control.
      var rescueFocus = function (sel) {
        later(function () {
          var a = document.activeElement;
          if (a && a !== document.body && !a.disabled) return;
          var el = document.querySelector(sel);
          if (el) { try { el.focus({ preventScroll: true }); } catch (e) {} }
        }, 0);
      };
      // The second click of a double-click or double-tap is not a second answer.
      var firstClick = function (fn) { return function (e) { if (e && e.detail > 1) return; fn(); }; };

      // ── Extended state via labToolData ──
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var _cg = labToolData._coordGrid && typeof labToolData._coordGrid === 'object' ? labToolData._coordGrid : {};
      var updCG = function(obj) {
        if (typeof setLabToolData === 'function') {
          setLabToolData(function(prev) {
            var cg = Object.assign({}, (prev && prev._coordGrid) || {}, obj);
            return Object.assign({}, prev, { _coordGrid: cg });
          });
        }
      };

      // ── Local state overrides (formerly from ctx) ──
      var finitePt = function (p) { return !!p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y); };
      var gridPoints = Array.isArray(_cg.gridPoints) ? _cg.gridPoints.filter(finitePt) : [];
      var setGridPoints = function(updater) {
        if (typeof updater === 'function') updCG({ gridPoints: updater(gridPoints) });
        else updCG({ gridPoints: updater });
      };
      var gridChallenge = CG_CORE.cleanChallenge(_cg.gridChallenge);
      var setGridChallenge = function(val) { updCG({ gridChallenge: val }); };
      var gridFeedback = _cg.gridFeedback && typeof _cg.gridFeedback === 'object' ? _cg.gridFeedback : null;
      var setGridFeedback = function(updater) {
        if (typeof updater === 'function') updCG({ gridFeedback: updater(gridFeedback) });
        else updCG({ gridFeedback: updater });
      };
      // ── Level (grade band) and teacher settings ──
      var cgTeacher = _cg.cgTeacher && typeof _cg.cgTeacher === 'object' ? _cg.cgTeacher : {};
      var isTeacher = ctx.isTeacherMode === true;
      var autoLevel = CG_CORE.bandFor(ctx.gradeLevel, ctx.gradeBand);
      var teacherLevel = CG_CORE.validLevel(cgTeacher.level);
      var cgLevel = teacherLevel || CG_CORE.validLevel(_cg.cgLevel) || autoLevel;
      var revealsAllowed = cgTeacher.reveals !== false;
      var stretchAllowed = cgTeacher.hideStretch !== true;
      // The visible grid: quadrant I (0..10) while a grade-5 task is open or when the
      // student chooses it, otherwise the host's range.
      var q1View = _cg.q1View === true;
      var viewRange = (gridChallenge ? gridChallenge.view === 'q1' : q1View) && (_cg.cgTab || 'explore') === 'explore' ? { min: 0, max: 10 } : gridRange;
      var clampV = function (v) { return Math.max(viewRange.min, Math.min(viewRange.max, Math.round(Number(v)))); };
      // The X/Y entry boxes are also the grid's keyboard cursor.
      var coordinateInputX = Number.isFinite(Number(_cg.coordinateInputX)) ? clampV(_cg.coordinateInputX) : clampV(0);
      var coordinateInputY = Number.isFinite(Number(_cg.coordinateInputY)) ? clampV(_cg.coordinateInputY) : clampV(0);
      // Once a checker has shown an item's answer, the item is locked: no more credit.
      // Keyed by the item in tool state, not in the feedback (a grid click clears that).
      var revealedItems = _cg.revealedItems;
      var gridItemKey = function(ch) { return CG_CORE.itemKey(ch); };
      var isItemLocked = function(key) {
        return !!key && !!revealedItems && typeof revealedItems === 'object' && Object.prototype.hasOwnProperty.call(revealedItems, key);
      };
      var lockItem = function(key) {
        if (key) updCG({ revealedItems: window.StemLab.grading.creditOnce(revealedItems, key).seen });
      };
      var gridItemLocked = isItemLocked(gridItemKey(gridChallenge));
      var lockedMsg = t('stem.coordgrid.answer_shown_try_next', 'Answer shown. Try the next one.');
      // XP is paid once per distinct item (a regenerated item never pays twice).
      var creditedItems = _cg.creditedItems && typeof _cg.creditedItems === 'object' ? _cg.creditedItems : {};
      var payOnce = function (key, points, reason) {
        var r = window.StemLab.grading.creditOnce(creditedItems, key || ('anon:' + reason));
        if (!r.isNew) return false;
        creditedItems = r.seen;
        updCG({ creditedItems: r.seen });
        awardXP('coordinate', points, reason);
        return true;
      };
      // Items the student missed (answer shown after two tries), for the teacher.
      var missedLog = Array.isArray(_cg.missedLog) ? _cg.missedLog.filter(function (m) { return m && typeof m === 'object'; }) : [];
      var logMiss = function (task, prompt, code) {
        updCG({ missedLog: missedLog.concat([{ task: String(task), prompt: String(prompt).slice(0, 120), code: String(code || 'other'), at: Date.now() }]).slice(-40) });
      };



      var badges = _cg.badges || {};
      var streak = _cg.streak || 0;
      var bestStreak = _cg.bestStreak || 0;
      var showAITutor = _cg.showAITutor || false;
      var aiResponse = _cg.aiResponse || '';
      var aiLoading = _cg.aiLoading || false;
      var aiQuestion = _cg.aiQuestion || '';
      var plotsSolved = _cg.plotsSolved || 0;
      var slopesSolved = _cg.slopesSolved || 0;
      var distanceSolved = _cg.distanceSolved || 0;
      var linesMade = _cg.linesMade || 0;
      var cnt = function (v) { return typeof v === 'number' && isFinite(v) && v > 0 ? v : 0; };
      var namesSolved = cnt(_cg.namesSolved), reflectsSolved = cnt(_cg.reflectsSolved), translatesSolved = cnt(_cg.translatesSolved), polygonsSolved = cnt(_cg.polygonsSolved);
      // Stage B progress (counts only).
      var NEW_COUNTERS = ['sequencesSolved', 'judgesSolved', 'rotationsSolved', 'dilationsSolved', 'scalesSolved', 'patternsSolved', 'tablesSolved', 'treasuresFound'];
      var newCounts = {};
      NEW_COUNTERS.forEach(function (k) { newCounts[k] = cnt(_cg[k]); });
      var showHelp = _cg.showHelp === true;
      var descOpen = _cg.descOpen === true;
      var gridFocused = focusApp === 'explore';
      var lastCleared = _cg.lastCleared && typeof _cg.lastCleared === 'object' ? _cg.lastCleared : null;

      // v3 additions
      var muted = _cg.muted || false;                             // global mute
      var cgTab = _cg.cgTab || 'explore';                         // active tab
      // Quadrant Tour state
      var qtClamp = function (v, fb) { var n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(gridRange.min, Math.min(gridRange.max, n)) : fb; };
      var qtPointX = _cg.qtPointX != null ? qtClamp(_cg.qtPointX, 3) : 3;
      var qtPointY = _cg.qtPointY != null ? qtClamp(_cg.qtPointY, 2) : 2;
      var qtFocusedQuad = _cg.qtFocusedQuad || null;              // 'I', 'II', 'III', 'IV' when a quad is selected
      var qtShowReflections = _cg.qtShowReflections !== false;    // default ON
      var qtWalkPhase = _cg.qtWalkPhase || 0;                     // 0=idle, 1=at (x,0), 2=at (x,y), 3=done

      // Real-World Maps tab state
      var mapScenario = _cg.mapScenario || 'chess';               // chess | battleship | world
      var chessSelected = _cg.chessSelected || 'e4';
      var chessInput = _cg.chessInput || '';
      var bsShips = Array.isArray(_cg.bsShips) ? _cg.bsShips : null;
      var bsShots = Array.isArray(_cg.bsShots) ? _cg.bsShots : [];
      var bsWon = _cg.bsWon || false;
      var bsLastResult = _cg.bsLastResult || '';
      var bsInput = _cg.bsInput || '';
      var worldCity = _cg.worldCity || 'portland_me';
      var worldClickLat = _cg.worldClickLat != null ? _cg.worldClickLat : null;
      var worldClickLon = _cg.worldClickLon != null ? _cg.worldClickLon : null;

      // Map practice modes (skill-based challenges)
      var chessPracticeOn = _cg.chessPracticeOn || false;
      var chessChallenge = _cg.chessChallenge || null;       // { type: 'name'|'find', target: 'e4' }
      var chessChallengeInput = _cg.chessChallengeInput || '';
      var chessFeedback = _cg.chessFeedback || null;         // { correct: bool, msg: string }
      var chessSolved = _cg.chessSolved || 0;
      var chessChallStreak = _cg.chessChallStreak || 0;
      var bsBest = _cg.bsBest != null ? _cg.bsBest : null;   // fewest shots to win
      var worldPracticeOn = _cg.worldPracticeOn || false;
      var worldChallenge = _cg.worldChallenge || null;       // { lat, lon, cityName }
      var worldFeedback = _cg.worldFeedback || null;
      var worldSolved = _cg.worldSolved || 0;
      var worldChallStreak = _cg.worldChallStreak || 0;

      // Function plotting (Explore tab)
      var funcsOn = _cg.funcsOn || false;
      var funcInput = _cg.funcInput || '';
      var funcs = Array.isArray(_cg.funcs) ? _cg.funcs : [];
      // New curves get colours at 3:1 or better on the grid; on a dark grid every
      // saved colour maps to a light partner.
      var FUNC_COLORS = ['#4338ca', '#047857', '#b45309', '#be185d', '#0369a1', '#7c3aed'];
      var FUNC_DARK = { '#4338ca': '#a5b4fc', '#047857': '#6ee7b7', '#b45309': '#fcd34d', '#be185d': '#f9a8d4', '#0369a1': '#7dd3fc', '#7c3aed': '#c4b5fd', '#6366f1': '#a5b4fc', '#10b981': '#6ee7b7', '#f59e0b': '#fcd34d', '#ec4899': '#f9a8d4', '#0ea5e9': '#7dd3fc', '#a855f7': '#c4b5fd' };
      var funcInk = function (col) { var k = String(col || '').toLowerCase(); return (isDark || isContrast) ? (FUNC_DARK[k] || '#e2e8f0') : (col || '#4338ca'); };

      // Safe-ish expression compiler: strip everything but digits, decimals, operators,
      // parens, x, and ^. Replace ^ with **. Wrap in Function('x', 'return ' + ...).
      // Returns null on parse error or non-finite y(0).
      // Compiled curves are cached by expression: every render used to rebuild each
      // one with new Function (twice, for the plot and the describe panel).
      var compileFunc = function (expr) {
        var cache = window._coordGridFnCache || (window._coordGridFnCache = { keys: [], map: {} });
        var k = String(expr || '');
        if (Object.prototype.hasOwnProperty.call(cache.map, k)) return cache.map[k];
        var fn = compileFuncRaw(k);
        cache.map[k] = fn; cache.keys.push(k);
        if (cache.keys.length > 40) delete cache.map[cache.keys.shift()];
        return fn;
      };
      var compileFuncRaw = function(expr) {
        var raw = (expr || '').replace(/[^0-9.+\-*\/()xX^ ]/g, '').replace(/X/g, 'x').replace(/\*\*/g, '^');
        if (!raw) return null;
        // Unary signs: JS rejects -x**2 (SyntaxError, so "-x^2" could not be graphed)
        // and reads --x / ++x as decrement / increment. A unary minus becomes (-1)*,
        // which gives -x^2 = -(x^2); a unary plus is dropped. Right after ^ the sign
        // stays, because 2**-x is valid.
        var safe = '', prevSig = '';
        for (var ui = 0; ui < raw.length; ui++) {
          var uc = raw[ui];
          var unary = (uc === '-' || uc === '+') && (prevSig === '' || '(+-*/'.indexOf(prevSig) !== -1);
          if (unary) { if (uc === '-') safe += '(-1)*'; } else safe += uc;
          if (uc !== ' ') prevSig = uc;
        }
        safe = safe.replace(/\^/g, '**');
        // Implicit multiplication: students type "2x+1" (the exact syntax the
        // error toast suggests), but `return 2x+1` is a JS SyntaxError — so
        // every suggested format failed with the warning that suggested it.
        // Insert the * a math reader assumes: 2x, 0.5x, )x, 2(, )(, x2, x(.
        // The lookaheads exclude '*' so the ** from ^ is left alone.
        safe = safe
          .replace(/(\d|\))(?=\s*[x(])/g, '$1*')
          .replace(/x(?=\s*[0-9(])/g, 'x*');
        try {
          var fn = new Function('x', 'return ' + safe);
          var probe = fn(0);
          if (typeof probe !== 'number' || isNaN(probe)) {
            var probe2 = fn(1);
            if (typeof probe2 !== 'number' || isNaN(probe2)) return null;
          }
          return fn;
        } catch (e) { return null; }
      };
      var addFunc = function(expr) {
        var trimmed = (expr || '').trim();
        if (!trimmed) return;
        if (compileFunc(trimmed) === null) {
          var bad = fill(t('stem.coordgrid.func_parse_error', 'Could not read "{expr}". Try 2x+1, -x+3, x^2 or 0.5x-2.'), { expr: trimmed });
          addToast(bad, 'warning');
          say(bad);
          return;
        }
        var newFunc = {
          id: 'f-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          expr: trimmed,
          color: FUNC_COLORS[funcs.length % FUNC_COLORS.length],
          visible: true
        };
        sfxClick();
        updCG({ funcs: funcs.concat([newFunc]), funcInput: '' });
        say(fill(t('stem.coordgrid.func_added', 'Added y = {expr}.'), { expr: trimmed }));
      };
      var removeFunc = function(id) { sfxClick(); updCG({ funcs: funcs.filter(function(f) { return f.id !== id; }) }); };
      var toggleFunc = function(id) { updCG({ funcs: funcs.map(function(f) { return f.id === id ? Object.assign({}, f, { visible: !f.visible }) : f; }) }); };

      // ═══ SOUND EFFECTS ═══
      var _audioCtx = null;
      var getAudio = function() {
        if (!_audioCtx) { try { _audioCtx = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} }
        return _audioCtx;
      };
      var playTone = function(freq, dur, type, vol) {
        if (muted) return;
        var ac = getAudio(); if (!ac) return;
        try {
          var osc = ac.createOscillator();
          var gain = ac.createGain();
          osc.type = type || 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
          osc.connect(gain); gain.connect(ac.destination);
          osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
        } catch(e) {}
      };
      var sfxCorrect = function() { playTone(523, 0.1, 'sine', 0.12); setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160); };
      var sfxWrong = function() { playTone(220, 0.25, 'sawtooth', 0.08); };
      var sfxBadge = function() { playTone(523, 0.08, 'sine', 0.1); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70); setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210); };
      var sfxClick = function() { playTone(880, 0.05, 'sine', 0.06); };
      var sfxStreak = function() { playTone(440, 0.06, 'sine', 0.1); setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100); setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150); };

      // ═══ BADGE SYSTEM ═══
      var BADGES = [
        { id: 'firstPlot', icon: '\uD83D\uDCCD', name: t('stem.coordgrid.first_plot', 'First Plot'), desc: t('stem.coordgrid.solve_your_first_challenge', 'Solve your first challenge'), check: function(u) { return u.correct >= 1; } },
        { id: 'streak3', icon: '\uD83D\uDD25', name: t('stem.coordgrid.hot_streak', 'Hot Streak'), desc: t('stem.coordgrid.get_a_streak_of_3', 'Get a streak of 3'), check: function(u) { return u.streak >= 3; } },
        { id: 'streak5', icon: '\u26A1', name: t('stem.coordgrid.lightning', 'Lightning'), desc: t('stem.coordgrid.get_a_streak_of_5', 'Get a streak of 5'), check: function(u) { return u.streak >= 5; } },
        { id: 'score10', icon: '\uD83C\uDFC5', name: t('stem.coordgrid.ten_points', 'Ten Points'), desc: t('stem.coordgrid.score_10_correct', 'Score 10 correct'), check: function(u) { return u.correct >= 10; } },
        { id: 'plotter', icon: '\uD83D\uDCCC', name: t('stem.coordgrid.plotter', 'Plotter'), desc: t('stem.coordgrid.plot_5_points_correctly', 'Plot 5 points correctly'), check: function(u) { return u.plotsSolved >= 5; } },
        { id: 'slopeMaster', icon: '\uD83D\uDCCF', name: t('stem.coordgrid.slope_master', 'Slope Master'), desc: t('stem.coordgrid.solve_5_slope_challenges', 'Solve 5 slope challenges'), check: function(u) { return u.slopesSolved >= 5; } },
        { id: 'distancePro', icon: '\uD83D\uDCCF', name: t('stem.coordgrid.distance_pro', 'Distance Pro'), desc: t('stem.coordgrid.solve_3_distance_challenges', 'Solve 3 distance challenges'), check: function(u) { return u.distanceSolved >= 3; } },
        { id: 'connector', icon: '\uD83D\uDD17', name: t('stem.coordgrid.connector', 'Connector'), desc: t('stem.coordgrid.create_5_lines', 'Create 5 lines'), check: function(u) { return u.linesMade >= 5; } },
        { id: 'allQuadrants', icon: '\uD83C\uDF0D', name: t('stem.coordgrid.globe_trotter', 'Globe Trotter'), desc: t('stem.coordgrid.plot_points_in_all_4_quadrants', 'Plot points in all 4 quadrants'), check: function(u) { return u.allQuadrants; } },
        { id: 'aiLearner', icon: '\uD83E\uDD16', name: t('stem.coordgrid.ai_learner', 'AI Learner'), desc: t('stem.coordgrid.ask_the_ai_tutor', 'Ask the AI tutor'), check: function(u) { return u.aiAsked >= 1; } },
        { id: 'chessMaster',   icon: '\u265F\uFE0F', name: t('stem.coordgrid.chess_master', 'Chess Master'),        desc: t('stem.coordgrid.solve_5_chess_notation_challenges', 'Solve 5 chess notation challenges'),     check: function(u) { return u.chessSolved >= 5; } },
        { id: 'naval',         icon: '\u2693',       name: t('stem.coordgrid.naval_strategist', 'Naval Strategist'),    desc: t('stem.coordgrid.win_battleship_in_30_shots_or_fewer', 'Win battleship in 30 shots or fewer'),  check: function(u) { return u.bsBest != null && u.bsBest <= 30; } },
        { id: 'worldExplorer', icon: '\uD83C\uDF0D', name: t('stem.coordgrid.world_geographer', 'World Geographer'),    desc: t('stem.coordgrid.identify_5_places_by_coordinates', 'Identify 5 places by coordinates'),      check: function(u) { return u.worldSolved >= 5; } },
        { id: 'pointReader',   icon: '\uD83D\uDD0D', name: t('stem.coordgrid.badge_point_reader', 'Point Reader'), desc: t('stem.coordgrid.badge_point_reader_desc', 'Name 5 marked points'), check: function(u) { return u.namesSolved >= 5; } },
        { id: 'mirrorMaker',   icon: '\uD83E\uDE9E', name: t('stem.coordgrid.badge_mirror', 'Mirror Maker'), desc: t('stem.coordgrid.badge_mirror_desc', 'Predict 5 reflections'), check: function(u) { return u.reflectsSolved >= 5; } },
        { id: 'mover',         icon: '\u27A1\uFE0F', name: t('stem.coordgrid.badge_mover', 'Mover'), desc: t('stem.coordgrid.badge_mover_desc', 'Predict 5 translations'), check: function(u) { return u.translatesSolved >= 5; } },
        { id: 'polygonPro',    icon: '\uD83D\uDD37', name: t('stem.coordgrid.badge_polygon', 'Polygon Pro'), desc: t('stem.coordgrid.badge_polygon_desc', 'Solve 5 polygon perimeter or area problems'), check: function(u) { return u.polygonsSolved >= 5; } },
        { id: 'sequencer',     icon: '\uD83D\uDD04', name: t('stem.coordgrid.badge_sequencer', 'Sequencer'), desc: t('stem.coordgrid.badge_sequencer_desc', 'Map 5 figures with transformation sequences'), check: function(u) { return u.sequencesSolved >= 5; } },
        { id: 'similarity',    icon: '\uD83D\uDD0E', name: t('stem.coordgrid.badge_similarity', 'Similarity Sleuth'), desc: t('stem.coordgrid.badge_similarity_desc', 'Solve 5 dilation or scale-factor problems'), check: function(u) { return u.dilationsSolved + u.scalesSolved >= 5; } },
        { id: 'patternSpotter', icon: '\uD83D\uDCCA', name: t('stem.coordgrid.badge_patterns', 'Pattern Spotter'), desc: t('stem.coordgrid.badge_patterns_desc', 'Graph 5 patterns or tables'), check: function(u) { return u.patternsSolved + u.tablesSolved >= 5; } },
        { id: 'treasureHunter', icon: '\uD83D\uDDDD\uFE0F', name: t('stem.coordgrid.badge_treasure', 'Treasure Hunter'), desc: t('stem.coordgrid.badge_treasure_desc', 'Find 5 treasures from coordinate clues'), check: function(u) { return u.treasuresFound >= 5; } }
      ];

      var checkBadges = function(updates) {
        var newBadges = Object.assign({}, badges);
        var awarded = false;
        var u = badgeState(updates);
        BADGES.forEach(function(b) {
          if (!newBadges[b.id] && b.check(u)) {
            newBadges[b.id] = true;
            awarded = true;
            sfxBadge();
            addToast(fill(t('stem.coordgrid.badge_toast', '{icon} Badge: {name}. {desc}'), { icon: b.icon, name: b.name, desc: b.desc }), 'success');
            awardXP('coordBadge', 15, b.name);
          }
        });
        if (awarded) updCG({ badges: newBadges });
      };

      // Check all quadrants
      var hasAllQuadrants = function(pts) {
        var q = { I: false, II: false, III: false, IV: false };
        pts.forEach(function(p) {
          if (p.x > 0 && p.y > 0) q.I = true;
          if (p.x < 0 && p.y > 0) q.II = true;
          if (p.x < 0 && p.y < 0) q.III = true;
          if (p.x > 0 && p.y < 0) q.IV = true;
        });
        return q.I && q.II && q.III && q.IV;
      };
      // Every counter a badge reads, with this action's new values laid over it.
      var badgeState = function (over) {
        return Object.assign({
          correct: exploreScore.correct, streak: streak, plotsSolved: plotsSolved, slopesSolved: slopesSolved,
          distanceSolved: distanceSolved, linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
          aiAsked: _cg.aiAsked || 0, chessSolved: chessSolved, bsBest: bsBest, worldSolved: worldSolved,
          namesSolved: namesSolved, reflectsSolved: reflectsSolved, translatesSolved: translatesSolved, polygonsSolved: polygonsSolved
        }, newCounts, over || {});
      };

      // ── Grid math ──
      // User units: the SVG scales to its box (viewBox), and clicks map back through
      // the rendered size, so the grid fits a phone without scrolling.
      var gridW = 400, gridH = 400;
      var range = viewRange.max - viewRange.min;
      var step = gridW / range;

      var toSvg = function(v, axis) {
        return axis === 'x' ? (v - viewRange.min) * step : gridH - (v - viewRange.min) * step;
      };
      var fromSvg = function(px, axis) {
        return axis === 'x' ? Math.round(px / step + viewRange.min) : Math.round((gridH - px) / step + viewRange.min);
      };
      var inView = function (p) { return finitePt(p) && p.x >= viewRange.min && p.x <= viewRange.max && p.y >= viewRange.min && p.y <= viewRange.max; };
      var QUAD_NAMES = {
        I: t('stem.coordgrid.quad_name_i', 'quadrant I'), II: t('stem.coordgrid.quad_name_ii', 'quadrant II'),
        III: t('stem.coordgrid.quad_name_iii', 'quadrant III'), IV: t('stem.coordgrid.quad_name_iv', 'quadrant IV'),
        origin: t('stem.coordgrid.quad_name_origin', 'the origin'), xaxis: t('stem.coordgrid.quad_name_xaxis', 'the x-axis'), yaxis: t('stem.coordgrid.quad_name_yaxis', 'the y-axis')
      };
      var quadName = function (x, y) { return QUAD_NAMES[CG_CORE.quadrantOf(x, y)]; };
      // The same place as a phrase with its own preposition (in / on / at).
      var QUAD_WHERE = {
        I: t('stem.coordgrid.where_i', 'in quadrant I'), II: t('stem.coordgrid.where_ii', 'in quadrant II'), III: t('stem.coordgrid.where_iii', 'in quadrant III'), IV: t('stem.coordgrid.where_iv', 'in quadrant IV'),
        origin: t('stem.coordgrid.where_origin', 'at the origin'), xaxis: t('stem.coordgrid.where_xaxis', 'on the x-axis'), yaxis: t('stem.coordgrid.where_yaxis', 'on the y-axis')
      };
      var quadWhere = function (x, y) { return QUAD_WHERE[CG_CORE.quadrantOf(x, y)]; };
      // "3 right, 2 down": the movement form of an ordered pair.
      var moveWords = function (x, y) {
        if (x === 0 && y === 0) return t('stem.coordgrid.move_at_origin', 'at the origin');
        var hx = x === 0 ? t('stem.coordgrid.move_no_across', 'no move across') : fill(x > 0 ? t('stem.coordgrid.move_right', '{n} right') : t('stem.coordgrid.move_left', '{n} left'), { n: Math.abs(x) });
        var vy = y === 0 ? t('stem.coordgrid.move_no_updown', 'no move up or down') : fill(y > 0 ? t('stem.coordgrid.move_up', '{n} up') : t('stem.coordgrid.move_down', '{n} down'), { n: Math.abs(y) });
        return fill(t('stem.coordgrid.move_pair', '{across}, then {updown}'), { across: hx, updown: vy });
      };

      // ── Connect mode & lines: their own state, so a plot, a check or turning
      // Connect off never erases a drawn line. Saves from before 2026-11-03 kept
      // them inside gridFeedback; read those once as a fallback.
      var legacyFb = gridFeedback || {};
      var connectMode = typeof _cg.connectMode === 'boolean' ? _cg.connectMode : !!legacyFb.connectMode;
      var gridLines = (Array.isArray(_cg.gridLines) ? _cg.gridLines : (Array.isArray(legacyFb.lines) ? legacyFb.lines : [])).filter(function (ln) { return ln && finitePt(ln.from) && finitePt(ln.to) && ln.slope; });
      var connectFirst = _cg.connectFirst != null ? _cg.connectFirst : (legacyFb.connectFirst != null ? legacyFb.connectFirst : null);
      if (typeof connectFirst !== 'number' || !gridPoints[connectFirst]) connectFirst = null;
      var setLines = function (lines, extra) { updCG(Object.assign({ gridLines: lines }, extra || {})); };

      var calcSlope = function(p1, p2) {
        var dy = p2.y - p1.y;
        var dx = p2.x - p1.x;
        if (dx === 0) return { rise: dy, run: 0, value: 'undefined', display: 'undefined' };
        var gcdFn = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var tmp = b; b = a % tmp; a = tmp; } return a || 1; };
        var g = gcdFn(dy, dx);
        var num = dy / g; var den = dx / g;
        // Normalize the sign into the numerator, then drop a /1 denominator —
        // without the second step a slope of -2 displayed as "-2/1".
        if (den < 0) { num = -num; den = -den; }
        var frac = den === 1 ? '' + num : num + '/' + den;
        return { rise: dy, run: dx, value: dy / dx, display: frac };
      };

      var calcLineEq = function(p, slope) {
        if (slope.run === 0) return 'x = ' + p.x;
        var m = slope.value;
        var b = p.y - m * p.x;
        var bRound = Math.round(b * 100) / 100;
        var mStr = slope.display;
        if (bRound === 0) return 'y = ' + mStr + 'x';
        var sign = bRound > 0 ? ' + ' : ' \u2212 ';
        return 'y = ' + mStr + 'x' + sign + Math.abs(bRound);
      };

      var calcDistance = function(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      };

      var calcMidpoint = function(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      };
      // Kept for tests/stem_coordgrid_engine.test.js (the UI uses CG_CORE.quadrantOf).
      var getQuadrant = function(x, y) {
        if (x === 0 || y === 0) return x === 0 && y === 0 ? 'Origin' : x === 0 ? 'Y-axis' : 'X-axis';
        if (x > 0 && y > 0) return 'Q I';
        if (x < 0 && y > 0) return 'Q II';
        if (x < 0 && y < 0) return 'Q III';
        return 'Q IV';
      };

      // ── Click handler ── (pointer clicks map through the rendered size)
      var processClick = function(clientX, clientY, svgEl) {
        var rect = svgEl.getBoundingClientRect();
        // The SVG is scaled to its box: map screen pixels back to user units.
        var sx = rect.width ? gridW / rect.width : 1, sy = rect.height ? gridH / rect.height : 1;
        processGridCoordinate(fromSvg((clientX - rect.left) * sx, 'x'), fromSvg((clientY - rect.top) * sy, 'y'));
      };

      // A tap is handled by its click alone. A touchstart handler used to plot too
      // (React's touch listeners are passive, so its preventDefault never stopped
      // the click): one tap plotted twice, or plotted and then removed the point.
      var handleGridClick = function(e) { if (e.detail > 1) return; processClick(e.clientX, e.clientY, e.currentTarget); };
      // ── Task state ──
      var taskType = gridChallenge ? gridChallenge.type : null;
      var pointTask = taskType === 'name' || taskType === 'reflect' || taskType === 'translate';
      var fixedTask = taskType === 'slope' || taskType === 'distance' || taskType === 'polygon';
      var taskSolved = !!(gridChallenge && gridFeedback && gridFeedback.correct);
      var taskDone = !!(gridChallenge && (taskSolved || gridItemLocked));
      var taskTries = gridChallenge && typeof gridChallenge.tries === 'number' ? gridChallenge.tries : 0;
      // Hint level lives on the challenge (a grid click or a reload cannot erase it).
      // Saves from before 2026-11-03 kept a slope hint as gridFeedback.hinted.
      var taskHint = gridChallenge ? Math.max(typeof gridChallenge.hint === 'number' ? gridChallenge.hint : 0, (taskType === 'slope' && gridFeedback && gridFeedback.hinted) ? 2 : 0) : 0;
      // Every tab: two tries, then the item closes (no credit). The answer appears
      // only when the student chooses "Show the answer" (and the teacher allows it).
      var answerShown = !!(gridItemLocked && revealsAllowed && gridFeedback && gridFeedback.revealed);
      var closedText = function (shownNow) {
        return !revealsAllowed ? t('stem.coordgrid.item_closed', 'This one is closed. Try the next one.')
          : shownNow ? lockedMsg : t('stem.coordgrid.item_closed_can_show', 'Two tries used: this one no longer earns credit. Show the answer, or try the next one.');
      };
      var lockedText = closedText(answerShown);
      var secondTryNote = t('stem.coordgrid.second_try_note2', 'Second try. If this one misses too, the item closes and you can choose to see the answer.');
      var sameAnswerNote = t('stem.coordgrid.same_answer_again', 'That is the same answer you just checked, so it did not use your second try. Change it, then check.');
      // The "Show the answer" button, the same on every tab.
      var revealBtn = function (show, onReveal, key) {
        return show ? h('button', { key: key || 'reveal', type: 'button', 'data-coordgrid-reveal': 'true', onClick: onReveal, style: Object.assign({}, btnStyle, { marginTop: 8, borderStyle: 'dashed' }) }, t('stem.coordgrid.show_answer', 'Show the answer')) : null;
      };

      var MISC = {
        swapped: t('stem.coordgrid.mc_swapped', 'Check the order: the first number is x (across) and the second is y (up or down). You swapped them.'),
        sign_x: t('stem.coordgrid.mc_sign_x', 'Your x has the wrong sign. Right of the origin is positive and left is negative.'),
        sign_y: t('stem.coordgrid.mc_sign_y', 'Your y has the wrong sign. Above the origin is positive and below is negative.'),
        sign_both: t('stem.coordgrid.mc_sign_both', 'Both signs are flipped. Check which way each number tells you to move.'),
        off_by_one: t('stem.coordgrid.mc_off_by_one', 'Very close: you are one unit away. Count the spaces between grid lines, not the lines.'),
        no_change: t('stem.coordgrid.mc_no_change', 'That is the starting point. The point has to move.'),
        wrong_axis: t('stem.coordgrid.mc_wrong_axis', 'That is the reflection across the other axis. Across the x-axis, y changes sign; across the y-axis, x changes sign.'),
        both_flipped: t('stem.coordgrid.mc_both_flipped', 'You changed both signs. A reflection across one axis changes only one coordinate.'),
        one_flipped: t('stem.coordgrid.mc_one_flipped', 'A reflection through the origin changes the sign of both coordinates.'),
        swapped_vector: t('stem.coordgrid.mc_swapped_vector', 'You put the left-right move on y and the up-down move on x. Left and right change x; up and down change y.'),
        opposite: t('stem.coordgrid.mc_opposite', 'You moved the opposite way. Right and up add; left and down subtract.'),
        one_direction: t('stem.coordgrid.mc_one_direction', 'One of your moves went the wrong way. Check the direction of each move.'),
        one_coordinate: t('stem.coordgrid.mc_one_coordinate', 'You moved only one coordinate. This translation moves across and up or down.'),
        subtracted_across_axis: t('stem.coordgrid.mc_subtracted_across_axis', 'The points are on opposite sides of an axis, so add their distances from the axis instead of subtracting.'),
        counted_points: t('stem.coordgrid.mc_counted_points', 'It looks like you counted grid points instead of the spaces between them.'),
        added_same_side: t('stem.coordgrid.mc_added_same_side', 'Both points are on the same side of the axis, so subtract their distances from the axis.'),
        negative: t('stem.coordgrid.mc_negative', 'A distance is never negative.'),
        added_legs: t('stem.coordgrid.mc_added_legs', 'You added the legs. The straight-line distance is the hypotenuse: square the legs, add, then take the square root.'),
        no_sqrt: t('stem.coordgrid.mc_no_sqrt', 'You found the sum of the squares. Take the square root to finish.'),
        one_leg: t('stem.coordgrid.mc_one_leg', 'That is one leg of the right triangle. The distance is the slanted side.'),
        mixed_direction: t('stem.coordgrid.mc_mixed_direction', 'Read rise and run in the same direction: both from the first point to the second, or both the other way.'),
        rise_run_swapped: t('stem.coordgrid.mc_rise_run_swapped', 'Rise is the vertical change (y) and run is the horizontal change (x). You swapped them.'),
        reciprocal: t('stem.coordgrid.mc_reciprocal', 'Your slope is upside down. Slope is rise over run: the vertical change divided by the horizontal change.'),
        slope_sign: t('stem.coordgrid.mc_slope_sign', 'Check the sign. A line that goes down from left to right has a negative slope.'),
        slope_from_pair: t('stem.coordgrid.mc_slope_from_pair', 'Your rise and run are right. Now divide rise by run and simplify.'),
        gave_perimeter: t('stem.coordgrid.mc_gave_perimeter', 'That is the perimeter, not the area. Area counts the unit squares inside.'),
        gave_area: t('stem.coordgrid.mc_gave_area', 'That is the area, not the perimeter. Perimeter is the distance around the outside.'),
        no_half: t('stem.coordgrid.mc_no_half', 'A right triangle is half of a rectangle. Did you remember to halve?'),
        half_perimeter: t('stem.coordgrid.mc_half_perimeter', 'You added two sides. The perimeter goes all the way around: four sides.'),
        other: t('stem.coordgrid.mc_other', 'Not yet.')
      };
      var MISC_NAMES = {
        swapped: t('stem.coordgrid.mcn_swapped', 'Swapped x and y'), sign_x: t('stem.coordgrid.mcn_sign_x', 'Sign of x'), sign_y: t('stem.coordgrid.mcn_sign_y', 'Sign of y'),
        sign_both: t('stem.coordgrid.mcn_sign_both', 'Both signs'), off_by_one: t('stem.coordgrid.mcn_off_by_one', 'Off by one'), no_change: t('stem.coordgrid.mcn_no_change', 'Did not move the point'),
        wrong_axis: t('stem.coordgrid.mcn_wrong_axis', 'Reflected across the other axis'), both_flipped: t('stem.coordgrid.mcn_both_flipped', 'Flipped both signs'), one_flipped: t('stem.coordgrid.mcn_one_flipped', 'Flipped one sign'),
        swapped_vector: t('stem.coordgrid.mcn_swapped_vector', 'Moves on the wrong coordinate'), opposite: t('stem.coordgrid.mcn_opposite', 'Moved the opposite way'), one_direction: t('stem.coordgrid.mcn_one_direction', 'One move reversed'),
        one_coordinate: t('stem.coordgrid.mcn_one_coordinate', 'Moved one coordinate only'), subtracted_across_axis: t('stem.coordgrid.mcn_subtracted_across_axis', 'Subtracted across an axis'),
        counted_points: t('stem.coordgrid.mcn_counted_points', 'Counted points, not spaces'), added_same_side: t('stem.coordgrid.mcn_added_same_side', 'Added on the same side'), negative: t('stem.coordgrid.mcn_negative', 'Negative distance'),
        added_legs: t('stem.coordgrid.mcn_added_legs', 'Added the legs'), no_sqrt: t('stem.coordgrid.mcn_no_sqrt', 'No square root'), one_leg: t('stem.coordgrid.mcn_one_leg', 'Gave one leg'),
        mixed_direction: t('stem.coordgrid.mcn_mixed_direction', 'Mixed rise and run directions'), rise_run_swapped: t('stem.coordgrid.mcn_rise_run_swapped', 'Swapped rise and run'), reciprocal: t('stem.coordgrid.mcn_reciprocal', 'Run over rise'),
        slope_sign: t('stem.coordgrid.mcn_slope_sign', 'Slope sign'), slope_from_pair: t('stem.coordgrid.mcn_slope_from_pair', 'Division step'), gave_perimeter: t('stem.coordgrid.mcn_gave_perimeter', 'Gave perimeter for area'),
        gave_area: t('stem.coordgrid.mcn_gave_area', 'Gave area for perimeter'), no_half: t('stem.coordgrid.mcn_no_half', 'Forgot to halve'), half_perimeter: t('stem.coordgrid.mcn_half_perimeter', 'Added two sides only'),
        other: t('stem.coordgrid.mcn_other', 'Other')
      };
      var TASK_NAMES = {
        plot: t('stem.coordgrid.task_plot', 'Plot a point'), name: t('stem.coordgrid.task_name', 'Name the point'), reflect: t('stem.coordgrid.task_reflect', 'Predict a reflection'),
        translate: t('stem.coordgrid.task_translate', 'Predict a translation'), distance: t('stem.coordgrid.task_distance', 'Find a distance'), polygon: t('stem.coordgrid.task_polygon', 'Polygon perimeter and area'),
        slope: t('stem.coordgrid.task_slope', 'Find a slope')
      };
      var LEVEL_NAMES = {
        g5: t('stem.coordgrid.level_g5', 'Grade 5: quadrant I'),
        g6: t('stem.coordgrid.level_g6', 'Grade 6: four quadrants'),
        g8: t('stem.coordgrid.level_g8', 'Grade 8: Pythagoras and slope')
      };
      var vertexName = function (i) { return String.fromCharCode(65 + i); };
      // The task prompt as one whole sentence (shown, announced and kept in the missed log).
      var promptFor = function (ch) {
        if (!ch) return '';
        if (ch.type === 'plot') return fill(t('stem.coordgrid.prompt_plot', 'Plot the point {pair}.'), { pair: pairText(ch.target) });
        if (ch.type === 'name') return t('stem.coordgrid.prompt_name', 'A point is marked on the grid. What are its coordinates?');
        if (ch.type === 'reflect') {
          var rk = ch.axis === 'x' ? t('stem.coordgrid.prompt_reflect_x', 'Reflect point P {pair} across the x-axis. Predict the image P′, then check.')
            : ch.axis === 'y' ? t('stem.coordgrid.prompt_reflect_y', 'Reflect point P {pair} across the y-axis. Predict the image P′, then check.')
            : t('stem.coordgrid.prompt_reflect_o', 'Reflect point P {pair} through the origin. Predict the image P′, then check.');
          return fill(rk, { pair: pairText(ch.p) });
        }
        if (ch.type === 'translate') {
          var mv = moveWords(ch.v.dx, ch.v.dy);
          return fill(t('stem.coordgrid.prompt_translate', 'Translate point P {pair}: {moves}. Predict the image P′, then check.'), { pair: pairText(ch.p), moves: mv });
        }
        if (ch.type === 'distance') {
          return fill(ch.kind === 'pythag'
            ? t('stem.coordgrid.prompt_distance_pythag', 'Find the distance from {a} to {b}. Round to the nearest tenth.')
            : t('stem.coordgrid.prompt_distance_axis', 'Find the distance from {a} to {b}.'), { a: pairText(ch.p1), b: pairText(ch.p2) });
        }
        if (ch.type === 'polygon') {
          var list = ch.vertices.map(function (v, i) { return vertexName(i) + ' ' + pairText(v); }).join(', ');
          return fill(ch.ask === 'area'
            ? t('stem.coordgrid.prompt_polygon_area', 'Find the area of polygon {name}, in square units. Its vertices are {list}.')
            : t('stem.coordgrid.prompt_polygon_perimeter', 'Find the perimeter of polygon {name}, in units. Its vertices are {list}.'), { name: ch.vertices.map(function (v, i) { return vertexName(i); }).join(''), list: list });
        }
        if (ch.type === 'slope') return fill(t('stem.coordgrid.prompt_slope', 'Find the slope from {a} to {b}.'), { a: pairText(ch.p1), b: pairText(ch.p2) });
        return '';
      };
      // The answer, shown only after two missed tries (and only if the teacher allows it).
      var answerText = function (ch) {
        if (!ch) return '';
        if (ch.type === 'plot') return fill(t('stem.coordgrid.answer_plot', 'The point {pair} is now marked on the grid: from the origin, {moves}.'), { pair: pairText(ch.target), moves: moveWords(ch.target.x, ch.target.y) });
        if (ch.type === 'name') return fill(t('stem.coordgrid.answer_name', 'The marked point is {pair}: from the origin, {moves}.'), { pair: pairText(ch.target), moves: moveWords(ch.target.x, ch.target.y) });
        if (ch.type === 'reflect' || ch.type === 'translate') return fill(t('stem.coordgrid.answer_image', 'The image is P′ {pair}. It is now drawn on the grid.'), { pair: pairText(ch.answer) });
        if (ch.type === 'distance') return fill(t('stem.coordgrid.answer_distance', 'Distance = {d}.'), { d: ch.kind === 'axis' ? fmt(ch.distance) : ch.distance.toFixed(1) });
        if (ch.type === 'polygon') return fill(ch.ask === 'area' ? t('stem.coordgrid.answer_area', 'The area is {n} square units.') : t('stem.coordgrid.answer_perimeter', 'The perimeter is {n} units.'), { n: fmt(ch.answer) });
        if (ch.type === 'slope') return fill(t('stem.coordgrid.answer_slope', 'Answer: rise should be {rise}, run should be {run}, slope should be {slope}.'), { rise: ch.slopeData.rise, run: ch.slopeData.run, slope: ch.slopeData.display });
        return '';
      };
      var COUNTER = { plot: 'plotsSolved', name: 'namesSolved', reflect: 'reflectsSolved', translate: 'translatesSolved', distance: 'distanceSolved', polygon: 'polygonsSolved', slope: 'slopesSolved' };
      var XP_REASON = { plot: 'plot point', name: 'name point', reflect: 'reflection', translate: 'translation', distance: 'distance calc', polygon: 'polygon measure', slope: 'slope calc' };
      var COUNT_NOW = { plotsSolved: plotsSolved, namesSolved: namesSolved, reflectsSolved: reflectsSolved, translatesSolved: translatesSolved, distanceSolved: distanceSolved, polygonsSolved: polygonsSolved, slopesSolved: slopesSolved };

      // One graded attempt. Right: credit (full on a clean first try, reduced after a
      // hint or a miss), paid once per item. First miss: a named misconception and a
      // second try, answer hidden. Second miss: the answer (if allowed), item locked,
      // logged for the teacher.
      var finishAttempt = function (ok, code, fbPatch, sig) {
        var ch = gridChallenge, key = gridItemKey(ch), type = ch.type;
        // The answer that just missed, checked again unchanged: no try used, no score.
        if (!ok && sig && taskTries === 1 && ch.lastSig === sig) {
          var sameMsg = '❌ ' + (MISC[ch.lastCode] || MISC.other) + ' ' + sameAnswerNote;
          setGridFeedback(function (prev) { return Object.assign({}, prev, fbPatch || {}, { correct: false, msg: sameMsg }); });
          say(sameMsg);
          return;
        }
        var hinted = taskHint > 0;
        var counterKey = COUNTER[type];
        if (ok) {
          var clean = taskTries === 0 && !hinted;
          var newStreak = hinted ? streak : streak + 1;
          var newCount = (COUNT_NOW[counterKey] || 0) + 1;
          var upd = { streak: newStreak, bestStreak: Math.max(bestStreak, newStreak) };
          upd[counterKey] = newCount;
          updCG(upd);
          var okMsg = '✅ ' + (clean ? t('stem.coordgrid.correct_first', 'Correct!')
            : hinted ? t('stem.coordgrid.correct_hinted', 'Correct, with a hint.')
            : t('stem.coordgrid.correct_second', 'Correct on your second try.'));
          var explain = explainFor(ch);
          setGridFeedback(function (prev) { return Object.assign({}, prev, fbPatch || {}, { correct: true, msg: okMsg + (explain ? ' ' + explain : '') }); });
          rescueFocus('#coordgrid-task-feedback');
          setExploreScore(function (prev) { return { correct: prev.correct + 1, total: prev.total + 1 }; });
          if (clean) { sfxCorrect(); if (newStreak >= 3) sfxStreak(); } else sfxCorrect();
          payOnce(key, clean ? 5 : 2, XP_REASON[type]);
          say(okMsg + (explain ? ' ' + explain : ''));
          var over = { correct: exploreScore.correct + 1, streak: newStreak };
          over[counterKey] = newCount;
          checkBadges(over);
          return;
        }
        var tries = taskTries + 1;
        sfxWrong();
        setExploreScore(function (prev) { return { correct: prev.correct, total: prev.total + 1 }; });
        var named = MISC[code] || MISC.other;
        if (tries < 2) {
          updCG({ streak: 0, gridChallenge: Object.assign({}, ch, { tries: tries, lastCode: code, lastSig: sig || null }) });
          var again = '❌ ' + named + ' ' + t('stem.coordgrid.try_once_more', 'Try once more.');
          setGridFeedback(function (prev) { return Object.assign({}, prev, fbPatch || {}, { correct: false, msg: again }); });
          say(again);
          return;
        }
        updCG({ streak: 0, gridChallenge: Object.assign({}, ch, { tries: tries, lastCode: code }) });
        lockItem(key);
        logMiss(type, promptFor(ch), code);
        var closed = '❌ ' + named + ' ' + (revealsAllowed ? t('stem.coordgrid.two_tries_used', 'That was your second try, so this item no longer earns credit.') : t('stem.coordgrid.no_reveal', 'Your teacher can go over this one with you.'));
        setGridFeedback(function (prev) { return Object.assign({}, prev, fbPatch || {}, { correct: false, msg: closed, revealed: false }); });
        rescueFocus('#coordgrid-task-feedback');
        say(closed + ' ' + closedText(false));
      };
      // The student asks for the answer of a closed item: shown, never credited.
      var showGridAnswer = function () {
        if (!gridChallenge || !gridItemLocked || !revealsAllowed) return;
        var msg = answerText(gridChallenge);
        setGridFeedback(function (prev) { return Object.assign({}, prev, { correct: false, msg: msg, revealed: true }); });
        rescueFocus('#coordgrid-task-feedback');
        say(msg + ' ' + lockedMsg);
      };
      // After a solve: the rule behind the answer, so the check teaches.
      var explainFor = function (ch) {
        if (!ch) return '';
        if (ch.type === 'reflect') return ch.axis === 'x' ? t('stem.coordgrid.explain_reflect_x', 'Across the x-axis, x stays the same and y changes sign.')
          : ch.axis === 'y' ? t('stem.coordgrid.explain_reflect_y', 'Across the y-axis, y stays the same and x changes sign.')
          : t('stem.coordgrid.explain_reflect_o', 'Through the origin, both coordinates change sign.');
        if (ch.type === 'translate') return fill(t('stem.coordgrid.explain_translate', 'Add {dx} to x and {dy} to y.'), { dx: fmt(ch.v.dx), dy: fmt(ch.v.dy) });
        if (ch.type === 'distance' && ch.kind === 'pythag') {
          var dx = Math.abs(ch.p2.x - ch.p1.x), dy = Math.abs(ch.p2.y - ch.p1.y);
          return fill(t('stem.coordgrid.explain_pythag', 'The legs are {a} and {b}, so the distance is the square root of {a}² + {b}² = {s}.'), { a: dx, b: dy, s: dx * dx + dy * dy });
        }
        if (ch.type === 'polygon' && ch.shape === 'tri') return fill(t('stem.coordgrid.explain_triangle', 'The legs are {w} and {h}, so the area is half of {w} × {h}.'), { w: ch.w, h: ch.h });
        return '';
      };

      // ── Grid clicks and the keyboard cursor ──
      var processGridCoordinate = function(x, y) {
        x = Math.round(Number(x));
        y = Math.round(Number(y));
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x < viewRange.min || x > viewRange.max || y < viewRange.min || y > viewRange.max) return;
        if (x !== coordinateInputX || y !== coordinateInputY) updCG({ coordinateInputX: x, coordinateInputY: y });
        if (taskDone) { say(t('stem.coordgrid.task_done_click', 'This task is finished. Start a new one to keep plotting.')); return; }
        // Predict tasks: a click sets the prediction (typing works too).
        if (taskType === 'reflect' || taskType === 'translate') {
          sfxClick();
          setGridFeedback(function (prev) { return Object.assign({}, prev, { ansX: String(x), ansY: String(y), correct: false, msg: null }); });
          say(fill(t('stem.coordgrid.prediction_set', 'Your prediction is {pair}. Check it when you are ready.'), { pair: pairText({ x: x, y: y }) }));
          return;
        }
        // These tasks bring their own points; reading the marked point is the task.
        if (fixedTask || taskType === 'name') { say(t('stem.coordgrid.task_points_fixed', 'This task gives its own points. Answer in the boxes below the grid.')); return; }

        sfxClick();

        if (connectMode) {
          var clickedIdx = -1;
          for (var ci = 0; ci < gridPoints.length; ci++) {
            if (gridPoints[ci].x === x && gridPoints[ci].y === y) { clickedIdx = ci; break; }
          }
          var here = { x: x, y: y };
          if (clickedIdx < 0) {
            var newIdx = gridPoints.length;
            setGridPoints(gridPoints.concat([here]));
            if (connectFirst === null) {
              updCG({ connectFirst: newIdx });
              say(fill(t('stem.coordgrid.connect_first', 'Line starts at {pair}. Choose a second point.'), { pair: pairText(here) }));
            } else {
              addLine(gridPoints[connectFirst], here);
            }
            return;
          }
          if (connectFirst === null) {
            updCG({ connectFirst: clickedIdx });
            say(fill(t('stem.coordgrid.connect_first', 'Line starts at {pair}. Choose a second point.'), { pair: pairText(here) }));
          } else if (clickedIdx !== connectFirst) {
            addLine(gridPoints[connectFirst], gridPoints[clickedIdx]);
          }
          return;
        }

        var existing = -1;
        for (var ei = 0; ei < gridPoints.length; ei++) {
          if (gridPoints[ei].x === x && gridPoints[ei].y === y) { existing = ei; break; }
        }
        var nextPts;
        if (existing >= 0) {
          nextPts = gridPoints.filter(function(_, i) { return i !== existing; });
          say(fill(t('stem.coordgrid.point_removed', 'Removed the point {pair}.'), { pair: pairText({ x: x, y: y }) }));
        } else {
          nextPts = gridPoints.concat([{ x: x, y: y }]);
          // A plot task grades only on Check, and only with one point on the grid.
          say(fill(taskType === 'plot' && nextPts.length === 1 ? t('stem.coordgrid.point_plotted_then_check', 'Plotted {pair}, {where}. Then choose Check.') : t('stem.coordgrid.point_plotted', 'Plotted {pair}, {where}.'), { pair: pairText({ x: x, y: y }), where: quadWhere(x, y) }));
        }
        setGridPoints(nextPts);
        // Only a plot task's message goes stale on a new point; lines and other state stay.
        if (taskType === 'plot') setGridFeedback(null);
        if (!gridChallenge && hasAllQuadrants(nextPts) && !badges.allQuadrants) checkBadges({ allQuadrants: true });
      };
      var addLine = function (from, to) {
        var slope = calcSlope(from, to);
        var newLines = linesMade + 1;
        setLines(gridLines.concat([{ from: from, to: to, slope: slope }]), { connectFirst: null, linesMade: newLines });
        say(fill(t('stem.coordgrid.line_drawn', 'Line drawn from {a} to {b}. Slope {m}.'), { a: pairText(from), b: pairText(to), m: slope.display === 'undefined' ? t('stem.coordgrid.slope_undefined', 'undefined') : slope.display }));
        checkBadges({ linesMade: newLines });
      };

      // What the keyboard cursor announces. During "name the point" it gives only
      // landmarks, so the student counts steps from the origin, as a sighted student
      // counts grid lines.
      var cursorText = function (x, y) {
        var at = { x: x, y: y };
        if (taskType === 'name' && !taskSolved && !answerShown) {
          var land = (x === 0 && y === 0) ? t('stem.coordgrid.cursor_origin', 'The origin.')
            : y === 0 ? t('stem.coordgrid.cursor_on_x_axis', 'On the x-axis.')
            : x === 0 ? t('stem.coordgrid.cursor_on_y_axis', 'On the y-axis.')
            : t('stem.coordgrid.cursor_grid_point', 'Grid point.');
          return CG_CORE.same(at, gridChallenge.target) ? land + ' ' + t('stem.coordgrid.cursor_on_marked', 'This is the marked point.') : land;
        }
        var parts = [fill(t('stem.coordgrid.cursor_at', 'x {x}, y {y}, {where}.'), { x: fmt(x), y: fmt(y), where: quadWhere(x, y) })];
        if (gridPoints.some(function (p) { return CG_CORE.same(p, at); })) parts.push(t('stem.coordgrid.cursor_has_point', 'A plotted point is here.'));
        if ((taskType === 'reflect' || taskType === 'translate') && CG_CORE.same(gridChallenge.p, at)) parts.push(t('stem.coordgrid.cursor_has_p', 'Point P is here.'));
        if (taskType === 'polygon') gridChallenge.vertices.forEach(function (v, i) { if (CG_CORE.same(v, at)) parts.push(fill(t('stem.coordgrid.cursor_has_vertex', 'Vertex {v} is here.'), { v: vertexName(i) })); });
        return parts.join(' ');
      };
      var gridKeyDown = function (e) {
        var k = e.key, dx = 0, dy = 0, big = e.shiftKey ? 5 : 1;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (k === 'ArrowRight') dx = big;
        else if (k === 'ArrowLeft') dx = -big;
        else if (k === 'ArrowUp') dy = big;
        else if (k === 'ArrowDown') dy = -big;
        else if (k === 'Home') {
          e.preventDefault();
          var ox = clampV(0), oy = clampV(0);
          updCG({ coordinateInputX: ox, coordinateInputY: oy });
          say(cursorText(ox, oy));
          return;
        } else if (k === 'Enter' || k === ' ') {
          e.preventDefault();
          processGridCoordinate(coordinateInputX, coordinateInputY);
          return;
        } else return;
        e.preventDefault();
        var nx = clampV(coordinateInputX + dx), ny = clampV(coordinateInputY + dy);
        updCG({ coordinateInputX: nx, coordinateInputY: ny });
        say((nx === coordinateInputX && ny === coordinateInputY ? t('stem.coordgrid.cursor_edge', 'Edge of the grid.') + ' ' : '') + cursorText(nx, ny));
      };

      // ── Starting a task ──
      var startTask = function (type, opts) {
        if (!stretchAllowed && !CG_CORE.inLevel(cgLevel, type)) return;
        var ch = null, k = 0;
        do { ch = CG_CORE.generate(type, cgLevel); } while (ch && (isItemLocked(gridItemKey(ch)) || gridItemKey(ch) === gridItemKey(gridChallenge)) && k++ < 25);
        if (!ch) return;
        ch = Object.assign({}, ch, { tries: 0, hint: 0 });
        sfxClick();
        var patch = { gridChallenge: ch, connectMode: false, connectFirst: null };
        if (gridPoints.length) patch.lastCleared = { gridPoints: gridPoints, gridLines: gridLines };
        patch.gridPoints = (type === 'slope' || type === 'distance') ? [ch.p1, ch.p2] : [];
        patch.gridFeedback = type === 'slope' ? { slopeAnswer: '' } : type === 'distance' ? { distanceAnswer: '' } : null;
        if (ch.view === 'q1') { patch.coordinateInputX = 0; patch.coordinateInputY = 0; }
        updCG(patch);
        say(promptFor(ch));
        if (opts && opts.focus) focusGrid('#coordgrid-explore-app', '#coordgrid-task-layout');
      };
      var useHint = function () {
        if (!gridChallenge || taskDone || taskHint >= 2) return;
        var next = taskHint + 1;
        var patch = { gridChallenge: Object.assign({}, gridChallenge, { hint: next }) };
        updCG(patch);
        // The slope ladder's second rung fills in rise and run (as before).
        if (taskType === 'slope' && next === 2) {
          setGridFeedback(function (prev) { return Object.assign({}, prev, { riseAnswer: String(gridChallenge.slopeData.rise), runAnswer: String(gridChallenge.slopeData.run), msg: null }); });
        }
        say(hintText(gridChallenge, next));
      };
      // Two rungs per task: a strategy, then a worked step. Neither gives the answer.
      var hintText = function (ch, level) {
        if (!ch || !level) return '';
        var tp = ch.type;
        if (tp === 'plot' || tp === 'name') return level === 1
          ? t('stem.coordgrid.hint_point_1', 'Start at the origin. The first number moves you across (x); the second moves you up or down (y).')
          : (tp === 'plot'
            ? fill(t('stem.coordgrid.hint_plot_2', 'Move {across} along the x-axis first, then {updown}.'), { across: ch.target.x === 0 ? t('stem.coordgrid.move_none', 'nowhere') : fill(ch.target.x > 0 ? t('stem.coordgrid.move_right', '{n} right') : t('stem.coordgrid.move_left', '{n} left'), { n: Math.abs(ch.target.x) }), updown: ch.target.y === 0 ? t('stem.coordgrid.move_stay', 'stay on the axis') : fill(ch.target.y > 0 ? t('stem.coordgrid.move_up', '{n} up') : t('stem.coordgrid.move_down', '{n} down'), { n: Math.abs(ch.target.y) }) })
            : fill(ch.target.x === 0 ? t('stem.coordgrid.hint_name_2_axis', 'The marked point is on the y-axis, so x is 0. Now count up or down.') : (ch.target.x > 0 ? t('stem.coordgrid.hint_name_2_right', 'The marked point is right of the y-axis, so x is positive. Count the spaces across, then up or down.') : t('stem.coordgrid.hint_name_2_left', 'The marked point is left of the y-axis, so x is negative. Count the spaces across, then up or down.')), {}));
        if (tp === 'reflect') return level === 1
          ? t('stem.coordgrid.hint_reflect_1', 'A reflection is a mirror image: the image is the same distance from the mirror line, on the other side.')
          : (ch.axis === 'x' ? fill(t('stem.coordgrid.hint_reflect_2_x', 'P is {d} units from the x-axis. Its image is {d} units from the x-axis on the other side; x does not change.'), { d: Math.abs(ch.p.y) })
            : ch.axis === 'y' ? fill(t('stem.coordgrid.hint_reflect_2_y', 'P is {d} units from the y-axis. Its image is {d} units from the y-axis on the other side; y does not change.'), { d: Math.abs(ch.p.x) })
            : t('stem.coordgrid.hint_reflect_2_o', 'Reflect across the x-axis, then reflect that image across the y-axis.'));
        if (tp === 'translate') return level === 1
          ? t('stem.coordgrid.hint_translate_1', 'Left and right moves change x. Up and down moves change y.')
          : fill(t('stem.coordgrid.hint_translate_2', 'New x = {x} + ({dx}). New y = {y} + ({dy}).'), { x: fmt(ch.p.x), dx: fmt(ch.v.dx), y: fmt(ch.p.y), dy: fmt(ch.v.dy) });
        if (tp === 'distance') {
          if (ch.kind === 'axis') return level === 1
            ? t('stem.coordgrid.hint_distance_axis_1', 'The two points share a coordinate, so count along one grid line.')
            : ((ch.p1.x === ch.p2.x ? ch.p1.y * ch.p2.y : ch.p1.x * ch.p2.x) < 0
              ? t('stem.coordgrid.hint_distance_axis_2_cross', 'The points are on opposite sides of an axis: find each one\'s distance from the axis, then add.')
              : t('stem.coordgrid.hint_distance_axis_2_same', 'Subtract the coordinates that change, then take the absolute value.'));
          return level === 1
            ? t('stem.coordgrid.hint_distance_pythag_1', 'Draw a right triangle: the horizontal and vertical legs meet at a corner.')
            : t('stem.coordgrid.hint_distance_pythag_2', 'The legs are now drawn on the grid. Square each leg, add, then take the square root.');
        }
        if (tp === 'polygon') return level === 1
          ? t('stem.coordgrid.hint_polygon_1', 'A side joining two points with the same x (or the same y) is as long as the difference of the other coordinates.')
          : (ch.ask === 'area'
            ? (ch.shape === 'tri' ? t('stem.coordgrid.hint_polygon_2_tri', 'The side lengths are now labelled. A right triangle is half of a rectangle.') : ch.shape === 'L' ? t('stem.coordgrid.hint_polygon_2_l', 'The side lengths are now labelled. Split the shape into two rectangles and add their areas.') : t('stem.coordgrid.hint_polygon_2_rect', 'The side lengths are now labelled. Area is length times width.'))
            : t('stem.coordgrid.hint_polygon_2_per', 'The side lengths are now labelled. Add every side.'));
        if (tp === 'slope') return level === 1
          ? t('stem.coordgrid.hint_slope_1', 'Rise is the change in y and run is the change in x, both from the first point to the second.')
          : t('stem.coordgrid.hint_slope_2', 'Rise and run are filled in. Slope = rise divided by run, simplified.');
        return '';
      };

      // ── Check answer ──
      var gridSubmissionPending = false;
      var readInt = function (s) {
        var v = window.StemLab.grading.toNumber(String(s == null ? '' : s));
        return Number.isFinite(v) && Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : null;
      };
      var checkGrid = function() {
        if (!gridChallenge || gridSubmissionPending || taskDone) return;
        var fb = gridFeedback || {};
        if (gridChallenge.type === 'plot') {
          // Grade the one point the student plotted: passing when ANY point matched let a
          // grid full of points win. No point, or several, is not an answer yet.
          if (gridPoints.length !== 1) {
            setGridFeedback({ correct: false, msg: gridPoints.length ? t('stem.coordgrid.plot_leave_one_point', 'Leave just one point on the grid, your answer, then check. Plotting a point again removes it.') : t('stem.coordgrid.plot_your_point_first', 'Plot your point first, then check.') });
            return;
          }
          gridSubmissionPending = true;
          var code = CG_CORE.diagnosePoint(gridPoints[0], gridChallenge.target);
          finishAttempt(code === 'correct', code, { walk: { x: gridPoints[0].x, y: gridPoints[0].y } }, gridPoints[0].x + ',' + gridPoints[0].y);
          return;
        }
        if (pointTask) {
          var ax = readInt(fb.ansX), ay = readInt(fb.ansY);
          if (ax === null || ay === null) {
            setGridFeedback(function (prev) { return Object.assign({}, prev, { correct: false, msg: t('stem.coordgrid.enter_both_whole', 'Enter a whole number for x and for y, then check.') }); });
            return;
          }
          gridSubmissionPending = true;
          var ans = { x: ax, y: ay };
          var pc = taskType === 'name' ? CG_CORE.diagnosePoint(ans, gridChallenge.target)
            : taskType === 'reflect' ? CG_CORE.diagnoseReflect(ans, gridChallenge)
            : CG_CORE.diagnoseTranslate(ans, gridChallenge);
          finishAttempt(pc === 'correct', pc, taskType === 'name' ? { walk: ans } : null, ax + ',' + ay);
          return;
        }
        if (taskType === 'polygon') {
          var pv = window.StemLab.grading.toNumber(String(fb.ansNum == null ? '' : fb.ansNum));
          if (!Number.isFinite(pv)) {
            setGridFeedback(function (prev) { return Object.assign({}, prev, { correct: false, msg: t('stem.coordgrid.enter_number', 'Enter a number, then check.') }); });
            return;
          }
          gridSubmissionPending = true;
          var dc = CG_CORE.diagnosePolygon(pv, gridChallenge);
          if (dc === 'area_perimeter_swap') dc = gridChallenge.ask === 'area' ? 'gave_perimeter' : 'gave_area';
          finishAttempt(dc === 'correct', dc, null, String(pv));
          return;
        }
        if (taskType === 'slope') {
          var cs = gridChallenge.slopeData;
          var riseText = String(fb.riseAnswer == null ? '' : fb.riseAnswer).trim();
          var runText = String(fb.runAnswer == null ? '' : fb.runAnswer).trim();
          var slopeAns = String(fb.slopeAnswer == null ? '' : fb.slopeAnswer).trim();
          // A blank box is not an attempt: grading it printed every answer and reset the streak.
          if (riseText === '' || runText === '' || slopeAns === '') {
            setGridFeedback(function(prev) { return Object.assign({}, prev, { correct: false, msg: t('stem.coordgrid.fill_all_slope_boxes', 'Fill in rise, run, and slope, then check.') }); });
            return;
          }
          var riseNumber = Number(riseText), runNumber = Number(runText);
          var riseAns = Number.isSafeInteger(riseNumber) ? riseNumber : null;
          var runAns = Number.isSafeInteger(runNumber) ? runNumber : null;
          gridSubmissionPending = true;
          var sg = CG_CORE.gradeSlope(riseAns, runAns, slopeAns, cs);
          finishAttempt(sg.allCorrect, sg.code, null, riseText + '|' + runText + '|' + slopeAns);
          return;
        }
        if (taskType === 'distance') {
          var distAns = window.StemLab.grading.toNumber(String(fb.distanceAnswer == null ? '' : fb.distanceAnswer));
          // Blank or non-numeric: ask again instead of grading "(you said NaN)" and resetting the streak.
          if (!Number.isFinite(distAns)) {
            setGridFeedback(function(prev) { return Object.assign({}, prev, { correct: false, msg: t('stem.coordgrid.enter_distance_number', 'Enter the distance as a number, such as 5.4, then check.') }); });
            return;
          }
          gridSubmissionPending = true;
          var dd = CG_CORE.diagnoseDistance(distAns, gridChallenge);
          finishAttempt(dd === 'correct', dd, null, String(distAns));
        }
      };

      // ── Explore-surface actions ──
      var toggleConnect = function () {
        sfxClick();
        updCG({ connectMode: !connectMode, connectFirst: null, gridChallenge: null, gridFeedback: null });
        say(connectMode ? t('stem.coordgrid.connect_off', 'Connect mode off. Your lines stay on the grid.') : t('stem.coordgrid.connect_on', 'Connect mode on. Choose two points to draw a line.'));
      };
      var clearGrid = function () {
        var had = gridPoints.length || gridLines.length;
        var patch = { gridPoints: [], gridLines: [], connectFirst: null, gridChallenge: null, gridFeedback: null };
        if (had) patch.lastCleared = { gridPoints: gridPoints, gridLines: gridLines };
        updCG(patch);
        say(had ? t('stem.coordgrid.cleared_undo', 'Grid cleared. Choose Undo clear to bring the points and lines back.') : t('stem.coordgrid.cleared', 'Grid cleared.'));
      };
      var undoClear = function () {
        if (!lastCleared) return;
        updCG({
          gridPoints: Array.isArray(lastCleared.gridPoints) ? lastCleared.gridPoints.filter(finitePt) : [],
          gridLines: Array.isArray(lastCleared.gridLines) ? lastCleared.gridLines : [],
          lastCleared: null, gridChallenge: null, gridFeedback: null
        });
        say(t('stem.coordgrid.undo_done', 'Points and lines are back.'));
      };
      var describePoints = function () {
        if (!gridPoints.length && !gridLines.length) return t('stem.coordgrid.desc_empty', 'No points are plotted yet.');
        var out = [gridPoints.length === 1 ? t('stem.coordgrid.desc_count_one', 'One point is plotted.') : fill(t('stem.coordgrid.desc_count', '{n} points are plotted.'), { n: gridPoints.length })];
        gridPoints.forEach(function (p, i) { out.push(fill(t('stem.coordgrid.desc_point', 'Point {n}: {pair}, {where}.'), { n: i + 1, pair: pairText(p), where: quadWhere(p.x, p.y) })); });
        gridLines.forEach(function (ln, i) {
          out.push(fill(t('stem.coordgrid.desc_line', 'Line {n} joins {a} and {b}: slope {m}, length {d}.'), {
            n: i + 1, a: pairText(ln.from), b: pairText(ln.to), m: ln.slope.display === 'undefined' ? t('stem.coordgrid.slope_undefined', 'undefined') : ln.slope.display, d: fmt(calcDistance(ln.from, ln.to))
          }));
        });
        return out.join(' ');
      };

      // ═══ AI TUTOR ═══ (only when the host offers it and AI hints are on)
      var aiAvailable = typeof ctx.callGemini === 'function' && ctx.aiHintsEnabled !== false;
      var askAITutor = function() {
        if (!aiAvailable || !aiQuestion.trim()) return;
        updCG({ aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student learn about coordinate grids, graphing, and slope. ' +
          'They have ' + gridPoints.length + ' points plotted. ' +
          'Their question: "' + aiQuestion + '"\n\nExplain clearly. Keep under 150 words.';
        Promise.resolve(ctx.callGemini(prompt, false, false, 0.7)).then(function(resp) {
          var next = (_cg.aiAsked || 0) + 1;
          updCG({ aiResponse: String(resp || ''), aiLoading: false, aiAsked: next });
          checkBadges({ aiAsked: next });
        }).catch(function() {
          updCG({ aiResponse: t('stem.coordgrid.ai_error', 'Sorry, the AI tutor could not be reached.'), aiLoading: false });
        });
      };

      // ═══ KEYBOARD SHORTCUT ═══ "?" opens or closes the help panel. It is the only
      // single-character shortcut: it acts only while focus is inside this tool and
      // never in a text field. (C and R were removed: R wiped the grid from any
      // focused button, with no undo.)
      if (window._coordGridKeyHandler) {
        window.removeEventListener('keydown', window._coordGridKeyHandler);
      }
      window._coordGridKeyHandler = function(e) {
        // Window-level handler: refuse to act once the tool left the DOM.
        // WCAG 2.1.4: single-key shortcuts act only while focus is inside this tool.
        var cgRoot = document.querySelector('[data-coordinate-theme]');
        if (!cgRoot || !e.target || !cgRoot.contains(e.target)) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === '?') {
          updCG({ showHelp: !showHelp });
        }
      };
      window.addEventListener('keydown', window._coordGridKeyHandler);

      // ════════════════════════════════
      // ═══ RENDER ═══
      // ════════════════════════════════

      // Grid lines + axis labels (theme palette: lines 3:1, labels 4.5:1 on the surface)
      var gridElements = [];
      var labelEvery = range <= 12 ? 1 : 2;
      var axisX0 = toSvg(Math.max(viewRange.min, Math.min(viewRange.max, 0)), 'x');
      var axisY0 = toSvg(Math.max(viewRange.min, Math.min(viewRange.max, 0)), 'y');
      for (var gi = 0; gi <= range; gi++) {
        var v = viewRange.min + gi;
        var px = toSvg(v, 'x');
        var py = toSvg(v, 'y');
        gridElements.push(
          h('line', { key: 'vl' + gi, x1: px, y1: 0, x2: px, y2: gridH, stroke: v === 0 ? GP.axis : GP.minor, strokeWidth: v === 0 ? 2 : 0.6 }),
          h('line', { key: 'hl' + gi, x1: 0, y1: py, x2: gridW, y2: py, stroke: v === 0 ? GP.axis : GP.minor, strokeWidth: v === 0 ? 2 : 0.6 })
        );
        if (v !== 0 && v % labelEvery === 0) {
          // ★ Clamp the EDGE tick labels inside the canvas: at the range ends the tick
          // sits on the boundary, so a centred "-10" was half outside. In quadrant I
          // the axes run along the edges, so labels move inside the grid.
          var xLabelX = Math.max(14, Math.min(gridW - 14, px));
          var yLabelY = Math.max(11, Math.min(gridH - 4, py + 3));
          var xLabY = axisY0 + 14 > gridH - 2 ? axisY0 - 6 : axisY0 + 14;
          var yLabX = axisX0 - 8 < 14 ? axisX0 + 6 : axisX0 - 8;
          gridElements.push(
            h('text', { key: 'xl' + gi, x: xLabelX, y: xLabY, textAnchor: 'middle', fontSize: 11, fill: GP.label }, fmt(v)),
            h('text', { key: 'yl' + gi, x: yLabX, y: yLabelY, textAnchor: yLabX > axisX0 ? 'start' : 'end', fontSize: 11, fill: GP.label }, fmt(v))
          );
        }
      }
      // Axis name labels (x at the right end, y at the top) — the grid had numbered ticks but no axis names
      gridElements.push(
        h('text', { key: 'axname-x', x: gridW - 4, y: axisY0 - 6 < 12 ? axisY0 + 26 : axisY0 - 6, textAnchor: 'end', fontSize: 12, fontWeight: 'bold', fill: GP.label }, 'x'),
        h('text', { key: 'axname-y', x: axisX0 + 8, y: 12, textAnchor: 'start', fontSize: 12, fontWeight: 'bold', fill: GP.label }, 'y')
      );

      // Connected lines with slope badges + equation labels (hidden while a task is
      // open, so a task's own points stay readable; the lines are kept, not erased).
      var lineElements = gridChallenge ? [] : gridLines.filter(function (ln) { return inView(ln.from) && inView(ln.to); }).map(function(ln, li) {
        var eq = calcLineEq(ln.from, ln.slope);
        var midX = (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2;
        var midY = (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2;
        var riseX = toSvg(ln.to.x, 'x');
        var runY = toSvg(ln.from.y, 'y');
        var mLabel = 'm=' + (ln.slope.display === 'undefined' ? t('stem.coordgrid.slope_undefined', 'undefined') : ln.slope.display);
        var bw = Math.max(48, mLabel.length * 7 + 10);
        return h(React.Fragment, { key: 'ln' + li },
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: GP.line, strokeWidth: 2.5, strokeDasharray: '6,3' }),
          h('line', { x1: riseX, y1: runY, x2: riseX, y2: toSvg(ln.to.y, 'y'), stroke: GP.rise, strokeWidth: 1.5, strokeDasharray: '3,2' }),
          ln.slope.rise !== 0 && h('text', { x: riseX + 10, y: midY + 3, fontSize: 11, fontWeight: 'bold', fill: GP.rise }, 'Δy=' + fmt(ln.slope.rise)),
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: runY, x2: riseX, y2: runY, stroke: GP.run, strokeWidth: 1.5, strokeDasharray: '3,2' }),
          ln.slope.run !== 0 && h('text', { x: midX, y: runY - 6, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: GP.run }, 'Δx=' + fmt(ln.slope.run)),
          h('rect', { x: midX - bw / 2, y: midY - 10, width: bw, height: 18, rx: 5, fill: GP.line }),
          h('text', { x: midX, y: midY + 3, textAnchor: 'middle', fill: GP.bg, style: { fontSize: '11px', fontWeight: 'bold' } }, mLabel),
          h('text', { x: midX, y: midY + 20, textAnchor: 'middle', fontSize: 11, fontFamily: 'monospace', fill: GP.line }, eq)
        );
      });

      var dot = function (key, p, color, r, extra) {
        return h('circle', Object.assign({ key: key, cx: toSvg(p.x, 'x'), cy: toSvg(p.y, 'y'), r: r || 6, fill: color, stroke: GP.pointStroke, strokeWidth: 2 }, extra || {}));
      };
      var tag = function (key, p, text, color, dx, dy) {
        var x = toSvg(p.x, 'x') + (dx == null ? 9 : dx), y = toSvg(p.y, 'y') + (dy == null ? -9 : dy);
        x = Math.max(4, Math.min(gridW - 60, x)); y = Math.max(12, Math.min(gridH - 4, y));
        return h('text', { key: key, x: x, y: y, fontSize: 12, fontWeight: 'bold', fill: color, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, text);
      };

      // Slope challenge segment with rise and run guides
      var slopeChallengeElements = taskType === 'slope'
        ? (function() {
            var p1 = gridChallenge.p1, p2 = gridChallenge.p2;
            var rMidY = (toSvg(p1.y, 'y') + toSvg(p2.y, 'y')) / 2;
            var rMidX = (toSvg(p1.x, 'x') + toSvg(p2.x, 'x')) / 2;
            return h(React.Fragment, null,
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: GP.mystery, strokeWidth: 2.5 }),
              h('line', { x1: toSvg(p2.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: GP.rise, strokeWidth: 1.5, strokeDasharray: '4,2' }),
              h('text', { x: Math.min(gridW - 30, toSvg(p2.x, 'x') + 12), y: rMidY + 3, fontSize: 11, fontWeight: 'bold', fill: GP.rise }, t('stem.coordgrid.svg_rise', 'rise')),
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p1.y, 'y'), stroke: GP.run, strokeWidth: 1.5, strokeDasharray: '4,2' }),
              h('text', { x: rMidX, y: toSvg(p1.y, 'y') - 6, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: GP.run }, t('stem.coordgrid.svg_run', 'run')),
              tag('s1', p1, t('stem.coordgrid.svg_first', 'start'), GP.mystery, 9, 16),
              dot('sp1', p1, GP.mystery), dot('sp2', p2, GP.mystery)
            );
          })()
        : null;

      // Distance challenge: just the two points and the segment until the student
      // asks for the second hint or the item is finished. (The √ badge used to be
      // drawn before any attempt: the answer was on the grid.)
      var distChallengeElements = taskType === 'distance'
        ? (function() {
            var p1 = gridChallenge.p1, p2 = gridChallenge.p2;
            var dx = p2.x - p1.x, dy = p2.y - p1.y;
            var showLegs = gridChallenge.kind === 'pythag' && (taskHint >= 2 || taskDone);
            var corner = { x: p2.x, y: p1.y };
            var legMidX = (toSvg(p1.x, 'x') + toSvg(corner.x, 'x')) / 2;
            var legMidY = (toSvg(corner.y, 'y') + toSvg(p2.y, 'y')) / 2;
            var mid = calcMidpoint(p1, p2);
            return h(React.Fragment, null,
              showLegs && h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(corner.x, 'x'), y2: toSvg(corner.y, 'y'), stroke: GP.run, strokeWidth: 1.5, strokeDasharray: '4 3' }),
              showLegs && h('text', { x: legMidX, y: toSvg(p1.y, 'y') - 6, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: GP.run }, 'Δx = ' + Math.abs(dx)),
              showLegs && h('line', { x1: toSvg(corner.x, 'x'), y1: toSvg(corner.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: GP.rise, strokeWidth: 1.5, strokeDasharray: '4 3' }),
              showLegs && h('text', { x: Math.min(gridW - 40, toSvg(corner.x, 'x') + 8), y: legMidY + 3, textAnchor: 'start', fontSize: 11, fontWeight: 'bold', fill: GP.rise }, 'Δy = ' + Math.abs(dy)),
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: GP.poly, strokeWidth: 2.5 }),
              dot('dp1', p1, GP.poly), dot('dp2', p2, GP.poly),
              answerShown || taskSolved ? tag('dans', mid, 'd = ' + (gridChallenge.kind === 'axis' ? fmt(gridChallenge.distance) : gridChallenge.distance.toFixed(1)), GP.poly, 8, -12) : null
            );
          })()
        : null;

      // Point tasks: the marked point (name), P and the mirror line (reflect), P
      // (translate), the student's prediction, and the image once the item is done.
      var taskElements = [];
      if (taskType === 'plot' && answerShown) {
        taskElements.push(h('circle', { key: 'tgt', cx: toSvg(gridChallenge.target.x, 'x'), cy: toSvg(gridChallenge.target.y, 'y'), r: 10, fill: 'none', stroke: GP.good, strokeWidth: 3 }));
        taskElements.push(tag('tgtl', gridChallenge.target, pairText(gridChallenge.target), GP.good));
      }
      if (taskType === 'name' && inView(gridChallenge.target)) {
        var tx = toSvg(gridChallenge.target.x, 'x'), ty = toSvg(gridChallenge.target.y, 'y');
        taskElements.push(h('rect', { key: 'mys', x: tx - 7, y: ty - 7, width: 14, height: 14, transform: 'rotate(45 ' + tx + ' ' + ty + ')', fill: GP.mystery, stroke: GP.pointStroke, strokeWidth: 2 }));
        if (taskSolved || answerShown) taskElements.push(tag('mysl', gridChallenge.target, pairText(gridChallenge.target), GP.mystery));
      }
      if (taskType === 'reflect' || taskType === 'translate') {
        var P = gridChallenge.p;
        if (taskType === 'reflect') {
          if (gridChallenge.axis === 'x') taskElements.push(h('line', { key: 'mir', x1: 0, y1: toSvg(0, 'y'), x2: gridW, y2: toSvg(0, 'y'), stroke: GP.image, strokeWidth: 4, opacity: 0.8 }));
          else if (gridChallenge.axis === 'y') taskElements.push(h('line', { key: 'mir', x1: toSvg(0, 'x'), y1: 0, x2: toSvg(0, 'x'), y2: gridH, stroke: GP.image, strokeWidth: 4, opacity: 0.8 }));
          else taskElements.push(h('circle', { key: 'mir', cx: toSvg(0, 'x'), cy: toSvg(0, 'y'), r: 7, fill: 'none', stroke: GP.image, strokeWidth: 3 }));
        }
        taskElements.push(dot('P', P, GP.point, 7));
        taskElements.push(tag('Pl', P, 'P ' + pairText(P), GP.point));
        var px0 = readInt(gridFeedback && gridFeedback.ansX), py0 = readInt(gridFeedback && gridFeedback.ansY);
        if (px0 !== null && py0 !== null && inView({ x: px0, y: py0 }) && !taskDone) {
          taskElements.push(h('circle', { key: 'pred', cx: toSvg(px0, 'x'), cy: toSvg(py0, 'y'), r: 8, fill: 'none', stroke: GP.cursor, strokeWidth: 2.5, strokeDasharray: '3 2' }));
          taskElements.push(tag('predl', { x: px0, y: py0 }, t('stem.coordgrid.svg_prediction', 'your prediction'), GP.cursor, 10, 16));
        }
        if (taskSolved || answerShown) {
          var A = gridChallenge.answer;
          if (taskType === 'translate') {
            var mid2 = { x: A.x, y: P.y };
            taskElements.push(h('polyline', { key: 'path', points: toSvg(P.x, 'x') + ',' + toSvg(P.y, 'y') + ' ' + toSvg(mid2.x, 'x') + ',' + toSvg(mid2.y, 'y') + ' ' + toSvg(A.x, 'x') + ',' + toSvg(A.y, 'y'), fill: 'none', stroke: GP.image, strokeWidth: 2, strokeDasharray: '6 3', className: 'allo-cg-trail' }));
          } else {
            taskElements.push(h('line', { key: 'path', x1: toSvg(P.x, 'x'), y1: toSvg(P.y, 'y'), x2: toSvg(A.x, 'x'), y2: toSvg(A.y, 'y'), stroke: GP.image, strokeWidth: 1.5, strokeDasharray: '4 3', className: 'allo-cg-trail' }));
          }
          taskElements.push(dot('Pi', A, GP.image, 7, { className: 'allo-cg-pop' }));
          taskElements.push(tag('Pil', A, 'P′ ' + pairText(A), GP.image));
        }
      }
      if (taskType === 'polygon') {
        var vs = gridChallenge.vertices;
        taskElements.push(h('polygon', { key: 'poly', points: vs.map(function (q) { return toSvg(q.x, 'x') + ',' + toSvg(q.y, 'y'); }).join(' '), fill: GP.polyFill, stroke: GP.poly, strokeWidth: 2.5 }));
        var cx0 = vs.reduce(function (s, q) { return s + q.x; }, 0) / vs.length, cy0 = vs.reduce(function (s, q) { return s + q.y; }, 0) / vs.length;
        vs.forEach(function (q, i) {
          taskElements.push(dot('pv' + i, q, GP.poly, 5));
          var ox = q.x >= cx0 ? 8 : -64, oy = q.y >= cy0 ? -8 : 16;
          taskElements.push(tag('pvl' + i, q, vertexName(i) + ' ' + pairText(q), GP.poly, ox, oy));
        });
        if (taskHint >= 2 || taskDone) {
          vs.forEach(function (q, i) {
            var r = vs[(i + 1) % vs.length];
            if (q.x !== r.x && q.y !== r.y) return;
            var len = Math.abs(r.x - q.x) + Math.abs(r.y - q.y);
            var mx = (toSvg(q.x, 'x') + toSvg(r.x, 'x')) / 2, my = (toSvg(q.y, 'y') + toSvg(r.y, 'y')) / 2;
            taskElements.push(h('text', { key: 'side' + i, x: mx + (q.x === r.x ? 6 : 0), y: my + (q.y === r.y ? 14 : 4), textAnchor: q.x === r.x ? 'start' : 'middle', fontSize: 12, fontWeight: 'bold', fill: GP.rise, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, String(len)));
          });
        }
      }
      // The walk, drawn only after a Check: along x first, then up or down along y.
      // A miss draws the student's own walk (orange); the walk to the answer
      // (green) appears once the task is solved or the answer is shown.
      var walkTo = null, walkKind = null;
      if ((taskType === 'plot' || taskType === 'name') && gridChallenge) {
        var wfb = gridFeedback && gridFeedback.walk;
        if (taskSolved || answerShown) { walkTo = gridChallenge.target; walkKind = 'answer'; }
        else if (finitePt(wfb)) { walkTo = { x: wfb.x, y: wfb.y }; walkKind = 'mine'; }
        if (walkTo && (!inView(walkTo) || !inView({ x: 0, y: 0 }) || (walkTo.x === 0 && walkTo.y === 0))) { walkTo = null; walkKind = null; }
      }
      var walkElements = null;
      if (walkTo) {
        var wCol = walkKind === 'answer' ? GP.good : GP.cursor;
        var wAnim = !reduceMotion;
        // Pulled 2 units in from the frame, so a leg on the frame's edge is not half cut off.
        var wIn = function (v) { return Math.max(2, Math.min(gridW - 2, v)); };
        var wx0 = wIn(toSvg(0, 'x')), wy0 = wIn(toSvg(0, 'y')), wx1 = wIn(toSvg(walkTo.x, 'x')), wy1 = wIn(toSvg(walkTo.y, 'y'));
        var legs = [];
        if (walkTo.x !== 0) legs.push({ id: 'x', from: [wx0, wy0], to: [wx1, wy0], n: walkTo.x });
        if (walkTo.y !== 0) legs.push({ id: 'y', from: [wx1, wy0], to: [wx1, wy1], n: walkTo.y });
        var wKids = [], wLabels = [];
        legs.forEach(function (lg, i) {
          var dx = Math.sign(lg.to[0] - lg.from[0]), dy = Math.sign(lg.to[1] - lg.from[1]);
          var last = i === legs.length - 1;
          // The last leg stops short so its arrowhead touches the point, not covers it.
          var ex = lg.to[0] - (last ? dx * 8 : 0), ey = lg.to[1] - (last ? dy * 8 : 0);
          var ab = i === 0 ? 'a' : 'b';
          wKids.push(h('path', { key: 'w' + lg.id, d: 'M' + lg.from[0].toFixed(1) + ' ' + lg.from[1].toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1), pathLength: 1, fill: 'none', stroke: wCol, strokeWidth: 4, strokeLinecap: 'round', className: wAnim ? 'allo-cg-walk-' + ab : undefined }));
          var hs = 8, hw = 6;
          var head = [[ex, ey], [ex - dx * hs - dy * hw, ey - dy * hs + dx * hw], [ex - dx * hs + dy * hw, ey - dy * hs - dx * hw]];
          wKids.push(h('polygon', { key: 'wh' + lg.id, points: head.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '), fill: wCol, className: wAnim ? 'allo-cg-walk-h' + ab : undefined }));
          var wLabel = lg.id === 'x'
            ? fill(lg.n > 0 ? t('stem.coordgrid.move_right', '{n} right') : t('stem.coordgrid.move_left', '{n} left'), { n: Math.abs(lg.n) })
            : fill(lg.n > 0 ? t('stem.coordgrid.move_up', '{n} up') : t('stem.coordgrid.move_down', '{n} down'), { n: Math.abs(lg.n) });
          // Beside the leg, on the side that stays inside the grid.
          var wLeft = walkTo.x < 0 ? lg.to[0] >= 60 : lg.to[0] > gridW - 60;
          var wBelow = walkTo.y > 0 ? lg.from[1] + 18 <= gridH - 2 : lg.from[1] - 10 < 12;
          var lx = lg.id === 'x' ? Math.max(32, Math.min(gridW - 32, (lg.from[0] + lg.to[0]) / 2)) : lg.to[0] + (wLeft ? -8 : 8);
          var ly = lg.id === 'x' ? lg.from[1] + (wBelow ? 18 : -10) : (lg.from[1] + lg.to[1]) / 2 + 4;
          wLabels.push(h('text', { key: 'wl' + lg.id, x: lx, y: ly, textAnchor: lg.id === 'x' ? 'middle' : (wLeft ? 'end' : 'start'), fontSize: 12, fontWeight: 'bold', fill: wCol, className: wAnim ? 'allo-cg-walk-h' + ab : undefined, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, wLabel));
        });
        walkElements = h('g', { key: 'walk', 'aria-hidden': 'true', 'data-coordgrid-walk-svg': walkKind }, wKids.concat(wLabels));
      }
      // The keyboard cursor (shown while the grid has focus).
      var cursorElements = gridFocused && cgTab === 'explore' ? h('g', { key: 'cursor', 'aria-hidden': 'true' },
        h('circle', { cx: toSvg(coordinateInputX, 'x'), cy: toSvg(coordinateInputY, 'y'), r: 11, fill: 'none', stroke: GP.cursor, strokeWidth: 3 }),
        h('line', { x1: toSvg(coordinateInputX, 'x') - 16, y1: toSvg(coordinateInputY, 'y'), x2: toSvg(coordinateInputX, 'x') + 16, y2: toSvg(coordinateInputY, 'y'), stroke: GP.cursor, strokeWidth: 1.5 }),
        h('line', { x1: toSvg(coordinateInputX, 'x'), y1: toSvg(coordinateInputY, 'y') - 16, x2: toSvg(coordinateInputX, 'x'), y2: toSvg(coordinateInputY, 'y') + 16, stroke: GP.cursor, strokeWidth: 1.5 })
      ) : null;

      // ── Function polylines (y = f(x), sampled across the grid range) ──
      var funcElements = [];
      if (funcsOn && funcs.length > 0) {
        var samples = 120;
        funcs.forEach(function(f) {
          if (!f.visible) return;
          var fn = compileFunc(f.expr);
          if (!fn) return;
          // Build polyline segments, breaking on undefined / out-of-bounds samples
          var segments = [];
          var current = [];
          var lastX = null, lastY = null;
          for (var si = 0; si <= samples; si++) {
            var x = viewRange.min + (si / samples) * range;
            var y;
            try { y = fn(x); } catch (e) { current = []; continue; }
            if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
              if (current.length > 1) segments.push(current);
              current = [];
              continue;
            }
            // Allow a small overshoot beyond the visible range so the line touches the edge
            if (y < viewRange.min - 2 || y > viewRange.max + 2) {
              if (current.length > 1) segments.push(current);
              current = [];
              continue;
            }
            // A pole between two in-range samples (0.5/(x - 0.25) gives -6 then 6) must not be
            // bridged: across a sign change, a midpoint value beyond both neighbours is a pole.
            if (current.length && lastY !== null && y * lastY < 0) {
              var midY = fn((x + lastX) / 2);
              if (!isFinite(midY) || Math.abs(midY) > Math.max(Math.abs(y), Math.abs(lastY))) {
                if (current.length > 1) segments.push(current);
                current = [];
              }
            }
            current.push(toSvg(x, 'x') + ',' + toSvg(y, 'y'));
            lastX = x; lastY = y;
          }
          if (current.length > 1) segments.push(current);
          segments.forEach(function(seg, segIdx) {
            funcElements.push(h('polyline', {
              key: 'fseg-' + f.id + '-' + segIdx,
              points: seg.join(' '),
              fill: 'none', stroke: funcInk(f.color), strokeWidth: 2.5, opacity: 0.85,
              strokeLinejoin: 'round', strokeLinecap: 'round'
            }));
          });
          // Label near the rightmost endpoint of the last segment
          var lastSeg = segments[segments.length - 1];
          if (lastSeg && lastSeg.length > 0) {
            var endPt = lastSeg[Math.floor(lastSeg.length * 0.7)].split(',');
            funcElements.push(h('text', {
              key: 'flbl-' + f.id,
              x: parseFloat(endPt[0]) + 4, y: parseFloat(endPt[1]) - 6,
              fontSize: 11, fontWeight: 'bold', fill: funcInk(f.color),
              style: { pointerEvents: 'none', paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 }
            }, 'y = ' + f.expr));
          }
        });
      }

      // Plotted points (only those inside the visible range)
      var pointElements = [], labelElements = [];
      gridPoints.forEach(function(p, i) {
        if (!inView(p)) return;
        pointElements.push(h('circle', { key: 'pt' + p.x + '_' + p.y, cx: toSvg(p.x, 'x'), cy: toSvg(p.y, 'y'), r: 6, fill: connectFirst === i ? GP.line : GP.point, stroke: GP.pointStroke, strokeWidth: 2, className: 'cursor-pointer allo-cg-pop' }));
        labelElements.push(h('text', { key: 'lb' + i, x: Math.min(gridW - 56, toSvg(p.x, 'x') + 8), y: Math.max(12, toSvg(p.y, 'y') - 8), fontSize: 11, fontWeight: 'bold', fill: GP.point, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, pairText(p)));
      });

      // ═══ BADGES PANEL ═══
      var renderBadges = function() {
        var earned = Object.keys(badges).length;
        if (earned === 0) return null;
        return h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
          h('p', { className: 'text-[0.6875rem] font-bold text-amber-800 uppercase tracking-wider mb-2' }, fill(t('stem.coordgrid.badges_count', '\uD83C\uDFC5 Badges ({n} of {total})'), { n: earned, total: BADGES.length })),
          h('div', { className: 'flex flex-wrap gap-1.5', role: 'list' },
            BADGES.map(function(b) {
              var has = badges[b.id];
              return h('div', {
                key: b.id, title: b.name + ': ' + b.desc, role: 'listitem',
                'aria-label': fill(has ? t('stem.coordgrid.badge_earned_label', '{name}, earned: {desc}') : t('stem.coordgrid.badge_locked_label', '{name}, not yet earned: {desc}'), { name: b.name, desc: b.desc }),
                className: 'w-8 h-8 rounded-lg flex items-center justify-center text-base ' + (has ? 'bg-amber-200 shadow-sm' : 'bg-slate-100 opacity-30'),
                style: { filter: has ? 'none' : 'grayscale(1)' }
              }, b.icon);
            })
          )
        );
      };

      // ═══ AI TUTOR PANEL ═══
      var renderAITutor = function() {
        if (!showAITutor) return null;
        if (!aiAvailable) return h('div', { style: cardStyle, role: 'note' }, t('stem.coordgrid.ai_unavailable', 'The AI tutor is not available here. The hints in each task work without it.'));
        return h('div', { className: 'bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('h4', { className: 'text-sm font-bold text-sky-800' }, t('stem.coordgrid.ai_coordinate_tutor', '\uD83E\uDD16 AI Coordinate Tutor')),
            h('button', { onClick: function() { updCG({ showAITutor: false }); }, 'aria-label': t('stem.coordgrid.close_ai_tutor', 'Close the AI tutor'), style: { minWidth: 44, minHeight: 44 }, className: 'text-sky-800 hover:text-sky-900 text-lg font-bold' }, '\u00D7')
          ),
          h('div', { className: 'flex gap-2' },
            h('input', { 'aria-label': t('stem.coordgrid.ai_question_label', 'Ask the coordinate tutor a question'),
              type: 'text', value: aiQuestion,
              onChange: function(e) { updCG({ aiQuestion: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
              placeholder: t('stem.coordgrid.ask_about_coordinates', 'Ask about coordinates...'),
              className: 'flex-1 px-3 py-2 border border-sky-600 rounded-lg text-sm'
            }),
            h('button', { onClick: askAITutor, disabled: aiLoading || !aiQuestion.trim(),
              className: 'px-4 py-2 bg-sky-700 text-white font-bold rounded-lg text-sm hover:bg-sky-800 disabled:opacity-50'
            }, aiLoading ? t('stem.coordgrid.ai_thinking', 'Thinking') : t('stem.coordgrid.ai_ask', 'Ask'))
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            [t('stem.coordgrid.ai_q_slope', 'What is slope?'), t('stem.coordgrid.ai_q_distance', 'How do I find distance?'), t('stem.coordgrid.ai_q_midpoint', 'What is a midpoint?'), t('stem.coordgrid.ai_q_quadrants', 'What are quadrants?')].map(function(q) {
              return h('button', {
                key: q, onClick: function() { updCG({ aiQuestion: q }); },
                className: 'px-2 py-1 text-[0.6875rem] font-bold bg-sky-100 text-sky-800 rounded-full hover:bg-sky-200 transition-all'
              }, q);
            })
          ),
          aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100', role: 'status' }, aiResponse)
        );
      };

      // ═══ QUADRANT TOUR TAB ═══
      // Pedagogical move: make quadrant signs (+,+)(−,+)(−,−)(+,−) VISIBLE via
      // color, then make reflection (sign-flipping) and "walking the coordinate"
      // (movement) tangible operations. Closes the #1 confusion for middle schoolers.
      // Investigation (claim, evidence, reasoning): is reflecting across the x-axis
      // and then the y-axis the same as reflecting through the origin? The claim is
      // made first; evidence is three tested points; the check comes last.
      var renderInvestigation = function () {
        var iv = _cg.qtInvest && typeof _cg.qtInvest === 'object' ? _cg.qtInvest : {};
        var tested = Array.isArray(iv.tested) ? iv.tested.filter(finitePt).slice(0, 12) : [];
        var setIv = function (patch) { updCG({ qtInvest: Object.assign({}, iv, { tested: tested }, patch) }); };
        var CLAIMS = [
          { id: 'always', label: t('stem.coordgrid.inv_claim_always', 'Always the same point') },
          { id: 'sometimes', label: t('stem.coordgrid.inv_claim_sometimes', 'Sometimes the same point') },
          { id: 'never', label: t('stem.coordgrid.inv_claim_never', 'Never the same point') }
        ];
        var here = { x: qtPointX, y: qtPointY };
        var already = tested.some(function (p) { return CG_CORE.same(p, here); });
        var reasoning = typeof iv.reasoning === 'string' ? iv.reasoning : '';
        var ready = !!iv.claim && tested.length >= 3 && reasoning.trim().length >= 15;
        var check = function () {
          if (!ready) return;
          var ok = iv.claim === 'always';
          var msg = ok
            ? t('stem.coordgrid.inv_right', 'Your evidence supports your claim. Across the x-axis y changes sign; then across the y-axis x changes sign. Both signs change, which is exactly what a reflection through the origin does.')
            : t('stem.coordgrid.inv_wrong', 'Look at your evidence table: in every row the two results match. Revise your claim, then check again.');
          setIv({ result: ok ? 'right' : 'wrong', msg: msg });
          say(msg);
          if (ok) { sfxCorrect(); payOnce('invest:double-reflection', 5, 'reflection investigation'); } else sfxWrong();
        };
        return h('section', { 'aria-labelledby': 'coordgrid-inv-h', 'data-coordgrid-investigation': 'true', style: cardStyle },
          h('h4', { id: 'coordgrid-inv-h', style: { margin: '0 0 4px', fontSize: 14, fontWeight: 800 } }, t('stem.coordgrid.inv_title', 'Investigation: two reflections or one?')),
          h('p', { style: { margin: '0 0 8px', fontSize: 13 } }, t('stem.coordgrid.inv_question', 'Reflect a point across the x-axis, then reflect that image across the y-axis. Is the result the same as reflecting the point through the origin?')),
          h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
            h('legend', { style: { fontWeight: 700, fontSize: 13 } }, t('stem.coordgrid.inv_step_claim', '1. Claim (make it before you test)')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 } }, CLAIMS.map(function (cl) {
              return h('button', { key: cl.id, type: 'button', 'aria-pressed': iv.claim === cl.id, onClick: function () { setIv({ claim: cl.id, result: null, msg: null }); }, style: btnOn(iv.claim === cl.id) }, cl.label);
            }))),
          h('p', { style: { margin: '10px 0 4px', fontWeight: 700, fontSize: 13 } }, t('stem.coordgrid.inv_step_evidence', '2. Evidence: test at least three points, from different quadrants')),
          h('button', { type: 'button', disabled: !iv.claim || already, onClick: function () { setIv({ tested: tested.concat([here]) }); say(fill(t('stem.coordgrid.inv_tested', 'Tested {pair}.'), { pair: pairText(here) })); }, style: Object.assign({}, btnStyle, { opacity: !iv.claim || already ? 0.55 : 1 }) },
            fill(t('stem.coordgrid.inv_test_point', 'Test the focus point {pair}'), { pair: pairText(here) })),
          !iv.claim && h('p', { style: { margin: '4px 0 0', fontSize: 12, color: GP.muted } }, t('stem.coordgrid.inv_claim_first', 'Choose a claim first.')),
          tested.length > 0 && h('table', { style: { marginTop: 8, borderCollapse: 'collapse', fontSize: 13 } },
            h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, t('stem.coordgrid.inv_table', 'Your evidence')),
            h('thead', null, h('tr', null,
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, t('stem.coordgrid.inv_col_point', 'Point')),
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, t('stem.coordgrid.inv_col_twice', 'x-axis, then y-axis')),
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, t('stem.coordgrid.inv_col_origin', 'Through the origin')),
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, t('stem.coordgrid.inv_col_same', 'Same?')))),
            h('tbody', null, tested.map(function (p, i) {
              var twice = CG_CORE.reflectPoint(CG_CORE.reflectPoint(p, 'x'), 'y'), once = CG_CORE.reflectPoint(p, 'origin');
              return h('tr', { key: i }, h('td', { style: { padding: '2px 8px' } }, pairText(p)), h('td', { style: { padding: '2px 8px' } }, pairText(twice)), h('td', { style: { padding: '2px 8px' } }, pairText(once)),
                h('td', { style: { padding: '2px 8px' } }, CG_CORE.same(twice, once) ? t('stem.coordgrid.inv_yes', 'yes') : t('stem.coordgrid.inv_no', 'no')));
            }))),
          h('label', { style: { display: 'block', margin: '10px 0 4px', fontWeight: 700, fontSize: 13 } }, t('stem.coordgrid.inv_step_reasoning', '3. Reasoning: why does it happen?'),
            h('textarea', { value: reasoning, rows: 3, onChange: function (e) { setIv({ reasoning: e.target.value }); },
              style: { display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 8, border: '2px solid ' + GP.cardBorder, background: inputStyle.background, color: GP.ink, fontSize: 13 } })),
          h('button', { type: 'button', onClick: check, disabled: !ready, style: Object.assign({}, btnStyle, { opacity: ready ? 1 : 0.55 }) }, t('stem.coordgrid.inv_check', 'Check my claim')),
          !ready && h('p', { style: { margin: '4px 0 0', fontSize: 12, color: GP.muted } }, t('stem.coordgrid.inv_ready_note', 'Ready to check when you have a claim, three tested points and a sentence of reasoning.')),
          iv.msg && h('p', { role: 'status', style: { margin: '8px 0 0', fontWeight: 700, color: iv.result === 'right' ? GP.good : GP.bad } }, iv.msg));
      };

      var renderQuadrantTour = function() {
        var quadrants = [
          { id: 'II',  name: t('stem.coordgrid.q_ii', 'Q II'),  sign: '(−, +)', color: '#dc2626', ink: '#991b1b', soft: 'rgba(220,38,38,0.10)',  sample: { x: -3, y: 3 },  desc: t('stem.coordgrid.x_negative_y_positive', 'x negative, y positive') },
          { id: 'I',   name: t('stem.coordgrid.q_i', 'Q I'),   sign: '(+, +)', color: '#16a34a', ink: '#14532d', soft: 'rgba(22,163,74,0.10)',  sample: { x: 3,  y: 3 },  desc: t('stem.coordgrid.both_positive', 'both positive') },
          { id: 'III', name: t('stem.coordgrid.q_iii', 'Q III'), sign: '(−, −)', color: '#d97706', ink: '#78350f', soft: 'rgba(217,119,6,0.10)',  sample: { x: -3, y: -3 }, desc: t('stem.coordgrid.both_negative', 'both negative') },
          { id: 'IV',  name: t('stem.coordgrid.q_iv', 'Q IV'),  sign: '(+, −)', color: '#7c3aed', ink: '#5b21b6', soft: 'rgba(124,58,237,0.10)', sample: { x: 3,  y: -3 }, desc: t('stem.coordgrid.x_positive_y_negative', 'x positive, y negative') }
        ];

        var ref_x = { x: qtPointX,  y: -qtPointY };  // across x-axis
        var ref_y = { x: -qtPointX, y: qtPointY };   // across y-axis
        var ref_o = { x: -qtPointX, y: -qtPointY };  // through origin

        var doWalk = function() {
          sfxClick();
          say(fill(t('stem.coordgrid.walk_announce', 'Walking from the origin: {moves}.'), { moves: moveWords(qtPointX, qtPointY) }));
          // Reduced motion: show the finished path at once, no timed steps.
          if (reduceMotion) { updCG({ qtWalkPhase: 3 }); return; }
          updCG({ qtWalkPhase: 0 });
          later(function() { updCG({ qtWalkPhase: 1 }); }, 80);   // origin → (x, 0)
          later(function() { updCG({ qtWalkPhase: 2 }); }, 900);  // (x, 0) → (x, y)
          later(function() { updCG({ qtWalkPhase: 3 }); }, 1800); // settled
        };

        // Walker live position
        var walkerCoord = { x: 0, y: 0 };
        if (qtWalkPhase >= 2) walkerCoord = { x: qtPointX, y: qtPointY };
        else if (qtWalkPhase === 1) walkerCoord = { x: qtPointX, y: 0 };

        // Colored quadrant rectangles in SVG space
        var hcx = toSvg(0, 'x'), hcy = toSvg(0, 'y');
        var quadOverlay = [
          h('rect', { key: 'qIb',   className: 'allo-cg-quad-rect', x: hcx,  y: 0,    width: gridW - hcx, height: hcy,           fill: quadrants[1].soft, opacity: qtFocusedQuad === 'I'   ? 0.85 : 0.55 }),
          h('rect', { key: 'qIIb',  className: 'allo-cg-quad-rect', x: 0,    y: 0,    width: hcx,         height: hcy,           fill: quadrants[0].soft, opacity: qtFocusedQuad === 'II'  ? 0.85 : 0.55 }),
          h('rect', { key: 'qIIIb', className: 'allo-cg-quad-rect', x: 0,    y: hcy,  width: hcx,         height: gridH - hcy,   fill: quadrants[2].soft, opacity: qtFocusedQuad === 'III' ? 0.85 : 0.55 }),
          h('rect', { key: 'qIVb',  className: 'allo-cg-quad-rect', x: hcx,  y: hcy,  width: gridW - hcx, height: gridH - hcy,   fill: quadrants[3].soft, opacity: qtFocusedQuad === 'IV'  ? 0.85 : 0.55 }),
          h('text', { key: 'qIL',   x: gridW - 30, y: 18,         textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[1].color, opacity: 0.7 }, t('stem.coordgrid.q_i_2', 'Q I')),
          h('text', { key: 'qIIL',  x: 30,         y: 18,         textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[0].color, opacity: 0.7 }, t('stem.coordgrid.q_ii_2', 'Q II')),
          h('text', { key: 'qIIIL', x: 30,         y: gridH - 8,  textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[2].color, opacity: 0.7 }, t('stem.coordgrid.q_iii_2', 'Q III')),
          h('text', { key: 'qIVL',  x: gridW - 30, y: gridH - 8,  textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[3].color, opacity: 0.7 }, t('stem.coordgrid.q_iv_2', 'Q IV'))
        ];

        var mainPx = toSvg(qtPointX, 'x');
        var mainPy = toSvg(qtPointY, 'y');

        // Reflection ghost markers
        var reflectionEls = [];
        if (qtShowReflections) {
          var refs = [
            { p: ref_x, color: GP.rise, label: t('stem.coordgrid.across_x', 'across x') },
            { p: ref_y, color: GP.run, label: t('stem.coordgrid.across_y', 'across y') },
            { p: ref_o, color: GP.image, label: t('stem.coordgrid.thru_origin', 'thru origin') }
          ];
          refs.forEach(function(r, ri) {
            var rx = toSvg(r.p.x, 'x'), ry = toSvg(r.p.y, 'y');
            reflectionEls.push(h('line', { key: 'refl-' + ri, x1: mainPx, y1: mainPy, x2: rx, y2: ry, stroke: r.color, strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.35 }));
            reflectionEls.push(h('g', { key: 'refp-' + ri },
              h('circle', { cx: rx, cy: ry, r: 6, fill: r.color, opacity: 0.55, stroke: '#fff', strokeWidth: 1.5 }),
              h('text', { x: Math.min(gridW - 50, rx + 8), y: Math.max(12, ry - 8), fontSize: 11, fontWeight: 'bold', fill: r.color, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, pairText(r.p))
            ));
          });
        }

        // Walker (animated dot following walk-the-coordinate path)
        var wPx = toSvg(walkerCoord.x, 'x'), wPy = toSvg(walkerCoord.y, 'y');
        var walkerEl = qtWalkPhase > 0 ? h('g', {
          key: 'walker',
          className: 'allo-cg-walker',
          style: { transform: 'translate(' + (wPx - mainPx) + 'px, ' + (wPy - mainPy) + 'px)' }
        },
          h('circle', { cx: mainPx, cy: mainPy, r: 9, fill: GP.point, stroke: GP.pointStroke, strokeWidth: 2.5 }),
          h('circle', { cx: mainPx, cy: mainPy, r: 4, fill: GP.pointStroke })
        ) : null;

        // Walk path trail: L-shape from origin → (x, 0) → (x, y) with step labels.
        // Visible during/after walk, reinforces "first number = horizontal, second = vertical."
        var trailEls = [];
        var originPx = toSvg(0, 'x'), originPy = toSvg(0, 'y');
        var xAxisPx = toSvg(qtPointX, 'x');  // x coord on the x-axis (y=0)
        if (qtWalkPhase >= 1) {
          // Horizontal leg: origin → (qtPointX, 0)
          trailEls.push(h('line', {
            key: 'trail-h', className: 'allo-cg-trail',
            x1: originPx, y1: originPy, x2: xAxisPx, y2: originPy,
            stroke: GP.point, strokeWidth: 2.5, strokeDasharray: '6 3'
          }));
          // Label above mid-leg
          var hMidX = (originPx + xAxisPx) / 2;
          trailEls.push(h('text', { key: 'trail-h-lbl', className: 'allo-cg-trail',
            x: hMidX, y: originPy - 8, textAnchor: 'middle',
            fontSize: 11, fontWeight: 'bold', fill: GP.point
          }, (qtPointX >= 0 ? '→' : '←') + ' ' + Math.abs(qtPointX)));
        }
        if (qtWalkPhase >= 2) {
          // Vertical leg: (qtPointX, 0) → (qtPointX, qtPointY)
          trailEls.push(h('line', {
            key: 'trail-v', className: 'allo-cg-trail',
            x1: xAxisPx, y1: originPy, x2: mainPx, y2: mainPy,
            stroke: GP.point, strokeWidth: 2.5, strokeDasharray: '6 3'
          }));
          var vMidY = (originPy + mainPy) / 2;
          trailEls.push(h('text', { key: 'trail-v-lbl', className: 'allo-cg-trail',
            x: xAxisPx + 8, y: vMidY + 4, textAnchor: 'start',
            fontSize: 11, fontWeight: 'bold', fill: GP.point
          }, (qtPointY >= 0 ? '↑' : '↓') + ' ' + Math.abs(qtPointY)));
        }

        return h('div', { id: 'coordinate-section-panel', role: 'tabpanel', 'aria-labelledby': 'coordinate-section-tab-quadrants', tabIndex: 0, className: 'space-y-4 allo-cg-bg-quadrants' },

          // Four-up quadrant cards
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
            [quadrants[0], quadrants[1], quadrants[2], quadrants[3]].map(function(q) {
              var active = qtFocusedQuad === q.id;
              return h('button', {
                key: 'qcard-' + q.id,
                onClick: function() {
                  sfxClick();
                  updCG({ qtFocusedQuad: active ? null : q.id, qtPointX: q.sample.x, qtPointY: q.sample.y, qtWalkPhase: 0 });
                  say(fill(t('stem.coordgrid.quad_card_announce', '{quad}: {desc}. Example point {pair}.'), { quad: q.name, desc: q.desc, pair: pairText(q.sample) }));
                },
                'aria-pressed': active,
                'aria-label': fill(t('stem.coordgrid.quad_card_label', '{quad}: {desc}'), { quad: q.name, desc: q.desc }),
                className: 'rounded-lg p-2 text-center transition-all border-2 ' + (active ? 'shadow-lg ring-2 ring-offset-1' : 'hover:shadow-md opacity-90 hover:opacity-100'),
                style: { backgroundColor: q.soft, borderColor: q.color, color: q.ink }
              },
                h('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wider' }, q.name),
                h('div', { className: 'text-lg font-bold font-mono leading-tight' }, q.sign),
                h('div', { className: 'text-[0.625rem] italic mt-1' }, q.desc),
                h('div', { className: 'text-[0.625rem] font-mono mt-0.5' }, fill(t('stem.coordgrid.example_pair', 'for example {pair}'), { pair: pairText(q.sample) }))
              );
            })
          ),

          // Grid with quadrant overlay + point + reflections + walker
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('p', { className: 'text-[0.6875rem] font-bold text-purple-700 mb-2' },
              t('stem.coordgrid.colored_regions_are_the_four_quadrants', '🗺 Colored regions are the four quadrants. Change the focus point below to see how it moves.')
            ),
            h('div', { className: 'flex justify-center' },
              h('svg', {
                viewBox: '0 0 ' + gridW + ' ' + gridH, width: '100%', preserveAspectRatio: 'xMidYMid meet',
                style: { background: GP.surface, touchAction: 'manipulation', maxWidth: 440, height: 'auto', display: 'block' },
                className: 'allo-cg-grid',
                role: 'img',
                'aria-label': fill(t('stem.coordgrid.tour_grid_label', 'Coordinate grid with the focus point at {pair}, {where}.'), { pair: pairText({ x: qtPointX, y: qtPointY }), where: quadWhere(qtPointX, qtPointY) })
              },
                quadOverlay,
                gridElements,
                reflectionEls,
                trailEls,
                h('g', { className: 'allo-cg-point-pulse' },
                  h('circle', { cx: mainPx, cy: mainPy, r: 9, fill: GP.point, stroke: GP.pointStroke, strokeWidth: 2.5, className: 'allo-cg-fill' }),
                  h('text', { x: Math.min(gridW - 70, mainPx + 12), y: Math.max(14, mainPy - 10), fontSize: 13, fontWeight: 'bold', fill: GP.point, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, pairText({ x: qtPointX, y: qtPointY }))
                ),
                walkerEl
              )
            )
          ),

          // Point input controls
          h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-200' },
            h('p', { className: 'text-[0.6875rem] font-bold text-purple-800 mb-2' }, t('stem.coordgrid.focus_point_x_y', '📍 Focus point: ( x , y )')),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('span', { className: 'text-xs font-bold text-purple-700', 'aria-hidden': 'true' }, 'x:'),
              h('input', { type: 'number', value: qtPointX, min: gridRange.min, max: gridRange.max, step: 1,
                onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v)) updCG({ qtPointX: qtClamp(v, qtPointX), qtWalkPhase: 0 }); },
                'aria-label': t('stem.coordgrid.x_coordinate', 'X coordinate'),
                className: 'w-16 px-2 py-1 border border-purple-500 rounded text-center font-mono bg-white text-slate-900'
              }),
              h('span', { className: 'text-xs font-bold text-purple-700 ml-2', 'aria-hidden': 'true' }, 'y:'),
              h('input', { type: 'number', value: qtPointY, min: gridRange.min, max: gridRange.max, step: 1,
                onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v)) updCG({ qtPointY: qtClamp(v, qtPointY), qtWalkPhase: 0 }); },
                'aria-label': t('stem.coordgrid.y_coordinate', 'Y coordinate'),
                className: 'w-16 px-2 py-1 border border-purple-500 rounded text-center font-mono bg-white text-slate-900'
              }),
              h('span', { className: 'text-[0.6875rem] text-purple-700 ml-1 font-bold' }, quadWhere(qtPointX, qtPointY)),
              h('button', {
                onClick: doWalk,
                'aria-label': t('stem.coordgrid.animate_walk_from_origin_to_this_point', 'Animate walk from origin to this point'),
                className: 'ml-auto px-3 py-1 bg-purple-700 text-white text-xs font-bold rounded hover:bg-purple-800 transition-all'
              }, t('stem.coordgrid.walk_it', '▶ Walk it')),
              h('label', { className: 'text-[0.6875rem] font-bold text-purple-700 flex items-center gap-1 cursor-pointer ml-2' },
                h('input', { type: 'checkbox', checked: qtShowReflections, onChange: function() { updCG({ qtShowReflections: !qtShowReflections }); } }),
                t('stem.coordgrid.show_reflections', 'Show reflections')
              )
            )
          ),

          // Reflection breakdown (three cards)
          qtShowReflections && h('div', { className: 'grid grid-cols-3 gap-2' },
            h('div', { className: 'bg-red-50 rounded-lg p-2 border border-red-200 text-center' },
              h('p', { className: 'text-[0.625rem] font-bold text-red-700 uppercase tracking-wider' }, t('stem.coordgrid.across_x_axis', 'Across x-axis')),
              h('p', { className: 'text-base font-bold text-red-900 font-mono' }, pairText(ref_x)),
              h('p', { className: 'text-[0.625rem] text-red-700 italic mt-1' }, t('stem.coordgrid.y_flips_sign', 'y flips sign'))
            ),
            h('div', { className: 'bg-blue-50 rounded-lg p-2 border border-blue-200 text-center' },
              h('p', { className: 'text-[0.625rem] font-bold text-blue-700 uppercase tracking-wider' }, t('stem.coordgrid.across_y_axis', 'Across y-axis')),
              h('p', { className: 'text-base font-bold text-blue-900 font-mono' }, pairText(ref_y)),
              h('p', { className: 'text-[0.625rem] text-blue-700 italic mt-1' }, t('stem.coordgrid.x_flips_sign', 'x flips sign'))
            ),
            h('div', { className: 'bg-purple-50 rounded-lg p-2 border border-purple-200 text-center' },
              h('p', { className: 'text-[0.625rem] font-bold text-purple-700 uppercase tracking-wider' }, t('stem.coordgrid.through_origin', 'Through origin')),
              h('p', { className: 'text-base font-bold text-purple-900 font-mono' }, pairText(ref_o)),
              h('p', { className: 'text-[0.625rem] text-purple-700 italic mt-1' }, t('stem.coordgrid.both_flip', 'BOTH flip'))
            )
          ),

          // Claim-evidence-reasoning investigation: two reflections versus one.
          renderInvestigation(),

          // Multi-representation panel
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('p', { className: 'text-[0.6875rem] font-bold text-purple-700 mb-2' }, t('stem.coordgrid.same_point_three_names', '🔄 Same point, three names')),
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('div', { className: 'text-center bg-purple-50 rounded-lg p-2 border border-purple-200' },
                h('p', { className: 'text-[0.625rem] font-bold text-purple-700 uppercase' }, t('stem.coordgrid.ordered_pair', 'Ordered pair')),
                h('p', { className: 'text-xl font-bold text-purple-900 font-mono mt-1' }, pairText({ x: qtPointX, y: qtPointY }))
              ),
              h('div', { className: 'text-center bg-purple-50 rounded-lg p-2 border border-purple-200' },
                h('p', { className: 'text-[0.625rem] font-bold text-purple-700 uppercase' }, t('stem.coordgrid.in_words', 'In words')),
                h('p', { className: 'text-sm font-bold text-purple-900 mt-1' },
                  moveWords(qtPointX, qtPointY)
                )
              ),
              h('div', { className: 'text-center bg-purple-50 rounded-lg p-2 border border-purple-200' },
                h('p', { className: 'text-[0.625rem] font-bold text-purple-700 uppercase' }, t('stem.coordgrid.movement', 'Movement')),
                h('p', { className: 'text-base font-bold text-purple-900 mt-1 break-all' },
                  (Math.abs(qtPointX) === 0 ? '·' : (qtPointX > 0 ? '→' : '←').repeat(Math.min(Math.abs(qtPointX), 6))) + ' ' +
                  (Math.abs(qtPointY) === 0 ? '·' : (qtPointY > 0 ? '↑' : '↓').repeat(Math.min(Math.abs(qtPointY), 6)))
                )
              )
            )
          ),

          // Pedagogy panel
          h('details', { className: 'bg-white rounded-xl border border-purple-200 p-3' },
            h('summary', { className: 'text-xs font-bold text-purple-700 cursor-pointer' }, t('stem.coordgrid.why_coordinates_have_two_numbers', '💡 Why coordinates have two numbers')),
            h('div', { className: 'mt-2 space-y-2 text-xs text-slate-700' },
              h('p', {}, h('b', {}, t('stem.coordgrid.every_point_on_the_plane_has_exactly_t', 'Every point on the plane has exactly two numbers. ')),
                t('stem.coordgrid.the_first_is_the_x_coordinate_how_far_', 'The first is the x-coordinate (how far horizontal from origin: right is +, left is −). The second is the y-coordinate (how far vertical: up is +, down is −).')
              ),
              h('p', {}, h('b', {}, t('stem.coordgrid.the_order_matters', 'The order MATTERS. ')),
                t('stem.coordgrid.3_2_is_not_the_same_point_as_2_3_the_f', '(3, 2) is NOT the same point as (2, 3). The first number always pairs with x, the second always with y. Memory hook: "x comes first" alphabetically.')
              ),
              h('p', {}, h('b', {}, t('stem.coordgrid.four_quadrants_four_sign_combinations', 'Four quadrants = four sign combinations. ')),
                t('stem.coordgrid.q_i_both_positive_top_right_q_ii_x_is_', 'Q I both positive (top-right). Q II x is negative (top-left). Q III both negative (bottom-left). Q IV y is negative (bottom-right). The roman numerals go counterclockwise from top-right.')
              ),
              h('p', {}, h('b', {}, t('stem.coordgrid.reflection_flips_signs', 'Reflection flips signs. ')),
                t('stem.coordgrid.across_the_x_axis_y_flips_across_the_y', 'Across the x-axis: y flips. Across the y-axis: x flips. Through the origin: both flip. It is the simplest transformation in coordinate geometry.')
              )
            )
          )
        );
      };

      // ═══ REAL-WORLD MAPS TAB ═══
      // Pedagogical move: every grid system the student has ever seen — chess
      // boards, battleship grids, latitude/longitude — is a coordinate plane in
      // disguise. Different labeling (letters/numbers, degrees), same structure.
      var renderRealWorldMaps = function() {

        // ── Chess board (8×8, files a-h, ranks 1-8) ──
        // One tab stop: the arrow keys move between squares (roving tabindex),
        // Enter or Space selects (or answers a "find" challenge).
        var renderChess = function() {
          var sz = 360, cells = 8, cell = sz / cells;
          var files = ['a','b','c','d','e','f','g','h'];
          var validSq = function (s) { return typeof s === 'string' && s.length === 2 && files.indexOf(s.charAt(0)) >= 0 && '12345678'.indexOf(s.charAt(1)) >= 0; };
          var fileFromX = function(x) { return files[x] || '?'; };
          var notationFor = function(fx, ry) { return fileFromX(fx) + (8 - ry); };  // ry is SVG row 0=top
          var nameChallengeOpen = chessPracticeOn && chessChallenge && chessChallenge.type === 'name' && !chessFeedback;
          var chessTries = chessChallenge && typeof chessChallenge.tries === 'number' ? chessChallenge.tries : 0;
          var cursorSq = validSq(_cg.chessCursor) ? _cg.chessCursor : (validSq(chessSelected) ? chessSelected : 'e4');
          var PIECES = {
            '♜': t('stem.coordgrid.piece_black_rook', 'black rook'), '♞': t('stem.coordgrid.piece_black_knight', 'black knight'), '♝': t('stem.coordgrid.piece_black_bishop', 'black bishop'),
            '♛': t('stem.coordgrid.piece_black_queen', 'black queen'), '♚': t('stem.coordgrid.piece_black_king', 'black king'), '♟': t('stem.coordgrid.piece_black_pawn', 'black pawn'),
            '♖': t('stem.coordgrid.piece_white_rook', 'white rook'), '♘': t('stem.coordgrid.piece_white_knight', 'white knight'), '♗': t('stem.coordgrid.piece_white_bishop', 'white bishop'),
            '♕': t('stem.coordgrid.piece_white_queen', 'white queen'), '♔': t('stem.coordgrid.piece_white_king', 'white king'), '♙': t('stem.coordgrid.piece_white_pawn', 'white pawn')
          };
          var pieceAt = function (fx, ry) {
            if (ry === 0) return '♜♞♝♛♚♝♞♜'.charAt(fx);
            if (ry === 1) return '♟';
            if (ry === 6) return '♙';
            if (ry === 7) return '♖♘♗♕♔♗♘♖'.charAt(fx);
            return null;
          };
          // Position words that do not name the square: what a screen reader user
          // translates into notation, as a sighted student reads the board edges.
          var positionWords = function (fx, rank) {
            return fill(t('stem.coordgrid.chess_position', 'column {c} from the left, row {r} from the bottom'), { c: fx + 1, r: rank });
          };
          // The commonest notation slips.
          var chessDiag = function (ans, target) {
            if (ans === target) return 'correct';
            var af = files.indexOf(ans.charAt(0)), ar = +ans.charAt(1), tf = files.indexOf(target.charAt(0)), tr = +target.charAt(1);
            if (af === tf && ar === 9 - tr) return 'rank_flipped';
            if (af === 7 - tf && ar === tr) return 'file_flipped';
            if (af === tr - 1 && ar === tf + 1) return 'swapped';
            if (Math.abs(af - tf) + Math.abs(ar - tr) === 1) return 'off_by_one';
            return 'other';
          };
          var CHESS_MISC = {
            rank_flipped: t('stem.coordgrid.chess_mc_rank', 'Ranks are counted from the bottom of the board (White\'s side): rank 1 is the bottom row.'),
            file_flipped: t('stem.coordgrid.chess_mc_file', 'Files go a to h from left to right.'),
            swapped: t('stem.coordgrid.chess_mc_swapped', 'The letter names the column and the number names the row. Check that you did not swap them.'),
            off_by_one: t('stem.coordgrid.chess_mc_off', 'Very close: one square away.'),
            other: t('stem.coordgrid.mc_other', 'Not yet.')
          };

          // Practice-mode helpers
          var newChessChallenge = function() {
            var target, type, n = 0;
            do {
              target = files[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
              type = Math.random() < 0.5 ? 'name' : 'find';
            } while (chessChallenge && target === chessChallenge.target && n++ < 20);
            sfxClick();
            updCG({
              chessChallenge: { type: type, target: target, tries: 0 },
              chessChallengeInput: '',
              chessFeedback: null,
              // For "name" challenges, highlight the target square so the student SEES it
              chessSelected: type === 'name' ? target : chessSelected
            });
            var tf = files.indexOf(target.charAt(0)), trk = +target.charAt(1);
            say(type === 'name'
              ? fill(t('stem.coordgrid.chess_name_prompt_sr', 'Name the highlighted square. It is {pos}.'), { pos: positionWords(tf, trk) })
              : fill(t('stem.coordgrid.chess_find_prompt', 'Find the square {sq}.'), { sq: target }));
          };
          var resolveChessChallenge = function(answered) {
            if (!chessChallenge || chessFeedback) return;
            var code = chessDiag(answered, chessChallenge.target);
            var ok = code === 'correct';
            // The square that just missed, chosen again: no try used.
            if (!ok && chessTries === 1 && chessChallenge.lastAns === answered) {
              var sameSq = '❌ ' + CHESS_MISC[code] + ' ' + sameAnswerNote;
              updCG({ chessChallengeInput: '', chessRetryMsg: sameSq });
              say(sameSq);
              return;
            }
            if (!ok && chessTries < 1) {
              sfxWrong();
              var again = '❌ ' + CHESS_MISC[code] + ' ' + t('stem.coordgrid.try_once_more', 'Try once more.');
              updCG({ chessChallenge: Object.assign({}, chessChallenge, { tries: 1, lastAns: answered }), chessChallengeInput: '', chessChallStreak: 0, chessRetryMsg: again });
              say(again);
              return;
            }
            var newStreak = ok ? chessChallStreak + 1 : 0;
            var newSolved = chessSolved + (ok ? 1 : 0);
            if (ok) { sfxCorrect(); if (newStreak >= 3) sfxStreak(); } else { sfxWrong(); }
            // A second miss closes the square; its answer waits for "Show the answer".
            var msg = ok
              ? '✅ ' + fill(chessTries ? t('stem.coordgrid.chess_correct_second', 'Correct on your second try: {sq}.') : t('stem.coordgrid.chess_correct', 'Correct: {sq}.'), { sq: chessChallenge.target })
              : '❌ ' + fill(t('stem.coordgrid.chess_closed', 'Not this time. You said {ans}.'), { ans: answered }) + ' ' + closedText(false);
            updCG({
              chessFeedback: { correct: ok, msg: msg, revealed: false },
              chessSolved: newSolved,
              chessChallStreak: newStreak,
              chessRetryMsg: null,
              chessSelected: ok ? chessChallenge.target : chessSelected
            });
            say(msg);
            if (!ok) logMiss('chess', fill(t('stem.coordgrid.chess_log_prompt', 'Chess square {sq}'), { sq: chessChallenge.target }), code);
            if (ok) payOnce('chess:' + chessChallenge.type + ':' + chessChallenge.target, chessTries ? 2 : 4, 'chess notation');
            checkBadges({ chessSolved: newSolved });
          };
          var submitChessName = function() {
            var v = (chessChallengeInput || '').toLowerCase().trim();
            if (validSq(v)) {
              resolveChessChallenge(v);
            } else {
              var warn = t('stem.coordgrid.chess_format', 'Type a square like e4: a letter from a to h, then a number from 1 to 8.');
              addToast(warn, 'warning');
              say(warn);
            }
          };
          var activateSquare = function (notation) {
            // If practice mode + Find challenge is active, treat the square as the answer
            if (chessPracticeOn && chessChallenge && chessChallenge.type === 'find' && !chessFeedback) {
              updCG({ chessCursor: notation });
              resolveChessChallenge(notation);
              return;
            }
            if (nameChallengeOpen) { say(t('stem.coordgrid.chess_type_name', 'Type the name of the highlighted square in the box below.')); return; }
            sfxClick();
            updCG({ chessSelected: notation, chessCursor: notation });
            say(fill(t('stem.coordgrid.chess_selected_sr', 'Selected {sq}: file {f}, rank {r}.'), { sq: notation, f: notation.charAt(0), r: notation.charAt(1) }));
          };
          var squareLabel = function (fx, ry) {
            var rank = 8 - ry, n = notationFor(fx, ry), pc = pieceAt(fx, ry);
            var hl = nameChallengeOpen && n === chessSelected;
            if (nameChallengeOpen) return hl ? fill(t('stem.coordgrid.chess_sq_highlighted', 'Highlighted square: {pos}'), { pos: positionWords(fx, rank) }) : positionWords(fx, rank);
            return pc ? fill(t('stem.coordgrid.chess_sq_piece', '{sq}, {piece}'), { sq: n, piece: PIECES[pc] }) : n;
          };
          var chessKeyDown = function (e) {
            var f = files.indexOf(cursorSq.charAt(0)), r = +cursorSq.charAt(1);
            if (e.key === 'ArrowRight') f = Math.min(7, f + 1);
            else if (e.key === 'ArrowLeft') f = Math.max(0, f - 1);
            else if (e.key === 'ArrowUp') r = Math.min(8, r + 1);
            else if (e.key === 'ArrowDown') r = Math.max(1, r - 1);
            else if (e.key === 'Home') f = 0;
            else if (e.key === 'End') f = 7;
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateSquare(cursorSq); return; }
            else return;
            e.preventDefault();
            var next = files[f] + r;
            updCG({ chessCursor: next });
            requestAnimationFrame(function () { var el = document.getElementById('cg-chess-sq-' + next); if (el && el.focus) el.focus(); });
          };

          var selFile = chessSelected.charAt(0);
          var selRank = parseInt(chessSelected.charAt(1), 10);
          var selFx = files.indexOf(selFile);
          var selRy = 8 - selRank;
          var squares = [];
          for (var ry = 0; ry < cells; ry++) {
            for (var fx = 0; fx < cells; fx++) {
              var isLight = (fx + ry) % 2 === 0;
              var isSelected = fx === selFx && ry === selRy;
              var nota = notationFor(fx, ry);
              squares.push(h('rect', {
                key: 'cs-' + fx + '-' + ry,
                id: 'cg-chess-sq-' + nota,
                className: 'allo-cg-sq',
                x: fx * cell, y: ry * cell, width: cell, height: cell,
                fill: isSelected ? '#047857' : (isLight ? '#f5deb3' : '#a0826d'),
                stroke: isSelected ? '#022c22' : '#7c5e48',
                strokeWidth: isSelected ? 2.5 : 0.5,
                role: 'button',
                tabIndex: nota === cursorSq ? 0 : -1,
                'aria-label': squareLabel(fx, ry),
                'aria-pressed': isSelected && !nameChallengeOpen ? 'true' : 'false',
                style: { cursor: 'pointer', transition: 'fill 0.18s ease' },
                onFocus: function (n) { return function () { if (_cg.chessCursor !== n) updCG({ chessCursor: n }); }; }(nota),
                onKeyDown: chessKeyDown,
                onClick: function(n) { return function() { activateSquare(n); }; }(nota)
              }));
              // The selected square shows its name, except while it is the question.
              if (isSelected && !nameChallengeOpen) {
                squares.push(h('text', { key: 'cstxt-' + fx + '-' + ry,
                  x: fx * cell + cell / 2, y: ry * cell + cell / 2 + 6,
                  textAnchor: 'middle', fontSize: 18, fontWeight: 'bold', fill: '#ffffff',
                  style: { pointerEvents: 'none' }, 'aria-hidden': 'true'
                }, nota));
              } else if (!isSelected) {
                // Starting-position chess piece glyphs (ry: 0=rank 8 black, 1=rank 7, 6=rank 2, 7=rank 1 white)
                var pieceChar = pieceAt(fx, ry);
                var pieceColor = ry <= 1 ? '#1e293b' : '#f8fafc';
                if (pieceChar) {
                  squares.push(h('text', { key: 'piece-' + fx + '-' + ry,
                    x: fx * cell + cell / 2, y: ry * cell + cell / 2 + 9,
                    textAnchor: 'middle', fontSize: 24, fill: pieceColor, 'aria-hidden': 'true',
                    style: { pointerEvents: 'none',
                      textShadow: pieceColor === '#f8fafc' ? '0 0 2px rgba(0,0,0,0.6)' : '0 0 2px rgba(255,255,255,0.3)'
                    }
                  }, pieceChar));
                }
              }
            }
          }
          // File/rank labels around board
          var labels = [];
          for (var i = 0; i < 8; i++) {
            labels.push(h('text', { key: 'fl-' + i, x: i * cell + cell / 2, y: sz + 16, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: isDark || isContrast ? '#e7d3c2' : '#5c4033', 'aria-hidden': 'true' }, files[i]));
            labels.push(h('text', { key: 'rl-' + i, x: -10, y: i * cell + cell / 2 + 4, textAnchor: 'end', fontSize: 12, fontWeight: 'bold', fill: isDark || isContrast ? '#e7d3c2' : '#5c4033', 'aria-hidden': 'true' }, 8 - i));
          }
          var boardLabel = nameChallengeOpen
            ? t('stem.coordgrid.chess_board_question', 'Chess board. One square is highlighted: name it. Use the arrow keys to move between squares.')
            : fill(t('stem.coordgrid.chess_board_label', 'Chess board, selected square {sq}. Use the arrow keys to move between squares and Enter to select.'), { sq: chessSelected });
          return h('div', { className: 'space-y-3' },
            h('p', { className: 'text-[0.6875rem] text-slate-700' },
              h('b', {}, t('stem.coordgrid.chess_board_notation', 'Chess board notation. ')),
              t('stem.coordgrid.columns_files_are_letters_a_h_rows_ran', 'Columns (files) are letters a-h. Rows (ranks) are numbers 1-8. Every square has a letter+number coordinate. The white queen starts at d1, the black king at e8.')
            ),
            h('div', { className: 'flex justify-center bg-white rounded-xl border-2 border-emerald-200 p-2 sm:p-4' },
              // Left margin 22, not 15: the rank numbers sit outside the board and
              // were being shaved by ~2px on their left edge. Nothing is drawn
              // at the right edge, so the extra room comes from there.
              h('svg', { viewBox: '-22 -5 ' + (sz + 30) + ' ' + (sz + 30), width: '100%', preserveAspectRatio: 'xMidYMid meet',
                style: { background: 'transparent', maxWidth: sz + 30, height: 'auto', display: 'block' }, role: 'group',
                'aria-label': boardLabel
              }, squares, labels)
            ),
            h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 flex flex-wrap items-center gap-3' },
              h('div', { className: 'flex items-center gap-1' },
                h('span', { className: 'text-xs font-bold text-emerald-800' }, t('stem.coordgrid.chess_selected', 'Selected:')),
                h('span', { className: 'text-lg font-bold font-mono text-emerald-900' }, nameChallengeOpen ? '?' : chessSelected),
                !nameChallengeOpen && h('span', { className: 'text-[0.6875rem] text-emerald-800' }, fill(t('stem.coordgrid.chess_file_rank', '= (file {f}, rank {r})'), { f: selFx + 1, r: 8 - selRy }))
              ),
              h('div', { className: 'flex items-center gap-1 ml-auto' },
                h('label', { htmlFor: 'cg-chess-jump', className: 'text-xs font-bold text-emerald-800' }, t('stem.coordgrid.type_a_square', 'Type a square:')),
                h('input', { id: 'cg-chess-jump', type: 'text', value: chessInput, maxLength: 2, disabled: !!nameChallengeOpen,
                  onChange: function(e) { updCG({ chessInput: e.target.value.toLowerCase() }); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter') {
                      var v = (chessInput || '').toLowerCase().trim();
                      if (validSq(v)) {
                        updCG({ chessInput: '' });
                        activateSquare(v);
                      } else {
                        var warn = t('stem.coordgrid.chess_format', 'Type a square like e4: a letter from a to h, then a number from 1 to 8.');
                        addToast(warn, 'warning');
                        say(warn);
                      }
                    }
                  },
                  placeholder: 'e4',
                  'aria-label': t('stem.coordgrid.type_a_chess_square_like_e4', 'Type a chess square like e4'),
                  className: 'w-16 px-2 py-1 border border-emerald-600 rounded text-center font-mono uppercase bg-white text-slate-900',
                  style: { minHeight: 44 }
                })
              )
            ),
            !nameChallengeOpen && h('div', { className: 'flex flex-wrap gap-1 text-[0.6875rem]' },
              h('span', { className: 'font-bold text-emerald-800 self-center mr-1' }, t('stem.coordgrid.chess_try', 'Try:')),
              ['a1','e4','h8','d5','g2','b6'].map(function(s) {
                return h('button', { key: 'cspre-' + s,
                  onClick: function() { activateSquare(s); },
                  style: { minHeight: 32, minWidth: 40 },
                  className: 'px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-600 font-mono hover:bg-emerald-50'
                }, s);
              })
            ),

            // ── Practice mode (skill drill) ──
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                h('label', { className: 'text-xs font-bold text-amber-800 flex items-center gap-1 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: chessPracticeOn, style: { width: 20, height: 20 },
                    onChange: function() { sfxClick(); updCG({ chessPracticeOn: !chessPracticeOn, chessChallenge: null, chessFeedback: null, chessChallengeInput: '', chessRetryMsg: null }); }
                  }),
                  t('stem.coordgrid.practice_mode_translate_squares_to_not', '🎯 Practice mode — translate squares to notation')
                ),
                chessPracticeOn && h('span', { className: 'text-[0.6875rem] font-bold text-amber-800 ml-auto' },
                  fill(t('stem.coordgrid.practice_tally', '{n} solved, streak {s}'), { n: chessSolved, s: chessChallStreak })
                )
              ),
              chessPracticeOn && !chessChallenge && h('button', {
                onClick: newChessChallenge,
                className: 'w-full py-2 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-bold rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-md'
              }, t('stem.coordgrid.start_a_challenge', '▶ Start a challenge')),
              chessPracticeOn && chessChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold text-amber-900' },
                  chessChallenge.type === 'name'
                    ? t('stem.coordgrid.chess_name_prompt', 'What square is highlighted? Type its chess notation.')
                    : fill(t('stem.coordgrid.chess_find_prompt_click', 'Choose the square {sq} on the board.'), { sq: chessChallenge.target })
                ),
                chessChallenge.type === 'name' && !chessFeedback && h('p', { className: 'text-xs text-amber-900' },
                  fill(t('stem.coordgrid.chess_name_where', 'The highlighted square is {pos}.'), { pos: positionWords(files.indexOf(chessChallenge.target.charAt(0)), +chessChallenge.target.charAt(1)) })),
                chessChallenge.type === 'name' && !chessFeedback && h('div', { className: 'flex items-center gap-2' },
                  h('input', { type: 'text', value: chessChallengeInput, maxLength: 2,
                    onChange: function(e) { updCG({ chessChallengeInput: e.target.value.toLowerCase() }); },
                    onKeyDown: function(e) { if (e.key === 'Enter') submitChessName(); },
                    placeholder: t('stem.coordgrid.e_g_f6', 'e.g. f6'),
                    'aria-label': t('stem.coordgrid.type_the_chess_notation_for_the_highli', 'Type the chess notation for the highlighted square'),
                    className: 'flex-1 px-3 py-1.5 border-2 border-amber-700 rounded-lg text-sm font-mono uppercase text-center',
                    style: { minHeight: 44 }
                  }),
                  h('button', { onClick: submitChessName, style: { minHeight: 44 },
                    className: 'px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800'
                  }, t('stem.coordgrid.check', '✔ Check'))
                ),
                !chessFeedback && _cg.chessRetryMsg && h('p', { className: 'text-sm font-bold text-red-700', role: 'status' }, _cg.chessRetryMsg),
                chessFeedback && h('p', { className: 'text-sm font-bold ' + (chessFeedback.correct ? 'text-green-700' : 'text-red-700'), role: 'status' }, chessFeedback.msg),
                revealBtn(!!(chessFeedback && !chessFeedback.correct && !chessFeedback.revealed && revealsAllowed), function () {
                  var am = '❌ ' + fill(t('stem.coordgrid.chess_answer_is', 'The square was {sq}. It is now highlighted.'), { sq: chessChallenge.target });
                  updCG({ chessFeedback: Object.assign({}, chessFeedback, { msg: am, revealed: true }), chessSelected: chessChallenge.target });
                  say(am);
                }, 'chess-reveal'),
                chessFeedback && h('button', { onClick: newChessChallenge, style: { minHeight: 44 },
                  className: 'text-xs font-bold text-amber-800 hover:underline'
                }, t('stem.coordgrid.next_challenge', '➡ Next challenge'))
              ),
              chessPracticeOn && h('p', { className: 'text-[0.625rem] text-amber-800 italic mt-2' },
                t('stem.coordgrid.alternates_two_directions_see_the_squa', 'Alternates two directions: see-the-square name it, hear-the-name find it. 5 in a row earns the ♟️ Chess Master badge.')
              )
            ),

            h('p', { className: 'text-[0.6875rem] text-slate-600 italic' },
              t('stem.coordgrid.chess_notation_works_because_it_pairs_', '💡 Chess notation works because it pairs one number-system (letters as positions) with another (numbers as positions). The "name" of the square IS its coordinate, just written differently than (5, 4).')
            )
          );
        };

        // ── Battleship (10×10, ships placed once, click cells to call shots) ──
        var generateShips = function() {
          var sizes = [4, 3, 3, 2];
          var ships = [];
          var occupied = {};
          for (var s = 0; s < sizes.length; s++) {
            var size = sizes[s];
            var placed = false, attempts = 0;
            while (!placed && attempts < 200) {
              attempts++;
              var horizontal = Math.random() < 0.5;
              var x = Math.floor(Math.random() * (horizontal ? (10 - size + 1) : 10));
              var y = Math.floor(Math.random() * (horizontal ? 10 : (10 - size + 1)));
              var cells = [], conflict = false;
              for (var k = 0; k < size; k++) {
                var cx = horizontal ? x + k : x;
                var cy = horizontal ? y : y + k;
                if (occupied[cx + '_' + cy]) { conflict = true; break; }
                cells.push({ x: cx, y: cy });
              }
              if (!conflict) {
                cells.forEach(function(c) { occupied[c.x + '_' + c.y] = s; });
                ships.push({ size: size, cells: cells });
                placed = true;
              }
            }
          }
          return ships;
        };

        var startBattleship = function() {
          sfxClick();
          updCG({ bsShips: generateShips(), bsShots: [], bsWon: false, bsLastResult: '', bsCursor: { x: 0, y: 0 } });
          say(t('stem.coordgrid.bs_started', 'New battleship game started. Four ships are hidden on a 10 by 10 grid.'));
        };

        // One tab stop for the 100 cells: arrow keys move, Enter or Space fires.
        var renderBattleship = function() {
          var sz = 360, cells = 10, cell = sz / cells;
          var letters = ['A','B','C','D','E','F','G','H','I','J'];
          var notationFor = function(cx, cy) { return letters[cx] + (cy + 1); };

          if (!bsShips) {
            return h('div', { className: 'space-y-3' },
              h('p', { className: 'text-[0.6875rem] text-slate-700' },
                h('b', {}, t('stem.coordgrid.battleship_a_coordinate_calling_game', 'Battleship: a coordinate-calling game. ')),
                t('stem.coordgrid.i_will_hide_4_ships_sizes_4_3_3_2_on_a', 'I will hide 4 ships (sizes 4, 3, 3, 2) on a 10×10 grid. Letters A-J across, numbers 1-10 down. Call coordinates to find them. All ships sunk = you win.')
              ),
              h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center' },
                h('p', { className: 'text-sm font-bold text-emerald-800 mb-2' }, t('stem.coordgrid.ready_to_play', '⚓ Ready to play?')),
                h('button', {
                  onClick: startBattleship, style: { minHeight: 44 },
                  className: 'px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg text-sm hover:bg-emerald-800 shadow-md transition-all'
                }, t('stem.coordgrid.start_new_game', '▶ Start new game'))
              )
            );
          }

          // Build lookup tables
          var hitMap = {}; // "x_y" → 'hit' | 'miss'
          bsShots.forEach(function(sh) {
            if (!sh || !isFinite(sh.x) || !isFinite(sh.y)) return;
            hitMap[sh.x + '_' + sh.y] = sh.hit ? 'hit' : 'miss';
          });
          var validShips = bsShips.filter(function (ship) { return ship && Array.isArray(ship.cells) && ship.cells.length; });

          // Ship sunk status (a ship is sunk if all its cells are hit)
          var sunkShips = validShips.map(function(ship) {
            return ship.cells.every(function(c) { return hitMap[c.x + '_' + c.y] === 'hit'; });
          });
          var totalSunk = sunkShips.filter(Boolean).length;
          var totalHits = bsShots.filter(function(s) { return s && s.hit; }).length;
          var totalShots = bsShots.length;
          var won = validShips.length > 0 && sunkShips.every(Boolean);

          if (won && !bsWon) {
            later(function() {
              var isNewBest = bsBest == null || totalShots < bsBest;
              var updates = { bsWon: true };
              if (isNewBest) updates.bsBest = totalShots;
              updCG(updates);
              sfxBadge();
              var winMsg = isNewBest
                ? fill(t('stem.coordgrid.bs_new_best', 'New best! All ships sunk in {n} shots.'), { n: totalShots })
                : fill(t('stem.coordgrid.bs_won', 'All ships sunk in {n} shots. Your best is {best}.'), { n: totalShots, best: bsBest });
              addToast('🏆 ' + winMsg, 'success');
              say(winMsg);
              checkBadges({ bsBest: isNewBest ? totalShots : bsBest });
            }, 0);
          }

          var cur = _cg.bsCursor && isFinite(_cg.bsCursor.x) && isFinite(_cg.bsCursor.y) ? { x: Math.max(0, Math.min(9, _cg.bsCursor.x)), y: Math.max(0, Math.min(9, _cg.bsCursor.y)) } : { x: 0, y: 0 };

          var fireAt = function(cx, cy) {
            var key = cx + '_' + cy;
            if (won) { say(t('stem.coordgrid.bs_game_over', 'Game over. Start a new game to fire again.')); return; }
            if (hitMap[key]) { say(fill(t('stem.coordgrid.bs_already', 'You already fired at {sq}. Pick a different square.'), { sq: notationFor(cx, cy) })); return; }
            var hit = false;
            for (var si = 0; si < validShips.length; si++) {
              if (validShips[si].cells.some(function(c) { return c.x === cx && c.y === cy; })) { hit = true; break; }
            }
            if (hit) sfxCorrect(); else sfxWrong();
            var newShots = bsShots.concat([{ x: cx, y: cy, hit: hit }]);
            // Explicit coordinate translation: shows "B5 = column 2, row 5" alongside hit/miss
            var msg = fill(hit ? t('stem.coordgrid.bs_hit', 'Hit at {sq} (column {c}, row {r}).') : t('stem.coordgrid.bs_miss', 'Miss at {sq} (column {c}, row {r}).'), { sq: notationFor(cx, cy), c: cx + 1, r: cy + 1 });
            updCG({ bsShots: newShots, bsLastResult: (hit ? '💥 ' : '💧 ') + msg, bsCursor: { x: cx, y: cy } });
            say(msg);
          };
          var bsKeyDown = function (e) {
            var x = cur.x, y = cur.y;
            if (e.key === 'ArrowRight') x = Math.min(9, x + 1);
            else if (e.key === 'ArrowLeft') x = Math.max(0, x - 1);
            else if (e.key === 'ArrowDown') y = Math.min(9, y + 1);
            else if (e.key === 'ArrowUp') y = Math.max(0, y - 1);
            else if (e.key === 'Home') x = 0;
            else if (e.key === 'End') x = 9;
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fireAt(cur.x, cur.y); return; }
            else return;
            e.preventDefault();
            updCG({ bsCursor: { x: x, y: y } });
            requestAnimationFrame(function () { var el = document.getElementById('cg-bs-' + x + '-' + y); if (el && el.focus) el.focus(); });
          };

          var squares = [];
          for (var ry = 0; ry < cells; ry++) {
            for (var cx = 0; cx < cells; cx++) {
              var key = cx + '_' + ry;
              var state = hitMap[key];
              var fillColor = '#dbeafe';
              if (state === 'hit') fillColor = '#fca5a5';
              else if (state === 'miss') fillColor = '#f1f5f9';
              // Show sunk ship cells in darker red
              if (state === 'hit') {
                for (var si2 = 0; si2 < validShips.length; si2++) {
                  if (sunkShips[si2] && validShips[si2].cells.some(function(c) { return c.x === cx && c.y === ry; })) {
                    fillColor = '#dc2626';
                  }
                }
              }
              var bsStateMsg = state === 'hit' ? t('stem.coordgrid.bs_cell_hit', 'hit') : (state === 'miss' ? t('stem.coordgrid.bs_cell_miss', 'miss') : t('stem.coordgrid.bs_cell_open', 'not fired at yet'));
              squares.push(h('rect', {
                key: 'bs-' + cx + '-' + ry,
                id: 'cg-bs-' + cx + '-' + ry,
                className: 'allo-cg-sq',
                x: cx * cell, y: ry * cell, width: cell, height: cell,
                fill: fillColor,
                stroke: '#0c4a6e', strokeWidth: 0.5,
                style: { cursor: state || won ? 'default' : 'crosshair', transition: 'fill 0.18s ease' },
                role: 'button',
                tabIndex: cx === cur.x && ry === cur.y ? 0 : -1,
                'aria-label': notationFor(cx, ry) + ', ' + bsStateMsg,
                'aria-disabled': (state || won) ? 'true' : 'false',
                onFocus: function(x, y) { return function () { if (!_cg.bsCursor || _cg.bsCursor.x !== x || _cg.bsCursor.y !== y) updCG({ bsCursor: { x: x, y: y } }); }; }(cx, ry),
                onClick: function(x, y) { return function() { fireAt(x, y); }; }(cx, ry),
                onKeyDown: bsKeyDown
              }));
              if (state === 'hit') {
                squares.push(h('text', { key: 'bst-' + cx + '-' + ry,
                  x: cx * cell + cell / 2, y: ry * cell + cell / 2 + 5,
                  textAnchor: 'middle', fontSize: 16, style: { pointerEvents: 'none' }, 'aria-hidden': 'true'
                }, '💥'));
              } else if (state === 'miss') {
                squares.push(h('circle', { key: 'bsm-' + cx + '-' + ry,
                  cx: cx * cell + cell / 2, cy: ry * cell + cell / 2, r: 4,
                  fill: '#475569', style: { pointerEvents: 'none' }, 'aria-hidden': 'true'
                }));
              }
            }
          }
          // Letter labels (top) and number labels (left)
          var labels = [];
          var bsInk = isDark || isContrast ? '#bae6fd' : '#0c4a6e';
          for (var i = 0; i < 10; i++) {
            labels.push(h('text', { key: 'bl-' + i, x: i * cell + cell / 2, y: -6, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: bsInk, 'aria-hidden': 'true' }, letters[i]));
            labels.push(h('text', { key: 'bn-' + i, x: -8, y: i * cell + cell / 2 + 4, textAnchor: 'end', fontSize: 11, fontWeight: 'bold', fill: bsInk, 'aria-hidden': 'true' }, i + 1));
          }

          // Splash animation on the most-recent shot (red for hit, blue for miss).
          // The React key includes bsShots.length so a new shot re-mounts the element
          // and the CSS animation replays (reduced motion: no animation).
          var splashEl = null;
          if (bsShots.length > 0 && !reduceMotion) {
            var ls = bsShots[bsShots.length - 1];
            if (ls && isFinite(ls.x) && isFinite(ls.y)) splashEl = h('circle', {
              key: 'splash-' + bsShots.length,
              cx: ls.x * cell + cell / 2,
              cy: ls.y * cell + cell / 2,
              r: 6,
              fill: 'none',
              stroke: ls.hit ? '#dc2626' : '#0ea5e9',
              strokeWidth: 3,
              className: 'allo-cg-splash',
              'aria-hidden': 'true'
            });
          }
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'flex flex-wrap items-center gap-3' },
              h('p', { className: 'text-[0.6875rem] text-slate-700 flex-1' },
                h('b', {}, t('stem.coordgrid.call_coordinates_to_find_the_ships', 'Call coordinates to find the ships. ')),
                t('stem.coordgrid.click_any_cell_to_fire_hit_miss_a_ship', 'Click any cell to fire. 💥 = hit, · = miss. A ship is sunk when all its cells are hit.')
              ),
              h('button', { onClick: startBattleship, style: { minHeight: 44 },
                className: 'px-3 py-1.5 bg-white text-emerald-800 border border-emerald-600 text-xs font-bold rounded hover:bg-emerald-50'
              }, t('stem.coordgrid.new_game', '🔄 New game'))
            ),
            h('div', { className: 'flex justify-center bg-white rounded-xl border-2 border-emerald-200 p-2 sm:p-4' },
              h('svg', { viewBox: '-15 -15 ' + (sz + 30) + ' ' + (sz + 30), width: '100%', preserveAspectRatio: 'xMidYMid meet',
                style: { background: 'transparent', maxWidth: sz + 30, height: 'auto', display: 'block' }, role: 'group',
                'aria-label': fill(t('stem.coordgrid.bs_grid_label', 'Battleship grid: {shots} shots fired, {hits} hits, {sunk} of 4 ships sunk. Arrow keys move between cells; Enter fires.'), { shots: totalShots, hits: totalHits, sunk: totalSunk })
              }, squares, labels, splashEl)
            ),
            // Typing a square is a second keyboard path (and the fastest one).
            h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 flex flex-wrap items-center gap-3' },
              h('label', { htmlFor: 'cg-bs-input', className: 'text-xs font-bold text-emerald-800' }, t('stem.coordgrid.type_a_square_to_fire', 'Type a square to fire:')),
              h('input', { id: 'cg-bs-input', type: 'text', value: bsInput, maxLength: 3,
                onChange: function(e) { updCG({ bsInput: e.target.value.toUpperCase() }); },
                onKeyDown: function(e) {
                  if (e.key === 'Enter') {
                    var v = (bsInput || '').toUpperCase().trim();
                    var letterIdx = letters.indexOf(v.charAt(0));
                    var rowNum = /^\d{1,2}$/.test(v.substring(1)) ? parseInt(v.substring(1), 10) : NaN;
                    if (v.length < 2 || v.length > 3 || letterIdx < 0 || isNaN(rowNum) || rowNum < 1 || rowNum > 10) {
                      var warn = t('stem.coordgrid.bs_format', 'Enter a square like B5: a letter from A to J, then a number from 1 to 10.');
                      addToast(warn, 'warning');
                      say(warn);
                      return;
                    }
                    fireAt(letterIdx, rowNum - 1);
                    updCG({ bsInput: '' });
                  }
                },
                placeholder: 'B5',
                'aria-label': t('stem.coordgrid.type_a_battleship_coordinate_like_b5_t', 'Type a Battleship coordinate like B5, then press Enter to fire'),
                className: 'w-20 px-2 py-1 border border-emerald-600 rounded text-center font-mono uppercase',
                style: { minHeight: 44 }
              }),
              h('span', { className: 'text-[0.6875rem] text-emerald-800' }, t('stem.coordgrid.bs_keys_hint', 'or use the arrow keys on the grid and press Enter'))
            ),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('div', { className: 'bg-emerald-50 rounded-lg p-2 border border-emerald-200 text-center' },
                h('p', { className: 'text-[0.625rem] font-bold text-emerald-800 uppercase' }, t('stem.coordgrid.shots', 'Shots')),
                h('p', { className: 'text-xl font-bold text-emerald-900' }, totalShots)
              ),
              h('div', { className: 'bg-rose-50 rounded-lg p-2 border border-rose-200 text-center' },
                h('p', { className: 'text-[0.625rem] font-bold text-rose-800 uppercase' }, t('stem.coordgrid.hits', 'Hits')),
                h('p', { className: 'text-xl font-bold text-rose-900' }, totalHits)
              ),
              h('div', { className: 'bg-slate-50 rounded-lg p-2 border border-slate-200 text-center' },
                h('p', { className: 'text-[0.625rem] font-bold text-slate-700 uppercase' }, t('stem.coordgrid.accuracy', 'Accuracy')),
                h('p', { className: 'text-xl font-bold text-slate-900' }, totalShots > 0 ? Math.round(totalHits / totalShots * 100) + '%' : '—')
              ),
              h('div', { className: 'bg-amber-50 rounded-lg p-2 border border-amber-200 text-center' },
                h('p', { className: 'text-[0.625rem] font-bold text-amber-800 uppercase' }, t('stem.coordgrid.ships_sunk', 'Ships sunk')),
                h('p', { className: 'text-xl font-bold text-amber-900' }, fill(t('stem.coordgrid.bs_sunk_of', '{n} of 4'), { n: totalSunk }))
              )
            ),
            bsBest != null && h('p', { className: 'text-[0.6875rem] text-center text-emerald-800 font-bold' },
              fill(bsBest <= 30 ? t('stem.coordgrid.bs_best_naval', '🏆 Personal best: {n} shots. Naval Strategist ⚓') : t('stem.coordgrid.bs_best', '🏆 Personal best: {n} shots.'), { n: bsBest })
            ),
            bsLastResult && h('p', { className: 'text-sm font-bold text-center', role: 'status' }, bsLastResult),
            won && h('div', { className: 'bg-emerald-50 rounded-xl p-3 border-2 border-emerald-400 text-center' },
              h('p', { className: 'text-base font-bold text-emerald-800' }, fill(t('stem.coordgrid.bs_victory', '🏆 Victory! All ships sunk in {n} shots.'), { n: totalShots })),
              h('p', { className: 'text-[0.6875rem] text-emerald-800 italic mt-1' }, t('stem.coordgrid.naval_coordinates_work_the_same_way_as', 'Naval coordinates work the same way as math coordinates. Letter + number = a point on the grid.'))
            )
          );
        };

        // ── World map (lat/long, equirectangular, city presets) ──
        var renderWorld = function() {
          var sz = 500, hh = 250, PAD = 20;
          var W = sz - 2 * PAD, H = hh - 2 * PAD;
          var cities = [
            { id: 'portland_me', name: t('stem.coordgrid.portland_me', 'Portland, ME'),     lat: 43.66,  lon: -70.26, hint: t('stem.coordgrid.aaron_is_here', 'Aaron is here!') },
            { id: 'nyc',         name: t('stem.coordgrid.new_york_ny', 'New York, NY'),     lat: 40.71,  lon: -74.01 },
            { id: 'london',      name: t('stem.coordgrid.london_uk', 'London, UK'),       lat: 51.51,  lon: -0.13 },
            { id: 'cairo',       name: t('stem.coordgrid.cairo_egypt', 'Cairo, Egypt'),     lat: 30.04,  lon: 31.24 },
            { id: 'tokyo',       name: t('stem.coordgrid.tokyo_japan', 'Tokyo, Japan'),     lat: 35.68,  lon: 139.69 },
            { id: 'sydney',      name: t('stem.coordgrid.sydney_australia', 'Sydney, Australia'),lat: -33.87, lon: 151.21 },
            { id: 'rio',         name: t('stem.coordgrid.rio_de_janeiro', 'Rio de Janeiro'),   lat: -22.91, lon: -43.17 },
            { id: 'reykjavik',   name: t('stem.coordgrid.reykjavik_iceland', 'Reykjavik, Iceland'),lat: 64.13, lon: -21.94 },
            { id: 'cape_town',   name: t('stem.coordgrid.cape_town_s_af', 'Cape Town, S.Af'),  lat: -33.92, lon: 18.42 },
            { id: 'quito',       name: t('stem.coordgrid.quito_ecuador', 'Quito, Ecuador'),   lat: -0.18,  lon: -78.47 },
            { id: 'mcmurdo',     name: t('stem.coordgrid.mcmurdo_antarctica', 'McMurdo, Antarctica'), lat: -77.85, lon: 166.67 }
          ];

          // Practice-mode helpers
          var newWorldChallenge = function() {
            var c, n = 0;
            do { c = cities[Math.floor(Math.random() * cities.length)]; } while (worldChallenge && c.lat === worldChallenge.lat && c.lon === worldChallenge.lon && n++ < 20);
            sfxClick();
            updCG({
              worldChallenge: { lat: c.lat, lon: c.lon, cityName: c.name, cityId: c.id, tries: 0 },
              worldFeedback: null, worldRetryMsg: null,
              worldClickLat: null, worldClickLon: null
            });
            say(fill(t('stem.coordgrid.world_prompt_sr', 'Find the place at latitude {lat}, longitude {lon}. Type your guess in the latitude and longitude boxes, or choose a spot on the map.'), { lat: fmt(c.lat), lon: fmt(c.lon) }));
          };
          var worldTries = worldChallenge && typeof worldChallenge.tries === 'number' ? worldChallenge.tries : 0;
          var resolveWorldChallenge = function(clickLat, clickLon) {
            if (!worldChallenge || worldFeedback) return;
            if (!isFinite(clickLat) || !isFinite(clickLon)) return;
            // Tolerance: within 15° of target in both lat and lon = correct
            var dLat = Math.abs(clickLat - worldChallenge.lat);
            var dLon = Math.abs(clickLon - worldChallenge.lon);
            // Handle wrap-around for longitude (e.g. clicking at -179 when target is 179)
            if (dLon > 180) dLon = 360 - dLon;
            var ok = dLat <= 15 && dLon <= 15;
            // Name the slip: latitude and longitude swapped, or a hemisphere sign.
            var near = function (a, b) { var d = Math.abs(a - b); if (d > 180) d = 360 - d; return d <= 15; };
            var wcode = ok ? 'correct'
              : (near(clickLat, worldChallenge.lon) && near(clickLon, worldChallenge.lat)) ? 'swapped'
              : (near(clickLat, -worldChallenge.lat) && near(clickLon, worldChallenge.lon) && Math.abs(worldChallenge.lat) > 15) ? 'lat_sign'
              : (near(clickLat, worldChallenge.lat) && near(clickLon, -worldChallenge.lon) && Math.abs(worldChallenge.lon) > 15) ? 'lon_sign'
              : 'other';
            var WORLD_MISC = {
              swapped: t('stem.coordgrid.world_mc_swapped', 'Latitude comes first and goes north and south; longitude comes second and goes east and west. You swapped them.'),
              lat_sign: t('stem.coordgrid.world_mc_lat_sign', 'Check the hemisphere: positive latitude is north of the equator and negative is south.'),
              lon_sign: t('stem.coordgrid.world_mc_lon_sign', 'Check the hemisphere: positive longitude is east of the prime meridian and negative is west.'),
              other: fill(t('stem.coordgrid.world_mc_other', 'Off by {lat}° of latitude and {lon}° of longitude.'), { lat: Math.round(dLat), lon: Math.round(dLon) })
            };
            // The spot that just missed, clicked again: no try used.
            if (!ok && worldTries === 1 && clickLat === worldClickLat && clickLon === worldClickLon) {
              var sameSpot = '\u274C ' + WORLD_MISC[wcode] + ' ' + sameAnswerNote;
              updCG({ worldRetryMsg: sameSpot });
              say(sameSpot);
              return;
            }
            if (!ok && worldTries < 1) {
              sfxWrong();
              var again = '\u274C ' + WORLD_MISC[wcode] + ' ' + t('stem.coordgrid.try_once_more', 'Try once more.');
              updCG({ worldChallenge: Object.assign({}, worldChallenge, { tries: 1 }), worldRetryMsg: again, worldChallStreak: 0, worldClickLat: clickLat, worldClickLon: clickLon });
              say(again);
              return;
            }
            var newSt = ok ? worldChallStreak + 1 : 0;
            var newSv = worldSolved + (ok ? 1 : 0);
            if (ok) { sfxCorrect(); if (newSt >= 3) sfxStreak(); } else { sfxWrong(); }
            var wmsg = ok
              ? '\u2705 ' + fill(t('stem.coordgrid.world_correct', 'Correct: that is {city}. You were off by {lat}° of latitude and {lon}° of longitude.'), { city: worldChallenge.cityName, lat: Math.round(dLat), lon: Math.round(dLon) })
              : '\u274C ' + WORLD_MISC[wcode] + ' ' + closedText(false);
            say(wmsg);
            updCG({
              worldFeedback: { correct: ok, msg: wmsg, revealed: false },
              worldRetryMsg: null,
              worldSolved: newSv,
              worldChallStreak: newSt,
              worldClickLat: clickLat, worldClickLon: clickLon,
              worldCity: ok ? (worldChallenge.cityId || worldCity) : worldCity
            });
            if (!ok) logMiss('world', fill(t('stem.coordgrid.world_log_prompt', 'Latitude {lat}, longitude {lon}'), { lat: fmt(worldChallenge.lat), lon: fmt(worldChallenge.lon) }), wcode);
            if (ok) payOnce('world:' + worldChallenge.lat + ',' + worldChallenge.lon, worldTries ? 2 : 4, 'world coords');
            checkBadges({ worldSolved: newSv });
          };
          var worldOpen = !!(worldPracticeOn && worldChallenge && !worldFeedback);
          // Keyboard path: type a latitude and a longitude, then place the pin (or check).
          var placeTyped = function () {
            var la = window.StemLab.grading.toNumber(String(_cg.worldTypedLat == null ? '' : _cg.worldTypedLat));
            var lo = window.StemLab.grading.toNumber(String(_cg.worldTypedLon == null ? '' : _cg.worldTypedLon));
            if (!isFinite(la) || !isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
              var warn = t('stem.coordgrid.world_range', 'Latitude goes from -90 to 90 and longitude from -180 to 180.');
              addToast(warn, 'warning');
              say(warn);
              return;
            }
            if (worldOpen) { resolveWorldChallenge(la, lo); return; }
            sfxClick();
            updCG({ worldClickLat: la, worldClickLon: lo });
            say(fill(t('stem.coordgrid.world_pin_sr', 'Pin placed at latitude {lat}, longitude {lon}.'), { lat: fmt(la), lon: fmt(lo) }));
          };
          var current = null;
          for (var i = 0; i < cities.length; i++) {
            if (cities[i].id === worldCity) { current = cities[i]; break; }
          }

          var toMapX = function(lon) { return PAD + ((lon + 180) / 360) * W; };
          var toMapY = function(lat) { return PAD + ((90 - lat) / 180) * H; };
          var fromMap = function(mx, my) {
            var lon = ((mx - PAD) / W) * 360 - 180;
            var lat = 90 - ((my - PAD) / H) * 180;
            return { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 };
          };

          // Stylized continent outlines (low-poly, approximate; for visual context only)
          // Each entry is a flat array of lat,lon vertex pairs
          var continents = [
            // North America (Alaska → E. Canada → Florida → Central America → Pacific)
            [72,-165, 72,-100, 73,-78, 60,-60, 45,-58, 35,-75, 25,-80, 18,-65, 8,-78, 9,-90, 16,-95, 22,-107, 32,-117, 50,-127, 60,-140, 70,-160],
            // South America
            [12,-72, 11,-60, 4,-50, -5,-35, -23,-42, -38,-58, -53,-68, -52,-72, -42,-74, -25,-71, -10,-78, 0,-80, 8,-78, 12,-72],
            // Africa
            [37,-7, 37,11, 33,30, 31,34, 12,43, 0,42, -12,40, -26,33, -34,25, -34,18, -22,12, -8,9, 5,1, 11,-15, 21,-17, 26,-12, 33,-9],
            // Eurasia (Europe + Asia + India)
            [38,-10, 50,-5, 60,5, 70,28, 75,55, 78,80, 76,105, 73,140, 66,170, 60,170, 55,160, 40,140, 30,120, 22,108, 8,98, 6,80, 22,68, 28,55, 32,35, 36,28, 42,28, 40,18, 38,10, 36,-2],
            // Australia
            [-10,142, -12,135, -12,124, -22,113, -34,116, -39,140, -34,150, -25,153, -16,145, -10,142],
            // British Isles (a small extra splash)
            [60,-8, 58,-2, 50,-5, 50,-10, 55,-9, 60,-8],
            // Greenland
            [83,-30, 78,-20, 70,-22, 60,-44, 70,-55, 78,-50, 83,-30],
            // Antarctica (simplified bottom strip)
            [-67,-180, -67,180, -85,180, -85,-180]
          ];
          var continentEls = continents.map(function(c, ci) {
            var d = '';
            for (var i = 0; i < c.length; i += 2) {
              var lat = c[i], lon = c[i + 1];
              d += (i === 0 ? 'M ' : 'L ') + toMapX(lon).toFixed(1) + ' ' + toMapY(lat).toFixed(1) + ' ';
            }
            d += 'Z';
            return h('path', { key: 'cont-' + ci, d: d,
              fill: '#d9f99d', opacity: 0.55, stroke: '#65a30d', strokeWidth: 0.6
            });
          });

          // Grid lines every 30°
          var gridLines = [];
          for (var lon = -180; lon <= 180; lon += 30) {
            var gx = toMapX(lon);
            gridLines.push(h('line', { key: 'gml-' + lon, x1: gx, y1: PAD, x2: gx, y2: PAD + H, stroke: lon === 0 ? '#475569' : '#cbd5e1', strokeWidth: lon === 0 ? 1.2 : 0.5 }));
            if (lon !== -180 && lon !== 180) {
              gridLines.push(h('text', { key: 'gmlt-' + lon, x: gx, y: PAD + H + 14, textAnchor: 'middle', fontSize: 10, fill: '#334155' }, fmt(lon) + '°'));
            }
          }
          for (var lat = -90; lat <= 90; lat += 30) {
            var gy = toMapY(lat);
            gridLines.push(h('line', { key: 'gpl-' + lat, x1: PAD, y1: gy, x2: PAD + W, y2: gy, stroke: lat === 0 ? '#475569' : '#cbd5e1', strokeWidth: lat === 0 ? 1.2 : 0.5 }));
            if (lat !== 90 && lat !== -90) {
              gridLines.push(h('text', { key: 'gplt-' + lat, x: PAD - 4, y: gy + 3, textAnchor: 'end', fontSize: 10, fill: '#334155' }, fmt(lat) + '°'));
            }
          }
          // Equator + prime meridian labels
          gridLines.push(h('text', { key: 'eq-lbl', x: PAD + 4, y: toMapY(0) - 3, fontSize: 10, fill: '#475569', fontStyle: 'italic' }, t('stem.coordgrid.equator_lat_0', 'Equator (lat 0°)')));
          gridLines.push(h('text', { key: 'pm-lbl', x: toMapX(0) + 3, y: PAD + 12, fontSize: 10, fill: '#475569', fontStyle: 'italic' }, t('stem.coordgrid.prime_meridian_lon_0', 'Prime meridian (lon 0°)')));

          // City dots are hidden while a practice question is open: finding the place
          // from its coordinates is the task, so the dots would give it away.
          var cityDots = worldOpen ? [] : cities.map(function(c) {
            var active = c.id === worldCity;
            return h('g', { key: 'city-' + c.id,
              style: { cursor: 'pointer' },
              onClick: function(e) { e.stopPropagation(); sfxClick(); updCG({ worldCity: c.id, worldClickLat: null, worldClickLon: null }); say(fill(t('stem.coordgrid.world_city_sr', '{city}: latitude {lat}, longitude {lon}.'), { city: c.name, lat: fmt(c.lat), lon: fmt(c.lon) })); }
            },
              h('circle', { cx: toMapX(c.lon), cy: toMapY(c.lat), r: active ? 6 : 4, fill: active ? '#047857' : '#0e7490', stroke: '#fff', strokeWidth: active ? 2.5 : 1.5,
                style: { transition: 'r 0.18s ease' }
              }),
              active && h('text', { x: Math.min(sz - 90, toMapX(c.lon) + 9), y: Math.max(12, toMapY(c.lat) - 7), fontSize: 11, fontWeight: 'bold', fill: '#065f46', style: { paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 } }, c.name)
            );
          });

          // User-clicked (or typed) point
          var clickEl = null;
          if (worldClickLat != null && worldClickLon != null && isFinite(worldClickLat) && isFinite(worldClickLon)) {
            clickEl = h('g', { key: 'click-pt' },
              h('circle', { cx: toMapX(worldClickLon), cy: toMapY(worldClickLat), r: 5, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }),
              h('text', { x: Math.min(sz - 90, toMapX(worldClickLon) + 8), y: toMapY(worldClickLat) + 3, fontSize: 10, fontWeight: 'bold', fill: '#9a3412', style: { paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 3 } }, '(' + fmt(worldClickLat) + '°, ' + fmt(worldClickLon) + '°)')
            );
          }
          var hemi = function (la, lo) {
            return fill(t('stem.coordgrid.world_hemis', '{ns} hemisphere, {ew} hemisphere'), {
              ns: la >= 0 ? t('stem.coordgrid.world_northern', 'Northern') : t('stem.coordgrid.world_southern', 'Southern'),
              ew: lo >= 0 ? t('stem.coordgrid.world_eastern', 'Eastern') : t('stem.coordgrid.world_western', 'Western')
            });
          };
          var mapLabel = worldOpen
            ? t('stem.coordgrid.world_map_question', 'World map with latitude and longitude lines every 30 degrees. Find the place from its coordinates: choose a spot, or type a guess below.')
            : current
              ? fill(t('stem.coordgrid.world_map_label', 'World map with latitude and longitude lines every 30 degrees, showing {city} at latitude {lat}, longitude {lon}.'), { city: current.name, lat: fmt(current.lat), lon: fmt(current.lon) })
              : t('stem.coordgrid.world_map_plain', 'World map with latitude and longitude lines every 30 degrees.');

          return h('div', { className: 'space-y-3' },
            h('p', { className: 'text-[0.6875rem] text-slate-700' },
              h('b', {}, t('stem.coordgrid.latitude_and_longitude_earth_s_coordin', 'Latitude and longitude: Earth’s coordinate system. ')),
              t('stem.coordgrid.lat_tells_you_how_far_north_south_of_t', 'Lat tells you how far north/south of the equator (0° to 90°, N positive, S negative). Lon tells you how far east/west of the prime meridian (−180° to 180°). Every place on Earth has two numbers.')
            ),
            h('div', { className: 'flex justify-center bg-white rounded-xl border-2 border-emerald-200 p-2 sm:p-4' },
              h('svg', { viewBox: '0 0 ' + sz + ' ' + hh, width: '100%', preserveAspectRatio: 'xMidYMid meet',
                style: { background: 'linear-gradient(180deg, #e0f2fe 0%, #ddd6fe 100%)', cursor: 'crosshair', borderRadius: 8, maxWidth: sz, height: 'auto', display: 'block' },
                role: 'img',
                'aria-label': mapLabel,
                onClick: function(e) {
                  var rect = e.currentTarget.getBoundingClientRect();
                  if (!rect.width || !rect.height) return;
                  var mx = (e.clientX - rect.left) * (sz / rect.width);
                  var my = (e.clientY - rect.top) * (hh / rect.height);
                  if (mx < PAD || mx > PAD + W || my < PAD || my > PAD + H) return;
                  var coord = fromMap(mx, my);
                  // If practice + challenge active and no feedback yet, treat as answer
                  if (worldOpen) {
                    resolveWorldChallenge(coord.lat, coord.lon);
                    return;
                  }
                  sfxClick();
                  updCG({ worldClickLat: coord.lat, worldClickLon: coord.lon });
                  say(fill(t('stem.coordgrid.world_pin_sr', 'Pin placed at latitude {lat}, longitude {lon}.'), { lat: fmt(coord.lat), lon: fmt(coord.lon) }));
                }
              },
                h('rect', { x: PAD, y: PAD, width: W, height: H, fill: 'rgba(255,255,255,0.5)', stroke: '#475569', strokeWidth: 1 }),
                continentEls,
                gridLines,
                cityDots,
                clickEl
              )
            ),
            // Keyboard path: type a latitude and a longitude.
            h('div', { role: 'group', 'aria-label': t('stem.coordgrid.world_typed_group', 'Place a pin by typing coordinates'), className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 flex flex-wrap items-end gap-2' },
              h('label', { className: 'flex flex-col text-xs font-bold text-emerald-900' }, t('stem.coordgrid.latitude', 'Latitude'),
                h('input', { type: 'text', inputMode: 'decimal', value: _cg.worldTypedLat == null ? '' : String(_cg.worldTypedLat), placeholder: '43.7',
                  onChange: function (e) { updCG({ worldTypedLat: e.target.value }); }, onKeyDown: function (e) { if (e.key === 'Enter') placeTyped(); },
                  className: 'w-24 px-2 py-1 border border-emerald-600 rounded font-mono bg-white text-slate-900', style: { minHeight: 44 } })),
              h('label', { className: 'flex flex-col text-xs font-bold text-emerald-900' }, t('stem.coordgrid.longitude', 'Longitude'),
                h('input', { type: 'text', inputMode: 'decimal', value: _cg.worldTypedLon == null ? '' : String(_cg.worldTypedLon), placeholder: '-70.3',
                  onChange: function (e) { updCG({ worldTypedLon: e.target.value }); }, onKeyDown: function (e) { if (e.key === 'Enter') placeTyped(); },
                  className: 'w-24 px-2 py-1 border border-emerald-600 rounded font-mono bg-white text-slate-900', style: { minHeight: 44 } })),
              h('button', { type: 'button', onClick: placeTyped, style: { minHeight: 44 },
                className: 'px-3 py-1.5 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800' },
                worldOpen ? t('stem.coordgrid.world_check_guess', 'Check my guess') : t('stem.coordgrid.world_place_pin', 'Place pin'))
            ),
            !worldOpen && current && h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-center' },
              h('div', {},
                h('p', { className: 'text-[0.625rem] font-bold text-emerald-800 uppercase' }, t('stem.coordgrid.city', 'City')),
                h('p', { className: 'text-sm font-bold text-emerald-900' }, current.name)
              ),
              h('div', {},
                h('p', { className: 'text-[0.625rem] font-bold text-emerald-800 uppercase' }, t('stem.coordgrid.latitude', 'Latitude')),
                h('p', { className: 'text-sm font-bold font-mono text-emerald-900' }, fill(current.lat > 0 ? t('stem.coordgrid.deg_n', '{n}° N') : current.lat < 0 ? t('stem.coordgrid.deg_s', '{n}° S') : '{n}°', { n: Math.abs(current.lat) }))
              ),
              h('div', {},
                h('p', { className: 'text-[0.625rem] font-bold text-emerald-800 uppercase' }, t('stem.coordgrid.longitude', 'Longitude')),
                h('p', { className: 'text-sm font-bold font-mono text-emerald-900' }, fill(current.lon > 0 ? t('stem.coordgrid.deg_e', '{n}° E') : current.lon < 0 ? t('stem.coordgrid.deg_w', '{n}° W') : '{n}°', { n: Math.abs(current.lon) }))
              ),
              h('div', {},
                h('p', { className: 'text-[0.625rem] font-bold text-emerald-800 uppercase' }, t('stem.coordgrid.hemisphere', 'Hemisphere')),
                h('p', { className: 'text-sm font-bold text-emerald-900' }, hemi(current.lat, current.lon))
              )
            ),
            current && current.hint && h('p', { className: 'text-[0.6875rem] text-emerald-700 italic text-center' }, '💡 ' + current.hint),
            !worldOpen && h('div', { className: 'flex flex-wrap gap-1' },
              h('span', { className: 'text-[0.6875rem] font-bold text-emerald-800 self-center mr-1' }, t('stem.coordgrid.world_cities', 'Cities:')),
              cities.map(function(c) {
                return h('button', { key: 'wcb-' + c.id, 'aria-pressed': c.id === worldCity, style: { minHeight: 32 },
                  onClick: function() { sfxClick(); updCG({ worldCity: c.id, worldClickLat: null, worldClickLon: null }); say(fill(t('stem.coordgrid.world_city_sr', '{city}: latitude {lat}, longitude {lon}.'), { city: c.name, lat: fmt(c.lat), lon: fmt(c.lon) })); },
                  className: 'px-2 py-0.5 rounded text-[0.6875rem] font-bold transition-all ' +
                    (c.id === worldCity ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-800 border border-emerald-600 hover:bg-emerald-50')
                }, c.name.split(',')[0]);
              })
            ),
            worldClickLat != null && !worldFeedback && !worldOpen && h('p', { className: 'text-[0.6875rem] text-orange-800 text-center italic', role: 'status' },
              fill(t('stem.coordgrid.world_you_chose', 'Your pin: latitude {lat}°, longitude {lon}°. {hemis}.'), { lat: fmt(worldClickLat), lon: fmt(worldClickLon), hemis: hemi(worldClickLat, worldClickLon) })
            ),

            // ── Practice mode (skill drill) ──
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                h('label', { className: 'text-xs font-bold text-amber-800 flex items-center gap-1 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: worldPracticeOn, style: { width: 20, height: 20 },
                    onChange: function() { sfxClick(); updCG({ worldPracticeOn: !worldPracticeOn, worldChallenge: null, worldFeedback: null, worldRetryMsg: null, worldClickLat: null, worldClickLon: null }); }
                  }),
                  t('stem.coordgrid.practice_mode_find_the_place_from_its_', '🎯 Practice mode — find the place from its coordinates')
                ),
                worldPracticeOn && h('span', { className: 'text-[0.6875rem] font-bold text-amber-800 ml-auto' },
                  fill(t('stem.coordgrid.practice_tally', '{n} solved, streak {s}'), { n: worldSolved, s: worldChallStreak })
                )
              ),
              worldPracticeOn && !worldChallenge && h('button', {
                onClick: newWorldChallenge,
                className: 'w-full py-2 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-bold rounded-lg text-sm hover:from-amber-700 hover:to-orange-700 transition-all shadow-md'
              }, t('stem.coordgrid.start_a_challenge_2', '▶ Start a challenge')),
              worldPracticeOn && worldChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold text-amber-900' },
                  fill(t('stem.coordgrid.world_find_prompt', '🌎 Find the place at latitude {lat}°, longitude {lon}° ({hemis}).'), { lat: fmt(worldChallenge.lat), lon: fmt(worldChallenge.lon), hemis: hemi(worldChallenge.lat, worldChallenge.lon) })
                ),
                !worldFeedback && h('p', { className: 'text-[0.625rem] text-amber-800 italic' },
                  t('stem.coordgrid.world_how', 'Choose a spot on the map or type your guess above. Within 15° of the target counts as correct.')
                ),
                !worldFeedback && _cg.worldRetryMsg && h('p', { className: 'text-sm font-bold text-red-700', role: 'status' }, _cg.worldRetryMsg),
                worldFeedback && h('p', { className: 'text-sm font-bold ' + (worldFeedback.correct ? 'text-green-700' : 'text-red-700'), role: 'status' }, worldFeedback.msg),
                revealBtn(!!(worldFeedback && !worldFeedback.correct && !worldFeedback.revealed && revealsAllowed), function () {
                  var am = '❌ ' + fill(t('stem.coordgrid.world_answer', 'The place was {city}.'), { city: worldChallenge.cityName });
                  updCG({ worldFeedback: Object.assign({}, worldFeedback, { msg: am, revealed: true }), worldCity: worldChallenge.cityId || worldCity });
                  say(am);
                }, 'world-reveal'),
                worldFeedback && h('button', { onClick: newWorldChallenge, style: { minHeight: 44 },
                  className: 'text-xs font-bold text-amber-800 hover:underline'
                }, t('stem.coordgrid.next_place', '➡ Next place'))
              ),
              worldPracticeOn && h('p', { className: 'text-[0.625rem] text-amber-800 italic mt-2' },
                t('stem.coordgrid.trains_spatial_reasoning_lat_lon_to_a_', 'Trains spatial reasoning: lat/lon to a position on the planet. 5 correct earns the 🌍 World Geographer badge.')
              )
            ),

            h('p', { className: 'text-[0.6875rem] text-slate-600 italic' },
              t('stem.coordgrid.every_lat_lon_pair_is_a_coordinate_jus', '💡 Every (lat, lon) pair is a coordinate just like (x, y), just at planetary scale. Negative lat = south, negative lon = west. GPS, weather maps, ship navigation — all the same idea.')
            )
          );
        };

        var scenarios = [
          { id: 'chess',      icon: '♟', label: t('stem.coordgrid.chess', 'Chess') },
          { id: 'battleship', icon: '⚓', label: t('stem.coordgrid.battleship', 'Battleship') },
          { id: 'world',      icon: '🌍', label: t('stem.coordgrid.lat_long', 'Lat / Long') }
        ];

        var moveMapScenario = function(event, index) {
          var next = index;
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % scenarios.length;
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + scenarios.length) % scenarios.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = scenarios.length - 1;
          else return;
          event.preventDefault();
          var nextId = scenarios[next].id;
          sfxClick();
          updCG({ mapScenario: nextId });
          requestAnimationFrame(function() {
            var nextTab = document.getElementById('coordinate-map-tab-' + nextId);
            if (nextTab) nextTab.focus();
          });
        };

        return h('div', { id: 'coordinate-section-panel', role: 'tabpanel', 'aria-labelledby': 'coordinate-section-tab-maps', tabIndex: 0, className: 'space-y-4 allo-cg-bg-maps' },
          // Scenario selector
          h('div', { className: 'flex flex-wrap gap-1 bg-emerald-50 rounded-xl p-1 border border-emerald-200', role: 'tablist', 'aria-label': t('stem.coordgrid.real_world_coordinate_scenarios', 'Real-world coordinate scenarios') },
            scenarios.map(function(s, index) {
              return h('button', {
                key: 'mscen-' + s.id,
                id: 'coordinate-map-tab-' + s.id,
                onClick: function() { sfxClick(); updCG({ mapScenario: s.id }); },
                onKeyDown: function(event) { moveMapScenario(event, index); },
                role: 'tab',
                'aria-selected': mapScenario === s.id,
                'aria-controls': 'coordinate-map-panel',
                tabIndex: mapScenario === s.id ? 0 : -1,
                className: 'min-h-[2.5rem] min-w-max flex-1 whitespace-nowrap py-2 px-3 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ' +
                  (mapScenario === s.id ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-700 hover:text-emerald-900')
              }, s.icon + ' ' + s.label);
            })
          ),

          // Active scenario
          h('div', { id: 'coordinate-map-panel', role: 'tabpanel', 'aria-labelledby': 'coordinate-map-tab-' + mapScenario, tabIndex: 0 },
            mapScenario === 'chess' && renderChess(),
            mapScenario === 'battleship' && renderBattleship(),
            mapScenario === 'world' && renderWorld()
          ),

          // Bottom pedagogy
          h('details', { className: 'bg-white rounded-xl border border-emerald-200 p-3' },
            h('summary', { className: 'text-xs font-bold text-emerald-700 cursor-pointer' }, t('stem.coordgrid.why_these_are_all_coordinate_planes', '💡 Why these are all coordinate planes')),
            h('div', { className: 'mt-2 space-y-2 text-xs text-slate-700' },
              h('p', {}, h('b', {}, t('stem.coordgrid.chess_letters_numbers', 'Chess: letters + numbers. ')), t('stem.coordgrid.the_file_letter_a_h_is_column_1_8_the_', 'The file letter a-h is column 1-8. The rank number is row 1-8. e4 = (5, 4) underneath.')),
              h('p', {}, h('b', {}, t('stem.coordgrid.battleship_letters_numbers', 'Battleship: letters + numbers. ')), t('stem.coordgrid.identical_structure_to_chess_letter_fo', 'Identical structure to chess. Letter for column, number for row. B5 = (2, 5).')),
              h('p', {}, h('b', {}, t('stem.coordgrid.latitude_longitude_degrees_north_south', 'Latitude + longitude: degrees north/south + degrees east/west. ')), t('stem.coordgrid.same_two_number_pair_idea_scaled_to_a_', 'Same two-number-pair idea, scaled to a sphere. Portland, Maine is at (43.66°N, 70.26°W). GPS, weather, ship navigation: all coordinates.')),
              h('p', {}, h('b', {}, t('stem.coordgrid.the_underlying_idea', 'The underlying idea: ')), t('stem.coordgrid.every_grid_system_in_the_world_is_a_fi', 'every grid system in the world is a (first-number, second-number) pair. Once a student sees that chess notation and (x, y) are the same thing, the algebra grid stops feeling alien.'))
            )
          )
        );
      };

      // ══════════ STAGE B: TRANSFORMATIONS, PATTERNS AND TABLES, TREASURE HUNT ══════════
      var X = CG_MORE;
      var noDilate = cgTeacher.noDilate === true;
      Object.assign(MISC, {
        empty: t('stem.coordgrid.mc_empty', 'Add at least one step to your sequence, then check.'),
        incomplete: t('stem.coordgrid.mc_incomplete', 'Fill in every box, then check.'),
        rotation_direction: t('stem.coordgrid.mc_rotation_direction', 'Check the direction of the turn. Counterclockwise goes from quadrant I towards quadrant II; clockwise goes the other way.'),
        wrong_centre: t('stem.coordgrid.mc_wrong_centre', 'Check the centre of the rotation. Every point turns around the centre and stays the same distance from it.'),
        wrong_mirror: t('stem.coordgrid.mc_wrong_mirror', 'Check the mirror line: you reflected across a different line. Across the x-axis y changes sign, across the y-axis x changes sign, and across y = x the coordinates swap.'),
        order_matters: t('stem.coordgrid.mc_order_matters', 'Your moves are right, but the order is not. The order of moves matters: try the same moves in a different order.'),
        needs_dilation: t('stem.coordgrid.mc_needs_dilation', 'Triangle DEF is a different size from triangle ABC, so the sequence needs a dilation.'),
        size_wrong: t('stem.coordgrid.mc_size_wrong', 'Your image is the wrong size. A scale factor above 1 enlarges; a scale factor below 1 shrinks.'),
        needs_reflection: t('stem.coordgrid.mc_needs_reflection', 'Your image faces the wrong way: its vertices go around in the opposite order to DEF. That takes a reflection, or one fewer.'),
        needs_translation: t('stem.coordgrid.mc_needs_translation', 'Your image is the right size and faces the right way, but it is in the wrong place. A translation would finish it.'),
        needs_rotation: t('stem.coordgrid.mc_needs_rotation', 'Your image is the right size but turned differently from DEF. Check your rotations.'),
        reciprocal_scale: t('stem.coordgrid.mc_reciprocal_scale', 'Check the scale factor: you used its reciprocal. A factor of 2 doubles every distance; a factor of 1/2 halves it.'),
        reflected_not_rotated: t('stem.coordgrid.mc_reflected_not_rotated', 'That is a reflection, not a rotation. A rotation turns the point around the centre; it does not flip it.'),
        swap_no_sign: t('stem.coordgrid.mc_swap_no_sign', 'You swapped the coordinates but changed no sign. A quarter turn swaps them and makes one of them change sign.'),
        sides_not_centre: t('stem.coordgrid.mc_sides_not_centre', 'You grew the triangle from one of its own corners. A dilation from the origin multiplies every point\'s distance from the origin: multiply both coordinates by the scale factor.'),
        added_scale: t('stem.coordgrid.mc_added_scale', 'You added the scale factor. A dilation multiplies by it.'),
        one_coordinate_scaled: t('stem.coordgrid.mc_one_coordinate_scaled', 'You scaled only one coordinate. A dilation multiplies both x and y by the scale factor.'),
        difference_not_ratio: t('stem.coordgrid.mc_difference_not_ratio', 'That is the difference between the lengths. A scale factor is a ratio: image length divided by original length.'),
        same_length: t('stem.coordgrid.mc_same_length', 'A dilation changes every length unless the scale factor is 1. Multiply the length by the scale factor.'),
        pattern_wrong_step: t('stem.coordgrid.mc_pattern_wrong_step', 'Check the rule: each term adds the amount the rule gives.'),
        pattern_other_rule: t('stem.coordgrid.mc_pattern_other_rule', 'You used the other pattern\'s rule. Each pattern has its own amount to add.'),
        pattern_multiplied: t('stem.coordgrid.mc_pattern_multiplied', 'You multiplied each time. The rule says to add the same amount each time.'),
        used_row_number: t('stem.coordgrid.mc_used_row_number', 'You used the row number for x. Use the x value written in the table.'),
        missing_points: t('stem.coordgrid.mc_missing_points', 'Some ordered pairs are not plotted yet. Plot one point for every row.'),
        extra_points: t('stem.coordgrid.mc_extra_points', 'Every pair is plotted, but there are extra points too. Remove the points that are not in the table.'),
        additive_relation: t('stem.coordgrid.mc_additive_relation', 'That is how much more pattern B adds each time. Compare matching terms instead: how many times as large is each B term?'),
        gave_step: t('stem.coordgrid.mc_gave_step', 'That is the amount pattern B adds each time. Compare a B term with its matching A term.'),
        inverted_ratio: t('stem.coordgrid.mc_inverted_ratio', 'That compares A with B. The question asks how many times as large B is.'),
        swapped_rate_start: t('stem.coordgrid.mc_swapped_rate_start', 'You swapped the rate and the start. The rate multiplies x; the start is y when x is 0.'),
        step_per_row: t('stem.coordgrid.mc_step_per_row', 'Look at the x column: it goes up by 2 each row. Find how much y changes for each 1 in x.'),
        forgot_start: t('stem.coordgrid.mc_forgot_start', 'You left out the start: y is not 0 when x is 0.'),
        rate_from_first: t('stem.coordgrid.mc_rate_from_first', 'You divided one y by its x, but y includes the start. Use the change in y for each change of 1 in x.'),
        added_not_multiplied: t('stem.coordgrid.mc_added_not_multiplied', 'When x is 0, y is 0, and y grows by the same amount for each 1 in x. So y is that amount times x, not x plus something.'),
        judge_said_yes: t('stem.coordgrid.mc_judge_said_yes', 'Apply each of Kai\'s steps to every vertex and compare: the image does not land on DEF.'),
        judge_said_no: t('stem.coordgrid.mc_judge_said_no', 'Apply each of Kai\'s steps to every vertex and compare: the image does land on DEF.'),
        judge_wrong_step: t('stem.coordgrid.mc_judge_wrong_step', 'That step is fine. Apply the steps one at a time and see where the image first goes off course.'),
        no_reason: t('stem.coordgrid.mc_no_reason', 'Explain how you know in the box, then check.')
      });
      Object.assign(MISC_NAMES, {
        rotation_direction: t('stem.coordgrid.mcn_rotation_direction', 'Turned the wrong way'), wrong_centre: t('stem.coordgrid.mcn_wrong_centre', 'Rotated about the wrong centre'),
        wrong_mirror: t('stem.coordgrid.mcn_wrong_mirror', 'Reflected across the wrong line'), order_matters: t('stem.coordgrid.mcn_order_matters', 'Moves in the wrong order'),
        needs_dilation: t('stem.coordgrid.mcn_needs_dilation', 'Missing dilation'), size_wrong: t('stem.coordgrid.mcn_size_wrong', 'Wrong size'),
        needs_reflection: t('stem.coordgrid.mcn_needs_reflection', 'Missing reflection'), needs_translation: t('stem.coordgrid.mcn_needs_translation', 'Missing translation'),
        needs_rotation: t('stem.coordgrid.mcn_needs_rotation', 'Missing or wrong rotation'), reciprocal_scale: t('stem.coordgrid.mcn_reciprocal_scale', 'Reciprocal scale factor'),
        reflected_not_rotated: t('stem.coordgrid.mcn_reflected_not_rotated', 'Reflected instead of rotated'), swap_no_sign: t('stem.coordgrid.mcn_swap_no_sign', 'Swapped without a sign change'),
        sides_not_centre: t('stem.coordgrid.mcn_sides_not_centre', 'Scaled the sides, not the distances from the centre'), added_scale: t('stem.coordgrid.mcn_added_scale', 'Added the scale factor'),
        one_coordinate_scaled: t('stem.coordgrid.mcn_one_coordinate_scaled', 'Scaled one coordinate only'), difference_not_ratio: t('stem.coordgrid.mcn_difference_not_ratio', 'Difference instead of ratio'),
        same_length: t('stem.coordgrid.mcn_same_length', 'Kept the length'), pattern_wrong_step: t('stem.coordgrid.mcn_pattern_wrong_step', 'Wrong step in a pattern'),
        pattern_other_rule: t('stem.coordgrid.mcn_pattern_other_rule', 'Used the other pattern\'s rule'), pattern_multiplied: t('stem.coordgrid.mcn_pattern_multiplied', 'Multiplied instead of added'),
        used_row_number: t('stem.coordgrid.mcn_used_row_number', 'Used row numbers for x'), missing_points: t('stem.coordgrid.mcn_missing_points', 'Points missing'),
        extra_points: t('stem.coordgrid.mcn_extra_points', 'Extra points'), additive_relation: t('stem.coordgrid.mcn_additive_relation', 'Additive instead of multiplicative'),
        gave_step: t('stem.coordgrid.mcn_gave_step', 'Gave a pattern step'), inverted_ratio: t('stem.coordgrid.mcn_inverted_ratio', 'Ratio upside down'),
        swapped_rate_start: t('stem.coordgrid.mcn_swapped_rate_start', 'Swapped rate and start'), step_per_row: t('stem.coordgrid.mcn_step_per_row', 'Change per row, not per unit'),
        forgot_start: t('stem.coordgrid.mcn_forgot_start', 'Left out the start'), rate_from_first: t('stem.coordgrid.mcn_rate_from_first', 'Rate from one row'),
        added_not_multiplied: t('stem.coordgrid.mcn_added_not_multiplied', 'Added instead of multiplied'), judge_said_yes: t('stem.coordgrid.mcn_judge_said_yes', 'Accepted a wrong sequence'),
        judge_said_no: t('stem.coordgrid.mcn_judge_said_no', 'Rejected a right sequence'), judge_wrong_step: t('stem.coordgrid.mcn_judge_wrong_step', 'Picked the wrong step')
      });
      Object.assign(TASK_NAMES, {
        sequence: t('stem.coordgrid.task_sequence', 'Build a transformation sequence'), judge: t('stem.coordgrid.task_judge', 'Judge a sequence'),
        rotate: t('stem.coordgrid.task_rotate', 'Predict a rotation'), dilate: t('stem.coordgrid.task_dilate', 'Predict a dilation'),
        scale: t('stem.coordgrid.task_scale', 'Scale factor and similarity'), patterns: t('stem.coordgrid.task_patterns', 'Two patterns as ordered pairs'),
        table: t('stem.coordgrid.task_table', 'Table to graph'), treasure: t('stem.coordgrid.task_treasure', 'Treasure hunt')
      });
      var STAGE_COUNTER = { sequence: 'sequencesSolved', judge: 'judgesSolved', rotate: 'rotationsSolved', dilate: 'dilationsSolved', scale: 'scalesSolved', patterns: 'patternsSolved', table: 'tablesSolved' };
      var kText = function (k) { return Math.abs(k - 0.5) < 1e-9 ? '1/2' : Math.abs(k - 1.5) < 1e-9 ? '3/2' : fmt(k); };
      var TURN = { 90: t('stem.coordgrid.turn_90', '90° counterclockwise'), 180: t('stem.coordgrid.turn_180', '180°'), 270: t('stem.coordgrid.turn_270', '90° clockwise') };
      var stepText = function (s) {
        if (!s) return '';
        if (s.kind === 'translate') return fill(t('stem.coordgrid.step_translate', 'Translate: {moves}.'), { moves: moveWords(s.dx, s.dy) });
        if (s.kind === 'reflect') {
          if (s.line === 'x') return t('stem.coordgrid.step_reflect_x', 'Reflect across the x-axis.');
          if (s.line === 'y') return t('stem.coordgrid.step_reflect_y', 'Reflect across the y-axis.');
          if (s.line === 'yx') return t('stem.coordgrid.step_reflect_yx', 'Reflect across the line y = x.');
          if (s.line === 'ynx') return t('stem.coordgrid.step_reflect_ynx', 'Reflect across the line y = −x.');
          if (s.line === 'xa') return fill(t('stem.coordgrid.step_reflect_xa', 'Reflect across the line x = {a}.'), { a: fmt(s.a) });
          return fill(t('stem.coordgrid.step_reflect_yb', 'Reflect across the line y = {a}.'), { a: fmt(s.a) });
        }
        if (s.kind === 'rotate') return (s.cx || s.cy)
          ? fill(t('stem.coordgrid.step_rotate_c', 'Rotate {turn} about the point {pair}.'), { turn: TURN[s.angle], pair: pairText({ x: s.cx, y: s.cy }) })
          : fill(t('stem.coordgrid.step_rotate_o', 'Rotate {turn} about the origin.'), { turn: TURN[s.angle] });
        if (s.kind === 'dilate') return fill(t('stem.coordgrid.step_dilate', 'Dilate by a scale factor of {k} from the origin.'), { k: kText(s.k) });
        return '';
      };
      var KIND_NAMES = { translate: t('stem.coordgrid.kind_translate', 'Translate'), reflect: t('stem.coordgrid.kind_reflect', 'Reflect'), rotate: t('stem.coordgrid.kind_rotate', 'Rotate'), dilate: t('stem.coordgrid.kind_dilate', 'Dilate') };
      var KIND_WORDS = { translate: t('stem.coordgrid.kindw_translate', 'a translation'), reflect: t('stem.coordgrid.kindw_reflect', 'a reflection'), rotate: t('stem.coordgrid.kindw_rotate', 'a rotation'), dilate: t('stem.coordgrid.kindw_dilate', 'a dilation') };
      var VN1 = ['A', 'B', 'C'], VN2 = ['D', 'E', 'F'], VNP = ['A′', 'B′', 'C′'];
      var triList = function (pts, names) { return pts.map(function (p, i) { return names[i] + ' ' + pairText(p); }).join(', '); };
      // ── Shared frame for the stage B grids: any axis range, ticks, labels ──
      var mkFrame = function (b) {
        var W = 400, H = 400, L = 32, R = 14, T = 14, B = 30;
        var sx = function (v) { return L + (v - b.xmin) / (b.xmax - b.xmin) * (W - L - R); };
        var sy = function (v) { return H - B - (v - b.ymin) / (b.ymax - b.ymin) * (H - T - B); };
        return { W: W, H: H, b: b, sx: sx, sy: sy,
          inv: function (px, py) { return { x: Math.round(b.xmin + (px - L) / (W - L - R) * (b.xmax - b.xmin)), y: Math.round(b.ymin + (H - B - py) / (H - T - B) * (b.ymax - b.ymin)) }; },
          has: function (p) { return finitePt(p) && p.x >= b.xmin && p.x <= b.xmax && p.y >= b.ymin && p.y <= b.ymax; } };
      };
      var frameEls = function (F) {
        var b = F.b, out = [];
        var ax = b.xmin <= 0 && b.xmax >= 0 ? 0 : b.xmin, ay = b.ymin <= 0 && b.ymax >= 0 ? 0 : b.ymin;
        var nx = Math.round((b.xmax - b.xmin) / b.xstep), ny = Math.round((b.ymax - b.ymin) / b.ystep);
        var ex = nx > 12 ? 2 : 1, ey = ny > 12 ? 2 : 1, i, v;
        out.push(h('rect', { key: 'bg', x: F.sx(b.xmin), y: F.sy(b.ymax), width: F.sx(b.xmax) - F.sx(b.xmin), height: F.sy(b.ymin) - F.sy(b.ymax), fill: GP.surface }));
        for (i = 0; i <= nx; i++) {
          v = b.xmin + i * b.xstep;
          out.push(h('line', { key: 'gx' + i, x1: F.sx(v), y1: F.sy(b.ymin), x2: F.sx(v), y2: F.sy(b.ymax), stroke: v === ax ? GP.axis : GP.minor, strokeWidth: v === ax ? 2 : 0.6 }));
          if (i % ex === 0 && !(v === 0 && b.xmin < 0)) out.push(h('text', { key: 'tx' + i, x: F.sx(v), y: Math.min(F.H - 4, F.sy(ay) + 15), textAnchor: 'middle', fontSize: 11, fill: GP.label }, fmt(v)));
        }
        for (i = 0; i <= ny; i++) {
          v = b.ymin + i * b.ystep;
          out.push(h('line', { key: 'gy' + i, x1: F.sx(b.xmin), y1: F.sy(v), x2: F.sx(b.xmax), y2: F.sy(v), stroke: v === ay ? GP.axis : GP.minor, strokeWidth: v === ay ? 2 : 0.6 }));
          if (i % ey === 0 && v !== 0) out.push(h('text', { key: 'ty' + i, x: Math.max(14, F.sx(ax) - 5), y: F.sy(v) + 4, textAnchor: 'end', fontSize: 11, fill: GP.label }, fmt(v)));
        }
        out.push(h('text', { key: 'axx', x: F.W - 4, y: F.sy(ay) - 5, textAnchor: 'end', fontSize: 12, fontWeight: 'bold', fill: GP.label }, 'x'));
        out.push(h('text', { key: 'axy', x: F.sx(ax) + 6, y: 12, textAnchor: 'start', fontSize: 12, fontWeight: 'bold', fill: GP.label }, 'y'));
        return out;
      };
      var fDot = function (F, key, p, color, r) { return h('circle', { key: key, cx: F.sx(p.x), cy: F.sy(p.y), r: r || 5, fill: color, stroke: GP.pointStroke, strokeWidth: 1.5 }); };
      var fTag = function (F, key, p, text, color, right, dy) {
        var x = F.sx(p.x) + (right === false ? -8 : 8), y = Math.max(12, Math.min(F.H - 4, F.sy(p.y) + (dy == null ? -7 : dy)));
        return h('text', { key: key, x: Math.max(2, Math.min(F.W - 2, x)), y: y, textAnchor: right === false ? 'end' : 'start', fontSize: 12, fontWeight: 'bold', fill: color, style: { paintOrder: 'stroke', stroke: GP.surface, strokeWidth: 3 } }, text);
      };
      var fLine = function (F, key, a, b2, color, dash, w) { return h('line', { key: key, x1: F.sx(a.x), y1: F.sy(a.y), x2: F.sx(b2.x), y2: F.sy(b2.y), stroke: color, strokeWidth: w || 1.5, strokeDasharray: dash || null }); };
      var fTri = function (F, key, pts, names, color, fillC, dash) {
        var cx0 = (pts[0].x + pts[1].x + pts[2].x) / 3;
        var out = [h('polygon', { key: key + '-poly', points: pts.map(function (p) { return F.sx(p.x) + ',' + F.sy(p.y); }).join(' '), fill: fillC || 'none', stroke: color, strokeWidth: 2.5, strokeDasharray: dash || null })];
        pts.forEach(function (p, i) { out.push(fDot(F, key + '-v' + i, p, color, 4)); out.push(fTag(F, key + '-l' + i, p, names[i], color, p.x >= cx0, p.y >= (pts[0].y + pts[1].y + pts[2].y) / 3 ? -7 : 16)); });
        return out;
      };
      var fCursor = function (F, p) {
        return h('g', { key: 'cursor', 'aria-hidden': 'true' },
          h('circle', { cx: F.sx(p.x), cy: F.sy(p.y), r: 11, fill: 'none', stroke: GP.cursor, strokeWidth: 3 }),
          h('line', { x1: F.sx(p.x) - 16, y1: F.sy(p.y), x2: F.sx(p.x) + 16, y2: F.sy(p.y), stroke: GP.cursor, strokeWidth: 1.5 }),
          h('line', { x1: F.sx(p.x), y1: F.sy(p.y) - 16, x2: F.sx(p.x), y2: F.sy(p.y) + 16, stroke: GP.cursor, strokeWidth: 1.5 }));
      };
      // One Tab stop per grid; arrows move the cursor (Shift: 5, Page Up/Down: 10),
      // Home goes to the origin, Enter acts, Space marks (where offered).
      var gridApp = function (o) {
        var F = o.F, b = F.b, cur = F.has(o.cur) ? o.cur : { x: Math.max(b.xmin, Math.min(b.xmax, 0)), y: Math.max(b.ymin, Math.min(b.ymax, 0)) };
        var cx = function (v) { return Math.max(b.xmin, Math.min(b.xmax, v)); }, cy = function (v) { return Math.max(b.ymin, Math.min(b.ymax, v)); };
        var move = function (p, edge) { o.setCur(p); say((edge ? t('stem.coordgrid.cursor_edge', 'Edge of the grid.') + ' ' : '') + o.announce(p)); };
        var onKey = function (e) {
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          var k = e.key, big = e.shiftKey ? 5 : 1, dx = 0, dy = 0;
          if (k === 'ArrowRight') dx = big; else if (k === 'ArrowLeft') dx = -big; else if (k === 'ArrowUp') dy = big; else if (k === 'ArrowDown') dy = -big;
          else if (k === 'PageUp') dy = 10; else if (k === 'PageDown') dy = -10;
          else if (k === 'Home') { e.preventDefault(); move({ x: cx(0), y: cy(0) }); return; }
          else if (k === 'Enter') { e.preventDefault(); if (o.onEnter) o.onEnter(cur); return; }
          else if (k === ' ') { e.preventDefault(); if (o.onSpace) o.onSpace(cur); else if (o.onEnter) o.onEnter(cur); return; }
          else return;
          e.preventDefault();
          var n = { x: cx(cur.x + dx), y: cy(cur.y + dy) };
          move(n, n.x === cur.x && n.y === cur.y);
        };
        var onClick = function (e) {
          if (!o.onPick || e.detail > 1) return;
          var rect = e.currentTarget.getBoundingClientRect();
          var kx = rect.width ? F.W / rect.width : 1, ky = rect.height ? F.H / rect.height : 1;
          var p = F.inv((e.clientX - rect.left) * kx, (e.clientY - rect.top) * ky);
          p = { x: cx(p.x), y: cy(p.y) };
          o.setCur(p);
          o.onPick(p);
        };
        return h('div', { role: 'application', tabIndex: 0, className: 'allo-cg-app', 'data-coordgrid-app': o.id, 'aria-label': o.label, 'aria-describedby': o.describedBy, onKeyDown: onKey,
          onFocus: function () { setFocusApp(o.id); if (!cgQuietFocus) say(o.announce(cur)); }, onBlur: function () { setFocusApp(null); }, style: { maxWidth: 480, margin: '0 auto', borderRadius: 6 } },
          h('svg', { viewBox: '0 0 ' + F.W + ' ' + F.H, width: '100%', role: 'img', focusable: 'false', 'aria-label': o.svgLabel, onClick: onClick, style: { display: 'block', height: 'auto', background: GP.surface, cursor: o.onPick ? 'crosshair' : 'default' } },
            frameEls(F), o.children, focusApp === o.id ? fCursor(F, cur) : null));
      };
      var primaryBtn = Object.assign({}, btnStyle, { background: GP.btnInk, color: GP.btnBg, borderColor: GP.btnInk });
      var numBox = function (label, value, onChange, opts) {
        var o = opts || {};
        return h('label', { key: o.key, style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700, color: GP.ink } }, label,
          h('input', { type: 'text', inputMode: o.decimal ? 'decimal' : 'numeric', 'aria-label': o.aria || label, 'aria-describedby': o.describedBy, value: value == null ? '' : String(value), disabled: !!o.disabled,
            onChange: function (e) { onChange(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && !e.repeat && o.onEnter) o.onEnter(); }, style: Object.assign({}, inputStyle, o.wide ? { width: '8rem' } : {}) }));
      };
      var feedbackP = function (fbx, id) {
        return fbx && fbx.msg ? h('p', { id: id, tabIndex: -1, 'data-coordgrid-feedback': fbx.correct ? 'correct' : 'wrong', style: { margin: '8px 0 0', fontWeight: 700, fontSize: 14, color: fbx.correct ? GP.good : (fbx.correct === null ? GP.ink : GP.bad) } }, fbx.msg) : null;
      };
      var hintBox = function (task, textFor, onHint) {
        if (!task) return null;
        var lv = task.hint || 0;
        return h('div', { style: { marginTop: 8 } },
          !task.done && lv < 2 && h('button', { type: 'button', 'aria-label': t('stem.coordgrid.hint', 'Hint'), onClick: onHint, style: { minHeight: 44, minWidth: 44 }, className: 'px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-[0.6875rem] hover:bg-amber-200 transition-all border border-amber-600' }, fill(t('stem.coordgrid.hint_n_of_2', '💡 Hint {n} of 2'), { n: lv + 1 })),
          lv > 0 && h('div', { 'data-coordgrid-hints': lv, style: { marginTop: 6, fontSize: 13, color: GP.ink } },
            h('p', { style: { margin: 0 } }, '💡 ' + textFor(1)),
            lv >= 2 && h('p', { style: { margin: '4px 0 0' } }, '💡 ' + textFor(2))));
      };
      var workedBox = function (id, steps, solved) {
        var show = solved >= 4 ? 1 : solved >= 2 ? 2 : solved >= 1 ? 3 : steps.length;
        return h('details', { 'data-coordgrid-worked': id, style: { marginTop: 8 } },
          h('summary', { style: { cursor: 'pointer', fontWeight: 700, fontSize: 13, minHeight: 32 } }, t('stem.coordgrid.worked_example', 'See a worked example')),
          h('ol', { style: { margin: '6px 0 0 18px', fontSize: 13, lineHeight: 1.5 } }, steps.map(function (s, i) { return h('li', { key: i }, i < show ? s : t('stem.coordgrid.worked_your_turn', 'Your turn: work out this step yourself.')); })));
      };
      var pickerRow = function (all, inLevel, allowed, current, names, onPick, groupId) {
        var mine = all.filter(function (k) { return inLevel(k) && allowed(k); });
        var stretch = all.filter(function (k) { return !inLevel(k) && allowed(k); });
        var btn = function (k) { return h('button', { key: k, type: 'button', 'aria-pressed': current === k, onClick: function () { onPick(k); }, style: Object.assign({}, btnOn(current === k), { flex: '1 1 10rem' }) }, names[k]); };
        return h('div', { role: 'group', 'aria-labelledby': groupId, style: cardStyle },
          h('p', { id: groupId, style: { margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: GP.muted } }, t('stem.coordgrid.challenges', '🎯 Challenges')),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, mine.map(btn)),
          stretch.length > 0 && h('p', { style: { margin: '8px 0 6px', fontSize: 12, fontWeight: 700, color: GP.muted } }, t('stem.coordgrid.stretch_tasks', 'Stretch: beyond this level')),
          stretch.length > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } }, stretch.map(btn)));
      };
      var tabPanel = function (id, children) {
        return h('div', { id: 'coordinate-section-panel', role: 'tabpanel', 'aria-labelledby': 'coordinate-section-tab-' + id, tabIndex: 0, 'data-coordgrid-tab': id, style: { background: GP.bg, color: GP.ink, borderRadius: 16, padding: 10, display: 'flex', flexDirection: 'column', gap: 12 } }, children);
      };

      // One graded try on a stage B item. Right: next stage, or (last stage) credit
      // paid once per item, full on a clean run, reduced after a hint or a second
      // try, never after a reveal. First miss: the named slip and a second try.
      // Second miss (or the only try of a yes/no question): the answer if the
      // teacher allows it, the item locked and logged; a multi-part item carries on
      // with the answer filled in, for practice only.
      var stageTry = function (o) {
        rescueFocus(o.fbKey === 'tfFb' ? '#coordgrid-tf-feedback' : '#coordgrid-pt-feedback');
        var task = o.task, tries = typeof task.tries === 'number' ? task.tries : 0;
        var hinted = (task.hint || 0) > 0 || !!task.hinted;
        var upd = {};
        if (o.ok) {
          var nt = Object.assign({}, task, { tries: 0, stage: o.nextStage || task.stage, retried: !!task.retried || tries > 0, hinted: hinted, hint: o.final ? task.hint : 0 });
          if (o.final) nt.done = true;
          var okMsg = '✅ ' + (tries === 0 && !(task.hint > 0) ? t('stem.coordgrid.correct_first', 'Correct!') : task.hint > 0 ? t('stem.coordgrid.correct_hinted', 'Correct, with a hint.') : t('stem.coordgrid.correct_second', 'Correct on your second try.'));
          var msg = okMsg + (o.explain ? ' ' + o.explain : '');
          upd[o.taskKey] = nt;
          upd[o.fbKey] = Object.assign({}, o.fb, o.fbPatch || {}, { msg: msg, correct: true, code: null });
          setExploreScore(function (prev) { return { correct: prev.correct + 1, total: prev.total + 1 }; });
          if (o.final && !task.missed && !isItemLocked(o.key)) {
            var clean = !nt.retried && !hinted;
            var c = (newCounts[o.counter] || 0) + 1;
            var sN = clean ? streak + 1 : streak;
            upd[o.counter] = c; upd.streak = sN; upd.bestStreak = Math.max(bestStreak, sN);
            updCG(upd);
            payOnce(o.key, clean ? 5 : 2, o.reason);
            var over = { correct: exploreScore.correct + 1, streak: sN }; over[o.counter] = c;
            checkBadges(over);
          } else updCG(upd);
          sfxCorrect();
          say(msg);
          return;
        }
        // The answer that just missed, checked again unchanged: no try used, no score.
        if (o.sig && tries === 1 && task.lastSig === o.sig) {
          var sameMsg = '❌ ' + (o.named || MISC[o.code] || MISC.other) + ' ' + sameAnswerNote;
          upd[o.fbKey] = Object.assign({}, o.fb, o.fbPatch || {}, { msg: sameMsg, correct: false, code: o.code });
          updCG(upd);
          say(sameMsg);
          return;
        }
        sfxWrong();
        setExploreScore(function (prev) { return { correct: prev.correct, total: prev.total + 1 }; });
        var named = o.named || MISC[o.code] || MISC.other;
        upd.streak = 0;
        if (tries < 1 && !o.oneTry) {
          upd[o.taskKey] = Object.assign({}, task, { tries: 1, lastCode: o.code, lastSig: o.sig || null });
          var again = '❌ ' + named + ' ' + t('stem.coordgrid.try_once_more', 'Try once more.');
          upd[o.fbKey] = Object.assign({}, o.fb, o.fbPatch || {}, { msg: again, correct: false, code: o.code });
          updCG(upd);
          say(again);
          return;
        }
        // Second miss: the item closes and earns nothing more. The answer waits for
        // "Show the answer"; a multi-part item then carries on, for practice only.
        lockItem(o.key);
        logMiss(o.logTask, o.prompt, o.code);
        var pend = revealsAllowed ? { answer: String(o.answer || ''), stage: o.revealStage || null, fb: o.revealStage ? (o.revealFb || {}) : null } : null;
        upd[o.taskKey] = Object.assign({}, task, { tries: 0, lastCode: o.code, missed: true, hint: 0, hinted: hinted, done: true, pend: pend });
        var closed = '❌ ' + named + ' ' + (revealsAllowed ? t('stem.coordgrid.two_tries_used', 'That was your second try, so this item no longer earns credit.') : t('stem.coordgrid.no_reveal', 'Your teacher can go over this one with you.'));
        upd[o.fbKey] = Object.assign({}, o.fb, o.fbPatch || {}, { msg: closed, correct: false, code: o.code, revealed: false });
        updCG(upd);
        say(closed + ' ' + closedText(false));
      };
      // "Show the answer" on a closed stage B item (Transformations, Patterns).
      var pendOf = function (task) {
        var p = task && task.pend;
        return p && typeof p === 'object' && typeof p.answer === 'string' && p.answer ? p : null;
      };
      var stageReveal = function (taskKey, fbKey, task, fb) {
        var p = pendOf(task);
        if (!p || !revealsAllowed) return;
        var cont = typeof p.stage === 'string' && !!p.stage;
        var upd = {};
        upd[taskKey] = Object.assign({}, task, { pend: null, done: !cont, stage: cont ? p.stage : task.stage });
        upd[fbKey] = Object.assign({}, fb, cont && p.fb && typeof p.fb === 'object' ? p.fb : {}, { msg: p.answer, correct: false, revealed: true });
        updCG(upd);
        rescueFocus(fbKey === 'tfFb' ? '#coordgrid-tf-feedback' : '#coordgrid-pt-feedback');
        say(p.answer + ' ' + (cont ? t('stem.coordgrid.continue_no_credit', 'Carry on with the next part for practice. This item no longer earns credit.') : lockedMsg));
      };
      var stageRevealBtn = function (task, taskKey, fbKey, fb) { return revealBtn(!!(pendOf(task) && revealsAllowed), function () { stageReveal(taskKey, fbKey, task, fb); }, 'reveal-' + taskKey); };

      // Where a started task takes focus, and the card to bring into view: the grid on
      // Transformations; on Patterns the first box comes before the grid (typing is step 1).
      var TF_FOCUS = ['[data-coordgrid-app="tf"]', '[data-coordgrid-tf]'];
      var PT_FOCUS = ['[data-coordgrid-pt] input, [data-coordgrid-app="pt"]', '[data-coordgrid-pt]'];
      // ── Transformations tab state ──
      var tfTask = X.cleanTf(_cg.tfTask);
      var tfFb = _cg.tfFb && typeof _cg.tfFb === 'object' ? _cg.tfFb : {};
      var tfSteps = X.cleanSteps(_cg.tfSteps);
      var tfDraft = _cg.tfDraft && typeof _cg.tfDraft === 'object' ? _cg.tfDraft : {};
      var tfCur = finitePt(_cg.tfCur) ? _cg.tfCur : { x: 0, y: 0 };
      var tfLevelTasks = X.LEVEL_TF[cgLevel] || X.LEVEL_TF.g6;
      var tfInLevel = function (k) { return tfLevelTasks.indexOf(k) >= 0; };
      var tfAllowed = function (k) { return !(noDilate && (k === 'dilate' || k === 'scale')) && (stretchAllowed || tfInLevel(k)); };
      var tfPoints = function (tk) {
        if (!tk) return [];
        return [].concat(tk.A || [], tk.B || [], tk.image || [], tk.p ? [tk.p] : [], tk.c ? [tk.c] : [], tk.answer && finitePt(tk.answer) ? [tk.answer] : []);
      };
      var tfQ1 = cgLevel === 'g5' && tfPoints(tfTask).every(function (p) { return p.x >= 0 && p.y >= 0; });
      var tfF = mkFrame(tfQ1 ? { xmin: 0, xmax: 10, ymin: 0, ymax: 10, xstep: 1, ystep: 1 } : { xmin: -10, xmax: 10, ymin: -10, ymax: 10, xstep: 1, ystep: 1 });
      var tfPrompt = function (tk) {
        if (!tk) return '';
        if (tk.type === 'sequence') return fill(t('stem.coordgrid.prompt_sequence', 'Build a sequence of moves that maps triangle ABC onto triangle DEF. {abc}. {def}.'), { abc: triList(tk.A, VN1), def: triList(tk.B, VN2) });
        if (tk.type === 'judge') return fill(t('stem.coordgrid.prompt_judge', 'Kai says the sequence below maps triangle ABC onto triangle DEF. Is Kai right? {abc}. {def}.'), { abc: triList(tk.A, VN1), def: triList(tk.B, VN2) });
        if (tk.type === 'rotate') return (tk.c.x || tk.c.y)
          ? fill(t('stem.coordgrid.prompt_rotate_c', 'Rotate point P {p} {turn} about the centre C {c}. Predict the image P′, then check.'), { p: pairText(tk.p), turn: TURN[tk.angle], c: pairText(tk.c) })
          : fill(t('stem.coordgrid.prompt_rotate_o', 'Rotate point P {p} {turn} about the origin. Predict the image P′, then check.'), { p: pairText(tk.p), turn: TURN[tk.angle] });
        if (tk.type === 'dilate') return fill(t('stem.coordgrid.prompt_dilate', 'Dilate triangle ABC from the origin by a scale factor of {k}. {abc}. Where does vertex {v} land? Predict {v}′, then check.'), { k: kText(tk.k), abc: triList(tk.A, VN1), v: VN1[tk.q] });
        if (tk.type === 'scale') return fill(tk.ask === 'k'
          ? t('stem.coordgrid.prompt_scale_k', 'Triangle A′B′C′ is a dilation of triangle ABC from the origin. {abc}. {img}. What is the scale factor?')
          : t('stem.coordgrid.prompt_scale_side', 'Triangle A′B′C′ is a dilation of triangle ABC from the origin. {abc}. {img}. Side AB is {n} units long. How long is side A′B′?'), { abc: triList(tk.A, VN1), img: triList(tk.image, VNP), n: fmt(tk.len) });
        return '';
      };
      var startTf = function (k) {
        if (!tfAllowed(k)) return;
        var item = null, n = 0;
        do {
          item = k === 'sequence' ? X.genSequence(cgLevel, null, { similar: cgLevel === 'g8' && !noDilate && Math.random() < 0.34 })
            : k === 'judge' ? X.genJudge(cgLevel, null, {})
            : k === 'rotate' ? X.genRotate(cgLevel) : k === 'dilate' ? X.genDilate(cgLevel) : X.genScale(cgLevel);
        } while (item && (isItemLocked(X.tfKey(item)) || (tfTask && X.tfKey(item) === X.tfKey(tfTask))) && n++ < 25);
        item = Object.assign({}, item, { tries: 0, hint: 0, stage: k === 'judge' ? 'pick' : 'answer', done: false, excluded: k === 'judge' ? [] : undefined });
        sfxClick();
        updCG({ tfTask: item, tfFb: {}, tfSteps: [], tfDraft: { kind: 'translate', angle: 90, line: 'x', k: '2', cx: '0', cy: '0' } });
        say(tfPrompt(item));
      };
      var tfSetFb = function (patch) { updCG({ tfFb: Object.assign({}, tfFb, patch, { msg: null }) }); };
      var tfBuilderKinds = function () {
        var ks = X.moveKinds(cgLevel === 'g5' || cgLevel === 'g6' ? cgLevel : 'g8').slice();
        if (cgLevel === 'g8' && !noDilate) ks.push('dilate');
        if (tfTask && tfTask.type === 'sequence') tfTask.steps.forEach(function (s) { if (ks.indexOf(s.kind) < 0) ks.push(s.kind); });
        return ks;
      };
      var tfLines = function () { return cgLevel === 'g8' || (tfTask && tfTask.type === 'sequence' && tfTask.steps.some(function (s) { return s.kind === 'reflect' && ['x', 'y'].indexOf(s.line) < 0; })) ? ['x', 'y', 'yx', 'ynx', 'xa', 'yb'] : ['x', 'y']; };
      var LINE_NAMES = { x: t('stem.coordgrid.line_x', 'the x-axis'), y: t('stem.coordgrid.line_y', 'the y-axis'), yx: t('stem.coordgrid.line_yx', 'the line y = x'), ynx: t('stem.coordgrid.line_ynx', 'the line y = −x'), xa: t('stem.coordgrid.line_xa', 'a vertical line x = a'), yb: t('stem.coordgrid.line_yb', 'a horizontal line y = a') };
      var draftStep = function () {
        var num = function (v) { var x = window.StemLab.grading.toNumber(String(v == null ? '' : v)); return isFinite(x) ? x : null; };
        var kd = tfDraft.kind || 'translate';
        if (kd === 'translate') return X.cleanStep({ kind: 'translate', dx: num(tfDraft.dx), dy: num(tfDraft.dy) });
        if (kd === 'reflect') return X.cleanStep({ kind: 'reflect', line: tfDraft.line || 'x', a: num(tfDraft.a) == null ? 0 : num(tfDraft.a) });
        if (kd === 'rotate') return X.cleanStep({ kind: 'rotate', angle: Number(tfDraft.angle) || 90, cx: num(tfDraft.cx) == null ? 0 : num(tfDraft.cx), cy: num(tfDraft.cy) == null ? 0 : num(tfDraft.cy) });
        return X.cleanStep({ kind: 'dilate', k: num(tfDraft.k == null ? '2' : tfDraft.k) });
      };
      var addTfStep = function () {
        if (!tfTask || tfTask.done) return;
        if (tfSteps.length >= 4) { updCG({ tfFb: Object.assign({}, tfFb, { msg: t('stem.coordgrid.steps_max', 'A sequence here has at most four steps. Remove one first.'), correct: false }) }); return; }
        var s = draftStep();
        if (!s) { var bad = t('stem.coordgrid.step_invalid', 'Enter whole numbers for this move. A translation needs at least one number that is not 0.'); updCG({ tfFb: Object.assign({}, tfFb, { msg: bad, correct: false }) }); say(bad); return; }
        updCG({ tfSteps: tfSteps.concat([s]), tfFb: Object.assign({}, tfFb, { msg: null }) });
        say(fill(t('stem.coordgrid.step_added', 'Step {n} added: {step}'), { n: tfSteps.length + 1, step: stepText(s) }));
      };
      var moveTfStep = function (i, dir) {
        var j = i + dir;
        if (j < 0 || j >= tfSteps.length) return;
        var next = tfSteps.slice(); var tmp = next[i]; next[i] = next[j]; next[j] = tmp;
        updCG({ tfSteps: next });
        say(fill(t('stem.coordgrid.step_moved', 'Step moved. It is now step {n}.'), { n: j + 1 }));
      };
      var removeTfStep = function (i) {
        var next = tfSteps.filter(function (_, k) { return k !== i; });
        updCG({ tfSteps: next });
        say(fill(t('stem.coordgrid.step_removed', 'Step {n} removed.'), { n: i + 1 }));
      };
      var tfExplain = function (tk) {
        if (tk.type === 'sequence' || tk.type === 'judge') return tk.similar ? t('stem.coordgrid.explain_similar', 'A dilation keeps every angle and multiplies every length by the scale factor, so DEF is similar to ABC.') : t('stem.coordgrid.explain_congruent', 'Translations, reflections and rotations keep every length and angle, so DEF is congruent to ABC.');
        if (tk.type === 'rotate') {
          if (tk.c.x || tk.c.y) return t('stem.coordgrid.explain_rotate_c', 'About a centre C, the point keeps its distance from C: subtract C, turn, then add C back.');
          return tk.angle === 90 ? t('stem.coordgrid.explain_rotate_90', 'A quarter turn counterclockwise about the origin sends (x, y) to (−y, x).')
            : tk.angle === 180 ? t('stem.coordgrid.explain_rotate_180', 'A half turn about the origin sends (x, y) to (−x, −y).')
            : t('stem.coordgrid.explain_rotate_270', 'A quarter turn clockwise about the origin sends (x, y) to (y, −x).');
        }
        if (tk.type === 'dilate') return fill(t('stem.coordgrid.explain_dilate', 'Every point moves to {k} times its distance from the origin, along the same ray. Sides are {k} times as long and angles stay the same, so the image is similar.'), { k: kText(tk.k) });
        if (tk.type === 'scale') return tk.ask === 'k'
          ? fill(t('stem.coordgrid.explain_scale_k', 'Each side of A′B′C′ is {k} times the matching side of ABC, and the angles match: the triangles are similar with scale factor {k}.'), { k: kText(tk.k) })
          : fill(t('stem.coordgrid.explain_scale_side', 'A′B′ = {k} × {n} = {ans}. A dilation multiplies every length by the scale factor.'), { k: kText(tk.k), n: fmt(tk.len), ans: fmt(tk.answer) });
        return '';
      };
      var tfAnswer = function (tk) {
        if (tk.type === 'sequence') return fill(t('stem.coordgrid.answer_sequence', 'One sequence that works: {steps}'), { steps: tk.steps.map(stepText).join(' ') });
        if (tk.type === 'rotate') return fill(t('stem.coordgrid.answer_rotate', 'The image is P′ {pair}. It is now drawn on the grid.'), { pair: pairText(tk.answer) });
        if (tk.type === 'dilate') return fill(t('stem.coordgrid.answer_dilate', 'The image is {v}′ {pair}. The whole image is now drawn on the grid.'), { v: VN1[tk.q], pair: pairText(tk.answer) });
        if (tk.type === 'scale') return tk.ask === 'k' ? fill(t('stem.coordgrid.answer_scale_k', 'The scale factor is {k}.'), { k: kText(tk.k) }) : fill(t('stem.coordgrid.answer_scale_side', 'A′B′ is {n} units long.'), { n: fmt(tk.answer) });
        return '';
      };
      var JUDGE_SLIP = {
        rotation_direction: t('stem.coordgrid.judge_slip_direction', 'Kai turned the wrong way.'), wrong_mirror: t('stem.coordgrid.judge_slip_mirror', 'Kai reflected across the wrong line.'),
        swapped_vector: t('stem.coordgrid.judge_slip_vector', 'Kai swapped the left-right and up-down moves.'), one_direction: t('stem.coordgrid.judge_slip_one', 'One of Kai\'s moves goes the wrong way.'),
        wrong_centre: t('stem.coordgrid.judge_slip_centre', 'Kai turned about the wrong centre.'), reciprocal_scale: t('stem.coordgrid.judge_slip_scale', 'Kai used the reciprocal scale factor.')
      };
      var judgeAnswer = function (tk) {
        return tk.maps ? t('stem.coordgrid.judge_ans_yes', 'It does: Kai\'s image lands exactly on DEF.')
          : fill(t('stem.coordgrid.judge_ans_no', 'It does not: step {n} is wrong. {slip} Step {n} should be: {fix}'), { n: tk.wrongStep + 1, slip: JUDGE_SLIP[tk.slip] || '', fix: stepText(tk.fixStep) });
      };
      var tfBase = function () { return { taskKey: 'tfTask', fbKey: 'tfFb', task: tfTask, fb: tfFb, key: X.tfKey(tfTask), counter: STAGE_COUNTER[tfTask.type], logTask: tfTask.type, prompt: tfPrompt(tfTask) }; };
      var checkSequence = function () {
        if (!tfTask || tfTask.done || tfTask.type !== 'sequence') return;
        var code = X.diagnoseSequence(tfSteps, tfTask);
        if (code === 'empty') { updCG({ tfFb: Object.assign({}, tfFb, { msg: MISC.empty, correct: false }) }); say(MISC.empty); return; }
        stageTry(Object.assign(tfBase(), { ok: code === 'correct', code: code, reason: 'transformation sequence', answer: tfAnswer(tfTask), explain: tfExplain(tfTask), final: true, fbPatch: { checked: tfSteps.slice() }, sig: JSON.stringify(tfSteps) }));
      };
      // Judge Kai: one decision among every step and "No step is wrong". A miss
      // rules that choice out and names the slip without giving the answer away;
      // Kai's image is drawn only once the student knows it misses DEF (or at the end).
      // Saves from stage B: 'which' meant "it does not map" was already decided.
      var judgeExcluded = function (tk) {
        if (!tk || tk.type !== 'judge') return [];
        if (Array.isArray(tk.excluded)) return tk.excluded.filter(function (c) { return c === 'none' || (isFinite(c) && c >= 0 && c < tk.proposed.length); });
        return tk.stage === 'which' ? ['none'] : [];
      };
      var judgePick = function (choice) {
        if (!tfTask || tfTask.done || tfTask.type !== 'judge') return;
        var ex = judgeExcluded(tfTask);
        if (ex.indexOf(choice) >= 0) return;
        var ok = choice === 'none' ? tfTask.maps : (!tfTask.maps && choice === tfTask.wrongStep);
        var code = ok ? 'correct' : choice === 'none' ? 'judge_said_yes' : tfTask.maps ? 'judge_said_no' : 'judge_wrong_step';
        var named = ok || choice === 'none' ? null : fill(t('stem.coordgrid.mc_judge_step_ok', 'Step {n} is not a wrong move. Apply Kai\'s steps one at a time and compare the image with DEF, then decide again.'), { n: choice + 1 });
        var choices = tfTask.proposed.length + 1 - ex.length;
        var base = tfBase();
        base.task = Object.assign({}, tfTask, { stage: 'pick', excluded: ok ? ex : ex.concat([choice]) });
        stageTry(Object.assign(base, { ok: ok, code: code, named: named, oneTry: choices <= 2, reason: 'judge sequence', answer: judgeAnswer(tfTask), explain: ok ? judgeAnswer(tfTask) : '', final: true, fbPatch: { said: choice === 'none' ? 'none' : 'step' + (choice + 1) } }));
      };
      var checkTfPoint = function () {
        if (!tfTask || tfTask.done || (tfTask.type !== 'rotate' && tfTask.type !== 'dilate')) return;
        var ax = readInt(tfFb.ansX), ay = readInt(tfFb.ansY);
        if (ax === null || ay === null) { var m2 = t('stem.coordgrid.enter_both_whole', 'Enter a whole number for x and for y, then check.'); updCG({ tfFb: Object.assign({}, tfFb, { msg: m2, correct: false }) }); say(m2); return; }
        var ans = { x: ax, y: ay };
        var code = tfTask.type === 'rotate' ? X.diagnoseRotate(ans, tfTask) : X.diagnoseDilate(ans, tfTask);
        stageTry(Object.assign(tfBase(), { ok: code === 'correct', code: code, reason: tfTask.type === 'rotate' ? 'rotation' : 'dilation', answer: tfAnswer(tfTask), explain: tfExplain(tfTask), final: true, sig: ax + ',' + ay }));
      };
      var checkScale = function () {
        if (!tfTask || tfTask.done || tfTask.type !== 'scale') return;
        var v = window.StemLab.grading.toNumber(String(tfFb.ansNum == null ? '' : tfFb.ansNum));
        if (!isFinite(v)) { var m3 = t('stem.coordgrid.enter_number', 'Enter a number, then check.'); updCG({ tfFb: Object.assign({}, tfFb, { msg: m3, correct: false }) }); say(m3); return; }
        var code = X.diagnoseScale(v, tfTask);
        stageTry(Object.assign(tfBase(), { ok: code === 'correct', code: code, reason: 'scale factor', answer: tfAnswer(tfTask), explain: tfExplain(tfTask), final: true, sig: String(v) }));
      };
      var tfHintText = function (lv) {
        var tk = tfTask;
        if (!tk) return '';
        if (tk.type === 'sequence') {
          if (lv === 1) return t('stem.coordgrid.hint_seq_1', 'Compare DEF with ABC. Is it the same size? Do its vertices go around in the same order, clockwise or counterclockwise? Is it turned?');
          var kinds = [];
          tk.steps.forEach(function (s) { if (kinds.indexOf(s.kind) < 0) kinds.push(s.kind); });
          return fill(t('stem.coordgrid.hint_seq_2', 'One sequence that works uses: {kinds}. Work out the details yourself.'), { kinds: kinds.map(function (k) { return KIND_WORDS[k]; }).join(', ') });
        }
        if (tk.type === 'judge') return lv === 1 ? t('stem.coordgrid.hint_judge_1', 'Apply Kai\'s first step to vertex A, then the next step, and so on. Do the same for B and C.')
          : t('stem.coordgrid.hint_judge_2', 'Rules: across the x-axis (x, y) → (x, −y); across the y-axis (x, y) → (−x, y); 90° counterclockwise (x, y) → (−y, x); 90° clockwise (x, y) → (y, −x).');
        if (tk.type === 'rotate') {
          if (lv === 1) return t('stem.coordgrid.hint_rotate_1', 'Picture the turn. A 90° turn moves a point one quadrant over; counterclockwise goes from quadrant I towards quadrant II.');
          if (tk.c.x || tk.c.y) return t('stem.coordgrid.hint_rotate_2c', 'Find the move from C to P (subtract C), turn that move, then add C back.');
          return tk.angle === 90 ? t('stem.coordgrid.hint_rotate_2_90', 'Rule for 90° counterclockwise: (x, y) → (−y, x).') : tk.angle === 180 ? t('stem.coordgrid.hint_rotate_2_180', 'Rule for 180°: (x, y) → (−x, −y).') : t('stem.coordgrid.hint_rotate_2_270', 'Rule for 90° clockwise: (x, y) → (y, −x).');
        }
        if (tk.type === 'dilate') return lv === 1 ? t('stem.coordgrid.hint_dilate_1', 'A dilation from the origin moves every point along the ray from the origin through it.')
          : fill(t('stem.coordgrid.hint_dilate_2', 'Multiply both coordinates of {v} by {k}.'), { v: VN1[tk.q], k: kText(tk.k) });
        if (tk.type === 'scale') return lv === 1 ? t('stem.coordgrid.hint_scale_1', 'Compare a side of A′B′C′ with the matching side of ABC.')
          : (tk.ask === 'k' ? fill(t('stem.coordgrid.hint_scale_2k', 'Side AB is {n} units long. Find the length of A′B′ and divide it by {n}.'), { n: fmt(tk.len) }) : t('stem.coordgrid.hint_scale_2s', 'Find the scale factor by comparing a vertex with its image, then multiply the length of AB by it.'));
        return '';
      };
      var tfHint = function () { if (!tfTask || tfTask.done || (tfTask.hint || 0) >= 2) return; var n = (tfTask.hint || 0) + 1; updCG({ tfTask: Object.assign({}, tfTask, { hint: n }) }); tfTask = Object.assign({}, tfTask, { hint: n }); say(tfHintText(n)); };
      var TF_WORKED = {
        sequence: [t('stem.coordgrid.we_seq_0', 'Example: map A(1, 1), B(3, 1), C(1, 2) onto D(−1, −1), E(−3, −1), F(−1, −2).'), t('stem.coordgrid.we_seq_1', 'The sides are the same length, so no dilation.'), t('stem.coordgrid.we_seq_2', 'The vertices go around in the same order, so no reflection is needed.'), t('stem.coordgrid.we_seq_3', 'Every coordinate changed sign: a 180° rotation about the origin. Check each vertex: (x, y) → (−x, −y).')],
        rotate: [t('stem.coordgrid.we_rot_0', 'Example: rotate P(3, 1) 90° counterclockwise about the origin.'), t('stem.coordgrid.we_rot_1', 'The rule is (x, y) → (−y, x).'), t('stem.coordgrid.we_rot_2', 'Swap the coordinates to get (1, 3), then change the sign of the new x: (−1, 3).'), t('stem.coordgrid.we_rot_3', 'Check: P was in quadrant I, and a quarter turn counterclockwise lands in quadrant II.')],
        dilate: [t('stem.coordgrid.we_dil_0', 'Example: dilate B(2, 3) by a scale factor of 2 from the origin.'), t('stem.coordgrid.we_dil_1', 'Multiply each coordinate by the scale factor: (2 × 2, 2 × 3).'), t('stem.coordgrid.we_dil_2', 'B′ is (4, 6): twice as far from the origin, on the same ray.'), t('stem.coordgrid.we_dil_3', 'No vertex stays put: every point moves away from the centre, not from a corner of the triangle.')],
        scale: [t('stem.coordgrid.we_scale_0', 'Example: side AB is 3 units and side A′B′ is 6 units.'), t('stem.coordgrid.we_scale_1', 'Scale factor = image length ÷ original length = 6 ÷ 3 = 2.'), t('stem.coordgrid.we_scale_2', 'Every side doubles and every angle stays the same, so the triangles are similar.'), t('stem.coordgrid.we_scale_3', 'Check with a vertex: its distance from the origin doubles too.')]
      };
      var tfAnnounce = function (p) {
        var parts = [fill(t('stem.coordgrid.cursor_at', 'x {x}, y {y}, {where}.'), { x: fmt(p.x), y: fmt(p.y), where: quadWhere(p.x, p.y) })];
        var here = function (pts, names, label) { (pts || []).forEach(function (q, i) { if (CG_CORE.same(q, p)) parts.push(fill(t('stem.coordgrid.cursor_vertex_here', 'Vertex {v} is here.'), { v: names[i] })); }); };
        if (tfTask) {
          if (tfTask.A) here(tfTask.A, VN1);
          if (tfTask.B) here(tfTask.B, VN2);
          if (tfTask.type === 'scale') here(tfTask.image, VNP);
          if (tfTask.p && CG_CORE.same(tfTask.p, p)) parts.push(t('stem.coordgrid.cursor_has_p', 'Point P is here.'));
          if (tfTask.c && (tfTask.c.x || tfTask.c.y) && CG_CORE.same(tfTask.c, p)) parts.push(t('stem.coordgrid.cursor_has_c', 'The centre C is here.'));
        }
        return parts.join(' ');
      };
      var tfPredictTask = tfTask && (tfTask.type === 'rotate' || tfTask.type === 'dilate');
      var setTfPrediction = function (p) {
        if (!tfPredictTask || tfTask.done) return;
        updCG({ tfFb: Object.assign({}, tfFb, { ansX: String(p.x), ansY: String(p.y), msg: null }) });
        say(fill(t('stem.coordgrid.prediction_set', 'Your prediction is {pair}. Check it when you are ready.'), { pair: pairText(p) }));
      };
      var renderTransform = function () {
        var tk = tfTask, F = tfF, kids = [];
        var shownImage = null, shownNames = VNP;
        if (tk) {
          if (tk.type === 'sequence' || tk.type === 'judge') {
            kids = kids.concat(fTri(F, 'tfA', tk.A, VN1, GP.point, null), fTri(F, 'tfB', tk.B, VN2, GP.poly, GP.polyFill, '6 3'));
            if (tk.type === 'sequence' && Array.isArray(tfFb.checked) && X.cleanSteps(tfFb.checked).length) shownImage = X.applySeq(tk.A, X.cleanSteps(tfFb.checked));
            if (tk.type === 'judge' && ((tk.done && (tfFb.correct || tfFb.revealed)) || (!tk.maps && judgeExcluded(tk).indexOf('none') >= 0))) shownImage = X.applySeq(tk.A, tk.proposed);
          } else if (tk.type === 'rotate') {
            if (tk.c.x || tk.c.y) { kids.push(h('rect', { key: 'tfc', x: F.sx(tk.c.x) - 6, y: F.sy(tk.c.y) - 6, width: 12, height: 12, fill: GP.mystery, stroke: GP.pointStroke, strokeWidth: 1.5 })); kids.push(fTag(F, 'tfcl', tk.c, 'C ' + pairText(tk.c), GP.mystery, true, 18)); }
            else kids.push(h('circle', { key: 'tfo', cx: F.sx(0), cy: F.sy(0), r: 7, fill: 'none', stroke: GP.mystery, strokeWidth: 3 }));
            kids.push(fDot(F, 'tfp', tk.p, GP.point, 6), fTag(F, 'tfpl', tk.p, 'P ' + pairText(tk.p), GP.point));
            if (tk.done && (tfFb.correct || tfFb.revealed)) { kids.push(fLine(F, 'tfr1', tk.c, tk.p, GP.image, '4 3'), fLine(F, 'tfr2', tk.c, tk.answer, GP.image, '4 3'), fDot(F, 'tfpi', tk.answer, GP.image, 6), fTag(F, 'tfpil', tk.answer, 'P′ ' + pairText(tk.answer), GP.image)); }
          } else if (tk.type === 'dilate' || tk.type === 'scale') {
            kids.push(h('circle', { key: 'tfo', cx: F.sx(0), cy: F.sy(0), r: 6, fill: GP.mystery, stroke: GP.pointStroke, strokeWidth: 1.5 }));
            kids = kids.concat(fTri(F, 'tfA', tk.A, VN1, GP.point, null));
            if (tk.type === 'scale' || (tk.done && (tfFb.correct || tfFb.revealed))) {
              tk.image.forEach(function (q, i) { kids.push(fLine(F, 'ray' + i, { x: 0, y: 0 }, q, GP.minor, '3 3', 1.2)); });
              kids = kids.concat(fTri(F, 'tfI', tk.image, VNP, GP.image, null, '6 3'));
            }
          }
          if (tfPredictTask && !tk.done) {
            var px0 = readInt(tfFb.ansX), py0 = readInt(tfFb.ansY);
            if (px0 !== null && py0 !== null && F.has({ x: px0, y: py0 })) kids.push(h('circle', { key: 'tfpred', cx: F.sx(px0), cy: F.sy(py0), r: 8, fill: 'none', stroke: GP.cursor, strokeWidth: 2.5, strokeDasharray: '3 2' }), fTag(F, 'tfpredl', { x: px0, y: py0 }, t('stem.coordgrid.svg_prediction', 'your prediction'), GP.cursor, true, 18));
          }
          if (shownImage && shownImage.every(function (q) { return F.has(q); })) kids = kids.concat(fTri(F, 'tfS', shownImage, shownNames, GP.image, null, '2 3'));
        }
        var svgLabel = tk ? tfPrompt(tk) : t('stem.coordgrid.tf_grid_empty', 'Empty coordinate grid. Choose a challenge to start.');
        var describeRows = [];
        if (tk) {
          var addRows = function (pts, names, figure) { (pts || []).forEach(function (q, i) { describeRows.push([figure, names[i], q]); }); };
          if (tk.A) addRows(tk.A, VN1, t('stem.coordgrid.fig_abc', 'Triangle ABC'));
          if (tk.B) addRows(tk.B, VN2, t('stem.coordgrid.fig_def', 'Triangle DEF'));
          if (tk.type === 'scale') addRows(tk.image, VNP, t('stem.coordgrid.fig_image', 'Image A′B′C′'));
          if (tk.p) describeRows.push([t('stem.coordgrid.fig_point', 'Point'), 'P', tk.p]);
          if (shownImage) addRows(shownImage, VNP, tk.type === 'judge' ? t('stem.coordgrid.fig_kai', 'Kai\'s image') : t('stem.coordgrid.fig_yours', 'Your image'));
        }
        var body = null;
        if (tk && tk.type === 'sequence') {
          var kinds = tfBuilderKinds(), kd = kinds.indexOf(tfDraft.kind) >= 0 ? tfDraft.kind : kinds[0];
          var setD = function (patch) { updCG({ tfDraft: Object.assign({}, tfDraft, { kind: kd }, patch) }); };
          var params = null;
          if (kd === 'translate') params = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            numBox(t('stem.coordgrid.draft_dx', 'Move in x (right +, left −)'), tfDraft.dx, function (v) { setD({ dx: v }); }, { key: 'dx', onEnter: addTfStep, wide: true }),
            numBox(t('stem.coordgrid.draft_dy', 'Move in y (up +, down −)'), tfDraft.dy, function (v) { setD({ dy: v }); }, { key: 'dy', onEnter: addTfStep, wide: true }));
          else if (kd === 'reflect') params = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' } },
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700 } }, t('stem.coordgrid.draft_line', 'Mirror line'),
              h('select', { value: tfDraft.line || 'x', onChange: function (e) { setD({ line: e.target.value }); }, style: Object.assign({}, inputStyle, { width: 'auto', fontFamily: 'inherit' }) },
                tfLines().map(function (l) { return h('option', { key: l, value: l }, LINE_NAMES[l]); }))),
            (tfDraft.line === 'xa' || tfDraft.line === 'yb') && numBox(t('stem.coordgrid.draft_a', 'a ='), tfDraft.a, function (v) { setD({ a: v }); }, { key: 'a', aria: t('stem.coordgrid.draft_a_label', 'Value of a for the mirror line'), onEnter: addTfStep }));
          else if (kd === 'rotate') params = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' } },
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700 } }, t('stem.coordgrid.draft_turn', 'Turn'),
              h('select', { value: String(tfDraft.angle || 90), onChange: function (e) { setD({ angle: Number(e.target.value) }); }, style: Object.assign({}, inputStyle, { width: 'auto', fontFamily: 'inherit' }) },
                [90, 180, 270].map(function (a) { return h('option', { key: a, value: String(a) }, TURN[a]); }))),
            numBox(t('stem.coordgrid.draft_cx', 'Centre x'), tfDraft.cx == null ? '0' : tfDraft.cx, function (v) { setD({ cx: v }); }, { key: 'cx', onEnter: addTfStep }),
            numBox(t('stem.coordgrid.draft_cy', 'Centre y'), tfDraft.cy == null ? '0' : tfDraft.cy, function (v) { setD({ cy: v }); }, { key: 'cy', onEnter: addTfStep }));
          else params = h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700 } }, t('stem.coordgrid.draft_k', 'Scale factor (centre: the origin)'),
            h('select', { value: String(tfDraft.k || '2'), onChange: function (e) { setD({ k: e.target.value }); }, style: Object.assign({}, inputStyle, { width: 'auto', fontFamily: 'inherit' }) },
              ['0.5', '1.5', '2', '3'].map(function (k) { return h('option', { key: k, value: k }, kText(Number(k))); })));
          body = h('div', null,
            h('div', { role: 'group', 'aria-label': t('stem.coordgrid.builder_label', 'Build a step'), style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, kinds.map(function (k) { return h('button', { key: k, type: 'button', 'aria-pressed': kd === k, disabled: !!tk.done, onClick: function () { setD({ kind: k }); }, style: btnOn(kd === k) }, KIND_NAMES[k]); })),
              params,
              h('div', null, h('button', { type: 'button', onClick: addTfStep, disabled: !!tk.done, style: btnStyle }, t('stem.coordgrid.add_step', '+ Add this step')))),
            h('p', { id: 'coordgrid-steps-h', style: { margin: '10px 0 4px', fontWeight: 800, fontSize: 13 } }, t('stem.coordgrid.your_sequence', 'Your sequence')),
            tfSteps.length === 0 ? h('p', { style: { margin: 0, fontSize: 13, color: GP.muted } }, t('stem.coordgrid.no_steps', 'No steps yet.'))
              : h('ol', { 'aria-labelledby': 'coordgrid-steps-h', 'data-coordgrid-steps': tfSteps.length, style: { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 } },
                tfSteps.map(function (s, i) {
                  return h('li', { key: i, style: { marginBottom: 4 } }, stepText(s), ' ',
                    h('button', { type: 'button', 'aria-label': fill(t('stem.coordgrid.step_up_label', 'Move step {n} up'), { n: i + 1 }), disabled: i === 0 || !!tk.done, onClick: function () { moveTfStep(i, -1); }, style: Object.assign({}, btnStyle, { minHeight: 32, minWidth: 32, padding: '2px 8px' }) }, t('stem.coordgrid.step_up', '↑ Up')), ' ',
                    h('button', { type: 'button', 'aria-label': fill(t('stem.coordgrid.step_remove_label', 'Remove step {n}'), { n: i + 1 }), disabled: !!tk.done, onClick: function () { removeTfStep(i); }, style: Object.assign({}, btnStyle, { minHeight: 32, minWidth: 32, padding: '2px 8px' }) }, t('stem.coordgrid.step_remove', 'Remove')));
                })),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' } },
              h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_sequence', 'Check my sequence'), onClick: firstClick(checkSequence), disabled: !!tk.done, style: primaryBtn }, t('stem.coordgrid.check_sequence_btn', '✔ Check my sequence'))),
            h('p', { style: { margin: '6px 0 0', fontSize: 12, color: GP.muted } }, t('stem.coordgrid.seq_predict_note', 'Plan the whole sequence first: your image is drawn only after you check.')),
            h('details', { style: { marginTop: 8 } },
              h('summary', { style: { cursor: 'pointer', fontWeight: 700, fontSize: 13, minHeight: 32 } }, t('stem.coordgrid.rules_title', 'Coordinate rules')),
              h('ul', { style: { margin: '6px 0 0 18px', fontSize: 13, lineHeight: 1.5 } },
                h('li', null, t('stem.coordgrid.rule_refx', 'Across the x-axis: (x, y) → (x, −y).')),
                h('li', null, t('stem.coordgrid.rule_refy', 'Across the y-axis: (x, y) → (−x, y).')),
                cgLevel === 'g8' && h('li', null, t('stem.coordgrid.rule_refyx', 'Across the line y = x: (x, y) → (y, x).')),
                cgLevel === 'g8' && h('li', null, t('stem.coordgrid.rule_rot90', '90° counterclockwise about the origin: (x, y) → (−y, x).')),
                cgLevel === 'g8' && h('li', null, t('stem.coordgrid.rule_rot180', '180° about the origin: (x, y) → (−x, −y).')),
                cgLevel === 'g8' && h('li', null, t('stem.coordgrid.rule_rot270', '90° clockwise about the origin: (x, y) → (y, −x).')),
                cgLevel === 'g8' && !noDilate && h('li', null, t('stem.coordgrid.rule_dil', 'Dilation by k from the origin: (x, y) → (kx, ky).')))));
        } else if (tk && tk.type === 'judge') {
          body = h('div', null,
            h('p', { id: 'coordgrid-kai-h', style: { margin: '0 0 4px', fontWeight: 800, fontSize: 13 } }, t('stem.coordgrid.kai_sequence', 'Kai\'s sequence')),
            h('ol', { 'aria-labelledby': 'coordgrid-kai-h', style: { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 } }, tk.proposed.map(function (s, i) { return h('li', { key: i }, stepText(s)); })),
            !tk.done && (function () {
              var ex = judgeExcluded(tk);
              var opt = function (choice, label) {
                var out = ex.indexOf(choice) >= 0;
                return h('button', { key: String(choice), type: 'button', disabled: out, 'aria-describedby': out ? 'coordgrid-judge-out' : null, onClick: function () { judgePick(choice); }, style: Object.assign({}, btnStyle, out ? { opacity: 0.55, textDecoration: 'line-through' } : {}) }, label);
              };
              return h('div', null,
                h('p', { id: 'coordgrid-judge-q', style: { margin: '8px 0 4px', fontWeight: 700, fontSize: 13 } }, t('stem.coordgrid.judge_pick_q', 'Which of Kai\'s steps is wrong, if any?')),
                h('div', { role: 'group', 'aria-labelledby': 'coordgrid-judge-q', style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  tk.proposed.map(function (s, i) { return opt(i, fill(t('stem.coordgrid.judge_step_n', 'Step {n}'), { n: i + 1 })); }).concat([opt('none', t('stem.coordgrid.judge_none', 'No step is wrong: Kai is right'))])),
                ex.length > 0 && h('p', { id: 'coordgrid-judge-out', style: { margin: '4px 0 0', fontSize: 12, color: GP.muted } }, t('stem.coordgrid.judge_ruled_out', 'Crossed-out choices are ruled out.')));
            })(),
            h('p', { style: { margin: '6px 0 0', fontSize: 12, color: GP.muted } }, t('stem.coordgrid.judge_note2', 'Decide first: Kai\'s image is drawn once you know whether it lands on DEF.')));
        } else if (tfPredictTask) {
          var vName = tk.type === 'rotate' ? 'P′' : VN1[tk.q] + '′';
          body = h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' } },
            numBox(fill(t('stem.coordgrid.image_x_of', 'x of {v}'), { v: vName }), tfFb.ansX, function (v) { tfSetFb({ ansX: v }); }, { key: 'ax', aria: t('stem.coordgrid.your_x_label', 'Your x-coordinate'), disabled: !!tk.done, onEnter: checkTfPoint, describedBy: 'coordgrid-tf-prompt' }),
            numBox(fill(t('stem.coordgrid.image_y_of', 'y of {v}'), { v: vName }), tfFb.ansY, function (v) { tfSetFb({ ansY: v }); }, { key: 'ay', aria: t('stem.coordgrid.your_y_label', 'Your y-coordinate'), disabled: !!tk.done, onEnter: checkTfPoint, describedBy: 'coordgrid-tf-prompt' }),
            h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_2', 'Check'), onClick: firstClick(checkTfPoint), disabled: !!tk.done, style: primaryBtn }, t('stem.coordgrid.check_3', '✔ Check')),
            h('p', { style: { flexBasis: '100%', margin: 0, fontSize: 12, color: GP.muted } }, t('stem.coordgrid.tf_predict_how', 'Predict first: type the image or move the grid cursor there and press Enter. The image is drawn after you check.')));
        } else if (tk && tk.type === 'scale') {
          body = h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' } },
            numBox(tk.ask === 'k' ? t('stem.coordgrid.scale_k_label', 'Scale factor') : t('stem.coordgrid.scale_side_label', 'Length of A′B′'), tfFb.ansNum, function (v) { tfSetFb({ ansNum: v }); }, { key: 'sn', aria: t('stem.coordgrid.your_answer', 'Your answer'), decimal: true, disabled: !!tk.done, onEnter: checkScale, describedBy: 'coordgrid-tf-prompt' }),
            h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_2', 'Check'), onClick: firstClick(checkScale), disabled: !!tk.done, style: primaryBtn }, t('stem.coordgrid.check_3', '✔ Check')),
            h('p', { style: { flexBasis: '100%', margin: 0, fontSize: 12, color: GP.muted } }, t('stem.coordgrid.scale_how', 'A fraction such as 1/2 or a decimal such as 0.5 both work.')));
        }
        var solvedHere = tk ? (newCounts[STAGE_COUNTER[tk.type]] || 0) : 0;
        return tabPanel('transform', [
          h('div', { key: 'lv' }, renderLevelBar({ noQ1: true })),
          h('div', { key: 'pick' }, pickerRow(X.TF_TASKS, tfInLevel, tfAllowed, tk ? tk.type : null, TASK_NAMES, startTf, 'coordgrid-tf-tasks-h')),
          noDilate && h('p', { key: 'nod', style: { margin: 0, fontSize: 13, color: GP.muted } }, t('stem.coordgrid.no_dilation_note', 'Your teacher has turned dilations off: congruence moves only.')),
          h('section', { key: 'card', 'data-coordgrid-tf': tk ? tk.type : 'none', 'aria-labelledby': 'coordgrid-tf-title', style: Object.assign({}, cardStyle, { borderWidth: 2 }) },
            h('h4', { id: 'coordgrid-tf-title', style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: GP.accent } }, tk ? '🔄 ' + TASK_NAMES[tk.type] : t('stem.coordgrid.tf_title', '🔄 Transformations')),
            h('p', { id: 'coordgrid-tf-prompt', style: { margin: '0 0 8px', fontSize: 14, fontWeight: 700 } }, tk ? tfPrompt(tk) : t('stem.coordgrid.tf_intro', 'Translate, reflect, rotate and dilate figures on the grid. Choose a challenge above.')),
            gridApp({ id: 'tf', F: F, cur: tfCur, setCur: function (p) { updCG({ tfCur: p }); }, announce: tfAnnounce,
              onEnter: tfPredictTask && !tk.done ? setTfPrediction : function () { say(tk ? t('stem.coordgrid.tf_enter_note', 'Use the controls below the grid to answer.') : t('stem.coordgrid.tf_grid_empty', 'Empty coordinate grid. Choose a challenge to start.')); },
              onPick: tfPredictTask && !tk.done ? setTfPrediction : null,
              label: t('stem.coordgrid.tf_app_label', 'Transformation grid cursor. Arrow keys move one unit and say what is there. Enter places a prediction.'), describedBy: 'coordgrid-tf-prompt', svgLabel: svgLabel, children: kids }),
            describeRows.length > 0 && h('table', { 'data-coordgrid-tf-table': 'true', style: { marginTop: 8, borderCollapse: 'collapse', fontSize: 13 } },
              h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, t('stem.coordgrid.tf_table_caption', 'Vertices on the grid')),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, t('stem.coordgrid.col_figure', 'Figure')),
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, t('stem.coordgrid.col_vertex', 'Vertex')),
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, 'x'),
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, 'y'))),
              h('tbody', null, describeRows.map(function (r, i) { return h('tr', { key: i }, h('td', { style: { padding: '2px 8px' } }, r[0]), h('td', { style: { padding: '2px 8px' } }, r[1]), h('td', { style: { padding: '2px 8px', fontFamily: 'monospace' } }, fmt(r[2].x)), h('td', { style: { padding: '2px 8px', fontFamily: 'monospace' } }, fmt(r[2].y))); }))),
            body,
            tk && !tk.done && tk.tries === 1 && h('p', { style: { margin: '4px 0 0', fontSize: 12, color: GP.muted } }, secondTryNote),
            tk && hintBox(tk, tfHintText, tfHint),
            feedbackP(tfFb, 'coordgrid-tf-feedback'),
            tk && tk.done && tk.missed && h('p', { 'data-coordgrid-locked': 'true', style: { margin: '4px 0 0', fontWeight: 700, fontSize: 13 } }, closedText(!!tfFb.revealed)),
            stageRevealBtn(tk, 'tfTask', 'tfFb', tfFb),
            tk && tk.done && h('button', { type: 'button', onClick: function () { startTf(tk.type); focusGrid(TF_FOCUS[0], TF_FOCUS[1]); }, style: Object.assign({}, btnStyle, { marginTop: 8 }) }, fill(t('stem.coordgrid.next_task', 'Next: {task}'), { task: TASK_NAMES[tk.type] })),
            tk && TF_WORKED[tk.type] && workedBox(tk.type, TF_WORKED[tk.type], solvedHere)),
          h('div', { key: 'links', style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            h('button', { type: 'button', onClick: function () { updCG({ cgTab: 'explore' }); }, style: btnStyle }, t('stem.coordgrid.tf_link_explore', 'Practise single-point reflections and translations in Plot & measure')))
        ]);
      };

      // ── Patterns and tables tab ──
      var ptTask = X.cleanPt(_cg.ptTask);
      var ptFb = _cg.ptFb && typeof _cg.ptFb === 'object' ? _cg.ptFb : {};
      var ptVals = ptFb.vals && typeof ptFb.vals === 'object' ? ptFb.vals : {};
      var ptPts = Array.isArray(ptFb.pts) ? ptFb.pts.filter(finitePt).slice(0, 40) : [];
      var ptCur = finitePt(_cg.ptCur) ? _cg.ptCur : { x: 0, y: 0 };
      var ptLevelTasks = X.LEVEL_PT[cgLevel] || X.LEVEL_PT.g6;
      var ptInLevel = function (k) { return ptLevelTasks.indexOf(k) >= 0; };
      var ptAllowed = function (k) { return stretchAllowed || ptInLevel(k); };
      var ptPairs = !ptTask ? [] : ptTask.type === 'patterns' ? ptTask.A.map(function (a, i) { return { x: a, y: ptTask.B[i] }; }) : X.tablePairs(ptTask);
      var niceStep = function (max, cap) { var c = [1, 2, 5, 10]; for (var i = 0; i < c.length; i++) if (max / c[i] <= cap) return c[i]; return 10; };
      var ptBox = (function () {
        if (!ptTask) return { xmin: 0, xmax: 10, ymin: 0, ymax: 10, xstep: 1, ystep: 1 };
        var xm = ptTask.type === 'patterns' ? ptTask.A[4] + ptTask.addA : ptTask.xs[4] + ptTask.xstep;
        var ym = ptTask.type === 'patterns' ? ptTask.B[4] + ptTask.addB : ptTask.ys[4] + ptTask.m * ptTask.xstep;
        var xs = niceStep(xm, 12), ys = niceStep(ym, 10);
        return { xmin: 0, xmax: Math.max(xs * 2, Math.ceil(xm / xs) * xs), ymin: 0, ymax: Math.max(ys * 2, Math.ceil(ym / ys) * ys), xstep: xs, ystep: ys };
      })();
      var ptF = mkFrame(ptBox);
      var TABLE_TEXT = {
        plant: t('stem.coordgrid.table_plant', 'The table shows a plant\'s height in centimetres (y) after x days.'),
        savings: t('stem.coordgrid.table_savings', 'The table shows the dollars saved (y) after x weeks.'),
        walk: t('stem.coordgrid.table_walk', 'The table shows the blocks walked (y) after x minutes.'),
        pool: t('stem.coordgrid.table_pool', 'The table shows the hundreds of litres in a pool (y) after x minutes of filling.'),
        stack: t('stem.coordgrid.table_stack', 'The table shows the height in centimetres (y) of a stack of x cups.')
      };
      var ptPrompt = function (tk) {
        if (!tk) return '';
        if (tk.type === 'patterns') return fill(t('stem.coordgrid.prompt_patterns', 'Pattern A starts at {a} and adds {p} each time. Pattern B starts at {b} and adds {q} each time.'), { a: fmt(tk.A[0]), p: fmt(tk.addA), b: fmt(tk.B[0]), q: fmt(tk.addB) });
        return TABLE_TEXT[tk.ctx] + ' ' + t('stem.coordgrid.table_depends', 'y depends on x.');
      };
      var ptStagePrompt = function (tk) {
        if (!tk) return '';
        if (tk.done) return t('stem.coordgrid.pt_done', 'This item is finished.');
        if (tk.stage === 'fill') return t('stem.coordgrid.pt_stage_fill', 'Part 1: fill in terms 1 to 4 of both patterns.');
        if (tk.stage === 'plot') return tk.type === 'patterns' ? t('stem.coordgrid.pt_stage_plot_pat', 'Part 2: make ordered pairs (pattern A term, pattern B term) and plot every pair.') : t('stem.coordgrid.pt_stage_plot_tab', 'Part 1: plot each row of the table as an ordered pair (x, y).');
        if (tk.stage === 'relate') return t('stem.coordgrid.pt_stage_relate', 'Part 3: describe how the two patterns are related.');
        if (tk.stage === 'equation') return t('stem.coordgrid.pt_stage_equation', 'Part 2: write the rule as an equation, y = (rate) × x + (start).');
        if (tk.stage === 'predict') return fill(t('stem.coordgrid.pt_stage_predict', 'Part 3: use your rule. What is y when x is {x}?'), { x: fmt(tk.askX) });
        return '';
      };
      var startPt = function (k) {
        if (!ptAllowed(k)) return;
        var item = null, n = 0;
        do { item = k === 'patterns' ? X.genPatterns(cgLevel) : X.genTable(cgLevel); } while ((isItemLocked(X.ptKey(item)) || (ptTask && X.ptKey(item) === X.ptKey(ptTask))) && n++ < 25);
        item = Object.assign({}, item, { tries: 0, hint: 0, stage: k === 'patterns' ? 'fill' : 'plot', done: false });
        sfxClick();
        updCG({ ptTask: item, ptFb: { vals: {}, pts: [] }, ptCur: { x: 0, y: 0 } });
        say(ptPrompt(item) + ' ' + ptStagePrompt(item));
      };
      var ptBase = function () { return { taskKey: 'ptTask', fbKey: 'ptFb', task: ptTask, fb: ptFb, key: X.ptKey(ptTask), counter: STAGE_COUNTER[ptTask.type], logTask: ptTask.type, prompt: ptPrompt(ptTask), reason: ptTask.type === 'patterns' ? 'patterns' : 'table graph' }; };
      var ptMsg = function (m) { updCG({ ptFb: Object.assign({}, ptFb, { msg: m, correct: false }) }); say(m); };
      var togglePtPoint = function (p) {
        if (!ptTask || ptTask.done || ptTask.stage !== 'plot') { say(t('stem.coordgrid.pt_not_plotting', 'Plotting opens in the plotting part of this task.')); return; }
        var has = ptPts.some(function (q) { return CG_CORE.same(q, p); });
        var next = has ? ptPts.filter(function (q) { return !CG_CORE.same(q, p); }) : ptPts.concat([{ x: p.x, y: p.y }]);
        updCG({ ptFb: Object.assign({}, ptFb, { pts: next, msg: null }) });
        say(fill(has ? t('stem.coordgrid.point_removed', 'Removed the point {pair}.') : t('stem.coordgrid.pt_plotted', 'Plotted {pair}.'), { pair: pairText(p) }));
      };
      var checkPtFill = function () {
        var num = function (v) { return window.StemLab.grading.toNumber(String(v == null ? '' : v)); };
        var va = [1, 2, 3, 4].map(function (i) { return num(ptVals['a' + i]); }), vb = [1, 2, 3, 4].map(function (i) { return num(ptVals['b' + i]); });
        var r = X.diagnoseFill(va, vb, ptTask);
        if (r.code === 'incomplete') { ptMsg(MISC.incomplete); return; }
        var full = {}; [1, 2, 3, 4].forEach(function (i) { full['a' + i] = String(ptTask.A[i]); full['b' + i] = String(ptTask.B[i]); });
        stageTry(Object.assign(ptBase(), { ok: r.code === 'correct', code: r.code, named: r.which ? fill(t('stem.coordgrid.check_pattern_which', 'Check pattern {p}.'), { p: r.which }) + ' ' + (MISC[r.code] || MISC.other) : null,
          nextStage: 'plot', revealStage: 'plot', revealFb: { vals: full }, final: false, sig: va.join(',') + '|' + vb.join(','),
          answer: fill(t('stem.coordgrid.answer_patterns', 'Pattern A: {a}. Pattern B: {b}.'), { a: ptTask.A.join(', '), b: ptTask.B.join(', ') }),
          explain: t('stem.coordgrid.explain_fill', 'Now make the ordered pairs and plot them.') }));
      };
      var checkPtPlot = function () {
        var code = X.diagnosePairs(ptPts, ptPairs, ptTask.type === 'table' ? X.tableRowPairs(ptTask) : null);
        if (code === 'incomplete') { ptMsg(t('stem.coordgrid.plot_your_point_first', 'Plot your point first, then check.')); return; }
        var nextS = ptTask.type === 'patterns' ? 'relate' : 'equation';
        stageTry(Object.assign(ptBase(), { ok: code === 'correct', code: code, nextStage: nextS, revealStage: nextS, revealFb: { pts: ptPairs.slice() }, final: false, sig: ptPts.map(function (q) { return q.x + ',' + q.y; }).sort().join(' '),
          answer: fill(t('stem.coordgrid.answer_pairs', 'The ordered pairs are {list}. They are now plotted.'), { list: ptPairs.map(pairText).join(', ') }),
          explain: ptTask.type === 'patterns' ? t('stem.coordgrid.explain_pairs_line', 'The points lie on a straight line through the origin.') : t('stem.coordgrid.explain_table_line', 'The points lie on a straight line: each step right goes up by the same amount.') }));
      };
      var checkPtRelate = function () {
        if (!String(ptFb.why || '').trim()) { ptMsg(MISC.no_reason); return; }
        var v = window.StemLab.grading.toNumber(String(ptFb.rel == null ? '' : ptFb.rel));
        if (!isFinite(v)) { ptMsg(t('stem.coordgrid.enter_number', 'Enter a number, then check.')); return; }
        var code = X.diagnoseRelation(v, ptTask);
        stageTry(Object.assign(ptBase(), { ok: code === 'correct', code: code, final: true, sig: String(v),
          answer: fill(t('stem.coordgrid.answer_relate', 'Each pattern B term is {r} times its pattern A term.'), { r: fmt(ptTask.ratio) }),
          explain: fill(t('stem.coordgrid.explain_relate', 'Each B term is {r} times its A term, because B adds {q}, which is {r} times {p}. On the graph, y = {r} × x.'), { r: fmt(ptTask.ratio), q: fmt(ptTask.addB), p: fmt(ptTask.addA) }) }));
      };
      var checkPtEquation = function () {
        var num = function (v) { return window.StemLab.grading.toNumber(String(v == null ? '' : v)); };
        var code = X.diagnoseEquation(num(ptFb.m), num(ptFb.b), ptTask);
        if (code === 'incomplete') { ptMsg(MISC.incomplete); return; }
        stageTry(Object.assign(ptBase(), { ok: code === 'correct', code: code, nextStage: 'predict', revealStage: 'predict', revealFb: { m: String(ptTask.m), b: String(ptTask.b) }, final: false, sig: num(ptFb.m) + ',' + num(ptFb.b),
          answer: fill(t('stem.coordgrid.answer_equation', 'The rule is y = {m} × x + {b}.'), { m: fmt(ptTask.m), b: fmt(ptTask.b) }),
          explain: fill(t('stem.coordgrid.explain_equation', 'y = {m} × x + {b}: the rate {m} multiplies x, and {b} is y when x is 0.'), { m: fmt(ptTask.m), b: fmt(ptTask.b) }) }));
      };
      var checkPtPredict = function () {
        var v = window.StemLab.grading.toNumber(String(ptFb.pred == null ? '' : ptFb.pred));
        if (!isFinite(v)) { ptMsg(t('stem.coordgrid.enter_number', 'Enter a number, then check.')); return; }
        var code = X.diagnoseTablePredict(v, ptTask);
        stageTry(Object.assign(ptBase(), { ok: code === 'correct', code: code, final: true, sig: String(v),
          answer: fill(t('stem.coordgrid.answer_predict', 'When x is {x}, y is {y}.'), { x: fmt(ptTask.askX), y: fmt(ptTask.askY) }),
          explain: fill(t('stem.coordgrid.explain_predict', '{m} × {x} + {b} = {y}.'), { m: fmt(ptTask.m), x: fmt(ptTask.askX), b: fmt(ptTask.b), y: fmt(ptTask.askY) }) }));
      };
      var ptHintText = function (lv) {
        var tk = ptTask;
        if (!tk) return '';
        if (tk.stage === 'fill') return lv === 1 ? t('stem.coordgrid.hint_fill_1', 'Start at the first term and add the rule\'s amount to get each next term.')
          : fill(t('stem.coordgrid.hint_fill_2', 'Pattern A: {a0} + {p} = {a1}. Pattern B: {b0} + {q} = {b1}. Keep adding.'), { a0: fmt(tk.A[0]), p: fmt(tk.addA), a1: fmt(tk.A[1]), b0: fmt(tk.B[0]), q: fmt(tk.addB), b1: fmt(tk.B[1]) });
        if (tk.stage === 'plot') return lv === 1 ? t('stem.coordgrid.hint_pt_plot_1', 'Each row gives one point: the first number is x (across) and the second is y (up).')
          : fill(t('stem.coordgrid.hint_pt_plot_2', 'For example, one point is {pair}. Plot it, then do the same for every row.'), { pair: pairText(ptPairs[1]) });
        if (tk.stage === 'relate') return lv === 1 ? t('stem.coordgrid.hint_relate_1', 'Compare matching terms: divide a B term by its A term.')
          : fill(t('stem.coordgrid.hint_relate_2', 'Try term 2: {b} ÷ {a}.'), { b: fmt(tk.B[2]), a: fmt(tk.A[2]) });
        if (tk.stage === 'equation') return lv === 1 ? t('stem.coordgrid.hint_eq_1', 'The start is y when x is 0. The rate is how much y changes for each 1 in x.')
          : fill(t('stem.coordgrid.hint_eq_2', 'When x is 0, y is {b0}. From one row to the next, y changes by {dy} while x changes by {dx}.'), { b0: fmt(tk.ys[0]), dy: fmt(tk.ys[1] - tk.ys[0]), dx: fmt(tk.xstep) });
        if (tk.stage === 'predict') return lv === 1 ? t('stem.coordgrid.hint_pred_1', 'Put the new x into your rule.')
          : fill(t('stem.coordgrid.hint_pred_2', 'Work out {m} × {x}, then add {b}.'), { m: fmt(tk.m), x: fmt(tk.askX), b: fmt(tk.b) });
        return '';
      };
      var ptHint = function () { if (!ptTask || ptTask.done || (ptTask.hint || 0) >= 2) return; var n = (ptTask.hint || 0) + 1; updCG({ ptTask: Object.assign({}, ptTask, { hint: n }) }); ptTask = Object.assign({}, ptTask, { hint: n }); say(ptHintText(n)); };
      var PT_WORKED = {
        patterns: [t('stem.coordgrid.we_pat_0', 'Example: pattern A starts at 0 and adds 2; pattern B starts at 0 and adds 6.'), t('stem.coordgrid.we_pat_1', 'A: 0, 2, 4, 6. B: 0, 6, 12, 18.'), t('stem.coordgrid.we_pat_2', 'Ordered pairs: (0, 0), (2, 6), (4, 12), (6, 18).'), t('stem.coordgrid.we_pat_3', 'Each B term is 3 times its A term, because 6 is 3 times 2.')],
        table: [t('stem.coordgrid.we_tab_0', 'Example: x is 0, 1, 2, 3 and y is 4, 7, 10, 13.'), t('stem.coordgrid.we_tab_1', 'Each time x goes up 1, y goes up 3, so the rate is 3.'), t('stem.coordgrid.we_tab_2', 'When x is 0, y is 4: that is the start.'), t('stem.coordgrid.we_tab_3', 'So y = 3 × x + 4. Check a row: 3 × 2 + 4 = 10.')]
      };
      var ptAnnounce = function (p) {
        var parts = [fill(t('stem.coordgrid.pt_cursor', 'x {x}, y {y}.'), { x: fmt(p.x), y: fmt(p.y) })];
        if (ptPts.some(function (q) { return CG_CORE.same(q, p); })) parts.push(t('stem.coordgrid.cursor_has_point', 'A plotted point is here.'));
        return parts.join(' ');
      };
      var renderPatterns = function () {
        var tk = ptTask, F = ptF, kids = [];
        ptPts.forEach(function (p, i) { if (F.has(p)) kids.push(fDot(F, 'pp' + i, p, GP.point, 6)); });
        // The line through the pairs is drawn only once the plot has been checked:
        // drawn earlier, it would confirm a correct plot before the Check.
        if (tk && (tk.done || (tk.stage !== 'fill' && tk.stage !== 'plot')) && ptPts.length >= 2 && X.diagnosePairs(ptPts, ptPairs) === 'correct') {
          var sorted = ptPairs.slice().sort(function (a, b2) { return a.x - b2.x; });
          kids.push(h('polyline', { key: 'ptline', points: sorted.map(function (p) { return F.sx(p.x) + ',' + F.sy(p.y); }).join(' '), fill: 'none', stroke: GP.line, strokeWidth: 1.5, strokeDasharray: '5 4' }));
        }
        var showVals = tk && tk.type === 'patterns' && tk.stage !== 'fill';
        var stageBody = null;
        if (tk && tk.type === 'patterns') {
          var cell = function (which, i) {
            var val = which === 'a' ? tk.A[i] : tk.B[i];
            if (i === 0 || showVals) return h('td', { style: { padding: '2px 8px', fontFamily: 'monospace' } }, fmt(val));
            return h('td', { style: { padding: '2px 4px' } }, h('input', { type: 'text', inputMode: 'numeric', value: ptVals[which + i] == null ? '' : String(ptVals[which + i]), disabled: !!tk.done,
              'aria-label': fill(which === 'a' ? t('stem.coordgrid.pat_a_term', 'Pattern A, term {n}') : t('stem.coordgrid.pat_b_term', 'Pattern B, term {n}'), { n: i }),
              onChange: function (e) { var nv = Object.assign({}, ptVals); nv[which + i] = e.target.value; updCG({ ptFb: Object.assign({}, ptFb, { vals: nv, msg: null }) }); },
              onKeyDown: function (e) { if (e.key === 'Enter' && !e.repeat) checkPtFill(); }, style: Object.assign({}, inputStyle, { width: '4.5rem' }) }));
          };
          stageBody = h('div', null,
            h('table', { 'data-coordgrid-pattern-table': 'true', style: { borderCollapse: 'collapse', fontSize: 14 } },
              h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, t('stem.coordgrid.pat_table_caption', 'The two patterns, term by term')),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, t('stem.coordgrid.col_term', 'Term')),
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, t('stem.coordgrid.col_pattern_a', 'Pattern A (x)')),
                h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 8px' } }, t('stem.coordgrid.col_pattern_b', 'Pattern B (y)')))),
              h('tbody', null, [0, 1, 2, 3, 4].map(function (i) { return h('tr', { key: i }, h('th', { scope: 'row', style: { textAlign: 'left', padding: '2px 8px' } }, String(i)), cell('a', i), cell('b', i)); }))),
            tk.stage === 'fill' && !tk.done && h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_terms', 'Check the terms'), onClick: firstClick(checkPtFill), style: Object.assign({}, primaryBtn, { marginTop: 8 }) }, t('stem.coordgrid.check_terms_btn', '✔ Check the terms')));
        } else if (tk) {
          stageBody = h('table', { 'data-coordgrid-xy-table': 'true', style: { borderCollapse: 'collapse', fontSize: 14 } },
            h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, t('stem.coordgrid.xy_table_caption', 'The table')),
            h('thead', null, h('tr', null, h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 10px' } }, 'x'), h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 10px' } }, 'y'))),
            h('tbody', null, tk.xs.map(function (x, i) { return h('tr', { key: i }, h('td', { style: { padding: '2px 10px', fontFamily: 'monospace' } }, fmt(x)), h('td', { style: { padding: '2px 10px', fontFamily: 'monospace' } }, fmt(tk.ys[i]))); })));
        }
        var plotPart = tk && tk.stage === 'plot' && !tk.done && h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 8 } },
          numBox(t('stem.coordgrid.x_coordinate', 'X coordinate'), ptFb.ex, function (v) { updCG({ ptFb: Object.assign({}, ptFb, { ex: v }) }); }, { key: 'ex' }),
          numBox(t('stem.coordgrid.y_coordinate', 'Y coordinate'), ptFb.ey, function (v) { updCG({ ptFb: Object.assign({}, ptFb, { ey: v }) }); }, { key: 'ey' }),
          h('button', { type: 'button', onClick: function () { var x = readInt(ptFb.ex), y = readInt(ptFb.ey); if (x === null || y === null || !F.has({ x: x, y: y })) { ptMsg(t('stem.coordgrid.pt_entry_bad', 'Enter whole numbers that fit on this grid.')); return; } togglePtPoint({ x: x, y: y }); }, style: btnStyle }, t('stem.coordgrid.toggle_coordinate', 'Plot or remove point')),
          h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_plot', 'Check my points'), onClick: firstClick(checkPtPlot), style: primaryBtn }, t('stem.coordgrid.check_plot_btn', '✔ Check my points')),
          h('p', { style: { flexBasis: '100%', margin: 0, fontSize: 13, color: GP.ink } }, ptPts.length ? fill(t('stem.coordgrid.pt_your_points', 'Your points: {list}.'), { list: ptPts.map(pairText).join(', ') }) : t('stem.coordgrid.desc_empty', 'No points are plotted yet.')));
        var relatePart = tk && tk.stage === 'relate' && !tk.done && h('div', { style: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 } },
          numBox(t('stem.coordgrid.relate_label', 'Each pattern B term is how many times its pattern A term?'), ptFb.rel, function (v) { updCG({ ptFb: Object.assign({}, ptFb, { rel: v, msg: null }) }); }, { key: 'rel', decimal: true }),
          h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700 } }, t('stem.coordgrid.relate_why', 'Explain how you know'),
            h('textarea', { value: ptFb.why || '', rows: 2, onChange: function (e) { updCG({ ptFb: Object.assign({}, ptFb, { why: e.target.value, msg: null }) }); }, style: Object.assign({}, inputStyle, { width: '100%', fontFamily: 'inherit' }) })),
          h('div', null, h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_2', 'Check'), onClick: firstClick(checkPtRelate), style: primaryBtn }, t('stem.coordgrid.check_3', '✔ Check'))));
        var eqPart = tk && tk.stage === 'equation' && !tk.done && h('div', { role: 'group', 'aria-label': t('stem.coordgrid.eq_group', 'Equation y = rate × x + start'), style: { marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' } },
          h('span', { 'aria-hidden': 'true', style: { fontFamily: 'monospace', fontSize: 16, fontWeight: 700, paddingBottom: 10 } }, 'y ='),
          numBox(t('stem.coordgrid.eq_rate', 'Rate'), ptFb.m, function (v) { updCG({ ptFb: Object.assign({}, ptFb, { m: v, msg: null }) }); }, { key: 'm', aria: t('stem.coordgrid.eq_rate_label', 'Rate: the number that multiplies x'), onEnter: checkPtEquation }),
          h('span', { 'aria-hidden': 'true', style: { fontFamily: 'monospace', fontSize: 16, fontWeight: 700, paddingBottom: 10 } }, '× x +'),
          numBox(t('stem.coordgrid.eq_start', 'Start'), ptFb.b, function (v) { updCG({ ptFb: Object.assign({}, ptFb, { b: v, msg: null }) }); }, { key: 'b', aria: t('stem.coordgrid.eq_start_label', 'Start: y when x is 0'), onEnter: checkPtEquation }),
          h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_2', 'Check'), onClick: firstClick(checkPtEquation), style: primaryBtn }, t('stem.coordgrid.check_3', '✔ Check')));
        var predPart = tk && tk.stage === 'predict' && !tk.done && h('div', { style: { marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' } },
          numBox(fill(t('stem.coordgrid.pred_label', 'y when x is {x}'), { x: fmt(tk.askX) }), ptFb.pred, function (v) { updCG({ ptFb: Object.assign({}, ptFb, { pred: v, msg: null }) }); }, { key: 'pred', decimal: true, onEnter: checkPtPredict }),
          h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_2', 'Check'), onClick: firstClick(checkPtPredict), style: primaryBtn }, t('stem.coordgrid.check_3', '✔ Check')));
        var solvedHere = tk ? (newCounts[STAGE_COUNTER[tk.type]] || 0) : 0;
        var gridLabel = tk ? fill(t('stem.coordgrid.pt_grid_label', 'Graph from 0 to {xm} across and 0 to {ym} up, with {n} plotted points.'), { xm: fmt(F.b.xmax), ym: fmt(F.b.ymax), n: ptPts.length }) : t('stem.coordgrid.tf_grid_empty', 'Empty coordinate grid. Choose a challenge to start.');
        return tabPanel('patterns', [
          h('div', { key: 'lv' }, renderLevelBar({ noQ1: true })),
          h('div', { key: 'pick' }, pickerRow(X.PT_TASKS, ptInLevel, ptAllowed, tk ? tk.type : null, TASK_NAMES, startPt, 'coordgrid-pt-tasks-h')),
          h('section', { key: 'card', 'data-coordgrid-pt': tk ? tk.type + ':' + (tk.done ? 'done' : tk.stage) : 'none', 'aria-labelledby': 'coordgrid-pt-title', style: Object.assign({}, cardStyle, { borderWidth: 2 }) },
            h('h4', { id: 'coordgrid-pt-title', style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: GP.accent } }, tk ? '📊 ' + TASK_NAMES[tk.type] : t('stem.coordgrid.pt_title', '📊 Patterns and tables')),
            h('p', { id: 'coordgrid-pt-prompt', style: { margin: '0 0 4px', fontSize: 14, fontWeight: 700 } }, tk ? ptPrompt(tk) : t('stem.coordgrid.pt_intro', 'Turn number patterns and tables into ordered pairs, graph them, and describe the relationship. Choose a challenge above.')),
            tk && h('p', { style: { margin: '0 0 8px', fontSize: 13 } }, ptStagePrompt(tk)),
            stageBody,
            gridApp({ id: 'pt', F: F, cur: ptCur, setCur: function (p) { updCG({ ptCur: p }); }, announce: ptAnnounce, onEnter: togglePtPoint, onPick: tk && tk.stage === 'plot' && !tk.done ? togglePtPoint : null,
              label: t('stem.coordgrid.pt_app_label', 'Graph cursor. Arrow keys move one unit (Shift: 5, Page Up and Page Down: 10). Enter plots or removes a point.'), describedBy: 'coordgrid-pt-prompt', svgLabel: gridLabel, children: kids }),
            plotPart, relatePart, eqPart, predPart,
            tk && !tk.done && tk.tries === 1 && h('p', { style: { margin: '4px 0 0', fontSize: 12, color: GP.muted } }, secondTryNote),
            tk && hintBox(tk, ptHintText, ptHint),
            feedbackP(ptFb, 'coordgrid-pt-feedback'),
            tk && tk.missed && h('p', { 'data-coordgrid-locked': 'true', style: { margin: '4px 0 0', fontWeight: 700, fontSize: 13 } }, pendOf(tk) ? closedText(false) : t('stem.coordgrid.pt_practice_only', 'Practice only: this item no longer earns credit.')),
            stageRevealBtn(tk, 'ptTask', 'ptFb', ptFb),
            tk && tk.done && h('button', { type: 'button', onClick: function () { startPt(tk.type); focusGrid(PT_FOCUS[0], PT_FOCUS[1]); }, style: Object.assign({}, btnStyle, { marginTop: 8 }) }, fill(t('stem.coordgrid.next_task', 'Next: {task}'), { task: TASK_NAMES[tk.type] })),
            tk && workedBox(tk.type, PT_WORKED[tk.type], solvedHere)),
          h('div', { key: 'links', style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            h('button', { type: 'button', onClick: function () { openTool('graphCalc', t('stem.coordgrid.tool_graphcalc', 'Graphing Calculator')); }, style: btnStyle }, t('stem.coordgrid.pt_link_graphcalc', 'Graph your rule in the Graphing Calculator')))
        ]);
      };

      // ── Treasure hunt tab ──
      var thMission = X.cleanMission(_cg.thMission);
      var thFb = _cg.thFb && typeof _cg.thFb === 'object' ? _cg.thFb : {};
      var thCur = finitePt(_cg.thCur) ? _cg.thCur : { x: 0, y: 0 };
      var thDescOpen = _cg.thDescOpen === true;
      var LM_NAMES = { palm: t('stem.coordgrid.lm_palm', 'palm tree'), well: t('stem.coordgrid.lm_well', 'well'), cave: t('stem.coordgrid.lm_cave', 'cave'), rock: t('stem.coordgrid.lm_rock', 'big rock'), hut: t('stem.coordgrid.lm_hut', 'hut'), flag: t('stem.coordgrid.lm_flag', 'flag'), dock: t('stem.coordgrid.lm_dock', 'dock'), bridge: t('stem.coordgrid.lm_bridge', 'bridge') };
      var clueText = function (c, m) {
        var lm = c.lm != null && m.lms[c.lm] ? LM_NAMES[m.lms[c.lm].id] : '';
        switch (c.kind) {
          case 'same_x': return fill(t('stem.coordgrid.clue_same_x', 'The treasure is on the same vertical line as the {lm}.'), { lm: lm });
          case 'same_y': return fill(t('stem.coordgrid.clue_same_y', 'The treasure is on the same horizontal line as the {lm}.'), { lm: lm });
          case 'grid_dist': return fill(t('stem.coordgrid.clue_grid_dist', 'The treasure is {n} units from the {lm}, straight along a grid line.'), { n: c.n, lm: lm });
          case 'x_gt': return fill(t('stem.coordgrid.clue_x_gt', 'The treasure\'s x-coordinate is greater than the {lm}\'s x-coordinate.'), { lm: lm });
          case 'x_lt': return fill(t('stem.coordgrid.clue_x_lt', 'The treasure\'s x-coordinate is less than the {lm}\'s x-coordinate.'), { lm: lm });
          case 'y_gt': return fill(t('stem.coordgrid.clue_y_gt', 'The treasure\'s y-coordinate is greater than the {lm}\'s y-coordinate.'), { lm: lm });
          case 'y_lt': return fill(t('stem.coordgrid.clue_y_lt', 'The treasure\'s y-coordinate is less than the {lm}\'s y-coordinate.'), { lm: lm });
          case 'quadrant': return fill(t('stem.coordgrid.clue_quadrant', 'The treasure is in quadrant {q}.'), { q: c.q });
          case 'sum': return fill(t('stem.coordgrid.clue_sum', 'The treasure\'s x- and y-coordinates add up to {n}.'), { n: fmt(c.n) });
          case 'opp_x': return fill(t('stem.coordgrid.clue_opp_x', 'The treasure\'s x-coordinate is the opposite of the {lm}\'s x-coordinate.'), { lm: lm });
          case 'abs_y': return fill(t('stem.coordgrid.clue_abs_y', 'The treasure is {n} units from the x-axis.'), { n: c.n });
          case 'euclid': return fill(t('stem.coordgrid.clue_euclid', 'The treasure is exactly {n} units from the {lm} in a straight line.'), { n: c.n, lm: lm });
        }
        return '';
      };
      var thLocked = thMission ? isItemLocked(X.thKey(thMission)) : false;
      var thFound = !!(thMission && thMission.done && thFb.correct);
      var thShowT = !!(thMission && thMission.done && (thFound || (revealsAllowed && thFb.revealed)));
      var showTreasure = function () {
        if (!thMission || !thMission.done || thFound || !revealsAllowed) return;
        var msg = fill(t('stem.coordgrid.th_reveal2', 'The treasure was at {pair}. It is now shown on the map.'), { pair: pairText(thMission.T) });
        updCG({ thFb: Object.assign({}, thFb, { msg: msg, correct: false, revealed: true }) });
        rescueFocus('#coordgrid-th-feedback');
        say(msg + ' ' + lockedMsg);
      };
      var thF = mkFrame(thMission ? { xmin: thMission.lo, xmax: thMission.hi, ymin: thMission.lo, ymax: thMission.hi, xstep: 1, ystep: 1 } : (cgLevel === 'g5' ? { xmin: 0, xmax: 10, ymin: 0, ymax: 10, xstep: 1, ystep: 1 } : { xmin: -8, xmax: 8, ymin: -8, ymax: 8, xstep: 1, ystep: 1 }));
      var startMission = function () {
        var m = null, n = 0;
        do { m = X.genMission(cgLevel); } while ((isItemLocked(X.thKey(m)) || (thMission && X.thKey(m) === X.thKey(thMission))) && n++ < 25);
        sfxClick();
        updCG({ thMission: Object.assign({}, m, { tries: 0, hint: 0, done: false }), thFb: {}, thCur: { x: Math.max(m.lo, 0), y: Math.max(m.lo, 0) } });
        say(t('stem.coordgrid.th_intro', 'Find the buried treasure. Every clue is true, and only one spot on the map fits them all. You have 3 digs.') + ' ' + m.clues.map(function (c, i) { return fill(t('stem.coordgrid.th_clue_n', 'Clue {n}: {text}'), { n: i + 1, text: clueText(c, m) }); }).join(' '));
      };
      var thMsg = function (m) { updCG({ thFb: Object.assign({}, thFb, { msg: m, correct: false }) }); say(m); };
      var DIGS = 3;
      var dig = function (p) {
        if (!thMission) { say(t('stem.coordgrid.th_start_first', 'Start a mission first.')); return; }
        if (thMission.done) { say(t('stem.coordgrid.th_over', 'This mission is over. Start the next mission.')); return; }
        if (thMission.digs.some(function (d) { return CG_CORE.same(d, p); })) { thMsg(fill(t('stem.coordgrid.th_dug_again', 'You already dug at {pair}. Try another spot.'), { pair: pairText(p) })); return; }
        var r = X.diagnoseDig(p, thMission);
        rescueFocus('#coordgrid-th-feedback');
        var digs = thMission.digs.concat([{ x: p.x, y: p.y }]);
        var key = X.thKey(thMission);
        var hinted = (thMission.hint || 0) > 0;
        if (r.code === 'correct') {
          var clean = digs.length === 1 && !hinted;
          var msg = '✅ ' + fill(clean ? t('stem.coordgrid.th_found_first', 'Treasure found at {pair} on your first dig!') : t('stem.coordgrid.th_found', 'Treasure found at {pair}!'), { pair: pairText(p) }) + ' ' + t('stem.coordgrid.th_found_why', 'It is the only spot that fits every clue.');
          var upd = { thMission: Object.assign({}, thMission, { digs: digs, done: true }), thFb: { msg: msg, correct: true } };
          setExploreScore(function (prev) { return { correct: prev.correct + 1, total: prev.total + 1 }; });
          if (!thLocked) {
            var c = (newCounts.treasuresFound || 0) + 1;
            var sN = clean ? streak + 1 : streak;
            upd.treasuresFound = c; upd.streak = sN; upd.bestStreak = Math.max(bestStreak, sN);
            updCG(upd);
            payOnce(key, clean ? 5 : 2, 'treasure');
            checkBadges({ treasuresFound: c, correct: exploreScore.correct + 1, streak: sN });
          } else updCG(upd);
          sfxCorrect();
          say(msg);
          return;
        }
        sfxWrong();
        setExploreScore(function (prev) { return { correct: prev.correct, total: prev.total + 1 }; });
        var broke = r.broken.length === 1 ? fill(t('stem.coordgrid.th_broken_one', 'No treasure at {pair}. That spot breaks clue {n}.'), { pair: pairText(p), n: r.broken[0] + 1 })
          : fill(t('stem.coordgrid.th_broken_many', 'No treasure at {pair}. That spot breaks clues {list}.'), { pair: pairText(p), list: r.broken.map(function (i) { return i + 1; }).join(', ') });
        var extra = r.code === 'swapped' ? ' ' + MISC.swapped : r.code === 'off_by_one' ? ' ' + MISC.off_by_one : '';
        if (digs.length < DIGS) {
          var left = DIGS - digs.length;
          var m1 = '❌ ' + broke + extra + ' ' + (left === 1 ? t('stem.coordgrid.th_left_one', 'One dig left.') : fill(t('stem.coordgrid.th_left_n', '{n} digs left.'), { n: left }));
          updCG({ thMission: Object.assign({}, thMission, { digs: digs }), thFb: { msg: m1, correct: false }, streak: 0 });
          say(m1);
          return;
        }
        lockItem(key);
        logMiss('treasure', t('stem.coordgrid.th_log', 'Treasure hunt') + ': ' + thMission.clues.map(function (c) { return clueText(c, thMission); }).join(' '), r.code);
        var m2 = '❌ ' + broke + extra + ' ' + (revealsAllowed ? t('stem.coordgrid.th_out_of_digs', 'Out of digs, so this map no longer earns credit. Show the treasure, or start the next mission.') : t('stem.coordgrid.th_no_reveal', 'Out of digs. Your teacher can go over this map with you.'));
        updCG({ thMission: Object.assign({}, thMission, { digs: digs, done: true }), thFb: { msg: m2, correct: false, revealed: false }, streak: 0 });
        say(m2);
      };
      var toggleMark = function (p) {
        if (!thMission || thMission.done) return;
        var has = thMission.marks.some(function (q) { return CG_CORE.same(q, p); });
        var next = has ? thMission.marks.filter(function (q) { return !CG_CORE.same(q, p); }) : thMission.marks.concat([{ x: p.x, y: p.y }]);
        updCG({ thMission: Object.assign({}, thMission, { marks: next }) });
        say(fill(has ? t('stem.coordgrid.th_unmarked', 'Mark removed at {pair}.') : t('stem.coordgrid.th_marked', 'Marked {pair} as a possible spot.'), { pair: pairText(p) }));
      };
      var thAnnounce = function (p) {
        var parts = [fill(t('stem.coordgrid.pt_cursor', 'x {x}, y {y}.'), { x: fmt(p.x), y: fmt(p.y) })];
        if (thMission) {
          thMission.lms.forEach(function (l) { if (CG_CORE.same(l.p, p)) parts.push(fill(t('stem.coordgrid.th_lm_here', 'The {lm} is here.'), { lm: LM_NAMES[l.id] })); });
          if (thMission.digs.some(function (d) { return CG_CORE.same(d, p); })) parts.push(t('stem.coordgrid.th_dug_here', 'You dug here.'));
          if (thMission.marks.some(function (d) { return CG_CORE.same(d, p); })) parts.push(t('stem.coordgrid.th_marked_here', 'You marked this spot.'));
          if (thShowT && CG_CORE.same(thMission.T, p)) parts.push(t('stem.coordgrid.th_treasure_here', 'The treasure is here.'));
        }
        return parts.join(' ');
      };
      var thHintText = function (lv) {
        if (!thMission) return '';
        if (lv === 1) return t('stem.coordgrid.th_hint_1', 'Start with a clue that names a line or a distance from a landmark. The treasure must be on a spot that fits it.');
        return fill(t('stem.coordgrid.th_hint_2', 'Clue 1 alone allows {n} spots. Mark them with Space, then cross out every spot that breaks another clue.'), { n: X.missionCandidates(thMission, 1).length });
      };
      var thHint = function () { if (!thMission || thMission.done || (thMission.hint || 0) >= 2) return; var n = (thMission.hint || 0) + 1; updCG({ thMission: Object.assign({}, thMission, { hint: n }) }); thMission = Object.assign({}, thMission, { hint: n }); say(thHintText(n)); };
      var thDescribe = function () {
        if (!thMission) return t('stem.coordgrid.th_no_mission', 'No mission yet.');
        var out = [thMission.lms.length ? thMission.lms.map(function (l) { return fill(t('stem.coordgrid.th_desc_lm', 'The {lm} is at {pair}.'), { lm: LM_NAMES[l.id], pair: pairText(l.p) }); }).join(' ') : t('stem.coordgrid.th_desc_no_lm', 'This map has no landmarks.')];
        out.push(thMission.digs.length ? fill(t('stem.coordgrid.th_desc_digs', 'You dug at {list}.'), { list: thMission.digs.map(pairText).join(', ') }) : t('stem.coordgrid.th_desc_no_digs', 'No digs yet.'));
        if (thMission.marks.length) out.push(fill(t('stem.coordgrid.th_desc_marks', 'You marked {list}.'), { list: thMission.marks.map(pairText).join(', ') }));
        if (thShowT) out.push(fill(t('stem.coordgrid.th_desc_t', 'The treasure is at {pair}.'), { pair: pairText(thMission.T) }));
        return out.join(' ');
      };
      var renderTreasure = function () {
        var m = thMission, F = thF, kids = [];
        if (m) {
          m.lms.forEach(function (l, i) {
            kids.push(h('rect', { key: 'lm' + i, x: F.sx(l.p.x) - 7, y: F.sy(l.p.y) - 7, width: 14, height: 14, rx: 3, fill: GP.poly, stroke: GP.pointStroke, strokeWidth: 1.5 }));
            kids.push(fTag(F, 'lml' + i, l.p, LM_NAMES[l.id], GP.poly, l.p.x < F.b.xmax - 3, -9));
          });
          m.marks.forEach(function (q, i) { kids.push(h('polygon', { key: 'mk' + i, points: [[0, -9], [7, 5], [-7, 5]].map(function (d) { return (F.sx(q.x) + d[0]) + ',' + (F.sy(q.y) + d[1]); }).join(' '), fill: 'none', stroke: GP.accent, strokeWidth: 2 })); });
          m.digs.forEach(function (q, i) {
            kids.push(h('g', { key: 'dg' + i }, h('line', { x1: F.sx(q.x) - 6, y1: F.sy(q.y) - 6, x2: F.sx(q.x) + 6, y2: F.sy(q.y) + 6, stroke: GP.bad, strokeWidth: 3 }), h('line', { x1: F.sx(q.x) - 6, y1: F.sy(q.y) + 6, x2: F.sx(q.x) + 6, y2: F.sy(q.y) - 6, stroke: GP.bad, strokeWidth: 3 })));
          });
          if (thShowT) {
            var sx0 = F.sx(m.T.x), sy0 = F.sy(m.T.y), star = [];
            for (var si = 0; si < 10; si++) { var rr = si % 2 ? 5 : 12, an = -Math.PI / 2 + si * Math.PI / 5; star.push((sx0 + rr * Math.cos(an)).toFixed(1) + ',' + (sy0 + rr * Math.sin(an)).toFixed(1)); }
            kids.push(h('polygon', { key: 'star', points: star.join(' '), fill: GP.good, stroke: GP.pointStroke, strokeWidth: 1.5, className: 'allo-cg-pop' }));
          }
        }
        var digsLeft = m ? Math.max(0, DIGS - m.digs.length) : DIGS;
        var svgLabel = m ? fill(t('stem.coordgrid.th_grid_label', 'Treasure map from {lo} to {hi} on both axes, with {n} landmarks.'), { lo: fmt(m.lo), hi: fmt(m.hi), n: m.lms.length }) : t('stem.coordgrid.th_grid_empty', 'Empty treasure map. Start a mission.');
        return tabPanel('treasure', [
          h('div', { key: 'lv' }, renderLevelBar({ noQ1: true })),
          h('section', { key: 'card', 'data-coordgrid-th': m ? (m.done ? (thFound ? 'found' : 'over') : 'open') : 'none', 'aria-labelledby': 'coordgrid-th-title', style: Object.assign({}, cardStyle, { borderWidth: 2 }) },
            h('h4', { id: 'coordgrid-th-title', style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: GP.accent } }, t('stem.coordgrid.th_title', '🗝️ Treasure hunt')),
            h('p', { id: 'coordgrid-th-intro', style: { margin: '0 0 6px', fontSize: 14 } }, t('stem.coordgrid.th_intro', 'Find the buried treasure. Every clue is true, and only one spot on the map fits them all. You have 3 digs.')),
            !m && h('button', { type: 'button', onClick: function () { startMission(); focusGrid('[data-coordgrid-app="th"]', '[data-coordgrid-th]'); }, style: primaryBtn }, t('stem.coordgrid.th_start', 'Start a mission')),
            m && h('div', null,
              h('p', { id: 'coordgrid-th-clues-h', style: { margin: '4px 0', fontWeight: 800, fontSize: 13 } }, t('stem.coordgrid.th_clues', 'Clues')),
              h('ol', { 'aria-labelledby': 'coordgrid-th-clues-h', 'data-coordgrid-clues': m.clues.length, style: { margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6 } }, m.clues.map(function (c, i) { return h('li', { key: i }, clueText(c, m)); })),
              h('p', { style: { margin: '6px 0', fontSize: 13 } }, m.lms.length ? fill(t('stem.coordgrid.th_landmarks', 'Landmarks: {list}.'), { list: m.lms.map(function (l) { return fill(t('stem.coordgrid.th_lm_at', 'the {lm} at {pair}'), { lm: LM_NAMES[l.id], pair: pairText(l.p) }); }).join('; ') }) : t('stem.coordgrid.th_desc_no_lm', 'This map has no landmarks.'))),
            gridApp({ id: 'th', F: F, cur: thCur, setCur: function (p) { updCG({ thCur: p }); }, announce: thAnnounce, onEnter: dig, onSpace: toggleMark, onPick: m && !m.done ? dig : null,
              label: t('stem.coordgrid.th_app_label', 'Treasure map cursor. Arrow keys move one unit and say what is there. Enter digs; Space marks a possible spot.'), describedBy: 'coordgrid-th-intro', svgLabel: svgLabel, children: kids }),
            m && !m.done && h('div', { style: { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 8 } },
              numBox(t('stem.coordgrid.x_coordinate', 'X coordinate'), thFb.ex, function (v) { updCG({ thFb: Object.assign({}, thFb, { ex: v }) }); }, { key: 'tx' }),
              numBox(t('stem.coordgrid.y_coordinate', 'Y coordinate'), thFb.ey, function (v) { updCG({ thFb: Object.assign({}, thFb, { ey: v }) }); }, { key: 'ty' }),
              h('button', { type: 'button', onClick: function () { var x = readInt(thFb.ex), y = readInt(thFb.ey); if (x === null || y === null || !F.has({ x: x, y: y })) { thMsg(t('stem.coordgrid.pt_entry_bad', 'Enter whole numbers that fit on this grid.')); return; } updCG({ thCur: { x: x, y: y } }); dig({ x: x, y: y }); }, style: primaryBtn }, t('stem.coordgrid.th_dig', 'Dig here')),
              h('button', { type: 'button', onClick: function () { var x = readInt(thFb.ex), y = readInt(thFb.ey); if (x === null || y === null || !F.has({ x: x, y: y })) { thMsg(t('stem.coordgrid.pt_entry_bad', 'Enter whole numbers that fit on this grid.')); return; } toggleMark({ x: x, y: y }); }, style: btnStyle }, t('stem.coordgrid.th_mark', 'Mark or unmark'))),
            m && h('p', { style: { margin: '6px 0 0', fontSize: 13, fontWeight: 700 } }, digsLeft === 1 ? t('stem.coordgrid.th_left_one', 'One dig left.') : fill(t('stem.coordgrid.th_left_n', '{n} digs left.'), { n: digsLeft })),
            m && hintBox(m, thHintText, thHint),
            feedbackP(thFb, 'coordgrid-th-feedback'),
            m && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 } },
              h('button', { type: 'button', 'aria-expanded': thDescOpen, 'aria-controls': 'coordgrid-th-describe', onClick: function () { var nx = !thDescOpen; updCG({ thDescOpen: nx }); if (nx) say(thDescribe()); }, style: btnOn(thDescOpen) }, t('stem.coordgrid.th_describe', 'Describe the map')),
              m.done && !thFound && revealsAllowed && !thFb.revealed && h('button', { type: 'button', 'data-coordgrid-reveal': 'true', onClick: showTreasure, style: Object.assign({}, btnStyle, { borderStyle: 'dashed' }) }, t('stem.coordgrid.th_show', 'Show where the treasure was')),
              m.done && h('button', { type: 'button', onClick: function () { startMission(); focusGrid('[data-coordgrid-app="th"]', '[data-coordgrid-th]'); }, style: btnStyle }, t('stem.coordgrid.th_next', 'Next mission'))),
            m && thDescOpen && h('p', { id: 'coordgrid-th-describe', 'data-coordgrid-th-describe': 'true', style: { margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 } }, thDescribe()))
        ]);
      };

      // ══════════ MAIN RENDER ══════════
      // Tabs in the band's order: its core activities first, then extra practice,
      // then the map games as optional "Play". A teacher can hide the Play tab.
      var hidePlay = cgTeacher.hidePlay === true;
      var TAB_DEFS = {
        explore: { icon: '\uD83D\uDCCD', label: t('stem.coordgrid.tab_plot_measure', 'Plot & measure') },
        transform: { icon: '\uD83D\uDD04', label: t('stem.coordgrid.tab_transform', 'Transformations') },
        patterns: { icon: '\uD83D\uDCCA', label: t('stem.coordgrid.tab_patterns', 'Patterns & tables') },
        treasure: { icon: '\uD83D\uDDDD\uFE0F', label: t('stem.coordgrid.tab_treasure', 'Treasure hunt') },
        quadrants: { icon: '\uD83D\uDDFA', label: t('stem.coordgrid.quadrant_tour', 'Quadrant Tour') },
        quadHunt: { icon: '\uD83C\uDFAF', label: t('stem.coordgrid.quadrant_hunt', 'Quadrant Hunt') },
        maps: { icon: '\uD83C\uDF10', label: t('stem.coordgrid.tab_play_maps', 'Play: Real-World Maps') }
      };
      var CORE_TABS = CG_CORE.CORE_TABS[cgLevel] || CG_CORE.CORE_TABS.g6;
      var coordinateTabs = CG_CORE.tabOrder(cgLevel, hidePlay).map(function (id) { return { id: id, icon: TAB_DEFS[id].icon, label: TAB_DEFS[id].label, core: CORE_TABS.indexOf(id) >= 0, play: id === 'maps' }; });
      if (!coordinateTabs.some(function (tb) { return tb.id === cgTab; })) cgTab = coordinateTabs[0].id;
      var TABS_NOTE = {
        g5: t('stem.coordgrid.tabs_note_g5', 'Grade 5 core: the first three tabs (solid border). Dashed tabs are extra practice; Play is a game.'),
        g6: t('stem.coordgrid.tabs_note_g6', 'Grade 6 core: the first four tabs (solid border). Dashed tabs are extra practice; Play is a game.'),
        g8: t('stem.coordgrid.tabs_note_g8', 'Grade 8 core: the first three tabs (solid border). Dashed tabs are extra practice; Play is a game.')
      };

      // ── "Start here": a short ordered path for the band. Each tick comes from a
      // progress counter the tool already keeps; Start opens the activity. ──
      var COUNTS_ALL = Object.assign({ plotsSolved: plotsSolved, slopesSolved: slopesSolved, distanceSolved: distanceSolved, namesSolved: namesSolved, reflectsSolved: reflectsSolved, translatesSolved: translatesSolved, polygonsSolved: polygonsSolved }, newCounts);
      var PATH_TEXT = {
        plot5: t('stem.coordgrid.path_plot5', 'Plot points in quadrant I: across first, then up.'),
        name5: t('stem.coordgrid.path_name5', 'Name the coordinates of marked points.'),
        patterns: t('stem.coordgrid.path_patterns', 'Turn two number patterns into ordered pairs and graph them.'),
        treasure5: t('stem.coordgrid.path_treasure5', 'Find a buried treasure from coordinate clues.'),
        plot6: t('stem.coordgrid.path_plot6', 'Plot points in all four quadrants, with negative coordinates.'),
        reflect: t('stem.coordgrid.path_reflect', 'Predict a point\'s reflection across an axis.'),
        distance6: t('stem.coordgrid.path_distance6', 'Find distances along a grid line, across an axis too.'),
        polygon: t('stem.coordgrid.path_polygon', 'Find the perimeter and area of polygons from their vertices.'),
        table: t('stem.coordgrid.path_table', 'Graph a table of values and write its rule.'),
        sequence: t('stem.coordgrid.path_sequence', 'Map one triangle onto another with a sequence of moves.'),
        rotate: t('stem.coordgrid.path_rotate', 'Predict where a rotation sends a point.'),
        dilate: t('stem.coordgrid.path_dilate', 'Predict a dilation from the origin.'),
        judge: t('stem.coordgrid.path_judge', 'Check Kai\'s transformation sequence and find the wrong step.'),
        slope: t('stem.coordgrid.path_slope', 'Find the slope between two points: rise over run.'),
        pythag: t('stem.coordgrid.path_pythag', 'Find a slanted distance with the Pythagorean theorem.')
      };
      var CREDIT_KINDS = CG_CORE.creditedKinds(creditedItems);
      var learningPath = CG_CORE.pathFor(cgLevel, { noDilate: noDilate }).map(function (s) {
        var n = s.credit ? CREDIT_KINDS[s.credit] : (COUNTS_ALL[s.counter] || 0);
        return Object.assign({}, s, { n: n, done: n >= s.goal, text: PATH_TEXT[s.id] });
      });
      var pathNext = learningPath.filter(function (s) { return !s.done; })[0] || null;
      var pathAll = _cg.pathAll === true;
      var goPath = function (s) {
        var open = s.tab === 'explore' ? !!(gridChallenge && gridChallenge.type === s.task && !taskDone)
          : s.tab === 'transform' ? !!(tfTask && tfTask.type === s.task && !tfTask.done)
          : s.tab === 'patterns' ? !!(ptTask && ptTask.type === s.task && !ptTask.done)
          : !!(thMission && !thMission.done);
        updCG({ cgTab: s.tab });
        // The task's grid comes into view with focus, so the prompt, the grid and
        // Check are on one screen (the Start button itself scrolls away).
        var appSel = s.tab === 'explore' ? '#coordgrid-explore-app' : s.tab === 'transform' ? TF_FOCUS[0] : s.tab === 'patterns' ? PT_FOCUS[0] : '[data-coordgrid-app="th"]';
        var boxSel = s.tab === 'explore' ? '#coordgrid-task-layout' : s.tab === 'transform' ? TF_FOCUS[1] : s.tab === 'patterns' ? PT_FOCUS[1] : '[data-coordgrid-th]';
        if (open) { say(fill(t('stem.coordgrid.path_resume', 'Back to your open task: {task}'), { task: s.text })); focusGrid(appSel, boxSel); return; }
        if (s.tab === 'explore') startTask(s.task);
        else if (s.tab === 'transform') startTf(s.task);
        else if (s.tab === 'patterns') startPt(s.task);
        else startMission();
        focusGrid(appSel, boxSel);
      };
      // The quick game: the Treasure hunt tab, a fresh map (or the open one), focus on
      // the map. Digs pay exactly as on the tab.
      var quickTreasure = function () {
        var openMap = !!(thMission && !thMission.done);
        updCG({ cgTab: 'treasure' });
        if (openMap) say(t('stem.coordgrid.quick_treasure_back', 'Back to your open treasure map.'));
        else startMission();
        focusGrid('[data-coordgrid-app="th"]', '[data-coordgrid-th]');
      };
      // One line by default: the next step and its Start; "All steps" opens the list.
      var renderPath = function () {
        var doneN = learningPath.filter(function (s) { return s.done; }).length;
        return h('section', { 'data-coordgrid-path': cgLevel, 'data-coordgrid-path-open': pathAll ? 'true' : 'false', 'aria-labelledby': 'coordgrid-path-h', style: Object.assign({}, cardStyle, { borderWidth: 2, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }) },
          h('h4', { id: 'coordgrid-path-h', style: { margin: 0, fontSize: 15, fontWeight: 800, color: GP.accent } }, fill(t('stem.coordgrid.path_title', 'Start here: {level}'), { level: LEVEL_NAMES[cgLevel] })),
          h('span', { style: { fontSize: 13, fontWeight: 700, color: GP.muted } }, fill(t('stem.coordgrid.path_progress', '{done} of {n} done'), { done: doneN, n: learningPath.length })),
          h('ol', { id: 'coordgrid-path-list', hidden: !pathAll && !pathNext ? true : undefined, style: { margin: 0, padding: 0, listStyle: 'none', display: !pathAll && !pathNext ? 'none' : 'flex', flexDirection: 'column', gap: 6, flex: pathAll ? '1 1 100%' : '1 1 20rem', minWidth: 0 } },
            learningPath.map(function (s, i) {
              var isNext = !!pathNext && pathNext.id === s.id;
              var status = s.done ? fill(t('stem.coordgrid.path_done', 'Done: {n} solved.'), { n: s.n }) : fill(t('stem.coordgrid.path_count', '{n} of {goal} solved.'), { n: s.n, goal: s.goal });
              return h('li', { key: s.id, 'data-coordgrid-path-step': s.id, 'data-done': s.done ? 'true' : 'false', 'aria-current': isNext ? 'step' : null, hidden: !pathAll && !isNext ? true : undefined,
                style: { display: !pathAll && !isNext ? 'none' : 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 10, border: (isNext ? 2 : 1) + 'px solid ' + (isNext ? GP.accent : GP.cardBorder) } },
                h('span', { 'aria-hidden': 'true', style: { minWidth: 28, height: 28, borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, background: s.done && !isContrast ? GP.good : GP.card, color: s.done ? (isContrast ? GP.good : GP.bg) : GP.ink, border: '2px solid ' + (s.done ? GP.good : GP.cardBorder) } }, s.done ? '✓' : String(i + 1)),
                h('span', { style: { flex: '1 1 12rem', fontSize: 14 } },
                  h('span', { style: { fontWeight: 700 } }, s.text), ' ',
                  h('span', { style: { fontSize: 12, color: GP.muted } }, (isNext ? t('stem.coordgrid.path_next_up', 'Next up.') + ' ' : '') + status)),
                h('button', { type: 'button', 'aria-label': fill(s.done ? t('stem.coordgrid.path_more_label', 'Practise more: {step}') : t('stem.coordgrid.path_go_label', 'Start: {step}'), { step: s.text }), onClick: function () { goPath(s); }, style: isNext ? primaryBtn : btnStyle },
                  s.done ? t('stem.coordgrid.path_more', 'Practise more') : t('stem.coordgrid.path_go', 'Start')));
            })),
          !pathNext && h('p', { style: { margin: 0, fontSize: 13, fontWeight: 700, color: GP.good, flex: '1 1 12rem' } }, t('stem.coordgrid.path_all_done', 'Every step is done. Try a stretch task, or play a map game.')),
          h('button', { type: 'button', 'data-coordgrid-path-all': 'true', 'aria-expanded': pathAll, 'aria-controls': 'coordgrid-path-list', onClick: function () { updCG({ pathAll: !pathAll }); }, style: Object.assign({}, btnStyle, { marginLeft: 'auto' }) }, t('stem.coordgrid.path_all', 'All steps')));
      };
      var activeCoordinateTab = coordinateTabs.filter(function(tab) { return tab.id === cgTab; })[0] || coordinateTabs[0];
      var coordTabLabel = activeCoordinateTab.label;
      var moveCoordinateTab = function(event, index) {
        var next = index;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % coordinateTabs.length;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + coordinateTabs.length) % coordinateTabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = coordinateTabs.length - 1;
        else return;
        event.preventDefault();
        var nextId = coordinateTabs[next].id;
        sfxClick();
        updCG({ cgTab: nextId });
        requestAnimationFrame(function() {
          var nextTab = document.getElementById('coordinate-section-tab-' + nextId);
          if (nextTab) nextTab.focus();
        });
      };
      var coordSolved = plotsSolved + slopesSolved + distanceSolved + namesSolved + reflectsSolved + translatesSolved + polygonsSolved +
        NEW_COUNTERS.reduce(function (s, k) { return s + newCounts[k]; }, 0);

      // ═══ EXPLORE TAB ═══
      // Shared accessible-graph core (pasted above) for the function plotter:
      // describe, hear and step through the selected curve.
      var GA = window.StemLab && window.StemLab._graphAccess;
      var gaFuncs = funcs.filter(function (f) { return f && f.visible && typeof f.expr === 'string' && compileFunc(f.expr); });
      var gaSel = gaFuncs.filter(function (f) { return f.id === _cg.gaFn; })[0] || gaFuncs[0] || null;
      var gaInfo = null;
      if (GA && funcsOn && gaSel && cgTab === 'explore') {
        var gaKey = JSON.stringify([gaSel.expr, viewRange.min, viewRange.max]);
        var cache = window._coordGridGaCache;
        if (cache && cache.key === gaKey) gaInfo = cache.value;
        else {
          try {
            var gaFn = compileFunc(gaSel.expr);
            var gaEval = function (x) { try { var v = gaFn(x); return typeof v === 'number' ? v : NaN; } catch (e) { return NaN; } };
            var gaSamples = GA.sample(gaEval, viewRange.min, viewRange.max, 201);
            var gaZeros = GA.zerosOf ? GA.zerosOf(gaEval, viewRange.min, viewRange.max).xs : undefined;
            var gaDesc = GA.describeGraph(gaSamples, { t: t, name: 'y = ' + gaSel.expr, evaluate: gaEval, zeros: gaZeros, ymin: viewRange.min, ymax: viewRange.max });
            gaInfo = { evaluate: gaEval, samples: gaSamples, zeros: gaZeros, desc: gaDesc, points: GA.explorePoints(gaSamples, gaDesc, t) };
            window._coordGridGaCache = { key: gaKey, value: gaInfo };
          } catch (e) { gaInfo = null; }
        }
      }
      var gaIdx = gaInfo && typeof _cg.gaIdx === 'number' && _cg.gaIdx >= 0 && _cg.gaIdx < gaInfo.points.length ? _cg.gaIdx : -1;

      // Open another STEM tool (the host loads it on request).
      var openTool = function (id, name) {
        try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') Promise.resolve(window.__alloEnsureStemPluginLoaded(id)).catch(function () {}); } catch (e) {}
        say(fill(t('stem.coordgrid.opening_tool', 'Opening {tool}.'), { tool: name }));
        if (typeof setStemLabTool === 'function') setStemLabTool(id);
      };

      // Worked examples (a different item from the one on the grid). They fade:
      // all steps at first, then fewer as the student solves more of that task.
      var WORKED = {
        plot: [t('stem.coordgrid.we_plot_0', 'Example: plot (−3, 4).'), t('stem.coordgrid.we_plot_1', 'Start at the origin (0, 0).'), t('stem.coordgrid.we_plot_2', 'x is −3: move 3 units left.'), t('stem.coordgrid.we_plot_3', 'y is 4: move 4 units up, then mark the point.')],
        name: [t('stem.coordgrid.we_name_0', 'Example: a point sits 5 right of the origin and 2 below it.'), t('stem.coordgrid.we_name_1', 'Count across first: 5 to the right, so x = 5.'), t('stem.coordgrid.we_name_2', 'Then count up or down: 2 down, so y = −2.'), t('stem.coordgrid.we_name_3', 'Write x first: (5, −2).')],
        reflect: [t('stem.coordgrid.we_reflect_0', 'Example: reflect P(4, −3) across the y-axis.'), t('stem.coordgrid.we_reflect_1', 'The mirror is the y-axis, so the up-down position (y) stays −3.'), t('stem.coordgrid.we_reflect_2', 'P is 4 units right of the mirror; its image is 4 units left, so x = −4.'), t('stem.coordgrid.we_reflect_3', 'The image is P′(−4, −3).')],
        translate: [t('stem.coordgrid.we_translate_0', 'Example: move P(−2, 1) 5 right, then 3 down.'), t('stem.coordgrid.we_translate_1', 'Right 5 adds 5 to x: −2 + 5 = 3.'), t('stem.coordgrid.we_translate_2', 'Down 3 subtracts 3 from y: 1 − 3 = −2.'), t('stem.coordgrid.we_translate_3', 'The image is P′(3, −2).')],
        distance: [t('stem.coordgrid.we_distance_0', 'Example: the distance from (−3, 2) to (4, 2).'), t('stem.coordgrid.we_distance_1', 'Both points have y = 2, so the segment is horizontal.'), t('stem.coordgrid.we_distance_2', '−3 is 3 units left of the y-axis and 4 is 4 units right of it.'), t('stem.coordgrid.we_distance_3', 'They are on opposite sides, so add: 3 + 4 = 7 units.')],
        distance8: [t('stem.coordgrid.we_pythag_0', 'Example: the distance from (1, 1) to (4, 5).'), t('stem.coordgrid.we_pythag_1', 'The legs are 4 − 1 = 3 across and 5 − 1 = 4 up.'), t('stem.coordgrid.we_pythag_2', 'Square and add: 3² + 4² = 9 + 16 = 25.'), t('stem.coordgrid.we_pythag_3', 'Take the square root: the distance is 5.')],
        polygon: [t('stem.coordgrid.we_polygon_0', 'Example: a rectangle with vertices (−2, −1), (3, −1), (3, 2) and (−2, 2).'), t('stem.coordgrid.we_polygon_1', 'Width: from x = −2 to x = 3 is 3 − (−2) = 5 units.'), t('stem.coordgrid.we_polygon_2', 'Height: from y = −1 to y = 2 is 2 − (−1) = 3 units.'), t('stem.coordgrid.we_polygon_3', 'Area = 5 × 3 = 15 square units. Perimeter = 5 + 3 + 5 + 3 = 16 units.')],
        slope: [t('stem.coordgrid.we_slope_0', 'Example: the slope from (1, 2) to (4, 8).'), t('stem.coordgrid.we_slope_1', 'Rise = 8 − 2 = 6.'), t('stem.coordgrid.we_slope_2', 'Run = 4 − 1 = 3.'), t('stem.coordgrid.we_slope_3', 'Slope = rise ÷ run = 6 ÷ 3 = 2.')]
      };
      var renderWorked = function (type) {
        var key = type === 'distance' && gridChallenge && gridChallenge.kind === 'pythag' ? 'distance8' : type;
        var steps = WORKED[key];
        if (!steps) return null;
        var solved = COUNT_NOW[COUNTER[type]] || 0;
        var show = solved >= 4 ? 1 : solved >= 2 ? 2 : solved >= 1 ? 3 : steps.length;
        return h('details', { 'data-coordgrid-worked': type, style: { marginTop: 8 } },
          h('summary', { style: { cursor: 'pointer', fontWeight: 700, fontSize: 13, minHeight: 32 } }, t('stem.coordgrid.worked_example', 'See a worked example')),
          h('ol', { style: { margin: '6px 0 0 18px', fontSize: 13, lineHeight: 1.5 } },
            steps.map(function (s, i) {
              return h('li', { key: i }, i < show ? s : t('stem.coordgrid.worked_your_turn', 'Your turn: work out this step yourself.'));
            }))
        );
      };

      var fb = gridFeedback || {};
      var setFb = function (patch) { setGridFeedback(function (prev) { return Object.assign({}, prev, patch, { correct: false, msg: null, walk: null }); }); };
      var taskCard = function () {
        if (!gridChallenge) return null;
        var tp = taskType;
        var locked = gridItemLocked;
        var inputsOff = locked || taskSolved;
        // The same hint ladder, feedback line and reveal button as the other tabs.
        var hints = hintBox({ hint: taskHint, done: taskDone }, function (lv) { return hintText(gridChallenge, lv); }, useHint);
        var feedbackEl = feedbackP(fb, 'coordgrid-task-feedback');
        var lockEl = locked && h('p', { 'data-coordgrid-locked': 'true', className: 'text-sm font-bold mt-1', style: { color: GP.ink } }, lockedText);
        var showBtn = revealBtn(locked && revealsAllowed && !answerShown, showGridAnswer);
        var nextBtn = taskDone && h('button', { type: 'button', onClick: function () { startTask(tp, { focus: true }); }, style: Object.assign({}, btnStyle, { marginTop: 8 }) }, fill(t('stem.coordgrid.next_task', 'Next: {task}'), { task: TASK_NAMES[tp] }));
        var tryNote = !taskDone && taskTries === 1 && h('p', { style: { margin: '4px 0 0', fontSize: 12, color: GP.muted } }, secondTryNote);
        var checkBtn = function (cls) { return h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_2', 'Check'), onClick: firstClick(checkGrid), disabled: inputsOff, style: { minHeight: 44 }, className: cls }, t('stem.coordgrid.check_3', '✔ Check')); };
        var head = h('p', { className: 'text-sm font-bold mb-2', style: { color: GP.ink }, id: 'coordgrid-task-prompt' }, promptFor(gridChallenge));
        var body = null;
        if (tp === 'plot') {
          body = h('div', { className: 'flex gap-2 items-center flex-wrap' },
            h('span', { className: 'text-xs', style: { color: GP.muted } }, fill(t('stem.coordgrid.points_on_grid', 'Points on the grid: {n}'), { n: gridPoints.length })),
            h('span', { className: 'text-xs', style: { color: GP.muted } }, t('stem.coordgrid.plot_how', 'Click the grid, or move the grid cursor with the arrow keys and press Enter.')),
            h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_6', 'Check'), onClick: firstClick(checkGrid), disabled: inputsOff, style: { minHeight: 44 }, className: 'ml-auto px-4 py-1.5 bg-cyan-700 text-white font-bold rounded-lg text-sm hover:bg-cyan-800 disabled:opacity-50' }, t('stem.coordgrid.check_7', '✔ Check')));
        } else if (pointTask) {
          var onKey = function (e) { if (e.key === 'Enter' && !e.repeat) checkGrid(); };
          body = h('div', { className: 'flex gap-2 items-end flex-wrap' },
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700, color: GP.ink } }, tp === 'name' ? t('stem.coordgrid.your_x', 'x-coordinate') : t('stem.coordgrid.image_x', 'x of P′'),
              h('input', { type: 'text', inputMode: 'numeric', 'aria-describedby': 'coordgrid-task-prompt', 'aria-label': t('stem.coordgrid.your_x_label', 'Your x-coordinate'), value: fb.ansX == null ? '' : String(fb.ansX), disabled: inputsOff, onChange: function (e) { setFb({ ansX: e.target.value }); }, onKeyDown: onKey, style: inputStyle })),
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700, color: GP.ink } }, tp === 'name' ? t('stem.coordgrid.your_y', 'y-coordinate') : t('stem.coordgrid.image_y', 'y of P′'),
              h('input', { type: 'text', inputMode: 'numeric', 'aria-describedby': 'coordgrid-task-prompt', 'aria-label': t('stem.coordgrid.your_y_label', 'Your y-coordinate'), value: fb.ansY == null ? '' : String(fb.ansY), disabled: inputsOff, onChange: function (e) { setFb({ ansY: e.target.value }); }, onKeyDown: onKey, style: inputStyle })),
            checkBtn('ml-auto px-4 py-1.5 bg-cyan-700 text-white font-bold rounded-lg text-sm hover:bg-cyan-800 disabled:opacity-50'),
            tp !== 'name' && h('p', { style: { flexBasis: '100%', margin: 0, fontSize: 12, color: GP.muted } }, t('stem.coordgrid.predict_how', 'Predict first: type P′ or click where you think it lands. The image appears after you check.')),
            tp === 'name' && h('p', { style: { flexBasis: '100%', margin: 0, fontSize: 12, color: GP.muted } }, t('stem.coordgrid.name_how', 'Keyboard: focus the grid, press Home to go to the origin, then count arrow presses to reach the marked point.')));
        } else if (tp === 'polygon') {
          body = h('div', { className: 'flex gap-2 items-end flex-wrap' },
            h('label', { style: { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 700, color: GP.ink } }, gridChallenge.ask === 'area' ? t('stem.coordgrid.area_units', 'Area (square units)') : t('stem.coordgrid.perimeter_units', 'Perimeter (units)'),
              h('input', { type: 'text', inputMode: 'decimal', 'aria-describedby': 'coordgrid-task-prompt', 'aria-label': t('stem.coordgrid.your_answer', 'Your answer'), value: fb.ansNum == null ? '' : String(fb.ansNum), disabled: inputsOff, onChange: function (e) { setFb({ ansNum: e.target.value }); }, onKeyDown: function (e) { if (e.key === 'Enter' && !e.repeat) checkGrid(); }, style: inputStyle })),
            checkBtn('ml-auto px-4 py-1.5 bg-cyan-700 text-white font-bold rounded-lg text-sm hover:bg-cyan-800 disabled:opacity-50'));
        } else if (tp === 'slope') {
          var riseRunFilled = taskHint >= 2;
          body = h('div', null,
            h('p', { className: 'text-[0.6875rem] mb-2 italic', style: { color: GP.muted } }, t('stem.coordgrid.fill_in_rise_y_run_x_then_slope_m_rise', 'Fill in rise (Δy), run (Δx), then slope (m = rise/run)')),
            h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
              h('div', { className: 'flex flex-col gap-1' },
                h('label', { htmlFor: 'cg-rise', className: 'text-[0.6875rem] font-bold uppercase', style: { color: GP.rise } }, t('stem.coordgrid.rise_y', 'Rise (Δy)')),
                h('input', { id: 'cg-rise', type: 'text', inputMode: 'numeric', placeholder: '?', 'aria-label': t('stem.coordgrid.rise_delta_y_vertical_change', 'Rise (delta y) — vertical change'), value: fb.riseAnswer == null ? '' : String(fb.riseAnswer), onChange: function(e) { setFb({ riseAnswer: e.target.value }); }, disabled: inputsOff || riseRunFilled, style: { minHeight: 44 }, className: 'px-2 py-1.5 border-2 border-red-600 rounded-lg text-sm font-bold text-center focus:border-red-400 ' + (riseRunFilled ? ' bg-red-50 text-red-700' : '') })
              ),
              h('div', { className: 'flex flex-col gap-1' },
                h('label', { htmlFor: 'cg-run', className: 'text-[0.6875rem] font-bold uppercase', style: { color: GP.run } }, t('stem.coordgrid.run_x', 'Run (Δx)')),
                h('input', { id: 'cg-run', type: 'text', inputMode: 'numeric', placeholder: '?', 'aria-label': t('stem.coordgrid.run_delta_x_horizontal_change', 'Run (delta x) — horizontal change'), value: fb.runAnswer == null ? '' : String(fb.runAnswer), onChange: function(e) { setFb({ runAnswer: e.target.value }); }, disabled: inputsOff || riseRunFilled, style: { minHeight: 44 }, className: 'px-2 py-1.5 border-2 border-blue-600 rounded-lg text-sm font-bold text-center focus:border-blue-400 ' + (riseRunFilled ? ' bg-blue-50 text-blue-700' : '') })
              ),
              h('div', { className: 'flex flex-col gap-1' },
                h('label', { htmlFor: 'cg-slope', className: 'text-[0.6875rem] font-bold uppercase', style: { color: GP.ink } }, t('stem.coordgrid.slope_m', 'Slope (m)')),
                h('input', { id: 'cg-slope', type: 'text', placeholder: t('stem.coordgrid.e_g_2_3', 'e.g. 2/3'), 'aria-label': t('stem.coordgrid.slope_as_a_fraction_example_2_3', 'Slope as a fraction (example: 2/3)'), value: fb.slopeAnswer == null ? '' : String(fb.slopeAnswer), onChange: function(e) { setFb({ slopeAnswer: e.target.value }); }, onKeyDown: function(e) { if (e.key === 'Enter' && !e.repeat) checkGrid(); }, disabled: inputsOff, style: { minHeight: 44 }, className: 'px-2 py-1.5 border-2 border-amber-600 rounded-lg text-sm font-bold text-center focus:border-amber-500 ' })
              )
            ),
            h('div', { className: 'flex gap-2 items-center' },
              checkBtn('ml-auto px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800 disabled:opacity-50')));
        } else if (tp === 'distance') {
          body = h('div', null,
            gridChallenge.kind === 'pythag' && h('p', { className: 'text-[0.6875rem] mb-2 italic', style: { color: GP.muted } }, t('stem.coordgrid.d_x_x_y_y_round_to_1_decimal_place', '💡 d = √((x₂−x₁)² + (y₂−y₁)²)  — Round to 1 decimal place')),
            h('div', { className: 'flex gap-2 items-center' },
              h('input', { 'aria-label': t('stem.coordgrid.distance_answer_label', 'Distance answer'),
                type: 'text', inputMode: 'decimal', placeholder: t('stem.coordgrid.distance', 'Distance = ?'),
                value: fb.distanceAnswer == null ? '' : String(fb.distanceAnswer),
                onChange: function(e) { setFb({ distanceAnswer: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter' && !e.repeat) checkGrid(); },
                disabled: inputsOff, style: { minHeight: 44 },
                className: 'flex-1 px-3 py-2 border border-green-600 rounded-lg text-sm font-mono'
              }),
              h('button', { type: 'button', 'aria-label': t('stem.coordgrid.check_4', 'Check'), onClick: firstClick(checkGrid), disabled: inputsOff, style: { minHeight: 44 }, className: 'px-4 py-2 bg-green-700 text-white font-bold rounded-lg text-sm hover:bg-green-800 disabled:opacity-50' }, t('stem.coordgrid.check_5', '✔ Check'))),
            taskDone && gridChallenge.kind === 'pythag' && h('p', { className: 'mt-2 text-xs', style: { color: GP.muted } }, fill(t('stem.coordgrid.midpoint_note', 'Bonus: the midpoint of this segment is {pair}.'), { pair: pairText(calcMidpoint(gridChallenge.p1, gridChallenge.p2)) })));
        }
        return h('section', { 'data-coordgrid-task': tp, 'aria-labelledby': 'coordgrid-task-title', style: Object.assign({}, cardStyle, { borderWidth: 2 }) },
          h('h4', { id: 'coordgrid-task-title', style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: GP.accent } }, '🎯 ' + TASK_NAMES[tp]),
          head, body, tryNote, hints, feedbackEl, lockEl,
          h('div', { className: 'flex gap-2 items-center flex-wrap' }, showBtn, nextBtn), renderWorked(tp));
      };

      var renderTaskPicker = function () {
        var mine = CG_CORE.ALL_TASKS.filter(function (k) { return CG_CORE.inLevel(cgLevel, k); });
        var stretch = stretchAllowed ? CG_CORE.ALL_TASKS.filter(function (k) { return !CG_CORE.inLevel(cgLevel, k); }) : [];
        // The three original buttons keep their names (tests and saved habits).
        var LABEL = {
          plot: t('stem.coordgrid.plot_a_point', 'Plot a Point'), name: t('stem.coordgrid.btn_name_point', 'Name the Point'), reflect: t('stem.coordgrid.btn_reflect', 'Reflect a Point'),
          translate: t('stem.coordgrid.btn_translate', 'Translate a Point'), distance: t('stem.coordgrid.find_distance', 'Find Distance'), polygon: t('stem.coordgrid.btn_polygon', 'Polygon Perimeter or Area'),
          slope: t('stem.coordgrid.find_slope', 'Find Slope')
        };
        var btn = function (k) {
          return h('button', { key: 'task-' + k, type: 'button', 'aria-label': LABEL[k], 'aria-pressed': taskType === k, onClick: function () { startTask(k, { focus: true }); }, style: Object.assign({}, btnOn(taskType === k), { flex: '1 1 9rem' }) }, LABEL[k]);
        };
        // On its own themed card: the explore panel behind it is always light.
        return h('div', { className: 'space-y-2', role: 'group', 'aria-labelledby': 'coordgrid-tasks-h', style: cardStyle },
          h('p', { id: 'coordgrid-tasks-h', className: 'text-[0.6875rem] font-bold uppercase tracking-wider', style: { color: GP.muted } }, t('stem.coordgrid.challenges', '🎯 Challenges')),
          h('div', { className: 'flex gap-2 flex-wrap' }, mine.map(btn)),
          stretch.length > 0 && h('p', { className: 'text-[0.6875rem] font-bold', style: { color: GP.muted } }, t('stem.coordgrid.stretch_tasks', 'Stretch: beyond this level')),
          stretch.length > 0 && h('div', { className: 'flex gap-2 flex-wrap' }, stretch.map(btn))
        );
      };

      var renderLevelBar = function (opts) {
        var gridToggle = !(opts && opts.noQ1);
        return h('div', { role: 'group', 'aria-labelledby': 'coordgrid-level-h', style: Object.assign({}, cardStyle, { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }) },
          h('span', { id: 'coordgrid-level-h', style: { fontWeight: 800, fontSize: 13 } }, t('stem.coordgrid.level_label', 'Level:')),
          CG_CORE.LEVELS.map(function (l) {
            return h('button', { key: l, type: 'button', 'aria-pressed': cgLevel === l, disabled: !!teacherLevel && l !== cgLevel,
              onClick: function () { if (teacherLevel) return; updCG({ cgLevel: l, gridChallenge: null, gridFeedback: null, tfTask: null, tfFb: null, tfSteps: [], ptTask: null, ptFb: null, thMission: null, thFb: null }); say(fill(t('stem.coordgrid.level_set', 'Level set to {level}.'), { level: LEVEL_NAMES[l] })); },
              style: Object.assign({}, btnOn(cgLevel === l), { opacity: teacherLevel && l !== cgLevel ? 0.55 : 1 }) }, LEVEL_NAMES[l]);
          }),
          teacherLevel && h('span', { style: { fontSize: 12, color: GP.muted } }, t('stem.coordgrid.level_locked', 'Your teacher set this level.')),
          gridToggle && h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginLeft: 'auto', minHeight: 44 } },
            h('input', { type: 'checkbox', checked: q1View, disabled: !!gridChallenge, style: { width: 20, height: 20 }, onChange: function () { updCG({ q1View: !q1View }); say(!q1View ? t('stem.coordgrid.q1_on', 'Showing quadrant I only, from 0 to 10.') : t('stem.coordgrid.q1_off', 'Showing all four quadrants.')); } }),
            t('stem.coordgrid.q1_view', 'Quadrant I view')));
      };

      var renderDescribe = function () {
        if (!descOpen) return null;
        var rows = gridPoints.map(function (p, i) { return h('tr', { key: i }, h('td', { style: { padding: '2px 8px' } }, i + 1), h('td', { style: { padding: '2px 8px', fontFamily: 'monospace' } }, fmt(p.x)), h('td', { style: { padding: '2px 8px', fontFamily: 'monospace' } }, fmt(p.y)), h('td', { style: { padding: '2px 8px' } }, quadWhere(p.x, p.y))); });
        return h('div', { id: 'coordgrid-describe', 'data-coordgrid-describe': 'true', style: Object.assign({}, cardStyle, { marginTop: 8 }) },
          h('p', { style: { margin: 0, lineHeight: 1.5 } }, describePoints()),
          gridPoints.length > 0 && h('table', { style: { marginTop: 8, borderCollapse: 'collapse', fontSize: 13 } },
            h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, t('stem.coordgrid.points_table', 'Plotted points')),
            h('thead', null, h('tr', null,
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, '#'),
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, 'x'),
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, 'y'),
              h('th', { scope: 'col', style: { padding: '2px 8px', textAlign: 'left' } }, t('stem.coordgrid.where_col', 'Where')))),
            h('tbody', null, rows)));
      };

      var renderHelp = function () {
        if (!showHelp) return null;
        return h('section', { 'aria-labelledby': 'coordgrid-help-h', 'data-coordgrid-help': 'true', style: cardStyle },
          h('h4', { id: 'coordgrid-help-h', style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800 } }, t('stem.coordgrid.help_title', 'Keyboard and help')),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 } },
            h('li', null, t('stem.coordgrid.help_grid', 'Grid: Tab to the grid, then the arrow keys move the cursor one unit (Shift moves 5). Home jumps to the origin. Enter or Space plots or removes a point.')),
            h('li', null, t('stem.coordgrid.help_entry', 'The X and Y boxes below the grid are the same cursor: type a coordinate, then use the plot button.')),
            h('li', null, t('stem.coordgrid.help_describe', 'Describe my points reads every point and line in words, with a table.')),
            h('li', null, t('stem.coordgrid.help_maps', 'Chess and Battleship boards: one Tab stop; arrow keys move between squares and Enter selects or fires.')),
            h('li', null, t('stem.coordgrid.help_question', 'Press ? (while focus is in this tool, not in a text box) to open or close this help.'))),
          h('button', { type: 'button', onClick: function () { updCG({ showHelp: false }); }, style: Object.assign({}, btnStyle, { marginTop: 8 }) }, t('stem.coordgrid.help_close', 'Close help')));
      };

      var renderTeacher = function () {
        if (!isTeacher) return null;
        var setT = function (patch) { updCG({ cgTeacher: Object.assign({}, cgTeacher, patch) }); };
        var byCode = {};
        missedLog.forEach(function (m) { byCode[m.code] = (byCode[m.code] || 0) + 1; });
        var codes = Object.keys(byCode).sort(function (a, b) { return byCode[b] - byCode[a]; });
        var taskLabel = function (k) { return TASK_NAMES[k] || (k === 'chess' ? t('stem.coordgrid.task_chess', 'Chess notation') : k === 'world' ? t('stem.coordgrid.task_world', 'Latitude and longitude') : k); };
        var codeLabel = function (k) { return MISC_NAMES[k] || (k === 'rank_flipped' ? t('stem.coordgrid.mcn_rank_flipped', 'Ranks counted from the top') : k === 'file_flipped' ? t('stem.coordgrid.mcn_file_flipped', 'Files counted from the right') : k === 'lat_sign' ? t('stem.coordgrid.mcn_lat_sign', 'Latitude hemisphere') : k === 'lon_sign' ? t('stem.coordgrid.mcn_lon_sign', 'Longitude hemisphere') : MISC_NAMES.other); };
        return h('section', { 'aria-labelledby': 'coordgrid-teacher-h', 'data-coordgrid-teacher': 'true', style: Object.assign({}, cardStyle, { borderStyle: 'dashed', borderWidth: 2 }) },
          h('h4', { id: 'coordgrid-teacher-h', style: { margin: '0 0 6px', fontSize: 14, fontWeight: 800 } }, t('stem.coordgrid.teacher_title', 'Teacher tools')),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' } },
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 } }, t('stem.coordgrid.teacher_lock_level', 'Lock the level'),
              h('select', { value: teacherLevel || '', onChange: function (e) { setT({ level: e.target.value || null }); }, style: Object.assign({}, inputStyle, { width: 'auto', fontFamily: 'inherit' }) },
                h('option', { value: '' }, t('stem.coordgrid.teacher_level_free', 'Students choose')),
                CG_CORE.LEVELS.map(function (l) { return h('option', { key: l, value: l }, LEVEL_NAMES[l]); }))),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, minHeight: 44 } },
              h('input', { type: 'checkbox', checked: revealsAllowed, style: { width: 20, height: 20 }, onChange: function () { setT({ reveals: !revealsAllowed }); } }),
              t('stem.coordgrid.teacher_reveals2', 'Offer a Show the answer button after two missed tries')),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, minHeight: 44 } },
              h('input', { type: 'checkbox', checked: !stretchAllowed, style: { width: 20, height: 20 }, onChange: function () { setT({ hideStretch: stretchAllowed }); } }),
              t('stem.coordgrid.teacher_hide_stretch', 'Only this level\'s tasks (hide stretch tasks)')),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, minHeight: 44 } },
              h('input', { type: 'checkbox', checked: noDilate, style: { width: 20, height: 20 }, onChange: function () { setT({ noDilate: !noDilate }); } }),
              t('stem.coordgrid.teacher_no_dilate', 'Turn off dilations (congruence only, 8.G.1-2)')),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, minHeight: 44 } },
              h('input', { type: 'checkbox', checked: hidePlay, style: { width: 20, height: 20 }, onChange: function () { setT({ hidePlay: !hidePlay }); } }),
              t('stem.coordgrid.teacher_hide_play', 'Hide the Play tab (map games)'))),
          h('p', { style: { margin: '10px 0 4px', fontWeight: 700, fontSize: 13 } }, fill(t('stem.coordgrid.teacher_missed_count', 'Missed items: {n}'), { n: missedLog.length })),
          codes.length > 0 && h('ul', { 'data-coordgrid-misconceptions': 'true', style: { margin: 0, paddingLeft: 18, fontSize: 13 } },
            codes.map(function (k) { return h('li', { key: k }, fill(t('stem.coordgrid.teacher_code_count', '{name}: {n}'), { name: codeLabel(k), n: byCode[k] })); })),
          missedLog.length > 0 && h('table', { style: { marginTop: 8, borderCollapse: 'collapse', fontSize: 12, width: '100%' } },
            h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, t('stem.coordgrid.teacher_recent', 'Most recent missed items')),
            h('thead', null, h('tr', null,
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 6px' } }, t('stem.coordgrid.teacher_col_task', 'Task')),
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 6px' } }, t('stem.coordgrid.teacher_col_item', 'Item')),
              h('th', { scope: 'col', style: { textAlign: 'left', padding: '2px 6px' } }, t('stem.coordgrid.teacher_col_slip', 'Likely slip')))),
            h('tbody', null, missedLog.slice(-12).reverse().map(function (m, i) {
              return h('tr', { key: i }, h('td', { style: { padding: '2px 6px' } }, taskLabel(m.task)), h('td', { style: { padding: '2px 6px' } }, m.prompt), h('td', { style: { padding: '2px 6px' } }, codeLabel(m.code)));
            }))),
          missedLog.length > 0 && h('button', { type: 'button', onClick: function () { updCG({ missedLog: [] }); say(t('stem.coordgrid.teacher_cleared', 'Missed list cleared.')); }, style: Object.assign({}, btnStyle, { marginTop: 8 }) }, t('stem.coordgrid.teacher_clear', 'Clear the missed list')));
      };

      var renderExplore = function () {
        var nameOpen = taskType === 'name' && !taskSolved && !answerShown;
        var svgLabel = (nameOpen
          ? t('stem.coordgrid.grid_label_name', 'Coordinate grid with one marked point to name.')
          : fill(t('stem.coordgrid.grid_label_counts', 'Coordinate grid visualization. {p} plotted points and {l} lines.'), { p: gridPoints.length, l: gridLines.length })) + ' ' + t('stem.coordgrid.grid_label_keys', 'Use the X and Y controls below for keyboard operation.');
        var walkSlip = walkKind === 'mine' && gridChallenge && gridChallenge.lastCode && gridChallenge.lastCode !== 'other' && Object.prototype.hasOwnProperty.call(MISC_NAMES, gridChallenge.lastCode) ? MISC_NAMES[gridChallenge.lastCode] : null;
        // The panel holds focusable content, so it is not a Tab stop itself.
        return h('div', { id: 'coordinate-section-panel', role: 'tabpanel', 'aria-labelledby': 'coordinate-section-tab-explore', className: 'space-y-4 allo-cg-bg-explore' },
          // The open task's card sits right above the grid (beside it when there is
          // room), so the prompt, the grid and Check share one screen.
          h('div', { id: 'coordgrid-task-layout', 'data-coordgrid-task-layout': gridChallenge ? 'task' : 'free', style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' } },
          gridChallenge && h('div', { 'data-coordgrid-task-side': 'true', style: { flex: '1 1 18rem', minWidth: 0 } }, taskCard()),
          // The grid. Its wrapper is the keyboard cursor surface (one Tab stop).
          h('div', { className: 'rounded-xl border-2 border-cyan-200 p-2 sm:p-4', style: { background: GP.surface, flex: '2 1 26rem', minWidth: 0 } },
            h('div', {
              id: 'coordgrid-explore-app', role: 'application', tabIndex: 0, className: 'allo-cg-app',
              'aria-label': t('stem.coordgrid.grid_app_label', 'Coordinate grid cursor. Arrow keys move one unit, Shift with an arrow moves five, Home goes to the origin, Enter or Space plots.'),
              'aria-describedby': 'coordgrid-cursor-readout',
              onKeyDown: gridKeyDown,
              onFocus: function () { setFocusApp('explore'); if (!cgQuietFocus) say(cursorText(coordinateInputX, coordinateInputY)); },
              onBlur: function () { setFocusApp(null); },
              style: { maxWidth: 480, margin: '0 auto', borderRadius: 6 }
            },
              h('svg', {
                viewBox: '0 0 ' + gridW + ' ' + gridH, width: '100%', preserveAspectRatio: 'xMidYMid meet',
                onClick: handleGridClick,
                role: 'img', focusable: 'false', 'aria-label': svgLabel,
                className: 'cursor-crosshair allo-cg-grid', style: { background: GP.surface, touchAction: 'manipulation', display: 'block', height: 'auto' }
              },
                gridElements,
                funcElements,
                lineElements,
                taskElements,
                walkElements,
                slopeChallengeElements,
                distChallengeElements,
                pointElements,
                labelElements,
                cursorElements
              )
            ),
            h('p', { id: 'coordgrid-cursor-readout', style: { margin: '6px 0 0', fontSize: 13, color: GP.ink, textAlign: 'center' } },
              nameOpen ? t('stem.coordgrid.cursor_readout_name', 'Count the units from the origin to the marked point.')
                : fill(t('stem.coordgrid.cursor_readout', 'Cursor at {pair}, {where}.'), { pair: pairText({ x: coordinateInputX, y: coordinateInputY }), where: quadWhere(coordinateInputX, coordinateInputY) })),
            walkTo && h('p', { 'data-coordgrid-walk': walkKind, style: { margin: '6px 0 0', fontSize: 13, fontWeight: 700, color: walkKind === 'answer' ? GP.good : GP.ink, textAlign: 'center' } },
              walkKind === 'answer'
                ? fill(t('stem.coordgrid.walk_answer', 'The walk to {pair}: from the origin, {moves}.'), { pair: pairText(walkTo), moves: moveWords(walkTo.x, walkTo.y) })
                : fill(t('stem.coordgrid.walk_mine', 'Your walk: from the origin, {moves}. It ends at {pair}.'), { pair: pairText(walkTo), moves: moveWords(walkTo.x, walkTo.y) }) + (walkSlip ? ' ' + fill(t('stem.coordgrid.walk_slip', 'Likely slip: {slip}.'), { slip: walkSlip }) : '')),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 } },
              h('button', { type: 'button', 'aria-expanded': descOpen, 'aria-controls': 'coordgrid-describe', onClick: function () { var next = !descOpen; updCG({ descOpen: next }); if (next) say(describePoints()); }, style: btnOn(descOpen) }, t('stem.coordgrid.describe_points', 'Describe my points')),
              lastCleared && h('button', { type: 'button', onClick: undoClear, style: btnStyle }, t('stem.coordgrid.undo_clear', 'Undo clear')),
              h('button', { type: 'button', 'aria-pressed': showHelp, onClick: function () { updCG({ showHelp: !showHelp }); }, style: btnOn(showHelp) }, t('stem.coordgrid.help_button', 'Keyboard help (?)'))),
            renderDescribe()
          )),

          !nameOpen && h('div', { role: 'group', 'aria-label': t('stem.coordgrid.coordinate_entry', 'Coordinate entry'), className: 'rounded-xl border border-cyan-200 bg-cyan-50 p-3' },
            h('p', { id: 'coordgrid-coordinate-entry-help', className: 'mb-2 text-xs text-cyan-900' }, t('stem.coordgrid.coordinate_entry_help', 'Keyboard alternative: enter X and Y, then use the button to plot, remove, or select that coordinate.')),
            h('div', { className: 'flex flex-wrap items-end gap-2' },
              h('label', { className: 'flex min-w-24 flex-1 flex-col gap-1 text-xs font-bold text-cyan-900' },
                t('stem.coordgrid.x_coordinate', 'X coordinate'),
                h('input', { type: 'number', min: viewRange.min, max: viewRange.max, step: 1, value: coordinateInputX, 'aria-describedby': 'coordgrid-coordinate-entry-help', onChange: function(e) { var value = parseInt(e.target.value, 10); if (Number.isFinite(value)) updCG({ coordinateInputX: clampV(value) }); }, className: 'min-h-11 rounded-lg border border-cyan-600 bg-white px-3 py-2 text-base text-slate-900' })
              ),
              h('label', { className: 'flex min-w-24 flex-1 flex-col gap-1 text-xs font-bold text-cyan-900' },
                t('stem.coordgrid.y_coordinate', 'Y coordinate'),
                h('input', { type: 'number', min: viewRange.min, max: viewRange.max, step: 1, value: coordinateInputY, 'aria-describedby': 'coordgrid-coordinate-entry-help', onChange: function(e) { var value = parseInt(e.target.value, 10); if (Number.isFinite(value)) updCG({ coordinateInputY: clampV(value) }); }, className: 'min-h-11 rounded-lg border border-cyan-600 bg-white px-3 py-2 text-base text-slate-900' })
              ),
              h('button', { type: 'button', onClick: function() { processGridCoordinate(coordinateInputX, coordinateInputY); }, className: 'min-h-11 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800' },
                (taskType === 'reflect' || taskType === 'translate') ? t('stem.coordgrid.use_as_prediction', 'Use as my prediction') : connectMode ? t('stem.coordgrid.select_coordinate', 'Select coordinate') : t('stem.coordgrid.toggle_coordinate', 'Plot or remove point'))
            )
          ),
          renderLevelBar(),

          // Core Tools
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { type: 'button', onClick: toggleConnect, 'aria-pressed': connectMode,
              style: { minHeight: 44 },
              className: 'flex-1 py-2 font-bold rounded-lg text-sm transition-all shadow-md ' + (connectMode ? 'bg-indigo-700 text-white ring-2 ring-indigo-300' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-600')
            }, connectMode ? t('stem.coordgrid.connect_on_btn', '✔ Connect points: on') : t('stem.coordgrid.connect_off_btn', '🔗 Connect points')),
            h('button', { type: 'button', 'aria-label': t('stem.coordgrid.clear', 'Clear'),
              onClick: clearGrid, style: { minHeight: 44 },
              className: 'px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
            }, t('stem.coordgrid.clear_2', '↺ Clear'))
          ),

          renderTaskPicker(),

          // Connect mode info
          connectMode && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
            h('p', { className: 'text-sm font-bold text-indigo-800 mb-1' }, t('stem.coordgrid.connect_mode', '🔗 Connect Mode')),
            h('p', { className: 'text-xs text-indigo-800' }, connectFirst != null ? t('stem.coordgrid.connect_second', 'Choose a second point to draw a line.') : t('stem.coordgrid.connect_start', 'Choose any point on the grid to start a line.'))
          ),
          gridLines.length > 0 && !gridChallenge && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
            h('p', { className: 'text-sm font-bold text-indigo-800 mb-1' }, t('stem.coordgrid.lines_title', 'Your lines')),
            h('div', { className: 'mt-1 space-y-1', role: 'list' },
              gridLines.map(function(ln, li) {
                var eq = calcLineEq(ln.from, ln.slope);
                var dist = calcDistance(ln.from, ln.to);
                var mid = calcMidpoint(ln.from, ln.to);
                return h('div', { key: li, role: 'listitem', className: 'flex items-center gap-2 text-[0.6875rem] bg-white rounded px-2 py-1 border flex-wrap' },
                  h('span', { className: 'font-bold text-indigo-800' }, pairText(ln.from) + ' → ' + pairText(ln.to)),
                  h('span', { className: 'font-bold text-indigo-800' }, 'm=' + (ln.slope.display === 'undefined' ? t('stem.coordgrid.slope_undefined', 'undefined') : ln.slope.display)),
                  h('span', { className: 'text-green-800' }, 'd=' + dist.toFixed(1)),
                  h('span', { className: 'text-purple-800' }, 'M' + pairText(mid)),
                  h('span', { className: 'ml-auto text-[0.6875rem] font-mono text-indigo-800' }, eq)
                );
              })
            ),
            h('button', { type: 'button', 'aria-label': t('stem.coordgrid.clear_lines', 'Clear Lines'), onClick: function() { setLines([], { connectFirst: null }); say(t('stem.coordgrid.lines_cleared', 'Lines cleared. Points stay.')); }, style: { minHeight: 32 }, className: 'mt-2 px-3 py-1 text-[0.6875rem] font-bold bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200' }, t('stem.coordgrid.clear_lines_2', '🗑 Clear Lines'))
          ),

          // Function plotting panel
          h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
            h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
              h('label', { className: 'text-xs font-bold text-indigo-800 flex items-center gap-1 cursor-pointer', style: { minHeight: 32 } },
                h('input', { type: 'checkbox', checked: funcsOn, style: { width: 20, height: 20 },
                  onChange: function() { sfxClick(); updCG({ funcsOn: !funcsOn }); }
                }),
                t('stem.coordgrid.plot_functions_on_the_grid', '📈 Plot functions on the grid')
              ),
              funcsOn && h('span', { className: 'text-[0.6875rem] text-indigo-800 ml-auto' }, fill(t('stem.coordgrid.funcs_plotted', '{n} plotted'), { n: funcs.length }))
            ),
            funcsOn && h('div', { className: 'space-y-2' },
              h('div', { className: 'flex items-center gap-1' },
                h('span', { className: 'text-sm font-bold text-indigo-800 font-mono', 'aria-hidden': 'true' }, t('stem.coordgrid.y', 'y =')),
                h('input', { type: 'text', value: funcInput,
                  onChange: function(e) { updCG({ funcInput: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter') addFunc(funcInput); },
                  placeholder: t('stem.coordgrid.e_g_2x_1_x_2_0_5x_3', 'e.g. 2x+1, x^2, -0.5x+3'),
                  'aria-label': t('stem.coordgrid.function_expression_in_x', 'Function expression in x'),
                  style: { minHeight: 44 },
                  className: 'flex-1 px-2 py-1 border border-indigo-600 rounded text-sm font-mono'
                }),
                h('button', { type: 'button', onClick: function() { addFunc(funcInput); },
                  'aria-label': t('stem.coordgrid.add_function_to_the_grid', 'Add function to the grid'), style: { minHeight: 44 },
                  className: 'px-3 py-1 bg-indigo-700 text-white text-xs font-bold rounded hover:bg-indigo-800 transition-all'
                }, t('stem.coordgrid.add', '+ Add'))
              ),
              h('div', { className: 'flex flex-wrap gap-1' },
                h('span', { className: 'text-[0.625rem] font-bold text-indigo-800 self-center mr-1' }, t('stem.coordgrid.presets', 'Presets:')),
                ['x', '2x+1', '-x+3', '0.5x-2', 'x^2', '-x^2+4'].map(function(p) {
                  return h('button', { key: 'fpre-' + p, type: 'button',
                    onClick: function() { addFunc(p); }, style: { minHeight: 32 },
                    className: 'px-2 py-0.5 rounded text-[0.6875rem] font-mono bg-white text-indigo-700 border border-indigo-600 hover:bg-indigo-100'
                  }, 'y = ' + p);
                })
              ),
              funcs.length > 0 && h('div', { className: 'space-y-1', role: 'list' },
                funcs.map(function(f) {
                  return h('div', { key: 'fitem-' + f.id, role: 'listitem', className: 'flex items-center gap-2 bg-white rounded px-2 py-1 border border-indigo-100' },
                    h('span', { className: 'inline-block w-3 h-3 rounded-full flex-shrink-0', style: { backgroundColor: f.color }, 'aria-hidden': 'true' }),
                    h('span', { className: 'text-xs font-mono font-bold flex-1', style: { color: '#1e293b', opacity: f.visible ? 1 : 0.6 } }, 'y = ' + f.expr),
                    h('button', { type: 'button', onClick: function() { toggleFunc(f.id); }, 'aria-pressed': !!f.visible,
                      'aria-label': fill(t('stem.coordgrid.show_func', 'Show y = {expr}'), { expr: f.expr }), style: { minWidth: 32, minHeight: 32 },
                      className: 'text-[0.6875rem] text-slate-700 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100'
                    }, f.visible ? '👁' : '🚫'),
                    gaInfo && h('button', { type: 'button', 'aria-pressed': gaSel && gaSel.id === f.id, onClick: function () { updCG({ gaFn: f.id, gaIdx: -1 }); }, style: { minWidth: 32, minHeight: 32 },
                      'aria-label': fill(t('stem.coordgrid.describe_func', 'Describe y = {expr}'), { expr: f.expr }),
                      className: 'text-[0.6875rem] text-slate-700 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100' }, '🔎'),
                    h('button', { type: 'button', onClick: function() { removeFunc(f.id); }, 'aria-label': fill(t('stem.coordgrid.remove_func', 'Remove y = {expr}'), { expr: f.expr }), style: { minWidth: 32, minHeight: 32 },
                      className: 'text-sm text-rose-700 hover:text-rose-800 px-1.5 py-0.5 rounded hover:bg-rose-50 font-bold leading-none'
                    }, '×')
                  );
                })
              ),
              gaInfo ? GA.panel(React, {
                id: 'coordgrid-ga', t: t, desc: gaInfo.desc, points: gaInfo.points, index: gaIdx, samples: gaInfo.samples,
                sonify: { evaluate: gaInfo.evaluate, zeros: gaInfo.zeros, ymin: viewRange.min, ymax: viewRange.max },
                open: !!_cg.gaOpen, onToggle: function () { updCG({ gaOpen: !_cg.gaOpen }); }, onIndex: function (i) { updCG({ gaIdx: i }); },
                onChange: function () { updCG({ gaTick: (typeof _cg.gaTick === 'number' ? _cg.gaTick : 0) + 1 }); }, announce: say, callTTS: ctx.callTTS,
                styles: { button: btnStyle, text: { color: '#1e293b', fontSize: 13 }, region: { padding: '8px 10px', minHeight: 44, borderRadius: 8, border: '2px solid #4338ca', background: '#ffffff', color: '#1e293b', fontFamily: 'monospace', fontSize: 13 }, help: { color: '#334155', fontSize: 12 } }
              }) : null,
              h('p', { className: 'text-[0.625rem] text-indigo-800 italic' },
                t('stem.coordgrid.try_2x_1_linear_slope_2_x_3_negative_s', 'Try: 2x+1 (linear, slope 2), -x+3 (negative slope, y-intercept 3), x^2 (parabola), 0.5x-2 (fractional slope). Use ^ for exponents.')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                h('button', { type: 'button', onClick: function () { openTool('funcGrapher', t('stem.coordgrid.tool_funcgrapher', 'Function Grapher')); }, style: btnStyle }, t('stem.coordgrid.open_funcgrapher', 'Explore function families in Function Grapher')),
                h('button', { type: 'button', onClick: function () { openTool('graphCalc', t('stem.coordgrid.tool_graphcalc', 'Graphing Calculator')); }, style: btnStyle }, t('stem.coordgrid.open_graphcalc', 'Open the Graphing Calculator')))
            )
          ),

          // Stats
          h('div', { className: 'grid grid-cols-3 gap-3' },
            h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-100 text-center' },
              h('div', { className: 'text-xs font-bold text-cyan-800 uppercase mb-1' }, t('stem.coordgrid.points', 'Points')),
              h('div', { className: 'text-2xl font-bold text-cyan-800' }, gridPoints.length)
            ),
            h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-100 text-center' },
              h('div', { className: 'text-xs font-bold text-cyan-800 uppercase mb-1' }, t('stem.coordgrid.lines', 'Lines')),
              h('div', { className: 'text-2xl font-bold text-cyan-800' }, gridLines.length)
            ),
            h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-100 text-center' },
              h('div', { className: 'text-xs font-bold text-cyan-800 uppercase mb-1' }, t('stem.coordgrid.quadrants', 'Quadrants')),
              h('div', { className: 'text-sm font-bold text-cyan-800' },
                gridPoints.length > 0
                  ? (function() {
                      var qs = {};
                      gridPoints.forEach(function(p) { qs[quadName(p.x, p.y)] = true; });
                      return Object.keys(qs).join(', ');
                    })()
                  : '—'
              )
            )
          ),
          polygonsSolved + plotsSolved > 0 && h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
            h('button', { type: 'button', onClick: function () { openTool('areaPerimeter', t('stem.coordgrid.tool_areaperimeter', 'Area and Perimeter')); }, style: btnStyle }, t('stem.coordgrid.open_areaperimeter', 'Practise area and perimeter in Area and Perimeter')))
        );
      };

      return h('div', { className: 'space-y-4 max-w-5xl mx-auto animate-in fade-in duration-200', 'data-coordinate-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light'), style: { background: themeSurface, color: themeInk, border: '1px solid ' + themeBorder } },
        // Header
        h('section', { 'data-coordinate-command': 'true', className: 'overflow-hidden rounded-2xl border border-cyan-300/40 bg-gradient-to-br from-slate-950 via-cyan-950 to-indigo-950 text-white shadow-xl' },
          h('div', { className: 'p-4 sm:p-5' },
            h('div', { className: 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' },
              h('div', { className: 'min-w-0' },
                h('div', { className: 'flex items-center gap-2' },
                  h('button', { onClick: function() { setStemLabTool(null); }, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300', 'aria-label': t('stem.coordgrid.back_to_tools', 'Back to tools') }, h(ArrowLeft, { size: 18 })),
                  h('span', { className: 'rounded-full bg-cyan-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-cyan-200/30' }, t('stem.coordgrid.studio_kicker', 'Spatial reasoning studio'))
                ),
                h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, t('stem.coordgrid.coordinate_grid', '\uD83D\uDCCD Coordinate Grid')),
                h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-cyan-100' }, t('stem.coordgrid.studio_lede', 'Locate, compare, and communicate positions using ordered pairs across graphs and real-world maps.'))
              )
            )
          )
        ),
        // "Start here" path for the band
        renderPath(),
        h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
          cgTab !== 'treasure' ? h('button', { type: 'button', 'data-coordgrid-quick-treasure': 'true', onClick: quickTreasure, style: Object.assign({}, btnStyle, { borderRadius: 999, borderStyle: 'dashed' }) }, t('stem.coordgrid.quick_treasure', '🗝️ Quick game: find the treasure in 3 digs')) : h('span', null),
          h('div', { className: 'flex flex-wrap items-center justify-end gap-2' },
            streak > 0 && h('span', { className: 'text-xs font-bold', style: { color: GP.mystery } }, fill(t('stem.coordgrid.streak_now', '\uD83D\uDD25 Streak {n}'), { n: streak })),
            bestStreak > 0 && h('span', { className: 'text-[0.6875rem]', style: { color: GP.muted } }, fill(t('stem.coordgrid.best_streak', 'Best: {n}'), { n: bestStreak })),
            h('span', { className: 'text-xs font-bold', style: { color: isContrast || isDark ? '#86efac' : '#047857' } }, fill(t('stem.coordgrid.score_of', '{c} of {n} correct'), { c: exploreScore.correct, n: exploreScore.total })),
            h('button', { onClick: function() {
                var snap = { id: 'snap-' + Date.now(), tool: 'coordinate', label: fill(t('stem.coordgrid.snap_label', 'Grid: {n} points'), { n: gridPoints.length }), data: { points: gridPoints.slice(), lines: gridLines.slice() }, timestamp: Date.now() };
                if (typeof setToolSnapshots === 'function') setToolSnapshots(function(prev) { return (prev || []).concat([snap]); });
                sfxClick();
                addToast('\uD83D\uDCF8 ' + t('stem.coordgrid.snap_saved', 'Snapshot saved.'), 'success');
                say(t('stem.coordgrid.snap_saved', 'Snapshot saved.'));
              },
              'aria-label': t('stem.coordgrid.save_snapshot', 'Save snapshot'),
              style: { minWidth: 44, minHeight: 44 },
              className: 'text-[0.6875rem] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-500 rounded-full px-2 py-0.5 transition-all'
            }, '\uD83D\uDCF8'),
            h('button', {
              onClick: function() {
                var next = !muted;
                updCG({ muted: next });
                if (!next) { later(function() { playTone(660, 0.08, 'sine', 0.08); }, 0); }
                say(next ? t('stem.coordgrid.sound_muted', 'Sound muted.') : t('stem.coordgrid.sound_on', 'Sound on.'));
              },
              // A toggle keeps one name; aria-pressed carries the state.
              'aria-label': t('stem.coordgrid.mute_sounds', 'Mute sound effects'),
              'aria-pressed': muted,
              title: muted ? t('stem.coordgrid.sounds_off_title', 'Sounds are off') : t('stem.coordgrid.sounds_on_title', 'Sounds are on'),
              style: { minWidth: 44, minHeight: 44 },
              className: 'p-1 rounded-md text-base hover:bg-slate-100 transition-colors ' + (muted ? 'text-slate-600' : 'text-cyan-700')
            }, muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'),
            h('button', {
              onClick: function() {
                sfxClick();
                setGridPoints([]);
                setGridChallenge(null);
                setGridFeedback(null);
                updCG({
                  streak: 0,
                  qtPointX: 3, qtPointY: 2, qtFocusedQuad: null, qtWalkPhase: 0,
                  qtShowReflections: true,
                  mapScenario: 'chess', chessSelected: 'e4', chessInput: '',
                  bsShips: null, bsShots: [], bsWon: false, bsLastResult: '',
                  worldCity: 'portland_me', worldClickLat: null, worldClickLon: null,
                  chessPracticeOn: false, chessChallenge: null, chessChallengeInput: '', chessFeedback: null,
                  worldPracticeOn: false, worldChallenge: null, worldFeedback: null,
                  funcsOn: false, funcInput: '', funcs: [],
                  gridLines: [], connectMode: false, connectFirst: null, lastCleared: null, q1View: false,
                  chessRetryMsg: null, worldRetryMsg: null, chessCursor: null, bsCursor: null,
                  tfTask: null, tfFb: null, tfSteps: [], tfDraft: null, tfCur: null, ptTask: null, ptFb: null, ptCur: null,
                  thMission: null, thFb: null, thCur: null, thDescOpen: false
                  // Note: progress counters, badges, chessSolved, worldSolved, bsBest, streaks and teacher settings persist across resets
                });
                say(t('stem.coordgrid.reset_done', 'Coordinate grid reset to its starting view.'));
              },
              'aria-label': t('stem.coordgrid.reset_everything', 'Reset everything'),
              title: t('stem.coordgrid.reset_all_points_lines_and_quadrant_to', 'Reset all points, lines, and quadrant tour'),
              style: { minHeight: 44 },
              className: 'px-2 py-0.5 rounded text-[0.6875rem] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all'
            }, t('stem.coordgrid.reset', '\u21BA Reset'))
          )
        ),

        // Tab bar
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))' }, className: 'gap-1 bg-cyan-50 rounded-xl p-1 border border-cyan-200', role: 'tablist', 'aria-label': t('stem.coordgrid.coordinate_grid_sections', 'Coordinate Grid sections') },
          coordinateTabs.map(function(t2, index) {
            return h('button', {
              key: 't-' + t2.id,
              id: 'coordinate-section-tab-' + t2.id,
              onClick: function() { sfxClick(); updCG({ cgTab: t2.id }); },
              onKeyDown: function(event) { moveCoordinateTab(event, index); },
              role: 'tab',
              'aria-selected': cgTab === t2.id,
              'aria-controls': 'coordinate-section-panel',
              tabIndex: cgTab === t2.id ? 0 : -1,
              'aria-describedby': 'coordgrid-tabs-note', 'data-core': t2.core ? 'true' : 'false',
              style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', border: '2px ' + (t2.core ? 'solid' : 'dashed') + ' ' + (t2.core ? '#0e7490' : '#64748b') }, className: 'py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
                (cgTab === t2.id ? 'bg-white text-cyan-800 shadow-sm' : 'text-cyan-800 hover:text-cyan-900')
            }, t2.icon + ' ' + t2.label);
          })
        ),
        h('p', { id: 'coordgrid-tabs-note', style: { margin: '-8px 0 0', fontSize: 12, color: themeInk } }, TABS_NOTE[cgLevel] || TABS_NOTE.g6),

        // EXPLORE TAB content
        cgTab === 'explore' && renderExplore(),

        // STAGE B TABS
        cgTab === 'transform' && renderTransform(),
        cgTab === 'patterns' && renderPatterns(),
        cgTab === 'treasure' && renderTreasure(),

        // QUADRANT TOUR TAB content
        cgTab === 'quadrants' && renderQuadrantTour(),

        // REAL-WORLD MAPS TAB content
        cgTab === 'maps' && renderRealWorldMaps(),

        // === H7b'' inquiry widget: quadrant discovery ===
        cgTab === 'quadHunt' && (function() {
          var iq = _cg._quadHunt || { x: 3, y: 4, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }; // `d` was undeclared here — Quadrant Hunt tab crashed on render
          function setIQ(patch) { updCG({ _quadHunt: Object.assign({}, iq, patch) }); }
          var quadrant;
          if (iq.x === 0 && iq.y === 0) quadrant = 'origin';
          else if (iq.x === 0) quadrant = 'yAxis';
          else if (iq.y === 0) quadrant = 'xAxis';
          else if (iq.x > 0 && iq.y > 0) quadrant = 'q1';
          else if (iq.x < 0 && iq.y > 0) quadrant = 'q2';
          else if (iq.x < 0 && iq.y < 0) quadrant = 'q3';
          else quadrant = 'q4';
          var qm = {
            q1:     { label: t('stem.coordgrid.quadrant_i', '↗️ Quadrant I (+, +)'), color: '#047857', bg: '#ecfdf5', border: '#86efac' },
            q2:     { label: t('stem.coordgrid.quadrant_ii', '↖️ Quadrant II (−, +)'), color: '#0e7490', bg: '#ecfeff', border: '#67e8f9' },
            q3:     { label: t('stem.coordgrid.quadrant_iii', '↙️ Quadrant III (−, −)'), color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' },
            q4:     { label: t('stem.coordgrid.quadrant_iv', '↘️ Quadrant IV (+, −)'), color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
            xAxis:  { label: t('stem.coordgrid.on_x_axis_y_0', '↔️ on X-axis (y = 0)'),  color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
            yAxis:  { label: t('stem.coordgrid.on_y_axis_x_0', '↕️ on Y-axis (x = 0)'),  color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
            origin: { label: t('stem.coordgrid.at_the_origin_0_0', '🎯 at the Origin (0, 0)'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
          }[quadrant];
          return h('div', { id: 'coordinate-section-panel', role: 'tabpanel', 'aria-labelledby': 'coordinate-section-tab-quadHunt', tabIndex: 0, className: 'p-4 rounded-xl bg-white border border-cyan-300 space-y-3' },
            h('h3', { className: 'text-sm font-black text-cyan-700' }, t('stem.coordgrid.quadrant_discovery', '🎯 Quadrant discovery')),
            h('p', { className: 'text-[0.75rem] text-slate-700 leading-relaxed' }, t('stem.coordgrid.qh_intro', 'Move x and y with the sliders and watch which region the point is in. Log a few points, then explain the sign pattern of each quadrant.')),
            h('div', { className: 'p-3 rounded-lg text-center', style: { background: qm.bg, border: '2px solid ' + qm.border } },
              h('div', { className: 'text-base font-black', style: { color: qm.color } }, qm.label),
              h('div', { className: 'text-[0.6875rem] text-slate-700 mt-1 font-mono' }, '(x, y) = (' + iq.x + ', ' + iq.y + ')')
            ),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              [{ k: 'x', l: t('stem.coordgrid.qh_x', 'x coordinate') }, { k: 'y', l: t('stem.coordgrid.qh_y', 'y coordinate') }].map(function(s) {
                return h('div', { key: s.k },
                  h('label', { htmlFor: 'qh-' + s.k, className: 'block text-[0.6875rem] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-cyan-700' }, iq[s.k])),
                  h('input', { id: 'qh-' + s.k, type: 'range', min: -10, max: 10, step: 1, value: iq[s.k],
                    onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                    className: 'w-full', 'aria-label': s.l }));
              })
            ),
            h('div', { className: 'flex gap-2 items-center flex-wrap' },
              h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ x: iq.x, y: iq.y, q: quadrant }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[0.6875rem] font-bold text-slate-700 border border-slate-300' }, t('stem.coordgrid.log', '📋 Log')),
              h('button', { onClick: function() { setIQ({ x: 3, y: 4, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[0.6875rem] font-semibold text-slate-600 border border-slate-500' }, t('stem.coordgrid.reset_2', '↺ Reset'))
            ),
            h('textarea', { 'aria-label': t('stem.coordgrid.hypothesis_input', 'Quadrant sign hypothesis'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.coordgrid.hypothesis_what_sign_combinations_defi', 'Hypothesis: What sign combinations define each quadrant?'),
              className: 'w-full text-[0.75rem] border border-slate-500 rounded p-2 font-mono leading-snug bg-white text-slate-800', rows: 3 }),
            !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[0.6875rem] font-bold text-amber-800 border border-amber-300' }, t('stem.coordgrid.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
            iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-700 leading-relaxed' },
              h('ul', { className: 'list-disc pl-5 space-y-1' },
                h('li', null, t('stem.coordgrid.place_a_point_in_each_quadrant_look_at', 'Place a point in each quadrant. Look at the signs.')),
                h('li', null, t('stem.coordgrid.what_happens_exactly_on_an_axis', 'What happens exactly on an axis?')))),
            h('label', { className: 'flex items-center gap-2 text-[0.75rem] font-bold text-emerald-800 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
              t('stem.coordgrid.i_understand_explain_in_own_words', 'I understand — explain in own words')),
            iq.understood && h('textarea', { 'aria-label': t('stem.coordgrid.explanation_input', 'Quadrant sign explanation'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.coordgrid.explain_the_sign_pattern_that_defines_', 'Explain the sign pattern that defines each quadrant.'),
              className: 'w-full text-[0.75rem] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })
          );
        })(),

        // Teacher tools: one panel, the same on every tab
        renderTeacher(),

        // Keyboard help (any tab; "?" toggles it)
        renderHelp(),

        // Badges (shared across tabs)
        renderBadges(),

        // AI Tutor toggle + panel
        aiAvailable && !showAITutor && h('button', { 'aria-label': t('stem.coordgrid.ai_tutor', 'AI Tutor'), style: { minHeight: 44 },
          onClick: function() { sfxClick(); updCG({ showAITutor: true }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-600 hover:bg-sky-100 transition-all'
        }, t('stem.coordgrid.ai_tutor_2', '\uD83E\uDD16 AI Tutor')),
        renderAITutor(),

        // Keyboard hints
        h('div', { className: 'text-center text-[0.6875rem] mt-2', style: { color: isContrast ? '#f8fafc' : (isDark ? '#cbd5e1' : '#475569') } },
          t('stem.coordgrid.kbd_hint_line', '\u2328\uFE0F Press ? for keyboard help. The grid, chess board and battleship board each take one Tab stop; use the arrow keys inside them.')
        )
      );
    }
  });
})();
