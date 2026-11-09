// ═══════════════════════════════════════════════
// stem_tool_graphcalc.js — Graphing Calculator (ES5)
// Extracted from stem_tool_science.js monolith and enhanced with:
//   Sound effects, 12 badges, AI tutor, TTS, grade-band content,
//   snapshot support, challenge completion, canvas rendering
// ═══════════════════════════════════════════════

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

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-graphcalc')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-graphcalc';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // Local contrast tokens for the graphing calculator side panels.
  (function() {
    if (document.getElementById('allo-graphcalc-contrast-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-graphcalc-contrast-css';
    st.textContent = [
      '.graphcalc-shell{--gc-panel:var(--allo-stem-panel,#f8fafc);--gc-deeper:var(--allo-stem-deeper,#e2e8f0);--gc-card:#eef2ff;--gc-card-strong:#e0e7ff;--gc-text:var(--allo-stem-text,#0f172a);--gc-muted:#475569;--gc-border:var(--allo-stem-border,#cbd5e1);--gc-accent:#4338ca;--gc-accent-soft:#e0e7ff;--gc-accent-border:#818cf8;--gc-button-bg:#eef2ff;--gc-button-text:#3730a3;--gc-danger:#991b1b;--gc-trace:#b45309;}',
      '.theme-dark .graphcalc-shell{--gc-card:rgba(99,102,241,.16);--gc-card-strong:rgba(99,102,241,.24);--gc-muted:#cbd5e1;--gc-accent:#c7d2fe;--gc-accent-soft:rgba(99,102,241,.22);--gc-accent-border:#818cf8;--gc-button-bg:rgba(99,102,241,.18);--gc-button-text:#c7d2fe;--gc-danger:#fca5a5;--gc-trace:#fbbf24;}',
      '.theme-contrast .graphcalc-shell{--gc-card:var(--allo-stem-panel,#fff);--gc-card-strong:var(--allo-stem-panel,#fff);--gc-muted:var(--allo-stem-text,#000);--gc-accent:var(--allo-stem-text,#000);--gc-accent-soft:var(--allo-stem-button-bg,#fff);--gc-accent-border:var(--allo-stem-border,#000);--gc-button-bg:var(--allo-stem-button-bg,#fff);--gc-button-text:var(--allo-stem-button-text,#000);--gc-danger:var(--allo-stem-text,#000);--gc-trace:var(--allo-stem-text,#000);}',
      '@media (max-width:640px){.graphcalc-shell{height:auto!important;min-height:100%;overflow:visible!important}.graphcalc-header{align-items:flex-start!important;flex-wrap:wrap}.graphcalc-header-actions{margin-left:0!important;flex-wrap:wrap}.graphcalc-layout{flex:none!important;flex-direction:column!important;overflow:visible!important;min-width:0}.graphcalc-left-sidebar,.graphcalc-main-panel,.graphcalc-right-sidebar{width:100%!important;min-width:0}.graphcalc-left-sidebar,.graphcalc-right-sidebar{display:block!important}.graphcalc-left-sidebar{border-right:0!important;border-bottom:1px solid var(--gc-border)}.graphcalc-main-panel{flex:none!important;min-height:360px}.graphcalc-right-sidebar{border-left:0!important;border-top:1px solid var(--gc-border)}.graphcalc-side-tabs{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))}.graphcalc-side-tabs button{min-width:0;min-height:44px}}'
    ].join('');
    document.head.appendChild(st);
  })();


  /* ── StemLab plugin guard ───────────────────────────────── */
  if (!window.StemLab) {
    window.StemLab = {
      tools: {},
      registerTool: function(id, def) { window.StemLab.tools[id] = def; }
    };
  }
  if (!window.StemLab.registerTool) {
    window.StemLab.registerTool = function(id, def) {
      window.StemLab.tools[id] = def;
    };
  }

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
    function isMuted() { try { if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true; } catch (e) {} return !!window._alloGlobalMute; }
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

  function gcCandidateEvidence(evaluate, x, step, min, max, compare) {
    if(!Number.isFinite(x)||!Number.isFinite(step)||step<=0||!Number.isFinite(min)||!Number.isFinite(max)||x<min||x>max||min>=max)return {rows:[],error:'Choose a candidate within a finite search interval.'};
    var rows=[],seen=new Set();
    function value(fn,at){try{var y=fn(at);return typeof y==='number'&&Number.isFinite(y)?y:null;}catch(e){return null;}}
    [-1,-0.1,0,0.1,1].forEach(function(factor){
      var at=Math.max(min,Math.min(max,x+step*factor));if(!Number.isFinite(at)||seen.has(at))return;seen.add(at);
      var first=value(evaluate,at),second=compare?value(compare,at):null,difference=compare?(first!==null&&second!==null?first-second:null):first;
      if(!Number.isFinite(difference))difference=null;
      rows.push({x:at,first:first,second:second,difference:difference,position:at<x?'Left of candidate':at>x?'Right of candidate':'At candidate'});
    });
    return {rows:rows,step:step,complete:rows.length===5,finite:rows.every(function(row){return row.difference!==null;})};
  }
  function gcAnalysisContext(funcs, win, state) {
    var parameters={};['a','b','c'].forEach(function(name){var value=state['slider'+name.toUpperCase()];if(value!=null)parameters[name]=value;});
    return {expressions:funcs.map(function(fn){return fn.expr||'';}),parameters:parameters,interval:[win.xmin,win.xmax],created:new Date().toISOString()};
  }
  function gcAnalysisMarkdown(context, zeros, intersections, report, evidence) {
    function number(value){return typeof value==='number'&&Number.isFinite(value)?String(value):'Unavailable (non-finite or outside the real domain)';}
    context=context||{expressions:[],parameters:{},interval:[]};report=report||{};
    var lines=['# Graphing Calculator numerical evidence',context.created||'','## Inputs'];
    (context.expressions||[]).forEach(function(expr,i){if(String(expr).trim())lines.push('f'+(i+1)+'(x): '+expr);});
    lines.push('Parameters: '+(Object.keys(context.parameters||{}).map(function(key){return key+' = '+context.parameters[key];}).join(', ')||'None set.'));
    lines.push('Search interval: ['+(context.interval||[]).map(number).join(', ')+']');
    lines.push('Method: 501 grid samples, sign-change refinement, and local minima of |f|. Absolute residual threshold: 1e-8.');
    lines.push('Candidates and nearby values are numerical evidence, not proof of roots, intersections, continuity, or completeness.');
    if(report.error)lines.push('Analysis error: '+report.error);
    if(report.invalidEvaluations)lines.push('Non-finite or invalid evaluations for f1 during scanning: '+report.invalidEvaluations);
    if(report.zeroThroughoutSamples)lines.push('f1 equals zero at all sampled points; no isolated-root list is inferred.');
    if(report.overlapComparisons)lines.push('Sampled overlap with: '+report.overlapComparisons.map(function(n){return 'f'+n;}).join(', ')+'. This is not proof of identical functions.');
    if(report.intersectionWarning)lines.push(report.intersectionWarning);
    lines.push('## Zero candidates');
    (zeros||[]).forEach(function(row){lines.push('- x ≈ '+number(row.x)+'; |f1(x)| = '+number(row.residual)+'; method: '+row.method);});
    if(!(zeros||[]).length)lines.push('No isolated zero candidates recorded.');
    lines.push('## Intersection candidates');
    (intersections||[]).forEach(function(row){lines.push('- f1 and f'+(row.f2+1)+': x ≈ '+number(row.x)+', y ≈ '+number(row.y)+'; absolute difference = '+number(row.residual)+'; method: '+row.method);});
    if(!(intersections||[]).length)lines.push('No isolated intersection candidates recorded.');
    if(evidence){
      lines.push('## Nearby-value inspection',evidence.label,'Probe distance: '+number(evidence.step)+'; also sampled at one tenth of that distance. Values stay within the original search interval.');
      if(evidence.error)lines.push(evidence.error);
      if(evidence.complete===false)lines.push('Some probe positions coincide because of an interval boundary or floating-point precision.');
      (evidence.rows||[]).forEach(function(row){lines.push('- '+row.position+': x = '+number(row.x)+'; f1(x) = '+number(row.first)+(evidence.comparison?'; '+evidence.comparison+'(x) = '+number(row.second)+'; f1 − '+evidence.comparison+' = '+number(row.difference):''));});
    }
    return lines.join('\n\n');
  }
  window.__alloGraphAnalysis = { scan: gcScanRoots, inspect: gcCandidateEvidence, context: gcAnalysisContext, markdown: gcAnalysisMarkdown };

  /* ═══════════════════════════════════════════════════════════
     Sound Engine (Web Audio API)
     ═══════════════════════════════════════════════════════════ */
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); }
      catch (e) { /* silent */ }
    }
    return _audioCtx;
  }

  // The app's mute is __alloIsGlobalMuted(); _alloGlobalMute is the legacy flag.
  function gcAppMuted() {
    try { if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return true; } catch (e) {}
    return !!window._alloGlobalMute;
  }

  function playTone(freq, dur, type, vol) {
    if (gcAppMuted()) return;
    var ac = getAudioCtx();
    if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  var SOUNDS = {
    graphDraw: function() {
      playTone(440, 0.06, 'sine', 0.06);
      setTimeout(function() { playTone(554, 0.08, 'sine', 0.06); }, 50);
    },
    tierChange: function() {
      playTone(392, 0.1, 'triangle', 0.08);
      setTimeout(function() { playTone(523, 0.1, 'triangle', 0.08); }, 80);
    },
    zoomPreset: function() { playTone(523, 0.06, 'sine', 0.06); },
    analyzeComplete: function() {
      playTone(660, 0.08, 'sine', 0.08);
      setTimeout(function() { playTone(880, 0.1, 'sine', 0.10); }, 70);
    },
    challengeOpen: function() {
      playTone(494, 0.06, 'triangle', 0.06);
      setTimeout(function() { playTone(587, 0.06, 'triangle', 0.06); }, 50);
    },
    quizCorrect: function() {
      playTone(523, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100);
      setTimeout(function() { playTone(784, 0.15, 'sine', 0.12); }, 200);
    },
    badge: function() {
      playTone(784, 0.1, 'sine', 0.1);
      setTimeout(function() { playTone(988, 0.1, 'sine', 0.12); }, 120);
      setTimeout(function() { playTone(1175, 0.2, 'sine', 0.14); }, 240);
      setTimeout(function() { playTone(1568, 0.3, 'sine', 0.1); }, 380);
    },
    snapshot: function() {
      playTone(1200, 0.06, 'square', 0.06);
      setTimeout(function() { playTone(1600, 0.08, 'sine', 0.08); }, 70);
    },
    aiTutor: function() {
      playTone(392, 0.12, 'sine', 0.08);
      setTimeout(function() { playTone(523, 0.12, 'sine', 0.1); }, 120);
    },
    tts: function() { playTone(330, 0.06, 'sine', 0.06); },
    clearAll: function() { playTone(220, 0.15, 'sawtooth', 0.06); },
    traceOn: function() {
      playTone(660, 0.04, 'sine', 0.05);
      setTimeout(function() { playTone(880, 0.06, 'sine', 0.05); }, 40);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     Grade-Band Helper
     ═══════════════════════════════════════════════════════════ */
  function getGradeBand(ctx) {
    var g = ctx.gradeLevel;
    // gradeLevel arrives as a STRING ('5th Grade') in the live ctx; numeric
    // comparisons on a string are all false, which parked every student in g912.
    if (typeof g !== 'number') {
      var gl = String(g || '5th Grade').toLowerCase();
      if (/k|1st|2nd|pre/.test(gl)) return 'k2';
      if (/3rd|4th|5th/.test(gl)) return 'g35';
      if (/6th|7th|8th/.test(gl)) return 'g68';
      if (/9th|10|11|12|high/.test(gl)) return 'g912';
      return 'g35';
    }
    if (g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  }

  /* ═══════════════════════════════════════════════════════════
     Expression cleanup (shared by canvas, table, analyze, trace,
     derivative — previously copy-pasted at each site)
     ═══════════════════════════════════════════════════════════ */
  function gcCleanExpr(raw) {
    var e = String(raw).replace(/^y\s*=\s*/i, '').replace(/^f\s*\(x\)\s*=\s*/i, '');
    e = e.replace(/(\d)([x])/gi, '$1*$2').replace(/([x])(\d)/gi, '$1*$2');
    // Calculator convention (and this tool's own coach tip): log( is base 10,
    // ln( is natural. mathjs's log( is natural and it has NO ln — so the Math
    // Pad's ln button produced an invalid expression and the curve silently
    // vanished. Order matters: map log→log10 BEFORE ln→log. (Not \b: it fails
    // after a digit — '2ln(x)' — because digit→letter is not a word boundary.)
    e = e.replace(/(^|[^A-Za-z_])log\s*\(/gi, '$1log10(').replace(/(^|[^A-Za-z_])ln\s*\(/gi, '$1log(');
    return e;
  }

  function gcFiniteNumber(raw, fallback) {
    if (raw === '' || raw === null || raw === undefined) return fallback;
    var value = typeof raw === 'number' ? raw : Number(raw);
    return isFinite(value) ? value : fallback;
  }

  function gcNormalizeTableStep(raw) {
    var step = gcFiniteNumber(raw, 1);
    return step === 0 ? 1 : step;
  }

  function gcBuildTableXValues(start, step, count) {
    var first = gcFiniteNumber(start, -5);
    var increment = gcNormalizeTableStep(step);
    var length = Math.max(0, Math.floor(gcFiniteNumber(count, 11)));
    var values = [];
    for (var i = 0; i < length; i++) values.push(first + i * increment);
    return values;
  }

  function gcFill(s, map) { return String(s).replace(/\{(\w+)\}/g, function(m, k) { return map && map[k] != null ? String(map[k]) : m; }); }

  // Challenge checks: does a row draw the target curve? Compared at probe points
  // where the target is defined; the row must agree at every one of them.
  var GC_PROBE_XS = [-3.7, -2.3, -1.1, -0.4, 0.6, 1.7, 2.9, 3.6];
  function gcSameCurve(evaluate, target) {
    var used = 0;
    for (var i = 0; i < GC_PROBE_XS.length; i++) {
      var want = target(GC_PROBE_XS[i]), got;
      if (typeof want !== 'number' || !isFinite(want)) continue;
      try { got = evaluate(GC_PROBE_XS[i]); } catch (e) { return false; }
      if (typeof got !== 'number' || !isFinite(got) || Math.abs(got - want) > 1e-6 * Math.max(1, Math.abs(want))) return false;
      used++;
    }
    return used >= 3;
  }

  // Describe-and-hear data for the selected row, kept here (never in toolData) and
  // reused until the expression, window, sliders or language change.
  var _gcAccessCache = { key: '', value: null };
  var _gcRocDrag = null; // which rate-of-change point the pointer is dragging (never in toolData)

  // Function Grapher state for a matched family; existing keys keep their meaning.
  function gcFamilyHandoff(prev, match) {
    var fg = Object.assign({ type: 'linear', a: 1, b: 0, c: 0, showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false, compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0, aiExplain: '', aiExplainLoading: false },
      prev && prev.funcGrapher && typeof prev.funcGrapher === 'object' ? prev.funcGrapher : {},
      { type: match.type, a: match.a, b: match.b, c: match.c, fgQuiz: null });
    var tried = Object.assign({}, fg.familiesTried && typeof fg.familiesTried === 'object' ? fg.familiesTried : {});
    tried[match.type] = true;
    fg.familiesTried = tried;
    return Object.assign({}, prev, { funcGrapher: fg });
  }

  /* ═══════════════════════════════════════════════════════════
     Stage B models: data and regression, inverses, piecewise
     ═══════════════════════════════════════════════════════════ */
  function gcSig(v, digits) {
    if (typeof v !== 'number' || !isFinite(v)) return '?';
    var r = Number(v.toPrecision(digits || 4)); if (r === 0) r = 0;
    var s = String(r);
    return s.charAt(0) === '-' ? '−' + s.slice(1) : s;
  }
  // (x, y) pairs, one per line, separated by commas, tabs, spaces or semicolons. A first line
  // that is not numeric is a header. Returns the points and the line numbers that could not be read.
  function gcParseData(text) {
    var points = [], bad = [];
    String(text == null ? '' : text).split(/\r?\n/).slice(0, 400).forEach(function(line, i) {
      var t = line.trim();
      if (!t) return;
      var parts = t.split(/[\s,;]+/).filter(Boolean);
      var x = parts.length > 1 ? Number(parts[0].replace(/−/g, '-')) : NaN, y = parts.length > 1 ? Number(parts[1].replace(/−/g, '-')) : NaN;
      if (isFinite(x) && isFinite(y)) { if (points.length < 200) points.push({ x: x, y: y }); return; }
      if (!points.length && !bad.length && parts.length > 1 && isNaN(x) && isNaN(y)) return; // header row
      bad.push(i + 1);
    });
    return { points: points, bad: bad };
  }
  function gcSolve(M, v) {
    var n = v.length, A = M.map(function(row, i) { return row.concat([v[i]]); });
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;
      var tmp = A[c]; A[c] = A[p]; A[p] = tmp;
      for (var r2 = 0; r2 < n; r2++) if (r2 !== c) { var f = A[r2][c] / A[c][c]; for (var k = c; k <= n; k++) A[r2][k] -= f * A[c][k]; }
    }
    return A.map(function(row, i) { return row[n] / row[i]; });
  }
  function gcRSquared(ys, fits) {
    var n = ys.length, mean = 0, tot = 0, res = 0;
    ys.forEach(function(y) { mean += y / n; });
    ys.forEach(function(y, i) { tot += (y - mean) * (y - mean); res += (y - fits[i]) * (y - fits[i]); });
    return tot > 0 ? 1 - res / tot : null;
  }
  function gcLineFit(xs, ys) {
    var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
    var den = n * sxx - sx * sx;
    if (!(Math.abs(den) > 1e-12 * Math.max(1, n * sxx))) return null;
    var m = (n * sxy - sx * sy) / den;
    return { m: m, b: (sy - m * sx) / n };
  }
  // Least-squares fits. Exponential is log-linear: a line fitted to (x, ln y), so it needs
  // every y > 0 and its R² describes ln y. Errors: few, samex, nonpositive.
  function gcFit(points, kind) {
    var pts = (Array.isArray(points) ? points : []).filter(function(p) { return p && isFinite(p.x) && isFinite(p.y); });
    var xs = pts.map(function(p) { return p.x; }), ys = pts.map(function(p) { return p.y; }), n = pts.length, out = { kind: kind, n: n };
    var distinct = xs.filter(function(x, i) { return xs.indexOf(x) === i; }).length;
    function finish(predict, coef, eq, expr, r2, extra) {
      var fits = xs.map(predict);
      return Object.assign(out, { coef: coef, eq: eq, expr: expr, predict: predict, r2: r2 === undefined ? gcRSquared(ys, fits) : r2,
        residuals: pts.map(function(p, i) { return { x: p.x, y: p.y, fit: fits[i], res: p.y - fits[i] }; }) }, extra || {});
    }
    function term(v, body, first) { var s = gcSig(Math.abs(v)) + body; return first ? (v < 0 ? '−' : '') + s : (v < 0 ? ' − ' : ' + ') + s; }
    if (kind === 'linear') {
      if (n < 2) return Object.assign(out, { error: 'few' });
      var L = gcLineFit(xs, ys);
      if (!L || distinct < 2) return Object.assign(out, { error: 'samex' });
      return finish(function(x) { return L.m * x + L.b; }, L, 'y = ' + term(L.m, 'x', true) + term(L.b, '', false), Number(L.m.toPrecision(10)) + '*x + (' + Number(L.b.toPrecision(10)) + ')');
    }
    if (kind === 'quadratic') {
      if (n < 3) return Object.assign(out, { error: 'few' });
      if (distinct < 3) return Object.assign(out, { error: 'samex' });
      var S = [0, 0, 0, 0, 0], T = [0, 0, 0];
      pts.forEach(function(p) { var xp = 1; for (var k = 0; k <= 4; k++) { S[k] += xp; if (k <= 2) T[k] += xp * p.y; xp *= p.x; } });
      var sol = gcSolve([[S[4], S[3], S[2]], [S[3], S[2], S[1]], [S[2], S[1], S[0]]], [T[2], T[1], T[0]]);
      if (!sol) return Object.assign(out, { error: 'samex' });
      var qa = sol[0], qb = sol[1], qc = sol[2];
      return finish(function(x) { return qa * x * x + qb * x + qc; }, { a: qa, b: qb, c: qc }, 'y = ' + term(qa, 'x²', true) + term(qb, 'x', false) + term(qc, '', false),
        Number(qa.toPrecision(10)) + '*x^2 + (' + Number(qb.toPrecision(10)) + ')*x + (' + Number(qc.toPrecision(10)) + ')');
    }
    if (kind === 'exponential') {
      if (n < 2) return Object.assign(out, { error: 'few' });
      if (ys.some(function(y) { return y <= 0; })) return Object.assign(out, { error: 'nonpositive' });
      var lnY = ys.map(Math.log), E = gcLineFit(xs, lnY);
      if (!E || distinct < 2) return Object.assign(out, { error: 'samex' });
      var ea = Math.exp(E.b), eb = Math.exp(E.m);
      var r2log = gcRSquared(lnY, xs.map(function(x) { return E.m * x + E.b; }));
      return finish(function(x) { return ea * Math.pow(eb, x); }, { a: ea, b: eb, k: E.m, lnA: E.b }, 'y = ' + gcSig(ea) + ' · ' + gcSig(eb) + '^x',
        Number(ea.toPrecision(10)) + '*(' + Number(eb.toPrecision(10)) + ')^x', r2log, { r2Raw: null, logLinear: true });
    }
    return Object.assign(out, { error: 'kind' });
  }
  // One-to-one on this window? From the shared analysis: a turning point or a flat stretch fails the
  // horizontal-line test, and so do branches whose y-values overlap. The witness is a horizontal
  // line y = level that meets the graph more than once.
  function gcInverseCheck(GA, rule, win) {
    function evaluate(x) { var v; try { v = rule(x); } catch (e) { v = NaN; } return typeof v === 'number' ? v : NaN; }
    var f = GA.analyse(GA.sample(evaluate, win.xmin, win.xmax, 401), { evaluate: evaluate, ymin: win.ymin, ymax: win.ymax });
    if (!f.defined) return { verdict: 'empty', features: f };
    function crossings(level) { var z = GA.zerosOf(function(x) { var v = evaluate(x); return typeof v === 'number' ? v - level : NaN; }, win.xmin, win.xmax); return z.xs; }
    var flat = f.intervals.filter(function(iv) { return iv.dir === 'constant'; })[0];
    if (flat) { var fy = evaluate((flat.from + flat.to) / 2); return { verdict: 'no', reason: 'flat', level: fy, from: flat.from, to: flat.to, features: f }; }
    if (f.extrema.length) {
      var e = f.extrema[0], before = f.intervals.filter(function(iv) { return Math.abs(iv.to - e.x) < 1e-6; })[0], after = f.intervals.filter(function(iv) { return Math.abs(iv.from - e.x) < 1e-6; })[0];
      var yl = before ? evaluate(before.from) : NaN, yr = after ? evaluate(after.to) : NaN;
      var gap = Math.min(isFinite(yl) ? Math.abs(e.y - yl) : Infinity, isFinite(yr) ? Math.abs(e.y - yr) : Infinity);
      if (!isFinite(gap) || gap <= 0) gap = (win.ymax - win.ymin) * 0.01;
      var level = e.kind === 'max' ? e.y - gap / 2 : e.y + gap / 2;
      return { verdict: 'no', reason: 'turn', turn: e, level: level, xs: crossings(level) || [], features: f };
    }
    var spans = f.runs.map(function(run) { var ys = run.map(function(p) { return p.y; }); return [Math.min.apply(null, ys), Math.max.apply(null, ys)]; });
    for (var i = 0; i < spans.length; i++) for (var j = i + 1; j < spans.length; j++) {
      var lo = Math.max(spans[i][0], spans[j][0]), hi = Math.min(spans[i][1], spans[j][1]);
      if (hi > lo) { var lv = (lo + hi) / 2; return { verdict: 'no', reason: 'overlap', level: lv, xs: crossings(lv) || [], features: f }; }
    }
    var dirs = f.intervals.map(function(iv) { return iv.dir; }).filter(function(v, k, a) { return a.indexOf(v) === k; });
    return { verdict: 'yes', dir: dirs.length === 1 ? dirs[0] : 'mixed', features: f };
  }
  // Piecewise rule: pieces { expr, lo, hi, loC, hiC } with '' for an unbounded end. compile(expr)
  // returns an evaluator or null. Gives each piece's drawing, its endpoint dots (closed = included),
  // and any x that two pieces both claim (then it is not a function).
  function gcPiecewise(pieces, compile, win) {
    var out = { pieces: [], dots: [], overlaps: [], errors: [] };
    function num(v) { return v === '' || v == null ? null : Number(String(v).replace(/−/g, '-')); }
    function at(ev, x) { var v; try { v = ev(x); } catch (e) { v = NaN; } return typeof v === 'number' && isFinite(v) ? v : null; }
    (Array.isArray(pieces) ? pieces : []).slice(0, 4).forEach(function(p, i) {
      if (!p || typeof p.expr !== 'string' || !p.expr.trim()) return;
      var ev = compile(p.expr), lo = num(p.lo), hi = num(p.hi);
      lo = lo === null ? -Infinity : lo; hi = hi === null ? Infinity : hi;
      if (!ev || isNaN(lo) || isNaN(hi) || !(hi > lo)) { out.errors.push(i); return; }
      var piece = { index: i, expr: p.expr.trim(), ev: ev, lo: lo, hi: hi, loC: !!p.loC && isFinite(lo), hiC: !!p.hiC && isFinite(hi), points: [] };
      var a = Math.max(lo, win.xmin), b = Math.min(hi, win.xmax), span = win.xmax - win.xmin;
      if (b > a) {
        var n = Math.max(2, Math.ceil(400 * (b - a) / span));
        for (var k = 0; k <= n; k++) { var x = k === n ? b : a + (b - a) * k / n; piece.points.push({ x: x, y: at(ev, x) }); }
      }
      [[lo, piece.loC, 1], [hi, piece.hiC, -1]].forEach(function(end) {
        var x = end[0];
        if (!isFinite(x) || x < win.xmin || x > win.xmax) return;
        var y = at(ev, x);
        if (y === null) y = at(ev, x + end[2] * span * 1e-9);
        if (y !== null) out.dots.push({ x: x, y: y, closed: end[1], piece: i });
      });
      out.pieces.push(piece);
    });
    for (var i = 0; i < out.pieces.length; i++) for (var j = i + 1; j < out.pieces.length; j++) {
      var P = out.pieces[i], Q = out.pieces[j], lo = Math.max(P.lo, Q.lo), hi = Math.min(P.hi, Q.hi);
      if (hi > lo) out.overlaps.push({ from: lo, to: hi, pieces: [P.index, Q.index] });
      else if (hi === lo && isFinite(lo) && (P.lo === lo ? P.loC : P.hiC) && (Q.lo === lo ? Q.loC : Q.hiC)) out.overlaps.push({ from: lo, to: lo, pieces: [P.index, Q.index] });
    }
    out.evaluate = function(x) {
      for (var k = 0; k < out.pieces.length; k++) {
        var p = out.pieces[k];
        if ((x > p.lo || (p.loC && x === p.lo)) && (x < p.hi || (p.hiC && x === p.hi))) return at(p.ev, x) === null ? NaN : at(p.ev, x);
      }
      return NaN;
    };
    return out;
  }
  window.__alloGraphCalcModel = { parseData: gcParseData, fit: gcFit, inverseCheck: gcInverseCheck, piecewise: gcPiecewise };

  /* ═══════════════════════════════════════════════════════════
     Badge Definitions
     ═══════════════════════════════════════════════════════════ */
  var BADGES = [
    { id: 'firstGraph', icon: '\uD83D\uDCC8', label: 'First Graph', desc: 'Graph your first function', xp: 10,
      check: function(d) { return d._graphsDrawn >= 1; } },
    { id: 'fiveGraphs', icon: '\uD83C\uDFA8', label: 'Graph Artist', desc: 'Graph 5 different functions', xp: 15,
      check: function(d) { return d._graphsDrawn >= 5; } },
    { id: 'multiGraph', icon: '\uD83C\uDF08', label: 'Rainbow Grapher', desc: 'Graph 3+ functions at once', xp: 15,
      check: function(d) { return d._multiGraphCount >= 3; } },
    { id: 'analyzer', icon: '\u26A1', label: 'Analyzer', desc: 'Use the Analyze feature', xp: 10,
      check: function(d) { return d._analyzed; } },
    { id: 'zeroFinder', icon: '\uD83C\uDFAF', label: 'Zero Finder', desc: 'Find a zero (x-intercept)', xp: 15,
      check: function(d) { return d._foundZero; } },
    { id: 'intersector', icon: '\u2716', label: 'Intersector', desc: 'Find an intersection point', xp: 20,
      check: function(d) { return d._foundIntersection; } },
    { id: 'trigExplorer', icon: '\uD83C\uDF0A', label: 'Wave Rider', desc: 'Graph a trig function', xp: 15,
      check: function(d) { return d._usedTrig; } },
    { id: 'tableUser', icon: '\uD83D\uDCCA', label: 'Table Reader', desc: 'View the value table', xp: 10,
      check: function(d) { return d._usedTable; } },
    { id: 'challenger', icon: '\uD83C\uDFC6', label: 'Challenger', desc: 'Complete 3 challenges', xp: 25,
      check: function(d) { return (d._challengesCompleted || 0) >= 3; } },
    { id: 'sliderMaster', icon: '\uD83C\uDFA8', label: 'Slider Master', desc: 'Use parameter sliders', xp: 10,
      check: function(d) { return d._usedSliders; } },
    { id: 'derivCalc', icon: '\u2202', label: 'Calculus Start', desc: 'Calculate a derivative', xp: 15,
      check: function(d) { return d._usedDeriv; } },
    { id: 'aiCurious', icon: '\uD83E\uDD16', label: 'Curious Mind', desc: 'Ask the AI tutor 3 questions', xp: 15,
      check: function(d) { return (d.aiQuestions || 0) >= 3; } }
  ];

  /* ═══════════════════════════════════════════════════════════
     TTS Helper
     ═══════════════════════════════════════════════════════════ */
  function speakText(text, callTTS) {
    if (gcAppMuted()) return;
    SOUNDS.tts();
    if (callTTS) { try { callTTS(text); return; } catch (e) {} }
    if (window._kokoroTTS && window._kokoroTTS.speak) {
      window._kokoroTTS.speak(String(text),'af_heart',1).then(function(url){if(url&&!gcAppMuted()){var a=new Audio(url);a.playbackRate=0.95;
        // The app cancels speechSynthesis on mute but not this Audio: stop it here.
        var onMute=function(ev){if(ev&&ev.detail&&ev.detail.muted){try{a.pause();}catch(e){}window.removeEventListener('alloflow-mute-changed',onMute);}};
        window.addEventListener('alloflow-mute-changed',onMute);a.onended=function(){window.removeEventListener('alloflow-mute-changed',onMute);};
        a.play();}}).catch(function(){});
      return;
    }
    if (window.speechSynthesis) { var utter=new SpeechSynthesisUtterance(text); utter.rate=0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utter); }
  }

  /* ═══════════════════════════════════════════════════════════
     Register Tool
     ═══════════════════════════════════════════════════════════ */
  window.StemLab.registerTool('graphCalc', {
    icon: '\uD83D\uDCDF',
    label: 'Graphing Calculator',
    desc: 'Graph functions, analyze zeros and intersections, explore transformations',
    color: 'indigo',
    category: 'math',
    questHooks: [
      { id: 'graph_3_functions', label: 'Graph 3 different functions', icon: '\uD83D\uDCC8', check: function(d) { return (Array.isArray(d.funcs) ? d.funcs : []).filter(function(f) { return f && f.expr && String(f.expr).trim(); }).length >= 3; }, progress: function(d) { return (Array.isArray(d.funcs) ? d.funcs : []).filter(function(f) { return f && f.expr && String(f.expr).trim(); }).length + '/3 functions'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 graphing challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d._challengesCompleted || 0) >= 3; }, progress: function(d) { return (d._challengesCompleted || 0) + '/3'; } },
      { id: 'ask_ai_3', label: 'Ask the AI tutor 3 questions', icon: '\uD83E\uDD16', check: function(d) { return (d.aiQuestions || 0) >= 3; }, progress: function(d) { return (d.aiQuestions || 0) + '/3 questions'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var X = ctx.icons.X;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      // null unless text AI is usable: the AI help tab is then not offered.
      var callGemini = (ctx.aiAvailable !== false && typeof ctx.callGemini === 'function' && !ctx.callGemini._alloQrBlocked) ? ctx.callGemini : null;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;

      return (function() {
        var d = labToolData.graphCalc || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('graphCalc', 'init', {
              first: 'Graphing Calculator loaded. Plot equations, find intersections, and explore mathematical relationships visually.',
              repeat: 'Graphing Calculator active.',
              terse: 'Graph Calc.'
            }, { debounce: 800 });
          }

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            var next = Object.assign({}, prev);
            next.graphCalc = Object.assign({}, prev.graphCalc);
            next.graphCalc[key] = val;
            return next;
          });
        };

        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { graphCalc: Object.assign({}, prev.graphCalc, obj) });
          });
        };

        var band = getGradeBand(ctx);
        var gradeIntros = {
          k2: 'Type simple equations like y = 2x + 1 and watch the line appear!',
          g35: 'Explore linear functions! Change the slope and y-intercept to see the line move.',
          g68: 'Graph quadratics, find zeros, and discover how transformations change shapes.',
          g912: 'Analyze with derivatives, find intersections, use parameter sliders, explore trig and logs.'
        };

        /* ── State ── */
        var tier = d.tier || 'explorer';
        var funcs = Array.isArray(d.funcs) ? d.funcs : [
          { expr: '', color: '#38bdf8' }, { expr: '', color: '#f472b6' },
          { expr: '', color: '#34d399' }, { expr: '', color: '#fbbf24' },
          { expr: '', color: '#a78bfa' }, { expr: '', color: '#fb923c' }
        ];
        var DEFAULT_WINDOW = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };
        function finiteOr(value, fallback) { return Number.isFinite(value) ? value : fallback; }
        function normalizeWindow(raw) {
          raw = raw || {};
          var normalized = {
            xmin: finiteOr(raw.xmin, DEFAULT_WINDOW.xmin),
            xmax: finiteOr(raw.xmax, DEFAULT_WINDOW.xmax),
            ymin: finiteOr(raw.ymin, DEFAULT_WINDOW.ymin),
            ymax: finiteOr(raw.ymax, DEFAULT_WINDOW.ymax)
          };
          if (!(normalized.xmax > normalized.xmin)) {
            normalized.xmin = DEFAULT_WINDOW.xmin;
            normalized.xmax = DEFAULT_WINDOW.xmax;
          }
          if (!(normalized.ymax > normalized.ymin)) {
            normalized.ymin = DEFAULT_WINDOW.ymin;
            normalized.ymax = DEFAULT_WINDOW.ymax;
          }
          return normalized;
        }
        function clampTo(value, min, max) { return Math.max(min, Math.min(max, value)); }
        var win = normalizeWindow(d.window);
        var traceX = clampTo(Number.isFinite(d.traceX) ? d.traceX : 0, win.xmin, win.xmax);
        var derivX = clampTo(Number.isFinite(d.derivX) ? d.derivX : 0, win.xmin, win.xmax);
        var graphStep = Math.max((win.xmax - win.xmin) / 200, 0.000001);

        function applyWindow(nextWindow, extraPatch) {
          var safeWindow = normalizeWindow(nextWindow);
          var patch = Object.assign({ window: safeWindow }, extraPatch || {});
          if (d.traceMode || d.traceX != null) patch.traceX = clampTo(traceX, safeWindow.xmin, safeWindow.xmax);
          if (d.showDeriv || d.derivX != null) patch.derivX = clampTo(derivX, safeWindow.xmin, safeWindow.xmax);
          updMulti(patch);
        }

        // Window bounds keep the typed text as a draft ("", "-", "1." are steps on
        // the way to a number) and commit on blur or Enter.
        var winDrafts = (d._winDraft && typeof d._winDraft === 'object') ? d._winDraft : {};
        function commitWindowBound(key) {
          if (winDrafts[key] == null) return;
          var rest = Object.assign({}, winDrafts); delete rest[key];
          var rawValue = String(winDrafts[key]).trim();
          var value = rawValue === '' ? NaN : Number(rawValue);
          if (!Number.isFinite(value)) {
            var invalid = __alloT('stem.graphcalc.window_bound_invalid', 'Each window bound must be a number. The last valid value was kept.');
            updMulti({ _winDraft: rest, _winMsg: invalid });
            if (announceToSR) announceToSR(invalid);
            return;
          }
          var nextWindow = Object.assign({}, win);
          nextWindow[key] = value;
          if (!(nextWindow.xmax > nextWindow.xmin) || !(nextWindow.ymax > nextWindow.ymin)) {
            var message = __alloT('stem.graphcalc.window_order', 'Window minimums must be less than their matching maximums.');
            if (addToast) addToast(message, 'warning');
            if (announceToSR) announceToSR(message);
            updMulti({ _winDraft: rest });
            return;
          }
          applyWindow(nextWindow, { _winDraft: rest, _winMsg: '' });
        }
        var showTable = d.showTable || false;
        var showWindow = d.showWindow || false;
        var showMathPad = d.showMathPad || false;
        var tasksOpen = (d._sideTab || 'coach') === 'challenge';
        var showArith = d.showArith || false;
        var arithExpr = d.arithExpr || '';
        var arithResult = d.arithResult || '';
        var showSliders = d.showSliders || false;
        var focusedInput = d.focusedInput || 0;
        var tableX = (typeof d.tableX === 'number' && isFinite(d.tableX)) ? d.tableX : -5;
        var tableStep = (typeof d.tableStep === 'number' && isFinite(d.tableStep)) ? d.tableStep : 1;
        // Start and Step keep the typed text as a draft and commit a number on blur or Enter.
        function commitTableField(key) {
          var draftKey = key === 'tableX' ? '_tableXDraft' : '_tableStepDraft';
          if (d[draftKey] == null) return;
          var rawValue = String(d[draftKey]).trim();
          var value = rawValue === '' ? NaN : Number(rawValue);
          var patch = {};
          patch[draftKey] = null;
          if (!Number.isFinite(value) || (key === 'tableStep' && value === 0)) {
            patch._tableMsg = key === 'tableX'
              ? __alloT('stem.graphcalc.table_start_invalid', 'Start must be a number. Kept the last valid start: ') + tableX
              : __alloT('stem.graphcalc.table_step_invalid', 'Step must be a nonzero number. Kept the last valid step: ') + tableStep;
            if (announceToSR) announceToSR(patch._tableMsg);
          } else {
            patch[key] = value;
            patch._tableMsg = '';
          }
          updMulti(patch);
        }
        var badges = Array.isArray(d.badges) ? d.badges : [];
        var aiMessages = d.aiMessages || [];
        var aiInput = d.aiInput || '';
        var aiLoading = d.aiLoading || false;

        /* ── Math Pad symbols ── */
        var MATH_SYMBOLS = [
          { label: 'x', insert: 'x', tier: 'explorer' },
          { label: '^', insert: '^', tier: 'explorer' },
          { label: __alloT('stem.graphcalc.str', '( )'), insert: '()', tier: 'explorer' },
          { label: '\u03C0', insert: 'pi', tier: 'explorer' },
          { label: '\u221A', insert: 'sqrt(', tier: 'explorer' },
          { label: '|x|', insert: 'abs(', tier: 'explorer' },
          { label: 'x\u00B2', insert: '^2', tier: 'analyst' },
          { label: 'x\u00B3', insert: '^3', tier: 'analyst' },
          { label: '\u00B1', insert: '-', tier: 'analyst' },
          { label: '1/x', insert: '1/', tier: 'analyst' },
          { label: 'sin', insert: 'sin(', tier: 'engineer' },
          { label: 'cos', insert: 'cos(', tier: 'engineer' },
          { label: 'tan', insert: 'tan(', tier: 'engineer' },
          { label: 'log', insert: 'log(', tier: 'engineer' },
          { label: 'ln', insert: 'ln(', tier: 'engineer' },
          { label: 'e', insert: 'e', tier: 'engineer' }
        ];

        var visibleSymbols = MATH_SYMBOLS.filter(function(s) {
          if (tier === 'researcher') return true;
          if (tier === 'engineer') return s.tier !== 'researcher';
          if (tier === 'analyst') return s.tier === 'explorer' || s.tier === 'analyst';
          return s.tier === 'explorer';
        });

        function insertSymbol(text) {
          var nf = funcs.slice();
          var idx = focusedInput;
          nf[idx] = Object.assign({}, nf[idx], { expr: (nf[idx].expr || '') + text });
          upd('funcs', nf);
        }

        /* ── Coach tips ── */
        var COACH_TIPS = {
          explorer: [
            { icon: '\uD83D\uDCA1', title: __alloT('stem.graphcalc.entering_functions', 'Entering Functions'), text: __alloT('stem.graphcalc.type_y_mx_b_where_m_is_the_slope_and_b', 'Type y = mx + b where m is the slope and b is the y-intercept. Try: 2x + 3') },
            { icon: '\uD83D\uDD0D', title: __alloT('stem.graphcalc.zoom_window', 'Zoom & Window'), text: __alloT('stem.graphcalc.use_zoom_presets_to_change_how_much_of', 'Use zoom presets to change how much of the graph you see.') },
            { icon: '\uD83D\uDCCA', title: __alloT('stem.graphcalc.reading_the_table', 'Reading the Table'), text: __alloT('stem.graphcalc.table_rounded_values', 'The table shows computed y-values, rounded for display. Undefined means the expression has no finite real value at that x.') },
            { icon: '\uD83C\uDFAF', title: __alloT('stem.graphcalc.multiple_functions', 'Multiple Functions'), text: __alloT('stem.graphcalc.enter_different_equations_to_compare_t', 'Enter different equations to compare them. Where lines cross is an intersection!') }
          ],
          analyst: [
            { icon: '\uD83D\uDCC8', title: __alloT('stem.graphcalc.linear_vs_quadratic', 'Linear vs Quadratic'), text: __alloT('stem.graphcalc.y_2x_1_is_a_line_y_x_2_is_a_parabola_t', 'y = 2x + 1 is a line. y = x^2 is a parabola. The exponent determines the shape!') },
            { icon: '\uD83E\uDDEE', title: __alloT('stem.graphcalc.finding_zeros', 'Finding Zeros'), text: __alloT('stem.graphcalc.where_the_graph_crosses_the_x_axis_y_0', 'Where the graph crosses the x-axis, y = 0. These are zeros or x-intercepts.') },
            { icon: '\u26A1', title: __alloT('stem.graphcalc.transformations', 'Transformations'), text: __alloT('stem.graphcalc.y_x_3_2_shifts_right_by_3_y_x_2_5_shif', 'y = (x-3)^2 shifts right by 3. y = x^2 + 5 shifts up by 5.') }
          ],
          engineer: [
            { icon: '\uD83E\uDDE9', title: __alloT('stem.graphcalc.trig_functions', 'Trig Functions'), text: __alloT('stem.graphcalc.sin_x_cos_x_tan_x_create_waves_period_', 'sin(x), cos(x), tan(x) create waves. Period of sin(x) is 2\u03C0.') },
            { icon: '\uD83D\uDD22', title: __alloT('stem.graphcalc.logarithms', 'Logarithms'), text: __alloT('stem.graphcalc.log_x_is_the_inverse_of_10_x_ln_x_is_t', 'log(x) is the inverse of 10^x. ln(x) is the natural log.') },
            { icon: '\u221E', title: __alloT('stem.graphcalc.asymptotes', 'Asymptotes'), text: __alloT('stem.graphcalc.y_1_x_approaches_x_0_and_y_0_but_never', 'y = 1/x approaches x=0 and y=0 but never touches them.') }
          ]
        };

        var currentTips = (COACH_TIPS.explorer || []).concat(
          tier !== 'explorer' ? (COACH_TIPS.analyst || []) : []
        ).concat(
          tier === 'engineer' || tier === 'researcher' ? (COACH_TIPS.engineer || []) : []
        );

        /* ── Zoom presets ── */
        var ZOOM_PRESETS = [
          { name: __alloT('stem.graphcalc.standard', 'Standard'), xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
          { name: __alloT('stem.graphcalc.trig', 'Trig'), xmin: -6.28, xmax: 6.28, ymin: -2, ymax: 2 },
          { name: __alloT('stem.graphcalc.quadratic', 'Quadratic'), xmin: -5, xmax: 5, ymin: -5, ymax: 25 },
          { name: __alloT('stem.graphcalc.wide', 'Wide'), xmin: -50, xmax: 50, ymin: -50, ymax: 50 },
          { name: __alloT('stem.graphcalc.positive', 'Positive'), xmin: 0, xmax: 20, ymin: 0, ymax: 20 }
        ];

        /* ── Challenges ── */
        var PREMADE_CHALLENGES = [
          { tier: 'explorer', topic: 'Linear Functions', prompt: __alloT('stem.graphcalc.graph_y_3x_2_what_is_the_y_intercept', 'Graph y = 3x - 2. What is the y-intercept?'), hint: __alloT('stem.graphcalc.the_y_intercept_is_where_the_line_cros', 'The y-intercept is where the line crosses the y-axis (x=0).') },
          { tier: 'explorer', topic: 'Linear Functions', prompt: __alloT('stem.graphcalc.graph_y_x_5_and_y_x_1_where_do_they_in', 'Graph y = -x + 5 and y = x - 1. Where do they intersect?'), hint: __alloT('stem.graphcalc.the_intersection_is_where_both_equatio', 'The intersection is where both equations give the same y for the same x.') },
          { tier: 'explorer', topic: 'Tables', prompt: __alloT('stem.graphcalc.enter_y_x_2_look_at_the_table_what_pat', 'Enter y = x^2. Look at the table. What pattern do you see?'), hint: __alloT('stem.graphcalc.the_differences_between_consecutive_y_', 'The differences between consecutive y-values increase by 2 each time!') },
          { tier: 'analyst', topic: 'Quadratics', prompt: __alloT('stem.graphcalc.graph_y_x_2_4_where_are_the_zeros', 'Graph y = x^2 - 4. Where are the zeros?'), hint: __alloT('stem.graphcalc.set_y_0_x_2_4_so_x_2', 'Set y = 0: x^2 = 4, so x = +/-2.') },
          { tier: 'analyst', topic: 'Transformations', prompt: __alloT('stem.graphcalc.graph_y_x_2_y_x_3_2_y_x_2_2_what_chang', 'Graph y = x^2, y = (x-3)^2, y = (x+2)^2. What changes?'), hint: __alloT('stem.graphcalc.x_h_shifts_right_by_h_x_h_shifts_left', '(x-h) shifts RIGHT by h. (x+h) shifts LEFT.') },
          { tier: 'analyst', topic: 'Slope', prompt: __alloT('stem.graphcalc.graph_y_0_5x_y_x_y_2x_y_5x_what_happen', 'Graph y = 0.5x, y = x, y = 2x, y = 5x. What happens?'), hint: __alloT('stem.graphcalc.bigger_slope_steeper_line', 'Bigger slope = steeper line.') },
          { tier: 'engineer', topic: 'Trigonometry', prompt: __alloT('stem.graphcalc.graph_sin_x_and_cos_x_with_trig_preset', 'Graph sin(x) and cos(x) with Trig preset. How are they related?'), hint: __alloT('stem.graphcalc.cos_x_is_sin_x_shifted_left_by_pi_2', 'cos(x) is sin(x) shifted left by pi/2.') },
          { tier: 'engineer', topic: 'Exponential', prompt: __alloT('stem.graphcalc.graph_y_2_x_and_y_log_x_log_2_what_do_', 'Graph y = 2^x and y = log(x)/log(2). What do you notice?'), hint: __alloT('stem.graphcalc.inverse_functions_are_mirrors_across_y', 'Inverse functions are mirrors across y = x.') },
          { tier: 'engineer', topic: 'Asymptotes', prompt: __alloT('stem.graphcalc.graph_y_1_x_what_happens_near_x_0', 'Graph y = 1/x. What happens near x = 0?'), hint: __alloT('stem.graphcalc.the_graph_approaches_but_never_touches', 'The graph approaches but never touches the axes.') }
        ];
        // Parallel to PREMADE_CHALLENGES: each is checked against what is actually graphed,
        // after an optional prediction. Requirement kinds: graph (any row), first (row y1),
        // table, zeros and cross (a current Analyze result), window (a zoom preset).
        var CHALLENGE_CHECKS = [
          { reqs: [{ kind: 'graph', expr: '3x - 2', f: function(x) { return 3 * x - 2; } }],
            predict: { q: __alloT('stem.graphcalc.predict_q_yint', 'Before you graph it: where will the line cross the y-axis?'), answer: 'a', options: [{ id: 'a', label: 'y = −2' }, { id: 'b', label: 'y = 3' }, { id: 'c', label: 'y = 2' }] } },
          { reqs: [{ kind: 'graph', expr: '-x + 5', f: function(x) { return -x + 5; } }, { kind: 'graph', expr: 'x - 1', f: function(x) { return x - 1; } }, { kind: 'cross', x: 3, y: 2 }],
            predict: { q: __alloT('stem.graphcalc.predict_q_cross', 'Before you graph them: where do you think the lines cross?'), answer: 'a', options: [{ id: 'a', label: '(3, 2)' }, { id: 'b', label: '(2, 3)' }, { id: 'c', label: '(−1, 6)' }] } },
          { reqs: [{ kind: 'first', expr: 'x^2', f: function(x) { return x * x; } }, { kind: 'table' }],
            predict: { q: __alloT('stem.graphcalc.predict_q_table', 'Before you look: how will the y-values change from one row to the next?'), answer: 'b', options: [{ id: 'a', label: __alloT('stem.graphcalc.predict_same_amount', 'They go up by the same amount each time') }, { id: 'b', label: __alloT('stem.graphcalc.predict_jumps_grow', 'The jumps between them grow by 2 each time') }, { id: 'c', label: __alloT('stem.graphcalc.predict_double', 'They double each time') }] } },
          { reqs: [{ kind: 'first', expr: 'x^2 - 4', f: function(x) { return x * x - 4; } }, { kind: 'zeros', xs: [-2, 2] }],
            predict: { q: __alloT('stem.graphcalc.predict_q_zeros', 'Before you graph it: where will it cross the x-axis?'), answer: 'a', options: [{ id: 'a', label: 'x = −2, x = 2' }, { id: 'b', label: 'x = 4' }, { id: 'c', label: 'x = −4, x = 4' }] } },
          { reqs: [{ kind: 'graph', expr: 'x^2', f: function(x) { return x * x; } }, { kind: 'graph', expr: '(x-3)^2', f: function(x) { return (x - 3) * (x - 3); } }, { kind: 'graph', expr: '(x+2)^2', f: function(x) { return (x + 2) * (x + 2); } }],
            predict: { q: __alloT('stem.graphcalc.predict_q_shift', 'Before you graph them: compared with y = x^2, where will y = (x-3)^2 sit?'), answer: 'a', options: [{ id: 'a', label: __alloT('stem.graphcalc.predict_right_3', 'Shifted right 3') }, { id: 'b', label: __alloT('stem.graphcalc.predict_left_3', 'Shifted left 3') }, { id: 'c', label: __alloT('stem.graphcalc.predict_up_3', 'Shifted up 3') }] } },
          { reqs: [{ kind: 'graph', expr: '0.5x', f: function(x) { return 0.5 * x; } }, { kind: 'graph', expr: 'x', f: function(x) { return x; } }, { kind: 'graph', expr: '2x', f: function(x) { return 2 * x; } }, { kind: 'graph', expr: '5x', f: function(x) { return 5 * x; } }],
            predict: { q: __alloT('stem.graphcalc.predict_q_slope', 'Before you graph them: as the number in front of x gets bigger, the line gets...'), answer: 'a', options: [{ id: 'a', label: __alloT('stem.graphcalc.predict_steeper', 'Steeper') }, { id: 'b', label: __alloT('stem.graphcalc.predict_flatter', 'Flatter') }, { id: 'c', label: __alloT('stem.graphcalc.predict_no_change', 'No different') }] } },
          { reqs: [{ kind: 'graph', expr: 'sin(x)', f: Math.sin }, { kind: 'graph', expr: 'cos(x)', f: Math.cos }, { kind: 'window', preset: 1 }],
            predict: { q: __alloT('stem.graphcalc.predict_q_trig', 'Before you graph them: how do you think cos(x) relates to sin(x)?'), answer: 'a', options: [{ id: 'a', label: __alloT('stem.graphcalc.predict_sin_left', 'It is sin(x) shifted left by π/2') }, { id: 'b', label: __alloT('stem.graphcalc.predict_sin_up', 'It is sin(x) shifted up by 1') }, { id: 'c', label: __alloT('stem.graphcalc.predict_sin_flip', 'It is sin(x) flipped over the x-axis') }] } },
          { reqs: [{ kind: 'graph', expr: '2^x', f: function(x) { return Math.pow(2, x); } }, { kind: 'graph', expr: 'log(x)/log(2)', f: function(x) { return Math.log(x) / Math.LN2; } }],
            predict: { q: __alloT('stem.graphcalc.predict_q_inverse', 'Before you graph them: how will the two curves be related?'), answer: 'a', options: [{ id: 'a', label: __alloT('stem.graphcalc.predict_mirror_yx', 'Mirror images across the line y = x') }, { id: 'b', label: __alloT('stem.graphcalc.predict_mirror_x', 'Mirror images across the x-axis') }, { id: 'c', label: __alloT('stem.graphcalc.predict_same_curve', 'The same curve') }] } },
          { reqs: [{ kind: 'graph', expr: '1/x', f: function(x) { return 1 / x; } }],
            predict: { q: __alloT('stem.graphcalc.predict_q_asymptote', 'Before you graph it: what happens to y as x gets close to 0?'), answer: 'a', options: [{ id: 'a', label: __alloT('stem.graphcalc.predict_unbounded', 'y grows without bound: up on one side, down on the other') }, { id: 'b', label: __alloT('stem.graphcalc.predict_near_zero', 'y gets close to 0') }, { id: 'c', label: __alloT('stem.graphcalc.predict_equals_one', 'y equals 1') }] } }
        ];
        var GC_PREDICT_UNSURE = { id: 'unsure', label: __alloT('stem.graphcalc.predict_unsure', 'I am not sure yet') };

        // A teacher's assigned challenges come first, whatever the tier.
        var gcAssigned = (Array.isArray(d.assignedChallenges) ? d.assignedChallenges : []).filter(function(pid, k, all) { return typeof pid === 'number' && PREMADE_CHALLENGES[pid] && all.indexOf(pid) === k; });
        var availableChallenges = gcAssigned.map(function(pid) { return PREMADE_CHALLENGES[pid]; }).concat(PREMADE_CHALLENGES.filter(function(c, pid) {
          if (gcAssigned.indexOf(pid) >= 0) return false;
          if (tier === 'researcher') return true;
          if (tier === 'engineer') return c.tier !== 'researcher';
          if (tier === 'analyst') return c.tier === 'explorer' || c.tier === 'analyst';
          return c.tier === 'explorer';
        }));

        var TIER_INFO = {
          explorer: { icon: '\uD83D\uDFE2', name: __alloT('stem.graphcalc.explorer', 'Explorer'), desc: __alloT('stem.graphcalc.linear_functions', 'Linear functions'), color: '#34d399' },
          analyst: { icon: '\uD83D\uDFE1', name: __alloT('stem.graphcalc.analyst', 'Analyst'), desc: __alloT('stem.graphcalc.quadratics_transforms', 'Quadratics, transforms'), color: '#fbbf24' },
          engineer: { icon: '\uD83D\uDD35', name: __alloT('stem.graphcalc.engineer', 'Engineer'), desc: __alloT('stem.graphcalc.trig_logs_exponentials', 'Trig, logs, exponentials'), color: '#60a5fa' },
          researcher: { icon: '\uD83D\uDFE3', name: __alloT('stem.graphcalc.researcher', 'Researcher'), desc: __alloT('stem.graphcalc.full_access', 'Full access'), color: '#a78bfa' }
        };
        var tierInfo = TIER_INFO[tier] || TIER_INFO.explorer;

        /* ── Table computation ── */
        var tableRows = [];
        if (showTable && funcs[0] && funcs[0].expr && window.math) {
          try {
            var tCompiled = math.compile(gcCleanExpr(funcs[0].expr));
            gcBuildTableXValues(tableX, tableStep, 11).forEach(function(tx) {
              try {
                var _tScope = { x: tx };
                if (d.sliderA != null) _tScope.a = d.sliderA;
                if (d.sliderB != null) _tScope.b = d.sliderB;
                if (d.sliderC != null) _tScope.c = d.sliderC;
                var ty = tCompiled.evaluate(_tScope);
                tableRows.push({ x: Number(tx.toFixed(4)), y: typeof ty === 'number' && isFinite(ty) ? Number(ty.toFixed(4)) : __alloT('stem.graphcalc.undefined_real_value','Undefined in the real numbers') });
              } catch (e) { tableRows.push({ x: tx, y: __alloT('stem.graphcalc.cannot_evaluate','Cannot evaluate') }); }
            });
          } catch (e) { tableRows = [{ x: 0, y: __alloT('stem.graphcalc.invalid_expression', 'Invalid expression') }]; }
        }

        /* ── Badge Checker ── */
        function checkBadges(stateOverride) {
          var state = Object.assign({}, d, stateOverride || {});
          var earned = Array.isArray(state.badges) ? state.badges : [];
          var newBadges = [];
          BADGES.forEach(function(b) {
            if (earned.indexOf(b.id) < 0 && b.check(state)) newBadges.push(b);
          });
          if (newBadges.length > 0) {
            var ids = earned.slice();
            newBadges.forEach(function(b) {
              ids.push(b.id);
              if (addToast) addToast(b.icon + ' Badge: ' + b.label + ' (+' + b.xp + ' XP)', 'success');
              if (awardStemXP) awardStemXP('graphCalc', b.xp, 'Badge: ' + b.label);
            });
            SOUNDS.badge();
            if (stemCelebrate) stemCelebrate();
            upd('badges', ids);
          }
        }

        // Check badges inline (no useEffect)
        checkBadges();

        /* ── Analyze ── */

        var analysisKey=JSON.stringify([funcs.map(function(f){return f.expr||'';}),win.xmin,win.xmax,d.sliderA,d.sliderB,d.sliderC]);
        var analysisCurrent=d._analysisKey===analysisKey;
        function runAnalysis() {
          var provenance=gcAnalysisContext(funcs,win,d);
          if (!window.math) { updMulti({showAnalysis:true,_analysisContext:provenance,_analysisSelection:'',_analysisKey:analysisKey,_analysis:{error:'The math engine is still loading. Try Analyze again.',errorCode:'loading'},_zeros:[],_intersections:[]}); return; }
          SOUNDS.analyzeComplete();
          var zeros=[],inters=[],report={error:'Enter a function in the first row.',errorCode:'empty'};
          var scope={};if(d.sliderA!=null)scope.a=d.sliderA;if(d.sliderB!=null)scope.b=d.sliderB;if(d.sliderC!=null)scope.c=d.sliderC;
          try {
            if(funcs[0]&&funcs[0].expr.trim()){
              var c1=math.compile(gcCleanExpr(funcs[0].expr));
              var f=function(x){return c1.evaluate(Object.assign({},scope,{x:x}));};
              report=gcScanRoots(f,win.xmin,win.xmax);zeros=report.candidates;
              for(var i=1;i<funcs.length;i++){
                if(!funcs[i]||!funcs[i].expr.trim())continue;
                try{
                  var c2=math.compile(gcCleanExpr(funcs[i].expr));
                  var crossing=gcScanRoots(function(x){return f(x)-c2.evaluate(Object.assign({},scope,{x:x}));},win.xmin,win.xmax);
                  if(crossing.zeroThroughoutSamples){report.overlapComparisons=(report.overlapComparisons||[]).concat([i+1]);}
                  crossing.candidates.forEach(function(pt){inters.push(Object.assign({},pt,{y:f(pt.x),f2:i}));});
                }catch(e){report.intersectionWarning='At least one comparison function could not be parsed.';report.intersectionWarningCode='compare_parse';}
              }
            }
          }catch(e){report={error:'The first function could not be parsed. Check its expression.',errorCode:'parse'};}
          updMulti({showAnalysis:true,_analysisContext:provenance,_analysisSelection:'',_zeros:zeros,_intersections:inters,_analysis:report,_analysisKey:analysisKey,_analyzed:true,_foundZero:!!d._foundZero||zeros.length>0,_foundIntersection:!!d._foundIntersection||inters.length>0});
          if(announceToSR)announceToSR(gcFill(__alloT('stem.graphcalc.analysis_done','Numerical analysis complete. {z} zero candidates and {i} intersection candidates.'),{z:zeros.length,i:inters.length}));
        }

        function candidateChoices() {
          return (d._zeros||[]).map(function(row,i){return {id:'zero-'+i,point:row,label:gcFill(__alloT('stem.graphcalc.cand_zero','Zero {n} at x ≈ {x}'),{n:i+1,x:Number(row.x.toPrecision(8))})};}).concat((d._intersections||[]).map(function(row,i){return {id:'intersection-'+i,point:row,comparison:row.f2,label:gcFill(__alloT('stem.graphcalc.cand_cross','f1 and f{n} at x ≈ {x}'),{n:row.f2+1,x:Number(row.x.toPrecision(8))})};}));
        }
        function selectedEvidence(choice) {
          if(!choice||!d._analysisContext||!window.math)return null;
          try{
            var source=d._analysisContext,first=math.compile(gcCleanExpr(source.expressions[0]));
            var other=choice.comparison!=null?math.compile(gcCleanExpr(source.expressions[choice.comparison])):null;
            function evaluate(compiled,x){return compiled.evaluate(Object.assign({},source.parameters,{x:x}));}
            var evidence=gcCandidateEvidence(function(x){return evaluate(first,x);},choice.point.x,d._analysis.step,source.interval[0],source.interval[1],other?function(x){return evaluate(other,x);}:null);
            evidence.label=choice.label;evidence.comparison=other?'f'+(choice.comparison+1):null;return evidence;
          }catch(e){return {label:choice.label,error:__alloT('stem.graphcalc.cand_eval_error','Nearby values could not be evaluated. Check the expression and domain.'),rows:[]};}
        }
        // Analysis and inspector text through literal keys; stored results keep codes, not words.
        function gcAnalysisError(rep) {
          var codes = { loading: __alloT('stem.graphcalc.analysis_loading', 'The math engine is still loading. Try Analyze again.'), empty: __alloT('stem.graphcalc.analysis_empty', 'Enter a function in the first row.'), parse: __alloT('stem.graphcalc.analysis_parse', 'The first function could not be parsed. Check its expression.'), interval: __alloT('stem.graphcalc.analysis_interval', 'Choose a finite increasing x interval.') };
          return rep && rep.errorCode && codes[rep.errorCode] ? codes[rep.errorCode] : (rep && rep.error) || '';
        }
        function gcMethodName(m) {
          return m === 'sign change' ? __alloT('stem.graphcalc.method_sign_change', 'sign change') : m === 'touching-root candidate' ? __alloT('stem.graphcalc.method_touching', 'touching-root candidate') : m === 'sample zero' ? __alloT('stem.graphcalc.method_sample_zero', 'sample zero') : m === 'window edge' ? __alloT('stem.graphcalc.method_window_edge', 'window edge') : String(m || '');
        }
        function gcPositionName(p) {
          return p === 'Left of candidate' ? __alloT('stem.graphcalc.pos_left', 'Left of candidate') : p === 'Right of candidate' ? __alloT('stem.graphcalc.pos_right', 'Right of candidate') : p === 'At candidate' ? __alloT('stem.graphcalc.pos_at', 'At candidate') : String(p || '');
        }
        function renderCandidateInspector() {
          var choices=candidateChoices(),selected=choices.find(function(choice){return choice.id===d._analysisSelection;}),evidence=selectedEvidence(selected);
          var control={minHeight:44,width:'100%',marginTop:8,padding:8,borderRadius:6,border:'1px solid '+gcBorder,background:gcPanel,color:gcText,fontSize:12,whiteSpace:'normal'};
          var unavailable=__alloT('stem.graphcalc.unavailable','Unavailable');
          function number(value){return typeof value==='number'&&Number.isFinite(value)?Number(value.toPrecision(10)).toString():unavailable;}
          return h('section',{'data-candidate-inspector':true,style:{marginTop:12,fontSize:12,lineHeight:1.6,overflowWrap:'anywhere'}},
            h('h3',{style:{fontSize:14,fontWeight:'bold'}},__alloT('stem.graphcalc.inspect_title','Inspect numerical evidence')),
            h('p',null,__alloT('stem.graphcalc.inspect_intro','Compare nearby values at two distances. Opposite signs may suggest a crossing; matching signs can occur at a touching root. Neither pattern proves a root or continuity.')),
            !d._analysisContext?h('p',null,__alloT('stem.graphcalc.inspect_rerun','Run Analyze again to record the inputs for inspection and export.')):null,
            choices.length?h('label',null,__alloT('stem.graphcalc.inspect_pick','Candidate to inspect'),h('select',{value:selected?selected.id:'',onChange:function(e){upd('_analysisSelection',e.target.value);},style:control},h('option',{value:''},__alloT('stem.graphcalc.inspect_choose','Choose a candidate')),choices.map(function(choice){return h('option',{key:choice.id,value:choice.id},choice.label);}))) : h('p',null,__alloT('stem.graphcalc.inspect_none','No isolated candidates to inspect. Try a different interval or function.')),
            evidence?h('div',{'data-candidate-values':true},
              h('p',null,gcFill(__alloT('stem.graphcalc.inspect_probe','Probe distance: {d}. Also checking one tenth of this distance.'),{d:number(evidence.step)})),
              evidence.error?h('p',{role:'status'},evidence.error):null,
              evidence.complete===false?h('p',null,__alloT('stem.graphcalc.inspect_coincide','Some probe positions coincide at the interval boundary or at machine precision.')):null,
              evidence.finite===false?h('p',null,__alloT('stem.graphcalc.inspect_domain','Some values are unavailable in the real domain. Inspect the domain before interpreting the sign pattern.')):null,
              h('ul',{style:{paddingLeft:16}},(evidence.rows||[]).map(function(row,i){return h('li',{key:i,style:{marginBottom:8}},h('strong',null,gcPositionName(row.position)+': x = '+number(row.x)),h('div',null,'f1(x) = '+number(row.first)),evidence.comparison?h('div',null,evidence.comparison+'(x) = '+number(row.second)+'; f1 − '+evidence.comparison+' = '+number(row.difference)):null);})),
              h('button',{type:'button',style:control,onClick:function(){updMulti({traceMode:true,traceX:selected.point.x});if(announceToSR)announceToSR(gcFill(__alloT('stem.graphcalc.inspect_traced','Trace moved to {label}.'),{label:selected.label}));}},__alloT('stem.graphcalc.inspect_trace','Trace selected candidate'))):null,
            h('button',{type:'button',style:control,disabled:!d._analysisContext,onClick:function(){
              var text=gcAnalysisMarkdown(d._analysisContext,d._zeros,d._intersections,d._analysis,evidence),url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');
              a.href=url;a.download='graphcalc-numerical-evidence.md';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
              if(announceToSR)announceToSR(__alloT('stem.graphcalc.inspect_exported','Numerical evidence exported.'));
            }},__alloT('stem.graphcalc.inspect_export','Export numerical evidence')));
        }

        /* ── AI Tutor ── */
        function handleAiQuestion(question) {
          if (!question || !callGemini) return;
          SOUNDS.aiTutor();
          var msgs = aiMessages.concat([{ role: 'user', text: question }]);
          updMulti({ aiMessages: msgs, aiInput: '', aiLoading: true });
          var funcList = funcs.filter(function(f) { return f.expr && f.expr.trim(); }).map(function(f, i) { return 'y' + (i + 1) + '=' + f.expr; }).join(', ');
          var prompt = 'You are a friendly math tutor for grade ' + (gradeLevel || 8) + '. '
            + 'They are using a graphing calculator (' + tier + ' tier). '
            + (funcList ? 'Graphed: ' + funcList + '. ' : '')
            + 'Answer in 2-3 sentences. Question: ' + question;
          callGemini(prompt, true, false, 0.8).then(function(reply) {
            updMulti({ aiMessages: msgs.concat([{ role: 'ai', text: reply }]), aiLoading: false, aiQuestions: (d.aiQuestions || 0) + 1 });
          }).catch(function() {
            updMulti({ aiMessages: msgs.concat([{ role: 'ai', text: __alloT('stem.graphcalc.sorry_i_could_not_get_an_answer_right_', 'Sorry, I could not get an answer right now.') }]), aiLoading: false });
          });
        }

        // Use the same estimate for the canvas and its readable explanation.
        var tangentEstimate = { y: NaN, slope: NaN };
        if (d.showDeriv && window.math && funcs[0] && funcs[0].expr) {
          try {
            var tangentCompiled = window.math.compile(gcCleanExpr(funcs[0].expr));
            var tangentScope = { x: derivX };
            if (d.sliderA != null) tangentScope.a = d.sliderA;
            if (d.sliderB != null) tangentScope.b = d.sliderB;
            if (d.sliderC != null) tangentScope.c = d.sliderC;
            var tangentY = tangentCompiled.evaluate(tangentScope), tangentH = 0.0001;
            var slopeRight = (tangentCompiled.evaluate(Object.assign({}, tangentScope, { x: derivX + tangentH })) - tangentY) / tangentH;
            var slopeLeft = (tangentY - tangentCompiled.evaluate(Object.assign({}, tangentScope, { x: derivX - tangentH }))) / tangentH;
            tangentEstimate.y = tangentY;
            if (Number.isFinite(tangentY) && Number.isFinite(slopeLeft) && Number.isFinite(slopeRight) && Math.abs(slopeLeft - slopeRight) <= 0.01 * Math.max(1, Math.abs(slopeLeft), Math.abs(slopeRight))) tangentEstimate.slope = (slopeLeft + slopeRight) / 2;
          } catch (e) { /* The readout explains unavailable estimates. */ }
        }

        /* ── Describe and Hear (shared _graphAccess core): the selected function ── */
        var GA = window.StemLab && window.StemLab._graphAccess;
        // Canvas colours cannot read CSS var(); pick the literal palette for the app theme.
        var gcTheme = ctx.isContrast ? 'contrast' : ctx.isDark ? 'dark' : 'light';
        var gcPal = GA ? GA.palette(gcTheme) : null;
        function gcCurveStyle(i) { return gcPal ? gcPal.curve(i) : { color: (funcs[i] && funcs[i].color) || '#38bdf8', dash: [] }; }
        var gaRows = [];
        funcs.forEach(function(fn, i) { if (fn && typeof fn.expr === 'string' && fn.expr.trim()) gaRows.push(i); });
        var gaFn = gaRows.indexOf(d._gaFn) >= 0 ? d._gaFn : (gaRows.indexOf(focusedInput) >= 0 ? focusedInput : (gaRows.length ? gaRows[0] : -1));
        function gcAccessFor(index) {
          if (!GA || index < 0 || !window.math) return null;
          var expr = funcs[index].expr;
          var key = JSON.stringify([expr, index, win.xmin, win.xmax, win.ymin, win.ymax, d.sliderA, d.sliderB, d.sliderC, __alloT('stem.graph_access.graph_of', 'Graph of {name}.')]);
          if (_gcAccessCache.key === key) return _gcAccessCache.value;
          var compiled;
          try { compiled = window.math.compile(gcCleanExpr(expr)); } catch (e) { return null; }
          var scope = {};
          if (d.sliderA != null) scope.a = d.sliderA;
          if (d.sliderB != null) scope.b = d.sliderB;
          if (d.sliderC != null) scope.c = d.sliderC;
          var evaluate = function(x) { var v = compiled.evaluate(Object.assign({}, scope, { x: x })); return typeof v === 'number' ? v : NaN; };
          // Zeros come from the calculator's own scanner (sign changes plus touching roots).
          var zeroXs = GA.zerosOf(evaluate, win.xmin, win.xmax).xs;
          var samples = GA.sample(evaluate, win.xmin, win.xmax, 201);
          var desc = GA.describeGraph(samples, { t: __alloT, name: 'y' + (index + 1) + ' = ' + expr, evaluate: evaluate, zeros: zeroXs, ymin: win.ymin, ymax: win.ymax });
          var info = { index: index, expr: expr, evaluate: evaluate, samples: samples, zeros: zeroXs, desc: desc, points: GA.explorePoints(samples, desc, __alloT), match: GA.matchFamily(evaluate) };
          _gcAccessCache = { key: key, value: info };
          return info;
        }
        var gaInfo = gcAccessFor(gaFn);
        var gaIdx = gaInfo && typeof d._gaIdx === 'number' && d._gaIdx >= 0 && d._gaIdx < gaInfo.points.length ? d._gaIdx : -1;
        var gaPoint = gaIdx >= 0 ? gaInfo.points[gaIdx] : null;
        var FG_FAMILY_NAMES = { linear: __alloT('stem.graphcalc.family_linear', 'linear'), quadratic: __alloT('stem.graphcalc.family_quadratic', 'quadratic'), cubic: __alloT('stem.graphcalc.family_cubic', 'cubic'), trig: __alloT('stem.graphcalc.family_trig', 'sine wave'), exponential: __alloT('stem.graphcalc.family_exponential', 'exponential'), absolute: __alloT('stem.graphcalc.family_absolute', 'absolute value'), sqrt: __alloT('stem.graphcalc.family_sqrt', 'square root'), log: __alloT('stem.graphcalc.family_log', 'logarithm'), rational: __alloT('stem.graphcalc.family_rational', 'rational') };
        // Hand the matched family to Function Grapher: write its state, request the
        // plugin (activating a tool does not load it), then switch.
        function openFamilyLab(match) {
          if (!match) return;
          setLabToolData(function(prev) { return gcFamilyHandoff(prev, match); });
          try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') Promise.resolve(window.__alloEnsureStemPluginLoaded('funcGrapher')).catch(function() {}); } catch (e) {}
          if (announceToSR) announceToSR(gcFill(__alloT('stem.graphcalc.opening_family_lab', 'Opening Function Grapher with this {family} function.'), { family: FG_FAMILY_NAMES[match.type] || match.type }));
          if (typeof setStemLabTool === 'function') setStemLabTool('funcGrapher');
        }

        /* ── Stage B (shared core): rate of change, key features, inverse, piecewise, data ── */
        function gcObj(k) { var v = d[k]; return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
        function gcSet(k, patch) {
          setLabToolData(function(prev) {
            var cur = prev.graphCalc && prev.graphCalc[k], next = {};
            next[k] = Object.assign({}, cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}, patch);
            return Object.assign({}, prev, { graphCalc: Object.assign({}, prev.graphCalc, next) });
          });
        }
        var gcRoc = gcObj('roc'), gcKf = gcObj('kf'), gcInv = gcObj('inv'), gcPw = gcObj('pw'), gcData = gcObj('data');
        var gcSliderScope = {};
        if (d.sliderA != null) gcSliderScope.a = d.sliderA;
        if (d.sliderB != null) gcSliderScope.b = d.sliderB;
        if (d.sliderC != null) gcSliderScope.c = d.sliderC;
        function gcCompile(expr) {
          if (!window.math || typeof expr !== 'string' || !expr.trim()) return null;
          try { var cc = window.math.compile(gcCleanExpr(expr)); return function(x) { var v = cc.evaluate(Object.assign({}, gcSliderScope, { x: x })); return typeof v === 'number' ? v : NaN; }; } catch (e) { return null; }
        }
        // Rate of change on the selected function: A and B, dragged on the canvas or set by keys.
        var rocShow = !!gcRoc.on && !!gaInfo;
        var rocStep = GA ? GA.niceStep(win.xmax - win.xmin, 200, 1) : 0.1;
        function gcRocAt(v, frac) { return Number.isFinite(v) ? clampTo(v, win.xmin, win.xmax) : null; }
        var gcRocX1 = gcRocAt(gcRoc.x1); if (gcRocX1 === null) gcRocX1 = 1 >= win.xmin && 1 <= win.xmax ? 1 : Number((win.xmin + (win.xmax - win.xmin) * 0.4).toPrecision(3));
        var gcRocX2 = gcRocAt(gcRoc.x2); if (gcRocX2 === null) gcRocX2 = 3 >= win.xmin && 3 <= win.xmax ? 3 : Number((win.xmin + (win.xmax - win.xmin) * 0.6).toPrecision(3));
        var gcRocPts = rocShow ? GA.rateOfChange(gaInfo.evaluate, gcRocX1, gcRocX2) : null;
        var gcRocKey = gaInfo ? JSON.stringify([gaInfo.expr, d.sliderA, d.sliderB, d.sliderC, gcRocX1, gcRocX2]) : '';
        function gcRocCorrect(key) {
          var paid = Array.isArray(gcRoc.paid) ? gcRoc.paid : [];
          if (paid.indexOf(key) >= 0) return;
          gcSet('roc', { paid: paid.concat([key]).slice(-40) });
          if (paid.length < 10 && awardStemXP) awardStemXP('graphCalc', 3, 'Rate of change calculated');
        }
        function gcRocPointer(px) {
          var x = clampTo(Math.round(px / rocStep) * rocStep, win.xmin, win.xmax);
          x = Number(x.toPrecision(10));
          if (!_gcRocDrag) _gcRocDrag = Math.abs(x - gcRocX1) <= Math.abs(x - gcRocX2) ? 'x1' : 'x2';
          var p = {}; p[_gcRocDrag] = x; gcSet('roc', p);
        }
        // Key features: exact when the rule matches one of Function Grapher's families, else read from this window.
        var gcKfInfo = gcKf.on && gaInfo && GA ? (gaInfo.match ? GA.familyFeatures(gaInfo.match.type, gaInfo.match.a, gaInfo.match.b, gaInfo.match.c) : GA.windowFeatures(gaInfo.desc.features, gaInfo.evaluate)) : null;
        // Inverse: reflection across y = x and a horizontal-line test, with the verdict from the analysis.
        var gcInvInfo = gcInv.on && gaInfo && GA ? gcInverseCheck(GA, gaInfo.evaluate, win) : null;
        var gcHlY = gcInvInfo ? (Number.isFinite(gcInv.hlY) ? clampTo(gcInv.hlY, win.ymin, win.ymax) : (Number.isFinite(gcInvInfo.level) ? clampTo(gcInvInfo.level, win.ymin, win.ymax) : clampTo(0, win.ymin, win.ymax))) : 0;
        var gcHlXs = gcInvInfo ? (GA.zerosOf(function(x) { return gaInfo.evaluate(x) - gcHlY; }, win.xmin, win.xmax).xs || null) : [];
        // Piecewise rule (up to four pieces) and data with least-squares fits.
        var gcPieces = Array.isArray(gcPw.pieces) && gcPw.pieces.length ? gcPw.pieces.slice(0, 4) : [{ expr: 'x + 1', lo: '', hi: '1', loC: false, hiC: false }, { expr: '3 - x', lo: '1', hi: '', loC: true, hiC: false }];
        var gcPwPlan = gcPw.on ? gcPiecewise(gcPieces, gcCompile, win) : null;
        var gcDataParsed = gcData.on ? gcParseData(typeof gcData.text === 'string' ? gcData.text : '') : null;
        var gcFitKind = ['linear', 'quadratic', 'exponential'].indexOf(gcData.fit) >= 0 ? gcData.fit : 'none';
        var gcFitResult = gcDataParsed && gcFitKind !== 'none' ? gcFit(gcDataParsed.points, gcFitKind) : null;

        /* ── Challenge checks, from the graphed state ── */
        var gcRowEvaluators = null;
        function gcRowsDrawing(target) {
          if (!window.math) return [];
          if (!gcRowEvaluators) {
            var rowScope = {};
            if (d.sliderA != null) rowScope.a = d.sliderA;
            if (d.sliderB != null) rowScope.b = d.sliderB;
            if (d.sliderC != null) rowScope.c = d.sliderC;
            gcRowEvaluators = funcs.map(function(fn) {
              if (!fn || typeof fn.expr !== 'string' || !fn.expr.trim()) return null;
              try { var cc = window.math.compile(gcCleanExpr(fn.expr)); return function(x) { var v = cc.evaluate(Object.assign({}, rowScope, { x: x })); return typeof v === 'number' ? v : NaN; }; } catch (e) { return null; }
            });
          }
          var rows = [];
          gcRowEvaluators.forEach(function(ev, i) { if (ev && gcSameCurve(ev, target)) rows.push(i); });
          return rows;
        }
        function challengeStatus(pid) {
          var chk = CHALLENGE_CHECKS[pid];
          if (!chk) return { reqs: [], done: false };
          var reqs = chk.reqs.map(function(r) {
            if (r.kind === 'graph') return { label: gcFill(__alloT('stem.graphcalc.req_graph', 'Graph y = {expr}'), { expr: r.expr }), met: gcRowsDrawing(r.f).length > 0 };
            if (r.kind === 'first') return { label: gcFill(__alloT('stem.graphcalc.req_first', 'Graph y = {expr} in row y1'), { expr: r.expr }), met: gcRowsDrawing(r.f).indexOf(0) >= 0 };
            if (r.kind === 'table') return { label: __alloT('stem.graphcalc.req_table', 'Open the table'), met: !!d.showTable };
            if (r.kind === 'zeros') return { label: __alloT('stem.graphcalc.req_zeros', 'Press Analyze to find the zeros'), met: analysisCurrent && r.xs.every(function(zx) { return (d._zeros || []).some(function(z) { return z && Math.abs(z.x - zx) < 1e-3; }); }) };
            if (r.kind === 'cross') return { label: __alloT('stem.graphcalc.req_cross', 'Put one of the lines in row y1, then press Analyze to find where they cross'), met: analysisCurrent && (d._intersections || []).some(function(p) { return p && Math.abs(p.x - r.x) < 1e-3 && Math.abs(p.y - r.y) < 1e-3; }) };
            var z = ZOOM_PRESETS[r.preset];
            return { label: gcFill(__alloT('stem.graphcalc.req_window', 'Use the {name} zoom preset'), { name: z.name }), met: Math.abs(win.xmin - z.xmin) < 0.01 && Math.abs(win.xmax - z.xmax) < 0.01 && Math.abs(win.ymin - z.ymin) < 0.01 && Math.abs(win.ymax - z.ymax) < 0.01 };
          });
          return { reqs: reqs, done: reqs.length > 0 && reqs.every(function(r) { return r.met; }) };
        }
        // XP is paid once per challenge, and only when the graph shows the work.
        function checkChallenge(pid, ch, pred) {
          var doneList = Array.isArray(d._challengesDone) ? d._challengesDone : [];
          var chk = CHALLENGE_CHECKS[pid];
          var msg;
          if (doneList.indexOf(pid) !== -1) { msg = __alloT('stem.graphcalc.challenge_already_counted', 'This challenge is already counted. Try a different one.'); }
          else if (chk && chk.predict && !pred) { msg = __alloT('stem.graphcalc.challenge_predict_first', 'Make a prediction first, then graph it.'); }
          else {
            var status = challengeStatus(pid);
            if (!status.done) msg = gcFill(__alloT('stem.graphcalc.challenge_not_yet', 'Not yet. Still to do: {list}.'), { list: status.reqs.filter(function(r) { return !r.met; }).map(function(r) { return r.label; }).join('; ') });
            else {
              SOUNDS.quizCorrect();
              msg = __alloT('stem.graphcalc.challenge_verified', 'Checked against your graph: challenge complete! +5 XP');
              updMulti({ _challengesCompleted: (d._challengesCompleted || 0) + 1, _challengesDone: doneList.concat([pid]), _challengeMsg: msg, _challengeMsgFor: pid });
              if (addToast) addToast('✅ ' + msg, 'success');
              if (awardStemXP) awardStemXP('graphCalc', 5, 'Graphing challenge');
              if (announceToSR) announceToSR(msg);
              return;
            }
          }
          updMulti({ _challengeMsg: msg, _challengeMsgFor: pid });
          if (announceToSR) announceToSR(msg);
        }

        /* ── Canvas (callback ref, no useEffect) ── */
        var canvasRef = function(canvas) {
          if (!canvas || !window.math) return;
          var c = canvas.getContext('2d');
          var dpr = window.devicePixelRatio || 1;
          var W = canvas.offsetWidth || 600;
          var H = canvas.offsetHeight || 420;
          canvas.width = W * dpr; canvas.height = H * dpr; c.scale(dpr, dpr);

          function toPixelX(mx) { return (mx - win.xmin) / ((win.xmax - win.xmin) || 1) * W; }
          function toPixelY(my) { return H - (my - win.ymin) / ((win.ymax - win.ymin) || 1) * H; }
          function toMathX(px) { return win.xmin + px / W * (win.xmax - win.xmin); }
          canvas._toMathX = toMathX;

          // Literal theme colours (canvas cannot resolve CSS var()): light canvas in the light app theme.
          var P = gcPal || { theme: 'dark', bg: '#0f172a', grid: '#3a4a61', axis: '#94a3b8', label: '#e2e8f0', muted: '#cbd5e1' };
          c.fillStyle = P.bg; c.fillRect(0, 0, W, H);

          // Grid: visible lines, 12 px labels spaced so they never collide.
          var xRange = win.xmax - win.xmin; var yRange = win.ymax - win.ymin;
          function gcStep(range, px, minPx) { return GA ? GA.niceStep(range, px, minPx) : Math.pow(10, Math.floor(Math.log10(range / 5))); }
          var xStep = gcStep(xRange, W, 24), yStep = gcStep(yRange, H, 24);
          var xLabelStep = gcStep(xRange, W, 56), yLabelStep = gcStep(yRange, H, 30);
          function onStep(v, s) { var q = v / s; return Math.abs(q - Math.round(q)) < 1e-6; }
          c.strokeStyle = P.grid; c.lineWidth = 1;
          for (var gx = Math.ceil(win.xmin / xStep) * xStep; gx <= win.xmax; gx += xStep) {
            var gpx = toPixelX(gx); c.beginPath(); c.moveTo(gpx, 0); c.lineTo(gpx, H); c.stroke();
            if (Math.abs(gx) > xStep * 0.01 && onStep(gx, xLabelStep)) { c.fillStyle = P.label; c.font = '12px system-ui'; c.textAlign = 'center'; c.fillText(Number(gx.toPrecision(6)), gpx, Math.min(Math.max(toPixelY(0) + 16, 14), H - 6)); }
          }
          for (var gy = Math.ceil(win.ymin / yStep) * yStep; gy <= win.ymax; gy += yStep) {
            var gpy = toPixelY(gy); c.beginPath(); c.moveTo(0, gpy); c.lineTo(W, gpy); c.stroke();
            if (Math.abs(gy) > yStep * 0.01 && onStep(gy, yLabelStep)) { c.fillStyle = P.label; c.font = '12px system-ui'; c.textAlign = 'right'; c.fillText(Number(gy.toPrecision(6)), Math.min(Math.max(toPixelX(0) - 5, 36), W - 4), gpy + 4); }
          }

          // Axes
          c.strokeStyle = P.axis; c.lineWidth = 2;
          var ax = toPixelY(0); if (ax >= 0 && ax <= H) { c.beginPath(); c.moveTo(0, ax); c.lineTo(W, ax); c.stroke(); }
          var ay = toPixelX(0); if (ay >= 0 && ay <= W) { c.beginPath(); c.moveTo(ay, 0); c.lineTo(ay, H); c.stroke(); }

          // Graph functions
          var graphCount = 0; var usedTrig = false;
          var sA = {};
          if (d.sliderA != null) sA.a = d.sliderA; if (d.sliderB != null) sA.b = d.sliderB; if (d.sliderC != null) sA.c = d.sliderC;
          funcs.forEach(function(fn, fi) {
            if (!fn.expr || !fn.expr.trim()) return;
            try {
              var expr = gcCleanExpr(fn.expr);
              if (/sin|cos|tan/.test(expr)) usedTrig = true;
              var compiled = math.compile(expr);
              // Each row has its own colour AND dash pattern, so colour is never the only cue.
              var cs = gcCurveStyle(fi);
              c.strokeStyle = cs.color; c.lineWidth = 3; c.setLineDash(cs.dash); c.lineCap = 'round'; c.shadowColor = cs.color; c.shadowBlur = P.theme === 'dark' ? 6 : 0; c.beginPath();
              var started = false; var plotStep = xRange / W; var prevPpy = null;
              for (var mx = win.xmin; mx <= win.xmax; mx += plotStep) {
                try {
                  var my = compiled.evaluate(Object.assign({ x: mx }, sA));
                  if (typeof my === 'number' && isFinite(my) && my >= win.ymin - yRange && my <= win.ymax + yRange) {
                    var ppx = toPixelX(mx); var ppy = toPixelY(my);
                    // Lift the pen at a discontinuity: a >1-canvas-height jump between samples is an
                    // asymptote (tan x, 1/x) — drawing a lineTo across it produced a spurious vertical line.
                    if (!started || (prevPpy !== null && Math.abs(ppy - prevPpy) > H)) { c.moveTo(ppx, ppy); started = true; } else c.lineTo(ppx, ppy);
                    prevPpy = ppy;
                  } else { started = false; prevPpy = null; }
                } catch (e) { started = false; prevPpy = null; }
              }
              c.stroke(); c.shadowBlur = 0; c.setLineDash([]); graphCount++;
              c.fillStyle = cs.color; c.font = 'bold 12px system-ui'; c.textAlign = 'left';
              c.fillText('y' + (fi + 1) + ' = ' + fn.expr, 8, 18 + fi * 18);
            } catch (e) { /* invalid */ }
          });

          function onCanvas(x, y) { return isFinite(x) && isFinite(y) && x >= win.xmin && x <= win.xmax && y >= win.ymin - yRange && y <= win.ymax + yRange; }
          function strokeRun(pts, toX, toY) {
            var open = false, prev = null;
            c.beginPath();
            pts.forEach(function(p) {
              if (!p || !onCanvas(p.x, p.y)) { open = false; prev = null; return; }
              var px = toX(p), py = toY(p);
              if (!open || (prev !== null && Math.abs(py - prev) > H)) { c.moveTo(px, py); open = true; } else c.lineTo(px, py);
              prev = py;
            });
            c.stroke();
          }
          // Piecewise rule: each piece on its interval; a filled dot includes its endpoint, a hollow dot leaves it out.
          if (gcPwPlan) {
            var pwStyle = gcCurveStyle(4);
            c.strokeStyle = pwStyle.color; c.lineWidth = 3; c.setLineDash([]);
            gcPwPlan.pieces.forEach(function(pc) { strokeRun(pc.points, function(p) { return toPixelX(p.x); }, function(p) { return toPixelY(p.y); }); });
            gcPwPlan.dots.forEach(function(dot) {
              if (dot.y < win.ymin || dot.y > win.ymax) return;
              c.beginPath(); c.arc(toPixelX(dot.x), toPixelY(dot.y), 6, 0, Math.PI * 2);
              c.fillStyle = dot.closed ? pwStyle.color : P.bg; c.fill();
              c.strokeStyle = pwStyle.color; c.lineWidth = 2.5; c.stroke();
            });
          }
          // Data: square markers, the fitted curve (dashed) and, on request, residual segments.
          if (gcDataParsed && gcDataParsed.points.length) {
            var dataInk = P.theme === 'contrast' ? '#00ffff' : P.theme === 'dark' ? '#5eead4' : '#0f766e';
            if (gcFitResult && gcFitResult.predict) {
              var fitPts = [];
              for (var fx = 0; fx <= 300; fx++) { var fxv = win.xmin + (win.xmax - win.xmin) * fx / 300; fitPts.push({ x: fxv, y: gcFitResult.predict(fxv) }); }
              c.strokeStyle = dataInk; c.lineWidth = 2.5; c.setLineDash([8, 5]);
              strokeRun(fitPts, function(p) { return toPixelX(p.x); }, function(p) { return toPixelY(p.y); });
              c.setLineDash([]);
              if (gcData.resid) gcFitResult.residuals.forEach(function(r) {
                if (!onCanvas(r.x, r.y) || !isFinite(r.fit)) return;
                c.strokeStyle = P.muted; c.lineWidth = 1.5; c.beginPath(); c.moveTo(toPixelX(r.x), toPixelY(r.y)); c.lineTo(toPixelX(r.x), toPixelY(r.fit)); c.stroke();
              });
            }
            gcDataParsed.points.forEach(function(pt) {
              if (pt.x < win.xmin || pt.x > win.xmax || pt.y < win.ymin || pt.y > win.ymax) return;
              c.fillStyle = dataInk; c.fillRect(toPixelX(pt.x) - 4, toPixelY(pt.y) - 4, 8, 8);
              c.strokeStyle = P.label; c.lineWidth = 1; c.strokeRect(toPixelX(pt.x) - 4, toPixelY(pt.y) - 4, 8, 8);
            });
          }
          // Inverse: the line y = x, the reflection (x, y) -> (y, x), and the horizontal-line test.
          if (gcInvInfo && gaInfo) {
            c.strokeStyle = P.muted; c.lineWidth = 1.5; c.setLineDash([4, 6]); c.beginPath();
            var lo = Math.max(win.xmin, win.ymin), hi = Math.min(win.xmax, win.ymax);
            if (hi > lo) { c.moveTo(toPixelX(lo), toPixelY(lo)); c.lineTo(toPixelX(hi), toPixelY(hi)); c.stroke(); }
            var refl = gcCurveStyle(gaInfo.index === 2 ? 3 : 2);
            c.strokeStyle = refl.color; c.lineWidth = 2.5; c.setLineDash([2, 5]);
            var reflPts = GA.sample(gaInfo.evaluate, win.xmin, win.xmax, 801).map(function(p) { return p.y === null || p.y < win.xmin || p.y > win.xmax || p.x < win.ymin || p.x > win.ymax ? null : { x: p.y, y: p.x }; });
            strokeRun(reflPts, function(p) { return toPixelX(p.x); }, function(p) { return toPixelY(p.y); });
            c.setLineDash([10, 4]); c.strokeStyle = P.label; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, toPixelY(gcHlY)); c.lineTo(W, toPixelY(gcHlY)); c.stroke(); c.setLineDash([]);
            (gcHlXs || []).forEach(function(hx) { c.beginPath(); c.arc(toPixelX(hx), toPixelY(gcHlY), 6, 0, Math.PI * 2); c.fillStyle = P.label; c.fill(); });
          }

          // Zeros & intersections markers
          if (analysisCurrent && d._zeros) d._zeros.forEach(function(z) {
            var zx = toPixelX(z.x); var zy = toPixelY(0);
            c.save(); c.shadowColor = '#34d399'; c.shadowBlur = P.theme === 'dark' ? 8 : 0; c.beginPath(); c.arc(zx, zy, 6, 0, Math.PI * 2); c.fillStyle = '#34d399'; c.fill(); c.restore(); c.strokeStyle = P.label; c.lineWidth = 2; c.stroke();
            c.fillStyle = P.label; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('x=' + Number(z.x.toPrecision(4)), zx, zy - 12);
          });
          if (analysisCurrent && d._intersections) d._intersections.forEach(function(pt) {
            var ipx = toPixelX(pt.x); var ipy = toPixelY(pt.y);
            c.beginPath(); c.arc(ipx, ipy, 6, 0, Math.PI * 2); c.fillStyle = '#f472b6'; c.fill(); c.strokeStyle = P.label; c.lineWidth = 2; c.stroke();
            c.fillStyle = P.label; c.font = 'bold 12px system-ui'; c.textAlign = 'center'; c.fillText('(' + Number(pt.x.toPrecision(3)) + ',' + Number(pt.y.toPrecision(3)) + ')', ipx, ipy - 12);
          });

          // Derivative tangent
          if (d.showDeriv && funcs[0] && funcs[0].expr) {
            try {
              var dx = derivX, yAtX = tangentEstimate.y, slope = tangentEstimate.slope;
              if (typeof slope === 'number' && isFinite(slope)) {
                var tanInk = P.theme === 'light' ? '#c2410c' : '#fb923c';
                c.strokeStyle = tanInk; c.lineWidth = 2.5; c.setLineDash([6, 3]); c.beginPath();
                c.moveTo(toPixelX(win.xmin), toPixelY(yAtX + slope * (win.xmin - dx)));
                c.lineTo(toPixelX(win.xmax), toPixelY(yAtX + slope * (win.xmax - dx)));
                c.stroke(); c.setLineDash([]);
                c.beginPath(); c.arc(toPixelX(dx), toPixelY(yAtX), 6, 0, Math.PI * 2);
                c.fillStyle = tanInk; c.fill(); c.strokeStyle = P.label; c.lineWidth = 2; c.stroke();
              }
            } catch (e) { /* skip */ }
          }

          // Trace crosshair
          if (d.traceMode) {
            var trX = toPixelX(traceX);
            c.strokeStyle = P.muted; c.lineWidth = 1.5; c.setLineDash([3, 3]);
            c.beginPath(); c.moveTo(trX, 0); c.lineTo(trX, H); c.stroke(); c.setLineDash([]);
            c.font = 'bold 12px monospace';
            funcs.forEach(function(fn, fi) {
              if (!fn.expr || !fn.expr.trim()) return;
              try {
                var trY = math.compile(gcCleanExpr(fn.expr)).evaluate(Object.assign({ x: traceX }, sA));
                if (typeof trY === 'number' && isFinite(trY)) {
                  c.beginPath(); c.arc(trX, toPixelY(trY), 5, 0, Math.PI * 2); c.fillStyle = gcCurveStyle(fi).color; c.fill();
                  c.fillStyle = P.label; c.textAlign = 'left';
                  c.fillText('(' + Number(traceX.toPrecision(4)) + ', ' + Number(trY.toPrecision(4)) + ')', trX + 8, toPixelY(trY) - 6);
                }
              } catch (e) { /* skip */ }
            });
          }

          // Keyboard explorer position (Describe and Hear panel)
          if (gaPoint && gaPoint.y !== null) {
            var exX = toPixelX(gaPoint.x), exY = toPixelY(gaPoint.y);
            c.strokeStyle = P.muted; c.lineWidth = 1.5; c.setLineDash([4, 4]);
            c.beginPath(); c.moveTo(exX, 0); c.lineTo(exX, H); c.stroke(); c.setLineDash([]);
            c.beginPath(); c.arc(exX, exY, 8, 0, Math.PI * 2); c.strokeStyle = P.label; c.lineWidth = 3; c.stroke();
          }

          // Rate of change: A and B, the dashed secant and its slope triangle with Δx and Δy.
          if (gcRocPts && gcRocPts.dy !== null) {
            var rInk = gcCurveStyle(gaInfo.index === 4 ? 1 : 4).color;
            var rax = toPixelX(gcRocPts.x1), ray = toPixelY(gcRocPts.y1), rbx = toPixelX(gcRocPts.x2), rby = toPixelY(gcRocPts.y2);
            c.strokeStyle = rInk; c.lineWidth = 2.5; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(rax, ray); c.lineTo(rbx, rby); c.stroke(); c.setLineDash([]);
            c.lineWidth = 2; c.beginPath(); c.moveTo(rax, ray); c.lineTo(rbx, ray); c.lineTo(rbx, rby); c.stroke();
            c.fillStyle = P.label; c.font = 'bold 12px system-ui'; c.textAlign = 'center';
            c.fillText('Δx = ' + GA.formatNumber(gcRocPts.dx), (rax + rbx) / 2, ray + (rby < ray ? 16 : -6));
            c.textAlign = rbx > W - 90 ? 'right' : 'left';
            c.fillText('Δy = ' + GA.formatNumber(gcRocPts.dy), rbx + (rbx > W - 90 ? -8 : 8), (ray + rby) / 2 + 4);
            [['A', rax, ray], ['B', rbx, rby]].forEach(function(pt) {
              c.beginPath(); c.arc(pt[1], pt[2], 7, 0, Math.PI * 2); c.fillStyle = P.bg; c.fill(); c.strokeStyle = rInk; c.lineWidth = 3; c.stroke();
              c.fillStyle = P.label; c.textAlign = 'center'; c.fillText(pt[0], pt[1], pt[2] - 12);
            });
          }

          // Window info
          c.fillStyle = P.muted; c.font = '12px system-ui'; c.textAlign = 'right';
          c.fillText('[' + win.xmin + ', ' + win.xmax + '] x [' + win.ymin + ', ' + win.ymax + ']', W - 4, H - 4);

          // Track state. This ref is new each render, so React calls it on every
          // commit: write only a changed value, or each write re-renders and loops.
          if (graphCount > 0) {
            var trk = {};
            if ((d._graphsDrawn || 0) < graphCount) trk._graphsDrawn = graphCount;
            if (graphCount >= 3 && (d._multiGraphCount || 0) < graphCount) trk._multiGraphCount = graphCount;
            if (usedTrig && !d._usedTrig) trk._usedTrig = true;
            if (Object.keys(trk).length > 0) updMulti(trk);
          }
        };

        /* ── Snapshot ── */
        function takeSnapshot() {
          SOUNDS.snapshot();
          var fl = funcs.filter(function(f) { return f.expr; }).map(function(f) { return f.expr; }).join(', ');
          if (setToolSnapshots) setToolSnapshots(function(prev) { return prev.concat([{ id: 'gc-' + Date.now(), tool: 'graphCalc', label: fl || 'Empty', data: Object.assign({}, d), timestamp: Date.now() }]); });
          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
        }

        // Keep server-rendered/snapshotted markup legible even when the
        // runtime-injected token stylesheet is not present yet.
        var gcText = 'var(--gc-text, #f8fafc)';
        var gcMuted = 'var(--gc-muted, #cbd5e1)';
        var gcPanel = 'var(--gc-panel, #111827)';
        var gcDeeper = 'var(--gc-deeper, #0f172a)';
        var gcCard = 'var(--gc-card, #1e293b)';
        var gcCardStrong = 'var(--gc-card-strong, #312e81)';
        var gcBorder = 'var(--gc-border, #64748b)';
        var gcAccent = 'var(--gc-accent, #c7d2fe)';
        var gcAccentSoft = 'var(--gc-accent-soft, #312e81)';
        var gcAccentBorder = 'var(--gc-accent-border, #a5b4fc)';
        var gcButtonBg = 'var(--gc-button-bg, #1e293b)';
        var gcButtonText = 'var(--gc-button-text, #f8fafc)';
        var gcDanger = 'var(--gc-danger, #fecaca)';
        function gcButtonStyle(active, accent) {
          return {
            background: active ? gcAccentSoft : gcButtonBg,
            color: active ? (accent || gcAccent) : gcButtonText,
            border: '1px solid ' + (active ? (accent || gcAccentBorder) : gcBorder)
          };
        }
        var gaButton = Object.assign({ minHeight: 44, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%' }, gcButtonStyle(false));

        /* ── Stage B panels ── */
        var gcCoreStyles = {
          wrap: null, button: gaButton, text: { color: gcText, fontSize: 13 }, help: { color: gcMuted, fontSize: 12 },
          card: { border: '1px solid ' + gcBorder, background: gcCard, color: gcText },
          input: { padding: '6px 8px', borderRadius: 6, border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontSize: 13, boxSizing: 'border-box' }
        };
        var gcPanelWrap = { padding: '10px 12px', borderTop: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontSize: 13, overflowWrap: 'anywhere' };
        var gcPanelLine = { margin: '6px 0 0', color: gcText, fontSize: 13, lineHeight: 1.5 };
        var gcH3 = { margin: 0, fontSize: 16, fontWeight: 800, color: gcText };
        var gcSelName = gaInfo ? 'y' + (gaInfo.index + 1) + ' = ' + gaInfo.expr : '';
        var gcN = GA ? GA.formatNumber : function(v) { return String(v); };
        function gcNeedFunction() { return h('p', { style: gcPanelLine }, __alloT('stem.graphcalc.ga_enter_function', 'Enter a function to describe it, hear it, or explore it with keys.')); }
        function gcToggleButton(key, on, label) {
          return h('button', { type: 'button', 'data-graphcalc-panel': key, 'aria-pressed': !!on, onClick: function() { gcSet(key, { on: !on }); }, style: Object.assign({ flex: '1 0 45%', minHeight: 32, padding: '5px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!on)) }, label);
        }
        function gcRenderRate() {
          if (!gcRoc.on) return null;
          return h('div', { 'data-graphcalc-rate': true, style: gcPanelWrap },
            gaInfo ? GA.ratePanel(React, { id: 'graphcalc-rate', t: __alloT, evaluate: gaInfo.evaluate, name: gcSelName, key: gcRocKey, x1: gcRocX1, x2: gcRocX2, min: win.xmin, max: win.xmax, step: rocStep, state: gcRoc, onSet: function(p) { gcSet('roc', p); }, onCorrect: gcRocCorrect, announce: announceToSR, styles: gcCoreStyles }) : gcNeedFunction());
        }
        function gcRenderFeatures() {
          if (!gcKf.on) return null;
          return h('div', { 'data-graphcalc-features': true, style: gcPanelWrap },
            gaInfo && gaInfo.match ? h('p', { 'data-graphcalc-features-model': gaInfo.match.type, style: Object.assign({}, gcPanelLine, { marginTop: 0 }) }, gcFill(__alloT('stem.graphcalc.kf_model', '{name} is exactly a {family} function, so these features hold for the whole function, not just this window.'), { name: gcSelName, family: FG_FAMILY_NAMES[gaInfo.match.type] || gaInfo.match.type })) : null,
            gaInfo ? GA.featuresPanel(React, { id: 'graphcalc-features', t: __alloT, info: gcKfInfo, key: JSON.stringify([gaInfo.expr, d.sliderA, d.sliderB, d.sliderC, win.xmin, win.xmax]), state: gcKf, onSet: function(p) { gcSet('kf', p); }, announce: announceToSR, styles: gcCoreStyles }) : gcNeedFunction());
        }
        function gcRenderInverse() {
          if (!gcInv.on) return null;
          if (!gaInfo || !gcInvInfo) return h('div', { 'data-graphcalc-inverse': 'none', style: gcPanelWrap }, gcNeedFunction());
          var I = gcInvInfo, verdict;
          if (I.verdict === 'yes') verdict = gcFill(__alloT('stem.graphcalc.inv_yes', 'Passes the horizontal-line test in this window: no horizontal line meets {name} more than once, so it has an inverse function here. The dotted reflection across y = x is that inverse.'), { name: gcSelName });
          else if (I.verdict === 'empty') verdict = __alloT('stem.graphcalc.inv_empty', 'No part of this graph is in the window, so there is nothing to test.');
          else if (I.reason === 'flat') verdict = gcFill(__alloT('stem.graphcalc.inv_flat', 'Fails the horizontal-line test: the graph is flat at y = {y} from x = {from} to x = {to}, so many inputs share one output. It has no inverse function on this window.'), { y: gcN(I.level), from: gcN(I.from), to: gcN(I.to) });
          else verdict = gcFill(__alloT('stem.graphcalc.inv_no', 'Fails the horizontal-line test: the line y = {y} meets the graph at x = {xs}. Two inputs share one output, so the reflection is not a function. Restrict the domain to one increasing or decreasing stretch to get an inverse.'), { y: gcN(I.level), xs: (I.xs || []).map(gcN).join(', ') });
          if (I.reason === 'turn') verdict += ' ' + gcFill(__alloT('stem.graphcalc.inv_turn', 'It turns at ({x}, {y}).'), { x: gcN(I.turn.x), y: gcN(I.turn.y) });
          var hlText = gcHlXs === null ? gcFill(__alloT('stem.graphcalc.inv_hl_all', 'The line y = {y} lies along the graph.'), { y: gcN(gcHlY) })
            : !gcHlXs.length ? gcFill(__alloT('stem.graphcalc.inv_hl_none', 'The line y = {y} does not meet the graph in this window.'), { y: gcN(gcHlY) })
            : gcFill(gcHlXs.length === 1 ? __alloT('stem.graphcalc.inv_hl_one', 'The line y = {y} meets the graph once, at x = {xs}.') : __alloT('stem.graphcalc.inv_hl_many', 'The line y = {y} meets the graph {n} times: x = {xs}.'), { y: gcN(gcHlY), n: gcHlXs.length, xs: gcHlXs.map(gcN).join(', ') });
          return h('section', { 'data-graphcalc-inverse': I.verdict, 'aria-labelledby': 'graphcalc-inverse-title', style: gcPanelWrap },
            h('h3', { id: 'graphcalc-inverse-title', style: gcH3 }, __alloT('stem.graphcalc.inv_title', 'Inverse: reflect across y = x')),
            h('p', { style: gcPanelLine }, __alloT('stem.graphcalc.inv_intro', 'The dotted curve reflects the selected graph across the dashed line y = x: every point (x, y) moves to (y, x). The long-dashed horizontal line is the horizontal-line test.')),
            h('p', { 'data-graphcalc-inverse-verdict': true, style: Object.assign({}, gcPanelLine, { fontWeight: 700 }) }, verdict),
            h('label', { style: Object.assign({ display: 'block', fontWeight: 700 }, gcPanelLine) }, gcFill(__alloT('stem.graphcalc.inv_hl_label', 'Horizontal line y = {y}'), { y: gcN(gcHlY) }),
              h('input', { type: 'range', 'data-graphcalc-hl': true, min: win.ymin, max: win.ymax, step: GA.niceStep(win.ymax - win.ymin, 200, 1), value: gcHlY, 'aria-valuetext': hlText, onChange: function(e) { var v = Number(e.target.value); if (Number.isFinite(v)) gcSet('inv', { hlY: v }); }, style: { display: 'block', width: '100%', minHeight: 28, marginTop: 4 } })),
            h('p', { 'data-graphcalc-hl-result': true, role: 'status', style: gcPanelLine }, hlText));
        }
        function gcPieceCondition(pc) {
          if (pc.lo === -Infinity && pc.hi === Infinity) return __alloT('stem.graphcalc.pw_all', 'all x');
          if (pc.hi === Infinity) return 'x ' + (pc.loC ? '≥ ' : '> ') + gcN(pc.lo);
          if (pc.lo === -Infinity) return 'x ' + (pc.hiC ? '≤ ' : '< ') + gcN(pc.hi);
          return gcN(pc.lo) + (pc.loC ? ' ≤ ' : ' < ') + 'x' + (pc.hiC ? ' ≤ ' : ' < ') + gcN(pc.hi);
        }
        function gcRenderPiecewise() {
          if (!gcPw.on) return null;
          var plan = gcPwPlan;
          function setPiece(i, patch) { gcSet('pw', { pieces: gcPieces.map(function(p, k) { return k === i ? Object.assign({}, p, patch) : p; }) }); }
          var field = Object.assign({ display: 'block', width: '100%', minHeight: 36, marginTop: 4, fontFamily: 'monospace' }, gcCoreStyles.input);
          var desc = plan && plan.pieces.length && GA ? GA.describeGraph(GA.sample(plan.evaluate, win.xmin, win.xmax, 401), { t: __alloT, name: __alloT('stem.graphcalc.pw_name', 'the piecewise function'), evaluate: plan.evaluate, ymin: win.ymin, ymax: win.ymax }) : null;
          return h('section', { 'data-graphcalc-piecewise': true, 'aria-labelledby': 'graphcalc-pw-title', style: gcPanelWrap },
            h('h3', { id: 'graphcalc-pw-title', style: gcH3 }, __alloT('stem.graphcalc.pw_title', 'Piecewise function')),
            h('p', { style: gcPanelLine }, __alloT('stem.graphcalc.pw_intro', 'Each piece uses its rule only on its interval. Leave From or To empty for no limit. A filled dot includes that endpoint; a hollow dot leaves it out.')),
            gcPieces.map(function(p, i) {
              var n = i + 1;
              return h('fieldset', { key: i, 'data-graphcalc-piece': i, style: Object.assign({ borderRadius: 8, padding: '6px 8px', margin: '8px 0 0', minWidth: 0 }, gcCoreStyles.card) },
                h('legend', { style: { fontWeight: 700, padding: '0 4px', color: gcText } }, gcFill(__alloT('stem.graphcalc.pw_piece', 'Piece {n}'), { n: n })),
                h('label', { style: Object.assign({ display: 'block' }, gcPanelLine, { marginTop: 0 }) }, __alloT('stem.graphcalc.pw_rule', 'Rule: y ='), h('input', { type: 'text', value: typeof p.expr === 'string' ? p.expr : '', onChange: function(e) { setPiece(i, { expr: e.target.value.slice(0, 120) }); }, style: field })),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                  h('label', { style: Object.assign({ flex: '1 1 90px' }, gcPanelLine) }, __alloT('stem.graphcalc.pw_from', 'From x ='), h('input', { type: 'text', inputMode: 'decimal', value: p.lo == null ? '' : String(p.lo), onChange: function(e) { setPiece(i, { lo: e.target.value.slice(0, 20) }); }, style: field })),
                  h('label', { style: Object.assign({ flex: '1 1 90px' }, gcPanelLine) }, __alloT('stem.graphcalc.pw_to', 'To x ='), h('input', { type: 'text', inputMode: 'decimal', value: p.hi == null ? '' : String(p.hi), onChange: function(e) { setPiece(i, { hi: e.target.value.slice(0, 20) }); }, style: field }))),
                [['loC', __alloT('stem.graphcalc.pw_include_left', 'Include the left endpoint')], ['hiC', __alloT('stem.graphcalc.pw_include_right', 'Include the right endpoint')]].map(function(c) {
                  return h('label', { key: c[0], style: Object.assign({ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }, gcPanelLine) },
                    h('input', { type: 'checkbox', checked: !!p[c[0]], onChange: function(e) { var q = {}; q[c[0]] = e.target.checked; setPiece(i, q); }, style: { width: 22, height: 22, margin: 0, flexShrink: 0 } }), c[1]);
                }),
                plan && plan.errors.indexOf(i) >= 0 ? h('p', { role: 'status', style: gcPanelLine }, __alloT('stem.graphcalc.pw_bad_piece', 'Check this piece: the rule could not be read, or From is not less than To.')) : null,
                gcPieces.length > 1 ? h('button', { type: 'button', onClick: function() { gcSet('pw', { pieces: gcPieces.filter(function(q, k) { return k !== i; }) }); }, style: Object.assign({ marginTop: 6 }, gaButton) }, gcFill(__alloT('stem.graphcalc.pw_remove', 'Remove piece {n}'), { n: n })) : null);
            }),
            gcPieces.length < 4 ? h('button', { type: 'button', 'data-graphcalc-pw-add': true, onClick: function() { gcSet('pw', { pieces: gcPieces.concat([{ expr: '', lo: '', hi: '', loC: true, hiC: false }]) }); }, style: Object.assign({ marginTop: 8 }, gaButton) }, __alloT('stem.graphcalc.pw_add', 'Add a piece')) : null,
            plan && plan.pieces.length ? h('ul', { 'data-graphcalc-pw-desc': true, style: Object.assign({ paddingLeft: 20 }, gcPanelLine) }, plan.pieces.map(function(pc) {
              var dots = plan.dots.filter(function(dt) { return dt.piece === pc.index; }).map(function(dt) { return gcFill(dt.closed ? __alloT('stem.graphcalc.pw_dot_closed', 'a filled dot at ({x}, {y}): that point is included') : __alloT('stem.graphcalc.pw_dot_open', 'a hollow dot at ({x}, {y}): that point is left out'), { x: gcN(dt.x), y: gcN(dt.y) }); });
              return h('li', { key: pc.index, 'data-graphcalc-pw-piece': pc.index }, gcFill(__alloT('stem.graphcalc.pw_piece_desc', 'Piece {n}: y = {rule} when {cond}.'), { n: pc.index + 1, rule: pc.expr, cond: gcPieceCondition(pc) }) + (dots.length ? ' ' + dots.join('; ') + '.' : ''));
            })) : null,
            plan && plan.pieces.length ? h('p', { 'data-graphcalc-pw-function': plan.overlaps.length ? 'no' : 'yes', style: Object.assign({}, gcPanelLine, { fontWeight: 700 }) }, plan.overlaps.length
              ? gcFill(plan.overlaps[0].from === plan.overlaps[0].to ? __alloT('stem.graphcalc.pw_overlap_point', 'Not a function: x = {x} belongs to two pieces, so it would have two outputs.') : __alloT('stem.graphcalc.pw_overlap_range', 'Not a function: every x from {from} to {to} belongs to two pieces.'), { x: gcN(plan.overlaps[0].from), from: gcN(plan.overlaps[0].from), to: gcN(plan.overlaps[0].to) })
              : __alloT('stem.graphcalc.pw_is_function', 'Each x belongs to at most one piece, so this is a function.')) : null,
            desc ? h('p', { 'data-graphcalc-pw-shape': true, style: gcPanelLine }, desc.text) : null);
        }
        function gcRenderData() {
          if (!gcData.on) return null;
          var parsed = gcDataParsed || { points: [], bad: [] }, R = gcFitResult;
          var errs = { few: __alloT('stem.graphcalc.fit_few', 'Add more points: a line needs 2, a quadratic 3.'), samex: __alloT('stem.graphcalc.fit_samex', 'The x-values need to differ: this fit cannot be made from these points.'), nonpositive: __alloT('stem.graphcalc.fit_nonpositive', 'An exponential fit needs every y above 0, because it fits a line to ln y.') };
          var r2Text = !R || R.error ? '' : R.r2 === null ? __alloT('stem.graphcalc.fit_r2_undefined', 'R² is undefined here: every y-value is the same.')
            : gcFill(R.kind === 'linear' ? __alloT('stem.graphcalc.fit_r2_linear', 'r² = {r2}: the line explains this share of the variation in y.') : R.kind === 'quadratic' ? __alloT('stem.graphcalc.fit_r2_quadratic', 'R² = {r2}: the curve explains this share of the variation in y.') : __alloT('stem.graphcalc.fit_r2_exponential', 'R² = {r2} for the line through (x, ln y): it measures the fit on the log scale.'), { r2: gcSig(R.r2, 4) });
          function graphFit() {
            if (!R || R.error) return;
            var nf = funcs.slice(), slot = -1;
            nf.forEach(function(f, i) { if (slot < 0 && (!f || !f.expr || !String(f.expr).trim())) slot = i; });
            if (slot < 0) slot = nf.length - 1;
            nf[slot] = Object.assign({}, nf[slot], { expr: R.expr });
            updMulti({ funcs: nf, _gaFn: slot, _gaIdx: -1 });
            if (announceToSR) announceToSR(gcFill(__alloT('stem.graphcalc.fit_graphed', 'The fit is graphed as y{n}.'), { n: slot + 1 }));
          }
          var resid = R && !R.error && gcData.resid ? R.residuals : null, rMax = 0;
          if (resid) resid.forEach(function(r) { if (isFinite(r.res)) rMax = Math.max(rMax, Math.abs(r.res)); });
          var xs = resid ? resid.map(function(r) { return r.x; }) : [], xLo = Math.min.apply(null, xs.concat([0])), xHi = Math.max.apply(null, xs.concat([1]));
          function rx(x) { return 14 + (x - xLo) / ((xHi - xLo) || 1) * 272; }
          function ry(v) { return 60 - v / (rMax || 1) * 46; }
          return h('section', { 'data-graphcalc-data': true, 'aria-labelledby': 'graphcalc-data-title', style: gcPanelWrap },
            h('h3', { id: 'graphcalc-data-title', style: gcH3 }, __alloT('stem.graphcalc.data_title', 'Data and regression')),
            h('label', { style: Object.assign({ display: 'block', fontWeight: 700 }, gcPanelLine) }, __alloT('stem.graphcalc.data_label', 'Type or paste (x, y) pairs, one pair per line'),
              h('textarea', { 'data-graphcalc-data-text': true, rows: 6, value: typeof gcData.text === 'string' ? gcData.text : '', placeholder: '1, 2\n2, 4\n3, 5', onChange: function(e) { gcSet('data', { text: e.target.value.slice(0, 8000) }); }, style: Object.assign({ display: 'block', width: '100%', marginTop: 4, fontFamily: 'monospace' }, gcCoreStyles.input) })),
            h('p', { 'data-graphcalc-data-count': parsed.points.length, role: 'status', style: gcPanelLine }, gcFill(__alloT('stem.graphcalc.data_count', '{n} points read.'), { n: parsed.points.length }) + (parsed.bad.length ? ' ' + gcFill(__alloT('stem.graphcalc.data_bad', 'Could not read line {list}.'), { list: parsed.bad.slice(0, 6).join(', ') }) : '')),
            h('fieldset', { style: Object.assign({ borderRadius: 8, padding: '6px 8px', margin: '8px 0 0', minWidth: 0 }, gcCoreStyles.card) },
              h('legend', { style: { fontWeight: 700, padding: '0 4px', color: gcText } }, __alloT('stem.graphcalc.fit_choose', 'Least-squares fit')),
              [['none', __alloT('stem.graphcalc.fit_none', 'No fit')], ['linear', __alloT('stem.graphcalc.fit_linear', 'Linear: y = mx + b')], ['quadratic', __alloT('stem.graphcalc.fit_quadratic', 'Quadratic: y = ax² + bx + c')], ['exponential', __alloT('stem.graphcalc.fit_exponential', 'Exponential: y = a · bˣ (log-linear)')]].map(function(o) {
                return h('label', { key: o[0], style: Object.assign({ display: 'flex', alignItems: 'center', gap: 6, minHeight: 32 }, gcPanelLine, { marginTop: 0 }) },
                  h('input', { type: 'radio', name: 'graphcalc-fit', value: o[0], checked: gcFitKind === o[0], onChange: function() { gcSet('data', { fit: o[0] }); }, style: { width: 18, height: 18, margin: 0, flexShrink: 0 } }), o[1]);
              })),
            R && R.error ? h('p', { role: 'status', 'data-graphcalc-fit-error': R.error, style: gcPanelLine }, errs[R.error] || '') : null,
            R && !R.error ? h('div', { 'data-graphcalc-fit': R.kind },
              h('p', { 'data-graphcalc-fit-eq': true, style: Object.assign({}, gcPanelLine, { fontFamily: 'monospace', fontWeight: 700 }) }, R.eq),
              h('p', { 'data-graphcalc-fit-r2': true, style: gcPanelLine }, r2Text),
              R.logLinear ? h('p', { style: gcPanelLine }, __alloT('stem.graphcalc.fit_loglinear_note', 'Fitted as a straight line through the points (x, ln y), then converted back: a = e to the intercept, b = e to the slope. This is not the same as a least-squares fit to y itself.')) : null,
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 } },
                h('button', { type: 'button', 'data-graphcalc-fit-graph': true, onClick: graphFit, style: gaButton }, __alloT('stem.graphcalc.fit_graph', 'Graph this fit in a free row')),
                h('button', { type: 'button', 'data-graphcalc-resid': true, 'aria-pressed': !!gcData.resid, onClick: function() { gcSet('data', { resid: !gcData.resid }); }, style: gaButton }, __alloT('stem.graphcalc.fit_residuals', 'Residuals'))),
              resid ? h('div', { 'data-graphcalc-residuals': true },
                h('svg', { viewBox: '0 0 300 120', role: 'img', 'aria-label': gcFill(__alloT('stem.graphcalc.resid_plot', 'Residual plot: {n} residuals, the largest {max} away from zero. Points above the line were under-predicted, points below were over-predicted.'), { n: resid.length, max: gcSig(rMax) }), style: { display: 'block', width: '100%', maxWidth: 360, marginTop: 6, background: gcPal ? gcPal.bg : '#ffffff', borderRadius: 6 } },
                  h('line', { x1: 8, x2: 292, y1: 60, y2: 60, stroke: gcPal ? gcPal.axis : '#334155', strokeWidth: 1.5 }),
                  resid.map(function(r, i) { return isFinite(r.res) ? h('rect', { key: i, x: rx(r.x) - 4, y: ry(r.res) - 4, width: 8, height: 8, fill: gcPal ? gcPal.curve(2).color : '#047857' }) : null; })),
                h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.graphcalc.resid_table', 'Residuals table'), style: { overflowX: 'auto', marginTop: 6 } },
                  h('table', { style: { borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 12, color: gcText } },
                    h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, __alloT('stem.graphcalc.resid_table', 'Residuals table')),
                    h('thead', null, h('tr', null, ['x', 'y', __alloT('stem.graphcalc.resid_fit', 'fitted y'), __alloT('stem.graphcalc.resid_res', 'residual y − fitted')].map(function(c) { return h('th', { key: c, scope: 'col', style: { padding: '2px 8px', textAlign: 'right' } }, c); }))),
                    h('tbody', null, resid.slice(0, 60).map(function(r, i) { return h('tr', { key: i }, [r.x, r.y, r.fit, r.res].map(function(v, j) { return h('td', { key: j, style: { padding: '2px 8px', textAlign: 'right' } }, gcSig(v)); })); }))))) : null) : null,
            h('p', { style: Object.assign({}, gcPanelLine, { color: gcMuted, fontSize: 12 }) }, __alloT('stem.graphcalc.data_statslab_note', 'For a full statistical test, open Stats Lab and paste the same pairs into its data import.')));
        }
        // Hint ladders for the challenge types that ask for a zero, an intercept or a shift.
        function gcChallengeHints(pid) {
          if (!GA) return [];
          if (pid === 0) {
            var y0 = CHALLENGE_CHECKS[0].reqs[0].f(0);
            return [__alloT('stem.graphcalc.hint_yint_nudge', 'The y-intercept is where the line crosses the y-axis.'),
              __alloT('stem.graphcalc.hint_yint_strategy', 'Every point on the y-axis has x = 0, so work out y when x = 0.'),
              gcFill(__alloT('stem.graphcalc.hint_yint_worked', 'At x = 0: y = 3(0) − 2 = {y}.'), { y: gcN(y0) }),
              gcFill(__alloT('stem.graphcalc.hint_yint_answer', 'The y-intercept is {y}: the line crosses the y-axis at (0, {y}).'), { y: gcN(y0) })];
          }
          if (pid === 3) {
            var zs = GA.zerosOf(CHALLENGE_CHECKS[3].reqs[0].f, -10, 10).xs || [];
            return [__alloT('stem.graphcalc.hint_zero_nudge', 'A zero is an x-value where y = 0: where the graph meets the x-axis.'),
              __alloT('stem.graphcalc.hint_zero_strategy', 'Set x^2 - 4 equal to 0 and solve, or press Analyze and read the zero candidates.'),
              __alloT('stem.graphcalc.hint_zero_worked', 'x^2 - 4 = 0 means x^2 = 4: x is a number whose square is 4.'),
              gcFill(__alloT('stem.graphcalc.hint_zero_answer', 'x = {list}.'), { list: zs.map(gcN).join(' and x = ') })];
          }
          if (pid === 4) {
            var right = GA.familyFeatures('quadratic', 1, -6, 9), left = GA.familyFeatures('quadratic', 1, 4, 4);
            var hr = right.extrema[0].x, hl = left.extrema[0].x;
            return [__alloT('stem.graphcalc.hint_shift_nudge', 'Compare where the lowest point of each parabola sits.'),
              __alloT('stem.graphcalc.hint_shift_strategy', 'Find the x that makes the inside of each square equal 0: that is where the vertex is.'),
              gcFill(__alloT('stem.graphcalc.hint_shift_worked', '(x-3)^2 is 0 when x = {r}, so its vertex is ({r}, 0); (x+2)^2 is 0 when x = {l}.'), { r: gcN(hr), l: gcN(hl) }),
              gcFill(__alloT('stem.graphcalc.hint_shift_answer', 'y = (x-3)^2 is y = x^2 moved right {r}; y = (x+2)^2 is y = x^2 moved left {l}.'), { r: gcN(Math.abs(hr)), l: gcN(Math.abs(hl)) })];
          }
          return [];
        }
        // Teacher (teacher mode only): assign challenges, collect results.
        function gcProgressRows() {
          var done = Array.isArray(d._challengesDone) ? d._challengesDone : [];
          var preds = d._challengePred && typeof d._challengePred === 'object' && !Array.isArray(d._challengePred) ? d._challengePred : {};
          var matched = done.filter(function(pid) { var c = CHALLENGE_CHECKS[pid]; return c && c.predict && preds[pid] === c.predict.answer; }).length;
          var yes = __alloT('stem.graphcalc.pr_yes', 'yes'), no = __alloT('stem.graphcalc.pr_no', 'no');
          function topics(list) { return list.map(function(pid) { return PREMADE_CHALLENGES[pid] ? PREMADE_CHALLENGES[pid].topic : String(pid); }).join('; '); }
          return [
            [__alloT('stem.graphcalc.pr_functions', 'Functions graphed now'), gaRows.length],
            [__alloT('stem.graphcalc.pr_challenges', 'Challenges completed'), done.length + (done.length ? ' (' + topics(done) + ')' : '')],
            [__alloT('stem.graphcalc.pr_predictions', 'Predictions the graph confirmed'), matched + '/' + done.length],
            [__alloT('stem.graphcalc.pr_badges', 'Badges'), badges.length + '/' + BADGES.length],
            [__alloT('stem.graphcalc.pr_analyzed', 'Used Analyze'), d._analyzed ? yes : no],
            [__alloT('stem.graphcalc.pr_zero', 'Found a zero'), d._foundZero ? yes : no],
            [__alloT('stem.graphcalc.pr_intersection', 'Found an intersection'), d._foundIntersection ? yes : no],
            [__alloT('stem.graphcalc.pr_rates', 'Rates of change calculated'), Array.isArray(gcRoc.paid) ? gcRoc.paid.length : 0],
            [__alloT('stem.graphcalc.pr_fit', 'Data fit'), gcFitResult && !gcFitResult.error ? gcFitResult.eq + (gcFitResult.r2 !== null ? ', R² = ' + gcSig(gcFitResult.r2) : '') : no],
            [__alloT('stem.graphcalc.pr_assigned', 'Assigned challenges'), gcAssigned.length ? topics(gcAssigned) : no]
          ];
        }
        function gcRenderTeacher() {
          if (!ctx.isTeacherMode) return null;
          var line = { fontSize: '12px', lineHeight: 1.5, color: gcText, margin: '6px 0 0' };
          return h('div', { 'data-graphcalc-teacher': true, style: { flex: 1, overflowY: 'auto', padding: '8px', color: gcText } },
            h('h3', { style: { margin: 0, fontSize: 14, fontWeight: 800, color: gcAccent } }, __alloT('stem.graphcalc.teacher_title', 'Teacher tools')),
            h('p', { style: line }, __alloT('stem.graphcalc.teacher_intro', 'Only you see this tab. Assigned challenges appear first for students, at any tier.')),
            h('fieldset', { style: { border: '1px solid ' + gcBorder, borderRadius: 8, padding: '6px 8px', margin: '8px 0 0', minWidth: 0 } },
              h('legend', { style: { fontWeight: 700, fontSize: 12, padding: '0 4px', color: gcText } }, __alloT('stem.graphcalc.teacher_assign', 'Assign challenges')),
              PREMADE_CHALLENGES.map(function(ch, pid) {
                var on = gcAssigned.indexOf(pid) >= 0;
                return h('label', { key: pid, style: { display: 'flex', alignItems: 'flex-start', gap: 6, minHeight: 32, fontSize: 12, color: gcText, marginTop: 4 } },
                  h('input', { type: 'checkbox', checked: on, 'data-graphcalc-assign': pid, onChange: function() { upd('assignedChallenges', on ? gcAssigned.filter(function(x) { return x !== pid; }) : gcAssigned.concat([pid])); }, style: { width: 20, height: 20, margin: 0, flexShrink: 0 } }),
                  h('span', null, h('strong', null, ch.topic + ': '), ch.prompt));
              })),
            h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.graphcalc.teacher_results', 'Results'), style: { overflowX: 'auto', marginTop: 8 } },
              h('table', { 'data-graphcalc-progress': true, style: { borderCollapse: 'collapse', fontSize: 12, color: gcText } },
                h('caption', { style: { textAlign: 'left', fontWeight: 700 } }, __alloT('stem.graphcalc.teacher_results', 'Results')),
                h('tbody', null, gcProgressRows().map(function(r, i) { return h('tr', { key: i }, h('th', { scope: 'row', style: { textAlign: 'left', padding: '3px 6px', borderBottom: '1px solid ' + gcBorder } }, r[0]), h('td', { style: { padding: '3px 6px', borderBottom: '1px solid ' + gcBorder } }, String(r[1]))); })))),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 } },
              h('button', { type: 'button', 'data-graphcalc-teacher-csv': true, onClick: function() { if (GA) GA.downloadText('graphing-calculator-progress.csv', GA.csvText([['metric', 'value']].concat(gcProgressRows())), 'text/csv'); }, style: gaButton }, __alloT('stem.graphcalc.teacher_csv', 'Download progress (CSV)')),
              h('button', { type: 'button', 'data-graphcalc-teacher-md': true, onClick: function() { if (GA) GA.downloadText('graphing-calculator-report.md', gcReportMarkdown(), 'text/markdown'); }, style: gaButton }, __alloT('stem.graphcalc.teacher_md', 'Download report (Markdown)')),
              h('button', { type: 'button', 'data-graphcalc-teacher-print': true, onClick: function() { var ok = GA && GA.printReport(__alloT('stem.graphcalc.report_title', 'Graphing Calculator progress'), gcProgressRows(), d._analysisContext ? gcAnalysisMarkdown(d._analysisContext, d._zeros, d._intersections, d._analysis, null) : ''); if (!ok && addToast) addToast(__alloT('stem.graphcalc.teacher_print_blocked', 'The print window was blocked. Allow pop-ups, or download the report instead.'), 'warning'); }, style: gaButton }, __alloT('stem.graphcalc.teacher_print', 'Print report'))));
        }
        // What the stage B overlays add to the picture, for the canvas's accessible name.
        function gcCanvasNotes() {
          var notes = [];
          if (gcRocPts && gcRocPts.dy !== null) notes.push(gcFill(__alloT('stem.graphcalc.roc_canvas_label', 'Points A ({x1}, {y1}) and B ({x2}, {y2}) are marked, joined by a dashed secant with its slope triangle.'), { x1: gcN(gcRocPts.x1), y1: gcN(gcRocPts.y1), x2: gcN(gcRocPts.x2), y2: gcN(gcRocPts.y2) }));
          if (gcInvInfo) notes.push(gcFill(__alloT('stem.graphcalc.inv_canvas_label', 'The reflection across y = x is drawn dotted, with a horizontal line at y = {y}.'), { y: gcN(gcHlY) }));
          if (gcPwPlan && gcPwPlan.pieces.length) notes.push(gcFill(__alloT('stem.graphcalc.pw_canvas_label', 'A piecewise function with {n} pieces is drawn, with a dot at each endpoint.'), { n: gcPwPlan.pieces.length }));
          if (gcDataParsed && gcDataParsed.points.length) notes.push(gcFill(__alloT('stem.graphcalc.data_canvas_label', '{n} data points are plotted as squares.'), { n: gcDataParsed.points.length }) + (gcFitResult && !gcFitResult.error ? ' ' + gcFill(__alloT('stem.graphcalc.fit_canvas_label', 'Fitted curve: {eq}.'), { eq: gcFitResult.eq }) : ''));
          return notes.length ? ' ' + notes.join(' ') : '';
        }
        function gcReportMarkdown() {
          var lines = ['# ' + __alloT('stem.graphcalc.report_title', 'Graphing Calculator progress'), new Date().toISOString(), '', gcProgressRows().map(function(r) { return '- ' + r[0] + ': ' + r[1]; }).join('\n')];
          if (d._analysisContext) lines.push('', gcAnalysisMarkdown(d._analysisContext, d._zeros, d._intersections, d._analysis, null));
          return lines.join('\n');
        }

        function canvasMathX(e) {
          var canvas = e.currentTarget, rect = canvas.getBoundingClientRect();
          if (!rect.width || !canvas._toMathX) return null;
          return canvas._toMathX((e.clientX - rect.left) / rect.width * (canvas.width / (window.devicePixelRatio || 1)));
        }
        function updateTraceFromPointer(e) {
          if (!d.traceMode) return;
          var canvas = e.currentTarget;
          var rect = canvas.getBoundingClientRect();
          if (!rect.width || !canvas._toMathX) return;
          var px = (e.clientX - rect.left) / rect.width * (canvas.width / (window.devicePixelRatio || 1));
          upd('traceX', clampTo(canvas._toMathX(px), win.xmin, win.xmax));
        }

        var traceValues = [];
        if (d.traceMode && window.math) {
          var traceScope = { x: traceX };
          if (d.sliderA != null) traceScope.a = d.sliderA;
          if (d.sliderB != null) traceScope.b = d.sliderB;
          if (d.sliderC != null) traceScope.c = d.sliderC;
          funcs.forEach(function(fn, index) {
            if (!fn.expr || !fn.expr.trim()) return;
            try {
              var value = window.math.compile(gcCleanExpr(fn.expr)).evaluate(traceScope);
              traceValues.push('y' + (index + 1) + ' = ' + (typeof value === 'number' && isFinite(value) ? Number(value.toPrecision(5)) : __alloT('stem.graphcalc.undefined_real_value','Undefined in the real numbers')));
            } catch (e) { traceValues.push('y'+(index+1)+': '+__alloT('stem.graphcalc.cannot_evaluate','Cannot evaluate')); }
          });
        }
        var traceSummary = gcFill(__alloT('stem.graphcalc.trace_summary', 'Trace x = {x}'), { x: Number(traceX.toPrecision(5)) }) + (traceValues.length ? '; ' + traceValues.join('; ') : '; ' + __alloT('stem.graphcalc.trace_enter_function', 'enter a function to read its y value'));

        /* ═══════════════════════════════════════════════════
           UI RENDER
           ═══════════════════════════════════════════════════ */
        return h('div', { className: 'graphcalc-shell', style: { display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--allo-stem-canvas, #0f172a)', color: gcText, fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, typeof d._srMsg === 'string' ? d._srMsg : ''),

          // Header
          h('div', { className: 'graphcalc-header', style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderBottom: '1px solid rgba(99,102,241,0.2)' } },
            h('button', { 'aria-label': __alloT('stem.graphcalc.back', 'Back'), onClick: function() { setStemLabTool(null); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', color: '#c7d2fe', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' } }, __alloT('stem.graphcalc.back_2', '\u2190 Back')),
            h('div', { style: { fontWeight: 'bold', fontSize: '16px', color: '#c7d2fe' } }, __alloT('stem.graphcalc.graphing_calculator', '\uD83D\uDCC8 Graphing Calculator')),
            h('span', { style: { fontSize: '10px', color: '#c7d2fe', maxWidth: '300px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, gradeIntros[band] || ''),
            h('div', { className: 'graphcalc-header-actions', style: { marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' } },
              h('span', { style: { background: tierInfo.color + '22', color: tierInfo.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid ' + tierInfo.color + '44' } }, tierInfo.icon + ' ' + tierInfo.name),
              h('select', { value: tier, onChange: function(e) { SOUNDS.tierChange(); upd('tier', e.target.value); }, 'aria-label': __alloT('stem.graphcalc.difficulty_tier', 'Difficulty tier'), style: { background: 'rgba(255,255,255,0.1)', border: '1px solid #818cf8', borderRadius: '6px', padding: '3px 8px', color: '#c7d2fe', fontSize: '10px', cursor: 'pointer' } },
                h('option', { value: 'explorer' }, __alloT('stem.graphcalc.explorer_2', '\uD83D\uDFE2 Explorer')), h('option', { value: 'analyst' }, __alloT('stem.graphcalc.analyst_2', '\uD83D\uDFE1 Analyst')),
                h('option', { value: 'engineer' }, __alloT('stem.graphcalc.engineer_2', '\uD83D\uDD35 Engineer')), h('option', { value: 'researcher' }, __alloT('stem.graphcalc.researcher_2', '\uD83D\uDFE3 Researcher'))
              ),
              h('button', { onClick: takeSnapshot, 'aria-label': __alloT('stem.graphcalc.take_snapshot', 'Take snapshot'), style: { background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '6px', padding: '3px 8px', color: '#fbbf24', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCF8'),
              badges.length > 0 ? h('span', { style: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' } }, '\uD83C\uDFC5 ' + badges.length) : null
            )
          ),

          // 3-column layout
          h('div', { className: 'graphcalc-layout', style: { display: 'flex', flex: 1, overflow: 'hidden' } },

            // Left sidebar
            h('div', { className: 'graphcalc-left-sidebar', style: { width: '220px', borderRight: '1px solid ' + gcBorder, display: 'flex', flexDirection: 'column', background: gcDeeper } },
              h('div', { style: { padding: '10px 12px', borderBottom: '1px solid ' + gcBorder, fontSize: '11px', fontWeight: 'bold', color: gcAccent, letterSpacing: '1px' } }, __alloT('stem.graphcalc.functions', '\uD83D\uDCDD FUNCTIONS')),
              h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                funcs.map(function(fn, i) {
                  return h('div', { key: 'f' + i, style: { marginBottom: '8px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' } },
                      // Swatch shows the row's colour and dash pattern, as drawn on the graph.
                      h('svg', { width: 28, height: 10, 'aria-hidden': 'true', style: { flexShrink: 0 } }, h('line', { x1: 1, y1: 5, x2: 27, y2: 5, stroke: gcCurveStyle(i).color, strokeWidth: 3, strokeLinecap: 'round', strokeDasharray: gcCurveStyle(i).dash.length ? gcCurveStyle(i).dash.join(' ') : undefined })),
                      h('span', { style: { fontSize: '10px', color: gcMuted, fontWeight: 700 } }, 'y' + (i + 1) + ' =')
                    ),
                    h('input', { type: 'text', value: fn.expr || '', placeholder: i === 0 ? '2x + 3' : i === 1 ? 'x^2 - 4' : 'sin(x)',
                      onChange: function(e) { var nf = funcs.slice(); nf[i] = Object.assign({}, nf[i], { expr: e.target.value }); upd('funcs', nf); },
                      onFocus: function() { upd('focusedInput', i); },
                      'aria-label': 'Function y' + (i + 1) + ' expression',
                      className: 'focus:ring-2 focus:ring-indigo-500',
                      style: { width: '100%', padding: '6px 8px', borderRadius: '8px', border: '2px solid ' + gcCurveStyle(i).color, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '12px', fontWeight: 700 } })
                  );
                })
              ),
              // Math Pad toggle
              h('div', { style: { padding: '4px 12px', borderTop: '1px solid ' + gcBorder } },
                h('button', { onClick: function() { upd('showMathPad', !showMathPad); }, 'aria-pressed': !!showMathPad, style: Object.assign({ width: '100%', padding: '4px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showMathPad)) }, __alloT('stem.graphcalc.math_pad', '\u2328 Math Pad')),
                showMathPad ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', paddingBottom: '4px', paddingTop: '4px' } },
                  visibleSymbols.map(function(sym) {
                    return h('button', { 'aria-label': 'Insert ' + sym.label, key: sym.label, onClick: function() { insertSymbol(sym.insert); }, style: { padding: '3px 7px', borderRadius: '5px', background: gcButtonBg, color: gcButtonText, border: '1px solid ' + gcBorder, fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', cursor: 'pointer' } }, sym.label);
                  })
                ) : null
              ),
              // Tool buttons
              h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                h('button', { onClick: function() { upd('showTable', !showTable); if (!showTable) upd('_usedTable', true); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showTable)) }, __alloT('stem.graphcalc.table', '\uD83D\uDCCA Table')),
                h('button', { onClick: function() { try { var _cs = [].slice.call(document.querySelectorAll('canvas')); if (!_cs.length) return; var _c = _cs.sort(function(a,b){ return (b.width*b.height)-(a.width*a.height); })[0]; var _a = document.createElement('a'); _a.href = _c.toDataURL('image/png'); _a.download = 'graphcalc_' + Date.now() + '.png'; _a.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCF8 PNG saved!', 'success'); } catch (e) {} }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(true)) }, __alloT('stem.graphcalc.png', '\uD83D\uDCF8 PNG')),
                h('button', { onClick: function() { upd('showWindow', !showWindow); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showWindow)) }, __alloT('stem.graphcalc.window', '\u2699\uFE0F Window')),
                // Opens the challenge list (the right sidebar's Tasks tab) and moves focus to it.
                h('button', { 'aria-label': __alloT('stem.graphcalc.challenge', 'Challenge'), 'aria-pressed': tasksOpen, onClick: function() { SOUNDS.challengeOpen(); upd('_sideTab', tasksOpen ? 'coach' : 'challenge'); if (!tasksOpen) setTimeout(function() { var panel = document.querySelector('[data-graphcalc-tasks]'); if (!panel) return; if (typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ block: 'nearest' }); panel.focus(); }, 0); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(tasksOpen)) }, __alloT('stem.graphcalc.challenge_2', '\uD83C\uDFAF Challenge')),
                h('button', { 'aria-label': __alloT('stem.graphcalc.clear', 'Clear'), onClick: function() { SOUNDS.clearAll(); upd('funcs', funcs.map(function(f) { return Object.assign({}, f, { expr: '' }); })); }, style: { flex: '1 0 45%', padding: '5px', borderRadius: '6px', background: 'rgba(239,68,68,0.14)', color: gcDanger, border: '1px solid rgba(239,68,68,0.45)', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' } }, __alloT('stem.graphcalc.clear_2', '\uD83D\uDDD1 Clear')),
                h('button', { 'aria-pressed': !!d.traceMode, onClick: function() { SOUNDS.traceOn(); updMulti({ traceMode: !d.traceMode, traceX: traceX }); }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!d.traceMode)) }, __alloT('stem.graphcalc.trace', '\uD83D\uDD0D Trace')),
                h('button', { onClick: runAnalysis, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!d.showAnalysis)) }, __alloT('stem.graphcalc.analyze', '\u26A1 Analyze')),
                h('button', { onClick: function() { upd('showDeriv', !d.showDeriv); if (!d.showDeriv) { upd('_usedDeriv', true); if (d.derivX == null) upd('derivX', 0); } }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(!!d.showDeriv)) }, __alloT('stem.graphcalc.f_x', "\u2202 f'(x)")),
                h('button', { 'aria-label': __alloT('stem.graphcalc.sliders', 'Sliders'), onClick: function() { upd('showSliders', !showSliders); if (!showSliders) { upd('_usedSliders', true); if (d.sliderA == null) upd('sliderA', 1); if (d.sliderB == null) upd('sliderB', 0); if (d.sliderC == null) upd('sliderC', 0); } }, style: Object.assign({ flex: '1 0 45%', padding: '5px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }, gcButtonStyle(showSliders)) }, __alloT('stem.graphcalc.sliders_2', '\uD83C\uDFA8 Sliders'))
              ),
              // Stage B panels for the selected function (shown under the graph).
              h('div', { role: 'group', 'aria-label': __alloT('stem.graphcalc.panels_group', 'Study the selected function'), style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, display: 'flex', flexWrap: 'wrap', gap: '4px' } },
                gcToggleButton('roc', gcRoc.on, __alloT('stem.graphcalc.panel_rate', 'Rate of change')),
                gcToggleButton('kf', gcKf.on, __alloT('stem.graphcalc.panel_features', 'Key features')),
                gcToggleButton('inv', gcInv.on, __alloT('stem.graphcalc.panel_inverse', 'Inverse')),
                gcToggleButton('pw', gcPw.on, __alloT('stem.graphcalc.panel_piecewise', 'Piecewise')),
                gcToggleButton('data', gcData.on, __alloT('stem.graphcalc.panel_data', 'Data and fit'))
              ),
              // Zoom presets
              h('div', { style: { padding: '6px 12px 10px', borderTop: '1px solid ' + gcBorder } },
                h('div', { style: { fontSize: '11px', color: gcText, marginBottom: '4px', fontWeight: 'bold' } }, __alloT('stem.graphcalc.zoom_presets', 'ZOOM PRESETS')),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px' } },
                  ZOOM_PRESETS.map(function(z) {
                    return h('button', { 'aria-label': z.name + ' zoom preset', key: z.name, onClick: function() { SOUNDS.zoomPreset(); applyWindow({ xmin: z.xmin, xmax: z.xmax, ymin: z.ymin, ymax: z.ymax }); }, style: { padding: '3px 7px', borderRadius: '4px', background: gcButtonBg, color: gcButtonText, border: '1px solid ' + gcBorder, fontSize: '11px', fontWeight: 700, cursor: 'pointer' } }, z.name);
                  })
                )
              ),
              // Sliders
              showSliders ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, background: gcCard } },
                h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '6px' } }, __alloT('stem.graphcalc.sliders_use_a_b_c', '\uD83C\uDFA8 SLIDERS \u2014 Use a, b, c')),
                ['a', 'b', 'c'].map(function(p) {
                  var key = 'slider' + p.toUpperCase(); var val = d[key] != null ? d[key] : (p === 'a' ? 1 : 0);
                  return h('div', { key: p, style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                    h('span', { style: { fontFamily: 'monospace', fontWeight: 'bold', color: gcAccent, fontSize: '12px', width: '16px' } }, p),
                    h('input', { type: 'range', min: -10, max: 10, step: 0.1, value: val, 'aria-label': 'Parameter ' + p + ': ' + Number(val.toFixed(1)), onChange: function(e) { upd(key, parseFloat(e.target.value)); }, style: { flex: 1, minHeight: '24px', accentColor: gcAccent } }),
                    h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: gcText, minWidth: '36px', textAlign: 'right', fontWeight: 'bold' } }, Number(val.toFixed(1)))
                  );
                })
              ) : null,
              // Derivative slider
              d.showDeriv ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, background: gcCard } },
                h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '4px' } }, __alloT('stem.graphcalc.tangent_to_y', '\u2202 TANGENT to y\u2081')),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                  h('span', { style: { fontSize: '10px', color: gcText } }, 'x='),
                  h('input', { type: 'range', min: win.xmin, max: win.xmax, step: graphStep, value: derivX, 'aria-label': 'Tangent x position: ' + Number(derivX.toPrecision(4)), onChange: function(e) { upd('derivX', parseFloat(e.target.value)); }, style: { flex: 1, minHeight: '24px', accentColor: gcAccent } }),
                  h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, Number(derivX.toPrecision(4)))
                ),
                h('p',{'data-graphcalc-tangent':true,role:'status',style:{fontSize:12,color:gcText,margin:'6px 0 0',lineHeight:1.5}},Number.isFinite(tangentEstimate.slope)?__alloT('stem.graphcalc.tangent_slope_estimate','Estimated slope ≈ ')+Number(tangentEstimate.slope.toPrecision(5))+'. '+__alloT('stem.graphcalc.tangent_estimate_reason','This numerical estimate compares nearby slopes; use it as evidence alongside the graph.'):__alloT('stem.graphcalc.tangent_unavailable','No reliable finite tangent estimate here. Check the function and its domain; a corner or vertical tangent can make this estimate unavailable.'))
              ) : null,
              // Analysis results
              d.showAnalysis && !analysisCurrent ? h('p', { role:'status', style:{color:gcText,padding:12} }, __alloT('stem.graphcalc.analysis_stale', 'Functions or search bounds changed. Run Analyze again to refresh the evidence.')) : null,
              d.showAnalysis && analysisCurrent ? h('div', { style: { padding: '8px 12px', borderTop: '1px solid ' + gcBorder, background: gcCard } },
                h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '4px' } }, __alloT('stem.graphcalc.analysis', '\u26A1 ANALYSIS')),
                h('p', { 'data-analysis-provenance':true, style:{fontSize:12,color:gcText,lineHeight:1.6} },
                  d._analysis && d._analysis.error ? gcAnalysisError(d._analysis) :
                  gcFill(__alloT('stem.graphcalc.analysis_method', 'Search interval [{lo}, {hi}]; 501 grid samples, sign-change refinement, and local minima of |f|. Absolute residual threshold: 1e-8. A candidate is numerical evidence, not proof of a root or a complete solution set.'), { lo: win.xmin, hi: win.xmax })),
                h('p', { style:{fontSize:12,color:gcMuted} }, __alloT('stem.graphcalc.analysis_advice', 'Narrow or shift the window to check missed roots. Discontinuities and near-zero minima require further investigation. Zeros use the first function; intersections compare it with each other row.')),
                d._analysis && d._analysis.invalidEvaluations ? h('p',{role:'status'},gcFill(__alloT('stem.graphcalc.analysis_invalid', '{n} evaluations of f1 were non-finite or outside the real domain. Check the domain before interpreting gaps.'), { n: d._analysis.invalidEvaluations })) : null,
                d._analysis && d._analysis.zeroThroughoutSamples ? h('p',{role:'status'},__alloT('stem.graphcalc.analysis_all_zero', 'The first function equals zero at every sampled point. A finite list of isolated roots would be misleading; inspect the expression and interval.')) : null,
                d._analysis && d._analysis.overlapComparisons ? h('p',{role:'status'},gcFill(__alloT('stem.graphcalc.analysis_overlap', 'The first function matches {list} at every sampled point. This may be an overlap, not isolated intersections.'), { list: 'f' + d._analysis.overlapComparisons.join(', f') })) : null,
                d._analysis && d._analysis.intersectionWarning ? h('p',{role:'status'},d._analysis.intersectionWarningCode === 'compare_parse' ? __alloT('stem.graphcalc.analysis_compare_parse', 'At least one comparison function could not be parsed.') : d._analysis.intersectionWarning) : null,
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, __alloT('stem.graphcalc.zeros', 'Zeros')),
                    (d._zeros && d._zeros.length > 0) ? d._zeros.map(function(z, zi) { return h('div', { key: zi, style: { fontSize: '10px', fontFamily: 'monospace', color: gcText } }, 'x≈' + Number(z.x.toPrecision(8)) + '; |f(x)|=' + Number(z.residual).toExponential(2) + '; ' + gcMethodName(z.method)); }) : h('div', { style: { fontSize: '10px', color: gcMuted } }, __alloT('stem.graphcalc.analysis_no_zeros', 'No zero candidates found in this interval'))
                  ),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, __alloT('stem.graphcalc.intersections', 'Intersections')),
                    (d._intersections && d._intersections.length > 0) ? d._intersections.map(function(pt, pi) { return h('div', { key: pi, style: { fontSize: '10px', fontFamily: 'monospace', color: gcText } }, 'f1 & f' + (pt.f2 + 1) + ': (' + Number(pt.x.toPrecision(8)) + ', ' + Number(pt.y.toPrecision(8)) + '); |f1−f' + (pt.f2 + 1) + '|=' + Number(pt.residual).toExponential(2)); }) : h('div', { style: { fontSize: '10px', color: gcMuted } }, funcs.filter(function(f){return f.expr && f.expr.trim();}).length < 2 ? __alloT('stem.graphcalc.analysis_add_second', 'Add a second function to compare') : __alloT('stem.graphcalc.analysis_no_crossings', 'No intersection candidates found in this interval'))
                  )
                ),
                renderCandidateInspector()
              ) : null
            ),

            // Center — Canvas
            // The fullscreen stage is this panel, not the bare canvas: the trace
            // readout and trace slider below the graph are what make the picture
            // legible to a learner who cannot read values off the curve, so they
            // have to come along. __alloStemFsBind keeps the button's label and
            // aria-pressed in step with the stage (this tool holds no React state).
            h('div', { className: 'graphcalc-main-panel', 'data-allo-fs-stage': 'true',
              ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-graphcalc-fs]'), node); },
              // Scrolls in a short viewport so the Describe panel never hides the window or table fields.
              style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0, minHeight: 0, overflowY: 'auto' } },
              h('button', {
                type: 'button',
                'data-graphcalc-fs': 'true',
                'aria-pressed': 'false',
                'aria-label': __alloT('stem.graphcalc.enter_fullscreen', 'View the graph fullscreen'),
                'data-fs-out': __alloT('stem.graphcalc.enter_fullscreen', 'View the graph fullscreen'),
                'data-fs-in': __alloT('stem.graphcalc.exit_fullscreen', 'Exit fullscreen graph (Escape)'),
                style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid ' + gcBorder, color: gcText, fontSize: 16, fontWeight: 700, cursor: 'pointer' }
              }, h('span', { 'aria-hidden': 'true' }, '⛶')),
              // The accessible name is built from the selected function's key features.
              h('canvas', { ref: canvasRef, role: 'img', 'data-a11y-static': 'true', 'aria-describedby': 'graphcalc-canvas-desc', 'aria-label': __alloT('stem.graphcalc.interactive_graphing_calculator_visual', 'Interactive graphing calculator visualization') + (gaInfo ? '. ' + (gaRows.length > 1 ? gcFill(__alloT('stem.graphcalc.ga_rows_graphed', '{n} functions are graphed.'), { n: gaRows.length }) + ' ' : '') + gaInfo.desc.short : '') + gcCanvasNotes(), style: { width: '100%', flex: 1, minHeight: 240, background: gcPal ? gcPal.bg : 'var(--allo-stem-canvas, #0f172a)', cursor: d.traceMode || rocShow ? 'crosshair' : 'default', touchAction: d.traceMode || rocShow ? 'none' : 'auto' },
                onPointerDown: function(e) {
                  if (!d.traceMode && !rocShow) return;
                  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
                  if (d.traceMode) { updateTraceFromPointer(e); return; }
                  _gcRocDrag = null; var mx = canvasMathX(e); if (mx !== null) gcRocPointer(mx);
                },
                onPointerMove: function(e) {
                  if (e.pointerType === 'mouse' && e.buttons !== 1) return;
                  if (d.traceMode) { updateTraceFromPointer(e); return; }
                  if (rocShow && _gcRocDrag) { var mx = canvasMathX(e); if (mx !== null) gcRocPointer(mx); }
                },
                onPointerUp: function() { _gcRocDrag = null; }, onPointerCancel: function() { _gcRocDrag = null; } }), h('p', { id: 'graphcalc-canvas-desc', className: 'sr-only' }, __alloT('stem.graphcalc.a11y_canvas_static_description', 'The graph is drawn as a picture. Turn on Trace mode and use the Trace x slider to read each point of the curve aloud as a number.')),
              // Describe and Hear: text summary, sonification and keyboard stepping (shared core).
              h('div', { 'data-graphcalc-access': true, style: { padding: '8px 12px', background: gcPanel, borderTop: '1px solid ' + gcBorder, color: gcText, fontSize: '12px' } },
                gaRows.length > 1 ? h('label', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '6px' } }, __alloT('stem.graphcalc.ga_function_select', 'Function to describe'),
                  h('select', { value: String(gaFn), onChange: function(e) { updMulti({ _gaFn: parseInt(e.target.value, 10), _gaIdx: -1 }); }, style: { minHeight: 36, maxWidth: '100%', padding: '4px 6px', borderRadius: 6, border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: 12 } },
                    gaRows.map(function(ri) { return h('option', { key: ri, value: String(ri) }, 'y' + (ri + 1) + ' = ' + funcs[ri].expr); }))) : null,
                gaInfo ? GA.panel(React, {
                  id: 'graphcalc-ga', t: __alloT, desc: gaInfo.desc, points: gaInfo.points, index: gaIdx, samples: gaInfo.samples,
                  sonify: { evaluate: gaInfo.evaluate, zeros: gaInfo.zeros, ymin: win.ymin, ymax: win.ymax },
                  open: !!d._gaOpen, onToggle: function() { upd('_gaOpen', !d._gaOpen); }, onIndex: function(i) { upd('_gaIdx', i); },
                  onChange: function() { upd('_gaTick', (typeof d._gaTick === 'number' ? d._gaTick : 0) + 1); }, announce: announceToSR, callTTS: callTTS,
                  extra: gaInfo.match ? h('button', { type: 'button', 'data-graphcalc-explore-family': gaInfo.match.type, onClick: function() { openFamilyLab(gaInfo.match); }, style: gaButton }, gcFill(__alloT('stem.graphcalc.explore_family', 'Explore this {family} family in Function Grapher'), { family: FG_FAMILY_NAMES[gaInfo.match.type] || gaInfo.match.type })) : null,
                  styles: { button: gaButton, text: { color: gcText, fontSize: 13 }, region: { padding: '8px 10px', minHeight: 44, borderRadius: 8, border: '2px solid ' + gcAccentBorder, background: gcCard, color: gcText, fontFamily: 'monospace', fontSize: 13 }, help: { color: gcMuted, fontSize: 12 } }
                }) : h('p', { style: { margin: 0, color: gcMuted } }, __alloT('stem.graphcalc.ga_enter_function', 'Enter a function to describe it, hear it, or explore it with keys.'))),
              gcRenderRate(), gcRenderFeatures(), gcRenderInverse(), gcRenderPiecewise(), gcRenderData(),
              d.traceMode ? h('div', { style: { padding: '8px 12px', background: gcCard, borderTop: '1px solid ' + gcBorder } },
                h('label', { htmlFor: 'graphcalc-trace-x', style: { display: 'flex', alignItems: 'center', gap: '8px', color: gcText, fontSize: '11px', fontWeight: 700 } },
                  h('span', null, __alloT('stem.graphcalc.trace_x', 'Trace x')),
                  h('input', {
                    id: 'graphcalc-trace-x', type: 'range', min: win.xmin, max: win.xmax, step: graphStep, value: traceX,
                    'aria-label': __alloT('stem.graphcalc.trace_x_position', 'Trace x position'),
                    'aria-valuetext': traceSummary,
                    onChange: function(e) { upd('traceX', parseFloat(e.target.value)); },
                    style: { flex: 1, accentColor: 'var(--gc-trace, #b45309)' }
                  }),
                  h('span', { style: { minWidth: '54px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--gc-trace, #b45309)' } }, Number(traceX.toPrecision(5)))
                ),
                h('div', { role: 'status', 'aria-live': 'polite', style: { marginTop: '4px', fontSize: '10px', color: gcMuted } }, traceSummary)
              ) : null,
              showWindow ? h('div', { style: { padding: '8px 12px', background: gcPanel, borderTop: '1px solid ' + gcBorder, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                h('span', { style: { fontSize: '10px', color: gcAccent, fontWeight: 'bold' } }, 'WINDOW:'),
                ['xmin', 'xmax', 'ymin', 'ymax'].map(function(k) {
                  return h('label', { key: k, style: { display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: gcText, fontWeight: 700 } }, k + ':', h('input', { type: 'number', step: 'any', value: winDrafts[k] != null ? winDrafts[k] : win[k], 'aria-label': 'Graph window ' + k, onChange: function(e) { var nd = Object.assign({}, winDrafts); nd[k] = e.target.value; upd('_winDraft', nd); }, onBlur: function() { commitWindowBound(k); }, onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); commitWindowBound(k); } }, style: { width: '64px', padding: '2px 4px', borderRadius: '4px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '10px' } }));
                }),
                h('span', { 'data-graphcalc-window-status': true, role: 'status', style: { fontSize: '10px', color: gcText } }, typeof d._winMsg === 'string' ? d._winMsg : '')
              ) : null,
              showTable ? h('div', { style: { maxHeight: '150px', flexShrink: 0, overflowY: 'auto', borderTop: '1px solid ' + gcBorder, background: gcPanel } },
                h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '6px 12px', borderBottom: '1px solid ' + gcBorder } },
                  h('span', { style: { fontSize: '10px', fontWeight: 'bold', color: gcAccent } }, __alloT('stem.graphcalc.table_2', '\uD83D\uDCCA TABLE')),
                  h('label', { style: { fontSize: '11px', color: gcText, display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 } }, 'Start:', h('input', { type: 'number', step: 'any', value: d._tableXDraft != null ? d._tableXDraft : tableX, onChange: function(e) { upd('_tableXDraft', e.target.value); }, onBlur: function() { commitTableField('tableX'); }, onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); commitTableField('tableX'); } }, style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '11px' } })),
                  h('label', { style: { fontSize: '11px', color: gcText, display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 } }, 'Step:', h('input', { type: 'number', step: 'any', value: d._tableStepDraft != null ? d._tableStepDraft : tableStep, onChange: function(e) { upd('_tableStepDraft', e.target.value); }, onBlur: function() { commitTableField('tableStep'); }, onKeyDown: function(e) { if (e.key === 'Enter') { e.preventDefault(); commitTableField('tableStep'); } }, style: { width: '40px', padding: '1px 3px', borderRadius: '3px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontFamily: 'monospace', fontSize: '11px' } })),
                  h('span', { 'data-graphcalc-table-status': true, role: 'status', style: { fontSize: '11px', color: gcText } }, typeof d._tableMsg === 'string' ? d._tableMsg : ''),
                  GA ? h('button', { type: 'button', 'data-graphcalc-diffs': true, 'aria-pressed': !!d.showDiffs, onClick: function() { upd('showDiffs', !d.showDiffs); }, style: Object.assign({ marginLeft: 'auto', minHeight: 32, padding: '2px 8px', borderRadius: 6, fontSize: '11px', fontWeight: 700, cursor: 'pointer' }, gcButtonStyle(!!d.showDiffs)) }, __alloT('stem.graphcalc.table_show_diffs', '\u0394y and ratio')) : null
                ),
                (function() {
                  // First differences and ratios (shared core) for linear-vs-exponential reasoning.
                  var diffs = d.showDiffs && GA ? GA.differencesTable(tableRows.map(function(r) { return { x: r.x, y: typeof r.y === 'number' ? r.y : null }; })) : null;
                  var th = { padding: '3px 10px', textAlign: 'right', color: gcAccent, fontWeight: 'bold', borderBottom: '1px solid ' + gcBorder };
                  function cell(v) { return typeof v === 'number' && isFinite(v) ? Number(v.toPrecision(6)) : '\u2014'; }
                  return h('div', null,
                    h('table', { style: { width: '100%', fontSize: '11px', fontFamily: 'monospace', borderCollapse: 'collapse' } },
                      h('caption', { className: 'sr-only' }, __alloT('stem.graphcalc.graphcalc_data_table', 'graphcalc data table')), h('thead', null, h('tr', null, h('th', { scope: 'col', style: th }, 'x'), h('th', { scope: 'col', style: th }, 'y\u2081'),
                        diffs ? h('th', { scope: 'col', style: th }, __alloT('stem.graphcalc.table_diff_col', '\u0394y (change from the row above)')) : null,
                        diffs ? h('th', { scope: 'col', style: th }, __alloT('stem.graphcalc.table_ratio_col', 'Ratio (y \u00f7 the y above)')) : null)),
                      h('tbody', null, tableRows.map(function(r, ri) { return h('tr', { key: ri, style: { background: ri % 2 === 0 ? 'transparent' : gcCard } }, h('td', { style: { padding: '2px 10px', textAlign: 'right', color: gcMuted } }, r.x), h('td', { style: { padding: '2px 10px', textAlign: 'right', color: gcText } }, r.y),
                        diffs ? h('td', { style: { padding: '2px 10px', textAlign: 'right', color: gcText } }, cell(diffs.rows[ri] && diffs.rows[ri].dy)) : null,
                        diffs ? h('td', { style: { padding: '2px 10px', textAlign: 'right', color: gcText } }, cell(diffs.rows[ri] && diffs.rows[ri].ratio)) : null); }))
                    ),
                    diffs ? h('p', { 'data-graphcalc-diff-summary': true, style: { margin: 0, padding: '6px 12px', fontSize: '12px', color: gcText } }, GA.differencesSummary(diffs, __alloT)) : null);
                })()
              ) : null
            ),

            // Right sidebar
            h('div', { className: 'graphcalc-right-sidebar', style: { width: '230px', borderLeft: '1px solid ' + gcBorder, display: 'flex', flexDirection: 'column', background: gcDeeper } },
              h('div', { className: 'graphcalc-side-tabs', role: 'group', 'aria-label': __alloT('stem.graphcalc.support_options', 'Graphing support'), style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '4px', padding: '4px', borderBottom: '1px solid ' + gcBorder } },
                [{ id: 'coach', label: __alloT('stem.graphcalc.coach', '\uD83D\uDCA1 Coach') }, { id: 'challenge', label: __alloT('stem.graphcalc.tasks', '\uD83C\uDFAF Tasks') }, { id: 'ai', label: __alloT('stem.graphcalc.ai_help', 'AI help') }, { id: 'badges', label: __alloT('stem.graphcalc.badges', 'Badges') }, { id: 'inquiry', label: __alloT('stem.graphcalc.explore_quadratics', 'Explore quadratics') }].concat(ctx.isTeacherMode ? [{ id: 'teacher', label: __alloT('stem.graphcalc.teacher_tab', 'Teacher') }] : []).filter(function(st) { return st.id !== 'ai' || !!callGemini; }).map(function(st) {
                  var active = (d._sideTab || 'coach') === st.id;
                  return h('button', { 'aria-label': st.ariaLabel || st.label, 'aria-pressed': active, 'data-graphcalc-support': st.id, key: st.id, onClick: function() { upd('_sideTab', st.id); }, style: { minWidth: 0, minHeight: 44, whiteSpace: 'normal', overflowWrap: 'anywhere', gridColumn: st.id === 'inquiry' ? '1 / -1' : undefined, padding: '8px 4px', fontSize: '12px', fontWeight: 'bold', color: active ? gcAccent : gcMuted, background: active ? gcAccentSoft : 'transparent', borderTop: 'none', borderRight: 'none', borderLeft: 'none', borderBottom: active ? '2px solid ' + gcAccentBorder : '2px solid transparent', cursor: 'pointer' } }, st.label);
                })
              ),
              // Coach
              (d._sideTab || 'coach') === 'coach' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                currentTips.map(function(tip, i) {
                  return h('div', { key: i, style: { padding: '10px', marginBottom: '8px', borderRadius: '10px', background: gcCard, border: '1px solid ' + gcBorder } },
                    h('div', { style: { fontWeight: 'bold', fontSize: '12px', marginBottom: '4px', color: gcAccent } }, tip.icon + ' ' + tip.title),
                    h('div', { style: { fontSize: '11px', lineHeight: '1.5', color: gcText } }, tip.text),
                    h('button', { 'aria-label': __alloT('stem.graphcalc.read_aloud', 'Read aloud'), onClick: function() { speakText(tip.text, callTTS); }, style: { marginTop: '4px', background: 'none', border: 'none', color: gcAccent, fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' } }, __alloT('stem.graphcalc.read_aloud_2', '\uD83D\uDD0A Read aloud'))
                  );
                })
              ) : null,
              // Challenges
              tasksOpen ? h('div', { 'data-graphcalc-tasks': true, tabIndex: -1, role: 'region', 'aria-label': __alloT('stem.graphcalc.graphing_challenges', 'Graphing challenges'), style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                availableChallenges.map(function(ch, ci) {
                  var isActive = d.activeChallenge === ci;
                  // Completion is checked against the graphed state; self-report pays nothing.
                  var pid = PREMADE_CHALLENGES.indexOf(ch), chk = CHALLENGE_CHECKS[pid] || { reqs: [] };
                  var doneList = Array.isArray(d._challengesDone) ? d._challengesDone : [], done = doneList.indexOf(pid) !== -1;
                  var preds = d._challengePred && typeof d._challengePred === 'object' && !Array.isArray(d._challengePred) ? d._challengePred : {};
                  var pred = typeof preds[pid] === 'string' ? preds[pid] : '';
                  var status = isActive ? challengeStatus(pid) : null;
                  var predOptions = chk.predict ? chk.predict.options.concat([GC_PREDICT_UNSURE]) : [];
                  var predLabel = function(id) { var o = predOptions.filter(function(p) { return p.id === id; })[0]; return o ? o.label : ''; };
                  var msg = d._challengeMsgFor === pid && typeof d._challengeMsg === 'string' ? d._challengeMsg : '';
                  var line = { fontSize: '11px', lineHeight: '1.5', color: gcText };
                  return h('div', { key: ci, 'data-graphcalc-challenge': pid, style: { padding: '8px', marginBottom: '6px', borderRadius: '10px', background: gcCard, border: '1px solid ' + (isActive ? gcAccentBorder : gcBorder) } },
                    h('button', { type: 'button', 'aria-expanded': isActive, onClick: function() { upd('activeChallenge', isActive ? -1 : ci); }, style: { display: 'block', width: '100%', textAlign: 'left', minHeight: 44, padding: '2px', background: 'transparent', border: 'none', color: gcText, cursor: 'pointer' } },
                      h('span', { style: { display: 'block', fontSize: '11px', color: gcAccent, fontWeight: 'bold', marginBottom: '3px' } }, ch.topic + (gcAssigned.indexOf(pid) >= 0 ? ' \u00b7 ' + __alloT('stem.graphcalc.challenge_assigned', 'assigned') : '') + (done ? ' \u2713 ' + __alloT('stem.graphcalc.challenge_done_badge', 'done') : '')),
                      h('span', { style: Object.assign({ display: 'block' }, line) }, ch.prompt)),
                    isActive ? h('div', { style: { marginTop: '6px' } },
                      chk.predict ? h('fieldset', { 'data-graphcalc-predict': pid, style: { border: '1px solid ' + gcBorder, borderRadius: 8, padding: '6px 8px', margin: '0 0 6px', minWidth: 0 } },
                        h('legend', { style: { fontSize: '11px', fontWeight: 'bold', color: gcText, padding: '0 4px' } }, chk.predict.q),
                        predOptions.map(function(opt) {
                          return h('label', { key: opt.id, style: { display: 'flex', alignItems: 'center', gap: 6, minHeight: 32, fontSize: '11px', color: gcText, cursor: done ? 'default' : 'pointer' } },
                            h('input', { type: 'radio', name: 'graphcalc-predict-' + pid, value: opt.id, checked: pred === opt.id, disabled: done, onChange: function() { var np = Object.assign({}, preds); np[pid] = opt.id; updMulti({ _challengePred: np, _challengeMsg: '', _challengeMsgFor: -1 }); }, style: { width: 18, height: 18, margin: 0, flexShrink: 0 } }),
                            opt.label);
                        })) : null,
                      h('ul', { 'aria-label': __alloT('stem.graphcalc.challenge_checklist', 'What the graph needs to show'), style: { listStyle: 'none', margin: '0 0 6px', padding: 0 } },
                        status.reqs.map(function(r, ri) { return h('li', { key: ri, 'data-req-met': r.met ? 'true' : 'false', style: line }, h('span', { 'aria-hidden': 'true' }, r.met ? '\u2705 ' : '\u2B1C '), r.label + ' \u2014 ' + (r.met ? __alloT('stem.graphcalc.req_met', 'done') : __alloT('stem.graphcalc.req_not_met', 'not yet'))); })),
                      // The hint gives the answer away, so it waits for the prediction.
                      (!chk.predict || pred || done) ? h('div', { style: Object.assign({ fontSize: '12px', color: '#78350f', background: '#fef3c7', padding: '6px 8px', borderRadius: '6px', marginTop: '4px', border: '1px solid rgba(251,191,36,0.35)' }, ctx.isContrast ? { color: '#ffff00', background: '#000000', border: '1px solid #ffff00' } : null) }, '\uD83D\uDCA1 ' + ch.hint) : null,
                      // Nudge, strategy, worked step, answer (zeros, intercepts, shifts); also after the prediction.
                      (!chk.predict || pred || done) && GA && gcChallengeHints(pid).length ? GA.hintLadder(React, { id: 'graphcalc-hints-' + pid, t: __alloT, steps: gcChallengeHints(pid), level: d._chHints && typeof d._chHints === 'object' ? d._chHints[pid] : 0, onLevel: function(n) { var nh = Object.assign({}, d._chHints && typeof d._chHints === 'object' ? d._chHints : {}); nh[pid] = n; upd('_chHints', nh); }, announce: announceToSR, styles: { button: Object.assign({}, gaButton, { minHeight: 36 }), text: { color: gcText, fontSize: 12 }, help: { color: gcMuted, fontSize: 12 }, card: { border: '1px solid ' + gcBorder, borderRadius: 8, padding: 6, background: gcPanel, color: gcText } } }) : null,
                      done && chk.predict && pred ? h('p', { 'data-graphcalc-prediction-result': true, style: Object.assign({ margin: '6px 0 0' }, line) }, gcFill(pred === chk.predict.answer ? __alloT('stem.graphcalc.prediction_matched', 'You predicted "{pred}", and your graph agrees.') : __alloT('stem.graphcalc.prediction_compare', 'You predicted "{pred}". Your graph shows "{answer}".'), { pred: predLabel(pred), answer: predLabel(chk.predict.answer) })) : null,
                      done ? null : h('button', { type: 'button', 'aria-label': __alloT('stem.graphcalc.check_my_graph', 'Check my graph'), onClick: function() { checkChallenge(pid, ch, pred); }, style: { marginTop: '6px', minHeight: 44, padding: '4px 12px', borderRadius: '6px', background: '#22c55e', color: '#052e16', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' } }, __alloT('stem.graphcalc.check_my_graph_2', '\u2705 Check my graph')),
                      msg ? h('p', { role: 'status', 'data-graphcalc-challenge-msg': true, style: Object.assign({ margin: '6px 0 0', fontWeight: 700 }, line) }, msg) : null
                    ) : null
                  );
                }),
                // Worked examples that fade (shared core): zeros, intercepts, transformations, rate of change.
                GA ? GA.workedPanel(React, { id: 'graphcalc-worked', t: __alloT, state: d.we && typeof d.we === 'object' && !Array.isArray(d.we) ? d.we : {}, onSet: function(st) { upd('we', st); }, announce: announceToSR, styles: { wrap: { marginTop: 10, padding: 8, borderRadius: 10, border: '1px solid ' + gcBorder, background: gcCard, color: gcText }, button: Object.assign({}, gaButton, { minHeight: 36 }), text: { color: gcText, fontSize: 12 }, help: { color: gcMuted, fontSize: 12 }, input: { padding: '4px 6px', borderRadius: 6, border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontSize: 12, boxSizing: 'border-box' } } }) : null
              ) : null,
              // Teacher tools (teacher mode only)
              (d._sideTab || 'coach') === 'teacher' ? gcRenderTeacher() : null,
              // AI
              ((d._sideTab || 'coach') === 'ai' && callGemini) ? h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', padding: '8px' } },
                h('div', { style: { flex: 1, overflowY: 'auto', marginBottom: '8px' } },
                  aiMessages.length === 0 ? h('div', { style: { textAlign: 'center', padding: '20px 0' } }, h('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '\uD83E\uDD16'), h('p', { style: { fontSize: '11px', color: gcMuted } }, __alloT('stem.graphcalc.ask_about_graphing_or_math', 'Ask about graphing or math!'))) : null,
                  aiMessages.map(function(msg, i) {
                    return h('div', { key: i, style: { display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '6px' } },
                      h('div', { style: { maxWidth: '85%', padding: '6px 10px', borderRadius: '10px', fontSize: '11px', lineHeight: '1.5', background: msg.role === 'user' ? '#4338ca' : gcCard, color: msg.role === 'user' ? '#fff' : gcText, border: msg.role === 'user' ? '1px solid #4338ca' : '1px solid ' + gcBorder } },
                        msg.text,
                        msg.role !== 'user' ? h('button', { 'aria-label': __alloT('stem.graphcalc.speak_text', 'Speak Text'), onClick: function() { speakText(msg.text, callTTS); }, style: { marginLeft: '6px', background: 'none', border: 'none', color: gcAccent, fontSize: '10px', cursor: 'pointer' } }, '\uD83D\uDD0A') : null
                      ));
                  }),
                  aiLoading ? h('div', { style: { fontSize: '11px', color: gcMuted, fontStyle: 'italic' } }, __alloT('stem.graphcalc.thinking', 'Thinking...')) : null
                ),
                h('div', { style: { display: 'flex', gap: '4px' } },
                  h('input', { type: 'text', value: aiInput, onChange: function(e) { upd('aiInput', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter' && aiInput.trim()) handleAiQuestion(aiInput.trim()); }, placeholder: __alloT('stem.graphcalc.ask_about_math', 'Ask about math...'), 'aria-label': __alloT('stem.graphcalc.ask_the_math_tutor', 'Ask the math tutor'), className: 'focus:ring-2 focus:ring-indigo-500', style: { flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid ' + gcBorder, background: gcPanel, color: gcText, fontSize: '11px' } }),
                  h('button', { onClick: function() { if (aiInput.trim()) handleAiQuestion(aiInput.trim()); }, 'aria-label': __alloT('stem.graphcalc.send_question_to_ai_math_tutor', 'Send question to AI math tutor'), style: { padding: '6px 10px', borderRadius: '6px', background: '#4f46e5', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' } }, '\u2191')
                )
              ) : null,
              // Badges
              (d._sideTab || 'coach') === 'badges' ? h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
                h('div', { style: { fontSize: '10px', color: gcAccent, fontWeight: 'bold', marginBottom: '8px' } }, '\uD83C\uDFC5 ' + badges.length + '/' + BADGES.length + ' Earned'),
                BADGES.map(function(b) {
                  var earned = badges.indexOf(b.id) >= 0;
                  return h('div', { key: b.id, style: { padding: '8px', marginBottom: '4px', borderRadius: '8px', background: earned ? gcCardStrong : gcCard, border: '1px solid ' + gcBorder } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                      h('span', { style: { fontSize: '16px' } }, earned ? b.icon : '\uD83D\uDD12'),
                      h('div', null, h('div', { style: { fontSize: '11px', fontWeight: 'bold', color: earned ? gcAccent : gcMuted } }, b.label), h('div', { style: { fontSize: '11px', color: gcMuted } }, __alloT('stem.graphcalc.' + (b.id) + '_desc', b.desc))),
                      earned ? h('span', { style: { marginLeft: 'auto', fontSize: '11px', color: gcAccent, fontWeight: 'bold' } }, '+' + b.xp + ' XP') : null
                    ));
                })
              ) : null,
              // === H7b'' inquiry widget: quadratic discovery ===
              (d._sideTab || 'coach') === 'inquiry' ? (function() {
                var iq = d.quadHunt || { a: 1, hVertex: 0, kVertex: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                function setIQ(patch) { upd('quadHunt', Object.assign({}, iq, patch)); }
                var state = iq.a === 0 ? 'degenerate' : (iq.a > 0 ? 'up' : 'down');
                var stateMeta = {
                  up:         { label: __alloT('stem.graphcalc.opens_up_min_at_vertex', '🙂 Opens UP (min at vertex)'),   color: gcText, bg: gcCard, border: '#10b981' },
                  down:       { label: __alloT('stem.graphcalc.opens_down_max_at_vertex', '🙁 Opens DOWN (max at vertex)'), color: gcText, bg: gcCard, border: '#ef4444' },
                  degenerate: { label: __alloT('stem.graphcalc.constant_line', '➖ Constant function: horizontal line'),               color: gcText, bg: gcCard, border: '#94a3b8' }
                }[state];
                var inquiryX = function(x) { return 18 + (x + 14) / 28 * 264; };
                var inquiryY = function(y) { return 182 - (y + 14) / 28 * 164; };
                var inquiryPath = '';
                for (var qi = 0; qi <= 280; qi++) {
                  var qx = -14 + qi / 10, qy = iq.a * (qx - iq.hVertex) * (qx - iq.hVertex) + iq.kVertex;
                  inquiryPath += (qi ? ' L' : 'M') + inquiryX(qx).toFixed(2) + ',' + inquiryY(qy).toFixed(2);
                }
                var inquirySummary = iq.a === 0 ? __alloT('stem.graphcalc.constant_no_vertex','Horizontal line; no unique vertex. y = ') + iq.kVertex : __alloT('stem.graphcalc.vertex_coordinates','Vertex (h, k) = ') + '(' + iq.hVertex + ', ' + iq.kVertex + ')';
                function logObs() {
                  setIQ({ log: (iq.log || []).concat([{ a: iq.a, h: iq.hVertex, k: iq.kVertex, st: state }]).slice(-8) });
                }
                return h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px', color: gcText } },
                  h('div', { style: { fontSize: '12px', fontWeight: 'bold', color: gcAccent, marginBottom: '6px' } }, __alloT('stem.graphcalc.quadratic_discovery', '❔ Quadratic discovery')),
                  h('p', { style: { fontSize: '10px', color: gcMuted, lineHeight: 1.4, marginBottom: '8px' } },
                    __alloT('stem.graphcalc.quadratic_observation_prompt', 'Change h, k, or a one at a time. Use the linked graph below to compare position, opening direction, and width.')),
                  h('div', { style: { marginBottom: '8px', padding: '8px', borderRadius: '6px', textAlign: 'center', background: stateMeta.bg, border: '1px solid ' + stateMeta.border } },
                    h('div', { style: { fontSize: '11px', fontWeight: 'bold', color: stateMeta.color } }, stateMeta.label),
                    h('div', { style: { fontSize: '10px', color: gcText, marginTop: '3px', fontFamily: 'monospace' } },
                      'y = ' + iq.a.toFixed(2) + '(x − ' + iq.hVertex + ')² + ' + iq.kVertex)
                  ),
                  h('figure', { 'data-quadratic-inquiry': true, style: { margin: '0 0 10px', padding: 8, borderRadius: 8, background: gcPanel, border: '1px solid ' + gcBorder } },
                    h('svg', { viewBox: '0 0 300 200', role: 'img', 'aria-label': __alloT('stem.graphcalc.quadratic_linked_graph','Graph linked to the inquiry sliders. ') + inquirySummary, style: { width: '100%', display: 'block' } },
                      h('defs', null, h('clipPath', { id: 'graphcalc-inquiry-clip' }, h('rect', { x: 18, y: 18, width: 264, height: 164 }))),
                      h('rect', { x: 18, y: 18, width: 264, height: 164, fill: 'none', stroke: gcBorder }),
                      h('line', { x1: 18, x2: 282, y1: inquiryY(0), y2: inquiryY(0), stroke: gcMuted }),
                      h('line', { x1: inquiryX(0), x2: inquiryX(0), y1: 18, y2: 182, stroke: gcMuted }),
                      h('text', { x: 284, y: inquiryY(0) - 5, fill: gcText, fontSize: 12 }, 'x'),
                      h('text', { x: inquiryX(0) + 5, y: 14, fill: gcText, fontSize: 12 }, 'y'),
                      h('path', { 'data-quadratic-inquiry-curve': true, d: inquiryPath, fill: 'none', stroke: gcAccent, strokeWidth: 2.5, clipPath: 'url(#graphcalc-inquiry-clip)' }),
                      iq.a !== 0 && h('circle', { 'data-quadratic-inquiry-vertex': true, cx: inquiryX(iq.hVertex), cy: inquiryY(iq.kVertex), r: 4, fill: gcAccent, stroke: gcText, strokeWidth: 1 })),
                    h('figcaption', { role: 'status', style: { color: gcText, fontSize: 12, lineHeight: 1.5 } }, inquirySummary),
                    h('p', { style: { color: gcMuted, fontSize: 11, margin: '4px 0 0' } }, __alloT('stem.graphcalc.quadratic_graph_window','Fixed window: −14 to 14 on both axes. Portions outside the window are clipped.'))),
                  [
                    { key: 'a',       label: __alloT('stem.graphcalc.stretch_a', 'stretch a'),  val: iq.a,       min: -3,  max: 3,   step: 0.1 },
                    { key: 'hVertex', label: __alloT('stem.graphcalc.vertex_h', 'vertex h'),   val: iq.hVertex, min: -10, max: 10,  step: 1 },
                    { key: 'kVertex', label: __alloT('stem.graphcalc.vertex_k', 'vertex k'),   val: iq.kVertex, min: -10, max: 10,  step: 1 }
                  ].map(function(s) {
                    return h('div', { key: s.key, style: { marginBottom: '6px' } },
                      h('label', { htmlFor: 'qh-' + s.key, style: { display: 'block', fontSize: '10px', fontWeight: 'bold', color: gcText, marginBottom: '2px' } },
                        s.label + ': ', h('span', { style: { color: gcAccent, fontFamily: 'monospace' } }, s.val)),
                      h('input', { id: 'qh-' + s.key, type: 'range', min: s.min, max: s.max, step: s.step, value: s.val,
                        onChange: function(e) { var p = {}; p[s.key] = parseFloat(e.target.value); setIQ(p); },
                        style: { width: '100%' }, 'aria-label': s.label }));
                  }),
                  h('div', { style: { display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' } },
                    h('button', { onClick: logObs, style: { padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', background: gcButtonBg, color: gcButtonText, border: '1px solid ' + gcBorder, borderRadius: '4px', cursor: 'pointer' } }, __alloT('stem.graphcalc.log', '📋 Log')),
                    h('button', { onClick: function() { setIQ({ a: 1, hVertex: 0, kVertex: 0, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                      style: { padding: '3px 8px', fontSize: '10px', fontWeight: 600, background: 'transparent', color: gcMuted, border: '1px solid ' + gcBorder, borderRadius: '4px', cursor: 'pointer' } }, __alloT('stem.graphcalc.reset', '↺ Reset'))
                  ),
                  (iq.log || []).length > 0 && h('table', { style: { fontSize: '9px', width: '100%', borderCollapse: 'collapse', color: gcText, marginBottom: '8px' } },
                    h('thead', null, h('tr', { style: { background: gcCard } },
                      ['a', 'h', 'k', 'state'].map(function(c, i) { return h('th', { key: 'h' + i, scope: 'col', style: { padding: '3px', borderBottom: '1px solid rgba(99,102,241,0.2)', textAlign: 'left' } }, c); }))),
                    h('tbody', null, iq.log.map(function(o, idx) {
                      return h('tr', { key: 'lr' + idx },
                        h('td', { style: { padding: '3px', fontFamily: 'monospace' } }, o.a.toFixed(2)),
                        h('td', { style: { padding: '3px', fontFamily: 'monospace' } }, o.h),
                        h('td', { style: { padding: '3px', fontFamily: 'monospace' } }, o.k),
                        h('td', { style: { padding: '3px' } }, o.st));
                    }))
                  ),
                  h('div', { style: { marginBottom: '8px' } },
                    h('label', { htmlFor: 'qh-hypo', style: { display: 'block', fontSize: '10px', fontWeight: 'bold', color: gcText, marginBottom: '2px' } }, __alloT('stem.graphcalc.hypothesis_free_text', 'Hypothesis (free text):')),
                    h('textarea', { id: 'qh-hypo', value: iq.hypothesis || '',
                      onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                      placeholder: __alloT('stem.graphcalc.what_does_a_control_what_about_h_and_k', 'What does a control? What about h and k?'),
                      style: { width: '100%', minHeight: '40px', padding: '4px', background: gcPanel, color: gcText, border: '1px solid ' + gcBorder, borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }, rows: 3 })
                  ),
                  h('div', { style: { marginBottom: '8px' } },
                    !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
                      style: { padding: '3px 8px', fontSize: '10px', fontWeight: 'bold', background: '#fef3c7', color: '#78350f', border: '1px solid rgba(251,191,36,0.45)', borderRadius: '4px', cursor: 'pointer' } },
                      __alloT('stem.graphcalc.stuck_show_open_prompts', '🤔 Stuck — show open prompts')),
                    iq.stuckRevealed && h('div', { style: { padding: '6px', fontSize: '10px', color: gcText, background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '4px' } },
                      h('ul', { style: { margin: 0, paddingLeft: '14px' } },
                        h('li', null, __alloT('stem.graphcalc.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch what happens.')),
                        h('li', null, __alloT('stem.graphcalc.log_observations_of_each_state_what_pa', 'Log observations of each state. What patterns emerge?')),
                        h('li', null, __alloT('stem.graphcalc.what_slider_value_makes_the_parabola_d', 'What slider value makes the parabola degenerate?')),
                        h('li', null, __alloT('stem.graphcalc.can_you_get_the_same_shape_with_two_di', 'Can you get the same shape with two different settings?'))))
                  ),
                  h('div', { style: { padding: '6px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px' } },
                    h('label', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 'bold', color: gcText, cursor: 'pointer' } },
                      h('input', { type: 'checkbox', style: { width: 24, height: 24, flexShrink: 0, margin: 0 }, checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                      __alloT('stem.graphcalc.i_understand_explain_in_my_own_words', 'I understand — explain in my own words')),
                    iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); },
                      'aria-label': __alloT('stem.graphcalc.explanation_input', 'Graphing calculator explanation'),
                      placeholder: __alloT('stem.graphcalc.explain_in_your_own_words_what_does_ea', 'Explain in your own words: what does each slider control?'),
                      style: { width: '100%', marginTop: '4px', minHeight: '50px', padding: '4px', background: gcPanel, color: gcText, border: '1px solid rgba(16,185,129,0.45)', borderRadius: '4px', fontSize: '10px', fontFamily: 'monospace' }, rows: 4 })
                  ),
                  h('div', { style: { marginTop: '6px', padding: '6px', fontSize: '9px', fontStyle: 'italic', color: gcMuted, background: gcCard, borderRadius: '4px' } },
                    __alloT('stem.graphcalc.quadratic_constant_reason', 'When a = 0, y = k is constant and h has no effect. The horizontal line has no unique vertex.'))
                );
              })() : null
            )
          )
        );
      })();
    }
  });

})();
