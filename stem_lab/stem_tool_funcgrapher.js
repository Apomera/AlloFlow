// ═══════════════════════════════════════════
// stem_tool_funcgrapher.js — Function Grapher Plugin
// Standalone plugin extracted from stem_tool_math.js
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

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _funcgrAC = null;
  function getFuncgrAC() { if (!_funcgrAC) { try { _funcgrAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_funcgrAC && _funcgrAC.state === "suspended") { try { _funcgrAC.resume(); } catch(e) {} } return _funcgrAC; }
  function funcgrTone(f,d,tp,v) { var ac = getFuncgrAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxFuncgrClick() { funcgrTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-funcgrapher')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-funcgrapher';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

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



  function fgTruncatedIntegral(power, epsilon) {
    power=Number(power);epsilon=Number(epsilon);
    if([.5,1,2].indexOf(power)===-1||!Number.isFinite(epsilon)||epsilon<=0||epsilon>=1)return {ok:false};
    var area=power===1?-Math.log(epsilon):(1-Math.pow(epsilon,1-power))/(1-power);
    return {ok:true,power:power,epsilon:epsilon,area:area,formula:power===.5?'2(1 − √ε)':power===1?'−ln(ε)':'1/ε − 1',limit:power===.5?'2':'unbounded'};
  }
  window.__alloImproperIntegral={truncate:fgTruncatedIntegral};

  function fgSecantStudy(evaluate, derivative, x, firstStep) {
    if(!Number.isFinite(x)||!Number.isFinite(firstStep)||firstStep<=0)return {ok:false,error:'Use a finite base point and a positive finite starting step.'};
    function value(at){if(!Number.isFinite(at))return null;try{var y=evaluate(at);return typeof y==='number'&&Number.isFinite(y)?y:null;}catch(e){return null;}}
    function slope(a,b,distance){if(a===null||b===null||!Number.isFinite(distance)||distance<=0)return null;var answer=(b-a)/distance;return Number.isFinite(answer)?answer:null;}
    var base=value(x),rows=[];
    for(var i=0;i<4;i++){
      var step=firstStep*Math.pow(10,-i),leftX=x-step,rightX=x+step,left=value(leftX),right=value(rightX);
      rows.push({step:step,leftX:leftX,rightX:rightX,left:slope(left,base,x-leftX),right:slope(base,right,rightX-x),center:base===null||leftX===x||rightX===x?null:slope(left,right,rightX-leftX),collapsed:step===0||leftX===x||rightX===x});
    }
    return {ok:true,x:x,firstStep:firstStep,value:base,derivative:typeof derivative==='number'&&Number.isFinite(derivative)?derivative:null,rows:rows};
  }
  function fgSecantMarkdown(study, reflection, revealed) {
    if(!study||!study.ok)return '# Secant-to-tangent investigation\n\nNo completed calculation.';
    function number(value){return typeof value==='number'&&Number.isFinite(value)?String(value):'Unavailable';}
    var context=study.context||{},lines=['# Secant-to-tangent investigation',context.created||'','Function: '+(context.equation||'Not recorded.'),'Family: '+(context.type||'Not recorded.'),'Parameters: a='+number(context.a)+', b='+number(context.b)+', c='+number(context.c),'Base point x₀ = '+number(study.x)+'; f(x₀) = '+number(study.value),'Starting step: '+number(study.firstStep),'Prediction: '+(context.prediction||'Not recorded.'),'Slopes use the actual represented sample spacing. The centered estimate alone does not establish a derivative.'];
    study.rows.forEach(function(row){lines.push('h = '+number(row.step)+'; left sample x = '+number(row.leftX)+'; right sample x = '+number(row.rightX)+'; left slope = '+number(row.left)+'; right slope = '+number(row.right)+'; centered estimate = '+number(row.center)+(row.collapsed?'; sample positions coincide at machine precision.':''));});
    lines.push('Analytic derivative comparison: '+(revealed?(study.derivative===null?'No finite derivative value is available from the supported function model. Check the domain, one-sided behavior, and numerical range.':'f′(x₀) = '+number(study.derivative)):'Not revealed.'));
    lines.push('Reflection: '+(String(reflection||'').trim()||'Not recorded.'));
    lines.push('Finite numerical samples cannot prove a limit. Domain boundaries, corners, and roundoff need separate attention.');
    return lines.join('\n\n');
  }
  window.__alloSecantInvestigation={study:fgSecantStudy,markdown:fgSecantMarkdown};

  // ── Transformation Lab model: y = a·f(b(x − h)) + k on a parent f. It lives under its
  // own tf key: the grader reads {type, a, b, c}, so those keys keep their meaning. ──
  var FG_TF_LIMITS = { a: [-4, 4], b: [-4, 4], h: [-6, 6], k: [-6, 6] };
  var _fgRocDrag = null; // which rate-of-change point a pointer is dragging (never in toolData)
  var FG_TF_PARENT_IDS = ['x', 'x2', 'abs', 'sqrt', 'recip', 'exp2', 'sin'];
  function fgTfClamp(key, v) { return Math.max(FG_TF_LIMITS[key][0], Math.min(FG_TF_LIMITS[key][1], v)); }
  function fgTfParent(id, x) {
    if (id === 'x') return x;
    if (id === 'x2') return x * x;
    if (id === 'abs') return Math.abs(x);
    if (id === 'sqrt') return Math.sqrt(x);
    if (id === 'recip') return 1 / x;
    if (id === 'exp2') return Math.pow(2, x);
    if (id === 'sin') return Math.sin(x);
    return NaN;
  }
  // What one slider change does to the picture; a sign change and a size change can both apply.
  function fgTfEffects(key, from, to) {
    if (typeof from !== 'number' || typeof to !== 'number' || from === to) return ['none'];
    if (key === 'h') return [to > from ? 'right' : 'left'];
    if (key === 'k') return [to > from ? 'up' : 'down'];
    if (to === 0) return ['flatten'];
    if (from === 0) return ['unflatten'];
    var out = [];
    if ((from < 0) !== (to < 0)) out.push(key === 'a' ? 'flip_x' : 'flip_y');
    if (Math.abs(to) > Math.abs(from)) out.push(key === 'a' ? 'stretch_v' : 'compress_h');
    if (Math.abs(to) < Math.abs(from)) out.push(key === 'a' ? 'compress_v' : 'stretch_h');
    return out;
  }
  function fgTfNormalize(raw) {
    var src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    function val(k, fb) { var v = src[k]; return typeof v === 'number' && isFinite(v) ? fgTfClamp(k, v) : fb; }
    var out = { parent: FG_TF_PARENT_IDS.indexOf(src.parent) >= 0 ? src.parent : 'x2', a: val('a', 1), b: val('b', 1), h: val('h', 0), k: val('k', 0), predictOn: src.predictOn !== false, pending: null, last: null };
    var p = src.pending, l = src.last;
    if (p && typeof p === 'object' && FG_TF_LIMITS.hasOwnProperty(p.key) && typeof p.to === 'number' && isFinite(p.to)) out.pending = { key: p.key, to: fgTfClamp(p.key, p.to) };
    if (l && typeof l === 'object' && FG_TF_LIMITS.hasOwnProperty(l.key) && typeof l.from === 'number' && isFinite(l.from) && typeof l.to === 'number' && isFinite(l.to)) out.last = { key: l.key, from: l.from, to: l.to, pred: typeof l.pred === 'string' ? l.pred : '' };
    return out;
  }
  function fgTfNum(v) { var r = Math.round(v * 100) / 100; if (r === 0) r = 0; return r < 0 ? '−' + String(-r) : String(r); }
  function fgTfEquation(tf) {
    var inner = tf.h === 0 ? 'x' : 'x ' + (tf.h > 0 ? '− ' : '+ ') + fgTfNum(Math.abs(tf.h));
    var arg = tf.b === 1 ? inner : (tf.b === -1 ? '−' : fgTfNum(tf.b)) + (inner === 'x' ? 'x' : '(' + inner + ')');
    var simple = arg === 'x', term;
    if (tf.parent === 'recip') term = (tf.a === 1 ? '1' : tf.a === -1 ? '−1' : fgTfNum(tf.a)) + '/' + (simple ? 'x' : '(' + arg + ')');
    else {
      if (tf.parent === 'x') term = simple || tf.a === 1 ? arg : '(' + arg + ')';
      else if (tf.parent === 'x2') term = simple ? 'x²' : '(' + arg + ')²';
      else if (tf.parent === 'abs') term = '|' + arg + '|';
      else if (tf.parent === 'sqrt') term = '√(' + arg + ')';
      else if (tf.parent === 'exp2') term = simple ? '2^x' : '2^(' + arg + ')';
      else term = 'sin(' + arg + ')';
      term = (tf.a === 1 ? '' : tf.a === -1 ? '−' : fgTfNum(tf.a) + '·') + term;
    }
    return 'y = ' + term + (tf.k === 0 ? '' : (tf.k > 0 ? ' + ' : ' − ') + fgTfNum(Math.abs(tf.k)));
  }
  // Does a transformed graph match a target? Compared at probe points across the lab's window, so
  // two settings that draw the same graph (b = −1 on |x|) both count.
  var FG_TF_PROBES = [-7.3, -5.1, -3.7, -2.2, -0.9, 0.4, 1.3, 2.6, 3.9, 5.2, 6.8];
  function fgTfImage(tf, x) { return tf.a * fgTfParent(tf.parent, tf.b * (x - tf.h)) + tf.k; }
  function fgTfSameGraph(p, q) {
    var used = 0;
    for (var i = 0; i < FG_TF_PROBES.length; i++) {
      var u = fgTfImage(p, FG_TF_PROBES[i]), v = fgTfImage(q, FG_TF_PROBES[i]), fu = isFinite(u), fv = isFinite(v);
      if (fu !== fv) return false;
      if (!fu) continue;
      if (Math.abs(u - v) > 1e-9 * Math.max(1, Math.abs(v))) return false;
      used++;
    }
    return used >= 3;
  }
  var FG_TF_TARGETS = [{ parent: 'x2', a: 1, b: 1, h: 2, k: -1 }, { parent: 'abs', a: -1, b: 1, h: -3, k: 2 }, { parent: 'sqrt', a: 2, b: 1, h: 1, k: -2 }, { parent: 'exp2', a: 1, b: 1, h: 0, k: -3 }, { parent: 'sin', a: 2, b: 2, h: 0, k: 1 }];
  // Teacher-assigned targets are saved state: keep only well-formed ones.
  function fgTfTargetList(raw) {
    var out = [];
    (Array.isArray(raw) ? raw : []).forEach(function(t) {
      if (!t || typeof t !== 'object' || FG_TF_PARENT_IDS.indexOf(t.parent) < 0) return;
      var n = fgTfNormalize(t), key = fgTfEquation(n);
      if (!out.some(function(o) { return o.key === key; })) out.push({ parent: n.parent, a: n.a, b: n.b, h: n.h, k: n.k, key: key });
    });
    return out.slice(0, 12);
  }
  window.__alloTransformLab = { normalize: fgTfNormalize, effects: fgTfEffects, parent: fgTfParent, equation: fgTfEquation, sameGraph: fgTfSameGraph, targets: FG_TF_TARGETS, targetList: fgTfTargetList };


  // ═══ 📈 Function Grapher ═══
  // WCAG 1.4.3 high contrast: flatten the gradient Snapshot button under HC green ink.
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-funcgrapher-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-funcgrapher-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"funcGrapher\"] .from-indigo-600.to-purple-600{background-image:none!important;background-color:#000!important}";
    document.head.appendChild(st);
  })();
  window.StemLab.registerTool('funcGrapher', {
    icon: '📈',
    label: 'Function Grapher',
    desc: 'Graph and explore mathematical functions interactively',
    color: 'indigo',
    category: 'math',
    questHooks: [
      { id: 'try_5_families', label: 'Explore 5 function families', icon: '📈', check: function(d) { return Object.keys(d.familiesTried || {}).length >= 5; }, progress: function(d) { return Object.keys(d.familiesTried || {}).length + '/5 families'; } },
      { id: 'challenge_5', label: 'Answer 5 challenges correctly', icon: '🎯', check: function(d) { return (d.fgScore || 0) >= 5; }, progress: function(d) { return (d.fgScore || 0) + '/5 correct'; } },
      { id: 'myth_3', label: 'Bust 3 function myths (True or False)', icon: '🧠', check: function(d) { return (d.fgMythsDone || 0) >= 3; }, progress: function(d) { return (d.fgMythsDone || 0) + '/3 myths'; } },
      { id: 'use_overlays', label: 'Reveal the derivative and area overlays', icon: '📉', check: function(d) { var o = d.overlaysUsed || {}; return !!(o.deriv && o.area); }, progress: function(d) { var o = d.overlaysUsed || {}; return ((o.deriv ? 1 : 0) + (o.area ? 1 : 0)) + '/2 overlays'; } }
    ],
    render: function(ctx) {
      // The view row, the preset heading and the legend sit on the HOST
      // surface - white in light and dark, pure BLACK in the contrast theme,
      // where each measured 2.77:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? " text-white" : "";
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (funcGrapher) ──
      return (function() {
          // State initialization guard — ensure funcGrapher state exists
          if (!labToolData || !labToolData.funcGrapher) {
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { funcGrapher: {
                type: 'linear', a: 1, b: 0, c: 0,
                showDeriv: false, showArea: false,
                traceX: 0, showTable: false, showLearn: false,
                compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0,
                aiExplain: '', aiExplainLoading: false
              }});
            });
            // This transient state owns a stable AA pair because dark theme tokens
            // can otherwise resolve to light ink over the host's white tool card.
            return React.createElement('div', { className: 'p-8 text-center', style: { color: '#475569', backgroundColor: '#ffffff' } }, 'Loading...');
          }

          const d = labToolData.funcGrapher;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('funcGrapher', 'init', {
              first: 'Function Grapher loaded. Plot mathematical functions, explore transformations, and visualize equations on an interactive coordinate plane.',
              repeat: 'Function Grapher active.',
              terse: 'Grapher.'
            }, { debounce: 800 });
          }

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, funcGrapher: { ...prev.funcGrapher, [key]: val } }));

          // ── Theme + grade band (shared pattern with waterCycle) ──
          var isContrast = !!ctx.isContrast;
          var isDark = !!ctx.isDark || isContrast;
          var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
          function getGradeBand() {
            var ov = d.fgGradeOverride;
            if (ov && GRADE_BANDS.indexOf(ov) >= 0) return ov;
            var gl = String(gradeLevel || '5th Grade').toLowerCase();
            if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
            if (/3rd|4th|5th/.test(gl)) return '3-5';
            if (/6th|7th|8th/.test(gl)) return '6-8';
            if (/9th|10|11|12|high/.test(gl)) return '9-12';
            return '3-5';
          }
          var gradeBand = getGradeBand();

          // Type setter that also feeds the try_5_families quest hook
          function setFnType(tid) {
            upd('type', tid);
            upd('familiesTried', Object.assign({}, d.familiesTried, { [tid]: true }));
          }

          const W = 440, H = 320, pad = 45;

          const rawRange = d.range || {};
          const finiteBound = (key, fallback) => Number.isFinite(rawRange[key]) ? rawRange[key] : fallback;
          let xMin = finiteBound('xMin', -10), xMax = finiteBound('xMax', 10);
          let yMin = finiteBound('yMin', -10), yMax = finiteBound('yMax', 10);
          if (!(xMax > xMin)) { xMin = -10; xMax = 10; }
          if (!(yMax > yMin)) { yMin = -10; yMax = 10; }

          const xR = { xMin: xMin, xMax: xMax };

          const yR = { yMin: yMin, yMax: yMax };

          const toSX = x => pad + ((x - xR.xMin) / (xR.xMax - xR.xMin)) * (W - 2 * pad);

          const toSY = y => (H - pad) - ((y - yR.yMin) / (yR.yMax - yR.yMin)) * (H - 2 * pad);

          // ── Comparison function evaluator ──
          const evalF2 = d.compare ? function(x) {
            // typeof check, not ||: a2 = 0 must eval as 0 so the curve matches its printed equation
            var ct = d.compareType || 'linear', ca = (typeof d.compareA === 'number' ? d.compareA : 1), cb = d.compareB || 0, cc = d.compareC || 0;
            if (ct === 'linear') return ca * x + cb;
            if (ct === 'quadratic') return ca * x * x + cb * x + cc;
            if (ct === 'trig') return ca * Math.sin(cb * x + cc);
            if (ct === 'cubic') return ca * x * x * x + cb * x + cc;
            if (ct === 'exponential') return ca * Math.pow(Math.E, cb * x) + cc;
            if (ct === 'absolute') return ca * Math.abs(x + cb) + cc;
            if (ct === 'sqrt') return ca * Math.sqrt(x + cb) + cc;
            if (ct === 'log') return ca * Math.log(x + cb) + cc;
            if (ct === 'rational') return ca / (x + cb) + cc;
            return ca * x + cb;
          } : null;



          // Evaluate functions

          const evalF = x => {

            if (d.type === 'linear') return d.a * x + d.b;

            if (d.type === 'quadratic') return d.a * x * x + d.b * x + d.c;

            if (d.type === 'trig') return d.a * Math.sin(d.b * x + d.c);

            if (d.type === 'cubic') return d.a * x * x * x + d.b * x + d.c;

            if (d.type === 'exponential') return d.a * Math.pow(Math.E, d.b * x) + d.c;

            if (d.type === 'absolute') return d.a * Math.abs(x + d.b) + d.c;

            if (d.type === 'sqrt') return d.a * Math.sqrt(x + d.b) + d.c;   // domain x ≥ −b; NaN outside (auto-skipped)

            if (d.type === 'log') return d.a * Math.log(x + d.b) + d.c;     // natural log; domain x > −b

            if (d.type === 'rational') return d.a / (x + d.b) + d.c;        // vertical asymptote at x = −b

            return d.a * x + d.b;

          };

          // Analytic derivatives for the supported function families

          const evalDeriv = x => {
            if(!Number.isFinite(evalF(x)))return NaN;
            if(d.type==='quadratic')return 2*d.a*x+d.b;
            if(d.type==='cubic')return 3*d.a*x*x+d.b;
            if(d.type==='trig')return d.a*d.b*Math.cos(d.b*x+d.c);
            if(d.type==='exponential')return d.a*d.b*Math.exp(d.b*x);
            if(d.type==='absolute')return x+d.b===0?(d.a===0?0:NaN):d.a*Math.sign(x+d.b);
            if(d.type==='sqrt')return x+d.b>0?d.a/(2*Math.sqrt(x+d.b)):NaN;
            if(d.type==='log')return d.a/(x+d.b);
            if(d.type==='rational')return -d.a/((x+d.b)*(x+d.b));
            return d.a;
          };

          // Tangent line at trace point
          var traceCandidate = Number.isFinite(d.traceX) ? d.traceX : Math.max(xR.xMin, Math.min(xR.xMax, 0));
          var traceX = Math.max(xR.xMin, Math.min(xR.xMax, traceCandidate));
          var traceY = evalF(traceX);
          var traceSlope = evalDeriv(traceX);
          var tangentInRange = Number.isFinite(traceSlope) && traceY >= yR.yMin && traceY <= yR.yMax;



          // Generate curve points

          // Curve as break-aware SEGMENTS: any invalid/out-of-range sample ends the current
          // segment so a discontinuity (e.g. a rational's vertical asymptote, or a domain edge of
          // sqrt/log) does NOT draw a spurious connecting line. Each segment renders as its own polyline.
          const segments = [];
          var curSeg = null;

          // The derivative and comparison overlays need the same break-awareness as the
          // main curve: a rational's asymptote (or a domain edge) must END the segment,
          // not get bridged by a spurious connecting line.
          const derivSegs = [];
          var curDSeg = null;

          const areaPts = [];

          const compareSegs = [];
          var curCSeg = null;

          var fgPrevSampleX = null;
          for (var px = 0; px <= W - 2 * pad; px += 2) {

            var x = xR.xMin + (px / (W - 2 * pad)) * (xR.xMax - xR.xMin);

            // A rational's pole at x = -b can fall BETWEEN two samples whose values are
            // both in range (0.5/x: -8.75 then 8.75); that pair must not be joined.
            if (fgPrevSampleX !== null) {
              if (d.type === 'rational' && (x + d.b) * (fgPrevSampleX + d.b) <= 0) { curSeg = null; curDSeg = null; }
              if (evalF2 && d.compareType === 'rational' && (x + (d.compareB || 0)) * (fgPrevSampleX + (d.compareB || 0)) <= 0) curCSeg = null;
            }
            fgPrevSampleX = x;

            var y = evalF(x);

            var dy = evalDeriv(x);

            if (isFinite(y) && y >= yR.yMin && y <= yR.yMax) { if (!curSeg) { curSeg = []; segments.push(curSeg); } curSeg.push(toSX(x) + ',' + toSY(y)); } else { curSeg = null; }

            if (isFinite(dy) && dy >= yR.yMin && dy <= yR.yMax) { if (!curDSeg) { curDSeg = []; derivSegs.push(curDSeg); } curDSeg.push(toSX(x) + ',' + toSY(dy)); } else { curDSeg = null; }

            if (d.showArea && y >= yR.yMin && y <= yR.yMax && x >= 0) areaPts.push({ sx: toSX(x), sy: toSY(y) });

            if (evalF2) { var y2c = evalF2(x); if (isFinite(y2c) && y2c >= yR.yMin && y2c <= yR.yMax) { if (!curCSeg) { curCSeg = []; compareSegs.push(curCSeg); } curCSeg.push(toSX(x) + ',' + toSY(y2c)); } else { curCSeg = null; } }

          }



          // Roots come from the shared root engine (the calculator's scanner): the chips, the
          // description and the sound all use this one list, window-edge roots included.
          var roots = [];
          var fgCore = window.StemLab && window.StemLab._graphAccess;
          var fgZeros = fgCore && fgCore.zerosOf ? fgCore.zerosOf(evalF, xR.xMin, xR.xMax) : { xs: [] };
          roots = (fgZeros.xs || []).slice();

          // Critical points (extrema): where f'(x) changes sign — local max/min
          var critPts = [];
          for (var cx2 = xR.xMin; cx2 < xR.xMax; cx2 += 0.05) {
            var d1 = evalDeriv(cx2), d2 = evalDeriv(cx2 + 0.05);
            if (d1 * d2 < 0) {
              // Bisect on the sign of f': linear interpolation put the |x| corner 0.025 off,
              // labelled "min (-0.0, 0.03)" instead of (0, 0).
              var fgBisLo = cx2, fgBisHi = cx2 + 0.05;
              for (var fgBisI = 0; fgBisI < 60; fgBisI++) { var fgBisMid = (fgBisLo + fgBisHi) / 2; if (evalDeriv(fgBisMid) * d1 > 0) fgBisLo = fgBisMid; else fgBisHi = fgBisMid; }
              var cpX = (fgBisLo + fgBisHi) / 2;
              if (Math.abs(cpX) < 1e-9) cpX = 0;
              var cpY = evalF(cpX);
              if (cpY >= yR.yMin && cpY <= yR.yMax && cpX >= xR.xMin && cpX <= xR.xMax) {
                critPts.push({ x: cpX, y: cpY, kind: d1 > 0 ? 'max' : 'min' });
              }
            }
          }
          // Touching roots (x², |x|, sin x − 1) come from the engine's |f| minimum search.

          // Numerical integral of f from 0 to xR.xMax (trapezoidal) — shown when Area is on
          var integral0ToMax = 0;
          var integralDefined = xR.xMax >= 0;
          var integralReason = xR.xMax < 0 ? __alloT('stem.funcgrapher.integral_nonnegative_endpoint','Choose a right endpoint at or above 0 for this overlay.') : '';
          if (d.showArea && xR.xMax > 0) {
            // A rational's asymptote inside [0, xMax] makes the integral improper and
            // divergent — no finite number is honest there.
            if (d.type === 'rational' && (-d.b) >= 0 && (-d.b) <= xR.xMax) {integralDefined = false;integralReason=d.a===0?__alloT('stem.funcgrapher.integral_undefined_point','The expression is undefined at a point in this interval.'):__alloT('stem.funcgrapher.integral_pole','The integral diverges at the vertical asymptote.');}
            if((d.type==='sqrt'&&d.b<0)||(d.type==='log'&&d.b<=0)){integralDefined=false;integralReason=__alloT('stem.funcgrapher.integral_domain_limit','The interval includes values outside the real domain or an endpoint requiring an improper-integral calculation.');}
            var iSteps = 200, iLo = 0, iHi = xR.xMax;
            var iH = (iHi - iLo) / iSteps;
            for (var ii = 0; ii < iSteps; ii++) {
              var xa = iLo + ii * iH, xb = xa + iH;
              var fa = evalF(xa), fb = evalF(xb);
              if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
                if (integralDefined) integralReason = __alloT('stem.funcgrapher.integral_numeric_range','A sampled value is outside the numerical range. Try a smaller interval or coefficients.');
                integralDefined = false; break;
              }
              integral0ToMax += (fa + fb) * iH / 2;
            }
            if (!Number.isFinite(integral0ToMax)) { integralDefined = false; integralReason = __alloT('stem.funcgrapher.integral_numeric_range','A sampled value is outside the numerical range. Try a smaller interval or coefficients.'); }
          }



          // Y-intercept

          var yIntercept = evalF(0);



          // Build equation string (clean formatting — suppress ×1, +0, etc.)
          function fmtCoeff(val, varPart, isFirst) {
            if (val === 0) return '';
            var s = '';
            if (isFirst) {
              if (val === -1 && varPart) s = '-';
              else if (val === 1 && varPart) s = '';
              else s = '' + val;
            } else {
              if (val < 0) {
                if (val === -1 && varPart) s = ' - ';
                else s = ' - ' + Math.abs(val);
              } else {
                if (val === 1 && varPart) s = ' + ';
                else s = ' + ' + val;
              }
            }
            return s + varPart;
          }
          function fmtConst(val, isFirst) {
            if (val === 0) return '';
            if (isFirst) return '' + val;
            return val < 0 ? ' - ' + Math.abs(val) : ' + ' + val;
          }

          var eqStr = 'f(x) = ';
          if (d.type === 'linear') {
            var parts = fmtCoeff(d.a, 'x', true) + fmtConst(d.b, d.a === 0);
            eqStr += parts || '0';
          } else if (d.type === 'quadratic') {
            var parts = fmtCoeff(d.a, 'x\u00B2', true) + fmtCoeff(d.b, 'x', d.a === 0) + fmtConst(d.c, d.a === 0 && d.b === 0);
            eqStr += parts || '0';
          } else if (d.type === 'trig') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var freq = d.b === 1 ? 'x' : d.b === -1 ? '-x' : d.b + 'x';
            var phase = d.c === 0 ? '' : d.c > 0 ? ' + ' + d.c : ' - ' + Math.abs(d.c);
            eqStr += amp + 'sin(' + freq + phase + ')';
          } else if (d.type === 'cubic') {
            var parts = fmtCoeff(d.a, 'x\u00B3', true) + fmtCoeff(d.b, 'x', d.a === 0) + fmtConst(d.c, d.a === 0 && d.b === 0);
            eqStr += parts || '0';
          } else if (d.type === 'exponential') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var exp = d.b === 1 ? 'x' : d.b === -1 ? '-x' : d.b + 'x';
            eqStr += amp + 'e^(' + exp + ')' + fmtConst(d.c, false);
          } else if (d.type === 'absolute') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += amp + '|' + inner + '|' + fmtConst(d.c, false);
          } else if (d.type === 'sqrt') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += amp + '√(' + inner + ')' + fmtConst(d.c, false);
          } else if (d.type === 'log') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += amp + 'ln(' + inner + ')' + fmtConst(d.c, false);
          } else if (d.type === 'rational') {
            var num = d.a === -1 ? '-1' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += num + '/(' + inner + ')' + fmtConst(d.c, false);
          }

          // Build comparison equation string
          var eqStr2 = '';
          if (d.compare) {
            var ca = (typeof d.compareA === 'number' ? d.compareA : 1), cb = d.compareB || 0, cc = d.compareC || 0, ct = d.compareType || 'linear';
            eqStr2 = 'g(x) = ';
            if (ct === 'linear') { var p = fmtCoeff(ca, 'x', true) + fmtConst(cb, ca === 0); eqStr2 += p || '0'; }
            else if (ct === 'quadratic') { var p = fmtCoeff(ca, 'x\u00B2', true) + fmtCoeff(cb, 'x', ca === 0) + fmtConst(cc, ca === 0 && cb === 0); eqStr2 += p || '0'; }
            else if (ct === 'trig') { eqStr2 += (ca === 1 ? '' : ca === -1 ? '-' : ca) + 'sin(' + (cb === 1 ? 'x' : cb + 'x') + (cc === 0 ? '' : cc > 0 ? ' + ' + cc : ' - ' + Math.abs(cc)) + ')'; }
            else if (ct === 'cubic') { var p = fmtCoeff(ca, 'x\u00B3', true) + fmtCoeff(cb, 'x', ca === 0) + fmtConst(cc, ca === 0 && cb === 0); eqStr2 += p || '0'; }
            else if (ct === 'exponential') { eqStr2 += (ca === 1 ? '' : ca) + 'e^(' + (cb === 1 ? 'x' : cb + 'x') + ')' + fmtConst(cc, false); }
            else if (ct === 'absolute') { eqStr2 += (ca === 1 ? '' : ca) + '|' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + '|' + fmtConst(cc, false); }
            else if (ct === 'sqrt') { eqStr2 += (ca === 1 ? '' : ca === -1 ? '-' : ca) + '√(' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + ')' + fmtConst(cc, false); }
            else if (ct === 'log') { eqStr2 += (ca === 1 ? '' : ca === -1 ? '-' : ca) + 'ln(' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + ')' + fmtConst(cc, false); }
            else if (ct === 'rational') { eqStr2 += (ca === -1 ? '-1' : ca) + '/(' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + ')' + fmtConst(cc, false); }
          }

          // An open challenge must not show its own answer; it is revealed once answered.
          var fgOpenMode = (d.fgQuiz && typeof d.fgQuiz === 'object' && !Array.isArray(d.fgQuiz) && typeof d.fgQuiz.mode === 'string' && !d.fgQuiz.answered) ? d.fgQuiz.mode : '';
          var hideRootAnswer = fgOpenMode === 'root', hideYIntAnswer = fgOpenMode === 'yint', hideFamilyAnswer = fgOpenMode === 'name';
          // Anything that names the family or gives a coefficient away waits for the answer.
          var fgQuizLeaks = hideRootAnswer || hideYIntAnswer || hideFamilyAnswer;
          // The trace starts at x = 0, where its readout would print f(0): hidden until the student moves it.
          var fgTraceHidden = (hideRootAnswer || hideYIntAnswer) && !(d.fgQuiz && d.fgQuiz.traceMoved === true);
          function fgFill(s, map) { return String(s).replace(/\{(\w+)\}/g, function(m, k) { return map && map[k] != null ? String(map[k]) : m; }); }

          // ── Describe and Hear (shared _graphAccess core): the current function ──
          var GA = window.StemLab && window.StemLab._graphAccess;
          var fgPal = GA ? GA.palette(isContrast ? 'contrast' : isDark ? 'dark' : 'light') : null;
          var fgSamples = GA ? GA.sample(evalF, xR.xMin, xR.xMax, 201) : [];
          // Zeros: the same engine list as the chips (window-edge roots such as sin x at ±2π included).
          var fgDesc = GA ? GA.describeGraph(fgSamples, { t: __alloT, name: hideFamilyAnswer ? 'f(x)' : eqStr, evaluate: evalF, zeros: fgZeros.xs, ymin: yR.yMin, ymax: yR.yMax, hide: { zeros: hideRootAnswer, yIntercept: hideYIntAnswer } }) : null;
          var fgPoints = fgDesc ? GA.explorePoints(fgSamples, fgDesc, __alloT) : [];
          var fgGaIdx = typeof d._gaIdx === 'number' && d._gaIdx >= 0 && d._gaIdx < fgPoints.length ? d._gaIdx : -1;
          var fgGaPoint = fgGaIdx >= 0 ? fgPoints[fgGaIdx] : null;
          // The main curve keeps its long-standing indigo (6.3:1 on white, 6.9:1 on slate); yellow in contrast.
          var fgCurve = { color: isContrast ? '#ffff00' : isDark ? '#818cf8' : '#4f46e5', dash: [] };
          var fgDerivCurve = fgPal ? fgPal.curve(3) : { color: '#f59e0b', dash: [6, 3] };
          var fgCompareCurve = fgPal ? fgPal.curve(5) : { color: '#c2410c', dash: [8, 4] };
          var fgGridInk = fgPal ? fgPal.grid : (isDark ? '#1e293b' : '#e2e8f0');
          var fgLabelInk = fgPal ? fgPal.label : (isDark ? '#94a3b8' : '#64748b');
          var fgAxisInk = fgPal ? fgPal.axis : (isDark ? '#94a3b8' : '#64748b');

          // The current function in Graphing Calculator syntax (ln is natural log there).
          function fgCalcExpr() {
            function n(v) { var r = Number(Number(v).toPrecision(12)); return isFinite(r) && r !== 0 ? r : 0; }
            var A = n(d.a), B = n(d.b), C = n(d.c);
            function poly(terms) {
              var s = '';
              terms.forEach(function(tm) {
                var v = tm[0], term = tm[1]; if (!v) return;
                var mag = Math.abs(v), body = term ? (mag === 1 ? term : mag + '*' + term) : String(mag);
                s += s ? (v < 0 ? ' - ' : ' + ') + body : (v < 0 ? '-' : '') + body;
              });
              return s || '0';
            }
            function amp(v) { return v === 1 ? '' : v === -1 ? '-' : v + '*'; }
            var tail = C ? (C < 0 ? ' - ' + Math.abs(C) : ' + ' + C) : '', shifted = poly([[1, 'x'], [B, '']]);
            if (d.type === 'quadratic') return poly([[A, 'x^2'], [B, 'x'], [C, '']]);
            if (d.type === 'cubic') return poly([[A, 'x^3'], [B, 'x'], [C, '']]);
            if (d.type === 'trig') return amp(A) + 'sin(' + poly([[B, 'x'], [C, '']]) + ')';
            if (d.type === 'exponential') return amp(A) + 'e^(' + poly([[B, 'x']]) + ')' + tail;
            if (d.type === 'absolute') return amp(A) + 'abs(' + shifted + ')' + tail;
            if (d.type === 'sqrt') return amp(A) + 'sqrt(' + shifted + ')' + tail;
            if (d.type === 'log') return amp(A) + 'ln(' + shifted + ')' + tail;
            if (d.type === 'rational') return A + '/(' + shifted + ')' + tail;
            return poly([[A, 'x'], [B, '']]);
          }
          // Hand the function to Graphing Calculator: write its row, request the plugin
          // (activating a tool does not load it), then switch.
          function fgOpenInCalculator() {
            var expr = fgCalcExpr();
            setLabToolData(function(prev) {
              var gc = Object.assign({}, prev.graphCalc && typeof prev.graphCalc === 'object' ? prev.graphCalc : {});
              var colors = ['#38bdf8', '#f472b6', '#34d399', '#fbbf24', '#a78bfa', '#fb923c'];
              var rows = Array.isArray(gc.funcs) && gc.funcs.length ? gc.funcs.slice() : colors.map(function(c) { return { expr: '', color: c }; });
              var slot = -1;
              rows.forEach(function(r, i) { if (slot < 0 && r && r.expr === expr) slot = i; });
              rows.forEach(function(r, i) { if (slot < 0 && (!r || typeof r.expr !== 'string' || !r.expr.trim())) slot = i; });
              if (slot < 0) slot = rows.length - 1;
              rows[slot] = Object.assign({ color: colors[slot % 6] }, rows[slot], { expr: expr });
              Object.assign(gc, { funcs: rows, _gaFn: slot, focusedInput: slot, _gaIdx: -1, window: { xmin: xR.xMin, xmax: xR.xMax, ymin: yR.yMin, ymax: yR.yMax } });
              return Object.assign({}, prev, { graphCalc: gc });
            });
            try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') Promise.resolve(window.__alloEnsureStemPluginLoaded('graphCalc')).catch(function() {}); } catch (e) {}
            if (typeof announceToSR === 'function') announceToSR(fgFill(__alloT('stem.funcgrapher.opening_calculator', 'Opening Graphing Calculator with y = {expr}.'), { expr: expr }));
            if (typeof setStemLabTool === 'function') setStemLabTool('graphCalc');
          }

          // ── Stage B: styles for the shared core panels, the stage, rate of change, features ──
          var fgInk = isContrast ? '#ffffff' : ctx.isDark ? '#e2e8f0' : '#0f172a', fgSurface = isContrast ? '#000000' : ctx.isDark ? '#0f172a' : '#ffffff', fgEdge = isContrast ? '#facc15' : '#64748b';
          var fgBtn = { minHeight: 44, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + fgEdge, background: fgSurface, color: fgInk, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%' };
          var fgCoreStyles = {
            wrap: { marginTop: 12, padding: 12, borderRadius: 12, border: '1px solid ' + fgEdge, background: fgSurface, color: fgInk, overflowWrap: 'anywhere' },
            button: fgBtn, text: { color: fgInk, fontSize: 14 }, help: { color: fgInk, fontSize: 12 },
            card: { border: '1px solid ' + fgEdge, background: fgSurface, color: fgInk },
            input: { padding: '6px 8px', borderRadius: 6, border: '1px solid ' + fgEdge, background: fgSurface, color: fgInk, fontSize: 14, boxSizing: 'border-box' }
          };
          // Function Zoo canvas colours per theme (light, dark, contrast); each label meets 4.5:1 on its background.
          var fgZooPal = isContrast ? { theme: 'contrast', bg: '#000000', axis: '#ffffff', bead: '#ffffff', glow: false, curves: ['#ffff00', '#00ffff', '#ffffff', '#ff80ff', '#80ff80', '#ffb366'] }
            : ctx.isDark ? { theme: 'dark', bg: '#020210', axis: '#64748b', bead: '#ffffff', glow: true, curves: ['#7dd3fc', '#fbbf24', '#10b981', '#f87171', '#a78bfa', '#f472b6'] }
            : { theme: 'light', bg: '#ffffff', axis: '#64748b', bead: '#0f172a', glow: false, curves: ['#1d4ed8', '#b45309', '#047857', '#b91c1c', '#6d28d9', '#be185d'] };
          // Merge a patch into one object-valued key of this tool's state.
          function fgSet(key, patch) {
            setLabToolData(function(prev) {
              var cur = prev.funcGrapher && prev.funcGrapher[key], next = {};
              next[key] = Object.assign({}, cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}, patch);
              return Object.assign({}, prev, { funcGrapher: Object.assign({}, prev.funcGrapher, next) });
            });
          }
          var fgIsTeacher = !!ctx.isTeacherMode;
          var FG_STAGES = ['explore', 'practice', 'investigate'].concat(fgIsTeacher ? ['teacher'] : []);
          // Saved work picks the stage until the student chooses one; fgStage is not a host remount key.
          var fgStage = FG_STAGES.indexOf(d.fgStage) >= 0 ? d.fgStage
            : (d.fgQuiz || typeof d.fgChallengeMode === 'string') ? 'practice'
            : (d._waveHunt || d.secantResult || d.secantPrediction || d.improperRows || d.improperPrediction) ? 'investigate' : 'explore';
          // Text in the SVGs keeps 12 CSS px on a phone: the measured px-per-unit scale enlarges it.
          var fgTextScale = typeof d._svgScale === 'number' && isFinite(d._svgScale) ? Math.max(1, Math.min(2.5, d._svgScale)) : 1;
          function fgFs(px) { return (Math.round(px * fgTextScale * 10) / 10) + 'px'; }
          function fgMeasure(node) {
            if (!node || typeof node.getBoundingClientRect !== 'function') return;
            var r = node.getBoundingClientRect();
            if (!r || !r.width || !r.height) return;
            var s = Math.min(r.width / W, r.height / H), want = s > 0 && s < 1 ? Math.round(100 / s) / 100 : 1;
            if (Math.abs(want - fgTextScale) > 0.04) upd('_svgScale', want);
          }
          // Average rate of change between two points (shared core), dragged on the graph or set by keys.
          var fgRoc = d.roc && typeof d.roc === 'object' && !Array.isArray(d.roc) ? d.roc : {};
          var rocOn = !!fgRoc.on && fgStage === 'explore' && !fgQuizLeaks && !!GA;
          function fgRocDefault(v, frac) { return v >= xR.xMin && v <= xR.xMax ? v : Math.round((xR.xMin + (xR.xMax - xR.xMin) * frac) * 10) / 10; }
          var rocX1 = Number.isFinite(fgRoc.x1) ? Math.max(xR.xMin, Math.min(xR.xMax, fgRoc.x1)) : fgRocDefault(1, 0.4);
          var rocX2 = Number.isFinite(fgRoc.x2) ? Math.max(xR.xMin, Math.min(xR.xMax, fgRoc.x2)) : fgRocDefault(3, 0.6);
          var rocPts = rocOn ? GA.rateOfChange(evalF, rocX1, rocX2) : null;
          var rocKey = JSON.stringify([d.type, d.a, d.b, d.c, rocX1, rocX2]);
          // XP for a rate the student calculated: once per point pair, at most ten pairs.
          function fgRocCorrect(key) {
            var paid = Array.isArray(fgRoc.paid) ? fgRoc.paid : [];
            if (paid.indexOf(key) >= 0) return;
            fgSet('roc', { paid: paid.concat([key]).slice(-40) });
            if (paid.length < 10 && typeof awardStemXP === 'function') awardStemXP('funcGrapher', 3, 'Rate of change calculated');
          }
          function fgPointerX(e) {
            var r = e.currentTarget.getBoundingClientRect(), s = r && r.width && r.height ? Math.min(r.width / W, r.height / H) : 0;
            if (!s) return null;
            var vx = (e.clientX - (r.left + (r.width - W * s) / 2)) / s;
            return xR.xMin + (vx - pad) / (W - 2 * pad) * (xR.xMax - xR.xMin);
          }
          function fgRocPointer(e, phase) {
            if (!rocOn) return;
            if (phase === 'up') { _fgRocDrag = null; return; }
            var x = fgPointerX(e);
            if (x === null || !isFinite(x)) return;
            x = Math.max(xR.xMin, Math.min(xR.xMax, Math.round(x * 10) / 10));
            if (phase === 'down') { _fgRocDrag = Math.abs(x - rocX1) <= Math.abs(x - rocX2) ? 'x1' : 'x2'; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
            else if (!_fgRocDrag || (e.pointerType === 'mouse' && e.buttons !== 1)) return;
            var p = {}; p[_fgRocDrag] = x; fgSet('roc', p);
          }
          // Domain, range and key features: exact, from the family rule.
          var fgKf = d.kf && typeof d.kf === 'object' && !Array.isArray(d.kf) ? d.kf : {};
          var fgKfInfo = GA ? GA.familyFeatures(d.type, d.a, d.b, d.c) : null;

          // ── Transformation labels ──
          var transformLabels = [];
          if (d.a !== 1 && d.a !== 0) {
            if (d.a === -1) transformLabels.push({ text: __alloT('stem.funcgrapher.reflected_over_x_axis', 'Reflected over x-axis'), color: 'text-rose-700 bg-rose-50 border-rose-200' });
            else if (d.a < 0) transformLabels.push({ text: 'Reflected & scaled \u00D7' + Math.abs(d.a), color: 'text-rose-700 bg-rose-50 border-rose-200' });
            else if (Math.abs(d.a) > 1) transformLabels.push({ text: 'Vertical stretch \u00D7' + d.a, color: 'text-violet-600 bg-violet-50 border-violet-200' });
            else transformLabels.push({ text: 'Vertical compression \u00D7' + d.a, color: 'text-violet-600 bg-violet-50 border-violet-200' });
          }
          if (d.type === 'trig' && d.b !== 0 && d.b !== 1) {
            transformLabels.push({ text: 'Period = 2\u03C0/' + Math.abs(d.b).toFixed(1), color: 'text-sky-700 bg-sky-50 border-sky-200' });
          }
          if (d.type === 'linear' && d.a !== 0) {
            transformLabels.push({ text: 'Slope = ' + d.a, color: 'text-blue-600 bg-blue-50 border-blue-200' });
          }
          if (d.c !== 0 && d.type === 'trig') {
            // In a·sin(bx + c) the c moves the wave sideways by −c/b (no shift when b = 0).
            var fgPhaseShift = d.b !== 0 ? -d.c / d.b : 0;
            if (fgPhaseShift !== 0) transformLabels.push({ text: (fgPhaseShift < 0 ? __alloT('stem.funcgrapher.trig_phase_shift_left', 'Phase shift −c/b: left ') : __alloT('stem.funcgrapher.trig_phase_shift_right', 'Phase shift −c/b: right ')) + Number(Math.abs(fgPhaseShift).toFixed(2)) + __alloT('stem.funcgrapher.trig_phase_shift_units', ' units'), color: 'text-teal-700 bg-teal-50 border-teal-200' });
          } else if (d.c !== 0 && d.type !== 'linear') {
            transformLabels.push({ text: 'Shifted ' + (d.c > 0 ? 'up' : 'down') + ' ' + Math.abs(d.c) + ' units', color: 'text-teal-700 bg-teal-50 border-teal-200' });
          }
          if (d.b !== 0 && d.type === 'linear') {
            transformLabels.push({ text: 'y-intercept = ' + d.b, color: 'text-green-700 bg-green-50 border-green-200' });
          }
          // Key-feature chips for the function families (domain restrictions + asymptotes + vertex)
          if (d.type === 'quadratic' && d.a !== 0) {
            transformLabels.push({ text: 'Vertex at x = ' + (-d.b / (2 * d.a)).toFixed(2), color: 'text-indigo-600 bg-indigo-50 border-indigo-200' });
          }
          if (d.type === 'sqrt') {
            transformLabels.push({ text: 'Domain: x ≥ ' + (-d.b), color: 'text-amber-800 bg-amber-50 border-amber-200' });
          }
          if (d.type === 'log') {
            transformLabels.push({ text: 'Domain: x > ' + (-d.b) + ' · asymptote x = ' + (-d.b), color: 'text-amber-800 bg-amber-50 border-amber-200' });
          }
          if (d.type === 'rational') {
            transformLabels.push({ text: 'Vertical asymptote: x = ' + (-d.b), color: 'text-rose-700 bg-rose-50 border-rose-200' });
            transformLabels.push({ text: 'Horizontal asymptote: y = ' + d.c, color: 'text-rose-700 bg-rose-50 border-rose-200' });
          }



          // Function type presets

          var TYPES = [

            { id: 'linear', label: t('stem.func_grapher.linear', 'Linear'), emoji: '\u2571' },

            { id: 'quadratic', label: t('stem.func_grapher.quadratic', 'Quadratic'), emoji: '\u2229' },

            { id: 'cubic', label: t('stem.func_grapher.cubic', 'Cubic'), emoji: '\u223F' },

            { id: 'trig', label: t('stem.func_grapher.trig', 'Trig'), emoji: '\u223C' },

            { id: 'exponential', label: t('stem.func_grapher.exponential', 'Exponential'), emoji: '\uD83D\uDCC8' },

            { id: 'absolute', label: t('stem.func_grapher.absolute', 'Absolute'), emoji: '\u22C0' },

            { id: 'sqrt', label: __alloT('stem.funcgrapher.square_root', 'Square Root'), emoji: '\u221A' },

            { id: 'log', label: __alloT('stem.funcgrapher.logarithm', 'Logarithm'), emoji: 'ln' },

            { id: 'rational', label: __alloT('stem.funcgrapher.rational', 'Rational'), emoji: '\u00F7' }

          ];

          var activeType = TYPES.filter(function(tp) { return tp.id === d.type; })[0] || TYPES[0];
          var familiesTriedCount = Object.keys(d.familiesTried || {}).length;
          var evidenceCount = roots.length + (yIntercept >= yR.yMin && yIntercept <= yR.yMax ? 1 : 0) + critPts.length;
          var overlayCount = (d.showDeriv ? 1 : 0) + (d.showArea ? 1 : 0) + (d.showTable ? 1 : 0);
          var nextMove = familiesTriedCount < 2
            ? 'Compare a second function family and notice what stays the same.'
            : overlayCount === 0
              ? 'Turn on the table or derivative to connect the graph to numerical evidence.'
              : 'Move the trace point and explain how the value and slope change together.';



          // ── Rate of change on the main graph: A, B, the secant and the slope triangle ──
          var fgNum = GA ? GA.formatNumber : function(v) { return String(Math.round(v * 100) / 100); };
          var fgRocLabel = rocPts && rocPts.rate !== null ? fgFill(__alloT('stem.funcgrapher.roc_graph_label', 'Points A ({x1}, {y1}) and B ({x2}, {y2}) are marked, joined by a dashed secant with its slope triangle.'), { x1: fgNum(rocPts.x1), y1: fgNum(rocPts.y1), x2: fgNum(rocPts.x2), y2: fgNum(rocPts.y2) }) : '';
          function fgRocOverlay() {
            if (!rocPts || rocPts.dy === null) return null;
            if (!(rocPts.y1 >= yR.yMin && rocPts.y1 <= yR.yMax && rocPts.y2 >= yR.yMin && rocPts.y2 <= yR.yMax)) return null;
            var ax = toSX(rocPts.x1), ay = toSY(rocPts.y1), bx = toSX(rocPts.x2), by = toSY(rocPts.y2);
            var ink = fgPal ? fgPal.curve(4).color : '#6d28d9', near = bx > W - 90;
            var lbl = { fill: fgLabelInk, style: { fontSize: fgFs(12), fontWeight: 'bold' } };
            return h('g', { 'data-funcgrapher-rate-overlay': true, 'aria-hidden': 'true' },
              h('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: ink, strokeWidth: 2.5, strokeDasharray: '6 4' }),
              h('line', { 'data-rate-leg': 'dx', x1: ax, y1: ay, x2: bx, y2: ay, stroke: ink, strokeWidth: 2 }),
              h('line', { 'data-rate-leg': 'dy', x1: bx, y1: ay, x2: bx, y2: by, stroke: ink, strokeWidth: 2 }),
              h('text', Object.assign({ x: (ax + bx) / 2, y: ay + (by < ay ? 16 : -6), textAnchor: 'middle' }, lbl), 'Δx = ' + fgNum(rocPts.dx)),
              h('text', Object.assign({ x: near ? bx - 8 : bx + 8, y: (ay + by) / 2 + 4, textAnchor: near ? 'end' : 'start' }, lbl), 'Δy = ' + fgNum(rocPts.dy)),
              [['A', ax, ay], ['B', bx, by]].map(function(pt) { return h('g', { key: pt[0] }, h('circle', { 'data-rate-handle': pt[0], cx: pt[1], cy: pt[2], r: 7, fill: fgSurface, stroke: ink, strokeWidth: 3 }), h('text', Object.assign({ x: pt[1] - 4, y: pt[2] - 11 }, lbl), pt[0])); }));
          }
          function fgPanelToggle(open, onClick, label, id, extra) {
            return h('button', Object.assign({ type: 'button', 'aria-expanded': open, 'aria-controls': open ? id : undefined, onClick: onClick, style: Object.assign({}, fgBtn, open ? { borderWidth: 3 } : null) }, extra || {}), label);
          }
          function fgRenderRate() {
            if (!GA) return null;
            var open = !!fgRoc.on;
            return h('div', { 'data-funcgrapher-rate': true, style: { marginTop: 12 } },
              fgPanelToggle(open, function() { fgSet('roc', { on: !open }); }, open ? __alloT('stem.funcgrapher.roc_close', 'Hide rate of change') : __alloT('stem.funcgrapher.roc_open', 'Average rate of change between two points'), 'fg-rate'),
              open ? h('div', { id: 'fg-rate' }, fgQuizLeaks ? h('p', { style: Object.assign({ margin: '8px 0 0' }, fgCoreStyles.text) }, __alloT('stem.funcgrapher.panel_hidden_quiz', 'Hidden while a challenge question is open: it would give the answer away.'))
                : GA.ratePanel(React, { id: 'fg-rate-panel', t: __alloT, evaluate: evalF, name: eqStr, key: rocKey, x1: rocX1, x2: rocX2, min: xR.xMin, max: xR.xMax, step: 0.1, state: fgRoc, onSet: function(p) { fgSet('roc', p); }, onCorrect: fgRocCorrect, announce: announceToSR, styles: fgCoreStyles })) : null);
          }
          function fgRenderFeatures() {
            if (!GA) return null;
            var open = !!fgKf.on;
            return h('div', { 'data-funcgrapher-features': true, style: { marginTop: 12 } },
              fgPanelToggle(open, function() { fgSet('kf', { on: !open }); }, open ? __alloT('stem.funcgrapher.kf_close', 'Hide domain, range and key features') : __alloT('stem.funcgrapher.kf_open', 'Domain, range and key features'), 'fg-features'),
              open ? h('div', { id: 'fg-features' }, fgQuizLeaks ? h('p', { style: Object.assign({ margin: '8px 0 0' }, fgCoreStyles.text) }, __alloT('stem.funcgrapher.panel_hidden_quiz', 'Hidden while a challenge question is open: it would give the answer away.'))
                : GA.featuresPanel(React, { id: 'fg-features-panel', t: __alloT, info: fgKfInfo, key: JSON.stringify([d.type, d.a, d.b, d.c]), state: fgKf, onSet: function(p) { fgSet('kf', p); }, announce: announceToSR, styles: fgCoreStyles })) : null);
          }
          // ── Mode bar: Explore / Practice / Investigate (+ Teacher), a tablist like Fraction Lab's ──
          function fgModeBar() {
            var LABELS = { explore: __alloT('stem.funcgrapher.stage_explore', 'Explore'), practice: __alloT('stem.funcgrapher.stage_practice', 'Practice'), investigate: __alloT('stem.funcgrapher.stage_investigate', 'Investigate'), teacher: __alloT('stem.funcgrapher.stage_teacher', 'Teacher') };
            var NOTES = { explore: __alloT('stem.funcgrapher.stage_explore_note', 'Rate of change, key features, compare and transform'), practice: __alloT('stem.funcgrapher.stage_practice_note', 'Challenges, transformation targets and worked examples'), investigate: __alloT('stem.funcgrapher.stage_investigate_note', 'Secant slopes, unbounded area and waves'), teacher: __alloT('stem.funcgrapher.stage_teacher_note', 'Assign work and collect results') };
            function go(id) { upd('fgStage', id); if (typeof announceToSR === 'function') announceToSR(LABELS[id] + '. ' + NOTES[id]); }
            function nav(e, i) {
              var n = FG_STAGES.length, next = -1;
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + n - 1) % n;
              else if (e.key === 'Home') next = 0;
              else if (e.key === 'End') next = n - 1;
              if (next < 0) return;
              e.preventDefault();
              var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
              if (tabs[next]) tabs[next].focus();
              go(FG_STAGES[next]);
            }
            var activeBg = isContrast ? '#ffff00' : ctx.isDark ? '#312e81' : '#e0e7ff', activeInk = isContrast ? '#000000' : fgInk;
            return h('div', { 'data-funcgrapher-modebar': true, style: { marginTop: 16, padding: 8, borderRadius: 12, border: '1px solid ' + fgEdge, background: fgSurface, color: fgInk } },
              h('div', { role: 'tablist', 'aria-label': __alloT('stem.funcgrapher.stage_label', 'Function Grapher sections'), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 6 } },
                FG_STAGES.map(function(id, i) {
                  var on = id === fgStage;
                  return h('button', { key: id, type: 'button', role: 'tab', id: 'fg-stage-tab-' + id, 'data-funcgrapher-stage-tab': id, 'aria-selected': on, 'aria-controls': 'fg-stage-panel', tabIndex: on ? 0 : -1, onClick: function() { go(id); }, onKeyDown: function(e) { nav(e, i); },
                    style: Object.assign({}, fgBtn, { textAlign: 'left', background: on ? activeBg : fgSurface, color: on ? activeInk : fgInk, borderWidth: on ? 3 : 1, fontWeight: on ? 800 : 600 }) },
                    h('span', { style: { display: 'block', fontSize: 15 } }, LABELS[id]), h('span', { style: { display: 'block', fontSize: 12, fontWeight: 500 } }, NOTES[id]));
                })));
          }
          // ── Teacher (teacher mode only): assign targets and match items, collect results ──
          function fgProgressRows() {
            var kfShown = fgKf.revealed && typeof fgKf.revealed === 'object' ? Object.keys(fgKf.revealed).filter(function(k) { return fgKf.revealed[k]; }).length : 0;
            var tried = Object.keys(d.familiesTried || {});
            var done = Array.isArray(d.tfDone) ? d.tfDone : [];
            return [
              [__alloT('stem.funcgrapher.pr_score', 'Challenges answered correctly'), d.fgScore || 0],
              [__alloT('stem.funcgrapher.pr_streak', 'Current streak'), d.fgStreak || 0],
              [__alloT('stem.funcgrapher.pr_myths', 'True-or-false myths answered'), d.fgMythsDone || 0],
              [__alloT('stem.funcgrapher.pr_match', 'Match 4 Ways questions started'), typeof d.fgMatchTurn === 'number' ? d.fgMatchTurn : 0],
              [__alloT('stem.funcgrapher.pr_families', 'Function families explored'), tried.length + (tried.length ? ' (' + tried.join(', ') + ')' : '')],
              [__alloT('stem.funcgrapher.pr_targets', 'Transformation targets matched'), done.length + (done.length ? ' (' + done.join('; ') + ')' : '')],
              [__alloT('stem.funcgrapher.pr_rates', 'Rates of change calculated'), Array.isArray(fgRoc.paid) ? fgRoc.paid.length : 0],
              [__alloT('stem.funcgrapher.pr_features', 'Key features revealed for the current function'), kfShown],
              [__alloT('stem.funcgrapher.pr_secant', 'Secant investigation computed'), d.secantResult ? __alloT('stem.funcgrapher.pr_yes', 'yes') : __alloT('stem.funcgrapher.pr_no', 'no')],
              [__alloT('stem.funcgrapher.pr_improper', 'Unbounded-area trials recorded'), Array.isArray(d.improperRows) ? d.improperRows.length : 0],
              [__alloT('stem.funcgrapher.pr_wave', 'Wave settings saved'), d._waveHunt && Array.isArray(d._waveHunt.log) ? d._waveHunt.log.length : 0]
            ];
          }
          function fgReportMarkdown() {
            var lines = ['# ' + __alloT('stem.funcgrapher.report_title', 'Function Grapher progress'), new Date().toISOString(), '', fgProgressRows().map(function(r) { return '- ' + r[0] + ': ' + r[1]; }).join('\n')];
            if (d.secantResult && d.secantResult.ok) lines.push('', fgSecantMarkdown(d.secantResult, d.secantReflection, !!d.secantReveal));
            return lines.join('\n');
          }
          function fgRenderTeacher() {
            if (!fgIsTeacher) return null;
            var tf = fgTfNormalize(d.tf), now = fgTfEquation(tf), assigned = fgTfTargetList(d.tfTargets);
            var matchIds = (Array.isArray(d.matchAssigned) ? d.matchAssigned : []).filter(function(id) { return MATCH_BANK.some(function(it) { return it.id === id; }); });
            var line = Object.assign({ margin: '6px 0 0' }, fgCoreStyles.text);
            function note(msg) { if (typeof announceToSR === 'function') announceToSR(msg); }
            return h('section', { 'data-funcgrapher-teacher': true, 'aria-labelledby': 'fg-teacher-title', style: fgCoreStyles.wrap },
              h('h3', { id: 'fg-teacher-title', style: { margin: 0, fontSize: 16, fontWeight: 800 } }, __alloT('stem.funcgrapher.teacher_title', 'Teacher tools')),
              h('p', { style: line }, __alloT('stem.funcgrapher.teacher_intro', 'Only you see this tab. Assignments appear first for students in Practice.')),
              h('h4', { style: { margin: '12px 0 0', fontSize: 15 } }, __alloT('stem.funcgrapher.teacher_targets', 'Transformation Lab targets')),
              h('p', { style: line }, fgFill(__alloT('stem.funcgrapher.teacher_targets_now', 'The Transformation Lab now shows {eq}. Set it up in Explore, then assign it here.'), { eq: now })),
              h('button', { type: 'button', 'data-teacher-assign-target': true, disabled: assigned.some(function(t) { return t.key === now; }) || assigned.length >= 12, onClick: function() { upd('tfTargets', assigned.map(function(t) { return { parent: t.parent, a: t.a, b: t.b, h: t.h, k: t.k }; }).concat([{ parent: tf.parent, a: tf.a, b: tf.b, h: tf.h, k: tf.k }])); note(fgFill(__alloT('stem.funcgrapher.teacher_target_added', 'Assigned {eq}.'), { eq: now })); }, style: Object.assign({ marginTop: 6 }, fgBtn) }, __alloT('stem.funcgrapher.teacher_assign_target', 'Assign this graph as a target')),
              assigned.length ? h('ul', { style: Object.assign({ margin: '6px 0 0', paddingLeft: 20 }, fgCoreStyles.text) }, assigned.map(function(t) {
                return h('li', { key: t.key, 'data-teacher-target': t.key, style: { marginTop: 4 } }, h('span', { style: { fontFamily: 'monospace' } }, t.key + ' '),
                  h('button', { type: 'button', onClick: function() { upd('tfTargets', assigned.filter(function(o) { return o.key !== t.key; }).map(function(o) { return { parent: o.parent, a: o.a, b: o.b, h: o.h, k: o.k }; })); }, style: fgBtn, 'aria-label': fgFill(__alloT('stem.funcgrapher.teacher_remove_target', 'Remove target {eq}'), { eq: t.key }) }, __alloT('stem.funcgrapher.teacher_remove', 'Remove')));
              })) : h('p', { style: line }, __alloT('stem.funcgrapher.teacher_no_targets', 'No targets assigned: students get the built-in set.')),
              h('fieldset', { 'data-teacher-match': true, style: Object.assign({ marginTop: 12, padding: 8, borderRadius: 8, minWidth: 0 }, fgCoreStyles.card) },
                h('legend', { style: { fontWeight: 700, padding: '0 4px' } }, __alloT('stem.funcgrapher.teacher_match', 'Match 4 Ways items to assign')),
                h('p', { style: Object.assign({}, line, { marginTop: 0 }) }, __alloT('stem.funcgrapher.teacher_match_note', 'With none checked, students get the full set for their level.')),
                MATCH_BANK.map(function(it) {
                  var on = matchIds.indexOf(it.id) >= 0;
                  return h('label', { key: it.id, style: Object.assign({ display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 44, marginTop: 4 }, fgCoreStyles.text) },
                    h('input', { type: 'checkbox', checked: on, 'data-teacher-match-item': it.id, onChange: function() { upd('matchAssigned', on ? matchIds.filter(function(x) { return x !== it.id; }) : matchIds.concat([it.id])); }, style: { width: 24, height: 24, margin: 0, flexShrink: 0 } }),
                    h('span', null, h('strong', { style: { fontFamily: 'monospace' } }, it.eq), ' ', it.story));
                })),
              h('h4', { style: { margin: '12px 0 0', fontSize: 15 } }, __alloT('stem.funcgrapher.teacher_results', 'Results')),
              h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.funcgrapher.teacher_results', 'Results'), style: { overflowX: 'auto', marginTop: 6 } },
                h('table', { 'data-teacher-progress': true, style: Object.assign({ borderCollapse: 'collapse' }, fgCoreStyles.text) },
                  h('tbody', null, fgProgressRows().map(function(r, i) { return h('tr', { key: i }, h('th', { scope: 'row', style: { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid ' + fgEdge } }, r[0]), h('td', { style: { padding: '4px 8px', borderBottom: '1px solid ' + fgEdge } }, String(r[1]))); })))),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
                h('button', { type: 'button', 'data-teacher-csv': true, onClick: function() { if (GA) GA.downloadText('function-grapher-progress.csv', GA.csvText([['metric', 'value']].concat(fgProgressRows())), 'text/csv'); }, style: fgBtn }, __alloT('stem.funcgrapher.teacher_csv', 'Download progress (CSV)')),
                h('button', { type: 'button', 'data-teacher-md': true, onClick: function() { if (GA) GA.downloadText('function-grapher-report.md', fgReportMarkdown(), 'text/markdown'); }, style: fgBtn }, __alloT('stem.funcgrapher.teacher_md', 'Download report (Markdown)')),
                h('button', { type: 'button', 'data-teacher-print': true, onClick: function() { var ok = GA && GA.printReport(__alloT('stem.funcgrapher.report_title', 'Function Grapher progress'), fgProgressRows(), d.secantResult && d.secantResult.ok ? fgSecantMarkdown(d.secantResult, d.secantReflection, !!d.secantReveal) : ''); if (!ok && typeof addToast === 'function') addToast(__alloT('stem.funcgrapher.teacher_print_blocked', 'The print window was blocked. Allow pop-ups, or download the report instead.'), 'warning'); }, style: fgBtn }, __alloT('stem.funcgrapher.teacher_print', 'Print report'))));
          }
          // Four-way matching items (render scope: the Practice cards and the Teacher assignment list read them).
          var MATCH_BANK = [
            { id: 'lin_grow', fam: 'linear', band: 0, eq: 'y = 3x + 2', f: function(x) { return 3 * x + 2; }, yw: [-2, 20], confuse: ['lin_slow', 'lin_add2'], story: __alloT('stem.funcgrapher.match_story_lin_grow', 'A plant is 2 cm tall and grows 3 cm every week.') },
            { id: 'lin_slow', fam: 'linear', band: 0, eq: 'y = 2x + 3', f: function(x) { return 2 * x + 3; }, yw: [-2, 20], confuse: ['lin_grow', 'lin_add2'], story: __alloT('stem.funcgrapher.match_story_lin_slow', 'A savings jar starts with $3, and $2 is added every day.') },
            { id: 'lin_add2', fam: 'linear', band: 0, eq: 'y = 2x + 2', f: function(x) { return 2 * x + 2; }, yw: [-2, 20], confuse: ['exp_double', 'lin_slow'], story: __alloT('stem.funcgrapher.match_story_lin_add2', 'A stack starts with 2 books, and 2 more books are added every day.') },
            { id: 'lin_down', fam: 'linear', band: 0, eq: 'y = −2x + 8', f: function(x) { return -2 * x + 8; }, yw: [-4, 10], confuse: ['exp_half', 'lin_slow'], story: __alloT('stem.funcgrapher.match_story_lin_down', 'A candle is 8 cm tall and burns down 2 cm every hour.') },
            { id: 'exp_double', fam: 'exponential', band: 1, eq: 'y = 2 · 2^x', f: function(x) { return 2 * Math.pow(2, x); }, yw: [-2, 34], confuse: ['lin_add2', 'quad_area'], story: __alloT('stem.funcgrapher.match_story_exp_double', 'A colony of 2 bacteria doubles every hour.') },
            { id: 'exp_half', fam: 'exponential', band: 1, eq: 'y = 16 · (1/2)^x', f: function(x) { return 16 * Math.pow(0.5, x); }, yw: [-2, 17], confuse: ['lin_down', 'rat_share'], story: __alloT('stem.funcgrapher.match_story_exp_half', 'A 16 g sample loses half of its mass every day.') },
            { id: 'quad_area', fam: 'quadratic', band: 1, eq: 'y = x²', f: function(x) { return x * x; }, yw: [-2, 26], confuse: ['exp_double', 'abs_door'], story: __alloT('stem.funcgrapher.match_story_quad_area', 'The area of a square tile whose sides are x cm long.') },
            { id: 'abs_door', fam: 'absolute', band: 1, eq: 'y = |x − 2|', f: function(x) { return Math.abs(x - 2); }, yw: [-1, 4], confuse: ['quad_area', 'lin_down'], story: __alloT('stem.funcgrapher.match_story_abs_door', 'Your distance from a door 2 m along a hallway, when you stand x m along it.') },
            { id: 'sqrt_side', fam: 'sqrt', band: 2, eq: 'y = √x', f: function(x) { return Math.sqrt(x); }, yw: [-0.5, 2.5], confuse: ['quad_area', 'rat_share'], story: __alloT('stem.funcgrapher.match_story_sqrt_side', 'The side length of a square whose area is x square metres.') },
            { id: 'rat_share', fam: 'rational', band: 2, eq: 'y = 12/x', f: function(x) { return 12 / x; }, yw: [-1, 14], tx: [1, 2, 3, 4, 5], confuse: ['exp_half', 'lin_down'], story: __alloT('stem.funcgrapher.match_story_rat_share', '12 cups of juice shared equally among x friends: the cups each friend gets.') }
          ];

          // ── Transformation Lab: y = a·f(b(x − h)) + k, parent kept as a dashed ghost. State lives
          // under d.tf; the graded {type, a, b, c} keys are never touched here. In Practice
          // (targetMode) it also shows a target to match, with hints. ──
          function fgRenderTfLab(targetMode) {
          var tf = fgTfNormalize(d.tf), pending = tf.pending;
          var ink = ctx.isContrast ? '#ffffff' : ctx.isDark ? '#e2e8f0' : '#0f172a', surface = ctx.isContrast ? '#000000' : ctx.isDark ? '#0f172a' : '#ffffff', border = ctx.isContrast ? '#facc15' : '#64748b';
          var curve = fgCurve.color, ghost = fgPal ? fgPal.muted : '#475569', grid = fgGridInk, axis = fgAxisInk;
          var btn = { minHeight: 44, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + border, background: surface, color: ink, fontSize: 13, cursor: 'pointer', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%' };
          var PARENTS = [
            { id: 'x', label: 'y = x', pts: [-2, -1, 0, 1, 2] },
            { id: 'x2', label: 'y = x²', pts: [-2, -1, 0, 1, 2] },
            { id: 'abs', label: 'y = |x|', pts: [-2, -1, 0, 1, 2] },
            { id: 'sqrt', label: 'y = √x', pts: [0, 1, 4] },
            { id: 'recip', label: 'y = 1/x', pts: [-2, -1, 1, 2] },
            { id: 'exp2', label: 'y = 2^x', pts: [-2, -1, 0, 1, 2] },
            { id: 'sin', label: 'y = sin x', pts: [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI], names: ['−π', '−π/2', '0', 'π/2', 'π'] }
          ];
          var parent = PARENTS.filter(function(p) { return p.id === tf.parent; })[0];
          var SLIDERS = [
            { key: 'a', label: __alloT('stem.funcgrapher.tf_a', 'a: vertical stretch or flip'), min: -4, max: 4, step: 0.25 },
            { key: 'b', label: __alloT('stem.funcgrapher.tf_b', 'b: horizontal stretch or flip'), min: -4, max: 4, step: 0.25 },
            { key: 'h', label: __alloT('stem.funcgrapher.tf_h', 'h: horizontal shift'), min: -6, max: 6, step: 0.5 },
            { key: 'k', label: __alloT('stem.funcgrapher.tf_k', 'k: vertical shift'), min: -6, max: 6, step: 0.5 }
          ];
          var CHOICES = { a: ['stretch_v', 'compress_v', 'flip_x'], b: ['compress_h', 'stretch_h', 'flip_y'], h: ['right', 'left'], k: ['up', 'down'] };
          var CHOICE_TEXT = {
            right: __alloT('stem.funcgrapher.tf_choice_right', 'Moves right'), left: __alloT('stem.funcgrapher.tf_choice_left', 'Moves left'),
            up: __alloT('stem.funcgrapher.tf_choice_up', 'Moves up'), down: __alloT('stem.funcgrapher.tf_choice_down', 'Moves down'),
            stretch_v: __alloT('stem.funcgrapher.tf_choice_stretch_v', 'Gets taller (vertical stretch)'), compress_v: __alloT('stem.funcgrapher.tf_choice_compress_v', 'Gets flatter (vertical compression)'),
            flip_x: __alloT('stem.funcgrapher.tf_choice_flip_x', 'Flips over the x-axis'), compress_h: __alloT('stem.funcgrapher.tf_choice_compress_h', 'Gets narrower (horizontal compression)'),
            stretch_h: __alloT('stem.funcgrapher.tf_choice_stretch_h', 'Gets wider (horizontal stretch)'), flip_y: __alloT('stem.funcgrapher.tf_choice_flip_y', 'Flips left to right')
          };
          var RESULT_TEXT = {
            right: __alloT('stem.funcgrapher.tf_result_right', 'moved right {n} units'), left: __alloT('stem.funcgrapher.tf_result_left', 'moved left {n} units'),
            up: __alloT('stem.funcgrapher.tf_result_up', 'moved up {n} units'), down: __alloT('stem.funcgrapher.tf_result_down', 'moved down {n} units'),
            stretch_v: __alloT('stem.funcgrapher.tf_result_stretch_v', 'stretched vertically (taller)'), compress_v: __alloT('stem.funcgrapher.tf_result_compress_v', 'compressed vertically (flatter)'),
            flip_x: __alloT('stem.funcgrapher.tf_result_flip_x', 'flipped over the x-axis'), compress_h: __alloT('stem.funcgrapher.tf_result_compress_h', 'compressed horizontally (narrower)'),
            stretch_h: __alloT('stem.funcgrapher.tf_result_stretch_h', 'stretched horizontally (wider)'), flip_y: __alloT('stem.funcgrapher.tf_result_flip_y', 'flipped left to right'),
            flatten: __alloT('stem.funcgrapher.tf_result_flatten', 'collapsed to a horizontal line'), unflatten: __alloT('stem.funcgrapher.tf_result_unflatten', 'came back from a horizontal line'), none: __alloT('stem.funcgrapher.tf_result_none', 'did not change')
          };
          function setTf(patch) {
            setLabToolData(function(prev) {
              var cur = fgTfNormalize(prev.funcGrapher && prev.funcGrapher.tf);
              return Object.assign({}, prev, { funcGrapher: Object.assign({}, prev.funcGrapher, { tf: Object.assign({}, cur, patch) }) });
            });
          }
          function resultText(last) {
            var effects = fgTfEffects(last.key, last.from, last.to), n = fgTfNum(Math.abs(last.to - last.from));
            var text = fgFill(__alloT('stem.funcgrapher.tf_result', 'Result: the graph {effects}.'), { effects: effects.map(function(e) { return fgFill(RESULT_TEXT[e], { n: n }); }).join(' ' + __alloT('stem.funcgrapher.tf_and', 'and') + ' ') });
            if (effects.indexOf('flip_y') >= 0 && (tf.parent === 'x2' || tf.parent === 'abs')) text += ' ' + __alloT('stem.funcgrapher.tf_symmetric', 'This parent is symmetric, so the flipped graph lands on itself.');
            if (!last.pred || !CHOICE_TEXT[last.pred]) return text;
            return fgFill(effects.indexOf(last.pred) >= 0 ? __alloT('stem.funcgrapher.tf_pred_matched', 'Your prediction matched: {pred}.') : __alloT('stem.funcgrapher.tf_pred_missed', 'You predicted: {pred}. Look again.'), { pred: CHOICE_TEXT[last.pred] }) + ' ' + text;
          }
          // Practice: a dotted target graph to match, teacher-assigned targets first.
          var tgtList = [];
          if (targetMode) {
            fgTfTargetList(d.tfTargets).forEach(function(t) { tgtList.push(Object.assign({ assigned: true }, t)); });
            FG_TF_TARGETS.forEach(function(t) { var k = fgTfEquation(t); if (!tgtList.some(function(o) { return o.key === k; })) tgtList.push(Object.assign({ key: k }, t)); });
          }
          var tgtState = d.tfTarget && typeof d.tfTarget === 'object' && !Array.isArray(d.tfTarget) ? d.tfTarget : {};
          var tgt = targetMode ? (tgtList.filter(function(t) { return t.key === tgtState.key; })[0] || tgtList[0]) : null;
          var tfDone = Array.isArray(d.tfDone) ? d.tfDone : [];
          var tgtHint = tgt && tgtState.hintKey === tgt.key && isFinite(tgtState.hint) ? tgtState.hint : 0;
          var tgtMatched = tgt ? fgTfSameGraph(tf, tgt) : false, tgtDone = tgt ? tfDone.indexOf(tgt.key) >= 0 : false;
          // A match pays once per target, and not after its answer was shown.
          function hitTarget(next) {
            if (!tgt || tgtDone || !fgTfSameGraph(next, tgt)) return '';
            upd('tfDone', tfDone.concat([tgt.key]).slice(-40));
            if (tgtHint < 4 && typeof awardStemXP === 'function') awardStemXP('funcGrapher', 5, 'Transformation target matched');
            return ' ' + __alloT('stem.funcgrapher.tf_target_hit', 'Matched: your graph lands on the target.');
          }
          function commit(key, to, pred) {
            var last = { key: key, from: tf[key], to: to, pred: pred || '' }, patch = { pending: null, last: last };
            patch[key] = to;
            setTf(patch);
            var said = resultText(last) + hitTarget(Object.assign({}, tf, patch));
            if (typeof announceToSR === 'function') announceToSR(said);
          }
          function onSlide(key, v) {
            if (!isFinite(v)) return;
            if (!tf.predictOn) { if (v !== tf[key]) commit(key, v, ''); return; }
            if (v === tf[key]) { setTf({ pending: null }); return; }
            if (!pending && typeof announceToSR === 'function') announceToSR(__alloT('stem.funcgrapher.tf_predict_now', 'Predict first: the change is applied after you choose.'));
            setTf({ pending: { key: key, to: v } });
          }
          var eq = fgTfEquation(tf);
          function par(x) { return fgTfParent(tf.parent, x); }
          function img(x) { return tf.a * fgTfParent(tf.parent, tf.b * (x - tf.h)) + tf.k; }
          var TW = 440, TH = 300, TP = 34, X0 = -8, X1 = 8, Y0 = -8, Y1 = 8;
          function sx(x) { return TP + (x - X0) / (X1 - X0) * (TW - 2 * TP); }
          function sy(y) { return TH - TP - (y - Y0) / (Y1 - Y0) * (TH - 2 * TP); }
          function inWin(x, y) { return typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y) && x >= X0 && x <= X1 && y >= Y0 && y <= Y1; }
          function pathOf(fn) {
            if (!GA) return '';
            var out = '';
            GA.analyse(GA.sample(fn, X0, X1, 321), { evaluate: fn, ymin: Y0, ymax: Y1 }).runs.forEach(function(run) {
              if (run.length < 2) return;
              run.forEach(function(p, i) { out += (i ? ' L' : ' M') + sx(p.x).toFixed(1) + ',' + sy(Math.max(Y0 - 16, Math.min(Y1 + 16, p.y))).toFixed(1); });
            });
            return out.trim();
          }
          var rows = parent.pts.map(function(px, i) {
            var py = par(px), ix = tf.b !== 0 ? tf.h + px / tf.b : null, iy = isFinite(py) ? tf.a * py + tf.k : null;
            return { name: parent.names ? parent.names[i] : fgTfNum(px), px: px, py: py, ix: ix, iy: iy };
          });
          var imgDesc = GA ? GA.describeGraph(GA.sample(img, X0, X1, 201), { t: __alloT, evaluate: img, ymin: Y0, ymax: Y1 }) : null;
          var tgtDesc = tgt && GA ? GA.describeGraph(GA.sample(function(x) { return fgTfImage(tgt, x); }, X0, X1, 201), { t: __alloT, evaluate: function(x) { return fgTfImage(tgt, x); }, ymin: Y0, ymax: Y1 }) : null;
          var ticks = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
          return h('section', { 'data-transform-lab': true, 'aria-labelledby': 'fg-tf-title', style: { marginTop: 16, padding: 14, borderRadius: 12, border: '1px solid ' + border, background: surface, color: ink, overflowWrap: 'anywhere' } },
            h('h3', { id: 'fg-tf-title', style: { fontSize: 16, fontWeight: 800, margin: 0 } }, __alloT('stem.funcgrapher.tf_title', 'Transformation Lab')),
            h('p', { style: { fontSize: 14, margin: '6px 0 10px' } }, __alloT('stem.funcgrapher.tf_intro', 'Choose a parent function, then change a, b, h and k in y = a·f(b(x − h)) + k. The dashed curve is the parent; the solid curve is the transformed graph.')),
            h('div', { role: 'group', 'aria-label': __alloT('stem.funcgrapher.tf_parent_group', 'Parent function'), style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              PARENTS.map(function(p) { var on = p.id === tf.parent; return h('button', { key: p.id, type: 'button', 'data-tf-parent-choice': p.id, 'aria-pressed': on, onClick: function() { setTf({ parent: p.id, pending: null, last: null }); var hit = hitTarget(Object.assign({}, tf, { parent: p.id })); if (hit && typeof announceToSR === 'function') announceToSR(hit.trim()); }, style: Object.assign({}, btn, { fontWeight: on ? 800 : 500, borderWidth: on ? 3 : 1, fontFamily: 'monospace' }) }, p.label); })),
            tgt ? h('div', { 'data-tf-target-card': tgt.key, style: { marginTop: 10, padding: 10, borderRadius: 8, border: '2px solid ' + border } },
              h('p', { style: { fontSize: 14, fontWeight: 700, margin: 0 } }, __alloT('stem.funcgrapher.tf_target_title', 'Match the target')),
              h('p', { style: { fontSize: 14, margin: '4px 0 6px' } }, __alloT('stem.funcgrapher.tf_target_intro', 'Choose a parent and set a, b, h and k so your solid graph lands on the dotted target.')),
              h('div', { role: 'group', 'aria-label': __alloT('stem.funcgrapher.tf_target_pick', 'Choose a target'), style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                tgtList.map(function(t, i) {
                  var on = t.key === tgt.key, done = tfDone.indexOf(t.key) >= 0;
                  return h('button', { key: t.key, type: 'button', 'data-tf-target-choice': i, 'aria-pressed': on, onClick: function() { upd('tfTarget', { key: t.key }); }, style: Object.assign({}, btn, { fontWeight: on ? 800 : 500, borderWidth: on ? 3 : 1 }) },
                    fgFill(t.assigned ? __alloT('stem.funcgrapher.tf_target_assigned', 'Target {n} (from your teacher)') : __alloT('stem.funcgrapher.tf_target_n', 'Target {n}'), { n: i + 1 }) + (done ? ' ✓' : ''));
                })),
              h('p', { 'data-tf-target-status': tgtMatched ? 'matched' : 'open', role: 'status', style: { fontSize: 14, fontWeight: 700, margin: '8px 0 0' } },
                tgtMatched ? __alloT('stem.funcgrapher.tf_target_hit', 'Matched: your graph lands on the target.') : __alloT('stem.funcgrapher.tf_target_open', 'Not matched yet: the dotted target and your solid graph differ.')),
              (tgtMatched || tgtHint >= 4) ? h('p', { 'data-tf-target-equation': true, style: { fontFamily: 'monospace', fontSize: 14, margin: '4px 0 0' } }, fgFill(__alloT('stem.funcgrapher.tf_target_eq', 'Target: {eq}'), { eq: fgTfEquation(tgt) })) : null,
              GA ? GA.hintLadder(React, { id: 'fg-tf-hints', t: __alloT, level: tgtHint, onLevel: function(n) { upd('tfTarget', { key: tgt.key, hintKey: tgt.key, hint: n }); }, announce: announceToSR, noXpNote: !tgtDone, styles: fgCoreStyles, steps: [
                __alloT('stem.funcgrapher.tf_hint_nudge', 'First pick the parent the target is built from. Then find one point you can read on it, such as its vertex, starting point or middle line.'),
                __alloT('stem.funcgrapher.tf_hint_strategy', 'Change one slider at a time: h moves the graph left or right, k moves it up or down, a stretches or flips it vertically, b squeezes or flips it horizontally.'),
                fgFill(__alloT('stem.funcgrapher.tf_hint_worked', 'The target is built from {parent} with h = {h} and k = {k}. Set those two first, then compare the shape for a and b.'), { parent: (PARENTS.filter(function(p) { return p.id === tgt.parent; })[0] || parent).label, h: fgTfNum(tgt.h), k: fgTfNum(tgt.k) }),
                fgFill(__alloT('stem.funcgrapher.tf_hint_answer', 'Set a = {a}, b = {b}, h = {h} and k = {k}: {eq}.'), { a: fgTfNum(tgt.a), b: fgTfNum(tgt.b), h: fgTfNum(tgt.h), k: fgTfNum(tgt.k), eq: fgTfEquation(tgt) })] }) : null) : null,
            h('p', { 'data-tf-equation': true, style: { fontFamily: 'monospace', fontSize: 16, fontWeight: 700, margin: '10px 0 6px' } }, eq),
            h('svg', { viewBox: '0 0 ' + TW + ' ' + TH, role: 'img', 'aria-label': fgFill(__alloT('stem.funcgrapher.tf_graph_label', 'Transformation Lab graph. Dashed parent: {parent}. Solid transformed graph: {eq}.'), { parent: parent.label, eq: eq }) + (imgDesc ? ' ' + imgDesc.short : '') + (tgtDesc ? ' ' + fgFill(__alloT('stem.funcgrapher.tf_target_desc', 'Dotted target: {desc}'), { desc: tgtDesc.short }) : ''), style: { width: '100%', maxHeight: 320, display: 'block', background: surface, borderRadius: 8 } },
              h('defs', null, h('clipPath', { id: 'fg-tf-clip' }, h('rect', { x: TP, y: TP, width: TW - 2 * TP, height: TH - 2 * TP }))),
              ticks.map(function(v) { return h('g', { key: 'g' + v }, h('line', { x1: sx(v), x2: sx(v), y1: TP, y2: TH - TP, stroke: v === 0 ? axis : grid, strokeWidth: v === 0 ? 2 : 1 }), h('line', { x1: TP, x2: TW - TP, y1: sy(v), y2: sy(v), stroke: v === 0 ? axis : grid, strokeWidth: v === 0 ? 2 : 1 })); }),
              [-8, -4, 4, 8].map(function(v) { return h('g', { key: 't' + v }, h('text', { x: sx(v), y: sy(0) + 16, textAnchor: 'middle', fill: ink, style: { fontSize: fgFs(12) } }, fgTfNum(v)), h('text', { x: sx(0) - 5, y: sy(v) + 4, textAnchor: 'end', fill: ink, style: { fontSize: fgFs(12) } }, fgTfNum(v))); }),
              h('path', { 'data-tf-parent': true, d: pathOf(par), fill: 'none', stroke: ghost, strokeWidth: 2.5, strokeDasharray: '7 5', clipPath: 'url(#fg-tf-clip)' }),
              tgt ? h('path', { 'data-tf-target': true, d: pathOf(function(x) { return fgTfImage(tgt, x); }), fill: 'none', stroke: fgPal ? fgPal.curve(2).color : '#047857', strokeWidth: 3.5, strokeDasharray: '2 6', strokeLinecap: 'round', clipPath: 'url(#fg-tf-clip)' }) : null,
              h('path', { 'data-tf-image': true, d: pathOf(img), fill: 'none', stroke: curve, strokeWidth: 3, strokeLinecap: 'round', clipPath: 'url(#fg-tf-clip)' }),
              rows.map(function(r, i) {
                return h('g', { key: 'p' + i },
                  inWin(r.px, r.py) && h('circle', { cx: sx(r.px), cy: sy(r.py), r: 4, fill: surface, stroke: ghost, strokeWidth: 2 }),
                  inWin(r.ix, r.iy) && h('circle', { cx: sx(r.ix), cy: sy(r.iy), r: 5, fill: curve }));
              })),
            h('p', { style: { fontSize: 12, margin: '4px 0 8px' } }, __alloT('stem.funcgrapher.tf_window', 'Fixed window: x and y from −8 to 8. Hollow dots: parent points. Filled dots: where they move.')),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 14 } },
              h('input', { type: 'checkbox', checked: tf.predictOn, onChange: function(e) { setTf({ predictOn: e.target.checked, pending: null }); }, style: { width: 24, height: 24, margin: 0, flexShrink: 0 } }),
              __alloT('stem.funcgrapher.tf_predict_toggle', 'Predict before each change')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 } },
              SLIDERS.map(function(s) {
                var isPending = pending && pending.key === s.key, shown = isPending ? pending.to : tf[s.key];
                return h('div', { key: s.key, style: { padding: 8, borderRadius: 8, border: (isPending ? '2px solid ' : '1px solid ') + border } },
                  h('label', { htmlFor: 'fg-tf-' + s.key, style: { display: 'block', fontSize: 14, fontWeight: 700 } }, s.label + ' = ' + fgTfNum(shown) + (isPending ? ' ' + __alloT('stem.funcgrapher.tf_pending_mark', '(not applied yet)') : '')),
                  h('input', { id: 'fg-tf-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: shown, onChange: function(e) { onSlide(s.key, parseFloat(e.target.value)); }, style: { width: '100%', minHeight: 28, accentColor: curve } }));
              })),
            pending ? h('div', { role: 'group', 'aria-labelledby': 'fg-tf-predict-q', 'data-tf-predict': pending.key, style: { marginTop: 10, padding: 10, borderRadius: 8, border: '2px solid ' + border } },
              h('p', { id: 'fg-tf-predict-q', style: { fontSize: 14, fontWeight: 700, margin: '0 0 6px' } }, fgFill(__alloT('stem.funcgrapher.tf_predict_q', 'You are changing {p} from {from} to {to}. Predict: what will the graph do?'), { p: pending.key, from: fgTfNum(tf[pending.key]), to: fgTfNum(pending.to) })),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                CHOICES[pending.key].map(function(c) { return h('button', { key: c, type: 'button', 'data-tf-choice': c, onClick: function() { commit(pending.key, pending.to, c); }, style: btn }, CHOICE_TEXT[c]); }),
                h('button', { type: 'button', 'data-tf-choice': 'skip', onClick: function() { commit(pending.key, pending.to, ''); }, style: btn }, __alloT('stem.funcgrapher.tf_skip', 'Apply without predicting')),
                h('button', { type: 'button', 'data-tf-choice': 'cancel', onClick: function() { setTf({ pending: null }); }, style: btn }, __alloT('stem.funcgrapher.tf_cancel', 'Cancel this change')))) : null,
            tf.last ? h('p', { 'data-tf-result': true, style: { fontSize: 14, fontWeight: 600, margin: '10px 0 0' } }, resultText(tf.last)) : null,
            tf.b === 0 ? h('p', { style: { fontSize: 13, margin: '8px 0 0' } }, __alloT('stem.funcgrapher.tf_b_zero', 'With b = 0 every input becomes 0, so the graph is a flat line, or nothing at all when f(0) is undefined.')) : null,
            h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.funcgrapher.tf_table_caption', 'Parent points and where they move'), style: { overflowX: 'auto', marginTop: 10 } },
              h('table', { 'data-tf-table': true, style: { width: '100%', borderCollapse: 'collapse', fontSize: 14 } },
                h('caption', { style: { textAlign: 'left', fontWeight: 700, color: ink } }, __alloT('stem.funcgrapher.tf_table_caption', 'Parent points and where they move')),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + border } }, __alloT('stem.funcgrapher.tf_col_parent', 'Parent point (x, y)')),
                  h('th', { scope: 'col', style: { textAlign: 'left', padding: 6, borderBottom: '1px solid ' + border } }, __alloT('stem.funcgrapher.tf_col_image', 'Transformed point')))),
                h('tbody', null, rows.map(function(r, i) {
                  return h('tr', { key: i },
                    h('td', { style: { padding: 6, fontFamily: 'monospace' } }, '(' + r.name + ', ' + fgTfNum(r.py) + ')'),
                    h('td', { style: { padding: 6, fontFamily: 'monospace' } }, r.ix === null || r.iy === null ? '—' : '(' + fgTfNum(r.ix) + ', ' + fgTfNum(r.iy) + ')'));
                })))),
            h('p', { style: { fontSize: 13, margin: '6px 0 0' } }, __alloT('stem.funcgrapher.tf_rule', 'Each parent point (x, y) moves to (h + x/b, a·y + k).')),
            h('button', { type: 'button', onClick: function() { setTf({ a: 1, b: 1, h: 0, k: 0, pending: null, last: null }); }, style: Object.assign({}, btn, { marginTop: 10 }) }, __alloT('stem.funcgrapher.tf_reset', 'Reset a, b, h and k')));
          }

          // ── Keyboard shortcuts (WCAG 2.1.1): 1-6 pick function type, D/A/T/L toggle overlays ──
          function onFgKey(e) {
            var tgt = e.target || {};
            var tn = (tgt.tagName || '').toUpperCase();
            if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
            var k = e.key;
            if (k >= '1' && k <= '9') {
              var idx = parseInt(k, 10) - 1;
              if (TYPES[idx]) {
                e.preventDefault();
                setFnType(TYPES[idx].id);
                if (typeof announceToSR === 'function') announceToSR(TYPES[idx].label + ' selected.');
              }
            } else if (k === 'd' || k === 'D') { e.preventDefault(); upd('showDeriv', !d.showDeriv); }
            else if (k === 'a' || k === 'A') { e.preventDefault(); upd('showArea', !d.showArea); }
            else if (k === 't' || k === 'T') { e.preventDefault(); upd('showTable', !d.showTable); }
            else if (k === 'l' || k === 'L') { e.preventDefault(); upd('showLearn', !d.showLearn); }
          }
          return React.createElement("div", {
              className: "max-w-5xl mx-auto animate-in fade-in duration-200",
              role: "region",
              "aria-label": __alloT('stem.funcgrapher.function_grapher_keyboard_shortcuts_1_', "Function Grapher. Keyboard shortcuts: 1 through 9 pick a function type, D derivative, A area, T table, L learn."),
              tabIndex: 0,
              onKeyDown: onFgKey
            },

            React.createElement("section", { "data-funcgrapher-command": "true", className: "mb-4 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white shadow-xl" },
              React.createElement("div", { className: "p-4 sm:p-5" },
                React.createElement("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" },
                  React.createElement("div", { className: "min-w-0" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("button", { onClick: () => setStemLabTool(null), className: "shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300", 'aria-label': __alloT('stem.funcgrapher.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
                      React.createElement("span", { className: "rounded-full bg-cyan-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-cyan-200/30" }, "Graph exploration console")
                    ),
                    React.createElement("h2", { className: "mt-3 text-xl font-black tracking-tight sm:text-2xl" }, __alloT('stem.funcgrapher.function_grapher', "\uD83D\uDCC8 Function Grapher")),
                    React.createElement("p", { className: "mt-1 max-w-2xl text-sm leading-6 text-indigo-100" }, "Change a rule, observe its shape, then use values and rates to explain the pattern."),
                    React.createElement("div", { className: "mt-3 rounded-xl border border-white/15 bg-white/10 p-3" },
                      React.createElement("p", { className: "text-[0.625rem] font-black uppercase tracking-[0.16em] text-cyan-200" }, "Recommended next move"),
                      React.createElement("p", { className: "mt-1 text-sm font-semibold text-white" }, nextMove)
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2 lg:w-[22rem]" },
                    [
                      { label: 'Family', value: hideFamilyAnswer ? __alloT('stem.funcgrapher.challenge_family_hidden', '? Answer the challenge') : activeType.emoji + ' ' + activeType.label },
                      { label: 'Evidence', value: String(evidenceCount) },
                      { label: 'Tools on', value: String(overlayCount) }
                    ].map(function(metric) {
                      return React.createElement("div", { key: metric.label, className: "min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center" },
                        React.createElement("div", { className: "truncate text-sm font-black text-white", title: metric.value }, metric.value),
                        React.createElement("div", { className: "mt-1 text-[0.625rem] leading-snug font-bold uppercase tracking-wider text-indigo-200" }, metric.label)
                      );
                    })
                  )
                ),
                React.createElement("ol", { className: "mt-4 grid gap-2 text-xs sm:grid-cols-3", "aria-label": __alloT('stem.funcgrapher.a11y_function_investigation_pathway', 'Function investigation pathway') },
                  [
                    { n: '1', title: 'Choose', detail: 'Pick a function family.' },
                    { n: '2', title: 'Transform', detail: 'Adjust coefficients and trace.' },
                    { n: '3', title: 'Explain', detail: 'Use intercepts, slope, or a table.' }
                  ].map(function(step) {
                    return React.createElement("li", { key: step.n, className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5" },
                      React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-black text-slate-950" }, step.n),
                      React.createElement("span", null, React.createElement("strong", { className: "block text-white" }, step.title), React.createElement("span", { className: "text-indigo-200" }, step.detail))
                    );
                  })
                )
              )
            ),

            // Function type buttons

            React.createElement("div", { className: "mb-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" },
              React.createElement("p", { className: "mb-2 px-1 text-[0.625rem] font-black uppercase tracking-[0.16em] text-slate-500" }, "Choose a function family"),
              React.createElement("div", { className: "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5", role: "group", "aria-label": __alloT('stem.funcgrapher.a11y_function_families', 'Function families') },
                TYPES.map(function(tp) { return React.createElement("button", { key: tp.id, onClick: function() { setFnType(tp.id); },
                  className: "min-h-[2.5rem] min-w-0 whitespace-normal break-words px-2 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 " + (d.type === tp.id && !hideFamilyAnswer ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-indigo-50')
                }, tp.emoji + " " + tp.label); })
              )
            ),

            // SVG Graph

            // The accessible name carries the key features (with an open question's answer withheld).
            React.createElement("svg", { role: "img", "data-funcgrapher-graph": true, ref: fgMeasure, "aria-label": __alloT('stem.funcgrapher.a11y_function_graph_showing_the_configured_curve', 'Function graph showing the configured curve') + (fgDesc ? '. ' + fgDesc.short : '') + (rocPts && rocPts.rate !== null ? ' ' + fgRocLabel : ''), viewBox: "0 0 " + W + " " + H, className: "w-full rounded-xl border-2 shadow-sm " + (isDark ? "bg-slate-900 border-indigo-800" : "bg-white border-indigo-200"), style: { maxHeight: "340px", touchAction: rocOn ? "none" : undefined },
              onPointerDown: function(e) { fgRocPointer(e, 'down'); }, onPointerMove: function(e) { fgRocPointer(e, 'move'); }, onPointerUp: function(e) { fgRocPointer(e, 'up'); }, onPointerCancel: function(e) { fgRocPointer(e, 'up'); } },

              // Rate of change: the secant through A and B with its slope triangle (drawn under the labels).
              fgRocOverlay(),

              // Grid lines (rendered first, behind curves)

              (function () {

                var gridLines = [];

                var xStep = (xR.xMax - xR.xMin) <= 10 ? 1 : (xR.xMax - xR.xMin) <= 30 ? 5 : 10;

                for (var gx = Math.ceil(xR.xMin / xStep) * xStep; gx <= xR.xMax; gx += xStep) {

                  var sx = toSX(gx);

                  if (sx > pad && sx < W - pad) {

                    gridLines.push(React.createElement("line", { key: 'gx' + gx, x1: sx, y1: pad, x2: sx, y2: H - pad, stroke: fgGridInk, strokeWidth: 1 }));

                  }

                }

                var yStep = (yR.yMax - yR.yMin) <= 10 ? 1 : (yR.yMax - yR.yMin) <= 30 ? 5 : 10;

                for (var gy = Math.ceil(yR.yMin / yStep) * yStep; gy <= yR.yMax; gy += yStep) {

                  var sy = toSY(gy);

                  if (sy > pad && sy < H - pad) {

                    gridLines.push(React.createElement("line", { key: 'gy' + gy, x1: pad, y1: sy, x2: W - pad, y2: sy, stroke: fgGridInk, strokeWidth: 1 }));

                  }

                }

                return gridLines;

              })(),

              // Axes

              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: fgAxisInk, strokeWidth: 2 }),

              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: fgAxisInk, strokeWidth: 2 }),

              // Axis labels

              React.createElement("text", { x: W - pad + 5, y: toSY(0) + 4, fill: fgLabelInk, style: { fontSize: fgFs(13), fontWeight: 'bold' } }, "x"),

              React.createElement("text", { x: toSX(0) + 5, y: pad - 5, fill: fgLabelInk, style: { fontSize: fgFs(13), fontWeight: 'bold' } }, "y"),

              // Area under curve (positive x)

              d.showArea && integralDefined && areaPts.length > 1 && React.createElement("polygon", {
                "data-function-area": true,
                points: toSX(0) + ',' + toSY(0) + ' ' + areaPts.map(p => p.sx + ',' + p.sy).join(' ') + ' ' + areaPts[areaPts.length - 1].sx + ',' + toSY(0),

                fill: isDark ? "rgba(129,140,248,0.16)" : "rgba(79,70,229,0.08)", stroke: "none"

              }),

              // Derivative trace

              d.showDeriv && derivSegs.map(function (seg, si) { return seg.length > 1 ? React.createElement("polyline", { key: 'dseg' + si, points: seg.join(" "), "data-function-curve": "derivative", fill: "none", stroke: fgDerivCurve.color, strokeWidth: 2.5, strokeDasharray: fgDerivCurve.dash.join(' ') || "6 3" }) : null; }),

              // Main curve

              d.type === 'rational' && (-d.b) > xR.xMin && (-d.b) < xR.xMax && React.createElement("line", { x1: toSX(-d.b), y1: pad, x2: toSX(-d.b), y2: H - pad, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 4", "aria-label": "vertical asymptote at x = " + (-d.b) }),
              segments.map(function (seg, si) { return seg.length > 1 ? React.createElement("polyline", { key: 'seg' + si, points: seg.join(" "), "data-function-curve": "main", fill: "none", stroke: fgCurve.color, strokeWidth: 3, strokeLinecap: "round", style: { filter: 'drop-shadow(0 0 3px rgba(' + (isDark ? '129,140,248,0.6' : '79,70,229,0.45') + '))' } }) : null; }),

              // Comparison curve (orange)
              d.compare && compareSegs.map(function (seg, si) { return seg.length > 1 ? React.createElement("polyline", { key: 'cseg' + si, points: seg.join(" "), "data-function-curve": "compare", fill: "none", stroke: fgCompareCurve.color, strokeWidth: 2.5, strokeDasharray: fgCompareCurve.dash.join(' ') || "8 4" }) : null; }),

              // Tangent line at traceX
              tangentInRange && (function() {
                var tLen = 3;
                var x1 = traceX - tLen, x2 = traceX + tLen;
                var y1t = traceY + traceSlope * (x1 - traceX);
                var y2t = traceY + traceSlope * (x2 - traceX);
                return React.createElement('g', null,
                  React.createElement('line', { x1: toSX(x1), y1: toSY(y1t), x2: toSX(x2), y2: toSY(y2t), stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '4 2' }),
                  React.createElement('circle', { cx: toSX(traceX), cy: toSY(traceY), r: 5, fill: '#ec4899', stroke: 'white', strokeWidth: 1.5 }),
                  !fgTraceHidden && React.createElement('text', { x: toSX(traceX) + 10, y: toSY(traceY) - 6, fill: '#ec4899', style: { fontSize: fgFs(12), fontWeight: 'bold' } }, '(' + traceX.toFixed(1) + ', ' + traceY.toFixed(2) + ') m=' + traceSlope.toFixed(2))
                );
              })(),

              // Roots

              roots.map(function (r, i) {

                return React.createElement("g", { key: 'root' + i },

                  React.createElement("circle", { cx: toSX(r), cy: toSY(0), r: 4, fill: "#ef4444", stroke: "white", strokeWidth: 1.5 }),

                  !hideRootAnswer && React.createElement("text", { x: toSX(r), y: toSY(0) - 8, textAnchor: "middle", fill: "#ef4444", style: { fontSize: fgFs(12), fontWeight: 'bold' } }, r.toFixed(2))

                );

              }),

              // Y-intercept

              yIntercept >= yR.yMin && yIntercept <= yR.yMax && React.createElement("g", null,

                React.createElement("circle", { cx: toSX(0), cy: toSY(yIntercept), r: 4, fill: "#22c55e", stroke: "white", strokeWidth: 1.5 }),

                !hideYIntAnswer && React.createElement("text", { x: toSX(0) + 8, y: toSY(yIntercept) + 4, fill: isDark ? "#4ade80" : "#15803d", style: { fontSize: fgFs(12), fontWeight: 'bold' } }, "(0, " + yIntercept.toFixed(1) + ")")

              ),

              // Critical points (local max / min) — violet markers with kind label
              critPts.map(function (cp, i) {
                var isMax = cp.kind === 'max';
                var color = isMax ? '#a855f7' : '#0891b2';
                return React.createElement("g", { key: 'cp' + i },
                  React.createElement("circle", {
                    cx: toSX(cp.x), cy: toSY(cp.y), r: 5,
                    fill: 'none', stroke: color, strokeWidth: 2
                  }),
                  // A turning point on the y-axis would label the y-intercept.
                  !(hideYIntAnswer && cp.x === 0) && React.createElement("text", {
                    x: toSX(cp.x), y: toSY(cp.y) + (isMax ? -10 : 16),
                    textAnchor: 'middle', fill: color,
                    style: { fontSize: fgFs(12), fontWeight: 'bold' }
                  }, (isMax ? '▲ max ' : '▼ min ') + '(' + cp.x.toFixed(1) + ', ' + cp.y.toFixed(2) + ')')
                );
              }),

              // Keyboard explorer position (Describe and Hear panel)
              fgGaPoint && fgGaPoint.x >= xR.xMin && fgGaPoint.x <= xR.xMax && React.createElement("g", { "data-function-explore-marker": true, "aria-hidden": "true" },
                React.createElement("line", { x1: toSX(fgGaPoint.x), y1: pad, x2: toSX(fgGaPoint.x), y2: H - pad, stroke: fgLabelInk, strokeWidth: 1.5, strokeDasharray: "4 4" }),
                fgGaPoint.y !== null && fgGaPoint.y >= yR.yMin && fgGaPoint.y <= yR.yMax && React.createElement("circle", { cx: toSX(fgGaPoint.x), cy: toSY(fgGaPoint.y), r: 8, fill: "none", stroke: fgLabelInk, strokeWidth: 3 })),

              // Grid text labels (rendered AFTER curves so they appear on top)

              (function () {

                var gridLabels = [];

                var xStep = (xR.xMax - xR.xMin) <= 10 ? 1 : (xR.xMax - xR.xMin) <= 30 ? 5 : 10;
                while ((W - 2 * pad) * xStep / (xR.xMax - xR.xMin) < 28 * fgTextScale) xStep *= 2;

                for (var gx = Math.ceil(xR.xMin / xStep) * xStep; gx <= xR.xMax; gx += xStep) {

                  var sx = toSX(gx);

                  if (sx > pad && sx < W - pad) {

                    gridLabels.push(React.createElement("text", { key: 'tx' + gx, x: sx, y: H - pad + 14, textAnchor: "middle", fill: fgLabelInk, style: { fontSize: fgFs(12), fontWeight: '600' } }, gx));

                  }

                }

                var yStep = (yR.yMax - yR.yMin) <= 10 ? 1 : (yR.yMax - yR.yMin) <= 30 ? 5 : 10;
                while ((H - 2 * pad) * yStep / (yR.yMax - yR.yMin) < 18 * fgTextScale) yStep *= 2;

                for (var gy = Math.ceil(yR.yMin / yStep) * yStep; gy <= yR.yMax; gy += yStep) {

                  var sy = toSY(gy);

                  if (sy > pad && sy < H - pad) {

                    gridLabels.push(React.createElement("text", { key: 'ty' + gy, x: pad - 5, y: sy + 3, textAnchor: "end", fill: fgLabelInk, style: { fontSize: fgFs(12), fontWeight: '600' } }, gy));

                  }

                }

                return gridLabels;

              })(),

              // Equation label

              React.createElement("text", { x: d.compare ? W / 3 : W / 2, y: H - 5, textAnchor: "middle", fill: isDark ? "#a5b4fc" : "#3730a3", style: { fontSize: fgFs(12), fontWeight: 'bold' } }, hideFamilyAnswer ? __alloT('stem.funcgrapher.challenge_equation_hidden', 'f(x) = ?') : eqStr),

              // Comparison equation label
              d.compare && eqStr2 && React.createElement("text", { x: W * 2 / 3, y: H - 5, textAnchor: "middle", fill: isDark ? "#fb923c" : "#c2410c", style: { fontSize: fgFs(12), fontWeight: 'bold' } }, eqStr2)

            ),

            // ── Describe and Hear + keyboard explorer (shared core), and the calculator link ──
            fgDesc && (function() {
              var ink = ctx.isContrast ? '#ffffff' : ctx.isDark ? '#e2e8f0' : '#0f172a', surface = ctx.isContrast ? '#000000' : ctx.isDark ? '#0f172a' : '#ffffff', border = ctx.isContrast ? '#facc15' : '#64748b';
              var btn = { minHeight: 44, padding: '6px 12px', borderRadius: 8, border: '1px solid ' + border, background: surface, color: ink, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%' };
              return h('div', { 'data-funcgrapher-access': true, style: { marginTop: 8, padding: 10, borderRadius: 12, border: '1px solid ' + border, background: surface, color: ink } },
                GA.panel(React, {
                  id: 'funcgrapher-ga', t: __alloT, desc: fgDesc, points: fgPoints, index: fgGaIdx, samples: fgSamples,
                  // Clicks mark the engine's roots, the same list as the chips; no values are spoken.
                  sonify: { evaluate: evalF, zeros: fgZeros.xs, ymin: yR.yMin, ymax: yR.yMax },
                  open: !!d._gaOpen, onToggle: function() { upd('_gaOpen', !d._gaOpen); }, onIndex: function(i) { upd('_gaIdx', i); },
                  onChange: function() { upd('_gaTick', (typeof d._gaTick === 'number' ? d._gaTick : 0) + 1); }, announce: announceToSR, callTTS: callTTS,
                  extra: fgQuizLeaks ? null : h('button', { type: 'button', 'data-funcgrapher-open-calc': true, onClick: fgOpenInCalculator, style: btn }, __alloT('stem.funcgrapher.open_in_calculator', 'Open in Graphing Calculator')),
                  styles: { button: btn, text: { color: ink, fontSize: 14 }, region: { padding: '8px 10px', minHeight: 44, borderRadius: 8, border: '2px solid ' + border, background: surface, color: ink, fontFamily: 'monospace', fontSize: 14 }, help: { color: ink, fontSize: 12 } }
                }));
            })(),

            // ── Zoom / Pan Controls ──
            React.createElement("div", { className: "flex items-center gap-1.5 mt-2 mb-1 flex-wrap" },
              React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mr-1" + onHostInk }, __alloT('stem.funcgrapher.view', "\uD83D\uDD0D View")),
              React.createElement("button", { onClick: function() { var cx = (xR.xMin + xR.xMax) / 2, cy = (yR.yMin + yR.yMax) / 2, hw = (xR.xMax - xR.xMin) / 4, hh = (yR.yMax - yR.yMin) / 4; upd('range', { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.zoom_in', 'Zoom in') }, __alloT('stem.funcgrapher.zoom_in_2', "\u2795 Zoom In")),
              React.createElement("button", { onClick: function() { var cx = (xR.xMin + xR.xMax) / 2, cy = (yR.yMin + yR.yMax) / 2, hw = (xR.xMax - xR.xMin), hh = (yR.yMax - yR.yMin); upd('range', { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.zoom_out', 'Zoom out') }, __alloT('stem.funcgrapher.zoom_out_2', "\u2796 Zoom Out")),
              React.createElement("button", { onClick: function() { var dx = (xR.xMax - xR.xMin) * 0.25; upd('range', { xMin: xR.xMin - dx, xMax: xR.xMax - dx, yMin: yR.yMin, yMax: yR.yMax }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_left', 'Pan left') }, "\u2B05"),
              React.createElement("button", { onClick: function() { var dx = (xR.xMax - xR.xMin) * 0.25; upd('range', { xMin: xR.xMin + dx, xMax: xR.xMax + dx, yMin: yR.yMin, yMax: yR.yMax }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_right', 'Pan right') }, "\u27A1"),
              React.createElement("button", { onClick: function() { var dy = (yR.yMax - yR.yMin) * 0.25; upd('range', { xMin: xR.xMin, xMax: xR.xMax, yMin: yR.yMin + dy, yMax: yR.yMax + dy }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_up', 'Pan up') }, "\u2B06"),
              React.createElement("button", { onClick: function() { var dy = (yR.yMax - yR.yMin) * 0.25; upd('range', { xMin: xR.xMin, xMax: xR.xMax, yMin: yR.yMin - dy, yMax: yR.yMax - dy }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_down', 'Pan down') }, "\u2B07"),
              React.createElement("button", { onClick: function() { upd('range', { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-600 transition-all", 'aria-label': __alloT('stem.funcgrapher.reset_view', 'Reset view') }, __alloT('stem.funcgrapher.reset', "\u21BA Reset")),
              React.createElement("span", { className: "text-[0.6875rem] text-slate-600 ml-1" + onHostInk }, "x:[" + xR.xMin.toFixed(0) + "," + xR.xMax.toFixed(0) + "] y:[" + yR.yMin.toFixed(0) + "," + yR.yMax.toFixed(0) + "]")
            ),

            // ── Transformation Labels ──
            // Hidden during an open Name That Graph (chips such as "Slope" or "Vertex" name the
            // family) and Y-Intercept question ("y-intercept = b", "Shifted up c").
            // Find the Root too: "Slope = a" and "y-intercept = b" together give -b/a.
            transformLabels.length > 0 && !fgQuizLeaks && React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-1" },
              transformLabels.map(function(tl, ti) {
                return React.createElement("span", { key: ti, className: "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border " + tl.color }, tl.text);
              })
            ),

            // Toggles

            React.createElement("div", { role: "group", "aria-label": __alloT("stem.funcgrapher.graph_options", "Graph options"), "data-function-options": true, className: "flex gap-2 mt-3 mb-2 flex-wrap" },

              React.createElement("button", { 'aria-pressed': !!d.showDeriv, style: { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' }, onClick: () => { if (!d.showDeriv) upd('overlaysUsed', Object.assign({}, d.overlaysUsed, { deriv: true })); upd('showDeriv', !d.showDeriv); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showDeriv ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 border border-amber-600') }, __alloT("stem.funcgrapher.derivative_overlay", "Derivative f′(x)")),

              React.createElement("button", { 'aria-pressed': !!d.showArea, style: { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' }, onClick: () => { if (!d.showArea) upd('overlaysUsed', Object.assign({}, d.overlaysUsed, { area: true })); upd('showArea', !d.showArea); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showArea ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-600') }, __alloT("stem.funcgrapher.signed_area_overlay", "Signed area")),

              d.showArea && React.createElement("span", { className: "px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[0.6875rem] font-mono font-bold border border-indigo-300" }, "\u222B\u2080^" + xR.xMax.toFixed(0) + " f(x)dx " + (integralDefined ? "\u2248 " + integral0ToMax.toFixed(2) : integralReason)),

              React.createElement("button", { 'aria-pressed': !!d.showTable, style: { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' }, onClick: () => upd('showTable', !d.showTable), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showTable ? 'bg-cyan-700 text-white' : 'bg-cyan-50 text-cyan-700 border border-cyan-600') }, __alloT("stem.funcgrapher.values_table_toggle", "Table of values")),

              React.createElement("button", { 'aria-pressed': !!d.showLearn, style: { minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere' }, onClick: () => upd('showLearn', !d.showLearn), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showLearn ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-600') }, __alloT("stem.funcgrapher.function_guide", "Function guide")),

              roots.length > 0 && React.createElement("span", { className: "px-2 py-1.5 bg-red-50 text-red-700 rounded-lg text-[0.6875rem] font-bold border border-red-200" }, hideRootAnswer ? "\uD83D\uDCCD " + __alloT('stem.funcgrapher.challenge_roots_hidden', 'Roots hidden until you answer') : "\uD83D\uDCCD " + roots.length + " root" + (roots.length > 1 ? 's' : '') + ": x = " + roots.map(r => r.toFixed(2)).join(', ')),

              yIntercept >= yR.yMin && yIntercept <= yR.yMax && React.createElement("span", { className: "px-2 py-1.5 bg-green-50 text-green-700 rounded-lg text-[0.6875rem] font-bold border border-green-200" }, hideYIntAnswer ? "\uD83D\uDFE2 " + __alloT('stem.funcgrapher.challenge_yint_hidden', 'y-intercept hidden until you answer') : "\uD83D\uDFE2 y-int: " + yIntercept.toFixed(2))

            ),

            // Legend

            React.createElement("div", { className: "mt-2 flex items-center gap-4 text-[0.6875rem] text-slate-600" + onHostInk },

              React.createElement("span", null, __alloT('stem.funcgrapher.f_x', "\u2014\u2014 f(x)")),

              d.showDeriv && React.createElement("span", null, __alloT('stem.funcgrapher.f_x_2', "- - - f\u2032(x)")),

              d.compare && React.createElement("span", { style: { color: '#c2410c' } }, __alloT('stem.funcgrapher.g_x', "- \u2500 - g(x)")),

              React.createElement("span", null, __alloT('stem.funcgrapher.roots', "\uD83D\uDD34 Roots")),

              React.createElement("span", null, __alloT('stem.funcgrapher.y_intercept_2', "\uD83D\uDFE2 y-intercept"))

            ),

            // ── Tangent Line Trace Slider ──
            React.createElement("div", { className: "bg-pink-50 rounded-lg p-2 border border-pink-200 mt-1" },
              React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-pink-700" }, "\uD83D\uDCCC Trace: x = " + traceX.toFixed(1)),
                React.createElement("input", { type: "range", min: xR.xMin, max: xR.xMax, step: 0.1, value: traceX, onChange: e => { upd('traceX', parseFloat(e.target.value)); if (fgTraceHidden) upd('fgQuiz', Object.assign({}, d.fgQuiz, { traceMoved: true })); }, className: "flex-1 accent-pink-500", 'aria-label': __alloT('stem.funcgrapher.trace_x_position', 'Trace x position') }),
                React.createElement("span", { 'data-function-trace':true,role:'status',className: "text-xs font-mono text-pink-700",style:{overflowWrap:'anywhere'} }, fgTraceHidden ? __alloT('stem.funcgrapher.trace_hidden_quiz', 'Move the trace slider to read values for this question.') : !Number.isFinite(traceY)?__alloT('stem.funcgrapher.trace_undefined','The function is undefined at this x.'): 'f(' + traceX.toFixed(1) + ') = ' + traceY.toFixed(2) + (Number.isFinite(traceSlope)?', slope = '+traceSlope.toFixed(2):'; '+__alloT('stem.funcgrapher.trace_no_derivative','no finite derivative at this point.')))
              )
            ),

            // ── Table of Values (collapsible) ──
            d.showTable && React.createElement("div", { className: "mt-2 bg-cyan-50 rounded-xl border border-cyan-200 p-3 overflow-x-auto" },
              React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-2" },
                React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase tracking-wider" }, __alloT('stem.funcgrapher.table_of_values', "\uD83D\uDCCB Table of Values")),
                GA && React.createElement("button", { type: "button", "data-funcgrapher-diffs": true, "aria-pressed": !!d.showDiffs, onClick: function() { upd('showDiffs', !d.showDiffs); }, style: { minHeight: 36 }, className: "ml-auto px-2 py-1 rounded-lg text-xs font-bold " + (d.showDiffs ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-800 border border-cyan-700') }, __alloT('stem.funcgrapher.table_show_diffs', '\u0394y and ratio'))),
              React.createElement("table", { className: "w-full text-xs" },
                React.createElement("caption", { className: "sr-only" }, __alloT('stem.funcgrapher.funcgrapher_data_table', "funcgrapher data table")), React.createElement("thead", null,
                  React.createElement("tr", { className: "border-b border-cyan-200" },
                    React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-cyan-800" }, "x"),
                    React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-indigo-700" }, "f(x)"),
                    d.showDeriv && React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-amber-700" }, "f\u2032(x)"),
                    d.showDiffs && GA && React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-cyan-800" }, __alloT('stem.funcgrapher.table_diff_col', '\u0394y (change from the row above)')),
                    d.showDiffs && GA && React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-cyan-800" }, __alloT('stem.funcgrapher.table_ratio_col', 'Ratio (y \u00f7 the y above)'))
                  )
                ),
                React.createElement("tbody", null,
                  (function() {
                    var rows = [], xs = [];
                    for (var tx0 = Math.ceil(xR.xMin); tx0 <= Math.floor(xR.xMax); tx0++) xs.push(tx0);
                    // Differences and ratios from the shared core (equal steps of 1 in x).
                    var diffs = d.showDiffs && GA ? GA.differencesTable(xs.map(function(x) { var v = evalF(x); return { x: x, y: isFinite(v) ? v : null }; })) : null;
                    function cell(v) { return typeof v === 'number' && isFinite(v) ? String(Number(v.toPrecision(6))) : '\u2014'; }
                    xs.forEach(function(tx, ri) {
                      var fy = evalF(tx);
                      var fdy = evalDeriv(tx);
                      rows.push(React.createElement("tr", { key: tx, className: "border-b border-cyan-100 hover:bg-cyan-100 transition-colors" },
                        React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, tx),
                        React.createElement("td", { className: "px-2 py-0.5 font-mono text-indigo-700" }, isFinite(fy) ? fy.toFixed(2) : 'undefined'),
                        d.showDeriv && React.createElement("td", { className: "px-2 py-0.5 font-mono text-amber-700" }, isFinite(fdy) ? fdy.toFixed(2) : 'undefined'),
                        diffs && React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, cell(diffs.rows[ri].dy)),
                        diffs && React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, cell(diffs.rows[ri].ratio))
                      ));
                    });
                    return rows;
                  })()
                )
              ),
              d.showDiffs && GA && React.createElement("p", { "data-funcgrapher-diff-summary": true, className: "mt-2 text-xs font-semibold text-cyan-900" },
                GA.differencesSummary(GA.differencesTable((function() { var out = []; for (var sx2 = Math.ceil(xR.xMin); sx2 <= Math.floor(xR.xMax); sx2++) { var sv = evalF(sx2); out.push({ x: sx2, y: isFinite(sv) ? sv : null }); } return out; })()), __alloT))
            ),

            // ── Educational Learn Panel (collapsible) ──
            d.showLearn && React.createElement("div", { className: "mt-2 bg-emerald-50 rounded-xl border border-emerald-200 p-4" },
              React.createElement("h3", { className: "text-sm font-bold text-emerald-800 mb-2" }, __alloT('stem.funcgrapher.understanding_functions', "\uD83D\uDCD6 Understanding Functions")),
              React.createElement("div", { className: "grid grid-cols-1 gap-2 text-xs text-emerald-900" },
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-red-600" }, __alloT('stem.funcgrapher.roots_x_intercepts', "\uD83D\uDD34 Roots (x-intercepts): ")),
                  __alloT('stem.funcgrapher.root_meaning_refined', 'A root has f(x) = 0. The graph can cross or touch the x-axis there. Numerical searches can miss roots, so use algebra or the table to check.')
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-green-700" }, __alloT('stem.funcgrapher.y_intercept', "\uD83D\uDFE2 Y-intercept: ")),
                  __alloT('stem.funcgrapher.where_the_function_crosses_the_y_axis_', "Where the function crosses the y-axis. This is the value of f(0) — simply plug in x = 0.")
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-pink-700" }, __alloT('stem.funcgrapher.slope_tangent_line', "\uD83D\uDCCC Slope & Tangent Line: ")),
                  __alloT('stem.funcgrapher.tangent_meaning_refined', 'A tangent describes the local slope where the derivative exists. It can cross the curve or meet it again. Corners and domain boundaries need special care.')
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-amber-800" }, __alloT('stem.funcgrapher.derivative_f_x', "\uD83D\uDCC9 Derivative f\u2032(x): ")),
                  __alloT('stem.funcgrapher.derivative_stationary_points_refined', 'The derivative measures the rate of change. A zero derivative can mark a local maximum, a local minimum, or neither: x³ has derivative zero at 0 and keeps increasing. Compare behavior on both sides.')
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-indigo-600" }, __alloT('stem.funcgrapher.area_under_the_curve', "\u222B Area Under the Curve: ")),
                  __alloT('stem.funcgrapher.the_shaded_area_represents_the_integra', "The shaded area represents the integral — the total \"accumulation\" of f(x). In real life, this could mean distance traveled, energy consumed, or probability.")
                ),
                d.type === 'quadratic' && !hideFamilyAnswer && React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, __alloT('stem.funcgrapher.parabolas', "\u2229 Parabolas: ")),
                  __alloT('stem.funcgrapher.when_a_0_the_parabola_opens_up_when_a_', "When a > 0, the parabola opens up (\u23E3). When a < 0, it opens down (\u23E2). The vertex is the turning point. Try changing 'a' to see!")
                ),
                d.type === 'trig' && !hideFamilyAnswer && React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, __alloT('stem.funcgrapher.trig_functions', "\u223C Trig Functions: ")),
                  __alloT('stem.funcgrapher.trig_guide_phase_shift_cb', "Amplitude |a| sets the height and b sets how many cycles fit in each 2\u03C0, so the period is 2\u03C0/|b|. The c inside sin(bx + c) shifts the wave sideways by \u2212c/b: with b positive, a positive c moves it left and a negative c moves it right.")
                )
              )
            ),

            // Sliders (f(x)). In Find the Root and Y-Intercept their values give the answer away
            // (b is the linear y-intercept, -b/a its root), so they wait for the answer.

            (hideRootAnswer || hideYIntAnswer) ? React.createElement("p", { "data-funcgrapher-sliders-hidden": true, className: "mt-2 rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs font-semibold text-slate-700" }, __alloT('stem.funcgrapher.sliders_hidden_quiz', 'The a, b and c sliders are hidden until you answer: their values would give the answer away.')) : React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-2" },

              [{ k: 'a', label: 'a', min: -5, max: 5, step: 0.1 }, { k: 'b', label: 'b', min: -5, max: 5, step: 0.1 }, { k: 'c', label: 'c', min: -5, max: 5, step: 0.1 }].map(s =>

                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("label", { className: "text-xs font-bold text-indigo-600" }, s.label + " = " + d[s.k]),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-indigo-600", "aria-label": "Parameter " + s.label })

                )

              )

            ),

            fgModeBar(),
            h('div', { id: 'fg-stage-panel', role: 'tabpanel', 'aria-labelledby': 'fg-stage-tab-' + fgStage, 'data-funcgrapher-stage': fgStage },
            fgStage === 'explore' && fgRenderRate(),
            fgStage === 'explore' && fgRenderFeatures(),
            // ── Compare Mode Toggle + Sliders ──
            fgStage === 'explore' && React.createElement("div", { className: "mt-2 flex flex-wrap items-center gap-2" },
              React.createElement("button", { 'aria-pressed': !!d.compare, onClick: function() { upd('compare', !d.compare); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.compare ? 'bg-orange-700 text-white shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-600') }, d.compare ? '\u2705 Comparing' : '\uD83D\uDD00 Compare'),
              d.compare && React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                TYPES.map(function(tp) {
                  // Named by family, not by its glyph; an unset compareType graphs as linear.
                  var cmpActive = (d.compareType || 'linear') === tp.id;
                  return React.createElement("button", { key: 'cmp-' + tp.id, 'aria-label': tp.label, 'aria-pressed': cmpActive, onClick: function() { upd('compareType', tp.id); }, className: "px-2 py-1 rounded text-[0.6875rem] font-bold transition-all " + (cmpActive ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600') }, tp.emoji);
                })
              )
            ),
            fgStage === 'explore' && d.compare && React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-1" },
              [{ k: 'compareA', label: 'a\u2082', min: -5, max: 5, step: 0.1 }, { k: 'compareB', label: 'b\u2082', min: -5, max: 5, step: 0.1 }, { k: 'compareC', label: 'c\u2082', min: -5, max: 5, step: 0.1 }].map(function(s) {
                return React.createElement("div", { key: s.k, className: "text-center bg-orange-50 rounded-lg p-2 border border-orange-200" },
                  React.createElement("label", { className: "text-xs font-bold text-orange-700" }, s.label + ' = ' + (d[s.k] || 0)),
                  React.createElement("input", { type: 'range', min: s.min, max: s.max, step: s.step, value: d[s.k] || 0, onChange: function(e) { upd(s.k, parseFloat(e.target.value)); }, className: 'w-full accent-orange-500', 'aria-label': 'Compare parameter ' + s.label })
                );
              })
            ),

            // ── Transformation Lab (Explore): y = a·f(b(x − h)) + k on its own tf key ──
            fgStage === 'explore' && fgRenderTfLab(false),


            fgStage === 'investigate' && (function(){
              var rawStep=d.secantStep==null?'1':String(d.secantStep),step=Number(rawStep);
              var key=JSON.stringify([d.type,d.a,d.b,d.c,traceX,rawStep,d.secantPrediction||'']);
              var current=d.secantResult&&d.secantResultKey===key,study=current?d.secantResult:null;
              var ink=ctx.isContrast?'#ffffff':ctx.isDark?'#e2e8f0':'#0f172a',surface=ctx.isContrast?'#000000':ctx.isDark?'#0f172a':'#ffffff',border=ctx.isContrast?'#facc15':'#64748b';
              var field={padding:10,minHeight:44,border:'1px solid '+border,borderRadius:6,background:surface,color:ink,maxWidth:'100%',boxSizing:'border-box'};
              function set(patch){setLabToolData(function(prev){return Object.assign({},prev,{funcGrapher:Object.assign({},prev.funcGrapher,patch)});});}
              function number(value){return typeof value==='number'&&Number.isFinite(value)?Number(value.toPrecision(9)).toString():'Unavailable';}
              return h('details',{'data-secant-investigation':true,style:{marginTop:16,padding:14,border:'1px solid '+border,borderRadius:12,color:ink,background:surface,overflowWrap:'anywhere'}},
                h('summary',{style:{fontSize:16,fontWeight:700,cursor:'pointer'}},'From secant slopes to a tangent'),
                h('p',null,'Use the current function and trace point. Move the trace slider above to investigate another point. Compare slopes on both sides as a positive step h shrinks.'),
                h('p',{'data-secant-base':true},'Base point x₀ = '+traceX+'; f(x₀) = '+number(traceY)+'.'),
                h('p',null,'Left: [f(x₀) − f(x₀ − h)] / h. Right: [f(x₀ + h) − f(x₀)] / h. The centered estimate uses the two outer samples; by itself it can hide a corner.'),
                h('label',{style:{display:'block'}},'Starting secant step h',h('input',{type:'number',step:'any',value:rawStep,style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){set({secantStep:e.target.value,secantNotice:''});}})),
                h('label',{style:{display:'block',marginTop:10}},'Predict the left and right slopes',h('select',{value:d.secantPrediction||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){set({secantPrediction:e.target.value,secantNotice:''});}},
                  h('option',{value:''},'Choose a prediction'),h('option',{value:'same'},'They approach the same finite slope'),h('option',{value:'different'},'They approach different slopes'),h('option',{value:'unavailable'},'A finite two-sided slope is unavailable'),h('option',{value:'unsure'},'I need more evidence'))),
                h('button',{type:'button',style:Object.assign({},field,{marginTop:10}),onClick:function(){
                  if(current){set({secantNotice:'These inputs are already calculated. Change the step, trace point, function, or prediction to investigate another case.'});return;}
                  var result=fgSecantStudy(evalF,traceSlope,traceX,step);
                  if(!result.ok){set({secantNotice:result.error});return;}
                  if(!d.secantPrediction){set({secantNotice:'Choose a prediction before calculating.'});return;}
                  result.context={equation:eqStr,type:d.type,a:d.a,b:d.b,c:d.c,prediction:d.secantPrediction,created:new Date().toISOString()};
                  set({secantResult:result,secantResultKey:key,secantReveal:false,secantReflection:'',secantNotice:'Four step sizes calculated. Compare the left and right slopes before revealing the derivative.'});
                  if(announceToSR)announceToSR('Secant slope investigation calculated.');
                }},'Compute secant slopes'),
                (typeof d.secantNotice === 'string' && d.secantNotice)?h('p',{role:'status'},d.secantNotice):null,
                d.secantResult&&!current?h('p',{role:'status'},'The function, trace point, step, or prediction changed. Compute again to refresh the investigation.'):null,
                study?h('div',{'data-secant-results':true},
                  study.value===null?h('p',null,'The function is undefined or non-finite at the base point, so a derivative there is unavailable.'):null,
                  study.rows.some(function(row){return row.collapsed;})?h('p',null,'Some sample positions coincide at machine precision. A smaller step cannot resolve a slope there.'):null,
                  h('div',{tabIndex:0,role:'region','aria-label':__alloT('stem.funcgrapher.secant_slope_comparison_table','Secant slope comparison table'),style:{overflowX:'auto',marginTop:12}},h('table',{style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
                    h('caption',{style:{color:ink,textAlign:'left'}},'Four shrinking steps at x₀ = '+study.x),
                    h('thead',null,h('tr',null,['Step h','Left slope ≈','Right slope ≈','Centered estimate ≈'].map(function(label){return h('th',{key:label,scope:'col',style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border,color:ink}},label);}))),
                    h('tbody',null,study.rows.map(function(row,i){return h('tr',{key:i},[row.step,row.left,row.right,row.center].map(function(value,j){return h('td',{key:j,style:{padding:8,borderBottom:'1px solid '+border,color:ink,whiteSpace:'nowrap'}},number(value));}));})))),
                  h('p',null,'Unavailable values can reflect domain restrictions, overflow, or steps too small for the computer to distinguish. Very small steps can amplify roundoff; four rows do not prove a limit.'),
                  h('button',{type:'button',style:field,onClick:function(){upd('secantReveal',!d.secantReveal);}},d.secantReveal?'Hide derivative comparison':'Compare with the derivative'),
                  d.secantReveal?h('p',{'data-secant-derivative':true,role:'status'},study.derivative===null?'No finite derivative value is available here. Compare the one-sided evidence and check the domain and numerical range.':'Analytic derivative f′(x₀) = '+number(study.derivative)+'. Compare each side with this value; a zero derivative alone does not establish a turning point.'):null,
                  h('label',{style:{display:'block',marginTop:12}},'Explain what the two sides show',h('textarea',{rows:3,maxLength:1500,value:d.secantReflection||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){upd('secantReflection',e.target.value);}})),
                  h('button',{type:'button',style:Object.assign({},field,{marginTop:10}),onClick:function(){
                    var url=URL.createObjectURL(new Blob([fgSecantMarkdown(study,d.secantReflection,!!d.secantReveal)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='secant-to-tangent-investigation.md';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
                  }},'Export secant investigation')):null);
            })(),

            // A separate endpoint investigation: the selected family graph above is unchanged.
            fgStage === 'investigate' && (function(){
              var power=[.5,1,2].indexOf(Number(d.improperPower))!==-1?Number(d.improperPower):.5;
              var epsilon=d.improperEpsilon==null?'.1':String(d.improperEpsilon);
              var rows=(Array.isArray(d.improperRows)?d.improperRows:[]).filter(function(r){return r&&fgTruncatedIntegral(r.power,r.epsilon).ok;}).slice(-18);
              var sample=fgTruncatedIntegral(power,epsilon);
              var ink=ctx.isContrast?'#ffffff':ctx.isDark?'#e2e8f0':'#0f172a',surface=ctx.isContrast?'#000000':ctx.isDark?'#0f172a':'#ffffff',border=ctx.isContrast?'#facc15':'#64748b';
              var field={padding:10,border:'1px solid '+border,borderRadius:6,background:surface,color:ink,maxWidth:'100%',boxSizing:'border-box'};
              function set(patch){setLabToolData(function(prev){return Object.assign({},prev,{funcGrapher:Object.assign({},prev.funcGrapher,patch)});});}
              return h('details',{'data-improper-investigation':true,style:{marginTop:16,padding:14,border:'1px solid '+border,borderRadius:12,color:ink,background:surface}},
                h('summary',{style:{fontSize:16,fontWeight:700,cursor:'pointer'}},'Can an unbounded function have finite area?'),
                h('p',null,'Compare 1/√x, 1/x, and 1/x² from 0 to 1. All are undefined at zero. Start at a positive cutoff ε and move it toward zero to investigate the missing endpoint.'),
                h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
                  h('label',null,'Endpoint example',h('select',{'aria-label':__alloT('stem.funcgrapher.endpoint_example','Endpoint example'),value:power,style:field,onChange:function(e){set({improperPower:Number(e.target.value),improperReveal:false,improperNotice:''});}},
                    h('option',{value:.5},'1/√x'),h('option',{value:1},'1/x'),h('option',{value:2},'1/x²'))),
                  h('label',null,'Cutoff ε',h('input',{'aria-label':__alloT('stem.funcgrapher.positive_endpoint_cutoff','Positive endpoint cutoff'),type:'number',step:'any',min:.000001,max:.999999,value:epsilon,style:field,onChange:function(e){set({improperEpsilon:e.target.value,improperNotice:''});}}))),
                h('label',{style:{display:'block',marginTop:12}},'Predict what happens as ε approaches zero',
                  h('select',{value:d.improperPrediction||'',style:Object.assign({},field,{display:'block'}),onChange:function(e){upd('improperPrediction',e.target.value);}},
                    h('option',{value:''},'Choose a prediction'),h('option',{value:'finite'},'Area approaches a finite value'),h('option',{value:'unbounded'},'Area grows without bound'),h('option',{value:'unsure'},'I need more evidence'))),
                h('button',{type:'button',style:Object.assign({},field,{marginTop:10,minHeight:44}),onClick:function(){
                  if(!sample.ok){set({improperNotice:'Enter a positive cutoff less than 1.'});return;}
                  if(!d.improperPrediction){set({improperNotice:'Record a prediction before adding a trial.'});return;}
                  if(rows.some(function(r){return Number(r.power)===power&&Number(r.epsilon)===sample.epsilon;})){set({improperNotice:'That cutoff is already recorded for this example. Try a smaller value.'});return;}
                  set({improperRows:rows.concat([{power:power,epsilon:sample.epsilon,prediction:d.improperPrediction}]).slice(-18),improperNotice:'Trial recorded. Try ε / 10, then compare how much area was added.'});
                }},'Record cutoff trial'),
                (typeof d.improperNotice === 'string' && d.improperNotice)?h('p',{role:'status'},d.improperNotice):null,
                rows.length?h('div',{tabIndex:0,role:'region','aria-label':__alloT('stem.funcgrapher.endpoint_trial_table','Endpoint trial table'),style:{overflowX:'auto'}},h('table',{style:{width:'100%',fontSize:13,borderCollapse:'collapse',color:ink}},
                  h('caption',{style:{color:ink}},'Recent cutoff trials: area from ε to 1'),
                  h('thead',null,h('tr',null,['Function','Cutoff ε','Area ≈','Prediction'].map(function(label){return h('th',{key:label,scope:'col',style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border,color:ink}},label);}))),
                  h('tbody',null,rows.map(function(row,i){var r=fgTruncatedIntegral(row.power,row.epsilon);return h('tr',{key:i},[r.power===.5?'1/√x':r.power===1?'1/x':'1/x²',r.epsilon,Number(r.area.toPrecision(7)),row.prediction].map(function(v,j){return h('td',{key:j,style:{padding:8,borderBottom:'1px solid '+border,color:ink}},String(v));}));})))):null,
                h('p',null,'Each trial integrates over a finite interval. An increasing table alone does not show that the total is infinite; compare the antiderivative and its limit.'),
                h('button',{type:'button',disabled:!rows.some(function(r){return Number(r.power)===power;}),style:Object.assign({},field,{minHeight:44}),onClick:function(){upd('improperReveal',!d.improperReveal);}},d.improperReveal?'Hide limit explanation':'Compare with the limit'),
                d.improperReveal?h('p',{'data-improper-limit':true,role:'status'},power===.5?'Area = 2(1 − √ε). As ε approaches zero, √ε approaches zero, so the area approaches 2. The integrand is unbounded, but this improper integral converges.':power===1?'Area = −ln(ε). As ε approaches zero from above, this grows without bound. The improper integral diverges.':'Area = 1/ε − 1. As ε approaches zero from above, this grows without bound. The improper integral diverges.'):null,
                h('label',{style:{display:'block',marginTop:12}},'Explain how the trials support or change your prediction',
                  h('textarea',{rows:3,maxLength:1500,value:d.improperReflection||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){upd('improperReflection',e.target.value);}})),
                h('p',{style:{fontSize:12}},'Trials use antiderivative formulas and rounded display values. The last 18 trials and your explanation are retained in this AlloFlow project.'))
            })(),

            // ── AI Explain Button ──
            // Its prompt sends roots, intercept and equation: not while a question is open.
            fgStage === 'explore' && callGemini && !fgQuizLeaks && React.createElement("div", { className: "mt-2" },
              React.createElement("button", { onClick: function() {
                if (d.aiExplainLoading) return;
                upd('aiExplainLoading', true);
                upd('aiExplain', '');
                var prompt = 'You are a math tutor. Explain the behavior of this function to a ' + (gradeLevel || '5th Grade') + ' student in 3-4 short, friendly sentences. ' +
                  'Function: ' + eqStr + '. Type: ' + d.type + '. ' +
                  'Parameters: a=' + d.a + ', b=' + d.b + ', c=' + d.c + '. ' +
                  'Roots at x=' + (roots.length > 0 ? roots.map(function(r) { return r.toFixed(2); }).join(', ') : 'none visible') + '. ' +
                  'Y-intercept: ' + yIntercept.toFixed(2) + '. ' +
                  'Visible range: x=[' + xR.xMin + ',' + xR.xMax + '], y=[' + yR.yMin + ',' + yR.yMax + ']. ' +
                  'Describe the shape, key features, and what happens as x increases. Use simple language.';
                callGemini(prompt, true, false, 0.7).then(function(resp) {
                  upd('aiExplain', typeof resp === 'string' ? resp : 'Could not generate explanation.');
                  upd('aiExplainLoading', false);
                }).catch(function() {
                  upd('aiExplain', 'Explanation unavailable right now.');
                  upd('aiExplainLoading', false);
                });
              }, disabled: d.aiExplainLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiExplainLoading ? 'bg-purple-700 text-white cursor-wait' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md') }, d.aiExplainLoading ? '\u23F3 Thinking...' : '\u2728 Explain This Graph'),
              d.aiExplain && React.createElement("div", { className: "mt-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed" },
                React.createElement("div", { className: "flex items-center gap-1.5 mb-1" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-purple-600 uppercase tracking-wider" }, __alloT('stem.funcgrapher.ai_explanation', "\uD83E\uDDE0 AI Explanation"))
                ),
                d.aiExplain
              )
            ),

            // Presets

            fgStage === 'explore' && React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },

              React.createElement("p", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2" + onHostInk }, __alloT('stem.funcgrapher.quick_presets', "\u26A1 Quick Presets")),

              React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                [

                  { label: __alloT('stem.funcgrapher.y_2x_1', 'y = 2x + 1'), type: 'linear', a: 2, b: 1, c: 0, tip: __alloT('stem.funcgrapher.slope_2_y_intercept_1', 'Slope 2, y-intercept 1') },

                  { label: __alloT('stem.funcgrapher.y_x', 'y = x\u00B2'), type: 'quadratic', a: 1, b: 0, c: 0, tip: __alloT('stem.funcgrapher.standard_parabola', 'Standard parabola') },

                  { label: __alloT('stem.funcgrapher.y_x_4', 'y = -x\u00B2 + 4'), type: 'quadratic', a: -1, b: 0, c: 4, tip: __alloT('stem.funcgrapher.inverted_parabola_vertex_at_0_4', 'Inverted parabola, vertex at (0,4)') },

                  { label: __alloT('stem.funcgrapher.y_sin_x', 'y = sin(x)'), type: 'trig', a: 1, b: 1, c: 0, tip: __alloT('stem.funcgrapher.standard_sine_wave', 'Standard sine wave') },

                  { label: __alloT('stem.funcgrapher.y_2sin_3x', 'y = 2sin(3x)'), type: 'trig', a: 2, b: 3, c: 0, tip: __alloT('stem.funcgrapher.amplitude_2_period_2_3', 'Amplitude=2, period=2\u03C0/3') },

                  { label: __alloT('stem.funcgrapher.y_x_2', 'y = x\u00B3'), type: 'cubic', a: 1, b: 0, c: 0, tip: __alloT('stem.funcgrapher.cubic_with_inflection_at_origin', 'Cubic with inflection at origin') },

                  { label: __alloT('stem.funcgrapher.y_e_x', 'y = e^x'), type: 'exponential', a: 1, b: 1, c: 0, tip: __alloT('stem.funcgrapher.natural_exponential_growth', 'Natural exponential growth') },

                  { label: __alloT('stem.funcgrapher.y_x_3', 'y = |x|'), type: 'absolute', a: 1, b: 0, c: 0, tip: __alloT('stem.funcgrapher.v_shaped_absolute_value', 'V-shaped absolute value') },

                ].map(function (p) {

                  return React.createElement("button", { key: p.label, onClick: function () {

                      setFnType(p.type); upd('a', p.a); upd('b', p.b); upd('c', p.c);

                      addToast('\uD83D\uDCC8 ' + p.tip, 'success');

                    }, className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-indigo-50 text-indigo-700 border border-indigo-600 hover:bg-indigo-100 transition-all"

                  }, p.label);

                })

              )

            ),

            // ── Challenges: Name That Graph, Find the Root, What's the y-intercept? ──

            fgStage === 'practice' && (() => {

              // Read as fgQuiz.mode / .s / .answered / .options.map, so a
              // string or bare {} is not a usable quiz.
              var fgQuiz = (d.fgQuiz && typeof d.fgQuiz === 'object' && !Array.isArray(d.fgQuiz)
                && typeof d.fgQuiz.mode === 'string') ? d.fgQuiz : null;

              var fgScore = d.fgScore || 0;

              var fgStreak = d.fgStreak || 0;

              var challengeMode = d.fgChallengeMode || 'name'; // 'name' | 'root' | 'yint'



              // ── Family labels + visual signatures (drive both quiz options and the
              // corrective feedback — the signature is HOW you tell that family apart) ──

              var FG_LABELS = { linear: 'Linear (y = ax + b)', quadratic: 'Quadratic (y = ax² + bx + c)', trig: 'Trigonometric (y = a·sin(bx + c))', cubic: 'Cubic (y = ax³ + bx + c)', exponential: 'Exponential (y = a·eᵇˣ + c)', absolute: 'Absolute Value (y = a|x + b| + c)', sqrt: 'Square Root (y = a√(x + b) + c)', log: 'Logarithm (y = a·ln(x + b) + c)', rational: 'Rational (y = a/(x + b) + c)' };
              // The same translator as the render's, declared here so the challenge banks below stay
              // self-contained (the engine tests run this section on its own, with no ctx).
              function __alloT(k, fb) { var v; try { v = (typeof ctx !== 'undefined' && ctx && typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; }

              var FG_TRAITS = {
                linear: __alloT('stem.funcgrapher.trait_linear', 'a perfectly straight line — the slope never changes'),
                quadratic: __alloT('stem.funcgrapher.trait_quadratic', 'a single U-turn (the vertex) with both arms heading the SAME direction'),
                trig: __alloT('stem.funcgrapher.trait_trig', 'a wave that repeats the same cycle forever'),
                cubic: __alloT('stem.funcgrapher.trait_cubic', 'an S-bend whose two ends head in OPPOSITE directions'),
                exponential: __alloT('stem.funcgrapher.trait_exponential', 'nearly flat on one side, then exploding upward on the other'),
                absolute: __alloT('stem.funcgrapher.trait_absolute', 'a sharp V corner — two straight pieces meeting at a point'),
                sqrt: __alloT('stem.funcgrapher.trait_sqrt', 'half a sideways parabola that STARTS at an edge point and only goes one way'),
                log: __alloT('stem.funcgrapher.trait_log', 'a fast climb that flattens out, with a vertical wall (asymptote) on one side'),
                rational: __alloT('stem.funcgrapher.trait_rational', 'two separate branches split by a vertical asymptote the curve never touches')
              };

              // Family pool grows with grade band
              var FG_BAND_TYPES = {
                'K-2':  ['linear', 'quadratic', 'absolute'],
                '3-5':  ['linear', 'quadratic', 'absolute', 'trig'],
                '6-8':  ['linear', 'quadratic', 'trig', 'cubic', 'exponential', 'absolute'],
                '9-12': ['linear', 'quadratic', 'trig', 'cubic', 'exponential', 'absolute', 'sqrt', 'log', 'rational']
              };

              // Unbiased in-place Fisher-Yates — the Math.random()-0.5 comparator it
              // replaces left the correct answer disproportionately near where it
              // was inserted (position bias).
              function fgShuffle(arr) {
                for (var fi = arr.length - 1; fi > 0; fi--) {
                  var fj = Math.floor(Math.random() * (fi + 1));
                  var ft = arr[fi]; arr[fi] = arr[fj]; arr[fj] = ft;
                }
                return arr;
              }

              // ── Name That Graph generator (grade-banded pool) ──

              function makeFgQuiz() {

                var types = FG_BAND_TYPES[gradeBand] || FG_BAND_TYPES['3-5'];

                var tp = types[Math.floor(Math.random() * types.length)];

                var opts = [FG_LABELS[tp]];

                while (opts.length < Math.min(4, types.length)) { var r = FG_LABELS[types[Math.floor(Math.random() * types.length)]]; if (opts.indexOf(r) < 0) opts.push(r); }

                return { mode: 'name', type: tp, answer: FG_LABELS[tp], opts: fgShuffle(opts), answered: false };

              }



              // ── Find the Root generator ──

              function makeRootQuiz() {

                // Pick linear or quadratic with guaranteed nice roots.
                // Younger bands stay linear-only; quadratics unlock at 6-8.

                var pick = (gradeBand === 'K-2' || gradeBand === '3-5') ? 0 : Math.random();

                var qa, qb, qc, qtype, rootAnswer, rootAnswers;

                if (pick < 0.5) {

                  // Linear: a*x + b = 0 → root = -b/a

                  qa = [1, 2, -1, -2, 3][Math.floor(Math.random() * 5)];

                  qb = [-6, -4, -2, 0, 2, 4, 6][Math.floor(Math.random() * 7)];

                  qc = 0; qtype = 'linear';

                  rootAnswer = Math.round((-qb / qa) * 100) / 100;

                  rootAnswers = [rootAnswer];

                } else {

                  // Quadratic: a*(x - r1)*(x - r2), pick small integer roots

                  var r1 = Math.floor(Math.random() * 7) - 3;

                  var r2 = r1 + Math.floor(Math.random() * 4) + 1;

                  qa = 1; qb = -(r1 + r2); qc = r1 * r2; qtype = 'quadratic';

                  rootAnswer = r1;

                  // BOTH roots are correct answers to "what is one root": r2 must never be
                  // generated as a "wrong" option, and must grade correct if picked.
                  rootAnswers = [r1, r2];

                }

                // Build 4 numeric options including the correct answer

                var opts = [rootAnswer];

                while (opts.length < 4) {

                  // Round like the answer: -1.33 + 1 is -0.33000000000000007 on the button.
                  var wrong = Math.round((rootAnswer + (Math.floor(Math.random() * 7) - 3)) * 100) / 100;

                  if (rootAnswers.indexOf(wrong) < 0 && opts.indexOf(wrong) < 0) opts.push(wrong);

                }

                return { mode: 'root', type: qtype, a: qa, b: qb, c: qc, answer: rootAnswer, answers: rootAnswers, opts: fgShuffle(opts), answered: false };

              }



              // ── What's the y-intercept? generator ──

              function makeYIntQuiz() {

                // Banded: K-2/3-5 linear only, 6-8 adds quadratic, 9-12 adds cubic
                var pick = (gradeBand === 'K-2' || gradeBand === '3-5') ? 0 : (gradeBand === '6-8' ? Math.random() * 0.8 : Math.random());

                var qa, qb, qc, qtype, yIntAnswer;

                if (pick < 0.4) {

                  qa = [1, 2, -1, -2, 3][Math.floor(Math.random() * 5)];

                  qb = Math.floor(Math.random() * 11) - 5; qc = 0; qtype = 'linear';

                  yIntAnswer = qb; // f(0) = a*0 + b

                } else if (pick < 0.8) {

                  qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                  qb = Math.floor(Math.random() * 7) - 3;

                  qc = Math.floor(Math.random() * 9) - 4; qtype = 'quadratic';

                  yIntAnswer = qc; // f(0) = a*0 + b*0 + c

                } else {

                  qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                  qb = Math.floor(Math.random() * 7) - 3;

                  qc = Math.floor(Math.random() * 9) - 4; qtype = 'cubic';

                  yIntAnswer = qc; // f(0) = c for cubic a*x³ + b*x + c

                }

                var opts = [yIntAnswer];

                while (opts.length < 4) {

                  var wrong = yIntAnswer + (Math.floor(Math.random() * 7) - 3);

                  if (wrong !== yIntAnswer && opts.indexOf(wrong) < 0) opts.push(wrong);

                }

                return { mode: 'yint', type: qtype, a: qa, b: qb, c: qc, answer: yIntAnswer, opts: fgShuffle(opts), answered: false };

              }



              // ── Misconception bank (True/False "myth busting") ──
              // Each entry targets a documented student misconception; the `why` is the
              // corrective explanation shown after EVERY answer, right or wrong.
              var FG_MYTHS = {
                '3-5': [
                  { s: __alloT('stem.funcgrapher.myth_g35_0_s', 'A steeper line has a bigger slope number.'), t: true, why: __alloT('stem.funcgrapher.myth_g35_0_why', 'Slope counts how much the line climbs for each step to the right — steeper climb, bigger number.') },
                  { s: __alloT('stem.funcgrapher.myth_g35_1_s', 'The line y = 2x goes DOWN as you move right.'), t: false, why: __alloT('stem.funcgrapher.myth_g35_1_why', 'The slope 2 is positive, so the line climbs. Only negative slopes go downhill.') },
                  { s: __alloT('stem.funcgrapher.myth_g35_2_s', 'A graph can cross the y-axis in two different places.'), t: false, why: __alloT('stem.funcgrapher.myth_g35_2_why', 'A function gives exactly one output at x = 0, so it has exactly ONE y-intercept.') },
                  { s: __alloT('stem.funcgrapher.myth_g35_3_s', 'Making "a" negative in y = a·x flips the line downhill.'), t: true, why: __alloT('stem.funcgrapher.myth_g35_3_why', 'A negative slope trades climbing for falling — the line reflects over the x-axis.') },
                  { s: __alloT('stem.funcgrapher.myth_g35_4_s', 'Adding 3 to a function (y = x + 3) slides the whole line up 3.'), t: true, why: __alloT('stem.funcgrapher.myth_g35_4_why', 'Every point gets 3 added to its height — same shape, shifted up.') }
                ],
                '6-8': [
                  { s: __alloT('stem.funcgrapher.myth_g68_0_s', 'A bigger "a" in y = ax² makes the parabola wider.'), t: false, why: __alloT('stem.funcgrapher.myth_g68_0_why', 'Bigger |a| makes it NARROWER — each step in x now costs more height. Wide parabolas come from |a| < 1.') },
                  { s: __alloT('stem.funcgrapher.myth_g68_1_s', 'y = x² + 3 has the same shape as y = x², just moved up.'), t: true, why: __alloT('stem.funcgrapher.myth_g68_1_why', 'Adding a constant lifts every point 3 units — the shape is untouched.') },
                  { s: __alloT('stem.funcgrapher.myth_g68_2_s', 'sin(2x) is twice as TALL as sin(x).'), t: false, why: __alloT('stem.funcgrapher.myth_g68_2_why', 'The 2 INSIDE squeezes the wave to twice the cycles (shorter period). Height comes from the number in FRONT — the amplitude.') },
                  { s: __alloT('stem.funcgrapher.myth_g68_3_s', 'Every parabola crosses the x-axis twice.'), t: false, why: __alloT('stem.funcgrapher.myth_g68_3_why', 'Lift the vertex above the x-axis and it never crosses — a parabola can have 0, 1, or 2 roots.') },
                  { s: __alloT('stem.funcgrapher.myth_g68_4_s', 'y = |x| has a sharp corner at the origin.'), t: true, why: __alloT('stem.funcgrapher.myth_g68_4_why', 'Left of 0 the slope is −1, right of 0 it is +1. That sudden switch is the V corner — no smooth turn.') },
                  { s: __alloT('stem.funcgrapher.myth_g68_5_s', 'If two graphs cross, they are equal at that x-value.'), t: true, why: __alloT('stem.funcgrapher.myth_g68_5_why', 'A crossing point is exactly where both functions give the same output — that is what solving f(x) = g(x) finds.') }
                ],
                '9-12': [
                  { s: __alloT('stem.funcgrapher.myth_g912_0_s', 'The graph of y = 1/x eventually touches the x-axis.'), t: false, why: __alloT('stem.funcgrapher.myth_g912_0_why', 'It gets infinitely close but never arrives — the x-axis is a horizontal ASYMPTOTE, a boundary the curve approaches forever.') },
                  { s: __alloT('stem.funcgrapher.myth_g912_1_s', 'Exponential growth eventually beats ANY polynomial.'), t: true, why: __alloT('stem.funcgrapher.myth_g912_1_why', 'For big enough x, eˣ outruns x², x³, even x¹⁰⁰. Growth proportional to current size always wins the long game.') },
                  { s: __alloT('stem.funcgrapher.myth_g912_2_s', 'ln(x) flattens out and approaches a maximum height.'), t: false, why: __alloT('stem.funcgrapher.myth_g912_2_why', 'It grows forever — just very slowly. It has no horizontal asymptote and eventually passes ANY height.') },
                  { s: __alloT('stem.funcgrapher.myth_g912_3_s', 'Wherever f′(x) = 0, the function has a max or a min.'), t: false, why: __alloT('stem.funcgrapher.myth_g912_3_why', 'y = x³ at x = 0: the slope is 0 but it is a flat S-bend (an inflection), not a peak or valley. Zero slope is necessary, not sufficient.') },
                  { s: __alloT('stem.funcgrapher.myth_g912_4_s', 'Shifting a graph up can change how many roots it has.'), t: true, why: __alloT('stem.funcgrapher.myth_g912_4_why', 'Raise y = x² − 1 by one unit and its two roots merge into one; raise it more and they vanish. Vertical shifts move the axis crossings.') },
                  { s: __alloT('stem.funcgrapher.myth_g912_5_s', '√x is just x² in reverse, so its graph is a full parabola.'), t: false, why: __alloT('stem.funcgrapher.myth_g912_5_why', 'It is HALF a sideways parabola — the square root only returns the non-negative answer, so the graph starts at the edge and goes one way.') }
                ]
              };
              function mythBankForBand() { return FG_MYTHS[gradeBand === 'K-2' ? '3-5' : gradeBand] || FG_MYTHS['6-8']; }

              function makeMythQuiz() {
                var bank = mythBankForBand();
                var lastIdx = typeof d.fgLastMythIdx === 'number' ? d.fgLastMythIdx : -1;
                var mi = Math.floor(Math.random() * bank.length);
                if (mi === lastIdx) mi = (mi + 1) % bank.length; // avoid immediate repeat
                var m = bank[mi];
                return { mode: 'myth', mythIdx: mi, s: m.s, answer: m.t, why: m.why, opts: [true, false], answered: false };
              }

              // Evaluate a quiz's stored function at x — powers the diagnostic feedback
              function evalQ(q, x) {
                if (q.type === 'linear') return q.a * x + q.b;
                if (q.type === 'quadratic') return q.a * x * x + q.b * x + q.c;
                if (q.type === 'cubic') return q.a * x * x * x + q.b * x + q.c;
                return NaN;
              }

              // Hint ladders for Find the Root and Y-Intercept: every number comes from the question's rule.
              function fgQuizHints(q) {
                var rule = eqStr.replace(/^f\(x\) = /, '');
                function n(v) { var r = Math.round(v * 100) / 100; return String(r === 0 ? 0 : r); }
                if (q.mode === 'yint') {
                  return [
                    __alloT('stem.funcgrapher.hint_yint_nudge', 'The y-intercept is where the graph crosses the y-axis.'),
                    __alloT('stem.funcgrapher.hint_yint_strategy', 'Every point on the y-axis has x = 0, so work out f(0).'),
                    fgFill(__alloT('stem.funcgrapher.hint_yint_worked', 'Put x = 0 into {rule}: every term with an x becomes 0.'), { rule: rule }),
                    fgFill(__alloT('stem.funcgrapher.hint_yint_answer', 'f(0) = {y}, so the graph crosses the y-axis at (0, {y}).'), { y: n(evalQ(q, 0)) })];
                }
                var answers = Array.isArray(q.answers) ? q.answers : [q.answer];
                var worked = q.type === 'quadratic'
                  ? fgFill(__alloT('stem.funcgrapher.hint_root_worked_quadratic', '{rule} = 0 factors as {factored} = 0, and a product is 0 only when a factor is 0.'), { rule: rule, factored: answers.map(function(r) { return r === 0 ? 'x' : '(x ' + (r > 0 ? '− ' : '+ ') + n(Math.abs(r)) + ')'; }).join('') })
                  : fgFill(__alloT('stem.funcgrapher.hint_root_worked_linear', '{rule} = 0, so {a}x = {nb} and x = {nb} ÷ {a}.'), { rule: rule, a: n(q.a), nb: n(-q.b) });
                return [
                  __alloT('stem.funcgrapher.hint_root_nudge', 'A root is where the graph meets the x-axis: the x-value that makes f(x) = 0.'),
                  __alloT('stem.funcgrapher.hint_root_strategy', 'Set the rule equal to 0 and solve for x, or move the trace slider and watch for f(x) to reach 0.'),
                  worked,
                  fgFill(__alloT('stem.funcgrapher.hint_root_answer', 'x = {list}'), { list: answers.map(n).join(' or x = ') })];
              }

              // ── Corrective feedback: explain WHY, not just reveal the answer ──
              // Wrong answers get a diagnosis of the mistake (e.g. "f(your pick) isn't 0");
              // right answers get a one-line reinforcement of the underlying rule.
              function buildFeedback(q, chosen, correct) {
                if (q.mode === 'match') {
                  var tItem = matchItem(q.answer), cItem = matchItem(chosen);
                  if (!tItem) return '';
                  var tail = fgFill(__alloT('stem.funcgrapher.match_answer_is', 'The match: {eq} goes with "{story}"'), { eq: tItem.eq, story: tItem.story });
                  var steps = matchStepNote(tItem);
                  if (correct) return fgFill(__alloT('stem.funcgrapher.match_correct', 'Signature spotted: {trait}.'), { trait: FG_TRAITS[tItem.fam] }) + ' ' + steps + ' ' + tail;
                  var why, famType = TYPES.filter(function(tp) { return tp.id === tItem.fam; })[0];
                  if (cItem && cItem.fam === tItem.fam) {
                    why = fgFill(__alloT('stem.funcgrapher.match_same_family', 'Both are {family}, so compare the details: at x = 0 this one is {t0} and your choice is {c0}; each step in x adds {td} here and {cd} in your choice.'), { family: famType ? famType.label : tItem.fam, t0: Number(tItem.f(0).toFixed(2)), c0: Number(cItem.f(0).toFixed(2)), td: Number((tItem.f(1) - tItem.f(0)).toFixed(2)), cd: Number((cItem.f(1) - cItem.f(0)).toFixed(2)) });
                  } else {
                    why = fgFill(__alloT('stem.funcgrapher.match_diff_family', 'Your choice shows {chosen}. This {from} shows {target}.'), { chosen: cItem ? FG_TRAITS[cItem.fam] : '?', from: MATCH_REP_NAMES[q.from], target: FG_TRAITS[tItem.fam] });
                  }
                  var myth = MATCH_MYTHS[tItem.fam] || (cItem && MATCH_MYTHS[cItem.fam]);
                  return why + ' ' + steps + (myth ? ' ' + __alloT('stem.funcgrapher.match_myth_check', 'Myth check:') + ' “' + myth.s + '” ' + (myth.t ? __alloT('stem.funcgrapher.match_true', 'TRUE') : __alloT('stem.funcgrapher.match_false', 'FALSE')) + ' — ' + myth.why : '') + ' ' + tail;
                }
                if (q.mode === 'myth') {
                  return (q.answer ? __alloT('stem.funcgrapher.match_true', 'TRUE') : __alloT('stem.funcgrapher.match_false', 'FALSE')) + ' — ' + q.why;
                }
                if (q.mode === 'root') {
                  if (correct) return 'f(' + chosen + ') = 0 — the curve crosses the x-axis exactly there.';
                  var fAt = evalQ(q, chosen);
                  return 'A root is where the curve meets the x-axis — where f(x) = 0. It may cross or just touch. At your pick x = ' + chosen + ', f(' + chosen + ') = ' + (isFinite(fAt) ? Math.round(fAt * 100) / 100 : '?') + ', not 0. Look where the curve meets the axis: x = ' + (q.answers ? q.answers.join(' or x = ') : q.answer) + '.';
                }
                if (q.mode === 'yint') {
                  if (correct) return 'f(0) = ' + q.answer + ' — the y-intercept is always just the function evaluated at x = 0.';
                  return 'The y-intercept is f(0): set x = 0 and every x-term vanishes. What remains is ' + q.answer + '. (You picked ' + chosen + ' — the curve may pass that height, but not at x = 0.)';
                }
                // name mode — chosen is a label string; map it back to its family
                var chosenId = null;
                for (var fk in FG_LABELS) { if (FG_LABELS[fk] === chosen) { chosenId = fk; break; } }
                if (correct) return fgFill(__alloT('stem.funcgrapher.match_correct', 'Signature spotted: {trait}.'), { trait: FG_TRAITS[q.type] });
                return 'You picked ' + chosen + ' — that family shows ' + (chosenId && FG_TRAITS[chosenId] ? FG_TRAITS[chosenId] : 'a different shape') + '. This graph instead shows ' + FG_TRAITS[q.type] + '.';
              }

              // Start a challenge based on the current mode

              // ── Four-way matching: graph ↔ equation ↔ table ↔ story ──
              // Its own items, drawn in the question card: the student's graph and the graded
              // {type, a, b, c} are untouched. `confuse` lists the distractors worth offering first.
              var MATCH_PAIRS = [['graph', 'equation'], ['equation', 'table'], ['table', 'story'], ['story', 'graph'], ['graph', 'table'], ['equation', 'story'], ['table', 'graph'], ['story', 'equation'], ['graph', 'story'], ['table', 'equation'], ['equation', 'graph'], ['story', 'table']];
              var MATCH_REP_NAMES = { graph: __alloT('stem.funcgrapher.match_rep_graph', 'graph'), equation: __alloT('stem.funcgrapher.match_rep_equation', 'equation'), table: __alloT('stem.funcgrapher.match_rep_table', 'table'), story: __alloT('stem.funcgrapher.match_rep_story', 'story') };
              // Corrective myths from the existing bank, by family.
              var MATCH_MYTHS = { linear: FG_MYTHS['3-5'][0], exponential: FG_MYTHS['9-12'][1], absolute: FG_MYTHS['6-8'][4], rational: FG_MYTHS['9-12'][0], sqrt: FG_MYTHS['9-12'][5] };
              function matchItem(id) { return MATCH_BANK.filter(function(it) { return it.id === id; })[0] || null; }
              function matchXs(item) { return item.tx || [0, 1, 2, 3, 4]; }
              function makeMatchQuiz() {
                var level = gradeBand === '9-12' ? 2 : gradeBand === '6-8' ? 1 : 0;
                var bank = MATCH_BANK.filter(function(it) { return it.band <= level; });
                var turn = typeof d.fgMatchTurn === 'number' && isFinite(d.fgMatchTurn) ? d.fgMatchTurn : 0;
                // Items a teacher assigned come first; distractors stay at the student's level.
                var assigned = (Array.isArray(d.matchAssigned) ? d.matchAssigned : []).map(matchItem).filter(Boolean);
                var pool = assigned.length ? assigned : bank;
                var target = pool[Math.floor(Math.random() * pool.length)], pair = MATCH_PAIRS[turn % MATCH_PAIRS.length];
                var others = MATCH_BANK.filter(function(it) { return it.id !== target.id && it.band <= Math.max(level, target.band); });
                var picks = fgShuffle(others.filter(function(it) { return target.confuse.indexOf(it.id) >= 0; })).concat(fgShuffle(others.filter(function(it) { return target.confuse.indexOf(it.id) < 0; }))).slice(0, 2);
                return { mode: 'match', item: target.id, from: pair[0], to: pair[1], answer: target.id, opts: fgShuffle([target.id].concat(picks.map(function(p) { return p.id; }))), answered: false };
              }
              function matchStepNote(item) {
                if (!GA) return '';
                return GA.differencesSummary(GA.differencesTable(matchXs(item).map(function(x) { return { x: x, y: item.f(x) }; })), __alloT);
              }
              function matchMiniGraph(item, id) {
                var GW = 200, GH = 150, GP = 24, xw = [-1, 5], yw = item.yw;
                function gx(x) { return GP + (x - xw[0]) / (xw[1] - xw[0]) * (GW - GP - 6); }
                function gy(y) { return GH - GP - (y - yw[0]) / (yw[1] - yw[0]) * (GH - GP - 6); }
                var s = GA ? GA.sample(item.f, xw[0], xw[1], 121) : [], path = '';
                if (GA) GA.analyse(s, { evaluate: item.f, ymin: yw[0], ymax: yw[1] }).runs.forEach(function(run) {
                  if (run.length < 2) return;
                  run.forEach(function(p, i) { path += (i ? ' L' : ' M') + gx(p.x).toFixed(1) + ',' + gy(Math.max(yw[0] - 50, Math.min(yw[1] + 50, p.y))).toFixed(1); });
                });
                var desc = GA ? GA.describeGraph(s, { t: __alloT, evaluate: item.f, ymin: yw[0], ymax: yw[1] }).short : '';
                var yTicks = [yw[0] < 0 ? 0 : yw[0], yw[1]].concat(yw[1] > 8 ? [Math.round(yw[1] / 2)] : []);
                // The question card is light in every theme, so the thumbnail keeps the light palette.
                var ink = '#0f172a', gridInk = '#c3cedb', axisInk = '#334155';
                return h('svg', { id: id, viewBox: '0 0 ' + GW + ' ' + GH, role: 'img', 'aria-label': fgFill(__alloT('stem.funcgrapher.match_graph_label', 'Graph for x from −1 to 5. {desc}'), { desc: desc }), style: { width: '100%', maxWidth: 260, display: 'block', background: '#ffffff', borderRadius: 6 } },
                  h('defs', null, h('clipPath', { id: id + '-clip' }, h('rect', { x: GP, y: 6, width: GW - GP - 6, height: GH - GP - 6 }))),
                  [0, 1, 2, 3, 4, 5].map(function(v) { return h('line', { key: 'x' + v, x1: gx(v), x2: gx(v), y1: 6, y2: GH - GP, stroke: v === 0 ? axisInk : gridInk, strokeWidth: v === 0 ? 2 : 1 }); }),
                  h('line', { x1: GP, x2: GW - 6, y1: gy(0), y2: gy(0), stroke: axisInk, strokeWidth: 2 }),
                  [1, 3, 5].map(function(v) { return h('text', { key: 'tx' + v, x: gx(v), y: GH - 8, textAnchor: 'middle', fill: ink, style: { fontSize: '12px' } }, v); }),
                  yTicks.map(function(v) { return h('text', { key: 'ty' + v, x: GP - 3, y: gy(v) + 4, textAnchor: 'end', fill: ink, style: { fontSize: '12px' } }, v); }),
                  h('path', { d: path, fill: 'none', stroke: '#1d4ed8', strokeWidth: 3, strokeLinecap: 'round', clipPath: 'url(#' + id + '-clip)' }));
              }
              function matchRep(item, kind, id) {
                if (kind === 'graph') return matchMiniGraph(item, id);
                if (kind === 'equation') return h('p', { id: id, className: 'font-mono text-base font-bold', style: { margin: 0 } }, item.eq);
                if (kind === 'story') return h('p', { id: id, className: 'text-sm', style: { margin: 0 } }, item.story);
                return h('table', { id: id, className: 'text-sm font-mono', style: { borderCollapse: 'collapse' } },
                  h('caption', { className: 'sr-only' }, __alloT('stem.funcgrapher.match_table_caption', 'Table of x and y values')),
                  h('thead', null, h('tr', null, h('th', { scope: 'col', style: { padding: '2px 10px', borderBottom: '1px solid #64748b' } }, 'x'), h('th', { scope: 'col', style: { padding: '2px 10px', borderBottom: '1px solid #64748b' } }, 'y'))),
                  h('tbody', null, matchXs(item).map(function(x) { var y = item.f(x); return h('tr', { key: x }, h('td', { style: { padding: '2px 10px', textAlign: 'right' } }, x), h('td', { style: { padding: '2px 10px', textAlign: 'right' } }, String(Number(y.toFixed(2))))); })));
              }


              function startChallenge() {

                var q;

                if (challengeMode === 'root') { q = makeRootQuiz(); }

                else if (challengeMode === 'yint') { q = makeYIntQuiz(); }

                else if (challengeMode === 'myth') { q = makeMythQuiz(); upd('fgLastMythIdx', q.mythIdx); }

                else if (challengeMode === 'match') { q = makeMatchQuiz(); upd('fgMatchTurn', (typeof d.fgMatchTurn === 'number' && isFinite(d.fgMatchTurn) ? d.fgMatchTurn : 0) + 1); }

                else { q = makeFgQuiz(); }

                upd('fgQuiz', q);

                if (q.a !== undefined) upd('a', q.a);

                if (q.b !== undefined) upd('b', q.b);

                if (q.c !== undefined) upd('c', q.c);

                if (q.type) upd('type', q.type);

                // Name That Graph keeps the student's coefficients. a = 0 (or b = 0 for the wave
                // and exponential families) draws a flat line that matches no family name.
                if (q.mode === 'name') {
                  if (!d.a) upd('a', 1);
                  if ((q.type === 'trig' || q.type === 'exponential') && !d.b) upd('b', 1);
                }

              }



              // Challenge mode buttons

              var CHALLENGE_MODES = [

                { id: 'name', label: __alloT('stem.funcgrapher.name_that_graph', '🎯 Name That Graph'), color: 'violet' },

                { id: 'root', label: __alloT('stem.funcgrapher.find_the_root', '📍 Find the Root'), color: 'red' },

                { id: 'yint', label: __alloT('stem.funcgrapher.y_intercept_3', '🟢 Y-Intercept?'), color: 'emerald' },

                { id: 'myth', label: __alloT('stem.funcgrapher.true_or_false', '🧠 True or False?'), color: 'amber' },

                { id: 'match', label: __alloT('stem.funcgrapher.match_mode', '🔗 Match 4 Ways'), color: 'indigo' }

              ];



              // Prompt text per mode

              var promptText = challengeMode === 'root' ? 'What is one root (x-intercept) of this function?'

                : challengeMode === 'yint' ? 'What is the y-intercept of this function?'

                  : challengeMode === 'myth' ? ((fgQuiz && fgQuiz.mode === 'myth') ? '“' + fgQuiz.s + '”' : 'True or false?')

                  : challengeMode === 'match' ? ((fgQuiz && fgQuiz.mode === 'match') ? fgFill(__alloT('stem.funcgrapher.match_prompt', 'Which {to} matches this {from}?'), { to: MATCH_REP_NAMES[fgQuiz.to] || fgQuiz.to, from: MATCH_REP_NAMES[fgQuiz.from] || fgQuiz.from }) : __alloT('stem.funcgrapher.match_intro', 'Match a graph, an equation, a table and a story that show the same function.'))

                    : 'What type of function is graphed above?';



              // One answer path for every mode; the match cards call it too.
              function answerQuiz(opt) {
                // Root questions can have TWO correct answers (either root of a quadratic)
                var correct = fgQuiz.answers ? fgQuiz.answers.indexOf(opt) >= 0 : opt === fgQuiz.answer;

                var fb = buildFeedback(fgQuiz, opt, correct);

                // Once the hint ladder showed the answer, a right answer is not scored and earns no XP.
                var answerShown = typeof fgQuiz.hint === 'number' && fgQuiz.hint >= 4;
                if (answerShown) fb += ' ' + __alloT('stem.funcgrapher.hint_answer_shown', 'The answer was shown in the hints, so this one earns no XP.');

                upd('fgQuiz', Object.assign({}, fgQuiz, { answered: true, chosen: opt, correct: correct, fb: fb, noXp: answerShown }));

                upd('fgScore', fgScore + (correct && !answerShown ? 1 : 0));

                upd('fgStreak', correct ? (answerShown ? fgStreak : fgStreak + 1) : 0);

                if (fgQuiz.mode === 'myth') upd('fgMythsDone', (d.fgMythsDone || 0) + 1);

                if (typeof announceToSR === 'function') announceToSR((correct ? 'Correct. ' : 'Not quite. ') + fb);

                if (correct && answerShown) {

                  addToast('\u2705 ' + __alloT('stem.funcgrapher.correct_no_xp', 'Correct (no XP: the answer was shown)'), 'success');

                  if (fgQuiz.mode !== 'myth' && fgQuiz.mode !== 'match') setTimeout(function () { startChallenge(); }, 2200);

                } else if (correct) {

                  addToast('\u2705 Correct! +5 XP', 'success');

                  if (typeof awardStemXP === 'function') awardStemXP('funcGrapher', 5, 'Function Grapher challenge');

                  // Streak bonus at 5
                  if (fgStreak + 1 >= 5 && (fgStreak + 1) % 5 === 0) {
                    addToast('\uD83D\uDD25 ' + (fgStreak + 1) + '-streak! +10 bonus XP', 'success');
                    if (typeof awardStemXP === 'function') awardStemXP('funcGrapher', 10, 'Function Grapher streak bonus');
                  }

                  // Auto-advance \u2014 except in myth and match modes, where the "why" deserves a read
                  if (fgQuiz.mode !== 'myth' && fgQuiz.mode !== 'match') setTimeout(function () { startChallenge(); }, 2200);

                } else {

                  addToast('\u274C Not quite \u2014 see why below', 'error');

                }

              }

              return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3 mb-2" },

                // Mode selector row

                React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mb-2" },

                  CHALLENGE_MODES.map(function (cm) {

                    var isActive = challengeMode === cm.id;

                    return React.createElement("button", { key: cm.id, "aria-pressed": isActive, onClick: function () { upd('fgChallengeMode', cm.id); upd('fgQuiz', null); },

                      className: "px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (isActive ? (({ indigo: 'bg-indigo-700', violet: 'bg-violet-700', red: 'bg-red-700', emerald: 'bg-emerald-700', amber: 'bg-amber-700' }[cm.color]) || 'bg-indigo-700') + ' text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')

                    }, cm.label);

                  }),

                  fgScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-700 ml-auto" }, '⭐ ' + fgScore + ' | 🔥 ' + fgStreak)

                ),

                // Grade-band selector — challenges scale their content to the band
                React.createElement("div", { className: "flex items-center gap-1.5 mb-2", role: "group", "aria-label": __alloT('stem.funcgrapher.challenge_level', "Challenge level") },
                  React.createElement("span", { className: "text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider" }, __alloT('stem.funcgrapher.level', "Level:")),
                  GRADE_BANDS.map(function (gb) {
                    var active = gradeBand === gb;
                    return React.createElement("button", {
                      key: gb,
                      onClick: function () { upd('fgGradeOverride', gb); upd('fgQuiz', null); },
                      "aria-pressed": active,
                      className: "px-2 py-0.5 rounded-full text-[0.625rem] font-bold transition-all " + (active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50')
                    }, gb);
                  })
                ),

                // Start / New Challenge button

                React.createElement("button", { "aria-label": __alloT('stem.funcgrapher.start_challenge', "Start Challenge"),

                  onClick: startChallenge,

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold mb-2 " + (fgQuiz ? 'bg-slate-100 text-slate-600' : 'bg-violet-600 text-white') + " hover:opacity-90 transition-all"

                }, fgQuiz ? '🔄 New Challenge' : '🚀 Start Challenge'),



                // Quiz card

                // Four-way match card: one given representation, three options in another.
                fgQuiz && !fgQuiz.answered && fgQuiz.mode === 'match' && (function () {
                  var item = matchItem(fgQuiz.item), letters = ['A', 'B', 'C', 'D'];
                  if (!item) return null;
                  return React.createElement("div", { "data-funcgrapher-match": fgQuiz.from + '-' + fgQuiz.to, className: "bg-violet-50 rounded-xl p-3 border border-violet-200 text-slate-800" },
                    React.createElement("p", { className: "text-sm font-bold text-violet-800 mb-2" }, promptText),
                    React.createElement("div", { "data-match-given": fgQuiz.from, className: "mb-3 rounded-lg border border-violet-300 bg-white p-2" },
                      React.createElement("p", { className: "text-xs font-bold text-violet-800 mb-1" }, fgFill(__alloT('stem.funcgrapher.match_given', 'This {from}:'), { from: MATCH_REP_NAMES[fgQuiz.from] })),
                      matchRep(item, fgQuiz.from, 'fg-match-given')),
                    React.createElement("div", { className: "grid gap-2", style: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' } },
                      fgQuiz.opts.map(function (opt, oi) {
                        var oItem = matchItem(opt), repId = 'fg-match-opt-' + oi;
                        if (!oItem) return null;
                        return React.createElement("div", { key: String(opt), "data-match-option": oi, className: "rounded-lg border-2 border-slate-300 bg-white p-2 flex flex-col gap-2" },
                          React.createElement("p", { className: "text-xs font-bold text-slate-700", style: { margin: 0 } }, fgFill(__alloT('stem.funcgrapher.match_option', 'Option {n}'), { n: letters[oi] })),
                          matchRep(oItem, fgQuiz.to, repId),
                          React.createElement("button", { type: "button", "aria-describedby": repId, onClick: function () { answerQuiz(opt); }, style: { minHeight: 44 }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-violet-700 text-white border-violet-700 hover:bg-violet-800" }, fgFill(__alloT('stem.funcgrapher.match_choose', 'Choose option {n}'), { n: letters[oi] })));
                      })));
                })(),

                fgQuiz && !fgQuiz.answered && fgQuiz.mode !== 'match' && React.createElement("div", { className: "bg-violet-50 rounded-xl p-3 border border-violet-200" },

                  React.createElement("p", { className: "text-sm font-bold text-violet-800 mb-2" }, promptText),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    fgQuiz.opts.map(function (opt) {

                      var optLabel = fgQuiz.mode === 'myth' ? (opt ? '\u2705 True' : '\u274C False')
                        : challengeMode === 'name' ? opt
                          : (challengeMode === 'yint' ? 'y = ' + opt : 'x = ' + opt);

                      return React.createElement("button", { "aria-label": "Select answer: " + (fgQuiz.mode === 'myth' ? (opt ? 'True' : 'False') : String(opt)),

                        key: String(opt), onClick: function () { answerQuiz(opt); }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all"

                      }, optLabel);

                    })

                  ),

                  // Nudge, strategy, worked step, answer for the root and y-intercept questions.
                  GA && (fgQuiz.mode === 'root' || fgQuiz.mode === 'yint') && GA.hintLadder(React, { id: 'fg-quiz-hints', t: __alloT, level: fgQuiz.hint, onLevel: function(n) { upd('fgQuiz', Object.assign({}, fgQuiz, { hint: n })); }, announce: announceToSR, noXpNote: true, styles: fgCoreStyles, steps: fgQuizHints(fgQuiz) })

                ),

                // Result card \u2014 headline + corrective explanation (the pedagogy payload)

                fgQuiz && fgQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl " + (fgQuiz.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'), role: "status" },

                  React.createElement("p", { className: "text-sm font-bold mb-1 " + (fgQuiz.correct ? 'text-emerald-700' : 'text-red-700') },
                    fgQuiz.correct ? (fgQuiz.noXp ? '\u2705 ' + __alloT('stem.funcgrapher.correct_no_xp', 'Correct (no XP: the answer was shown)') : '\u2705 Correct! +5 XP') : '\u274C Not quite'
                  ),

                  fgQuiz.fb && React.createElement("p", { className: "text-xs leading-relaxed " + (fgQuiz.correct ? 'text-emerald-800' : 'text-red-800') }, fgQuiz.fb)

                )

              );

            })(),

            fgStage === 'explore' && React.createElement("button", { "aria-label": __alloT('stem.funcgrapher.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'fg-' + Date.now(), tool: 'funcGrapher', label: d.type + ': a=' + d.a + ' b=' + d.b, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, __alloT('stem.funcgrapher.snapshot_2', "\uD83D\uDCF8 Snapshot")),

            // ── AI Function Tutor (reading-level aware) ──
            fgStage === 'explore' && (function () {
              if (fgQuizLeaks) return null; // the explanation names the family and its features
              if (typeof callGemini !== 'function') return null; // hidden when ctx hands no usable AI
              var aiLevel = d.aiLevel || 'grade5';
              // Own state key: sharing d.aiExplain with the "Explain This Graph" button
              // above made each panel display the other's output.
              var aiText = typeof d.aiTutorText === 'string' ? d.aiTutorText : '';
              var aiLoading = !!d.aiLoading;
              var aiError = typeof d.aiError === 'string' ? d.aiError : '';
              var LEVELS = [
                { id: 'plain', label: __alloT('stem.funcgrapher.plain', 'Plain'), hint: __alloT('stem.funcgrapher.using_simple_everyday_words_and_short_', 'using simple everyday words and short sentences, no jargon') },
                { id: 'grade5', label: __alloT('stem.funcgrapher.grade_5', 'Grade 5'), hint: __alloT('stem.funcgrapher.for_a_5th_grade_student', 'for a 5th grade student') },
                { id: 'hs', label: __alloT('stem.funcgrapher.high_school', 'High School'), hint: __alloT('stem.funcgrapher.for_a_high_school_algebra_or_pre_calc_', 'for a high school algebra or pre-calc student, including vocabulary like slope, intercept, vertex, period, amplitude') }
              ];
              function explain() {
                if (typeof callGemini !== 'function') { upd('aiError', 'AI tutor not available.'); return; }
                upd('aiLoading', true); upd('aiError', ''); upd('aiTutorText', '');
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                // eqStr is the graphed equation for every family (sqrt, log and rational
                // used to fall through to the absolute-value formula here).
                var prompt = 'Explain this function ' + lv.hint + '. '
                  + 'Function: ' + eqStr + '. Type: ' + d.type + '. '
                  + 'In 3 short sentences: (1) What the graph looks like. (2) Which coefficient changes the graph in what way. (3) One real-world situation this function models. '
                  + 'No markdown, no bullets, no headings. Plain prose.';
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  upd('aiTutorText', String(resp || '').trim()); upd('aiLoading', false);
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.funcgrapher.sr_explanation_ready', 'Explanation ready.'));
                }).catch(function () {
                  upd('aiLoading', false); upd('aiError', 'Could not reach AI tutor. Try again in a moment.');
                });
              }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, __alloT('stem.funcgrapher.explain_at_my_level', "\u2728 Explain at my level")),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": __alloT('stem.funcgrapher.reading_level', "Reading level") },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { upd('aiLevel', L.id); },
                        "aria-label": "Reading level: " + L.label + (active ? " (selected)" : ""),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[0.625rem] font-bold " + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-600 hover:bg-purple-100')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": "Generate AI explanation at " + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + " level",
                    className: "px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
                ),
                aiError && React.createElement("p", { className: "text-[0.6875rem] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[0.6875rem] italic text-slate-600" }, __alloT('stem.funcgrapher.click_explain_for_the_ai_tutor_to_desc', "Click \u201CExplain\u201D for the AI tutor to describe this function at your chosen reading level."))
              );
            })(),

            // \u2550\u2550\u2550 FUNCTION ZOO \u2550\u2550\u2550
            fgStage === 'explore' && React.createElement('div', { className: 'mt-5 rounded-2xl border border-indigo-300 bg-white p-3 shadow-sm' },
              React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                React.createElement('span', { className: 'text-lg' }, '\uD83D\uDCCA'),
                React.createElement('h3', { className: 'text-sm font-bold text-indigo-700' }, __alloT('stem.funcgrapher.function_zoo_six_common_function_shape', 'Function Zoo \u2014 Six common function shapes'))
              ),
              React.createElement('div', { 'data-allo-fs-stage': 'true', ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
                className: 'rounded-xl overflow-hidden border border-indigo-200', style: { position: 'relative', background: fgZooPal.bg, aspectRatio: '16/6' } },
                React.createElement('button', {
                  type: 'button',
                  'data-allo-fs-btn': 'true',
                  'aria-pressed': 'false',
                  'aria-label': __alloT('stem.funcgrapher.enter_fullscreen', 'View the Function Zoo fullscreen'),
                  'data-fs-out': __alloT('stem.funcgrapher.enter_fullscreen', 'View the Function Zoo fullscreen'),
                  'data-fs-in': __alloT('stem.funcgrapher.exit_fullscreen', 'Exit fullscreen Function Zoo (Escape)'),
                  style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(165,180,252,0.6)', color: '#e0e7ff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
                }, React.createElement('span', { 'aria-hidden': 'true' }, '⛶')),
                React.createElement('p', { id: 'funcgrapher-zoo-description', className: typeof srOnly === 'string' ? srOnly : 'sr-only', style: srOnly && typeof srOnly === 'object' ? srOnly : undefined }, 'Six coordinate plots compare common function shapes: linear is a straight rising line, quadratic is a U-shaped curve, cubic is an S-shaped curve, exponential rises increasingly quickly, logarithmic rises increasingly slowly, and sine repeats in a wave.'),
                React.createElement('canvas', {
                  role: 'img',
                  'aria-label': __alloT('stem.funcgrapher.a11y_function_zoo_comparison_of_six_common_function', 'Function Zoo comparison of six common function shapes'),
                  'aria-describedby': 'funcgrapher-zoo-description',
                  'data-a11y-static': 'true',
                  ref: function(cvEl) {
                    if (!cvEl) return;
                    // Literal canvas colours per app theme (canvas cannot read CSS var()); a theme change redraws.
                    cvEl._fzPal = fgZooPal;
                    if (cvEl._fzAnim) { if (cvEl._fzTheme !== fgZooPal.theme && typeof cvEl._fzDraw === 'function') { cvEl._fzTheme = fgZooPal.theme; cvEl._fzDraw(); } return; }
                    cvEl._fzTheme = fgZooPal.theme;
                    var c2 = cvEl.getContext('2d');
                    var W = cvEl.offsetWidth || 600;
                    var H = cvEl.offsetHeight || 220;
                    cvEl.width = W * 2; cvEl.height = H * 2;
                    c2.scale(2, 2);
                    var start = performance.now();
                    function drawFz() {
                      if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._fzAnim); return; }
                      var t = (performance.now() - start) / 1000;
                      var ZP = cvEl._fzPal || fgZooPal;
                      c2.fillStyle = ZP.bg;
                      c2.fillRect(0, 0, W, H);
                      var funcs = [
                        { name: __alloT('stem.funcgrapher.linear', 'Linear'), f: function(x) { return x; }, color: '#7dd3fc' },
                        { name: __alloT('stem.funcgrapher.quadratic', 'Quadratic'), f: function(x) { return x * x / 4; }, color: '#fbbf24' },
                        { name: __alloT('stem.funcgrapher.cubic', 'Cubic'), f: function(x) { return x * x * x / 16; }, color: '#10b981' },
                        { name: __alloT('stem.funcgrapher.exponential', 'Exponential'), f: function(x) { return Math.exp(x / 3) - 1; }, color: '#dc2626' },
                        { name: __alloT('stem.funcgrapher.zoo_log', 'Log'), f: function(x) { return x > 0 ? Math.log(x + 1) * 2 : -Math.log(-x + 1) * 2; }, color: '#a78bfa' },
                        { name: __alloT('stem.funcgrapher.sine', 'Sine'), f: function(x) { return Math.sin(x); }, color: '#f472b6' }
                      ];
                      var cols = 3, rows = 2;
                      var cellW = W / cols, cellH = H / rows;
                      funcs.forEach(function(fn, fi) {
                        var col = fi % cols;
                        var row = Math.floor(fi / cols);
                        var ox = col * cellW + cellW / 2;
                        var oy = row * cellH + cellH / 2;
                        // Axes
                        c2.strokeStyle = ZP.axis; c2.lineWidth = 1;
                        c2.beginPath();
                        c2.moveTo(ox - cellW * 0.4, oy); c2.lineTo(ox + cellW * 0.4, oy);
                        c2.moveTo(ox, oy - cellH * 0.4); c2.lineTo(ox, oy + cellH * 0.4);
                        c2.stroke();
                        // Curve — neon glow per function color + a light bead tracing it
                        c2.save();
                        var ink = ZP.curves[fi] || fn.color;
                        c2.shadowColor = ink; c2.shadowBlur = ZP.glow ? 7 : 0;
                        c2.strokeStyle = ink; c2.lineWidth = ZP.glow ? 2 : 2.5;
                        c2.beginPath();
                        for (var x = -cellW * 0.4; x <= cellW * 0.4; x++) {
                          var xv = x / 12;
                          var yv = fn.f(xv);
                          var py = oy - yv * 8;
                          if (x === -Math.floor(cellW * 0.4)) c2.moveTo(ox + x, py);
                          else c2.lineTo(ox + x, py);
                        }
                        c2.stroke();
                        // Light bead sweeping along the curve (stays within the cell)
                        var beadX = -cellW * 0.4 + ((t * 0.22 + fi * 0.13) % 1) * cellW * 0.8;
                        var beadY = oy - fn.f(beadX / 12) * 8;
                        if (beadY > oy - cellH * 0.46 && beadY < oy + cellH * 0.46) {
                          c2.shadowBlur = ZP.glow ? 10 : 0; c2.fillStyle = ZP.bead;
                          c2.beginPath(); c2.arc(ox + beadX, beadY, 2.3, 0, Math.PI * 2); c2.fill();
                        }
                        c2.restore();
                        // Label
                        c2.font = 'bold 12px sans-serif'; c2.fillStyle = ink; c2.textAlign = 'center';
                        c2.fillText(fn.name, ox, oy + cellH * 0.45);
                      });
                    }
                    cvEl._fzAnim = 1;
                    cvEl._fzDraw = drawFz;
                    drawFz();
                    var ro = new ResizeObserver(function() {
                      if (!cvEl.isConnected) { ro.disconnect(); return; }
                      W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                      cvEl.width = W * 2; cvEl.height = H * 2; c2.scale(2, 2); drawFz();
                    });
                    ro.observe(cvEl);
                  },
                  style: { width: '100%', height: '100%', display: 'block' }
                })
              )
            ),
            // Wave investigation: linked representations and visible comparison evidence.
            fgStage === 'investigate' && (function() {
              var iq = d._waveHunt || {};
              function setIQ(patch) { upd('_waveHunt', Object.assign({}, iq, patch)); }
              function bounded(value, fallback, min, max) { return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback; }
              var current = { a: bounded(iq.amp, 1, -3, 3), f: bounded(iq.freq, 1, 0, 3), p: bounded(iq.phase, 0, -3.2, 3.2) };
              function keyFor(record) { return [record.a, record.f, record.p].map(function(v) { return Number(v.toPrecision(12)); }).join('|'); }
              function display(value) { return String(Number(value.toFixed(2))); }
              function equation(record) { return 'y = ' + display(record.a) + ' sin(' + display(record.f) + 'x ' + (record.p < 0 ? '− ' : '+ ') + display(Math.abs(record.p)) + ')'; }
              function valueAt(record, x) { return record.a * Math.sin(record.f * x + record.p); }
              function constant(record) { return record.a === 0 || record.f === 0; }
              var records = [], seen = {};
              (Array.isArray(iq.log) ? iq.log : []).forEach(function(entry) {
                if (!entry || (typeof entry.p !== 'number' && typeof entry.p !== 'string') || String(entry.p).trim() === '') return;
                var record = { a: entry.a, f: entry.f, p: Number(entry.p) };
                if (![record.a, record.f, record.p].every(Number.isFinite) || Math.abs(record.a) > 3 || record.f < 0 || record.f > 3 || Math.abs(record.p) > 3.2) return;
                var key = keyFor(record);
                if (!seen[key]) { seen[key] = true; records.push(record); }
              });
              records = records.slice(-8);
              var currentKey = keyFor(current), savedIndex = records.findIndex(function(record) { return keyFor(record) === currentKey; });
              var reference = records.find(function(record) { return keyFor(record) === iq.referenceKey; }) || records[0] || null;
              var referenceKey = reference ? keyFor(reference) : '';
              var referenceIndex = reference ? records.indexOf(reference) : -1;
              var changed = reference ? ['a', 'f', 'p'].filter(function(key) { return Math.abs(current[key] - reference[key]) > 1e-10; }) : [];
              var symbols = { a: 'a', f: 'b', p: 'φ' };
              var isConstant = constant(current), period = isConstant ? null : 2 * Math.PI / current.f, shift = isConstant ? null : -current.p / current.f;
              var focusOptions = [
                { id: 'height', control: 'amp', label: __alloT('stem.funcgrapher.wave_focus_height', 'Height'), question: __alloT('stem.funcgrapher.wave_height_question', 'How does a change the height and orientation? Keep b and φ fixed.') },
                { id: 'spacing', control: 'freq', label: __alloT('stem.funcgrapher.wave_focus_spacing', 'Spacing'), question: __alloT('stem.funcgrapher.wave_spacing_question', 'How does b change the distance between repeats? Keep a and φ fixed.') },
                { id: 'shift', control: 'phase', label: __alloT('stem.funcgrapher.wave_focus_shift', 'Shift'), question: __alloT('stem.funcgrapher.wave_shift_question', 'Which direction does the wave move as φ increases? Keep a and b fixed.') }
              ];
              var focus = focusOptions.find(function(option) { return option.id === iq.focus; }) || focusOptions[0];
              var panel = 'var(--allo-stem-panel,#fff)', ink = 'var(--allo-stem-text,#0f172a)', softInk = 'var(--allo-stem-text-soft,#475569)';
              var curveInk = ctx.isContrast ? '#ffff00' : isDark ? '#a5b4fc' : '#4338ca';
              var fieldStyle = { width: '100%', minWidth: 0, background: panel, color: ink, border: '1px solid ' + softInk, borderRadius: 6, padding: 8, fontSize: 13 };
              var buttonStyle = { minHeight: 44, padding: '6px 12px', borderRadius: 7, border: '1px solid ' + softInk, background: panel, color: ink, fontSize: 13, cursor: 'pointer' };
              var xLeft = -2 * Math.PI, xRight = 2 * Math.PI;
              function sx(x) { return 32 + (x - xLeft) / (xRight - xLeft) * 392; }
              function sy(y) { return 212 - (y + 3.5) / 7 * 192; }
              function pathFor(record) {
                var path = '';
                for (var i = 0; i <= 320; i++) {
                  var x = xLeft + (xRight - xLeft) * i / 320;
                  path += (i ? ' L' : 'M') + sx(x).toFixed(2) + ',' + sy(valueAt(record, x)).toFixed(2);
                }
                return path;
              }
              function saveSetting() {
                if (savedIndex >= 0) return;
                var nextRecords = records.concat([current]).slice(-8);
                var nextReference = nextRecords.some(function(record) { return keyFor(record) === referenceKey; }) ? referenceKey : keyFor(nextRecords[0]);
                setIQ({ log: nextRecords, referenceKey: nextReference, showLog: true });
              }
              var savedLabel = __alloT('stem.funcgrapher.wave_saved_setting', 'Saved setting');
              var comparison = !reference ? __alloT('stem.funcgrapher.wave_start_comparison', 'Save a starting setting, then move one slider to compare the curves.') : changed.length === 0 ? __alloT('stem.funcgrapher.wave_same_settings', 'The current parameters match the saved reference.') : changed.length === 1 ? __alloT('stem.funcgrapher.wave_one_change', 'One parameter changed: ') + symbols[changed[0]] + '. ' + __alloT('stem.funcgrapher.wave_held_fixed', 'Held fixed: ') + ['a', 'f', 'p'].filter(function(key) { return key !== changed[0]; }).map(function(key) { return symbols[key]; }).join(', ') + '.' : __alloT('stem.funcgrapher.wave_multiple_changes', 'Several parameters changed. Restore the reference and change one slider to isolate its effect.');
              return h('section', { 'data-wave-investigation': true, 'aria-labelledby': 'wave-investigation-title', className: 'mt-3 p-3 rounded-xl space-y-3', style: { background: panel, color: ink, border: '1px solid ' + softInk } },
                h('h3', { id: 'wave-investigation-title', className: 'text-base font-bold' }, __alloT('stem.funcgrapher.wave_investigation_title', 'Wave investigation')),
                h('p', { className: 'text-sm' }, __alloT('stem.funcgrapher.wave_investigation_intro', 'Explore y = a sin(bx + φ). Save a setting and change one parameter; the dashed curve keeps your reference visible.')),
                h('div', { role: 'group', 'aria-label': __alloT('stem.funcgrapher.wave_focus_label', 'Choose a wave investigation'), className: 'flex flex-wrap gap-2' },
                  focusOptions.map(function(option) { return h('button', { key: option.id, type: 'button', 'aria-pressed': option.id === focus.id, onClick: function() { setIQ({ focus: option.id }); }, style: Object.assign({}, buttonStyle, { fontWeight: option.id === focus.id ? 800 : 400, borderWidth: option.id === focus.id ? 2 : 1 }) }, option.label); })),
                h('p', { 'data-wave-question': focus.id, className: 'text-sm font-bold' }, focus.question),
                h('div', { 'data-wave-model-controls': true, style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start' } },
                h('figure', { style: { margin: 0, flex: '2 1 440px', minWidth: 0 } },
                  h('div', { 'data-wave-equation': true, className: 'text-sm font-mono font-bold mb-2' }, equation(current)),
                  h('svg', { viewBox: '0 0 440 240', role: 'img', 'aria-label': __alloT('stem.funcgrapher.wave_plot_description', 'Wave plot linked to a, b, and φ. Solid curve: ') + equation(current) + (reference && iq.showReference !== false ? '. ' + savedLabel + ' ' + (referenceIndex + 1) + ': ' + equation(reference) : ''), style: { width: '100%', display: 'block' } },
                    h('rect', { x: 32, y: 20, width: 392, height: 192, fill: 'none', stroke: softInk, opacity: 0.45 }),
                    [-3, 0, 3].map(function(y) { return h('g', { key: y }, h('line', { x1: 32, x2: 424, y1: sy(y), y2: sy(y), stroke: softInk, opacity: y === 0 ? 0.85 : 0.25 }), h('text', { x: 26, y: sy(y) + 5, textAnchor: 'end', fontSize: Math.max(16, Math.round(12 * fgTextScale)), fill: ink }, y)); }),
                    [-Math.PI * 2, -Math.PI, 0, Math.PI, Math.PI * 2].map(function(x) { return h('line', { key: x, x1: sx(x), x2: sx(x), y1: 20, y2: 212, stroke: softInk, opacity: x === 0 ? 0.85 : 0.2 }); }),
                    reference && iq.showReference !== false && h('path', { 'data-wave-reference': referenceKey, d: pathFor(reference), fill: 'none', stroke: softInk, strokeWidth: 3, strokeDasharray: '8 6' }),
                    h('path', { 'data-wave-current': true, d: pathFor(current), fill: 'none', stroke: curveInk, strokeWidth: 3 }),
                    h('circle', { cx: sx(0), cy: sy(valueAt(current, 0)), r: 4, fill: curveInk, stroke: panel, strokeWidth: 1.5 })),
                  h('div', { 'aria-hidden': true, className: 'flex justify-between text-xs', style: { margin: '-8px 3.6% 6px 7.3%' } }, ['−2π', '−π', '0', 'π', '2π'].map(function(label) { return h('span', { key: label }, label); })),
                  h('figcaption', { className: 'text-xs', style: { color: softInk } }, __alloT('stem.funcgrapher.wave_plot_window', 'Fixed window: x from −2π to 2π radians, y from −3.5 to 3.5.')),
                  h('p', { 'data-wave-zero-value': valueAt(current, 0), className: 'text-sm mt-1' }, __alloT('stem.funcgrapher.wave_at_zero', 'At x = 0, y ≈ ') + valueAt(current, 0).toFixed(3))),
                h('div', { className: 'grid grid-cols-1 gap-3', style: { flex: '1 1 240px', minWidth: 0 } },
                  [{ k: 'amp', symbol: 'a', label: __alloT('stem.funcgrapher.wave_vertical_multiplier', 'Vertical multiplier a'), value: current.a, min: -3, max: 3 },
                   { k: 'freq', symbol: 'b', label: __alloT('stem.funcgrapher.wave_inside_multiplier', 'Inside multiplier b'), value: current.f, min: 0, max: 3 },
                   { k: 'phase', symbol: 'φ', label: __alloT('stem.funcgrapher.wave_phase_radians', 'Phase φ (radians)'), value: current.p, min: -3.2, max: 3.2 }].map(function(control) {
                    return h('div', { key: control.k, style: { padding: 8, borderRadius: 7, border: (focus.control === control.k ? '2px solid ' : '1px solid ') + softInk } },
                      h('label', { htmlFor: 'wa-' + control.k, className: 'block text-sm font-bold' }, control.label + ': ' + display(control.value)),
                      h('input', { id: 'wa-' + control.k, type: 'range', min: control.min, max: control.max, step: 0.1, value: control.value, 'aria-label': control.label, onChange: function(e) { var patch = {}; patch[control.k] = Number(e.target.value); setIQ(patch); }, style: { width: '100%', minHeight: 28, accentColor: curveInk } })); }))),
                h('div', { 'data-wave-measures': true, className: 'grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm' },
                  h('p', null, __alloT('stem.funcgrapher.wave_amplitude_measure', 'Amplitude: '), h('strong', { 'data-wave-amplitude': isConstant ? 0 : Math.abs(current.a) }, display(isConstant ? 0 : Math.abs(current.a)))),
                  h('p', null, __alloT('stem.funcgrapher.wave_period_measure', 'Period: '), h('strong', { 'data-wave-measure': 'period', 'data-wave-period': period }, period === null ? __alloT('stem.funcgrapher.wave_no_fundamental_period', 'No fundamental period') : '≈ ' + period.toFixed(2))),
                  h('p', null, __alloT('stem.funcgrapher.wave_shift_measure', 'Horizontal shift: '), h('strong', { 'data-wave-measure': 'shift', 'data-wave-shift': shift }, shift === null ? __alloT('stem.funcgrapher.wave_shift_not_unique', 'Not unique') : '≈ ' + shift.toFixed(2)))),
                h('p', { 'data-wave-meaning': true, className: 'text-sm' }, isConstant ? __alloT('stem.funcgrapher.wave_constant_meaning', 'This is a constant function: no oscillation, no fundamental period, and no unique horizontal shift.') : __alloT('stem.funcgrapher.wave_formula_meaning', 'Amplitude is |a|, period is 2π/b, and one horizontal shift is −φ/b. Negative a reflects the wave across y = 0. A negative shift moves it left.')),
                !isConstant && period > xRight - xLeft && h('p', { className: 'text-xs' }, __alloT('stem.funcgrapher.wave_long_period', 'A full period extends beyond this window.')),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { type: 'button', onClick: saveSetting, disabled: savedIndex >= 0, style: Object.assign({}, buttonStyle, { cursor: savedIndex >= 0 ? 'default' : 'pointer' }) }, savedIndex >= 0 ? __alloT('stem.funcgrapher.wave_already_saved', 'Already saved as setting ') + (savedIndex + 1) : __alloT('stem.funcgrapher.wave_save_setting', 'Save setting')),
                  h('button', { type: 'button', onClick: function() { setIQ({ amp: 1, freq: 1, phase: 0, log: [], referenceKey: '', showReference: true, showLog: true, hypothesis: '', understood: false, explanation: '', focus: 'height' }); }, style: buttonStyle }, __alloT('stem.funcgrapher.wave_reset_investigation', 'Reset investigation'))),
                reference && h('div', { className: 'space-y-2' },
                  h('label', { htmlFor: 'wave-reference-select', className: 'block text-sm font-bold' }, __alloT('stem.funcgrapher.wave_compare_with', 'Compare with')),
                  h('select', { id: 'wave-reference-select', value: referenceKey, onChange: function(e) { setIQ({ referenceKey: e.target.value }); }, style: fieldStyle }, records.map(function(record, index) { return h('option', { key: keyFor(record), value: keyFor(record) }, savedLabel + ' ' + (index + 1) + ': a=' + display(record.a) + ', b=' + display(record.f) + ', φ=' + display(record.p)); })),
                  h('label', { className: 'flex items-center gap-2 text-sm', style: { minHeight: 44 } }, h('input', { type: 'checkbox', checked: iq.showReference !== false, onChange: function(e) { setIQ({ showReference: e.target.checked }); }, style: { width: 24, height: 24, margin: 0, flexShrink: 0 } }), __alloT('stem.funcgrapher.wave_show_reference', 'Show saved reference (dashed)')),
                  h('button', { type: 'button', onClick: function() { setIQ({ amp: reference.a, freq: reference.f, phase: reference.p }); }, style: buttonStyle }, __alloT('stem.funcgrapher.wave_restore_reference', 'Restore reference'))),
                h('p', { 'data-wave-comparison': true, role: 'status', className: 'text-sm' }, comparison),
                reference && h('div', null,
                  h('button', { type: 'button', 'aria-expanded': iq.showLog !== false, 'aria-controls': 'wave-saved-settings', onClick: function() { setIQ({ showLog: iq.showLog === false }); }, style: buttonStyle }, __alloT('stem.funcgrapher.wave_saved_settings', 'Saved settings') + ' (' + records.length + '/8)'),
                  h('ol', { id: 'wave-saved-settings', hidden: iq.showLog === false, className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2', style: { listStyle: 'none', padding: 0, display: iq.showLog === false ? 'none' : undefined } }, records.map(function(record, index) { return h('li', { key: keyFor(record), 'data-wave-record': keyFor(record), className: 'p-2 rounded text-sm', style: { border: '1px solid ' + softInk } }, h('strong', null, savedLabel + ' ' + (index + 1)), h('p', { className: 'font-mono' }, equation(record)), h('p', null, __alloT('stem.funcgrapher.wave_at_zero', 'At x = 0, y ≈ ') + valueAt(record, 0).toFixed(3))); })),
                  h('p', { className: 'text-xs mt-1' }, __alloT('stem.funcgrapher.wave_record_limit', 'Keeps the latest eight distinct settings. Values shown are rounded.'))),
                h('label', { htmlFor: 'wave-working-explanation', className: 'block text-sm font-bold' }, __alloT('stem.funcgrapher.wave_working_explanation', 'What do you notice?')),
                h('textarea', { id: 'wave-working-explanation', value: typeof iq.hypothesis === 'string' ? iq.hypothesis : '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.funcgrapher.wave_observation_placeholder', 'Compare two settings. Which parameter changed, and what stayed the same?'), style: fieldStyle, rows: 2 }),
                h('label', { className: 'flex items-center gap-2 text-sm', style: { minHeight: 44 } }, h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, style: { width: 24, height: 24, margin: 0, flexShrink: 0 } }), __alloT('stem.funcgrapher.wave_explain_with_evidence', 'Explain using saved settings')),
                iq.understood && h('textarea', { 'aria-label': __alloT('stem.funcgrapher.explanation_input', 'Function grapher explanation'), value: typeof iq.explanation === 'string' ? iq.explanation : '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.funcgrapher.wave_evidence_placeholder', 'Name two saved settings. Use the graph and measurements to explain the effect you observed.'), style: fieldStyle, rows: 3 })
              );
            })(),
            fgStage === 'practice' && fgRenderTfLab(true),
            fgStage === 'practice' && GA && GA.workedPanel(React, { id: 'fg-worked', t: __alloT, state: d.we && typeof d.we === 'object' ? d.we : {}, onSet: function(st) { upd('we', st); }, announce: announceToSR, styles: fgCoreStyles }),
            fgStage === 'teacher' && fgRenderTeacher()
            )
          )
      })();
    }
  });

  console.log('[StemLab] stem_tool_funcgrapher.js loaded — Function Grapher');
})();
