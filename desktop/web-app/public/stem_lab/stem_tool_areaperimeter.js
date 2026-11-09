// Area & Perimeter Lab
// Measurement, decomposition, comparison, fixed-fence investigations, and
// generated grade-banded practice (3.MD.5-8, 4.MD.3, 5.NF.4b, 6.G.1).

(function(global) {
  'use strict';

  if (!global) return;

  // Defensive StemLab guard: this module can load independently in previews/tests.
  global.StemLab = global.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function(id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    getRegisteredTools: function() {
      var self = this;
      return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
    },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) {
      var tool = this._registry[id];
      if (!tool || typeof tool.render !== 'function') return null;
      try { return tool.render(ctx); } catch (err) {
        if (global.console && typeof global.console.error === 'function') {
          global.console.error('[StemLab] Error rendering ' + id, err);
        }
        return null;
      }
    }
  };

  function questData(data) {
    return (data && data._areaPerimeter) || data || {};
  }

  var AREA_MODE_IDS = ['explore', 'compare', 'composite', 'investigate', 'fence', 'challenge', 'units', 'circles', 'irregular', 'missions'];
  var AREA_TARGET_IDS = ['12', '18', '24', '30', '36'];
  var AREA_METHOD_IDS = ['add', 'subtract'];
  // The ten fixed challenges of the first version. They are no longer shown,
  // but saved progress that names them still counts.
  var AREA_CHALLENGE_IDS = [
    'garden-area', 'frame-perimeter', 'missing-length', 'missing-width-perimeter',
    'l-shape-area', 'equal-area-perimeters', 'missing-width-area', 'rug-trim',
    'square-side', 'corner-cut-area'
  ];
  // Generated problems are saved by what they ask, so the same numbers never score twice.
  var GEN_KEY_RE = /^g:[a-z_]{3,40}:[a-z0-9_.\-]{1,160}$/;

  function countAllowed(map, allowedIds) {
    map = map || {};
    return allowedIds.filter(function(id) { return !!map[id]; }).length;
  }

  function normalizeChallengeProgress(map) {
    map = map && typeof map === 'object' ? map : {};
    var normalized = {};
    AREA_CHALLENGE_IDS.forEach(function(id, index) {
      if (map[id] || map[String(index)]) normalized[id] = true;
    });
    Object.keys(map).forEach(function(key) {
      if (map[key] && GEN_KEY_RE.test(key)) normalized[key] = true;
    });
    return normalized;
  }

  function challengeProgressCount(map) {
    return Object.keys(normalizeChallengeProgress(map)).length;
  }

  function typeSolvedCount(map, type) {
    var prefix = 'g:' + type + ':';
    return Object.keys(normalizeChallengeProgress(map)).filter(function(key) { return key.indexOf(prefix) === 0; }).length;
  }

  function isValidTileKey(key, width, height) {
    var match = String(key).match(/^(\d+)-(\d+)$/);
    if (!match) return false;
    var column = Number(match[1]);
    var row = Number(match[2]);
    return String(column) + '-' + String(row) === String(key) &&
      column < Number(width) && row < Number(height);
  }

  function validTileMap(map, width, height) {
    var valid = {};
    Object.keys(map || {}).forEach(function(key) {
      if (map[key] && isValidTileKey(key, width, height)) valid[key] = true;
    });
    return valid;
  }

  function countValidTiles(map, width, height) {
    return Object.keys(validTileMap(map, width, height)).length;
  }

  function clampInteger(value, min, max) {
    value = Number(value);
    if (!isFinite(value)) value = min;
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function rectangleMetrics(width, height) {
    width = Number(width);
    height = Number(height);
    if (!isFinite(width) || width < 0) width = 0;
    if (!isFinite(height) || height < 0) height = 0;
    return {
      area: width * height,
      perimeter: 2 * (width + height)
    };
  }

  function compositeMetrics(outerWidth, outerHeight, leftWidth, notchHeight) {
    outerWidth = Number(outerWidth);
    outerHeight = Number(outerHeight);
    leftWidth = Number(leftWidth);
    notchHeight = Number(notchHeight);
    if (!isFinite(outerWidth) || outerWidth < 0) outerWidth = 0;
    if (!isFinite(outerHeight) || outerHeight < 0) outerHeight = 0;
    if (!isFinite(leftWidth)) leftWidth = 0;
    if (!isFinite(notchHeight)) notchHeight = 0;
    leftWidth = Math.max(0, Math.min(outerWidth, leftWidth));
    notchHeight = Math.max(0, Math.min(outerHeight, notchHeight));
    var cutWidth = outerWidth - leftWidth;
    return {
      cutWidth: cutWidth,
      area: outerWidth * outerHeight - cutWidth * notchHeight,
      perimeter: 2 * (outerWidth + outerHeight),
      boundaryEdges: [leftWidth, notchHeight, cutWidth, outerHeight - notchHeight, outerWidth, outerHeight]
    };
  }

  // A rectangle with a piece cut out: from a corner (perimeter unchanged) or
  // from the middle of the top side (two new inner walls add 2 x depth).
  function notchMetrics(width, height, cutWidth, cutDepth, cut) {
    width = clampInteger(width, 1, 60);
    height = clampInteger(height, 1, 60);
    var base = { cut: 'none', valid: true, area: width * height, perimeter: 2 * (width + height), edges: [width, height, width, height], added: 0, cutWidth: 0, cutDepth: 0 };
    if (cut !== 'corner' && cut !== 'middle') return base;
    var maxCut = cut === 'middle' ? width - 2 : width - 1;
    if (maxCut < 1 || height < 2) return Object.assign({}, base, { cut: cut, valid: false });
    cutWidth = clampInteger(cutWidth, 1, maxCut);
    cutDepth = clampInteger(cutDepth, 1, height - 1);
    var area = width * height - cutWidth * cutDepth;
    if (cut === 'corner') {
      return { cut: cut, valid: true, area: area, perimeter: 2 * (width + height), edges: [width - cutWidth, cutDepth, cutWidth, height - cutDepth, width, height], added: 0, cutWidth: cutWidth, cutDepth: cutDepth };
    }
    var left = Math.floor((width - cutWidth) / 2);
    var right = width - cutWidth - left;
    var edges = [left, cutDepth, cutWidth, cutDepth, right, height, width, height];
    return { cut: cut, valid: true, area: area, perimeter: edges.reduce(function(sum, edge) { return sum + edge; }, 0), edges: edges, added: 2 * cutDepth, cutWidth: cutWidth, cutDepth: cutDepth, left: left, right: right };
  }

  // Every rectangle with whole-number sides that uses exactly this much fence.
  function fixedPerimeterRectangles(perimeter) {
    perimeter = clampInteger(perimeter, 4, 200);
    var half = Math.floor(perimeter / 2);
    var list = [];
    for (var w = 1; w < half; w += 1) list.push({ w: w, h: half - w, area: w * (half - w), perimeter: 2 * half });
    return list;
  }

  function factorPairs(value) {
    value = Number(value);
    if (!isFinite(value) || value < 1) return [];
    value = Math.floor(value);
    var pairs = [];
    for (var factor = 1; factor * factor <= value; factor += 1) {
      if (value % factor === 0) {
        pairs.push({ w: value / factor, h: factor, p: 2 * (value / factor + factor) });
      }
    }
    return pairs;
  }

  function isCorrectNumericAnswer(input, expected) {
    if (String(input).trim() === '') return false;
    var numeric = Number(input);
    return isFinite(numeric) && Math.abs(numeric - Number(expected)) < 0.000001;
  }

  // Accepts whole numbers, decimals (a lone comma counts as a decimal point),
  // fractions like 3/4 and mixed numbers like 2 1/2.
  function parseAnswer(input) {
    var text = String(input == null ? '' : input).trim().replace(/\s+/g, ' ');
    if (!text) return NaN;
    if (text.indexOf('.') < 0 && /^\d+,\d+$/.test(text)) text = text.replace(',', '.');
    var match = text.match(/^(\d+) (\d+)\/(\d+)$/);
    if (match) return Number(match[3]) ? Number(match[1]) + Number(match[2]) / Number(match[3]) : NaN;
    match = text.match(/^(\d+)\/(\d+)$/);
    if (match) return Number(match[2]) ? Number(match[1]) / Number(match[2]) : NaN;
    if (/^(\d+\.?\d*|\.\d+)$/.test(text)) return Number(text);
    return NaN;
  }

  function valuesMatch(a, b) {
    a = Number(a); b = Number(b);
    return isFinite(a) && isFinite(b) && Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));
  }

  // ── exact fractions ──
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var r = a % b; a = b; b = r; } return a || 1; }
  function Q(n, d) { d = d || 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
  function qMul(a, b) { return Q(a.n * b.n, a.d * b.d); }
  function qAdd(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
  function qVal(a) { return a.n / a.d; }
  function qText(a) {
    if (a.d === 1) return String(a.n);
    var whole = Math.floor(a.n / a.d);
    var rest = a.n - whole * a.d;
    return whole ? whole + ' ' + rest + '/' + a.d : rest + '/' + a.d;
  }
  function qKey(a) { return a.n + '_' + a.d; }
  function numText(value) {
    if (value && typeof value === 'object') return qText(value);
    var n = Number(value);
    if (!isFinite(n)) return '';
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(Math.round(n * 10000) / 10000);
  }

  // ── seeded generator ──
  function makeRng(seed) {
    var a = (Number(seed) >>> 0) || 1;
    return function() {
      a = (a + 0x6D2B79F5) | 0;
      var x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randInt(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function pickOne(r, list) { return list[Math.floor(r() * list.length)]; }

  var GRADES = [3, 4, 5, 6];
  var GRADE_TOPICS = {
    3: ['tile_area', 'rect_area', 'rect_perimeter', 'same_perimeter', 'missing_side_perimeter'],
    4: ['rect_area', 'rect_perimeter', 'missing_side_area', 'missing_side_perimeter', 'square_side', 'l_shape_area'],
    5: ['frac_area', 'mixed_area', 'frac_perimeter', 'l_shape_area'],
    6: ['triangle_area', 'parallelogram_area', 'trapezoid_area', 'l_shape_area']
  };
  var UNITS = ['cm', 'm', 'ft', 'in', 'yd'];
  // Units that fit each story (no classroom floor 3 cm long). A unit that does
  // not fit is swapped without a new random draw, so the numbers stay the same.
  var CONTEXT_UNITS = {
    garden: ['m', 'ft', 'yd'], rug: ['ft'], poster: ['in', 'cm'], floor: ['m', 'yd'],
    fence: ['m', 'ft', 'yd'], ribbon: ['in', 'cm'], trim: ['ft', 'in'], border: ['m', 'yd']
  };
  function unitForContext(context, unit) {
    var fit = CONTEXT_UNITS[context];
    if (!fit || fit.indexOf(unit) >= 0) return unit;
    return fit[Math.max(0, UNITS.indexOf(unit)) % fit.length];
  }
  // [height, slant offset, slanted side]: Pythagorean triples keep drawings honest.
  var TRIPLES = [[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]];

  function normalizeGrade(grade) {
    grade = Math.round(Number(grade));
    return GRADES.indexOf(grade) >= 0 ? grade : 4;
  }

  function topicFor(grade, type, seed) {
    var topics = GRADE_TOPICS[normalizeGrade(grade)];
    if (topics.indexOf(type) >= 0) return type;
    var r = makeRng(((Number(seed) >>> 0) ^ 0x5bd1e995) >>> 0);
    return topics[Math.floor(r() * topics.length)];
  }

  // Named wrong answers. A trap that equals the right answer is dropped, and
  // the first trap wins when two share a value.
  function trapList(answer, list) {
    var seen = {};
    var out = [];
    list.forEach(function(item) {
      if (!item || !isFinite(item[1]) || item[1] < 0) return;
      if (valuesMatch(item[1], answer)) return;
      var key = String(Math.round(item[1] * 1e6));
      if (seen[key]) return;
      seen[key] = true;
      out.push({ id: item[0], value: item[1] });
    });
    return out;
  }

  function generateProblem(grade, type, seed) {
    grade = normalizeGrade(grade);
    seed = (Number(seed) >>> 0) || 1;
    type = topicFor(grade, type, seed);
    var r = makeRng(seed);
    var unit = pickOne(r, UNITS);
    var p = { grade: grade, type: type, seed: seed, unit: unit, context: '', kind: 'area', traps: [] };
    var parts = [];
    var big = grade >= 4;
    if (type === 'tile_area') {
      p.w = randInt(r, 3, 8); p.h = randInt(r, 2, 6); p.unit = 'sq'; p.kind = 'count';
      p.answer = p.w * p.h;
      p.traps = trapList(p.answer, [['gave_perimeter', 2 * (p.w + p.h)], ['two_sides', p.w + p.h], ['row_short', p.w * (p.h - 1)], ['row_short', (p.w - 1) * p.h]]);
      parts = [p.w, p.h];
    } else if (type === 'rect_area') {
      p.l = big ? randInt(r, 8, 25) : randInt(r, 3, 10); p.w = big ? randInt(r, 3, 12) : randInt(r, 2, 9);
      p.context = pickOne(r, ['garden', 'rug', 'poster', 'floor']);
      p.unit = unit = unitForContext(p.context, unit);
      p.answer = p.l * p.w;
      p.traps = trapList(p.answer, [['gave_perimeter', 2 * (p.l + p.w)], ['two_sides', p.l + p.w]]);
      parts = [p.l, p.w, unit, p.context];
    } else if (type === 'rect_perimeter') {
      p.l = big ? randInt(r, 10, 40) : randInt(r, 3, 12); p.w = big ? randInt(r, 4, 20) : randInt(r, 2, 9);
      p.context = pickOne(r, ['fence', 'ribbon', 'trim', 'border']); p.kind = 'length';
      p.unit = unit = unitForContext(p.context, unit);
      p.answer = 2 * (p.l + p.w);
      p.traps = trapList(p.answer, [['gave_area', p.l * p.w], ['half_perimeter', p.l + p.w], ['three_sides', 2 * p.l + p.w], ['three_sides', p.l + 2 * p.w]]);
      parts = [p.l, p.w, unit, p.context];
    } else if (type === 'same_perimeter') {
      var half = randInt(r, 6, 12);
      var a1 = randInt(r, 1, Math.floor(half / 2));
      var options = [];
      for (var c = 1; c <= Math.floor(half / 2); c += 1) if (c !== a1) options.push(c);
      var c1 = pickOne(r, options);
      p.a = a1; p.b = half - a1; p.c = c1; p.d = half - c1; p.P = 2 * half; p.unit = 'sq';
      p.answer = Math.abs(p.a * p.b - p.c * p.d);
      p.traps = trapList(p.answer, [['same_perimeter_same_area', 0], ['gave_one_area', p.a * p.b], ['gave_one_area', p.c * p.d], ['gave_perimeter', p.P]]);
      parts = [p.a, p.b, p.c, p.d];
    } else if (type === 'missing_side_perimeter') {
      p.l = big ? randInt(r, 8, 30) : randInt(r, 3, 9); p.w = big ? randInt(r, 3, 20) : randInt(r, 2, 8);
      p.P = 2 * (p.l + p.w); p.kind = 'length';
      p.answer = p.w;
      p.traps = trapList(p.answer, [['one_length_only', p.P - p.l], ['two_widths', p.P - 2 * p.l], ['half_only', p.P / 2], ['treated_as_square', p.P / 4]]);
      parts = [p.P, p.l, unit];
    } else if (type === 'missing_side_area') {
      p.w = randInt(r, 3, 9); p.l = randInt(r, 4, 12); p.A = p.l * p.w; p.kind = 'length';
      p.answer = p.l;
      p.traps = trapList(p.answer, [['halved_area', p.A / 2], ['subtracted_side', p.A - p.w], ['gave_perimeter', 2 * (p.l + p.w)]]);
      parts = [p.A, p.w, unit];
    } else if (type === 'square_side') {
      p.s = randInt(r, 3, 15); p.P = 4 * p.s; p.kind = 'length';
      p.answer = p.s;
      p.traps = trapList(p.answer, [['square_half', p.P / 2], ['subtracted_side', p.P - 4]]);
      parts = [p.P, unit];
    } else if (type === 'l_shape_area') {
      p.W = grade >= 6 ? randInt(r, 10, 20) : randInt(r, 6, 12);
      p.H = grade >= 6 ? randInt(r, 8, 16) : randInt(r, 5, 10);
      p.cw = randInt(r, 2, p.W - 3); p.ch = randInt(r, 2, p.H - 3); p.unit = 'sq';
      p.answer = p.W * p.H - p.cw * p.ch;
      p.traps = trapList(p.answer, [['added_cutout', p.W * p.H + p.cw * p.ch], ['forgot_cutout', p.W * p.H], ['gave_cutout', p.cw * p.ch], ['gave_perimeter', 2 * (p.W + p.H)]]);
      parts = [p.W, p.H, p.cw, p.ch];
    } else if (type === 'frac_area') {
      var fb = pickOne(r, [2, 3, 4, 5, 6, 8]); var fa = randInt(r, 1, fb - 1);
      var fd = pickOne(r, [2, 3, 4, 5, 6]); var fc = randInt(r, 1, fd - 1);
      var wholeSide = r() < 0.35;
      p.lq = wholeSide ? Q(randInt(r, 2, 6), 1) : Q(fa, fb);
      p.wq = Q(fc, fd);
      p.answerQ = qMul(p.lq, p.wq); p.answer = qVal(p.answerQ); p.fraction = true;
      p.traps = trapList(p.answer, [
        ['added_denominators', p.lq.d > 1 ? (p.lq.n * p.wq.n) / (p.lq.d + p.wq.d) : NaN],
        ['gave_perimeter', 2 * (qVal(p.lq) + qVal(p.wq))],
        ['two_sides', qVal(p.lq) + qVal(p.wq)]
      ]);
      parts = [qKey(p.lq), qKey(p.wq), unit];
    } else if (type === 'mixed_area') {
      var lw = randInt(r, 1, 4); var lfd = pickOne(r, [2, 3, 4]); var lfn = randInt(r, 1, lfd - 1);
      var both = r() < 0.5;
      var ww = randInt(r, 2, 6); var wfd = pickOne(r, [2, 3, 4]); var wfn = randInt(r, 1, wfd - 1);
      p.lWhole = lw; p.lFrac = Q(lfn, lfd); p.wWhole = ww; p.wFrac = both ? Q(wfn, wfd) : null;
      p.lq = qAdd(Q(lw, 1), p.lFrac);
      p.wq = both ? qAdd(Q(ww, 1), p.wFrac) : Q(ww, 1);
      p.answerQ = qMul(p.lq, p.wq); p.answer = qVal(p.answerQ); p.fraction = true;
      p.traps = trapList(p.answer, [
        both ? ['partial_mixed', lw * ww + qVal(p.lFrac) * qVal(p.wFrac)] : ['dropped_fraction', lw * ww],
        ['gave_perimeter', 2 * (qVal(p.lq) + qVal(p.wq))],
        ['two_sides', qVal(p.lq) + qVal(p.wq)]
      ]);
      parts = [qKey(p.lq), qKey(p.wq), unit];
    } else if (type === 'frac_perimeter') {
      var pb = pickOne(r, [2, 3, 4, 8]); var pa = randInt(r, 1, pb - 1);
      var pd = pickOne(r, [2, 3, 4]); var pc = randInt(r, 1, pd - 1);
      p.lq = qAdd(Q(randInt(r, 1, 6), 1), Q(pa, pb));
      p.wq = r() < 0.5 ? Q(pc, pd) : qAdd(Q(randInt(r, 1, 4), 1), Q(pc, pd));
      p.kind = 'length';
      p.answerQ = qMul(Q(2, 1), qAdd(p.lq, p.wq)); p.answer = qVal(p.answerQ); p.fraction = true;
      p.traps = trapList(p.answer, [['gave_area', qVal(qMul(p.lq, p.wq))], ['half_perimeter', qVal(qAdd(p.lq, p.wq))]]);
      parts = [qKey(p.lq), qKey(p.wq), unit];
    } else if (type === 'triangle_area') {
      var tri = pickOne(r, TRIPLES);
      var right = r() < 0.4;
      p.h = right ? randInt(r, 3, 12) : tri[0];
      p.off = right ? 0 : tri[1];
      p.s = right ? null : tri[2];
      p.right = right;
      p.b = randInt(r, Math.max(p.off + 2, 4), p.off + 12);
      if ((p.b * p.h) % 2) p.b += 1;
      p.answer = p.b * p.h / 2;
      p.traps = trapList(p.answer, [['triangle_no_half', p.b * p.h], ['used_slant', p.s ? p.b * p.s / 2 : NaN], ['two_sides', p.b + p.h]]);
      parts = [p.b, p.h, p.off, unit];
    } else if (type === 'parallelogram_area') {
      var tri2 = pickOne(r, TRIPLES);
      p.h = tri2[0]; p.off = tri2[1]; p.s = tri2[2];
      p.b = randInt(r, p.off + 2, p.off + 12);
      p.answer = p.b * p.h;
      p.traps = trapList(p.answer, [['used_slant', p.b * p.s], ['halved_parallelogram', p.b * p.h / 2], ['gave_perimeter', 2 * (p.b + p.s)]]);
      parts = [p.b, p.h, p.off, unit];
    } else if (type === 'trapezoid_area') {
      p.b1 = randInt(r, 3, 10); p.b2 = p.b1 + randInt(r, 2, 8); p.h = randInt(r, 2, 9);
      if (((p.b1 + p.b2) * p.h) % 2) p.h += 1;
      p.topOff = randInt(r, 0, p.b2 - p.b1);
      p.answer = (p.b1 + p.b2) * p.h / 2;
      p.traps = trapList(p.answer, [['trapezoid_no_half', (p.b1 + p.b2) * p.h], ['one_base', p.b2 * p.h], ['one_base', p.b1 * p.h]]);
      parts = [p.b1, p.b2, p.h, p.topOff, unit];
    }
    p.answerText = p.answerQ ? qText(p.answerQ) : numText(p.answer);
    // The signature is the numbers only: the same numbers with a new unit or
    // story are the same problem, so they cannot score twice.
    p.sig = 'g:' + type + ':' + parts.filter(function(part) { return typeof part === 'number' || /^\d+_\d+$/.test(part); }).join('-');
    return p;
  }

  // A worked example of the same kind with different numbers and a
  // different answer, so studying it never hands over the answer.
  function exampleFor(p) {
    var ex = generateProblem(p.grade, p.type, ((p.seed * 7) + 7919) >>> 0);
    for (var i = 1; i < 24 && (ex.sig === p.sig || valuesMatch(ex.answer, p.answer)); i += 1) ex = generateProblem(p.grade, p.type, ((p.seed * 7) + 7919 + i * 104729) >>> 0);
    return ex;
  }

  // 'correct', a named mistake id, or null.
  function diagnoseAnswer(problem, value) {
    if (!problem || !isFinite(value)) return null;
    if (valuesMatch(value, problem.answer)) return 'correct';
    var hit = (problem.traps || []).filter(function(trap) { return valuesMatch(value, trap.value); })[0];
    return hit ? hit.id : null;
  }

  // Compare a learner's area and perimeter predictions with the rectangle.
  function comparePrediction(width, height, areaGuess, perimeterGuess) {
    var m = rectangleMetrics(width, height);
    var areaOk = valuesMatch(areaGuess, m.area);
    var perimeterOk = valuesMatch(perimeterGuess, m.perimeter);
    var notes = [];
    if (!areaOk && !perimeterOk && valuesMatch(areaGuess, m.perimeter) && valuesMatch(perimeterGuess, m.area)) notes.push('swapped');
    else {
      if (!areaOk && valuesMatch(areaGuess, m.perimeter)) notes.push('area_was_perimeter');
      else if (!areaOk && valuesMatch(areaGuess, width + height)) notes.push('area_two_sides');
      if (!perimeterOk && valuesMatch(perimeterGuess, m.area)) notes.push('perimeter_was_area');
      else if (!perimeterOk && valuesMatch(perimeterGuess, width + height)) notes.push('perimeter_two_sides');
      else if (!perimeterOk && (valuesMatch(perimeterGuess, 2 * width + height) || valuesMatch(perimeterGuess, width + 2 * height))) notes.push('perimeter_three_sides');
    }
    return { area: m.area, perimeter: m.perimeter, areaOk: areaOk, perimeterOk: perimeterOk, areaOff: Math.abs(Number(areaGuess) - m.area), perimeterOff: Math.abs(Number(perimeterGuess) - m.perimeter), notes: notes };
  }

  // ════ Stage C: one teacher grade range for every activity ════
  // Grades 3-8. Challenges use the part of the range up to grade 6; the
  // stage-B activities offer the levels whose grade window meets the range.
  var RANGE_GRADES = [3, 4, 5, 6, 7, 8];
  function normalizeRange(range) {
    range = range && typeof range === 'object' ? range : {};
    var min = RANGE_GRADES.indexOf(Number(range.min)) >= 0 ? Number(range.min) : 3;
    var max = RANGE_GRADES.indexOf(Number(range.max)) >= 0 ? Number(range.max) : 8;
    if (min > max) { var swap = min; min = max; max = swap; }
    return { min: min, max: max };
  }
  function practiceRangeOf(range) {
    range = normalizeRange(range);
    return { min: Math.min(range.min, 6), max: Math.min(range.max, 6) };
  }
  function rangeGrade(grade) {
    grade = Math.round(Number(grade));
    return isFinite(grade) ? Math.max(3, Math.min(8, grade)) : 4;
  }
  // [lowest grade, highest grade] for levels 1, 2 and 3 of each activity.
  var LEVEL_GRADES = {
    unitLevel: [[3, 4], [5, 6], [7, 8]],
    circleLevel: [[3, 6], [7, 7], [8, 8]],
    blobLevel: [[3, 3], [4, 5], [6, 8]],
    missionLevel: [[3, 4], [5, 6], [7, 8]]
  };
  function levelForGrade(key, grade) {
    var windows = LEVEL_GRADES[key] || LEVEL_GRADES.unitLevel;
    var g = rangeGrade(grade);
    for (var i = 0; i < windows.length; i += 1) if (g >= windows[i][0] && g <= windows[i][1]) return i + 1;
    return 2;
  }
  function allowedLevels(key, range) {
    range = normalizeRange(range);
    var windows = LEVEL_GRADES[key] || LEVEL_GRADES.unitLevel;
    var out = [];
    windows.forEach(function(w, i) { if (w[0] <= range.max && w[1] >= range.min) out.push(i + 1); });
    return out.length ? out : [levelForGrade(key, range.min)];
  }
  // The learner's choice if the range allows it, else the level for their
  // grade, else the nearest allowed level.
  function pickLevel(key, wanted, hostGrade, range) {
    var allowed = allowedLevels(key, range);
    var w = Number(wanted);
    if (allowed.indexOf(w) >= 0) return w;
    var d = levelForGrade(key, hostGrade);
    if (allowed.indexOf(d) >= 0) return d;
    return allowed.reduce(function(best, lv) { return Math.abs(lv - d) < Math.abs(best - d) ? lv : best; }, allowed[0]);
  }

  // ── grade bands: a short "Start here" path and the tab order ──
  function bandForGrade(grade) {
    var g = rangeGrade(grade);
    return g <= 3 ? 'g3' : (g <= 5 ? 'g45' : 'g67');
  }
  var BAND_CORE = {
    g3: ['explore', 'fence', 'investigate', 'challenge'],
    g45: ['challenge', 'composite', 'units'],
    g67: ['challenge', 'circles', 'irregular', 'missions']
  };
  function tabOrderFor(band) {
    var core = BAND_CORE[band] || BAND_CORE.g45;
    return core.concat(AREA_MODE_IDS.filter(function(id) { return core.indexOf(id) < 0; }));
  }
  var PATH_TYPES = {
    practice3: ['tile_area', 'rect_area', 'rect_perimeter', 'same_perimeter', 'missing_side_perimeter'],
    formulas: ['rect_area', 'rect_perimeter', 'missing_side_area', 'missing_side_perimeter', 'square_side'],
    fractions: ['frac_area', 'mixed_area', 'frac_perimeter'],
    shapes6: ['triangle_area', 'parallelogram_area', 'trapezoid_area']
  };
  var BAND_PATHS = {
    g3: [{ id: 'tile', mode: 'explore' }, { id: 'fence', mode: 'fence' }, { id: 'same_area', mode: 'investigate' }, { id: 'practice3', mode: 'challenge', grade: 3 }],
    g45: [{ id: 'formulas', mode: 'challenge', grade: 4 }, { id: 'composite', mode: 'composite' }, { id: 'fractions', mode: 'challenge', grade: 5 }, { id: 'units', mode: 'units' }],
    g67: [{ id: 'shapes6', mode: 'challenge', grade: 6 }, { id: 'circles', mode: 'circles' }, { id: 'circle_drill', mode: 'circles' }, { id: 'irregular', mode: 'irregular' }, { id: 'missions', mode: 'missions' }]
  };
  function truthyCount(map, prefix) {
    map = map && typeof map === 'object' && !Array.isArray(map) ? map : {};
    return Object.keys(map).filter(function(key) { return !!map[key] && (!prefix || key.indexOf(prefix) === 0); }).length;
  }
  // Progress for one step, from the progress keys the tool already keeps.
  function pathStepProgress(id, s) {
    s = s && typeof s === 'object' ? s : {};
    var have = 0, need = 1;
    if (id === 'tile') { need = 20; have = Math.max(0, Number(s.revealedBest) || 0); }
    else if (id === 'fence') have = truthyCount(s.fenceChecked) + truthyCount(s.fenceAwarded) > 0 ? 1 : 0;
    else if (id === 'same_area') { need = 3; have = countAllowed(s.targetsExplored, AREA_TARGET_IDS); }
    else if (id === 'composite') { need = 2; have = countAllowed(s.compositeMethods, AREA_METHOD_IDS); }
    else if (PATH_TYPES[id]) {
      need = id === 'fractions' ? 2 : 3;
      have = PATH_TYPES[id].reduce(function(sum, type) { return sum + typeSolvedCount(s.solvedChallenges, type); }, 0);
    }
    else if (id === 'units') { need = 2; have = truthyCount(s.drillSolved, 'u:'); }
    else if (id === 'circle_drill') { need = 2; have = truthyCount(s.drillSolved, 'c:'); }
    else if (id === 'circles') {
      var awarded = s.circleAwarded && typeof s.circleAwarded === 'object' && s.circleAwarded.claim;
      have = awarded || (truthyCount(s.circleRecords) >= 3 && !!s.circleFirstClaim) ? 1 : 0;
    }
    else if (id === 'irregular') have = truthyCount(s.blobSolved) > 0 ? 1 : 0;
    else if (id === 'missions') have = truthyCount(s.missionSolved) > 0 ? 1 : 0;
    have = Math.min(have, need);
    return { have: have, need: need, done: have >= need };
  }

  // ════ Stage B models: square units, circles, irregular shapes, missions, sound ════
  function round6(x) { return Math.round(Number(x) * 1e6) / 1e6; }
  function round1(x) { return Math.round(Number(x) * 10) / 10; }
  function levelFor(value, fallback) {
    value = Math.round(Number(value));
    return value >= 1 && value <= 3 ? value : (fallback >= 1 && fallback <= 3 ? fallback : 2);
  }
  function seedOf(seed) { return (Number(seed) >>> 0) || 1; }

  // Conversion answers are often large, so "10,000" and "10 000" are read as
  // whole numbers here (a lone "1,5" is still a decimal comma).
  function parseBigAnswer(input) {
    var text = String(input == null ? '' : input).trim().replace(/\s+/g, ' ');
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) return Number(text.replace(/,/g, ''));
    if (/^\d{1,3}( \d{3})+(\.\d+)?$/.test(text)) return Number(text.replace(/ /g, ''));
    return parseAnswer(text);
  }

  // ── square units ──
  // One big unit is `linear` small units long, so one big SQUARE unit is
  // linear × linear small square units. Using `linear` alone is the classic slip.
  // A hectare is itself an area (a square 100 m on a side) and an acre is
  // 43,560 ft² exactly (for example a strip 660 ft by 66 ft), so those two
  // "big" units are named areas with no length factor of their own.
  var AREA_UNIT_PAIRS = {
    yd_ft: { big: 'yd', small: 'ft', linear: 3, factor: 9 },
    ft_in: { big: 'ft', small: 'in', linear: 12, factor: 144 },
    m_cm: { big: 'm', small: 'cm', linear: 100, factor: 10000 },
    cm_mm: { big: 'cm', small: 'mm', linear: 10, factor: 100 },
    ha_m: { big: 'ha', small: 'm', linear: 100, factor: 10000, named: true },
    acre_ft: { big: 'acre', small: 'ft', linear: null, factor: 43560, named: true, sides: [660, 66] }
  };
  var UNIT_PAIR_IDS = ['yd_ft', 'ft_in', 'm_cm', 'cm_mm', 'ha_m', 'acre_ft'];
  var UNIT_PAIRS_BY_LEVEL = {
    1: ['yd_ft', 'ft_in', 'cm_mm'],
    2: ['yd_ft', 'ft_in', 'm_cm', 'cm_mm', 'ha_m'],
    3: UNIT_PAIR_IDS
  };
  var CUSTOMARY_PAIRS = ['yd_ft', 'ft_in', 'acre_ft'];

  function generateConversion(level, seed) {
    level = levelFor(level);
    seed = seedOf(seed);
    var r = makeRng((seed ^ 0x2545f491) >>> 0);
    var pairId = pickOne(r, UNIT_PAIRS_BY_LEVEL[level]);
    var pair = AREA_UNIT_PAIRS[pairId];
    var factor = pair.factor;
    var dir = level === 1 ? 'down' : (r() < 0.5 ? 'down' : 'up');
    var big;
    if (level === 3) big = pairId === 'm_cm' || pairId === 'ha_m' ? randInt(r, 5, 400) / 100 : randInt(r, 2, 12) + (r() < 0.6 ? 0.5 : 0);
    else big = randInt(r, 2, pairId === 'yd_ft' ? 20 : (pairId === 'ft_in' || pairId === 'cm_mm' ? 12 : 15));
    big = round6(big);
    var p = { kind: 'unit', level: level, seed: seed, pair: pairId, big: pair.big, small: pair.small, linear: pair.linear, factor: factor, dir: dir, named: !!pair.named };
    if (dir === 'down') { p.from = pair.big; p.to = pair.small; p.value = big; p.answer = round6(big * factor); }
    else { p.from = pair.small; p.to = pair.big; p.value = round6(big * factor); p.answer = big; }
    var traps = [];
    if (pair.linear) traps.push(['linear_factor', dir === 'down' ? p.value * pair.linear : p.value / pair.linear]);
    if (pair.sides) traps.push(['two_sides', dir === 'down' ? p.value * (pair.sides[0] + pair.sides[1]) : p.value / (pair.sides[0] + pair.sides[1])]);
    traps.push(['wrong_direction', dir === 'down' ? p.value / factor : p.value * factor]);
    if (CUSTOMARY_PAIRS.indexOf(pairId) >= 0) traps.push(['metric_factor', dir === 'down' ? p.value * 100 : p.value / 100]);
    p.traps = trapList(p.answer, traps);
    p.answerText = numText(p.answer);
    p.sig = 'u:' + pairId + ':' + dir + ':' + String(Math.round(p.value * 100));
    return p;
  }

  function diagnoseConversion(p, value) {
    if (!p || !isFinite(value)) return null;
    if (valuesMatch(value, p.answer)) return 'correct';
    var hit = p.traps.filter(function(trap) { return valuesMatch(value, trap.value); })[0];
    return hit ? hit.id : null;
  }

  // ── circles (7.G.4) ──
  var CIRCLE_TYPES = {
    1: ['circ_from_d', 'circ_from_r'],
    2: ['circ_from_d', 'circ_from_r', 'area_from_r'],
    3: ['circ_from_r', 'area_from_r', 'area_from_d', 'r_from_circ']
  };
  // Answers are k·π ({ k }) or a plain value ({ v }). r >= 3 keeps 2πr and πr²
  // apart (they are equal when r = 2).
  function generateCircle(level, seed, type) {
    level = levelFor(level);
    seed = seedOf(seed);
    var r = makeRng((seed ^ 0x68e31da4) >>> 0);
    var types = CIRCLE_TYPES[level];
    if (types.indexOf(type) < 0) type = pickOne(r, types);
    var rad = randInt(r, 3, level === 1 ? 10 : 15);
    var p = { kind: 'circle', level: level, seed: seed, type: type, unit: pickOne(r, ['cm', 'm', 'in', 'ft']), r: rad, d: 2 * rad, measure: 'length' };
    var traps = [];
    if (type === 'circ_from_d') {
      p.answerCand = { k: p.d };
      traps = [['diameter_as_radius', { k: 2 * p.d }], ['circ_gave_area', { k: rad * rad }], ['forgot_pi_circ', { v: p.d }]];
    } else if (type === 'circ_from_r') {
      p.answerCand = { k: p.d };
      traps = [['radius_as_diameter', { k: rad }], ['circ_gave_area', { k: rad * rad }], ['forgot_pi_circ', { v: p.d }]];
    } else if (type === 'area_from_r') {
      p.measure = 'area';
      p.answerCand = { k: rad * rad };
      traps = [['area_2pir', { k: 2 * rad }], ['squared_diameter', { k: p.d * p.d }], ['area_pi_r', { k: rad }], ['forgot_pi_area', { v: rad * rad }]];
    } else if (type === 'area_from_d') {
      p.measure = 'area';
      p.answerCand = { k: rad * rad };
      traps = [['squared_diameter', { k: p.d * p.d }], ['area_2pir', { k: p.d }], ['area_pi_r', { k: rad }], ['forgot_pi_area', { v: rad * rad }]];
    } else {
      p.C = Math.round(2 * 3.14 * rad * 100) / 100;
      p.answerCand = { v: rad };
      traps = [['gave_diameter', { v: p.d }], ['divided_by_two_only', { v: round6(p.C / 2) }]];
    }
    p.answer = p.answerCand.k != null ? p.answerCand.k * Math.PI : p.answerCand.v;
    p.traps = traps.map(function(item) { return { id: item[0], cand: item[1] }; });
    p.answerText = p.answerCand.k != null ? p.answerCand.k + 'π ≈ ' + numText(round1(p.answer)) : numText(p.answer);
    p.sig = 'c:' + type + ':' + rad;
    return p;
  }

  // "16π", "16 pi", "16*pi" are exact multiples of π; anything else is a number.
  function parseCircleAnswer(input) {
    var text = String(input == null ? '' : input).trim().toLowerCase().replace(/\s+/g, ' ');
    var m = text.match(/^(.*?)\s*(π|pi)$/);
    if (m) {
      var coeffText = m[1].replace(/\s*[×x*]\s*$/, '').trim();
      var c = coeffText === '' ? 1 : parseAnswer(coeffText);
      return { value: isFinite(c) ? c * Math.PI : NaN, piK: isFinite(c) ? c : NaN };
    }
    return { value: parseBigAnswer(text), piK: null };
  }

  // A decimal answer matches k·π when it is within rounding-to-tenths of k × π,
  // k × 3.14 or k × 22/7.
  function circleValueMatches(input, cand) {
    if (!input || !cand) return false;
    if (input.piK != null) {
      if (!isFinite(input.piK)) return false;
      if (cand.k != null) return Math.abs(input.piK - cand.k) < 1e-6;
      return Math.abs(input.piK * Math.PI - cand.v) <= 0.051;
    }
    var x = Number(input.value);
    if (!isFinite(x)) return false;
    if (cand.k != null) return [Math.PI, 3.14, 22 / 7].some(function(pi) { return Math.abs(x - cand.k * pi) <= 0.051; });
    return Math.abs(x - cand.v) <= 0.051;
  }

  // 'correct', a named mistake, 'precision' (right idea, rounded too far) or null.
  function diagnoseCircle(p, input) {
    if (!p || !input || !isFinite(input.value)) return null;
    if (circleValueMatches(input, p.answerCand)) return 'correct';
    var hit = p.traps.filter(function(trap) { return circleValueMatches(input, trap.cand); })[0];
    if (hit) return hit.id;
    if (input.piK == null && Math.abs(Number(input.value) - p.answer) <= Math.max(0.6, 0.01 * p.answer)) return 'precision';
    return null;
  }

  // Objects to roll: the track is measured to the nearest tenth, as with a ruler.
  var CIRCLE_OBJECTS = [{ id: 'coin', d: 3 }, { id: 'lid', d: 7 }, { id: 'cup', d: 9 }, { id: 'plate', d: 22 }, { id: 'wheel', d: 60 }];
  function circleMeasurement(d) {
    d = Number(d);
    var c = Math.round(Math.PI * d * 10) / 10;
    return { d: d, c: c, ratio: c / d };
  }
  // `reading` is the track length the learner read off the ruler; without it
  // the true track length is used.
  function checkRatio(d, input, reading) {
    var x = parseAnswer(input);
    if (!isFinite(x)) return null;
    var m = circleMeasurement(d);
    if (isFinite(Number(reading)) && Number(reading) > 0) m = { d: Number(d), c: Number(reading), ratio: Number(reading) / Number(d) };
    if (Math.abs(x - m.ratio) <= 0.011) return 'correct';
    if (Math.abs(x - d / m.c) <= 0.011) return 'ratio_upside_down';
    if (Math.abs(x - m.c / (d / 2)) <= 0.021) return 'ratio_used_radius';
    if (Math.abs(x - (m.c - d)) <= 0.051) return 'ratio_subtracted';
    return 'ratio_other';
  }

  // The ruler under each rolled circle: numbered marks every `major` cm and
  // small marks every `minor` cm. A reading counts when it is within one small
  // mark of the true track length, as with a real ruler.
  var RULER_SPECS = { coin: [1, 0.1], lid: [5, 0.2], cup: [5, 0.5], plate: [10, 1], wheel: [20, 2] };
  function rulerFor(objId) {
    var obj = CIRCLE_OBJECTS.filter(function(o) { return o.id === objId; })[0] || CIRCLE_OBJECTS[0];
    var spec = RULER_SPECS[obj.id];
    var C = Math.PI * obj.d;
    var scale = Math.min(520 / (C + obj.d), 110 / obj.d);
    var x0 = 40 + obj.d * scale / 2;
    var steps = Math.floor(((620 - x0) / scale) / spec[1] + 1e-9);
    return { id: obj.id, d: obj.d, c: C, major: spec[0], minor: spec[1], tol: spec[1] + 1e-9, scale: scale, x0: x0, max: round6(steps * spec[1]), steps: steps };
  }
  function snapReading(ruler, value) {
    var v = Number(value);
    if (!isFinite(v)) v = 0;
    var k = Math.round(v / ruler.minor);
    return round6(Math.max(0, Math.min(ruler.steps, k)) * ruler.minor);
  }
  // 'correct', 'read_diameter', 'read_major_slip', 'read_close_short',
  // 'read_close_long', 'read_short', 'read_long', or null when unreadable.
  function checkReading(objId, input) {
    var x = typeof input === 'number' ? input : parseAnswer(input);
    if (!isFinite(x)) return null;
    var ruler = rulerFor(objId);
    var diff = x - ruler.c;
    if (Math.abs(diff) <= ruler.tol) return 'correct';
    if (Math.abs(x - ruler.d) <= ruler.tol) return 'read_diameter';
    if (Math.abs(Math.abs(diff) - ruler.major) <= ruler.tol) return 'read_major_slip';
    if (Math.abs(diff) <= 4 * ruler.minor + 1e-9) return diff < 0 ? 'read_close_short' : 'read_close_long';
    return diff < 0 ? 'read_short' : 'read_long';
  }
  // Where the marker sits compared with the end of the track.
  function markerPlace(ruler, value) {
    var v = Number(value);
    if (Math.abs(v - ruler.c) <= ruler.minor / 2 + 1e-9) return 'end';
    return v < ruler.c ? 'on' : 'past';
  }

  // Cut a circle into n equal sectors and lay them alternately point-up and
  // point-down. The bumpy bottom is n/2 arcs = half the circumference (πr) and
  // the seams stand r·cos(π/n) tall, which tends to r as n grows.
  var SECTOR_COUNTS = [4, 6, 8, 12, 16, 24, 36];
  function sectorModel(n, radius) {
    n = SECTOR_COUNTS.indexOf(Number(n)) >= 0 ? Number(n) : 8;
    radius = Number(radius) > 0 ? Number(radius) : 1;
    var half = Math.PI / n;
    return {
      n: n, r: radius, arcEach: 2 * Math.PI * radius / n, base: Math.PI * radius,
      height: radius * Math.cos(half), bump: radius * (1 - Math.cos(half)), area: Math.PI * radius * radius
    };
  }

  // ── irregular shapes on a grid ──
  // A smooth star-shaped blob r(θ) = R(1 + Σ a·sin(kθ + p)), stretched by sx.
  // Its exact area is π·R²·sx·(1 + Σ a²/2) (cross terms integrate to zero).
  var BLOB_GRIDS = { 1: [8, 6], 2: [10, 8], 3: [12, 9] };
  var BLOB_FULL = 0.97;
  var BLOB_TOUCH = 0.03;
  var blobCache = {};
  var blobCacheSize = 0;
  function generateBlob(level, seed) {
    level = levelFor(level);
    seed = seedOf(seed);
    var cacheKey = level + ':' + seed;
    if (blobCache[cacheKey]) return blobCache[cacheKey];
    var r = makeRng((seed ^ 0x1b873593) >>> 0);
    var cols = BLOB_GRIDS[level][0], rows = BLOB_GRIDS[level][1];
    var R = Math.min(cols, rows) * 0.33;
    var sx = Math.sqrt(cols / rows) * (0.9 + r() * 0.15);
    var cx = cols / 2 + (r() - 0.5) * 0.4, cy = rows / 2 + (r() - 0.5) * 0.4;
    var harmonics = [
      { k: 2, a: 0.05 + r() * 0.13, p: r() * 2 * Math.PI },
      { k: 3, a: 0.03 + r() * 0.09, p: r() * 2 * Math.PI }
    ];
    if (level >= 2) harmonics.push({ k: 5, a: r() * 0.05, p: r() * 2 * Math.PI });
    function radiusAt(theta) {
      var s = 1;
      for (var i = 0; i < harmonics.length; i += 1) s += harmonics[i].a * Math.sin(harmonics[i].k * theta + harmonics[i].p);
      return R * s;
    }
    function inside(x, y) {
      var dx = (x - cx) / sx, dy = y - cy;
      return Math.sqrt(dx * dx + dy * dy) < radiusAt(Math.atan2(dy, dx));
    }
    var sumSq = harmonics.reduce(function(sum, item) { return sum + item.a * item.a; }, 0);
    var exact = Math.PI * R * R * sx * (1 + sumSq / 2);
    var SAMPLES = 16;
    var cells = [];
    var full = 0, part = 0;
    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var hits = 0;
        for (var i = 0; i < SAMPLES; i += 1) for (var j = 0; j < SAMPLES; j += 1) {
          if (inside(col + (i + 0.5) / SAMPLES, row + (j + 0.5) / SAMPLES)) hits += 1;
        }
        var cover = hits / (SAMPLES * SAMPLES);
        if (cover >= BLOB_FULL) full += 1; else if (cover >= BLOB_TOUCH) part += 1;
        cells.push({ key: col + '-' + row, c: col, r: row, cover: cover });
      }
    }
    var outline = [];
    for (var k = 0; k < 120; k += 1) {
      var th = k / 120 * 2 * Math.PI;
      var rr = radiusAt(th);
      outline.push([round6(cx + sx * rr * Math.cos(th)), round6(cy + rr * Math.sin(th))]);
    }
    var blob = Object.freeze({
      level: level, seed: seed, cols: cols, rows: rows, cells: cells, outline: outline,
      exact: exact, exactText: numText(round1(exact)), modelFull: full, modelPart: part, modelEstimate: full + part / 2,
      sig: 'b:' + level + ':' + seed
    });
    if (blobCacheSize > 40) { blobCache = {}; blobCacheSize = 0; }
    blobCache[cacheKey] = blob;
    blobCacheSize += 1;
    return blob;
  }

  function blobMarkCounts(blob, marks) {
    marks = marks && typeof marks === 'object' ? marks : {};
    var full = 0, half = 0;
    blob.cells.forEach(function(cell) {
      if (marks[cell.key] === 'full') full += 1;
      else if (marks[cell.key] === 'half') half += 1;
    });
    return { full: full, half: half, estimate: full + half / 2 };
  }

  // Checks the learner's own arithmetic first; only a sound estimate is then
  // compared with the exact area and with how the squares were marked.
  function assessBlob(blob, marks, typed) {
    marks = marks && typeof marks === 'object' ? marks : {};
    var own = blobMarkCounts(blob, marks);
    var res = { own: own, exact: blob.exact, arithmetic: 'ok', notes: [] };
    if (!isFinite(typed)) { res.arithmetic = 'empty'; return res; }
    if (!valuesMatch(typed, own.estimate)) {
      if (own.half > 0 && valuesMatch(typed, own.full + own.half)) res.arithmetic = 'halves_not_halved';
      else if (own.half > 0 && valuesMatch(typed, own.full)) res.arithmetic = 'full_only';
      else res.arithmetic = 'arith_slip';
      return res;
    }
    var partAsFull = 0, outside = 0, missedFull = 0, missedPart = 0, bigParts = 0;
    blob.cells.forEach(function(cell) {
      var m = marks[cell.key];
      if (m === 'full' && cell.cover >= BLOB_TOUCH && cell.cover < 0.9) partAsFull += 1;
      if ((m === 'full' || m === 'half') && cell.cover < BLOB_TOUCH) outside += 1;
      if (cell.cover >= BLOB_FULL && m !== 'full') missedFull += 1;
      if (cell.cover >= 0.2 && cell.cover < BLOB_FULL) { bigParts += 1; if (!m) missedPart += 1; }
    });
    if (partAsFull >= 2) res.notes.push('partial_as_full');
    if (outside >= 1) res.notes.push('counted_outside');
    if (missedFull >= 2) res.notes.push('missed_full');
    if (missedPart >= 2 && missedPart >= bigParts * 0.25) res.notes.push('skipped_partials');
    res.diff = own.estimate - blob.exact;
    res.pct = res.diff / blob.exact * 100;
    res.close = Math.abs(res.pct) <= 10;
    // On a small grid even a careful count can miss by more than 10%. Sound
    // marking within one square of the careful count is as close as the
    // method gets, so it counts too.
    res.byMethod = !res.close && !res.notes.length && Math.abs(own.estimate - blob.modelEstimate) <= 1;
    if (res.byMethod) res.close = true;
    return res;
  }

  // ── design missions ──
  // Garden: use exactly `fence` m of fence; fence and soil cost money; stay in
  // budget and hold the most area. The budget sometimes rules out the square.
  function generateGardenMission(level, seed) {
    level = levelFor(level);
    seed = seedOf(seed);
    var r = makeRng((seed ^ 0x7f4a7c15) >>> 0);
    var fence = 2 * randInt(r, level === 1 ? 6 : 8, level === 1 ? 12 : (level === 2 ? 16 : 20));
    var half = fence / 2;
    var fenceCost = level === 1 ? 2 : randInt(r, 2, 6);
    var soilCost = level === 1 ? 1 : randInt(r, 2, 5);
    var options = [];
    for (var w = 1; w <= Math.floor(half / 2); w += 1) options.push({ w: w, l: half - w, area: w * (half - w) });
    var top = options.length - 1;
    var bestIdx = level === 1 || top < 2 || r() < 0.5 ? top : randInt(r, Math.max(0, top - 2), top - 1);
    var best = options[bestIdx];
    var nextArea = bestIdx < top ? options[bestIdx + 1].area : best.area + 6;
    var maxArea = best.area + randInt(r, 0, Math.max(0, nextArea - best.area - 1));
    var budget = fence * fenceCost + maxArea * soilCost;
    return {
      kind: 'garden', level: level, seed: seed, fence: fence, half: half, fenceCost: fenceCost, soilCost: soilCost,
      budget: budget, maxArea: maxArea, best: { l: best.l, w: best.w, area: best.area }, budgetBinds: bestIdx < top,
      sig: 'mg:' + [fence, fenceCost, soilCost, budget].join('-')
    };
  }

  function gardenCost(m, L, W) { return 2 * (L + W) * m.fenceCost + L * W * m.soilCost; }

  function numberItem(id, typed, expected, traps, follow) {
    if (!isFinite(typed)) return { id: id, status: 'empty' };
    if (valuesMatch(typed, expected)) return { id: id, status: 'ok' };
    if (follow != null && isFinite(follow) && valuesMatch(typed, follow)) return { id: id, status: 'follow' };
    var hit = (traps || []).filter(function(trap) { return isFinite(trap[1]) && !valuesMatch(trap[1], expected) && valuesMatch(typed, trap[1]); })[0];
    return { id: id, status: 'wrong', mistake: hit ? hit[0] : 'arith_slip' };
  }

  // inputs: { perimeter, area, cost } as numbers. Calculations are judged on the
  // learner's own design; the constraints on the true values.
  function assessGarden(m, L, W, inputs) {
    L = clampInteger(L, 1, 200); W = clampInteger(W, 1, 200);
    inputs = inputs || {};
    var P = 2 * (L + W), A = L * W, C = gardenCost(m, L, W);
    var items = [
      numberItem('perimeter', inputs.perimeter, P, [['gave_area', A], ['half_perimeter', L + W], ['three_sides', 2 * L + W], ['three_sides', L + 2 * W]]),
      numberItem('area', inputs.area, A, [['gave_perimeter', P], ['two_sides', L + W]]),
      numberItem('cost', inputs.cost, C, [['cost_fence_only', P * m.fenceCost], ['cost_soil_only', A * m.soilCost], ['cost_swapped_rates', P * m.soilCost + A * m.fenceCost]],
        isFinite(inputs.perimeter) && isFinite(inputs.area) ? inputs.perimeter * m.fenceCost + inputs.area * m.soilCost : null)
    ];
    items.push(P === m.fence ? { id: 'fence', status: 'ok' } : { id: 'fence', status: 'wrong', mistake: P < m.fence ? 'fence_short' : 'fence_over' });
    items.push(C <= m.budget ? { id: 'budget', status: 'ok' } : { id: 'budget', status: 'wrong', mistake: 'over_budget' });
    if (P === m.fence && C <= m.budget) items.push(A === m.best.area ? { id: 'best', status: 'ok' } : { id: 'best', status: 'wrong', mistake: m.budgetBinds ? 'not_max_affordable' : 'not_max_area' });
    else items.push({ id: 'best', status: 'pending' });
    return { P: P, A: A, C: C, items: items, solved: items.every(function(item) { return item.status === 'ok'; }) };
  }

  // Floor plan: a room (an L-shape from level 2) floored with whole boxes, or at
  // level 3 carpet sold by the whole square yard.
  function generateFloorMission(level, seed) {
    level = levelFor(level);
    seed = seedOf(seed);
    var r = makeRng((seed ^ 0x3c6ef372) >>> 0);
    var W = randInt(r, 10, level === 1 ? 16 : 22), H = randInt(r, 8, level === 1 ? 14 : 18);
    var cw = 0, ch = 0;
    if (level >= 2) { cw = randInt(r, 3, Math.floor(W / 2)); ch = randInt(r, 3, Math.floor(H / 2)); }
    var mode = level === 3 ? 'yard' : 'box';
    var per = mode === 'box' ? pickOne(r, [10, 15, 20, 24]) : 9;
    var area = W * H - cw * ch;
    for (var guard = 0; guard < 30 && area % per === 0; guard += 1) { if (guard % 2) H += 1; else W += 1; area = W * H - cw * ch; }
    var m = { kind: 'floor', level: level, seed: seed, W: W, H: H, cw: cw, ch: ch, area: area, perimeter: 2 * (W + H), mode: mode, per: per };
    m.price = mode === 'box' ? randInt(r, 18, 45) : randInt(r, 12, 30);
    m.count = Math.ceil(area / per);
    m.cost = m.count * m.price;
    m.sig = 'mf:' + [W, H, cw, ch, per, m.price].join('-');
    return m;
  }

  // inputs: { area, count, cost } as numbers.
  function assessFloor(m, inputs) {
    inputs = inputs || {};
    var areaTraps = [['gave_perimeter', m.perimeter]];
    if (m.cw) { areaTraps.push(['forgot_cutout', m.W * m.H]); areaTraps.push(['added_cutout', m.W * m.H + m.cw * m.ch]); }
    var countTraps = [['rounded_down', Math.floor(m.area / m.per)], ['not_whole', m.area / m.per]];
    if (m.mode === 'yard') {
      countTraps.push(['linear_factor', Math.ceil(m.area / 3)]);
      countTraps.push(['linear_factor', m.area / 3]);
      countTraps.push(['wrong_direction', m.area * 9]);
    }
    var typedArea = inputs.area;
    var followCount = isFinite(typedArea) && typedArea > 0 && !valuesMatch(typedArea, m.area) ? Math.ceil(typedArea / m.per - 1e-9) : null;
    var followCost = isFinite(inputs.count) && !valuesMatch(inputs.count, m.count) ? inputs.count * m.price : null;
    var items = [
      numberItem('area', typedArea, m.area, areaTraps),
      numberItem('count', inputs.count, m.count, countTraps, followCount),
      numberItem('cost', inputs.cost, m.cost, [['cost_per_sqft', m.area * m.price]], followCost)
    ];
    return { items: items, solved: items.every(function(item) { return item.status === 'ok'; }) };
  }

  // ── perimeter as sound ──
  // One tone per edge, in order around the shape. Each unit of length raises
  // the pitch one semitone (A3 = 220 Hz is length 0), and longer edges also
  // sound longer, so equal sides sound the same.
  function perimeterTonePlan(edges) {
    var list = (Array.isArray(edges) ? edges : []).map(Number).filter(function(e) { return isFinite(e) && e > 0; });
    var at = 0;
    var tones = list.map(function(len, index) {
      var dur = Math.min(1.2, 0.25 + 0.06 * len);
      var tone = Object.freeze({ index: index, len: len, start: round6(at), dur: round6(dur), freq: round6(220 * Math.pow(2, Math.min(len, 36) / 12)) });
      at += dur + 0.12;
      return tone;
    });
    return Object.freeze({ tones: Object.freeze(tones), duration: round6(Math.max(0, at - 0.12)), total: round6(list.reduce(function(a, b) { return a + b; }, 0)) });
  }

  var apAudio = { ctx: null, handle: null };
  function apAudioCtx() {
    var SL = global.StemLab;
    try { if (SL && typeof SL.audioContext === 'function') { var shared = SL.audioContext(); if (shared) return shared; } } catch (e) {}
    if (apAudio.ctx && apAudio.ctx.state !== 'closed') {
      if (apAudio.ctx.state === 'suspended' && apAudio.ctx.resume) { try { apAudio.ctx.resume(); } catch (e2) {} }
      return apAudio.ctx;
    }
    var Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try { apAudio.ctx = new Ctor(); } catch (e3) { apAudio.ctx = null; }
    return apAudio.ctx;
  }
  function stopTones() {
    var handle = apAudio.handle;
    apAudio.handle = null;
    if (handle) { try { handle.stop(); } catch (e) {} }
  }
  // Call only from a click or key press. Returns a handle, or null when sound
  // is muted or unavailable.
  function playTonePlan(plan) {
    stopTones();
    if (!plan || !plan.tones || !plan.tones.length || global._alloGlobalMute) return null;
    try { if (typeof global.__alloIsGlobalMuted === 'function' && global.__alloIsGlobalMuted()) return null; } catch (e) {}
    var ac = apAudioCtx();
    if (!ac || typeof ac.createOscillator !== 'function' || typeof ac.createGain !== 'function') return null;
    var nodes = [];
    function silence() {
      nodes.forEach(function(node) {
        try { node.o.stop(); } catch (e) {}
        try { node.o.disconnect(); node.g.disconnect(); } catch (e2) {}
      });
    }
    try {
      var t0 = (Number(ac.currentTime) || 0) + 0.05;
      plan.tones.forEach(function(tone) {
        var o = ac.createOscillator(), g = ac.createGain();
        var start = t0 + tone.start, end = start + tone.dur;
        o.type = 'triangle';
        o.frequency.setValueAtTime(tone.freq, start);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
        g.gain.setValueAtTime(0.12, Math.max(start + 0.03, end - 0.05));
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g); g.connect(ac.destination);
        o.start(start); o.stop(end + 0.05);
        nodes.push({ o: o, g: g });
      });
    } catch (e) { silence(); return null; }
    var handle = { stop: silence, plan: plan };
    apAudio.handle = handle;
    return handle;
  }

  function reducedMotionNow() {
    try { return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  // A memoised group of grid cells: it rebuilds only when `sig` (everything
  // the cells show) changes, so typing elsewhere does not redraw hundreds of
  // cells. Cell events go through `apGridHandlers`, which every render
  // refreshes, so a skipped rebuild never keeps a stale handler.
  var apMemo = { React: null, Grid: null };
  var apGridHandlers = { tile: null, tileFocus: null };
  function memoGrid(R) {
    if (!R || typeof R.memo !== 'function') return null;
    if (apMemo.React !== R) { apMemo.React = R; apMemo.Grid = R.memo(function ApGrid(props) { return props.build(); }, function(a, b) { return a.sig === b.sig; }); }
    return apMemo.Grid;
  }

  // Stops any perimeter sound when the tool unmounts.
  function ApLifecycle(props) {
    var R = props && props.React;
    if (R && typeof R.useEffect === 'function') R.useEffect(function() { return function() { stopTones(); apPaint.active = false; apResize.active = false; apWalk.active = false; }; }, []);
    return null;
  }

  // ── Tile Explorer pointer model: paint, resize, walk the fence ──
  // Drawing space is the explore SVG's 640 x 390 viewBox.
  // Mid-drag the corner may pass the count line: at the 46 cap only 5 rows fit
  // at rest, so a tighter limit stops a narrow rectangle from ever growing.
  var EXPLORE_VB = { w: 640, h: 390, right: 630, bottom: 386, maxW: 20, maxH: 16 };
  var apPaint = { active: false, mode: 'paint', touched: null, suppressUntil: 0 };
  var apResize = { active: false, layout: null };
  var apWalk = { active: false };
  function tileLayout(width, height) {
    var cell = Math.min(450 / width, 270 / height, 46);
    return { cell: cell, originX: (640 - cell * width) / 2, originY: 62 + (270 - cell * height) / 2 };
  }
  // Client pixels to viewBox units for an SVG drawn with "meet" scaling
  // (max-height can letterbox it, centred).
  function svgPointFromBox(box, clientX, clientY, vbW, vbH) {
    if (!box || !(box.width > 0)) return null;
    var k = box.height > 0 ? Math.min(box.width / vbW, box.height / vbH) : box.width / vbW;
    if (!(k > 0)) return null;
    return {
      x: (Number(clientX) - box.left - (box.width - vbW * k) / 2) / k,
      y: (Number(clientY) - box.top - (box.height > 0 ? (box.height - vbH * k) / 2 : 0)) / k
    };
  }
  function cellAtPoint(layout, width, height, x, y) {
    var c = Math.floor((x - layout.originX) / layout.cell);
    var r = Math.floor((y - layout.originY) / layout.cell);
    if (!(c >= 0 && c < width && r >= 0 && r < height)) return null;
    return { c: c, r: r };
  }
  // The corner handle: whole units from the top-left corner, kept inside the
  // drawing while the layout is frozen for the drag.
  function resizeFromPoint(layout, x, y) {
    var maxW = Math.max(1, Math.min(EXPLORE_VB.maxW, Math.floor((EXPLORE_VB.right - layout.originX) / layout.cell + 1e-9)));
    var maxH = Math.max(1, Math.min(EXPLORE_VB.maxH, Math.floor((EXPLORE_VB.bottom - layout.originY) / layout.cell + 1e-9)));
    return {
      w: clampInteger((x - layout.originX) / layout.cell, 1, maxW),
      h: clampInteger((y - layout.originY) / layout.cell, 1, maxH)
    };
  }
  // The fence path runs clockwise from the top-left corner; s is the number
  // of unit lengths walked (0 to the perimeter).
  function fencePoint(width, height, s) {
    var P = 2 * (width + height);
    s = Math.max(0, Math.min(P, Number(s) || 0));
    if (s <= width) return { x: s, y: 0 };
    if (s <= width + height) return { x: width, y: s - width };
    if (s <= 2 * width + height) return { x: width - (s - width - height), y: height };
    return { x: 0, y: height - (s - 2 * width - height) };
  }
  function projectToFence(width, height, ux, uy) {
    var cx = Math.max(0, Math.min(width, ux));
    var cy = Math.max(0, Math.min(height, uy));
    var options = [
      { s: cx, d: Math.hypot(ux - cx, uy) },
      { s: width + cy, d: Math.hypot(ux - width, uy - cy) },
      { s: width + height + (width - cx), d: Math.hypot(ux - cx, uy - height) },
      { s: 2 * width + height + (height - cy), d: Math.hypot(ux, uy - cy) }
    ];
    return options.reduce(function(best, o) { return o.d < best.d ? o : best; });
  }
  // One pointer sample of the walk: only a point near the fence and within
  // three units of where the walker is moves it, so a jump across the
  // rectangle or the inside never counts.
  function stepWalk(current, width, height, ux, uy, tolerance) {
    var P = 2 * (width + height);
    current = Math.max(0, Math.min(P, Math.round(Number(current) || 0)));
    var hit = projectToFence(width, height, ux, uy);
    if (!(hit.d <= (tolerance > 0 ? tolerance : 1))) return current;
    var s = hit.s;
    if (s - current > P / 2) s -= P;
    else if (current - s > P / 2) s += P;
    var target = Math.max(0, Math.min(P, Math.round(s)));
    return Math.abs(target - current) > 3 ? current : target;
  }
  // What the Tile Explorer may show: the area once every square is counted
  // (or revealed), the perimeter once the fence is walked or all four edges
  // are traced, both once a prediction is checked; nothing while predicting.
  function exploreDisclosure(s, width, height) {
    s = s && typeof s === 'object' ? s : {};
    var sig = width + 'x' + height;
    var predicting = !!s.predictMeasurements && !s.measurementsShown;
    if (predicting) return { area: false, perimeter: false, predicting: true };
    var r = s.predictResult;
    var checked = !!s.predictMeasurements && !!s.measurementsShown && !!r && r.w === width && r.h === height;
    var walk = s.boundaryWalk && s.boundaryWalk.sig === sig ? Number(s.boundaryWalk.n) || 0 : 0;
    return {
      area: checked || s.areaSeenFor === sig || countValidTiles(s.revealedTiles, width, height) === width * height,
      perimeter: checked || s.perimeterSeenFor === sig || walk >= 2 * (width + height) || Number(s.boundaryStep) >= 4,
      predicting: false
    };
  }

  // Rolls a circle one turn. Frames live in this component, not in toolData;
  // the parent hears only "done". Reduced motion is checked on every frame (it
  // jumps to the end), and the loop is cancelled on unmount.
  function ApRoller(props) {
    var R = props.React;
    var fracState = R.useState(props.rolled ? 1 : 0);
    var frac = fracState[0], setFrac = fracState[1];
    var runState = R.useState(0);
    var run = runState[0], setRun = runState[1];
    var doneRef = R.useRef(props.onDone);
    doneRef.current = props.onDone;
    R.useEffect(function() {
      if (!run) return undefined;
      var raf = global.requestAnimationFrame, caf = global.cancelAnimationFrame;
      var id = null, start = null, cancelled = false;
      function finish() {
        if (cancelled) return;
        setFrac(1);
        if (typeof doneRef.current === 'function') doneRef.current();
      }
      if (typeof raf !== 'function' || reducedMotionNow()) { finish(); return function() { cancelled = true; }; }
      function frame(ts) {
        if (cancelled) return;
        if (reducedMotionNow()) { finish(); return; }
        if (start == null) start = ts;
        var f = Math.min(1, Math.max(0, (ts - start) / (props.duration || 2200)));
        setFrac(f);
        if (f >= 1) { finish(); return; }
        id = raf(frame);
      }
      id = raf(frame);
      return function() { cancelled = true; if (id != null && typeof caf === 'function') caf(id); };
    }, [run]);
    return props.render(frac, function() { setFrac(0); setRun(run + 1); }, run > 0 && frac < 1);
  }

  global.AreaPerimeterPure = Object.freeze({
    tileLayout: tileLayout,
    svgPointFromBox: svgPointFromBox,
    cellAtPoint: cellAtPoint,
    resizeFromPoint: resizeFromPoint,
    fencePoint: fencePoint,
    projectToFence: projectToFence,
    stepWalk: stepWalk,
    exploreDisclosure: exploreDisclosure,
    parseBigAnswer: parseBigAnswer,
    generateConversion: generateConversion,
    diagnoseConversion: diagnoseConversion,
    unitPairs: AREA_UNIT_PAIRS,
    generateCircle: generateCircle,
    circleTypes: CIRCLE_TYPES,
    parseCircleAnswer: parseCircleAnswer,
    circleValueMatches: circleValueMatches,
    diagnoseCircle: diagnoseCircle,
    circleObjects: CIRCLE_OBJECTS,
    circleMeasurement: circleMeasurement,
    checkRatio: checkRatio,
    rulerFor: rulerFor,
    snapReading: snapReading,
    checkReading: checkReading,
    markerPlace: markerPlace,
    unitPairsByLevel: UNIT_PAIRS_BY_LEVEL,
    rangeGrades: Object.freeze(RANGE_GRADES.slice()),
    practiceRangeOf: practiceRangeOf,
    levelGrades: LEVEL_GRADES,
    levelForGrade: levelForGrade,
    allowedLevels: allowedLevels,
    pickLevel: pickLevel,
    bandForGrade: bandForGrade,
    tabOrderFor: tabOrderFor,
    bandPaths: BAND_PATHS,
    pathStepProgress: pathStepProgress,
    sectorModel: sectorModel,
    generateBlob: generateBlob,
    blobMarkCounts: blobMarkCounts,
    assessBlob: assessBlob,
    generateGardenMission: generateGardenMission,
    gardenCost: gardenCost,
    assessGarden: assessGarden,
    generateFloorMission: generateFloorMission,
    assessFloor: assessFloor,
    perimeterTonePlan: perimeterTonePlan,
    playTonePlan: playTonePlan,
    stopTones: stopTones,
    clampInteger: clampInteger,
    rectangleMetrics: rectangleMetrics,
    compositeMetrics: compositeMetrics,
    notchMetrics: notchMetrics,
    fixedPerimeterRectangles: fixedPerimeterRectangles,
    factorPairs: factorPairs,
    isCorrectNumericAnswer: isCorrectNumericAnswer,
    parseAnswer: parseAnswer,
    valuesMatch: valuesMatch,
    normalizeChallengeProgress: normalizeChallengeProgress,
    challengeProgressCount: challengeProgressCount,
    typeSolvedCount: typeSolvedCount,
    isValidTileKey: isValidTileKey,
    countValidTiles: countValidTiles,
    generateProblem: generateProblem,
    exampleFor: exampleFor,
    diagnoseAnswer: diagnoseAnswer,
    comparePrediction: comparePrediction,
    normalizeRange: normalizeRange,
    gradeTopics: GRADE_TOPICS,
    modeIds: Object.freeze(AREA_MODE_IDS.slice()),
    qText: qText,
    challengeIds: Object.freeze(AREA_CHALLENGE_IDS.slice())
  });

  // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
  function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
  function fill(template, vars) {
    var out = String(template == null ? '' : template);
    Object.keys(vars || {}).forEach(function(name) {
      var value = vars[name];
      out = out.replace(new RegExp('\\{' + name + '\\}', 'g'), function() { return String(value); });
    });
    return __alloOneWord(out);
  }

  // Quest labels are read outside render, so they use the translator of the
  // last render (English before the first one).
  var __alloCtx_areaperimeter = null;
  var __alloT = function(key, fallback) {
    var v;
    try { v = (__alloCtx_areaperimeter && typeof __alloCtx_areaperimeter.t === 'function') ? __alloCtx_areaperimeter.t(key, fallback) : null; } catch (e) { v = null; }
    return (v == null || v === key) ? fallback : v;
  };

  window.StemLab.registerTool('areaPerimeter', {
    icon: '🟩',
    label: 'Area & Perimeter Lab',
    desc: 'Tile, compare, decompose, and investigate 2-D shapes while building area and perimeter reasoning.',
    color: 'teal',
    category: 'math',
    questHooks: [
      {
        id: 'tile_counter',
        get label() { return __alloT('stem.areaperimeter.quest_tile_counter', 'Reveal 20 unit squares'); },
        icon: '🟩',
        check: function(data) { return (questData(data).revealedBest || 0) >= 20; },
        progress: function(data) { return fill(__alloT('stem.areaperimeter.quest_tile_progress', '{n}/20 tiles'), { n: Math.min(questData(data).revealedBest || 0, 20) }); }
      },
      {
        id: 'measurement_tour',
        get label() { return __alloT('stem.areaperimeter.quest_measurement_tour', 'Explore 5 lab modes'); },
        icon: '🧭',
        check: function(data) { return countAllowed(questData(data).modeVisits, AREA_MODE_IDS) >= 5; },
        progress: function(data) { return fill(__alloT('stem.areaperimeter.quest_modes_progress', '{n}/5 modes'), { n: Math.min(countAllowed(questData(data).modeVisits, AREA_MODE_IDS), 5) }); }
      },
      {
        id: 'challenge_five',
        get label() { return __alloT('stem.areaperimeter.quest_challenge_five', 'Solve 5 practice problems'); },
        icon: '🏅',
        check: function(data) { return challengeProgressCount(questData(data).solvedChallenges) >= 5; },
        progress: function(data) { return fill(__alloT('stem.areaperimeter.quest_solved_progress', '{n}/5 solved'), { n: Math.min(challengeProgressCount(questData(data).solvedChallenges), 5) }); }
      },
      {
        id: 'same_area_three',
        get label() { return __alloT('stem.areaperimeter.quest_same_area_three', 'Investigate 3 target areas'); },
        icon: '🔎',
        check: function(data) { return countAllowed(questData(data).targetsExplored, AREA_TARGET_IDS) >= 3; },
        progress: function(data) { return fill(__alloT('stem.areaperimeter.quest_areas_progress', '{n}/3 areas'), { n: Math.min(countAllowed(questData(data).targetsExplored, AREA_TARGET_IDS), 3) }); }
      },
      {
        id: 'decomposition_duo',
        get label() { return __alloT('stem.areaperimeter.quest_decomposition_duo', 'Use both composite-shape strategies'); },
        icon: '✂️',
        check: function(data) { return countAllowed(questData(data).compositeMethods, AREA_METHOD_IDS) >= 2; },
        progress: function(data) { return fill(__alloT('stem.areaperimeter.quest_strategies_progress', '{n}/2 strategies'), { n: countAllowed(questData(data).compositeMethods, AREA_METHOD_IDS) }); }
      }
    ],

    render: function(ctx) {
      ctx = ctx || {};
      __alloCtx_areaperimeter = ctx;
      var t = function (key, fallback) {
        try { var translated = typeof ctx.t === 'function' ? ctx.t(key, fallback) : null; return translated == null ? fallback : translated; }
        catch (_) { return fallback; }
      };
      var React = ctx.React;
      if (!React || typeof React.createElement !== 'function') return null;
      var h = React.createElement;
      var icons = ctx.icons || {};
      var ArrowLeft = icons.ArrowLeft;
      var rootData = ctx.toolData || {};
      var state = rootData._areaPerimeter || {};
      var setToolData = ctx.setToolData;
      var announce = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function() {};
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : function() {};
      var isDark = !!ctx.isDark;
      var isContrast = !!ctx.isContrast;
      var isTeacher = !!ctx.isTeacherMode;

      var COLORS = isContrast ? {
        page: '#000000', panel: '#000000', panelAlt: '#0a0a0a', text: '#ffffff',
        muted: '#ffffff', border: '#fbbf24', soft: '#111111', teal: '#ffff00',
        tealDark: '#ffff00', blue: '#00ffff', amber: '#ffff00', red: '#ff6b6b',
        green: '#00ff66', tile: '#ffff00', tileSoft: '#000000', onTeal: '#000000',
        shapeB: '#000000', ghost: '#00ffff'
      } : isDark ? {
        page: '#0f172a', panel: '#172033', panelAlt: '#111827', text: '#f8fafc',
        muted: '#cbd5e1', border: '#475569', soft: '#1e293b', teal: '#2dd4bf',
        tealDark: '#99f6e4', blue: '#60a5fa', amber: '#fbbf24', red: '#f87171',
        green: '#4ade80', tile: '#2dd4bf', tileSoft: '#134e4a', onTeal: '#0f172a',
        shapeB: '#1e3a5f', ghost: '#fbbf24'
      } : {
        page: '#f8fafc', panel: '#ffffff', panelAlt: '#f0fdfa', text: '#0f172a',
        muted: '#475569', border: '#cbd5e1', soft: '#e2e8f0', teal: '#0f766e',
        tealDark: '#115e59', blue: '#2563eb', amber: '#b45309', red: '#b91c1c',
        green: '#15803d', tile: '#0f766e', tileSoft: '#ccfbf1', onTeal: '#ffffff',
        shapeB: '#dbeafe', ghost: '#b45309'
      };
      var GRID_STROKE = isContrast ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b');

      function clamp(value, min, max) {
        return clampInteger(value, min, max);
      }

      function patch(next) {
        if (typeof setToolData !== 'function') return;
        setToolData(function(previous) {
          previous = previous || {};
          var current = previous._areaPerimeter || {};
          var changes = typeof next === 'function' ? next(current) : next;
          // The first action pins the activity the path opened by default, so
          // finishing a step never switches the tab under the student.
          var pinned = !current.mode && !(changes && changes.mode) && mode && !(lockMode && !isTeacher) ? { mode: mode } : null;
          // So does the problem it opened with, once that default no longer applies.
          var opening = !current.mode && mode === 'challenge' && !Number(current.genSeed) ? pathOpeningProblem() : null;
          var openingItem = opening ? { genGrade: opening.grade, genType: opening.type, genSeed: opening.seed, itemSig: opening.sig } : null;
          return Object.assign({}, previous, {
            _areaPerimeter: Object.assign({}, current, pinned || {}, openingItem || {}, changes || {})
          });
        });
      }

      function speak(message) {
        announce(message);
      }

      // ── teacher settings ──
      var teacherRange = normalizeRange(state.teacherRange);
      var lockMode = AREA_MODE_IDS.indexOf(state.teacherLockMode) >= 0 ? state.teacherLockMode : '';
      var revealsAllowed = !state.teacherNoReveal;

      var mode = state.mode || 'explore';
      if (!isTeacher && lockMode) mode = lockMode;
      var width = clamp(state.width == null ? 6 : state.width, 1, 20);
      var height = clamp(state.height == null ? 4 : state.height, 1, 16);
      var compareWidth = clamp(state.compareWidth == null ? 8 : state.compareWidth, 1, 20);
      var compareHeight = clamp(state.compareHeight == null ? 3 : state.compareHeight, 1, 16);
      var outerWidth = clamp(state.outerWidth == null ? 10 : state.outerWidth, 4, 14);
      var outerHeight = clamp(state.outerHeight == null ? 8 : state.outerHeight, 4, 12);
      var leftWidth = clamp(state.leftWidth == null ? 4 : state.leftWidth, 1, outerWidth - 1);
      var notchHeight = clamp(state.notchHeight == null ? 3 : state.notchHeight, 1, outerHeight - 1);
      var decomposition = state.decomposition === 'subtract' ? 'subtract' : 'add';
      var targetArea = [12, 18, 24, 30, 36].indexOf(Number(state.targetArea)) >= 0 ? Number(state.targetArea) : 24;
      var answer = state.answer == null ? '' : String(state.answer);
      var revealedTiles = state.revealedTiles || {};

      var rectangle = rectangleMetrics(width, height);
      var comparison = rectangleMetrics(compareWidth, compareHeight);
      var composite = compositeMetrics(outerWidth, outerHeight, leftWidth, notchHeight);
      var area = rectangle.area;
      var perimeter = rectangle.perimeter;
      var compareArea = comparison.area;
      var comparePerimeter = comparison.perimeter;
      var cutWidth = composite.cutWidth;
      var compositeArea = composite.area;
      var compositePerimeter = composite.perimeter;
      var validRevealed = countValidTiles(revealedTiles, width, height);
      var focusedTile = typeof state.focusedTile === 'string' ? state.focusedTile : '0-0';
      if (!isValidTileKey(focusedTile, width, height)) focusedTile = '0-0';

      var MODES = [
        { id: 'explore', icon: '🧱', label: t('stem.areaperimeter.tile_explorer', "Tile Explorer") },
        { id: 'compare', icon: '⚖️', label: t('stem.areaperimeter.compare_shapes', "Compare Shapes") },
        { id: 'composite', icon: '🧩', label: t('stem.areaperimeter.composite_shapes', "Composite Shapes") },
        { id: 'investigate', icon: '🔎', label: t('stem.areaperimeter.same_area_lab', "Same Area Lab") },
        { id: 'fence', icon: '🏡', label: t('stem.areaperimeter.fixed_fence_lab', "Same Fence Lab") },
        { id: 'challenge', icon: '🎯', label: t('stem.areaperimeter.challenges', "Challenges") },
        { id: 'units', icon: '🔲', label: t('stem.areaperimeter.mode_units', 'Square Units') },
        { id: 'circles', icon: '⭕', label: t('stem.areaperimeter.mode_circles', 'Circles') },
        { id: 'irregular', icon: '🗺️', label: t('stem.areaperimeter.mode_irregular', 'Irregular Shapes') },
        { id: 'missions', icon: '🛠️', label: t('stem.areaperimeter.mode_missions', 'Design Missions') }
      ];
      if (!MODES.some(function(item) { return item.id === mode; })) mode = 'explore';

      // ── grade band ──
      function gradeFromCtx() {
        var text = String(ctx.gradeLevel || '').toLowerCase();
        var match = text.match(/(\d+)\s*(st|nd|rd|th)/);
        if (match) return clamp(Number(match[1]), 3, 6);
        if (text.indexOf('kinder') === 0) return 3;
        if (ctx.gradeBand === 'k2') return 3;
        if (ctx.gradeBand === 'g35') return 4;
        if (ctx.gradeBand === 'g68' || ctx.gradeBand === 'g912') return 6;
        return 4;
      }
      var practiceRange = practiceRangeOf(teacherRange);
      var practiceGrade = clamp(state.practiceGrade == null ? gradeFromCtx() : state.practiceGrade, practiceRange.min, practiceRange.max);
      var gradeTopics = GRADE_TOPICS[practiceGrade];
      var practiceTopic = gradeTopics.indexOf(state.practiceTopic) >= 0 ? state.practiceTopic : 'mixed';

      // Levels 1-3 for the stage-B activities, from the host grade (a number in
      // gradeLevel wins; otherwise gradeBand: k2, g35, g68 or g912).
      function hostGradeNumber() {
        var text = String(ctx.gradeLevel || '').toLowerCase();
        var match = text.match(/(\d+)\s*(st|nd|rd|th)/);
        if (match) return Number(match[1]);
        if (text.indexOf('kinder') === 0) return 0;
        if (/college|graduate/.test(text)) return 12;
        if (ctx.gradeBand === 'k2') return 2;
        if (ctx.gradeBand === 'g35') return 4;
        if (ctx.gradeBand === 'g68') return 7;
        if (ctx.gradeBand === 'g912') return 10;
        return 6;
      }
      var hostGrade = hostGradeNumber();
      // A level fixed by the earlier separate teacher control still applies
      // until the teacher sets the grade range, which replaces it.
      var teacherLevel = [1, 2, 3].indexOf(Number(state.teacherLevel)) >= 0 ? Number(state.teacherLevel) : 0;
      function levelsAllowed(key) { return teacherLevel ? [teacherLevel] : allowedLevels(key, teacherRange); }
      function activityLevel(key) {
        if (teacherLevel) return teacherLevel;
        return pickLevel(key, state[key], hostGrade, teacherRange);
      }
      var unitLevel = activityLevel('unitLevel');
      var circleLevel = activityLevel('circleLevel');
      var blobLevel = activityLevel('blobLevel');
      var missionLevel = activityLevel('missionLevel');
      // The band follows the host grade, kept inside the teacher's range.
      var band = bandForGrade(Math.max(teacherRange.min, Math.min(teacherRange.max, rangeGrade(hostGrade))));
      // A first visit opens the band's next path step, not a fixed tab.
      function bandSteps() {
        return (BAND_PATHS[band] || []).filter(function(step) {
          return !step.grade || (step.grade >= practiceRange.min && step.grade <= practiceRange.max);
        });
      }
      var pathDefault = null;
      if (!state.mode && !(!isTeacher && lockMode)) {
        var firstSteps = bandSteps();
        pathDefault = firstSteps.filter(function(step) { return !pathStepProgress(step.id, state).done; })[0] || null;
        if (pathDefault) mode = pathDefault.mode;
        else if (BAND_CORE[band]) mode = BAND_CORE[band][0];
      }
      // The problem a first visit opens on: the step's own topic, not one already solved.
      function pathOpeningProblem() {
        if (!pathDefault || !pathDefault.grade || state.practiceGrade != null || state.practiceTopic) return null;
        var grade = pathDefault.grade;
        var types = PATH_TYPES[pathDefault.id].filter(function(type) { return GRADE_TOPICS[grade].indexOf(type) >= 0; });
        if (!types.length) return null;
        var solved = normalizeChallengeProgress(state.solvedChallenges);
        var found = null;
        for (var i = 0; i < 24 && (!found || solved[found.sig]); i += 1) found = generateProblem(grade, types[i % types.length], 1000 + grade * 31 + i);
        return found;
      }

      // ── text helpers ──
      function unitText(u) {
        if (u === 'cm') return t('stem.areaperimeter.unit_cm', 'cm');
        if (u === 'm') return t('stem.areaperimeter.unit_m', 'm');
        if (u === 'ft') return t('stem.areaperimeter.unit_ft', 'ft');
        if (u === 'in') return t('stem.areaperimeter.unit_in', 'in');
        if (u === 'yd') return t('stem.areaperimeter.unit_yd', 'yd');
        if (u === 'mm') return t('stem.areaperimeter.unit_mm', 'mm');
        return t('stem.areaperimeter.unit_generic', 'units');
      }
      // Area units by name: ha and acres are areas already, the rest are squares.
      function areaUnitText(u) {
        if (u === 'ha') return t('stem.areaperimeter.unit_ha', 'ha');
        if (u === 'acre') return t('stem.areaperimeter.unit_acres', 'acres');
        return sqUnitText(u);
      }
      function areaUnitName(u) {
        if (u === 'ha') return t('stem.areaperimeter.unit_hectares', 'hectares');
        if (u === 'acre') return t('stem.areaperimeter.unit_acres', 'acres');
        return sqUnitText(u);
      }
      function sqUnitText(u) {
        if (!u || u === 'sq') return t('stem.areaperimeter.unit_sq_generic', 'square units');
        return fill(t('stem.areaperimeter.unit_squared', '{unit}²'), { unit: unitText(u) });
      }
      function answerUnit(p) { return p.kind === 'length' ? unitText(p.unit) : sqUnitText(p.unit); }
      function nUnits(n) { return fill(t('stem.areaperimeter.n_units', '{n} units'), { n: n }); }
      function nSquareUnits(n) { return fill(t('stem.areaperimeter.n_square_units', '{n} square units'), { n: n }); }
      function gradeLabel(g) {
        if (g === 3) return t('stem.areaperimeter.grade_3', 'Grade 3');
        if (g === 4) return t('stem.areaperimeter.grade_4', 'Grade 4');
        if (g === 5) return t('stem.areaperimeter.grade_5', 'Grade 5');
        if (g === 7) return t('stem.areaperimeter.grade_7', 'Grade 7');
        if (g === 8) return t('stem.areaperimeter.grade_8', 'Grade 8');
        return t('stem.areaperimeter.grade_6', 'Grade 6');
      }
      function gradeStandard(g) {
        if (g === 3) return t('stem.areaperimeter.standard_3', 'Tiling, area as multiplication, and same perimeter with different areas (3.MD.5-8)');
        if (g === 4) return t('stem.areaperimeter.standard_4', 'Area and perimeter formulas and missing sides (4.MD.3)');
        if (g === 5) return t('stem.areaperimeter.standard_5', 'Rectangles with fraction side lengths (5.NF.4b)');
        return t('stem.areaperimeter.standard_6', 'Triangles, parallelograms, and trapezoids by decomposing and rearranging (6.G.1)');
      }
      function topicLabel(type) {
        switch (type) {
          case 'tile_area': return t('stem.areaperimeter.topic_tile_area', 'Tile and count');
          case 'rect_area': return t('stem.areaperimeter.topic_rect_area', 'Rectangle area');
          case 'rect_perimeter': return t('stem.areaperimeter.topic_rect_perimeter', 'Rectangle perimeter');
          case 'same_perimeter': return t('stem.areaperimeter.topic_same_perimeter', 'Same perimeter, different area');
          case 'missing_side_perimeter': return t('stem.areaperimeter.topic_missing_side_perimeter', 'Missing side from the perimeter');
          case 'missing_side_area': return t('stem.areaperimeter.topic_missing_side_area', 'Missing side from the area');
          case 'square_side': return t('stem.areaperimeter.topic_square_side', 'Square side from the perimeter');
          case 'l_shape_area': return t('stem.areaperimeter.topic_l_shape_area', 'L-shapes with a cut-out corner');
          case 'frac_area': return t('stem.areaperimeter.topic_frac_area', 'Fraction side lengths');
          case 'mixed_area': return t('stem.areaperimeter.topic_mixed_area', 'Mixed-number side lengths');
          case 'frac_perimeter': return t('stem.areaperimeter.topic_frac_perimeter', 'Perimeter with fractions');
          case 'triangle_area': return t('stem.areaperimeter.topic_triangle_area', 'Triangles');
          case 'parallelogram_area': return t('stem.areaperimeter.topic_parallelogram_area', 'Parallelograms');
          case 'trapezoid_area': return t('stem.areaperimeter.topic_trapezoid_area', 'Trapezoids');
          case 'unit_convert': return t('stem.areaperimeter.topic_unit_convert', 'Converting square units');
          case 'circ_from_d': return t('stem.areaperimeter.topic_circ_from_d', 'Circumference from the diameter');
          case 'circ_from_r': return t('stem.areaperimeter.topic_circ_from_r', 'Circumference from the radius');
          case 'area_from_r': return t('stem.areaperimeter.topic_area_from_r', 'Circle area from the radius');
          case 'area_from_d': return t('stem.areaperimeter.topic_area_from_d', 'Circle area from the diameter');
          case 'r_from_circ': return t('stem.areaperimeter.topic_r_from_circ', 'Radius from the circumference');
          case 'irregular': return t('stem.areaperimeter.topic_irregular', 'Estimating irregular areas');
          case 'garden': return t('stem.areaperimeter.topic_garden', 'Garden design mission');
          case 'floor': return t('stem.areaperimeter.topic_floor', 'Flooring mission');
          default: return t('stem.areaperimeter.topic_mixed', 'Mixed practice');
        }
      }
      function modeLabel(id) {
        var found = MODES.filter(function(item) { return item.id === id; })[0];
        return found ? found.label : id;
      }

      function problemPrompt(p) {
        var u = unitText(p.unit);
        var v = { u: u, su: sqUnitText(p.unit) };
        switch (p.type) {
          case 'tile_area':
            return t('stem.areaperimeter.q_tile_area', 'Unit squares cover this rectangle with no gaps and no overlaps. What is its area in square units?');
          case 'rect_area':
            v.l = p.l; v.w = p.w;
            if (p.context === 'garden') return fill(t('stem.areaperimeter.q_area_garden', 'A rectangular garden is {l} {u} long and {w} {u} wide. What is its area?'), v);
            if (p.context === 'rug') return fill(t('stem.areaperimeter.q_area_rug', 'A rug is {l} {u} long and {w} {u} wide. How much floor does it cover?'), v);
            if (p.context === 'poster') return fill(t('stem.areaperimeter.q_area_poster', 'A poster is {l} {u} long and {w} {u} wide. What is its area?'), v);
            return fill(t('stem.areaperimeter.q_area_floor', 'A classroom floor is {l} {u} long and {w} {u} wide. How much carpet, in {su}, covers it?'), v);
          case 'rect_perimeter':
            v.l = p.l; v.w = p.w;
            if (p.context === 'fence') return fill(t('stem.areaperimeter.q_perim_fence', 'A rectangular garden is {l} {u} long and {w} {u} wide. How much fence goes all the way around it?'), v);
            if (p.context === 'ribbon') return fill(t('stem.areaperimeter.q_perim_ribbon', 'A poster is {l} {u} long and {w} {u} wide. How much ribbon frames its edge?'), v);
            if (p.context === 'trim') return fill(t('stem.areaperimeter.q_perim_trim', 'A rug is {l} {u} long and {w} {u} wide. How much trim goes around its edge?'), v);
            return fill(t('stem.areaperimeter.q_perim_border', 'A playground is {l} {u} long and {w} {u} wide. What is its perimeter?'), v);
          case 'same_perimeter':
            return fill(t('stem.areaperimeter.q_same_perimeter', 'Rectangle A is {b} by {a}. Rectangle B is {d} by {c}. Both have a perimeter of {P} units. How many more square units of area does the bigger one have?'), { a: p.a, b: p.b, c: p.c, d: p.d, P: p.P });
          case 'missing_side_perimeter':
            return fill(t('stem.areaperimeter.q_missing_perimeter', 'A rectangle has a perimeter of {P} {u}. Its length is {l} {u}. What is its width?'), { P: p.P, l: p.l, u: u });
          case 'missing_side_area':
            return fill(t('stem.areaperimeter.q_missing_area', 'A rectangle has an area of {A} {su}. Its width is {w} {u}. What is its length?'), { A: p.A, w: p.w, u: u, su: v.su });
          case 'square_side':
            return fill(t('stem.areaperimeter.q_square_side', 'A square has a perimeter of {P} {u}. How long is each side?'), { P: p.P, u: u });
          case 'l_shape_area':
            return fill(t('stem.areaperimeter.q_l_shape', 'An L-shape starts as a {W} by {H} rectangle. A {cw} by {ch} corner is cut away. What area is left, in square units?'), { W: p.W, H: p.H, cw: p.cw, ch: p.ch });
          case 'frac_area':
            return fill(t('stem.areaperimeter.q_frac_area', 'A rectangle is {l} {u} long and {w} {u} wide. What is its area?'), { l: qText(p.lq), w: qText(p.wq), u: u });
          case 'mixed_area':
            return fill(t('stem.areaperimeter.q_mixed_area', 'A rectangular rug is {l} {u} long and {w} {u} wide. What is its area?'), { l: qText(p.lq), w: qText(p.wq), u: u });
          case 'frac_perimeter':
            return fill(t('stem.areaperimeter.q_frac_perimeter', 'A rectangle is {l} {u} long and {w} {u} wide. What is its perimeter?'), { l: qText(p.lq), w: qText(p.wq), u: u });
          case 'triangle_area':
            if (p.right) return fill(t('stem.areaperimeter.q_triangle_right', 'A right triangle has a base of {b} {u} and a height of {h} {u}. What is its area?'), { b: p.b, h: p.h, u: u });
            return fill(t('stem.areaperimeter.q_triangle', 'A triangle has a base of {b} {u} and a height of {h} {u}. Its slanted side is {s} {u}. What is its area?'), { b: p.b, h: p.h, s: p.s, u: u });
          case 'parallelogram_area':
            return fill(t('stem.areaperimeter.q_parallelogram', 'A parallelogram has a base of {b} {u}, a height of {h} {u}, and slanted sides of {s} {u}. What is its area?'), { b: p.b, h: p.h, s: p.s, u: u });
          case 'trapezoid_area':
            return fill(t('stem.areaperimeter.q_trapezoid', 'A trapezoid has parallel sides of {b1} {u} and {b2} {u}. The height between them is {h} {u}. What is its area?'), { b1: p.b1, b2: p.b2, h: p.h, u: u });
          default: return '';
        }
      }

      // Feedback for a named wrong answer. It names the idea, never the answer.
      function mistakeMessage(id) {
        switch (id) {
          case 'gave_perimeter': return t('stem.areaperimeter.m_gave_perimeter', 'That number is the perimeter: the distance around the edge. This question asks for area: the unit squares that cover the inside.');
          case 'gave_area': return t('stem.areaperimeter.m_gave_area', 'That number is the area: the squares inside. This question asks for the perimeter: the distance all the way around.');
          case 'two_sides': return t('stem.areaperimeter.m_two_sides', 'It looks like you added two side lengths. Area multiplies: the number of rows times the squares in each row.');
          case 'half_perimeter': return t('stem.areaperimeter.m_half_perimeter', 'You added two sides. A rectangle has four sides: two lengths and two widths.');
          case 'three_sides': return t('stem.areaperimeter.m_three_sides', 'You added three sides. Trace all the way around: there are four sides.');
          case 'row_short': return t('stem.areaperimeter.m_row_short', 'You are one row or one column short. Count the rows, then the squares in each row, again.');
          case 'same_perimeter_same_area': return t('stem.areaperimeter.m_same_perimeter_same_area', 'The same perimeter does not mean the same area. Find the area of each rectangle, then compare.');
          case 'gave_one_area': return t('stem.areaperimeter.m_gave_one_area', 'That is the area of one rectangle. The question asks how much more one has than the other.');
          case 'one_length_only': return t('stem.areaperimeter.m_one_length_only', 'You took away only one length. The perimeter has two lengths and two widths, so take away both lengths, then split what is left.');
          case 'two_widths': return t('stem.areaperimeter.m_two_widths', 'That is both widths together. A rectangle has two equal widths, so split it in half.');
          case 'half_only': return t('stem.areaperimeter.m_half_only', 'Half the perimeter is one length plus one width. Now take away the length.');
          case 'treated_as_square': return t('stem.areaperimeter.m_treated_as_square', 'Dividing by 4 works only for a square. This rectangle has a different length and width.');
          case 'halved_area': return t('stem.areaperimeter.m_halved_area', 'It looks like you divided the area by 2. To find a missing side, divide the area by the side you know.');
          case 'subtracted_side': return t('stem.areaperimeter.m_subtracted_side', 'It looks like you subtracted. Undo the operation in the formula instead: undo multiplying by dividing.');
          case 'square_half': return t('stem.areaperimeter.m_square_half', 'A square has four equal sides, so share the perimeter among 4 sides, not 2.');
          case 'added_cutout': return t('stem.areaperimeter.m_added_cutout', 'You added the cut-out piece. That corner is missing, so subtract its area from the whole rectangle.');
          case 'forgot_cutout': return t('stem.areaperimeter.m_forgot_cutout', 'That is the area of the whole rectangle. Remember to take away the missing corner.');
          case 'gave_cutout': return t('stem.areaperimeter.m_gave_cutout', 'That is the area of the missing corner. The question asks for the part that is left.');
          case 'added_denominators': return t('stem.areaperimeter.m_added_denominators', 'When you multiply fractions, multiply the denominators too. Adding them changes the size of the pieces.');
          case 'partial_mixed': return t('stem.areaperimeter.m_partial_mixed', 'You multiplied the whole numbers and the fractions separately. Split each side into its whole and fraction parts: there are four partial areas to add, not two.');
          case 'dropped_fraction': return t('stem.areaperimeter.m_dropped_fraction', 'You left out the fraction part of a side. Multiply the fraction part too, then add it on.');
          case 'triangle_no_half': return t('stem.areaperimeter.m_triangle_no_half', 'That is the area of the whole parallelogram (or rectangle) around the triangle. The triangle is exactly half of it.');
          case 'used_slant': return t('stem.areaperimeter.m_used_slant', 'You used the slanted side. Height is measured straight up from the base, at a right angle.');
          case 'halved_parallelogram': return t('stem.areaperimeter.m_halved_parallelogram', 'A parallelogram is not half of a rectangle. Cut the triangle off one end and slide it to the other end: it makes a whole rectangle.');
          case 'trapezoid_no_half': return t('stem.areaperimeter.m_trapezoid_no_half', 'Two copies of the trapezoid make a parallelogram. You found the area of both copies, so take half.');
          case 'one_base': return t('stem.areaperimeter.m_one_base', 'You used only one of the parallel sides. Both count: add them, multiply by the height, then halve.');
          default: return '';
        }
      }
      function mistakeName(id) {
        switch (id) {
          case 'gave_perimeter': return t('stem.areaperimeter.mn_gave_perimeter', 'Gave the perimeter for an area');
          case 'gave_area': return t('stem.areaperimeter.mn_gave_area', 'Gave the area for a perimeter');
          case 'two_sides': return t('stem.areaperimeter.mn_two_sides', 'Added two sides for an area');
          case 'half_perimeter': return t('stem.areaperimeter.mn_half_perimeter', 'Added only two sides of the perimeter');
          case 'three_sides': return t('stem.areaperimeter.mn_three_sides', 'Added only three sides');
          case 'row_short': return t('stem.areaperimeter.mn_row_short', 'Counted one row or column short');
          case 'same_perimeter_same_area': return t('stem.areaperimeter.mn_same_perimeter_same_area', 'Thought same perimeter means same area');
          case 'gave_one_area': return t('stem.areaperimeter.mn_gave_one_area', 'Gave one area instead of the difference');
          case 'one_length_only': return t('stem.areaperimeter.mn_one_length_only', 'Took away only one length');
          case 'two_widths': return t('stem.areaperimeter.mn_two_widths', 'Gave both widths together');
          case 'half_only': return t('stem.areaperimeter.mn_half_only', 'Stopped at half the perimeter');
          case 'treated_as_square': return t('stem.areaperimeter.mn_treated_as_square', 'Treated a rectangle as a square');
          case 'halved_area': return t('stem.areaperimeter.mn_halved_area', 'Divided the area by 2');
          case 'subtracted_side': return t('stem.areaperimeter.mn_subtracted_side', 'Subtracted instead of dividing');
          case 'square_half': return t('stem.areaperimeter.mn_square_half', 'Split a square’s perimeter into 2 sides');
          case 'added_cutout': return t('stem.areaperimeter.mn_added_cutout', 'Added the cut-out instead of subtracting');
          case 'forgot_cutout': return t('stem.areaperimeter.mn_forgot_cutout', 'Forgot to remove the cut-out');
          case 'gave_cutout': return t('stem.areaperimeter.mn_gave_cutout', 'Gave the cut-out area');
          case 'added_denominators': return t('stem.areaperimeter.mn_added_denominators', 'Added denominators when multiplying');
          case 'partial_mixed': return t('stem.areaperimeter.mn_partial_mixed', 'Missed partial products of mixed numbers');
          case 'dropped_fraction': return t('stem.areaperimeter.mn_dropped_fraction', 'Dropped the fraction part');
          case 'triangle_no_half': return t('stem.areaperimeter.mn_triangle_no_half', 'Forgot to halve for a triangle');
          case 'used_slant': return t('stem.areaperimeter.mn_used_slant', 'Used the slanted side as the height');
          case 'halved_parallelogram': return t('stem.areaperimeter.mn_halved_parallelogram', 'Halved a parallelogram');
          case 'trapezoid_no_half': return t('stem.areaperimeter.mn_trapezoid_no_half', 'Forgot to halve for a trapezoid');
          case 'one_base': return t('stem.areaperimeter.mn_one_base', 'Used one base of a trapezoid');
          case 'linear_factor': return t('stem.areaperimeter.mn_linear_factor', 'Used the length factor for square units (1 m² = 100 cm²)');
          case 'wrong_direction': return t('stem.areaperimeter.mn_wrong_direction', 'Converted square units the wrong way');
          case 'metric_factor': return t('stem.areaperimeter.mn_metric_factor', 'Used 100 for customary units');
          case 'diameter_as_radius': return t('stem.areaperimeter.mn_diameter_as_radius', 'Mixed up radius and diameter: used the diameter as the radius');
          case 'radius_as_diameter': return t('stem.areaperimeter.mn_radius_as_diameter', 'Mixed up radius and diameter: used the radius as the diameter');
          case 'circ_gave_area': return t('stem.areaperimeter.mn_circ_gave_area', 'Gave the circle’s area for its circumference');
          case 'forgot_pi_circ': return t('stem.areaperimeter.mn_forgot_pi_circ', 'Left π out of the circumference');
          case 'area_2pir': return t('stem.areaperimeter.mn_area_2pir', 'Used 2πr (the circumference) for area');
          case 'squared_diameter': return t('stem.areaperimeter.mn_squared_diameter', 'Squared the diameter instead of the radius');
          case 'area_pi_r': return t('stem.areaperimeter.mn_area_pi_r', 'Did not square the radius');
          case 'forgot_pi_area': return t('stem.areaperimeter.mn_forgot_pi_area', 'Left π out of the area');
          case 'gave_diameter': return t('stem.areaperimeter.mn_gave_diameter', 'Gave the diameter for the radius');
          case 'divided_by_two_only': return t('stem.areaperimeter.mn_divided_by_two_only', 'Divided the circumference by 2 only');
          case 'ratio_upside_down': return t('stem.areaperimeter.mn_ratio_upside_down', 'Divided the diameter by the circumference');
          case 'ratio_used_radius': return t('stem.areaperimeter.mn_ratio_used_radius', 'Divided the circumference by the radius');
          case 'ratio_subtracted': return t('stem.areaperimeter.mn_ratio_subtracted', 'Subtracted instead of dividing');
          case 'read_diameter': return t('stem.areaperimeter.mn_read_diameter', 'Read the diameter instead of the track');
          case 'read_major_slip': return t('stem.areaperimeter.mn_read_major_slip', 'Misread a numbered ruler mark');
          case 'read_close_short': return t('stem.areaperimeter.mn_read_close_short', 'Read the ruler a little short');
          case 'read_close_long': return t('stem.areaperimeter.mn_read_close_long', 'Read the ruler a little long');
          case 'read_short': return t('stem.areaperimeter.mn_read_short', 'Read the ruler well short of the end');
          case 'read_long': return t('stem.areaperimeter.mn_read_long', 'Read the ruler past the end');
          case 'partial_as_full': return t('stem.areaperimeter.mn_partial_as_full', 'Counted part squares as whole squares');
          case 'skipped_partials': return t('stem.areaperimeter.mn_skipped_partials', 'Skipped the part squares');
          case 'counted_outside': return t('stem.areaperimeter.mn_counted_outside', 'Counted squares outside the shape');
          case 'missed_full': return t('stem.areaperimeter.mn_missed_full', 'Missed whole squares');
          case 'halves_not_halved': return t('stem.areaperimeter.mn_halves_not_halved', 'Counted each part square as a whole one when adding');
          case 'full_only': return t('stem.areaperimeter.mn_full_only', 'Left the part squares out of the total');
          case 'arith_slip': return t('stem.areaperimeter.mn_arith_slip', 'Calculation slip');
          case 'cost_fence_only': return t('stem.areaperimeter.mn_cost_fence_only', 'Costed the fence only');
          case 'cost_soil_only': return t('stem.areaperimeter.mn_cost_soil_only', 'Costed the soil only');
          case 'cost_swapped_rates': return t('stem.areaperimeter.mn_cost_swapped_rates', 'Swapped the fence and soil prices');
          case 'fence_short': return t('stem.areaperimeter.mn_fence_short', 'Did not use all the fence');
          case 'fence_over': return t('stem.areaperimeter.mn_fence_over', 'Used more fence than there is');
          case 'over_budget': return t('stem.areaperimeter.mn_over_budget', 'Went over budget');
          case 'not_max_area': return t('stem.areaperimeter.mn_not_max_area', 'Missed the largest area for the fence');
          case 'not_max_affordable': return t('stem.areaperimeter.mn_not_max_affordable', 'Missed the largest area the budget allows');
          case 'rounded_down': return t('stem.areaperimeter.mn_rounded_down', 'Rounded down when buying whole units');
          case 'not_whole': return t('stem.areaperimeter.mn_not_whole', 'Bought part of a box or square yard');
          case 'cost_per_sqft': return t('stem.areaperimeter.mn_cost_per_sqft', 'Priced every square foot instead of each box');
          default: return t('stem.areaperimeter.mn_other', 'Other wrong answers');
        }
      }
      function genericNudge(p) {
        if (p.type === 'missing_side_perimeter' || p.type === 'missing_side_area' || p.type === 'square_side') return t('stem.areaperimeter.nudge_missing', 'Not yet. Write the formula, put in the numbers you know, then work backward to the missing side.');
        if (p.kind === 'length') return t('stem.areaperimeter.nudge_length', 'Not yet. Perimeter is the distance all the way around. Check each side you added.');
        return t('stem.areaperimeter.nudge_area', 'Not yet. Area counts the unit squares that cover the inside. Check your multiplication.');
      }

      // Hint ladder: each hint says more about the method, none states the answer.
      function hintsFor(p) {
        var u = unitText(p.unit);
        switch (p.type) {
          case 'tile_area': return [
            t('stem.areaperimeter.h_tile_1', 'Count how many rows of squares there are.'),
            t('stem.areaperimeter.h_tile_2', 'Each row has the same number of squares. Count the squares in one row.'),
            t('stem.areaperimeter.h_tile_3', 'Multiply: number of rows times squares in each row.')];
          case 'rect_area': case 'frac_area': case 'mixed_area': return [
            t('stem.areaperimeter.h_area_1', 'Area is the space inside, measured in square units.'),
            t('stem.areaperimeter.h_area_2', 'For a rectangle, area = length × width.'),
            p.type === 'mixed_area' ? t('stem.areaperimeter.h_mixed_3', 'Split each side into a whole number and a fraction, find each partial area, then add them all.')
              : p.type === 'frac_area' ? t('stem.areaperimeter.h_frac_3', 'Multiply the numerators, then multiply the denominators.')
              : fill(t('stem.areaperimeter.h_area_3', 'Multiply {l} by {w}. The answer is in square units.'), { l: p.l, w: p.w })];
          case 'rect_perimeter': case 'frac_perimeter': return [
            t('stem.areaperimeter.h_perim_1', 'Perimeter is the distance all the way around the edge.'),
            t('stem.areaperimeter.h_perim_2', 'A rectangle has two lengths and two widths.'),
            t('stem.areaperimeter.h_perim_3', 'Add one length and one width, then double the total.')];
          case 'same_perimeter': return [
            t('stem.areaperimeter.h_same_1', 'Both rectangles use the same amount of edge, but that does not tell you the space inside.'),
            t('stem.areaperimeter.h_same_2', 'Find the area of Rectangle A, then the area of Rectangle B.'),
            t('stem.areaperimeter.h_same_3', 'Subtract the smaller area from the bigger one.')];
          case 'missing_side_perimeter': return [
            t('stem.areaperimeter.h_mp_1', 'The perimeter is length + width + length + width.'),
            fill(t('stem.areaperimeter.h_mp_2', 'Half of the perimeter is one length plus one width. Half of {P} is how much?'), { P: p.P }),
            fill(t('stem.areaperimeter.h_mp_3', 'From that half, take away the length of {l} {u}.'), { l: p.l, u: u })];
          case 'missing_side_area': return [
            t('stem.areaperimeter.h_ma_1', 'Area = length × width.'),
            fill(t('stem.areaperimeter.h_ma_2', 'Which number times {w} makes {A}?'), { w: p.w, A: p.A }),
            t('stem.areaperimeter.h_ma_3', 'Divide the area by the width you know.')];
          case 'square_side': return [
            t('stem.areaperimeter.h_sq_1', 'All four sides of a square are equal.'),
            t('stem.areaperimeter.h_sq_2', 'The perimeter is the four sides added together.'),
            t('stem.areaperimeter.h_sq_3', 'Divide the perimeter into 4 equal parts.')];
          case 'l_shape_area': return [
            t('stem.areaperimeter.h_l_1', 'Picture the whole rectangle before the corner was cut.'),
            t('stem.areaperimeter.h_l_2', 'Find the area of the whole rectangle and the area of the missing corner.'),
            t('stem.areaperimeter.h_l_3', 'The corner is gone, so subtract it.')];
          case 'triangle_area': return [
            t('stem.areaperimeter.h_tri_1', 'Use the height that meets the base at a right angle, not the slanted side.'),
            t('stem.areaperimeter.h_tri_2', 'Two copies of this triangle fit together into a parallelogram with the same base and height.'),
            t('stem.areaperimeter.h_tri_3', 'Find base × height, then take half.')];
          case 'parallelogram_area': return [
            t('stem.areaperimeter.h_par_1', 'Use the height that meets the base at a right angle, not the slanted side.'),
            t('stem.areaperimeter.h_par_2', 'Cut the triangle off one end and slide it to the other end. What shape do you get?'),
            t('stem.areaperimeter.h_par_3', 'The rectangle you made has the same base and height: multiply them.')];
          case 'trapezoid_area': return [
            t('stem.areaperimeter.h_trap_1', 'Turn a copy of the trapezoid upside down and put it next to the first one.'),
            t('stem.areaperimeter.h_trap_2', 'The two copies make a parallelogram. Its base is the two parallel sides added together.'),
            t('stem.areaperimeter.h_trap_3', 'Find the parallelogram’s area, then take half for one trapezoid.')];
          default: return [];
        }
      }

      // Worked steps. Each step with a value can be faded to "?" in an example.
      function step(template, vars, value) { return { template: template, vars: vars || {}, value: value }; }
      function stepText(s, hideValue) {
        return fill(s.template, Object.assign({}, s.vars, { v: hideValue ? '?' : numText(s.value) }));
      }
      function solutionSteps(p) {
        var u = unitText(p.unit);
        var unitOut = answerUnit(p);
        switch (p.type) {
          case 'tile_area': return [
            step(t('stem.areaperimeter.s_tile_1', 'There are {h} rows with {w} squares in each row.'), { h: p.h, w: p.w }),
            step(t('stem.areaperimeter.s_tile_2', '{h} × {w} = {v} square units'), { h: p.h, w: p.w }, p.answer)];
          case 'rect_area': return [
            step(t('stem.areaperimeter.s_area_1', 'Area = length × width.')),
            step(t('stem.areaperimeter.s_area_2', '{l} × {w} = {v} {unit}'), { l: p.l, w: p.w, unit: unitOut }, p.answer)];
          case 'rect_perimeter': return [
            step(t('stem.areaperimeter.s_perim_1', 'Perimeter = length + width + length + width.')),
            step(t('stem.areaperimeter.s_perim_2', 'One length and one width: {l} + {w} = {v}'), { l: p.l, w: p.w }, p.l + p.w),
            step(t('stem.areaperimeter.s_perim_3', 'Both pairs: 2 × ({l} + {w}) = {v} {unit}'), { l: p.l, w: p.w, unit: unitOut }, p.answer)];
          case 'same_perimeter': return [
            step(t('stem.areaperimeter.s_same_1', 'Rectangle A: {b} × {a} = {v} square units'), { a: p.a, b: p.b }, p.a * p.b),
            step(t('stem.areaperimeter.s_same_2', 'Rectangle B: {d} × {c} = {v} square units'), { c: p.c, d: p.d }, p.c * p.d),
            step(t('stem.areaperimeter.s_same_3', 'Subtract the smaller area from the bigger one: {v} square units'), {}, p.answer)];
          case 'missing_side_perimeter': return [
            step(t('stem.areaperimeter.s_mp_1', 'Half the perimeter is one length plus one width: {P} ÷ 2 = {v}'), { P: p.P }, p.P / 2),
            step(t('stem.areaperimeter.s_mp_2', 'Take away the length: {P} ÷ 2 − {l} = {v} {unit}'), { P: p.P, l: p.l, unit: u }, p.answer)];
          case 'missing_side_area': return [
            step(t('stem.areaperimeter.s_ma_1', 'Area = length × width, so length = area ÷ width.')),
            step(t('stem.areaperimeter.s_ma_2', '{A} ÷ {w} = {v} {unit}'), { A: p.A, w: p.w, unit: u }, p.answer)];
          case 'square_side': return [
            step(t('stem.areaperimeter.s_sq_1', 'A square has 4 equal sides.')),
            step(t('stem.areaperimeter.s_sq_2', '{P} ÷ 4 = {v} {unit}'), { P: p.P, unit: u }, p.answer)];
          case 'l_shape_area': return [
            step(t('stem.areaperimeter.s_l_1', 'Whole rectangle: {W} × {H} = {v} square units'), { W: p.W, H: p.H }, p.W * p.H),
            step(t('stem.areaperimeter.s_l_2', 'Missing corner: {cw} × {ch} = {v} square units'), { cw: p.cw, ch: p.ch }, p.cw * p.ch),
            step(t('stem.areaperimeter.s_l_3', 'Subtract: {W} × {H} − {cw} × {ch} = {v} square units'), { W: p.W, H: p.H, cw: p.cw, ch: p.ch }, p.answer)];
          case 'frac_area': return [
            step(t('stem.areaperimeter.s_frac_1', 'Multiply the numerators: {a} × {c} = {v}'), { a: p.lq.n, c: p.wq.n }, p.lq.n * p.wq.n),
            step(t('stem.areaperimeter.s_frac_2', 'Multiply the denominators: {b} × {d} = {v}'), { b: p.lq.d, d: p.wq.d }, p.lq.d * p.wq.d),
            step(t('stem.areaperimeter.s_frac_3', 'Area = {l} × {w} = {v} {unit}'), { l: qText(p.lq), w: qText(p.wq), unit: unitOut }, p.answerQ)];
          case 'mixed_area': {
            var lParts = [Q(p.lWhole, 1), p.lFrac];
            var wParts = p.wFrac ? [Q(p.wWhole, 1), p.wFrac] : [Q(p.wWhole, 1)];
            var list = [p.wFrac
              ? step(t('stem.areaperimeter.s_mixed_1', 'Split the sides: {l} = {lw} + {lf} and {w} = {ww} + {wf}.'), { l: qText(p.lq), lw: p.lWhole, lf: qText(p.lFrac), w: qText(p.wq), ww: p.wWhole, wf: qText(p.wFrac) })
              : step(t('stem.areaperimeter.s_mixed_1_length', 'Split the length: {l} = {lw} + {lf}.'), { l: qText(p.lq), lw: p.lWhole, lf: qText(p.lFrac) })];
            lParts.forEach(function(a) { wParts.forEach(function(b) {
              list.push(step(t('stem.areaperimeter.s_mixed_part', 'Partial area: {a} × {b} = {v}'), { a: qText(a), b: qText(b) }, qMul(a, b)));
            }); });
            list.push(step(t('stem.areaperimeter.s_mixed_sum', 'Add the partial areas: {v} {unit}'), { unit: unitOut }, p.answerQ));
            return list; }
          case 'frac_perimeter': return [
            step(t('stem.areaperimeter.s_fp_1', 'One length and one width: {l} + {w} = {v}'), { l: qText(p.lq), w: qText(p.wq) }, qAdd(p.lq, p.wq)),
            step(t('stem.areaperimeter.s_fp_2', 'Double it: 2 × ({l} + {w}) = {v} {unit}'), { l: qText(p.lq), w: qText(p.wq), unit: unitOut }, p.answerQ)];
          case 'triangle_area': return [
            step(t('stem.areaperimeter.s_tri_1', 'Two copies of the triangle make a parallelogram with the same base and height.')),
            step(t('stem.areaperimeter.s_tri_2', 'Parallelogram: {b} × {h} = {v}'), { b: p.b, h: p.h }, p.b * p.h),
            step(t('stem.areaperimeter.s_tri_3', 'One triangle is half: {b} × {h} ÷ 2 = {v} {unit}'), { b: p.b, h: p.h, unit: unitOut }, p.answer)];
          case 'parallelogram_area': return [
            step(t('stem.areaperimeter.s_par_1', 'Cut the triangle off one end and slide it to the other end. The shape becomes a rectangle.')),
            step(t('stem.areaperimeter.s_par_2', 'Rectangle: base × height = {b} × {h} = {v} {unit}'), { b: p.b, h: p.h, unit: unitOut }, p.answer)];
          case 'trapezoid_area': return [
            step(t('stem.areaperimeter.s_trap_1', 'Two copies make a parallelogram with base {b1} + {b2} = {v}'), { b1: p.b1, b2: p.b2 }, p.b1 + p.b2),
            step(t('stem.areaperimeter.s_trap_2', 'Parallelogram: ({b1} + {b2}) × {h} = {v}'), { b1: p.b1, b2: p.b2, h: p.h }, (p.b1 + p.b2) * p.h),
            step(t('stem.areaperimeter.s_trap_3', 'One trapezoid is half: ({b1} + {b2}) × {h} ÷ 2 = {v} {unit}'), { b1: p.b1, b2: p.b2, h: p.h, unit: unitOut }, p.answer)];
          default: return [];
        }
      }

      // ── shared UI pieces ──
      function panel(children, extra) {
        return h('section', Object.assign({
          className: 'rounded-2xl border shadow-sm',
          style: { background: COLORS.panel, borderColor: COLORS.border, padding: 'clamp(14px, 2.5vw, 24px)', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', overflowX: 'auto' }
        }, extra || {}), children);
      }

      function actionButton(label, onClick, options) {
        options = options || {};
        var disabled = !!options.disabled;
        return h('button', {
          key: options.key || label,
          type: options.type || 'button',
          onClick: onClick,
          disabled: disabled,
          'aria-pressed': options.pressed == null ? undefined : !!options.pressed,
          'aria-expanded': options.expanded == null ? undefined : !!options.expanded,
          'aria-controls': options.controls,
          'aria-label': options.ariaLabel,
          'data-ap-action': options.data,
          className: 'rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500',
          style: Object.assign({
            padding: options.compact ? '7px 11px' : '10px 15px',
            minHeight: '40px',
            borderColor: options.primary ? COLORS.teal : COLORS.border,
            background: disabled ? COLORS.soft : (options.primary ? COLORS.teal : COLORS.panel),
            color: disabled ? COLORS.muted : (options.primary ? COLORS.onTeal : COLORS.text),
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.65 : 1
          }, options.style || {})
        }, label);
      }

      function metricCard(label, value, formula, accent, key) {
        return h('div', {
          key: key || 'metric-' + label,
          'data-ap-metric': key || undefined,
          className: 'rounded-xl border',
          style: { borderColor: COLORS.border, background: COLORS.panelAlt, padding: '14px', minWidth: 0 }
        }, [
          h('div', { key: 'label', style: { color: COLORS.muted, fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, label),
          h('div', { key: 'value', style: { color: accent || COLORS.tealDark, fontSize: 'clamp(1.45rem, 4vw, 2rem)', fontWeight: 800, lineHeight: 1.2 } }, value),
          h('div', { key: 'formula', style: { color: COLORS.muted, fontSize: '0.9rem', marginTop: '4px' } }, formula)
        ]);
      }

      function rangeControl(label, value, min, max, onChange, shown, disabledFlag) {
        // Runs of ASCII punctuation/spaces become one hyphen (English ids unchanged); every
        // non-ASCII character keeps its code point, so translated labels cannot collide.
        var id = 'ap-' + label.toLowerCase().replace(/[^a-z0-9]+/g, function(run) {
          return run.replace(/[ -~]/g, '').split('').map(function(ch) { return '_' + ch.charCodeAt(0).toString(36); }).join('') || '-';
        });
        return h('label', { key: id, htmlFor: id, style: { display: 'block', color: COLORS.text, fontWeight: 700 } }, [
          h('span', { key: 'line', style: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '7px' } }, [
            h('span', { key: 'name' }, label),
            h('output', { key: 'out', htmlFor: id, style: { color: COLORS.tealDark } }, shown == null ? String(value) : shown)
          ]),
          h('input', {
            key: 'input', id: id, type: 'range', min: min, max: max, step: 1, value: value,
            disabled: max <= min || !!disabledFlag,
            onChange: function(event) { onChange(Number(event.target.value)); },
            style: { width: '100%', minHeight: '28px', accentColor: COLORS.teal },
            'aria-label': label
          })
        ]);
      }

      function textField(id, label, value, onChange, options) {
        options = options || {};
        return h('label', { key: id, htmlFor: id, style: { color: COLORS.text, fontWeight: 800, flex: options.flex || '1 1 200px', minWidth: 0 } }, [
          h('span', { key: 'text', style: { display: 'block', marginBottom: '6px' } }, label),
          h('input', {
            key: 'input', id: id, type: 'text', inputMode: options.inputMode || 'decimal', autoComplete: 'off',
            value: value == null ? '' : String(value), disabled: !!options.disabled,
            onChange: function(event) { onChange(event.target.value); },
            'aria-invalid': options.invalid ? true : undefined,
            'aria-describedby': options.describedBy,
            style: { width: '100%', boxSizing: 'border-box', minHeight: '44px', padding: '10px 12px', borderRadius: '10px', border: '2px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.text, fontSize: '1rem' }
          })
        ]);
      }

      function chipGroup(groupLabel, options, selected, onPick, key) {
        return h('div', { key: key || groupLabel, role: 'group', 'aria-label': groupLabel, style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, options.map(function(option) {
          return actionButton(option.label, function() { onPick(option.id); }, { key: 'chip-' + option.id, compact: true, pressed: selected === option.id, primary: selected === option.id, disabled: option.disabled, data: option.data });
        }));
      }

      function note(text, tone, key, extra) {
        var palette = tone === 'good'
          ? { bg: isContrast ? '#000000' : (isDark ? '#052e16' : '#f0fdf4'), fg: isContrast ? '#ffffff' : (isDark ? '#bbf7d0' : '#166534'), border: COLORS.green }
          : tone === 'warn'
            ? { bg: isContrast ? '#000000' : (isDark ? '#450a0a' : '#fef2f2'), fg: isContrast ? '#ffffff' : (isDark ? '#fecaca' : '#991b1b'), border: COLORS.red }
            : { bg: isContrast ? '#000000' : (isDark ? '#422006' : '#fffbeb'), fg: isContrast ? '#ffffff' : (isDark ? '#fde68a' : '#92400e'), border: isContrast ? '#fbbf24' : (isDark ? '#a16207' : '#fcd34d') };
        return h('div', Object.assign({ key: key || 'note', style: { marginTop: '12px', padding: '12px 13px', borderRadius: '11px', border: '1px solid ' + palette.border, background: palette.bg, color: palette.fg, fontWeight: 650, lineHeight: 1.5 } }, extra || {}), text);
      }

      // One hint-ladder look for every tab: hints appear one at a time, in order.
      function hintLadder(hints, shown, id, extra) {
        if (!shown) return null;
        return h('ol', Object.assign({ key: 'hints-' + id, id: id, 'data-ap-hint-ladder': shown, style: { margin: '12px 0 0', padding: '12px 12px 12px 32px', borderRadius: '10px', background: isContrast ? '#000000' : (isDark ? '#422006' : '#fffbeb'), color: isContrast ? '#ffffff' : (isDark ? '#fde68a' : '#92400e'), border: '1px solid ' + (isContrast ? '#fbbf24' : (isDark ? '#a16207' : '#fcd34d')) } }, extra || {}),
          hints.slice(0, shown).map(function(text, i) { return h('li', { key: i }, text); }));
      }
      function hintButton(hints, shown, id, onMore, disabled) {
        return actionButton(shown < hints.length ? t('stem.areaperimeter.show_hint', "Show hint") : t('stem.areaperimeter.no_more_hints', 'No more hints'), function() { onMore(shown + 1); speak(hints[shown] || ''); }, { key: 'hint-' + id, disabled: shown >= hints.length || !!disabled, controls: id, expanded: shown > 0 });
      }

      function formulaTable(rows, caption, headers) {
        headers = headers || [t('stem.areaperimeter.measure', "Measure"), t('stem.areaperimeter.how_it_is_found', "How it is found"), t('stem.areaperimeter.result', "Result")];
        return h('div', { key: 'formula-' + caption, role: 'region', tabIndex: 0, 'aria-label': caption, className: 'focus:outline-none focus:ring-2 focus:ring-teal-500', style: { overflowX: 'auto', marginTop: '14px', width: '100%', maxWidth: '100%' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.text, minWidth: '420px' } }, [
            h('caption', { key: 'cap', style: { textAlign: 'left', fontWeight: 800, marginBottom: '8px', color: COLORS.text } }, caption),
            h('thead', { key: 'head' }, h('tr', null, headers.map(function(item, index) {
              return h('th', { key: index, scope: 'col', style: { borderBottom: '2px solid ' + COLORS.border, padding: '9px', textAlign: 'left' } }, item);
            }))),
            h('tbody', { key: 'body' }, rows.map(function(row, index) {
              return h('tr', { key: index }, row.map(function(cell, cellIndex) {
                return h(cellIndex === 0 ? 'th' : 'td', {
                  key: cellIndex,
                  scope: cellIndex === 0 ? 'row' : undefined,
                  style: { borderBottom: '1px solid ' + COLORS.border, padding: '9px', textAlign: 'left', fontWeight: cellIndex === 0 ? 700 : 400 }
                }, cell);
              }));
            }))
          ])
        );
      }

      function heading(text, key) {
        return h('h2', { key: key || 'h', style: { color: COLORS.text, fontSize: '1.35rem', fontWeight: 850, margin: 0 } }, text);
      }
      function lead(text, key) {
        return h('p', { key: key || 'p', style: { color: COLORS.muted, margin: '6px 0 16px', maxWidth: '760px', lineHeight: 1.5 } }, text);
      }

      // ── cross-links to related tools ──
      function toolReachable(id) {
        try {
          if (typeof ctx.setStemLabTool !== 'function' || !global.StemLab) return false;
          return !!((global.StemLab.isRegistered && global.StemLab.isRegistered(id)) || typeof global.__alloEnsureStemPluginLoaded === 'function');
        } catch (e) { return false; }
      }
      function openTool(id, name) {
        var ok = false;
        try { ok = !!(global.StemLab.isRegistered && global.StemLab.isRegistered(id)); } catch (e) { ok = false; }
        if (!ok) { try { ok = typeof global.__alloEnsureStemPluginLoaded === 'function' && global.__alloEnsureStemPluginLoaded(id) !== false; } catch (e2) { ok = false; } }
        if (!ok || typeof ctx.setStemLabTool !== 'function') { speak(fill(t('stem.areaperimeter.tool_unavailable', '{name} is not available in this build.'), { name: name })); return; }
        ctx.setStemLabTool(id);
      }
      function linkButton(id, name, text) {
        if (!toolReachable(id)) return null;
        return actionButton(text, function() { openTool(id, name); }, { key: 'link-' + id, compact: true, data: 'link-' + id });
      }
      function areaModelLink() {
        return linkButton('areamodel', t('stem.areaperimeter.tool_areamodel', 'Area Model'), t('stem.areaperimeter.link_areamodel', 'See multiplication as area in the Area Model'));
      }
      function coordinateLink() {
        return linkButton('coordinate', t('stem.areaperimeter.tool_coordinate', 'Coordinate Grid'), t('stem.areaperimeter.link_coordinate', 'Draw polygons on the Coordinate Grid'));
      }
      function volumeLink() {
        return linkButton('volume', t('stem.areaperimeter.tool_volume', 'Volume'), t('stem.areaperimeter.link_volume', 'Stack layers of square units into volume in the Volume tool'));
      }

      // ── perimeter as sound (opt-in, from a button press only) ──
      function soundButton(edges, keyName, hideTotal) {
        var lengths = (edges || []).map(Number).filter(function(e) { return isFinite(e) && e > 0; });
        return actionButton(t('stem.areaperimeter.play_perimeter', 'Play the perimeter as sound'), function() {
          var plan = perimeterTonePlan(lengths);
          var handle = playTonePlan(plan);
          var vars = { n: lengths.length, list: lengths.map(numText).join(', '), p: numText(plan.total) };
          var line = hideTotal
            ? fill(t('stem.areaperimeter.sr_sound_trace_predict', 'Perimeter trace: {n} edges of {list} units. Higher notes are longer edges.'), vars)
            : fill(t('stem.areaperimeter.sr_sound_trace', 'Perimeter trace: {n} edges of {list} units, {p} units in all. Higher notes are longer edges.'), vars);
          speak(handle ? line : line + ' ' + t('stem.areaperimeter.sr_sound_unavailable', 'Sound is muted or not available on this device.'));
        }, { key: 'sound-' + keyName, compact: true, data: 'sound-' + keyName, disabled: !lengths.length });
      }

      // ── mode selection ──
      function selectMode(nextMode) {
        if (!isTeacher && lockMode && nextMode !== lockMode) return;
        var visits = Object.assign({}, state.modeVisits || {});
        visits[mode] = true;
        visits[nextMode] = true;
        var next = { mode: nextMode, modeVisits: visits };
        if (nextMode === 'investigate') {
          next.targetsExplored = Object.assign({}, state.targetsExplored || {});
          next.targetsExplored[targetArea] = true;
        }
        if (nextMode === 'composite') {
          next.compositeMethods = Object.assign({}, state.compositeMethods || {});
          next.compositeMethods[decomposition] = true;
        }
        patch(next);
        speak(fill(t('stem.areaperimeter.mode_selected', '{mode} selected.'), { mode: modeLabel(nextMode) }));
      }

      function handleModeKeyDown(event, index, list) {
        var nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % list.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + list.length) % list.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = list.length - 1;
        else return;
        event.preventDefault();
        selectMode(list[nextIndex].id);
        var tabs = event.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        if (tabs[nextIndex] && typeof tabs[nextIndex].focus === 'function') tabs[nextIndex].focus();
      }

      var PREDICTION_RESET = { measurementsShown: false, predictArea: '', predictPerimeter: '', predictResult: null, predictReflection: '' };

      function setDimension(key, value, message) {
        var next = {};
        next[key] = value;
        if (key === 'width' || key === 'height') Object.assign(next, { revealedTiles: {}, boundaryStep: 0 }, PREDICTION_RESET);
        patch(next);
        speak(message);
      }

      var predictingNow = !!state.predictMeasurements && !state.measurementsShown;
      var exploreSig = width + 'x' + height;
      var known = exploreDisclosure(state, width, height);

      // Paints (or clears) tiles from the newest state, so a fast drag never
      // loses a square. Counting squares is what fills in revealedBest.
      function paintTiles(keys, paintMode) {
        var w = width, hh = height;
        patch(function(current) {
          var tiles = validTileMap(current.revealedTiles || {}, w, hh);
          // Squares from Reveal all were not counted: no credit until they are cleared.
          var fromReveal = current.tilesRevealedFor === w + 'x' + hh && Object.keys(tiles).length > 0;
          keys.forEach(function(key) {
            if (!isValidTileKey(key, w, hh)) return;
            if (paintMode === 'erase') delete tiles[key]; else tiles[key] = true;
          });
          var count = Object.keys(tiles).length;
          var next = { revealedTiles: tiles };
          if (paintMode !== 'erase' && !fromReveal) next.revealedBest = Math.max(Number(current.revealedBest) || 0, count);
          if (!fromReveal && current.tilesRevealedFor) next.tilesRevealedFor = null;
          if (count === w * hh && !(current.predictMeasurements && !current.measurementsShown)) next.areaSeenFor = w + 'x' + hh;
          return next;
        });
      }
      // The count after these keys are painted, from this render's tiles.
      function countAfter(keys, paintMode) {
        var tiles = validTileMap(revealedTiles, width, height);
        keys.forEach(function(key) { if (paintMode === 'erase') delete tiles[key]; else if (isValidTileKey(key, width, height)) tiles[key] = true; });
        return Object.keys(tiles).length;
      }
      // Said once, when the last square is counted.
      function areaCountedLine(count, wasKnown) {
        return count === area && !predictingNow && !wasKnown
          ? ' ' + fill(t('stem.areaperimeter.sr_area_counted', 'You counted every square. The area is {n} square units.'), { n: area })
          : '';
      }
      function tileMessage(column, row, shown, count, wasKnown) {
        if (wasKnown == null) wasKnown = known.area;
        var vars = { c: column + 1, r: row + 1, n: count, total: area };
        if (shown) return wasKnown
          ? fill(t('stem.areaperimeter.sr_tile_revealed', 'Revealed the unit square at column {c}, row {r}. {n} of {total} revealed.'), vars)
          : fill(t('stem.areaperimeter.sr_tile_revealed_count', 'Revealed the unit square at column {c}, row {r}. {n} revealed so far.'), vars) + areaCountedLine(count, wasKnown);
        return wasKnown
          ? fill(t('stem.areaperimeter.sr_tile_hidden', 'Hid the unit square at column {c}, row {r}. {n} of {total} revealed.'), vars)
          : fill(t('stem.areaperimeter.sr_tile_hidden_count', 'Hid the unit square at column {c}, row {r}. {n} revealed so far.'), vars);
      }

      function toggleTile(column, row) {
        var key = column + '-' + row;
        var paintMode = revealedTiles[key] && isValidTileKey(key, width, height) ? 'erase' : 'paint';
        paintTiles([key], paintMode);
        speak(tileMessage(column, row, paintMode === 'paint', countAfter([key], paintMode)));
      }

      // ── walking the fence, one unit length at a time ──
      function walkedUnits() {
        var w = state.boundaryWalk;
        return w && w.sig === exploreSig ? Math.max(0, Math.min(perimeter, Math.round(Number(w.n) || 0))) : 0;
      }
      function walkTo(n) {
        var next = { boundaryWalk: { sig: exploreSig, n: n } };
        if (n >= perimeter && !predictingNow) next.perimeterSeenFor = exploreSig;
        patch(next);
      }
      function walkMessage(n, wasKnown) {
        if (n < perimeter) return fill(t('stem.areaperimeter.walk_count', 'Units walked: {n}'), { n: n });
        if (predictingNow) return fill(t('stem.areaperimeter.sr_walk_done_predict', 'Back at the start after {n} units.'), { n: n });
        return wasKnown
          ? fill(t('stem.areaperimeter.sr_walk_done_again', 'Back at the start: {n} units around.'), { n: n })
          : fill(t('stem.areaperimeter.sr_walk_done', 'Back at the start. You walked {n} units all the way around, so the perimeter is {n} units.'), { n: n });
      }
      function walkOneUnit() {
        var n = walkedUnits();
        if (n >= perimeter) { patch({ boundaryWalk: { sig: exploreSig, n: 0 } }); speak(t('stem.areaperimeter.sr_walk_restart', 'Back at the start corner. Walk again.')); return; }
        walkTo(n + 1);
        speak(walkMessage(n + 1, known.perimeter));
      }

      // A reveal, not a count: it shows the area but adds nothing to revealedBest.
      function revealAll() {
        var all = {};
        for (var row = 0; row < height; row += 1) {
          for (var column = 0; column < width; column += 1) all[column + '-' + row] = true;
        }
        patch({ revealedTiles: all, areaSeenFor: exploreSig, tilesRevealedFor: exploreSig });
        speak(fill(t('stem.areaperimeter.sr_all_revealed', 'All {n} unit squares revealed.'), { n: area }));
      }

      function rectangleSvg() {
        // While the corner handle is dragged the drawing keeps its scale, so
        // the corner stays under the pointer; it refits when the drag ends.
        var layout = apResize.active && apResize.layout ? apResize.layout : tileLayout(width, height);
        var cell = layout.cell;
        var shapeW = cell * width;
        var shapeH = cell * height;
        var originX = layout.originX;
        var originY = layout.originY;
        var walkN = walkedUnits();
        function pointOf(event) {
          var el = event.currentTarget;
          var svgEl = el && (el.ownerSVGElement || el);
          var box = svgEl && typeof svgEl.getBoundingClientRect === 'function' ? svgEl.getBoundingClientRect() : null;
          return svgPointFromBox(box, event.clientX, event.clientY, 640, 390);
        }
        function capture(event) {
          var el = event.currentTarget;
          if (el && el.setPointerCapture && event.pointerId != null) { try { el.setPointerCapture(event.pointerId); } catch (e) {} }
        }
        function primaryPointer(event) { return !(event.pointerType === 'mouse' && event.button !== 0) && event.isPrimary !== false; }
        // A second finger must not steer or end a drag it did not start.
        function samePointer(drag, event) { return drag.pointerId == null || event.pointerId == null || drag.pointerId === event.pointerId; }
        // touch-action is ignored on inline SVG children, so these need display:block
        // or the browser pans and cancels the drag after a few pixels.
        var NO_PAN = { display: 'block', touchAction: 'none' };
        // A click prop marks the shape tappable; otherwise Chromium's touch
        // adjustment hands the finger to the nearest tile.
        function tappable() {}

        // ── paint by dragging across the squares ──
        apGridHandlers.tile = toggleTile;
        apGridHandlers.tileClick = function(c, r) {
          // A pointer press already painted this square; skip its click.
          if (Date.now() < apPaint.suppressUntil) { apPaint.suppressUntil = 0; return; }
          toggleTile(c, r);
        };
        apGridHandlers.tileFocus = function(key) { if (focusedTile !== key) patch({ focusedTile: key }); };
        apGridHandlers.paintDown = function(event, c, r) {
          if (!primaryPointer(event)) return;
          capture(event);
          var key = c + '-' + r;
          apPaint.active = true;
          apPaint.mode = revealedTiles[key] && isValidTileKey(key, width, height) ? 'erase' : 'paint';
          apPaint.touched = {};
          apPaint.touched[key] = true;
          apPaint.pointerId = event.pointerId;
          apPaint.last = pointOf(event);
          apPaint.startTiles = validTileMap(revealedTiles, width, height);
          apPaint.knownAtStart = known.area;
          apPaint.suppressUntil = 0;
          paintTiles([key], apPaint.mode);
        };
        apGridHandlers.paintMove = function(event) {
          if (!apPaint.active || !samePointer(apPaint, event)) return;
          var pt = pointOf(event);
          if (!pt) return;
          // A quick swipe delivers sparse samples: take every square on the line between them.
          var from = apPaint.last || pt;
          var steps = Math.max(1, Math.ceil(Math.hypot(pt.x - from.x, pt.y - from.y) / (layout.cell / 2)));
          var fresh = [];
          for (var i = 1; i <= steps; i += 1) {
            var hit = cellAtPoint(layout, width, height, from.x + (pt.x - from.x) * i / steps, from.y + (pt.y - from.y) * i / steps);
            if (!hit) continue;
            var key = hit.c + '-' + hit.r;
            if (!apPaint.touched[key]) { apPaint.touched[key] = true; fresh.push(key); }
          }
          apPaint.last = pt;
          if (fresh.length) paintTiles(fresh, apPaint.mode);
        };
        apGridHandlers.paintUp = function(event) {
          if (!apPaint.active || !samePointer(apPaint, event)) return;
          apPaint.active = false;
          apPaint.suppressUntil = Date.now() + 700;
          var keys = Object.keys(apPaint.touched || {});
          var count = countAfter(keys, apPaint.mode);
          // Only the squares this stroke changed, not the ones it passed over.
          var start = apPaint.startTiles || {};
          var changed = keys.filter(function(key) { return apPaint.mode === 'erase' ? !!start[key] : !start[key]; });
          if (changed.length <= 1) {
            var one = (changed[0] || keys[0]).split('-');
            speak(tileMessage(Number(one[0]), Number(one[1]), apPaint.mode === 'paint', count, apPaint.knownAtStart));
            return;
          }
          var vars = { k: changed.length, n: count };
          speak(apPaint.mode === 'erase'
            ? fill(t('stem.areaperimeter.sr_tiles_cleared', 'Cleared {k} squares. {n} counted so far.'), vars)
            : fill(t('stem.areaperimeter.sr_tiles_painted', 'Painted {k} squares. {n} counted so far.'), vars) + areaCountedLine(count, apPaint.knownAtStart));
        };
        // Shift + an arrow key paints the square you leave and the one you reach.
        apGridHandlers.paintKeys = function(c, r, nc, nr) {
          var keys = [c + '-' + r, nc + '-' + nr];
          paintTiles(keys, 'paint');
          speak(tileMessage(nc, nr, true, countAfter(keys, 'paint')));
        };

        function buildCells() {
        var cells = [];
        for (var row = 0; row < height; row += 1) {
          for (var column = 0; column < width; column += 1) {
            (function(c, r) {
              var key = c + '-' + r;
              var shown = !!revealedTiles[key];
              cells.push(h('rect', {
                key: key,
                x: originX + c * cell,
                y: originY + r * cell,
                width: cell,
                height: cell,
                fill: shown ? COLORS.tile : COLORS.tileSoft,
                stroke: GRID_STROKE,
                strokeWidth: shown ? 1.6 : 1,
                role: 'button',
                tabIndex: focusedTile === key ? 0 : -1,
                focusable: 'true',
                'data-ap-tile': key,
                'aria-pressed': shown,
                'aria-label': shown
                  ? fill(t('stem.areaperimeter.tile_label_revealed', 'Unit square column {c}, row {r}, revealed'), { c: c + 1, r: r + 1 })
                  : fill(t('stem.areaperimeter.tile_label_hidden', 'Unit square column {c}, row {r}, hidden'), { c: c + 1, r: r + 1 }),
                onFocus: function() { apGridHandlers.tileFocus(key); },
                onClick: function() { apGridHandlers.tileClick(c, r); },
                onPointerDown: function(event) { apGridHandlers.paintDown(event, c, r); },
                onPointerMove: function(event) { apGridHandlers.paintMove(event); },
                onPointerUp: function(event) { apGridHandlers.paintUp(event); },
                onPointerCancel: function(event) { apGridHandlers.paintUp(event); },
                onKeyDown: function(event) {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    apGridHandlers.tile(c, r);
                    return;
                  }
                  var nextColumn = c;
                  var nextRow = r;
                  if (event.key === 'ArrowRight') nextColumn = Math.min(width - 1, c + 1);
                  else if (event.key === 'ArrowLeft') nextColumn = Math.max(0, c - 1);
                  else if (event.key === 'ArrowDown') nextRow = Math.min(height - 1, r + 1);
                  else if (event.key === 'ArrowUp') nextRow = Math.max(0, r - 1);
                  else if (event.key === 'Home') { nextColumn = 0; nextRow = 0; }
                  else if (event.key === 'End') { nextColumn = width - 1; nextRow = height - 1; }
                  else return;
                  event.preventDefault();
                  if (event.shiftKey && /^Arrow/.test(event.key)) apGridHandlers.paintKeys(c, r, nextColumn, nextRow);
                  var svg = event.currentTarget.ownerSVGElement;
                  var nextTile = svg && svg.querySelector('[data-ap-tile="' + nextColumn + '-' + nextRow + '"]');
                  if (nextTile && typeof nextTile.focus === 'function') nextTile.focus();
                },
                style: Object.assign({ cursor: 'pointer' }, NO_PAN)
              }));
            })(column, row);
          }
        }
        return cells;
        }
        var Grid = memoGrid(React);
        var gridSig = [width, height, focusedTile, isDark ? 'd' : '', isContrast ? 'c' : '', cell, originX, originY, Object.keys(validTileMap(revealedTiles, width, height)).sort().join(','),
          t('stem.areaperimeter.tile_label_revealed', 'Unit square column {c}, row {r}, revealed'), t('stem.areaperimeter.tile_label_hidden', 'Unit square column {c}, row {r}, hidden')].join('|');
        var cells = Grid ? [h(Grid, { key: 'cells', sig: gridSig, build: function() { return h('g', { 'data-ap-tile-grid': true }, buildCells()); } })] : buildCells();

        // ── the corner handle (the sliders are its keyboard route) ──
        function resizeDown(event) {
          if (!primaryPointer(event)) return;
          capture(event);
          apResize.active = true;
          apResize.layout = tileLayout(width, height);
          apResize.start = { w: width, h: height };
          apResize.pointerId = event.pointerId;
          // Measure from where the handle was grabbed, or a press beside its centre
          // plus one pixel of jitter resizes and wipes the squares.
          var grabbed = pointOf(event);
          apResize.grab = grabbed ? { x: grabbed.x - (originX + shapeW), y: grabbed.y - (originY + shapeH) } : { x: 0, y: 0 };
        }
        function resizeMove(event) {
          if (!apResize.active || !samePointer(apResize, event)) return;
          var pt = pointOf(event);
          if (!pt) return;
          var dims = resizeFromPoint(apResize.layout, pt.x - apResize.grab.x, pt.y - apResize.grab.y);
          if (dims.w === width && dims.h === height) return;
          patch(Object.assign({ width: dims.w, height: dims.h, revealedTiles: {}, boundaryStep: 0 }, PREDICTION_RESET));
        }
        function resizeUp(event) {
          if (!apResize.active || !samePointer(apResize, event)) return;
          apResize.active = false;
          var start = apResize.start || {};
          patch({});
          if (start.w !== width || start.h !== height) speak(fill(t('stem.areaperimeter.sr_resized', 'The rectangle is now {w} by {h}.'), { w: width, h: height }));
        }

        // ── walk the fence: a path just outside the boundary ──
        var off = 14;
        function trackPoint(s) {
          var p = fencePoint(width, height, s);
          return [originX + p.x * cell + (p.x <= 0 ? -off : (p.x >= width ? off : 0)), originY + p.y * cell + (p.y <= 0 ? -off : (p.y >= height ? off : 0))];
        }
        var walkedPoints = [];
        for (var s = 0; s <= walkN; s += 1) walkedPoints.push(trackPoint(s));
        var walker = trackPoint(walkN);
        var tolerance = Math.max(0.6, 30 / cell);
        function walkDown(event) {
          if (!primaryPointer(event)) return;
          capture(event);
          apWalk.active = true;
          apWalk.pointerId = event.pointerId;
          apWalk.start = walkN;
          apWalk.n = walkN;
          apWalk.knownAtStart = known.perimeter;
          walkMove(event);
        }
        function walkMove(event) {
          if (!apWalk.active || !samePointer(apWalk, event)) return;
          var pt = pointOf(event);
          if (!pt) return;
          var n = stepWalk(apWalk.n, width, height, (pt.x - originX) / cell, (pt.y - originY) / cell, tolerance);
          if (n === apWalk.n) return;
          apWalk.n = n;
          walkTo(n);
        }
        function walkUp(event) {
          if (!apWalk.active || !samePointer(apWalk, event)) return;
          apWalk.active = false;
          if (apWalk.n !== apWalk.start) speak(walkMessage(apWalk.n, apWalk.knownAtStart));
        }

        var description;
        if (predictingNow) description = fill(t('stem.areaperimeter.explore_desc_predict', 'A {w} by {h} grid of unit squares. Count the rows, the columns, and the four boundary edges before you check your prediction.'), { w: width, h: height });
        else if (known.area && known.perimeter) description = fill(t('stem.areaperimeter.explore_desc', 'Interactive grid with {area} unit squares. {n} squares are revealed. The perimeter is {p} units.'), { area: area, n: validRevealed, p: perimeter });
        else if (known.area) description = fill(t('stem.areaperimeter.explore_desc_area', 'Interactive grid with {area} unit squares. {n} squares are counted. Walk the boundary to find the perimeter.'), { area: area, n: validRevealed });
        else if (known.perimeter) description = fill(t('stem.areaperimeter.explore_desc_perimeter', 'Interactive {w} by {h} grid of unit squares. {n} squares are counted so far. The perimeter is {p} units.'), { w: width, h: height, n: validRevealed, p: perimeter });
        else description = fill(t('stem.areaperimeter.explore_desc_hidden', 'Interactive {w} by {h} grid of unit squares. {n} squares are counted so far. Paint every square to find the area, and walk the boundary to find the perimeter.'), { w: width, h: height, n: validRevealed });
        var cornerX = originX + shapeW;
        var cornerY = originY + shapeH;
        // Standing on this corner the walker sits under the handle: the finger
        // meant for the walker must not resize and wipe the rectangle.
        var showHandle = apResize.active || Math.hypot(walker[0] - (cornerX + 10), walker[1] - (cornerY + 10)) > 22;
        return h('svg', {
          key: 'rectangle-svg',
          viewBox: '0 0 640 390',
          role: 'group',
          'data-ap-explore-svg': true,
          'aria-labelledby': 'ap-explore-title ap-explore-desc',
          style: { display: 'block', width: '100%', minWidth: Math.ceil(24 * 640 / cell) + 'px', maxWidth: 'none', maxHeight: Math.max(430, Math.ceil(24 * 390 / cell)) + 'px' }
        }, [
          h('title', { key: 'title', id: 'ap-explore-title' }, fill(t('stem.areaperimeter.explore_title', '{w} by {h} tiled rectangle'), { w: width, h: height })),
          h('desc', { key: 'desc', id: 'ap-explore-desc' }, description),
          h('text', { key: 'top', x: originX + shapeW / 2, y: originY - 32, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800 }, nUnits(width)),
          h('text', { key: 'side', x: originX - 38, y: originY + shapeH / 2, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800, transform: 'rotate(-90 ' + (originX - 38) + ' ' + (originY + shapeH / 2) + ')' }, nUnits(height))
        ].concat(cells).concat([
          h('polyline', { key: 'boundary-trace', points: [
            [originX, originY], [originX + shapeW, originY], [originX + shapeW, originY + shapeH], [originX, originY + shapeH], [originX, originY]
          ].slice(0, Math.min(4, state.boundaryStep || 0) + 1).map(function(p) { return p.join(','); }).join(' '), fill: 'none', stroke: COLORS.blue, strokeWidth: 5, pointerEvents: 'none' }),
          h('rect', { key: 'walk-guide', x: originX - off, y: originY - off, width: shapeW + 2 * off, height: shapeH + 2 * off, fill: 'none', stroke: COLORS.muted, strokeWidth: 1.5, strokeDasharray: '5 6', pointerEvents: 'none', 'aria-hidden': 'true' }),
          walkN > 0 ? h('polyline', { key: 'walked', 'data-ap-walked': walkN, points: walkedPoints.map(function(p) { return p.join(','); }).join(' '), fill: 'none', stroke: COLORS.amber, strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none', 'aria-hidden': 'true' }) : null,
          h('g', { key: 'walk-marks', 'aria-hidden': 'true', pointerEvents: 'none' }, walkedPoints.slice(1).map(function(p, i) { return h('circle', { key: i, cx: p[0], cy: p[1], r: 3.5, fill: COLORS.panel, stroke: COLORS.amber, strokeWidth: 2 }); })),
          h('circle', { key: 'walker', 'data-ap-walker': walkN, cx: walker[0], cy: walker[1], r: 11, fill: COLORS.amber, stroke: COLORS.panel, strokeWidth: 3, pointerEvents: 'none', 'aria-hidden': 'true' }),
          walkN > 0 ? h('text', { key: 'walk-n', x: walker[0], y: walker[1] + 5, textAnchor: 'middle', fill: COLORS.onTeal === '#000000' ? '#000000' : (isDark ? '#0f172a' : '#ffffff'), fontSize: 12, fontWeight: 900, pointerEvents: 'none', 'aria-hidden': 'true' }, String(walkN)) : null,
          h('rect', { key: 'walk-track', 'data-ap-walk-track': true, x: originX - off, y: originY - off, width: shapeW + 2 * off, height: shapeH + 2 * off, fill: 'none', stroke: 'transparent', strokeWidth: 26, pointerEvents: 'stroke', 'aria-hidden': 'true',
            onClick: tappable, onPointerDown: walkDown, onPointerMove: walkMove, onPointerUp: walkUp, onPointerCancel: walkUp, style: Object.assign({ cursor: 'grab' }, NO_PAN) }),
          showHandle ? h('g', { key: 'resize', 'data-ap-resize-handle': true, 'aria-hidden': 'true', onClick: tappable, onPointerDown: resizeDown, onPointerMove: resizeMove, onPointerUp: resizeUp, onPointerCancel: resizeUp, style: Object.assign({ cursor: 'nwse-resize' }, NO_PAN) }, [
            h('circle', { key: 'hit', cx: cornerX + 10, cy: cornerY + 10, r: 22, fill: 'transparent', style: NO_PAN }),
            h('circle', { key: 'dot', cx: cornerX + 10, cy: cornerY + 10, r: 11, fill: COLORS.blue, stroke: COLORS.panel, strokeWidth: 3, style: NO_PAN }),
            // A two-headed diagonal arrow: "drag to resize".
            h('path', { key: 'arrow', d: (function(x, y) {
              return 'M' + (x - 5) + ' ' + (y - 5) + ' L' + (x + 5) + ' ' + (y + 5) +
                ' M' + (x - 5) + ' ' + (y - 1) + ' L' + (x - 5) + ' ' + (y - 5) + ' L' + (x - 1) + ' ' + (y - 5) +
                ' M' + (x + 5) + ' ' + (y + 1) + ' L' + (x + 5) + ' ' + (y + 5) + ' L' + (x + 1) + ' ' + (y + 5);
            })(cornerX + 10, cornerY + 10), stroke: COLORS.panel, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', style: NO_PAN })
          ]) : null,
          h('text', { key: 'count', 'data-ap-tile-count': validRevealed, x: 320, y: 376, textAnchor: 'middle', fill: COLORS.tealDark, fontSize: 18, fontWeight: 800 }, fill(t('stem.areaperimeter.tiles_counted_n', 'Tiles counted: {n}'), { n: validRevealed }))
        ]));
      }

      function predictionNoteText(id) {
        switch (id) {
          case 'swapped': return t('stem.areaperimeter.pn_swapped', 'Your two predictions are swapped: your area guess is the perimeter, and your perimeter guess is the area.');
          case 'area_was_perimeter': return t('stem.areaperimeter.pn_area_was_perimeter', 'Your area guess is the perimeter. Area counts the squares inside.');
          case 'area_two_sides': return t('stem.areaperimeter.pn_area_two_sides', 'Your area guess adds two sides. Area multiplies the rows by the squares in each row.');
          case 'perimeter_was_area': return t('stem.areaperimeter.pn_perimeter_was_area', 'Your perimeter guess is the area. Perimeter measures the edge, not the inside.');
          case 'perimeter_two_sides': return t('stem.areaperimeter.pn_perimeter_two_sides', 'Your perimeter guess adds only two sides. Go all the way around.');
          case 'perimeter_three_sides': return t('stem.areaperimeter.pn_perimeter_three_sides', 'Your perimeter guess adds three sides. A rectangle has four.');
          default: return '';
        }
      }

      function exploreView() {
        var predictOn = !!state.predictMeasurements;
        var predicting = predictOn && !state.measurementsShown;
        var result = predictOn && state.measurementsShown && state.predictResult && state.predictResult.w === width && state.predictResult.h === height ? state.predictResult : null;
        var cmp = result ? comparePrediction(width, height, result.area, result.perimeter) : null;
        var traceStep = Math.max(0, Math.min(4, Number(state.boundaryStep) || 0));
        var tracedSides = [width, height, width, height].slice(0, traceStep);
        var tracedDistance = tracedSides.reduce(function(sum, side) { return sum + side; }, 0);
        var traceText;
        if (predicting) {
          traceText = traceStep === 0
            ? t('stem.areaperimeter.trace_none_predict', '0/4 edges traced.')
            : fill(t('stem.areaperimeter.trace_progress_predict', '{count}/4 edges traced: {sides}'), { count: traceStep, sides: tracedSides.join(' + ') });
        } else {
          var work = tracedSides.length ? tracedSides.join(' + ') + ' = ' + tracedDistance : '0';
          traceText = traceStep === 4
            ? fill(t('stem.areaperimeter.trace_complete', '{count}/4 edges traced: {work} units. The complete boundary is the perimeter.'), { count: traceStep, work: work })
            : fill(t('stem.areaperimeter.trace_progress', '{count}/4 edges traced: {work} units'), { count: traceStep, work: work });
        }
        var areaGuess = parseAnswer(state.predictArea);
        var perimeterGuess = parseAnswer(state.predictPerimeter);
        var bothReady = isFinite(areaGuess) && isFinite(perimeterGuess);

        function checkPrediction(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (!bothReady) return;
          var c = comparePrediction(width, height, areaGuess, perimeterGuess);
          patch({ measurementsShown: true, predictResult: { w: width, h: height, area: areaGuess, perimeter: perimeterGuess }, predictReflection: '' });
          speak(fill(t('stem.areaperimeter.sr_prediction_checked', 'Checked. The area is {area} square units and the perimeter is {p} units. {verdict}'), {
            area: c.area, p: c.perimeter,
            verdict: c.areaOk && c.perimeterOk ? t('stem.areaperimeter.both_match', 'Both predictions match.') : t('stem.areaperimeter.compare_table_below', 'Compare your predictions in the table.')
          }));
        }
        function newRectangle() {
          var nw = width, nh = height;
          for (var tries = 0; tries < 8 && nw === width && nh === height; tries += 1) {
            nw = 2 + Math.floor(Math.random() * 9); nh = 2 + Math.floor(Math.random() * 7);
          }
          patch(Object.assign({ width: nw, height: nh, revealedTiles: {}, boundaryStep: 0 }, PREDICTION_RESET));
          speak(fill(t('stem.areaperimeter.sr_new_rectangle', 'New rectangle: {w} by {h}. Make your predictions.'), { w: nw, h: nh }));
        }
        var REFLECTIONS = [
          { id: 'counted', label: t('stem.areaperimeter.reflect_counted', 'I counted rows and columns'), ack: t('stem.areaperimeter.reflect_counted_ack', 'Counting rows and columns is how area becomes multiplication.') },
          { id: 'rule', label: t('stem.areaperimeter.reflect_rule', 'I used a rule'), ack: t('stem.areaperimeter.reflect_rule_ack', 'A rule is a shortcut for counting. Check it still matches the squares and edges.') },
          { id: 'mixed', label: t('stem.areaperimeter.reflect_mixed', 'I mixed up area and perimeter'), ack: t('stem.areaperimeter.reflect_mixed_ack', 'Next time, ask first: inside (area) or around the edge (perimeter)?') },
          { id: 'estimate', label: t('stem.areaperimeter.reflect_estimate', 'I estimated'), ack: t('stem.areaperimeter.reflect_estimate_ack', 'Estimating is a good start. Next time, count one row and one edge to sharpen it.') }
        ];
        var reflection = REFLECTIONS.filter(function(item) { return item.id === state.predictReflection; })[0];
        function resultCell(ok, off) {
          return ok ? t('stem.areaperimeter.match', 'Match') : fill(t('stem.areaperimeter.off_by', 'Off by {n}'), { n: numText(off) });
        }

        var walkN = walkedUnits();
        var walkText;
        if (walkN >= perimeter && predicting) walkText = fill(t('stem.areaperimeter.walk_done_predict', 'Units walked: {n}. You are back at the start.'), { n: walkN });
        else if (walkN >= perimeter) walkText = fill(t('stem.areaperimeter.walk_done', 'Units walked: {n}. You are back at the start, so the perimeter is {n} units.'), { n: walkN });
        else walkText = fill(t('stem.areaperimeter.walk_count', 'Units walked: {n}'), { n: walkN });
        function traceNext() {
          var next = (traceStep + 1) % 5;
          var changes = { boundaryStep: next };
          if (next === 4 && !predicting) changes.perimeterSeenFor = exploreSig;
          patch(changes);
        }
        var textAlt;
        if (known.area && known.perimeter) textAlt = fill(t('stem.areaperimeter.explore_text_alt', 'The rectangle has {w} columns and {h} rows. That makes {area} unit squares inside and {p} unit lengths around the boundary.'), { w: width, h: height, area: area, p: perimeter });
        else if (known.area) textAlt = fill(t('stem.areaperimeter.explore_text_alt_area', 'The rectangle has {w} columns and {h} rows. That makes {area} unit squares inside. Walk the boundary to find the perimeter.'), { w: width, h: height, area: area });
        else if (known.perimeter) textAlt = fill(t('stem.areaperimeter.explore_text_alt_perimeter', 'The rectangle has {w} columns and {h} rows, with {p} unit lengths around the boundary. Count the squares inside to find the area.'), { w: width, h: height, p: perimeter });
        else textAlt = fill(t('stem.areaperimeter.explore_text_alt_hidden', 'The rectangle has {w} columns and {h} rows. Count the squares inside to find the area, and walk the boundary to find the perimeter.'), { w: width, h: height });
        var formulaRows = [];
        if (known.area) formulaRows.push([t('stem.areaperimeter.area', "Area"), fill(t('stem.areaperimeter.columns_times_rows', '{w} columns × {h} rows'), { w: width, h: height }), nSquareUnits(area)]);
        if (known.perimeter) formulaRows.push([t('stem.areaperimeter.perimeter', "Perimeter"), width + ' + ' + height + ' + ' + width + ' + ' + height, nUnits(perimeter)]);

        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('div', { key: 'heading', style: { display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' } }, [
              h('div', { key: 'copy' }, [
                heading(t('stem.areaperimeter.build_area_one_square_at_a_time', "Build area one square at a time")),
                h('p', { key: 'p', id: 'ap-explore-how', style: { color: COLORS.muted, margin: '6px 0 0', maxWidth: '720px' } }, t('stem.areaperimeter.explore_how', 'Click or drag across squares to paint them (Shift and an arrow key on a keyboard). Drag the walker dot along the dashed fence, or drag the corner arrow to resize.'))
              ]),
              h('div', { key: 'actions', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
                actionButton(t('stem.areaperimeter.predict_first', 'Predict first'), function() { patch(Object.assign({ predictMeasurements: !state.predictMeasurements }, PREDICTION_RESET)); }, { key: 'predict', compact: true, primary: predictOn, pressed: predictOn }),
                predicting || !revealsAllowed ? null : actionButton(t('stem.areaperimeter.reveal_all', "Reveal all"), revealAll, { key: 'reveal-all', compact: true }),
                actionButton(t('stem.areaperimeter.hide_all', "Hide all"), function(event) {
                  patch({ revealedTiles: {} });
                  speak(t('stem.areaperimeter.all_unit_squares_hidden', "All unit squares hidden."));
                  // This button is about to disable itself, which would drop focus.
                  var scope = event.currentTarget.closest('section');
                  var tile = scope && scope.querySelector('[data-ap-tile][tabindex="0"]');
                  if (tile && typeof tile.focus === 'function') tile.focus();
                }, { key: 'hide-all', compact: true, disabled: validRevealed === 0 })
              ])
            ]),
            predicting ? h('p', { key: 'prediction-prompt', id: 'ap-predict-prompt', style: { color: COLORS.text } }, t('stem.areaperimeter.prediction_prompt_entry', 'Predict the area in square units and the perimeter in units. Count tiles and trace edges if it helps, then check.')) : null,
            predicting ? h('form', { key: 'predict-form', onSubmit: checkPrediction, 'data-ap-predict-form': true, style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '12px' } }, [
              textField('ap-predict-area', t('stem.areaperimeter.predict_area_label', 'My area prediction (square units)'), state.predictArea, function(value) { patch({ predictArea: value }); }, { describedBy: 'ap-predict-prompt' }),
              textField('ap-predict-perimeter', t('stem.areaperimeter.predict_perimeter_label', 'My perimeter prediction (units)'), state.predictPerimeter, function(value) { patch({ predictPerimeter: value }); }, { describedBy: 'ap-predict-prompt' }),
              actionButton(t('stem.areaperimeter.check_my_prediction', 'Check my prediction'), null, { key: 'check-prediction', type: 'submit', primary: true, disabled: !bothReady })
            ]) : null,
            h('div', { key: 'svg', style: { marginTop: '10px' } }, rectangleSvg()),
            h('div', { key: 'prediction-controls', style: { display: 'flex', gap: 10, flexWrap: 'wrap', margin: '10px 0' } }, [
              actionButton(walkN >= perimeter ? t('stem.areaperimeter.walk_again', 'Walk the fence again') : t('stem.areaperimeter.walk_one_unit', 'Walk one unit'), walkOneUnit, { key: 'walk', compact: true, data: 'walk-step' }),
              actionButton(traceStep === 4 ? t('stem.areaperimeter.restart_trace', 'Restart boundary trace') : t('stem.areaperimeter.trace_boundary', 'Trace the next edge'), traceNext, { key: 'trace', compact: true }),
              predictOn && !predicting ? actionButton(t('stem.areaperimeter.try_new_rectangle', 'Try a new rectangle'), newRectangle, { key: 'new-rect', compact: true }) : null,
              soundButton([width, height, width, height], 'explore', predicting || !known.perimeter)
            ]),
            h('p', { key: 'walk-progress', 'data-ap-walk-status': walkN, style: { color: COLORS.text, margin: '0 0 4px', fontWeight: 700 } }, walkText),
            h('p', { key: 'trace-progress', role: 'status', 'data-boundary-progress': true, style: { color: COLORS.text, margin: '0 0 10px' } }, traceText),
            h('div', { key: 'metrics', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' } }, [
              metricCard(t('stem.areaperimeter.area', "Area"), known.area ? nSquareUnits(area) : '?', known.area ? width + ' × ' + height : t('stem.areaperimeter.area_hidden_sub', 'Paint every square to find it'), COLORS.tealDark, 'm-area'),
              metricCard(t('stem.areaperimeter.perimeter', "Perimeter"), known.perimeter ? nUnits(perimeter) : '?', known.perimeter ? '2(' + width + ' + ' + height + ')' : t('stem.areaperimeter.perimeter_hidden_sub', 'Walk the fence to find it'), COLORS.blue, 'm-perimeter'),
              metricCard(t('stem.areaperimeter.tiles_counted', "Tiles counted"), String(validRevealed), t('stem.areaperimeter.one_tile_1_square_unit', "one tile = 1 square unit"), COLORS.green, 'm-tiles')
            ]),
            cmp ? h('div', { key: 'prediction-result', 'data-ap-prediction-result': true, style: { marginTop: '14px' } }, [
              formulaTable([
                [t('stem.areaperimeter.area', 'Area'), numText(result.area), nSquareUnits(cmp.area), resultCell(cmp.areaOk, cmp.areaOff)],
                [t('stem.areaperimeter.perimeter', 'Perimeter'), numText(result.perimeter), nUnits(cmp.perimeter), resultCell(cmp.perimeterOk, cmp.perimeterOff)]
              ], t('stem.areaperimeter.prediction_vs_actual', 'Your prediction compared with the measurement'), [t('stem.areaperimeter.measure', 'Measure'), t('stem.areaperimeter.your_prediction', 'Your prediction'), t('stem.areaperimeter.actual', 'Actual'), t('stem.areaperimeter.result', 'Result')]),
              cmp.areaOk && cmp.perimeterOk
                ? note(t('stem.areaperimeter.both_match_praise', 'Both predictions match. Your reasoning about inside and around worked.'), 'good', 'pred-good')
                : note(cmp.notes.length ? cmp.notes.map(predictionNoteText).join(' ') : t('stem.areaperimeter.prediction_generic', 'Compare each guess with the measurement. Which one is about the inside, and which one is about the edge?'), 'warn', 'pred-warn'),
              h('div', { key: 'reflect', style: { marginTop: '12px' } }, [
                h('p', { key: 'q', id: 'ap-reflect-q', style: { color: COLORS.text, fontWeight: 800, margin: '0 0 8px' } }, t('stem.areaperimeter.reflect_question', 'Reflect: what helped you most, or what will you change next time?')),
                chipGroup(t('stem.areaperimeter.reflect_question', 'Reflect: what helped you most, or what will you change next time?'), REFLECTIONS, state.predictReflection, function(id) { patch({ predictReflection: id }); }, 'reflect-chips'),
                reflection ? h('p', { key: 'ack', style: { color: COLORS.text, margin: '10px 0 0' } }, reflection.ack) : null
              ])
            ]) : null,
            !predicting && h('details', { key: 'details', style: { marginTop: '14px', color: COLORS.text } }, [
              h('summary', { key: 'summary', style: { cursor: 'pointer', fontWeight: 800, minHeight: '28px' } }, t('stem.areaperimeter.view_formulas_and_text_alternative', "View formulas and text alternative")),
              h('p', { key: 'description', 'data-ap-explore-text-alt': true, style: { color: COLORS.muted } }, textAlt),
              formulaRows.length ? formulaTable(formulaRows, t('stem.areaperimeter.rectangle_measurements', "Rectangle measurements")) : null
            ])
          ], { key: 'visual', 'aria-label': t('stem.areaperimeter.interactive_rectangle_model', "Interactive rectangle model") }),
          panel([
            h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '18px' } }, [
              rangeControl(t('stem.areaperimeter.rectangle_width', "Rectangle width"), width, 1, 20, function(value) { setDimension('width', value, fill(t('stem.areaperimeter.sr_width_set', 'Width set to {n} units.'), { n: value })); }),
              rangeControl(t('stem.areaperimeter.rectangle_height', "Rectangle height"), height, 1, 16, function(value) { setDimension('height', value, fill(t('stem.areaperimeter.sr_height_set', 'Height set to {n} units.'), { n: value })); })
            ]),
            h('div', { key: 'links', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' } }, [areaModelLink(), volumeLink()])
          ], { key: 'controls' })
        ]);
      }

      function compareSummary(aw, ah, bw, bh) {
        var a = rectangleMetrics(aw, ah);
        var b = rectangleMetrics(bw, bh);
        return fill(t('stem.areaperimeter.compare_summary', 'Rectangle A is {aw} by {ah}, with area {aa} and perimeter {ap}. Rectangle B is {bw} by {bh}, with area {ba} and perimeter {bp}.'), { aw: aw, ah: ah, aa: a.area, ap: a.perimeter, bw: bw, bh: bh, ba: b.area, bp: b.perimeter });
      }

      function compareSvg() {
        var largestW = Math.max(width, compareWidth);
        var largestH = Math.max(height, compareHeight);
        var unit = Math.min(205 / largestW, 130 / largestH, 30);
        var firstW = width * unit;
        var firstH = height * unit;
        var secondW = compareWidth * unit;
        var secondH = compareHeight * unit;
        var y1 = 90 + (135 - firstH) / 2;
        var y2 = 90 + (135 - secondH) / 2;
        return h('svg', {
          key: 'compare-svg',
          viewBox: '0 0 640 310', role: 'img',
          'aria-labelledby': 'ap-compare-title ap-compare-desc',
          style: { display: 'block', width: '100%', maxHeight: '360px' }
        }, [
          h('title', { key: 'title', id: 'ap-compare-title' }, t('stem.areaperimeter.two_rectangles_compared_by_area_and_pe', "Two rectangles compared by area and perimeter")),
          h('desc', { key: 'desc', id: 'ap-compare-desc' }, compareSummary(width, height, compareWidth, compareHeight)),
          h('text', { key: 'la', x: 165, y: 37, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800 }, t('stem.areaperimeter.rectangle_a', "Rectangle A")),
          h('rect', { key: 'a', x: 165 - firstW / 2, y: y1, width: firstW, height: firstH, rx: 3, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }),
          h('text', { key: 'ad', x: 165, y: 250, textAnchor: 'middle', fill: COLORS.text, fontSize: 15 }, width + ' × ' + height),
          h('text', { key: 'lb', x: 475, y: 37, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800 }, t('stem.areaperimeter.rectangle_b', "Rectangle B")),
          h('rect', { key: 'b', x: 475 - secondW / 2, y: y2, width: secondW, height: secondH, rx: 3, fill: COLORS.shapeB, stroke: COLORS.blue, strokeWidth: 4, strokeDasharray: '10 4' }),
          h('text', { key: 'bd', x: 475, y: 250, textAnchor: 'middle', fill: COLORS.text, fontSize: 15 }, compareWidth + ' × ' + compareHeight),
          h('line', { key: 'divider', x1: 320, y1: 30, x2: 320, y2: 270, stroke: COLORS.border, strokeDasharray: '7 7' }),
          h('text', { key: 'summary', x: 320, y: 295, textAnchor: 'middle', fill: COLORS.muted, fontSize: 14 }, t('stem.areaperimeter.drawn_with_the_same_unit_scale', "Drawn with the same unit scale"))
        ]);
      }

      function compareView() {
        var areaRelation = area === compareArea ? t('stem.areaperimeter.the_areas_are_equal', "The areas are equal.")
          : fill(t('stem.areaperimeter.area_more_by', 'Rectangle {x} has {n} more square units of area.'), { x: area > compareArea ? 'A' : 'B', n: Math.abs(area - compareArea) });
        var perimeterRelation = perimeter === comparePerimeter ? t('stem.areaperimeter.the_perimeters_are_equal', "The perimeters are equal.")
          : fill(t('stem.areaperimeter.perimeter_longer_by', 'Rectangle {x} has a perimeter {n} units longer.'), { x: perimeter > comparePerimeter ? 'A' : 'B', n: Math.abs(perimeter - comparePerimeter) });
        // One announcement per change: the slider speaks the new comparison and
        // the cards below are NOT a live region (that read everything twice).
        function changeA(key, value) {
          var aw = key === 'width' ? value : width;
          var ah = key === 'height' ? value : height;
          setDimension(key, value, compareSummary(aw, ah, compareWidth, compareHeight));
        }
        function changeB(key, value) {
          var next = {};
          next[key] = value;
          patch(next);
          speak(compareSummary(width, height, key === 'compareWidth' ? value : compareWidth, key === 'compareHeight' ? value : compareHeight));
        }
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.area_and_perimeter_can_change_differen', "Area and perimeter can change differently")),
            lead(t('stem.areaperimeter.adjust_either_rectangle_compare_the_sp', "Adjust either rectangle. Compare the space inside with the distance around the edge.")),
            h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '22px' } }, [
              h('fieldset', { key: 'a', style: { border: '1px solid ' + COLORS.border, borderRadius: '12px', padding: '14px', minWidth: 0 } }, [
                h('legend', { key: 'legend', style: { color: COLORS.tealDark, fontWeight: 850, padding: '0 6px' } }, t('stem.areaperimeter.rectangle_a', "Rectangle A")),
                rangeControl(t('stem.areaperimeter.a_width', "A width"), width, 1, 20, function(value) { changeA('width', value); }),
                h('div', { key: 'gap', style: { height: '12px' } }),
                rangeControl(t('stem.areaperimeter.a_height', "A height"), height, 1, 16, function(value) { changeA('height', value); })
              ]),
              h('fieldset', { key: 'b', style: { border: '1px solid ' + COLORS.border, borderRadius: '12px', padding: '14px', minWidth: 0 } }, [
                h('legend', { key: 'legend', style: { color: COLORS.blue, fontWeight: 850, padding: '0 6px' } }, t('stem.areaperimeter.rectangle_b', "Rectangle B")),
                rangeControl(t('stem.areaperimeter.b_width', "B width"), compareWidth, 1, 20, function(value) { changeB('compareWidth', value); }),
                h('div', { key: 'gap', style: { height: '12px' } }),
                rangeControl(t('stem.areaperimeter.b_height', "B height"), compareHeight, 1, 16, function(value) { changeB('compareHeight', value); })
              ])
            ])
          ], { key: 'controls' }),
          panel([
            compareSvg(),
            h('div', { key: 'relations', 'data-ap-relations': true, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginTop: '6px' } }, [
              metricCard(t('stem.areaperimeter.area_comparison', "Area comparison"), areaRelation, fill(t('stem.areaperimeter.a_b_values', 'A: {a} | B: {b}'), { a: area, b: compareArea }), COLORS.tealDark, 'rel-area'),
              metricCard(t('stem.areaperimeter.perimeter_comparison', "Perimeter comparison"), perimeterRelation, fill(t('stem.areaperimeter.a_b_values', 'A: {a} | B: {b}'), { a: perimeter, b: comparePerimeter }), COLORS.blue, 'rel-perimeter')
            ]),
            formulaTable([
              [t('stem.areaperimeter.rectangle_a_area', "Rectangle A area"), width + ' × ' + height, nSquareUnits(area)],
              [t('stem.areaperimeter.rectangle_a_perimeter', "Rectangle A perimeter"), '2(' + width + ' + ' + height + ')', nUnits(perimeter)],
              [t('stem.areaperimeter.rectangle_b_area', "Rectangle B area"), compareWidth + ' × ' + compareHeight, nSquareUnits(compareArea)],
              [t('stem.areaperimeter.rectangle_b_perimeter', "Rectangle B perimeter"), '2(' + compareWidth + ' + ' + compareHeight + ')', nUnits(comparePerimeter)]
            ], t('stem.areaperimeter.side_by_side_measurements', "Side-by-side measurements"))
          ], { key: 'visual' })
        ]);
      }

      function compositeSvg() {
        var scale = Math.min(440 / outerWidth, 275 / outerHeight, 38);
        var x = (640 - outerWidth * scale) / 2;
        var y = 57 + (275 - outerHeight * scale) / 2;
        var points = [
          [x, y], [x + leftWidth * scale, y],
          [x + leftWidth * scale, y + notchHeight * scale],
          [x + outerWidth * scale, y + notchHeight * scale],
          [x + outerWidth * scale, y + outerHeight * scale],
          [x, y + outerHeight * scale]
        ].map(function(point) { return point[0] + ',' + point[1]; }).join(' ');
        var grid = [];
        for (var row = 0; row < outerHeight; row += 1) {
          for (var column = 0; column < outerWidth; column += 1) {
            if (column < leftWidth || row >= notchHeight) {
              grid.push(h('rect', {
                key: column + '-' + row,
                x: x + column * scale, y: y + row * scale,
                width: scale, height: scale,
                fill: (column + row) % 2 ? COLORS.tileSoft : (isContrast ? '#111111' : (isDark ? '#115e59' : '#99f6e4')),
                stroke: isContrast ? '#fbbf24' : (isDark ? '#64748b' : '#94a3b8'), strokeWidth: 0.8
              }));
            }
          }
        }
        var overlay = decomposition === 'add' ? [
          h('line', { key: 'split', x1: x + leftWidth * scale, y1: y + notchHeight * scale, x2: x + leftWidth * scale, y2: y + outerHeight * scale, stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '8 5' }),
          h('text', { key: 'one', x: x + leftWidth * scale / 2, y: y + outerHeight * scale / 2, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800 }, 'A'),
          h('text', { key: 'two', x: x + (leftWidth + outerWidth) * scale / 2, y: y + (notchHeight + outerHeight) * scale / 2, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800 }, 'B')
        ] : [
          h('rect', { key: 'cut', x: x + leftWidth * scale, y: y, width: cutWidth * scale, height: notchHeight * scale, fill: 'none', stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '8 5' }),
          h('text', { key: 'minus', x: x + (leftWidth + outerWidth) * scale / 2, y: y + notchHeight * scale / 2 + 6, fill: COLORS.red, textAnchor: 'middle', fontSize: 16, fontWeight: 800 }, t('stem.areaperimeter.subtract', "subtract"))
        ];
        return h('svg', {
          key: 'composite-svg',
          viewBox: '0 0 640 390', role: 'img',
          'aria-labelledby': 'ap-composite-title ap-composite-desc',
          style: { display: 'block', width: '100%', maxHeight: '430px' }
        }, [
          h('title', { key: 'title', id: 'ap-composite-title' }, t('stem.areaperimeter.l_shaped_composite_figure', "L-shaped composite figure")),
          h('desc', { key: 'desc', id: 'ap-composite-desc' }, fill(t('stem.areaperimeter.composite_desc', 'An L-shape inside an outer {w} by {h} rectangle with a {cw} by {ch} top-right corner removed. Its area is {area} square units and its perimeter is {p} units.'), { w: outerWidth, h: outerHeight, cw: cutWidth, ch: notchHeight, area: compositeArea, p: compositePerimeter })),
          h('polygon', { key: 'base', points: points, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 })
        ].concat(grid).concat(overlay).concat([
          h('polygon', { key: 'outline', points: points, fill: 'none', stroke: COLORS.tealDark, strokeWidth: 4 }),
          h('text', { key: 'w', x: x + outerWidth * scale / 2, y: y + outerHeight * scale + 28, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800 }, nUnits(outerWidth)),
          h('text', { key: 'h', x: x - 27, y: y + outerHeight * scale / 2, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800, transform: 'rotate(-90 ' + (x - 27) + ' ' + (y + outerHeight * scale / 2) + ')' }, nUnits(outerHeight))
        ]));
      }

      function compositeView() {
        var addOne = leftWidth * outerHeight;
        var addTwo = cutWidth * (outerHeight - notchHeight);
        var whole = outerWidth * outerHeight;
        var removed = cutWidth * notchHeight;
        function setPart(changes, message) { patch(changes); speak(message); }
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.decompose_an_l_shape', "Decompose an L-shape")),
            lead(t('stem.areaperimeter.find_the_same_area_by_adding_two_recta', "Find the same area by adding two rectangles or subtracting a missing corner.")),
            h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' } }, [
              rangeControl(t('stem.areaperimeter.outer_width', "Outer width"), outerWidth, 4, 14, function(value) {
                setPart({ outerWidth: value, leftWidth: Math.min(leftWidth, value - 1) }, fill(t('stem.areaperimeter.sr_outer_width_set', 'Outer width set to {n}.'), { n: value }));
              }),
              rangeControl(t('stem.areaperimeter.outer_height', "Outer height"), outerHeight, 4, 12, function(value) {
                setPart({ outerHeight: value, notchHeight: Math.min(notchHeight, value - 1) }, fill(t('stem.areaperimeter.sr_outer_height_set', 'Outer height set to {n}.'), { n: value }));
              }),
              rangeControl(t('stem.areaperimeter.left_section_width', "Left section width"), leftWidth, 1, outerWidth - 1, function(value) { setPart({ leftWidth: value }, fill(t('stem.areaperimeter.sr_left_width_set', 'Left section width set to {n}.'), { n: value })); }),
              rangeControl(t('stem.areaperimeter.notch_height', "Notch height"), notchHeight, 1, outerHeight - 1, function(value) { setPart({ notchHeight: value }, fill(t('stem.areaperimeter.sr_notch_height_set', 'Notch height set to {n}.'), { n: value })); })
            ]),
            h('div', { key: 'methods', role: 'group', 'aria-label': t('stem.areaperimeter.decomposition_strategy', "Decomposition strategy"), style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginTop: '18px' } }, [
              actionButton(t('stem.areaperimeter.add_two_rectangles', "Add two rectangles"), function() {
                var used = Object.assign({}, state.compositeMethods || {}, { add: true });
                setPart({ decomposition: 'add', compositeMethods: used }, t('stem.areaperimeter.add_two_rectangles_strategy_selected', "Add two rectangles strategy selected."));
              }, { key: 'add', primary: decomposition === 'add', pressed: decomposition === 'add' }),
              actionButton(t('stem.areaperimeter.subtract_the_corner', "Subtract the corner"), function() {
                var used = Object.assign({}, state.compositeMethods || {}, { subtract: true });
                setPart({ decomposition: 'subtract', compositeMethods: used }, t('stem.areaperimeter.subtract_the_corner_strategy_selected', "Subtract the corner strategy selected."));
              }, { key: 'subtract', primary: decomposition === 'subtract', pressed: decomposition === 'subtract' })
            ])
          ], { key: 'controls' }),
          panel([
            compositeSvg(),
            h('div', { key: 'metrics', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' } }, [
              metricCard(t('stem.areaperimeter.composite_area', "Composite area"), nSquareUnits(compositeArea), decomposition === 'add' ? addOne + ' + ' + addTwo : whole + ' - ' + removed, COLORS.tealDark, 'c-area'),
              metricCard(t('stem.areaperimeter.outer_boundary', "Outer boundary"), nUnits(compositePerimeter), composite.boundaryEdges.join(' + '), COLORS.blue, 'c-perimeter')
            ]),
            h('div', { key: 'reason', style: { marginTop: '14px', padding: '14px', borderRadius: '12px', background: COLORS.panelAlt, color: COLORS.text, border: '1px solid ' + COLORS.border } }, decomposition === 'add'
              ? h('p', { style: { margin: 0 } }, [h('strong', { key: 'b' }, t('stem.areaperimeter.add_strategy_label', 'Add strategy')), ' ', fill(t('stem.areaperimeter.add_strategy_text', 'Rectangle A is {aw} × {ah} = {a1}. Rectangle B is {bw} × {bh} = {a2}. Together they make {total} square units.'), { aw: leftWidth, ah: outerHeight, a1: addOne, bw: cutWidth, bh: outerHeight - notchHeight, a2: addTwo, total: compositeArea })])
              : h('p', { style: { margin: 0 } }, [h('strong', { key: 'b' }, t('stem.areaperimeter.subtract_strategy_label', 'Subtract strategy')), ' ', fill(t('stem.areaperimeter.subtract_strategy_text', 'Start with {w} × {h} = {whole}. Remove {cw} × {ch} = {removed}. The L-shape has {total} square units.'), { w: outerWidth, h: outerHeight, whole: whole, cw: cutWidth, ch: notchHeight, removed: removed, total: compositeArea })])),
            h('div', { key: 'sound', style: { marginTop: '12px' } }, soundButton(composite.boundaryEdges, 'composite', false)),
            note(t('stem.areaperimeter.corner_perimeter_note', 'Cutting a corner removes area but keeps the perimeter the same: the two new edges are exactly as long as the two edges they replace. Try a notch in the middle of a side in the Same Fence Lab.'), 'info', 'corner-note'),
            formulaTable([
              [t('stem.areaperimeter.whole_rectangle', "Whole rectangle"), outerWidth + ' × ' + outerHeight, nSquareUnits(whole)],
              [t('stem.areaperimeter.missing_corner', "Missing corner"), cutWidth + ' × ' + notchHeight, nSquareUnits(removed)],
              [t('stem.areaperimeter.l_shape_area', "L-shape area"), whole + ' - ' + removed, nSquareUnits(compositeArea)],
              [t('stem.areaperimeter.l_shape_perimeter', "L-shape perimeter"), t('stem.areaperimeter.sum_all_6_outside_edges', "sum all 6 outside edges"), nUnits(compositePerimeter)]
            ], t('stem.areaperimeter.composite_shape_measurements', "Composite-shape measurements"))
          ], { key: 'visual' })
        ]);
      }

      function factorSvg(pairs) {
        var rowHeight = 94;
        var svgHeight = 38 + pairs.length * rowHeight;
        var shapes = [];
        var minP = Math.min.apply(null, pairs.map(function(pair) { return pair.p; }));
        var maxWidth = Math.max.apply(null, pairs.map(function(pair) { return pair.w; }));
        var maxHeight = Math.max.apply(null, pairs.map(function(pair) { return pair.h; }));
        var sharedUnit = Math.min(350 / maxWidth, 54 / maxHeight, 25);
        pairs.forEach(function(pair, index) {
          var unit = sharedUnit;
          var w = pair.w * unit;
          var hgt = pair.h * unit;
          var y = 28 + index * rowHeight + (56 - hgt) / 2;
          var least = pair.p === minP;
          shapes.push(h('g', { key: pair.w + 'x' + pair.h }, [
            h('text', { key: 'name', x: 18, y: 28 + index * rowHeight + 32, fill: COLORS.text, fontSize: 16, fontWeight: 800 }, pair.w + ' × ' + pair.h),
            h('rect', { key: 'rect', x: 120, y: y, width: w, height: hgt, 'data-factor-pair': pair.w + 'x' + pair.h, 'data-square-unit': unit, fill: least ? (isContrast ? '#000000' : (isDark ? '#14532d' : '#dcfce7')) : COLORS.tileSoft, stroke: least ? COLORS.green : COLORS.teal, strokeWidth: 3 }),
            h('text', { key: 'p', x: 500, y: 28 + index * rowHeight + 32, fill: least ? COLORS.green : COLORS.muted, fontSize: 15, fontWeight: 700 }, least
              ? fill(t('stem.areaperimeter.p_value_least', 'P = {p} (least)'), { p: pair.p })
              : fill(t('stem.areaperimeter.p_value', 'P = {p}'), { p: pair.p }))
          ]));
        });
        return h('svg', {
          key: 'factor-svg',
          viewBox: '0 0 640 ' + svgHeight,
          role: 'img',
          'aria-labelledby': 'ap-factors-title ap-factors-desc',
          style: { display: 'block', width: '100%', maxHeight: '480px' }
        }, [
          h('title', { key: 'title', id: 'ap-factors-title' }, fill(t('stem.areaperimeter.rectangles_with_area_n', 'Rectangles with area {n}'), { n: targetArea })),
          h('desc', { key: 'desc', id: 'ap-factors-desc' }, pairs.map(function(pair) { return fill(t('stem.areaperimeter.factor_pair_sentence', 'A {w} by {h} rectangle has perimeter {p}.'), { w: pair.w, h: pair.h, p: pair.p }); }).concat([fill(t('stem.areaperimeter.all_have_area_n', 'All of them have area {n}.'), { n: targetArea })]).join(' '))
        ].concat(shapes));
      }

      function constructionPanel() {
        var w = Math.max(1, Math.min(targetArea, Math.round(Number(state.buildWidth) || 1)));
        var ht = Math.max(1, Math.min(targetArea, Math.round(Number(state.buildHeight) || 1)));
        var builtArea = w * ht;
        var collection = (state.constructedRectangles || {})[targetArea] || [];
        var seen = {};
        var saved = (Array.isArray(collection) ? collection : []).filter(function(pair) {
          if (!pair) return false;
          var key = Math.min(pair.w, pair.h) + ':' + Math.max(pair.w, pair.h);
          if (pair.w * pair.h !== targetArea || seen[key]) return false;
          seen[key] = true; return true;
        });
        var signature = targetArea + ':' + w + ':' + ht;
        var feedbackId = state.buildFeedbackKey === signature ? state.buildFeedbackId : '';
        var feedbackText = feedbackId === 'small' ? t('stem.areaperimeter.build_too_small', 'Too few squares. Increase a side length and try again.')
          : feedbackId === 'large' ? t('stem.areaperimeter.build_too_large', 'Too many squares. Decrease a side length and try again.')
          : feedbackId === 'duplicate' ? t('stem.areaperimeter.build_duplicate', 'You already saved this rectangle. Turning it does not change its area or perimeter.')
          : feedbackId === 'saved' ? t('stem.areaperimeter.build_saved', 'Rectangle saved. Try different side lengths with the same area.')
          : (state.buildFeedbackKey === signature && typeof state.buildFeedback === 'string' ? state.buildFeedback : '');
        var unit = Math.min(420 / w, 220 / ht, 40);
        var savedWidth = Math.max.apply(null, [1].concat(saved.map(function(pair) { return Math.max(pair.w, pair.h); })));
        var savedHeight = Math.max.apply(null, [1].concat(saved.map(function(pair) { return Math.min(pair.w, pair.h); })));
        function saveRectangle() {
          var key = Math.min(w, ht) + ':' + Math.max(w, ht);
          var id;
          if (builtArea !== targetArea) id = builtArea < targetArea ? 'small' : 'large';
          else if (seen[key]) id = 'duplicate';
          else {
            var collections = Object.assign({}, state.constructedRectangles || {});
            collections[targetArea] = saved.concat([{ w: w, h: ht }]);
            patch({ constructedRectangles: collections });
            id = 'saved';
          }
          patch({ buildFeedbackKey: signature, buildFeedbackId: id, buildFeedback: null });
        }
        var equation = fill(t('stem.areaperimeter.built_equation', '{w} × {h} = {a} square units'), { w: w, h: ht, a: builtArea });
        return panel([
          h('h3', { key: 'title', style: { color: COLORS.text, fontWeight: 850, margin: 0 } }, t('stem.areaperimeter.build_same_area', 'Build your own equal-area rectangles')),
          h('p', { key: 'prompt', style: { color: COLORS.muted } }, t('stem.areaperimeter.build_prompt', 'Make a rectangle with the target area, then save it. Can another rectangle use the same number of squares but need less fence?')),
          h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 } }, [
            rangeControl(t('stem.areaperimeter.build_width', 'Build width'), w, 1, targetArea, function(value) { patch({ buildWidth: value }); }),
            rangeControl(t('stem.areaperimeter.build_height', 'Build height'), ht, 1, targetArea, function(value) { patch({ buildHeight: value }); })]),
          h('div', { key: 'model', style: { overflowX: 'auto', margin: '12px 0' } },
            h('svg', { viewBox: '0 0 ' + (w * unit + 65) + ' ' + (ht * unit + 55), role: 'img', 'aria-label': equation, style: { display: 'block', width: '100%', maxHeight: 330 }, 'data-built-rectangle': true },
              h('defs', null, h('pattern', { id: 'ap-build-grid', width: unit, height: unit, patternUnits: 'userSpaceOnUse', x: 35, y: 30 }, h('rect', { width: unit, height: unit, fill: COLORS.tileSoft, stroke: COLORS.tealDark, strokeWidth: .6 }))),
              h('rect', { x: 35, y: 30, width: w * unit, height: ht * unit, fill: 'url(#ap-build-grid)', stroke: COLORS.tealDark, strokeWidth: 2 }),
              h('text', { x: 35 + w * unit / 2, y: 20, textAnchor: 'middle', fill: COLORS.text, fontSize: 16, fontWeight: 800 }, w),
              h('text', { x: 23, y: 35 + ht * unit / 2, textAnchor: 'end', fill: COLORS.text, fontSize: 16, fontWeight: 800 }, ht))),
          h('p', { key: 'equation', style: { color: COLORS.text, fontWeight: 800 } }, equation,
            h('span', { style: { display: 'block', fontWeight: 400 } }, fill(t('stem.areaperimeter.target_area_line', 'Target area: {n} square units'), { n: targetArea }))),
          actionButton(t('stem.areaperimeter.save_rectangle', 'Check and save rectangle'), saveRectangle, { key: 'save', primary: true }),
          h('p', { key: 'feedback', role: 'status', style: { color: COLORS.text, minHeight: 24 } }, feedbackText),
          h('h4', { key: 'saved-title', style: { color: COLORS.text, fontWeight: 800 } }, fill(t('stem.areaperimeter.your_rectangles_n', 'Your rectangles ({n})'), { n: saved.length })),
          !saved.length && h('p', { key: 'empty', style: { color: COLORS.muted } }, t('stem.areaperimeter.no_rectangles_yet', 'Your saved rectangles will appear here for comparison.')),
          h('ul', { key: 'saved', 'data-saved-rectangles': true, style: { paddingLeft: 20, color: COLORS.text } }, saved.map(function(pair, i) {
            var longSide = Math.max(pair.w, pair.h), shortSide = Math.min(pair.w, pair.h);
            return h('li', { key: i, style: { marginTop: 16 } },
              h('svg', { viewBox: '0 0 ' + (savedWidth * 20 + 10) + ' ' + (savedHeight * 20 + 10), role: 'img',
                'aria-label': fill(t('stem.areaperimeter.saved_scale_label', 'A {l} × {s} rectangle. Saved models use the same size unit square.'), { l: longSide, s: shortSide }),
                style: { width: '100%', maxWidth: savedWidth * 20 + 10, display: 'block', marginBottom: 6 }, 'data-saved-model': true },
                h('defs', null, h('pattern', { id: 'ap-saved-grid-' + i, width: 20, height: 20, x: 5, y: 5, patternUnits: 'userSpaceOnUse' }, h('rect', { width: 20, height: 20, fill: COLORS.tileSoft, stroke: COLORS.tealDark, strokeWidth: .8 }))),
                h('rect', { x: 5, y: 5, width: longSide * 20, height: shortSide * 20, fill: 'url(#ap-saved-grid-' + i + ')', stroke: COLORS.tealDark, strokeWidth: 2 })),
              fill(t('stem.areaperimeter.saved_rect_text', '{w} × {h}: {a} square units. Perimeter = 2({w} + {h}) = {p} units.'), { w: pair.w, h: pair.h, a: targetArea, p: 2 * (pair.w + pair.h) }));
          })),
          saved.length > 1 && h('p', { key: 'compare', style: { color: COLORS.text, fontWeight: 700 } }, t('stem.areaperimeter.compare_saved', 'Compare your perimeters. What changed when the side lengths became closer together?'))
        ], { key: 'construction' });
      }

      function investigationView() {
        var pairs = factorPairs(targetArea);
        var smallest = pairs.slice().sort(function(a, b) { return a.p - b.p; })[0];
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.same_area_different_perimeter', "Same area, different perimeter")),
            lead(t('stem.areaperimeter.investigate_build_intro', 'Build rectangles with the same area. Compare how much boundary each shape needs, then explore the complete set of rectangles.')),
            h('div', { key: 'targets', role: 'group', 'aria-label': t('stem.areaperimeter.target_area', "Target area"), style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [12, 18, 24, 30, 36].map(function(value) {
              return actionButton(fill(t('stem.areaperimeter.area_n', 'Area {n}'), { n: value }), function() {
                var explored = Object.assign({}, state.targetsExplored || {});
                explored[value] = true;
                patch({ targetArea: value, targetsExplored: explored });
                speak(fill(t('stem.areaperimeter.sr_target_selected', 'Target area {n} selected.'), { n: value }));
              }, { key: 'target-' + value, primary: targetArea === value, pressed: targetArea === value, compact: true });
            }))
          ], { key: 'controls' }),
          constructionPanel(),
          h('details', { key: 'reference', style: { color: COLORS.text } },
            h('summary', { style: { cursor: 'pointer', fontWeight: 800, padding: 12 } }, t('stem.areaperimeter.all_rectangles', 'Compare all rectangles and explanations')),
          panel([
            factorSvg(pairs),
            h('div', { key: 'insight', style: { padding: '14px', borderRadius: '12px', border: '1px solid ' + COLORS.border, background: COLORS.panelAlt, color: COLORS.text } }, [
              h('strong', { key: 'lead', style: { color: COLORS.green } }, t('stem.areaperimeter.pattern_spotted_label', 'Pattern spotted')),
              ' ',
              fill(t('stem.areaperimeter.pattern_spotted_text', 'For area {n}, the {w} × {h} rectangle has the least perimeter ({p} units) because its side lengths are closest together.'), { n: targetArea, w: smallest.w, h: smallest.h, p: smallest.p })
            ]),
            h('div', { key: 'table', role: 'region', tabIndex: 0, 'aria-label': fill(t('stem.areaperimeter.factor_pair_caption', 'Factor-pair rectangles for area {n}'), { n: targetArea }), className: 'focus:outline-none focus:ring-2 focus:ring-teal-500', style: { overflowX: 'auto', marginTop: '14px' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.text, minWidth: '470px' } }, [
                h('caption', { key: 'cap', style: { textAlign: 'left', fontWeight: 800, marginBottom: '8px' } }, fill(t('stem.areaperimeter.factor_pair_caption', 'Factor-pair rectangles for area {n}'), { n: targetArea })),
                h('thead', { key: 'head' }, h('tr', null, [t('stem.areaperimeter.dimensions', "Dimensions"), t('stem.areaperimeter.area', "Area"), t('stem.areaperimeter.perimeter', "Perimeter"), t('stem.areaperimeter.observation', "Observation")].map(function(item, index) {
                  return h('th', { key: index, scope: 'col', style: { padding: '9px', borderBottom: '2px solid ' + COLORS.border, textAlign: 'left' } }, item);
                }))),
                h('tbody', { key: 'body' }, pairs.map(function(pair) {
                  return h('tr', { key: pair.w + '-' + pair.h }, [
                    h('th', { key: 'd', scope: 'row', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border, textAlign: 'left' } }, pair.w + ' × ' + pair.h),
                    h('td', { key: 'a', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border } }, nSquareUnits(targetArea)),
                    h('td', { key: 'p', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border } }, nUnits(pair.p)),
                    h('td', { key: 'o', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border, color: pair.p === smallest.p ? COLORS.green : COLORS.muted, fontWeight: pair.p === smallest.p ? 800 : 400 } }, pair.p === smallest.p ? t('stem.areaperimeter.least_perimeter', "Least perimeter") : t('stem.areaperimeter.longer_boundary', "Longer boundary"))
                  ]);
                }))
              ])
            )
          ], { key: 'visual' }))
        ]);
      }

      // ── Same Fence Lab: the other half of 3.MD.8 ──
      var FENCE_LENGTHS = [12, 16, 20, 24, 28];
      function plainMap(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }

      function gridShapeSvg(opts) {
        // opts: w, h, cut (notchMetrics result or null), title, desc, key, highlight
        var W = opts.w, H = opts.h, m = opts.cut;
        var scale = Math.min(480 / W, 220 / H, 34);
        var x0 = (640 - W * scale) / 2, y0 = 40;
        function P(u, v) { return (x0 + u * scale) + ',' + (y0 + v * scale); }
        var cells = [];
        var cutCols = [-1, -1], cutRows = 0;
        if (m && m.valid && m.cut === 'middle') { cutCols = [m.left, m.left + m.cutWidth]; cutRows = m.cutDepth; }
        if (m && m.valid && m.cut === 'corner') { cutCols = [W - m.cutWidth, W]; cutRows = m.cutDepth; }
        for (var r = 0; r < H; r += 1) {
          for (var c = 0; c < W; c += 1) {
            if (r < cutRows && c >= cutCols[0] && c < cutCols[1]) continue;
            cells.push(h('rect', { key: c + '-' + r, x: x0 + c * scale, y: y0 + r * scale, width: scale, height: scale, fill: COLORS.tileSoft, stroke: GRID_STROKE, strokeWidth: 0.7 }));
          }
        }
        var outline;
        var newEdges = [];
        if (m && m.valid && m.cut === 'middle') {
          var L = m.left, cw = m.cutWidth, cd = m.cutDepth;
          outline = [P(0, 0), P(L, 0), P(L, cd), P(L + cw, cd), P(L + cw, 0), P(W, 0), P(W, H), P(0, H)].join(' ');
          newEdges = [[P(L, 0), P(L, cd)], [P(L + cw, cd), P(L + cw, 0)]];
          cells.push(h('rect', { key: 'gone', x: x0 + L * scale, y: y0, width: cw * scale, height: cd * scale, fill: 'none', stroke: COLORS.red, strokeWidth: 2, strokeDasharray: '4 4' }));
        } else if (m && m.valid && m.cut === 'corner') {
          var cw2 = m.cutWidth, cd2 = m.cutDepth;
          outline = [P(0, 0), P(W - cw2, 0), P(W - cw2, cd2), P(W, cd2), P(W, H), P(0, H)].join(' ');
          newEdges = [[P(W - cw2, 0), P(W - cw2, cd2)], [P(W - cw2, cd2), P(W, cd2)]];
          cells.push(h('rect', { key: 'gone', x: x0 + (W - cw2) * scale, y: y0, width: cw2 * scale, height: cd2 * scale, fill: 'none', stroke: COLORS.red, strokeWidth: 2, strokeDasharray: '4 4' }));
        } else {
          outline = [P(0, 0), P(W, 0), P(W, H), P(0, H)].join(' ');
        }
        var edgeMarks = opts.highlight ? newEdges.map(function(edge, i) {
          var a = edge[0].split(','), b = edge[1].split(',');
          return h('line', { key: 'new-' + i, x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: COLORS.ghost, strokeWidth: 7, strokeDasharray: '10 5', strokeLinecap: 'round', 'data-ap-new-edge': true });
        }) : [];
        return h('svg', { key: opts.key, viewBox: '0 0 640 ' + (y0 + H * scale + 50), role: 'img', 'aria-labelledby': opts.key + '-title ' + opts.key + '-desc', style: { display: 'block', width: '100%', maxHeight: '340px' } }, [
          h('title', { key: 'title', id: opts.key + '-title' }, opts.title),
          h('desc', { key: 'desc', id: opts.key + '-desc' }, opts.desc)
        ].concat(cells).concat([
          h('polygon', { key: 'outline', points: outline, fill: 'none', stroke: COLORS.blue, strokeWidth: 4, strokeLinejoin: 'round' })
        ]).concat(edgeMarks).concat([
          h('text', { key: 'wl', x: x0 + W * scale / 2, y: y0 + H * scale + 28, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, nUnits(W)),
          h('text', { key: 'hl', x: x0 - 12, y: y0 + H * scale / 2 + 6, textAnchor: 'end', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, String(H))
        ]));
      }

      function fenceView() {
        var P = FENCE_LENGTHS.indexOf(Number(state.fenceP)) >= 0 ? Number(state.fenceP) : 20;
        var half = P / 2;
        var fw = clamp(state.fenceW == null ? 2 : state.fenceW, 1, half - 1);
        var fh = half - fw;
        var fArea = fw * fh;
        var claims = plainMap(state.fenceClaims);
        var claim = ['long', 'square', 'same'].indexOf(claims[P]) >= 0 ? claims[P] : '';
        var recordsAll = plainMap(state.fenceRecords);
        var records = (Array.isArray(recordsAll[P]) ? recordsAll[P] : []).map(Number).filter(function(w) { return w >= 1 && w < half && Math.round(w) === w; });
        var shapeKeys = {};
        records = records.filter(function(w) { var k = Math.min(w, half - w); if (shapeKeys[k]) return false; shapeKeys[k] = true; return true; });
        var checkedMap = plainMap(state.fenceChecked);
        var checkedNow = state.fenceCheckedFor === P + ':' + claim && !!claim;
        var alreadyRecorded = !!shapeKeys[Math.min(fw, fh)];

        function setFence(changes, message) { patch(changes); speak(message); }
        // Areas show as soon as a claim is made, so the first claim for this
        // fence is the one the reward counts (switching later earns nothing).
        var claimLocks = plainMap(state.fenceClaimLocks);
        function pickClaim(id) {
          var next = Object.assign({}, claims); next[P] = id;
          var changes = { fenceClaims: next, fenceCheckedFor: '' };
          if (!claimLocks[P]) { changes.fenceClaimLocks = Object.assign({}, claimLocks); changes.fenceClaimLocks[P] = claim || id; }
          setFence(changes, t('stem.areaperimeter.sr_claim_saved', 'Claim saved. Now collect evidence: try different widths and record them.'));
        }
        function recordRect() {
          if (!claim || alreadyRecorded) return;
          var next = Object.assign({}, recordsAll); next[P] = records.concat([fw]);
          setFence({ fenceRecords: next }, fill(t('stem.areaperimeter.sr_recorded', 'Recorded: {w} by {h} holds {a} square units.'), { w: fw, h: fh, a: fArea }));
        }
        function checkClaim() {
          if (!claim || records.length < 3) return;
          var locked = ['long', 'square', 'same'].indexOf(claimLocks[P]) >= 0 ? claimLocks[P] : '';
          var first = checkedMap[P] ? checkedMap[P] : (locked || claim);
          var nextChecked = Object.assign({}, checkedMap); nextChecked[P] = first;
          var award = first === 'square' && claim === 'square' && !plainMap(state.fenceAwarded)[P];
          var changes = { fenceChecked: nextChecked, fenceCheckedFor: P + ':' + claim };
          if (award) { changes.fenceAwarded = Object.assign({}, plainMap(state.fenceAwarded)); changes.fenceAwarded[P] = true; }
          patch(changes);
          if (award) awardXP('areaPerimeter', 5, t('stem.areaperimeter.xp_fence_claim', 'Same Fence Lab claim'));
          // The result is announced once, by the status region that shows it.
        }
        var CLAIMS = [
          { id: 'long', label: t('stem.areaperimeter.claim_long', 'Long and thin holds the most') },
          { id: 'square', label: t('stem.areaperimeter.claim_square', 'Closest to a square holds the most') },
          { id: 'same', label: t('stem.areaperimeter.claim_same', 'They all hold the same area') }
        ];
        var sorted = records.map(function(w) { return { w: w, h: half - w, area: w * (half - w) }; }).sort(function(a, b) { return a.area - b.area; });
        var best = sorted[sorted.length - 1];
        var claimFeedback = null;
        if (checkedNow && best) {
          if (claim === 'square') claimFeedback = note(fill(t('stem.areaperimeter.claim_square_ok', 'Your evidence supports your claim. Of the rectangles you recorded, the {w} by {h} one is closest to a square, and it holds the most: {a} square units.'), { w: best.w, h: best.h, a: best.area }), 'good', 'claim-fb', { 'data-ap-claim-result': 'supported' });
          else if (claim === 'same') claimFeedback = note(mistakeMessage('same_perimeter_same_area') + ' ' + fill(t('stem.areaperimeter.claim_same_evidence', 'Look at the Area column: every rectangle uses {P} units of fence, but the areas are different.'), { P: P }), 'warn', 'claim-fb', { 'data-ap-claim-result': 'misconception' });
          else claimFeedback = note(t('stem.areaperimeter.claim_long_evidence', 'Look at your table: the long, thin rectangles hold the least area. Which shape holds the most?'), 'warn', 'claim-fb', { 'data-ap-claim-result': 'not-supported' });
        }

        // Notch / corner cut on the current rectangle.
        var cut = ['corner', 'middle'].indexOf(state.fenceCut) >= 0 ? state.fenceCut : 'none';
        var maxCutW = cut === 'middle' ? fw - 2 : fw - 1;
        var nm = notchMetrics(fw, fh, state.fenceCutW == null ? 1 : state.fenceCutW, state.fenceCutD == null ? 1 : state.fenceCutD, cut);
        var predictions = plainMap(state.notchPredictions);
        var predicted = cut !== 'none' && ['up', 'same', 'down'].indexOf(predictions[cut]) >= 0 ? predictions[cut] : '';
        var truth = cut === 'middle' ? 'up' : 'same';
        var showCutResult = cut === 'none' || (!!predicted && nm.valid);
        var PREDICT_CHOICES = [
          { id: 'up', label: t('stem.areaperimeter.notch_up', 'The perimeter goes up') },
          { id: 'same', label: t('stem.areaperimeter.notch_same', 'The perimeter stays the same') },
          { id: 'down', label: t('stem.areaperimeter.notch_down', 'The perimeter goes down') }
        ];
        var cutDesc = cut === 'none'
          ? fill(t('stem.areaperimeter.fence_desc', 'A {w} by {h} rectangle made with {P} units of fence.'), { w: fw, h: fh, P: P })
          : !nm.valid ? t('stem.areaperimeter.notch_invalid', 'This rectangle is too narrow to cut. Make it at least 3 units wide and 2 units tall.')
          : cut === 'corner'
            ? fill(t('stem.areaperimeter.notch_desc_corner', 'A {w} by {h} rectangle with a {cw} by {cd} piece cut from the top-right corner.'), { w: fw, h: fh, cw: nm.cutWidth, cd: nm.cutDepth })
            : fill(t('stem.areaperimeter.notch_desc_middle', 'A {w} by {h} rectangle with a {cw} by {cd} notch cut from the middle of the top side.'), { w: fw, h: fh, cw: nm.cutWidth, cd: nm.cutDepth });
        var cutResult = null;
        if (cut !== 'none' && nm.valid && predicted) {
          var removed = fArea - nm.area;
          var resultText = cut === 'corner'
            ? fill(t('stem.areaperimeter.notch_result_corner', 'Perimeter: {p} units, the same as before. The two new edges ({cd} down and {cw} across) are exactly as long as the edges they replace. Area: {a} square units, which is {r} fewer.'), { p: nm.perimeter, cd: nm.cutDepth, cw: nm.cutWidth, a: nm.area, r: removed })
            : fill(t('stem.areaperimeter.notch_result_middle', 'Perimeter: {p} units, which is {added} more than before. The notch adds two new inner walls, each {cd} units deep. Area: {a} square units, which is {r} fewer.'), { p: nm.perimeter, added: nm.added, cd: nm.cutDepth, a: nm.area, r: removed });
          var predictionLine = predicted === truth ? t('stem.areaperimeter.notch_predict_right', 'Your prediction was right.')
            : predicted === 'down' ? t('stem.areaperimeter.notch_predict_down', 'Taking away area does not have to shorten the boundary. Trace the highlighted new edges.')
            : t('stem.areaperimeter.notch_predict_other', 'That is not what you predicted. Trace the highlighted new edges to see why.');
          cutResult = h('div', { key: 'cut-result', 'data-ap-notch-result': cut }, [
            note(predictionLine + ' ' + resultText, predicted === truth ? 'good' : 'warn', 'cut-note'),
            formulaTable([
              [t('stem.areaperimeter.before_cut', 'Before the cut'), (2 * half) + ' = 2(' + fw + ' + ' + fh + ')', nSquareUnits(fArea)],
              [t('stem.areaperimeter.after_cut', 'After the cut'), nm.edges.join(' + ') + ' = ' + nm.perimeter, nSquareUnits(nm.area)]
            ], t('stem.areaperimeter.cut_table_caption', 'Perimeter and area before and after the cut'), [t('stem.areaperimeter.shape', 'Shape'), t('stem.areaperimeter.edges_perimeter', 'Edges added up (perimeter)'), t('stem.areaperimeter.area', 'Area')])
          ]);
        }

        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.fence_heading', 'Same fence, different gardens')),
            lead(fill(t('stem.areaperimeter.fence_intro', 'You have {P} units of fence. Every rectangle here uses all of it. Does the space inside stay the same?'), { P: P })),
            chipGroup(t('stem.areaperimeter.fence_length', 'Fence length'), FENCE_LENGTHS.map(function(len) { return { id: len, label: fill(t('stem.areaperimeter.fence_n_units', '{n} units of fence'), { n: len }) }; }), P, function(len) {
              setFence({ fenceP: len, fenceW: Math.min(fw, len / 2 - 1) }, fill(t('stem.areaperimeter.sr_fence_set', 'Fence length set to {n} units.'), { n: len }));
            }, 'fence-lengths'),
            h('div', { key: 'claim', style: { marginTop: '16px' } }, [
              h('h3', { key: 'h', style: { color: COLORS.text, fontSize: '1.05rem', margin: '0 0 8px' } }, t('stem.areaperimeter.step_claim', 'Step 1. Claim')),
              h('p', { key: 'q', style: { color: COLORS.text, margin: '0 0 8px' } }, t('stem.areaperimeter.claim_question', 'Before you measure: with the same fence, which garden holds the most area?')),
              chipGroup(t('stem.areaperimeter.claim_question', 'Before you measure: with the same fence, which garden holds the most area?'), CLAIMS, claim, pickClaim, 'claims')
            ])
          ], { key: 'fence-top' }),
          panel([
            h('h3', { key: 'h', style: { color: COLORS.text, fontSize: '1.05rem', margin: '0 0 8px' } }, t('stem.areaperimeter.step_evidence', 'Step 2. Evidence')),
            rangeControl(t('stem.areaperimeter.garden_width', 'Garden width'), fw, 1, half - 1, function(value) {
              var vh = half - value;
              setFence({ fenceW: value }, claim
                ? fill(t('stem.areaperimeter.sr_garden_size_area', 'Width {w}, height {h}. It holds {a} square units.'), { w: value, h: vh, a: value * vh })
                : fill(t('stem.areaperimeter.sr_garden_size', 'Width {w}, height {h}.'), { w: value, h: vh }));
            }),
            gridShapeSvg({ key: 'ap-fence-svg', w: fw, h: fh, cut: null, title: fill(t('stem.areaperimeter.fence_title', '{w} by {h} garden'), { w: fw, h: fh }),
              desc: claim ? fill(t('stem.areaperimeter.fence_desc_area', 'A {w} by {h} rectangle made with {P} units of fence. It holds {a} square units.'), { w: fw, h: fh, P: P, a: fArea }) : fill(t('stem.areaperimeter.fence_desc', 'A {w} by {h} rectangle made with {P} units of fence.'), { w: fw, h: fh, P: P }) }),
            h('div', { key: 'metrics', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' } }, [
              metricCard(t('stem.areaperimeter.perimeter', 'Perimeter'), nUnits(P), '2(' + fw + ' + ' + fh + ')', COLORS.blue, 'f-p'),
              metricCard(t('stem.areaperimeter.area', 'Area'), claim ? nSquareUnits(fArea) : '?', claim ? fw + ' × ' + fh : t('stem.areaperimeter.claim_first', 'Make a claim first'), COLORS.tealDark, 'f-a')
            ]),
            h('div', { key: 'record', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } }, [
              actionButton(t('stem.areaperimeter.record_rectangle', 'Record this rectangle'), recordRect, { key: 'record', primary: true, compact: true, disabled: !claim || alreadyRecorded }),
              alreadyRecorded && claim ? h('span', { key: 'dup', style: { alignSelf: 'center', color: COLORS.muted } }, t('stem.areaperimeter.already_recorded', 'This shape is already in your table. Turning it does not change it.')) : null
            ]),
            records.length ? formulaTable(sorted.map(function(row) {
              return [row.w + ' × ' + row.h, nUnits(P), nSquareUnits(row.area)];
            }), fill(t('stem.areaperimeter.fence_table_caption', 'Rectangles with {P} units of fence, from least to most area'), { P: P }), [t('stem.areaperimeter.dimensions', 'Dimensions'), t('stem.areaperimeter.perimeter', 'Perimeter'), t('stem.areaperimeter.area', 'Area')]) : null,
            h('h3', { key: 'h3', style: { color: COLORS.text, fontSize: '1.05rem', margin: '16px 0 8px' } }, t('stem.areaperimeter.step_reasoning', 'Step 3. Check your claim and reason')),
            h('p', { key: 'need', style: { color: COLORS.muted, margin: '0 0 8px' } }, records.length >= 3 ? t('stem.areaperimeter.ready_to_check', 'You have enough evidence. Check your claim against it.') : fill(t('stem.areaperimeter.need_records', 'Record at least 3 different rectangles. You have {n}.'), { n: records.length })),
            actionButton(t('stem.areaperimeter.check_claim', 'Check my claim'), checkClaim, { key: 'check-claim', compact: true, primary: records.length >= 3, disabled: !claim || records.length < 3 }),
            h('div', { key: 'claim-out', role: 'status' }, claimFeedback),
            checkedNow ? h('p', { key: 'reason', style: { color: COLORS.text, marginTop: '10px', lineHeight: 1.5 } }, t('stem.areaperimeter.fence_reasoning', 'Reasoning: a long, thin rectangle spends most of its fence on two long sides, so it is only a few squares wide. When the sides are closer together, more unit squares fit inside the same fence.')) : null
          ], { key: 'fence-evidence' }),
          panel([
            heading(t('stem.areaperimeter.cut_heading', 'Cut a piece out'), 'cut-h'),
            lead(t('stem.areaperimeter.cut_intro', 'Cutting out a piece always lowers the area. Does it change the perimeter? It depends on where you cut.'), 'cut-p'),
            chipGroup(t('stem.areaperimeter.cut_type', 'Where to cut'), [
              { id: 'none', label: t('stem.areaperimeter.cut_none', 'No cut') },
              { id: 'corner', label: t('stem.areaperimeter.cut_corner', 'Cut a corner') },
              { id: 'middle', label: t('stem.areaperimeter.cut_middle', 'Cut a notch in the middle of a side') }
            ], cut, function(id) { setFence({ fenceCut: id }, id === 'none' ? t('stem.areaperimeter.sr_cut_none', 'No cut.') : t('stem.areaperimeter.sr_cut_predict', 'Predict what happens to the perimeter.')); }, 'cut-types'),
            cut !== 'none' && nm.valid ? h('div', { key: 'cut-controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginTop: '14px' } }, [
              rangeControl(t('stem.areaperimeter.cut_width', 'Cut width'), nm.cutWidth, 1, Math.max(1, maxCutW), function(value) { patch({ fenceCutW: value }); }),
              rangeControl(t('stem.areaperimeter.cut_depth', 'Cut depth'), nm.cutDepth, 1, Math.max(1, fh - 1), function(value) { patch({ fenceCutD: value }); })
            ]) : null,
            cut !== 'none' && !nm.valid ? note(t('stem.areaperimeter.notch_invalid', 'This rectangle is too narrow to cut. Make it at least 3 units wide and 2 units tall.'), 'info', 'invalid') : null,
            cut !== 'none' && nm.valid && !predicted ? h('div', { key: 'predict', style: { marginTop: '14px' } }, [
              h('p', { key: 'q', style: { color: COLORS.text, fontWeight: 800, margin: '0 0 8px' } }, t('stem.areaperimeter.notch_question', 'Predict first: what happens to the perimeter?')),
              chipGroup(t('stem.areaperimeter.notch_question', 'Predict first: what happens to the perimeter?'), PREDICT_CHOICES, '', function(id) {
                var next = Object.assign({}, predictions); next[cut] = id;
                setFence({ notchPredictions: next }, t('stem.areaperimeter.sr_prediction_saved', 'Prediction saved. The result is below the picture.'));
              }, 'notch-predict')
            ]) : null,
            nm.valid ? gridShapeSvg({ key: 'ap-cut-svg', w: fw, h: fh, cut: cut === 'none' ? null : nm, highlight: showCutResult, title: t('stem.areaperimeter.cut_title', 'Garden with a piece cut out'), desc: cutDesc }) : null,
            cutResult,
            showCutResult && nm.valid ? h('div', { key: 'cut-sound', style: { marginTop: '10px' } }, soundButton(nm.edges, 'cut', false)) : null,
            cut !== 'none' && predicted ? actionButton(t('stem.areaperimeter.predict_again', 'Predict again'), function() { var next = Object.assign({}, predictions); delete next[cut]; patch({ notchPredictions: next }); }, { key: 'again', compact: true, style: { marginTop: '10px' } }) : null
          ], { key: 'fence-cut' })
        ]);
      }

      // ── problem diagrams ──
      function problemSvg(p, rearrange) {
        var u = unitText(p.unit);
        var els = [];
        var desc = '';
        var vbh = 300;
        function label(key, x, y, text, extra) {
          return h('text', Object.assign({ key: key, x: x, y: y, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, extra || {}), text);
        }
        function poly(key, pts, extra) {
          return h('polygon', Object.assign({ key: key, points: pts.map(function(pt) { return pt[0] + ',' + pt[1]; }).join(' '), fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4, strokeLinejoin: 'round' }, extra || {}));
        }
        function heightMark(key, x, yTop, yBottom, text) {
          return [
            h('line', { key: key + '-line', x1: x, y1: yTop, x2: x, y2: yBottom, stroke: COLORS.blue, strokeWidth: 3, strokeDasharray: '7 5' }),
            h('polyline', { key: key + '-right', points: x + ',' + (yBottom - 12) + ' ' + (x + 12) + ',' + (yBottom - 12) + ' ' + (x + 12) + ',' + yBottom, fill: 'none', stroke: COLORS.blue, strokeWidth: 2 }),
            label(key + '-label', x + 16, (yTop + yBottom) / 2, text, { textAnchor: 'start', fill: COLORS.blue })
          ];
        }
        var ghostStyle = { fill: 'none', stroke: COLORS.ghost, strokeWidth: 3, strokeDasharray: '9 6', 'data-ap-ghost': true };
        if (p.type === 'tile_area') {
          var cell = Math.min(420 / p.w, 220 / p.h, 44);
          var ox = (640 - cell * p.w) / 2, oy = 30;
          for (var r = 0; r < p.h; r += 1) for (var c = 0; c < p.w; c += 1) {
            els.push(h('rect', { key: 't' + c + '-' + r, x: ox + c * cell, y: oy + r * cell, width: cell, height: cell, fill: COLORS.tileSoft, stroke: GRID_STROKE, strokeWidth: 1.2 }));
          }
          vbh = oy + cell * p.h + 30;
          desc = fill(t('stem.areaperimeter.d_tiles', 'A rectangle covered with unit squares: {h} rows with {w} squares in each row.'), { h: p.h, w: p.w });
        } else if (['rect_area', 'rect_perimeter', 'missing_side_perimeter', 'missing_side_area', 'square_side', 'frac_perimeter'].indexOf(p.type) >= 0) {
          var L = p.l, Wd = p.w, top = p.l + ' ' + u, side = p.w + ' ' + u, inside = '';
          if (p.type === 'missing_side_perimeter') { side = '?'; inside = fill(t('stem.areaperimeter.inside_perimeter', 'P = {P} {u}'), { P: p.P, u: u }); }
          if (p.type === 'missing_side_area') { top = '?'; inside = fill(t('stem.areaperimeter.inside_area', 'A = {A} {u}'), { A: p.A, u: sqUnitText(p.unit) }); }
          if (p.type === 'square_side') { L = p.s; Wd = p.s; top = '?'; side = '?'; inside = fill(t('stem.areaperimeter.inside_perimeter', 'P = {P} {u}'), { P: p.P, u: u }); }
          if (p.type === 'frac_perimeter') { L = qVal(p.lq); Wd = qVal(p.wq); top = qText(p.lq) + ' ' + u; side = qText(p.wq) + ' ' + u; }
          var sc = Math.min(380 / L, 170 / Wd);
          var dw = L * sc, dh = Wd * sc, dx = (640 - dw) / 2, dy = 40 + (170 - dh) / 2;
          els.push(h('rect', { key: 'r', x: dx, y: dy, width: dw, height: dh, 'data-challenge-shape': 'rectangle', 'data-square-unit': sc, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }));
          els.push(label('top', 320, dy - 12, top));
          els.push(label('side', dx - 14, dy + dh / 2 + 6, side, { textAnchor: 'end' }));
          if (inside) els.push(label('inside', 320, dy + dh / 2 + 6, inside, { fill: COLORS.tealDark }));
          vbh = 260;
          desc = fill(t('stem.areaperimeter.d_rect', 'A rectangle labeled {top} along the top and {side} along the side.'), { top: top, side: side }) + (inside ? ' ' + fill(t('stem.areaperimeter.d_rect_inside', 'Inside it says {inside}.'), { inside: inside }) : '');
        } else if (p.type === 'frac_area' || p.type === 'mixed_area') {
          var lv = qVal(p.lq), wv = qVal(p.wq);
          var cols = Math.ceil(lv - 1e-9), rows = Math.ceil(wv - 1e-9);
          var dl = p.lq.d, dwd = p.wq.d;
          var unitPx = Math.min(440 / cols, 190 / rows, 150);
          var gx = (640 - cols * unitPx) / 2, gy = 40;
          els.push(h('rect', { key: 'shade', x: gx, y: gy, width: lv * unitPx, height: wv * unitPx, fill: COLORS.tileSoft, stroke: 'none', 'data-ap-frac-region': qText(p.lq) + 'x' + qText(p.wq) }));
          for (var ci = 0; ci <= cols * dl; ci += 1) {
            var xx = gx + ci * unitPx / dl;
            els.push(h('line', { key: 'vc' + ci, x1: xx, y1: gy, x2: xx, y2: gy + rows * unitPx, stroke: GRID_STROKE, strokeWidth: ci % dl === 0 ? 2 : 0.7, strokeDasharray: ci % dl === 0 ? '' : '3 3' }));
          }
          for (var ri2 = 0; ri2 <= rows * dwd; ri2 += 1) {
            var yy = gy + ri2 * unitPx / dwd;
            els.push(h('line', { key: 'hr' + ri2, x1: gx, y1: yy, x2: gx + cols * unitPx, y2: yy, stroke: GRID_STROKE, strokeWidth: ri2 % dwd === 0 ? 2 : 0.7, strokeDasharray: ri2 % dwd === 0 ? '' : '3 3' }));
          }
          els.push(h('rect', { key: 'outline', x: gx, y: gy, width: lv * unitPx, height: wv * unitPx, fill: 'none', stroke: COLORS.teal, strokeWidth: 4 }));
          els.push(label('top', gx + lv * unitPx / 2, gy - 12, qText(p.lq) + ' ' + u));
          els.push(label('side', gx - 12, gy + wv * unitPx / 2 + 6, qText(p.wq) + ' ' + u, { textAnchor: 'end' }));
          vbh = gy + rows * unitPx + 30;
          desc = fill(t('stem.areaperimeter.d_frac', 'A {l} by {w} rectangle shaded on a grid of unit squares. Each unit square is split into {n} equal small pieces.'), { l: qText(p.lq), w: qText(p.wq), n: dl * dwd });
        } else if (p.type === 'same_perimeter') {
          var unit = Math.min(250 / Math.max(p.b, p.d), 160 / Math.max(p.a, p.c), 28);
          els.push(h('rect', { key: 'A', x: 170 - p.b * unit / 2, y: 50, width: p.b * unit, height: p.a * unit, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }));
          els.push(h('rect', { key: 'B', x: 470 - p.d * unit / 2, y: 50, width: p.d * unit, height: p.c * unit, fill: COLORS.shapeB, stroke: COLORS.blue, strokeWidth: 4, strokeDasharray: '10 4' }));
          els.push(label('la', 170, 34, fill(t('stem.areaperimeter.label_a_dims', 'A: {w} × {h}'), { w: p.b, h: p.a })));
          els.push(label('lb', 470, 34, fill(t('stem.areaperimeter.label_b_dims', 'B: {w} × {h}'), { w: p.d, h: p.c })));
          vbh = 60 + Math.max(p.a, p.c) * unit + 20;
          desc = fill(t('stem.areaperimeter.d_same', 'Rectangle A is {b} by {a}. Rectangle B is {d} by {c}. Both are drawn with the same unit.'), { a: p.a, b: p.b, c: p.c, d: p.d });
        } else if (p.type === 'l_shape_area') {
          var ls = Math.min(400 / p.W, 200 / p.H);
          var lx = (640 - p.W * ls) / 2, ly = 40;
          var left = p.W - p.cw;
          els.push(poly('shape', [[lx, ly], [lx + left * ls, ly], [lx + left * ls, ly + p.ch * ls], [lx + p.W * ls, ly + p.ch * ls], [lx + p.W * ls, ly + p.H * ls], [lx, ly + p.H * ls]]));
          els.push(h('rect', { key: 'cut', x: lx + left * ls, y: ly, width: p.cw * ls, height: p.ch * ls, fill: 'none', stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '7 5' }));
          els.push(label('W', lx + p.W * ls / 2, ly + p.H * ls + 26, String(p.W)));
          els.push(label('H', lx - 12, ly + p.H * ls / 2 + 6, String(p.H), { textAnchor: 'end' }));
          els.push(label('cw', lx + (left + p.cw / 2) * ls, ly - 10, String(p.cw), { fill: COLORS.red }));
          els.push(label('ch', lx + p.W * ls + 12, ly + p.ch * ls / 2 + 6, String(p.ch), { fill: COLORS.red, textAnchor: 'start' }));
          vbh = ly + p.H * ls + 40;
          desc = fill(t('stem.areaperimeter.d_l_shape', 'An L-shape: a {W} by {H} rectangle with a {cw} by {ch} corner cut away from the top right. The cut-out is drawn with a dashed red outline.'), { W: p.W, H: p.H, cw: p.cw, ch: p.ch });
        } else if (p.type === 'triangle_area' || p.type === 'parallelogram_area' || p.type === 'trapezoid_area') {
          var totalW = p.type === 'trapezoid_area' ? p.topOff + p.b1 + p.b2 : p.off + p.b;
          var s = Math.min(560 / totalW, 190 / p.h);
          var x0 = (640 - totalW * s) / 2, y0 = 40, yb = y0 + p.h * s;
          if (p.type === 'triangle_area') {
            els.push(poly('shape', [[x0, yb], [x0 + p.b * s, yb], [x0 + p.off * s, y0]]));
            if (rearrange) els.push(poly('ghost', [[x0 + p.off * s, y0], [x0 + (p.off + p.b) * s, y0], [x0 + p.b * s, yb]], ghostStyle));
            els = els.concat(heightMark('ht', x0 + p.off * s, y0, yb, fill(t('stem.areaperimeter.h_label', 'h = {h} {u}'), { h: p.h, u: u })));
            els.push(label('base', x0 + p.b * s / 2, yb + 26, p.b + ' ' + u));
            if (p.s) els.push(label('slant', x0 + p.off * s / 2 - 10, (y0 + yb) / 2, p.s + ' ' + u, { textAnchor: 'end' }));
            desc = p.right
              ? fill(t('stem.areaperimeter.d_triangle_right', 'A right triangle with a base of {b} {u} and a height of {h} {u}.'), { b: p.b, h: p.h, u: u })
              : fill(t('stem.areaperimeter.d_triangle', 'A triangle with a base of {b} {u}, a height of {h} {u} shown as a dashed line, and a slanted side of {s} {u}.'), { b: p.b, h: p.h, s: p.s, u: u });
            if (rearrange) desc += ' ' + t('stem.areaperimeter.d_triangle_rearrange', 'A second copy, turned upside down, fits against the triangle to make a parallelogram with the same base and height.');
          } else if (p.type === 'parallelogram_area') {
            els.push(poly('shape', [[x0 + p.off * s, y0], [x0 + (p.off + p.b) * s, y0], [x0 + p.b * s, yb], [x0, yb]]));
            if (rearrange) {
              els.push(poly('cut', [[x0, yb], [x0 + p.off * s, y0], [x0 + p.off * s, yb]], { fill: 'none', stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '7 5' }));
              els.push(poly('ghost', [[x0 + p.b * s, yb], [x0 + (p.b + p.off) * s, y0], [x0 + (p.b + p.off) * s, yb]], ghostStyle));
            }
            els = els.concat(heightMark('ht', x0 + p.off * s, y0, yb, fill(t('stem.areaperimeter.h_label', 'h = {h} {u}'), { h: p.h, u: u })));
            els.push(label('base', x0 + p.b * s / 2, yb + 26, p.b + ' ' + u));
            els.push(label('slant', x0 + p.off * s / 2 - 10, (y0 + yb) / 2, p.s + ' ' + u, { textAnchor: 'end' }));
            desc = fill(t('stem.areaperimeter.d_parallelogram', 'A parallelogram with a base of {b} {u}, a height of {h} {u} shown as a dashed line, and slanted sides of {s} {u}.'), { b: p.b, h: p.h, s: p.s, u: u });
            if (rearrange) desc += ' ' + t('stem.areaperimeter.d_parallelogram_rearrange', 'The triangle at the left end is cut off and slid to the right end, making a rectangle with the same base and height.');
          } else {
            els.push(poly('shape', [[x0, yb], [x0 + p.b2 * s, yb], [x0 + (p.topOff + p.b1) * s, y0], [x0 + p.topOff * s, y0]]));
            if (rearrange) els.push(poly('ghost', [[x0 + (p.topOff + p.b1) * s, y0], [x0 + (p.topOff + p.b1 + p.b2) * s, y0], [x0 + (p.b2 + p.b1) * s, yb], [x0 + p.b2 * s, yb]], ghostStyle));
            els = els.concat(heightMark('ht', x0 + p.topOff * s, y0, yb, fill(t('stem.areaperimeter.h_label', 'h = {h} {u}'), { h: p.h, u: u })));
            els.push(label('top', x0 + (p.topOff + p.b1 / 2) * s, y0 - 10, p.b1 + ' ' + u));
            els.push(label('base', x0 + p.b2 * s / 2, yb + 26, p.b2 + ' ' + u));
            desc = fill(t('stem.areaperimeter.d_trapezoid', 'A trapezoid with parallel sides of {b1} {u} and {b2} {u} and a height of {h} {u} shown as a dashed line.'), { b1: p.b1, b2: p.b2, h: p.h, u: u });
            if (rearrange) desc += ' ' + t('stem.areaperimeter.d_trapezoid_rearrange', 'A second copy, turned upside down, fits beside it to make a parallelogram whose base is the two parallel sides added together.');
          }
          vbh = yb + 40;
        }
        return h('svg', {
          key: 'challenge-svg',
          viewBox: '0 0 640 ' + Math.ceil(vbh), role: 'img',
          'aria-labelledby': 'ap-challenge-title ap-challenge-desc',
          'data-ap-problem-type': p.type,
          style: { display: 'block', width: '100%', maxHeight: '330px' }
        }, [
          h('title', { key: 'title', id: 'ap-challenge-title' }, fill(t('stem.areaperimeter.diagram_title', 'Diagram: {topic}'), { topic: topicLabel(p.type) })),
          h('desc', { key: 'desc', id: 'ap-challenge-desc' }, desc)
        ].concat(els));
      }

      function relationshipFor(p) {
        switch (p.type) {
          case 'tile_area': return t('stem.areaperimeter.rel_tiles', 'area = rows × squares in each row');
          case 'rect_area': case 'frac_area': case 'mixed_area': return t('stem.areaperimeter.a_l_w', "A = l × w");
          case 'rect_perimeter': case 'frac_perimeter': return t('stem.areaperimeter.p_2_l_w', "P = 2(l + w)");
          case 'same_perimeter': return t('stem.areaperimeter.rel_same', 'find l × w for each rectangle, then subtract');
          case 'missing_side_perimeter': return t('stem.areaperimeter.rel_missing_perimeter', 'P = 2(l + w), so w = P ÷ 2 − l');
          case 'missing_side_area': return t('stem.areaperimeter.rel_missing_area', 'A = l × w, so l = A ÷ w');
          case 'square_side': return t('stem.areaperimeter.rel_square', 'P = 4 × side');
          case 'l_shape_area': return t('stem.areaperimeter.remaining_area_whole_removed', "remaining area = whole - removed");
          case 'triangle_area': return t('stem.areaperimeter.rel_triangle', 'A = b × h ÷ 2');
          case 'parallelogram_area': return t('stem.areaperimeter.rel_parallelogram', 'A = b × h');
          case 'trapezoid_area': return t('stem.areaperimeter.rel_trapezoid', 'A = (b1 + b2) × h ÷ 2');
          default: return '';
        }
      }
      function unknownFor(p) {
        if (p.type === 'same_perimeter') return t('stem.areaperimeter.unknown_difference', 'The difference between two areas');
        if (p.type === 'missing_side_perimeter' || p.type === 'missing_side_area' || p.type === 'square_side') return t('stem.areaperimeter.unknown_side', 'A missing side length');
        if (p.kind === 'length') return t('stem.areaperimeter.perimeter', 'Perimeter');
        return t('stem.areaperimeter.area', 'Area');
      }


      function challengeView() {
        var storedOk = GRADES.indexOf(Number(state.genGrade)) >= 0 && GRADE_TOPICS[Number(state.genGrade)].indexOf(state.genType) >= 0 &&
          Number(state.genGrade) >= practiceRange.min && Number(state.genGrade) <= practiceRange.max && Number(state.genSeed) > 0;
        // Opened by the path with nothing chosen yet: start on the step's own topic.
        var p = storedOk
          ? generateProblem(Number(state.genGrade), state.genType, Number(state.genSeed))
          : (pathOpeningProblem() || generateProblem(practiceGrade, practiceTopic, 1000 + practiceGrade * 31 + Math.max(0, gradeTopics.indexOf(practiceTopic))));
        // The level controls follow the problem on screen, which can come from a
        // grade other than the host's (a retried or teacher-ranged problem).
        var activeGrade = p.grade;
        var activeTopics = GRADE_TOPICS[activeGrade];
        var activeTopic = activeTopics.indexOf(state.practiceTopic) >= 0 ? state.practiceTopic : 'mixed';
        var item = state.itemSig === p.sig ? state : {};
        var attempts = Math.max(0, Number(item.attempts) || 0);
        var revealed = !!item.revealed;
        var hints = hintsFor(p);
        var hintStep = clamp(item.hintStep || 0, 0, hints.length);
        var feedback = item.feedback && item.feedback.sig === p.sig ? item.feedback : null;
        var typed = state.itemSig === p.sig ? answer : '';
        var solvedMap = normalizeChallengeProgress(state.solvedChallenges);
        var revealedSigs = plainMap(state.revealedSigs);
        var creditBlocked = !!revealedSigs[p.sig];
        var solvedBefore = !!solvedMap[p.sig];
        var solvedHere = !!(feedback && feedback.kind === 'correct');
        var locked = revealed || solvedHere || (solvedBefore && !feedback);
        var missedItems = plainMap(state.missedItems);
        var missedKeys = Object.keys(missedItems).filter(function(key) {
          var m = missedItems[key];
          return m && GRADES.indexOf(Number(m.grade)) >= 0 && Number(m.grade) >= practiceRange.min && Number(m.grade) <= practiceRange.max && GRADE_TOPICS[Number(m.grade)].indexOf(m.type) >= 0;
        });
        var submitLocked = false;
        function pin() { return { itemSig: p.sig, genGrade: p.grade, genType: p.type, genSeed: p.seed }; }
        function freshItem(next) {
          return { practiceGrade: next.grade, genGrade: next.grade, genType: next.type, genSeed: next.seed, itemSig: next.sig, answer: '', attempts: 0, revealed: false, hintStep: 0, feedback: null, aiHint: null, exFills: {}, exInputs: {}, exFeedback: null, showRearrange: false, showExample: '' };
        }
        function newProblem(grade, topic) {
          grade = grade || activeGrade;
          topic = topic || activeTopic;
          var next = null;
          for (var i = 0; i < 12; i += 1) {
            next = generateProblem(grade, topic, 1 + Math.floor(Math.random() * 2147480000));
            if (next.sig !== p.sig && !solvedMap[next.sig]) break;
          }
          patch(Object.assign(freshItem(next), { practiceTopic: topic }));
          speak(fill(t('stem.areaperimeter.sr_new_problem', 'New problem. {prompt}'), { prompt: problemPrompt(next) }));
        }
        function retryMissed() {
          if (!missedKeys.length) return;
          var at = missedKeys.indexOf(p.sig);
          var m = missedItems[missedKeys[at < 0 ? 0 : (at + 1) % missedKeys.length]];
          var next = generateProblem(Number(m.grade), m.type, Number(m.seed));
          patch(freshItem(next));
          speak(fill(t('stem.areaperimeter.sr_retry_problem', 'Practice again. {prompt}'), { prompt: problemPrompt(next) }));
        }
        function submit(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (locked || submitLocked) return;
          var value = parseAnswer(typed);
          if (!isFinite(value)) {
            patch(Object.assign(pin(), { feedback: { sig: p.sig, kind: String(typed).trim() ? 'unreadable' : 'empty' } }));
            return;
          }
          submitLocked = true;
          var verdict = diagnoseAnswer(p, value);
          var tries = attempts + 1;
          if (verdict === 'correct') {
            var firstSolve = !solvedBefore && !creditBlocked;
            patch(function(current) {
              var nextSolved = normalizeChallengeProgress(current.solvedChallenges);
              if (firstSolve) nextSolved[p.sig] = true;
              var nextMissed = Object.assign({}, plainMap(current.missedItems));
              delete nextMissed[p.sig];
              var score = current.score || { correct: 0, attempts: 0 };
              var streak = firstSolve ? (current.streak || 0) + 1 : (current.streak || 0);
              return Object.assign(pin(), {
                solvedChallenges: nextSolved, missedItems: nextMissed,
                score: { correct: challengeProgressCount(nextSolved), attempts: (score.attempts || 0) + 1 },
                streak: streak, bestStreak: Math.max(current.bestStreak || 0, streak),
                attempts: tries, feedback: { sig: p.sig, kind: 'correct', tries: tries, credited: firstSolve }
              });
            });
            if (firstSolve) awardXP('areaPerimeter', tries === 1 ? 5 : 3, t('stem.areaperimeter.area_perimeter_challenge', "Area & Perimeter challenge"));
          } else {
            var mistake = verdict;
            patch(function(current) {
              var counts = Object.assign({}, plainMap(current.mistakeCounts));
              var mk = mistake || 'other';
              counts[mk] = (Number(counts[mk]) || 0) + 1;
              var priorMissed = plainMap(current.missedItems);
              var nextMissed = Object.assign({}, priorMissed);
              nextMissed[p.sig] = { grade: p.grade, type: p.type, seed: p.seed };
              var byType = Object.assign({}, plainMap(current.missedByType));
              if (!priorMissed[p.sig]) byType[p.type] = (Number(byType[p.type]) || 0) + 1;
              var score = current.score || { correct: 0, attempts: 0 };
              return Object.assign(pin(), {
                mistakeCounts: counts, missedItems: nextMissed, missedByType: byType, streak: 0,
                score: { correct: challengeProgressCount(current.solvedChallenges), attempts: (score.attempts || 0) + 1 },
                attempts: tries, feedback: { sig: p.sig, kind: mistake ? 'mistake' : 'generic', mistake: mistake || '', tries: tries }
              });
            });
          }
        }
        function reveal() {
          if (!revealsAllowed || attempts < 2 || locked) return;
          patch(function(current) {
            var sigs = Object.assign({}, plainMap(current.revealedSigs)); sigs[p.sig] = true;
            var missed = Object.assign({}, plainMap(current.missedItems)); missed[p.sig] = { grade: p.grade, type: p.type, seed: p.seed };
            return Object.assign(pin(), { revealed: true, revealedSigs: sigs, missedItems: missed, streak: 0, feedback: { sig: p.sig, kind: 'revealed' } });
          });
        }
        function askAi() {
          if (typeof ctx.getHint !== 'function' || ctx.aiHintsEnabled === false || ctx.aiAvailable === false) return;
          ctx.getHint('areaPerimeter', problemPrompt(p), typed, p.answerText, attempts, function(text) {
            patch({ aiHint: { sig: p.sig, text: String(text || '') } });
          });
        }

        var feedbackNode = null;
        if (feedback) {
          var fbText = '';
          var tone = 'warn';
          if (feedback.kind === 'correct') {
            tone = 'good';
            fbText = feedback.credited
              ? (feedback.tries > 1 ? t('stem.areaperimeter.fb_correct_retry', 'Correct! You fixed it. That is what checking your work is for.') : t('stem.areaperimeter.fb_correct', 'Correct!'))
              : t('stem.areaperimeter.fb_correct_no_points', 'Correct. This one was already counted (or you saw its solution), so it earns no new points.');
          } else if (feedback.kind === 'empty') fbText = t('stem.areaperimeter.enter_a_number_before_checking', "Enter a number before checking.");
          else if (feedback.kind === 'unreadable') fbText = t('stem.areaperimeter.fb_unreadable', 'I could not read that number. Type a whole number, a decimal, a fraction like 3/4, or a mixed number like 2 1/2.');
          else if (feedback.kind === 'revealed') { tone = 'info'; fbText = t('stem.areaperimeter.fb_revealed', 'Here is the worked solution. Read each step, then try a new problem. This one is saved to practise again, without points.'); }
          else {
            var named = feedback.kind === 'mistake' ? mistakeMessage(feedback.mistake) : genericNudge(p);
            var retryLine = feedback.tries >= 2
              ? (revealsAllowed ? t('stem.areaperimeter.fb_try_or_reveal', 'Try again, use a hint, or show the worked solution.') : t('stem.areaperimeter.fb_try_or_hint', 'Try again or use a hint.'))
              : t('stem.areaperimeter.fb_second_try', 'Have another go: you have a second try.');
            fbText = named + ' ' + retryLine;
          }
          feedbackNode = note(fbText, tone, 'feedback', { id: 'ap-feedback', 'data-ap-feedback': feedback.kind, 'data-ap-mistake': feedback.mistake || undefined });
        } else if (solvedBefore && !revealed) {
          feedbackNode = note(t('stem.areaperimeter.solved_before', 'You solved this one before. Try a new problem.'), 'good', 'feedback', { id: 'ap-feedback', 'data-ap-feedback': 'solved-before' });
        }

        // Fading worked example: full at first, then the last steps go blank as
        // the learner solves more of this type; after 3 it is hidden by default.
        var solvedOfType = typeSolvedCount(solvedMap, p.type);
        var example = exampleFor(p);
        var exSteps = solutionSteps(example);
        var valueIdx = exSteps.map(function(s, i) { return s.value !== undefined ? i : -1; }).filter(function(i) { return i >= 0; });
        var fadeN = Math.min(solvedOfType, valueIdx.length);
        var fadedIdx = valueIdx.slice(valueIdx.length - fadeN);
        var exampleOpen = solvedOfType < 3 || item.showExample === p.type;
        var exFills = plainMap(item.exFills);
        var exInputs = plainMap(item.exInputs);
        var exFeedback = item.exFeedback && item.exFeedback.sig === example.sig ? item.exFeedback : null;
        function checkStep(i) {
          var s = exSteps[i];
          var value = parseAnswer(exInputs[i]);
          var target = s.value && typeof s.value === 'object' ? qVal(s.value) : Number(s.value);
          if (valuesMatch(value, target)) {
            var nextFills = Object.assign({}, exFills); nextFills[example.sig + ':' + i] = true;
            patch(Object.assign(pin(), { exFills: nextFills, exFeedback: { sig: example.sig, i: i, ok: true } }));
            speak(t('stem.areaperimeter.sr_step_ok', 'That step is right.'));
          } else {
            patch(Object.assign(pin(), { exFeedback: { sig: example.sig, i: i, ok: false } }));
            speak(t('stem.areaperimeter.sr_step_not_yet', 'Not quite. Use the numbers in that step.'));
          }
        }
        var exampleNode = exampleOpen ? h('section', { key: 'example', 'aria-labelledby': 'ap-example-title', 'data-ap-example': fadeN, style: { marginTop: '14px', padding: '14px', borderRadius: '12px', border: '1px dashed ' + COLORS.border, background: COLORS.panelAlt, color: COLORS.text } }, [
          h('h3', { key: 'h', id: 'ap-example-title', style: { margin: '0 0 6px', fontSize: '1.02rem' } }, t('stem.areaperimeter.worked_example', 'Worked example')),
          h('p', { key: 'q', style: { margin: '0 0 8px' } }, problemPrompt(example)),
          fadeN ? h('p', { key: 'fade-note', style: { margin: '0 0 8px', color: COLORS.muted } }, t('stem.areaperimeter.example_faded_note', 'Some steps are blank now. Fill them in to finish the example.')) : null,
          h('ol', { key: 'steps', style: { margin: 0, paddingLeft: '22px', lineHeight: 1.6 } }, exSteps.map(function(s, i) {
            var faded = fadedIdx.indexOf(i) >= 0 && !exFills[example.sig + ':' + i];
            if (!faded) return h('li', { key: i }, stepText(s, false));
            var inputId = 'ap-ex-step-' + i;
            return h('li', { key: i, 'data-ap-faded-step': i }, [
              h('span', { key: 'txt' }, stepText(s, true)),
              h('span', { key: 'ctl', style: { display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginLeft: '8px' } }, [
                h('label', { key: 'l', htmlFor: inputId, style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' } }, fill(t('stem.areaperimeter.fill_step_label', 'Value for step {n}'), { n: i + 1 })),
                h('input', { key: 'in', id: inputId, type: 'text', inputMode: 'decimal', autoComplete: 'off', value: exInputs[i] == null ? '' : String(exInputs[i]),
                  onChange: function(event) { var next = Object.assign({}, exInputs); next[i] = event.target.value; patch(Object.assign(pin(), { exInputs: next })); },
                  style: { width: '6.5em', minHeight: '36px', padding: '4px 8px', borderRadius: '8px', border: '2px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.text } }),
                actionButton(t('stem.areaperimeter.check_step', 'Check step'), function() { checkStep(i); }, { key: 'chk', compact: true, ariaLabel: fill(t('stem.areaperimeter.check_step_n', 'Check step {n}'), { n: i + 1 }) }),
                exFeedback && exFeedback.i === i && !exFeedback.ok ? h('span', { key: 'fb', style: { color: COLORS.red, fontWeight: 700 } }, t('stem.areaperimeter.step_not_yet', 'Not quite. Use the numbers in this step.')) : null
              ])
            ]);
          }))
        ]) : actionButton(t('stem.areaperimeter.show_example', 'Show a worked example'), function() { patch(Object.assign(pin(), { showExample: p.type })); }, { key: 'show-example', compact: true, style: { marginTop: '12px' } });

        var showSolution = revealed || solvedHere;
        var solutionNode = showSolution ? h('section', { key: 'solution', 'aria-labelledby': 'ap-solution-title', 'data-ap-solution': true, style: { marginTop: '12px', color: COLORS.text } }, [
          h('h3', { key: 'h', id: 'ap-solution-title', style: { margin: '0 0 6px', fontSize: '1.02rem' } }, t('stem.areaperimeter.how_it_works', 'How it works')),
          h('ol', { key: 'steps', style: { margin: 0, paddingLeft: '22px', lineHeight: 1.6 } }, solutionSteps(p).map(function(s, i) { return h('li', { key: i }, stepText(s, false)); }))
        ]) : null;

        var aiAvailable = typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false && ctx.aiAvailable !== false; // AI-off: hidden when text AI is unusable
        var aiHint = item.aiHint && item.aiHint.sig === p.sig ? item.aiHint.text : '';
        var isSixth = p.grade === 6 && p.type !== 'l_shape_area';
        var rearrange = isSixth && !!item.showRearrange;
        var gradeOptions = GRADES.filter(function(g) { return g >= practiceRange.min && g <= practiceRange.max; }).map(function(g) { return { id: g, label: gradeLabel(g) }; });

        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('div', { key: 'top', style: { display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } }, [
              h('div', { key: 'label' }, [
                h('div', { key: 'eyebrow', 'data-ap-eyebrow': true, style: { color: COLORS.tealDark, fontWeight: 850, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' } }, fill(t('stem.areaperimeter.practice_eyebrow', 'Practice: {grade}, {topic}'), { grade: gradeLabel(p.grade), topic: topicLabel(p.type) })),
                h('h2', { key: 'h', style: { color: COLORS.text, fontSize: '1.3rem', margin: '5px 0 0' } }, unknownFor(p))
              ]),
              h('div', { key: 'score', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
                h('span', { key: 'correct', style: { padding: '7px 11px', borderRadius: '999px', background: COLORS.panelAlt, color: COLORS.green, fontWeight: 800, border: '1px solid ' + COLORS.border } }, fill(t('stem.areaperimeter.n_solved', '{n} solved'), { n: challengeProgressCount(solvedMap) })),
                h('span', { key: 'streak', style: { padding: '7px 11px', borderRadius: '999px', background: COLORS.panelAlt, color: COLORS.amber, fontWeight: 800, border: '1px solid ' + COLORS.border } }, fill(t('stem.areaperimeter.n_streak', 'Streak: {n}'), { n: state.streak || 0 })),
                missedKeys.length ? h('span', { key: 'missed', style: { padding: '7px 11px', borderRadius: '999px', background: COLORS.panelAlt, color: COLORS.red, fontWeight: 800, border: '1px solid ' + COLORS.border } }, fill(t('stem.areaperimeter.n_to_retry', '{n} to practise again'), { n: missedKeys.length })) : null
              ])
            ]),
            h('p', { key: 'standard', style: { color: COLORS.muted, margin: '10px 0 0' } }, gradeStandard(activeGrade)),
            h('div', { key: 'level', style: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '12px' } }, [
              chipGroup(t('stem.areaperimeter.grade_level', 'Grade level'), gradeOptions, activeGrade, function(g) { if (g !== activeGrade) newProblem(g, 'mixed'); }, 'grades'),
              h('label', { key: 'topic', htmlFor: 'ap-topic', style: { color: COLORS.text, fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '100%' } }, [
                h('span', { key: 's' }, t('stem.areaperimeter.topic', 'Topic')),
                h('select', { key: 'sel', id: 'ap-topic', value: activeTopic, onChange: function(event) { newProblem(activeGrade, event.target.value); },
                  style: { minHeight: '40px', maxWidth: '100%', padding: '6px 10px', borderRadius: '10px', border: '2px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.text } },
                  ['mixed'].concat(activeTopics).map(function(id) { return h('option', { key: id, value: id }, topicLabel(id)); }))
              ])
            ]),
            exampleNode,
            h('p', { key: 'prompt', id: 'ap-challenge-prompt', 'data-ap-prompt': p.sig, style: { color: COLORS.text, fontSize: '1.08rem', lineHeight: 1.55, fontWeight: 650, margin: '18px 0 8px' } }, problemPrompt(p)),
            problemSvg(p, rearrange),
            isSixth ? actionButton(rearrange ? t('stem.areaperimeter.hide_rearrange', 'Hide the rearranging idea') : t('stem.areaperimeter.show_rearrange', 'Show how to rearrange it'), function() { patch(Object.assign(pin(), { showRearrange: !rearrange })); }, { key: 'rearrange', compact: true, pressed: rearrange }) : null,
            h('form', { key: 'form', onSubmit: submit, style: { display: 'flex', gap: '9px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '10px' } }, [
              textField('ap-answer', fill(t('stem.areaperimeter.your_answer_in', 'Your answer ({unit})'), { unit: answerUnit(p) }), locked && (revealed || solvedBefore) && !solvedHere ? (revealed ? '' : p.answerText) : typed, function(value) {
                patch(Object.assign(pin(), { answer: value, feedback: feedback && feedback.kind !== 'correct' ? feedback : null }));
              }, { disabled: locked, invalid: !!(feedback && feedback.kind !== 'correct' && feedback.kind !== 'revealed'), describedBy: 'ap-challenge-prompt' + (feedbackNode ? ' ap-feedback' : '') + (p.fraction ? ' ap-format-hint' : ''), inputMode: p.fraction ? 'text' : 'decimal', flex: '1 1 210px' }),
              actionButton(locked && !revealed ? t('stem.areaperimeter.solved_2', "Solved") : t('stem.areaperimeter.check_answer', "Check answer"), null, { key: 'submit', type: 'submit', primary: true, disabled: locked }),
              actionButton(hintStep < hints.length ? t('stem.areaperimeter.show_hint', "Show hint") : t('stem.areaperimeter.no_more_hints', 'No more hints'), function() { patch(Object.assign(pin(), { hintStep: hintStep + 1 })); speak(hints[hintStep] || ''); }, { key: 'hint', disabled: hintStep >= hints.length || locked, controls: 'ap-challenge-hint', expanded: hintStep > 0 }),
              revealsAllowed && attempts >= 2 && !locked ? actionButton(t('stem.areaperimeter.show_solution', 'Show the worked solution'), reveal, { key: 'reveal', data: 'reveal' }) : null,
              aiAvailable && attempts >= 2 && !locked ? actionButton(t('stem.areaperimeter.ask_ai_hint', 'Ask for an AI hint'), askAi, { key: 'ai', compact: true }) : null
            ]),
            p.fraction ? h('p', { key: 'format', id: 'ap-format-hint', style: { color: COLORS.muted, margin: '6px 0 0', fontSize: '0.92rem' } }, t('stem.areaperimeter.fraction_format', 'You can type a fraction like 3/4, a mixed number like 2 1/2, or a decimal.')) : null,
            hintLadder(hints, hintStep, 'ap-challenge-hint', { 'data-ap-hints': hintStep }),
            h('div', { key: 'live', role: 'status', 'aria-live': 'polite' }, feedbackNode),
            aiHint ? h('p', { key: 'ai-hint', role: 'status', style: { color: COLORS.text, marginTop: '10px' } }, aiHint) : null,
            solutionNode,
            h('div', { key: 'nav', style: { display: 'flex', justifyContent: 'space-between', gap: '9px', flexWrap: 'wrap', marginTop: '16px' } }, [
              missedKeys.length ? actionButton(fill(t('stem.areaperimeter.retry_missed_n', 'Practise missed problems ({n})'), { n: missedKeys.length }), retryMissed, { key: 'retry-missed', compact: true }) : h('span', { key: 'spacer' }),
              h('span', { key: 'progress', style: { alignSelf: 'center', color: COLORS.muted, fontSize: '0.9rem' } }, fill(t('stem.areaperimeter.unique_complete', '{n} different problems solved'), { n: challengeProgressCount(solvedMap) })),
              actionButton(t('stem.areaperimeter.new_problem', 'New problem'), function() { newProblem(); }, { key: 'next', compact: true, primary: locked })
            ])
          ], { key: 'challenge', 'data-challenge-id': p.sig, 'data-challenge-type': p.type, 'data-challenge-grade': p.grade }),
          panel([
            h('h3', { key: 'h', style: { color: COLORS.text, fontSize: '1.05rem', margin: '0 0 8px' } }, t('stem.areaperimeter.problem_translation', "Problem translation")),
            h('div', { key: 'table', role: 'region', tabIndex: 0, 'aria-label': t('stem.areaperimeter.problem_translation', "Problem translation"), className: 'focus:outline-none focus:ring-2 focus:ring-teal-500', style: { overflowX: 'auto', width: '100%', maxWidth: '100%' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.text, minWidth: '420px' } }, [
              h('thead', { key: 'head' }, h('tr', null, [t('stem.areaperimeter.what_is_given', "What is given?"), t('stem.areaperimeter.what_is_unknown', "What is unknown?"), t('stem.areaperimeter.useful_relationship', "Useful relationship")].map(function(item, index) { return h('th', { key: index, scope: 'col', style: { padding: '9px', borderBottom: '2px solid ' + COLORS.border, textAlign: 'left' } }, item); }))),
              h('tbody', { key: 'body' }, h('tr', null, [
                h('td', { key: 'g', style: { padding: '9px', verticalAlign: 'top' } }, t('stem.areaperimeter.given_in_prompt', 'The measurements in the problem and the diagram')),
                h('td', { key: 'u', style: { padding: '9px', verticalAlign: 'top', fontWeight: 800 } }, unknownFor(p)),
                h('td', { key: 'r', style: { padding: '9px', verticalAlign: 'top' } }, attempts > 0 || hintStep > 0 || locked ? relationshipFor(p) : t('stem.areaperimeter.relationship_after_try', 'Shown after your first try or first hint'))
              ]))
            ])),
            p.grade === 6 ? h('div', { key: 'links', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } }, [coordinateLink()]) : null,
            p.grade === 3 || p.type === 'mixed_area' ? h('div', { key: 'links-am', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } }, [areaModelLink()]) : null
          ], { key: 'translation' })
        ]);
      }

      // ════ Stage B views: square units, circles, irregular shapes, missions ════
      function textOf(value) { return typeof value === 'string' || (typeof value === 'number' && isFinite(value)) ? String(value) : ''; }
      function money(n) { return fill(t('stem.areaperimeter.money', '${n}'), { n: numText(n) }); }
      function subHeading(text, key) {
        return h('h3', { key: key || 'h3', style: { color: COLORS.text, fontSize: '1.05rem', margin: '16px 0 8px' } }, text);
      }
      // Only the levels the teacher's grade range allows are offered.
      function levelChips(stateKey, current, groupKey) {
        var allowed = levelsAllowed(stateKey);
        if (allowed.length < 2) return h('p', { key: groupKey, 'data-ap-level-fixed': current, style: { color: COLORS.muted, margin: '8px 0 0' } }, fill(t('stem.areaperimeter.level_fixed', 'Your teacher set level {n}.'), { n: current }));
        return chipGroup(t('stem.areaperimeter.level_group', 'Level'), [
          { id: 1, label: t('stem.areaperimeter.level_1', 'Level 1: getting started') },
          { id: 2, label: t('stem.areaperimeter.level_2', 'Level 2: on level') },
          { id: 3, label: t('stem.areaperimeter.level_3', 'Level 3: stretch') }
        ].filter(function(option) { return allowed.indexOf(option.id) >= 0; }), current, function(id) {
          var next = {}; next[stateKey] = id; patch(next);
          speak(fill(t('stem.areaperimeter.sr_level_set', 'Level {n} selected.'), { n: id }));
        }, groupKey);
      }
      function srOnlyStyle() { return { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }; }
      function randomSeed() { return 1 + Math.floor(Math.random() * 2147480000); }

      // ── the unit square, subdivided ──
      // 43,560 squares cannot be drawn honestly, so the acre is a strip of ten
      // 66 ft blocks with one corner of one block magnified as a sample.
      function acreSvg(key) {
        var x0 = 70, y0 = 58, W = 500, H = 50, B = W / 10;
        var els = [h('rect', { key: 'strip', x: x0, y: y0, width: W, height: H, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 3 })];
        for (var i = 1; i < 10; i += 1) els.push(h('line', { key: 'b' + i, x1: x0 + i * B, y1: y0, x2: x0 + i * B, y2: y0 + H, stroke: GRID_STROKE, strokeWidth: 1.3 }));
        els.push(h('rect', { key: 'block', x: x0, y: y0, width: B, height: H, fill: COLORS.ghost, fillOpacity: 0.55, stroke: COLORS.ghost, strokeWidth: 2.5, 'data-ap-unit-row': true }));
        var corner = B * 6 / 66;
        els.push(h('rect', { key: 'corner', x: x0, y: y0 + H - corner, width: corner, height: corner, fill: 'none', stroke: COLORS.text, strokeWidth: 1.5 }));
        els.push(h('text', { key: 'top', x: x0 + W / 2, y: y0 - 14, textAnchor: 'middle', fill: COLORS.text, fontSize: 16, fontWeight: 800 }, fill(t('stem.areaperimeter.n_ft', '{n} ft'), { n: 660 })));
        els.push(h('text', { key: 'side', x: x0 - 8, y: y0 + H / 2 + 6, textAnchor: 'end', fill: COLORS.text, fontSize: 16, fontWeight: 800 }, fill(t('stem.areaperimeter.n_ft', '{n} ft'), { n: 66 })));
        els.push(h('text', { key: 'block-l', x: x0, y: y0 + H + 24, fill: COLORS.text, fontSize: 15, fontWeight: 800 }, t('stem.areaperimeter.unit_acre_block', 'one block: 66 ft × 66 ft = 4356 ft²')));
        var ix = 110, iy = 150, IS = 100;
        els.push(h('line', { key: 'lead', x1: x0 + corner, y1: y0 + H, x2: ix, y2: iy, stroke: GRID_STROKE, strokeWidth: 1, strokeDasharray: '4 4' }));
        els.push(h('rect', { key: 'inset', x: ix, y: iy, width: IS, height: IS, fill: COLORS.tileSoft, stroke: COLORS.text, strokeWidth: 2 }));
        for (var j = 1; j < 6; j += 1) {
          els.push(h('line', { key: 'iv' + j, x1: ix + j * IS / 6, y1: iy, x2: ix + j * IS / 6, y2: iy + IS, stroke: GRID_STROKE, strokeWidth: 0.8 }));
          els.push(h('line', { key: 'ih' + j, x1: ix, y1: iy + j * IS / 6, x2: ix + IS, y2: iy + j * IS / 6, stroke: GRID_STROKE, strokeWidth: 0.8 }));
        }
        els.push(h('text', { key: 'inset-l', x: ix + IS + 12, y: iy + IS / 2, fill: COLORS.text, fontSize: 14, fontWeight: 700 }, t('stem.areaperimeter.unit_acre_corner', 'a corner, magnified: 6 ft × 6 ft = 36 ft²')));
        els.push(h('text', { key: 'total', x: 320, y: iy + IS + 34, textAnchor: 'middle', fill: COLORS.tealDark, fontSize: 17, fontWeight: 850 }, t('stem.areaperimeter.unit_total_acre', '1 acre = 660 × 66 = 43560 ft²')));
        var noteText = t('stem.areaperimeter.unit_acre_note', '43560 squares are too many to draw. The acre is drawn as a strip 660 ft by 66 ft, cut into 10 blocks 66 ft on a side. Each block holds 66 × 66 = 4356 ft², and 10 blocks hold 43560 ft². An acre can be any shape with this much area.');
        var desc = t('stem.areaperimeter.d_unit_acre', 'A long strip 660 ft by 66 ft, split into 10 square blocks 66 ft on a side. The first block is highlighted, and a 6 ft by 6 ft corner of it is shown magnified: 36 square feet.') + ' ' + noteText;
        return h('div', { key: key + '-wrap' }, [
          h('svg', { key: 'svg', viewBox: '0 0 640 300', role: 'img', 'aria-labelledby': key + '-title ' + key + '-desc', 'data-ap-unit-square': 'acre_ft', 'data-ap-unit-scaled': 'strip', style: { display: 'block', width: '100%', maxHeight: '320px' } }, [
            h('title', { key: 'title', id: key + '-title' }, t('stem.areaperimeter.unit_acre_title', 'One acre, filled with square feet')),
            h('desc', { key: 'desc', id: key + '-desc' }, desc)
          ].concat(els)),
          h('p', { key: 'note', 'data-ap-unit-scale-note': true, 'aria-hidden': true, style: { color: COLORS.muted, margin: '6px 0 0', fontSize: '0.92rem' } }, noteText)
        ]);
      }

      function unitSquareSvg(pairId, key) {
        var pair = AREA_UNIT_PAIRS[pairId] || AREA_UNIT_PAIRS.yd_ft;
        if (pairId === 'acre_ft') return acreSvg(key);
        var n = pair.linear, nn = n * n;
        var big = unitText(pair.big), small = unitText(pair.small);
        var named = pairId === 'ha_m';
        var S = 250, x0 = 60, y0 = 56;
        var lines = n === 100 ? 10 : n;
        var els = [h('rect', { key: 'sq', x: x0, y: y0, width: S, height: S, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 3 })];
        for (var i = 1; i < lines; i += 1) {
          var pos = i * S / lines;
          els.push(h('line', { key: 'v' + i, x1: x0 + pos, y1: y0, x2: x0 + pos, y2: y0 + S, stroke: GRID_STROKE, strokeWidth: n === 100 ? 1.3 : 0.9 }));
          els.push(h('line', { key: 'h' + i, x1: x0, y1: y0 + pos, x2: x0 + S, y2: y0 + pos, stroke: GRID_STROKE, strokeWidth: n === 100 ? 1.3 : 0.9 }));
        }
        els.push(h('rect', { key: 'row', x: x0, y: y0, width: S, height: S / n, fill: COLORS.ghost, fillOpacity: 0.55, stroke: COLORS.ghost, strokeWidth: 2.5, 'data-ap-unit-row': true }));
        els.push(h('text', { key: 'row-label', x: x0 + S + 10, y: y0 + 8, fill: COLORS.text, fontSize: 15, fontWeight: 800 }, fill(t('stem.areaperimeter.unit_row_label', 'one row: {n} {small}²'), { n: n, small: small })));
        var sideText = named ? fill(t('stem.areaperimeter.unit_side_named', '{n} {small}'), { n: n, small: small }) : fill(t('stem.areaperimeter.unit_side_label', '1 {big} = {n} {small}'), { big: big, n: n, small: small });
        els.push(h('text', { key: 'top', x: x0 + S / 2, y: y0 - 14, textAnchor: 'middle', fill: COLORS.text, fontSize: 16, fontWeight: 800 }, sideText));
        els.push(h('text', { key: 'side', x: x0 - 16, y: y0 + S / 2, textAnchor: 'middle', fill: COLORS.text, fontSize: 16, fontWeight: 800, transform: 'rotate(-90 ' + (x0 - 16) + ' ' + (y0 + S / 2) + ')' }, sideText));
        els.push(h('text', { key: 'total', x: x0 + S / 2, y: y0 + S + 30, textAnchor: 'middle', fill: COLORS.tealDark, fontSize: 17, fontWeight: 850 }, named
          ? t('stem.areaperimeter.unit_total_ha', '1 ha = 100 × 100 = 10000 m²')
          : fill(t('stem.areaperimeter.unit_total_label', '1 {big}² = {n} × {n} = {nn} {small}²'), { big: big, n: n, nn: nn, small: small })));
        if (n === 100) {
          var ix = 410, iy = 110, IS = 160;
          els.push(h('text', { key: 'inset-h', x: ix + IS / 2, y: iy - 12, textAnchor: 'middle', fill: COLORS.text, fontSize: 14, fontWeight: 800 }, t('stem.areaperimeter.unit_inset_title', 'one block, magnified')));
          els.push(h('rect', { key: 'inset', x: ix, y: iy, width: IS, height: IS, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 2.5 }));
          for (var j = 1; j < 10; j += 1) {
            els.push(h('line', { key: 'iv' + j, x1: ix + j * IS / 10, y1: iy, x2: ix + j * IS / 10, y2: iy + IS, stroke: GRID_STROKE, strokeWidth: 0.8 }));
            els.push(h('line', { key: 'ih' + j, x1: ix, y1: iy + j * IS / 10, x2: ix + IS, y2: iy + j * IS / 10, stroke: GRID_STROKE, strokeWidth: 0.8 }));
          }
          els.push(h('text', { key: 'inset-f', x: ix + IS / 2, y: iy + IS + 22, textAnchor: 'middle', fill: COLORS.text, fontSize: 14, fontWeight: 700 }, named
            ? fill(t('stem.areaperimeter.unit_inset_label_any', '10 {small} × 10 {small} = 100 {small}²'), { small: small })
            : t('stem.areaperimeter.unit_inset_label', '10 cm × 10 cm = 100 cm²')));
        }
        var desc = named
          ? t('stem.areaperimeter.d_unit_square_ha', 'A hectare: a square 100 m on each side. It holds 100 rows of 100 square metres: 100 × 100 = 10000 m². The highlighted top row is only 100 of them.')
          : fill(t('stem.areaperimeter.d_unit_square', 'A square 1 {big} on each side. Each side is {n} {small} long, so the square holds {n} rows of {n} small squares: {n} × {n} = {nn} {small}². The highlighted top row is only {n} of them.'), { big: big, n: n, nn: nn, small: small });
        // Too many squares to draw one by one: say so on screen, not only in the description.
        var scaleNote = n === 100 ? fill(t('stem.areaperimeter.unit_blocks_note', '{nn} small squares are too many to draw one by one. Each block in the picture is 10 {small} by 10 {small}, which is 100 {small}², and one block is drawn magnified.'), { nn: nn, small: small }) : '';
        if (n === 100) desc += ' ' + scaleNote;
        var svg = h('svg', { key: n === 100 ? 'svg' : key, viewBox: '0 0 640 350', role: 'img', 'aria-labelledby': key + '-title ' + key + '-desc', 'data-ap-unit-square': pairId, 'data-ap-unit-scaled': n === 100 ? 'blocks' : undefined, style: { display: 'block', width: '100%', maxHeight: '360px' } }, [
          h('title', { key: 'title', id: key + '-title' }, named ? t('stem.areaperimeter.unit_square_title_ha', 'One hectare, filled with square metres') : fill(t('stem.areaperimeter.unit_square_title', 'One square {big}, filled with square {small}'), { big: big, small: small })),
          h('desc', { key: 'desc', id: key + '-desc' }, desc)
        ].concat(els));
        if (n !== 100) return svg;
        return h('div', { key: key + '-wrap' }, [
          svg,
          h('p', { key: 'note', 'data-ap-unit-scale-note': true, 'aria-hidden': true, style: { color: COLORS.muted, margin: '6px 0 0', fontSize: '0.92rem' } }, scaleNote)
        ]);
      }

      // ── short generated drills (square units, circles) ──
      function drillProblem(kind, level, seed) { return kind === 'units' ? generateConversion(level, seed) : generateCircle(level, seed); }
      function drillTopic(p) { return p.kind === 'unit' ? 'unit_convert' : p.type; }
      function drillPrompt(p) {
        if (p.kind === 'unit') return fill(t('stem.areaperimeter.q_unit_convert', 'Change {value} {from} into {to}. How many {to} is that?'), { value: numText(p.value), from: areaUnitText(p.from), to: areaUnitText(p.to) });
        var v = { r: p.r, d: p.d, u: unitText(p.unit), C: numText(p.C) };
        switch (p.type) {
          case 'circ_from_d': return fill(t('stem.areaperimeter.q_circ_from_d', 'A circle has a diameter of {d} {u}. What is its circumference?'), v);
          case 'circ_from_r': return fill(t('stem.areaperimeter.q_circ_from_r', 'A circle has a radius of {r} {u}. What is its circumference?'), v);
          case 'area_from_r': return fill(t('stem.areaperimeter.q_area_from_r', 'A circle has a radius of {r} {u}. What is its area?'), v);
          case 'area_from_d': return fill(t('stem.areaperimeter.q_area_from_d', 'A round rug has a diameter of {d} {u}. What is its area?'), v);
          default: return fill(t('stem.areaperimeter.q_r_from_circ', 'A circle’s circumference is {C} {u}, found using 3.14 for π. What is its radius?'), v);
        }
      }
      function drillAnswerUnit(p) {
        if (p.kind === 'unit') return areaUnitText(p.to);
        return p.measure === 'area' ? sqUnitText(p.unit) : unitText(p.unit);
      }
      function drillMistakeText(id, p) {
        if (p.kind === 'unit') {
          var v = { n: p.linear, nn: p.factor, big: unitText(p.big), small: unitText(p.small), bigName: areaUnitName(p.big) };
          if (id === 'linear_factor' && p.pair === 'ha_m') return t('stem.areaperimeter.m_linear_factor_ha', 'You used the length factor. A hectare is 100 m on each side, so it holds 100 rows of 100 m²: 100 × 100 = 10000 m², not 100. Look at the picture.');
          if (id === 'two_sides') return t('stem.areaperimeter.m_two_sides_acre', 'You added the sides of the acre strip: 660 + 66 = 726 is a length. Area multiplies: 1 acre = 660 × 66 = 43560 ft². Look at the picture.');
          if (id === 'metric_factor' && p.pair === 'acre_ft') return t('stem.areaperimeter.m_metric_factor_acre', 'Customary units are not based on 100. 1 acre = 660 × 66 = 43560 ft².');
          if (id === 'wrong_direction' && p.named) return p.dir === 'down'
            ? fill(t('stem.areaperimeter.m_wrong_direction_down_named', 'Check the direction. {small}² are smaller than {bigName}, so it takes more of them: your number should get bigger.'), v)
            : fill(t('stem.areaperimeter.m_wrong_direction_up_named', 'Check the direction. {bigName} are bigger than {small}², so it takes fewer of them: your number should get smaller.'), v);
          if (id === 'linear_factor') return fill(t('stem.areaperimeter.m_linear_factor', 'You used the length factor. One {big} is {n} {small} long, but 1 {big}² is {n} rows of {n} small squares: {n} × {n} = {nn} {small}², not {n}. Look at the picture.'), v);
          if (id === 'wrong_direction') return p.dir === 'down'
            ? fill(t('stem.areaperimeter.m_wrong_direction_down', 'Check the direction. {small}² are smaller than {big}², so it takes more of them: your number should get bigger.'), v)
            : fill(t('stem.areaperimeter.m_wrong_direction_up', 'Check the direction. {big}² are bigger than {small}², so it takes fewer of them: your number should get smaller.'), v);
          if (id === 'metric_factor') return fill(t('stem.areaperimeter.m_metric_factor', 'Customary units are not based on 100. One {big} is {n} {small}, so use {n} × {n}.'), v);
          return t('stem.areaperimeter.nudge_unit', 'Not yet. Work out how many small square units fill one big square unit, then decide: multiply or divide?');
        }
        switch (id) {
          case 'diameter_as_radius': return t('stem.areaperimeter.m_diameter_as_radius', 'You doubled the diameter. The diameter already goes all the way across the circle, so C = π × d.');
          case 'radius_as_diameter': return t('stem.areaperimeter.m_radius_as_diameter', 'You used the radius as if it were the diameter. The diameter is 2 × the radius, so C = 2 × π × r.');
          case 'circ_gave_area': return t('stem.areaperimeter.m_circ_gave_area', 'That is the area, π × r × r. The question asks for the circumference: the distance around.');
          case 'forgot_pi_circ': return t('stem.areaperimeter.m_forgot_pi_circ', 'You left out π. The distance around a circle is about 3.14 times the distance across.');
          case 'area_2pir': return t('stem.areaperimeter.m_area_2pir', 'That is 2πr, the circumference: the distance around. Area is the space inside: A = π × r × r.');
          case 'squared_diameter': return t('stem.areaperimeter.m_squared_diameter', 'You squared the diameter. The formula squares the radius: halve the diameter first, then square it.');
          case 'area_pi_r': return t('stem.areaperimeter.m_area_pi_r', 'You multiplied π by r only once. Area squares the radius: π × r × r.');
          case 'forgot_pi_area': return t('stem.areaperimeter.m_forgot_pi_area', 'You found r × r but left out π. Multiply r × r by π (about 3.14).');
          case 'gave_diameter': return t('stem.areaperimeter.m_gave_diameter', 'That is the diameter. The radius is half of it.');
          case 'divided_by_two_only': return t('stem.areaperimeter.m_divided_by_two_only', 'You divided by 2 but not by π. C = 2 × π × r, so divide by 2 × 3.14 = 6.28.');
          default: return t('stem.areaperimeter.nudge_circle', 'Not yet. Check which formula you need, and whether you were given the radius or the diameter.');
        }
      }
      function drillHints(p) {
        if (p.kind === 'unit') return [
          t('stem.areaperimeter.h_unit_1', 'Which unit is bigger? Changing to a smaller unit makes the number bigger; changing to a bigger unit makes it smaller.'),
          t('stem.areaperimeter.h_unit_2', 'Look at the picture: one big square unit is filled with small square units, row by row.'),
          p.pair === 'ha_m' ? t('stem.areaperimeter.h_unit_3_ha', 'A hectare is a square 100 m on each side, so 1 ha = 100 × 100 m².')
            : p.pair === 'acre_ft' ? t('stem.areaperimeter.h_unit_3_acre', 'An acre is 43560 ft², for example a strip 660 ft by 66 ft: 660 × 66.')
            : fill(t('stem.areaperimeter.h_unit_3', 'One {big} is {n} {small} long, so 1 {big}² is {n} × {n} {small}².'), { big: unitText(p.big), small: unitText(p.small), n: p.linear })];
        if (p.type === 'r_from_circ') return [
          t('stem.areaperimeter.h_rc_1', 'C = 2 × π × r. You know C, so work backward.'),
          t('stem.areaperimeter.h_rc_2', 'Undo multiplying by 2 × 3.14 by dividing by 6.28.'),
          t('stem.areaperimeter.h_rc_3', 'Circumference ÷ 6.28 gives the radius.')];
        if (p.measure === 'area') return [
          t('stem.areaperimeter.h_ca_1', 'Area is the space inside, in square units.'),
          t('stem.areaperimeter.h_ca_2', 'A = π × r × r. Use the radius, not the diameter.'),
          p.type === 'area_from_d' ? t('stem.areaperimeter.h_ca_3d', 'Halve the diameter to get the radius, multiply the radius by itself, then multiply by π.') : t('stem.areaperimeter.h_ca_3r', 'Multiply the radius by itself first, then multiply by π.')];
        return [
          t('stem.areaperimeter.h_cc_1', 'Circumference is the distance around. It is a little more than 3 diameters.'),
          t('stem.areaperimeter.h_cc_2', 'C = π × d. If you know the radius, double it to get the diameter first.'),
          t('stem.areaperimeter.h_cc_3', 'Multiply the diameter by π (about 3.14).')];
      }
      function drillSteps(p) {
        if (p.kind === 'unit') {
          var v = { big: unitText(p.big), small: unitText(p.small), n: p.linear, nn: p.factor, value: numText(p.value), bigName: areaUnitName(p.big), bigA: areaUnitText(p.big) };
          var first = p.pair === 'ha_m' ? step(t('stem.areaperimeter.s_unit_1_ha', 'A hectare is 100 m by 100 m, so 1 ha = 100 × 100 = {v} m².'), v, p.factor)
            : p.pair === 'acre_ft' ? step(t('stem.areaperimeter.s_unit_1_acre', '1 acre = 660 × 66 = {v} ft².'), v, p.factor)
            : step(t('stem.areaperimeter.s_unit_1', 'One {big} is {n} {small} long, so 1 {big}² = {n} × {n} = {v} {small}².'), v, p.factor);
          return [
            first,
            p.dir === 'down'
              ? step(t('stem.areaperimeter.s_unit_down', '{small}² are smaller, so it takes more of them: {value} × {nn} = {v} {small}²'), v, p.answer)
              : p.named
                ? step(t('stem.areaperimeter.s_unit_up_named', '{bigName} are bigger, so it takes fewer of them: {value} ÷ {nn} = {v} {bigA}'), v, p.answer)
                : step(t('stem.areaperimeter.s_unit_up', '{big}² are bigger, so it takes fewer of them: {value} ÷ {nn} = {v} {big}²'), v, p.answer)];
        }
        var c = { r: p.r, d: p.d, k: p.answerCand.k, u: unitText(p.unit), su: sqUnitText(p.unit), C: numText(p.C) };
        switch (p.type) {
          case 'circ_from_d': return [step(t('stem.areaperimeter.s_cd_1', 'Circumference = π × diameter.')), step(t('stem.areaperimeter.s_cd_2', 'C = π × {d} = {k}π ≈ {v} {u}'), c, round1(p.answer))];
          case 'circ_from_r': return [step(t('stem.areaperimeter.s_cr_1', 'The diameter is 2 × the radius: 2 × {r} = {v} {u}.'), c, p.d), step(t('stem.areaperimeter.s_cd_2', 'C = π × {d} = {k}π ≈ {v} {u}'), c, round1(p.answer))];
          case 'area_from_r': return [step(t('stem.areaperimeter.s_ar_1', 'Area = π × r × r.')), step(t('stem.areaperimeter.s_ar_2', 'A = π × {r} × {r} = {k}π ≈ {v} {su}'), c, round1(p.answer))];
          case 'area_from_d': return [step(t('stem.areaperimeter.s_ad_1', 'The radius is half the diameter: {d} ÷ 2 = {v} {u}.'), c, p.r), step(t('stem.areaperimeter.s_ar_2', 'A = π × {r} × {r} = {k}π ≈ {v} {su}'), c, round1(p.answer))];
          default: return [step(t('stem.areaperimeter.s_rc_1', 'C = 2 × π × r, so r = C ÷ (2 × π).')), step(t('stem.areaperimeter.s_rc_2', 'r = {C} ÷ (2 × 3.14) = {v} {u}'), c, p.r)];
        }
      }
      function circleDiagram(p, key) {
        var u = unitText(p.unit);
        var cx = 320, cy = 135, R = 100;
        var els = [
          h('circle', { key: 'c', cx: cx, cy: cy, r: R, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }),
          h('circle', { key: 'o', cx: cx, cy: cy, r: 4, fill: COLORS.text })
        ];
        var desc;
        if (p.type === 'circ_from_d' || p.type === 'area_from_d') {
          els.push(h('line', { key: 'd', x1: cx - R, y1: cy, x2: cx + R, y2: cy, stroke: COLORS.blue, strokeWidth: 3 }));
          els.push(h('text', { key: 'dl', x: cx, y: cy - 12, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.label_d', 'd = {d} {u}'), { d: p.d, u: u })));
          desc = fill(t('stem.areaperimeter.d_circle_d', 'A circle with a diameter of {d} {u} drawn straight across through the centre.'), { d: p.d, u: u });
        } else if (p.type === 'r_from_circ') {
          els.push(h('line', { key: 'r', x1: cx, y1: cy, x2: cx + R, y2: cy, stroke: COLORS.blue, strokeWidth: 3, strokeDasharray: '7 5' }));
          els.push(h('text', { key: 'rl', x: cx + R / 2, y: cy - 12, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, '?'));
          els.push(h('text', { key: 'cl', x: cx, y: cy + R + 30, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.label_c', 'C = {C} {u}'), { C: numText(p.C), u: u })));
          desc = fill(t('stem.areaperimeter.d_circle_c', 'A circle whose distance around is {C} {u}. A radius from the centre to the edge is marked with a question mark.'), { C: numText(p.C), u: u });
        } else {
          els.push(h('line', { key: 'r', x1: cx, y1: cy, x2: cx + R, y2: cy, stroke: COLORS.blue, strokeWidth: 3 }));
          els.push(h('text', { key: 'rl', x: cx + R / 2, y: cy - 12, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.label_r', 'r = {r} {u}'), { r: p.r, u: u })));
          desc = fill(t('stem.areaperimeter.d_circle_r', 'A circle with a radius of {r} {u} drawn from the centre to the edge.'), { r: p.r, u: u });
        }
        return h('svg', { key: key, viewBox: '0 0 640 280', role: 'img', 'aria-labelledby': key + '-title ' + key + '-desc', style: { display: 'block', width: '100%', maxHeight: '300px' } }, [
          h('title', { key: 'title', id: key + '-title' }, fill(t('stem.areaperimeter.diagram_title', 'Diagram: {topic}'), { topic: topicLabel(p.type) })),
          h('desc', { key: 'desc', id: key + '-desc' }, desc)
        ].concat(els));
      }

      function drillPanel(kind) {
        var level = kind === 'units' ? unitLevel : circleLevel;
        var d = plainMap(plainMap(state.drills)[kind]);
        var seed = Number(d.seed) > 0 && Number(d.level) === level ? Number(d.seed) : (kind === 'units' ? 101 : 202) + level * 7;
        var p = drillProblem(kind, level, seed);
        var item = d.sig === p.sig ? d : {};
        var attempts = Math.max(0, Number(item.attempts) || 0);
        var revealed = !!item.revealed;
        var feedback = item.feedback && item.feedback.sig === p.sig ? item.feedback : null;
        var typed = textOf(item.answer);
        var hints = drillHints(p);
        var hintStep = clamp(item.hintStep || 0, 0, hints.length);
        var solvedMap = plainMap(state.drillSolved);
        var solvedBefore = !!solvedMap[p.sig];
        var creditBlocked = !!plainMap(state.drillRevealed)[p.sig];
        var solvedHere = !!(feedback && feedback.kind === 'correct');
        var locked = revealed || solvedHere || (solvedBefore && !feedback);
        var missed = plainMap(state.drillMissed);
        var missedKeys = Object.keys(missed).filter(function(sig) { var m = missed[sig]; return m && m.kind === kind && Number(m.level) === level && Number(m.seed) > 0; });
        var prefix = kind === 'units' ? 'u:' : 'c:';
        var solvedOfKind = Object.keys(solvedMap).filter(function(sig) { return solvedMap[sig] && sig.indexOf(prefix) === 0; }).length;
        var ids = { input: 'ap-drill-' + kind, prompt: 'ap-drill-' + kind + '-prompt', fb: 'ap-drill-' + kind + '-fb', hint: 'ap-drill-' + kind + '-hint', format: 'ap-drill-' + kind + '-format' };
        var submitLocked = false;
        function pinItem(extra) { return Object.assign({ seed: p.seed, level: level, sig: p.sig }, extra || {}); }
        function writeItem(changes) {
          patch(function(current) {
            var all = Object.assign({}, plainMap(current.drills));
            var mine = plainMap(all[kind]);
            all[kind] = Object.assign({}, mine.sig === p.sig ? mine : {}, pinItem(), typeof changes === 'function' ? changes(current) : changes);
            return { drills: all };
          });
        }
        function freshItem(next) { return { seed: next.seed, level: level, sig: next.sig, answer: '', attempts: 0, hintStep: 0, revealed: false, feedback: null, showExample: false }; }
        function goTo(next, message) {
          patch(function(current) { var all = Object.assign({}, plainMap(current.drills)); all[kind] = freshItem(next); return { drills: all }; });
          speak(fill(message, { prompt: drillPrompt(next) }));
        }
        function newProblem() {
          var next = null;
          for (var i = 0; i < 12; i += 1) { next = drillProblem(kind, level, randomSeed()); if (next.sig !== p.sig && !solvedMap[next.sig]) break; }
          goTo(next, t('stem.areaperimeter.sr_new_problem', 'New problem. {prompt}'));
        }
        function retryMissed() {
          if (!missedKeys.length) return;
          var at = missedKeys.indexOf(p.sig);
          var m = missed[missedKeys[at < 0 ? 0 : (at + 1) % missedKeys.length]];
          goTo(drillProblem(kind, level, Number(m.seed)), t('stem.areaperimeter.sr_retry_problem', 'Practice again. {prompt}'));
        }
        function submit(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (locked || submitLocked) return;
          var input = kind === 'units' ? { value: parseBigAnswer(typed), piK: null } : parseCircleAnswer(typed);
          if (!isFinite(input.value)) { writeItem({ feedback: { sig: p.sig, kind: String(typed).trim() ? 'unreadable' : 'empty' } }); return; }
          var verdict = kind === 'units' ? diagnoseConversion(p, input.value) : diagnoseCircle(p, input);
          if (verdict === 'precision') { writeItem({ feedback: { sig: p.sig, kind: 'precision' } }); return; }
          submitLocked = true;
          var tries = attempts + 1;
          if (verdict === 'correct') {
            var firstSolve = !solvedBefore && !creditBlocked;
            patch(function(current) {
              var all = Object.assign({}, plainMap(current.drills));
              all[kind] = Object.assign({}, plainMap(all[kind]), pinItem({ attempts: tries, feedback: { sig: p.sig, kind: 'correct', tries: tries, credited: firstSolve } }));
              var solved = Object.assign({}, plainMap(current.drillSolved));
              if (firstSolve) solved[p.sig] = true;
              var missedNext = Object.assign({}, plainMap(current.drillMissed)); delete missedNext[p.sig];
              return { drills: all, drillSolved: solved, drillMissed: missedNext };
            });
            if (firstSolve) awardXP('areaPerimeter', tries === 1 ? 5 : 3, kind === 'units' ? t('stem.areaperimeter.xp_units', 'Square units problem') : t('stem.areaperimeter.xp_circles', 'Circle problem'));
          } else {
            patch(function(current) {
              var all = Object.assign({}, plainMap(current.drills));
              all[kind] = Object.assign({}, plainMap(all[kind]), pinItem({ attempts: tries, feedback: { sig: p.sig, kind: verdict ? 'mistake' : 'generic', mistake: verdict || '', tries: tries } }));
              var counts = Object.assign({}, plainMap(current.mistakeCounts));
              var mk = verdict || 'other';
              counts[mk] = (Number(counts[mk]) || 0) + 1;
              var priorMissed = plainMap(current.drillMissed);
              var missedNext = Object.assign({}, priorMissed); missedNext[p.sig] = { kind: kind, level: level, seed: p.seed };
              var byType = Object.assign({}, plainMap(current.missedByType));
              if (!priorMissed[p.sig]) byType[drillTopic(p)] = (Number(byType[drillTopic(p)]) || 0) + 1;
              return { drills: all, mistakeCounts: counts, drillMissed: missedNext, missedByType: byType };
            });
          }
        }
        function reveal() {
          if (!revealsAllowed || attempts < 2 || locked) return;
          patch(function(current) {
            var all = Object.assign({}, plainMap(current.drills));
            all[kind] = Object.assign({}, plainMap(all[kind]), pinItem({ revealed: true, feedback: { sig: p.sig, kind: 'revealed' } }));
            var sigs = Object.assign({}, plainMap(current.drillRevealed)); sigs[p.sig] = true;
            var missedNext = Object.assign({}, plainMap(current.drillMissed)); missedNext[p.sig] = { kind: kind, level: level, seed: p.seed };
            return { drills: all, drillRevealed: sigs, drillMissed: missedNext };
          });
        }

        var fbNode = null;
        if (feedback) {
          var tone = 'warn', text = '';
          if (feedback.kind === 'correct') {
            tone = 'good';
            text = feedback.credited
              ? (feedback.tries > 1 ? t('stem.areaperimeter.fb_correct_retry', 'Correct! You fixed it. That is what checking your work is for.') : t('stem.areaperimeter.fb_correct', 'Correct!'))
              : t('stem.areaperimeter.fb_correct_no_points', 'Correct. This one was already counted (or you saw its solution), so it earns no new points.');
          } else if (feedback.kind === 'empty') text = t('stem.areaperimeter.enter_a_number_before_checking', "Enter a number before checking.");
          else if (feedback.kind === 'unreadable') text = kind === 'units' ? t('stem.areaperimeter.fb_unreadable', 'I could not read that number. Type a whole number, a decimal, a fraction like 3/4, or a mixed number like 2 1/2.') : t('stem.areaperimeter.fb_unreadable_circle', 'I could not read that. Type a number like 28.3, or a multiple of π like 9π.');
          else if (feedback.kind === 'precision') { tone = 'info'; text = t('stem.areaperimeter.fb_precision', 'Very close. Round to the nearest tenth, not to a whole number, or answer in terms of π.'); }
          else if (feedback.kind === 'revealed') { tone = 'info'; text = t('stem.areaperimeter.fb_revealed', 'Here is the worked solution. Read each step, then try a new problem. This one is saved to practise again, without points.'); }
          else {
            var retryLine = feedback.tries >= 2
              ? (revealsAllowed ? t('stem.areaperimeter.fb_try_or_reveal', 'Try again, use a hint, or show the worked solution.') : t('stem.areaperimeter.fb_try_or_hint', 'Try again or use a hint.'))
              : t('stem.areaperimeter.fb_second_try', 'Have another go: you have a second try.');
            text = drillMistakeText(feedback.kind === 'mistake' ? feedback.mistake : '', p) + ' ' + retryLine;
          }
          fbNode = note(text, tone, 'drill-fb', { id: ids.fb, 'data-ap-drill-feedback': feedback.kind, 'data-ap-mistake': feedback.mistake || undefined });
        } else if (solvedBefore && !revealed) {
          fbNode = note(t('stem.areaperimeter.solved_before', 'You solved this one before. Try a new problem.'), 'good', 'drill-fb', { id: ids.fb, 'data-ap-drill-feedback': 'solved-before' });
        }
        var showPicture = kind === 'units' && (hintStep >= 2 || locked || !!(feedback && (feedback.mistake === 'linear_factor' || feedback.mistake === 'metric_factor' || feedback.mistake === 'two_sides')));

        // A worked example with different numbers; its last step goes blank
        // after one solve, and it is hidden after two (it can be reopened).
        function exampleAt(s) { return kind === 'units' ? generateConversion(level, s) : generateCircle(level, s, p.type); }
        var example = exampleAt(((p.seed * 7) + 7919) >>> 0);
        for (var e = 1; e < 24 && (example.sig === p.sig || Math.abs(example.answer - p.answer) < 1e-6); e += 1) {
          example = exampleAt(((p.seed * 7) + 7919 + e * 104729) >>> 0);
        }
        var exSteps = drillSteps(example);
        var exampleOpen = solvedOfKind < 2 || !!item.showExample;
        var exampleNode = exampleOpen ? h('section', { key: 'example', 'aria-labelledby': 'ap-drill-' + kind + '-ex', 'data-ap-drill-example': solvedOfKind >= 1 ? 'faded' : 'full', style: { marginTop: '12px', padding: '12px', borderRadius: '12px', border: '1px dashed ' + COLORS.border, background: COLORS.panelAlt, color: COLORS.text } }, [
          h('h4', { key: 'h', id: 'ap-drill-' + kind + '-ex', style: { margin: '0 0 6px' } }, t('stem.areaperimeter.worked_example', 'Worked example')),
          h('p', { key: 'q', style: { margin: '0 0 6px' } }, drillPrompt(example)),
          h('ol', { key: 'steps', style: { margin: 0, paddingLeft: '22px', lineHeight: 1.6 } }, exSteps.map(function(s, i) {
            return h('li', { key: i }, stepText(s, solvedOfKind >= 1 && i === exSteps.length - 1));
          })),
          solvedOfKind >= 1 ? h('p', { key: 'fade', style: { margin: '6px 0 0', color: COLORS.muted } }, t('stem.areaperimeter.drill_example_faded', 'The last step is blank now. Work it out in your head before you try your own problem.')) : null
        ]) : actionButton(t('stem.areaperimeter.show_example', 'Show a worked example'), function() { writeItem({ showExample: true }); }, { key: 'show-example', compact: true, style: { marginTop: '10px' } });

        var showSolution = revealed || solvedHere;
        var answerValue = locked && !solvedHere ? '' : typed;
        var describedBy = ids.prompt + (fbNode ? ' ' + ids.fb : '') + (kind === 'circles' ? ' ' + ids.format : '');
        return panel([
          heading(kind === 'units' ? t('stem.areaperimeter.drill_units_heading', 'Practice: convert square units') : t('stem.areaperimeter.drill_circles_heading', 'Practice: circumference and area'), 'drill-h'),
          levelChips(kind === 'units' ? 'unitLevel' : 'circleLevel', level, 'levels-' + kind),
          exampleNode,
          h('p', { key: 'prompt', id: ids.prompt, 'data-ap-drill-prompt': p.sig, style: { color: COLORS.text, fontSize: '1.08rem', fontWeight: 650, lineHeight: 1.55, margin: '16px 0 8px' } }, drillPrompt(p)),
          kind === 'circles' ? circleDiagram(p, 'ap-drill-circle') : null,
          h('form', { key: 'form', onSubmit: submit, style: { display: 'flex', gap: '9px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '10px' } }, [
            textField(ids.input, fill(t('stem.areaperimeter.your_answer_in', 'Your answer ({unit})'), { unit: drillAnswerUnit(p) }), answerValue, function(value) {
              writeItem({ answer: value, feedback: feedback && feedback.kind !== 'correct' ? feedback : null });
            }, { disabled: locked, invalid: !!(feedback && (feedback.kind === 'mistake' || feedback.kind === 'generic')), describedBy: describedBy, inputMode: kind === 'circles' ? 'text' : 'decimal', flex: '1 1 210px' }),
            actionButton(locked && !revealed ? t('stem.areaperimeter.solved_2', "Solved") : t('stem.areaperimeter.check_answer', "Check answer"), null, { key: 'submit', type: 'submit', primary: true, disabled: locked }),
            actionButton(hintStep < hints.length ? t('stem.areaperimeter.show_hint', "Show hint") : t('stem.areaperimeter.no_more_hints', 'No more hints'), function() { writeItem({ hintStep: hintStep + 1 }); speak(hints[hintStep] || ''); }, { key: 'hint', disabled: hintStep >= hints.length || locked, controls: ids.hint, expanded: hintStep > 0 }),
            revealsAllowed && attempts >= 2 && !locked ? actionButton(t('stem.areaperimeter.show_solution', 'Show the worked solution'), reveal, { key: 'reveal' }) : null
          ]),
          kind === 'circles' ? h('p', { key: 'format', id: ids.format, style: { color: COLORS.muted, margin: '6px 0 0', fontSize: '0.92rem' } }, t('stem.areaperimeter.circle_format', 'Use 3.14 or the π key and round to the nearest tenth, or answer in terms of π, like 16π.')) : null,
          hintLadder(hints, hintStep, ids.hint, { 'data-ap-drill-hints': hintStep }),
          h('div', { key: 'live', role: 'status', 'aria-live': 'polite' }, fbNode),
          showPicture ? h('div', { key: 'picture', style: { marginTop: '12px' } }, unitSquareSvg(p.pair, 'ap-drill-unit-square')) : null,
          showSolution ? h('section', { key: 'solution', 'aria-labelledby': 'ap-drill-' + kind + '-sol', 'data-ap-drill-solution': true, style: { marginTop: '12px', color: COLORS.text } }, [
            h('h4', { key: 'h', id: 'ap-drill-' + kind + '-sol', style: { margin: '0 0 6px' } }, t('stem.areaperimeter.how_it_works', 'How it works')),
            h('ol', { key: 'steps', style: { margin: 0, paddingLeft: '22px', lineHeight: 1.6 } }, drillSteps(p).map(function(s, i) { return h('li', { key: i }, stepText(s, false)); }))
          ]) : null,
          h('div', { key: 'nav', style: { display: 'flex', justifyContent: 'space-between', gap: '9px', flexWrap: 'wrap', marginTop: '14px' } }, [
            missedKeys.length ? actionButton(fill(t('stem.areaperimeter.retry_missed_n', 'Practise missed problems ({n})'), { n: missedKeys.length }), retryMissed, { key: 'retry', compact: true }) : h('span', { key: 'spacer' }),
            h('span', { key: 'count', style: { alignSelf: 'center', color: COLORS.muted, fontSize: '0.9rem' } }, fill(t('stem.areaperimeter.unique_complete', '{n} different problems solved'), { n: solvedOfKind })),
            actionButton(t('stem.areaperimeter.new_problem', 'New problem'), newProblem, { key: 'next', compact: true, primary: locked })
          ])
        ], { key: 'drill-' + kind, 'data-ap-drill': kind, 'data-ap-drill-sig': p.sig });
      }

      // ── Square Units mode ──
      function unitsView() {
        var pairId = UNIT_PAIR_IDS.indexOf(state.unitPair) >= 0 ? state.unitPair : 'm_cm';
        var pair = AREA_UNIT_PAIRS[pairId];
        var factor = pair.factor;
        var typedMap = plainMap(state.unitPredict);
        var checkedMap = plainMap(state.unitPredictChecked);
        var typedNow = textOf(typedMap[pairId]);
        var checked = isFinite(Number(checkedMap[pairId])) && checkedMap[pairId] !== null && checkedMap[pairId] !== '' ? Number(checkedMap[pairId]) : null;
        var big = unitText(pair.big), small = unitText(pair.small);
        var v = { big: big, small: small, n: pair.linear, nn: factor };
        function checkPrediction(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          var value = parseBigAnswer(typedNow);
          if (!isFinite(value)) return;
          var next = Object.assign({}, checkedMap); next[pairId] = value;
          var changes = { unitPredictChecked: next };
          var slip = pair.linear && valuesMatch(value, pair.linear) ? 'linear_factor' : (pair.sides && valuesMatch(value, pair.sides[0] + pair.sides[1]) ? 'two_sides' : '');
          if (slip) {
            var counts = Object.assign({}, plainMap(state.mistakeCounts)); counts[slip] = (Number(counts[slip]) || 0) + 1;
            changes.mistakeCounts = counts;
          }
          patch(changes);
        }
        var verdict = null;
        if (checked != null) {
          var right = valuesMatch(checked, factor);
          var linearSlip = !right && pair.linear && valuesMatch(checked, pair.linear);
          var sidesSlip = !right && pair.sides && valuesMatch(checked, pair.sides[0] + pair.sides[1]);
          var verdictId = right ? 'right' : (linearSlip ? 'linear_factor' : (sidesSlip ? 'two_sides' : 'other'));
          var verdictText;
          if (pairId === 'ha_m') verdictText = right ? t('stem.areaperimeter.unit_predict_ha_right', 'Right: 10000. A hectare is 100 m by 100 m, so it holds 100 rows of 100 square metres: 100 × 100 = 10000 m².')
            : linearSlip ? t('stem.areaperimeter.unit_predict_ha_linear', 'Many people say 100, because a hectare is 100 m on each side. But 100 square metres make only the top row. There are 100 rows, so 1 ha = 100 × 100 = 10000 m².')
            : t('stem.areaperimeter.unit_predict_ha_other', 'Not quite. A hectare is 100 m by 100 m: 100 rows of 100 square metres, so 1 ha = 100 × 100 = 10000 m².');
          else if (pairId === 'acre_ft') verdictText = right ? t('stem.areaperimeter.unit_predict_acre_right', 'Right: 43560. The strip holds 66 rows of 660 square feet: 660 × 66 = 43560 ft². Any shape with that much area is an acre.')
            : sidesSlip ? t('stem.areaperimeter.unit_predict_acre_sides', 'You added the two sides: 660 + 66 = 726, which is a length in feet. Area multiplies: 660 × 66 = 43560 ft².')
            : t('stem.areaperimeter.unit_predict_acre_other', 'Not quite. The strip has 66 rows of 660 square feet, so 1 acre = 660 × 66 = 43560 ft².');
          else verdictText = right ? fill(t('stem.areaperimeter.unit_predict_right', 'Right: {nn}. A square unit has two sides to convert, so the length factor {n} is used twice: {n} × {n}.'), v)
            : linearSlip ? fill(t('stem.areaperimeter.unit_predict_linear', 'Many people say {n}, because 1 {big} = {n} {small}. But {n} squares make only the top row. There are {n} rows, so 1 {big}² = {n} × {n} = {nn} {small}².'), v)
            : fill(t('stem.areaperimeter.unit_predict_other', 'Not quite. Count the small squares in one row, then the number of rows: 1 {big}² = {n} × {n} = {nn} {small}².'), v);
          verdict = note(verdictText, right ? 'good' : 'warn', 'unit-verdict', { 'data-ap-unit-verdict': verdictId });
        }
        function pairLabel(id) {
          if (id === 'ha_m') return t('stem.areaperimeter.unit_pair_ha', '1 ha in m²');
          if (id === 'acre_ft') return t('stem.areaperimeter.unit_pair_acre', '1 acre in ft²');
          var pr = AREA_UNIT_PAIRS[id];
          return fill(t('stem.areaperimeter.unit_pair_label', '1 {big}² in {small}²'), { big: unitText(pr.big), small: unitText(pr.small) });
        }
        var predictLabel = pairId === 'ha_m' ? t('stem.areaperimeter.unit_predict_ha', 'A hectare is a square 100 m on each side. Predict: how many m² are in 1 hectare?')
          : pairId === 'acre_ft' ? t('stem.areaperimeter.unit_predict_acre', 'An acre can be a strip 660 ft long and 66 ft wide. Predict: how many ft² are in 1 acre?')
          : fill(t('stem.areaperimeter.unit_predict_label', 'Predict: how many {small}² fit in 1 {big}²?'), v);
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.units_heading', 'Square units: converting area')),
            lead(t('stem.areaperimeter.units_intro', 'A square unit is a square, so converting it means converting both of its sides. Predict first, then look inside the square.')),
            chipGroup(t('stem.areaperimeter.unit_pair_group', 'Which square unit?'), UNIT_PAIR_IDS.map(function(id) {
              return { id: id, label: pairLabel(id) };
            }), pairId, function(id) { patch({ unitPair: id }); }, 'unit-pairs'),
            h('form', { key: 'predict', onSubmit: checkPrediction, 'data-ap-unit-predict': pairId, style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '14px' } }, [
              textField('ap-unit-predict', predictLabel, typedNow, function(value) {
                var next = Object.assign({}, typedMap); next[pairId] = value; patch({ unitPredict: next });
              }, { disabled: checked != null }),
              actionButton(t('stem.areaperimeter.check_my_prediction', 'Check my prediction'), null, { key: 'check', type: 'submit', primary: true, disabled: checked != null || !isFinite(parseBigAnswer(typedNow)) })
            ]),
            h('div', { key: 'verdict', role: 'status' }, verdict),
            checked != null ? unitSquareSvg(pairId, 'ap-unit-square') : h('p', { key: 'hidden', style: { color: COLORS.muted, marginTop: '12px' } }, t('stem.areaperimeter.unit_picture_after', 'The picture of the square appears after you check your prediction.')),
            h('div', { key: 'links', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } }, [volumeLink()]),
            note(t('stem.areaperimeter.units_volume_note', 'The same idea grows with each dimension: a cube 1 m on each side holds 100 × 100 × 100 cubic centimetres.'), 'info', 'volume-note')
          ], { key: 'units-explore' }),
          drillPanel('units')
        ]);
      }

      // ── Circles mode (7.G.4) ──
      function objectName(id) {
        switch (id) {
          case 'coin': return t('stem.areaperimeter.obj_coin', 'Coin');
          case 'lid': return t('stem.areaperimeter.obj_lid', 'Jar lid');
          case 'cup': return t('stem.areaperimeter.obj_cup', 'Cup');
          case 'plate': return t('stem.areaperimeter.obj_plate', 'Plate');
          default: return t('stem.areaperimeter.obj_wheel', 'Bike wheel');
        }
      }
      function ratioMessage(id, obj, m) {
        var v = { c: numText(m.c), d: obj.d, ratio: m.ratio.toFixed(2) };
        switch (id) {
          case 'correct': return fill(t('stem.areaperimeter.ratio_ok', 'Recorded: {c} ÷ {d} = {ratio}.'), v);
          case 'ratio_upside_down': return t('stem.areaperimeter.m_ratio_upside_down', 'You divided the diameter by the circumference. Divide the circumference (the longer length) by the diameter.');
          case 'ratio_used_radius': return fill(t('stem.areaperimeter.m_ratio_used_radius', 'You divided by the radius. The diameter goes all the way across: {d} cm.'), v);
          case 'ratio_subtracted': return t('stem.areaperimeter.m_ratio_subtracted', 'You subtracted. The question is how many diameters fit around the circle, so divide.');
          default: return t('stem.areaperimeter.m_ratio_other', 'Not quite. Divide the track length by the diameter, then round to 2 decimal places.');
        }
      }
      function sectorsSvg(sm) {
        var n = sm.n, R = 75, alpha = 2 * Math.PI / n;
        var els = [];
        var cx = 100, cy = 150;
        for (var i = 0; i < n; i += 1) {
          var a0 = -Math.PI / 2 + i * alpha, a1 = a0 + alpha;
          var even = i % 2 === 0;
          els.push(h('path', { key: 'c' + i, d: 'M ' + cx + ' ' + cy + ' L ' + round1(cx + R * Math.cos(a0)) + ' ' + round1(cy + R * Math.sin(a0)) + ' A ' + R + ' ' + R + ' 0 0 1 ' + round1(cx + R * Math.cos(a1)) + ' ' + round1(cy + R * Math.sin(a1)) + ' Z',
            fill: even ? COLORS.tileSoft : COLORS.shapeB, stroke: even ? COLORS.teal : COLORS.blue, strokeWidth: 1.5 }));
        }
        var s = R * Math.sin(alpha / 2), cA = R * Math.cos(alpha / 2);
        var top = 110, left = 215, x0 = left + s;
        for (var k = 0; k < n; k += 1) {
          var ax = x0 + k * s;
          var path;
          if (k % 2 === 0) path = 'M ' + round1(ax) + ' ' + top + ' L ' + round1(ax - s) + ' ' + round1(top + cA) + ' A ' + R + ' ' + R + ' 0 0 0 ' + round1(ax + s) + ' ' + round1(top + cA) + ' Z';
          else path = 'M ' + round1(ax) + ' ' + round1(top + cA) + ' L ' + round1(ax - s) + ' ' + top + ' A ' + R + ' ' + R + ' 0 0 1 ' + round1(ax + s) + ' ' + top + ' Z';
          els.push(h('path', { key: 'r' + k, d: path, fill: k % 2 === 0 ? COLORS.tileSoft : COLORS.shapeB, stroke: k % 2 === 0 ? COLORS.teal : COLORS.blue, strokeWidth: 1.5, 'data-ap-sector': k }));
        }
        var right = left + (n + 1) * s;
        els.push(h('line', { key: 'base', x1: left, y1: top + R + 18, x2: right, y2: top + R + 18, stroke: COLORS.text, strokeWidth: 2 }));
        els.push(h('text', { key: 'base-l', x: (left + right) / 2, y: top + R + 40, textAnchor: 'middle', fill: COLORS.text, fontSize: 15, fontWeight: 800 }, t('stem.areaperimeter.sector_base_label', 'about half the circumference: π × r')));
        els.push(h('line', { key: 'hgt', x1: right + 14, y1: top, x2: right + 14, y2: top + cA, stroke: COLORS.text, strokeWidth: 2 }));
        els.push(h('text', { key: 'hgt-l', x: right + 20, y: top + cA / 2 + 5, fill: COLORS.text, fontSize: 15, fontWeight: 800 }, t('stem.areaperimeter.sector_height_label', 'about r')));
        var desc = t('stem.areaperimeter.d_sectors', 'Left: a circle cut into equal sectors in two alternating colours. Right: the same sectors laid in a row, alternately pointing up and down. The bumpy bottom edge is half the circumference, π × r, and the row is about one radius tall, so it looks like a parallelogram with bumpy edges.')
          + ' ' + fill(t('stem.areaperimeter.d_sectors_bump', 'With {n} sectors and a radius of 3 units, the bumps are {b} units high.'), { n: n, b: (sm.bump).toFixed(2) });
        return h('svg', { key: 'ap-sectors', viewBox: '0 0 640 270', role: 'img', 'aria-labelledby': 'ap-sectors-title ap-sectors-desc', 'data-ap-sectors': n, style: { display: 'block', width: '100%', maxHeight: '300px' } }, [
          h('title', { key: 'title', id: 'ap-sectors-title' }, fill(t('stem.areaperimeter.sectors_title', 'A circle cut into {n} sectors and rearranged'), { n: n })),
          h('desc', { key: 'desc', id: 'ap-sectors-desc' }, desc)
        ].concat(els));
      }

      function circlesView() {
        var obj = CIRCLE_OBJECTS.filter(function(o) { return o.id === state.circleObject; })[0] || CIRCLE_OBJECTS[0];
        var meas = circleMeasurement(obj.d);
        var rolledMap = plainMap(state.circleRolled);
        var rolled = !!rolledMap[obj.id];
        var claim = ['same', 'bigger', 'smaller'].indexOf(state.circleClaim) >= 0 ? state.circleClaim : '';
        var records = plainMap(state.circleRecords);
        var recorded = CIRCLE_OBJECTS.filter(function(o) { return !!records[o.id]; });
        var ratioInputs = plainMap(state.circleRatioInputs);
        var ratioTyped = textOf(ratioInputs[obj.id]);
        var ratioFbRaw = state.circleRatioFeedback && state.circleRatioFeedback.id === obj.id ? state.circleRatioFeedback.verdict : '';
        var ratioFb = ['correct', 'ratio_upside_down', 'ratio_used_radius', 'ratio_subtracted', 'ratio_other', 'revealed'].indexOf(ratioFbRaw) >= 0 ? ratioFbRaw : '';
        var checkedNow = !!claim && state.circleClaimCheckedFor === claim;
        // Reading the track off the ruler (stage C): per circle, the marker
        // position, typed reading, tries, hints and the accepted reading.
        var ruler = rulerFor(obj.id);
        var readAll = plainMap(state.circleRead);
        var read = plainMap(readAll[obj.id]);
        var readValue = isFinite(Number(read.value)) && Number(read.value) > 0 && read.value !== null && read.value !== '' ? Number(read.value) : null;
        var readTries = Math.max(0, Number(read.tries) || 0);
        var readHint = clamp(read.hint || 0, 0, 3);
        var READ_VERDICTS = ['correct', 'read_diameter', 'read_major_slip', 'read_close_short', 'read_close_long', 'read_short', 'read_long', 'revealed', 'empty'];
        var readVerdict = READ_VERDICTS.indexOf(read.verdict) >= 0 ? read.verdict : '';
        var marker = snapReading(ruler, read.marker == null ? 0 : read.marker);
        // Old saves recorded the ratio before readings existed: use the true length.
        var reading = readValue != null ? readValue : (records[obj.id] ? meas.c : null);
        var ratioTries = Math.max(0, Number(plainMap(state.circleRatioTries)[obj.id]) || 0);
        function writeRead(changes) {
          patch(function(current) {
            var all = Object.assign({}, plainMap(current.circleRead));
            all[obj.id] = Object.assign({}, plainMap(all[obj.id]), changes);
            return { circleRead: all };
          });
        }
        // The reward counts the first claim, made before any circle is measured.
        var claimLock = ['same', 'bigger', 'smaller'].indexOf(state.circleClaimLock) >= 0 ? state.circleClaimLock : '';
        function pickClaim(id) { patch(claimLock ? { circleClaim: id, circleClaimCheckedFor: '' } : { circleClaim: id, circleClaimCheckedFor: '', circleClaimLock: claim || id }); speak(t('stem.areaperimeter.sr_circle_claim', 'Claim saved. Now roll circles and measure.')); }
        function onRolled() {
          patch(function(current) { var next = Object.assign({}, plainMap(current.circleRolled)); next[obj.id] = true; return { circleRolled: next }; });
          speak(t('stem.areaperimeter.sr_rolled_read', 'One full turn. A red mark shows where the track ends. Read its length on the ruler: move the ruler marker, or count the marks.'));
        }
        function moveMarker(value) {
          var v = snapReading(ruler, value);
          if (v !== marker) writeRead({ marker: v });
        }
        function markerText(v) {
          var place = markerPlace(ruler, v);
          var vars = { v: numText(v) };
          if (place === 'end') return fill(t('stem.areaperimeter.marker_end', 'Ruler marker at {v} cm, at the end of the track.'), vars);
          if (place === 'past') return fill(t('stem.areaperimeter.marker_past', 'Ruler marker at {v} cm, past the end of the track.'), vars);
          return fill(t('stem.areaperimeter.marker_on', 'Ruler marker at {v} cm, on the track.'), vars);
        }
        var readSubmitLocked = false;
        function checkReadingNow(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (!rolled || readValue != null || records[obj.id] || readSubmitLocked) return;
          var typedRead = textOf(read.typed);
          var x = parseAnswer(typedRead);
          if (!isFinite(x)) { writeRead({ verdict: 'empty' }); return; }
          readSubmitLocked = true;
          var verdict = checkReading(obj.id, x);
          if (verdict === 'correct') {
            writeRead({ verdict: 'correct', value: round6(x), tries: readTries + 1 });
            // The reading form (and its status region) is replaced, so say it here.
            speak(fill(t('stem.areaperimeter.read_ok', 'Good reading: {c} cm. Now divide it by the diameter.'), { c: numText(round6(x)) }));
          } else {
            writeRead({ verdict: verdict, tries: readTries + 1 });
            patch(function(current) { var counts = Object.assign({}, plainMap(current.mistakeCounts)); counts[verdict] = (Number(counts[verdict]) || 0) + 1; return { mistakeCounts: counts }; });
          }
        }
        function revealReading() {
          if (!revealsAllowed || readTries < 2 || readValue != null) return;
          var shown = snapReading(ruler, ruler.c);
          writeRead({ verdict: 'revealed', value: shown, revealed: true });
          speak(fill(t('stem.areaperimeter.read_revealed', 'The track ends at about {c} cm, the nearest small mark. This reading is used for C ÷ d.'), { c: numText(shown) }));
        }
        function checkRatioNow(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (!rolled || records[obj.id] || reading == null) return;
          var verdict = checkRatio(obj.d, ratioTyped, reading);
          if (!verdict) return;
          patch(function(current) {
            var changes = { circleRatioFeedback: { id: obj.id, verdict: verdict } };
            if (verdict === 'correct') { changes.circleRecords = Object.assign({}, plainMap(current.circleRecords)); changes.circleRecords[obj.id] = true; }
            else {
              changes.circleRatioTries = Object.assign({}, plainMap(current.circleRatioTries)); changes.circleRatioTries[obj.id] = (Number(changes.circleRatioTries[obj.id]) || 0) + 1;
              if (verdict !== 'ratio_other') { changes.mistakeCounts = Object.assign({}, plainMap(current.mistakeCounts)); changes.mistakeCounts[verdict] = (Number(changes.mistakeCounts[verdict]) || 0) + 1; }
            }
            return changes;
          });
        }
        function revealRatio() {
          if (!revealsAllowed || ratioTries < 2 || records[obj.id] || reading == null) return;
          patch(function(current) {
            var rec = Object.assign({}, plainMap(current.circleRecords)); rec[obj.id] = true;
            var rev = Object.assign({}, plainMap(current.circleRatioRevealed)); rev[obj.id] = true;
            return { circleRecords: rec, circleRatioRevealed: rev, circleRatioFeedback: { id: obj.id, verdict: 'revealed' } };
          });
        }
        function checkClaim() {
          if (!claim || recorded.length < 3) return;
          var first = ['same', 'bigger', 'smaller'].indexOf(state.circleFirstClaim) >= 0 ? state.circleFirstClaim : (claimLock || claim);
          var award = first === 'same' && claim === 'same' && !plainMap(state.circleAwarded).claim;
          var changes = { circleFirstClaim: first, circleClaimCheckedFor: claim };
          if (award) changes.circleAwarded = Object.assign({}, plainMap(state.circleAwarded), { claim: true });
          patch(changes);
          if (award) awardXP('areaPerimeter', 5, t('stem.areaperimeter.xp_circle_claim', 'Circle ratio claim'));
        }
        var CLAIMS = [
          { id: 'same', label: t('stem.areaperimeter.circle_claim_same', 'C ÷ d is the same for every circle') },
          { id: 'bigger', label: t('stem.areaperimeter.circle_claim_bigger', 'C ÷ d is bigger for bigger circles') },
          { id: 'smaller', label: t('stem.areaperimeter.circle_claim_smaller', 'C ÷ d is smaller for bigger circles') }
        ];
        var claimFb = null;
        if (checkedNow) {
          claimFb = claim === 'same'
            ? note(t('stem.areaperimeter.circle_claim_ok', 'Your evidence supports your claim. Every circle gave about 3.14, whatever its size. This number is called π (pi), about 3.14159, so C = π × d.'), 'good', 'circle-claim-fb', { 'data-ap-circle-claim': 'supported' })
            : note(t('stem.areaperimeter.circle_claim_no', 'Look at the last column: the ratios are all about 3.14, for small and big circles alike. The ratio does not change with size. It is called π (pi), so C = π × d.'), 'warn', 'circle-claim-fb', { 'data-ap-circle-claim': 'not-supported' });
        }
        function rollerRender(frac, start, busy) {
          var C = Math.PI * obj.d;
          var scale = Math.min(520 / (C + obj.d), 110 / obj.d);
          var R = obj.d * scale / 2;
          var x0 = 40 + R, base = 30 + 2 * R;
          var cx = x0 + frac * C * scale, cy = base - R;
          var ang = frac * 2 * Math.PI;
          var px = cx - R * Math.sin(ang), py = cy + R * Math.cos(ang);
          // A real ruler: numbered marks every `major` cm, small marks every `minor` cm.
          var ticks = [];
          var perMajor = Math.round(ruler.major / ruler.minor);
          var perMid = perMajor % 2 === 0 ? perMajor / 2 : 0;
          for (var k = 0; k <= ruler.steps; k += 1) {
            var tx = x0 + k * ruler.minor * scale;
            var isMajor = k % perMajor === 0;
            var isMid = !isMajor && perMid && k % perMid === 0;
            ticks.push(h('line', { key: 'tk' + k, x1: tx, y1: base + 2, x2: tx, y2: base + (isMajor ? 18 : (isMid ? 12 : 8)), stroke: COLORS.text, strokeWidth: isMajor ? 1.6 : 1 }));
            if (isMajor) ticks.push(h('text', { key: 'tl' + k, x: tx, y: base + 34, textAnchor: 'middle', fill: COLORS.text, fontSize: 13 }, numText(round6(k * ruler.minor))));
          }
          var done = frac >= 1;
          var known = reading != null;
          var measuring = done && !known;
          var markerX = x0 + marker * scale;
          var endX = x0 + C * scale;
          function markerFromPointer(event) {
            var svgEl = event.currentTarget && event.currentTarget.ownerSVGElement;
            var box = svgEl && typeof svgEl.getBoundingClientRect === 'function' ? svgEl.getBoundingClientRect() : null;
            if (!box || !box.width) return;
            // max-height can letterbox the drawing in a wide panel: undo the
            // centred "meet" scaling, not just the width.
            var vbH = Math.ceil(base + 70);
            var k = box.height > 0 ? Math.min(box.width / 640, box.height / vbH) : box.width / 640;
            var sx = (Number(event.clientX) - box.left - (box.width - 640 * k) / 2) / k;
            moveMarker((sx - x0) / scale);
            var handle = svgEl.querySelector('[data-ap-marker]');
            if (handle && typeof handle.focus === 'function' && global.document && global.document.activeElement !== handle) handle.focus();
          }
          var markerEls = measuring ? [
            h('rect', { key: 'hit', x: x0 - 10, y: base - 30, width: Math.max(10, ruler.max * scale + 20), height: 72, fill: 'transparent', 'data-ap-ruler-hit': true, style: { cursor: 'ew-resize', touchAction: 'none' },
              onPointerDown: function(event) { if (event.currentTarget.setPointerCapture && event.pointerId != null) { try { event.currentTarget.setPointerCapture(event.pointerId); } catch (e) {} } markerFromPointer(event); },
              onPointerMove: function(event) { if (event.buttons) markerFromPointer(event); },
              onClick: markerFromPointer }),
            h('g', { key: 'marker', role: 'slider', tabIndex: 0, focusable: 'true', 'data-ap-marker': numText(marker),
              'aria-label': t('stem.areaperimeter.marker_label', 'Ruler marker'),
              'aria-valuemin': 0, 'aria-valuemax': ruler.max, 'aria-valuenow': marker, 'aria-valuetext': markerText(marker),
              onKeyDown: function(event) {
                var next = marker;
                if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = marker + ruler.minor;
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = marker - ruler.minor;
                else if (event.key === 'PageUp') next = marker + ruler.major;
                else if (event.key === 'PageDown') next = marker - ruler.major;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = ruler.max;
                else return;
                event.preventDefault();
                moveMarker(next);
              } }, [
              // An invisible pad keeps the focus target at least 24 px wide on a phone.
              h('rect', { key: 'pad', x: round1(markerX - 34), y: base - 46, width: 68, height: 70, fill: 'transparent', pointerEvents: 'none' }),
              h('line', { key: 'l', x1: markerX, y1: base - 26, x2: markerX, y2: base + 20, stroke: COLORS.ghost, strokeWidth: 2.5, pointerEvents: 'none' }),
              h('path', { key: 'p', d: 'M ' + round1(markerX - 9) + ' ' + (base - 40) + ' L ' + round1(markerX + 9) + ' ' + (base - 40) + ' L ' + round1(markerX) + ' ' + (base - 26) + ' Z', fill: COLORS.ghost, stroke: COLORS.text, strokeWidth: 1, pointerEvents: 'none' })
            ])
          ] : [];
          var svg = h('svg', { key: 'roll-svg', viewBox: '0 0 640 ' + Math.ceil(base + 70), role: measuring ? 'group' : 'img', 'aria-labelledby': 'ap-roll-title ap-roll-desc', 'data-ap-roll': done ? 'done' : (frac > 0 ? 'rolling' : 'ready'), style: { display: 'block', width: '100%', maxHeight: '300px', overflow: 'visible' } }, [
            h('title', { key: 'title', id: 'ap-roll-title' }, fill(t('stem.areaperimeter.roll_title', '{name} rolling along a ruler'), { name: objectName(obj.id) })),
            h('desc', { key: 'desc', id: 'ap-roll-desc' }, done
              ? (known
                ? fill(t('stem.areaperimeter.d_roll_done_read', 'A circle {d} cm across has rolled one full turn along a ruler. The marked point is back at the bottom. You read the track it left as {c} cm.'), { d: obj.d, c: numText(reading) })
                : fill(t('stem.areaperimeter.d_roll_done_measure', 'A circle {d} cm across has rolled one full turn along a ruler. The marked point is back at the bottom, and a red mark shows where the track ends. Numbered marks are every {major} cm and small marks every {minor} cm. Move the ruler marker with the arrow keys to find the end.'), { d: obj.d, major: numText(ruler.major), minor: numText(ruler.minor) }))
              : fill(t('stem.areaperimeter.d_roll_ready', 'A circle {d} cm across sits at the start of a ruler with a marked point at the bottom. Roll it one full turn to measure the distance around.'), { d: obj.d })),
            h('line', { key: 'ground', x1: 20, y1: base, x2: 620, y2: base, stroke: GRID_STROKE, strokeWidth: 2 }),
            h('line', { key: 'track', x1: x0, y1: base, x2: x0 + frac * C * scale, y2: base, stroke: COLORS.blue, strokeWidth: 6, strokeLinecap: 'round' }),
            h('circle', { key: 'wheel', cx: cx, cy: cy, r: R, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 3 }),
            h('line', { key: 'spoke', x1: cx, y1: cy, x2: px, y2: py, stroke: COLORS.teal, strokeWidth: 2 }),
            h('circle', { key: 'dot', cx: px, cy: py, r: Math.max(4, R * 0.12), fill: COLORS.red })
          ].concat(ticks).concat(done ? [
            h('line', { key: 'end', x1: endX, y1: base - 6, x2: endX, y2: base + 18, stroke: COLORS.red, strokeWidth: 3, 'data-ap-track-end': true }),
            known ? h('text', { key: 'end-l', x: Math.min(600, endX), y: base + 54, textAnchor: 'middle', fill: COLORS.red, fontSize: 15, fontWeight: 800 }, fill(t('stem.areaperimeter.track_label', 'track: {c} cm'), { c: numText(reading) })) : null
          ] : []).concat(markerEls));
          return h('div', { key: 'roller' }, [
            svg,
            actionButton(rolled ? t('stem.areaperimeter.roll_again', 'Roll it again') : t('stem.areaperimeter.roll_one_turn', 'Roll it one full turn'), start, { key: 'roll', primary: !rolled, compact: true, disabled: busy || !claim, data: 'roll' }),
            !claim ? h('span', { key: 'need-claim', style: { marginLeft: '10px', color: COLORS.muted } }, t('stem.areaperimeter.claim_first', 'Make a claim first')) : null
          ]);
        }
        // Read the track length off the ruler: typed, with a marker to help,
        // a hint ladder, a second try and a reveal after two tries.
        var readingStep = null;
        if (rolled && reading == null) {
          var rv = { major: numText(ruler.major), minor: numText(ruler.minor), d: obj.d, c: numText(snapReading(ruler, ruler.c)) };
          var readHints = [
            t('stem.areaperimeter.h_read_1', 'Find the red mark where the blue track ends.'),
            fill(t('stem.areaperimeter.h_read_2', 'Numbered marks are every {major} cm. Find the last numbered mark before the red mark.'), rv),
            fill(t('stem.areaperimeter.h_read_3', 'Small marks are every {minor} cm. Count the small marks from that number to the red mark, and add {minor} cm for each one.'), rv)
          ];
          var readText = '';
          if (readVerdict === 'empty') readText = t('stem.areaperimeter.enter_a_number_before_checking', "Enter a number before checking.");
          else if (readVerdict === 'revealed') readText = fill(t('stem.areaperimeter.read_revealed', 'The track ends at about {c} cm, the nearest small mark. This reading is used for C ÷ d.'), rv);
          else if (readVerdict) {
            var why;
            switch (readVerdict) {
              case 'read_diameter': why = t('stem.areaperimeter.m_read_diameter', 'That is the diameter, the distance across the circle. The track is the distance around: read where the red mark is.'); break;
              case 'read_major_slip': why = fill(t('stem.areaperimeter.m_read_major_slip', 'Check which numbered mark you read. Your reading is a whole {major} cm away from the end of the track.'), rv); break;
              case 'read_close_short': why = fill(t('stem.areaperimeter.m_read_close_short', 'Close, but a little short of the red mark. Count the small marks again: each one is {minor} cm.'), rv); break;
              case 'read_close_long': why = fill(t('stem.areaperimeter.m_read_close_long', 'Close, but a little past the red mark. Count the small marks again: each one is {minor} cm.'), rv); break;
              case 'read_short': why = t('stem.areaperimeter.m_read_short', 'That is well short of the red mark. Read the last numbered mark before it, then count the small marks.'); break;
              default: why = t('stem.areaperimeter.m_read_long', 'That is past the red mark. Read the last numbered mark before it, then count the small marks.');
            }
            readText = why + ' ' + (readTries >= 2
              ? (revealsAllowed ? t('stem.areaperimeter.fb_try_or_reveal_reading', 'Try again, use a hint, or show the reading.') : t('stem.areaperimeter.fb_try_or_hint', 'Try again or use a hint.'))
              : t('stem.areaperimeter.fb_second_try', 'Have another go: you have a second try.'));
          }
          readingStep = h('div', { key: 'reading', 'data-ap-reading': obj.id, style: { marginTop: '10px' } }, [
            h('p', { key: 'how', id: 'ap-reading-how', style: { color: COLORS.text, margin: '0 0 8px', lineHeight: 1.5 } }, fill(t('stem.areaperimeter.reading_how', 'Read the ruler. Numbered marks are every {major} cm and small marks are every {minor} cm. Where does the track end? You can slide the ruler marker to the red mark with a pointer or the arrow keys.'), rv)),
            h('form', { key: 'form', onSubmit: checkReadingNow, style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } }, [
              textField('ap-circle-reading', t('stem.areaperimeter.reading_label', 'Track length you read (cm)'), textOf(read.typed), function(value) { writeRead({ typed: value }); },
                { describedBy: 'ap-reading-how' + (readText ? ' ap-reading-fb' : ''), invalid: !!readVerdict && readVerdict !== 'revealed' && readVerdict !== 'empty', flex: '1 1 200px' }),
              actionButton(t('stem.areaperimeter.check_reading', 'Check my reading'), null, { key: 'check', type: 'submit', primary: true }),
              hintButton(readHints, readHint, 'ap-reading-hint', function(next) { writeRead({ hint: next }); }),
              revealsAllowed && readTries >= 2 ? actionButton(t('stem.areaperimeter.show_reading', 'Show the reading'), revealReading, { key: 'reveal-reading', compact: true, data: 'reveal-reading' }) : null
            ]),
            hintLadder(readHints, readHint, 'ap-reading-hint'),
            h('div', { key: 'fb', role: 'status' }, readText ? note(readText, readVerdict === 'revealed' ? 'info' : 'warn', 'read-note', { id: 'ap-reading-fb', 'data-ap-read': readVerdict }) : null)
          ]);
        } else if (rolled && readVerdict === 'correct' && !records[obj.id]) {
          readingStep = h('div', { key: 'reading-done' }, note(fill(t('stem.areaperimeter.read_ok', 'Good reading: {c} cm. Now divide it by the diameter.'), { c: numText(reading) }), 'good', 'read-note', { 'data-ap-read': 'correct' }));
        } else if (rolled && readVerdict === 'revealed' && !records[obj.id]) {
          readingStep = h('div', { key: 'reading-done' }, note(fill(t('stem.areaperimeter.read_revealed', 'The track ends at about {c} cm, the nearest small mark. This reading is used for C ÷ d.'), { c: numText(reading) }), 'info', 'read-note', { 'data-ap-read': 'revealed' }));
        }

        var n = SECTOR_COUNTS.indexOf(Number(state.sectorCount)) >= 0 ? Number(state.sectorCount) : 8;
        var sm = sectorModel(n, 3);
        var sectorPredict = ['rectangle', 'triangle', 'circle'].indexOf(state.sectorPredict) >= 0 ? state.sectorPredict : '';
        var rows = SECTOR_COUNTS.map(function(count) {
          var model = sectorModel(count, 3);
          return [fill(t('stem.areaperimeter.n_sectors', '{n} sectors'), { n: count }), model.bump.toFixed(2), model.height.toFixed(2)];
        });
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.circles_heading', 'Circles: the distance around')),
            lead(t('stem.areaperimeter.circles_intro', 'Roll real circles one full turn and measure the track each one leaves. Compare the circumference (C) with the diameter (d).')),
            subHeading(t('stem.areaperimeter.step_claim', 'Step 1. Claim'), 'claim-h'),
            h('p', { key: 'q', style: { color: COLORS.text, margin: '0 0 8px' } }, t('stem.areaperimeter.circle_claim_question', 'Before you measure: how does C ÷ d change as circles get bigger?')),
            chipGroup(t('stem.areaperimeter.circle_claim_question', 'Before you measure: how does C ÷ d change as circles get bigger?'), CLAIMS, claim, pickClaim, 'circle-claims'),
            subHeading(t('stem.areaperimeter.step_evidence', 'Step 2. Evidence'), 'ev-h'),
            chipGroup(t('stem.areaperimeter.circle_object_group', 'Circle to roll'), CIRCLE_OBJECTS.map(function(o) {
              return { id: o.id, label: fill(t('stem.areaperimeter.obj_label', '{name} ({d} cm across)'), { name: objectName(o.id), d: o.d }) };
            }), obj.id, function(id) { patch({ circleObject: id }); }, 'circle-objects'),
            h(ApRoller, { key: 'roller-' + obj.id, React: React, rolled: rolled, duration: 2200, onDone: onRolled, render: rollerRender }),
            readingStep,
            rolled && reading != null ? h('p', { key: 'track', style: { color: COLORS.text, fontWeight: 700 } }, fill(t('stem.areaperimeter.track_sentence_read', 'You read the track as {c} cm. That is the circumference. The diameter is {d} cm.'), { c: numText(reading), d: obj.d })) : null,
            rolled && reading != null && !records[obj.id] ? h('form', { key: 'ratio', onSubmit: checkRatioNow, style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } }, [
              textField('ap-circle-ratio', t('stem.areaperimeter.ratio_label', 'C ÷ d, rounded to 2 decimal places'), ratioTyped, function(value) {
                var next = Object.assign({}, ratioInputs); next[obj.id] = value; patch({ circleRatioInputs: next, circleRatioFeedback: null });
              }),
              actionButton(t('stem.areaperimeter.check_and_record', 'Check and record'), null, { key: 'check', type: 'submit', primary: true, disabled: !isFinite(parseAnswer(ratioTyped)) }),
              revealsAllowed && ratioTries >= 2 ? actionButton(t('stem.areaperimeter.show_division', 'Show the division'), revealRatio, { key: 'reveal-ratio', compact: true, data: 'reveal-ratio' }) : null
            ]) : null,
            h('div', { key: 'ratio-fb', role: 'status' }, ratioFb && reading != null ? note(ratioFb === 'revealed'
              ? fill(t('stem.areaperimeter.ratio_revealed', 'C ÷ d = {c} ÷ {d} = {ratio}. It is now in the table, without points.'), { c: numText(reading), d: obj.d, ratio: (reading / obj.d).toFixed(2) })
              : ratioMessage(ratioFb, obj, { c: reading, ratio: reading / obj.d }) + (ratioFb === 'correct' ? '' : ' ' + (ratioTries >= 2 ? (revealsAllowed ? t('stem.areaperimeter.fb_try_or_reveal_division', 'Try again, or show the division.') : t('stem.areaperimeter.fb_try_again', 'Try again.')) : t('stem.areaperimeter.fb_second_try', 'Have another go: you have a second try.'))),
              ratioFb === 'correct' ? 'good' : (ratioFb === 'revealed' ? 'info' : 'warn'), 'ratio-note', { 'data-ap-ratio': ratioFb }) : null),
            recorded.length ? formulaTable(recorded.map(function(o) {
              var oRead = plainMap(readAll[o.id]);
              var c = isFinite(Number(oRead.value)) && Number(oRead.value) > 0 && oRead.value !== null && oRead.value !== '' ? Number(oRead.value) : circleMeasurement(o.d).c;
              return [objectName(o.id), fill(t('stem.areaperimeter.n_cm', '{n} cm'), { n: o.d }), fill(t('stem.areaperimeter.n_cm', '{n} cm'), { n: numText(c) }), (c / o.d).toFixed(2)];
            }), t('stem.areaperimeter.circle_table_caption', 'Circles you measured'), [t('stem.areaperimeter.circle_col_object', 'Circle'), t('stem.areaperimeter.circle_col_d', 'Diameter (d)'), t('stem.areaperimeter.circle_col_c', 'Circumference (C)'), t('stem.areaperimeter.circle_col_ratio', 'C ÷ d')]) : null,
            subHeading(t('stem.areaperimeter.step_reasoning', 'Step 3. Check your claim and reason'), 'reason-h'),
            h('p', { key: 'need', style: { color: COLORS.muted, margin: '0 0 8px' } }, recorded.length >= 3 ? t('stem.areaperimeter.ready_to_check', 'You have enough evidence. Check your claim against it.') : fill(t('stem.areaperimeter.need_circles', 'Measure at least 3 different circles. You have {n}.'), { n: recorded.length })),
            actionButton(t('stem.areaperimeter.check_claim', 'Check my claim'), checkClaim, { key: 'check-claim', compact: true, primary: recorded.length >= 3, disabled: !claim || recorded.length < 3 }),
            h('div', { key: 'claim-out', role: 'status' }, claimFb)
          ], { key: 'circles-roll' }),
          panel([
            heading(t('stem.areaperimeter.sectors_heading', 'Circles: the space inside'), 'sec-h'),
            lead(t('stem.areaperimeter.sectors_intro', 'Cut a circle into equal sectors, like pizza slices, and lay them in a row, alternately pointing up and down.'), 'sec-p'),
            chipGroup(t('stem.areaperimeter.sector_count_group', 'Number of sectors'), SECTOR_COUNTS.map(function(count) { return { id: count, label: fill(t('stem.areaperimeter.n_sectors', '{n} sectors'), { n: count }) }; }), n, function(id) {
              patch({ sectorCount: id });
              speak(fill(t('stem.areaperimeter.sr_sectors', '{n} sectors. The bumps are {b} units high.'), { n: id, b: sectorModel(id, 3).bump.toFixed(2) }));
            }, 'sector-counts'),
            sectorsSvg(sm),
            !sectorPredict ? h('div', { key: 'predict', style: { marginTop: '12px' } }, [
              h('p', { key: 'q', style: { color: COLORS.text, fontWeight: 800, margin: '0 0 8px' } }, t('stem.areaperimeter.sector_predict_q', 'Predict: as the sectors get thinner, the row looks more and more like which shape?')),
              chipGroup(t('stem.areaperimeter.sector_predict_q', 'Predict: as the sectors get thinner, the row looks more and more like which shape?'), [
                { id: 'rectangle', label: t('stem.areaperimeter.shape_rectangle', 'A rectangle') },
                { id: 'triangle', label: t('stem.areaperimeter.shape_triangle', 'A triangle') },
                { id: 'circle', label: t('stem.areaperimeter.shape_circle', 'A circle') }
              ], '', function(id) { patch({ sectorPredict: id }); }, 'sector-predict')
            ]) : h('div', { key: 'sector-result', 'data-ap-sector-result': sectorPredict }, [
              note((sectorPredict === 'rectangle' ? t('stem.areaperimeter.sector_predict_right', 'Yes: the bumps flatten out and the slant disappears, so the row becomes a rectangle.') : t('stem.areaperimeter.sector_predict_wrong', 'Look at the bump heights in the table: they shrink toward 0, and the seams stand straighter. The row becomes a rectangle.'))
                + ' ' + t('stem.areaperimeter.sector_reasoning', 'Its long side is half the circumference, π × r, and its short side is the radius, r. So the circle’s area is π × r × r = πr².'), sectorPredict === 'rectangle' ? 'good' : 'warn', 'sector-note'),
              formulaTable(rows, t('stem.areaperimeter.sector_table_caption', 'How close the row is to a rectangle, for a radius of 3 units'), [t('stem.areaperimeter.sector_col_n', 'Sectors'), t('stem.areaperimeter.sector_col_bump', 'Bump height (units)'), t('stem.areaperimeter.sector_col_height', 'Seam height (units)')]),
              actionButton(t('stem.areaperimeter.predict_again', 'Predict again'), function() { patch({ sectorPredict: '' }); }, { key: 'again', compact: true, style: { marginTop: '10px' } })
            ])
          ], { key: 'circles-sectors' }),
          drillPanel('circles')
        ]);
      }

      // ── Irregular Shapes mode ──
      function coverWords(cover) {
        if (cover >= BLOB_FULL) return t('stem.areaperimeter.cover_all', 'all inside the shape');
        if (cover >= 0.6) return t('stem.areaperimeter.cover_most', 'mostly inside the shape');
        if (cover >= 0.4) return t('stem.areaperimeter.cover_half', 'about half inside the shape');
        if (cover >= BLOB_TOUCH) return t('stem.areaperimeter.cover_little', 'a little inside the shape');
        return t('stem.areaperimeter.cover_none', 'outside the shape');
      }
      function blobNoteText(id) {
        switch (id) {
          case 'partial_as_full': return t('stem.areaperimeter.m_partial_as_full', 'You counted some squares that are only partly covered as whole squares. That pushes the estimate up.');
          case 'counted_outside': return t('stem.areaperimeter.m_counted_outside', 'You marked a square that the shape does not touch.');
          case 'missed_full': return t('stem.areaperimeter.m_missed_full', 'Some squares that are completely inside were not counted as whole squares.');
          case 'skipped_partials': return t('stem.areaperimeter.m_skipped_partials', 'You skipped many part squares. Count each one as a half, or the estimate comes out too small.');
          case 'halves_not_halved': return t('stem.areaperimeter.m_halves_not_halved', 'Each part square counts as only half. You added them as whole squares: divide the number of part squares by 2 first.');
          case 'full_only': return t('stem.areaperimeter.m_full_only', 'You left out the part squares. Add half of them to the whole squares.');
          default: return t('stem.areaperimeter.m_blob_arith', 'Check your adding: whole squares + part squares ÷ 2, using your own marks.');
        }
      }
      function irregularView() {
        var blob = generateBlob(blobLevel, Number(state.blobSeed) > 0 ? Number(state.blobSeed) : 31);
        var marksState = plainMap(state.blobMarks);
        var marks = marksState.sig === blob.sig ? plainMap(marksState.marks) : {};
        var estState = plainMap(state.blobEstimate);
        var typed = estState.sig === blob.sig ? textOf(estState.text) : '';
        var check = state.blobCheck && state.blobCheck.sig === blob.sig ? state.blobCheck : null;
        var done = !!(check && check.done);
        var result = check ? assessBlob(blob, marks, Number(check.value)) : null;
        var own = blobMarkCounts(blob, marks);
        var focus = typeof state.blobFocus === 'string' && blob.cells.some(function(cell) { return cell.key === state.blobFocus; }) ? state.blobFocus : '0-0';
        function markLabel(m) {
          return m === 'full' ? t('stem.areaperimeter.mark_full', 'Marked as a whole square.') : m === 'half' ? t('stem.areaperimeter.mark_half', 'Marked as a part square.') : t('stem.areaperimeter.mark_none', 'Not marked.');
        }
        function cycle(cell) {
          if (done) return;
          var current = marks[cell.key];
          var nextMark = !current ? 'full' : current === 'full' ? 'half' : '';
          var nextMarks = Object.assign({}, marks);
          if (nextMark) nextMarks[cell.key] = nextMark; else delete nextMarks[cell.key];
          var counts = blobMarkCounts(blob, nextMarks);
          patch({ blobMarks: { sig: blob.sig, marks: nextMarks }, blobCheck: check && !check.done ? null : check });
          speak(fill(t('stem.areaperimeter.sr_blob_mark', 'Row {r}, column {c}: {mark} {f} whole and {p} part squares marked.'), { r: cell.r + 1, c: cell.c + 1, mark: markLabel(nextMark), f: counts.full, p: counts.half }));
        }
        var blobSubmitLocked = false;
        var attemptState = plainMap(state.blobAttempt);
        var attempt = attemptState.sig === blob.sig ? attemptState : {};
        var blobTries = Math.max(0, Number(attempt.tries) || 0);
        var blobHint = clamp(attempt.hint || 0, 0, 3);
        var blobRevealedNow = !!(check && check.revealed);
        var blobCreditBlocked = !!plainMap(state.blobRevealed)[blob.sig];
        var blobHints = [
          t('stem.areaperimeter.h_blob_1', 'Mark a square whole (1) only when the shape covers all of it.'),
          t('stem.areaperimeter.h_blob_2', 'Mark every square the shape covers only partly as a part square (½), even thin slivers.'),
          t('stem.areaperimeter.h_blob_3', 'Add: whole squares + part squares ÷ 2. For example, 10 whole squares and 6 part squares make 10 + 3 = 13.')
        ];
        function writeAttempt(changes) {
          patch(function(current) {
            var prev = plainMap(current.blobAttempt);
            return { blobAttempt: Object.assign({}, prev.sig === blob.sig ? prev : {}, { sig: blob.sig }, changes) };
          });
        }
        // After two adding slips: show the adding for the learner's own marks.
        // It finishes the shape without points.
        function revealAdding() {
          if (!revealsAllowed || blobTries < 2 || done) return;
          patch(function(current) {
            var rev = Object.assign({}, plainMap(current.blobRevealed)); rev[blob.sig] = true;
            return { blobCheck: { sig: blob.sig, value: own.estimate, done: true, revealed: true }, blobEstimate: { sig: blob.sig, text: numText(own.estimate) }, blobRevealed: rev };
          });
        }
        function submit(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (done || blobSubmitLocked) return;
          var value = parseAnswer(typed);
          if (!isFinite(value)) { patch({ blobCheck: { sig: blob.sig, value: NaN, done: false, empty: true } }); return; }
          var res = assessBlob(blob, marks, value);
          if (res.arithmetic === 'ok') blobSubmitLocked = true;
          var finished = res.arithmetic === 'ok';
          if (!finished) writeAttempt({ tries: blobTries + 1 });
          patch(function(current) {
            var changes = { blobCheck: { sig: blob.sig, value: value, done: finished } };
            var counts = Object.assign({}, plainMap(current.mistakeCounts));
            var ids = finished ? res.notes : [res.arithmetic];
            ids.forEach(function(id) { counts[id] = (Number(counts[id]) || 0) + 1; });
            if (ids.length) changes.mistakeCounts = counts;
            if (finished && res.close && !plainMap(current.blobSolved)[blob.sig] && !plainMap(current.blobRevealed)[blob.sig]) { changes.blobSolved = Object.assign({}, plainMap(current.blobSolved)); changes.blobSolved[blob.sig] = true; }
            if (finished && !res.close) {
              changes.missedByType = Object.assign({}, plainMap(current.missedByType)); changes.missedByType.irregular = (Number(changes.missedByType.irregular) || 0) + 1;
              // The exact area is now on screen: this shape can be practised again, without points.
              changes.blobRevealed = Object.assign({}, plainMap(current.blobRevealed)); changes.blobRevealed[blob.sig] = true;
            }
            return changes;
          });
          if (finished && res.close && !plainMap(state.blobSolved)[blob.sig] && !blobCreditBlocked) awardXP('areaPerimeter', 5, t('stem.areaperimeter.xp_irregular', 'Irregular area estimate'));
        }
        function newShape() {
          var seed = randomSeed();
          patch({ blobSeed: seed, blobMarks: {}, blobEstimate: {}, blobCheck: null, blobFocus: '0-0' });
          speak(t('stem.areaperimeter.sr_new_shape', 'New shape. Mark the whole squares and the part squares.'));
        }
        var cs = Math.min(520 / blob.cols, 300 / blob.rows, 48);
        var gx = (640 - cs * blob.cols) / 2, gy = 20;
        var shapePts = blob.outline.map(function(pt) { return round1(gx + pt[0] * cs) + ',' + round1(gy + pt[1] * cs); }).join(' ');
        apGridHandlers.blob = cycle;
        apGridHandlers.blobFocus = function(key) { if (focus !== key) patch({ blobFocus: key }); };
        function buildBlobCells() { return blob.cells.map(function(cell) {
          var m = marks[cell.key];
          var label = fill(t('stem.areaperimeter.blob_cell_label', 'Row {r}, column {c}: {cover}.'), { r: cell.r + 1, c: cell.c + 1, cover: coverWords(cell.cover) }) + ' ' + markLabel(m);
          return h('g', { key: cell.key }, [
            h('rect', {
              key: 'cell', x: gx + cell.c * cs, y: gy + cell.r * cs, width: cs, height: cs,
              fill: m === 'full' ? COLORS.green : (m === 'half' ? COLORS.amber : 'transparent'), fillOpacity: m ? 0.3 : 0,
              stroke: GRID_STROKE, strokeWidth: 1,
              role: 'button', tabIndex: focus === cell.key ? 0 : -1, focusable: 'true', 'aria-label': label, 'aria-disabled': done ? true : undefined,
              'data-ap-blob-cell': cell.key,
              onFocus: function() { apGridHandlers.blobFocus(cell.key); },
              onClick: function() { apGridHandlers.blob(cell); },
              onKeyDown: function(event) {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); apGridHandlers.blob(cell); return; }
                var c = cell.c, r = cell.r;
                if (event.key === 'ArrowRight') c = Math.min(blob.cols - 1, c + 1);
                else if (event.key === 'ArrowLeft') c = Math.max(0, c - 1);
                else if (event.key === 'ArrowDown') r = Math.min(blob.rows - 1, r + 1);
                else if (event.key === 'ArrowUp') r = Math.max(0, r - 1);
                else if (event.key === 'Home') { c = 0; r = 0; }
                else if (event.key === 'End') { c = blob.cols - 1; r = blob.rows - 1; }
                else return;
                event.preventDefault();
                var svg = event.currentTarget.ownerSVGElement;
                var target = svg && svg.querySelector('[data-ap-blob-cell="' + c + '-' + r + '"]');
                if (target && typeof target.focus === 'function') target.focus();
              },
              style: { cursor: done ? 'default' : 'pointer' }
            }),
            m ? h('text', { key: 'glyph', x: gx + (cell.c + 0.5) * cs, y: gy + (cell.r + 0.5) * cs + 6, textAnchor: 'middle', fill: COLORS.text, fontSize: Math.min(18, cs * 0.5), fontWeight: 900, pointerEvents: 'none', 'aria-hidden': true }, m === 'full' ? '1' : '½') : null
          ]);
        }); }
        var BlobGrid = memoGrid(React);
        var blobSig = [blob.sig, focus, done ? 'done' : '', isDark ? 'd' : '', isContrast ? 'c' : '', Object.keys(marks).sort().map(function(k) { return k + marks[k]; }).join(','),
          t('stem.areaperimeter.blob_cell_label', 'Row {r}, column {c}: {cover}.'), markLabel('full'), markLabel('half'), markLabel(''), coverWords(1), coverWords(0.5), coverWords(0)].join('|');
        var cellEls = BlobGrid ? [h(BlobGrid, { key: 'cells', sig: blobSig, build: function() { return h('g', { 'data-ap-blob-grid': true }, buildBlobCells()); } })] : buildBlobCells();
        var svgH = gy + blob.rows * cs + 20;
        var gridSvg = h('svg', { key: 'blob-svg', viewBox: '0 0 640 ' + Math.ceil(svgH), role: 'group', 'aria-labelledby': 'ap-blob-title ap-blob-desc', 'data-ap-blob': blob.sig,
          style: { display: 'block', width: '100%', minWidth: Math.ceil(24 * 640 / cs) + 'px', maxWidth: 'none', maxHeight: '440px' } }, [
          h('title', { key: 'title', id: 'ap-blob-title' }, t('stem.areaperimeter.blob_title', 'Curved shape on a grid of unit squares')),
          h('desc', { key: 'desc', id: 'ap-blob-desc' }, fill(t('stem.areaperimeter.blob_desc', 'A curved shape drawn over a grid of {cols} by {rows} unit squares. Each square says how much of it is inside the shape.'), { cols: blob.cols, rows: blob.rows })),
          h('polygon', { key: 'shape', points: shapePts, fill: COLORS.teal, fillOpacity: 0.28, stroke: COLORS.teal, strokeWidth: 3, pointerEvents: 'none' })
        ].concat(cellEls));
        var feedbackNode = null;
        if (check && check.empty) feedbackNode = note(t('stem.areaperimeter.blob_enter', 'Enter your estimate before checking.'), 'warn', 'blob-fb', { 'data-ap-blob-feedback': 'empty' });
        else if (result && result.arithmetic !== 'ok') feedbackNode = note(blobNoteText(result.arithmetic) + ' ' + (blobTries >= 2
          ? (revealsAllowed ? t('stem.areaperimeter.fb_try_or_reveal_adding', 'Try again, use a hint, or show the adding.') : t('stem.areaperimeter.fb_try_or_hint', 'Try again or use a hint.'))
          : t('stem.areaperimeter.fb_second_try', 'Have another go: you have a second try.')), 'warn', 'blob-fb', { 'data-ap-blob-feedback': result.arithmetic });
        else if (result) {
          var dv = { d: numText(round1(Math.abs(result.diff))), pct: numText(Math.round(Math.abs(result.pct))), e: numText(own.estimate), x: blob.exactText };
          var compare = Math.abs(result.diff) < 0.05 ? t('stem.areaperimeter.blob_equal', 'Your estimate matches the exact area to the nearest tenth.')
            : result.diff > 0 ? fill(t('stem.areaperimeter.blob_over', 'Your estimate of {e} is {d} square units more than the exact area of {x} ({pct}% too high).'), dv)
            : fill(t('stem.areaperimeter.blob_under', 'Your estimate of {e} is {d} square units less than the exact area of {x} ({pct}% too low).'), dv);
          var verdictLine = result.byMethod
            ? fill(t('stem.areaperimeter.blob_close_method', 'That is as close as whole and half squares allow on this grid: a careful count gives {m}. Smaller squares would get closer.'), { m: numText(blob.modelEstimate) })
            : result.close ? t('stem.areaperimeter.blob_close', 'That is a close estimate: within 10%.') : t('stem.areaperimeter.blob_far', 'That is more than 10% off. Read the notes, then try a new shape.');
          feedbackNode = h('div', { key: 'blob-fb', 'data-ap-blob-feedback': result.close ? 'close' : 'far', 'data-ap-blob-revealed': blobRevealedNow ? 'yes' : undefined }, [
            blobRevealedNow ? note(fill(t('stem.areaperimeter.blob_revealed', 'Here is the adding for your marks: {f} + {p} ÷ 2 = {e}. This shape earns no points.'), { f: own.full, p: own.half, e: numText(own.estimate) }), 'info', 'blob-revealed') : null,
            note(compare + ' ' + verdictLine, result.close && !blobRevealedNow ? 'good' : 'warn', 'blob-verdict'),
            result.notes.length ? h('ul', { key: 'notes', 'data-ap-blob-notes': result.notes.join(' '), style: { color: COLORS.text, margin: '8px 0 0', paddingLeft: '22px' } }, result.notes.map(function(id) { return h('li', { key: id }, blobNoteText(id)); })) : null
          ]);
        }
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.irregular_heading', 'Estimate the area of a curved shape')),
            lead(t('stem.areaperimeter.irregular_intro', 'No formula fits this shape, so estimate by counting squares. Then compare your estimate with the exact area.')),
            levelChips('blobLevel', blobLevel, 'blob-levels'),
            h('p', { key: 'rule', id: 'ap-blob-rule', style: { color: COLORS.text, margin: '12px 0 6px' } }, t('stem.areaperimeter.blob_rule', 'Rule: a whole square counts 1 and a part square counts ½. Estimate = whole squares + part squares ÷ 2.')),
            h('p', { key: 'how', style: { color: COLORS.muted, margin: '0 0 10px' } }, t('stem.areaperimeter.blob_how', 'Select a square once to mark it whole (1), again to mark it part (½), and a third time to clear it. Use the arrow keys to move between squares.')),
            h('div', { key: 'grid', style: { overflowX: 'auto' } }, gridSvg),
            h('p', { key: 'counts', 'data-ap-blob-counts': own.full + ':' + own.half, style: { color: COLORS.text, fontWeight: 800 } }, fill(t('stem.areaperimeter.blob_counts', 'Whole squares marked: {f}. Part squares marked: {p}.'), { f: own.full, p: own.half })),
            h('form', { key: 'form', onSubmit: submit, style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' } }, [
              textField('ap-blob-estimate', t('stem.areaperimeter.blob_estimate_label', 'My estimate (square units)'), typed, function(value) {
                patch({ blobEstimate: { sig: blob.sig, text: value }, blobCheck: check && !check.done ? null : check });
              }, { disabled: done, describedBy: 'ap-blob-rule' }),
              actionButton(t('stem.areaperimeter.check_estimate', 'Check my estimate'), null, { key: 'check', type: 'submit', primary: true, disabled: done }),
              hintButton(blobHints, blobHint, 'ap-blob-hint', function(next) { writeAttempt({ hint: next }); }, done),
              revealsAllowed && blobTries >= 2 && !done ? actionButton(t('stem.areaperimeter.show_adding', 'Show the adding'), revealAdding, { key: 'reveal', compact: true, data: 'reveal-adding' }) : null
            ]),
            hintLadder(blobHints, blobHint, 'ap-blob-hint'),
            h('div', { key: 'live', role: 'status' }, feedbackNode),
            done ? formulaTable([
              [t('stem.areaperimeter.blob_row_yours', 'Your count'), String(own.full), String(own.half), numText(own.estimate)],
              [t('stem.areaperimeter.blob_row_careful', 'A careful count'), String(blob.modelFull), String(blob.modelPart), numText(blob.modelEstimate)],
              [t('stem.areaperimeter.blob_row_exact', 'Exact area'), '–', '–', blob.exactText]
            ], t('stem.areaperimeter.blob_table_caption', 'Your count compared with a careful count and the exact area'), [t('stem.areaperimeter.blob_col_count', 'Count'), t('stem.areaperimeter.blob_col_whole', 'Whole squares'), t('stem.areaperimeter.blob_col_part', 'Part squares'), t('stem.areaperimeter.blob_col_area', 'Area (square units)')]) : null,
            done ? h('p', { key: 'why', style: { color: COLORS.muted } }, t('stem.areaperimeter.blob_why', 'Counting part squares as halves is still an estimate: some part squares are almost full and some are thin slivers, and they only roughly balance out.')) : null,
            h('div', { key: 'nav', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' } }, [
              actionButton(t('stem.areaperimeter.new_shape', 'New shape'), newShape, { key: 'new', compact: true, primary: done }),
              actionButton(t('stem.areaperimeter.clear_marks', 'Clear my marks'), function() { patch({ blobMarks: {}, blobCheck: null }); speak(t('stem.areaperimeter.sr_marks_cleared', 'All marks cleared.')); }, { key: 'clear', compact: true, disabled: done || (!own.full && !own.half) })
            ])
          ], { key: 'irregular' })
        ]);
      }

      // ── Design Missions mode ──
      function missionMistakeText(id, m, r) {
        var v = { f: money(m.fenceCost || 0), s: money(m.soilCost || 0), F: m.fence, P: r ? r.P : 0, C: money(r ? r.C : 0), B: money(m.budget || 0) };
        switch (id) {
          case 'cost_fence_only': return fill(t('stem.areaperimeter.m_cost_fence_only', 'You costed only the fence. Add the soil too: {s} for every square metre of area.'), v);
          case 'cost_soil_only': return fill(t('stem.areaperimeter.m_cost_soil_only', 'You costed only the soil. Add the fence too: {f} for every metre of perimeter.'), v);
          case 'cost_swapped_rates': return fill(t('stem.areaperimeter.m_cost_swapped_rates', 'You swapped the prices. Fence is priced per metre of perimeter ({f}); soil is priced per square metre of area ({s}).'), v);
          case 'fence_short': return fill(t('stem.areaperimeter.m_fence_short', 'This design uses {P} m of fence, but you must use all {F} m.'), v);
          case 'fence_over': return fill(t('stem.areaperimeter.m_fence_over', 'This design needs {P} m of fence, but you have only {F} m.'), v);
          case 'over_budget': return fill(t('stem.areaperimeter.m_over_budget', 'This design costs {C}, which is more than the {B} budget.'), v);
          case 'not_max_area': return t('stem.areaperimeter.m_not_max_area', 'Another rectangle with the same fence holds more. Try sides that are closer together.');
          case 'not_max_affordable': return t('stem.areaperimeter.m_not_max_affordable', 'You can afford a bit more area. Try sides a little closer together, and check the cost each time.');
          case 'rounded_down': return m.mode === 'yard' ? t('stem.areaperimeter.m_rounded_down_yard', 'You rounded down, so part of the floor would be bare. Buy enough whole square yards to cover all of it.') : t('stem.areaperimeter.m_rounded_down_box', 'You rounded down, so part of the floor would be bare. Buy enough whole boxes to cover all of it.');
          case 'not_whole': return m.mode === 'yard' ? t('stem.areaperimeter.m_not_whole_yard', 'The store sells only whole square yards. Round up to the next whole number.') : t('stem.areaperimeter.m_not_whole_box', 'The store sells only whole boxes. Round up to the next whole number.');
          case 'linear_factor': return t('stem.areaperimeter.m_floor_linear', 'You divided by 3. One yard is 3 feet, but 1 yd² is 3 × 3 = 9 ft².');
          case 'wrong_direction': return t('stem.areaperimeter.m_floor_direction', 'Square yards are bigger than square feet, so you need fewer of them: divide by 9.');
          case 'cost_per_sqft': return m.mode === 'yard' ? t('stem.areaperimeter.m_cost_per_sqft_yard', 'You multiplied the price by every square foot. The price is per square yard: multiply by the square yards you buy.') : t('stem.areaperimeter.m_cost_per_sqft_box', 'You multiplied the price by every square foot. The price is per box: multiply by the number of boxes.');
          case 'arith_slip': return t('stem.areaperimeter.m_arith_slip', 'Check this calculation again.');
          default: return mistakeMessage(id) || t('stem.areaperimeter.m_arith_slip', 'Check this calculation again.');
        }
      }
      function missionItemLabel(id, m) {
        switch (id) {
          case 'perimeter': return t('stem.areaperimeter.mi_perimeter', 'Perimeter');
          case 'area': return t('stem.areaperimeter.mi_area', 'Area');
          case 'cost': return t('stem.areaperimeter.mi_cost', 'Cost');
          case 'fence': return t('stem.areaperimeter.mi_fence', 'Fence rule');
          case 'budget': return t('stem.areaperimeter.mi_budget', 'Budget rule');
          case 'best': return t('stem.areaperimeter.mi_best', 'Most area');
          default: return m.mode === 'yard' ? t('stem.areaperimeter.mi_yards', 'Square yards') : t('stem.areaperimeter.mi_boxes', 'Boxes');
        }
      }
      function missionItemText(item, m, r) {
        if (item.status === 'ok') {
          if (item.id === 'fence') return fill(t('stem.areaperimeter.mi_fence_ok', 'Uses exactly {F} m of fence.'), { F: m.fence });
          if (item.id === 'budget') return fill(t('stem.areaperimeter.mi_budget_ok', 'Costs {C}, within the {B} budget.'), { C: money(r.C), B: money(m.budget) });
          if (item.id === 'best') return t('stem.areaperimeter.mi_best_ok', 'No other design that keeps the rules holds more.');
          return t('stem.areaperimeter.mi_correct', 'Correct.');
        }
        if (item.status === 'empty') return t('stem.areaperimeter.mi_empty', 'Fill this in.');
        if (item.status === 'unreadable') return t('stem.areaperimeter.fb_unreadable', 'I could not read that number. Type a whole number, a decimal, a fraction like 3/4, or a mixed number like 2 1/2.');
        if (item.status === 'pending') return t('stem.areaperimeter.mi_pending', 'Meet the fence and budget rules first.');
        if (item.status === 'follow') return item.id === 'cost'
          ? (m.kind === 'garden' ? t('stem.areaperimeter.mi_follow_cost_garden', 'Your cost follows from your perimeter and area. Fix those first.') : t('stem.areaperimeter.mi_follow_cost_floor', 'Your cost follows from your count. Fix that first.'))
          : t('stem.areaperimeter.mi_follow_count', 'Your count follows from your area. Fix the area first.');
        return missionMistakeText(item.mistake, m, r);
      }

      function missionsView() {
        var kind = state.missionKind === 'floor' ? 'floor' : 'garden';
        var mm = plainMap(plainMap(state.missions)[kind]);
        var seed = Number(mm.seed) > 0 && Number(mm.level) === missionLevel ? Number(mm.seed) : (kind === 'garden' ? 41 : 43) + missionLevel * 11;
        var m = kind === 'garden' ? generateGardenMission(missionLevel, seed) : generateFloorMission(missionLevel, seed);
        var item = mm.sig === m.sig ? mm : {};
        var inputs = plainMap(item.inputs);
        var attempts = Math.max(0, Number(item.attempts) || 0);
        var result = item.result && item.result.sig === m.sig && Array.isArray(item.result.items) ? item.result : null;
        var revealed = !!item.revealed;
        var solvedMap = plainMap(state.missionSolved);
        var solvedBefore = !!solvedMap[m.sig];
        var creditBlocked = !!plainMap(state.missionRevealed)[m.sig];
        var solvedHere = !!(result && result.solved);
        var L = kind === 'garden' ? clamp(item.L == null ? 3 : item.L, 1, m.half) : 0;
        var W = kind === 'garden' ? clamp(item.W == null ? 2 : item.W, 1, m.half) : 0;
        var fieldIds = kind === 'garden' ? ['perimeter', 'area', 'cost'] : ['area', 'count', 'cost'];
        var locked = solvedHere || revealed;
        function writeItem(changes) {
          patch(function(current) {
            var all = Object.assign({}, plainMap(current.missions));
            var mine = plainMap(all[kind]);
            all[kind] = Object.assign({}, mine.sig === m.sig ? mine : {}, { seed: m.seed, level: missionLevel, sig: m.sig }, typeof changes === 'function' ? changes(current) : changes);
            return { missions: all };
          });
        }
        function newMission() {
          var next = null;
          for (var i = 0; i < 12; i += 1) {
            next = kind === 'garden' ? generateGardenMission(missionLevel, randomSeed()) : generateFloorMission(missionLevel, randomSeed());
            if (next.sig !== m.sig && !solvedMap[next.sig]) break;
          }
          patch(function(current) { var all = Object.assign({}, plainMap(current.missions)); all[kind] = { seed: next.seed, level: missionLevel, sig: next.sig }; return { missions: all }; });
          speak(t('stem.areaperimeter.sr_new_mission', 'New mission. Read the brief.'));
        }
        var missionSubmitLocked = false;
        function submit(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (locked || missionSubmitLocked) return;
          missionSubmitLocked = true;
          var nums = {};
          // A cost typed as "$54" is read as 54 (the label says $).
          fieldIds.forEach(function(id) { nums[id] = parseBigAnswer(textOf(inputs[id]).replace(/^\s*[$€£¥]\s*/, '')); });
          var res = kind === 'garden' ? assessGarden(m, L, W, nums) : assessFloor(m, nums);
          // Something typed that is not a number is not "empty": say so.
          res.items = res.items.map(function(it) { return it.status === 'empty' && textOf(inputs[it.id]).trim() ? { id: it.id, status: 'unreadable' } : it; });
          var tries = attempts + 1;
          var firstSolve = res.solved && !solvedBefore && !creditBlocked;
          var stored = { sig: m.sig, solved: res.solved, items: res.items, P: res.P, A: res.A, C: res.C, tries: tries, credited: firstSolve };
          patch(function(current) {
            var all = Object.assign({}, plainMap(current.missions));
            all[kind] = Object.assign({}, plainMap(all[kind]), { seed: m.seed, level: missionLevel, sig: m.sig, attempts: tries, result: stored });
            var changes = { missions: all };
            var counts = Object.assign({}, plainMap(current.mistakeCounts));
            var named = res.items.filter(function(it) { return it.status === 'wrong'; }).map(function(it) { return it.mistake; });
            named.forEach(function(id) { counts[id] = (Number(counts[id]) || 0) + 1; });
            if (named.length) {
              changes.mistakeCounts = counts;
              if (tries === 1) { changes.missedByType = Object.assign({}, plainMap(current.missedByType)); changes.missedByType[kind] = (Number(changes.missedByType[kind]) || 0) + 1; }
            }
            if (firstSolve) { changes.missionSolved = Object.assign({}, plainMap(current.missionSolved)); changes.missionSolved[m.sig] = true; }
            return changes;
          });
          if (firstSolve) awardXP('areaPerimeter', tries === 1 ? 5 : 3, t('stem.areaperimeter.xp_mission', 'Design mission'));
        }
        function reveal() {
          if (!revealsAllowed || attempts < 2 || locked) return;
          patch(function(current) {
            var all = Object.assign({}, plainMap(current.missions));
            all[kind] = Object.assign({}, plainMap(all[kind]), { seed: m.seed, level: missionLevel, sig: m.sig, revealed: true });
            var sigs = Object.assign({}, plainMap(current.missionRevealed)); sigs[m.sig] = true;
            return { missions: all, missionRevealed: sigs };
          });
        }
        var missionHints = kind === 'garden' ? [
          t('stem.areaperimeter.h_garden_1', 'Every design must use all the fence: its perimeter must equal the fence length.'),
          t('stem.areaperimeter.h_garden_2', 'Cost = perimeter × fence price + area × soil price. Work out the cost of each design you try.'),
          t('stem.areaperimeter.h_garden_3', 'With a fixed fence, shapes closer to a square hold more area. Start near a square and try longer, thinner designs until one fits the budget.')
        ] : [
          t('stem.areaperimeter.h_floor_1', 'Find the floor area first. For an L-shape, take the missing corner away from the whole rectangle.'),
          m.mode === 'yard' ? t('stem.areaperimeter.h_floor_2y', 'One square yard is 3 ft × 3 ft = 9 ft². Divide the area by 9, then round up.') : t('stem.areaperimeter.h_floor_2b', 'Divide the area by what one box covers. If anything is left over, you need one more box.'),
          t('stem.areaperimeter.h_floor_3', 'Total cost = how many you buy × the price of one.')
        ];
        var missionHint = clamp(item.hint || 0, 0, missionHints.length);
        var brief, drawing, sliders = null, labels;
        if (kind === 'garden') {
          brief = fill(t('stem.areaperimeter.mission_garden_brief', 'Design a rectangular garden. Use exactly {F} m of fence. Fence costs {fc} per metre and soil costs {sc} per square metre. Your budget is {B}. Make the garden hold as much area as you can.'), { F: m.fence, fc: money(m.fenceCost), sc: money(m.soilCost), B: money(m.budget) });
          var sc = Math.min(420 / L, 190 / W, 40);
          var dx = (640 - L * sc) / 2, dy = 40;
          drawing = h('svg', { key: 'garden-svg', viewBox: '0 0 640 ' + Math.ceil(dy + W * sc + 40), role: 'img', 'aria-labelledby': 'ap-garden-title ap-garden-desc', style: { display: 'block', width: '100%', maxHeight: '300px' } }, [
            h('title', { key: 'title', id: 'ap-garden-title' }, t('stem.areaperimeter.garden_title', 'Your garden design')),
            h('desc', { key: 'desc', id: 'ap-garden-desc' }, fill(t('stem.areaperimeter.garden_desc', 'A rectangular garden {L} m long and {W} m wide.'), { L: L, W: W })),
            h('rect', { key: 'g', x: dx, y: dy, width: L * sc, height: W * sc, fill: COLORS.tileSoft, stroke: COLORS.green, strokeWidth: 4, strokeDasharray: '2 6', strokeLinecap: 'round' }),
            h('text', { key: 'lt', x: 320, y: dy - 12, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.n_m', '{n} m'), { n: L })),
            h('text', { key: 'wt', x: dx - 12, y: dy + W * sc / 2 + 6, textAnchor: 'end', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.n_m', '{n} m'), { n: W }))
          ]);
          function setSide(key, value) {
            var changes = {}; changes[key] = value; changes.result = null;
            writeItem(changes);
          }
          sliders = h('div', { key: 'sliders', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginTop: '12px' } }, [
            rangeControl(t('stem.areaperimeter.garden_length', 'Garden length (m)'), L, 1, m.half, function(value) { setSide('L', value); }, null, revealed),
            rangeControl(t('stem.areaperimeter.garden_width_m', 'Garden width (m)'), W, 1, m.half, function(value) { setSide('W', value); }, null, revealed)
          ]);
          labels = { perimeter: t('stem.areaperimeter.mg_perimeter', 'Perimeter of your design (m)'), area: t('stem.areaperimeter.mg_area', 'Area of your design (m²)'), cost: t('stem.areaperimeter.mg_cost', 'Total cost of your design ($)') };
        } else {
          brief = m.mode === 'yard'
            ? fill(t('stem.areaperimeter.mission_floor_yard', 'Carpet this room. Carpet is sold by the square yard at {price} per yd², in whole square yards only. One yard is 3 feet. Find the floor area, the square yards to buy, and the total cost.'), { price: money(m.price) })
            : fill(t('stem.areaperimeter.mission_floor_box', 'Floor this room. Flooring comes in boxes that each cover {per} ft² and cost {price}. The store sells only whole boxes. Find the floor area, the boxes to buy, and the total cost.'), { per: m.per, price: money(m.price) });
          var fs = Math.min(400 / m.W, 200 / m.H);
          var fx = (640 - m.W * fs) / 2, fy = 40, leftW = m.W - m.cw;
          var pts = m.cw ? [[fx, fy], [fx + leftW * fs, fy], [fx + leftW * fs, fy + m.ch * fs], [fx + m.W * fs, fy + m.ch * fs], [fx + m.W * fs, fy + m.H * fs], [fx, fy + m.H * fs]]
            : [[fx, fy], [fx + m.W * fs, fy], [fx + m.W * fs, fy + m.H * fs], [fx, fy + m.H * fs]];
          var planEls = [h('polygon', { key: 'room', points: pts.map(function(pt) { return round1(pt[0]) + ',' + round1(pt[1]); }).join(' '), fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 })];
          planEls.push(h('text', { key: 'w', x: fx + m.W * fs / 2, y: fy + m.H * fs + 26, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.n_ft', '{n} ft'), { n: m.W })));
          planEls.push(h('text', { key: 'h', x: fx - 12, y: fy + m.H * fs / 2 + 6, textAnchor: 'end', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, fill(t('stem.areaperimeter.n_ft', '{n} ft'), { n: m.H })));
          if (m.cw) {
            planEls.push(h('text', { key: 'cw', x: fx + (leftW + m.cw / 2) * fs, y: fy + m.ch * fs - 10, textAnchor: 'middle', fill: COLORS.red, fontSize: 15, fontWeight: 800 }, fill(t('stem.areaperimeter.n_ft', '{n} ft'), { n: m.cw })));
            planEls.push(h('text', { key: 'ch', x: fx + m.W * fs + 10, y: fy + m.ch * fs / 2 + 6, textAnchor: 'start', fill: COLORS.red, fontSize: 15, fontWeight: 800 }, fill(t('stem.areaperimeter.n_ft', '{n} ft'), { n: m.ch })));
          }
          drawing = h('svg', { key: 'floor-svg', viewBox: '0 0 640 ' + Math.ceil(fy + m.H * fs + 44), role: 'img', 'aria-labelledby': 'ap-floor-title ap-floor-desc', style: { display: 'block', width: '100%', maxHeight: '320px' } }, [
            h('title', { key: 'title', id: 'ap-floor-title' }, t('stem.areaperimeter.floor_title', 'Floor plan of the room')),
            h('desc', { key: 'desc', id: 'ap-floor-desc' }, m.cw
              ? fill(t('stem.areaperimeter.floor_desc_l', 'An L-shaped room: a {W} ft by {H} ft rectangle with a {cw} ft by {ch} ft corner missing at the top right.'), { W: m.W, H: m.H, cw: m.cw, ch: m.ch })
              : fill(t('stem.areaperimeter.floor_desc_rect', 'A rectangular room {W} ft by {H} ft.'), { W: m.W, H: m.H }))
          ].concat(planEls));
          labels = { area: t('stem.areaperimeter.mf_area', 'Floor area (ft²)'), count: m.mode === 'yard' ? t('stem.areaperimeter.mf_yards', 'Square yards to buy') : t('stem.areaperimeter.mf_boxes', 'Boxes to buy'), cost: t('stem.areaperimeter.mf_cost', 'Total cost ($)') };
        }
        var feedbackNode = null;
        if (result) {
          var rr = { P: result.P, A: result.A, C: result.C };
          feedbackNode = h('div', { key: 'mission-fb', 'data-ap-mission-result': result.solved ? 'solved' : 'not-yet' }, [
            result.solved
              ? note(result.credited ? t('stem.areaperimeter.mission_solved', 'Mission complete! Your design keeps every rule and your calculations are right.') : t('stem.areaperimeter.mission_solved_no_points', 'Mission complete. This one was already counted (or you saw a solution), so it earns no new points.'), 'good', 'mission-note')
              : note(result.tries >= 2 && revealsAllowed ? t('stem.areaperimeter.mission_not_yet_reveal', 'Not yet. Fix the items marked “Not yet”, or show a design that works.') : t('stem.areaperimeter.mission_not_yet', 'Not yet. Fix the items marked “Not yet” and check again.'), 'warn', 'mission-note'),
            h('ul', { key: 'items', style: { listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'grid', gap: '6px', color: COLORS.text } }, result.items.map(function(it) {
              var good = it.status === 'ok';
              return h('li', { key: it.id, 'data-ap-mission-item': it.id, 'data-ap-status': it.status, 'data-ap-mistake': it.mistake || undefined, style: { padding: '8px 10px', borderRadius: '10px', border: '1px solid ' + (good ? COLORS.green : COLORS.border), background: COLORS.panelAlt } }, [
                h('strong', { key: 'l' }, missionItemLabel(it.id, m)),
                ' ',
                h('span', { key: 's', style: { fontWeight: 800, color: good ? COLORS.green : COLORS.red } }, good ? t('stem.areaperimeter.status_ok', '(OK)') : t('stem.areaperimeter.status_not_yet', '(Not yet)')),
                ' ',
                h('span', { key: 't' }, missionItemText(it, m, rr))
              ]);
            }))
          ]);
        }
        var solution = null;
        if (revealed || solvedHere) {
          var steps;
          if (kind === 'garden') {
            var options = [];
            for (var w = 1; w <= Math.floor(m.half / 2); w += 1) options.push(fill(t('stem.areaperimeter.option_area', '{l} × {w} = {a} m²'), { l: m.half - w, w: w, a: w * (m.half - w) }));
            steps = [
              fill(t('stem.areaperimeter.sol_garden_1', 'Every rectangle with {F} m of fence has length + width = {h} m.'), { F: m.fence, h: m.half }),
              fill(t('stem.areaperimeter.sol_garden_2', 'The areas grow as the sides get closer together: {list}.'), { list: options.join('; ') }),
              m.budgetBinds
                ? fill(t('stem.areaperimeter.sol_garden_3_budget', 'The budget pays for at most {max} m² of soil after the fence, so the best design is {l} m × {w} m = {a} m². It costs {C}.'), { max: m.maxArea, l: m.best.l, w: m.best.w, a: m.best.area, C: money(gardenCost(m, m.best.l, m.best.w)) })
                : fill(t('stem.areaperimeter.sol_garden_3', 'The design closest to a square, {l} m × {w} m, holds the most: {a} m². It costs {C}, within the budget.'), { l: m.best.l, w: m.best.w, a: m.best.area, C: money(gardenCost(m, m.best.l, m.best.w)) })
            ];
          } else {
            steps = [
              m.cw ? fill(t('stem.areaperimeter.sol_floor_1l', 'Area: {W} × {H} − {cw} × {ch} = {A} ft².'), { W: m.W, H: m.H, cw: m.cw, ch: m.ch, A: m.area }) : fill(t('stem.areaperimeter.sol_floor_1', 'Area: {W} × {H} = {A} ft².'), { W: m.W, H: m.H, A: m.area }),
              m.mode === 'yard'
                ? fill(t('stem.areaperimeter.sol_floor_2y', 'Square yards: 1 yd² = 9 ft², so {A} ÷ 9 = {x}, rounded up to {n} yd².'), { A: m.area, x: numText(Math.round(m.area / 9 * 100) / 100), n: m.count })
                : fill(t('stem.areaperimeter.sol_floor_2b', 'Boxes: {A} ÷ {per} = {x}, rounded up to {n} boxes.'), { A: m.area, per: m.per, x: numText(Math.round(m.area / m.per * 100) / 100), n: m.count }),
              fill(t('stem.areaperimeter.sol_floor_3', 'Cost: {n} × {price} = {cost}.'), { n: m.count, price: money(m.price), cost: money(m.cost) })
            ];
          }
          solution = h('section', { key: 'solution', 'aria-labelledby': 'ap-mission-sol', 'data-ap-mission-solution': true, style: { marginTop: '12px', color: COLORS.text } }, [
            h('h4', { key: 'h', id: 'ap-mission-sol', style: { margin: '0 0 6px' } }, t('stem.areaperimeter.how_it_works', 'How it works')),
            h('ol', { key: 'steps', style: { margin: 0, paddingLeft: '22px', lineHeight: 1.6 } }, steps.map(function(text, i) { return h('li', { key: i }, text); }))
          ]);
        }
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            heading(t('stem.areaperimeter.missions_heading', 'Design missions')),
            lead(t('stem.areaperimeter.missions_intro', 'Real jobs with rules to keep. Plan, calculate, then submit your design for checking.')),
            chipGroup(t('stem.areaperimeter.mission_group', 'Mission'), [
              { id: 'garden', label: t('stem.areaperimeter.mission_garden', 'Garden on a budget') },
              { id: 'floor', label: t('stem.areaperimeter.mission_floor', 'Flooring a room') }
            ], kind, function(id) { patch({ missionKind: id }); }, 'mission-kinds'),
            levelChips('missionLevel', missionLevel, 'mission-levels')
          ], { key: 'mission-top' }),
          panel([
            h('p', { key: 'brief', 'data-ap-mission-brief': m.sig, style: { color: COLORS.text, fontSize: '1.05rem', fontWeight: 650, lineHeight: 1.55, margin: 0 } }, brief),
            sliders,
            drawing,
            kind === 'garden' ? soundButton([L, W, L, W], 'garden', false) : null,
            h('form', { key: 'form', onSubmit: submit, style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '12px' } }, fieldIds.map(function(id) {
              return textField('ap-mission-' + id, labels[id], textOf(inputs[id]), function(value) {
                var next = Object.assign({}, inputs); next[id] = value;
                writeItem({ inputs: next, result: null });
              }, { disabled: locked, flex: '1 1 170px' });
            }).concat([
              actionButton(locked && !revealed ? t('stem.areaperimeter.solved_2', 'Solved') : t('stem.areaperimeter.submit_design', 'Check my design'), null, { key: 'submit', type: 'submit', primary: true, disabled: locked }),
              hintButton(missionHints, missionHint, 'ap-mission-hint', function(next) { writeItem({ hint: next }); }, locked)
            ])),
            hintLadder(missionHints, missionHint, 'ap-mission-hint'),
            h('div', { key: 'live', role: 'status' }, feedbackNode),
            revealsAllowed && attempts >= 2 && !locked ? actionButton(t('stem.areaperimeter.show_working_design', 'Show a design that works'), reveal, { key: 'reveal', compact: true, style: { marginTop: '10px' } }) : null,
            solution,
            h('div', { key: 'nav', style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', alignItems: 'center' } }, [
              actionButton(t('stem.areaperimeter.new_mission', 'New mission'), newMission, { key: 'new', compact: true, primary: locked }),
              h('span', { key: 'count', style: { color: COLORS.muted, fontSize: '0.9rem' } }, fill(t('stem.areaperimeter.missions_done', '{n} missions complete'), { n: Object.keys(solvedMap).filter(function(sig) { return solvedMap[sig]; }).length }))
            ])
          ], { key: 'mission-' + kind, 'data-ap-mission': kind })
        ]);
      }

      // ── teacher controls (ctx.isTeacherMode only) ──
      function teacherPanel() {
        if (!isTeacher) return null;
        var counts = plainMap(state.mistakeCounts);
        var mistakeRows = Object.keys(counts).filter(function(id) { return Number(counts[id]) > 0; })
          .sort(function(a, b) { return Number(counts[b]) - Number(counts[a]); })
          .map(function(id) { return [mistakeName(id), String(Number(counts[id]))]; });
        var byType = plainMap(state.missedByType);
        var typeRows = Object.keys(byType).filter(function(id) { return Number(byType[id]) > 0; })
          .sort(function(a, b) { return Number(byType[b]) - Number(byType[a]); })
          .map(function(id) { return [topicLabel(id), String(Number(byType[id]))]; });
        var waiting = Object.keys(plainMap(state.missedItems)).length;
        var selectStyle = { minHeight: '40px', padding: '6px 10px', borderRadius: '10px', border: '2px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.text };
        function gradeSelect(id, labelText, value, onChange) {
          return h('label', { key: id, htmlFor: id, style: { display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 700, color: COLORS.text } }, [
            h('span', { key: 's' }, labelText),
            h('select', { key: 'sel', id: id, value: value, onChange: function(event) { onChange(Number(event.target.value)); }, 'aria-describedby': 'ap-teacher-range-note', style: selectStyle },
              RANGE_GRADES.map(function(g) { return h('option', { key: g, value: g }, gradeLabel(g)); }))
          ]);
        }
        // One control: setting the range also retires the older fixed level.
        function setRange(next) {
          patch({ teacherRange: normalizeRange(next), teacherLevel: '' });
          var r = normalizeRange(next);
          speak(fill(t('stem.areaperimeter.sr_range_set', 'Grade range set: {min} to {max}.'), { min: gradeLabel(r.min), max: gradeLabel(r.max) }));
        }
        function levelsText(key) {
          var list = levelsAllowed(key);
          return list.length === 1
            ? fill(t('stem.areaperimeter.teacher_levels_one', 'level {a}'), { a: list[0] })
            : fill(t('stem.areaperimeter.teacher_levels_span', 'levels {a} to {b}'), { a: list[0], b: list[list.length - 1] });
        }
        var rangeRows = [
          [modeLabel('challenge'), practiceRange.min === practiceRange.max ? gradeLabel(practiceRange.min) : fill(t('stem.areaperimeter.teacher_grades_span', '{a} to {b}'), { a: gradeLabel(practiceRange.min), b: gradeLabel(practiceRange.max) })],
          [modeLabel('units'), levelsText('unitLevel')],
          [modeLabel('circles'), levelsText('circleLevel')],
          [modeLabel('irregular'), levelsText('blobLevel')],
          [modeLabel('missions'), levelsText('missionLevel')]
        ];
        return h('details', { key: 'teacher', 'data-ap-teacher': true, style: { marginBottom: '14px', padding: '12px 14px', borderRadius: '12px', border: '2px dashed ' + COLORS.amber, background: COLORS.panel, color: COLORS.text } }, [
          h('summary', { key: 's', style: { cursor: 'pointer', fontWeight: 850, minHeight: '28px' } }, t('stem.areaperimeter.teacher_controls', 'Teacher controls')),
          h('div', { key: 'grid', style: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px', alignItems: 'flex-end' } }, [
            gradeSelect('ap-teacher-min', t('stem.areaperimeter.teacher_range_min', 'Lowest grade for this class'), teacherRange.min, function(g) { setRange({ min: g, max: Math.max(g, teacherRange.max) }); }),
            gradeSelect('ap-teacher-max', t('stem.areaperimeter.teacher_range_max', 'Highest grade for this class'), teacherRange.max, function(g) { setRange({ min: Math.min(g, teacherRange.min), max: g }); }),
            h('label', { key: 'lock', htmlFor: 'ap-teacher-lock', style: { display: 'flex', flexDirection: 'column', gap: '4px', fontWeight: 700 } }, [
              h('span', { key: 's' }, t('stem.areaperimeter.teacher_lock', 'Keep students in one activity')),
              h('select', { key: 'sel', id: 'ap-teacher-lock', value: lockMode, onChange: function(event) { patch({ teacherLockMode: event.target.value }); }, style: selectStyle },
                [h('option', { key: 'none', value: '' }, t('stem.areaperimeter.teacher_no_lock', 'No lock: students choose'))].concat(MODES.map(function(item) { return h('option', { key: item.id, value: item.id }, item.label); })))
            ]),
            h('label', { key: 'reveal', htmlFor: 'ap-teacher-reveal', style: { display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 700, minHeight: '40px' } }, [
              h('input', { key: 'in', id: 'ap-teacher-reveal', type: 'checkbox', checked: revealsAllowed, onChange: function(event) { patch({ teacherNoReveal: !event.target.checked }); }, style: { width: '24px', height: '24px', minWidth: '24px', flex: '0 0 24px', margin: 0, accentColor: COLORS.teal } }),
              h('span', { key: 's' }, t('stem.areaperimeter.teacher_allow_reveal', 'Students may show a worked solution after two tries'))
            ])
          ]),
          h('p', { key: 'range-note', id: 'ap-teacher-range-note', style: { margin: '10px 0 0', color: COLORS.muted } }, t('stem.areaperimeter.teacher_range_note', 'The grade range sets the practice grades in Challenges and the levels students can choose in Square Units, Circles, Irregular Shapes and Design Missions. It also picks which “Start here” path students see.')),
          teacherLevel ? note(fill(t('stem.areaperimeter.teacher_legacy_level', 'An earlier setting fixes Square Units, Circles, Irregular Shapes and Design Missions at level {n}. Choosing a grade range replaces it.'), { n: teacherLevel }), 'info', 'legacy-level', { 'data-ap-legacy-level': teacherLevel }) : null,
          formulaTable(rangeRows, t('stem.areaperimeter.teacher_range_caption', 'What students can choose with this range'), [t('stem.areaperimeter.teacher_col_activity', 'Activity'), t('stem.areaperimeter.teacher_col_allowed', 'Allowed')]),
          h('h3', { key: 'sum-h', style: { fontSize: '1rem', margin: '16px 0 4px' } }, t('stem.areaperimeter.teacher_summary', 'Missed-items summary')),
          h('p', { key: 'waiting', style: { margin: '0 0 6px', color: COLORS.muted } }, fill(t('stem.areaperimeter.teacher_waiting', 'Problems waiting to be practised again: {n}'), { n: waiting })),
          mistakeRows.length ? formulaTable(mistakeRows, t('stem.areaperimeter.teacher_mistakes_caption', 'Named mistakes, most common first'), [t('stem.areaperimeter.mistake', 'Mistake'), t('stem.areaperimeter.times', 'Times')]) : h('p', { key: 'none', style: { margin: 0 } }, t('stem.areaperimeter.teacher_no_mistakes', 'No wrong answers recorded yet.')),
          typeRows.length ? formulaTable(typeRows, t('stem.areaperimeter.teacher_types_caption', 'Problems missed at least once, by topic'), [t('stem.areaperimeter.topic', 'Topic'), t('stem.areaperimeter.problems', 'Problems')]) : null,
          state.teacherConfirmClear
            ? h('div', { key: 'confirm', role: 'group', 'aria-label': t('stem.areaperimeter.teacher_clear_confirm', 'Clear the summary? This cannot be undone.'), style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' } }, [
                h('span', { key: 'q', style: { fontWeight: 700 } }, t('stem.areaperimeter.teacher_clear_confirm', 'Clear the summary? This cannot be undone.')),
                actionButton(t('stem.areaperimeter.yes_clear', 'Yes, clear it'), function() { patch({ mistakeCounts: {}, missedByType: {}, teacherConfirmClear: false }); speak(t('stem.areaperimeter.sr_summary_cleared', 'Summary cleared.')); }, { key: 'yes', compact: true, primary: true }),
                actionButton(t('stem.areaperimeter.cancel', 'Cancel'), function() { patch({ teacherConfirmClear: false }); }, { key: 'no', compact: true })
              ])
            : actionButton(t('stem.areaperimeter.teacher_clear', 'Clear the summary'), function() { patch({ teacherConfirmClear: true }); }, { key: 'clear', compact: true, style: { marginTop: '10px' }, disabled: !mistakeRows.length && !typeRows.length })
        ]);
      }

      // ── "Start here": a short path for the learner's grade band ──
      function bandLabel(b) {
        if (b === 'g3') return t('stem.areaperimeter.band_g3', 'Grade 3');
        if (b === 'g67') return t('stem.areaperimeter.band_g67', 'Grades 6 and 7');
        return t('stem.areaperimeter.band_g45', 'Grades 4 and 5');
      }
      function pathText(id) {
        switch (id) {
          case 'tile': return [t('stem.areaperimeter.path_tile', 'Tile a rectangle'), t('stem.areaperimeter.path_tile_d', 'In the Tile Explorer, predict the area and perimeter, then reveal 20 unit squares.')];
          case 'fence': return [t('stem.areaperimeter.path_fence', 'Same fence, different gardens'), t('stem.areaperimeter.path_fence_d', 'Make a claim, record at least 3 gardens, then check your claim.')];
          case 'same_area': return [t('stem.areaperimeter.path_same_area', 'Same area, different shapes'), t('stem.areaperimeter.path_same_area_d', 'Build rectangles for 3 different target areas in the Same Area Lab.')];
          case 'practice3': return [t('stem.areaperimeter.path_practice3', 'Grade 3 practice'), t('stem.areaperimeter.path_practice3_d', 'Solve 3 tiling, area or perimeter problems in Challenges.')];
          case 'formulas': return [t('stem.areaperimeter.path_formulas', 'Area and perimeter formulas'), t('stem.areaperimeter.path_formulas_d', 'Solve 3 formula or missing-side problems in Challenges.')];
          case 'composite': return [t('stem.areaperimeter.path_composite', 'Composite shapes'), t('stem.areaperimeter.path_composite_d', 'Find an L-shape’s area both ways: add the parts, and subtract the missing corner.')];
          case 'fractions': return [t('stem.areaperimeter.path_fractions', 'Fraction side lengths'), t('stem.areaperimeter.path_fractions_d', 'Solve 2 problems with fraction or mixed-number sides in Challenges.')];
          case 'units': return [t('stem.areaperimeter.path_units', 'Square units'), t('stem.areaperimeter.path_units_d', 'Predict how many small squares fill a big one, then solve 2 conversions.')];
          case 'shapes6': return [t('stem.areaperimeter.path_shapes6', 'Triangles and parallelograms'), t('stem.areaperimeter.path_shapes6_d', 'Solve 3 triangle, parallelogram or trapezoid problems in Challenges.')];
          case 'circles': return [t('stem.areaperimeter.path_circles', 'Measure circles'), t('stem.areaperimeter.path_circles_d', 'Roll 3 circles, read each track off the ruler, and check your claim about C ÷ d.')];
          case 'circle_drill': return [t('stem.areaperimeter.path_circle_drill', 'Circle formulas'), t('stem.areaperimeter.path_circle_drill_d', 'Solve 2 circumference or circle-area problems.')];
          case 'irregular': return [t('stem.areaperimeter.path_irregular', 'Irregular shapes'), t('stem.areaperimeter.path_irregular_d', 'Estimate the area of a curved shape to within 10%.')];
          default: return [t('stem.areaperimeter.path_missions', 'Design missions'), t('stem.areaperimeter.path_missions_d', 'Complete one garden or flooring mission.')];
        }
      }
      function pathSteps() {
        return bandSteps();
      }
      // After Open/Start: scroll to the activity and put focus on its first
      // thing to do, once the new tab has rendered (the host may update late).
      function focusActivity(targetMode) {
        var doc = global.document;
        if (!doc || typeof global.setTimeout !== 'function') return;
        var tries = 0;
        function attempt() {
          tries += 1;
          var panelEl = doc.getElementById('ap-mode-panel');
          if (!panelEl || panelEl.getAttribute('aria-labelledby') !== 'ap-tab-' + targetMode) {
            if (tries < 20) global.setTimeout(attempt, 40);
            return;
          }
          var target = panelEl.querySelector('#ap-answer:not([disabled])') || panelEl.querySelector('[data-ap-tile][tabindex="0"]') ||
            panelEl.querySelector('[data-ap-start]') || panelEl.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled])') ||
            panelEl.querySelector('button:not([disabled])') || panelEl;
          if (typeof target.scrollIntoView === 'function') {
            try { target.scrollIntoView({ block: 'center', behavior: reducedMotionNow() ? 'auto' : 'smooth' }); } catch (e) { try { target.scrollIntoView(); } catch (e2) {} }
          }
          if (typeof target.focus === 'function') {
            try { target.focus({ preventScroll: true }); } catch (e3) { target.focus(); }
          }
        }
        global.setTimeout(attempt, 0);
      }
      function goToStep(step) {
        if (!isTeacher && lockMode && step.mode !== lockMode) return;
        if (step.grade) {
          var types = PATH_TYPES[step.id].filter(function(type) { return GRADE_TOPICS[step.grade].indexOf(type) >= 0; });
          var solved = normalizeChallengeProgress(state.solvedChallenges);
          var onScreen = Number(state.genGrade) === step.grade && types.indexOf(state.genType) >= 0 && Number(state.genSeed) > 0 && state.itemSig && !solved[state.itemSig];
          if (!onScreen) {
            // The problem the path opened by default stays, if it is still unsolved.
            var shown = !Number(state.genSeed) && pathDefault && pathDefault.id === step.id && mode === step.mode ? pathOpeningProblem() : null;
            var next = shown && !solved[shown.sig] ? shown : null;
            for (var i = 0; !next && i < 12; i += 1) {
              var candidate = generateProblem(step.grade, types[Math.floor(Math.random() * types.length)], randomSeed());
              if (!solved[candidate.sig] || i === 11) next = candidate;
            }
            patch({ practiceGrade: next.grade, practiceTopic: 'mixed', genGrade: next.grade, genType: next.type, genSeed: next.seed, itemSig: next.sig, answer: '', attempts: 0, revealed: false, hintStep: 0, feedback: null, aiHint: null, exFills: {}, exInputs: {}, exFeedback: null, showRearrange: false, showExample: '' });
          }
        }
        selectMode(step.mode);
        focusActivity(step.mode);
      }
      function pathPanel() {
        if (!isTeacher && lockMode) return null;
        var steps = pathSteps();
        if (!steps.length) return null;
        var progress = steps.map(function(step) { return pathStepProgress(step.id, state); });
        var doneCount = progress.filter(function(pr) { return pr.done; }).length;
        var nextIndex = progress.findIndex ? progress.findIndex(function(pr) { return !pr.done; }) : -1;
        // Folded to one "Next" line by default; the full list is one click away.
        var open = state.pathOpen === true;
        var summary = doneCount === steps.length
          ? t('stem.areaperimeter.path_complete', 'Path complete! Every other activity is open to explore.')
          : fill(t('stem.areaperimeter.path_count', '{n} of {total} steps done.'), { n: doneCount, total: steps.length });
        function statusOf(index) {
          var pr = progress[index];
          return pr.done ? t('stem.areaperimeter.path_done', 'Done') : (pr.need > 1 ? fill(t('stem.areaperimeter.path_have', '{have} of {need}'), { have: pr.have, need: pr.need }) : t('stem.areaperimeter.path_not_yet', 'Not done yet'));
        }
        var nextStep = nextIndex >= 0 ? steps[nextIndex] : null;
        var nextText = nextStep ? pathText(nextStep.id) : null;
        var strip = nextStep ? h('div', { key: 'next', 'data-ap-path-next': nextStep.id, style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' } }, [
          h('p', { key: 'line', style: { margin: 0, flex: '1 1 240px', minWidth: 0, lineHeight: 1.45 } }, [
            h('strong', { key: 't' }, fill(t('stem.areaperimeter.path_next_line', 'Next: step {n}, {title}.'), { n: nextIndex + 1, title: nextText[0] })),
            ' ',
            h('span', { key: 'd', style: { color: COLORS.muted } }, nextText[1]),
            ' ',
            h('span', { key: 's', 'data-ap-path-next-status': true, style: { fontWeight: 800 } }, statusOf(nextIndex))
          ]),
          actionButton(t('stem.areaperimeter.path_start', 'Start'), function() { goToStep(nextStep); }, { key: 'start', primary: true, ariaLabel: fill(t('stem.areaperimeter.path_start_label', 'Start step {n}: {title}'), { n: nextIndex + 1, title: nextText[0] }), data: 'path-start', style: { minHeight: '44px', minWidth: '88px' } })
        ]) : null;
        return h('section', { key: 'path', 'aria-labelledby': 'ap-path-title', 'data-ap-path': band, style: { marginTop: '14px', padding: '10px 14px', borderRadius: '14px', border: '2px solid ' + COLORS.teal, background: COLORS.panel, color: COLORS.text } }, [
          h('div', { key: 'top', style: { display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
            h('h2', { key: 'h', id: 'ap-path-title', style: { margin: 0, fontSize: '1rem', fontWeight: 850, color: COLORS.text } }, fill(t('stem.areaperimeter.path_heading', 'Start here: {band}'), { band: bandLabel(band) })),
            h('span', { key: 'count', 'data-ap-path-count': doneCount + '/' + steps.length, style: { color: COLORS.muted, fontWeight: 700 } }, summary),
            actionButton(open ? t('stem.areaperimeter.path_hide_all', 'Hide all steps') : t('stem.areaperimeter.path_show_all', 'Show all steps'), function() { patch({ pathOpen: !open }); }, { key: 'toggle', compact: true, expanded: open, controls: 'ap-path-list', data: 'path-toggle' })
          ]),
          strip,
          !open ? null : h('ol', { key: 'list', id: 'ap-path-list', style: { listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))' } }, steps.map(function(step, index) {
            var pr = progress[index];
            var text = pathText(step.id);
            var isNext = index === nextIndex;
            var status = statusOf(index);
            var current = mode === step.mode && (!step.grade || practiceGrade === step.grade);
            return h('li', { key: step.id, 'data-ap-path-step': step.id, 'data-ap-done': pr.done ? 'yes' : 'no', style: { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', borderRadius: '12px', border: (isNext ? '2px solid ' + COLORS.teal : '1px solid ' + COLORS.border), background: COLORS.panelAlt } }, [
              h('span', { key: 'mark', 'aria-hidden': true, style: { flex: '0 0 28px', width: '28px', height: '28px', borderRadius: '999px', display: 'grid', placeItems: 'center', fontWeight: 900, background: pr.done ? COLORS.green : COLORS.soft, color: pr.done ? (isContrast ? '#000000' : (isDark ? '#052e16' : '#ffffff')) : COLORS.text } }, pr.done ? '✓' : String(index + 1)),
              h('div', { key: 'body', style: { minWidth: 0, flex: '1 1 auto' } }, [
                h('strong', { key: 't', style: { display: 'block' } }, fill(t('stem.areaperimeter.path_step_title', 'Step {n}: {title}'), { n: index + 1, title: text[0] })),
                h('span', { key: 'd', style: { display: 'block', color: COLORS.muted, fontSize: '0.92rem', lineHeight: 1.45, margin: '2px 0 6px' } }, text[1]),
                h('span', { key: 's', 'data-ap-path-status': pr.done ? 'done' : 'open', style: { display: 'block', fontWeight: 800, color: pr.done ? COLORS.green : COLORS.text, marginBottom: '6px' } }, isNext ? fill(t('stem.areaperimeter.path_next_status', 'Next step. {status}'), { status: status }) : status),
                actionButton(current ? t('stem.areaperimeter.path_here', 'You are here') : t('stem.areaperimeter.path_open', 'Open'), function() { goToStep(step); }, { key: 'go', compact: true, primary: isNext && !current, disabled: current, ariaLabel: current ? fill(t('stem.areaperimeter.path_here_label', 'You are on step {n}: {title}'), { n: index + 1, title: text[0] }) : fill(t('stem.areaperimeter.path_open_label', 'Open step {n}: {title}'), { n: index + 1, title: text[0] }), data: 'path-' + step.id })
              ])
            ]);
          }))
        ]);
      }

      var VIEWS = { compare: compareView, composite: compositeView, investigate: investigationView, fence: fenceView, challenge: challengeView, units: unitsView, circles: circlesView, irregular: irregularView, missions: missionsView };
      var activeView = (VIEWS[mode] || exploreView)();
      // The band's core activities come first; every activity stays reachable.
      var coreIds = BAND_CORE[band] || [];
      var orderedModes = tabOrderFor(band).map(function(id) { return MODES.filter(function(item) { return item.id === id; })[0]; }).filter(Boolean);
      var visibleModes = (!isTeacher && lockMode) ? orderedModes.filter(function(item) { return item.id === lockMode; }) : orderedModes;
      // Students see the starred tabs (and the open one); the rest wait under
      // "More activities". Teachers always see every tab.
      var canFold = !isTeacher && !lockMode && coreIds.length > 0 && orderedModes.length > coreIds.length;
      var moreOpen = state.moreTabsOpen === true;
      var shownModes = canFold && !moreOpen
        ? visibleModes.filter(function(item) { return coreIds.indexOf(item.id) >= 0 || item.id === mode; })
        : visibleModes;
      var foldedCount = visibleModes.length - shownModes.length;

      return h('div', {
        className: 'area-perimeter-lab',
        style: { background: COLORS.page, color: COLORS.text, borderRadius: '18px', padding: 'clamp(12px, 2.5vw, 24px)', minHeight: '620px', fontFamily: 'inherit' }
      }, [
        h('header', { key: 'header', style: { marginBottom: '16px' } }, [
          h('div', { key: 'top', style: { display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
            h('div', { key: 'titleWrap', style: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 } }, [
              typeof ctx.setStemLabTool === 'function' ? h('button', {
                key: 'back', type: 'button', onClick: function() { ctx.setStemLabTool(null); },
                'aria-label': t('stem.areaperimeter.back_to_stem_tools', "Back to STEM tools"), title: t('stem.areaperimeter.back_to_stem_tools', "Back to STEM tools"),
                className: 'rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500',
                style: { width: '44px', height: '44px', display: 'grid', placeItems: 'center', borderColor: COLORS.border, background: COLORS.panel, color: COLORS.text, cursor: 'pointer', flex: '0 0 auto' }
              }, ArrowLeft ? h(ArrowLeft, { size: 20, 'aria-hidden': true }) : '←') : null,
              h('div', { key: 'titles', style: { minWidth: 0 } }, [
                h('h1', { key: 'h', style: { margin: 0, color: COLORS.text, fontSize: 'clamp(1.45rem, 4vw, 2.15rem)', lineHeight: 1.15 } }, t('stem.areaperimeter.area_perimeter_lab', "📐 Area & Perimeter Lab")),
                h('p', { key: 'p', style: { margin: '5px 0 0', color: COLORS.muted, lineHeight: 1.45 } }, t('stem.areaperimeter.measure_space_inside_distance_around_a', "Measure space inside, distance around, and the shapes between."))
              ])
            ]),
            h('div', { key: 'quick', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
              h('span', { key: 'solved', style: { padding: '7px 11px', borderRadius: '999px', border: '1px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.green, fontWeight: 800 } }, fill(t('stem.areaperimeter.n_solved', '{n} solved'), { n: challengeProgressCount(state.solvedChallenges) })),
              h('span', { key: 'best', style: { padding: '7px 11px', borderRadius: '999px', border: '1px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.amber, fontWeight: 800 } }, fill(t('stem.areaperimeter.best_streak_n', 'Best streak: {n}'), { n: state.bestStreak || 0 }))
            ])
          ]),
          teacherPanel(),
          pathPanel(),
          h('nav', { key: 'nav', 'aria-label': t('stem.areaperimeter.area_and_perimeter_lab_modes', "Area and perimeter lab modes"), style: { marginTop: '16px' } }, [
            visibleModes.length > 1 ? h('p', { key: 'core-note', id: 'ap-core-note', style: canFold && !moreOpen ? srOnlyStyle() : { margin: '0 0 8px', color: COLORS.muted, fontSize: '0.9rem' } }, fill(t('stem.areaperimeter.core_note', '★ marks the core activities for {band}. They come first.'), { band: bandLabel(band) })) : null,
            h('div', { key: 'row', style: { display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'stretch' } }, [
              h('div', { key: 'tabs', id: 'ap-tablist', role: 'tablist', 'aria-label': t('stem.areaperimeter.lab_modes', "Lab modes"), style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 125px), 1fr))', gap: '7px', flex: '1 1 420px', minWidth: 0 } }, shownModes.map(function(item, index) {
                var active = mode === item.id;
                var core = coreIds.indexOf(item.id) >= 0 && visibleModes.length > 1;
                return h('button', {
                  key: item.id, id: 'ap-tab-' + item.id, type: 'button', role: 'tab', 'aria-selected': active,
                  'aria-controls': 'ap-mode-panel', tabIndex: active ? 0 : -1,
                  'aria-describedby': core ? 'ap-core-note' : undefined, 'data-ap-core': core ? 'yes' : undefined,
                  onClick: function() { selectMode(item.id); },
                  onKeyDown: function(event) { handleModeKeyDown(event, index, shownModes); },
                  className: 'rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500',
                  style: { minWidth: 0, minHeight: '44px', whiteSpace: 'normal', overflowWrap: 'anywhere', padding: '10px 7px', borderColor: active || core ? COLORS.teal : COLORS.border, borderWidth: core ? '2px' : '1px', background: active ? COLORS.teal : COLORS.panel, color: active ? COLORS.onTeal : COLORS.text, cursor: 'pointer' }
                }, h('span', null, [h('span', { key: 'icon', 'aria-hidden': true }, (core ? '★ ' : '') + item.icon + ' '), h('span', { key: 'text' }, item.label)]));
              })),
              canFold ? actionButton(moreOpen ? t('stem.areaperimeter.tabs_fewer', 'Fewer activities') : fill(t('stem.areaperimeter.tabs_more', 'More activities ({n})'), { n: foldedCount }), function() { patch({ moreTabsOpen: !moreOpen }); }, { key: 'more', expanded: moreOpen, controls: 'ap-tablist', data: 'tabs-more', style: { minHeight: '44px', flex: '0 0 auto' } }) : null
            ])
          ]),
          !isTeacher && lockMode ? h('p', { key: 'locked', style: { color: COLORS.muted, margin: '8px 0 0' } }, t('stem.areaperimeter.locked_note', 'Your teacher chose this activity for now.')) : null
        ]),
        h('div', { key: 'main', id: 'ap-mode-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'ap-tab-' + mode }, activeView),
        h(ApLifecycle, { key: 'lifecycle', React: React }),
        h('footer', { key: 'footer', style: { marginTop: '15px', padding: '12px 14px', borderRadius: '12px', border: '1px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.muted, fontSize: '0.9rem', lineHeight: 1.5 } }, [
          h('strong', { key: 'label', style: { color: COLORS.text } }, t('stem.areaperimeter.measurement_reminder_label', 'Measurement reminder')),
          ' ',
          t('stem.areaperimeter.area_uses_square_units_because_it_cove', "Area uses square units because it covers a surface. Perimeter uses linear units because it traces a boundary.")
        ])
      ]);
    }
  });
})(typeof window !== 'undefined' ? window : null);
