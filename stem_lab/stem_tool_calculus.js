function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
window.StemLab = window.StemLab || { registerTool: function(){}, registerModule: function(){} };
(function() {
  // Translator reachable from module scope, IIFE-private so it is not a global.
  // Installed because this tool had no fallback-aware helper: labels built in
  // helpers defined above render() could not see a render-scoped one, and a
  // helper named `t` is shadowed here by numeric `var t` in inner scopes.
  var __alloCalcCtx = null;
  var __alloT = function (k, fb) {
    var v;
    try { v = (__alloCalcCtx && typeof __alloCalcCtx.t === "function") ? __alloCalcCtx.t(k, fb) : null; } catch (e) { v = null; }
    return (v == null) ? (fb != null ? fb : k) : v;
  };
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  // Contrast theme: hovered buttons, owned by this tool (allo-calculus-hc-extra-css).
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-calculus-hc-extra-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-calculus-hc-extra-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"calculus\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h){background-color:#00ff00!important;background-image:none!important;color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"calculus\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *{color:#000!important;-webkit-text-fill-color:#000!important}.theme-contrast [data-stem-tool-shell=\"calculus\"] button:hover:not(#hc-h):not(#hc-h):not(#hc-h):not(#hc-h) *:not(:empty):not(svg,svg *,canvas,img,video){background-color:#00ff00!important;background-image:none!important}";
    document.head.appendChild(st);
  })();
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _calcAC = null;
  function getCalcAC() { if (!_calcAC) { try { _calcAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_calcAC && _calcAC.state === "suspended") { try { _calcAC.resume(); } catch(e) {} } return _calcAC; }
  function calcTone(f,d,tp,v) { try { if (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()) return; } catch (e) {} if (window._alloGlobalMute) return; var ac = getCalcAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxCalcClick() { calcTone(600, 0.03, "sine", 0.04); }
  function sfxCalcSuccess() { calcTone(523, 0.08, "sine", 0.07); setTimeout(function() { calcTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { calcTone(784, 0.1, "sine", 0.08); }, 140); }
  function sfxCalcError() { calcTone(220, 0.18, "triangle", 0.06); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-calculus')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-calculus';
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

  // The control a path step's "Go" lands on: the node itself when it takes focus, else its first
  // enabled field, else its first enabled button.
  function calcTaskControl(node) {
    if (!node || !node.querySelector) return null;
    var ok = function(el) { return el && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && el.type !== 'hidden'; };
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(node.tagName) && ok(node)) return node;
    if (node.getAttribute('tabindex') === '0') return node;
    var fields = node.querySelectorAll('input,textarea,select');
    for (var i = 0; i < fields.length; i++) if (ok(fields[i])) return fields[i];
    var buttons = node.querySelectorAll('button,[role="slider"],[tabindex="0"]');
    for (var j = 0; j < buttons.length; j++) if (ok(buttons[j])) return buttons[j];
    return null;
  }

  function normalizeCalculusSubdivisions(value, mode) {
    var count = Math.max(1, Math.min(200, Math.round(Number.isFinite(Number(value)) ? Number(value) : 20)));
    if (mode === 'simpson' && count % 2 !== 0) count = count >= 200 ? 198 : count + 1;
    return count;
  }

  function classifyCalculusApproximation(estimate, exactValue) {
    var estimateNumber = Number(estimate);
    var exactNumber = Number(exactValue);
    if (!Number.isFinite(estimateNumber) || !Number.isFinite(exactNumber)) return 'undefined';
    var tolerance = Math.max(1e-9, Math.abs(exactNumber) * 1e-9);
    if (Math.abs(estimateNumber - exactNumber) <= tolerance) return 'exact';
    return estimateNumber > exactNumber ? 'over' : 'under';
  }

  function clampCalculusNumber(value, min, max, fallback) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = fallback;
    return Math.max(min, Math.min(max, number));
  }

  function calculusChallengeAnswerIsCorrect(mode, chosen, answer) {
    if (mode === 'exact') {
      var chosenNumber = Number(chosen);
      var answerNumber = Number(answer);
      return Number.isFinite(chosenNumber) && Number.isFinite(answerNumber) &&
        Math.abs(chosenNumber - answerNumber) <= 0.00051;
    }
    if (mode === 'minN') return Number(chosen) === Number(answer);
    return chosen === answer;
  }

  function leftRiemannEstimate(a, b, c, xMax, subdivisions) {
    var n = Math.max(1, Math.round(Number(subdivisions)));
    var dx = xMax / n;
    var estimate = 0;
    for (var i = 0; i < n; i++) {
      var x = i * dx;
      estimate += (a * x * x + b * x + c) * dx;
    }
    return estimate;
  }

  function minimumLeftRiemannSubdivisions(a, b, c, xMax, threshold, maxN) {
    var exactValue = (a / 3) * xMax * xMax * xMax + (b / 2) * xMax * xMax + c * xMax;
    // From n = 1: one rectangle is a Left sum too, and starting at 2 called 2 the
    // smallest n when 1 already met the target (f = -x^2 + x on [0, 2], error < 1).
    for (var n = 1; n <= maxN; n++) {
      if (Math.abs(leftRiemannEstimate(a, b, c, xMax, n) - exactValue) < threshold) return n;
    }
    return null;
  }

  window.__CalculusCore = Object.assign({}, window.__CalculusCore || {}, {
    normalizeSubdivisions: normalizeCalculusSubdivisions,
    classifyApproximation: classifyCalculusApproximation,
    clampNumber: clampCalculusNumber,
    challengeAnswerIsCorrect: calculusChallengeAnswerIsCorrect,
    leftRiemannEstimate: leftRiemannEstimate,
    minimumLeftSubdivisions: minimumLeftRiemannSubdivisions
  });

  // ══ Typed functions: a small recursive-descent parser. Student text is never eval'd. ══
  // Accepts sin(x), sin x, e^x, ln x, |x|, 2x, 2(x+1), (x+1)(x-1), x^(1/3), π, √, ², sin^2 x, sin^-1 x.
  var CALC_FN_NAMES = ['arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan', 'sqrt', 'cbrt', 'sign', 'floor', 'abs', 'exp', 'sgn', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'ln', 'log'];
  var CALC_NAME_LIST = CALC_FN_NAMES.concat(['pi', 'x', 'e']).sort(function(a, b) { return b.length - a.length; });
  var CALC_FN_CANON = { arcsin: 'asin', arccos: 'acos', arctan: 'atan', sgn: 'sign' };
  var CALC_INVERSE = { sin: 'asin', cos: 'acos', tan: 'atan' };
  function calcSign(u) { return u > 0 ? 1 : u < 0 ? -1 : 0; }
  var CALC_FN_IMPL = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: function(u) { return (Math.exp(u) - Math.exp(-u)) / 2; }, cosh: function(u) { return (Math.exp(u) + Math.exp(-u)) / 2; },
    tanh: function(u) { var a = Math.exp(2 * u); return isFinite(a) ? (a - 1) / (a + 1) : 1; },
    sec: function(u) { return 1 / Math.cos(u); }, csc: function(u) { return 1 / Math.sin(u); }, cot: function(u) { return Math.cos(u) / Math.sin(u); },
    sqrt: Math.sqrt, cbrt: function(u) { return u < 0 ? -Math.pow(-u, 1 / 3) : Math.pow(u, 1 / 3); }, abs: Math.abs, exp: Math.exp,
    ln: Math.log, log: function(u) { return Math.log(u) / Math.LN10; }, floor: Math.floor, sign: calcSign
  };
  // d/du of each function, for forward-mode (dual number) differentiation.
  var CALC_FN_DERIV = {
    sin: Math.cos, cos: function(u) { return -Math.sin(u); }, tan: function(u) { var c = Math.cos(u); return 1 / (c * c); },
    asin: function(u) { return 1 / Math.sqrt(1 - u * u); }, acos: function(u) { return -1 / Math.sqrt(1 - u * u); }, atan: function(u) { return 1 / (1 + u * u); },
    sinh: function(u) { return CALC_FN_IMPL.cosh(u); }, cosh: function(u) { return CALC_FN_IMPL.sinh(u); }, tanh: function(u) { var c = CALC_FN_IMPL.cosh(u); return 1 / (c * c); },
    sec: function(u) { return Math.sin(u) / (Math.cos(u) * Math.cos(u)); }, csc: function(u) { return -Math.cos(u) / (Math.sin(u) * Math.sin(u)); }, cot: function(u) { var s = Math.sin(u); return -1 / (s * s); },
    sqrt: function(u) { return u > 0 ? 1 / (2 * Math.sqrt(u)) : NaN; }, cbrt: function(u) { var r = CALC_FN_IMPL.cbrt(u); return u !== 0 ? 1 / (3 * r * r) : NaN; },
    abs: function(u) { return u === 0 ? NaN : calcSign(u); }, exp: Math.exp, ln: function(u) { return u > 0 ? 1 / u : NaN; },
    log: function(u) { return u > 0 ? 1 / (u * Math.LN10) : NaN; }, floor: function(u) { return Math.floor(u) === u ? NaN : 0; }, sign: function(u) { return u === 0 ? NaN : 0; }
  };
  function calcTokenize(text) {
    var s = String(text == null ? '' : text);
    if (s.length > 160) return { error: 'too_long' };
    s = s.toLowerCase().replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=/, '')
      .replace(/[\u2212\u2013\u2014]/g, '-').replace(/[\u00D7\u00B7\u22C5]/g, '*').replace(/\u00F7/g, '/')
      .replace(/\u03C0/g, 'pi').replace(/\u00B2/g, '^2').replace(/\u00B3/g, '^3').replace(/\u221A/g, 'sqrt').replace(/\*\*/g, '^')
      .replace(/[\[{]/g, '(').replace(/[\]}]/g, ')');
    var toks = [], i = 0;
    while (i < s.length) {
      var ch = s.charAt(i);
      if (/\s/.test(ch)) { i++; continue; }
      var num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (num) { toks.push({ type: 'num', v: parseFloat(num[1]), p: i, q: i + num[1].length }); i += num[1].length; continue; }
      if (/[a-z]/.test(ch)) {
        var run = /^[a-z]+/.exec(s.slice(i))[0], p = 0;
        while (p < run.length) {
          var hit = null;
          for (var k = 0; k < CALC_NAME_LIST.length; k++) { if (run.substr(p, CALC_NAME_LIST[k].length) === CALC_NAME_LIST[k]) { hit = CALC_NAME_LIST[k]; break; } }
          if (!hit) return { error: 'unknown_name', detail: run.charAt(p) };
          var tk0 = hit === 'x' ? { type: 'x' } : (hit === 'pi' || hit === 'e') ? { type: 'const', v: hit } : { type: 'fn', v: hit };
          tk0.p = i + p; tk0.q = i + p + hit.length; toks.push(tk0);
          p += hit.length;
        }
        i += run.length; continue;
      }
      if ('+-*/^(),|'.indexOf(ch) >= 0) { toks.push({ type: 'op', v: ch, p: i, q: i + 1 }); i++; continue; }
      return { error: 'bad_char', detail: ch };
    }
    return { tokens: toks, s: s };
  }
  function calcParse(text) {
    var tk = calcTokenize(text);
    if (tk.error) return { ok: false, error: tk.error, detail: tk.detail || '' };
    var toks = tk.tokens, i = 0, absDepth = 0, depth = 0, warnings = [], lastPow = null;
    if (!toks.length) return { ok: false, error: 'empty', detail: '' };
    function peek() { return toks[i]; }
    function isOp(tok, v) { return !!tok && tok.type === 'op' && tok.v === v; }
    function fail(code, detail) { var e = new Error(code); e.calcCode = code; e.calcDetail = detail || ''; throw e; }
    function startsFactor(tok) {
      if (!tok) return false;
      if (tok.type === 'num' || tok.type === 'x' || tok.type === 'const' || tok.type === 'fn') return true;
      return isOp(tok, '(') || (isOp(tok, '|') && absDepth === 0);
    }
    // "e^2x" is read as e^2·x; most students mean e^(2x). Flag an implicit factor x (or pi) written
    // straight after a bare-number exponent, with no space between, and offer the bracketed form.
    function noteAmbiguousPower(tok) {
      if (!lastPow || lastPow.end !== i || !(tok.type === 'x' || (tok.type === 'const' && tok.v === 'pi'))) return;
      var prev = toks[i - 1];
      if (!prev || prev.q !== tok.p || warnings.length) return;
      var from = toks[lastPow.start].p, to = tok.q, src = tk.s;
      warnings.push({ code: 'ambiguous_power', read: src.slice(0, from) + src.slice(from, prev.q) + '\u00B7' + src.slice(tok.p), suggestion: src.slice(0, from) + '(' + src.slice(from, to) + ')' + src.slice(to) });
    }
    function parseExpr() {      if (++depth > 60) fail('too_deep');
      var node = parseTerm();
      while (isOp(peek(), '+') || isOp(peek(), '-')) { var op = toks[i++].v; node = { t: op === '+' ? 'add' : 'sub', a: node, b: parseTerm() }; }
      depth--;
      return node;
    }
    function parseTerm() {
      var node = parseUnary();
      for (;;) {
        var tok = peek();
        if (isOp(tok, '*') || isOp(tok, '/')) { i++; node = { t: tok.v === '*' ? 'mul' : 'div', a: node, b: parseUnary() }; }
        else if (startsFactor(tok)) { noteAmbiguousPower(tok); node = { t: 'mul', a: node, b: parsePower() }; }
        else break;
      }
      return node;
    }
    function parseUnary() {
      if (isOp(peek(), '-')) { i++; return { t: 'neg', a: parseUnary() }; }
      if (isOp(peek(), '+')) { i++; return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      var base = parsePrimary();
      if (isOp(peek(), '^')) {
        i++; if (++depth > 60) fail('too_deep');
        var expStart = i, ex = parseUnary(); depth--;
        // A bare number exponent: remember where it ended, so "e^2x" can be flagged (read as e^2 times x).
        if (ex.t === 'num' || (ex.t === 'neg' && ex.a.t === 'num')) lastPow = { start: expStart, end: i };
        return { t: 'pow', a: base, b: ex };
      }
      return base;
    }
    // "sin x", "ln 2x", "sin x cos x": the argument is an implicit product that stops at the next function or operator.
    function parseFnArg() {
      var neg = false;
      if (isOp(peek(), '-')) { i++; neg = true; }
      var node = parsePower();
      while (peek() && (peek().type === 'num' || peek().type === 'x' || peek().type === 'const')) node = { t: 'mul', a: node, b: parsePower() };
      return neg ? { t: 'neg', a: node } : node;
    }
    function parsePrimary() {
      var tok = toks[i];
      if (!tok) fail('unexpected_end');
      if (tok.type === 'num') { i++; return { t: 'num', v: tok.v }; }
      if (tok.type === 'x') { i++; return { t: 'x' }; }
      if (tok.type === 'const') { i++; return { t: 'num', v: tok.v === 'pi' ? Math.PI : Math.E, name: tok.v }; }
      if (tok.type === 'fn') {
        i++;
        var name = CALC_FN_CANON[tok.v] || tok.v, power = null;
        if (isOp(peek(), '^')) {
          i++;
          if (isOp(peek(), '-') && toks[i + 1] && toks[i + 1].type === 'num' && toks[i + 1].v === 1 && CALC_INVERSE[name]) { i += 2; name = CALC_INVERSE[name]; }
          else if (peek() && peek().type === 'num') { power = { t: 'num', v: toks[i].v }; i++; }
          else fail('bad_power', tok.v);
        }
        var arg, nx = peek();
        if (isOp(nx, '(')) { i++; arg = parseExpr(); if (!isOp(peek(), ')')) fail('missing_paren'); i++; }
        else if (nx && (nx.type !== 'op' || nx.v === '-' || (nx.v === '|' && absDepth === 0))) arg = parseFnArg();
        else fail('missing_arg', tok.v);
        var node = { t: 'fn', name: name, a: arg };
        return power ? { t: 'pow', a: node, b: power } : node;
      }
      if (isOp(tok, '(')) {
        i++;
        var saved = absDepth; absDepth = 0;
        var inner = parseExpr();
        absDepth = saved;
        if (!isOp(peek(), ')')) fail('missing_paren');
        i++;
        return inner;
      }
      if (isOp(tok, '|')) {
        i++; absDepth++;
        var inn = parseExpr();
        if (!isOp(peek(), '|')) fail('missing_bar');
        i++; absDepth--;
        return { t: 'fn', name: 'abs', a: inn };
      }
      fail('unexpected', tok.v);
    }
    try {
      var ast = parseExpr();
      if (i < toks.length) fail('unexpected', toks[i].type === 'op' ? toks[i].v : String(toks[i].v));
      return { ok: true, ast: ast, warnings: warnings };
    } catch (e) {
      return { ok: false, error: e.calcCode || 'syntax', detail: e.calcDetail || '' };
    }
  }
  function calcHasX(n) { return !!n && (n.t === 'x' || calcHasX(n.a) || calcHasX(n.b)); }
  // Real powers: x^(1/3) of a negative x is the real cube root.
  function calcPow(a, b) {
    var r = Math.pow(a, b);
    if (r !== r && a < 0 && isFinite(b)) {
      for (var q = 3; q <= 9; q += 2) { var p = b * q; if (Math.abs(p - Math.round(p)) < 1e-9) { var m = Math.pow(-a, b); return Math.round(p) % 2 === 0 ? m : -m; } }
    }
    return r;
  }
  function calcCompileNode(n) {
    var a, b, f;
    switch (n.t) {
      case 'num': var v = n.v; return function() { return v; };
      case 'x': return function(x) { return x; };
      case 'neg': a = calcCompileNode(n.a); return function(x) { return -a(x); };
      case 'add': a = calcCompileNode(n.a); b = calcCompileNode(n.b); return function(x) { return a(x) + b(x); };
      case 'sub': a = calcCompileNode(n.a); b = calcCompileNode(n.b); return function(x) { return a(x) - b(x); };
      case 'mul': a = calcCompileNode(n.a); b = calcCompileNode(n.b); return function(x) { return a(x) * b(x); };
      case 'div': a = calcCompileNode(n.a); b = calcCompileNode(n.b); return function(x) { return a(x) / b(x); };
      case 'pow': a = calcCompileNode(n.a); b = calcCompileNode(n.b); return function(x) { return calcPow(a(x), b(x)); };
      default: f = CALC_FN_IMPL[n.name]; a = calcCompileNode(n.a); return function(x) { return f(a(x)); };
    }
  }
  // Forward-mode differentiation: each node returns [value, derivative] at x.
  function calcDualNode(n) {
    var a, b, f, df;
    switch (n.t) {
      case 'num': var v = n.v; return function() { return [v, 0]; };
      case 'x': return function(x) { return [x, 1]; };
      case 'neg': a = calcDualNode(n.a); return function(x) { var p = a(x); return [-p[0], -p[1]]; };
      case 'add': a = calcDualNode(n.a); b = calcDualNode(n.b); return function(x) { var p = a(x), q = b(x); return [p[0] + q[0], p[1] + q[1]]; };
      case 'sub': a = calcDualNode(n.a); b = calcDualNode(n.b); return function(x) { var p = a(x), q = b(x); return [p[0] - q[0], p[1] - q[1]]; };
      case 'mul': a = calcDualNode(n.a); b = calcDualNode(n.b); return function(x) { var p = a(x), q = b(x); return [p[0] * q[0], p[1] * q[0] + p[0] * q[1]]; };
      case 'div': a = calcDualNode(n.a); b = calcDualNode(n.b); return function(x) { var p = a(x), q = b(x); return [p[0] / q[0], (p[1] * q[0] - p[0] * q[1]) / (q[0] * q[0])]; };
      case 'pow':
        a = calcDualNode(n.a); b = calcDualNode(n.b);
        if (!calcHasX(n.b)) return function(x) { var p = a(x), k = b(x)[0], val = calcPow(p[0], k); return [val, k === 0 || p[1] === 0 ? 0 : k * calcPow(p[0], k - 1) * p[1]]; };
        return function(x) { var p = a(x), q = b(x), val = calcPow(p[0], q[0]); return [val, val * (q[1] * Math.log(p[0]) + (p[1] === 0 ? 0 : q[0] * p[1] / p[0]))]; };
      default:
        f = CALC_FN_IMPL[n.name]; df = CALC_FN_DERIV[n.name]; a = calcDualNode(n.a);
        return function(x) { var p = a(x); return [f(p[0]), p[1] === 0 ? 0 : df(p[0]) * p[1]]; };
    }
  }
  var CALC_PREC = { add: 1, sub: 1, mul: 2, div: 2, neg: 3, pow: 4, num: 5, x: 5, fn: 5 };
  function calcFmtNum(v) {
    if (!isFinite(v)) return '?';
    var r = Math.round(v * 1e6) / 1e6;
    if (r === 0) r = 0;
    var s = String(r);
    return s.charAt(0) === '-' ? '\u2212' + s.slice(1) : s;
  }
  // How the parser read the text, so implicit multiplication is never a surprise.
  function calcPrint(n, parentPrec) {
    var p = CALC_PREC[n.t] || 5, s;
    switch (n.t) {
      case 'num': s = n.name === 'pi' ? '\u03C0' : n.name === 'e' ? 'e' : calcFmtNum(n.v); break;
      case 'x': s = 'x'; break;
      case 'neg': s = '\u2212' + calcPrint(n.a, 3); break;
      case 'add': s = calcPrint(n.a, 1) + ' + ' + calcPrint(n.b, 1.5); break;
      case 'sub': s = calcPrint(n.a, 1) + ' \u2212 ' + calcPrint(n.b, 1.5); break;
      case 'mul': s = calcPrint(n.a, 2) + '\u00B7' + calcPrint(n.b, 2.5); break;
      case 'div': s = calcPrint(n.a, 2) + '/' + calcPrint(n.b, 2.5); break;
      case 'pow': s = calcPrint(n.a, 4.5) + '^' + calcPrint(n.b, 4.5); break;
      default: s = n.name === 'abs' ? '|' + calcPrint(n.a, 0) + '|' : n.name + '(' + calcPrint(n.a, 0) + ')';
    }
    return p < parentPrec ? '(' + s + ')' : s;
  }
  var _calcCompileCache = {};
  var _calcCompileKeys = [];
  function calcCompileText(text) {
    var key = String(text == null ? '' : text);
    if (Object.prototype.hasOwnProperty.call(_calcCompileCache, key)) return _calcCompileCache[key];
    var parsed = calcParse(key), out;
    if (!parsed.ok) out = { ok: false, error: parsed.error, detail: parsed.detail, text: key };
    else {
      var fx = calcCompileNode(parsed.ast), dual = calcDualNode(parsed.ast);
      out = {
        ok: true, text: key, ast: parsed.ast, label: calcPrint(parsed.ast, 0), hasX: calcHasX(parsed.ast), warnings: parsed.warnings || [],
        f: function(x) { var y; try { y = fx(x); } catch (e) { y = NaN; } return typeof y === 'number' ? y : NaN; },
        df: function(x) { var y; try { y = dual(x)[1]; } catch (e) { y = NaN; } return typeof y === 'number' && isFinite(y) ? y : NaN; }
      };
    }
    _calcCompileCache[key] = out;
    _calcCompileKeys.push(key);
    if (_calcCompileKeys.length > 80) delete _calcCompileCache[_calcCompileKeys.shift()];
    return out;
  }

  // ══ Numerical calculus on any function ══
  function calcFinite(v) { return typeof v === 'number' && isFinite(v); }
  function calcRiemann(f, a, b, n, method) {
    n = Math.max(1, Math.round(Number(n) || 1));
    if (method === 'simpson' && n % 2) n += 1;
    var dx = (b - a) / n, sum = 0, ok = true, pieces = [], i;
    if (method === 'simpson') {
      for (i = 0; i < n; i += 2) {
        var x0 = a + i * dx, y0 = f(x0), y1 = f(x0 + dx), y2 = f(x0 + 2 * dx);
        if (!calcFinite(y0) || !calcFinite(y1) || !calcFinite(y2)) ok = false;
        sum += (y0 + 4 * y1 + y2) * dx / 3;
        pieces.push({ x: x0, w: dx * 2, hL: y0, hM: y1, hR: y2, type: 'simp' });
      }
    } else if (method === 'trapezoid') {
      for (i = 0; i < n; i++) {
        var tx = a + i * dx, tl = f(tx), tr = f(tx + dx);
        if (!calcFinite(tl) || !calcFinite(tr)) ok = false;
        sum += (tl + tr) / 2 * dx;
        pieces.push({ x: tx, w: dx, hL: tl, hR: tr, type: 'trap' });
      }
    } else {
      for (i = 0; i < n; i++) {
        var xi = a + i * dx, yi = f(method === 'right' ? xi + dx : method === 'midpoint' ? xi + dx / 2 : xi);
        if (!calcFinite(yi)) ok = false;
        sum += yi * dx;
        pieces.push({ x: xi, w: dx, h: yi, type: 'rect' });
      }
    }
    return { value: ok ? sum : NaN, ok: ok, pieces: pieces, n: n };
  }
  // A value at x, bridging a removable hole (0/0) by its neighbours. null when undefined.
  function calcSafeAt(f, x, span) {
    var y = f(x);
    if (calcFinite(y)) return y;
    var h = Math.max(1e-9, Math.abs(span) * 1e-7), l = f(x - h), r = f(x + h);
    if (calcFinite(l) && calcFinite(r) && Math.abs(l) < 1e8 && Math.abs(l - r) < 1e-3 * Math.max(1, Math.abs(l))) return (l + r) / 2;
    return null;
  }
  // Definite integral by adaptive Simpson after a scan for holes, gaps and poles.
  function calcIntegrate(f, a, b) {
    if (!calcFinite(a) || !calcFinite(b)) return { ok: false, reason: 'bounds' };
    if (a === b) return { ok: true, value: 0 };
    var sign = 1;
    if (a > b) { var tmp = a; a = b; b = tmp; sign = -1; }
    var span = b - a, N = 800, ys = [], i, x;
    for (i = 0; i <= N; i++) {
      x = a + span * i / N;
      var y = calcSafeAt(f, x, span);
      if (y === null) return { ok: false, reason: 'undefined', x: x };
      ys.push(y);
    }
    for (i = 1; i <= N; i++) {
      var y0 = ys[i - 1], y1 = ys[i], lo = a + span * (i - 1) / N, hi = a + span * i / N;
      // A pole with a sign change: bisect and watch whether |f| blows up.
      if ((y0 < 0) !== (y1 < 0) && y0 !== 0 && y1 !== 0) {
        var l = lo, r = hi, yl = y0;
        for (var k = 0; k < 60; k++) { var m = (l + r) / 2, ym = f(m); if (!calcFinite(ym)) break; if ((ym < 0) === (yl < 0)) { l = m; yl = ym; } else r = m; }
        var big = Math.max(Math.abs(f(l)), Math.abs(f(r)));
        if (!(big < 1e7)) return { ok: false, reason: 'unbounded', x: (l + r) / 2 };
      }
      // A pole without a sign change: a local peak of |f| that keeps growing.
      if (i < N && Math.abs(y1) > 50 && Math.abs(y1) >= Math.abs(y0) && Math.abs(y1) >= Math.abs(ys[i + 1])) {
        var L = lo, R = a + span * (i + 1) / N;
        for (var g = 0; g < 80; g++) { var c1 = L + (R - L) / 3, c2 = R - (R - L) / 3, f1 = Math.abs(f(c1)), f2 = Math.abs(f(c2)); if (!calcFinite(f1)) f1 = Infinity; if (!calcFinite(f2)) f2 = Infinity; if (f1 > f2) R = c2; else L = c1; }
        var peak = Math.abs(f((L + R) / 2));
        if (!(peak < 1e7)) return { ok: false, reason: 'unbounded', x: (L + R) / 2 };
      }
    }
    function F(t) { var v = calcSafeAt(f, t, span); return v === null ? 0 : v; }
    function simp(fa, fm, fb, w) { return w / 6 * (fa + 4 * fm + fb); }
    function rec(l, r, fl, fm, fr, whole, eps, depth) {
      var m = (l + r) / 2, lm = (l + m) / 2, rm = (m + r) / 2, flm = F(lm), frm = F(rm);
      var left = simp(fl, flm, fm, m - l), right = simp(fm, frm, fr, r - m);
      if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
      return rec(l, m, fl, flm, fm, left, eps / 2, depth - 1) + rec(m, r, fm, frm, fr, right, eps / 2, depth - 1);
    }
    var total = 0, parts = 64, scale = 0;
    ys.forEach(function(v) { scale = Math.max(scale, Math.abs(v)); });
    for (i = 0; i < parts; i++) {
      var pl = a + span * i / parts, pr = a + span * (i + 1) / parts, fl = F(pl), fr = F(pr), fm = F((pl + pr) / 2);
      total += rec(pl, pr, fl, fm, fr, simp(fl, fm, fr, pr - pl), Math.max(1e-13, scale * span * 1e-12) / parts, 14);
    }
    if (Math.abs(total) < 1e-12 * Math.max(1, scale * span)) total = 0;
    return { ok: calcFinite(total), value: sign * total, reason: calcFinite(total) ? '' : 'undefined' };
  }
  // x-values in (a, b) where f changes sign (bisection on an even scan).
  function calcSignChanges(f, a, b, n) {
    n = n || 600;
    var out = [], prevX = a, prevY = f(a);
    for (var i = 1; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (calcFinite(prevY) && calcFinite(y) && prevY !== 0 && y !== 0 && (prevY < 0) !== (y < 0)) {
        var l = prevX, r = x, yl = prevY;
        for (var k = 0; k < 60; k++) { var m = (l + r) / 2, ym = f(m); if (!calcFinite(ym) || ym === 0) { l = r = m; break; } if ((ym < 0) === (yl < 0)) { l = m; yl = ym; } else r = m; }
        out.push((l + r) / 2);
      } else if (y === 0 && i < n) out.push(x);
      prevX = x; prevY = y;
    }
    return out;
  }
  // Area above and below the axis on [a, b] for any integrable function.
  // zeros: optional x-values from the shared root engine; otherwise a sign-change scan.
  function calcSignedAreas(f, a, b, zeros) {
    var lo = Math.min(a, b), hi = Math.max(a, b);
    var inner = Array.isArray(zeros) ? zeros.filter(function(z) { return calcFinite(z) && z > lo && z < hi; }).sort(function(p, q) { return p - q; }) : calcSignChanges(f, lo, hi);
    var cuts = [lo].concat(inner).concat([hi]), pos = 0, neg = 0;
    for (var i = 1; i < cuts.length; i++) {
      if (cuts[i] - cuts[i - 1] <= 0) continue;
      var piece = calcIntegrate(f, cuts[i - 1], cuts[i]);
      if (!piece.ok) return null;
      if (f((cuts[i - 1] + cuts[i]) / 2) >= 0) pos += Math.abs(piece.value); else neg += Math.abs(piece.value);
    }
    return { positive: pos, negative: neg, total: pos + neg };
  }
  // Secant slopes near x: forward (one-sided) and centred, with their errors against f'(x).
  function calcSecantRows(f, df, x, hs) {
    var exact = df(x);
    return (hs || [1, 0.5, 0.1, 0.01, 0.001]).map(function(h) {
      var fwd = (f(x + h) - f(x)) / h, ctr = (f(x + h) - f(x - h)) / (2 * h);
      return { h: h, forward: fwd, centred: ctr, forwardError: calcFinite(exact) ? Math.abs(fwd - exact) : NaN, centredError: calcFinite(exact) ? Math.abs(ctr - exact) : NaN };
    });
  }
  // One-sided limits from tables of values, then the kind of behaviour at a.
  var CALC_LIMIT_HS = [0.1, 0.01, 0.001, 0.0001, 0.00001];
  function calcOneSide(f, a, side) {
    var vals = CALC_LIMIT_HS.map(function(h) { return { x: a + side * h, y: f(a + side * h) }; });
    var ys = vals.map(function(v) { return v.y; });
    if (ys.slice(2).some(function(y) { return !calcFinite(y); })) return { values: vals, kind: 'undefined', limit: null };
    var y3 = ys[3], y4 = ys[4], y2 = ys[2];
    if (Math.abs(y4) > 1e3 && Math.abs(y4) > 4 * Math.abs(y3) && Math.abs(y3) > 2 * Math.abs(y2)) return { values: vals, kind: y4 > 0 ? '+inf' : '-inf', limit: null };
    // Changes of one sign: a steady factor r < 1 settles (x^(1/3) at 0: r = 0.46, summed as a
    // geometric tail); steps that never shrink run off to infinity (ln|x| at 0).
    var d1 = ys[2] - ys[1], d2 = y3 - y2, d3 = y4 - y3, oneSign = calcFinite(d1) && d1 * d2 > 0 && d2 * d3 > 0;
    var r1 = oneSign ? Math.abs(d2 / d1) : NaN, r2 = oneSign ? Math.abs(d3 / d2) : NaN, steady = oneSign && Math.abs(r1 - r2) <= 0.05 && r2 <= 0.85;
    if (oneSign && r1 >= 0.95 && r2 >= 0.95 && Math.abs(y4) > Math.abs(y3) && Math.abs(y3) > Math.abs(y2)) return { values: vals, kind: y4 > 0 ? '+inf' : '-inf', limit: null };
    if (steady || (Math.abs(y4 - y3) <= 2e-3 * Math.max(1, Math.abs(y4)) && Math.abs(y3 - y2) <= 2e-2 * Math.max(1, Math.abs(y3)))) {
      var lim = Math.round((steady ? y4 + d3 * r2 / (1 - r2) : y4) * 1e4) / 1e4;
      if (lim === 0) lim = 0;
      return { values: vals, kind: 'finite', limit: lim };
    }
    return { values: vals, kind: 'none', limit: null };
  }
  function calcLimitProbe(f, a) {
    var left = calcOneSide(f, a, -1), right = calcOneSide(f, a, 1), at = f(a), kind, limit = null;
    var fa = calcFinite(at) ? at : null;
    if (left.kind === 'finite' && right.kind === 'finite') {
      if (Math.abs(left.limit - right.limit) <= 1e-3 * Math.max(1, Math.abs(left.limit))) {
        limit = left.limit;
        kind = fa !== null && Math.abs(fa - limit) <= 1e-3 * Math.max(1, Math.abs(limit)) ? 'continuous' : 'hole';
      } else kind = 'jump';
    } else if (left.kind === '+inf' && right.kind === '+inf') { kind = 'infinite'; limit = '+inf'; }
    else if (left.kind === '-inf' && right.kind === '-inf') { kind = 'infinite'; limit = '-inf'; }
    else if (/inf/.test(left.kind) || /inf/.test(right.kind)) kind = 'infinite';
    else if (left.kind === 'undefined' || right.kind === 'undefined') kind = 'onesided';
    else kind = 'oscillating';
    return { left: left, right: right, value: fa, kind: kind, limit: limit };
  }
  // Is the claim "limit L at a" honoured for this epsilon by this delta? 0 < |x - a| <= delta.
  function calcEpsDeltaCheck(f, a, L, eps, delta) {
    var worst = null, N = 400;
    function test(x) { var y = f(x), gap = calcFinite(y) ? Math.abs(y - L) : Infinity; if (!worst || gap > worst.gap) worst = { x: x, y: y, gap: gap }; }
    for (var side = -1; side <= 1; side += 2) {
      test(a + side * delta * 1e-6);
      for (var i = 1; i <= N; i++) test(a + side * delta * i / N);
    }
    return { trapped: worst.gap < eps, worst: worst };
  }
  function calcMaxDelta(f, a, L, eps, cap) {
    cap = cap || 2;
    if (!calcEpsDeltaCheck(f, a, L, eps, cap * 1e-5).trapped) return 0;
    if (calcEpsDeltaCheck(f, a, L, eps, cap).trapped) return cap;
    var lo = cap * 1e-5, hi = cap;
    for (var k = 0; k < 40; k++) { var m = (lo + hi) / 2; if (calcEpsDeltaCheck(f, a, L, eps, m).trapped) lo = m; else hi = m; }
    return lo;
  }

  // ══ Practice generators: endless, seeded by rng, every wrong option carries a named misconception ══
  // A small seeded generator, so a saved seed rebuilds the same practice item.
  function calcSeeded(seed) { var s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function calcPick(rng, list) { return list[Math.floor(rng() * list.length) % list.length]; }
  function calcRound(v, places) { var p = Math.pow(10, places == null ? 3 : places), r = Math.round(v * p) / p; return r === 0 ? 0 : r; }
  function calcShuffle(rng, list) { var a = list.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t2 = a[i]; a[i] = a[j]; a[j] = t2; } return a; }
  function calcQuadText(a, b, c) {
    var parts = [];
    function term(coef, body, first) {
      if (coef === 0) return;
      var abs = Math.abs(coef), cs = abs === 1 && body ? '' : String(abs);
      parts.push((coef < 0 ? (first ? '-' : ' - ') : (first ? '' : ' + ')) + cs + body);
    }
    term(a, 'x^2', true); term(b, 'x', !parts.length); term(c, '', !parts.length);
    return parts.length ? parts.join('') : '0';
  }
  // Numeric options: the answer plus misconception values, then plain near-misses if needed.
  function calcNumericOptions(rng, answer, wrong, places) {
    var opts = [{ id: String(calcRound(answer, places)), value: calcRound(answer, places), mis: '' }];
    function has(v) { return opts.some(function(o) { return Math.abs(o.value - v) < Math.pow(10, -(places == null ? 3 : places)) / 2; }); }
    wrong.forEach(function(w) { if (opts.length < 4 && calcFinite(w.value) && !has(calcRound(w.value, places))) opts.push({ id: String(calcRound(w.value, places)), value: calcRound(w.value, places), mis: w.mis }); });
    var guard = 0;
    while (opts.length < 4 && guard++ < 50) {
      var v = calcRound(answer + (Math.floor(rng() * 5) + 1) * (rng() < 0.5 ? 1 : -1) * (Math.abs(answer) > 20 ? Math.round(Math.abs(answer) / 10) : 1), places);
      if (!has(v)) opts.push({ id: String(v), value: v, mis: 'near_miss' });
    }
    return opts.sort(function(p, q) { return p.value - q.value; });
  }
  var CALC_INTEGRAL_SPECIALS = [
    { text: 'sin(x)', a: 0, b: Math.PI, bLabel: '\u03C0', answer: 2, wrong: [{ value: -2, mis: 'antideriv_sign' }, { value: 0, mis: 'used_f_not_F' }, { value: 1, mis: 'near_miss' }] },
    { text: 'cos(x)', a: 0, b: Math.PI / 2, bLabel: '\u03C0/2', answer: 1, wrong: [{ value: -1, mis: 'antideriv_sign' }, { value: Math.PI / 2, mis: 'height_times_width' }, { value: 0.5, mis: 'near_miss' }] },
    { text: 'e^x', a: 0, b: 1, bLabel: '1', answer: Math.E - 1, wrong: [{ value: Math.E, mis: 'forgot_lower' }, { value: 1 - Math.E, mis: 'reversed_bounds' }, { value: 1, mis: 'near_miss' }] },
    { text: '1/x', a: 1, b: Math.E, aLabel: '1', bLabel: 'e', answer: 1, wrong: [{ value: -1, mis: 'reversed_bounds' }, { value: (1 - 1 / (Math.E * Math.E)) / 2, mis: 'power_rule_on_reciprocal' }, { value: Math.E - 1, mis: 'height_times_width' }] },
    { text: '3x^2 - 2x', a: -1, b: 1, aLabel: '\u22121', bLabel: '1', answer: 2, wrong: [{ value: 0, mis: 'odd_cancel_everything' }, { value: 6, mis: 'forgot_divide' }, { value: -2, mis: 'reversed_bounds' }] }
  ];
  function calcGenEstimate(rng, band) {
    if ((band === 'ab' || band === 'bc') && rng() < 0.35) {
      var sp = calcPick(rng, CALC_INTEGRAL_SPECIALS);
      return { mode: 'estimate', fnText: sp.text, xMin: sp.a, xMax: sp.b, aLabel: sp.aLabel || String(sp.a), bLabel: sp.bLabel, answer: calcRound(sp.answer, 3),
        opts: calcNumericOptions(rng, sp.answer, sp.wrong, 3) };
    }
    var qa, qb, qc, qxMax = calcPick(rng, [1, 2, 3]);
    if (band === 'pre') { qa = 0; qb = calcPick(rng, [0, 1, 2, -1, 3]); qc = calcPick(rng, [1, 2, 3, 4]); }
    else { qa = calcPick(rng, [1, -1, 2, -2, 3]); qb = calcPick(rng, [0, 1, 2, -1, -2]); qc = calcPick(rng, [0, 1, 2, -1]); }
    var F = function(x) { return qa * x * x * x / 3 + qb * x * x / 2 + qc * x; }, f = function(x) { return qa * x * x + qb * x + qc; };
    var exact = F(qxMax) - F(0), wrong = [];
    if (band === 'pre') {
      wrong.push({ value: qxMax * f(qxMax), mis: 'rectangle_not_trapezoid' });
      wrong.push({ value: qxMax * f(qxMax) / 2, mis: 'triangle_not_trapezoid' });
      wrong.push({ value: qxMax * f(0), mis: 'rectangle_not_trapezoid' });
    } else {
      wrong.push({ value: qa * Math.pow(qxMax, 3) + qb * qxMax * qxMax + qc * qxMax, mis: 'forgot_divide' });
      var areas = calcSignedAreas(f, 0, qxMax);
      if (areas && areas.negative > 1e-9 && areas.positive > 1e-9) wrong.push({ value: areas.total, mis: 'forgot_signed' });
      wrong.push({ value: (2 * qa * qxMax + qb) - qb, mis: 'differentiated' });
      wrong.push({ value: qxMax * f(qxMax), mis: 'height_times_width' });
    }
    return { mode: 'estimate', a: qa, b: qb, c: qc, xMin: 0, xMax: qxMax, answer: calcRound(exact, 2), opts: calcNumericOptions(rng, exact, wrong, 2) };
  }
  // Shape facts the feedback uses: monotonicity, concavity, and whether f dips below the axis.
  function calcShapeFacts(f, a, b) {
    var n = 60, inc = true, dec = true, up = true, down = true, negative = false, positive = false, prev = null, h = (b - a) / n;
    for (var i = 0; i <= n; i++) {
      var x = a + h * i, y = f(x);
      if (y < -1e-12) negative = true; if (y > 1e-12) positive = true;
      if (prev !== null) { if (y < prev - 1e-12) inc = false; if (y > prev + 1e-12) dec = false; }
      prev = y;
      if (i > 0 && i < n) { var s2 = f(x + h) - 2 * y + f(x - h); if (s2 < -1e-12) up = false; if (s2 > 1e-12) down = false; }
    }
    return { increasing: inc && !dec, decreasing: dec && !inc, concaveUp: up && !down, concaveDown: down && !up, straight: up && down, negative: negative, positive: positive };
  }
  var CALC_OU_FUNCS = {
    pre: ['x^2', '2x + 1', '4 - x^2', 'x^2 + 1', '3 - x'],
    ab: ['x^2', 'e^x', 'sqrt(x)', '4 - x^2', 'x^3', 'x^2 - 2x', 'sin(x)', '1/(x+1)', 'ln(x+1)', '-x^2'],
    bc: ['e^(-x)', 'x^3 - 3x', 'sqrt(x+1)', 'cos(x)', 'x e^(-x)', 'ln(x+1)', 'x^2 - 2x', '-e^x']
  };
  function calcGenOverUnder(rng, band) {
    var list = CALC_OU_FUNCS[band] || CALC_OU_FUNCS.ab;
    var methods = band === 'pre' ? ['left', 'right'] : ['left', 'right', 'midpoint', 'trapezoid'];
    for (var guard = 0; guard < 40; guard++) {
      var text = calcPick(rng, list), xMax = calcPick(rng, [2, 3]), n = calcPick(rng, [3, 4, 6]), rule = calcPick(rng, methods);
      var cf = calcCompileText(text);
      if (!cf.ok) continue;
      var est = calcRiemann(cf.f, 0, xMax, n, rule), ex = calcIntegrate(cf.f, 0, xMax);
      if (!est.ok || !ex.ok) continue;
      var ans = classifyCalculusApproximation(est.value, ex.value);
      if (ans === 'undefined') continue;
      return { mode: 'overunder', fnText: text, xMin: 0, xMax: xMax, n: n, ruleMode: rule, answer: ans, estimate: est.value, exactValue: ex.value };
    }
    return { mode: 'overunder', fnText: 'x^2', xMin: 0, xMax: 2, n: 4, ruleMode: 'left', answer: 'under', estimate: 1.75, exactValue: 8 / 3 };
  }
  // Non-polynomial, cubic+ and non-smooth curves, and a random subset of methods, so different methods win.
  var CALC_METHOD_FUNCS = ['e^x', 'x^3', 'x^4', 'sin(x)', 'sqrt(x)', '1/(1+x)', 'ln(x+1)', '|x - 1.3|', 'x^3 - 2x', 'cos(2x)', 'e^(-x^2)', 'x^5/10'];
  var CALC_METHOD_IDS = ['left', 'right', 'midpoint', 'trapezoid', 'simpson'];
  function calcGenMethod(rng) {
    for (var guard = 0; guard < 80; guard++) {
      var text = calcPick(rng, CALC_METHOD_FUNCS), xMax = calcPick(rng, [2, 3]), n = calcPick(rng, [2, 4, 6]);
      var cf = calcCompileText(text);
      var ex = calcIntegrate(cf.f, 0, xMax);
      if (!ex.ok) continue;
      var errors = {};
      CALC_METHOD_IDS.forEach(function(m) { errors[m] = Math.abs(calcRiemann(cf.f, 0, xMax, n, m).value - ex.value); });
      var subset = calcShuffle(rng, CALC_METHOD_IDS).slice(0, calcPick(rng, [3, 3, 4, 5]));
      subset.sort(function(p, q) { return CALC_METHOD_IDS.indexOf(p) - CALC_METHOD_IDS.indexOf(q); });
      var ranked = subset.slice().sort(function(p, q) { return errors[p] - errors[q]; });
      // A clear winner only: at least 20% better than the runner-up.
      if (!(errors[ranked[0]] < errors[ranked[1]] * 0.8)) continue;
      return { mode: 'method', fnText: text, xMin: 0, xMax: xMax, n: n, answer: ranked[0], errors: errors, choices: subset, exactValue: ex.value };
    }
    return { mode: 'method', fnText: 'e^x', xMin: 0, xMax: 2, n: 4, answer: 'simpson', errors: { left: 1, right: 1, midpoint: 0.1, trapezoid: 0.2, simpson: 0.001 }, choices: CALC_METHOD_IDS.slice(), exactValue: Math.exp(2) - 1 };
  }
  // Why a chosen method lost: the named misconception behind the choice.
  function calcMethodMisconception(q, chosen) {
    var cf = calcCompileText(q.fnText || calcQuadText(q.a || 0, q.b || 0, q.c || 0));
    var facts = cf.ok ? calcShapeFacts(cf.f, q.xMin || 0, q.xMax) : {};
    var smooth = !/\|/.test(q.fnText || '') && !/sqrt/.test(q.fnText || '');
    if (chosen === 'simpson' && !smooth) return 'simpson_needs_smooth';
    if (chosen === 'left' && facts.increasing) return 'left_on_increasing';
    if (chosen === 'right' && facts.decreasing) return 'right_on_decreasing';
    if ((chosen === 'left' || chosen === 'right') && (q.answer === 'midpoint' || q.answer === 'trapezoid' || q.answer === 'simpson')) return 'endpoint_order';
    if (chosen === 'trapezoid' && q.answer === 'midpoint') return 'trapezoid_vs_midpoint';
    if (chosen === 'midpoint' && q.answer === 'trapezoid') return 'midpoint_not_always';
    if (q.answer === 'simpson') return 'simpson_on_smooth';
    return 'compare_errors';
  }
  function calcOverUnderMisconception(q) {
    var cf = calcCompileText(q.fnText || calcQuadText(q.a || 0, q.b || 0, q.c || 0));
    if (!cf.ok) return 'compare_errors';
    var facts = calcShapeFacts(cf.f, q.xMin || 0, q.xMax);
    // Midpoint, trapezoid and Simpson's follow from the bending or the degree, whatever the sign of f.
    if (q.ruleMode === 'simpson') return 'simpson_degree';
    if (q.ruleMode === 'midpoint' || q.ruleMode === 'trapezoid') {
      if (facts.straight) return 'straight_line';
      if (facts.concaveUp || facts.concaveDown) return q.ruleMode === 'midpoint' ? 'midpoint_concavity' : 'trapezoid_concavity';
      return 'mixed_shape';
    }
    if (facts.straight && !facts.increasing && !facts.decreasing) return 'straight_line';
    if (facts.negative) return 'forgot_signed';
    if (q.ruleMode === 'left' && facts.increasing) return 'left_on_increasing';
    if (q.ruleMode === 'left' && facts.decreasing) return 'left_on_decreasing';
    if (q.ruleMode === 'right' && facts.increasing) return 'right_on_increasing';
    if (q.ruleMode === 'right' && facts.decreasing) return 'right_on_decreasing';
    return 'mixed_shape';
  }
  function calcGenDeriv(rng, band) {
    if (band !== 'pre' && rng() < 0.4) {
      var k = calcPick(rng, [2, 3, -2, 0.5]);
      var kind = calcPick(rng, band === 'bc' ? ['sin', 'exp', 'cubic', 'cos'] : ['sin', 'exp', 'cubic']);
      if (kind === 'sin') return { mode: 'deriv', fnText: 'sin(' + k + 'x)', x0: 0, answer: k, opts: calcNumericOptions(rng, k, [{ value: 1, mis: 'chain_rule' }, { value: 0, mis: 'height_not_slope' }, { value: -k, mis: 'trig_sign' }], 2) };
      if (kind === 'cos') return { mode: 'deriv', fnText: 'cos(' + k + 'x)', x0: 0, answer: 0, opts: calcNumericOptions(rng, 0, [{ value: 1, mis: 'height_not_slope' }, { value: -k, mis: 'flat_at_peak' }, { value: k, mis: 'trig_sign' }], 2) };
      if (kind === 'exp') return { mode: 'deriv', fnText: 'e^(' + k + 'x)', x0: 0, answer: k, opts: calcNumericOptions(rng, k, [{ value: 1, mis: 'chain_rule' }, { value: 0, mis: 'power_rule_on_exp' }, { value: k * k, mis: 'near_miss' }], 2) };
      var ca = calcPick(rng, [1, 2, -1]), cb = calcPick(rng, [0, 3, -3, 1]), cx = calcPick(rng, [1, 2, -1]);
      return { mode: 'deriv', fnText: (ca === 1 ? '' : ca === -1 ? '-' : ca) + 'x^3' + (cb ? (cb > 0 ? ' + ' : ' - ') + Math.abs(cb) + 'x' : ''), x0: cx, answer: 3 * ca * cx * cx + cb,
        opts: calcNumericOptions(rng, 3 * ca * cx * cx + cb, [{ value: ca * cx * cx * cx + cb * cx, mis: 'height_not_slope' }, { value: ca * cx * cx + cb, mis: 'power_rule_bring_down' }, { value: 3 * ca * cx * cx, mis: 'dropped_linear_term' }], 2) };
    }
    var qa = calcPick(rng, [1, -1, 2, -2, 3]), qb = calcPick(rng, [0, 1, 2, -1, -3]), qc = calcPick(rng, [0, 1, -2, 4]);
    var qx = calcPick(rng, band === 'pre' ? [0, 1, 2, -1] : [0, 1, 2, -1, 0.5, 3]);
    var slope = 2 * qa * qx + qb;
    return { mode: 'deriv', a: qa, b: qb, c: qc, x0: qx, answer: slope,
      opts: calcNumericOptions(rng, slope, [{ value: qa * qx * qx + qb * qx + qc, mis: 'height_not_slope' }, { value: qa * qx + qb, mis: 'power_rule_bring_down' }, { value: slope + qc, mis: 'constant_derivative' }], 2) };
  }
  function calcGenExact(rng, band) {
    var qa = band === 'pre' ? 0 : calcPick(rng, [0, 1, -1, 2, 3]), qb = calcPick(rng, [0, 1, 2, 3, -2]), qc = calcPick(rng, [0, 1, 2]);
    if (qa === 0 && qb === 0 && qc === 0) qc = 2;
    var qxMax = calcPick(rng, [1, 2, 3]);
    var exact = calcRound(qa * Math.pow(qxMax, 3) / 3 + qb * qxMax * qxMax / 2 + qc * qxMax, 3);
    return { mode: 'exact', a: qa, b: qb, c: qc, xMin: 0, xMax: qxMax, answer: exact,
      traps: [{ value: qa * Math.pow(qxMax, 3) + qb * qxMax * qxMax + qc * qxMax, mis: 'forgot_divide' }, { value: 2 * qa * qxMax + qb, mis: 'differentiated' }, { value: -exact, mis: 'antideriv_sign' }] };
  }
  function calcGenMinN(rng) {
    var qa = calcPick(rng, [1, -1, 2]), qb = calcPick(rng, [0, 1]), qxMax = calcPick(rng, [2, 3]), thr = calcPick(rng, [1, 0.5, 0.25]);
    var minN = minimumLeftRiemannSubdivisions(qa, qb, 0, qxMax, thr, 200);
    if (minN === null) { thr = 0.5; minN = minimumLeftRiemannSubdivisions(qa, qb, 0, qxMax, thr, 200); }
    if (minN === null) minN = 1;
    var opts = [minN], cands = [minN - 5, minN - 3, minN - 2, minN - 1, minN + 1, minN + 2, minN + 3, minN + 5, Math.ceil(minN * 1.5), Math.min(200, minN * 2)]
      .filter(function(v, i, arr) { return v >= 1 && v <= 200 && v !== minN && arr.indexOf(v) === i; });
    while (opts.length < 4 && cands.length > 0) opts.push(cands.splice(Math.floor(rng() * cands.length), 1)[0]);
    opts.sort(function(p, q) { return p - q; });
    return { mode: 'minN', a: qa, b: qb, c: 0, xMin: 0, xMax: qxMax, answer: minN, threshold: thr,
      opts: opts.map(function(v) { return { id: String(v), value: v, mis: v > minN ? 'not_smallest' : v < minN ? 'too_coarse' : '' }; }) };
  }
  function calcGenAvgRate(rng) {
    var qa = calcPick(rng, [1, -1, 2, 0.5]), qb = calcPick(rng, [0, 1, -2, 3]), qc = calcPick(rng, [0, 1, 4]);
    var p = calcPick(rng, [0, 1, -1]), q = p + calcPick(rng, [2, 3, 4]);
    var f = function(x) { return qa * x * x + qb * x + qc; };
    var rate = (f(q) - f(p)) / (q - p);
    return { mode: 'avgrate', a: qa, b: qb, c: qc, xMin: p, xMax: q, p: p, q: q, answer: calcRound(rate, 2),
      opts: calcNumericOptions(rng, rate, [{ value: f(q) - f(p), mis: 'forgot_dx' }, { value: (q - p) / (f(q) - f(p)), mis: 'flipped_rate' }, { value: 2 * qa * q + qb, mis: 'instant_vs_average' }], 2) };
  }
  // BC: Maclaurin coefficients as exact fractions.
  function calcGcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t2 = a % b; a = b; b = t2; } return a || 1; }
  function calcFact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  function calcFrac(num, den) { if (den < 0) { num = -num; den = -den; } var g = calcGcd(num, den); return { num: num / g, den: den / g }; }
  function calcFracText(fr) { if (fr.num === 0) return '0'; var s = Math.abs(fr.num) + (fr.den === 1 ? '' : '/' + fr.den); return fr.num < 0 ? '\u2212' + s : s; }
  var CALC_TAYLOR_FUNCS = {
    'e^x': function(k) { return calcFrac(1, calcFact(k)); },
    'e^(2x)': function(k) { return calcFrac(Math.pow(2, k), calcFact(k)); },
    'sin(x)': function(k) { return k % 2 ? calcFrac((((k - 1) / 2) % 2 ? -1 : 1), calcFact(k)) : calcFrac(0, 1); },
    'cos(x)': function(k) { return k % 2 ? calcFrac(0, 1) : calcFrac(((k / 2) % 2 ? -1 : 1), calcFact(k)); },
    '1/(1-x)': function() { return calcFrac(1, 1); },
    'ln(1+x)': function(k) { return calcFrac(k % 2 ? 1 : -1, k); }
  };
  function calcGenTaylor(rng) {
    var name = calcPick(rng, Object.keys(CALC_TAYLOR_FUNCS)), k = calcPick(rng, [2, 3, 4, 5]);
    var ans = CALC_TAYLOR_FUNCS[name](k), opts = [{ id: calcFracText(ans), mis: '' }];
    function add(fr, mis) { var id = calcFracText(fr); if (opts.length < 4 && !opts.some(function(o) { return o.id === id; })) opts.push({ id: id, mis: mis }); }
    // f^(k)(0) itself: the coefficient without the 1/k! division.
    add(calcFrac(ans.num * calcFact(k), ans.den), 'forgot_factorial');
    add(calcFrac(-ans.num, ans.den), 'alternating_sign');
    if (name === 'ln(1+x)') add(calcFrac(ans.num < 0 ? -1 : 1, calcFact(k)), 'k_vs_factorial'); else add(calcFrac(ans.num * calcFact(k), ans.den * k), 'k_vs_factorial');
    add(calcFrac(1, calcFact(k + 1)), 'off_by_one_power');
    add(calcFrac(1, calcFact(k)), 'even_odd_terms');
    add(calcFrac(2, calcFact(k)), 'near_miss');
    return { mode: 'taylor', fnText: name, k: k, answer: calcFracText(ans), opts: calcShuffle(rng, opts) };
  }
  var CALC_MODES_BY_BAND = {
    pre: ['estimate', 'overunder', 'avgrate', 'deriv'],
    ab: ['estimate', 'overunder', 'method', 'minN', 'exact', 'deriv'],
    bc: ['estimate', 'overunder', 'method', 'minN', 'exact', 'deriv', 'taylor']
  };
  function calcGenQuiz(mode, band, rng) {
    rng = rng || Math.random;
    band = CALC_MODES_BY_BAND[band] ? band : 'ab';
    var q = mode === 'overunder' ? calcGenOverUnder(rng, band) : mode === 'method' ? calcGenMethod(rng) : mode === 'minN' ? calcGenMinN(rng)
      : mode === 'exact' ? calcGenExact(rng, band) : mode === 'deriv' ? calcGenDeriv(rng, band) : mode === 'avgrate' ? calcGenAvgRate(rng)
      : mode === 'taylor' ? calcGenTaylor(rng) : calcGenEstimate(rng, band);
    q.band = band; q.answered = false; q.attempts = 0; q.tried = [];
    q.id = mode + '-' + Math.floor(rng() * 1e9).toString(36);
    return q;
  }
  function calcQuizAnswerIsCorrect(q, chosen) {
    if (!q) return false;
    if (q.mode === 'exact') return calculusChallengeAnswerIsCorrect('exact', chosen, q.answer);
    if (q.mode === 'method' || q.mode === 'overunder' || q.mode === 'taylor') return String(chosen) === String(q.answer);
    var a = Number(chosen), b = Number(q.answer);
    return calcFinite(a) && calcFinite(b) && Math.abs(a - b) < 1e-6;
  }
  // The misconception behind a wrong pick (or a typed value close to a trap).
  function calcQuizMisconception(q, chosen) {
    if (!q) return '';
    if (q.mode === 'method') return calcMethodMisconception(q, chosen);
    if (q.mode === 'overunder') return calcOverUnderMisconception(q);
    if (q.mode === 'exact') {
      var v = Number(chosen), hit = '';
      (q.traps || []).forEach(function(tr) { if (!hit && calcFinite(v) && Math.abs(v - tr.value) <= 0.0051 + Math.abs(tr.value) * 1e-4) hit = tr.mis; });
      return hit || 'arithmetic';
    }
    var opt = (q.opts || []).filter(function(o) { return o && typeof o === 'object' && String(o.id) === String(chosen); })[0];
    return opt && opt.mis ? opt.mis : 'near_miss';
  }

  // ══ Graph match: f, f' and A(x) predict-then-check ══
  var CALC_MATCH_TEMPLATES = {
    pre: ['{a}x^2 - {k}', '{a}(x - {h})^2 - {k}', 'x^3/3 - x', '{k} - x^2/{a}', '2x - x^2/2'],
    ab: ['{a}(x - {h})^2 - {k}', 'x^3/3 - {k}x', 'sin({a}x)', 'cos(x) + x/{a}', 'x^3/6 - x^2/2', '2/(1 + x^2)', 'e^(x/2) - {k}', '{k} - x^2/{a}'],
    bc: ['x e^(-x^2)', 'sin(x) - x/{a}', 'x^3/6 - {k}x', 'ln(x^2 + 1) - {k}', 'atan(x)', '{a}(x - {h})^2 - {k}', 'cos({a}x)']
  };
  var CALC_MATCH_XMIN = -3, CALC_MATCH_XMAX = 3, CALC_MATCH_N = 121;
  function calcSampleFn(fn) {
    var out = [];
    for (var i = 0; i < CALC_MATCH_N; i++) { var x = CALC_MATCH_XMIN + (CALC_MATCH_XMAX - CALC_MATCH_XMIN) * i / (CALC_MATCH_N - 1); var y = fn(x); out.push({ x: Math.round(x * 1e6) / 1e6, y: calcFinite(y) ? y : null }); }
    return out;
  }
  function calcAccumulate(samples) {
    var acc = 0, out = [{ x: samples[0].x, y: 0 }];
    for (var i = 1; i < samples.length; i++) { acc += ((samples[i - 1].y || 0) + (samples[i].y || 0)) / 2 * (samples[i].x - samples[i - 1].x); out.push({ x: samples[i].x, y: acc }); }
    return out;
  }
  // Panels auto-scale, so two curves look alike when one is a shift-and-stretch of the other.
  function calcShapeKey(samples) {
    var ys = samples.map(function(s) { return s.y || 0; }), mean = 0, sd = 0;
    ys.forEach(function(y) { mean += y; }); mean /= ys.length;
    ys.forEach(function(y) { sd += (y - mean) * (y - mean); }); sd = Math.sqrt(sd / ys.length);
    return sd < 1e-9 ? ys.map(function() { return 0; }) : ys.map(function(y) { return (y - mean) / sd; });
  }
  function calcSameShape(p, q) { var kp = calcShapeKey(p), kq = calcShapeKey(q), worst = 0; for (var i = 0; i < kp.length; i++) worst = Math.max(worst, Math.abs(kp[i] - kq[i])); return worst < 0.12; }
  function calcGenMatch(rng, band, kind) {
    band = CALC_MATCH_TEMPLATES[band] ? band : 'ab';
    kind = kind === 'accum' ? 'accum' : 'deriv';
    for (var guard = 0; guard < 40; guard++) {
      var text = calcPick(rng, CALC_MATCH_TEMPLATES[band]).replace(/\{a\}/g, function() { return String(calcPick(rng, [1, 2, 3])); }).replace(/\{h\}/g, function() { return String(calcPick(rng, [1, -1, 0.5])); }).replace(/\{k\}/g, function() { return String(calcPick(rng, [1, 2, 0.5])); });
      var cf = calcCompileText(text);
      if (!cf.ok) continue;
      var fS = calcSampleFn(cf.f);
      if (fS.some(function(s) { return s.y === null; })) continue;
      var dS = calcSampleFn(cf.df), aS = calcAccumulate(fS);
      var d2S = calcSampleFn(function(x) { return (cf.df(x + 1e-4) - cf.df(x - 1e-4)) / 2e-4; });
      var neg = function(s) { return s.map(function(p) { return { x: p.x, y: -p.y }; }); };
      var absA = calcAccumulate(fS.map(function(p) { return { x: p.x, y: Math.abs(p.y) }; }));
      var correct = kind === 'deriv' ? dS : aS;
      var pool = kind === 'deriv'
        ? [{ s: fS, mis: 'height_not_slope' }, { s: neg(dS), mis: 'slope_sign' }, { s: aS, mis: 'rate_vs_accum' }, { s: d2S, mis: 'derivative_twice' }]
        : [{ s: fS, mis: 'area_is_height' }, { s: dS, mis: 'rate_vs_accum' }, { s: absA, mis: 'forgot_signed' }, { s: neg(aS), mis: 'slope_sign' }];
      var opts = [{ samples: correct, mis: '' }];
      calcShuffle(rng, pool).forEach(function(p) {
        if (opts.length >= 4 || p.s.some(function(s) { return s.y === null || !calcFinite(s.y); })) return;
        if (!opts.some(function(o) { return calcSameShape(o.samples, p.s); })) opts.push({ samples: p.s, mis: p.mis });
      });
      if (opts.length < 3) continue;
      opts = calcShuffle(rng, opts).map(function(o, i) { return { id: 'ABCD'.charAt(i), samples: o.samples, mis: o.mis }; });
      var answer = opts.filter(function(o) { return !o.mis; })[0].id;
      return { kind: kind, fnText: text, label: cf.label, given: fS, opts: opts, answer: answer, id: kind + '-' + Math.floor(rng() * 1e9).toString(36) };
    }
    return null;
  }

  // Limits practice: a formula and a point; the answer always comes from the probe, never by hand.
  function calcXMinus(a) { return a < 0 ? 'x + ' + (-a) : a === 0 ? 'x' : 'x - ' + a; }
  function calcGenLimit(rng, band) {
    var a = calcPick(rng, [1, 2, 3, -1, -2]), k = calcPick(rng, [2, 3, 4]);
    var pool = [
      function() { return { text: '(x^2 - ' + (a * a) + ')/(' + calcXMinus(a) + ')', a: a }; },
      function() { var b = calcPick(rng, [1, 2, -3]); return { text: '(' + calcQuadText(1, b - a, -a * b) + ')/(' + calcXMinus(a) + ')', a: a }; },
      function() { return { text: 'x^2 + ' + k, a: a }; },
      function() { return { text: 'floor(x)', a: a }; },
      function() { return { text: '|' + calcXMinus(a) + '|/(' + calcXMinus(a) + ')', a: a }; },
      function() { return { text: '1/(' + calcXMinus(a) + ')^2', a: a }; },
      function() { return { text: '1/(' + calcXMinus(a) + ')', a: a }; }
    ];
    if (band !== 'pre') pool.push(
      function() { return { text: 'sin(' + k + 'x)/x', a: 0 }; },
      function() { return { text: '(e^x - 1)/x', a: 0 }; },
      function() { return { text: 'sin(1/x)', a: 0 }; });
    if (band === 'bc') pool.push(
      function() { return { text: '(1 - cos(x))/x^2', a: 0 }; },
      function() { return { text: 'x sin(1/x)', a: 0 }; });
    for (var guard = 0; guard < 30; guard++) {
      var item = calcPick(rng, pool)();
      var cf = calcCompileText(item.text);
      if (!cf.ok) continue;
      var probe = calcLimitProbe(cf.f, item.a);
      if (probe.kind === 'onesided') continue;
      item.probe = probe;
      item.answer = probe.limit === '+inf' || probe.limit === '-inf' ? probe.limit : (typeof probe.limit === 'number' ? 'number' : 'dne');
      return item;
    }
    return { text: '(x^2 - 4)/(x - 2)', a: 2, answer: 'number', probe: calcLimitProbe(calcCompileText('(x^2 - 4)/(x - 2)').f, 2) };
  }
  // Grade a limit prediction against the probe, with the misconception behind a wrong one.
  function calcGradeLimit(probe, pred) {
    var truth = probe.limit === '+inf' || probe.limit === '-inf' ? probe.limit : (typeof probe.limit === 'number' ? 'number' : 'dne');
    if (!pred || !pred.kind) return { correct: false, mis: '' };
    if (pred.kind === truth) {
      if (truth !== 'number') return { correct: true, mis: '' };
      var v = Number(pred.value);
      if (calcFinite(v) && Math.abs(v - probe.limit) <= Math.max(0.011, Math.abs(probe.limit) * 0.005)) return { correct: true, mis: '' };
      if (calcFinite(v) && v === 0 && probe.kind === 'hole') return { correct: false, mis: 'zero_over_zero' };
      return { correct: false, mis: 'read_both_sides' };
    }
    if (probe.kind === 'hole' && pred.kind === 'dne') return { correct: false, mis: 'hole_blocks_limit' };
    if (probe.kind === 'continuous' && pred.kind === 'dne') return { correct: false, mis: 'continuous_plug_in' };
    if (probe.kind === 'jump' && pred.kind === 'number') {
      var w = Number(pred.value);
      if (calcFinite(w) && (Math.abs(w - probe.left.limit) < 0.011 || Math.abs(w - probe.right.limit) < 0.011)) return { correct: false, mis: 'one_side_only' };
      return { correct: false, mis: 'jump_dne' };
    }
    if (probe.kind === 'infinite' && truth !== 'dne' && pred.kind === 'dne') return { correct: false, mis: 'infinite_same_sign' };
    if (probe.kind === 'infinite' && truth === 'dne') return { correct: false, mis: 'infinite_opposite_sides' };
    if (probe.kind === 'oscillating') return { correct: false, mis: 'oscillation_dne' };
    return { correct: false, mis: 'read_both_sides' };
  }

  // Visualize: Taylor targets with their Maclaurin coefficients, and the epsilon-delta claims.
  var VIZ_TAYLOR = {
    sin: { label: 'sin(x)', f: Math.sin, coef: function(k) { return k % 2 ? ((k - 1) / 2 % 2 ? -1 : 1) / calcFact(k) : 0; }, radius: Infinity },
    cos: { label: 'cos(x)', f: Math.cos, coef: function(k) { return k % 2 ? 0 : (k / 2 % 2 ? -1 : 1) / calcFact(k); }, radius: Infinity },
    exp: { label: 'e^x', f: Math.exp, coef: function(k) { return 1 / calcFact(k); }, radius: Infinity },
    ln1: { label: 'ln(1 + x)', f: function(x) { return Math.log(1 + x); }, coef: function(k) { return k === 0 ? 0 : (k % 2 ? 1 : -1) / k; }, radius: 1 },
    geo: { label: '1/(1 \u2212 x)', f: function(x) { return 1 / (1 - x); }, coef: function() { return 1; }, radius: 1 }
  };
  // exact(x0, y0) returns the solution through (x0, y0); null where no elementary formula exists.
  var VIZ_ODES = [
    { name: "y\u2032 = y", df: function(x, y) { return y; }, exact: function(x0, y0) { return function(x) { return y0 * Math.exp(x - x0); }; } },
    { name: "y\u2032 = x \u2212 y", df: function(x, y) { return x - y; }, exact: function(x0, y0) { return function(x) { return x - 1 + (y0 - x0 + 1) * Math.exp(-(x - x0)); }; } },
    { name: "y\u2032 = sin(x) \u2212 y", df: function(x, y) { return Math.sin(x) - y; }, exact: function(x0, y0) { var yp = function(x) { return (Math.sin(x) - Math.cos(x)) / 2; }; return function(x) { return yp(x) + (y0 - yp(x0)) * Math.exp(-(x - x0)); }; } },
    { name: "y\u2032 = xy", df: function(x, y) { return x * y; }, exact: function(x0, y0) { return function(x) { return y0 * Math.exp((x * x - x0 * x0) / 2); }; } },
    { name: "y\u2032 = sin(xy)", df: function(x, y) { return Math.sin(x * y); }, exact: null }
  ];
  function vizTaylorAt(fid, deg, x) { var T = VIZ_TAYLOR[fid] || VIZ_TAYLOR.sin, s = 0; for (var k = 0; k <= deg; k++) s += T.coef(k) * Math.pow(x, k); return s; }
  function vizTaylorText(fid, deg) {
    var T = VIZ_TAYLOR[fid] || VIZ_TAYLOR.sin, out = '';
    for (var k = 0; k <= deg; k++) {
      var cf = T.coef(k);
      if (!cf) continue;
      var fr = fid === 'ln1' ? calcFrac(k % 2 ? 1 : -1, k) : fid === 'geo' ? calcFrac(1, 1) : calcFrac(cf < 0 ? -1 : 1, calcFact(k));
      var mag = Math.abs(fr.num) === 1 && fr.den === 1 && k > 0 ? '' : Math.abs(fr.num) + (fr.den === 1 ? '' : '/' + fr.den);
      var body = k === 0 ? (mag || '1') : (mag && fr.den !== 1 ? (Math.abs(fr.num) === 1 ? '' : Math.abs(fr.num)) + (k === 1 ? 'x' : 'x^' + k) + '/' + fr.den : mag + (k === 1 ? 'x' : 'x^' + k));
      out += (out ? (fr.num < 0 ? ' \u2212 ' : ' + ') : (fr.num < 0 ? '\u2212' : '')) + body;
    }
    return out || '0';
  }
  var VIZ_EPS = {
    square: { label: 'x\u00B2', f: function(x) { return x * x; }, a: 2, L: 4, holds: true },
    linear: { label: '3x \u2212 1', f: function(x) { return 3 * x - 1; }, a: 1, L: 2, holds: true },
    sqrt: { label: '\u221Ax', f: Math.sqrt, a: 4, L: 2, holds: true },
    hole: { label: '(x\u00B2 \u2212 4)/(x \u2212 2)', f: function(x) { return (x * x - 4) / (x - 2); }, a: 2, L: 4, holds: true, hole: true },
    step: { label: 'sign(x)', f: calcSign, a: 0, L: 1, holds: false }
  };

  // ══ Stage B core: improper integrals, Euler's method, series, applied missions, AP free response ══
  // A typed number or bound: "2", "-5/6", "pi/2", "e", "inf", "-∞". No x allowed.
  function calcNumParse(text, allowInf) {
    var s = String(text == null ? '' : text).trim().toLowerCase().replace(/[\u2212\u2013]/g, '-');
    if (!s) return { ok: false, empty: true };
    var m = /^([+-]?)\s*(inf|infinity|\u221E|oo)$/.exec(s);
    if (m) return allowInf ? { ok: true, value: m[1] === '-' ? -Infinity : Infinity } : { ok: false };
    var c = calcCompileText(s);
    if (!c.ok || c.hasX) return { ok: false };
    var v = c.f(0);
    return calcFinite(v) ? { ok: true, value: v } : { ok: false };
  }
  // Snap a located bad point to a round value only when f is at least as bad there (1.37, not pi/2).
  function calcNumOr(v, fb) { return typeof v === 'number' && isFinite(v) ? v : fb; }
  function calcSnap(x, f) {
    var r = Math.round(x * 1e6) / 1e6; if (r === 0) r = 0;
    if (r === x || Math.abs(r - x) >= 1e-6) return x;
    if (!f) return r;
    var yr = f(r), yx = f(x);
    return !calcFinite(yr) || !calcFinite(yx) || Math.abs(yr) >= Math.abs(yx) ? r : x;
  }
  // One improper end. side 'lo': the trouble is at L (a bad point or -Infinity); 'hi': at R.
  // The integral is cut at t_1 ... t_K approaching the trouble (a decade closer each row), and the
  // change between rows decides: changes shrinking by a steady factor r < 0.9 settle (the tail is
  // summed as a geometric series); changes that do not shrink (r >= 0.98) grow without bound.
  function calcImproperEnd(f, L, R, side) {
    var c = side === 'lo' ? L : R, other = side === 'lo' ? R : L, cut, K;
    if (isFinite(c)) { var w = other - c; K = 8; cut = function(k) { return c + w * Math.pow(10, -k); }; }
    else { var m0 = Math.max(1, Math.abs(other)) * (c > 0 ? 1 : -1); K = 6; cut = function(k) { return m0 * Math.pow(10, k - 1); }; }
    var piece = function(p, q) { return side === 'lo' ? calcIntegrate(f, q, p) : calcIntegrate(f, p, q); };
    var t1 = cut(1), base = side === 'lo' ? calcIntegrate(f, t1, R) : calcIntegrate(f, L, t1);
    var out = { L: L, R: R, side: side, at: c, rows: [], verdict: 'unclear', value: null, ratio: null, direction: null };
    if (!base.ok) return out;
    var val = base.value, pieces = [];
    out.rows.push({ t: t1, value: val });
    for (var k = 1; k < K; k++) {
      var p = piece(cut(k), cut(k + 1));
      if (!p.ok) {
        // Out at infinity a failed piece means f overflowed (e^x): that end grows without bound.
        var fe = f(cut(k + 1));
        if (!isFinite(c) && (fe === Infinity || fe === -Infinity || (calcFinite(fe) && Math.abs(fe) >= 1e12))) pieces.push(fe > 0 ? Infinity : -Infinity);
        break;
      }
      pieces.push(p.value); val += p.value;
      out.rows.push({ t: cut(k + 1), value: val });
      if (!calcFinite(val) || Math.abs(val) > 1e15) break;
    }
    // The trouble point may be outside the domain on this side (sqrt(x) left of 0).
    if (isFinite(c)) { var fy = f(cut(K)); if (!calcFinite(fy) && pieces.length < 2) { out.verdict = 'domain'; return out; } }
    var n = pieces.length;
    if (n >= 1 && !calcFinite(pieces[n - 1])) { out.verdict = 'diverges'; out.direction = pieces[n - 1] > 0 ? '+inf' : '-inf'; return out; }
    if (n < 2) return out;
    var p3 = pieces[n - 1], p2 = pieces[n - 2], p1 = n >= 3 ? pieces[n - 3] : null;
    var scale = Math.max(1, Math.abs(val));
    // Swings too fast to sample make the table itself unreliable (sin(x^2) far out).
    var sw = calcTailSwing(f, c, other);
    if (sw && sw.unresolved) return out;
    // Before a "converges" verdict: swings that do not shrink near the trouble mean it never settles.
    var swings = function() {
      if (!sw) return false;
      if (sw.ratio >= 0.85 && sw.range > 1e-6 * scale) { out.verdict = 'diverges'; out.direction = 'osc'; out.swing = sw.range; return true; }
      return false;
    };
    if (Math.abs(p3) <= 1e-11 * scale && Math.abs(p2) <= 1e-9 * scale) { if (swings()) return out; out.verdict = 'converges'; out.value = val; out.ratio = 0; return out; }
    var r3 = p2 !== 0 ? Math.abs(p3 / p2) : Infinity, r2 = p1 !== null && p1 !== 0 ? Math.abs(p2 / p1) : r3;
    var rr = Math.max(r2, r3);
    out.ratio = r3;
    if (Math.abs(val) > 1e12 && Math.min(r2, r3) >= 0.98) { out.verdict = 'diverges'; out.direction = val > 0 ? '+inf' : '-inf'; return out; }
    // Ratios that keep climbing (1/(x ln²x): .40, .53, .62) mean a logarithmically slow tail: the
    // geometric extrapolation would undershoot, so the table cannot pin the value.
    if (rr <= 0.9 && !(r3 > r2 + 0.04 && r3 > 0.3)) {
      if (swings()) return out;
      var s = p3 / p2, tail = Math.abs(s) < 1 ? p3 * s / (1 - s) : 0;
      out.verdict = 'converges'; out.value = val + tail; return out;
    }
    if (Math.min(r2, r3) >= 0.98) {
      var alt = p3 * p2 < 0 && (p1 === null || p2 * p1 < 0);
      out.verdict = 'diverges'; out.direction = alt ? 'osc' : (p3 > 0 ? '+inf' : '-inf'); return out;
    }
    // Changes that stay large while the signs keep flipping (sin x out to infinity): the values swing forever.
    var big = 0.05 * Math.max(1, Math.abs(val)), last4 = pieces.slice(-4);
    if (last4.length >= 3 && last4.filter(function(v) { return Math.abs(v) >= big; }).length >= 3 && last4.some(function(v) { return v > 0; }) && last4.some(function(v) { return v < 0; })) { out.verdict = 'diverges'; out.direction = 'osc'; return out; }
    if (rr <= 0.9) out.slow = true;
    return out;
  }
  // Cauchy check. Decade cuts can land on matching phases of a swing (the integral of cos x at
  // 10^k), so measure how far the integral still rises and falls inside two windows near the
  // trouble, the second ten times closer. null: f does not change sign there.
  function calcTailSwing(f, c, other) {
    function win(u, v) {
      var N = 40000, step = (v - u) / N, acc = 0, lo = 0, hi = 0, prev = f(u), flips = 0;
      if (!calcFinite(prev)) return null;
      for (var i = 1; i <= N; i++) {
        var y = f(u + step * i);
        if (!calcFinite(y)) return null;
        if (y !== 0 && prev !== 0 && (y < 0) !== (prev < 0)) flips++;
        acc += (prev + y) / 2 * step; if (acc < lo) lo = acc; if (acc > hi) hi = acc;
        prev = y;
      }
      return { range: hi - lo, flips: flips };
    }
    var w1, w2;
    if (isFinite(c)) { var w = other - c; w1 = win(c + w * 1e-3, c + w * 2e-3); w2 = win(c + w * 1e-4, c + w * 2e-4); }
    else { var m0 = Math.max(1, Math.abs(other)) * (c > 0 ? 1 : -1), dir = c > 0 ? 60 : -60; w1 = win(m0 * 1e4, m0 * 1e4 + dir); w2 = win(m0 * 1e5, m0 * 1e5 + dir); }
    if (!w1 || !w2 || w1.flips < 2 || w2.flips < 2) return null;
    // Under 8 samples a swing: too fast to measure (sin(x^2) far out).
    if (w1.flips > 5000 || w2.flips > 5000) return { unresolved: true };
    return { range: w2.range, ratio: w1.range > 0 ? w2.range / w1.range : 0 };
  }
  // Does |f| keep growing as x closes in on z (from the side dir: 1 right, -1 left, 0 both)?
  function calcGrowsAt(f, z, span, dir) {
    var prev = null, ups = 0;
    for (var k = 2; k <= 8; k += 2) {
      var d = span * Math.pow(10, -k), ys = [];
      if (dir >= 0) ys.push(f(z + d));
      if (dir <= 0) ys.push(f(z - d));
      ys = ys.filter(calcFinite).map(Math.abs);
      if (!ys.length) return false;
      var y = Math.max.apply(null, ys);
      if (prev !== null) { if (y > prev * 1.05 && y - prev > 0.5) ups++; else return false; }
      prev = y;
    }
    return ups === 3 && prev > 10;
  }
  // An integral from a to b (either may be +-Infinity). Finds the bad points (undefined or unbounded),
  // splits there, and studies each improper end with a limit table.
  // kind: 'proper' | 'converges' | 'diverges' | 'unclear' | 'domain' | 'too_many' | 'bounds'.
  function calcImproper(f, a, b) {
    if (typeof a !== 'number' || typeof b !== 'number' || a !== a || b !== b || (a === b && !isFinite(a))) return { kind: 'bounds', parts: [] };
    if (a === b) return { kind: 'proper', value: 0, parts: [] };
    var sign = 1;
    if (a > b) { var t0 = a; a = b; b = t0; sign = -1; }
    var wa = isFinite(a) ? a : (isFinite(b) ? Math.min(b - 1, -1) : -1);
    var wb = isFinite(b) ? b : (isFinite(a) ? Math.max(a + 1, 1) : 1);
    var cuts = [wa, wb], bad = [];
    var isBad = function(v) { return bad.indexOf(v) >= 0; };
    for (var it = 0; it < 6; it++) {
      var found = false;
      for (var s = 0; s + 1 < cuts.length; s++) {
        var p = cuts[s], q = cuts[s + 1], eps = (q - p) * 1e-6;
        var r = calcIntegrate(f, isBad(p) ? p + eps : p, isBad(q) ? q - eps : q);
        if (r.ok) continue;
        if (r.reason !== 'undefined' && r.reason !== 'unbounded') return { kind: 'unclear', parts: [] };
        var x = calcSnap(r.x, f), tol = (q - p) / 400;
        if (Math.abs(x - p) <= tol) { if (isBad(p)) return { kind: 'domain', x: x, parts: [] }; bad.push(p); }
        else if (Math.abs(x - q) <= tol) { if (isBad(q)) return { kind: 'domain', x: x, parts: [] }; bad.push(q); }
        else { cuts.splice(s + 1, 0, x); bad.push(x); }
        found = true;
        break;
      }
      if (!found) break;
      if (cuts.length > 5) return { kind: 'too_many', parts: [] };
    }
    // calcIntegrate bridges slow blow-ups (|f| < 1e7 at its finest probe, x^(-1/3) at 0) and a log
    // singularity whose two sides agree (ln|x| at 0) as if they were holes. Check sign changes, peaks
    // of |f| and the bounds: if |f| keeps growing as x closes in, that point is improper too.
    var span0 = wb - wa, scanN = 800, cand = calcSignChanges(f, wa, wb, scanN), ysc = [];
    for (var si = 0; si <= scanN; si++) { var yv = f(wa + span0 * si / scanN); ysc.push(calcFinite(yv) ? Math.abs(yv) : Infinity); }
    for (si = 1; si < scanN; si++) if (ysc[si] >= ysc[si - 1] && ysc[si] >= ysc[si + 1] && ysc[si] > 2) cand.push(wa + span0 * si / scanN);
    if (isFinite(a)) cand.push(a);
    if (isFinite(b)) cand.push(b);
    cand.forEach(function(z0) {
      var z = calcSnap(z0, f);
      if (isBad(z) || bad.some(function(v) { return Math.abs(v - z) < span0 * 1e-4; })) return;
      if (calcGrowsAt(f, z, span0, z <= a ? 1 : z >= b ? -1 : 0)) { bad.push(z); if (z > wa && z < wb && cuts.indexOf(z) < 0) cuts.push(z); }
    });
    var inner = bad.filter(function(v) { return v > a && v < b; }).sort(function(u, v) { return u - v; });
    var loBad = !isFinite(a) || isBad(a), hiBad = !isFinite(b) || isBad(b);
    if (!loBad && !hiBad && !inner.length) {
      var whole = calcIntegrate(f, a, b);
      return whole.ok ? { kind: 'proper', value: sign * whole.value, parts: [] } : { kind: 'unclear', parts: [] };
    }
    var pts = [a].concat(inner).concat([b]), parts = [];
    for (var i = 0; i + 1 < pts.length; i++) {
      var Lp = pts[i], Rp = pts[i + 1], lb = i === 0 ? loBad : true, rb = i + 2 === pts.length ? hiBad : true;
      if (!lb && !rb) { var mid = calcIntegrate(f, Lp, Rp); parts.push({ L: Lp, R: Rp, side: 'none', rows: [], verdict: mid.ok ? 'converges' : 'unclear', value: mid.ok ? mid.value : null }); continue; }
      if (lb && rb) {
        var m = isFinite(Lp) && isFinite(Rp) ? (Lp + Rp) / 2 : isFinite(Rp) ? Rp - 1 : isFinite(Lp) ? Lp + 1 : 0;
        parts.push(calcImproperEnd(f, Lp, m, 'lo'));
        parts.push(calcImproperEnd(f, m, Rp, 'hi'));
      } else parts.push(calcImproperEnd(f, Lp, Rp, lb ? 'lo' : 'hi'));
    }
    var verdicts = parts.map(function(pp) { return pp.verdict; });
    var out = { kind: 'converges', parts: parts, value: null, sign: sign };
    if (verdicts.indexOf('domain') >= 0) out.kind = 'domain';
    else if (verdicts.indexOf('diverges') >= 0) {
      out.kind = 'diverges';
      var dirs = parts.filter(function(pp) { return pp.verdict === 'diverges'; }).map(function(pp) { return pp.direction; });
      out.direction = dirs.every(function(dd) { return dd === dirs[0]; }) ? dirs[0] : 'mixed';
      if (out.direction === '+inf' && sign < 0) out.direction = '-inf'; else if (out.direction === '-inf' && sign < 0) out.direction = '+inf';
      out.opposite = dirs.indexOf('+inf') >= 0 && dirs.indexOf('-inf') >= 0;
    }
    else if (verdicts.indexOf('unclear') >= 0) out.kind = 'unclear';
    else { var tot = 0; parts.forEach(function(pp) { tot += pp.value; }); out.value = sign * tot; if (Math.abs(out.value) < 1e-10) out.value = 0; }
    out.infinite = !isFinite(a) || !isFinite(b);
    return out;
  }
  // Grade a converge/diverge prediction; the misconception names what the wrong answer suggests.
  function calcGradeImproper(res, pred, f) {
    if (!res || (res.kind !== 'converges' && res.kind !== 'diverges') || !pred || !pred.kind) return { correct: false, mis: '' };
    if (res.kind === 'converges') {
      if (pred.kind === 'conv') {
        var v = calcNumParse(pred.value).value;
        if (calcFinite(v) && Math.abs(v - res.value) <= Math.max(0.01, Math.abs(res.value) * 0.005)) return { correct: true, mis: '' };
        return { correct: false, mis: 'improper_value' };
      }
      var anyBlow = res.parts.some(function(pp) { return pp.side !== 'none' && isFinite(pp.at); });
      return { correct: false, mis: anyBlow ? 'blowup_diverges' : 'infinite_length_diverges' };
    }
    if (pred.kind === 'div') return { correct: true, mis: '' };
    var pv = calcNumParse(pred.value).value;
    if (res.opposite && calcFinite(pv) && Math.abs(pv) < 1e-9) return { correct: false, mis: 'cancel_infinities' };
    var tailToZero = res.parts.some(function(pp) { if (pp.verdict !== 'diverges' || isFinite(pp.at)) return false; var big = pp.at > 0 ? 1e6 : -1e6, y = f ? f(big) : NaN; return calcFinite(y) && Math.abs(y) < 1e-3; });
    return { correct: false, mis: tailToZero ? 'terms_to_zero_integral' : 'improper_diverges' };
  }
  // Improper XP is paid once per FUNCTION and verdict, not per set of bounds (new bounds would farm it).
  // Same function = same values (10 significant digits) at fixed sample points, so x^(-2), 1/x^2
  // and 1/x^2 + 0 match; with fewer than 3 defined samples, the printed expression decides.
  var IMP_SAMPLE_X = [-61.7, -17.3, -3.71, -1.29, -0.53, 0.0137, 0.37, 0.83, 1.61, 2.47, 4.93, 9.17, 23.3, 71.9];
  function calcImpSignature(cf) {
    if (!cf || !cf.ok) return '';
    var n = 0, vals = IMP_SAMPLE_X.map(function(x) { var y = cf.f(x); if (!isFinite(y)) return y !== y ? 'n' : y > 0 ? 'i' : '-i'; n++; return String(Number(y.toPrecision(10))); });
    return n >= 3 ? vals.join(',') : 'L:' + cf.label;
  }
  function calcHashText(s) {
    var h1 = 2166136261, h2 = 5381;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = (Math.imul(h2, 33) + c) >>> 0; }
    return h1.toString(36) + h2.toString(36);
  }
  function calcImpCreditKey(cf, kind) {
    return 'imp:fn:' + calcHashText(calcImpSignature(cf)) + (kind ? ':' + kind : '');
  }
  // anti: and dfx: credit, in the autosaved missionXP map, is a hash of the function: the label
  // can be what a student typed. Same function = same key, as for imp:fn:. A label the parser
  // cannot read (a slider's printed f(x), an old or hostile key) hashes as text.
  function calcMissionFnKey(prefix, label) {
    var text = String(label == null ? '' : label), cf = calcCompileText(text);
    return prefix + ':fn:' + calcHashText(cf && cf.ok ? calcImpSignature(cf) : 'L:' + text);
  }
  // A key that can still hold what a student typed. Hashed forms are lower-case base 36 only.
  function calcIsPlainFnKey(k) {
    if (/^(anti|dfx):/.test(k)) return !/^(anti|dfx):fn:[0-9a-z]*$/.test(k);
    return k.indexOf('imp:') === 0 && !/^imp:fn:[0-9a-z]*(:(converges|diverges))?$/.test(k);
  }
  // 'imp:<label>|<a>|<b>' earned the verdict its label and bounds give, or every verdict if that
  // cannot be told: the same credit as calcImpLegacyEarned, in the hashed form. A key that gave
  // no credit there (no bounds, or a label the parser cannot read) still counts as an imp: key.
  function calcMigrateImpKey(k) {
    var body = k.slice(4), parts = body.split('|');
    if (parts.length < 3) return 'imp:fn:' + calcHashText('L:' + body);
    var label = parts.slice(0, -2).join('|'), src = calcCompileText(label);
    if (!src.ok) return 'imp:fn:' + calcHashText('L:' + label);
    var as = parts[parts.length - 2], bs = parts[parts.length - 1], a = Number(as), b = Number(bs), was = '';
    if (as !== '' && bs !== '' && a === a && b === b) { try { was = calcImproper(src.f, a, b).kind; } catch (e) { was = ''; } }
    return calcImpCreditKey(src, was === 'converges' || was === 'diverges' ? was : '');
  }
  // Older saves: 'anti:<label>', 'dfx:<label>' and 'imp:<label>|<a>|<b>' become hashed keys with the same credit.
  function calcMigrateFnKeys(flags) {
    var out = {};
    if (!flags || typeof flags !== 'object') return out;
    Object.keys(flags).forEach(function(k) {
      if (k === '__proto__') return;
      if (!calcIsPlainFnKey(k)) { out[k] = flags[k]; return; }
      if (!flags[k]) return;
      if (k.indexOf('imp:') === 0) out[calcMigrateImpKey(k)] = true;
      else out[calcMissionFnKey(k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1))] = true;
    });
    return out;
  }
  // Older credit: 'imp:fn:<hash>' (no verdict) covers every verdict of its function; 'imp:<label>|<a>|<b>'
  // covers the verdict recomputed from its label and bounds, or every verdict if that cannot be told.
  var _calcImpOldKind = {};
  function calcImpLegacyEarned(flags, cf, kind) {
    if (!flags || typeof flags !== 'object' || !cf || !cf.ok) return false;
    var sig = null, bare = calcImpCreditKey(cf);
    return Object.keys(flags).some(function(k) {
      if (!flags[k] || k.indexOf('imp:') !== 0) return false;
      if (k.indexOf('imp:fn:') === 0) return k === bare;
      var parts = k.slice(4).split('|');
      if (parts.length < 3) return false;
      var label = parts.slice(0, -2).join('|'), src = cf;
      if (label !== cf.label) {
        src = calcCompileText(label);
        if (!src.ok) return false;
        if (sig === null) sig = calcImpSignature(cf);
        if (calcImpSignature(src) !== sig) return false;
      }
      if (!kind) return true;
      if (!Object.prototype.hasOwnProperty.call(_calcImpOldKind, k)) {
        var as = parts[parts.length - 2], bs = parts[parts.length - 1], a = Number(as), b = Number(bs), was = '';
        if (as !== '' && bs !== '' && a === a && b === b) { try { was = calcImproper(src.f, a, b).kind; } catch (e) { was = ''; } }
        _calcImpOldKind[k] = was === 'converges' || was === 'diverges' ? was : '';
      }
      return !_calcImpOldKind[k] || _calcImpOldKind[k] === kind;
    });
  }

  // Euler's method on y' = f(x, y): straight steps along the slope field.
  function calcEuler(df, x0, y0, h, steps) {
    var pts = [{ x: x0, y: y0, slope: df(x0, y0) }], y = y0;
    for (var i = 0; i < steps; i++) {
      var s = df(x0 + i * h, y);
      if (!calcFinite(s)) break;
      y += h * s;
      if (!calcFinite(y) || Math.abs(y) > 1e9) break;
      var xn = x0 + (i + 1) * h;
      pts.push({ x: xn, y: y, slope: df(xn, y) });
    }
    return pts;
  }
  function calcRK4(df, x0, y0, x1, n) {
    var h = (x1 - x0) / n, y = y0, x = x0;
    for (var i = 0; i < n; i++) {
      var k1 = df(x, y), k2 = df(x + h / 2, y + h * k1 / 2), k3 = df(x + h / 2, y + h * k2 / 2), k4 = df(x + h, y + h * k3);
      y += h * (k1 + 2 * k2 + 2 * k3 + k4) / 6; x = x0 + (i + 1) * h;
    }
    return y;
  }
  // The true solution through (x0, y0): the exact formula, or a tiny-step RK4 reference.
  function calcOdeTruth(odeIdx, x0, y0) {
    var ode = VIZ_ODES[odeIdx] || VIZ_ODES[0];
    if (ode.exact) return { exact: true, at: ode.exact(x0, y0) };
    return { exact: false, at: function(x) {
      var key = odeIdx + '|' + x0 + '|' + y0 + '|' + x;
      if (Object.prototype.hasOwnProperty.call(_calcOdeCache, key)) return _calcOdeCache[key];
      var keys = Object.keys(_calcOdeCache); if (keys.length > 400) _calcOdeCache = {};
      return (_calcOdeCache[key] = x === x0 ? y0 : calcRK4(ode.df, x0, y0, x, Math.max(200, Math.ceil(Math.abs(x - x0) * 2000))));
    } };
  }
  var _calcOdeCache = {};
  var CALC_EULER_HS = [0.5, 0.25, 0.125, 0.0625];
  function calcEulerStudy(odeIdx, x0, y0, span) {
    var ode = VIZ_ODES[odeIdx] || VIZ_ODES[0], xEnd = x0 + span, truth = calcOdeTruth(odeIdx, x0, y0), yTrue = truth.at(xEnd);
    var rows = CALC_EULER_HS.map(function(h) {
      var pts = calcEuler(ode.df, x0, y0, h, Math.round(span / h)), last = pts[pts.length - 1];
      var ok = Math.abs(last.x - xEnd) < 1e-9;
      return { h: h, estimate: ok ? last.y : NaN, error: ok ? last.y - yTrue : NaN };
    });
    rows.forEach(function(r, i) { r.ratio = i > 0 && calcFinite(r.error) && calcFinite(rows[i - 1].error) && rows[i - 1].error !== 0 ? Math.abs(r.error / rows[i - 1].error) : null; });
    var maxErr = 0; rows.forEach(function(r) { if (calcFinite(r.error)) maxErr = Math.max(maxErr, Math.abs(r.error)); });
    var last = rows[rows.length - 1];
    // Euler is first order, so "about halved" is the only true answer. A ratio far below 1/2 is the
    // first-order error nearly cancelling at this seed (y' = sin(x) - y from (0.5, 1.5)): no fair item.
    var halving = last.ratio !== null && last.ratio >= 0.35 && last.ratio <= 0.7 ? 'half' : null;
    return { xEnd: xEnd, yTrue: yTrue, exact: truth.exact, rows: rows, tiny: maxErr < 1e-9, halving: halving, cancels: last.ratio !== null && last.ratio < 0.35, under: calcFinite(last.error) ? last.error < 0 : null, ok: calcFinite(yTrue) && rows.every(function(r) { return calcFinite(r.error); }) };
  }
  function calcGradeEuler(study, pick) {
    if (!study || !study.halving || !pick) return { correct: false, mis: '' };
    if (pick === study.halving) return { correct: true, mis: '' };
    return { correct: false, mis: pick === 'quarter' ? 'euler_second_order' : pick === 'same' ? 'euler_step_irrelevant' : pick === 'double' ? 'euler_more_steps_worse' : 'euler_first_order' };
  }

  // Series: a family plus parameters gives the term, the truth and which tests decide it.
  function calcLnFact(n) {
    if (n < 2) return 0;
    if (n <= 30) { var s = 0; for (var k = 2; k <= n; k++) s += Math.log(k); return s; }
    return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n) - 1 / (360 * n * n * n);
  }
  var CALC_ZETA = { '1.5': 2.612375348685488, '2': Math.PI * Math.PI / 6, '3': 1.2020569031595942 };
  function calcPowLabel(p) { return p === 0.5 ? '\u221An' : p === 1 ? 'n' : 'n^' + p; }
  // fam: p | geo | polyexp | expfact | factexp | rational | alt | tele.
  function calcSeriesMake(fam, a, b) {
    var s = { fam: fam, a: a, b: b, id: fam + ':' + a + ':' + (b == null ? '' : b), start: 1, sum: null, sumLabel: null, ratioL: 1, termLim: 0, decides: ['other'] };
    if (fam === 'p') {
      s.label = '\u03A3 1/' + calcPowLabel(a); s.term = function(n) { return 1 / Math.pow(n, a); }; s.conv = a > 1;
      if (CALC_ZETA[String(a)]) { s.sum = CALC_ZETA[String(a)]; s.sumLabel = a === 2 ? '\u03C0\u00B2/6' : null; }
    } else if (fam === 'geo') {
      var r = a / b; s.label = '\u03A3 (' + (a < 0 ? '\u2212' : '') + Math.abs(a) + '/' + b + ')^n'; s.term = function(n) { return Math.pow(r, n); };
      s.conv = Math.abs(r) < 1; s.ratioL = Math.abs(r); s.termLim = Math.abs(r) < 1 ? 0 : r > 1 ? Infinity : NaN;
      s.decides = Math.abs(r) < 1 ? ['ratio'] : ['divergence', 'ratio']; if (s.conv) s.sum = r / (1 - r);
    } else if (fam === 'polyexp') {
      var x = 1 / b; s.label = '\u03A3 ' + (a === 1 ? 'n' : 'n^' + a) + '/' + b + '^n'; s.term = function(n) { return Math.pow(n, a) / Math.pow(b, n); };
      s.conv = true; s.ratioL = 1 / b; s.decides = ['ratio']; s.sum = a === 1 ? x / ((1 - x) * (1 - x)) : x * (1 + x) / Math.pow(1 - x, 3);
    } else if (fam === 'expfact') {
      s.label = '\u03A3 ' + a + '^n/n!'; s.term = function(n) { return Math.exp(n * Math.log(a) - calcLnFact(n)); };
      s.conv = true; s.ratioL = 0; s.decides = ['ratio']; s.sum = Math.exp(a) - 1; s.sumLabel = 'e' + (a === 1 ? '' : '^' + a) + ' \u2212 1';
    } else if (fam === 'factexp') {
      s.label = '\u03A3 n!/' + a + '^n'; s.term = function(n) { return Math.exp(calcLnFact(n) - n * Math.log(a)); };
      s.conv = false; s.ratioL = Infinity; s.termLim = Infinity; s.decides = ['divergence', 'ratio'];
    } else if (fam === 'rational') {
      s.label = '\u03A3 ' + (a === 1 ? '' : a) + 'n/(n + ' + b + ')'; s.term = function(n) { return a * n / (n + b); };
      s.conv = false; s.termLim = a; s.decides = ['divergence'];
    } else if (fam === 'alt') {
      s.label = '\u03A3 (\u22121)^(n+1)/' + calcPowLabel(a); s.term = function(n) { return (n % 2 ? 1 : -1) / Math.pow(n, a); };
      s.conv = true; s.sum = a === 1 ? Math.LN2 : a === 2 ? Math.PI * Math.PI / 12 : null; s.sumLabel = a === 1 ? 'ln 2' : a === 2 ? '\u03C0\u00B2/12' : null;
    } else {
      s.fam = 'tele'; s.label = '\u03A3 1/(n(n + 1))'; s.term = function(n) { return 1 / (n * (n + 1)); }; s.conv = true; s.sum = 1;
    }
    return s;
  }
  var CALC_SERIES_EXPLORE = [['p', 1], ['p', 2], ['p', 0.5], ['geo', 1, 2], ['geo', 3, 2], ['alt', 1], ['polyexp', 1, 2], ['expfact', 2], ['factexp', 10], ['rational', 1, 1], ['tele']];
  function calcGenSeries(rng, band) {
    var fams = band === 'bc' ? ['p', 'p', 'geo', 'geo', 'polyexp', 'expfact', 'factexp', 'rational', 'alt', 'tele'] : ['p', 'p', 'geo', 'geo', 'rational', 'tele'];
    var fam = calcPick(rng, fams);
    if (fam === 'p') return calcSeriesMake('p', calcPick(rng, [0.5, 1, 1, 1.5, 2, 3]));
    if (fam === 'geo') { var g = calcPick(rng, [[1, 2], [1, 3], [2, 3], [3, 4], [-1, 2], [-2, 3], [3, 2], [5, 4], [-3, 2], [4, 3]]); return calcSeriesMake('geo', g[0], g[1]); }
    if (fam === 'polyexp') return calcSeriesMake('polyexp', calcPick(rng, [1, 2]), calcPick(rng, [2, 3]));
    if (fam === 'expfact') return calcSeriesMake('expfact', calcPick(rng, [1, 2, 3]));
    if (fam === 'factexp') return calcSeriesMake('factexp', calcPick(rng, [2, 5, 10]));
    if (fam === 'rational') return calcSeriesMake('rational', calcPick(rng, [1, 2, 3]), calcPick(rng, [1, 2, 5]));
    if (fam === 'alt') return calcSeriesMake('alt', calcPick(rng, [1, 2]));
    return calcSeriesMake('tele');
  }
  function calcSeriesPartials(s, Ns) {
    var out = [], sum = 0, n = 1, top = Ns[Ns.length - 1];
    for (var j = 0; j < Ns.length; j++) {
      for (; n <= Ns[j] && n <= top; n++) { sum += s.term(n); if (!calcFinite(sum)) break; }
      out.push({ N: Ns[j], S: calcFinite(sum) ? sum : null });
      if (!calcFinite(sum)) { for (var r = j + 1; r < Ns.length; r++) out.push({ N: Ns[r], S: out[j].S }); break; }
    }
    return out;
  }
  function calcSeriesRatioRows(s, ns) {
    return (ns || [1, 2, 5, 10, 20, 50, 100]).map(function(n) { var an = s.term(n), an1 = s.term(n + 1); return { n: n, a: an, ratio: calcFinite(an) && calcFinite(an1) && an !== 0 ? Math.abs(an1 / an) : (calcFinite(an) ? NaN : Infinity) }; });
  }
  // pred: { conv: 'conv' | 'div', test: 'divergence' | 'ratio' | 'other' }.
  function calcGradeSeries(s, pred) {
    if (!s || !pred || !pred.conv || !pred.test) return { correct: false, mis: '' };
    var convOk = (pred.conv === 'conv') === s.conv, testOk = s.decides.indexOf(pred.test) >= 0, mis = '';
    if (!convOk) {
      if (pred.conv === 'conv') mis = s.termLim === 0 ? 'terms_zero_converges' : 'nth_term_nonzero';
      else mis = s.fam === 'p' ? 'p_series_rule' : s.fam === 'geo' ? 'geometric_rule' : s.fam === 'alt' ? 'alternating_converges' : s.fam === 'tele' ? 'telescoping_converges' : 'ratio_lt1_converges';
    } else if (!testOk) mis = pred.test === 'divergence' && s.termLim === 0 ? 'divergence_test_silent' : pred.test === 'ratio' && s.ratioL === 1 ? 'ratio_one_inconclusive' : 'test_does_decide';
    return { correct: convOk && testOk, convOk: convOk, testOk: testOk, mis: mis };
  }

  // Applied missions and AP free response share one step grader. A step is
  // { id, type: 'choice' | 'number' | 'list' | 'expr', answer, options, wrong, fn, misFns, lo, hi, tol }.
  function calcListParse(text) {
    var bits = String(text == null ? '' : text).replace(/\band\b/gi, ',').split(/[,;]+/).map(function(t) { return t.trim(); }).filter(Boolean);
    if (!bits.length) return { ok: false, empty: true };
    var vals = [];
    for (var i = 0; i < bits.length; i++) { var v = calcNumParse(bits[i]); if (!v.ok) return { ok: false }; vals.push(v.value); }
    return { ok: true, values: vals };
  }
  // A justification: the student writes it in their own words (kept, never keyword-graded) and
  // marks which element their sentence uses from each list. The rubric checks the marked elements:
  // each must be true here, and a condition must belong to the test named (needs).
  // input: { text, picks: { slotId: optionId } }.
  function calcGradeJustify(step, input) {
    var inp = input && typeof input === 'object' ? input : {};
    var picks = inp.picks && typeof inp.picks === 'object' ? inp.picks : {};
    if (!String(inp.text == null ? '' : inp.text).trim()) return { ok: false, parse: true, empty: true, need: 'text' };
    var missing = (step.slots || []).filter(function(s) { return !picks[s.id]; }).map(function(s) { return s.id; });
    if (missing.length) return { ok: false, parse: true, need: 'slots', missing: missing };
    var elements = {}, mis = '';
    step.slots.forEach(function(s) {
      var o = s.options.filter(function(q) { return q.id === picks[s.id]; })[0], good = !!o && !!o.ok, own = '';
      if (!o) own = 'near_miss';
      else if (!o.ok) own = o.mis || 'near_miss';
      else if (o.needs) Object.keys(o.needs).forEach(function(k) { if (o.needs[k].indexOf(picks[k]) < 0) { good = false; own = own || 'test_condition_mismatch'; } });
      elements[s.id] = good;
      if (!good && !mis) mis = own;
    });
    var ok = step.slots.every(function(s) { return elements[s.id]; });
    return { ok: ok, mis: ok ? '' : mis, elements: elements };
  }
  // The full-credit choice in each list (the first one that fits with the others).
  function calcJustifyModel(step) {
    var picks = {};
    step.slots.forEach(function(s) { var o = s.options.filter(function(q) { return q.ok && !q.needs; })[0]; if (o) picks[s.id] = o.id; });
    step.slots.forEach(function(s) { if (picks[s.id]) return; var o = s.options.filter(function(q) { return q.ok && Object.keys(q.needs).every(function(k) { return q.needs[k].indexOf(picks[k]) >= 0; }); })[0]; if (o) picks[s.id] = o.id; });
    return picks;
  }
  function calcGradeStep(step, input) {
    if (step.type === 'justify') return calcGradeJustify(step, input);
    var tolOf = function(ans) { return step.tol != null ? step.tol : Math.max(0.005, Math.abs(ans) * 0.01); };
    if (step.type === 'choice') {
      var opt = (step.options || []).filter(function(o) { return o.id === input; })[0];
      if (!opt) return { ok: false, parse: true };
      return { ok: opt.id === step.answer, mis: opt.id === step.answer ? '' : (opt.mis || 'near_miss') };
    }
    if (step.type === 'number') {
      var n = calcNumParse(input);
      if (!n.ok) return { ok: false, parse: true, empty: !!n.empty };
      var tol = tolOf(step.answer);
      if (Math.abs(n.value - step.answer) <= tol) return { ok: true, mis: '' };
      var hit = (step.wrong || []).filter(function(w) { return Math.abs(n.value - w.v) <= tolOf(w.v); })[0];
      return { ok: false, mis: hit ? hit.mis : (step.mis || 'arithmetic_step') };
    }
    if (step.type === 'list') {
      var l = calcListParse(input);
      if (!l.ok) return { ok: false, parse: true, empty: !!l.empty };
      var want = step.answer.slice(), extra = [], tl = step.tol != null ? step.tol : 0.01;
      l.values.forEach(function(v) { var j = -1; want.forEach(function(w, k) { if (j < 0 && Math.abs(v - w) <= tl) j = k; }); if (j >= 0) want.splice(j, 1); else extra.push(v); });
      if (!want.length && !extra.length) return { ok: true, mis: '' };
      var known = (step.wrong || []).filter(function(w) { return extra.some(function(v) { return Math.abs(v - w.v) <= tl; }); })[0];
      return { ok: false, mis: known ? known.mis : (want.length && !extra.length ? 'missed_a_root' : (step.mis || 'arithmetic_step')) };
    }
    // expr: a typed function of x, compared with the model at sample points.
    var g = calcCompileText(input);
    if (!g.ok) return { ok: false, parse: true, error: g.error, detail: g.detail, empty: g.error === 'empty' };
    var xs = []; for (var i = 1; i <= 9; i++) xs.push(step.lo + (step.hi - step.lo) * (i - 0.37) / 9.3);
    var close = function(fn) { return xs.every(function(x) { var u = g.f(x), w = fn(x); return calcFinite(u) && calcFinite(w) && Math.abs(u - w) <= 1e-6 * Math.max(1, Math.abs(w)); }); };
    if (close(step.fn)) return { ok: true, mis: '' };
    var mf = (step.misFns || []).filter(function(m) { return close(m.fn); })[0];
    return { ok: false, mis: mf ? mf.mis : (step.mis || 'expr_mismatch') };
  }
  function calcRateFrac(num, den) { var fr = calcFrac(num, den); return fr.den === 1 ? String(fr.num) : fr.num + '/' + fr.den; }
  function calcRText(R, H) { var fr = calcFrac(R, H); return (fr.num === 1 ? '' : fr.num) + 'h' + (fr.den === 1 ? '' : '/' + fr.den); }
  function calcOpts(rng, list) { return calcShuffle(rng, list); }
  // kind: 'ladder' | 'cone' | 'box'. Steps are rebuilt from the seed, so nothing but the seed is saved.
  function calcGenMission(kind, rng) {
    if (kind === 'cone') {
      var cp = calcPick(rng, [[2, 4], [3, 6], [4, 8], [3, 9], [5, 10], [2, 6], [4, 12]]), R = cp[0], H = cp[1];
      var h0 = calcPick(rng, [1, 2, 3, 4, 5].filter(function(v) { return v < H; })), k = calcPick(rng, [2, 3, 5, 8, 10]);
      var q = (R / H) * (R / H), rt = calcRText(R, H), fq = calcRateFrac(R, H);
      var dh = k / (Math.PI * q * h0 * h0);
      return { kind: 'cone', p: { R: R, H: H, h0: h0, k: k, rt: rt }, answerText: dh, steps: [
        { id: 'similar', type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', text: 'r = ' + rt }, { id: 'const', text: 'r = ' + R, mis: 'radius_constant' }, { id: 'flip', text: 'r = ' + calcRText(H, R), mis: 'similar_flipped' }]) },
        { id: 'model', type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', text: 'V = (1/3)\u03C0(' + rt + ')\u00B2\u00B7h' }, { id: 'const', text: 'V = (1/3)\u03C0\u00B7' + R + '\u00B2\u00B7h', mis: 'radius_constant' }, { id: 'cyl', text: 'V = \u03C0(' + rt + ')\u00B2\u00B7h', mis: 'cylinder_formula' }]) },
        { id: 'diff', type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', text: 'dV/dt = \u03C0(' + fq + ')\u00B2\u00B7h\u00B2\u00B7dh/dt' }, { id: 'nochain', text: 'dV/dt = \u03C0(' + fq + ')\u00B2\u00B7h\u00B2', mis: 'no_chain_time' }, { id: 'const', text: 'dV/dt = (1/3)\u03C0\u00B7' + R + '\u00B2\u00B7dh/dt', mis: 'radius_constant' }]) },
        { id: 'solve', type: 'number', answer: dh, wrong: [{ v: dh / 3, mis: 'cylinder_formula' }, { v: 3 * k / (Math.PI * R * R), mis: 'radius_constant' }, { v: k / (Math.PI * q * h0), mis: 'forgot_square' }, { v: -dh, mis: 'rate_sign_fill' }] }
      ] };
    }
    if (kind === 'box') {
      var dims = calcPick(rng, [[12, 12], [20, 12], [8, 15], [10, 16], [24, 9], [16, 30], [6, 6], [10, 10]]), A = dims[0], B = dims[1], m = Math.min(A, B);
      var V = function(x) { return x * (A - 2 * x) * (B - 2 * x); }, Vp = function(x) { return 12 * x * x - 4 * (A + B) * x + A * B; };
      var disc = Math.sqrt((A + B) * (A + B) - 3 * A * B), xs = ((A + B) - disc) / 6, xl = ((A + B) + disc) / 6;
      var dom = [{ id: 'ok', text: '0 < x < ' + calcFmtNum(m / 2) }, { id: 'full', text: '0 < x < ' + m, mis: 'domain_full_side' }, { id: 'pos', text: 'x > 0', mis: 'no_upper_bound' }];
      if (A !== B) dom.push({ id: 'long', text: '0 < x < ' + calcFmtNum(Math.max(A, B) / 2), mis: 'domain_long_side' });
      return { kind: 'box', p: { a: A, b: B, m: m, xs: xs, vmax: V(xs) }, steps: [
        { id: 'model', type: 'expr', lo: 0.02 * m, hi: 0.48 * m, fn: V, misFns: [{ fn: function(x) { return x * (A - x) * (B - x); }, mis: 'cut_once' }, { fn: function(x) { return (A - 2 * x) * (B - 2 * x); }, mis: 'area_not_volume' }, { fn: function(x) { return A * B - 4 * x * x; }, mis: 'surface_not_volume' }], mis: 'box_model' },
        { id: 'domain', type: 'choice', answer: 'ok', options: calcOpts(rng, dom) },
        { id: 'deriv', type: 'expr', lo: 0.02 * m, hi: 0.48 * m, fn: Vp, misFns: [{ fn: function() { return 4; }, mis: 'product_rule' }, { fn: V, mis: 'not_differentiated' }, { fn: function(x) { return 12 * x * x - 4 * (A + B) * x; }, mis: 'deriv_term_dropped' }], mis: 'deriv_mismatch' },
        { id: 'crit', type: 'number', answer: xs, wrong: [{ v: xl, mis: 'root_outside_domain' }], mis: 'solve_quadratic' },
        { id: 'max', type: 'number', answer: V(xs), tol: Math.max(0.05, V(xs) * 0.005), wrong: [{ v: 0, mis: 'derivative_value' }, { v: V(xl), mis: 'root_outside_domain' }], mis: 'evaluate_v' },
        { id: 'justify', type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', tkey: 'just_vp_sign' }, { id: 'zero', tkey: 'just_vp_zero', mis: 'critical_not_max' }, { id: 'pos', tkey: 'just_v_pos', mis: 'positive_not_max' }]) }
      ] };
    }
    var tri = calcPick(rng, [[5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5], [15, 9, 12], [17, 8, 15], [25, 7, 24]]);
    var L = tri[0], a = tri[1], b = tri[2], kk = calcPick(rng, [1, 2, 3]), rate = -(a / b) * kk;
    return { kind: 'ladder', p: { L: L, a: a, b: b, k: kk }, steps: [
      { id: 'model', type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', text: 'x\u00B2 + y\u00B2 = ' + L * L }, { id: 'sum', text: 'x + y = ' + L, mis: 'linear_ladder' }, { id: 'nosq', text: 'x\u00B2 + y\u00B2 = ' + L, mis: 'square_hyp' }, { id: 'early', text: a + '\u00B2 + y\u00B2 = ' + L * L, mis: 'substitute_too_early' }]) },
      { id: 'diff', type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', text: '2x\u00B7dx/dt + 2y\u00B7dy/dt = 0' }, { id: 'nochain', text: '2x + 2y = 0', mis: 'no_chain_time' }, { id: 'const', text: '2x\u00B7dx/dt + 2y\u00B7dy/dt = ' + 2 * L, mis: 'constant_not_zero' }, { id: 'early', text: '2y\u00B7dy/dt = 0', mis: 'substitute_too_early' }]) },
      { id: 'instant', type: 'number', answer: b, wrong: [{ v: L - a, mis: 'leg_difference' }, { v: Math.sqrt(L * L + a * a), mis: 'pythag_add' }], mis: 'pythag_instant' },
      { id: 'solve', type: 'number', answer: rate, wrong: [{ v: -rate, mis: 'rate_sign' }, { v: -kk, mis: 'rates_equal' }, { v: 0, mis: 'substitute_too_early' }, { v: -(b / a) * kk, mis: 'ratio_flipped' }], mis: 'solve_rate' }
    ] };
  }
  // AP-style free response: kind 'particle' | 'analysis' | 'accum' | 'series'. Each part has points.
  function calcCubicText(c3, c2, c1, c0) {
    var parts = [];
    [[c3, 'x^3'], [c2, 'x^2'], [c1, 'x'], [c0, '']].forEach(function(t) {
      var cf = t[0]; if (!cf) return;
      var abs = Math.abs(cf), cs = abs === 1 && t[1] ? '' : calcFmtNum(abs);
      parts.push((cf < 0 ? (parts.length ? ' \u2212 ' : '\u2212') : (parts.length ? ' + ' : '')) + cs + t[1]);
    });
    return parts.length ? parts.join('') : '0';
  }
  function calcGenFRQ(kind, rng) {
    if (kind === 'analysis') {
      var p = calcPick(rng, [-1, 0, 1, 2]), q = p + 2, c0 = calcPick(rng, [0, 1, 2, 5]);
      var f = function(x) { return x * x * x - 3 * (p + 1) * x * x + 3 * p * (p + 2) * x + c0; };
      var lo = p - 1, hi = q + calcPick(rng, [1, 2]);
      var cands = [lo, p, q, hi], best = cands[0];
      cands.forEach(function(x) { if (f(x) > f(best)) best = x; });
      return { kind: kind, p: { p: p, q: q, lo: lo, hi: hi, fText: calcCubicText(1, -3 * (p + 1), 3 * p * (p + 2), c0), fpText: '3' + [p, q].map(function(v) { return v === 0 ? 'x' : '(' + calcXMinus(v).replace('-', '\u2212') + ')'; }).join('') }, parts: [
        { id: 'a', points: 1, type: 'list', answer: [p, q], wrong: [{ v: p + 1, mis: 'inflection_vs_critical' }] },
        { id: 'b1', points: 1, type: 'number', answer: p, wrong: [{ v: q, mis: 'max_min_swap' }], mis: 'relmax_where' },
        { id: 'b2', points: 1, type: 'justify', slots: [
          { id: 'test', options: calcOpts(rng, [{ id: 'fdt', tkey: 'jt_fdt', ok: true }, { id: 'sdt', tkey: 'jt_sdt', ok: true }, { id: 'evt', tkey: 'jt_evt', mis: 'evt_not_relative' }, { id: 'mvt', tkey: 'jt_mvt', mis: 'mvt_not_extremum' }]) },
          { id: 'cond', options: calcOpts(rng, [{ id: 'fp_pm', tkey: 'jk_fp_pm', ok: true, needs: { test: ['fdt'] } }, { id: 'fpp_neg', tkey: 'jk_fpp_neg', ok: true, needs: { test: ['sdt'] } }, { id: 'fp_mp', tkey: 'jk_fp_mp', mis: 'max_min_swap' }, { id: 'fpp_pos', tkey: 'jk_fpp_pos', mis: 'second_deriv_sign' }, { id: 'fp_zero', tkey: 'jk_fp_zero', mis: 'zero_not_enough' }]) },
          { id: 'concl', options: calcOpts(rng, [{ id: 'relmax', tkey: 'jc_relmax', ok: true }, { id: 'relmin', tkey: 'jc_relmin', mis: 'max_min_swap' }, { id: 'absmax', tkey: 'jc_absmax', mis: 'relative_not_absolute' }]) }
        ] },
        { id: 'c', points: 1, type: 'number', answer: p + 1, wrong: [{ v: p, mis: 'inflection_vs_critical' }, { v: q, mis: 'inflection_vs_critical' }], mis: 'inflection_where' },
        { id: 'd', points: 2, type: 'number', answer: f(best), wrong: (best !== p ? [{ v: f(p), mis: 'forgot_endpoints' }] : []).concat([{ v: best, mis: 'location_vs_value' }]), mis: 'candidates_test' }
      ] };
    }
    if (kind === 'accum') {
      var k = calcPick(rng, [1, 2, 3]), r = calcPick(rng, [2, 3, 4]), X = r + 2;
      var fA = function(t) { return k * (r - t); }, g = function(x) { return k * (r * x - x * x / 2); };
      var x1 = calcPick(rng, [1, r + 1, X].filter(function(v) { return v !== r; })), x2 = calcPick(rng, [0, 1]), x3 = calcPick(rng, [1, 2]);
      return { kind: kind, p: { k: k, r: r, X: X, x1: x1, x2: x2, x3: x3, gr: g(r), gX: g(X), fText: calcQuadText(0, -k, k * r).replace('-', '\u2212').replace(/x/g, 't') }, parts: [
        { id: 'a', points: 1, type: 'number', answer: g(x1), wrong: [{ v: fA(x1), mis: 'gave_f_not_g' }], mis: 'accum_area' },
        { id: 'b', points: 1, type: 'number', answer: fA(x2), wrong: [{ v: g(x2), mis: 'ftc_derivative' }, { v: -k, mis: 'differentiated_f' }], mis: 'ftc_derivative' },
        { id: 'c1', points: 1, type: 'number', answer: r, wrong: [{ v: X, mis: 'endpoint_not_max' }, { v: 0, mis: 'endpoint_not_max' }], mis: 'accum_max' },
        { id: 'c2', points: 1, type: 'justify', slots: [
          { id: 'test', options: calcOpts(rng, [{ id: 'cand', tkey: 'jt_cand', ok: true }, { id: 'fdt1', tkey: 'jt_fdt1', ok: true }, { id: 'sdt', tkey: 'jt_sdt', mis: 'sdt_relative_only' }, { id: 'mvt', tkey: 'jt_mvt', mis: 'mvt_not_extremum' }]) },
          { id: 'cond', options: calcOpts(rng, [{ id: 'cmp', tkey: 'jk_cmp', ok: true, needs: { test: ['cand'] } }, { id: 'sign', tkey: 'jk_sign', ok: true, needs: { test: ['fdt1'] } }, { id: 'fz', tkey: 'jk_fz', mis: 'zero_not_enough' }, { id: 'gz', tkey: 'jk_gz', mis: 'g_zero_not_max' }]) },
          { id: 'hyp', options: calcOpts(rng, [{ id: 'cont', tkey: 'jh_cont', ok: true }, { id: 'g0', tkey: 'jh_g0', mis: 'hyp_not_condition' }, { id: 'fdec', tkey: 'jh_fdec', mis: 'hyp_not_condition' }]) }
        ] },
        { id: 'd', points: 1, type: 'number', answer: g(x3) + 0.1 * fA(x3), tol: 0.002, wrong: [{ v: g(x3), mis: 'tangent_no_slope' }, { v: g(x3 + 0.1), mis: 'tangent_exact_value' }], mis: 'tangent_line' }
      ] };
    }
    if (kind === 'series') {
      var bb = calcPick(rng, [2, 3, 4, 5]);
      return { kind: kind, p: { b: bb }, parts: [
        { id: 'a', points: 1, type: 'number', answer: bb, wrong: [{ v: 1 / bb, mis: 'radius_inverted' }], mis: 'ratio_radius' },
        { id: 'b', points: 1, type: 'choice', answer: 'div', options: [{ id: 'conv', tkey: 'opt_converges', mis: 'terms_zero_converges' }, { id: 'div', tkey: 'opt_diverges' }] },
        { id: 'b2', points: 1, type: 'justify', slots: [
          { id: 'series', options: calcOpts(rng, [{ id: 'harm', tkey: 'js_harm', ok: true }, { id: 'alt', tkey: 'js_alt', mis: 'endpoints_swapped' }, { id: 'keepb', tkey: 'js_keepb', mis: 'substitute_x' }]) },
          { id: 'test', options: calcOpts(rng, [{ id: 'pser', tkey: 'jt_pser', ok: true }, { id: 'integ', tkey: 'jt_integ', ok: true }, { id: 'nth', tkey: 'jt_nth', mis: 'terms_zero_converges' }, { id: 'ratio', tkey: 'jt_ratio', mis: 'ratio_one_inconclusive' }, { id: 'ast', tkey: 'jt_ast', mis: 'not_alternating' }]) },
          { id: 'concl', options: [{ id: 'div', tkey: 'jc_div', ok: true }, { id: 'conv', tkey: 'jc_conv', mis: 'terms_zero_converges' }] }
        ] },
        { id: 'c', points: 1, type: 'choice', answer: 'conv', options: [{ id: 'conv', tkey: 'opt_converges' }, { id: 'div', tkey: 'opt_diverges', mis: 'alternating_converges' }] },
        { id: 'd', points: 1, type: 'choice', answer: 'ok', options: calcOpts(rng, [{ id: 'ok', text: '\u2212' + bb + ' \u2264 x < ' + bb }, { id: 'open', text: '\u2212' + bb + ' < x < ' + bb, mis: 'endpoints_check' }, { id: 'closed', text: '\u2212' + bb + ' \u2264 x \u2264 ' + bb, mis: 'terms_zero_converges' }, { id: 'right', text: '\u2212' + bb + ' < x \u2264 ' + bb, mis: 'endpoints_swapped' }]) },
        { id: 'e', points: 1, type: 'number', answer: 1 / bb + 1 / (2 * bb * bb) + 1 / (3 * bb * bb * bb), tol: 0.0005, wrong: [{ v: 1 / bb + 1 / (bb * bb) + 1 / (bb * bb * bb), mis: 'forgot_n' }], mis: 'partial_sum_terms' }
      ] };
    }
    var pp = calcPick(rng, [1, 2, 3]), qq = pp + calcPick(rng, [2, 3]), T = qq + calcPick(rng, [1, 2]);
    var v = function(t) { return (t - pp) * (t - qq); }, Vt = function(t) { return t * t * t / 3 - (pp + qq) * t * t / 2 + pp * qq * t; };
    var t1s = [0, 1, 2, 3, 4, 5].filter(function(t) { return t <= T && t !== pp && t !== qq && 2 * t - (pp + qq) !== v(t); }), t1 = t1s.length ? calcPick(rng, t1s) : 0;
    var disp = Vt(T) - Vt(0), dist = Math.abs(Vt(pp) - Vt(0)) + Math.abs(Vt(qq) - Vt(pp)) + Math.abs(Vt(T) - Vt(qq));
    return { kind: 'particle', p: { p: pp, q: qq, T: T, t1: t1, vText: calcQuadText(1, -(pp + qq), pp * qq).replace(/-/g, '\u2212').replace(/x/g, 't') }, parts: [
      { id: 'a', points: 1, type: 'number', answer: 2 * t1 - (pp + qq), wrong: [{ v: v(t1), mis: 'velocity_not_accel' }], mis: 'accel_derivative' },
      { id: 'b1', points: 1, type: 'list', answer: [pp, qq], wrong: [{ v: (pp + qq) / 2, mis: 'accel_zero_turn' }, { v: 0, mis: 'start_not_turn' }] },
      { id: 'b2', points: 1, type: 'justify', slots: [
        { id: 'fact', options: calcOpts(rng, [{ id: 'v_sign', tkey: 'jf_v_sign', ok: true }, { id: 'v_zero', tkey: 'jf_v_zero', mis: 'zero_not_enough' }, { id: 'a_zero', tkey: 'jf_a_zero', mis: 'accel_zero_turn' }, { id: 'x_zero', tkey: 'jf_x_zero', mis: 'position_not_velocity' }]) },
        { id: 'pattern', options: calcOpts(rng, [{ id: 'pnp', tkey: 'jp_pnp', ok: true }, { id: 'npn', tkey: 'jp_npn', mis: 'sign_pattern' }, { id: 'pos', tkey: 'jp_pos', mis: 'sign_pattern' }]) },
        { id: 'concl', options: calcOpts(rng, [{ id: 'turn', tkey: 'jc_turn', ok: true }, { id: 'stop', tkey: 'jc_stop', mis: 'stop_not_turn' }, { id: 'fast', tkey: 'jc_fast', mis: 'speed_not_direction' }]) }
      ] },
      { id: 'c', points: 1, type: 'number', answer: disp, wrong: [{ v: dist, mis: 'distance_vs_displacement' }], mis: 'displacement_integral' },
      { id: 'd', points: 2, type: 'number', answer: dist, wrong: [{ v: disp, mis: 'displacement_vs_distance' }, { v: Math.abs(disp), mis: 'displacement_vs_distance' }], mis: 'distance_integral' }
    ] };
  }
  // Rubric total: first-attempt points (the AP score) and points after feedback.
  function calcFRQScore(frq, results) {
    var first = 0, after = 0, total = 0;
    (frq.parts || []).forEach(function(pt) { total += pt.points; var r = results && results[pt.id]; if (r && r.ok) { after += pt.points; if (r.firstTry) first += pt.points; } });
    return { first: first, after: after, total: total };
  }

  window.__CalculusCore = Object.assign(window.__CalculusCore || {}, {
    numParse: calcNumParse, improper: calcImproper, improperEnd: calcImproperEnd, gradeImproper: calcGradeImproper,
    impCreditKey: calcImpCreditKey, impLegacyEarned: calcImpLegacyEarned, missionFnKey: calcMissionFnKey, migrateFnKeys: calcMigrateFnKeys,
    euler: calcEuler, rk4: calcRK4, odeTruth: calcOdeTruth, eulerStudy: calcEulerStudy, gradeEuler: calcGradeEuler, odes: VIZ_ODES,
    seriesMake: calcSeriesMake, genSeries: calcGenSeries, seriesPartials: calcSeriesPartials, seriesRatioRows: calcSeriesRatioRows, gradeSeries: calcGradeSeries, seriesExplore: CALC_SERIES_EXPLORE,
    gradeStep: calcGradeStep, genMission: calcGenMission, genFRQ: calcGenFRQ, frqScore: calcFRQScore, listParse: calcListParse,
    gradeJustify: calcGradeJustify, justifyModel: calcJustifyModel
  });
  window.__CalculusCore = Object.assign(window.__CalculusCore, {
    vizTaylorAt: vizTaylorAt, vizTaylorText: vizTaylorText, vizEps: VIZ_EPS, genLimit: calcGenLimit, gradeLimit: calcGradeLimit, seeded: calcSeeded,
    parse: calcParse, compile: calcCompileText, riemann: calcRiemann, integrate: calcIntegrate, signedAreas: calcSignedAreas,
    secantRows: calcSecantRows, limitProbe: calcLimitProbe, epsDeltaCheck: calcEpsDeltaCheck, maxDelta: calcMaxDelta,
    genQuiz: calcGenQuiz, quizMisconception: calcQuizMisconception, quizAnswerIsCorrect: calcQuizAnswerIsCorrect, methodMisconception: calcMethodMisconception, shapeFacts: calcShapeFacts,
    genMatch: calcGenMatch, sameShape: calcSameShape, taylorCoefficient: function(name, k) { return CALC_TAYLOR_FUNCS[name] ? calcFracText(CALC_TAYLOR_FUNCS[name](k)) : null; },
    modesByBand: CALC_MODES_BY_BAND, quadText: calcQuadText
  });

  // WCAG 1.4.3 high contrast: flatten the gradient Snapshot button under HC green ink.
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-calculus-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-calculus-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"calculus\"] .from-indigo-600.to-purple-600{background-image:none!important;background-color:#000!important}";
    document.head.appendChild(st);
  })();
  window.StemLab.registerTool('calculus', {
    icon: '\u222B',
    label: 'Calculus',
    desc: 'Riemann sums, derivatives, and guided discovery missions',
    color: 'red',
    category: 'math',
    questHooks: [
      // Labels are getters: the host reads them outside render, so they use the last render's translator.
      { id: 'explore_integral', get label() { return __alloT('stem.calculus.quest_explore', 'Explore Riemann sum approximation'); }, icon: '\u222B', check: function(d) { return Object.keys(d.methodsUsed || {}).length > 0 || !!d.nExplored; }, progress: function(d) { return Object.keys(d.methodsUsed || {}).length > 0 || d.nExplored ? __alloT('stem.calculus.quest_exploring', 'Exploring!') : __alloT('stem.calculus.quest_adjust', 'Adjust rectangles'); } },
      { id: 'try_all_methods', get label() { return __alloT('stem.calculus.quest_methods', 'Try left, right, midpoint, and trapezoid methods'); }, icon: '\uD83D\uDCCA', check: function(d) { return Object.keys(d.methodsUsed || {}).length >= 4; }, progress: function(d) { return String(__alloT('stem.calculus.quest_methods_n', '{n}/4 methods')).replace('{n}', function() { return String(Object.keys(d.methodsUsed || {}).length); }); } },
      { id: 'predict_correctly', get label() { return __alloT('stem.calculus.quest_estimate', 'Complete an integral estimate comparison'); }, icon: '\uD83D\uDCCF', check: function(d) { return !!d.predictSubmitted && String(d.predictInput == null ? '' : d.predictInput).trim() !== '' && isFinite(parseFloat(d.predictInput)); }, progress: function(d) { return !!d.predictSubmitted && String(d.predictInput == null ? '' : d.predictInput).trim() !== '' && isFinite(parseFloat(d.predictInput)) ? __alloT('stem.calculus.quest_compared', 'Compared!') : __alloT('stem.calculus.quest_try_estimate', 'Try estimating'); } } // Legacy id retained for saved quest compatibility.
    ],
    render: function(ctx) {
      __alloCalcCtx = ctx;
      // This tool paints no ground of its own, so its chrome sits on the
      // HOST surface: a white card in light and dark, pure BLACK in the
      // contrast theme, where these slate inks measured 1.4-2.8:1.
      // Only the elements that actually land on the host ground get this
      // treatment - text on the tool's own tinted cards reads as authored.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      // Not ctx.beep: that takes a frequency, and a name like 'click' left every beep silent. calcTone honours the app mute.
      var stemBeep = function(kind) { if (kind === 'success') sfxCalcSuccess(); else if (kind === 'error') sfxCalcError(); else sfxCalcClick(); };
      var callGemini = ctx.callGemini;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var GA = window.StemLab && window.StemLab._graphAccess && window.StemLab._graphAccess.version >= 2 ? window.StemLab._graphAccess : null;
      var isTeacher = ctx.isTeacherMode === true;
      // Whole sentences with {placeholders}; a replacer FUNCTION, so "$&" in a value stays literal.
      var fillT = function(s, map) { return __alloOneWord(String(s).replace(/\{(\w+)\}/g, function(m, k) { return map && map[k] != null ? String(map[k]) : m; })); };
      var say = function(text) { if (!text) return; if (GA) GA.announceNow(text, typeof announceToSR === 'function' ? announceToSR : null); else if (typeof announceToSR === 'function') announceToSR(text); };

      return (function() {
        var d = labToolData.calculus || {};
        // Transient UI state (not saved): describe panel, stepper index, hint rung, graph-match pick.
        var _uiState = React.useState({ gaOpen: false, gaIndex: -1, limGa: false });
        var ui = _uiState[0];
        var setUi = function(patch) { _uiState[1](function(prev) { return Object.assign({}, prev, patch); }); };
        // The Integral plot takes the shape of its box; the window width decides where the path sits on a phone.
        var _intGraphRef = React.useRef(null);
        var _shellRef = React.useRef(null);
        var _goFocus = React.useRef(null);
        var _focusAfter = React.useRef(null);
        var _measured = React.useRef({ w: 0, vw: 0 });
        React.useEffect(function() {
          function measure(ev) {
            var el = _intGraphRef.current, w = el ? el.clientWidth : 0, vw = window.innerWidth || 0, cur = _measured.current, patch = null;
            if (w > 0 && Math.abs(w - cur.w) > 8) { cur.w = w; patch = { plotW: w }; }
            if (ev && vw && Math.abs(vw - cur.vw) > 8) { cur.vw = vw; patch = Object.assign(patch || {}, { vw: vw }); }
            if (patch) setUi(patch);
          }
          measure(null);
          window.addEventListener('resize', measure);
          return function() { window.removeEventListener('resize', measure); };
        }, [(labToolData.calculus || {}).tab]);
        // "Go" on the path: once the step's tab has rendered, scroll its task into view, open it and focus it.
        React.useEffect(function() {
          var job = _goFocus.current;
          if (!job) return;
          var tries = 0;
          function attempt() {
            if (_goFocus.current !== job) return;
            var root = _shellRef.current, el = null;
            for (var i = 0; root && !el && i < job.sel.length; i++) el = calcTaskControl(root.querySelector(job.sel[i]));
            if (!el) { if (++tries < 8) setTimeout(attempt, 60); else _goFocus.current = null; return; }
            _goFocus.current = null;
            for (var p = el.parentElement; p && p !== root; p = p.parentElement) { if (p.tagName === 'DETAILS' && !p.open) p.open = true; }
            var reduce = false;
            try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduce = false; }
            if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
            try { el.focus({ preventScroll: true }); } catch (e2) { el.focus(); }
          }
          attempt();
        });
        // A control that an answer removes hands its focus on: the first selector that matches after the render.
        React.useEffect(function() {
          var sels = _focusAfter.current;
          if (!sels) return;
          _focusAfter.current = null;
          var root = _shellRef.current, el = null;
          for (var i = 0; root && !el && i < sels.length; i++) el = root.querySelector(sels[i]);
          if (el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
        });
        var updMany = function(patch) {
          setLabToolData(function(prev) { return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, patch) }); });
        };
        // Grade bands: precalculus / AP Calculus AB / AP Calculus BC. A teacher lock wins.
        var BANDS = ['pre', 'ab', 'bc'];
        var hostBand = ctx.gradeBand === 'g912' || /college|graduate|ap\b|calculus/i.test(String(ctx.gradeLevel || '')) ? 'ab' : 'pre';
        var bandLocked = BANDS.indexOf(d.teacherBand) >= 0;
        var band = bandLocked ? d.teacherBand : (BANDS.indexOf(d.calcBand) >= 0 ? d.calcBand : hostBand);
        var bandLabel = function(b) { return b === 'pre' ? __alloT('stem.calculus.band_pre', 'Precalculus') : b === 'bc' ? __alloT('stem.calculus.band_bc', 'AP Calculus BC') : __alloT('stem.calculus.band_ab', 'AP Calculus AB'); };
        // Once-only rewards share the autosaved missionXP flag map (stem_lab_module whitelist).
        var paidFlags = d.missionXP && typeof d.missionXP === 'object' ? d.missionXP : {};
        var _paidNow = React.useRef({});
        var plainFnKeys = Object.keys(paidFlags).filter(calcIsPlainFnKey).length;
        React.useEffect(function() {
          if (!plainFnKeys) return;
          setLabToolData(function(prev) {
            var pc = prev.calculus || {};
            if (!pc.missionXP || typeof pc.missionXP !== 'object') return prev;
            return Object.assign({}, prev, { calculus: Object.assign({}, pc, { missionXP: calcMigrateFnKeys(pc.missionXP) }) });
          });
        }, [plainFnKeys]);
        var awardOnce = function(key, xp, reason) {
          if (paidFlags[key] || _paidNow.current[key] || typeof awardStemXP !== 'function') return false;
          _paidNow.current[key] = true;
          setLabToolData(function(prev) {
            var pc = prev.calculus || {}, flags = Object.assign({}, pc.missionXP && typeof pc.missionXP === 'object' ? pc.missionXP : {});
            flags[key] = true;
            return Object.assign({}, prev, { calculus: Object.assign({}, pc, { missionXP: flags }) });
          });
          awardStemXP('calculus', xp, reason);
          return true;
        };

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, { [key]: val }) });
          });
        };
        // Mission rewards sit in the render tree, so paying them there paid again on every
        // re-render (one mission reached the 100 XP cap). Pay each mission once.
        var _missionPaid = React.useRef({});
        var awardMissionOnce = function(key, xp, label) {
          var paid = d.missionXP && typeof d.missionXP === 'object' ? d.missionXP : {};
          if (paid[key] || _missionPaid.current[key] || typeof awardStemXP !== 'function') return null;
          _missionPaid.current[key] = true;
          upd('missionXP', Object.assign({}, paid, { [key]: true }));
          awardStemXP('calculus', xp, label);
          return null;
        };

        // ── VISUALIZE: canvas hooks (declared at IIFE top so they fire every render) ──
        var _vizCvRef = React.useRef(null);
        var _vizAnimId = React.useRef(0);
        var _vizTick = React.useRef(0);
        var _vizLiveState = React.useRef({});
        var _vizLoopRunning = React.useRef(false);

        // ── FUNCTION REGISTRY (used by Visualize views — unlocks non-quadratics) ──
        var CALC_FUNCS = {
          'quadratic':  { label: 'x\u00B2 - 2',          f: function(x){ return x*x - 2; },             df: function(x){ return 2*x; } },
          'cubic':      { label: 'x\u00B3 / 3 - x',     f: function(x){ return x*x*x/3 - x; },         df: function(x){ return x*x - 1; } },
          'sin':        { label: 'sin(x)',               f: function(x){ return Math.sin(x); },         df: function(x){ return Math.cos(x); } },
          'exp':        { label: 'e^(x/2)',              f: function(x){ return Math.exp(x/2); },       df: function(x){ return 0.5*Math.exp(x/2); } },
          'bell':       { label: 'e^(-x\u00B2/2)',      f: function(x){ return Math.exp(-x*x/2); },    df: function(x){ return -x*Math.exp(-x*x/2); } },
          'rational':   { label: '1 / (1+x\u00B2)',     f: function(x){ return 1/(1+x*x); },           df: function(x){ return -2*x/Math.pow(1+x*x,2); } }
        };

        // Pipe live state into ref so the RAF loop always reads fresh values
        _vizLiveState.current = {
          tab: d.tab || 'integral',
          vizView: d.vizView || 'zoom',
          vizFn: d.vizFn || 'quadratic',
          vizZoom: (typeof d.vizZoom === 'number' && isFinite(d.vizZoom)) ? d.vizZoom : 1,
          vizX0: (typeof d.vizX0 === 'number' && isFinite(d.vizX0)) ? d.vizX0 : 0,
          vizFtcX: (typeof d.vizFtcX === 'number' && isFinite(d.vizFtcX)) ? d.vizFtcX : -1,
          vizMotionT: (typeof d.vizMotionT === 'number' && isFinite(d.vizMotionT)) ? d.vizMotionT : 0,
          vizOptimX: d.vizOptimX !== undefined ? d.vizOptimX : null,
          vizSlopeX: (typeof d.vizSlopeX === 'number' && isFinite(d.vizSlopeX)) ? d.vizSlopeX : 0,
          vizSlopeY: (typeof d.vizSlopeY === 'number' && isFinite(d.vizSlopeY)) ? d.vizSlopeY : 0,
          vizRiemannMode: d.vizRiemannMode || 'midpoint',
          vizUserInteracted: d.vizUserInteracted || {},
          vizSlopeSeeds: d.vizSlopeSeeds || [],
          vizN: clampCalculusNumber(d.vizN, 1, 256, 8),
          vizOde: clampCalculusNumber(d.vizOde, 0, VIZ_ODES.length - 1, 0),
          vizChainX: clampCalculusNumber(d.vizChainX, -3, 3, 0.5),
          vizChainK: clampCalculusNumber(d.vizChainK, 1, 4, 2),
          vizTaylorDeg: clampCalculusNumber(d.vizTaylorDeg, 0, 15, 3),
          vizTaylorFn: VIZ_TAYLOR[d.vizTaylorFn] ? d.vizTaylorFn : 'sin',
          vizLadderX: clampCalculusNumber(d.vizLadderX, 0.5, 12.7, 5),
          vizVorX: clampCalculusNumber(d.vizVorX, 0, 4, 2),
          vizEpsFn: VIZ_EPS[d.vizEpsFn] ? d.vizEpsFn : 'square',
          vizEps: clampCalculusNumber(d.vizEps, 0.05, 3, 1),
          vizDelta: clampCalculusNumber(d.vizDelta, 0.001, 2, 0.5),
          vizEpsChecked: d.vizEpsChecked && typeof d.vizEpsChecked === 'object' ? d.vizEpsChecked : null,
          vizOptimReveal: !!d.vizOptimReveal,
          vizEuler: { on: !!d.eulerOn, h: [1, 0.5, 0.25, 0.1].indexOf(d.eulerH) >= 0 ? d.eulerH : 0.5, x0: calcNumOr(d.vizSlopeX, 0), y0: calcNumOr(d.vizSlopeY, 0), truth: !!(d.eulerDone && d.eulerKey === Math.round(clampCalculusNumber(d.vizOde, 0, VIZ_ODES.length - 1, 0)) + '|' + calcNumOr(d.vizSlopeX, 0) + '|' + calcNumOr(d.vizSlopeY, 0)) },
          CALC_FUNCS: CALC_FUNCS
        };

        // ── RAF LOOP FOR VISUALIZE CANVAS (attach once, dispatch per view) ──
        React.useEffect(function() {
          if ((d.tab || 'integral') !== 'visualize') return;
          var tries = 0, retryTimer = null;
          function tryInit() {
            var cv = _vizCvRef.current;
            if (!cv) {
              // Tiered polling so the canvas isn't lost if React's ref attachment is delayed:
              //   - first 60 tries at 50ms each = 3s of fast polling (covers normal renders)
              //   - next 30 tries at 500ms each = 15s more of slow polling (catches blocked-JS or off-screen mounts)
              if (tries < 60) {
                retryTimer = setTimeout(tryInit, 50);
              } else if (tries < 90) {
                retryTimer = setTimeout(tryInit, 500);
              } else {
                console.warn('[Calculus Viz] canvas ref NEVER attached after ~18s of retries');
              }
              tries++;
              return;
            }
            var c = cv.getContext('2d');
            if (!c) return;
            function resize() {
              var r = cv.getBoundingClientRect();
              var dpr = window.devicePixelRatio || 1;
              cv.width = Math.max(1, Math.floor(r.width * dpr));
              cv.height = Math.max(1, Math.floor(r.height * dpr));
              c.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            resize();
            var resizeObs = null;
            try { resizeObs = new ResizeObserver(resize); resizeObs.observe(cv); } catch(e) {}

            // Canvas click interaction — maps pointer X/Y into plot coords per view
            function updateFromPointer(ev) {
              var ls = _vizLiveState.current;
              if (ls.tab !== 'visualize') return;
              var r = cv.getBoundingClientRect();
              var px = ev.clientX - r.left, py = ev.clientY - r.top;
              var W = r.width, H = r.height;
              var v = ls.vizView;
              if (v === 'zoom' || v === 'tangent') {
                // Map px over the x range [-3, 3]
                var Lx = 60, Rx = W - 20;
                if (v === 'tangent') { Lx = 20; Rx = 20 + (W - 20 - 20 - 12) / 2; } // left panel
                if (px >= Lx && px <= Rx) {
                  var newX0 = -3 + ((px - Lx) / (Rx - Lx)) * 6;
                  upd('vizX0', Math.max(-3, Math.min(3, newX0)));
                  upd('vizUserInteracted', Object.assign({}, ls.vizUserInteracted, { x0: true }));
                }
              } else if (v === 'motion') {
                var Lxm = 60, Rxm = W - 20;
                if (px >= Lxm && px <= Rxm) {
                  var motionT = ((px - Lxm) / (Rxm - Lxm)) * 6;
                  upd('vizMotionT', Math.max(0, Math.min(6, motionT)));
                  upd('vizUserInteracted', Object.assign({}, ls.vizUserInteracted, { motion: true }));
                }
              } else if (v === 'ftc') {
                var gap = 12;
                var panelW = (W - gap - 40) / 2;
                var Lx1 = 20, Rx1 = Lx1 + panelW;
                if (px >= Lx1 && px <= Rx1) {
                  var nx = -3 + ((px - Lx1) / (Rx1 - Lx1)) * 6;
                  upd('vizFtcX', Math.max(-2.95, Math.min(2.95, nx)));
                  upd('vizUserInteracted', Object.assign({}, ls.vizUserInteracted, { ftc: true }));
                }
              } else if (v === 'slope') {
                var Lxs = 30, Rxs = W - 30, Tys = 46, Bys = H - 36;
                if (px >= Lxs && px <= Rxs && py >= Tys && py <= Bys) {
                  var sxR = { min: -3, max: 3 }, syR = { min: -2.5, max: 2.5 };
                  var seedX = sxR.min + ((px - Lxs) / (Rxs - Lxs)) * (sxR.max - sxR.min);
                  var seedY = syR.max - ((py - Tys) / (Bys - Tys)) * (syR.max - syR.min);
                  var seeds = (ls.vizSlopeSeeds || []).slice(-3);
                  seeds.push({ x: seedX, y: seedY });
                  upd('vizSlopeSeeds', seeds);
                }
              } else if (v === 'optim') {
                var Lx2 = (function() {
                  var panelW2 = W * 0.42;
                  return 20 + panelW2 + 20;
                })();
                var Rx2 = W - 20;
                if (px >= Lx2 && px <= Rx2) {
                  var xMax = 6 - 0.2;
                  var nxv = 0 + ((px - Lx2) / (Rx2 - Lx2)) * (xMax + 0.5);
                  upd('vizOptimX', Math.max(0.05, Math.min(xMax, nxv)));
                  upd('vizUserInteracted', Object.assign({}, ls.vizUserInteracted, { optim: true }));
                }
              }
            }
            function onPointerDown(ev) {
              try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
              updateFromPointer(ev);
            }
            function onPointerMove(ev) {
              var view = _vizLiveState.current.vizView;
              if (view === 'slope' || (ev.pointerType === 'mouse' && ev.buttons !== 1)) return;
              updateFromPointer(ev);
            }
            cv.addEventListener('pointerdown', onPointerDown);
            cv.addEventListener('pointermove', onPointerMove);

            function calcReducedMotion() {
              try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
              catch (e) { return false; }
            }

            function frame() {
              // This is the render loop, not just an animation: it also repaints on
              // slider/view interaction, so it has to keep scheduling. Under reduced
              // motion we freeze the animation clock instead, which stops the
              // time-driven motion (Riemann sweep, FTC sweep) while interaction
              // still redraws. The tool's @media(prefers-reduced-motion) CSS block
              // cannot reach a canvas.
              var reducedNow = calcReducedMotion();
              if (!reducedNow) _vizTick.current++;
              var t = _vizTick.current;
              var ls = _vizLiveState.current;
              // Checked every frame: under reduced motion every view draws its control values.
              ls.reduced = reducedNow;
              if (ls.tab !== 'visualize') { _vizAnimId.current = requestAnimationFrame(frame); return; }
              if (!cv.isConnected) { _vizLoopRunning.current = false; if (_vizAnimId.current) cancelAnimationFrame(_vizAnimId.current); return; }
              var r = cv.getBoundingClientRect();
              var W = r.width, H = r.height;
              // Clear
              var bg = c.createLinearGradient(0, 0, 0, H);
              bg.addColorStop(0, '#0f172a'); bg.addColorStop(1, '#1e293b');
              c.fillStyle = bg; c.fillRect(0, 0, W, H);

              var fn = ls.CALC_FUNCS[ls.vizFn] || ls.CALC_FUNCS.quadratic;

              if (ls.vizView === 'zoom')         { drawZoomToLinearity(c, W, H, fn, ls, t); }
              else if (ls.vizView === 'tangent') { drawTangentExplorer(c, W, H, fn, ls, t); }
              else if (ls.vizView === 'ftc')     { drawFTCSweep(c, W, H, fn, ls, t); }
              else if (ls.vizView === 'motion')  { drawMotionLab(c, W, H, ls, t); }
              else if (ls.vizView === 'riemann') { drawRiemannAnimator(c, W, H, fn, ls, t); }
              else if (ls.vizView === 'slope')   { drawSlopeFields(c, W, H, ls, t); }
              else if (ls.vizView === 'chain')   { drawChainRule(c, W, H, ls, t); }
              else if (ls.vizView === 'taylor')  { drawTaylorSeries(c, W, H, ls, t); }
              else if (ls.vizView === 'optim')   { drawOptimization(c, W, H, ls, t); }
              else if (ls.vizView === 'related') { drawRelatedRates(c, W, H, ls, t); }
              else if (ls.vizView === 'vor')     { drawVolumeOfRevolution(c, W, H, ls, t); }
              else if (ls.vizView === 'eps')     { drawEpsilonDelta(c, W, H, ls, t); }
              else { drawComingSoon(c, W, H, ls.vizView); }

              _vizAnimId.current = requestAnimationFrame(frame);
            }
            if (!_vizLoopRunning.current) {
              _vizLoopRunning.current = true;
              _vizAnimId.current = requestAnimationFrame(frame);
            }
            cv._vizCleanup = function() {
              _vizLoopRunning.current = false;
              if (_vizAnimId.current) cancelAnimationFrame(_vizAnimId.current);
              if (resizeObs) { try { resizeObs.disconnect(); } catch(e) {} }
              cv.removeEventListener('pointerdown', onPointerDown);
              cv.removeEventListener('pointermove', onPointerMove);
            };
          }
          tryInit();
          return function() {
            if (retryTimer) clearTimeout(retryTimer);
            var cv = _vizCvRef.current;
            if (cv && cv._vizCleanup) cv._vizCleanup();
          };
        }, [d.tab]);

        // Graph sonification from the shared core stops when the tool closes.
        React.useEffect(function() {
          return function() {
            var core = window.StemLab && window.StemLab._graphAccess;
            if (core && typeof core.isPlaying === 'function' && (core.isPlaying('calc-ga-integral') || core.isPlaying('calc-ga-derivative'))) core.stop();
          };
        }, []);

        // ── Keyboard shortcuts Shift+1..6 for viz views ──
        React.useEffect(function() {
          if ((d.tab || 'integral') !== 'visualize') return;
          function onKey(e) {
            // Physical digit keys, so AZERTY (where Shift+digit types the digit) cannot switch views while typing.
            var m = /^Digit([0-9])$/.exec(e.code || '');
            if (!e.shiftKey || !m || e.ctrlKey || e.altKey || e.metaKey) return;
            var tgt = e.target;
            // WCAG 2.1.4: only while focus is in this tool, and never from a text field.
            if (!tgt || !tgt.closest || !tgt.closest('[data-stem-tool-shell]') || tgt.closest('input, textarea, select, [contenteditable="true"]')) return;
            var views = ['zoom','tangent','motion','riemann','ftc','slope','chain','taylor','optim','related'];
            e.preventDefault();
            var idx = m[1] === '0' ? 9 : parseInt(m[1], 10) - 1;
            if (views[idx]) upd('vizView', views[idx]);
          }
          window.addEventListener('keydown', onKey);
          return function() { window.removeEventListener('keydown', onKey); };
        }, [d.tab]);

        // ── VIZ DRAW FUNCTIONS (scoped inside render — OK because IIFE runs each render) ──
        // A view animates only until the student touches its control, and never under reduced motion.
        function vizAnimate(ls, key) { return !ls.reduced && !(ls.vizUserInteracted && ls.vizUserInteracted[key]); }
        function drawComingSoon(c, W, H, viewId) {
          c.fillStyle = '#94a3b8'; c.textAlign = 'center';
          c.font = 'bold 16px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_coming_soon', 'View "{view}" is not available'), { view: viewId }), W/2, H/2 - 8);
        }

        // Helper: plot a function curve onto canvas rect with axis transforms
        function plotCurve(c, fn, xR, yR, Lx, Rx, Ty, By, color, width) {
          c.save();
          c.shadowColor = color; c.shadowBlur = 6;
          c.strokeStyle = color; c.lineWidth = width || 2;
          c.beginPath();
          var N = 200;
          for (var i = 0; i <= N; i++) {
            var x = xR.min + (i / N) * (xR.max - xR.min);
            var y = fn(x);
            var sx = Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
            var sy = By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty);
            if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
          }
          c.stroke();
          c.restore();
        }
        function drawAxes(c, Lx, Rx, Ty, By, xR, yR, color) {
          color = color || 'rgba(148,163,184,0.35)';
          c.strokeStyle = color; c.lineWidth = 1;
          // x=0 axis
          if (xR.min < 0 && xR.max > 0) {
            var zeroX = Lx + ((0 - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
            c.beginPath(); c.moveTo(zeroX, Ty); c.lineTo(zeroX, By); c.stroke();
          }
          // y=0 axis
          if (yR.min < 0 && yR.max > 0) {
            var zeroY = By - ((0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.beginPath(); c.moveTo(Lx, zeroY); c.lineTo(Rx, zeroY); c.stroke();
          }
          // Frame
          c.strokeStyle = 'rgba(148,163,184,0.25)';
          c.strokeRect(Lx, Ty, Rx - Lx, By - Ty);
        }

        // ── VIEW 1: Zoom to Linearity ──
        function drawZoomToLinearity(c, W, H, fn, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDD0D ' + __alloT('stem.calculus.viz_zoom_title', 'Zoom to Linearity: what IS a derivative?'), W/2, 20);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_zoom_sub', 'Zoom in far enough and a smooth curve looks like a straight line. That line\u2019s slope is f\u2032(x\u2080).'), W/2, 36);

          var x0 = vizAnimate(ls, 'x0') && vizAnimate(ls, 'zoom') ? Math.sin(t / 90) * 2 : ls.vizX0;
          // Zoom factor: slow sine ping-pong 1x .. 100x while nothing has been touched
          var autoZoom = 1 + 100 * (1 - Math.cos(t / 90)) / 2;
          var zoom = vizAnimate(ls, 'zoom') && vizAnimate(ls, 'x0') ? autoZoom : Math.max(1, Math.min(100, ls.vizZoom));
          var halfW_x = 3 / zoom;
          var xR = { min: x0 - halfW_x, max: x0 + halfW_x };

          // Sample to find dynamic y range
          // (fn is the CALC_FUNCS wrapper { label, f, df } — call fn.f to evaluate)
          var samples = [];
          for (var si = 0; si <= 40; si++) {
            samples.push(fn.f(xR.min + (si/40) * (xR.max - xR.min)));
          }
          var yMin = Math.min.apply(null, samples), yMax = Math.max.apply(null, samples);
          var yPad = (yMax - yMin) * 0.25 + 0.05;
          var yR = { min: yMin - yPad, max: yMax + yPad };

          // Plot area
          var Lx = 60, Rx = W - 20, Ty = 56, By = H - 60;

          drawAxes(c, Lx, Rx, Ty, By, xR, yR);

          // The curve
          plotCurve(c, fn.f, xR, yR, Lx, Rx, Ty, By, '#f87171', 2.5);

          // The tangent line at x0 (always drawn)
          var slope = fn.df(x0);
          var y0 = fn.f(x0);
          var tanFn = function(x) { return slope * (x - x0) + y0; };
          c.shadowColor = '#34d399'; c.shadowBlur = 6;
          plotCurve(c, tanFn, xR, yR, Lx, Rx, Ty, By, 'rgba(52,211,153,0.85)', 2);
          c.shadowBlur = 0;

          // Marker at (x0, f(x0))
          var mx = Lx + ((x0 - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
          var my = By - ((y0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.5; c.stroke();

          // Zoom meter
          var zTxt = fillT(__alloT('stem.calculus.viz_zoom_meter', '{z}\u00D7 zoom'), { z: zoom.toFixed(0) });
          c.fillStyle = 'rgba(15,23,42,0.85)';
          c.fillRect(Lx + 10, Ty + 10, 120, 40);
          c.strokeStyle = 'rgba(59,130,246,0.5)'; c.strokeRect(Lx + 10, Ty + 10, 120, 40);
          c.fillStyle = '#60a5fa'; c.textAlign = 'left';
          c.font = 'bold 12px "Inter", sans-serif';
          c.fillText(zTxt, Lx + 18, Ty + 28);
          c.font = 'bold 10px "Inter", sans-serif'; c.fillStyle = '#34d399';
          c.fillText(fillT(__alloT('stem.calculus.viz_slope_readout', 'slope {s}'), { s: slope.toFixed(4) }), Lx + 18, Ty + 44);

          // Small legend
          c.textAlign = 'right';
          c.fillStyle = '#f87171'; c.font = 'bold 10px "Inter", sans-serif';
          c.fillText('\u2014 f(x)', Rx - 10, Ty + 20);
          c.fillStyle = '#34d399';
          c.fillText('\u2014 ' + __alloT('stem.calculus.viz_tangent_at', 'tangent at x\u2080'), Rx - 10, Ty + 36);

          // x-axis scrubber at bottom
          var scrubY = H - 34;
          c.fillStyle = 'rgba(148,163,184,0.2)';
          c.fillRect(Lx, scrubY, Rx - Lx, 18);
          c.strokeStyle = 'rgba(148,163,184,0.4)';
          c.strokeRect(Lx, scrubY, Rx - Lx, 18);
          // Map x0 across a fixed -3..3 global range for scrubber
          var gx = Lx + ((x0 + 3) / 6) * (Rx - Lx);
          c.fillStyle = '#fde047';
          c.fillRect(gx - 3, scrubY - 2, 6, 22);
          c.fillStyle = '#94a3b8'; c.textAlign = 'center';
          c.font = '9px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_x0_readout', 'x\u2080 = {x}'), { x: x0.toFixed(2) }), W/2, H - 8);
        }

        // ── VIEW 2: Tangent Explorer (curve + tangent + f'(x) trace) ──
        function drawTangentExplorer(c, W, H, fn, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDCCD ' + __alloT('stem.calculus.viz_tangent_title', 'Tangent Explorer: the derivative is itself a function'), W/2, 20);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_tangent_sub', 'Left: f(x) with its tangent line. Right: f\u2032(x), with a dot at the same x\u2080.'), W/2, 36);

          // Two panels side by side
          var gap = 12;
          var panelW = (W - gap - 40) / 2;
          var Lx1 = 20, Rx1 = Lx1 + panelW;
          var Lx2 = Rx1 + gap, Rx2 = Lx2 + panelW;
          var Ty = 56, By = H - 30;

          var xR = { min: -3, max: 3 };

          // Sample y ranges dynamically
          var fs = [], dfs = [];
          for (var si = 0; si <= 60; si++) {
            var x = xR.min + (si/60) * (xR.max - xR.min);
            fs.push(fn.f(x));
            dfs.push(fn.df(x));
          }
          var yMin = Math.min.apply(null, fs), yMax = Math.max.apply(null, fs);
          var dyMin = Math.min.apply(null, dfs), dyMax = Math.max.apply(null, dfs);
          var yR = { min: yMin - 0.5, max: yMax + 0.5 };
          var dyR = { min: dyMin - 0.5, max: dyMax + 0.5 };

          // Left panel: f(x)
          drawAxes(c, Lx1, Rx1, Ty, By, xR, yR);
          plotCurve(c, fn.f, xR, yR, Lx1, Rx1, Ty, By, '#f87171', 2);

          // Auto-sweep x0 (smooth ping-pong) if user hasn't interacted
          var x0 = vizAnimate(ls, 'x0') ? Math.sin(t / 60) * 2.5 : ls.vizX0;
          var slope = fn.df(x0);
          var y0 = fn.f(x0);

          // Tangent at x0
          var tanFn = function(x) { return slope * (x - x0) + y0; };
          c.shadowColor = '#34d399'; c.shadowBlur = 6;
          plotCurve(c, tanFn, xR, yR, Lx1, Rx1, Ty, By, 'rgba(52,211,153,0.85)', 2);
          c.shadowBlur = 0;

          // Marker
          var mx = Lx1 + ((x0 - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
          var my = By - ((y0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.2; c.stroke();

          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('f(x)', Lx1 + 8, Ty + 16);

          // Right panel: f'(x) traced
          drawAxes(c, Lx2, Rx2, Ty, By, xR, dyR);
          plotCurve(c, fn.df, xR, dyR, Lx2, Rx2, Ty, By, 'rgba(52,211,153,0.6)', 1.5);

          // A DOT on f'(x) at x0 — this is the "slope on the right matches tangent on the left"
          var dmx = Lx2 + ((x0 - xR.min) / (xR.max - xR.min)) * (Rx2 - Lx2);
          var dmy = By - ((slope - dyR.min) / (dyR.max - dyR.min)) * (By - Ty);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(dmx, dmy, 6, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.5; c.stroke();

          // Arrow from left marker up to right dot — visual "they're the same"
          c.strokeStyle = 'rgba(253,224,71,0.35)'; c.lineWidth = 1; c.setLineDash([4, 4]);
          c.beginPath(); c.moveTo(mx, my); c.lineTo(dmx, dmy); c.stroke();
          c.setLineDash([]);

          c.fillStyle = '#34d399'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText("f\u2032(x)", Lx2 + 8, Ty + 16);

          // Bottom readout
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_tangent_readout', 'x\u2080 = {x}   f(x\u2080) = {y}   f\u2032(x\u2080) = slope = {s}'), { x: x0.toFixed(2), y: y0.toFixed(2), s: slope.toFixed(2) }), W/2, H - 12);
        }

        // ── VIEW 5: FTC Sweep (THE payoff) ──
        function drawFTCSweep(c, W, H, fn, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\u2B50 ' + __alloT('stem.calculus.viz_ftc_title', 'Fundamental Theorem of Calculus: the slope of the area IS the curve'), W/2, 20);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_ftc_sub', 'Left: shaded signed area A(x) under f. Right: the graph of A(x). Its slope at any x equals f(x).'), W/2, 36);

          var gap = 12;
          var panelW = (W - gap - 40) / 2;
          var Lx1 = 20, Rx1 = Lx1 + panelW;
          var Lx2 = Rx1 + gap, Rx2 = Lx2 + panelW;
          var Ty = 56, By = H - 30;

          var xR = { min: -3, max: 3 };
          // Sample f and A
          var N = 240;
          var dxS = (xR.max - xR.min) / N;
          var fVals = new Array(N+1), AVals = new Array(N+1);
          var acc = 0;
          for (var i = 0; i <= N; i++) {
            var xi = xR.min + i * dxS;
            fVals[i] = fn.f(xi);
            if (i > 0) acc += (fVals[i-1] + fVals[i]) / 2 * dxS; // trapezoidal
            AVals[i] = acc;
          }
          var fMin = Math.min.apply(null, fVals), fMax = Math.max.apply(null, fVals);
          var aMin = Math.min.apply(null, AVals), aMax = Math.max.apply(null, AVals);
          var yR = { min: Math.min(fMin - 0.3, 0), max: fMax + 0.3 };
          var aR = { min: aMin - 0.3, max: aMax + 0.3 };

          drawAxes(c, Lx1, Rx1, Ty, By, xR, yR);
          drawAxes(c, Lx2, Rx2, Ty, By, xR, aR);

          // Auto-sweep the x pointer if user hasn't touched it
          var sweepX = vizAnimate(ls, 'ftc')
            ? (xR.min + ((Math.sin(t/80) + 1) / 2) * (xR.max - xR.min))
            : Math.max(xR.min + 0.01, Math.min(xR.max - 0.01, ls.vizFtcX));

          // Shade area [xR.min .. sweepX] under f on left panel
          var zeroY_L = By - ((0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
          c.fillStyle = 'rgba(59,130,246,0.28)';
          c.beginPath();
          var startSx = Lx1;
          c.moveTo(startSx, zeroY_L);
          for (var k = 0; k <= N; k++) {
            var xi2 = xR.min + k * dxS;
            if (xi2 > sweepX) break;
            var sx = Lx1 + ((xi2 - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
            var sy = By - ((fVals[k] - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.lineTo(sx, sy);
          }
          // Close bottom
          var endSx = Lx1 + ((sweepX - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
          c.lineTo(endSx, zeroY_L);
          c.closePath();
          c.fill();

          // Curve on top of shading
          plotCurve(c, fn.f, xR, yR, Lx1, Rx1, Ty, By, '#f87171', 2.2);

          // Sweep marker on left
          c.strokeStyle = '#fde047'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(endSx, Ty); c.lineTo(endSx, By); c.stroke();
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(endSx, zeroY_L, 4, 0, Math.PI * 2); c.fill();

          // Right panel: A(x) curve drawn only up to sweepX
          // First draw full ghost curve
          plotCurve(c, function(x){
            var idx = Math.round((x - xR.min) / dxS);
            if (idx < 0) idx = 0; if (idx > N) idx = N;
            return AVals[idx];
          }, xR, aR, Lx2, Rx2, Ty, By, 'rgba(59,130,246,0.18)', 1.5);
          // Then draw the solid portion
          c.strokeStyle = '#60a5fa'; c.lineWidth = 2.5;
          c.beginPath();
          var drawn = 0;
          for (var j = 0; j <= N; j++) {
            var xj = xR.min + j * dxS;
            if (xj > sweepX) break;
            var sx2 = Lx2 + ((xj - xR.min) / (xR.max - xR.min)) * (Rx2 - Lx2);
            var sy2 = By - ((AVals[j] - aR.min) / (aR.max - aR.min)) * (By - Ty);
            if (drawn === 0) c.moveTo(sx2, sy2); else c.lineTo(sx2, sy2);
            drawn++;
          }
          c.stroke();

          // Tangent to A(x) at sweepX — slope should equal f(sweepX)
          var idxS = Math.max(0, Math.min(N, Math.round((sweepX - xR.min) / dxS)));
          var fAtS = fVals[idxS], aAtS = AVals[idxS];
          var Lx2Offset = Lx2;
          var sxAtS = Lx2Offset + ((sweepX - xR.min) / (xR.max - xR.min)) * (Rx2 - Lx2);
          var syAtS = By - ((aAtS - aR.min) / (aR.max - aR.min)) * (By - Ty);
          // Draw the tangent
          var tanA = function(x) { return fAtS * (x - sweepX) + aAtS; };
          plotCurve(c, tanA, xR, aR, Lx2, Rx2, Ty, By, 'rgba(52,211,153,0.85)', 2);
          // Sweep dot on right
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(sxAtS, syAtS, 5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.2; c.stroke();

          // Panel labels
          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_ftc_left_label', 'f(x), shaded area = A(x)'), Lx1 + 8, Ty + 16);
          c.fillStyle = '#60a5fa';
          c.fillText('A(x) = \u222B\u208B\u2083\u02E3 f(t) dt', Lx2 + 8, Ty + 16);
          c.fillStyle = '#34d399'; c.font = 'bold 10px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_ftc_tangent', 'slope of tangent = {s}'), { s: fAtS.toFixed(2) }), Lx2 + 8, Ty + 30);

          // Bottom big insight
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_ftc_readout', 'x = {x}   A(x) = {a}   A\u2032(x) = {s}, the same as f(x)'), { x: sweepX.toFixed(2), a: aAtS.toFixed(3), s: fAtS.toFixed(3) }), W/2, H - 10);
        }

        // ── VIEW 3: Motion Lab (position / velocity / acceleration) ──
        function drawMotionLab(c, W, H, ls, t) {
          // Title
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDE97 ' + __alloT('stem.calculus.viz_motion_title', 'Motion Lab: position, velocity, acceleration'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_motion_sub', 'Velocity v(t) = p\u2032(t). Acceleration a(t) = v\u2032(t). Each graph is the slope of the one above it.'), W/2, 32);

          // Driver function — animated scenario: a car that gently accelerates, cruises, brakes
          // p(t) = 0.5 * t^2 for t in [0, 2], then linear for [2, 4], then decelerating to stop [4, 6]
          function pos(tt) {
            if (tt < 2) return 0.5 * tt * tt;
            if (tt < 4) return 2 + 2 * (tt - 2);
            if (tt < 6) return 6 + 2 * (tt - 4) - 0.5 * (tt - 4) * (tt - 4);
            return 8;
          }
          function vel(tt) {
            if (tt < 2) return tt;
            if (tt < 4) return 2;
            if (tt < 6) return 2 - (tt - 4);
            return 0;
          }
          function acc(tt) {
            if (tt < 2) return 1;
            if (tt < 4) return 0;
            if (tt < 6) return -1;
            return 0;
          }

          // Live time scrubs back and forth 0..6
          var phase = (t / 60) % 12;
          var autoTime = phase < 6 ? phase : 12 - phase; // ping-pong
          var tNow = vizAnimate(ls, 'motion') ? autoTime : Math.max(0, Math.min(6, ls.vizMotionT));

          var gap = 10;
          var panelY0 = 46;
          var panelH = (H - panelY0 - 36) / 3 - gap;
          var Lx = 60, Rx = W - 20;
          var tR = { min: 0, max: 6 };

          // 3 panels stacked
          var panels = [
            { lbl: __alloT('stem.calculus.viz_motion_pos', 'position p(t)'), fn: pos,  col: '#60a5fa', yMin: -0.5, yMax: 8.8 },
            { lbl: __alloT('stem.calculus.viz_motion_vel', 'velocity v(t) = p\u2032(t)'), fn: vel, col: '#34d399', yMin: -0.5, yMax: 2.8 },
            { lbl: __alloT('stem.calculus.viz_motion_acc', 'acceleration a(t) = v\u2032(t)'), fn: acc, col: '#fbbf24', yMin: -1.5, yMax: 1.5 }
          ];

          panels.forEach(function(p, pi) {
            var Ty = panelY0 + pi * (panelH + gap);
            var By = Ty + panelH;
            var yR = { min: p.yMin, max: p.yMax };
            drawAxes(c, Lx, Rx, Ty, By, tR, yR);
            plotCurve(c, p.fn, tR, yR, Lx, Rx, Ty, By, p.col, 2);
            // Label
            c.fillStyle = p.col; c.textAlign = 'left';
            c.font = 'bold 10.5px "Inter", sans-serif';
            c.fillText(p.lbl, Lx + 6, Ty + 12);
            // Dot at current time
            var yVal = p.fn(tNow);
            var sx = Lx + ((tNow - tR.min) / (tR.max - tR.min)) * (Rx - Lx);
            var sy = By - ((yVal - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.fillStyle = '#fde047';
            c.beginPath(); c.arc(sx, sy, 4.5, 0, Math.PI * 2); c.fill();
            c.strokeStyle = '#0f172a'; c.lineWidth = 1; c.stroke();
            // Readout of current value, on a dark backing: the curve can run under it.
            c.font = 'bold 10px "Inter", sans-serif';
            var rdTxt = '= ' + yVal.toFixed(2), rdW = c.measureText(rdTxt).width;
            c.fillStyle = 'rgba(15,23,42,0.92)'; c.fillRect(Rx - 9 - rdW, Ty + 2, rdW + 6, 14);
            c.fillStyle = '#e2e8f0'; c.textAlign = 'right';
            c.fillText(rdTxt, Rx - 6, Ty + 12);
            // Vertical time indicator line across panel
            c.strokeStyle = 'rgba(253,224,71,0.35)'; c.lineWidth = 1;
            c.beginPath(); c.moveTo(sx, Ty); c.lineTo(sx, By); c.stroke();
          });

          // Animated "car" at the top between t-axis and panel 1
          var carY = 40;
          var carX = Lx + (pos(tNow) / 8) * (Rx - Lx);
          c.fillStyle = '#ef4444';
          c.fillRect(carX - 10, carY - 6, 20, 10);
          c.fillStyle = '#1f2937';
          c.beginPath(); c.arc(carX - 5, carY + 4, 2, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.arc(carX + 5, carY + 4, 2, 0, Math.PI * 2); c.fill();

          // Bottom timestamp
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_motion_readout', 't = {t} s. The slope of each graph is the graph below it.'), { t: tNow.toFixed(2) }), W/2, H - 12);
        }

        // ── VIEW 4: Riemann Animator (n=1..256 all four methods) ──
        function drawRiemannAnimator(c, W, H, fn, ls, t) {
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83C\uDFAC ' + __alloT('stem.calculus.viz_riemann_title', 'Riemann Animator: as n grows, every method converges'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_riemann_sub', 'Left, right, midpoint and trapezoid sums side by side; the errors shrink toward 0.'), W/2, 32);

          // n ramps 1..256 on a log scale while animating; otherwise the n slider rules.
          var n;
          if (vizAnimate(ls, 'riemann')) {
            var phase = (t / 4) % 240;
            var k = phase < 120 ? phase / 120 : (240 - phase) / 120;
            n = Math.max(1, Math.min(256, Math.round(Math.pow(2, k * 8))));
          } else n = Math.round(ls.vizN);

          // 4 small panels (2x2)
          var methods = [
            { id: 'left',      lbl: __alloT('stem.calculus.method_left', 'Left'),       col: '#f87171' },
            { id: 'right',     lbl: __alloT('stem.calculus.method_right', 'Right'),      col: '#fbbf24' },
            { id: 'midpoint',  lbl: __alloT('stem.calculus.method_midpoint', 'Midpoint'),   col: '#34d399' },
            { id: 'trapezoid', lbl: __alloT('stem.calculus.method_trapezoid', 'Trapezoid'),  col: '#60a5fa' }
          ];
          var gx = 14, gy = 46;
          var pw = (W - gx * 3) / 2;
          var ph = (H - gy - 40) / 2 - gx;

          var xR = { min: -2, max: 2 };
          var sampleY = [];
          for (var si = 0; si <= 40; si++) sampleY.push(fn.f(xR.min + (si/40) * (xR.max - xR.min)));
          var fMin = Math.min.apply(null, sampleY), fMax = Math.max.apply(null, sampleY);
          var yR = { min: Math.min(fMin - 0.3, 0), max: fMax + 0.3 };

          // Numerical reference via fine-grained trapezoid
          var exactAcc = 0, NE = 2000, dxE = (xR.max - xR.min) / NE;
          var prevY = fn.f(xR.min);
          for (var i = 1; i <= NE; i++) {
            var curY = fn.f(xR.min + i * dxE);
            exactAcc += (prevY + curY) / 2 * dxE;
            prevY = curY;
          }

          methods.forEach(function(m, mi) {
            var col = mi % 2, row = Math.floor(mi / 2);
            var Lx = gx + col * (pw + gx);
            var Ty = gy + row * (ph + gx);
            var Rx = Lx + pw, By = Ty + ph;

            drawAxes(c, Lx, Rx, Ty, By, xR, yR);
            plotCurve(c, fn.f, xR, yR, Lx, Rx, Ty, By, m.col, 1.5);

            // Draw rectangles
            var dx = (xR.max - xR.min) / n;
            var approx = 0;
            var zeroY = By - ((0 - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.fillStyle = m.col.replace('#', 'rgba(') ? m.col : m.col; // fallback
            for (var r = 0; r < n; r++) {
              var xi = xR.min + r * dx;
              var yVal;
              if (m.id === 'left')       yVal = fn.f(xi);
              else if (m.id === 'right') yVal = fn.f(xi + dx);
              else if (m.id === 'midpoint') yVal = fn.f(xi + dx/2);
              else { yVal = (fn.f(xi) + fn.f(xi + dx)) / 2; } // trapezoid area-equivalent for approx
              approx += yVal * dx;

              var rxL = Lx + ((xi - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
              var rxR = Lx + ((xi + dx - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
              var ryT, ryB;
              if (m.id === 'trapezoid') {
                // Draw trapezoid polygon
                var yL = fn.f(xi), yRv = fn.f(xi + dx);
                var syL = By - ((yL - yR.min) / (yR.max - yR.min)) * (By - Ty);
                var syR = By - ((yRv - yR.min) / (yR.max - yR.min)) * (By - Ty);
                c.fillStyle = m.col + '33';
                c.strokeStyle = m.col; c.lineWidth = 0.6;
                c.beginPath();
                c.moveTo(rxL, zeroY); c.lineTo(rxL, syL); c.lineTo(rxR, syR); c.lineTo(rxR, zeroY); c.closePath();
                c.fill(); c.stroke();
              } else {
                var sy = By - ((yVal - yR.min) / (yR.max - yR.min)) * (By - Ty);
                c.fillStyle = m.col + '33';
                c.strokeStyle = m.col; c.lineWidth = 0.6;
                var top = Math.min(sy, zeroY), hr = Math.abs(sy - zeroY);
                c.fillRect(rxL, top, rxR - rxL, hr);
                c.strokeRect(rxL, top, rxR - rxL, hr);
              }
            }
            // Panel label + error
            c.fillStyle = m.col; c.textAlign = 'left';
            c.font = 'bold 11px "Inter", sans-serif';
            c.fillText(m.lbl, Lx + 6, Ty + 13);
            var err = Math.abs(approx - exactAcc);
            c.fillStyle = '#e2e8f0'; c.textAlign = 'right';
            c.font = 'bold 10px "Inter", sans-serif';
            c.fillText(fillT(__alloT('stem.calculus.viz_err', 'error {e}'), { e: err.toFixed(4) }), Rx - 6, Ty + 13);
          });

          // Footer: n readout + exact value
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_riemann_readout', 'n = {n}. Reference integral \u2248 {v}.'), { n: n, v: exactAcc.toFixed(4) }), W/2, H - 12);
        }

        // ── VIEW 6: Slope Fields + trajectories ──
        function drawSlopeFields(c, W, H, ls, t) {
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83C\uDF0A ' + __alloT('stem.calculus.viz_slope_title', 'Slope Fields: see a differential equation without solving it'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_slope_sub', 'dy/dx = f(x, y). Each segment shows the slope there; solution curves follow the field.'), W/2, 32);

          // Pick a slope function — auto-cycle through 3 interesting ODEs
          var odeIdx = vizAnimate(ls, 'ode') ? Math.floor((t / 300)) % VIZ_ODES.length : Math.round(ls.vizOde);
          var ode = VIZ_ODES[odeIdx] || VIZ_ODES[0];

          var Lx = 30, Rx = W - 30, Ty = 46, By = H - 36;
          var xR = { min: -3, max: 3 };
          var yR = { min: -2.5, max: 2.5 };
          drawAxes(c, Lx, Rx, Ty, By, xR, yR);

          // Grid of arrows
          var nx = 24, ny = 16;
          for (var ix = 0; ix < nx; ix++) {
            for (var iy = 0; iy < ny; iy++) {
              var x = xR.min + (ix + 0.5) / nx * (xR.max - xR.min);
              var y = yR.min + (iy + 0.5) / ny * (yR.max - yR.min);
              var slope;
              try { slope = ode.df(x, y); } catch(e) { slope = 0; }
              if (!isFinite(slope)) continue;
              // Clamp large slopes for display
              var theta = Math.atan(slope);
              var len = 12;
              var sx = Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
              var sy = By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty);
              var dx = Math.cos(theta) * len / 2;
              var dy = -Math.sin(theta) * len / 2;
              // Color by slope magnitude
              var mag = Math.min(1, Math.abs(slope) / 3);
              var r = Math.floor(100 + mag * 155);
              var g = Math.floor(200 - mag * 80);
              var b = 255 - Math.floor(mag * 120);
              c.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.75)';
              c.lineWidth = 1.2;
              c.beginPath(); c.moveTo(sx - dx, sy - dy); c.lineTo(sx + dx, sy + dy); c.stroke();
              // Small arrowhead
              c.beginPath();
              c.moveTo(sx + dx, sy + dy);
              c.lineTo(sx + dx - Math.cos(theta + 0.4) * 3, sy + dy + Math.sin(theta + 0.4) * 3);
              c.stroke();
            }
          }

          // Euler-stepped trajectories from a few seed points
          var seeds = [
            { x: -2.8, y: -2.0, col: '#fbbf24' },
            { x: -2.8, y:  0.0, col: '#34d399' },
            { x: -2.8, y:  2.0, col: '#60a5fa' },
            { x:  0.0, y: -2.3, col: '#f472b6' },
            { x:  0.0, y:  2.3, col: '#a78bfa' }
          ];
          // Append up to 4 user-clicked seeds (cycle palette)
          var userSeeds = ls.vizSlopeSeeds || [];
          var userCols = ['#fde047', '#22d3ee', '#fb7185', '#84cc16'];
          userSeeds.slice(-4).forEach(function(s, si) {
            seeds.push({ x: s.x, y: s.y, col: userCols[si % userCols.length] });
          });
          seeds.forEach(function(s) {
            c.strokeStyle = s.col; c.lineWidth = 2;
            c.shadowColor = s.col; c.shadowBlur = 4;
            c.beginPath();
            var x = s.x, y = s.y;
            var step = 0.03, steps = 260;
            var started = false;
            for (var k = 0; k < steps; k++) {
              var slope = ode.df(x, y);
              if (!isFinite(slope)) break;
              // Clip trajectory to panel
              if (x < xR.min || x > xR.max || y < yR.min - 0.5 || y > yR.max + 0.5) break;
              var sx = Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
              var sy = By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty);
              if (!started) { c.moveTo(sx, sy); started = true; } else { c.lineTo(sx, sy); }
              // RK2 (midpoint) step for a smoother curve
              var kx = step, ky = slope * step;
              var mSlope = ode.df(x + kx/2, y + ky/2);
              x += step;
              y += mSlope * step;
            }
            c.stroke();
            c.shadowBlur = 0;
            // Seed marker
            var ssx = Lx + ((s.x - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
            var ssy = By - ((s.y - yR.min) / (yR.max - yR.min)) * (By - Ty);
            c.fillStyle = s.col;
            c.beginPath(); c.arc(ssx, ssy, 3.5, 0, Math.PI * 2); c.fill();
          });

          // Euler's method path from the seed point (white), and the true solution once the prediction is in (orange).
          var eu = ls.vizEuler;
          if (eu && eu.on && Math.round(ls.vizOde) === odeIdx) {
            var toPX = function(x) { return Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx); }, toPY = function(y) { return By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty); };
            var inView = function(y) { return y > yR.min - 1 && y < yR.max + 1; };
            if (eu.truth) {
              var tr = calcOdeTruth(odeIdx, eu.x0, eu.y0);
              c.strokeStyle = '#fb923c'; c.lineWidth = 2.5; c.setLineDash([6, 4]); c.beginPath();
              var penT = false;
              for (var ti = 0; ti <= 80; ti++) { var tx = eu.x0 + 2 * ti / 80, ty = tr.at(tx); if (!isFinite(ty) || !inView(ty)) { penT = false; continue; } if (!penT) { c.moveTo(toPX(tx), toPY(ty)); penT = true; } else c.lineTo(toPX(tx), toPY(ty)); }
              c.stroke(); c.setLineDash([]);
            }
            var epts = calcEuler(ode.df, eu.x0, eu.y0, eu.h, Math.round(2 / eu.h));
            c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath();
            epts.forEach(function(p, pi) { if (!inView(p.y)) return; if (pi === 0) c.moveTo(toPX(p.x), toPY(p.y)); else c.lineTo(toPX(p.x), toPY(p.y)); });
            c.stroke();
            c.fillStyle = '#ffffff';
            epts.forEach(function(p) { if (inView(p.y)) { c.beginPath(); c.arc(toPX(p.x), toPY(p.y), 3, 0, Math.PI * 2); c.fill(); } });
          }

          // ODE label. (The fill used to sit inside this comment, so the box took the last fill
          // colour: white after the Euler dots, under #c7d2fe text at 1.5:1.)
          c.fillStyle = 'rgba(15,23,42,0.85)';
          c.fillRect(Lx + 8, Ty + 8, 140, 26);
          c.strokeStyle = 'rgba(99,102,241,0.5)';
          c.strokeRect(Lx + 8, Ty + 8, 140, 26);
          c.fillStyle = '#c7d2fe'; c.textAlign = 'left';
          c.font = 'bold 12px "Inter", sans-serif';
          c.fillText(ode.name, Lx + 18, Ty + 26);

          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_slope_field_caption', 'Each coloured curve is one solution, found by following the field.'), W/2, H - 12);
        }

        // ── VIEW 7: Chain Rule (gears metaphor) ──
        function drawChainRule(c, W, H, ls, t) {
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          var kIn = Math.round(ls.vizChainK) || 2;
          c.fillText("\u2699\uFE0F " + __alloT('stem.calculus.viz_chain_title', 'Chain Rule: rates multiply when functions compose'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(fillT(__alloT('stem.calculus.viz_chain_sub', 'Inner u = {k}x, outer f = sin(u). df/dx = cos(u) \u00D7 {k}.'), { k: kIn }), W/2, 32);

          // x sweeps while animating; otherwise the x slider rules. u = kx; f = sin(u)
          var x = vizAnimate(ls, 'chain') ? Math.sin(t / 90) * 2 : ls.vizChainX;
          var u = kIn * x;
          var fVal = Math.sin(u);
          var duDx = kIn;
          var dfDu = Math.cos(u);
          var dfDx = dfDu * duDx;

          // Three panels: [x axis box] [meshed gears] [f(x) graph]
          // Gears are the centerpiece
          var gearY = H * 0.48;
          var innerX = W * 0.36;
          var outerX = W * 0.62;

          // Rotation: inner turns at rate proportional to du/dx
          // Angle accumulates with x (since x is a sin wave here, angle oscillates too)
          var innerAngle = u * 0.4;          // visually ties to u
          var outerAngle = -innerAngle * 1.7; // ratio 1.7 = dfDu placeholder (gears visual metaphor, not strict)

          function drawGear(cx, cy, R, teeth, angle, col, col2) {
            c.save(); c.translate(cx, cy); c.rotate(angle);
            c.fillStyle = col;
            c.beginPath();
            for (var i = 0; i < teeth * 2; i++) {
              var a = (i / (teeth * 2)) * Math.PI * 2;
              var r = (i % 2 === 0) ? R : R * 0.88;
              if (i === 0) c.moveTo(r, 0); else c.lineTo(r * Math.cos(a), r * Math.sin(a));
            }
            c.closePath(); c.fill();
            c.strokeStyle = col2; c.lineWidth = 1.5; c.stroke();
            // Hub
            c.fillStyle = col2;
            c.beginPath(); c.arc(0, 0, R * 0.28, 0, Math.PI * 2); c.fill();
            // Spoke so rotation is visible
            c.strokeStyle = '#0f172a'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(0, 0); c.lineTo(R * 0.75, 0); c.stroke();
            c.restore();
          }

          // Inner gear (small, ties to x)
          drawGear(innerX, gearY, 44, 12, innerAngle, '#60a5fa', '#1e3a8a');
          // Outer gear (bigger, ties to f)
          drawGear(outerX, gearY, 64, 18, outerAngle, '#fbbf24', '#78350f');

          // Tangent arrow on inner = du/dx
          c.strokeStyle = '#38bdf8'; c.lineWidth = 3;
          c.beginPath();
          c.moveTo(innerX + 44, gearY);
          c.lineTo(innerX + 44 + duDx * 18, gearY - 18);
          c.stroke();
          // Tangent arrow on outer = df/du
          c.strokeStyle = '#fbbf24';
          c.beginPath();
          c.moveTo(outerX - 64, gearY);
          c.lineTo(outerX - 64 - dfDu * 20, gearY + 20);
          c.stroke();

          // Labels above each gear
          c.fillStyle = '#60a5fa'; c.textAlign = 'center';
          c.font = 'bold 12px "Inter", sans-serif';
          c.fillText('u = ' + kIn + 'x', innerX, gearY - 64);
          c.font = 'bold 10.5px "Inter", sans-serif'; c.fillStyle = '#7dd3fc';
          c.fillText('du/dx = ' + kIn, innerX, gearY - 48);

          c.fillStyle = '#fbbf24';
          c.font = 'bold 12px "Inter", sans-serif';
          c.fillText('f = sin(u)', outerX, gearY - 84);
          c.font = 'bold 10.5px "Inter", sans-serif'; c.fillStyle = '#fde68a';
          c.fillText('df/du = cos(u) = ' + dfDu.toFixed(2), outerX, gearY - 68);

          // Chain rule equation below gears (animated final value)
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('df/dx = df/du \u00D7 du/dx = ' + dfDu.toFixed(2) + ' \u00D7 ' + duDx.toFixed(0) + ' = ' + dfDx.toFixed(2), W/2, gearY + 88);

          // Left input indicator: x input tape
          var tapeLx = 20, tapeRx = W - 20, tapeY = H - 30;
          c.fillStyle = 'rgba(148,163,184,0.2)';
          c.fillRect(tapeLx, tapeY, tapeRx - tapeLx, 16);
          c.strokeStyle = 'rgba(148,163,184,0.4)';
          c.strokeRect(tapeLx, tapeY, tapeRx - tapeLx, 16);
          var tapeX = tapeLx + ((x + 3) / 6) * (tapeRx - tapeLx);
          c.fillStyle = '#fde047';
          c.fillRect(tapeX - 3, tapeY - 3, 6, 22);

          // Readout
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 10px "Inter", sans-serif';
          c.fillText('x = ' + x.toFixed(2) + '    u = ' + kIn + 'x = ' + u.toFixed(2) + '    f = sin(u) = ' + fVal.toFixed(2), W/2, tapeY - 6);
        }

        // ── VIEW 8: Taylor Series Builder (any of five targets, degree from the slider) ──
        function drawTaylorSeries(c, W, H, ls, t) {
          var T = VIZ_TAYLOR[ls.vizTaylorFn] || VIZ_TAYLOR.sin;
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\u221E ' + fillT(__alloT('stem.calculus.viz_taylor_title', 'Taylor Series: a polynomial becomes {f}, one term at a time'), { f: T.label }), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(isFinite(T.radius) ? __alloT('stem.calculus.viz_taylor_sub_radius', 'This series only converges for \u22121 < x < 1: watch what happens outside that interval.') : __alloT('stem.calculus.viz_taylor_sub', 'Centred at 0. Each extra term bends the polynomial to match the curve further out.'), W/2, 32);

          // Degree ramps 1..13 while animating; otherwise the degree slider rules.
          var deg;
          if (vizAnimate(ls, 'taylor')) {
            var phase = (t / 4) % 180;
            deg = phase < 90 ? Math.floor(phase / 6) + 1 : Math.floor((180 - phase) / 6) + 1;
            deg = Math.max(1, Math.min(13, deg));
          } else deg = Math.round(ls.vizTaylorDeg);

          var Lx = 50, Rx = W - 30, Ty = 50, By = H - 60;
          var xR = isFinite(T.radius) ? { min: -2.5, max: 2.5 } : { min: -7, max: 7 };
          var yR = ls.vizTaylorFn === 'exp' ? { min: -2, max: 12 } : ls.vizTaylorFn === 'geo' ? { min: -4, max: 8 } : { min: -2.5, max: 2.5 };
          drawAxes(c, Lx, Rx, Ty, By, xR, yR);
          if (isFinite(T.radius)) {
            var rl = Lx + ((-T.radius - xR.min) / (xR.max - xR.min)) * (Rx - Lx), rr = Lx + ((T.radius - xR.min) / (xR.max - xR.min)) * (Rx - Lx);
            c.fillStyle = 'rgba(96,165,250,0.12)'; c.fillRect(rl, Ty, rr - rl, By - Ty);
          }
          // Target curve, broken where it is undefined or off the window.
          function strokeFn(fn, color, width, dash) {
            c.save(); c.strokeStyle = color; c.lineWidth = width; c.setLineDash(dash || []);
            c.beginPath();
            var started = false, N = 240;
            for (var i = 0; i <= N; i++) {
              var x = xR.min + (i / N) * (xR.max - xR.min), y = fn(x);
              if (!isFinite(y) || y > yR.max + 6 || y < yR.min - 6) { started = false; continue; }
              var sx = Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx), sy = By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty);
              if (!started) { c.moveTo(sx, sy); started = true; } else c.lineTo(sx, sy);
            }
            c.stroke(); c.restore();
          }
          strokeFn(T.f, 'rgba(248,113,113,0.9)', 2.6);
          strokeFn(function(x) { return vizTaylorAt(ls.vizTaylorFn, deg, x); }, '#34d399', 2.5, [8, 4]);

          // Expression bar at top
          c.fillStyle = 'rgba(15,23,42,0.85)';
          c.fillRect(Lx + 8, Ty + 8, 300, 40);
          c.strokeStyle = 'rgba(52,211,153,0.5)';
          c.strokeRect(Lx + 8, Ty + 8, 300, 40);
          c.fillStyle = '#34d399'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_taylor_degree', 'degree {n} Taylor polynomial'), { n: deg }), Lx + 18, Ty + 24);
          c.font = '10.5px monospace'; c.fillStyle = '#a7f3d0';
          var polyStr = vizTaylorText(ls.vizTaylorFn, deg);
          c.fillText(polyStr.slice(0, 54) + (polyStr.length > 54 ? '\u2026' : ''), Lx + 18, Ty + 40);

          var xCheck = isFinite(T.radius) ? 0.5 : 3;
          var errAt = Math.abs(vizTaylorAt(ls.vizTaylorFn, deg, xCheck) - T.f(xCheck));
          c.fillStyle = '#fbbf24'; c.textAlign = 'right';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_taylor_error', 'error at x = {x}: {e}'), { x: xCheck, e: errAt.toExponential(2) }), Rx - 8, Ty + 24);

          // Legend: colour and dash both carry the meaning
          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 10.5px "Inter", sans-serif';
          c.fillText('\u2014 ' + fillT(__alloT('stem.calculus.viz_taylor_target', 'target: {f} (solid)'), { f: T.label }), Lx + 8, By + 18);
          c.fillStyle = '#34d399';
          c.fillText('- - ' + __alloT('stem.calculus.viz_taylor_poly', 'Taylor polynomial (dashed)'), Lx + 8, By + 34);
        }

        // ── VIEW 9: Optimization (cardboard box) ──
        function drawOptimization(c, W, H, ls, t) {
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDCE6 ' + __alloT('stem.calculus.viz_optim_title', 'Optimization: the cardboard box'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_optim_sub', 'Cut squares of side x from the corners of a 20 \u00D7 12 sheet and fold up the sides. Which x gives the most volume?'), W/2, 32);

          // Sheet dimensions (inches)
          var SW = 20, SH = 12;
          // Animated x: ping-pong from 0.1 to 5.8 (max allowed = SH/2 = 6 but keeps some material)
          var xMax = SH / 2 - 0.2;
          var x;
          if (!vizAnimate(ls, 'optim')) {
            x = Math.max(0.05, Math.min(xMax, ls.vizOptimX == null ? 2.4 : ls.vizOptimX));
          } else {
            var phase = (t / 80) % 2;
            x = phase < 1 ? 0.1 + phase * xMax : 0.1 + (2 - phase) * xMax;
          }

          // V(x) = x(SW - 2x)(SH - 2x)
          var V = function(xx) { return xx * (SW - 2 * xx) * (SH - 2 * xx); };
          var dV = function(xx) { return 12 * xx * xx - 128 * xx + 240; }; // derivative for 20x12
          // Find critical point numerically: V'(x) = 12x^2 - 128x + 240 = 0
          // x = (128 - sqrt(128^2 - 4*12*240)) / (2*12) = (128 - sqrt(16384 - 11520)) / 24 = (128 - sqrt(4864))/24
          var xCrit = (128 - Math.sqrt(128 * 128 - 4 * 12 * 240)) / 24; // ~2.43
          var Vcrit = V(xCrit);
          var Vnow = V(x);

          // LEFT: top-down view of the sheet with cuts
          var Lx1 = 20, Ty1 = 52, panelW = W * 0.42, panelH = H * 0.46;
          var Rx1 = Lx1 + panelW, By1 = Ty1 + panelH;
          c.fillStyle = '#1e293b'; c.fillRect(Lx1, Ty1, panelW, panelH);
          c.strokeStyle = 'rgba(148,163,184,0.35)'; c.strokeRect(Lx1, Ty1, panelW, panelH);

          // Scale sheet to fit panel with margin
          var sheetScale = Math.min((panelW - 30) / SW, (panelH - 30) / SH);
          var cx = Lx1 + panelW / 2, cy = Ty1 + panelH / 2;
          var sx = cx - SW * sheetScale / 2, sy = cy - SH * sheetScale / 2;
          // Sheet base
          c.fillStyle = '#d97706';
          c.fillRect(sx, sy, SW * sheetScale, SH * sheetScale);
          c.strokeStyle = '#78350f'; c.lineWidth = 1.5; c.strokeRect(sx, sy, SW * sheetScale, SH * sheetScale);
          // Cut-outs at four corners
          c.fillStyle = '#1e293b';
          var cs = x * sheetScale;
          c.fillRect(sx, sy, cs, cs);
          c.fillRect(sx + SW * sheetScale - cs, sy, cs, cs);
          c.fillRect(sx, sy + SH * sheetScale - cs, cs, cs);
          c.fillRect(sx + SW * sheetScale - cs, sy + SH * sheetScale - cs, cs, cs);
          // Dashed fold lines
          c.strokeStyle = 'rgba(252,211,77,0.7)'; c.setLineDash([4, 3]); c.lineWidth = 1;
          c.beginPath(); c.moveTo(sx + cs, sy); c.lineTo(sx + cs, sy + SH * sheetScale); c.stroke();
          c.beginPath(); c.moveTo(sx + SW * sheetScale - cs, sy); c.lineTo(sx + SW * sheetScale - cs, sy + SH * sheetScale); c.stroke();
          c.beginPath(); c.moveTo(sx, sy + cs); c.lineTo(sx + SW * sheetScale, sy + cs); c.stroke();
          c.beginPath(); c.moveTo(sx, sy + SH * sheetScale - cs); c.lineTo(sx + SW * sheetScale, sy + SH * sheetScale - cs); c.stroke();
          c.setLineDash([]);

          // Dimension labels
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 10px "Inter", sans-serif';
          c.fillText('20 in', cx, sy - 8);
          c.save(); c.translate(sx - 14, cy); c.rotate(-Math.PI / 2); c.fillText('12 in', 0, 0); c.restore();

          // Panel label
          c.fillStyle = '#fbbf24'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_optim_cut', 'cut size x = {x} in'), { x: x.toFixed(2) }), Lx1 + 10, Ty1 + 16);

          // Small 3D-ish box preview below sheet
          var bbW = (SW - 2 * x), bbD = (SH - 2 * x), bbH = x;
          var bX = cx, bY = By1 + 32;
          var bs = 4; // pixels per inch for small 3D box
          var baseW = bbW * bs, baseD = bbD * bs * 0.55, baseH = bbH * bs;
          c.save();
          c.translate(bX - baseW / 2, bY - baseH);
          // back face
          c.fillStyle = '#92400e';
          c.beginPath();
          c.moveTo(0, 0); c.lineTo(baseW, 0); c.lineTo(baseW + baseD, -baseD * 0.6); c.lineTo(baseD, -baseD * 0.6); c.closePath();
          c.fill();
          // side right
          c.fillStyle = '#b45309';
          c.beginPath();
          c.moveTo(baseW, 0); c.lineTo(baseW, baseH); c.lineTo(baseW + baseD, baseH - baseD * 0.6); c.lineTo(baseW + baseD, -baseD * 0.6); c.closePath();
          c.fill();
          // front face
          c.fillStyle = '#f59e0b';
          c.fillRect(0, 0, baseW, baseH);
          c.strokeStyle = '#78350f'; c.lineWidth = 0.8;
          c.strokeRect(0, 0, baseW, baseH);
          c.restore();
          // Dimensions under box
          c.fillStyle = '#fde68a'; c.textAlign = 'center';
          c.font = 'bold 9px "Inter", sans-serif';
          c.fillText(bbW.toFixed(1) + ' \u00D7 ' + bbD.toFixed(1) + ' \u00D7 ' + bbH.toFixed(1) + ' in', bX, bY + 16);

          // RIGHT: V(x) curve
          var Lx2 = Rx1 + 20, Ty2 = Ty1, Rx2 = W - 20, By2 = By1 + 30;
          var xRg = { min: 0, max: xMax + 0.5 };
          var vVals = [];
          for (var i = 0; i <= 80; i++) vVals.push(V(xRg.min + (i / 80) * (xRg.max - xRg.min)));
          var vMax = Math.max.apply(null, vVals) * 1.1;
          var yRg = { min: 0, max: vMax };

          drawAxes(c, Lx2, Rx2, Ty2, By2, xRg, yRg);
          plotCurve(c, V, xRg, yRg, Lx2, Rx2, Ty2, By2, '#34d399', 2.2);

          // Dotted vertical at xCrit (the maximum), drawn only after the student commits a guess
          var cX = Lx2 + ((xCrit - xRg.min) / (xRg.max - xRg.min)) * (Rx2 - Lx2);
          if (ls.vizOptimReveal) {
          var cY = By2 - ((Vcrit - yRg.min) / (yRg.max - yRg.min)) * (By2 - Ty2);
          c.strokeStyle = 'rgba(253,224,71,0.55)'; c.lineWidth = 1.2; c.setLineDash([4, 4]);
          c.beginPath(); c.moveTo(cX, Ty2); c.lineTo(cX, By2); c.stroke();
          c.setLineDash([]);
          c.fillStyle = '#fde047';
          c.beginPath(); c.arc(cX, cY, 6, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1.5; c.stroke();
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 10px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_optim_max', 'maximum at x \u2248 {x}'), { x: xCrit.toFixed(2) }), cX, cY - 12);
          }

          // Current x marker
          var curXp = Lx2 + ((x - xRg.min) / (xRg.max - xRg.min)) * (Rx2 - Lx2);
          var curYp = By2 - ((Vnow - yRg.min) / (yRg.max - yRg.min)) * (By2 - Ty2);
          c.fillStyle = '#f87171';
          c.beginPath(); c.arc(curXp, curYp, 4.5, 0, Math.PI * 2); c.fill();
          c.strokeStyle = '#0f172a'; c.lineWidth = 1; c.stroke();

          // Panel label
          c.fillStyle = '#34d399'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('V(x) = x(20-2x)(12-2x)', Lx2 + 8, Ty2 + 16);

          // Footer
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(ls.vizOptimReveal
            ? fillT(__alloT('stem.calculus.viz_optim_readout_max', 'V({x}) = {v} in\u00B3. Maximum volume {m} in\u00B3 at x = {c}.'), { x: x.toFixed(2), v: Vnow.toFixed(1), m: Vcrit.toFixed(1), c: xCrit.toFixed(2) })
            : fillT(__alloT('stem.calculus.viz_optim_readout', 'V({x}) = {v} in\u00B3. Where is the maximum?'), { x: x.toFixed(2), v: Vnow.toFixed(1) }), W/2, H - 12);
        }

        // ── VIEW 10: Related Rates (sliding ladder) ──
        function drawRelatedRates(c, W, H, ls, t) {
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83D\uDCCF ' + __alloT('stem.calculus.viz_related_title', 'Related Rates: a sliding ladder'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_related_sub', 'A 13 ft ladder. The bottom slides away at 2 ft/s. How fast does the top slide down?'), W/2, 32);

          var L = 13; // ladder length
          var dxDt = 2; // constant bottom velocity (ft/s)
          // Animate x(t): x starts at 0.5 ft, grows at 2 ft/s until x ≈ 12.8 ft, then resets
          var xFt;
          if (vizAnimate(ls, 'related')) xFt = 0.5 + dxDt * ((t / 60) % 6);
          else xFt = ls.vizLadderX;
          if (xFt > L - 0.3) xFt = L - 0.3;
          var yFt = Math.sqrt(Math.max(0, L * L - xFt * xFt));
          var dyDt = yFt > 0.01 ? -(xFt / yFt) * dxDt : -Infinity;

          // Scene layout
          var sceneX = 40, sceneY = H - 50;
          var pxPerFt = Math.min((W * 0.45 - 60) / L, (H - 100) / L);

          // Wall
          c.fillStyle = '#94a3b8';
          c.fillRect(sceneX - 12, sceneY - L * pxPerFt, 12, L * pxPerFt);
          // Floor
          c.fillStyle = '#475569';
          c.fillRect(sceneX - 12, sceneY, W * 0.55, 10);

          // Ladder
          var bx = sceneX + xFt * pxPerFt, by = sceneY;
          var tx = sceneX, ty = sceneY - yFt * pxPerFt;
          c.strokeStyle = '#fbbf24'; c.lineWidth = 5;
          c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
          // Rungs
          c.strokeStyle = '#b45309'; c.lineWidth = 2;
          for (var rg = 1; rg < 10; rg++) {
            var ra = rg / 10;
            var rgx = bx * (1 - ra) + tx * ra;
            var rgy = by * (1 - ra) + ty * ra;
            var ang = Math.atan2(ty - by, tx - bx) + Math.PI / 2;
            var rl = 9;
            c.beginPath();
            c.moveTo(rgx + Math.cos(ang) * rl, rgy + Math.sin(ang) * rl);
            c.lineTo(rgx - Math.cos(ang) * rl, rgy - Math.sin(ang) * rl);
            c.stroke();
          }
          // Endpoints
          c.fillStyle = '#f87171';
          c.beginPath(); c.arc(bx, by, 6, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#60a5fa';
          c.beginPath(); c.arc(tx, ty, 6, 0, Math.PI * 2); c.fill();

          // Velocity arrow on bottom (→ direction at 2 ft/s)
          c.strokeStyle = '#f87171'; c.lineWidth = 3;
          c.beginPath();
          c.moveTo(bx, by + 16); c.lineTo(bx + dxDt * pxPerFt * 0.8, by + 16);
          c.stroke();
          // Arrowhead
          c.beginPath();
          c.moveTo(bx + dxDt * pxPerFt * 0.8, by + 16);
          c.lineTo(bx + dxDt * pxPerFt * 0.8 - 8, by + 12);
          c.lineTo(bx + dxDt * pxPerFt * 0.8 - 8, by + 20);
          c.closePath();
          c.fillStyle = '#f87171'; c.fill();
          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 10px "Inter", sans-serif';
          c.fillText('dx/dt = +' + dxDt + ' ft/s', bx + 6, by + 32);

          // Velocity arrow on top (↓ direction at |dy/dt| ft/s)
          var topArrowLen = Math.min(Math.abs(dyDt), 8) * pxPerFt * 0.4;
          c.strokeStyle = '#60a5fa'; c.lineWidth = 3;
          c.beginPath();
          c.moveTo(tx - 16, ty); c.lineTo(tx - 16, ty + topArrowLen);
          c.stroke();
          c.beginPath();
          c.moveTo(tx - 16, ty + topArrowLen);
          c.lineTo(tx - 20, ty + topArrowLen - 8);
          c.lineTo(tx - 12, ty + topArrowLen - 8);
          c.closePath();
          c.fillStyle = '#60a5fa'; c.fill();
          c.fillStyle = '#60a5fa'; c.textAlign = 'right';
          c.font = 'bold 10px "Inter", sans-serif';
          c.fillText('dy/dt = ' + (isFinite(dyDt) ? dyDt.toFixed(2) + ' ft/s' : '-\u221E'), tx - 22, ty + topArrowLen / 2);

          // x, y dimension labels
          c.strokeStyle = 'rgba(148,163,184,0.6)'; c.lineWidth = 1; c.setLineDash([3, 3]);
          c.beginPath(); c.moveTo(sceneX, by + 8); c.lineTo(bx, by + 8); c.stroke();
          c.beginPath(); c.moveTo(tx - 6, ty); c.lineTo(tx - 6, by); c.stroke();
          c.setLineDash([]);
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 9.5px "Inter", sans-serif';
          c.fillText('x = ' + xFt.toFixed(2) + ' ft', (sceneX + bx) / 2, by + 22);
          c.save(); c.translate(tx - 22, (ty + by) / 2); c.rotate(-Math.PI / 2);
          c.fillText('y = ' + yFt.toFixed(2) + ' ft', 0, 0);
          c.restore();

          // Right panel: equation derivation
          var rX = W * 0.55;
          var rBlockY = 60;
          c.fillStyle = 'rgba(15,23,42,0.85)';
          c.fillRect(rX, rBlockY, W - rX - 20, H - rBlockY - 36);
          c.strokeStyle = 'rgba(99,102,241,0.5)';
          c.strokeRect(rX, rBlockY, W - rX - 20, H - rBlockY - 36);

          c.fillStyle = '#c7d2fe'; c.textAlign = 'left';
          c.font = 'bold 12px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_related_rel', 'Relationship:'), rX + 14, rBlockY + 22);
          c.font = 'bold 14px monospace'; c.fillStyle = '#fde047';
          c.fillText('x\u00B2 + y\u00B2 = 169', rX + 14, rBlockY + 44);

          c.fillStyle = '#c7d2fe'; c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_related_diff', 'Differentiate with respect to t:'), rX + 14, rBlockY + 70);
          c.font = 'bold 13px monospace'; c.fillStyle = '#34d399';
          c.fillText('2x(dx/dt) + 2y(dy/dt) = 0', rX + 14, rBlockY + 92);

          c.fillStyle = '#c7d2fe'; c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_related_solve', 'Solve for dy/dt:'), rX + 14, rBlockY + 118);
          c.font = 'bold 13px monospace'; c.fillStyle = '#f472b6';
          c.fillText('dy/dt = \u2212(x/y)(dx/dt)', rX + 14, rBlockY + 140);

          // Plug in current values
          c.fillStyle = '#fbbf24'; c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_related_at', 'At x = {x}, y = {y}:'), { x: xFt.toFixed(2), y: yFt.toFixed(2) }), rX + 14, rBlockY + 172);
          c.font = 'bold 12px monospace'; c.fillStyle = '#fde047';
          c.fillText('dy/dt = \u2212(' + xFt.toFixed(2) + '/' + yFt.toFixed(2) + ')(2) = ' + (isFinite(dyDt) ? dyDt.toFixed(3) : '-\u221E') + ' ft/s', rX + 14, rBlockY + 194);

          // Footer
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 10.5px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_related_footer', 'The bottom moves at a constant 2 ft/s, but the top speeds up as the ladder nears the floor.'), W/2, H - 12);
        }

        // ── VIEW 11: Volume of Revolution (disks stacking) ──
        function drawVolumeOfRevolution(c, W, H, ls, t) {
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83C\uDFAA ' + __alloT('stem.calculus.viz_vor_title', 'Volume of Revolution: spin a curve, get a solid'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(__alloT('stem.calculus.viz_vor_sub', 'Rotate f(x) around the x-axis. Each thin slice becomes a disk. V = \u03C0 \u222B f(x)\u00B2 dx.'), W/2, 32);

          // Left panel: 2D curve + shaded band
          var Lx1 = 20, Ty1 = 52, panelW1 = W * 0.42, panelH1 = H - 100;
          var Rx1 = Lx1 + panelW1, By1 = Ty1 + panelH1;
          var xR = { min: 0, max: 4 };
          function f(x) { return 0.6 + 0.4 * Math.sin(x * 1.2) + 0.2 * x; }
          var fVals = [];
          for (var i = 0; i <= 60; i++) fVals.push(f(xR.min + (i/60) * (xR.max - xR.min)));
          var fMax = Math.max.apply(null, fVals);
          var yR = { min: 0, max: fMax * 1.25 };
          drawAxes(c, Lx1, Rx1, Ty1, By1, xR, yR);

          // Shade area under curve (in blue)
          var zY = By1 - ((0 - yR.min) / (yR.max - yR.min)) * (By1 - Ty1);
          c.fillStyle = 'rgba(96,165,250,0.28)';
          c.beginPath();
          c.moveTo(Lx1 + ((xR.min - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1), zY);
          for (var j = 0; j <= 60; j++) {
            var x = xR.min + (j/60) * (xR.max - xR.min);
            var y = f(x);
            var sxj = Lx1 + ((x - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
            var syj = By1 - ((y - yR.min) / (yR.max - yR.min)) * (By1 - Ty1);
            c.lineTo(sxj, syj);
          }
          c.lineTo(Lx1 + ((xR.max - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1), zY);
          c.closePath(); c.fill();
          plotCurve(c, f, xR, yR, Lx1, Rx1, Ty1, By1, '#f87171', 2.2);

          // Animated highlight disk position
          var diskX = vizAnimate(ls, 'vor') ? xR.min + (((Math.sin(t / 70) + 1) / 2)) * (xR.max - xR.min) : ls.vizVorX;
          var diskR = f(diskX);
          var dsx = Lx1 + ((diskX - xR.min) / (xR.max - xR.min)) * (Rx1 - Lx1);
          var dsyTop = By1 - ((diskR - yR.min) / (yR.max - yR.min)) * (By1 - Ty1);
          c.strokeStyle = '#fde047'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(dsx, zY); c.lineTo(dsx, dsyTop); c.stroke();
          c.fillStyle = 'rgba(253,224,71,0.35)';
          c.fillRect(dsx - 3, dsyTop, 6, zY - dsyTop);

          c.fillStyle = '#f87171'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('f(x) = 0.6 + 0.4 sin(1.2x) + 0.2x', Lx1 + 8, Ty1 + 16);

          // RIGHT panel: 3D-ish solid built from stacking translucent disks with axonometric tilt
          var Lx2 = Rx1 + 20, Rx2 = W - 20, Ty2 = Ty1, By2 = By1;
          var axisY = Ty2 + panelH1 / 2;
          var solidLx = Lx2 + 30, solidRx = Rx2 - 30;
          var pxPerX = (solidRx - solidLx) / (xR.max - xR.min);

          // Faint bounding box
          c.strokeStyle = 'rgba(148,163,184,0.25)';
          c.strokeRect(Lx2, Ty2, Rx2 - Lx2, By2 - Ty2);

          // Axis line
          c.strokeStyle = 'rgba(148,163,184,0.55)'; c.setLineDash([4, 3]); c.lineWidth = 1;
          c.beginPath(); c.moveTo(solidLx, axisY); c.lineTo(solidRx, axisY); c.stroke();
          c.setLineDash([]);

          // Stack disks from right to left (for correct z-order)
          var nDisks = 40;
          var disks = [];
          for (var k = nDisks - 1; k >= 0; k--) {
            var xk = xR.min + (k / (nDisks - 1)) * (xR.max - xR.min);
            var rk = f(xk);
            disks.push({ x: xk, r: rk });
          }
          disks.forEach(function(d2) {
            var cx = solidLx + d2.x * pxPerX;
            // Axonometric offset (camera tilt) — fake depth by shifting y slightly
            var axyTilt = -0.15;
            var yOffset = (d2.x - xR.min) * pxPerX * axyTilt;
            var ellipseRx = Math.max(1, d2.r * pxPerX * 0.06); // depth thickness
            var ellipseRy = Math.max(1, d2.r * 50); // vertical radius of the disk
            // Body
            c.fillStyle = 'rgba(96,165,250,0.38)';
            c.strokeStyle = 'rgba(37,99,235,0.7)'; c.lineWidth = 1;
            c.beginPath();
            c.ellipse(cx, axisY + yOffset, ellipseRx, ellipseRy, 0, 0, Math.PI * 2);
            c.fill(); c.stroke();
          });

          // Highlight disk (same x as diskX on the left)
          var hcx = solidLx + diskX * pxPerX;
          var hOff = (diskX - xR.min) * pxPerX * (-0.15);
          var hRx = Math.max(1, diskR * pxPerX * 0.12);
          var hRy = Math.max(2, diskR * 50);
          c.fillStyle = 'rgba(253,224,71,0.6)';
          c.strokeStyle = '#fbbf24'; c.lineWidth = 2;
          c.beginPath();
          c.ellipse(hcx, axisY + hOff, hRx, hRy, 0, 0, Math.PI * 2);
          c.fill(); c.stroke();

          // Labels
          c.fillStyle = '#60a5fa'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_vor_solid', 'solid = stacked disks'), Lx2 + 8, Ty2 + 16);

          // Compute volume numerically
          var volSum = 0, NV = 400, dxV = (xR.max - xR.min) / NV;
          for (var v = 0; v < NV; v++) {
            var xv = xR.min + (v + 0.5) * dxV;
            var rv = f(xv);
            volSum += Math.PI * rv * rv * dxV;
          }

          // Footer
          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(fillT(__alloT('stem.calculus.viz_vor_readout', 'V = \u03C0 \u222B\u2080\u2074 f(x)\u00B2 dx \u2248 {v} cubic units. Highlighted disk at x = {x}, radius {r}.'), { v: volSum.toFixed(3), x: diskX.toFixed(2), r: diskR.toFixed(2) }), W/2, H - 12);
        }

        // ── VIEW 12: Epsilon-Delta Game: the challenger names epsilon, the student picks delta ──
        function drawEpsilonDelta(c, W, H, ls, t) {
          var G = VIZ_EPS[ls.vizEpsFn] || VIZ_EPS.square, f = G.f, x0 = G.a, L = G.L;
          c.fillStyle = '#e2e8f0'; c.textAlign = 'center';
          c.font = 'bold 14px "Inter", sans-serif';
          c.fillText('\uD83C\uDFAF ' + __alloT('stem.calculus.viz_eps_title', '\u03B5\u2013\u03B4 Game: the formal definition of a limit'), W/2, 18);
          c.font = 'italic 10px "Inter", sans-serif'; c.fillStyle = '#94a3b8';
          c.fillText(fillT(__alloT('stem.calculus.viz_eps_sub', 'Claim: as x \u2192 {a}, f(x) = {f} \u2192 {L}. The challenger sets \u03B5. You choose \u03B4, then check it.'), { a: x0, f: G.label, L: L }), W/2, 32);

          var eps = ls.vizEps, delta = ls.vizDelta;
          var Lx = 60, Rx = W - 70, Ty = 52, By = H - 60;
          var xR = { min: x0 - 2.2, max: x0 + 2.2 };
          var lo = Infinity, hi = -Infinity;
          for (var s = 0; s <= 80; s++) { var ys = f(xR.min + (xR.max - xR.min) * s / 80); if (isFinite(ys)) { lo = Math.min(lo, ys); hi = Math.max(hi, ys); } }
          lo = Math.min(lo, L - eps); hi = Math.max(hi, L + eps);
          var pad = (hi - lo) * 0.08 + 0.2;
          var yR = { min: lo - pad, max: hi + pad };
          drawAxes(c, Lx, Rx, Ty, By, xR, yR);
          function sxOf(x) { return Lx + ((x - xR.min) / (xR.max - xR.min)) * (Rx - Lx); }
          function syOf(y) { return By - ((y - yR.min) / (yR.max - yR.min)) * (By - Ty); }

          // Horizontal epsilon band around L (blue, dashed edges)
          var yBandTop = syOf(L + eps), yBandBot = syOf(L - eps);
          c.fillStyle = 'rgba(96,165,250,0.2)';
          c.fillRect(Lx, yBandTop, Rx - Lx, yBandBot - yBandTop);
          c.strokeStyle = 'rgba(96,165,250,0.8)'; c.setLineDash([3, 3]);
          c.beginPath(); c.moveTo(Lx, yBandTop); c.lineTo(Rx, yBandTop); c.stroke();
          c.beginPath(); c.moveTo(Lx, yBandBot); c.lineTo(Rx, yBandBot); c.stroke();
          c.setLineDash([]);

          // Vertical delta band around x0 (green, dotted edges): the student's choice
          var xBandL = sxOf(x0 - delta), xBandR = sxOf(x0 + delta);
          c.fillStyle = 'rgba(52,211,153,0.2)';
          c.fillRect(xBandL, Ty, xBandR - xBandL, By - Ty);
          c.strokeStyle = 'rgba(52,211,153,0.9)'; c.setLineDash([1, 3]);
          c.beginPath(); c.moveTo(xBandL, Ty); c.lineTo(xBandL, By); c.stroke();
          c.beginPath(); c.moveTo(xBandR, Ty); c.lineTo(xBandR, By); c.stroke();
          c.setLineDash([]);

          // The curve, broken at a jump
          c.save(); c.strokeStyle = '#f87171'; c.lineWidth = 2.5; c.beginPath();
          var started = false, prevY = null;
          for (var i = 0; i <= 300; i++) {
            var x = xR.min + (xR.max - xR.min) * i / 300, y = f(x);
            if (!isFinite(y) || (prevY !== null && Math.abs(y - prevY) > (yR.max - yR.min) * 0.3)) { started = false; prevY = isFinite(y) ? y : null; if (!isFinite(y)) continue; }
            if (!started) { c.moveTo(sxOf(x), syOf(y)); started = true; } else c.lineTo(sxOf(x), syOf(y));
            prevY = y;
          }
          c.stroke(); c.restore();

          // (x0, L): an open circle, because the definition never looks at x0 itself
          c.strokeStyle = '#fde047'; c.lineWidth = 2;
          c.beginPath(); c.arc(sxOf(x0), syOf(L), 5, 0, Math.PI * 2); c.stroke();

          c.fillStyle = '#93c5fd'; c.textAlign = 'left';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText('\u03B5 = ' + eps.toFixed(2), Rx + 4, (yBandTop + yBandBot) / 2 + 4);
          c.fillText('L = ' + L, Rx + 4, syOf(L) - 14);
          c.fillStyle = '#6ee7b7'; c.textAlign = 'center';
          c.fillText('\u03B4 = ' + delta.toFixed(3), (xBandL + xBandR) / 2, By + 14);
          c.fillText('x\u2080 = ' + x0, sxOf(x0), By + 28);

          // The verdict appears only after "Check my delta", and only for the delta that was checked.
          var chk = ls.vizEpsChecked;
          if (chk && chk.fn === ls.vizEpsFn && Math.abs(chk.eps - eps) < 1e-9 && Math.abs(chk.delta - delta) < 1e-9) {
            var stX = Lx + 12, stY = Ty + 8, stW = 210, stH = 30;
            c.fillStyle = chk.trapped ? 'rgba(21,128,61,0.95)' : 'rgba(185,28,28,0.95)';
            c.fillRect(stX, stY, stW, stH);
            c.fillStyle = '#fff'; c.textAlign = 'center';
            c.font = 'bold 13px "Inter", sans-serif';
            c.fillText(chk.trapped ? '\u2705 ' + __alloT('stem.calculus.viz_eps_trapped', 'Trapped inside \u03B5') : '\u26A0 ' + __alloT('stem.calculus.viz_eps_leaks', 'Leaks out of the \u03B5 band'), stX + stW / 2, stY + 20);
            if (!chk.trapped && chk.worstX != null) {
              c.strokeStyle = '#fca5a5'; c.lineWidth = 2;
              c.beginPath(); c.arc(sxOf(chk.worstX), syOf(Math.max(yR.min, Math.min(yR.max, chk.worstY))), 7, 0, Math.PI * 2); c.stroke();
            }
          }

          c.fillStyle = '#fde047'; c.textAlign = 'center';
          c.font = 'bold 11px "Inter", sans-serif';
          c.fillText(__alloT('stem.calculus.viz_eps_footer', 'For every \u03B5 > 0 there must be a \u03B4 > 0: 0 < |x \u2212 x\u2080| < \u03B4 forces |f(x) \u2212 L| < \u03B5.'), W/2, H - 12);
        }

        // ── FUNCTION EVALUATION ─────────────────────────────────────────
        var finiteNum = function(value, fallback) {
          if (value === '' || value === null || value === undefined) return fallback;
          var n = typeof value === 'number' ? value : parseFloat(value);
          return isFinite(n) ? n : fallback;
        };
        var finiteCoord = function(value) {
          return typeof value === 'number' && isFinite(value);
        };
        var fix = function(v, places) { return finiteCoord(v) ? v.toFixed(places) : '\u2014'; };

        var fa = finiteNum(d.a, 1);
        var fb = finiteNum(d.b, 0);
        var fc = finiteNum(d.c, 0);
        var evalAntiAt = function(a, b, c, x) { return (a / 3) * x * x * x + (b / 2) * x * x + c * x; };

        // ── SYMBOLIC STRINGS ────────────────────────────────────────────
        var fmtTerm = function(coeff, power, isFirst) {
          if (coeff === 0) return '';
          var sign = coeff > 0 ? (isFirst ? '' : '+') : '\u2212';
          var absC = Math.abs(coeff);
          var cStr = (absC === 1 && power > 0) ? '' : String(absC);
          if (power === 0) return sign + absC;
          if (power === 1) return sign + cStr + 'x';
          return sign + cStr + 'x\u00B2';
        };
        var buildFStr = function(a, b, c) {
          var parts = [fmtTerm(a, 2, true), fmtTerm(b, 1, a === 0), fmtTerm(c, 0, a === 0 && b === 0)].filter(Boolean);
          return parts.length ? parts.join('') : '0';
        };
        var buildDerivStr = function(a, b) {
          var parts = [fmtTerm(2 * a, 1, true), fmtTerm(b, 0, 2 * a === 0)].filter(Boolean);
          return parts.length ? parts.join('') : '0';
        };

        // A typed function (any expression the parser reads) or the classic ax² + bx + c sliders.
        var fnText = typeof d.fnText === 'string' ? d.fnText : '';
        var typedFn = d.fnMode === 'typed' && fnText.trim() ? calcCompileText(fnText) : null;
        var useTyped = !!(typedFn && typedFn.ok);
        var evalF = useTyped ? typedFn.f : function(x) { return fa * x * x + fb * x + fc; };
        var evalDeriv = useTyped ? typedFn.df : function(x) { return 2 * fa * x + fb; };
        var fBody = useTyped ? typedFn.label : buildFStr(fa, fb, fc);
        var fStr = 'f(x) = ' + fBody;
        var derivStr = "f\u2032(x) = " + buildDerivStr(fa, fb);

        // ── SVG LAYOUT ──────────────────────────────────────────────────
        var W = 440, H = 300, pad = 40, GRAPH_W = W;
        // Clamped: the graph draws one grid line per integer, so a saved bound of 1e9 froze the page.
        var rawXMin = clampCalculusNumber(finiteNum(d.xMin, 0), -1000, 1000, 0);
        var rawXMax = clampCalculusNumber(finiteNum(d.xMax, 3), -1000, 1000, 3);
        if (Math.abs(rawXMax - rawXMin) < 0.0001) rawXMax = rawXMin + 1;
        var xMin = Math.min(rawXMin, rawXMax);
        var xMax2 = Math.max(rawXMin, rawXMax);
        // Allow-list the MODES ids: the host's starter state sends mode 'riemann', which
        // drew the midpoint sum labelled "Riemann (riemann)" with no method pressed.
        var mode = ['left', 'midpoint', 'right', 'trapezoid', 'simpson'].indexOf(d.mode) !== -1 ? d.mode : 'left';
        var nRects = normalizeCalculusSubdivisions(finiteNum(d.n, 20), mode);
        // `tab` is PERSISTED state and every view is a `tab === '<id>'` branch, so an
        // id this build does not know matched NONE of them: the tool rendered its
        // header and tab strip over an empty body -- a dead end that looks functional.
        // `|| 'integral'` only catches null/empty. Allow-list the ids that actually have a
        // branch. Declared here, at the READ site, because any existing tab-id array
        // is assigned further down and `var` hoists the declaration, not the value.
        var TAB_IDS = ['challenge', 'derivHunt', 'derivative', 'discover', 'integral', 'limits', 'visualize', 'series', 'apply', 'frq'];
        var tab = TAB_IDS.indexOf(d.tab) !== -1 ? d.tab : 'integral';
        var x0 = clampCalculusNumber(d.x0, xMin - 1, xMax2 + 1, Math.round((xMin + xMax2) / 2 * 10) / 10);
        // A typed f goes through the improper-integral analysis, so a convergent improper integral
        // (ln|x| on [-1, 1]) is labelled as one with its value, and divergence is said honestly.
        // exactKind: proper | converges | diverges | unclear | domain | too_many | bounds.
        var impMain = null;
        if (useTyped) {
          var _imc = window._calcMainImpCache || (window._calcMainImpCache = {}), _imk = fBody + '|' + xMin + '|' + xMax2;
          if (!_imc[_imk]) { if (Object.keys(_imc).length > 30) window._calcMainImpCache = _imc = {}; _imc[_imk] = calcImproper(evalF, xMin, xMax2); }
          impMain = _imc[_imk];
        }
        var exactKind = impMain ? impMain.kind : 'proper';
        var impTrouble = (function() {
          if (!impMain) return null;
          if (impMain.kind === 'domain') return impMain.x;
          var pp = (impMain.parts || []).filter(function(q) { return q.side !== 'none' && isFinite(q.at); })[0];
          return pp ? pp.at : null;
        })();
        var exactInfo = !useTyped ? { ok: true, value: evalAntiAt(fa, fb, fc, xMax2) - evalAntiAt(fa, fb, fc, xMin) }
          : (exactKind === 'proper' || exactKind === 'converges') && finiteCoord(impMain.value) ? { ok: true, value: impMain.value } : { ok: false, reason: exactKind, x: impTrouble };
        var exact = exactInfo.ok ? exactInfo.value : NaN;
        var exactOk = finiteCoord(exact);
        var exactProper = exactKind === 'proper';
        var improperConv = exactOk && exactKind === 'converges';
        var dh = clampCalculusNumber(d.secantH, 0.02, 2, 1.0);

        // One picture model (axes, curve pieces, Riemann shapes, tangent and secants) for any
        // function; the Integral, Derivative and Challenge graphs all draw from it.
        // view (optional): { W: plot width in viewBox units, xR: a fixed x window, used while a bound is dragged }.
        function buildGraphModel(f, df, lo, hi, n, method, xAt, h, robust, view) {
          var W = view && view.W > 0 ? view.W : GRAPH_W;
          var ys = [];
          for (var si = 0; si < 120; si++) { var sv = f(lo + si / 119 * (hi - lo)); if (finiteCoord(sv)) ys.push(sv); }
          var yRm;
          if (!robust) {
            var m = Math.max.apply(null, (ys.length ? ys : [0, 1]).map(Math.abs).concat([1]));
            if (!isFinite(m) || m <= 0) m = 1;
            yRm = { min: -m * 0.3, max: m * 1.3 };
          } else {
            var sorted = ys.slice().sort(function(p, q) { return p - q; });
            var qlo = sorted.length ? sorted[Math.floor(sorted.length * 0.03)] : -1, qhi = sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.97) - 1)] : 1;
            var ylo = Math.min(qlo, 0), yhi = Math.max(qhi, 0), ys2 = yhi - ylo || 2;
            yRm = { min: ylo - ys2 * 0.15, max: yhi + ys2 * 0.15 };
          }
          var xRm = view && view.xR ? { min: view.xR.min, max: view.xR.max } : { min: lo - 0.5, max: hi + 0.5 };
          var xSpanM = xRm.max - xRm.min, ySpanM = yRm.max - yRm.min;
          if (!isFinite(xSpanM) || Math.abs(xSpanM) < 0.0001) xSpanM = 1;
          if (!isFinite(ySpanM) || Math.abs(ySpanM) < 0.0001) ySpanM = 1;
          var sX = function(x) { return pad + ((finiteNum(x, xRm.min) - xRm.min) / xSpanM) * (W - 2 * pad); };
          var sY = function(y) { var yy = finiteNum(y, 0); yy = Math.max(yRm.min - ySpanM, Math.min(yRm.max + ySpanM, yy)); return (H - pad) - ((yy - yRm.min) / ySpanM) * (H - 2 * pad); };
          var pt = function(x, y) { var px = sX(x), py = sY(y); return finiteCoord(px) && finiteCoord(py) && finiteCoord(y) ? px + ',' + py : null; };
          // Curve pieces, broken where f is undefined or jumps (an asymptote or a step).
          var segs = [], cur = [], prevY = null;
          for (var cpx = 0; cpx <= W - 2 * pad; cpx += 2) {
            var cx = xRm.min + (cpx / (W - 2 * pad)) * xSpanM, cy = f(cx);
            if (!finiteCoord(cy) || (prevY !== null && Math.abs(cy - prevY) > ySpanM * 1.2)) { if (cur.length > 1) segs.push(cur); cur = []; prevY = finiteCoord(cy) ? cy : null; if (!finiteCoord(cy)) continue; }
            var p0 = pt(cx, cy);
            if (p0) cur.push(p0);
            prevY = cy;
          }
          if (cur.length > 1) segs.push(cur);
          var rsum = calcRiemann(f, lo, hi, n, method);
          var slopeM = df(xAt), fy = f(xAt);
          var tanPts = (function() {
            if (!finiteCoord(slopeM) || !finiteCoord(fy)) return '';
            var tl = Math.max(xRm.min, xAt - 1.5), tr = Math.min(xRm.max, xAt + 1.5);
            var p1 = pt(tl, slopeM * (tl - xAt) + fy), p2 = pt(tr, slopeM * (tr - xAt) + fy);
            return p1 && p2 ? p1 + ' ' + p2 : '';
          })();
          // Secant slopes through the shared core's average rate of change.
          var rocF = GA && typeof GA.rateOfChange === 'function' ? GA.rateOfChange(f, xAt, xAt + h) : null;
          var rocC = GA && typeof GA.rateOfChange === 'function' ? GA.rateOfChange(f, xAt - h, xAt + h) : null;
          var fwd = rocF ? (rocF.rate === null ? NaN : rocF.rate) : (f(xAt + h) - f(xAt)) / h;
          var ctr = rocC ? (rocC.rate === null ? NaN : rocC.rate) : (f(xAt + h) - f(xAt - h)) / (2 * h);
          function lineThrough(slp, x1, y1, from, to) {
            if (!finiteCoord(slp) || !finiteCoord(y1)) return '';
            var l = Math.max(xRm.min, from), r = Math.min(xRm.max, to);
            var p1 = pt(l, slp * (l - x1) + y1), p2 = pt(r, slp * (r - x1) + y1);
            return p1 && p2 ? p1 + ' ' + p2 : '';
          }
          return {
            W: W, f: f, lo: lo, hi: hi, n: rsum.n, method: method, xR: xRm, yR: yRm, toSX: sX, toSY: sY, svgPoint: pt, segs: segs,
            rects: rsum.pieces, area: rsum.value, x0: xAt, slope: slopeM, fy0: fy, tangentPts: tanPts, h: h,
            secantSlope: fwd, centredSlope: ctr,
            secantPts: lineThrough(fwd, xAt, fy, xAt - 0.5, xAt + h + 0.5),
            centredPts: lineThrough(ctr, xAt, fy, xAt - h - 0.5, xAt + h + 0.5)
          };
        }
        // The Integral plot is as wide as its box (about 330 px tall), so the curve fills it; while a bound
        // handle is dragged the x window holds still, so the handle stays under the pointer.
        var viewW = ui.vw || (typeof window !== 'undefined' && window.innerWidth) || 1280;
        var narrow = viewW < 640;
        var plotBoxW = ui.plotW || Math.max(280, Math.min(1024, viewW - 56));
        var intPlotW = Math.round(Math.max(GRAPH_W, Math.min(1100, H * plotBoxW / (plotBoxW >= 640 ? 330 : 260))));
        var gmMain = buildGraphModel(evalF, evalDeriv, xMin, xMax2, nRects, mode, x0, dh, useTyped,
          tab === 'integral' ? { W: intPlotW, xR: ui.boundDrag && ui.boundDrag.xR ? ui.boundDrag.xR : null } : null);
        var xR = gmMain.xR, yR = gmMain.yR, toSX = gmMain.toSX, toSY = gmMain.toSY, svgPoint = gmMain.svgPoint;
        var rects = gmMain.rects, area = gmMain.area, dx = (xMax2 - xMin) / nRects;
        var areaOk = finiteCoord(area);
        var err = exactOk && areaOk ? Math.abs(area - exact) : NaN;

        // ── SIGNED AREA ─────────────────────────────────────────────────
        var positiveRegion = 0, negativeRegion = 0, signedOk = exactOk && exactProper;
        if (!useTyped) {
          var signedCuts=[xMin,xMax2];
          var addSignedCut=function(root){if(Number.isFinite(root)&&root>xMin&&root<xMax2)signedCuts.push(root);};
          if(fa===0){if(fb!==0)addSignedCut(-fc/fb);}else{var signedDiscriminant=fb*fb-4*fa*fc;if(signedDiscriminant>=0){addSignedCut((-fb-Math.sqrt(signedDiscriminant))/(2*fa));addSignedCut((-fb+Math.sqrt(signedDiscriminant))/(2*fa));}}
          signedCuts.sort(function(a,b){return a-b;});
          for(var signedIndex=1;signedIndex<signedCuts.length;signedIndex++){var signedLeft=signedCuts[signedIndex-1],signedRight=signedCuts[signedIndex];var piece=evalAntiAt(fa,fb,fc,signedRight)-evalAntiAt(fa,fb,fc,signedLeft);if(evalF((signedLeft+signedRight)/2)>=0)positiveRegion+=Math.abs(piece);else negativeRegion+=Math.abs(piece);}
        } else if (signedOk) {
          // Cut at the roots from the shared root engine, so chips, descriptions and areas agree.
          // Cached like the improper analysis: on a wiggly f this took 0.4 to 16 s, on every render (each focus, key and drag step).
          var _sac = window._calcSignedCache || (window._calcSignedCache = {}), _sak = fBody + '|' + xMin + '|' + xMax2;
          if (!Object.prototype.hasOwnProperty.call(_sac, _sak)) {
            if (Object.keys(_sac).length > 30) window._calcSignedCache = _sac = {};
            var gaZeros = GA && typeof GA.zerosOf === 'function' ? GA.zerosOf(evalF, xMin, xMax2).xs : null;
            _sac[_sak] = calcSignedAreas(evalF, xMin, xMax2, Array.isArray(gaZeros) ? gaZeros : null) || null;
          }
          var sa = _sac[_sak];
          if (sa) { positiveRegion = sa.positive; negativeRegion = sa.negative; } else signedOk = false;
        }
        var totalRegion=positiveRegion+negativeRegion;

        // ── CONVERGENCE DATA ────────────────────────────────────────────
        var CW = 160, Cpad = 15;
        var convKey = [fBody, xMin, xMax2, mode].join(',');
        if (!window._calcConvCache || window._calcConvCache.key !== convKey) {
          var _cd = [];
          for (var cn = 2; cn <= 50; cn += 2) _cd.push({ n: cn, err: exactOk ? Math.abs(calcRiemann(evalF, xMin, xMax2, cn, mode).value - exact) : NaN });
          window._calcConvCache = { key: convKey, data: _cd };
        }
        var convData = window._calcConvCache.data.filter(function(cd) { return finiteCoord(cd.err); });
        var convMaxErr = Math.max.apply(null, convData.map(function(c) { return finiteNum(c.err, 0); }).concat([0.001]));
        if (!isFinite(convMaxErr) || convMaxErr <= 0) convMaxErr = 0.001;
        var convToX = function(n) { return Cpad + ((n - 2) / 48) * (CW - 2 * Cpad); };
        var convToY = function(e) { return 55 - (Math.min(finiteNum(e, 0), convMaxErr) / convMaxErr) * 40; };

        // ── CURVE / TANGENT ─────────────────────────────────────────────
        var slope = gmMain.slope;
        var fy0 = gmMain.fy0;
        var tangentPts = gmMain.tangentPts;
        var secantSlope = gmMain.secantSlope;
        var centredSlope = gmMain.centredSlope;
        var secantKind = ['forward', 'centred', 'both'].indexOf(d.secantKind) >= 0 ? d.secantKind : 'forward';

        // ── CSS ─────────────────────────────────────────────────────────
        var css = '@keyframes calcPop{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}' +
          '@keyframes calcCorrect{0%,100%{background:#dcfce7}50%{background:#86efac}}' +
          '@keyframes calcWrong{0%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}100%{transform:translateX(0)}}' +
          '@keyframes calcFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}' +
          '@keyframes spin{to{transform:rotate(360deg)}}' +
          '.calculus-shell .text-red-400,.calculus-shell .text-red-500,.calculus-shell .text-red-600{color:#b91c1c!important}' +
          '.calculus-shell .text-cyan-500,.calculus-shell .text-cyan-600{color:#155e75!important}' +
          '.calculus-shell .text-amber-600{color:#92400e!important}' +
          '.calculus-shell .text-emerald-400,.calculus-shell .text-emerald-600{color:#047857!important}' +
          '.calculus-shell .text-violet-400,.calculus-shell .text-violet-500{color:#6d28d9!important}' +
          '.calculus-shell .text-orange-500{color:#c2410c!important}' +
          '.calculus-shell .text-yellow-600{color:#854d0e!important}' +
          '.calculus-shell .text-rose-600{color:#be123c!important}' +
          '.calculus-shell .bg-orange-600{background-color:#c2410c!important}' +
          '.calculus-shell .bg-amber-600{background-color:#b45309!important}' +
          '.calculus-shell .bg-emerald-600{background-color:#047857!important}' +
          (ctx.isContrast ? '.calculus-shell [class*="text-red-"],.calculus-shell [class*="text-cyan-"],.calculus-shell [class*="text-amber-"],.calculus-shell [class*="text-emerald-"],.calculus-shell [class*="text-violet-"],.calculus-shell [class*="text-orange-"],.calculus-shell [class*="text-yellow-"],.calculus-shell [class*="text-rose-"]{color:var(--allo-stem-text,#ffff00)!important}' : '');

        // ── MODES ────────────────────────────────────────────────────────
        var methodName = function(id) {
          return id === 'left' ? __alloT('stem.calculus.method_left', 'Left')
            : id === 'right' ? __alloT('stem.calculus.method_right', 'Right')
            : id === 'midpoint' ? __alloT('stem.calculus.method_midpoint', 'Midpoint')
            : id === 'trapezoid' ? __alloT('stem.calculus.method_trapezoid', 'Trapezoid')
            : id === 'simpson' ? __alloT('stem.calculus.method_simpson', "Simpson's") : String(id);
        };
        // Lower-case method names inside sentences ("using 6 simpson subdivisions").
        var methodWord = function(id) {
          return id === 'left' ? __alloT('stem.calculus.method_word_left', 'left')
            : id === 'right' ? __alloT('stem.calculus.method_word_right', 'right')
            : id === 'midpoint' ? __alloT('stem.calculus.method_word_midpoint', 'midpoint')
            : id === 'trapezoid' ? __alloT('stem.calculus.method_word_trapezoid', 'trapezoid')
            : id === 'simpson' ? __alloT('stem.calculus.method_word_simpson', 'simpson') : String(id);
        };
        var MODES = ['left', 'midpoint', 'right', 'trapezoid', 'simpson'].map(function(id) { return { id: id, label: methodName(id) }; });

        // ── PRESETS ──────────────────────────────────────────────────────
        var PRESETS = [
          { label: '\u222B x\u00B2 [0,1]',           a:1, b:0, c:0, xMin:0, xMax:1, n:20, tip:__alloT('stem.calculus.preset_tip_1', 'Think about it first: is the area more or less than 0.5?') },
          { label: '\u222B x\u00B2 [0,3]',           a:1, b:0, c:0, xMin:0, xMax:3, n:20, tip:__alloT('stem.calculus.preset_tip_2', 'Same curve, wider bounds. Predict the area before computing.') },
          { label: '\u222B 2x [0,5]',                a:0, b:2, c:0, xMin:0, xMax:5, n:10, tip:__alloT('stem.calculus.preset_tip_3', 'A linear function. Will rectangles ever be exact? Why?') },
          { label: '\u222B 3 [1,4]',                 a:0, b:0, c:3, xMin:1, xMax:4, n:5,  tip:__alloT('stem.calculus.preset_tip_4', 'A constant function. What should the error always be?') },
          { label: '\u222B (x\u00B2+2x+1) [0,2]',   a:1, b:2, c:1, xMin:0, xMax:2, n:20, tip:__alloT('stem.calculus.preset_tip_5', 'This equals (x+1)\u00B2. Does that change your prediction?') },
          { label: '\u222B \u2212x\u00B2+4 [0,2]',   a:-1,b:0, c:4, xMin:0, xMax:2, n:25, tip:__alloT('stem.calculus.preset_tip_6', 'A downward arch. Will the integral be larger or smaller than for x\u00B2?') },
          { label: '\u222B \u2212x\u00B2+4 [\u22122,2]',a:-1,b:0,c:4,xMin:-2,xMax:2,n:20,tip:__alloT('stem.calculus.preset_tip_7', 'The full arch. Estimate the area by eye before you look.') },
          { label: '\u222B (x\u00B2\u22123x) [1,4]', a:1, b:-3,c:0, xMin:1, xMax:4, n:20, tip:__alloT('stem.calculus.preset_tip_8', 'The function crosses zero in this range. What does that mean for the integral?') }
        ];
        // Typed-function examples: each shows off something the slider quadratic cannot.
        var TYPED_EXAMPLES = band === 'pre'
          ? ['2x + 1', 'x^3 - 3x', 'sqrt(x)', '1/x', '(x^2 - 1)/(x - 1)', 'floor(x)']
          : band === 'bc'
            ? ['sin(x)', 'e^(-x^2)', 'x ln(x)', '1/(1 + x^2)', 'sin(x)/x', 'x e^(-x)']
            : ['sin(x)', 'e^x', 'ln(x + 1)', 'x^3 - 3x', '1/x', '(x^2 - 1)/(x - 1)'];

        // ── ACTIVE LEARNING STATE ────────────────────────────────────────
        var predictMode = d.predictMode || false;
        var predictInput = d.predictInput || '';
        var predictSubmitted = d.predictSubmitted || false;
        var overUnderGuess = d.overUnderGuess || null;   // 'over' | 'under' | 'exact' | 'skip' | null
        // One problem = one function on one interval. Until its over/under question is answered (on any
        // method), skipped, or an estimate is committed, the exact integral and the error stay hidden on
        // EVERY method, so switching to Midpoint no longer spoils the answer.
        var probKey = (useTyped ? 'T|' + fBody : 'Q|' + fa + ',' + fb + ',' + fc) + '|' + xMin + '|' + xMax2;
        var ouAnsweredHere = d.ouAnswered === probKey;
        // A save from before these keys existed: its answer belongs to the problem it holds.
        var ouLegacy = !!d.overUnderChecked && d.ouAnswered == null && d.ouSkipped == null;
        var ouPending = exactOk && exactProper && !ouAnsweredHere && d.ouSkipped !== probKey && !(predictMode && predictSubmitted) && !ouLegacy;
        // A verdict held over from another function or interval is not an answer to this one.
        var overUnderChecked = !!d.overUnderChecked && !ouPending && areaOk;
        var predictOpen = predictMode && !predictSubmitted;

        // Compare the computed estimate with the exact integral. Monotonicity still
        // supplies the conceptual explanation, while non-monotonic curves use the signed error.
        var shapeFacts = calcShapeFacts(evalF, xMin, xMax2);
        var fMonotonic = shapeFacts.increasing || shapeFacts.decreasing;
        var fIsIncreasing = shapeFacts.increasing;
        var actualOverUnder = classifyCalculusApproximation(area, exact);

        var derivInputChecked = d.derivInputChecked || false;
        var derivInput1 = d.derivInput1 || '';
        var derivInput2 = d.derivInput2 || '';

        // Checks a typed expression g against a target relation at many sample points:
        // relation 'anti' wants g' = f; 'deriv' wants g = f'. Returns a named verdict.
        function checkTypedAgainst(text, relation) {
          var g = calcCompileText(text);
          if (!g.ok) return { ok: false, verdict: 'parse', error: g.error, detail: g.detail };
          var xs = [], lo = xMin, hi = xMax2;
          for (var i = 0; i <= 24; i++) { var xv = lo + (hi - lo) * (i + 0.37) / 25.1; if (finiteCoord(evalF(xv)) && finiteCoord(evalDeriv(xv)) && finiteCoord(g.f(xv)) && finiteCoord(g.df(xv))) xs.push(xv); }
          if (xs.length < 6) return { ok: false, verdict: 'domain', label: g.label };
          var got = xs.map(function(xv) { return relation === 'anti' ? g.df(xv) : g.f(xv); });
          var want = xs.map(function(xv) { return relation === 'anti' ? evalF(xv) : evalDeriv(xv); });
          var scale = 1; want.forEach(function(w) { scale = Math.max(scale, Math.abs(w)); });
          function allClose(list, target) { return list.every(function(v, k) { return Math.abs(v - target[k]) <= 1e-6 * scale + 1e-9; }); }
          if (allClose(got, want)) return { ok: true, verdict: 'correct', label: g.label, g: g };
          var ratios = got.map(function(v, k) { return Math.abs(want[k]) > 1e-6 * scale ? v / want[k] : null; }).filter(function(r) { return r !== null; });
          var r0 = ratios[0];
          if (ratios.length >= 4 && ratios.every(function(r) { return Math.abs(r - r0) < 1e-6 * Math.max(1, Math.abs(r0)); })) {
            if (Math.abs(r0 + 1) < 1e-6) return { ok: false, verdict: 'sign', label: g.label };
            return { ok: false, verdict: 'factor', factor: r0, label: g.label };
          }
          var diffs = got.map(function(v, k) { return v - want[k]; });
          if (diffs.every(function(v) { return Math.abs(v - diffs[0]) <= 1e-6 * scale; })) return { ok: false, verdict: 'offset', offset: diffs[0], label: g.label };
          if (relation === 'anti' && allClose(xs.map(function(xv) { return g.f(xv); }), xs.map(function(xv) { return evalDeriv(xv); }))) return { ok: false, verdict: 'differentiated', label: g.label };
          if (relation === 'deriv' && allClose(got, xs.map(function(xv) { return evalF(xv); }))) return { ok: false, verdict: 'same_as_f', label: g.label };
          if (relation === 'deriv' && allClose(xs.map(function(xv) { return g.df(xv); }), xs.map(function(xv) { return evalF(xv); }))) return { ok: false, verdict: 'integrated', label: g.label };
          var worst = 0; diffs.forEach(function(v, k) { if (Math.abs(v) > Math.abs(diffs[worst])) worst = k; });
          return { ok: false, verdict: 'mismatch', label: g.label, x: xs[worst], got: got[worst], want: want[worst] };
        }
        var parseErrorText = function(code, detail) {
          if (code === 'unknown_name') return fillT(__alloT('stem.calculus.parse_unknown', 'I do not know the name starting "{d}". Use x as the variable, and names like sin, cos, tan, sqrt, ln, log, exp, abs, pi and e.'), { d: detail });
          if (code === 'bad_char') return fillT(__alloT('stem.calculus.parse_bad_char', 'The character "{d}" is not part of a formula here.'), { d: detail });
          if (code === 'missing_paren') return __alloT('stem.calculus.parse_paren', 'A bracket is not closed: check that every ( has a matching ).');
          if (code === 'missing_bar') return __alloT('stem.calculus.parse_bar', 'An absolute-value bar | is not closed.');
          if (code === 'missing_arg') return fillT(__alloT('stem.calculus.parse_arg', '{d} needs an input, such as {d}(x).'), { d: detail });
          if (code === 'empty') return __alloT('stem.calculus.parse_empty', 'Type a function of x, such as x^2 or sin(x).');
          if (code === 'too_long') return __alloT('stem.calculus.parse_long', 'That formula is too long. Keep it under 160 characters.');
          if (code === 'unexpected_end') return __alloT('stem.calculus.parse_end', 'The formula ends too soon: something is missing after the last symbol.');
          if (code === 'unexpected') return fillT(__alloT('stem.calculus.parse_unexpected', 'I did not expect "{d}" there. Check the brackets and operators around it.'), { d: detail });
          if (code === 'bad_power') return __alloT('stem.calculus.parse_power', 'After sin^, cos^ or tan^ put a number, such as sin^2(x).');
          return __alloT('stem.calculus.parse_syntax', 'Something is missing in the formula. Check for a dangling operator such as a trailing + or *.');
        };

        // ── CHALLENGE STATE ──────────────────────────────────────────────
        // Saved state is INPUT: `||` is a NULL guard, not a TYPE guard.
        // Object-shape only. An earlier version also required `options`, but the
        // tool reads `opts` (and already guards it at the .map site), so that
        // extra condition REJECTED valid quizzes and blanked the challenge
        // panel — caught by tests/calculus_challenge_correctness.test.js.
        var cq = (d.calcQuiz && typeof d.calcQuiz === 'object' && !Array.isArray(d.calcQuiz)) ? d.calcQuiz : null;
        var cScore = finiteNum(d.calcScore, 0);
        var cStreak = finiteNum(d.calcStreak, 0);
        var cHint = typeof d.calcHint === 'string' ? d.calcHint : '';
        var CALC_CHALLENGES_ALL = [
          { id: 'estimate',  label: '\uD83C\uDFAF ' + __alloT('stem.calculus.ch_estimate', 'Estimate \u222B'),  activeClass: 'bg-red-700' },
          { id: 'overunder', label: '\u2B06\u2B07 ' + __alloT('stem.calculus.ch_overunder', 'Over or Under?'),    activeClass: 'bg-orange-700' },
          { id: 'method',    label: '\u26A1 ' + __alloT('stem.calculus.ch_method', 'Best Method'),             activeClass: 'bg-amber-700' },
          { id: 'minN',      label: '\uD83D\uDD22 ' + __alloT('stem.calculus.ch_minn', 'Min n'),             activeClass: 'bg-blue-700' },
          { id: 'exact',     label: '\u270F\uFE0F ' + __alloT('stem.calculus.ch_exact', 'Exact \u222B'),      activeClass: 'bg-emerald-700' },
          { id: 'deriv',     label: '\uD83D\uDCC8 ' + __alloT('stem.calculus.ch_deriv', 'Find the Slope'),    activeClass: 'bg-violet-700' },
          { id: 'avgrate',   label: '\u2197 ' + __alloT('stem.calculus.ch_avgrate', 'Average Rate'),          activeClass: 'bg-sky-700' },
          { id: 'taylor',    label: '\u221E ' + __alloT('stem.calculus.ch_taylor', 'Taylor Coefficient'),     activeClass: 'bg-fuchsia-700' }
        ];
        var teacherModes = Array.isArray(d.teacherModes) && d.teacherModes.length ? d.teacherModes : null;
        var bandModes = CALC_MODES_BY_BAND[band] || CALC_MODES_BY_BAND.ab;
        var CALC_CHALLENGES = CALC_CHALLENGES_ALL.filter(function(cm) { return bandModes.indexOf(cm.id) >= 0 && (!teacherModes || teacherModes.indexOf(cm.id) >= 0); });
        if (!CALC_CHALLENGES.length) CALC_CHALLENGES = CALC_CHALLENGES_ALL.filter(function(cm) { return bandModes.indexOf(cm.id) >= 0; });
        var savedMode = d.calcChallengeMode || 'estimate';
        // A quiz already on screen keeps its type, even if the band list no longer offers it.
        var cMode = CALC_CHALLENGES.some(function(cm) { return cm.id === savedMode; }) || (cq && cq.mode === savedMode) ? savedMode : CALC_CHALLENGES[0].id;
        var noReveal = !!d.teacherNoReveal;

        // The function behind a quiz: typed text or the legacy a, b, c quadratic.
        function quizFn(q) {
          if (q && typeof q.fnText === 'string') { var cf = calcCompileText(q.fnText); if (cf.ok) return cf; }
          var qa = finiteNum(q && q.a, 0), qb = finiteNum(q && q.b, 0), qc = finiteNum(q && q.c, 0);
          return { ok: true, label: buildFStr(qa, qb, qc), f: function(x) { return qa * x * x + qb * x + qc; }, df: function(x) { return 2 * qa * x + qb; } };
        }
        // Options as { id, label, mis } whatever shape an older save used.
        function quizOptions(q) {
          if (!q) return [];
          if (q.mode === 'overunder') return [{ id: 'over', label: '\u2B06 ' + __alloT('stem.calculus.ou_over', 'OVERestimate') }, { id: 'exact', label: '\u2713 ' + __alloT('stem.calculus.ou_exact', 'EXACT') }, { id: 'under', label: '\u2B07 ' + __alloT('stem.calculus.ou_under', 'UNDERestimate') }];
          if (q.mode === 'method') {
            var ids = Array.isArray(q.choices) ? q.choices : (Array.isArray(q.opts) ? q.opts.map(function(o) { return o && typeof o === 'object' ? o.id : o; }) : CALC_METHOD_IDS);
            return ids.map(function(id) { return { id: id, label: methodName(id) }; });
          }
          return (Array.isArray(q.opts) ? q.opts : []).map(function(o) {
            var id = o && typeof o === 'object' ? o.id : o;
            var val = o && typeof o === 'object' && o.value != null ? o.value : id;
            var shown = typeof val === 'number' ? calcFmtNum(val) : String(id);
            return { id: String(id), label: q.mode === 'minN' ? 'n = ' + shown : shown, mis: o && typeof o === 'object' ? o.mis : '' };
          });
        }
        function quizQuestion(q) {
          if (!q) return '';
          var fl = quizFn(q).label;
          var aL = q.aLabel != null ? q.aLabel : calcFmtNum(finiteNum(q.xMin, 0)), bL = q.bLabel != null ? q.bLabel : calcFmtNum(finiteNum(q.xMax, 1));
          if (q.mode === 'overunder') return fillT(__alloT('stem.calculus.q_overunder', 'For f(x) = {f}, is the {method} Riemann sum with n = {n} on [{a}, {b}] an overestimate, exact, or an underestimate?'), { f: fl, method: methodWord(q.ruleMode || 'left'), n: q.n, a: aL, b: bL });
          if (q.mode === 'method') return fillT(__alloT('stem.calculus.q_method', 'For f(x) = {f} on [{a}, {b}] with n = {n}, which of these methods gives the smallest error?'), { f: fl, a: aL, b: bL, n: q.n });
          if (q.mode === 'minN') return fillT(__alloT('stem.calculus.q_minn', 'Using left Riemann sums for f(x) = {f} on [{a}, {b}], what is the smallest n whose error is below {t}?'), { f: fl, a: aL, b: bL, t: q.threshold });
          if (q.mode === 'exact') return fillT(__alloT('stem.calculus.q_exact', 'Use the power rule to compute the integral of {f} from {a} to {b} exactly.'), { f: fl, a: aL, b: bL });
          if (q.mode === 'deriv') return fillT(__alloT('stem.calculus.q_deriv', 'For f(x) = {f}, find f\u2032({x}).'), { f: fl, x: calcFmtNum(finiteNum(q.x0, 0)) });
          if (q.mode === 'avgrate') return fillT(__alloT('stem.calculus.q_avgrate', 'For f(x) = {f}, what is the average rate of change from x = {p} to x = {q}?'), { f: fl, p: q.p, q: q.q });
          if (q.mode === 'taylor') return fillT(__alloT('stem.calculus.q_taylor', 'What is the coefficient of x^{k} in the Maclaurin series of {f}?'), { k: q.k, f: fl });
          return fillT(__alloT('stem.calculus.q_estimate', 'Evaluate the integral of {f} from {a} to {b}.'), { f: fl, a: aL, b: bL });
        }
        // Named misconceptions: what the wrong answer suggests, in a sentence the student can act on.
        function misconceptionText(key, kind) {
          var M = {
            height_not_slope: __alloT('stem.calculus.mis_height_not_slope', 'That is f(x\u2080), the height of the curve. The derivative is the slope of the tangent line there, not how high the point is.'),
            power_rule_bring_down: __alloT('stem.calculus.mis_power_rule', 'Power rule: the exponent comes down as a factor and the power drops by one, d/dx[x\u207F] = n\u00B7x\u207F\u207B\u00B9.'),
            constant_derivative: __alloT('stem.calculus.mis_constant', 'A constant term adds nothing to the slope: its derivative is 0.'),
            dropped_linear_term: __alloT('stem.calculus.mis_dropped_term', 'Differentiate every term: the derivative of bx is b, so it stays.'),
            chain_rule: __alloT('stem.calculus.mis_chain', 'Chain rule: multiply by the derivative of the inside. d/dx[sin(kx)] = k\u00B7cos(kx) and d/dx[e^(kx)] = k\u00B7e^(kx).'),
            trig_sign: __alloT('stem.calculus.mis_trig_sign', 'Check the sign: d/dx[sin x] = cos x, but d/dx[cos x] = \u2212sin x.'),
            flat_at_peak: __alloT('stem.calculus.mis_flat_peak', 'At x = 0, cos(kx) is at a peak, so its tangent line is flat: the slope is 0.'),
            power_rule_on_exp: __alloT('stem.calculus.mis_power_exp', 'e^(kx) is not a power of x, so the power rule does not apply. d/dx[e^(kx)] = k\u00B7e^(kx).'),
            forgot_divide: __alloT('stem.calculus.mis_forgot_divide', 'The antiderivative of x\u207F is x\u207F\u207A\u00B9/(n+1): you raised the power but did not divide by the new power.'),
            differentiated: __alloT('stem.calculus.mis_differentiated', 'You differentiated instead of integrating. Integrating raises each power; differentiating lowers it.'),
            forgot_signed: kind === 'accum'
              ? __alloT('stem.calculus.mis_forgot_signed_accum', 'Forgetting signed area: where f is below the axis, A(x) must go DOWN, because that area counts as negative.')
              : __alloT('stem.calculus.mis_forgot_signed', 'Forgetting signed area: the part of the region below the x-axis counts as negative in a definite integral.'),
            height_times_width: __alloT('stem.calculus.mis_height_width', 'Height \u00D7 width only works for a constant function. Here the height changes across the interval.'),
            rectangle_not_trapezoid: __alloT('stem.calculus.mis_rect_trap', 'The region under a slanted line is a trapezoid, not a rectangle: average the two end heights, then multiply by the width.'),
            triangle_not_trapezoid: __alloT('stem.calculus.mis_tri_trap', 'This region does not start at height 0, so it is a trapezoid, not a triangle.'),
            antideriv_sign: __alloT('stem.calculus.mis_anti_sign', 'Your answer has the opposite sign. Check the sign of the antiderivative (\u222B sin x dx = \u2212cos x + C) and evaluate F(upper) \u2212 F(lower), in that order.'),
            used_f_not_F: __alloT('stem.calculus.mis_used_f', 'You evaluated f at the bounds. The Fundamental Theorem uses the ANTIderivative: F(b) \u2212 F(a).'),
            forgot_lower: __alloT('stem.calculus.mis_forgot_lower', 'Do not forget the lower bound: the integral is F(b) \u2212 F(a), and F(a) is not 0 here.'),
            reversed_bounds: __alloT('stem.calculus.mis_reversed', 'You computed F(a) \u2212 F(b). Order matters: upper bound first, F(b) \u2212 F(a).'),
            power_rule_on_reciprocal: __alloT('stem.calculus.mis_reciprocal', 'The power rule fails for x\u207B\u00B9 (it would divide by 0). \u222B 1/x dx = ln|x| + C.'),
            odd_cancel_everything: __alloT('stem.calculus.mis_odd_cancel', 'Only odd terms cancel on a symmetric interval. 3x\u00B2 is even, so its area doubles instead of cancelling.'),
            arithmetic: __alloT('stem.calculus.mis_arithmetic', 'Close, but not it. Write F(x) first, then compute F(b) and F(a) separately before subtracting.'),
            near_miss: __alloT('stem.calculus.mis_near_miss', 'Not this one. Work it through one step at a time, then compare.'),
            not_smallest: __alloT('stem.calculus.mis_not_smallest', 'That n reaches the target, but the question asks for the SMALLEST n that does.'),
            too_coarse: __alloT('stem.calculus.mis_too_coarse', 'With that n the error is still above the target. More rectangles are needed.'),
            left_on_increasing: __alloT('stem.calculus.mis_left_inc', 'A left sum on an increasing curve: each rectangle uses the LOWEST height in its strip, so the left sum is too small (an underestimate).'),
            left_on_decreasing: __alloT('stem.calculus.mis_left_dec', 'A left sum on a decreasing curve: the left end of each strip is its highest point, so the left sum is too big (an overestimate).'),
            right_on_increasing: __alloT('stem.calculus.mis_right_inc', 'A right sum on an increasing curve: the right end of each strip is its highest point, so the right sum overestimates.'),
            right_on_decreasing: __alloT('stem.calculus.mis_right_dec', 'A right sum on a decreasing curve: each rectangle uses the lowest height in its strip, so the right sum underestimates.'),
            midpoint_concavity: __alloT('stem.calculus.mis_mid_concave', 'Midpoint and bending: on a curve that bends upward (concave up) the midpoint sum underestimates; bending downward, it overestimates.'),
            trapezoid_concavity: __alloT('stem.calculus.mis_trap_concave', 'Trapezoids and bending: a curve that bends upward sits below its chords, so trapezoids overestimate; bending downward, they underestimate.'),
            mixed_shape: __alloT('stem.calculus.mis_mixed', 'This curve changes direction or bending inside the interval, so no shortcut rule decides it. Compare the sum with the exact value.'),
            simpson_degree: __alloT('stem.calculus.mis_simpson_degree_v2', 'Simpson’s rule fits a parabola to each pair of strips, so it is exact for every polynomial up to degree 3. Is this f one of those? If not, some error remains, on one side or the other.'),
            straight_line: __alloT('stem.calculus.mis_straight', 'This f is a straight line, so it never bends. Picture how the top of each strip meets the line.'),
            simpson_needs_smooth: __alloT('stem.calculus.mis_simpson_smooth', "Simpson's rule assumes the curve is smooth like a parabola. A corner or a vertical tangent breaks that, so its advantage disappears here."),
            endpoint_order: __alloT('stem.calculus.mis_endpoint', 'Left and right sums have errors that shrink like 1/n. Midpoint, trapezoid and Simpson\u2019s shrink much faster on smooth curves.'),
            trapezoid_vs_midpoint: __alloT('stem.calculus.mis_trap_mid', 'On a curve that bends one way, the midpoint error is about half the trapezoid error, on the opposite side.'),
            midpoint_not_always: __alloT('stem.calculus.mis_mid_not_always', 'Midpoint usually beats trapezoid, but not on every curve. Compare the actual errors.'),
            simpson_on_smooth: __alloT('stem.calculus.mis_simpson_wins', 'On a smooth curve with even n, Simpson\u2019s parabolas usually win by a wide margin.'),
            compare_errors: __alloT('stem.calculus.mis_compare', 'Compare the error of each method in the table.'),
            forgot_dx: __alloT('stem.calculus.mis_forgot_dx', 'Average rate of change divides the change in f by the change in x: (f(q) \u2212 f(p)) / (q \u2212 p).'),
            flipped_rate: __alloT('stem.calculus.mis_flipped', 'The rate is change in OUTPUT over change in INPUT, not the other way round.'),
            instant_vs_average: __alloT('stem.calculus.mis_instant', 'That is the instantaneous slope at one end. The average rate uses both endpoints.'),
            forgot_factorial: __alloT('stem.calculus.mis_factorial', 'That is the k-th derivative at 0. The Maclaurin coefficient divides it by k!.'),
            alternating_sign: __alloT('stem.calculus.mis_alternating', 'Check the sign pattern: in this series the signs alternate.'),
            k_vs_factorial: __alloT('stem.calculus.mis_k_factorial', 'Watch k versus k!: ln(1+x) uses 1/k, while e^x, sin x and cos x use 1/k!.'),
            off_by_one_power: __alloT('stem.calculus.mis_off_by_one', 'Match the power: the coefficient of x\u1D4F uses k!, not (k+1)!.'),
            even_odd_terms: __alloT('stem.calculus.mis_even_odd', 'sin x has only odd powers and cos x only even powers; a missing power has coefficient 0.'),
            slope_sign: kind === 'accum'
              ? __alloT('stem.calculus.mis_accum_sign', 'That graph runs upside down: A(x) rises where f is positive and falls where f is negative.')
              : __alloT('stem.calculus.mis_slope_sign', 'Check the sign of the slope: where f rises, f\u2032 is positive (above the axis); where f falls, f\u2032 is negative.'),
            rate_vs_accum: kind === 'accum'
              ? __alloT('stem.calculus.mis_rate_vs_accum_a', 'That graph is the SLOPE of f. Accumulated area A(x) grows wherever f is positive.')
              : __alloT('stem.calculus.mis_rate_vs_accum_d', 'That graph ACCUMULATES area under f (an antiderivative). The derivative measures slope instead.'),
            derivative_twice: __alloT('stem.calculus.mis_twice', 'That is f\u2033: the derivative taken twice. f\u2032 is zero exactly where f has a flat turning point.'),
            area_is_height: __alloT('stem.calculus.mis_area_height', 'That graph copies the height of f. A(x) adds up area: it rises where f > 0 and falls where f < 0.')
          };
          return M[key] || stageBMis(key) || M.near_miss;
        }
        function hintRungs(q) {
          if (!q) return [];
          var preArea = q.band === 'pre' && q.mode === 'estimate' && !q.fnText;
          if (preArea) return [__alloT('stem.calculus.hint_pre_1', 'Sketch the region: is it a rectangle, a triangle or a trapezoid?'), __alloT('stem.calculus.hint_pre_2', 'Trapezoid area = (left height + right height) \u00F7 2 \u00D7 width.'), fillT(__alloT('stem.calculus.hint_pre_3', 'The heights are f({a}) and f({b}).'), { a: calcFmtNum(finiteNum(q.xMin, 0)), b: calcFmtNum(finiteNum(q.xMax, 1)) })];
          // A worked start that fades: shown until the student has solved three of this type.
          var solvedHere = d.calcSolved && typeof d.calcSolved === 'object' ? finiteNum(d.calcSolved[q.mode], 0) : 0;
          if ((q.mode === 'estimate' || q.mode === 'exact') && !q.fnText && solvedHere < 3) {
            var Fparts = [], qa3 = finiteNum(q.a, 0) / 3, qb2 = finiteNum(q.b, 0) / 2, qc1 = finiteNum(q.c, 0);
            var coefText = function(v) { v = calcRound(v, 4); return v === 1 ? '' : v === -1 ? '\u2212' : calcFmtNum(v); };
            if (qa3) Fparts.push(coefText(qa3) + 'x\u00B3');
            if (qb2) Fparts.push(coefText(qb2) + 'x\u00B2');
            if (qc1) Fparts.push(coefText(qc1) + 'x');
            return [__alloT('stem.calculus.hint_int_1', 'Find an antiderivative F of f first.'),
              fillT(__alloT('stem.calculus.hint_worked', 'Worked start for this one: F(x) = {F}. (This step fades once you have solved three.)'), { F: Fparts.join(' + ').replace(/\+ \u2212/g, '\u2212 ') || '0' }),
              __alloT('stem.calculus.hint_int_3', 'Then compute F(upper) \u2212 F(lower), in that order.')];
          }
          if (q.mode === 'estimate' || q.mode === 'exact') return [__alloT('stem.calculus.hint_int_1', 'Find an antiderivative F of f first.'), __alloT('stem.calculus.hint_int_2','Power rule backwards: \u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1). For sin, cos, e^x and 1/x use the standard table.'), __alloT('stem.calculus.hint_int_3', 'Then compute F(upper) \u2212 F(lower), in that order.')];
          if (q.mode === 'overunder') return [__alloT('stem.calculus.hint_ou_1', 'Is the curve rising or falling on the interval? Does it bend up or down?'), __alloT('stem.calculus.hint_ou_2', 'Picture one strip: does the top of its shape sit above or below the curve?'), __alloT('stem.calculus.hint_ou_3', 'Any part below the x-axis counts as negative area.')];
          if (q.mode === 'method') return [__alloT('stem.calculus.hint_method_1', 'Error sizes: left and right shrink like 1/n, midpoint and trapezoid like 1/n\u00B2, Simpson\u2019s like 1/n\u2074.'), __alloT('stem.calculus.hint_method_2', 'The fast rules need a smooth curve: corners and vertical tangents slow them down.'), __alloT('stem.calculus.hint_method_3', 'Check the bending: midpoint and trapezoid miss on opposite sides.')];
          if (q.mode === 'minN') return [__alloT('stem.calculus.hint_minn_1', 'A left sum\u2019s error on a smooth curve shrinks roughly like 1/n.'), __alloT('stem.calculus.hint_minn_2', 'Try candidate values of n on the Integral tab with the same function.'), __alloT('stem.calculus.hint_minn_3', 'Find the FIRST n whose error is below the target.')];
          if (q.mode === 'deriv') return [__alloT('stem.calculus.hint_deriv_1', 'The derivative is the slope of the tangent line at x\u2080.'), __alloT('stem.calculus.hint_deriv_2', 'Power rule d/dx[x\u207F] = n\u00B7x\u207F\u207B\u00B9; constants become 0; chain rule for sin(kx) and e^(kx).'), __alloT('stem.calculus.hint_deriv_3', 'Write f\u2032(x) first, then substitute x = x\u2080.')];
          if (q.mode === 'avgrate') return [__alloT('stem.calculus.hint_rate_1', 'Average rate = change in f \u00F7 change in x.'), __alloT('stem.calculus.hint_rate_2', 'Compute f(p) and f(q) first.'), __alloT('stem.calculus.hint_rate_3', 'Then (f(q) \u2212 f(p)) / (q \u2212 p).')];
          if (q.mode === 'taylor') return [__alloT('stem.calculus.hint_taylor_1', 'The Maclaurin coefficient of x\u1D4F is f\u207D\u1D4F\u207E(0) / k!.'), __alloT('stem.calculus.hint_taylor_2', 'Write out the first few terms of the known series.'), __alloT('stem.calculus.hint_taylor_3', 'e^x: 1/k!. sin x: odd powers, alternating. cos x: even powers, alternating. ln(1+x): (\u22121)^(k+1)/k. 1/(1\u2212x): 1.')];
          return [];
        }

        // ── CHALLENGE ACTIONS ────────────────────────────────────────────
        // autoMode: the auto-advance after a correct answer. It runs 2 s later from this
        // render's closure, so it must not fire after the student switched challenge type
        // (an estimate quiz appeared under OVER/EXACT/UNDER) or left the tab (it rewrote
        // the Integral tab's function and bounds).
        function startCalcChallenge(autoMode) {
          var q = calcGenQuiz(cMode, band);
          setLabToolData(function(prev){
            var pc = prev.calculus || {};
            if (typeof autoMode === 'string' && ((pc.calcChallengeMode || 'estimate') !== autoMode || (pc.tab && pc.tab !== 'challenge'))) return prev;
            // The quiz carries its own function: the Integral tab's work is left alone.
            return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{calcQuiz:q,calcHint:'',calcHintRung:0,_calcExactInput:''})});
          });
          stemBeep && stemBeep('click');
          say(__alloT('stem.calculus.sr_new_challenge', 'New challenge ready.'));
        }
        function checkCalcAnswer(chosen) {
          if (!cq || cq.answered) return;
          var correct = calcQuizAnswerIsCorrect(cq, chosen);
          var attempts = (cq.attempts || 0) + 1;
          var tried = (Array.isArray(cq.tried) ? cq.tried : []).concat([String(chosen)]);
          var mis = correct ? '' : calcQuizMisconception(cq, chosen);
          var finished = correct || attempts >= 2;
          var firstTry = correct && attempts === 1;
          var newStreak = firstTry ? cStreak + 1 : (correct ? cStreak : 0);
          var questionText = quizQuestion(cq);
          setLabToolData(function(prev){
            var pc = prev.calculus || {};
            var quizNow = pc.calcQuiz && typeof pc.calcQuiz === 'object' ? pc.calcQuiz : cq;
            var patch = {
              // Two misses close the item; the answer waits for "Show the answer" (revealed).
              calcQuiz: Object.assign({}, quizNow, { answered: finished, chosen: chosen, correct: correct, attempts: attempts, tried: tried, mis: mis, revealed: false }),
              calcScore: finiteNum(pc.calcScore, 0) + (correct ? 1 : 0),
              calcStreak: newStreak,
              calcHint: ''
            };
            if (correct) { var solved = Object.assign({}, pc.calcSolved && typeof pc.calcSolved === 'object' ? pc.calcSolved : {}); solved[cq.mode] = (solved[cq.mode] || 0) + 1; patch.calcSolved = solved; }
            if (finished && !correct) {
              var missed = Array.isArray(pc.calcMissed) ? pc.calcMissed.slice(-39) : [];
              missed.push({ mode: cq.mode, band: cq.band || band, question: questionText, chosen: String(chosen), answer: String(cq.answer), mis: mis, at: Date.now() });
              patch.calcMissed = missed;
            }
            return Object.assign({}, prev, { calculus: Object.assign({}, pc, patch) });
          });
          if (correct) {
            if (!(stemCelebrate && firstTry && newStreak >= 3 && newStreak % 3 === 0)) stemBeep('success'); // else the streak fanfare below plays the same chord
            // Paid once per generated item: first try 5 XP, second try 3 XP, never after a reveal.
            if (typeof awardStemXP === 'function') awardStemXP('calculus', firstTry ? 5 : 3, fillT(__alloT('stem.calculus.xp_challenge', 'Calculus challenge: {mode}'), { mode: cq.mode }));
            addToast(firstTry ? __alloT('stem.calculus.toast_correct', '\u2705 Correct! +5 XP') : __alloT('stem.calculus.toast_correct_second', '\u2705 Correct on the second try! +3 XP'), 'success');
            if (firstTry && newStreak >= 3 && newStreak % 3 === 0) { stemCelebrate && stemCelebrate(); addToast(fillT(__alloT('stem.calculus.toast_streak', '\uD83D\uDD25 {n} in a row!'), { n: newStreak }), 'success'); }
            say(__alloT('stem.calculus.sr_correct', 'Correct.'));
            setTimeout(function(){startCalcChallenge(cMode);},2000);
          } else {
            stemBeep && stemBeep('error');
            var msg = misconceptionText(mis, cq.mode);
            if (finished) say(fillT(__alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.'), { msg: msg }));
            else say(fillT(__alloT('stem.calculus.sr_try_again', 'Not yet. {msg} Try once more.'), { msg: msg }));
            addToast(finished ? __alloT('stem.calculus.toast_wrong', '\u274C Not quite: see the explanation below') : __alloT('stem.calculus.toast_try_again', 'Not yet: read the hint and try once more'), 'error');
          }
        }

        // ── SHARED SVG GRAPH ─────────────────────────────────────────────
        // m: a model from buildGraphModel. opts: showTangent, showRects, secant ('forward' | 'centred' |
        // 'both' | null), label (accessible name), caption (visible line under the plot), marks.
        var renderGraph = function(m, opts) {
          opts = opts || {};
          var W = m.W || GRAPH_W;
          var sX = m.toSX, sY = m.toSY, okRect = function(v) { return finiteCoord(v); };
          var secant = opts.secant || null, showSec = opts.showTangent && secant && m.h > 0.05;
          return h('svg', { viewBox: '0 0 '+W+' '+H, className: 'w-full bg-white rounded-xl border-2 border-red-200 shadow-sm', style:{maxHeight: opts.maxH || '280px', display:'block'}, role:'img', 'aria-label': opts.label || '' },
            (function(){var gs=[];for(var gx=Math.ceil(m.xR.min);gx<=m.xR.max;gx++){var gsx=sX(gx);if(gsx>pad&&gsx<W-pad)gs.push(h('line',{key:'g'+gx,x1:gsx,y1:pad,x2:gsx,y2:H-pad,stroke:'#e2e8f0',strokeWidth:0.6}));}return gs;})(),
            h('line',{x1:pad,y1:sY(0),x2:W-pad,y2:sY(0),stroke:'#64748b',strokeWidth:1.5}),
            m.xR.min < 0 && m.xR.max > 0 && h('line',{x1:sX(0),y1:pad,x2:sX(0),y2:H-pad,stroke:'#64748b',strokeWidth:1.5}),
            opts.showRects && h('rect',{x:sX(m.lo),y:pad,width:Math.abs(sX(m.hi)-sX(m.lo)),height:H-2*pad,fill:'none',stroke:'#ef4444',strokeWidth:1,strokeDasharray:'4 2'}),
            opts.showRects && m.rects.map(function(r,i){
              if(r.type==='trap'){if(!okRect(r.hL)||!okRect(r.hR))return null;var pts=sX(r.x)+','+sY(0)+' '+sX(r.x)+','+sY(r.hL)+' '+sX(r.x+r.w)+','+sY(r.hR)+' '+sX(r.x+r.w)+','+sY(0);var tpos=(r.hL+r.hR)>=0;return h('polygon',{key:i,points:pts,fill:tpos?'rgba(59,130,246,0.18)':'rgba(249,115,22,0.22)',stroke:tpos?'#3b82f6':'#f97316',strokeWidth:0.8});}
              if(r.type==='simp'){if(!okRect(r.hL)||!okRect(r.hM)||!okRect(r.hR))return null;var sp=[sX(r.x)+','+sY(0)];for(var sp2=0;sp2<=10;sp2++){var st=sp2/10,spx=r.x+st*r.w,spy=r.hL*(1-st)*(1-2*st)+4*r.hM*st*(1-st)+r.hR*st*(2*st-1);sp.push(sX(spx)+','+sY(spy));}sp.push(sX(r.x+r.w)+','+sY(0));return h('polygon',{key:i,points:sp.join(' '),fill:'rgba(168,85,247,0.15)',stroke:'#a855f7',strokeWidth:0.8});}
              if(!okRect(r.h))return null;
              return h('rect',{key:i,x:sX(r.x),y:r.h>=0?sY(r.h):sY(0),width:Math.abs(sX(r.x+r.w)-sX(r.x)),height:Math.abs(sY(r.h)-sY(0)),fill:r.h>=0?'rgba(59,130,246,0.18)':'rgba(249,115,22,0.22)',stroke:r.h>=0?'#3b82f6':'#f97316',strokeWidth:0.8});
            }),
            showSec && (secant === 'forward' || secant === 'both') && m.secantPts && h('polyline',{points:m.secantPts,fill:'none',stroke:'#b45309',strokeWidth:1.5,strokeDasharray:'5 3'}),
            showSec && (secant === 'centred' || secant === 'both') && m.centredPts && h('polyline',{points:m.centredPts,fill:'none',stroke:'#7c3aed',strokeWidth:1.5,strokeDasharray:'2 3'}),
            opts.showTangent && m.tangentPts && h('polyline',{points:m.tangentPts,fill:'none',stroke:'#dc2626',strokeWidth:2}),
            m.segs.map(function(seg, si) { return h('polyline',{key:'c'+si,points:seg.join(' '),fill:'none',stroke:isContrast?'#ffff00':'#1e293b',strokeWidth:2.5}); }),
            (opts.marks || []).map(function(mk, mi) { var p = m.svgPoint(mk.x, m.f(mk.x)); if (!p) return null; var xy = p.split(','); return h('circle',{key:'mk'+mi,cx:+xy[0],cy:+xy[1],r:5,fill:mk.color||'#dc2626',stroke:'white',strokeWidth:2}); }),
            opts.showTangent && finiteCoord(m.fy0) && h('circle',{cx:sX(m.x0),cy:sY(m.fy0),r:5,fill:'#dc2626',stroke:'white',strokeWidth:2}),
            showSec && (secant === 'forward' || secant === 'both') && finiteCoord(m.f(m.x0+m.h)) && h('circle',{cx:sX(m.x0+m.h),cy:sY(m.f(m.x0+m.h)),r:4,fill:'#b45309',stroke:'white',strokeWidth:2}),
            showSec && (secant === 'centred' || secant === 'both') && finiteCoord(m.f(m.x0-m.h)) && h('circle',{cx:sX(m.x0-m.h),cy:sY(m.f(m.x0-m.h)),r:4,fill:'#7c3aed',stroke:'white',strokeWidth:2}),
            opts.caption && h('text',{x:W/2,y:H-6,textAnchor:'middle',fill:isContrast?'#ffff00':'#475569',style:{fontSize:'10px',fontWeight:'bold'}}, opts.caption)
          );
        };
        // The Integral and Derivative graphs keep their established accessible names.
        var svgGraph = function(showTangent, showRects) {
          var graphLabel;
          if (showTangent) {
            graphLabel = fillT(__alloT('stem.calculus.graph_label_derivative', 'Graph of {f}. Tangent at x {x} has slope {s}. Secant gap h is {h}.'), { f: fStr, x: x0, s: finiteCoord(slope) ? slope.toFixed(3) : __alloT('stem.calculus.not_available', 'not available'), h: finiteNum(dh, 0).toFixed(2) });
          } else if (predictOpen) {
            graphLabel = fillT(__alloT('stem.calculus.graph_label_integral_predict', 'Graph of {f} from {a} to {b} using {n} {method} subdivisions. Commit your estimate to see the sum and the exact integral.'), { f: fStr, a: xMin, b: xMax2, n: nRects, method: methodWord(mode) });
          } else if (ouPending) {
            graphLabel = fillT(__alloT('stem.calculus.graph_label_integral_hidden', 'Graph of {f} from {a} to {b} using {n} {method} subdivisions. Estimate {e}. The exact integral is hidden until you answer.'), { f: fStr, a: xMin, b: xMax2, n: nRects, method: methodWord(mode), e: fix(area, 4) });
          } else if (!exactOk) {
            graphLabel = fillT(__alloT('stem.calculus.graph_label_integral_improper', 'Graph of {f} from {a} to {b} using {n} {method} subdivisions. The function is undefined or unbounded on this interval, so the integral is improper.'), { f: fStr, a: xMin, b: xMax2, n: nRects, method: methodWord(mode) });
          } else if (improperConv) {
            graphLabel = fillT(__alloT('stem.calculus.graph_label_integral_imp_conv_v2', 'Graph of {f} from {a} to {b} using {n} {method} subdivisions. The function is not defined or not bounded near x = {c}, so the integral is improper; it converges to {x}.'), { f: fStr, a: xMin, b: xMax2, n: nRects, method: methodWord(mode), c: impTrouble != null ? calcFmtNum(impTrouble) : '?', x: exact.toFixed(4) });
          } else {
            graphLabel = fillT(__alloT('stem.calculus.graph_label_integral', 'Graph of {f} from {a} to {b} using {n} {method} subdivisions. Estimate {e}, exact integral {x}, absolute error {err}.'), { f: fStr, a: xMin, b: xMax2, n: nRects, method: methodWord(mode), e: fix(area, 4), x: exact.toFixed(4), err: fix(err, 4) });
          }
          var caption = showTangent
            ? fStr + '  |  f\u2032(' + x0 + ') = ' + (finiteCoord(slope) ? slope.toFixed(3) : 'n/a')
            : predictOpen ? fStr + '  (n=' + nRects + ', ' + methodWord(mode) + ')'
            : fStr + '  |  \u222B \u2248 ' + fix(area, 4) + '  (n=' + nRects + ', ' + methodWord(mode) + ')';
          return renderGraph(gmMain, { showTangent: showTangent, showRects: showRects, secant: showTangent ? secantKind : null, label: graphLabel, caption: caption, maxH: showTangent ? null : '420px' });
        };
        // A challenge graph: drawn from the quiz's own function, with no number that answers it.
        var quizGraph = function(q) {
          var qf = quizFn(q), lo = finiteNum(q.xMin, 0), hi = finiteNum(q.xMax, 1);
          if (q.mode === 'deriv' || q.mode === 'taylor') { lo = finiteNum(q.x0, 0) - 2; hi = finiteNum(q.x0, 0) + 2; }
          if (!(hi > lo)) hi = lo + 1;
          var method = q.mode === 'overunder' ? (q.ruleMode || 'left') : 'midpoint';
          var n = q.mode === 'overunder' ? finiteNum(q.n, 4) : 60;
          var m = buildGraphModel(qf.f, qf.df, lo, hi, n, method, finiteNum(q.x0, 0), 0.5, true);
          var showRects = q.mode !== 'deriv' && q.mode !== 'taylor' && q.mode !== 'avgrate';
          var marks = q.mode === 'deriv' ? [{ x: finiteNum(q.x0, 0) }] : q.mode === 'avgrate' ? [{ x: q.p }, { x: q.q, color: '#b45309' }] : [];
          var base = fillT(__alloT('stem.calculus.quiz_graph_label', 'Graph of f(x) = {f} from x = {a} to x = {b}.'), { f: qf.label, a: calcFmtNum(lo), b: calcFmtNum(hi) });
          var extra = q.mode === 'overunder' ? fillT(__alloT('stem.calculus.quiz_graph_rects', 'It shows {n} {method} rectangles on the interval.'), { n: n, method: methodWord(method) })
            : q.mode === 'deriv' ? fillT(__alloT('stem.calculus.quiz_graph_point', 'A point is marked on the curve at x = {x}.'), { x: calcFmtNum(finiteNum(q.x0, 0)) })
            : q.mode === 'avgrate' ? fillT(__alloT('stem.calculus.quiz_graph_points', 'Points are marked at x = {p} and x = {q}.'), { p: q.p, q: q.q })
            : showRects ? __alloT('stem.calculus.quiz_graph_region', 'The region between the curve and the x-axis is shaded.') : '';
          return renderGraph(m, { showTangent: q.answered && q.mode === 'deriv', showRects: showRects, marks: marks, label: (base + ' ' + extra).trim(), caption: 'f(x) = ' + qf.label });
        };

        // ── RENDER ───────────────────────────────────────────────────────
        var CALCULUS_TABS = [
          ['integral','\u222B ' + __alloT('stem.calculus.tab_integral', 'Integral')],
          ['derivative','\uD83D\uDCC8 ' + __alloT('stem.calculus.tab_derivative', 'Derivative')],
          ['limits','\u2192 ' + __alloT('stem.calculus.tab_limits', 'Limits')],
          ['visualize','\uD83C\uDFAC ' + __alloT('stem.calculus.tab_visualize', 'Visualize')],
          ['challenge','\uD83C\uDFAF ' + __alloT('stem.calculus.tab_challenge', 'Challenge')],
          ['discover',__alloT('stem.calculus.tab_fundamental_theorem','Fundamental theorem')],
          ['derivHunt',__alloT('stem.calculus.tab_explore_derivatives','Explore derivatives')],
          ['series','\u03A3 ' + __alloT('stem.calculus.tab_series', 'Series')],
          ['apply','\uD83E\uDE9C ' + __alloT('stem.calculus.tab_apply', 'Rates and optimization')],
          ['frq','\uD83D\uDCDD ' + __alloT('stem.calculus.tab_frq', 'AP free response')]
        ];
        // The band's core activities come first; every other tab stays one step away, under "More".
        var TAB_CORE = { pre: ['limits', 'derivative', 'challenge', 'integral'], ab: ['derivative', 'integral', 'discover', 'apply', 'frq'], bc: ['integral', 'series', 'visualize', 'frq', 'derivative'] };
        var coreTabIds = TAB_CORE[band] || TAB_CORE.ab;
        CALCULUS_TABS = coreTabIds.map(function(id) { return CALCULUS_TABS.filter(function(t2) { return t2[0] === id; })[0]; }).filter(Boolean)
          .concat(CALCULUS_TABS.filter(function(t2) { return coreTabIds.indexOf(t2[0]) < 0; }));
        // (The hero's "Recommended next move" and stat tiles are gone: the path's one-line Next is the only guide.)
        var methodsTried = Object.keys(d.methodsUsed || {}).length;

        var calculusTabKeyDown = function(e, index) {
          var nextIndex = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % CALCULUS_TABS.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index - 1 + CALCULUS_TABS.length) % CALCULUS_TABS.length;
          else if (e.key === 'Home') nextIndex = 0;
          else if (e.key === 'End') nextIndex = CALCULUS_TABS.length - 1;
          if (nextIndex < 0) return;
          e.preventDefault();
          var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
          var nextTab = tabs[nextIndex];
          if (nextTab) { nextTab.focus(); nextTab.click(); }
        };

        // Cross-links: open another STEM tool when this build can load it.
        function toolReachable(id) {
          try {
            if (typeof setStemLabTool !== 'function' || !window.StemLab) return false;
            return !!((window.StemLab.isRegistered && window.StemLab.isRegistered(id)) || typeof window.__alloEnsureStemPluginLoaded === 'function');
          } catch (e) { return false; }
        }
        function openTool(id, name) {
          var ok = false;
          try { ok = !!(window.StemLab.isRegistered && window.StemLab.isRegistered(id)); } catch (e) { ok = false; }
          if (!ok) { try { ok = typeof window.__alloEnsureStemPluginLoaded === 'function' && window.__alloEnsureStemPluginLoaded(id) !== false; } catch (e2) { ok = false; } }
          if (!ok || typeof setStemLabTool !== 'function') { say(fillT(__alloT('stem.calculus.tool_unavailable', '{name} is not available in this build.'), { name: name })); return; }
          setStemLabTool(id);
        }

        // ── Accessible graph panel (shared core): describe, hear, step through the curve ──
        var gaSamples = GA ? GA.sample(evalF, xMin, xMax2, 201) : [];
        var gaStyles = { button: { minHeight: 32, padding: '4px 10px', borderRadius: 8, border: '1px solid #64748b', background: '#f8fafc', color: '#0f172a', fontSize: 12, fontWeight: 700 }, text: { color: '#0f172a', fontSize: 12 }, region: { padding: 6, border: '1px dashed #64748b', borderRadius: 8, fontSize: 12, color: '#0f172a' }, help: { fontSize: 11, color: '#475569' } };
        function graphAccessPanel(id) {
          if (!GA || !gaSamples.length) return null;
          var desc = GA.describeGraph(gaSamples, { t: __alloT, name: fStr, evaluate: evalF });
          var points = GA.explorePoints(gaSamples, desc, __alloT);
          return h('div', { className: 'mt-2 rounded-xl border border-slate-300 bg-white p-2' },
            GA.panel(React, { id: id, t: __alloT, desc: desc, points: points, index: ui.gaIndex, samples: gaSamples, sonify: { evaluate: evalF }, open: !!ui.gaOpen,
              onToggle: function() { setUi({ gaOpen: !ui.gaOpen }); }, onIndex: function(i) { setUi({ gaIndex: i }); }, onChange: function() { setUi({ gaTick: Date.now() }); },
              announce: typeof announceToSR === 'function' ? announceToSR : null, callTTS: ctx.callTTS, styles: gaStyles }));
        }

        // ── The function box: type any f(x), or use the quadratic sliders ──
        function functionBox(where) {
          var parsed = fnText.trim() ? calcCompileText(fnText) : null;
          var errId = 'calc-fn-status-' + where;
          var setText = function(v) { updMany({ fnText: v, fnMode: 'typed', overUnderChecked: false, overUnderGuess: null, predictSubmitted: false, overUnderTries: 0, antiChecked: false, derivTypedChecked: false, limitCommitted: false, limitTries: 0, limitLastPred: null }); };
          return h('section', { className: 'mb-3 rounded-xl border border-slate-300 bg-white p-3', 'data-calc-function-box': where },
            h('div', { className: 'flex flex-wrap items-center gap-2 mb-2', role: 'group', 'aria-label': __alloT('stem.calculus.fn_source', 'Function source') },
              h('span', { className: 'text-xs font-bold text-slate-800' }, __alloT('stem.calculus.fn_source', 'Function source')),
              [['quad', __alloT('stem.calculus.fn_mode_quad', 'Quadratic sliders')], ['typed', __alloT('stem.calculus.fn_mode_typed', 'Type a function')]].map(function(opt) {
                var on = (opt[0] === 'typed') === (d.fnMode === 'typed');
                return h('button', { key: opt[0], type: 'button', 'aria-pressed': on, onClick: function() { updMany({ fnMode: opt[0], overUnderChecked: false, overUnderGuess: null, overUnderTries: 0, predictSubmitted: false, antiChecked: false, derivTypedChecked: false }); },
                  className: 'min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold border ' + (on ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-400 hover:bg-slate-100') }, opt[1]);
              })
            ),
            d.fnMode === 'typed' && h('div', null,
              h('label', { htmlFor: 'calc-fn-input-' + where, className: 'block text-xs font-bold text-slate-800' }, 'f(x) ='),
              h('input', { id: 'calc-fn-input-' + where, type: 'text', value: fnText, spellCheck: false, autoComplete: 'off', 'aria-describedby': errId,
                'aria-invalid': parsed && !parsed.ok ? 'true' : 'false', placeholder: __alloT('stem.calculus.fn_placeholder', 'e.g. sin(x), e^x, ln x, 2x(x - 1)'),
                onChange: function(e) { setText(e.target.value); },
                className: 'mt-1 w-full px-3 py-2 rounded-lg border-2 border-slate-500 font-mono text-sm', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } }),
              h('p', { id: errId, role: 'status', 'aria-live': 'polite', className: 'mt-1 text-xs ' + (parsed && !parsed.ok ? 'text-red-700 font-bold' : 'text-slate-700') },
                !parsed ? __alloT('stem.calculus.fn_help', 'Use x as the variable. Implicit multiplication works: 2x, x(x+1), 3sin x. Functions: sin, cos, tan, sqrt, ln, log, exp, abs, floor; constants pi and e.')
                  : parsed.ok ? fillT(__alloT('stem.calculus.fn_read_as', 'Read as: f(x) = {f}'), { f: parsed.label })
                  : parseErrorText(parsed.error, parsed.detail)),
              ambiguityNote(parsed, function(fix) { setText(fix); }),
              h('div', { className: 'mt-2 flex flex-wrap gap-1.5', role: 'group', 'aria-label': __alloT('stem.calculus.fn_examples', 'Example functions') },
                TYPED_EXAMPLES.map(function(ex) {
                  return h('button', { key: ex, type: 'button', onClick: function() { setText(ex); }, 'aria-label': fillT(__alloT('stem.calculus.fn_use_example', 'Use f(x) = {f}'), { f: ex }),
                    className: 'min-h-[28px] px-2 py-1 rounded-md text-[0.6875rem] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-400 hover:bg-slate-200' }, ex);
                })
              )
            ),
            d.fnMode !== 'typed' && h('p', { className: 'text-xs text-slate-700' }, fillT(__alloT('stem.calculus.fn_quad_now', 'Now: f(x) = {f}. Use the a, b, c sliders below, or switch to typing any function.'), { f: buildFStr(fa, fb, fc) }))
          );
        }

        // ── Teacher tools (ctx.isTeacherMode only) ──
        function teacherPanel() {
          if (!isTeacher) return null;
          var missed = Array.isArray(d.calcMissed) ? d.calcMissed : [];
          var misCounts = {};
          missed.forEach(function(m) { var k = m.mis || 'near_miss'; misCounts[k] = (misCounts[k] || 0) + 1; });
          var misRows = Object.keys(misCounts).sort(function(p, q) { return misCounts[q] - misCounts[p]; });
          var paidKeys = Object.keys(paidFlags);
          var rows = [
            [__alloT('stem.calculus.tr_score', 'Challenges correct'), String(cScore)],
            [__alloT('stem.calculus.tr_missed', 'Challenges missed (after two tries)'), String(missed.length)],
            [__alloT('stem.calculus.tr_missions', 'Discovery missions completed'), String(paidKeys.filter(function(k) { return /^m\d$/.test(k); }).length)],
            [__alloT('stem.calculus.tr_eps', '\u03B5\u2013\u03B4 rounds won'), String(paidKeys.filter(function(k) { return /^eps:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_match', 'Graph matches solved'), String(paidKeys.filter(function(k) { return /^match:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_anti', 'Antiderivatives built'), String(paidKeys.filter(function(k) { return /^anti:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_limits', 'Limits predicted correctly'), String(paidKeys.filter(function(k) { return /^lim:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_improper', 'Improper integrals decided'), String(paidKeys.filter(function(k) { return /^imp:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_euler', 'Euler predictions right'), String(paidKeys.filter(function(k) { return /^eul:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_series', 'Series classified'), String(paidKeys.filter(function(k) { return /^ser:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_missions_applied', 'Rate and optimization missions completed (no reveals)'), String(paidKeys.filter(function(k) { return /^mis:/.test(k); }).length)],
            [__alloT('stem.calculus.tr_frq', 'Free-response questions completed'), String(paidKeys.filter(function(k) { return /^frq:/.test(k); }).length)]
          ];
          var toggleMode = function(id) {
            var cur = Array.isArray(d.teacherModes) ? d.teacherModes.slice() : [];
            var i = cur.indexOf(id);
            if (i >= 0) cur.splice(i, 1); else cur.push(id);
            upd('teacherModes', cur);
          };
          var csv = function() {
            if (!GA) return;
            GA.downloadText('calculus-missed-items.csv', GA.csvText([['when', 'type', 'level', 'question', 'chosen', 'answer', 'misconception']].concat(missed.map(function(m) {
              return [new Date(m.at || 0).toISOString(), m.mode, m.band || '', m.question, m.chosen, m.answer, misconceptionText(m.mis, m.mode)];
            }))), 'text/csv');
          };
          return h('details', { className: 'mb-3 rounded-xl border-2 border-indigo-400 bg-indigo-50 p-3', 'data-calculus-teacher': true },
            h('summary', { className: 'cursor-pointer text-sm font-black text-indigo-900' }, __alloT('stem.calculus.teacher_title', 'Teacher tools (only you see this)')),
            h('fieldset', { className: 'mt-2 border border-indigo-300 rounded-lg p-2' },
              h('legend', { className: 'px-1 text-xs font-bold text-indigo-900' }, __alloT('stem.calculus.teacher_band', 'Lock the level')),
              [[null, __alloT('stem.calculus.teacher_band_free', 'Students choose')], ['pre', bandLabel('pre')], ['ab', bandLabel('ab')], ['bc', bandLabel('bc')]].map(function(opt) {
                var on = (opt[0] || null) === (bandLocked ? d.teacherBand : null);
                return h('label', { key: String(opt[0]), className: 'mr-3 inline-flex items-center gap-1 text-xs text-indigo-950 min-h-[28px]' },
                  h('input', { type: 'radio', name: 'calc-teacher-band', checked: on, onChange: function() { upd('teacherBand', opt[0]); } }), opt[1]);
              })
            ),
            h('fieldset', { className: 'mt-2 border border-indigo-300 rounded-lg p-2' },
              h('legend', { className: 'px-1 text-xs font-bold text-indigo-900' }, __alloT('stem.calculus.teacher_modes', 'Challenge types students may use (none ticked = all)')),
              CALC_CHALLENGES_ALL.filter(function(cm) { return bandModes.indexOf(cm.id) >= 0; }).map(function(cm) {
                var on = Array.isArray(d.teacherModes) && d.teacherModes.indexOf(cm.id) >= 0;
                return h('label', { key: cm.id, className: 'mr-3 inline-flex items-center gap-1 text-xs text-indigo-950 min-h-[28px]' },
                  h('input', { type: 'checkbox', checked: on, onChange: function() { toggleMode(cm.id); } }), cm.label);
              })
            ),
            h('label', { className: 'mt-2 flex items-center gap-2 text-xs text-indigo-950 min-h-[28px]' },
              h('input', { type: 'checkbox', checked: noReveal, onChange: function(e) { upd('teacherNoReveal', e.target.checked); } }),
              __alloT('stem.calculus.teacher_no_reveal', 'Do not show the answer after two wrong tries (students get a fresh problem instead)')),
            h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.teacher_progress', 'Progress'), className: 'mt-2 overflow-x-auto' },
              h('table', { className: 'text-xs text-indigo-950 border-collapse' },
                h('caption', { className: 'text-left font-bold' }, __alloT('stem.calculus.teacher_progress', 'Progress')),
                h('tbody', null, rows.map(function(r, i) { return h('tr', { key: i }, h('th', { scope: 'row', className: 'text-left pr-3 py-0.5 font-semibold' }, r[0]), h('td', { className: 'py-0.5' }, r[1])); })))),
            h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.teacher_misconceptions', 'Misconceptions seen'), className: 'mt-2 overflow-x-auto' },
              misRows.length ? h('table', { className: 'text-xs text-indigo-950 border-collapse w-full' },
                h('caption', { className: 'text-left font-bold' }, __alloT('stem.calculus.teacher_misconceptions', 'Misconceptions seen')),
                h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.teacher_col_count', 'Times')), h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.teacher_col_mis', 'Misconception')))),
                h('tbody', null, misRows.map(function(k) { return h('tr', { key: k }, h('td', { className: 'pr-2 align-top' }, String(misCounts[k])), h('td', null, misconceptionText(k, ''))); })))
              : h('p', { className: 'text-xs text-indigo-950' }, __alloT('stem.calculus.teacher_no_missed', 'No missed items yet.'))),
            missed.length > 0 && h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.teacher_missed_items', 'Missed items'), className: 'mt-2 overflow-x-auto max-h-48 overflow-y-auto' },
              h('ol', { className: 'text-[0.6875rem] text-indigo-950 list-decimal pl-5 space-y-1' }, missed.slice().reverse().map(function(m, i) {
                return h('li', { key: i }, fillT(__alloT('stem.calculus.teacher_missed_line', '{q} Chose {c}; answer {a}.'), { q: m.question, c: m.chosen, a: m.answer }));
              }))),
            h('div', { className: 'mt-2 flex flex-wrap gap-2' },
              GA && h('button', { type: 'button', onClick: csv, disabled: !missed.length, className: 'min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold bg-indigo-700 text-white disabled:opacity-50' }, __alloT('stem.calculus.teacher_csv', 'Download missed items (CSV)')),
              h('button', { type: 'button', onClick: function() { upd('calcMissed', []); }, disabled: !missed.length, className: 'min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold bg-white text-indigo-900 border border-indigo-500 disabled:opacity-50' }, __alloT('stem.calculus.teacher_clear', 'Clear missed items')))
          );
        }

        // ── START HERE: a short path for the level; every tick comes from saved progress keys
        // (missionXP flags, calcSolved counts, methodsUsed), so it survives a reload. ──
        function pathSteps(b) {
          var has = function(re) { return Object.keys(paidFlags).some(function(k) { return re.test(k); }); };
          var S = {
            limit: { tab: 'limits', patch: { limitMode: 'practice' }, title: __alloT('stem.calculus.ps_limit', 'Predict a limit'), detail: __alloT('stem.calculus.ps_limit_d', 'Limits: say where f is heading, then read both one-sided tables.'), done: has(/^lim:/) },
            avgrate: { tab: 'challenge', patch: { calcChallengeMode: 'avgrate', calcQuiz: null }, title: __alloT('stem.calculus.ps_avgrate', 'Average rate of change'), detail: __alloT('stem.calculus.ps_avgrate_d', 'Challenge: the slope of a secant line between two points.'), done: solvedOf('avgrate') > 0 },
            slope: { tab: 'challenge', patch: { calcChallengeMode: 'deriv', calcQuiz: null }, title: __alloT('stem.calculus.ps_slope', 'Slope at a point'), detail: __alloT('stem.calculus.ps_slope_d', 'Challenge: the rate of change at one instant, the tangent slope.'), done: solvedOf('deriv') > 0 },
            area: { tab: 'integral', patch: {}, title: __alloT('stem.calculus.ps_area', 'Area from rectangles'), detail: __alloT('stem.calculus.ps_area_d', 'Integral: compare two rectangle methods on the same curve.'), done: methodsTried >= 2 },
            deriv: { tab: 'derivative', patch: {}, title: __alloT('stem.calculus.ps_deriv', 'Differentiate'), detail: __alloT('stem.calculus.ps_deriv_d', 'Derivative: type f′ and the tool checks it at many points.'), done: has(/^dfx:/) },
            anti: { tab: 'integral', patch: {}, title: __alloT('stem.calculus.ps_anti', 'Integrate'), detail: __alloT('stem.calculus.ps_anti_d', 'Integral: build an antiderivative F and check that F′ = f.'), done: has(/^anti:/) },
            ftc: { tab: 'discover', patch: {}, title: __alloT('stem.calculus.ps_ftc', 'The Fundamental Theorem'), detail: __alloT('stem.calculus.ps_ftc_d', 'Fundamental theorem: finish one guided mission.'), done: has(/^m[1-4]$/) },
            optim: { tab: 'apply', patch: {}, title: __alloT('stem.calculus.ps_optim', 'Optimization and related rates'), detail: __alloT('stem.calculus.ps_optim_d', 'Rates and optimization: set up a model step by step, with no reveals.'), done: has(/^mis:/) },
            frq: { tab: 'frq', patch: {}, title: __alloT('stem.calculus.ps_frq', 'AP free response'), detail: __alloT('stem.calculus.ps_frq_d', 'Answer and justify every part of one question.'), done: has(/^frq:/) },
            improper: { tab: 'integral', patch: {}, title: __alloT('stem.calculus.ps_improper', 'Improper integrals'), detail: __alloT('stem.calculus.ps_improper_d', 'Integral: decide converge or diverge, then read the limit table.'), done: has(/^imp:/) },
            euler: { tab: 'visualize', patch: { vizView: 'slope' }, title: __alloT('stem.calculus.ps_euler', 'Euler’s method'), detail: __alloT('stem.calculus.ps_euler_d', 'Visualize, slope fields: predict how the error changes when h halves.'), done: has(/^eul:/) },
            series: { tab: 'series', patch: {}, title: __alloT('stem.calculus.ps_series', 'Series: converge or diverge'), detail: __alloT('stem.calculus.ps_series_d', 'Series: decide, and name the test that settles it.'), done: has(/^ser:\d/) },
            frqser: { tab: 'frq', patch: {}, title: __alloT('stem.calculus.ps_frqser', 'Power series free response'), detail: __alloT('stem.calculus.ps_frqser_d', 'AP free response, power series: radius, endpoints, justification.'), done: has(/^frq:series:/) }
          };
          var ids = b === 'pre' ? ['limit', 'avgrate', 'slope', 'area'] : b === 'bc' ? ['anti', 'improper', 'euler', 'series', 'frqser'] : ['deriv', 'anti', 'ftc', 'optim', 'frq'];
          // Where "Go" puts focus: the step's own task (first match wins; a container hands on to its first field, then its first button).
          var FOCUS = {
            limit: ['[data-calc-limits] [role="radiogroup"]', '[data-calc-start="limits"]', '[data-calc-limits]'],
            avgrate: ['[data-calc-start="challenge"]'], slope: ['[data-calc-start="challenge"]'],
            area: ['[data-calc-methods] button[aria-pressed="false"]'],
            deriv: ['#calc-dtyped', '[data-calc-deriv-trainer] input', '[data-calc-deriv-trainer]'],
            anti: ['#calc-anti-input'],
            ftc: ['[data-calc-missions] ~ div button:not([disabled])', '[data-calc-missions] ~ div'],
            optim: ['[data-calc-applied] li.border-2', '[data-calc-applied]'],
            frq: ['[data-calc-frq]'], frqser: ['[data-calc-frq]'],
            improper: ['[data-calc-improper] [role="radiogroup"]', '[data-calc-improper] button'],
            euler: ['[data-calc-euler] [role="radiogroup"]', '[data-calc-euler]'],
            series: ['[data-calc-series] [role="radiogroup"]', '[data-calc-series]']
          };
          if (S.deriv) S.deriv.patch = { showDerivTrainer: true };
          return ids.map(function(id) { return Object.assign({ id: id, focus: FOCUS[id] || [] }, S[id]); });
        }
        function learningPath() {
          var steps = pathSteps(band), doneN = steps.filter(function(s) { return s.done; }).length, allDone = doneN === steps.length;
          // The list folds away; one line says what is next. "Go" opens that step's tab, scrolls to its
          // task, focuses it and says what to do there.
          var hidden = ui.pathHidden == null ? true : !!ui.pathHidden;
          var next = steps.filter(function(s) { return !s.done; })[0] || null;
          var go = function(s) {
            _goFocus.current = { sel: s.focus || [] };
            updMany(Object.assign({ tab: s.tab }, s.patch));
            say(fillT(__alloT('stem.calculus.sr_path_go_task', 'Opened: {title}. {task}'), { title: s.title, task: s.detail }));
          };
          return h('section', { className: 'mb-3 rounded-xl border-2 border-sky-700 bg-white px-3 py-2 text-slate-900', 'data-calc-path': band, 'aria-labelledby': 'calc-path-title' },
            h('div', { className: 'flex flex-wrap items-center gap-x-3 gap-y-1' },
              h('h3', { id: 'calc-path-title', className: 'text-sm font-black' }, fillT(__alloT('stem.calculus.path_title', 'Start here: the {band} path'), { band: bandLabel(band) })),
              h('span', { className: 'text-xs font-bold', 'data-calc-path-done': doneN + '/' + steps.length }, fillT(__alloT('stem.calculus.path_progress', '{k} of {n} done'), { k: doneN, n: steps.length })),
              next ? h('p', { className: 'text-xs', style: { flex: '1 1 9rem' }, 'data-calc-path-next': next.id }, fillT(__alloT('stem.calculus.path_next_line', 'Next: {title}'), { title: next.title }))
                : h('p', { className: 'text-xs font-bold text-emerald-900', style: { flex: '1 1 9rem' }, 'data-calc-path-next': 'done' }, __alloT('stem.calculus.path_all_done', 'Every step on this path is done.')),
              next && h('button', { type: 'button', onClick: function() { go(next); }, 'data-calc-path-go': next.id, 'aria-label': fillT(__alloT('stem.calculus.path_go_label', 'Go: {title}'), { title: next.title }),
                className: 'shrink-0 min-h-[44px] min-w-[44px] px-4 rounded-lg text-xs font-bold bg-sky-800 text-white' }, __alloT('stem.calculus.path_go', 'Go')),
              h('button', { type: 'button', 'aria-expanded': !hidden, 'aria-controls': 'calc-path-list', onClick: function() { setUi({ pathHidden: !hidden }); }, className: 'min-h-[44px] px-3 rounded-lg text-xs font-bold bg-white text-sky-900 border border-sky-700' },
                hidden ? __alloT('stem.calculus.path_show', 'Show the path') : __alloT('stem.calculus.path_hide', 'Hide the path'))),
            !hidden && h('ol', { id: 'calc-path-list', className: 'mt-2 grid gap-2 sm:grid-cols-2' }, steps.map(function(s, i) {
              var here = tab === s.tab;
              return h('li', { key: s.id, 'data-calc-path-step': s.id, 'data-done': s.done ? 'true' : 'false', className: 'flex items-start gap-2 rounded-lg border p-2 ' + (s.done ? 'border-emerald-700 bg-emerald-50' : 'border-slate-400 bg-slate-50') },
                h('span', { 'aria-hidden': 'true', className: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ' + (s.done ? 'bg-emerald-800 text-white' : 'bg-slate-700 text-white') }, s.done ? '✓' : String(i + 1)),
                h('span', { className: 'min-w-0 flex-1' },
                  h('strong', { className: 'block text-xs' }, s.title),
                  h('span', { className: 'block text-[0.6875rem]' }, s.detail),
                  h('span', { className: 'block text-[0.6875rem] font-bold ' + (s.done ? 'text-emerald-900' : 'text-slate-800') }, s.done ? __alloT('stem.calculus.path_done', 'Done') : __alloT('stem.calculus.path_todo', 'Not done yet'))),
                h('button', { type: 'button', onClick: function() { go(s); }, 'aria-label': fillT(here ? __alloT('stem.calculus.path_here_label', 'You are here: {title}') : __alloT('stem.calculus.path_go_label', 'Go: {title}'), { title: s.title }),
                  className: 'shrink-0 min-h-[32px] px-3 py-1 rounded-lg text-[0.6875rem] font-bold ' + (here ? 'bg-white text-sky-900 border border-sky-700' : 'bg-sky-800 text-white') }, here ? __alloT('stem.calculus.path_here', 'You are here') : __alloT('stem.calculus.path_go', 'Go')));
            })));
        }

        // ── LIMITS TAB: predict the limit, then read both one-sided tables ──
        function limitMisText(key) {
          var M = {
            hole_blocks_limit: __alloT('stem.calculus.lmis_hole', 'A hole does not stop a limit. The limit asks where f is heading NEAR a, not what happens AT a.'),
            continuous_plug_in: __alloT('stem.calculus.lmis_continuous', 'This function is continuous at a, so the limit is simply f(a): substitute and see.'),
            one_side_only: __alloT('stem.calculus.lmis_one_side', 'That is only a one-sided limit. The two sides approach different values, so the two-sided limit does not exist.'),
            jump_dne: __alloT('stem.calculus.lmis_jump', 'The values from the left and from the right settle on different numbers, so there is no single two-sided limit.'),
            infinite_same_sign: __alloT('stem.calculus.lmis_inf_same', 'Close: there is no finite limit, but both sides grow without bound in the SAME direction, so we write the limit as \u221E (or \u2212\u221E).'),
            infinite_opposite_sides: __alloT('stem.calculus.lmis_inf_opposite', 'Check each side separately: when the two sides head off in opposite directions, or to a number on one side only, the limit does not exist.'),
            oscillation_dne: __alloT('stem.calculus.lmis_oscillation', 'The values never settle: they keep swinging up and down however close x gets, so the limit does not exist.'),
            zero_over_zero: __alloT('stem.calculus.lmis_zero_over_zero', 'Substituting gives 0/0, which is not 0: it is undefined, a signal to simplify. Factor and cancel, or read the tables.'),
            read_both_sides: __alloT('stem.calculus.lmis_read', 'Not this value. Imagine x a little below a and a little above a: where are the outputs heading?')
          };
          return M[key] || M.read_both_sides;
        }
        function limitKindText(kind) {
          return kind === 'continuous' ? __alloT('stem.calculus.lk_continuous', 'continuous: the limit equals f(a)')
            : kind === 'hole' ? __alloT('stem.calculus.lk_hole', 'a removable hole: the limit exists but f(a) is missing or different')
            : kind === 'jump' ? __alloT('stem.calculus.lk_jump', 'a jump: the one-sided limits differ')
            : kind === 'infinite' ? __alloT('stem.calculus.lk_infinite', 'a vertical asymptote: the values grow without bound')
            : kind === 'oscillating' ? __alloT('stem.calculus.lk_oscillating', 'oscillation: the values never settle')
            : __alloT('stem.calculus.lk_onesided', 'defined on one side only');
        }
        function limitsTab() {
          var lmode = d.limitMode === 'explore' ? 'explore' : 'practice';
          var seed = finiteCoord(d.limitSeed) ? d.limitSeed : null;
          var item = null, fnL = null, aL = 0, labelL = '';
          if (lmode === 'practice' && seed) {
            item = calcGenLimit(calcSeeded(seed), d.limitBand || band);
            fnL = calcCompileText(item.text); aL = item.a; labelL = fnL.ok ? fnL.label : item.text;
          } else if (lmode === 'explore') {
            aL = clampCalculusNumber(d.limitA, -10, 10, 1);
            fnL = { ok: true, f: evalF, label: fBody }; labelL = fBody;
          }
          var probe = fnL && fnL.ok ? calcLimitProbe(fnL.f, aL) : null;
          var pred = d.limitPred && typeof d.limitPred === 'object' ? d.limitPred : { kind: '', value: '' };
          var tries = finiteNum(d.limitTries, 0);
          var committed = !!d.limitCommitted;
          var grade = probe && (committed || tries > 0) ? calcGradeLimit(probe, d.limitLastPred || pred) : null;
          var revealed = committed && (grade && (grade.correct || tries >= 2));
          var showAnswer = revealed && (grade.correct || !noReveal);
          var exhausted = !committed && tries >= 2 && !!grade && !grade.correct;
          var newItem = function() { updMany({ limitMode: 'practice', limitSeed: Math.floor(Math.random() * 2147483000) + 1, limitBand: band, limitPred: { kind: '', value: '' }, limitLastPred: null, limitCommitted: false, limitTries: 0, limitHintRung: 0 }); };
          var commit = function() {
            if (!probe || !pred.kind || (pred.kind === 'number' && !finiteCoord(parseFloat(pred.value))) || exhausted) return;
            var g = calcGradeLimit(probe, pred), t2 = tries + 1;
            updMany({ limitTries: t2, limitLastPred: pred, limitCommitted: g.correct });
            if (g.correct) {
              if (lmode === 'practice' && seed) awardOnce('lim:' + seed, 3, __alloT('stem.calculus.xp_limit', 'Predicted a limit'));
              say(__alloT('stem.calculus.sr_limit_ok', 'Correct. The tables are now shown.'));
            } else say(fillT(t2 >= 2 ? __alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.') : __alloT('stem.calculus.sr_limit_try', 'Not yet. {msg} One more try.'), { msg: limitMisText(g.mis) }));
          };
          var rungs = [
            __alloT('stem.calculus.lhint_1', 'Try substituting x = a. A number means continuous. 0/0 means simplify first (factor and cancel). Something/0 means an asymptote.'),
            __alloT('stem.calculus.lhint_2', 'Imagine x a little less than a, then a little more. Do the outputs head to the same place?'),
            __alloT('stem.calculus.lhint_3', 'If the outputs grow without bound, check the sign on each side: the same sign gives \u00B1\u221E, opposite signs mean the limit does not exist.')
          ];
          var rung = Math.max(0, Math.min(3, finiteNum(d.limitHintRung, 0)));
          var fmtV = function(v) { return finiteCoord(v) ? (Math.abs(v) >= 1e5 ? v.toExponential(3) : String(Math.round(v * 1e6) / 1e6)) : __alloT('stem.calculus.undefined_short', 'undefined'); };
          var limGraph = function() {
            if (!fnL || !fnL.ok) return null;
            var m = buildGraphModel(fnL.f, function(x) { return NaN; }, aL - 2, aL + 2, 4, 'midpoint', aL, 0.5, true);
            var Lv = probe && typeof probe.limit === 'number' ? probe.limit : null;
            return h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', className: 'w-full bg-white rounded-xl border-2 border-teal-300', style: { maxHeight: 260 },
                'aria-label': fillT(__alloT('stem.calculus.lim_graph_label', 'Graph of f(x) = {f} near x = {a}. {kind}'), { f: labelL, a: aL, kind: probe ? limitKindText(probe.kind) + '.' : '' }) },
              h('line', { x1: pad, y1: m.toSY(0), x2: W - pad, y2: m.toSY(0), stroke: '#64748b', strokeWidth: 1.5 }),
              h('line', { x1: m.toSX(aL), y1: pad, x2: m.toSX(aL), y2: H - pad, stroke: '#0f766e', strokeWidth: 1, strokeDasharray: '4 3' }),
              m.segs.map(function(seg, si) { return h('polyline', { key: si, points: seg.join(' '), fill: 'none', stroke: isContrast ? '#ffff00' : '#1e293b', strokeWidth: 2.5 }); }),
              Lv !== null && h('circle', { cx: m.toSX(aL), cy: m.toSY(Lv), r: 6, fill: 'white', stroke: '#0f766e', strokeWidth: 2.5 }),
              probe && probe.value !== null && h('circle', { cx: m.toSX(aL), cy: m.toSY(probe.value), r: 5, fill: '#0f766e' }),
              h('text', { x: W / 2, y: H - 6, textAnchor: 'middle', fill: isContrast ? '#ffff00' : '#475569', style: { fontSize: '10px', fontWeight: 'bold' } }, 'f(x) = ' + labelL));
          };
          var table = function(side, data) {
            return h('div', { tabIndex: 0, role: 'region', 'aria-label': side, className: 'overflow-x-auto' },
              h('table', { className: 'text-xs text-teal-950 border-collapse' },
                h('caption', { className: 'text-left font-bold' }, side),
                h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-3' }, 'x'), h('th', { scope: 'col', className: 'text-left' }, 'f(x)'))),
                h('tbody', null, data.values.map(function(r, i) { return h('tr', { key: i, className: 'border-t border-teal-200' }, h('td', { className: 'pr-3 font-mono' }, String(Math.round(r.x * 1e6) / 1e6)), h('td', { className: 'font-mono' }, fmtV(r.y))); }))));
          };
          var answerText = !probe ? '' : probe.limit === '+inf' ? '+\u221E' : probe.limit === '-inf' ? '\u2212\u221E' : typeof probe.limit === 'number' ? calcFmtNum(probe.limit) : __alloT('stem.calculus.lim_dne', 'does not exist');
          return h('div', { key: 'limits', 'data-calc-limits': lmode },
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3', role: 'group', 'aria-label': __alloT('stem.calculus.lim_mode', 'Limits mode') },
              [['practice', __alloT('stem.calculus.lim_mode_practice', 'Practice problems')], ['explore', __alloT('stem.calculus.lim_mode_explore', 'Explore my own function')]].map(function(o) {
                return h('button', { key: o[0], type: 'button', 'aria-pressed': lmode === o[0], onClick: function() { if (o[0] === 'practice' && !seed) newItem(); else updMany({ limitMode: o[0], limitPred: { kind: '', value: '' }, limitLastPred: null, limitCommitted: false, limitTries: 0 }); },
                  className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold border ' + (lmode === o[0] ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-teal-900 border-teal-600 hover:bg-teal-50') }, o[1]);
              }),
              lmode === 'practice' && h('button', { type: 'button', onClick: newItem, 'data-calc-start': 'limits', className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-teal-900 border border-teal-600 hover:bg-teal-50' }, seed ? __alloT('stem.calculus.lim_new', 'New limit') : __alloT('stem.calculus.lim_start', 'Start'))
            ),
            lmode === 'explore' && functionBox('limits'),
            lmode === 'explore' && h('div', { className: 'mb-3 flex items-center gap-2 flex-wrap' },
              h('label', { htmlFor: 'calc-lim-a', className: 'text-xs font-bold text-teal-900' }, __alloT('stem.calculus.lim_a', 'Approach x = a, where a =')),
              h('input', { id: 'calc-lim-a', type: 'number', step: 'any', value: d.limitA == null ? 1 : d.limitA, onChange: function(e) { updMany({ limitA: parseFloat(e.target.value), limitCommitted: false, limitTries: 0, limitLastPred: null }); }, className: 'w-24 px-2 py-1 border-2 border-teal-600 rounded font-mono', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } })),
            !probe && lmode === 'practice' && h('p', { className: 'text-sm text-teal-900' }, __alloT('stem.calculus.lim_intro', 'Press Start for a limit problem. Predict first; the graph and the tables appear after you commit.')),
            probe && h('div', { className: 'rounded-xl border-2 border-teal-300 bg-teal-50 p-3' },
              h('p', { className: 'text-sm font-bold text-teal-950', id: 'calc-lim-q' }, fillT(__alloT('stem.calculus.lim_question', 'Find the limit of f(x) = {f} as x \u2192 {a}.'), { f: labelL, a: aL })),
              !revealed && !exhausted && h('div', { className: 'mt-2', role: 'radiogroup', 'aria-labelledby': 'calc-lim-q' },
                [['number', __alloT('stem.calculus.lim_pick_number', 'A number:')], ['+inf', '+\u221E'], ['-inf', '\u2212\u221E'], ['dne', __alloT('stem.calculus.lim_pick_dne', 'Does not exist')]].map(function(o) {
                  var triedThis = d.limitLastPred && d.limitLastPred.kind === o[0] && o[0] !== 'number' && tries > 0;
                  return h('label', { key: o[0], className: 'mr-3 inline-flex items-center gap-1 text-xs text-teal-950 min-h-[32px]' },
                    h('input', { type: 'radio', name: 'calc-lim-pred', checked: pred.kind === o[0], disabled: triedThis, onChange: function() { upd('limitPred', { kind: o[0], value: pred.value }); } }), o[1],
                    o[0] === 'number' && h('input', { type: 'number', step: 'any', 'aria-label': __alloT('stem.calculus.lim_value', 'Predicted limit value'), value: pred.value, onChange: function(e) { upd('limitPred', { kind: 'number', value: e.target.value }); }, className: 'ml-1 w-24 px-2 py-1 border border-teal-600 rounded font-mono', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } }));
                }),
                h('button', { type: 'button', disabled: !pred.kind || (pred.kind === 'number' && !finiteCoord(parseFloat(pred.value))), onClick: commit, className: 'ml-1 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white disabled:opacity-50' }, __alloT('stem.calculus.lim_commit', 'Commit my prediction'))
              ),
              tries > 0 && grade && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (grade.correct ? 'text-emerald-800' : 'text-red-800') },
                grade.correct ? '\u2705 ' + fillT(__alloT('stem.calculus.lim_correct', 'Correct: the limit is {v}.'), { v: answerText })
                  : (revealed ? (showAnswer ? '\u274C ' + fillT(__alloT('stem.calculus.lim_reveal', 'The limit is {v}.'), { v: answerText }) + ' ' : '\u274C ' + __alloT('stem.calculus.lim_no_reveal', 'Try a new limit, or ask your teacher.') + ' ') : exhausted ? '\u274C ' + __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ' : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ') + limitMisText(grade.mis)),
              exhausted && h('div', { className: 'text-teal-950' }, revealOffer(function() { upd('limitCommitted', true); }, { onNew: lmode === 'practice' ? newItem : null, newLabel: __alloT('stem.calculus.lim_new', 'New limit') })),
              !revealed && !exhausted && hintBlock(rungs, rung, function(n) { upd('limitHintRung', n); }),
              revealed && h('div', { className: 'mt-3 space-y-2' },
                showAnswer && h('p', { className: 'text-xs text-teal-950' }, fillT(__alloT('stem.calculus.lim_kind', 'At x = {a} this function has {kind}.'), { a: aL, kind: limitKindText(probe.kind) }) + ' ' + (probe.value === null ? fillT(__alloT('stem.calculus.lim_fa_undef', 'f({a}) itself is undefined.'), { a: aL }) : fillT(__alloT('stem.calculus.lim_fa', 'f({a}) = {v}.'), { a: aL, v: calcFmtNum(probe.value) }))),
                limGraph(),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                  table(fillT(__alloT('stem.calculus.lim_left', 'From the left (x < {a})'), { a: aL }), probe.left),
                  table(fillT(__alloT('stem.calculus.lim_right', 'From the right (x > {a})'), { a: aL }), probe.right)),
                lmode === 'practice' && h('button', { type: 'button', onClick: newItem, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white' }, __alloT('stem.calculus.lim_next', 'Next limit') + ' \u2192')
              )
            )
          );
        }

        // ══ Stage B: misconceptions for improper integrals, Euler, series, missions and free response ══
        function stageBMis(key) {
          var M = {
            improper_value: __alloT('stem.calculus.bmis_improper_value', 'It does converge, but not to that value. Write it as a limit: integrate up to t, then let t run to the trouble spot.'),
            infinite_length_diverges: __alloT('stem.calculus.bmis_infinite_length', 'An infinitely long region can still have a finite area, when f shrinks fast enough. 1/x\u00B2 shrinks faster than 1/x, and its area out to infinity is finite.'),
            blowup_diverges: __alloT('stem.calculus.bmis_blowup', 'f is unbounded near the trouble spot, but the area can still be finite when f blows up slowly enough. 1/\u221Ax and ln x blow up more slowly than 1/x.'),
            cancel_infinities: __alloT('stem.calculus.bmis_cancel', '\u221E \u2212 \u221E is not 0. Each piece of an improper integral must converge on its own; here the pieces diverge, so they cannot cancel.'),
            terms_to_zero_integral: __alloT('stem.calculus.bmis_terms_zero_integral', 'f \u2192 0 is not enough. 1/x \u2192 0, yet its area from 1 to t is ln t, which grows without bound.'),
            improper_diverges: __alloT('stem.calculus.bmis_improper_diverges', 'This one diverges: the values in the limit table never settle. Compare f with 1/x near the trouble spot.'),
            euler_second_order: __alloT('stem.calculus.bmis_euler_second', 'Euler\u2019s method is first order: halving h roughly halves the error. Errors that drop to a quarter belong to second-order methods such as the trapezoid rule.'),
            euler_step_irrelevant: __alloT('stem.calculus.bmis_euler_same', 'Smaller steps follow the curve more closely, so the error does shrink when h shrinks.'),
            euler_more_steps_worse: __alloT('stem.calculus.bmis_euler_double', 'More steps do not pile up more error here: each step\u2019s error shrinks like h\u00B2, so twice as many steps still give about half the total error.'),
            euler_first_order: __alloT('stem.calculus.bmis_euler_first', 'Compare the errors in the table: each halving of h about halves the error.'),
            terms_zero_converges: __alloT('stem.calculus.bmis_terms_zero', 'Terms going to 0 is needed, but it is not enough. The harmonic series 1 + 1/2 + 1/3 + \u2026 has terms that go to 0, yet its partial sums grow past every number (about ln N).'),
            nth_term_nonzero: __alloT('stem.calculus.bmis_nth_term', 'The terms do not go to 0, so adding them can never settle on a total: the series diverges by the nth-term test.'),
            p_series_rule: __alloT('stem.calculus.bmis_p_series', 'p-series rule: \u03A3 1/n\u1D56 converges exactly when p > 1. Here p is above 1.'),
            geometric_rule: __alloT('stem.calculus.bmis_geometric', 'Geometric rule: \u03A3 r\u207F converges exactly when |r| < 1. Here |r| is below 1.'),
            alternating_converges: __alloT('stem.calculus.bmis_alternating', 'Alternating series test: when the terms alternate in sign and shrink steadily to 0, the series converges, even if the series of absolute values diverges.'),
            telescoping_converges: __alloT('stem.calculus.bmis_telescoping', '1/(n(n + 1)) = 1/n \u2212 1/(n + 1), so the partial sums telescope to 1 \u2212 1/(N + 1), which approaches 1.'),
            ratio_lt1_converges: __alloT('stem.calculus.bmis_ratio_lt1', 'The ratio test gives L < 1 here, so the terms eventually shrink faster than a geometric series: it converges.'),
            divergence_test_silent: __alloT('stem.calculus.bmis_divergence_silent', 'When the terms go to 0 the nth-term test says nothing. It can prove divergence, never convergence.'),
            ratio_one_inconclusive: __alloT('stem.calculus.bmis_ratio_one', 'Here the ratio test gives L = 1, which decides nothing: \u03A3 1/n and \u03A3 1/n\u00B2 both give L = 1, yet one diverges and the other converges.'),
            test_does_decide: __alloT('stem.calculus.bmis_test_decides', 'A test you named settles this one, or a simpler one does. Check the terms first, then the ratio.'),
            linear_ladder: __alloT('stem.calculus.bmis_linear_ladder', 'The ladder, wall and ground form a right triangle: Pythagoras links x and y, not a sum.'),
            square_hyp: __alloT('stem.calculus.bmis_square_hyp', 'Square the ladder\u2019s length too: x\u00B2 + y\u00B2 = L\u00B2.'),
            substitute_too_early: __alloT('stem.calculus.bmis_substitute_early', 'That quantity has this value only at this instant; it keeps changing. Treating it as a constant makes its rate 0. Differentiate first, then substitute the numbers.'),
            no_chain_time: __alloT('stem.calculus.bmis_no_chain_time', 'Each quantity is a function of time, so the chain rule applies: d/dt[x\u00B2] = 2x\u00B7dx/dt, not 2x.'),
            constant_not_zero: __alloT('stem.calculus.bmis_constant_not_zero', 'The ladder\u2019s length does not change, so the derivative of L\u00B2 is 0.'),
            leg_difference: __alloT('stem.calculus.bmis_leg_difference', 'Use Pythagoras: y = \u221A(L\u00B2 \u2212 x\u00B2), not L \u2212 x.'),
            pythag_add: __alloT('stem.calculus.bmis_pythag_add', 'The ladder is the hypotenuse, so subtract: y\u00B2 = L\u00B2 \u2212 x\u00B2.'),
            pythag_instant: __alloT('stem.calculus.bmis_pythag_instant', 'Put x into x\u00B2 + y\u00B2 = L\u00B2 and solve for y.'),
            rate_sign: __alloT('stem.calculus.bmis_rate_sign', 'The top slides DOWN the wall, so y is decreasing: dy/dt must be negative.'),
            rates_equal: __alloT('stem.calculus.bmis_rates_equal', 'The two ends do not move at the same speed: their rates are linked through x and y.'),
            ratio_flipped: __alloT('stem.calculus.bmis_ratio_flipped', 'Solve for dy/dt carefully: 2x\u00B7dx/dt + 2y\u00B7dy/dt = 0 gives dy/dt = \u2212(x/y)\u00B7dx/dt.'),
            solve_rate: __alloT('stem.calculus.bmis_solve_rate', 'Substitute x, y and dx/dt into the differentiated equation, then solve for dy/dt.'),
            radius_constant: __alloT('stem.calculus.bmis_radius_constant', 'The radius of the WATER surface grows as the water rises: r is a quantity that varies, not the tank\u2019s fixed radius. Replace r using similar triangles before you differentiate.'),
            similar_flipped: __alloT('stem.calculus.bmis_similar_flipped', 'Similar triangles: r/h = R/H, so r = (R/H)\u00B7h. Check it at the top: when h = H, r should be R.'),
            cylinder_formula: __alloT('stem.calculus.bmis_cylinder', 'That is a cylinder\u2019s volume. A cone holds one third of it: V = (1/3)\u03C0r\u00B2h.'),
            forgot_square: __alloT('stem.calculus.bmis_forgot_square', 'Check the power of h: dV/dt has h\u00B2, so divide by h\u00B2, not h.'),
            rate_sign_fill: __alloT('stem.calculus.bmis_rate_sign_fill', 'Water is pumped IN, so the level rises: dh/dt is positive.'),
            cut_once: __alloT('stem.calculus.bmis_cut_once', 'A square is cut from EVERY corner, so each side loses 2x: the base is (a \u2212 2x) by (b \u2212 2x).'),
            area_not_volume: __alloT('stem.calculus.bmis_area_not_volume', 'That is the area of the base. Volume = base area \u00D7 height, and the height is x.'),
            surface_not_volume: __alloT('stem.calculus.bmis_surface', 'That is the cardboard left after cutting, an area. The question asks for the volume the box holds.'),
            box_model: __alloT('stem.calculus.bmis_box_model', 'Picture the folded box: its height is x and its base is what remains of each side after two cuts.'),
            domain_full_side: __alloT('stem.calculus.bmis_domain_full', 'Two cuts come off each side, so x must be less than HALF of the shorter side.'),
            no_upper_bound: __alloT('stem.calculus.bmis_no_upper', 'x cannot be as big as you like: the cuts would use up the whole sheet. Find the upper limit.'),
            domain_long_side: __alloT('stem.calculus.bmis_domain_long', 'The SHORTER side runs out first, so it sets the upper limit for x.'),
            product_rule: __alloT('stem.calculus.bmis_product_rule', 'The derivative of a product is not the product of the derivatives. Expand V first, or use the product rule.'),
            not_differentiated: __alloT('stem.calculus.bmis_not_differentiated', 'That is V(x) itself. Differentiate it to get V\u2032(x).'),
            deriv_term_dropped: __alloT('stem.calculus.bmis_term_dropped', 'Expand V(x) fully: the x term of V gives a constant in V\u2032(x), and it must stay.'),
            deriv_mismatch: __alloT('stem.calculus.bmis_deriv_mismatch', 'Not V\u2032(x) yet. Expand V(x) into powers of x, then use the power rule on each term.'),
            root_outside_domain: __alloT('stem.calculus.bmis_root_outside', 'That root is outside the domain: it would make a side of the base negative. Keep the root that makes a real box.'),
            solve_quadratic: __alloT('stem.calculus.bmis_solve_quadratic', 'Set V\u2032(x) = 0 and use the quadratic formula; then keep the root inside the domain.'),
            derivative_value: __alloT('stem.calculus.bmis_derivative_value', 'V\u2032 = 0 shows WHERE the maximum is. The maximum volume is V at that x.'),
            evaluate_v: __alloT('stem.calculus.bmis_evaluate_v', 'Put your critical x into V(x) = x(a \u2212 2x)(b \u2212 2x).'),
            critical_not_max: __alloT('stem.calculus.bmis_critical_not_max', 'V\u2032 = 0 only marks a candidate: it could be a minimum, or neither. A maximum needs V\u2032 to change from positive to negative (or V\u2033 < 0).'),
            positive_not_max: __alloT('stem.calculus.bmis_positive_not_max', 'Many x give a positive volume. A maximum needs a reason about V\u2032 or V\u2033.'),
            arithmetic_step: __alloT('stem.calculus.bmis_arithmetic', 'Not that value. Redo the arithmetic for this step one piece at a time.'),
            expr_mismatch: __alloT('stem.calculus.bmis_expr_mismatch', 'That formula gives different values from the model. Check each factor.'),
            velocity_not_accel: __alloT('stem.calculus.bmis_velocity_not_accel', 'That is the velocity. Acceleration is its derivative: a(t) = v\u2032(t).'),
            accel_derivative: __alloT('stem.calculus.bmis_accel_derivative', 'Differentiate v(t) to get a(t), then substitute the time.'),
            accel_zero_turn: __alloT('stem.calculus.bmis_accel_zero', 'a(t) = 0 marks where the SPEED stops changing direction, not the particle. The particle turns where v(t) changes sign.'),
            start_not_turn: __alloT('stem.calculus.bmis_start_not_turn', 'The start time is not a change of direction. Look for times where v changes sign.'),
            missed_a_root: __alloT('stem.calculus.bmis_missed_root', 'You have some of them. Find every solution of v(t) = 0 (or f\u2032(x) = 0) in the interval.'),
            zero_not_enough: __alloT('stem.calculus.bmis_zero_not_enough', 'Being 0 is not enough for the point: the rate must CHANGE SIGN there. AP graders look for the sign change.'),
            distance_vs_displacement: __alloT('stem.calculus.bmis_dist_vs_disp', 'That is the total distance. Displacement lets backward motion cancel: it is \u222B v(t) dt.'),
            displacement_vs_distance: __alloT('stem.calculus.bmis_disp_vs_dist', 'That is the displacement. Total distance adds the size of every leg: \u222B |v(t)| dt, split where v changes sign.'),
            displacement_integral: __alloT('stem.calculus.bmis_disp_integral', 'Displacement is \u222B v(t) dt over the interval: find an antiderivative and subtract.'),
            distance_integral: __alloT('stem.calculus.bmis_dist_integral', 'Split the interval where v changes sign, integrate each piece, and add the absolute values.'),
            inflection_vs_critical: __alloT('stem.calculus.bmis_inflection', 'That is a critical point, where f\u2032 = 0. An inflection point is where f\u2033 changes sign: the concavity flips.'),
            max_min_swap: __alloT('stem.calculus.bmis_max_min_swap', 'That is the relative MINIMUM: f\u2032 changes from negative to positive there.'),
            relmax_where: __alloT('stem.calculus.bmis_relmax_where', 'Find where f\u2032 changes from positive to negative.'),
            second_deriv_sign: __alloT('stem.calculus.bmis_second_deriv', 'f\u2033 > 0 means concave up, which marks a minimum, not a maximum.'),
            inflection_where: __alloT('stem.calculus.bmis_inflection_where', 'Find f\u2033(x), set it to 0 and check that it changes sign.'),
            forgot_endpoints: __alloT('stem.calculus.bmis_endpoints', 'On a closed interval, check the endpoints too: the candidates are f at the critical points AND at both ends.'),
            location_vs_value: __alloT('stem.calculus.bmis_location_value', 'That is WHERE the maximum happens. The question asks for the maximum VALUE of f.'),
            candidates_test: __alloT('stem.calculus.bmis_candidates', 'Make a table of f at each critical point and at both endpoints; the largest value wins.'),
            gave_f_not_g: __alloT('stem.calculus.bmis_f_not_g', 'That is f at that point, the height of the integrand. g adds up the signed AREA from 0 to x.'),
            accum_area: __alloT('stem.calculus.bmis_accum_area', 'g(x) is the signed area under f from 0 to x: find an antiderivative of f, or add up the geometric areas.'),
            ftc_derivative: __alloT('stem.calculus.bmis_ftc', 'By the Fundamental Theorem, g\u2032(x) = f(x): read the integrand at x, no integration needed.'),
            differentiated_f: __alloT('stem.calculus.bmis_differentiated_f', 'That is f\u2032. The Fundamental Theorem gives g\u2032 = f itself.'),
            endpoint_not_max: __alloT('stem.calculus.bmis_endpoint_not_max', 'Compare g at the critical point with g at both ends: g keeps growing while f > 0 and shrinks once f < 0.'),
            accum_max: __alloT('stem.calculus.bmis_accum_max', 'g grows while f is positive and shrinks while f is negative. Where does f change from positive to negative?'),
            g_zero_not_max: __alloT('stem.calculus.bmis_g_zero', 'g being 0 says nothing about a maximum. Use the sign of g\u2032 = f.'),
            tangent_no_slope: __alloT('stem.calculus.bmis_tangent_no_slope', 'The tangent line adds the slope times the step: g(a) + g\u2032(a)(x \u2212 a).'),
            tangent_exact_value: __alloT('stem.calculus.bmis_tangent_exact', 'That is the exact value. The question asks for the tangent-line APPROXIMATION g(a) + g\u2032(a)(x \u2212 a).'),
            tangent_line: __alloT('stem.calculus.bmis_tangent_line', 'Use L(x) = g(a) + g\u2032(a)(x \u2212 a), with g\u2032(a) = f(a).'),
            radius_inverted: __alloT('stem.calculus.bmis_radius_inverted', 'The ratio test gives |x|/b < 1, so |x| < b: the radius is b, not 1/b.'),
            ratio_radius: __alloT('stem.calculus.bmis_ratio_radius', 'Take |a(n+1)/a(n)|, let n \u2192 \u221E, and solve the result < 1 for |x|.'),
            endpoints_check: __alloT('stem.calculus.bmis_endpoints_check', 'The ratio test says nothing at the endpoints. Test x = \u2212b and x = b separately.'),
            endpoints_swapped: __alloT('stem.calculus.bmis_endpoints_swapped', 'Check which endpoint gives the harmonic series (diverges) and which the alternating harmonic series (converges).'),
            forgot_n: __alloT('stem.calculus.bmis_forgot_n', 'Each term is divided by n as well as by b\u207F.'),
            partial_sum_terms: __alloT('stem.calculus.bmis_partial_sum', 'Write out the terms for n = 1, 2 and 3 at x = 1, then add them.'),
            position_not_velocity: __alloT('stem.calculus.bmis_position_not_velocity', 'Where the particle IS does not decide its direction. Direction changes when the velocity v(t) changes sign.'),
            sign_pattern: __alloT('stem.calculus.bmis_sign_pattern', 'Test the sign of v(t) with a time in each piece, for example t = 0 and a time between the two zeros.'),
            stop_not_turn: __alloT('stem.calculus.bmis_stop_not_turn', 'If v(t) changes sign, the particle does not just stop: it moves the other way afterwards.'),
            speed_not_direction: __alloT('stem.calculus.bmis_speed_not_direction', 'At those times v(t) = 0, so the speed is 0, the slowest possible, not the fastest.'),
            evt_not_relative: __alloT('stem.calculus.bmis_evt_relative', 'The Extreme Value Theorem promises an ABSOLUTE maximum on a closed interval somewhere; it does not show that this point is a relative maximum.'),
            mvt_not_extremum: __alloT('stem.calculus.bmis_mvt', 'The Mean Value Theorem finds a point where the slope equals the average rate of change. It says nothing about a maximum.'),
            test_condition_mismatch: __alloT('stem.calculus.bmis_test_condition', 'That condition belongs to a different test. The First Derivative Test uses the sign change of the derivative; the Second Derivative Test uses f′ = 0 with the sign of f″; the Candidates Test compares values.'),
            relative_not_absolute: __alloT('stem.calculus.bmis_relative_absolute', 'A sign change of f′ shows a RELATIVE maximum. An absolute maximum on a closed interval needs the endpoints compared too.'),
            sdt_relative_only: __alloT('stem.calculus.bmis_sdt_relative', 'The Second Derivative Test only shows a RELATIVE maximum. For the absolute maximum on a closed interval, compare with the endpoints, or use the sign of g′ at the only critical point.'),
            hyp_not_condition: __alloT('stem.calculus.bmis_hyp', 'That may be true, but it is not what the test needs. The Candidates Test needs g continuous on the closed interval.'),
            substitute_x: __alloT('stem.calculus.bmis_substitute_x', 'Substitute x = b into xⁿ/(n·bⁿ): the bⁿ cancels, leaving 1/n.'),
            not_alternating: __alloT('stem.calculus.bmis_not_alternating', 'At x = b every term is positive, so the alternating series test does not apply.')
          };
          return M[key] || null;
        }
        function bumpSolved(kind) {
          setLabToolData(function(prev) {
            var pc = prev.calculus || {}, solved = Object.assign({}, pc.calcSolved && typeof pc.calcSolved === 'object' ? pc.calcSolved : {});
            solved[kind] = (solved[kind] || 0) + 1;
            return Object.assign({}, prev, { calculus: Object.assign({}, pc, { calcSolved: solved }) });
          });
        }
        function logMissed(mode, question, chosen, answer, mis) {
          setLabToolData(function(prev) {
            var pc = prev.calculus || {}, missed = Array.isArray(pc.calcMissed) ? pc.calcMissed.slice(-39) : [];
            missed.push({ mode: mode, band: band, question: String(question), chosen: String(chosen), answer: String(answer), mis: mis || '', at: Date.now() });
            return Object.assign({}, prev, { calculus: Object.assign({}, pc, { calcMissed: missed }) });
          });
        }
        var solvedOf = function(kind) { return d.calcSolved && typeof d.calcSolved === 'object' ? finiteNum(d.calcSolved[kind], 0) : 0; };
        var fmtN = function(v) {
          if (v === null || v === undefined || (typeof v === 'number' && v !== v)) return '\u2014';
          if (v === Infinity) return '\u221E';
          if (v === -Infinity) return '\u2212\u221E';
          if (v !== 0 && (Math.abs(v) >= 1e7 || Math.abs(v) < 1e-4)) { var e = Number(v.toPrecision(4)).toExponential(); return e.charAt(0) === '-' ? '\u2212' + e.slice(1) : e; }
          return calcFmtNum(v);
        };
        var inputStyle = { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' };
        // "e^2x" reads as e²·x: say so, and offer the bracketed form.
        function ambiguityNote(compiled, onFix) {
          if (!compiled || !compiled.ok || !compiled.warnings || !compiled.warnings.length) return null;
          var w = compiled.warnings[0], fixText = w.suggestion.trim();
          return h('div', { className: 'mt-1 flex flex-wrap items-center gap-2 rounded-lg border-2 border-amber-600 bg-amber-50 p-2 text-xs text-amber-950', 'data-calc-ambiguity': fixText },
            h('p', { className: 'min-w-0 flex-1' }, fillT(__alloT('stem.calculus.amb_power', 'Careful: this is read as {read}, with only the number in the exponent. To put more in the exponent, use brackets, such as {fix}.'), { read: compiled.label, fix: fixText })),
            h('button', { type: 'button', onClick: function() { onFix(fixText); say(fillT(__alloT('stem.calculus.sr_amb_fixed', 'Changed to {fix}.'), { fix: fixText })); },
              className: 'min-h-[32px] px-3 py-1 rounded-lg bg-amber-700 text-white font-bold' }, fillT(__alloT('stem.calculus.amb_use', 'Use {fix}'), { fix: fixText })));
        }
        // A small radio group: [{ id, label }] with a shared name; tried ids are disabled.
        function radioGroup(name, labelledBy, options, value, onPick, disabledIds, cls) {
          return h('div', { role: 'radiogroup', 'aria-labelledby': labelledBy, className: 'flex flex-wrap gap-x-4 gap-y-1 mt-1' },
            options.map(function(o) {
              return h('label', { key: o.id, className: 'inline-flex items-center gap-1.5 text-xs min-h-[32px] ' + (cls || '') },
                h('input', { type: 'radio', name: name, checked: value === o.id, disabled: !!(disabledIds && disabledIds.indexOf(o.id) >= 0), onChange: function() { onPick(o.id); } }), o.label);
            }));
        }
        // One hint-ladder look on every tab: rungs open one at a time, none holds the answer.
        function hintBlock(rungs, rung, onMore, cls, extra) {
          if (!rungs || !rungs.length) return null;
          rung = Math.max(0, Math.min(rungs.length, rung || 0));
          return h('div', { className: 'mt-2 rounded-lg border border-amber-400 bg-amber-50 p-2 text-amber-950', 'data-calc-hints': rung + '/' + rungs.length },
            rung > 0 && h('ol', { className: 'list-decimal pl-5 text-xs space-y-0.5' }, rungs.slice(0, rung).map(function(t2, i) { return h('li', { key: i }, t2); })),
            h('div', { className: 'flex flex-wrap gap-2' },
              rung < rungs.length && h('button', { type: 'button', onClick: function() { onMore(rung + 1); say(rungs[rung]); }, className: 'mt-1 min-h-[32px] px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-white text-amber-900 border border-amber-600' },
                '💡 ' + fillT(__alloT('stem.calculus.hint_button_n', 'Hint {n} of {m}'), { n: rung + 1, m: rungs.length })),
              extra || null));
        }
        // Two tries, then the answer is OFFERED, never forced. A reveal earns no credit; with the
        // teacher's no-reveal setting there is no answer, only a way on (moveOn) or a new item.
        function revealOffer(onReveal, opts) {
          opts = opts || {};
          var canPress = !noReveal || !!opts.moveOn;
          return h('div', { className: 'mt-2 flex flex-wrap items-center gap-2', 'data-calc-reveal-offer': noReveal ? 'teacher' : 'offer' },
            h('p', { className: 'text-xs font-semibold' }, noReveal ? __alloT('stem.calculus.ro_teacher', 'Both tries are used. Try a new one, or ask your teacher.') : __alloT('stem.calculus.ro_offer', 'Both tries are used. You can see the answer now; it earns no credit.')),
            canPress && h('button', { type: 'button', onClick: function() { onReveal(); say(noReveal ? __alloT('stem.calculus.sr_ro_moved', 'Moved on. This part earns no credit.') : __alloT('stem.calculus.sr_ro_shown', 'The answer is shown. It earns no credit.')); },
              className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white' },
              noReveal ? __alloT('stem.calculus.ro_move_on', 'Move on (no credit)') : __alloT('stem.calculus.ro_show', 'Show the answer (no credit)')),
            opts.onNew && h('button', { type: 'button', onClick: opts.onNew, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 border border-slate-600' }, opts.newLabel || __alloT('stem.calculus.ro_new', 'Try a new one')));
        }

        // ── IMPROPER INTEGRALS (Integral tab): predict, then read the limit table ──
        var IMP_PRESETS = [
          { f: 'ln(x)', a: '0', b: '1' }, { f: '1/x^2', a: '1', b: 'inf' }, { f: '1/x', a: '1', b: 'inf' }, { f: '1/sqrt(x)', a: '0', b: '1' },
          { f: '1/x^2', a: '0', b: '1' }, { f: 'e^(-x)', a: '0', b: 'inf' }, { f: '1/x', a: '-1', b: '1' }, { f: '1/(1 + x^2)', a: '-inf', b: 'inf' },
          { f: 'x^(-1/3)', a: '-1', b: '8' }, { f: 'sin(x)', a: '0', b: 'inf' }
        ];
        var boundText = function(v) { return v === Infinity ? '\u221E' : v === -Infinity ? '\u2212\u221E' : calcFmtNum(v); };
        function improperPanel() {
          var impText = typeof d.impText === 'string' ? d.impText : IMP_PRESETS[0].f;
          var aText = typeof d.impA === 'string' ? d.impA : IMP_PRESETS[0].a, bText = typeof d.impB === 'string' ? d.impB : IMP_PRESETS[0].b;
          var cf = calcCompileText(impText), A = calcNumParse(aText, true), B = calcNumParse(bText, true);
          var ready = cf.ok && A.ok && B.ok;
          var key = ready ? cf.label + '|' + A.value + '|' + B.value : '';
          var res = null;
          if (ready) {
            var cache = window._calcImpCache || (window._calcImpCache = {});
            if (!cache[key]) { if (Object.keys(cache).length > 30) window._calcImpCache = cache = {}; cache[key] = calcImproper(cf.f, A.value, B.value); }
            res = cache[key];
          }
          var live = d.impKey === key;
          var pred = d.impPred && typeof d.impPred === 'object' ? d.impPred : { kind: '', value: '' };
          var tries = live ? finiteNum(d.impTries, 0) : 0;
          var gradable = res && (res.kind === 'converges' || res.kind === 'diverges');
          var grade = live && tries > 0 && gradable ? calcGradeImproper(res, d.impLast || pred, cf.f) : null;
          var revealed = live && !!d.impCommitted;
          var showAnswer = revealed && (!gradable || (grade && grade.correct) || !noReveal);
          var exhausted = !revealed && gradable && tries >= 2 && !!grade && !grade.correct;
          var reset = { impPred: { kind: '', value: '' }, impTries: 0, impCommitted: false, impLast: null, impKey: '' };
          var setInputs = function(patch) { updMany(Object.assign({}, reset, patch)); };
          var fLabel = cf.ok ? cf.label : impText, aL = A.ok ? boundText(A.value) : aText, bL = B.ok ? boundText(B.value) : bText;
          var question = fillT(__alloT('stem.calculus.imp_question', 'Does the integral of f(x) = {f} from {a} to {b} converge or diverge?'), { f: fLabel, a: aL, b: bL });
          var commit = function() {
            if (!res) return;
            if (!gradable) { updMany({ impKey: key, impTries: 1, impCommitted: true, impLast: pred }); say(__alloT('stem.calculus.sr_imp_unclear', 'The limit table is now shown.')); return; }
            if (!pred.kind || (pred.kind === 'conv' && !calcNumParse(pred.value).ok) || exhausted) return;
            var g = calcGradeImproper(res, pred, cf.f), t2 = tries + 1, done = t2 >= 2;
            updMany({ impKey: key, impTries: t2, impLast: pred, impCommitted: g.correct });
            if (g.correct) { if (!calcImpLegacyEarned(paidFlags, cf, res.kind)) awardOnce(calcImpCreditKey(cf, res.kind), 3,__alloT('stem.calculus.xp_improper', 'Decided an improper integral')); bumpSolved('improper'); say(__alloT('stem.calculus.sr_imp_ok', 'Correct. The limit table is now shown.')); }
            else {
              var msg = misconceptionText(g.mis, 'improper');
              if (done) logMissed('improper', question, pred.kind === 'conv' ? pred.value : __alloT('stem.calculus.imp_div_short', 'diverges'), res.kind === 'converges' ? calcFmtNum(res.value) : __alloT('stem.calculus.imp_div_short', 'diverges'), g.mis);
              say(fillT(done ? __alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.') : __alloT('stem.calculus.sr_imp_try', 'Not yet. {msg} One more try.'), { msg: msg }));
            }
          };
          var troubleText = !res || !res.parts ? '' : res.parts.filter(function(pp) { return pp.side !== 'none'; }).map(function(pp) {
            return pp.at === Infinity ? __alloT('stem.calculus.imp_trouble_inf', 'x \u2192 \u221E') : pp.at === -Infinity ? __alloT('stem.calculus.imp_trouble_ninf', 'x \u2192 \u2212\u221E') : fillT(__alloT('stem.calculus.imp_trouble_pt', 'x \u2192 {c} (f blows up or is not defined there)'), { c: calcFmtNum(pp.at) });
          }).filter(function(t2, i, arr) { return arr.indexOf(t2) === i; }).join('; ');
          var rungs = [
            __alloT('stem.calculus.imp_hint_1', 'Replace the trouble spot with a variable t, integrate up to t, then ask what happens as t closes in.'),
            __alloT('stem.calculus.imp_hint_2', 'Compare with 1/x: near the trouble spot, does f blow up faster or slower than 1/x? Out at infinity, does it shrink faster or slower?'),
            __alloT('stem.calculus.imp_hint_3', 'p-test: the integral of 1/x\u1D56 from 1 to \u221E converges only when p > 1; from 0 to 1 it converges only when p < 1.')
          ];
          var partVerdict = function(pp) {
            if (pp.verdict === 'converges') return fillT(__alloT('stem.calculus.imp_part_conv', 'These values settle on {v}: each change is about {r} times the one before, so the changes add up to a finite amount.'), { v: fmtN(Math.round(pp.value * 1e6) / 1e6), r: pp.ratio === null ? '0' : calcFmtNum(Math.round(pp.ratio * 1000) / 1000) });
            if (pp.verdict === 'diverges') return pp.direction === 'osc' ? (typeof pp.swing === 'number' ? fillT(__alloT('stem.calculus.imp_part_osc_window', 'The rows of this table can land on matching points of a swing. Between them the integral keeps rising and falling by about {r}, and the swings do not shrink as t closes in, so this piece diverges.'), { r: calcFmtNum(Math.round(pp.swing * 1000) / 1000) }) : __alloT('stem.calculus.imp_part_osc', 'These values keep swinging and never settle, so this piece diverges.'))
              : fillT(__alloT('stem.calculus.imp_part_div', 'These values grow without bound (toward {dir}): the changes do not shrink, so this piece diverges.'), { dir: pp.direction === '-inf' ? '\u2212\u221E' : '+\u221E' });
            return pp.slow ? __alloT('stem.calculus.imp_part_slow', 'These values creep so slowly that a table cannot pin the value. Try a substitution such as u = ln x.') : __alloT('stem.calculus.imp_part_unclear', 'The table cannot decide this piece: the changes neither shrink steadily nor stay large.');
          };
          var limitTable = function(pp, i) {
            if (pp.side === 'none') return h('p', { key: i, className: 'text-xs' }, fillT(__alloT('stem.calculus.imp_part_proper', 'From {a} to {b} the integral is ordinary: {v}.'), { a: boundText(pp.L), b: boundText(pp.R), v: fmtN(pp.value) }));
            var cap = pp.side === 'lo' ? fillT(__alloT('stem.calculus.imp_table_lo', 'Integral from t to {b}, as t \u2192 {c}'), { b: boundText(pp.R), c: boundText(pp.at) }) : fillT(__alloT('stem.calculus.imp_table_hi', 'Integral from {a} to t, as t \u2192 {c}'), { a: boundText(pp.L), c: boundText(pp.at) });
            return h('div', { key: i, className: 'space-y-1' },
              h('div', { tabIndex: 0, role: 'region', 'aria-label': cap, className: 'overflow-x-auto' },
                h('table', { className: 'text-xs border-collapse', 'data-calc-imp-table': i },
                  h('caption', { className: 'text-left font-bold' }, cap),
                  h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-3' }, 't'), h('th', { scope: 'col', className: 'text-left pr-3' }, __alloT('stem.calculus.imp_col_value', 'Integral up to t')), h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.imp_col_change', 'Change from the row before')))),
                  h('tbody', null, pp.rows.map(function(r, k) { return h('tr', { key: k, className: 'border-t border-violet-200' }, h('td', { className: 'pr-3 font-mono' }, fmtN(r.t)), h('td', { className: 'pr-3 font-mono' }, fmtN(Math.round(r.value * 1e7) / 1e7)), h('td', { className: 'font-mono' }, k ? fmtN(r.value - pp.rows[k - 1].value) : '\u2014')); })))),
              h('p', { className: 'text-xs' }, partVerdict(pp)));
          };
          var overall = !res ? '' : res.kind === 'converges' ? fillT(__alloT('stem.calculus.imp_overall_conv', 'So the integral converges: it equals {v}.'), { v: fmtN(Math.round(res.value * 1e6) / 1e6) })
            : res.kind === 'diverges' ? (res.opposite ? __alloT('stem.calculus.imp_overall_opposite', 'One piece runs to +\u221E and another to \u2212\u221E. \u221E \u2212 \u221E has no value, so the integral diverges: the pieces do not cancel.') : __alloT('stem.calculus.imp_overall_div', 'So the integral diverges: it has no finite value.'))
            : __alloT('stem.calculus.imp_overall_unclear', 'The tables cannot settle this one. Use a comparison or an exact antiderivative instead.');
          // Open by default in BC (improper integrals are BC content), when the integral above is improper, or once used.
          return h('details', { open: band === 'bc' || !exactOk || !exactProper || typeof d.impText === 'string', className: 'mt-4 rounded-xl border-2 border-violet-300 bg-violet-50 p-3 text-violet-950', 'data-calc-improper': res ? res.kind : 'none' },
            h('summary', { id: 'calc-imp-title', className: 'cursor-pointer min-h-[28px] text-sm font-black' }, __alloT('stem.calculus.imp_title', 'Improper integrals: let the bound run to the trouble')),
            h('p', { className: 'text-xs mt-1' }, __alloT('stem.calculus.imp_intro', 'When a bound is infinite, or f blows up inside the interval, integrate up to t and watch the value as t closes in. If the values settle, the integral converges to that limit.')),
            h('div', { className: 'mt-2 flex flex-wrap gap-1.5', role: 'group', 'aria-label': __alloT('stem.calculus.imp_presets', 'Example improper integrals') },
              IMP_PRESETS.map(function(p, i) {
                var on = impText === p.f && aText === p.a && bText === p.b;
                return h('button', { key: i, type: 'button', 'aria-pressed': on, onClick: function() { setInputs({ impText: p.f, impA: p.a, impB: p.b }); },
                  'aria-label': fillT(__alloT('stem.calculus.imp_use_preset', 'Use the integral of {f} from {a} to {b}'), { f: p.f, a: boundText(calcNumParse(p.a, true).value), b: boundText(calcNumParse(p.b, true).value) }),
                  className: 'min-h-[32px] px-2 py-1 rounded-md text-[0.6875rem] font-mono font-bold border ' + (on ? 'bg-violet-700 text-white border-violet-800' : 'bg-white text-violet-950 border-violet-400 hover:bg-violet-100') },
                  '\u222B ' + p.f + ' dx, [' + boundText(calcNumParse(p.a, true).value) + ', ' + boundText(calcNumParse(p.b, true).value) + ']');
              }),
              (!exactOk || !exactProper) && h('button', { type: 'button', onClick: function() { setInputs({ impText: useTyped ? fnText : calcQuadText(fa, fb, fc), impA: String(xMin), impB: String(xMax2) }); },
                className: 'min-h-[32px] px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-amber-100 text-amber-950 border border-amber-600' }, __alloT('stem.calculus.imp_from_above', 'Study the integral above as an improper integral'))
            ),
            h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2' },
              h('label', { className: 'text-xs font-bold sm:col-span-3' }, 'f(x) =',
                h('input', { type: 'text', value: impText, spellCheck: false, autoComplete: 'off', onChange: function(e) { setInputs({ impText: e.target.value }); }, className: 'mt-1 block w-full px-2 py-1.5 rounded border-2 border-violet-500 font-mono text-sm', style: inputStyle })),
              h('label', { className: 'text-xs font-bold' }, __alloT('stem.calculus.imp_from', 'From a ='),
                h('input', { type: 'text', value: aText, spellCheck: false, autoComplete: 'off', onChange: function(e) { setInputs({ impA: e.target.value }); }, className: 'mt-1 block w-full px-2 py-1.5 rounded border-2 border-violet-500 font-mono text-sm', style: inputStyle })),
              h('label', { className: 'text-xs font-bold' }, __alloT('stem.calculus.imp_to', 'to b ='),
                h('input', { type: 'text', value: bText, spellCheck: false, autoComplete: 'off', onChange: function(e) { setInputs({ impB: e.target.value }); }, className: 'mt-1 block w-full px-2 py-1.5 rounded border-2 border-violet-500 font-mono text-sm', style: inputStyle })),
              h('p', { className: 'text-[0.6875rem] sm:col-span-1 self-end' }, __alloT('stem.calculus.imp_bound_help', 'Bounds: a number, pi, inf or -inf.'))
            ),
            ambiguityNote(cf, function(fix) { setInputs({ impText: fix }); }),
            h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-1 text-xs font-bold' },
              !cf.ok ? parseErrorText(cf.error, cf.detail) : !A.ok || !B.ok ? __alloT('stem.calculus.imp_bad_bound', 'Each bound must be a number, pi, inf or -inf.')
                : res.kind === 'proper' ? fillT(__alloT('stem.calculus.imp_proper', 'This integral is not improper: f is defined and bounded on the whole interval, so it is an ordinary definite integral, equal to {v}.'), { v: fmtN(Math.round(res.value * 1e6) / 1e6) })
                : res.kind === 'domain' ? fillT(__alloT('stem.calculus.imp_domain', 'f is not defined on a stretch of this interval (near x = {x}), not just at one point, so this integral is not defined. Choose bounds inside the domain.'), { x: calcFmtNum(res.x) })
                : res.kind === 'too_many' ? __alloT('stem.calculus.imp_too_many', 'f has too many trouble spots here to study one by one. Narrow the interval.')
                : res.kind === 'bounds' ? __alloT('stem.calculus.imp_bad_bound', 'Each bound must be a number, pi, inf or -inf.')
                : fillT(__alloT('stem.calculus.imp_trouble', 'Trouble spots: {list}.'), { list: troubleText || '\u2014' })),
            res && (gradable || res.kind === 'unclear') && h('div', { className: 'mt-2 rounded-lg border border-violet-300 bg-white p-2' },
              h('p', { id: 'calc-imp-q', className: 'text-sm font-bold' }, question),
              !revealed && !exhausted && gradable && radioGroup('calc-imp-pred', 'calc-imp-q', [{ id: 'conv', label: __alloT('stem.calculus.imp_pick_conv', 'Converges, to the value:') }, { id: 'div', label: __alloT('stem.calculus.imp_pick_div', 'Diverges') }], pred.kind,
                function(id) { upd('impPred', { kind: id, value: pred.value }); }, live && tries > 0 && d.impLast && d.impLast.kind === 'div' ? ['div'] : [], 'text-violet-950'),
              !revealed && !exhausted && gradable && pred.kind === 'conv' && h('input', { type: 'text', 'aria-label': __alloT('stem.calculus.imp_value', 'Predicted value of the integral'), value: pred.value, onChange: function(e) { upd('impPred', { kind: 'conv', value: e.target.value }); }, className: 'mt-1 w-32 px-2 py-1 border border-violet-600 rounded font-mono text-sm', style: inputStyle }),
              !revealed && !exhausted && h('button', { type: 'button', onClick: commit, disabled: gradable && (!pred.kind || (pred.kind === 'conv' && !calcNumParse(pred.value).ok)),
                className: 'ml-1 mt-1 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-violet-700 text-white disabled:opacity-50' }, gradable ? __alloT('stem.calculus.imp_commit', 'Commit my prediction') : __alloT('stem.calculus.imp_show', 'Show the limit table')),
              grade && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (grade.correct ? 'text-emerald-800' : 'text-red-800') },
                grade.correct ? '\u2705 ' + __alloT('stem.calculus.imp_correct', 'Correct.')
                  : (revealed ? (showAnswer ? '\u274C ' : '\u274C ' + __alloT('stem.calculus.imp_no_reveal', 'Try another integral, or ask your teacher.') + ' ') : exhausted ? '\u274C ' + __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ' : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ') + misconceptionText(grade.mis, 'improper')),
              exhausted && revealOffer(function() { upd('impCommitted', true); }),
              !revealed && !exhausted && gradable && hintBlock(rungs, Math.max(0, Math.min(3, finiteNum(d.impHintRung, 0))), function(n) { upd('impHintRung', n); }, 'text-violet-950'),
              revealed && showAnswer && h('div', { className: 'mt-2 space-y-2', 'data-calc-imp-revealed': true },
                res.parts.map(limitTable),
                h('p', { className: 'text-sm font-bold' }, overall),
                h('button', { type: 'button', onClick: function() { upd('tab', 'series'); }, className: 'min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold bg-white text-violet-900 border border-violet-600' }, __alloT('stem.calculus.imp_to_series', 'Compare with p-series in the Series tab')))
            )
          );
        }

        // ── EULER'S METHOD (Visualize, slope fields): step along the field, predict how the error shrinks ──
        var EULER_HS = [1, 0.5, 0.25, 0.1];
        function eulerPanel() {
          var odeIdx = Math.round(clampCalculusNumber(d.vizOde, 0, VIZ_ODES.length - 1, 0)), ode = VIZ_ODES[odeIdx];
          var x0 = calcNumOr(d.vizSlopeX, 0), y0 = calcNumOr(d.vizSlopeY, 0), span = 2, xEnd = x0 + span;
          var hStep = EULER_HS.indexOf(d.eulerH) >= 0 ? d.eulerH : 0.5;
          var key = odeIdx + '|' + x0 + '|' + y0, live = d.eulerKey === key;
          var study = calcEulerStudy(odeIdx, x0, y0, span);
          var tries = live ? finiteNum(d.eulerTries, 0) : 0, done = live && !!d.eulerDone;
          var pick = live ? d.eulerPick || '' : '';
          var grade = live && tries > 0 ? calcGradeEuler(study, d.eulerLast || pick) : null;
          var showAnswer = done && (!grade || grade.correct || !noReveal);
          var exhausted = !done && tries >= 2 && !!grade && !grade.correct;
          var truth = calcOdeTruth(odeIdx, x0, y0);
          var pts = calcEuler(ode.df, x0, y0, hStep, Math.round(span / hStep));
          var question = fillT(__alloT('stem.calculus.eul_question', 'Predict: for {ode} from ({x}, {y}), if you halve the step size h, what happens to the error at x = {xe}?'), { ode: ode.name, x: calcFmtNum(x0), y: calcFmtNum(y0), xe: calcFmtNum(xEnd) });
          var opts = [{ id: 'half', label: __alloT('stem.calculus.eul_half', 'It is about halved') }, { id: 'quarter', label: __alloT('stem.calculus.eul_quarter', 'It drops to about a quarter') }, { id: 'same', label: __alloT('stem.calculus.eul_same', 'It stays about the same') }, { id: 'double', label: __alloT('stem.calculus.eul_double', 'It about doubles') }];
          var commit = function() {
            if (!pick || !study.halving || exhausted) return;
            var g = calcGradeEuler(study, pick), t2 = tries + 1, fin2 = t2 >= 2;
            updMany({ eulerKey: key, eulerTries: t2, eulerLast: pick, eulerDone: g.correct });
            // Once per equation: the answer is the same from every seed, so new seeds would farm XP.
            if (g.correct) { awardOnce('eul:' + odeIdx, 3, __alloT('stem.calculus.xp_euler', 'Predicted how Euler\u2019s error shrinks')); bumpSolved('euler'); say(__alloT('stem.calculus.sr_eul_ok', 'Correct. The error table is now shown.')); }
            else {
              if (fin2) logMissed('euler', question, pick, study.halving, g.mis);
              say(fillT(fin2 ? __alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.') : __alloT('stem.calculus.sr_eul_try', 'Not yet. {msg} One more try.'), { msg: misconceptionText(g.mis, 'euler') }));
            }
          };
          // Concavity along the true solution, for the over/under explanation.
          var bend = (function() {
            var s = 0, n = 0, dd = 1e-3;
            for (var i = 1; i < 8; i++) { var xx = x0 + span * i / 8, c2 = (truth.at(xx + dd) - 2 * truth.at(xx) + truth.at(xx - dd)) / (dd * dd); if (calcFinite(c2) && Math.abs(c2) > 1e-6) { s += c2 > 0 ? 1 : -1; n++; } }
            return n >= 6 && Math.abs(s) === n ? (s > 0 ? 'up' : 'down') : null;
          })();
          var rows = pts.slice(0, 41);
          return h('section', { className: 'mb-2 rounded-xl border-2 border-indigo-300 bg-white p-3 text-indigo-950', 'data-calc-euler': study.halving || (study.tiny ? 'tiny' : 'none'), 'aria-labelledby': 'calc-eul-title' },
            h('h3', { id: 'calc-eul-title', className: 'text-sm font-black' }, fillT(__alloT('stem.calculus.eul_title', 'Euler\u2019s method from the seed point ({x}, {y})'), { x: calcFmtNum(x0), y: calcFmtNum(y0) })),
            h('p', { className: 'text-xs mt-1' }, fillT(__alloT('stem.calculus.eul_intro', 'Start at the seed point, follow the slope for a step h, and repeat until x = {xe}. Move the seed with the Seed x and Seed y sliders.'), { xe: calcFmtNum(xEnd) })),
            !ode.exact && h('p', { className: 'text-xs mt-1 font-semibold' }, fillT(__alloT('stem.calculus.eul_no_exact', '{ode} has no solution formula in elementary functions, so the true values come from a reference run with thousands of tiny steps.'), { ode: ode.name })),
            h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
              h('div', { role: 'group', 'aria-label': __alloT('stem.calculus.eul_h', 'Step size h'), className: 'flex flex-wrap items-center gap-1' },
                h('span', { className: 'text-[0.6875rem] font-bold mr-1' }, __alloT('stem.calculus.eul_h', 'Step size h')),
                EULER_HS.map(function(hv) { var on = hv === hStep; return h('button', { key: hv, type: 'button', 'aria-pressed': on, onClick: function() { upd('eulerH', hv); }, className: 'min-h-[32px] min-w-[44px] px-2 py-1 rounded border text-xs font-bold ' + (on ? 'bg-indigo-700 border-indigo-800 text-white' : 'bg-white border-slate-400 text-slate-900') }, calcFmtNum(hv)); })),
              h('button', { type: 'button', 'aria-pressed': !!d.eulerOn, onClick: function() { updMany({ eulerOn: !d.eulerOn, vizUserInteracted: Object.assign({}, d.vizUserInteracted || {}, { ode: true }) }); },
                className: 'min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold border-2 ' + (d.eulerOn ? 'bg-indigo-700 text-white border-indigo-800' : 'bg-white text-indigo-900 border-indigo-600') }, __alloT('stem.calculus.eul_draw', 'Draw the Euler path on the field'))),
            h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.eul_steps', 'Euler steps'), className: 'mt-2 overflow-auto max-h-56' },
              h('table', { className: 'text-xs border-collapse', 'data-calc-euler-steps': rows.length },
                h('caption', { className: 'text-left font-bold' }, fillT(__alloT('stem.calculus.eul_steps_cap', 'Euler steps with h = {h}: y(next) = y + h \u00D7 slope'), { h: calcFmtNum(hStep) })),
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'text-left pr-3' }, 'n'), h('th', { scope: 'col', className: 'text-left pr-3' }, 'x'), h('th', { scope: 'col', className: 'text-left pr-3' }, __alloT('stem.calculus.eul_col_y', 'Euler y')), h('th', { scope: 'col', className: 'text-left pr-3' }, __alloT('stem.calculus.eul_col_slope', 'Slope there')),
                  showAnswer && h('th', { scope: 'col', className: 'text-left pr-3' }, ode.exact ? __alloT('stem.calculus.eul_col_exact', 'Exact y') : __alloT('stem.calculus.eul_col_ref', 'Reference y')),
                  showAnswer && h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.eul_col_err', 'Error')))),
                h('tbody', null, rows.map(function(p, i) {
                  var yt = showAnswer ? truth.at(p.x) : null;
                  return h('tr', { key: i, className: 'border-t border-indigo-100' }, h('td', { className: 'pr-3 font-mono' }, String(i)), h('td', { className: 'pr-3 font-mono' }, calcFmtNum(Math.round(p.x * 1e6) / 1e6)), h('td', { className: 'pr-3 font-mono' }, fmtN(Math.round(p.y * 1e5) / 1e5)), h('td', { className: 'pr-3 font-mono' }, fmtN(Math.round(p.slope * 1e5) / 1e5)),
                    showAnswer && h('td', { className: 'pr-3 font-mono' }, fmtN(Math.round(yt * 1e5) / 1e5)), showAnswer && h('td', { className: 'font-mono' }, fmtN(Math.round((p.y - yt) * 1e5) / 1e5)));
                })))),
            study.tiny ? h('p', { className: 'mt-2 text-xs font-bold', role: 'status' }, __alloT('stem.calculus.eul_tiny', 'Every Euler step lands exactly on the solution here (it is a straight line or a constant), so there is no error to shrink. Move the seed point to try the prediction.'))
            : !study.ok || !study.halving ? h('p', { className: 'mt-2 text-xs', role: 'status' }, study.ok && study.cancels ? __alloT('stem.calculus.eul_cancel', 'From this seed the step errors almost cancel each other out, so the usual pattern does not show. Move the seed point.') : __alloT('stem.calculus.eul_wild', 'From this seed the solution grows too fast for a fair comparison. Move the seed point.'))
            : h('div', { className: 'mt-2 rounded-lg border border-indigo-300 bg-indigo-50 p-2' },
                h('p', { id: 'calc-eul-q', className: 'text-sm font-bold' }, question),
                !done && !exhausted && radioGroup('calc-eul-pred', 'calc-eul-q', opts, pick, function(id) { updMany({ eulerKey: key, eulerPick: id, eulerTries: tries, eulerDone: false }); }, live && tries > 0 && d.eulerLast ? [d.eulerLast] : [], 'text-indigo-950'),
                !done && !exhausted && h('button', { type: 'button', onClick: commit, disabled: !pick, className: 'mt-1 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-700 text-white disabled:opacity-50' }, __alloT('stem.calculus.eul_commit', 'Commit my prediction')),
                grade && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (grade.correct ? 'text-emerald-800' : 'text-red-800') },
                  grade.correct ? '\u2705 ' + __alloT('stem.calculus.eul_correct', 'Correct: halving h about halves the error.') : (done && !showAnswer ? '\u274C ' + __alloT('stem.calculus.eul_no_reveal', 'Try another seed point, or ask your teacher.') + ' ' : (done || exhausted ? '\u274C ' + (exhausted ? __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ' : '') : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ')) + misconceptionText(grade.mis, 'euler')),
                exhausted && revealOffer(function() { upd('eulerDone', true); }),
                !done && !exhausted && hintBlock([__alloT('stem.calculus.eul_hint_1', 'Each Euler step follows a tangent line for a distance h, while the true curve bends away from it.'), __alloT('stem.calculus.eul_hint_2', 'Halving h doubles the number of steps, but each step now misses by about a quarter as much.')], Math.max(0, Math.min(2, finiteNum(d.eulerHintRung, 0))), function(n) { upd('eulerHintRung', n); }, 'text-indigo-950'),
                showAnswer && h('div', { className: 'mt-2 space-y-1', 'data-calc-euler-revealed': true },
                  h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.eul_halving', 'Error as h halves'), className: 'overflow-x-auto' },
                    h('table', { className: 'text-xs border-collapse' },
                      h('caption', { className: 'text-left font-bold' }, fillT(__alloT('stem.calculus.eul_halving_cap', 'Error at x = {xe} as h halves ({kind} value {v})'), { xe: calcFmtNum(xEnd), kind: ode.exact ? __alloT('stem.calculus.eul_exact_word', 'exact') : __alloT('stem.calculus.eul_ref_word', 'reference'), v: fmtN(Math.round(study.yTrue * 1e6) / 1e6) })),
                      h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-3' }, 'h'), h('th', { scope: 'col', className: 'text-left pr-3' }, __alloT('stem.calculus.eul_col_est', 'Euler estimate')), h('th', { scope: 'col', className: 'text-left pr-3' }, __alloT('stem.calculus.eul_col_err', 'Error')), h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.eul_col_ratio', 'Error \u00F7 previous error')))),
                      h('tbody', null, study.rows.map(function(r, i) { return h('tr', { key: i, className: 'border-t border-indigo-200' }, h('td', { className: 'pr-3 font-mono' }, calcFmtNum(r.h)), h('td', { className: 'pr-3 font-mono' }, fmtN(Math.round(r.estimate * 1e6) / 1e6)), h('td', { className: 'pr-3 font-mono' }, fmtN(Math.round(r.error * 1e6) / 1e6)), h('td', { className: 'font-mono' }, r.ratio === null ? '\u2014' : calcFmtNum(Math.round(r.ratio * 100) / 100))); })))),
                  h('p', { className: 'text-xs' }, fillT(__alloT('stem.calculus.eul_verdict', 'Each halving of h multiplies the error by about {r}. Euler\u2019s method is first order: its error is roughly proportional to h.'), { r: calcFmtNum(Math.round(study.rows[study.rows.length - 1].ratio * 100) / 100) })),
                  h('p', { className: 'text-xs' }, study.under
                    ? (bend === 'up' ? __alloT('stem.calculus.eul_under_up', 'Here Euler\u2019s estimate is BELOW the true value: the solution bends upward (concave up), so each tangent step falls under the curve.') : __alloT('stem.calculus.eul_under', 'Here Euler\u2019s estimate is below the true value.'))
                    : (bend === 'down' ? __alloT('stem.calculus.eul_over_down', 'Here Euler\u2019s estimate is ABOVE the true value: the solution bends downward (concave down), so each tangent step overshoots the curve.') : __alloT('stem.calculus.eul_over', 'Here Euler\u2019s estimate is above the true value.')))
                )
              )
          );
        }

        // ── SERIES TAB (AP Calculus BC): practice that never runs out, and an explorer ──
        function seriesTermLimitText(s) {
          if (s.termLim === 0) return '0';
          if (s.termLim === Infinity) return '\u221E';
          if (s.termLim !== s.termLim) return __alloT('stem.calculus.ser_no_limit', 'no limit (the terms swing ever wider)');
          return calcFmtNum(s.termLim);
        }
        function seriesWhy(s) {
          if (s.fam === 'p') return s.conv ? __alloT('stem.calculus.ser_why_p_conv', 'A p-series with p > 1: it converges, even though the ratio test gives L = 1 and cannot tell.') : __alloT('stem.calculus.ser_why_p_div', 'A p-series with p \u2264 1: it diverges, even though its terms go to 0. The ratio test gives L = 1 and cannot tell.');
          if (s.fam === 'geo') return s.conv ? __alloT('stem.calculus.ser_why_geo_conv', 'A geometric series with |r| < 1: the ratio test gives L = |r| < 1, and the sum is r/(1 \u2212 r).') : __alloT('stem.calculus.ser_why_geo_div', 'A geometric series with |r| > 1: the terms grow, so both the nth-term test and the ratio test show it diverges.');
          if (s.fam === 'polyexp') return __alloT('stem.calculus.ser_why_polyexp', 'The power of n grows, but the exponential in the denominator wins: the ratio test gives L = 1/b < 1.');
          if (s.fam === 'expfact') return __alloT('stem.calculus.ser_why_expfact', 'Factorials beat exponentials: the ratio test gives L = 0, so it converges (to e^b \u2212 1).');
          if (s.fam === 'factexp') return __alloT('stem.calculus.ser_why_factexp', 'Factorials beat exponentials, here in the numerator: the terms grow without bound, so it diverges.');
          if (s.fam === 'rational') return __alloT('stem.calculus.ser_why_rational', 'The terms approach a nonzero number, so the nth-term test shows divergence. The ratio test gives L = 1 and cannot tell.');
          if (s.fam === 'alt') return __alloT('stem.calculus.ser_why_alt', 'The signs alternate and the sizes shrink steadily to 0, so the alternating series test shows it converges. The ratio test gives L = 1 and cannot tell.');
          return __alloT('stem.calculus.ser_why_tele', 'It telescopes: 1/(n(n + 1)) = 1/n \u2212 1/(n + 1), so the partial sums are 1 \u2212 1/(N + 1) \u2192 1. The ratio test gives L = 1 and cannot tell.');
        }
        // Up to a million terms: memoised per series and N list, so typing elsewhere does not re-add them.
        function seriesPartialsMemo(s, Ns) {
          var cache = window._calcSerCache || (window._calcSerCache = {}), k = s.id + '|' + Ns.join(',');
          if (!cache[k]) { if (Object.keys(cache).length > 40) window._calcSerCache = cache = {}; cache[k] = calcSeriesPartials(s, Ns); }
          return cache[k];
        }
        function seriesTables(s, Ns) {
          var ps = seriesPartialsMemo(s, Ns), rr = calcSeriesRatioRows(s);
          var Ltxt = s.ratioL === Infinity ? '\u221E' : calcFmtNum(Math.round(s.ratioL * 1e4) / 1e4);
          var pts = calcSeriesPartials(s, (function() { var a = []; for (var i = 1; i <= 40; i++) a.push(i); return a; })());
          var fin = pts.filter(function(p) { return p.S !== null; });
          var ymax = Math.max.apply(null, fin.map(function(p) { return Math.abs(p.S); }).concat([1]));
          var plotW = 320, plotH = 120;
          var px = function(n) { return 24 + (n - 1) / 39 * (plotW - 32); }, py = function(v) { return plotH / 2 - (v / ymax) * (plotH / 2 - 10); };
          return h('div', { className: 'space-y-2', 'data-calc-series-tables': s.id },
            h('p', { className: 'text-xs' }, fillT(__alloT('stem.calculus.ser_nth', 'nth-term check: as n \u2192 \u221E the terms approach {L}.'), { L: seriesTermLimitText(s) }) + ' ' + (s.termLim === 0 ? __alloT('stem.calculus.ser_nth_silent', 'That is 0, so this test says nothing either way.') : __alloT('stem.calculus.ser_nth_div', 'That is not 0, so the series diverges.'))),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.ser_partial', 'Partial sums'), className: 'overflow-x-auto' },
                h('table', { className: 'text-xs border-collapse', 'data-calc-series-partials': true },
                  h('caption', { className: 'text-left font-bold' }, __alloT('stem.calculus.ser_partial', 'Partial sums')),
                  h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-3' }, 'N'), h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.ser_col_sum', 'Sum of the first N terms')))),
                  h('tbody', null, ps.map(function(p, i) { return h('tr', { key: i, className: 'border-t border-fuchsia-200' }, h('td', { className: 'pr-3 font-mono' }, fmtN(p.N)), h('td', { className: 'font-mono' }, p.S === null ? __alloT('stem.calculus.ser_overflow', 'too large to show') : fmtN(Math.round(p.S * 1e6) / 1e6))); })))),
              h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.ser_ratio', 'Ratio test'), className: 'overflow-x-auto' },
                h('table', { className: 'text-xs border-collapse', 'data-calc-series-ratio': true },
                  h('caption', { className: 'text-left font-bold' }, fillT(__alloT('stem.calculus.ser_ratio_cap', 'Ratio test: |a(n+1)/a(n)| \u2192 L = {L}'), { L: Ltxt })),
                  h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-3' }, 'n'), h('th', { scope: 'col', className: 'text-left pr-3' }, 'a(n)'), h('th', { scope: 'col', className: 'text-left' }, '|a(n+1)/a(n)|'))),
                  h('tbody', null, rr.map(function(r, i) { return h('tr', { key: i, className: 'border-t border-fuchsia-200' }, h('td', { className: 'pr-3 font-mono' }, String(r.n)), h('td', { className: 'pr-3 font-mono' }, fmtN(r.a)), h('td', { className: 'font-mono' }, fmtN(Math.round(r.ratio * 1e4) / 1e4))); })))))
            ,
            h('p', { className: 'text-xs' }, s.ratioL === 1 ? __alloT('stem.calculus.ser_ratio_one', 'L = 1: the ratio test is inconclusive here.') : s.ratioL < 1 ? __alloT('stem.calculus.ser_ratio_lt', 'L < 1: the ratio test shows the series converges.') : __alloT('stem.calculus.ser_ratio_gt', 'L > 1: the ratio test shows the series diverges.')),
            h('svg', { viewBox: '0 0 ' + plotW + ' ' + plotH, role: 'img', className: 'w-full max-w-md bg-white rounded-lg border border-fuchsia-300',
                'aria-label': fillT(__alloT('stem.calculus.ser_plot_label', 'Partial sums S(1) to S(40) of {s}: S(1) = {a}, S(40) = {b}.'), { s: s.label, a: fmtN(fin.length ? fin[0].S : null), b: fmtN(pts[pts.length - 1].S) }) },
              h('line', { x1: 20, y1: py(0), x2: plotW - 4, y2: py(0), stroke: '#64748b', strokeWidth: 1 }),
              s.conv && s.sum !== null && Math.abs(s.sum) <= ymax && h('line', { x1: 20, y1: py(s.sum), x2: plotW - 4, y2: py(s.sum), stroke: '#a21caf', strokeWidth: 1, strokeDasharray: '4 3' }),
              fin.map(function(p) { return h('circle', { key: p.N, cx: px(p.N), cy: py(p.S), r: 2.5, fill: '#1e293b' }); })),
            s.conv && s.sum !== null && h('p', { className: 'text-xs font-bold' }, fillT(__alloT('stem.calculus.ser_sum', 'The series converges to {v}.'), { v: (s.sumLabel ? s.sumLabel + ' \u2248 ' : '') + calcFmtNum(Math.round(s.sum * 1e6) / 1e6) })),
            h('p', { className: 'text-xs' }, seriesWhy(s)));
        }
        function seriesTab() {
          var smode = d.serMode === 'explore' ? 'explore' : 'practice';
          var seed = finiteCoord(d.serSeed) ? d.serSeed : null;
          var s = smode === 'practice' && seed ? calcGenSeries(calcSeeded(seed), d.serBand || band) : null;
          var pred = d.serPred && typeof d.serPred === 'object' ? d.serPred : { conv: '', test: '' };
          var tries = finiteNum(d.serTries, 0), committed = !!d.serCommitted;
          var grade = s && tries > 0 ? calcGradeSeries(s, d.serLast || pred) : null;
          var showAnswer = committed && grade && (grade.correct || !noReveal);
          var exhausted = !committed && tries >= 2 && !!grade && !grade.correct;
          var newItem = function() { updMany({ serMode: 'practice', serSeed: Math.floor(Math.random() * 2147483000) + 1, serBand: band, serPred: { conv: '', test: '' }, serLast: null, serCommitted: false, serTries: 0, serHintRung: 0 }); };
          var question = s ? fillT(__alloT('stem.calculus.ser_question', 'Does the series {s} (n from 1 to \u221E) converge or diverge? Then choose the test that settles it.'), { s: s.label }) : '';
          var commit = function() {
            if (!s || !pred.conv || !pred.test || exhausted) return;
            var g = calcGradeSeries(s, pred), t2 = tries + 1, fin2 = t2 >= 2;
            updMany({ serTries: t2, serLast: pred, serCommitted: g.correct });
            if (g.correct) { awardOnce('ser:' + seed, 3, __alloT('stem.calculus.xp_series', 'Classified a series')); bumpSolved('series'); say(__alloT('stem.calculus.sr_ser_ok', 'Correct. The tables are now shown.')); }
            else {
              if (fin2) logMissed('series', question, pred.conv + ' / ' + pred.test, (s.conv ? 'conv' : 'div') + ' / ' + s.decides.join(' or '), g.mis);
              say(fillT(fin2 ? __alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.') : __alloT('stem.calculus.sr_ser_try', 'Not yet. {msg} One more try.'), { msg: misconceptionText(g.mis, 'series') }));
            }
          };
          var testOpts = [{ id: 'divergence', label: __alloT('stem.calculus.ser_test_nth', 'The nth-term (divergence) test') }, { id: 'ratio', label: __alloT('stem.calculus.ser_test_ratio', 'The ratio test') }, { id: 'other', label: __alloT('stem.calculus.ser_test_other', 'Neither: it needs another test (p-series, alternating series, telescoping or comparison)') }];
          var rungs = [__alloT('stem.calculus.ser_hint_1', 'First check the terms: if they do not go to 0, the series diverges. If they do go to 0, that test is silent.'), __alloT('stem.calculus.ser_hint_2', 'Ratio test: L = lim |a(n+1)/a(n)|. L < 1 converges, L > 1 diverges, L = 1 tells you nothing.'), __alloT('stem.calculus.ser_hint_3', 'Recognise a family: geometric \u03A3 r\u207F converges when |r| < 1; p-series \u03A3 1/n\u1D56 when p > 1; alternating terms that shrink to 0 converge.')];
          var expIdx = Math.max(0, Math.min(CALC_SERIES_EXPLORE.length - 1, Math.round(finiteNum(d.serPick, 0))));
          var es = calcSeriesMake.apply(null, CALC_SERIES_EXPLORE[expIdx]);
          var NS_ALL = [10, 100, 1000, 10000, 100000, 1000000];
          var nTop = NS_ALL.indexOf(d.serN) >= 0 ? d.serN : 10000;
          var isHarm = es.fam === 'p' && es.a === 1, harmDone = !!d.serHarmDone;
          return h('div', { key: 'series', 'data-calc-series': smode, className: 'text-fuchsia-950' },
            band !== 'bc' && h('p', { className: 'mb-2 rounded-lg border border-fuchsia-300 bg-fuchsia-50 p-2 text-xs' }, __alloT('stem.calculus.ser_band_note', 'Infinite series are part of AP Calculus BC. You can explore every series here; at this level, practice uses geometric series, p-series and the nth-term test.')),
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3', role: 'group', 'aria-label': __alloT('stem.calculus.ser_mode', 'Series mode') },
              [['practice', __alloT('stem.calculus.ser_mode_practice', 'Practice: converge or diverge?')], ['explore', __alloT('stem.calculus.ser_mode_explore', 'Explore partial sums')]].map(function(o) {
                return h('button', { key: o[0], type: 'button', 'aria-pressed': smode === o[0], onClick: function() { if (o[0] === 'practice' && !seed) newItem(); else upd('serMode', o[0]); },
                  className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold border ' + (smode === o[0] ? 'bg-fuchsia-800 text-white border-fuchsia-800' : 'bg-white text-fuchsia-900 border-fuchsia-600 hover:bg-fuchsia-50') }, o[1]);
              }),
              smode === 'practice' && h('button', { type: 'button', onClick: newItem, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-fuchsia-900 border border-fuchsia-600' }, seed ? __alloT('stem.calculus.ser_new', 'New series') : __alloT('stem.calculus.lim_start', 'Start')),
              h('button', { type: 'button', onClick: function() { updMany({ tab: 'visualize', vizView: 'taylor' }); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-fuchsia-900 border border-fuchsia-600' }, __alloT('stem.calculus.ser_to_taylor', 'See Taylor series build a function (Visualize)'))
            ),
            smode === 'practice' && !s && h('p', { className: 'text-sm' }, __alloT('stem.calculus.ser_intro', 'Press Start for a series. Decide first; the partial sums and the ratio table appear after you commit.')),
            smode === 'practice' && s && h('div', { className: 'rounded-xl border-2 border-fuchsia-300 bg-fuchsia-50 p-3' },
              h('p', { className: 'text-sm font-bold', id: 'calc-ser-q' }, question),
              !committed && !exhausted && h('div', null,
                h('p', { id: 'calc-ser-q1', className: 'mt-2 text-xs font-bold' }, __alloT('stem.calculus.ser_q1', 'Converge or diverge?')),
                radioGroup('calc-ser-conv', 'calc-ser-q1', [{ id: 'conv', label: __alloT('stem.calculus.opt_converges', 'Converges') }, { id: 'div', label: __alloT('stem.calculus.opt_diverges', 'Diverges') }], pred.conv, function(id) { upd('serPred', { conv: id, test: pred.test }); }, null, 'text-fuchsia-950'),
                h('p', { id: 'calc-ser-q2', className: 'mt-2 text-xs font-bold' }, __alloT('stem.calculus.ser_q2', 'Which test settles it?')),
                radioGroup('calc-ser-test', 'calc-ser-q2', testOpts, pred.test, function(id) { upd('serPred', { conv: pred.conv, test: id }); }, null, 'text-fuchsia-950'),
                h('button', { type: 'button', onClick: commit, disabled: !pred.conv || !pred.test, className: 'mt-2 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-800 text-white disabled:opacity-50' }, __alloT('stem.calculus.lim_commit', 'Commit my prediction')),
                hintBlock(rungs, Math.max(0, Math.min(3, finiteNum(d.serHintRung, 0))), function(n) { upd('serHintRung', n); }, 'text-fuchsia-950')),
              grade && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (grade.correct ? 'text-emerald-800' : 'text-red-800') },
                grade.correct ? '\u2705 ' + __alloT('stem.calculus.ser_correct', 'Correct, and the right test.')
                  : (committed ? (showAnswer ? '\u274C ' + fillT(__alloT('stem.calculus.ser_reveal', 'It {verdict}.'), { verdict: s.conv ? __alloT('stem.calculus.ser_converges_word', 'converges') : __alloT('stem.calculus.ser_diverges_word', 'diverges') }) + ' ' : '\u274C ' + __alloT('stem.calculus.ser_no_reveal', 'Try a new series, or ask your teacher.') + ' ') : exhausted ? '\u274C ' + __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ' : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ') + misconceptionText(grade.mis, 'series')),
              exhausted && revealOffer(function() { upd('serCommitted', true); }, { onNew: newItem, newLabel: __alloT('stem.calculus.ser_new', 'New series') }),
              showAnswer && h('div', { className: 'mt-3' }, seriesTables(s, [10, 100, 1000, 10000, 100000]),
                h('button', { type: 'button', onClick: newItem, className: 'mt-2 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-800 text-white' }, __alloT('stem.calculus.ser_next', 'Next series') + ' \u2192'))
            ),
            smode === 'explore' && h('div', { className: 'rounded-xl border-2 border-fuchsia-300 bg-fuchsia-50 p-3 space-y-2' },
              h('div', { role: 'group', 'aria-label': __alloT('stem.calculus.ser_pick', 'Series to explore'), className: 'flex flex-wrap gap-1' },
                CALC_SERIES_EXPLORE.map(function(spec, i) { var on = i === expIdx, sx = calcSeriesMake.apply(null, spec); return h('button', { key: i, type: 'button', 'aria-pressed': on, onClick: function() { upd('serPick', i); }, className: 'min-h-[32px] px-2 py-1 rounded border text-xs font-mono font-bold ' + (on ? 'bg-fuchsia-800 border-fuchsia-900 text-white' : 'bg-white border-fuchsia-400 text-fuchsia-950') }, sx.label); })),
              h('div', { role: 'group', 'aria-label': __alloT('stem.calculus.ser_upto', 'Add terms up to N ='), className: 'flex flex-wrap items-center gap-1' },
                h('span', { className: 'text-[0.6875rem] font-bold mr-1' }, __alloT('stem.calculus.ser_upto', 'Add terms up to N =')),
                NS_ALL.map(function(N) { var on = N === nTop; return h('button', { key: N, type: 'button', 'aria-pressed': on, onClick: function() { upd('serN', N); }, className: 'min-h-[32px] px-2 py-1 rounded border text-xs font-mono font-bold ' + (on ? 'bg-fuchsia-800 border-fuchsia-900 text-white' : 'bg-white border-fuchsia-400 text-fuchsia-950') }, fmtN(N)); })),
              isHarm && !harmDone ? h('div', { className: 'rounded-lg border border-fuchsia-400 bg-white p-2' },
                h('p', { id: 'calc-harm-q', className: 'text-sm font-bold' }, __alloT('stem.calculus.harm_q', 'The harmonic series 1 + 1/2 + 1/3 + 1/4 + \u2026 has terms that shrink to 0. Predict: do its partial sums level off below some number, or grow past every number?')),
                radioGroup('calc-harm', 'calc-harm-q', [{ id: 'levels', label: __alloT('stem.calculus.harm_levels', 'They level off, because the terms go to 0') }, { id: 'grows', label: __alloT('stem.calculus.harm_grows', 'They grow past every number') }], d.serHarmPred || '', function(id) { upd('serHarmPred', id); }, null, 'text-fuchsia-950'),
                h('button', { type: 'button', disabled: !d.serHarmPred, onClick: function() { upd('serHarmDone', true); if (d.serHarmPred === 'grows') awardOnce('ser:harmonic', 2, __alloT('stem.calculus.xp_harmonic', 'Predicted the harmonic series')); else logMissed('series', __alloT('stem.calculus.harm_short', 'Harmonic series: level off or grow?'), d.serHarmPred, 'grows', 'terms_zero_converges'); say(d.serHarmPred === 'grows' ? __alloT('stem.calculus.sr_harm_ok', 'Right: they grow without bound. The tables are now shown.') : misconceptionText('terms_zero_converges', 'series')); },
                  className: 'mt-1 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-fuchsia-800 text-white disabled:opacity-50' }, __alloT('stem.calculus.lim_commit', 'Commit my prediction')))
              : h('div', null,
                  isHarm && h('p', { role: 'status', className: 'mb-2 text-sm font-bold ' + (d.serHarmPred === 'grows' ? 'text-emerald-800' : 'text-red-800') },
                    (d.serHarmPred === 'grows' ? '\u2705 ' + __alloT('stem.calculus.harm_right', 'Right: they grow past every number, just very slowly.') + ' ' : '\u274C ' + misconceptionText('terms_zero_converges', 'series') + ' ') +
                    __alloT('stem.calculus.harm_fact', 'S(N) is about ln N + 0.577: it passes 10 at N = 12,367 and would need about 1.5 \u00D7 10\u2074\u00B3 terms to pass 100.')),
                  seriesTables(es, NS_ALL.filter(function(N) { return N <= nTop; })))
            )
          );
        }

        // ── APPLIED MISSIONS: related rates and optimization, set up step by step ──
        var MISSION_KINDS = band === 'pre' ? ['ladder', 'box'] : ['ladder', 'cone', 'box'];
        function missionKindLabel(k) { return k === 'cone' ? __alloT('stem.calculus.mk_cone', 'Filling a cone tank') : k === 'box' ? __alloT('stem.calculus.mk_box', 'The open box') : __alloT('stem.calculus.mk_ladder', 'The sliding ladder'); }
        function missionScenario(m) {
          var p = m.p;
          if (m.kind === 'cone') return fillT(__alloT('stem.calculus.ms_cone', 'Water is pumped into an inverted cone-shaped tank at {k} ft\u00B3/min. The tank is {H} ft tall and its top has radius {R} ft. How fast is the water level rising when the water is {h} ft deep? Let h be the depth of the water and r the radius of its surface.'), { k: p.k, H: p.H, R: p.R, h: p.h0 });
          if (m.kind === 'box') return fillT(__alloT('stem.calculus.ms_box', 'An open box is made from a {a} in by {b} in sheet of cardboard by cutting equal squares of side x from each corner and folding up the sides. What cut size x gives the largest volume, and what is that volume?'), { a: p.a, b: p.b });
          return fillT(__alloT('stem.calculus.ms_ladder', 'A {L} ft ladder leans against a vertical wall. The bottom slides away from the wall at {k} ft/s. How fast is the top sliding down when the bottom is {a} ft from the wall? Let x be the distance from the wall to the bottom and y the height of the top.'), { L: p.L, k: p.k, a: p.a });
        }
        function missionPrompt(m, st) {
          var p = m.p, k = m.kind + '.' + st.id;
          if (k === 'ladder.model') return __alloT('stem.calculus.mp_ladder_model', 'Write an equation that links x and y at EVERY moment, not just this one.');
          if (k === 'ladder.diff') return __alloT('stem.calculus.mp_ladder_diff', 'Differentiate both sides with respect to time t.');
          if (k === 'ladder.instant') return fillT(__alloT('stem.calculus.mp_ladder_instant', 'At this instant x = {a}. What is y, in feet?'), { a: p.a });
          if (k === 'ladder.solve') return __alloT('stem.calculus.mp_ladder_solve', 'Substitute and solve: what is dy/dt, in ft/s? (Negative means the top moves down.)');
          if (k === 'cone.similar') return __alloT('stem.calculus.mp_cone_similar', 'Use similar triangles to write r in terms of h. The water surface grows as h grows.');
          if (k === 'cone.model') return __alloT('stem.calculus.mp_cone_model', 'Write the volume of water V in terms of h only.');
          if (k === 'cone.diff') return __alloT('stem.calculus.mp_cone_diff', 'Differentiate with respect to time t.');
          if (k === 'cone.solve') return fillT(__alloT('stem.calculus.mp_cone_solve', 'At h = {h} ft with dV/dt = {k} ft\u00B3/min, what is dh/dt, in ft/min?'), { h: p.h0, k: p.k });
          if (k === 'box.model') return __alloT('stem.calculus.mp_box_model', 'Type the volume V(x) as a function of x.');
          if (k === 'box.domain') return __alloT('stem.calculus.mp_box_domain', 'Which values of x make a real box?');
          if (k === 'box.deriv') return __alloT('stem.calculus.mp_box_deriv', 'Type V\u2032(x).');
          if (k === 'box.crit') return __alloT('stem.calculus.mp_box_crit', 'Solve V\u2032(x) = 0. Which x inside the domain is the critical point, in inches?');
          if (k === 'box.max') return __alloT('stem.calculus.mp_box_max', 'What is the maximum volume, in cubic inches?');
          return __alloT('stem.calculus.mp_box_justify', 'Why is it a maximum?');
        }
        function justText(tkey, p) {
          var x = calcFmtNum(Math.round((p.xs || 0) * 1000) / 1000);
          if (tkey === 'just_vp_sign') return fillT(__alloT('stem.calculus.just_vp_sign', 'V\u2032 changes from positive to negative at x \u2248 {x}, so V has a maximum there.'), { x: x });
          if (tkey === 'just_vp_zero') return fillT(__alloT('stem.calculus.just_vp_zero', 'V\u2032({x}) = 0, so V has a maximum there.'), { x: x });
          if (tkey === 'just_v_pos') return fillT(__alloT('stem.calculus.just_v_pos', 'V({x}) is positive, so it is the maximum.'), { x: x });
          if (tkey === 'just_v_sign') return __alloT('stem.calculus.just_v_sign', 'v(t) changes sign at each of these times.');
          if (tkey === 'just_v_zero') return __alloT('stem.calculus.just_v_zero', 'v(t) = 0 at each of these times.');
          if (tkey === 'just_a_zero') return __alloT('stem.calculus.just_a_zero', 'a(t) = 0 at each of these times.');
          if (tkey === 'just_fp_sign_max') return __alloT('stem.calculus.just_fp_sign_max', 'f\u2032 changes from positive to negative there.');
          if (tkey === 'just_fp_zero') return __alloT('stem.calculus.just_fp_zero', 'f\u2032 = 0 there.');
          if (tkey === 'just_fpp_pos') return __alloT('stem.calculus.just_fpp_pos', 'f\u2033 > 0 there.');
          if (tkey === 'just_gp_sign') return __alloT('stem.calculus.just_gp_sign', 'g\u2032 = f changes from positive to negative there, and g is larger there than at either endpoint.');
          if (tkey === 'just_f_zero') return __alloT('stem.calculus.just_f_zero', 'f = 0 there.');
          if (tkey === 'just_g_zero') return __alloT('stem.calculus.just_g_zero', 'g = 0 there.');
          if (tkey === 'opt_converges') return __alloT('stem.calculus.opt_converges', 'Converges');
          return __alloT('stem.calculus.opt_diverges', 'Diverges');
        }
        var optLabel = function(o, p) { return o.text != null ? o.text : justText(o.tkey, p); };
        // Free-response justification elements: each is a whole sentence, so a model answer is the
        // chosen sentences in order, never glued fragments.
        function justElText(tkey, p) {
          var n = function(v) { return calcFmtNum(Math.round(v * 1000) / 1000); };
          var P = { p: n(p.p), q: n(p.q), T: n(p.T), m: n((p.p + p.q) / 2), r: n(p.r), X: n(p.X), gr: n(p.gr), gX: n(p.gX), b: n(p.b) };
          var T = {
            jf_v_sign: __alloT('stem.calculus.jf_v_sign', 'v(t) changes sign at t = {p} and at t = {q}.'),
            jf_v_zero: __alloT('stem.calculus.jf_v_zero', 'v(t) = 0 at t = {p} and at t = {q}.'),
            jf_a_zero: __alloT('stem.calculus.jf_a_zero', 'a(t) = 0 at t = {m}.'),
            jf_x_zero: __alloT('stem.calculus.jf_x_zero', 'The position x(t) is 0 at those times.'),
            jp_pnp: __alloT('stem.calculus.jp_pnp', 'v(t) > 0 for 0 ≤ t < {p}, v(t) < 0 for {p} < t < {q}, and v(t) > 0 for {q} < t ≤ {T}.'),
            jp_npn: __alloT('stem.calculus.jp_npn', 'v(t) < 0 for 0 ≤ t < {p}, v(t) > 0 for {p} < t < {q}, and v(t) < 0 for {q} < t ≤ {T}.'),
            jp_pos: __alloT('stem.calculus.jp_pos', 'v(t) ≥ 0 for the whole time interval.'),
            jc_turn: __alloT('stem.calculus.jc_turn', 'So the particle changes direction at t = {p} and at t = {q}.'),
            jc_stop: __alloT('stem.calculus.jc_stop', 'So the particle stops at those times but keeps moving the same way.'),
            jc_fast: __alloT('stem.calculus.jc_fast', 'So the particle moves fastest at those times.'),
            jt_fdt: __alloT('stem.calculus.jt_fdt', 'I use the First Derivative Test.'),
            jt_sdt: __alloT('stem.calculus.jt_sdt', 'I use the Second Derivative Test.'),
            jt_evt: __alloT('stem.calculus.jt_evt', 'I use the Extreme Value Theorem.'),
            jt_mvt: __alloT('stem.calculus.jt_mvt', 'I use the Mean Value Theorem.'),
            jk_fp_pm: __alloT('stem.calculus.jk_fp_pm', 'f′(x) changes from positive to negative at x = {p}.'),
            jk_fpp_neg: __alloT('stem.calculus.jk_fpp_neg', 'f′({p}) = 0 and f″({p}) < 0.'),
            jk_fp_mp: __alloT('stem.calculus.jk_fp_mp', 'f′(x) changes from negative to positive at x = {p}.'),
            jk_fpp_pos: __alloT('stem.calculus.jk_fpp_pos', 'f′({p}) = 0 and f″({p}) > 0.'),
            jk_fp_zero: __alloT('stem.calculus.jk_fp_zero', 'f′({p}) = 0.'),
            jc_relmax: __alloT('stem.calculus.jc_relmax', 'So f has a relative maximum at x = {p}.'),
            jc_relmin: __alloT('stem.calculus.jc_relmin', 'So f has a relative minimum at x = {p}.'),
            jc_absmax: __alloT('stem.calculus.jc_absmax', 'So f has its absolute maximum on the interval only at x = {p}.'),
            jt_cand: __alloT('stem.calculus.jt_cand', 'I use the Candidates Test: compare g at the critical point and at both endpoints.'),
            jt_fdt1: __alloT('stem.calculus.jt_fdt1', 'I use the sign of g′ at the only critical point in the interval.'),
            jk_cmp: __alloT('stem.calculus.jk_cmp', 'g(0) = 0, g({r}) = {gr} and g({X}) = {gX}, so g({r}) is the largest.'),
            jk_sign: __alloT('stem.calculus.jk_sign', 'g′(x) = f(x) > 0 for 0 < x < {r} and g′(x) = f(x) < 0 for {r} < x < {X}.'),
            jk_fz: __alloT('stem.calculus.jk_fz', 'f({r}) = 0.'),
            jk_gz: __alloT('stem.calculus.jk_gz', 'g({r}) = 0.'),
            jh_cont: __alloT('stem.calculus.jh_cont', 'g is continuous on the closed interval [0, {X}], because g′ = f exists there (Fundamental Theorem of Calculus).'),
            jh_g0: __alloT('stem.calculus.jh_g0', 'The test may be used because g(0) = 0.'),
            jh_fdec: __alloT('stem.calculus.jh_fdec', 'The test may be used because f is decreasing.'),
            js_harm: __alloT('stem.calculus.js_harm', 'At x = {b} the series is the sum of 1/n, the harmonic series.'),
            js_alt: __alloT('stem.calculus.js_alt', 'At x = {b} the series is the sum of (−1)ⁿ/n, the alternating harmonic series.'),
            js_keepb: __alloT('stem.calculus.js_keepb', 'At x = {b} the series is the sum of 1/(n·{b}ⁿ).'),
            jt_pser: __alloT('stem.calculus.jt_pser', 'By the p-series test with p = 1 (a p-series with p ≤ 1 diverges).'),
            jt_integ: __alloT('stem.calculus.jt_integ', 'By the integral test: the integral of 1/x from 1 to ∞ diverges.'),
            jt_nth: __alloT('stem.calculus.jt_nth', 'By the nth-term test, because the terms go to 0.'),
            jt_ratio: __alloT('stem.calculus.jt_ratio', 'By the ratio test.'),
            jt_ast: __alloT('stem.calculus.jt_ast', 'By the alternating series test.'),
            jc_div: __alloT('stem.calculus.jc_div', 'So the series diverges at x = {b}.'),
            jc_conv: __alloT('stem.calculus.jc_conv', 'So the series converges at x = {b}.')
          };
          return fillT(T[tkey] || '', P);
        }
        function justSlotLabel(id) {
          if (id === 'fact') return __alloT('stem.calculus.jl_fact', 'Which fact about the velocity does your reason use?');
          if (id === 'pattern') return __alloT('stem.calculus.jl_pattern', 'Which sign pattern does v(t) have?');
          if (id === 'test') return __alloT('stem.calculus.jl_test', 'Which test or theorem do you use?');
          if (id === 'cond') return __alloT('stem.calculus.jl_cond', 'Which condition do you check?');
          if (id === 'hyp') return __alloT('stem.calculus.jl_hyp', 'Why may you use that test on this interval?');
          if (id === 'series') return __alloT('stem.calculus.jl_series', 'Which series do you get at this x?');
          return __alloT('stem.calculus.jl_concl', 'What do you conclude?');
        }
        function justElementName(id) {
          if (id === 'fact') return __alloT('stem.calculus.jr_fact', 'Uses the fact about v(t) that decides a change of direction.');
          if (id === 'pattern') return __alloT('stem.calculus.jr_pattern', 'States the sign of v(t) on each side of each time.');
          if (id === 'test') return __alloT('stem.calculus.jr_test', 'Names a test or theorem that applies.');
          if (id === 'cond') return __alloT('stem.calculus.jr_cond', 'States the condition of that test, true at this point.');
          if (id === 'hyp') return __alloT('stem.calculus.jr_hyp', 'States why the test may be used on this interval.');
          if (id === 'series') return __alloT('stem.calculus.jr_series', 'Identifies the series at this x.');
          return __alloT('stem.calculus.jr_concl', 'Draws the right conclusion.');
        }
        function justModelText(st, p) {
          var picks = calcJustifyModel(st);
          return st.slots.map(function(s) { var o = s.options.filter(function(q) { return q.id === picks[s.id]; })[0]; return o ? justElText(o.tkey, p) : ''; }).filter(Boolean).join(' ');
        }
        function stepAnswerText(st, p) {
          if (st.type === 'justify') return justModelText(st, p);
          if (st.type === 'choice') { var o = st.options.filter(function(q) { return q.id === st.answer; })[0]; return o ? optLabel(o, p) : ''; }
          if (st.type === 'list') return st.answer.map(calcFmtNum).join(', ');
          if (st.type === 'number') return calcFmtNum(Math.round(st.answer * 1e4) / 1e4);
          return '';
        }
        // The worked example for a step, from a sibling mission with other numbers. It fades after two solved missions.
        function missionWorked(m, st) {
          var p = m.p, k = m.kind + '.' + st.id;
          if (k === 'ladder.instant') return fillT(__alloT('stem.calculus.mw_ladder_instant', 'With a {L} ft ladder and x = {a}: y = \u221A({L}\u00B2 \u2212 {a}\u00B2) = {b}.'), { L: p.L, a: p.a, b: p.b });
          if (k === 'ladder.solve') return fillT(__alloT('stem.calculus.mw_ladder_solve', '2({a})({k}) + 2({b})\u00B7dy/dt = 0, so dy/dt = \u2212{a}\u00B7{k}/{b} = {r} ft/s.'), { a: p.a, k: p.k, b: p.b, r: calcFmtNum(Math.round(-p.a * p.k / p.b * 1e4) / 1e4) });
          if (k === 'cone.solve') return fillT(__alloT('stem.calculus.mw_cone_solve', '{k} = \u03C0({f})\u00B2\u00B7{h}\u00B2\u00B7dh/dt, so dh/dt \u2248 {v} ft/min.'), { k: p.k, f: calcRateFrac(p.R, p.H), h: p.h0, v: calcFmtNum(Math.round(p.k / (Math.PI * (p.R / p.H) * (p.R / p.H) * p.h0 * p.h0) * 1e4) / 1e4) });
          if (k === 'box.model') return fillT(__alloT('stem.calculus.mw_box_model', 'For a {a} by {b} sheet: V(x) = x({a} \u2212 2x)({b} \u2212 2x).'), { a: p.a, b: p.b });
          if (k === 'box.deriv') return fillT(__alloT('stem.calculus.mw_box_deriv', 'For a {a} by {b} sheet: V(x) = 4x\u00B3 \u2212 {s}x\u00B2 + {ab}x, so V\u2032(x) = 12x\u00B2 \u2212 {s2}x + {ab}.'), { a: p.a, b: p.b, s: 2 * (p.a + p.b), ab: p.a * p.b, s2: 4 * (p.a + p.b) });
          if (k === 'box.crit') return fillT(__alloT('stem.calculus.mw_box_crit', 'For a {a} by {b} sheet, V\u2032(x) = 0 at x \u2248 {x}, the root inside 0 < x < {m}.'), { a: p.a, b: p.b, x: calcFmtNum(Math.round(p.xs * 1000) / 1000), m: calcFmtNum(p.m / 2) });
          if (k === 'box.max') return fillT(__alloT('stem.calculus.mw_box_max', 'For a {a} by {b} sheet: V({x}) \u2248 {v} in\u00B3.'), { a: p.a, b: p.b, x: calcFmtNum(Math.round(p.xs * 1000) / 1000), v: calcFmtNum(Math.round(p.vmax * 100) / 100) });
          return fillT(__alloT('stem.calculus.mw_choice', 'In a mission with other numbers, this step is: {ans}'), { ans: stepAnswerText(st, p) });
        }
        function missionHint(m, st) {
          var k = m.kind + '.' + st.id;
          var H = {
            'ladder.model': __alloT('stem.calculus.mh_ladder_model', 'The wall, the ground and the ladder make a right triangle. Which side is the ladder?'),
            'ladder.diff': __alloT('stem.calculus.mh_ladder_diff', 'x and y both change with time; the ladder\u2019s length does not.'),
            'ladder.instant': __alloT('stem.calculus.mh_ladder_instant', 'Use the equation from step 1 with the value of x at this instant.'),
            'ladder.solve': __alloT('stem.calculus.mh_ladder_solve', 'Put x, y and dx/dt into the equation from step 2, then solve for dy/dt.'),
            'cone.similar': __alloT('stem.calculus.mh_cone_similar', 'The water forms a smaller cone with the same shape as the tank: r/h = R/H.'),
            'cone.model': __alloT('stem.calculus.mh_cone_model', 'Start from V = (1/3)\u03C0r\u00B2h and replace r with your answer from step 1.'),
            'cone.diff': __alloT('stem.calculus.mh_cone_diff', 'V is a constant times h\u00B3. Differentiate with respect to t: the chain rule brings in dh/dt.'),
            'cone.solve': __alloT('stem.calculus.mh_cone_solve', 'Substitute h and dV/dt into step 3 and divide.'),
            'box.model': __alloT('stem.calculus.mh_box_model', 'Volume = length \u00D7 width \u00D7 height. After the cuts the base is (a \u2212 2x) by (b \u2212 2x).'),
            'box.domain': __alloT('stem.calculus.mh_box_domain', 'Every side of the base must stay positive.'),
            'box.deriv': __alloT('stem.calculus.mh_box_deriv', 'Expand V(x) into a cubic first, then differentiate term by term.'),
            'box.crit': __alloT('stem.calculus.mh_box_crit', 'V\u2032 is a quadratic: use the quadratic formula and check each root against the domain.'),
            'box.max': __alloT('stem.calculus.mh_box_max', 'Substitute your critical x into V(x).'),
            'box.justify': __alloT('stem.calculus.mh_box_justify', 'What must V\u2032 do on either side of a maximum?')
          };
          return H[k] || '';
        }
        // One input for a step or a free-response part: radio buttons, a number box or a formula box.
        function stepInput(idBase, st, value, onInput, disabledIds, p, labelledBy) {
          if (st.type === 'choice') return radioGroup(idBase, labelledBy, st.options.map(function(o) { return { id: o.id, label: optLabel(o, p) }; }), value, onInput, disabledIds, '');
          var cfx = st.type === 'expr' && String(value || '').trim() ? calcCompileText(value) : null;
          return h('div', null,
            h('input', { type: 'text', 'aria-labelledby': labelledBy, value: value || '', spellCheck: false, autoComplete: 'off', onChange: function(e) { onInput(e.target.value); },
              placeholder: st.type === 'expr' ? __alloT('stem.calculus.step_ph_expr', 'a formula in x, e.g. x(10 - 2x)^2') : st.type === 'list' ? __alloT('stem.calculus.step_ph_list', 'e.g. 1, 3') : __alloT('stem.calculus.step_ph_number', 'a number, e.g. -5/6 or 2.4'),
              className: 'mt-1 w-full sm:w-72 px-2 py-1.5 border-2 border-slate-500 rounded font-mono text-sm', style: inputStyle }),
            cfx && cfx.ok && h('p', { className: 'text-[0.6875rem] mt-0.5' }, fillT(__alloT('stem.calculus.step_read_as', 'Read as: {f}'), { f: cfx.label })),
            cfx && ambiguityNote(cfx, onInput));
        }
        function appliedTab() {
          var kind = MISSION_KINDS.indexOf(d.misKind) >= 0 ? d.misKind : MISSION_KINDS[0];
          var seed = finiteCoord(d.misSeed) ? d.misSeed : null;
          var m = seed && d.misKind === kind ? calcGenMission(kind, calcSeeded(seed)) : null;
          // A damaged entry (null) is an empty step record, not a crash of the whole tab.
          var results = Array.isArray(d.misResults) ? d.misResults.map(function(r) { return r && typeof r === 'object' ? r : {}; }) : [];
          var idx = m ? Math.max(0, Math.min(m.steps.length, finiteNum(d.misIdx, 0))) : 0;
          var st = m && idx < m.steps.length ? m.steps[idx] : null;
          var tries = finiteNum(d.misTries, 0), input = d.misInput == null ? '' : d.misInput;
          var fb = d.misFeedback && typeof d.misFeedback === 'object' ? d.misFeedback : null;
          var stuck = fb && fb.stuck && fb.idx === idx;
          var faded = solvedOf('mission') >= 2;
          var start = function(k) { updMany({ misKind: k, misSeed: Math.floor(Math.random() * 2147483000) + 1, misIdx: 0, misTries: 0, misResults: [], misInput: '', misFeedback: null, misHintRung: 0 }); };
          // Record this step (solved, or shown after two tries) and open the next one.
          var advance = function(ok, t2, mis) {
            var revealedNow = !ok;
            var res2 = results.slice(0, idx).concat([{ ok: ok, tries: t2, revealed: revealedNow, mis: mis }]);
            var doneAll = idx + 1 >= m.steps.length;
            updMany({ misResults: res2, misIdx: idx + 1, misTries: 0, misInput: '', misHintRung: 0, misFeedback: { idx: idx, ok: ok, mis: mis, revealed: revealedNow, answer: stepAnswerText(st, m.p) } });
            if (doneAll) {
              if (!res2.some(function(r) { return r.revealed; })) { awardOnce('mis:' + kind + ':' + seed, 5, __alloT('stem.calculus.xp_mission', 'Completed an applied mission')); bumpSolved('mission'); }
              say(__alloT('stem.calculus.sr_ms_done', 'Mission complete. Your step summary is shown.'));
            } else say(ok ? __alloT('stem.calculus.sr_ms_ok', 'Correct. Next step.') : __alloT('stem.calculus.sr_ms_shown', 'The step is filled in for you; next step.'));
          };
          var check = function() {
            if (!st) return;
            var g = calcGradeStep(st, input);
            if (g.parse) { updMany({ misFeedback: { idx: idx, parse: true, error: g.error, detail: g.detail, empty: g.empty } }); return; }
            var t2 = tries + 1;
            if (g.ok) advance(true, t2, '');
            else if (t2 >= 2) {
              // Both tries used: the step waits for "Show the answer" (stuck), with no credit.
              updMany({ misTries: t2, misFeedback: { idx: idx, mis: g.mis, stuck: true } });
              logMissed('mission', missionPrompt(m, st), input, stepAnswerText(st, m.p), g.mis);
              say(fillT(__alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.'), { msg: misconceptionText(g.mis, 'mission') }));
            } else {
              updMany({ misTries: t2, misFeedback: { idx: idx, ok: false, mis: g.mis } });
              say(fillT(__alloT('stem.calculus.sr_ms_try', 'Not yet. {msg} One more try.'), { msg: misconceptionText(g.mis, 'mission') }));
            }
          };
          var sibling = m ? calcGenMission(kind, calcSeeded(seed + 7919)) : null;
          var sibStep = sibling && st ? sibling.steps.filter(function(q) { return q.id === st.id; })[0] : null;
          var rungs = st ? [missionHint(m, st)].concat(faded || !sibStep ? [] : [fillT(__alloT('stem.calculus.mh_worked', 'Worked example (fades after two missions): {w}'), { w: missionWorked(sibling, sibStep) })]) : [];
          var firstTry = results.filter(function(r) { return r.ok && r.tries === 1; }).length, second = results.filter(function(r) { return r.ok && r.tries > 1; }).length, shown = results.filter(function(r) { return r.revealed; }).length;
          return h('div', { key: 'apply', 'data-calc-applied': kind, className: 'text-orange-950' },
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3', role: 'group', 'aria-label': __alloT('stem.calculus.ms_kind', 'Mission') },
              MISSION_KINDS.map(function(k) { var on = k === kind && !!m; return h('button', { key: k, type: 'button', 'aria-pressed': on, onClick: function() { start(k); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold border ' + (on ? 'bg-orange-800 text-white border-orange-800' : 'bg-white text-orange-900 border-orange-600 hover:bg-orange-50') }, missionKindLabel(k)); }),
              m && h('button', { type: 'button', onClick: function() { start(kind); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-orange-900 border border-orange-600' }, __alloT('stem.calculus.ms_new', 'New numbers'))),
            !m && h('p', { className: 'text-sm' }, __alloT('stem.calculus.ms_intro', 'Pick a mission. You set up the model yourself, one step at a time; each step is checked before the next one opens.')),
            m && h('div', { className: 'rounded-xl border-2 border-orange-300 bg-orange-50 p-3' },
              h('p', { className: 'text-sm font-semibold' }, missionScenario(m)),
              h('ol', { className: 'mt-2 space-y-2' }, m.steps.map(function(s2, i) {
                var r = results[i];
                if (i < idx && r) return h('li', { key: s2.id, className: 'rounded-lg border border-orange-200 bg-white p-2 text-xs' },
                  h('p', { className: 'font-bold' }, fillT(__alloT('stem.calculus.ms_step_n', 'Step {n} of {m}.'), { n: i + 1, m: m.steps.length }) + ' ' + missionPrompt(m, s2)),
                  h('p', { className: r.revealed ? 'text-red-800' : 'text-emerald-800' }, (r.revealed ? '\u274C ' + __alloT('stem.calculus.ms_shown', 'Shown (no credit):') : '\u2705') + ' ' + stepAnswerText(s2, m.p)));
                if (i === idx) return h('li', { key: s2.id, className: 'rounded-lg border-2 border-orange-500 bg-white p-2 text-xs' },
                  h('p', { id: 'calc-ms-step', className: 'font-bold text-sm' }, fillT(__alloT('stem.calculus.ms_step_n', 'Step {n} of {m}.'), { n: i + 1, m: m.steps.length }) + ' ' + missionPrompt(m, s2)),
                  !stuck && stepInput('calc-ms-in', s2, input, function(v) { updMany({ misInput: v, misFeedback: fb && fb.idx === idx && !fb.parse ? fb : null }); }, tries > 0 && s2.type === 'choice' && d.misLastPick ? [d.misLastPick] : [], m.p, 'calc-ms-step'),
                  !stuck && h('button', { type: 'button', disabled: !String(input).trim(), onClick: function() { if (s2.type === 'choice') upd('misLastPick', input); check(); }, className: 'mt-2 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-orange-800 text-white disabled:opacity-50' }, __alloT('stem.calculus.ms_check', 'Check this step')),
                  fb && fb.idx === idx && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 font-bold text-red-800' },
                    fb.parse ? (fb.error ? parseErrorText(fb.error, fb.detail) : __alloT('stem.calculus.ms_parse', 'Type a number (fractions like -5/6 are fine) or pick an option.')) : (stuck ? '\u274C ' + __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ' : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ') + (fb.parse ? '' : misconceptionText(fb.mis, 'mission'))),
                  stuck && revealOffer(function() { advance(false, tries, fb.mis); }, { onNew: function() { start(kind); }, newLabel: __alloT('stem.calculus.ms_new', 'New numbers') }),
                  !stuck && hintBlock(rungs, Math.max(0, Math.min(rungs.length, finiteNum(d.misHintRung, 0))), function(n) { upd('misHintRung', n); }, 'text-orange-950'));
                return h('li', { key: s2.id, className: 'text-xs text-orange-900' }, fillT(__alloT('stem.calculus.ms_locked', 'Step {n} opens when step {p} is done.'), { n: i + 1, p: i }));
              })),
              fb && fb.idx === idx - 1 && !fb.parse && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-xs font-bold ' + (fb.ok ? 'text-emerald-800' : 'text-red-800') },
                fb.ok ? '\u2705 ' + __alloT('stem.calculus.ms_ok', 'Correct.') : '\u274C ' + fillT(__alloT('stem.calculus.ms_revealed', 'The step is: {a}.'), { a: fb.answer }) + ' ' + misconceptionText(fb.mis, 'mission')),
              idx >= m.steps.length && h('div', { className: 'mt-3 rounded-lg border-2 border-emerald-600 bg-white p-2 text-xs text-slate-900', 'data-calc-mission-done': true },
                h('p', { className: 'font-bold text-sm' }, __alloT('stem.calculus.ms_done', 'Mission complete.')),
                h('p', null, fillT(__alloT('stem.calculus.ms_summary', 'Steps right first time: {a}. Right after feedback: {b}. Shown to you: {c}.'), { a: firstTry, b: second, c: shown })),
                h('p', null, m.kind === 'box' ? fillT(__alloT('stem.calculus.ms_answer_box', 'Answer: cut x \u2248 {x} in, for a maximum volume of about {v} in\u00B3.'), { x: calcFmtNum(Math.round(m.p.xs * 1000) / 1000), v: calcFmtNum(Math.round(m.p.vmax * 100) / 100) })
                  : m.kind === 'cone' ? fillT(__alloT('stem.calculus.ms_answer_cone', 'Answer: the water level rises at about {v} ft/min.'), { v: calcFmtNum(Math.round(m.steps[3].answer * 1e4) / 1e4) })
                  : fillT(__alloT('stem.calculus.ms_answer_ladder', 'Answer: the top slides down at {v} ft/s (dy/dt = {r}).'), { v: calcFmtNum(Math.round(-m.steps[3].answer * 1e4) / 1e4), r: calcFmtNum(Math.round(m.steps[3].answer * 1e4) / 1e4) })),
                h('div', { className: 'mt-2 flex flex-wrap gap-2' },
                  h('button', { type: 'button', onClick: function() { start(kind); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-800 text-white' }, __alloT('stem.calculus.ms_again', 'Another mission like this') + ' \u2192'),
                  kind !== 'cone' && h('button', { type: 'button', onClick: function() { updMany({ tab: 'visualize', vizView: kind === 'box' ? 'optim' : 'related' }); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-orange-900 border border-orange-600' }, __alloT('stem.calculus.ms_to_viz', 'See it move in Visualize'))))
            )
          );
        }

        // ── AP-STYLE FREE RESPONSE: multi-part, each part checked, scored like a rubric ──
        var FRQ_KINDS = band === 'bc' ? ['particle', 'analysis', 'accum', 'series'] : ['particle', 'analysis', 'accum'];
        function frqKindLabel(k) { return k === 'analysis' ? __alloT('stem.calculus.fk_analysis', 'Analysing f from f\u2032') : k === 'accum' ? __alloT('stem.calculus.fk_accum', 'Accumulation g(x)') : k === 'series' ? __alloT('stem.calculus.fk_series', 'Power series (BC)') : __alloT('stem.calculus.fk_particle', 'Particle motion'); }
        function frqStem(q) {
          var p = q.p;
          if (q.kind === 'analysis') return fillT(__alloT('stem.calculus.fs_analysis', 'Let f(x) = {f}. Its derivative is f\u2032(x) = {fp}. Consider f on the closed interval {lo} \u2264 x \u2264 {hi}.'), { f: p.fText, fp: p.fpText, lo: p.lo, hi: p.hi });
          if (q.kind === 'accum') return fillT(__alloT('stem.calculus.fs_accum', 'Let f(t) = {f}, and let g(x) be the integral of f(t) dt from 0 to x, for 0 \u2264 x \u2264 {X}.'), { f: p.fText, X: p.X });
          if (q.kind === 'series') return fillT(__alloT('stem.calculus.fs_series', 'Let f(x) be the sum of x\u207F/(n\u00B7{b}\u207F) for n = 1, 2, 3, \u2026'), { b: p.b });
          return fillT(__alloT('stem.calculus.fs_particle', 'A particle moves along the x-axis. Its velocity at time t seconds is v(t) = {v} for 0 \u2264 t \u2264 {T}.'), { v: p.vText, T: p.T });
        }
        function frqPrompt(q, pt) {
          var p = q.p, k = q.kind + '.' + pt.id;
          var P = {
            'particle.a': fillT(__alloT('stem.calculus.fp_particle_a', '(a) Find the acceleration of the particle at t = {t}.'), { t: p.t1 }),
            'particle.b1': __alloT('stem.calculus.fp_particle_b1', '(b) At what times does the particle change direction? List them, separated by commas.'),
            'particle.b2': __alloT('stem.calculus.fp_particle_b2', '(b, continued) Justify your answer.'),
            'particle.c': fillT(__alloT('stem.calculus.fp_particle_c', '(c) Find the displacement of the particle from t = 0 to t = {T}.'), { T: p.T }),
            'particle.d': fillT(__alloT('stem.calculus.fp_particle_d', '(d) Find the total distance the particle travels from t = 0 to t = {T}.'), { T: p.T }),
            'analysis.a': __alloT('stem.calculus.fp_analysis_a', '(a) Find the x-coordinates of all critical points of f. List them, separated by commas.'),
            'analysis.b1': __alloT('stem.calculus.fp_analysis_b1', '(b) At what x does f have a relative maximum?'),
            'analysis.b2': __alloT('stem.calculus.fp_analysis_b2', '(b, continued) Justify your answer.'),
            'analysis.c': __alloT('stem.calculus.fp_analysis_c', '(c) At what x does the graph of f have a point of inflection?'),
            'analysis.d': fillT(__alloT('stem.calculus.fp_analysis_d', '(d) Find the absolute maximum VALUE of f on {lo} \u2264 x \u2264 {hi}.'), { lo: p.lo, hi: p.hi }),
            'accum.a': fillT(__alloT('stem.calculus.fp_accum_a', '(a) Find g({x}).'), { x: p.x1 }),
            'accum.b': fillT(__alloT('stem.calculus.fp_accum_b', '(b) Find g\u2032({x}).'), { x: p.x2 }),
            'accum.c1': fillT(__alloT('stem.calculus.fp_accum_c1', '(c) At what x does g attain its absolute maximum on 0 \u2264 x \u2264 {X}?'), { X: p.X }),
            'accum.c2': __alloT('stem.calculus.fp_accum_c2', '(c, continued) Justify your answer.'),
            'accum.d': fillT(__alloT('stem.calculus.fp_accum_d', '(d) Use the line tangent to g at x = {x} to approximate g({x2}).'), { x: p.x3, x2: calcFmtNum(p.x3 + 0.1) }),
            'series.a': __alloT('stem.calculus.fp_series_a', '(a) Use the ratio test to find the radius of convergence R.'),
            'series.b': fillT(__alloT('stem.calculus.fp_series_b', '(b) Does the series converge at x = {b}?'), { b: p.b }),
            'series.b2': __alloT('stem.calculus.fp_series_b2', '(b, continued) Justify your answer to part (b).'),
            'series.c': fillT(__alloT('stem.calculus.fp_series_c', '(c) Does the series converge at x = \u2212{b}?'), { b: p.b }),
            'series.d': __alloT('stem.calculus.fp_series_d', '(d) What is the interval of convergence?'),
            'series.e': __alloT('stem.calculus.fp_series_e', '(e) Use the first three terms to approximate f(1).')
          };
          return P[k] || '';
        }
        function frqRubric(q, pt) {
          var k = q.kind + '.' + pt.id;
          var R = {
            'particle.a': __alloT('stem.calculus.fr_particle_a', '1 point: a(t) = v\u2032(t), evaluated at the given time.'),
            'particle.b1': __alloT('stem.calculus.fr_particle_b1', '1 point: every time where v(t) = 0 and v changes sign.'),
            'particle.b2': __alloT('stem.calculus.fr_particle_b2j', '1 point: uses the sign change of v(t), states the sign of v on each side, and concludes that the particle changes direction.'),
            'particle.c': __alloT('stem.calculus.fr_particle_c', '1 point: the integral of v(t) over the interval, with the correct value.'),
            'particle.d': __alloT('stem.calculus.fr_particle_d', '1 point: splits the integral where v changes sign (or uses |v|); 1 point: the correct value.'),
            'analysis.a': __alloT('stem.calculus.fr_analysis_a', '1 point: every x where f\u2032(x) = 0.'),
            'analysis.b1': __alloT('stem.calculus.fr_analysis_b1', '1 point: the correct x.'),
            'analysis.b2': __alloT('stem.calculus.fr_analysis_b2j', '1 point: names the First or Second Derivative Test, states its condition (f\u2032 changes from positive to negative, or f\u2032 = 0 with f\u2033 < 0), and concludes a relative maximum.'),
            'analysis.c': __alloT('stem.calculus.fr_analysis_c', '1 point: where f\u2033 changes sign.'),
            'analysis.d': __alloT('stem.calculus.fr_analysis_d', '1 point: compares f at the critical points and both endpoints; 1 point: the correct value.'),
            'accum.a': __alloT('stem.calculus.fr_accum_a', '1 point: the signed area from 0 to x.'),
            'accum.b': __alloT('stem.calculus.fr_accum_b', '1 point: uses g\u2032(x) = f(x).'),
            'accum.c1': __alloT('stem.calculus.fr_accum_c1', '1 point: the correct x.'),
            'accum.c2': __alloT('stem.calculus.fr_accum_c2j', '1 point: names the Candidates Test (or the sign of g\u2032 at the only critical point), states its evidence, and says why it applies: g is continuous on the closed interval.'),
            'accum.d': __alloT('stem.calculus.fr_accum_d', '1 point: g(a) + g\u2032(a)(x \u2212 a) with the correct value.'),
            'series.a': __alloT('stem.calculus.fr_series_a', '1 point: the ratio test limit |x|/b < 1, giving R.'),
            'series.b': __alloT('stem.calculus.fr_series_b', '1 point: identifies the series at this x and decides it.'),
            'series.b2': __alloT('stem.calculus.fr_series_b2', '1 point: identifies the harmonic series at x = b, names a test that decides it (p-series or integral test), and concludes divergence.'),
            'series.c': __alloT('stem.calculus.fr_series_c', '1 point: identifies the series at this x and decides it.'),
            'series.d': __alloT('stem.calculus.fr_series_d', '1 point: the interval with both endpoints handled correctly.'),
            'series.e': __alloT('stem.calculus.fr_series_e', '1 point: the sum of the first three terms at x = 1.')
          };
          return R[k] || '';
        }
        function frqTab() {
          var kind = FRQ_KINDS.indexOf(d.frqKind) >= 0 ? d.frqKind : FRQ_KINDS[0];
          var seed = finiteCoord(d.frqSeed) ? d.frqSeed : null;
          var q = seed && d.frqKind === kind ? calcGenFRQ(kind, calcSeeded(seed)) : null;
          var inputs = d.frqInputs && typeof d.frqInputs === 'object' ? d.frqInputs : {};
          var tries = d.frqTries && typeof d.frqTries === 'object' ? d.frqTries : {};
          var results = d.frqResults && typeof d.frqResults === 'object' ? d.frqResults : {};
          var fbk = d.frqFeedback && typeof d.frqFeedback === 'object' ? d.frqFeedback : {};
          var start = function(k) { updMany({ frqKind: k, frqSeed: Math.floor(Math.random() * 2147483000) + 1, frqInputs: {}, frqTries: {}, frqResults: {}, frqFeedback: {}, frqRubricOpen: {} }); };
          var setIn = function(id, v) { var o = Object.assign({}, inputs); o[id] = v; upd('frqInputs', o); };
          // A justification's input is { text, picks }; an older save may hold a string there.
          var justIn = function(pt) { var v = inputs[pt.id]; return v && typeof v === 'object' && !Array.isArray(v) ? { text: typeof v.text === 'string' ? v.text : '', picks: v.picks && typeof v.picks === 'object' ? v.picks : {} } : { text: '', picks: {} }; };
          var setJust = function(pt, patch) { var cur = justIn(pt); setIn(pt.id, { text: patch.text != null ? patch.text : cur.text, picks: patch.picks || cur.picks }); };
          var pickedText = function(pt, picks) { return pt.slots.map(function(s) { var o = s.options.filter(function(x) { return x.id === picks[s.id]; })[0]; return o ? justElText(o.tkey, q.p) : ''; }).filter(Boolean).join(' '); };
          var readyToCheck = function(pt) { if (pt.type !== 'justify') return !!String(inputs[pt.id] || '').trim(); var j = justIn(pt); return !!j.text.trim() && pt.slots.every(function(s) { return !!j.picks[s.id]; }); };
          var finishAll = function(rs) {
            if (q.parts.every(function(p2) { return rs[p2.id]; }) && q.parts.every(function(p2) { return rs[p2.id].ok; })) { awardOnce('frq:' + kind + ':' + seed, 5, __alloT('stem.calculus.xp_frq', 'Completed a free-response question')); bumpSolved('frq'); }
          };
          var check = function(pt) {
            var g = calcGradeStep(pt, pt.type === 'justify' ? justIn(pt) : inputs[pt.id]), fb2 = Object.assign({}, fbk);
            if (g.parse) { fb2[pt.id] = { parse: true, error: g.error, detail: g.detail, need: g.need || '' }; upd('frqFeedback', fb2); return; }
            var n = (tries[pt.id] || 0) + 1, tr = Object.assign({}, tries), rs = Object.assign({}, results);
            tr[pt.id] = n;
            // Two misses: the part waits for "Show the answer" (no credit). With the teacher's
            // no-reveal setting it is scored 0 at once and the answer stays hidden.
            var used = !g.ok && n >= 2, fin2 = g.ok || (used && noReveal);
            var wrongPicks = pt.type === 'justify' && !g.ok ? pt.slots.map(function(s) { var o = s.options.filter(function(x) { return x.id === justIn(pt).picks[s.id]; })[0]; return o && !o.ok ? s.id + ':' + o.id : ''; }).filter(Boolean) : null;
            fb2[pt.id] = { ok: g.ok, mis: g.mis, fin: fin2, used: used && !fin2, tried: pt.type === 'choice' && !g.ok ? inputs[pt.id] : null, elements: g.elements || null, wrong: wrongPicks };
            if (fin2) rs[pt.id] = { ok: g.ok, firstTry: g.ok && n === 1, revealed: !g.ok, mis: g.mis };
            updMany({ frqTries: tr, frqResults: rs, frqFeedback: fb2 });
            if (used) logMissed('frq', frqPrompt(q, pt), pt.type === 'justify' ? pickedText(pt, justIn(pt).picks) : inputs[pt.id], stepAnswerText(pt, q.p), g.mis);
            if (fin2) finishAll(rs);
            say(g.ok ? (n === 1 ? __alloT('stem.calculus.sr_fr_ok', 'Correct: full points for this part.') : __alloT('stem.calculus.sr_fr_ok2', 'Correct on the second try.')) : fillT(used ? __alloT('stem.calculus.sr_tries_used', 'Not quite. {msg} Both tries are used.') : __alloT('stem.calculus.sr_fr_try', 'Not yet. {msg} One more try.'), { msg: misconceptionText(g.mis, 'frq') }));
          };
          var revealPart = function(pt) {
            var f = fbk[pt.id] || {}, rs = Object.assign({}, results), fb2 = Object.assign({}, fbk);
            rs[pt.id] = { ok: false, firstTry: false, revealed: true, mis: f.mis || '' };
            fb2[pt.id] = Object.assign({}, f, { used: false, fin: true });
            updMany({ frqResults: rs, frqFeedback: fb2 });
          };
          function justifyInput(pt) {
            var j = justIn(pt), fb2 = fbk[pt.id] || {}, wrong = Array.isArray(fb2.wrong) ? fb2.wrong : [];
            return h('div', { className: 'mt-1 space-y-2', 'data-calc-justify': pt.id },
              h('label', { htmlFor: 'calc-fq-jt-' + pt.id, className: 'block text-xs font-bold' }, __alloT('stem.calculus.fq_just_write', 'Write your justification in your own words.')),
              h('textarea', { id: 'calc-fq-jt-' + pt.id, rows: 3, value: j.text, spellCheck: true, 'aria-describedby': 'calc-fq-jn-' + pt.id, onChange: function(e) { setJust(pt, { text: e.target.value }); },
                className: 'w-full px-2 py-1.5 border-2 border-slate-500 rounded text-sm', style: inputStyle }),
              h('p', { id: 'calc-fq-jn-' + pt.id, className: 'text-[0.6875rem]' }, __alloT('stem.calculus.fq_just_note', 'Your own words are shown back to you but are not scored. Then mark what your justification uses in each list below: the rubric checks those choices.')),
              pt.slots.map(function(s) {
                var lid = 'calc-fq-js-' + pt.id + '-' + s.id;
                return h('div', { key: s.id, className: 'rounded border border-sky-300 p-2' },
                  h('p', { id: lid, className: 'text-xs font-bold' }, justSlotLabel(s.id)),
                  radioGroup('calc-fq-jr-' + pt.id + '-' + s.id, lid, s.options.map(function(o) { return { id: o.id, label: justElText(o.tkey, q.p) }; }), j.picks[s.id] || '',
                    function(id) { var pk = Object.assign({}, j.picks); pk[s.id] = id; setJust(pt, { picks: pk }); },
                    wrong.filter(function(w) { return w.indexOf(s.id + ':') === 0; }).map(function(w) { return w.slice(s.id.length + 1); }), 'w-full'));
              }));
          }
          function elementList(pt, elements) {
            if (!elements) return null;
            return h('ul', { className: 'mt-1 text-xs space-y-0.5', 'data-calc-justify-elements': pt.slots.filter(function(s) { return elements[s.id]; }).length + '/' + pt.slots.length },
              pt.slots.map(function(s) { return h('li', { key: s.id }, (elements[s.id] ? '✓ ' + __alloT('stem.calculus.jr_met', 'Met:') : '✗ ' + __alloT('stem.calculus.jr_not_met', 'Not met:')) + ' ' + justElementName(s.id)); }));
          }
          var score = q ? calcFRQScore(q, results) : null;
          var allDone = q && q.parts.every(function(p2) { return results[p2.id]; });
          var rubOpen = d.frqRubricOpen && typeof d.frqRubricOpen === 'object' ? d.frqRubricOpen : {};
          return h('div', { key: 'frq', 'data-calc-frq': kind, className: 'text-sky-950' },
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3', role: 'group', 'aria-label': __alloT('stem.calculus.fq_kind', 'Free-response topic') },
              FRQ_KINDS.map(function(k) { var on = k === kind && !!q; return h('button', { key: k, type: 'button', 'aria-pressed': on, onClick: function() { start(k); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold border ' + (on ? 'bg-sky-800 text-white border-sky-800' : 'bg-white text-sky-900 border-sky-600 hover:bg-sky-50') }, frqKindLabel(k)); }),
              q && h('button', { type: 'button', onClick: function() { start(kind); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-sky-900 border border-sky-600' }, __alloT('stem.calculus.fq_new', 'New question'))),
            !q && h('p', { className: 'text-sm' }, __alloT('stem.calculus.fq_intro', 'Pick a topic for an AP-style free-response question. Each part is checked on its own and scored like the AP rubric; the first attempt is your AP-style score. No AI is needed.')),
            q && h('div', { className: 'rounded-xl border-2 border-sky-300 bg-sky-50 p-3 space-y-2' },
              h('p', { className: 'text-sm font-semibold' }, frqStem(q)),
              q.parts.map(function(pt) {
                var r = results[pt.id], fb2 = fbk[pt.id], n = tries[pt.id] || 0, lblId = 'calc-fq-' + pt.id;
                var showAns = r && r.revealed && !noReveal, isJ = pt.type === 'justify', used = !r && fb2 && fb2.used;
                return h('div', { key: pt.id, className: 'rounded-lg border border-sky-300 bg-white p-2 text-xs', 'data-calc-frq-part': pt.id },
                  h('p', { id: lblId, className: 'font-bold text-sm' }, frqPrompt(q, pt) + ' ' + fillT(pt.points === 1 ? __alloT('stem.calculus.fq_point', '[{n} point]') : __alloT('stem.calculus.fq_points', '[{n} points]'), { n: pt.points })),
                  !r && !used && (isJ ? justifyInput(pt) : stepInput('calc-fq-in-' + pt.id, pt, inputs[pt.id], function(v) { setIn(pt.id, v); }, n > 0 && fb2 && fb2.tried ? [fb2.tried] : [], q.p, lblId)),
                  !r && !used && h('button', { type: 'button', disabled: !readyToCheck(pt), onClick: function() { check(pt); }, className: 'mt-1 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-800 text-white disabled:opacity-50' }, __alloT('stem.calculus.fq_check', 'Check this part')),
                  r && h('p', { className: 'font-bold ' + (r.ok ? 'text-emerald-800' : 'text-red-800') }, r.ok ? '\u2705 ' + (isJ ? pickedText(pt, justIn(pt).picks) || stepAnswerText(pt, q.p) : stepAnswerText(pt, q.p)) + (r.firstTry ? '' : ' ' + __alloT('stem.calculus.fq_second', '(second try)')) : (showAns ? '\u274C ' + fillT(isJ ? __alloT('stem.calculus.fq_model', 'A full-credit justification: {a}') : __alloT('stem.calculus.fq_answer', 'Answer: {a}'), { a: stepAnswerText(pt, q.p) }) : '\u274C ' + __alloT('stem.calculus.fq_no_reveal', 'Not scored. Ask your teacher about this part.'))),
                  r && isJ && justIn(pt).text.trim() && h('p', { className: 'mt-1 whitespace-pre-wrap', 'data-calc-justify-own': true }, fillT(__alloT('stem.calculus.fq_own_words', 'Your own words: {t}'), { t: justIn(pt).text.trim() })),
                  isJ && fb2 && !fb2.parse && elementList(pt, fb2.elements),
                  fb2 && (fb2.parse || !fb2.ok) && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-1 font-bold text-red-800' }, fb2.parse ? (fb2.need === 'text' ? __alloT('stem.calculus.fq_need_text', 'Write your justification in the box first.') : fb2.need === 'slots' ? __alloT('stem.calculus.fq_need_slots', 'Mark one choice in every list.') : fb2.error ? parseErrorText(fb2.error, fb2.detail) : __alloT('stem.calculus.ms_parse', 'Type a number (fractions like -5/6 are fine) or pick an option.')) : (fb2.fin ? '' : used ? '\u274C ' + __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ' : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ') + misconceptionText(fb2.mis, 'frq')),
                  used && revealOffer(function() { revealPart(pt); }),
                  h('button', { type: 'button', 'aria-expanded': !!rubOpen[pt.id], onClick: function() { var o = Object.assign({}, rubOpen); o[pt.id] = !o[pt.id]; upd('frqRubricOpen', o); }, className: 'mt-1 min-h-[28px] text-[0.6875rem] font-bold underline text-sky-900' }, __alloT('stem.calculus.fq_rubric_btn', 'What earns the point?')),
                  rubOpen[pt.id] && h('p', { className: 'text-[0.6875rem] text-sky-950' }, frqRubric(q, pt)));
              }),
              h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.fq_rubric', 'Rubric breakdown'), className: 'overflow-x-auto' },
                h('table', { className: 'text-xs border-collapse w-full bg-white', 'data-calc-frq-rubric': true },
                  h('caption', { className: 'text-left font-bold' }, __alloT('stem.calculus.fq_rubric', 'Rubric breakdown')),
                  h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.fq_col_part', 'Part')), h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.fq_col_points', 'Points')), h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.fq_col_first', 'First attempt')), h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.fq_col_after', 'After feedback')), h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.fq_col_note', 'Note')))),
                  h('tbody', null, q.parts.map(function(pt) {
                    var r = results[pt.id];
                    return h('tr', { key: pt.id, className: 'border-t border-sky-200' }, h('td', { className: 'pr-2 font-mono' }, pt.id), h('td', { className: 'pr-2' }, String(pt.points)),
                      h('td', { className: 'pr-2' }, r ? String(r.firstTry ? pt.points : 0) : '\u2014'), h('td', { className: 'pr-2' }, r ? String(r.ok ? pt.points : 0) : '\u2014'),
                      h('td', null, r && r.mis ? misconceptionText(r.mis, 'frq') : ''));
                  }).concat([h('tr', { key: 'total', className: 'border-t-2 border-sky-600 font-bold' }, h('td', { className: 'pr-2' }, __alloT('stem.calculus.fq_total', 'Total')), h('td', { className: 'pr-2' }, String(score.total)), h('td', { className: 'pr-2' }, String(score.first)), h('td', { className: 'pr-2' }, String(score.after)), h('td', null, ''))])))),
              allDone && h('p', { role: 'status', className: 'text-sm font-bold', 'data-calc-frq-score': score.first + '/' + score.total }, fillT(__alloT('stem.calculus.fq_score', 'AP-style score (first attempts): {a} out of {t}. After feedback: {b} out of {t}.'), { a: score.first, b: score.after, t: score.total })),
              allDone && h('button', { type: 'button', onClick: function() { start(kind); }, className: 'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-800 text-white' }, __alloT('stem.calculus.fq_next', 'Next question') + ' \u2192')
            )
          );
        }

        // ── INTEGRAL: the controls at the picture. n and the bounds sit right under the graph, and the
        // bounds are also handles ON the graph (role=slider, arrow keys); the range sliders stay as the fallback. ──
        var BOUND_RANGE = { xMin: [-3, 4], xMax: [1, 10] };
        function boundPatch(k, v) {
          var p = { overUnderChecked: false, overUnderGuess: null, overUnderTries: 0, predictSubmitted: false, antiChecked: false };
          p[k] = v;
          if (k === 'n') p.nExplored = true;
          return p;
        }
        function boundLimits(k) {
          var r = BOUND_RANGE[k];
          // A bound already outside the usual range (Derivative's View left goes to -5) widens its own side, so a key never jumps it the wrong way.
          if (k === 'xMin') { var aLo = Math.min(r[0], xMin); return [aLo, Math.max(aLo, Math.min(Math.max(r[1], xMin), xMax2 - 0.5))]; }
          var bHi = Math.max(r[1], xMax2);
          return [Math.min(bHi, Math.max(Math.min(r[0], xMax2), xMin + 0.5)), bHi];
        }
        function setBound(k, v) {
          var lim = boundLimits(k);
          v = Math.max(lim[0], Math.min(lim[1], Math.round(v * 2) / 2));
          if (!finiteCoord(v) || v === (k === 'xMin' ? xMin : xMax2)) return false;
          var p = boundPatch(k, v);
          p.xMin = k === 'xMin' ? v : xMin;
          p.xMax = k === 'xMax' ? v : xMax2;
          updMany(p);
          return true;
        }
        function boundKey(k, e) {
          var cur = k === 'xMin' ? xMin : xMax2, lim = boundLimits(k), v = null;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = cur + 0.5;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = cur - 0.5;
          else if (e.key === 'PageUp') v = cur + 2;
          else if (e.key === 'PageDown') v = cur - 2;
          else if (e.key === 'Home') v = lim[0];
          else if (e.key === 'End') v = lim[1];
          if (v === null) return;
          e.preventDefault();
          setBound(k, v);
        }
        function boundPointer(k, phase, e) {
          var target = e.currentTarget, svg = target && (target.ownerSVGElement || target);
          if (phase === 'down') {
            if (e.button != null && e.button !== 0) return;
            e.preventDefault();
            try { target.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
            try { target.focus({ preventScroll: true }); } catch (err2) { /* not focusable */ }
            setUi({ boundDrag: { k: k, v0: k === 'xMin' ? xMin : xMax2, xR: { min: gmMain.xR.min, max: gmMain.xR.max } } });
            return;
          }
          var drag = ui.boundDrag;
          if (!drag || drag.k !== k) return;
          if (phase === 'move') {
            var vx = null, ctm = svg && svg.getScreenCTM ? svg.getScreenCTM() : null;
            if (ctm && svg.createSVGPoint) { var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; vx = pt.matrixTransform(ctm.inverse()).x; }
            else if (svg && svg.getBoundingClientRect) { var r = svg.getBoundingClientRect(); if (r.width) vx = (e.clientX - r.left) / r.width * gmMain.W; }
            if (vx === null || !finiteCoord(vx)) return;
            var xr = drag.xR, xv = xr.min + (vx - pad) / (gmMain.W - 2 * pad) * (xr.max - xr.min);
            // At the edge of the frozen window, the window grows a step so a bound can travel its whole range.
            if (k === 'xMax' && xv > xr.max - 0.3 && xr.max < BOUND_RANGE.xMax[1] + 0.5) setUi({ boundDrag: Object.assign({}, drag, { xR: { min: xr.min, max: Math.min(BOUND_RANGE.xMax[1] + 0.5, xr.max + 1) } }) });
            if (k === 'xMin' && xv < xr.min + 0.3 && xr.min > BOUND_RANGE.xMin[0] - 0.5) setUi({ boundDrag: Object.assign({}, drag, { xR: { min: Math.max(BOUND_RANGE.xMin[0] - 0.5, xr.min - 1), max: xr.max } }) });
            setBound(k, xv);
            return;
          }
          setUi({ boundDrag: null });
          // A tap, or a swipe the browser took over to scroll the page, moved nothing: nothing to say.
          if ((k === 'xMin' ? xMin : xMax2) !== drag.v0) say(fillT(k === 'xMin' ? __alloT('stem.calculus.sr_bound_a', 'Lower bound a is now {v}.') : __alloT('stem.calculus.sr_bound_b', 'Upper bound b is now {v}.'), { v: calcFmtNum(k === 'xMin' ? xMin : xMax2) }));
        }
        function integralGraph() {
          var m = gmMain, drag = ui.boundDrag;
          var handle = function(k) {
            var val = k === 'xMin' ? xMin : xMax2, x = m.toSX(val), lim = boundLimits(k), active = ui.hFocus === k || !!(drag && drag.k === k), gy = H - pad + 4;
            var hitW = Math.max(44, 44 * m.W / (ui.plotW || m.W)); // 44 CSS px on a phone, where one viewBox unit is less than a pixel
            if (!finiteCoord(x)) return null;
            return h('g', { key: k, role: 'slider', tabIndex: 0, 'data-calc-bound-handle': k, 'aria-orientation': 'horizontal',
              'aria-label': k === 'xMin' ? __alloT('stem.calculus.handle_a', 'Lower bound a, on the graph') : __alloT('stem.calculus.handle_b', 'Upper bound b, on the graph'),
              'aria-valuemin': lim[0], 'aria-valuemax': lim[1], 'aria-valuenow': val,
              'aria-valuetext': fillT(k === 'xMin' ? __alloT('stem.calculus.handle_a_text', 'a = {v}') : __alloT('stem.calculus.handle_b_text', 'b = {v}'), { v: calcFmtNum(val) }),
              onKeyDown: function(e) { boundKey(k, e); },
              onFocus: function() { setUi({ hFocus: k }); },
              onBlur: function() { setUi({ hFocus: null }); },
              onPointerDown: function(e) { boundPointer(k, 'down', e); },
              onPointerMove: function(e) { boundPointer(k, 'move', e); },
              onPointerUp: function(e) { boundPointer(k, 'up', e); },
              onPointerCancel: function(e) { boundPointer(k, 'up', e); },
              style: { cursor: 'ew-resize', outline: 'none', pointerEvents: 'all' } },
              h('rect', { x: x - hitW / 2, y: pad - 8, width: hitW, height: H - 2 * pad + 34, fill: 'transparent' }),
              h('line', { x1: x, y1: pad, x2: x, y2: H - pad, stroke: '#b91c1c', strokeWidth: active ? 3 : 2 }),
              active && h('rect', { x: x - 17, y: gy - 4, width: 34, height: 28, rx: 8, fill: 'none', stroke: ctx.isContrast ? '#ffff00' : '#0f172a', strokeWidth: 2, strokeDasharray: '4 2' }),
              h('rect', { x: x - 13, y: gy, width: 26, height: 20, rx: 6, fill: '#b91c1c', stroke: '#ffffff', strokeWidth: 2 }),
              h('text', { x: x, y: gy + 14.5, textAnchor: 'middle', fill: '#ffffff', 'aria-hidden': 'true', style: { fontSize: '13px', fontWeight: 900 } }, k === 'xMin' ? 'a' : 'b'));
          };
          return h('div', { ref: _intGraphRef, style: { position: 'relative' }, 'data-calc-int-graph': true },
            svgGraph(false, true),
            h('svg', { viewBox: '0 0 ' + m.W + ' ' + H, role: 'group', 'aria-label': __alloT('stem.calculus.handles_group', 'Bounds you can drag'), className: 'rounded-xl border-2 border-transparent',
              style: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', touchAction: 'pan-y' } },
              handle('xMin'), handle('xMax')));
        }
        function integralGraphControls() {
          var items = [
            { k: 'n', label: __alloT('stem.calculus.slider_n', 'n (subdivisions)'), min: 2, max: 50, step: mode === 'simpson' ? 2 : 1, val: nRects },
            { k: 'xMin', label: __alloT('stem.calculus.slider_lower', 'Lower a'), min: -3, max: 4, step: 0.5, val: xMin },
            { k: 'xMax', label: __alloT('stem.calculus.slider_upper', 'Upper b'), min: 1, max: 10, step: 0.5, val: xMax2 }
          ];
          return h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2', 'data-calc-graph-controls': true },
            items.map(function(s) {
              return h('div', { key: s.k, className: 'bg-slate-50 rounded-lg border px-2 pt-1' },
                h('label', { htmlFor: 'calc-int-' + s.k, className: 'block text-center text-[0.6875rem] font-bold text-red-700' }, s.label + ': ' + s.val),
                h('input', { id: 'calc-int-' + s.k, type: 'range', min: Math.min(s.min, s.val), max: Math.max(s.max, s.val), step: s.step, value: s.val, 'aria-label': s.label,
                  onChange: function(e) { var v = parseFloat(e.target.value); if (s.k === 'n') updMany(boundPatch('n', v)); else setBound(s.k, v); }, className: 'w-full accent-red-600', style: { height: 36 } }));
            }));
        }
        // ── FEWEST RECTANGLES: offered only once this problem's over/under question is answered. The target
        // and the fewest n come from the same sums the graph draws. No XP: it is exploration with the n slider. ──
        function fewestTarget() {
          if (!exactOk || !exactProper) return null;
          var cache = window._calcFewCache || (window._calcFewCache = {}), key = probKey + '|' + mode;
          if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];
          if (Object.keys(cache).length > 30) window._calcFewCache = cache = {};
          var step = mode === 'simpson' ? 2 : 1, errs = {}, allExact = true;
          for (var n = 2; n <= 50; n += step) {
            var r = calcRiemann(evalF, xMin, xMax2, n, mode), e = r && finiteCoord(r.value) ? Math.abs(r.value - exact) : NaN;
            errs[n] = e;
            if (!(e < 1e-9)) allExact = false;
          }
          var out = { errs: errs, step: step, exactAll: allExact, tol: null, minN: null };
          if (!allExact) {
            var TOLS = [1, 0.5, 0.1, 0.05, 0.01, 0.005, 0.001, 0.0005, 0.0001];
            for (var i = 0; i < TOLS.length; i++) {
              var minN = null;
              for (var n2 = 2; n2 <= 50; n2 += step) { if (errs[n2] < TOLS[i]) { minN = n2; break; } }
              if (minN === null) break;
              if (minN >= 4) { out.tol = TOLS[i]; out.minN = minN; break; }
            }
          }
          cache[key] = out;
          return out;
        }
        function fewestPanel() {
          var T = fewestTarget();
          if (!T) return null;
          if (T.exactAll) return h('p', { className: 'mt-2 rounded-xl border border-slate-400 bg-white p-2 text-xs text-slate-800', 'data-calc-fewest': 'exact' },
            fillT(__alloT('stem.calculus.few_exact_all', 'The {method} estimate is exact here for every n, so there is no fewest-rectangles challenge for it. Try another method.'), { method: methodWord(mode) }));
          if (T.tol === null) return null;
          var fkey = probKey + '|' + mode + '|' + T.tol;
          var st = d.fewest && typeof d.fewest === 'object' && d.fewest.key === fkey && finiteCoord(d.fewest.lastN) && d.fewest.lastN >= 1 && d.fewest.lastN <= 200 ? d.fewest : { key: fkey, tries: 0 };
          var errAt = function(n) { var e = T.errs[n]; return finiteCoord(e) ? e : Math.abs(calcRiemann(evalF, xMin, xMax2, n, mode).value - exact); };
          var tolS = calcFmtNum(T.tol), fmtE = function(e) { return fix(e, 6); };
          var resultText = function(s) {
            if (s.shown) return fillT(__alloT('stem.calculus.few_shown', 'The fewest is n = {m}, with an error of {e}.'), { m: T.minN, e: fmtE(errAt(T.minN)) });
            if (!s.tries) return '';
            var n = s.lastN, e = errAt(n);
            if (!finiteCoord(e)) return fillT(__alloT('stem.calculus.few_undefined', 'n = {n} lands on a point where f is undefined, so that sum has no value. Try another n.'), { n: n });
            if (!(e < T.tol) && n > T.minN) return fillT(__alloT('stem.calculus.few_bumpy', 'n = {n} gives an error of {e}, which is not under {tol}. On this curve the error does not shrink steadily as n grows, so try another n.'), { n: n, e: fmtE(e), tol: tolS });
            if (!(e < T.tol)) return fillT(__alloT('stem.calculus.few_high', 'n = {n} gives an error of {e}, which is not under {tol} yet. Try more subdivisions.'), { n: n, e: fmtE(e), tol: tolS });
            if (n > T.minN) return fillT(__alloT('stem.calculus.few_more', 'n = {n} works: its error {e} is under {tol}. Fewer subdivisions also work. Can you go lower?'), { n: n, e: fmtE(e), tol: tolS });
            return fillT(__alloT('stem.calculus.few_best', 'Fewest possible! n = {n} gives an error of {e}, under {tol}, but n = {p} gives {ep}, which is not.'), { n: n, e: fmtE(e), tol: tolS, p: n - T.step, ep: fmtE(errAt(n - T.step)) });
          };
          var lock = function() {
            var next = { key: fkey, tries: (st.tries || 0) + 1, lastN: nRects, shown: false };
            updMany({ fewest: next });
            say(resultText(next));
          };
          var res = resultText(st), won = !st.shown && st.tries > 0 && st.lastN === T.minN;
          return h('section', { className: 'mt-2 rounded-xl border-2 border-red-300 bg-white p-3 text-slate-900', 'data-calc-fewest': String(T.tol), 'aria-labelledby': 'calc-few-title' },
            h('h3', { id: 'calc-few-title', className: 'text-sm font-black text-red-800' }, __alloT('stem.calculus.few_title', 'Fewest rectangles challenge')),
            h('p', { className: 'mt-1 text-xs' }, fillT(__alloT('stem.calculus.few_task', 'Find the fewest subdivisions n that make the {method} error smaller than {tol}. Change n with the slider under the graph and watch the error, then lock in your n.'), { method: methodWord(mode), tol: tolS })),
            h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
              h('p', { className: 'text-xs font-bold font-mono', 'data-calc-fewest-now': nRects }, fillT(__alloT('stem.calculus.few_now', 'Now: n = {n}, error {e}'), { n: nRects, e: fmtE(errAt(nRects)) })),
              h('button', { type: 'button', onClick: lock, 'data-calc-fewest-lock': nRects, className: 'min-h-[44px] px-4 rounded-lg text-xs font-bold bg-red-700 text-white' }, fillT(__alloT('stem.calculus.few_lock', 'Lock in n = {n}'), { n: nRects })),
              !noReveal && !st.shown && !won && (st.tries || 0) >= 2 && h('button', { type: 'button', onClick: function() { var s2 = Object.assign({}, st, { shown: true }); _focusAfter.current = ['[data-calc-fewest-lock]']; updMany({ fewest: s2 }); say(resultText(s2)); },
                className: 'min-h-[44px] px-3 rounded-lg text-xs font-bold bg-white text-slate-900 border border-slate-600' }, __alloT('stem.calculus.few_show', 'Show the fewest'))),
            res && h('p', { className: 'mt-2 text-sm font-bold ' + (won ? 'text-emerald-800' : 'text-slate-800'), 'data-calc-fewest-result': won ? 'best' : st.shown ? 'shown' : 'tried' },
              won && h('span', { 'aria-hidden': 'true' }, '🏆 '), res));
        }

        return h('div', { ref: _shellRef, className: 'calculus-shell max-w-5xl mx-auto animate-in fade-in duration-200', style: { position: 'relative' } },

          (ctx.renderTutorial || function () { return null; })('calculus', ctx._tutCalculus || []),
          h('style', null, css),

          // Header
          h('section', { 'data-calculus-command': 'true', className: 'mb-4 overflow-hidden rounded-2xl border border-sky-300/40 bg-gradient-to-br from-slate-950 via-sky-950 to-violet-950 text-white shadow-xl' },
            h('div', { className: 'p-3 sm:p-4' },
              h('div', { className: 'flex flex-col gap-2' },
                h('div', { className: 'min-w-0' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('button', { onClick: function(){setStemLabTool(null);}, className: 'shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-sky-300', 'aria-label': __alloT('stem.calculus.a11y_back_to_tools', 'Back to tools') }, h(ArrowLeft, {size:18})),
                    h('span', { className: 'rounded-full bg-sky-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-sky-100 ring-1 ring-sky-200/30' }, __alloT('stem.calculus.badge_studio', 'Concept studio'))
                  ),
                  h('h3', { className: 'mt-3 text-xl font-black tracking-tight sm:text-2xl' }, '\u222B ' + __alloT('stem.calculus.title', 'Calculus Explorer')),
                  h('p', { className: 'mt-1 max-w-2xl text-sm leading-6 text-sky-100' }, __alloT('stem.calculus.subtitle', 'Connect change, accumulation, and limits through graphs, numerical evidence, and explanation.')),
                  h('div', { className: 'mt-2 flex flex-wrap items-center gap-1.5', role: 'group', 'aria-label': __alloT('stem.calculus.band_group', 'Course level') },
                    h('span', { className: 'text-[0.6875rem] font-bold text-sky-100 mr-1' }, __alloT('stem.calculus.band_group', 'Course level')),
                    BANDS.map(function(b) {
                      var on = band === b;
                      return h('button', { key: b, type: 'button', 'aria-pressed': on, disabled: bandLocked && !on, onClick: function() { if (!bandLocked) { updMany({ calcBand: b, calcQuiz: null, matchQuiz: null }); say(fillT(__alloT('stem.calculus.sr_band', 'Level set to {b}.'), { b: bandLabel(b) })); } },
                        className: 'min-h-[32px] px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (on ? 'bg-sky-300 text-slate-950 border-sky-200' : 'bg-white/10 text-white border-white/30 hover:bg-white/20 disabled:opacity-50') }, bandLabel(b));
                    }),
                    bandLocked && h('span', { className: 'text-[0.6875rem] text-sky-100 ml-1' }, __alloT('stem.calculus.band_locked', '(set by your teacher)'))
                  )
                )
              )
            )
          ),

          // One guide only: the path's one-line Next. On a phone, the Integral and Derivative graphs come first.
          !(narrow && (tab === 'integral' || tab === 'derivative')) && learningPath(),
          teacherPanel(),

          // Tab bar
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))' }, className: 'gap-1 mb-3 border-b border-slate-200', role: 'tablist', 'aria-label': __alloT('stem.calculus.a11y_calculus_tool_sections', 'Calculus Tool sections') },
            CALCULUS_TABS.map(function(item, tabIndex){
              // Visual group headings only (aria-hidden): the path above names the core activities.
              var groupHead = tabIndex === 0 ? __alloT('stem.calculus.tabs_core', 'Core for this level') : tabIndex === coreTabIds.length ? __alloT('stem.calculus.tabs_more', 'More activities') : null;
              return [groupHead && h('span', { key: 'head-' + tabIndex, 'aria-hidden': 'true', style: { gridColumn: '1 / -1' }, className: 'pt-1 text-[0.625rem] font-black uppercase tracking-wider text-slate-700' + onHostInk }, groupHead),
                h('button',{ key:item[0], id:'calculus-tab-'+item[0], 'aria-controls':'calculus-panel-'+item[0], onClick:function(){upd('tab',item[0]);}, onKeyDown:function(e){calculusTabKeyDown(e, tabIndex);}, role:'tab','aria-selected':tab===item[0], tabIndex:tab===item[0]?0:-1, style:{minHeight:44,whiteSpace:'normal',overflowWrap:'anywhere'}, className:'px-3 py-2 text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-red-400 '+(tab===item[0]?'border-b-2 border-red-600 text-red-700 -mb-px':('text-slate-600 hover:text-slate-700' + onHostInk))},item[1])];
            })
          ),

          // The active tab panel wraps the topic band and all of that tab's content.
          h('div', { role: 'tabpanel', id: 'calculus-panel-' + tab, 'aria-labelledby': 'calculus-tab-' + tab, tabIndex: 0, className: 'focus:outline-none focus:ring-2 focus:ring-red-300 rounded-xl' },

          // ── Topic-accent hero band per tab ──
          (function() {
            var TAB_META = {
              integral:   { accent: '#b91c1c', soft: 'rgba(220,38,38,0.10)',  icon: '\u222B', title: __alloT('stem.calculus.hero_integral_title', 'Integral: signed area'), hint: __alloT('stem.calculus.hero_integral_hint', 'Riemann sums (left, right, midpoint, trapezoid, Simpson) approximate the integral. As n \u2192 \u221E, the limit is the signed integral. For smooth curves, Simpson\'s rule often converges fastest here and integrates every polynomial through degree 3 exactly when n is even.') },
              derivative: { accent: '#0369a1', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCC8', title: __alloT('stem.calculus.hero_derivative_title', 'Derivative: slope at a point'), hint: __alloT('stem.calculus.hero_derivative_hint', 'lim(h\u21920) [f(x+h)\u2212f(x)]/h is the slope of the tangent line. Watch one-sided and centred secant slopes approach it, then connect the graph of f to the graph of f\u2032.') },
              limits:     { accent: '#0f766e', soft: 'rgba(13,148,136,0.10)', icon: '\u2192', title: __alloT('stem.calculus.hero_limits_title', 'Limits: what f approaches'), hint: __alloT('stem.calculus.hero_limits_hint', 'A limit looks NEAR a point, not at it. Compare values from the left and from the right to spot holes, jumps, vertical asymptotes and oscillation.') },
              visualize:  { accent: '#7e22ce', soft: 'rgba(168,85,247,0.10)', icon: '\uD83C\uDFAC', title: __alloT('stem.calculus.hero_visualize_title', 'Visualize: see the math move'), hint: __alloT('stem.calculus.hero_visualize_hint', 'Every view has its own controls and a text description. Animations play only until you touch a control, and never when your device asks for reduced motion.') },
              challenge:  { accent: '#92400e', soft: 'rgba(245,158,11,0.10)', icon: '\uD83C\uDFAF', title: __alloT('stem.calculus.hero_challenge_title', 'Challenge: practice that never runs out'), hint: __alloT('stem.calculus.hero_challenge_hint', 'Commit to an answer first. A wrong answer gets a named misconception and a second try before anything is revealed. Hints come in three steps.') },
              discover:   { accent: '#166534', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83D\uDD2C', title: __alloT('stem.calculus.hero_discover_title', 'Discover: the big ideas'), hint: __alloT('stem.calculus.hero_discover_hint', 'Fundamental Theorem of Calculus: integration and differentiation undo each other. Newton and Leibniz found it independently in the 1670s.') },
              series:     { accent: '#86198f', soft: 'rgba(192,38,211,0.10)', icon: '\u03A3', title: __alloT('stem.calculus.hero_series_title', 'Series: adding forever'), hint: __alloT('stem.calculus.hero_series_hint', 'An infinite series converges when its partial sums settle. Terms shrinking to 0 is needed but not enough: the harmonic series proves it.') },
              apply:      { accent: '#9a3412', soft: 'rgba(234,88,12,0.10)', icon: '\uD83E\uDE9C', title: __alloT('stem.calculus.hero_apply_title', 'Rates and optimization: you build the model'), hint: __alloT('stem.calculus.hero_apply_hint', 'Write the relationship that holds at every moment, differentiate it with respect to time, and only then substitute the numbers for this instant.') },
              frq:        { accent: '#075985', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCDD', title: __alloT('stem.calculus.hero_frq_title', 'AP free response: show the reasoning'), hint: __alloT('stem.calculus.hero_frq_hint', 'Each part earns its own points. Justifications need a reason, such as a sign change, not just a value.') },
              derivHunt:  { accent: '#6d28d9', soft: 'rgba(109,40,217,0.10)', icon: '\u2753', title: __alloT('stem.calculus.hero_inquiry_title', 'Inquiry: derivative behaviour'), hint: __alloT('stem.calculus.hero_inquiry_hint', 'Vary one coefficient or the x-point at a time, log what you observe, and build a rule for when a quadratic increases, decreases, or reaches an extremum.') }
            };
            var meta = TAB_META[tab] || TAB_META.integral;
            return h('div', {
              style: {
                margin: '0 0 12px',
                padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                border: '1px solid ' + meta.accent + '55',
                borderLeft: '4px solid ' + meta.accent,
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
              }
            },
              h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                h('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45 } }, meta.hint)
              )
            );
          })(),

          // ══════════════════════════════════════════════════════════════
          // TAB: INTEGRAL
          // ══════════════════════════════════════════════════════════════
          tab === 'integral' && h('div', { key: 'integral' },

            functionBox('integral'),

            // Method selector
            h('div', { className: 'flex flex-wrap gap-1 mb-3', role: 'group', 'data-calc-methods': true, 'aria-label': __alloT('stem.calculus.method_group', 'Approximation method') },
              MODES.map(function(m){
                return h('button',{ key:m.id, type:'button', 'aria-pressed':mode===m.id, onClick:function(){updMany(Object.assign({ mode: m.id, methodsUsed: Object.assign({}, d.methodsUsed, {[m.id]:true}), overUnderChecked:false, overUnderGuess:null, overUnderTries:0 }, m.id==='simpson'&&nRects%2!==0 ? { n: nRects+1 } : {}));},className:'min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all '+(mode===m.id?'bg-red-600 text-white shadow-md':'bg-slate-100 text-slate-700 hover:bg-red-50')},m.label);
              })
            ),

            integralGraph(),
            integralGraphControls(),
            narrow && h('div', { className: 'mt-3' }, learningPath()),
            graphAccessPanel('calc-ga-integral'),

            // ── OVER/UNDER PREDICTION (active learning): two tries before the reveal ──
            // Asked on every method while this problem's exact value is still hidden.
            exactOk && exactProper && !predictOpen && (ouPending || overUnderChecked) && h('div', { className: 'mt-2 bg-slate-50 rounded-xl border p-3', 'data-calc-overunder': mode, style:{animation:'calcFade 0.3s ease'} },
              h('p', { className: 'text-xs font-bold text-slate-800 mb-2' },
                !areaOk ? __alloT('stem.calculus.ou_no_estimate', 'This sum lands on a point where f is undefined, so it has no value to compare. Change n or choose another method.')
                : (mode === 'left' || mode === 'right')
                  ? fillT(__alloT('stem.calculus.ou_prompt', 'Compare this {method} Riemann sum with the exact integral: is it OVER, EXACT, or UNDER?'), { method: methodWord(mode) })
                  : fillT(__alloT('stem.calculus.ou_prompt_any', 'Compare this {method} estimate with the exact integral: is it OVER, EXACT, or UNDER?'), { method: methodWord(mode) })
              ),
              areaOk && !overUnderChecked && (d.overUnderTries || 0) > 0 && h('p', { role: 'status', 'aria-live': 'polite', className: 'text-xs font-bold text-red-800 mb-2' },
                fillT((d.overUnderTries || 0) >= 2 ? __alloT('stem.calculus.ou_tries_used', 'Not quite. {msg}') : __alloT('stem.calculus.ou_try_again', 'Not yet. {msg} One more try.'), { msg: misconceptionText(calcOverUnderMisconception(useTyped ? { fnText: fnText, xMin: xMin, xMax: xMax2, ruleMode: mode } : { a: fa, b: fb, c: fc, xMin: xMin, xMax: xMax2, ruleMode: mode }), '') })),
              areaOk && !overUnderChecked && (d.overUnderTries || 0) >= 2 && h('div', { className: 'text-slate-900' }, revealOffer(function() { _focusAfter.current = ['[data-calc-ou-result]']; updMany({ overUnderChecked: true, ouAnswered: probKey }); },
                { onNew: function() { _focusAfter.current = ['[data-calc-overunder] button:not([disabled])']; updMany({ n: nRects >= 40 ? 6 : nRects + (mode === 'simpson' ? 2 : 3), overUnderTries: 0, overUnderGuess: null, overUnderChecked: false, nExplored: true }); }, newLabel: __alloT('stem.calculus.ou_new', 'New problem: change n') })),
              !overUnderChecked && (!areaOk || (d.overUnderTries || 0) < 2) && h('div', { className: 'flex gap-2 flex-wrap' },
                areaOk && [['over', __alloT('stem.calculus.a11y_overestimate', 'OVERestimate'), '\u2B06 ' + __alloT('stem.calculus.ou_over', 'OVERestimate'), 'bg-red-100 text-red-800 hover:bg-red-200 transition-all border-2 border-red-600'],
                 ['under', __alloT('stem.calculus.a11y_underestimate', 'UNDERestimate'), '\u2B07 ' + __alloT('stem.calculus.ou_under', 'UNDERestimate'), 'bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all border-2 border-blue-600'],
                 ['exact', __alloT('stem.calculus.a11y_exact_estimate', 'Exact estimate'), '= ' + __alloT('stem.calculus.ou_exact', 'EXACT'), 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all border-2 border-emerald-600']].map(function(b) {
                  var triedThis = d.overUnderGuess === b[0] && (d.overUnderTries || 0) > 0;
                  return h('button', { key: b[0], type: 'button', 'aria-label': b[1], disabled: triedThis,
                    onClick: function(){
                      stemBeep&&stemBeep('click');
                      if (b[0] === actualOverUnder) { _focusAfter.current = ['[data-calc-ou-result]']; updMany({ overUnderGuess: b[0], overUnderChecked: true, ouAnswered: probKey }); }
                      else { var ouT = (d.overUnderTries || 0) + 1; _focusAfter.current = ouT >= 2 ? ['[data-calc-reveal-offer] button'] : ['[data-calc-overunder] button:not([disabled])']; updMany({ overUnderGuess: b[0], overUnderTries: ouT }); say(ouT >= 2 ? __alloT('stem.calculus.sr_ou_used', 'Not quite. Both tries are used.') : __alloT('stem.calculus.sr_ou_wrong', 'Not yet. Read the hint and try once more.')); }
                    },
                    className: 'flex-1 min-w-[96px] min-h-[36px] py-2 rounded-lg text-xs font-bold disabled:opacity-40 ' + b[3] }, b[2]);
                }),
                !noReveal && h('button', { type: 'button', onClick: function(){ _focusAfter.current = ['[data-calc-ou-result]', '[data-calc-methods] button[aria-pressed="true"]']; updMany({ overUnderGuess: 'skip', overUnderChecked: true, ouSkipped: probKey }); }, className: 'min-h-[36px] px-2 py-2 rounded-lg text-[0.6875rem] font-bold text-slate-700 underline' }, __alloT('stem.calculus.ou_skip', 'Show the exact value without answering'))
              ),
              overUnderChecked && (function(){
                var skipped = overUnderGuess === 'skip';
                var correct = overUnderGuess === actualOverUnder;
                var isOver = actualOverUnder === 'over';
                var isExact = actualOverUnder === 'exact';
                var comparisonText = isExact ? __alloT('stem.calculus.ou_is_exact', 'The estimate is EXACT at this resolution.') : isOver ? __alloT('stem.calculus.ou_is_over', 'It is an OVERestimate.') : __alloT('stem.calculus.ou_is_under', 'It is an UNDERestimate.');
                var reasoningText = isExact
                  ? fillT(__alloT('stem.calculus.ou_reason_exact', 'The numerical error is effectively zero: {a} matches {b}.'), { a: fix(area, 4), b: exact.toFixed(4) })
                  : (mode === 'midpoint' || mode === 'trapezoid' || mode === 'simpson')
                    ? (function() {
                      // A bending rule is quoted only when it agrees with the computed comparison.
                      var up = shapeFacts.concaveUp, down = shapeFacts.concaveDown;
                      if (mode === 'midpoint' && up && !isOver) return __alloT('stem.calculus.ou_reason_mid_up', 'The curve bends upward (concave up). A midpoint rectangle has the same area as the tangent line at its midpoint, and that line lies below the curve, so the midpoint sum underestimates.');
                      if (mode === 'midpoint' && down && isOver) return __alloT('stem.calculus.ou_reason_mid_down', 'The curve bends downward (concave down). A midpoint rectangle has the same area as the tangent line at its midpoint, and that line lies above the curve, so the midpoint sum overestimates.');
                      if (mode === 'trapezoid' && up && isOver) return __alloT('stem.calculus.ou_reason_trap_up', 'The curve bends upward (concave up), so the top edge of each trapezoid, a chord, lies above the curve: the trapezoid sum overestimates.');
                      if (mode === 'trapezoid' && down && !isOver) return __alloT('stem.calculus.ou_reason_trap_down', 'The curve bends downward (concave down), so the top edge of each trapezoid, a chord, lies below the curve: the trapezoid sum underestimates.');
                      if (mode === 'simpson') return fillT(__alloT('stem.calculus.ou_reason_simpson_v2', 'Simpson’s rule fits a parabola to each pair of strips, so it is exact only for polynomials up to degree 3. This estimate is not exact: compare {a} with {b}.'), { a: fix(area, 6), b: exact.toFixed(6) });
                      return fillT(__alloT('stem.calculus.ou_reason_bend_mixed', 'The curve changes how it bends on this interval, so no shortcut rule decides it. Compare the estimate {a} with the exact value {b}.'), { a: fix(area, 4), b: exact.toFixed(4) });
                    })()
                  : shapeFacts.negative && shapeFacts.positive
                    ? misconceptionText('forgot_signed', '')
                  : fMonotonic
                    ? (mode==='left'
                      ? (fIsIncreasing ? __alloT('stem.calculus.ou_reason_left_inc', 'The function is rising, so left endpoints miss area above the rectangles.') : __alloT('stem.calculus.ou_reason_left_dec', 'The function is falling, so left endpoints make the rectangles overshoot.'))
                      : (fIsIncreasing ? __alloT('stem.calculus.ou_reason_right_inc', 'The function is rising, so right endpoints make the rectangles overshoot.') : __alloT('stem.calculus.ou_reason_right_dec', 'The function is falling, so right endpoints miss area above the rectangles.')))
                    : fillT(__alloT('stem.calculus.ou_reason_mixed', 'The curve changes direction on this interval, so an endpoint rule alone cannot predict the result. Compare the estimate {a} with the exact value {b}.'), { a: fix(area, 4), b: exact.toFixed(4) });
                return h('div', { 'data-calc-ou-result': true, tabIndex: -1, style:{animation:'calcPop 0.3s ease'}},
                  h('p', { role:'status', 'aria-live':'polite', className: 'text-sm font-bold mb-1 ' + (skipped ? 'text-slate-800' : correct?'text-emerald-700':'text-red-700') },
                    (skipped ? '' : correct ? '\u2705 ' + __alloT('stem.calculus.correct_bang', 'Correct!') + ' ' : __alloT('stem.calculus.not_quite', 'Not quite:') + ' ') + comparisonText
                  ),
                  h('p', { className: 'text-xs text-slate-700' }, '\uD83D\uDCA1 ' + reasoningText),
                  h('button', {"aria-label":__alloT('stem.calculus.a11y_reset', 'Reset'), type:'button', onClick:function(){_focusAfter.current = ['[data-calc-overunder] button:not([disabled])']; updMany({ overUnderChecked:false, overUnderGuess:null, overUnderTries:0, ouAnswered:null, ouSkipped:null, fewest:null });}, className:'transition-colors mt-1 min-h-[28px] text-[0.6875rem] text-slate-700 hover:text-slate-900 font-bold' }, '\u21BA ' + __alloT('stem.calculus.reset', 'Reset'))
                );
              })()
            ),

            ouAnsweredHere && !predictOpen && fewestPanel(),

            // ── NUMERICAL ESTIMATE mode ───────────────────────────────────
            h('div', { className: 'mt-3 flex items-center gap-2 mb-1 flex-wrap' },
              h('button', { type:'button', 'aria-pressed':predictMode, onClick: function(){ updMany({ predictMode: !predictMode, predictSubmitted: false, predictInput: '' }); },
                className: 'min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (predictMode?'bg-violet-600 text-white':'bg-violet-50 text-violet-700 border border-violet-600 hover:bg-violet-100')
              }, '\uD83D\uDCCF ' + (predictMode ? __alloT('stem.calculus.estimate_on', 'Estimate Mode ON') : __alloT('stem.calculus.estimate_try', 'Try Estimate Mode'))),
              !predictMode && h('span', { className: 'text-[0.6875rem] text-slate-700' + onHostInk }, __alloT('stem.calculus.estimate_explain', 'Estimate the integral before it is revealed.'))
            ),

            predictMode && !predictSubmitted && h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-4', 'data-calculus-estimation-challenge': 'quantitative-calibration', style:{animation:'calcFade 0.3s ease'} },
              h('p', { className: 'text-sm font-bold text-violet-800 mb-1' }, '\uD83D\uDCCF ' + fillT(__alloT('stem.calculus.estimate_question', 'What do you estimate the integral of f from {a} to {b} to be?'), { a: xMin, b: xMax2 })),
              h('p', { className: 'text-xs text-violet-700 mb-1' }, __alloT('stem.calculus.estimate_tip', 'Look at the graph. Think about average height \u00D7 width. Do not compute: just estimate.')),
              h('p', { className: 'text-[0.6875rem] text-violet-700 mb-3' }, __alloT('stem.calculus.estimate_ungraded', 'This is quantitative calibration practice. The displayed difference is descriptive feedback, not a grade.')),
              h('div', { className: 'flex flex-col sm:flex-row gap-2' },
                h('input', {style:{minWidth:0,background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},  type:'number', step:'any', placeholder:__alloT('stem.calculus.my_estimate','My estimate...'), value: predictInput, onChange: function(e){upd('predictInput',e.target.value);}, onKeyDown: function(e){if(e.key==='Enter'&&predictInput)updMany({ predictSubmitted: true, ouSkipped: probKey });}, 'aria-label': __alloT('stem.calculus.a11y_integral_estimate_input', 'Integral estimate input'), className:'flex-1 px-3 py-2 border-2 border-violet-600 rounded-lg text-sm font-bold text-violet-900 focus:border-violet-500' }),
                h('button', {"aria-label":__alloT('stem.calculus.a11y_compare_estimate_with_exact_integral', 'Compare estimate with exact integral'), type:'button', disabled:!predictInput, onClick:function(){if(predictInput)updMany({ predictSubmitted: true, ouSkipped: probKey });}, className:'transition-colors min-h-[36px] px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50' }, __alloT('stem.calculus.estimate_commit', 'Commit and compare') + ' \u2192')
              )
            ),

            predictMode && predictSubmitted && (function(){
              var pred = parseFloat(predictInput);
              if (!exactOk) return h('p', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-4 text-sm text-violet-900', role: 'status' }, __alloT('stem.calculus.estimate_improper', 'This integral is improper (the function is undefined or unbounded on the interval), so there is no finite value to compare with.'));
              var absDiff = Math.abs(pred - exact);
              var pctOff = exact !== 0 ? absDiff / Math.abs(exact) * 100 : null;
              return h('div', { className: 'bg-violet-50 border-2 border-violet-300 rounded-xl p-4', 'data-calculus-estimate-comparison': 'descriptive-calibration-ungraded', style:{animation:'calcFade 0.3s ease'} },
                h('div', { className: 'grid grid-cols-3 gap-2 text-center mb-3' },
                  h('div', { className: 'p-2 bg-white rounded-lg border border-violet-200' },
                    h('p', { className: 'text-[0.6875rem] font-bold text-violet-700 uppercase' }, __alloT('stem.calculus.committed_estimate', 'Committed Estimate')),
                    h('p', { className: 'text-lg font-black text-violet-700' }, fix(pred, 3))
                  ),
                  h('div', { className: 'p-2 bg-white rounded-lg border border-emerald-200' },
                    h('p', { className: 'text-[0.6875rem] font-bold text-emerald-700 uppercase' }, improperConv ? __alloT('stem.calculus.exact_label_imp', 'Improper (convergent)') : __alloT('stem.calculus.exact_integral', 'Exact Integral')),
                    h('p', { className: 'text-lg font-black text-emerald-700', style:{animation:'calcPop 0.4s ease'} }, exact.toFixed(4))
                  ),
                  h('div', { className: 'p-2 bg-white rounded-lg border border-slate-400' },
                    h('p', { className: 'text-[0.6875rem] font-bold text-slate-700 uppercase' }, pctOff == null ? __alloT('stem.calculus.abs_difference', 'Absolute Difference') : __alloT('stem.calculus.abs_pct_difference', 'Absolute % Difference')),
                    h('p', { className: 'text-sm font-black text-slate-700' }, pctOff == null ? fix(absDiff, 3) : fix(pctOff, 1) + '%')
                  )
                ),
                h('p', { className: 'text-xs text-slate-800', role:'status', 'aria-live':'polite' },
                  pctOff == null ? __alloT('stem.calculus.pct_undefined', 'The exact integral is zero, so percentage difference is undefined. Use the absolute difference shown for calibration.') :
                  pctOff < 5 ? __alloT('stem.calculus.pct_5', 'Estimate within 5%. Record which visual cue helped you calibrate it.') :
                  pctOff < 15 ? __alloT('stem.calculus.pct_15', 'Estimate within 15%. Compare your average-height \u00D7 width strategy with the graph.') :
                  __alloT('stem.calculus.pct_far', 'Use the difference to recalibrate: choose a representative height, multiply by interval width, and try again.')
                ),
                h('label', { htmlFor:'calc-estimate-reflection', className: 'block mt-3 text-[0.6875rem] font-bold text-violet-800' }, __alloT('stem.calculus.calibration_note', 'Calibration note (optional): what cue will you use on the next estimate?')),
                h('input', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},  id:'calc-estimate-reflection', type:'text', value:d.estimateReflection||'', onChange:function(e){upd('estimateReflection',e.target.value);}, 'aria-label':__alloT('stem.calculus.a11y_optional_integral_estimate_calibration_note', 'Optional integral estimate calibration note'), className:'mt-1 w-full px-2 py-1.5 border border-violet-300 rounded-lg text-xs' }),
                h('button', {"aria-label":__alloT('stem.calculus.a11y_try_another_estimate', 'Try another estimate'), type:'button', onClick:function(){updMany({ predictSubmitted: false, predictInput: '' });}, className:'transition-colors mt-2 min-h-[28px] text-[0.6875rem] text-violet-700 hover:text-violet-900 font-bold' }, '\u21BA ' + __alloT('stem.calculus.try_another_estimate', 'Try another estimate'))
              );
            })(),

            (!predictMode||predictSubmitted)&&!ouPending&&exactOk&&signedOk&&h('section',{'data-signed-area':true,className:'mt-3 rounded-xl p-3 space-y-2',style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)',border:'1px solid var(--allo-stem-text-soft,#475569)'}},
              h('h3',{className:'text-sm font-bold'},__alloT('stem.calculus.signed_area_title','Signed integral and total area')),
              h('div',{className:'grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm'},
                h('p',null,__alloT('stem.calculus.above_axis_area','Above the axis: '),h('strong',{'data-positive-area':positiveRegion},positiveRegion.toFixed(4))),
                h('p',null,__alloT('stem.calculus.below_axis_area','Below the axis (magnitude): '),h('strong',{'data-negative-area':negativeRegion},negativeRegion.toFixed(4))),
                h('p',null,__alloT('stem.calculus.total_geometric_area','Total geometric area: '),h('strong',{'data-total-area':totalRegion},totalRegion.toFixed(4)))),
              h('div',{'aria-hidden':'true',style:{display:'flex',height:14,border:'1px solid currentColor',borderRadius:4,overflow:'hidden'}},
                h('span',{style:{width:totalRegion?100*positiveRegion/totalRegion+'%':'0%',background:'#1d4ed8'}}),
                h('span',{style:{width:totalRegion?100*negativeRegion/totalRegion+'%':'0%',background:'#c2410c'}})),
              h('p',{className:'text-sm'},fillT(__alloT('stem.calculus.signed_net_line','Net integral = above \u2212 below: {p} \u2212 {n} \u2248 {x}'),{p:positiveRegion.toFixed(4),n:negativeRegion.toFixed(4),x:exact.toFixed(4)})),
              h('p',{className:'text-xs'},__alloT('stem.calculus.signed_area_reason','The integral subtracts the region below the axis. Total geometric area adds both magnitudes. Displayed values are rounded.'))),
            // The exact value says what kind of integral this is: ordinary, improper but convergent,
            // or improper and divergent / undecided / undefined, each in plain words.
            (!exactOk || improperConv) && h('p', { className: 'mt-3 rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm text-amber-900', role: 'status', 'data-calc-exact-kind': exactKind },
              (function() {
                var xs = impTrouble != null ? calcFmtNum(impTrouble) : '?';
                if (improperConv) return fillT(__alloT('stem.calculus.exact_imp_conv_v2', 'Improper (convergent): f is not defined or not bounded near x = {x}, so the integral is improper. Its limit settles, so it converges: the integral equals {v}. Sums that land on x = {x} cannot be computed; the others approach {v} slowly.'), { x: xs, v: exact.toFixed(4) });
                if (exactKind === 'diverges') return impMain && impMain.opposite
                  ? fillT(__alloT('stem.calculus.exact_imp_div_opp', 'Improper (divergent): f is unbounded near x = {x}, so the integral is improper. One side runs to +∞ and the other to −∞; ∞ − ∞ has no value, so the integral diverges. It has no finite value.'), { x: xs })
                  : impMain && impMain.direction === 'osc' ? fillT(__alloT('stem.calculus.exact_imp_div_osc', 'Improper (divergent): the integral is improper near x = {x}, and its values keep swinging without settling, so it diverges. It has no finite value.'), { x: xs })
                  : fillT(__alloT('stem.calculus.exact_imp_div', 'Improper (divergent): f is unbounded near x = {x}, so the integral is improper, and its limit grows without bound. It diverges: there is no finite value.'), { x: xs });
                if (exactKind === 'domain') return fillT(__alloT('stem.calculus.exact_domain', 'f is not defined on a stretch of this interval (near x = {x}), so the integral is improper here and has no value. Move the bounds into the domain.'), { x: xs });
                if (exactKind === 'too_many') return __alloT('stem.calculus.exact_too_many', 'f has too many trouble spots on this interval, so the integral is improper in several places. Narrow the bounds.');
                return fillT(__alloT('stem.calculus.exact_unclear', 'f is undefined or unbounded near x = {x}, so the integral is improper, and a limit table cannot decide whether it converges. Study it in the improper-integral panel below.'), { x: xs });
              })()),
            // Analysis panel (only show if not in predict mode OR already submitted)
            (!predictMode || predictSubmitted) && h('div', { className: 'mt-3 grid grid-cols-1 sm:grid-cols-5 gap-3' },
              h('div', { className: 'sm:col-span-3 bg-red-50 rounded-xl border border-red-200 p-3' },
                h('p', { className: 'text-[0.6875rem] font-bold text-red-700 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA ' + __alloT('stem.calculus.analysis', 'Analysis')),
                h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                  h('div', { className: 'p-1.5 bg-white rounded-lg border', style:{animation:'calcPop 0.3s ease'} },
                    h('p', { className: 'text-[0.6875rem] font-bold text-red-700' }, mode==='trapezoid'?__alloT('stem.calculus.method_trapezoidal', 'Trapezoidal'):mode==='simpson'?methodName('simpson'):fillT(__alloT('stem.calculus.riemann_method', 'Riemann ({method})'), { method: methodWord(mode) })),
                    h('p', { className: 'text-sm font-bold text-red-800' }, fix(area, 4))
                  ),
                  h('div', { className: 'p-1.5 bg-white rounded-lg border' },
                    h('p', { className: 'text-[0.6875rem] font-bold text-red-700' }, improperConv ? __alloT('stem.calculus.exact_label_imp', 'Improper (convergent)') : __alloT('stem.calculus.exact_label', 'Exact (\u222B)')),
                    h('p', { className: 'text-sm font-bold text-red-800' }, ouPending ? '?' : fix(exact, 4))
                  ),
                  h('div', { className: 'p-1.5 bg-white rounded-lg border' },
                    h('p', { className: 'text-[0.6875rem] font-bold text-red-700' }, __alloT('stem.calculus.error_label', 'Error')),
                    h('p', { className: 'text-sm font-bold '+(ouPending || !finiteCoord(err) ? 'text-slate-700' : err<0.01?'text-emerald-600':err<0.1?'text-yellow-600':'text-red-600') }, ouPending ? '?' : fix(err, 6))
                  )
                ),
                ouPending && h('p', { className: 'mt-2 text-[0.6875rem] text-slate-800' }, __alloT('stem.calculus.hidden_until_answer', 'The exact value and the error stay hidden until you answer the over/under question.')),
                h('p', { className: 'mt-2 text-xs text-slate-700' },
                  '\uD83D\uDCA1 ' + (mode==='simpson'?__alloT('stem.calculus.tip_simpson', "Simpson's uses parabolic arcs and is exact for polynomials up to degree 3. Why do you think that is?"):
                  mode==='trapezoid'?__alloT('stem.calculus.tip_trapezoid', 'Trapezoid error shrinks like 1/n\u00B2. What does that mean when you double n?'):
                  nRects<=5?fillT(__alloT('stem.calculus.tip_few', 'Only {n} rectangles. Predict: what happens to the error if you triple n?'), { n: nRects }):
                  fillT(__alloT('stem.calculus.tip_many', 'At n = {n}: how does this error compare with n = 50? Use the chart.'), { n: nRects }))
                ),
                // Net signed-area note: only when the curve crosses the x-axis (pairs with the blue/orange shading)
                shapeFacts.negative && shapeFacts.positive && h('p',{className:'mt-2 text-[0.6875rem] text-slate-800 bg-white/70 rounded-lg border border-slate-200 px-2 py-1 leading-snug'},
                  __alloT('stem.calculus.net_note', 'Blue area (above the axis) adds; orange area (below) subtracts. The integral is the NET signed area, not the total amount of region.'))
              ),
              h('div', { className: 'sm:col-span-2 bg-slate-50 rounded-xl border p-2' },
                h('p', { className: 'text-[0.6875rem] font-bold text-slate-700 uppercase tracking-wider mb-1' }, '\uD83D\uDCC9 ' + __alloT('stem.calculus.error_vs_n', 'Error vs n')),
                ouPending ? h('p', { className: 'text-[0.6875rem] text-slate-700' }, __alloT('stem.calculus.chart_hidden', 'The error chart appears after you answer.')) :
                h('svg', { viewBox: '0 0 '+CW+' 60', role: 'img', 'aria-label': __alloT('stem.calculus.a11y_calculus_error_versus_rectangle_count_chart', 'Calculus error versus rectangle count chart'), className: 'w-full' },
                  h('line',{x1:Cpad,y1:55,x2:CW-Cpad,y2:55,stroke:'#94a3b8',strokeWidth:0.5}),
                  convData.length > 1 && h('polyline',{points:convData.map(function(cd){return convToX(finiteNum(cd.n, 2))+','+convToY(cd.err);}).join(' '),fill:'none',stroke:'#dc2626',strokeWidth:1.5}),
                  finiteCoord(err) && nRects <= 50 && h('circle',{cx:convToX(Math.max(2, nRects)),cy:convToY(err),r:3,fill:'#dc2626',stroke:'white',strokeWidth:1}),
                  h('text',{x:CW/2,y:8,textAnchor:'middle',fill:isContrast?'#ffff00':'#475569',style:{fontSize:'7.5px'}},__alloT('stem.calculus.chart_caption', 'error \u2192 0 as n \u2192 \u221E'))
                )
              )
            ),

            // ── ANTIDERIVATIVE BUILDER: type F(x); the tool differentiates it and compares with f ──
            (function() {
              var antiText = typeof d.antiText === 'string' ? d.antiText : '';
              var rung = Math.max(0, Math.min(3, finiteNum(d.antiHintRung, 0)));
              var res = d.antiChecked && antiText.trim() ? checkTypedAgainst(antiText, 'anti') : null;
              var hints = [
                __alloT('stem.calculus.anti_hint_1', 'Reverse the power rule: raise each power by one, then divide by the new power.'),
                useTyped ? __alloT('stem.calculus.anti_hint_2_typed', 'Standard results: \u222B sin x dx = \u2212cos x, \u222B cos x dx = sin x, \u222B e^x dx = e^x, \u222B 1/x dx = ln|x|.') : __alloT('stem.calculus.anti_hint_2', '\u222B ax\u00B2 dx = (a/3)x\u00B3, \u222B bx dx = (b/2)x\u00B2, \u222B c dx = cx.'),
                useTyped ? __alloT('stem.calculus.anti_hint_3_typed', 'Check yours by differentiating it in your head: you should get f(x) back.') : fillT(__alloT('stem.calculus.anti_hint_3', 'First term done for you: \u222B {a}x\u00B2 dx = {k}x\u00B3. Now do the x and constant terms.'), { a: calcFmtNum(fa), k: calcFmtNum(fa / 3) })
              ];
              var verdictText = !res ? '' : res.verdict === 'correct' ? __alloT('stem.calculus.anti_correct', 'Correct! F\u2032(x) = f(x) at every test point, so F is an antiderivative. Adding any constant C gives another one.')
                : res.verdict === 'parse' ? parseErrorText(res.error, res.detail)
                : res.verdict === 'factor' ? fillT(__alloT('stem.calculus.anti_factor', 'Your F\u2032 is {k} times f. Check the divide-by-the-new-power step.'), { k: calcFmtNum(res.factor) })
                : res.verdict === 'sign' ? __alloT('stem.calculus.anti_sign', 'Your F\u2032 is \u2212f: a sign slipped. Remember d/dx[cos x] = \u2212sin x, so \u222B sin x dx = \u2212cos x.')
                : res.verdict === 'offset' ? fillT(__alloT('stem.calculus.anti_offset', 'F\u2032 \u2212 f is the constant {k}: a term like {k}x is extra or missing.'), { k: calcFmtNum(res.offset) })
                : res.verdict === 'differentiated' ? misconceptionText('differentiated', '')
                : res.verdict === 'domain' ? fillT(__alloT('stem.calculus.anti_domain', 'Your F is undefined on most of [{a}, {b}]. Choose an expression defined on this interval.'), { a: xMin, b: xMax2 })
                : fillT(__alloT('stem.calculus.anti_mismatch', 'F\u2032 does not match f. At x = {x}, F\u2032 = {g} but f = {w}.'), { x: calcFmtNum(calcRound(res.x, 3)), g: calcFmtNum(calcRound(res.got, 4)), w: calcFmtNum(calcRound(res.want, 4)) });
              var ftcLine = '';
              if (res && res.ok && exactOk) {
                var Fb = res.g.f(xMax2), Fa = res.g.f(xMin);
                if (finiteCoord(Fb) && finiteCoord(Fa)) ftcLine = fillT(__alloT('stem.calculus.anti_ftc', 'Now the Fundamental Theorem: F({b}) \u2212 F({a}) = {v}, the same as the integral {i}.'), { a: xMin, b: xMax2, v: (Fb - Fa).toFixed(4), i: exact.toFixed(4) });
              }
              var check = function() {
                updMany({ antiChecked: true });
                stemBeep && stemBeep('click');
                var r = antiText.trim() ? checkTypedAgainst(antiText, 'anti') : null;
                if (r && r.ok) {
                  awardOnce(calcMissionFnKey('anti', fBody), 5, __alloT('stem.calculus.xp_anti', 'Built an antiderivative'));
                  say(__alloT('stem.calculus.sr_anti_correct', 'Correct: your F is an antiderivative of f.'));
                } else if (r) say(__alloT('stem.calculus.sr_anti_wrong', 'Not yet. Read the feedback under the box.'));
              };
              return h('div', { className: 'mt-3 bg-cyan-50 rounded-xl border border-cyan-200 p-3', 'data-calc-antiderivative': true },
                h('div', { className: 'flex items-center justify-between mb-1 flex-wrap gap-1' },
                  h('p', { className: 'text-[0.6875rem] font-bold text-cyan-800 uppercase tracking-wider' }, '\u270F\uFE0F ' + __alloT('stem.calculus.anti_title', 'Build the Antiderivative')),
                  h('p', { className: 'text-[0.6875rem] text-cyan-900' }, __alloT('stem.calculus.anti_rule', 'Power rule: \u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1)'))
                ),
                h('label', { htmlFor: 'calc-anti-input', className: 'block text-xs text-cyan-900 mb-1' }, fillT(__alloT('stem.calculus.anti_prompt', 'For {f}, type an antiderivative F(x). You may leave out + C.'), { f: fStr })),
                h('div', { className: 'flex items-center gap-1 flex-wrap' },
                  h('span', { className: 'text-sm font-bold text-cyan-900', 'aria-hidden': 'true' }, 'F(x) = '),
                  h('input', { id: 'calc-anti-input', type: 'text', spellCheck: false, autoComplete: 'off', value: antiText, placeholder: __alloT('stem.calculus.anti_placeholder', 'e.g. x^3/3 + 2x'),
                    onChange: function(e) { updMany({ antiText: e.target.value, antiChecked: false }); }, onKeyDown: function(e) { if (e.key === 'Enter' && antiText.trim()) check(); },
                    className: 'flex-1 min-w-[180px] px-2 py-1.5 border-2 border-cyan-700 rounded font-mono text-sm', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } }),
                  h('button', { "aria-label": __alloT('stem.calculus.a11y_check', 'Check'), type: 'button', disabled: !antiText.trim(), onClick: check, className: 'transition-colors ml-2 min-h-[32px] px-3 py-1 bg-cyan-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-cyan-800' }, __alloT('stem.calculus.check', 'Check'))
                ),
                res && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (res.ok ? 'text-emerald-800' : 'text-red-800') }, (res.ok ? '\u2705 ' : '\u274C ') + verdictText),
                res && res.ok && ftcLine && h('p', { className: 'mt-1 text-xs text-cyan-900' }, ftcLine),
                hintBlock(hints, rung, function(n) { upd('antiHintRung', n); }),
                h('p', { className: 'mt-1.5 text-[0.6875rem] text-cyan-900' }, fillT(__alloT('stem.calculus.anti_plus_c', 'Every antiderivative also carries a constant + C, but it cancels in F({b}) \u2212 F({a}), so a definite integral never needs it.'), { a: xMin, b: xMax2 }))
              );
            })(),

            // Sliders
            h('div', { className: 'grid grid-cols-2 gap-2 mt-3' },
              [{k:'a',label:'a (x\u00B2)',min:-3,max:3,step:0.5,quad:true},{k:'b',label:'b (x)',min:-5,max:5,step:0.5,quad:true},{k:'c',label:__alloT('stem.calculus.slider_c', 'c (const)'),min:-5,max:5,step:0.5,quad:true},{k:'xMin',label:__alloT('stem.calculus.slider_lower', 'Lower a'),min:-3,max:4,step:0.5},{k:'xMax',label:__alloT('stem.calculus.slider_upper', 'Upper b'),min:1,max:10,step:0.5},{k:'n',label:__alloT('stem.calculus.slider_n', 'n (subdivisions)'),min:2,max:50,step:mode==='simpson'?2:1}].filter(function(s) { return s.quad && !useTyped; }).map(function(s){ // n and the bounds sit under the graph
                var val = s.k==='n' ? nRects : s.k === 'xMin' ? xMin : s.k === 'xMax' ? xMax2 : finiteNum(d[s.k], s.k === 'a' ? 1 : 0);
                return h('div',{ key:s.k,className:'text-center bg-slate-50 rounded-lg p-2 border'},
                  h('label',{htmlFor:'calc-int-'+s.k,className:'text-[0.6875rem] font-bold text-red-700'},s.label+': '+val),
                  h('input',{id:'calc-int-'+s.k,type:'range',min:s.min,max:s.max,step:s.step,value:val,'aria-label':s.label,onChange:function(e){var patch={overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false,antiChecked:false};patch[s.k]=parseFloat(e.target.value);if(s.k==='n')patch.nExplored=true;updMany(patch);},className:'w-full accent-red-600'})
                );
              })
            ),

            // Presets (quadratics)
            h('div', { className: 'mt-3 flex flex-wrap gap-1.5 items-center' },
              h('span',{ className:'text-[0.6875rem] font-bold text-slate-700' + onHostInk},__alloT('stem.calculus.load', 'Load:')),
              PRESETS.map(function(p){
                return h('button',{ key:p.label,type:'button',onClick:function(){
                  updMany({fnMode:'quad',a:p.a,b:p.b,c:p.c,xMin:p.xMin,xMax:p.xMax,n:p.n,overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false,antiChecked:false,antiText:''});
                  addToast('\uD83E\uDD14 '+p.tip,'info');
                  say(p.tip);
                  stemBeep&&stemBeep('click');
                },className:'min-h-[28px] px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-red-50 text-red-700 border border-red-600 hover:bg-red-100 transition-all'},p.label);
              })
            ),

            // Snapshot
            h('button',{"aria-label":__alloT('stem.calculus.a11y_snapshot', 'Snapshot'),type:'button',onClick:function(){setToolSnapshots(function(prev){return prev.concat([{id:'calc-'+Date.now(),tool:'calculus',label:'\u222B['+xMin+','+xMax2+'] n='+nRects,data:Object.assign({},d),timestamp:Date.now()}]);});addToast('\uD83D\uDCF8 ' + __alloT('stem.calculus.snapshot_saved', 'Snapshot saved'),'success');},className:'mt-3 ml-auto block min-h-[36px] px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-md transition-all'},'\uD83D\uDCF8 ' + __alloT('stem.calculus.snapshot', 'Snapshot')),

            improperPanel()
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: DERIVATIVE
          // ══════════════════════════════════════════════════════════════
          tab === 'derivative' && h('div', { key: 'derivative' },

            functionBox('derivative'),

            h('div', { className: 'bg-red-50 rounded-xl border border-red-100 p-3 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3' },
              h('div', null,
                h('p',{className:'text-[0.6875rem] font-bold text-red-700 uppercase mb-0.5'},__alloT('stem.calculus.d_function', 'Function')),
                h('p',{className:'text-sm font-bold text-slate-800 font-mono'},fStr)
              ),
              h('div', null,
                h('p',{className:'text-[0.6875rem] font-bold text-red-700 uppercase mb-0.5'},fillT(__alloT('stem.calculus.d_slope_at', 'f\u2032(x\u2080 = {x}) = slope'), { x: x0 })),
                h('p',{className:'text-base font-black text-red-700',style:{animation:'calcPop 0.3s ease'}},finiteCoord(slope) ? slope.toFixed(4) : __alloT('stem.calculus.d_undefined', 'undefined here'))
              ),
              h('div', null,
                h('p',{className:'text-[0.6875rem] font-bold text-red-700 uppercase mb-0.5'},__alloT('stem.calculus.d_tangent_line', 'Tangent line')),
                h('p',{className:'text-xs font-bold text-slate-800 font-mono'},finiteCoord(slope) && finiteCoord(fy0) ? 'y = '+slope.toFixed(2)+'(x \u2212 '+x0+') + '+fy0.toFixed(2) : '\u2014')
              ),
              h('div', null,
                h('p',{className:'text-[0.6875rem] font-bold text-red-700 uppercase mb-0.5'},fillT(__alloT('stem.calculus.d_secants', 'Secant slopes (h = {h})'), { h: dh.toFixed(2) })),
                h('p',{className:'text-sm font-bold text-amber-800'},fillT(__alloT('stem.calculus.d_secant_values', 'one-sided {f}, centred {c} \u2192 {s}'), { f: fix(secantSlope, 4), c: fix(centredSlope, 4), s: fix(slope, 4) }))
              )
            ),

            h('div', { className: 'flex flex-wrap items-center gap-1.5 mb-2', role: 'group', 'aria-label': __alloT('stem.calculus.secant_kind', 'Secant line to draw') },
              h('span', { className: 'text-[0.6875rem] font-bold text-slate-800 mr-1' + onHostInk }, __alloT('stem.calculus.secant_kind', 'Secant line to draw')),
              [['forward', __alloT('stem.calculus.secant_forward', 'One-sided: x\u2080 to x\u2080 + h (dashed)')], ['centred', __alloT('stem.calculus.secant_centred', 'Centred: x\u2080 \u2212 h to x\u2080 + h (dotted)')], ['both', __alloT('stem.calculus.secant_both', 'Both')]].map(function(o) {
                return h('button', { key: o[0], type: 'button', 'aria-pressed': secantKind === o[0], onClick: function() { upd('secantKind', o[0]); },
                  className: 'min-h-[32px] px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (secantKind === o[0] ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-800 border-slate-400 hover:bg-amber-50') }, o[1]);
              })
            ),

            svgGraph(true, false),
            graphAccessPanel('calc-ga-derivative'),

            h('div',{className:'mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2'},
              h('div',{className:'bg-slate-50 rounded-lg border p-2'},
                h('label',{htmlFor:'calc-d-x0',className:'text-[0.6875rem] font-bold text-red-700'},fillT(__alloT('stem.calculus.d_x0_label', 'x\u2080 (tangent point): {x}'), { x: x0 })),
                h('input',{id:'calc-d-x0',type:'range','aria-label':__alloT('stem.calculus.a11y_tangent_point_x0', 'Tangent point x0'),min:(xMin-1).toFixed(1),max:(xMax2+1).toFixed(1),step:0.1,value:x0,onChange:function(e){updMany({ x0: parseFloat(e.target.value), derivInputChecked: false });},className:'w-full accent-red-600'})
              ),
              h('div',{className:'bg-slate-50 rounded-lg border p-2'},
                h('label',{htmlFor:'calc-d-h',className:'text-[0.6875rem] font-bold text-amber-800'},fillT(__alloT('stem.calculus.d_h_label', 'h (secant gap): {h}'), { h: dh.toFixed(2) })),
                h('input',{id:'calc-d-h',type:'range','aria-label':__alloT('stem.calculus.a11y_secant_gap_h', 'Secant gap h'),min:'0.02',max:'2',step:'0.02',value:dh,onChange:function(e){upd('secantH',parseFloat(e.target.value));},className:'w-full accent-amber-500'})
              )
            ),

            narrow && h('div', { className: 'mt-3' }, learningPath()),

            // ── One-sided versus centred secants: the error table ──
            (function() {
              var rows = calcSecantRows(evalF, evalDeriv, x0);
              return h('div', { className: 'mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3', 'data-calc-secant-table': true },
                h('div', { tabIndex: 0, role: 'region', 'aria-label': __alloT('stem.calculus.secant_table_label', 'Secant slopes as h shrinks'), className: 'overflow-x-auto' },
                  h('table', { className: 'w-full text-xs text-amber-950 border-collapse' },
                    h('caption', { className: 'text-left font-bold mb-1' }, fillT(__alloT('stem.calculus.secant_table_caption', 'Secant slopes at x\u2080 = {x} as h shrinks (f\u2032(x\u2080) = {s})'), { x: x0, s: fix(slope, 5) })),
                    h('thead', null, h('tr', null,
                      h('th', { scope: 'col', className: 'text-left pr-2' }, 'h'),
                      h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.secant_col_forward', 'One-sided slope')),
                      h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.secant_col_forward_err', 'Its error')),
                      h('th', { scope: 'col', className: 'text-left pr-2' }, __alloT('stem.calculus.secant_col_centred', 'Centred slope')),
                      h('th', { scope: 'col', className: 'text-left' }, __alloT('stem.calculus.secant_col_centred_err', 'Its error')))),
                    h('tbody', null, rows.map(function(r) {
                      return h('tr', { key: r.h, className: 'border-t border-amber-200' },
                        h('th', { scope: 'row', className: 'text-left pr-2 font-mono' }, String(r.h)),
                        h('td', { className: 'pr-2 font-mono' }, fix(r.forward, 6)), h('td', { className: 'pr-2 font-mono' }, finiteCoord(r.forwardError) ? r.forwardError.toExponential(2) : '\u2014'),
                        h('td', { className: 'pr-2 font-mono' }, fix(r.centred, 6)), h('td', { className: 'font-mono' }, finiteCoord(r.centredError) ? r.centredError.toExponential(2) : '\u2014'));
                    })))),
                h('p', { className: 'mt-1 text-[0.6875rem] text-amber-950' }, __alloT('stem.calculus.secant_table_note', 'Each time h shrinks by 10, the one-sided error shrinks by about 10, but the centred error by about 100. Averaging the left and right slopes cancels the curve\u2019s bend.')),
                (function() {
                  var fam = GA && typeof GA.matchFamily === 'function' ? GA.matchFamily(evalF) : null;
                  if (!toolReachable('funcGrapher')) return null;
                  return h('button', { type: 'button', onClick: function() {
                      if (fam) setLabToolData(function(prev) { var fg = prev.funcGrapher; if (!fg || typeof fg !== 'object') return prev; return Object.assign({}, prev, { funcGrapher: Object.assign({}, fg, { type: fam.type, a: fam.a, b: fam.b, c: fam.c }) }); });
                      openTool('funcGrapher', __alloT('stem.calculus.fg_name', 'Function Grapher'));
                    }, className: 'mt-2 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-amber-900 border-2 border-amber-700 hover:bg-amber-100' },
                    '\uD83D\uDD17 ' + (fam ? __alloT('stem.calculus.fg_link_same', 'Continue in Function Grapher\u2019s secant-to-tangent investigation (same curve)') : __alloT('stem.calculus.fg_link', 'Open Function Grapher\u2019s secant-to-tangent investigation')));
                })()
              );
            })(),

            // Limit definition callout
            h('div',{ className:'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3'},
              h('p',{className:'text-[0.6875rem] font-bold text-amber-800 uppercase tracking-wider mb-1'},'\uD83D\uDD0D ' + __alloT('stem.calculus.limit_def_title', 'The Limit Definition of the Derivative')),
              h('p',{className:'text-xs font-mono text-amber-900 mb-2'},"f\u2032(x\u2080) = lim\u2095\u2192\u2080 [f(x\u2080 + h) \u2212 f(x\u2080)] / h"),
              h('p',{className:'text-xs text-amber-900'},__alloT('stem.calculus.limit_def_body', 'Drag h toward 0 above and watch the secant slope converge to the true derivative. When does it never get there? Try |x| at x\u2080 = 0.'))
            ),

            h('div',{ className:'mt-3 bg-rose-50 rounded-xl border border-rose-200 p-3'},
              h('p',{className:'text-[0.6875rem] font-bold text-rose-700 uppercase tracking-wider mb-1'},'\u26A0\uFE0F ' + __alloT('stem.calculus.mixups_title', 'Common mix-ups')),
              h('ul',{className:'text-xs text-rose-900 space-y-1 list-disc list-inside'},
                h('li',null, __alloT('stem.calculus.mixup_1', 'f\u2032(x\u2080) is the SLOPE, a single number, not the tangent line itself. The tangent is the line; the derivative is how steep it is.')),
                h('li',null, __alloT('stem.calculus.mixup_2', 'f\u2032(x) is a whole new function, not one value: it gives the slope at every x. Slide x\u2080 and watch it change.')),
                h('li',null, __alloT('stem.calculus.mixup_3', 'A big f(x) value does NOT mean a big slope: at a peak or valley the curve is at an extreme, yet f\u2032 = 0 (perfectly flat).'))
              )
            ),

            // ── POWER RULE PRACTICE (quadratic boxes) or TYPE f'(x) (typed functions) ──
            h('div', { className: 'mt-3 bg-emerald-50 rounded-xl border border-emerald-200 p-3', 'data-calc-deriv-trainer': true },
              h('div', { className: 'flex items-center justify-between mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold text-emerald-800 uppercase tracking-wider' }, '\u270F\uFE0F ' + (useTyped ? __alloT('stem.calculus.dtyped_title', 'Differentiate it yourself') : __alloT('stem.calculus.power_title', 'Power Rule Practice'))),
                h('button', { type: 'button', 'aria-expanded': !!d.showDerivTrainer, onClick: function(){ updMany({ showDerivTrainer: !d.showDerivTrainer, derivInputChecked: false, derivInput1: '', derivInput2: '', derivTypedChecked: false }); },
                  className: 'transition-colors min-h-[28px] text-xs font-bold text-emerald-800 hover:text-emerald-900'
                }, d.showDerivTrainer ? __alloT('stem.calculus.hide', 'Hide') : __alloT('stem.calculus.try_yourself', 'Try it yourself') + ' \u2192')
              ),
              !d.showDerivTrainer && h('p', { className: 'text-xs text-emerald-800' },
                fillT(__alloT('stem.calculus.power_before', 'Before looking at the result above: differentiate each term of {f}. What do you get?'), { f: fStr })
              ),
              d.showDerivTrainer && !useTyped && h('div', null,
                h('p', { className: 'text-sm font-bold text-emerald-800 mb-1' }, fillT(__alloT('stem.calculus.power_prompt', 'If f(x) = {f}, enter f\u2032(x):'), { f: buildFStr(fa, fb, fc) })),
                h('p', { className: 'text-[0.6875rem] text-emerald-800 mb-2' }, __alloT('stem.calculus.power_rules', 'Rules: d/dx[ax\u00B2] = 2ax, d/dx[bx] = b, d/dx[c] = 0')),
                h('div', { className: 'flex items-center gap-1 flex-wrap' },
                  h('span', { className: 'text-sm font-bold text-emerald-900' }, "f\u2032(x) = "),
                  h('input', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},  type:'number', step:'any', placeholder:'?', value:derivInput1, 'aria-label':__alloT('stem.calculus.a11y_derivative_x_coefficient', 'Derivative x coefficient'), onChange:function(e){updMany({ derivInput1: e.target.value, derivInputChecked: false });}, className:'w-14 text-center border-2 border-emerald-600 rounded px-1 py-0.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                  h('span', { className: 'text-sm font-bold text-emerald-900' }, 'x + '),
                  h('input', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},  type:'number', step:'any', placeholder:'?', value:derivInput2, 'aria-label':__alloT('stem.calculus.a11y_derivative_constant', 'Derivative constant'), onChange:function(e){updMany({ derivInput2: e.target.value, derivInputChecked: false });}, className:'w-14 text-center border-2 border-emerald-600 rounded px-1 py-0.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' }),
                  h('button', {"aria-label":__alloT('stem.calculus.a11y_check', 'Check'), type:'button', disabled:derivInput1===''||derivInput2==='', onClick:function(){upd('derivInputChecked',true);stemBeep&&stemBeep('click');}, className:'ml-2 min-h-[32px] px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40' }, __alloT('stem.calculus.check', 'Check'))
                ),
                derivInputChecked && (function(){
                  var ok1=Math.abs(parseFloat(derivInput1)-2*fa)<0.01, ok2=Math.abs(parseFloat(derivInput2)-fb)<0.01, all=ok1&&ok2;
                  var mis1 = !ok1 && Math.abs(parseFloat(derivInput1)-fa)<0.01 ? misconceptionText('power_rule_bring_down', '') : '';
                  return h('div',{ className:'mt-2',style:{animation:'calcPop 0.3s ease'}},
                    h('p',{role:'status','aria-live':'polite',className:'text-sm font-bold '+(all?'text-emerald-800':'text-red-700')},all?'\u2705 ' + __alloT('stem.calculus.correct_bang', 'Correct!') + ' ' + derivStr:'\u274C ' + __alloT('stem.calculus.not_quite', 'Not quite:')),
                    !all && h('div',{ className:'text-xs space-y-0.5 mt-1'},
                      h('p',{className:ok1?'text-emerald-700':'text-red-700'},(ok1?'\u2713 ':'\u2717 ')+(ok1 ? fillT(__alloT('stem.calculus.power_ok1', 'Coefficient of x: {v}'), { v: 2*fa }) : mis1 || __alloT('stem.calculus.power_hint1', 'Coefficient of x: bring the exponent 2 down and multiply it by a.'))),
                      h('p',{className:ok2?'text-emerald-700':'text-red-700'},(ok2?'\u2713 ':'\u2717 ')+(ok2 ? fillT(__alloT('stem.calculus.power_ok2', 'Constant: {v}'), { v: fb }) : __alloT('stem.calculus.power_hint2', 'Constant: the bx term has slope b; the c term has slope 0.')))
                    ),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_try_again', 'Try again'),type:'button',onClick:function(){updMany({ derivInputChecked: false, derivInput1: '', derivInput2: '' });},className:'mt-1 min-h-[28px] text-[0.6875rem] text-emerald-800 hover:underline font-bold'},'\u21BA ' + __alloT('stem.calculus.try_again', 'Try again'))
                  );
                })()
              ),
              d.showDerivTrainer && useTyped && (function() {
                var dt = typeof d.derivTypedText === 'string' ? d.derivTypedText : '';
                var res = d.derivTypedChecked && dt.trim() ? checkTypedAgainst(dt, 'deriv') : null;
                var verdict = !res ? '' : res.ok ? __alloT('stem.calculus.dtyped_correct', 'Correct! Your expression matches f\u2032(x) at every test point.')
                  : res.verdict === 'parse' ? parseErrorText(res.error, res.detail)
                  : res.verdict === 'factor' ? fillT(__alloT('stem.calculus.dtyped_factor', 'Yours is {k} times the true derivative. Check the chain rule (multiply by the inside\u2019s derivative) or the power rule\u2019s coefficient.'), { k: calcFmtNum(res.factor) })
                  : res.verdict === 'sign' ? __alloT('stem.calculus.dtyped_sign', 'Yours is the negative of f\u2032. Check signs: d/dx[cos x] = \u2212sin x.')
                  : res.verdict === 'offset' ? fillT(__alloT('stem.calculus.dtyped_offset', 'Yours differs from f\u2032 by the constant {k}. Did a constant term survive? Its derivative is 0.'), { k: calcFmtNum(res.offset) })
                  : res.verdict === 'same_as_f' ? __alloT('stem.calculus.dtyped_same', 'That is f itself. Differentiate: find the slope function.')
                  : res.verdict === 'integrated' ? __alloT('stem.calculus.dtyped_integrated', 'You integrated: the derivative of your answer is f. Differentiating LOWERS each power.')
                  : res.verdict === 'domain' ? __alloT('stem.calculus.dtyped_domain', 'Your expression is undefined on most of this interval.')
                  : fillT(__alloT('stem.calculus.dtyped_mismatch', 'Not equal to f\u2032. At x = {x}, yours gives {g} but f\u2032 = {w}.'), { x: calcFmtNum(calcRound(res.x, 3)), g: calcFmtNum(calcRound(res.got, 4)), w: calcFmtNum(calcRound(res.want, 4)) });
                return h('div', null,
                  h('label', { htmlFor: 'calc-dtyped', className: 'block text-sm font-bold text-emerald-800 mb-1' }, fillT(__alloT('stem.calculus.dtyped_prompt', 'If {f}, type f\u2032(x):'), { f: fStr })),
                  h('div', { className: 'flex gap-2 flex-wrap' },
                    h('input', { id: 'calc-dtyped', type: 'text', spellCheck: false, autoComplete: 'off', value: dt, onChange: function(e) { updMany({ derivTypedText: e.target.value, derivTypedChecked: false }); },
                      className: 'flex-1 min-w-[180px] px-2 py-1.5 border-2 border-emerald-600 rounded font-mono text-sm', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } }),
                    h('button', { type: 'button', "aria-label": __alloT('stem.calculus.a11y_check', 'Check'), disabled: !dt.trim(), onClick: function() { upd('derivTypedChecked', true); var r = checkTypedAgainst(dt, 'deriv'); if (r.ok) awardOnce(calcMissionFnKey('dfx', fBody), 5, __alloT('stem.calculus.xp_dfx', 'Differentiated a typed function')); say(r.ok ? __alloT('stem.calculus.sr_dtyped_ok', 'Correct derivative.') : __alloT('stem.calculus.sr_dtyped_no', 'Not yet. Read the feedback.')); }, className: 'min-h-[32px] px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40' }, __alloT('stem.calculus.check', 'Check'))
                  ),
                  res && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (res.ok ? 'text-emerald-800' : 'text-red-700') }, (res.ok ? '\u2705 ' : '\u274C ') + verdict)
                );
              })()
            ),

            // ── f, f' and A(x): pick the matching graph, then check ──
            (function() {
              var mq = d.matchQuiz && typeof d.matchQuiz === 'object' && !Array.isArray(d.matchQuiz) && finiteCoord(d.matchQuiz.seed) ? d.matchQuiz : null;
              var kind = d.matchKind === 'accum' ? 'accum' : 'deriv';
              var gm = mq ? calcGenMatch(calcSeeded(mq.seed), mq.band || band, mq.kind) : null;
              var newMatch = function(k) { updMany({ matchKind: k || kind, matchQuiz: { seed: Math.floor(Math.random() * 2147483000) + 1, band: band, kind: k || kind, tried: [], picked: null, answered: false, correct: false } }); };
              function miniGraph(samples, name, highlight) {
                var ys = samples.map(function(s) { return s.y; }).filter(finiteCoord);
                var lo = Math.min.apply(null, ys.concat([0])), hi = Math.max.apply(null, ys.concat([0]));
                if (!(hi > lo)) { hi = lo + 1; }
                var pw = 160, ph = 96, mg = 6;
                var sx = function(x) { return mg + (x - CALC_MATCH_XMIN) / (CALC_MATCH_XMAX - CALC_MATCH_XMIN) * (pw - 2 * mg); };
                var sy = function(y) { return ph - mg - (y - lo) / (hi - lo) * (ph - 2 * mg); };
                var pts = samples.filter(function(s) { return finiteCoord(s.y); }).map(function(s) { return sx(s.x).toFixed(1) + ',' + sy(s.y).toFixed(1); }).join(' ');
                var desc = GA ? GA.describeGraph(samples, { t: __alloT, name: name }).text : name;
                return h('svg', { viewBox: '0 0 ' + pw + ' ' + ph, role: 'img', 'aria-label': desc, className: 'w-full rounded-md border ' + (highlight ? 'border-emerald-600 border-2' : 'border-slate-300'), style: { background: '#fff', maxHeight: 110 } },
                  h('line', { x1: mg, y1: sy(0), x2: pw - mg, y2: sy(0), stroke: '#64748b', strokeWidth: 1 }),
                  h('line', { x1: sx(0), y1: mg, x2: sx(0), y2: ph - mg, stroke: '#94a3b8', strokeWidth: 0.8 }),
                  h('polyline', { points: pts, fill: 'none', stroke: '#1d4ed8', strokeWidth: 2 }));
              }
              var pick = mq ? mq.picked : null;
              var commit = function() {
                if (!mq || !gm || mq.answered || !pick) return;
                var opt = gm.opts.filter(function(o) { return o.id === pick; })[0];
                var ok = !!opt && !opt.mis;
                var tried = (mq.tried || []).concat([pick]);
                var done = ok || tried.length >= 2;
                upd('matchQuiz', Object.assign({}, mq, { tried: tried, answered: done, correct: ok, lastMis: ok ? '' : (opt ? opt.mis : '') }));
                if (ok) { if (tried.length === 1) awardOnce('match:' + mq.seed, 3, __alloT('stem.calculus.xp_match', 'Matched a graph to its derivative or accumulation')); say(__alloT('stem.calculus.sr_match_ok', 'Correct match.')); }
                else say(fillT(done ? __alloT('stem.calculus.sr_match_reveal', 'Not quite. {msg}') : __alloT('stem.calculus.sr_match_try', 'Not yet. {msg} Try once more.'), { msg: misconceptionText(opt ? opt.mis : '', mq.kind) }));
              };
              return h('section', { className: 'mt-3 rounded-xl border-2 border-sky-300 bg-sky-50 p-3', 'data-calc-graph-match': true },
                h('h3', { className: 'text-sm font-black text-sky-900' }, '\uD83E\uDDE9 ' + __alloT('stem.calculus.match_title', 'Graph match: f, f\u2032 and A(x)')),
                h('p', { className: 'text-xs text-sky-950 mt-1' }, __alloT('stem.calculus.match_intro', 'Predict first: look at f, choose the graph you think matches, commit, and only then see the answer. Each new graph is generated, so practice never runs out.')),
                h('div', { className: 'mt-2 flex flex-wrap gap-1.5', role: 'group', 'aria-label': __alloT('stem.calculus.match_kind', 'What to find') },
                  [['deriv', __alloT('stem.calculus.match_kind_deriv', 'Given f, find f\u2032')], ['accum', __alloT('stem.calculus.match_kind_accum', 'Given f, find A(x) = \u222B\u208B\u2083\u02E3 f(t) dt')]].map(function(o) {
                    return h('button', { key: o[0], type: 'button', 'aria-pressed': kind === o[0], onClick: function() { newMatch(o[0]); }, className: 'min-h-[32px] px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (kind === o[0] ? 'bg-sky-800 text-white border-sky-800' : 'bg-white text-sky-900 border-sky-500 hover:bg-sky-100') }, o[1]);
                  }),
                  h('button', { type: 'button', onClick: function() { newMatch(); }, className: 'min-h-[32px] px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-white text-sky-900 border border-sky-500 hover:bg-sky-100' }, mq ? __alloT('stem.calculus.match_new', 'New graph') : __alloT('stem.calculus.match_start', 'Start'))
                ),
                gm && h('div', { className: 'mt-2' },
                  h('p', { className: 'text-xs font-bold text-sky-950' }, fillT(__alloT('stem.calculus.match_given', 'Given: f(x) = {f}, for x from \u22123 to 3.'), { f: gm.label })),
                  h('div', { className: 'max-w-xs' }, miniGraph(gm.given, fillT(__alloT('stem.calculus.match_given_name', 'the given f(x) = {f}'), { f: gm.label }), false)),
                  h('p', { className: 'mt-2 text-xs font-bold text-sky-950', id: 'calc-match-q' }, gm.kind === 'deriv' ? __alloT('stem.calculus.match_q_deriv', 'Which graph is f\u2032(x)?') : __alloT('stem.calculus.match_q_accum', 'Which graph is A(x), the signed area under f from \u22123 to x?')),
                  h('div', { className: 'mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'group', 'aria-labelledby': 'calc-match-q' },
                    gm.opts.map(function(o) {
                      var triedWrong = (mq.tried || []).indexOf(o.id) >= 0 && o.mis;
                      var showRight = mq.answered && !o.mis && (mq.correct || (mq.revealed && !noReveal));
                      return h('button', { key: o.id, type: 'button', 'aria-pressed': pick === o.id, disabled: mq.answered || triedWrong,
                        onClick: function() { upd('matchQuiz', Object.assign({}, mq, { picked: o.id })); },
                        className: 'rounded-lg border-2 p-1 text-left disabled:opacity-60 ' + (pick === o.id ? 'border-sky-800 bg-white' : 'border-transparent bg-white hover:border-sky-400') },
                        h('span', { className: 'block text-xs font-black text-sky-950' }, fillT(__alloT('stem.calculus.match_option', 'Graph {id}'), { id: o.id }) + (showRight ? ' \u2713' : triedWrong ? ' \u2717' : '')),
                        miniGraph(o.samples, fillT(__alloT('stem.calculus.match_option', 'Graph {id}'), { id: o.id }), showRight));
                    })
                  ),
                  !mq.answered && h('button', { type: 'button', disabled: !pick, onClick: commit, className: 'mt-2 min-h-[36px] px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-800 text-white disabled:opacity-50' }, __alloT('stem.calculus.match_commit', 'Commit my choice')),
                  (mq.tried || []).length > 0 && h('p', { role: 'status', 'aria-live': 'polite', className: 'mt-2 text-sm font-bold ' + (mq.correct ? 'text-emerald-800' : 'text-red-700') },
                    mq.correct ? '\u2705 ' + (gm.kind === 'deriv' ? __alloT('stem.calculus.match_ok_deriv', 'Correct! Where f rises, f\u2032 is above the axis; where f is flat, f\u2032 crosses zero.') : __alloT('stem.calculus.match_ok_accum', 'Correct! A(x) rises where f > 0, falls where f < 0, and turns where f crosses zero.'))
                    : (mq.answered ? (mq.revealed && !noReveal ? __alloT('stem.calculus.match_revealed', 'The correct graph is marked with \u2713.') + ' ' : '\u274c ' + __alloT('stem.calculus.not_quite_short', 'Not quite.') + ' ') : __alloT('stem.calculus.lim_not_yet', 'Not yet.') + ' ') + misconceptionText(mq.lastMis, gm.kind) + (mq.answered ? '' : ' ' + __alloT('stem.calculus.one_more_try', 'One more try.'))),
                  mq.answered && !mq.correct && !mq.revealed && h('div', { className: 'text-sky-950' }, revealOffer(function() { upd('matchQuiz', Object.assign({}, mq, { revealed: true })); }, { onNew: function() { newMatch(); }, newLabel: __alloT('stem.calculus.match_new', 'New graph') })),
                  !mq.answered && hintBlock([
                    gm.kind === 'deriv' ? __alloT('stem.calculus.match_hint_d1', 'Find where f is flat (a peak, a valley or a level stretch): f\u2032 must cross or touch zero there.') : __alloT('stem.calculus.match_hint_a1', 'Find where f crosses zero: A(x) has a peak or a valley there.'),
                    gm.kind === 'deriv' ? __alloT('stem.calculus.match_hint_d2', 'Where f rises, f\u2032 is above the axis; where f falls, f\u2032 is below it.') : __alloT('stem.calculus.match_hint_a2', 'Where f is above the axis, A(x) rises; where f is below the axis, A(x) falls. A(\u22123) = 0.')
                  ], Math.max(0, Math.min(2, finiteNum(mq.hintRung, 0))), function(n) { upd('matchQuiz', Object.assign({}, mq, { hintRung: n })); })
                ),
                !gm && mq && h('p', { className: 'mt-2 text-xs text-sky-950' }, __alloT('stem.calculus.match_unavailable', 'That graph could not be built. Press New graph.'))
              );
            })(),

            // Function sliders
            h('div',{className:'grid grid-cols-2 gap-2 mt-3'},
              [{k:'a',label:'a (x\u00B2)',min:-3,max:3,step:0.5,quad:true},{k:'b',label:'b (x)',min:-5,max:5,step:0.5,quad:true},{k:'c',label:__alloT('stem.calculus.slider_c', 'c (const)'),min:-5,max:5,step:0.5,quad:true},{k:'xMin',label:__alloT('stem.calculus.slider_view_left', 'View left'),min:-5,max:3,step:0.5},{k:'xMax',label:__alloT('stem.calculus.slider_view_right', 'View right'),min:1,max:10,step:0.5}].filter(function(s) { return !(s.quad && useTyped); }).map(function(s){
                var val = s.k === 'xMin' ? xMin : s.k === 'xMax' ? xMax2 : finiteNum(d[s.k], s.k === 'a' ? 1 : 0);
                return h('div',{key:s.k,className:'text-center bg-slate-50 rounded-lg p-2 border'},
                  h('label',{htmlFor:'calc-d-'+s.k,className:'text-[0.6875rem] font-bold text-red-700'},s.label+': '+val),
                  h('input',{id:'calc-d-'+s.k,type:'range','aria-label':s.label,min:s.min,max:s.max,step:s.step,value:val,onChange:function(e){var patch={derivInputChecked:false,overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false};patch[s.k]=parseFloat(e.target.value);updMany(patch);},className:'w-full accent-red-600'})
                );
              })
            )
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: LIMITS
          // ══════════════════════════════════════════════════════════════
          tab === 'limits' && limitsTab(),
          tab === 'series' && seriesTab(),
          tab === 'apply' && appliedTab(),
          tab === 'frq' && frqTab(),

          // ══════════════════════════════════════════════════════════════
          // TAB: CHALLENGE
          // ══════════════════════════════════════════════════════════════
          tab === 'challenge' && h('div', { key: 'challenge' },

            h('div',{ className:'flex items-center gap-2 mb-3 flex-wrap'},
              h('span',{ className:'text-sm font-black text-red-800' + onHostInk},'\uD83C\uDFAF ' + fillT(__alloT('stem.calculus.ch_heading', 'Calculus Challenges ({band})'), { band: bandLabel(band) })),
              cScore>0 && h('span',{ className:'ml-auto text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border'},fillT(__alloT('stem.calculus.ch_score', 'Score {s}, streak {k}'), { s: cScore, k: cStreak }))
            ),
            h('div',{ className:'flex flex-wrap gap-1.5 mb-2', role:'group', 'aria-label': __alloT('stem.calculus.ch_types', 'Challenge type')},
              CALC_CHALLENGES.map(function(cm){
                return h('button',{ "aria-label": fillT(__alloT('stem.calculus.a11y_start_challenge', 'Start {name} challenge'), { name: cm.label }),'aria-pressed':cMode===cm.id,key:cm.id,type:'button',onClick:function(){updMany({ calcChallengeMode: cm.id, calcQuiz: null, calcHint: '', calcHintRung: 0 });},className:'min-h-[36px] px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all '+(cMode===cm.id?cm.activeClass+' text-white shadow-md':'bg-slate-100 text-slate-700 hover:bg-slate-200')},cm.label);
              })
            ),
            h('p',{className:'text-[0.6875rem] text-slate-700 mb-3' + onHostInk},
              cMode==='estimate'?__alloT('stem.calculus.chd_estimate', 'Pick the correct definite integral value from four choices.'):
              cMode==='overunder'?__alloT('stem.calculus.chd_overunder', 'Decide if the Riemann sum is an over- or underestimate, and understand why.'):
              cMode==='method'?__alloT('stem.calculus.chd_method', 'Which approximation method gives the smallest error on this curve?'):
              cMode==='minN'?__alloT('stem.calculus.chd_minn', 'Find the minimum n that hits a precision target.'):
              cMode==='exact'?__alloT('stem.calculus.chd_exact', 'Apply the power rule: compute the exact integral by hand.'):
              cMode==='avgrate'?__alloT('stem.calculus.chd_avgrate', 'Find the average rate of change between two points.'):
              cMode==='taylor'?__alloT('stem.calculus.chd_taylor', 'Find a Maclaurin series coefficient.'):
              __alloT('stem.calculus.chd_deriv', 'Find the slope of the tangent line, f\u2032(x\u2080).')
            ),
            h('button',{ type:'button', onClick:function(){startCalcChallenge();}, 'data-calc-start':'challenge', className:'min-h-[36px] px-4 py-2 rounded-lg text-xs font-bold mb-3 transition-all '+(cq?'bg-slate-100 text-slate-700 hover:bg-slate-200':'bg-red-600 text-white hover:bg-red-700 shadow-md')},cq?'\uD83D\uDD04 ' + __alloT('stem.calculus.ch_new', 'New Challenge'):'\uD83D\uDE80 ' + __alloT('stem.calculus.ch_start', 'Start Challenge')),
            cq && h('div',{ className:'mb-3'},quizGraph(cq)),
            cq && !cq.answered && cq.mode!=='exact' && h('div',{ className:'bg-red-50 rounded-xl p-4 border border-red-200 animate-in fade-in'},
              h('p',{className:'text-sm font-bold text-red-800 mb-3', id:'calc-quiz-question'},quizQuestion(cq)),
              (cq.attempts || 0) > 0 && h('p', { role:'status', 'aria-live':'polite', className:'text-xs font-bold text-red-800 mb-2' }, fillT(__alloT('stem.calculus.ch_try_again', 'Not yet. {msg} One more try.'), { msg: misconceptionText(cq.mis, cq.mode) })),
              h('div',{className:'grid grid-cols-1 sm:grid-cols-2 gap-2', role:'group', 'aria-labelledby':'calc-quiz-question'},
                // `overunder` builds its own options, so a quiz with no opts is VALID there.
                quizOptions(cq).map(function(opt){
                  var tried = (Array.isArray(cq.tried) ? cq.tried : []).indexOf(String(opt.id)) >= 0;
                  return h('button',{ key:String(opt.id),type:'button',disabled:tried,onClick:function(){checkCalcAnswer(opt.id);},className:'min-h-[40px] px-3 py-2.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-800 border-slate-300 hover:border-red-500 hover:bg-red-50 transition-all disabled:opacity-40 disabled:line-through'},opt.label);
                })
              )
            ),
            cq && !cq.answered && cq.mode==='exact' && h('div',{className:'bg-emerald-50 rounded-xl p-4 border border-emerald-200'},
              h('p',{className:'text-sm font-bold text-emerald-800 mb-1'},quizQuestion(cq)),
              h('p',{className:'text-[0.6875rem] text-emerald-800 mb-3'},__alloT('stem.calculus.ch_exact_help', '\u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1) + C. Enter a decimal; round to 3 places when needed.')),
              (cq.attempts || 0) > 0 && h('p', { role:'status', 'aria-live':'polite', className:'text-xs font-bold text-red-800 mb-2' }, fillT(__alloT('stem.calculus.ch_try_again', 'Not yet. {msg} One more try.'), { msg: misconceptionText(cq.mis, cq.mode) })),
              h('div',{className:'flex gap-2 flex-wrap'},
                h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',value:d._calcExactInput||'','aria-label':__alloT('stem.calculus.a11y_exact_integral_value', 'Exact integral value'),onChange:function(e){upd('_calcExactInput',e.target.value);},onKeyDown:function(e){if(e.key==='Enter'&&d._calcExactInput)checkCalcAnswer(d._calcExactInput);},placeholder:__alloT('stem.calculus.ch_exact_placeholder', 'Type the exact value\u2026'),className:'flex-1 min-w-[140px] px-3 py-2 rounded-lg border-2 border-emerald-600 text-sm font-bold bg-white focus:border-emerald-600'}),
                h('button',{"aria-label":__alloT('stem.calculus.a11y_check', 'Check'),type:'button',onClick:function(){if(d._calcExactInput)checkCalcAnswer(d._calcExactInput);},className:'transition-colors min-h-[36px] px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800'},__alloT('stem.calculus.check', 'Check') + ' \u2192')
              )
            ),
            // Hint ladder: three rungs, each revealed on request; no answer in any rung.
            cq && !cq.answered && (function() {
              var rungs = hintRungs(cq), rung = Math.max(0, Math.min(rungs.length, finiteNum(d.calcHintRung, 0)));
              if (!rungs.length) return null;
              var canAI = typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false;
              return h('div', null,
                hintBlock(rungs, rung, function(n) { upd('calcHintRung', n); }, '',
                  canAI && rung >= rungs.length && h('button', { type: 'button', onClick: function() {
                      ctx.getHint('calculus-' + cq.mode, quizQuestion(cq), String(cq.chosen == null ? '' : cq.chosen), rungs.join(' '), cq.attempts || 0, function(text) { upd('calcAIHint', String(text || '')); say(String(text || '')); });
                    }, className: 'mt-1 min-h-[32px] px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-white text-purple-800 border border-purple-600' }, '\u2728 ' + __alloT('stem.calculus.ai_hint', 'Ask the AI tutor for a hint'))),
                canAI && typeof d.calcAIHint === 'string' && d.calcAIHint && h('p', { className: 'mt-1 text-xs text-purple-900' }, d.calcAIHint)
              );
            })(),
            cq && cq.answered && h('div',{role:'status','aria-live':'polite',className:'p-3 rounded-xl text-sm font-bold mb-2 '+(cq.correct?'bg-emerald-50 text-emerald-800 border border-emerald-200':'bg-red-50 text-red-800 border border-red-200'),style:{animation:cq.correct?'calcCorrect 0.5s ease':'calcWrong 0.4s ease'}},
              cq.correct ? '\u2705 ' + fillT(__alloT('stem.calculus.ch_correct', 'Correct! {a}'), { a: cq.mode === 'method' ? methodName(cq.answer) : String(cq.answer) })
                : !(cq.revealed && !noReveal) ? '\u274C ' + __alloT('stem.calculus.not_quite_short', 'Not quite.')
                : '\u274C ' + fillT(__alloT('stem.calculus.ch_reveal', 'Correct answer: {a}'), { a: cq.mode === 'method' ? methodName(cq.answer) : cq.mode === 'overunder' ? (cq.answer === 'over' ? __alloT('stem.calculus.ou_over', 'OVERestimate') : cq.answer === 'under' ? __alloT('stem.calculus.ou_under', 'UNDERestimate') : __alloT('stem.calculus.ou_exact', 'EXACT')) : String(cq.answer) }),
              cq.correct && cStreak>=3 && h('span',{className:'ml-2 text-amber-700'},fillT(__alloT('stem.calculus.toast_streak', '\uD83D\uDD25 {n} in a row!'), { n: cStreak }))
            ),
            cq && cq.answered && !cq.correct && !cq.revealed && h('div', { className: 'mb-2 text-red-950' + onHostInk }, revealOffer(function() { upd('calcQuiz', Object.assign({}, cq, { revealed: true })); }, { onNew: function() { startCalcChallenge(); }, newLabel: __alloT('stem.calculus.ch_new', 'New Challenge') })),
            cq && cq.answered && !cq.correct && cq.mis && h('div',{className:'bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2 text-xs text-amber-900',style:{animation:'calcFade 0.3s ease'}},h('span',{className:'font-bold'},'\uD83D\uDCA1 ' + __alloT('stem.calculus.explanation', 'Explanation:') + ' '),misconceptionText(cq.mis, cq.mode)),
            !(cq && cq.mis) && cHint && h('div',{className:'bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2 text-xs text-amber-900'},h('span',{className:'font-bold'},'\uD83D\uDCA1 ' + __alloT('stem.calculus.explanation', 'Explanation:') + ' '),cHint),
            cq&&cq.answered&&(cq.correct||(cq.revealed&&!noReveal))&&cq.mode==='method'&&cq.errors&&h('div',{className:'mt-2 bg-slate-50 rounded-lg p-2 border', tabIndex:0, role:'region', 'aria-label': fillT(__alloT('stem.calculus.ch_error_compare', 'Error comparison (n = {n})'), { n: cq.n })},
              h('p',{className:'text-[0.6875rem] font-bold text-slate-700 uppercase mb-1'},fillT(__alloT('stem.calculus.ch_error_compare', 'Error comparison (n = {n})'), { n: cq.n })),
              h('div',{className:'grid grid-cols-2 sm:grid-cols-5 gap-1 text-center'},(Array.isArray(cq.choices) ? cq.choices : CALC_METHOD_IDS).filter(function(m) { return finiteCoord(cq.errors[m]); }).map(function(m){
                return h('div',{key:m,className:'px-1 py-1 rounded text-[0.6875rem] font-bold '+(m===cq.answer?'bg-emerald-100 text-emerald-800 border border-emerald-300':'bg-white text-slate-700 border')},
                  h('div',null,methodName(m)),h('div',{className:'text-[0.6875rem]'},cq.errors[m].toExponential(2)));
              }))
            )
          ),

          // ══════════════════════════════════════════════════════════════
          // TAB: DISCOVER (Guided Missions)
          // ══════════════════════════════════════════════════════════════
          tab === 'discover' && h('div', { key: 'discover' },

            h('p',{className:'text-xs text-slate-700 mb-3' + onHostInk},__alloT('stem.calculus.disc_intro', 'Guided investigations: you measure, predict, and find the pattern. The tool is your calculator, not your teacher.')),

            // Mission selector
            h('div',{ className:'flex gap-2 mb-4 flex-wrap', role:'group', 'data-calc-missions': true, 'aria-label': __alloT('stem.calculus.disc_missions', 'Missions')},
              ['\uD83D\uDD0D ' + __alloT('stem.calculus.disc_m1', 'Error & n'),'\u26A1 ' + __alloT('stem.calculus.disc_m2', 'Method Showdown'),'\uD83D\uDCCF ' + __alloT('stem.calculus.disc_m3', 'Find the Rule'),'\uD83D\uDE97 ' + __alloT('stem.calculus.disc_m4', 'Area as Distance')].map(function(label,i){
                return h('button',{ key:i,type:'button','aria-pressed':(d.missionIdx||0)===i,onClick:function(){updMany({ missionIdx: i, missionStep: 0, missionData: {} });},className:'min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all '+((d.missionIdx||0)===i?'bg-red-600 text-white shadow-md':'bg-slate-100 text-slate-700 hover:bg-slate-200')},label);
              })
            ),

            // ── MISSION 0: How does error change with n? ──────────────────
            (d.missionIdx||0) === 0 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key, val){ upd('missionData', Object.assign({}, data, { [key]: val })); };

              return h('div',{style:{animation:'calcFade 0.3s ease'}},
                h('div',{ className:'bg-red-50 rounded-xl border border-red-200 p-4 mb-3'},
                  h('h4',{className:'text-xs font-bold text-red-700 uppercase tracking-wider mb-1'},'\uD83D\uDD0D ' + __alloT('stem.calculus.m1_title', 'Mission 1: The Error Halving Law')),
                  h('p',{className:'text-xs text-red-800'},__alloT('stem.calculus.m1_goal', 'Goal: Discover what happens to the error when you double the number of rectangles.')),
                  h('div',{ role:'progressbar', 'aria-label':__alloT('stem.calculus.a11y_mission_1_progress', 'Mission 1 progress'), 'aria-valuemin':0, 'aria-valuemax':5, 'aria-valuenow':Math.min(step,5), 'aria-valuetext':fillT(__alloT('stem.calculus.step_of', 'Step {n} of {t}'), { n: Math.min(step+1,5), t: 5 })},
                    h('p',{className:'text-[0.625rem] font-bold text-red-700 mb-1'},fillT(__alloT('stem.calculus.step_of', 'Step {n} of {t}'), { n: Math.min(step+1,5), t: 5 })),
                    h('div',{ className:'flex gap-1', 'aria-hidden':'true'},
                      [0,1,2,3,4].map(function(i){
                        return h('div',{ key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-red-500':step===i?'bg-red-300':'bg-slate-200')});
                      })
                    )
                  )
                ),

                // Step 0: Setup + first observation
                step === 0 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2' + onHostInk},'\u2460 ' + __alloT('stem.calculus.m1_s0_title', 'Set up the investigation')),
                  h('p',{className:'text-xs text-slate-700 mb-3' + onHostInk},__alloT('stem.calculus.m1_s0_body', 'Load f(x) = x\u00B2 on [0, 3] with left Riemann sums. Then switch to the Integral tab to see the graph.')),
                  h('button',{ type:'button', onClick:function(){
                    setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{fnMode:'quad',a:1,b:0,c:0,xMin:0,xMax:3,n:4,mode:'left',tab:'discover',predictMode:false,overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false})});});
                    addToast(__alloT('stem.calculus.m1_loaded', 'Loaded \u222B x\u00B2 on [0, 3] with n = 4, left Riemann'),'success');
                    stemBeep&&stemBeep('click');
                  },className:'min-h-[36px] px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-all mb-3'},'\u25B6 ' + __alloT('stem.calculus.m1_load', 'Load f(x) = x\u00B2 on [0, 3], n = 4')),
                  h('p',{className:'text-xs text-slate-800 mb-2 font-bold' + onHostInk},__alloT('stem.calculus.m1_s0_measure', 'Now go to the Integral tab and find the error value for n = 4. (Answer the over/under question there to reveal it.) Come back and enter it below:')),
                  h('div',{ className:'flex gap-2 items-center flex-wrap'},
                    h('span',{ className:'text-xs font-bold text-slate-700' + onHostInk},__alloT('stem.calculus.m1_err4', 'Error at n=4:')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'0.????',value:data.err4||'','aria-label':__alloT('stem.calculus.a11y_riemann_sum_error_at_n_equals_4', 'Riemann-sum error at n equals 4'),onChange:function(e){saveData('err4',e.target.value);},className:'w-24 px-2 py-1 border-2 border-red-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_got_it', 'Got it'),type:'button',disabled:!data.err4,onClick:function(){nextStep();stemBeep&&stemBeep('click');},className:'transition-colors min-h-[32px] px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-red-700'},__alloT('stem.calculus.got_it', 'Got it') + ' \u2192')
                  )
                ),

                // Step 1: Double n, commit a qualitative hypothesis
                step === 1 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2' + onHostInk},'\u2461 ' + __alloT('stem.calculus.m1_s1_title', 'Commit a hypothesis before measuring')),
                  h('p',{className:'text-xs text-slate-700 mb-2' + onHostInk},fillT(__alloT('stem.calculus.m1_s1_body', 'You recorded error \u2248 {e} at n = 4. Now you will double n to 8.'), { e: (parseFloat(data.err4)||0).toFixed(4) })),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-3' + onHostInk},__alloT('stem.calculus.m1_s1_ask', 'Before changing the slider, hypothesize how the error will change:')),
                  h('div',{ className:'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3', role:'group', 'aria-label': __alloT('stem.calculus.m1_hypotheses', 'Hypotheses')},
                    [['same',__alloT('stem.calculus.hyp_same', 'About the same')],['half',fillT(__alloT('stem.calculus.hyp_half', 'About half ({v})'), { v: ((parseFloat(data.err4)||0)/2).toFixed(4) })],['quarter',fillT(__alloT('stem.calculus.hyp_quarter', 'About a quarter ({v})'), { v: ((parseFloat(data.err4)||0)/4).toFixed(4) })],['smaller',__alloT('stem.calculus.hyp_smaller', 'Much smaller (near 0)')]].map(function(item){
                      return h('button',{ type:'button', 'aria-pressed':data.prediction1===item[0],key:item[0],onClick:function(){saveData('prediction1',item[0]);},className:'min-h-[36px] px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all '+(data.prediction1===item[0]?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-700 border-slate-300 hover:border-violet-400')},item[1]);
                    })
                  ),
                  data.prediction1 && h('button',{"aria-label":__alloT('stem.calculus.a11y_hypothesis_committed_now_measure', 'Hypothesis committed; now measure'),type:'button',onClick:nextStep,className:'transition-colors min-h-[36px] px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700'},__alloT('stem.calculus.m1_committed', 'Hypothesis committed: now measure') + ' \u2192')
                ),

                // Step 2: Measure n=8
                step === 2 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2' + onHostInk},'\u2462 ' + __alloT('stem.calculus.m1_s2_title', 'Measure at n = 8')),
                  h('p',{className:'text-xs text-slate-700 mb-3' + onHostInk},__alloT('stem.calculus.m1_s2_body', 'Go to the Integral tab, set n = 8 with the slider, and record the error:')),
                  h('div',{ className:'flex gap-2 items-center mb-3 flex-wrap'},
                    h('span',{ className:'text-xs font-bold text-slate-700' + onHostInk},__alloT('stem.calculus.m1_err8', 'Error at n=8:')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'0.????',value:data.err8||'','aria-label':__alloT('stem.calculus.a11y_riemann_sum_error_at_n_equals_8', 'Riemann-sum error at n equals 8'),onChange:function(e){saveData('err8',e.target.value);},className:'w-24 px-2 py-1 border-2 border-red-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_got_it', 'Got it'),type:'button',disabled:!data.err8,onClick:function(){nextStep();stemBeep&&stemBeep('click');},className:'transition-colors min-h-[32px] px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-red-700'},__alloT('stem.calculus.got_it', 'Got it') + ' \u2192')
                  )
                ),

                // Step 3: Compare the pattern claim, then estimate n=16
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2' + onHostInk},'\u2463 ' + __alloT('stem.calculus.m1_s3_title', 'Find the pattern')),
                  (function(){
                    var e4Raw=parseFloat(data.err4), e8Raw=parseFloat(data.err8);
                    var e4=isFinite(e4Raw)?Math.abs(e4Raw):0, e8=isFinite(e8Raw)?Math.abs(e8Raw):0;
                    var ratio=e8!==0?(e4/e8).toFixed(2):null;
                    var hypothesisTargets={same:e4,half:e4/2,quarter:e4/4,smaller:0};
                    var observedCategory=e4===0?'same':Object.keys(hypothesisTargets).reduce(function(best,key){return Math.abs(hypothesisTargets[key]-e8)<Math.abs(hypothesisTargets[best]-e8)?key:best;},'same');
                    var hypothesisLabels={same:__alloT('stem.calculus.hyp_l_same', 'about the same'),half:__alloT('stem.calculus.hyp_l_half', 'about half'),quarter:__alloT('stem.calculus.hyp_l_quarter', 'about a quarter'),smaller:__alloT('stem.calculus.hyp_l_smaller', 'much smaller (near 0)')};
                    var patternAgrees=data.prediction1===observedCategory;
                    return h('div',null,
                      h('div',{ className:'bg-white rounded-lg border p-3 mb-3'},
                        h('p',{className:'text-xs text-slate-700'},fillT(__alloT('stem.calculus.m1_e4_line', 'Error at n = 4: {e}'), { e: e4.toFixed(4) })),
                        h('p',{className:'text-xs text-slate-700'},fillT(__alloT('stem.calculus.m1_e8_line', 'Error at n = 8: {e}'), { e: e8.toFixed(4) })),
                        h('p',{className:'text-sm font-bold text-red-700 mt-1'},ratio==null?__alloT('stem.calculus.m1_ratio_undef', 'The n = 8 error is 0, so the division ratio is undefined.'):fillT(__alloT('stem.calculus.m1_ratio', 'Ratio: {a} \u00F7 {b} = {r}'), { a: e4.toFixed(4), b: e8.toFixed(4), r: ratio })),
                        h('p',{className:'text-xs text-slate-700 mt-1'},ratio==null?__alloT('stem.calculus.m1_zero', 'The recorded error reached 0 at n = 8.'):fillT(__alloT('stem.calculus.m1_divided', 'When n doubled (4 \u2192 8), the error was divided by about {r}.'), { r: ratio })),
                        h('div',{className:'mt-2 rounded-lg border border-violet-200 bg-violet-50 p-2','data-calculus-error-pattern-comparison':'descriptive-ungraded',role:'status','aria-live':'polite'},
                          h('p',{className:'text-[0.6875rem] text-violet-900'},fillT(__alloT('stem.calculus.m1_compare', 'Committed hypothesis: {h}. Closest listed description of the measured n = 8 error: {o}.'), { h: hypothesisLabels[data.prediction1]||__alloT('stem.calculus.not_recorded', 'not recorded'), o: hypothesisLabels[observedCategory] })),
                          h('p',{className:'text-[0.6875rem] font-bold text-violet-800'},patternAgrees?__alloT('stem.calculus.evidence_agrees', 'Evidence agrees with your hypothesis.'):__alloT('stem.calculus.evidence_differs', 'Evidence differs from your hypothesis.')),
                          h('p',{className:'text-[0.625rem] text-violet-800'},__alloT('stem.calculus.m1_ungraded', 'Agreement is descriptive and ungraded; use the measured ratio to make the next estimate.'))
                        )
                      ),
                      h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m1_s3_ask', 'Now estimate the error at n = 16 by applying the measured ratio again.')),
                      h('div',{ className:'flex gap-2 items-center flex-wrap'},
                        h('span',{ className:'text-xs font-bold text-slate-700'},__alloT('stem.calculus.m1_est16', 'Estimated error at n=16:')),
                        h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'0.????',value:data.predictN16||'','aria-label':__alloT('stem.calculus.a11y_estimated_error_at_n_equals_16', 'Estimated error at n equals 16'),onChange:function(e){saveData('predictN16',e.target.value);},className:'w-24 px-2 py-1 border-2 border-violet-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                        h('button',{"aria-label":__alloT('stem.calculus.a11y_estimate_committed', 'Estimate committed'),type:'button',disabled:!data.predictN16,onClick:function(){nextStep();stemBeep&&stemBeep('click');},className:'transition-colors min-h-[32px] px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-red-700'},__alloT('stem.calculus.estimate_committed', 'Estimate committed') + ' \u2192')
                      )
                    );
                  })()
                ),

                // Step 4: Verify + conclude
                step === 4 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2464 ' + __alloT('stem.calculus.m1_s4_title', 'Verify and conclude')),
                  h('p',{className:'text-xs text-slate-700 mb-2'},__alloT('stem.calculus.m1_s4_body', 'Set n = 16 on the Integral tab and record the measured error. Then compare it with your committed estimate.')),
                  h('div',{className:'flex gap-2 items-center mb-3 flex-wrap'},
                    h('span',{className:'text-xs font-bold text-slate-700'},__alloT('stem.calculus.m1_meas16', 'Measured error at n=16:')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'0.????',value:data.err16||'','aria-label':__alloT('stem.calculus.a11y_measured_error_at_n_equals_16', 'Measured error at n equals 16'),onChange:function(e){saveData('err16',e.target.value);},className:'w-24 px-2 py-1 border-2 border-red-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'})
                  ),
                  data.err16 && (function(){
                    var pred=parseFloat(data.predictN16)||0, actual=parseFloat(data.err16)||0;
                    var absDiff=Math.abs(pred-actual);
                    var pctOff=actual!==0?absDiff/Math.abs(actual)*100:null;
                    return h('div',{style:{animation:'calcFade 0.3s ease'}},
                      h('div',{className:'bg-violet-50 rounded-xl border border-violet-200 p-3 mb-3',role:'status','aria-live':'polite','data-calculus-error-estimate-comparison':'descriptive-ungraded'},
                        h('p',{className:'text-sm font-bold text-violet-800 mb-1'},__alloT('stem.calculus.m1_compared', 'Estimate compared with measured error (ungraded)')),
                        h('p',{className:'text-xs text-violet-900'},pctOff==null
                          ? fillT(__alloT('stem.calculus.m1_compare_abs', 'Committed estimate: {p}. Measured error: {a}. Absolute difference: {d}.'), { p: pred.toFixed(4), a: actual.toFixed(4), d: absDiff.toFixed(4) })
                          : fillT(__alloT('stem.calculus.m1_compare_pct', 'Committed estimate: {p}. Measured error: {a}. Absolute % difference: {d}%.'), { p: pred.toFixed(4), a: actual.toFixed(4), d: pctOff.toFixed(0) })),
                        h('p',{className:'text-[0.6875rem] text-violet-800 mt-1'},__alloT('stem.calculus.m1_calibration', 'Closeness is calibration evidence. Mission completion comes from estimating, measuring, and explaining the pattern, not from matching.'))
                      ),
                      h('div',{className:'bg-slate-50 rounded-xl border p-3'},
                        h('p',{className:'text-xs font-bold text-slate-800 uppercase tracking-wider mb-2'},'\uD83D\uDCCC ' + __alloT('stem.calculus.big_idea', 'The Big Idea')),
                        h('p',{className:'text-xs text-slate-800 mb-1'},__alloT('stem.calculus.m1_idea_1', 'In this smooth example, the leading Left Riemann-sum error behaves roughly like 1/n, so doubling n approximately halves it.')),
                        h('p',{className:'text-xs text-slate-800'},__alloT('stem.calculus.m1_idea_2', 'For smooth functions, the composite trapezoid rule often has leading error proportional to 1/n\u00B2; doubling n then reduces that error to roughly one quarter.')),
                        h('p',{className:'text-xs font-bold text-red-700 mt-2'},__alloT('stem.calculus.m1_idea_3', "And Simpson's? Test it on your own!")),
                        awardMissionOnce('m1',15,__alloT('stem.calculus.xp_mission_1', 'Mission 1 complete'))
                      )
                    );
                  })()
                )
              );
            })(),

            // ── MISSION 1: Method Showdown ────────────────────────────────
            (d.missionIdx||0) === 1 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key,val){ upd('missionData', Object.assign({}, data, {[key]:val})); };
              var METHOD_IDS = ['Left Riemann','Right Riemann','Midpoint','Trapezoidal',"Simpson's"];
              var methodShown = function(m) { return m === 'Left Riemann' ? __alloT('stem.calculus.m2_left', 'Left Riemann') : m === 'Right Riemann' ? __alloT('stem.calculus.m2_right', 'Right Riemann') : m === 'Midpoint' ? methodName('midpoint') : m === 'Trapezoidal' ? __alloT('stem.calculus.method_trapezoidal', 'Trapezoidal') : methodName('simpson'); };
              var WHY = [
                { text: __alloT('stem.calculus.m2_why_0', 'It uses parabolas, which fit polynomial curves better than flat-top rectangles'), mis: '' },
                { text: __alloT('stem.calculus.m2_why_1', 'It uses the most rectangles'), mis: __alloT('stem.calculus.m2_mis_1', 'Every method here used the same n = 6 strips. The advantage is the SHAPE of each piece, not the number of pieces.') },
                { text: __alloT('stem.calculus.m2_why_2', 'It averages left and right'), mis: __alloT('stem.calculus.m2_mis_2', 'Averaging left and right gives the trapezoid rule, which still has an error here.') },
                { text: __alloT('stem.calculus.m2_why_3', 'It avoids the edges of the curve'), mis: __alloT('stem.calculus.m2_mis_3', 'Simpson\u2019s uses both endpoints of every pair of strips. Its power is fitting a parabola through three points.') }
              ];
              return h('div',{ style:{animation:'calcFade 0.3s ease'}},
                h('div',{ className:'bg-amber-50 rounded-xl border border-amber-200 p-4 mb-3'},
                  h('h4',{className:'text-xs font-bold text-amber-800 uppercase tracking-wider mb-1'},'\u26A1 ' + __alloT('stem.calculus.m2_title', 'Mission 2: Method Showdown')),
                  h('p',{className:'text-xs text-amber-900'},__alloT('stem.calculus.m2_goal', 'Goal: Discover which integration method is most accurate, and why.')),
                  h('div',{ className:'flex gap-1 mt-2', 'aria-hidden':'true'},[0,1,2,3].map(function(i){return h('div',{key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-amber-500':step===i?'bg-amber-300':'bg-slate-200')});})),
                  h('p',{className:'sr-only'},fillT(__alloT('stem.calculus.step_of', 'Step {n} of {t}'), { n: Math.min(step+1,4), t: 4 }))
                ),
                step === 0 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 ' + __alloT('stem.calculus.m2_s0_title', 'Commit a hypothesis before you test')),
                  h('button',{"aria-label":__alloT('stem.calculus.a11y_load_f_x_x_squared_on_0_to_3_with_6_subdivision', 'Load f(x) = x squared on 0 to 3 with 6 subdivisions'),type:'button',onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{fnMode:'quad',a:1,b:0,c:0,xMin:0,xMax:3,n:6,mode:'left',tab:'discover',overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false})});});addToast(__alloT('stem.calculus.m2_loaded', 'Loaded for Method Showdown'),'success');},className:'transition-colors min-h-[36px] px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800 mb-3 block'},'\u25B6 ' + __alloT('stem.calculus.m2_load', 'Load f(x) = x\u00B2 on [0, 3], n = 6')),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m2_s0_ask', 'At n = 6, which method do you hypothesize will have the smallest absolute error?')),
                  h('div',{ className:'grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3', role:'group', 'aria-label': __alloT('stem.calculus.m2_hyp_group', 'Your hypothesis')},
                    METHOD_IDS.map(function(m){
                      return h('button',{ type:'button', 'aria-pressed':data.prediction===m,key:m,onClick:function(){saveData('prediction',m);},className:'min-h-[36px] px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all '+(data.prediction===m?'bg-amber-700 text-white border-amber-500':'bg-white text-slate-700 border-slate-300 hover:border-amber-600')},methodShown(m));
                    })
                  ),
                  data.prediction && h('button',{"aria-label":__alloT('stem.calculus.a11y_hypothesis_committed_collect_evidence', 'Hypothesis committed; collect evidence'),type:'button',onClick:nextStep,className:'transition-colors min-h-[36px] px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800'},__alloT('stem.calculus.m2_committed', 'Hypothesis committed: collect evidence') + ' \u2192')
                ),
                step === 1 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 ' + __alloT('stem.calculus.m2_s1_title', 'Measure errors for all 5 methods')),
                  h('p',{className:'text-xs text-slate-700 mb-3'},__alloT('stem.calculus.m2_s1_body', 'Go to the Integral tab, try each method with n = 6, and record the errors.')),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m2_s1_ask', 'Which method had the SMALLEST error?')),
                  h('div',{ className:'grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3', role:'group', 'aria-label': __alloT('stem.calculus.m2_meas_group', 'Recorded smallest error')},
                    METHOD_IDS.map(function(m){
                      return h('button',{ type:'button', 'aria-pressed':data.measured===m,key:m,onClick:function(){saveData('measured',m);},className:'min-h-[36px] px-2 py-2 rounded-lg text-xs font-bold border-2 transition-all '+(data.measured===m?'bg-emerald-700 text-white border-emerald-500':'bg-white text-slate-700 border-slate-300 hover:border-emerald-600')},methodShown(m));
                    })
                  ),
                  data.measured && h('button',{"aria-label":__alloT('stem.calculus.a11y_next', 'Next'),type:'button',onClick:nextStep,className:'transition-colors min-h-[36px] px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800'},__alloT('stem.calculus.next', 'Next') + ' \u2192')
                ),
                step === 2 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2462 ' + __alloT('stem.calculus.m2_s2_title', 'Compare hypothesis with recorded evidence')),
                  h('div',{ className:'bg-white rounded-lg border p-3 mb-3',role:'status','aria-live':'polite','data-calculus-method-hypothesis-comparison':'descriptive-ungraded'},
                    h('p',{className:'text-xs text-slate-700'},fillT(__alloT('stem.calculus.m2_hyp_line', 'Committed hypothesis: {m}'), { m: methodShown(data.prediction) })),
                    h('p',{className:'text-xs text-slate-700'},fillT(__alloT('stem.calculus.m2_meas_line', 'Recorded smallest error: {m}'), { m: methodShown(data.measured) })),
                    h('p',{className:'text-sm font-bold text-violet-700 mt-1'},data.prediction===data.measured?__alloT('stem.calculus.evidence_agrees', 'Evidence agrees with your hypothesis.'):__alloT('stem.calculus.m2_differs', 'Evidence differs from your hypothesis: use the concept check below to explain why.')),
                    h('p',{className:'text-[0.6875rem] text-slate-700 mt-1'},__alloT('stem.calculus.m2_ungraded', 'Agreement is descriptive and ungraded; completing the comparison is what counts.'))
                  ),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2', id:'calc-m2-why'},__alloT('stem.calculus.m2_concept', "Concept check: why does Simpson's rule give zero error for this quadratic?")),
                  h('div',{ className:'grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3', role:'group', 'aria-labelledby':'calc-m2-why'},
                    WHY.map(function(ans,i){
                      var triedWrong = Array.isArray(data.whyTried) && data.whyTried.indexOf(i) >= 0 && i !== 0;
                      return h('button',{ type:'button', 'aria-pressed':data.why===i,key:i,disabled:triedWrong,onClick:function(){upd('missionData', Object.assign({}, data, { why: i, whyTried: (Array.isArray(data.whyTried) ? data.whyTried : []).concat([i]) }));},className:'min-h-[36px] px-2 py-2 rounded-lg text-xs text-left border-2 transition-all disabled:opacity-50 '+(data.why===i?'bg-amber-700 text-white border-amber-500':'bg-white text-slate-700 border-slate-300 hover:border-amber-600')},ans.text);
                    })
                  ),
                  data.why !== undefined && data.why !== 0 && (data.whyTried || []).length < 2 && h('p',{role:'status','aria-live':'polite',className:'text-xs font-bold text-red-800 mb-2'},fillT(__alloT('stem.calculus.m2_try_again', 'Not quite. {msg} Try once more.'), { msg: WHY[data.why] ? WHY[data.why].mis : '' })),
                  data.why !== undefined && (data.why === 0 || (data.whyTried || []).length >= 2) && h('button',{"aria-label":__alloT('stem.calculus.a11y_see_answer', 'See answer'),type:'button',onClick:nextStep,className:'transition-colors min-h-[36px] px-4 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold hover:bg-amber-800'},__alloT('stem.calculus.see_answer', 'See answer') + ' \u2192')
                ),
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2463 ' + __alloT('stem.calculus.big_idea', 'The Big Idea')),
                  h('div',{className:'bg-amber-50 rounded-xl border border-amber-200 p-3'},
                    h('p',{className:'text-sm font-bold text-amber-900 mb-2','data-calculus-method-concept-check':'graded-concept'},data.why===0?__alloT('stem.calculus.m2_concept_ok', 'Concept check: correct. Simpson\u2019s fits parabolic arcs to the curve.'):__alloT('stem.calculus.m2_concept_review', 'Concept check: review the explanation. Simpson\u2019s fits parabolic arcs to the curve.')),
                    h('p',{className:'text-xs text-amber-900 mb-1'},__alloT('stem.calculus.m2_idea_1', "Since f(x) = x\u00B2 IS already a parabola, Simpson's rule fits it perfectly, giving zero error.")),
                    h('p',{className:'text-xs text-amber-900 mb-1'},__alloT('stem.calculus.m2_idea_2', "In fact, Simpson's rule is EXACT for any polynomial of degree \u2264 3.")),
                    h('p',{className:'text-xs font-bold text-amber-900 mt-2'},__alloT('stem.calculus.m2_idea_3', "Test it: set Simpson's with n = 2. Is the error 0? Now type e^x on the Integral tab: does Simpson's still win, and by how much?")),
                    awardMissionOnce('m2',15,__alloT('stem.calculus.xp_mission_2', 'Mission 2 complete'))
                  )
                )
              );
            })(),

            // ── MISSION 2: Find the Power Rule ───────────────────────────
            (d.missionIdx||0) === 2 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key,val){ upd('missionData', Object.assign({}, data, {[key]:val})); };
              var FORMULA_MIS = { 'x\u00B2': __alloT('stem.calculus.m3_mis_x2', 'x\u00B2 gives 1, 4, 9: that is f itself, the height, not the slope.'), 'x + 1': __alloT('stem.calculus.m3_mis_x1', 'x + 1 gives 2, 3, 4: check it against f\u2032(2) and f\u2032(3).'), 'x/2': __alloT('stem.calculus.m3_mis_half', 'x/2 gives 0.5, 1, 1.5: the slopes you measured are four times bigger.') };
              return h('div',{ style:{animation:'calcFade 0.3s ease'}},
                h('div',{ className:'bg-violet-50 rounded-xl border border-violet-200 p-4 mb-3'},
                  h('h4',{className:'text-xs font-bold text-violet-700 uppercase tracking-wider mb-1'},'\uD83D\uDCCF ' + __alloT('stem.calculus.m3_title', 'Mission 3: Discover the Power Rule')),
                  h('p',{className:'text-xs text-violet-800'},__alloT('stem.calculus.m3_goal', 'Goal: By measuring slopes, you will discover f\u2032(x) = 2ax + b yourself, before being told.')),
                  h('div',{ className:'flex gap-1 mt-2', 'aria-hidden':'true'},[0,1,2,3].map(function(i){return h('div',{key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-violet-500':step===i?'bg-violet-300':'bg-slate-200')});})),
                  h('p',{className:'sr-only'},fillT(__alloT('stem.calculus.step_of', 'Step {n} of {t}'), { n: Math.min(step+1,4), t: 4 }))
                ),
                step === 0 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 ' + __alloT('stem.calculus.m3_s0_title', 'Set up and measure')),
                  h('button',{"aria-label":__alloT('stem.calculus.a11y_load_f_x_x_squared_with_x_zero_equal_to_1', 'Load f(x) = x squared with x zero equal to 1'),type:'button',onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{fnMode:'quad',a:1,b:0,c:0,xMin:-1,xMax:4,n:20,mode:'left',x0:1,secantH:0.1,tab:'discover',overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false})});});addToast(__alloT('stem.calculus.m3_loaded', 'Loaded f(x) = x\u00B2'),'success');},className:'transition-colors min-h-[36px] px-4 py-2 bg-violet-700 text-white rounded-lg text-xs font-bold hover:bg-violet-600 mb-3 block'},'\u25B6 ' + __alloT('stem.calculus.m3_load', 'Load f(x) = x\u00B2, x\u2080 = 1')),
                  h('p',{className:'text-xs text-slate-700 mb-2'},__alloT('stem.calculus.m3_s0_body', 'Go to the Derivative tab. Drag h close to 0. The slope shown is f\u2032(1). Repeat at x\u2080 = 2 and 3, and record each:')),
                  h('div',{ className:'space-y-2'},
                    [['1','slope1'],['2','slope2'],['3','slope3']].map(function(item){
                      return h('div',{ key:item[0],className:'flex gap-2 items-center'},
                        h('span',{ className:'text-xs font-bold text-slate-700 w-24'},'f\u2032('+item[0]+') ='),
                        h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'?',value:data[item[1]]||'','aria-label':fillT(__alloT('stem.calculus.a11y_derivative_value_at_x', 'Derivative value at x {x}'), { x: item[0] }),onChange:function(e){saveData(item[1],e.target.value);},className:'w-20 px-2 py-1 border-2 border-violet-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'})
                      );
                    })
                  ),
                  data.slope1 && data.slope2 && data.slope3 && h('button',{"aria-label":__alloT('stem.calculus.a11y_got_all_three', 'Got all three'),type:'button',onClick:nextStep,className:'transition-colors mt-3 min-h-[36px] px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700'},__alloT('stem.calculus.m3_got_three', 'Got all three') + ' \u2192')
                ),
                step === 1 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 ' + __alloT('stem.calculus.m3_s1_title', 'Spot the pattern')),
                  h('div',{ className:'bg-white rounded-lg border p-3 mb-3'},
                    ['1','2','3'].map(function(x,i){
                      var key=['slope1','slope2','slope3'][i];
                      return h('p',{key:x,className:'text-xs text-slate-800'},'f\u2032('+x+') = '+(data[key]||'?'));
                    })
                  ),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2', id:'calc-m3-formula'},__alloT('stem.calculus.m3_s1_ask', 'What formula produces these values? f\u2032(x) = ___')),
                  h('div',{ className:'grid grid-cols-2 gap-2 mb-3', role:'group', 'aria-labelledby':'calc-m3-formula'},
                    ['2x','x\u00B2','x + 1','x/2'].map(function(f){
                      var triedWrong = Array.isArray(data.formulaTried) && data.formulaTried.indexOf(f) >= 0 && f !== '2x';
                      return h('button',{ type:'button', 'aria-pressed':data.formulaGuess===f,key:f,disabled:triedWrong,onClick:function(){upd('missionData', Object.assign({}, data, { formulaGuess: f, formulaTried: (Array.isArray(data.formulaTried) ? data.formulaTried : []).concat([f]) }));},className:'min-h-[36px] px-3 py-2 rounded-lg text-sm font-bold border-2 transition-all disabled:opacity-50 '+(data.formulaGuess===f?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-700 border-slate-300 hover:border-violet-400')},'f\u2032(x) = ' + f);
                    })
                  ),
                  data.formulaGuess && data.formulaGuess !== '2x' && (data.formulaTried || []).length < 2 && h('p',{role:'status','aria-live':'polite',className:'text-xs font-bold text-red-800 mb-2'},fillT(__alloT('stem.calculus.m3_try_again', 'Not quite. {msg} Try once more.'), { msg: FORMULA_MIS[data.formulaGuess] || '' })),
                  data.formulaGuess && (data.formulaGuess === '2x' || (data.formulaTried || []).length >= 2) && h('button',{"aria-label":__alloT('stem.calculus.a11y_check_answer', 'Check answer'),type:'button',onClick:nextStep,className:'transition-colors min-h-[36px] px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700'},__alloT('stem.calculus.check_answer', 'Check answer') + ' \u2192')
                ),
                step === 2 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2462 ' + __alloT('stem.calculus.m3_s2_title', 'You found it!')),
                  h('div',{ className:'bg-violet-50 rounded-xl border border-violet-200 p-3 mb-3'},
                    h('p',{className:'text-sm font-bold text-violet-800 mb-1'},(data.formulaGuess==='2x'?'\u2705 ' + __alloT('stem.calculus.m3_yes', 'Yes! f\u2032(x) = 2x.'):'\uD83D\uDCA1 ' + __alloT('stem.calculus.m3_actually', 'Actually: f\u2032(x) = 2x.'))),
                    h('p',{className:'text-xs text-violet-800 mb-1'},__alloT('stem.calculus.m3_s2_1', 'For f(x) = x\u00B2 the derivative is 2x.')),
                    h('p',{className:'text-xs text-violet-800'},__alloT('stem.calculus.m3_s2_2', 'This is the Power Rule: d/dx[x\u207F] = n\u00B7x\u207F\u207B\u00B9. For n = 2: d/dx[x\u00B2] = 2x\u00B9 = 2x.'))
                  ),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m3_s2_ask', 'Now set a = 2 (f(x) = 2x\u00B2) on the Derivative tab. Predict f\u2032(1) first, then measure.')),
                  h('div',{ className:'flex gap-2 items-center mb-3 flex-wrap'},
                    h('span',{ className:'text-xs font-bold'},__alloT('stem.calculus.m3_for_2x2', 'f\u2032(1) for 2x\u00B2:')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'?',value:data.slope2x||'','aria-label':__alloT('stem.calculus.a11y_derivative_at_x_equals_1_for_2x_squared', 'Derivative at x equals 1 for 2x squared'),onChange:function(e){saveData('slope2x',e.target.value);},className:'w-20 px-2 py-1 border-2 border-violet-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_verify', 'Verify'),type:'button',disabled:!data.slope2x,onClick:nextStep,className:'transition-colors min-h-[32px] px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-violet-700'},__alloT('stem.calculus.verify', 'Verify') + ' \u2192')
                  )
                ),
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('div',{className:'bg-violet-50 rounded-xl border border-violet-200 p-3'},
                    h('p',{className:'text-sm font-bold text-violet-800 mb-2'},'\uD83C\uDF89 ' + __alloT('stem.calculus.m3_general', 'The General Power Rule')),
                    h('p',{className:'text-xs text-violet-800 mb-1'},fillT(__alloT('stem.calculus.m3_measured', 'You measured: for f(x) = 2x\u00B2, f\u2032(1) \u2248 {v}. (It should be 4 = 2 \u00D7 2 \u00D7 1.)'), { v: data.slope2x||'?' })),
                    h('p',{className:'text-xs text-violet-800 mb-1'},__alloT('stem.calculus.m3_rule', 'General rule: d/dx[ax\u00B2 + bx + c] = 2ax + b')),
                    h('p',{className:'text-xs text-violet-800 mb-2'},__alloT('stem.calculus.m3_c', 'The constant c vanishes because a horizontal line has zero slope.')),
                    h('p',{className:'text-xs font-bold text-violet-900'},__alloT('stem.calculus.m3_try', 'Try: add b = 3. What is f\u2032(0) now? What does f\u2032(0) equal in terms of b?')),
                    awardMissionOnce('m3',15,__alloT('stem.calculus.xp_mission_3', 'Mission 3 complete'))
                  )
                )
              );
            })(),

            // ── MISSION 3: Area as Distance ───────────────────────────────
            (d.missionIdx||0) === 3 && (function(){
              var step = d.missionStep || 0;
              var data = d.missionData || {};
              var nextStep = function(){ upd('missionStep', step+1); };
              var saveData = function(key,val){ upd('missionData', Object.assign({}, data, {[key]:val})); };
              return h('div',{ style:{animation:'calcFade 0.3s ease'}},
                h('div',{ className:'bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-3'},
                  h('h4',{className:'text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1'},'\uD83D\uDE97 ' + __alloT('stem.calculus.m4_title', 'Mission 4: Area as Accumulated Distance')),
                  h('p',{className:'text-xs text-emerald-800'},__alloT('stem.calculus.m4_goal', 'Goal: Understand why the area under a velocity curve equals distance traveled.')),
                  h('div',{ className:'flex gap-1 mt-2', 'aria-hidden':'true'},[0,1,2,3].map(function(i){return h('div',{key:i,className:'flex-1 h-1.5 rounded-full '+(step>i?'bg-emerald-500':step===i?'bg-emerald-300':'bg-slate-200')});})),
                  h('p',{className:'sr-only'},fillT(__alloT('stem.calculus.step_of', 'Step {n} of {t}'), { n: Math.min(step+1,4), t: 4 }))
                ),
                step === 0 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2460 ' + __alloT('stem.calculus.m4_s0_title', 'The setup')),
                  h('p',{className:'text-xs text-slate-800 mb-2'},__alloT('stem.calculus.m4_s0_body', 'A car starts from rest. Its velocity (in m/s) at time t seconds is:')),
                  h('p',{className:'text-base font-black text-emerald-700 text-center mb-2'},'v(t) = 2t m/s'),
                  h('p',{className:'text-xs text-slate-800 mb-3'},__alloT('stem.calculus.m4_s0_axes', 'The x-axis is time (seconds), the y-axis is velocity (m/s). The area under the velocity curve is the total distance traveled.')),
                  h('button',{"aria-label":__alloT('stem.calculus.a11y_load_v_t_2t_t_0_3_v2', 'Load v(t) = 2t, t from 0 to 3'),type:'button',onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{fnMode:'quad',a:0,b:2,c:0,xMin:0,xMax:3,n:20,mode:'left',tab:'discover',overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false})});});addToast(__alloT('stem.calculus.m4_loaded', 'Loaded v(t) = 2t from t = 0 to t = 3'),'success');},className:'transition-colors min-h-[36px] px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 mb-3 block'},'\u25B6 ' + __alloT('stem.calculus.m4_load', 'Load v(t) = 2t, t from 0 to 3')),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m4_s0_ask', 'Before computing: the velocity graph from t = 0 to t = 3 is a triangle. What is the area of this triangle?')),
                  h('p',{className:'text-xs text-slate-700 mb-2'},__alloT('stem.calculus.m4_s0_hint', '(Hint: area of a triangle = \u00BD \u00D7 base \u00D7 height. Base = 3, height = v(3) = 2 \u00D7 3 = ?)')),
                  h('div',{ className:'flex gap-2 items-center flex-wrap'},
                    h('span',{ className:'text-xs font-bold'},__alloT('stem.calculus.m4_my_area', 'My triangle area:')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'? m',value:data.triangleArea||'','aria-label':__alloT('stem.calculus.a11y_triangle_area_in_meters', 'Triangle area in meters'),onChange:function(e){saveData('triangleArea',e.target.value);},className:'w-20 px-2 py-1 border-2 border-emerald-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('span',{ className:'text-xs text-slate-700'},__alloT('stem.calculus.meters', 'meters')),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_got_it', 'Got it'),type:'button',disabled:!data.triangleArea,onClick:nextStep,className:'transition-colors min-h-[32px] px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-800'},__alloT('stem.calculus.got_it', 'Got it') + ' \u2192')
                  )
                ),
                step === 1 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('p',{className:'text-sm font-bold text-slate-800 mb-2'},'\u2461 ' + __alloT('stem.calculus.m4_s1_title', 'Verify with Riemann sums')),
                  h('p',{className:'text-xs text-slate-700 mb-2'},__alloT('stem.calculus.m4_s1_body', 'Go to the Integral tab. The exact value shown is the definite integral of v(t) = 2t from 0 to 3. What is it?')),
                  h('div',{ className:'flex gap-2 items-center mb-3 flex-wrap'},
                    h('span',{ className:'text-xs font-bold'},__alloT('stem.calculus.m4_int_value', 'Integral value:')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'?',value:data.integralVal||'','aria-label':__alloT('stem.calculus.a11y_definite_integral_value_in_meters', 'Definite integral value in meters'),onChange:function(e){saveData('integralVal',e.target.value);},className:'w-20 px-2 py-1 border-2 border-emerald-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_verify', 'Verify'),type:'button',disabled:!data.integralVal,onClick:nextStep,className:'transition-colors min-h-[32px] px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-800'},__alloT('stem.calculus.verify', 'Verify') + ' \u2192')
                  )
                ),
                step === 2 && h('div',{ style:{animation:'calcFade 0.3s ease'}},
                  h('div',{ className:'bg-emerald-50 rounded-xl border border-emerald-200 p-3 mb-3'},
                    h('p',{className:'text-sm font-bold text-emerald-700 mb-2'},'\u2462 ' + __alloT('stem.calculus.m4_s2_title', 'Compare the two')),
                    h('p',{className:'text-xs text-emerald-800 mb-1'},fillT(__alloT('stem.calculus.m4_tri_line', 'Triangle area: {v} m'), { v: data.triangleArea })),
                    h('p',{className:'text-xs text-emerald-800 mb-1'},fillT(__alloT('stem.calculus.m4_int_line', 'Definite integral: {v} m'), { v: data.integralVal })),
                    h('p',{className:'text-xs font-bold text-emerald-900 mt-2'},(Math.abs(parseFloat(data.triangleArea||9)-9)<0.5?'\u2705 ' + __alloT('stem.calculus.m4_match', 'Both give 9 meters. The car traveled 9 meters in 3 seconds.'):'\uD83D\uDCA1 ' + __alloT('stem.calculus.m4_nomatch', 'Both should give 9 m. Triangle: \u00BD \u00D7 3 \u00D7 6 = 9. Check your triangle calculation.')))
                  ),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m4_why', 'Why does this work? Each thin rectangle has width \u0394t (time) and height v(t) (velocity). Area = v(t) \u00D7 \u0394t = distance. Add them all up and you get the total distance. That is exactly what integration does.')),
                  h('p',{className:'text-xs font-bold text-slate-800 mb-2'},__alloT('stem.calculus.m4_ext', 'Extension: estimate how far the car travels in 5 seconds before changing the interval.')),
                  h('div',{ className:'flex gap-2 items-center flex-wrap'},
                    h('span',{ className:'text-xs font-bold'},__alloT('stem.calculus.m4_dist5', 'Distance in 5 s (estimate):')),
                    h('input',{style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'}, type:'number',step:'any',placeholder:'? m',value:data.predict5||'','aria-label':__alloT('stem.calculus.a11y_estimated_distance_in_5_seconds_in_meters', 'Estimated distance in 5 seconds in meters'),onChange:function(e){saveData('predict5',e.target.value);},className:'w-20 px-2 py-1 border-2 border-emerald-600 rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'}),
                    h('button',{"aria-label":__alloT('stem.calculus.a11y_commit_distance_estimate_and_test_it', 'Commit distance estimate and test it'),type:'button',disabled:!data.predict5,onClick:function(){setLabToolData(function(prev){return Object.assign({},prev,{calculus:Object.assign({},prev.calculus,{xMax:5,tab:'discover',overUnderChecked:false,overUnderGuess:null,overUnderTries:0,predictSubmitted:false})});});nextStep();},className:'transition-colors min-h-[32px] px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-emerald-800'},__alloT('stem.calculus.m4_commit', 'Commit estimate and test') + ' \u2192')
                  )
                ),
                step === 3 && h('div',{style:{animation:'calcFade 0.3s ease'}},
                  h('div',{className:'bg-emerald-50 rounded-xl border border-emerald-200 p-3'},
                    h('p',{className:'text-sm font-bold text-emerald-700 mb-2'},'\uD83C\uDF89 ' + __alloT('stem.calculus.mission_complete', 'Mission Complete!')),
                    h('p',{className:'text-xs text-emerald-800 mb-1',role:'status','aria-live':'polite','data-calculus-distance-estimate-comparison':'descriptive-ungraded'},fillT(__alloT('stem.calculus.m4_result', 'Committed estimate: {p} m. Model result: 25.0 m. Absolute difference: {d} m.'), { p: isFinite(parseFloat(data.predict5))?parseFloat(data.predict5).toFixed(1):__alloT('stem.calculus.not_recorded', 'not recorded'), d: isFinite(parseFloat(data.predict5))?Math.abs(parseFloat(data.predict5)-25).toFixed(1):'n/a' })),
                    h('p',{className:'text-[0.6875rem] text-emerald-800 mb-1'},__alloT('stem.calculus.m4_ungraded', 'This numerical comparison is descriptive and ungraded; completion comes from making and checking the estimate.')),
                    h('p',{className:'text-xs text-emerald-800 mb-2'},__alloT('stem.calculus.m4_ftc', 'The Fundamental Theorem of Calculus says: \u222B\u2080\u1D57 v(t) dt = position at time t \u2212 position at t = 0.')),
                    h('p',{className:'text-xs font-bold text-emerald-900'},__alloT('stem.calculus.m4_apps', 'Real applications: physicists use this to find trajectories, economists to find accumulated profit, biologists to model population growth. The area under ANY rate curve gives the total accumulated quantity.')),
                    awardMissionOnce('m4',20,__alloT('stem.calculus.xp_mission_4', 'Mission 4 complete'))
                  )
                )
              );
            })()

          ), // end discover tab

          // ══════════════════════════════════════════════════════════════
          // TAB: VISUALIZE  (canvas-based pedagogical views)
          // Pedagogy: show intuition BEFORE formulas.
          // ══════════════════════════════════════════════════════════════
          tab === 'visualize' && h('div', { key: 'visualize' },
            (function() {
              var vizView = d.vizView || 'zoom';
              var vizFn   = CALC_FUNCS[d.vizFn] ? d.vizFn : 'quadratic';
              var vizUserInteracted = d.vizUserInteracted || {};
              var clampViz = function(value, min, max, fallback) {
                var numeric = Number.isFinite(value) ? value : fallback;
                return Math.max(min, Math.min(max, numeric));
              };
              var vizZoom = clampViz(d.vizZoom, 1, 100, 1);
              var vizX0 = clampViz(d.vizX0, -3, 3, 0);
              var vizMotionT = clampViz(d.vizMotionT, 0, 6, 0);
              var vizFtcX = clampViz(d.vizFtcX, -2.95, 2.95, -1);
              var vizOptimX = clampViz(d.vizOptimX, 0.05, 5.8, 2.4);
              var vizSlopeX = clampViz(d.vizSlopeX, -3, 3, 0);
              var vizSlopeY = clampViz(d.vizSlopeY, -2.5, 2.5, 0);
              var ls = _vizLiveState.current;
              var reducedNow = false;
              try { reducedNow = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reducedNow = false; }

              function setVizControl(key, value, interactionKey) {
                var patch = {};
                patch[key] = value;
                if (interactionKey) patch.vizUserInteracted = Object.assign({}, vizUserInteracted, { [interactionKey]: true });
                updMany(patch);
              }

              function vizRangeControl(id, label, min, max, step, value, key, interactionKey, valueText) {
                return h('label', { key: id, htmlFor: id, className: 'flex min-w-[180px] flex-1 items-center gap-2 text-[0.6875rem] font-bold text-slate-800' },
                  h('span', { className: 'whitespace-nowrap' }, label),
                  h('input', {
                    id: id, type: 'range', min: min, max: max, step: step, value: value,
                    'aria-label': label,
                    'aria-valuetext': valueText,
                    onChange: function(e) { setVizControl(key, parseFloat(e.target.value), interactionKey); },
                    className: 'min-w-0 flex-1 accent-indigo-600'
                  }),
                  h('span', { className: 'w-14 text-right font-mono text-indigo-800' }, valueText)
                );
              }
              function pickButtons(groupLabel, items, current, onPick) {
                return h('div', { key: groupLabel, role: 'group', 'aria-label': groupLabel, className: 'flex flex-wrap items-center gap-1' },
                  h('span', { className: 'text-[0.6875rem] font-bold text-slate-800 mr-1' }, groupLabel),
                  items.map(function(it) {
                    var on = String(current) === String(it[0]);
                    return h('button', { key: String(it[0]), type: 'button', 'aria-pressed': on, onClick: function() { onPick(it[0]); },
                      className: 'min-h-[28px] px-2 py-1 rounded border text-[0.6875rem] font-bold ' + (on ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-300 text-slate-800 hover:border-indigo-400') }, it[1]);
                  }));
              }

              function addSlopeSeedFromControls() {
                var seeds = (d.vizSlopeSeeds || []).slice(-3);
                seeds.push({ x: vizSlopeX, y: vizSlopeY });
                upd('vizSlopeSeeds', seeds);
                say(fillT(__alloT('stem.calculus.sr_seed', 'Solution curve added at x {x}, y {y}.'), { x: vizSlopeX, y: vizSlopeY }));
              }
              var VIEWS = [
                { id: 'zoom',    icon: '\uD83D\uDD0D', label: __alloT('stem.calculus.view_zoom', 'Zoom'),          desc: __alloT('stem.calculus.view_zoom_d', 'Zoom to linearity: what is a derivative?') },
                { id: 'tangent', icon: '\uD83D\uDCCD', label: __alloT('stem.calculus.view_tangent', 'Tangent'),       desc: __alloT('stem.calculus.view_tangent_d', 'Tangent explorer: the derivative as a function') },
                { id: 'motion',  icon: '\uD83D\uDE97', label: __alloT('stem.calculus.view_motion', 'Motion'),        desc: __alloT('stem.calculus.view_motion_d', 'Position, velocity and acceleration') },
                { id: 'riemann', icon: '\uD83C\uDFAC', label: __alloT('stem.calculus.view_riemann', 'Riemann'),       desc: __alloT('stem.calculus.view_riemann_d', 'Riemann sums converging as n grows') },
                { id: 'ftc',     icon: '\u2B50',       label: __alloT('stem.calculus.view_ftc', 'FTC'),           desc: __alloT('stem.calculus.view_ftc_d', 'The Fundamental Theorem of Calculus') },
                { id: 'slope',   icon: '\uD83C\uDF0A', label: __alloT('stem.calculus.view_slope', 'Slope Fields'),  desc: __alloT('stem.calculus.view_slope_d', 'Differential equations without solving them') },
                { id: 'chain',   icon: '\u2699\uFE0F', label: __alloT('stem.calculus.view_chain', 'Chain Rule'),    desc: __alloT('stem.calculus.view_chain_d', 'Meshed gears: rates multiply') },
                { id: 'taylor',  icon: '\u221E',       label: __alloT('stem.calculus.view_taylor', 'Taylor Series'), desc: __alloT('stem.calculus.view_taylor_d', 'Build a function term by term') },
                { id: 'optim',   icon: '\uD83D\uDCE6', label: __alloT('stem.calculus.view_optim', 'Optimization'),  desc: __alloT('stem.calculus.view_optim_d', 'The cardboard box: maximize volume') },
                { id: 'related', icon: '\uD83D\uDCCF', label: __alloT('stem.calculus.view_related', 'Related Rates'), desc: __alloT('stem.calculus.view_related_d', 'A sliding ladder: two rates linked by geometry') },
                { id: 'vor',     icon: '\uD83C\uDFAA', label: __alloT('stem.calculus.view_vor', 'Vol. of Revolution'), desc: __alloT('stem.calculus.view_vor_d', 'Spin a curve into a solid of stacked disks') },
                { id: 'eps',     icon: '\uD83C\uDFAF', label: __alloT('stem.calculus.view_eps', '\u03B5\u2013\u03B4 Game'), desc: __alloT('stem.calculus.view_eps_d', 'Formal limit: choose the \u03B4 that traps f(x) inside \u03B5') }
              ];
              function calculusVizTabKeyDown(e, index) {
                var nextIndex = -1;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % VIEWS.length;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index - 1 + VIEWS.length) % VIEWS.length;
                else if (e.key === 'Home') nextIndex = 0;
                else if (e.key === 'End') nextIndex = VIEWS.length - 1;
                if (nextIndex < 0) return;
                e.preventDefault();
                var tabs = e.currentTarget.parentNode.querySelectorAll('[role="tab"]');
                var nextTab = tabs[nextIndex];
                if (nextTab) { nextTab.focus(); nextTab.click(); }
              }

              // ── Live text description of the current view, built from the control values ──
              var fnObj = CALC_FUNCS[vizFn];
              var animating = !reducedNow && (function() { var map = { zoom: 'x0', tangent: 'x0', motion: 'motion', riemann: 'riemann', ftc: 'ftc', slope: 'ode', chain: 'chain', taylor: 'taylor', optim: 'optim', related: 'related', vor: 'vor' }; return map[vizView] ? !vizUserInteracted[map[vizView]] : false; })();
              function vizDescription() {
                var n2 = function(v) { return finiteCoord(v) ? (Math.round(v * 100) / 100).toFixed(2) : '?'; };
                if (vizView === 'zoom') return fillT(__alloT('stem.calculus.vd_zoom', 'f(x) = {f}. At x\u2080 = {x}, zoomed {z}\u00D7, the curve looks like a straight line with slope {s}, which is f\u2032(x\u2080).'), { f: fnObj.label, x: n2(vizX0), z: Math.round(vizZoom), s: n2(fnObj.df(vizX0)) });
                if (vizView === 'tangent') return fillT(__alloT('stem.calculus.vd_tangent', 'f(x) = {f}. At x\u2080 = {x}, f(x\u2080) = {y} and the tangent slope f\u2032(x\u2080) = {s}. The right panel graphs f\u2032 and marks this value.'), { f: fnObj.label, x: n2(vizX0), y: n2(fnObj.f(vizX0)), s: n2(fnObj.df(vizX0)) });
                if (vizView === 'motion') {
                  var tt = vizMotionT, p = tt < 2 ? 0.5 * tt * tt : tt < 4 ? 2 + 2 * (tt - 2) : tt < 6 ? 6 + 2 * (tt - 4) - 0.5 * (tt - 4) * (tt - 4) : 8;
                  var v = tt < 2 ? tt : tt < 4 ? 2 : tt < 6 ? 2 - (tt - 4) : 0, a = tt < 2 ? 1 : tt < 4 ? 0 : tt < 6 ? -1 : 0;
                  var phase = tt < 2 ? __alloT('stem.calculus.vd_motion_speeding', 'The car is speeding up.') : tt < 4 ? __alloT('stem.calculus.vd_motion_cruising', 'The car cruises at constant speed.') : tt < 6 ? __alloT('stem.calculus.vd_motion_braking', 'The car is braking.') : __alloT('stem.calculus.vd_motion_stopped', 'The car has stopped.');
                  return fillT(__alloT('stem.calculus.vd_motion', 'At t = {t} s: position {p} m, velocity {v} m/s, acceleration {a} m/s\u00B2. {phase}'), { t: n2(tt), p: n2(p), v: n2(v), a: n2(a), phase: phase });
                }
                if (vizView === 'riemann') {
                  var nR = Math.round(ls.vizN), sums = ['left', 'right', 'midpoint', 'trapezoid'].map(function(m) { return calcRiemann(fnObj.f, -2, 2, nR, m).value; }), ref = calcIntegrate(fnObj.f, -2, 2);
                  return fillT(__alloT('stem.calculus.vd_riemann', 'f(x) = {f} on [\u22122, 2] with n = {n}: left {l}, right {r}, midpoint {m}, trapezoid {t}; the integral is about {ref}.'), { f: fnObj.label, n: nR, l: fix(sums[0], 4), r: fix(sums[1], 4), m: fix(sums[2], 4), t: fix(sums[3], 4), ref: ref.ok ? ref.value.toFixed(4) : '?' });
                }
                if (vizView === 'ftc') { var A = calcIntegrate(fnObj.f, -3, vizFtcX); return fillT(__alloT('stem.calculus.vd_ftc', 'f(x) = {f}. At x = {x}, the signed area from \u22123 is A(x) = {a}, and the slope of A there is {s}, the same as f(x).'), { f: fnObj.label, x: n2(vizFtcX), a: A.ok ? A.value.toFixed(3) : '?', s: n2(fnObj.f(vizFtcX)) }); }
                if (vizView === 'slope') { var ode = VIZ_ODES[Math.round(ls.vizOde)] || VIZ_ODES[0]; return fillT(__alloT('stem.calculus.vd_slope', 'Slope field for {ode}. At the seed point ({x}, {y}) the slope is {s}. {n} added solution curves are drawn, plus five starting curves.'), { ode: ode.name, x: n2(vizSlopeX), y: n2(vizSlopeY), s: n2(ode.df(vizSlopeX, vizSlopeY)), n: (d.vizSlopeSeeds || []).length }) + (ls.vizEuler && ls.vizEuler.on ? ' ' + (function() { var ep = calcEuler(ode.df, ls.vizEuler.x0, ls.vizEuler.y0, ls.vizEuler.h, Math.round(2 / ls.vizEuler.h)), el = ep[ep.length - 1]; return fillT(__alloT('stem.calculus.vd_slope_euler', 'The white dots are Euler\u2019s method with h = {h} from the seed point, reaching y \u2248 {y} at x = {x}.'), { h: ls.vizEuler.h, y: n2(el.y), x: n2(el.x) }) + (ls.vizEuler.truth ? ' ' + __alloT('stem.calculus.vd_slope_truth', 'The dashed orange curve is the true solution through the seed point.') : ''); })() : ''); }
                if (vizView === 'chain') { var k = Math.round(ls.vizChainK), cx = ls.vizChainX, u = k * cx; return fillT(__alloT('stem.calculus.vd_chain', 'x = {x}, u = {k}x = {u}, f = sin(u) = {f}. df/du = cos(u) = {c} and du/dx = {k}, so df/dx = {c} \u00D7 {k} = {d}.'), { x: n2(cx), k: k, u: n2(u), f: n2(Math.sin(u)), c: n2(Math.cos(u)), d: n2(Math.cos(u) * k) }); }
                if (vizView === 'taylor') { var T = VIZ_TAYLOR[ls.vizTaylorFn], dg = Math.round(ls.vizTaylorDeg), xc = isFinite(T.radius) ? 0.5 : 3; return fillT(__alloT('stem.calculus.vd_taylor', 'Degree {n} Taylor polynomial of {f}: {poly}. At x = {x} it differs from {f} by {e}.'), { n: dg, f: T.label, poly: vizTaylorText(ls.vizTaylorFn, dg), x: xc, e: Math.abs(vizTaylorAt(ls.vizTaylorFn, dg, xc) - T.f(xc)).toExponential(2) }) + (isFinite(T.radius) ? ' ' + __alloT('stem.calculus.vd_taylor_radius', 'Outside \u22121 < x < 1 the polynomials pull away from the curve however many terms you add.') : ''); }
                if (vizView === 'optim') { var V = function(x) { return x * (20 - 2 * x) * (12 - 2 * x); }, xc2 = (128 - Math.sqrt(128 * 128 - 4 * 12 * 240)) / 24; return fillT(__alloT('stem.calculus.vd_optim', 'Cut size x = {x} in gives a box {w} by {l} by {x} in, volume {v} in\u00B3.'), { x: n2(vizOptimX), w: n2(20 - 2 * vizOptimX), l: n2(12 - 2 * vizOptimX), v: V(vizOptimX).toFixed(1) }) + (d.vizOptimReveal ? ' ' + fillT(__alloT('stem.calculus.vd_optim_max', 'The maximum volume is {m} in\u00B3 at x \u2248 {c} in, where V\u2032(x) = 0.'), { m: V(xc2).toFixed(1), c: xc2.toFixed(2) }) : ''); }
                if (vizView === 'related') { var lx = Math.min(12.7, ls.vizLadderX), ly = Math.sqrt(169 - lx * lx); return fillT(__alloT('stem.calculus.vd_related', 'The bottom is {x} ft from the wall and the top is {y} ft up. The bottom moves out at 2 ft/s, so the top moves at dy/dt = \u2212(x/y)(2) = {r} ft/s.'), { x: n2(lx), y: n2(ly), r: n2(-(lx / ly) * 2) }); }
                if (vizView === 'vor') { var vf = function(x) { return 0.6 + 0.4 * Math.sin(x * 1.2) + 0.2 * x; }, vr = vf(ls.vizVorX), vol = calcIntegrate(function(x) { return Math.PI * vf(x) * vf(x); }, 0, 4); return fillT(__alloT('stem.calculus.vd_vor', 'The highlighted disk at x = {x} has radius {r} and face area \u03C0r\u00B2 = {a}. Stacking all the disks gives a volume of about {v} cubic units.'), { x: n2(ls.vizVorX), r: n2(vr), a: n2(Math.PI * vr * vr), v: vol.ok ? vol.value.toFixed(3) : '?' }); }
                if (vizView === 'eps') {
                  var G = VIZ_EPS[ls.vizEpsFn], chk = ls.vizEpsChecked, live = chk && chk.fn === ls.vizEpsFn && Math.abs(chk.eps - ls.vizEps) < 1e-9 && Math.abs(chk.delta - ls.vizDelta) < 1e-9;
                  var verdict = !live ? __alloT('stem.calculus.vd_eps_unchecked', 'Not checked yet.') : chk.trapped ? __alloT('stem.calculus.vd_eps_trapped', 'Checked: every x in your \u03B4 window keeps f(x) inside the \u03B5 band.') : fillT(__alloT('stem.calculus.vd_eps_leaks', 'Checked: it leaks out at x = {x}, where f(x) = {y}.'), { x: n2(chk.worstX), y: n2(chk.worstY) });
                  return fillT(__alloT('stem.calculus.vd_eps', 'Claim: as x \u2192 {a}, f(x) = {f} \u2192 {L}. \u03B5 = {e}, your \u03B4 = {dl}. {verdict}'), { a: G.a, f: G.label, L: G.L, e: ls.vizEps, dl: ls.vizDelta.toFixed(3), verdict: verdict });
                }
                return '';
              }

              // ── The epsilon-delta game: check the student's delta ──
              var epsG = VIZ_EPS[ls.vizEpsFn];
              var epsChk = ls.vizEpsChecked;
              var epsLive = epsChk && epsChk.fn === ls.vizEpsFn && Math.abs(epsChk.eps - ls.vizEps) < 1e-9 && Math.abs(epsChk.delta - ls.vizDelta) < 1e-9;
              function checkDelta() {
                var r = calcEpsDeltaCheck(epsG.f, epsG.a, epsG.L, ls.vizEps, ls.vizDelta);
                upd('vizEpsChecked', { fn: ls.vizEpsFn, eps: ls.vizEps, delta: ls.vizDelta, trapped: r.trapped, worstX: r.worst.x, worstY: calcFinite(r.worst.y) ? r.worst.y : null, noDelta: false });
                if (r.trapped) { awardOnce('eps:' + ls.vizEpsFn + ':' + ls.vizEps, 3, __alloT('stem.calculus.xp_eps', 'Won an epsilon-delta round')); say(__alloT('stem.calculus.sr_eps_trapped', 'Trapped. Your delta works for this epsilon.')); }
                else say(fillT(__alloT('stem.calculus.sr_eps_leaks', 'Leaks out at x = {x}. Shrink delta.'), { x: r.worst.x.toFixed(3) }));
              }
              function claimNoDelta() {
                var maxD = calcMaxDelta(epsG.f, epsG.a, epsG.L, ls.vizEps, 2);
                var right = maxD === 0;
                upd('vizEpsChecked', { fn: ls.vizEpsFn, eps: ls.vizEps, delta: ls.vizDelta, trapped: false, worstX: null, worstY: null, noDelta: true, noDeltaRight: right });
                if (right) { awardOnce('eps:' + ls.vizEpsFn + ':none', 3, __alloT('stem.calculus.xp_eps_none', 'Showed a claimed limit is false')); say(__alloT('stem.calculus.sr_eps_none_ok', 'Right: no delta works, so the claimed limit is false.')); }
                else say(__alloT('stem.calculus.sr_eps_none_no', 'A delta does exist here. Try a smaller one.'));
              }

              return h(React.Fragment, null,
                // Header strip
                h('div', { className: 'flex items-center gap-2 mb-2 text-xs text-slate-700 flex-wrap' + onHostInk },
                  h('span', { className: 'font-bold' }, __alloT('stem.calculus.tab_visualize', 'Visualize')),
                  h('span', {}, __alloT('stem.calculus.viz_tagline', 'See the ideas before you see the formulas')),
                  h('span', { className: 'ml-auto px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[0.625rem] font-bold rounded-full' }, reducedNow ? __alloT('stem.calculus.viz_still', 'STILL (reduced motion)') : animating ? __alloT('stem.calculus.viz_animating', 'ANIMATING') : __alloT('stem.calculus.viz_controls', 'YOUR VALUES'))
                ),
                // Sub-view selector
                h('div', { className: 'flex gap-1.5 flex-wrap text-xs font-bold mb-2', role: 'tablist', 'aria-label': __alloT('stem.calculus.a11y_calculus_visualization_view', 'Calculus visualization view') },
                  VIEWS.map(function(v, vi) {
                    var active = vizView === v.id;
                    var btnAttrs = {
                      key: v.id, id: 'calculus-viz-tab-' + v.id, role: 'tab',
                      'aria-controls': 'calculus-viz-panel-' + v.id,
                      'aria-selected': active ? 'true' : 'false', tabIndex: active ? 0 : -1,
                      onKeyDown: function(e) { calculusVizTabKeyDown(e, vi); },
                      onClick: function() { upd('vizView', v.id); },
                      title: v.desc,
                      className: 'min-h-[32px] px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ' + (active
                        ? 'bg-red-600 border-red-700 text-white shadow-md'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-red-400')
                    };
                    // Only the first 10 views (zoom..related) have keyboard shortcuts wired:
                    //   indices 0-8 -> Shift+1..9, index 9 -> Shift+0. vor + eps have no shortcut.
                    if (vi < 9) btnAttrs['aria-keyshortcuts'] = 'Shift+' + (vi + 1);
                    else if (vi === 9) btnAttrs['aria-keyshortcuts'] = 'Shift+0';
                    return h('button', btnAttrs, v.icon + ' ' + v.label);
                  })
                ),
                h('div', { role: 'tabpanel', id: 'calculus-viz-panel-' + vizView, 'aria-labelledby': 'calculus-viz-tab-' + vizView, tabIndex: 0 },
                // Function picker (shown only for views that use it)
                (vizView === 'zoom' || vizView === 'tangent' || vizView === 'ftc' || vizView === 'riemann') &&
                h('div', { className: 'flex gap-1 flex-wrap text-[0.6875rem] mb-2', role: 'group', 'aria-label': __alloT('stem.calculus.viz_fn_group', 'Function to explore') },
                  h('span', { className: 'text-slate-700 font-semibold self-center mr-1' + onHostInk }, 'f(x) ='),
                  Object.keys(CALC_FUNCS).map(function(fid) {
                    var active = vizFn === fid;
                    return h('button', {
                      key: fid, type: 'button', 'aria-pressed': active,
                      onClick: function() { upd('vizFn', fid); },
                      className: 'min-h-[28px] px-2 py-1 rounded border font-mono font-bold transition-all ' + (active
                        ? 'bg-indigo-600 border-indigo-700 text-white'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400')
                    }, CALC_FUNCS[fid].label);
                  })
                ),
                h('div', { role: 'group', 'aria-label': __alloT('stem.calculus.a11y_visualization_controls', 'Visualization controls'), className: 'mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3' },
                  vizView === 'zoom' && vizRangeControl('calc-viz-x0', __alloT('stem.calculus.vc_point', 'Point x\u2080'), -3, 3, 0.05, vizX0, 'vizX0', 'x0', vizX0.toFixed(2)),
                  vizView === 'zoom' && vizRangeControl('calc-viz-zoom', __alloT('stem.calculus.vc_zoom', 'Zoom'), 1, 100, 1, vizZoom, 'vizZoom', 'zoom', vizZoom.toFixed(0) + '\u00D7'),
                  vizView === 'tangent' && vizRangeControl('calc-viz-tangent-x', __alloT('stem.calculus.vc_tangent_x', 'Tangent x\u2080'), -3, 3, 0.05, vizX0, 'vizX0', 'x0', vizX0.toFixed(2)),
                  vizView === 'motion' && vizRangeControl('calc-viz-motion-time', __alloT('stem.calculus.vc_time', 'Time t'), 0, 6, 0.05, vizMotionT, 'vizMotionT', 'motion', vizMotionT.toFixed(2) + ' s'),
                  vizView === 'riemann' && vizRangeControl('calc-viz-riemann-n', __alloT('stem.calculus.vc_n', 'Subdivisions n'), 1, 256, 1, Math.round(ls.vizN), 'vizN', 'riemann', String(Math.round(ls.vizN))),
                  vizView === 'ftc' && vizRangeControl('calc-viz-ftc-x', __alloT('stem.calculus.vc_ftc_x', 'Accumulated-area x'), -2.95, 2.95, 0.05, vizFtcX, 'vizFtcX', 'ftc', vizFtcX.toFixed(2)),
                  vizView === 'optim' && vizRangeControl('calc-viz-optim-x', __alloT('stem.calculus.vc_cut', 'Cut size x'), 0.05, 5.8, 0.05, vizOptimX, 'vizOptimX', 'optim', vizOptimX.toFixed(2) + ' in'),
                  vizView === 'slope' && pickButtons(__alloT('stem.calculus.vc_ode', 'Equation'), VIZ_ODES.map(function(o, i) { return [i, o.name]; }), Math.round(ls.vizOde), function(i) { setVizControl('vizOde', i, 'ode'); }),
                  vizView === 'slope' && vizRangeControl('calc-viz-slope-x', __alloT('stem.calculus.vc_seed_x', 'Seed x'), -3, 3, 0.1, vizSlopeX, 'vizSlopeX', null, vizSlopeX.toFixed(1)),
                  vizView === 'slope' && vizRangeControl('calc-viz-slope-y', __alloT('stem.calculus.vc_seed_y', 'Seed y'), -2.5, 2.5, 0.1, vizSlopeY, 'vizSlopeY', null, vizSlopeY.toFixed(1)),
                  vizView === 'slope' && h('button', { key: 'seed', type: 'button',
                    onClick: addSlopeSeedFromControls,
                    className: 'min-h-[32px] rounded-lg bg-indigo-700 px-3 py-2 text-[0.6875rem] font-bold text-white hover:bg-indigo-800'
                  }, __alloT('stem.calculus.vc_add_curve', 'Add solution curve')),
                  vizView === 'chain' && vizRangeControl('calc-viz-chain-x', __alloT('stem.calculus.vc_chain_x', 'Input x'), -3, 3, 0.05, ls.vizChainX, 'vizChainX', 'chain', ls.vizChainX.toFixed(2)),
                  vizView === 'chain' && vizRangeControl('calc-viz-chain-k', __alloT('stem.calculus.vc_chain_k', 'Inner rate k (u = kx)'), 1, 4, 1, Math.round(ls.vizChainK), 'vizChainK', 'chain', String(Math.round(ls.vizChainK))),
                  vizView === 'taylor' && pickButtons(__alloT('stem.calculus.vc_target', 'Target'), Object.keys(VIZ_TAYLOR).map(function(k) { return [k, VIZ_TAYLOR[k].label]; }), ls.vizTaylorFn, function(k) { setVizControl('vizTaylorFn', k, 'taylor'); }),
                  vizView === 'taylor' && vizRangeControl('calc-viz-taylor-deg', __alloT('stem.calculus.vc_degree', 'Degree'), 0, 15, 1, Math.round(ls.vizTaylorDeg), 'vizTaylorDeg', 'taylor', String(Math.round(ls.vizTaylorDeg))),
                  vizView === 'related' && vizRangeControl('calc-viz-ladder-x', __alloT('stem.calculus.vc_ladder', 'Bottom distance x'), 0.5, 12.7, 0.1, ls.vizLadderX, 'vizLadderX', 'related', ls.vizLadderX.toFixed(1) + ' ft'),
                  vizView === 'vor' && vizRangeControl('calc-viz-vor-x', __alloT('stem.calculus.vc_disk', 'Disk position x'), 0, 4, 0.05, ls.vizVorX, 'vizVorX', 'vor', ls.vizVorX.toFixed(2)),
                  vizView === 'eps' && pickButtons(__alloT('stem.calculus.vc_claim', 'Claim'), Object.keys(VIZ_EPS).map(function(k) { var G = VIZ_EPS[k]; return [k, 'lim x\u2192' + G.a + ' ' + G.label + ' = ' + G.L]; }), ls.vizEpsFn, function(k) { updMany({ vizEpsFn: k, vizEpsChecked: null }); }),
                  vizView === 'eps' && pickButtons(__alloT('stem.calculus.vc_eps', 'Challenger\u2019s \u03B5'), [[1, '1'], [0.5, '0.5'], [0.25, '0.25'], [0.1, '0.1'], [0.05, '0.05']], ls.vizEps, function(e) { upd('vizEps', e); }),
                  vizView === 'eps' && vizRangeControl('calc-viz-delta', __alloT('stem.calculus.vc_delta', 'Your \u03B4'), 0.001, 2, 0.001, ls.vizDelta, 'vizDelta', null, ls.vizDelta.toFixed(3)),
                  vizView === 'eps' && h('label', { key: 'dnum', className: 'flex items-center gap-1 text-[0.6875rem] font-bold text-slate-800' }, __alloT('stem.calculus.vc_delta_exact', 'Exact \u03B4'),
                    h('input', { type: 'number', step: 'any', min: 0.001, max: 2, value: ls.vizDelta, onChange: function(e) { var v = parseFloat(e.target.value); if (isFinite(v)) upd('vizDelta', Math.max(0.001, Math.min(2, v))); }, className: 'w-24 px-2 py-1 border border-slate-400 rounded font-mono', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } })),
                  vizView === 'eps' && h('button', { key: 'chk', type: 'button', onClick: checkDelta, className: 'min-h-[36px] rounded-lg bg-emerald-700 px-3 py-2 text-[0.6875rem] font-bold text-white hover:bg-emerald-800' }, __alloT('stem.calculus.vc_check_delta', 'Check my \u03B4')),
                  vizView === 'eps' && h('button', { key: 'none', type: 'button', onClick: claimNoDelta, className: 'min-h-[36px] rounded-lg bg-white px-3 py-2 text-[0.6875rem] font-bold text-slate-900 border-2 border-slate-600 hover:bg-slate-100' }, __alloT('stem.calculus.vc_no_delta', 'No \u03B4 can work'))
                ),
                // Euler's method on the slope field (step size, step table, predict how the error shrinks)
                vizView === 'slope' && eulerPanel(),
                // Epsilon-delta verdict and teaching feedback
                vizView === 'eps' && epsLive && h('div', { role: 'status', 'aria-live': 'polite', className: 'mb-2 rounded-xl border-2 p-3 text-xs ' + ((epsChk.trapped || epsChk.noDeltaRight) ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : 'border-red-600 bg-red-50 text-red-950') },
                  epsChk.noDelta
                    ? (epsChk.noDeltaRight ? __alloT('stem.calculus.eps_none_ok', 'Right: no \u03B4 works. Points just left of 0 have sign(x) = \u22121, a distance of 2 from the claimed limit 1, however small \u03B4 is. The claimed limit is false: sign(x) has a jump at 0.')
                      : fillT(__alloT('stem.calculus.eps_none_wrong', 'A \u03B4 does exist here: for example \u03B4 = {m} works. Shrinking \u03B5 forces a smaller \u03B4, but for this function some \u03B4 always works.'), { m: calcMaxDelta(epsG.f, epsG.a, epsG.L, ls.vizEps, 2).toPrecision(3) }))
                    : epsChk.trapped
                      ? fillT(__alloT('stem.calculus.eps_trapped', 'Trapped! Every x with 0 < |x \u2212 {a}| < {dl} keeps f(x) within {e} of {L}. Any smaller \u03B4 works too; the largest that works is about {m}.'), { a: epsG.a, dl: ls.vizDelta.toFixed(3), e: ls.vizEps, L: epsG.L, m: calcMaxDelta(epsG.f, epsG.a, epsG.L, ls.vizEps, 2).toPrecision(3) }) + (epsG.hole ? ' ' + __alloT('stem.calculus.eps_hole_note', 'Notice f(2) is undefined: the definition never looks at x = a itself.') : '')
                      : fillT(__alloT('stem.calculus.eps_leaks', 'Leaks out: at x = {x}, inside your \u03B4 window, f(x) = {y}, which is outside the band {lo} to {hi}. Shrink \u03B4 and check again.'), { x: calcFinite(epsChk.worstX) ? epsChk.worstX.toFixed(3) : '?', y: calcFinite(epsChk.worstY) ? epsChk.worstY.toFixed(3) : '?', lo: (epsG.L - ls.vizEps).toFixed(2), hi: (epsG.L + ls.vizEps).toFixed(2) })
                ),
                // Optimization: commit a guess before the maximum is shown
                vizView === 'optim' && h('div', { className: 'mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950' },
                  h('label', { htmlFor: 'calc-optim-guess', className: 'font-bold' }, __alloT('stem.calculus.optim_guess', 'Your prediction for the best cut size x (in):')),
                  h('input', { id: 'calc-optim-guess', type: 'number', step: 'any', value: d.vizOptimGuess || '', disabled: !!d.vizOptimReveal, onChange: function(e) { upd('vizOptimGuess', e.target.value); }, className: 'w-20 px-2 py-1 border border-amber-600 rounded font-mono', style: { background: 'var(--allo-stem-panel,#fff)', color: 'var(--allo-stem-text,#0f172a)' } }),
                  !d.vizOptimReveal && h('button', { type: 'button', disabled: !isFinite(parseFloat(d.vizOptimGuess)), onClick: function() { upd('vizOptimReveal', true); var xc3 = (128 - Math.sqrt(128 * 128 - 4 * 12 * 240)) / 24; if (Math.abs(parseFloat(d.vizOptimGuess) - xc3) <= 0.25) awardOnce('optim', 3, __alloT('stem.calculus.xp_optim', 'Predicted the optimal box')); say(fillT(__alloT('stem.calculus.sr_optim', 'The maximum is at x about {c}. Your prediction was {g}.'), { c: xc3.toFixed(2), g: d.vizOptimGuess })); }, className: 'min-h-[32px] px-3 py-1 rounded-lg bg-amber-700 text-white font-bold disabled:opacity-50' }, __alloT('stem.calculus.optim_reveal', 'Commit and show the maximum')),
                  d.vizOptimReveal && h('span', { role: 'status' }, fillT(__alloT('stem.calculus.optim_result', 'The maximum is at x \u2248 2.43 in, where V\u2032(x) = 12x\u00B2 \u2212 128x + 240 = 0. Your prediction: {g}.'), { g: d.vizOptimGuess })),
                  d.vizOptimReveal && h('button', { type: 'button', onClick: function() { updMany({ vizOptimReveal: false, vizOptimGuess: '' }); }, className: 'min-h-[28px] px-2 py-1 rounded border border-amber-700 font-bold' }, __alloT('stem.calculus.optim_hide', 'Hide it and predict again'))
                ),
                // Canvas wrapper (fullscreen target)
                h('div', {
                  id: 'calc-viz-wrap',
                  className: 'relative rounded-xl overflow-hidden border-2 border-indigo-300',
                  style: { height: '380px', width: '100%', background: 'var(--allo-stem-canvas, #0f172a)' }
                },
                  h('canvas', {
                    ref: _vizCvRef,
                    role: 'img',
                    'aria-label': fillT(__alloT('stem.calculus.canvas_label', 'Calculus visualization: {view}'), { view: (VIEWS.find(function(v){return v.id===vizView;}) || VIEWS[0]).desc }),
                    'aria-describedby': 'calc-viz-desc',
                    style: {
                      width: '100%', height: '100%', display: 'block',
                      cursor: (vizView === 'zoom' || vizView === 'tangent' || vizView === 'motion' || vizView === 'ftc' || vizView === 'optim' || vizView === 'slope') ? 'pointer' : 'default',
                      touchAction: (vizView === 'zoom' || vizView === 'tangent' || vizView === 'motion' || vizView === 'ftc' || vizView === 'optim' || vizView === 'slope') ? 'none' : 'auto'
                    }
                  }),
                  // Replay button: hands the view back to its animation (never offered under reduced motion)
                  !reducedNow && vizView !== 'eps' &&
                  h('button', {
                    type: 'button',
                    onClick: function() {
                      updMany({ vizUserInteracted: {}, vizSlopeSeeds: [] });
                    },
                    title: __alloT('stem.calculus.return_to_auto_animation','Return to auto-animation'),
                    'aria-label': __alloT('stem.calculus.a11y_reset_interaction_resume_auto_animation', 'Reset interaction; resume auto-animation'),
                    className: 'transition-colors absolute top-2 right-12 px-2 h-8 rounded-lg bg-slate-900/80 text-indigo-100 hover:bg-slate-900 text-xs font-bold'
                  }, '\u21BA ' + __alloT('stem.calculus.auto', 'auto')),
                  h('button', {
                    type: 'button',
                    onClick: function() {
                      var el = document.getElementById('calc-viz-wrap');
                      if (!el) return;
                      if (document.fullscreenElement) { document.exitFullscreen(); }
                      else { if (window.__alloStemFS) window.__alloStemFS(el); }
                    },
                    title: __alloT('stem.calculus.toggle_fullscreen','Toggle fullscreen'),
                    'aria-label': __alloT('stem.calculus.a11y_toggle_fullscreen', 'Toggle fullscreen'),
                    className: 'transition-colors absolute top-2 right-2 w-8 h-8 rounded-lg bg-slate-900/80 text-indigo-100 hover:bg-slate-900 text-sm font-bold'
                  }, '\u26F6')
                ),
                // Live text equivalent of the canvas
                h('p', { id: 'calc-viz-desc', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-calc-viz-description': vizView, className: 'mt-2 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900' },
                  (animating ? __alloT('stem.calculus.vd_animating', 'The animation is playing; move a control to stop it at your value. With your current values:') + ' ' : '') + vizDescription()),
                // Per-view explainer strip
                h('div', { className: 'mt-2 text-[0.6875rem] text-slate-700 leading-relaxed' + onHostInk },
                  vizView === 'zoom'    && __alloT('stem.calculus.vx_zoom', 'Use the point and zoom sliders, or drag across the canvas. Any smooth curve becomes a straight line up close; that local slope IS the derivative.'),
                  vizView === 'tangent' && __alloT('stem.calculus.vx_tangent', 'Use the tangent x\u2080 slider, or drag across the canvas. The tangent line swings while f\u2032(x) is traced on the right panel.'),
                  vizView === 'motion'  && __alloT('stem.calculus.vx_motion', 'Use the time slider, or drag across the canvas. Velocity is the slope of position; acceleration is the slope of velocity.'),
                  vizView === 'riemann' && __alloT('stem.calculus.vx_riemann', 'Set n from 1 to 256. All four methods converge to the true area, but at different speeds.'),
                  vizView === 'ftc'     && __alloT('stem.calculus.vx_ftc', 'The payoff: use the accumulated-area slider or drag across the canvas. A(x) is plotted on the right, and its slope at every x is exactly f(x).'),
                  vizView === 'slope'   && __alloT('stem.calculus.vx_slope', 'Each segment is dy/dx at that point. Pick an equation, choose seed coordinates and add a solution curve, or tap the canvas.'),
                  vizView === 'chain'   && __alloT('stem.calculus.vx_chain', 'The inner gear turns at du/dx = k; the outer at df/du = cos(u). The composed rate is the product: df/dx = df/du \u00D7 du/dx.'),
                  vizView === 'taylor'  && __alloT('stem.calculus.vx_taylor', 'A Taylor polynomial adds powers of x one at a time to rebuild a function. Raise the degree and watch the match spread outward.'),
                  vizView === 'optim'   && __alloT('stem.calculus.vx_optim', 'Predict the best cut first, then use the slider. Volume V(x) peaks where V\u2032(x) = 0.'),
                  vizView === 'related' && __alloT('stem.calculus.vx_related', 'The bottom always moves at 2 ft/s, but the top\u2019s speed depends on where the ladder is. Geometry links the two rates.'),
                  vizView === 'vor'     && __alloT('stem.calculus.vx_vor', 'Spin f(x) around the x-axis. The disks stack into a solid. V = \u03C0 \u222B f(x)\u00B2 dx.'),
                  vizView === 'eps'     && __alloT('stem.calculus.vx_eps', 'The challenger picks \u03B5. You choose \u03B4 and check it: every x within \u03B4 of x\u2080 (except x\u2080 itself) must give f(x) within \u03B5 of L. If no \u03B4 can ever work, say so.')
                )
                )
              );
            })()
          ),

          // === Live derivative evidence inquiry ===
          tab === 'derivHunt' && (function() {
            // A partial or hostile saved bucket ({ log } only, a string) gets defaults, not "undefinedx²".
            var iqRaw = d.derivHunt && typeof d.derivHunt === 'object' && !Array.isArray(d.derivHunt) ? d.derivHunt : {};
            var iq = Object.assign({ hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }, iqRaw, { a: finiteNum(iqRaw.a, 1), b: finiteNum(iqRaw.b, 0), c: finiteNum(iqRaw.c, 0), xPoint: finiteNum(iqRaw.xPoint, 1) });
            function setIQ(patch) { upd('derivHunt', Object.assign({}, iq, patch)); }
            function derivativeLogKey(entry) { return [entry.a, entry.b, entry.c, entry.x].join('|'); }
            var inquiryLog = Array.isArray(iq.log) ? iq.log : [];
            var derivAtX = 2 * iq.a * iq.xPoint + iq.b;
            var state;
            if (Math.abs(iq.a) < 1e-9) state = Math.abs(derivAtX) < 0.1 ? 'constant' : (derivAtX > 0 ? 'linearIncreasing' : 'linearDecreasing');
            else if (Math.abs(derivAtX) < 0.1) state = 'turning';
            else if (derivAtX > 0 && iq.a > 0) state = 'increasingUp';
            else if (derivAtX < 0 && iq.a > 0) state = 'decreasingUp';
            else if (derivAtX > 0) state = 'increasingDown';
            else state = 'decreasingDown';
            var stateMeta = {
              constant: { label: __alloT('stem.calculus.dh_constant', 'Constant function; slope about 0'), color: '#475569', bg: '#f8fafc', border: '#94a3b8' },
              linearIncreasing: { label: __alloT('stem.calculus.dh_lin_inc', 'Increasing line; constant positive slope'), color: '#065f46', bg: '#ecfdf5', border: '#86efac' },
              linearDecreasing: { label: __alloT('stem.calculus.dh_lin_dec', 'Decreasing line; constant negative slope'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
              turning: { label: __alloT('stem.calculus.dh_turning', 'Quadratic turning point; slope about 0'), color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' },
              extremum: { label: __alloT('stem.calculus.dh_turning', 'Quadratic turning point; slope about 0'), color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd' }, // Saved-log compatibility.
              increasingUp: { label: __alloT('stem.calculus.dh_inc_up', 'Increasing; parabola opens up'), color: '#065f46', bg: '#ecfdf5', border: '#86efac' },
              decreasingUp: { label: __alloT('stem.calculus.dh_dec_up', 'Decreasing; parabola opens up'), color: '#155e75', bg: '#ecfeff', border: '#67e8f9' },
              increasingDown: { label: __alloT('stem.calculus.dh_inc_down', 'Increasing; parabola opens down'), color: '#92400e', bg: '#fffbeb', border: '#fcd34d' },
              decreasingDown: { label: __alloT('stem.calculus.dh_dec_down', 'Decreasing; parabola opens down'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' }
            };
            var sm = Object.assign({}, stateMeta[state]);
            if(ctx.isContrast){sm.bg='var(--allo-stem-panel,#000)';sm.color='var(--allo-stem-text,#ffff00)';sm.border='currentColor';}
            var currentLogKey = [iq.a, iq.b, iq.c, iq.xPoint].join('|');
            var currentAlreadyLogged = inquiryLog.some(function(entry) { return derivativeLogKey(entry) === currentLogKey; });
            var evidenceReady = inquiryLog.length >= 2;
            return h('div', { key: 'derivHunt', 'data-calculus-live-inquiry': 'observe-log-explain' },
              h('div', { className: 'p-4 rounded-xl bg-white border border-violet-300 space-y-3' },
                h('h3', { className: 'text-sm font-black text-violet-700' }, '\uD83D\uDCC8 ' + __alloT('stem.calculus.dh_title', 'Derivative behaviour exploration')),
                h('p', { className: 'text-[0.75rem] text-slate-700' }, __alloT('stem.calculus.dh_intro', 'The derivative value and behaviour update live as you move the sliders. Treat them as visible model evidence: log distinct settings, compare them, then explain the pattern you observe. This activity is ungraded.')),
                h('div', { className: 'p-3 rounded-lg text-center', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', 'data-calculus-live-derivative-state': state, style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-[0.625rem] text-slate-700 mt-1 font-mono' }, 'f(x)=' + iq.a + 'x\u00B2 + ' + iq.b + 'x + ' + iq.c + ',  f\u2032(' + iq.xPoint + ')=' + derivAtX.toFixed(2))
                ),
                h('div', { className: 'grid grid-cols-2 gap-3 sm:grid-cols-4' },
                  [{ k: 'a', l: 'a', mn: -3, mx: 3 }, { k: 'b', l: 'b', mn: -10, mx: 10 }, { k: 'c', l: 'c', mn: -10, mx: 10 }, { k: 'xPoint', l: 'x', mn: -10, mx: 10 }].map(function(control) {
                    return h('div', { key: control.k },
                      h('label', { htmlFor: 'dh-' + control.k, className: 'block text-[0.6875rem] font-bold text-slate-700' }, control.l + ': ', h('span', { className: 'font-mono text-violet-700' }, iq[control.k])),
                      h('input', { id: 'dh-' + control.k, type: 'range', min: control.mn, max: control.mx, step: 1, value: iq[control.k],
                        onChange: function(e) { var patch = {}; patch[control.k] = parseInt(e.target.value, 10); setIQ(patch); },
                        className: 'w-full', 'aria-label': control.k === 'xPoint' ? __alloT('stem.calculus.dh_x_label', 'x where the slope is measured') : fillT(__alloT('stem.calculus.dh_coef_label', 'Coefficient {c}'), { c: control.l }) }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { type: 'button', disabled: currentAlreadyLogged, 'aria-disabled': currentAlreadyLogged ? 'true' : 'false', onClick: function() { if (currentAlreadyLogged) return; setIQ({ log: inquiryLog.concat([{ key: currentLogKey, a: iq.a, b: iq.b, c: iq.c, x: iq.xPoint, d: derivAtX.toFixed(2), st: state }]).slice(-8) }); say(__alloT('stem.calculus.sr_logged', 'Setting logged.')); }, className: 'min-h-[32px] px-2 py-1 rounded bg-slate-100 text-[0.6875rem] font-bold text-slate-700 border border-slate-300 disabled:opacity-50' }, currentAlreadyLogged ? __alloT('stem.calculus.dh_logged', 'Current setting logged') : '\uD83D\uDCCB ' + __alloT('stem.calculus.dh_log', 'Log current evidence')),
                  h('button', { type: 'button', onClick: function() { setIQ({ a: 1, b: 0, c: 0, xPoint: 1, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'min-h-[32px] px-2 py-1 rounded bg-white text-[0.6875rem] font-semibold text-slate-700 border border-slate-300' }, '\u21BA ' + __alloT('stem.calculus.reset', 'Reset')),
                  h('span', { className: 'text-[0.625rem] text-slate-700', role: 'status', 'aria-live': 'polite' }, fillT(__alloT('stem.calculus.dh_count', '{n}/2 evidence settings logged'), { n: inquiryLog.length }))
                ),
                inquiryLog.length > 0 && h('div', { role: 'region', 'aria-label': __alloT('stem.calculus.a11y_logged_derivative_evidence', 'Logged derivative evidence'), className: 'rounded-lg border border-slate-200 bg-slate-50 p-2' },
                  h('p', { className: 'text-[0.625rem] font-black uppercase tracking-wide text-slate-700 mb-1' }, __alloT('stem.calculus.dh_evidence_log', 'Evidence log')),
                  h('ol', { className: 'space-y-1 text-[0.6875rem] text-slate-800' }, inquiryLog.map(function(entry, index) {
                    var loggedMeta = stateMeta[entry.st];
                    return h('li', { key: derivativeLogKey(entry) + '-' + index, className: 'font-mono' }, (index + 1) + '. a=' + entry.a + ', b=' + entry.b + ', c=' + entry.c + ', x=' + entry.x + ' \u2192 f\u2032(x)=' + entry.d + '; ' + (loggedMeta ? loggedMeta.label : entry.st));
                  }))
                ),
                h('textarea', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},  'aria-label': __alloT('stem.calculus.a11y_working_explanation_from_live_derivative_eviden', 'Working explanation from live derivative evidence'), 'data-calculus-post-observation-explanation': 'working', value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.calculus.working_explanation_after_observing_what_rel','Working explanation after observing: what relationships do you notice among a, b, x, the sign of f\'(x), and the graph behavior? Cite logged settings.'),
                  className: 'w-full text-[0.75rem] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                !iq.stuckRevealed && h('button', { type: 'button', onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'min-h-[32px] px-2 py-1 rounded bg-amber-50 text-[0.6875rem] font-bold text-amber-800 border border-amber-300' }, '\uD83E\uDD14 ' + __alloT('stem.calculus.dh_stuck', 'Stuck? Show comparison prompts')),
                iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-slate-800' },
                  h('ul', { className: 'list-disc pl-5 space-y-1' },
                    h('li', null, __alloT('stem.calculus.dh_prompt_1', 'Hold a, b, and c steady. Move x through a point where the derivative is near zero. How does the derivative sign change?')),
                    h('li', null, __alloT('stem.calculus.dh_prompt_2', 'Keep b fixed and compare a positive a with a negative a. What changes about increasing and decreasing behaviour?')),
                    h('li', null, __alloT('stem.calculus.dh_prompt_3', 'When a is nonzero, compare the x-value where the derivative is near zero with \u2212b/(2a).'))),
                  h('p', { className: 'mt-2 text-[0.625rem] text-amber-900' }, __alloT('stem.calculus.dh_scaffold_note', 'These are comparison scaffolds, not a hidden result; the live values remain visible.'))
                ),
                h('p', { id: 'calc-deriv-evidence-ready', className: 'text-[0.625rem] text-slate-700' }, evidenceReady ? __alloT('stem.calculus.dh_ready', 'Evidence ready: explain the pattern, including one logged comparison.') : __alloT('stem.calculus.dh_not_ready', 'Log at least two distinct settings before the final explanation.')),
                h('div', { className: 'flex items-center gap-2' },
                  h('input', { type: 'checkbox', id: 'calc-deriv-understood', checked: evidenceReady && !!iq.understood, disabled: !evidenceReady, 'aria-disabled': evidenceReady ? 'false' : 'true', 'aria-describedby': 'calc-deriv-evidence-ready', onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-5 h-5' }),
                  h('label', { htmlFor: 'calc-deriv-understood', className: 'text-[0.75rem] font-bold text-emerald-800 cursor-pointer' }, __alloT('stem.calculus.dh_can_explain', 'I can explain the pattern I observed'))
                ),
                evidenceReady && iq.understood && h('textarea', {style:{background:'var(--allo-stem-panel,#fff)',color:'var(--allo-stem-text,#0f172a)'},  'aria-label': __alloT('stem.calculus.a11y_evidence_based_derivative_behavior_explanation', 'Evidence-based derivative behavior explanation'), 'data-calculus-post-observation-explanation': 'final', value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.calculus.use_at_least_one_logged_comparison_as_eviden','Use at least one logged comparison as evidence. Explain what f\'(x) says about increasing, decreasing, constant, and turning behavior.'),
                  className: 'w-full text-[0.75rem] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
                h('div', { className: 'text-[0.625rem] text-slate-700' }, __alloT('stem.calculus.dh_model_note', 'Model note: the live marker and numerical derivative are visible, descriptive evidence. They are not a hidden prediction result or a score.'))
              )
            );
          })()

          ), // end tabpanel

          // ── AI Calculus Tutor (reading-level aware) ──
          // Only through the host helper, and only when the teacher has AI hints on.
          typeof callGemini === 'function' && ctx.aiHintsEnabled !== false && (function () {
            var aiLevel = d.aiLevel || (band === 'pre' ? 'plain' : 'hs');
            var aiText = typeof d.aiExplain === 'string' ? d.aiExplain : '';
            var aiLoading = !!d.aiLoading;
            var aiError = typeof d.aiError === 'string' ? d.aiError : '';
            var LEVELS = [
              { id: 'plain', label: __alloT('stem.calculus.ai_plain', 'Plain'), hint: 'using simple everyday words and short sentences, no jargon' },
              { id: 'grade5', label: __alloT('stem.calculus.ai_grade5', 'Grade 5'), hint: 'for a 5th grade student, with a concrete everyday example' },
              { id: 'hs', label: __alloT('stem.calculus.ai_ap', 'AP Calc'), hint: 'for an AP Calculus student, using proper calculus terminology' }
            ];
            function save(k, v) {
              setLabToolData(function (prev) { return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, (function(){var o={};o[k]=v;return o;})()) }); });
            }
            function explain() {
              save('aiLoading', true); save('aiError', ''); save('aiExplain', '');
              var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
              var fnStr = fa + 'x\u00B2 + ' + fb + 'x + ' + fc;
              if (useTyped) fnStr = typedFn.label;
              var tabLabel = tab === 'integral' ? 'Integral (Riemann sums)' : tab === 'derivative' ? 'Derivative (slope)' : tab === 'limits' ? 'Limits' : tab === 'visualize' ? 'Visualization' : tab === 'challenge' ? 'Challenge' : tab === 'derivHunt' ? 'Derivative inquiry' : 'Discover';
              var context = tab === 'visualize'
                ? 'The student is looking at the "' + (d.vizView || 'zoom') + '" visualization (for example a zoom-to-linearity view, Riemann sums, Taylor series or an epsilon-delta game). '
                : tab === 'challenge'
                  ? 'The student is practising ' + cMode + ' problems; do not solve any problem or give a numerical answer. '
                  : tab === 'limits'
                    ? 'The student is exploring limits of f(x) = ' + fnStr + ' near x = ' + (d.limitA != null ? d.limitA : 1) + '; do not state the limit value. '
                    : 'Function: f(x) = ' + fnStr + ' on [' + xMin + ', ' + xMax2 + '] with n=' + nRects + ' ' + mode + ' rectangles. ';
              var prompt = 'Explain what this calculus tool is showing ' + lv.hint + '. '
                + 'Current tab: ' + tabLabel + '. ' + context
                + 'In 3 short sentences: (1) What the student is exploring. (2) Why the idea works (intuition first). (3) One real-world place this shows up. '
                + 'No markdown, no bullets, no headings. Plain prose.';
              callGemini(prompt, false, false, 0.5).then(function (resp) {
                save('aiExplain', String(resp || '').trim()); save('aiLoading', false);
                say(__alloT('stem.calculus.sr_explanation_ready', 'Explanation ready.'));
              }).catch(function () {
                save('aiLoading', false); save('aiError', __alloT('stem.calculus.ai_error', 'Could not reach the AI tutor. Try again in a moment.'));
              });
            }
            return h('div', { className: 'mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50', role: 'region', 'aria-label': __alloT('stem.calculus.ai_title', 'Explain at my level') },
              h('div', { className: 'flex items-center flex-wrap gap-2 mb-1.5' },
                h('span', { className: 'text-sm font-bold text-purple-800' }, '\u2728 ' + __alloT('stem.calculus.ai_title', 'Explain at my level')),
                h('div', { className: 'ml-auto flex gap-1', role: 'group', 'aria-label': __alloT('stem.calculus.a11y_reading_level', 'Reading level') },
                  LEVELS.map(function (L) {
                    var active = aiLevel === L.id;
                    return h('button', {
                      key: L.id, type: 'button',
                      onClick: function () { save('aiLevel', L.id); },
                      'aria-pressed': active,
                      className: 'min-h-[28px] px-2 py-0.5 rounded text-[0.6875rem] font-bold ' + (active ? 'bg-purple-700 text-white' : 'transition-colors bg-white text-purple-800 border border-purple-600 hover:bg-purple-100')
                    }, L.label);
                  })
                ),
                h('button', {
                  type: 'button',
                  onClick: explain,
                  disabled: aiLoading,
                  'aria-label': fillT(__alloT('stem.calculus.ai_generate', 'Generate AI explanation at {level} level'), { level: ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') }),
                  className: 'transition-colors min-h-[32px] px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50'
                }, aiLoading ? '\u23F3 ' + __alloT('stem.calculus.ai_thinking', 'Thinking...') : (aiText ? '\uD83D\uDD04 ' + __alloT('stem.calculus.ai_reexplain', 'Re-explain') : '\uD83E\uDDE0 ' + __alloT('stem.calculus.ai_explain', 'Explain')))
              ),
              aiError && h('p', { className: 'text-[0.6875rem] text-rose-700', role: 'alert' }, aiError),
              aiText && h('p', { className: 'text-xs text-slate-800 leading-relaxed bg-white rounded-lg p-2 border border-purple-100' }, aiText),
              !aiText && !aiLoading && !aiError && h('p', { className: 'text-[0.6875rem] text-slate-700' }, __alloT('stem.calculus.ai_prompt', 'Press Explain for the AI tutor to describe what you are exploring right now.'))
            );
          })()

        );
      })();
    }
  });

  console.log('[StemLab] stem_tool_calculus.js loaded');
})();
