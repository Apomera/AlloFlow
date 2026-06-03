// ═══════════════════════════════════════════════════════════════════════
// stem_tool_lumen.js — Lumen (Phase 0: the reactive kernel)
// ═══════════════════════════════════════════════════════════════════════
// A reactive RESEARCH CANVAS where the finding, the chart, and the sentence
// that explains it are three faces of ONE live object. "The dashboard
// monitors; Lumen argues." Full design: docs/lumen_design.md.
//
// PHASE 0 ships the pure, DOM-free kernel ONLY (design §11 — "no charts yet"):
//   - certaintyGrammar.encode(level, palette)  — the single source of the
//     certainty ENCODING (dash/opacity/texture/glyph), layered over a palette.
//   - LumenStats  — uncertainty-first stats (slope + t-interval, deterministic
//     data-seeded bootstrap), with the small-n rule (n<3 refuse, n<8 flag).
//   - The reactive claim graph + the provenance-bound claim atom, with
//     dirty-tracking so only claims that depend on a changed observation
//     re-derive.
//   - The prose-template invariant: every estimate-bearing sentence emits the
//     level WORD and the interval/n in fixed order (the screen-reader channel
//     guarantee, design §6.4/§15.5).
//
// Design invariants honored even at Phase 0:
//   - Level is assigned by PROVENANCE, never self-labelled by an AI (§6.1).
//   - Bootstrap is DETERMINISTIC (mulberry32 seeded off a cyrb53 data hash),
//     so "random" resampling gives the same interval every run — honest about
//     sampling variability AND snapshot-pinnable (§6.5).
//   - n<3 is a HARD refuse that emits a real, announceable object, never a
//     silent null (a missing line is invisible to a screen reader, §6.5).
//   - Pure logic is DOM-free and exported for the golden-master test; the
//     render shell is a try/catch that returns a VISIBLE fallback, never null.
//
// NOT YET WIRED: this file is not in the StemLab loader / tile catalog / deploy
// mirror, and the verify_all gate suite has not been run against an app-visible
// Lumen. That is the next slice (Phase 0b). Phase 1 adds the chart + the UI.
// ═══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  // PURE KERNEL — no DOM, no window. Node-requirable for tests.
  // ══════════════════════════════════════════════════════════════════════

  function round1(x) { return x == null ? x : Math.round(x * 10) / 10; }
  function round2(x) { return x == null ? x : Math.round(x * 100) / 100; }
  function signed(x) { var v = round2(x); return (v >= 0 ? '+' : '') + v; }

  // --- deterministic hash + PRNG (data-seeded bootstrap is reproducible) ---
  function cyrb53(str, seed) {
    seed = seed || 0;
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // THE EPISTEMIC LADDER + CERTAINTY GRAMMAR (design §6.1, §6.4)
  // Level is assigned by provenance. encode() owns dash/opacity/texture/glyph
  // and layers them over the passed palette's COLORS — it is the single source
  // of the certainty ENCODING, not of the palette. Color is the LAST channel.
  // ══════════════════════════════════════════════════════════════════════

  var LEVELS = ['L0', 'L1', 'L2', 'L3']; // L4 (conjecture) deferred to v2

  var GRAMMAR = {
    L0: { label: 'Observed',      glyph: '●', opacity: 1.00, dash: 'none', texture: 'solid',   caution: false }, // ●
    L1: { label: 'Derived (math)', glyph: '◈', opacity: 1.00, dash: 'none', texture: 'solid',   caution: false }, // ◈
    L2: { label: 'AI-organized',  glyph: '◧', opacity: 0.85, dash: 'none', texture: 'solid',   caution: false }, // ◧
    L3: { label: 'AI reading',    glyph: '◑', opacity: 0.60, dash: '6 3',  texture: 'hatch45', caution: true  }  // ◑
  };

  var DEFAULT_PALETTE = { neutral: '#0f172a', caution: '#b45309', line: '#0f172a', white: '#ffffff' };

  // The WCAG opacity floor: 0.38-ish ink on white fails 1.4.11, so any mark
  // that must remain legible is clamped to >= 0.6 (design §6.4).
  var OPACITY_FLOOR = 0.6;

  function encode(level, palette) {
    var g = GRAMMAR[level];
    if (!g) throw new Error('encode: unknown level ' + level);
    var pal = palette || DEFAULT_PALETTE;
    return {
      level: level,
      label: g.label,
      srWord: g.label,
      glyph: g.glyph,
      markOpacity: Math.max(g.opacity, OPACITY_FLOOR), // rank-only, floored for legibility
      labelOpacity: 1.0,                               // the level WORD never fades
      strokeDasharray: g.dash,
      texture: g.texture,
      ink: g.caution ? pal.caution : pal.neutral,      // amber ONLY at L3; last, redundant channel
      caution: g.caution
    };
  }

  function levelWord(level) {
    var g = GRAMMAR[level];
    return g ? g.label : level;
  }

  // ══════════════════════════════════════════════════════════════════════
  // LumenStats — uncertainty-first. Every quantity is an interval, never a
  // bare point. Local t-table (BCa / inverse-CDF deferred, design §6.5).
  // ══════════════════════════════════════════════════════════════════════

  var SMALL_N = { refuseBelow: 3, flagBelow: 8 };

  function smallNStatus(n) {
    if (n < SMALL_N.refuseBelow) return 'refuse';
    if (n < SMALL_N.flagBelow) return 'flag';
    return 'ok';
  }

  // 95% two-sided t critical values by degrees of freedom (approximate; labelled).
  var T95 = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
    8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145,
    15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086, 21: 2.080,
    22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060, 26: 2.056, 27: 2.052, 28: 2.048,
    29: 2.045, 30: 2.042
  };
  function tCrit95(df) {
    if (df <= 0) return null;
    if (T95[df]) return T95[df];
    if (df <= 40) return 2.021;
    if (df <= 60) return 2.000;
    if (df <= 120) return 1.980;
    return 1.960;
  }

  function mean(xs) {
    if (!xs.length) return null;
    var s = 0; for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  // Ordinary least-squares fit; returns nulls on a degenerate (Sxx≈0) fit.
  function linregress(points) {
    var n = points.length;
    if (n < 2) return null;
    var mx = mean(points.map(function (p) { return p.x; }));
    var my = mean(points.map(function (p) { return p.y; }));
    var Sxx = 0, Sxy = 0, Syy = 0;
    for (var i = 0; i < n; i++) {
      var dx = points[i].x - mx, dy = points[i].y - my;
      Sxx += dx * dx; Sxy += dx * dy; Syy += dy * dy;
    }
    if (Sxx < 1e-12) return { degenerate: true, n: n };
    var slope = Sxy / Sxx;
    var intercept = my - slope * mx;
    var r = (Syy < 1e-12) ? 0 : Sxy / Math.sqrt(Sxx * Syy);
    var ssResid = Math.max(0, Syy - slope * Sxy);
    var se = (n > 2) ? Math.sqrt(ssResid / (n - 2)) : null;
    var seSlope = (se == null) ? null : se / Math.sqrt(Sxx);
    return {
      n: n, slope: slope, intercept: intercept, r: r,
      Sxx: Sxx, seSlope: seSlope, minX: Math.min.apply(null, points.map(function (p) { return p.x; })),
      maxX: Math.max.apply(null, points.map(function (p) { return p.x; }))
    };
  }

  // Closed-form 95% interval on the slope (t-interval). Wide on small n by design.
  function slopeInterval(points) {
    var fit = linregress(points);
    if (!fit || fit.degenerate || fit.seSlope == null) return null;
    var df = fit.n - 2;
    var t = tCrit95(df);
    var half = t * fit.seSlope;
    return { slope: fit.slope, lo: fit.slope - half, hi: fit.slope + half, df: df, t: t };
  }

  // Deterministic percentile bootstrap of the slope (seed = hash of the data),
  // so the "random" resample is reproducible across runs (design §6.5).
  function bootstrapSlopeCI(points, B, seedStr) {
    B = B || 1000;
    var n = points.length;
    if (n < 3) return null;
    var rng = mulberry32(cyrb53(seedStr || JSON.stringify(points)) >>> 0);
    var slopes = [];
    for (var b = 0; b < B; b++) {
      var sample = [];
      for (var i = 0; i < n; i++) sample.push(points[(rng() * n) | 0]);
      var fit = linregress(sample);
      if (fit && !fit.degenerate) slopes.push(fit.slope);
    }
    if (slopes.length < 2) return null;
    slopes.sort(function (a, c) { return a - c; });
    function pct(p) {
      var idx = Math.min(slopes.length - 1, Math.max(0, Math.round(p * (slopes.length - 1))));
      return slopes[idx];
    }
    return { lo: pct(0.025), hi: pct(0.975), B: B, kept: slopes.length };
  }

  function predictY(points, x) {
    var fit = linregress(points);
    if (!fit || fit.degenerate) return { refused: true, reason: 'no fit' };
    if (x < fit.minX || x > fit.maxX) {
      return { refused: true, reason: 'extrapolation', range: [fit.minX, fit.maxX] };
    }
    return { y: fit.slope * x + fit.intercept };
  }

  // ══════════════════════════════════════════════════════════════════════
  // THE COMPENDIUM + REACTIVE CLAIM GRAPH (design §4, §5 Pillar 1)
  // The compendium is the source of truth; claims are derived state that
  // depend on observation ids, so only claims touching a CHANGED observation
  // re-derive. Observation ids are sequential (deterministic — no Date/random).
  // ══════════════════════════════════════════════════════════════════════

  function makeCompendium(variable, unit) {
    return { variable: variable || 'value', unit: unit || 'units', observations: [], claims: [], _seq: 0, schemaVersion: 1 };
  }

  function addObservation(comp, obs) {
    comp._seq += 1;
    var id = 'o' + comp._seq;
    comp.observations.push({ id: id, x: obs.x, y: obs.y, phase: obs.phase == null ? null : obs.phase });
    return id;
  }

  // Returns the ids of claims whose dependencies intersect the changed set.
  function markDirty(comp, changedIds) {
    var changed = {};
    (changedIds || []).forEach(function (id) { changed[id] = true; });
    return comp.claims.filter(function (c) {
      return (c.dependsOn || []).some(function (id) { return changed[id]; });
    }).map(function (c) { return c.id; });
  }

  // ══════════════════════════════════════════════════════════════════════
  // THE PROVENANCE-BOUND CLAIM (design §3) + the prose-template invariant.
  // A trend claim is L1 (derived). It carries its full lineage; its sentence
  // ALWAYS leads with the level word and ALWAYS names the interval + n.
  // ══════════════════════════════════════════════════════════════════════

  function trendSentence(claim) {
    var e = claim.estimate;
    var word = levelWord(claim.level);
    var subset = (claim.shownOf.shown < claim.shownOf.total)
      ? ('across these ' + claim.shownOf.shown + ' of ' + claim.shownOf.total + ' probes, ')
      : '';
    var dir = e.slope > 0 ? 'rose' : (e.slope < 0 ? 'fell' : 'held flat');
    // INVARIANT: level word first, then the interval and n, in fixed order.
    return word + ': ' + subset + claim.variable + ' ' + dir + ' ~' + round2(Math.abs(e.slope)) +
      ' ' + claim.unit + ' per step (95% interval ' + signed(e.interval[0]) + ' to ' + signed(e.interval[1]) +
      '; n=' + e.n + (e.small ? ', small' : '') + ').';
  }

  function refusalSentence(claim) {
    // A refusal still leads with the level word and names n (no interval exists).
    return levelWord(claim.level) + ': n=' + claim.n +
      ' — too few points to estimate a trend; no line drawn (need at least ' + SMALL_N.refuseBelow + ').';
  }

  // Derive an L1 trend claim from the compendium (optionally over a subset of
  // observation ids — the rest are HIDDEN, and the omission self-declares).
  function deriveTrendClaim(comp, opts) {
    opts = opts || {};
    var obs = opts.obsIds
      ? comp.observations.filter(function (o) { return opts.obsIds.indexOf(o.id) >= 0; })
      : comp.observations.slice();
    var total = comp.observations.length;
    var shown = obs.length;
    var n = obs.length;
    var status = smallNStatus(n);
    var base = {
      id: opts.id || ('c' + (comp.claims.length + 1)),
      kind: 'trend',
      level: 'L1', // provenance: produced by Lumen's own deterministic math
      variable: comp.variable,
      unit: comp.unit,
      dependsOn: obs.map(function (o) { return o.id; }),
      shownOf: { shown: shown, total: total },
      n: n
    };
    if (status === 'refuse') {
      base.refused = true;
      base.estimate = null;
      base.text = refusalSentence(base);
      base._hash = cyrb53('refuse:' + n + ':' + shown + '/' + total);
      return base;
    }
    var points = obs.map(function (o) { return { x: o.x, y: o.y }; });
    var ci = slopeInterval(points);
    var boot = bootstrapSlopeCI(points, 1000, comp.variable + ':' + JSON.stringify(points));
    var fit = linregress(points);
    base.estimate = {
      slope: fit.slope, intercept: fit.intercept, r: fit.r, n: n,
      small: status === 'flag',
      interval: ci ? [ci.lo, ci.hi] : [null, null],
      df: ci ? ci.df : null,
      bootstrap: boot ? [boot.lo, boot.hi] : [null, null]
    };
    base.small = status === 'flag';
    base.text = trendSentence(base);
    base._hash = cyrb53(JSON.stringify({ e: base.estimate, s: base.shownOf }));
    return base;
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 1 — chart geometry + the screen-reader data-table peer (pure).
  // The SVG render and the data table read the SAME geometry/model, so the
  // visual chart and its accessible peer cannot disagree (design §9/§15).
  // ══════════════════════════════════════════════════════════════════════

  var REYNA_SAMPLE = [
    { x: 1, y: 42, phase: 'baseline' }, { x: 2, y: 45, phase: 'baseline' },
    { x: 3, y: 44, phase: 'baseline' }, { x: 4, y: 48, phase: 'baseline' },
    { x: 5, y: 47, phase: 'baseline' }, { x: 6, y: 53, phase: 'tier2' },
    { x: 7, y: 58, phase: 'tier2' }, { x: 8, y: 61, phase: 'tier2' },
    { x: 9, y: 60, phase: 'tier2' }, { x: 10, y: 66, phase: 'tier2' }
  ];

  var DEFAULT_BOX = { w: 480, h: 280, padL: 44, padR: 16, padT: 16, padB: 34 };

  function plotGeometry(observations, claim, box) {
    box = box || DEFAULT_BOX;
    var obs = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var n = obs.length;
    var innerW = box.w - box.padL - box.padR;
    var innerH = box.h - box.padT - box.padB;
    var xs = obs.map(function (o) { return o.x; });
    var ys = obs.map(function (o) { return o.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var padY = (maxY - minY) * 0.1 || 1;
    var y0 = minY - padY, y1 = maxY + padY;
    function sx(x) { return box.padL + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * innerW; }
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var points = obs.map(function (o) {
      return { x: o.x, y: o.y, phase: o.phase == null ? null : o.phase, sx: round1(sx(o.x)), sy: round1(sy(o.y)) };
    });
    var trendPath = null, bandPath = null;
    if (claim && claim.estimate) {
      var e = claim.estimate;
      var line = function (x) { return e.slope * x + e.intercept; };
      trendPath = 'M ' + round1(sx(minX)) + ',' + round1(sy(line(minX))) +
        ' L ' + round1(sx(maxX)) + ',' + round1(sy(line(maxX)));
      if (e.interval && e.interval[0] != null) {
        // The "plausible slope range" band: lines at the lo/hi slope through the
        // centroid. This is the STATISTICAL-uncertainty encoding (design §6.4),
        // rendered distinctly from any AI-level hatch.
        var mx = mean(xs), my = mean(ys);
        var lo = e.interval[0], hi = e.interval[1];
        var loAt = function (x) { return my + lo * (x - mx); };
        var hiAt = function (x) { return my + hi * (x - mx); };
        bandPath = 'M ' + round1(sx(minX)) + ',' + round1(sy(hiAt(minX))) +
          ' L ' + round1(sx(maxX)) + ',' + round1(sy(hiAt(maxX))) +
          ' L ' + round1(sx(maxX)) + ',' + round1(sy(loAt(maxX))) +
          ' L ' + round1(sx(minX)) + ',' + round1(sy(loAt(minX))) + ' Z';
      }
    }
    // Phase lines are HUMAN-SET (they come from the phase the user tagged each
    // observation with — never auto-inferred from timestamps, design §11).
    var phaseLines = [];
    for (var i = 1; i < n; i++) {
      if (obs[i].phase !== obs[i - 1].phase) {
        var bx = (obs[i].x + obs[i - 1].x) / 2;
        phaseLines.push({ x: round1(bx), sx: round1(sx(bx)), fromPhase: obs[i - 1].phase, toPhase: obs[i].phase });
      }
    }
    var xTicks = obs.map(function (o) { return { x: o.x, sx: round1(sx(o.x)) }; });
    var yTicks = [];
    for (var t = 0; t <= 4; t++) {
      var yv = y0 + (y1 - y0) * t / 4;
      yTicks.push({ y: round1(yv), sy: round1(sy(yv)) });
    }
    return {
      box: box, minX: minX, maxX: maxX, y0: round1(y0), y1: round1(y1),
      points: points, trendPath: trendPath, bandPath: bandPath,
      phaseLines: phaseLines, xTicks: xTicks, yTicks: yTicks
    };
  }

  function perSegmentSlopes(observations) {
    var byPhase = {};
    observations.forEach(function (o) {
      var k = o.phase == null ? '(none)' : o.phase;
      (byPhase[k] = byPhase[k] || []).push({ x: o.x, y: o.y });
    });
    return Object.keys(byPhase).map(function (k) {
      var fit = byPhase[k].length >= 2 ? linregress(byPhase[k]) : null;
      return { phase: k, n: byPhase[k].length, slope: (fit && !fit.degenerate) ? round2(fit.slope) : null };
    });
  }

  function chartSummaryText(observations, claim) {
    if (!claim || claim.refused) return 'Trend chart. ' + (claim ? claim.text : 'no data yet.');
    var parts = ['Trend chart.', claim.text];
    plotGeometry(observations, claim).phaseLines.forEach(function (p) {
      parts.push('A human-set phase line at week ' + p.x + ' divides ' +
        (p.fromPhase || 'the prior phase') + ' from ' + (p.toPhase || 'the next phase') + '.');
    });
    return parts.join(' ');
  }

  function dataTableModel(observations, claim) {
    var obs = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var word = levelWord(claim ? claim.level : 'L0');
    var columns = ['Week (x)', (claim ? claim.variable : 'value') + ' (y)', 'Phase', 'Level'];
    var rows = [];
    for (var i = 0; i < obs.length; i++) {
      if (i > 0 && obs[i].phase !== obs[i - 1].phase) {
        rows.push({ boundary: true, label: 'phase boundary: ' + (obs[i - 1].phase || 'prior') + ' → ' + (obs[i].phase || 'next') });
      }
      rows.push({ x: obs[i].x, y: obs[i].y, phase: obs[i].phase || '—', level: word });
    }
    return {
      columns: columns, rows: rows, perSegment: perSegmentSlopes(obs),
      summary: chartSummaryText(obs, claim), level: claim ? claim.level : 'L0'
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 1 — the AI-involvement layer (pure brains) + audience faces.
  // The AI never reaches render unvalidated: buildClaimContext() is the ONLY
  // (PII-free) thing sent to callGemini; lintL2() enforces "no new number" for
  // L2; validateHypotheses() enforces the L3 ranked-set rules; aiAllowed() is
  // the ceiling + hard n>=8 floor gate (design §6.1/§6.3/§6.6/§7). All pure.
  // ══════════════════════════════════════════════════════════════════════

  var AI_CAVEAT = 'AI-generated — verify yourself.';
  var HYP_CAVEAT = "the model's own ranking of its guesses, not a measured probability";
  var AI_N_FLOOR = 8; // no callGemini below n=8 (a small distinctive summary can re-identify)

  function levelIndex(level) { return LEVELS.indexOf(level); }

  function aiAllowed(ceiling, n) {
    if (levelIndex(ceiling) < 2) return { allowed: false, reason: 'AI is off below the L2 ceiling.' };
    if (n < AI_N_FLOOR) return { allowed: false, reason: 'Too few points (n<' + AI_N_FLOOR + ') to involve AI responsibly.' };
    return { allowed: true, reason: '' };
  }

  // The ONLY thing that crosses into callGemini: aggregated, PII-free numbers.
  // No names, no free text, no raw labelled rows (design §6.6).
  function buildClaimContext(comp, claim) {
    var e = claim && claim.estimate;
    var xs = comp.observations.map(function (o) { return o.x; });
    var ys = comp.observations.map(function (o) { return o.y; });
    return {
      variable: comp.variable, unit: comp.unit, n: claim ? claim.n : comp.observations.length,
      slope: e ? round2(e.slope) : null,
      interval: e ? [round2(e.interval[0]), round2(e.interval[1])] : null,
      r: e ? round2(e.r) : null,
      ciLevel: 95, // the confidence level is a method fact (every interval sentence says "95%"), not an invented figure
      xRange: [Math.min.apply(null, xs), Math.max.apply(null, xs)],
      yRange: [Math.min.apply(null, ys), Math.max.apply(null, ys)],
      phases: comp.observations.map(function (o) { return o.phase; })
        .filter(function (p, i, a) { return p != null && a.indexOf(p) === i; }),
      perSegment: perSegmentSlopes(comp.observations)
    };
  }

  function allowedNumbers(ctxObj) {
    var nums = [];
    function push(v) { if (typeof v === 'number' && isFinite(v)) nums.push(round2(v)); }
    push(ctxObj.n); push(ctxObj.slope); push(ctxObj.r); push(ctxObj.ciLevel);
    if (ctxObj.interval) { push(ctxObj.interval[0]); push(ctxObj.interval[1]); }
    (ctxObj.xRange || []).forEach(push); (ctxObj.yRange || []).forEach(push);
    (ctxObj.perSegment || []).forEach(function (s) { push(s.slope); push(s.n); });
    return nums;
  }

  // L2 guard: reject any numeric token in the AI reply that is not already a
  // fact (design §6.1 — "introduces no new NUMBER"). It catches invented
  // FIGURES, not invented relationships built from real numbers (the §6.1 caveat).
  function lintL2(text, ctxObj) {
    var allowed = allowedNumbers(ctxObj);
    var tol = 0.011;
    var toks = String(text).match(/-?\d+(?:\.\d+)?/g) || [];
    var offending = [];
    toks.forEach(function (t) {
      var v = round2(parseFloat(t));
      var ok = allowed.some(function (a) { return Math.abs(a - v) <= tol; });
      if (!ok) offending.push(v);
    });
    return { ok: offending.length === 0, offending: offending };
  }

  function rankBand(rank) { return rank <= 1 ? 'More likely' : (rank === 2 ? 'Plausible' : 'Less likely'); }

  // L3 guard: a ranked hypothesis SET, not a verdict. Must include >=1 non-effect
  // (rival/null) explanation; coarse ORDINAL bands, NEVER a percentage (§6.3).
  function validateHypotheses(arr) {
    var problems = [];
    if (!Array.isArray(arr) || !arr.length) problems.push('no hypotheses');
    var list = Array.isArray(arr) ? arr.slice(0, 4) : [];
    if (list.length && !list.some(function (hp) { return hp.kind === 'rival' || hp.kind === 'null'; })) {
      problems.push('no non-effect explanation (need >=1 rival/null)');
    }
    var hypotheses = list.map(function (hp, i) {
      var rank = hp.rank || (i + 1);
      return { text: String(hp.text || ''), kind: hp.kind || 'effect', rank: rank, band: rankBand(rank) };
    });
    return { ok: problems.length === 0, problems: problems, hypotheses: hypotheses, caveat: HYP_CAVEAT };
  }

  // Audience faces (design Pillar 3 / §15): the SAME claim, re-projected. The
  // FAMILY face must PRESERVE uncertainty (a bare growth arrow is the least
  // honest projection). No tier labels, no percentile, ever.
  function faceFor(claim, audience) {
    if (!claim) return '';
    if (claim.refused) {
      if (audience === 'family') return 'There are only ' + claim.n + ' check-ins so far — too few to call a direction yet.';
      return claim.text;
    }
    var e = claim.estimate;
    if (audience === 'iep-team') {
      return claim.text + ' (Ordinary least-squares trend; the interval is a 95% t-interval on the slope. Descriptive — not a percentile, score, or prediction.)';
    }
    if (audience === 'family') {
      var dir = e.slope > 0 ? 'went up' : (e.slope < 0 ? 'went down' : 'held steady');
      return 'Over ' + e.n + ' check-ins, ' + claim.variable + ' ' + dir + ' — about ' + round1(Math.abs(e.slope)) +
        ' ' + claim.unit + ' a week. With only ' + e.n + ' points the true rate could be roughly ' +
        round1(e.interval[0]) + ' to ' + round1(e.interval[1]) + ' a week, so read this as a direction, not an exact number.';
    }
    return claim.text; // 'working' (default)
  }

  var LumenCore = {
    version: 'phase1',
    // numerics
    round1: round1, round2: round2, signed: signed, cyrb53: cyrb53, mulberry32: mulberry32,
    // grammar / ladder
    LEVELS: LEVELS, GRAMMAR: GRAMMAR, DEFAULT_PALETTE: DEFAULT_PALETTE, OPACITY_FLOOR: OPACITY_FLOOR,
    encode: encode, levelWord: levelWord,
    // stats
    SMALL_N: SMALL_N, smallNStatus: smallNStatus, tCrit95: tCrit95, mean: mean,
    linregress: linregress, slopeInterval: slopeInterval, bootstrapSlopeCI: bootstrapSlopeCI, predictY: predictY,
    // compendium / reactive graph
    makeCompendium: makeCompendium, addObservation: addObservation, markDirty: markDirty,
    // claims / prose
    deriveTrendClaim: deriveTrendClaim, trendSentence: trendSentence, refusalSentence: refusalSentence,
    // chart geometry + SR data-table peer (Phase 1)
    REYNA_SAMPLE: REYNA_SAMPLE, DEFAULT_BOX: DEFAULT_BOX, plotGeometry: plotGeometry,
    perSegmentSlopes: perSegmentSlopes, chartSummaryText: chartSummaryText, dataTableModel: dataTableModel,
    // AI-involvement layer (Phase 1) — pure guards + audience faces
    AI_CAVEAT: AI_CAVEAT, HYP_CAVEAT: HYP_CAVEAT, AI_N_FLOOR: AI_N_FLOOR, levelIndex: levelIndex,
    aiAllowed: aiAllowed, buildClaimContext: buildClaimContext, allowedNumbers: allowedNumbers,
    lintL2: lintL2, rankBand: rankBand, validateHypotheses: validateHypotheses, faceFor: faceFor
  };

  // Dual export: Node/vitest (CommonJS) AND browser/Canvas (window global).
  if (typeof module !== 'undefined' && module.exports) { module.exports = LumenCore; }
  if (typeof window !== 'undefined') { window.LumenCore = LumenCore; }

  // ══════════════════════════════════════════════════════════════════════
  // Registration + render (guarded — runs only in a browser/Canvas/jsdom
  // context; importing the module in plain Node only exposes the pure core).
  // Phase 0 render is an honest placeholder: a VISIBLE fallback, never null,
  // stating the kernel is present and the UI arrives in Phase 1.
  // ══════════════════════════════════════════════════════════════════════

  if (typeof window !== 'undefined') {
    window.StemLab = window.StemLab || {
      _registry: {}, _order: [],
      registerTool: function (id, config) {
        config.id = id; config.ready = config.ready !== false;
        this._registry[id] = config;
        if (this._order.indexOf(id) < 0) this._order.push(id);
      }
    };

    if (typeof document !== 'undefined') {
      (function () {
        if (document.getElementById('allo-live-lumen')) return;
        var lr = document.createElement('div');
        lr.id = 'allo-live-lumen';
        lr.setAttribute('aria-live', 'polite');
        lr.setAttribute('aria-atomic', 'true');
        lr.setAttribute('role', 'status');
        lr.className = 'sr-only';
        document.body.appendChild(lr);
        // A separate, assertive region for the safety-critical AI/sign-off
        // message so a routine update can never clobber it (design §7/§15.5).
        var alert = document.createElement('div');
        alert.id = 'allo-live-lumen-alert';
        alert.setAttribute('aria-live', 'assertive');
        alert.setAttribute('aria-atomic', 'true');
        alert.setAttribute('role', 'alert');
        alert.className = 'sr-only';
        document.body.appendChild(alert);
      })();
    }

    window.StemLab.registerTool('lumen', {
      icon: '💡', // 💡
      label: 'Lumen',
      desc: 'A reactive research canvas: collect, analyze & present as one honest, provenance-bound object.',
      color: 'amber',
      category: 'data',
      ready: false, // Phase 0: kernel only; not yet a usable surface
      render: function (ctx) {
        var React = ctx && ctx.React;
        var h = React && React.createElement;
        if (!h) return null;
        try {
          var d = (ctx.toolData && ctx.toolData.lumen) || {};
          var upd = function (k, v) {
            if (ctx.update) ctx.update('lumen', k, v);
            else if (ctx.setToolData) ctx.setToolData(function (p) { p = p || {}; p.lumen = Object.assign({}, p.lumen); p.lumen[k] = v; return p; });
          };
          var announce = function (msg) {
            try { var el = document.getElementById('allo-live-lumen'); if (el) el.textContent = msg; } catch (e2) { }
            try { if (ctx.announceToSR) ctx.announceToSR(msg); } catch (e3) { }
          };
          var obs = Array.isArray(d.observations) ? d.observations : [];
          var ceiling = d.ceiling || 'L1';
          var audience = d.audience || 'working';
          var callGemini = (ctx.callGemini) || (typeof window !== 'undefined' && window.callGemini) || null;
          var parseJson = function (raw) {
            try {
              if (typeof raw !== 'string') return raw;
              var u = (typeof window !== 'undefined') && window.__alloUtils;
              var cleaned = (u && u.cleanJson) ? u.cleanJson(raw) : raw;
              return (u && u.safeJsonParse) ? u.safeJsonParse(cleaned) : JSON.parse(cleaned);
            } catch (eP) { return null; }
          };
          // At the default L1 ceiling NO callGemini fires — the trend is pure math.
          var comp = makeCompendium(d.variable || 'WCPM', d.unit || 'words/min');
          obs.forEach(function (o) { addObservation(comp, o); });
          var claim = obs.length ? deriveTrendClaim(comp, {}) : null;
          var bundle = encode('L1');
          // The AI fires ONLY on demand, ONLY over the PII-free context, and its
          // output is gated by the tested guards before it is ever shown (§6.1/§6.3).
          var fireAI = function () {
            if (!claim || claim.refused) return;
            if (!callGemini) { upd('aiError', 'No AI is available in this environment.'); return; }
            var aiCtx = buildClaimContext(comp, claim);
            upd('aiLoading', true); upd('aiError', '');
            if (levelIndex(ceiling) >= 3) {
              var p3 = 'You are given ONLY these aggregate, de-identified stats about one progress-monitoring trend. ' +
                'Propose 2 to 4 COMPETING explanations as JSON {"hypotheses":[{"text":"..","kind":"effect"|"rival"|"null","rank":1}]}. ' +
                'You MUST include at least one non-effect explanation (chance, regression to the mean, maturation, or measurement noise). ' +
                'Do NOT state any probability or percentage. Stats: ' + JSON.stringify(aiCtx);
              callGemini(p3, true, false, 0.7).then(function (resp) {
                var parsed = parseJson(resp);
                var v = validateHypotheses(parsed && parsed.hypotheses);
                if (v.ok) { upd('aiHyps', v.hypotheses); upd('aiText', ''); announce('AI proposed ' + v.hypotheses.length + ' competing explanations.'); }
                else { upd('aiHyps', null); upd('aiError', 'AI reading rejected (' + v.problems.join('; ') + '); showing data only.'); }
                upd('aiLoading', false);
              }).catch(function () { upd('aiError', 'AI request failed; showing data only.'); upd('aiLoading', false); });
            } else {
              var p2 = 'Re-word this finding into ONE friendly sentence for an educator. Use ONLY the numbers given; introduce NO new number. ' +
                'Return JSON {"text":".."}. Finding: ' + JSON.stringify(aiCtx);
              callGemini(p2, true, false, 0.2).then(function (resp) {
                var parsed = parseJson(resp);
                var t = parsed && parsed.text;
                var lint = lintL2(t || '', aiCtx);
                if (t && lint.ok) { upd('aiText', t); upd('aiHyps', null); announce('AI re-worded your numbers.'); }
                else { upd('aiText', ''); upd('aiError', 'AI re-word rejected' + (lint.offending.length ? (' (new number ' + lint.offending.join(', ') + ')') : '') + '; showing data only.'); }
                upd('aiLoading', false);
              }).catch(function () { upd('aiError', 'AI request failed; showing data only.'); upd('aiLoading', false); });
            }
          };
          var kids = [];

          kids.push(h('div', { key: 'hdr', className: 'flex items-center gap-2 flex-wrap' },
            h('span', { className: 'font-bold text-amber-800' }, '💡 Lumen'),
            h('span', { className: 'text-[11px] text-slate-500' }, comp.variable + ' (' + comp.unit + ')')
          ));
          // The AI-involvement dial (default L1 = zero callGemini) + the audience faces.
          var ceilBtn = function (lvl, label) {
            return h('button', {
              key: 'c' + lvl, 'aria-pressed': ceiling === lvl ? 'true' : 'false',
              className: (ceiling === lvl ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-300') + ' px-2 py-1 text-xs rounded border',
              onClick: function () { upd('ceiling', lvl); upd('aiError', ''); announce('AI ceiling set to ' + label + '.'); }
            }, label);
          };
          kids.push(h('div', { key: 'dial', className: 'mt-2 flex items-center gap-1 flex-wrap', role: 'group', 'aria-label': 'AI involvement ceiling' },
            h('span', { className: 'text-xs text-slate-500 mr-1' }, 'AI ceiling:'),
            ceilBtn('L1', 'L1 · Data only'), ceilBtn('L2', 'L2 · Assisted'), ceilBtn('L3', 'L3 · Interpretive')));
          var faceBtn = function (a, label) {
            return h('button', {
              key: 'f' + a, 'aria-pressed': audience === a ? 'true' : 'false',
              className: (audience === a ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-300') + ' px-2 py-1 text-xs rounded border',
              onClick: function () { upd('audience', a); }
            }, label);
          };
          kids.push(h('div', { key: 'faces', className: 'mt-1 flex items-center gap-1 flex-wrap', role: 'group', 'aria-label': 'Audience face' },
            h('span', { className: 'text-xs text-slate-500 mr-1' }, 'Audience:'),
            faceBtn('working', 'Working'), faceBtn('iep-team', 'IEP team'), faceBtn('family', 'Family')));

          if (!obs.length) {
            kids.push(h('p', { key: 'empty', className: 'mt-2 text-sm text-slate-600' },
              'No observations yet. Type a few points, or load a sample, to see an honestly-marked trend.'));
          }

          kids.push(h('div', { key: 'entry', className: 'mt-3 flex items-end gap-2 flex-wrap' },
            h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'Week (x)',
              h('input', { type: 'number', value: d.draftX == null ? '' : d.draftX, onChange: function (ev) { upd('draftX', ev.target.value); }, className: 'w-20 px-2 py-1 border rounded' })),
            h('label', { className: 'text-xs text-slate-600 flex flex-col' }, comp.variable + ' (y)',
              h('input', { type: 'number', value: d.draftY == null ? '' : d.draftY, onChange: function (ev) { upd('draftY', ev.target.value); }, className: 'w-24 px-2 py-1 border rounded' })),
            h('button', {
              className: 'px-3 py-1 text-sm font-semibold rounded bg-amber-600 text-white hover:bg-amber-500',
              onClick: function () {
                var x = parseFloat(d.draftX), y = parseFloat(d.draftY);
                if (isNaN(x) || isNaN(y)) { announce('Enter a numeric week and value.'); return; }
                var next = obs.concat([{ x: x, y: y, phase: d.draftPhase || null }]);
                upd('observations', next); upd('draftX', ''); upd('draftY', '');
                announce('Added week ' + x + ' equals ' + y + '. ' + next.length + ' observations.');
              }
            }, '+ Add'),
            h('button', {
              className: 'px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50',
              onClick: function () { upd('observations', REYNA_SAMPLE.slice()); announce('Loaded the Reyna ORF sample: 10 weekly probes across two phases.'); }
            }, 'Use sample (Reyna ORF)')
          ));

          if (claim) {
            kids.push(h('div', { key: 'claim', className: 'mt-3 p-2 rounded bg-white border border-slate-200' },
              h('div', { className: 'flex items-center gap-2 text-xs font-semibold text-slate-700' },
                h('span', { 'aria-hidden': 'true', style: { fontSize: '14px' } }, bundle.glyph),
                h('span', null, bundle.label)),
              h('p', { className: 'text-sm text-slate-800 mt-1' }, faceFor(claim, audience))));
          }

          var geo = (obs.length >= 2 && claim && !claim.refused) ? plotGeometry(obs, claim) : null;
          if (geo) {
            var b = geo.box, sk = [];
            geo.yTicks.forEach(function (t, i) {
              sk.push(h('line', { key: 'yg' + i, x1: b.padL, y1: t.sy, x2: b.w - b.padR, y2: t.sy, stroke: '#e2e8f0', strokeWidth: 1 }));
              sk.push(h('text', { key: 'yl' + i, x: b.padL - 4, y: t.sy + 3, textAnchor: 'end', style: { fontSize: '9px' }, fill: '#64748b' }, String(t.y)));
            });
            geo.xTicks.forEach(function (t, i) {
              sk.push(h('text', { key: 'xl' + i, x: t.sx, y: b.h - b.padB + 14, textAnchor: 'middle', style: { fontSize: '9px' }, fill: '#64748b' }, String(t.x)));
            });
            if (geo.bandPath) sk.push(h('path', { key: 'band', d: geo.bandPath, fill: bundle.ink, fillOpacity: 0.10, stroke: 'none' }));
            geo.phaseLines.forEach(function (p, i) {
              sk.push(h('line', { key: 'ph' + i, x1: p.sx, y1: b.padT, x2: p.sx, y2: b.h - b.padB, stroke: '#0f172a', strokeWidth: 1.5, strokeDasharray: '2 3' }));
              sk.push(h('text', { key: 'phl' + i, x: p.sx + 3, y: b.padT + 9, style: { fontSize: '8px' }, fill: '#0f172a' }, 'phase'));
            });
            if (geo.trendPath) sk.push(h('path', { key: 'trend', d: geo.trendPath, fill: 'none', stroke: bundle.ink, strokeWidth: 2, strokeOpacity: bundle.markOpacity, strokeDasharray: bundle.strokeDasharray === 'none' ? undefined : bundle.strokeDasharray }));
            geo.points.forEach(function (p, i) {
              sk.push(h('g', { key: 'pt' + i },
                h('circle', { cx: p.sx, cy: p.sy, r: 3.5, fill: bundle.ink, fillOpacity: bundle.markOpacity }),
                // the per-mark BURN: each mark carries its own level glyph at full opacity
                h('text', { x: p.sx + 4, y: p.sy - 4, style: { fontSize: '8px' }, fill: bundle.ink, fillOpacity: 1, 'aria-hidden': 'true' }, bundle.glyph)
              ));
            });
            kids.push(h('svg', {
              key: 'svg', viewBox: '0 0 ' + b.w + ' ' + b.h, className: 'w-full mt-3 bg-white rounded-lg border border-slate-200',
              role: 'img', 'aria-label': chartSummaryText(obs, claim)
            }, sk));
          }

          if (claim && !claim.refused) {
            var tbl = dataTableModel(obs, claim);
            kids.push(h('button', { key: 'tbtn', className: 'mt-2 text-xs underline text-slate-600', onClick: function () { upd('showTable', !d.showTable); } },
              d.showTable ? 'Hide data table' : 'Show data table (the chart as a table)'));
            if (d.showTable) {
              kids.push(h('table', { key: 'tbl', className: 'mt-2 text-xs border-collapse' },
                h('thead', null, h('tr', null, tbl.columns.map(function (c, i) { return h('th', { key: 'th' + i, className: 'border px-2 py-0.5 text-left bg-slate-50' }, c); }))),
                h('tbody', null, tbl.rows.map(function (r, i) {
                  if (r.boundary) return h('tr', { key: 'tr' + i }, h('td', { colSpan: 4, className: 'border px-2 py-0.5 italic text-slate-500' }, r.label));
                  return h('tr', { key: 'tr' + i },
                    h('td', { className: 'border px-2 py-0.5' }, String(r.x)),
                    h('td', { className: 'border px-2 py-0.5' }, String(r.y)),
                    h('td', { className: 'border px-2 py-0.5' }, String(r.phase)),
                    h('td', { className: 'border px-2 py-0.5' }, r.level));
                }))));
            }
          }

          // The AI section — only at the L2/L3 ceiling, only when the n-floor gate allows.
          if (claim && !claim.refused && levelIndex(ceiling) >= 2) {
            var gate = aiAllowed(ceiling, claim.n);
            if (!gate.allowed) {
              kids.push(h('div', { key: 'aigate', className: 'mt-3 text-xs italic text-slate-500' }, gate.reason));
            } else {
              kids.push(h('div', { key: 'aibar', className: 'mt-3 flex items-center gap-2 flex-wrap' },
                h('button', { className: 'px-3 py-1 text-sm rounded bg-violet-600 text-white hover:bg-violet-500', onClick: fireAI },
                  d.aiLoading ? 'Thinking…' : (levelIndex(ceiling) >= 3 ? 'Generate AI reading (hypotheses)' : 'Generate AI re-word')),
                h('span', { className: 'text-[10px] text-slate-500' }, encode(levelIndex(ceiling) >= 3 ? 'L3' : 'L2').label + ' · ' + AI_CAVEAT)));
              if (d.aiError) kids.push(h('div', { key: 'aierr', className: 'mt-1 text-xs italic text-slate-500' }, d.aiError));
              if (levelIndex(ceiling) >= 3 && Array.isArray(d.aiHyps) && d.aiHyps.length) {
                var l3 = encode('L3');
                kids.push(h('div', { key: 'aihyps', className: 'mt-2 p-2 rounded border', style: { borderColor: l3.ink, background: '#fffbeb' } },
                  h('div', { className: 'flex items-center gap-2 text-xs font-semibold', style: { color: l3.ink } },
                    h('span', { 'aria-hidden': 'true' }, l3.glyph), h('span', null, l3.label + ' · ranked hypotheses')),
                  h('ul', { className: 'mt-1 text-sm' }, d.aiHyps.map(function (hp, i) {
                    return h('li', { key: 'hp' + i, className: 'flex gap-2', style: { opacity: hp.rank <= 1 ? 1 : (hp.rank === 2 ? 0.85 : 0.7) } },
                      h('span', { className: 'font-semibold text-xs', style: { color: l3.ink } }, hp.band),
                      h('span', null, hp.text + (hp.kind !== 'effect' ? ' (' + hp.kind + ')' : '')));
                  })),
                  h('p', { className: 'mt-1 text-[10px] text-slate-500' }, HYP_CAVEAT + '. Regenerates each run. Export needs your sign-off.')));
              }
              if (levelIndex(ceiling) < 3 && d.aiText) {
                var l2 = encode('L2');
                kids.push(h('div', { key: 'aitext', className: 'mt-2 p-2 rounded border border-slate-200 bg-white' },
                  h('div', { className: 'flex items-center gap-2 text-xs font-semibold text-slate-600' },
                    h('span', { 'aria-hidden': 'true' }, l2.glyph), h('span', null, l2.label)),
                  h('p', { className: 'text-sm mt-1' }, d.aiText),
                  h('p', { className: 'mt-1 text-[10px] text-slate-500' }, AI_CAVEAT)));
              }
            }
          }

          kids.push(h('p', { key: 'foot', className: 'mt-3 text-[10px] text-slate-400' },
            'Phase 1 — default L1 fires zero AI. Dial up to L2/L3 for AI (gated, marked, verify-yourself). Export + sign-off arrive next. docs/lumen_design.md.'));

          return h('div', { className: 'p-4 rounded-xl bg-amber-50 border border-amber-200 text-slate-800' }, kids);
        } catch (e) {
          // The host renderTool returns null on throw (the blank-tool bug class):
          // always hand back a VISIBLE fallback instead.
          return h('div', { className: 'p-4 text-red-700' }, 'Lumen could not render: ' + (e && e.message));
        }
      }
    });
  }
})();
