// ═══════════════════════════════════════════
// stem_tool_statslab.js — Statistics Lab
// AP Psych / AP Bio focus. Tier A + B (descriptive +
// inferential tests + effect sizes + non-parametric +
// power analysis). Scaffolded better than SPSS for learning:
// transparent computation, plain-English interpretation,
// AI-graded write-ups, decision-tree wizard, AP curriculum
// sample datasets.
// ═══════════════════════════════════════════

// ── StatsLab keyframes (concept-mastery celebration) ──
(function () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('statslab-celeb-css')) return;
  var st = document.createElement('style');
  st.id = 'statslab-celeb-css';
  st.textContent = [
    '@keyframes statslab-celeb-rise {',
    '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
    '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
    '}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

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

  // ── Reduced motion (WCAG 2.3.3) ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (document.getElementById('allo-statslab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-statslab-focus-css';
    st.textContent = '[data-sl-focusable]:focus-visible{outline:3px solid #6366f1!important;outline-offset:2px!important;border-radius:6px}';
    document.head.appendChild(st);
  })();

  // ── Aria-live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-statslab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-statslab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function slAnnounce(msg) {
    try {
      var lr = document.getElementById('allo-live-statslab');
      if (lr) { lr.textContent = ''; setTimeout(function() { lr.textContent = msg; }, 30); }
    } catch (e) {}
  }

  // ──────────────────────────────────────────────────────────────────
  // jStat lazy loader — distributions for p-values
  // Mirrors _ensureDiffLib pattern. ~50KB, MIT-licensed. Has all
  // CDF/PDF/inverse functions for t, F, chi-square, normal we need.
  // ──────────────────────────────────────────────────────────────────
  function _ensureJStat() {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if (window.jStat && typeof window.jStat.studentt === 'object') return Promise.resolve(true);
    if (document.getElementById('jstat-cdn')) {
      return new Promise(function(resolve) {
        var t = setInterval(function() {
          if (window.jStat) { clearInterval(t); resolve(true); }
        }, 50);
        setTimeout(function() { clearInterval(t); resolve(!!window.jStat); }, 5000);
      });
    }
    return new Promise(function(resolve) {
      var s = document.createElement('script');
      s.id = 'jstat-cdn';
      s.src = 'https://cdn.jsdelivr.net/npm/jstat@1.9.6/dist/jstat.min.js';
      s.async = true;
      s.onload = function() { resolve(!!window.jStat); };
      s.onerror = function() { resolve(false); };
      document.head.appendChild(s);
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // PURE STATS FUNCTIONS — descriptive
  // ──────────────────────────────────────────────────────────────────
  function _isNum(x) { return typeof x === 'number' && isFinite(x); }
  function _clean(arr) { return (arr || []).filter(_isNum); }
  function sum(arr) { var x = _clean(arr); var s = 0; for (var i = 0; i < x.length; i++) s += x[i]; return s; }
  function mean(arr) { var x = _clean(arr); return x.length ? sum(x) / x.length : NaN; }
  function median(arr) {
    var x = _clean(arr).slice().sort(function(a, b) { return a - b; });
    if (!x.length) return NaN;
    var mid = Math.floor(x.length / 2);
    return x.length % 2 === 0 ? (x[mid - 1] + x[mid]) / 2 : x[mid];
  }
  function mode(arr) {
    var x = _clean(arr); if (!x.length) return null;
    var freq = {}, max = 0, modes = [];
    x.forEach(function(v) { freq[v] = (freq[v] || 0) + 1; if (freq[v] > max) max = freq[v]; });
    Object.keys(freq).forEach(function(k) { if (freq[k] === max) modes.push(parseFloat(k)); });
    return max === 1 ? null : modes; // no mode if all unique
  }
  function variance(arr, sample) {
    var x = _clean(arr); if (x.length < 2) return NaN;
    var m = mean(x), s = 0;
    for (var i = 0; i < x.length; i++) s += (x[i] - m) * (x[i] - m);
    return s / (x.length - (sample !== false ? 1 : 0));
  }
  function stdDev(arr, sample) { var v = variance(arr, sample); return isFinite(v) ? Math.sqrt(v) : NaN; }
  function quantile(arr, p) {
    var x = _clean(arr).slice().sort(function(a, b) { return a - b; });
    if (!x.length) return NaN;
    var idx = p * (x.length - 1);
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? x[lo] : x[lo] + (idx - lo) * (x[hi] - x[lo]);
  }
  function quartiles(arr) {
    return { q1: quantile(arr, 0.25), q2: quantile(arr, 0.5), q3: quantile(arr, 0.75) };
  }
  function iqr(arr) { var q = quartiles(arr); return q.q3 - q.q1; }
  function range(arr) { var x = _clean(arr); return x.length ? Math.max.apply(null, x) - Math.min.apply(null, x) : NaN; }
  function skewness(arr) {
    var x = _clean(arr); if (x.length < 3) return NaN;
    var m = mean(x), sd = stdDev(x), n = x.length, s = 0;
    for (var i = 0; i < n; i++) s += Math.pow((x[i] - m) / sd, 3);
    return (n / ((n - 1) * (n - 2))) * s;
  }
  function kurtosis(arr) {
    var x = _clean(arr); if (x.length < 4) return NaN;
    var m = mean(x), sd = stdDev(x), n = x.length, s = 0;
    for (var i = 0; i < n; i++) s += Math.pow((x[i] - m) / sd, 4);
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * s - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }
  function summary(arr) {
    var x = _clean(arr);
    if (!x.length) return null;
    var q = quartiles(x);
    return {
      n: x.length, mean: mean(x), median: median(x), mode: mode(x),
      sd: stdDev(x), variance: variance(x), range: range(x),
      min: Math.min.apply(null, x), max: Math.max.apply(null, x),
      q1: q.q1, q3: q.q3, iqr: q.q3 - q.q1,
      skewness: skewness(x), kurtosis: kurtosis(x)
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // INFERENTIAL — Tier A
  // jStat distributions for p-values:
  //   jStat.studentt.cdf(t, df) — t distribution
  //   jStat.centralF.cdf(F, df1, df2) — F distribution
  //   jStat.chisquare.cdf(x, df) — chi-square
  //   jStat.normal.cdf(z, 0, 1) — standard normal
  // ──────────────────────────────────────────────────────────────────

  // p-value helpers (jStat must be loaded)
  function _pTwoTailedT(t, df) {
    if (!window.jStat) return NaN;
    return 2 * (1 - window.jStat.studentt.cdf(Math.abs(t), df));
  }
  function _pOneTailedT(t, df) {
    if (!window.jStat) return NaN;
    return 1 - window.jStat.studentt.cdf(Math.abs(t), df);
  }
  function _pF(F, df1, df2) {
    if (!window.jStat) return NaN;
    return 1 - window.jStat.centralF.cdf(F, df1, df2);
  }
  function _pChiSq(x, df) {
    if (!window.jStat) return NaN;
    return 1 - window.jStat.chisquare.cdf(x, df);
  }
  function _tCrit(df, alpha) {
    if (!window.jStat) return NaN;
    return window.jStat.studentt.inv(1 - alpha / 2, df);
  }

  // ── One-sample t-test ──
  // H0: μ = mu0
  function ttest_oneSample(arr, mu0) {
    var x = _clean(arr); var n = x.length;
    if (n < 2) return { error: 'Need at least 2 data points.' };
    var m = mean(x), sd = stdDev(x), se = sd / Math.sqrt(n);
    var t = (m - mu0) / se;
    var df = n - 1;
    var p2 = _pTwoTailedT(t, df);
    var p1 = _pOneTailedT(t, df);
    var d = (m - mu0) / sd; // Cohen's d
    var crit = _tCrit(df, 0.05);
    return {
      test: 'One-sample t-test',
      n: n, mean: m, mu0: mu0, sd: sd, se: se, t: t, df: df,
      p: p2, pTwoTailed: p2, pOneTailed: p1,
      cohensD: d,
      ci95: [m - crit * se, m + crit * se],
      formula: 't = (M - μ₀) / (s / √n)',
      formulaPlugged: 't = (' + m.toFixed(2) + ' - ' + mu0 + ') / (' + sd.toFixed(2) + ' / √' + n + ')',
    };
  }

  // ── Paired t-test ──
  function ttest_paired(a, b) {
    var n = Math.min(a.length, b.length);
    var diffs = [];
    for (var i = 0; i < n; i++) {
      if (_isNum(a[i]) && _isNum(b[i])) diffs.push(a[i] - b[i]);
    }
    if (diffs.length < 2) return { error: 'Need at least 2 matched pairs.' };
    n = diffs.length;
    var md = mean(diffs), sd = stdDev(diffs), se = sd / Math.sqrt(n);
    var t = md / se;
    var df = n - 1;
    var p2 = _pTwoTailedT(t, df);
    var d = md / sd; // Cohen's d for paired (within)
    var crit = _tCrit(df, 0.05);
    return {
      test: 'Paired-samples t-test',
      n: n, meanDiff: md, sd: sd, se: se, t: t, df: df,
      p: p2, pTwoTailed: p2, pOneTailed: _pOneTailedT(t, df),
      cohensD: d,
      ci95: [md - crit * se, md + crit * se],
      groupAMean: mean(a.slice(0, n)), groupBMean: mean(b.slice(0, n)),
      groupASD: stdDev(a.slice(0, n)), groupBSD: stdDev(b.slice(0, n)),
      formula: 't = M_d / (s_d / √n)',
      formulaPlugged: 't = ' + md.toFixed(2) + ' / (' + sd.toFixed(2) + ' / √' + n + ')',
    };
  }

  // ── Independent samples t-test (Welch's, default) ──
  function ttest_independent(a, b, opts) {
    opts = opts || {};
    var x = _clean(a), y = _clean(b);
    if (x.length < 2 || y.length < 2) return { error: 'Each group needs at least 2 data points.' };
    var n1 = x.length, n2 = y.length;
    var m1 = mean(x), m2 = mean(y);
    var s1 = stdDev(x), s2 = stdDev(y);
    var v1 = s1 * s1, v2 = s2 * s2;
    var t, df, se;
    if (opts.welch === false) {
      // Pooled (assumes equal variances)
      var sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
      se = sp * Math.sqrt(1 / n1 + 1 / n2);
      t = (m1 - m2) / se;
      df = n1 + n2 - 2;
    } else {
      // Welch's (unequal variances) — default
      se = Math.sqrt(v1 / n1 + v2 / n2);
      t = (m1 - m2) / se;
      df = Math.pow(v1 / n1 + v2 / n2, 2) /
           (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
    }
    var p2 = _pTwoTailedT(t, df);
    // Cohen's d (pooled SD)
    var pooledSD = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    var d = (m1 - m2) / pooledSD;
    var crit = _tCrit(df, 0.05);
    return {
      test: opts.welch === false ? "Independent t-test (pooled)" : "Independent t-test (Welch's)",
      welch: opts.welch !== false,
      n1: n1, n2: n2, mean1: m1, mean2: m2, sd1: s1, sd2: s2,
      meanDiff: m1 - m2, se: se, t: t, df: df,
      p: p2, pTwoTailed: p2, pOneTailed: _pOneTailedT(t, df),
      cohensD: d,
      ci95: [(m1 - m2) - crit * se, (m1 - m2) + crit * se],
      formula: opts.welch === false
        ? 't = (M₁ - M₂) / (s_p · √(1/n₁ + 1/n₂))'
        : 't = (M₁ - M₂) / √(s₁²/n₁ + s₂²/n₂)',
      formulaPlugged: 't = (' + m1.toFixed(2) + ' - ' + m2.toFixed(2) + ') / ' + se.toFixed(3),
    };
  }

  // ── One-way ANOVA + Tukey HSD post-hoc ──
  function anova_oneWay(groups) {
    // groups = [[g1 values], [g2 values], ...]
    var cleaned = groups.map(_clean).filter(function(g) { return g.length > 0; });
    if (cleaned.length < 2) return { error: 'Need at least 2 groups.' };
    var k = cleaned.length;
    var grandSum = 0, grandN = 0;
    cleaned.forEach(function(g) { grandSum += sum(g); grandN += g.length; });
    var grandMean = grandSum / grandN;
    var ssBetween = 0, ssWithin = 0;
    cleaned.forEach(function(g) {
      var gm = mean(g);
      ssBetween += g.length * (gm - grandMean) * (gm - grandMean);
      g.forEach(function(v) { ssWithin += (v - gm) * (v - gm); });
    });
    var dfB = k - 1, dfW = grandN - k;
    var msB = ssBetween / dfB, msW = ssWithin / dfW;
    var F = msB / msW;
    var p = _pF(F, dfB, dfW);
    var ssTotal = ssBetween + ssWithin;
    var etaSq = ssBetween / ssTotal;
    // Omega-squared (less biased)
    var omegaSq = (ssBetween - dfB * msW) / (ssTotal + msW);
    // Tukey HSD post-hoc: pairwise comparisons with q-distribution
    var tukey = [];
    if (window.jStat && window.jStat.tukey) {
      for (var i = 0; i < k - 1; i++) {
        for (var j = i + 1; j < k; j++) {
          var n_i = cleaned[i].length, n_j = cleaned[j].length;
          var m_i = mean(cleaned[i]), m_j = mean(cleaned[j]);
          var diff = Math.abs(m_i - m_j);
          var harmonicN = 2 / (1 / n_i + 1 / n_j);
          var q = diff / Math.sqrt(msW / harmonicN);
          var pTukey = 1 - window.jStat.tukey.cdf(q, k, dfW);
          tukey.push({
            i: i, j: j, mean1: m_i, mean2: m_j, diff: m_i - m_j,
            q: q, p: pTukey, sig: pTukey < 0.05
          });
        }
      }
    }
    return {
      test: 'One-way ANOVA',
      k: k, n: grandN, F: F, dfBetween: dfB, dfWithin: dfW,
      ssBetween: ssBetween, ssWithin: ssWithin, ssTotal: ssTotal,
      msBetween: msB, msWithin: msW,
      p: p, etaSquared: etaSq, omegaSquared: omegaSq,
      groupMeans: cleaned.map(mean), groupSDs: cleaned.map(stdDev), groupNs: cleaned.map(function(g) { return g.length; }),
      tukey: tukey,
      formula: 'F = MS_between / MS_within',
      formulaPlugged: 'F = ' + msB.toFixed(2) + ' / ' + msW.toFixed(2),
    };
  }

  // ── Pearson correlation ──
  function pearson(x, y) {
    var pairs = [];
    var n = Math.min(x.length, y.length);
    for (var i = 0; i < n; i++) if (_isNum(x[i]) && _isNum(y[i])) pairs.push([x[i], y[i]]);
    if (pairs.length < 3) return { error: 'Need at least 3 paired data points.' };
    n = pairs.length;
    var xs = pairs.map(function(p) { return p[0]; });
    var ys = pairs.map(function(p) { return p[1]; });
    var mx = mean(xs), my = mean(ys);
    var num = 0, dx = 0, dy = 0;
    for (var i2 = 0; i2 < n; i2++) {
      var a = xs[i2] - mx, b = ys[i2] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    var r = num / Math.sqrt(dx * dy);
    var df = n - 2;
    var t = r * Math.sqrt(df / (1 - r * r));
    var p = _pTwoTailedT(t, df);
    // Fisher z-transform CI
    var z = 0.5 * Math.log((1 + r) / (1 - r));
    var seZ = 1 / Math.sqrt(n - 3);
    var zLo = z - 1.96 * seZ, zHi = z + 1.96 * seZ;
    var rLo = (Math.exp(2 * zLo) - 1) / (Math.exp(2 * zLo) + 1);
    var rHi = (Math.exp(2 * zHi) - 1) / (Math.exp(2 * zHi) + 1);
    return {
      test: 'Pearson correlation',
      n: n, r: r, df: df, t: t, p: p,
      rSquared: r * r,
      ci95: [rLo, rHi],
      formula: 'r = Σ(xᵢ - x̄)(yᵢ - ȳ) / √[Σ(xᵢ - x̄)² · Σ(yᵢ - ȳ)²]',
      formulaPlugged: 'r = ' + num.toFixed(2) + ' / √(' + dx.toFixed(2) + ' · ' + dy.toFixed(2) + ')',
    };
  }

  // ── Spearman rank correlation ──
  function _ranks(arr) {
    var indexed = arr.map(function(v, i) { return { v: v, i: i }; });
    indexed.sort(function(a, b) { return a.v - b.v; });
    var ranks = new Array(arr.length);
    var i = 0;
    while (i < indexed.length) {
      var j = i;
      while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
      // average rank for ties
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) ranks[indexed[k].i] = avg;
      i = j + 1;
    }
    return ranks;
  }
  function spearman(x, y) {
    var pairs = [];
    var n = Math.min(x.length, y.length);
    for (var i = 0; i < n; i++) if (_isNum(x[i]) && _isNum(y[i])) pairs.push([x[i], y[i]]);
    if (pairs.length < 3) return { error: 'Need at least 3 paired data points.' };
    n = pairs.length;
    var rx = _ranks(pairs.map(function(p) { return p[0]; }));
    var ry = _ranks(pairs.map(function(p) { return p[1]; }));
    return Object.assign({}, pearson(rx, ry), {
      test: 'Spearman rank correlation',
      formula: 'ρ = Pearson correlation of ranks',
    });
  }

  // ── Linear regression ──
  function linearRegression(x, y) {
    var pairs = [];
    var n = Math.min(x.length, y.length);
    for (var i = 0; i < n; i++) if (_isNum(x[i]) && _isNum(y[i])) pairs.push([x[i], y[i]]);
    if (pairs.length < 3) return { error: 'Need at least 3 paired data points.' };
    n = pairs.length;
    var xs = pairs.map(function(p) { return p[0]; });
    var ys = pairs.map(function(p) { return p[1]; });
    var mx = mean(xs), my = mean(ys);
    var num = 0, denom = 0;
    for (var i2 = 0; i2 < n; i2++) {
      var dx = xs[i2] - mx;
      num += dx * (ys[i2] - my);
      denom += dx * dx;
    }
    var slope = num / denom;
    var intercept = my - slope * mx;
    // SS calculations
    var ssRes = 0, ssTot = 0;
    for (var i3 = 0; i3 < n; i3++) {
      var pred = slope * xs[i3] + intercept;
      ssRes += (ys[i3] - pred) * (ys[i3] - pred);
      ssTot += (ys[i3] - my) * (ys[i3] - my);
    }
    var rSq = 1 - ssRes / ssTot;
    var adjRSq = 1 - (1 - rSq) * (n - 1) / (n - 2);
    // SE of slope
    var seRes = Math.sqrt(ssRes / (n - 2));
    var seSlope = seRes / Math.sqrt(denom);
    var t = slope / seSlope;
    var df = n - 2;
    var p = _pTwoTailedT(t, df);
    var crit = _tCrit(df, 0.05);
    // Overall F
    var F = (rSq / 1) / ((1 - rSq) / df);
    var pF = _pF(F, 1, df);
    return {
      test: 'Linear regression',
      n: n, slope: slope, intercept: intercept,
      seSlope: seSlope, seResidual: seRes,
      t: t, df: df, p: p,
      F: F, pF: pF,
      rSquared: rSq, adjRSquared: adjRSq,
      ci95Slope: [slope - crit * seSlope, slope + crit * seSlope],
      equation: 'ŷ = ' + slope.toFixed(3) + 'x + ' + intercept.toFixed(3),
      formula: 'b = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²',
      formulaPlugged: 'b = ' + num.toFixed(2) + ' / ' + denom.toFixed(2),
    };
  }

  // ── Chi-square goodness-of-fit ──
  function chiSquareGoodnessOfFit(observed, expected) {
    if (!observed || !expected || observed.length !== expected.length || observed.length < 2) {
      return { error: 'Observed and expected must have ≥2 matching categories.' };
    }
    var x2 = 0;
    for (var i = 0; i < observed.length; i++) {
      if (expected[i] === 0) return { error: 'Expected count cannot be 0.' };
      x2 += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
    var df = observed.length - 1;
    var p = _pChiSq(x2, df);
    return {
      test: 'Chi-square goodness-of-fit',
      chiSquared: x2, df: df, p: p,
      observed: observed, expected: expected,
      categories: observed.length,
      formula: 'χ² = Σ (Oᵢ - Eᵢ)² / Eᵢ',
    };
  }

  // ── Chi-square independence (contingency table) ──
  function chiSquareIndependence(table) {
    // table = [[row1 cells], [row2 cells], ...]
    if (!table || table.length < 2 || table[0].length < 2) {
      return { error: 'Need at least a 2×2 contingency table.' };
    }
    var rows = table.length, cols = table[0].length;
    var rowTotals = [], colTotals = new Array(cols).fill(0), grand = 0;
    for (var i = 0; i < rows; i++) {
      var rt = 0;
      for (var j = 0; j < cols; j++) {
        rt += table[i][j];
        colTotals[j] += table[i][j];
        grand += table[i][j];
      }
      rowTotals.push(rt);
    }
    var x2 = 0;
    var expected = [];
    for (var i2 = 0; i2 < rows; i2++) {
      var er = [];
      for (var j2 = 0; j2 < cols; j2++) {
        var e = (rowTotals[i2] * colTotals[j2]) / grand;
        if (e === 0) return { error: 'Zero marginal — chi-square cannot be computed.' };
        er.push(e);
        x2 += Math.pow(table[i2][j2] - e, 2) / e;
      }
      expected.push(er);
    }
    var df = (rows - 1) * (cols - 1);
    var p = _pChiSq(x2, df);
    // Effect sizes
    var phi = (rows === 2 && cols === 2) ? Math.sqrt(x2 / grand) : null;
    var cramersV = Math.sqrt(x2 / (grand * Math.min(rows - 1, cols - 1)));
    return {
      test: 'Chi-square test of independence',
      chiSquared: x2, df: df, p: p, n: grand,
      observed: table, expected: expected,
      phi: phi, cramersV: cramersV,
      rows: rows, cols: cols,
      formula: 'χ² = Σ Σ (Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ;  Eᵢⱼ = (rowᵢ × colⱼ) / N',
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // EFFECT SIZE INTERPRETATIONS
  // Cohen's d: small=0.2, medium=0.5, large=0.8
  // η²/r²: small=0.01, medium=0.06, large=0.14
  // ──────────────────────────────────────────────────────────────────
  function effectSizeLabel(value, type) {
    var v = Math.abs(value);
    if (type === 'd') {
      if (v < 0.2) return { label: 'negligible', color: '#94a3b8' };
      if (v < 0.5) return { label: 'small', color: '#fbbf24' };
      if (v < 0.8) return { label: 'medium', color: '#f97316' };
      return { label: 'large', color: '#16a34a' };
    }
    if (type === 'eta' || type === 'r2') {
      if (v < 0.01) return { label: 'negligible', color: '#94a3b8' };
      if (v < 0.06) return { label: 'small', color: '#fbbf24' };
      if (v < 0.14) return { label: 'medium', color: '#f97316' };
      return { label: 'large', color: '#16a34a' };
    }
    if (type === 'r') {
      if (v < 0.1) return { label: 'negligible', color: '#94a3b8' };
      if (v < 0.3) return { label: 'small', color: '#fbbf24' };
      if (v < 0.5) return { label: 'medium', color: '#f97316' };
      return { label: 'large', color: '#16a34a' };
    }
    if (type === 'phi' || type === 'v') {
      if (v < 0.1) return { label: 'negligible', color: '#94a3b8' };
      if (v < 0.3) return { label: 'small', color: '#fbbf24' };
      if (v < 0.5) return { label: 'medium', color: '#f97316' };
      return { label: 'large', color: '#16a34a' };
    }
    return { label: '?', color: '#94a3b8' };
  }

  // ──────────────────────────────────────────────────────────────────
  // ASSUMPTION CHECKS
  // ──────────────────────────────────────────────────────────────────
  function assumptionChecks(arr) {
    var x = _clean(arr);
    var warnings = [];
    var n = x.length;
    if (n < 10) warnings.push({
      severity: 'high',
      msg: 'Sample size is small (n=' + n + '). Parametric tests assume larger samples; consider a non-parametric alternative (Mann-Whitney, Wilcoxon) for more robust conclusions.'
    });
    var sk = skewness(x);
    if (Math.abs(sk) > 1) warnings.push({
      severity: 'medium',
      msg: 'Distribution is ' + (sk > 0 ? 'right' : 'left') + '-skewed (skewness = ' + sk.toFixed(2) + '). Consider a non-parametric test if skew exceeds |1|.'
    });
    // Outlier flag (1.5×IQR rule)
    var q = quartiles(x);
    var lo = q.q1 - 1.5 * (q.q3 - q.q1);
    var hi = q.q3 + 1.5 * (q.q3 - q.q1);
    var outliers = x.filter(function(v) { return v < lo || v > hi; });
    if (outliers.length > 0) warnings.push({
      severity: 'low',
      msg: outliers.length + ' potential outlier(s) detected (using 1.5×IQR rule). Inspect: ' + outliers.slice(0, 5).join(', ') + (outliers.length > 5 ? '…' : '')
    });
    return warnings;
  }

  // ──────────────────────────────────────────────────────────────────
  // PLAIN-ENGLISH RESULT INTERPRETATION
  // ──────────────────────────────────────────────────────────────────
  function plainEnglish(result) {
    if (!result || result.error) return result && result.error ? result.error : '';
    var t = result.test;
    var p = result.p;
    if (!_isNum(p)) return 'Result computed; see numbers above.';
    var sigText;
    if (p < 0.001) sigText = 'extremely strong evidence (p < .001)';
    else if (p < 0.01) sigText = 'strong evidence (p = ' + p.toFixed(3) + ')';
    else if (p < 0.05) sigText = 'evidence (p = ' + p.toFixed(3) + ')';
    else if (p < 0.10) sigText = 'weak/marginal evidence (p = ' + p.toFixed(3) + ')';
    else sigText = 'no significant evidence (p = ' + p.toFixed(3) + ')';
    var verdict = p < 0.05 ? 'Significant: ' : 'Not significant: ';
    var msg = '';
    if (/t-test/i.test(t)) {
      msg = verdict + 'your test found ' + sigText + ' for a difference between the means.';
      if (_isNum(result.cohensD)) {
        var lab = effectSizeLabel(result.cohensD, 'd').label;
        msg += ' The effect size (Cohen\'s d = ' + result.cohensD.toFixed(2) + ') is ' + lab + '.';
      }
    } else if (/anova/i.test(t)) {
      msg = verdict + 'your ANOVA found ' + sigText + ' that at least one group differs from the others.';
      if (_isNum(result.etaSquared)) {
        var lab2 = effectSizeLabel(result.etaSquared, 'eta').label;
        msg += ' η² = ' + result.etaSquared.toFixed(3) + ' (' + lab2 + ' effect).';
      }
      if (p < 0.05 && result.tukey && result.tukey.length) {
        var sigs = result.tukey.filter(function(c) { return c.sig; });
        if (sigs.length) msg += ' Post-hoc Tukey HSD: ' + sigs.length + ' pairwise comparison(s) significant at p<.05.';
        else msg += ' Tukey HSD finds no significant pairwise differences (the omnibus F may reflect a small overall trend).';
      }
    } else if (/correlation/i.test(t)) {
      msg = verdict + sigText + ' for a relationship.';
      if (_isNum(result.r)) {
        var direction = result.r > 0 ? 'positive' : 'negative';
        var lab3 = effectSizeLabel(result.r, 'r').label;
        msg += ' r = ' + result.r.toFixed(3) + ' (' + lab3 + ', ' + direction + '). r² = ' + (result.r * result.r).toFixed(3) + ' — about ' + (result.r * result.r * 100).toFixed(0) + '% of variance is shared.';
      }
    } else if (/regression/i.test(t)) {
      msg = verdict + sigText + ' that the predictor has a non-zero effect on the outcome.';
      if (_isNum(result.rSquared)) {
        msg += ' R² = ' + result.rSquared.toFixed(3) + ' — the predictor explains ' + (result.rSquared * 100).toFixed(0) + '% of the variance.';
      }
    } else if (/chi-square/i.test(t)) {
      msg = verdict + sigText + ' for the categorical pattern under test.';
      if (result.cramersV != null) {
        var lab4 = effectSizeLabel(result.cramersV, 'v').label;
        msg += ' Cramér\'s V = ' + result.cramersV.toFixed(3) + ' (' + lab4 + ' association).';
      } else if (result.phi != null) {
        var lab5 = effectSizeLabel(result.phi, 'phi').label;
        msg += ' Phi = ' + result.phi.toFixed(3) + ' (' + lab5 + ' association).';
      }
    } else {
      msg = verdict + sigText + '.';
    }
    return msg;
  }

  // ──────────────────────────────────────────────────────────────────
  // APA-STYLE WRITE-UP GENERATOR (APA 7)
  // ──────────────────────────────────────────────────────────────────
  function apaWriteup(result) {
    if (!result || result.error) return '';
    var t = result.test || '';
    var p = result.p, pStr;
    if (!_isNum(p)) pStr = 'p = ?';
    else if (p < 0.001) pStr = 'p < .001';
    else pStr = 'p = ' + p.toFixed(3).replace(/^0/, '');
    if (/^One-sample t-test/.test(t)) {
      return 't(' + result.df + ') = ' + result.t.toFixed(2) + ', ' + pStr +
        ', d = ' + result.cohensD.toFixed(2) + '. M = ' + result.mean.toFixed(2) + ', SD = ' + result.sd.toFixed(2) +
        '; tested against μ₀ = ' + result.mu0 + '.';
    }
    if (/Paired/.test(t)) {
      return 't(' + result.df + ') = ' + result.t.toFixed(2) + ', ' + pStr +
        ', d = ' + result.cohensD.toFixed(2) + '. Mean difference = ' + result.meanDiff.toFixed(2) + ' (SD = ' + result.sd.toFixed(2) + ').';
    }
    if (/Independent/.test(t)) {
      return 't(' + result.df.toFixed(1) + ') = ' + result.t.toFixed(2) + ', ' + pStr +
        ', d = ' + result.cohensD.toFixed(2) + '. Group 1 (M = ' + result.mean1.toFixed(2) + ', SD = ' + result.sd1.toFixed(2) +
        ', n = ' + result.n1 + ') vs. Group 2 (M = ' + result.mean2.toFixed(2) + ', SD = ' + result.sd2.toFixed(2) + ', n = ' + result.n2 + ').';
    }
    if (/ANOVA/.test(t)) {
      return 'F(' + result.dfBetween + ', ' + result.dfWithin + ') = ' + result.F.toFixed(2) + ', ' + pStr +
        ', η² = ' + result.etaSquared.toFixed(3) + ', ω² = ' + result.omegaSquared.toFixed(3) + '.';
    }
    if (/Pearson/.test(t)) {
      return 'r(' + result.df + ') = ' + result.r.toFixed(2) + ', ' + pStr +
        ', 95% CI [' + result.ci95[0].toFixed(2) + ', ' + result.ci95[1].toFixed(2) + '].';
    }
    if (/Spearman/.test(t)) {
      return 'ρ(' + result.df + ') = ' + result.r.toFixed(2) + ', ' + pStr + '.';
    }
    if (/Linear regression/.test(t)) {
      return 'b = ' + result.slope.toFixed(3) + ', SE = ' + result.seSlope.toFixed(3) +
        ', t(' + result.df + ') = ' + result.t.toFixed(2) + ', ' + pStr +
        '. R² = ' + result.rSquared.toFixed(3) + ', adjusted R² = ' + result.adjRSquared.toFixed(3) +
        ', F(1, ' + result.df + ') = ' + result.F.toFixed(2) + '.';
    }
    if (/goodness-of-fit/.test(t)) {
      return 'χ²(' + result.df + ', N = ' + sum(result.observed) + ') = ' + result.chiSquared.toFixed(2) + ', ' + pStr + '.';
    }
    if (/independence/.test(t)) {
      var es = result.cramersV != null ? ', Cramér\'s V = ' + result.cramersV.toFixed(3)
            : (result.phi != null ? ', φ = ' + result.phi.toFixed(3) : '');
      return 'χ²(' + result.df + ', N = ' + result.n + ') = ' + result.chiSquared.toFixed(2) + ', ' + pStr + es + '.';
    }
    return '';
  }

  // ──────────────────────────────────────────────────────────────────
  // TIER B — Research methods extensions
  // ──────────────────────────────────────────────────────────────────

  // ── Two-way ANOVA (between-subjects, balanced design) ──
  // data = { matrix: [[cell_A1B1, cell_A1B2, ...], [cell_A2B1, ...]], factorAName, factorBName }
  // Each cell is an array of values.
  function anova_twoWay(matrix, factorAName, factorBName) {
    if (!matrix || matrix.length < 2 || !matrix[0] || matrix[0].length < 2) {
      return { error: 'Need at least a 2×2 design.' };
    }
    var rows = matrix.length, cols = matrix[0].length;
    var grandSum = 0, grandN = 0;
    var rowSums = new Array(rows).fill(0), rowNs = new Array(rows).fill(0);
    var colSums = new Array(cols).fill(0), colNs = new Array(cols).fill(0);
    var cellMeans = [], cellNs = [];
    for (var i = 0; i < rows; i++) {
      cellMeans[i] = []; cellNs[i] = [];
      for (var j = 0; j < cols; j++) {
        var cell = _clean(matrix[i][j] || []);
        var cm = cell.length ? mean(cell) : NaN;
        cellMeans[i][j] = cm; cellNs[i][j] = cell.length;
        for (var k = 0; k < cell.length; k++) {
          grandSum += cell[k]; grandN++;
          rowSums[i] += cell[k]; rowNs[i]++;
          colSums[j] += cell[k]; colNs[j]++;
        }
      }
    }
    if (grandN === 0) return { error: 'No data.' };
    var grandMean = grandSum / grandN;
    // SS calculations
    var ssA = 0;  // factor A (rows) main effect
    for (var i2 = 0; i2 < rows; i2++) {
      if (rowNs[i2] > 0) ssA += rowNs[i2] * Math.pow(rowSums[i2] / rowNs[i2] - grandMean, 2);
    }
    var ssB = 0;  // factor B (cols) main effect
    for (var j2 = 0; j2 < cols; j2++) {
      if (colNs[j2] > 0) ssB += colNs[j2] * Math.pow(colSums[j2] / colNs[j2] - grandMean, 2);
    }
    var ssWithin = 0, ssAB = 0;
    for (var i3 = 0; i3 < rows; i3++) {
      for (var j3 = 0; j3 < cols; j3++) {
        var cell3 = _clean(matrix[i3][j3] || []);
        var cm3 = cellMeans[i3][j3];
        if (!isFinite(cm3)) continue;
        var rowMean = rowSums[i3] / rowNs[i3];
        var colMean = colSums[j3] / colNs[j3];
        ssAB += cell3.length * Math.pow(cm3 - rowMean - colMean + grandMean, 2);
        cell3.forEach(function(v) { ssWithin += (v - cm3) * (v - cm3); });
      }
    }
    var ssTotal = ssA + ssB + ssAB + ssWithin;
    var dfA = rows - 1, dfB = cols - 1, dfAB = dfA * dfB, dfW = grandN - rows * cols;
    if (dfW <= 0) return { error: 'Not enough data per cell (need >1 observation in each cell).' };
    var msA = ssA / dfA, msB = ssB / dfB, msAB = ssAB / dfAB, msW = ssWithin / dfW;
    var fA = msA / msW, fB = msB / msW, fAB = msAB / msW;
    var pA = _pF(fA, dfA, dfW), pB = _pF(fB, dfB, dfW), pAB = _pF(fAB, dfAB, dfW);
    return {
      test: 'Two-way ANOVA',
      factorA: factorAName || 'Factor A', factorB: factorBName || 'Factor B',
      n: grandN, rows: rows, cols: cols,
      ssA: ssA, ssB: ssB, ssAB: ssAB, ssWithin: ssWithin, ssTotal: ssTotal,
      dfA: dfA, dfB: dfB, dfAB: dfAB, dfWithin: dfW,
      msA: msA, msB: msB, msAB: msAB, msWithin: msW,
      fA: fA, fB: fB, fAB: fAB,
      pA: pA, pB: pB, pAB: pAB,
      etaSqA: ssA / ssTotal, etaSqB: ssB / ssTotal, etaSqAB: ssAB / ssTotal,
      partialEtaSqA: ssA / (ssA + ssWithin),
      partialEtaSqB: ssB / (ssB + ssWithin),
      partialEtaSqAB: ssAB / (ssAB + ssWithin),
      cellMeans: cellMeans, cellNs: cellNs,
      // Composite p (the "main" verdict — interaction takes precedence)
      p: pAB,
      formula: 'Variance partitioned: SS_total = SS_A + SS_B + SS_AB + SS_within'
    };
  }

  // ── Repeated-measures ANOVA (one-way) ──
  // data = [[subj1_cond1, subj1_cond2, ...], [subj2_cond1, ...], ...]
  // Each row is one subject's measurements across all conditions.
  function anova_repeatedMeasures(data) {
    if (!data || data.length < 2 || !data[0] || data[0].length < 2) {
      return { error: 'Need ≥2 subjects with ≥2 conditions each.' };
    }
    var n = data.length;  // subjects
    var k = data[0].length;  // conditions
    // Verify rectangular
    for (var i = 0; i < n; i++) {
      if (!data[i] || data[i].length !== k) return { error: 'All subjects must have measurements for every condition.' };
    }
    var grandSum = 0;
    var subjMeans = new Array(n).fill(0);
    var condSums = new Array(k).fill(0);
    for (var i2 = 0; i2 < n; i2++) {
      var subjSum = 0;
      for (var j = 0; j < k; j++) {
        var v = data[i2][j];
        grandSum += v;
        subjSum += v;
        condSums[j] += v;
      }
      subjMeans[i2] = subjSum / k;
    }
    var N = n * k;
    var grandMean = grandSum / N;
    // SS calculations
    var ssCond = 0;  // between-conditions (treatment effect)
    for (var j2 = 0; j2 < k; j2++) ssCond += n * Math.pow(condSums[j2] / n - grandMean, 2);
    var ssSubj = 0;  // between-subjects
    for (var i3 = 0; i3 < n; i3++) ssSubj += k * Math.pow(subjMeans[i3] - grandMean, 2);
    var ssTotal = 0;
    for (var i4 = 0; i4 < n; i4++) for (var j4 = 0; j4 < k; j4++) {
      ssTotal += Math.pow(data[i4][j4] - grandMean, 2);
    }
    var ssError = ssTotal - ssCond - ssSubj;  // error term (subjects × conditions interaction)
    var dfCond = k - 1, dfSubj = n - 1, dfError = dfCond * dfSubj;
    var msCond = ssCond / dfCond, msError = ssError / dfError;
    var F = msCond / msError;
    var p = _pF(F, dfCond, dfError);
    var partialEtaSq = ssCond / (ssCond + ssError);
    return {
      test: 'Repeated-measures ANOVA',
      n: n, k: k, F: F, dfCond: dfCond, dfError: dfError,
      ssCond: ssCond, ssSubj: ssSubj, ssError: ssError, ssTotal: ssTotal,
      msCond: msCond, msError: msError,
      p: p, partialEtaSquared: partialEtaSq,
      condMeans: condSums.map(function(s) { return s / n; }),
      formula: 'F = MS_conditions / MS_error;  MS_error from subj×cond interaction'
    };
  }

  // ── Multiple regression (OLS, normal equations) ──
  // x = [[x1_obs1, x2_obs1, ...], [x1_obs2, ...], ...] (rows = obs, cols = predictors)
  // y = [obs1, obs2, ...]
  function multipleRegression(x, y) {
    if (!x || !y || x.length !== y.length || x.length < 3) {
      return { error: 'Need ≥3 observations.' };
    }
    var n = x.length, p = x[0].length;  // p = number of predictors
    if (n <= p + 1) return { error: 'Need at least p+2 observations (have ' + n + ' for ' + p + ' predictors).' };
    // Build design matrix X (n × (p+1)) with leading 1's for intercept
    var X = [];
    for (var i = 0; i < n; i++) {
      var row = [1];
      for (var jj = 0; jj < p; jj++) row.push(x[i][jj]);
      X.push(row);
    }
    // Solve normal equations: β = (XᵀX)⁻¹ Xᵀy
    var XtX = _matMul(_transpose(X), X);
    var XtXinv = _matInv(XtX);
    if (!XtXinv) return { error: 'Predictors are perfectly collinear — cannot invert XᵀX.' };
    var Xty = _matVecMul(_transpose(X), y);
    var beta = _matVecMul(XtXinv, Xty);
    // Predictions, residuals
    var yhat = _matVecMul(X, beta);
    var resid = y.map(function(yi, i) { return yi - yhat[i]; });
    var ymean = mean(y);
    var ssTot = 0, ssRes = 0;
    for (var i2 = 0; i2 < n; i2++) {
      ssTot += (y[i2] - ymean) * (y[i2] - ymean);
      ssRes += resid[i2] * resid[i2];
    }
    var rSq = 1 - ssRes / ssTot;
    var adjRSq = 1 - (1 - rSq) * (n - 1) / (n - p - 1);
    var dfRes = n - p - 1;
    var sigma2 = ssRes / dfRes;
    // SE of each coefficient
    var ses = [];
    for (var k2 = 0; k2 < beta.length; k2++) {
      ses.push(Math.sqrt(sigma2 * XtXinv[k2][k2]));
    }
    var ts = beta.map(function(b, i) { return b / ses[i]; });
    var ps = ts.map(function(t) { return _pTwoTailedT(t, dfRes); });
    // Overall F
    var F = (rSq / p) / ((1 - rSq) / dfRes);
    var pF = _pF(F, p, dfRes);
    return {
      test: 'Multiple linear regression',
      n: n, predictors: p,
      coefficients: beta, ses: ses, ts: ts, ps: ps,
      intercept: beta[0], slopes: beta.slice(1),
      ssTotal: ssTot, ssResidual: ssRes,
      rSquared: rSq, adjRSquared: adjRSq, sigma: Math.sqrt(sigma2),
      F: F, pF: pF, p: pF, df1: p, df2: dfRes,
      formula: 'β̂ = (XᵀX)⁻¹ Xᵀy'
    };
  }
  function _transpose(m) {
    var r = m.length, c = m[0].length, t = [];
    for (var j = 0; j < c; j++) { t[j] = []; for (var i = 0; i < r; i++) t[j][i] = m[i][j]; }
    return t;
  }
  function _matMul(a, b) {
    var r = a.length, c = b[0].length, k = b.length, m = [];
    for (var i = 0; i < r; i++) {
      m[i] = [];
      for (var j = 0; j < c; j++) {
        var s = 0;
        for (var p2 = 0; p2 < k; p2++) s += a[i][p2] * b[p2][j];
        m[i][j] = s;
      }
    }
    return m;
  }
  function _matVecMul(m, v) {
    var r = m.length, c = m[0].length, out = [];
    for (var i = 0; i < r; i++) {
      var s = 0;
      for (var j = 0; j < c; j++) s += m[i][j] * v[j];
      out[i] = s;
    }
    return out;
  }
  function _matInv(m) {
    // Gauss-Jordan elimination
    var n = m.length;
    var aug = [];
    for (var i = 0; i < n; i++) {
      aug[i] = m[i].slice();
      for (var j = 0; j < n; j++) aug[i].push(i === j ? 1 : 0);
    }
    for (var col = 0; col < n; col++) {
      // Find pivot
      var maxRow = col;
      for (var r2 = col + 1; r2 < n; r2++) {
        if (Math.abs(aug[r2][col]) > Math.abs(aug[maxRow][col])) maxRow = r2;
      }
      if (Math.abs(aug[maxRow][col]) < 1e-12) return null;  // singular
      var tmp = aug[col]; aug[col] = aug[maxRow]; aug[maxRow] = tmp;
      var piv = aug[col][col];
      for (var c2 = 0; c2 < 2 * n; c2++) aug[col][c2] /= piv;
      for (var r3 = 0; r3 < n; r3++) {
        if (r3 === col) continue;
        var factor = aug[r3][col];
        for (var c3 = 0; c3 < 2 * n; c3++) aug[r3][c3] -= factor * aug[col][c3];
      }
    }
    var inv = [];
    for (var i2 = 0; i2 < n; i2++) inv[i2] = aug[i2].slice(n);
    return inv;
  }

  // ── Mann-Whitney U test (independent samples, non-parametric) ──
  function mannWhitneyU(a, b) {
    var x = _clean(a), y = _clean(b);
    if (x.length < 2 || y.length < 2) return { error: 'Each group needs ≥2 values.' };
    var n1 = x.length, n2 = y.length;
    var combined = x.concat(y);
    var ranks = _ranks(combined);
    var R1 = 0;
    for (var i = 0; i < n1; i++) R1 += ranks[i];
    var U1 = R1 - n1 * (n1 + 1) / 2;
    var U2 = n1 * n2 - U1;
    var U = Math.min(U1, U2);
    // Normal approximation (good for n > 8)
    var meanU = n1 * n2 / 2;
    var sdU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    var z = (U - meanU) / sdU;
    var p = window.jStat ? 2 * (1 - window.jStat.normal.cdf(Math.abs(z), 0, 1)) : NaN;
    var rRankBiserial = 1 - (2 * U) / (n1 * n2);  // Cliff's delta-style effect size
    return {
      test: 'Mann-Whitney U test',
      n1: n1, n2: n2, U: U, U1: U1, U2: U2,
      z: z, p: p,
      rankBiserial: rRankBiserial,
      formula: 'U = R₁ - n₁(n₁+1)/2;  z = (U - μ_U) / σ_U'
    };
  }

  // ── Wilcoxon signed-rank test (paired non-parametric) ──
  function wilcoxonSignedRank(a, b) {
    var n = Math.min(a.length, b.length);
    var diffs = [];
    for (var i = 0; i < n; i++) {
      if (_isNum(a[i]) && _isNum(b[i])) {
        var d = a[i] - b[i];
        if (d !== 0) diffs.push(d);  // exclude zero diffs
      }
    }
    if (diffs.length < 2) return { error: 'Need ≥2 non-zero paired differences.' };
    n = diffs.length;
    var absRanks = _ranks(diffs.map(Math.abs));
    var Wplus = 0, Wminus = 0;
    for (var i2 = 0; i2 < n; i2++) {
      if (diffs[i2] > 0) Wplus += absRanks[i2];
      else Wminus += absRanks[i2];
    }
    var W = Math.min(Wplus, Wminus);
    var meanW = n * (n + 1) / 4;
    var sdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
    var z = (W - meanW) / sdW;
    var p = window.jStat ? 2 * (1 - window.jStat.normal.cdf(Math.abs(z), 0, 1)) : NaN;
    var rRankBiserial = (Wplus - Wminus) / (n * (n + 1) / 2);
    return {
      test: 'Wilcoxon signed-rank test',
      n: n, W: W, Wplus: Wplus, Wminus: Wminus,
      z: z, p: p,
      rankBiserial: rRankBiserial,
      formula: 'W = min(W₊, W₋);  z = (W - μ_W) / σ_W'
    };
  }

  // ── Kruskal-Wallis test (one-way non-parametric) ──
  function kruskalWallis(groups) {
    var cleaned = groups.map(_clean).filter(function(g) { return g.length > 0; });
    if (cleaned.length < 2) return { error: 'Need ≥2 groups.' };
    var k = cleaned.length;
    var combined = [];
    cleaned.forEach(function(g) { combined = combined.concat(g); });
    var N = combined.length;
    var ranks = _ranks(combined);
    var groupRankSums = [];
    var idx = 0;
    for (var i = 0; i < k; i++) {
      var sumR = 0;
      for (var j = 0; j < cleaned[i].length; j++) sumR += ranks[idx++];
      groupRankSums.push(sumR);
    }
    var H = 0;
    for (var i2 = 0; i2 < k; i2++) {
      H += (groupRankSums[i2] * groupRankSums[i2]) / cleaned[i2].length;
    }
    H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
    var df = k - 1;
    var p = _pChiSq(H, df);
    var etaSqH = (H - k + 1) / (N - k);  // approximate η²H
    return {
      test: 'Kruskal-Wallis H test',
      k: k, N: N, H: H, df: df, p: p,
      etaSquaredH: Math.max(0, etaSqH),
      groupNs: cleaned.map(function(g) { return g.length; }),
      groupRankSums: groupRankSums,
      formula: 'H = [12 / (N(N+1))] · Σ(Rᵢ²/nᵢ) - 3(N+1)'
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // POWER ANALYSIS (Tier B)
  // Cohen's classic formulas for t-test, ANOVA, correlation, chi-square
  // Solves for any one of: effect size, alpha, power, n
  // ──────────────────────────────────────────────────────────────────
  function powerTTest_independent(opts) {
    // Solve for n given d, alpha, power (or vice-versa)
    // Two-tailed independent t-test, equal n per group
    if (!window.jStat) return { error: 'jStat library required for power analysis.' };
    var d = opts.d, alpha = opts.alpha == null ? 0.05 : opts.alpha;
    var power = opts.power == null ? 0.8 : opts.power;
    var n = opts.n;
    if (opts.solve === 'n' || (n == null && d != null)) {
      // Iterate: find smallest n where power ≥ target
      var test_n = 4;
      while (test_n < 5000) {
        var df = 2 * (test_n - 1);
        var ncp = d * Math.sqrt(test_n / 2);  // non-centrality
        var tcrit = window.jStat.studentt.inv(1 - alpha / 2, df);
        // Power ≈ 1 - P(|T| < tcrit | ncp)
        // Use non-central t approximation via z
        var sePower = 1;
        var z = (ncp - tcrit) / sePower;
        var pwr = window.jStat.normal.cdf(z, 0, 1);
        if (pwr >= power) return { n: test_n, d: d, alpha: alpha, power: pwr, total_n: 2 * test_n };
        test_n++;
      }
      return { error: 'Required n exceeds 5000 — effect may be too small to detect at this power.' };
    }
    if (opts.solve === 'power' && n != null && d != null) {
      var df2 = 2 * (n - 1);
      var ncp2 = d * Math.sqrt(n / 2);
      var tcrit2 = window.jStat.studentt.inv(1 - alpha / 2, df2);
      var z2 = (ncp2 - tcrit2);
      var pwr2 = window.jStat.normal.cdf(z2, 0, 1);
      return { power: pwr2, n: n, d: d, alpha: alpha };
    }
    if (opts.solve === 'd' && n != null) {
      // Find minimum detectable d given n, alpha, power
      var df3 = 2 * (n - 1);
      var tcrit3 = window.jStat.studentt.inv(1 - alpha / 2, df3);
      var zPower = window.jStat.normal.inv(power, 0, 1);
      var d_min = (tcrit3 + zPower) / Math.sqrt(n / 2);
      return { d: d_min, n: n, alpha: alpha, power: power };
    }
    return { error: 'Specify what to solve for: solve=n, solve=power, or solve=d.' };
  }
  function powerCorrelation(opts) {
    if (!window.jStat) return { error: 'jStat library required.' };
    var r = opts.r, alpha = opts.alpha == null ? 0.05 : opts.alpha;
    var power = opts.power == null ? 0.8 : opts.power;
    var n = opts.n;
    if (opts.solve === 'n' || (n == null && r != null)) {
      // Fisher z transform
      var zr = 0.5 * Math.log((1 + r) / (1 - r));
      var zAlpha = window.jStat.normal.inv(1 - alpha / 2, 0, 1);
      var zBeta = window.jStat.normal.inv(power, 0, 1);
      var n_req = Math.ceil(Math.pow((zAlpha + zBeta) / zr, 2) + 3);
      return { n: n_req, r: r, alpha: alpha, power: power };
    }
    return { error: 'Currently solves for n only.' };
  }
  function powerChiSquare(opts) {
    if (!window.jStat) return { error: 'jStat library required.' };
    var w = opts.w;  // Cohen's w (effect size)
    var df = opts.df;
    var alpha = opts.alpha == null ? 0.05 : opts.alpha;
    var power = opts.power == null ? 0.8 : opts.power;
    if (opts.solve === 'n' || opts.n == null) {
      var crit = window.jStat.chisquare.inv(1 - alpha, df);
      // Use non-central chi-square approximation
      // Iterate
      var test_n = df + 2;
      while (test_n < 10000) {
        var lambda = w * w * test_n;
        // Approximate non-central chi-square CDF via shifted central
        // Power = 1 - F_{χ²(df, λ)}(crit). Approximate via mean shift.
        var mean_nc = df + lambda;
        var var_nc = 2 * df + 4 * lambda;
        var z = (crit - mean_nc) / Math.sqrt(var_nc);
        var pwr = 1 - window.jStat.normal.cdf(z, 0, 1);
        if (pwr >= power) return { n: test_n, w: w, df: df, alpha: alpha, power: pwr };
        test_n++;
      }
      return { error: 'Required n exceeds 10000.' };
    }
    return { error: 'Currently solves for n.' };
  }
  function powerANOVA(opts) {
    if (!window.jStat) return { error: 'jStat library required.' };
    // Cohen's f effect size; k = number of groups
    var f = opts.f, k = opts.k, alpha = opts.alpha == null ? 0.05 : opts.alpha;
    var power = opts.power == null ? 0.8 : opts.power;
    var n_per_group = opts.n;
    if (opts.solve === 'n' || (n_per_group == null && f != null)) {
      var test_n = 3;
      while (test_n < 1000) {
        var df1 = k - 1, df2 = k * (test_n - 1);
        var ncp = f * f * k * test_n;  // non-centrality parameter
        var Fcrit = window.jStat.centralF.inv(1 - alpha, df1, df2);
        // Approximate power: shift central F by ncp
        var meanF = (df2 / (df2 - 2)) * (1 + ncp / df1);
        var z = (Fcrit - meanF) / 1;
        var pwr = 1 - window.jStat.normal.cdf(z, 0, 1);
        if (pwr >= power) return { n: test_n, total_n: k * test_n, f: f, k: k, alpha: alpha, power: pwr };
        test_n++;
      }
      return { error: 'Required n exceeds 1000.' };
    }
    return { error: 'Currently solves for n.' };
  }

  // ──────────────────────────────────────────────────────────────────
  // CONFIDENCE INTERVAL ON A MEAN
  // ──────────────────────────────────────────────────────────────────
  function ciMean(arr, level) {
    var x = _clean(arr);
    if (x.length < 2) return { error: 'Need ≥2 values.' };
    if (!window.jStat) return { error: 'jStat library required for CIs.' };
    level = level || 0.95;
    var alpha = 1 - level;
    var n = x.length, m = mean(x), sd = stdDev(x), se = sd / Math.sqrt(n);
    var df = n - 1;
    var crit = window.jStat.studentt.inv(1 - alpha / 2, df);
    return { n: n, mean: m, sd: sd, se: se, df: df, level: level, ci: [m - crit * se, m + crit * se] };
  }


  // ──────────────────────────────────────────────────────────────────
  // AP-CURRICULUM SAMPLE DATASETS (8 scenarios)
  // Each pre-loads data + recommended test + research question.
  // ──────────────────────────────────────────────────────────────────
  var SAMPLE_DATASETS = [
    {
      id: 'memory_visualization',
      curriculum: 'AP Psych',
      title: 'Memory: Visualization vs Rote',
      research_question: 'Does visualization-based study lead to better recall than rote rehearsal?',
      recommendedTest: 'ttest_independent',
      data: {
        groupA: { label: 'Visualization', values: [18, 22, 25, 21, 24, 20, 23, 26, 19, 22, 25, 28, 24, 21, 23] },
        groupB: { label: 'Rote rehearsal', values: [15, 17, 14, 19, 16, 18, 13, 20, 15, 17, 16, 19, 14, 18, 16] }
      },
      hint: 'Two independent groups, different study strategies, continuous outcome (recall score) → independent-samples t-test.'
    },
    {
      id: 'stroop_paired',
      curriculum: 'AP Psych',
      title: 'Stroop Effect (Paired)',
      research_question: 'Do students take longer to name colors of incongruent vs congruent color words?',
      recommendedTest: 'ttest_paired',
      data: {
        groupA: { label: 'Congruent RT (ms)', values: [450, 425, 510, 480, 465, 495, 440, 475, 460, 490, 455, 470, 485, 445, 500] },
        groupB: { label: 'Incongruent RT (ms)', values: [620, 590, 705, 660, 635, 685, 605, 650, 625, 670, 615, 640, 665, 615, 700] }
      },
      hint: 'Same subjects measured twice (within-subjects) → paired-samples t-test.'
    },
    {
      id: 'sleep_test_correlation',
      curriculum: 'AP Psych',
      title: 'Sleep × Test Score',
      research_question: 'Does hours of sleep predict test performance?',
      recommendedTest: 'pearson',
      data: {
        groupA: { label: 'Hours of sleep', values: [4, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 6, 7, 8, 5, 9, 6, 7] },
        groupB: { label: 'Test score (%)', values: [62, 68, 71, 75, 78, 82, 79, 85, 88, 84, 90, 92, 89, 73, 81, 87, 65, 91, 76, 83] }
      },
      hint: 'Two continuous variables, looking for relationship → Pearson correlation. (Linear regression also works.)'
    },
    {
      id: 'bystander_groups',
      curriculum: 'AP Psych',
      title: 'Bystander Effect',
      research_question: 'Does helping rate decline as group size increases?',
      recommendedTest: 'anova_oneWay',
      data: {
        groups: [
          { label: 'Alone', values: [85, 82, 88, 79, 86, 90, 83, 87, 84, 89] },
          { label: 'Group of 3', values: [62, 58, 65, 60, 63, 67, 59, 64, 61, 66] },
          { label: 'Group of 5', values: [45, 41, 48, 43, 46, 50, 42, 47, 44, 49] },
          { label: 'Group of 10', values: [28, 25, 31, 27, 29, 33, 26, 30, 28, 32] }
        ]
      },
      hint: 'Four independent groups, continuous outcome (helping rate %) → one-way ANOVA. Post-hoc Tukey reveals which groups differ.'
    },
    {
      id: 'enzyme_kinetics',
      curriculum: 'AP Bio',
      title: 'Enzyme Kinetics',
      research_question: 'How does substrate concentration affect reaction rate?',
      recommendedTest: 'linearRegression',
      data: {
        groupA: { label: 'Substrate [mM]', values: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0] },
        groupB: { label: 'Rate (μmol/min)', values: [0.25, 0.45, 0.62, 0.78, 0.92, 1.05, 1.15, 1.24, 1.32, 1.39, 1.50, 1.58, 1.64, 1.69, 1.73] }
      },
      hint: 'Continuous predictor, continuous outcome, predict-from relationship → linear regression. Note: real Michaelis-Menten is non-linear; linear fit shows initial-velocity region.'
    },
    {
      id: 'plant_growth_2way',
      curriculum: 'AP Bio',
      title: 'Plant Growth: Fertilizer × Light',
      research_question: 'Do fertilizer type and light level interact in their effect on plant growth?',
      recommendedTest: 'anova_twoWay',
      factorA: 'Fertilizer',
      factorB: 'Light',
      data: {
        twoWay: {
          factorALevels: ['Organic', 'Synthetic', 'None'],
          factorBLevels: ['Low light', 'High light'],
          matrix: [
            [[8, 9, 10, 8, 9], [14, 15, 16, 15, 14]],     // Organic × [Low, High]
            [[7, 9, 8, 10, 8], [18, 19, 20, 18, 19]],     // Synthetic × [Low, High]
            [[5, 6, 4, 5, 6], [9, 10, 8, 9, 11]]          // None × [Low, High]
          ]
        }
      },
      hint: 'Two categorical factors (fertilizer × light), continuous outcome → two-way ANOVA. Look for main effects + interaction.'
    },
    {
      id: 'hardy_weinberg',
      curriculum: 'AP Bio',
      title: 'Hardy-Weinberg Equilibrium',
      research_question: 'Do observed allele frequencies match Hardy-Weinberg expectations?',
      recommendedTest: 'chiSquareGoodnessOfFit',
      data: {
        observed: [212, 416, 172],   // AA, Aa, aa
        expected: [205.6, 432.0, 162.4],
        labels: ['AA homozygous', 'Aa heterozygous', 'aa homozygous']
      },
      hint: 'Categorical outcome (genotype) compared against theoretical proportions → chi-square goodness-of-fit. p > .05 means population is in equilibrium.'
    },
    {
      id: 'handedness_major',
      curriculum: 'AP Psych',
      title: 'Handedness × Major',
      research_question: 'Is handedness related to choice of academic major?',
      recommendedTest: 'chiSquareIndependence',
      data: {
        contingency: {
          rowLabels: ['Right-handed', 'Left-handed'],
          colLabels: ['STEM', 'Humanities', 'Arts'],
          table: [[120, 95, 65], [18, 14, 22]]
        }
      },
      hint: 'Two categorical variables (handedness × major), looking for association → chi-square test of independence.'
    },
    {
      id: 'therapy_satisfaction',
      curriculum: 'AP Psych',
      title: 'CBT vs Mindfulness — patient ratings',
      research_question: 'Do patients rate CBT differently from mindfulness on a 1-7 satisfaction scale?',
      recommendedTest: 'mannWhitneyU',
      data: {
        // Likert-scale ratings — ordinal, not continuous, so non-parametric is the right call
        groupA: { label: 'CBT (1-7)', values: [5, 6, 4, 6, 5, 7, 5, 6, 4, 5, 6, 6, 5, 7, 6, 4, 5, 6, 7, 5] },
        groupB: { label: 'Mindfulness (1-7)', values: [4, 3, 5, 3, 4, 4, 5, 3, 4, 3, 4, 5, 4, 3, 5, 4, 3, 4, 4, 5] }
      },
      hint: 'Likert ratings are ordinal (ranked), not continuous. Use Mann-Whitney U instead of an independent t-test.'
    },
    {
      id: 'training_repeated',
      curriculum: 'AP Bio',
      title: 'Endurance Training (3 weeks, same subjects)',
      research_question: 'Does VO₂max improve over 3 weeks of training?',
      recommendedTest: 'anova_repeatedMeasures',
      data: {
        // 12 subjects measured at 3 timepoints — multi-group input format reads as 3 columns
        groups: [
          { label: 'Week 1', values: [35.2, 38.1, 41.5, 39.0, 42.8, 36.7, 40.3, 37.5, 43.1, 38.9, 41.0, 39.6] },
          { label: 'Week 2', values: [37.8, 40.5, 43.9, 41.4, 45.1, 39.0, 42.7, 39.8, 45.4, 41.2, 43.4, 41.9] },
          { label: 'Week 3', values: [40.5, 43.2, 46.6, 44.0, 47.8, 41.6, 45.3, 42.4, 48.1, 43.8, 46.0, 44.5] }
        ]
      },
      hint: 'Same subjects measured at 3 timepoints → repeated-measures ANOVA. The within-subjects design controls for individual baseline differences.'
    },
    {
      id: 'gpa_predictors',
      curriculum: 'AP Psych',
      title: 'GPA: IQ × Sleep × Study Hours',
      research_question: 'Which predicts college GPA best — IQ, hours of sleep, or hours studied per week?',
      recommendedTest: 'multipleRegression',
      data: {
        multiReg: {
          // 25 students; predictors = [IQ, sleep_hrs, study_hrs]; outcome = GPA
          xLabels: ['IQ', 'Sleep (hrs)', 'Study (hrs/wk)'],
          yLabel: 'GPA',
          x: [
            [105, 7, 12], [120, 8, 18], [98, 6, 8], [115, 7, 15], [108, 7, 11],
            [125, 8, 22], [102, 6, 9], [118, 8, 17], [110, 7, 13], [95, 5, 7],
            [122, 9, 20], [107, 7, 12], [113, 8, 14], [100, 6, 9], [128, 8, 25],
            [104, 7, 10], [116, 8, 16], [109, 7, 12], [121, 8, 19], [99, 6, 8],
            [112, 7, 14], [106, 7, 11], [124, 9, 21], [101, 6, 9], [119, 8, 18]
          ],
          y: [
            3.0, 3.6, 2.7, 3.4, 3.1,
            3.8, 2.8, 3.5, 3.2, 2.5,
            3.7, 3.0, 3.3, 2.8, 4.0,
            2.9, 3.4, 3.1, 3.6, 2.7,
            3.2, 3.0, 3.7, 2.8, 3.5
          ]
        }
      },
      hint: 'Three continuous predictors → multiple regression. Look at each predictor\'s β to compare relative importance, and R² to see total variance explained.'
    }
  ];
  function getSample(id) {
    for (var i = 0; i < SAMPLE_DATASETS.length; i++) if (SAMPLE_DATASETS[i].id === id) return SAMPLE_DATASETS[i];
    return null;
  }

  // ──────────────────────────────────────────────────────────────────
  // TEST WIZARD — decision tree
  // ──────────────────────────────────────────────────────────────────
  var WIZARD_TESTS = {
    ttest_oneSample: { label: 'One-sample t-test', desc: 'Compare your sample mean against a known value (μ₀).' },
    ttest_paired: { label: 'Paired-samples t-test', desc: 'Same subjects measured twice (e.g. before/after).' },
    ttest_independent: { label: 'Independent t-test (Welch\'s)', desc: 'Two separate groups of subjects.' },
    anova_oneWay: { label: 'One-way ANOVA', desc: '3+ independent groups, continuous outcome.' },
    anova_repeatedMeasures: { label: 'Repeated-measures ANOVA', desc: 'Same subjects across 3+ conditions.' },
    anova_twoWay: { label: 'Two-way ANOVA', desc: 'Two factors crossed (e.g. drug × dose).' },
    pearson: { label: 'Pearson correlation', desc: 'Two continuous variables, look for linear relationship.' },
    spearman: { label: 'Spearman correlation', desc: 'Like Pearson, but for ranked or non-normal data.' },
    linearRegression: { label: 'Linear regression', desc: 'Predict one continuous variable from another.' },
    multipleRegression: { label: 'Multiple regression', desc: 'Predict outcome from 2+ predictors.' },
    chiSquareGoodnessOfFit: { label: 'Chi-square goodness-of-fit', desc: 'Compare observed counts to expected.' },
    chiSquareIndependence: { label: 'Chi-square independence', desc: 'Two categorical variables, look for association.' },
    mannWhitneyU: { label: 'Mann-Whitney U', desc: 'Non-parametric alternative to independent t-test.' },
    wilcoxonSignedRank: { label: 'Wilcoxon signed-rank', desc: 'Non-parametric alternative to paired t-test.' },
    kruskalWallis: { label: 'Kruskal-Wallis H', desc: 'Non-parametric alternative to one-way ANOVA.' }
  };

  // ──────────────────────────────────────────────────────────────────
  // PLUGIN REGISTRATION + UI
  // ──────────────────────────────────────────────────────────────────
  window.StemLab.registerTool('statsLab', {
    icon: '📊',
    label: 'Statistics Lab',
    desc: 'Inferential statistics: t-tests, ANOVA, correlation, regression, chi-square, non-parametric, power analysis. AP Psych / AP Bio focus. Transparent computation, plain-English results, APA write-ups, AI interpretation grader.',
    color: 'indigo',
    category: 'math',
    questHooks: [
      { id: 'sl_first_test', label: 'Run your first hypothesis test', icon: '📊',
        check: function(d) { return (d.testsRun || 0) >= 1; },
        progress: function(d) { return (d.testsRun || 0) + '/1 tests run'; } },
      { id: 'sl_compare_means', label: 'Run a t-test or ANOVA', icon: '⚖️',
        check: function(d) { return !!(d.compareMeansRun); },
        progress: function(d) { return d.compareMeansRun ? '✓' : 'pending'; } },
      { id: 'sl_correlation', label: 'Run a correlation analysis', icon: '🔗',
        check: function(d) { return !!(d.correlationRun); },
        progress: function(d) { return d.correlationRun ? '✓' : 'pending'; } },
      { id: 'sl_regression', label: 'Fit a regression model', icon: '📈',
        check: function(d) { return !!(d.regressionRun); },
        progress: function(d) { return d.regressionRun ? '✓' : 'pending'; } },
      { id: 'sl_significance_found', label: 'Find a significant result (p < .05)', icon: '🎯',
        check: function(d) { return !!(d.significantResult); },
        progress: function(d) { return d.significantResult ? '✓' : 'pending'; } },
      { id: 'sl_meaningful_effect', label: 'Find a large effect size', icon: '💪',
        check: function(d) { return !!(d.largeEffectFound); },
        progress: function(d) { return d.largeEffectFound ? '✓' : 'pending'; } },
      { id: 'sl_apa_writeup', label: 'Use the APA write-up generator', icon: '📋',
        check: function(d) { return (d.apaCopied || 0) >= 1; },
        progress: function(d) { return (d.apaCopied || 0) + '/1 APA write-ups copied'; } },
      { id: 'sl_power_analysis', label: 'Use the power / sample-size calculator', icon: '🔋',
        check: function(d) { return !!(d.powerRun); },
        progress: function(d) { return d.powerRun ? '✓' : 'pending'; } },
      { id: 'sl_ai_graded', label: 'Get AI feedback on your interpretation', icon: '🤖',
        check: function(d) { return (d.aiGradeOpens || 0) >= 1; },
        progress: function(d) { return (d.aiGradeOpens || 0) + '/1 AI grades requested'; } },
      { id: 'sl_ap_quiz', label: 'Complete an AP exam quiz (≥4/5 correct)', icon: '📝',
        check: function(d) { return (d.quizCompletedCount || 0) >= 1 && (d.quizCorrect || 0) >= 4; },
        progress: function(d) { return (d.quizCompletedCount || 0) > 0 ? 'best: ' + (d.quizCorrect || 0) + '/5' : 'pending'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var callGemini = ctx.callGemini;

      // ── State init ──
      if (!labToolData || !labToolData.statsLab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { statsLab: {
            testsRun: 0,
            mode: 'home',                  // 'home' | 'wizard' | 'data' | 'test' | 'results'
            wizardStep: 0,
            wizardAnswers: {},
            selectedTest: null,
            // Data — flexible holder for current test's input
            sampleId: null,                // active sample dataset
            twoColData: { aLabel: 'Group A', bLabel: 'Group B', a: [], b: [] },
            multiColData: { groups: [{ label: 'Group 1', values: [] }, { label: 'Group 2', values: [] }] },
            oneColData: { values: [], mu0: 0 },
            chiGofData: { observed: [], expected: [], labels: [] },
            chiIndepData: { rows: ['Row 1', 'Row 2'], cols: ['Col 1', 'Col 2'], table: [[0, 0], [0, 0]] },
            twoWayData: null,
            multiRegData: { x: [], y: [], xLabels: ['X1'] },
            // Power analysis
            powerInputs: { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n', vizD: 0.5, vizN: 30, vizAlpha: 0.05 },
            // Last result
            lastResult: null,
            lastTestType: null,
            // AI grader
            interpretationDraft: '',
            aiGradeResponse: null,
            aiGradeLoading: false,
            aiGradeOpens: 0,
            // Show toggles
            showMath: false,
            showWizard: false
          }});
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } },
          '📊 Initializing Statistics Lab...');
      }
      var d = labToolData.statsLab;

      // ── Concept-mastery state + Canvas-survival persistence ──
      // The StemLab host's localStorage block does not include statsLab,
      // so the tool resets every reload by default. Layer our own:
      // window slot → localStorage → existing host state, plus a project-
      // JSON ride-along (the only layer that survives Canvas sandboxing).
      var _slMasteryHydratedRef = React.useRef(false);
      if (!_slMasteryHydratedRef.current) {
        _slMasteryHydratedRef.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowStatsLab) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('statsLab.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.quizMastery && !d.quizMastery) merge.quizMastery = seed.quizMastery;
            if (seed.quizCompletedCount != null && !d.quizCompletedCount) merge.quizCompletedCount = seed.quizCompletedCount;
            if (Object.keys(merge).length > 0) {
              setLabToolData(function (prev) {
                return Object.assign({}, prev, { statsLab: Object.assign({}, prev.statsLab, merge) });
              });
            }
          }
        } catch (e) {}
      }

      // First-correct-on-question celebration (mirrors Optics + Pets pattern).
      var _slCelebState = React.useState(null);
      var slCeleb = _slCelebState[0];
      var setSlCeleb = _slCelebState[1];

      // Mirror mastery slice to window slot + localStorage.
      React.useEffect(function () {
        try {
          var snapshot = {
            quizMastery: d.quizMastery || {},
            quizCompletedCount: d.quizCompletedCount || 0,
            _ts: Date.now()
          };
          window.__alloflowStatsLab = snapshot;
          try { localStorage.setItem('statsLab.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [d.quizMastery, d.quizCompletedCount]);

      // Hot-reload from project-JSON load mid-session.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowStatsLab || {};
            setLabToolData(function (prev) {
              var patch = {};
              if (w.quizMastery) patch.quizMastery = w.quizMastery;
              if (w.quizCompletedCount != null) patch.quizCompletedCount = w.quizCompletedCount;
              return Object.assign({}, prev, { statsLab: Object.assign({}, prev.statsLab, patch) });
            });
          } catch (e) {}
        }
        window.addEventListener('alloflow-statslab-restored', onRestore);
        return function () { window.removeEventListener('alloflow-statslab-restored', onRestore); };
      }, []);
      function upd(k, v) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev);
          next.statsLab = Object.assign({}, prev.statsLab, typeof k === 'object' ? k : { [k]: v });
          return next;
        });
      }

      // jStat preload — fire once on mount so first test is instant
      React.useEffect(function() {
        _ensureJStat();
      }, []);

      // ── Run a test ──
      // excludeOutliers: when true, strip 1.5×IQR outliers from the relevant
      // arrays before running. Used by the "Re-run minus outliers" button.
      function runTest(testType, excludeOutliers) {
        return _ensureJStat().then(function(ok) {
          if (!ok) {
            if (addToast) addToast('Stats library failed to load — check connection.', 'error');
            return;
          }
          var result = null;
          // Optionally strip outliers from the loaded inputs
          var oneColVals = excludeOutliers ? _stripOutliers(d.oneColData.values).kept : d.oneColData.values;
          var twoColA = excludeOutliers ? _stripOutliers(d.twoColData.a).kept : d.twoColData.a;
          var twoColB = excludeOutliers ? _stripOutliers(d.twoColData.b).kept : d.twoColData.b;
          var multiCol = excludeOutliers
            ? d.multiColData.groups.map(function(g) { return _stripOutliers(g.values).kept; })
            : d.multiColData.groups.map(function(g) { return g.values; });
          var nRemoved = excludeOutliers
            ? _outlierIndices(d.oneColData.values).length + _outlierIndices(d.twoColData.a).length + _outlierIndices(d.twoColData.b).length
              + d.multiColData.groups.reduce(function(acc, g) { return acc + _outlierIndices(g.values).length; }, 0)
            : 0;
          try {
            if (testType === 'ttest_oneSample') {
              result = ttest_oneSample(oneColVals, d.oneColData.mu0);
            } else if (testType === 'ttest_paired') {
              result = ttest_paired(twoColA, twoColB);
            } else if (testType === 'ttest_independent') {
              result = ttest_independent(twoColA, twoColB);
            } else if (testType === 'anova_oneWay') {
              result = anova_oneWay(multiCol);
            } else if (testType === 'anova_repeatedMeasures') {
              // Reshape multiCol into [subj × cond] matrix, transposed
              var rmGroups = multiCol;
              var nSubj = Math.min.apply(null, rmGroups.map(function(g) { return g.length; }));
              var rmData = [];
              for (var s = 0; s < nSubj; s++) {
                var row = [];
                for (var c = 0; c < rmGroups.length; c++) row.push(rmGroups[c][s]);
                rmData.push(row);
              }
              result = anova_repeatedMeasures(rmData);
            } else if (testType === 'anova_twoWay') {
              if (!d.twoWayData) result = { error: 'Load the AP Bio Plant Growth sample to use two-way ANOVA.' };
              else result = anova_twoWay(d.twoWayData.matrix, d.twoWayData.factorAName || 'Factor A', d.twoWayData.factorBName || 'Factor B');
            } else if (testType === 'pearson') {
              result = pearson(twoColA, twoColB);
            } else if (testType === 'spearman') {
              result = spearman(twoColA, twoColB);
            } else if (testType === 'linearRegression') {
              result = linearRegression(twoColA, twoColB);
            } else if (testType === 'multipleRegression') {
              result = multipleRegression(d.multiRegData.x, d.multiRegData.y);
            } else if (testType === 'chiSquareGoodnessOfFit') {
              result = chiSquareGoodnessOfFit(d.chiGofData.observed, d.chiGofData.expected);
            } else if (testType === 'chiSquareIndependence') {
              result = chiSquareIndependence(d.chiIndepData.table);
            } else if (testType === 'mannWhitneyU') {
              result = mannWhitneyU(twoColA, twoColB);
            } else if (testType === 'wilcoxonSignedRank') {
              result = wilcoxonSignedRank(twoColA, twoColB);
            } else if (testType === 'kruskalWallis') {
              result = kruskalWallis(multiCol);
            }
          } catch (err) {
            result = { error: 'Computation error: ' + err.message };
          }
          if (!result) result = { error: 'No result.' };
          // Quest tracking
          var bumps = {
            lastResult: result,
            lastTestType: testType,
            mode: 'results',
            interpretationDraft: '',
            aiGradeResponse: null,
            permResult: null,
            bootResult: null,
            subsampleResult: null,
            showGlossary: false,
            excludedOutliers: !!excludeOutliers,
            outliersRemoved: nRemoved,
            quizQuestions: null,
            quizAnswers: [],
            quizSubmitted: false,
            quizCorrect: 0
          };
          if (!result.error) {
            bumps.testsRun = (d.testsRun || 0) + 1;
            if (/ttest_|anova_/.test(testType)) bumps.compareMeansRun = true;
            if (testType === 'pearson' || testType === 'spearman') bumps.correlationRun = true;
            if (/[rR]egression/.test(testType)) bumps.regressionRun = true;
            if (typeof result.p === 'number' && result.p < 0.05) bumps.significantResult = true;
            // Large effect detection
            if (result.cohensD != null && Math.abs(result.cohensD) >= 0.8) bumps.largeEffectFound = true;
            if (result.etaSquared != null && result.etaSquared >= 0.14) bumps.largeEffectFound = true;
            if (result.r != null && Math.abs(result.r) >= 0.5) bumps.largeEffectFound = true;
            if (awardXP) awardXP(15, 'StatsLab — ' + (result.test || testType), 'statsLab');
            if (addToast) addToast('✓ ' + (result.test || testType) + ' complete' + (excludeOutliers && nRemoved > 0 ? ' (' + nRemoved + ' outlier(s) excluded)' : ''), 'success');
          } else {
            if (addToast) addToast('⚠ ' + result.error, 'error');
          }
          upd(bumps);
          slAnnounce('Test complete: ' + (result.test || 'result'));
        });
      }

      function loadSample(sampleId) {
        var s = getSample(sampleId);
        if (!s) return;
        var bumps = { sampleId: sampleId, selectedTest: s.recommendedTest, mode: 'test' };
        if (s.data.groupA && s.data.groupB) {
          bumps.twoColData = {
            aLabel: s.data.groupA.label,
            bLabel: s.data.groupB.label,
            a: s.data.groupA.values.slice(),
            b: s.data.groupB.values.slice()
          };
        }
        if (s.data.groups) {
          bumps.multiColData = { groups: s.data.groups.map(function(g) { return { label: g.label, values: g.values.slice() }; }) };
        }
        if (s.data.observed) {
          bumps.chiGofData = {
            observed: s.data.observed.slice(),
            expected: s.data.expected.slice(),
            labels: (s.data.labels || []).slice()
          };
        }
        if (s.data.contingency) {
          bumps.chiIndepData = {
            rows: s.data.contingency.rowLabels.slice(),
            cols: s.data.contingency.colLabels.slice(),
            table: s.data.contingency.table.map(function(r) { return r.slice(); })
          };
        }
        if (s.data.twoWay) {
          bumps.twoWayData = {
            factorAName: s.factorA, factorBName: s.factorB,
            factorALevels: s.data.twoWay.factorALevels.slice(),
            factorBLevels: s.data.twoWay.factorBLevels.slice(),
            matrix: s.data.twoWay.matrix.map(function(r) { return r.map(function(c) { return c.slice(); }); })
          };
        }
        if (s.data.multiReg) {
          bumps.multiRegData = {
            xLabels: s.data.multiReg.xLabels.slice(),
            yLabel: s.data.multiReg.yLabel,
            x: s.data.multiReg.x.map(function(row) { return row.slice(); }),
            y: s.data.multiReg.y.slice()
          };
        }
        upd(bumps);
        if (addToast) addToast('Loaded: ' + s.title, 'success');
        slAnnounce('Sample loaded: ' + s.title);
      }

      // ── AI interpretation grading ──
      function gradeInterpretation() {
        if (!callGemini) {
          if (addToast) addToast('AI grading requires Gemini connection — try later.', 'error');
          return;
        }
        if (!d.interpretationDraft || d.interpretationDraft.trim().length < 10) {
          if (addToast) addToast('Write at least a sentence of interpretation first.', 'info');
          return;
        }
        if (!d.lastResult) {
          if (addToast) addToast('Run a test first.', 'info');
          return;
        }
        upd({ aiGradeLoading: true, aiGradeResponse: null, aiGradeOpens: (d.aiGradeOpens || 0) + 1 });
        var r = d.lastResult;
        var apa = apaWriteup(r);
        var prompt = 'You are a stats teacher grading a student\'s interpretation of a hypothesis test result.\n\n' +
          'TEST: ' + (r.test || 'unknown') + '\n' +
          'NUMERIC RESULTS: ' + JSON.stringify(r, null, 2).slice(0, 800) + '\n' +
          'CORRECT APA STYLE: ' + apa + '\n\n' +
          'STUDENT WROTE:\n"' + d.interpretationDraft + '"\n\n' +
          'Grade the student\'s interpretation on:\n' +
          '1. Did they correctly identify whether the result is significant?\n' +
          '2. Did they correctly describe the direction of the effect?\n' +
          '3. Did they mention the effect size, not just significance?\n' +
          '4. Did they avoid the common error of saying "p < .05 means there\'s a 5% chance the result is wrong"?\n' +
          '5. Did they connect the stats back to the research question?\n\n' +
          'Return JSON: {"score": 0-10, "strengths": ["..."], "issues": ["..."], "improved_version": "a model 2-3 sentence interpretation"}';
        callGemini(prompt, true).then(function(text) {
          var parsed = null;
          try {
            // Extract JSON from response
            var jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
          } catch (e) {
            parsed = { error: 'Could not parse AI response.', raw: text };
          }
          upd({ aiGradeResponse: parsed, aiGradeLoading: false });
          if (addToast) addToast('AI feedback ready', 'success');
        }).catch(function(err) {
          upd({ aiGradeLoading: false, aiGradeResponse: { error: 'AI request failed: ' + (err.message || 'unknown') } });
        });
      }

      // ── Build UI ──
      return h('div', {
        style: {
          fontFamily: 'system-ui, sans-serif',
          color: '#e2e8f0',
          padding: 20,
          maxWidth: 1100,
          margin: '0 auto'
        }
      },
        // Header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
          h('div', { style: { fontSize: 36 } }, '📊'),
          h('div', { style: { flex: 1 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 24, fontWeight: 900 } }, 'Statistics Lab'),
            h('p', { style: { margin: '4px 0 0', color: '#94a3b8', fontSize: 12 } }, 'Inferential stats with AP Psych / AP Bio focus. Transparent. Scaffolded. Better than SPSS for learning.')
          )
        ),

        // Mode tabs
        h('div', {
          role: 'tablist',
          'aria-label': 'Statistics Lab navigation',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }
        },
          [
            { id: 'home', label: '🏠 Home', desc: 'Sample datasets + about' },
            { id: 'wizard', label: '🧙 Wizard', desc: 'Pick the right test' },
            { id: 'data', label: '📋 Data', desc: 'Enter / paste data' },
            { id: 'test', label: '⚖️ Test', desc: 'Choose + run a test' },
            { id: 'results', label: '📈 Results', desc: 'View results + AI grade' },
            { id: 'power', label: '🔋 Power', desc: 'Sample size calc' },
            { id: 'mastery', label: '🏅 Mastery', desc: 'AP-quiz concept progress' }
          ].map(function(tab) {
            var sel = d.mode === tab.id;
            return h('button', {
              key: tab.id,
              role: 'tab',
              'aria-selected': sel,
              'data-sl-focusable': 'true',
              onClick: function() { upd('mode', tab.id); },
              title: tab.desc,
              style: {
                padding: '8px 14px',
                background: sel ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(99,102,241,0.10)',
                color: sel ? '#fff' : '#a5b4fc',
                border: '1px solid ' + (sel ? '#4f46e5' : 'rgba(99,102,241,0.40)'),
                borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, minHeight: 36
              }
            }, tab.label);
          })
        ),

        // Topic-accent hero band (swaps with the active mode)
        (function() {
          var TAB_META = {
            home:    { accent: '#6366f1', soft: 'rgba(99,102,241,0.10)',  icon: '🏠', title: 'Sample datasets + tool overview',           hint: 'Eight pre-loaded datasets cover AP Psych and AP Bio canonical examples — load one to skip data entry.' },
            wizard:  { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)',  icon: '🧙', title: 'Pick the right test for your data',          hint: 'Answer 4 questions about your variables. The wizard maps to t-test, ANOVA, chi-square, regression, or non-parametric.' },
            data:    { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',   icon: '📋', title: 'Enter or paste your data',                    hint: 'Paste from Sheets/Excel, or type by hand. The lab auto-detects two-group vs. paired vs. categorical layouts.' },
            test:    { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)',  icon: '⚖️', title: 'Run the test with full transparency',         hint: 'Every formula and intermediate step is shown — no SPSS black box. You see what the test actually computes.' },
            results: { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)',  icon: '📈', title: 'Interpret + AI-graded write-up',              hint: 'Effect-size context + Cohen-band labels. AI grades your interpretation against AP-rubric criteria.' },
            power:   { accent: '#ef4444', soft: 'rgba(239,68,68,0.10)',   icon: '🔋', title: 'Sample-size + power calculator',              hint: 'How many subjects do you need to detect a real effect? Underpowered studies are why most psych findings fail to replicate.' }
          };
          var meta = TAB_META[d.mode] || TAB_META.home;
          return h('div', {
            style: {
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0.4) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 32, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 17, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // Render the active mode
        d.mode === 'home' && _renderHome(d, upd, loadSample, h),
        d.mode === 'wizard' && _renderWizard(d, upd, h),
        d.mode === 'data' && _renderData(d, upd, h, addToast),
        d.mode === 'test' && _renderTest(d, upd, runTest, h, addToast),
        d.mode === 'results' && _renderResults(d, upd, h, addToast, gradeInterpretation, awardXP, setSlCeleb),
        d.mode === 'power' && _renderPower(d, upd, h, addToast),
        d.mode === 'mastery' && _renderStatsMasteryPanel(d, upd, h),
        // Concept-mastery celebration overlay — same shape as Optics/Pets/BirdLab.
        slCeleb && h('div', {
          role: 'status',
          'aria-live': 'assertive',
          style: {
            position: 'fixed', top: 80, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999, pointerEvents: 'none',
            animation: 'statslab-celeb-rise 3.5s ease-out forwards',
            maxWidth: 480
          }
        },
          h('div', {
            style: {
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
              color: '#fff',
              padding: '14px 22px',
              borderRadius: 16,
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
              border: '4px solid #fff',
              display: 'flex', alignItems: 'center', gap: 12
            }
          },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, '🏅'),
            h('div', null,
              h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.95 } }, 'Concept locked in'),
              h('div', { style: { fontSize: 13, fontWeight: 800, lineHeight: 1.3 } }, slCeleb.question.length > 90 ? (slCeleb.question.substring(0, 87) + '…') : slCeleb.question),
              h('div', { style: { fontSize: 11, fontStyle: 'italic', opacity: 0.95, marginTop: 2 } }, slCeleb.total + ' / ' + AP_QUIZ_BANK.length + ' AP questions mastered')
            )
          )
        )
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // HOME panel — sample datasets gallery
  // ──────────────────────────────────────────────────────────────────
  function _renderHome(d, upd, loadSample, h) {
    var _hMastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
    var _hMasteredCount = AP_QUIZ_BANK.filter(function (q) { return !!_hMastery[q.q]; }).length;
    var _hTotal = AP_QUIZ_BANK.length;
    var _hPct = _hTotal > 0 ? Math.round((_hMasteredCount / _hTotal) * 100) : 0;
    return h('div', null,
      // ── AP Concept Mastery summary tile (clickable → Mastery tab) ──
      h('button', {
        onClick: function () { upd('mode', 'mastery'); },
        'aria-label': 'Open AP statistics concept mastery — ' + _hMasteredCount + ' of ' + _hTotal + ' questions mastered',
        style: {
          width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: 14, marginBottom: 16, borderRadius: 12,
          background: 'linear-gradient(110deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.18) 50%, rgba(236,72,153,0.12) 100%)',
          border: '1px solid rgba(168,85,247,0.50)',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
        }
      },
        h('div', { style: { textAlign: 'center', minWidth: 90 } },
          h('div', { style: { fontSize: 26, fontWeight: 900, color: '#d8b4fe', lineHeight: 1 } }, _hMasteredCount + ' / ' + _hTotal),
          h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 } }, 'AP mastered')
        ),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 } }, '🏅 AP Stats Concept Mastery'),
          h('div', { style: { height: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }, 'aria-hidden': 'true' },
            h('div', { style: { width: _hPct + '%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)', transition: 'width 0.3s' } })
          ),
          h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.45 } },
            _hMasteredCount === 0 ? 'Run any test on the Test tab, then take the AP quiz on Results — every question you nail locks in here permanently.'
            : _hMasteredCount === _hTotal ? '🏆 Full AP coverage — all ' + _hTotal + ' quiz questions mastered.'
            : _hPct + '% of the AP quiz bank mastered. ' + (_hTotal - _hMasteredCount) + ' to go.'
          )
        ),
        h('span', { 'aria-hidden': 'true', style: { fontSize: 22, color: '#d8b4fe', fontWeight: 900, flexShrink: 0 } }, '→')
      ),
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 16
        }
      },
        h('div', { style: { fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 6 } }, '🚀 Quick start with a sample dataset'),
        h('p', { style: { margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } },
          'Pick a real-world AP Psych or AP Bio scenario. Each loads pre-cleaned data, suggests the right test, and shows a research question. Or jump to the ',
          h('b', { style: { color: '#fbbf24' } }, 'Wizard'), ' to walk through your own design.'
        )
      ),
      h('div', {
        style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }
      },
        SAMPLE_DATASETS.map(function(s) {
          return h('button', {
            key: s.id,
            onClick: function() { loadSample(s.id); },
            'data-sl-focusable': 'true',
            style: {
              textAlign: 'left',
              background: s.curriculum === 'AP Bio' ? 'rgba(34,197,94,0.10)' : 'rgba(168,85,247,0.10)',
              border: '1px solid ' + (s.curriculum === 'AP Bio' ? 'rgba(34,197,94,0.45)' : 'rgba(168,85,247,0.45)'),
              borderRadius: 10, padding: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 6
            }
          },
            h('div', { style: { fontSize: 10, fontWeight: 800, color: s.curriculum === 'AP Bio' ? '#86efac' : '#d8b4fe', letterSpacing: '0.06em', textTransform: 'uppercase' } }, s.curriculum),
            h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fef3c7' } }, s.title),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 } }, s.research_question),
            h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 4 } }, '→ ' + (WIZARD_TESTS[s.recommendedTest] && WIZARD_TESTS[s.recommendedTest].label) || s.recommendedTest)
          );
        })
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // WIZARD panel — decision tree
  // ──────────────────────────────────────────────────────────────────
  function _renderWizard(d, upd, h) {
    var step = d.wizardStep || 0;
    var ans = d.wizardAnswers || {};
    function answer(key, val, nextStep) {
      var nextAns = Object.assign({}, ans, { [key]: val });
      upd({ wizardAnswers: nextAns, wizardStep: nextStep == null ? step + 1 : nextStep });
    }
    function reset() { upd({ wizardAnswers: {}, wizardStep: 0 }); }
    function recommend(testId) {
      upd({ selectedTest: testId, mode: 'test', wizardStep: 0, wizardAnswers: {} });
    }
    var box = function(title, body) {
      return h('div', {
        style: {
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.40)',
          borderRadius: 10, padding: 16, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 14, fontWeight: 800, color: '#a5b4fc', marginBottom: 10 } }, title),
        body
      );
    };
    var optBtn = function(label, onClick, key) {
      return h('button', {
        key: key,
        onClick: onClick,
        'data-sl-focusable': 'true',
        style: {
          padding: '10px 14px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff',
          border: '1px solid rgba(99,102,241,0.55)', borderRadius: 8, cursor: 'pointer',
          margin: '0 6px 6px 0', fontSize: 13, fontWeight: 700, minHeight: 38
        }
      }, label);
    };
    if (step === 0) {
      return box('Step 1: What are you comparing?',
        h('div', null,
          optBtn('Two or more group means', function() { answer('q1', 'means'); }, 'q1m'),
          optBtn('A relationship between two variables', function() { answer('q1', 'relationship'); }, 'q1r'),
          optBtn('Categorical counts (frequencies)', function() { answer('q1', 'counts'); }, 'q1c'),
          optBtn('My sample mean against a known value', function() { recommend('ttest_oneSample'); }, 'q1onesample')
        )
      );
    }
    if (step === 1 && ans.q1 === 'means') {
      return box('Step 2: How many groups?',
        h('div', null,
          optBtn('2 groups', function() { answer('q2', 2); }, 'q2-2'),
          optBtn('3 or more groups', function() { answer('q2', 3); }, 'q2-3'),
          h('button', { onClick: reset, 'data-sl-focusable': 'true', style: { marginTop: 12, padding: '6px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' } }, '← Back')
        )
      );
    }
    if (step === 2 && ans.q1 === 'means' && ans.q2 === 2) {
      return box('Step 3: Are the two groups same subjects (paired) or different subjects (independent)?',
        h('div', null,
          optBtn('Same subjects (e.g., before/after)', function() { recommend('ttest_paired'); }, 'qpaired'),
          optBtn('Different subjects (two independent groups)', function() { recommend('ttest_independent'); }, 'qindep'),
          h('button', { onClick: reset, style: { marginTop: 12, padding: '6px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' } }, '← Restart')
        )
      );
    }
    if (step === 2 && ans.q1 === 'means' && ans.q2 === 3) {
      return box('Step 3: Are subjects shared across all conditions, or different per group?',
        h('div', null,
          optBtn('Same subjects across all conditions', function() { recommend('anova_repeatedMeasures'); }, 'qrm'),
          optBtn('Different subjects per group (one factor)', function() { recommend('anova_oneWay'); }, 'qanova'),
          optBtn('Two factors crossed (e.g., drug × dose)', function() { recommend('anova_twoWay'); }, 'q2way'),
          h('button', { onClick: reset, style: { marginTop: 12, padding: '6px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' } }, '← Restart')
        )
      );
    }
    if (step === 1 && ans.q1 === 'relationship') {
      return box('Step 2: What\'s the goal?',
        h('div', null,
          optBtn('Measure strength of relationship', function() { recommend('pearson'); }, 'qpear'),
          optBtn('Predict one variable from another', function() { recommend('linearRegression'); }, 'qreg'),
          optBtn('Predict from multiple predictors', function() { recommend('multipleRegression'); }, 'qmreg'),
          optBtn('Data is ranked or non-normal — use Spearman', function() { recommend('spearman'); }, 'qspear'),
          h('button', { onClick: reset, style: { marginTop: 12, padding: '6px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' } }, '← Restart')
        )
      );
    }
    if (step === 1 && ans.q1 === 'counts') {
      return box('Step 2: What kind of counts?',
        h('div', null,
          optBtn('Compare counts to expected (one categorical variable)', function() { recommend('chiSquareGoodnessOfFit'); }, 'qgof'),
          optBtn('Two categorical variables — look for association', function() { recommend('chiSquareIndependence'); }, 'qindep'),
          h('button', { onClick: reset, style: { marginTop: 12, padding: '6px 12px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' } }, '← Restart')
        )
      );
    }
    return box('Wizard complete. Try the Test tab.', h('button', { onClick: reset, style: { padding: '8px 14px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.55)', borderRadius: 8, cursor: 'pointer' } }, '← Restart wizard'));
  }

  // ──────────────────────────────────────────────────────────────────
  // DATA panel — table editor + CSV paste
  // ──────────────────────────────────────────────────────────────────
  function _renderData(d, upd, h, addToast) {
    function parseCSV(text) {
      var lines = text.split(/[\r\n]+/).filter(function(l) { return l.trim(); });
      if (!lines.length) return null;
      var rows = lines.map(function(line) { return line.split(/[,\t]/).map(function(c) { return c.trim(); }); });
      // First row may be header
      var firstRow = rows[0];
      var hasHeader = firstRow.some(function(c) { return c && isNaN(parseFloat(c)); });
      var header = hasHeader ? firstRow : firstRow.map(function(_, i) { return 'Col ' + (i + 1); });
      var data = (hasHeader ? rows.slice(1) : rows).map(function(r) {
        return r.map(function(c) { var n = parseFloat(c); return isNaN(n) ? null : n; });
      });
      return { header: header, data: data };
    }
    function applyCSVAsTwoCol(parsed) {
      if (!parsed || !parsed.data.length || parsed.header.length < 2) {
        if (addToast) addToast('CSV needs at least 2 columns of numeric data.', 'error');
        return;
      }
      var a = parsed.data.map(function(r) { return r[0]; }).filter(_isNum);
      var b = parsed.data.map(function(r) { return r[1]; }).filter(_isNum);
      upd('twoColData', { aLabel: parsed.header[0], bLabel: parsed.header[1], a: a, b: b });
      if (addToast) addToast('Loaded ' + a.length + ' / ' + b.length + ' values into 2 columns.', 'success');
    }
    function applyCSVAsMultiCol(parsed) {
      if (!parsed || !parsed.data.length || parsed.header.length < 2) {
        if (addToast) addToast('CSV needs at least 2 columns.', 'error');
        return;
      }
      var groups = parsed.header.map(function(h, i) {
        return { label: h, values: parsed.data.map(function(r) { return r[i]; }).filter(_isNum) };
      });
      upd('multiColData', { groups: groups });
      if (addToast) addToast('Loaded ' + groups.length + ' groups.', 'success');
    }
    var t = d.twoColData;
    var t2 = d.multiColData;
    // Helper: build a one-line summary card for a column.
    function _summaryCard(values, label, key) {
      var x = _clean(values);
      if (x.length === 0) return null;
      var m = mean(x), sd = stdDev(x), md = median(x);
      var sk = skewness(x);
      var min = Math.min.apply(null, x), max = Math.max.apply(null, x);
      var nOut = _outlierIndices(values).length;
      // Color skew badge by magnitude
      var skBadge = Math.abs(sk) < 0.5 ? { label: 'symmetric', color: '#86efac' }
                  : Math.abs(sk) < 1.0 ? { label: 'moderate skew', color: '#fbbf24' }
                  : { label: 'strong skew', color: '#fca5a5' };
      return h('div', {
        key: key,
        style: { background: '#0f172a', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 8, padding: '8px 10px', fontSize: 11, fontFamily: 'monospace' }
      },
        h('div', { style: { color: '#fbbf24', fontWeight: 800, marginBottom: 4 } }, label + ' (n = ' + x.length + ')'),
        h('div', { style: { color: '#cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 } },
          h('span', null, 'M = ', h('b', { style: { color: '#fef3c7' } }, isFinite(m) ? m.toFixed(2) : '—')),
          h('span', null, 'SD = ', h('b', { style: { color: '#fef3c7' } }, isFinite(sd) ? sd.toFixed(2) : '—')),
          h('span', null, 'Mdn = ', h('b', { style: { color: '#fef3c7' } }, isFinite(md) ? md.toFixed(2) : '—')),
          h('span', null, 'min = ', h('b', { style: { color: '#fef3c7' } }, min)),
          h('span', null, 'max = ', h('b', { style: { color: '#fef3c7' } }, max)),
          h('span', null, 'skew = ', h('b', { style: { color: skBadge.color } }, isFinite(sk) ? sk.toFixed(2) : '—'))
        ),
        h('div', { style: { marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' } },
          h('span', { style: { padding: '1px 6px', background: skBadge.color, color: '#0b1220', borderRadius: 999, fontSize: 9, fontWeight: 800 } }, skBadge.label),
          nOut > 0 && h('span', { style: { padding: '1px 6px', background: '#fbbf24', color: '#0b1220', borderRadius: 999, fontSize: 9, fontWeight: 800 } }, '⚠ ' + nOut + ' outlier' + (nOut > 1 ? 's' : ''))
        )
      );
    }
    // Build the cards for everything loaded
    var sumCards = [];
    if (t.a.length) sumCards.push(_summaryCard(t.a, t.aLabel, 'sa'));
    if (t.b.length) sumCards.push(_summaryCard(t.b, t.bLabel, 'sb'));
    t2.groups.forEach(function(g, gi) {
      if (g.values.length) sumCards.push(_summaryCard(g.values, g.label, 'g' + gi));
    });
    if (d.oneColData.values.length) sumCards.push(_summaryCard(d.oneColData.values, 'Single column (μ₀=' + d.oneColData.mu0 + ')', 'one'));
    return h('div', null,
      // At-a-glance summary stats
      sumCards.filter(Boolean).length > 0 && h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 12, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 12, fontWeight: 800, color: '#a5b4fc', marginBottom: 6 } }, '📊 At-a-glance summary'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 } },
          sumCards.filter(Boolean)
        )
      ),
      // Two-column data (most tests)
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, 'Two-column data (paired t-test, independent t-test, correlation, regression)'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 } },
          h('div', null,
            h('input', {
              type: 'text', value: t.aLabel,
              onChange: function(e) { upd('twoColData', Object.assign({}, t, { aLabel: e.target.value })); },
              'data-sl-focusable': 'true', 'aria-label': 'Column A label',
              style: { width: '100%', padding: '6px 10px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontWeight: 700, marginBottom: 4 }
            }),
            h('textarea', {
              value: t.a.join('\n'),
              onChange: function(e) {
                var vals = e.target.value.split(/[\s,]+/).map(parseFloat).filter(_isNum);
                upd('twoColData', Object.assign({}, t, { a: vals }));
              },
              'data-sl-focusable': 'true', 'aria-label': 'Column A values',
              placeholder: 'one number per line\nor comma-separated',
              rows: 8,
              style: { width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }
            }),
            h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'n = ' + t.a.length)
          ),
          h('div', null,
            h('input', {
              type: 'text', value: t.bLabel,
              onChange: function(e) { upd('twoColData', Object.assign({}, t, { bLabel: e.target.value })); },
              'data-sl-focusable': 'true', 'aria-label': 'Column B label',
              style: { width: '100%', padding: '6px 10px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontWeight: 700, marginBottom: 4 }
            }),
            h('textarea', {
              value: t.b.join('\n'),
              onChange: function(e) {
                var vals = e.target.value.split(/[\s,]+/).map(parseFloat).filter(_isNum);
                upd('twoColData', Object.assign({}, t, { b: vals }));
              },
              'data-sl-focusable': 'true', 'aria-label': 'Column B values',
              placeholder: 'one number per line\nor comma-separated',
              rows: 8,
              style: { width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }
            }),
            h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'n = ' + t.b.length)
          )
        ),
        // Show summary stats for each column
        (t.a.length > 0 || t.b.length > 0) && h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 8, fontFamily: 'monospace', display: 'flex', gap: 16, flexWrap: 'wrap' } },
          t.a.length > 0 && h('div', null, '📊 ', h('b', null, t.aLabel + ': '), 'M=' + mean(t.a).toFixed(2), ' SD=' + (isFinite(stdDev(t.a)) ? stdDev(t.a).toFixed(2) : '—'), ' min=' + Math.min.apply(null, t.a) + ' max=' + Math.max.apply(null, t.a)),
          t.b.length > 0 && h('div', null, '📊 ', h('b', null, t.bLabel + ': '), 'M=' + mean(t.b).toFixed(2), ' SD=' + (isFinite(stdDev(t.b)) ? stdDev(t.b).toFixed(2) : '—'), ' min=' + Math.min.apply(null, t.b) + ' max=' + Math.max.apply(null, t.b))
        ),
        h('details', { style: { marginTop: 8 } },
          h('summary', { style: { cursor: 'pointer', fontSize: 11, color: '#a5b4fc' } }, '📋 Paste CSV (header row optional)'),
          h('textarea', {
            placeholder: 'Group A,Group B\n22,15\n25,18\n...',
            'aria-label': 'CSV paste for two columns',
            rows: 5,
            'data-sl-focusable': 'true',
            onPaste: function(e) {
              setTimeout(function() {
                var text = e.target.value;
                var parsed = parseCSV(text);
                if (parsed) applyCSVAsTwoCol(parsed);
              }, 50);
            },
            style: { width: '100%', marginTop: 6, padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, boxSizing: 'border-box' }
          })
        )
      ),
      // Multi-group data
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, 'Multi-group data (ANOVA, Kruskal-Wallis)'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 } },
          t2.groups.map(function(g, gi) {
            return h('div', { key: gi },
              h('input', {
                type: 'text', value: g.label,
                onChange: function(e) {
                  var nextGroups = t2.groups.slice();
                  nextGroups[gi] = { label: e.target.value, values: g.values };
                  upd('multiColData', { groups: nextGroups });
                },
                'data-sl-focusable': 'true', 'aria-label': 'Group ' + (gi + 1) + ' label',
                style: { width: '100%', padding: '4px 8px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontWeight: 700, fontSize: 11, marginBottom: 4, boxSizing: 'border-box' }
              }),
              h('textarea', {
                value: g.values.join('\n'),
                onChange: function(e) {
                  var vals = e.target.value.split(/[\s,]+/).map(parseFloat).filter(_isNum);
                  var nextGroups = t2.groups.slice();
                  nextGroups[gi] = { label: g.label, values: vals };
                  upd('multiColData', { groups: nextGroups });
                },
                'data-sl-focusable': 'true', 'aria-label': 'Group ' + (gi + 1) + ' values',
                rows: 6,
                style: { width: '100%', padding: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontFamily: 'monospace', fontSize: 11, resize: 'vertical', boxSizing: 'border-box' }
              }),
              h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'n = ' + g.values.length)
            );
          })
        ),
        h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
          h('button', {
            onClick: function() {
              var nextGroups = t2.groups.concat([{ label: 'Group ' + (t2.groups.length + 1), values: [] }]);
              upd('multiColData', { groups: nextGroups });
            },
            'data-sl-focusable': 'true',
            style: { padding: '6px 12px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 6, cursor: 'pointer', fontSize: 11 }
          }, '+ Add group'),
          t2.groups.length > 2 && h('button', {
            onClick: function() {
              var nextGroups = t2.groups.slice(0, -1);
              upd('multiColData', { groups: nextGroups });
            },
            'data-sl-focusable': 'true',
            style: { padding: '6px 12px', background: 'rgba(180,83,9,0.18)', color: '#fed7aa', border: '1px solid rgba(180,83,9,0.45)', borderRadius: 6, cursor: 'pointer', fontSize: 11 }
          }, '− Remove last group')
        )
      ),
      // One-column for one-sample t
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, 'Single-column data (one-sample t-test)'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 200px', gap: 10 } },
          h('textarea', {
            value: d.oneColData.values.join('\n'),
            onChange: function(e) {
              var vals = e.target.value.split(/[\s,]+/).map(parseFloat).filter(_isNum);
              upd('oneColData', Object.assign({}, d.oneColData, { values: vals }));
            },
            'data-sl-focusable': 'true', 'aria-label': 'Single column values',
            rows: 5,
            style: { width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }
          }),
          h('div', null,
            h('label', { style: { fontSize: 11, color: '#cbd5e1' } }, 'Hypothesized μ₀'),
            h('input', {
              type: 'number',
              value: d.oneColData.mu0,
              onChange: function(e) {
                var n = parseFloat(e.target.value);
                upd('oneColData', Object.assign({}, d.oneColData, { mu0: isFinite(n) ? n : 0 }));
              },
              'data-sl-focusable': 'true', 'aria-label': 'Hypothesized population mean',
              style: { width: '100%', padding: 8, background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontWeight: 700, marginTop: 4, boxSizing: 'border-box' }
            }),
            h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4 } }, 'n = ' + d.oneColData.values.length)
          )
        )
      ),
      // Chi-square: goodness-of-fit (observed + expected counts)
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginTop: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, 'Chi-square goodness-of-fit (observed + expected counts)'),
        h('p', { style: { margin: '0 0 8px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
          'Enter category labels and counts. Expected counts can be raw numbers OR proportions that sum to 1 (we\'ll auto-scale).'
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, fontSize: 11, color: '#cbd5e1', marginBottom: 4 } },
          h('div', null, 'Category'),
          h('div', null, 'Observed'),
          h('div', null, 'Expected'),
          h('div', null, '')
        ),
        (d.chiGofData.observed.length === 0 ? [{ label: 'Cat 1', obs: 0, exp: 0 }, { label: 'Cat 2', obs: 0, exp: 0 }] :
          d.chiGofData.observed.map(function(o, i) {
            return { label: (d.chiGofData.labels && d.chiGofData.labels[i]) || ('Cat ' + (i + 1)), obs: o, exp: d.chiGofData.expected[i] || 0 };
          })
        ).map(function(row, i) {
          return h('div', { key: 'gof-' + i, style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, marginBottom: 4 } },
            h('input', {
              type: 'text', value: row.label,
              onChange: function(e) {
                var labels = (d.chiGofData.labels || []).slice();
                while (labels.length <= i) labels.push('');
                labels[i] = e.target.value;
                upd('chiGofData', Object.assign({}, d.chiGofData, { labels: labels }));
              },
              'data-sl-focusable': 'true', 'aria-label': 'Category ' + (i + 1) + ' label',
              style: { padding: 6, background: '#0f172a', color: '#fef3c7', border: '1px solid #475569', borderRadius: 6, fontSize: 11, boxSizing: 'border-box' }
            }),
            h('input', {
              type: 'number', value: row.obs,
              onChange: function(e) {
                var obs = (d.chiGofData.observed || []).slice();
                while (obs.length <= i) obs.push(0);
                obs[i] = parseFloat(e.target.value) || 0;
                upd('chiGofData', Object.assign({}, d.chiGofData, { observed: obs }));
              },
              'data-sl-focusable': 'true', 'aria-label': 'Observed count for ' + row.label,
              style: { padding: 6, background: '#0f172a', color: '#a5b4fc', border: '1px solid #475569', borderRadius: 6, fontSize: 11, fontWeight: 700, boxSizing: 'border-box' }
            }),
            h('input', {
              type: 'number', step: 'any', value: row.exp,
              onChange: function(e) {
                var exp = (d.chiGofData.expected || []).slice();
                while (exp.length <= i) exp.push(0);
                exp[i] = parseFloat(e.target.value) || 0;
                upd('chiGofData', Object.assign({}, d.chiGofData, { expected: exp }));
              },
              'data-sl-focusable': 'true', 'aria-label': 'Expected count for ' + row.label,
              style: { padding: 6, background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 11, fontWeight: 700, boxSizing: 'border-box' }
            }),
            h('button', {
              onClick: function() {
                var obs = d.chiGofData.observed.slice(); obs.splice(i, 1);
                var exp = d.chiGofData.expected.slice(); exp.splice(i, 1);
                var lab = (d.chiGofData.labels || []).slice(); lab.splice(i, 1);
                upd('chiGofData', { observed: obs, expected: exp, labels: lab });
              },
              'data-sl-focusable': 'true', 'aria-label': 'Remove row ' + (i + 1),
              disabled: d.chiGofData.observed.length <= 2,
              style: { padding: '4px 8px', background: 'rgba(180,83,9,0.18)', color: '#fed7aa', border: '1px solid rgba(180,83,9,0.45)', borderRadius: 6, cursor: d.chiGofData.observed.length <= 2 ? 'not-allowed' : 'pointer', fontSize: 11 }
            }, '×')
          );
        }),
        h('button', {
          onClick: function() {
            var obs = d.chiGofData.observed.slice(); obs.push(0);
            var exp = d.chiGofData.expected.slice(); exp.push(0);
            var lab = (d.chiGofData.labels || []).slice(); lab.push('Cat ' + (obs.length));
            upd('chiGofData', { observed: obs, expected: exp, labels: lab });
          },
          'data-sl-focusable': 'true',
          style: { marginTop: 4, padding: '6px 12px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 6, cursor: 'pointer', fontSize: 11 }
        }, '+ Add category')
      ),
      // Chi-square: contingency table (independence)
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginTop: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, 'Chi-square test of independence (contingency table)'),
        h('p', { style: { margin: '0 0 10px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
          'Two categorical variables crossed. Enter row × column counts. Expected counts get computed automatically.'
        ),
        h('div', { style: { overflowX: 'auto' } },
          h('table', {
            style: { borderCollapse: 'collapse', fontSize: 11 },
            'aria-label': 'Contingency table editor'
          },
            h('thead', null,
              h('tr', null,
                h('th', { style: { padding: 6, color: '#94a3b8', textAlign: 'left' } }, ''),
                d.chiIndepData.cols.map(function(col, ci) {
                  return h('th', { key: ci, style: { padding: 6 } },
                    h('input', {
                      type: 'text', value: col,
                      onChange: function(e) {
                        var cols = d.chiIndepData.cols.slice();
                        cols[ci] = e.target.value;
                        upd('chiIndepData', Object.assign({}, d.chiIndepData, { cols: cols }));
                      },
                      'data-sl-focusable': 'true', 'aria-label': 'Column ' + (ci + 1) + ' label',
                      style: { width: 80, padding: 4, background: '#0f172a', color: '#fef3c7', border: '1px solid #475569', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center' }
                    })
                  );
                }),
                h('th', null,
                  h('button', {
                    onClick: function() {
                      var cols = d.chiIndepData.cols.slice(); cols.push('Col ' + (cols.length + 1));
                      var table = d.chiIndepData.table.map(function(row) { return row.concat([0]); });
                      upd('chiIndepData', Object.assign({}, d.chiIndepData, { cols: cols, table: table }));
                    },
                    'data-sl-focusable': 'true', 'aria-label': 'Add column',
                    style: { padding: '2px 6px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }
                  }, '+col')
                )
              )
            ),
            h('tbody', null,
              d.chiIndepData.rows.map(function(rowLabel, ri) {
                return h('tr', { key: ri },
                  h('td', { style: { padding: 4 } },
                    h('input', {
                      type: 'text', value: rowLabel,
                      onChange: function(e) {
                        var rows = d.chiIndepData.rows.slice();
                        rows[ri] = e.target.value;
                        upd('chiIndepData', Object.assign({}, d.chiIndepData, { rows: rows }));
                      },
                      'data-sl-focusable': 'true', 'aria-label': 'Row ' + (ri + 1) + ' label',
                      style: { width: 100, padding: 4, background: '#0f172a', color: '#fef3c7', border: '1px solid #475569', borderRadius: 4, fontSize: 11, fontWeight: 700 }
                    })
                  ),
                  d.chiIndepData.cols.map(function(_, ci) {
                    return h('td', { key: ci, style: { padding: 4 } },
                      h('input', {
                        type: 'number',
                        value: (d.chiIndepData.table[ri] && d.chiIndepData.table[ri][ci]) || 0,
                        onChange: function(e) {
                          var table = d.chiIndepData.table.map(function(row) { return row.slice(); });
                          if (!table[ri]) table[ri] = [];
                          table[ri][ci] = parseFloat(e.target.value) || 0;
                          upd('chiIndepData', Object.assign({}, d.chiIndepData, { table: table }));
                        },
                        'data-sl-focusable': 'true', 'aria-label': 'Cell ' + rowLabel + ' × ' + d.chiIndepData.cols[ci],
                        style: { width: 60, padding: 4, background: '#0f172a', color: '#a5b4fc', border: '1px solid #475569', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center' }
                      })
                    );
                  }),
                  h('td', null,
                    d.chiIndepData.rows.length > 2 && h('button', {
                      onClick: function() {
                        var rows = d.chiIndepData.rows.slice(); rows.splice(ri, 1);
                        var table = d.chiIndepData.table.slice(); table.splice(ri, 1);
                        upd('chiIndepData', Object.assign({}, d.chiIndepData, { rows: rows, table: table }));
                      },
                      'data-sl-focusable': 'true', 'aria-label': 'Remove row ' + (ri + 1),
                      style: { padding: '2px 6px', background: 'rgba(180,83,9,0.18)', color: '#fed7aa', border: '1px solid rgba(180,83,9,0.45)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }
                    }, '×')
                  )
                );
              }),
              h('tr', null,
                h('td', { colSpan: d.chiIndepData.cols.length + 2, style: { padding: 4 } },
                  h('button', {
                    onClick: function() {
                      var rows = d.chiIndepData.rows.slice(); rows.push('Row ' + (rows.length + 1));
                      var newRow = []; for (var c = 0; c < d.chiIndepData.cols.length; c++) newRow.push(0);
                      var table = d.chiIndepData.table.slice(); table.push(newRow);
                      upd('chiIndepData', Object.assign({}, d.chiIndepData, { rows: rows, table: table }));
                    },
                    'data-sl-focusable': 'true', 'aria-label': 'Add row',
                    style: { padding: '4px 10px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 4, cursor: 'pointer', fontSize: 11 }
                  }, '+ Add row')
                )
              )
            )
          )
        )
      ),
      // Multiple regression — n × (k + 1) data grid: predictors X1..Xk, outcome Y
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginTop: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, 'Multiple regression (multiple predictors → one outcome)'),
        h('p', { style: { margin: '0 0 8px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } },
          'Each row = one observation. Edit the predictor labels at the top, the outcome label at the right, then enter values. Need at least k+2 observations for k predictors.'
        ),
        // Controls: number of predictors + outcome label
        h('div', { style: { display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap', alignItems: 'flex-end' } },
          h('div', null,
            h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, '# of predictors:'),
            h('input', {
              type: 'number', min: 1, max: 8, step: 1,
              value: (d.multiRegData.xLabels || ['X1']).length,
              onChange: function(e) {
                var k = Math.max(1, Math.min(8, parseInt(e.target.value, 10) || 1));
                var labels = (d.multiRegData.xLabels || []).slice(0, k);
                while (labels.length < k) labels.push('X' + (labels.length + 1));
                // Reshape rows: pad/trim each row of x
                var x = (d.multiRegData.x || []).map(function(row) {
                  var r = row.slice(0, k);
                  while (r.length < k) r.push(0);
                  return r;
                });
                upd('multiRegData', Object.assign({}, d.multiRegData, { xLabels: labels, x: x }));
              },
              'data-sl-focusable': 'true',
              style: { width: 70, padding: 6, background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700, boxSizing: 'border-box' }
            })
          ),
          h('div', null,
            h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'Outcome label:'),
            h('input', {
              type: 'text', value: d.multiRegData.yLabel || 'Y',
              onChange: function(e) { upd('multiRegData', Object.assign({}, d.multiRegData, { yLabel: e.target.value })); },
              'data-sl-focusable': 'true', 'aria-label': 'Outcome variable label',
              style: { padding: 6, background: '#0f172a', color: '#fef3c7', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700 }
            })
          ),
          h('button', {
            onClick: function() {
              var k = (d.multiRegData.xLabels || ['X1']).length;
              var newRow = []; for (var c = 0; c < k; c++) newRow.push(0);
              var x = (d.multiRegData.x || []).slice(); x.push(newRow);
              var y = (d.multiRegData.y || []).slice(); y.push(0);
              upd('multiRegData', Object.assign({}, d.multiRegData, { x: x, y: y }));
            },
            'data-sl-focusable': 'true',
            style: { padding: '6px 12px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.45)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
          }, '+ Add row')
        ),
        // The grid
        h('div', { style: { overflowX: 'auto', maxHeight: 360, overflowY: 'auto' } },
          h('table', {
            style: { borderCollapse: 'collapse', fontSize: 11 },
            'aria-label': 'Multiple regression data editor'
          },
            h('thead', { style: { position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 } },
              h('tr', null,
                h('th', { style: { padding: 4, color: '#94a3b8', textAlign: 'left' } }, '#'),
                (d.multiRegData.xLabels || []).map(function(lbl, ki) {
                  return h('th', { key: ki, style: { padding: 4 } },
                    h('input', {
                      type: 'text', value: lbl,
                      onChange: function(e) {
                        var labels = d.multiRegData.xLabels.slice();
                        labels[ki] = e.target.value;
                        upd('multiRegData', Object.assign({}, d.multiRegData, { xLabels: labels }));
                      },
                      'data-sl-focusable': 'true', 'aria-label': 'Predictor ' + (ki + 1) + ' label',
                      style: { width: 80, padding: 4, background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center' }
                    })
                  );
                }),
                h('th', { style: { padding: 4 } },
                  h('div', { style: { width: 80, padding: 4, color: '#fef3c7', fontSize: 11, fontWeight: 800, textAlign: 'center' } }, d.multiRegData.yLabel || 'Y')
                ),
                h('th', null)
              )
            ),
            h('tbody', null,
              (d.multiRegData.x || []).map(function(row, ri) {
                return h('tr', { key: ri },
                  h('td', { style: { padding: 4, color: '#94a3b8', fontSize: 10 } }, ri + 1),
                  row.map(function(v, ki) {
                    return h('td', { key: ki, style: { padding: 2 } },
                      h('input', {
                        type: 'number', step: 'any', value: v,
                        onChange: function(e) {
                          var x = d.multiRegData.x.map(function(rr) { return rr.slice(); });
                          x[ri][ki] = parseFloat(e.target.value);
                          if (!_isNum(x[ri][ki])) x[ri][ki] = 0;
                          upd('multiRegData', Object.assign({}, d.multiRegData, { x: x }));
                        },
                        'data-sl-focusable': 'true', 'aria-label': 'Row ' + (ri + 1) + ' ' + d.multiRegData.xLabels[ki],
                        style: { width: 76, padding: 4, background: '#0f172a', color: '#a5b4fc', border: '1px solid #334155', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }
                      })
                    );
                  }),
                  h('td', { style: { padding: 2 } },
                    h('input', {
                      type: 'number', step: 'any', value: (d.multiRegData.y || [])[ri] || 0,
                      onChange: function(e) {
                        var y = (d.multiRegData.y || []).slice();
                        y[ri] = parseFloat(e.target.value);
                        if (!_isNum(y[ri])) y[ri] = 0;
                        upd('multiRegData', Object.assign({}, d.multiRegData, { y: y }));
                      },
                      'data-sl-focusable': 'true', 'aria-label': 'Row ' + (ri + 1) + ' outcome',
                      style: { width: 76, padding: 4, background: '#0f172a', color: '#fef3c7', border: '1px solid #334155', borderRadius: 4, fontSize: 11, fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }
                    })
                  ),
                  h('td', { style: { padding: 2 } },
                    (d.multiRegData.x || []).length > 1 && h('button', {
                      onClick: function() {
                        var x = d.multiRegData.x.slice(); x.splice(ri, 1);
                        var y = (d.multiRegData.y || []).slice(); y.splice(ri, 1);
                        upd('multiRegData', Object.assign({}, d.multiRegData, { x: x, y: y }));
                      },
                      'data-sl-focusable': 'true', 'aria-label': 'Remove row ' + (ri + 1),
                      style: { padding: '2px 6px', background: 'rgba(180,83,9,0.18)', color: '#fed7aa', border: '1px solid rgba(180,83,9,0.45)', borderRadius: 4, cursor: 'pointer', fontSize: 10 }
                    }, '×')
                  )
                );
              })
            )
          )
        ),
        h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6 } },
          'n = ' + (d.multiRegData.x || []).length + ' rows, ' + ((d.multiRegData.xLabels || []).length) + ' predictors. Need at least k+2 = ' + ((d.multiRegData.xLabels || []).length + 2) + '.'
        )
      )
    );
  }


  // ──────────────────────────────────────────────────────────────────
  // TEST panel — pick a test and run it
  // ──────────────────────────────────────────────────────────────────
  function _renderTest(d, upd, runTest, h, addToast) {
    var sel = d.selectedTest;
    // Group tests by family for the dropdown
    var groups = [
      { label: 'Compare means', tests: ['ttest_oneSample', 'ttest_paired', 'ttest_independent', 'anova_oneWay', 'anova_repeatedMeasures', 'anova_twoWay'] },
      { label: 'Relationships', tests: ['pearson', 'spearman', 'linearRegression', 'multipleRegression'] },
      { label: 'Frequencies', tests: ['chiSquareGoodnessOfFit', 'chiSquareIndependence'] },
      { label: 'Non-parametric', tests: ['mannWhitneyU', 'wilcoxonSignedRank', 'kruskalWallis'] }
    ];
    // Determine which data inputs feed this test (for the inline hint)
    var dataNeeded = '';
    if (/^ttest_(paired|independent)$|^pearson$|^spearman$|^linearRegression$|^mannWhitneyU$|^wilcoxonSignedRank$/.test(sel)) {
      dataNeeded = 'two-column data (' + d.twoColData.aLabel + ' n=' + d.twoColData.a.length + ', ' + d.twoColData.bLabel + ' n=' + d.twoColData.b.length + ')';
    } else if (/^anova_oneWay$|^anova_repeatedMeasures$|^kruskalWallis$/.test(sel)) {
      dataNeeded = 'multi-group data (' + d.multiColData.groups.length + ' groups; smallest n=' + Math.min.apply(null, d.multiColData.groups.map(function(g) { return g.values.length; }).concat([Infinity])) + ')';
    } else if (sel === 'ttest_oneSample') {
      dataNeeded = 'one column (n=' + d.oneColData.values.length + ') vs μ₀=' + d.oneColData.mu0;
    } else if (sel === 'chiSquareGoodnessOfFit') {
      dataNeeded = 'observed vs expected counts (' + d.chiGofData.observed.length + ' categories)';
    } else if (sel === 'chiSquareIndependence') {
      dataNeeded = 'contingency table (' + d.chiIndepData.rows.length + ' × ' + d.chiIndepData.cols.length + ')';
    } else if (sel === 'anova_twoWay') {
      dataNeeded = d.twoWayData ? 'two-way matrix loaded' : 'load Plant Growth sample';
    } else if (sel === 'multipleRegression') {
      dataNeeded = 'multi-predictor data (load via custom JSON)';
    } else {
      dataNeeded = 'pick a test below';
    }
    // Quick assumption preview for parametric tests
    var assumptionPreview = null;
    if (/^ttest_(paired|independent)$|^pearson$|^linearRegression$/.test(sel) && d.twoColData.a.length && d.twoColData.b.length) {
      var aWarn = assumptionChecks(d.twoColData.a);
      var bWarn = assumptionChecks(d.twoColData.b);
      var combined = aWarn.concat(bWarn);
      if (combined.length) assumptionPreview = combined.slice(0, 4);
    }
    return h('div', null,
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '⚖️ Choose a hypothesis test'),
        h('label', { htmlFor: 'sl-test-select', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'Test:'),
        h('select', {
          id: 'sl-test-select',
          value: sel || '',
          onChange: function(e) { upd('selectedTest', e.target.value || null); },
          'data-sl-focusable': 'true',
          style: {
            width: '100%', padding: '8px 10px', background: '#0f172a', color: '#e0e7ff',
            border: '1px solid #475569', borderRadius: 8, fontSize: 13, fontWeight: 700, marginBottom: 10
          }
        },
          h('option', { value: '' }, '— pick a test —'),
          groups.map(function(g) {
            return h('optgroup', { key: g.label, label: g.label },
              g.tests.map(function(tid) {
                var meta = WIZARD_TESTS[tid];
                return h('option', { key: tid, value: tid }, meta ? meta.label : tid);
              })
            );
          })
        ),
        sel && WIZARD_TESTS[sel] && h('div', {
          style: { fontSize: 12, color: '#cbd5e1', marginBottom: 10, fontStyle: 'italic', lineHeight: 1.5 }
        },
          h('b', { style: { color: '#fbbf24' } }, 'When to use: '), WIZARD_TESTS[sel].desc
        ),
        sel && h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } },
          h('b', null, 'Data needed: '), dataNeeded
        ),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          h('button', {
            onClick: function() {
              if (!sel) { if (addToast) addToast('Pick a test first.', 'info'); return; }
              runTest(sel, false);
            },
            'data-sl-focusable': 'true',
            disabled: !sel,
            style: {
              padding: '10px 20px',
              background: sel ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#374151',
              color: '#fff',
              border: '1px solid ' + (sel ? '#15803d' : '#4b5563'),
              borderRadius: 8, cursor: sel ? 'pointer' : 'not-allowed',
              fontSize: 14, fontWeight: 800, minHeight: 40
            }
          }, '▶ Run test'),
          // "Re-run minus outliers" — only show if test is parametric and there are flagged outliers
          (function() {
            if (!sel) return null;
            if (!/^(ttest_|anova_oneWay|anova_repeatedMeasures|pearson|linearRegression|kruskalWallis|mannWhitneyU|wilcoxonSignedRank)/.test(sel)) return null;
            var nOut = _outlierIndices(d.twoColData.a).length + _outlierIndices(d.twoColData.b).length
              + _outlierIndices(d.oneColData.values).length
              + d.multiColData.groups.reduce(function(acc, g) { return acc + _outlierIndices(g.values).length; }, 0);
            if (nOut === 0) return null;
            return h('button', {
              onClick: function() { runTest(sel, true); },
              'data-sl-focusable': 'true',
              title: 'Run the test after stripping ' + nOut + ' point(s) flagged by the 1.5×IQR rule. Useful for sensitivity analysis: how much does one outlier change your result?',
              style: {
                padding: '10px 16px',
                background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                border: '1px solid rgba(245,158,11,0.55)',
                borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, minHeight: 40
              }
            }, '⚠ Run minus ' + nOut + ' outlier(s)');
          })()
        )
      ),
      assumptionPreview && h('div', {
        style: {
          background: 'rgba(245,158,11,0.10)',
          border: '1px solid rgba(245,158,11,0.45)',
          borderRadius: 10, padding: 12, marginBottom: 12
        },
        role: 'note', 'aria-label': 'Assumption check warnings'
      },
        h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 6 } }, '⚠ Assumption checks'),
        assumptionPreview.map(function(w, i) {
          return h('div', { key: i, style: { fontSize: 11, color: '#fde68a', lineHeight: 1.5, marginBottom: 4 } }, '• ' + w.msg);
        })
      ),
      // Visual preview of the loaded data for the selected test
      sel && h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 12
        }
      },
        h('div', { style: { fontSize: 12, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '📊 Visual preview'),
        _renderChartFor(d, h) || h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Load data in the Data tab to see a chart here.')
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // RESULTS panel — numeric + plain-English + APA + show-the-math + AI grader
  // ──────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────
  // CONCEPT MASTERY PANEL — cross-attempt log of AP quiz questions the
  // student has answered correctly at least once, rolled up into AP Stats
  // concept clusters. Mirrors the BirdLab life list / PetsLab decoder /
  // OpticsLab pattern: per-attempt scores reset; mastery accumulates.
  // ──────────────────────────────────────────────────────────────────
  function _renderStatsMasteryPanel(d, upd, h) {
    var mastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
    var totalQuestions = AP_QUIZ_BANK.length;
    var masteredQuestions = AP_QUIZ_BANK.filter(function (q) { return !!mastery[q.q]; });
    var masteredCount = masteredQuestions.length;
    var pctOverall = totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0;

    // Five conceptual clusters covering the AP-Stats / AP-Psych curriculum.
    // "Test selection" rolls up the test_id + post_hoc tags.
    var CONCEPTS = [
      { id: 'inference',  label: '🧠 Inference logic',  color: '#a855f7',
        tagMatch: function (tags) { return tags.indexOf('p_value') !== -1 || tags.indexOf('type_error') !== -1 || tags.indexOf('ci') !== -1; } },
      { id: 'effect',     label: '📏 Effect size + power', color: '#22c55e',
        tagMatch: function (tags) { return tags.indexOf('effect_size') !== -1 || tags.indexOf('power') !== -1; } },
      { id: 'tests',      label: '⚖️ Test selection',  color: '#0ea5e9',
        tagMatch: function (tags) { return tags.indexOf('test_id') !== -1 || tags.indexOf('post_hoc') !== -1; } },
      { id: 'correlation',label: '📈 Correlation + regression', color: '#f59e0b',
        tagMatch: function (tags) { return tags.indexOf('pearson') !== -1 || tags.indexOf('correlation') !== -1 || tags.indexOf('regression') !== -1; } },
      { id: 'design',     label: '🧪 Study design',     color: '#ec4899',
        tagMatch: function (tags) { return tags.indexOf('design') !== -1 || tags.indexOf('sampling') !== -1 || tags.indexOf('confound') !== -1; } },
      { id: 'descriptive',label: '📊 Distributions + descriptives', color: '#14b8a6',
        tagMatch: function (tags) { return tags.indexOf('distribution') !== -1 || tags.indexOf('descriptive') !== -1 || tags.indexOf('central_tendency') !== -1 || tags.indexOf('variability') !== -1; } }
    ];

    function fmtDate(iso) {
      if (!iso) return '';
      try {
        var dd = new Date(iso);
        return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch (e) { return iso.substring(0, 10); }
    }

    var conceptStats = CONCEPTS.map(function (c) {
      var qs = AP_QUIZ_BANK.filter(function (q) { return c.tagMatch(q.tags || []); });
      var done = qs.filter(function (q) { return !!mastery[q.q]; });
      return { concept: c, questions: qs, doneCount: done.length };
    }).filter(function (cs) { return cs.questions.length > 0; }); // hide empty concepts

    // Questions not captured by any concept (mostly cross-cutting "universal" tagged items).
    var uncategorizedQs = AP_QUIZ_BANK.filter(function (q) {
      return !CONCEPTS.some(function (c) { return c.tagMatch(q.tags || []); });
    });

    return h('section', {
      'aria-label': 'AP statistics concept mastery',
      style: { marginTop: 4 }
    },
      // Hero
      h('div', {
        style: {
          padding: 18, borderRadius: 14, marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.18) 50%, rgba(236,72,153,0.18) 100%)',
          border: '2px solid rgba(168,85,247,0.55)'
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
          h('div', { style: { textAlign: 'center', minWidth: 110 } },
            h('div', { style: { fontSize: 38, fontWeight: 900, color: '#d8b4fe', lineHeight: 1 } }, masteredCount + ' / ' + totalQuestions),
            h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, 'Quiz questions mastered')
          ),
          h('div', { style: { flex: 1, minWidth: 240 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🏅'),
              h('h3', { style: { margin: 0, fontSize: 17, color: '#e2e8f0', fontWeight: 800 } }, 'AP Stats Concept Mastery')
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } },
              'Every AP quiz question you answer correctly at least once locks in here permanently. Quiz attempts give you per-attempt scores; this view shows what is locked in across every attempt you have ever taken.'
            ),
            h('div', { style: { height: 8, background: 'rgba(15,23,42,0.5)', borderRadius: 4, overflow: 'hidden' }, 'aria-hidden': 'true' },
              h('div', { style: { width: pctOverall + '%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)', transition: 'width 0.3s' } })
            ),
            h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: 700 } },
              pctOverall === 100 ? '🏆 Full coverage — every AP question mastered'
              : masteredCount === 0 ? 'Run any test, then take the 5-question quiz on the Results tab'
              : pctOverall + '% complete · ' + (totalQuestions - masteredCount) + ' to go'
            )
          )
        )
      ),
      // Concept cards
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 } },
        conceptStats.map(function (cs) {
          var pct = cs.questions.length > 0 ? Math.round((cs.doneCount / cs.questions.length) * 100) : 0;
          var statusLabel = cs.doneCount === 0 ? 'Untouched'
            : cs.doneCount === cs.questions.length ? '✓ All mastered'
            : cs.doneCount + ' / ' + cs.questions.length;
          var statusColor = cs.doneCount === 0 ? '#64748b'
            : cs.doneCount === cs.questions.length ? '#22c55e'
            : cs.concept.color;
          return h('div', {
            key: cs.concept.id,
            style: {
              padding: 12, borderRadius: 12,
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid ' + (cs.doneCount > 0 ? cs.concept.color + 'aa' : 'rgba(148,163,184,0.25)')
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#e2e8f0', flex: 1 } }, cs.concept.label),
              h('div', { style: { fontSize: 11, fontWeight: 700, color: statusColor } }, statusLabel)
            ),
            h('div', { style: { height: 5, background: 'rgba(15,23,42,0.8)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }, 'aria-hidden': 'true' },
              h('div', { style: { width: pct + '%', height: '100%', background: cs.concept.color, transition: 'width 0.3s' } })
            ),
            h('ul', { style: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
              cs.questions.map(function (q, i) {
                var entry = mastery[q.q];
                var done = !!entry;
                return h('li', {
                  key: i,
                  style: {
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    fontSize: 11,
                    color: done ? '#cbd5e1' : '#64748b',
                    lineHeight: 1.45
                  }
                },
                  h('span', { 'aria-hidden': 'true', style: { color: done ? '#22c55e' : '#475569', fontWeight: 700, flexShrink: 0, marginTop: 1 } }, done ? '✓' : '○'),
                  h('span', { style: { flex: 1, minWidth: 0 } },
                    q.q.length > 80 ? q.q.substring(0, 77) + '…' : q.q,
                    done && entry.firstCorrectAt && h('span', { style: { color: '#64748b', fontSize: 10, marginLeft: 6, fontStyle: 'italic' } }, '· ' + fmtDate(entry.firstCorrectAt))
                  )
                );
              })
            )
          );
        })
      ),
      // CTA
      h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', border: '1px dashed rgba(168,85,247,0.50)' } },
        h('button', {
          onClick: function () { upd({ mode: 'results', quizQuestions: null, quizAnswers: [], quizSubmitted: false }); },
          style: {
            padding: '10px 18px', width: '100%',
            background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 800, cursor: 'pointer'
          }
        },
          masteredCount === 0 ? '⚖️ Run a test, then take the AP quiz to start'
          : masteredCount === totalQuestions ? '🏆 All mastered — re-attempt to reinforce'
          : '📝 Open Results to take another quiz attempt'
        )
      )
    );
  }

  function _renderResults(d, upd, h, addToast, gradeInterpretation, awardXP, setSlCeleb) {
    var r = d.lastResult;
    if (!r) {
      return h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)', border: '1px dashed rgba(99,102,241,0.40)',
          borderRadius: 10, padding: 24, textAlign: 'center', color: '#94a3b8'
        }
      },
        h('div', { style: { fontSize: 32, marginBottom: 8 } }, '📈'),
        h('div', { style: { fontSize: 14, marginBottom: 6 } }, 'No result yet.'),
        h('div', { style: { fontSize: 12 } }, 'Run a test from the ', h('b', { style: { color: '#a5b4fc' } }, 'Test'), ' tab to see results here.')
      );
    }
    if (r.error) {
      return h('div', {
        style: {
          background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.45)',
          borderRadius: 10, padding: 14
        }
      },
        h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fca5a5' } }, '⚠ ' + r.error)
      );
    }
    var apa = apaWriteup(r);
    var pe = plainEnglish(r);
    function copyAPA() {
      try {
        navigator.clipboard.writeText(apa);
        upd('apaCopied', (d.apaCopied || 0) + 1);
        if (awardXP) awardXP(5, 'StatsLab — APA write-up copied', 'statsLab');
        if (addToast) addToast('✓ APA write-up copied to clipboard', 'success');
      } catch (e) {
        if (addToast) addToast('Copy failed — select and copy manually.', 'error');
      }
    }
    function copyFullReport() {
      // Build a structured plain-text lab report ready for paste into Docs/Word
      var sample = d.sampleId ? getSample(d.sampleId) : null;
      var lines = [];
      lines.push('═══════════════════════════════════════════════════════════');
      lines.push('  STATISTICAL ANALYSIS REPORT');
      lines.push('  (generated by AlloFlow Statistics Lab)');
      lines.push('═══════════════════════════════════════════════════════════');
      lines.push('');
      if (sample) {
        lines.push('DATASET: ' + sample.title + ' (' + sample.curriculum + ')');
        lines.push('RESEARCH QUESTION: ' + sample.research_question);
      }
      lines.push('TEST: ' + (r.test || d.lastTestType || 'unknown'));
      lines.push('');
      lines.push('─── 1. APA-7 WRITE-UP ─────────────────────────────────────');
      lines.push(apa || '(no APA template for this test)');
      lines.push('');
      lines.push('─── 2. PLAIN-ENGLISH SUMMARY ──────────────────────────────');
      lines.push(pe);
      lines.push('');
      lines.push('─── 3. NUMERIC RESULTS ────────────────────────────────────');
      stats.forEach(function(s) { lines.push('  ' + s[0] + ': ' + s[1]); });
      lines.push('');
      if (r.tukey && r.tukey.length) {
        lines.push('─── 4. TUKEY HSD POST-HOC ─────────────────────────────────');
        r.tukey.forEach(function(c) {
          lines.push('  Group ' + (c.i + 1) + ' vs Group ' + (c.j + 1) + ': mean diff = ' + c.diff.toFixed(3) + ', q = ' + c.q.toFixed(3) + ', p ' + (c.sig ? '< .05 *' : '≥ .05'));
        });
        lines.push('');
      }
      lines.push('─── 5. SHOW-THE-MATH ──────────────────────────────────────');
      lines.push(_mathFormula(r, d));
      lines.push('');
      if (d.permResult && !d.permResult.error) {
        lines.push('─── 6. RANDOMIZATION CHECK (1000 shuffles) ────────────────');
        lines.push('  ' + d.permResult.moreExtreme + ' of ' + d.permResult.nReps + ' shuffles produced ' + d.permResult.statName + ' as extreme as ' + d.permResult.observed.toFixed(3));
        lines.push('  Empirical p = ' + d.permResult.pPerm.toFixed(4) + '  (formula-based p = ' + (_isNum(r.p) ? (r.p < 0.001 ? '< .001' : r.p.toFixed(4)) : '?') + ')');
        lines.push('');
      }
      if (d.interpretationDraft && d.interpretationDraft.trim()) {
        lines.push('─── STUDENT INTERPRETATION ────────────────────────────────');
        lines.push(d.interpretationDraft);
        lines.push('');
      }
      lines.push('═══════════════════════════════════════════════════════════');
      var report = lines.join('\n');
      try {
        navigator.clipboard.writeText(report);
        if (awardXP) awardXP(10, 'StatsLab — full report exported', 'statsLab');
        if (addToast) addToast('✓ Full report copied to clipboard (paste into Docs/Word)', 'success');
      } catch (e) {
        if (addToast) addToast('Copy failed — clipboard access blocked.', 'error');
      }
    }
    // Build numeric stat row entries
    var stats = [];
    function add(k, v, fmt) {
      if (v == null || (typeof v === 'number' && !isFinite(v))) return;
      var disp = fmt ? fmt(v) : (typeof v === 'number' ? (Math.abs(v) < 0.001 ? v.toExponential(2) : v.toFixed(3)) : String(v));
      stats.push([k, disp]);
    }
    add('Test', r.test);
    add('t', r.t);
    add('df', r.df);
    add('F', r.F);
    add('df₁ (between)', r.dfBetween);
    add('df₂ (within)', r.dfWithin);
    add('χ²', r.chiSquared);
    add('p', r.p, function(p) {
      if (p < 0.001) return '< .001';
      return p.toFixed(4);
    });
    add('Mean (M)', r.mean);
    add('SD', r.sd);
    add('Mean diff', r.meanDiff);
    add('M₁', r.mean1); add('SD₁', r.sd1); add('n₁', r.n1);
    add('M₂', r.mean2); add('SD₂', r.sd2); add('n₂', r.n2);
    add("Cohen's d", r.cohensD);
    add('η²', r.etaSquared);
    add('ω²', r.omegaSquared);
    add('partial η²', r.partialEtaSquared);
    add('r', r.r);
    add('r²', r.rSquared || (r.r != null ? r.r * r.r : null));
    add('Slope (b)', r.slope);
    add('Intercept (a)', r.intercept);
    add('SE(b)', r.seSlope);
    add('R²', r.rSquared);
    add('Adjusted R²', r.adjRSquared);
    add('U', r.U);
    add('W', r.W);
    add('H', r.H);
    add('z', r.z);
    add("Cramér's V", r.cramersV);
    add('φ (Phi)', r.phi);
    if (r.ci95) add('95% CI', '[' + r.ci95[0].toFixed(3) + ', ' + r.ci95[1].toFixed(3) + ']');
    if (r.ciDiff) add('95% CI on diff', '[' + r.ciDiff[0].toFixed(3) + ', ' + r.ciDiff[1].toFixed(3) + ']');
    // Effect size badge
    var esBadge = null;
    if (_isNum(r.cohensD)) esBadge = effectSizeLabel(r.cohensD, 'd');
    else if (_isNum(r.etaSquared)) esBadge = effectSizeLabel(r.etaSquared, 'eta');
    else if (_isNum(r.r)) esBadge = effectSizeLabel(r.r, 'r');
    else if (_isNum(r.cramersV)) esBadge = effectSizeLabel(r.cramersV, 'v');
    var pSig = _isNum(r.p) && r.p < 0.05;
    return h('div', null,
      // Outlier-exclusion banner (only when test was re-run minus outliers)
      d.excludedOutliers && d.outliersRemoved > 0 && h('div', {
        style: {
          background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.55)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12, color: '#fbbf24', fontWeight: 700
        },
        role: 'note'
      },
        '⚠ Sensitivity analysis: ' + d.outliersRemoved + ' outlier(s) (1.5×IQR rule) were excluded from this run. Compare to the all-data result to see how much one extreme value moves your conclusion.'
      ),
      // Top banner: significance + effect-size verdict
      h('div', {
        style: {
          background: pSig ? 'linear-gradient(135deg, rgba(22,163,74,0.18), rgba(21,128,61,0.10))' : 'rgba(99,102,241,0.10)',
          border: '1px solid ' + (pSig ? 'rgba(22,163,74,0.50)' : 'rgba(99,102,241,0.40)'),
          borderRadius: 10, padding: 14, marginBottom: 12
        },
        role: 'status', 'aria-live': 'polite'
      },
        h('div', { style: { fontSize: 14, fontWeight: 900, color: pSig ? '#86efac' : '#a5b4fc', marginBottom: 6 } },
          pSig ? '✓ Significant result' : (_isNum(r.p) ? 'Not significant' : (r.test || 'Result'))
        ),
        h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.55 } }, pe),
        esBadge && h('div', { style: { marginTop: 8, display: 'inline-block', padding: '3px 10px', background: esBadge.color, color: '#0b1220', borderRadius: 999, fontSize: 11, fontWeight: 800 } },
          'Effect size: ' + esBadge.label
        )
      ),
      // Visual chart of the data behind this result
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 12, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '📊 Your data'),
        _renderChartFor(d, h) || h('div', { style: { fontSize: 11, color: '#94a3b8' } }, '(no chart available for this test)')
      ),
      // Multi-coefficient table (only shown for multiple regression)
      r.test === 'Multiple linear regression' && Array.isArray(r.coefficients) && h('div', {
        style: {
          background: 'rgba(15,23,42,0.60)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '📊 Coefficient table'),
        h('div', { style: { overflowX: 'auto' } },
          h('table', {
            style: { width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' },
            'aria-label': 'Multiple regression coefficients'
          },
            h('thead', null,
              h('tr', { style: { borderBottom: '1px solid #475569' } },
                h('th', { style: { textAlign: 'left', padding: 6, color: '#fbbf24' } }, 'Term'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, 'b (coef)'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, 'SE'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, 't'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, 'p')
              )
            ),
            h('tbody', null,
              r.coefficients.map(function(c, ci) {
                var label = ci === 0 ? '(Intercept)' : (((d.multiRegData && d.multiRegData.xLabels) || []).slice()[ci - 1] || ('X' + ci));
                var pVal = (r.ps && r.ps[ci] != null) ? r.ps[ci] : null;
                var pSig = _isNum(pVal) && pVal < 0.05;
                return h('tr', { key: ci, style: { borderBottom: '1px solid #1e293b' } },
                  h('td', { style: { padding: 6, color: '#e2e8f0', fontWeight: 700 } }, label),
                  h('td', { style: { padding: 6, textAlign: 'right', color: '#fef3c7', fontWeight: 700 } }, c.toFixed(4)),
                  h('td', { style: { padding: 6, textAlign: 'right', color: '#cbd5e1' } }, (r.ses && r.ses[ci] != null) ? r.ses[ci].toFixed(4) : '—'),
                  h('td', { style: { padding: 6, textAlign: 'right', color: '#cbd5e1' } }, (r.ts && r.ts[ci] != null) ? r.ts[ci].toFixed(3) : '—'),
                  h('td', { style: { padding: 6, textAlign: 'right', color: pSig ? '#86efac' : '#cbd5e1', fontWeight: pSig ? 800 : 400 } },
                    _isNum(pVal) ? (pVal < 0.001 ? '< .001' : pVal.toFixed(4)) : '—'
                  )
                );
              })
            )
          )
        ),
        h('div', { style: { marginTop: 8, fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
          h('b', null, 'Overall model: '),
          'F(', r.df1, ', ', r.df2, ') = ', _isNum(r.F) ? r.F.toFixed(2) : '?',
          ', p ', r.p < 0.001 ? '< .001' : ('= ' + r.p.toFixed(4)),
          ', R² = ', _isNum(r.rSquared) ? r.rSquared.toFixed(3) : '?',
          ', adj. R² = ', _isNum(r.adjRSquared) ? r.adjRSquared.toFixed(3) : '?'
        )
      ),
      // Numeric panel
      h('div', {
        style: {
          background: 'rgba(15,23,42,0.60)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc' } }, '🔢 Numeric output'),
          h('button', {
            onClick: function() { upd('showGlossary', !d.showGlossary); },
            'data-sl-focusable': 'true',
            'aria-expanded': !!d.showGlossary,
            title: 'Show definitions of every statistic in this result',
            style: { padding: '4px 10px', background: 'rgba(168,85,247,0.18)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.55)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
          }, (d.showGlossary ? '▼' : '▶') + ' 📖 Glossary')
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6, fontFamily: 'monospace', fontSize: 12 } },
          stats.map(function(s, i) {
            return h('div', {
              key: i,
              style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px' }
            },
              h('div', { style: { color: '#94a3b8', fontSize: 10 } }, s[0]),
              h('div', { style: { color: '#fef3c7', fontWeight: 700 } }, s[1])
            );
          })
        ),
        d.showGlossary && h('div', {
          style: {
            marginTop: 12, padding: 12,
            background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.40)',
            borderRadius: 8
          },
          role: 'region', 'aria-label': 'Glossary of statistical terms'
        },
          h('div', { style: { fontSize: 11, fontWeight: 800, color: '#d8b4fe', marginBottom: 8 } }, '📖 Definitions of terms in this result'),
          (function() {
            var keys = _glossaryKeysForResult(r);
            if (!keys.length) return h('div', { style: { fontSize: 11, color: '#94a3b8' } }, '(no glossary entries to show)');
            return keys.map(function(k) {
              var g = GLOSSARY[k];
              return h('div', { key: k, style: { marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(168,85,247,0.20)' } },
                h('span', { style: { fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24', fontSize: 12 } }, k),
                h('span', { style: { color: '#cbd5e1', fontSize: 11, marginLeft: 6 } }, '— ' + g.name),
                h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55, marginTop: 3 } }, g.def)
              );
            });
          })()
        )
      ),
      // APA write-up
      apa && h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc' } }, '📋 APA-7 write-up'),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', {
              onClick: copyAPA,
              'data-sl-focusable': 'true',
              style: { padding: '4px 10px', background: 'rgba(99,102,241,0.18)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.55)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
            }, '📋 Copy APA'),
            h('button', {
              onClick: copyFullReport,
              'data-sl-focusable': 'true',
              title: 'Copy a structured lab report (APA + plain-English + numeric + math + interpretation) to clipboard, ready for paste into Google Docs or Word',
              style: { padding: '4px 10px', background: 'rgba(34,197,94,0.18)', color: '#86efac', border: '1px solid rgba(34,197,94,0.55)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
            }, '📄 Export full report')
          )
        ),
        h('div', { style: { fontSize: 13, color: '#e2e8f0', fontFamily: 'serif', fontStyle: 'italic', padding: 10, background: '#0f172a', borderRadius: 6, lineHeight: 1.6 } }, apa)
      ),
      // Tukey post-hoc (if present)
      r.tukey && r.tukey.length > 0 && h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '🔬 Tukey HSD post-hoc comparisons'),
        h('div', { style: { display: 'grid', gap: 4, fontFamily: 'monospace', fontSize: 12 } },
          r.tukey.map(function(c, i) {
            return h('div', {
              key: i,
              style: {
                background: c.sig ? 'rgba(22,163,74,0.10)' : '#0f172a',
                border: '1px solid ' + (c.sig ? 'rgba(22,163,74,0.50)' : '#334155'),
                borderRadius: 6, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
              }
            },
              h('span', { style: { color: '#fef3c7' } }, 'Group ' + (c.i + 1) + ' vs Group ' + (c.j + 1)),
              h('span', { style: { color: c.sig ? '#86efac' : '#cbd5e1' } },
                'mean diff = ' + c.diff.toFixed(2) + ', q = ' + c.q.toFixed(2) + ', p ' + (c.sig ? '< .05' : '≥ .05')
              )
            );
          })
        )
      ),
      // Show-me-the-math toggle
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.05)',
          border: '1px solid rgba(99,102,241,0.30)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('button', {
          onClick: function() { upd('showMath', !d.showMath); },
          'data-sl-focusable': 'true',
          'aria-expanded': !!d.showMath,
          style: { background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0 }
        }, (d.showMath ? '▼' : '▶') + ' 📐 Show me the math'),
        d.showMath && h('div', { style: { marginTop: 10, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, background: '#0f172a', padding: 12, borderRadius: 6 } },
          _mathFormula(r, d)
        )
      ),
      // "What if my sample were smaller?" — recompute test on random subsamples
      // and plot the distribution of resulting p-values. Teaches sample-size
      // intuition: small-n studies are wildly unstable.
      _isNum(r.p) && /ttest_(paired|independent)|^pearson$|^linearRegression$/.test(d.lastTestType || '') && h('div', {
        style: {
          background: 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 6 } }, '📉 Sample-size stability check'),
        h('p', { style: { margin: '0 0 8px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
          'What if your study had been smaller? This recomputes your test on 200 random subsamples at each n. Watch how wildly p bounces around when n is small — and how it stabilizes as n grows. ',
          h('b', null, 'A "significant" study at n=10 is much weaker evidence than the same effect at n=50.')
        ),
        h('button', {
          onClick: function() {
            var n = Math.min(d.twoColData.a.length, d.twoColData.b.length);
            if (n < 6) { if (addToast) addToast('Need n ≥ 6 in each group to run stability check.', 'info'); return; }
            // Run subsamples at 5 different n levels
            var levels = [];
            var nVals = [Math.max(4, Math.floor(n * 0.25)), Math.floor(n * 0.50), Math.floor(n * 0.75), n];
            // Dedupe
            nVals = nVals.filter(function(v, i, arr) { return arr.indexOf(v) === i && v >= 4; });
            nVals.forEach(function(nLevel) {
              var ps = [];
              for (var k = 0; k < 200; k++) {
                var idx = [];
                while (idx.length < nLevel) {
                  var j = Math.floor(Math.random() * Math.min(d.twoColData.a.length, d.twoColData.b.length));
                  if (idx.indexOf(j) === -1) idx.push(j);
                }
                var subA = idx.map(function(i) { return d.twoColData.a[i]; });
                var subB = idx.map(function(i) { return d.twoColData.b[i]; });
                var subRes;
                if (d.lastTestType === 'ttest_paired') subRes = ttest_paired(subA, subB);
                else if (d.lastTestType === 'pearson') subRes = pearson(subA, subB);
                else if (d.lastTestType === 'linearRegression') subRes = linearRegression(subA, subB);
                else subRes = ttest_independent(subA, subB);
                if (_isNum(subRes.p)) ps.push(subRes.p);
              }
              ps.sort(function(a, b) { return a - b; });
              levels.push({
                n: nLevel,
                pMedian: ps.length ? ps[Math.floor(ps.length / 2)] : NaN,
                pLo: ps.length ? ps[Math.floor(ps.length * 0.10)] : NaN,
                pHi: ps.length ? ps[Math.floor(ps.length * 0.90)] : NaN,
                pSigPct: ps.length ? (100 * ps.filter(function(p) { return p < 0.05; }).length / ps.length) : 0
              });
            });
            upd('subsampleResult', { levels: levels });
          },
          'data-sl-focusable': 'true',
          style: {
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#fff', border: '1px solid #d97706',
            borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700
          }
        }, '📉 Run stability check (200× per n level)'),
        d.subsampleResult && h('div', { style: { marginTop: 10 } },
          h('table', {
            style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' },
            'aria-label': 'Subsample stability table'
          },
            h('thead', null,
              h('tr', { style: { borderBottom: '1px solid #475569' } },
                h('th', { style: { textAlign: 'left', padding: 6, color: '#fbbf24' } }, 'n'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, 'median p'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, '10–90% range'),
                h('th', { style: { textAlign: 'right', padding: 6, color: '#fbbf24' } }, '% sig (p<.05)')
              )
            ),
            h('tbody', null,
              d.subsampleResult.levels.map(function(L, i) {
                return h('tr', { key: i, style: { borderBottom: '1px solid #1e293b' } },
                  h('td', { style: { padding: 6, color: '#fef3c7', fontWeight: 700 } }, L.n),
                  h('td', { style: { padding: 6, textAlign: 'right', color: '#e2e8f0' } }, _isNum(L.pMedian) ? L.pMedian.toFixed(4) : '—'),
                  h('td', { style: { padding: 6, textAlign: 'right', color: '#cbd5e1' } },
                    (_isNum(L.pLo) ? L.pLo.toFixed(4) : '—') + ' to ' + (_isNum(L.pHi) ? L.pHi.toFixed(4) : '—')
                  ),
                  h('td', { style: { padding: 6, textAlign: 'right', color: L.pSigPct >= 80 ? '#86efac' : (L.pSigPct >= 50 ? '#fbbf24' : '#fca5a5'), fontWeight: 700 } },
                    L.pSigPct.toFixed(0) + '%'
                  )
                );
              })
            )
          ),
          h('div', { style: { marginTop: 8, fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, fontStyle: 'italic' } },
            'The "% sig" column is your effective ',
            h('b', { style: { color: '#fbbf24' } }, 'replication rate'),
            '. If small-n studies replicate at <50%, the effect is too noisy to detect reliably at that sample size — even when the underlying effect is real.'
          )
        )
      ),
      // Resampling toolkit: permutation test + bootstrap CI
      h('div', {
        style: {
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#6ee7b7', marginBottom: 6 } }, '🎲 Resampling toolkit'),
        h('p', { style: { margin: '0 0 10px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
          'Two complementary resampling demos: ',
          h('b', null, 'permutation'),
          ' (shuffle labels to simulate the null) shows what a p-value means. ',
          h('b', null, 'Bootstrap'),
          ' (resample WITH replacement) shows what the 95% CI means.'
        ),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 } },
          h('button', {
            onClick: function() {
              var perm = permutationTest(d, d.lastTestType, 1000);
              upd('permResult', perm);
            },
            'data-sl-focusable': 'true',
            style: {
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', border: '1px solid #059669',
              borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700
            }
          }, '🎲 Permutation: 1000 shuffles'),
          h('button', {
            onClick: function() {
              var boot = bootstrapCI(d, d.lastTestType, 0.95, 1000);
              upd('bootResult', boot);
            },
            'data-sl-focusable': 'true',
            style: {
              padding: '8px 14px',
              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
              color: '#fff', border: '1px solid #0891b2',
              borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700
            }
          }, '🎯 Bootstrap: 1000 resamples → 95% CI')
        ),
        d.bootResult && h('div', { style: { marginBottom: 12 } },
          d.bootResult.error
            ? h('div', { style: { fontSize: 11, color: '#fca5a5' } }, '⚠ ' + d.bootResult.error)
            : h('div', null,
                _renderBootstrapViz(d.bootResult, h),
                h('div', { style: { marginTop: 8, fontSize: 12, color: '#fef3c7', lineHeight: 1.6 } },
                  h('b', null, 'Bootstrap 95% CI for ' + d.bootResult.statName + ': '),
                  '[', h('b', { style: { color: '#10b981' } }, d.bootResult.ci[0].toFixed(3)),
                  ', ', h('b', { style: { color: '#10b981' } }, d.bootResult.ci[1].toFixed(3)), ']  ',
                  h('span', { style: { fontStyle: 'italic', color: '#cbd5e1' } },
                    '(observed = ', d.bootResult.observed.toFixed(3), ')'
                  )
                ),
                h('div', { style: { marginTop: 6, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, fontStyle: 'italic' } },
                  'Read this as: "If we re-ran this study many times, 95% of the resulting estimates would fall in this range." If 0 is OUTSIDE this CI for a difference (or 0 outside r/slope), your effect is significant at α = .05.'
                )
              )
        ),
        d.permResult && h('div', { style: { marginTop: 12 } },
          d.permResult.error
            ? h('div', { style: { fontSize: 11, color: '#fca5a5' } }, '⚠ ' + d.permResult.error)
            : h('div', null,
                _renderPermutationViz(d.permResult, h),
                h('div', { style: { marginTop: 8, fontSize: 12, color: '#fef3c7', lineHeight: 1.6 } },
                  h('b', null, d.permResult.moreExtreme + ' of ' + d.permResult.nReps),
                  ' shuffles produced a test stat as extreme as your observed ',
                  d.permResult.statName, ' = ', d.permResult.observed.toFixed(3),
                  '. Empirical p = ', h('b', { style: { color: '#fbbf24' } }, d.permResult.pPerm.toFixed(4)), '.'
                ),
                h('div', { style: { marginTop: 6, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, fontStyle: 'italic' } },
                  '(Compare to the formula-based p = ', _isNum(r.p) ? (r.p < 0.001 ? '< .001' : r.p.toFixed(4)) : '?', '. They should be very close — both estimate the same thing two different ways.)'
                )
              )
        )
      ),
      // Common misconceptions
      _renderMisconceptions(r, h),
      // AP Exam Quiz — 5 multiple-choice items keyed to the test you just ran
      h('div', {
        style: {
          background: 'rgba(168,85,247,0.08)',
          border: '1px solid rgba(168,85,247,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#d8b4fe', marginBottom: 6 } }, '📝 AP exam quiz mode'),
        h('p', { style: { margin: '0 0 8px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
          'Take a 5-question multiple-choice quiz on the concepts behind your result. Two questions are tied to the specific test you ran; two probe p-values + type I/II errors; one is random. Answers include rationales.'
        ),
        !d.quizQuestions && h('button', {
          onClick: function() {
            upd({
              quizQuestions: _pickQuizQuestions(d.lastTestType),
              quizAnswers: [],
              quizSubmitted: false,
              quizCorrect: 0
            });
          },
          'data-sl-focusable': 'true',
          style: {
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
            color: '#fff', border: '1px solid #7e22ce',
            borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700
          }
        }, '📝 Start 5-question quiz'),
        d.quizQuestions && h('div', { style: { marginTop: 10 } },
          d.quizQuestions.map(function(q, qi) {
            var pickedIdx = (d.quizAnswers || [])[qi];
            var hasPicked = pickedIdx != null;
            var isCorrect = pickedIdx === q.correct;
            return h('div', {
              key: qi,
              style: {
                marginBottom: 14, padding: 10,
                background: '#0f172a',
                border: '1px solid ' + (d.quizSubmitted ? (isCorrect ? 'rgba(22,163,74,0.55)' : 'rgba(220,38,38,0.55)') : '#334155'),
                borderRadius: 8
              }
            },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Question ' + (qi + 1) + ' of ' + d.quizQuestions.length),
              h('div', { style: { fontSize: 13, color: '#fef3c7', fontWeight: 700, marginBottom: 8, lineHeight: 1.45 } }, q.q),
              q.choices.map(function(choice, ci) {
                var isPicked = pickedIdx === ci;
                var isThisCorrect = ci === q.correct;
                var bg = '#1e293b', borderColor = '#334155', textColor = '#cbd5e1';
                if (d.quizSubmitted) {
                  if (isThisCorrect) { bg = 'rgba(22,163,74,0.18)'; borderColor = 'rgba(22,163,74,0.55)'; textColor = '#86efac'; }
                  else if (isPicked) { bg = 'rgba(220,38,38,0.18)'; borderColor = 'rgba(220,38,38,0.55)'; textColor = '#fca5a5'; }
                } else if (isPicked) {
                  bg = 'rgba(168,85,247,0.18)'; borderColor = 'rgba(168,85,247,0.55)'; textColor = '#d8b4fe';
                }
                return h('button', {
                  key: ci,
                  onClick: function() {
                    if (d.quizSubmitted) return;
                    var ans = (d.quizAnswers || []).slice();
                    while (ans.length <= qi) ans.push(null);
                    ans[qi] = ci;
                    upd('quizAnswers', ans);
                  },
                  'data-sl-focusable': 'true',
                  disabled: d.quizSubmitted,
                  style: {
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 10px', marginBottom: 4,
                    background: bg, color: textColor, border: '1px solid ' + borderColor,
                    borderRadius: 6, cursor: d.quizSubmitted ? 'default' : 'pointer',
                    fontSize: 12, lineHeight: 1.45
                  }
                },
                  h('span', { style: { fontWeight: 800, marginRight: 6 } }, String.fromCharCode(65 + ci) + '.'),
                  choice,
                  d.quizSubmitted && isThisCorrect && h('span', { style: { color: '#86efac', marginLeft: 8, fontWeight: 800 } }, ' ✓ correct'),
                  d.quizSubmitted && isPicked && !isThisCorrect && h('span', { style: { color: '#fca5a5', marginLeft: 8, fontWeight: 800 } }, ' ✗ your answer')
                );
              }),
              d.quizSubmitted && h('div', {
                style: { marginTop: 8, padding: 8, background: 'rgba(99,102,241,0.10)', borderLeft: '3px solid #6366f1', borderRadius: 4, fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 }
              },
                h('b', { style: { color: '#a5b4fc' } }, '💡 Why: '), q.explain
              )
            );
          }),
          !d.quizSubmitted && h('button', {
            onClick: function() {
              var ans = d.quizAnswers || [];
              if (ans.filter(function(a) { return a != null; }).length < d.quizQuestions.length) {
                if (addToast) addToast('Answer all 5 questions before submitting.', 'info');
                return;
              }
              var correct = 0;
              // ── Concept Mastery: per-question first-correct log ──
              // Each quiz question keyed by text (stable, unique within bank).
              // Quiz score is per-attempt; mastery sticks across attempts.
              var prevMastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
              var nextMastery = Object.assign({}, prevMastery);
              var newlyMasteredQ = null;
              var nowIso = new Date().toISOString();
              for (var qi = 0; qi < d.quizQuestions.length; qi++) {
                var q = d.quizQuestions[qi];
                var isCorrect = ans[qi] === q.correct;
                if (isCorrect) {
                  correct++;
                  var key = q.q;
                  var existingEntry = nextMastery[key];
                  if (existingEntry) {
                    nextMastery[key] = Object.assign({}, existingEntry, {
                      lastCorrectAt: nowIso,
                      correctCount: (existingEntry.correctCount || 0) + 1
                    });
                  } else {
                    nextMastery[key] = {
                      firstCorrectAt: nowIso,
                      lastCorrectAt: nowIso,
                      correctCount: 1,
                      tags: q.tags || []
                    };
                    if (!newlyMasteredQ) newlyMasteredQ = { question: q.q, tags: q.tags || [] };
                  }
                }
              }
              upd({
                quizSubmitted: true,
                quizCorrect: correct,
                quizCompletedCount: (d.quizCompletedCount || 0) + 1,
                quizMastery: nextMastery
              });
              if (newlyMasteredQ && typeof setSlCeleb === 'function') {
                try { setSlCeleb({ question: newlyMasteredQ.question, tags: newlyMasteredQ.tags, total: Object.keys(nextMastery).length, at: Date.now() }); } catch (e) {}
                try { setTimeout(function () { setSlCeleb(null); }, 3500); } catch (e) {}
              }
              if (awardXP) awardXP(correct * 5, 'StatsLab — quiz: ' + correct + '/5', 'statsLab');
              if (addToast) addToast('Quiz scored: ' + correct + ' / ' + d.quizQuestions.length, correct >= 4 ? 'success' : 'info');
              slAnnounce('Quiz score: ' + correct + ' out of ' + d.quizQuestions.length);
            },
            'data-sl-focusable': 'true',
            style: {
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
              color: '#fff', border: '1px solid #7e22ce',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800
            }
          }, '📝 Submit quiz'),
          d.quizSubmitted && (function() {
            var pct = Math.round((d.quizCorrect / d.quizQuestions.length) * 100);
            var tier = d.quizCorrect === d.quizQuestions.length ? 'perfect'
                       : d.quizCorrect >= 4 ? 'strong'
                       : d.quizCorrect >= 2 ? 'learning'
                       : 'review';
            var tierColor = tier === 'perfect' ? '#fbbf24'
                            : tier === 'strong' ? '#22c55e'
                            : tier === 'learning' ? '#f59e0b'
                            : '#ef4444';
            var tierIcon = tier === 'perfect' ? '🏆' : tier === 'strong' ? '🎯' : tier === 'learning' ? '🪶' : '📚';
            var tierTitle = tier === 'perfect' ? 'Perfect score!'
                            : tier === 'strong' ? 'You can run a t-test now'
                            : tier === 'learning' ? 'Solid — review effect-size pages'
                            : 'Concepts to revisit';
            var tierMsg = tier === 'perfect' ? 'You can interpret your output for a peer right now. Try a harder test next.'
                          : tier === 'strong' ? 'Strong understanding. Read the rationales for the ones you missed and you will close the gap.'
                          : tier === 'learning' ? 'Solid grasp on some, gaps on others. Review the explanations and try a different test.'
                          : 'These concepts are fundamental for the AP exam. Re-read each rationale carefully — the misconceptions panel above may also help.';
            var rad = 30, circ = 2 * Math.PI * rad;
            var dashOff = circ - (pct / 100) * circ;
            var ans = d.quizAnswers || [];
            return h('div', { style: { marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '2px solid ' + tierColor + '88', background: 'linear-gradient(135deg, rgba(15,23,42,0.85), rgba(30,41,59,0.85))' } },
              h('div', { style: { padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
                h('div', { style: { position: 'relative', width: 84, height: 84, flexShrink: 0 } },
                  h('svg', { viewBox: '0 0 100 100', width: 84, height: 84, 'aria-label': 'Score: ' + d.quizCorrect + ' out of ' + d.quizQuestions.length },
                    h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                    h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round', strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                  ),
                  h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                    h('div', { style: { fontSize: 20, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                    h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' } }, d.quizCorrect + ' / ' + d.quizQuestions.length)
                  )
                ),
                h('div', { style: { flex: 1, minWidth: 200 } },
                  h('div', { style: { fontSize: 26, marginBottom: 2 }, 'aria-hidden': 'true' }, tierIcon),
                  h('div', { style: { fontSize: 16, fontWeight: 900, color: tierColor, lineHeight: 1.1 } }, tierTitle),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.55, marginTop: 4 } }, tierMsg)
                )
              ),
              h('div', { style: { padding: '0 14px 8px' } },
                h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 } }, 'Your answers'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                  d.quizQuestions.map(function(q, qi) {
                    var picked = ans[qi];
                    var isCorrect = picked === q.correct;
                    return h('div', { key: qi,
                      title: 'Q' + (qi + 1) + (isCorrect ? ' correct ✓' : ' incorrect (you picked ' + (picked != null ? picked + 1 : '?') + ', answer was ' + (q.correct + 1) + ')'),
                      style: {
                        width: 14, height: 14, borderRadius: 3,
                        background: isCorrect ? '#22c55e' : '#ef4444',
                        border: '1.5px solid ' + (isCorrect ? '#15803d' : '#b91c1c'),
                        boxShadow: '0 1px 1px rgba(0,0,0,0.3)'
                      },
                      'aria-label': 'Q' + (qi + 1) + (isCorrect ? ' correct' : ' incorrect')
                    });
                  })
                )
              ),
              h('div', { style: { padding: '8px 14px 12px', borderTop: '1px solid rgba(148,163,184,0.25)', display: 'flex', flexWrap: 'wrap', gap: 6 } },
                h('button', {
                  onClick: function() { upd({ quizQuestions: null, quizAnswers: [], quizSubmitted: false }); },
                  'data-sl-focusable': 'true',
                  style: { padding: '6px 14px', background: 'rgba(168,85,247,0.18)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
                }, '🔁 New quiz')
              )
            );
          })()
        )
      ),
      // AI Interpretation Grader
      h('div', {
        style: {
          background: 'rgba(168,85,247,0.10)',
          border: '1px solid rgba(168,85,247,0.45)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#d8b4fe', marginBottom: 6 } }, '🤖 AI interpretation grader'),
        h('p', { style: { margin: '0 0 8px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
          'Write a 2-3 sentence interpretation of this result for a peer who isn\'t a stats expert. Then get AI feedback on accuracy + clarity.'
        ),
        h('label', { htmlFor: 'sl-interpretation', style: { fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 2 } }, 'Your interpretation:'),
        h('textarea', {
          id: 'sl-interpretation',
          value: d.interpretationDraft || '',
          onChange: function(e) { upd('interpretationDraft', e.target.value); },
          'data-sl-focusable': 'true',
          rows: 4,
          placeholder: 'e.g., Visualization-based study led to higher recall than rote rehearsal. The difference was statistically significant and the effect was large, suggesting visualization is meaningfully better, not just a small statistical bump.',
          style: { width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
        }),
        h('button', {
          onClick: gradeInterpretation,
          'data-sl-focusable': 'true',
          disabled: d.aiGradeLoading,
          'aria-busy': !!d.aiGradeLoading,
          style: {
            padding: '8px 16px',
            background: d.aiGradeLoading ? '#374151' : 'linear-gradient(135deg, #a855f7, #7e22ce)',
            color: '#fff', border: '1px solid ' + (d.aiGradeLoading ? '#4b5563' : '#7e22ce'),
            borderRadius: 8, cursor: d.aiGradeLoading ? 'wait' : 'pointer',
            fontSize: 12, fontWeight: 700
          }
        }, d.aiGradeLoading ? '🤖 Grading…' : '🤖 Grade my interpretation'),
        d.aiGradeResponse && h('div', { style: { marginTop: 10, padding: 10, background: '#0f172a', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 8 } },
          d.aiGradeResponse.error
            ? h('div', { style: { fontSize: 12, color: '#fca5a5' } }, '⚠ ' + d.aiGradeResponse.error)
            : h('div', null,
                _isNum(d.aiGradeResponse.score) && h('div', { style: { fontSize: 16, fontWeight: 900, color: '#fef3c7', marginBottom: 6 } },
                  'Score: ' + d.aiGradeResponse.score + ' / 10'
                ),
                Array.isArray(d.aiGradeResponse.strengths) && d.aiGradeResponse.strengths.length > 0 && h('div', { style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', marginBottom: 2 } }, '✓ Strengths'),
                  h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
                    d.aiGradeResponse.strengths.map(function(s, i) { return h('li', { key: i }, s); })
                  )
                ),
                Array.isArray(d.aiGradeResponse.issues) && d.aiGradeResponse.issues.length > 0 && h('div', { style: { marginBottom: 8 } },
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', marginBottom: 2 } }, '✗ Issues to address'),
                  h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
                    d.aiGradeResponse.issues.map(function(s, i) { return h('li', { key: i }, s); })
                  )
                ),
                d.aiGradeResponse.improved_version && h('div', null,
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: '#a5b4fc', marginBottom: 2 } }, '📝 Model interpretation'),
                  h('div', { style: { fontSize: 11, color: '#fef3c7', fontStyle: 'italic', padding: 8, background: 'rgba(99,102,241,0.10)', borderRadius: 6, lineHeight: 1.6 } },
                    d.aiGradeResponse.improved_version
                  )
                )
              )
        )
      )
    );
  }

  // Build a "show-the-math" formula display per test type, with the user's
  // actual numbers plugged in. Pulls the student from "click → mystery answer"
  // toward "I see why the answer is what it is."
  function _mathFormula(r, d) {
    var t = r.test || '';
    if (/^One-sample t-test/.test(t)) {
      return [
        'Formula:  t = (M - μ₀) / (SD / √n)',
        '',
        'Plug in:  t = (' + r.mean.toFixed(3) + ' - ' + r.mu0 + ') / (' + r.sd.toFixed(3) + ' / √' + (r.df + 1) + ')',
        '          t = ' + (r.mean - r.mu0).toFixed(3) + ' / ' + (r.sd / Math.sqrt(r.df + 1)).toFixed(4),
        '          t = ' + r.t.toFixed(3),
        '',
        'df = n - 1 = ' + r.df,
        'p (two-tailed) = ' + (r.p < 0.001 ? '< .001' : r.p.toFixed(4))
      ].join('\n');
    }
    if (/Paired/.test(t)) {
      return [
        'Formula:  t = M_diff / (SD_diff / √n)',
        '',
        'Plug in:  t = ' + r.meanDiff.toFixed(3) + ' / (' + r.sd.toFixed(3) + ' / √' + (r.df + 1) + ')',
        '          t = ' + r.meanDiff.toFixed(3) + ' / ' + (r.sd / Math.sqrt(r.df + 1)).toFixed(4),
        '          t = ' + r.t.toFixed(3),
        '',
        'df = n_pairs - 1 = ' + r.df,
        "Cohen's d = M_diff / SD_diff = " + r.cohensD.toFixed(3)
      ].join('\n');
    }
    if (/Independent/.test(t)) {
      var se = Math.sqrt((r.sd1 * r.sd1) / r.n1 + (r.sd2 * r.sd2) / r.n2);
      return [
        "Formula (Welch's t):  t = (M₁ - M₂) / √(SD₁²/n₁ + SD₂²/n₂)",
        '',
        'Plug in:  t = (' + r.mean1.toFixed(3) + ' - ' + r.mean2.toFixed(3) + ') / √(' + r.sd1.toFixed(3) + '²/' + r.n1 + ' + ' + r.sd2.toFixed(3) + '²/' + r.n2 + ')',
        '          t = ' + (r.mean1 - r.mean2).toFixed(3) + ' / √(' + ((r.sd1 * r.sd1) / r.n1).toFixed(4) + ' + ' + ((r.sd2 * r.sd2) / r.n2).toFixed(4) + ')',
        '          t = ' + (r.mean1 - r.mean2).toFixed(3) + ' / ' + se.toFixed(4),
        '          t = ' + r.t.toFixed(3),
        '',
        'df (Welch-Satterthwaite) = ' + r.df.toFixed(2),
        "Cohen's d (pooled SD) = " + r.cohensD.toFixed(3)
      ].join('\n');
    }
    if (/One-way ANOVA/.test(t)) {
      return [
        'Formula:  F = MS_between / MS_within',
        '',
        '   SS_between = Σ nᵢ(M̄ᵢ - M̄_grand)²',
        '   SS_within  = Σᵢ Σⱼ (xᵢⱼ - M̄ᵢ)²',
        '',
        'Plug in:  F = ' + (r.ssBetween != null ? r.ssBetween.toFixed(2) : '?') + ' / ' + (r.dfBetween) +
                  ' ÷ ' + (r.ssWithin != null ? r.ssWithin.toFixed(2) : '?') + ' / ' + (r.dfWithin),
        '          F = ' + (r.msBetween != null ? r.msBetween.toFixed(3) : '?') + ' / ' + (r.msWithin != null ? r.msWithin.toFixed(3) : '?'),
        '          F = ' + r.F.toFixed(3),
        '',
        'df₁ = k - 1 = ' + r.dfBetween + ',  df₂ = N - k = ' + r.dfWithin,
        'η² = SS_between / SS_total = ' + (r.etaSquared != null ? r.etaSquared.toFixed(3) : '?')
      ].join('\n');
    }
    if (/Pearson/.test(t)) {
      return [
        'Formula:  r = Σ(xᵢ - x̄)(yᵢ - ȳ) / √[ Σ(xᵢ - x̄)² · Σ(yᵢ - ȳ)² ]',
        '',
        'Result:   r = ' + r.r.toFixed(4),
        '          r² = ' + (r.r * r.r).toFixed(4) + '   (' + (r.r * r.r * 100).toFixed(1) + '% of variance shared)',
        '',
        'Test stat:  t = r · √[(n-2) / (1 - r²)] = ' + (r.t != null ? r.t.toFixed(3) : '?'),
        'df = n - 2 = ' + r.df,
        '95% CI uses Fisher z-transform: [' + r.ci95[0].toFixed(3) + ', ' + r.ci95[1].toFixed(3) + ']'
      ].join('\n');
    }
    if (/Spearman/.test(t)) {
      return [
        'Spearman ρ: rank both variables, then compute Pearson r on the ranks.',
        '',
        'ρ = ' + r.r.toFixed(4),
        'Test stat:  t = ρ · √[(n-2)/(1-ρ²)] = ' + (r.t != null ? r.t.toFixed(3) : '?'),
        'df = n - 2 = ' + r.df
      ].join('\n');
    }
    if (/Linear regression/.test(t)) {
      return [
        'Formula:  ŷ = a + b·x',
        '',
        '   b = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²   (slope)',
        '   a = ȳ - b·x̄                          (intercept)',
        '',
        'Result:   ŷ = ' + r.intercept.toFixed(3) + ' + ' + r.slope.toFixed(3) + '·x',
        '          R² = ' + r.rSquared.toFixed(3) + '   (' + (r.rSquared * 100).toFixed(1) + '% of variance explained)',
        '',
        'Test for slope ≠ 0:  t = b / SE(b) = ' + r.t.toFixed(3) + ',  df = ' + r.df,
        'Overall F:  F(1, ' + r.df + ') = ' + r.F.toFixed(3)
      ].join('\n');
    }
    if (/goodness-of-fit/.test(t)) {
      var lines = ['Formula:  χ² = Σ (Oᵢ - Eᵢ)² / Eᵢ', ''];
      lines.push('Categories:');
      for (var k = 0; k < r.observed.length; k++) {
        var oi = r.observed[k], ei = r.expected[k];
        lines.push('  ' + (r.labels && r.labels[k] ? r.labels[k] : 'cat ' + (k + 1)) + ': O=' + oi + ', E=' + ei.toFixed(2) +
          ',  (O-E)²/E = ' + (Math.pow(oi - ei, 2) / ei).toFixed(3));
      }
      lines.push('');
      lines.push('χ² total = ' + r.chiSquared.toFixed(3));
      lines.push('df = (categories - 1) = ' + r.df);
      return lines.join('\n');
    }
    if (/independence/.test(t)) {
      return [
        'Formula:  χ² = Σ (Oᵢⱼ - Eᵢⱼ)² / Eᵢⱼ',
        '   where Eᵢⱼ = (row_total · col_total) / grand_total',
        '',
        'Result:  χ² = ' + r.chiSquared.toFixed(3),
        'df = (rows - 1) · (cols - 1) = ' + r.df,
        '',
        (r.cramersV != null ? "Cramér's V = √(χ² / [N · min(rows-1, cols-1)]) = " + r.cramersV.toFixed(3) :
         (r.phi != null ? 'φ = √(χ² / N) = ' + r.phi.toFixed(3) : ''))
      ].join('\n');
    }
    if (/Mann-Whitney/.test(t)) {
      return [
        'Mann-Whitney U: rank all values from both groups together,',
        'then count how often Group 1 outranks Group 2.',
        '',
        'U = ' + r.U + ',  z = ' + (r.z != null ? r.z.toFixed(3) : '?'),
        'p (two-tailed, normal approximation) = ' + (r.p < 0.001 ? '< .001' : r.p.toFixed(4))
      ].join('\n');
    }
    if (/Wilcoxon/.test(t)) {
      return [
        'Wilcoxon signed-rank: rank |differences|, sum ranks of positive differences (W+).',
        'Symmetry around zero is the test.',
        '',
        'W = ' + r.W + ',  z = ' + (r.z != null ? r.z.toFixed(3) : '?'),
        'p (two-tailed) = ' + (r.p < 0.001 ? '< .001' : r.p.toFixed(4))
      ].join('\n');
    }
    if (/Kruskal-Wallis/.test(t)) {
      return [
        'Kruskal-Wallis H: rank all values across groups,',
        'compare mean ranks of each group to overall mean rank.',
        '',
        'H = ' + r.H.toFixed(3) + ',  df = ' + r.df,
        'p (chi-square approximation) = ' + (r.p < 0.001 ? '< .001' : r.p.toFixed(4))
      ].join('\n');
    }
    return 'Formula display not yet wired for this test. Numeric output above shows all key statistics.';
  }

  // ──────────────────────────────────────────────────────────────────
  // TYPE I / TYPE II ERROR VISUALIZER
  // Two overlapping normal distributions with α (red, right tail of H₀)
  // and β (blue, left of crit under H₁) shaded. The most classic stats
  // teaching graphic, rarely shown well in textbooks.
  // ──────────────────────────────────────────────────────────────────
  function _normalPdf(x, mu, sd) {
    var z = (x - mu) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }
  function _normalCdf(x, mu, sd) {
    // Abramowitz & Stegun approximation, accurate to ~7e-8
    var z = (x - mu) / sd;
    var t = 1 / (1 + 0.2316419 * Math.abs(z));
    var pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    var p = 1 - pdf * (0.319381530 * t - 0.356563782 * t * t + 1.781477937 * t * t * t - 1.821255978 * t * t * t * t + 1.330274429 * t * t * t * t * t);
    return z < 0 ? 1 - p : p;
  }
  function _normalInv(p) {
    if (window.jStat) return window.jStat.normal.inv(p, 0, 1);
    // Beasley-Springer fallback
    if (p < 0.5) return -_normalInv(1 - p);
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var q = p - 0.5;
    var r = q * q;
    return q * (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5])
              / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function _renderTypeErrorViz(d_eff, alpha, n, h) {
    // Two-sample t-test, equal n: under H₀ → test stat ~ N(0, 1),
    // under H₁ → N(d × √(n/2), 1). For display we show standardized stats.
    var ncp = d_eff * Math.sqrt(n / 2);  // non-centrality (where H₁ peaks)
    var W = 540, H = 220;
    var pad = { l: 36, r: 12, t: 28, b: 36 };
    var xMin = Math.min(-3.5, ncp - 3.5);
    var xMax = Math.max(3.5, ncp + 3.5);
    var sx = _scaleLinear(xMin, xMax, pad.l, W - pad.r);
    // Compute peak of either distribution
    var peakPdf = _normalPdf(0, 0, 1);  // ≈ 0.399
    var sy = _scaleLinear(0, peakPdf * 1.2, H - pad.b, pad.t);
    var crit = _normalInv(1 - alpha);  // critical z for one-sided α
    var beta = _normalCdf(crit, ncp, 1);  // P(Z < crit | H₁)
    var power = 1 - beta;
    // Build polygon points for each shaded region
    var stepN = 80;
    var pathFill = function(fromX, toX, mu, sd) {
      var pts = [];
      var step = (toX - fromX) / stepN;
      pts.push([sx(fromX), sy(0)]);
      for (var k = 0; k <= stepN; k++) {
        var xv = fromX + step * k;
        pts.push([sx(xv), sy(_normalPdf(xv, mu, sd))]);
      }
      pts.push([sx(toX), sy(0)]);
      return 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ') + ' Z';
    };
    // Curve outlines
    var curveLine = function(mu, sd) {
      var pts = [];
      for (var k = 0; k <= stepN * 2; k++) {
        var xv = xMin + (xMax - xMin) * (k / (stepN * 2));
        pts.push([sx(xv), sy(_normalPdf(xv, mu, sd))]);
      }
      return 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
    };
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Type I and Type II error visualization. Cohen\'s d = ' + d_eff + ', n = ' + n + ', alpha = ' + alpha + '. Power = ' + power.toFixed(3),
      style: { background: '#0f172a', borderRadius: 6 }
    },
      // Axis
      h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      // β (Type II) region: under H₁ to the LEFT of crit (failed to reject)
      h('path', { d: pathFill(xMin, Math.min(crit, ncp + 4), ncp, 1), fill: '#3b82f6', opacity: 0.30 }),
      // Power region: under H₁ to the RIGHT of crit (correctly rejected)
      h('path', { d: pathFill(crit, ncp + 4, ncp, 1), fill: '#16a34a', opacity: 0.40 }),
      // α (Type I) region: under H₀ to the RIGHT of crit (false alarm)
      h('path', { d: pathFill(crit, 4, 0, 1), fill: '#ef4444', opacity: 0.55 }),
      // Curve outlines (drawn AFTER fills so they sit on top)
      h('path', { d: curveLine(0, 1), fill: 'none', stroke: '#94a3b8', strokeWidth: 1.5 }),
      h('path', { d: curveLine(ncp, 1), fill: 'none', stroke: '#fbbf24', strokeWidth: 1.5 }),
      // Critical value vertical line
      h('line', { x1: sx(crit), y1: pad.t - 8, x2: sx(crit), y2: H - pad.b, stroke: '#fef3c7', strokeWidth: 1.5, strokeDasharray: '4 3' }),
      h('text', { x: sx(crit), y: pad.t - 12, fill: '#fef3c7', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, 'crit z = ' + crit.toFixed(2)),
      // Distribution labels
      h('text', { x: sx(0), y: sy(_normalPdf(0, 0, 1)) - 4, fill: '#94a3b8', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'H₀'),
      h('text', { x: sx(ncp), y: sy(_normalPdf(ncp, ncp, 1)) - 4, fill: '#fbbf24', fontSize: 11, fontWeight: 800, textAnchor: 'middle' }, 'H₁'),
      // X axis ticks
      _niceTicks(xMin, xMax, 7).map(function(t, ti) {
        return h('g', { key: 't' + ti },
          h('line', { x1: sx(t), y1: H - pad.b, x2: sx(t), y2: H - pad.b + 4, stroke: '#475569' }),
          h('text', { x: sx(t), y: H - pad.b + 14, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, t.toFixed(1))
        );
      }),
      // Legend bar at bottom
      h('rect', { x: pad.l, y: H - 18, width: 10, height: 10, fill: '#ef4444', opacity: 0.55 }),
      h('text', { x: pad.l + 14, y: H - 9, fill: '#fca5a5', fontSize: 10, fontWeight: 700 }, 'α = ' + alpha.toFixed(3) + ' (Type I)'),
      h('rect', { x: pad.l + 130, y: H - 18, width: 10, height: 10, fill: '#3b82f6', opacity: 0.30 }),
      h('text', { x: pad.l + 144, y: H - 9, fill: '#93c5fd', fontSize: 10, fontWeight: 700 }, 'β = ' + beta.toFixed(3) + ' (Type II)'),
      h('rect', { x: pad.l + 270, y: H - 18, width: 10, height: 10, fill: '#16a34a', opacity: 0.40 }),
      h('text', { x: pad.l + 284, y: H - 9, fill: '#86efac', fontSize: 10, fontWeight: 700 }, 'Power = ' + power.toFixed(3))
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // POWER panel — sample-size / power / effect-size calculator
  // ──────────────────────────────────────────────────────────────────
  function _renderPower(d, upd, h, addToast) {
    var p = d.powerInputs || { test: 'ttest_independent', effectSize: 0.5, alpha: 0.05, power: 0.8, n: null, solveFor: 'n' };
    function setP(key, val) {
      var next = Object.assign({}, p);
      next[key] = val;
      upd('powerInputs', next);
    }
    var es_label = ({
      ttest_independent: "Cohen's d (small=.2, medium=.5, large=.8)",
      ttest_paired: "Cohen's d (within-subjects)",
      pearson: 'r (small=.1, medium=.3, large=.5)',
      anova_oneWay: "Cohen's f (small=.10, medium=.25, large=.40)",
      chiSquare: "Cohen's w (small=.10, medium=.30, large=.50)"
    })[p.test] || "Effect size";
    function runPower() {
      _ensureJStat().then(function(ok) {
        if (!ok) { if (addToast) addToast('Stats library failed to load.', 'error'); return; }
        var result = null;
        try {
          if (p.test === 'ttest_independent') {
            result = powerTTest_independent({
              d: parseFloat(p.effectSize),
              alpha: parseFloat(p.alpha),
              power: parseFloat(p.power),
              n: p.solveFor === 'n' ? null : parseInt(p.n, 10),
              solve: p.solveFor
            });
          } else if (p.test === 'pearson') {
            result = powerCorrelation({
              r: parseFloat(p.effectSize), alpha: parseFloat(p.alpha), power: parseFloat(p.power), solve: 'n'
            });
          } else if (p.test === 'chiSquare') {
            var df = parseInt(p.df || 1, 10);
            result = powerChiSquare({
              w: parseFloat(p.effectSize), df: df,
              alpha: parseFloat(p.alpha), power: parseFloat(p.power), solve: 'n'
            });
          } else if (p.test === 'anova_oneWay') {
            result = powerANOVA({
              f: parseFloat(p.effectSize), k: parseInt(p.k || 3, 10),
              alpha: parseFloat(p.alpha), power: parseFloat(p.power), solve: 'n'
            });
          }
        } catch (err) {
          result = { error: 'Power computation error: ' + err.message };
        }
        if (!result) result = { error: 'No result.' };
        upd({ powerInputs: Object.assign({}, p, { _lastResult: result }), powerRun: true });
      });
    }
    var lastR = p._lastResult;
    return h('div', null,
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.10)',
          border: '1px solid rgba(99,102,241,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '🔋 Power / sample-size calculator'),
        h('p', { style: { margin: '0 0 12px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
          'Plan a study before you run it. Plug in your expected effect size + desired power, and the calculator returns the sample size you need.'
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 12 } },
          h('div', null,
            h('label', { htmlFor: 'sl-power-test', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'Test type:'),
            h('select', {
              id: 'sl-power-test', value: p.test, onChange: function(e) { setP('test', e.target.value); },
              'data-sl-focusable': 'true',
              style: { width: '100%', padding: '6px 8px', background: '#0f172a', color: '#e0e7ff', border: '1px solid #475569', borderRadius: 6, fontSize: 12 }
            },
              h('option', { value: 'ttest_independent' }, 'Independent t-test'),
              h('option', { value: 'pearson' }, 'Pearson correlation'),
              h('option', { value: 'anova_oneWay' }, 'One-way ANOVA'),
              h('option', { value: 'chiSquare' }, 'Chi-square')
            )
          ),
          h('div', null,
            h('label', { htmlFor: 'sl-power-es', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, es_label + ':'),
            h('input', {
              id: 'sl-power-es', type: 'number', step: 0.05,
              value: p.effectSize,
              onChange: function(e) { setP('effectSize', e.target.value); },
              'data-sl-focusable': 'true',
              style: { width: '100%', padding: '6px 8px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700 }
            })
          ),
          h('div', null,
            h('label', { htmlFor: 'sl-power-alpha', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'α (Type I rate):'),
            h('input', {
              id: 'sl-power-alpha', type: 'number', step: 0.01, min: 0.001, max: 0.20,
              value: p.alpha,
              onChange: function(e) { setP('alpha', e.target.value); },
              'data-sl-focusable': 'true',
              style: { width: '100%', padding: '6px 8px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700 }
            })
          ),
          h('div', null,
            h('label', { htmlFor: 'sl-power-power', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'Desired power:'),
            h('input', {
              id: 'sl-power-power', type: 'number', step: 0.05, min: 0.5, max: 0.99,
              value: p.power,
              onChange: function(e) { setP('power', e.target.value); },
              'data-sl-focusable': 'true',
              style: { width: '100%', padding: '6px 8px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700 }
            })
          ),
          p.test === 'anova_oneWay' && h('div', null,
            h('label', { htmlFor: 'sl-power-k', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'Number of groups (k):'),
            h('input', {
              id: 'sl-power-k', type: 'number', step: 1, min: 2,
              value: p.k || 3,
              onChange: function(e) { setP('k', e.target.value); },
              'data-sl-focusable': 'true',
              style: { width: '100%', padding: '6px 8px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700 }
            })
          ),
          p.test === 'chiSquare' && h('div', null,
            h('label', { htmlFor: 'sl-power-df', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } }, 'df:'),
            h('input', {
              id: 'sl-power-df', type: 'number', step: 1, min: 1,
              value: p.df || 1,
              onChange: function(e) { setP('df', e.target.value); },
              'data-sl-focusable': 'true',
              style: { width: '100%', padding: '6px 8px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 12, fontWeight: 700 }
            })
          )
        ),
        h('button', {
          onClick: runPower,
          'data-sl-focusable': 'true',
          style: {
            padding: '10px 20px',
            background: 'linear-gradient(135deg,#16a34a,#15803d)',
            color: '#fff', border: '1px solid #15803d',
            borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800, minHeight: 40
          }
        }, '⚡ Calculate required sample size')
      ),
      lastR && h('div', {
        style: {
          background: lastR.error ? 'rgba(220,38,38,0.10)' : 'rgba(22,163,74,0.10)',
          border: '1px solid ' + (lastR.error ? 'rgba(220,38,38,0.45)' : 'rgba(22,163,74,0.45)'),
          borderRadius: 10, padding: 14
        },
        role: 'status', 'aria-live': 'polite'
      },
        lastR.error
          ? h('div', { style: { fontSize: 13, color: '#fca5a5' } }, '⚠ ' + lastR.error)
          : h('div', null,
              h('div', { style: { fontSize: 12, fontWeight: 800, color: '#86efac', marginBottom: 6 } }, '✓ Power analysis complete'),
              p.test === 'ttest_independent' && lastR.n != null && h('div', { style: { fontSize: 14, color: '#fef3c7', lineHeight: 1.6 } },
                'You need ', h('b', { style: { color: '#fbbf24', fontSize: 16 } }, lastR.n + ' subjects per group'),
                ' (', h('b', null, lastR.total_n + ' total'), ') to detect d = ', lastR.d, ' at α = ', lastR.alpha, ', power ≥ ', (lastR.power || 0.8).toFixed(2), '.'
              ),
              p.test === 'pearson' && lastR.n != null && h('div', { style: { fontSize: 14, color: '#fef3c7', lineHeight: 1.6 } },
                'You need ', h('b', { style: { color: '#fbbf24', fontSize: 16 } }, lastR.n + ' participants'),
                ' to detect r = ', lastR.r, ' at α = ', lastR.alpha, ', power = ', lastR.power, '.'
              ),
              p.test === 'anova_oneWay' && lastR.n != null && h('div', { style: { fontSize: 14, color: '#fef3c7', lineHeight: 1.6 } },
                'You need ', h('b', { style: { color: '#fbbf24', fontSize: 16 } }, lastR.n + ' subjects per group'),
                ' (', h('b', null, lastR.total_n + ' total across ' + lastR.k + ' groups'), ') to detect Cohen\'s f = ', lastR.f, ' at α = ', lastR.alpha, ', power ≥ ', (lastR.power || 0.8).toFixed(2), '.'
              ),
              p.test === 'chiSquare' && lastR.n != null && h('div', { style: { fontSize: 14, color: '#fef3c7', lineHeight: 1.6 } },
                'You need ', h('b', { style: { color: '#fbbf24', fontSize: 16 } }, lastR.n + ' total observations'),
                ' to detect w = ', lastR.w, ' (df=', lastR.df, ') at α = ', lastR.alpha, ', power ≥ ', (lastR.power || 0.8).toFixed(2), '.'
              )
            )
      ),
      // Type I / Type II error visualizer — interactive sliders + overlapping curves
      h('div', {
        style: {
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.40)',
          borderRadius: 10, padding: 14, marginTop: 12
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 6 } }, '🎯 Visualize Type I & Type II error'),
        h('p', { style: { margin: '0 0 10px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
          'Two overlapping bell curves: the gray one is the test stat distribution under ',
          h('b', null, 'H₀'), ' (no effect), the yellow one under ',
          h('b', null, 'H₁'), ' (effect = your Cohen\'s d). The dashed line is the critical value (you reject H₀ to its right). ',
          h('b', { style: { color: '#fca5a5' } }, 'Red'), ' = α (Type I error: false alarm). ',
          h('b', { style: { color: '#93c5fd' } }, 'Blue'), ' = β (Type II error: missed real effect). ',
          h('b', { style: { color: '#86efac' } }, 'Green'), ' = power (correctly detect a real effect). Move the sliders to feel how they trade off.'
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 10 } },
          h('div', null,
            h('label', { htmlFor: 'sl-viz-d', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } },
              "Effect size (Cohen's d): ", h('b', { style: { color: '#fbbf24' } }, parseFloat(p.vizD || 0.5).toFixed(2))
            ),
            h('input', {
              id: 'sl-viz-d', type: 'range', min: 0, max: 2.0, step: 0.05,
              value: p.vizD || 0.5,
              onChange: function(e) { setP('vizD', parseFloat(e.target.value)); },
              'data-sl-focusable': 'true', 'aria-label': "Cohen's d slider",
              style: { width: '100%' }
            })
          ),
          h('div', null,
            h('label', { htmlFor: 'sl-viz-n', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } },
              'Sample size per group: ', h('b', { style: { color: '#fbbf24' } }, parseInt(p.vizN || 30, 10))
            ),
            h('input', {
              id: 'sl-viz-n', type: 'range', min: 4, max: 200, step: 2,
              value: p.vizN || 30,
              onChange: function(e) { setP('vizN', parseInt(e.target.value, 10)); },
              'data-sl-focusable': 'true', 'aria-label': 'Sample size slider',
              style: { width: '100%' }
            })
          ),
          h('div', null,
            h('label', { htmlFor: 'sl-viz-alpha', style: { fontSize: 11, color: '#cbd5e1', display: 'block', marginBottom: 4 } },
              'α (Type I rate): ', h('b', { style: { color: '#fbbf24' } }, parseFloat(p.vizAlpha || 0.05).toFixed(3))
            ),
            h('input', {
              id: 'sl-viz-alpha', type: 'range', min: 0.001, max: 0.20, step: 0.001,
              value: p.vizAlpha || 0.05,
              onChange: function(e) { setP('vizAlpha', parseFloat(e.target.value)); },
              'data-sl-focusable': 'true', 'aria-label': 'Alpha slider',
              style: { width: '100%' }
            })
          )
        ),
        _renderTypeErrorViz(p.vizD || 0.5, p.vizAlpha || 0.05, p.vizN || 30, h),
        // Live readout below the chart
        (function() {
          var vd = p.vizD || 0.5, va = p.vizAlpha || 0.05, vn = p.vizN || 30;
          var ncp = vd * Math.sqrt(vn / 2);
          var crit = _normalInv(1 - va);
          var beta = _normalCdf(crit, ncp, 1);
          var power = 1 - beta;
          return h('div', {
            style: { marginTop: 8, padding: 10, background: '#0f172a', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 8, fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 }
          },
            'With d = ', h('b', { style: { color: '#fbbf24' } }, vd.toFixed(2)),
            ', n = ', h('b', { style: { color: '#fbbf24' } }, vn),
            ' per group, α = ', h('b', { style: { color: '#fbbf24' } }, va.toFixed(3)), ':',
            h('div', { style: { marginTop: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 } },
              h('span', { style: { color: '#fca5a5' } }, 'Type I (α): ', h('b', null, va.toFixed(3))),
              h('span', { style: { color: '#93c5fd' } }, 'Type II (β): ', h('b', null, beta.toFixed(3))),
              h('span', { style: { color: '#86efac' } }, 'Power (1−β): ', h('b', null, power.toFixed(3))),
              h('span', { style: { color: '#fef3c7' } }, 'NCP: ', h('b', null, ncp.toFixed(2)))
            ),
            power < 0.50 && h('div', { style: { marginTop: 6, color: '#fbbf24', fontStyle: 'italic' } },
              '⚠ Power below 0.50 — fewer than half of studies of this size would detect this effect. Consider larger n.'
            ),
            power >= 0.80 && h('div', { style: { marginTop: 6, color: '#86efac', fontStyle: 'italic' } },
              '✓ Power ≥ 0.80 — meets the conventional threshold for "adequately powered."'
            )
          );
        })()
      )
    );
  }


  // ──────────────────────────────────────────────────────────────────
  // INLINE SVG VISUALIZATIONS — histogram, boxplot, scatter, bar
  // No external lib. Rendered with React.createElement('svg', ...)
  // ──────────────────────────────────────────────────────────────────
  function _scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
    var span = domainMax - domainMin || 1;
    return function(v) { return rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin); };
  }
  // niceTicks: produce 4-6 round-number tick values across [min,max]
  function _niceTicks(min, max, count) {
    count = count || 5;
    var range = max - min;
    if (range === 0) return [min];
    var rawStep = range / (count - 1);
    var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var norm = rawStep / mag;
    var step;
    if (norm < 1.5) step = 1 * mag;
    else if (norm < 3) step = 2 * mag;
    else if (norm < 7) step = 5 * mag;
    else step = 10 * mag;
    var tickMin = Math.ceil(min / step) * step;
    var ticks = [];
    for (var t = tickMin; t <= max + step * 0.001; t += step) {
      ticks.push(Math.round(t / step) * step);
    }
    return ticks;
  }

  // Histogram of a single column.
  function _renderHistogram(values, label, h, opts) {
    opts = opts || {};
    var W = opts.width || 320, H = opts.height || 180;
    var pad = { l: 36, r: 12, t: 18, b: 32 };
    var x = _clean(values);
    if (x.length < 2) return h('div', { style: { fontSize: 11, color: '#94a3b8', padding: 12 } }, '(need ≥2 values to plot histogram)');
    var min = Math.min.apply(null, x), max = Math.max.apply(null, x);
    var nBins = Math.max(5, Math.min(20, Math.ceil(Math.sqrt(x.length))));
    var binW = (max - min) / nBins || 1;
    var bins = new Array(nBins).fill(0);
    for (var i = 0; i < x.length; i++) {
      var b = Math.min(nBins - 1, Math.floor((x[i] - min) / binW));
      bins[b]++;
    }
    var maxCount = Math.max.apply(null, bins);
    var sx = _scaleLinear(min, max, pad.l, W - pad.r);
    var sy = _scaleLinear(0, maxCount, H - pad.b, pad.t);
    var ticks = _niceTicks(min, max, 5);
    var m = mean(x), md = median(x);
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Histogram of ' + label + ', n=' + x.length + ', mean=' + m.toFixed(2) + ', median=' + md.toFixed(2),
      style: { background: '#0f172a', borderRadius: 6 }
    },
      // Grid + axes
      h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569', strokeWidth: 1 }),
      h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569', strokeWidth: 1 }),
      // Bars
      bins.map(function(c, bi) {
        var x0 = sx(min + bi * binW), x1 = sx(min + (bi + 1) * binW);
        var y0 = sy(c);
        return h('rect', {
          key: bi,
          x: x0 + 1, y: y0, width: Math.max(1, x1 - x0 - 2), height: H - pad.b - y0,
          fill: '#6366f1', opacity: 0.85
        });
      }),
      // Mean line
      h('line', { x1: sx(m), y1: pad.t, x2: sx(m), y2: H - pad.b, stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '4 3' }),
      h('text', { x: sx(m), y: pad.t - 4, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, 'M=' + m.toFixed(1)),
      // X axis ticks
      ticks.map(function(t, ti) {
        return h('g', { key: 'xt' + ti },
          h('line', { x1: sx(t), y1: H - pad.b, x2: sx(t), y2: H - pad.b + 4, stroke: '#475569' }),
          h('text', { x: sx(t), y: H - pad.b + 14, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, '' + t)
        );
      }),
      // Y axis label
      h('text', { x: 4, y: H / 2, fill: '#94a3b8', fontSize: 9, transform: 'rotate(-90 4 ' + (H / 2) + ')' }, 'Count'),
      // X axis label
      h('text', { x: W / 2, y: H - 6, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, label)
    );
  }

  // Q-Q plot — sample quantiles vs theoretical normal quantiles.
  // Points clustered along the diagonal = approximately normal.
  // Curving away = skewed. S-shape = heavy/light tails.
  function _renderQQPlot(values, label, h, opts) {
    opts = opts || {};
    var W = opts.width || 280, H = opts.height || 220;
    var pad = { l: 44, r: 12, t: 18, b: 36 };
    var x = _clean(values);
    if (x.length < 4) return h('div', { style: { fontSize: 11, color: '#94a3b8', padding: 12 } }, '(need ≥4 values for Q-Q plot)');
    if (!window.jStat) return h('div', { style: { fontSize: 11, color: '#94a3b8', padding: 12 } }, '(loading distribution lib…)');
    var sorted = x.slice().sort(function(a, b) { return a - b; });
    var n = sorted.length;
    var m = mean(x), sd = stdDev(x);
    // Build (theoretical_z, sample_value) points using rankit (i - 0.375) / (n + 0.25)
    var pts = [];
    for (var i = 0; i < n; i++) {
      var pp = (i + 1 - 0.375) / (n + 0.25);
      var z = window.jStat.normal.inv(pp, 0, 1);
      pts.push([z, sorted[i]]);
    }
    var zMin = pts[0][0], zMax = pts[n - 1][0];
    var vMin = sorted[0], vMax = sorted[n - 1];
    var sx = _scaleLinear(zMin - 0.3, zMax + 0.3, pad.l, W - pad.r);
    var sy = _scaleLinear(vMin - (vMax - vMin) * 0.05, vMax + (vMax - vMin) * 0.05, H - pad.b, pad.t);
    // Reference line: y = m + sd * z (the line the data should fall on if normal)
    var lineX1 = zMin - 0.3, lineX2 = zMax + 0.3;
    var lineY1 = m + sd * lineX1, lineY2 = m + sd * lineX2;
    var children = [
      h('line', { key: 'ax', x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      h('line', { key: 'ay', x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
      // Reference line (where points would fall if normally distributed)
      h('line', { key: 'ref',
        x1: sx(lineX1), y1: sy(lineY1), x2: sx(lineX2), y2: sy(lineY2),
        stroke: '#fbbf24', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.7
      })
    ];
    // Points
    pts.forEach(function(p, pi) {
      children.push(h('circle', { key: 'p' + pi, cx: sx(p[0]), cy: sy(p[1]), r: 3, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1, opacity: 0.85 }));
    });
    // Axis ticks
    var zTicks = _niceTicks(zMin, zMax, 5);
    zTicks.forEach(function(t, ti) {
      children.push(h('line', { key: 'tx' + ti, x1: sx(t), y1: H - pad.b, x2: sx(t), y2: H - pad.b + 4, stroke: '#475569' }));
      children.push(h('text', { key: 'tlx' + ti, x: sx(t), y: H - pad.b + 14, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, t.toFixed(1)));
    });
    var vTicks = _niceTicks(vMin, vMax, 5);
    vTicks.forEach(function(t, ti) {
      children.push(h('line', { key: 'ty' + ti, x1: pad.l - 4, y1: sy(t), x2: pad.l, y2: sy(t), stroke: '#475569' }));
      children.push(h('text', { key: 'tly' + ti, x: pad.l - 6, y: sy(t) + 3, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, '' + t));
    });
    // Labels
    children.push(h('text', { key: 'xl', x: W / 2, y: H - 6, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, 'Theoretical normal quantile (z)'));
    children.push(h('text', { key: 'yl', x: 12, y: H / 2, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, transform: 'rotate(-90 12 ' + (H / 2) + ')' }, 'Sample value (' + label + ')'));
    children.push(h('text', { key: 'title', x: pad.l, y: pad.t - 6, fill: '#10b981', fontSize: 9, fontWeight: 700 }, 'Q-Q plot: dots near line = normal'));
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Q-Q plot of ' + label + ' against normal distribution. Points near the diagonal indicate approximate normality.',
      style: { background: '#0f172a', borderRadius: 6 }
    }, children);
  }

  // Boxplots side by side.
  function _renderBoxplots(groups, h, opts) {
    opts = opts || {};
    var W = opts.width || 360, H = opts.height || 220;
    var pad = { l: 56, r: 16, t: 18, b: 50 };
    var validGroups = groups.filter(function(g) { return g.values && _clean(g.values).length >= 2; });
    if (validGroups.length === 0) return h('div', { style: { fontSize: 11, color: '#94a3b8', padding: 12 } }, '(need ≥2 values per group to plot boxplots)');
    var allVals = [];
    validGroups.forEach(function(g) { allVals = allVals.concat(_clean(g.values)); });
    var min = Math.min.apply(null, allVals), max = Math.max.apply(null, allVals);
    var pad_y = (max - min) * 0.05;
    var sy = _scaleLinear(min - pad_y, max + pad_y, H - pad.b, pad.t);
    var bandW = (W - pad.l - pad.r) / validGroups.length;
    var ticks = _niceTicks(min, max, 5);
    var palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Boxplots comparing ' + validGroups.length + ' groups: ' + validGroups.map(function(g) { return g.label; }).join(', '),
      style: { background: '#0f172a', borderRadius: 6 }
    },
      // Y axis
      h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
      ticks.map(function(t, ti) {
        return h('g', { key: 'yt' + ti },
          h('line', { x1: pad.l - 4, y1: sy(t), x2: W - pad.r, y2: sy(t), stroke: '#1e293b', strokeWidth: 1 }),
          h('text', { x: pad.l - 6, y: sy(t) + 3, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, '' + t)
        );
      }),
      // Each box
      validGroups.map(function(g, gi) {
        var x = _clean(g.values);
        var q = quartiles(x);
        var iqr_ = q.q3 - q.q1;
        var lo = q.q1 - 1.5 * iqr_, hi = q.q3 + 1.5 * iqr_;
        var inFence = x.filter(function(v) { return v >= lo && v <= hi; });
        var whiskerLow = inFence.length ? Math.min.apply(null, inFence) : q.q1;
        var whiskerHigh = inFence.length ? Math.max.apply(null, inFence) : q.q3;
        var outliers = x.filter(function(v) { return v < lo || v > hi; });
        var cx = pad.l + bandW * (gi + 0.5);
        var bw = Math.min(bandW * 0.55, 60);
        var color = palette[gi % palette.length];
        return h('g', { key: gi },
          // Whiskers
          h('line', { x1: cx, y1: sy(whiskerLow), x2: cx, y2: sy(whiskerHigh), stroke: color, strokeWidth: 1.5 }),
          h('line', { x1: cx - bw / 4, y1: sy(whiskerLow), x2: cx + bw / 4, y2: sy(whiskerLow), stroke: color, strokeWidth: 1.5 }),
          h('line', { x1: cx - bw / 4, y1: sy(whiskerHigh), x2: cx + bw / 4, y2: sy(whiskerHigh), stroke: color, strokeWidth: 1.5 }),
          // Box
          h('rect', { x: cx - bw / 2, y: sy(q.q3), width: bw, height: sy(q.q1) - sy(q.q3), fill: color, opacity: 0.30, stroke: color, strokeWidth: 1.5 }),
          // Median line
          h('line', { x1: cx - bw / 2, y1: sy(q.median), x2: cx + bw / 2, y2: sy(q.median), stroke: '#fef3c7', strokeWidth: 2 }),
          // Mean dot
          h('circle', { cx: cx, cy: sy(mean(x)), r: 3, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 1 }),
          // Outliers
          outliers.map(function(o, oi) {
            return h('circle', { key: 'o' + oi, cx: cx, cy: sy(o), r: 2.5, fill: '#ef4444', stroke: '#0f172a', strokeWidth: 1 });
          }),
          // Group label
          h('text', { x: cx, y: H - pad.b + 14, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, g.label.length > 14 ? g.label.slice(0, 12) + '…' : g.label),
          h('text', { x: cx, y: H - pad.b + 26, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'n=' + x.length + ', M=' + mean(x).toFixed(1))
        );
      }),
      // Legend
      h('text', { x: pad.l, y: H - 6, fill: '#94a3b8', fontSize: 8 }, '⎯ = median   • = mean   ● red = outlier')
    );
  }

  // Scatter plot with optional regression line.
  function _renderScatter(xVals, yVals, xLabel, yLabel, h, opts) {
    opts = opts || {};
    var W = opts.width || 340, H = opts.height || 220;
    var pad = { l: 48, r: 12, t: 16, b: 38 };
    var x = [], y = [];
    var n = Math.min(xVals.length, yVals.length);
    for (var i = 0; i < n; i++) {
      if (_isNum(xVals[i]) && _isNum(yVals[i])) { x.push(xVals[i]); y.push(yVals[i]); }
    }
    if (x.length < 2) return h('div', { style: { fontSize: 11, color: '#94a3b8', padding: 12 } }, '(need ≥2 paired (x,y) values to plot)');
    var xMin = Math.min.apply(null, x), xMax = Math.max.apply(null, x);
    var yMin = Math.min.apply(null, y), yMax = Math.max.apply(null, y);
    var px = (xMax - xMin) * 0.05, py = (yMax - yMin) * 0.05;
    var sx = _scaleLinear(xMin - px, xMax + px, pad.l, W - pad.r);
    var sy = _scaleLinear(yMin - py, yMax + py, H - pad.b, pad.t);
    var xTicks = _niceTicks(xMin, xMax, 5), yTicks = _niceTicks(yMin, yMax, 5);
    // Linear fit
    var lr = linearRegression(x, y);
    var hasFit = !lr.error && _isNum(lr.slope);
    var children = [
      // Axes
      h('line', { key: 'ax', x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      h('line', { key: 'ay', x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' })
    ];
    yTicks.forEach(function(t, ti) {
      children.push(h('line', { key: 'gy' + ti, x1: pad.l, y1: sy(t), x2: W - pad.r, y2: sy(t), stroke: '#1e293b', strokeWidth: 1 }));
      children.push(h('text', { key: 'tyl' + ti, x: pad.l - 6, y: sy(t) + 3, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, '' + t));
    });
    xTicks.forEach(function(t, ti) {
      children.push(h('line', { key: 'gx' + ti, x1: sx(t), y1: H - pad.b, x2: sx(t), y2: H - pad.b + 4, stroke: '#475569' }));
      children.push(h('text', { key: 'txl' + ti, x: sx(t), y: H - pad.b + 14, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, '' + t));
    });
    // Regression line
    if (hasFit) {
      var lineX1 = xMin - px, lineX2 = xMax + px;
      var lineY1 = lr.intercept + lr.slope * lineX1;
      var lineY2 = lr.intercept + lr.slope * lineX2;
      children.push(h('line', { key: 'fit',
        x1: sx(lineX1), y1: sy(lineY1), x2: sx(lineX2), y2: sy(lineY2),
        stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5 3', opacity: 0.85
      }));
    }
    // Points
    for (var pi = 0; pi < x.length; pi++) {
      children.push(h('circle', { key: 'p' + pi, cx: sx(x[pi]), cy: sy(y[pi]), r: 3.5, fill: '#10b981', stroke: '#0f172a', strokeWidth: 1, opacity: 0.85 }));
    }
    // Labels
    children.push(h('text', { key: 'xl', x: W / 2, y: H - 6, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, xLabel));
    children.push(h('text', { key: 'yl', x: 12, y: H / 2, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, transform: 'rotate(-90 12 ' + (H / 2) + ')' }, yLabel));
    if (hasFit) {
      children.push(h('text', { key: 'fitnote', x: W - pad.r, y: pad.t + 4, fill: '#fbbf24', fontSize: 9, textAnchor: 'end' },
        'ŷ = ' + lr.intercept.toFixed(2) + ' + ' + lr.slope.toFixed(2) + 'x  (r=' + (lr.r != null ? lr.r.toFixed(2) : '?') + ')'
      ));
    }
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Scatterplot of ' + xLabel + ' vs ' + yLabel + ', n=' + x.length + (hasFit ? ', r=' + lr.r.toFixed(2) : ''),
      style: { background: '#0f172a', borderRadius: 6 }
    }, children);
  }

  // Side-by-side bar chart for chi-square: observed vs expected.
  function _renderBarObsExp(observed, expected, labels, h, opts) {
    opts = opts || {};
    var W = opts.width || 360, H = opts.height || 200;
    var pad = { l: 36, r: 12, t: 18, b: 50 };
    if (!observed || !observed.length) return h('div', { style: { fontSize: 11, color: '#94a3b8', padding: 12 } }, '(no observed counts)');
    var k = observed.length;
    var maxV = Math.max(Math.max.apply(null, observed), Math.max.apply(null, expected || [0]));
    var bandW = (W - pad.l - pad.r) / k;
    var sy = _scaleLinear(0, maxV * 1.1, H - pad.b, pad.t);
    var ticks = _niceTicks(0, maxV, 5);
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img', 'aria-label': 'Bar chart of observed vs expected counts across ' + k + ' categories',
      style: { background: '#0f172a', borderRadius: 6 }
    },
      h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
      ticks.map(function(t, ti) {
        return h('g', { key: 't' + ti },
          h('line', { x1: pad.l - 4, y1: sy(t), x2: W - pad.r, y2: sy(t), stroke: '#1e293b' }),
          h('text', { x: pad.l - 6, y: sy(t) + 3, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, '' + t)
        );
      }),
      observed.map(function(o, oi) {
        var cx = pad.l + bandW * (oi + 0.5);
        var bw = Math.min(bandW * 0.36, 28);
        var e = (expected && expected[oi]) || 0;
        var label = (labels && labels[oi]) || ('cat ' + (oi + 1));
        return h('g', { key: oi },
          // Observed
          h('rect', { x: cx - bw - 1, y: sy(o), width: bw, height: H - pad.b - sy(o), fill: '#6366f1' }),
          h('text', { x: cx - bw / 2 - 1, y: sy(o) - 3, fill: '#a5b4fc', fontSize: 9, textAnchor: 'middle' }, '' + o),
          // Expected
          h('rect', { x: cx + 1, y: sy(e), width: bw, height: H - pad.b - sy(e), fill: '#fbbf24', opacity: 0.85 }),
          h('text', { x: cx + bw / 2 + 1, y: sy(e) - 3, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, e.toFixed ? e.toFixed(1) : e),
          // Category label
          h('text', { x: cx, y: H - pad.b + 14, fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' }, label.length > 12 ? label.slice(0, 10) + '…' : label)
        );
      }),
      // Legend
      h('rect', { x: W - pad.r - 80, y: pad.t, width: 8, height: 8, fill: '#6366f1' }),
      h('text', { x: W - pad.r - 68, y: pad.t + 7, fill: '#a5b4fc', fontSize: 9 }, 'Observed'),
      h('rect', { x: W - pad.r - 80, y: pad.t + 12, width: 8, height: 8, fill: '#fbbf24' }),
      h('text', { x: W - pad.r - 68, y: pad.t + 19, fill: '#fbbf24', fontSize: 9 }, 'Expected')
    );
  }

  // Two-way ANOVA interaction plot — line per row level across col levels.
  function _renderInteractionPlot(matrix, factorALabels, factorBLabels, h, opts) {
    opts = opts || {};
    var W = opts.width || 360, H = opts.height || 220;
    var pad = { l: 40, r: 16, t: 22, b: 50 };
    if (!matrix || !matrix.length || !matrix[0].length) return null;
    var rows = matrix.length, cols = matrix[0].length;
    var allMeans = [];
    var cellMeans = [];
    for (var i = 0; i < rows; i++) {
      cellMeans[i] = [];
      for (var j = 0; j < cols; j++) {
        var c = _clean(matrix[i][j] || []);
        var m = c.length ? mean(c) : NaN;
        cellMeans[i][j] = m;
        if (isFinite(m)) allMeans.push(m);
      }
    }
    if (!allMeans.length) return null;
    var minM = Math.min.apply(null, allMeans), maxM = Math.max.apply(null, allMeans);
    var pad_y = (maxM - minM) * 0.10 || 1;
    var sy = _scaleLinear(minM - pad_y, maxM + pad_y, H - pad.b, pad.t);
    var bandX = (W - pad.l - pad.r) / Math.max(1, cols - 1);
    var palette = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];
    var children = [
      h('line', { key: 'ax', x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      h('line', { key: 'ay', x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' })
    ];
    var yticks = _niceTicks(minM, maxM, 5);
    yticks.forEach(function(t, ti) {
      children.push(h('text', { key: 'yt' + ti, x: pad.l - 6, y: sy(t) + 3, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, t.toFixed ? t.toFixed(1) : t));
      children.push(h('line', { key: 'gy' + ti, x1: pad.l, y1: sy(t), x2: W - pad.r, y2: sy(t), stroke: '#1e293b' }));
    });
    // Each row = one line
    for (var ri = 0; ri < rows; ri++) {
      var pts = [];
      for (var ci = 0; ci < cols; ci++) {
        var cm = cellMeans[ri][ci];
        if (!isFinite(cm)) continue;
        pts.push({ x: pad.l + bandX * ci, y: sy(cm) });
      }
      var color = palette[ri % palette.length];
      // Lines
      for (var pp = 0; pp < pts.length - 1; pp++) {
        children.push(h('line', { key: 'l_' + ri + '_' + pp, x1: pts[pp].x, y1: pts[pp].y, x2: pts[pp + 1].x, y2: pts[pp + 1].y, stroke: color, strokeWidth: 2 }));
      }
      // Dots
      pts.forEach(function(p, pi) {
        children.push(h('circle', { key: 'd_' + ri + '_' + pi, cx: p.x, cy: p.y, r: 4, fill: color, stroke: '#0f172a', strokeWidth: 1 }));
      });
      // Series legend on right edge
      var lastPt = pts[pts.length - 1];
      if (lastPt) children.push(h('text', { key: 'lab' + ri, x: lastPt.x + 6, y: lastPt.y + 3, fill: color, fontSize: 9, fontWeight: 700 }, factorALabels[ri] || ('A' + (ri + 1))));
    }
    // Column labels
    for (var ci2 = 0; ci2 < cols; ci2++) {
      var cx2 = pad.l + bandX * ci2;
      children.push(h('text', { key: 'xl' + ci2, x: cx2, y: H - pad.b + 14, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' }, factorBLabels[ci2] || ('B' + (ci2 + 1))));
    }
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img', 'aria-label': 'Interaction plot of cell means across factor levels',
      style: { background: '#0f172a', borderRadius: 6 }
    }, children);
  }

  // Pick the right chart for the loaded data + selected test.
  // Parametric tests (t-tests, Pearson, regression) get an additional Q-Q plot
  // for visual normality assessment.
  function _renderChartFor(d, h) {
    var sel = d.selectedTest || '';
    var t = d.twoColData, t2 = d.multiColData, t1 = d.oneColData;
    var twoColReady = t.a.length >= 2 && t.b.length >= 2;
    var multiColReady = t2.groups.length >= 2 && t2.groups.every(function(g) { return _clean(g.values).length >= 2; });
    var charts = [];
    var isParametric = /^(ttest_|anova_|pearson|linearRegression)/.test(sel);
    if (sel === 'pearson' || sel === 'spearman' || sel === 'linearRegression') {
      if (twoColReady) charts.push(h('div', { key: 'sc', style: { marginBottom: 10 } }, _renderScatter(t.a, t.b, t.aLabel, t.bLabel, h)));
      if (twoColReady && isParametric) {
        charts.push(h('div', { key: 'qa', style: { marginBottom: 10 } }, _renderQQPlot(t.a, t.aLabel, h)));
        charts.push(h('div', { key: 'qb', style: { marginBottom: 10 } }, _renderQQPlot(t.b, t.bLabel, h)));
      }
    } else if (/^ttest_(paired|independent)$|^mannWhitneyU$|^wilcoxonSignedRank$/.test(sel)) {
      if (twoColReady) charts.push(h('div', { key: 'bp', style: { marginBottom: 10 } }, _renderBoxplots([{ label: t.aLabel, values: t.a }, { label: t.bLabel, values: t.b }], h)));
      if (twoColReady && isParametric) {
        charts.push(h('div', { key: 'qa', style: { marginBottom: 10 } }, _renderQQPlot(t.a, t.aLabel, h)));
        charts.push(h('div', { key: 'qb', style: { marginBottom: 10 } }, _renderQQPlot(t.b, t.bLabel, h)));
      }
    } else if (/^anova_oneWay$|^kruskalWallis$|^anova_repeatedMeasures$/.test(sel)) {
      if (multiColReady) charts.push(h('div', { key: 'bp2', style: { marginBottom: 10 } }, _renderBoxplots(t2.groups, h)));
    } else if (sel === 'ttest_oneSample') {
      if (t1.values.length >= 2) charts.push(h('div', { key: 'h1', style: { marginBottom: 10 } }, _renderHistogram(t1.values, 'Sample (μ₀=' + t1.mu0 + ')', h)));
      if (t1.values.length >= 4) charts.push(h('div', { key: 'qq1', style: { marginBottom: 10 } }, _renderQQPlot(t1.values, 'Sample', h)));
    } else if (sel === 'chiSquareGoodnessOfFit') {
      if (d.chiGofData.observed.length) charts.push(h('div', { key: 'gof', style: { marginBottom: 10 } }, _renderBarObsExp(d.chiGofData.observed, d.chiGofData.expected, d.chiGofData.labels, h)));
    } else if (sel === 'anova_twoWay') {
      if (d.twoWayData) charts.push(h('div', { key: 'inter', style: { marginBottom: 10 } }, _renderInteractionPlot(d.twoWayData.matrix, d.twoWayData.factorALevels, d.twoWayData.factorBLevels, h)));
    } else {
      // Generic preview: histograms of whatever's loaded
      if (t.a.length >= 2) charts.push(h('div', { key: 'ha', style: { marginBottom: 10 } }, _renderHistogram(t.a, t.aLabel, h)));
      if (t.b.length >= 2) charts.push(h('div', { key: 'hb', style: { marginBottom: 10 } }, _renderHistogram(t.b, t.bLabel, h)));
    }
    if (!charts.length) return null;
    return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' } }, charts);
  }

  // Identify outlier indices in a sample using the 1.5×IQR rule.
  function _outlierIndices(arr) {
    var x = _clean(arr);
    if (x.length < 4) return [];
    var q = quartiles(x);
    var iqr_ = q.q3 - q.q1;
    var lo = q.q1 - 1.5 * iqr_, hi = q.q3 + 1.5 * iqr_;
    var idx = [];
    for (var i = 0; i < arr.length; i++) {
      if (_isNum(arr[i]) && (arr[i] < lo || arr[i] > hi)) idx.push(i);
    }
    return idx;
  }
  // Strip outliers from arr (returns clean values + count of removed points).
  function _stripOutliers(arr) {
    var idx = _outlierIndices(arr);
    var idxSet = {};
    idx.forEach(function(i) { idxSet[i] = true; });
    var kept = [];
    for (var i = 0; i < arr.length; i++) if (!idxSet[i]) kept.push(arr[i]);
    return { kept: kept, removed: idx.length };
  }

  // ──────────────────────────────────────────────────────────────────
  // AP EXAM QUIZ BANK — multiple-choice items tagged by topic.
  // After running a test, the Quiz button picks 5 items: 2 universal
  // (p-value, type I/II), 2 tagged to the test you ran, 1 random.
  // ──────────────────────────────────────────────────────────────────
  var AP_QUIZ_BANK = [
    // Universal: p-value interpretation
    { tags: ['universal', 'p_value'], q: 'A study reports p = .03. Which interpretation is correct?',
      choices: [
        'There is a 3% chance the alternative hypothesis is wrong.',
        'There is a 3% chance the null hypothesis is true.',
        'IF the null hypothesis were true, data this extreme would occur 3% of the time.',
        'The treatment works 97% of the time.'
      ], correct: 2,
      explain: 'A p-value is conditional on H₀. It is NOT the probability that H₀ is true, NOR the probability the result is "real." It is: given H₀, how often would you see data this extreme by chance.'
    },
    { tags: ['universal', 'p_value'], q: 'Which of the following would make a p-value SMALLER (assuming a real effect exists)?',
      choices: [
        'Reducing the sample size.',
        'Using a one-tailed test when two-tailed is appropriate.',
        'Increasing the sample size.',
        'Adding random noise to the measurements.'
      ], correct: 2,
      explain: 'Larger n → smaller standard errors → larger test statistics → smaller p-values when an effect is real. (One-tailed cutting p in half is correct mathematically but is a misuse of the test, not a legitimate way to reduce p.)'
    },
    // Universal: type I / type II
    { tags: ['universal', 'type_error'], q: 'A researcher rejects the null hypothesis when in fact the null is true. What kind of error is this?',
      choices: ['Type I (false positive)', 'Type II (false negative)', 'No error', 'Confounding'],
      correct: 0,
      explain: 'Type I = rejecting H₀ when it is actually true (a false positive). The probability of Type I error is α (typically .05). Type II = failing to reject H₀ when it is actually false (false negative).'
    },
    { tags: ['universal', 'type_error'], q: 'A researcher fails to find a significant effect (p > .05) but the treatment really does work in the population. What kind of error is this?',
      choices: ['Type I error', 'Type II error', 'Sampling bias', 'Confound'],
      correct: 1,
      explain: 'Type II = failing to detect a real effect. Probability = β. Power = 1 − β. Most common cause: too small a sample size to detect a small/medium effect.'
    },
    { tags: ['universal', 'type_error', 'power'], q: 'A study finds a non-significant result. Which is the most likely cause if the underlying effect is real but small?',
      choices: ['Type I error', 'Low statistical power (small n)', 'P-hacking', 'A coding mistake'],
      correct: 1,
      explain: 'When effects are small, you need a large sample to detect them. Non-sig + suspected real effect = consider increasing n. Power = probability of correctly detecting a real effect.'
    },
    // Effect size
    { tags: ['universal', 'effect_size'], q: 'Cohen\'s d = 0.20 is conventionally considered a:',
      choices: ['large effect', 'medium effect', 'small effect', 'meaningless effect'],
      correct: 2,
      explain: 'Cohen\'s benchmarks: d ≈ 0.2 small, 0.5 medium, 0.8 large. Even "small" effects can be important in some contexts. Effect size is independent of sample size.'
    },
    { tags: ['universal', 'effect_size'], q: 'A study has a "highly significant" result (p < .001) but a tiny effect size (d = 0.05). What is the best interpretation?',
      choices: [
        'A meaningful, important effect that should change practice.',
        'A real effect but probably too small to matter practically.',
        'A statistical artifact that should be ignored.',
        'Strong evidence the null is true.'
      ], correct: 1,
      explain: 'p tells you whether an effect is "real" beyond chance. d tells you whether it MATTERS. Big-n studies routinely find tiny p with negligible d. Always report both.'
    },
    // Confidence intervals
    { tags: ['universal', 'ci'], q: 'A 95% confidence interval for the difference between two means is [-1.2, 5.8]. Which statement is correct?',
      choices: [
        'The result is significant at α = .05 because the CI is wide.',
        'The result is significant at α = .05 because 0 is inside the CI.',
        'The result is NOT significant at α = .05 because 0 is inside the CI.',
        'There is a 95% chance the true difference is exactly 2.3.'
      ], correct: 2,
      explain: 'When a 95% CI for a difference includes 0, the corresponding two-sided test at α = .05 is non-significant. The two are mathematically equivalent.'
    },
    { tags: ['universal', 'ci'], q: 'What does it mean for a procedure to produce a 95% confidence interval?',
      choices: [
        'There is a 95% probability the true value is in this specific interval.',
        'If you repeated the procedure many times, 95% of the resulting intervals would contain the true value.',
        '95% of the data are in the interval.',
        '95% of similar studies will agree.'
      ], correct: 1,
      explain: 'CIs are about long-run coverage of the procedure, NOT a probability statement about the specific interval you got. This is the most-missed CI question on the AP exam.'
    },
    // Test selection
    { tags: ['ttest_independent', 'test_id'], q: 'You want to compare exam scores between students who took an SSRI vs. placebo (different students). What test fits?',
      choices: ['One-sample t-test', 'Paired t-test', 'Independent-samples t-test', 'Chi-square goodness-of-fit'],
      correct: 2,
      explain: 'Two separate groups of subjects, continuous outcome → independent t-test. (Paired would apply if the SAME students were measured on/off SSRI.)'
    },
    { tags: ['ttest_paired', 'test_id'], q: 'You measure participants\' anxiety before and after a CBT intervention. What test fits?',
      choices: ['One-sample t-test', 'Paired t-test', 'Independent t-test', 'Chi-square'],
      correct: 1,
      explain: 'Same subjects measured twice (within-subjects) → paired t-test. The pairing controls for individual baseline differences.'
    },
    { tags: ['anova_oneWay', 'test_id'], q: 'You want to compare GPA across 4 different majors. What test fits?',
      choices: ['Independent t-test', 'Pearson correlation', 'One-way ANOVA', 'Chi-square independence'],
      correct: 2,
      explain: '3 or more independent groups, continuous outcome → one-way ANOVA. After the omnibus F is significant, run Tukey HSD post-hoc to see which groups differ.'
    },
    { tags: ['anova_oneWay', 'post_hoc'], q: 'A one-way ANOVA across 4 groups returns F(3, 36) = 5.2, p = .004. What is the right next step?',
      choices: [
        'Conclude all 4 groups differ from each other.',
        'Conclude no groups differ.',
        'Run a post-hoc test (e.g., Tukey HSD) to identify which specific pairs differ.',
        'Run separate t-tests on every pair without correction.'
      ], correct: 2,
      explain: 'Significant F just means SOMEWHERE there is a difference. Post-hoc tests like Tukey HSD identify which specific pairs and control family-wise error.'
    },
    { tags: ['pearson', 'test_id', 'correlation'], q: 'Two continuous variables are linearly related with r = .60. What is r²?',
      choices: ['.36', '.60', '.80', '1.20'],
      correct: 0,
      explain: 'r² = .36, meaning about 36% of the variance in one variable is shared with (or "explained by") the other. r itself is NOT a percentage.'
    },
    { tags: ['pearson', 'correlation'], q: 'A study finds r = .80 between ice cream sales and drowning deaths. What is the most likely explanation?',
      choices: [
        'Ice cream causes drowning.',
        'Drowning causes ice cream sales.',
        'A third variable (e.g., hot weather) influences both.',
        'Statistical artifact; r should be 0.'
      ], correct: 2,
      explain: 'Classic confound: hot summer days drive both. Correlation never proves causation. Always consider lurking variables.'
    },
    { tags: ['linearRegression', 'test_id'], q: 'You want to predict a student\'s GPA from hours studied per week. What test fits?',
      choices: ['Independent t-test', 'Chi-square', 'Linear regression', 'ANOVA'],
      correct: 2,
      explain: 'Predicting one continuous variable from another → linear regression. ŷ = a + b·x.'
    },
    { tags: ['chiSquareGoodnessOfFit', 'test_id'], q: 'A geneticist counts 165 brown-eyed and 35 blue-eyed offspring (n=200) and wants to test against an expected 3:1 ratio. What test fits?',
      choices: ['t-test', 'Chi-square goodness-of-fit', 'ANOVA', 'Pearson correlation'],
      correct: 1,
      explain: 'Categorical outcome compared to a theoretical proportion → chi-square goodness-of-fit. Expected: 150 brown, 50 blue. Test the gap.'
    },
    { tags: ['chiSquareIndependence', 'test_id'], q: 'You cross-tabulate handedness (left/right) by major (STEM/Humanities/Arts) and want to test for an association. What test?',
      choices: ['ANOVA', 'Independent t-test', 'Chi-square test of independence', 'Linear regression'],
      correct: 2,
      explain: 'Two categorical variables, looking for association in a contingency table → chi-square test of independence.'
    },
    { tags: ['mannWhitneyU', 'test_id', 'nonparametric'], q: 'When should you use Mann-Whitney U instead of an independent t-test?',
      choices: [
        'When the data are continuous and normally distributed.',
        'When the data are ordinal/ranked or strongly non-normal.',
        'When you want a more powerful test.',
        'When the sample size is very large.'
      ], correct: 1,
      explain: 'Mann-Whitney U is non-parametric: doesn\'t assume normality or interval scaling. Use for Likert/ranked data or when n is small + skewed.'
    },
    // Conditions for inference
    { tags: ['universal', 'assumptions'], q: 'Which is NOT an assumption of the independent-samples t-test?',
      choices: [
        'Observations are independent.',
        'The dependent variable is approximately normal in each group.',
        'The two groups have equal sample sizes.',
        'The variance is roughly equal between groups (or use Welch correction).'
      ], correct: 2,
      explain: 'Equal n is NOT a requirement. Independent observations, approximately normal DV (especially with small n), and reasonable variance equality (or Welch) ARE.'
    },
    { tags: ['universal', 'sampling'], q: 'Random assignment in an experiment helps establish:',
      choices: [
        'A large effect size.',
        'Causal direction (treatment → outcome).',
        'A small p-value.',
        'External validity (generalizing to a population).'
      ], correct: 1,
      explain: 'Random ASSIGNMENT (to conditions) supports causal inference by balancing confounders. Random SAMPLING (from population) supports generalization. They are different ideas.'
    },
    // Power
    { tags: ['universal', 'power'], q: 'Power is the probability of:',
      choices: [
        'Rejecting H₀ when it is true.',
        'Failing to reject H₀ when it is false.',
        'Correctly rejecting H₀ when it is false.',
        'Getting a small p-value.'
      ], correct: 2,
      explain: 'Power = P(reject H₀ | H₀ false) = 1 − β. The probability of correctly detecting a real effect. Conventional minimum: 0.80.'
    },
    { tags: ['universal', 'power'], q: 'Which change INCREASES statistical power, holding other things constant?',
      choices: [
        'Decreasing sample size.',
        'Decreasing effect size.',
        'Decreasing α from .05 to .01.',
        'Increasing sample size.'
      ], correct: 3,
      explain: 'More n → smaller SE → easier to detect a real effect → higher power. Decreasing α makes it HARDER to reject H₀, lowering power.'
    },
    // Effect size translation
    { tags: ['universal', 'effect_size'], q: 'A correlation of r = .30 in absolute value is conventionally:',
      choices: ['negligible', 'small-to-medium', 'large', 'perfect'],
      correct: 1,
      explain: 'Cohen\'s benchmarks for r: .10 small, .30 medium, .50 large. So .30 sits at the medium threshold.'
    },
    // ANOVA effect size
    { tags: ['anova_oneWay', 'effect_size'], q: 'In a one-way ANOVA, η² = .14 is conventionally:',
      choices: ['small', 'medium', 'large', 'negligible'],
      correct: 2,
      explain: 'η² benchmarks: .01 small, .06 medium, .14 large. η² is the proportion of variance explained by the group factor.'
    }
  ];
  // Pick 5 questions: 2 universal + up to 2 tagged to the test the student ran + fill remainder
  function _pickQuizQuestions(testType) {
    var pool = AP_QUIZ_BANK.slice();
    // Shuffle
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    var picked = [];
    // First: 2 tagged to the specific test
    if (testType) {
      var tagMatches = pool.filter(function(q) { return q.tags.indexOf(testType) !== -1; });
      tagMatches.slice(0, 2).forEach(function(q) {
        picked.push(q);
        var idx = pool.indexOf(q);
        if (idx !== -1) pool.splice(idx, 1);
      });
    }
    // Then: 2 universal "anchor" questions on p-value + type-error
    var anchors = pool.filter(function(q) {
      return q.tags.indexOf('p_value') !== -1 || q.tags.indexOf('type_error') !== -1;
    });
    anchors.slice(0, 2).forEach(function(q) {
      if (picked.indexOf(q) !== -1) return;
      picked.push(q);
      var idx = pool.indexOf(q);
      if (idx !== -1) pool.splice(idx, 1);
    });
    // Top up to 5 from anything remaining
    while (picked.length < 5 && pool.length) {
      picked.push(pool.shift());
    }
    return picked;
  }

  // ──────────────────────────────────────────────────────────────────
  // GLOSSARY — student-facing definitions of every stat term
  // Surfaced via the "📖 Glossary" toggle in the Results panel.
  // Definitions are calibrated for AP-level intro stats students.
  // ──────────────────────────────────────────────────────────────────
  var GLOSSARY = {
    'p': { name: 'p-value', def: 'The probability of seeing data this extreme IF the null hypothesis were true. Smaller p = stronger evidence against H₀. Common cutoff: p < .05 = "significant." Does NOT mean "probability your hypothesis is right."' },
    't': { name: 't-statistic', def: 'A test statistic for comparing means. Formula: difference between means divided by the standard error. Values far from 0 (in either direction) suggest the means really differ.' },
    'F': { name: 'F-statistic', def: 'A test statistic for ANOVA. Ratio of between-group variance to within-group variance. Larger F = groups differ more than chance. Always positive.' },
    'χ²': { name: 'Chi-square statistic', def: 'A test statistic for categorical data. Measures how far observed counts are from expected counts. Larger χ² = bigger discrepancy. Used for goodness-of-fit and tests of independence.' },
    'r': { name: 'Correlation coefficient (r)', def: 'A number from -1 to +1 measuring strength + direction of a linear relationship. r = 1 perfect positive, r = -1 perfect negative, r = 0 no linear relationship. r² = proportion of variance shared.' },
    'r²': { name: 'r-squared (variance explained)', def: 'r squared. The proportion of variance in one variable that is shared with (or "explained by") the other. r = .60 means r² = .36, so 36% of variance is shared.' },
    'R²': { name: 'R-squared (regression)', def: 'In regression: proportion of variance in the outcome explained by your predictor(s). R² = .50 means your model explains half the variance. Higher = better fit, but watch for overfitting.' },
    'df': { name: 'Degrees of freedom', def: 'The number of independent values in your data after estimating necessary parameters. For a t-test, df = n − 1 (one-sample) or n₁ + n₂ − 2 (independent). df shapes the distribution we compare your test stat against.' },
    'd': { name: "Cohen's d", def: 'A standardized effect size for the difference between two means. d = (M₁ − M₂) / SD. Conventions: d ≈ 0.2 small, 0.5 medium, 0.8 large. Doesn\'t depend on sample size, so it\'s portable across studies.' },
    'η²': { name: 'Eta-squared (η²)', def: 'Effect size for ANOVA. Proportion of total variance explained by the group factor. Conventions: η² ≈ .01 small, .06 medium, .14 large. Computed as SS_between / SS_total.' },
    'ω²': { name: 'Omega-squared (ω²)', def: 'A less-biased alternative to η² for ANOVA. Adjusts for the number of groups + sample size. Slightly smaller than η². More accurate for inferring effect size in the population.' },
    'φ': { name: 'Phi (φ)', def: 'Effect size for chi-square in 2×2 tables. φ = √(χ² / N). Range 0 to 1. Conventions: φ ≈ .10 small, .30 medium, .50 large.' },
    'V': { name: "Cramér's V", def: "Effect size for chi-square in tables larger than 2×2. V = √(χ² / [N × min(rows−1, cols−1)]). Range 0 to 1. Same conventions as φ." },
    'ci95': { name: '95% confidence interval', def: 'A range that, on repeated sampling, would contain the true population value 95% of the time. Wider CI = less precision. CIs that exclude 0 (or 1, for ratios) match a "significant" test result.' },
    'M': { name: 'Mean (M)', def: 'The arithmetic average. Sum of all values divided by n. Sensitive to outliers, so check the median too.' },
    'SD': { name: 'Standard deviation (SD)', def: 'A measure of spread. Roughly: typical distance of a value from the mean. Sample SD uses n−1 in the denominator (Bessel\'s correction).' },
    'SE': { name: 'Standard error (SE)', def: 'The standard deviation of the sampling distribution of a statistic. Smaller SE = more precise estimate. SE = SD / √n for the mean.' },
    'q': { name: "Tukey's q-statistic", def: 'A studentized range statistic used in Tukey\'s HSD post-hoc test. Compares pairwise group means while controlling overall family-wise error.' },
    'U': { name: 'Mann-Whitney U', def: 'A non-parametric test statistic. Counts how often values from one group outrank values from the other. Used when data are ordinal or non-normal.' },
    'W': { name: 'Wilcoxon W', def: 'Sum of ranks of positive differences in the Wilcoxon signed-rank test. Non-parametric alternative to a paired t-test.' },
    'H': { name: 'Kruskal-Wallis H', def: 'Non-parametric ANOVA test statistic based on ranks. Approximated by chi-square distribution for inference.' },
    'z': { name: 'z-score', def: 'A standardized score: how many SDs a value is from the mean. z = 0 is the mean, z = ±2 is roughly the 5th/95th percentile in a normal distribution.' },
    'slope': { name: 'Slope (b)', def: 'In ŷ = a + b·x, the slope b is the predicted change in y for each one-unit increase in x. Positive = upward trend, negative = downward.' },
    'intercept': { name: 'Intercept (a)', def: 'In ŷ = a + b·x, the intercept a is the predicted y when x = 0. Be cautious interpreting it if x = 0 is outside your data range.' },
    'effectSize': { name: 'Effect size', def: 'A statistic that captures HOW BIG an effect is, independent of sample size. p-values tell you whether an effect is real; effect sizes tell you whether it matters. Always report both.' },
    'powerStat': { name: 'Power', def: 'Probability of correctly rejecting a false null hypothesis. Conventionally 0.80 (80%). Low power = high chance of missing real effects. Increasing n is the most direct way to gain power.' }
  };
  // Map a result.* field name to a glossary key. Some results use multiple
  // names for the same concept; this collapses them.
  function _glossaryKeysForResult(r) {
    if (!r) return [];
    var keys = [];
    var pushIf = function(cond, k) { if (cond && GLOSSARY[k] && keys.indexOf(k) === -1) keys.push(k); };
    pushIf(_isNum(r.p), 'p');
    pushIf(_isNum(r.t), 't');
    pushIf(_isNum(r.F), 'F');
    pushIf(_isNum(r.chiSquared), 'χ²');
    pushIf(_isNum(r.r), 'r');
    pushIf(_isNum(r.r), 'r²');
    pushIf(_isNum(r.rSquared), 'R²');
    pushIf(_isNum(r.df) || _isNum(r.dfBetween) || _isNum(r.dfWithin), 'df');
    pushIf(_isNum(r.cohensD), 'd');
    pushIf(_isNum(r.etaSquared), 'η²');
    pushIf(_isNum(r.omegaSquared), 'ω²');
    pushIf(_isNum(r.phi), 'φ');
    pushIf(_isNum(r.cramersV), 'V');
    pushIf(!!r.ci95, 'ci95');
    pushIf(_isNum(r.mean) || _isNum(r.mean1) || _isNum(r.mean2), 'M');
    pushIf(_isNum(r.sd) || _isNum(r.sd1) || _isNum(r.sd2), 'SD');
    pushIf(_isNum(r.se) || _isNum(r.seSlope), 'SE');
    pushIf(!!(r.tukey && r.tukey.length), 'q');
    pushIf(_isNum(r.U), 'U');
    pushIf(_isNum(r.W), 'W');
    pushIf(_isNum(r.H), 'H');
    pushIf(_isNum(r.z), 'z');
    pushIf(_isNum(r.slope), 'slope');
    pushIf(_isNum(r.intercept), 'intercept');
    return keys;
  }

  // ──────────────────────────────────────────────────────────────────
  // BOOTSTRAP CONFIDENCE INTERVAL — resample WITH replacement, take percentiles
  // Pairs with permutation test for full resampling-pedagogy coverage.
  // ──────────────────────────────────────────────────────────────────
  function _resampleWithReplacement(arr) {
    var n = arr.length;
    var out = new Array(n);
    for (var i = 0; i < n; i++) out[i] = arr[Math.floor(Math.random() * n)];
    return out;
  }
  function bootstrapCI(d, testType, level, nReps) {
    level = level || 0.95;
    nReps = nReps || 1000;
    var statFn, statName, observed, samples = [];
    if (testType === 'ttest_oneSample') {
      var x1 = _clean(d.oneColData.values);
      if (x1.length < 3) return { error: 'Need ≥3 values for bootstrap.' };
      statFn = function() { return mean(_resampleWithReplacement(x1)); };
      observed = mean(x1);
      statName = 'Mean (M)';
    } else if (testType === 'ttest_paired' || testType === 'wilcoxonSignedRank') {
      var pa = _clean(d.twoColData.a), pb = _clean(d.twoColData.b);
      var n = Math.min(pa.length, pb.length);
      if (n < 3) return { error: 'Need ≥3 paired values for bootstrap.' };
      var diffs = [];
      for (var pi = 0; pi < n; pi++) diffs.push(pa[pi] - pb[pi]);
      statFn = function() { return mean(_resampleWithReplacement(diffs)); };
      observed = mean(diffs);
      statName = 'Mean diff';
    } else if (testType === 'ttest_independent' || testType === 'mannWhitneyU') {
      var ia = _clean(d.twoColData.a), ib = _clean(d.twoColData.b);
      if (ia.length < 3 || ib.length < 3) return { error: 'Need ≥3 values per group for bootstrap.' };
      statFn = function() { return mean(_resampleWithReplacement(ia)) - mean(_resampleWithReplacement(ib)); };
      observed = mean(ia) - mean(ib);
      statName = 'M₁ - M₂';
    } else if (testType === 'pearson' || testType === 'spearman') {
      var ra = _clean(d.twoColData.a), rb = _clean(d.twoColData.b);
      var nR = Math.min(ra.length, rb.length);
      if (nR < 4) return { error: 'Need ≥4 paired values for bootstrap.' };
      var pairs = [];
      for (var pj = 0; pj < nR; pj++) pairs.push([ra[pj], rb[pj]]);
      statFn = function() {
        var rs = _resampleWithReplacement(pairs);
        var x = rs.map(function(p) { return p[0]; }), y = rs.map(function(p) { return p[1]; });
        var pres = pearson(x, y);
        return _isNum(pres.r) ? pres.r : 0;
      };
      observed = pearson(ra.slice(0, nR), rb.slice(0, nR)).r;
      statName = 'Pearson r';
    } else if (testType === 'linearRegression') {
      var lra = _clean(d.twoColData.a), lrb = _clean(d.twoColData.b);
      var nL = Math.min(lra.length, lrb.length);
      if (nL < 4) return { error: 'Need ≥4 paired values for bootstrap.' };
      var lpairs = [];
      for (var lj = 0; lj < nL; lj++) lpairs.push([lra[lj], lrb[lj]]);
      statFn = function() {
        var rs = _resampleWithReplacement(lpairs);
        var x = rs.map(function(p) { return p[0]; }), y = rs.map(function(p) { return p[1]; });
        var lres = linearRegression(x, y);
        return _isNum(lres.slope) ? lres.slope : 0;
      };
      observed = linearRegression(lra.slice(0, nL), lrb.slice(0, nL)).slope;
      statName = 'Slope (b)';
    } else if (testType === 'anova_oneWay' || testType === 'kruskalWallis') {
      var groups = d.multiColData.groups.map(function(g) { return _clean(g.values); });
      if (groups.some(function(g) { return g.length < 3; })) return { error: 'Need ≥3 values per group for bootstrap.' };
      // Bootstrap on the F-stat
      statFn = function() {
        var resampled = groups.map(_resampleWithReplacement);
        var rres = anova_oneWay(resampled);
        return _isNum(rres.F) ? rres.F : 0;
      };
      observed = anova_oneWay(groups).F;
      statName = 'F';
    } else {
      return { error: 'Bootstrap CI not yet wired for this test type.' };
    }
    for (var k = 0; k < nReps; k++) {
      var s = statFn();
      if (_isNum(s)) samples.push(s);
    }
    if (!samples.length) return { error: 'Bootstrap simulation failed.' };
    samples.sort(function(a, b) { return a - b; });
    var alpha = 1 - level;
    var loIdx = Math.max(0, Math.floor(samples.length * (alpha / 2)));
    var hiIdx = Math.min(samples.length - 1, Math.ceil(samples.length * (1 - alpha / 2)) - 1);
    return {
      observed: observed,
      statName: statName,
      level: level,
      ci: [samples[loIdx], samples[hiIdx]],
      samples: samples,
      nReps: samples.length,
      median: samples[Math.floor(samples.length / 2)]
    };
  }

  // Render bootstrap CI: histogram of resampled stats + observed marker + CI shaded band
  function _renderBootstrapViz(boot, h) {
    if (!boot || boot.error) return h('div', { style: { fontSize: 12, color: '#fca5a5', padding: 10 } }, '⚠ ' + (boot && boot.error));
    var W = 380, H = 160;
    var pad = { l: 36, r: 12, t: 18, b: 30 };
    var s = boot.samples;
    var min = Math.min.apply(null, s.concat([boot.observed]));
    var max = Math.max.apply(null, s.concat([boot.observed]));
    var nBins = 30;
    var binW = (max - min) / nBins || 1;
    var bins = new Array(nBins).fill(0);
    for (var i = 0; i < s.length; i++) {
      var b = Math.min(nBins - 1, Math.floor((s[i] - min) / binW));
      bins[b]++;
    }
    var maxCount = Math.max.apply(null, bins);
    var sx = _scaleLinear(min, max, pad.l, W - pad.r);
    var sy = _scaleLinear(0, maxCount, H - pad.b, pad.t);
    var ticks = _niceTicks(min, max, 5);
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': boot.level * 100 + '% bootstrap CI for ' + boot.statName + ': [' + boot.ci[0].toFixed(3) + ', ' + boot.ci[1].toFixed(3) + ']',
      style: { background: '#0f172a', borderRadius: 6 }
    },
      h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
      // Shaded CI band background
      h('rect', { x: sx(boot.ci[0]), y: pad.t, width: Math.max(2, sx(boot.ci[1]) - sx(boot.ci[0])), height: H - pad.b - pad.t, fill: '#10b981', opacity: 0.15 }),
      // Histogram bars
      bins.map(function(c, bi) {
        var x0 = sx(min + bi * binW), x1 = sx(min + (bi + 1) * binW);
        var binMid = min + (bi + 0.5) * binW;
        var inCI = binMid >= boot.ci[0] && binMid <= boot.ci[1];
        return h('rect', {
          key: bi,
          x: x0 + 0.5, y: sy(c), width: Math.max(1, x1 - x0 - 1), height: H - pad.b - sy(c),
          fill: inCI ? '#10b981' : '#94a3b8', opacity: 0.85
        });
      }),
      // CI bracket lines
      h('line', { x1: sx(boot.ci[0]), y1: pad.t, x2: sx(boot.ci[0]), y2: H - pad.b, stroke: '#10b981', strokeWidth: 2 }),
      h('line', { x1: sx(boot.ci[1]), y1: pad.t, x2: sx(boot.ci[1]), y2: H - pad.b, stroke: '#10b981', strokeWidth: 2 }),
      // Observed marker
      h('line', { x1: sx(boot.observed), y1: pad.t - 4, x2: sx(boot.observed), y2: H - pad.b, stroke: '#fbbf24', strokeWidth: 2.5 }),
      h('text', { x: sx(boot.observed), y: pad.t - 6, fill: '#fbbf24', fontSize: 10, fontWeight: 800, textAnchor: 'middle' },
        '↓ ' + boot.observed.toFixed(2)
      ),
      ticks.map(function(t, ti) {
        return h('g', { key: 'tk' + ti },
          h('line', { x1: sx(t), y1: H - pad.b, x2: sx(t), y2: H - pad.b + 4, stroke: '#475569' }),
          h('text', { x: sx(t), y: H - pad.b + 14, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, '' + t)
        );
      }),
      h('text', { x: W / 2, y: H - 4, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' },
        'Bootstrap distribution of ' + boot.statName + ' (green band = ' + (boot.level * 100).toFixed(0) + '% CI)'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // PERMUTATION / RANDOMIZATION TEST — visualize the null distribution
  // Modern AP Stats teaches "What if the labels were randomly shuffled?"
  // Each shuffle gives one possible test stat under H₀. Repeat 1000 times,
  // see where the observed value falls. The fraction more extreme = p_perm.
  // ──────────────────────────────────────────────────────────────────
  function _shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function permutationTest(d, testType, nReps) {
    nReps = nReps || 1000;
    var observed = null, simStats = [], statName = '';
    if (testType === 'ttest_independent' || testType === 'mannWhitneyU') {
      var a = _clean(d.twoColData.a), b = _clean(d.twoColData.b);
      if (a.length < 2 || b.length < 2) return { error: 'Need ≥2 values per group.' };
      var nA = a.length;
      var combined = a.concat(b);
      observed = mean(a) - mean(b);
      statName = 'M₁ - M₂';
      for (var r = 0; r < nReps; r++) {
        var sh = _shuffle(combined);
        var simA = sh.slice(0, nA), simB = sh.slice(nA);
        simStats.push(mean(simA) - mean(simB));
      }
    } else if (testType === 'ttest_paired' || testType === 'wilcoxonSignedRank') {
      var pa = _clean(d.twoColData.a), pb = _clean(d.twoColData.b);
      var n = Math.min(pa.length, pb.length);
      if (n < 2) return { error: 'Need ≥2 paired observations.' };
      var diffs = [];
      for (var pi = 0; pi < n; pi++) diffs.push(pa[pi] - pb[pi]);
      observed = mean(diffs);
      statName = 'Mean diff';
      // Under H₀: each pair's sign could flip with prob 0.5
      for (var pr = 0; pr < nReps; pr++) {
        var simD = diffs.map(function(v) { return Math.random() < 0.5 ? -v : v; });
        simStats.push(mean(simD));
      }
    } else if (testType === 'pearson' || testType === 'spearman' || testType === 'linearRegression') {
      var ca = _clean(d.twoColData.a), cb = _clean(d.twoColData.b);
      var nP = Math.min(ca.length, cb.length);
      if (nP < 3) return { error: 'Need ≥3 paired (x,y) values.' };
      var pX = ca.slice(0, nP), pY = cb.slice(0, nP);
      var pres = pearson(pX, pY);
      observed = pres.r;
      statName = 'r';
      for (var pri = 0; pri < nReps; pri++) {
        var shY = _shuffle(pY);
        var sres = pearson(pX, shY);
        if (_isNum(sres.r)) simStats.push(sres.r);
      }
    } else if (testType === 'anova_oneWay' || testType === 'kruskalWallis') {
      var groups = d.multiColData.groups.map(function(g) { return _clean(g.values); });
      if (groups.some(function(g) { return g.length < 2; })) return { error: 'Need ≥2 values per group.' };
      var sizes = groups.map(function(g) { return g.length; });
      var pool = []; groups.forEach(function(g) { pool = pool.concat(g); });
      // Observed F-stat
      var oneRes = anova_oneWay(groups);
      observed = oneRes.F;
      statName = 'F';
      for (var ar = 0; ar < nReps; ar++) {
        var shp = _shuffle(pool);
        var simGroups = [];
        var idx = 0;
        for (var sg = 0; sg < sizes.length; sg++) {
          simGroups.push(shp.slice(idx, idx + sizes[sg]));
          idx += sizes[sg];
        }
        var simRes = anova_oneWay(simGroups);
        if (_isNum(simRes.F)) simStats.push(simRes.F);
      }
    } else {
      return { error: 'Permutation test not yet wired for this test type.' };
    }
    if (!simStats.length) return { error: 'Simulation failed to produce results.' };
    // Two-tailed p-value: how often is |sim| ≥ |observed|?
    var absObs = Math.abs(observed);
    var moreExtreme = 0;
    // For F-stat (always positive), use one-sided
    var oneSided = (statName === 'F');
    for (var k = 0; k < simStats.length; k++) {
      if (oneSided) {
        if (simStats[k] >= observed) moreExtreme++;
      } else {
        if (Math.abs(simStats[k]) >= absObs) moreExtreme++;
      }
    }
    var pPerm = moreExtreme / simStats.length;
    return {
      observed: observed,
      statName: statName,
      simStats: simStats,
      nReps: simStats.length,
      moreExtreme: moreExtreme,
      pPerm: pPerm,
      oneSided: oneSided
    };
  }

  // Render the permutation test panel: histogram of simulated null + observed marker.
  function _renderPermutationViz(perm, h) {
    if (!perm || perm.error) {
      return h('div', { style: { fontSize: 12, color: '#fca5a5', padding: 10 } }, '⚠ ' + (perm && perm.error));
    }
    var W = 380, H = 160;
    var pad = { l: 36, r: 12, t: 18, b: 30 };
    var s = perm.simStats;
    var min = Math.min.apply(null, s.concat([perm.observed]));
    var max = Math.max.apply(null, s.concat([perm.observed]));
    var nBins = 30;
    var binW = (max - min) / nBins || 1;
    var bins = new Array(nBins).fill(0);
    for (var i = 0; i < s.length; i++) {
      var b = Math.min(nBins - 1, Math.floor((s[i] - min) / binW));
      bins[b]++;
    }
    var maxCount = Math.max.apply(null, bins);
    var sx = _scaleLinear(min, max, pad.l, W - pad.r);
    var sy = _scaleLinear(0, maxCount, H - pad.b, pad.t);
    var ticks = _niceTicks(min, max, 5);
    return h('svg', {
      width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Null distribution from ' + perm.nReps + ' permutations. Observed ' + perm.statName + ' = ' + perm.observed.toFixed(3),
      style: { background: '#0f172a', borderRadius: 6 }
    },
      h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
      h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
      bins.map(function(c, bi) {
        var x0 = sx(min + bi * binW), x1 = sx(min + (bi + 1) * binW);
        var y0 = sy(c);
        // Highlight bins more extreme than observed
        var binLo = min + bi * binW, binHi = min + (bi + 1) * binW;
        var inExtreme = perm.oneSided
          ? (binLo >= perm.observed)
          : (Math.abs(binLo) >= Math.abs(perm.observed) || Math.abs(binHi) >= Math.abs(perm.observed));
        return h('rect', {
          key: bi,
          x: x0 + 0.5, y: y0, width: Math.max(1, x1 - x0 - 1), height: H - pad.b - y0,
          fill: inExtreme ? '#ef4444' : '#94a3b8', opacity: 0.7
        });
      }),
      // Observed marker
      h('line', { x1: sx(perm.observed), y1: pad.t - 4, x2: sx(perm.observed), y2: H - pad.b, stroke: '#fbbf24', strokeWidth: 2.5 }),
      h('text', { x: sx(perm.observed), y: pad.t - 6, fill: '#fbbf24', fontSize: 10, fontWeight: 800, textAnchor: 'middle' },
        '↓ Observed = ' + perm.observed.toFixed(2)
      ),
      ticks.map(function(t, ti) {
        return h('g', { key: 'tk' + ti },
          h('line', { x1: sx(t), y1: H - pad.b, x2: sx(t), y2: H - pad.b + 4, stroke: '#475569' }),
          h('text', { x: sx(t), y: H - pad.b + 14, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, '' + t)
        );
      }),
      h('text', { x: W / 2, y: H - 4, fill: '#cbd5e1', fontSize: 10, fontWeight: 700, textAnchor: 'middle' },
        perm.statName + ' under H₀ (red = ≥ observed)'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // COMMON MISCONCEPTIONS panel — tailored to test type + result
  // Surfaces the specific student errors that this result is most likely
  // to trigger. Pulls from APA + intro-stats teaching literature.
  // ──────────────────────────────────────────────────────────────────
  function _renderMisconceptions(r, h) {
    if (!r || r.error) return null;
    var items = [];
    var p = r.p, t = r.test || '';
    // Universal: p-value misinterpretation
    if (_isNum(p)) {
      items.push({
        wrong: '"p < .05 means there\'s a 5% chance the result is a fluke."',
        right: 'p is the probability of seeing a result this extreme IF the null hypothesis were true. It does NOT tell you the probability that your hypothesis is correct.'
      });
    }
    // Significance vs effect size confusion
    if (_isNum(p) && p < 0.05 && (_isNum(r.cohensD) || _isNum(r.r))) {
      var es = _isNum(r.cohensD) ? Math.abs(r.cohensD) : Math.abs(r.r);
      var smallish = (_isNum(r.cohensD) && es < 0.3) || (_isNum(r.r) && es < 0.2);
      if (smallish) {
        items.push({
          wrong: '"It\'s significant, so the effect must be important."',
          right: 'With a large enough sample, even tiny effects reach significance. Your effect here is small in magnitude, so the practical importance is limited even though it\'s "real."'
        });
      }
    }
    // Non-significant ≠ no effect
    if (_isNum(p) && p >= 0.05) {
      items.push({
        wrong: '"p > .05, so we proved there\'s no effect."',
        right: 'Non-significance ≠ proof of no effect. It just means your data don\'t provide strong evidence against the null. With more data or less noise, you might still detect one.'
      });
    }
    // Correlation ≠ causation
    if (/correlation|regression/i.test(t)) {
      items.push({
        wrong: '"X is correlated with Y, so X causes Y."',
        right: 'Correlation shows two variables move together. Causation requires controlled manipulation. A third variable (or reverse causation) could explain the same pattern.'
      });
    }
    // ANOVA / omnibus interpretation
    if (/ANOVA/.test(t) && _isNum(p) && p < 0.05) {
      items.push({
        wrong: '"The ANOVA was significant, so all groups differ from each other."',
        right: 'A significant F-test only tells you SOMEWHERE there\'s a difference. To find which specific pairs differ, look at the Tukey HSD post-hoc table above.'
      });
    }
    // Chi-square: large counts ≠ large effect
    if (/chi-square/i.test(t) && _isNum(p) && p < 0.05) {
      items.push({
        wrong: '"The χ² is large, so the association is strong."',
        right: 'χ² grows with sample size. To judge association strength, look at Cramér\'s V or φ (the effect-size statistics shown above), not at χ² itself.'
      });
    }
    // r² overinterpretation
    if (/Pearson|Linear regression/.test(t) && _isNum(r.r)) {
      items.push({
        wrong: '"r = .50 means the relationship is 50% strong."',
        right: 'r is on a scale from -1 to +1; the proportion of variance shared is r² = ' + (r.r * r.r).toFixed(2) + ' (about ' + (r.r * r.r * 100).toFixed(0) + '%). r itself is not a percentage.'
      });
    }
    if (!items.length) return null;
    return h('div', {
      style: {
        background: 'rgba(245,158,11,0.10)',
        border: '1px solid rgba(245,158,11,0.45)',
        borderRadius: 10, padding: 14, marginBottom: 12
      }
    },
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '⚠ Common misconceptions to avoid'),
      items.map(function(it, i) {
        return h('div', { key: i, style: { fontSize: 11, color: '#fde68a', lineHeight: 1.55, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid rgba(245,158,11,0.45)' } },
          h('div', { style: { fontWeight: 700, color: '#fef3c7', marginBottom: 2 } }, '✗ ' + it.wrong),
          h('div', { style: { color: '#cbd5e1' } }, '✓ ' + it.right)
        );
      })
    );
  }


  // Expose pure functions for testing / reuse by other modules
  window.AlloStats = {
    sum: sum, mean: mean, median: median, mode: mode, variance: variance, stdDev: stdDev,
    quantile: quantile, quartiles: quartiles, iqr: iqr, range: range,
    skewness: skewness, kurtosis: kurtosis, summary: summary,
    ttest_oneSample: ttest_oneSample, ttest_paired: ttest_paired, ttest_independent: ttest_independent,
    anova_oneWay: anova_oneWay, pearson: pearson, spearman: spearman, linearRegression: linearRegression,
    chiSquareGoodnessOfFit: chiSquareGoodnessOfFit, chiSquareIndependence: chiSquareIndependence,
    effectSizeLabel: effectSizeLabel, assumptionChecks: assumptionChecks,
    plainEnglish: plainEnglish, apaWriteup: apaWriteup,
    _ensureJStat: _ensureJStat,
  };
  console.log('[StemLab] stem_tool_statslab.js Phase 1 loaded');
})();
