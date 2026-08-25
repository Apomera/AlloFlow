// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_probability.js — Probability Lab
// Extracted from stem_tool_math.js
// Enhancements:
//   • Fixed icon/label/desc/color metadata
//   • Fixed isDark/isContrast theme detection (was always undefined)
//   • AI Explain Results (callGemini + gradeLevel)
//   • TTS narrate button
//   • Two-Event Compound Probability Tree mode
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

  // ── Audio + WCAG (auto-injected) ──
  var _probAC = null;
  function getProbAC() { if (!_probAC) { try { _probAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_probAC && _probAC.state==="suspended") { try { _probAC.resume(); } catch(e) {} } return _probAC; }
  function probTone(f,d,tp,v) { if (window._probabilityMuted) return; var ac=getProbAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxProbClick() { probTone(600,0.03,"sine",0.04); }
  function sfxProbSuccess() { probTone(523,0.08,"sine",0.07); setTimeout(function(){probTone(659,0.08,"sine",0.07);},70); setTimeout(function(){probTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("prob-a11y")){var _s=document.createElement("style");_s.id="prob-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}";document.head.appendChild(_s);}

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-probability')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-probability';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  function probabilityMarbleOutcomes(outcomes) {
    var prepared = (Array.isArray(outcomes) ? outcomes : []).map(function(o, i) {
      var rawCount = Number(o && o.count);
      var count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 1;
      return Object.assign({}, o || {}, { label: String((o && o.label) || ('Color ' + (i + 1))), count: count });
    });
    var total = prepared.reduce(function(sum, o) { return sum + o.count; }, 0);
    return prepared.map(function(o) { return Object.assign({}, o, { prob: total > 0 ? o.count / total : 0 }); });
  }

  function probabilityBuildMarblePool(outcomes) {
    var pool = [];
    probabilityMarbleOutcomes(outcomes).forEach(function(o) {
      for (var i = 0; i < o.count; i++) pool.push(o.label);
    });
    return pool;
  }

  function probabilityMarbleOdds(outcomes, remaining) {
    var refillNext = Array.isArray(remaining) && remaining.length === 0;
    var pool = Array.isArray(remaining) && remaining.length ? remaining.slice() : probabilityBuildMarblePool(outcomes);
    var counts = {};
    pool.forEach(function(label) { counts[label] = (counts[label] || 0) + 1; });
    var total = pool.length;
    return {
      total: total,
      refillNext: refillNext,
      outcomes: probabilityMarbleOutcomes(outcomes).map(function(o) {
        var count = counts[o.label] || 0;
        return { label: o.label, count: count, probability: total > 0 ? count / total : 0 };
      })
    };
  }

  function probabilityDrawMarble(outcomes, remaining, randomValue) {
    var pool = Array.isArray(remaining) ? remaining.slice() : [];
    var refilled = !Array.isArray(remaining) || pool.length === 0;
    if (refilled) pool = probabilityBuildMarblePool(outcomes);
    if (!pool.length) return { label: null, remaining: [], refilled: refilled };
    var random = Number(randomValue);
    if (!Number.isFinite(random)) random = 0;
    random = Math.max(0, Math.min(0.999999999, random));
    var index = Math.floor(random * pool.length);
    var label = pool[index];
    pool.splice(index, 1);
    return { label: label, remaining: pool, refilled: refilled };
  }

  // Exact two-draw probability tree for a finite bag sampled without
  // replacement. The helper works from counts rather than an expanded marble
  // pool, so even a large restored bag stays O(number of outcome types squared).
  // Every ordered path is retained, including same-outcome paths whose second
  // numerator is zero (an important visible "impossible" case).
  function probabilityWithoutReplacementTree(outcomes) {
    var prepared = probabilityMarbleOutcomes(outcomes);
    var total = prepared.reduce(function(sum, outcome) { return sum + outcome.count; }, 0);
    var secondDenominator = total > 1 ? total - 1 : 0;
    var valid = total >= 2;
    var reason = valid ? '' : 'A without-replacement tree needs at least two items in the bag.';
    var paths = [];
    var branches = prepared.map(function(first, firstIndex) {
      var firstProbability = total > 0 ? first.count / total : 0;
      var branchPaths = prepared.map(function(second, secondIndex) {
        var conditionalNumerator = Math.max(0, second.count - (firstIndex === secondIndex ? 1 : 0));
        var conditionalProbability = valid ? conditionalNumerator / secondDenominator : 0;
        var jointNumerator = first.count * conditionalNumerator;
        var jointDenominator = valid ? total * secondDenominator : 0;
        var path = {
          firstIndex: firstIndex,
          secondIndex: secondIndex,
          first: first,
          second: second,
          firstNumerator: first.count,
          firstDenominator: total,
          firstProbability: firstProbability,
          conditionalNumerator: conditionalNumerator,
          conditionalDenominator: secondDenominator,
          conditionalProbability: conditionalProbability,
          jointNumerator: jointNumerator,
          jointDenominator: jointDenominator,
          jointProbability: jointDenominator > 0 ? jointNumerator / jointDenominator : 0,
          impossible: jointNumerator === 0
        };
        paths.push(path);
        return path;
      });
      return {
        firstIndex: firstIndex,
        outcome: first,
        numerator: first.count,
        denominator: total,
        probability: firstProbability,
        paths: branchPaths
      };
    });
    return {
      valid: valid,
      reason: reason,
      total: total,
      secondDenominator: secondDenominator,
      outcomes: prepared,
      branches: branches,
      paths: paths
    };
  }

  function probabilityPrepareCustomOutcomes(outcomes, subMode) {
    var input = Array.isArray(outcomes) ? outcomes : [];
    var prepared = input.map(function(o, i) {
      var item = Object.assign({}, o || {});
      item.label = String(item.label == null ? '' : item.label).trim();
      if (subMode === 'fraction') {
        var numerator = Number(item.numerator == null ? 1 : item.numerator);
        var denominator = Number(item.denominator == null ? 20 : item.denominator);
        item.prob = denominator > 0 ? numerator / denominator : NaN;
      } else if (subMode === 'marbleBag') {
        var rawCount = Number(item.count);
        item.count = Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 1;
      } else {
        item.prob = Number(item.prob);
      }
      return item;
    });

    if (subMode === 'marbleBag') {
      var marbleTotal = prepared.reduce(function(sum, o) { return sum + o.count; }, 0);
      prepared = prepared.map(function(o) {
        return Object.assign({}, o, { prob: marbleTotal > 0 ? o.count / marbleTotal : 0 });
      });
    }

    var total = prepared.reduce(function(sum, o) { return sum + (Number.isFinite(o.prob) ? o.prob : 0); }, 0);
    var reason = '';
    if (prepared.length < 2) reason = 'Add at least two outcomes.';
    else if (prepared.some(function(o) { return !o.label; })) reason = 'Give every outcome a name.';
    else {
      var seen = {};
      var duplicate = prepared.find(function(o) {
        var key = o.label.toLocaleLowerCase();
        if (seen[key]) return true;
        seen[key] = true;
        return false;
      });
      if (duplicate) reason = 'Use a unique name for each outcome. “' + duplicate.label + '” appears more than once.';
      else if (prepared.some(function(o) { return !Number.isFinite(o.prob) || o.prob < 0 || o.prob > 1; })) reason = 'Each probability must be between 0% and 100%.';
      else if (Math.abs(total - 1) > 0.000001) reason = 'Probabilities total ' + (total * 100).toFixed(1) + '%. Adjust them to exactly 100%.';
    }

    if (!reason && total > 0 && subMode !== 'marbleBag') {
      prepared = prepared.map(function(o) { return Object.assign({}, o, { prob: o.prob / total }); });
    }
    return { outcomes: prepared, total: total, valid: !reason, reason: reason };
  }

  // Wilson score interval for a binomial proportion. Unlike the familiar
  // p-hat +/- 1.96*SE shortcut, Wilson stays inside [0, 1] and remains useful
  // for small samples and rare outcomes (exactly the cases students encounter
  // with d20s and two-dice tail sums). `z` is injectable for teaching/tests;
  // the default is the two-sided 95% critical value.
  function probabilityWilsonInterval(successes, trials, z) {
    var n = Math.floor(Number(trials));
    var x = Math.round(Number(successes));
    var critical = Number(z);
    if (!Number.isFinite(critical) || critical <= 0) critical = 1.959963984540054;
    if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(x)) {
      return { valid: false, successes: 0, trials: 0, observed: null, low: 0, high: 1, center: 0.5, halfWidth: 0.5, z: critical };
    }
    x = Math.max(0, Math.min(n, x));
    var observed = x / n;
    var z2 = critical * critical;
    var denominator = 1 + z2 / n;
    var center = (observed + z2 / (2 * n)) / denominator;
    var halfWidth = critical * Math.sqrt((observed * (1 - observed) / n) + (z2 / (4 * n * n))) / denominator;
    return {
      valid: true,
      successes: x,
      trials: n,
      observed: observed,
      low: Math.max(0, center - halfWidth),
      high: Math.min(1, center + halfWidth),
      center: center,
      halfWidth: halfWidth,
      z: critical
    };
  }

  function probabilityResetPatch() {
    return {
      results: [], trials: 0, convergenceHistory: [], lastResult: null,
      _mbRemaining: null, _piPoints: [], _autoRunning: false, _bestStreak: 0
    };
  }

  window.__ProbabilityCore = Object.assign({}, window.__ProbabilityCore || {}, {
    marbleOutcomes: probabilityMarbleOutcomes,
    buildMarblePool: probabilityBuildMarblePool,
    marbleOdds: probabilityMarbleOdds,
    drawMarble: probabilityDrawMarble,
    withoutReplacementTree: probabilityWithoutReplacementTree,
    prepareCustomOutcomes: probabilityPrepareCustomOutcomes,
    wilsonInterval: probabilityWilsonInterval,
    resetPatch: probabilityResetPatch
  });

  // Module-level: persists across React renders without causing re-render
  var _autoRun = { interval: null };
  var _galtonAnim = { interval: null };
  var _piAnim = { interval: null };
  var PROBABILITY_CHALLENGE_TOTAL = 6;

  // ══ 3D Monte Carlo volume estimator ═════════════════════════════════════
  // Throw random darts into a 1×1×1 box holding a solid; the fraction that land
  // inside IS the solid's volume, because the box's volume is exactly 1.
  //
  // Every shape lives in [-0.5, 0.5]³ and each one's inside() test and mesh()
  // MUST describe the same solid — if they drift, darts render outside the
  // surface while counting as hits and the whole simulation is a lie. The tests
  // pin them against each other by sampling.
  //
  // The last entry has no volume formula on purpose: that is the payoff. For a
  // shape nobody can integrate, the dart estimate is not an approximation of a
  // known answer, it is the answer — reported with a confidence interval.
  function _v3BlobRadius(ux, uy, uz) {
    // Radius as a function of DIRECTION (ux,uy,uz must be unit length). Smooth
    // and lumpy. Worst-case radius is 0.38+0.05+0.035+0.03 = 0.495 < 0.5, so the
    // potato can never poke through a box wall — a dart outside the box is a
    // dart the sampler never throws, which would silently bias the estimate.
    return 0.38 + 0.05 * ux * uy + 0.035 * Math.sin(3 * uz) + 0.03 * Math.cos(4 * ux);
  }
  var V3_SHAPES = [
    {
      id: 'sphere', label: 'Sphere', color: 0x38bdf8,
      inside: function (x, y, z) { return x * x + y * y + z * z <= 0.25; },
      exact: Math.PI / 6,
      formula: '4⁄₃ · π · r³, r = ½  →  π⁄6',
      piFactor: 6,  // volume × 6 = π, so this shape also estimates π
      mesh: function (T) { return new T.SphereGeometry(0.5, 48, 32); }
    },
    {
      id: 'cone', label: 'Cone', color: 0xa78bfa,
      // Apex at +y, base radius ½ at −y. Radius shrinks linearly with height.
      inside: function (x, y, z) {
        if (y < -0.5 || y > 0.5) return false;
        var r = 0.5 * (0.5 - y);
        return x * x + z * z <= r * r;
      },
      exact: Math.PI / 12,
      formula: '⅓ · π · r² · h, r = ½, h = 1  →  π⁄12',
      piFactor: 12,
      mesh: function (T) { return new T.ConeGeometry(0.5, 1, 48); }
    },
    {
      id: 'pyramid', label: 'Pyramid', color: 0xfbbf24,
      // Square base of side 1 at −y, apex at +y. No π anywhere — a control case
      // showing the method is not a π trick: the answer is exactly ⅓.
      inside: function (x, y, z) {
        if (y < -0.5 || y > 0.5) return false;
        var hw = 0.5 * (0.5 - y);
        return Math.abs(x) <= hw && Math.abs(z) <= hw;
      },
      exact: 1 / 3,
      formula: '⅓ · base · height, base = 1, h = 1  →  ⅓',
      piFactor: null,
      // radialSegments 4 = square pyramid; thetaStart π/4 turns the base square
      // to axis-aligned so it matches inside() exactly. Circumradius ½√2 puts
      // its corners on (±½, ±½).
      mesh: function (T) { return new T.ConeGeometry(0.5 * Math.SQRT2, 1, 4, 1, false, Math.PI / 4); }
    },
    {
      id: 'blob', label: 'Potato', color: 0x34d399,
      inside: function (x, y, z) {
        var r = Math.sqrt(x * x + y * y + z * z);
        if (r < 1e-9) return true;
        return r <= _v3BlobRadius(x / r, y / r, z / r);
      },
      exact: null,      // ← the point of this shape
      formula: null,
      piFactor: null,
      mesh: function (T) {
        var g = new T.SphereGeometry(1, 64, 48);
        var pos = g.attributes.position;
        for (var i = 0; i < pos.count; i++) {
          var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          var R = _v3BlobRadius(x, y, z);   // sphere verts are already unit length
          pos.setXYZ(i, x * R, y * R, z * R);
        }
        pos.needsUpdate = true;
        g.computeVertexNormals();
        return g;
      }
    }
  ];
  function v3Shape(id) {
    for (var i = 0; i < V3_SHAPES.length; i++) if (V3_SHAPES[i].id === id) return V3_SHAPES[i];
    return V3_SHAPES[0];
  }

  // Imperative 3D handle. React owns the <canvas> node; this owns what is drawn
  // on it. The two meet at _v3.want, a plain snapshot the render writes and the
  // animation frame reconciles — no hooks, so nothing here can trip the
  // hook-in-a-conditional-branch crash that kills STEM tools on navigation.
  var _v3 = {
    canvas: null, renderer: null, scene: null, camera: null, controls: null,
    solid: null, cloud: null, boxLines: null, raf: null, ro: null,
    shapeId: null, cloudLen: -1, want: null, onStatus: null, booted: false
  };
  // Orbit the camera by a yaw/pitch delta, in radians, around the origin.
  // OrbitControls is pointer-only, so without this a keyboard user could never
  // turn the solid round — and turning it round is the entire point of showing
  // the cloud in 3D rather than as a number. Works with or without OrbitControls
  // loaded, since the camera is ours either way.
  function _v3Orbit(dYaw, dPitch) {
    if (!_v3.camera) return;
    var p = _v3.camera.position;
    var r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
    var yaw = Math.atan2(p.x, p.z) + dYaw;
    // Clamp pitch just shy of the poles; at exactly ±90° the up-vector flips and
    // the view snaps upside down.
    var pitch = Math.max(-1.45, Math.min(1.45, Math.asin(Math.max(-1, Math.min(1, p.y / r))) + dPitch));
    var c = Math.cos(pitch);
    _v3.camera.position.set(r * c * Math.sin(yaw), r * Math.sin(pitch), r * c * Math.cos(yaw));
    _v3.camera.lookAt(0, 0, 0);
    if (_v3.controls && _v3.controls.update) _v3.controls.update();
  }
  function _v3Zoom(factor) {
    if (!_v3.camera) return;
    var p = _v3.camera.position;
    var r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1;
    var nr = Math.max(1.1, Math.min(5, r * factor));   // same bounds as OrbitControls
    var s = nr / r;
    _v3.camera.position.set(p.x * s, p.y * s, p.z * s);
    _v3.camera.lookAt(0, 0, 0);
    if (_v3.controls && _v3.controls.update) _v3.controls.update();
  }
  // Stable handler, for the same reason _v3Attach is stable.
  function _v3Keys(e) {
    var STEP = 0.18;
    var k = e.key;
    if (k === 'ArrowLeft') _v3Orbit(-STEP, 0);
    else if (k === 'ArrowRight') _v3Orbit(STEP, 0);
    else if (k === 'ArrowUp') _v3Orbit(0, STEP);
    else if (k === 'ArrowDown') _v3Orbit(0, -STEP);
    else if (k === '+' || k === '=') _v3Zoom(1 / 1.15);
    else if (k === '-' || k === '_') _v3Zoom(1.15);
    else return;
    // Arrow keys scroll the page by default, which would yank the canvas out of
    // view the moment a keyboard user tried to rotate it.
    e.preventDefault();
    // Any deliberate steer means the student is driving; stop fighting them.
    if (_v3.controls) _v3.controls.autoRotate = false;
  }
  function _v3Reduced() {
    try {
      return !!(document.querySelector('.reduce-motion') ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches));
    } catch (e) { return false; }
  }
  function _v3SetShape(T, id) {
    if (_v3.shapeId === id || !_v3.scene) return;
    if (_v3.solid) { _v3.scene.remove(_v3.solid); _v3.solid.geometry.dispose(); _v3.solid.material.dispose(); }
    var sh = v3Shape(id);
    _v3.solid = new T.Mesh(sh.mesh(T), new T.MeshPhongMaterial({
      color: sh.color, transparent: true, opacity: 0.22, depthWrite: false,
      side: T.DoubleSide, shininess: 30
    }));
    _v3.scene.add(_v3.solid);
    _v3.shapeId = id;
  }
  function _v3SetCloud(T, flat) {
    // flat = [x, y, z, inside, …]. Rebuilt only when the length changes, so
    // idle frames cost nothing.
    if (!_v3.scene) return;
    var n = flat ? flat.length / 4 : 0;
    if (_v3.cloud) { _v3.scene.remove(_v3.cloud); _v3.cloud.geometry.dispose(); _v3.cloud.material.dispose(); _v3.cloud = null; }
    if (!n) { _v3.cloudLen = 0; return; }
    var pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = flat[i * 4]; pos[i * 3 + 1] = flat[i * 4 + 1]; pos[i * 3 + 2] = flat[i * 4 + 2];
      var hit = flat[i * 4 + 3];
      // Hits bright, misses dim — otherwise the miss shell hides the solid.
      col[i * 3] = hit ? 0.13 : 0.62; col[i * 3 + 1] = hit ? 0.93 : 0.65; col[i * 3 + 2] = hit ? 0.55 : 0.70;
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    _v3.cloud = new T.Points(g, new T.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, opacity: 0.95 }));
    _v3.scene.add(_v3.cloud);
    _v3.cloudLen = flat.length;
  }
  function _v3Boot() {
    var T = window.THREE;
    if (!T || !_v3.canvas || _v3.booted) return;
    try {
      _v3.renderer = new T.WebGLRenderer({ canvas: _v3.canvas, antialias: true, alpha: true });
      _v3.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    } catch (e) {
      if (_v3.onStatus) _v3.onStatus('webgl');
      return;
    }
    _v3.scene = new T.Scene();
    _v3.camera = new T.PerspectiveCamera(42, 1, 0.05, 100);
    _v3.camera.position.set(1.45, 1.05, 1.6);
    _v3.camera.lookAt(0, 0, 0);
    _v3.scene.add(new T.AmbientLight(0xffffff, 0.72));
    var dir = new T.DirectionalLight(0xffffff, 0.65); dir.position.set(2, 3, 2); _v3.scene.add(dir);
    _v3.boxLines = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)),
      new T.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.85 })
    );
    _v3.scene.add(_v3.boxLines);
    if (T.OrbitControls) {
      _v3.controls = new T.OrbitControls(_v3.camera, _v3.canvas);
      _v3.controls.enableDamping = true;
      _v3.controls.dampingFactor = 0.08;
      _v3.controls.enablePan = false;
      _v3.controls.minDistance = 1.1;
      _v3.controls.maxDistance = 5;
      // Idle spin gives the depth cue that makes a point cloud read as a solid,
      // but it is motion — off when the student asked for less of it.
      _v3.controls.autoRotate = !_v3Reduced();
      _v3.controls.autoRotateSpeed = 0.85;
    }
    var lastW = -1;
    var resize = function () {
      var host = _v3.canvas && _v3.canvas.parentNode;
      if (!host || !_v3.renderer) return;
      var w = Math.max(120, host.clientWidth || 320);
      // ★ Act on WIDTH changes only. We observe the parent, and our own output
      // (the canvas box) is part of what the parent measures — so reacting to
      // height would let the observer feed itself. Layout then never settles,
      // and Playwright reports it as buttons that are never clickable and
      // elements "not attached", not as anything resembling a resize loop.
      if (w === lastW) return;
      lastW = w;
      // Capped: unclamped 0.72×width made the viewport ~630px tall on a wide
      // screen, pushing every number below the fold and leaving the canvas
      // taller than its own container.
      var h = Math.max(180, Math.min(420, Math.round(w * 0.62)));
      // updateStyle OFF, then both CSS dimensions set here from the SAME pair of
      // numbers as the drawing buffer. Letting the library own one dimension
      // while we owned the other is how they drifted apart.
      _v3.renderer.setSize(w, h, false);
      _v3.canvas.style.width = w + 'px';
      _v3.canvas.style.height = h + 'px';
      _v3.camera.aspect = w / h;
      _v3.camera.updateProjectionMatrix();
    };
    // ★ A canvas defaults to display:inline, whose line-box adds descender
    // height to the parent every measure → setSize → measure cycle. That is an
    // unbounded resize loop, and it has taken down 3D tools in this repo before.
    _v3.canvas.style.display = 'block';
    // NB: no style.width here — renderer.setSize owns both CSS dimensions now.
    _v3.canvas.style.touchAction = 'none';
    resize();
    try {
      if (window.ResizeObserver && _v3.canvas.parentNode) {
        _v3.ro = new window.ResizeObserver(resize);
        _v3.ro.observe(_v3.canvas.parentNode);
      }
    } catch (e) { /* resize stays static — still usable */ }
    _v3.booted = true;
    var tick = function () {
      _v3.raf = window.requestAnimationFrame(tick);
      var w = _v3.want;
      if (w) {
        _v3SetShape(T, w.shapeId);
        if (w.cloud && w.cloud.length !== _v3.cloudLen) _v3SetCloud(T, w.cloud);
        else if (!w.cloud && _v3.cloudLen !== 0) _v3SetCloud(T, null);
      }
      if (_v3.controls) _v3.controls.update();
      _v3.renderer.render(_v3.scene, _v3.camera);
    };
    tick();
    if (_v3.onStatus) _v3.onStatus('ok');
  }
  function _v3Teardown() {
    if (_v3.raf) { window.cancelAnimationFrame(_v3.raf); _v3.raf = null; }
    if (_v3.ro) { try { _v3.ro.disconnect(); } catch (e) {} _v3.ro = null; }
    if (_v3.controls && _v3.controls.dispose) { try { _v3.controls.dispose(); } catch (e) {} }
    [_v3.solid, _v3.cloud, _v3.boxLines].forEach(function (o) {
      if (!o) return;
      if (_v3.scene) _v3.scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (_v3.renderer) { try { _v3.renderer.dispose(); } catch (e) {} }
    _v3.renderer = _v3.scene = _v3.camera = _v3.controls = null;
    _v3.solid = _v3.cloud = _v3.boxLines = _v3.canvas = null;
    _v3.shapeId = null; _v3.cloudLen = -1; _v3.booted = false;
  }
  // Three.js is ~600KB from a CDN. Probability Lab is a heavily used 2D tool, so
  // it loads lazily on first entry to the 3D mode rather than in init() — a coin
  // -flip lesson should not pull a 3D engine over a school connection.
  var _v3Load = { state: 'idle' };
  function _v3EnsureThree(onDone) {
    if (window.THREE && window.THREE.OrbitControls) _v3Load.state = 'ready';
    if (_v3Load.state === 'ready') { if (onDone) onDone('ready'); return; }
    if (_v3Load.state === 'loading') return;
    _v3Load.state = 'loading';
    if (onDone) onDone('loading');
    try {
      window.StemLab.ensureThree({
        orbit: true,
        failMessage: 'The 3D engine could not load. School networks often block CDNs — the numbers below still work without it.'
      }).then(function () {
        _v3Load.state = 'ready';
        if (onDone) onDone('ready');
      }).catch(function () {
        _v3Load.state = 'failed';
        if (onDone) onDone('failed');
      });
    } catch (e) {
      _v3Load.state = 'failed';
      if (onDone) onDone('failed');
    }
  }

  // STABLE identity — declared once at module scope. An inline arrow here would
  // be a new function every render, and React tears down and re-runs a ref whose
  // identity changed, so the scene would be rebuilt on every keystroke.
  function _v3Attach(node) {
    if (!node) { _v3Teardown(); return; }
    if (_v3.canvas === node && _v3.booted) return;
    if (_v3.canvas !== node && _v3.booted) _v3Teardown();
    _v3.canvas = node;
    if (window.THREE) _v3Boot();
  }

  window.StemLab.registerTool('probability', {
    icon: '\uD83C\uDFB2',
    label: 'Probability Lab',
    desc: 'Coin flips, dice, spinners, real sports stats & custom experiments.',
    color: 'violet',
    category: 'math',
    questHooks: [
      { id: 'run_100_trials', label: 'Run 100+ probability trials', icon: '\uD83C\uDFB2', check: function(d) { return (d.totalTrials || 0) >= 100; }, progress: function(d) { return (d.totalTrials || 0) + '/100 trials'; } },
      { id: 'try_3_experiments', label: 'Try 3 different experiment types', icon: '\uD83E\uDDEA', check: function(d) { return Object.keys(d.experimentsUsed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.experimentsUsed || {}).length + '/3 types'; } },
      { id: 'monte_carlo', label: 'Run a Monte Carlo simulation', icon: '\uD83D\uDCCA', check: function(d) { return (d._piPoints || []).length > 0; }, progress: function(d) { return (d._piPoints || []).length > 0 ? 'Done!' : 'Not yet'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
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
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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

      // ── Theme detection (fixes pre-existing undefined isDark/isContrast bug) ──
      var isDark = false, isContrast = false;
      try {
        isDark = !!document.querySelector('.theme-dark');
        isContrast = !!document.querySelector('.theme-contrast');
      } catch(e) {}

      // ── Tool body (probability) ──
      return (function() {
var d = (labToolData.probability) || {};
          // Default the experiment mode so the first render isn't a dead state (no active mode
          // in the selector + a bare "?" result card). Idempotent per render: re-applies whenever
          // the bucket has no mode yet, including before the user's first interaction.
          if (!d.mode) d.mode = 'coin';
          // Sync persistent mute state to module flag read by probTone
          window._probabilityMuted = !!d.muted;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('probability', 'init', {
              first: 'Probability Lab loaded. Simulate dice rolls, coin flips, and card draws. Visualize probability distributions with interactive experiments.',
              repeat: 'Probability Lab active.',
              terse: 'Probability.'
            }, { debounce: 800 });
          }

          var upd = function(key, val) { setLabToolData(function(prev) { return Object.assign({}, prev, { probability: Object.assign({}, prev.probability, (function() { var o = {}; o[key] = val; return o; })()) }); }); };

          // Marble-bag replacement toggle. Shared by the switch's pointer and
          // keyboard paths so the two cannot drift; flipping the mode
          // invalidates the drawn results, so they reset together.
          function mbToggleReplacement() {
            upd('mbWithoutReplacement', !d.mbWithoutReplacement);
            upd('results', []);
            upd('trials', 0);
            upd('convergenceHistory', []);
            upd('lastResult', null);
            upd('_mbRemaining', null);
          }



          // â”€â”€ Sports Scenarios â”€â”€

          var SPORTS = [

            { id: 'freethrow', label: t('stem.probability.free_throws', '\uD83C\uDFC0 Free Throws'), icon: '\uD83C\uDFC0', desc: t('stem.probability.nba_average_free_throw_percentage_is_7', 'NBA average free throw percentage is ~77%'), outcomes: ['Make', 'Miss'], probs: [0.77, 0.23], colors: ['#22c55e', '#ef4444'], emoji: ['\uD83C\uDFC0', '\u274C'] },

            { id: 'threepoint', label: t('stem.probability.3_pointers', '\uD83C\uDFC0 3-Pointers'), icon: '\uD83C\uDFC0', desc: t('stem.probability.nba_average_3_point_percentage_is_36', 'NBA average 3-point percentage is ~36%'), outcomes: ['Swish', 'Miss'], probs: [0.36, 0.64], colors: ['#3b82f6', '#ef4444'], emoji: ['\uD83D\uDCAB', '\u274C'] },

            { id: 'penalty', label: t('stem.probability.penalty_kicks', '\u26BD Penalty Kicks'), icon: '\u26BD', desc: t('stem.probability.soccer_penalty_kick_conversion_rate_is', 'Soccer penalty kick conversion rate is ~76%'), outcomes: ['Goal', 'Save'], probs: [0.76, 0.24], colors: ['#22c55e', '#f59e0b'], emoji: ['\u26BD', '\uD83E\uDDE4'] },

            { id: 'batting', label: t('stem.probability.batting_average', '\u26BE Batting Average'), icon: '\u26BE', desc: t('stem.probability.mlb_average_batting_average_is_250_hit', 'MLB average batting average is ~.250 (hit 1 in 4)'), outcomes: ['Hit', 'Out'], probs: [0.250, 0.750], colors: ['#8b5cf6', '#94a3b8'], emoji: ['\uD83D\uDCA5', '\u2796'] },

            { id: 'fieldgoal', label: t('stem.probability.field_goals', '\uD83C\uDFC8 Field Goals'), icon: '\uD83C\uDFC8', desc: t('stem.probability.nfl_field_goal_success_rate_is_84', 'NFL field goal success rate is ~84%'), outcomes: ['Good', 'No Good'], probs: [0.84, 0.16], colors: ['#22c55e', '#ef4444'], emoji: ['\uD83C\uDFC8', '\u274C'] },

            { id: 'tennis', label: t('stem.probability.first_serves', '\uD83C\uDFBE First Serves'), icon: '\uD83C\uDFBE', desc: t('stem.probability.pro_tennis_first_serve_success_rate_is', 'Pro tennis first serve success rate is ~62%'), outcomes: ['In', 'Fault'], probs: [0.62, 0.38], colors: ['#06b6d4', '#f97316'], emoji: ['\uD83C\uDFBE', '\u2716'] },

            { id: 'hockey', label: t('stem.probability.shots_on_goal', '\uD83C\uDFD2 Shots on Goal'), icon: '\uD83C\uDFD2', desc: t('stem.probability.nhl_average_shooting_percentage_is_10', 'NHL average shooting percentage is ~10%'), outcomes: ['Goal', 'Save'], probs: [0.10, 0.90], colors: ['#ef4444', '#94a3b8'], emoji: ['\uD83D\uDEA8', '\uD83E\uDDE4'] }

          ];

          var activeSport = SPORTS.find(function (s) { return s.id === (d.sportType || 'freethrow'); }) || SPORTS[0];



          // â”€â”€ Custom mode outcomes â”€â”€

          var customDefaults = [{ label: 'Red', prob: 0.5, color: '#ef4444', numerator: 1, denominator: 2, count: 5 }, { label: t('stem.probability.blue', 'Blue'), prob: 0.5, color: '#3b82f6', numerator: 1, denominator: 2, count: 5 }];
          var rawCustomOutcomes = d.customOutcomes || customDefaults;
          var customSubMode = d.customSubMode || 'fraction';
          var customModel = probabilityPrepareCustomOutcomes(rawCustomOutcomes, d.mode === 'marbleBag' ? 'marbleBag' : customSubMode);
          var customOutcomes = customModel.outcomes;
          var customCanRun = (d.mode !== 'custom' && d.mode !== 'marbleBag') || customModel.valid;

          // ── Running Monte Carlo π totals ────────────────────────────────────
          // _piPoints is capped (it feeds the scatter, which only draws the last
          // 400 anyway). The ESTIMATE must not be derived from it: past the cap
          // the tool was recomputing π from the most recent 1,000 darts only, so
          // accuracy froze — 100,000 darts scored no better than 1,000 (mean
          // |error| stuck near 0.04 instead of falling to 0.004), and the "Pi
          // Hunter" badge became a 67% coin flip that more work could not improve.
          // That is the exact opposite of the O(1/√N) lesson the mode teaches.
          // Counts are unbounded; the point array stays capped for rendering.
          // Falls back to the array so state saved before this change still reads.
          var piTotal = d._piTotal != null ? d._piTotal : (d._piPoints || []).length;
          var piInside = d._piInside != null ? d._piInside : (d._piPoints || []).filter(function (p) { return p.inside; }).length;
          var piEstimate = piTotal > 0 ? (4 * piInside / piTotal) : 0;
          // With no darts the estimate is 0, so the error genuinely is π. (Also
          // keeps check_free_vars quiet — its globals list has no Infinity.)
          var piError = piTotal > 0 ? Math.abs(piEstimate - Math.PI) : Math.PI;

          // ── Which outcome the convergence chart tracks ──────────────────────
          // Two-dice sum used to track the sum of 2 — the RAREST outcome in the
          // one mode whose entire lesson is "middle sums are much more common".
          // At 2d20 that is P=1/400, a flat line pinned to the axis. It now tracks
          // the MODAL sum (N+1, P=1/N), which is the sum the mode's own hint talks
          // about and the one that actually demonstrates the point.
          // Defined once here because the roll handler, the auto-run loop, the
          // expected-value line and the chart heading all need to agree.
          var convTrackedSum = (d.diceSides || 6) + 1;
          var convTrackedKey = d.mode === 'coin' ? 'H'
            : d.mode === 'dice' ? 1
            : d.mode === 'dice2' ? convTrackedSum
            : d.mode === 'spinner' ? 'Red'
            : d.mode === 'sports' ? activeSport.outcomes[0]
            : d.mode === 'pi' ? 'inside'
            : customOutcomes[0] ? customOutcomes[0].label : 'Red';

          var setProbabilityOutcomes = function(outcomes) {
            if (_autoRun.interval) { clearInterval(_autoRun.interval); _autoRun.interval = null; }
            setLabToolData(function(prev) {
              var current = prev.probability || {};
              return Object.assign({}, prev, { probability: Object.assign({}, current, probabilityResetPatch(), { customOutcomes: outcomes }) });
            });
            var live = document.getElementById('allo-live-probability');
            if (live) live.textContent = 'Probability model changed. Previous trials cleared and automatic simulation stopped.';
          };

          var setCustomSubMode = function(subMode) {
            if (_autoRun.interval) { clearInterval(_autoRun.interval); _autoRun.interval = null; }
            setLabToolData(function(prev) {
              var current = prev.probability || {};
              return Object.assign({}, prev, { probability: Object.assign({}, current, probabilityResetPatch(), { customSubMode: subMode }) });
            });
          };

          var runTrial = function(n) {
            if (!customCanRun) {
              if (addToast) addToast(customModel.reason, 'error');
              var invalidLive = document.getElementById('allo-live-probability');
              if (invalidLive) invalidLive.textContent = 'Cannot run trials. ' + customModel.reason;
              return;
            }

            const results = [...(d.results || [])];

            var newPiPoints = [];
            var mbRemaining = d._mbRemaining;

            for (let i = 0; i < n; i++) {

              if (d.mode === 'coin') results.push(Math.random() < 0.5 ? 'H' : 'T');

              else if (d.mode === 'dice') results.push(Math.floor(Math.random() * (d.diceSides || 6)) + 1);
              else if (d.mode === 'dice2') {
                var _ds2 = d.diceSides || 6;
                var _r1 = Math.floor(Math.random() * _ds2) + 1;
                var _r2 = Math.floor(Math.random() * _ds2) + 1;
                results.push(_r1 + _r2);
                // Save the last pair on the LAST iteration for display rendering
                if (i === n - 1) { upd('_lastPair', [_r1, _r2]); }
              }

              else if (d.mode === 'spinner') results.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);

              else if (d.mode === 'sports') {

                var r = Math.random(), cumulative = 0;

                for (var si = 0; si < activeSport.outcomes.length; si++) {

                  cumulative += activeSport.probs[si];

                  if (r < cumulative) { results.push(activeSport.outcomes[si]); break; }

                }

                if (results.length === (d.results || []).length + i) results.push(activeSport.outcomes[activeSport.outcomes.length - 1]);

              }

              else if (d.mode === 'custom') {

                var cr = Math.random(), ccum = 0;

                for (var ci = 0; ci < customOutcomes.length; ci++) {

                  ccum += customOutcomes[ci].prob;

                  if (cr < ccum) { results.push(customOutcomes[ci].label); break; }

                }

                if (results.length === (d.results || []).length + i) results.push(customOutcomes[customOutcomes.length - 1].label);

              }

              else if (d.mode === 'marbleBag') {
                if (d.mbWithoutReplacement) {
                  var marbleDraw = probabilityDrawMarble(customOutcomes, mbRemaining, Math.random());
                  if (marbleDraw.label != null) results.push(marbleDraw.label);
                  mbRemaining = marbleDraw.remaining;
                } else {
                  var replacementDraw = probabilityDrawMarble(customOutcomes, null, Math.random());
                  if (replacementDraw.label != null) results.push(replacementDraw.label);
                }
              } else if (d.mode === 'pi') {

                var _piX = Math.random(), _piY = Math.random();

                var _piInside = (_piX * _piX + _piY * _piY) <= 1;

                results.push(_piInside ? 'inside' : 'outside');

                newPiPoints.push({ x: _piX, y: _piY, inside: _piInside });

              }

            }

            if (d.mode === 'marbleBag' && d.mbWithoutReplacement) upd('_mbRemaining', mbRemaining);

            // Pi: flush accumulated scatter points after all n trials
            if (d.mode === 'pi' && newPiPoints.length > 0) {

              var _allPiPts = (d._piPoints || []).concat(newPiPoints);

              if (_allPiPts.length > 1000) _allPiPts = _allPiPts.slice(-1000);

              upd('_piPoints', _allPiPts);

              // Counters take EVERY dart, including the ones the cap drops.
              upd('_piTotal', piTotal + newPiPoints.length);

              upd('_piInside', piInside + newPiPoints.filter(function (p) { return p.inside; }).length);

            }

            upd('results', results);

            upd('trials', results.length);
            var trialsAdded = results.length - (d.results || []).length;
            if (trialsAdded > 0) {
              setLabToolData(function(prev) {
                var current = prev.probability || {};
                var used = Object.assign({}, current.experimentsUsed || {});
                used[d.mode || 'coin'] = true;
                return Object.assign({}, prev, { probability: Object.assign({}, current, {
                  totalTrials: (current.totalTrials || 0) + trialsAdded,
                  experimentsUsed: used
                }) });
              });
            }

            var hist = d.convergenceHistory || [];

            var total = results.length;

            if (total > 0) {

              var firstKey = convTrackedKey;

              var cnt = results.filter(function (r) { return r === firstKey; }).length;

              hist = hist.concat([{ t: total, pct: cnt / total * 100 }]);

              if (hist.length > 50) hist = hist.slice(-50);

              upd('convergenceHistory', hist);

            }

            upd('lastResult', results[results.length - 1]);

            upd('animTick', (d.animTick || 0) + 1);

            if (d.mode === 'marbleBag') { upd('_mbShaking', true); setTimeout(function () { upd('_mbShaking', false); }, 600); }

            // ── Streak detection ──
            if (results.length >= 2 && n === 1) {

              var _lastR = results[results.length - 1];

              var _streak = 1;

              for (var _si = results.length - 2; _si >= 0; _si--) { if (results[_si] === _lastR) _streak++; else break; }

              var _prevBest = d._bestStreak || 0;

              if (_streak > _prevBest) upd('_bestStreak', _streak);

              if ([5, 10, 15, 20].indexOf(_streak) >= 0 && _streak > _prevBest) {

                if (stemCelebrate) stemCelebrate();

                if (stemBeep) stemBeep(_streak >= 10 ? 880 : 660, 0.15);

                if (addToast) addToast('🔥 ' + _streak + ' in a row!', 'success');

              }

              // Per-trial sound (musical note per outcome)
              if (stemBeep) {

                var _noteMap = { 'H': 523, 'T': 392, 1: 261, 2: 294, 3: 330, 4: 349, 5: 392, 6: 440, 'Red': 523, 'Blue': 587, 'Green': 659, 'Yellow': 698, 'inside': 784, 'outside': 330 };

                stemBeep(_noteMap[_lastR] || 440, 0.08);

              }

            }

            // ── Milestone XP ──
            var _mTotal = results.length;

            if ([10, 50, 100, 500, 1000].indexOf(_mTotal) >= 0) {

              if (stemCelebrate) stemCelebrate();

              if (awardStemXP) awardStemXP('probability', 5);

              if (addToast) addToast('🎉 ' + _mTotal + ' trials! +5 XP', 'success');

            }

          };

          // ── Functional trial runner for Auto-Run ──
          // Uses setLabToolData(prev=>) to always read fresh state (no stale closure)
          var runTrialAuto = function() {

            setLabToolData(function(prev) {

              var _pd = prev.probability || {};

              if (!_pd._autoRunning) return prev;

              var _res = (_pd.results || []).slice();

              var _asp2 = SPORTS.find(function(s) { return s.id === (_pd.sportType || 'freethrow'); }) || SPORTS[0];

              var _cos3 = _pd.customOutcomes || customDefaults;
              var _customModel3 = probabilityPrepareCustomOutcomes(_cos3, _pd.mode === 'marbleBag' ? 'marbleBag' : (_pd.customSubMode || 'fraction'));
              _cos3 = _customModel3.outcomes;
              if ((_pd.mode === 'custom' || _pd.mode === 'marbleBag') && !_customModel3.valid) {
                if (_autoRun.interval) { clearInterval(_autoRun.interval); _autoRun.interval = null; }
                return Object.assign({}, prev, { probability: Object.assign({}, _pd, { _autoRunning: false }) });
              }

              var _newPiPts3 = null, _newPiTot3 = null, _newPiIn3 = null;
              var _newMbRemaining3 = _pd._mbRemaining;

              if (_pd.mode === 'coin') {

                _res.push(Math.random() < 0.5 ? 'H' : 'T');

              } else if (_pd.mode === 'dice') {

                _res.push(Math.floor(Math.random() * (_pd.diceSides || 6)) + 1);

              } else if (_pd.mode === 'dice2') {

                var _pds2 = _pd.diceSides || 6;
                _res.push((Math.floor(Math.random() * _pds2) + 1) + (Math.floor(Math.random() * _pds2) + 1));

              } else if (_pd.mode === 'spinner') {

                _res.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);

              } else if (_pd.mode === 'sports') {

                var _rr3 = Math.random(), _cum3 = 0;

                for (var _ai3 = 0; _ai3 < _asp2.outcomes.length; _ai3++) { _cum3 += _asp2.probs[_ai3]; if (_rr3 < _cum3) { _res.push(_asp2.outcomes[_ai3]); break; } }

                if (_res.length === (_pd.results || []).length) _res.push(_asp2.outcomes[_asp2.outcomes.length - 1]);

              } else if (_pd.mode === 'marbleBag') {
                var _mbDraw3 = probabilityDrawMarble(_cos3, _pd.mbWithoutReplacement ? _newMbRemaining3 : null, Math.random());
                if (_mbDraw3.label != null) _res.push(_mbDraw3.label);
                if (_pd.mbWithoutReplacement) _newMbRemaining3 = _mbDraw3.remaining;
              } else if (_pd.mode === 'pi') {

                var _pX3 = Math.random(), _pY3 = Math.random();

                var _pIn3 = (_pX3 * _pX3 + _pY3 * _pY3) <= 1;

                _res.push(_pIn3 ? 'inside' : 'outside');

                _newPiPts3 = (_pd._piPoints || []).concat([{ x: _pX3, y: _pY3, inside: _pIn3 }]);

                if (_newPiPts3.length > 1000) _newPiPts3 = _newPiPts3.slice(-1000);

                // Unbounded totals off _pd, so the estimate keeps converging past
                // the point-array cap. Seeded from the array for legacy state.
                _newPiTot3 = (_pd._piTotal != null ? _pd._piTotal : (_pd._piPoints || []).length) + 1;

                _newPiIn3 = (_pd._piInside != null ? _pd._piInside : (_pd._piPoints || []).filter(function (p) { return p.inside; }).length) + (_pIn3 ? 1 : 0);

              } else {

                var _cr3 = Math.random(), _cc3 = 0;

                for (var _ci4 = 0; _ci4 < _cos3.length; _ci4++) { _cc3 += _cos3[_ci4].prob; if (_cr3 < _cc3) { _res.push(_cos3[_ci4].label); break; } }

                if (_res.length === (_pd.results || []).length) _res.push(_cos3[_cos3.length - 1].label);

              }

              var _nlast3 = _res[_res.length - 1];

              var _ntick3 = (_pd.animTick || 0) + 1;

              var _cHist3 = (_pd.convergenceHistory || []).slice();

              if (_res.length > 0) {

                // Must mirror convTrackedKey, but off _pd (the state this updater
                // was handed) rather than the render-scope d. dice2 tracks the
                // modal sum N+1, not the rarest sum 2.
                var _fk3 = _pd.mode === 'coin' ? 'H' : _pd.mode === 'dice' ? 1 : _pd.mode === 'dice2' ? ((_pd.diceSides || 6) + 1) : _pd.mode === 'spinner' ? 'Red' : _pd.mode === 'sports' ? _asp2.outcomes[0] : _pd.mode === 'pi' ? 'inside' : (_cos3[0] ? _cos3[0].label : 'Red');

                var _cnt4 = _res.filter(function(r) { return r === _fk3; }).length;

                _cHist3 = _cHist3.concat([{ t: _res.length, pct: _cnt4 / _res.length * 100 }]);

                if (_cHist3.length > 50) _cHist3 = _cHist3.slice(-50);

              }

              var _used3 = Object.assign({}, _pd.experimentsUsed || {});
              _used3[_pd.mode || 'coin'] = true;
              var _newPd3 = Object.assign({}, _pd, {
                results: _res, trials: _res.length, lastResult: _nlast3, animTick: _ntick3,
                convergenceHistory: _cHist3, totalTrials: (_pd.totalTrials || 0) + 1, experimentsUsed: _used3
              });

              if (_newPiPts3) _newPd3._piPoints = _newPiPts3;

              if (_newPiTot3 != null) { _newPd3._piTotal = _newPiTot3; _newPd3._piInside = _newPiIn3; }
              if (_pd.mode === 'marbleBag' && _pd.mbWithoutReplacement) _newPd3._mbRemaining = _newMbRemaining3;

              return Object.assign({}, prev, { probability: _newPd3 });

            });

          };



          // â”€â”€ Compute expected & counts â”€â”€

          const counts = {};

          (d.results || []).forEach(r => { counts[r] = (counts[r] || 0) + 1; });

          var expected;

          if (d.mode === 'coin') expected = { H: 0.5, T: 0.5 };

          else if (d.mode === 'dice') {
            // Uniform 1/N across all faces of the selected die
            expected = {};
            var _ds3 = d.diceSides || 6;
            for (var _di = 1; _di <= _ds3; _di++) expected[_di] = 1 / _ds3;
          }
          else if (d.mode === 'dice2') {
            // Two-dice sum: triangular distribution. ways(k) / N^2 for k in [2, 2N].
            // For 2dN: ways(k) = min(k-1, 2N-k+1)
            expected = {};
            var _ds4 = d.diceSides || 6;
            var _ttl = _ds4 * _ds4;
            for (var _ds5 = 2; _ds5 <= 2 * _ds4; _ds5++) {
              var ways = Math.min(_ds5 - 1, 2 * _ds4 - _ds5 + 1);
              expected[_ds5] = ways / _ttl;
            }
          }

          else if (d.mode === 'spinner') expected = { Red: 0.25, Blue: 0.25, Green: 0.25, Yellow: 0.25 };

          else if (d.mode === 'sports') {

            expected = {};

            activeSport.outcomes.forEach(function (o, i) { expected[o] = activeSport.probs[i]; });

          } else if (d.mode === 'marbleBag') {

            expected = {};

            customOutcomes.forEach(function (o) { expected[o.label] = o.prob; });

          } else if (d.mode === 'pi') {

            expected = { inside: Math.PI / 4, outside: 1 - Math.PI / 4 };

          } else if (d.mode === 'birthday') {

            expected = {};

          } else {

            expected = {};

            customOutcomes.forEach(function (o) { expected[o.label] = o.prob; });

          }

          const maxCount = Math.max(...Object.values(counts), 1);

          var barColors = { H: '#3b82f6', T: '#ef4444', 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6', 6: '#8b5cf6', Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308', inside: '#22c55e', outside: '#ef4444' };

          if (d.mode === 'sports') { activeSport.outcomes.forEach(function (o, i) { barColors[o] = activeSport.colors[i]; }); }

          if (d.mode === 'custom') { customOutcomes.forEach(function (o) { barColors[o.label] = o.color; }); }

          if (d.mode === 'marbleBag') { customOutcomes.forEach(function (o) { barColors[o.label] = o.color; }); }



          // Chi-squared

          var chiSq = 0;

          if (d.trials > 0) {

            Object.keys(expected).forEach(function (k) {

              var obs = counts[k] || 0;

              var exp = expected[k] * d.trials;

              if (exp > 0) chiSq += Math.pow(obs - exp, 2) / exp;

            });

          }

          var df = Object.keys(expected).length - 1;

          // Upper 5% critical value of the chi-squared distribution.
          //
          // This used to be a five-branch lookup (df 1/2/3/5/6) that fell back to
          // 11.07 for everything else — so every die bigger than a d6, and EVERY
          // two-dice sum except 2d4, was judged against the d6's threshold. A
          // perfectly fair d20 (df=19, where chi-squared averages 19) was labelled
          // "Biased" 93% of the time, and 2d6 — the classroom default — 36% of the
          // time. The tool was teaching students that fair dice are loaded.
          //
          // Exact table to df=10, Wilson-Hilferty beyond it (worst error 0.07%
          // through df=40, which covers 2d20's df=38).
          var CHI_05 = [3.841, 5.991, 7.815, 9.488, 11.070, 12.592, 14.067, 15.507, 16.919, 18.307];
          var chiCriticalAt05 = function (dof) {
            if (dof < 1) return CHI_05[0];
            if (dof <= CHI_05.length) return CHI_05[dof - 1];
            var a = 2 / (9 * dof);
            var w = 1 - a + 1.6448536 * Math.sqrt(a);
            return dof * w * w * w;
          };
          var chiCritical = chiCriticalAt05(df);

          // Chi-squared only means anything once every outcome expects ~5 hits.
          // 2d20 has 39 sums and P(2)=1/400, so the tails need 2,000 rolls before
          // the statistic is interpretable. Below that we withhold the verdict
          // instead of printing a confident Fair/Biased on noise.
          var minExpectedP = 1;
          Object.keys(expected).forEach(function (k) { if (expected[k] < minExpectedP) minExpectedP = expected[k]; });
          var chiTrialsNeeded = minExpectedP > 0 ? Math.ceil(5 / minExpectedP) : 0;
          // Chi-squared assumes INDEPENDENT draws. Drawing without replacement
          // breaks that outright: a full pass through the bag returns exactly the
          // bag's contents, so at every multiple of the bag size the statistic is
          // exactly 0 and the tool used to print "✅ Fair" at maximum confidence.
          // That is arithmetic, not evidence — and it taught the reverse of the
          // truth, since the with-replacement bag (genuinely random, χ²≈0.4)
          // looked WORSE than the one with no randomness left in it.
          var chiIndependent = !(d.mode === 'marbleBag' && d.mbWithoutReplacement);
          var chiReady = chiIndependent && d.trials > 0 && Object.keys(expected).length > 1 && d.trials >= chiTrialsNeeded;
          var chiPass = chiSq < chiCritical;
          // Neutral (neither green nor red) until the test is actually valid.
          var chiTone = !chiReady ? 'text-slate-500' : chiPass ? 'text-emerald-600' : 'text-red-600';



          var convHist = d.convergenceHistory || [];

          var convExpected = d.mode === 'coin' ? 50
            : d.mode === 'dice' ? (100 / (d.diceSides || 6))
            : d.mode === 'dice2' ? (100 / (d.diceSides || 6))  // P of the modal sum N+1 = N ways / N² = 1/N
            : d.mode === 'spinner' ? 25
            : d.mode === 'sports' ? activeSport.probs[0] * 100
            : d.mode === 'pi' ? Math.PI / 4 * 100
            : customOutcomes[0] ? customOutcomes[0].prob * 100 : 50;

          // Sampling-uncertainty lens. Use the sample we can actually inspect,
          // not a legacy `trials` counter whose result array may be absent. The
          // tracked outcome deliberately matches the convergence chart above.
          var samplingTrials = (d.results || []).length;
          var samplingSuccesses = counts[convTrackedKey] || 0;
          var samplingInterval = probabilityWilsonInterval(samplingSuccesses, samplingTrials);
          var samplingExpected = convExpected / 100;
          var samplingCompatible = samplingInterval.valid && samplingExpected >= samplingInterval.low && samplingExpected <= samplingInterval.high;
          var samplingIndependent = !(d.mode === 'marbleBag' && d.mbWithoutReplacement);



          // Dice face SVG

          // Multi-sided die SVG renderer. For d6 we keep the iconic pip layout.
          // Every other die draws the polygon of the face you actually READ on the
          // physical solid, so the glyph teaches the die as well as the number:
          //   d4  tetrahedron  - equilateral triangle, apex UP
          //   d8  octahedron   - equilateral triangle, apex DOWN (mirror of the d4)
          //   d10 pentagonal   - a KITE. A d10 is a trapezohedron, NOT a Platonic
          //       trapezohedron  solid, and its faces are kites, not rhombuses.
          //   d12 dodecahedron - regular pentagon
          //   d20 icosahedron  - equilateral triangle, apex UP, ringed by the
          //                      flat-top hexagon the six neighbouring faces form
          //                      when a d20 rests flat. Without that ring a d20 is
          //                      the same silhouette as a d4 and only colour tells
          //                      them apart — which fails any colour-blind student.
          // Colours are the shared per-die palette (the die-type buttons reuse the
          // fill). All six clear 4.5:1 against white, so the white numeral on the
          // face and the coloured label on the button are both legible.
          //
          // Regular n-gon helper: n vertices on a circle of radius r (fraction of
          // the box), first vertex at startDeg (0 = east, -90 = north). Face
          // polygons stay actually regular instead of hand-typed near-misses.
          var polyPts = function (s, n, cx, cy, r, startDeg) {
            var out = [];
            for (var vi = 0; vi < n; vi++) {
              var a = (startDeg + vi * (360 / n)) * Math.PI / 180;
              out.push(s * (cx + r * Math.cos(a)), s * (cy + r * Math.sin(a)));
            }
            return out;
          };
          // textCY = visual centre of the face as a fraction of the box. The
          // baseline is derived from it and the font size, so a 1-digit and a
          // 2-digit value both sit centred instead of drifting as the font shrinks.
          var DIE_SHAPES = {
            4:  { fill: '#2563eb', stroke: '#1e3a8a', textCY: 0.62,
                  points: function (s) { return polyPts(s, 3, 0.5, 0.58, 0.48, -90); } },
            6:  { fill: '#dc2626', stroke: '#991b1b' },  // special-cased to pips below
            8:  { fill: '#047857', stroke: '#064e3b', textCY: 0.40,
                  points: function (s) { return polyPts(s, 3, 0.5, 0.42, 0.48, 90); } },
            10: { fill: '#7c3aed', stroke: '#5b21b6', textCY: 0.50,
                  // kite: short point up, shoulders above centre, long point down
                  points: function (s) { return [s * 0.5, s * 0.05, s * 0.90, s * 0.42, s * 0.5, s * 0.95, s * 0.10, s * 0.42]; } },
            12: { fill: '#b45309', stroke: '#78350f', textCY: 0.55,
                  points: function (s) { return polyPts(s, 5, 0.5, 0.53, 0.45, -90); } },
            20: { fill: '#0f766e', stroke: '#134e4a', textCY: 0.58, fontScale: 0.78,
                  ring:   function (s) { return polyPts(s, 6, 0.5, 0.52, 0.46, 0); },
                  points: function (s) { return polyPts(s, 3, 0.5, 0.56, 0.34, -90); } },
            // Neutral fallback for a die size the selector does not offer, so an
            // unexpected N is never drawn wearing the d20's face.
            _:  { fill: '#475569', stroke: '#1e293b', textCY: 0.55,
                  points: function (s) { return polyPts(s, 6, 0.5, 0.52, 0.45, -90); } }
          };
          var diceFace = function (val, size, sides) {
            var s = size || 60;
            var dSides = sides || 6;
            // Classic d6 with pips
            if (dSides === 6 && val >= 1 && val <= 6) {
              var dotPositions = {
                1: [[s/2, s/2]],
                2: [[s*0.3, s*0.3], [s*0.7, s*0.7]],
                3: [[s*0.3, s*0.3], [s/2, s/2], [s*0.7, s*0.7]],
                4: [[s*0.3, s*0.3], [s*0.7, s*0.3], [s*0.3, s*0.7], [s*0.7, s*0.7]],
                5: [[s*0.3, s*0.3], [s*0.7, s*0.3], [s/2, s/2], [s*0.3, s*0.7], [s*0.7, s*0.7]],
                6: [[s*0.3, s*0.25], [s*0.7, s*0.25], [s*0.3, s/2], [s*0.7, s/2], [s*0.3, s*0.75], [s*0.7, s*0.75]]
              };
              var dots = dotPositions[val] || [];
              return React.createElement("svg", { role: "img", 'aria-label': 'd6 showing ' + val, viewBox: "0 0 " + s + " " + s, width: s, height: s },
                React.createElement("rect", { x: 2, y: 2, width: s - 4, height: s - 4, rx: 8, fill: "white", stroke: "#94a3b8", strokeWidth: 2 }),
                dots.map(function (pos, i) {
                  return React.createElement("circle", { key: i, cx: pos[0], cy: pos[1], r: s * 0.08, fill: "#1e293b" });
                })
              );
            }
            // Polyhedral face for d4/d8/d10/d12/d20 (neutral hexagon for anything else)
            var shape = DIE_SHAPES[dSides] || DIE_SHAPES._;
            var ptsStr = function (pts) {
              var out = '';
              for (var pi = 0; pi < pts.length; pi += 2) out += pts[pi].toFixed(1) + ',' + pts[pi + 1].toFixed(1) + ' ';
              return out;
            };
            var fontSize = s * (val >= 10 ? 0.32 : 0.42) * (shape.fontScale || 1);
            var textY = s * shape.textCY + fontSize * 0.36;
            return React.createElement("svg", { role: "img", viewBox: "0 0 " + s + " " + s, width: s, height: s, 'aria-label': 'd' + dSides + ' showing ' + val },
              shape.ring && React.createElement("polygon", { points: ptsStr(shape.ring(s)), fill: shape.fill, fillOpacity: 0.4, stroke: shape.stroke, strokeWidth: 2, strokeLinejoin: 'round' }),
              React.createElement("polygon", { points: ptsStr(shape.points(s)), fill: shape.fill, stroke: shape.stroke, strokeWidth: 2.5, strokeLinejoin: 'round' }),
              React.createElement("text", { x: s/2, y: textY, textAnchor: 'middle', fontSize: fontSize, fontWeight: 900, fill: 'white', style: { paintOrder: 'stroke', stroke: shape.stroke, strokeWidth: 0.5 } }, val)
            );
          };
          var DICE_TYPES = [4, 6, 8, 10, 12, 20];
          var diceSides = d.diceSides || 6;

          // Two-dice sum: NxN sample-space grid. Every (d1, d2) pair plotted in a
          // table, each cell colored by its SUM and labeled with the sum number.
          // The diagonals visually demonstrate why 7 has 6 ways but 2 and 12 only 1:
          // the (1,1) cell is alone in the top-left corner, the diagonal d1+d2=7
          // sweeps through 6 cells, and (6,6) is alone in the bottom-right. The
          // triangular distribution becomes spatial intuition.
          //
          // d12/d20 used to render NOTHING here — 144/400 numbered cells are too
          // crowded, so the whole panel was skipped and those students lost the
          // lesson entirely. Past d10 the grid now degrades instead of vanishing:
          // cells shrink, per-cell numerals drop, and edge labels thin out, which
          // leaves the diagonal banding — the actual point — perfectly legible.
          var renderTwoDiceGrid = function(sides, lastSum) {
            var cellSize = sides <= 6 ? 32 : sides <= 8 ? 26 : sides <= 10 ? 22 : sides <= 12 ? 18 : 9;
            var showSums = cellSize >= 18;          // numerals stop fitting below this
            var labelStride = sides <= 12 ? 1 : 5;  // every 5th index on a d20 grid
            var pad = 22;
            var gridW = sides * cellSize;
            var svgW = gridW + pad + 6;
            var svgH = gridW + pad + 6;
            var midSum = sides + 1;  // most common sum
            var rows = [];
            // Top-edge labels (die 2 values)
            var topLabels = [];
            for (var c = 1; c <= sides; c++) {
              if (c !== 1 && c !== sides && c % labelStride !== 0) continue;
              topLabels.push(React.createElement("text", {
                key: 'cl-' + c,
                x: pad + (c - 0.5) * cellSize, y: pad - 4,
                textAnchor: 'middle', fontSize: cellSize <= 22 ? 10 : 11, fontWeight: 700, fill: '#475569'
              }, c));
            }
            // Left-edge labels (die 1 values)
            var leftLabels = [];
            for (var r = 1; r <= sides; r++) {
              if (r !== 1 && r !== sides && r % labelStride !== 0) continue;
              leftLabels.push(React.createElement("text", {
                key: 'rl-' + r,
                x: pad - 4, y: pad + (r - 0.5) * cellSize + 4,
                textAnchor: 'end', fontSize: cellSize <= 22 ? 10 : 11, fontWeight: 700, fill: '#475569'
              }, r));
            }
            for (var ri = 1; ri <= sides; ri++) {
              for (var ci = 1; ci <= sides; ci++) {
                var sum = ri + ci;
                var dist = Math.abs(sum - midSum);
                var maxDist = sides - 1 || 1;  // the extreme sums are N-1 off centre, so they reach the end of the ramp
                var hue = 220 - (dist / maxDist) * 220;  // red center, blue tails
                var isHighlight = lastSum === sum;
                rows.push(React.createElement("g", { key: 'gc-' + ri + '-' + ci },
                  React.createElement("rect", {
                    x: pad + (ci - 1) * cellSize,
                    y: pad + (ri - 1) * cellSize,
                    width: cellSize - 1,
                    height: cellSize - 1,
                    fill: 'hsl(' + Math.round(hue) + ', ' + (isHighlight ? '85' : '65') + '%, ' + (isHighlight ? '50' : '70') + '%)',
                    stroke: isHighlight ? '#0f172a' : 'rgba(255,255,255,0.6)',
                    strokeWidth: isHighlight ? (cellSize < 18 ? 1.5 : 2) : (cellSize < 18 ? 0.3 : 0.8),
                    rx: cellSize < 18 ? 1 : 3
                  }),
                  showSums && React.createElement("text", {
                    x: pad + (ci - 0.5) * cellSize,
                    y: pad + (ri - 0.5) * cellSize + 4,
                    textAnchor: 'middle',
                    fontSize: cellSize <= 22 ? 10 : 12,
                    fontWeight: 700,
                    fill: isHighlight ? '#fff' : '#1e293b'
                  }, sum)
                ));
              }
            }
            return React.createElement("div", { className: 'mb-3 rounded-xl p-3', style: { background: isDark || isContrast ? 'rgba(185,28,28,0.08)' : '#fff', border: '2px solid ' + (isDark || isContrast ? 'rgba(185,28,28,0.3)' : '#fecaca') } },
              React.createElement("p", { className: 'text-[11px] font-bold mb-1', style: { color: isDark || isContrast ? '#fca5a5' : '#991b1b' } },
                '🎯 Sample space — all ' + (sides * sides).toLocaleString() + ' (d1, d2) pairs, colored by sum'
              ),
              React.createElement("p", { className: 'text-[10px] italic mb-2', style: { color: isDark || isContrast ? '#fca5a5' : '#7f1d1d' } },
                'The diagonals from top-right to bottom-left are constant sums. The longest diagonal (sum = ' + midSum + ') has ' + sides + ' cells — that is why ' + midSum + ' is the most common. Sum = 2 and sum = ' + (2 * sides) + ' each have only 1 cell.'
                + (showSums ? '' : ' At ' + (sides * sides).toLocaleString() + ' cells the sums no longer fit inside them, so colour alone carries the sum here — warm centre band, cool corners.')
              ),
              React.createElement("div", { className: 'flex justify-center overflow-x-auto' },
                React.createElement("svg", { width: svgW, height: svgH, viewBox: '0 0 ' + svgW + ' ' + svgH, 'aria-label': sides + ' by ' + sides + ' sample space grid for two-dice sums' },
                  topLabels, leftLabels, rows
                )
              ),
              lastSum != null && React.createElement("p", { className: 'text-[10px] mt-1 text-center font-bold', style: { color: isDark || isContrast ? '#fca5a5' : '#991b1b' } },
                'Last roll = ' + lastSum + '. Highlighted cells: all the (d1, d2) pairs that produce that sum.'
              )
            );
          };



          // Spinner SVG

          var spinnerSvg = function (result, tick) {

            var colors = { Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308' };

            var keys = ['Red', 'Blue', 'Green', 'Yellow'];

            var size = 100; var r = 42;

            var arrowAngle = result ? (keys.indexOf(result) * 90 + 45) : 0;

            return React.createElement("svg", { role: "img", 'aria-label': result ? 'Spinner showing ' + result : 'Four-color spinner ready', viewBox: "0 0 " + size + " " + size, width: size, height: size },

              keys.map(function (k, i) {

                var startA = (i * 90 - 90) * Math.PI / 180;

                var endA = ((i + 1) * 90 - 90) * Math.PI / 180;

                var x1 = 50 + r * Math.cos(startA), y1 = 50 + r * Math.sin(startA);

                var x2 = 50 + r * Math.cos(endA), y2 = 50 + r * Math.sin(endA);

                return React.createElement("path", { key: k, d: "M 50 50 L " + x1 + " " + y1 + " A " + r + " " + r + " 0 0 1 " + x2 + " " + y2 + " Z", fill: colors[k], stroke: 'white', strokeWidth: 1.5, opacity: result === k ? 1 : 0.6 });

              }),

              React.createElement("g", { transform: "rotate(" + arrowAngle + ", 50, 50)" },

                React.createElement("polygon", { points: "50,12 47,50 53,50", fill: "#1e293b", stroke: "white", strokeWidth: 1 })

              ),

              React.createElement("circle", { cx: 50, cy: 50, r: 6, fill: "#1e293b", stroke: "white", strokeWidth: 1.5 })

            );

          };



          // Coin SVG

          var coinSvg = function (result) {

            var isH = result === 'H';

            return React.createElement("svg", { role: "img", 'aria-label': 'Coin showing ' + (isH ? 'heads' : 'tails'), viewBox: "0 0 80 80", width: 80, height: 80 },

              React.createElement("circle", { cx: 40, cy: 40, r: 36, fill: isH ? '#fbbf24' : '#94a3b8', stroke: isH ? '#92400e' : '#94a3b8', strokeWidth: 3 }),

              React.createElement("text", { x: 40, y: 46, textAnchor: "middle", style: { fontSize: '22px', fontWeight: 'bold' }, fill: isH ? '#92400e' : '#f8fafc' }, isH ? 'H' : 'T'),

              isH && React.createElement("text", { x: 40, y: 26, textAnchor: "middle", style: { fontSize: '10px' }, fill: '#92400e' }, '\uD83E\uDE99')

            );

          };



          // Sports result visual

          var sportVisual = function (result) {

            var idx = activeSport.outcomes.indexOf(result);

            var emoji = idx >= 0 ? activeSport.emoji[idx] : '\u2753';

            var color = idx >= 0 ? activeSport.colors[idx] : '#94a3b8';

            return React.createElement("div", { className: "flex flex-col items-center gap-1" },

              React.createElement("span", { style: { fontSize: '48px', filter: idx === 0 ? 'none' : 'grayscale(50%)' } }, emoji),

              React.createElement("span", { className: "text-xs font-bold", style: { color: color } }, result || '?')

            );

          };



          // â”€â”€ Dark mode / high-contrast theme variables â”€â”€

          var _bg = isDark || isContrast ? '#1e1b4b' : '#fff';

          var _text = isDark || isContrast ? '#e0e7ff' : '#1e293b';

          var _card = isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)';

          var _border = isDark || isContrast ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.15)';

          var _accent = isDark || isContrast ? '#c4b5fd' : '#7c3aed';

          var _muted = isDark || isContrast ? '#94a3b8' : '#475569';

          var _btnBg = isDark || isContrast ? '#7c3aed' : '#6d28d9';

          var _btnText = '#fff';

          var _cardBg = isDark || isContrast ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,1)';

          var _statBg = isDark || isContrast ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.04)';



          // ── Mode-tinted atmospheric background (matches the hero-band accent) ──
          var MODE_ACCENT = {
            coin: 'rgba(148,163,184,0.10)', dice: 'rgba(220,38,38,0.10)', dice2: 'rgba(185,28,28,0.10)', spinner: 'rgba(147,51,234,0.10)',
            sports: 'rgba(8,145,178,0.10)', marbleBag: 'rgba(14,165,233,0.10)', custom: 'rgba(217,119,6,0.10)',
            tree: 'rgba(22,163,74,0.10)', pi: 'rgba(234,88,12,0.10)', birthday: 'rgba(236,72,153,0.10)',
            monty: 'rgba(99,102,241,0.10)', galton: 'rgba(15,118,110,0.10)'
          };
          var modeAccent = MODE_ACCENT[d.mode] || MODE_ACCENT.coin;
          // Own the ground in dark/contrast (2026-08-23): undefined meant
          // 'trust the host', and the host renders tools on a white card even in
          // dark theme - 61 dark-ink-on-light-mud violations. Same class as
          // nuclearlab/renewables/dna.
          var outerBg = isContrast ? '#000000' : isDark ? '#0f172a' :
            'radial-gradient(ellipse 80% 45% at 50% -10%, ' + modeAccent + ' 0%, ' + modeAccent.replace('0.10', '0.04') + ' 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)';

          var resetTrials = function() {
            if (_autoRun.interval) { clearInterval(_autoRun.interval); _autoRun.interval = null; }
            setLabToolData(function(prev) {
              var current = prev.probability || {};
              return Object.assign({}, prev, { probability: Object.assign({}, current, probabilityResetPatch()) });
            });
            var live = document.getElementById('allo-live-probability');
            if (live) live.textContent = 'Probability trials reset. Automatic simulation stopped.';
          };

          var selectMode = function(m) {
            if (_autoRun.interval) { clearInterval(_autoRun.interval); _autoRun.interval = null; }
            if (_galtonAnim.interval) { clearInterval(_galtonAnim.interval); _galtonAnim.interval = null; }
            if (_piAnim.interval) { clearInterval(_piAnim.interval); _piAnim.interval = null; }
            upd('mode', m);
            upd('results', []);
            upd('trials', 0);
            upd('convergenceHistory', []);
            upd('lastResult', null);
            upd('_mbRemaining', null);
            upd('_piPoints', null);
            upd('_piTotal', 0);
            upd('_piInside', 0);
            upd('_autoRunning', false);
            upd('galtonFalling', []);
          };

          var renderCommandDeck = function() {
            var completedChallenges = (d._completedChallenges || []).length;
            var usedTypes = Object.keys(d.experimentsUsed || {}).length;
            var resultCount = (d.results || []).length;
            var trialReadyModes = ['coin', 'dice', 'dice2', 'spinner', 'sports', 'marbleBag', 'custom', 'pi'];
            var quickTrialsSupported = trialReadyModes.indexOf(d.mode) >= 0;
            var canRunQuickTrials = quickTrialsSupported && customCanRun;
            var routeMeta = {
              coin: { label: 'Coin', icon: '\uD83E\uDE99', color: '#475569', desc: 'Begin with a clean 50/50 event.' },
              dice: { label: 'Dice', icon: '\uD83C\uDFB2', color: '#b91c1c', desc: 'Compare faces, denominators, and fairness.' },
              dice2: { label: 'Two-Dice Sum', icon: '\uD83C\uDFB2', color: '#991b1b', desc: 'See why middle sums happen more often.' },
              spinner: { label: 'Spinner', icon: '\uD83C\uDFA1', color: '#7e22ce', desc: 'See equal-area outcomes.' },
              sports: { label: 'Sports', icon: '\uD83C\uDFC6', color: '#0e7490', desc: 'Model weighted real-world chances.' },
              marbleBag: { label: 'Marble Bag', icon: '\uD83C\uDFB1', color: '#0369a1', desc: 'Explore replacement and changing odds.' },
              custom: { label: 'Custom', icon: '\u2699', color: '#b45309', desc: 'Design your own distribution.' },
              tree: { label: 'Tree', icon: '\uD83C\uDF33', color: '#15803d', desc: 'Multiply branches for compound probability.' },
              pi: { label: 'Monte Carlo', icon: '\uD83E\uDD67', color: '#c2410c', desc: 'Estimate pi through random sampling.' },
              birthday: { label: 'Birthday', icon: '\uD83C\uDF82', color: '#be185d', desc: 'Track how pair counts change intuition.' },
              monty: { label: 'Monty Hall', icon: '\uD83D\uDEAA', color: '#4338ca', desc: 'Test a famous counterintuitive strategy.' },
              galton: { label: 'Galton Board', icon: '\u2699', color: '#0f766e', desc: 'Watch randomness settle into a curve.' },
              volume3d: { label: '3D Volume', icon: '\ud83e\uddca', color: '#0369a1', desc: 'Measure a solid by throwing darts at it.' }
            };
            var currentRoute = routeMeta[d.mode] || routeMeta.coin;
            var stats = [
              { label: t('stem.probability.dashboard_trials', 'Trials'), value: String(d.trials || 0), hint: t('stem.probability.dashboard_trials_hint', 'current run') },
              { label: t('stem.probability.dashboard_modes', 'Modes tried'), value: usedTypes + '/3', hint: t('stem.probability.dashboard_modes_hint', 'quest progress') },
              { label: t('stem.probability.dashboard_challenges', 'Challenges'), value: completedChallenges + '/' + PROBABILITY_CHALLENGE_TOTAL, hint: t('stem.probability.dashboard_challenges_hint', 'claimed') },
              { label: t('stem.probability.dashboard_result', 'Latest'), value: d.lastResult != null ? String(d.lastResult) : '-', hint: t('stem.probability.dashboard_result_hint', 'last result') }
            ];
            var routes = [
              { title: t('stem.probability.route_foundations', 'Foundations'), modes: ['coin', 'dice', 'dice2', 'spinner'], action: 'coin', note: t('stem.probability.route_foundations_note', 'Equally likely outcomes and sample spaces.') },
              { title: t('stem.probability.route_weighted', 'Weighted Odds'), modes: ['sports', 'marbleBag', 'custom'], action: 'sports', note: t('stem.probability.route_weighted_note', 'Uneven chances, bags, and real-world rates.') },
              { title: t('stem.probability.route_surprises', 'Probability Surprises'), modes: ['monty', 'birthday', 'galton'], action: 'monty', note: t('stem.probability.route_surprises_note', 'Simulations that challenge intuition.') },
              // volume3d belongs here, not in its own row: it is the same dart-throwing
              // idea as pi, one dimension up. Without an entry the route card also fails
              // to light up when a student is standing in the 3D mode.
              { title: t('stem.probability.route_monte_carlo', 'Monte Carlo'), modes: ['pi', 'volume3d', 'tree'], action: 'pi', note: t('stem.probability.route_monte_carlo_note', 'Random sampling, volumes, and compound events.') }
            ];
            return React.createElement("section", {
              'data-probability-command': 'true',
              'aria-labelledby': 'probability-command-title',
              className: "mb-4",
              style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px', padding: '16px', borderRadius: 14, border: '1px solid ' + (isDark || isContrast ? 'rgba(196,181,253,0.34)' : '#ddd6fe'), background: isDark || isContrast ? 'linear-gradient(135deg, #1e1b4b 0%, #111827 54%, #164e63 100%)' : 'linear-gradient(135deg, #f5f3ff 0%, #ffffff 54%, #ecfeff 100%)', boxShadow: isDark || isContrast ? 'inset 0 0 34px rgba(139,92,246,0.10)' : '0 12px 28px rgba(88,28,135,0.08)' }
            },
              React.createElement("div", { style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' } },
                React.createElement("div", { style: { color: isDark || isContrast ? '#c4b5fd' : '#5b21b6', fontSize: 11, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' } }, t('stem.probability.command_eyebrow', 'Chance Lab')),
                React.createElement("h2", { id: 'probability-command-title', style: { margin: 0, color: isDark || isContrast ? '#f8fafc' : '#111827', fontSize: 'clamp(22px, 4vw, 32px)', lineHeight: 1.08, fontWeight: 900 } }, t('stem.probability.command_title', 'Run experiments, then compare the pattern')),
                React.createElement("p", { style: { margin: 0, color: isDark || isContrast ? '#ddd6fe' : '#334155', fontSize: 13, lineHeight: 1.55, maxWidth: '62ch' } }, t('stem.probability.command_copy', 'Pick a probability model, run trials, and watch the observed results move toward the expected distribution.')),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(102px, 1fr))', gap: 8 } }, stats.map(function(stat) {
                  return React.createElement("div", { key: stat.label, style: { padding: '9px 10px', borderRadius: 10, background: isDark || isContrast ? 'rgba(15,23,42,0.68)' : 'rgba(255,255,255,0.78)', border: '1px solid ' + (isDark || isContrast ? 'rgba(148,163,184,0.22)' : '#e9d5ff') } },
                    React.createElement("div", { style: { color: isDark || isContrast ? '#e9d5ff' : '#5b21b6', fontSize: 17, fontWeight: 900 } }, stat.value),
                    React.createElement("div", { style: { marginTop: 2, color: isDark || isContrast ? '#cbd5e1' : '#475569', fontSize: 11, fontWeight: 800 } }, stat.label),
                    React.createElement("div", { style: { marginTop: 1, color: isDark || isContrast ? '#94a3b8' : '#475569', fontSize: 10 } }, stat.hint)
                  );
                })),
                React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                  React.createElement("button", { disabled: quickTrialsSupported && !customCanRun, onClick: canRunQuickTrials ? function() { runTrial(10); } : function() { if (!quickTrialsSupported) selectMode('coin'); }, className: "px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed", style: { background: '#5b21b6', color: '#fff', border: '1px solid #4c1d95', boxShadow: '0 8px 18px rgba(91,33,182,0.22)' } }, canRunQuickTrials ? t('stem.probability.run_10_trials', 'Run 10 Trials') : quickTrialsSupported ? 'Fix Custom Model' : t('stem.probability.start_with_coin', 'Start With Coin')),
                  React.createElement("button", { onClick: function() { selectMode('monty'); }, className: "px-4 py-2 rounded-lg text-sm font-bold transition-all", style: { background: isDark || isContrast ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.82)', color: isDark || isContrast ? '#e0e7ff' : '#4338ca', border: '1px solid ' + (isDark || isContrast ? 'rgba(196,181,253,0.28)' : '#c7d2fe') } }, t('stem.probability.try_a_paradox', 'Try a Paradox'))
                )
              ),
              React.createElement("div", { style: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement("div", { style: { padding: 12, borderRadius: 12, background: isDark || isContrast ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.82)', border: '1px solid ' + (isDark || isContrast ? 'rgba(148,163,184,0.22)' : '#dbeafe') } },
                  React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                    React.createElement("span", { style: { fontSize: 26 }, 'aria-hidden': 'true' }, currentRoute.icon),
                    React.createElement("div", null,
                      React.createElement("div", { style: { color: currentRoute.color, fontSize: 12, fontWeight: 900 } }, currentRoute.label),
                      React.createElement("div", { style: { color: isDark || isContrast ? '#cbd5e1' : '#475569', fontSize: 11, lineHeight: 1.35 } }, currentRoute.desc)
                    )
                  ),
                  React.createElement("svg", { viewBox: "0 0 320 150", width: "100%", height: "auto", role: "img", 'aria-label': t('stem.probability.command_visual_label', 'Probability bars showing observed results settling toward expected values'), style: { display: 'block', maxHeight: 170 } },
                    React.createElement("rect", { x: 0, y: 0, width: 320, height: 150, rx: 18, fill: isDark || isContrast ? '#172554' : '#eef2ff' }),
                    [48, 96, 144, 192, 240].map(function(x, idx) {
                      var hgt = resultCount > 0 ? [72, 98, 58, 84, 66][idx] : [46, 68, 92, 62, 78][idx];
                      return React.createElement("g", { key: 'prob-bar-' + idx },
                        React.createElement("rect", { x: x, y: 118 - hgt, width: 26, height: hgt, rx: 8, fill: idx % 2 ? '#14b8a6' : '#7c3aed', opacity: 0.88 }),
                        React.createElement("circle", { cx: x + 13, cy: 118 - hgt, r: 4, fill: '#fbbf24' })
                      );
                    }),
                    React.createElement("line", { x1: 32, y1: 118, x2: 288, y2: 118, stroke: isDark || isContrast ? "rgba(255,255,255,0.42)" : "rgba(15,23,42,0.22)", strokeWidth: 2 }),
                    React.createElement("path", { d: "M44 82 C88 42, 132 96, 176 64 S250 52, 282 82", fill: "none", stroke: "#fbbf24", strokeWidth: 4, strokeLinecap: "round", strokeDasharray: "8 8" }),
                    React.createElement("text", { x: 28, y: 28, fill: isDark || isContrast ? "#f8fafc" : "#1e1b4b", fontSize: 13, fontWeight: 900 }, t('stem.probability.observed_vs_expected', 'Observed vs. expected'))
                  )
                ),
                React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))', gap: 8 } }, routes.map(function(route) {
                  var active = route.modes.indexOf(d.mode) >= 0;
                  return React.createElement("button", { key: route.title, onClick: function() { selectMode(route.action); }, className: "text-left rounded-lg transition-all", style: { padding: 10, border: '1px solid ' + (active ? '#7c3aed' : (isDark || isContrast ? 'rgba(148,163,184,0.22)' : '#e2e8f0')), background: active ? (isDark || isContrast ? 'rgba(124,58,237,0.24)' : '#f5f3ff') : (isDark || isContrast ? 'rgba(15,23,42,0.56)' : 'rgba(255,255,255,0.72)'), color: isDark || isContrast ? '#f8fafc' : '#1e293b' } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 900, color: active ? (isDark || isContrast ? '#ddd6fe' : '#5b21b6') : (isDark || isContrast ? '#e2e8f0' : '#334155') } }, route.title),
                    React.createElement("div", { style: { marginTop: 3, fontSize: 10, lineHeight: 1.35, color: isDark || isContrast ? '#cbd5e1' : '#475569' } }, route.note)
                  );
                }))
              )
            );
          };

          return React.createElement("div", {
            className: "max-w-3xl mx-auto animate-in fade-in duration-200",
            style: {
              // This tool can be mounted as a flex child. Without an explicit
              // width and min-width:0, its max-content width (not the host slot)
              // won, so a 360px phone panel expanded to ~419px and clipped the
              // right edge. Own the flex sizing while preserving max-w-3xl.
              width: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              color: _text,
              background: outerBg,
              borderRadius: outerBg ? 16 : undefined,
              padding: outerBg ? 10 : undefined
            }
          },

            React.createElement("style", null, t('stem.probability.keyframes_coinflip_0_transform_scalex_', '@keyframes coinFlip{0%{transform:scaleX(1)}25%{transform:scaleX(0.05) translateY(-10px)}60%{transform:scaleX(1.08) translateY(-4px)}100%{transform:scaleX(1) translateY(0)}} @keyframes diceRoll{0%{transform:rotate(0deg)scale(1)}25%{transform:rotate(-24deg)scale(1.12)}55%{transform:rotate(19deg)scale(1.08)}80%{transform:rotate(-8deg)scale(1.04)}100%{transform:rotate(0deg)scale(1)}} @keyframes resultPop{0%{transform:scale(0.78);opacity:0.35}55%{transform:scale(1.09);opacity:1}100%{transform:scale(1);opacity:1}} @keyframes sportBounce{0%{transform:translateY(0)scale(1)}40%{transform:translateY(-20px)scale(1.12)}70%{transform:translateY(-6px)scale(1.06)}100%{transform:translateY(0)scale(1)}}')),

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 rounded-lg transition-colors", style: { color: _muted }, 'aria-label': t('stem.probability.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),

              React.createElement("h3", { className: "text-lg font-bold", style: { color: _text } }, t('stem.probability.probability_lab', "\uD83C\uDFB2 Probability Lab")),

              d.trials > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 text-xs font-bold rounded-full", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)', color: _accent } }, d.trials + " trials"),

              (d._bestStreak || 0) >= 3 && React.createElement("span", { className: "ml-1 px-2 py-0.5 text-xs font-bold rounded-full", style: { background: isDark || isContrast ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)', color: '#ef4444' } }, '🔥 Best: ' + (d._bestStreak || 0)),

              // Mute toggle (wraps probTone at the source via window._probabilityMuted)
              React.createElement("button", {
                onClick: function() {
                  var next = !d.muted;
                  upd('muted', next);
                  window._probabilityMuted = next;
                  if (!next) { setTimeout(function() { probTone(660, 0.08, 'sine', 0.06); }, 0); }
                  if (typeof announceToSR === 'function') announceToSR(next ? 'Sound muted' : 'Sound on');
                },
                'aria-label': d.muted ? 'Unmute sound effects' : 'Mute sound effects',
                'aria-pressed': !!d.muted,
                title: d.muted ? 'Unmute (sounds are off)' : 'Mute (sounds are on)',
                className: 'ml-auto p-1 rounded-md text-base hover:bg-slate-100 transition-colors',
                style: { color: d.muted ? '#94a3b8' : (_accent || '#7c3aed') }
              }, d.muted ? '🔇' : '🔊')

            ),

            React.createElement("p", { className: "text-xs italic -mt-1 mb-3", style: { color: _muted } }, t('stem.probability.explore_probability_through_experiment', "Explore probability through experiments. Run trials and watch observed frequencies converge to expected values.")),

            renderCommandDeck(),

            // Mode selector

            React.createElement("div", { className: "flex flex-wrap gap-2 mb-3", role: "group", "aria-label": "Probability experiment mode" },

              [['coin', '\uD83E\uDE99 Coin'], ['dice', '\uD83C\uDFB2 Dice'], ['dice2', '\uD83C\uDFB2\u00D72 Two-Dice Sum'], ['spinner', '\uD83C\uDFA1 Spinner'], ['sports', '\uD83C\uDFC6 Sports'], ['marbleBag', '\uD83C\uDFB1 Marble Bag'], ['custom', '\u2699\uFE0F Custom'], ['tree', '\uD83C\uDF33 Tree'], ['pi', '\uD83E\uDD67 Pi'], ['birthday', '\uD83C\uDF82 Birthday'], ['monty', '\uD83D\uDEAA Monty Hall'], ['galton', '\u2699\uFE0F Galton Board'], ['volume3d', '\uD83E\uDDCA 3D Volume']].map(([m, label]) =>

                React.createElement("button", { "aria-label": "Select mode: " + label, "aria-pressed": d.mode === m, key: m, onClick: function() { selectMode(m); }, className: "px-4 py-2 rounded-lg text-sm font-bold transition-all", style: { background: d.mode === m ? _btnBg : (isDark || isContrast ? 'rgba(139,92,246,0.1)' : '#f1f5f9'), color: d.mode === m ? _btnText : (isDark || isContrast ? '#c4b5fd' : '#475569'), boxShadow: d.mode === m ? '0 4px 6px -1px rgba(139,92,246,0.3)' : 'none' } }, label)

              )

            ),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                coin:      { accent: '#94a3b8', soft: 'rgba(148,163,184,0.10)', icon: '\uD83E\uDE99', title: t('stem.probability.coin_the_simplest_50_50', 'Coin \u2014 the simplest 50/50'),                  hint: t('stem.probability.p_h_p_t_0_5_law_of_large_numbers_as_tr', 'P(H) = P(T) = 0.5. Law of large numbers: as trials grow, the proportion of heads converges to 0.5. After 1,000 flips you\u2019ll be within ~3% of 50%, but in any short streak anything is possible.') },
                dice:      { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',   icon: '\uD83C\uDFB2', title: t('stem.probability.dice_uniform_1_n_each_d4_d6_d8_d10_d12', 'Dice \u2014 uniform 1/N each (d4 / d6 / d8 / d10 / d12 / d20)'), hint: t('stem.probability.pick_any_die_size_each_face_equally_li', 'Pick any die size. Each face equally likely: P = 1/N. The math is identical across die types \u2014 what changes is the denominator. d4 is 1/4, d20 is 1/20.') },
                dice2:     { accent: '#b91c1c', soft: 'rgba(185,28,28,0.10)',   icon: '\uD83C\uDFB2', title: t('stem.probability.two_dice_sum_the_triangular_distributi', 'Two-Dice Sum \u2014 the triangular distribution'),     // Key deliberately renamed. The old copy justified Monopoly's orange
                           // properties by citing the three most frequent sums — but a 7 past
                           // Jail lands on Community Chest, not orange. Orange sits at +6, +8
                           // and +9. Renaming forces the 57 translated packs to fall back to
                           // correct English rather than keep serving the wrong reason.
                           hint: t('stem.probability.roll_two_dice_sum_monopoly_orange_39', 'Roll TWO dice of the chosen type and add. The sum is no longer uniform: middle sums are MUCH more common. For 2d6, P(7)=6/36, P(2)=1/36. It is why Monopoly\u2019s orange properties get landed on more than any other colour group: they sit 6, 8 and 9 steps past Jail, and those three sums come up 14 times in 36 \u2014 so a player leaving Jail hits orange nearly 39% of the time.') },
                spinner:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)',  icon: '\uD83C\uDFA1', title: t('stem.probability.spinner_4_color_uniform', 'Spinner \u2014 4-color uniform'),                    hint: t('stem.probability.equal_area_sectors_equal_probability_u', 'Equal-area sectors = equal probability. Unequal sectors → weighted draws. Spinners are the gentlest path into discrete distributions for elementary students.') },
                sports:    { accent: '#0e7490', soft: 'rgba(8,145,178,0.10)',   icon: '\uD83C\uDFC6', title: t('stem.probability.sports_weighted_real_world_odds', 'Sports \u2014 weighted real-world odds'),             hint: t('stem.probability.free_throw_77_nba_3_point_36_mlb_hit_2', 'Free-throw 77%, NBA 3-point 36%, MLB hit ~25%. Probability isn\u2019t always 50/50 \u2014 the math handles unequal weights the same way, just with different denominators.') },
                marbleBag: { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)',  icon: '\uD83C\uDFB1', title: t('stem.probability.marble_bag_with_vs_without_replacement', 'Marble Bag \u2014 with vs without replacement'),     hint: t('stem.probability.with_replacement_independent_draws_wit', 'With replacement: independent draws. Without: probabilities CHANGE each pull \u2014 conditional probability. The exact mechanism behind hypergeometric distribution and card-game odds.') },
                custom:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',   icon: '\u2699',         title: t('stem.probability.custom_design_your_own_outcome_set', 'Custom \u2014 design your own outcome set'),         hint: t('stem.probability.build_any_discrete_distribution_test_t', 'Build any discrete distribution. Test the law of large numbers with skewed odds, demonstrate that simulations can answer ANY closed-form question if you have enough trials. Monte Carlo in miniature.') },
                tree:      { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',   icon: '\uD83C\uDF33', title: t('stem.probability.tree_multi_stage_probability', 'Tree \u2014 multi-stage probability'),                 hint: t('stem.probability.multiply_along_branches_add_across_lea', 'Multiply along branches; add across leaves. Two coin flips: HH HT TH TT each 0.25. Tree diagrams scale up to medical-test base-rate problems and Bayes\u2019 theorem.') },
                pi:        { accent: '#ea580c', soft: 'rgba(234,88,12,0.10)',   icon: '\uD83E\uDD67', title: t('stem.probability.pi_monte_carlo_estimation', 'Pi \u2014 Monte Carlo \u03c0 estimation'),            hint: t('stem.probability.throw_darts_at_a_unit_square_count_how', 'Throw darts at a unit square; count how many land inside the inscribed quarter circle. \u03c0 \u2248 4 \u00d7 (inside / total). Convergence is O(1/\u221AN) \u2014 each digit costs 100\u00d7 more darts.') },
                birthday:  { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)',  icon: '\uD83C\uDF82', title: t('stem.probability.birthday_the_famous_paradox', 'Birthday \u2014 the famous paradox'),                  hint: t('stem.probability.in_a_room_of_23_the_probability_of_a_s', 'In a room of 23, the probability of a shared birthday is > 50%. By 70 it\u2019s > 99.9%. Counterintuitive because we count comparisons (23 choose 2 = 253), not people. The cleanest classroom counter to gut-feel probability.') }
              };
              var meta = MODE_META[d.mode] || MODE_META.coin;
              return React.createElement('div', {
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
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // â”€â”€ Marble Bag mode config â”€â”€

            // ── Dice-type selector (d4 / d6 / d8 / d10 / d12 / d20) ──
            // Appears in single-die or two-dice-sum modes. Each die-type gets its
            // own color (matches the SVG fill in diceFace) so students see at a
            // glance how the "denominator" of the probability changes: P=1/4 for
            // d4, P=1/20 for d20, etc. Same uniform-distribution math, different N.
            (d.mode === 'dice' || d.mode === 'dice2') && React.createElement("div", {
              className: 'mb-3 rounded-xl p-3',
              style: { background: isDark || isContrast ? 'rgba(220,38,38,0.08)' : 'linear-gradient(135deg, #fef2f2, #fef9e7)', border: '2px solid ' + (isDark || isContrast ? 'rgba(220,38,38,0.3)' : '#fecaca') }
            },
              React.createElement("p", { className: 'text-[11px] font-bold mb-2', style: { color: isDark || isContrast ? '#fca5a5' : '#991b1b' } },
                '🎲 Die type — P(any face) = 1/' + diceSides + (d.mode === 'dice2' ? ', summed over 2 dice' : '')
              ),
              React.createElement("div", { className: 'flex flex-wrap gap-1.5' },
                DICE_TYPES.map(function(sides) {
                  var active = diceSides === sides;
                  var dieColor = (DIE_SHAPES[sides] || {}).fill || '#888';
                  return React.createElement("button", {
                    key: 'dt-' + sides,
                    onClick: function() {
                      sfxProbClick();
                      upd('diceSides', sides);
                      upd('results', []); upd('trials', 0);
                      upd('convergenceHistory', []); upd('lastResult', null); upd('_lastPair', null);
                    },
                    'aria-pressed': active,
                    'aria-label': 'd' + sides + ', P equals one over ' + sides,
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2',
                    style: active
                      ? { background: dieColor, color: '#fff', borderColor: dieColor, boxShadow: '0 2px 4px ' + dieColor + '55' }
                      : { background: '#fff', color: dieColor, borderColor: dieColor + '88' }
                  },
                    'd' + sides + ' · 1/' + sides
                  );
                })
              ),
              React.createElement("p", { className: 'text-[10px] italic mt-2', style: { color: isDark || isContrast ? '#fca5a5' : '#7f1d1d' } },
                d.mode === 'dice2'
                  ? 'Two dice of the same type, summed. Sum range: 2 to ' + (2 * diceSides) + '. The most-common sum is always the middle (' + (diceSides + 1) + '). 2 and ' + (2 * diceSides) + ' tie for least common. This is the foundation of every 2-dice board game.'
                  : 'All faces equally likely. The "denominator" of probability changes with die type, but the uniform-distribution math is identical.'
              )
            ),

            // ── Sample-space grid for two-dice sum (only when small enough to read) ──
            d.mode === 'dice2' && renderTwoDiceGrid(diceSides, d.lastResult),

            d.mode === 'marbleBag' && React.createElement("div", { className: "mb-4 rounded-xl p-4", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'linear-gradient(135deg, #fdf4ff, #faf5ff, #f5f3ff)', border: '2px solid ' + (isDark || isContrast ? 'rgba(168,85,247,0.3)' : '#c4b5fd') } },

              React.createElement("div", { className: "flex items-center justify-between mb-3" },

                React.createElement("p", { className: "text-sm font-black", style: { color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, t('stem.probability.marble_bag_setup', "\uD83C\uDFB1 Marble Bag Setup")),

                // Without-replacement toggle

                React.createElement("label", { className: "flex items-center gap-2 cursor-pointer select-none" },

                  React.createElement("span", { className: "text-[11px] font-bold", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } }, d.mbWithoutReplacement ? '\uD83D\uDD04 Without Replacement' : '\u267B\uFE0F With Replacement'),

                  React.createElement("div", { 

                    role: "switch",
                    "aria-checked": !!d.mbWithoutReplacement,
                    "aria-label": "With or without replacement (currently " + (d.mbWithoutReplacement ? "without" : "with") + " replacement)",
                    tabIndex: 0,
                    // This is announced as a switch and is focusable, so it must
                    // answer the keys a switch answers. It had onClick only, so a
                    // keyboard user could focus it, hear "switch, not checked",
                    // press Space, and watch nothing happen. Both paths call the
                    // same toggle so they cannot drift apart.
                    onClick: function () { mbToggleReplacement(); },
                    onKeyDown: function (e) {
                      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); mbToggleReplacement(); }
                    },
                   

                    className: "relative w-10 h-5 rounded-full transition-colors cursor-pointer",

                    style: { background: d.mbWithoutReplacement ? '#7c3aed' : '#cbd5e1' }

                  },

                    React.createElement("div", { className: "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform", style: { left: d.mbWithoutReplacement ? '22px' : '2px' } })

                  )

                )

              ),

              d.mbWithoutReplacement && (function() {
                var nextOdds = probabilityMarbleOdds(customOutcomes, d._mbRemaining);
                var oddsText = nextOdds.outcomes.map(function(o) {
                  return o.label + ' ' + o.count + '/' + nextOdds.total + ' (' + (o.probability * 100).toFixed(1) + '%)';
                }).join(', ');
                return React.createElement("div", {
                  className: "mb-3 px-3 py-2 rounded-lg text-[11px] font-bold",
                  role: 'status', 'aria-live': 'polite',
                  style: { background: 'rgba(139,92,246,0.1)', color: isDark || isContrast ? '#c4b5fd' : '#6d28d9', border: '1px dashed rgba(139,92,246,0.3)' }
                },
                  React.createElement('div', null, t('stem.probability.without_replacement_each_marble_drawn_', "\uD83D\uDCA1 Without replacement: Each marble drawn is removed from the bag. Probabilities change after each draw! Bag refills when empty.")),
                  React.createElement('div', { className: 'mt-1' },
                    (nextOdds.refillNext ? 'Bag empty; refilling before the next draw. ' : nextOdds.total + ' marbles remaining. '),
                    'Next draw odds: ' + oddsText
                  )
                );
              })(),

              // Marble color rows

              React.createElement("div", { className: "space-y-2 mb-3" },

                customOutcomes.map(function (o, i) {

                  var count = o.count || 1;

                  return React.createElement("div", { key: i, className: "flex items-center gap-2 rounded-lg p-2", style: { background: isDark || isContrast ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.15)' : '#e9d5ff') } },

                    React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded-full border-0 cursor-pointer flex-shrink-0", style: { borderRadius: '50%' } }),

                    React.createElement("input", { type: "text", value: o.label, placeholder: "Color " + (i + 1), 'aria-label': 'Name for color ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); setProbabilityOutcomes(co); }, className: "w-20 px-2 py-1 rounded-lg text-sm font-bold flex-shrink-0", style: { border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#ddd6fe'), background: isDark || isContrast ? 'rgba(255,255,255,0.05)' : '#fff', color: _text } }),

                    React.createElement("button", { "aria-label": "Decrease marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { if (count <= 1) return; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count - 1 }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded-full font-bold text-sm flex-shrink-0 flex items-center justify-center transition-all hover:scale-110", style: { background: '#fecaca', color: '#991b1b' } }, "\u2212"),

                    React.createElement("span", { className: "w-8 text-center text-sm font-black", style: { color: _text } }, count),

                    React.createElement("button", { "aria-label": "Increase marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count + 1 }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded-full font-bold text-sm flex-shrink-0 flex items-center justify-center transition-all hover:scale-110", style: { background: '#bbf7d0', color: '#14532d' } }, "+"),

                    React.createElement("span", { className: "ml-auto text-[11px] font-mono", style: { color: isDark || isContrast ? '#a5b4fc' : '#7c3aed' } }, count + '/' + customOutcomes.reduce(function (s, c) { return s + (c.count || 1); }, 0) + ' = ' + ((o.prob || 0) * 100).toFixed(1) + '%'),

                    customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove marble color " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); setProbabilityOutcomes(co); }, className: "text-sm font-bold px-1 flex-shrink-0 transition-colors", style: { color: '#f87171' } }, "\u2715")

                  );

                })

              ),

              customOutcomes.length < 8 && React.createElement("button", { "aria-label": t('stem.probability.add_color', "+ Add Color"), onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: ['Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal'][Math.min(customOutcomes.length - 2, 5)] || String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0, count: 3, color: ['#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e'][customOutcomes.length % 8] }]); setProbabilityOutcomes(co); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#ede9fe', color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, t('stem.probability.add_color_2', "+ Add Color")),

              // â”€â”€ SVG Bag Visualization â”€â”€

              !customModel.valid && React.createElement("div", { role: "alert", className: "mt-3 px-3 py-2 rounded-lg text-xs font-bold", style: { background: isDark || isContrast ? 'rgba(239,68,68,0.12)' : '#fef2f2', color: isDark || isContrast ? '#fecaca' : '#b91c1c', border: '1px solid rgba(239,68,68,0.35)' } }, "Marble model not ready: " + customModel.reason),

              React.createElement("div", { className: "mt-4 flex justify-center" },

                React.createElement("div", { style: { position: 'relative', display: 'inline-block', animation: d._mbShaking ? 'mbShake 0.5s ease-in-out' : 'none' } },

                  React.createElement("svg", { role: "img", 'aria-label': 'Marble bag containing ' + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + ' marbles across ' + customOutcomes.length + ' colors', viewBox: "0 0 180 200", width: 180, height: 200, style: { filter: 'drop-shadow(0 4px 12px rgba(139,92,246,0.2))' } },

                    // Bag body

                    React.createElement("path", { d: "M30 60 Q20 60 15 80 L10 170 Q10 195 40 195 L140 195 Q170 195 170 170 L165 80 Q160 60 150 60", fill: isDark || isContrast ? '#2d1b69' : '#ddd6fe', stroke: isDark || isContrast ? '#7c3aed' : '#a78bfa', strokeWidth: 2.5 }),

                    // Bag opening / drawstring

                    React.createElement("path", { d: "M30 60 Q55 45 90 45 Q125 45 150 60", fill: "none", stroke: isDark || isContrast ? '#a78bfa' : '#7c3aed', strokeWidth: 2, strokeDasharray: "4 3" }),

                    // Drawstring knot

                    React.createElement("ellipse", { cx: 90, cy: 48, rx: 8, ry: 5, fill: isDark || isContrast ? '#a78bfa' : '#7c3aed' }),

                    // Bag label

                    React.createElement("text", { x: 90, y: 32, textAnchor: "middle", style: { fontSize: '10px', fontWeight: 'bold', fill: isDark || isContrast ? '#c4b5fd' : '#6d28d9' } }, customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + ' marbles'),

                    // Marbles inside bag

                    (function () {

                      var allMarbles = []; customOutcomes.forEach(function (o) { for (var _mj = 0; _mj < Math.min(o.count || 1, 15); _mj++) allMarbles.push(o.color); });

                      // Deterministic positioning for marbles

                      var positions = [];

                      var cols = Math.ceil(Math.sqrt(allMarbles.length));

                      for (var _mk = 0; _mk < Math.min(allMarbles.length, 50); _mk++) {

                        var row = Math.floor(_mk / cols), col = _mk % cols;

                        var px = 40 + col * 20 + (row % 2 ? 10 : 0) + (Math.sin(_mk * 7.3) * 4);

                        var py = 90 + row * 20 + (Math.cos(_mk * 5.1) * 3);

                        if (px > 150) px = 40 + (px % 110); if (py > 185) py = 90 + (py % 95);

                        positions.push({ x: px, y: py, color: allMarbles[_mk] });

                      }

                      return positions.map(function (p, idx) {

                        return React.createElement("g", { key: idx },

                          React.createElement("circle", { cx: p.x, cy: p.y, r: 8, fill: p.color, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 }),

                          React.createElement("circle", { cx: p.x - 2, cy: p.y - 2, r: 3, fill: 'rgba(255,255,255,0.4)' })

                        );

                      });

                    })()

                  ),

                  // CSS animation style

                  React.createElement("style", null, t('stem.probability.keyframes_mbshake_0_100_transform_rota', '@keyframes mbShake { 0%,100% { transform: rotate(0deg); } 15% { transform: rotate(-8deg); } 30% { transform: rotate(8deg); } 45% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } 75% { transform: rotate(-2deg); } }'))

                )

              )

            ),



            // â”€â”€ Sports scenario selector â”€â”€

            d.mode === 'sports' && React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: isDark || isContrast ? 'rgba(34,197,94,0.06)' : 'linear-gradient(to right, #ecfdf5, #f0f9ff)', border: '1px solid ' + (isDark || isContrast ? 'rgba(34,197,94,0.2)' : '#a7f3d0') } },

              React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-2" }, t('stem.probability.choose_a_sport', "\uD83C\uDFC6 Choose a Sport")),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                SPORTS.map(function (s) {

                  return React.createElement("button", { "aria-label": "Select sport scenario: " + s.label,

                    key: s.id,

                    onClick: function () { upd('sportType', s.id); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); },

                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.sportType || 'freethrow') === s.id ? 'bg-white shadow-md border-2 border-emerald-400 text-emerald-700' : 'bg-white/50 text-slate-600 hover:bg-white border border-slate-400')

                  }, s.icon + ' ' + s.label.replace(/^.*? /, ''));

                })

              ),

              React.createElement("p", { className: "text-xs text-slate-600 mt-2 italic" }, activeSport.desc + ' \u2014 P(' + activeSport.outcomes[0] + ') = ' + (activeSport.probs[0] * 100).toFixed(0) + '%')

            ),



            // â”€â”€ Custom mode config â”€â”€ (3 sub-modes: Fraction, Marble Bag, Slider)

            d.mode === 'custom' && React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: isDark || isContrast ? 'rgba(245,158,11,0.06)' : 'linear-gradient(to right, #fffbeb, #fff7ed)', border: '1px solid ' + (isDark || isContrast ? 'rgba(245,158,11,0.2)' : '#fcd34d') } },

              React.createElement("div", { className: "flex gap-1 mb-3 bg-amber-100/50 rounded-lg p-1" },

                [['fraction', '\uD83C\uDFAF Fraction'], ['marbleBag', '\uD83C\uDFB1 Marble Bag'], ['slider', '\uD83C\uDFA8 Slider']].map(function (pair) { var sm = pair[0], label = pair[1]; return React.createElement("button", { "aria-label": "Select " + label + " input mode", key: sm, onClick: function () { setCustomSubMode(sm); }, className: "flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all " + (customSubMode === sm ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/60 hover:text-amber-700') }, label); })

              ),



              // â”€â”€ FRACTION SUB-MODE â”€â”€

              customSubMode === 'fraction' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, t('stem.probability.define_each_event_as_a_fraction_e_g_1_', "\uD83C\uDFAF Define each event as a fraction \u2014 e.g., \"1 out of 20 times\"")),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    return React.createElement("div", { key: i, className: "flex flex-wrap items-center gap-2 bg-white/60 rounded-lg p-2" },

                      React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Event " + (i + 1), 'aria-label': 'Name for event ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); setProbabilityOutcomes(co); }, className: "w-20 px-2 py-1 rounded-lg border border-amber-600 text-sm font-bold flex-shrink-0" }),

                      React.createElement("input", { type: "number", min: 0, max: 999, value: o.numerator != null ? o.numerator : 1, 'aria-label': 'Numerator for event ' + (o.label || (i + 1)), onChange: function (e) { var num = Math.max(0, parseInt(e.target.value) || 0); var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { numerator: num, prob: (o.denominator || 20) > 0 ? num / (o.denominator || 20) : 0 }); setProbabilityOutcomes(co); }, className: "w-14 px-1 py-1 rounded-lg border border-amber-600 text-sm text-center font-mono" }),

                      React.createElement("span", { className: "text-xs font-bold text-amber-600 flex-shrink-0" }, t('stem.probability.out_of', "out of")),

                      React.createElement("input", { type: "number", min: 1, max: 10000, value: o.denominator != null ? o.denominator : 20, 'aria-label': 'Denominator for event ' + (o.label || (i + 1)), onChange: function (e) { var den = Math.max(1, parseInt(e.target.value) || 1); var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { denominator: den, prob: den > 0 ? (o.numerator != null ? o.numerator : 1) / den : 0 }); setProbabilityOutcomes(co); }, className: "w-14 px-1 py-1 rounded-lg border border-amber-600 text-sm text-center font-mono" }),

                      React.createElement("span", { className: "ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold " + (o.prob <= 0.1 ? 'bg-violet-100 text-violet-700' : o.prob <= 0.5 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700') }, (o.prob * 100).toFixed(1) + '%'),

                      customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove event " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); setProbabilityOutcomes(co); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1 flex-shrink-0" }, "\u2715")

                    );

                  })

                ),

                customOutcomes.length < 8 && React.createElement("button", { "aria-label": t('stem.probability.add_event', "+ Add Event"), onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0.05, count: 1, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); setProbabilityOutcomes(co); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, t('stem.probability.add_event_2', "+ Add Event")),

                React.createElement("p", { className: "text-[11px] mt-1.5 " + (customModel.valid ? 'text-emerald-500' : 'text-red-500') }, "Total: " + (customModel.total * 100).toFixed(1) + "%" + (customModel.valid ? ' - ready' : ' - must equal exactly 100%'))

              ),



              // â”€â”€ MARBLE BAG SUB-MODE â”€â”€

              customSubMode === 'marbleBag' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, t('stem.probability.add_colored_marbles_to_a_bag_probabili', "\uD83C\uDFB1 Add colored marbles to a bag. Probability = your marble count \u00F7 total marbles.")),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    var count = o.count || 1;

                    return React.createElement("div", { key: i, className: "flex items-center gap-2 bg-white/60 rounded-lg p-2" },

                      React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Color " + (i + 1), 'aria-label': 'Name for marble color ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); setProbabilityOutcomes(co); }, className: "w-20 px-2 py-1 rounded-lg border border-amber-600 text-sm font-bold flex-shrink-0" }),

                      React.createElement("button", { "aria-label": "Decrease marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { if (count <= 1) return; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count - 1 }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded-full bg-red-100 text-red-800 font-bold text-sm hover:bg-red-200 transition-colors flex-shrink-0 flex items-center justify-center" }, "\u2212"),

                      React.createElement("span", { className: "w-8 text-center text-sm font-black text-slate-700" }, count),

                      React.createElement("button", { "aria-label": "Increase marble count for " + (o.label || 'color ' + (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count + 1 }); setProbabilityOutcomes(co); }, className: "w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm hover:bg-emerald-200 transition-colors flex-shrink-0 flex items-center justify-center" }, "+"),

                      React.createElement("span", { className: "ml-1 text-[11px] font-mono text-amber-600" }, count + '/' + customOutcomes.reduce(function (s, c) { return s + (c.count || 1); }, 0) + ' = ' + (o.prob * 100).toFixed(1) + '%'),

                      customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove marble color " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); setProbabilityOutcomes(co); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1 flex-shrink-0" }, "\u2715")

                    );

                  })

                ),

                React.createElement("div", { className: "mt-3 bg-white/80 rounded-xl p-3 border border-amber-200" },

                  React.createElement("div", { className: "flex flex-wrap gap-1 justify-center" },

                    customOutcomes.reduce(function (acc, o) { for (var m = 0; m < Math.min(o.count || 1, 50); m++) acc.push({ color: o.color, label: o.label }); return acc; }, []).slice(0, 100).map(function (marble, idx) {

                      return React.createElement("div", { key: idx, style: { width: 14, height: 14, borderRadius: '50%', background: marble.color, border: '1px solid rgba(0,0,0,0.15)', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)' }, title: marble.label });

                    })

                  ),

                  customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) > 100 && React.createElement("p", { className: "text-[11px] text-slate-600 text-center mt-1" }, "(showing first 100 of " + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + " marbles)"),

                  React.createElement("p", { className: "text-xs text-center font-bold text-amber-700 mt-2" }, "\uD83C\uDFB1 " + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + " marbles in bag")

                ),

                customOutcomes.length < 8 && React.createElement("button", { "aria-label": t('stem.probability.add_color_3', "+ Add Color"), onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0, count: 1, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); setProbabilityOutcomes(co); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, t('stem.probability.add_color_4', "+ Add Color"))

              ),



              // â”€â”€ SLIDER SUB-MODE (original) â”€â”€

              customSubMode === 'slider' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, t('stem.probability.drag_sliders_to_set_exact_probability_', "\uD83C\uDFA8 Drag sliders to set exact probability percentages for each outcome.")),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    return React.createElement("div", { key: i, className: "flex flex-wrap items-center gap-2" },

                      React.createElement("input", { type: "color", value: o.color, 'aria-label': 'Color for outcome ' + (o.label || (i + 1)), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); setProbabilityOutcomes(co); }, className: "w-8 h-8 rounded border-0 cursor-pointer" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Outcome " + (i + 1), 'aria-label': 'Name for outcome ' + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); setProbabilityOutcomes(co); }, className: "min-w-0 flex-1 basis-32 px-2 py-1.5 rounded-lg border border-amber-600 text-sm font-bold" }),

                      React.createElement("div", { className: "flex min-w-0 flex-1 basis-32 items-center gap-1" },

                        React.createElement("input", { type: "range", min: 1, max: 99, value: Math.round(o.prob * 100), 'aria-label': 'Probability for outcome ' + (o.label || (i + 1)), onChange: function (e) { var newProb = parseInt(e.target.value) / 100; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { prob: newProb }); var remaining = 1 - newProb; var otherTotal = co.reduce(function (s, c, j) { return j === i ? s : s + c.prob; }, 0); if (otherTotal > 0) { co.forEach(function (c, j) { if (j !== i) co[j] = Object.assign({}, c, { prob: c.prob / otherTotal * remaining }); }); } setProbabilityOutcomes(co); }, className: "h-6 min-w-0 flex-1 accent-amber-600" }),

                        React.createElement("span", { className: "w-10 text-xs font-mono text-amber-700 text-right" }, Math.round(o.prob * 100) + '%')

                      ),

                      customOutcomes.length > 2 && React.createElement("button", { "aria-label": "Remove outcome " + (o.label || (i + 1)), onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); var total = co.reduce(function (s, c) { return s + c.prob; }, 0); co = co.map(function (c) { return Object.assign({}, c, { prob: c.prob / total }); }); setProbabilityOutcomes(co); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1" }, "\u2715")

                    );

                  })

                ),

                customOutcomes.length < 8 && React.createElement("button", { "aria-label": t('stem.probability.add_outcome', "+ Add Outcome"), onClick: function () { var newOuts = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), prob: 0, count: 1, numerator: 0, denominator: 20, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); var prob = 1 / newOuts.length; newOuts = newOuts.map(function (o) { return Object.assign({}, o, { prob: prob }); }); setProbabilityOutcomes(newOuts); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, t('stem.probability.add_outcome_2', "+ Add Outcome")),

                React.createElement("p", { className: "text-[11px] text-amber-500 mt-1" }, "\uD83D\uDCA1 Total: " + Math.round(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) * 100) + "% (should be 100%)")

              ),

              React.createElement("div", { role: customModel.valid ? "status" : "alert", "aria-live": "polite", className: "mt-3 px-3 py-2 rounded-lg text-xs font-bold", style: { background: customModel.valid ? (isDark || isContrast ? 'rgba(16,185,129,0.12)' : '#ecfdf5') : (isDark || isContrast ? 'rgba(239,68,68,0.12)' : '#fef2f2'), color: customModel.valid ? (isDark || isContrast ? '#a7f3d0' : '#047857') : (isDark || isContrast ? '#fecaca' : '#b91c1c'), border: '1px solid ' + (customModel.valid ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)') } }, customModel.valid ? 'Model ready: 100% across ' + customOutcomes.length + ' unique outcomes.' : 'Custom model not ready: ' + customModel.reason)

            ),



            // ── Birthday Problem Calculator ──
            // ── Monty Hall (canonical counter-intuitive probability) ──
            // State machine: pick → host-reveal → stay/switch → outcome.
            // Stats tracked separately for stay vs switch, so the 1/3-vs-2/3
            // gap emerges visibly across runs. Auto-run does 500 silent trials
            // of each strategy for fast statistical proof.
            d.mode === 'monty' && (function() {
              var m = d.monty || { stage: 'pick', prizeDoor: null, picked: null, revealed: null, finalChoice: null, won: false };
              var ms = d.montyStats || { switchWins: 0, switchN: 0, stayWins: 0, stayN: 0 };
              // Lazy-init the round if no prize is set
              if (m.prizeDoor == null) {
                setTimeout(function() {
                  upd('monty', { stage: 'pick', prizeDoor: Math.floor(Math.random() * 3), picked: null, revealed: null, finalChoice: null, won: false });
                }, 0);
                return React.createElement('div', { className: 'text-center text-slate-500 p-6 text-sm' }, t('stem.probability.loading_monty_hall', 'Loading Monty Hall…'));
              }

              function newRound() {
                sfxProbClick();
                upd('monty', { stage: 'pick', prizeDoor: Math.floor(Math.random() * 3), picked: null, revealed: null, finalChoice: null, won: false });
              }
              function pickDoor(idx) {
                if (m.stage !== 'pick') return;
                sfxProbClick();
                // Host opens a door that is NOT the player's pick AND NOT the prize
                var candidates = [0, 1, 2].filter(function(x) { return x !== idx && x !== m.prizeDoor; });
                var reveal = candidates[Math.floor(Math.random() * candidates.length)];
                upd('monty', Object.assign({}, m, { picked: idx, revealed: reveal, stage: 'choice' }));
              }
              function decide(action) {
                if (m.stage !== 'choice') return;
                var finalChoice = action === 'stay'
                  ? m.picked
                  : [0, 1, 2].filter(function(x) { return x !== m.picked && x !== m.revealed; })[0];
                var won = finalChoice === m.prizeDoor;
                if (won) sfxProbSuccess(); else sfxProbClick();
                // Update per-strategy stats
                var nextStats = Object.assign({}, ms);
                if (action === 'stay') {
                  nextStats.stayN = (nextStats.stayN || 0) + 1;
                  if (won) nextStats.stayWins = (nextStats.stayWins || 0) + 1;
                } else {
                  nextStats.switchN = (nextStats.switchN || 0) + 1;
                  if (won) nextStats.switchWins = (nextStats.switchWins || 0) + 1;
                }
                // Per-strategy outcome strip — records ONLY manual plays, so
                // the visual reflects what the student personally witnessed.
                // (Autorun bulks aren't included; they'd flood the strip with
                // outcomes the student didn't see.)
                var nextStrip = Object.assign({ stay: [], switch: [] }, d.montyStrip || {});
                nextStrip[action] = (nextStrip[action] || []).concat([won]);
                if (nextStrip[action].length > 20) nextStrip[action] = nextStrip[action].slice(-20);
                upd('monty', Object.assign({}, m, { stage: 'reveal', finalChoice: finalChoice, won: won }));
                upd('montyStats', nextStats);
                upd('montyStrip', nextStrip);
                upd('totalTrials', (d.totalTrials || 0) + 1);
                upd('experimentsUsed', Object.assign({}, d.experimentsUsed || {}, { monty: true }));
              }
              function autoRun(n) {
                sfxProbClick();
                // Simulate n rounds with BOTH strategies silently. Each round
                // has its own random prize + initial pick + host reveal, then
                // we evaluate stay-vs-switch on the SAME scenario for fairness.
                var nextStats = Object.assign({}, ms);
                for (var i = 0; i < n; i++) {
                  var prize = Math.floor(Math.random() * 3);
                  var pick = Math.floor(Math.random() * 3);
                  // Strategy: STAY
                  nextStats.stayN++;
                  if (pick === prize) nextStats.stayWins++;
                  // Strategy: SWITCH
                  // Host opens any non-pick, non-prize. Player switches to the remaining door.
                  // After switch: wins iff initial pick was wrong (prize ≠ pick).
                  nextStats.switchN++;
                  if (pick !== prize) nextStats.switchWins++;
                }
                upd('montyStats', nextStats);
                upd('totalTrials', (d.totalTrials || 0) + n * 2);
                upd('experimentsUsed', Object.assign({}, d.experimentsUsed || {}, { monty: true }));
                if (typeof addToast === 'function') addToast('Simulated ' + n + ' rounds of each strategy', 'success');
              }
              function resetStats() {
                sfxProbClick();
                upd('montyStats', { switchWins: 0, switchN: 0, stayWins: 0, stayN: 0 });
              }

              var stayPct = ms.stayN > 0 ? Math.round(ms.stayWins / ms.stayN * 100) : 0;
              var switchPct = ms.switchN > 0 ? Math.round(ms.switchWins / ms.switchN * 100) : 0;

              function door(idx) {
                var isPicked = m.picked === idx;
                var isRevealed = m.revealed === idx;
                var isFinal = m.stage === 'reveal' && m.finalChoice === idx;
                var isWinDoor = m.stage === 'reveal' && m.prizeDoor === idx;
                var showOpen = isRevealed || (m.stage === 'reveal');
                // Door color/state
                var bg, label, emoji;
                if (showOpen) {
                  if (idx === m.prizeDoor) { bg = 'linear-gradient(180deg, #fef3c7, #fbbf24)'; emoji = '🚗'; label = 'Prize!'; }
                  else { bg = 'linear-gradient(180deg, #e5e7eb, #9ca3af)'; emoji = '🐐'; label = 'Goat'; }
                } else {
                  bg = isPicked ? 'linear-gradient(180deg, #c4b5fd, #8b5cf6)' : 'linear-gradient(180deg, #a5b4fc, #6366f1)';
                  emoji = '🚪'; label = 'Door ' + (idx + 1);
                }
                var clickable = m.stage === 'pick';
                var borderColor = isFinal ? (m.won ? '#16a34a' : '#dc2626') : isPicked ? '#7c3aed' : '#475569';
                return React.createElement('button', {
                  key: 'door-' + idx,
                  onClick: clickable ? function() { pickDoor(idx); } : null,
                  disabled: !clickable && m.stage !== 'reveal',
                  'aria-label': 'Door ' + (idx + 1) + (isPicked ? ', your pick' : '') + (isRevealed ? ', revealed as a goat' : '') + (isFinal ? (m.won ? ', your final choice — you won!' : ', your final choice — you lost') : ''),
                  className: 'relative flex flex-col items-center justify-center rounded-xl transition-transform ' + (clickable ? 'hover:scale-105 cursor-pointer' : 'cursor-default'),
                  style: {
                    width: '110px', height: '170px', background: bg,
                    border: '4px solid ' + borderColor,
                    boxShadow: isFinal ? '0 0 24px ' + (m.won ? 'rgba(34,197,94,0.6)' : 'rgba(220,38,38,0.6)') : '0 6px 12px rgba(0,0,0,0.15)'
                  }
                },
                  React.createElement('div', { style: { fontSize: '52px', lineHeight: 1 } }, emoji),
                  React.createElement('div', { style: { marginTop: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a', textShadow: '0 1px 2px rgba(255,255,255,0.7)' } }, label),
                  isPicked && !isFinal && React.createElement('div', { style: { position: 'absolute', top: '-12px', right: '-8px', background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 } }, t('stem.probability.your_pick', 'YOUR PICK')),
                  isFinal && React.createElement('div', { style: { position: 'absolute', top: '-12px', right: '-8px', background: m.won ? '#16a34a' : '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 } }, m.won ? 'WIN ✓' : 'LOSS ✗')
                );
              }

              return React.createElement('div', { className: 'rounded-xl p-4 mb-4', style: { background: 'linear-gradient(135deg, #312e81 0%, #6366f1 100%)', color: 'white' } },
                React.createElement('div', { className: 'text-center mb-3' },
                  React.createElement('div', { className: 'text-lg font-bold' }, t('stem.probability.the_monty_hall_problem', '🚪 The Monty Hall Problem')),
                  React.createElement('div', { className: 'text-[11px] text-indigo-100 mt-1 italic max-w-xl mx-auto' }, t('stem.probability.behind_one_door_a_prize_behind_two_goa', 'Behind one door: a prize. Behind two: goats. Pick a door, the host opens a goat-door, then you choose: stay or switch?'))
                ),
                // Stage instruction
                React.createElement('div', { className: 'text-center mb-3 text-sm font-bold' },
                  m.stage === 'pick' && '👉 Pick one of the three doors',
                  m.stage === 'choice' && '🤔 Stay with your pick, or switch to the remaining closed door?',
                  m.stage === 'reveal' && (m.won
                    ? React.createElement('span', { className: 'text-emerald-200' }, '🎉 You ' + (m.finalChoice === m.picked ? 'STAYED' : 'SWITCHED') + ' and won!')
                    : React.createElement('span', { className: 'text-rose-200' }, '💔 You ' + (m.finalChoice === m.picked ? 'STAYED' : 'SWITCHED') + ' and missed. The prize was behind Door ' + (m.prizeDoor + 1) + '.'))
                ),
                // Doors row
                React.createElement('div', { className: 'flex justify-center items-center gap-4 mb-3' }, [door(0), door(1), door(2)]),
                // Action buttons
                React.createElement('div', { className: 'flex justify-center gap-2 mb-4' },
                  m.stage === 'choice' && [
                    React.createElement('button', { key: 'stay', onClick: function() { decide('stay'); }, className: 'px-4 py-2 rounded-lg font-bold bg-slate-200 text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-white focus:outline-none' }, t('stem.probability.stay', '🛡 Stay')),
                    React.createElement('button', { key: 'switch', onClick: function() { decide('switch'); }, className: 'px-4 py-2 rounded-lg font-bold bg-amber-400 text-amber-900 hover:bg-amber-300 focus:ring-2 focus:ring-white focus:outline-none' }, t('stem.probability.switch', '🔄 Switch'))
                  ],
                  m.stage === 'reveal' && React.createElement('button', { onClick: newRound, className: 'px-5 py-2 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-white focus:outline-none' }, t('stem.probability.play_another_round', '↻ Play another round'))
                ),
                // Strategy stats — side by side comparison + outcome strip
                (ms.stayN > 0 || ms.switchN > 0) && (function() {
                  var strip = d.montyStrip || { stay: [], switch: [] };
                  // Accessible name for an outcome strip. The strip is 20 colour
                  // squares and nothing else, so without this a screen-reader user
                  // gets no version of it at all — and the old aria-label sat on a
                  // bare div (role=generic), where ARIA drops the name outright.
                  // Carries the counts, not just the colour legend.
                  function stripLabel(strategy, outcomes) {
                    if (!outcomes.length) return strategy + ' strategy: no manual plays yet.';
                    var wins = outcomes.filter(Boolean).length;
                    return 'Last ' + outcomes.length + ' manual ' + strategy + ' plays: '
                      + wins + ' ' + (wins === 1 ? 'win' : 'wins') + ', '
                      + (outcomes.length - wins) + ' ' + (outcomes.length - wins === 1 ? 'loss' : 'losses')
                      + '. Most recent last: ' + outcomes.map(function(w) { return w ? 'win' : 'loss'; }).join(', ') + '.';
                  }
                  function renderStrip(outcomes, winColor) {
                    // Pad to 20 slots: empty placeholders for unused positions
                    var slots = [];
                    for (var si = 0; si < 20; si++) {
                      var actualIdx = outcomes.length - 20 + si;
                      var hasValue = actualIdx >= 0;
                      var won = hasValue ? outcomes[actualIdx] : null;
                      slots.push(React.createElement('span', {
                        key: 'slot-' + si,
                        style: {
                          display: 'inline-block', width: '11px', height: '11px',
                          borderRadius: '2px', margin: '1px',
                          background: hasValue ? (won ? winColor : '#7f1d1d') : 'rgba(255,255,255,0.08)',
                          border: hasValue ? '1px solid rgba(0,0,0,0.25)' : '1px dashed rgba(255,255,255,0.18)',
                          boxShadow: hasValue && won ? '0 0 4px ' + winColor + '80' : 'none'
                        },
                        title: hasValue ? (won ? 'Win' : 'Loss') : 'No play yet'
                      }));
                    }
                    return slots;
                  }
                  return React.createElement('div', { className: 'rounded-lg p-3 bg-white/10 border border-white/20' },
                    React.createElement('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-indigo-100 mb-2 text-center' }, t('stem.probability.strategy_win_rates', '📊 Strategy Win Rates')),
                    React.createElement('div', { className: 'grid grid-cols-2 gap-3 text-center' },
                      React.createElement('div', null,
                        React.createElement('div', { className: 'text-xs font-bold text-slate-200' }, t('stem.probability.stay_2', '🛡 Stay')),
                        React.createElement('div', { className: 'text-2xl font-bold mt-1', style: { color: stayPct >= 50 ? '#fde047' : '#fff' } }, stayPct + '%'),
                        React.createElement('div', { className: 'text-[10px] text-indigo-200' }, ms.stayWins + ' wins / ' + ms.stayN + ' trials'),
                        React.createElement('div', { className: 'w-full h-2 rounded-full bg-black/30 overflow-hidden mt-1' },
                          React.createElement('div', { className: 'h-full bg-slate-300', style: { width: stayPct + '%' } })
                        ),
                        // Outcome strip — last 20 manual plays of this strategy
                        React.createElement('div', { className: 'mt-2', role: 'img', 'aria-label': stripLabel('Stay', strip.stay || []) },
                          renderStrip(strip.stay || [], '#22c55e')
                        )
                      ),
                      React.createElement('div', null,
                        React.createElement('div', { className: 'text-xs font-bold text-amber-200' }, t('stem.probability.switch_2', '🔄 Switch')),
                        React.createElement('div', { className: 'text-2xl font-bold mt-1', style: { color: switchPct >= 50 ? '#fde047' : '#fff' } }, switchPct + '%'),
                        React.createElement('div', { className: 'text-[10px] text-amber-100' }, ms.switchWins + ' wins / ' + ms.switchN + ' trials'),
                        React.createElement('div', { className: 'w-full h-2 rounded-full bg-black/30 overflow-hidden mt-1' },
                          React.createElement('div', { className: 'h-full bg-amber-400', style: { width: switchPct + '%' } })
                        ),
                        React.createElement('div', { className: 'mt-2', role: 'img', 'aria-label': stripLabel('Switch', strip.switch || []) },
                          renderStrip(strip.switch || [], '#fbbf24')
                        )
                      )
                    ),
                    ((strip.stay || []).length > 0 || (strip.switch || []).length > 0) && React.createElement('div', { className: 'text-[10px] text-center mt-2 italic text-indigo-200' },
                      t('stem.probability.outcome_strips_show_your_last_20_manua', 'Outcome strips show your last 20 manual plays — green = win, red = loss. Visible streaks tell you what randomness actually feels like.')
                    ),
                    (ms.stayN + ms.switchN) >= 30 && React.createElement('div', { className: 'text-[10px] text-center mt-2 italic text-indigo-100' },
                      t('stem.probability.math_says_stay_wins_1_3_33_switch_wins', 'Math says: Stay wins ≈ 1/3 (33%). Switch wins ≈ 2/3 (67%). With enough trials, the math wins out.')
                    )
                  );
                })(),
                // Auto-run row + reset
                React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center mt-3' },
                  [100, 500, 1000].map(function(n) {
                    return React.createElement('button', {
                      key: 'auto-' + n,
                      onClick: function() { autoRun(n); },
                      className: 'px-3 py-1.5 rounded-md text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white focus:ring-2 focus:ring-white focus:outline-none',
                      'aria-label': 'Simulate ' + n + ' rounds of each strategy'
                    }, '⚡ +' + n + ' of each');
                  }),
                  (ms.stayN > 0 || ms.switchN > 0) && React.createElement('button', {
                    onClick: resetStats,
                    className: 'px-3 py-1.5 rounded-md text-[11px] font-bold bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 ml-auto'
                  }, t('stem.probability.reset_stats', '↻ Reset stats'))
                )
              );
            })(),

            // ── Galton Board / Quincunx — binomial → normal emergence ──
            // Balls drop through a peg grid. Each peg deflects them 50/50
            // left or right. Bins at the bottom accumulate counts. As N grows,
            // the histogram converges to a bell curve (Central Limit Theorem
            // in its simplest form). Theoretical normal overlay shows the
            // expected shape so students see the math vs the empirical fit.
            d.mode === 'galton' && (function() {
              var GB_ROWS = 12;           // peg rows
              var GB_BINS = GB_ROWS + 1;  // bottom bins (always rows+1)
              var bins = d.galtonBins || (function() {
                var a = []; for (var bi = 0; bi < GB_BINS; bi++) a.push(0); return a;
              })();
              var totalDropped = bins.reduce(function(a, b) { return a + b; }, 0);
              // Compute mean + std dev of bin distribution (treating each bin index as a value)
              var mean = 0, stdDev = 0;
              if (totalDropped > 0) {
                for (var bi = 0; bi < bins.length; bi++) mean += bi * bins[bi];
                mean /= totalDropped;
                for (var bi = 0; bi < bins.length; bi++) stdDev += bins[bi] * (bi - mean) * (bi - mean);
                stdDev = Math.sqrt(stdDev / totalDropped);
              }
              // Theoretical binomial mean = nRows × p = 12 × 0.5 = 6
              // Theoretical std dev = sqrt(n × p × (1-p)) = sqrt(3) ≈ 1.732
              var theoryMean = GB_ROWS * 0.5;
              var theoryStdDev = Math.sqrt(GB_ROWS * 0.25);

              // SVG geometry — declared early so it can be shared with the
              // path-precompute helper below.
              var svgW = 360, svgH = 280;
              var pegAreaH = 160;
              var binAreaY = pegAreaH + 10;
              var binAreaH = svgH - binAreaY - 24;
              var colW = svgW / GB_BINS;
              var rowSpacing = (pegAreaH - 30) / Math.max(1, GB_ROWS - 1);
              // The peg lattice must share the bins' horizontal pitch. It used to
              // be svgW/(ROWS+2) — a different pitch from colW = svgW/BINS — so a
              // ball's last peg position and its bin centre disagreed by up to
              // ~12px and the ball visibly jogged sideways as it dropped in. With
              // one pitch, x after all ROWS deflections lands exactly on the bin
              // centre: svgW/2 + (rights - ROWS/2)*colW === rights*colW + colW/2.
              var pegSpacing = colW;

              // Precompute the screen-space path for an animated ball with the
              // given deflection sequence. Returns an array of {x, y} points;
              // pts[0] = top of board, pts[r+1] = after r deflections (i.e.,
              // between peg-row r-1 and r). Final point = bin center.
              function precomputePath(deflections) {
                var pts = [{ x: svgW / 2, y: 6 }]; // start at top
                var xOff = 0;
                for (var r = 0; r < GB_ROWS; r++) {
                  xOff += deflections[r] ? 0.5 : -0.5;
                  var x = svgW / 2 + xOff * pegSpacing;
                  var y = 20 + r * rowSpacing + rowSpacing * 0.5;
                  pts.push({ x: x, y: y });
                }
                var finalBin = deflections.reduce(function(a, b) { return a + b; }, 0);
                pts.push({ x: finalBin * colW + colW / 2, y: binAreaY + binAreaH - 4 });
                return { pts: pts, bin: finalBin };
              }

              // Simulate dropping a single ball (instant — used in large-N mode).
              function simulateBall() {
                var rights = 0;
                for (var r = 0; r < GB_ROWS; r++) if (Math.random() < 0.5) rights++;
                return rights;
              }
              // Pacing: small drops animate, large drops are instant so the
              // student can see the bell curve emerge without 1000-ball waits.
              var ANIMATE_THRESHOLD = 10;
              function dropN(n) {
                sfxProbClick();
                upd('totalTrials', (d.totalTrials || 0) + n);
                upd('experimentsUsed', Object.assign({}, d.experimentsUsed || {}, { galton: true }));
                if (n > ANIMATE_THRESHOLD) {
                  // Instant mode for large drops — bell curve emerges without delay
                  var next = bins.slice();
                  for (var i = 0; i < n; i++) next[simulateBall()]++;
                  upd('galtonBins', next);
                  sfxProbSuccess();
                  return;
                }
                // Animated mode — show the random walk through the peg grid.
                // Each ball has a precomputed path; balls spawn staggered every
                // other tick so multiple balls cascade visibly.
                if (_galtonAnim.interval) clearInterval(_galtonAnim.interval);
                var queue = [];
                for (var i = 0; i < n; i++) {
                  var defs = [];
                  for (var r = 0; r < GB_ROWS; r++) defs.push(Math.random() < 0.5 ? 0 : 1);
                  var p = precomputePath(defs);
                  queue.push({ id: Date.now() + '-' + i, pts: p.pts, bin: p.bin, step: 0 });
                }
                var falling = []; var spawnIdx = 0; var tickCount = 0;
                var workingBins = bins.slice();
                _galtonAnim.interval = setInterval(function() {
                  tickCount++;
                  // Spawn next ball every 2 ticks (so balls visibly cascade)
                  if (spawnIdx < queue.length && (tickCount % 2 === 0 || tickCount === 1)) {
                    falling.push(queue[spawnIdx++]);
                  }
                  // Advance every active ball one step
                  var still = [];
                  for (var bi = 0; bi < falling.length; bi++) {
                    var b = falling[bi];
                    b.step++;
                    if (b.step >= b.pts.length - 1) {
                      // Landed — commit to bin
                      workingBins[b.bin]++;
                    } else {
                      still.push(b);
                    }
                  }
                  falling = still;
                  // Commit state once per tick
                  upd('galtonBins', workingBins.slice());
                  upd('galtonFalling', falling.map(function(b) { return { id: b.id, x: b.pts[b.step].x, y: b.pts[b.step].y }; }));
                  if (spawnIdx >= queue.length && falling.length === 0) {
                    clearInterval(_galtonAnim.interval);
                    _galtonAnim.interval = null;
                    upd('galtonFalling', []);
                    sfxProbSuccess();
                  }
                }, 100);
              }
              function resetBoard() {
                sfxProbClick();
                if (_galtonAnim.interval) { clearInterval(_galtonAnim.interval); _galtonAnim.interval = null; }
                var blank = []; for (var bi = 0; bi < GB_BINS; bi++) blank.push(0);
                upd('galtonBins', blank);
                upd('galtonFalling', []);
              }

              // ── Binomial coefficients for theoretical bin probabilities ──
              // C(12, k) for k = 0..12. Used to compute expected counts and
              // color-code each bar by how closely it matches theory.
              var BINOM_12 = [1, 12, 66, 220, 495, 792, 924, 792, 495, 220, 66, 12, 1];
              var BINOM_TOTAL = 4096; // 2^12
              function expectedCountFor(bin) { return totalDropped * BINOM_12[bin] / BINOM_TOTAL; }

              // Build peg-grid SVG elements
              var pegs = [];
              for (var r = 0; r < GB_ROWS; r++) {
                var pegsInRow = r + 1;
                var rowY = 20 + (r * (pegAreaH - 30) / Math.max(1, GB_ROWS - 1));
                for (var c = 0; c < pegsInRow; c++) {
                  var pegX = svgW / 2 + (c - (pegsInRow - 1) / 2) * pegSpacing;
                  pegs.push(React.createElement('circle', { key: 'peg-' + r + '-' + c, cx: pegX, cy: rowY, r: 2.5, fill: '#94a3b8' }));
                }
              }
              // Maxbin computed from EITHER observed counts OR theoretical
              // expected counts so the theoretical curve isn't clipped when
              // empirical is sparse.
              var maxObs = Math.max.apply(Math, bins.concat([1]));
              var maxExp = 0;
              if (totalDropped > 0) {
                for (var bi = 0; bi < GB_BINS; bi++) maxExp = Math.max(maxExp, expectedCountFor(bi));
              }
              var maxBin = Math.max(maxObs, maxExp);

              // Build histogram bars with theory-deviation coloring.
              // Below 30 drops, use the original rainbow palette (deviation
              // is too noisy to be meaningful). Above 30, color by how close
              // each bar is to the binomial expected count.
              var bars = bins.map(function(count, idx) {
                var barH = (count / maxBin) * binAreaH;
                var barX = idx * colW + 2;
                var barY = binAreaY + binAreaH - barH;
                var fillColor;
                if (totalDropped < 30) {
                  // Rainbow (the original) — noise is the signal at low N
                  var hue = 270 - (Math.abs(idx - (GB_BINS - 1) / 2) / ((GB_BINS - 1) / 2)) * 100;
                  fillColor = 'hsl(' + hue + ', 70%, 55%)';
                } else {
                  // Color by ratio to expected
                  // `binExpected`, not `expected`: the render-scope `expected` is
                  // the outcome→probability map, a different thing entirely.
                  var binExpected = expectedCountFor(idx);
                  if (binExpected < 0.5) {
                    fillColor = '#cbd5e1'; // tail bin with negligible expected mass
                  } else {
                    var ratio = count / binExpected;
                    if (ratio >= 0.85 && ratio <= 1.15) fillColor = '#10b981';      // green — within 15%
                    else if (ratio >= 0.6 && ratio <= 1.4) fillColor = '#f59e0b';   // amber — within 40%
                    else fillColor = '#ef4444';                                     // red — significant deviation
                  }
                }
                return React.createElement('g', { key: 'bar-' + idx },
                  React.createElement('rect', {
                    x: barX, y: barY, width: colW - 4, height: barH,
                    fill: fillColor,
                    rx: 2
                  }),
                  count > 0 && React.createElement('text', {
                    x: barX + (colW - 4) / 2, y: barY - 2,
                    fill: '#475569', fontSize: 9, textAnchor: 'middle', fontWeight: 'bold'
                  }, count)
                );
              });

              // Render falling balls (animation in-flight). Read from state.
              var fallingNow = d.galtonFalling || [];
              var fallingBalls = fallingNow.map(function(b) {
                return React.createElement('circle', {
                  key: 'fall-' + b.id,
                  cx: b.x, cy: b.y, r: 4,
                  fill: '#fbbf24',
                  stroke: '#92400e',
                  strokeWidth: 0.8,
                  style: { filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }
                });
              });
              // Theoretical normal curve overlay: for each bin, expected count
              // = totalDropped × C(n, k) / 2^n. We just sample the analytic
              // normal-approximation curve over a denser x range.
              var theoryPath = '';
              if (totalDropped >= 50) {
                var pts = [];
                for (var x = 0; x <= GB_BINS * 4; x++) {
                  var bx = x / 4; // bin-coord
                  var z = (bx - theoryMean) / theoryStdDev;
                  var pdfVal = Math.exp(-0.5 * z * z) / (theoryStdDev * Math.sqrt(2 * Math.PI));
                  // Scale to histogram space: peak pdf ≈ 1/(σ√(2π)). Multiply
                  // by totalDropped to get expected count per unit bin.
                  var expectedCount = pdfVal * totalDropped;
                  var px = bx * colW + colW / 2;
                  var py = binAreaY + binAreaH - (expectedCount / maxBin) * binAreaH;
                  pts.push((x === 0 ? 'M' : 'L') + px + ',' + py);
                }
                theoryPath = pts.join(' ');
              }

              return React.createElement('div', { className: 'rounded-xl p-4 mb-4', style: { background: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 100%)', color: 'white' } },
                React.createElement('div', { className: 'text-center mb-3' },
                  React.createElement('div', { className: 'text-lg font-bold' }, t('stem.probability.the_galton_board', '⚙️ The Galton Board')),
                  React.createElement('div', { className: 'text-[11px] text-cyan-100 mt-1 italic max-w-xl mx-auto' }, t('stem.probability.drop_balls_through_a_peg_grid_each_peg', 'Drop balls through a peg grid. Each peg deflects 50/50 left or right. After enough balls, the histogram becomes a bell curve — the Central Limit Theorem in action.'))
                ),
                // SVG board
                React.createElement('div', { className: 'flex justify-center mb-3' },
                  React.createElement('svg', {
                    viewBox: '0 0 ' + svgW + ' ' + svgH,
                    width: svgW, height: svgH,
                    style: { background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
                    'aria-label': 'Galton board with ' + GB_ROWS + ' peg rows and ' + GB_BINS + ' histogram bins below'
                  },
                    pegs,
                    // Divider line between pegs and bins
                    React.createElement('line', { x1: 0, y1: binAreaY, x2: svgW, y2: binAreaY, stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }),
                    bars,
                    theoryPath && React.createElement('path', {
                      d: theoryPath,
                      fill: 'none',
                      stroke: 'rgba(251,191,36,0.85)',
                      strokeWidth: 2,
                      strokeDasharray: '4 3'
                    }),
                    // Falling balls (animation in flight) — rendered LAST so
                    // they sit on top of pegs and bars.
                    fallingBalls,
                    // Bin index labels
                    bins.map(function(_, idx) {
                      return React.createElement('text', {
                        key: 'lbl-' + idx,
                        x: idx * colW + colW / 2, y: svgH - 6,
                        fill: 'rgba(255,255,255,0.5)', fontSize: 8, textAnchor: 'middle'
                      }, idx);
                    })
                  )
                ),
                // Stats row — empirical vs theoretical
                React.createElement('div', { className: 'grid grid-cols-2 gap-3 mb-3 px-2' },
                  React.createElement('div', { className: 'rounded-lg p-2 bg-white/10 text-center' },
                    React.createElement('div', { className: 'text-[10px] font-bold text-cyan-100 uppercase tracking-wider' }, t('stem.probability.empirical_your_drops', 'Empirical (your drops)')),
                    totalDropped === 0
                      ? React.createElement('div', { className: 'text-[12px] text-cyan-200 italic mt-1' }, t('stem.probability.drop_balls_to_see', 'Drop balls to see…'))
                      : [
                          React.createElement('div', { key: 'em-n', className: 'text-[11px] mt-1' }, totalDropped + ' ball' + (totalDropped !== 1 ? 's' : '') + ' dropped'),
                          React.createElement('div', { key: 'em-m', className: 'text-[11px]' }, 'mean ≈ ' + mean.toFixed(2)),
                          React.createElement('div', { key: 'em-sd', className: 'text-[11px]' }, 'std dev ≈ ' + stdDev.toFixed(2))
                        ]
                  ),
                  React.createElement('div', { className: 'rounded-lg p-2 bg-amber-400/15 border border-amber-400/30 text-center' },
                    React.createElement('div', { className: 'text-[10px] font-bold text-amber-200 uppercase tracking-wider' }, t('stem.probability.theoretical_math', 'Theoretical (math)')),
                    React.createElement('div', { className: 'text-[11px] mt-1 text-amber-100' }, 'Binomial(' + GB_ROWS + ', 0.5)'),
                    React.createElement('div', { className: 'text-[11px] text-amber-100' }, 'mean = ' + theoryMean.toFixed(2)),
                    React.createElement('div', { className: 'text-[11px] text-amber-100' }, 'std dev = ' + theoryStdDev.toFixed(2))
                  )
                ),
                // Drop controls
                React.createElement('div', { className: 'flex flex-wrap gap-2 justify-center' },
                  [1, 10, 100, 1000].map(function(n) {
                    return React.createElement('button', {
                      key: 'drop-' + n,
                      onClick: function() { dropN(n); },
                      className: 'px-4 py-2 rounded-lg font-bold bg-cyan-700 text-white hover:bg-cyan-800 focus:ring-2 focus:ring-white focus:outline-none transition',
                      'aria-label': 'Drop ' + n + ' ball' + (n > 1 ? 's' : '')
                    }, '⚪ Drop ' + n);
                  }),
                  totalDropped > 0 && React.createElement('button', {
                    onClick: resetBoard,
                    className: 'px-3 py-2 rounded-lg text-[12px] font-bold bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 focus:ring-2 focus:ring-white focus:outline-none'
                  }, t('stem.probability.reset', '↻ Reset'))
                ),
                totalDropped >= 50 && React.createElement('div', { className: 'text-[10px] text-center mt-3 italic text-amber-100' },
                  t('stem.probability.gold_dashed_line_theoretical_normal_cu', '⬆ Gold dashed line: theoretical normal curve. Your empirical bars should hug it more closely with more drops.')
                )
              );
            })(),

            // ── 3D Monte Carlo volume estimator ──────────────────────────────
            d.mode === 'volume3d' && (function() {
              var h = React.createElement;
              var shapeId = d.v3Shape || 'sphere';
              var sh = v3Shape(shapeId);
              var total = d.v3Total || 0;
              var inside = d.v3Inside || 0;
              var ratio = total > 0 ? inside / total : 0;
              // The box is exactly 1×1×1, so the hit ratio IS the volume. That
              // identity is the whole lesson — no scaling factor to explain away.
              var vol = ratio;
              // 95% CI on a proportion. For the shape with no formula this is not
              // decoration: it is the only honest statement of the answer.
              var se = total > 0 ? Math.sqrt(Math.max(ratio * (1 - ratio), 0) / total) : 0;
              var ci = 1.96 * se;
              var engine = d._v3Engine || _v3Load.state;
              var showMiss = d.v3ShowMiss !== false;

              // Kick the loader for state restored straight into this mode (no
              // mode-button click ever fires in that path). Guarded by the module
              // flag, so re-renders cannot stack loads.
              if (engine === 'idle') _v3EnsureThree(function(s) { upd('_v3Engine', s); });
              // Plain data handoff to the imperative scene; the animation frame
              // reconciles it. Idempotent, so a double render is harmless.
              _v3.onStatus = function(s) { if (s === 'webgl') upd('_v3Engine', 'webgl-failed'); };
              var cloud = d.v3Cloud || [];
              if (!showMiss && cloud.length) {
                var onlyHits = [];
                for (var ci2 = 0; ci2 < cloud.length; ci2 += 4) {
                  if (cloud[ci2 + 3]) onlyHits.push(cloud[ci2], cloud[ci2 + 1], cloud[ci2 + 2], 1);
                }
                cloud = onlyHits;
              }
              _v3.want = { shapeId: shapeId, cloud: cloud };

              function throwDarts(n) {
                sfxProbClick();
                var next = (d.v3Cloud || []).slice();
                var hits = 0;
                for (var i = 0; i < n; i++) {
                  var x = Math.random() - 0.5, y = Math.random() - 0.5, z = Math.random() - 0.5;
                  var hit = sh.inside(x, y, z);
                  if (hit) hits++;
                  next.push(x, y, z, hit ? 1 : 0);
                }
                // Cloud is capped for rendering; the COUNTERS are not. Deriving
                // the estimate from a capped array is what froze the 2D π mode's
                // accuracy — see the piTotal note above.
                var CAP = 2400 * 4;
                if (next.length > CAP) next = next.slice(next.length - CAP);
                upd('v3Cloud', next);
                upd('v3Total', total + n);
                upd('v3Inside', inside + hits);
                upd('totalTrials', (d.totalTrials || 0) + n);
                upd('experimentsUsed', Object.assign({}, d.experimentsUsed || {}, { volume3d: true }));
                if (announceToSR) {
                  var nt = total + n, nr = (inside + hits) / nt;
                  announceToSR(n.toLocaleString() + ' darts thrown. ' + (inside + hits).toLocaleString() +
                    ' of ' + nt.toLocaleString() + ' landed inside. Estimated volume ' + nr.toFixed(4) + '.');
                }
              }
              function resetDarts() {
                sfxProbClick();
                upd('v3Cloud', []); upd('v3Total', 0); upd('v3Inside', 0);
              }

              var card = { background: isDark || isContrast ? 'rgba(3,105,161,0.08)' : 'linear-gradient(135deg,#f0f9ff,#ecfeff)',
                border: '2px solid ' + (isDark || isContrast ? 'rgba(56,189,248,0.32)' : '#bae6fd') };
              var head = isDark || isContrast ? '#7dd3fc' : '#075985';
              var body = isDark || isContrast ? '#e0f2fe' : '#0c4a6e';
              var statBox = { background: isDark || isContrast ? 'rgba(15,23,42,0.55)' : '#ffffff',
                border: '1px solid ' + (isDark || isContrast ? 'rgba(100,116,139,0.4)' : '#cbd5e1'), borderRadius: 8, padding: '6px 8px' };

              function stat(label, value, sub) {
                return h('div', { style: statBox },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider', style: { color: head } }, label),
                  h('div', { className: 'text-lg font-black font-mono', style: { color: body } }, value),
                  sub ? h('div', { className: 'text-[10px]', style: { color: isDark || isContrast ? '#94a3b8' : '#475569' } }, sub) : null
                );
              }

              // Everything the canvas conveys, in words. Present whether or not
              // WebGL ever loads, so the mode is never graphics-only.
              var sceneDesc = 'A 1 by 1 by 1 box containing a ' + sh.label.toLowerCase() + '. ' +
                total.toLocaleString() + ' darts thrown at random positions inside the box; ' +
                inside.toLocaleString() + ' landed inside the ' + sh.label.toLowerCase() + '. ' +
                (total > 0 ? 'That is a fraction of ' + ratio.toFixed(4) + ', so the estimated volume is ' + vol.toFixed(4) + '.' : 'No darts thrown yet.');

              return h('div', { className: 'mb-4 rounded-xl p-4', style: card },
                h('p', { className: 'text-sm font-black mb-1', style: { color: head } }, t('stem.probability.volume3d_title', '🧊 3D Monte Carlo — measure a volume by throwing darts')),
                h('p', { className: 'text-xs italic mb-3', style: { color: body } },
                  t('stem.probability.volume3d_intro', 'The box is exactly 1×1×1, so its volume is 1. Throw darts at random spots inside it and the fraction that land in the solid IS the solid’s volume. No formula required — which is how you measure shapes that don’t have one.')),

                // Shape picker
                h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                  V3_SHAPES.map(function(s) {
                    var active = s.id === shapeId;
                    var hex = '#' + s.color.toString(16).padStart(6, '0');
                    return h('button', {
                      key: 'v3s-' + s.id,
                      onClick: function() { sfxProbClick(); upd('v3Shape', s.id); upd('v3Cloud', []); upd('v3Total', 0); upd('v3Inside', 0); },
                      'aria-pressed': active,
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all',
                      style: active
                        ? { background: hex, color: '#0f172a', borderColor: hex }
                        : { background: isDark || isContrast ? 'rgba(15,23,42,0.5)' : '#fff', color: isDark || isContrast ? '#e0f2fe' : '#075985', borderColor: hex + '99' }
                    }, s.label + (s.exact == null ? ' *' : ''));
                  })
                ),

                h('div', { className: 'flex flex-wrap gap-3 items-start' },
                  // ── Viewport ──
                  h('div', { style: { flex: '1 1 300px', minWidth: 260 } },
                    engine === 'ready'
                      ? h('div', { style: { position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid ' + (isDark || isContrast ? 'rgba(100,116,139,0.45)' : '#cbd5e1'), background: isDark || isContrast ? '#0b1220' : '#f8fafc' } },
                          // tabIndex + keydown: OrbitControls is pointer-only, so
                          // without these the view is unreachable by keyboard.
                          // role="img" carries the description; aria-keyshortcuts
                          // advertises the controls to screen readers.
                          h('canvas', {
                            ref: _v3Attach, role: 'img', 'aria-label': sceneDesc,
                            tabIndex: 0, onKeyDown: _v3Keys,
                            'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Plus Minus',
                            style: { outlineOffset: '2px' }
                          }),
                          h('div', { className: 'text-[10px] text-center py-1', style: { color: isDark || isContrast ? '#94a3b8' : '#475569' } },
                            t('stem.probability.volume3d_drag', 'Drag to rotate · scroll to zoom · or focus the view and use arrow keys, + and −'))
                        )
                      : h('div', { className: 'rounded-lg p-4 text-center text-xs', style: { border: '1px dashed ' + (isDark || isContrast ? 'rgba(100,116,139,0.5)' : '#cbd5e1'), color: body, minHeight: 120 } },
                          engine === 'loading' ? t('stem.probability.volume3d_loading', '⏳ Loading the 3D engine…')
                          : engine === 'failed' || engine === 'webgl-failed'
                            ? t('stem.probability.volume3d_no_gl', '📊 The 3D view is unavailable — school networks often block the graphics library, and some devices have no WebGL. The experiment still works: every number below is real, and the dart-throwing is done in maths, not in the picture.')
                            : t('stem.probability.volume3d_idle', 'Preparing the 3D view…')
                        )
                  ),

                  // ── Numbers ──
                  h('div', { style: { flex: '1 1 240px', minWidth: 220, display: 'grid', gap: 6 } },
                    h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } },
                      stat(t('stem.probability.volume3d_darts', 'Darts thrown'), total.toLocaleString()),
                      stat(t('stem.probability.volume3d_hits', 'Landed inside'), inside.toLocaleString())
                    ),
                    stat(t('stem.probability.volume3d_estimate', 'Estimated volume'),
                      total > 0 ? vol.toFixed(4) : '—',
                      total > 0 ? '95% confident: ' + Math.max(0, vol - ci).toFixed(4) + ' to ' + Math.min(1, vol + ci).toFixed(4) : 'throw some darts'),
                    sh.exact != null
                      ? stat(t('stem.probability.volume3d_exact', 'Exact volume'), sh.exact.toFixed(4),
                          total > 0 ? 'off by ' + Math.abs(vol - sh.exact).toFixed(4) + ' (' + (Math.abs(vol - sh.exact) / sh.exact * 100).toFixed(2) + '%)' : sh.formula)
                      : h('div', { style: Object.assign({}, statBox, { borderColor: isDark || isContrast ? 'rgba(52,211,153,0.5)' : '#6ee7b7' }) },
                          h('div', { className: 'text-[10px] font-bold uppercase tracking-wider', style: { color: head } }, t('stem.probability.volume3d_no_formula', '* No volume formula')),
                          h('div', { className: 'text-[11px] leading-snug', style: { color: body } },
                            t('stem.probability.volume3d_no_formula_body', 'This lumpy solid isn’t in any textbook, so there is nothing to check the darts against. The estimate above is not an approximation of a known answer — it IS the answer, and the 95% range is how precisely you know it. Throw more darts to narrow it.')))
                  )
                ),

                // ── Controls ──
                h('div', { className: 'flex flex-wrap gap-2 mt-3 items-center' },
                  [100, 1000, 10000].map(function(n) {
                    return h('button', {
                      key: 'v3t-' + n, onClick: function() { throwDarts(n); },
                      className: 'px-3 py-1.5 rounded-lg text-xs font-bold text-white',
                      style: { background: '#0369a1' }
                    }, '+' + n.toLocaleString() + ' ' + t('stem.probability.volume3d_darts_word', 'darts'));
                  }),
                  h('button', { onClick: resetDarts, className: 'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                    style: { color: body, borderColor: isDark || isContrast ? 'rgba(100,116,139,0.5)' : '#cbd5e1' } }, t('stem.probability.volume3d_reset', '↺ Reset')),
                  h('label', { className: 'flex items-center gap-1 text-[11px] font-bold cursor-pointer ml-auto', style: { color: body } },
                    h('input', { type: 'checkbox', checked: showMiss, onChange: function(e) { upd('v3ShowMiss', e.target.checked); }, className: 'w-3 h-3' }),
                    t('stem.probability.volume3d_show_misses', 'show misses')),
                  cloud.length >= 2400 * 4 && h('span', { className: 'text-[10px] italic w-full', style: { color: isDark || isContrast ? '#94a3b8' : '#475569' } },
                    t('stem.probability.volume3d_cloud_cap', 'The picture shows the most recent 2,400 darts so it stays readable — every dart still counts toward the numbers.'))
                ),

                // ── The dimension insight (sphere only) ──
                shapeId === 'sphere' && h('div', { className: 'mt-3 p-2 rounded text-[11px] leading-relaxed',
                  style: { background: isDark || isContrast ? 'rgba(56,189,248,0.08)' : '#ffffff', border: '1px solid ' + (isDark || isContrast ? 'rgba(56,189,248,0.3)' : '#bae6fd'), color: body } },
                  h('span', { className: 'font-black' }, t('stem.probability.volume3d_dim_head', 'Why does the sphere catch so few? ')),
                  t('stem.probability.volume3d_dim_body', 'A circle fills 78.5% of its square (π⁄4). A sphere fills only 52.4% of its cube (π⁄6). Same shape, same snug fit — but a cube has 8 corners to a square’s 4, and corners are where the round thing isn’t. Keep adding dimensions and the ball all but vanishes: in 10D it catches about 1 dart in 400.'),
                  sh.piFactor && total > 0 ? h('div', { className: 'mt-1 font-mono' },
                    'π ≈ ' + sh.piFactor + ' × ' + ratio.toFixed(4) + ' = ' + (sh.piFactor * ratio).toFixed(4)) : null
                ),
                shapeId !== 'sphere' && sh.piFactor && total > 0 && h('div', { className: 'mt-3 p-2 rounded text-[11px] font-mono',
                  style: { background: isDark || isContrast ? 'rgba(56,189,248,0.08)' : '#ffffff', border: '1px solid ' + (isDark || isContrast ? 'rgba(56,189,248,0.3)' : '#bae6fd'), color: body } },
                  sh.formula + '  →  π ≈ ' + sh.piFactor + ' × ' + ratio.toFixed(4) + ' = ' + (sh.piFactor * ratio).toFixed(4))
              );
            })(),

            d.mode === 'birthday' && (function() {

              var _bn = d.birthdayN || 23;

              var _bprob = (function(n) {

                var p = 1;

                for (var _bi = 0; _bi < n && _bi < 365; _bi++) p *= (365 - _bi) / 365;

                return 1 - p;

              })(_bn);

              var _bpct = (_bprob * 100).toFixed(1);

              var _bColor = parseFloat(_bpct) >= 50 ? '#166534' : '#b45309';

              var _bTable = [2, 5, 10, 15, 20, 23, 30, 40, 50, 57].map(function(nb) {

                var pb = 1;

                for (var _bj = 0; _bj < nb && _bj < 365; _bj++) pb *= (365 - _bj) / 365;

                return { n: nb, pct: ((1 - pb) * 100).toFixed(1), over50: (1 - pb) >= 0.5 };

              });

              return React.createElement("div", { className: "mb-4 rounded-xl p-4", style: { background: isDark||isContrast?'rgba(251,191,36,0.06)':'linear-gradient(135deg,#fffbeb,#fff7ed)', border: '2px solid '+(isDark||isContrast?'rgba(251,191,36,0.3)':'#fde68a') } },

                React.createElement("p", { className: "text-sm font-black mb-1", style: { color: isDark||isContrast?'#fbbf24':'#b45309' } }, t('stem.probability.the_birthday_paradox', '🎂 The Birthday Paradox')),

                React.createElement("p", { className: "text-xs italic mb-3", style: { color: isDark||isContrast?'#fde68a':'#92400e' } }, t('stem.probability.in_a_room_of_just_23_people_there_s_a_', 'In a room of just 23 people, there’s a >50% chance two share a birthday. Drag the slider to explore!')),

                React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                  React.createElement("span", { className: "text-xs font-bold w-24 flex-shrink-0", style: { color: isDark||isContrast?'#fbbf24':'#b45309' } }, '👥 ' + _bn + ' people'),

                  React.createElement("input", { type: "range", min: 2, max: 70, value: _bn, 'aria-label': t('stem.probability.number_of_people_in_room', 'Number of people in room'), onChange: function(e) { upd('birthdayN', parseInt(e.target.value)); }, className: "min-w-0 flex-1", style: { accentColor: '#f59e0b' } })

                ),

                React.createElement("div", { className: "flex flex-col items-center mb-4 py-3 rounded-xl", style: { background: isDark||isContrast?'rgba(251,191,36,0.1)':'rgba(251,191,36,0.12)', transition:'background 0.3s' } },

                  React.createElement("span", { className: "text-5xl font-black", style: { color: _bColor, transition:'color 0.3s' } }, _bpct + '%'),

                  React.createElement("span", { className: "text-xs mt-1", style: { color: _muted } }, 'P(≥2 share a birthday among ' + _bn + ' people)'),

                  React.createElement("div", { className: "w-full mt-2 px-4" },

                    React.createElement("div", { className: "h-3 rounded-full overflow-hidden relative", style: { background: isDark||isContrast?'rgba(255,255,255,0.1)':'#fef3c7' } },

                      React.createElement("div", { style: { width: Math.min(parseFloat(_bpct), 100) + '%', height: '100%', background: parseFloat(_bpct) >= 50 ? 'linear-gradient(to right, #f59e0b, #22c55e)' : '#f59e0b', borderRadius: '9999px', transition: 'width 0.4s ease' } }),

                      React.createElement("div", { style: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(220,38,38,0.5)' }, title: t('stem.probability.50_threshold', '50% threshold') })

                    )

                  )

                ),

                React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3 justify-center" },

                  [10, 23, 30, 50, 57].map(function(mn) {

                    var mpb = 1;

                    for (var _mk = 0; _mk < mn && _mk < 365; _mk++) mpb *= (365 - _mk) / 365;

                    return React.createElement("button", { "aria-label": "Set group size to " + mn + " people", key: mn, onClick: function() { upd('birthdayN', mn); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all", style: { background: _bn === mn ? '#b45309' : (isDark||isContrast?'rgba(251,191,36,0.1)':'#fef9c3'), color: _bn === mn ? '#fff' : (isDark||isContrast?'#fbbf24':'#92400e'), border: '1px solid '+(isDark||isContrast?'rgba(251,191,36,0.2)':'#fde68a'), boxShadow: _bn === mn ? '0 2px 8px rgba(180,83,9,0.3)' : 'none' } }, 'n=' + mn + ' → ' + ((1 - mpb) * 100).toFixed(0) + '%');

                  })

                ),

                React.createElement("div", { className: "rounded-lg overflow-hidden mb-3", style: { border: '1px solid '+(isDark||isContrast?'rgba(251,191,36,0.2)':'#fde68a') } },

                  React.createElement("table", { className: "w-full text-[11px]" },

                    React.createElement("caption", { className: "sr-only" }, t('stem.probability.probability_data_table', "probability data table")), React.createElement("thead", null, React.createElement("tr", { style: { background: isDark||isContrast?'rgba(251,191,36,0.15)':'#fef9c3' } },

                      React.createElement("th", { scope: "col", className: "px-3 py-1.5 text-left font-bold", style:{color:isDark||isContrast?'#fbbf24':'#b45309'} }, t('stem.probability.people_n', 'People (n)')),

                      React.createElement("th", { scope: "col", className: "px-3 py-1.5 text-right font-bold", style:{color:isDark||isContrast?'#fbbf24':'#b45309'} }, t('stem.probability.p_shared_birthday', 'P(shared birthday)'))

                    )),

                    React.createElement("tbody", null,

                      _bTable.map(function(row, ri) {

                        return React.createElement("tr", { key: row.n, style: { background: _bn === row.n ? (isDark||isContrast?'rgba(251,191,36,0.12)':'rgba(251,191,36,0.1)') : (ri%2===0?(isDark||isContrast?'rgba(255,255,255,0.02)':'#fffbeb'):'transparent') } },

                          React.createElement("td", { className: "px-3 py-1 font-bold font-mono", style:{color:_bn===row.n?'#b45309':_text} }, row.n + (_bn===row.n?' ◄':'')),

                          React.createElement("td", { className: "px-3 py-1 text-right font-bold font-mono", style:{color:row.over50?'#166534':'#b45309'} }, row.pct + '%')

                        );

                      })

                    )

                  )

                ),

                React.createElement("p", { className: "text-[11px] italic p-2 rounded-lg", style: { background: isDark||isContrast?'rgba(251,191,36,0.05)':'rgba(251,191,36,0.07)', color: isDark||isContrast?'#fde68a':'#92400e' } },

                  '📚 P = 1 − (365 × 364 × … × (366−n)) ÷ 365ⁿ — ' + _bn + ' people = ' + Math.round(_bn*(_bn-1)/2) + ' unique pairs. More pairs = more chances!'

                ),

                // ── Visual room simulator ──
                // Students see N silhouettes with random birthdays. Matching
                // birthdays get the same color + a connecting outline so the
                // pairing is impossible to miss. The math says it; this shows it.
                (function() {
                  var sample = d.birthdaySample;
                  // Lazy-init / re-init when N changes or no sample exists
                  var needsResample = !sample || sample.length !== _bn;
                  if (needsResample) {
                    var s = [];
                    for (var bi = 0; bi < _bn; bi++) s.push(Math.floor(Math.random() * 365));
                    sample = s;
                    // Defer state-set so we don't loop inside render
                    setTimeout(function() { upd('birthdaySample', s); }, 0);
                  }
                  // Find groups of matching birthdays
                  var groups = {};
                  sample.forEach(function(bday, idx) {
                    if (!groups[bday]) groups[bday] = [];
                    groups[bday].push(idx);
                  });
                  var matchGroups = Object.keys(groups).filter(function(k) { return groups[k].length >= 2; });
                  var anyMatch = matchGroups.length > 0;
                  // Color palette for match groups
                  var matchColors = ['#991b1b', '#166534', '#6b21a8', '#9a3412', '#155e75', '#9d174d', '#3f6212', '#581c87'];
                  function colorForBday(idx) {
                    var bday = sample[idx];
                    if (groups[bday].length < 2) return null;
                    var gi = matchGroups.indexOf(String(bday));
                    return matchColors[gi % matchColors.length];
                  }
                  // Convert day-of-year to month/day for display
                  function dayLabel(day) {
                    // `dt`, not `d`: `d` is the tool-data object for this whole
                    // render, and a var of that name here would shadow it for the
                    // entire function. Harmless while this body ignores tool data,
                    // a silent wrong-object bug the moment someone touches it.
                    var dt = new Date(2025, 0, day + 1); // arbitrary leap-free year
                    return (dt.getMonth() + 1) + '/' + dt.getDate();
                  }
                  function resample() {
                    sfxProbClick();
                    var s = [];
                    for (var bi = 0; bi < _bn; bi++) s.push(Math.floor(Math.random() * 365));
                    upd('birthdaySample', s);
                  }
                  function runMany() {
                    sfxProbClick();
                    var matched = 0;
                    // `ti`, not `t`: `t` is the translation function, and `var t`
                    // hoists over this entire function — any t('key','English')
                    // added here later would throw "t is not a function".
                    for (var ti = 0; ti < 100; ti++) {
                      var seen = {};
                      var hit = false;
                      for (var bi = 0; bi < _bn; bi++) {
                        var bd = Math.floor(Math.random() * 365);
                        if (seen[bd]) { hit = true; break; }
                        seen[bd] = 1;
                      }
                      if (hit) matched++;
                    }
                    var prev = d.birthdayBatch || { runs: 0, matches: 0 };
                    upd('birthdayBatch', { runs: prev.runs + 100, matches: prev.matches + matched });
                    if (matched > 0) sfxProbSuccess();
                  }
                  function resetBatch() {
                    sfxProbClick();
                    upd('birthdayBatch', { runs: 0, matches: 0 });
                  }
                  // Grid sizing — for up to 70 people, 10 columns is comfortable
                  var cols = _bn <= 20 ? Math.min(_bn, 10) : 10;
                  var batch = d.birthdayBatch || { runs: 0, matches: 0 };
                  var batchPct = batch.runs > 0 ? Math.round(batch.matches / batch.runs * 100) : null;

                  return React.createElement('div', { className: 'mt-3 rounded-xl p-3', style: { background: isDark||isContrast?'rgba(251,191,36,0.04)':'#fffbeb', border: '1px solid ' + (isDark||isContrast?'rgba(251,191,36,0.2)':'#fde68a') } },
                    React.createElement('div', { className: 'flex items-center justify-between mb-2 flex-wrap gap-2' },
                      React.createElement('span', { className: 'text-[11px] font-bold uppercase tracking-wider', style: { color: isDark||isContrast?'#fbbf24':'#b45309' } }, t('stem.probability.simulate_the_room', '🎂 Simulate the Room')),
                      anyMatch
                        ? React.createElement('span', { className: 'text-[11px] font-bold px-2 py-1 rounded-full', style: { background: '#15803d', color: '#fff' } }, '✨ ' + matchGroups.length + ' match' + (matchGroups.length > 1 ? 'es' : '') + ' found!')
                        : React.createElement('span', { className: 'text-[11px] font-bold px-2 py-1 rounded-full', style: { background: '#fbbf24', color: '#000' } }, t('stem.probability.no_matches_this_time', 'No matches this time'))
                    ),
                    // Avatar grid
                    React.createElement('div', { className: 'mb-2', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(42px, 1fr))', gap: '4px' } },
                      sample.map(function(bday, idx) {
                        var mColor = colorForBday(idx);
                        var matched = mColor !== null;
                        return React.createElement('div', {
                          key: 'p-' + idx,
                          className: 'flex flex-col items-center p-1 rounded-md text-[10px] font-mono transition',
                          style: {
                            background: matched ? mColor + '33' : (isDark||isContrast?'rgba(255,255,255,0.04)':'#fff'),
                            border: matched ? '2px solid ' + mColor : '1px solid ' + (isDark||isContrast?'rgba(255,255,255,0.1)':'#fde68a'),
                            boxShadow: matched ? '0 0 8px ' + mColor + '60' : 'none'
                          },
                          title: 'Person ' + (idx + 1) + ': born ' + dayLabel(bday) + (matched ? ' (MATCH)' : '')
                        },
                          React.createElement('div', { style: { fontSize: '20px', lineHeight: 1, filter: matched ? 'none' : 'grayscale(0.4)' } }, '🧑'),
                          React.createElement('div', { style: { color: matched ? mColor : (isDark||isContrast?'#fde68a':'#92400e'), fontWeight: matched ? 800 : 600 } }, dayLabel(bday))
                        );
                      })
                    ),
                    // Action buttons
                    React.createElement('div', { className: 'flex flex-wrap gap-2 items-center' },
                      React.createElement('button', {
                        onClick: resample,
                        className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition',
                        style: { background: '#f59e0b', color: '#451a03' },
                        'aria-label': t('stem.probability.re_randomize_all_birthdays', 'Re-randomize all birthdays')
                      }, t('stem.probability.resample', '🎲 Resample')),
                      React.createElement('button', {
                        onClick: runMany,
                        className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition',
                        style: { background: '#15803d', color: '#fff' },
                        'aria-label': t('stem.probability.run_100_simulations_of_this_room_size', 'Run 100 simulations of this room size')
                      }, t('stem.probability.run_100_rooms', '⚡ Run 100 rooms')),
                      batch.runs > 0 && React.createElement('div', { className: 'flex-1 text-[11px]', style: { color: isDark||isContrast?'#fde68a':'#92400e' } },
                        React.createElement('span', { className: 'font-bold' }, '📊 ' + batch.matches + ' / ' + batch.runs + ' rooms had a match'),
                        React.createElement('span', { className: 'ml-2 font-mono font-bold', style: { color: isDark||isContrast?'#86efac':'#166534' } }, '(' + batchPct + '%)'),
                        React.createElement('span', { className: 'ml-1 italic' }, '— theory says ' + _bpct + '%')
                      ),
                      batch.runs > 0 && React.createElement('button', {
                        onClick: resetBatch,
                        className: 'px-2 py-1 rounded-md text-[10px] font-bold transition',
                        style: { background: '#fee2e2', color: '#991b1b' },
                        'aria-label': t('stem.probability.reset_simulation_counts', 'Reset simulation counts')
                      }, '↻')
                    ),
                    React.createElement('p', { className: 'text-[10px] italic mt-2 text-center', style: { color: isDark||isContrast?'#fcd34d':'#b45309' } },
                      t('stem.probability.each_has_a_random_birthday_same_color_', 'Each 🧑 has a random birthday. Same color + glow = matching pair. Resample to see how often matches appear.')
                    )
                  );
                })()

              );

            })(),

            // Visual result display (hidden in tree mode)

            d.mode !== 'tree' && d.mode !== 'birthday' && d.mode !== 'monty' && d.mode !== 'galton' && d.mode !== 'volume3d' && d.mode !== 'pi' && d.mode !== 'galton' && React.createElement("div", { key: 'result-' + (d.animTick || 0), className: "flex items-center justify-center gap-6 mb-4 py-4 rounded-xl", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'linear-gradient(to bottom, #f5f3ff, #fff)', border: '2px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.25)' : '#ddd6fe'), animation: (d.animTick || 0) > 0 ? 'resultPop 0.35s ease-out' : 'none' } },

              d.mode === 'coin' && React.createElement("div", { style: { animation: (d.animTick||0)>0?'coinFlip 0.42s cubic-bezier(0.25,0.46,0.45,0.94)':'none', transformOrigin:'center' } }, coinSvg(d.lastResult || 'H')),

              d.mode === 'dice' && React.createElement("div", { style: { animation: (d.animTick||0)>0?'diceRoll 0.38s cubic-bezier(0.34,1.3,0.64,1)':'none', transformOrigin:'center' } }, diceFace(d.lastResult || 1, 80, diceSides)),
              d.mode === 'dice2' && React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                React.createElement("div", { style: { animation: (d.animTick||0)>0?'diceRoll 0.38s cubic-bezier(0.34,1.3,0.64,1)':'none', transformOrigin:'center' } },
                  diceFace((d._lastPair && d._lastPair[0]) || 1, 60, diceSides)
                ),
                React.createElement("span", { style: { fontSize: 28, fontWeight: 900, color: _accent } }, '+'),
                React.createElement("div", { style: { animation: (d.animTick||0)>0?'diceRoll 0.38s cubic-bezier(0.34,1.3,0.64,1) 0.06s':'none', transformOrigin:'center' } },
                  diceFace((d._lastPair && d._lastPair[1]) || 1, 60, diceSides)
                ),
                React.createElement("span", { style: { fontSize: 28, fontWeight: 900, color: _accent } }, '='),
                React.createElement("span", { style: { fontSize: 36, fontWeight: 900, color: _accent, minWidth: 50, textAlign: 'center' } }, d.lastResult || (2))
              ),

              d.mode === 'spinner' && spinnerSvg(d.lastResult, d.animTick),

              d.mode === 'sports' && React.createElement("div", { style: { animation: (d.animTick||0)>0?'sportBounce 0.4s ease-out':'none' } }, sportVisual(d.lastResult)),

              d.mode === 'custom' && React.createElement("div", { className: "flex flex-col items-center gap-1" },

                React.createElement("div", { style: { width: 48, height: 48, borderRadius: '50%', background: barColors[d.lastResult] || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' } },

                  React.createElement("span", { style: { fontSize: '20px', fontWeight: 'bold', color: '#fff' } }, d.lastResult ? d.lastResult[0] : '?')

                ),

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, d.lastResult || '?')

              ),

              d.mode === 'marbleBag' && React.createElement("div", { className: "flex flex-col items-center gap-2" },

                // Drawn marble with glow animation

                React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', background: barColors[d.lastResult] || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px ' + (barColors[d.lastResult] || '#e2e8f0') + '80, inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)', transition: 'all 0.3s ease', transform: d._mbShaking ? 'scale(1.2)' : 'scale(1)' } },

                  React.createElement("span", { style: { fontSize: '18px', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' } }, d.lastResult || '?')

                ),

                React.createElement("span", { className: "text-xs font-bold", style: { color: barColors[d.lastResult] || _muted } }, d.lastResult ? '\uD83C\uDFB1 Drew: ' + d.lastResult : 'Shake the bag!'),

                d.mbWithoutReplacement && d._mbRemaining && React.createElement("span", { className: "text-[11px] font-bold", style: { color: _accent } }, d._mbRemaining.length + ' left in bag')

              ),

              React.createElement("div", { className: "text-center" },

                React.createElement("p", { className: "text-3xl font-black text-violet-700 mb-1" }, d.lastResult != null ? String(d.lastResult) : '?'),

                React.createElement("p", { className: (isDark || isContrast) ? "text-xs text-slate-300" : "text-xs text-slate-600" }, d.lastResult != null ? 'Last result' : 'Click to start!')

              )

            ),

            // ── Two-Event Tree Diagram ──
            d.mode === 'tree' && (function() {
              var _treeMode = d.treeEventMode || 'coin';
              var _treeModes = [['coin','\uD83E\uDE99 Coin'],['dice','\uD83C\uDFB2 Dice (1-6)'],['sports','\uD83C\uDFC6 Sports'],['custom','\u2699\uFE0F Custom'],['bagNoReplacement','\uD83C\uDFB1 Bag (no replacement)']];
              var _treeIsDependent = _treeMode === 'bagNoReplacement';
              var _dependentTree = _treeIsDependent ? probabilityWithoutReplacementTree(rawCustomOutcomes) : null;
              var _treeOutcomes;
              if (_treeMode === 'coin') { _treeOutcomes = [{label:'H',prob:0.5,color:'#fbbf24'},{label:'T',prob:0.5,color: 'var(--allo-stem-text-soft, #94a3b8)'}]; }
              else if (_treeMode === 'dice') { _treeOutcomes = [1,2,3,4,5,6].map(function(n,i){ return {label:String(n),prob:1/6,color:['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'][i]}; }); }
              else if (_treeMode === 'sports') { _treeOutcomes = activeSport.outcomes.map(function(o,i){ return {label:o,prob:activeSport.probs[i],color:activeSport.colors[i]}; }); }
              else if (_treeIsDependent) { _treeOutcomes = _dependentTree.outcomes; }
              else { _treeOutcomes = customOutcomes.map(function(o){ return {label:o.label,prob:o.prob,color:o.color}; }); }
              function _treeTextOn(background) {
                var match = String(background || '').match(/#([0-9a-f]{6})/i);
                if (!match) return '#111827';
                var rgb = [0, 2, 4].map(function(offset) {
                  var channel = parseInt(match[1].slice(offset, offset + 2), 16) / 255;
                  return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
                });
                var luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
                return luminance > 0.179 ? '#111827' : '#ffffff';
              }
              function _treePercent(probability) {
                return (Math.max(0, probability || 0) * 100).toFixed(1) + '%';
              }
              var _treeReady = _treeIsDependent ? _dependentTree.valid : (_treeMode !== 'custom' || customModel.valid);
              var _treeReason = _treeIsDependent ? _dependentTree.reason : (_treeMode === 'custom' ? customModel.reason : '');
              var _pairs = [];
              var _treeBranches;
              if (_treeIsDependent) {
                _treeBranches = _dependentTree.branches;
                _pairs = _dependentTree.paths.slice();
              } else {
                _treeBranches = _treeOutcomes.map(function(first, firstIndex) {
                  var branchPaths = _treeOutcomes.map(function(second, secondIndex) {
                    var jointProbability = first.prob * second.prob;
                    var path = {
                      firstIndex: firstIndex, secondIndex: secondIndex,
                      first: first, second: second,
                      firstProbability: first.prob,
                      conditionalProbability: second.prob,
                      jointProbability: jointProbability,
                      impossible: jointProbability === 0
                    };
                    _pairs.push(path);
                    return path;
                  });
                  return { firstIndex: firstIndex, outcome: first, probability: first.prob, paths: branchPaths };
                });
              }
              var _oneOfEach = null;
              if (_treeIsDependent && _treeOutcomes.length === 2 && _treeReady) {
                var _forward = _pairs.find(function(path) { return path.firstIndex === 0 && path.secondIndex === 1; });
                var _reverse = _pairs.find(function(path) { return path.firstIndex === 1 && path.secondIndex === 0; });
                if (_forward && _reverse) {
                  _oneOfEach = {
                    forward: _forward,
                    reverse: _reverse,
                    numerator: _forward.jointNumerator + _reverse.jointNumerator,
                    denominator: _forward.jointDenominator,
                    probability: _forward.jointProbability + _reverse.jointProbability
                  };
                }
              }
              return React.createElement("section", { role: "region", "aria-labelledby": "prob-tree-heading", className: "min-w-0 mb-4 rounded-xl p-4", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.06)' : '#faf5ff', border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.25)' : '#ddd6fe') } },
                React.createElement("h3", { id: "prob-tree-heading", className: "text-xs font-bold uppercase tracking-wider mb-1", style: { color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, t('stem.probability.two_event_compound_probability_tree', '\uD83C\uDF33 Two-Event Compound Probability Tree')),
                React.createElement("p", { className: "text-[11px] mb-3", style: { color: isDark||isContrast?'#cbd5e1':'#475569' } }, 'Compare independent events with dependent draws from a finite bag. Every path records first outcome, second outcome, and its ordered joint probability.'),
                React.createElement("p", { className: "text-[11px] font-bold mb-1", style: { color: isDark||isContrast?'#ddd6fe':'#5b21b6' } }, 'Choose a probability tree model'),
                React.createElement("div", { role: "group", "aria-label": "Choose a probability tree model", className: "flex flex-wrap gap-1 mb-3" },
                  _treeModes.map(function(pair){ return React.createElement("button", { type: "button", "aria-pressed": _treeMode===pair[0], key: pair[0], onClick: function(){ upd('treeEventMode', pair[0]); }, className: "px-3 py-1 rounded-lg text-xs font-bold transition-all", style: { background: _treeMode===pair[0] ? (isDark||isContrast?'#7c3aed':'#6d28d9') : (isDark||isContrast?'rgba(139,92,246,0.1)':'#ede9fe'), color: _treeMode===pair[0] ? '#fff' : (isDark||isContrast?'#c4b5fd':'#6d28d9') } }, pair[1]); })
                ),
                _treeMode === 'sports' && React.createElement("p", { className: "text-[11px] italic mb-2", style: { color: isDark||isContrast?'#a5b4fc':'#6d28d9' } }, '\uD83C\uDFC6 Using: ' + activeSport.label + ' \u2014 ' + activeSport.desc),
                _treeIsDependent && React.createElement("div", { role: "note", className: "mb-3 rounded-lg p-3 text-[11px] leading-relaxed break-words", style: { background: isDark||isContrast?'rgba(14,165,233,0.08)':'#f0f9ff', border: '1px solid ' + (isDark||isContrast?'rgba(56,189,248,0.3)':'#bae6fd'), color: isDark||isContrast?'#bae6fd':'#075985', overflowWrap: 'anywhere' } },
                  React.createElement("strong", null, 'Without Replacement \u2014 finite bag: '),
                  _treeOutcomes.map(function(outcome) { return outcome.count + ' ' + outcome.label; }).join(', '),
                  '. The bag starts full for this two-draw experiment. The first item stays out for draw 2, so the denominator changes from ' + _dependentTree.total + ' to ' + _dependentTree.secondDenominator + '.'
                ),
                !_treeReady && React.createElement("div", { role: "alert", className: "mb-3 rounded-lg p-3 text-xs font-bold", style: { background: isDark||isContrast?'rgba(239,68,68,0.1)':'#fef2f2', border: '1px solid ' + (isDark||isContrast?'rgba(248,113,113,0.35)':'#fecaca'), color: isDark||isContrast?'#fecaca':'#991b1b' } }, _treeReason || 'This probability model is not ready.'),
                _treeReady && React.createElement("div", { "aria-hidden": "true", className: "grid grid-cols-1 gap-3" },
                  _treeBranches.map(function(branch) {
                    var first = branch.outcome;
                    var firstFormula = _treeIsDependent ? branch.numerator + '/' + branch.denominator + ' = ' + _treePercent(branch.probability) : _treePercent(branch.probability);
                    return React.createElement("div", { key: 'tree-first-' + branch.firstIndex, className: "min-w-0 rounded-xl p-3", style: { background: isDark||isContrast?'rgba(15,23,42,0.52)':'#ffffff', border: '1px solid ' + (first.color || '#7c3aed') } },
                      React.createElement("div", { className: "flex min-w-0 flex-wrap items-center justify-between gap-2 mb-2" },
                        React.createElement("span", { className: "min-w-0 max-w-full rounded-lg px-3 py-1.5 text-xs font-black break-words", style: { background: first.color || '#7c3aed', color: _treeTextOn(first.color || '#7c3aed'), overflowWrap: 'anywhere' } }, 'First: ' + first.label),
                        React.createElement("span", { className: "min-w-0 max-w-full text-[11px] font-bold font-mono break-words", style: { color: isDark||isContrast?'#e2e8f0':'#334155', overflowWrap: 'anywhere' } }, 'P(first ' + first.label + ') = ' + firstFormula)
                      ),
                      React.createElement("div", { className: "grid min-w-0 gap-2", style: { gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%, 150px),1fr))' } },
                        branch.paths.map(function(path) {
                          var conditionalText = _treeIsDependent
                            ? path.conditionalNumerator + '/' + path.conditionalDenominator + ' = ' + _treePercent(path.conditionalProbability)
                            : _treePercent(path.conditionalProbability);
                          var jointText = _treeIsDependent
                            ? path.firstNumerator + '/' + path.firstDenominator + ' \u00d7 ' + path.conditionalNumerator + '/' + path.conditionalDenominator + ' = ' + path.jointNumerator + '/' + path.jointDenominator + ' = ' + _treePercent(path.jointProbability)
                            : _treePercent(path.firstProbability) + ' \u00d7 ' + _treePercent(path.conditionalProbability) + ' = ' + _treePercent(path.jointProbability);
                          return React.createElement("div", { key: 'tree-path-' + path.firstIndex + '-' + path.secondIndex, className: "min-w-0 rounded-lg p-2 text-[10px]", style: { background: path.impossible ? (isDark||isContrast?'rgba(239,68,68,0.08)':'#fff7f7') : (isDark||isContrast?'rgba(255,255,255,0.05)':'#f8fafc'), border: '1px solid ' + (path.second.color || '#94a3b8'), color: isDark||isContrast?'#e2e8f0':'#1e293b' } },
                            React.createElement("div", { className: "font-black break-words", style: { overflowWrap: 'anywhere' } }, 'Second: ' + path.second.label),
                            React.createElement("div", { className: "mt-1 font-mono break-words" }, _treeIsDependent ? 'P(' + path.second.label + '|' + path.first.label + ') = ' + conditionalText : 'P(second ' + path.second.label + ') = ' + conditionalText),
                            React.createElement("div", { className: "mt-1 font-mono break-words" }, 'P(' + path.first.label + ' \u2192 ' + path.second.label + ') = ' + jointText),
                            path.impossible && React.createElement("div", { className: "mt-1 font-black", style: { color: isDark||isContrast?'#fca5a5':'#b91c1c' } }, 'Impossible \u00b7 0%')
                          );
                        })
                      )
                    );
                  })
                ),
                React.createElement("div", { className: "mt-3 p-3 rounded-lg", style: { background: isDark||isContrast?'rgba(255,255,255,0.04)':'rgba(139,92,246,0.04)', border: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.15)':'#ddd6fe') } },
                  React.createElement("p", { className: "text-[11px] font-bold mb-2", style: { color: isDark||isContrast?'#c4b5fd':'#7c3aed' } }, '\uD83D\uDCCA ' + _pairs.length + ' ordered joint paths'),
                  React.createElement("p", { className: "text-[11px] mt-2 italic", style: { color: isDark||isContrast?'#94a3b8':'#475569' } },
                    _treeIsDependent
                      ? '\uD83D\uDCA1 Dependent draws: P(A then B) = P(A) \u00d7 P(B|A). Removing the first item changes the probability on the second branch.'
                      : t('stem.probability.multiply_the_two_probabilities_to_get_', '\uD83D\uDCA1 Independent events: P(A then B) = P(A) \u00d7 P(B). The second branch does not change after the first outcome.')
                  ),
                  _oneOfEach && React.createElement("div", { role: "note", className: "mt-3 rounded-lg p-2 text-[11px] font-bold break-words", style: { background: isDark||isContrast?'rgba(16,185,129,0.08)':'#ecfdf5', border: '1px solid ' + (isDark||isContrast?'rgba(52,211,153,0.3)':'#a7f3d0'), color: isDark||isContrast?'#a7f3d0':'#065f46', overflowWrap: 'anywhere' } },
                    'One of each can happen in either order, so add both paths: P(' + _treeOutcomes[0].label + ' \u2192 ' + _treeOutcomes[1].label + ') + P(' + _treeOutcomes[1].label + ' \u2192 ' + _treeOutcomes[0].label + ') = ' + _treePercent(_oneOfEach.forward.jointProbability) + ' + ' + _treePercent(_oneOfEach.reverse.jointProbability) + ' = ' + _oneOfEach.numerator + '/' + _oneOfEach.denominator + ' = ' + _treePercent(_oneOfEach.probability) + '.'
                  ),
                  _treeReady && React.createElement("details", { className: "mt-3" },
                    React.createElement("summary", { className: "cursor-pointer text-[11px] font-bold", style: { color: isDark||isContrast?'#ddd6fe':'#5b21b6' } }, 'Ordered path data table (' + _pairs.length + ' paths)'),
                    React.createElement("div", { className: "mt-2 overflow-x-auto", tabIndex: 0, role: "region", "aria-label": "Scrollable ordered probability path table" },
                      React.createElement("table", { className: "w-full border-collapse text-left text-[10px]", style: { minWidth: '580px', color: isDark||isContrast?'#e2e8f0':'#1e293b' } },
                        React.createElement("caption", { className: "sr-only" }, _treeIsDependent ? 'All ordered outcomes for two draws without replacement' : 'All ordered outcomes for two independent events'),
                        React.createElement("thead", null,
                          React.createElement("tr", null,
                            ['First outcome', 'P(first)', 'Second outcome', _treeIsDependent ? 'P(second|first)' : 'P(second)', 'Ordered joint probability'].map(function(label) {
                              return React.createElement("th", { key: label, scope: "col", className: "p-2 font-black", style: { borderBottom: '1px solid ' + _border } }, label);
                            })
                          )
                        ),
                        React.createElement("tbody", null,
                          _pairs.map(function(path) {
                            var firstValue = _treeIsDependent ? path.firstNumerator + '/' + path.firstDenominator + ' = ' + _treePercent(path.firstProbability) : _treePercent(path.firstProbability);
                            var conditionalValue = _treeIsDependent ? path.conditionalNumerator + '/' + path.conditionalDenominator + ' = ' + _treePercent(path.conditionalProbability) : _treePercent(path.conditionalProbability);
                            var jointValue = _treeIsDependent ? path.jointNumerator + '/' + path.jointDenominator + ' = ' + _treePercent(path.jointProbability) : _treePercent(path.jointProbability);
                            return React.createElement("tr", { key: 'tree-table-' + path.firstIndex + '-' + path.secondIndex },
                              React.createElement("th", { scope: "row", className: "p-2 font-bold", style: { borderBottom: '1px solid ' + _border } }, path.first.label),
                              React.createElement("td", { className: "p-2 font-mono", style: { borderBottom: '1px solid ' + _border } }, firstValue),
                              React.createElement("td", { className: "p-2 font-bold", style: { borderBottom: '1px solid ' + _border } }, path.second.label),
                              React.createElement("td", { className: "p-2 font-mono", style: { borderBottom: '1px solid ' + _border } }, conditionalValue),
                              React.createElement("td", { className: "p-2 font-mono", style: { borderBottom: '1px solid ' + _border } }, 'P(' + path.first.label + ' then ' + path.second.label + ') = ' + jointValue + (path.impossible ? ' (impossible)' : ''))
                            );
                          })
                        )
                      )
                    )
                  )
                )
              );
            })(),

            // ── Outcome strip (last 20 results) ──
            // Visible streaks and patterns are pedagogically important: students
            // need to FEEL that "5 heads in a row" or "three Reds in a row" is
            // normal random texture, not evidence of a biased system. The strip
            // makes that pattern visible at a glance for coin/dice/spinner/sports/
            // marble/custom modes. Skipped for pi (uses its own scatter plot),
            // tree/birthday/monty/galton (have their own visuals).
            d.mode !== 'tree' && d.mode !== 'birthday' && d.mode !== 'monty' && d.mode !== 'galton' && d.mode !== 'volume3d' && d.mode !== 'pi' && (d.results || []).length > 0 && (function() {
              var last20 = (d.results || []).slice(-20);
              // Color resolver — maps an outcome label to a display color per mode.
              function colorFor(label) {
                if (d.mode === 'coin') return label === 'H' ? '#fbbf24' : '#94a3b8'; // gold heads / silver tails
                if (d.mode === 'dice') return ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#0891b2', '#84cc16', '#a855f7', '#f43f5e', '#0ea5e9', '#fbbf24', '#6366f1', '#10b981', '#dc2626', '#7c3aed', '#059669', '#9333ea', '#d97706'][(label - 1) % 20];
                if (d.mode === 'dice2') {
                  // Peak in the middle (most common sum) → red; tails (least common) → blue
                  var mid = (diceSides || 6) + 1;
                  var dist = Math.abs(label - mid);
                  // Must match renderTwoDiceGrid's ramp or the same sum is one
                  // colour in the strip and another in the sample-space grid.
                  var maxDist = (diceSides || 6) - 1 || 1;
                  var hue = 220 - (dist / maxDist) * 220;  // 220 (blue) at extremes, 0 (red) at center
                  return 'hsl(' + Math.round(hue) + ', 70%, 55%)';
                }
                if (d.mode === 'spinner') return { 'Red': '#ef4444', 'Blue': '#3b82f6', 'Green': '#22c55e', 'Yellow': '#eab308' }[label] || '#94a3b8';
                if (d.mode === 'sports') {
                  // Sports outcomes get a gradient across hues
                  var idx = (activeSport.outcomes || []).indexOf(label);
                  return ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#a855f7'][idx % 5] || '#94a3b8';
                }
                // custom + marbleBag — read color from customOutcomes
                var co = (customOutcomes || []).find(function(o) { return o.label === label; });
                return co ? co.color: 'var(--allo-stem-text-soft, #94a3b8)';
              }
              function labelText(label) {
                if (d.mode === 'coin') return label;
                if (d.mode === 'dice') return String(label);
                return label.length > 2 ? label.charAt(0) : label;
              }
              return React.createElement('div', {
                className: 'rounded-xl p-2 mb-3',
                style: { background: isDark || isContrast ? 'rgba(139,92,246,0.06)' : '#faf5ff', border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.18)' : '#e9d5ff') },
                // role is required: on a bare div (role=generic) ARIA prohibits an
                // accessible name, so this label never reached assistive tech and
                // the strip — which is colour squares only — read as nothing.
                role: 'img',
                'aria-label': 'Last ' + last20.length + ' outcomes, oldest first: ' + last20.join(', ')
              },
                React.createElement('div', { className: 'flex items-center gap-2 flex-wrap' },
                  React.createElement('span', { className: 'text-[10px] font-bold uppercase tracking-wider', style: { color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, 'Last ' + last20.length + ':'),
                  React.createElement('div', { className: 'flex flex-wrap items-center gap-0.5' },
                    last20.map(function(r, idx) {
                      return React.createElement('span', {
                        key: 'strip-' + idx,
                        title: String(r),
                        style: {
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '20px', height: '20px',
                          borderRadius: '4px',
                          background: colorFor(r),
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                          textShadow: '0 1px 1px rgba(0,0,0,0.4)',
                          border: '1px solid rgba(0,0,0,0.15)'
                        }
                      }, labelText(r));
                    })
                  ),
                  React.createElement('span', { className: 'text-[10px] italic ml-auto', style: { color: isDark || isContrast ? '#a78bfa' : '#9333ea' } }, t('stem.probability.streaks_are_normal_random_texture', 'streaks are normal random texture'))
                )
              );
            })(),

            // ── Auto-Run Controls ──
            d.mode !== 'tree' && d.mode !== 'birthday' && d.mode !== 'monty' && d.mode !== 'galton' && d.mode !== 'volume3d' && React.createElement("div", { className: "flex flex-wrap gap-2 mb-3 justify-center items-center" },

              React.createElement("button", { "aria-label": d._autoRunning ? t('stem.probability.pause_auto_run', "Pause automatic simulation") : t('stem.probability.start_auto_run', "Start automatic simulation"), "aria-pressed": d._autoRunning ? "true" : "false",

                disabled: !customCanRun,
                onClick: function() {

                  if (!customCanRun) return;
                  if (_autoRun.interval) {

                    clearInterval(_autoRun.interval);

                    _autoRun.interval = null;

                    upd('_autoRunning', false);

                  } else {

                    upd('_autoRunning', true);

                    _autoRun.interval = setInterval(runTrialAuto, d._autoSpeed || 250);

                  }

                },

                className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed",

                style: { background: d._autoRunning ? '#ef4444' : _btnBg, color: '#fff', boxShadow: d._autoRunning ? '0 0 10px rgba(239,68,68,0.35)' : 'none' }

              }, d._autoRunning ? '\u23F8 Pause' : '\u25B6 Auto-Run'),

              [['Slow', 600], ['Normal', 250], ['Fast', 80], ['Turbo', 20]].map(function(pair) {

                return React.createElement("button", { "aria-label": "Set simulation speed to " + pair[0], key: pair[0], onClick: function() {

                  upd('_autoSpeed', pair[1]);

                  if (_autoRun.interval) {

                    clearInterval(_autoRun.interval);

                    _autoRun.interval = setInterval(runTrialAuto, pair[1]);

                  }

                }, className: "px-2.5 py-1 rounded text-[11px] font-bold transition-all", style: { background: (d._autoSpeed||250) === pair[1] ? _btnBg : (isDark||isContrast?'rgba(139,92,246,0.1)':'#f1f5f9'), color: (d._autoSpeed||250) === pair[1] ? '#fff' : _muted } }, pair[0]);

              }),

              d._autoRunning && React.createElement("span", { className: "text-[11px] font-mono font-bold " + ((typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? "" : "animate-pulse"), style:{color:'#22c55e'} }, '● Running — ' + d.trials + ' trials')

            ),

            // Trial buttons (hidden in tree mode)

            d.mode !== 'tree' && d.mode !== 'birthday' && d.mode !== 'monty' && d.mode !== 'galton' && d.mode !== 'volume3d' && React.createElement("div", { className: "flex gap-2 mb-4 justify-center flex-wrap" },

              [1, 10, 50, 100, 500].map(n => React.createElement("button", { "aria-label": "Run " + n + " trials", disabled: !customCanRun, key: n, onClick: () => runTrial(n), className: "px-4 py-2 bg-violet-100 text-violet-700 font-bold rounded-lg hover:bg-violet-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed" }, "+" + n)),

              React.createElement("button", { "aria-label": t('stem.probability.reset_all_trials', "Reset all trials"), onClick: resetTrials, className: "px-4 py-2 bg-red-50 text-red-700 font-bold rounded-lg hover:bg-red-100 text-sm" }, t('stem.probability.reset_2', "\uD83D\uDD04 Reset"))

            ),

            // Frequency bars

            d.trials > 0 && React.createElement("div", { className: "rounded-xl p-4 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, t('stem.probability.observed_vs_expected_frequencies', "\uD83D\uDCCA Observed vs Expected Frequencies")),

              React.createElement("div", { className: "space-y-2" },

                Object.keys(expected).map(k => {

                  const count = counts[k] || 0;

                  const pct = d.trials > 0 ? (count / d.trials * 100) : 0;

                  const expPct = expected[k] * 100;

                  return React.createElement("div", { key: k, className: "flex items-center gap-2" },

                    React.createElement("span", { className: "w-14 text-right text-sm font-bold", style: { color: _text } },

                      d.mode === 'coin' ? (k === 'H' ? '\uD83E\uDE99 H' : '\uD83E\uDE99 T') :

                        d.mode === 'dice' ? '\u2680 ' + k :

                          d.mode === 'sports' ? (activeSport.emoji[activeSport.outcomes.indexOf(k)] || '') + ' ' + k :

                            '\u25CF ' + k

                    ),

                    React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-7 overflow-hidden relative" },

                      React.createElement("div", { style: { width: (count / maxCount * 100) + '%', backgroundColor: barColors[k] || '#6366f1', height: '100%', borderRadius: '9999px', transition: 'width 0.3s' } }),

                      React.createElement("div", { style: { position: 'absolute', left: Math.min(expected[k] * d.trials / maxCount * 100, 100) + '%', top: 0, bottom: 0, width: '2px', backgroundColor: 'rgba(30,41,59,0.5)' }, title: 'Expected: ' + expPct.toFixed(1) + '%' })

                    ),

                    React.createElement("span", { className: "w-24 text-xs font-mono text-slate-600 text-right" }, count + " (" + pct.toFixed(1) + "%)"),

                    React.createElement("span", { className: "w-16 text-[11px] font-bold", style: { color: Math.abs(pct - expPct) < 3 ? (isDark||isContrast?'#86efac':'#047857') : Math.abs(pct - expPct) < 8 ? (isDark||isContrast?'#fcd34d':'#b45309') : (isDark||isContrast?'#fca5a5':'#b91c1c') } }, (pct > expPct ? '+' : '') + (pct - expPct).toFixed(1) + '%')

                  );

                })

              )

            ),

            // Convergence chart

            convHist.length > 1 && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } },

                "\uD83D\uDCC8 Convergence to Expected (" + (d.mode === 'coin' ? 'P(H)=50%' : d.mode === 'dice' ? 'P(1)=' + (100 / (d.diceSides || 6)).toFixed(1) + '%' : d.mode === 'dice2' ? 'P(' + convTrackedSum + ')=' + (100 / (d.diceSides || 6)).toFixed(1) + '%' : d.mode === 'pi' ? 'P(inside)=78.5%' : d.mode === 'sports' ? 'P(' + activeSport.outcomes[0] + ')=' + (activeSport.probs[0] * 100).toFixed(0) + '%' : (d.mode === 'custom' || d.mode === 'marbleBag') && customOutcomes[0] ? 'P(' + customOutcomes[0].label + ')=' + (customOutcomes[0].prob * 100).toFixed(0) + '%' : 'P(Red)=25%') + ")"

              ),

              (function () {
                // Auto-scale the y-window around the expected value so the Law of Large Numbers is
                // visible even for low-probability outcomes — a d20's 5% or a two-dice 2.8% line used
                // to hug the bottom of the fixed 0–100 axis. Center a band on the expected value and
                // map [yLo, yHi] onto the SVG's 0–100 height.
                var _pad = Math.max(convExpected * 1.2, 12);
                var yLo = Math.max(0, convExpected - _pad);
                var yHi = Math.min(100, convExpected + _pad);
                var _span = (yHi - yLo) || 1;
                var ymap = function (pct) { var c = Math.max(yLo, Math.min(yHi, pct)); return 100 - ((c - yLo) / _span) * 100; };
                return React.createElement("svg", { role: "img", 'aria-label': 'Convergence chart: observed ' + convHist[convHist.length - 1].pct.toFixed(1) + ' percent, expected ' + convExpected.toFixed(1) + ' percent after ' + d.trials + ' trials', viewBox: "0 0 400 100", className: "w-full", style: { maxHeight: '120px' } },
                  React.createElement("line", { x1: 0, y1: ymap(convExpected), x2: 400, y2: ymap(convExpected), stroke: "#22c55e", strokeWidth: 1, strokeDasharray: "4 2" }),
                  React.createElement("text", { x: 2, y: Math.max(8, ymap(convExpected) - 3), fill: "#22c55e", style: { fontSize: '7px', fontWeight: 'bold' } }, convExpected.toFixed(1) + '% expected'),
                  React.createElement("polyline", {
                    fill: "none", stroke: "#8b5cf6", strokeWidth: 2, style: { filter: 'drop-shadow(0 0 3px rgba(139,92,246,0.55))' },
                    // `pt`, not `h`: `h` is this render's React.createElement alias.
                    // These two bodies happen to spell out React.createElement, so
                    // the shadow was harmless — but it is a trap set for whoever
                    // edits them next.
                    points: convHist.map(function (pt, i) { var x = (i / Math.max(convHist.length - 1, 1)) * 400; return x + ',' + ymap(pt.pct); }).join(' ')
                  }),
                  convHist.slice(-5).map(function (pt, i) {
                    var idx = convHist.length - 5 + i;
                    if (idx < 0) return null;
                    var x = (idx / Math.max(convHist.length - 1, 1)) * 400;
                    return React.createElement("circle", { key: i, cx: x, cy: ymap(pt.pct), r: 2.5, fill: "#8b5cf6" });
                  }),
                  React.createElement("text", { x: 2, y: 8, fill: "#94a3b8", style: { fontSize: '6px' } }, yHi.toFixed(0) + '%'),
                  React.createElement("text", { x: 2, y: 99, fill: "#94a3b8", style: { fontSize: '6px' } }, yLo.toFixed(0) + '%'),
                  React.createElement("line", { x1: 0, y1: 100, x2: 400, y2: 100, stroke: "#e2e8f0", strokeWidth: 1 }),
                  React.createElement("text", { x: 380, y: 97, fill: "#94a3b8", style: { fontSize: '7px' }, textAnchor: "end" }, d.trials + ' trials')
                );
              })()

            ),

            // Sampling uncertainty: turn the convergence trace into an
            // interpretation task. A Wilson interval is robust for short runs
            // and rare outcomes, where the common p-hat +/- 1.96*SE shortcut
            // can produce impossible negative probabilities. With-replacement
            // is required because this binomial interval assumes independent
            // trials.
            ['coin', 'dice', 'dice2', 'spinner', 'sports', 'custom', 'marbleBag', 'pi'].indexOf(d.mode) >= 0 && samplingTrials >= 5 && React.createElement("section", {
              className: "rounded-xl p-3 mb-3",
              style: { background: _cardBg, border: '1px solid ' + _border },
              'aria-labelledby': 'probability-sampling-uncertainty-title'
            },
              React.createElement("div", { className: "flex items-start justify-between gap-2 flex-wrap mb-2" },
                React.createElement("div", null,
                  React.createElement("p", { id: 'probability-sampling-uncertainty-title', className: "text-[11px] font-bold uppercase tracking-wider", style: { color: _accent } },
                    t('stem.probability.sampling_uncertainty', '\uD83C\uDFAF Sampling Uncertainty')),
                  React.createElement("p", { className: "text-[11px] mt-0.5", style: { color: _muted } },
                    t('stem.probability.sampling_uncertainty_copy', 'How much of the observed difference could be ordinary random variation?'))
                ),
                React.createElement("span", { className: "text-[10px] font-bold px-2 py-1 rounded-full", style: { color: isDark || isContrast ? '#ddd6fe' : '#5b21b6', background: isDark || isContrast ? 'rgba(139,92,246,0.18)' : '#ede9fe', border: '1px solid ' + (isDark || isContrast ? 'rgba(196,181,253,0.35)' : '#c4b5fd') } },
                  t('stem.probability.wilson_95_interval', 'Wilson 95% interval'))
              ),
              !samplingIndependent
                ? React.createElement("div", { role: "note", className: "rounded-lg p-3 text-xs leading-relaxed", style: { background: isDark || isContrast ? 'rgba(251,191,36,0.08)' : '#fffbeb', border: '1px solid ' + (isDark || isContrast ? 'rgba(251,191,36,0.3)' : '#fde68a'), color: isDark || isContrast ? '#fde68a' : '#78350f' } },
                    React.createElement("strong", null, t('stem.probability.interval_paused', 'Interval paused: ')),
                    t('stem.probability.interval_requires_independent_draws', 'without-replacement pulls are dependent because every pull changes the next probability. Switch replacement on to use a binomial confidence interval; keep it off to study changing conditional odds.'))
                : (function() {
                    var trackedLabel = d.mode === 'coin' ? t('stem.probability.heads', 'Heads')
                      : d.mode === 'dice' ? t('stem.probability.face_one', 'face 1')
                      : d.mode === 'dice2' ? t('stem.probability.sum_label', 'sum') + ' ' + convTrackedSum
                      : d.mode === 'pi' ? t('stem.probability.inside_quarter_circle', 'inside the quarter circle')
                      : String(convTrackedKey);
                    var observedPct = samplingInterval.observed * 100;
                    var lowPct = samplingInterval.low * 100;
                    var highPct = samplingInterval.high * 100;
                    var expectedPct = samplingExpected * 100;
                    var meterLabel = trackedLabel + ': observed ' + samplingSuccesses + ' of ' + samplingTrials + ' (' + observedPct.toFixed(1) + ' percent); theoretical ' + expectedPct.toFixed(1) + ' percent; Wilson 95 percent interval ' + lowPct.toFixed(1) + ' to ' + highPct.toFixed(1) + ' percent.';
                    return React.createElement(React.Fragment, null,
                      React.createElement("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: 8 } },
                        [
                          { label: t('stem.probability.tracked_outcome', 'Tracked outcome'), value: trackedLabel, hint: samplingSuccesses + ' of ' + samplingTrials },
                          { label: t('stem.probability.observed_probability', 'Observed'), value: observedPct.toFixed(1) + '%', hint: t('stem.probability.from_this_run', 'from this run') },
                          { label: t('stem.probability.theoretical_probability', 'Theoretical'), value: expectedPct.toFixed(1) + '%', hint: t('stem.probability.from_the_model', 'from the model') },
                          { label: t('stem.probability.plausible_range', '95% interval'), value: lowPct.toFixed(1) + '-' + highPct.toFixed(1) + '%', hint: t('stem.probability.wilson_method', 'Wilson method') }
                        ].map(function(stat) {
                          return React.createElement("div", { key: stat.label, className: "rounded-lg p-2", style: { background: isDark || isContrast ? 'rgba(15,23,42,0.62)' : '#f8fafc', border: '1px solid ' + (isDark || isContrast ? 'rgba(148,163,184,0.2)' : '#e2e8f0') } },
                            React.createElement("div", { className: "text-[10px] font-bold uppercase tracking-wide", style: { color: _muted } }, stat.label),
                            React.createElement("div", { className: "text-sm font-black mt-0.5", style: { color: _text } }, stat.value),
                            React.createElement("div", { className: "text-[10px] mt-0.5", style: { color: _muted } }, stat.hint)
                          );
                        })
                      ),
                      React.createElement("div", { role: "img", 'aria-label': meterLabel, className: "mt-3", style: { position: 'relative', height: 36 } },
                        React.createElement("div", { style: { position: 'absolute', left: 0, right: 0, top: 14, height: 8, borderRadius: 999, background: isDark || isContrast ? 'rgba(148,163,184,0.18)' : '#e2e8f0' } }),
                        React.createElement("div", { style: { position: 'absolute', left: lowPct + '%', right: (100 - highPct) + '%', top: 11, height: 14, boxSizing: 'border-box', borderRadius: 999, background: samplingCompatible ? 'rgba(16,185,129,0.38)' : 'rgba(245,158,11,0.42)', border: '1px solid ' + (samplingCompatible ? '#10b981' : '#f59e0b') } }),
                        React.createElement("div", { title: 'Theoretical ' + expectedPct.toFixed(1) + '%', style: { position: 'absolute', left: Math.max(0.5, Math.min(99.5, expectedPct)) + '%', top: 5, bottom: 5, width: 2, transform: 'translateX(-1px)', background: isDark || isContrast ? '#fbbf24' : '#b45309' } }),
                        React.createElement("div", { title: 'Observed ' + observedPct.toFixed(1) + '%', style: { position: 'absolute', left: Math.max(3, Math.min(97, observedPct)) + '%', top: 9, width: 18, height: 18, transform: 'translateX(-9px)', borderRadius: '50%', background: '#7c3aed', border: '3px solid ' + (isDark || isContrast ? '#ede9fe' : '#ffffff'), boxShadow: '0 1px 5px rgba(30,41,59,0.35)' } })
                      ),
                      React.createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-1 text-[10px] mb-2", style: { color: _muted } },
                        React.createElement("span", null, React.createElement("span", { 'aria-hidden': 'true', style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#7c3aed', marginRight: 4, verticalAlign: '-1px' } }), t('stem.probability.observed_marker', 'Observed marker')),
                        React.createElement("span", null, React.createElement("span", { 'aria-hidden': 'true', style: { display: 'inline-block', width: 2, height: 11, background: isDark || isContrast ? '#fbbf24' : '#b45309', marginRight: 5, verticalAlign: '-2px' } }), t('stem.probability.theoretical_marker', 'Theoretical marker')),
                        React.createElement("span", null, React.createElement("span", { 'aria-hidden': 'true', style: { display: 'inline-block', width: 14, height: 8, borderRadius: 4, background: samplingCompatible ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.55)', marginRight: 4 } }), t('stem.probability.interval_band', '95% interval band'))
                      ),
                      React.createElement("div", { role: "note", className: "rounded-lg p-2 text-xs leading-relaxed", style: { background: samplingCompatible ? (isDark || isContrast ? 'rgba(16,185,129,0.08)' : '#ecfdf5') : (isDark || isContrast ? 'rgba(245,158,11,0.08)' : '#fffbeb'), border: '1px solid ' + (samplingCompatible ? (isDark || isContrast ? 'rgba(52,211,153,0.32)' : '#a7f3d0') : (isDark || isContrast ? 'rgba(251,191,36,0.34)' : '#fde68a')), color: samplingCompatible ? (isDark || isContrast ? '#a7f3d0' : '#065f46') : (isDark || isContrast ? '#fde68a' : '#78350f') } },
                        React.createElement("strong", null, samplingCompatible ? t('stem.probability.compatible_with_model', 'Compatible with the model. ') : t('stem.probability.unusual_for_model', 'Unusual for this model. ')),
                        samplingCompatible
                          ? t('stem.probability.expected_inside_interval', 'The theoretical probability falls inside this run\'s 95% interval, so the difference is plausible sampling variation.')
                          : t('stem.probability.expected_outside_interval', 'The theoretical probability falls outside this run\'s 95% interval. One unusual sample can happen; collect more trials and use the fairness test before concluding the model is biased.')
                      ),
                      React.createElement("p", { className: "text-[10px] italic mt-2", style: { color: _muted } },
                        t('stem.probability.interval_interpretation', 'Interpretation: across many repeated experiments, about 95% of Wilson intervals built this way would cover the true probability.'))
                    );
                  })()
            ),

            // Statistical analysis

            d.trials >= 10 && d.mode !== 'birthday' && d.mode !== 'monty' && d.mode !== 'galton' && d.mode !== 'volume3d' && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _statBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, t('stem.probability.statistical_analysis', "\uD83D\uDCCA Statistical Analysis")),

              React.createElement("div", { className: "grid grid-cols-4 gap-2 text-center" },

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-700" }, t('stem.probability.total_trials', "Total Trials")),

                  React.createElement("p", { className: "text-lg font-black text-violet-800" }, d.trials)

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-700" }, t('stem.probability.max_deviation', "Max Deviation")),

                  React.createElement("p", { className: "text-lg font-black text-violet-800" }, (function () {

                    var maxDev = 0;

                    Object.keys(expected).forEach(function (k) {

                      var observed = (counts[k] || 0) / d.trials;

                      var dev = Math.abs(observed - expected[k]);

                      if (dev > maxDev) maxDev = dev;

                    });

                    return (maxDev * 100).toFixed(1) + '%';

                  })())

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-700" }, t('stem.probability.statistic', "\u03C7\u00B2 Statistic")),

                  React.createElement("p", { className: "text-lg font-black " + chiTone }, chiSq.toFixed(2)),

                  React.createElement("p", { className: "text-[10px] font-mono text-slate-500" }, 'df=' + df + ' \u00B7 crit ' + chiCritical.toFixed(2))

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-violet-700" }, t('stem.probability.fairness_0_05', "Fairness (\u03B1=0.05)")),

                  React.createElement("p", { className: "text-lg font-black " + chiTone },
                    !chiIndependent ? '\uD83D\uDEAB ' + t('stem.probability.chi_na', 'N/A here')
                      : !chiReady ? '\u23F3 ' + t('stem.probability.not_yet', 'Not yet')
                      : chiPass ? '\u2705 Fair' : '\u274C Biased'),

                  !chiIndependent
                    ? React.createElement("p", { className: "text-[10px] text-slate-500 leading-snug" },
                        t('stem.probability.chi_not_independent', 'this test needs independent draws \u2014 switch replacement back on'))
                    : !chiReady && React.createElement("p", { className: "text-[10px] text-slate-500 leading-snug" },
                        t('stem.probability.chi_needs_trials', 'needs ') + chiTrialsNeeded.toLocaleString() + t('stem.probability.chi_needs_trials_suffix', ' trials (5 expected per outcome)'))

                )

              ),

              React.createElement("p", { className: "mt-2 text-xs italic", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } },

                // "Try 100+" was fine advice for a d6 and wrong for everything
                // else: 2d20 needs 2,000 rolls before chi-squared is valid. The
                // target now comes from the model on screen.
                !chiIndependent ? '\uD83D\uDCA1 Drawing WITHOUT replacement, every full pass through the bag hands back exactly the bag\u2019s contents \u2014 so \u03C7\u00B2 lands on 0 no matter how many draws you make. That is not the bag proving itself fair, it is arithmetic: \u03C7\u00B2 assumes each draw is independent, and here each draw changes what is left. Turn replacement back on to test fairness; keep it off to study how the odds shift mid-bag.'

                  : !chiReady ? '\uD83D\uDCA1 At ' + d.trials + ' trials the \u03C7\u00B2 test can\u2019t run yet \u2014 it needs about 5 expected hits in EVERY outcome, which is ' + chiTrialsNeeded.toLocaleString() + ' trials for this setup (rarest outcome: ' + (minExpectedP * 100).toFixed(minExpectedP < 0.01 ? 2 : 1) + '%). Keep rolling and watch the convergence chart meanwhile.'

                  : '\uD83D\uDCA1 Great sample size! At ' + d.trials + ' trials, the Law of Large Numbers is clearly visible. \u03C7\u00B2(' + df + ')=' + chiSq.toFixed(2) + ' vs critical ' + chiCritical.toFixed(2) + ' \u2192 ' + (chiPass ? 'fail to reject H\u2080 (fair)' : 'reject H\u2080 (potentially biased)')

              )

            ),

            // â”€â”€ Did You Know? â€” Pedagogical Insights â”€â”€

            d.trials >= 10 && d.mode !== 'birthday' && d.mode !== 'monty' && d.mode !== 'galton' && d.mode !== 'volume3d' && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: isDark || isContrast ? 'rgba(251,191,36,0.06)' : '#fffbeb', border: '1px solid ' + (isDark || isContrast ? 'rgba(251,191,36,0.2)' : '#fde68a') } },

              React.createElement("p", { className: "text-xs font-bold mb-1", style: { color: isDark || isContrast ? '#fbbf24' : '#b45309' } }, t('stem.probability.did_you_know', "\uD83D\uDCA1 Did You Know?")),

              React.createElement("p", { className: "text-xs leading-relaxed", style: { color: isDark || isContrast ? '#fde68a' : '#92400e' } },

                d.trials < 30 ? 'The Law of Large Numbers says observed frequencies get closer to expected probabilities as you run more trials. Try 100+ to see it in action!'

                  // Bernoulli died in 1705. He proved this years earlier; 1713 is
                  // when his nephew published Ars Conjectandi posthumously — the
                  // old wording had him proving theorems eight years dead. And the
                  // law he proved is the WEAK one: the proportion converges in
                  // probability, which is not the same as "always".
                  : d.trials < 100 ? 'Jakob Bernoulli proved the Law of Large Numbers in the 1680s; it reached print in 1713, in Ars Conjectandi, published by his nephew eight years after Bernoulli died. He showed that with enough coin flips, the proportion of heads gets arbitrarily close to 50% — and stays close. You\'re seeing this happen right now!'

                    : d.trials < 200 ? 'The Gambler\'s Fallacy is the mistaken belief that past results affect future outcomes. Each ' + (d.mode === 'coin' ? 'coin flip' : d.mode === 'dice' ? 'dice roll' : 'trial') + ' is independent \u2014 the coin has no memory! Just because you got 5 heads in a row doesn\'t make tails more likely next.'

                      // This used to say the student was watching the Central Limit
                      // Theorem. They are not. The CLT is about the distribution of
                      // sample MEANS across repeated samples; what is on screen is
                      // one running sample settling onto its expected frequencies,
                      // which is the Law of Large Numbers. The tool does have a real
                      // CLT demo — the Galton board — so point at it instead of
                      // mislabelling this one.
                      : d.trials < 500 ? 'At ' + d.trials + ' trials the observed bars are locking onto the expected ones — still the Law of Large Numbers, not yet the Central Limit Theorem. The two get muddled constantly: this is ONE sample settling down, while the Central Limit Theorem describes the bell shape you get from the AVERAGES of many separate samples. Try the Galton Board mode to watch that second one happen.'

                        : (function () {
                            if (!samplingIndependent) return 'A standard binomial confidence interval is not valid here: drawing without replacement changes the next-draw probability. Turn replacement on for independent trials, or keep it off and study the conditional-odds panel.';
                            if (!samplingInterval.valid) return 'Confidence intervals need the outcomes from the run, not only a saved trial counter. Run a fresh sample to build an uncertainty interval.';
                            var _ciLabel = d.mode === 'coin' ? 'Heads'
                              : d.mode === 'dice' ? 'face 1'
                              : d.mode === 'dice2' ? 'sum ' + convTrackedSum
                              : d.mode === 'pi' ? 'inside the quarter circle'
                              : String(convTrackedKey);
                            return 'With ' + samplingTrials + ' trials, the Wilson 95% interval for ' + _ciLabel + ' runs from ' + (samplingInterval.low * 100).toFixed(1) + '% to ' + (samplingInterval.high * 100).toFixed(1) + '%. Wilson\'s method stays between 0% and 100% even for rare outcomes and short runs, and the interval shrinks as more evidence arrives. Across many repeated experiments, about 95% of intervals built this way would cover the true probability.';
                          })()

              )

            ),

            // â”€â”€ Marble Bag: Theoretical vs Observed Comparison Histogram â”€â”€

            ['coin', 'dice', 'dice2', 'spinner', 'sports', 'custom', 'marbleBag'].indexOf(d.mode) >= 0 && d.trials >= 5 && React.createElement("div", { className: "rounded-xl p-4 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-3", style: { color: _accent } }, t('stem.probability.theoretical_vs_observed_comparison', "\uD83D\uDCCA Theoretical vs Observed Comparison")),

              React.createElement("div", { className: "flex gap-3" },

                // Theoretical column

                React.createElement("div", { className: "flex-1" },

                  React.createElement("p", { className: "text-[11px] font-bold text-center mb-2", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } }, t('stem.probability.theoretical', "\uD83C\uDFAF Theoretical")),

                  React.createElement("div", { className: "space-y-1.5" },

                    Object.keys(expected).map(function (k) {

                      var expPct = expected[k] * 100;

                      return React.createElement("div", { key: 'theo-' + k, className: "flex items-center gap-1" },

                        React.createElement("div", { style: { width: 10, height: 10, borderRadius: '50%', background: barColors[k] || '#8b5cf6', flexShrink: 0 } }),

                        React.createElement("span", { className: "text-[11px] font-bold w-12 truncate", style: { color: _text } }, k),

                        React.createElement("div", { className: "flex-1 rounded-full overflow-hidden", style: { height: '10px', background: isDark || isContrast ? 'rgba(255,255,255,0.08)' : '#f1f5f9' } },

                          React.createElement("div", { style: { width: expPct + '%', height: '100%', background: (barColors[k] || '#8b5cf6') + '60', borderRadius: '9999px' } })

                        ),

                        React.createElement("span", { className: "text-[11px] font-mono w-10 text-right", style: { color: _muted } }, expPct.toFixed(1) + '%')

                      );

                    })

                  )

                ),

                // Divider

                React.createElement("div", { style: { width: '1px', background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#e2e8f0', margin: '0 4px' } }),

                // Observed column

                React.createElement("div", { className: "flex-1" },

                  React.createElement("p", { className: "text-[11px] font-bold text-center mb-2", style: { color: isDark || isContrast ? '#86efac' : '#047857' } }, "\uD83D\uDD2C Observed (" + d.trials + " trials)"),

                  React.createElement("div", { className: "space-y-1.5" },

                    Object.keys(expected).map(function (k) {

                      var obsPct = d.trials > 0 ? ((counts[k] || 0) / d.trials * 100) : 0;

                      var expPct2 = expected[k] * 100;

                      var diff = obsPct - expPct2;

                      return React.createElement("div", { key: 'obs-' + k, className: "flex items-center gap-1" },

                        React.createElement("div", { style: { width: 10, height: 10, borderRadius: '50%', background: barColors[k] || '#8b5cf6', flexShrink: 0 } }),

                        React.createElement("span", { className: "text-[11px] font-bold w-12 truncate", style: { color: _text } }, k),

                        React.createElement("div", { className: "flex-1 rounded-full overflow-hidden", style: { height: '10px', background: isDark || isContrast ? 'rgba(255,255,255,0.08)' : '#f1f5f9' } },

                          React.createElement("div", { style: { width: Math.min(obsPct, 100) + '%', height: '100%', background: barColors[k] || '#8b5cf6', borderRadius: '9999px', transition: 'width 0.3s' } })

                        ),

                        React.createElement("span", { className: "text-[11px] font-mono w-10 text-right font-bold", style: { color: Math.abs(diff) < 3 ? (isDark || isContrast ? '#86efac' : '#047857') : Math.abs(diff) < 8 ? (isDark||isContrast?'#fcd34d':'#b45309') : (isDark||isContrast?'#fca5a5':'#b91c1c') } }, obsPct.toFixed(1) + '%')

                      );

                    })

                  )

                )

              ),

              d.trials >= 20 && React.createElement("p", { className: "text-[11px] mt-2 italic text-center", style: { color: _muted } },

                t('stem.probability.as_you_run_more_trials_the_observed_ba', '\uD83D\uDCA1 As you run more trials, the observed bars should get closer to the theoretical bars \u2014 that\'s the Law of Large Numbers in action!')

              )

            ),

            // ── Monte Carlo Pi Scatter ──
            d.mode === 'pi' && d.trials > 0 && (function() {

              var _piPtsV = d._piPoints || [];

              // From the running totals, NOT the capped point array — see the
              // piTotal note in render scope.
              var _piInV = piInside;

              var _piTotV = piTotal;

              var _piEstV = piEstimate;

              var _piErrV = _piTotV > 0 ? piError : 0;

              var _piErrCol = _piErrV < 0.02
                ? (isDark||isContrast?'#86efac':'#047857')
                : _piErrV < 0.1
                  ? (isDark||isContrast?'#fcd34d':'#b45309')
                  : (isDark||isContrast?'#fca5a5':'#b91c1c');

              return React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style:{color:_accent} }, t('stem.probability.monte_carlo_scatter_plot', '🥧 Monte Carlo π Scatter Plot')),

                React.createElement("div", { className: "flex gap-3 items-start flex-wrap" },

                  React.createElement("svg", { role: "img", 'aria-label': 'Monte Carlo pi scatter plot with ' + _piInV + ' of ' + _piTotV + ' points inside the quarter circle; pi estimate ' + _piEstV.toFixed(4), viewBox: "0 0 200 200", width: 180, height: 180, style: { border: '1px solid '+_border, borderRadius: 8, flexShrink: 0, background: isDark||isContrast?'#1e1b4b':'#f8fafc' } },

                    React.createElement("path", { d:"M 0 200 A 200 200 0 0 1 200 0", fill: isDark||isContrast?'rgba(34,197,94,0.12)':'rgba(34,197,94,0.08)', stroke:'#22c55e', strokeWidth:1.5, strokeDasharray:'5 3' }),

                    _piPtsV.slice(-400).map(function(pt, pidx) {

                      return React.createElement("circle", { key: pidx, cx: pt.x*200, cy: (1-pt.y)*200, r: _piTotV>300?1.5:2.5, fill: pt.inside?'#22c55e':'#ef4444', opacity: 0.7 });

                    }),

                    React.createElement("text", { x:4, y:12, style:{fontSize:'7px'}, fill:'#94a3b8' }, '(0,1)'),

                    React.createElement("text", { x:4, y:197, style:{fontSize:'7px'}, fill:'#94a3b8' }, '(0,0)'),

                    React.createElement("text", { x:155, y:197, style:{fontSize:'7px'}, fill:'#94a3b8' }, '(1,0)')

                  ),

                  React.createElement("div", { className: "flex flex-col gap-2 flex-1 min-w-28" },

                    React.createElement("div", { className: "text-center p-2 rounded-lg", style:{background:isDark||isContrast?'rgba(139,92,246,0.1)':'rgba(139,92,246,0.06)',border:'1px solid '+_border} },

                      React.createElement("p", { className:"text-[11px] font-bold", style:{color:_accent} }, t('stem.probability.estimate', 'π Estimate')),

                      React.createElement("p", { className:"text-2xl font-black font-mono", style:{color:_piErrCol} }, _piEstV.toFixed(4)),

                      React.createElement("p", { className:"text-[11px]", style:{color:_muted} }, t('stem.probability.true_3_14159', 'True π = 3.14159…'))

                    ),

                    React.createElement("div", { className:"grid grid-cols-2 gap-1 text-center text-[11px]" },

                      React.createElement("div", { className:"p-1 rounded", style:{background:'#22c55e20'} },

                        React.createElement("p", { className:"font-bold", style:{color:isDark||isContrast?'#86efac':'#047857'} }, t('stem.probability.inside', '🟢 Inside')),

                        React.createElement("p", { className:"font-mono font-bold text-emerald-700" }, _piInV)

                      ),

                      React.createElement("div", { className:"p-1 rounded", style:{background:'#ef444420'} },

                        React.createElement("p", { className:"font-bold", style:{color:isDark||isContrast?'#fca5a5':'#b91c1c'} }, t('stem.probability.outside', '🔴 Outside')),

                        React.createElement("p", { className:"font-mono font-bold text-red-600" }, _piTotV - _piInV)

                      )

                    ),

                    React.createElement("div", { className:"p-1.5 rounded-lg text-center", style:{background:isDark||isContrast?'rgba(139,92,246,0.06)':'#faf5ff'} },

                      React.createElement("p", { className:"text-[11px] font-bold", style:{color:_accent} }, t('stem.probability.error_from', 'Error from π')),

                      React.createElement("p", { className:"text-base font-black font-mono", style:{color:_piErrCol} }, '±' + _piErrV.toFixed(5)),

                      React.createElement("p", { className:"text-[11px] italic mt-0.5", style:{color:_muted} }, '4 × ' + _piInV + ' / ' + _piTotV)

                    ),

                    React.createElement("p", { className:"text-[11px] italic leading-relaxed text-center", style:{color:_muted} }, t('stem.probability.10k_points_needed_for_2_decimal_places', '~10k points needed for 2 decimal places of π')),

                    // ── Slow Drop: animated dot deposition ──
                    // Drops 100 points one at a time over ~10 seconds so students
                    // can SEE the convergence happen. Standard +N buttons stay
                    // fast for batch mode; this is the "show your work" mode.
                    React.createElement("button", {
                      onClick: function() {
                        if (_piAnim.interval) {
                          // Toggle off if already running
                          clearInterval(_piAnim.interval); _piAnim.interval = null;
                          return;
                        }
                        sfxProbClick();
                        var dropped = 0;
                        _piAnim.interval = setInterval(function() {
                          // Functional update: the labToolData closure captured at click
                          // time goes stale after the first tick — read fresh state
                          // inside setLabToolData (same pattern as runTrialAuto).
                          setLabToolData(function(prev) {
                            var _pp = prev.probability || {};
                            var x = Math.random(), y = Math.random();
                            var inside = (x * x + y * y) <= 1;
                            var nextPts = (_pp._piPoints || []).concat([{ x: x, y: y, inside: inside }]);
                            if (nextPts.length > 1000) nextPts = nextPts.slice(-1000);
                            var nextRes = (_pp.results || []).concat([inside ? 'inside' : 'outside']);
                            // Unbounded totals — see the piTotal note in render scope.
                            var nextTot = (_pp._piTotal != null ? _pp._piTotal : (_pp._piPoints || []).length) + 1;
                            var nextIn = (_pp._piInside != null ? _pp._piInside : (_pp._piPoints || []).filter(function (p) { return p.inside; }).length) + (inside ? 1 : 0);
                            return Object.assign({}, prev, { probability: Object.assign({}, _pp, { _piPoints: nextPts, _piTotal: nextTot, _piInside: nextIn, results: nextRes, trials: nextRes.length }) });
                          });
                          dropped++;
                          if (dropped >= 100) {
                            clearInterval(_piAnim.interval); _piAnim.interval = null;
                            sfxProbSuccess();
                          }
                        }, 100);
                      },
                      className: 'mt-2 w-full px-3 py-2 rounded-lg text-[11px] font-bold transition',
                      style: { background: _piAnim.interval ? '#dc2626' : '#7c3aed', color: '#fff' },
                      'aria-label': _piAnim.interval ? 'Stop slow-drop animation' : 'Slow-drop 100 points one at a time'
                    }, _piAnim.interval ? '⏹ Stop animation' : '🔬 Slow-drop 100 (watch them land)')

                  )

                )

              );

            })(),

            // Last 10 results

            d.trials > 0 && d.mode !== 'volume3d' && React.createElement("div", { className: "text-center" },

              d.mode === 'marbleBag' && React.createElement("div", { className: "mb-3 bg-white rounded-lg p-3 border shadow-sm mx-auto", style: { maxWidth: 500 } },

                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, t('stem.probability.draw_history_breakdown', "\uD83C\uDFB1 Draw History Breakdown")),

                React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

                  Object.keys(expected).map(function (k) {

                    var count = counts[k] || 0;

                    var pct = d.trials > 0 ? (count / d.trials * 100) : 0;

                    return React.createElement("div", { key: k, className: "flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border" },

                      React.createElement("div", { style: { width: 8, height: 8, borderRadius: '50%', background: barColors[k] || '#8b5cf6' } }),

                      React.createElement("span", { className: "text-[11px] font-bold text-slate-700" }, k + ":"),

                      React.createElement("span", { className: "text-[11px] font-mono text-slate-900" }, count),

                      React.createElement("span", { className: "text-[11px] text-slate-600" }, "(" + pct.toFixed(1) + "%)")

                    );

                  })

                )

              ),

              React.createElement("div", { className: "mt-2" },

                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-1.5 text-center", style:{color:_accent} }, t('stem.probability.last_30_results', 'Last 30 Results')),

                React.createElement("div", { className: "flex flex-wrap gap-0.5 justify-center" },

                  // Guarded like every other read of results in this file. This
                  // block is gated on trials > 0, and a state restored from a
                  // snapshot can carry a trial count with no results array — which
                  // took the whole tool down on render, not just this strip.
                  (d.results || []).slice(-30).map(function(r, ri) {

                    var _rc = barColors[r] || '#94a3b8';

                    var _shown = Math.min((d.results || []).length, 30);

                    var _isLast = ri === _shown - 1;

                    return React.createElement("div", { key: ri, title: String(r), style: { width: 18, height: 18, borderRadius: 4, background: _rc, border: _isLast ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(0,0,0,0.1)', boxShadow: _isLast ? '0 0 6px ' + _rc + '90' : 'none', opacity: 0.55 + 0.45 * (ri / Math.max(_shown, 1)) } });

                  })

                ),

                (d.results || []).length > 30 && React.createElement("p", { className:"text-[11px] text-center mt-1", style:{color:_muted} }, '(showing last 30 of ' + (d.results || []).length + ')')

              )

            ),

            // ── Challenge Mode ──
            (function() {

              var _cc = d._completedChallenges || [];

              var _maxDevC = (function() {

                var mx = 0;

                Object.keys(expected).forEach(function(k) { var dv = Math.abs(((counts[k]||0)/Math.max(d.trials,1))-(expected[k]||0)); if(dv>mx)mx=dv; });

                return mx;

              })();

              // Pi Hunter used to read the capped array, so its error never
              // improved past 1,000 darts — the badge was a ~67% coin flip that
              // more work could not move. Running totals make it earnable.
              var _piErrC = piTotal >= 1000 ? piError : 999;

              var _chals = [

                { id:'streak5', icon:'🔥', name:t('stem.probability.streak_surge', 'Streak Surge'), desc:t('stem.probability.get_5_results_in_a_row_any_mode', 'Get 5+ results in a row (any mode)'), xp:25, check:function(){return (d._bestStreak||0)>=5;} },

                { id:'diceBalance', icon:'⚖️', name:t('stem.probability.balance_master', 'Balance Master'), desc:t('stem.probability.60_dice_rolls_all_within_10_of_expecte', '60+ dice rolls, all within 10% of expected'), xp:50, check:function(){return d.mode==='dice'&&d.trials>=60&&_maxDevC<=0.10;} },

                { id:'law1000', icon:'📈', name:t('stem.probability.law_witness', 'Law Witness'), desc:t('stem.probability.1000_coin_trials_with_max_deviation_3', '1000 coin trials with max deviation < 3%'), xp:100, check:function(){return d.mode==='coin'&&d.trials>=1000&&_maxDevC<0.03;} },

                { id:'piHunter', icon:'🥧', name:t('stem.probability.pi_hunter', 'Pi Hunter'), desc:t('stem.probability.1000_monte_carlo_pi_trials_error_0_05', '1000+ Monte Carlo Pi trials, error < 0.05'), xp:75, check:function(){return d.mode==='pi'&&piTotal>=1000&&_piErrC<0.05;} },

                { id:'birthday23', icon:'🎂', name:t('stem.probability.birthday_breaker', 'Birthday Breaker'), desc:t('stem.probability.set_n_23_in_birthday_mode_to_see_the_p', 'Set n=23 in Birthday mode to see the paradox'), xp:30, check:function(){return d.mode==='birthday'&&(d.birthdayN||23)===23;} },

                // Earnable by more work, unlike the old Pi Hunter: the volume
                // estimate keeps converging, so more darts really do help. The
                // 0.01 window is ~1.4-1.6 SE at the 5,000-dart floor (roughly an
                // 85% chance), and a near-certainty by 20,000 — so persistence
                // pays instead of a lucky first throw deciding it.
                { id:'volumeSurveyor', icon:'🧊', name:t('stem.probability.volume_surveyor', 'Volume Surveyor'), desc:t('stem.probability.5000_darts_in_3d_within_0_01_of_the_tr', '5,000+ darts in 3D, estimate within 0.01 of the true volume'), xp:75, check:function(){
                  if (d.mode !== 'volume3d') return false;
                  var _vt = d.v3Total || 0;
                  if (_vt < 5000) return false;
                  var _vs = v3Shape(d.v3Shape || 'sphere');
                  if (_vs.exact == null) return false;   // the potato has no truth to be within 0.01 of
                  return Math.abs((d.v3Inside || 0) / _vt - _vs.exact) < 0.01;
                } }

              ];

              return React.createElement("div", { className:"mt-3 mb-3 rounded-xl p-3", style:{background:isDark||isContrast?'rgba(139,92,246,0.06)':'#faf5ff',border:'1px solid '+(isDark||isContrast?'rgba(139,92,246,0.2)':'#ddd6fe')} },

                React.createElement("p", { className:"text-[11px] font-bold uppercase tracking-wider mb-2", style:{color:_accent} }, t('stem.probability.challenges', '🏆 Challenges')),

                React.createElement("div", { className:"space-y-1.5" },

                  _chals.map(function(ch) {

                    var _done = _cc.indexOf(ch.id) >= 0;

                    var _ok = !_done && ch.check();

                    return React.createElement("div", { key:ch.id, className:"flex items-center gap-2 p-2 rounded-lg", style:{background:_done?(isDark||isContrast?'rgba(34,197,94,0.08)':'rgba(34,197,94,0.06)'):(isDark||isContrast?'rgba(255,255,255,0.03)':'#fff'),border:'1px solid '+(_done?(isDark||isContrast?'rgba(34,197,94,0.2)':'#bbf7d0'):(isDark||isContrast?'rgba(139,92,246,0.1)':'#e9d5ff')),opacity:_done?0.7:1} },

                      React.createElement("span", { style:{fontSize:16,lineHeight:1,flexShrink:0} }, ch.icon),

                      React.createElement("div", { className:"flex-1 min-w-0" },

                        React.createElement("p", { className:"text-[11px] font-bold truncate", style:{color:_text} }, ch.name + ' — ' + ch.xp + ' XP'),

                        React.createElement("p", { className:"text-[11px] truncate", style:{color:_muted} }, ch.desc)

                      ),

                      _done ? React.createElement("span", { className:"text-[11px] font-bold text-emerald-500 flex-shrink-0" }, t('stem.probability.done', '✅ Done!'))

                        : _ok ? React.createElement("button", { "aria-label": t('stem.probability.claim', "Claim"), onClick:function() {

                            if(_cc.indexOf(ch.id)>=0) return;

                            if(awardStemXP) awardStemXP('probability', ch.xp);

                            upd('_completedChallenges', _cc.concat([ch.id]));

                            if(stemCelebrate) stemCelebrate();

                            if(addToast) addToast('🎉 Challenge complete! +' + ch.xp + ' XP', 'success');

                          }, className:"px-2 py-0.5 rounded text-[11px] font-bold flex-shrink-0", style:{background:_btnBg,color:'#fff'} }, 'Claim ' + ch.xp + ' XP')

                        : React.createElement("span", { className:"text-[11px] flex-shrink-0", style:{color:_muted} }, t('stem.probability.in_progress', '🔒 In progress'))

                    );

                  })

                )

              );

            })(),

            React.createElement("button", { "aria-label": t('stem.probability.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'pr-' + Date.now(), tool: 'probability', label: d.mode + ' ' + d.trials + ' trials', data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, t('stem.probability.snapshot_2', "\uD83D\uDCF8 Snapshot")),
            React.createElement("button", { "aria-label": t('stem.probability.export_csv', "Export CSV"), onClick: function() { try { var _r = (typeof d !== 'undefined' && d && d.results) ? d.results : []; if (!_r.length) return; var _counts = {}; _r.forEach(function(o){ var k = String(o); _counts[k] = (_counts[k]||0)+1; }); var _csv = 'outcome,count\n' + Object.keys(_counts).map(function(k){ return '\"' + k.replace(/\"/g,'') + '\",' + _counts[k]; }).join('\n'); var _b = new Blob([_csv], { type: 'text/csv' }); var _a = document.createElement('a'); _a.href = URL.createObjectURL(_b); _a.download = 'probability_' + Date.now() + '.csv'; _a.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 CSV saved!', 'success'); } catch(e){} }, className: "mt-3 ml-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-700 to-teal-700 rounded-full hover:from-emerald-700 hover:to-teal-700 shadow-md" }, t('stem.probability.export_csv_2', "\uD83D\uDCE5 Export CSV")),

            // ── AI Explain Results + TTS Narrate ──
            React.createElement("div", { className: "mt-4 pt-4", style: { borderTop: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.15)':'#ede9fe') } },
              React.createElement("div", { className: "flex gap-2 flex-wrap mb-2" },
                React.createElement("button", { "aria-label": t('stem.probability.explain_results_with_ai', "Explain results with AI"),
                  disabled: !callGemini || (d.trials === 0 && d.mode !== 'tree') || d._aiLoading,
                  onClick: function() {
                    if (!callGemini) return;
                    upd('_aiLoading', true);
                    upd('_aiExplanation', null);
                    var summary;
                    if (d.mode === 'tree') {
                      var tm = d.treeEventMode || 'coin';
                      summary = 'Two-event compound probability tree for ' + tm + ' experiments. Joint probabilities shown for all outcome pairs.';
                    } else {
                      var topOutcome = Object.keys(counts).sort(function(a,b){ return (counts[b]||0)-(counts[a]||0); })[0];
                      var topPct = topOutcome && d.trials > 0 ? ((counts[topOutcome]||0)/d.trials*100).toFixed(1) : '0';
                      summary = 'Mode: ' + d.mode + '. Total trials: ' + d.trials + '. ' +
                        'Most frequent outcome: ' + (topOutcome||'none') + ' (' + topPct + '%). ' +
                        'Chi-square: ' + chiSq.toFixed(2) + ' on ' + df + ' degrees of freedom (critical value ' + chiCritical.toFixed(2) + '). ' +
                        (!chiIndependent
                          ? 'Fairness test: DOES NOT APPLY — draws are without replacement, so they are not independent and chi-squared is meaningless here. Do NOT call the bag fair or biased; explain that a full pass through the bag always returns its exact contents. '
                          : chiReady
                          ? 'Fairness test: ' + (chiPass ? 'PASS (fair)' : 'FAIL (biased)') + '. '
                          : 'Fairness test: NOT VALID YET — this setup needs ' + chiTrialsNeeded + ' trials for 5 expected hits per outcome, so do NOT tell the student the die is fair or biased; say the sample is still too small. ') +
                        'Max deviation from expected: ' + (function(){ var mx=0; Object.keys(expected).forEach(function(k){ var d2=Math.abs((counts[k]||0)/Math.max(d.trials,1)-expected[k]); if(d2>mx)mx=d2; }); return (mx*100).toFixed(1); })() + '%.';
                    }
                    callGemini(
                      'You are explaining probability to a ' + (gradeLevel||'5th Grade') + ' student. In 3 sentences max, explain what these results show and what concept they illustrate:\n\n' + summary + '\n\nBe concrete, friendly, and use the actual numbers.',
                      false, false, 0.4
                    ).then(function(resp){ upd('_aiExplanation', resp); upd('_aiLoading', false); })
                     .catch(function(){ upd('_aiLoading', false); addToast('AI explain failed', 'error'); });
                  },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  style: { background: isDark||isContrast?'rgba(139,92,246,0.15)':'#ede9fe', color: isDark||isContrast?'#c4b5fd':'#7c3aed', opacity: (!callGemini||(d.trials===0&&d.mode!=='tree')||d._aiLoading)?0.5:1, cursor: (!callGemini||(d.trials===0&&d.mode!=='tree')||d._aiLoading)?'not-allowed':'pointer' }
                }, d._aiLoading ? '\u23F3 Thinking...' : '\uD83E\uDD16 Explain My Results'),
                d.trials > 0 && callTTS && React.createElement("button", { "aria-label": t('stem.probability.narrate_results', "Narrate Results"),
                  onClick: function() {
                    var topOutcome = Object.keys(counts).sort(function(a,b){ return (counts[b]||0)-(counts[a]||0); })[0];
                    var narration = 'Probability Lab results. Mode: ' + d.mode + '. ' + d.trials + ' trials run. ' +
                      'Most frequent: ' + (topOutcome||'unknown') + ' at ' + (topOutcome&&d.trials>0?((counts[topOutcome]||0)/d.trials*100).toFixed(0):'0') + ' percent. ' +
                      'Chi-square test: ' + (!chiIndependent ? 'does not apply, because draws without replacement are not independent' : chiReady ? (chiPass?'fair':'potentially biased') : 'not enough trials yet, it needs ' + chiTrialsNeeded + ' for this setup') + '.';
                    callTTS(narration, null);
                  },
                  className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  style: { background: isDark||isContrast?'rgba(34,197,94,0.1)':'#f0fdf4', color: isDark||isContrast?'#86efac':'#16a34a' }
                }, t('stem.probability.narrate_results_2', '\uD83D\uDD0A Narrate Results'))
              ),
              d._aiExplanation && React.createElement("div", { className: "rounded-xl p-3", style: { background: isDark||isContrast?'rgba(139,92,246,0.08)':'rgba(139,92,246,0.04)', border: '1px solid ' + (isDark||isContrast?'rgba(139,92,246,0.2)':'#ddd6fe') } },
                React.createElement("p", { className: "text-[11px] font-bold uppercase tracking-wider mb-1", style: { color: isDark||isContrast?'#c4b5fd':'#7c3aed' } }, '\uD83E\uDD16 AI Explanation (' + (gradeLevel||'5th Grade') + ')'),
                React.createElement("p", { className: "text-xs leading-relaxed", style: { color: isDark||isContrast?'#e2e8f0':'#374151' } }, d._aiExplanation)
              ),
              // === H7b'' inquiry widget: distribution skewer ===
              (function() {
                var h = React.createElement;
                var iq = d.distribHunt || { pLow: 33, pMid: 34, pHigh: 33, sampleNonce: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                function setIQ(patch) { upd('distribHunt', Object.assign({}, iq, patch)); }
                var total = iq.pLow + iq.pMid + iq.pHigh;
                var normLow = total > 0 ? iq.pLow / total : 0.33;
                var normMid = total > 0 ? iq.pMid / total : 0.34;
                var normHigh = total > 0 ? iq.pHigh / total : 0.33;
                // Discrete shape classification based on the three normalized probabilities
                var maxP = Math.max(normLow, normMid, normHigh);
                var minP = Math.min(normLow, normMid, normHigh);
                var spread = maxP - minP;
                var shape;
                if (spread < 0.08) shape = 'uniform';
                else if (normMid > Math.max(normLow, normHigh) + 0.10) shape = 'peaked';
                else if (normLow > normHigh + 0.10 || normHigh > normLow + 0.10) shape = 'skewed';
                else shape = 'mixed';
                var shapeMeta = {
                  uniform: { label: t('stem.probability.uniform_flat', '\u2B1B Uniform (flat)'),  color: (isDark || isContrast) ? '#67e8f9' : '#0e7490', bg: 'rgba(8,145,178,0.08)', border: '#67e8f9', desc: t('stem.probability.all_outcomes_nearly_equal_in_probabili', 'All outcomes nearly equal in probability.') },
                  peaked:  { label: t('stem.probability.peaked_center', '\uD83D\uDD3A Peaked (center)'), color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: '#c4b5fd', desc: t('stem.probability.middle_outcome_dominates_approaches_no', 'Middle outcome dominates. Approaches normal-like shape with more buckets.') },
                  skewed:  { label: t('stem.probability.skewed', '\u2197\uFE0F Skewed'),          color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: '#fcd34d', desc: t('stem.probability.one_tail_much_heavier_than_the_other_a', 'One tail much heavier than the other. Asymmetric distribution.') },
                  mixed:   { label: t('stem.probability.mixed', '\uD83D\uDD00 Mixed'),           color: '#475569', bg: 'rgba(100,116,139,0.08)', border: '#cbd5e1', desc: t('stem.probability.two_outcomes_share_roughly_equal_proba', 'Two outcomes share roughly equal probability with the third much lower or higher.') }
                }[shape];
                // ── Live sample dataset ──────────────────────────────────────
                // The sliders used to move nothing but a text label, so "sweep and
                // notice" had nothing to notice. Every slider change now redraws
                // both the expected bars and an actual 60-draw sample, and the
                // classification chip becomes a caption for a picture rather than
                // the entire feedback loop.
                //
                // The sample is seeded on the slider values (plus a nonce the
                // student can bump) instead of Math.random, so one setting always
                // redraws the same dataset: the picture moves because the
                // DISTRIBUTION changed, not because the RNG wandered. "New sample"
                // re-rolls at fixed weights — the separate second lesson that the
                // same distribution still gives a different sample every time.
                var SAMPLE_N = 60;
                var _seed = (((iq.pLow + 1) * 73856093) ^ ((iq.pMid + 1) * 19349663) ^ ((iq.pHigh + 1) * 83492791) ^ (((iq.sampleNonce || 0) + 1) * 2654435761)) >>> 0;
                var _rnd = _seed || 1;
                var sampleDraws = [];
                var sampleCounts = [0, 0, 0];
                for (var _si = 0; _si < SAMPLE_N; _si++) {
                  _rnd = (_rnd * 1664525 + 1013904223) >>> 0;
                  var _rv = _rnd / 4294967296;
                  var _bk = _rv < normLow ? 0 : _rv < normLow + normMid ? 1 : 2;
                  sampleDraws.push(_bk);
                  sampleCounts[_bk]++;
                }
                var BUCKETS = [
                  { key: 'low',  label: t('stem.probability.bucket_low', 'low'),   color: '#0e7490', exp: normLow },
                  { key: 'mid',  label: t('stem.probability.bucket_mid', 'mid'),   color: '#7c3aed', exp: normMid },
                  { key: 'high', label: t('stem.probability.bucket_high', 'high'), color: '#b45309', exp: normHigh }
                ];
                // Shared vertical scale for expected and observed, floored at 34%
                // so a near-uniform setting doesn't render three full-height bars.
                var plotMax = Math.max(0.34, normLow, normMid, normHigh,
                  sampleCounts[0] / SAMPLE_N, sampleCounts[1] / SAMPLE_N, sampleCounts[2] / SAMPLE_N);
                var PLOT_H = 72;
                var sampleSummary = BUCKETS.map(function (b, bi) {
                  return b.label + ' ' + sampleCounts[bi] + ' of ' + SAMPLE_N +
                    ', ' + Math.round(sampleCounts[bi] / SAMPLE_N * 100) + ' percent observed versus ' +
                    Math.round(b.exp * 100) + ' percent expected';
                }).join('; ');
                function logObs() {
                  setIQ({ log: (iq.log || []).concat([{ l: iq.pLow, m: iq.pMid, hi: iq.pHigh, sh: shape, obs: sampleCounts.join('/') }]).slice(-8) });
                }
                return h('div', { className: 'rounded-xl border p-3 mt-3', style: { background: isDark||isContrast?'rgba(8,145,178,0.06)':'#f0fdfa', borderColor: isDark||isContrast?'rgba(8,145,178,0.3)':'#a5f3fc' } },
                  h('p', { className: 'text-[11px] font-bold uppercase tracking-wider mb-1', style: { color: isDark||isContrast?'#67e8f9':'#0e7490' } }, t('stem.probability.distribution_shape_discovery', '\u2754 Distribution shape discovery')),
                  h('p', { className: 'text-[11px] leading-relaxed mb-2', style: { color: isDark||isContrast?'#cbd5e1':'#475569' } },
                    t('stem.probability.three_sliders_set_the_relative_probabi', 'Three sliders set the relative probabilities of low / mid / high outcomes. The distribution shape is classified into one of four discrete shapes. No score, no reveal \u2014 sweep and notice.')),
                  h('div', { className: 'mb-2 p-2 rounded text-center', style: { background: shapeMeta.bg, border: '1px solid ' + shapeMeta.border } },
                    h('div', { className: 'text-sm font-black', style: { color: shapeMeta.color } }, shapeMeta.label),
                    h('div', { className: 'text-[10px] mt-1', style: { color: isDark||isContrast?'#cbd5e1':'#475569' } }, shapeMeta.desc),
                    h('div', { className: 'text-[10px] mt-1 font-mono', style: { color: isDark||isContrast?'#94a3b8':'#475569' } }, 'P(low)=' + (normLow*100).toFixed(0) + '%  P(mid)=' + (normMid*100).toFixed(0) + '%  P(high)=' + (normHigh*100).toFixed(0) + '%')
                  ),
                  // Expected (dashed rule) vs observed (solid bar) + the raw 60 draws.
                  h('div', { className: 'mb-2 p-2 rounded', style: { background: isDark||isContrast?'rgba(15,23,42,0.55)':'#ffffff', border: '1px solid ' + (isDark||isContrast?'rgba(100,116,139,0.4)':'#cbd5e1') } },
                    h('div', { className: 'flex items-center justify-between gap-2 mb-1' },
                      h('span', { className: 'text-[10px] font-bold uppercase tracking-wider', style: { color: isDark||isContrast?'#cbd5e1':'#475569' } },
                        t('stem.probability.sample_of_draws', 'Sample of ') + SAMPLE_N + t('stem.probability.sample_of_draws_suffix', ' draws')),
                      h('button', { onClick: function() { setIQ({ sampleNonce: ((iq.sampleNonce || 0) + 1) % 997 }); },
                        className: 'px-2 py-0.5 rounded text-[10px] font-bold',
                        style: { background: isDark||isContrast?'rgba(8,145,178,0.2)':'#cffafe', color: isDark||isContrast?'#67e8f9':'#155e75' } },
                        t('stem.probability.new_sample', '🎲 New sample'))
                    ),
                    h('div', { role: 'img', 'aria-label': t('stem.probability.expected_vs_observed_label', 'Expected versus observed: ') + sampleSummary, className: 'flex items-end gap-2' },
                      BUCKETS.map(function(b, bi) {
                        var obsH = Math.round((sampleCounts[bi] / SAMPLE_N) / plotMax * PLOT_H);
                        var expTop = Math.round((1 - b.exp / plotMax) * PLOT_H);
                        return h('div', { key: 'bk' + b.key, className: 'flex-1 flex flex-col items-center' },
                          h('div', { className: 'relative w-full', style: { height: PLOT_H, background: isDark||isContrast?'rgba(148,163,184,0.10)':'#f1f5f9', borderRadius: 3 } },
                            h('div', { style: { position: 'absolute', left: 0, right: 0, top: expTop, borderTop: '2px dashed ' + b.color } }),
                            h('div', { style: { position: 'absolute', left: '20%', right: '20%', bottom: 0, height: obsH, background: b.color, borderRadius: '3px 3px 0 0', transition: 'height 140ms ease-out' } })
                          ),
                          h('div', { className: 'text-[10px] font-mono mt-0.5', style: { color: isDark||isContrast?'#cbd5e1':'#475569' } }, sampleCounts[bi] + '/' + SAMPLE_N),
                          h('div', { className: 'text-[10px] font-bold', style: { color: isDark||isContrast?'#e2e8f0':b.color } }, b.label)
                        );
                      })
                    ),
                    h('div', { className: 'flex flex-wrap mt-1.5', style: { gap: 2 }, 'aria-hidden': 'true' },
                      sampleDraws.map(function(bk, di) {
                        return h('span', { key: 'dw' + di, style: { display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: BUCKETS[bk].color } });
                      })
                    ),
                    h('p', { className: 'text-[10px] leading-snug mt-1', style: { color: isDark||isContrast?'#94a3b8':'#475569' } },
                      t('stem.probability.dashed_expected_bar_observed', 'Dashed rule = expected. Bar = what these draws actually gave. Each square is one draw. Move a slider and both change together.'))
                  ),
                  h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
                    [
                      { key: 'pLow',  label: t('stem.probability.p_low_weight', 'P(low) weight'),  val: iq.pLow },
                      { key: 'pMid',  label: t('stem.probability.p_mid_weight', 'P(mid) weight'),  val: iq.pMid },
                      { key: 'pHigh', label: t('stem.probability.p_high_weight', 'P(high) weight'), val: iq.pHigh }
                    ].map(function(s) {
                      return h('div', { key: s.key },
                        h('label', { htmlFor: 'dh-' + s.key, className: 'block text-[10px] font-bold mb-0.5', style: { color: isDark||isContrast?'#cbd5e1':'#475569' } },
                          s.label + ': ', h('span', { className: 'font-mono', style: { color: isDark||isContrast?'#67e8f9':'#0e7490' } }, s.val)),
                        h('input', { id: 'dh-' + s.key, type: 'range', min: 0, max: 100, step: 1, value: s.val,
                          onChange: function(e) { var p = {}; p[s.key] = parseInt(e.target.value, 10); setIQ(p); },
                          className: 'w-full', 'aria-label': s.label }));
                    })
                  ),
                  h('div', { className: 'flex gap-2 items-center mb-2 flex-wrap' },
                    h('button', { onClick: logObs, className: 'px-2 py-0.5 rounded text-[10px] font-bold', style: { background: isDark||isContrast?'rgba(8,145,178,0.2)':'#cffafe', color: isDark||isContrast?'#67e8f9':'#155e75' } }, t('stem.probability.log', '\uD83D\uDCCB Log')),
                    h('button', { onClick: function() { setIQ({ pLow: 33, pMid: 34, pHigh: 33, sampleNonce: 0, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); },
                      className: 'px-2 py-0.5 rounded text-[10px] font-semibold border', style: { color: isDark||isContrast?'#94a3b8':'#475569', borderColor: isDark||isContrast?'rgba(100,116,139,0.4)':'#cbd5e1' } }, t('stem.probability.reset_3', '\u21BA Reset')),
                    (iq.log || []).length > 0 && h('span', { className: 'text-[10px] italic', style: { color: isDark||isContrast?'#94a3b8':'#475569' } }, (iq.log || []).length + ' logged')
                  ),
                  (iq.log || []).length > 0 && h('table', { className: 'text-[10px] w-full border-collapse mb-2', style: { color: isDark||isContrast?'#cbd5e1':'#475569' } },
                    h('thead', null, h('tr', { style: { background: isDark||isContrast?'rgba(8,145,178,0.15)':'#cffafe' } },
                      ['low', 'mid', 'high', 'shape', 'sample'].map(function(c, i) { return h('th', { key: 'h' + i, scope: 'col', className: 'px-1 border text-left', style: { borderColor: isDark||isContrast?'rgba(100,116,139,0.3)':'#cbd5e1' } }, c); }))),
                    h('tbody', null, iq.log.map(function(o, idx) {
                      return h('tr', { key: 'lr' + idx },
                        h('td', { className: 'px-1 border font-mono', style: { borderColor: isDark||isContrast?'rgba(100,116,139,0.3)':'#cbd5e1' } }, o.l),
                        h('td', { className: 'px-1 border font-mono', style: { borderColor: isDark||isContrast?'rgba(100,116,139,0.3)':'#cbd5e1' } }, o.m),
                        h('td', { className: 'px-1 border font-mono', style: { borderColor: isDark||isContrast?'rgba(100,116,139,0.3)':'#cbd5e1' } }, o.hi),
                        h('td', { className: 'px-1 border', style: { borderColor: isDark||isContrast?'rgba(100,116,139,0.3)':'#cbd5e1' } }, o.sh),
                        h('td', { className: 'px-1 border font-mono', style: { borderColor: isDark||isContrast?'rgba(100,116,139,0.3)':'#cbd5e1' } }, o.obs || '—'));
                    }))
                  ),
                  h('textarea', { 'aria-label': t('stem.probability.hypothesis_label', 'Probability distribution hypothesis'), value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                    placeholder: t('stem.probability.hypothesis_free_text_what_combination_', 'Hypothesis (free text): What combination produces uniform? What about peaked?'),
                    className: 'w-full text-[11px] rounded p-1 font-mono leading-snug mb-2', style: { background: isDark||isContrast?'rgba(15,23,42,0.6)':'#ffffff', color: isDark||isContrast?'#e2e8f0':'#1e293b', border: '1px solid ' + (isDark||isContrast?'rgba(100,116,139,0.4)':'#cbd5e1') }, rows: 2 }),
                  !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); },
                    className: 'px-2 py-0.5 rounded text-[10px] font-bold mb-2', style: { background: isDark||isContrast?'rgba(251,191,36,0.15)':'#fef3c7', color: isDark||isContrast?'#fbbf24':'#92400e' } }, t('stem.probability.stuck_show_open_prompts', '\uD83E\uDD14 Stuck \u2014 show open prompts')),
                  iq.stuckRevealed && h('div', { className: 'p-2 rounded text-[10px] leading-relaxed mb-2', style: { background: isDark||isContrast?'rgba(251,191,36,0.08)':'#fffbeb', color: isDark||isContrast?'#cbd5e1':'#475569', border: '1px solid ' + (isDark||isContrast?'rgba(251,191,36,0.3)':'#fcd34d') } },
                    h('ul', { className: 'list-disc pl-4 space-y-0.5' },
                      h('li', null, t('stem.probability.hold_two_sliders_steady_move_one_watch', 'Hold two sliders steady. Move one. Watch the shape.')),
                      h('li', null, t('stem.probability.find_two_settings_that_produce_the_sam', 'Find two settings that produce the same shape.')),
                      h('li', null, t('stem.probability.what_raw_weights_produce_a_peaked_shap', 'What raw weights produce a peaked shape?')))),
                  h('div', { className: 'p-2 rounded', style: { background: isDark||isContrast?'rgba(16,185,129,0.08)':'#ecfdf5', border: '1px solid ' + (isDark||isContrast?'rgba(16,185,129,0.3)':'#a7f3d0') } },
                    h('label', { className: 'flex items-center gap-1 text-[11px] font-bold cursor-pointer', style: { color: isDark||isContrast?'#34d399':'#047857' } },
                      h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
                      t('stem.probability.i_understand_explain_in_my_own_words', 'I understand \u2014 explain in my own words')),
                    iq.understood && h('textarea', { 'aria-label': t('stem.probability.explanation_label', 'Explain how relative weights produce the distribution shape'), value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); },
                      placeholder: t('stem.probability.explain_how_relative_weights_produce_s', 'Explain how relative weights produce shape.'),
                      className: 'w-full text-[11px] rounded p-1 font-mono leading-snug mt-1', style: { background: isDark||isContrast?'rgba(15,23,42,0.6)':'#ffffff', color: isDark||isContrast?'#e2e8f0':'#1e293b', border: '1px solid ' + (isDark||isContrast?'rgba(16,185,129,0.3)':'#a7f3d0') }, rows: 3 })),
                  h('div', { className: 'mt-2 text-[10px] italic', style: { color: isDark||isContrast?'#94a3b8':'#475569' } },
                    t('stem.probability.design_note_discrete_4_shape_classific', 'Design note: discrete 4-shape classification; no goodness-of-fit score; no reveal \u2014 by design.'))
                );
              })()
            )

          );
      })();
    }
  });

})();
