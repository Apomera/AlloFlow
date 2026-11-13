// Take-home adapter: Letter Trace (letter_tracing).
// App source of truth (word_sounds_module.js):
//   board       activityItems.letter_tracing = { letter: word[0] } (setup), and the
//               player traces the word's first letter; a board copied from another
//               word is never used (the letter must be the word's first letter).
//   cases       the app traces the CAPITAL first, then the lowercase as a "Bonus!" part
//               (tracingPhase "upper" -> "lower", "Skip lowercase", fb_great_job +
//               now_try_lowercase between them). The file does the same; board.cases
//               ('both' default, 'capital', 'lowercase') is the maker's choice.
//   shapes      the app draws the glyph in "Comic Sans MS"/"Chalkboard SE" with a green
//               start dot. A device may have neither, so the file draws school letter
//               shapes from STROKES below (single-story a and g), with writing lines, a
//               green numbered start dot and an arrow for each stroke. A letter with no
//               strokes (not a-z) falls back to the font glyph.
//   checking    the app checks the letter region by region (an 8 x 8 grid), not just the
//               total ink; the file checks a 7 x 7 grid and ink far from the letter.
//               The app also weighs the start point (start 15%: within 35 px of the
//               green dot) and tips "Start at the green dot!". The file gives the same
//               tip, softly (2026-11-13): when the first stroke (longer than 24 px, as the
//               app counts strokes) starts more than 35 px from dot 1, it says "Start at
//               the green dot 1." and never fails the trace for it.
//   audio       trace_letter, the letter's name (letter_x), "for", the word, as the app's
//               opening; else inst_letter_tracing and the word. The bank names a-z only
//               (letter_a..letter_z): for any other first letter there is no "Hear the
//               letter" button at all (checked 2026-11-13).
//   grading     none: letter_tracing is in WS_NON_GRADED_ACTIVITIES, so the file
//               records it as practice ("traced" or "skipped"), never right or wrong.
//   access      pointer events cover mouse, touch and pen; "Skip (not traced)" is the
//               path for a student who cannot trace (2026-11-07 parity audit).

// School letter shapes (ball and stick). Units: top line y=0, middle line y=50, base
// line y=100, descenders to 145. Strokes are split by "|", in the order they are
// written. M x y / L x y: a line; E cx cy rx ry a0 a1: part of an ellipse from angle a0
// to a1 in degrees (0 = right, 90 = down; a1 < a0 goes counterclockwise); D x y: a dot.
// Only the strokes of the letters an item traces travel in the file.
var STROKES = {
  a: 'E 22 75 22 25 -30 -390|M 44 50 L 44 100',
  b: 'M 0 0 L 0 100|E 22 75 22 25 180 540',
  c: 'E 22 75 22 25 -40 -320',
  d: 'E 22 75 22 25 -30 -390|M 44 0 L 44 100',
  e: 'M 2 75 L 44 75 E 22 75 22 25 0 -320',
  f: 'E 34 14 13 14 -20 -180 L 21 100|M 6 50 L 40 50',
  g: 'E 22 75 22 25 -30 -390|M 44 50 L 44 125 E 24 125 20 20 0 150',
  h: 'M 0 0 L 0 100|M 0 72 E 22 72 22 22 180 360 L 44 100',
  i: 'M 0 50 L 0 100|D 0 28',
  j: 'M 24 50 L 24 125 E 6 125 18 18 0 160|D 24 28',
  k: 'M 0 0 L 0 100|M 38 50 L 2 78 L 40 100',
  l: 'M 0 0 L 0 100',
  m: 'M 0 50 L 0 100|M 0 70 E 15 70 15 20 180 360 L 30 100|M 30 70 E 45 70 15 20 180 360 L 60 100',
  n: 'M 0 50 L 0 100|M 0 72 E 21 72 21 22 180 360 L 42 100',
  o: 'E 23 75 23 25 -70 -430',
  p: 'M 0 50 L 0 145|E 22 75 22 25 180 540',
  q: 'E 22 75 22 25 -30 -390|M 44 50 L 44 145',
  r: 'M 0 50 L 0 100|M 0 74 E 20 74 20 22 180 310',
  s: 'E 22 62.5 20 12.5 -20 -270 E 22 87.5 20 12.5 -90 160',
  t: 'M 16 14 L 16 100|M 0 50 L 34 50',
  u: 'M 0 50 L 0 78 E 21 78 21 22 180 0 L 42 50|M 42 50 L 42 100',
  v: 'M 0 50 L 22 100 L 44 50',
  w: 'M 0 50 L 15 100 L 30 50 L 45 100 L 60 50',
  x: 'M 0 50 L 42 100|M 42 50 L 0 100',
  y: 'M 0 50 L 22 100|M 44 50 L 8 145',
  z: 'M 0 50 L 42 50 L 0 100 L 42 100',
  A: 'M 30 0 L 0 100|M 30 0 L 60 100|M 11 64 L 49 64',
  B: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 24 22 24 -90 90 L 0 48|M 0 48 L 28 48 E 28 74 24 26 -90 90 L 0 100',
  C: 'E 45 50 45 50 -40 -320',
  D: 'M 0 0 L 0 100|M 0 0 L 16 0 E 16 50 40 50 -90 90 L 0 100',
  E: 'M 0 0 L 0 100|M 0 0 L 44 0|M 0 50 L 36 50|M 0 100 L 44 100',
  F: 'M 0 0 L 0 100|M 0 0 L 44 0|M 0 50 L 36 50',
  G: 'E 45 50 45 50 -40 -360 L 58 50',
  H: 'M 0 0 L 0 100|M 50 0 L 50 100|M 0 50 L 50 50',
  I: 'M 20 0 L 20 100|M 0 0 L 40 0|M 0 100 L 40 100',
  J: 'M 40 0 L 40 74 E 20 74 20 26 0 165',
  K: 'M 0 0 L 0 100|M 46 0 L 2 52 L 48 100',
  L: 'M 0 0 L 0 100 L 42 100',
  M: 'M 0 0 L 0 100|M 0 0 L 32 64 L 64 0 L 64 100',
  N: 'M 0 0 L 0 100|M 0 0 L 52 100 L 52 0',
  O: 'E 45 50 45 50 -90 -450',
  P: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 26 24 26 -90 90 L 0 52',
  Q: 'E 45 50 45 50 -90 -450|M 58 72 L 92 104',
  R: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 26 24 26 -90 90 L 0 52|M 24 52 L 50 100',
  S: 'E 42 25 38 25 -20 -270 E 42 75 38 25 -90 160',
  T: 'M 26 0 L 26 100|M 0 0 L 52 0',
  U: 'M 0 0 L 0 66 E 25 66 25 34 180 0 L 50 0',
  V: 'M 0 0 L 26 100 L 52 0',
  W: 'M 0 0 L 18 100 L 36 0 L 54 100 L 72 0',
  X: 'M 0 0 L 52 100|M 52 0 L 0 100',
  Y: 'M 0 0 L 26 50|M 52 0 L 26 50 L 26 100',
  Z: 'M 0 0 L 52 0 L 0 100 L 52 100',
};

module.exports = {
  id: 'letter_tracing',
  title: 'Letter Trace',
  STROKES: STROKES,
  labels: {
    letter_tracing_question: 'Trace the letter {letter} with your finger, a pen or the mouse.',
    letter_tracing_canvas: 'Tracing area for the letter {letter}',
    letter_tracing_done: 'I traced it',
    letter_tracing_clear: 'Start again',
    letter_tracing_skip: 'Skip (not traced)',
    letter_tracing_more: 'Keep going. Trace over more of the letter.',
    letter_tracing_stay: 'Stay on the letter. Press Start again and trace inside its shape.',
    letter_tracing_traced: 'Nice tracing!',
    letter_tracing_skipped: 'Skipped. That is fine.',
    // 2026-11-13: capital and lowercase, as the app traces them.
    letter_tracing_capital: 'Trace the capital letter {letter}.',
    letter_tracing_lowercase: 'Trace the lowercase letter {letter}.',
    letter_tracing_tools: 'Use your finger, a pen or the mouse.',
    letter_tracing_part: 'Part {n} of {total}',
    letter_tracing_how_one: 'Start at the green dot. Follow the arrow.',
    letter_tracing_how_more: 'Start at the green dot 1. Follow the arrow. Then do 2, and the next numbers in order.',
    letter_tracing_canvas_capital: 'Tracing area for the capital letter {letter}',
    letter_tracing_canvas_lowercase: 'Tracing area for the lowercase letter {letter}',
    letter_tracing_hear_letter: 'Hear the letter',
    letter_tracing_now_lowercase: 'Nice tracing! Now trace the lowercase letter {letter}.',
    letter_tracing_skip_lowercase: 'Skip the lowercase letter',
    // The app prints "for cat" beside the letter.
    letter_tracing_word: 'The word: {word}',
    // 2026-11-13: a tip, never a fail: the first stroke started far from the start dot.
    letter_tracing_start_one: 'Start at the green dot.',
    letter_tracing_start_more: 'Start at the green dot 1.',
  },
  prepare: function (w, env) {
    var word = String((w && (w.targetWord || w.word || w.term)) || '').trim();
    var first = Array.from(word)[0] || '';
    var board = w && w.activityItems && w.activityItems.letter_tracing;
    var letter = String((board && board.letter) || first).trim();
    if (!letter || !first || Array.from(letter).length !== 1 || letter.toLowerCase() !== first.toLowerCase()) return { missing: ['board'] };
    var cases = board && (board.cases === 'capital' || board.cases === 'lowercase') ? board.cases : 'both';
    var up = letter.toUpperCase(), low = letter.toLowerCase();
    // A letter with no capital (or one that is two letters as a capital, like ß) is traced as it is.
    var cased = up !== low && Array.from(up).length === 1 && Array.from(low).length === 1;
    var part = function (text, kind) { return { letter: text, kind: kind, strokes: Object.prototype.hasOwnProperty.call(STROKES, text) ? STROKES[text] : null }; };
    var parts = !cased ? [part(letter, '')] : cases === 'capital' ? [part(up, 'capital')] : cases === 'lowercase' ? [part(low, 'lowercase')] : [part(up, 'capital'), part(low, 'lowercase')];
    // Tracing is visual: the spoken instruction and the word are helpful, not required.
    var wordAudio = env.wordClip(word);
    var named = /^[a-z]$/.test(low) ? env.bankClip('instructions', 'letter_' + low) : null;
    var traceIt = env.bankClip('instructions', 'trace_letter');
    var prompt = env.bankClip('instructions', 'inst_letter_tracing');
    var intro = [];
    if (traceIt && named) {
      // The app's opening: "Trace the letter", its name, "for", the word.
      intro.push(traceIt, named);
      var forClip = env.bankClip('instructions', 'for');
      if (forClip && wordAudio) intro.push(forClip);
    } else if (prompt) intro.push(prompt);
    if (wordAudio) intro.push(wordAudio);
    var item = { target: low, letter: letter, parts: parts, wordAudio: wordAudio, promptAudio: (traceIt && named) ? traceIt : prompt,
      introAudio: intro, answerAudio: wordAudio ? [wordAudio] : [] };
    if (named) item.letterAudio = named;
    if (parts.length > 1) { var next = env.bankClip('instructions', 'now_try_lowercase'); if (next) item.lowerAudio = next; }
    return { item: item };
  },
  render: function (item, ctx) {
    var L = ctx.L;
    var doc = ctx.root.ownerDocument;
    var win = doc.defaultView || {};
    var size = 280;
    var k = Math.min(2, Math.max(1, Math.round(Number(win.devicePixelRatio) || 1)));
    var px = size * k;
    var parts = item.parts && item.parts.length ? item.parts : [{ letter: item.letter, kind: '', strokes: null }];
    var at = 0;
    var pen = 22; // the width of the student's line and of the guide
    // A square that shrinks on a narrow phone (padding-top keeps it square without aspect-ratio).
    var wrap = ctx.el('div', { 'data-trace-box': '', style: 'position:relative;width:' + size + 'px;max-width:100%;margin:12px auto;border:2px dashed var(--muted);border-radius:16px;background:#fff;overflow:hidden;touch-action:none' });
    wrap.appendChild(ctx.el('div', { 'aria-hidden': 'true', style: 'padding-top:100%' }));
    var guide = doc.createElement('canvas');
    var ink = doc.createElement('canvas');
    [guide, ink].forEach(function (c) {
      c.width = px; c.height = px;
      c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none';
      wrap.appendChild(c);
    });
    guide.setAttribute('aria-hidden', 'true');
    ink.setAttribute('role', 'img');
    ink.setAttribute('data-trace-pen', '');
    var gg = guide.getContext ? guide.getContext('2d') : null;
    var pg = ink.getContext ? ink.getContext('2d') : null;
    // Each stroke as points in canvas units (CSS px), placed in the box.
    var shape = null;
    var parse = function (spec) {
      return String(spec).split('|').map(function (s) {
        var t = s.trim().split(/\s+/), pts = [], dot = false, i = 0;
        while (i < t.length) {
          var c = t[i++];
          if (c === 'M' || c === 'L' || c === 'D') { pts.push([Number(t[i]), Number(t[i + 1])]); dot = c === 'D'; i += 2; }
          else if (c === 'E') {
            var cx = Number(t[i]), cy = Number(t[i + 1]), rx = Number(t[i + 2]), ry = Number(t[i + 3]), a0 = Number(t[i + 4]), a1 = Number(t[i + 5]);
            i += 6;
            var n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 6));
            for (var j = 0; j <= n; j++) { var a = (a0 + (a1 - a0) * j / n) * Math.PI / 180; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
          } else break;
        }
        return { pts: pts, dot: dot };
      }).filter(function (s) { return s.pts.length; });
    };
    var layout = function (part) {
      if (!part.strokes) return null;
      var strokes = parse(part.strokes);
      var xs = [], ys = [];
      strokes.forEach(function (s) { s.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
      // The part of the writing lines the letter uses (a short letter needs no room above the middle line, a letter
      // with no tail none below the base line), as large as the box allows, at most 2.4 px a unit.
      var top = Math.min(Math.min.apply(null, ys), 30) - 12, bottom = Math.max(Math.max.apply(null, ys), 100) + 12;
      var s = Math.min(2.4, (size - 28) / (bottom - top), (size - 40) / Math.max(1, maxX - minX));
      var ox = (size - (maxX - minX) * s) / 2 - minX * s, oy = (size - (bottom - top) * s) / 2 - top * s;
      var put = function (p) { return [ox + p[0] * s, oy + p[1] * s]; };
      return { y: function (v) { return oy + v * s; }, strokes: strokes.map(function (st) { return { dot: st.dot, pts: st.pts.map(put) }; }) };
    };
    var font = 'bold ' + Math.round(size * 0.7) + 'px "Comic Sans MS", "Chalkboard SE", "Andika", system-ui, sans-serif';
    // Draws the letter: as strokes (school shapes), or as the font glyph for a letter with no strokes.
    var paint = function (g, color, width) {
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, size, size);
      g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round'; g.lineJoin = 'round';
      if (!shape) {
        g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(parts[at].letter, size / 2, size * 0.54);
        if (width) { g.lineWidth = width; g.strokeText(parts[at].letter, size / 2, size * 0.54); }
        return;
      }
      g.lineWidth = width || pen;
      shape.strokes.forEach(function (st) {
        if (st.dot) { g.beginPath(); g.arc(st.pts[0][0], st.pts[0][1], (width || pen) / 2, 0, Math.PI * 2); g.fill(); return; }
        g.beginPath(); g.moveTo(st.pts[0][0], st.pts[0][1]);
        st.pts.slice(1).forEach(function (p) { g.lineTo(p[0], p[1]); });
        g.stroke();
      });
    };
    // Where a stroke is d px along its path, and which way it goes there.
    var along = function (pts, d) {
      var left = d;
      for (var i = 1; i < pts.length; i++) {
        var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], len = Math.sqrt(dx * dx + dy * dy);
        if (!len) continue;
        if (left <= len || i === pts.length - 1) { var f = Math.min(1, left / len); return { x: pts[i - 1][0] + dx * f, y: pts[i - 1][1] + dy * f, ux: dx / len, uy: dy / len }; }
        left -= len;
      }
      return null;
    };
    var drawGuide = function () {
      if (!gg) return;
      paint(gg, 'rgba(100,116,139,0.32)', 0);
      if (!shape) return;
      // Writing lines behind the letter: top, a dashed middle, the base line.
      gg.globalCompositeOperation = 'destination-over';
      [[0, '#94a3b8', []], [50, '#94a3b8', [8, 7]], [100, '#475569', []]].forEach(function (row) {
        gg.beginPath(); gg.setLineDash(row[2]); gg.lineWidth = 2; gg.strokeStyle = row[1];
        gg.moveTo(8, shape.y(row[0])); gg.lineTo(size - 8, shape.y(row[0])); gg.stroke();
      });
      gg.globalCompositeOperation = 'source-over';
      gg.setLineDash([]);
      // A thin dashed line down the middle of each stroke, then a numbered start dot and an arrow.
      gg.lineWidth = 2; gg.strokeStyle = '#64748b'; gg.setLineDash([5, 6]);
      shape.strokes.forEach(function (st) {
        if (st.dot) return;
        gg.beginPath(); gg.moveTo(st.pts[0][0], st.pts[0][1]);
        st.pts.slice(1).forEach(function (p) { gg.lineTo(p[0], p[1]); });
        gg.stroke();
      });
      gg.setLineDash([]);
      // 2026-11-13: no dot, number or arrow covers another. Dot 1 is at its real start. Each later stroke takes the
      // cheapest place for its dot (its real start; a little way along the stroke; beside or behind the start, with
      // a short line to it) that is 36 px from every earlier dot and 24 px from every earlier arrow, inside the box,
      // and leaves room for its own arrow (24 px from other dots, 22 from its own, 21 from every arrow), best nearer its own dot
      // than any other. Dots are drawn last, dot 1 on top. Guides only: the tracing check does not use them.
      var R = 12, many = shape.strokes.length > 1, dots = [], arrows = [], all = [];
      shape.strokes.forEach(function (st) { all = all.concat(st.pts); });
      var mid = [all.reduce(function (n, q) { return n + q[0]; }, 0) / all.length, all.reduce(function (n, q) { return n + q[1]; }, 0) / all.length];
      var lenOf = function (pts) { var t = 0; for (var i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; };
      var gap = function (q, list) { return list.reduce(function (n, m) { return Math.min(n, Math.hypot(m[0] - q[0], m[1] - q[1])); }, Infinity); };
      var inside = function (q) { return q[0] >= R + 2 && q[0] <= size - R - 2 && q[1] >= R + 2 && q[1] <= size - R - 2; };
      var spots = function () { return dots.map(function (m) { return m.p; }); };
      var arrowAt = function (st, len, p, from, lead) {
        var others = spots(), heads = arrows.map(function (a) { return [a.x, a.y]; });
        for (var c = lead ? 4 : from + 22; c <= len - 4; c += 2) {
          var a = along(st.pts, c);
          if (!a) break;
          var q = [a.x, a.y];
          if (gap(q, others) < 24 || gap(q, [p]) < 22 || gap(q, heads) < 21) continue;
          var mine = Math.min(Math.hypot(q[0] - p[0], q[1] - p[1]), lead ? Math.hypot(q[0] - lead[0], q[1] - lead[1]) : Infinity);
          return { a: a, extra: c - (lead ? 4 : from + 22), near: mine <= gap(q, others) };
        }
        return null;
      };
      shape.strokes.forEach(function (st, n) {
        var start = st.pts[0], d = st.dot ? null : along(st.pts, 1), len = st.dot ? 0 : lenOf(st.pts), best = null;
        var pick = function (p, cost, from, lead) {
          if (n && (!inside(p) || gap(p, spots()) < 36 || gap(p, arrows.map(function (a) { return [a.x, a.y]; })) < 24)) return;
          var arrow = st.dot ? { a: null, extra: 0, near: true } : arrowAt(st, len, p, from, lead);
          if (!arrow) return;
          var score = cost + arrow.extra * 0.5 + (arrow.near ? 0 : 50);
          if (!best || score < best.score) best = { p: p, lead: lead, a: arrow.a, score: score };
        };
        pick(start, 0, 0, null);
        if (n) {
          if (d) for (var r = 24; r <= Math.min(72, len - 30); r += 4) { var o = along(st.pts, r); pick([o.x, o.y], r, r, null); }
          // Beside the start (away from the middle of the letter costs less), or behind it.
          var away = function (u) { return Math.hypot(start[0] + u[0] * 30 - mid[0], start[1] + u[1] * 30 - mid[1]); };
          var dirs = d ? [[-d.uy, d.ux], [d.uy, -d.ux]].sort(function (u, v) { return away(v) - away(u); }).map(function (u, i) { return [u, i ? 16 : 10]; }).concat([[[-d.ux, -d.uy], 12]])
            : [[[0, -1], 10], [[1, 0], 12], [[-1, 0], 12], [[0, 1], 16]];
          dirs.forEach(function (u) { for (var r2 = 26; r2 <= 64; r2 += 4) pick([start[0] + u[0][0] * r2, start[1] + u[0][1] * r2], r2 + u[1], 0, start); });
        }
        // Nowhere fits (not seen in a-z, A-Z): the real start and an arrow 34 px along, as before.
        if (!best) best = { p: start, lead: null, a: st.dot ? null : along(st.pts, 34) };
        dots.push(best);
        if (best.a) arrows.push(best.a);
      });
      // Short lines from moved dots to their real starts, then the arrows, then the dots.
      dots.forEach(function (m) {
        if (!m.lead) return;
        gg.beginPath(); gg.lineWidth = 2; gg.strokeStyle = '#15803d'; gg.moveTo(m.lead[0], m.lead[1]); gg.lineTo(m.p[0], m.p[1]); gg.stroke();
        gg.beginPath(); gg.arc(m.lead[0], m.lead[1], 4, 0, Math.PI * 2); gg.fillStyle = '#15803d'; gg.fill();
      });
      arrows.forEach(function (a) {
        gg.beginPath(); gg.fillStyle = '#15803d';
        gg.moveTo(a.x + a.ux * 10, a.y + a.uy * 10);
        gg.lineTo(a.x - a.ux * 6 - a.uy * 8, a.y - a.uy * 6 + a.ux * 8);
        gg.lineTo(a.x - a.ux * 6 + a.uy * 8, a.y - a.uy * 6 - a.ux * 8);
        gg.closePath(); gg.fill();
      });
      // The dots, last first, so dot 1 is on top.
      for (var n = dots.length - 1; n >= 0; n--) {
        var p = dots[n].p;
        gg.beginPath(); gg.arc(p[0], p[1], R, 0, Math.PI * 2); gg.fillStyle = '#15803d'; gg.fill();
        gg.lineWidth = 2; gg.strokeStyle = '#fff'; gg.stroke();
        if (many) { gg.fillStyle = '#fff'; gg.font = 'bold 14px system-ui, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText(String(n + 1), p[0], p[1] + 1); }
      }
    };
    var drawing = false, last = null;
    // The first stroke of a part (after Start again too): where it began and how long it is, for the start tip.
    var first = null, firstDone = false;
    var spot = function (e) {
      var r = ink.getBoundingClientRect();
      return { x: (e.clientX - r.left) * size / (r.width || size), y: (e.clientY - r.top) * size / (r.height || size) };
    };
    var line = function (a, b) {
      if (!pg) return;
      pg.setTransform(k, 0, 0, k, 0, 0);
      pg.strokeStyle = '#1d4ed8'; pg.lineWidth = pen; pg.lineCap = 'round'; pg.lineJoin = 'round';
      pg.beginPath(); pg.moveTo(a.x, a.y); pg.lineTo(b.x, b.y); pg.stroke();
    };
    var wipe = function () { first = null; firstDone = false; if (pg) { pg.setTransform(1, 0, 0, 1, 0, 0); pg.clearRect(0, 0, px, px); } };
    ink.addEventListener('pointerdown', function (e) {
      if (ctx.isDone()) return;
      drawing = true; last = spot(e); line(last, last);
      if (!firstDone) first = { x: last.x, y: last.y, len: 0 };
      try { ink.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    ink.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      var p = spot(e);
      if (first && !firstDone) first.len += Math.sqrt((p.x - last.x) * (p.x - last.x) + (p.y - last.y) * (p.y - last.y));
      line(last, p); last = p; e.preventDefault();
    });
    // A stroke longer than 24 px is the first stroke (a tap is not); far from dot 1 (35 px, as the app), a tip.
    var startTip = function () {
      if (firstDone || !first || first.len <= 24) return;
      firstDone = true;
      var dot = shape && shape.strokes[0] && shape.strokes[0].pts[0];
      if (!dot || Math.sqrt((first.x - dot[0]) * (first.x - dot[0]) + (first.y - dot[1]) * (first.y - dot[1])) <= 35) return;
      note.textContent = shape.strokes.length > 1 ? (L.letter_tracing_start_more || '') : (L.letter_tracing_start_one || '');
    };
    var stop = function () { if (drawing) startTip(); drawing = false; last = null; };
    ink.addEventListener('pointerup', stop);
    ink.addEventListener('pointercancel', stop);
    // Region by region, as the app checks it: the share of the letter's 7 x 7 grid cells
    // the strokes cover, and how much ink lands well away from the letter (scribbling over
    // the whole box is not tracing). Every other pixel is enough.
    var measure = function () {
      if (!gg || !pg) return { done: 1, stray: 0 };
      var mask = doc.createElement('canvas'); mask.width = px; mask.height = px;
      var mg = mask.getContext('2d'); paint(mg, '#000', shape ? pen * 1.25 : 0);
      var halo = doc.createElement('canvas'); halo.width = px; halo.height = px;
      var hg = halo.getContext('2d'); paint(hg, '#000', shape ? pen * 2.6 : size * 0.14);
      var m = mg.getImageData(0, 0, px, px).data, h = hg.getImageData(0, 0, px, px).data, p = pg.getImageData(0, 0, px, px).data;
      var G = 7, cell = px / G, want = [], got = [], all = 0, away = 0;
      for (var y = 0; y < px; y += 2 * k) {
        for (var x = 0; x < px; x += 2 * k) {
          var i = (y * px + x) * 4 + 3, c = Math.floor(y / cell) * G + Math.floor(x / cell), on = p[i] > 0;
          if (m[i] > 128) { want[c] = (want[c] || 0) + 1; if (on) got[c] = (got[c] || 0) + 1; }
          if (on) { all++; if (h[i] <= 128) away++; }
        }
      }
      var cells = 0, covered = 0;
      for (var c2 = 0; c2 < G * G; c2++) if ((want[c2] || 0) >= 6) { cells++; if ((got[c2] || 0) / want[c2] >= 0.35) covered++; }
      return { done: cells ? covered / cells : 0, stray: all ? away / all : 0 };
    };
    var question = ctx.el('p', { class: 'letters', 'data-trace-question': '' });
    var tools = ctx.el('p', { class: 'muted', style: 'margin:0', text: L.letter_tracing_tools || '' });
    var stepLine = ctx.el('p', { class: 'muted', 'data-trace-part': '', style: 'margin:0' });
    var how = ctx.el('p', { class: 'muted', 'data-trace-how': '' });
    var note = ctx.el('p', { class: 'letters', 'aria-live': 'polite' });
    var skipLower = ctx.el('button', { type: 'button', 'data-trace-skip-lowercase': '', hidden: true, on: { click: function () {
      if (ctx.isDone()) return;
      ctx.support('lowercaseSkipped');
      ctx.practice('traced', L.letter_tracing_traced);
    } }, text: L.letter_tracing_skip_lowercase });
    var showPart = function () {
      var part = parts[at];
      shape = layout(part);
      var named = { letter: part.letter };
      question.textContent = part.kind === 'capital' ? ctx.fmt(L.letter_tracing_capital, named)
        : part.kind === 'lowercase' ? ctx.fmt(L.letter_tracing_lowercase, named) : ctx.fmt(L.letter_tracing_question, named);
      tools.hidden = !part.kind;
      ink.setAttribute('aria-label', ctx.fmt(part.kind === 'capital' ? L.letter_tracing_canvas_capital : part.kind === 'lowercase' ? L.letter_tracing_canvas_lowercase : L.letter_tracing_canvas, named));
      stepLine.textContent = parts.length > 1 ? ctx.fmt(L.letter_tracing_part, { n: at + 1, total: parts.length }) : '';
      stepLine.hidden = parts.length < 2;
      how.textContent = !shape ? '' : shape.strokes.length > 1 ? L.letter_tracing_how_more : L.letter_tracing_how_one;
      how.hidden = !shape;
      skipLower.hidden = !(at > 0 && part.kind === 'lowercase');
      drawGuide();
      wipe();
    };
    var buttons = [];
    if (item.letterAudio) buttons.push(ctx.el('button', { type: 'button', on: { click: function () { ctx.support('letterReplays'); ctx.play(item.letterAudio); } }, text: L.letter_tracing_hear_letter }));
    if (item.wordAudio || item.promptAudio) buttons.push(ctx.el('button', { type: 'button', class: 'primary', on: { click: function () { ctx.support('wordReplays'); ctx.play(item.wordAudio || item.promptAudio); } }, text: L.hear_word }));
    var done = ctx.el('button', { type: 'button', class: 'primary', 'data-trace-done': '', on: { click: function () {
      if (ctx.isDone()) return;
      var m = measure();
      if (m.stray > 0.5) { note.textContent = L.letter_tracing_stay; return; }
      if (m.done < 0.6) { note.textContent = L.letter_tracing_more; return; }
      if (at < parts.length - 1) {
        at++;
        showPart();
        note.textContent = ctx.fmt(L.letter_tracing_now_lowercase, { letter: parts[at].letter });
        if (item.lowerAudio) ctx.play(item.lowerAudio);
        return;
      }
      note.textContent = '';
      ctx.practice('traced', L.letter_tracing_traced);
    } }, text: L.letter_tracing_done });
    var clear = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; wipe(); note.textContent = ''; } }, text: L.letter_tracing_clear });
    var skip = ctx.el('button', { type: 'button', on: { click: function () { if (ctx.isDone()) return; ctx.practice('skipped', L.letter_tracing_skipped); } }, text: L.letter_tracing_skip });
    ctx.root.appendChild(question);
    if (item.word) ctx.root.appendChild(ctx.el('p', { class: 'letters', 'data-trace-word': '', style: 'font-size:1.25rem;margin:0 0 4px' }, String(L.letter_tracing_word || '{word}').split('{word}').reduce(function (out, bit, i) { if (i) out.push(ctx.el('span', { lang: 'en', dir: 'ltr', text: item.word })); if (bit) out.push(bit); return out; }, [])));
    ctx.root.appendChild(tools);
    ctx.root.appendChild(stepLine);
    if (buttons.length) ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:8px' }, buttons));
    ctx.root.appendChild(how);
    ctx.root.appendChild(wrap);
    ctx.root.appendChild(note);
    ctx.root.appendChild(ctx.el('div', { class: 'row', style: 'margin-top:12px' }, [done, clear, skipLower, skip]));
    showPart();
    return {
      reveal: function () { [done, clear, skipLower, skip].forEach(function (b) { b.setAttribute('aria-disabled', 'true'); }); },
    };
  },
};
