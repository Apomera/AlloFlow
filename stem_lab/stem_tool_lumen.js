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

  // Sourced provenance (design §16): a FOURTH, ORTHOGONAL origin — deliberately kept
  // OUT of LEVELS so the AI dial / maxLevel math can never touch a benchmark.
  GRAMMAR.SRC = { label: 'Sourced — verified', glyph: '▣', opacity: 1.00, dash: '2 4', texture: 'reference', caution: false, reference: true };
  GRAMMAR['SRC-U'] = { label: 'Sourced — AI-retrieved, UNVERIFIED — check the source', glyph: '▢', opacity: 1.00, dash: '1 4', texture: 'reference', caution: false, reference: true };
  DEFAULT_PALETTE.reference = '#0e7490'; // reserved teal — NOT student ink, NOT L3 amber

  // The WCAG opacity floor: 0.38-ish ink on white fails 1.4.11, so any mark
  // that must remain legible is clamped to >= 0.6 (design §6.4).
  var OPACITY_FLOOR = 0.6;

  // Categorical palette for MULTI-SERIES lines — distinct hues chosen to NOT collide with the L3
  // caution amber (pal.caution) or the SRC reference teal (pal.reference); color is a convenience,
  // the LEGEND label + the SR table are the non-color channel (so it survives colour-blindness).
  var SERIES_PALETTE = ['#1d4ed8', '#be123c', '#7c3aed', '#15803d', '#db2777', '#4338ca'];
  function seriesColor(idx) { return SERIES_PALETTE[((idx % SERIES_PALETTE.length) + SERIES_PALETTE.length) % SERIES_PALETTE.length]; }
  // Guard (mirrors referenceContrastOK): no series colour may equal the caution/reference/neutral ink,
  // and all series colours must be mutually distinct — so a series line can never read as the L3 signal.
  function seriesColorOK(palette) {
    var p = palette || DEFAULT_PALETTE;
    var reserved = [p.caution, p.reference, p.neutral, p.line];
    var seen = {};
    for (var i = 0; i < SERIES_PALETTE.length; i++) {
      var c = SERIES_PALETTE[i];
      if (reserved.indexOf(c) !== -1) return false;
      if (seen[c]) return false;
      seen[c] = true;
    }
    return true;
  }

  function encode(level, palette) {
    var g = GRAMMAR[level];
    if (!g) throw new Error('encode: unknown level ' + level);
    var pal = palette || DEFAULT_PALETTE;
    var bundle = {
      level: level,
      label: g.label,
      srWord: g.label,
      glyph: g.glyph,
      markOpacity: Math.max(g.opacity, OPACITY_FLOOR), // rank-only, floored for legibility
      labelOpacity: 1.0,                               // the level WORD never fades
      strokeDasharray: g.dash,
      texture: g.texture,
      // amber ONLY at L3; reference teal for SRC; otherwise neutral ink. Last, redundant channel.
      ink: g.caution ? pal.caution : (g.reference ? pal.reference : pal.neutral),
      caution: g.caution
    };
    if (g.reference) bundle.isReference = true; // §16: a Sourced benchmark draws a line, not a dot
    return bundle;
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

  // Deterministic percentile bootstrap of the correlation r (seed = hash of the pairs),
  // for the association claim's interval. Same reproducible-resample contract as the slope CI.
  function bootstrapRCI(points, B, seedStr) {
    B = B || 1000;
    var n = points.length;
    if (n < 3) return null;
    var rng = mulberry32(cyrb53(seedStr || JSON.stringify(points)) >>> 0);
    var rs = [];
    for (var b = 0; b < B; b++) {
      var sample = [];
      for (var i = 0; i < n; i++) sample.push(points[(rng() * n) | 0]);
      var fit = linregress(sample);
      if (fit && !fit.degenerate && fit.r != null) rs.push(fit.r);
    }
    if (rs.length < 2) return null;
    rs.sort(function (a, c) { return a - c; });
    function pct(p) { var idx = Math.min(rs.length - 1, Math.max(0, Math.round(p * (rs.length - 1)))); return rs[idx]; }
    return { lo: pct(0.025), hi: pct(0.975), B: B, kept: rs.length };
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

  function makeCompendium(variable, unit, meta) {
    meta = meta || {};
    return {
      variable: variable || 'value', unit: unit || 'units',
      observations: [], claims: [], _seq: 0,
      // §16: external benchmarks live HERE — never pushed into observations.
      sourceRefs: [], _srcSeq: 0,
      measure: meta.measure || null, grade: meta.grade == null ? null : meta.grade, seasonWindow: meta.seasonWindow || null,
      // 2nd-variable / multi-series extension — all OPTIONAL, null by default. comp.variable/comp.unit
      // always stay the SINGULAR primary y; variable2/unit2 label the paired 2nd measure (scatter).
      // A single-var compendium stays schemaVersion 2; only a multi-var one bumps to 3.
      variable2: meta.variable2 || null, unit2: meta.unit2 || null, seriesLabels: meta.seriesLabels || null,
      schemaVersion: (meta.variable2 || meta.seriesLabels) ? 3 : 2
    };
  }

  function addObservation(comp, obs) {
    comp._seq += 1;
    var id = 'o' + comp._seq;
    // CONDITIONAL SPREAD is load-bearing for byte-identity: y2/series are written ONLY when supplied,
    // never as `y2: undefined`, so a legacy {id,x,y,phase} row serializes byte-identically and the
    // pinned single-var tests/snapshots re-pass with NO re-baseline. y2 = paired 2nd value (scatter);
    // series = a CATEGORY tag (multi-series line / grouped-bar) — NOT a person (multi-subject is out of scope).
    comp.observations.push(Object.assign(
      { id: id, x: obs.x, y: obs.y, phase: obs.phase == null ? null : obs.phase },
      (obs.y2 != null ? { y2: obs.y2 } : {}),
      (obs.series != null ? { series: String(obs.series) } : {})
    ));
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
    // A per-series claim leads with its series LABEL; the primary trend leads with the variable (unchanged).
    var subject = claim.seriesLabel ? (claim.seriesLabel + ' ' + claim.variable) : claim.variable;
    // INVARIANT: level word first, then the interval and n, in fixed order.
    return word + ': ' + subset + subject + ' ' + dir + ' ~' + round2(Math.abs(e.slope)) +
      ' ' + claim.unit + ' per step (95% interval ' + signed(e.interval[0]) + ' to ' + signed(e.interval[1]) +
      '; n=' + e.n + (e.small ? ', small' : '') + ').';
  }

  function refusalSentence(claim) {
    // A refusal still leads with the level word and names n (no interval exists). A per-series refusal
    // names its series so it cannot hide behind another series' line (anti-cherry-pick).
    var lead = claim.seriesLabel ? (claim.seriesLabel + ', n=' + claim.n) : ('n=' + claim.n);
    return levelWord(claim.level) + ': ' + lead +
      ' — too few points to estimate a trend; no line drawn (need at least ' + SMALL_N.refuseBelow + ').';
  }

  // Derive an L1 trend claim from the compendium (optionally over a subset of
  // observation ids — the rest are HIDDEN, and the omission self-declares).
  function deriveTrendClaim(comp, opts) {
    opts = opts || {};
    // opts.series filters to ONE series (multi-series line); each series is its OWN claim with its OWN
    // n / interval / refusal (never a pooled multi-slope). With no series, the pool IS comp.observations,
    // so the primary trend claim is byte-identical to before.
    var pool = opts.series != null ? comp.observations.filter(function (o) { return o.series === opts.series; }) : comp.observations;
    var obs = opts.obsIds
      ? pool.filter(function (o) { return opts.obsIds.indexOf(o.id) >= 0; })
      : pool.slice();
    var total = pool.length;
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
    // seriesKey/seriesLabel are added ONLY for a per-series claim and are EXCLUDED from _hash (which hashes
    // estimate + shownOf), so the primary trend's claim shape + _hash stay byte-identical.
    if (opts.series != null) {
      base.seriesKey = opts.series;
      base.seriesLabel = (comp.seriesLabels && comp.seriesLabels[opts.series]) || opts.series;
    }
    if (status === 'refuse') {
      base.refused = true;
      base.estimate = null;
      base.text = refusalSentence(base);
      base._hash = cyrb53('refuse:' + n + ':' + shown + '/' + total);
      return base;
    }
    var points = obs.map(function (o) { return { x: o.x, y: o.y }; });
    var ci = slopeInterval(points);
    // Per-series seed includes the series key so two series with identical points still get distinct
    // (reproducible) bootstrap intervals; the primary (no-series) seed is unchanged => byte-identical.
    var seedPrefix = comp.variable + (opts.series != null ? (':' + opts.series) : '') + ':';
    var boot = bootstrapSlopeCI(points, 1000, seedPrefix + JSON.stringify(points));
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
  // THE ASSOCIATION CLAIM (2nd-variable / scatter) — correlation, NOT causation.
  // An L1 claim over rows that carry BOTH the primary y and a paired y2. r is
  // Pearson's from linregress; the interval is the deterministic r-bootstrap.
  // The not-causation + confound caveat is a NON-OPTIONAL substring of .text
  // (built inline, like the level word) so it survives a plain-text copy. There
  // is deliberately NO uncertainty band on a scatter (a band over-claims a model).
  // ══════════════════════════════════════════════════════════════════════

  function associationSentence(claim) {
    var e = claim.estimate;
    var word = levelWord(claim.level);
    var subset = (claim.shownOf.shown < claim.shownOf.total)
      ? ('across these ' + claim.shownOf.shown + ' of ' + claim.shownOf.total + ' paired probes, ')
      : '';
    // INVARIANT: level word first, then r + interval + n; the not-causation caveat ALWAYS trails.
    return word + ': ' + subset + claim.variable + ' and ' + claim.variable2 +
      ' move together (Pearson r=' + signed(e.r) + '; 95% interval ' + signed(e.rInterval[0]) + ' to ' + signed(e.rInterval[1]) +
      '; n=' + e.n + (e.small ? ', small' : '') + '). This is association, not causation; an unmeasured third factor may drive both.';
  }

  // Derive an L1 association claim between the primary y and the paired y2. Pairwise-complete:
  // shownOf.total = rows that COULD pair (have y), shown = rows with BOTH — so dropped rows self-declare.
  function deriveAssociationClaim(comp, opts) {
    opts = opts || {};
    var withY = comp.observations.filter(function (o) { return o.y != null; });
    var pairs = withY.filter(function (o) { return o.y2 != null; });
    var total = withY.length, shown = pairs.length, n = pairs.length;
    var status = smallNStatus(n);
    var base = {
      id: opts.id || ('c' + (comp.claims.length + 1)),
      kind: 'association',
      level: 'L1', // provenance: Lumen's own deterministic correlation math
      variable: comp.variable, unit: comp.unit,
      variable2: comp.variable2 || (comp.variable + '₂'), unit2: comp.unit2 || comp.unit,
      dependsOn: pairs.map(function (o) { return o.id; }),
      shownOf: { shown: shown, total: total },
      n: n
    };
    if (status === 'refuse') {
      base.refused = true;
      base.estimate = null;
      base.text = levelWord(base.level) + ': n=' + n + ' paired points — too few to estimate an association; ' +
        'no correlation reported (need at least ' + SMALL_N.refuseBelow + ').';
      base._hash = cyrb53('assoc-refuse:' + n + ':' + shown + '/' + total);
      return base;
    }
    var pts = pairs.map(function (o) { return { x: o.y, y: o.y2 }; }); // x-axis = primary measure, y-axis = 2nd
    var fit = linregress(pts);
    var deg = !fit || fit.degenerate;
    var rci = bootstrapRCI(pts, 1000, base.variable2 + '~' + comp.variable + ':' + JSON.stringify(pts));
    base.estimate = {
      r: deg ? 0 : round2(fit.r),
      rInterval: rci ? [round2(rci.lo), round2(rci.hi)] : [null, null],
      slope: deg ? null : fit.slope, intercept: deg ? null : fit.intercept,
      n: n, small: status === 'flag'
    };
    base.small = status === 'flag';
    base.caveat = 'This is association, not causation; an unmeasured third factor may drive both.';
    base.text = associationSentence(base);
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

  // A PAIRED sample (each probe carries a 2nd measure y2) for the scatter pathway:
  // WCPM (y) vs reading-comprehension % (y2). Two MEASURES of one student — not two students.
  var PAIRED_SAMPLE = [
    { x: 1, y: 42, phase: 'baseline', y2: 55 }, { x: 2, y: 45, phase: 'baseline', y2: 58 },
    { x: 3, y: 44, phase: 'baseline', y2: 56 }, { x: 4, y: 48, phase: 'baseline', y2: 62 },
    { x: 5, y: 47, phase: 'baseline', y2: 60 }, { x: 6, y: 53, phase: 'tier2', y2: 66 },
    { x: 7, y: 58, phase: 'tier2', y2: 71 }, { x: 8, y: 61, phase: 'tier2', y2: 73 },
    { x: 9, y: 60, phase: 'tier2', y2: 72 }, { x: 10, y: 66, phase: 'tier2', y2: 79 }
  ];

  // A MULTI-SERIES sample — ONE student, ONE measure (WCPM), TWO CONDITIONS (cold vs practiced read)
  // on a shared axis. series is a CATEGORY/condition, never a different student or a different unit.
  var MULTI_SAMPLE = [
    { x: 1, y: 40, phase: 'baseline', series: 'cold' }, { x: 1, y: 52, phase: 'baseline', series: 'practiced' },
    { x: 2, y: 43, phase: 'baseline', series: 'cold' }, { x: 2, y: 55, phase: 'baseline', series: 'practiced' },
    { x: 3, y: 45, phase: 'baseline', series: 'cold' }, { x: 3, y: 57, phase: 'baseline', series: 'practiced' },
    { x: 4, y: 48, phase: 'baseline', series: 'cold' }, { x: 4, y: 60, phase: 'baseline', series: 'practiced' },
    { x: 5, y: 52, phase: 'tier2', series: 'cold' }, { x: 5, y: 65, phase: 'tier2', series: 'practiced' },
    { x: 6, y: 55, phase: 'tier2', series: 'cold' }, { x: 6, y: 69, phase: 'tier2', series: 'practiced' },
    { x: 7, y: 59, phase: 'tier2', series: 'cold' }, { x: 7, y: 72, phase: 'tier2', series: 'practiced' },
    { x: 8, y: 62, phase: 'tier2', series: 'cold' }, { x: 8, y: 76, phase: 'tier2', series: 'practiced' }
  ];

  // Sorted-unique series tags present in the data ([] => the legacy single-series world).
  // Drives the multi-series / grouped-bar fan-out (Phase 2/3) and the <=1 byte-identity delegation.
  function seriesKeys(observations) {
    var set = {};
    (observations || []).forEach(function (o) { if (o.series != null) set[o.series] = true; });
    return Object.keys(set).sort();
  }

  var DEFAULT_BOX = { w: 480, h: 280, padL: 44, padR: 16, padT: 16, padB: 34 };

  // A second chart pathway — a bar per observation (each an L0 OBSERVED mark) on a
  // shared baseline so heights are honest. Same axes / phase line / benchmark
  // reference line / SR peer as the trend. plotGeometry dispatches here on chartType='bar'.
  function barGeometry(observations, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var obs = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var n = obs.length;
    var innerW = box.w - box.padL - box.padR;
    var innerH = box.h - box.padT - box.padB;
    var xs = obs.map(function (o) { return o.x; });
    var ys = obs.map(function (o) { return o.y; });
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; });
    var refVals = refs.map(function (r) { return r.value; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    // Baseline includes 0 so a bar's height is proportional to its value (no truncated-axis lie).
    var minY = Math.min.apply(null, ys.concat(refVals).concat([0]));
    var maxY = Math.max.apply(null, ys.concat(refVals));
    var padY = (maxY - minY) * 0.1 || 1;
    var y0 = minY, y1 = maxY + padY;
    function sx(x) { return box.padL + (maxX === minX ? 0.5 : (x - minX) / (maxX - minX)) * innerW; }
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var baseline = round1(sy(y0));
    var slot = n > 1 ? innerW / (n - 1) : innerW;
    var bw = Math.max(4, Math.min(40, slot * 0.6));
    var bars = obs.map(function (o) {
      var cx = sx(o.x), top = sy(o.y);
      return {
        x: o.x, y: o.y, phase: o.phase == null ? null : o.phase, level: 'L0',
        cx: round1(cx), bx: round1(cx - bw / 2), bw: round1(bw), by: round1(top), bh: round1(baseline - top)
      };
    });
    var phaseLines = [];
    for (var i = 1; i < n; i++) {
      if (obs[i].phase !== obs[i - 1].phase) {
        var px = (obs[i].x + obs[i - 1].x) / 2;
        phaseLines.push({ x: round1(px), sx: round1(sx(px)), fromPhase: obs[i - 1].phase, toPhase: obs[i].phase });
      }
    }
    var xTicks = obs.map(function (o) { return { x: o.x, sx: round1(sx(o.x)) }; });
    var yTicks = [];
    for (var t = 0; t <= 4; t++) { var yv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yv), sy: round1(sy(yv)) }); }
    var out = { box: box, chartType: 'bar', minX: minX, maxX: maxX, y0: round1(y0), y1: round1(y1), baseline: baseline, bars: bars, phaseLines: phaseLines, xTicks: xTicks, yTicks: yTicks };
    if (refs.length) {
      out.refLines = refs.map(function (r) {
        var ry = round1(sy(r.value));
        return { id: r.id, value: r.value, sy: ry, dPath: 'M ' + box.padL + ',' + ry + ' L ' + (box.w - box.padR) + ',' + ry, label: benchmarkChipText(r), verified: r.verified === true };
      });
    }
    return out;
  }

  // Five-number summary (linear-interpolation quantiles) — the honest spread stat.
  function quantiles(values) {
    var v = values.slice().sort(function (a, b) { return a - b; });
    var k = v.length;
    if (!k) return null;
    function q(p) { var idx = p * (k - 1), lo = Math.floor(idx), hi = Math.ceil(idx); return v[lo] + (v[hi] - v[lo]) * (idx - lo); }
    var q1 = q(0.25), median = q(0.5), q3 = q(0.75);
    return { min: v[0], q1: q1, median: median, q3: q3, max: v[k - 1], iqr: q3 - q1, n: k };
  }

  // Dot/strip pathway — every observation as an L0 OBSERVED point (no connecting
  // line); ideal for small-n honesty. Shares the trend's y=value axis.
  function dotGeometry(observations, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var obs = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var n = obs.length, innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var xs = obs.map(function (o) { return o.x; }), ys = obs.map(function (o) { return o.y; });
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; }), refVals = refs.map(function (r) { return r.value; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys.concat(refVals)), maxY = Math.max.apply(null, ys.concat(refVals));
    var padY = (maxY - minY) * 0.1 || 1, y0 = minY - padY, y1 = maxY + padY;
    function sx(x) { return box.padL + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * innerW; }
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var dots = obs.map(function (o) { return { x: o.x, y: o.y, phase: o.phase == null ? null : o.phase, level: 'L0', sx: round1(sx(o.x)), sy: round1(sy(o.y)) }; });
    var phaseLines = [];
    for (var i = 1; i < n; i++) { if (obs[i].phase !== obs[i - 1].phase) { var px = (obs[i].x + obs[i - 1].x) / 2; phaseLines.push({ x: round1(px), sx: round1(sx(px)), fromPhase: obs[i - 1].phase, toPhase: obs[i].phase }); } }
    var xTicks = obs.map(function (o) { return { x: o.x, sx: round1(sx(o.x)) }; });
    var yTicks = []; for (var t = 0; t <= 4; t++) { var yv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yv), sy: round1(sy(yv)) }); }
    var out = { box: box, chartType: 'dot', minX: minX, maxX: maxX, y0: round1(y0), y1: round1(y1), dots: dots, phaseLines: phaseLines, xTicks: xTicks, yTicks: yTicks };
    if (refs.length) { out.refLines = refs.map(function (r) { var ry = round1(sy(r.value)); return { id: r.id, value: r.value, sy: ry, dPath: 'M ' + box.padL + ',' + ry + ' L ' + (box.w - box.padR) + ',' + ry, label: benchmarkChipText(r), verified: r.verified === true }; }); }
    return out;
  }

  // Box pathway — a five-number summary box+whisker PER PHASE (shows spread, the
  // honest complement to a single trend line). x = phase, y = value.
  function boxGeometry(observations, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var groups = [], gmap = {};
    observations.forEach(function (o) { var key = o.phase == null ? '(all)' : o.phase; if (!gmap[key]) { gmap[key] = { phase: key, vals: [] }; groups.push(gmap[key]); } gmap[key].vals.push(o.y); });
    var allY = observations.map(function (o) { return o.y; });
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; }), refVals = refs.map(function (r) { return r.value; });
    var minY = Math.min.apply(null, allY.concat(refVals)), maxY = Math.max.apply(null, allY.concat(refVals));
    var padY = (maxY - minY) * 0.1 || 1, y0 = minY - padY, y1 = maxY + padY;
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var ng = groups.length, slotW = innerW / ng;
    var boxes = groups.map(function (g, i) {
      var qn = quantiles(g.vals), center = box.padL + slotW * (i + 0.5), bw = Math.min(48, slotW * 0.5);
      return { phase: g.phase, n: qn.n, level: 'L0', min: round2(qn.min), q1: round2(qn.q1), median: round2(qn.median), q3: round2(qn.q3), max: round2(qn.max), iqr: round2(qn.iqr), cx: round1(center), bw: round1(bw), syMin: round1(sy(qn.min)), syQ1: round1(sy(qn.q1)), syMed: round1(sy(qn.median)), syQ3: round1(sy(qn.q3)), syMax: round1(sy(qn.max)) };
    });
    var xTicks = boxes.map(function (b) { return { label: b.phase, sx: b.cx }; });
    var yTicks = []; for (var t = 0; t <= 4; t++) { var yv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yv), sy: round1(sy(yv)) }); }
    var out = { box: box, chartType: 'box', y0: round1(y0), y1: round1(y1), boxes: boxes, xTicks: xTicks, yTicks: yTicks };
    if (refs.length) { out.refLines = refs.map(function (r) { var ry = round1(sy(r.value)); return { id: r.id, value: r.value, sy: ry, dPath: 'M ' + box.padL + ',' + ry + ' L ' + (box.w - box.padR) + ',' + ry, label: benchmarkChipText(r), verified: r.verified === true }; }); }
    return out;
  }

  // Equal-width binning of the VALUES (Sturges-ish: ~sqrt(n) bins, clamped 4..12).
  function histogramBins(values, k) {
    var n = values.length;
    k = k || Math.max(4, Math.min(12, Math.ceil(Math.sqrt(n || 1))));
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var width = (max - min) / k || 1;
    var bins = [];
    for (var i = 0; i < k; i++) bins.push({ lo: min + i * width, hi: min + (i + 1) * width, count: 0 });
    values.forEach(function (val) {
      var bi = Math.floor((val - min) / width);
      if (bi >= k) bi = k - 1; if (bi < 0) bi = 0;
      bins[bi].count++;
    });
    return { bins: bins, width: width, min: min, max: max, k: k };
  }

  // Histogram pathway — distribution of the VALUES (x = value bins, y = count).
  // Different axis semantics from trend/bar, so the benchmark reference line is
  // VERTICAL (drawn at the benchmark value on the x=value axis). L0 observed.
  function histogramGeometry(observations, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var ys = observations.map(function (o) { return o.y; });
    var hb = histogramBins(ys);
    var innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var maxCount = Math.max.apply(null, hb.bins.map(function (b) { return b.count; }).concat([1]));
    // §16: only RENDERABLE benchmarks participate. The value AXIS extends to include any benchmark
    // so its vertical line stays on-canvas (matching the time-series charts), while the BINS stay
    // computed over the observed data only — a benchmark never invents a bin or shifts the histogram.
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; });
    var refVals = refs.map(function (r) { return r.value; });
    var domMin = Math.min.apply(null, [hb.min].concat(refVals));
    var domMax = Math.max.apply(null, [hb.max].concat(refVals));
    function vx(val) { return box.padL + (domMax === domMin ? 0 : (val - domMin) / (domMax - domMin)) * innerW; }
    function cy(c) { return box.padT + innerH - (maxCount === 0 ? 0 : c / maxCount) * innerH; }
    var baseline = round1(box.padT + innerH);
    var bins = hb.bins.map(function (bn) {
      var x0 = vx(bn.lo), x1 = vx(bn.hi), top = cy(bn.count);
      return { lo: round2(bn.lo), hi: round2(bn.hi), count: bn.count, level: 'L0', bx: round1(x0 + 1), bw: round1(Math.max(2, x1 - x0 - 2)), by: round1(top), bh: round1(baseline - top) };
    });
    var xTicks = []; for (var i = 0; i <= hb.k; i++) { var val = hb.min + i * hb.width; xTicks.push({ value: round1(val), sx: round1(vx(val)) }); }
    var yTicks = []; var steps = Math.min(4, maxCount); for (var t = 0; t <= steps; t++) { var c = Math.round(maxCount * t / (steps || 1)); yTicks.push({ count: c, sy: round1(cy(c)) }); }
    var out = { box: box, chartType: 'histogram', min: round2(hb.min), max: round2(hb.max), maxCount: maxCount, baseline: baseline, bins: bins, xTicks: xTicks, yTicks: yTicks };
    if (refs.length) {
      out.refLines = refs.map(function (r) {
        var rx = round1(vx(r.value));
        return { id: r.id, value: r.value, vertical: true, sx: rx, dPath: 'M ' + rx + ',' + box.padT + ' L ' + rx + ',' + baseline, label: benchmarkChipText(r), verified: r.verified === true };
      });
    }
    return out;
  }

  // Scatter pathway — a genuine 2nd-VARIABLE plot: each point is (primary y, paired y2) of the SAME
  // row, so x-axis = the primary measure and y-axis = the 2nd measure (NOT time/week). L0 observed
  // pairs; an OPTIONAL L1 line of best fit is drawn only when an association claim is supplied. No
  // benchmark overlay (the two axes are two student measures, not a normed scale — deferred).
  function scatterGeometry(observations, claim, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var pairs = (observations || []).filter(function (o) { return o.y != null && o.y2 != null; });
    var innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var xv = pairs.map(function (o) { return o.y; }), yv = pairs.map(function (o) { return o.y2; });
    var minX = Math.min.apply(null, xv), maxX = Math.max.apply(null, xv);
    var minY = Math.min.apply(null, yv), maxY = Math.max.apply(null, yv);
    var padX = (maxX - minX) * 0.08 || 1, padY = (maxY - minY) * 0.1 || 1;
    var xa = minX - padX, xb = maxX + padX, y0 = minY - padY, y1 = maxY + padY;
    function sx(v) { return box.padL + (xb === xa ? 0 : (v - xa) / (xb - xa)) * innerW; }
    function sy(v) { return box.padT + innerH - (y1 === y0 ? 0 : (v - y0) / (y1 - y0)) * innerH; }
    var scatterPoints = pairs.map(function (o) { return { x: o.y, y: o.y2, phase: o.phase == null ? null : o.phase, level: 'L0', sx: round1(sx(o.y)), sy: round1(sy(o.y2)) }; });
    var fitPath = null;
    if (claim && claim.estimate && claim.estimate.slope != null) {
      var m = claim.estimate.slope, bI = claim.estimate.intercept;
      fitPath = 'M ' + round1(sx(minX)) + ',' + round1(sy(m * minX + bI)) + ' L ' + round1(sx(maxX)) + ',' + round1(sy(m * maxX + bI));
    }
    var xTicks = []; for (var i = 0; i <= 4; i++) { var xvv = xa + (xb - xa) * i / 4; xTicks.push({ value: round1(xvv), sx: round1(sx(xvv)) }); }
    var yTicks = []; for (var t = 0; t <= 4; t++) { var yvv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yvv), sy: round1(sy(yvv)) }); }
    return { box: box, chartType: 'scatter', minX: round1(minX), maxX: round1(maxX), y0: round1(y0), y1: round1(y1), scatterPoints: scatterPoints, fitPath: fitPath, xTicks: xTicks, yTicks: yTicks };
  }

  // Multi-series line — ONE measure on a shared y-axis, multiple CATEGORY series over a shared x.
  // Each series is a literal L0 data polyline (connect the observed points); the per-series trend
  // SLOPE lives in its own claim sentence (claims is an ARRAY, one claim per series). seriesKeys
  // enumerates EVERY series so none can be silently dropped (anti-cherry-pick). When there is <=1
  // series this is never reached (the render delegates to the legacy trend), keeping byte-identity.
  function multiSeriesGeometry(observations, claims, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var keys = seriesKeys(observations);
    var all = observations.slice();
    var xs = all.map(function (o) { return o.x; }), ys = all.map(function (o) { return o.y; });
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; }), refVals = refs.map(function (r) { return r.value; });
    var innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys.concat(refVals)), maxY = Math.max.apply(null, ys.concat(refVals));
    var padY = (maxY - minY) * 0.1 || 1, y0 = minY - padY, y1 = maxY + padY;
    function sx(x) { return box.padL + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * innerW; }
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var claimByKey = {}; (claims || []).forEach(function (c) { if (c && c.seriesKey != null) claimByKey[c.seriesKey] = c; });
    var seriesGeo = keys.map(function (k, idx) {
      var c = claimByKey[k];
      var pts = all.filter(function (o) { return o.series === k; }).slice().sort(function (a, b) { return a.x - b.x; });
      var points = pts.map(function (o) { return { x: o.x, y: o.y, phase: o.phase == null ? null : o.phase, level: 'L0', sx: round1(sx(o.x)), sy: round1(sy(o.y)) }; });
      var linePath = points.length >= 2 ? ('M ' + points.map(function (p) { return p.sx + ',' + p.sy; }).join(' L ')) : null;
      return { series: k, label: (c && c.seriesLabel) || k, colorIdx: idx, refused: !!(c && c.refused), n: pts.length, slope: (c && c.estimate) ? c.estimate.slope : null, points: points, linePath: linePath };
    });
    var xvals = xs.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var xTicks = xvals.map(function (v) { return { x: v, sx: round1(sx(v)) }; });
    var yTicks = []; for (var t = 0; t <= 4; t++) { var yv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yv), sy: round1(sy(yv)) }); }
    var out = { box: box, chartType: 'multiSeriesLine', minX: minX, maxX: maxX, y0: round1(y0), y1: round1(y1), seriesGeo: seriesGeo, xTicks: xTicks, yTicks: yTicks };
    if (refs.length) out.refLines = refs.map(function (r) { var ry = round1(sy(r.value)); return { id: r.id, value: r.value, sy: ry, dPath: 'M ' + box.padL + ',' + ry + ' L ' + (box.w - box.padR) + ',' + ry, label: benchmarkChipText(r), verified: r.verified === true }; });
    return out;
  }

  // TRUE grouped bar — bars side-by-side per (phase × series), each bar the MEAN of that cell, on a
  // 0-baseline (mirrors barGeometry:527 so heights are honest, never truncated). Per-cell n<3 => small
  // (rendered faded + labelled n), an empty cell draws NO bar (never a fabricated zero). NOT stacked
  // (a stacked bar implies a part-whole that isn't there). <=1 series delegates to the legacy bar.
  function groupedBarGeometry(observations, box, sourceRefs) {
    box = box || DEFAULT_BOX;
    var keys = seriesKeys(observations);
    if (keys.length <= 1) return barGeometry(observations, box, sourceRefs); // byte-identity: a 1-series grouped bar IS a bar
    var innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var sorted = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var groupOrder = [], gseen = {};
    sorted.forEach(function (o) { var g = o.phase == null ? '(all)' : o.phase; if (!gseen[g]) { gseen[g] = true; groupOrder.push(g); } });
    function cellPts(g, k) { return observations.filter(function (o) { return (o.phase == null ? '(all)' : o.phase) === g && o.series === k; }); }
    var means = [];
    groupOrder.forEach(function (g) { keys.forEach(function (k) { var pts = cellPts(g, k); if (pts.length) means.push(mean(pts.map(function (o) { return o.y; }))); }); });
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; }), refVals = refs.map(function (r) { return r.value; });
    var minY = Math.min.apply(null, means.concat(refVals).concat([0])); // baseline includes 0 — honest heights
    var maxY = Math.max.apply(null, means.concat(refVals).concat([0]));
    var padY = (maxY - minY) * 0.1 || 1, y0 = minY, y1 = maxY + padY;
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var baseline = round1(sy(y0));
    var ng = groupOrder.length, slotW = innerW / ng, innerPad = slotW * 0.18, bandW = slotW - innerPad, barW = bandW / keys.length;
    var groups = groupOrder.map(function (g, gi) {
      var gx0 = box.padL + slotW * gi + innerPad / 2;
      var bars = keys.map(function (k, ki) {
        var pts = cellPts(g, k), nC = pts.length;
        var m = nC ? round2(mean(pts.map(function (o) { return o.y; }))) : null;
        var top = m == null ? null : round1(sy(m));
        return { series: k, colorIdx: ki, value: m, n: nC, empty: nC === 0, small: nC > 0 && nC < SMALL_N.flagBelow, level: 'L1', bx: round1(gx0 + barW * ki), bw: round1(Math.max(3, barW - 2)), by: top, bh: (m == null ? 0 : round1(baseline - top)) };
      });
      return { phase: g, cx: round1(box.padL + slotW * (gi + 0.5)), bars: bars };
    });
    var xTicks = groups.map(function (gg) { return { label: gg.phase, sx: gg.cx }; });
    var yTicks = []; for (var t = 0; t <= 4; t++) { var yv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yv), sy: round1(sy(yv)) }); }
    var out = { box: box, chartType: 'groupedBar', baseline: baseline, y0: round1(y0), y1: round1(y1), keys: keys, groups: groups, xTicks: xTicks, yTicks: yTicks };
    if (refs.length) out.refLines = refs.map(function (r) { var ry = round1(sy(r.value)); return { id: r.id, value: r.value, sy: ry, dPath: 'M ' + box.padL + ',' + ry + ' L ' + (box.w - box.padR) + ',' + ry, label: benchmarkChipText(r), verified: r.verified === true }; });
    return out;
  }

  function plotGeometry(observations, claim, box, sourceRefs, chartType) {
    box = box || DEFAULT_BOX;
    if (chartType === 'multiSeriesLine') return multiSeriesGeometry(observations, claim, box, sourceRefs); // claim = ARRAY of per-series claims
    if (chartType === 'groupedBar') return groupedBarGeometry(observations, box, sourceRefs); // bars per (phase × series) mean
    if (chartType === 'bar') return barGeometry(observations, box, sourceRefs); // dispatch; trend code below is untouched
    if (chartType === 'dot') return dotGeometry(observations, box, sourceRefs);
    if (chartType === 'box') return boxGeometry(observations, box, sourceRefs);
    if (chartType === 'histogram') return histogramGeometry(observations, box, sourceRefs);
    if (chartType === 'scatter') return scatterGeometry(observations, claim, box, sourceRefs); // claim = association claim (for the fit line)
    if (chartType === 'slope') return slopeGeometry(observations, box); // per-phase fitted segments (reuses the trend claim)
    var obs = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var n = obs.length;
    var innerW = box.w - box.padL - box.padR;
    var innerH = box.h - box.padT - box.padB;
    var xs = obs.map(function (o) { return o.x; });
    var ys = obs.map(function (o) { return o.y; });
    // §16: only RENDERABLE (verified + http(s) + numeric) benchmarks participate; empty => byte-identical.
    var refs = (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; });
    var refVals = refs.map(function (r) { return r.value; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys.concat(refVals)), maxY = Math.max.apply(null, ys.concat(refVals));
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
    var out = {
      box: box, minX: minX, maxX: maxX, y0: round1(y0), y1: round1(y1),
      points: points, trendPath: trendPath, bandPath: bandPath,
      phaseLines: phaseLines, xTicks: xTicks, yTicks: yTicks
    };
    // §16: a benchmark draws a horizontal LINE with NO data marker (added only when present).
    if (refs.length) {
      out.refLines = refs.map(function (r) {
        var ry = round1(sy(r.value));
        return { id: r.id, value: r.value, sy: ry, dPath: 'M ' + box.padL + ',' + ry + ' L ' + (box.w - box.padR) + ',' + ry, label: benchmarkChipText(r), verified: r.verified === true };
      });
    }
    return out;
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

  // Slope pathway — per-phase fitted trend SEGMENTS on the shared y=value axis, anchored to the
  // human-set phase lines. Each segment is L1 (derived); the observed points sit beneath as L0 marks.
  // DESCRIPTIVE: a steeper post-phase slope is not proof the phase change caused it (caveat in the summary).
  // A phase with <2 points draws no segment (slope null) — never a fabricated line.
  function slopeGeometry(observations, box) {
    box = box || DEFAULT_BOX;
    var obs = observations.slice().sort(function (a, b) { return a.x - b.x; });
    var n = obs.length, innerW = box.w - box.padL - box.padR, innerH = box.h - box.padT - box.padB;
    var xs = obs.map(function (o) { return o.x; }), ys = obs.map(function (o) { return o.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var padY = (maxY - minY) * 0.1 || 1, y0 = minY - padY, y1 = maxY + padY;
    function sx(x) { return box.padL + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * innerW; }
    function sy(y) { return box.padT + innerH - (y1 === y0 ? 0 : (y - y0) / (y1 - y0)) * innerH; }
    var groups = [], gmap = {};
    obs.forEach(function (o) { var k = o.phase == null ? '(none)' : o.phase; if (!gmap[k]) { gmap[k] = { phase: k, pts: [] }; groups.push(gmap[k]); } gmap[k].pts.push({ x: o.x, y: o.y }); });
    var segments = groups.map(function (g) {
      var gxs = g.pts.map(function (p) { return p.x; });
      var gmin = Math.min.apply(null, gxs), gmax = Math.max.apply(null, gxs);
      var fit = g.pts.length >= 2 ? linregress(g.pts) : null;
      var fok = fit && !fit.degenerate;
      return {
        phase: g.phase, n: g.pts.length, level: 'L1', small: g.pts.length < SMALL_N.flagBelow,
        slope: fok ? round2(fit.slope) : null,
        sx1: fok ? round1(sx(gmin)) : null, sy1: fok ? round1(sy(fit.slope * gmin + fit.intercept)) : null,
        sx2: fok ? round1(sx(gmax)) : null, sy2: fok ? round1(sy(fit.slope * gmax + fit.intercept)) : null
      };
    });
    var dots = obs.map(function (o) { return { x: o.x, y: o.y, phase: o.phase == null ? null : o.phase, level: 'L0', sx: round1(sx(o.x)), sy: round1(sy(o.y)) }; });
    var phaseLines = [];
    for (var i = 1; i < n; i++) { if (obs[i].phase !== obs[i - 1].phase) { var px = (obs[i].x + obs[i - 1].x) / 2; phaseLines.push({ x: round1(px), sx: round1(sx(px)), fromPhase: obs[i - 1].phase, toPhase: obs[i].phase }); } }
    var xTicks = obs.map(function (o) { return { x: o.x, sx: round1(sx(o.x)) }; });
    var yTicks = []; for (var t = 0; t <= 4; t++) { var yv = y0 + (y1 - y0) * t / 4; yTicks.push({ y: round1(yv), sy: round1(sy(yv)) }); }
    return { box: box, chartType: 'slope', y0: round1(y0), y1: round1(y1), segments: segments, dots: dots, phaseLines: phaseLines, xTicks: xTicks, yTicks: yTicks };
  }

  function chartSummaryText(observations, claim, sourceRefs, chartType) {
    // Scatter (association) has a different axis grammar (x = a measure, not week), so it does NOT
    // describe trend phase lines or a y=value benchmark. The association sentence already carries
    // r + interval + n + the not-causation caveat, so it IS the complete summary.
    // Grouped bar: name every (phase × series) MEAN + n; bars are means, small cells flagged, spread in
    // the table. <=1 series delegates to a plain bar (no groups), so it names itself as a bar chart.
    if (chartType === 'groupedBar') {
      var gg = groupedBarGeometry(observations, undefined, []);
      if (gg.groups) {
        var cells = [];
        gg.groups.forEach(function (grp) { grp.bars.forEach(function (bar) { if (!bar.empty) cells.push(grp.phase + ' / ' + bar.series + ': mean ' + bar.value + ' (n=' + bar.n + (bar.small ? ', small' : '') + ')'); }); });
        return 'Grouped bar (mean per phase × series, same measure). ' + cells.join('; ') + '. Bars are per-cell means; small cells (n<3) are faded — the data table lists every point.';
      }
      return 'Bar chart. ' + (claim ? claim.text : 'no data yet.');
    }
    // Multi-series line: ONE sentence per series (refused series included — anti-cherry-pick), all on
    // the same measure/axis. claim is the ARRAY of per-series claims.
    if (chartType === 'multiSeriesLine') {
      var mc = Array.isArray(claim) ? claim : [];
      return 'Multi-series line (' + mc.length + ' series, same measure on one axis). ' + mc.map(function (c) { return c.text; }).join(' ');
    }
    if (chartType === 'scatter') {
      var sn = 'Scatter (association). ';
      return sn + (claim ? claim.text : 'no paired data yet.');
    }
    // Slope view: per-phase fitted trends (reuses the trend claim). Names the per-phase slopes and
    // carries the DESCRIPTIVE caveat — a steeper post-phase slope is not proof the change caused it.
    if (chartType === 'slope') {
      var sln = 'Slope (per-phase trends). ';
      if (!claim || claim.refused) return sln + (claim ? claim.text : 'no data yet.');
      var sp = perSegmentSlopes(observations).map(function (s) { return s.phase + ': ' + (s.slope == null ? 'too few points' : ('~' + s.slope + ' per step')); }).join('; ');
      return sln + claim.text + ' Per-phase fitted slopes — ' + sp + '. These are descriptive per-phase trends; a steeper slope after a phase change is not proof the change caused it.';
    }
    var name = chartType === 'bar' ? 'Bar chart.' : chartType === 'dot' ? 'Dot plot.' : chartType === 'box' ? 'Box plot (per phase).' : chartType === 'histogram' ? 'Histogram (distribution of values).' : 'Trend chart.';
    if (!claim || claim.refused) return name + ' ' + (claim ? claim.text : 'no data yet.');
    var parts = [name, claim.text];
    plotGeometry(observations, claim).phaseLines.forEach(function (p) {
      parts.push('A human-set phase line at week ' + p.x + ' divides ' +
        (p.fromPhase || 'the prior phase') + ' from ' + (p.toPhase || 'the next phase') + '.');
    });
    // §16: name each benchmark + its not-this-student status (empty => unchanged).
    (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; }).forEach(function (r) {
      parts.push('External benchmark (not this student): ' + r.keyLabel + ' = ' + r.value + ' ' + r.unit + (r.verified ? '' : ' [UNVERIFIED]') + '.');
    });
    return parts.join(' ');
  }

  // The SR data-table peer for a scatter: each row is a paired observation. The first column header
  // is the PRIMARY measure (the x-axis), the second is the 2nd measure (y2); rows missing y2 show '—'
  // so the pairwise-complete drop self-declares (anti-cherry-pick). The legacy row {x,y,phase,level}
  // render is reused with the x-slot holding the primary value and the y-slot holding y2, so the
  // generic table renderer is untouched and the column HEADERS carry the meaning.
  function associationTableModel(observations, claim) {
    var word = levelWord(claim.level);
    var withY = (observations || []).filter(function (o) { return o.y != null; }).slice().sort(function (a, b) { return a.x - b.x; });
    var columns = [claim.variable + ' (y)', (claim.variable2 || 'y2') + ' (y2)', 'Phase', 'Level'];
    var rows = withY.map(function (o) {
      return { x: o.y, y: (o.y2 == null ? '—' : o.y2), phase: o.phase || '—', level: word };
    });
    return { columns: columns, rows: rows, perSegment: [], summary: chartSummaryText(withY, claim, [], 'scatter'), level: claim.level, kind: 'association' };
  }

  // The SR data-table peer for a multi-series line: one row per observation, with a Series column.
  // Each row is an OBSERVED (L0) data point; the per-series SLOPE lives in the claim sentences (summary).
  function multiSeriesTableModel(observations, claims) {
    var word = levelWord('L0');
    var labelByKey = {}; (claims || []).forEach(function (c) { if (c && c.seriesKey != null) labelByKey[c.seriesKey] = c.seriesLabel || c.seriesKey; });
    var variable = (claims && claims[0] && claims[0].variable) || 'value';
    var obs = observations.slice().sort(function (a, b) { return (a.x - b.x) || String(a.series).localeCompare(String(b.series)); });
    var columns = ['Week (x)', variable + ' (y)', 'Series', 'Phase', 'Level'];
    var rows = obs.map(function (o) { return { x: o.x, y: o.y, series: (labelByKey[o.series] || o.series || '—'), phase: o.phase || '—', level: word }; });
    return { columns: columns, rows: rows, perSegment: [], summary: chartSummaryText(observations, claims, [], 'multiSeriesLine'), level: 'L1', kind: 'multiSeries' };
  }

  function dataTableModel(observations, claim, sourceRefs) {
    if (Array.isArray(claim)) return multiSeriesTableModel(observations, claim); // multi-series peer (claim = per-series array)
    if (claim && claim.kind === 'association') return associationTableModel(observations, claim); // scatter peer; legacy path below is untouched
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
    // §16: benchmark rows appended AFTER the student rows, carrying the verify-state in WORDS.
    (sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; }).forEach(function (r) {
      rows.push({ reference: true, label: 'External benchmark (not this student): ' + r.keyLabel + ' = ' + r.value + ' ' + r.unit + ' [' + (r.verified ? 'verified' : 'UNVERIFIED — check the source') + ']' });
    });
    return {
      columns: columns, rows: rows, perSegment: perSegmentSlopes(obs),
      summary: chartSummaryText(obs, claim, sourceRefs), level: claim ? claim.level : 'L0'
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

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 1 — export (a view artifact) + the FERPA + L3 sign-off gates.
  // Every field is escHtml'd into the HTML sink (the symbol_studio printBook
  // XSS lesson). assertDefensible() hard-blocks an IEP-team export that carries
  // an unsigned AI reading (§7). PII CSV is OFF by default (FERPA).
  // ══════════════════════════════════════════════════════════════════════

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function csvSafe(s) {
    s = String(s == null ? '' : s);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function slug(s) {
    return String(s == null ? 'lumen' : s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'lumen';
  }

  function signoffHash(aiHyps) { return cyrb53(JSON.stringify(aiHyps || [])); }

  // The defensible (IEP-team) export is gated: an L3 AI reading must be OWNED
  // (a sign-off whose hash matches the CURRENT bytes) or removed (§7). A stale
  // sign-off (the reading regenerated since) no longer matches and re-blocks.
  function assertDefensible(req) {
    if (!req || req.audience !== 'iep-team') return { ok: true, blocked: false };
    if (!req.aiHyps || !req.aiHyps.length) return { ok: true, blocked: false };
    var current = signoffHash(req.aiHyps);
    if (req.signoff && req.signoff === current) return { ok: true, blocked: false };
    return {
      ok: false, blocked: true, need: current,
      reason: 'This view contains an AI reading (L3). Own it or remove it before an IEP-team export.'
    };
  }

  function buildExportHtml(comp, claim, opts) {
    opts = opts || {};
    var audience = opts.audience || 'working';
    var includedAI = !!opts.includeAI && audience !== 'family' && !!((opts.aiHyps && opts.aiHyps.length) || opts.aiText);
    var maxLevel = includedAI ? ((opts.aiHyps && opts.aiHyps.length) ? 'L3' : 'L2') : 'L1';
    var tbl = dataTableModel(comp.observations, claim);
    var rows = tbl.rows.map(function (r) {
      if (r.boundary) return '<tr><td colspan="4"><em>' + escHtml(r.label) + '</em></td></tr>';
      return '<tr><td>' + escHtml(r.x) + '</td><td>' + escHtml(r.y) + '</td><td>' + escHtml(r.phase) + '</td><td>' + escHtml(r.level) + '</td></tr>';
    }).join('');
    var ai = '';
    if (includedAI && opts.aiHyps && opts.aiHyps.length) {
      ai = '<h3>AI reading (L3) — ' + escHtml(AI_CAVEAT) + '</h3><ul>' +
        opts.aiHyps.map(function (hp) {
          return '<li><strong>' + escHtml(hp.band) + ':</strong> ' + escHtml(hp.text) +
            (hp.kind !== 'effect' ? ' (' + escHtml(hp.kind) + ')' : '') + '</li>';
        }).join('') + '</ul><p><em>' + escHtml(HYP_CAVEAT) + '. Regenerates each run.</em></p>';
    } else if (includedAI && opts.aiText) {
      ai = '<h3>AI-organized (L2) — ' + escHtml(AI_CAVEAT) + '</h3><p>' + escHtml(opts.aiText) + '</p>';
    }
    var subset = (claim.shownOf && claim.shownOf.shown < claim.shownOf.total)
      ? '<p><strong>Showing ' + claim.shownOf.shown + ' of ' + claim.shownOf.total + ' observations.</strong></p>' : '';
    var methods = '<h3>Methods</h3><p>' + escHtml(claim.estimate
      ? 'Ordinary least-squares trend over ' + claim.n + ' observations; the interval is a 95% t-interval on the slope; the bootstrap is a 1,000-resample data-seeded percentile interval. Descriptive only — not a percentile, score, prediction, or diagnosis.'
      : 'Too few observations to estimate a trend.') + '</p>';
    // §16: external benchmarks get their OWN References section (never mixed into the student table).
    var refs = (opts.sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; });
    var references = refs.length ? ('<h3>External references</h3><ul>' + refs.map(function (r) {
      var href = /^https?:\/\//i.test(r.locator) ? r.locator : '#'; // scheme-allowlist (the printBook href lesson)
      return '<li><strong>' + escHtml(benchmarkChipText(r)) + '</strong><br>' + escHtml(r.citation) +
        ' — <a href="' + escHtml(href) + '">source</a>' + (r.verified ? ' [verified]' : ' [UNVERIFIED — check the source]') + '</li>';
    }).join('') + '</ul><p><em>External benchmarks are general references, not this student\'s measured data or individualized goals.</em></p>') : '';
    var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + escHtml('Lumen — ' + comp.variable) + '</title></head><body>'
      + '<h1>' + escHtml('Lumen — ' + comp.variable + ' (' + comp.unit + ')') + '</h1>'
      + '<p><strong>' + escHtml(faceFor(claim, audience)) + '</strong></p>'
      + subset
      + '<p>' + escHtml(chartSummaryText(comp.observations, claim, opts.sourceRefs)) + '</p>'
      + '<table border="1" cellpadding="3"><thead><tr>' + tbl.columns.map(function (c) { return '<th>' + escHtml(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table>'
      + ai + methods + references
      + '<hr><p><small>Lumen export · max epistemic level ' + escHtml(maxLevel) + ' · audience: ' + escHtml(audience) + '. Levels: Observed / Derived (math) / AI-organized / AI reading.</small></p>'
      + '</body></html>';
    return { html: html, filename: 'lumen-' + slug(comp.variable) + '-' + audience + '.html', maxLevel: maxLevel };
  }

  function buildExportCsv(comp, claim, opts) {
    opts = opts || {};
    var lines = ['# Lumen export — max epistemic level L1' + (opts.includePII ? ' — CONFIDENTIAL (identifiable)' : ' — aggregate only')];
    if (opts.includePII) {
      lines.push('week,' + csvSafe(comp.variable) + ',phase,level');
      comp.observations.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (o) {
        lines.push([o.x, o.y, csvSafe(o.phase || ''), 'Derived (math)'].join(','));
      });
    } else {
      lines.push('metric,value');
      if (claim && claim.estimate) {
        var e = claim.estimate;
        lines.push('n,' + e.n);
        lines.push('slope,' + round2(e.slope));
        lines.push('interval_lo,' + round2(e.interval[0]));
        lines.push('interval_hi,' + round2(e.interval[1]));
        lines.push('level,Derived (math)');
      } else {
        lines.push('n,' + (claim ? claim.n : 0));
        lines.push('note,too few points to estimate a trend');
      }
    }
    var srcRows = (opts.sourceRefs || []).filter(function (r) { return sourcedRenderable(r).ok; });
    if (srcRows.length) {
      lines.push('# external references (general norms, not this student):');
      srcRows.forEach(function (r) {
        lines.push('reference,' + csvSafe(r.keyLabel) + ',' + r.value + ',' + csvSafe(r.unit) + ',' + csvSafe(r.citation) + ',' + (r.verified ? 'verified' : 'unverified'));
      });
    }
    return { csv: lines.join('\n'), filename: 'lumen-' + slug(comp.variable) + (opts.includePII ? '-CONFIDENTIAL' : '-summary') + '.csv', maxLevel: 'L1' };
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 1.x — SOURCED provenance (design §16): external/benchmark facts.
  // A fourth, ORTHOGONAL origin (key 'SRC', NOT in LEVELS). A benchmark is
  // STRUCTURALLY never the student's data: separate sourceRefs[] array; a line
  // with no data marker; an "External benchmark (not this student):" sentence
  // prefix. v1 = curated-only, renders ONLY verified refs. AI-search = Phase 2.
  // ══════════════════════════════════════════════════════════════════════

  // The curated norm spine SHIPS EMPTY. RELEASE BLOCKER: a human must byte-
  // transcribe each cell against the PRIMARY source (ED594994 for H&T 2017) and
  // set reviewedOn before any norm renders. selectNorm refuses an empty cell, so
  // nothing fabricated can render. Do NOT seed from the repo FLUENCY_BENCHMARKS
  // table (a non-percentile median: G4 winter = 112, a DIFFERENT construct).
  var NORM_SPINE = {
    schemaVersion: 1, source: 'Hasbrouck & Tindal', year: 2017, edition: '2017 compiled (Tech. Rpt. 1702)',
    measure: 'ORF-WCPM', unit: 'words/min', population: 'national compiled (DIBELS/DIBELS Next/easyCBM)',
    citation: 'Hasbrouck, J. & Tindal, G. (2017). An update to compiled ORF norms (Tech. Rpt. 1702). U. of Oregon, BRT.',
    locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf',
    gradeRange: [1, 6], reviewedOn: null, // stays null until cells are byte-verified
    cells: {} // grade -> season -> { p50, p25 }  (EMPTY: populate + verify before release)
  };
  var DIBELS8_ORF = {
    schemaVersion: 1, source: 'DIBELS 8th Edition', year: 2020, edition: 'DIBELS 8 ORF benchmark goals', kind: 'cut-point',
    measure: 'ORF-WCPM', unit: 'words/min', population: 'DIBELS 8 national sample',
    citation: 'University of Oregon (2020). DIBELS 8th Edition benchmark goals.',
    locator: 'https://dibels.uoregon.edu/', gradeRange: [7, 8], reviewedOn: null, cells: {}
  };

  // Keyed lookup — REFUSE, never warn (§16.3). measure/unit checked vs the study.
  function selectNorm(spine, comp, key) {
    key = key || {};
    if (!spine || spine.measure !== (comp && comp.measure)) return { ok: false, refused: true, hazard: 'wrong-measure', reason: 'norm measure does not match this study' };
    if (spine.unit !== (comp && comp.unit)) return { ok: false, refused: true, hazard: 'wrong-unit', reason: 'norm unit does not match this study' };
    var g = key.grade;
    if (g == null || g < spine.gradeRange[0] || g > spine.gradeRange[1]) return { ok: false, refused: true, hazard: 'out-of-range', reason: spine.source + ' covers grades ' + spine.gradeRange[0] + '-' + spine.gradeRange[1] + '; grade ' + g + ' is out of range' };
    if (!key.season) return { ok: false, refused: true, hazard: 'no-season', reason: 'season must be explicitly chosen (never inferred from the x-window)' };
    var cell = spine.cells[g] && spine.cells[g][key.season];
    var pctKey = 'p' + (key.percentile || 50);
    if (!cell || cell[pctKey] == null) return { ok: false, refused: true, hazard: 'no-cell', reason: 'no verified ' + spine.source + ' cell for grade ' + g + ' ' + key.season + ' ' + pctKey };
    return { ok: true, value: cell[pctKey], key: key };
  }

  // Honesty gate for the curated norm spine. A spine is shippable ONLY in two CLEAN states:
  //   'empty'  — no cells AND reviewedOn null   (renders nothing; selectNorm refuses every cell)
  //   'ready'  — cells populated AND reviewedOn set AND every value a positive number, p25<=p50
  // Anything else is 'invalid' and MUST block release:
  //   • filled-but-unreviewed  = shipping un-verified norms (the laundering risk this whole spine exists to prevent)
  //   • reviewed-but-empty     = claiming a verification that did not happen
  //   • non-numeric / p25>p50  = a transcription error caught before it reaches a student's chart
  // Pure; used by the build gate (check_lumen_floor / check_lumen_spine) and safe for a human to call.
  function validateNormSpine(spine) {
    if (!spine) return { status: 'invalid', cellCount: 0, problems: ['spine missing'] };
    var problems = [], cellCount = 0, hasCells = false;
    var cells = spine.cells || {};
    Object.keys(cells).forEach(function (g) {
      var seasons = cells[g] || {};
      Object.keys(seasons).forEach(function (s) {
        var cell = seasons[s] || {};
        Object.keys(cell).forEach(function (pk) {
          hasCells = true; cellCount++;
          var v = cell[pk];
          if (typeof v !== 'number' || !isFinite(v) || v <= 0) problems.push('grade ' + g + ' ' + s + ' ' + pk + ': value must be a positive number (got ' + JSON.stringify(v) + ')');
        });
        if (typeof cell.p25 === 'number' && typeof cell.p50 === 'number' && cell.p25 > cell.p50) problems.push('grade ' + g + ' ' + s + ': p25 (' + cell.p25 + ') > p50 (' + cell.p50 + ') — transcription error?');
      });
    });
    var reviewed = spine.reviewedOn != null;
    if (!hasCells && !reviewed) return { status: 'empty', cellCount: 0, problems: [] };
    if (hasCells && !reviewed) problems.push('cells are populated but reviewedOn is null — transcribed norms must be human-verified (set reviewedOn) before release');
    if (!hasCells && reviewed) problems.push('reviewedOn is set but no cells are present — a reviewed-but-empty spine claims a verification it has not done');
    if (problems.length) return { status: 'invalid', cellCount: cellCount, problems: problems };
    return { status: 'ready', cellCount: cellCount, problems: [] };
  }

  // The atom. A citation + resolvable locator are MANDATORY (no citation, no render).
  function makeSourceRef(spec, comp) {
    if (!spec) throw new Error('makeSourceRef: spec required');
    if (!spec.citation || !spec.locator) throw new Error('makeSourceRef: a citation AND a resolvable locator are mandatory');
    if (comp && spec.measure && comp.measure && spec.measure !== comp.measure) throw new Error('makeSourceRef: measure mismatch (' + spec.measure + ' vs study ' + comp.measure + ')');
    if (comp && spec.unit && comp.unit && spec.unit !== comp.unit) throw new Error('makeSourceRef: unit mismatch');
    var keyLabel = spec.keyLabel || [spec.source, spec.year, spec.grade != null ? ('G' + spec.grade) : null, spec.season, spec.percentile != null ? (spec.percentile + 'th %ile') : null, spec.population].filter(Boolean).join(' · ');
    var ref = {
      provenance: 'SRC', kind: spec.kind || 'percentile',
      measure: spec.measure, unit: spec.unit,
      grade: spec.grade, season: spec.season, percentile: spec.percentile, value: spec.value,
      source: spec.source, year: spec.year, population: spec.population || null, table: spec.table || null,
      locator: spec.locator, citation: spec.citation, keyLabel: keyLabel,
      verified: spec.verified === true, retrievedBy: spec.retrievedBy || 'curated', reviewedOn: spec.reviewedOn || null
    };
    ref._hash = cyrb53(JSON.stringify([ref.measure, ref.grade, ref.season, ref.percentile, ref.value, ref.unit, ref.source, ref.year, ref.population, ref.table, ref.locator, ref.citation]));
    return ref;
  }
  function addSourceRef(comp, ref) {
    comp._srcSeq = (comp._srcSeq || 0) + 1;
    ref.id = 's' + comp._srcSeq;
    (comp.sourceRefs = comp.sourceRefs || []).push(ref);
    return ref.id;
  }

  // Renderable in v1 only if VERIFIED + citation + a real http(s) locator + numeric value.
  function sourcedRenderable(ref) {
    if (!ref || !ref.citation || !ref.locator) return { ok: false, reason: 'missing citation/locator' };
    if (!/^https?:\/\//i.test(ref.locator)) return { ok: false, reason: 'locator must be http(s)' };
    if (ref.verified !== true) return { ok: false, reason: 'unverified — not rendered in v1' };
    if (typeof ref.value !== 'number') return { ok: false, reason: 'no numeric value' };
    return { ok: true, reason: '' };
  }

  function benchmarkChipText(ref) {
    return 'External benchmark (not this student): ' + ref.keyLabel + ' = ' + ref.value + ' ' + ref.unit;
  }

  // Audience faces — the benchmark is NEVER blended into the student's growth.
  function sourcedFace(ref, audience) {
    if (audience === 'iep-team') return benchmarkChipText(ref) + ' — a national reference, not an individualized goal. Source: ' + ref.citation + (ref.verified ? '' : ' [UNVERIFIED — check the source]');
    if (audience === 'family') return 'For comparison, a typical ' + (ref.grade != null ? ('grade-' + ref.grade + ' ') : '') + 'reader' + (ref.season ? (' in ' + ref.season) : '') + ' is around ' + ref.value + ' ' + ref.unit + '. That is a general reference, not this student\'s goal.';
    return benchmarkChipText(ref) + (ref.verified ? '' : ' [UNVERIFIED]'); // working
  }

  function referenceContrastOK(palette) {
    var p = palette || DEFAULT_PALETTE;
    return !!p.reference && p.reference !== p.neutral && p.reference !== p.caution;
  }

  // The sign-off + the UNIFIED export gate (mirrors assertDefensible, §16.4).
  function sourcedSignoffHash(ref) {
    return cyrb53(JSON.stringify([ref.measure, ref.grade, ref.season, ref.percentile, ref.value, ref.unit, ref.source, ref.year, ref.population, ref.table, ref.locator, ref.citation]));
  }
  function assertSourcedDefensible(req) {
    if (!req || req.audience !== 'iep-team') return { ok: true, blocked: false };
    var refs = req.sourceRefs || [];
    var signoffs = req.sourceSignoffs || {};
    var offenders = refs.filter(function (r) {
      if (r.verified !== true) return true;                                          // unverified blocks
      if ((r.id in signoffs) && signoffs[r.id] !== sourcedSignoffHash(r)) return true; // a STALE (edited-after) sign-off re-blocks
      return false;                                                                  // verified curated ref is clean
    });
    if (!offenders.length) return { ok: true, blocked: false };
    return { ok: false, blocked: true, reason: 'This view has ' + offenders.length + ' external benchmark(s) unverified or with a stale sign-off. Verify the source(s) before an IEP-team export.', offenders: offenders.map(function (r) { return r.id; }) };
  }
  // ══════════════════════════════════════════════════════════════════════
  // §16 SOURCED — Phase 2A: human-assisted benchmark-document workspace.
  //
  // Phase 2A is the deliberately-tighter cut of the §16.4 AI-assist-then-
  // verify path: it accepts a benchmark DOCUMENT (PDF / DOCX / TXT / CSV /
  // XLSX), extracts text DETERMINISTICALLY (pdf.js / mammoth / the §17
  // parsers — never an AI parse from bytes to numbers), and shows the
  // extracted text side-by-side with a scaffold of empty spine cells the
  // human fills + signs off per cell. Verified cells fold into the
  // curated NORM_SPINE.cells JSON for paste-back into source.
  //
  // What Phase 2A is NOT: the full §16.4 AI-search assist (findNormViaAI,
  // groundingChunks extraction, on-line UNVERIFIED stamp). That stays
  // CUT to Phase 2B per §16.7. The seam is set right — proposals carry
  // the same shape AI-search would emit — but no callGemini fires.
  // ══════════════════════════════════════════════════════════════════════

  var BENCH_DOC_TYPES = ['pdf', 'docx', 'txt', 'csv', 'xlsx'];
  var BENCH_DOC_MAX_BYTES = 8 * 1024 * 1024; // 8 MB — H&T2017 PDF is ~2 MB; leaves headroom

  function benchDocTypeFromName(name) {
    if (!name || typeof name !== 'string') return null;
    var lower = name.toLowerCase();
    if (/\.pdf$/.test(lower)) return 'pdf';
    if (/\.docx$/.test(lower)) return 'docx';
    if (/\.tsv$/.test(lower)) return 'txt';
    if (/\.csv$/.test(lower)) return 'csv';
    if (/\.txt$/.test(lower)) return 'txt';
    if (/\.xlsx$/.test(lower)) return 'xlsx';
    return null;
  }

  // Normalize the post-extraction shape into a common record. The UI calls
  // either lazyLoadPdfJs / lazyLoadMammoth (document path) or the §17
  // parsers (table path); either output goes through this normalizer so
  // downstream code (preview pane, scaffold filler) speaks ONE shape.
  function normalizeBenchExtraction(input) {
    if (!input) return { kind: 'empty', pages: [], notes: ['null-input'] };
    if (typeof input.headers !== 'undefined' && typeof input.rows !== 'undefined') {
      // §17 text-table shape (CSV/TSV/XLSX path)
      var flat = [input.headers.join('  |  ')].concat(input.rows.map(function (r) { return r.join('  |  '); })).join('\n');
      return { kind: 'text-table', pages: [{ pageNum: 1, text: flat }], notes: input.notes || [], delimiter: input.delimiter, sheetName: input.sheetName || null, table: input };
    }
    if (Array.isArray(input.pages)) {
      return { kind: 'document-pages', pages: input.pages.map(function (p, i) {
        return { pageNum: p.pageNum != null ? p.pageNum : (i + 1), text: typeof p.text === 'string' ? p.text : '' };
      }), notes: input.notes || [] };
    }
    if (typeof input.text === 'string') {
      return { kind: 'document-pages', pages: [{ pageNum: 1, text: input.text }], notes: input.notes || [] };
    }
    return { kind: 'unknown', pages: [], notes: ['unknown-input-shape'] };
  }

  // Generate the scaffold of empty cells a human needs to fill for a given
  // spine slice. Pure: no AI, no library, no Date. The maintainer picks
  // the slice (a single grade × season combination is a 1-cell sliver
  // they can finish in 60 seconds; the full H&T G1-6 percentile set is
  // 6×3×3 = 54 cells they can finish in a sitting).
  function buildSpineCellScaffold(spineMeta, opts) {
    if (!spineMeta || typeof spineMeta !== 'object') return [];
    opts = opts || {};
    var seasons = opts.seasons || ['fall', 'winter', 'spring'];
    var percentiles = opts.percentiles || [50];
    var grades = opts.grades;
    if (!grades) {
      var range = spineMeta.gradeRange || [1, 6];
      grades = [];
      for (var g = range[0]; g <= range[1]; g++) grades.push(g);
    }
    var cells = [];
    for (var gi = 0; gi < grades.length; gi++) {
      var grade = grades[gi];
      for (var si = 0; si < seasons.length; si++) {
        var season = seasons[si];
        for (var pi = 0; pi < percentiles.length; pi++) {
          var percentile = percentiles[pi];
          cells.push({
            id: 'cell_' + (spineMeta.measure || 'X') + '_g' + grade + '_' + season + '_p' + percentile,
            measure: spineMeta.measure, unit: spineMeta.unit,
            grade: grade, season: season, percentile: percentile,
            value: null, // <-- the only field the human fills
            sourceExcerpt: '', // optional: the human can paste the page snippet they verified against
            source: spineMeta.source, year: spineMeta.year, edition: spineMeta.edition || null,
            population: spineMeta.population || null, locator: spineMeta.locator, citation: spineMeta.citation,
            verified: false, retrievedBy: 'human-assisted', reviewedOn: null, signoffHash: null
          });
        }
      }
    }
    return cells;
  }

  // Schema check for a single proposed cell. Returns { ok, errors[] }.
  // Run before signoff and again at bind time.
  function validateProposedSpineCell(cell) {
    var errors = [];
    if (!cell || typeof cell !== 'object') return { ok: false, errors: ['not-an-object'] };
    if (typeof cell.measure !== 'string' || !cell.measure) errors.push('measure-missing-or-not-string');
    if (typeof cell.unit !== 'string' || !cell.unit) errors.push('unit-missing-or-not-string');
    if (typeof cell.grade !== 'number' || cell.grade < 0 || cell.grade > 12) errors.push('grade-out-of-range');
    if (typeof cell.season !== 'string' || !cell.season) errors.push('season-missing');
    if (typeof cell.percentile !== 'number' || cell.percentile < 1 || cell.percentile > 99) errors.push('percentile-out-of-range');
    if (typeof cell.value !== 'number' || !isFinite(cell.value) || cell.value <= 0) errors.push('value-not-positive-number');
    if (typeof cell.locator !== 'string' || !/^https?:\/\//i.test(cell.locator)) errors.push('locator-not-http-url');
    if (typeof cell.citation !== 'string' || !cell.citation) errors.push('citation-missing');
    if (typeof cell.source !== 'string' || !cell.source) errors.push('source-missing');
    return { ok: errors.length === 0, errors: errors };
  }

  // Per-cell sign-off. Returns the cell mutated with verified:true,
  // reviewedOn set (caller supplies — we forbid Date in this layer), and
  // signoffHash computed via the SAME hash function § sourcedSignoffHash
  // uses (so a stale-edit re-blocks the same way a stale sourceRef does).
  function signoffSpineCell(cell, reviewedOnIso) {
    var v = validateProposedSpineCell(cell);
    if (!v.ok) return { ok: false, errors: v.errors, cell: cell };
    if (typeof reviewedOnIso !== 'string' || !reviewedOnIso) return { ok: false, errors: ['reviewedOn-required'], cell: cell };
    cell.verified = true;
    cell.reviewedOn = reviewedOnIso;
    cell.signoffHash = sourcedSignoffHash(cell);
    return { ok: true, errors: [], cell: cell };
  }

  // Bind a list of (presumably-signed) cells into a spine.cells structure
  // shape: cells[grade][season] = { p25, p50, p75, ... }. Refuses to
  // accept an unverified cell; refuses to overwrite an existing populated
  // cell with a different value (the stable-spine invariant — the only
  // safe overwrite is identical-value, e.g. re-import of the same source).
  function bindVerifiedCellsToSpine(existingCells, newCells) {
    var merged = JSON.parse(JSON.stringify(existingCells || {}));
    var collisions = [];
    var added = 0, skipped = 0;
    if (!Array.isArray(newCells)) return { cells: merged, added: 0, skipped: 0, collisions: [{ reason: 'newCells-not-array' }] };
    for (var i = 0; i < newCells.length; i++) {
      var c = newCells[i];
      if (!c) { collisions.push({ idx: i, reason: 'null-cell' }); continue; }
      if (c.verified !== true) { collisions.push({ id: c.id, reason: 'not-verified' }); skipped++; continue; }
      if (!c.signoffHash) { collisions.push({ id: c.id, reason: 'no-signoff-hash' }); skipped++; continue; }
      var hashNow = sourcedSignoffHash(c);
      if (hashNow !== c.signoffHash) { collisions.push({ id: c.id, reason: 'stale-signoff', expected: c.signoffHash, computed: hashNow }); skipped++; continue; }
      var v = validateProposedSpineCell(c);
      if (!v.ok) { collisions.push({ id: c.id, reason: 'schema', errors: v.errors }); skipped++; continue; }
      if (!merged[c.grade]) merged[c.grade] = {};
      if (!merged[c.grade][c.season]) merged[c.grade][c.season] = {};
      var pKey = 'p' + c.percentile;
      var existing = merged[c.grade][c.season][pKey];
      if (existing !== undefined && existing !== c.value) {
        collisions.push({ id: c.id, reason: 'value-collision', existing: existing, proposed: c.value, grade: c.grade, season: c.season, percentile: c.percentile });
        skipped++; continue;
      }
      merged[c.grade][c.season][pKey] = c.value;
      added++;
    }
    return { cells: merged, added: added, skipped: skipped, collisions: collisions };
  }

  // Pretty JSON for paste-back into NORM_SPINE.cells in source. Sorted
  // grade-then-season-then-percentile so diffs stay small.
  function spineCellsToJSON(cells, indent) {
    if (!cells || typeof cells !== 'object') return '{}';
    var sortedGrades = Object.keys(cells).sort(function (a, b) { return parseFloat(a) - parseFloat(b); });
    var SEASON_ORDER = { fall: 0, winter: 1, spring: 2 };
    var out = {};
    sortedGrades.forEach(function (g) {
      var seasons = cells[g] || {};
      var sortedSeasons = Object.keys(seasons).sort(function (a, b) {
        var ao = SEASON_ORDER[a] != null ? SEASON_ORDER[a] : 99;
        var bo = SEASON_ORDER[b] != null ? SEASON_ORDER[b] : 99;
        return ao - bo || a.localeCompare(b);
      });
      out[g] = {};
      sortedSeasons.forEach(function (s) {
        var pcts = seasons[s] || {};
        var sortedP = Object.keys(pcts).sort(function (a, b) { return parseFloat(a.slice(1)) - parseFloat(b.slice(1)); });
        out[g][s] = {};
        sortedP.forEach(function (pk) { out[g][s][pk] = pcts[pk]; });
      });
    });
    return JSON.stringify(out, null, indent == null ? 2 : indent);
  }

  // Lazy loaders — same pattern as lazyLoadXLSX. Browser only.
  var _pdfJsLoadPromise = null;
  function lazyLoadPdfJs(cdnUrl, workerUrl) {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (_pdfJsLoadPromise) return _pdfJsLoadPromise;
    var url = cdnUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
    var wurl = workerUrl || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
    _pdfJsLoadPromise = new Promise(function (resolve, reject) {
      try {
        var s = document.createElement('script');
        s.type = 'module';
        s.crossOrigin = 'anonymous';
        s.textContent = 'import * as pdfjs from "' + url + '"; window.pdfjsLib = pdfjs; window.pdfjsLib.GlobalWorkerOptions.workerSrc = "' + wurl + '"; window.dispatchEvent(new Event("pdfjs-loaded"));';
        window.addEventListener('pdfjs-loaded', function once() { window.removeEventListener('pdfjs-loaded', once); resolve(window.pdfjsLib || null); });
        document.head.appendChild(s);
        // Hard timeout: the script-tag module load can hang silently behind a CSP block
        setTimeout(function () { if (!window.pdfjsLib) { _pdfJsLoadPromise = null; reject(new Error('pdf.js did not load within 15 s — check network or CSP for ' + url)); } }, 15000);
      } catch (e) { _pdfJsLoadPromise = null; reject(e); }
    });
    return _pdfJsLoadPromise;
  }

  var _mammothLoadPromise = null;
  function lazyLoadMammoth(cdnUrl) {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.mammoth) return Promise.resolve(window.mammoth);
    if (_mammothLoadPromise) return _mammothLoadPromise;
    var url = cdnUrl || 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    _mammothLoadPromise = new Promise(function (resolve, reject) {
      try {
        var s = document.createElement('script');
        s.src = url; s.async = true; s.crossOrigin = 'anonymous';
        s.onload = function () { resolve(window.mammoth || null); };
        s.onerror = function () { _mammothLoadPromise = null; reject(new Error('Could not load mammoth from ' + url)); };
        document.head.appendChild(s);
      } catch (e) { _mammothLoadPromise = null; reject(e); }
    });
    return _mammothLoadPromise;
  }

  // Browser-side extractors. Pure-ish (no Date, no Math.random) but they
  // call into the loaded libraries. The libraries themselves are not
  // Node-testable; the unit tests cover the pure layer (scaffold +
  // validate + signoff + bind + normalize) with fixture text instead.
  function extractPdfText(pdfjsLib, buffer) {
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
      return Promise.resolve({ pages: [], notes: ['pdfjs-missing'], error: 'pdf.js not loaded' });
    }
    try {
      return pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise.then(function (pdf) {
        var pageNums = [];
        for (var i = 1; i <= pdf.numPages; i++) pageNums.push(i);
        return Promise.all(pageNums.map(function (n) {
          return pdf.getPage(n).then(function (page) {
            return page.getTextContent().then(function (tc) {
              var text = (tc.items || []).map(function (it) { return it.str || ''; }).join(' ');
              return { pageNum: n, text: text };
            });
          });
        })).then(function (pages) { return { pages: pages, notes: [] }; });
      }).catch(function (e) {
        return { pages: [], notes: ['pdf-parse-error'], error: 'PDF parse failed: ' + (e && e.message ? e.message : 'unknown') };
      });
    } catch (e) {
      return Promise.resolve({ pages: [], notes: ['pdf-parse-error'], error: 'PDF parse failed: ' + (e && e.message ? e.message : 'unknown') });
    }
  }

  function extractDocxText(mammoth, buffer) {
    if (!mammoth || typeof mammoth.extractRawText !== 'function') {
      return Promise.resolve({ pages: [], notes: ['mammoth-missing'], error: 'mammoth not loaded' });
    }
    return mammoth.extractRawText({ arrayBuffer: buffer }).then(function (result) {
      return { pages: [{ pageNum: 1, text: result && result.value ? result.value : '' }], notes: (result && result.messages ? result.messages.map(function (m) { return 'mammoth: ' + (m && m.message ? m.message : ''); }) : []) };
    }).catch(function (e) {
      return { pages: [], notes: ['docx-parse-error'], error: 'DOCX parse failed: ' + (e && e.message ? e.message : 'unknown') };
    });
  }

  // THE single export gate — ANDs the AI-reading gate (assertDefensible) and the Sourced gate.
  function assertExportClean(req) {
    req = req || {};
    var a = assertDefensible({ audience: req.audience, aiHyps: req.aiHyps, signoff: req.signoff });
    var s = assertSourcedDefensible(req);
    if (a.blocked || s.blocked) return { ok: false, blocked: true, reason: [a.blocked ? a.reason : null, s.blocked ? s.reason : null].filter(Boolean).join(' ') };
    return { ok: true, blocked: false };
  }

  // ══════════════════════════════════════════════════════════════════════
  // INGEST (design §5 Pillar 1) — pure parsers + column mapper.
  //
  // Contract: every observation that survives mapping is L0 — "a verbatim
  // echo of a value the user entered/pasted/imported" (§6.1). The parser
  // refuses to invent values, refuses to coerce non-numerics, and labels
  // every drop so the row-by-row provenance survives. No AI in the parse
  // path; headers are stored on the preview only and are never sent to
  // buildClaimContext (which is already PII-free by construction).
  //
  // File-format support: .csv/.tsv/.txt deterministic in pure JS;
  // .xlsx via SheetJS-CDN-on-demand (UI loads it lazily) — the workbook
  // helper here is a thin wrapper that delegates back to parseTextTable
  // via sheet_to_csv, so the parse stays deterministic + unit-testable.
  // ══════════════════════════════════════════════════════════════════════

  var INGEST_MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap on the raw text — bounds parser CPU / memory
  var INGEST_MAX_ROWS = 10000;            // hard row cap (truncate, never throw)
  var INGEST_DELIMS = [',', '\t', ';'];
  var INGEST_FILE_TYPES = ['csv', 'tsv', 'txt', 'json', 'xlsx', 'ods', 'xls', 'xlsb'];

  // Single-pass RFC-4180 parser. Handles quoted fields with embedded
  // delimiters / newlines / escaped doubled quotes. Returns rows[][].
  function _parseDelim(text, delim) {
    var rows = [];
    var row = [];
    var cell = '';
    var inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (inQ) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { cell += '"'; i++; continue; }
          inQ = false; continue;
        }
        cell += c; continue;
      }
      if (c === '"' && cell === '') { inQ = true; continue; }
      if (c === delim) { row.push(cell); cell = ''; continue; }
      if (c === '\n') { row.push(cell); cell = ''; rows.push(row); row = []; continue; }
      cell += c;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // Parse CSV/TSV/semicolon-delimited text. Strips BOM, normalizes CRLF→LF,
  // autodetects the delimiter from the most-common counts on the first line
  // (override via opts.delimiter), and downgrades hasHeader if the first
  // row is all numeric. Returns { headers, rows, delimiter, notes }; on
  // overflow or fatal error sets `error`.
  function parseTextTable(raw, opts) {
    opts = opts || {};
    if (raw == null) return { headers: [], rows: [], delimiter: ',', notes: ['empty'] };
    if (raw.length > INGEST_MAX_BYTES) return { headers: [], rows: [], delimiter: ',', notes: ['too-large'], error: 'File exceeds ' + (INGEST_MAX_BYTES / 1024 / 1024) + ' MB limit (' + raw.length + ' bytes).' };
    if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
    raw = raw.replace(/\r\n?/g, '\n');
    var firstLine = '';
    for (var li = 0; li < raw.length; li++) {
      var ch = raw.charAt(li);
      if (ch === '\n') break;
      firstLine += ch;
    }
    if (!firstLine) return { headers: [], rows: [], delimiter: ',', notes: ['empty'] };
    var delim = opts.delimiter;
    if (!delim) {
      var counts = [0, 0, 0];
      for (var k = 0; k < firstLine.length; k++) {
        var ch2 = firstLine.charAt(k);
        if (ch2 === ',') counts[0]++;
        else if (ch2 === '\t') counts[1]++;
        else if (ch2 === ';') counts[2]++;
      }
      delim = counts[1] > counts[0] && counts[1] >= counts[2] ? '\t'
            : counts[2] > counts[0] ? ';' : ',';
    }
    var parsed = _parseDelim(raw, delim);
    if (parsed.length > INGEST_MAX_ROWS) parsed = parsed.slice(0, INGEST_MAX_ROWS);
    // Trim wholly-empty trailing rows (Excel exports often end with one or two)
    while (parsed.length && parsed[parsed.length - 1].every(function (c) { return c === ''; })) parsed.pop();
    if (!parsed.length) return { headers: [], rows: [], delimiter: delim, notes: ['empty'] };
    var hasHeader = opts.hasHeader !== false;
    var firstRow = parsed[0];
    if (hasHeader && firstRow.length && firstRow.every(function (c) { return c !== '' && !isNaN(parseFloat(c)); })) {
      hasHeader = false;
    }
    var headers = hasHeader
      ? firstRow.map(function (s) { return String(s).trim(); })
      : firstRow.map(function (_, i) { return 'col' + (i + 1); });
    var rows = hasHeader ? parsed.slice(1) : parsed;
    var notes = [];
    if (parsed.length === INGEST_MAX_ROWS) notes.push('truncated');
    return { headers: headers, rows: rows, delimiter: delim, notes: notes };
  }

  // Map a parsed table → observation rows via an explicit column mapping.
  // mapping = { xCol:int, yCol:int, phaseCol:int|null, y2Col:int|null, seriesCol:int|null }
  // Numeric fields refuse non-numerics; refused rows are reported in `dropped`
  // (with row index + reason) so the column-mapper can show a parse-receipt
  // panel before the user confirms binding. No row is silently dropped.
  function mapTextTableToObservations(table, mapping) {
    mapping = mapping || {};
    var rows = [], dropped = [];
    if (mapping.xCol == null || mapping.yCol == null) {
      return { rows: rows, dropped: dropped, error: 'Mapping requires xCol and yCol.' };
    }
    if (!table || !Array.isArray(table.rows)) {
      return { rows: rows, dropped: dropped, error: 'Table has no rows.' };
    }
    for (var i = 0; i < table.rows.length; i++) {
      var r = table.rows[i];
      var xRaw = r[mapping.xCol], yRaw = r[mapping.yCol];
      if (xRaw == null || yRaw == null || String(xRaw).trim() === '' || String(yRaw).trim() === '') {
        dropped.push({ rowIdx: i, reason: 'missing-xy', preview: r.slice(0, 6) });
        continue;
      }
      var x = parseFloat(xRaw), y = parseFloat(yRaw);
      if (isNaN(x) || isNaN(y)) {
        dropped.push({ rowIdx: i, reason: 'non-numeric-xy', preview: r.slice(0, 6) });
        continue;
      }
      var row = { x: x, y: y, phase: null };
      if (mapping.phaseCol != null && mapping.phaseCol >= 0) {
        var p = r[mapping.phaseCol];
        row.phase = (p != null && String(p).trim() !== '') ? String(p).trim() : null;
      }
      if (mapping.y2Col != null && mapping.y2Col >= 0) {
        var y2 = parseFloat(r[mapping.y2Col]);
        if (!isNaN(y2)) row.y2 = y2;
      }
      if (mapping.seriesCol != null && mapping.seriesCol >= 0) {
        var s = r[mapping.seriesCol];
        if (s != null && String(s).trim() !== '') row.series = String(s).trim();
      }
      rows.push(row);
    }
    return { rows: rows, dropped: dropped };
  }

  // XLSX parse — caller provides the SheetJS namespace (window.XLSX). The
  // wrapper extracts a single sheet's CSV and delegates to parseTextTable,
  // so the parse path stays deterministic + golden-master-pinnable. If
  // SheetJS is missing or read fails, returns an empty parsed table with
  // a structured `error`; never throws into the render path.
  function parseWorkbookSheet(XLSX, buffer, sheetName) {
    if (!XLSX || typeof XLSX.read !== 'function' || !XLSX.utils || typeof XLSX.utils.sheet_to_csv !== 'function') {
      return { headers: [], rows: [], delimiter: ',', notes: ['xlsx-library-missing'], error: 'SheetJS not loaded — call lazyLoadXLSX() first or paste/upload CSV instead.' };
    }
    try {
      var wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      if (!wb || !wb.SheetNames || !wb.SheetNames.length) {
        return { headers: [], rows: [], delimiter: ',', notes: ['no-sheets'], error: 'Workbook contains no sheets.' };
      }
      var name = sheetName || wb.SheetNames[0];
      if (!wb.Sheets[name]) {
        return { headers: [], rows: [], delimiter: ',', notes: ['no-sheet'], error: 'Sheet "' + name + '" not found. Available: ' + wb.SheetNames.join(', ') };
      }
      var csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
      var parsed = parseTextTable(csv);
      parsed.sheetName = name;
      parsed.sheetNames = wb.SheetNames.slice();
      return parsed;
    } catch (e) {
      return { headers: [], rows: [], delimiter: ',', notes: ['parse-error'], error: 'XLSX parse failed: ' + (e && e.message ? e.message : 'unknown') };
    }
  }

  // The single-call wire-up the UI uses. Accepts a File-like object
  // (name, size, slice, arrayBuffer, text) and returns a Promise<parsed
  // table>. Routes by filename extension; rejects unknown extensions.
  // SheetJS is loaded lazily from a CDN ONLY when an .xlsx file is the
  // first one chosen, and only inside a browser — Node tests never
  // touch the network because they call the pure parsers directly.
  var _xlsxLoadPromise = null;
  function lazyLoadXLSX(cdnUrl) {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (_xlsxLoadPromise) return _xlsxLoadPromise;
    var url = cdnUrl || 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    _xlsxLoadPromise = new Promise(function (resolve, reject) {
      try {
        var s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = function () { resolve(window.XLSX || null); };
        s.onerror = function () { _xlsxLoadPromise = null; reject(new Error('Could not load SheetJS from ' + url)); };
        document.head.appendChild(s);
      } catch (e) { _xlsxLoadPromise = null; reject(e); }
    });
    return _xlsxLoadPromise;
  }

  // JSON -> table. Accepts (a) an array of flat objects (the common export
  // shape: keys become columns in first-seen order), (b) { data:[...] } /
  // { rows:[...] } / { records:[...] } wrapping such an array, (c) an array of
  // arrays (2D; a non-numeric first row is sniffed as a header), or (d) a
  // single object (one row). Pure + L0: cells are stringified, NEVER coerced
  // to numbers here — the downstream column mapper coerces and REFUSES
  // non-numerics exactly as the text path does. Never throws; returns an error
  // note instead so the preview pane can surface it.
  function parseJsonTable(raw) {
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { headers: [], rows: [], delimiter: 'json', notes: [], error: 'Not valid JSON: ' + (e && e.message ? e.message : 'parse error') }; }
    if (data && !Array.isArray(data) && typeof data === 'object') {
      if (Array.isArray(data.data)) data = data.data;
      else if (Array.isArray(data.rows)) data = data.rows;
      else if (Array.isArray(data.records)) data = data.records;
      else data = [data];
    }
    if (!Array.isArray(data)) return { headers: [], rows: [], delimiter: 'json', notes: [], error: 'JSON must be an array of rows (or an object wrapping one in data/rows/records).' };
    if (data.length === 0) return { headers: [], rows: [], delimiter: 'json', notes: ['empty'] };
    var cellStr = function (v) {
      if (v == null) return '';
      if (typeof v === 'object') return JSON.stringify(v); // nested -> stringify (won't read as a number downstream)
      return String(v);
    };
    var notes = [], headers, rows;
    if (Array.isArray(data[0])) {
      var first = data[0];
      var looksHeader = first.length > 0 && first.every(function (c) { return typeof c === 'string' && c !== '' && isNaN(parseFloat(c)); });
      headers = looksHeader ? first.map(function (s) { return String(s).trim(); }) : first.map(function (_, i) { return 'col' + (i + 1); });
      var body = looksHeader ? data.slice(1) : data;
      rows = body.slice(0, INGEST_MAX_ROWS).map(function (r) { return (Array.isArray(r) ? r : [r]).map(cellStr); });
      if (body.length > INGEST_MAX_ROWS) notes.push('truncated');
    } else {
      var keyOrder = [], seen = {};
      data.forEach(function (o) { if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(function (k) { if (!seen[k]) { seen[k] = true; keyOrder.push(k); } }); });
      if (keyOrder.length === 0) return { headers: [], rows: [], delimiter: 'json', notes: [], error: 'JSON rows have no fields to use as columns.' };
      headers = keyOrder;
      rows = data.slice(0, INGEST_MAX_ROWS).map(function (o) { return keyOrder.map(function (k) { return cellStr(o && typeof o === 'object' ? o[k] : undefined); }); });
      if (data.length > INGEST_MAX_ROWS) notes.push('truncated');
    }
    return { headers: headers, rows: rows, delimiter: 'json', notes: notes };
  }

  // Workbook formats SheetJS reads natively (the same XLSX.read path).
  function isWorkbookIngestType(t) { return t === 'xlsx' || t === 'ods' || t === 'xls' || t === 'xlsb'; }

  function ingestFileTypeFromName(name) {
    if (!name || typeof name !== 'string') return null;
    var lower = name.toLowerCase();
    if (/\.xlsx$/.test(lower)) return 'xlsx';
    if (/\.xlsb$/.test(lower)) return 'xlsb';
    if (/\.xls$/.test(lower)) return 'xls';
    if (/\.ods$/.test(lower)) return 'ods';
    if (/\.json$/.test(lower)) return 'json';
    if (/\.tsv$/.test(lower)) return 'tsv';
    if (/\.csv$/.test(lower)) return 'csv';
    if (/\.txt$/.test(lower)) return 'txt';
    return null;
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
    linregress: linregress, slopeInterval: slopeInterval, bootstrapSlopeCI: bootstrapSlopeCI, bootstrapRCI: bootstrapRCI, predictY: predictY,
    // compendium / reactive graph
    makeCompendium: makeCompendium, addObservation: addObservation, markDirty: markDirty, seriesKeys: seriesKeys,
    // claims / prose
    deriveTrendClaim: deriveTrendClaim, deriveAssociationClaim: deriveAssociationClaim, associationSentence: associationSentence,
    trendSentence: trendSentence, refusalSentence: refusalSentence,
    // chart geometry + SR data-table peer (Phase 1)
    REYNA_SAMPLE: REYNA_SAMPLE, PAIRED_SAMPLE: PAIRED_SAMPLE, MULTI_SAMPLE: MULTI_SAMPLE, DEFAULT_BOX: DEFAULT_BOX, plotGeometry: plotGeometry, barGeometry: barGeometry,
    quantiles: quantiles, dotGeometry: dotGeometry, boxGeometry: boxGeometry, histogramBins: histogramBins, histogramGeometry: histogramGeometry,
    scatterGeometry: scatterGeometry, slopeGeometry: slopeGeometry, multiSeriesGeometry: multiSeriesGeometry, groupedBarGeometry: groupedBarGeometry,
    SERIES_PALETTE: SERIES_PALETTE, seriesColor: seriesColor, seriesColorOK: seriesColorOK,
    perSegmentSlopes: perSegmentSlopes, chartSummaryText: chartSummaryText, dataTableModel: dataTableModel, associationTableModel: associationTableModel, multiSeriesTableModel: multiSeriesTableModel,
    // AI-involvement layer (Phase 1) — pure guards + audience faces
    AI_CAVEAT: AI_CAVEAT, HYP_CAVEAT: HYP_CAVEAT, AI_N_FLOOR: AI_N_FLOOR, levelIndex: levelIndex,
    aiAllowed: aiAllowed, buildClaimContext: buildClaimContext, allowedNumbers: allowedNumbers,
    lintL2: lintL2, rankBand: rankBand, validateHypotheses: validateHypotheses, faceFor: faceFor,
    // export + FERPA/sign-off gates (Phase 1)
    escHtml: escHtml, csvSafe: csvSafe, slug: slug, signoffHash: signoffHash, assertDefensible: assertDefensible,
    buildExportHtml: buildExportHtml, buildExportCsv: buildExportCsv,
    // Sourced provenance (Phase 1.x, §16) — engine + curated spine + gates
    NORM_SPINE: NORM_SPINE, DIBELS8_ORF: DIBELS8_ORF, selectNorm: selectNorm, validateNormSpine: validateNormSpine,
    makeSourceRef: makeSourceRef, addSourceRef: addSourceRef, sourcedRenderable: sourcedRenderable,
    benchmarkChipText: benchmarkChipText, sourcedFace: sourcedFace, referenceContrastOK: referenceContrastOK,
    sourcedSignoffHash: sourcedSignoffHash, assertSourcedDefensible: assertSourcedDefensible, assertExportClean: assertExportClean,
    // Ingest (§5 Pillar 1) — pure parsers + column mapper; L0-only by construction
    INGEST_MAX_BYTES: INGEST_MAX_BYTES, INGEST_MAX_ROWS: INGEST_MAX_ROWS, INGEST_DELIMS: INGEST_DELIMS, INGEST_FILE_TYPES: INGEST_FILE_TYPES,
    parseTextTable: parseTextTable, mapTextTableToObservations: mapTextTableToObservations,
    parseWorkbookSheet: parseWorkbookSheet, lazyLoadXLSX: lazyLoadXLSX, parseJsonTable: parseJsonTable, isWorkbookIngestType: isWorkbookIngestType, ingestFileTypeFromName: ingestFileTypeFromName,
    // §16 Phase 2A — human-assisted benchmark-document workspace (PDF/DOCX/TXT/CSV/XLSX → scaffold → per-cell signoff → spine JSON)
    BENCH_DOC_TYPES: BENCH_DOC_TYPES, BENCH_DOC_MAX_BYTES: BENCH_DOC_MAX_BYTES, benchDocTypeFromName: benchDocTypeFromName,
    normalizeBenchExtraction: normalizeBenchExtraction, buildSpineCellScaffold: buildSpineCellScaffold,
    validateProposedSpineCell: validateProposedSpineCell, signoffSpineCell: signoffSpineCell,
    bindVerifiedCellsToSpine: bindVerifiedCellsToSpine, spineCellsToJSON: spineCellsToJSON,
    lazyLoadPdfJs: lazyLoadPdfJs, lazyLoadMammoth: lazyLoadMammoth, extractPdfText: extractPdfText, extractDocxText: extractDocxText
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
          var sourceRefs = Array.isArray(d.sourceRefs) ? d.sourceRefs : []; // §16 external benchmarks
          var chartType = d.chartType || 'trend'; // visualization pathway (trend | bar)
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
          var comp = makeCompendium(d.variable || 'WCPM', d.unit || 'words/min', { measure: d.measure || 'ORF-WCPM', grade: d.benchGrade, seasonWindow: d.benchSeason, variable2: d.variable2, unit2: d.unit2, seriesLabels: d.seriesLabels });
          obs.forEach(function (o) { addObservation(comp, o); });
          var claim = obs.length ? deriveTrendClaim(comp, {}) : null;
          // Scatter argues an ASSOCIATION claim (2nd variable y2 vs primary y), not the trend. activeClaim
          // is what the CURRENT chart renders + tables + summarizes; for every non-scatter view it IS the
          // trend claim, so those paths are byte-identical. The AI/export layer stays bound to the trend.
          var assoc = (chartType === 'scatter' && obs.length) ? deriveAssociationClaim(comp, {}) : null;
          var activeClaim = assoc || claim;
          // Multi-series line: ONE provenance-bound claim PER series tag (each its own n / interval /
          // refusal — never a pooled multi-slope). seriesKeys enumerates EVERY series (anti-cherry-pick).
          var multiKeys = (chartType === 'multiSeriesLine' && obs.length) ? seriesKeys(obs) : [];
          var multiClaims = multiKeys.length ? multiKeys.map(function (k) { return deriveTrendClaim(comp, { series: k, id: 'cs_' + k }); }) : null;
          // Grouped bar = a true (phase × series) comparison; it only "groups" when there's >1 series.
          // gbLabels is a label-carrier (claim-shaped) so the grouped-bar SR table reuses the multi-series peer.
          var groupedMulti = (chartType === 'groupedBar' && obs.length) ? (seriesKeys(obs).length > 1) : false;
          var gbLabels = groupedMulti ? seriesKeys(obs).map(function (k) { return { seriesKey: k, seriesLabel: (comp.seriesLabels && comp.seriesLabels[k]) || k, variable: comp.variable }; }) : null;
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
          var download = function (filename, text, mime) {
            try {
              var blob = new Blob([text], { type: mime || 'text/plain' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a'); a.href = url; a.download = filename;
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(function () { try { URL.revokeObjectURL(url); } catch (eR) { } }, 1000);
            } catch (eD) { upd('exportMsg', 'Export failed: ' + (eD && eD.message)); }
          };
          var exportHtml = function () {
            if (!claim || claim.refused) return;
            var includeAI = levelIndex(ceiling) >= 2;
            var gate = assertExportClean({ audience: audience, aiHyps: includeAI ? d.aiHyps : null, signoff: d.signoff, sourceRefs: sourceRefs, sourceSignoffs: d.sourceSignoffs });
            if (gate.blocked) { upd('exportMsg', gate.reason); announce(gate.reason); return; }
            var out = buildExportHtml(comp, claim, { audience: audience, aiText: d.aiText, aiHyps: d.aiHyps, includeAI: includeAI, sourceRefs: sourceRefs });
            download(out.filename, out.html, 'text/html');
            upd('exportMsg', 'Exported ' + out.filename + ' (max level ' + out.maxLevel + ').');
          };
          var exportCsv = function () {
            if (!claim) return;
            var gate = assertExportClean({ audience: audience, aiHyps: levelIndex(ceiling) >= 2 ? d.aiHyps : null, signoff: d.signoff, sourceRefs: sourceRefs, sourceSignoffs: d.sourceSignoffs });
            if (gate.blocked) { upd('exportMsg', gate.reason); announce(gate.reason); return; }
            if (d.includePII && typeof window !== 'undefined' && window.confirm &&
              !window.confirm('This CSV contains identifiable student data. Export it?')) return;
            var out = buildExportCsv(comp, claim, { includePII: !!d.includePII, sourceRefs: sourceRefs });
            download(out.filename, out.csv, 'text/csv');
            upd('exportMsg', 'Exported ' + out.filename + '.');
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
          // Chart-type switcher — multiple visualization pathways for the same provenance-bound data.
          var ctBtn = function (tp, label) {
            return h('button', { key: 'ct' + tp, 'aria-pressed': chartType === tp ? 'true' : 'false', className: (chartType === tp ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-300') + ' px-2 py-1 text-xs rounded border', onClick: function () { upd('chartType', tp); } }, label);
          };
          kids.push(h('div', { key: 'charttype', className: 'mt-1 flex items-center gap-1 flex-wrap', role: 'group', 'aria-label': 'Chart type' },
            h('span', { className: 'text-xs text-slate-500 mr-1' }, 'Chart:'),
            ctBtn('trend', 'Trend'), ctBtn('bar', 'Bar'), ctBtn('dot', 'Dot'), ctBtn('box', 'Box'), ctBtn('histogram', 'Histogram'), ctBtn('scatter', 'Scatter'), ctBtn('slope', 'Slope'), ctBtn('multiSeriesLine', 'Multi-line'), ctBtn('groupedBar', 'Grouped bar')));

          if (!obs.length) {
            kids.push(h('p', { key: 'empty', className: 'mt-2 text-sm text-slate-600' },
              'No observations yet. Type a few points, or load a sample, to see an honestly-marked trend.'));
          }

          kids.push(h('div', { key: 'entry', className: 'mt-3 flex items-end gap-2 flex-wrap' },
            h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'Week (x)',
              h('input', { type: 'number', value: d.draftX == null ? '' : d.draftX, onChange: function (ev) { upd('draftX', ev.target.value); }, className: 'w-20 px-2 py-1 border rounded' })),
            h('label', { className: 'text-xs text-slate-600 flex flex-col' }, comp.variable + ' (y)',
              h('input', { type: 'number', value: d.draftY == null ? '' : d.draftY, onChange: function (ev) { upd('draftY', ev.target.value); }, className: 'w-24 px-2 py-1 border rounded' })),
            // The 2nd-measure input appears ONLY in the scatter view (calm-by-default: the trend entry stays two fields).
            (chartType === 'scatter' ? h('label', { key: 'y2lab', className: 'text-xs text-slate-600 flex flex-col' }, (comp.variable2 || 'value₂') + ' (y2)',
              h('input', { type: 'number', value: d.draftY2 == null ? '' : d.draftY2, onChange: function (ev) { upd('draftY2', ev.target.value); }, className: 'w-24 px-2 py-1 border rounded' })) : null),
            // The series (category) input appears ONLY in the multi-series view — a category/condition, NOT a person.
            (chartType === 'multiSeriesLine' ? h('label', { key: 'seslab', className: 'text-xs text-slate-600 flex flex-col' }, 'Series (category)',
              h('input', { type: 'text', value: d.draftSeries == null ? '' : d.draftSeries, onChange: function (ev) { upd('draftSeries', ev.target.value); }, className: 'w-28 px-2 py-1 border rounded' })) : null),
            h('button', {
              className: 'px-3 py-1 text-sm font-semibold rounded bg-amber-600 text-white hover:bg-amber-500',
              onClick: function () {
                var x = parseFloat(d.draftX), y = parseFloat(d.draftY);
                if (isNaN(x) || isNaN(y)) { announce('Enter a numeric week and value.'); return; }
                var row = { x: x, y: y, phase: d.draftPhase || null };
                var y2 = parseFloat(d.draftY2);
                if (chartType === 'scatter' && !isNaN(y2)) row.y2 = y2; // paired 2nd measure, scatter only
                if (chartType === 'multiSeriesLine' && d.draftSeries) row.series = d.draftSeries; // category tag, multi-series only
                var next = obs.concat([row]);
                upd('observations', next); upd('draftX', ''); upd('draftY', ''); upd('draftY2', '');
                announce('Added week ' + x + ' equals ' + y + (row.y2 != null ? (' (and ' + row.y2 + ')') : '') + (row.series ? (' [' + row.series + ']') : '') + '. ' + next.length + ' observations.');
              }
            }, '+ Add'),
            h('button', {
              className: 'px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50',
              onClick: function () { upd('observations', REYNA_SAMPLE.slice()); announce('Loaded the Reyna ORF sample: 10 weekly probes across two phases.'); }
            }, 'Use sample (Reyna ORF)'),
            // A PAIRED sample (WCPM + comprehension) only in the scatter view, so the correlation has data to read.
            (chartType === 'scatter' ? h('button', { key: 'paired', className: 'px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50',
              onClick: function () { upd('observations', PAIRED_SAMPLE.slice()); announce('Loaded the paired sample: 10 probes with WCPM and comprehension.'); } }, 'Use paired sample') : null),
            // A MULTI-SERIES sample (one student, two conditions of one measure) only in the multi-line view.
            (chartType === 'multiSeriesLine' ? h('button', { key: 'multi', className: 'px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50',
              onClick: function () { upd('observations', MULTI_SAMPLE.slice()); announce('Loaded the multi-series sample: cold vs practiced WCPM across 8 weeks.'); } }, 'Use multi-series sample') : null),
            // ═══════════════════════════════════════════════════════════════
            // INGEST (§5 Pillar 1) — file picker for CSV/TSV/TXT/XLSX.
            //
            // A hidden file input triggered by a labeled button. Files parse
            // through the pure parseTextTable / parseWorkbookSheet path. The
            // result is stashed at d.importPreview = { headers, rows, mapping,
            // fileName, fileType, error } and the column-mapper panel renders
            // BELOW (out of this flex row). Until the user confirms the
            // mapping, NOTHING is bound into the observations array — this
            // preserves the "INGEST is a binding" pillar: a glance + a
            // confirm, never a silent paste.
            // ═══════════════════════════════════════════════════════════════
            h('label', {
              key: 'imp', htmlFor: 'lumen-file-input',
              className: 'px-3 py-1 text-sm rounded border border-slate-300 hover:bg-slate-50 cursor-pointer',
              title: 'Import a CSV, TSV, JSON, or single-sheet spreadsheet (Excel/ODS) file. Headers are previewed; you map x/y/phase before binding.'
            }, '⇪ Import file…'),
            h('input', {
              key: 'impInput', id: 'lumen-file-input', type: 'file', accept: '.csv,.tsv,.txt,.json,.xlsx,.ods,.xls,.xlsb,text/csv,text/tab-separated-values,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/vnd.ms-excel',
              style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 },
              onChange: function (ev) {
                var file = ev.target && ev.target.files && ev.target.files[0];
                if (!file) return;
                var fileType = ingestFileTypeFromName(file.name);
                if (!fileType) {
                  upd('importPreview', { headers: [], rows: [], mapping: {}, fileName: file.name, fileType: null, error: 'Unsupported file type. Supported: ' + INGEST_FILE_TYPES.join(', ') });
                  announce('File type not supported: ' + file.name);
                  ev.target.value = ''; return;
                }
                if (file.size > INGEST_MAX_BYTES) {
                  upd('importPreview', { headers: [], rows: [], mapping: {}, fileName: file.name, fileType: fileType, error: 'File too large (' + (file.size / 1024 / 1024).toFixed(2) + ' MB > 2 MB limit). Split into smaller files.' });
                  announce('File too large.');
                  ev.target.value = ''; return;
                }
                function landTable(parsed) {
                  var mapping = { xCol: 0, yCol: (parsed.headers.length > 1 ? 1 : 0), phaseCol: null, y2Col: null, seriesCol: null };
                  upd('importPreview', {
                    headers: parsed.headers, rows: parsed.rows, delimiter: parsed.delimiter,
                    notes: parsed.notes || [], sheetName: parsed.sheetName || null, sheetNames: parsed.sheetNames || null,
                    mapping: mapping, fileName: file.name, fileType: fileType, error: parsed.error || null
                  });
                  announce('Loaded ' + file.name + ': ' + parsed.headers.length + ' columns, ' + parsed.rows.length + ' rows. Map the columns and confirm to bind.');
                }
                if (isWorkbookIngestType(fileType)) {
                  lazyLoadXLSX().then(function (XLSX) {
                    file.arrayBuffer().then(function (buf) {
                      landTable(parseWorkbookSheet(XLSX, buf));
                    });
                  }).catch(function (err) {
                    upd('importPreview', { headers: [], rows: [], mapping: {}, fileName: file.name, fileType: fileType, error: 'Could not load the spreadsheet parser library. Try saving the sheet as CSV instead. (' + (err && err.message ? err.message : 'unknown') + ')' });
                    announce('Spreadsheet parser unavailable; try CSV.');
                  });
                } else if (fileType === 'json') {
                  file.text().then(function (text) { landTable(parseJsonTable(text)); });
                } else {
                  file.text().then(function (text) { landTable(parseTextTable(text)); });
                }
                // Reset the input so picking the same file twice still fires onChange.
                ev.target.value = '';
              }
            })
          ));

          // ═══════════════════════════════════════════════════════════════
          // Column-mapper preview panel — renders when an import is staged.
          // Shows the file name, file type, error (if any), first ≤5 rows,
          // and dropdowns for x/y/phase/y2/series column roles. Confirm
          // BINDS the mapped rows into observations (atomic via concat);
          // Cancel discards the preview.
          // ═══════════════════════════════════════════════════════════════
          if (d.importPreview) {
            var ip = d.importPreview;
            var imp = ip.mapping || {};
            var colOpts = (ip.headers || []).map(function (hd, i) { return h('option', { key: 'h' + i, value: String(i) }, (hd || ('col' + (i + 1))) + ' (col ' + (i + 1) + ')'); });
            function setMap(k, v) {
              var next = Object.assign({}, ip, { mapping: Object.assign({}, imp) });
              next.mapping[k] = (v === '' || v == null) ? null : parseInt(v, 10);
              upd('importPreview', next);
            }
            var previewRows = (ip.rows || []).slice(0, 5);
            var dropDownClass = 'w-40 px-2 py-1 border border-slate-300 rounded text-xs';
            kids.push(h('div', { key: 'mapper', className: 'mt-3 p-3 rounded border border-amber-300 bg-amber-50/60' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', { className: 'text-sm font-semibold text-slate-700' }, '⇪ Map columns from ' + (ip.fileName || 'imported file') + (ip.fileType ? (' · ' + ip.fileType + (ip.delimiter && ip.fileType !== 'xlsx' ? (' · delim ' + (ip.delimiter === '\t' ? 'TAB' : '"' + ip.delimiter + '"')) : '')) : '')),
                h('div', { className: 'flex gap-2' },
                  h('button', { className: 'px-3 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50', onClick: function () { upd('importPreview', null); announce('Import cancelled.'); } }, 'Cancel'),
                  h('button', { className: 'px-3 py-1 text-xs font-semibold rounded bg-amber-600 text-white hover:bg-amber-500', onClick: function () {
                    var mapped = mapTextTableToObservations({ headers: ip.headers, rows: ip.rows }, imp);
                    if (mapped.error) { announce('Import error: ' + mapped.error); return; }
                    if (!mapped.rows.length) { announce('Import bound 0 rows (every row missing or non-numeric in the mapped columns).'); return; }
                    var next = obs.concat(mapped.rows);
                    upd('observations', next);
                    upd('importPreview', null);
                    announce('Bound ' + mapped.rows.length + ' observations from ' + (ip.fileName || 'file') + (mapped.dropped.length ? ('; ' + mapped.dropped.length + ' row(s) dropped (missing or non-numeric).') : '.') + ' Total now ' + next.length + '.');
                  } }, 'Confirm + bind'))),
              ip.error ? h('p', { className: 'mt-2 text-xs text-rose-700' }, ip.error) : null,
              (ip.notes && ip.notes.indexOf('truncated') !== -1) ? h('p', { className: 'mt-1 text-xs text-amber-700' }, 'File was truncated at ' + INGEST_MAX_ROWS + ' rows.') : null,
              h('div', { className: 'mt-2 grid grid-cols-2 md:grid-cols-5 gap-2' },
                h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'x column (required)',
                  h('select', { className: dropDownClass, value: imp.xCol == null ? '' : String(imp.xCol), onChange: function (ev) { setMap('xCol', ev.target.value); } }, colOpts)),
                h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'y column (required)',
                  h('select', { className: dropDownClass, value: imp.yCol == null ? '' : String(imp.yCol), onChange: function (ev) { setMap('yCol', ev.target.value); } }, colOpts)),
                h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'phase column (optional)',
                  h('select', { className: dropDownClass, value: imp.phaseCol == null ? '' : String(imp.phaseCol), onChange: function (ev) { setMap('phaseCol', ev.target.value); } },
                    [h('option', { key: 'none', value: '' }, '— none —')].concat(colOpts))),
                (chartType === 'scatter' ? h('label', { key: 'y2map', className: 'text-xs text-slate-600 flex flex-col' }, 'y2 column (scatter only)',
                  h('select', { className: dropDownClass, value: imp.y2Col == null ? '' : String(imp.y2Col), onChange: function (ev) { setMap('y2Col', ev.target.value); } },
                    [h('option', { key: 'none', value: '' }, '— none —')].concat(colOpts))) : null),
                (chartType === 'multiSeriesLine' ? h('label', { key: 'sermap', className: 'text-xs text-slate-600 flex flex-col' }, 'series column (multi-line only)',
                  h('select', { className: dropDownClass, value: imp.seriesCol == null ? '' : String(imp.seriesCol), onChange: function (ev) { setMap('seriesCol', ev.target.value); } },
                    [h('option', { key: 'none', value: '' }, '— none —')].concat(colOpts))) : null)),
              h('div', { className: 'mt-3' },
                h('div', { className: 'text-[11px] font-semibold text-slate-600 mb-1' }, 'First ' + previewRows.length + ' row(s) (of ' + (ip.rows || []).length + ') — headers NEVER reach the AI surface:'),
                h('div', { className: 'overflow-x-auto' },
                  h('table', { className: 'min-w-full text-[11px]' },
                    h('thead', null, h('tr', null, (ip.headers || []).map(function (hd, i) { return h('th', { key: 'th' + i, className: 'px-2 py-1 text-left bg-slate-100 border border-slate-200 font-semibold text-slate-700' }, hd || ('col' + (i + 1))); }))),
                    h('tbody', null, previewRows.map(function (r, ri) {
                      return h('tr', { key: 'tr' + ri }, r.map(function (c, ci) { return h('td', { key: 'td' + ri + '-' + ci, className: 'px-2 py-1 border border-slate-200 text-slate-700' }, c == null ? '' : String(c)); }));
                    }))))),
              h('p', { className: 'mt-2 text-[10px] italic text-slate-500' }, 'Imported values land as L0 (verbatim echoes). Rows missing or non-numeric in the mapped x/y are reported on bind, never silently dropped. No AI call fires during ingest.')));
          }

          // ═══════════════════════════════════════════════════════════════
          // §16 Phase 2A — Benchmark workspace (SOURCED lane).
          //
          // A SEPARATE ingest lane from §17. Drops a benchmark document
          // (PDF/DOCX/TXT/CSV/XLSX), extracts text DETERMINISTICALLY,
          // renders a side-by-side extracted-text + scaffold-cells UI, and
          // produces a paste-back JSON for NORM_SPINE.cells. AI-search is
          // NOT involved (§16.4 Phase 2B stays deferred). Renders only on
          // an explicit toggle so the everyday Lumen workflow stays calm.
          //
          // NOTE on placement: this lives BELOW the chart entry/mapper so
          // a maintainer who opens it does not lose sight of the chart
          // they're contextualizing. The button to open it sits in the
          // entry row above; opening sets d.benchWorkspace.open = true.
          // ═══════════════════════════════════════════════════════════════
          (function () {
            // Open button (always visible in the entry zone — added LAST in the row above)
            kids.push(h('div', { key: 'benchOpener', className: 'mt-2' },
              h('button', {
                className: 'px-3 py-1 text-xs rounded border ' + (d.benchWorkspace && d.benchWorkspace.open ? 'border-cyan-700 bg-cyan-50 text-cyan-800' : 'border-slate-300 hover:bg-slate-50'),
                onClick: function () {
                  var open = !(d.benchWorkspace && d.benchWorkspace.open);
                  var defaults = open ? Object.assign({
                    open: true, fileName: null, fileType: null, error: null,
                    extraction: null, // normalized { kind, pages: [{pageNum,text}] }
                    spineMeta: {
                      measure: NORM_SPINE.measure, unit: NORM_SPINE.unit,
                      source: NORM_SPINE.source, year: NORM_SPINE.year, edition: NORM_SPINE.edition,
                      population: NORM_SPINE.population, locator: NORM_SPINE.locator, citation: NORM_SPINE.citation,
                      gradeRange: NORM_SPINE.gradeRange
                    },
                    grades: null, seasons: ['winter'], percentiles: [50],
                    cells: [], // built from buildSpineCellScaffold on demand
                    activePageIdx: 0,
                    summary: null // populated by Bind verified cells → spine
                  }, d.benchWorkspace || {}) : Object.assign({}, d.benchWorkspace || {}, { open: false });
                  upd('benchWorkspace', defaults);
                  announce(open ? 'Benchmark workspace opened. Import a PDF, DOCX, CSV, TSV, TXT, or single-sheet XLSX to populate the norm spine.' : 'Benchmark workspace closed.');
                }
              }, (d.benchWorkspace && d.benchWorkspace.open ? '▣ Close benchmark workspace' : '▣ Open benchmark workspace (§16 SOURCED)'))));

            if (!d.benchWorkspace || !d.benchWorkspace.open) return;
            var bw = d.benchWorkspace;
            var sm = bw.spineMeta || {};

            function setBench(patch) { upd('benchWorkspace', Object.assign({}, bw, patch)); }

            // Build / refresh scaffold when grades/seasons/percentiles change. Each
            // edit copies any already-typed value from the old scaffold so the user
            // doesn't lose work mid-pick.
            function rebuildScaffold(opts) {
              var byKey = {};
              (bw.cells || []).forEach(function (c) { byKey[c.id] = c; });
              var next = buildSpineCellScaffold(sm, opts || { grades: bw.grades, seasons: bw.seasons, percentiles: bw.percentiles });
              return next.map(function (c) {
                var prev = byKey[c.id];
                if (prev && prev.verified) return Object.assign({}, c, { value: prev.value, sourceExcerpt: prev.sourceExcerpt, verified: true, reviewedOn: prev.reviewedOn, signoffHash: prev.signoffHash });
                if (prev) return Object.assign({}, c, { value: prev.value != null ? prev.value : null, sourceExcerpt: prev.sourceExcerpt || '' });
                return c;
              });
            }

            // Render the workspace
            var pagesText = (bw.extraction && bw.extraction.pages) || [];
            var activePage = pagesText[bw.activePageIdx || 0] || null;
            var verifiedCount = (bw.cells || []).filter(function (c) { return c.verified === true; }).length;
            var totalCount = (bw.cells || []).length;

            kids.push(h('section', { key: 'benchWorkspace', 'aria-label': '§16 SOURCED — benchmark workspace', className: 'mt-3 p-3 rounded-lg border-2 border-cyan-700/40 bg-cyan-50/40' },
              h('div', { className: 'flex items-start gap-3 flex-wrap' },
                h('div', { className: 'flex-1 min-w-[200px]' },
                  h('div', { className: 'text-sm font-semibold text-cyan-900' }, '▣ Benchmark workspace — §16 SOURCED'),
                  h('p', { className: 'text-[11px] text-slate-700 mt-1' },
                    'Drop a benchmark document. Text extracts deterministically (no AI). You byte-check each cell against the source and sign it off; verified cells fold into the NORM_SPINE JSON for paste-back. ',
                    h('strong', null, 'AI-search is intentionally deferred (§16.4 Phase 2B).'))),
                h('label', {
                  htmlFor: 'lumen-bench-file', className: 'px-3 py-1 text-xs rounded border border-cyan-700 bg-white text-cyan-800 hover:bg-cyan-50 cursor-pointer',
                  title: 'PDF, DOCX, CSV, TSV, TXT, or single-sheet XLSX (max ' + (BENCH_DOC_MAX_BYTES / 1024 / 1024) + ' MB).'
                }, '⇪ Import benchmark document…'),
                h('input', {
                  id: 'lumen-bench-file', type: 'file', accept: '.pdf,.docx,.csv,.tsv,.txt,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 },
                  onChange: function (ev) {
                    var file = ev.target && ev.target.files && ev.target.files[0];
                    if (!file) return;
                    var docType = benchDocTypeFromName(file.name);
                    if (!docType) { setBench({ error: 'Unsupported file type. Supported: ' + BENCH_DOC_TYPES.join(', ') }); ev.target.value = ''; return; }
                    if (file.size > BENCH_DOC_MAX_BYTES) { setBench({ error: 'File too large (' + (file.size / 1024 / 1024).toFixed(2) + ' MB > ' + (BENCH_DOC_MAX_BYTES / 1024 / 1024) + ' MB limit).' }); ev.target.value = ''; return; }
                    function land(extraction) {
                      var normalized = normalizeBenchExtraction(extraction);
                      var nextCells = rebuildScaffold();
                      setBench({ fileName: file.name, fileType: docType, error: extraction && extraction.error ? extraction.error : null, extraction: normalized, cells: nextCells, activePageIdx: 0 });
                      announce('Loaded ' + file.name + ': ' + normalized.pages.length + ' page(s). Scaffold has ' + nextCells.length + ' empty cell(s) to verify.');
                    }
                    if (docType === 'pdf') {
                      lazyLoadPdfJs().then(function (pdfjs) { return file.arrayBuffer().then(function (buf) { return extractPdfText(pdfjs, buf); }); }).then(land).catch(function (err) { setBench({ error: 'Could not load pdf.js: ' + (err && err.message ? err.message : 'unknown') + '. Try saving the PDF as plain text and importing that instead.' }); });
                    } else if (docType === 'docx') {
                      lazyLoadMammoth().then(function (mammoth) { return file.arrayBuffer().then(function (buf) { return extractDocxText(mammoth, buf); }); }).then(land).catch(function (err) { setBench({ error: 'Could not load mammoth.js: ' + (err && err.message ? err.message : 'unknown') + '. Try saving the Word doc as plain text.' }); });
                    } else if (docType === 'xlsx') {
                      lazyLoadXLSX().then(function (XLSX) { return file.arrayBuffer().then(function (buf) { return parseWorkbookSheet(XLSX, buf); }); }).then(land);
                    } else {
                      file.text().then(function (text) { land(parseTextTable(text)); });
                    }
                    ev.target.value = '';
                  }
                })),
              bw.fileName ? h('div', { className: 'mt-2 text-[11px] text-slate-700' }, 'Loaded: ', h('strong', null, bw.fileName), bw.fileType ? (' · ' + bw.fileType) : '', pagesText.length ? (' · ' + pagesText.length + ' page(s)') : '') : null,
              bw.error ? h('p', { className: 'mt-2 text-xs text-rose-700' }, bw.error) : null,
              // Scaffold controls
              h('div', { className: 'mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs' },
                h('label', { className: 'flex flex-col text-slate-700' }, 'Grades (e.g. 1-6)',
                  h('input', { type: 'text', value: bw.grades == null ? (sm.gradeRange ? (sm.gradeRange[0] + '-' + sm.gradeRange[1]) : '1-6') : bw.grades.join(','),
                    className: 'w-full px-2 py-1 border border-slate-300 rounded',
                    onChange: function (ev) {
                      var t = String(ev.target.value || '').trim();
                      var gs = [];
                      if (/^\d+\s*[-–]\s*\d+$/.test(t)) { var p = t.split(/[-–]/).map(function (s) { return parseInt(s.trim(), 10); }); for (var g = p[0]; g <= p[1]; g++) gs.push(g); }
                      else { gs = t.split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return !isNaN(n); }); }
                      var nb = Object.assign({}, bw, { grades: gs.length ? gs : null });
                      nb.cells = (function () { var prev = bw.cells; var byKey = {}; (prev || []).forEach(function (c) { byKey[c.id] = c; }); var fresh = buildSpineCellScaffold(sm, { grades: nb.grades, seasons: nb.seasons, percentiles: nb.percentiles }); return fresh.map(function (c) { var pv = byKey[c.id]; return pv ? Object.assign({}, c, pv) : c; }); })();
                      upd('benchWorkspace', nb);
                    } })),
                h('label', { className: 'flex flex-col text-slate-700' }, 'Seasons',
                  h('select', { multiple: true, value: bw.seasons || ['winter'], size: 3,
                    className: 'w-full px-2 py-1 border border-slate-300 rounded',
                    onChange: function (ev) {
                      var picked = Array.prototype.slice.call(ev.target.selectedOptions).map(function (o) { return o.value; });
                      var nb = Object.assign({}, bw, { seasons: picked.length ? picked : ['winter'] });
                      var byKey = {}; (bw.cells || []).forEach(function (c) { byKey[c.id] = c; });
                      var fresh = buildSpineCellScaffold(sm, { grades: nb.grades, seasons: nb.seasons, percentiles: nb.percentiles });
                      nb.cells = fresh.map(function (c) { var pv = byKey[c.id]; return pv ? Object.assign({}, c, pv) : c; });
                      upd('benchWorkspace', nb);
                    } },
                    ['fall', 'winter', 'spring'].map(function (s) { return h('option', { key: s, value: s }, s); }))),
                h('label', { className: 'flex flex-col text-slate-700' }, 'Percentiles (e.g. 25,50,75)',
                  h('input', { type: 'text', value: (bw.percentiles || [50]).join(','),
                    className: 'w-full px-2 py-1 border border-slate-300 rounded',
                    onChange: function (ev) {
                      var ps = String(ev.target.value || '').split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(function (n) { return !isNaN(n) && n >= 1 && n <= 99; });
                      var nb = Object.assign({}, bw, { percentiles: ps.length ? ps : [50] });
                      var byKey = {}; (bw.cells || []).forEach(function (c) { byKey[c.id] = c; });
                      var fresh = buildSpineCellScaffold(sm, { grades: nb.grades, seasons: nb.seasons, percentiles: nb.percentiles });
                      nb.cells = fresh.map(function (c) { var pv = byKey[c.id]; return pv ? Object.assign({}, c, pv) : c; });
                      upd('benchWorkspace', nb);
                    } })),
                h('div', { className: 'flex flex-col justify-end text-slate-700' },
                  h('button', {
                    className: 'px-2 py-1 text-xs rounded border border-cyan-700 bg-white text-cyan-800 hover:bg-cyan-50',
                    onClick: function () { setBench({ cells: rebuildScaffold() }); announce('Scaffold rebuilt: ' + (bw.cells || []).length + ' cells.'); }
                  }, 'Rebuild scaffold (' + totalCount + ' cells, ' + verifiedCount + ' verified)'))),
              // Two-column layout: extracted text | cells
              h('div', { className: 'mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3' },
                // Left: extracted-text pane
                h('div', { className: 'p-2 rounded border border-slate-300 bg-white' },
                  h('div', { className: 'text-[11px] font-semibold text-slate-700 mb-1' }, 'Extracted text (deterministic; no AI parse) — read here, type values on the right'),
                  pagesText.length > 1 ? h('div', { className: 'mb-1 flex flex-wrap gap-1' }, pagesText.map(function (p, i) {
                    return h('button', { key: 'pg' + i, className: 'px-1.5 py-0.5 text-[10px] rounded border ' + (i === (bw.activePageIdx || 0) ? 'border-cyan-700 bg-cyan-50' : 'border-slate-300 hover:bg-slate-50'), onClick: function () { setBench({ activePageIdx: i }); } }, 'p' + (p.pageNum != null ? p.pageNum : (i + 1)));
                  })) : null,
                  h('pre', { className: 'text-[10.5px] leading-snug whitespace-pre-wrap break-words max-h-72 overflow-auto bg-slate-50 p-2 rounded border border-slate-200' }, activePage ? activePage.text : 'No document loaded yet.')),
                // Right: scaffold cells
                h('div', { className: 'p-2 rounded border border-slate-300 bg-white' },
                  h('div', { className: 'text-[11px] font-semibold text-slate-700 mb-1' }, 'Scaffold cells — fill the value, paste the source excerpt, tick to verify'),
                  (bw.cells || []).length === 0 ? h('p', { className: 'text-xs text-slate-500 italic' }, 'Pick a grade range / season / percentile above, then Rebuild scaffold.') :
                  h('div', { className: 'space-y-2 max-h-96 overflow-auto pr-1' }, (bw.cells || []).map(function (c, idx) {
                    var v = validateProposedSpineCell(c);
                    var canVerify = v.ok && !c.verified;
                    return h('div', { key: c.id, className: 'p-2 rounded border ' + (c.verified ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white') },
                      h('div', { className: 'flex items-center justify-between text-[11px] font-semibold text-slate-700' },
                        h('span', null, 'Grade ' + c.grade + ' · ' + c.season + ' · p' + c.percentile + ' · ' + c.measure),
                        c.verified ? h('span', { className: 'text-emerald-700 text-[10px]' }, '✓ verified ' + c.reviewedOn) : null),
                      h('div', { className: 'mt-1 grid grid-cols-2 gap-2' },
                        h('label', { className: 'text-[10.5px] text-slate-600' }, 'Value (' + c.unit + ')',
                          h('input', { type: 'number', step: 'any', value: c.value == null ? '' : c.value, disabled: c.verified,
                            className: 'w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs',
                            onChange: function (ev) {
                              var num = parseFloat(ev.target.value);
                              var next = (bw.cells || []).slice();
                              next[idx] = Object.assign({}, c, { value: isNaN(num) ? null : num });
                              setBench({ cells: next });
                            } })),
                        h('label', { className: 'text-[10.5px] text-slate-600' }, 'Source excerpt (optional, traceability)',
                          h('input', { type: 'text', value: c.sourceExcerpt || '', disabled: c.verified, className: 'w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs',
                            onChange: function (ev) { var next = (bw.cells || []).slice(); next[idx] = Object.assign({}, c, { sourceExcerpt: ev.target.value }); setBench({ cells: next }); } }))),
                      h('div', { className: 'mt-1 flex items-center gap-2' },
                        c.verified ? h('button', { className: 'px-2 py-0.5 text-[10.5px] rounded border border-slate-300 hover:bg-slate-50', onClick: function () { var next = (bw.cells || []).slice(); next[idx] = Object.assign({}, c, { verified: false, reviewedOn: null, signoffHash: null }); setBench({ cells: next }); announce('Cell unverified — edits re-enabled.'); } }, 'Unverify (edit)') :
                          h('button', { disabled: !canVerify, className: 'px-2 py-0.5 text-[10.5px] rounded border ' + (canVerify ? 'border-emerald-700 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed'),
                            onClick: function () {
                              // No Date in this layer — the caller provides reviewedOn as the YYYY-MM-DD of the host. The browser is allowed to use Date here (the render path is not a workflow script).
                              var iso;
                              try { iso = new Date().toISOString().slice(0, 10); } catch (e) { iso = '2026-06-05'; }
                              var copy = Object.assign({}, c);
                              var r = signoffSpineCell(copy, iso);
                              if (!r.ok) { announce('Cannot verify: ' + r.errors.join(', ')); return; }
                              var next = (bw.cells || []).slice();
                              next[idx] = r.cell;
                              setBench({ cells: next });
                              announce('Cell verified: G' + c.grade + ' ' + c.season + ' p' + c.percentile + ' = ' + c.value + '.');
                            } }, '✓ Verify this cell'),
                        v.ok ? null : h('span', { className: 'text-[10px] text-amber-700' }, 'Needs: ' + v.errors.join(', '))));
                  })))),
              // Spine JSON output
              (function () {
                if (verifiedCount === 0) return h('p', { key: 'noOut', className: 'mt-3 text-[10px] italic text-slate-500' }, 'Verify at least one cell to see the paste-back JSON.');
                var verified = (bw.cells || []).filter(function (c) { return c.verified === true; });
                var bound = bindVerifiedCellsToSpine({}, verified);
                var jsonOut = spineCellsToJSON(bound.cells, 2);
                return h('div', { key: 'spineOut', className: 'mt-3 p-2 rounded border border-cyan-300 bg-white' },
                  h('div', { className: 'text-[11px] font-semibold text-slate-700' }, 'Spine cells JSON (paste into stem_tool_lumen.js → NORM_SPINE.cells)'),
                  bound.collisions.length ? h('p', { className: 'mt-1 text-[10px] text-amber-700' }, bound.collisions.length + ' cell(s) excluded: ' + bound.collisions.map(function (c) { return (c.id || c.idx) + ' (' + c.reason + ')'; }).join('; ')) : null,
                  h('pre', { className: 'mt-1 text-[10.5px] leading-snug whitespace-pre-wrap break-words max-h-48 overflow-auto bg-slate-50 p-2 rounded border border-slate-200', id: 'lumen-spine-json' }, jsonOut),
                  h('p', { className: 'mt-2 text-[10px] italic text-slate-500' }, 'After pasting + setting reviewedOn in source, the spine\'s `validateNormSpine` returns "ready" and assertExportClean lets curated benchmark refs draw at IEP-team export. The signoff hash spans every truth-bearing field, so a stale (edited-after) cell re-blocks.'));
              })()));
          })();

          // Multi-series: ONE provenance-bound sentence PER series (refused ones included — anti-cherry-pick).
          // The colour dot beside each is the legend (maps the line colour to its series label).
          if (chartType === 'multiSeriesLine' && multiClaims) {
            kids.push(h('div', { key: 'claim', className: 'mt-3 p-2 rounded bg-white border border-slate-200' },
              h('div', { className: 'flex items-center gap-2 text-xs font-semibold text-slate-700' },
                h('span', { 'aria-hidden': 'true', style: { fontSize: '14px' } }, bundle.glyph),
                h('span', null, bundle.label + ' · ' + multiClaims.length + ' series (same measure)')),
              h('ul', { className: 'mt-1 text-sm' }, multiClaims.map(function (c, i) {
                return h('li', { key: 'msc' + i, className: 'flex items-start gap-2' },
                  h('span', { 'aria-hidden': 'true', style: { color: seriesColor(i), fontSize: '14px', lineHeight: '1' } }, '●'),
                  h('span', null, c.text));
              }))));
          } else if (groupedMulti) {
            // Grouped bar: a colour legend (swatch + label per series) + a descriptive note. The per-cell
            // means + n are in the SR summary; every raw point is in the data table (bars never hide spread).
            kids.push(h('div', { key: 'claim', className: 'mt-3 p-2 rounded bg-white border border-slate-200' },
              h('div', { className: 'flex items-center gap-2 text-xs font-semibold text-slate-700' },
                h('span', { 'aria-hidden': 'true', style: { fontSize: '14px' } }, bundle.glyph),
                h('span', null, bundle.label + ' · ' + comp.variable + ' mean per phase × series')),
              h('div', { className: 'mt-1 flex items-center gap-3 flex-wrap text-xs text-slate-700' }, seriesKeys(obs).map(function (k, i) {
                return h('span', { key: 'leg' + i, className: 'flex items-center gap-1' },
                  h('span', { 'aria-hidden': 'true', style: { color: seriesColor(i), fontSize: '14px', lineHeight: '1' } }, '■'),
                  h('span', null, (comp.seriesLabels && comp.seriesLabels[k]) || k));
              })),
              h('p', { className: 'mt-1 text-[11px] text-slate-500' }, 'Bars are per-cell means (descriptive); small cells (n<3) are faded. Every point is in the data table.')));
          } else if (activeClaim) {
            kids.push(h('div', { key: 'claim', className: 'mt-3 p-2 rounded bg-white border border-slate-200' },
              h('div', { className: 'flex items-center gap-2 text-xs font-semibold text-slate-700' },
                h('span', { 'aria-hidden': 'true', style: { fontSize: '14px' } }, bundle.glyph),
                h('span', null, bundle.label)),
              // Scatter shows the association sentence verbatim (it already carries r + interval + n + the
              // not-causation caveat); the trend/other views keep the audience-faced trend wording.
              h('p', { className: 'text-sm text-slate-800 mt-1' }, assoc ? assoc.text : faceFor(claim, audience))));
          }

          var geo;
          if (chartType === 'multiSeriesLine') {
            // Renders even if SOME series refuse — multiSeriesGeometry shows each series' observed points,
            // and a refused series declares itself in the claim list + SR table.
            geo = (multiClaims && obs.length >= 2) ? plotGeometry(obs, multiClaims, undefined, sourceRefs, chartType) : null;
          } else {
            geo = (obs.length >= 2 && activeClaim && !activeClaim.refused) ? plotGeometry(obs, activeClaim, undefined, sourceRefs, chartType) : null;
          }
          if (geo) {
            var b = geo.box, sk = [];
            geo.yTicks.forEach(function (t, i) {
              sk.push(h('line', { key: 'yg' + i, x1: b.padL, y1: t.sy, x2: b.w - b.padR, y2: t.sy, stroke: '#e2e8f0', strokeWidth: 1 }));
              sk.push(h('text', { key: 'yl' + i, x: b.padL - 4, y: t.sy + 3, textAnchor: 'end', style: { fontSize: '9px' }, fill: '#64748b' }, String(t.y != null ? t.y : t.count)));
            });
            geo.xTicks.forEach(function (t, i) {
              sk.push(h('text', { key: 'xl' + i, x: t.sx, y: b.h - b.padB + 14, textAnchor: 'middle', style: { fontSize: '9px' }, fill: '#64748b' }, String(t.x != null ? t.x : (t.label != null ? t.label : t.value))));
            });
            if (geo.bandPath) sk.push(h('path', { key: 'band', d: geo.bandPath, fill: bundle.ink, fillOpacity: 0.10, stroke: 'none' }));
            if (geo.phaseLines) geo.phaseLines.forEach(function (p, i) {
              sk.push(h('line', { key: 'ph' + i, x1: p.sx, y1: b.padT, x2: p.sx, y2: b.h - b.padB, stroke: '#0f172a', strokeWidth: 1.5, strokeDasharray: '2 3' }));
              sk.push(h('text', { key: 'phl' + i, x: p.sx + 3, y: b.padT + 9, style: { fontSize: '8px' }, fill: '#0f172a' }, 'phase'));
            });
            if (geo.trendPath) sk.push(h('path', { key: 'trend', d: geo.trendPath, fill: 'none', stroke: bundle.ink, strokeWidth: 2, strokeOpacity: bundle.markOpacity, strokeDasharray: bundle.strokeDasharray === 'none' ? undefined : bundle.strokeDasharray }));
            if (geo.points) geo.points.forEach(function (p, i) {
              sk.push(h('g', { key: 'pt' + i },
                h('circle', { cx: p.sx, cy: p.sy, r: 3.5, fill: bundle.ink, fillOpacity: bundle.markOpacity }),
                // the per-mark BURN: each mark carries its own level glyph at full opacity
                h('text', { x: p.sx + 4, y: p.sy - 4, style: { fontSize: '8px' }, fill: bundle.ink, fillOpacity: 1, 'aria-hidden': 'true' }, bundle.glyph)
              ));
            });
            // Bar pathway: each bar is an L0 OBSERVED mark (neutral ink) carrying its level glyph above it.
            if (geo.bars) {
              var l0 = encode('L0');
              geo.bars.forEach(function (bar, i) {
                sk.push(h('rect', { key: 'bar' + i, x: bar.bx, y: bar.by, width: bar.bw, height: Math.max(0, bar.bh), rx: 1, fill: l0.ink, fillOpacity: 0.85 }));
                sk.push(h('text', { key: 'barg' + i, x: bar.cx, y: bar.by - 2, textAnchor: 'middle', style: { fontSize: '8px' }, fill: l0.ink, 'aria-hidden': 'true' }, l0.glyph));
              });
            }
            // Dot pathway: each point is an L0 OBSERVED mark.
            if (geo.dots) {
              var l0d = encode('L0');
              geo.dots.forEach(function (p, i) {
                sk.push(h('circle', { key: 'dot' + i, cx: p.sx, cy: p.sy, r: 4, fill: l0d.ink, fillOpacity: l0d.markOpacity }));
              });
            }
            // Box pathway: a five-number box+whisker per phase (L0 observed spread — q3 on top, q1 on bottom).
            if (geo.boxes) {
              var l0b = encode('L0');
              geo.boxes.forEach(function (bxx, i) {
                var x0 = bxx.cx - bxx.bw / 2, x1 = bxx.cx + bxx.bw / 2;
                sk.push(h('line', { key: 'bw' + i, x1: bxx.cx, y1: bxx.syMax, x2: bxx.cx, y2: bxx.syMin, stroke: l0b.ink, strokeWidth: 1 }));
                sk.push(h('rect', { key: 'bb' + i, x: x0, y: bxx.syQ3, width: bxx.bw, height: Math.max(1, bxx.syQ1 - bxx.syQ3), fill: l0b.ink, fillOpacity: 0.15, stroke: l0b.ink, strokeWidth: 1 }));
                sk.push(h('line', { key: 'bm' + i, x1: x0, y1: bxx.syMed, x2: x1, y2: bxx.syMed, stroke: l0b.ink, strokeWidth: 2 }));
                sk.push(h('text', { key: 'bg' + i, x: bxx.cx, y: bxx.syMax - 3, textAnchor: 'middle', style: { fontSize: '8px' }, fill: l0b.ink, 'aria-hidden': 'true' }, l0b.glyph));
              });
            }
            // Histogram pathway: each bar is an L0 OBSERVED count of values falling in a value-range bin
            // (x = the measured value, NOT time/week; y = how many points landed in that range).
            if (geo.bins) {
              var l0h = encode('L0');
              geo.bins.forEach(function (bn, i) {
                sk.push(h('rect', { key: 'hbin' + i, x: bn.bx, y: bn.by, width: bn.bw, height: Math.max(0, bn.bh), fill: l0h.ink, fillOpacity: 0.8, stroke: '#ffffff', strokeWidth: 0.5 }));
                if (bn.count > 0) sk.push(h('text', { key: 'hbc' + i, x: bn.bx + bn.bw / 2, y: bn.by - 2, textAnchor: 'middle', style: { fontSize: '8px' }, fill: l0h.ink, 'aria-hidden': 'true' }, String(bn.count)));
              });
            }
            // Scatter pathway: L0 OBSERVED pairs (x = primary measure, y = 2nd measure). The optional
            // L1 line of best fit is drawn UNDER the points, thin + dashed, marked as the derived layer
            // (the not-causation caveat lives in the sentence). No connecting line between points.
            if (geo.scatterPoints) {
              var l0s = encode('L0'), l1s = encode('L1');
              if (geo.fitPath) sk.push(h('path', { key: 'fit', d: geo.fitPath, fill: 'none', stroke: l1s.ink, strokeWidth: 1.5, strokeOpacity: 0.7, strokeDasharray: '4 3' }));
              geo.scatterPoints.forEach(function (p, i) {
                sk.push(h('circle', { key: 'sc' + i, cx: p.sx, cy: p.sy, r: 3.5, fill: l0s.ink, fillOpacity: l0s.markOpacity }));
              });
            }
            // Slope pathway: per-phase fitted trend segments (L1 derived); a refused phase (n<2) draws none.
            // The observed points render via the shared geo.dots branch above.
            if (geo.segments) {
              var l1seg = encode('L1');
              geo.segments.forEach(function (s, i) {
                if (s.sx1 == null) return;
                sk.push(h('line', { key: 'seg' + i, x1: s.sx1, y1: s.sy1, x2: s.sx2, y2: s.sy2, stroke: l1seg.ink, strokeWidth: 2.5, strokeOpacity: l1seg.markOpacity }));
                sk.push(h('text', { key: 'segl' + i, x: (s.sx1 + s.sx2) / 2, y: Math.min(s.sy1, s.sy2) - 4, textAnchor: 'middle', style: { fontSize: '8px' }, fill: l1seg.ink, 'aria-hidden': 'true' }, (s.slope > 0 ? '+' : '') + s.slope + (s.small ? '*' : '')));
              });
            }
            // Grouped-bar pathway: bars side-by-side per (phase × series) mean, on a 0-baseline. A small
            // cell (n<3) is faded + dashed + labelled n (provisional, not a confident bar); empty cells
            // draw nothing. The claim-card swatches are the legend.
            if (geo.groups) {
              geo.groups.forEach(function (grp, gi) {
                grp.bars.forEach(function (bar, bi) {
                  if (bar.empty) return; // no fabricated bar for a missing cell
                  var gcol = seriesColor(bar.colorIdx);
                  sk.push(h('rect', { key: 'gb' + gi + '_' + bi, x: bar.bx, y: bar.by, width: bar.bw, height: Math.max(0, bar.bh), rx: 1, fill: gcol, fillOpacity: bar.small ? 0.4 : 0.88, stroke: gcol, strokeWidth: bar.small ? 1 : 0, strokeDasharray: bar.small ? '2 2' : undefined }));
                  if (bar.small) sk.push(h('text', { key: 'gbf' + gi + '_' + bi, x: bar.bx + bar.bw / 2, y: bar.by - 2, textAnchor: 'middle', style: { fontSize: '7px' }, fill: gcol, 'aria-hidden': 'true' }, 'n=' + bar.n));
                });
              });
            }
            // Multi-series pathway: one literal L0 data polyline + observed points per series, each in
            // its own categorical colour (the claim-card colour dots are the legend). No regression line —
            // the per-series slope is reported in words in the claim list.
            if (geo.seriesGeo) {
              geo.seriesGeo.forEach(function (s, si) {
                var col = seriesColor(s.colorIdx);
                if (s.linePath) sk.push(h('path', { key: 'msl' + si, d: s.linePath, fill: 'none', stroke: col, strokeWidth: 2, strokeOpacity: 0.9 }));
                s.points.forEach(function (p, pi) {
                  sk.push(h('circle', { key: 'msc' + si + '_' + pi, cx: p.sx, cy: p.sy, r: 3, fill: col, fillOpacity: 0.95 }));
                });
              });
            }
            // §16: benchmark reference line(s) — teal, dashed, NO data marker (a fact, not a measurement).
            // Horizontal (y=value) for time-series charts; VERTICAL (x=value) for the histogram.
            if (geo.refLines) geo.refLines.forEach(function (rl, i) {
              if (rl.vertical) {
                sk.push(h('line', { key: 'rl' + i, x1: rl.sx, y1: b.padT, x2: rl.sx, y2: b.h - b.padB, stroke: '#0e7490', strokeWidth: 1.5, strokeDasharray: '2 4' }));
                sk.push(h('text', { key: 'rlg' + i, x: rl.sx + 2, y: b.padT + 9, style: { fontSize: '9px' }, fill: '#0e7490', 'aria-hidden': 'true' }, '▣'));
              } else {
                sk.push(h('line', { key: 'rl' + i, x1: b.padL, y1: rl.sy, x2: b.w - b.padR, y2: rl.sy, stroke: '#0e7490', strokeWidth: 1.5, strokeDasharray: '2 4' }));
                sk.push(h('text', { key: 'rlg' + i, x: b.padL + 2, y: rl.sy - 3, style: { fontSize: '9px' }, fill: '#0e7490', 'aria-hidden': 'true' }, '▣'));
              }
            });
            kids.push(h('svg', {
              key: 'svg', viewBox: '0 0 ' + b.w + ' ' + b.h, className: 'w-full mt-3 bg-white rounded-lg border border-slate-200',
              role: 'img', 'aria-label': chartSummaryText(obs, (chartType === 'multiSeriesLine' ? multiClaims : activeClaim), sourceRefs, chartType)
            }, sk));
          }

          // Grouped bar (>1 series) shows the RAW data peer (every point, with its series) so the mean
          // bars can't hide spread; otherwise the trend/scatter/multi peer applies.
          var tableClaim = (chartType === 'multiSeriesLine') ? multiClaims : (groupedMulti ? gbLabels : activeClaim);
          var showTableSection = (chartType === 'multiSeriesLine') ? !!multiClaims : (groupedMulti ? true : (activeClaim && !activeClaim.refused));
          if (showTableSection) {
            var tbl = dataTableModel(obs, tableClaim, sourceRefs);
            kids.push(h('button', { key: 'tbtn', className: 'mt-2 text-xs underline text-slate-600', onClick: function () { upd('showTable', !d.showTable); } },
              d.showTable ? 'Hide data table' : 'Show data table (the chart as a table)'));
            if (d.showTable) {
              kids.push(h('table', { key: 'tbl', className: 'mt-2 text-xs border-collapse' },
                h('thead', null, h('tr', null, tbl.columns.map(function (c, i) { return h('th', { key: 'th' + i, className: 'border px-2 py-0.5 text-left bg-slate-50' }, c); }))),
                h('tbody', null, tbl.rows.map(function (r, i) {
                  if (r.boundary) return h('tr', { key: 'tr' + i }, h('td', { colSpan: 4, className: 'border px-2 py-0.5 italic text-slate-500' }, r.label));
                  if (r.reference) return h('tr', { key: 'tr' + i }, h('td', { colSpan: 4, className: 'border px-2 py-0.5', style: { color: '#0e7490' } }, r.label));
                  return h('tr', { key: 'tr' + i },
                    h('td', { className: 'border px-2 py-0.5' }, String(r.x)),
                    h('td', { className: 'border px-2 py-0.5' }, String(r.y)),
                    // the Series column appears only for the multi-series peer (r.series present); a null
                    // child renders nothing, so the trend/scatter tables stay byte-identical.
                    (r.series !== undefined ? h('td', { className: 'border px-2 py-0.5' }, String(r.series)) : null),
                    h('td', { className: 'border px-2 py-0.5' }, String(r.phase)),
                    h('td', { className: 'border px-2 py-0.5' }, r.level));
                }))));
            }
          }

          // The AI section — only at the L2/L3 ceiling, only when the n-floor gate allows. The AI
          // interpretation layer is trend-shaped (buildClaimContext sends slope/interval), so it is
          // OFF in the scatter view: scatter v1 is a pure L1 correlation (data-only, no AI re-word).
          if (claim && !claim.refused && levelIndex(ceiling) >= 2 && chartType !== 'scatter' && chartType !== 'multiSeriesLine' && chartType !== 'groupedBar') {
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
                  h('p', { className: 'mt-1 text-[10px] text-slate-500' }, HYP_CAVEAT + '. Regenerates each run. Export needs your sign-off.'),
                  (audience === 'iep-team') ? h('div', { key: 'so', className: 'mt-1 text-xs' },
                    (d.signoff === signoffHash(d.aiHyps))
                      ? h('span', { className: 'text-emerald-700' }, '✓ Signed off — kept as an AI reading, not a measured finding.')
                      : h('span', null,
                        h('span', { className: 'text-amber-700 mr-2' }, '⚠ Sign off before an IEP-team export:'),
                        h('button', { className: 'underline mr-2', onClick: function () { upd('signoff', signoffHash(d.aiHyps)); announce('Signed off: AI reading owned.'); } }, 'Own it'),
                        h('button', { className: 'underline', onClick: function () { upd('aiHyps', null); upd('signoff', null); announce('Demoted: AI reading removed.'); } }, 'Demote (remove)'))
                  ) : null));
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

          // §16: external benchmark chip(s) — teal ▣, scheme-checked source link, never the student's data.
          // A benchmark overlay on a scatter is ambiguous (two student measures, not a normed scale), so
          // the chips + picker are hidden in the scatter view — deferred, not faked.
          if (sourceRefs.length && chartType !== 'scatter') {
            kids.push(h('div', { key: 'refchips', className: 'mt-2 flex flex-col gap-1' },
              sourceRefs.filter(function (r) { return sourcedRenderable(r).ok; }).map(function (r, i) {
                var href = /^https?:\/\//i.test(r.locator) ? r.locator : '#';
                return h('div', { key: 'rc' + i, className: 'text-xs', style: { color: '#0e7490' } },
                  h('span', { 'aria-hidden': 'true' }, '▣ '),
                  h('span', null, benchmarkChipText(r) + ' '),
                  h('a', { href: href, target: '_blank', rel: 'noopener noreferrer', className: 'underline' }, 'source'));
              })));
          }
          // The add-from-curated-norms picker (the spine ships EMPTY → selectNorm refuses until a human populates+verifies it).
          if (claim && !claim.refused && chartType !== 'scatter') {
            kids.push(h('div', { key: 'addbench', className: 'mt-2 flex items-end gap-2 flex-wrap' },
              h('span', { className: 'text-xs text-slate-500' }, 'Add ORF benchmark:'),
              h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'Grade',
                h('input', { type: 'number', value: d.benchGrade == null ? '' : d.benchGrade, onChange: function (ev) { upd('benchGrade', ev.target.value === '' ? null : parseInt(ev.target.value, 10)); }, className: 'w-16 px-2 py-1 border rounded' })),
              h('label', { className: 'text-xs text-slate-600 flex flex-col' }, 'Season',
                h('select', { value: d.benchSeason || 'winter', onChange: function (ev) { upd('benchSeason', ev.target.value); }, className: 'px-2 py-1 border rounded' },
                  h('option', { value: 'fall' }, 'fall'), h('option', { value: 'winter' }, 'winter'), h('option', { value: 'spring' }, 'spring'))),
              h('button', {
                className: 'px-2 py-1 text-xs rounded border border-teal-600 text-teal-700 hover:bg-teal-50',
                onClick: function () {
                  var grade = d.benchGrade, season = d.benchSeason || 'winter';
                  var spine = (grade != null && grade >= 7) ? DIBELS8_ORF : NORM_SPINE;
                  var sel = selectNorm(spine, comp, { grade: grade, season: season, percentile: 50 });
                  if (!sel.ok) { upd('benchMsg', sel.reason); announce(sel.reason); return; }
                  var nref = makeSourceRef({
                    kind: spine.kind || 'percentile', measure: spine.measure, unit: spine.unit,
                    grade: grade, season: season, percentile: 50, value: sel.value,
                    source: spine.source, year: spine.year, population: spine.population, table: spine.edition,
                    locator: spine.locator, citation: spine.citation,
                    verified: spine.reviewedOn != null, retrievedBy: 'curated', reviewedOn: spine.reviewedOn
                  }, comp);
                  nref.id = 's' + (sourceRefs.length + 1);
                  upd('sourceRefs', sourceRefs.concat([nref])); upd('benchMsg', '');
                  announce('Added benchmark: ' + nref.keyLabel + '.');
                }
              }, 'Add')));
            if (d.benchMsg) kids.push(h('div', { key: 'benchmsg', className: 'mt-1 text-xs italic text-slate-500' }, d.benchMsg));
          }

          // Export builds the trend (primary-y) brief; the scatter-specific export is deferred, so the
          // buttons are hidden in the scatter view rather than exporting a mismatched trend document.
          // Multi-series + grouped-bar are also hidden: the export brief is a single trend (it would pool the series).
          if (claim && !claim.refused && chartType !== 'scatter' && chartType !== 'multiSeriesLine' && chartType !== 'groupedBar') {
            kids.push(h('div', { key: 'exp', className: 'mt-3 flex items-center gap-2 flex-wrap' },
              h('span', { className: 'text-xs text-slate-500' }, 'Export this view:'),
              h('button', { className: 'px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50', onClick: exportHtml }, 'Brief (HTML)'),
              h('button', { className: 'px-2 py-1 text-xs rounded border border-slate-300 hover:bg-slate-50', onClick: exportCsv }, 'Data (CSV)'),
              h('label', { className: 'text-xs text-slate-600 flex items-center gap-1' },
                h('input', { type: 'checkbox', checked: !!d.includePII, onChange: function (ev) { upd('includePII', ev.target.checked); } }),
                'Include identifiable data (FERPA)')));
            if (d.exportMsg) kids.push(h('div', { key: 'expmsg', className: 'mt-1 text-xs italic text-slate-500' }, d.exportMsg));
          }

          // ══ EVIDENCE INQUIRY widget (H7b'') ══
          kids.push((function() {
            var iq = d.evidenceIQ || { trendStrength: 0.5, sampleSize: 8, baseline: 50, aiLevel: 1, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
            function setIQ(patch) { upd('evidenceIQ', Object.assign({}, iq, patch)); }
            function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
            var slopeConfidence = Math.abs(iq.trendStrength) * Math.sqrt(iq.sampleSize / 12);
            var aiAmplification = iq.aiLevel * 0.5;
            var driftRisk = aiAmplification - slopeConfidence;
            var state = slopeConfidence < 0.4 ? 'insufficient' : slopeConfidence < 0.8 ? 'suggestive' : driftRisk > 0 ? 'overinterpreted' : slopeConfidence > 1.5 ? 'robust' : 'supported';
            var sm = ({
              insufficient: { label: 'Insufficient evidence', color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: 'Slope-to-noise ratio too low. Anything you claim will be defensible only as a hypothesis to test next.' },
              suggestive: { label: 'Suggestive', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: 'Pattern hints at change but could be noise. Useful for generating hypotheses, weak for action.' },
              supported: { label: 'Supported', color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: 'Clear trend with adequate sample. Reasonable basis for action with continued monitoring.' },
              robust: { label: 'Robust', color: '#facc15', bg: '#2a2410', border: '#eab308', desc: 'Strong slope and large sample. Could probably re-derive same conclusion from another subset.' },
              overinterpreted: { label: 'Over-interpreted', color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: 'AI dial cranked too high relative to evidence. The narrative confidence outruns the data — exactly what Lumen\'s ladder is designed to prevent.' }
            })[state];
            return h('div', { key: 'evIQ', className: 'mt-3 p-3 rounded-lg', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
              h('h4', { className: 'text-xs font-black uppercase tracking-wider mb-1', style: { color: sm.color } }, '🔬 Evidence Inquiry — Should I Trust This Trend?'),
              h('p', { className: 'text-[10px] opacity-85 mb-2 leading-snug' }, 'Set trend strength, sample size, baseline, and AI ladder level. Predict where the evidence sits between insufficient and over-interpreted. No score, no reveal.'),
              h('div', { className: 'inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2', style: { background: sm.color, color: '#000' } }, sm.label + ' · slope/noise ' + slopeConfidence.toFixed(2)),
              h('p', { className: 'text-[10px] opacity-80 mb-2' }, sm.desc),
              h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                h('label', { className: 'text-[10px]' },
                  h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, 'Trend strength'), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.trendStrength.toFixed(2))),
                  h('input', { type: 'range', min: 0, max: 2, step: 0.05, value: iq.trendStrength, onChange: function(e) { setKey('trendStrength', parseFloat(e.target.value)); }, className: 'w-full' })
                ),
                h('label', { className: 'text-[10px]' },
                  h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, 'Observations'), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.sampleSize)),
                  h('input', { type: 'range', min: 2, max: 40, step: 1, value: iq.sampleSize, onChange: function(e) { setKey('sampleSize', parseInt(e.target.value, 10)); }, className: 'w-full' })
                ),
                h('label', { className: 'text-[10px]' },
                  h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, 'Baseline value'), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.baseline)),
                  h('input', { type: 'range', min: 0, max: 200, step: 1, value: iq.baseline, onChange: function(e) { setKey('baseline', parseInt(e.target.value, 10)); }, className: 'w-full' })
                ),
                h('label', { className: 'text-[10px]' },
                  h('div', { className: 'flex justify-between mb-0.5' }, h('span', null, 'AI ladder (L0-L3)'), h('span', { className: 'font-mono font-bold', style: { color: sm.color } }, 'L' + iq.aiLevel)),
                  h('input', { type: 'range', min: 0, max: 3, step: 1, value: iq.aiLevel, onChange: function(e) { setKey('aiLevel', parseInt(e.target.value, 10)); }, className: 'w-full' })
                )
              ),
              h('div', { className: 'flex gap-2 mb-2' },
                h('button', { onClick: function() {
                  var t = new Date().toISOString().slice(11, 19);
                  setIQ({ log: iq.log.concat([{ t: t, ts: iq.trendStrength.toFixed(2), n: iq.sampleSize, bl: iq.baseline, ai: 'L' + iq.aiLevel, sc: slopeConfidence.toFixed(2), state: sm.label }]) });
                }, className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, '📋 Log this evidence call'),
                h('button', { onClick: function() { setIQ({ trendStrength: 0.5, sampleSize: 8, baseline: 50, aiLevel: 1 }); }, className: 'px-2 py-1 rounded text-[10px]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, 'Reset')
              ),
              iq.log.length > 0 && h('div', { className: 'p-1.5 rounded text-[9px] font-mono mb-2', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · trend ' + e.ts + ' n' + e.n + ' bl' + e.bl + ' ' + e.ai + ' → s/n ' + e.sc); })
              ),
              h('label', { className: 'block text-[10px] font-bold opacity-85 mb-1' }, 'Your hypothesis (when does dialing AI up start to mislead, and what guard would you add?)'),
              h('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: 'e.g., past L2 you need to surface the slope/noise ratio so the AI cannot manufacture certainty...', className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
              !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[10px] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, "🤔 I'm stuck — show open questions"),
              iq.stuckRevealed && h('div', { className: 'p-2 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                h('div', { className: 'font-bold mb-1', style: { color: sm.color } }, 'Open questions (no answer key)'),
                h('ul', { className: 'pl-4 m-0' },
                  h('li', null, 'Why does Lumen DEFAULT to L1 (math only) and force you to opt up?'),
                  h('li', null, 'A flat baseline with n=40 vs noisy slope with n=8 — which would you act on?'),
                  h('li', null, 'How would you communicate "suggestive" vs "supported" to a parent at an IEP meeting?'),
                  h('li', null, 'When is regression to the mean the real explanation for an apparent trend?')
                )
              ),
              h('label', { className: 'flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1' },
                h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                h('span', null, 'I can explain why this evidence configuration yields this evidentiary state.')
              ),
              iq.understood && h('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: 'Explain in your own words...', className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
              h('p', { className: 'm-0 text-[9px] italic opacity-60' }, 'Inquiry widget — no score, no reveal, no answer dump. Slope-to-noise is a heuristic; formal claims should use seasonal benchmarks, growth norms, and progress-monitoring decision rules (Deno, Fuchs).')
            );
          })());

          kids.push(h('p', { key: 'foot', className: 'mt-3 text-[10px] text-slate-400' },
            'Phase 1 — L1 default fires zero AI; dial up for gated, marked AI. Exports are FERPA-gated (identifiable CSV is opt-in) and IEP-team exports require sign-off on any AI reading. docs/lumen_design.md.'));

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
