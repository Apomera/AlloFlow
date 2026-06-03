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

  var LumenCore = {
    version: 'phase0',
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
    deriveTrendClaim: deriveTrendClaim, trendSentence: trendSentence, refusalSentence: refusalSentence
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
        try {
          if (!h) return null;
          return h('div', { className: 'p-4 rounded-xl bg-amber-50 border border-amber-200 text-slate-800' },
            h('div', { className: 'font-bold text-amber-800' }, '💡 Lumen'),
            h('p', { className: 'text-sm mt-1' },
              'Reactive research canvas — the provenance-bound kernel is installed (Phase 0). ' +
              'Charting, the AI-involvement dial, and the audience faces arrive in Phase 1. ' +
              'See docs/lumen_design.md.')
          );
        } catch (e) {
          // The host renderTool returns null on throw (the blank-tool bug class):
          // always hand back a VISIBLE, announced fallback instead.
          return h ? h('div', { className: 'p-4 text-red-700' }, 'Lumen could not render.') : null;
        }
      }
    });
  }
})();
