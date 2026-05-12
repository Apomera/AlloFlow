/* eslint-disable */
// stem_tool_optics.js — Optics Lab
// AP Physics 2 geometric + wave optics, full StatsLab-style pedagogy
// Tabs: Home / Reflection / Refraction / Lenses / Interference / Diffraction / Polarization / Quiz
// Each topic has side-by-side draggable sim + calculator + show-the-math.
// No external libs. All visualizations are inline SVG.
(function() {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_optics.js loaded before StemLab registry — bailing');
    return;
  }

  // ── OpticsLab keyframes (concept-mastery celebration) ──
  if (typeof document !== 'undefined' && !document.getElementById('opticslab-celeb-css')) {
    var _opStyle = document.createElement('style');
    _opStyle.id = 'opticslab-celeb-css';
    _opStyle.textContent = [
      '@keyframes opticslab-celeb-rise {',
      '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
      '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
      '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
      '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
      '}',
      // Mirage heat-haze shimmer: subtle horizontal oscillation that gives
      // the haze bands the visual "wavy heat" feeling. Disabled under
      // prefers-reduced-motion via the .op-anim media query below.
      '@keyframes opticslab-mirage-shimmer {',
      '  0%   { transform: translateX(0px); }',
      '  25%  { transform: translateX(2px); }',
      '  50%  { transform: translateX(0px); }',
      '  75%  { transform: translateX(-2px); }',
      '  100% { transform: translateX(0px); }',
      '}',
      '.opticslab-mirage-haze { animation: opticslab-mirage-shimmer 1.6s ease-in-out infinite; transform-origin: center; }',
      '.opticslab-mirage-haze:nth-child(2) { animation-duration: 2.1s; animation-delay: -0.4s; }',
      '.opticslab-mirage-haze:nth-child(3) { animation-duration: 1.3s; animation-delay: -0.8s; }',

      // Interference: expanding wavefronts radiating outward from a slit.
      // We use r animation on <circle> elements (SVG attribute, NOT CSS prop).
      // To keep transforms compatible, we scale up via CSS transform instead and
      // place the circle with cx/cy on the SVG side, since some browsers do not
      // animate SVG r via CSS yet. Each waveset is offset in time for ripple effect.
      '@keyframes opticslab-wavefront {',
      '  0%   { r: 4; opacity: 0.95; }',
      '  100% { r: 110; opacity: 0; }',
      '}',
      '.opticslab-wavefront { animation: opticslab-wavefront 1.8s linear infinite; }',
      '.opticslab-wavefront-2 { animation-delay: -0.6s; }',
      '.opticslab-wavefront-3 { animation-delay: -1.2s; }',

      // Photon dots traveling along a principal ray. We translate a small dot
      // along an SVG path using offset-path / offset-distance (CSS Motion Path).
      // Browsers without support fall back to a static dot (still visible).
      '@keyframes opticslab-photon-travel {',
      '  0%   { offset-distance: 0%;   opacity: 0; }',
      '  10%  { opacity: 1; }',
      '  90%  { opacity: 1; }',
      '  100% { offset-distance: 100%; opacity: 0; }',
      '}',
      '.opticslab-photon { animation: opticslab-photon-travel 2.4s linear infinite; offset-rotate: 0deg; }',
      '.opticslab-photon-2 { animation-delay: -0.8s; }',
      '.opticslab-photon-3 { animation-delay: -1.6s; }',

      // E-field vector oscillation — a perpendicular line that grows and shrinks
      // in sync with the wave traveling through the polarizer system.
      '@keyframes opticslab-efield-pulse {',
      '  0%, 100% { transform: scaleY(1); opacity: 0.9; }',
      '  50%      { transform: scaleY(-1); opacity: 0.9; }',
      '}',
      '.opticslab-efield-vec { animation: opticslab-efield-pulse 1.2s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }',

      '@media (prefers-reduced-motion: reduce) {',
      '  .opticslab-mirage-haze, .opticslab-wavefront, .opticslab-photon, .opticslab-efield-vec { animation: none !important; }',
      '}'
    ].join('');
    if (document.head) document.head.appendChild(_opStyle);
  }

  // ──────────────────────────────────────────────────────────────────
  // CSS INJECTIONS — focus rings, motion-reduce, ARIA live region
  // ──────────────────────────────────────────────────────────────────
  (function injectCss() {
    if (document.getElementById('stem-optics-css')) return;
    var st = document.createElement('style');
    st.id = 'stem-optics-css';
    st.textContent = [
      '[data-op-focusable]:focus { outline: 2px solid #38bdf8; outline-offset: 2px; }',
      '[data-op-focusable]:focus:not(:focus-visible) { outline: none; }',
      '[data-op-focusable]:focus-visible { outline: 2px solid #38bdf8; outline-offset: 2px; }',
      '@media (prefers-reduced-motion: reduce) {',
      '  .op-anim { animation: none !important; transition: none !important; }',
      '}',
      '.op-aria-live { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); border:0; }',
      '.op-knob { cursor: grab; touch-action: none; user-select: none; }',
      '.op-knob:active { cursor: grabbing; }'
    ].join('\n');
    document.head.appendChild(st);
  })();

  // ARIA live region + announcer (ports the slAnnounce pattern from statslab.js:67)
  function _ensureLive() {
    var n = document.getElementById('op-aria-live');
    if (n) return n;
    n = document.createElement('div');
    n.id = 'op-aria-live';
    n.className = 'op-aria-live';
    n.setAttribute('aria-live', 'polite');
    n.setAttribute('aria-atomic', 'true');
    document.body.appendChild(n);
    return n;
  }
  function opAnnounce(msg) {
    try {
      var n = _ensureLive();
      n.textContent = '';
      setTimeout(function() { n.textContent = String(msg || ''); }, 30);
    } catch (e) {}
  }

  // ──────────────────────────────────────────────────────────────────
  // GENERAL HELPERS
  // ──────────────────────────────────────────────────────────────────
  var DEG = Math.PI / 180;
  function degToRad(d) { return d * DEG; }
  function radToDeg(r) { return r / DEG; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function _isNum(x) { return typeof x === 'number' && isFinite(x); }
  function _fmt(v, d) {
    if (!_isNum(v)) return '—';
    if (Math.abs(v) >= 100000 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(d == null ? 3 : d);
    return v.toFixed(d == null ? 3 : d);
  }

  // Wavelength (nm) → approximate visible-spectrum RGB.
  // Algorithm credit: Dan Bruton (1996), commonly used in physics-ed sims.
  function wavelengthToRGB(nm) {
    var R = 0, G = 0, B = 0, factor = 0;
    if (nm >= 380 && nm < 440) { R = -(nm - 440) / (440 - 380); G = 0; B = 1; }
    else if (nm < 490) { R = 0; G = (nm - 440) / (490 - 440); B = 1; }
    else if (nm < 510) { R = 0; G = 1; B = -(nm - 510) / (510 - 490); }
    else if (nm < 580) { R = (nm - 510) / (580 - 510); G = 1; B = 0; }
    else if (nm < 645) { R = 1; G = -(nm - 645) / (645 - 580); B = 0; }
    else if (nm <= 780) { R = 1; G = 0; B = 0; }
    if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / (420 - 380);
    else if (nm < 700) factor = 1.0;
    else if (nm <= 780) factor = 0.3 + 0.7 * (780 - nm) / (780 - 700);
    var gamma = 0.8;
    function chan(c) { return c === 0 ? 0 : Math.round(255 * Math.pow(c * factor, gamma)); }
    return 'rgb(' + chan(R) + ',' + chan(G) + ',' + chan(B) + ')';
  }

  // ──────────────────────────────────────────────────────────────────
  // OPTICAL PHYSICS — pure functions (no DOM)
  // ──────────────────────────────────────────────────────────────────

  // Mirror / thin-lens equation: 1/f = 1/d_o + 1/d_i  →  d_i = (f * d_o) / (d_o - f)
  // Sign convention (used throughout this tool):
  //   d_o > 0 always (object in front of mirror/lens)
  //   f > 0 for concave mirror / converging lens
  //   f < 0 for convex mirror / diverging lens
  //   d_i > 0 → real image (same side as light source for mirror, opposite side for lens)
  //   d_i < 0 → virtual image (opposite side for mirror, same side for lens)
  //   m = -d_i / d_o (m > 0 upright; m < 0 inverted)
  function thinLens(d_o, f) {
    if (!_isNum(d_o) || d_o <= 0 || !_isNum(f) || f === 0) return { error: 'Need d_o > 0 and f ≠ 0.' };
    if (Math.abs(d_o - f) < 1e-9) return { error: 'Object at the focal point — image at infinity.' };
    var d_i = (f * d_o) / (d_o - f);
    var m = -d_i / d_o;
    return {
      d_o: d_o, f: f, d_i: d_i, m: m,
      isReal: d_i > 0,
      isUpright: m > 0,
      isMagnified: Math.abs(m) > 1
    };
  }

  // Snell's law: n1 sin θ1 = n2 sin θ2.
  // Returns refracted angle (rad) or { tir: true } when total internal reflection.
  function snell(theta1Rad, n1, n2) {
    if (!_isNum(theta1Rad) || !_isNum(n1) || !_isNum(n2) || n1 <= 0 || n2 <= 0) {
      return { error: 'Indices must be > 0.' };
    }
    var sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
    if (sinTheta2 > 1 + 1e-9 || sinTheta2 < -1 - 1e-9) {
      return { tir: true, theta1: theta1Rad, n1: n1, n2: n2 };
    }
    var theta2 = Math.asin(clamp(sinTheta2, -1, 1));
    return { theta2: theta2, theta1: theta1Rad, n1: n1, n2: n2, tir: false };
  }
  // Critical angle (rad) when n1 > n2; otherwise null.
  function criticalAngle(n1, n2) {
    if (n1 <= n2) return null;
    return Math.asin(n2 / n1);
  }

  // Double-slit: position of mᵗʰ bright fringe on screen (small-angle): y = m λ L / d
  function doubleSlitFringe(m, lambdaM, L, d) {
    return m * lambdaM * L / d;
  }
  // Single-slit first-minimum position: a sinθ = λ → small-angle y₁ = λ L / a
  function singleSlitFirstMin(lambdaM, L, a) {
    return lambdaM * L / a;
  }
  // Sinc² intensity envelope at angle θ from center for single slit width a.
  function singleSlitIntensity(a, lambdaM, theta, I0) {
    if (Math.abs(theta) < 1e-12) return I0;
    var beta = Math.PI * a * Math.sin(theta) / lambdaM;
    var s = Math.sin(beta) / beta;
    return I0 * s * s;
  }
  // Double-slit intensity (combination of single-slit envelope × cos² interference)
  function doubleSlitIntensity(a, d, lambdaM, theta, I0) {
    var beta = Math.PI * a * Math.sin(theta) / lambdaM;
    var alpha = Math.PI * d * Math.sin(theta) / lambdaM;
    var envelope = (Math.abs(beta) < 1e-12) ? 1 : Math.pow(Math.sin(beta) / beta, 2);
    var interference = Math.pow(Math.cos(alpha), 2);
    return I0 * envelope * interference;
  }
  // Malus's law: I = I0 cos²(θ_between_axes)
  function malus(I0, deltaThetaRad) {
    return I0 * Math.pow(Math.cos(deltaThetaRad), 2);
  }

  // Common refractive indices for the dropdown.
  var COMMON_N = [
    { label: 'Vacuum', n: 1.000 },
    { label: 'Air', n: 1.000 },
    { label: 'Water', n: 1.333 },
    { label: 'Crown glass', n: 1.520 },
    { label: 'Flint glass', n: 1.620 },
    { label: 'Quartz', n: 1.458 },
    { label: 'Acrylic', n: 1.490 },
    { label: 'Diamond', n: 2.417 }
  ];

  // ──────────────────────────────────────────────────────────────────
  // SVG SCALE HELPER (port of _scaleLinear from statslab)
  // ──────────────────────────────────────────────────────────────────
  function _scale(domainMin, domainMax, rangeMin, rangeMax) {
    var span = domainMax - domainMin || 1;
    return function(v) { return rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin); };
  }

  // ──────────────────────────────────────────────────────────────────
  // REFLECTION SIM — plane / concave / convex mirror with ray tracing
  // ──────────────────────────────────────────────────────────────────
  function _renderReflectionSim(state, upd, h) {
    var W = 460, H = 280;
    var pad = { l: 12, r: 12, t: 12, b: 28 };
    // Virtual coordinate space: x in cm from -50 to +20; mirror sits at x = 0.
    var cmMin = -50, cmMax = 20;
    var sx = _scale(cmMin, cmMax, pad.l, W - pad.r);
    var sy = _scale(-15, 15, H - pad.b, pad.t);  // y in cm, flipped
    var mt = state.reflMirrorType || 'concave';  // 'plane' | 'concave' | 'convex'
    var f = mt === 'plane' ? Infinity : (mt === 'concave' ? Math.abs(state.reflFocal || 10) : -Math.abs(state.reflFocal || 10));
    var d_o = state.reflDo || 25;
    var hObj = state.reflObjH || 6;
    var lens = thinLens(d_o, f === Infinity ? 1e9 : f);
    var d_i = (f === Infinity) ? -d_o : (lens.error ? null : lens.d_i);
    var m = (f === Infinity) ? 1 : (lens.error ? null : lens.m);
    var hImg = (m == null) ? null : m * hObj;
    // Object x (negative → in front of mirror)
    var objX = -d_o;
    var imgX = (d_i == null) ? null : -d_i;  // d_i > 0 → real (same side as object, in front)
    // Drag handler for object distance
    function onObjDrag(e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var pxX = e.clientX - rect.left;
      var newCm = (pxX - pad.l) / (W - pad.l - pad.r) * (cmMax - cmMin) + cmMin;
      var newDo = clamp(-newCm, 1, 50);
      upd('reflDo', Math.round(newDo * 10) / 10);
    }
    // Build the SVG
    return h('div', null,
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } }, 'Mirror:',
          h('select', {
            value: mt,
            onChange: function(e) { upd('reflMirrorType', e.target.value); },
            'data-op-focusable': 'true', 'aria-label': 'Mirror type',
            style: { padding: '4px 8px', background: '#0f172a', color: '#e0e7ff', border: '1px solid #475569', borderRadius: 6, fontSize: 12 }
          },
            h('option', { value: 'plane' }, 'Plane'),
            h('option', { value: 'concave' }, 'Concave (converging)'),
            h('option', { value: 'convex' }, 'Convex (diverging)')
          )
        ),
        mt !== 'plane' && h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          '|f| (cm):',
          h('input', {
            type: 'range', min: 5, max: 30, step: 0.5,
            value: state.reflFocal || 10,
            onChange: function(e) { upd('reflFocal', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Focal length',
            style: { width: 110 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, (state.reflFocal || 10).toFixed(1))
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'd_o (cm):',
          h('input', {
            type: 'range', min: 1, max: 45, step: 0.5,
            value: d_o,
            onChange: function(e) { upd('reflDo', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Object distance',
            style: { width: 110 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, d_o.toFixed(1))
        )
      ),
      h('svg', {
        width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': 'Mirror ray diagram. ' + mt + ' mirror' + (mt !== 'plane' ? ', f = ' + (f).toFixed(1) + ' cm' : '') + ', object at ' + d_o.toFixed(1) + ' cm.',
        onClick: onObjDrag,
        style: { background: '#0b1220', borderRadius: 8, cursor: 'crosshair', maxWidth: 460 }
      },
        // Background grid
        (function() {
          var g = [];
          for (var gx = -50; gx <= 20; gx += 5) {
            g.push(h('line', { key: 'gx' + gx, x1: sx(gx), y1: pad.t, x2: sx(gx), y2: H - pad.b, stroke: '#1e293b', strokeWidth: 1 }));
          }
          for (var gy = -15; gy <= 15; gy += 3) {
            g.push(h('line', { key: 'gy' + gy, x1: pad.l, y1: sy(gy), x2: W - pad.r, y2: sy(gy), stroke: '#1e293b', strokeWidth: 1 }));
          }
          return g;
        })(),
        // Optical axis
        h('line', { x1: pad.l, y1: sy(0), x2: W - pad.r, y2: sy(0), stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }),
        // Focal points (for curved mirrors)
        f !== Infinity && h('circle', { cx: sx(-f), cy: sy(0), r: 3, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1 }),
        f !== Infinity && h('text', { x: sx(-f), y: sy(0) - 6, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, 'F'),
        f !== Infinity && h('circle', { cx: sx(-2 * f), cy: sy(0), r: 3, fill: '#94a3b8', stroke: '#0b1220', strokeWidth: 1 }),
        f !== Infinity && h('text', { x: sx(-2 * f), y: sy(0) - 6, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'C'),
        // Mirror at x = 0 (rendered as a vertical line with a curve indication for non-plane)
        (function() {
          if (mt === 'plane') {
            return h('line', { key: 'mir', x1: sx(0), y1: sy(-12), x2: sx(0), y2: sy(12), stroke: '#a5b4fc', strokeWidth: 3 });
          }
          // Curved: bow toward (concave) or away (convex) from the object
          var curvePath = mt === 'concave'
            ? 'M ' + sx(0) + ' ' + sy(-12) + ' Q ' + sx(2) + ' ' + sy(0) + ' ' + sx(0) + ' ' + sy(12)
            : 'M ' + sx(0) + ' ' + sy(-12) + ' Q ' + sx(-2) + ' ' + sy(0) + ' ' + sx(0) + ' ' + sy(12);
          return h('path', { key: 'mir', d: curvePath, fill: 'none', stroke: '#a5b4fc', strokeWidth: 3 });
        })(),
        // Object arrow (yellow, upward from axis)
        h('line', {
          x1: sx(objX), y1: sy(0), x2: sx(objX), y2: sy(hObj),
          stroke: '#fbbf24', strokeWidth: 3
        }),
        h('polygon', {
          points: [sx(objX) - 4, sy(hObj) + 4, sx(objX) + 4, sy(hObj) + 4, sx(objX), sy(hObj) - 2].join(' '),
          fill: '#fbbf24'
        }),
        h('text', { x: sx(objX), y: sy(hObj) - 6, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'Object'),
        // Three principal rays for curved mirrors (or single law-of-reflection for plane)
        (function() {
          // Helper to push a photon dot along a path (CSS Motion Path)
          function makePhoton(key, pathStr, color, delay) {
            return h('circle', {
              key: key, r: 3.2, fill: color,
              stroke: '#fff', strokeWidth: 0.5,
              style: {
                offsetPath: 'path("' + pathStr + '")',
                WebkitOffsetPath: 'path("' + pathStr + '")',
                filter: 'drop-shadow(0 0 4px ' + color + ')',
                animationDuration: '2.6s',
                animationDelay: (delay || 0) + 's'
              },
              className: 'opticslab-photon',
              cx: 0, cy: 0
            });
          }
          if (mt === 'plane') {
            // Plane mirror: incidence + reflection ray
            var planePath = 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(0) + ' L ' + sx(-objX) + ' ' + sy(hObj);
            return [
              h('line', { key: 'r1', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(0), stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '0' }),
              h('line', { key: 'r2', x1: sx(0), y1: sy(0), x2: sx(-objX), y2: sy(hObj), stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.7 }),
              // Virtual image (behind mirror, dotted)
              h('line', { key: 'rv', x1: sx(objX), y1: sy(hObj), x2: sx(-objX), y2: sy(hObj), stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.5 }),
              makePhoton('pp1', planePath, '#10b981', 0)
            ];
          }
          // Curved mirror — 3 principal rays from object tip
          var children = [];
          var photonPaths = [];
          var imgY = (hImg == null) ? 0 : hImg;
          var imgIsValid = imgX != null && _isNum(imgX) && _isNum(imgY);
          // Ray 1: parallel to axis from object tip → hits mirror at (0, hObj) → reflects through F
          children.push(h('line', { key: 'r1a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(hObj), stroke: '#10b981', strokeWidth: 1.5 }));
          if (imgIsValid && d_i > 0) {
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(imgX), y2: sy(imgY), stroke: '#10b981', strokeWidth: 1.5 }));
            photonPaths.push({ color: '#10b981',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(hObj) + ' L ' + sx(imgX) + ' ' + sy(imgY) });
          } else if (imgIsValid && d_i < 0) {
            // Virtual: reflect away from F, dotted extension behind mirror to virtual image
            // The reflected ray, when extended backward, passes through the virtual image
            var divergedRightX = cmMax;
            var divergedRightY = hObj + (cmMax / Math.abs(f)) * hObj;
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(divergedRightX), y2: sy(divergedRightY), stroke: '#10b981', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r1c', x1: sx(0), y1: sy(hObj), x2: sx(imgX), y2: sy(imgY), stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }));
            photonPaths.push({ color: '#10b981',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(hObj) + ' L ' + sx(divergedRightX) + ' ' + sy(divergedRightY) });
          }
          // Ray 2: through F → reflects parallel
          if (mt === 'concave' && d_o > Math.abs(f)) {
            // Object beyond F → ray from tip through F to mirror, then parallel out
            // Slope from tip (objX, hObj) through F (-f, 0)
            var slope2 = (0 - hObj) / (-f - objX);
            var yAtMirror = hObj + slope2 * (0 - objX);
            children.push(h('line', { key: 'r2a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(yAtMirror), stroke: '#06b6d4', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r2b', x1: sx(0), y1: sy(yAtMirror), x2: sx(cmMax), y2: sy(yAtMirror), stroke: '#06b6d4', strokeWidth: 1.5 }));
            photonPaths.push({ color: '#06b6d4',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(yAtMirror) + ' L ' + sx(cmMax) + ' ' + sy(yAtMirror) });
          }
          // Ray 3: through C (center of curvature, at -2f) → reflects back along itself
          if (mt === 'concave') {
            var slope3 = (0 - hObj) / (-2 * f - objX);
            var yAtMir3 = hObj + slope3 * (0 - objX);
            children.push(h('line', { key: 'r3a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(yAtMir3), stroke: '#a855f7', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r3b', x1: sx(0), y1: sy(yAtMir3), x2: sx(objX), y2: sy(hObj), stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '0' }));
            photonPaths.push({ color: '#a855f7',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(yAtMir3) + ' L ' + sx(objX) + ' ' + sy(hObj) });
          }
          // Image arrow
          if (imgIsValid) {
            var stroke = (d_i > 0) ? '#ef4444' : '#fca5a5';
            var dash = (d_i > 0) ? '0' : '3 3';
            children.push(h('line', { key: 'img', x1: sx(imgX), y1: sy(0), x2: sx(imgX), y2: sy(imgY), stroke: stroke, strokeWidth: 3, strokeDasharray: dash, opacity: (d_i > 0) ? 1 : 0.7 }));
            var arrowY = imgY > 0 ? sy(imgY) - 2 : sy(imgY) + 2;
            var arrowOff = imgY > 0 ? 4 : -4;
            children.push(h('polygon', {
              key: 'imgarrow',
              points: [sx(imgX) - 4, sy(imgY) + arrowOff, sx(imgX) + 4, sy(imgY) + arrowOff, sx(imgX), arrowY].join(' '),
              fill: stroke, opacity: (d_i > 0) ? 1 : 0.7
            }));
            children.push(h('text', { key: 'imglab', x: sx(imgX), y: imgY > 0 ? sy(imgY) - 8 : sy(imgY) + 14, fill: stroke, fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, d_i > 0 ? 'Image (real)' : 'Image (virtual)'));
          }
          // Add photon dots along each principal ray, staggered in time
          photonPaths.forEach(function(pp, ppi) {
            children.push(makePhoton('rphot' + ppi, pp.path, pp.color, -ppi * 0.8));
          });
          return children;
        })(),
        // X axis label
        h('text', { x: W / 2, y: H - 6, fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' }, 'distance from mirror (cm) — click to move object')
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } },
        '🟢 parallel ray  •  🔵 ray through F  •  🟣 ray through C (concave)  •  🔴 image (red = real, faded = virtual)'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // REFLECTION CALCULATOR
  // ──────────────────────────────────────────────────────────────────
  function _renderReflectionCalc(state, upd, h, addToast, awardXP) {
    var mt = state.reflMirrorType || 'concave';
    var f = mt === 'plane' ? Infinity : (mt === 'concave' ? Math.abs(state.reflFocal || 10) : -Math.abs(state.reflFocal || 10));
    var d_o = state.reflDo || 25;
    var lens = mt === 'plane'
      ? { d_o: d_o, f: Infinity, d_i: -d_o, m: 1, isReal: false, isUpright: true, isMagnified: false }
      : thinLens(d_o, f);
    var rows = [];
    if (lens.error) {
      rows.push(['', lens.error]);
    } else {
      rows.push(['Mirror type', mt.charAt(0).toUpperCase() + mt.slice(1)]);
      rows.push(['f', f === Infinity ? '∞ (plane)' : _fmt(f, 2) + ' cm']);
      rows.push(['d_o', _fmt(d_o, 2) + ' cm']);
      rows.push(['d_i', f === Infinity ? _fmt(-d_o, 2) + ' cm' : _fmt(lens.d_i, 2) + ' cm']);
      rows.push(['m (magnification)', _fmt(lens.m, 3)]);
      rows.push(['Image type', lens.isReal ? '✓ Real (in front of mirror)' : '✗ Virtual (behind mirror)']);
      rows.push(['Orientation', lens.isUpright ? 'Upright (m > 0)' : 'Inverted (m < 0)']);
      rows.push(['Size', lens.isMagnified ? 'Enlarged (|m| > 1)' : 'Reduced (|m| < 1)']);
    }
    return h('div', null,
      h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
        'Adjust the mirror type, focal length, and object distance in the sim. The thin-mirror equation 1/f = 1/d_o + 1/d_i computes the image automatically.'
      ),
      h('div', { style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 } },
        rows.map(function(r, i) {
          return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '40% 60%', gap: 6, padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid #1e293b' : 'none' } },
            h('span', { style: { color: '#94a3b8' } }, r[0]),
            h('span', { style: { color: '#fef3c7', fontWeight: 700 } }, r[1])
          );
        })
      ),
      h('button', {
        onClick: function() { upd('reflShowMath', !state.reflShowMath); },
        'data-op-focusable': 'true',
        'aria-expanded': !!state.reflShowMath,
        style: { marginTop: 8, background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }
      }, (state.reflShowMath ? '▼' : '▶') + ' 📐 Show me the math'),
      state.reflShowMath && !lens.error && h('div', { style: { marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre' } },
        (function() {
          if (mt === 'plane') {
            return [
              'Plane mirror: image is virtual, same size, reflected behind the mirror.',
              '',
              'd_i = −d_o = ' + _fmt(-d_o, 2) + ' cm',
              'm  = +1  (upright, same size)'
            ].join('\n');
          }
          return [
            'Mirror equation:  1/f = 1/d_o + 1/d_i',
            '',
            '  Solve for d_i:  d_i = (f · d_o) / (d_o − f)',
            '',
            '  d_i = (' + _fmt(f, 2) + ' · ' + _fmt(d_o, 2) + ') / (' + _fmt(d_o, 2) + ' − ' + _fmt(f, 2) + ')',
            '       = ' + _fmt(f * d_o, 3) + ' / ' + _fmt(d_o - f, 3),
            '       = ' + _fmt(lens.d_i, 3) + ' cm',
            '',
            'Magnification:  m = −d_i / d_o',
            '            = −' + _fmt(lens.d_i, 3) + ' / ' + _fmt(d_o, 3),
            '            = ' + _fmt(lens.m, 3),
            '',
            'Sign-rule readout:',
            '  d_i ' + (lens.d_i > 0 ? '> 0  →  REAL image (in front of mirror)' : '< 0  →  VIRTUAL image (behind mirror)'),
            '  m   ' + (lens.m > 0 ? '> 0  →  UPRIGHT' : '< 0  →  INVERTED'),
            '  |m| ' + (Math.abs(lens.m) > 1 ? '> 1 →  ENLARGED' : '< 1 →  REDUCED')
          ].join('\n');
        })()
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // REFRACTION SIM — Snell's law + TIR
  // ──────────────────────────────────────────────────────────────────
  function _renderRefractionSim(state, upd, h) {
    var W = 460, H = 280;
    var pad = { l: 12, r: 12, t: 12, b: 28 };
    var n1 = state.refrN1 != null ? state.refrN1 : 1.000;
    var n2 = state.refrN2 != null ? state.refrN2 : 1.520;
    var theta1Deg = state.refrTheta1 != null ? state.refrTheta1 : 30;
    var theta1 = degToRad(theta1Deg);
    var snellRes = snell(theta1, n1, n2);
    var theta_c = criticalAngle(n1, n2);  // null if n1 ≤ n2
    var isTIR = !!snellRes.tir;
    var theta2 = isTIR ? null : snellRes.theta2;
    // Drag the incident ray angle by clicking the upper half
    var cx = W / 2, cy = H / 2;  // interface midpoint
    function onClick(e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var pxX = e.clientX - rect.left;
      var pxY = e.clientY - rect.top;
      // Compute angle from normal (vertical at interface midpoint), in upper half only
      var dx = pxX - cx;
      var dy = cy - pxY;  // positive = above interface
      if (dy <= 1) return;
      var rawDeg = Math.atan2(dx, dy) / DEG;
      var newDeg = clamp(rawDeg, -89, 89);
      upd('refrTheta1', Math.round(newDeg * 10) / 10);
    }
    // Build endpoints relative to (cx, cy) for the incident, refracted, reflected rays
    var rayLen = 130;
    // Incident ray: comes FROM upper half AT theta1 from normal, ends at (cx, cy)
    var inX = cx - rayLen * Math.sin(theta1);
    var inY = cy - rayLen * Math.cos(theta1);
    // Reflected ray: into upper half, mirror image of incident
    var reflX = cx + rayLen * Math.sin(theta1);
    var reflY = cy - rayLen * Math.cos(theta1);
    // Refracted ray (or TIR going back up at theta1 mirrored)
    var refrX, refrY;
    if (!isTIR && theta2 != null) {
      refrX = cx + rayLen * Math.sin(theta2);
      refrY = cy + rayLen * Math.cos(theta2);
    }
    // Find a common medium label by matching n
    function nearestN(n) {
      var best = null, bestDiff = Infinity;
      COMMON_N.forEach(function(c) {
        var diff = Math.abs(c.n - n);
        if (diff < bestDiff) { bestDiff = diff; best = c; }
      });
      return (best && bestDiff < 0.005) ? best.label : 'custom';
    }
    return h('div', null,
      // Material selectors + theta slider
      h('div', { style: { display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } }, 'Top n₁:',
          h('select', {
            value: nearestN(n1),
            onChange: function(e) {
              var sel = COMMON_N.filter(function(c) { return c.label === e.target.value; })[0];
              if (sel) upd('refrN1', sel.n);
            },
            'data-op-focusable': 'true', 'aria-label': 'Top medium',
            style: { padding: '4px 6px', background: '#0f172a', color: '#e0e7ff', border: '1px solid #475569', borderRadius: 6, fontSize: 11 }
          },
            COMMON_N.map(function(c) { return h('option', { key: c.label, value: c.label }, c.label + ' (n=' + c.n.toFixed(3) + ')'); }),
            h('option', { value: 'custom' }, 'custom')
          ),
          h('input', {
            type: 'number', step: 0.001, min: 1.0, max: 3.5, value: n1,
            onChange: function(e) { upd('refrN1', parseFloat(e.target.value) || 1.0); },
            'data-op-focusable': 'true',
            style: { width: 60, padding: '4px 6px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 11, fontWeight: 700 }
          })
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } }, 'Bottom n₂:',
          h('select', {
            value: nearestN(n2),
            onChange: function(e) {
              var sel = COMMON_N.filter(function(c) { return c.label === e.target.value; })[0];
              if (sel) upd('refrN2', sel.n);
            },
            'data-op-focusable': 'true', 'aria-label': 'Bottom medium',
            style: { padding: '4px 6px', background: '#0f172a', color: '#e0e7ff', border: '1px solid #475569', borderRadius: 6, fontSize: 11 }
          },
            COMMON_N.map(function(c) { return h('option', { key: c.label, value: c.label }, c.label + ' (n=' + c.n.toFixed(3) + ')'); }),
            h('option', { value: 'custom' }, 'custom')
          ),
          h('input', {
            type: 'number', step: 0.001, min: 1.0, max: 3.5, value: n2,
            onChange: function(e) { upd('refrN2', parseFloat(e.target.value) || 1.0); },
            'data-op-focusable': 'true',
            style: { width: 60, padding: '4px 6px', background: '#0f172a', color: '#fbbf24', border: '1px solid #475569', borderRadius: 6, fontSize: 11, fontWeight: 700 }
          })
        )
      ),
      h('div', { style: { display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } }, 'θ₁ (deg):',
          h('input', {
            type: 'range', min: 0, max: 89, step: 0.5,
            value: theta1Deg,
            onChange: function(e) { upd('refrTheta1', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Incident angle',
            style: { width: 200 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36 } }, theta1Deg.toFixed(1) + '°')
        )
      ),
      h('svg', {
        width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': 'Refraction diagram. n1=' + n1 + ', n2=' + n2 + ', incident angle=' + theta1Deg.toFixed(1) + '°.' + (isTIR ? ' Total internal reflection.' : ' Refraction angle=' + radToDeg(theta2).toFixed(1) + '°.'),
        onClick: onClick,
        style: { background: '#0b1220', borderRadius: 8, cursor: 'crosshair', maxWidth: 460 }
      },
        // Top medium tint
        h('rect', { x: 0, y: 0, width: W, height: cy, fill: 'rgba(56,189,248,0.06)' }),
        // Bottom medium tint (denser if n2 > n1)
        h('rect', { x: 0, y: cy, width: W, height: H - cy, fill: n2 > n1 ? 'rgba(99,102,241,0.18)' : 'rgba(56,189,248,0.06)' }),
        // Interface line
        h('line', { x1: pad.l, y1: cy, x2: W - pad.r, y2: cy, stroke: '#94a3b8', strokeWidth: 2 }),
        // Normal (dashed vertical)
        h('line', { x1: cx, y1: pad.t, x2: cx, y2: H - pad.b, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 3' }),
        h('text', { x: cx + 4, y: pad.t + 12, fill: '#94a3b8', fontSize: 10 }, 'normal'),
        // Incident ray (yellow, with arrowhead at the interface)
        h('line', { x1: inX, y1: inY, x2: cx, y2: cy, stroke: '#fbbf24', strokeWidth: 2.5 }),
        h('polygon', { points: (cx - 4) + ',' + (cy - 5) + ' ' + (cx + 4) + ',' + (cy - 5) + ' ' + cx + ',' + (cy + 1), fill: '#fbbf24', transform: 'rotate(' + theta1Deg + ' ' + cx + ' ' + cy + ')' }),
        h('text', { x: (inX + cx) / 2 + 8, y: (inY + cy) / 2, fill: '#fbbf24', fontSize: 10, fontWeight: 700 }, 'incident (' + theta1Deg.toFixed(1) + '°)'),
        // Reflected ray (green, dashed)
        h('line', { x1: cx, y1: cy, x2: reflX, y2: reflY, stroke: '#10b981', strokeWidth: 1.8, strokeDasharray: '4 3', opacity: 0.85 }),
        h('text', { x: (reflX + cx) / 2 + 4, y: (reflY + cy) / 2, fill: '#10b981', fontSize: 10 }, 'reflected'),
        // Refracted (or TIR) ray
        !isTIR && theta2 != null ? [
          h('line', { key: 'rfr', x1: cx, y1: cy, x2: refrX, y2: refrY, stroke: '#06b6d4', strokeWidth: 2.5 }),
          h('text', { key: 'rfrlab', x: (refrX + cx) / 2 + 8, y: (refrY + cy) / 2, fill: '#06b6d4', fontSize: 10, fontWeight: 700 }, 'refracted (' + radToDeg(theta2).toFixed(1) + '°)')
        ] : [
          // TIR: draw the reflected ray as the strong outgoing ray (no transmitted light)
          h('text', { key: 'tir', x: cx, y: H - 8, fill: '#ef4444', fontSize: 12, fontWeight: 800, textAnchor: 'middle' }, '⚡ TIR — no light transmitted into n₂')
        ],
        // ── Animated photon dots along each ray ──
        // Visualizes light traveling: incoming photon hits interface, splits
        // into reflected (always) and refracted (when not TIR). Refracted
        // photon's animation duration scales with n₂ so denser-medium light
        // visibly slows down — the physics intuition behind Snell's law.
        // Browsers without CSS Motion Path fall back to static dots.
        (function() {
          var photons = [];
          var incPath = 'M ' + inX.toFixed(1) + ' ' + inY.toFixed(1) + ' L ' + cx + ' ' + cy;
          var reflPath = 'M ' + cx + ' ' + cy + ' L ' + reflX.toFixed(1) + ' ' + reflY.toFixed(1);
          // Incident photons — yellow, fast
          photons.push(h('circle', {
            key: 'pin1', r: 3.5, fill: '#fde047',
            stroke: '#fff', strokeWidth: 0.6,
            style: {
              offsetPath: 'path("' + incPath + '")',
              WebkitOffsetPath: 'path("' + incPath + '")',
              filter: 'drop-shadow(0 0 4px #fde047)',
              animationDuration: '1.8s'
            },
            className: 'opticslab-photon',
            cx: 0, cy: 0
          }));
          photons.push(h('circle', {
            key: 'pin2', r: 3,
            fill: '#fde047', stroke: '#fff', strokeWidth: 0.4,
            style: {
              offsetPath: 'path("' + incPath + '")',
              WebkitOffsetPath: 'path("' + incPath + '")',
              filter: 'drop-shadow(0 0 3px #fde047)',
              animationDuration: '1.8s',
              animationDelay: '-0.9s'
            },
            className: 'opticslab-photon',
            cx: 0, cy: 0
          }));
          // Reflected photons — green
          photons.push(h('circle', {
            key: 'pref1', r: 3, fill: '#34d399',
            stroke: '#fff', strokeWidth: 0.4,
            style: {
              offsetPath: 'path("' + reflPath + '")',
              WebkitOffsetPath: 'path("' + reflPath + '")',
              filter: 'drop-shadow(0 0 3px #34d399)',
              animationDuration: '1.8s'
            },
            className: 'opticslab-photon',
            cx: 0, cy: 0
          }));
          // Refracted photons — cyan, slower in denser medium (×n2/n1 ≈ c/v)
          if (!isTIR && theta2 != null) {
            var refPath = 'M ' + cx + ' ' + cy + ' L ' + refrX.toFixed(1) + ' ' + refrY.toFixed(1);
            // Photon visibly slows when n2 > n1. Cap so absurd durations don't kill animation.
            var refDur = (1.8 * Math.max(0.5, Math.min(2.2, n2 / n1))).toFixed(2);
            photons.push(h('circle', {
              key: 'prefr1', r: 3.5, fill: '#22d3ee',
              stroke: '#fff', strokeWidth: 0.5,
              style: {
                offsetPath: 'path("' + refPath + '")',
                WebkitOffsetPath: 'path("' + refPath + '")',
                filter: 'drop-shadow(0 0 4px #22d3ee)',
                animationDuration: refDur + 's'
              },
              className: 'opticslab-photon',
              cx: 0, cy: 0
            }));
            photons.push(h('circle', {
              key: 'prefr2', r: 3, fill: '#22d3ee',
              stroke: '#fff', strokeWidth: 0.4,
              style: {
                offsetPath: 'path("' + refPath + '")',
                WebkitOffsetPath: 'path("' + refPath + '")',
                filter: 'drop-shadow(0 0 3px #22d3ee)',
                animationDuration: refDur + 's',
                animationDelay: '-' + (parseFloat(refDur) / 2).toFixed(2) + 's'
              },
              className: 'opticslab-photon',
              cx: 0, cy: 0
            }));
          }
          // Interface impact glow — pulsing spot where photon strikes
          photons.push(h('circle', {
            key: 'impact',
            cx: cx, cy: cy, r: 5,
            fill: 'none',
            stroke: isTIR ? '#ef4444' : '#fbbf24',
            strokeWidth: 1.2,
            className: 'opticslab-wavefront',
            style: { animationDuration: '1.4s', transformOrigin: cx + 'px ' + cy + 'px' }
          }));
          return photons;
        })(),
        // Critical angle indicator (when n1 > n2)
        theta_c != null && h('text', { x: pad.l + 8, y: pad.t + 14, fill: '#fbbf24', fontSize: 10 }, 'θ_c = ' + radToDeg(theta_c).toFixed(2) + '°'),
        // Click hint
        h('text', { x: W / 2, y: H - 6, fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' }, 'click upper half to set incident angle')
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } },
        '🟡 incident  •  🟢 reflected (always present)  •  🔵 refracted  •  ⚡ red banner = total internal reflection'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // REFRACTION CALCULATOR
  // ──────────────────────────────────────────────────────────────────
  function _renderRefractionCalc(state, upd, h) {
    var n1 = state.refrN1 != null ? state.refrN1 : 1.000;
    var n2 = state.refrN2 != null ? state.refrN2 : 1.520;
    var theta1Deg = state.refrTheta1 != null ? state.refrTheta1 : 30;
    var theta1 = degToRad(theta1Deg);
    var res = snell(theta1, n1, n2);
    var theta_c = criticalAngle(n1, n2);
    var rows = [];
    rows.push(['n₁ (incident medium)', _fmt(n1, 3)]);
    rows.push(['n₂ (refractive medium)', _fmt(n2, 3)]);
    rows.push(['θ₁ (incident angle)', _fmt(theta1Deg, 2) + '°']);
    if (theta_c != null) rows.push(['θ_c (critical angle)', _fmt(radToDeg(theta_c), 3) + '°']);
    if (res.tir) {
      rows.push(['Result', '⚡ Total internal reflection (θ₁ > θ_c)']);
      rows.push(['Light transmitted into n₂', '0% — all reflected back']);
    } else if (res.error) {
      rows.push(['', res.error]);
    } else {
      rows.push(['θ₂ (refraction angle)', _fmt(radToDeg(res.theta2), 3) + '°']);
      rows.push(['Bending', n2 > n1 ? '↘ toward the normal (entering denser medium)' : '↗ away from the normal (entering less dense medium)']);
    }
    return h('div', null,
      h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
        'Snell\'s law: n₁ sin θ₁ = n₂ sin θ₂. When n₁ > n₂ and θ₁ exceeds the critical angle θ_c, no light gets through — all is reflected (TIR).'
      ),
      h('div', { style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 } },
        rows.map(function(r, i) {
          return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '50% 50%', gap: 6, padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid #1e293b' : 'none' } },
            h('span', { style: { color: '#94a3b8' } }, r[0]),
            h('span', { style: { color: '#fef3c7', fontWeight: 700 } }, r[1])
          );
        })
      ),
      h('button', {
        onClick: function() { upd('refrShowMath', !state.refrShowMath); },
        'data-op-focusable': 'true',
        'aria-expanded': !!state.refrShowMath,
        style: { marginTop: 8, background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }
      }, (state.refrShowMath ? '▼' : '▶') + ' 📐 Show me the math'),
      state.refrShowMath && h('div', { style: { marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre' } },
        (function() {
          var lines = [
            "Snell's law:  n₁ sin θ₁ = n₂ sin θ₂",
            '',
            '  Plug in:   ' + _fmt(n1, 3) + ' · sin(' + _fmt(theta1Deg, 2) + '°) = ' + _fmt(n2, 3) + ' · sin(θ₂)',
            '             ' + _fmt(n1, 3) + ' · ' + _fmt(Math.sin(theta1), 4) + ' = ' + _fmt(n2, 3) + ' · sin(θ₂)',
            '             ' + _fmt(n1 * Math.sin(theta1), 4) + ' = ' + _fmt(n2, 3) + ' · sin(θ₂)',
            '             sin(θ₂) = ' + _fmt(n1 * Math.sin(theta1) / n2, 4)
          ];
          if (res.tir) {
            lines.push('             |sin(θ₂)| > 1  →  no real solution');
            lines.push('             ⚡ TOTAL INTERNAL REFLECTION');
          } else if (!res.error) {
            lines.push('             θ₂ = arcsin(' + _fmt(n1 * Math.sin(theta1) / n2, 4) + ')');
            lines.push('             θ₂ = ' + _fmt(radToDeg(res.theta2), 3) + '°');
          }
          if (theta_c != null) {
            lines.push('');
            lines.push('Critical angle (n₁ > n₂):  θ_c = arcsin(n₂/n₁)');
            lines.push('                          = arcsin(' + _fmt(n2 / n1, 4) + ')');
            lines.push('                          = ' + _fmt(radToDeg(theta_c), 3) + '°');
          }
          return lines.join('\n');
        })()
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // LENSES SIM — converging or diverging, three principal rays
  // ──────────────────────────────────────────────────────────────────
  // Sign convention (lenses): light travels left → right.
  //   Object on the LEFT at distance d_o (so x_obj = -d_o relative to lens at x = 0).
  //   f > 0 for converging lens (focuses), f < 0 for diverging lens (spreads).
  //   d_i > 0 → real image on the RIGHT side (light actually converges there).
  //   d_i < 0 → virtual image on the LEFT side (extension lines appear to converge there).
  //   m = -d_i / d_o.  m > 0 = upright, m < 0 = inverted.
  function _renderLensSim(state, upd, h) {
    var W = 460, H = 280;
    var pad = { l: 12, r: 12, t: 12, b: 28 };
    var lt = state.lensType || 'converging';   // 'converging' | 'diverging'
    var fAbs = Math.abs(state.lensFocal != null ? state.lensFocal : 12);
    var f = lt === 'converging' ? fAbs : -fAbs;
    var d_o = state.lensDo != null ? state.lensDo : 25;
    var hObj = state.lensObjH != null ? state.lensObjH : 5;
    var lens = thinLens(d_o, f);
    var d_i = lens.error ? null : lens.d_i;
    var m = lens.error ? null : lens.m;
    var hImg = (m == null) ? null : m * hObj;
    // Coordinate space: x in cm; lens at x = 0; useful range -45 to +45
    var cmMin = -45, cmMax = 45;
    var sx = _scale(cmMin, cmMax, pad.l, W - pad.r);
    var sy = _scale(-12, 12, H - pad.b, pad.t);
    var objX = -d_o;       // object to the left
    var imgX = (d_i == null) ? null : d_i;   // d_i > 0 → right of lens; d_i < 0 → left
    function onClickSetObj(e) {
      var rect = e.currentTarget.getBoundingClientRect();
      var pxX = e.clientX - rect.left;
      var newCm = (pxX - pad.l) / (W - pad.l - pad.r) * (cmMax - cmMin) + cmMin;
      // Object must be on the left (x < 0) and distance ≥ 1 cm
      var newDo = clamp(-newCm, 1, 40);
      upd('lensDo', Math.round(newDo * 10) / 10);
    }
    return h('div', null,
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } }, 'Lens:',
          h('select', {
            value: lt,
            onChange: function(e) { upd('lensType', e.target.value); },
            'data-op-focusable': 'true', 'aria-label': 'Lens type',
            style: { padding: '4px 8px', background: '#0f172a', color: '#e0e7ff', border: '1px solid #475569', borderRadius: 6, fontSize: 12 }
          },
            h('option', { value: 'converging' }, 'Converging (f > 0)'),
            h('option', { value: 'diverging' }, 'Diverging (f < 0)')
          )
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          '|f| (cm):',
          h('input', {
            type: 'range', min: 4, max: 35, step: 0.5,
            value: fAbs,
            onChange: function(e) { upd('lensFocal', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Focal length',
            style: { width: 110 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, fAbs.toFixed(1))
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'd_o (cm):',
          h('input', {
            type: 'range', min: 1, max: 40, step: 0.5,
            value: d_o,
            onChange: function(e) { upd('lensDo', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Object distance',
            style: { width: 110 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, d_o.toFixed(1))
        )
      ),
      h('svg', {
        width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': lt + ' lens, f = ' + f.toFixed(1) + ' cm, object distance ' + d_o.toFixed(1) + ' cm.' + (d_i != null ? (' Image distance ' + d_i.toFixed(1) + ' cm, magnification ' + m.toFixed(2) + ', ' + (d_i > 0 ? 'real' : 'virtual') + '.') : ''),
        onClick: onClickSetObj,
        style: { background: '#0b1220', borderRadius: 8, cursor: 'crosshair', maxWidth: 460 }
      },
        // Background grid
        (function() {
          var g = [];
          for (var gx = -45; gx <= 45; gx += 5) {
            g.push(h('line', { key: 'gx' + gx, x1: sx(gx), y1: pad.t, x2: sx(gx), y2: H - pad.b, stroke: '#1e293b', strokeWidth: 1 }));
          }
          for (var gy = -12; gy <= 12; gy += 3) {
            g.push(h('line', { key: 'gy' + gy, x1: pad.l, y1: sy(gy), x2: W - pad.r, y2: sy(gy), stroke: '#1e293b', strokeWidth: 1 }));
          }
          return g;
        })(),
        // Optical axis
        h('line', { x1: pad.l, y1: sy(0), x2: W - pad.r, y2: sy(0), stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }),
        // Lens at x = 0 — converging is biconvex; diverging is biconcave
        (function() {
          var lensX = sx(0);
          var topY = sy(10), botY = sy(-10);
          if (lt === 'converging') {
            // Biconvex: outward arrows on both sides
            return h('g', null,
              h('line', { x1: lensX, y1: topY, x2: lensX, y2: botY, stroke: '#a5b4fc', strokeWidth: 3 }),
              h('polygon', { points: (lensX - 4) + ',' + (topY + 6) + ' ' + (lensX + 4) + ',' + (topY + 6) + ' ' + lensX + ',' + topY, fill: '#a5b4fc' }),
              h('polygon', { points: (lensX - 4) + ',' + (botY - 6) + ' ' + (lensX + 4) + ',' + (botY - 6) + ' ' + lensX + ',' + botY, fill: '#a5b4fc' })
            );
          } else {
            // Biconcave: inward arrows
            return h('g', null,
              h('line', { x1: lensX, y1: topY, x2: lensX, y2: botY, stroke: '#a5b4fc', strokeWidth: 3 }),
              h('polygon', { points: (lensX - 4) + ',' + topY + ' ' + (lensX + 4) + ',' + topY + ' ' + lensX + ',' + (topY + 8), fill: '#a5b4fc' }),
              h('polygon', { points: (lensX - 4) + ',' + botY + ' ' + (lensX + 4) + ',' + botY + ' ' + lensX + ',' + (botY - 8), fill: '#a5b4fc' })
            );
          }
        })(),
        // Focal points: F at ±|f|
        h('circle', { cx: sx(-fAbs), cy: sy(0), r: 3, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1 }),
        h('text', { x: sx(-fAbs), y: sy(0) - 6, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, 'F'),
        h('circle', { cx: sx(fAbs), cy: sy(0), r: 3, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1 }),
        h('text', { x: sx(fAbs), y: sy(0) - 6, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, "F'"),
        // 2F markers
        h('circle', { cx: sx(-2 * fAbs), cy: sy(0), r: 2, fill: '#94a3b8', stroke: '#0b1220', strokeWidth: 1 }),
        h('text', { x: sx(-2 * fAbs), y: sy(0) - 6, fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' }, '2F'),
        h('circle', { cx: sx(2 * fAbs), cy: sy(0), r: 2, fill: '#94a3b8', stroke: '#0b1220', strokeWidth: 1 }),
        h('text', { x: sx(2 * fAbs), y: sy(0) - 6, fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' }, "2F'"),
        // Object arrow
        h('line', { x1: sx(objX), y1: sy(0), x2: sx(objX), y2: sy(hObj), stroke: '#fbbf24', strokeWidth: 3 }),
        h('polygon', {
          points: [sx(objX) - 4, sy(hObj) + 4, sx(objX) + 4, sy(hObj) + 4, sx(objX), sy(hObj) - 2].join(' '),
          fill: '#fbbf24'
        }),
        h('text', { x: sx(objX), y: sy(hObj) - 6, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'Object'),
        // Three principal rays from the tip of the object (objX, hObj)
        (function() {
          var children = [];
          if (d_i == null || lens.error) return children;
          var imgY = m * hObj;
          var isVirtual = d_i < 0;
          // Collect ray-path strings so we can attach traveling photon dots that
          // animate along each ray (CSS Motion Path). This gives students a
          // visceral sense of light actually moving through the system.
          var photonPaths = [];
          // Ray 1 — parallel to axis from tip → hits lens at (0, hObj) → bends through F' (right focus, at +fAbs)
          children.push(h('line', { key: 'r1a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(hObj), stroke: '#10b981', strokeWidth: 1.5 }));
          if (lt === 'converging') {
            // Goes through F' on the right. From (0, hObj) toward (fAbs, 0) and beyond.
            // Compute extension point at right edge
            var slope1 = (0 - hObj) / (fAbs - 0);
            var rightX = cmMax;
            var rightY = hObj + slope1 * (rightX - 0);
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(rightX), y2: sy(rightY), stroke: '#10b981', strokeWidth: 1.5 }));
            photonPaths.push({ color: '#10b981',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(hObj) + ' L ' + sx(rightX) + ' ' + sy(rightY) });
          } else {
            // Diverging: ray bends as if it came from the LEFT focus (F at -fAbs).
            // The outgoing ray's extension passes through (-fAbs, 0).
            // Slope from (-fAbs, 0) to (0, hObj): hObj / fAbs. Forward (right of lens) the ray goes from (0, hObj) with the same slope.
            var sl = hObj / fAbs;
            var rx = cmMax;
            var ry = hObj + sl * (rx - 0);
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(rx), y2: sy(ry), stroke: '#10b981', strokeWidth: 1.5 }));
            // Dotted backward extension to F (the apparent virtual source)
            children.push(h('line', { key: 'r1c', x1: sx(0), y1: sy(hObj), x2: sx(-fAbs), y2: sy(0), stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }));
            photonPaths.push({ color: '#10b981',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(hObj) + ' L ' + sx(rx) + ' ' + sy(ry) });
          }
          // Ray 2 — through center of lens, undeviated
          var slope2 = (0 - hObj) / (0 - objX);
          var rx2 = cmMax;
          var ry2 = hObj + slope2 * (rx2 - objX);
          children.push(h('line', { key: 'r2', x1: sx(objX), y1: sy(hObj), x2: sx(rx2), y2: sy(ry2), stroke: '#06b6d4', strokeWidth: 1.5 }));
          photonPaths.push({ color: '#06b6d4',
            path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(rx2) + ' ' + sy(ry2) });
          // Ray 3 — through near focal point F (left, at -fAbs) emerges parallel to axis (converging only)
          if (lt === 'converging' && d_o > fAbs) {
            // Slope from (objX, hObj) through (-fAbs, 0)
            var slope3 = (0 - hObj) / (-fAbs - objX);
            var yAtLens = hObj + slope3 * (0 - objX);
            children.push(h('line', { key: 'r3a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(yAtLens), stroke: '#a855f7', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r3b', x1: sx(0), y1: sy(yAtLens), x2: sx(cmMax), y2: sy(yAtLens), stroke: '#a855f7', strokeWidth: 1.5 }));
            photonPaths.push({ color: '#a855f7',
              path: 'M ' + sx(objX) + ' ' + sy(hObj) + ' L ' + sx(0) + ' ' + sy(yAtLens) + ' L ' + sx(cmMax) + ' ' + sy(yAtLens) });
          }
          // Add traveling photon dots — one per ray, staggered in time.
          // Uses CSS Motion Path (offset-path) so the dot follows the ray.
          // Browsers without offset-path leave the dot at its origin (acceptable
          // fallback because the ray lines themselves are already visible).
          var photonClasses = ['opticslab-photon', 'opticslab-photon opticslab-photon-2', 'opticslab-photon opticslab-photon-3'];
          photonPaths.forEach(function(pp, ppi) {
            children.push(h('circle', {
              key: 'photon' + ppi,
              r: 3.5,
              fill: pp.color,
              stroke: '#fff', strokeWidth: 0.6,
              className: photonClasses[ppi] || 'opticslab-photon',
              style: {
                offsetPath: 'path("' + pp.path + '")',
                // WebKit prefix for older Safari
                WebkitOffsetPath: 'path("' + pp.path + '")',
                filter: 'drop-shadow(0 0 3px ' + pp.color + ')'
              },
              cx: 0, cy: 0
            }));
          });
          // Image arrow
          var imgIsValid = imgX != null && _isNum(imgX) && _isNum(imgY);
          if (imgIsValid) {
            var stroke = isVirtual ? '#fca5a5' : '#ef4444';
            var dash = isVirtual ? '3 3' : '0';
            var op = isVirtual ? 0.7 : 1;
            children.push(h('line', { key: 'img', x1: sx(imgX), y1: sy(0), x2: sx(imgX), y2: sy(imgY), stroke: stroke, strokeWidth: 3, strokeDasharray: dash, opacity: op }));
            var arrowOff = imgY > 0 ? 4 : -4;
            var arrowY = imgY > 0 ? sy(imgY) - 2 : sy(imgY) + 2;
            children.push(h('polygon', {
              key: 'imgarrow',
              points: [sx(imgX) - 4, sy(imgY) + arrowOff, sx(imgX) + 4, sy(imgY) + arrowOff, sx(imgX), arrowY].join(' '),
              fill: stroke, opacity: op
            }));
            children.push(h('text', {
              key: 'imglab', x: sx(imgX), y: imgY > 0 ? sy(imgY) - 8 : sy(imgY) + 14,
              fill: stroke, fontSize: 10, textAnchor: 'middle', fontWeight: 700
            }, isVirtual ? 'Image (virtual)' : 'Image (real)'));
          }
          return children;
        })(),
        // Click hint
        h('text', { x: W / 2, y: H - 6, fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' }, 'click to move object')
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } },
        '🟢 parallel ray  •  🔵 through center  •  🟣 through F (converging)  •  🔴 image (red = real, faded = virtual)'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // LENSES CALCULATOR
  // ──────────────────────────────────────────────────────────────────
  function _renderLensCalc(state, upd, h, addToast, awardXP) {
    var lt = state.lensType || 'converging';
    var fAbs = Math.abs(state.lensFocal != null ? state.lensFocal : 12);
    var f = lt === 'converging' ? fAbs : -fAbs;
    var d_o = state.lensDo != null ? state.lensDo : 25;
    var lens = thinLens(d_o, f);
    var rows = [];
    if (lens.error) {
      rows.push(['', lens.error]);
    } else {
      rows.push(['Lens type', lt + ' (f ' + (f > 0 ? '> 0' : '< 0') + ')']);
      rows.push(['f', _fmt(f, 2) + ' cm']);
      rows.push(['d_o', _fmt(d_o, 2) + ' cm']);
      rows.push(['d_i', _fmt(lens.d_i, 2) + ' cm']);
      rows.push(['m (magnification)', _fmt(lens.m, 3)]);
      rows.push(['Image type', lens.isReal ? '✓ Real (light converges on far side)' : '✗ Virtual (extension lines on near side)']);
      rows.push(['Orientation', lens.isUpright ? 'Upright (m > 0)' : 'Inverted (m < 0)']);
      rows.push(['Size', lens.isMagnified ? 'Magnified (|m| > 1)' : 'Reduced (|m| < 1)']);
    }
    return h('div', null,
      h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
        'Thin lens equation: 1/f = 1/d_o + 1/d_i. Sign rules: f > 0 for converging lenses, f < 0 for diverging lenses; d_i > 0 → real image (far side), d_i < 0 → virtual (near side); m < 0 → inverted.'
      ),
      h('div', { style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 } },
        rows.map(function(r, i) {
          return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '40% 60%', gap: 6, padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid #1e293b' : 'none' } },
            h('span', { style: { color: '#94a3b8' } }, r[0]),
            h('span', { style: { color: '#fef3c7', fontWeight: 700 } }, r[1])
          );
        })
      ),
      // Quest auto-tracking on the calc render: award once per category
      !lens.error && (function() {
        if (lens.isReal && !state.realImageFormed) {
          setTimeout(function() {
            upd({ realImageFormed: true });
            if (awardXP) awardXP(10, 'OpticsLab — formed a real image', 'opticsLab');
          }, 50);
        } else if (!lens.isReal && !state.virtualImageFormed) {
          setTimeout(function() {
            upd({ virtualImageFormed: true });
            if (awardXP) awardXP(10, 'OpticsLab — formed a virtual image', 'opticsLab');
          }, 50);
        }
        return null;
      })(),
      h('button', {
        onClick: function() { upd('lensShowMath', !state.lensShowMath); },
        'data-op-focusable': 'true',
        'aria-expanded': !!state.lensShowMath,
        style: { marginTop: 8, background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }
      }, (state.lensShowMath ? '▼' : '▶') + ' 📐 Show me the math'),
      state.lensShowMath && !lens.error && h('div', { style: { marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre' } },
        [
          'Thin lens equation:  1/f = 1/d_o + 1/d_i',
          '',
          '  Solve for d_i:   d_i = (f · d_o) / (d_o − f)',
          '',
          '  d_i = (' + _fmt(f, 2) + ' · ' + _fmt(d_o, 2) + ') / (' + _fmt(d_o, 2) + ' − ' + _fmt(f, 2) + ')',
          '       = ' + _fmt(f * d_o, 3) + ' / ' + _fmt(d_o - f, 3),
          '       = ' + _fmt(lens.d_i, 3) + ' cm',
          '',
          'Magnification:  m = −d_i / d_o',
          '            = −' + _fmt(lens.d_i, 3) + ' / ' + _fmt(d_o, 3),
          '            = ' + _fmt(lens.m, 3),
          '',
          'Sign-rule readout:',
          '  f   ' + (f > 0 ? '> 0  →  CONVERGING lens' : '< 0  →  DIVERGING lens'),
          '  d_i ' + (lens.d_i > 0 ? '> 0  →  REAL image (far side of lens)' : '< 0  →  VIRTUAL image (near side of lens)'),
          '  m   ' + (lens.m > 0 ? '> 0  →  UPRIGHT' : '< 0  →  INVERTED'),
          '  |m| ' + (Math.abs(lens.m) > 1 ? '> 1 →  MAGNIFIED' : '< 1 →  REDUCED')
        ].join('\n')
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERFERENCE SIM — Young's double-slit
  // λ in nm; d (slit separation) in mm; L (slit-to-screen) in m.
  // ──────────────────────────────────────────────────────────────────
  function _renderInterferenceSim(state, upd, h) {
    var W = 460, H = 280;
    var pad = { l: 12, r: 12, t: 12, b: 28 };
    var lambdaNm = state.intLambda != null ? state.intLambda : 600;     // nm
    var d_mm = state.intSlitSep != null ? state.intSlitSep : 0.10;       // mm
    var L_m = state.intScreenL != null ? state.intScreenL : 1.0;         // m
    var slitWidth_um = state.intSlitWidth != null ? state.intSlitWidth : 50;  // μm (a)
    // Convert all to meters
    var lambda = lambdaNm * 1e-9;
    var d = d_mm * 1e-3;
    var a = slitWidth_um * 1e-6;
    var L = L_m;
    var color = wavelengthToRGB(lambdaNm);
    // Compute fringe spacing (small-angle): y = λL/d
    var fringeSpacing_m = lambda * L / d;
    var fringeSpacing_mm = fringeSpacing_m * 1000;
    // Render: barrier on left half, screen on right half, intensity strip on screen
    // Layout: barrier at x = pad.l + 60, screen at x = W - pad.r - 30
    var barX = pad.l + 70;
    var screenX = W - pad.r - 14;
    var midY = (H - pad.b + pad.t) / 2;
    // Slit positions on barrier (above & below center, at half slit-separation each)
    var slitOffsetPx = 18;
    var slitTopY = midY - slitOffsetPx;
    var slitBotY = midY + slitOffsetPx;
    // Build intensity envelope on the screen
    // y in meters on the actual physical screen; we map a window of ±5 fringe spacings
    var screenWindow_m = 6 * fringeSpacing_m;
    var nSamples = 60;
    var intensitySamples = [];
    var I0 = 1.0;
    for (var s = 0; s < nSamples; s++) {
      var yPhys = -screenWindow_m / 2 + (screenWindow_m * s / (nSamples - 1));
      var theta = Math.atan(yPhys / L);
      var I = doubleSlitIntensity(a, d, lambda, theta, I0);
      intensitySamples.push(I);
    }
    // Map intensity to bar height/opacity along the screen
    var screenTop = pad.t + 20, screenBot = H - pad.b - 6;
    var screenHeight = screenBot - screenTop;
    return h('div', null,
      // Sliders
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'λ (nm):',
          h('input', {
            type: 'range', min: 380, max: 750, step: 5,
            value: lambdaNm,
            onChange: function(e) { upd('intLambda', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Wavelength',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, lambdaNm.toFixed(0))
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'd (mm):',
          h('input', {
            type: 'range', min: 0.02, max: 0.50, step: 0.01,
            value: d_mm,
            onChange: function(e) { upd('intSlitSep', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Slit separation',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, d_mm.toFixed(2))
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'L (m):',
          h('input', {
            type: 'range', min: 0.2, max: 3.0, step: 0.1,
            value: L_m,
            onChange: function(e) { upd('intScreenL', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Screen distance',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, L_m.toFixed(1))
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'a (μm):',
          h('input', {
            type: 'range', min: 10, max: 200, step: 5,
            value: slitWidth_um,
            onChange: function(e) { upd('intSlitWidth', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Slit width',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, slitWidth_um.toFixed(0))
        )
      ),
      h('svg', {
        width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': "Young's double-slit interference. Wavelength " + lambdaNm + ' nm, slit separation ' + d_mm + ' mm, screen ' + L_m + ' m. Fringe spacing ' + fringeSpacing_mm.toFixed(2) + ' mm.',
        style: { background: '#000', borderRadius: 8, maxWidth: 460 }
      },
        // Light source label
        h('text', { x: pad.l + 4, y: midY - 4, fill: color, fontSize: 10, fontWeight: 700 }, '◦ source'),
        h('rect', { x: pad.l, y: midY - 8, width: 12, height: 16, fill: color, opacity: 0.85, rx: 4 }),
        // Coherent light path from source toward barrier
        h('line', { x1: pad.l + 12, y1: midY, x2: barX, y2: midY, stroke: color, strokeWidth: 2, opacity: 0.55 }),
        // Barrier — opaque with two slits
        h('rect', { x: barX, y: pad.t, width: 6, height: H - pad.b - pad.t, fill: '#475569' }),
        h('rect', { x: barX, y: slitTopY - 1, width: 6, height: 3, fill: '#000' }),
        h('rect', { x: barX, y: slitBotY - 1, width: 6, height: 3, fill: '#000' }),
        h('text', { x: barX + 3, y: pad.t + 10, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'barrier'),
        // Live wavefronts: animated expanding circles from each slit, clipped
        // to the right of the barrier so they look like wavefronts emerging
        // toward the screen. Three staggered copies per slit create a ripple.
        // The intersection of top + bottom wavefronts IS the interference —
        // students can see the constructive/destructive zones forming live.
        (function() {
          var defs = h('defs', { key: 'wf-defs' },
            h('clipPath', { id: 'opt-int-clip-' + Math.abs((d_mm + L_m).toString().length) },
              h('rect', { x: barX + 6, y: pad.t, width: screenX - barX - 6, height: H - pad.t - pad.b })
            ),
            h('filter', { id: 'opt-soft-glow' },
              h('feGaussianBlur', { stdDeviation: '1.4', result: 'g' }),
              h('feMerge', null,
                h('feMergeNode', { in: 'g' }),
                h('feMergeNode', { in: 'SourceGraphic' })
              )
            )
          );
          var clipId = 'opt-int-clip-' + Math.abs((d_mm + L_m).toString().length);
          var rings = [];
          ['', 'opticslab-wavefront-2', 'opticslab-wavefront-3'].forEach(function(extraCls, ki) {
            rings.push(h('circle', {
              key: 'wt' + ki, cx: barX + 6, cy: slitTopY, r: 4,
              fill: 'none', stroke: color, strokeWidth: 1.2, opacity: 0.7,
              filter: 'url(#opt-soft-glow)',
              className: 'opticslab-wavefront ' + extraCls,
              'clip-path': 'url(#' + clipId + ')'
            }));
            rings.push(h('circle', {
              key: 'wb' + ki, cx: barX + 6, cy: slitBotY, r: 4,
              fill: 'none', stroke: color, strokeWidth: 1.2, opacity: 0.7,
              filter: 'url(#opt-soft-glow)',
              className: 'opticslab-wavefront ' + extraCls,
              'clip-path': 'url(#' + clipId + ')'
            }));
          });
          return [defs].concat(rings);
        })(),
        // Screen
        h('rect', { x: screenX, y: screenTop, width: 8, height: screenHeight, fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }),
        // Intensity bars on the screen (one per sample, mapped to screen y range)
        intensitySamples.map(function(I, si) {
          var yPx = screenTop + screenHeight * (si / (nSamples - 1));
          var alpha = clamp(I / I0, 0, 1);
          return h('rect', {
            key: 'int' + si,
            x: screenX, y: yPx,
            width: 8, height: screenHeight / nSamples + 1,
            fill: color, opacity: alpha
          });
        }),
        // Pulsing halo on the central maximum — softly breathes to communicate
        // that the bright fringes are LIVE wave action, not a static print.
        (function() {
          var centerY = screenTop + screenHeight / 2;
          return h('g', null,
            h('circle', {
              cx: screenX + 4, cy: centerY, r: 14,
              fill: 'none', stroke: color, strokeWidth: 1.5,
              opacity: 0.45,
              className: 'opticslab-wavefront',
              style: { animationDuration: '1.6s', transformOrigin: (screenX + 4) + 'px ' + centerY + 'px' }
            }),
            h('circle', {
              cx: screenX + 4, cy: centerY, r: 14,
              fill: 'none', stroke: color, strokeWidth: 1.2,
              opacity: 0.45,
              className: 'opticslab-wavefront',
              style: { animationDuration: '1.6s', animationDelay: '-0.55s', transformOrigin: (screenX + 4) + 'px ' + centerY + 'px' }
            })
          );
        })(),
        h('text', { x: screenX + 4, y: pad.t + 10, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'screen'),
        // Fringe-spacing annotation: vertical bracket between two adjacent maxima
        (function() {
          // Two adjacent bright fringes are at Δy_pixels = (fringeSpacing_m / screenWindow_m) * screenHeight
          var frPx = (fringeSpacing_m / screenWindow_m) * screenHeight;
          if (!isFinite(frPx) || frPx < 4) return null;
          var y1 = screenTop + screenHeight / 2 - frPx;
          var y2 = screenTop + screenHeight / 2;
          var bx = screenX - 26;
          return h('g', null,
            h('line', { x1: bx, y1: y1, x2: bx, y2: y2, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('line', { x1: bx - 3, y1: y1, x2: bx + 3, y2: y1, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('line', { x1: bx - 3, y1: y2, x2: bx + 3, y2: y2, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('text', { x: bx - 6, y: (y1 + y2) / 2 + 3, fill: '#fbbf24', fontSize: 9, textAnchor: 'end' }, 'y = ' + fringeSpacing_mm.toFixed(2) + ' mm')
          );
        })(),
        h('text', { x: W / 2, y: H - 6, fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' }, "y = mλL/d  •  yellow bracket = one fringe spacing")
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } },
        'Bright fringes form where path lengths from the two slits differ by an integer number of wavelengths (constructive). Try shrinking d to widen the fringes; try a single slit (close one) to see the diffraction envelope alone.'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // INTERFERENCE CALCULATOR
  // ──────────────────────────────────────────────────────────────────
  function _renderInterferenceCalc(state, upd, h) {
    var lambdaNm = state.intLambda != null ? state.intLambda : 600;
    var d_mm = state.intSlitSep != null ? state.intSlitSep : 0.10;
    var L_m = state.intScreenL != null ? state.intScreenL : 1.0;
    var lambda = lambdaNm * 1e-9;
    var d = d_mm * 1e-3;
    var L = L_m;
    var y1 = doubleSlitFringe(1, lambda, L, d);
    var y2 = doubleSlitFringe(2, lambda, L, d);
    var theta1Rad = Math.asin(clamp(lambda / d, -1, 1));
    var rows = [];
    rows.push(['λ', lambdaNm.toFixed(0) + ' nm']);
    rows.push(['d (slit separation)', d_mm.toFixed(3) + ' mm']);
    rows.push(['L (slit → screen)', L_m.toFixed(2) + ' m']);
    rows.push(['Fringe spacing y', _fmt(y1 * 1000, 3) + ' mm  (= λL/d)']);
    rows.push(['1st bright fringe (m=1)', _fmt(y1 * 1000, 3) + ' mm from center']);
    rows.push(['2nd bright fringe (m=2)', _fmt(y2 * 1000, 3) + ' mm from center']);
    rows.push(['Angle to m=1 (small-angle)', _fmt(radToDeg(theta1Rad), 4) + '°']);
    return h('div', null,
      h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
        "Young's double-slit:  d sin θ = m λ  (bright fringes).  Small-angle approximation:  y_m = m λ L / d  on a screen at distance L."
      ),
      h('div', { style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 } },
        rows.map(function(r, i) {
          return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '50% 50%', gap: 6, padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid #1e293b' : 'none' } },
            h('span', { style: { color: '#94a3b8' } }, r[0]),
            h('span', { style: { color: '#fef3c7', fontWeight: 700 } }, r[1])
          );
        })
      ),
      h('button', {
        onClick: function() { upd('intShowMath', !state.intShowMath); },
        'data-op-focusable': 'true',
        'aria-expanded': !!state.intShowMath,
        style: { marginTop: 8, background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }
      }, (state.intShowMath ? '▼' : '▶') + ' 📐 Show me the math'),
      state.intShowMath && h('div', { style: { marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre' } },
        [
          'Fringe spacing (small-angle):  y = m λ L / d',
          '',
          '  m = 1 (first bright fringe)',
          '  λ = ' + lambdaNm + ' nm = ' + _fmt(lambda, 3) + ' m',
          '  L = ' + L_m.toFixed(2) + ' m',
          '  d = ' + d_mm.toFixed(3) + ' mm = ' + _fmt(d, 3) + ' m',
          '',
          '  y = (1)(' + _fmt(lambda, 3) + ')(' + L_m.toFixed(2) + ') / (' + _fmt(d, 3) + ')',
          '    = ' + _fmt(lambda * L, 4) + ' / ' + _fmt(d, 4),
          '    = ' + _fmt(y1, 5) + ' m',
          '    = ' + _fmt(y1 * 1000, 3) + ' mm',
          '',
          'Exact formula:  d sin θ = m λ',
          '  sin θ = mλ/d = ' + _fmt(lambda / d, 5),
          '  θ     = ' + _fmt(radToDeg(theta1Rad), 4) + '° (for m=1)'
        ].join('\n')
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // DIFFRACTION SIM — single-slit OR diffraction grating
  // ──────────────────────────────────────────────────────────────────
  function _renderDiffractionSim(state, upd, h) {
    var W = 460, H = 280;
    var pad = { l: 12, r: 12, t: 12, b: 28 };
    var mode = state.diffMode || 'single';   // 'single' | 'grating'
    var lambdaNm = state.diffLambda != null ? state.diffLambda : 600;
    var slitWidth_um = state.diffSlitWidth != null ? state.diffSlitWidth : 30;   // a, μm
    var L_m = state.diffScreenL != null ? state.diffScreenL : 1.5;
    var grooveDensity = state.diffGrating != null ? state.diffGrating : 600;     // lines/mm
    var lambda = lambdaNm * 1e-9;
    var a = slitWidth_um * 1e-6;
    var dGrating = (1 / (grooveDensity * 1000));   // m (line spacing)
    var color = wavelengthToRGB(lambdaNm);
    // First-min position single slit:  y₁ ≈ λL/a
    var firstMin_m = singleSlitFirstMin(lambda, L_m, a);
    var screenWindow_m = mode === 'single' ? 6 * firstMin_m : 0.4;  // ±0.2 m for grating
    var nSamples = 80;
    var I0 = 1.0;
    var samples = [];
    for (var s = 0; s < nSamples; s++) {
      var yPhys = -screenWindow_m / 2 + (screenWindow_m * s / (nSamples - 1));
      var theta = Math.atan(yPhys / L_m);
      var I;
      if (mode === 'single') {
        I = singleSlitIntensity(a, lambda, theta, I0);
      } else {
        // Grating: high-finesse maxima at d sinθ = mλ
        var alpha = Math.PI * dGrating * Math.sin(theta) / lambda;
        // Sharpened intensity: cos⁴ for visual emphasis (real grating intensity is sin²(Nα)/sin²(α))
        var Nslits = 50;
        var num = Math.sin(Nslits * alpha);
        var den = Math.sin(alpha);
        var f = (Math.abs(den) < 1e-9) ? Nslits * Nslits : (num * num) / (den * den);
        I = I0 * f / (Nslits * Nslits);
      }
      samples.push({ y: yPhys, I: I });
    }
    var screenX = W - pad.r - 14;
    var screenTop = pad.t + 14, screenBot = H - pad.b - 6;
    var screenHeight = screenBot - screenTop;
    var midY = (screenTop + screenBot) / 2;
    var barX = pad.l + 70;
    return h('div', null,
      // Mode toggle + sliders
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' } },
        h('div', { role: 'tablist', 'aria-label': 'Diffraction mode', style: { display: 'flex', gap: 4 } },
          ['single', 'grating'].map(function(m) {
            var sel = mode === m;
            return h('button', {
              key: m, role: 'tab', 'aria-selected': sel,
              'data-op-focusable': 'true',
              onClick: function() { upd('diffMode', m); },
              style: {
                padding: '4px 10px',
                background: sel ? 'linear-gradient(135deg,#0284c7,#0369a1)' : 'rgba(56,189,248,0.10)',
                color: sel ? '#fff' : '#7dd3fc',
                border: '1px solid ' + (sel ? '#0369a1' : 'rgba(56,189,248,0.40)'),
                borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700
              }
            }, m === 'single' ? 'Single slit' : 'Grating');
          })
        )
      ),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'λ (nm):',
          h('input', {
            type: 'range', min: 380, max: 750, step: 5, value: lambdaNm,
            onChange: function(e) { upd('diffLambda', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Wavelength',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, lambdaNm.toFixed(0))
        ),
        mode === 'single' && h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'a (μm):',
          h('input', {
            type: 'range', min: 5, max: 100, step: 1, value: slitWidth_um,
            onChange: function(e) { upd('diffSlitWidth', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Slit width',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, slitWidth_um.toFixed(0))
        ),
        mode === 'grating' && h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'lines/mm:',
          h('input', {
            type: 'range', min: 200, max: 1500, step: 50, value: grooveDensity,
            onChange: function(e) { upd('diffGrating', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Grating line density',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 40, textAlign: 'right' } }, grooveDensity.toFixed(0))
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'L (m):',
          h('input', {
            type: 'range', min: 0.3, max: 3.0, step: 0.1, value: L_m,
            onChange: function(e) { upd('diffScreenL', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Screen distance',
            style: { flex: 1 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36, textAlign: 'right' } }, L_m.toFixed(1))
        )
      ),
      h('svg', {
        width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': 'Diffraction pattern: ' + mode + ' at λ=' + lambdaNm + ' nm.',
        style: { background: '#000', borderRadius: 8, maxWidth: 460 }
      },
        // Source
        h('rect', { x: pad.l, y: midY - 8, width: 12, height: 16, fill: color, opacity: 0.85, rx: 4 }),
        h('line', { x1: pad.l + 12, y1: midY, x2: barX, y2: midY, stroke: color, strokeWidth: 2, opacity: 0.55 }),
        // Barrier
        h('rect', { x: barX, y: pad.t, width: 6, height: H - pad.b - pad.t, fill: '#475569' }),
        // Slit(s)
        mode === 'single'
          ? h('rect', { x: barX, y: midY - 2, width: 6, height: 4, fill: '#000' })
          : (function() {
              // Draw 5-7 evenly spaced slits within the central window
              var nSlits = 6;
              var spacing = 6;
              var start = midY - (nSlits / 2) * spacing;
              var rects = [];
              for (var k = 0; k < nSlits; k++) {
                rects.push(h('rect', { key: 'gs' + k, x: barX, y: start + k * spacing - 1, width: 6, height: 2, fill: '#000' }));
              }
              return rects;
            })(),
        // Diffracted rays — sample a few spreading from slit
        (function() {
          var rays = [];
          var slitX = barX + 6;
          for (var k = -3; k <= 3; k++) {
            if (k === 0) continue;
            var theta = k * 0.18;
            var endX = screenX;
            var endY = midY + (endX - slitX) * Math.tan(theta);
            rays.push(h('line', { key: 'rr' + k, x1: slitX, y1: midY, x2: endX, y2: endY, stroke: color, strokeWidth: 0.6, opacity: 0.18 }));
          }
          return rays;
        })(),
        // ── Animated wavefronts emanating from slit(s) ──
        // Single-slit: one source of expanding wavefronts that look like
        // ripples spreading toward the screen.
        // Grating: each slit emits its own wavefronts → mutual interference
        // produces the sharp peak pattern.
        // All wavefronts are clipped to the right side of the barrier so they
        // don't leak backward through the source side.
        (function() {
          var slitX = barX + 6;
          var clipId = 'opt-diff-clip-' + Math.abs((slitWidth_um + L_m * 100).toString().length);
          var nodes = [];
          // SVG defs: clip path + soft glow filter
          nodes.push(h('defs', { key: 'diff-defs' },
            h('clipPath', { id: clipId },
              h('rect', { x: slitX, y: pad.t, width: screenX - slitX, height: H - pad.t - pad.b })
            ),
            h('filter', { id: 'opt-diff-glow' },
              h('feGaussianBlur', { stdDeviation: '1.2', result: 'g' }),
              h('feMerge', null,
                h('feMergeNode', { in: 'g' }),
                h('feMergeNode', { in: 'SourceGraphic' })
              )
            )
          ));
          // Wavefront origins: one for single-slit, several for grating
          var origins;
          if (mode === 'single') {
            origins = [midY];
          } else {
            var nSlits = 6;
            var spacing = 6;
            var startY = midY - (nSlits / 2) * spacing;
            origins = [];
            for (var k = 0; k < nSlits; k++) origins.push(startY + k * spacing);
          }
          // Three staggered rings per origin
          origins.forEach(function(oy, oi) {
            ['', 'opticslab-wavefront-2', 'opticslab-wavefront-3'].forEach(function(extraCls, ki) {
              nodes.push(h('circle', {
                key: 'wfd-' + oi + '-' + ki,
                cx: slitX, cy: oy, r: 4,
                fill: 'none', stroke: color, strokeWidth: mode === 'single' ? 1.2 : 0.7,
                opacity: mode === 'single' ? 0.7 : 0.45,
                filter: 'url(#opt-diff-glow)',
                className: 'opticslab-wavefront ' + extraCls,
                'clip-path': 'url(#' + clipId + ')'
              }));
            });
          });
          return nodes;
        })(),
        // Screen
        h('rect', { x: screenX, y: screenTop, width: 8, height: screenHeight, fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }),
        // Intensity samples
        samples.map(function(samp, si) {
          var yPx = screenTop + screenHeight * (si / (nSamples - 1));
          var alpha = clamp(samp.I / I0, 0, 1);
          return h('rect', {
            key: 'i' + si, x: screenX, y: yPx,
            width: 8, height: screenHeight / nSamples + 1,
            fill: color, opacity: alpha
          });
        }),
        // First-minimum bracket (single slit only)
        mode === 'single' && (function() {
          var firstMinPx = (firstMin_m / screenWindow_m) * screenHeight;
          if (!isFinite(firstMinPx) || firstMinPx < 4) return null;
          var y1 = midY - firstMinPx;
          var y2 = midY;
          var bx = screenX - 28;
          return h('g', null,
            h('line', { x1: bx, y1: y1, x2: bx, y2: y2, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('line', { x1: bx - 3, y1: y1, x2: bx + 3, y2: y1, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('line', { x1: bx - 3, y1: y2, x2: bx + 3, y2: y2, stroke: '#fbbf24', strokeWidth: 1.5 }),
            h('text', { x: bx - 6, y: (y1 + y2) / 2 + 3, fill: '#fbbf24', fontSize: 9, textAnchor: 'end' }, 'y₁ = ' + (firstMin_m * 1000).toFixed(2) + ' mm')
          );
        })(),
        h('text', { x: barX + 3, y: pad.t + 10, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, mode === 'single' ? 'one slit' : 'grating'),
        h('text', { x: screenX + 4, y: pad.t + 10, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'screen'),
        h('text', { x: W / 2, y: H - 6, fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' }, mode === 'single' ? 'a sinθ = mλ → first min at λL/a' : 'd sinθ = mλ → sharp peaks per order')
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } },
        mode === 'single'
          ? 'Single-slit diffraction: sinc² envelope with central max at θ=0 and first minimum where a sinθ = λ.'
          : 'Diffraction grating: many slits → narrow, bright peaks per order m. Higher line density spreads the peaks farther apart.'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // DIFFRACTION CALCULATOR
  // ──────────────────────────────────────────────────────────────────
  function _renderDiffractionCalc(state, upd, h) {
    var mode = state.diffMode || 'single';
    var lambdaNm = state.diffLambda != null ? state.diffLambda : 600;
    var L_m = state.diffScreenL != null ? state.diffScreenL : 1.5;
    var lambda = lambdaNm * 1e-9;
    var rows = [];
    rows.push(['Mode', mode === 'single' ? 'Single slit' : 'Diffraction grating']);
    rows.push(['λ', lambdaNm.toFixed(0) + ' nm']);
    rows.push(['L', L_m.toFixed(2) + ' m']);
    if (mode === 'single') {
      var slitWidth_um = state.diffSlitWidth != null ? state.diffSlitWidth : 30;
      var a = slitWidth_um * 1e-6;
      var firstMin_m = singleSlitFirstMin(lambda, L_m, a);
      rows.push(['a (slit width)', slitWidth_um.toFixed(0) + ' μm']);
      rows.push(['First minimum y₁', _fmt(firstMin_m * 1000, 3) + ' mm']);
      rows.push(['Central max width (2y₁)', _fmt(firstMin_m * 2000, 3) + ' mm']);
      rows.push(['Angle to first min', _fmt(radToDeg(Math.asin(clamp(lambda / a, -1, 1))), 3) + '°']);
    } else {
      var grooveDensity = state.diffGrating != null ? state.diffGrating : 600;
      var dGrating = 1 / (grooveDensity * 1000);
      rows.push(['Lines/mm', grooveDensity.toFixed(0)]);
      rows.push(['d (groove spacing)', _fmt(dGrating * 1000, 5) + ' mm']);
      // Angles for orders m=1,2,3
      [1, 2, 3].forEach(function(m) {
        var sinT = m * lambda / dGrating;
        if (sinT > 1) {
          rows.push(['θ for m=' + m, '— (no real solution; mλ > d)']);
        } else {
          var theta = Math.asin(sinT);
          var yScreen = L_m * Math.tan(theta);
          rows.push(['θ for m=' + m, _fmt(radToDeg(theta), 3) + '°  →  y = ' + _fmt(yScreen * 1000, 2) + ' mm on screen']);
        }
      });
    }
    return h('div', null,
      h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
        mode === 'single'
          ? 'Single-slit diffraction: a sin θ = m λ for minima. Central max width is twice the first-minimum position. Smaller slit → wider central max.'
          : 'Diffraction grating: d sin θ = m λ for maxima of order m. Very narrow peaks for many lines per mm. White light splits into a spectrum at each order.'
      ),
      h('div', { style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 } },
        rows.map(function(r, i) {
          return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '40% 60%', gap: 6, padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid #1e293b' : 'none' } },
            h('span', { style: { color: '#94a3b8' } }, r[0]),
            h('span', { style: { color: '#fef3c7', fontWeight: 700 } }, r[1])
          );
        })
      ),
      h('button', {
        onClick: function() { upd('diffShowMath', !state.diffShowMath); },
        'data-op-focusable': 'true',
        'aria-expanded': !!state.diffShowMath,
        style: { marginTop: 8, background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }
      }, (state.diffShowMath ? '▼' : '▶') + ' 📐 Show me the math'),
      state.diffShowMath && h('div', { style: { marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre' } },
        (function() {
          if (mode === 'single') {
            var slitWidth_um = state.diffSlitWidth != null ? state.diffSlitWidth : 30;
            var a = slitWidth_um * 1e-6;
            var firstMin_m = singleSlitFirstMin(lambda, L_m, a);
            return [
              'Single slit: minima where a sin θ = m λ',
              '',
              'First minimum (small-angle, m=1):  y₁ = λ L / a',
              '',
              '  λ = ' + lambdaNm + ' nm = ' + _fmt(lambda, 3) + ' m',
              '  L = ' + L_m.toFixed(2) + ' m',
              '  a = ' + slitWidth_um.toFixed(0) + ' μm = ' + _fmt(a, 3) + ' m',
              '',
              '  y₁ = (' + _fmt(lambda, 3) + ')(' + L_m.toFixed(2) + ') / (' + _fmt(a, 3) + ')',
              '     = ' + _fmt(lambda * L_m, 4) + ' / ' + _fmt(a, 4),
              '     = ' + _fmt(firstMin_m, 5) + ' m',
              '     = ' + _fmt(firstMin_m * 1000, 3) + ' mm'
            ].join('\n');
          } else {
            var grooveDensity = state.diffGrating != null ? state.diffGrating : 600;
            var dGrating = 1 / (grooveDensity * 1000);
            return [
              'Diffraction grating:  d sin θ = m λ',
              '',
              '  Lines/mm: ' + grooveDensity.toFixed(0),
              '  d = 1 / (lines per meter) = 1 / ' + _fmt(grooveDensity * 1000, 0),
              '    = ' + _fmt(dGrating, 4) + ' m',
              '',
              '  For m = 1:',
              '    sin θ = (1)(' + _fmt(lambda, 3) + ') / ' + _fmt(dGrating, 4),
              '          = ' + _fmt(lambda / dGrating, 4),
              '    θ     = ' + _fmt(radToDeg(Math.asin(clamp(lambda / dGrating, -1, 1))), 3) + '°'
            ].join('\n');
          }
        })()
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // POLARIZATION SIM — unpolarized → P1 (axis 0°) → P2 (rotatable) → optional P3
  // Malus: I = I₀ cos²(Δθ between consecutive polarizer axes).
  // After unpolarized light through ONE polarizer: I drops to I₀/2.
  // ──────────────────────────────────────────────────────────────────
  function _renderPolarizationSim(state, upd, h) {
    var W = 460, H = 280;
    var pad = { l: 12, r: 12, t: 12, b: 28 };
    var theta2 = state.polTheta2 != null ? state.polTheta2 : 30;   // degrees, axis of P2
    var theta3 = state.polTheta3 != null ? state.polTheta3 : 90;   // degrees, axis of P3
    var useP3 = !!state.polUseP3;
    // P1 axis fixed at 0° (vertical for our visualization). After P1, intensity = I₀/2 of unpolarized.
    var I0 = 1.0;
    var afterP1 = 0.5 * I0;                              // unpolarized → 1/2
    var afterP2 = malus(afterP1, degToRad(theta2 - 0));  // P1=0°, so Δ = theta2
    var afterP3 = useP3 ? malus(afterP2, degToRad(theta3 - theta2)) : null;
    // Layout: three vertical polarizer disks across the width
    var disk1X = 110, disk2X = useP3 ? 230 : 290, disk3X = 350;
    var midY = (pad.t + H - pad.b) / 2;
    var diskR = 36;
    function polarizerDisk(cx, axisDeg, label, intensity, isClickable) {
      // Bars indicating axis
      var nBars = 8;
      var bars = [];
      for (var k = 0; k < nBars; k++) {
        var t = (k - (nBars - 1) / 2) / (nBars - 1);
        var bxOff = t * (diskR * 1.6);
        var x1 = cx + Math.cos(degToRad(axisDeg + 90)) * (diskR - 4) + bxOff * Math.cos(degToRad(axisDeg));
        var y1 = midY + Math.sin(degToRad(axisDeg + 90)) * (diskR - 4) + bxOff * Math.sin(degToRad(axisDeg));
        var x2 = cx + Math.cos(degToRad(axisDeg - 90)) * (diskR - 4) + bxOff * Math.cos(degToRad(axisDeg));
        var y2 = midY + Math.sin(degToRad(axisDeg - 90)) * (diskR - 4) + bxOff * Math.sin(degToRad(axisDeg));
        bars.push(h('line', { key: 'b' + k, x1: x1, y1: y1, x2: x2, y2: y2, stroke: '#475569', strokeWidth: 0.6, opacity: 0.35 }));
      }
      return h('g', null,
        h('circle', { cx: cx, cy: midY, r: diskR, fill: 'rgba(99,102,241,0.10)', stroke: '#7dd3fc', strokeWidth: 2 }),
        bars,
        // Axis line (yellow)
        h('line', {
          x1: cx + Math.cos(degToRad(axisDeg + 90)) * (diskR - 2),
          y1: midY + Math.sin(degToRad(axisDeg + 90)) * (diskR - 2),
          x2: cx + Math.cos(degToRad(axisDeg - 90)) * (diskR - 2),
          y2: midY + Math.sin(degToRad(axisDeg - 90)) * (diskR - 2),
          stroke: '#fbbf24', strokeWidth: 3
        }),
        h('text', { x: cx, y: midY + diskR + 14, fill: '#7dd3fc', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, label),
        h('text', { x: cx, y: midY + diskR + 26, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle', fontFamily: 'monospace' }, axisDeg.toFixed(0) + '°'),
        h('text', { x: cx, y: midY - diskR - 8, fill: '#86efac', fontSize: 10, textAnchor: 'middle', fontFamily: 'monospace' }, 'I = ' + (intensity * 100).toFixed(1) + '% I₀')
      );
    }
    return h('div', null,
      // Slider for P2 axis (and P3 if active)
      h('div', { style: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' } },
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'P₂ axis (°):',
          h('input', {
            type: 'range', min: 0, max: 180, step: 1,
            value: theta2,
            onChange: function(e) { upd('polTheta2', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'P2 polarizer axis',
            style: { width: 130 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36 } }, theta2.toFixed(0) + '°')
        ),
        h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          h('input', {
            type: 'checkbox',
            checked: useP3,
            onChange: function(e) { upd('polUseP3', e.target.checked); },
            'data-op-focusable': 'true', 'aria-label': 'Add third polarizer'
          }),
          'Add P₃ (3-polarizer demo)'
        ),
        useP3 && h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 } },
          'P₃ axis (°):',
          h('input', {
            type: 'range', min: 0, max: 180, step: 1,
            value: theta3,
            onChange: function(e) { upd('polTheta3', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'P3 polarizer axis',
            style: { width: 130 }
          }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700, minWidth: 36 } }, theta3.toFixed(0) + '°')
        )
      ),
      h('svg', {
        width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img',
        'aria-label': 'Polarizer chain. P1 axis 0°, P2 axis ' + theta2 + '°' + (useP3 ? ', P3 axis ' + theta3 + '°' : '') + '. Final intensity ' + ((useP3 ? afterP3 : afterP2) * 100).toFixed(1) + '% of I₀.',
        style: { background: '#0b1220', borderRadius: 8, maxWidth: 460 }
      },
        // Light source label
        h('text', { x: pad.l + 4, y: midY - 14, fill: '#fef3c7', fontSize: 10, fontWeight: 700 }, 'unpolarized'),
        h('rect', { x: pad.l, y: midY - 8, width: 16, height: 16, fill: '#fef3c7', rx: 4 }),
        // Light beam segments — opacity scales with intensity
        h('rect', { x: pad.l + 16, y: midY - 6, width: disk1X - diskR - (pad.l + 16), height: 12, fill: '#fef3c7', opacity: I0 * 0.5 }),
        // Unpolarized E-fields: scatter of 5 short vectors in random orientations
        // to visually communicate "light vibrating in all directions"
        (function() {
          var n = 5;
          var segX0 = pad.l + 16, segX1 = disk1X - diskR;
          var pts = [];
          for (var k = 0; k < n; k++) {
            var cx = segX0 + (segX1 - segX0) * (k + 0.5) / n;
            // Spread the angles across the beam so it reads as "all directions"
            var angDeg = (k * 73) % 180;
            var len = 7;
            var dx = Math.cos(degToRad(angDeg)) * len;
            var dy = Math.sin(degToRad(angDeg)) * len;
            pts.push(h('line', {
              key: 'eu' + k,
              x1: cx - dx, y1: midY - dy, x2: cx + dx, y2: midY + dy,
              stroke: '#facc15', strokeWidth: 1.4, strokeLinecap: 'round',
              opacity: 0.95,
              className: 'opticslab-efield-vec',
              style: { animationDelay: (k * 0.18 - 0.6) + 's' }
            }));
          }
          return pts;
        })(),
        polarizerDisk(disk1X, 0, 'P₁', afterP1),
        h('rect', { x: disk1X + diskR, y: midY - 6, width: disk2X - diskR - (disk1X + diskR), height: 12, fill: '#fef3c7', opacity: afterP1 * 0.6 + 0.05 }),
        // After P1: polarized along P1's 0° axis (vertical in our convention)
        (function() {
          var segX0 = disk1X + diskR, segX1 = disk2X - diskR;
          var pts = [];
          var n = 3;
          for (var k = 0; k < n; k++) {
            var cx = segX0 + (segX1 - segX0) * (k + 0.5) / n;
            // P1 axis = 0° (we treat 0° as vertical in this view)
            var len = 10;
            var dx = Math.cos(degToRad(0 + 90)) * len;
            var dy = Math.sin(degToRad(0 + 90)) * len;
            pts.push(h('line', {
              key: 'e1' + k,
              x1: cx - dx, y1: midY - dy, x2: cx + dx, y2: midY + dy,
              stroke: '#22d3ee', strokeWidth: 1.6, strokeLinecap: 'round',
              opacity: Math.max(0.35, afterP1 * 1.6),
              className: 'opticslab-efield-vec',
              style: { animationDelay: (k * 0.2) + 's' }
            }));
          }
          return pts;
        })(),
        polarizerDisk(disk2X, theta2, 'P₂', afterP2),
        useP3 ? [
          h('rect', { key: 'beam23', x: disk2X + diskR, y: midY - 6, width: disk3X - diskR - (disk2X + diskR), height: 12, fill: '#fef3c7', opacity: afterP2 * 0.6 + 0.05 }),
          // After P2 (axis = theta2)
          (function() {
            var segX0 = disk2X + diskR, segX1 = disk3X - diskR;
            var pts = [];
            var n = 2;
            for (var k = 0; k < n; k++) {
              var cx = segX0 + (segX1 - segX0) * (k + 0.5) / n;
              var len = 8 + 4 * afterP2 / afterP1;
              var dx = Math.cos(degToRad(theta2 + 90)) * len;
              var dy = Math.sin(degToRad(theta2 + 90)) * len;
              pts.push(h('line', {
                key: 'e2' + k,
                x1: cx - dx, y1: midY - dy, x2: cx + dx, y2: midY + dy,
                stroke: '#22d3ee', strokeWidth: 1.6, strokeLinecap: 'round',
                opacity: Math.max(0.25, afterP2 * 3),
                className: 'opticslab-efield-vec',
                style: { animationDelay: (k * 0.2) + 's' }
              }));
            }
            return pts;
          })(),
          polarizerDisk(disk3X, theta3, 'P₃', afterP3),
          h('rect', { key: 'beamout', x: disk3X + diskR, y: midY - 6, width: W - pad.r - (disk3X + diskR), height: 12, fill: '#fef3c7', opacity: afterP3 * 0.6 + 0.05 }),
          // After P3 (axis = theta3)
          (function() {
            var segX0 = disk3X + diskR, segX1 = W - pad.r;
            var pts = [];
            var n = 2;
            for (var k = 0; k < n; k++) {
              var cx = segX0 + (segX1 - segX0) * (k + 0.5) / n;
              if (afterP3 < 0.005) continue; // skip if extinguished
              var len = 8 + 4 * afterP3 / Math.max(0.001, afterP2);
              var dx = Math.cos(degToRad(theta3 + 90)) * len;
              var dy = Math.sin(degToRad(theta3 + 90)) * len;
              pts.push(h('line', {
                key: 'e3' + k,
                x1: cx - dx, y1: midY - dy, x2: cx + dx, y2: midY + dy,
                stroke: '#22d3ee', strokeWidth: 1.6, strokeLinecap: 'round',
                opacity: Math.max(0.25, afterP3 * 3),
                className: 'opticslab-efield-vec',
                style: { animationDelay: (k * 0.2) + 's' }
              }));
            }
            return pts;
          })()
        ] : [
          h('rect', { key: 'beamout2', x: disk2X + diskR, y: midY - 6, width: W - pad.r - (disk2X + diskR), height: 12, fill: '#fef3c7', opacity: afterP2 * 0.6 + 0.05 }),
          // After P2 (axis = theta2) — no P3
          (function() {
            var segX0 = disk2X + diskR, segX1 = W - pad.r;
            var pts = [];
            var n = 3;
            for (var k = 0; k < n; k++) {
              var cx = segX0 + (segX1 - segX0) * (k + 0.5) / n;
              if (afterP2 < 0.005) continue;
              var len = 8 + 4 * afterP2 / Math.max(0.001, afterP1);
              var dx = Math.cos(degToRad(theta2 + 90)) * len;
              var dy = Math.sin(degToRad(theta2 + 90)) * len;
              pts.push(h('line', {
                key: 'e2b' + k,
                x1: cx - dx, y1: midY - dy, x2: cx + dx, y2: midY + dy,
                stroke: '#22d3ee', strokeWidth: 1.6, strokeLinecap: 'round',
                opacity: Math.max(0.25, afterP2 * 3),
                className: 'opticslab-efield-vec',
                style: { animationDelay: (k * 0.2) + 's' }
              }));
            }
            return pts;
          })()
        ],
        // Output indicator
        h('text', { x: W - pad.r - 4, y: midY - 14, fill: '#86efac', fontSize: 11, textAnchor: 'end', fontWeight: 700 },
          'I_out = ' + ((useP3 ? afterP3 : afterP2) * 100).toFixed(1) + '% I₀'
        ),
        h('text', { x: W / 2, y: H - 6, fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' }, "yellow line in each disk = polarizer's transmission axis")
      ),
      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' } },
        'Try Δθ = 90° (P₁ ⊥ P₂) → I = 0 (light blocked). Then add P₃ at 45° between → light reappears! That\'s the classic three-polarizer paradox.'
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // POLARIZATION CALCULATOR
  // ──────────────────────────────────────────────────────────────────
  function _renderPolarizationCalc(state, upd, h) {
    var theta2 = state.polTheta2 != null ? state.polTheta2 : 30;
    var theta3 = state.polTheta3 != null ? state.polTheta3 : 90;
    var useP3 = !!state.polUseP3;
    var I0 = 1.0;
    var afterP1 = 0.5 * I0;
    var afterP2 = malus(afterP1, degToRad(theta2 - 0));
    var afterP3 = useP3 ? malus(afterP2, degToRad(theta3 - theta2)) : null;
    var rows = [];
    rows.push(['I₀ (unpolarized)', '100%']);
    rows.push(['After P₁ (axis 0°)', '50.0% — unpolarized → ½ I₀']);
    rows.push(['Δθ between P₁ and P₂', _fmt(theta2 - 0, 2) + '°']);
    rows.push(['After P₂', _fmt(afterP2 * 100, 2) + '% I₀  =  ½ · cos²(' + theta2 + '°)']);
    if (useP3) {
      rows.push(['Δθ between P₂ and P₃', _fmt(theta3 - theta2, 2) + '°']);
      rows.push(['After P₃ (final)', _fmt(afterP3 * 100, 2) + '% I₀']);
    } else {
      rows.push(['Final transmitted', _fmt(afterP2 * 100, 2) + '% of original I₀']);
    }
    return h('div', null,
      h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 1.5 } },
        "Malus's law: I = I_in cos²(Δθ), where Δθ is the angle between the incoming polarization and the polarizer's transmission axis. ",
        h('b', null, 'Unpolarized light through ONE polarizer drops to I₀/2'), ' (independent of axis).'
      ),
      h('div', { style: { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 12 } },
        rows.map(function(r, i) {
          return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '40% 60%', gap: 6, padding: '3px 0', borderBottom: i < rows.length - 1 ? '1px solid #1e293b' : 'none' } },
            h('span', { style: { color: '#94a3b8' } }, r[0]),
            h('span', { style: { color: '#fef3c7', fontWeight: 700 } }, r[1])
          );
        })
      ),
      h('button', {
        onClick: function() { upd('polShowMath', !state.polShowMath); },
        'data-op-focusable': 'true',
        'aria-expanded': !!state.polShowMath,
        style: { marginTop: 8, background: 'transparent', color: '#a5b4fc', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: 0 }
      }, (state.polShowMath ? '▼' : '▶') + ' 📐 Show me the math'),
      state.polShowMath && h('div', { style: { marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre' } },
        (function() {
          var lines = [
            "Malus's law:  I = I_in cos²(Δθ)",
            '',
            'Step 1: Unpolarized → P₁  (always halves intensity)',
            '  I₁ = ½ · I₀ = 50.0% I₀',
            '',
            'Step 2: P₁ → P₂',
            '  Δθ₁₂ = ' + (theta2 - 0).toFixed(2) + '°',
            '  I₂ = I₁ · cos²(Δθ₁₂)',
            '     = 0.500 · cos²(' + theta2.toFixed(2) + '°)',
            '     = 0.500 · ' + Math.pow(Math.cos(degToRad(theta2)), 2).toFixed(4),
            '     = ' + afterP2.toFixed(4) + ' I₀',
            '     = ' + (afterP2 * 100).toFixed(2) + '% I₀'
          ];
          if (useP3) {
            lines.push('');
            lines.push('Step 3: P₂ → P₃');
            lines.push('  Δθ₂₃ = ' + (theta3 - theta2).toFixed(2) + '°');
            lines.push('  I₃ = I₂ · cos²(Δθ₂₃)');
            lines.push('     = ' + afterP2.toFixed(4) + ' · cos²(' + (theta3 - theta2).toFixed(2) + '°)');
            lines.push('     = ' + afterP2.toFixed(4) + ' · ' + Math.pow(Math.cos(degToRad(theta3 - theta2)), 2).toFixed(4));
            lines.push('     = ' + afterP3.toFixed(4) + ' I₀');
            lines.push('     = ' + (afterP3 * 100).toFixed(2) + '% I₀');
          }
          lines.push('');
          lines.push('Special cases:');
          lines.push('  Δθ = 0°:   cos²(0) = 1     →  full transmission');
          lines.push('  Δθ = 45°:  cos²(45°) = 0.5 →  half transmission');
          lines.push('  Δθ = 90°:  cos²(90°) = 0   →  full extinction');
          return lines.join('\n');
        })()
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // SAMPLE PROBLEM LIBRARY — 10 AP-aligned scenarios
  // Each item pre-loads parameters into the appropriate tab and jumps there.
  // ──────────────────────────────────────────────────────────────────
  var SAMPLE_PROBLEMS = [
    {
      id: 'snorkeler_lookup', topic: 'AP Physics 2 — Refraction',
      title: 'Snorkeler looking up at the surface',
      research_question: 'A snorkeler underwater (n = 1.33) looks up at a 45° angle. Does she see the sky, or is she past the critical angle? Find the critical angle and the angle she\'d see.',
      tab: 'refraction',
      params: { refrN1: 1.333, refrN2: 1.000, refrTheta1: 45 },
      hint: 'Try angles past 48.6° — beyond the critical angle, you only see TIR (the surface looks like a mirror).'
    },
    {
      id: 'fiber_optic', topic: 'AP Physics 2 — Total Internal Reflection',
      title: 'Fiber-optic cable',
      research_question: 'Light in a fiber-optic core (n = 1.50) hits the core-cladding boundary (cladding n = 1.45) at 80°. Does it reflect or escape? Find θ_c.',
      tab: 'refraction',
      params: { refrN1: 1.50, refrN2: 1.45, refrTheta1: 80 },
      hint: 'Critical angle here is small (~75°). At 80° → TIR keeps light trapped inside the fiber.'
    },
    {
      id: 'magnifier', topic: 'AP Physics 2 — Lenses (virtual image)',
      title: 'Magnifying glass over a coin',
      research_question: 'A converging lens with f = 10 cm is held 6 cm above a coin. Where is the image? Real or virtual? How big?',
      tab: 'lenses',
      params: { lensType: 'converging', lensFocal: 10, lensDo: 6 },
      hint: 'Object inside the focal length → virtual, upright, magnified image. Check the d_i sign.'
    },
    {
      id: 'projector', topic: 'AP Physics 2 — Lenses (real image)',
      title: 'Slide projector',
      research_question: 'A projector lens has f = 15 cm. The slide is 18 cm from the lens. Where does the image form on the screen? Inverted or upright?',
      tab: 'lenses',
      params: { lensType: 'converging', lensFocal: 15, lensDo: 18 },
      hint: 'Object beyond f → real, inverted image on the far side. d_i should be much larger than d_o here.'
    },
    {
      id: 'concave_makeup', topic: 'AP Physics 2 — Curved Mirrors',
      title: 'Concave makeup mirror',
      research_question: 'A makeup mirror with f = 20 cm is held 12 cm from the face. What does it show?',
      tab: 'reflection',
      params: { reflMirrorType: 'concave', reflFocal: 20, reflDo: 12 },
      hint: 'Object inside focal length of a concave mirror → virtual, upright, magnified.'
    },
    {
      id: 'convex_security', topic: 'AP Physics 2 — Curved Mirrors',
      title: 'Convex security mirror',
      research_question: 'A convex security mirror has |f| = 25 cm. A person stands 2 m (200 cm) from it. Real or virtual image? Larger or smaller?',
      tab: 'reflection',
      params: { reflMirrorType: 'convex', reflFocal: 25, reflDo: 200 },
      hint: 'Convex mirrors always give virtual, upright, reduced images — that\'s why they\'re used for wide-angle viewing.'
    },
    {
      id: 'youngs_classic', topic: 'AP Physics 2 — Interference',
      title: "Young's double-slit (classic AP setup)",
      research_question: 'Light of λ = 600 nm passes through a double slit with d = 0.10 mm. The screen is 1.0 m away. What is the spacing between adjacent bright fringes?',
      tab: 'interference',
      params: { intLambda: 600, intSlitSep: 0.10, intScreenL: 1.0 },
      hint: 'Use y = λL/d. Expect 6 mm spacing — quite visible!'
    },
    {
      id: 'first_min', topic: 'AP Physics 2 — Diffraction',
      title: 'Single-slit first minimum',
      research_question: 'A 30 μm slit illuminated by 550 nm light projects onto a screen 1.5 m away. Where is the first minimum?',
      tab: 'diffraction',
      params: { diffMode: 'single', diffLambda: 550, diffSlitWidth: 30, diffScreenL: 1.5 },
      hint: 'y₁ = λL/a. The central max is twice this width. Try halving "a" — what happens to the spread?'
    },
    {
      id: 'grating_spectrum', topic: 'AP Physics 2 — Diffraction Grating',
      title: 'Diffraction grating spectrum',
      research_question: 'A 600 lines/mm grating is lit with 632.8 nm helium-neon laser light. At what angles do the m=1 and m=2 maxima appear?',
      tab: 'diffraction',
      params: { diffMode: 'grating', diffLambda: 633, diffGrating: 600, diffScreenL: 1.0 },
      hint: 'd sinθ = mλ. With d ≈ 1.67 μm, m=1 should land near 22°. m=2 is around 50°.'
    },
    {
      id: 'malus_classic', topic: 'AP Physics 2 — Polarization',
      title: 'Polaroid sunglasses cutting glare',
      research_question: 'Unpolarized sunlight passes through one polarizer, then a second polarizer rotated 60° from the first. What fraction of the original intensity passes through?',
      tab: 'polarization',
      params: { polTheta2: 60, polUseP3: false },
      hint: 'After P₁: I = ½ I₀. After P₂ (Δθ = 60°): I = ½ · cos²(60°) = 12.5% of I₀.'
    }
  ];
  function loadSampleProblem(id, upd) {
    var s = null;
    for (var i = 0; i < SAMPLE_PROBLEMS.length; i++) if (SAMPLE_PROBLEMS[i].id === id) { s = SAMPLE_PROBLEMS[i]; break; }
    if (!s) return;
    var patch = Object.assign({ mode: s.tab, activeSampleId: s.id }, s.params);
    upd(patch);
  }

  // ──────────────────────────────────────────────────────────────────
  // GLOSSARY — 25 terms tagged by topic; auto-filtered per active tab
  // ──────────────────────────────────────────────────────────────────
  var OPTICS_GLOSSARY = {
    'focal_length': { name: 'Focal length (f)', tags: ['reflection', 'lenses'], def: 'The distance from a lens or mirror to its focal point. Converging lenses + concave mirrors have f > 0; diverging lenses + convex mirrors have f < 0. Larger |f| → less bending.' },
    'principal_axis': { name: 'Principal axis', tags: ['reflection', 'lenses'], def: 'The straight line through the center of a lens or mirror, perpendicular to its surface. All distances (d_o, d_i, f) are measured along this axis.' },
    'real_image': { name: 'Real image', tags: ['reflection', 'lenses'], def: 'An image formed where light rays actually converge. Can be projected on a screen. Always inverted in single-lens/mirror systems. d_i > 0.' },
    'virtual_image': { name: 'Virtual image', tags: ['reflection', 'lenses'], def: 'An image where light rays only APPEAR to converge (extension lines). Cannot be projected. Always upright in single-element systems. d_i < 0.' },
    'magnification': { name: 'Magnification (m)', tags: ['reflection', 'lenses'], def: 'm = −d_i / d_o = (image height) / (object height). m > 0 → upright; m < 0 → inverted; |m| > 1 → enlarged; |m| < 1 → reduced.' },
    'index_n': { name: 'Index of refraction (n)', tags: ['refraction'], def: 'n = c / v. The ratio of light\'s speed in vacuum to its speed in the medium. n_air ≈ 1.00, n_water ≈ 1.33, n_glass ≈ 1.50, n_diamond ≈ 2.42.' },
    'snells_law': { name: "Snell's law", tags: ['refraction'], def: 'n₁ sin θ₁ = n₂ sin θ₂. Light bends TOWARD the normal entering a denser medium (n₂ > n₁), AWAY from the normal entering a less dense medium.' },
    'critical_angle': { name: 'Critical angle (θ_c)', tags: ['refraction'], def: 'θ_c = arcsin(n₂ / n₁). Only defined when n₁ > n₂. The angle of incidence at which the refracted ray runs along the surface (θ₂ = 90°).' },
    'tir': { name: 'Total internal reflection (TIR)', tags: ['refraction'], def: 'When θ₁ > θ_c (going from denser to less dense), no light is transmitted. All of it reflects back. Foundation of fiber optics, prisms, diamond brilliance.' },
    'dispersion': { name: 'Dispersion', tags: ['refraction'], def: 'The spreading of white light into a spectrum because n depends weakly on λ. Blue light has slightly higher n than red, so it bends more. Cause of rainbows and prism spectra.' },
    'converging_lens': { name: 'Converging lens', tags: ['lenses'], def: 'A lens that focuses parallel light to a point (the focal point). Thicker in the middle than at the edges. f > 0. Used in cameras, magnifiers, eyeglasses for farsightedness.' },
    'diverging_lens': { name: 'Diverging lens', tags: ['lenses'], def: 'A lens that spreads parallel light apart (rays appear to diverge from a virtual focal point on the same side). Thinner in the middle. f < 0. Used in eyeglasses for nearsightedness.' },
    'thin_lens_eq': { name: 'Thin-lens equation', tags: ['lenses', 'reflection'], def: '1/f = 1/d_o + 1/d_i. Same form for mirrors and lenses (with sign conventions). Solving for d_i: d_i = (f · d_o) / (d_o − f).' },
    'coherent_light': { name: 'Coherent light', tags: ['interference'], def: 'Light waves with a fixed phase relationship and (usually) a single wavelength. Required for stable interference patterns. Lasers are coherent; ordinary lamps are not.' },
    'constructive': { name: 'Constructive interference', tags: ['interference'], def: 'Two waves combining in phase (peak meets peak) → larger amplitude → bright fringe. Path difference = mλ for integer m.' },
    'destructive': { name: 'Destructive interference', tags: ['interference'], def: 'Two waves combining out of phase (peak meets trough) → cancellation → dark fringe. Path difference = (m + ½)λ for integer m.' },
    'fringe_spacing': { name: 'Fringe spacing (y)', tags: ['interference'], def: "Distance between adjacent bright fringes in Young's double-slit: y = λL / d, where L is slit-to-screen distance, d is slit separation. Larger λ or L, smaller d → wider fringes." },
    'diffraction': { name: 'Diffraction', tags: ['diffraction'], def: 'The bending and spreading of waves around obstacles or through narrow slits. The narrower the slit relative to λ, the more pronounced the spread.' },
    'first_minimum': { name: 'Single-slit first minimum', tags: ['diffraction'], def: 'For a slit of width a, the first dark fringe is at angle satisfying a sin θ = λ. Small-angle: y₁ = λL/a. The central max width is 2y₁.' },
    'grating': { name: 'Diffraction grating', tags: ['diffraction'], def: 'A surface with many parallel slits/grooves at spacing d. Maxima at d sin θ = mλ for integer order m. Many slits → very narrow, bright peaks. Used to separate wavelengths in spectroscopy.' },
    'polarization': { name: 'Polarization', tags: ['polarization'], def: 'The direction of oscillation of the electric field in a light wave. Unpolarized light has random orientations; polarized light oscillates along one axis.' },
    'malus_law': { name: "Malus's law", tags: ['polarization'], def: 'I = I_in cos²(Δθ), where Δθ is the angle between incoming polarization and the polarizer\'s transmission axis. Δθ = 0 → full transmission; Δθ = 90° → full extinction.' },
    'unpolarized_half': { name: 'The "1/2 rule"', tags: ['polarization'], def: 'Unpolarized light through ANY polarizer drops to exactly I₀/2 — independent of the polarizer\'s axis. After that, Malus\'s law applies to subsequent polarizers.' },
    'wavelength': { name: 'Wavelength (λ)', tags: ['interference', 'diffraction', 'refraction'], def: 'Spatial period of a wave. For visible light: 400 nm (violet) to 700 nm (red). λ in a medium = λ_vacuum / n.' },
    'normal': { name: 'Normal line', tags: ['refraction', 'reflection'], def: 'An imaginary line perpendicular to the surface at the point a ray hits. All angles of incidence, reflection, and refraction are measured FROM the normal, not from the surface.' },
    'sign_convention': { name: 'Sign convention (lenses/mirrors)', tags: ['reflection', 'lenses'], def: 'd_o > 0 always. f > 0 for converging lens / concave mirror; f < 0 for diverging lens / convex mirror. d_i > 0 → real image; d_i < 0 → virtual. m = −d_i / d_o; sign tells you upright (+) vs inverted (−).' }
  };
  function _glossaryForTab(tab) {
    var keys = [];
    for (var k in OPTICS_GLOSSARY) {
      if (Object.prototype.hasOwnProperty.call(OPTICS_GLOSSARY, k)) {
        var entry = OPTICS_GLOSSARY[k];
        if (entry.tags.indexOf(tab) !== -1) keys.push(k);
      }
    }
    return keys;
  }

  // ──────────────────────────────────────────────────────────────────
  // MISCONCEPTIONS — per-topic warnings
  // ──────────────────────────────────────────────────────────────────
  var MISCONCEPTIONS = {
    reflection: [
      { wrong: '"d_i = d_o for any mirror because reflection is symmetric."', right: 'Only true for PLANE mirrors. Curved mirrors form images at distances given by 1/f = 1/d_o + 1/d_i — which can be very different from d_o.' },
      { wrong: '"Concave mirror always forms a real image."', right: 'A concave mirror forms a REAL image only when the object is OUTSIDE the focal length (d_o > f). When d_o < f, the image is VIRTUAL and behind the mirror.' },
      { wrong: '"Convex mirror images appear bigger because they\'re curved."', right: 'Convex mirrors ALWAYS give virtual, upright, REDUCED images (|m| < 1). They look "wide-angle" because they compress more scene into a smaller image.' }
    ],
    refraction: [
      { wrong: '"Light bends AWAY from the normal entering glass from air."', right: 'BACKWARDS. Light bends TOWARD the normal entering a denser medium (higher n). It bends AWAY from the normal entering a less dense medium.' },
      { wrong: '"The critical angle is when light bends 90°."', right: 'The critical angle is the angle of INCIDENCE in the denser medium where the REFRACTED angle is 90°. Beyond θ_c, refraction stops entirely → TIR.' },
      { wrong: '"Refraction changes the frequency of light."', right: 'Refraction changes light\'s SPEED and WAVELENGTH but NOT its frequency. Color (= frequency) is preserved as light enters a new medium.' }
    ],
    lenses: [
      { wrong: '"Negative magnification means the lens failed."', right: 'Negative m just means the image is INVERTED (upside-down). All real images from single converging lenses have m < 0. It\'s a feature, not a bug.' },
      { wrong: '"Bigger lens = more magnification."', right: 'Magnification depends on FOCAL LENGTH and OBJECT DISTANCE, not lens diameter. Diameter affects how much LIGHT is gathered (brightness), not magnification.' },
      { wrong: '"A diverging lens never makes an image."', right: 'A diverging lens always makes a VIRTUAL, upright, reduced image — useful as a viewfinder or to correct nearsightedness. The image just can\'t be projected on a screen.' }
    ],
    interference: [
      { wrong: '"Fringe spacing depends only on wavelength."', right: 'Fringe spacing y = λL/d depends on λ AND L (slit-to-screen distance) AND d (slit separation). Students often forget L. Doubling L doubles the spacing.' },
      { wrong: '"You can see double-slit interference with sunlight."', right: 'Sunlight is incoherent and broadband — fringes wash out. Real demos use a laser (coherent, monochromatic) or a single-slit-then-double-slit setup to enforce coherence.' },
      { wrong: '"More slits make brighter fringes only."', right: 'More slits also make NARROWER, more sharply defined peaks (a diffraction grating). The total transmitted power is roughly the same, just concentrated.' }
    ],
    diffraction: [
      { wrong: '"Wider slit = more spread."', right: 'BACKWARDS. NARROWER slit → MORE diffraction (wider central maximum). Widening the slit makes the pattern more like a clean shadow.' },
      { wrong: '"Diffraction only happens at slits."', right: 'Diffraction happens at ANY edge or aperture. The reason you can hear someone around a corner (sound diffraction) is the same physics as light diffracting through a slit.' }
    ],
    polarization: [
      { wrong: '"Unpolarized light through ONE polarizer drops to I₀ cos²θ."', right: 'NO — that\'s Malus\'s law for already-polarized light. Unpolarized light through one polarizer drops to EXACTLY I₀/2, independent of axis. Malus\'s law kicks in for the SECOND polarizer onward.' },
      { wrong: '"Two polarizers at 90° always give zero — no exceptions."', right: 'True for two crossed polarizers. But ADD a third polarizer at 45° BETWEEN them, and light reappears! Each polarizer projects polarization onto its own axis — order matters.' }
    ]
  };

  // ──────────────────────────────────────────────────────────────────
  // AP EXAM QUIZ BANK — 30 items tagged by topic
  // ──────────────────────────────────────────────────────────────────
  var AP_OPTICS_QUIZ = [
    // Reflection
    { tags: ['reflection', 'universal'], q: 'A concave mirror has f = 10 cm. An object is placed 5 cm in front. The image is:',
      choices: ['Real, inverted, larger', 'Real, inverted, smaller', 'Virtual, upright, larger', 'Virtual, upright, smaller'], correct: 2,
      explain: 'When d_o < f for a concave mirror, the image is virtual, upright, and magnified. d_i = (10·5)/(5−10) = −10 cm; m = +2.' },
    { tags: ['reflection'], q: 'Plane mirrors always produce images that are:',
      choices: ['Real and inverted', 'Real and upright', 'Virtual and inverted', 'Virtual and upright, same size'], correct: 3,
      explain: 'Plane mirrors give virtual, upright, same-size images at d_i = −d_o (same distance behind the mirror).' },
    { tags: ['reflection'], q: 'A convex mirror with |f| = 20 cm has an object 30 cm in front. The image is approximately:',
      choices: ['Real, inverted, ½ size', 'Virtual, upright, ½ size', 'Virtual, upright, 2× size', 'Real, inverted, 2× size'], correct: 1,
      explain: 'Convex: f = −20 cm. d_i = (−20·30)/(30−(−20)) = −12 cm. m = −(−12)/30 = +0.4. Virtual, upright, reduced.' },
    // Refraction
    { tags: ['refraction', 'universal'], q: 'Light traveling from air into water bends:',
      choices: ['Away from the normal', 'Toward the normal', 'Parallel to the normal', "Doesn't bend"], correct: 1,
      explain: 'Going from less dense (n=1) to denser (n=1.33), light slows and bends TOWARD the normal. (Speed inside water is slower; geometry forces the bend toward the perpendicular.)' },
    { tags: ['refraction'], q: "Snell's law: n₁ = 1.50, n₂ = 1.00, θ₁ = 30°. What is θ₂?",
      choices: ['About 19°', 'About 30°', 'About 49°', "Total internal reflection — no real angle"], correct: 2,
      explain: 'sin θ₂ = (1.50/1.00)(sin 30°) = 0.75 → θ₂ = arcsin(0.75) ≈ 48.6°. Light bends away from the normal entering a less dense medium.' },
    { tags: ['refraction', 'tir'], q: 'For TIR to occur, light must travel:',
      choices: ['From less dense to more dense, at any angle', 'From more dense to less dense, beyond θ_c', 'In a vacuum', 'At the speed of light'], correct: 1,
      explain: 'TIR requires (a) going from higher n to lower n AND (b) θ₁ > θ_c. Both conditions are necessary.' },
    { tags: ['refraction', 'tir'], q: 'A material has critical angle 42° relative to air. What is its index of refraction?',
      choices: ['n ≈ 1.00', 'n ≈ 1.33', 'n ≈ 1.50', 'n ≈ 2.42'], correct: 2,
      explain: 'sin θ_c = n₂/n₁ = 1/n. So n = 1/sin(42°) ≈ 1/0.669 ≈ 1.50. (Crown glass.)' },
    // Lenses
    { tags: ['lenses', 'universal'], q: 'A converging lens has f = 12 cm. An object is at 20 cm. The image is:',
      choices: ['Virtual, upright, larger than object', 'Real, inverted, larger than object', 'Real, inverted, smaller than object', 'No image forms'], correct: 1,
      explain: 'd_i = (12·20)/(20−12) = 30 cm. m = −30/20 = −1.5. Real, inverted, magnified (|m| > 1).' },
    { tags: ['lenses'], q: 'A diverging lens (f = −15 cm) with an object 30 cm away forms an image:',
      choices: ['Real, beyond the lens', 'Virtual, on the same side as the object', 'At the focal point', "There's no image"], correct: 1,
      explain: 'd_i = (−15·30)/(30−(−15)) = −450/45 = −10 cm. Negative d_i → virtual, on the SAME side as the object.' },
    { tags: ['lenses'], q: 'Object at d_o = f for a converging lens. Image is:',
      choices: ['At infinity', 'At the lens itself', 'At 2f', 'Virtual at f on the other side'], correct: 0,
      explain: 'When d_o = f, the rays leaving the lens are parallel — they "meet" at infinity. This is how a flashlight collimates a bulb at the focal point.' },
    { tags: ['lenses'], q: 'For a magnifying glass (converging lens used as magnifier), the object is placed:',
      choices: ['Beyond 2f', 'Between f and 2f', 'Inside f (closer than f)', 'At infinity'], correct: 2,
      explain: 'Object inside f → virtual, upright, MAGNIFIED image (|m| > 1). That\'s what makes it work as a magnifier.' },
    { tags: ['lenses'], q: 'In the thin-lens equation 1/f = 1/d_o + 1/d_i, what does a NEGATIVE d_i mean?',
      choices: ['The lens is broken', 'A real image on the far side', 'A virtual image on the near side', 'Light went the wrong way'], correct: 2,
      explain: 'Negative d_i (lenses) → image is virtual, on the SAME side as the object (where the light came from).' },
    // Interference
    { tags: ['interference', 'universal'], q: "In Young's double-slit, doubling the slit separation d will:",
      choices: ['Double the fringe spacing', 'Halve the fringe spacing', 'Quadruple it', 'Have no effect'], correct: 1,
      explain: 'y = λL/d. d in the denominator → doubling d HALVES the fringe spacing. Closer slits give wider fringes (counterintuitive but true).' },
    { tags: ['interference'], q: 'Bright fringes in double-slit occur when path difference equals:',
      choices: ['½ λ', 'λ/4', 'mλ for integer m', '(m + ½) λ'], correct: 2,
      explain: 'Constructive interference requires path difference = mλ (waves arrive in phase). (m + ½)λ gives DARK fringes.' },
    { tags: ['interference'], q: 'Replacing red light (650 nm) with blue light (450 nm) in a double-slit setup will:',
      choices: ['Widen the fringes', 'Narrow the fringes', 'Eliminate fringes', 'Have no effect'], correct: 1,
      explain: 'y = λL/d. Smaller λ → smaller fringe spacing. Blue fringes are tighter than red fringes.' },
    { tags: ['interference'], q: 'For double-slit fringes to be visible, the light must be:',
      choices: ['Bright', 'White', 'Coherent and (ideally) monochromatic', 'Polarized'], correct: 2,
      explain: 'Without coherence, the phase relationship between slits is random and fringes wash out. That\'s why lasers (highly coherent, monochromatic) are the typical demo source.' },
    // Diffraction
    { tags: ['diffraction', 'universal'], q: 'Single-slit first minimum is at the angle satisfying:',
      choices: ['d sinθ = λ', 'a sinθ = λ', 'a sinθ = mλ where m starts at 0', 'a sinθ = (m+½)λ'], correct: 1,
      explain: 'For a single slit of width a: minima at a sinθ = mλ for m = 1, 2, 3, ... The CENTRAL MAXIMUM is at θ = 0 (NOT a minimum), and the first MINIMUM is at m = 1.' },
    { tags: ['diffraction'], q: 'Halving the slit width a (single slit) will:',
      choices: ['Halve the central max width', 'Double the central max width', 'Sharpen the pattern', 'No effect'], correct: 1,
      explain: 'y₁ = λL/a → smaller a means BIGGER y₁. Central max width = 2y₁ also doubles. Counterintuitive but right: narrower slit → MORE spread.' },
    { tags: ['diffraction', 'grating'], q: 'A diffraction grating with 500 lines/mm and 600 nm light: at what angle is the m=1 maximum?',
      choices: ['~10°', '~17°', '~30°', '~60°'], correct: 1,
      explain: 'd = 1/(500/mm) = 2 μm. sinθ = (1)(600 nm)/(2 μm) = 0.30 → θ ≈ 17.5°.' },
    { tags: ['diffraction'], q: 'Compared to a single slit, a diffraction grating with many slits produces:',
      choices: ['No pattern', 'Wider, brighter peaks', 'Narrower, sharper peaks at the same angles', 'A continuous spectrum'], correct: 2,
      explain: 'Many slits → constructive interference is sharper; the maxima at d sinθ = mλ become very narrow. Unlike a single slit\'s broad sinc² pattern.' },
    // Polarization
    { tags: ['polarization', 'universal'], q: 'Unpolarized light passes through a polarizer. The transmitted intensity is:',
      choices: ['I₀', 'I₀ cos²θ', 'I₀ / 2', 'Zero'], correct: 2,
      explain: 'Unpolarized light through ONE polarizer always gives I₀/2 — independent of the axis. Malus\'s law (I cos²θ) applies to ALREADY-polarized light hitting the NEXT polarizer.' },
    { tags: ['polarization'], q: 'Two polarizers are crossed at 90°. What fraction of the original unpolarized light passes through both?',
      choices: ['1/2', '1/4', 'Zero', '1'], correct: 2,
      explain: 'After P₁: I₀/2. After P₂ (90° from P₁): (I₀/2) · cos²(90°) = 0. Crossed polarizers extinguish all light.' },
    { tags: ['polarization'], q: "Malus's law: an already-polarized beam at I = 100 W/m² passes through a polarizer rotated 60° from the beam's axis. Output intensity?",
      choices: ['25 W/m²', '50 W/m²', '75 W/m²', '100 W/m²'], correct: 0,
      explain: 'I = I_in cos²(60°) = 100 · 0.25 = 25 W/m².' },
    { tags: ['polarization'], q: 'Three polarizers: P₁ at 0°, P₂ at 45°, P₃ at 90°. Unpolarized light input. Final intensity (as fraction of I₀)?',
      choices: ['0', '1/8', '1/4', '1/2'], correct: 1,
      explain: 'After P₁: I₀/2. After P₂ (Δθ=45°): (I₀/2)·cos²(45°) = I₀/4. After P₃ (Δθ=45° from P₂): (I₀/4)·cos²(45°) = I₀/8. The middle polarizer "rescues" the light from extinction.' },
    // Universal / mixed
    { tags: ['universal', 'wavelength'], q: 'When light enters glass from air, what changes?',
      choices: ['Frequency only', 'Wavelength only', 'Frequency, wavelength, and speed', 'Speed and wavelength (but NOT frequency)'], correct: 3,
      explain: 'Frequency is conserved across boundaries (the source dictates frequency). Speed v = c/n decreases. Wavelength λ_medium = λ_vacuum / n decreases. Color (= frequency) is preserved.' },
    { tags: ['universal'], q: 'Which of these is NOT a wave phenomenon?',
      choices: ['Diffraction', 'Interference', 'Refraction', 'All of the above ARE wave phenomena'], correct: 3,
      explain: 'All three are characteristic wave behaviors. Particle models cannot explain diffraction or interference; refraction can be partially modeled either way but is consistent with wave physics.' },
    { tags: ['universal', 'dispersion'], q: 'When white light passes through a prism:',
      choices: ['All colors bend the same amount', 'Red bends most, violet least', 'Violet bends most, red least', 'No bending'], correct: 2,
      explain: 'Index of refraction n is slightly higher for shorter wavelengths (violet/blue) → they bend more. This is dispersion. Order in the resulting spectrum: red, orange, yellow, green, blue, violet — most-bent at the violet end.' },
    { tags: ['interference', 'diffraction'], q: 'Interference and diffraction patterns both depend on:',
      choices: ['The amplitude of the light', 'The polarization', 'The wavelength', 'The intensity'], correct: 2,
      explain: 'Both phenomena scale with λ. The geometry of fringes/minima depends on λ relative to slit dimensions, not on how bright the light is.' },
    { tags: ['lenses', 'reflection', 'sign_convention'], q: 'For a single-element lens or mirror, |m| > 1 means the image is:',
      choices: ['Inverted', 'Real', 'Magnified (larger than object)', 'Virtual'], correct: 2,
      explain: '|m| compares image size to object size. |m| > 1 → enlarged. The SIGN of m tells you orientation (positive = upright, negative = inverted), separate from the SIZE.' },
    { tags: ['universal', 'em_spectrum'], q: 'Visible light wavelengths span approximately:',
      choices: ['10 nm to 100 nm', '400 nm to 700 nm', '1 μm to 100 μm', '1 mm to 1 cm'], correct: 1,
      explain: 'Visible light: ~400 nm (violet) to ~700 nm (red). Below 400 nm = UV; above 700 nm = IR. Memorize this for AP.' },
    // ── Phenomena-tab questions (bridges AP equations into real-world observations) ──
    { tags: ['phenomena', 'refraction', 'dispersion'], q: 'A primary rainbow appears at approximately what angle from the antisolar point (the shadow of your head)?',
      choices: ['22°', '42°', '90°', '180°'], correct: 1,
      explain: 'Primary rainbows are 42° from the antisolar point. This angle is the MINIMUM-deviation angle for light bouncing once inside a raindrop (one refraction in, one internal reflection, one refraction out). Different colors have slightly different n, so they bunch at slightly different angles — red at 42°, violet at 40°.' },
    { tags: ['phenomena', 'refraction'], q: 'Why does a "puddle" appear on a hot road in the distance (mirage)?',
      choices: ['Heat shimmer literally creates water vapor', 'Hot air has lower refractive index, so light from the sky curves upward off the road', 'Tar reflects sky', 'Optical illusion in the brain unrelated to physics'], correct: 1,
      explain: 'Hot air is less dense → lower n. Light from the sky entering the hot layer above the road bends progressively away from the normal (Snell\'s law applied across n-gradient layers) and eventually curves upward. Your brain extrapolates the curved ray as straight, producing an apparent reflection of sky as if there were water on the road.' },
    { tags: ['phenomena'], q: 'After staring at a bright red square for 15 seconds, looking at a blank gray wall produces a faint:',
      choices: ['Red after-image (same color)', 'Cyan after-image (complementary color)', 'White after-image', 'No after-image'], correct: 1,
      explain: 'L-cones (red-sensitive) desensitize from prolonged stimulation. When the eye then views neutral gray (which equally stimulates all three cone types), the L-cones underrespond → perceived color is the COMPLEMENT of the original. Red\'s complement is cyan. This bridges optics into retinal physiology.' },
    { tags: ['phenomena'], q: 'A computer monitor and a printed page produce color through different processes. The monitor is _____, the printer is _____:',
      choices: ['Subtractive (CMYK); additive (RGB)', 'Additive (RGB); subtractive (CMYK)', 'Both additive', 'Both subtractive'], correct: 1,
      explain: 'Monitors EMIT light — red, green, blue subpixels add together to create perceived colors (additive: R+G+B = white). Printers absorb light — cyan ink absorbs red, magenta absorbs green, yellow absorbs blue. CMY together absorbs everything = black (subtractive). Real printers add a separate K (key/black) plate because real CMY inks make muddy brown.' },
    { tags: ['phenomena', 'polarization'], q: 'Polarized sunglasses block horizontal polarization most strongly. Why is this oriented that way?',
      choices: ['Vertical light is more harmful', 'Reflections off horizontal surfaces (water, road, snow) produce horizontally-polarized glare', 'It\'s an arbitrary manufacturing standard', 'Vertical polarization is invisible'], correct: 1,
      explain: 'Light reflecting off a horizontal surface near Brewster\'s angle becomes strongly horizontally polarized. By blocking horizontal polarization, sunglasses eliminate the bulk of this glare while still letting through vertically-polarized scenery. Same Malus\'s law physics applied to a real-world annoyance.' },
    { tags: ['phenomena', 'lenses'], q: 'The human eye keeps an image focused on the retina by changing what?',
      choices: ['The distance from lens to retina', 'The shape (and therefore focal length) of the lens', 'The size of the pupil', 'The wavelength of incoming light'], correct: 1,
      explain: 'The retina sits at a fixed distance behind the lens (~22.7 mm). For the thin-lens equation 1/f = 1/d_o + 1/d_i to balance as d_o changes, f must change. The ciliary muscle squeezes the lens fatter (shorter f) for nearby objects and lets it relax flatter for distant ones. As the lens stiffens with age (presbyopia), the near point retreats — typical onset at 40-45 years.' },
    { tags: ['phenomena'], q: 'Why is the sky blue and the setting sun red?',
      choices: ['Different molecules emit different colors', 'Rayleigh scattering removes short wavelengths from light passing through long atmospheric paths', 'The atmosphere acts as a prism', 'Eye sensitivity changes with sun angle'], correct: 1,
      explain: 'Rayleigh scattering ∝ 1/λ⁴, so blue (470 nm) scatters about 9× more strongly than red (680 nm). At zenith, the short atmospheric path scatters some blue → blue sky. At sunset, the path becomes 10-40× longer; almost all blue scatters out before reaching you, leaving only red/orange — that\'s the long-wavelength survival you see in the sun itself.' }
  ];

  function _pickOpticsQuizQuestions(activeTab) {
    var pool = AP_OPTICS_QUIZ.slice();
    // Shuffle
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    var picked = [];
    // 2 tagged to active tab
    if (activeTab && activeTab !== 'home' && activeTab !== 'quiz') {
      var matches = pool.filter(function(q) { return q.tags.indexOf(activeTab) !== -1; });
      matches.slice(0, 2).forEach(function(q) {
        picked.push(q);
        var idx = pool.indexOf(q); if (idx !== -1) pool.splice(idx, 1);
      });
    }
    // 2 universal anchors
    var anchors = pool.filter(function(q) { return q.tags.indexOf('universal') !== -1; });
    anchors.slice(0, 2).forEach(function(q) {
      if (picked.indexOf(q) !== -1) return;
      picked.push(q);
      var idx = pool.indexOf(q); if (idx !== -1) pool.splice(idx, 1);
    });
    while (picked.length < 5 && pool.length) picked.push(pool.shift());
    return picked;
  }

  // ──────────────────────────────────────────────────────────────────
  // PLUGIN REGISTRATION + UI
  // ──────────────────────────────────────────────────────────────────
  window.StemLab.registerTool('opticsLab', {
    icon: '🔆',
    label: 'Optics Lab',
    desc: 'AP Physics 2 geometric + wave optics: ray diagrams, Snell\'s law, mirrors, lenses, double-slit interference, single-slit diffraction, polarization. Side-by-side draggable sims + calculators with show-the-math, sample problems, glossary, misconceptions, AP exam quiz, and AI-graded explanations.',
    color: 'sky',
    category: 'science',
    questHooks: [
      { id: 'op_first_sim', label: 'Run any optics sim', icon: '🔆',
        check: function(d) { return !!(d.simRunOnce); },
        progress: function(d) { return d.simRunOnce ? '✓' : 'pending'; } },
      { id: 'op_snell', label: "Use Snell's law calculator", icon: '🌊',
        check: function(d) { return !!(d.snellRun); },
        progress: function(d) { return d.snellRun ? '✓' : 'pending'; } },
      { id: 'op_lens_real', label: 'Form a real image with a lens', icon: '🔍',
        check: function(d) { return !!(d.realImageFormed); },
        progress: function(d) { return d.realImageFormed ? '✓' : 'pending'; } },
      { id: 'op_lens_virtual', label: 'Form a virtual image with a lens', icon: '🔮',
        check: function(d) { return !!(d.virtualImageFormed); },
        progress: function(d) { return d.virtualImageFormed ? '✓' : 'pending'; } },
      { id: 'op_tir', label: 'Trigger total internal reflection', icon: '⚡',
        check: function(d) { return !!(d.tirTriggered); },
        progress: function(d) { return d.tirTriggered ? '✓' : 'pending'; } },
      { id: 'op_interference', label: "View Young's double-slit fringes", icon: '✨',
        check: function(d) { return !!(d.interferenceViewed); },
        progress: function(d) { return d.interferenceViewed ? '✓' : 'pending'; } },
      { id: 'op_diffraction', label: 'View a single-slit diffraction pattern', icon: '〰',
        check: function(d) { return !!(d.diffractionViewed); },
        progress: function(d) { return d.diffractionViewed ? '✓' : 'pending'; } },
      { id: 'op_polarization', label: 'Cross polarizers to extinction (Δθ = 90°)', icon: '↕',
        check: function(d) { return !!(d.polarizationExtinct); },
        progress: function(d) { return d.polarizationExtinct ? '✓' : 'pending'; } },
      { id: 'op_quiz_mastery', label: 'Score ≥4/5 on AP optics quiz', icon: '📝',
        check: function(d) { return (d.quizCompletedCount || 0) >= 1 && (d.quizCorrect || 0) >= 4; },
        progress: function(d) { return (d.quizCompletedCount || 0) > 0 ? 'best: ' + (d.quizCorrect || 0) + '/5' : 'pending'; } },
      { id: 'op_ai_graded', label: 'Get AI feedback on an explanation', icon: '🤖',
        check: function(d) { return (d.aiGradedCount || 0) >= 1; },
        progress: function(d) { return (d.aiGradedCount || 0) + '/1 AI grades'; } }
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
      if (!labToolData || !labToolData.opticsLab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { opticsLab: {
            mode: 'home',  // home | reflection | refraction | lenses | interference | diffraction | polarization | quiz
            // Reflection
            reflMirrorType: 'concave', reflFocal: 10, reflDo: 25, reflObjH: 6,
            reflShowMath: false,
            // Refraction
            refrN1: 1.000, refrN2: 1.520, refrTheta1: 30,
            refrShowMath: false,
            // Lenses
            lensType: 'converging', lensFocal: 12, lensDo: 25, lensObjH: 5,
            lensShowMath: false,
            // Interference (Young's double-slit)
            intLambda: 600, intSlitSep: 0.10, intScreenL: 1.0, intSlitWidth: 50,
            intShowMath: false,
            // Diffraction (single slit + grating)
            diffMode: 'single', diffLambda: 600, diffSlitWidth: 30, diffScreenL: 1.5, diffGrating: 600,
            diffShowMath: false,
            // Polarization
            polTheta2: 30, polTheta3: 90, polUseP3: false,
            polShowMath: false,
            // Glossary, AI grader, samples
            showGlossary: false,
            aiDrafts: {}, aiResponse: null, aiResponseTab: null, aiLoadingTab: null, aiGradedCount: 0,
            activeSampleId: null, lastTopicTab: null,
            // Quiz
            quizQuestions: null, quizAnswers: [], quizSubmitted: false, quizCorrect: 0, quizCompletedCount: 0,
            // Quest tracking
            simRunOnce: false, snellRun: false,
            realImageFormed: false, virtualImageFormed: false,
            tirTriggered: false,
            interferenceViewed: false, diffractionViewed: false, polarizationExtinct: false
          }});
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } },
          '🔆 Initializing Optics Lab...');
      }
      var d = labToolData.opticsLab;

      // ── Concept-mastery state + Canvas-survival persistence ──
      // The StemLab host's localStorage block does not include opticsLab, so
      // the tool resets every reload by default. Layer our own:
      //   1. Hydration: window slot (set by host's handleLoadProject) →
      //      localStorage → existing host state (whichever is freshest).
      //   2. Mirror: every change to mastery-related fields writes back out
      //      to the window slot + localStorage, and the host's executeSaveFile
      //      picks up the window slot to ride the project JSON (the only
      //      layer that survives Canvas sandbox sessions).
      //   3. Restore listener: a project-JSON load mid-session dispatches an
      //      event we react to without remount.
      var _opMasteryHydratedRef = React.useRef(false);
      if (!_opMasteryHydratedRef.current) {
        _opMasteryHydratedRef.current = true;
        try {
          var winState = (typeof window !== 'undefined' && window.__alloflowOpticsLab) || null;
          var lsState = null;
          try { lsState = JSON.parse(localStorage.getItem('opticsLab.state.v1') || 'null'); } catch (e) {}
          var seed = winState || lsState || null;
          if (seed && typeof seed === 'object') {
            var merge = {};
            if (seed.quizMastery && !d.quizMastery) merge.quizMastery = seed.quizMastery;
            if (seed.quizCompletedCount != null && !d.quizCompletedCount) merge.quizCompletedCount = seed.quizCompletedCount;
            if (Object.keys(merge).length > 0) {
              setLabToolData(function (prev) {
                return Object.assign({}, prev, { opticsLab: Object.assign({}, prev.opticsLab, merge) });
              });
            }
          }
        } catch (e) {}
      }

      // First-correct-on-question celebration. Mirrors the PetsLab decoder
      // and BirdLab lifer pattern: brand-new mastered question fires a
      // top-of-screen toast for ~3.2s, then auto-clears.
      var _opCelebState = React.useState(null);
      var opCeleb = _opCelebState[0];
      var setOpCeleb = _opCelebState[1];

      // Mirror mastery-relevant slice to window slot + localStorage.
      React.useEffect(function () {
        try {
          var snapshot = {
            quizMastery: d.quizMastery || {},
            quizCompletedCount: d.quizCompletedCount || 0,
            _ts: Date.now()
          };
          window.__alloflowOpticsLab = snapshot;
          try { localStorage.setItem('opticsLab.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [d.quizMastery, d.quizCompletedCount]);

      // Hot-reload from a project-JSON load mid-session.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowOpticsLab || {};
            setLabToolData(function (prev) {
              var patch = {};
              if (w.quizMastery) patch.quizMastery = w.quizMastery;
              if (w.quizCompletedCount != null) patch.quizCompletedCount = w.quizCompletedCount;
              return Object.assign({}, prev, { opticsLab: Object.assign({}, prev.opticsLab, patch) });
            });
          } catch (e) {}
        }
        window.addEventListener('alloflow-opticslab-restored', onRestore);
        return function () { window.removeEventListener('alloflow-opticslab-restored', onRestore); };
      }, []);

      function upd(k, v) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev);
          var patch;
          if (typeof k === 'object' && k !== null) {
            patch = k;
          } else {
            patch = {};
            patch[k] = v;
          }
          next.opticsLab = Object.assign({}, prev.opticsLab, patch);
          if (next.opticsLab.mode !== 'home') next.opticsLab.simRunOnce = true;
          // Remember the last topic tab visited (for the quiz tab to anchor questions)
          if (['reflection', 'refraction', 'lenses', 'interference', 'diffraction', 'polarization'].indexOf(next.opticsLab.mode) !== -1) {
            next.opticsLab.lastTopicTab = next.opticsLab.mode;
          }
          // Quest tracking
          if (next.opticsLab.mode === 'refraction') next.opticsLab.snellRun = true;
          if (next.opticsLab.mode === 'interference') next.opticsLab.interferenceViewed = true;
          if (next.opticsLab.mode === 'diffraction') next.opticsLab.diffractionViewed = true;
          // Polarization extinction: Δθ between consecutive axes ≈ 90°
          var dT12 = Math.abs((next.opticsLab.polTheta2 || 0) - 0);
          if (next.opticsLab.mode === 'polarization' && Math.abs(dT12 - 90) < 1) next.opticsLab.polarizationExtinct = true;
          return next;
        });
      }

      // Quest auto-tracking based on state changes
      // (Refraction TIR detection)
      try {
        var n1 = d.refrN1, n2 = d.refrN2, t1 = degToRad(d.refrTheta1 || 0);
        var snellRes = snell(t1, n1, n2);
        if (snellRes.tir && !d.tirTriggered) {
          // Set later via upd to avoid re-render storm; defer
          setTimeout(function() {
            setLabToolData(function(prev) {
              if (!prev.opticsLab || prev.opticsLab.tirTriggered) return prev;
              var next = Object.assign({}, prev);
              next.opticsLab = Object.assign({}, prev.opticsLab, { tirTriggered: true });
              if (awardXP) awardXP(10, 'OpticsLab — TIR triggered', 'opticsLab');
              return next;
            });
          }, 50);
        }
      } catch (e) {}

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
          h('div', { style: { fontSize: 36 } }, '🔆'),
          h('div', { style: { flex: 1 } },
            h('h2', { style: { margin: 0, color: '#7dd3fc', fontSize: 24, fontWeight: 900 } }, 'Optics Lab'),
            h('p', { style: { margin: '4px 0 0', color: '#94a3b8', fontSize: 12 } }, 'AP Physics 2: ray diagrams, Snell\'s law, mirrors, lenses, interference, diffraction, polarization. Side-by-side sims + calculators.')
          )
        ),
        // Mode tabs
        h('div', {
          role: 'tablist',
          'aria-label': 'Optics Lab navigation',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }
        },
          [
            { id: 'home', label: '🏠 Home', desc: 'Sample problems' },
            { id: 'reflection', label: '🪞 Reflection', desc: 'Mirrors + ray diagrams' },
            { id: 'refraction', label: '🌊 Refraction', desc: "Snell's law + TIR" },
            { id: 'lenses', label: '🔍 Lenses', desc: 'Thin lens + image formation' },
            { id: 'interference', label: '✨ Interference', desc: 'Double-slit fringes' },
            { id: 'diffraction', label: '〰 Diffraction', desc: 'Single-slit + grating' },
            { id: 'polarization', label: '↕ Polarization', desc: "Malus's law" },
            { id: 'phenomena', label: '🌈 Phenomena', desc: 'Rainbows · mirages · after-images · color · polarized sky' },
            { id: 'sleuth', label: '🕵️ Sleuth', desc: 'Predict image from setup' },
            { id: 'quiz', label: '📝 Quiz', desc: 'AP exam practice' },
            { id: 'mastery', label: '🏅 Mastery', desc: 'Concept progress + which questions you have nailed' }
          ].map(function(tab) {
            var sel = d.mode === tab.id;
            return h('button', {
              key: tab.id,
              role: 'tab',
              'aria-selected': sel,
              'data-op-focusable': 'true',
              onClick: function() { upd('mode', tab.id); },
              title: tab.desc,
              style: {
                padding: '8px 12px',
                background: sel ? 'linear-gradient(135deg,#0284c7,#0369a1)' : 'rgba(56,189,248,0.10)',
                color: sel ? '#fff' : '#7dd3fc',
                border: '1px solid ' + (sel ? '#0369a1' : 'rgba(56,189,248,0.40)'),
                borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, minHeight: 36
              }
            }, tab.label);
          })
        ),
        // Active mode
        d.mode === 'home' && _renderHome(d, upd, h),
        d.mode === 'reflection' && _renderTopicPanel({
          d: d, upd: upd, h: h, addToast: addToast, awardXP: awardXP, callGemini: callGemini, tab: 'reflection',
          title: '🪞 Reflection — plane + curved mirrors',
          sim: _renderReflectionSim(d, upd, h),
          calc: _renderReflectionCalc(d, upd, h, addToast, awardXP)
        }),
        d.mode === 'refraction' && _renderTopicPanel({
          d: d, upd: upd, h: h, addToast: addToast, awardXP: awardXP, callGemini: callGemini, tab: 'refraction',
          title: "🌊 Refraction — Snell's law + total internal reflection",
          sim: _renderRefractionSim(d, upd, h),
          calc: _renderRefractionCalc(d, upd, h)
        }),
        d.mode === 'lenses' && _renderTopicPanel({
          d: d, upd: upd, h: h, addToast: addToast, awardXP: awardXP, callGemini: callGemini, tab: 'lenses',
          title: '🔍 Lenses — converging + diverging, thin lens equation',
          sim: _renderLensSim(d, upd, h),
          calc: _renderLensCalc(d, upd, h, addToast, awardXP)
        }),
        d.mode === 'interference' && _renderTopicPanel({
          d: d, upd: upd, h: h, addToast: addToast, awardXP: awardXP, callGemini: callGemini, tab: 'interference',
          title: "✨ Interference — Young's double-slit",
          sim: _renderInterferenceSim(d, upd, h),
          calc: _renderInterferenceCalc(d, upd, h),
          extra: _renderPhQuantumTwist(d, upd, h)
        }),
        d.mode === 'diffraction' && _renderTopicPanel({
          d: d, upd: upd, h: h, addToast: addToast, awardXP: awardXP, callGemini: callGemini, tab: 'diffraction',
          title: '〰 Diffraction — single slit + grating',
          sim: _renderDiffractionSim(d, upd, h),
          calc: _renderDiffractionCalc(d, upd, h)
        }),
        d.mode === 'polarization' && _renderTopicPanel({
          d: d, upd: upd, h: h, addToast: addToast, awardXP: awardXP, callGemini: callGemini, tab: 'polarization',
          title: "↕ Polarization — Malus's law",
          sim: _renderPolarizationSim(d, upd, h),
          calc: _renderPolarizationCalc(d, upd, h)
        }),
        d.mode === 'phenomena' && _renderPhenomenaPanel(d, upd, h),
        d.mode === 'sleuth' && _renderSleuthPanel(d, upd, h, addToast),
        d.mode === 'quiz' && _renderQuizPanel(d, upd, h, addToast, awardXP, setOpCeleb),
        d.mode === 'mastery' && _renderMasteryPanel(d, upd, h),
        // Concept-mastery celebration overlay — fixed-position, top of screen,
        // self-clears after 3.5s. Renders on top of any view.
        opCeleb && h('div', {
          role: 'status',
          'aria-live': 'assertive',
          style: {
            position: 'fixed', top: 80, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999, pointerEvents: 'none',
            animation: 'opticslab-celeb-rise 3.5s ease-out forwards',
            maxWidth: 480
          }
        },
          h('div', {
            style: {
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)',
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
              h('div', { style: { fontSize: 13, fontWeight: 800, lineHeight: 1.3 } }, opCeleb.question.length > 90 ? (opCeleb.question.substring(0, 87) + '…') : opCeleb.question),
              h('div', { style: { fontSize: 11, fontStyle: 'italic', opacity: 0.95, marginTop: 2 } }, opCeleb.total + ' / 30 quiz questions mastered')
            )
          )
        )
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // HOME PANEL — welcome + sample problem library + topic shortcuts
  // ──────────────────────────────────────────────────────────────────
  function _renderHome(d, upd, h) {
    var _hMastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
    var _hMasteredCount = AP_OPTICS_QUIZ.filter(function (q) { return !!_hMastery[q.q]; }).length;
    var _hTotal = AP_OPTICS_QUIZ.length;
    var _hPct = _hTotal > 0 ? Math.round((_hMasteredCount / _hTotal) * 100) : 0;
    return h('div', null,
      h('div', {
        style: {
          background: 'rgba(56,189,248,0.10)',
          border: '1px solid rgba(56,189,248,0.40)',
          borderRadius: 10, padding: 14, marginBottom: 16
        }
      },
        h('div', { style: { fontSize: 14, fontWeight: 800, color: '#7dd3fc', marginBottom: 6 } }, '🚀 Welcome to the Optics Lab'),
        h('p', { style: { margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } },
          'Pick a sample problem below — each loads the parameters into the right tab and primes the simulation. Or jump straight into a topic at the top to explore on your own. Every panel pairs a draggable visualization with a calculator that shows the math step-by-step.'
        )
      ),
      // ── AP Concept Mastery summary tile ──
      // Surfaces cumulative quiz progress on the home dashboard. Click jumps
      // to the dedicated Mastery tab. Suppresses on-students who have not
      // yet attempted a quiz with a "start here" CTA instead.
      h('button', {
        onClick: function () { upd('mode', 'mastery'); },
        'aria-label': 'Open AP concept mastery — ' + _hMasteredCount + ' of ' + _hTotal + ' questions mastered',
        style: {
          width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: 14, marginBottom: 16, borderRadius: 12,
          background: 'linear-gradient(110deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.18) 50%, rgba(168,85,247,0.12) 100%)',
          border: '1px solid rgba(99,102,241,0.50)',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
        }
      },
        h('div', { style: { textAlign: 'center', minWidth: 90 } },
          h('div', { style: { fontSize: 26, fontWeight: 900, color: '#a5b4fc', lineHeight: 1 } }, _hMasteredCount + ' / ' + _hTotal),
          h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 } }, 'AP mastered')
        ),
        h('div', { style: { flex: 1, minWidth: 200 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 } }, '🏅 Concept Mastery'),
          h('div', { style: { height: 6, background: 'rgba(15,23,42,0.55)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }, 'aria-hidden': 'true' },
            h('div', { style: { width: _hPct + '%', height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #6366f1, #a855f7)', transition: 'width 0.3s' } })
          ),
          h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.45 } },
            _hMasteredCount === 0 ? 'Take the AP quiz — every question you answer correctly the first time locks in here permanently.'
            : _hMasteredCount === _hTotal ? '🏆 Full coverage — all 30 AP optics questions mastered.'
            : _hPct + '% of the AP optics question bank mastered. ' + (_hTotal - _hMasteredCount) + ' to go.'
          )
        ),
        h('span', { 'aria-hidden': 'true', style: { fontSize: 22, color: '#a5b4fc', fontWeight: 900, flexShrink: 0 } }, '→')
      ),
      // Sample problem library
      h('div', { style: { marginBottom: 18 } },
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 8 } }, '📚 AP Physics 2 sample problems'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
          SAMPLE_PROBLEMS.map(function(s) {
            return h('button', {
              key: s.id,
              onClick: function() { loadSampleProblem(s.id, upd); },
              'data-op-focusable': 'true',
              style: {
                textAlign: 'left',
                background: 'rgba(56,189,248,0.06)',
                border: '1px solid rgba(56,189,248,0.40)',
                borderRadius: 10, padding: 12, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 6
              }
            },
              h('div', { style: { fontSize: 10, fontWeight: 800, color: '#7dd3fc', letterSpacing: '0.06em', textTransform: 'uppercase' } }, s.topic),
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fef3c7' } }, s.title),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } }, s.research_question),
              h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, '→ ' + s.tab.charAt(0).toUpperCase() + s.tab.slice(1) + ' tab')
            );
          })
        )
      ),
      // Topic shortcuts
      h('div', null,
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 8 } }, '🎯 Or jump to a topic'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 } },
          [
            { mode: 'reflection', icon: '🪞', label: 'Reflection', sub: 'Plane + curved mirrors' },
            { mode: 'refraction', icon: '🌊', label: 'Refraction + TIR', sub: "Snell's law" },
            { mode: 'lenses', icon: '🔍', label: 'Lenses', sub: 'Thin lens equation' },
            { mode: 'interference', icon: '✨', label: 'Interference', sub: 'Double-slit fringes' },
            { mode: 'diffraction', icon: '〰', label: 'Diffraction', sub: 'Single-slit + grating' },
            { mode: 'polarization', icon: '↕', label: 'Polarization', sub: "Malus's law" },
            { mode: 'quiz', icon: '📝', label: 'AP Quiz', sub: 'Practice questions' }
          ].map(function(card) {
            return h('button', {
              key: card.mode,
              onClick: function() { upd('mode', card.mode); },
              'data-op-focusable': 'true',
              style: {
                textAlign: 'left',
                background: 'rgba(56,189,248,0.10)',
                border: '1px solid rgba(56,189,248,0.40)',
                borderRadius: 10, padding: 12, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 4, minHeight: 70
              }
            },
              h('div', { style: { fontSize: 22 } }, card.icon),
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fef3c7' } }, card.label),
              h('div', { style: { fontSize: 10, color: '#cbd5e1' } }, card.sub)
            );
          })
        )
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // GLOSSARY + MISCONCEPTIONS + AI GRADER — rendered inside topic panels
  // ──────────────────────────────────────────────────────────────────
  function _renderGlossaryPanel(tab, d, upd, h) {
    var keys = _glossaryForTab(tab);
    if (keys.length === 0) return null;
    return h('div', {
      style: {
        background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.40)',
        borderRadius: 10, padding: 12, marginTop: 12
      }
    },
      h('button', {
        onClick: function() { upd('showGlossary', !d.showGlossary); },
        'data-op-focusable': 'true',
        'aria-expanded': !!d.showGlossary,
        style: { background: 'transparent', color: '#d8b4fe', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0 }
      }, (d.showGlossary ? '▼' : '▶') + ' 📖 Glossary (' + keys.length + ' terms for this topic)'),
      d.showGlossary && h('div', { style: { marginTop: 8 } },
        keys.map(function(k) {
          var entry = OPTICS_GLOSSARY[k];
          return h('div', { key: k, style: { marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(168,85,247,0.20)' } },
            h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24' } }, entry.name),
            h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55, marginTop: 3 } }, entry.def)
          );
        })
      )
    );
  }
  function _renderMisconceptionsPanel(tab, h) {
    var items = MISCONCEPTIONS[tab];
    if (!items || items.length === 0) return null;
    return h('div', {
      style: {
        background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.45)',
        borderRadius: 10, padding: 12, marginTop: 12
      }
    },
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 8 } }, '⚠ Common misconceptions'),
      items.map(function(it, i) {
        return h('div', { key: i, style: { fontSize: 11, color: '#fde68a', lineHeight: 1.55, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid rgba(245,158,11,0.45)' } },
          h('div', { style: { fontWeight: 700, color: '#fef3c7', marginBottom: 2 } }, '✗ ' + it.wrong),
          h('div', { style: { color: '#cbd5e1' } }, '✓ ' + it.right)
        );
      })
    );
  }
  function _renderAiGrader(tab, d, upd, h, addToast, awardXP, callGemini) {
    function grade() {
      if (!callGemini) {
        if (addToast) addToast('AI grading unavailable in this environment.', 'error');
        return;
      }
      var draft = d.aiDrafts && d.aiDrafts[tab];
      if (!draft || draft.trim().length < 10) {
        if (addToast) addToast('Write a sentence or two of explanation first.', 'info');
        return;
      }
      upd({ aiLoadingTab: tab, aiResponseTab: tab, aiResponse: null });
      // Build a topic-specific prompt
      var topicMap = {
        reflection: 'mirror image formation (plane and curved mirrors, mirror equation, sign rules)',
        refraction: "Snell's law, refraction direction, critical angle, total internal reflection",
        lenses: 'thin lens equation, converging vs diverging, real vs virtual images, sign conventions',
        interference: "Young's double-slit interference, fringe spacing, constructive/destructive condition",
        diffraction: 'single-slit diffraction or diffraction gratings (depending on what they describe)',
        polarization: "Malus's law, the I₀/2 rule for unpolarized light, multi-polarizer combinations"
      };
      var prompt = 'You are a physics teacher grading an AP Physics 2 student\'s explanation.\n\n' +
        'TOPIC: ' + (topicMap[tab] || tab) + '\n\n' +
        'STUDENT WROTE:\n"' + draft + '"\n\n' +
        'Grade on:\n' +
        '1. Correct physics (do they identify the right principle/equation/law)?\n' +
        '2. Direction of effect (e.g., light bends toward vs away from normal)\n' +
        '3. Sign conventions (real vs virtual, etc.) where relevant\n' +
        '4. Avoid common AP-level misconceptions for this topic\n' +
        '5. Clarity for a peer studying for the AP exam\n\n' +
        'Return JSON: {"score": 0-10, "strengths": ["..."], "issues": ["..."], "improved_version": "a model 2-3 sentence explanation"}';
      callGemini(prompt, true).then(function(text) {
        var parsed = null;
        try {
          var jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch (e) {
          parsed = { error: 'Could not parse AI response.', raw: text };
        }
        upd({ aiLoadingTab: null, aiResponse: parsed, aiResponseTab: tab, aiGradedCount: (d.aiGradedCount || 0) + 1 });
        if (awardXP) awardXP(10, 'OpticsLab — AI graded explanation', 'opticsLab');
        if (addToast) addToast('AI feedback ready', 'success');
      }).catch(function(err) {
        upd({ aiLoadingTab: null, aiResponse: { error: 'AI request failed: ' + (err.message || 'unknown') }, aiResponseTab: tab });
      });
    }
    var draft = (d.aiDrafts && d.aiDrafts[tab]) || '';
    var isLoading = d.aiLoadingTab === tab;
    var resp = (d.aiResponseTab === tab) ? d.aiResponse : null;
    return h('div', {
      style: {
        background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.45)',
        borderRadius: 10, padding: 12, marginTop: 12
      }
    },
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#d8b4fe', marginBottom: 6 } }, '🤖 AI-graded explanation'),
      h('p', { style: { margin: '0 0 8px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
        'Write a 2-3 sentence physics explanation of what you just observed. AI feedback grades the physics accuracy and points out common errors.'
      ),
      h('label', { htmlFor: 'op-ai-' + tab, style: { fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 2 } }, 'Your explanation:'),
      h('textarea', {
        id: 'op-ai-' + tab,
        value: draft,
        onChange: function(e) {
          var drafts = Object.assign({}, (d.aiDrafts || {}));
          drafts[tab] = e.target.value;
          upd('aiDrafts', drafts);
        },
        'data-op-focusable': 'true',
        rows: 4,
        placeholder: 'e.g., Because n_water > n_air, light refracted into the water bends toward the normal. The refraction angle is smaller than the incident angle, satisfying Snell\'s law n₁sinθ₁ = n₂sinθ₂.',
        style: { width: '100%', padding: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
      }),
      h('button', {
        onClick: grade,
        'data-op-focusable': 'true',
        disabled: isLoading,
        'aria-busy': isLoading,
        style: {
          padding: '8px 16px',
          background: isLoading ? '#374151' : 'linear-gradient(135deg, #a855f7, #7e22ce)',
          color: '#fff', border: '1px solid ' + (isLoading ? '#4b5563' : '#7e22ce'),
          borderRadius: 8, cursor: isLoading ? 'wait' : 'pointer',
          fontSize: 12, fontWeight: 700
        }
      }, isLoading ? '🤖 Grading…' : '🤖 Grade my explanation'),
      resp && h('div', { style: { marginTop: 10, padding: 10, background: '#0f172a', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 8 } },
        resp.error
          ? h('div', { style: { fontSize: 12, color: '#fca5a5' } }, '⚠ ' + resp.error)
          : h('div', null,
              _isNum(resp.score) && h('div', { style: { fontSize: 16, fontWeight: 900, color: '#fef3c7', marginBottom: 6 } },
                'Score: ' + resp.score + ' / 10'
              ),
              Array.isArray(resp.strengths) && resp.strengths.length > 0 && h('div', { style: { marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', marginBottom: 2 } }, '✓ Strengths'),
                h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
                  resp.strengths.map(function(s, i) { return h('li', { key: i }, s); })
                )
              ),
              Array.isArray(resp.issues) && resp.issues.length > 0 && h('div', { style: { marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', marginBottom: 2 } }, '✗ Issues to address'),
                h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 11, color: '#cbd5e1', lineHeight: 1.55 } },
                  resp.issues.map(function(s, i) { return h('li', { key: i }, s); })
                )
              ),
              resp.improved_version && h('div', null,
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#a5b4fc', marginBottom: 2 } }, '📝 Model explanation'),
                h('div', { style: { fontSize: 11, color: '#fef3c7', fontStyle: 'italic', padding: 8, background: 'rgba(99,102,241,0.10)', borderRadius: 6, lineHeight: 1.6 } },
                  resp.improved_version
                )
              )
            )
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // SIGN CONVENTION SLEUTH (net-new mini-game)
  // 10 vignettes. Each describes a setup (object distance + lens/mirror type
  // + focal length); player picks the resulting image type from 4 options:
  // real-inverted-magnified / real-inverted-reduced / virtual-upright-magnified
  // / virtual-upright-reduced. Tests the AP Physics 2 canonical reflex of
  // predicting image character from object position relative to focal length.
  // ──────────────────────────────────────────────────────────────────
  function _renderSleuthPanel(d, upd, h, addToast) {
    var TYPES = [
      { id: 'realInvMag',  label: 'Real, inverted, magnified',  color: '#ef4444', icon: '🔻',
        rule: 'Object between f and 2f (inside 2× focal length but outside f). Image forms beyond 2f on the opposite side.' },
      { id: 'realInvRed',  label: 'Real, inverted, reduced',     color: '#f59e0b', icon: '⬇️',
        rule: 'Object beyond 2f. Image forms between f and 2f on the opposite side, smaller than the object.' },
      { id: 'virtUprMag',  label: 'Virtual, upright, magnified', color: '#22c55e', icon: '🔍',
        rule: 'Object inside f (between lens and focal point) for a CONVERGING lens. Image forms on the same side, magnified — this is the magnifying-glass case.' },
      { id: 'virtUprRed',  label: 'Virtual, upright, reduced',   color: '#0ea5e9', icon: '👓',
        rule: 'DIVERGING lens (any object position) OR convex mirror. Image is always virtual, upright, and reduced — peephole/wide-angle case.' }
    ];
    var V = [
      { id: 1, setup: 'Converging lens, f = 10 cm. Object placed at 30 cm from the lens.', correct: 'realInvRed',
        why: 'Object beyond 2f (30 cm > 20 cm). Real, inverted, reduced. Verify with 1/f = 1/d_o + 1/d_i: 1/10 = 1/30 + 1/d_i → d_i = 15 cm. Magnification = -d_i/d_o = -15/30 = -0.5 (inverted, half size).' },
      { id: 2, setup: 'Converging lens, f = 10 cm. Object placed at 15 cm from the lens.', correct: 'realInvMag',
        why: 'Object between f and 2f (10 < 15 < 20). Real, inverted, magnified. 1/10 = 1/15 + 1/d_i → d_i = 30 cm. Magnification = -30/15 = -2 (inverted, 2× size). This is the projector setup — film at f-to-2f range, screen far away.' },
      { id: 3, setup: 'Converging lens, f = 10 cm. Object placed at 5 cm from the lens.', correct: 'virtUprMag',
        why: 'Object inside focal length (5 < 10). Virtual, upright, magnified. 1/10 = 1/5 + 1/d_i → d_i = -10 cm (negative = same side as object = virtual). Magnification = -(-10)/5 = +2 (upright, 2× size). This is the magnifying-glass case.' },
      { id: 4, setup: 'Diverging lens, f = -8 cm. Object placed at 12 cm from the lens.', correct: 'virtUprRed',
        why: 'Diverging lenses ALWAYS produce virtual, upright, reduced images regardless of object position. 1/(-8) = 1/12 + 1/d_i → d_i = -4.8 cm (virtual). Magnification = +4.8/12 = +0.4 (upright, smaller). This is what eyeglasses for nearsightedness do.' },
      { id: 5, setup: 'Concave (converging) mirror, f = 15 cm. Object placed at 45 cm from the mirror.', correct: 'realInvRed',
        why: 'Object beyond 2f (45 > 30). Same rules as a converging lens: real, inverted, reduced. d_i = 22.5 cm in front of the mirror. Magnification = -0.5. The pattern transfers: concave mirrors and converging lenses share image-formation rules.' },
      { id: 6, setup: 'Convex (diverging) mirror at the end of a hallway, f = -50 cm. You stand 100 cm away.', correct: 'virtUprRed',
        why: 'Convex mirrors ALWAYS produce virtual, upright, reduced images. d_i = -33 cm (virtual, behind mirror). Magnification = +0.33. This is the security-mirror / passenger-side-mirror pattern: wide field of view at the cost of distance distortion.' },
      { id: 7, setup: 'Converging lens, f = 20 cm. Object placed exactly at 40 cm (= 2f).', correct: 'realInvRed',
        why: 'At exactly 2f, the image forms at exactly 2f on the opposite side, with magnification = -1 (same size, inverted). Some sources call this neither magnified nor reduced — but if you must pick, "reduced" is the conventional choice since magnification ≠ +1. Real and inverted are unambiguous.' },
      { id: 8, setup: 'Concave mirror, f = 12 cm. Object placed 6 cm from the mirror.', correct: 'virtUprMag',
        why: 'Object inside f (6 < 12). Virtual, upright, magnified. d_i = -12 cm (behind mirror). Magnification = +2. This is the makeup-mirror / shaving-mirror case — concave mirrors used at close range to magnify and stay upright.' },
      { id: 9, setup: 'Converging lens, f = 5 cm. Object very far away (essentially at infinity, like a distant star).', correct: 'realInvRed',
        why: 'Object at infinity → image at f (5 cm) on the opposite side. Real, inverted, reduced (as small as possible — just a point image). This is how a telescope objective works: parallel rays from a distant star focus to a point at the focal plane.' },
      { id: 10, setup: 'Diverging lens, f = -15 cm. Object placed at 5 cm (close to the lens).', correct: 'virtUprRed',
        why: 'Diverging lens — ALWAYS virtual, upright, reduced. Position does not change the qualitative answer for diverging lenses. d_i = -3.75 cm. Magnification = +0.75. The closer the object, the closer the virtual image is to the object (and the magnification approaches 1 from below).' }
    ];

    var ssIdx = d.ssIdx == null ? -1 : d.ssIdx;
    var ssSeed = d.ssSeed || 1;
    var ssAns = !!d.ssAns;
    var ssPick = d.ssPick;
    var ssScore = d.ssScore || 0;
    var ssRounds = d.ssRounds || 0;
    var ssStreak = d.ssStreak || 0;
    var ssBest = d.ssBest || 0;
    var ssShown = d.ssShown || [];

    function startSs() {
      var pool = [];
      for (var i = 0; i < V.length; i++) if (ssShown.indexOf(i) < 0) pool.push(i);
      if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); ssShown = []; }
      var seedNext = ((ssSeed * 16807 + 11) % 2147483647) || 7;
      var pick = pool[seedNext % pool.length];
      upd({ ssSeed: seedNext, ssIdx: pick, ssAns: false, ssPick: null, ssShown: ssShown.concat([pick]) });
    }
    function pickSs(typeId) {
      if (ssAns) return;
      var v = V[ssIdx];
      var correct = typeId === v.correct;
      var newScore = ssScore + (correct ? 1 : 0);
      var newStreak = correct ? (ssStreak + 1) : 0;
      var newBest = Math.max(ssBest, newStreak);
      upd({ ssAns: true, ssPick: typeId, ssScore: newScore, ssRounds: ssRounds + 1, ssStreak: newStreak, ssBest: newBest });
    }

    if (ssIdx < 0) {
      return h('div', null,
        h('h3', { style: { color: '#7dd3fc', fontSize: 16, fontWeight: 800, margin: '0 0 12px' } }, '🕵️ Sign Convention Sleuth'),
        h('div', {
          style: { background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.40)', borderRadius: 10, padding: 16, marginBottom: 14 }
        },
          h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.55 } },
            '10 setups. Each describes an object + a lens/mirror with a given focal length. Predict the image type from 4 options: real-inverted-magnified, real-inverted-reduced, virtual-upright-magnified, virtual-upright-reduced. Coaching after each pick shows the lens-equation math + the rule that would have given you the answer faster than the math.'
          ),
          h('div', { style: { fontSize: 11, color: '#a78bfa', marginTop: 6, fontStyle: 'italic' } },
            'Sign convention reminder: + d_i = real (opposite side), – d_i = virtual (same side). + magnification = upright; – magnification = inverted.')
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
          TYPES.map(function(t) {
            return h('div', { key: t.id, style: { padding: '10px 12px', borderRadius: 8, background: t.color + '15', border: '1px solid ' + t.color + '55' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, t.icon),
                h('span', { style: { color: t.color, fontWeight: 800, fontSize: 12 } }, t.label)
              ),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.45 } }, t.rule)
            );
          })
        ),
        h('button', {
          onClick: startSs,
          'data-op-focusable': 'true',
          style: { padding: '10px 18px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }
        }, '🕵️ Start — vignette 1 of 10')
      );
    }

    var v = V[ssIdx];
    var pickedCorrect = ssAns && ssPick === v.correct;
    var pct = ssRounds > 0 ? Math.round((ssScore / ssRounds) * 100) : 0;
    var allDone = ssShown.length >= V.length && ssAns;
    var correctType = TYPES.filter(function(t) { return t.id === v.correct; })[0];
    var pickedType = ssPick ? TYPES.filter(function(t) { return t.id === ssPick; })[0] : null;

    return h('div', null,
      h('h3', { style: { color: '#7dd3fc', fontSize: 16, fontWeight: 800, margin: '0 0 12px' } }, '🕵️ Sign Convention Sleuth'),
      // Score header
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 11, color: '#94a3b8', marginBottom: 12 } },
        h('span', null, 'Vignette ', h('strong', { style: { color: '#fff' } }, ssShown.length)),
        h('span', null, 'Score ', h('strong', { style: { color: '#86efac' } }, ssScore + ' / ' + ssRounds)),
        ssRounds > 0 && h('span', null, 'Accuracy ', h('strong', { style: { color: '#7dd3fc' } }, pct + '%')),
        h('span', null, 'Streak ', h('strong', { style: { color: '#fbbf24' } }, ssStreak)),
        h('span', null, 'Best ', h('strong', { style: { color: '#a78bfa' } }, ssBest))
      ),
      // Vignette
      h('section', { style: { padding: '14px 16px', borderRadius: 12, background: 'rgba(168,85,247,0.08)', border: '2px solid rgba(168,85,247,0.40)', marginBottom: 12 } },
        h('div', { style: { fontSize: 11, color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 } }, 'Vignette ' + ssShown.length + ' of ' + V.length),
        h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.55 } }, v.setup)
      ),
      // 4 type picker buttons
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }, role: 'radiogroup', 'aria-label': 'Pick the image type' },
        TYPES.map(function(t) {
          var picked = ssAns && ssPick === t.id;
          var isRight = ssAns && t.id === v.correct;
          var bg, border, color;
          if (ssAns) {
            if (isRight) { bg = 'rgba(34,197,94,0.18)'; border = '#22c55e'; color = '#bbf7d0'; }
            else if (picked) { bg = 'rgba(239,68,68,0.18)'; border = '#ef4444'; color = '#fecaca'; }
            else { bg = 'rgba(30,41,59,0.5)'; border = 'rgba(100,116,139,0.4)'; color = '#94a3b8'; }
          } else {
            bg = t.color + '15'; border = t.color + '60'; color = '#e2e8f0';
          }
          return h('button', {
            key: t.id, role: 'radio',
            'aria-checked': picked ? 'true' : 'false',
            'aria-label': t.label,
            disabled: ssAns,
            onClick: function() { pickSs(t.id); },
            style: { padding: '10px 12px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: ssAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 11, transition: 'all 0.15s', minHeight: 70 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 } },
              h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, t.icon),
              h('span', { style: { color: ssAns ? color : t.color, fontSize: 12, fontWeight: 800 } }, t.label)
            ),
            h('div', { style: { fontSize: 10, fontWeight: 500, lineHeight: 1.4, color: ssAns ? color : '#94a3b8' } }, t.rule)
          );
        })
      ),
      // Feedback
      ssAns && h('section', {
        style: {
          marginTop: 12, padding: '14px 16px', borderRadius: 10,
          background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
          border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)')
        }
      },
        h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 6, color: pickedCorrect ? '#86efac' : '#fca5a5' } },
          pickedCorrect
            ? '✅ Correct — ' + correctType.label
            : '❌ The image is ' + correctType.label + (pickedType ? ' (you picked ' + pickedType.label + ')' : '')
        ),
        h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 12, lineHeight: 1.55 } }, v.why),
        allDone
          ? h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.45)' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 4 } }, '🏆 All 10 vignettes complete'),
              h('div', { style: { color: '#e2e8f0', fontSize: 12, lineHeight: 1.5 } },
                'Final: ', h('strong', null, ssScore + ' / ' + V.length + ' (' + Math.round((ssScore / V.length) * 100) + '%)'),
                ssScore === V.length ? ' — every image type correctly predicted. Ready for AP Physics 2 FRQ work.' :
                ssScore >= 8 ? ' — strong sign-convention reasoning. The most-confused pair is usually realInvRed vs realInvMag (object beyond 2f vs between f and 2f) — memorize the cutoff at 2f.' :
                ssScore >= 6 ? ' — solid baseline. Reflexes to build: diverging lens + convex mirror = ALWAYS virtual upright reduced. Object inside f for converging = magnifying glass.' :
                ' — these distinctions take practice. Re-read the four type cards above + the rationales on misses, then retake. The lens equation sign convention is the foundation.'
              ),
              h('button', {
                onClick: function() { upd({ ssIdx: -1, ssShown: [], ssScore: 0, ssRounds: 0, ssStreak: 0 }); },
                style: { marginTop: 8, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }
              }, '🔄 Restart')
            )
          : h('button', {
              onClick: startSs,
              style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
            }, '➡️ Next vignette')
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // QUIZ PANEL — 5-question AP-style multiple choice
  // ──────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────
  // CONCEPT MASTERY PANEL — cross-attempt log of AP quiz questions the
  // student has answered correctly at least once, rolled up into the six
  // main AP Physics 2 optics concepts. Mirrors the BirdLab life list +
  // PetsLab decoder mastery pattern: per-attempt scores reset; mastery
  // accumulates forever.
  // ──────────────────────────────────────────────────────────────────
  function _renderMasteryPanel(d, upd, h) {
    var mastery = (d.quizMastery && typeof d.quizMastery === 'object') ? d.quizMastery : {};
    var totalQuestions = AP_OPTICS_QUIZ.length;
    var masteredQuestions = AP_OPTICS_QUIZ.filter(function (q) { return !!mastery[q.q]; });
    var masteredCount = masteredQuestions.length;
    var pctOverall = totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0;

    // Six main AP topics — universal/dispersion/sign_convention/em_spectrum
    // are cross-cutting tags rolled into "Synthesis".
    var CONCEPTS = [
      { id: 'reflection',   label: '🪞 Reflection',   color: '#0ea5e9', tagMatch: function (tags) { return tags.indexOf('reflection') !== -1; } },
      { id: 'refraction',   label: '🌊 Refraction + TIR', color: '#06b6d4', tagMatch: function (tags) { return tags.indexOf('refraction') !== -1 || tags.indexOf('tir') !== -1; } },
      { id: 'lenses',       label: '🔍 Lenses',       color: '#8b5cf6', tagMatch: function (tags) { return tags.indexOf('lenses') !== -1; } },
      { id: 'interference', label: '✨ Interference', color: '#f59e0b', tagMatch: function (tags) { return tags.indexOf('interference') !== -1 && tags.indexOf('diffraction') === -1; } },
      { id: 'diffraction',  label: '〰 Diffraction',  color: '#ec4899', tagMatch: function (tags) { return tags.indexOf('diffraction') !== -1 || tags.indexOf('grating') !== -1; } },
      { id: 'polarization', label: '↕ Polarization',  color: '#10b981', tagMatch: function (tags) { return tags.indexOf('polarization') !== -1; } },
      { id: 'synthesis',    label: '🧠 Synthesis',    color: '#94a3b8', tagMatch: function (tags) {
        // Cross-cutting: only count questions whose ONLY non-universal tag is in this synthesis bucket.
        if (tags.indexOf('reflection') !== -1 || tags.indexOf('refraction') !== -1 || tags.indexOf('tir') !== -1) return false;
        if (tags.indexOf('lenses') !== -1 || tags.indexOf('interference') !== -1) return false;
        if (tags.indexOf('diffraction') !== -1 || tags.indexOf('grating') !== -1) return false;
        if (tags.indexOf('polarization') !== -1) return false;
        return true;
      } }
    ];

    function fmtDate(iso) {
      if (!iso) return '';
      try {
        var dd = new Date(iso);
        return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch (e) { return iso.substring(0, 10); }
    }

    var conceptStats = CONCEPTS.map(function (c) {
      var qs = AP_OPTICS_QUIZ.filter(function (q) { return c.tagMatch(q.tags || []); });
      var done = qs.filter(function (q) { return !!mastery[q.q]; });
      return { concept: c, questions: qs, doneCount: done.length };
    });

    return h('section', {
      'aria-label': 'AP optics concept mastery',
      style: { marginTop: 4 }
    },
      // Hero summary
      h('div', {
        style: {
          padding: 18, borderRadius: 14, marginBottom: 14,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.18) 0%, rgba(99,102,241,0.18) 50%, rgba(168,85,247,0.18) 100%)',
          border: '2px solid rgba(99,102,241,0.55)'
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' } },
          h('div', { style: { textAlign: 'center', minWidth: 110 } },
            h('div', { style: { fontSize: 38, fontWeight: 900, color: '#a5b4fc', lineHeight: 1 } }, masteredCount + ' / ' + totalQuestions),
            h('div', { style: { fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 } }, 'Quiz questions mastered')
          ),
          h('div', { style: { flex: 1, minWidth: 240 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, '🏅'),
              h('h3', { style: { margin: 0, fontSize: 17, color: '#e2e8f0', fontWeight: 800 } }, 'Concept Mastery')
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } },
              'Every AP quiz question you answer correctly at least once locks in here. Quiz scores reset between attempts; mastery is permanent. Build coverage across all six concepts before exam day.'
            ),
            h('div', { style: { height: 8, background: 'rgba(15,23,42,0.5)', borderRadius: 4, overflow: 'hidden' }, 'aria-hidden': 'true' },
              h('div', { style: { width: pctOverall + '%', height: '100%', background: 'linear-gradient(90deg, #0ea5e9, #6366f1, #a855f7)', transition: 'width 0.3s' } })
            ),
            h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontWeight: 700 } },
              pctOverall === 100 ? '🏆 All 30 questions mastered — full AP coverage' :
              masteredCount === 0 ? 'Start the quiz to begin building mastery' :
              pctOverall + '% complete · ' + (totalQuestions - masteredCount) + ' to go'
            )
          )
        )
      ),
      // Per-concept cards
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
            // Per-question dots
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
          onClick: function () { upd({ mode: 'quiz', quizQuestions: null, quizAnswers: [], quizSubmitted: false }); },
          style: {
            padding: '10px 18px', width: '100%',
            background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 800, cursor: 'pointer'
          }
        },
          masteredCount === 0 ? '📝 Take your first AP quiz attempt'
          : masteredCount === totalQuestions ? '📝 Re-attempt the quiz to reinforce'
          : '📝 Take another quiz attempt — fill in gaps'
        )
      )
    );
  }

  function _renderQuizPanel(d, upd, h, addToast, awardXP, setOpCeleb) {
    if (!d.quizQuestions) {
      return h('div', null,
        h('h3', { style: { color: '#7dd3fc', fontSize: 16, fontWeight: 800, margin: '0 0 12px' } }, '📝 AP exam practice quiz'),
        h('div', {
          style: {
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.40)',
            borderRadius: 10, padding: 16
          }
        },
          h('p', { style: { margin: '0 0 10px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } },
            'Take a 5-question AP-style multiple-choice quiz. Two questions are tied to whichever topic you most recently visited (',
            h('b', { style: { color: '#fbbf24' } }, d.lastTopicTab || 'pick a topic above'),
            '), two are universal anchors on core concepts, and one is random. Per-question rationales appear after submit.'
          ),
          h('button', {
            onClick: function() {
              upd({
                quizQuestions: _pickOpticsQuizQuestions(d.lastTopicTab),
                quizAnswers: [], quizSubmitted: false, quizCorrect: 0
              });
            },
            'data-op-focusable': 'true',
            style: {
              padding: '10px 18px',
              background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
              color: '#fff', border: '1px solid #7e22ce',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 800
            }
          }, '📝 Start 5-question quiz')
        )
      );
    }
    return h('div', null,
      h('h3', { style: { color: '#7dd3fc', fontSize: 16, fontWeight: 800, margin: '0 0 12px' } }, '📝 AP exam practice quiz'),
      h('div', { style: { background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.40)', borderRadius: 10, padding: 14 } },
        d.quizQuestions.map(function(q, qi) {
          var pickedIdx = (d.quizAnswers || [])[qi];
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
                'data-op-focusable': 'true',
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
            // Each question is keyed by its text (stable across reshuffles
            // and unique within the bank). Quiz score is per-attempt;
            // mastery sticks across attempts.
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
                  // Keep just the FIRST newly-mastered question of this
                  // attempt for the celebration overlay (avoids stacking).
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
            if (newlyMasteredQ && typeof setOpCeleb === 'function') {
              try { setOpCeleb({ question: newlyMasteredQ.question, tags: newlyMasteredQ.tags, total: Object.keys(nextMastery).length, at: Date.now() }); } catch (e) {}
              try { setTimeout(function () { setOpCeleb(null); }, 3500); } catch (e) {}
            }
            if (awardXP) awardXP(correct * 5, 'OpticsLab — quiz: ' + correct + '/5', 'opticsLab');
            if (addToast) addToast('Quiz scored: ' + correct + ' / ' + d.quizQuestions.length, correct >= 4 ? 'success' : 'info');
            opAnnounce('Quiz score: ' + correct + ' out of ' + d.quizQuestions.length);
          },
          'data-op-focusable': 'true',
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
                     : pct >= 80 ? 'strong'
                     : pct >= 60 ? 'solid'
                     : 'review';
          var tierColor = tier === 'perfect' ? '#fbbf24' : tier === 'strong' ? '#22c55e' : tier === 'solid' ? '#a855f7' : '#f59e0b';
          var tierIcon = tier === 'perfect' ? '🏆' : tier === 'strong' ? '🎯' : tier === 'solid' ? '📘' : '📚';
          var tierTitle = tier === 'perfect' ? 'Perfect — every concept landed'
                          : tier === 'strong' ? 'Strong understanding'
                          : tier === 'solid' ? 'Solid foundation'
                          : 'Worth another pass';
          var tierMsg = tier === 'perfect'
                        ? 'You’re ready for AP-level optics problems. The hard ones combine sign conventions with phasor reasoning — you can do both.'
                        : tier === 'strong'
                          ? 'Strong overall. Sign conventions for lenses + concave mirrors are the most-miss-prone area — worth a quick re-skim.'
                          : tier === 'solid'
                            ? 'Solid baseline. Re-read the topic where you missed — especially the worked examples in the sample problems for that topic.'
                            : 'Re-read the topic panels and work through 1–2 sample problems before retrying. Optics depends on sign conventions; rote memorization fails fast.';
          var rad = 36, circ = 2 * Math.PI * rad;
          var dashOff = circ - (pct / 100) * circ;
          var ans = d.quizAnswers || [];
          return h('div', { style: { marginTop: 8, borderRadius: 12, overflow: 'hidden', border: '2px solid ' + tierColor + 'aa', background: 'rgba(15,23,42,0.6)' } },
            h('div', { style: { padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', background: 'linear-gradient(135deg, ' + tierColor + '22, transparent)' } },
              h('div', { style: { position: 'relative', width: 88, height: 88, flexShrink: 0 } },
                h('svg', { viewBox: '0 0 100 100', width: 88, height: 88,
                  'aria-label': 'Score: ' + d.quizCorrect + ' out of ' + d.quizQuestions.length
                },
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                  h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                    strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                ),
                h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                  h('div', { style: { fontSize: 19, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                  h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' } }, d.quizCorrect + ' / ' + d.quizQuestions.length)
                )
              ),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 26, marginBottom: 2 }, 'aria-hidden': 'true' }, tierIcon),
                h('div', { style: { fontSize: 16, fontWeight: 900, color: tierColor, lineHeight: 1.15 } }, tierTitle),
                h('p', { style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 } }, tierMsg)
              )
            ),
            h('div', { style: { padding: '0 14px 8px' } },
              h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 } }, 'Your answers'),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                d.quizQuestions.map(function(qq, qi) {
                  var isCorrect = ans[qi] === qq.correct;
                  return h('div', { key: qi,
                    title: 'Q' + (qi + 1) + (isCorrect ? ' correct ✓' : ' incorrect'),
                    style: {
                      width: 14, height: 14, borderRadius: 3,
                      background: isCorrect ? '#22c55e' : '#ef4444',
                      border: '1.5px solid ' + (isCorrect ? '#15803d' : '#7f1d1d'),
                      boxShadow: '0 1px 1px rgba(0,0,0,0.3)'
                    },
                    'aria-label': 'Q' + (qi + 1) + (isCorrect ? ' correct' : ' incorrect')
                  });
                })
              )
            ),
            h('div', { style: { padding: '10px 14px', borderTop: '1px solid rgba(148,163,184,0.25)' } },
              h('button', {
                onClick: function() { upd({ quizQuestions: null, quizAnswers: [], quizSubmitted: false }); },
                'data-op-focusable': 'true',
                style: { padding: '6px 14px', background: 'rgba(168,85,247,0.18)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.45)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }
              }, '🔁 New quiz')
            )
          );
        })()
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // TOPIC-PANEL TEMPLATE — side-by-side sim + calculator,
  // followed by glossary, misconceptions, and AI-graded explanation.
  // Pass tab='reflection'/'refraction'/etc. to opts.
  // ──────────────────────────────────────────────────────────────────
  function _renderTopicPanel(opts) {
    var h = opts.h, d = opts.d, upd = opts.upd, tab = opts.tab;
    var researchQuestion = null;
    if (d.activeSampleId) {
      for (var i = 0; i < SAMPLE_PROBLEMS.length; i++) {
        if (SAMPLE_PROBLEMS[i].id === d.activeSampleId && SAMPLE_PROBLEMS[i].tab === tab) {
          researchQuestion = SAMPLE_PROBLEMS[i];
          break;
        }
      }
    }
    // Topic-specific accent palette — keys off the tab id so each topic feels distinct
    var topicMeta = {
      'reflection':   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', hint: 'Mirrors flip the path. Predict where the image lands before running the sim.',
        tryThis: 'Drag the object inside the focal length of a concave mirror. Predict whether the image will be real or virtual BEFORE you look \u2014 then check.' },
      'refraction':   { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  hint: "Light slows in denser media. Snell's law: n\u2081 sin\u03B8\u2081 = n\u2082 sin\u03B8\u2082.",
        tryThis: 'Push the angle past the critical angle (try water \u2192 air, n\u2081 = 1.33). Watch the refracted ray vanish into total internal reflection \u2014 the basis of fiber optics and diamond brilliance.' },
      'lenses':       { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', hint: 'Same equation as a mirror, different sign convention. Real vs virtual depends on object distance.',
        tryThis: 'Move the object from beyond 2f \u2192 exactly at 2f \u2192 between f and 2f \u2192 inside f. Watch the image flip from reduced to magnified, then jump to virtual the moment you cross f.' },
      'interference': { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', hint: 'Two slits: bright fringes where path difference equals an integer number of wavelengths.',
        tryThis: 'Halve the slit spacing d. Predict what happens to fringe spacing y = \u03BBL/d before changing it \u2014 then verify. Now try doubling \u03BB. Same prediction game.' },
      'diffraction':  { accent: '#ef4444', soft: 'rgba(239,68,68,0.10)',  hint: 'Light bends around edges. The narrower the slit relative to \u03BB, the more spread.',
        tryThis: 'Make the slit width comparable to \u03BB. Watch the central peak fill the screen. Now make it 100\u00D7 \u03BB \u2014 the peak collapses to a thin line. The slit/wavelength ratio is everything.' },
      'polarization': { accent: '#10b981', soft: 'rgba(16,185,129,0.10)', hint: "Malus's law: I = I\u2080 cos\u00B2\u03B8. Two crossed polarizers: total extinction.",
        tryThis: 'Cross two polarizers (90\u00B0) \u2014 output is zero. Now insert a third polarizer at 45\u00B0 between them. Output reappears. The intermediate polarizer creates light where there was none \u2014 a counterintuitive consequence of cos\u00B2\u03B8.' }
    };
    var meta = topicMeta[tab] || { accent: '#7dd3fc', soft: 'rgba(125,211,252,0.10)', hint: '' };
    return h('div', null,
      // Topic hero — gradient banner with title + tagline (lifts the BirdLab tab-hero pattern).
      h('div', {
        style: {
          background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0.6) 100%)',
          border: '1px solid ' + meta.accent + '55',
          borderLeft: '4px solid ' + meta.accent,
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
        }
      },
        h('div', { style: { flex: 1, minWidth: 220 } },
          h('h3', {
            style: { color: meta.accent, fontSize: 18, fontWeight: 900, margin: 0, lineHeight: 1.2 }
          }, opts.title),
          meta.hint && h('p', {
            style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic' }
          }, meta.hint)
        )
      ),
      // "Try this" experiment prompt — concrete thing to do with the sim. Each
      // topic has a curated prompt that turns "click around" into a directed
      // exploration with a predict-then-verify loop.
      meta.tryThis && h('div', {
        style: {
          background: 'rgba(34,197,94,0.07)',
          border: '1px solid rgba(34,197,94,0.35)',
          borderRadius: 10,
          padding: '8px 12px', marginBottom: 12,
          display: 'flex', alignItems: 'flex-start', gap: 10
        },
        role: 'note', 'aria-label': 'Suggested experiment'
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: 16, lineHeight: '20px', flexShrink: 0 } }, '🎯'),
        h('div', null,
          h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 } }, 'Try this'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, meta.tryThis)
        )
      ),
      researchQuestion && h('div', {
        style: {
          background: 'rgba(251,191,36,0.10)',
          border: '1px solid rgba(251,191,36,0.45)',
          borderRadius: 10, padding: 12, marginBottom: 12
        },
        role: 'note', 'aria-label': 'Sample problem context'
      },
        h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fbbf24', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 } }, '📚 ' + researchQuestion.topic),
        h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fef3c7', marginBottom: 4 } }, researchQuestion.title),
        h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, marginBottom: 6 } }, researchQuestion.research_question),
        researchQuestion.hint && h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '💡 ' + researchQuestion.hint),
        h('button', {
          onClick: function() { upd({ activeSampleId: null }); },
          'data-op-focusable': 'true',
          style: { marginTop: 6, padding: '3px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', fontSize: 10 }
        }, 'Dismiss')
      ),
      h('div', {
        style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14 }
      },
        // Left: simulation
        h('div', {
          style: {
            background: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.30)',
            borderRadius: 10, padding: 14
          }
        },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 8 } }, '🎮 Simulation'),
          opts.sim
        ),
        // Right: calculator
        h('div', {
          style: {
            background: 'rgba(99,102,241,0.05)',
            border: '1px solid rgba(99,102,241,0.30)',
            borderRadius: 10, padding: 14
          }
        },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#a5b4fc', marginBottom: 8 } }, '🧮 Calculator'),
          opts.calc
        )
      ),
      // Optional extra section (e.g., the quantum-twist panel for Interference)
      opts.extra,
      // Pedagogical layers
      _renderMisconceptionsPanel(tab, h),
      _renderGlossaryPanel(tab, d, upd, h),
      _renderAiGrader(tab, d, upd, h, opts.addToast, opts.awardXP, opts.callGemini)
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // PHENOMENA PANEL — light-based real-world perceptual effects.
  // Bridges the AP physics content into "you see this in the world":
  // rainbows (dispersion + internal reflection), mirages (refraction in
  // a temperature gradient), after-images (cone fatigue), color mixing
  // (additive vs subtractive), polarized sky (Rayleigh scattering).
  // Pure cognitive illusions (Müller-Lyer, Necker, etc.) intentionally
  // belong in BrainAtlas / a perception tool, not here.
  // ──────────────────────────────────────────────────────────────────
  function _renderPhenomenaPanel(d, upd, h) {
    var sub = d.phenoSub || 'rainbow';
    var subModes = [
      { id: 'rainbow',    label: '🌈 Rainbow',    desc: 'Drop geometry + dispersion' },
      { id: 'prism',      label: '🔺 Prism',      desc: 'Newton\'s spectrometer — dispersion by material' },
      { id: 'mirage',     label: '🏜️ Mirage',     desc: 'Hot-air refraction' },
      { id: 'afterimage', label: '👁️ After-image', desc: 'Cone fatigue' },
      { id: 'colormix',   label: '🎨 Color mix',  desc: 'Additive vs subtractive' },
      { id: 'polsky',     label: '☀️ Polarized sky', desc: 'Why polarized lenses cut glare' },
      { id: 'eye',        label: '👁 Eye & focus', desc: 'Accommodation + corrective lenses' },
      { id: 'sunset',     label: '🌅 Sunset',     desc: 'Rayleigh scattering' }
    ];
    return h('div', null,
      // Hero banner
      h('div', {
        style: {
          background: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(236,72,153,0.06) 50%, rgba(15,23,42,0.6) 100%)',
          border: '1px solid rgba(168,85,247,0.45)',
          borderLeft: '4px solid #a855f7',
          borderRadius: 10, padding: '12px 14px', marginBottom: 12
        }
      },
        h('h3', { style: { color: '#c4b5fd', fontSize: 18, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, '🌈 Light Phenomena — optics in the wild'),
        h('p', { style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.45, fontStyle: 'italic' } },
          'The AP equations show up in places you already see: rainbows, mirages, after-images, color screens, polarized sunglasses. Each sim isolates one phenomenon so you can play with the underlying optics.')
      ),
      // Sub-mode selector
      h('div', { role: 'tablist', 'aria-label': 'Phenomena sub-explorers',
        style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
        subModes.map(function(m) {
          var sel = sub === m.id;
          return h('button', {
            key: m.id, role: 'tab', 'aria-selected': sel,
            'data-op-focusable': 'true',
            onClick: function() { upd('phenoSub', m.id); },
            title: m.desc,
            style: {
              padding: '7px 11px',
              background: sel ? 'linear-gradient(135deg,#7e22ce,#5b21b6)' : 'rgba(168,85,247,0.10)',
              color: sel ? '#fff' : '#c4b5fd',
              border: '1px solid ' + (sel ? '#7e22ce' : 'rgba(168,85,247,0.40)'),
              borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, minHeight: 34
            }
          }, m.label);
        })
      ),
      // Active sub
      sub === 'rainbow'    && _renderPhRainbow(d, upd, h),
      sub === 'prism'      && _renderPhPrism(d, upd, h),
      sub === 'mirage'     && _renderPhMirage(d, upd, h),
      sub === 'afterimage' && _renderPhAfterImage(d, upd, h),
      sub === 'colormix'   && _renderPhColorMix(d, upd, h),
      sub === 'polsky'     && _renderPhPolSky(d, upd, h),
      sub === 'eye'        && _renderPhEye(d, upd, h),
      sub === 'sunset'     && _renderPhSunset(d, upd, h)
    );
  }

  // Shared layout: side-by-side SVG + explanation panel
  function _phLayout(h, svg, controls, explanation) {
    return h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(340px,1fr) minmax(260px,1fr)', gap: 12 } },
      h('div', { style: { background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 10, padding: 12 } },
        svg, controls
      ),
      h('div', { style: { background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 10, padding: 14 } },
        explanation
      )
    );
  }

  // ── Rainbow geometry ─────────────────────────────────────────────
  function _renderPhRainbow(d, upd, h) {
    // Sky scene: sun, observer, raindrop curtain, AND the actual 42° rainbow arc.
    // Previous version showed one drop with two rays — pedagogically correct but
    // visually didn't look like a rainbow. This version shows what an observer
    // actually sees: the geometric origin of the bow, with the live arc forming.
    var W = 460, H = 320;
    var sunAlt = d.phenoRbSunAlt != null ? d.phenoRbSunAlt : 25; // sun altitude (°)
    var showRays = d.phenoRbShowRays !== false; // default on
    var horizonY = H - 60;
    // Observer at center bottom
    var obsX = W / 2, obsY = horizonY - 8;
    // Sun in the upper-left (rises with sunAlt)
    var sunX = 60, sunY = horizonY - 220 * Math.sin(degToRad(sunAlt));
    // Antisolar point — opposite the sun, BELOW the horizon when sun is up.
    // We compute its projection above the horizon for the rainbow geometry.
    // Rainbow is centered on antisolar point, radius = 42°. Visible portion lies
    // above the horizon when sunAlt < 42°. Apex height (above horizon) = 42° − sunAlt.
    var bowApexAboveHoriz = Math.max(0, 42 - sunAlt);
    // Antisolar point projected onto the screen (below horizon)
    var asX = W - sunX; // mirror of sun's X
    var asY = horizonY + (sunY - horizonY) * -1; // mirror across horizon
    // Bow center on screen: along the line from sun through observer's eye, extended.
    // For visualization, just draw an arc centered at antisolar projection with radius
    // proportional to the angular size (we'll use pixels per degree ≈ 4).
    var pxPerDeg = 4.5;
    var bowR = 42 * pxPerDeg;
    // Build the rainbow as concentric color arcs (red outermost, violet innermost)
    var spectrum = [
      { color: '#ef4444', deg: 42.0 },
      { color: '#fb923c', deg: 41.5 },
      { color: '#facc15', deg: 41.0 },
      { color: '#22c55e', deg: 40.5 },
      { color: '#06b6d4', deg: 40.2 },
      { color: '#3b82f6', deg: 40.0 },
      { color: '#a855f7', deg: 39.7 }
    ];
    function arcPath(cx, cy, r) {
      // Draw upper half arc visible above horizon
      var x1 = cx - r, y1 = cy;
      var x2 = cx + r, y2 = cy;
      // Clip the arc to above horizon
      return 'M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
             ' A ' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
    }
    var arcs = spectrum.map(function(b, i) {
      var r = b.deg * pxPerDeg;
      return h('path', {
        key: 'arc' + i,
        d: arcPath(asX, asY, r),
        fill: 'none',
        stroke: b.color,
        strokeWidth: 4,
        opacity: bowApexAboveHoriz > 0 ? 0.85 : 0.15
      });
    });
    // Drop curtain — 5 visible drops at different heights along the bow
    var dropPositions = [];
    for (var di = 0; di < 5; di++) {
      var ang = (180 - 30 + di * 15) * Math.PI / 180; // arc parametrization
      var dx = asX + bowR * Math.cos(ang);
      var dy = asY + bowR * Math.sin(ang);
      // Only keep drops above the horizon
      if (dy < horizonY - 4 && dx > 100 && dx < W - 30) dropPositions.push({ x: dx, y: dy });
    }
    var drops = dropPositions.map(function(p, i) {
      return h('circle', { key: 'drop' + i, cx: p.x, cy: p.y, r: 6, fill: 'rgba(125,211,252,0.55)', stroke: '#7dd3fc', strokeWidth: 1 });
    });
    // Sun rays: from sun to each drop (illustrative)
    var sunRays = showRays ? dropPositions.map(function(p, i) {
      return h('line', { key: 'sr' + i, x1: sunX, y1: sunY, x2: p.x, y2: p.y, stroke: '#fef9c3', strokeWidth: 0.8, opacity: 0.4, strokeDasharray: '3 2' });
    }) : null;
    // Returning rays from drops to observer eye (the bow rays)
    var returnRays = showRays ? dropPositions.map(function(p, i) {
      // Each drop returns red along one direction, violet along slightly different
      var c = spectrum[i % spectrum.length].color;
      return h('line', { key: 'rr' + i, x1: p.x, y1: p.y, x2: obsX, y2: obsY - 4, stroke: c, strokeWidth: 1.4, opacity: 0.85 });
    }) : null;
    // ── Animated photons traversing each drop ──
    // Each drop gets two motion dots: a white "sunlight" photon traveling from
    // the sun to the drop, and a colored photon traveling from the drop to the
    // observer. Together they show the sun → drop → eye journey that makes the
    // rainbow visible at 42°.
    var dropPhotons = showRays ? (function() {
      var nodes = [];
      dropPositions.forEach(function(p, i) {
        var c = spectrum[i % spectrum.length].color;
        var inPath = 'M ' + sunX + ' ' + sunY + ' L ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
        var outPath = 'M ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' L ' + obsX + ' ' + (obsY - 4);
        // White incident photon
        nodes.push(h('circle', {
          key: 'rbpi' + i, r: 2.4, fill: '#fef9c3',
          stroke: '#fff', strokeWidth: 0.3,
          style: {
            offsetPath: 'path("' + inPath + '")',
            WebkitOffsetPath: 'path("' + inPath + '")',
            filter: 'drop-shadow(0 0 4px #fef9c3)',
            animationDuration: '3s',
            animationDelay: (-i * 0.4) + 's'
          },
          className: 'opticslab-photon', cx: 0, cy: 0
        }));
        // Tiny "internal reflection" pulse INSIDE the drop —
        // a small ring expanding briefly to suggest the back-wall bounce.
        nodes.push(h('circle', {
          key: 'rbpr' + i,
          cx: p.x, cy: p.y, r: 1,
          fill: 'none', stroke: c, strokeWidth: 0.8,
          opacity: 0.85,
          className: 'opticslab-wavefront',
          style: {
            animationDuration: '3s',
            animationDelay: (-i * 0.4 + 0.6) + 's',
            transformOrigin: p.x + 'px ' + p.y + 'px'
          }
        }));
        // Colored returning photon (wavelength color of this drop)
        nodes.push(h('circle', {
          key: 'rbpo' + i, r: 2.6, fill: c,
          stroke: '#fff', strokeWidth: 0.3,
          style: {
            offsetPath: 'path("' + outPath + '")',
            WebkitOffsetPath: 'path("' + outPath + '")',
            filter: 'drop-shadow(0 0 4px ' + c + ')',
            animationDuration: '2.5s',
            animationDelay: (-i * 0.4 + 1.2) + 's'
          },
          className: 'opticslab-photon', cx: 0, cy: 0
        }));
      });
      return nodes;
    })() : null;
    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', height: 'auto', borderRadius: 8 },
      role: 'img', 'aria-label': 'Rainbow scene — sun shines on a curtain of raindrops; light bouncing inside each drop returns toward the observer at 42° from the antisolar point, forming the colored bow.' },
      // Sky gradient
      h('defs', null,
        h('linearGradient', { id: 'rbsky', x1: '0', y1: '0', x2: '0', y2: '1' },
          h('stop', { offset: '0%', stopColor: '#1e3a5f' }),
          h('stop', { offset: '60%', stopColor: '#7dd3fc' }),
          h('stop', { offset: '100%', stopColor: '#dbeafe' })
        )
      ),
      h('rect', { x: 0, y: 0, width: W, height: horizonY, fill: 'url(#rbsky)' }),
      // Distant rain shower band
      h('rect', { x: 250, y: 50, width: 130, height: horizonY - 50, fill: 'rgba(125,211,252,0.18)' }),
      [0,1,2,3,4,5].map(function(i) {
        return h('line', { key: 'rain' + i, x1: 260 + i * 22, y1: 70, x2: 250 + i * 22, y2: horizonY, stroke: '#7dd3fc', strokeWidth: 0.4, opacity: 0.4 });
      }),
      // Ground
      h('rect', { x: 0, y: horizonY, width: W, height: H - horizonY, fill: '#3f6b35' }),
      // Horizon line
      h('line', { x1: 0, y1: horizonY, x2: W, y2: horizonY, stroke: '#475569', strokeWidth: 1, opacity: 0.5 }),
      // Sun with halo
      h('circle', { cx: sunX, cy: sunY, r: 24, fill: '#fef9c3', opacity: 0.4 }),
      h('circle', { cx: sunX, cy: sunY, r: 14, fill: '#fde047' }),
      // Sun rays (dashed)
      sunRays,
      // The rainbow arcs themselves
      arcs,
      // Drops
      drops,
      // Returning colored rays
      returnRays,
      // Animated photons traversing each drop
      dropPhotons,
      // Observer (small figure)
      h('circle', { cx: obsX, cy: obsY - 14, r: 5, fill: '#1f2937' }),
      h('rect', { x: obsX - 4, y: obsY - 10, width: 8, height: 14, fill: '#1f2937' }),
      // Observer's antisolar shadow (just a small ground marker on the line opposite the sun)
      h('line', { x1: obsX, y1: obsY + 4, x2: obsX + 30, y2: obsY + 4, stroke: '#1f2937', strokeWidth: 2, opacity: 0.4 }),
      // Labels
      h('text', { x: sunX, y: sunY - 30, fill: '#fef9c3', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'sun'),
      h('text', { x: obsX, y: H - 6, fill: '#fef3c7', fontSize: 10, textAnchor: 'middle' }, 'observer'),
      bowApexAboveHoriz > 0 ?
        h('text', { x: asX, y: asY - bowR - 8, fill: '#fef3c7', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, '42° rainbow arc') :
        h('text', { x: W / 2, y: 18, fill: '#ef4444', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Sun is too high — bow falls below the horizon (sun must be < 42° altitude)'),
      h('text', { x: 12, y: 18, fill: '#fbbf24', fontSize: 10, fontFamily: 'monospace' }, 'sun ' + sunAlt + '°  •  apex ' + bowApexAboveHoriz.toFixed(1) + '° above horizon')
    );
    var controls = h('div', { style: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 } },
      h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 } },
        'Sun altitude:',
        h('input', { type: 'range', min: 0, max: 70, step: 1, value: sunAlt,
          onChange: function(e) { upd('phenoRbSunAlt', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Sun altitude above horizon',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 38 } }, sunAlt + '°')
      ),
      h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 } },
        h('input', { type: 'checkbox', checked: showRays,
          onChange: function(e) { upd('phenoRbShowRays', e.target.checked); },
          'data-op-focusable': 'true', 'aria-label': 'Show light rays' }),
        'Show rays')
    );
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Why rainbows have an angle'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Sunlight enters a raindrop, refracts (Snell\'s law), reflects off the back wall, and refracts again on exit. The total path bends by 2θᵢ − 4θᵣ + 180°.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'For most rays this deviation just spreads light. But there\'s a critical angle where the deviation is minimum — and rays from a band of impact parameters all exit at almost the same angle, so the light intensity bunches up. THAT bunching is what your eye sees as a rainbow.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Different colors have slightly different n (red 1.331, violet 1.343) — so they each have a slightly different minimum-deviation angle. Red sits at 42° from the antisolar point, violet at 40°. That ~2° spread is the rainbow.'),
      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'Try it outside: rainbows always sit at 42° from the shadow of your head. The bow is centered on the antisolar point — the spot directly opposite the sun.')
    );
    return _phLayout(h, svg, controls, explanation);
  }

  // ── Mirage simulator ─────────────────────────────────────────────
  function _renderPhMirage(d, upd, h) {
    // Hot-air mirage: rays from above curve UPWARD because n decreases near the
    // hot ground (warmer air = lower density = lower n). Brain extrapolates rays
    // straight back, sees an inverted reflection that looks like water.
    var W = 420, H = 240;
    var grad = d.phenoMirageGrad != null ? d.phenoMirageGrad : 0.6; // 0..1 strength
    // Stack of layers — top cooler (n=1.0008), bottom hotter (n=1.0002 at max grad).
    var nLayers = 12;
    var groundY = H - 30;
    var skyTop = 30;
    function nAt(y) {
      var t = (groundY - y) / (groundY - skyTop); // 1 at top, 0 at ground
      return 1.0 + 0.0002 + 0.0006 * t * (1 - 0.0001 * (1 - grad));
    }
    // Ray starting from object (a tree) at the right side
    var rays = [];
    var startX = W - 60;
    function tracedRay(initialAngle, color, opacity) {
      var pts = [{ x: startX, y: 80 }];
      var x = startX, y = 80;
      var ang = initialAngle; // radians from horizontal, downward positive
      var step = 4;
      var prevN = nAt(y);
      while (x > 20 && y < groundY - 4 && y > 5) {
        x -= step * Math.cos(ang);
        y += step * Math.sin(ang);
        var newN = nAt(y);
        // Snell at the boundary: n1 sin θ1 = n2 sin θ2. θ measured from vertical.
        // Convert ang (from horizontal) to θ-from-vertical: θ = 90° - ang
        var theta1 = Math.PI / 2 - ang;
        var sinT2 = Math.sin(theta1) * prevN / newN;
        if (Math.abs(sinT2) > 1) {
          // Total internal reflection — flip the angle (this is what curves the ray upward)
          ang = -ang;
        } else {
          var theta2 = Math.asin(sinT2);
          ang = Math.PI / 2 - theta2;
        }
        prevN = newN;
        pts.push({ x: x, y: y });
        if (pts.length > 220) break;
      }
      // Build polyline
      return h('polyline', {
        points: pts.map(function(p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' '),
        fill: 'none', stroke: color, strokeWidth: 1.6, opacity: opacity
      });
    }
    rays.push(tracedRay(0.05, '#fbbf24', 0.85));   // shallow downward — bends up to viewer
    rays.push(tracedRay(0.20, '#f59e0b', 0.70));   // steeper — also bends
    rays.push(tracedRay(-0.05, '#86efac', 0.85));  // upward — direct path (no mirage)
    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', height: 'auto', background: 'linear-gradient(180deg,#1e3a5f 0%,#7dd3fc 70%,#fef3c7 100%)', borderRadius: 8 },
      role: 'img', 'aria-label': 'Hot-air mirage simulator — light rays from a distant tree curve upward as they pass through hot lower air. The viewer perceives an inverted image at the road surface that looks like a puddle of water.' },
      // Heat haze layers — subtle CSS shimmer animation gives the visual
      // "wavy heat" effect (disabled under prefers-reduced-motion).
      [0,1,2,3].map(function(i) {
        return h('rect', { key: 'haze' + i, className: 'opticslab-mirage-haze', x: 0, y: groundY - 4 - i * 5, width: W, height: 5, fill: 'rgba(252,165,20,' + (0.06 + i * 0.04 * grad) + ')' });
      }),
      // Ground
      h('rect', { x: 0, y: groundY, width: W, height: H - groundY, fill: '#3f3f46' }),
      // Lane stripes
      [0,1,2,3,4].map(function(i) {
        return h('rect', { key: 's' + i, x: 30 + i * 80, y: groundY + 8, width: 30, height: 3, fill: '#fde047' });
      }),
      // Tree (object)
      h('rect', { x: startX - 4, y: 60, width: 8, height: 30, fill: '#5c3a1e' }),
      h('circle', { cx: startX, cy: 55, r: 22, fill: '#16a34a' }),
      // Viewer (eye)
      h('circle', { cx: 30, cy: 80, r: 6, fill: '#fbbf24', stroke: '#000', strokeWidth: 1 }),
      h('text', { x: 30, y: 100, fill: '#fef3c7', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'eye'),
      rays,
      h('text', { x: W / 2, y: 18, fill: '#fef3c7', fontSize: 11, fontWeight: 700, textAnchor: 'middle' }, 'Heat-gradient strength: ' + (grad * 100).toFixed(0) + '%')
    );
    var controls = h('div', { style: { marginTop: 10 } },
      h('label', { style: { fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 } },
        'Ground-air heat gradient:',
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: grad,
          onChange: function(e) { upd('phenoMirageGrad', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Heat gradient strength',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 38 } }, (grad * 100).toFixed(0) + '%')
      )
    );
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Why the road looks wet'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Hot air is less dense → lower index of refraction. Just above a sun-baked road, air can be 30°C+ hotter than air a meter up.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'A nearly-horizontal light ray entering the hot layer experiences a stack of n boundaries — at each, Snell\'s law bends it slightly away from the normal, until it eventually total-internal-reflects upward.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Your visual system extrapolates the bent ray as if it traveled in a straight line. So the sky\'s blue light, having curved up off the hot road, appears to come from BELOW the road surface — just like a reflection in a puddle.'),
      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'Same physics: superior mirage (cold air over warm water), looming, the green flash at sunset.')
    );
    return _phLayout(h, svg, controls, explanation);
  }

  // ── After-image trainer ──────────────────────────────────────────
  function _renderPhAfterImage(d, upd, h) {
    // Stare at color → tire those cones → look at gray → see complementary color.
    var color = d.phenoAfterColor || '#dc2626';
    var phase = d.phenoAfterPhase || 'idle'; // idle | staring | reveal
    var startedAt = d.phenoAfterStartedAt || 0;
    // Time math: when staring, count down from 12s. When reveal, show gray for 8s then back to idle.
    var now = Date.now();
    var elapsed = startedAt > 0 ? (now - startedAt) / 1000 : 0;
    var stareDur = 12, revealDur = 8;
    var remaining;
    if (phase === 'staring') {
      remaining = Math.max(0, stareDur - elapsed);
      if (remaining === 0 && typeof setTimeout === 'function') {
        setTimeout(function() { upd({ phenoAfterPhase: 'reveal', phenoAfterStartedAt: Date.now() }); }, 0);
      }
    } else if (phase === 'reveal') {
      remaining = Math.max(0, revealDur - elapsed);
      if (remaining === 0 && typeof setTimeout === 'function') {
        setTimeout(function() { upd({ phenoAfterPhase: 'idle', phenoAfterStartedAt: 0 }); }, 0);
      }
    }
    // Schedule a per-second re-render so the countdown updates
    if (phase !== 'idle' && typeof setTimeout === 'function') {
      setTimeout(function() { upd('phenoAfterTick', Date.now()); }, 250);
    }
    function complementHex(hex) {
      var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      var cr = 255 - r, cg = 255 - g, cb = 255 - b;
      return '#' + cr.toString(16).padStart(2,'0') + cg.toString(16).padStart(2,'0') + cb.toString(16).padStart(2,'0');
    }
    var stage;
    if (phase === 'idle') {
      stage = h('div', { style: { width: '100%', height: 240, background: '#1f2937', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 } },
        h('div', { style: { color: '#cbd5e1', fontSize: 13, textAlign: 'center', maxWidth: 280 } }, 'Pick a color, then press Start. Stare at the + in the middle for 12 seconds without looking away.'),
        h('button', {
          onClick: function() { upd({ phenoAfterPhase: 'staring', phenoAfterStartedAt: Date.now() }); },
          'data-op-focusable': 'true',
          style: { padding: '8px 18px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }
        }, '▶ Start (12 sec stare)')
      );
    } else if (phase === 'staring') {
      stage = h('div', { style: { position: 'relative', width: '100%', height: 240, background: color, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h('div', { 'aria-hidden': 'true', style: { color: '#000', fontSize: 36, fontWeight: 900, mixBlendMode: 'difference' } }, '+'),
        h('div', { style: { position: 'absolute', top: 8, right: 12, color: '#000', fontSize: 11, fontFamily: 'monospace', fontWeight: 800 } }, remaining.toFixed(0) + 's')
      );
    } else { // reveal
      stage = h('div', { style: { position: 'relative', width: '100%', height: 240, background: '#9ca3af', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h('div', { 'aria-hidden': 'true', style: { color: '#000', fontSize: 36, fontWeight: 900 } }, '+'),
        h('div', { style: { position: 'absolute', top: 8, right: 12, color: '#000', fontSize: 11, fontFamily: 'monospace', fontWeight: 800 } }, 'Look! ' + remaining.toFixed(0) + 's')
      );
    }
    var controls = h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      h('label', { style: { fontSize: 11, color: '#cbd5e1' } }, 'Color: ',
        h('input', { type: 'color', value: color,
          onChange: function(e) { upd('phenoAfterColor', e.target.value); },
          disabled: phase !== 'idle',
          'data-op-focusable': 'true', 'aria-label': 'Pick stare color',
          style: { width: 40, height: 28, marginLeft: 6, verticalAlign: 'middle' } })
      ),
      phase !== 'idle' && h('button', {
        onClick: function() { upd({ phenoAfterPhase: 'idle', phenoAfterStartedAt: 0 }); },
        'data-op-focusable': 'true',
        style: { padding: '5px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, fontSize: 11, cursor: 'pointer' }
      }, 'Cancel'),
      h('div', { style: { fontSize: 10, color: '#94a3b8' } },
        'Predicted after-image color: ',
        h('span', { style: { display: 'inline-block', width: 18, height: 14, background: complementHex(color), border: '1px solid #475569', verticalAlign: 'middle', borderRadius: 3, marginLeft: 4 } })
      )
    );
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Cone fatigue → complementary color'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Your retina has three cone types: S (blue), M (green), L (red). Stare at red and the L-cones desensitize. When you then look at neutral gray (which equally stimulates all three), the L-cones underrespond → you perceive the COMPLEMENT (cyan).'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Complement of any color = 255 − each RGB channel. Red (#dc2626) → cyan-ish. Green → magenta. Blue → yellow. Same trick painters use to make complementary colors "pop" off each other.'),
      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'This bridges optics (light + retinal physics) to neuroscience (cortical color processing). Pure-cognitive illusions like Müller-Lyer live in BrainAtlas — they\'re about brain interpretation, not light.')
    );
    return _phLayout(h, stage, controls, explanation);
  }

  // ── Color mixing (additive vs subtractive) ───────────────────────
  function _renderPhColorMix(d, upd, h) {
    var rI = d.phenoMixR != null ? d.phenoMixR : 1.0; // 0..1 intensity
    var gI = d.phenoMixG != null ? d.phenoMixG : 1.0;
    var bI = d.phenoMixB != null ? d.phenoMixB : 1.0;
    var cI = d.phenoMixC != null ? d.phenoMixC : 1.0;
    var mI = d.phenoMixM != null ? d.phenoMixM : 1.0;
    var yI = d.phenoMixY != null ? d.phenoMixY : 1.0;
    // Additive sum (RGB). Caps at 255.
    function addClamp(a, b, c) { return Math.min(255, Math.round(a + b + c)); }
    var addR = Math.round(255 * rI), addG = Math.round(255 * gI), addB = Math.round(255 * bI);
    // Subtractive: each ink subtracts its complement. C absorbs R, M absorbs G, Y absorbs B.
    var subR = Math.round(255 * (1 - cI));
    var subG = Math.round(255 * (1 - mI));
    var subB = Math.round(255 * (1 - yI));
    var addCss = 'rgb(' + addR + ',' + addG + ',' + addB + ')';
    var subCss = 'rgb(' + subR + ',' + subG + ',' + subB + ')';
    function disk(cx, cy, r, color, opacity) {
      return h('circle', { cx: cx, cy: cy, r: r, fill: color, opacity: opacity, style: { mixBlendMode: 'screen' } });
    }
    function diskSub(cx, cy, r, color, opacity) {
      return h('circle', { cx: cx, cy: cy, r: r, fill: color, opacity: opacity, style: { mixBlendMode: 'multiply' } });
    }
    var addSvg = h('svg', { viewBox: '0 0 200 180', style: { width: '100%', height: 'auto', background: '#000', borderRadius: 8 }, role: 'img', 'aria-label': 'Additive color mixing — three light circles (red, green, blue) overlap. Where all three combine, the result is white.' },
      disk(70, 80, 50, 'rgb(255,0,0)', rI),
      disk(130, 80, 50, 'rgb(0,255,0)', gI),
      disk(100, 130, 50, 'rgb(0,0,255)', bI),
      h('text', { x: 100, y: 18, fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Additive (lights)')
    );
    var subSvg = h('svg', { viewBox: '0 0 200 180', style: { width: '100%', height: 'auto', background: '#fff', borderRadius: 8 }, role: 'img', 'aria-label': 'Subtractive color mixing — three pigment circles (cyan, magenta, yellow) overlap on white paper. Where all three combine, the result is black.' },
      diskSub(70, 80, 50, 'rgb(0,255,255)', cI),
      diskSub(130, 80, 50, 'rgb(255,0,255)', mI),
      diskSub(100, 130, 50, 'rgb(255,255,0)', yI),
      h('text', { x: 100, y: 18, fill: '#1f2937', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, 'Subtractive (pigments)')
    );
    function slider(label, val, key, color) {
      return h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#cbd5e1' } },
        h('span', { style: { color: color, fontWeight: 700, minWidth: 14 } }, label),
        h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: val,
          onChange: function(e) { upd(key, parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': label + ' channel intensity',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', minWidth: 28, color: '#fbbf24' } }, (val * 100).toFixed(0) + '%')
      );
    }
    var stage = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } }, addSvg, subSvg);
    var controls = h('div', { style: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      h('div', null,
        h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 } }, 'Light channels'),
        slider('R', rI, 'phenoMixR', '#ef4444'),
        slider('G', gI, 'phenoMixG', '#22c55e'),
        slider('B', bI, 'phenoMixB', '#3b82f6'),
        h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6 } }, 'Center: ', h('span', { style: { display: 'inline-block', width: 18, height: 14, background: addCss, border: '1px solid #475569', verticalAlign: 'middle', borderRadius: 3, marginLeft: 4 } }))
      ),
      h('div', null,
        h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 } }, 'Pigment channels'),
        slider('C', cI, 'phenoMixC', '#06b6d4'),
        slider('M', mI, 'phenoMixM', '#ec4899'),
        slider('Y', yI, 'phenoMixY', '#facc15'),
        h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 6 } }, 'Center: ', h('span', { style: { display: 'inline-block', width: 18, height: 14, background: subCss, border: '1px solid #475569', verticalAlign: 'middle', borderRadius: 3, marginLeft: 4 } }))
      )
    );
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Light adds. Pigment subtracts.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Your phone screen is RGB. Each pixel emits a tiny amount of red, green, blue — and your eye sums them. All three at full intensity = white. None = black. RGB is ADDITIVE.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Your printer is CMYK. Each ink ABSORBS one third of the visible spectrum. Cyan absorbs red. Magenta absorbs green. Yellow absorbs blue. All three together absorb everything → black. CMYK is SUBTRACTIVE.'),
      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'Why "K" in CMYK? Real-world C+M+Y inks make muddy brown, not true black. Printers add a separate black plate (Key) for actual black + crisp text.')
    );
    return _phLayout(h, stage, controls, explanation);
  }

  // ── Polarized sky ────────────────────────────────────────────────
  function _renderPhPolSky(d, upd, h) {
    var sunAz = d.phenoSkySunAz != null ? d.phenoSkySunAz : 30;     // degrees from east
    var polDeg = d.phenoSkyPolDeg != null ? d.phenoSkyPolDeg : 0;   // polarizer rotation
    var W = 420, H = 240;
    // Sun position
    var sunX = W * 0.5 + W * 0.35 * Math.cos(degToRad(sunAz));
    var sunY = 80 - 30 * Math.sin(degToRad(sunAz));
    // Polarization is strongest 90° from the sun. Visualize as a band of darker sky there.
    var sunDir = Math.atan2(80 - sunY, sunX - W * 0.5);
    // Build sky tiles, each tinted by Malus-like factor depending on polarizer angle vs the sky's local pol axis.
    var tiles = [];
    var cols = 24, rows = 8;
    for (var iy = 0; iy < rows; iy++) {
      for (var ix = 0; ix < cols; ix++) {
        var tx = (ix + 0.5) * (W / cols);
        var ty = (iy + 0.5) * (140 / rows);
        var dxs = tx - sunX, dys = ty - sunY;
        var distFromSun = Math.sqrt(dxs * dxs + dys * dys);
        // Polarization strength peaks at 90° away (band shape)
        var maxDim = Math.max(W, 140);
        var normDist = Math.min(1, distFromSun / (maxDim * 0.5));
        var bandStrength = 1 - Math.abs(normDist - 0.5) * 2; // peaks at half max
        bandStrength = Math.max(0, bandStrength);
        // Sky's local polarization axis is perpendicular to (sun → sky-point) direction
        var localAxis = (Math.atan2(dys, dxs) * 180 / Math.PI) + 90;
        // Malus on the polarizer
        var deltaDeg = ((polDeg - localAxis) % 180 + 180) % 180;
        var rad = degToRad(deltaDeg);
        var passFrac = Math.cos(rad) * Math.cos(rad);
        // Final brightness — base sky modulated by polarization strength × Malus factor
        var dim = 1 - bandStrength * (1 - passFrac) * 0.85;
        var blueR = Math.round(125 * dim);
        var blueG = Math.round(180 * dim);
        var blueB = Math.round(225 * dim);
        tiles.push(h('rect', {
          key: ix + ',' + iy,
          x: ix * (W / cols), y: iy * (140 / rows),
          width: W / cols + 0.5, height: 140 / rows + 0.5,
          fill: 'rgb(' + blueR + ',' + blueG + ',' + blueB + ')'
        }));
      }
    }
    // ── Animated E-field vectors on the maximum-polarization band ──
    // Where polarization peaks (90° from sun), draw small oscillating line
    // segments perpendicular to the sun→point direction. As the polarizer
    // axis rotates, each vector's opacity tracks Malus's cos²Δθ — students
    // see the band brighten/dim AND the actual E-field direction at each
    // sky position.
    var efieldVectors = (function() {
      var nodes = [];
      var bandRadius = 90; // pixels from sun for the peak-polarization band
      var nPts = 16;
      for (var i = 0; i < nPts; i++) {
        var angle = (i / nPts) * Math.PI * 2;
        var vx = sunX + bandRadius * Math.cos(angle);
        var vy = sunY + bandRadius * Math.sin(angle);
        // Skip points outside the visible sky region (above ground, inside canvas)
        if (vx < 8 || vx > W - 8 || vy < 8 || vy > 132) continue;
        // Local axis: perpendicular to (sun → point), so add 90°
        var localAxisDeg = (Math.atan2(vy - sunY, vx - sunX) * 180 / Math.PI) + 90;
        var deltaDeg = ((polDeg - localAxisDeg) % 180 + 180) % 180;
        var passFrac = Math.cos(degToRad(deltaDeg)) * Math.cos(degToRad(deltaDeg));
        // Vector length scales with intensity transmitted through polarizer
        var len = 4 + passFrac * 7;
        var dx = Math.cos(degToRad(localAxisDeg)) * len;
        var dy = Math.sin(degToRad(localAxisDeg)) * len;
        nodes.push(h('line', {
          key: 'ef' + i,
          x1: vx - dx, y1: vy - dy, x2: vx + dx, y2: vy + dy,
          stroke: '#facc15', strokeWidth: 1.4, strokeLinecap: 'round',
          opacity: 0.35 + passFrac * 0.55,
          className: 'opticslab-efield-vec',
          style: { animationDelay: (i * 0.07 - 0.7) + 's' }
        }));
      }
      return nodes;
    })();

    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', height: 'auto', borderRadius: 8 }, role: 'img', 'aria-label': 'Polarized sky simulator. Sky regions 90 degrees from the sun are most strongly polarized; rotating a polarizer dims them when its axis is crossed. Animated E-field vectors show the polarization direction at each point on the peak-polarization band.' },
      tiles,
      // Ground
      h('rect', { x: 0, y: 140, width: W, height: H - 140, fill: '#3f6b35' }),
      // E-field vector indicators on the peak-polarization band
      efieldVectors,
      // Sun
      h('circle', { cx: sunX, cy: sunY, r: 16, fill: '#fef9c3' }),
      h('circle', { cx: sunX, cy: sunY, r: 22, fill: 'none', stroke: '#fef9c3', strokeWidth: 1, opacity: 0.5 }),
      // Polarizer disk (small visualization at bottom-right)
      h('g', { transform: 'translate(' + (W - 60) + ',' + (H - 40) + ')' },
        h('circle', { cx: 0, cy: 0, r: 22, fill: 'rgba(15,23,42,0.7)', stroke: '#7dd3fc' }),
        h('line', {
          x1: -22 * Math.cos(degToRad(polDeg + 90)),
          y1: -22 * Math.sin(degToRad(polDeg + 90)),
          x2: 22 * Math.cos(degToRad(polDeg + 90)),
          y2: 22 * Math.sin(degToRad(polDeg + 90)),
          stroke: '#fbbf24', strokeWidth: 3
        }),
        h('text', { x: 0, y: 38, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle', fontFamily: 'monospace' }, 'pol ' + polDeg.toFixed(0) + '°')
      )
    );
    var controls = h('div', { style: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
        'Sun azimuth:',
        h('input', { type: 'range', min: -90, max: 90, step: 5, value: sunAz,
          onChange: function(e) { upd('phenoSkySunAz', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Sun azimuth',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 32 } }, sunAz + '°')
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
        'Polarizer:',
        h('input', { type: 'range', min: 0, max: 180, step: 5, value: polDeg,
          onChange: function(e) { upd('phenoSkyPolDeg', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Polarizer rotation',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 32 } }, polDeg + '°')
      )
    );
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Why polarized sunglasses cut sky glare'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Sunlight is unpolarized when it leaves the sun. As it scatters off air molecules (Rayleigh scattering), the scattered light becomes partially polarized — strongest 90° from the sun direction.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Rotate a polarizer (or your head while wearing polarized sunglasses) and that band of sky brightens or dims by Malus\'s law: I = I₀ cos²θ between the polarizer axis and the sky\'s local polarization axis.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Polarized sunglasses are usually oriented to block HORIZONTAL polarization — because reflections off horizontal surfaces (water, road, snow) produce horizontally-polarized glare. Same physics, different application.'),
      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'Bees and many other insects use sky polarization for navigation. Their compound eyes detect the polarization pattern even when the sun is hidden.')
    );
    return _phLayout(h, svg, controls, explanation);
  }

  // ── Eye & accommodation ─────────────────────────────────────────
  function _renderPhEye(d, upd, h) {
    // Object distance from eye (cm). The eye's lens accommodates by changing
    // shape: thicker for near objects (shorter f), thinner for far objects.
    // v2: adds eye conditions (normal/myopia/hyperopia) and corrective lenses.
    var dObjCm = d.phenoEyeDist != null ? d.phenoEyeDist : 25;
    var ageYears = d.phenoEyeAge != null ? d.phenoEyeAge : 20;
    var condition = d.phenoEyeCondition || 'normal'; // normal | myopia | hyperopia
    var glassesOn = !!d.phenoEyeGlasses;
    var dObjMm = dObjCm * 10;

    // Axial length (lens-to-retina distance) depends on condition.
    // Normal: 22.7 mm. Myopia: eyeball ~2 mm longer. Hyperopia: ~2 mm shorter.
    var dImg = condition === 'myopia' ? 24.7 : condition === 'hyperopia' ? 20.7 : 22.7;

    // For a "relaxed" eye looking at infinity, the lens uses its minimum power.
    // For the standard 22.7 mm axial length, that's f = 22.7 mm = 44.05 D.
    // For myopic eye (24.7 mm), the relaxed lens still focuses parallel rays at
    // ~22.7 mm — but the retina is at 24.7 mm, so parallel rays focus in FRONT
    // of the retina → distant objects look blurry. (Near objects can still
    // focus on the retina because the lens does have some accommodation range.)
    // Similarly, hyperopic eye focuses parallel rays BEHIND the retina.
    //
    // Effective lens f the eye must produce to image dObj on the retina (dImg):
    //   1/f = 1/d_o + 1/d_i   →   f = (d_o · d_i) / (d_o + d_i)
    // For the eye to focus this object on the retina without glasses, the
    // required f must fall within the eye's accommodation range.

    // Lens accommodation range (in diopters of power, 1/f in metres):
    //   Young eye: ~ 44 D (relaxed, infinity) to 55+ D (near point)
    //   Age dampens the upper end (presbyopia).
    var ageAccomLoss = Math.max(0, ageYears - 10) * 0.18; // diopters lost per year past 10
    var pMin = 44; // relaxed minimum power
    var pMax = Math.max(45, 55 - ageAccomLoss); // accommodated maximum power

    // Glasses correction in diopters (user-adjustable). Negative for myopia
    // (diverging), positive for hyperopia (converging).
    var glassesDiopters = d.phenoEyeGlassesD != null ? d.phenoEyeGlassesD :
      (condition === 'myopia' ? -3 : condition === 'hyperopia' ? +3 : 0);

    // Effective object distance AFTER glasses (if worn). Glasses lens with
    // power P_g acts on light from object at d_o; the virtual image becomes
    // the effective object the eye must focus. For thin-lens approximation,
    // glasses just add their power to the eye system → eye sees an object at
    // d_o' where 1/d_o' = 1/d_o + P_g (in 1/m). For diverging glasses (P_g < 0)
    // this makes d_o' larger (object appears farther) — perfect for myopia.
    var effDoMm = dObjMm;
    if (glassesOn && glassesDiopters !== 0) {
      // Convert dObjMm → m, apply, convert back. Glasses sit just in front of
      // the eye (we ignore the small gap to the cornea for clarity).
      var d_o_m = dObjMm / 1000;
      var newRecip = 1 / d_o_m + glassesDiopters; // 1/m
      if (newRecip > 0.01) effDoMm = (1 / newRecip) * 1000;
      else if (newRecip < -0.01) effDoMm = (1 / newRecip) * 1000; // virtual far behind
      else effDoMm = 1e6; // effectively at infinity
    }

    // Required eye-lens power for this effective object
    var fNeed = (effDoMm * dImg) / (effDoMm + dImg); // mm
    var diopters = fNeed > 0 ? 1000 / fNeed : 0;

    var canFocus = diopters >= pMin - 0.5 && diopters <= pMax + 0.5;
    // Near point (closest object the eye can resolve, with or without glasses)
    // At max accommodation (pMax) we have 1/f = pMax (per m), and we need
    // f_image = dImg. Required d_o at max accommodation:
    //   1/d_o = pMax (per m) - 1/(dImg/1000)
    // If glasses are on, the eye's effective near point is pulled in (for
    // hyperopia/presbyopia) or pushed out (for myopia, where glasses make
    // near objects "appear" farther — they trade off).
    var pMaxRecipMmM = pMax - 1000 / dImg;
    var rawNearPointMm = pMaxRecipMmM > 0 ? 1000 / pMaxRecipMmM : 1e9;
    var nearPointMm = rawNearPointMm;
    if (glassesOn) {
      // Reverse the glasses transform on the near point too
      var npRecipM = 1 / (rawNearPointMm / 1000) - glassesDiopters;
      if (npRecipM > 0.05) nearPointMm = (1 / npRecipM) * 1000;
      else nearPointMm = 1e9;
    }
    var nearPointCm = nearPointMm / 10;
    // Far point — for myopic eye, far point is finite; we expose it as a
    // visible diagnostic. f_min = 1/pMin (in m). With relaxed lens looking
    // at the far point, 1/d_far = pMin - 1/(dImg/1000).
    var pMinRecipMm = pMin - 1000 / dImg;
    var farPointMm = pMinRecipMm > 0.005 ? 1000 / pMinRecipMm : 1e9;
    if (glassesOn) {
      var fpRecipM = 1 / (farPointMm / 1000) - glassesDiopters;
      if (fpRecipM > 0.005) farPointMm = (1 / fpRecipM) * 1000;
      else farPointMm = 1e9;
    }
    var farPointCm = farPointMm / 10;

    // ─── SVG render ───
    var W = 400, H = 240;
    // Eye position depends on condition (visualize the elongated/shortened eye)
    var eyeR = 70;
    var eyeRx = eyeR;
    var eyeRy = eyeR * 0.86;
    if (condition === 'myopia')    eyeRx = eyeR * 1.12;   // elongated front-to-back
    if (condition === 'hyperopia') eyeRx = eyeR * 0.88;   // shortened
    var eyeCx = 240;
    var eyeCy = 110;
    var lensX = eyeCx - eyeRx + 8;
    var retinaX = eyeCx + eyeRx - 4;
    // Lens thickness reflects required accommodation
    var lensThicknessNorm = Math.min(1.8, Math.max(0.55, (diopters - 40) / 12));
    var lensRy = 38;
    var lensRx = 12 * lensThicknessNorm;
    var objX = 30, objY = eyeCy;
    var objSize = Math.max(4, 26 - dObjCm * 0.4);
    // Glasses lens — sits 10 px in front of the eye
    var glassesX = eyeCx - eyeRx - 18;
    var glassesRx = Math.max(3, Math.min(10, Math.abs(glassesDiopters) * 1.4));
    var glassesIsDiverging = glassesDiopters < 0;
    // Predicted focal position WITHOUT glasses — to show whether rays land
    // in front of, on, or behind the retina.
    var unaidedF = (dObjMm * dImg) / (dObjMm + dImg);
    var unaidedDi;
    var unaidedPower = condition === 'myopia' ? pMin * (24.7 / dImg) : condition === 'hyperopia' ? pMin * (20.7 / dImg) : pMin;
    // Simpler: the relaxed eye's lens has f = 1/pMin (m), so what d_i would it produce?
    // 1/d_i = pMin - 1/(d_o/1000)   → d_i = 1000 / (pMin - 1000/d_o)
    var pMinDoTerm = pMin - 1000 / dObjMm;
    unaidedDi = pMinDoTerm > 0.005 ? 1000 / pMinDoTerm : 1e6;
    // Map dImg vs unaidedDi → focus position relative to retina
    // If unaidedDi > dImg, focus point is past the retina (hyperopia for distant objects).
    // If unaidedDi < dImg, focus point is short (myopia).
    var focusOffset = unaidedDi - dImg; // mm; >0 = past retina, <0 = short
    // Scale to pixels for visualization (clamp)
    var focusOffsetPx = Math.max(-20, Math.min(20, focusOffset * 0.6));
    var focusPx = retinaX + focusOffsetPx;
    // Show the unaided focus point if rays don't reach the retina cleanly
    var showFocusMarker = !canFocus || Math.abs(focusOffset) > 0.4;

    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H,
      style: { width: '100%', height: 'auto', background: '#0b1220', borderRadius: 8 },
      role: 'img',
      'aria-label': 'Eye anatomy simulator showing axial length, lens accommodation, and corrective lens effects for normal, myopic, and hyperopic eyes.' },
      // Sclera
      h('ellipse', { cx: eyeCx, cy: eyeCy, rx: eyeRx, ry: eyeRy, fill: '#fef9c3', stroke: '#cbd5e1', strokeWidth: 1.5 }),
      // Iris/pupil
      h('circle', { cx: eyeCx - eyeRx + 18, cy: eyeCy, r: 14, fill: '#7e22ce' }),
      h('circle', { cx: eyeCx - eyeRx + 18, cy: eyeCy, r: 6, fill: '#0f172a' }),
      // Eye lens (deformable)
      h('ellipse', { cx: lensX, cy: eyeCy, rx: lensRx, ry: lensRy, fill: 'rgba(125,211,252,0.4)', stroke: '#0ea5e9', strokeWidth: 1.5 }),
      // Retina (rear curve)
      h('path', { d: 'M ' + retinaX + ' ' + (eyeCy - 50) + ' Q ' + (retinaX + 14) + ' ' + eyeCy + ' ' + retinaX + ' ' + (eyeCy + 50),
        fill: 'none', stroke: '#fb7185', strokeWidth: 2.5 }),
      // Optional corrective glasses lens
      glassesOn && h('g', null,
        // Lens shape: biconvex for positive (hyperopia/presbyopia), biconcave for negative (myopia)
        glassesIsDiverging
          ? h('path', {
              d: 'M ' + glassesX + ' ' + (eyeCy - 32) +
                 ' Q ' + (glassesX + glassesRx * 0.5) + ' ' + eyeCy +
                 ' ' + glassesX + ' ' + (eyeCy + 32) +
                 ' L ' + (glassesX - 1) + ' ' + (eyeCy + 32) +
                 ' Q ' + (glassesX - glassesRx * 0.5) + ' ' + eyeCy +
                 ' ' + (glassesX - 1) + ' ' + (eyeCy - 32) + ' Z',
              fill: 'rgba(96,165,250,0.25)', stroke: '#3b82f6', strokeWidth: 1.4
            })
          : h('ellipse', { cx: glassesX, cy: eyeCy, rx: glassesRx, ry: 32,
              fill: 'rgba(96,165,250,0.25)', stroke: '#3b82f6', strokeWidth: 1.4 }),
        // Frame stem
        h('rect', { x: glassesX - 1.5, y: eyeCy - 35, width: 3, height: 70, fill: 'none' }),
        h('text', { x: glassesX, y: eyeCy + 48, fill: '#93c5fd', fontSize: 10,
          fontWeight: 700, textAnchor: 'middle' },
          (glassesDiopters > 0 ? '+' : '') + glassesDiopters.toFixed(1) + ' D')
      ),
      // Object dot
      h('circle', { cx: objX, cy: objY, r: objSize / 2, fill: '#22c55e', opacity: 0.9 }),
      h('text', { x: objX, y: objY + 18, fill: '#86efac', fontSize: 10, textAnchor: 'middle' }, dObjCm + ' cm'),
      // Ray traces
      canFocus
        ? h('g', { stroke: '#fbbf24', strokeWidth: 1.4, fill: 'none' },
            h('line', { x1: objX, y1: objY - objSize / 2, x2: lensX, y2: eyeCy - lensRy * 0.7 }),
            h('line', { x1: objX, y1: objY + objSize / 2, x2: lensX, y2: eyeCy + lensRy * 0.7 }),
            h('line', { x1: lensX, y1: eyeCy - lensRy * 0.7, x2: retinaX + 4, y2: eyeCy }),
            h('line', { x1: lensX, y1: eyeCy + lensRy * 0.7, x2: retinaX + 4, y2: eyeCy })
          )
        : h('g', { stroke: '#ef4444', strokeWidth: 1.4, fill: 'none', opacity: 0.75 },
            h('line', { x1: objX, y1: objY - objSize / 2, x2: lensX, y2: eyeCy - lensRy * 0.7 }),
            h('line', { x1: objX, y1: objY + objSize / 2, x2: lensX, y2: eyeCy + lensRy * 0.7 }),
            // Rays continue but don't converge at the retina
            h('line', { x1: lensX, y1: eyeCy - lensRy * 0.7, x2: focusPx, y2: eyeCy - 2 }),
            h('line', { x1: lensX, y1: eyeCy + lensRy * 0.7, x2: focusPx, y2: eyeCy + 2 }),
            // Diverging rays continue past focal point
            h('line', { x1: focusPx, y1: eyeCy - 2, x2: focusPx + 24, y2: eyeCy - 9, opacity: 0.5 }),
            h('line', { x1: focusPx, y1: eyeCy + 2, x2: focusPx + 24, y2: eyeCy + 9, opacity: 0.5 }),
            h('text', { x: retinaX + 8, y: eyeCy - 20, fill: '#ef4444', fontSize: 10, fontWeight: 800, stroke: 'none' }, 'BLURRY')
          ),
      // Focus marker (where rays actually converge without glasses, when not on retina)
      showFocusMarker && condition !== 'normal' && !glassesOn && h('g', null,
        h('circle', { cx: focusPx, cy: eyeCy, r: 3, fill: '#fbbf24', stroke: '#0b1220', strokeWidth: 1 }),
        h('text', { x: focusPx, y: eyeCy - 8, fill: '#fcd34d', fontSize: 9, textAnchor: 'middle' },
          focusOffset < 0 ? 'short' : 'past retina')
      ),
      // Animated photons traveling object → lens → retina (or focus point if blurry).
      // Two paths: upper edge and lower edge of the object, converging at retina/focus.
      // When glasses are on, the photons pass THROUGH the glasses lens midway so the
      // optical path visually includes the corrective element.
      (function() {
        var photons = [];
        var photonColor = canFocus ? '#fde047' : '#fca5a5';
        var endX, endY;
        if (canFocus) {
          endX = retinaX + 4; endY = eyeCy;
        } else {
          endX = focusPx; endY = eyeCy;
        }
        // Build the upper-ray and lower-ray paths.
        // With glasses, insert a waypoint at the glasses lens midline so the photon
        // is visibly "redirected" by the corrective lens.
        function buildPath(startY, midY) {
          var pts = [];
          pts.push('M ' + objX + ' ' + startY);
          if (glassesOn) {
            pts.push('L ' + glassesX + ' ' + (eyeCy + (startY - objY) * 0.3));
          }
          pts.push('L ' + lensX + ' ' + midY);
          pts.push('L ' + endX + ' ' + endY);
          return pts.join(' ');
        }
        var upperPath = buildPath(objY - objSize / 2, eyeCy - lensRy * 0.7);
        var lowerPath = buildPath(objY + objSize / 2, eyeCy + lensRy * 0.7);
        // Stagger 2 photons per path for a continuous "beam" feel
        [upperPath, lowerPath].forEach(function(p, pi) {
          [0, -1.1].forEach(function(delay, di) {
            photons.push(h('circle', {
              key: 'eyep' + pi + '_' + di, r: 2.8, fill: photonColor,
              stroke: '#fff', strokeWidth: 0.35,
              style: {
                offsetPath: 'path("' + p + '")',
                WebkitOffsetPath: 'path("' + p + '")',
                filter: 'drop-shadow(0 0 3px ' + photonColor + ')',
                animationDuration: '2.2s',
                animationDelay: delay + 's'
              },
              className: 'opticslab-photon',
              cx: 0, cy: 0
            }));
          });
        });
        return photons;
      })(),
      // Readouts (top-left)
      h('text', { x: 12, y: 16, fill: '#cbd5e1', fontSize: 11, fontWeight: 700 },
        'Eye power: ' + diopters.toFixed(1) + ' D · range ' + pMin.toFixed(0) + '–' + pMax.toFixed(0) + ' D'),
      h('text', { x: 12, y: 30, fill: '#94a3b8', fontSize: 10 },
        'Axial length: ' + dImg.toFixed(1) + ' mm' + (condition === 'normal' ? '' : ' (' + condition + ')')),
      h('text', { x: 12, y: H - 24, fill: '#86efac', fontSize: 10 },
        'Near point: ~' + (nearPointCm > 999 ? '∞' : nearPointCm.toFixed(0) + ' cm')),
      h('text', { x: 12, y: H - 10, fill: '#86efac', fontSize: 10 },
        'Far point: ~' + (farPointCm > 999 ? '∞' : farPointCm.toFixed(0) + ' cm'))
    );

    // ─── Controls ───
    var conditionLabels = {
      normal:    { label: '😀 Normal',      desc: 'Emmetropia — both near and far in focus' },
      myopia:    { label: '🔍 Nearsighted', desc: 'Eyeball too long — distant objects blur' },
      hyperopia: { label: '📏 Farsighted',  desc: 'Eyeball too short — near objects blur' }
    };
    var controls = h('div', { style: { marginTop: 10, display: 'grid', gap: 8 } },
      // Condition picker
      h('div', null,
        h('div', { style: { fontSize: 11, color: '#cbd5e1', fontWeight: 700, marginBottom: 4 } }, 'Eye condition'),
        h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
          Object.keys(conditionLabels).map(function(k) {
            var sel = condition === k;
            return h('button', { key: k,
              onClick: function() { upd('phenoEyeCondition', k); },
              'data-op-focusable': 'true',
              title: conditionLabels[k].desc,
              style: {
                padding: '5px 10px', fontSize: 11, fontWeight: 700,
                background: sel ? '#7c3aed' : 'rgba(124,58,237,0.10)',
                color: sel ? '#fff' : '#c4b5fd',
                border: '1px solid ' + (sel ? '#7c3aed' : 'rgba(124,58,237,0.40)'),
                borderRadius: 6, cursor: 'pointer'
              }
            }, conditionLabels[k].label);
          })
        )
      ),
      // Sliders
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
          'Object dist:',
          h('input', { type: 'range', min: 5, max: 600, step: 5, value: dObjCm,
            onChange: function(e) { upd('phenoEyeDist', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Object distance from eye',
            style: { flex: 1 } }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 44 } }, dObjCm + ' cm')
        ),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
          'Age:',
          h('input', { type: 'range', min: 8, max: 80, step: 1, value: ageYears,
            onChange: function(e) { upd('phenoEyeAge', parseFloat(e.target.value)); },
            'data-op-focusable': 'true', 'aria-label': 'Age in years',
            style: { flex: 1 } }),
          h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 32 } }, ageYears + ' y')
        )
      ),
      // Glasses toggle + diopter slider
      h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center' } },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1', cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: glassesOn,
            onChange: function(e) { upd('phenoEyeGlasses', e.target.checked); },
            'data-op-focusable': 'true' }),
          h('span', { style: { fontWeight: 700 } }, '👓 Glasses')
        ),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: glassesOn ? '#cbd5e1' : '#475569' } },
          'Power:',
          h('input', { type: 'range', min: -6, max: 6, step: 0.25, value: glassesDiopters,
            onChange: function(e) { upd('phenoEyeGlassesD', parseFloat(e.target.value)); },
            disabled: !glassesOn,
            'data-op-focusable': 'true', 'aria-label': 'Corrective lens power in diopters',
            style: { flex: 1, opacity: glassesOn ? 1 : 0.4 } }),
          h('span', { style: { fontFamily: 'monospace', color: glassesOn ? '#fbbf24' : '#475569', minWidth: 56 } },
            (glassesDiopters > 0 ? '+' : '') + glassesDiopters.toFixed(2) + ' D')
        )
      ),
      // Quick-fix button
      condition !== 'normal' && h('button', {
        onClick: function() {
          // Auto-prescribe: choose diopters so far point goes to infinity OR near point reaches 25 cm
          var rx;
          if (condition === 'myopia') {
            // Want far point at infinity: glasses move object from infinity to user's far point
            // 1/∞ + P_g = 1/d_far(no_glasses) (in m). For myopia, d_far(no_glasses) is finite.
            // So P_g = 1 / (d_far_no_glasses in m).
            // d_far_no_glasses in mm: 1000 / (pMin - 1000/dImg).
            var rawFar = pMin - 1000 / dImg > 0.005 ? 1000 / (pMin - 1000 / dImg) : 0;
            // P_g (negative) such that virtual image at infinity → object at d_far_no_glasses
            // 1/d_o + P_g = 1/d_far_no_glasses. As d_o → ∞, we want d_o' = d_far → P_g = 1/d_far
            // But d_far_no_glasses is the closest object the relaxed eye can resolve... wait.
            // Actually d_far is the FARTHEST. For myopia, far point < ∞ in mm.
            rx = rawFar > 100 ? -(1000 / rawFar) : -3;
          } else {
            // Hyperopia: prescribe so near point reaches 25 cm
            rx = +(1000 / 250 - (pMax - 1000 / dImg));
            rx = Math.max(0.5, Math.min(6, rx));
          }
          rx = Math.round(rx * 4) / 4; // snap to nearest 0.25 D
          upd('phenoEyeGlassesD', rx);
          upd('phenoEyeGlasses', true);
        },
        style: {
          padding: '5px 10px', fontSize: 10, fontWeight: 700,
          background: 'rgba(34,197,94,0.18)', color: '#86efac',
          border: '1px solid rgba(34,197,94,0.50)', borderRadius: 6, cursor: 'pointer',
          justifySelf: 'start'
        }
      }, '⚡ Auto-prescribe corrective lens')
    );

    // ─── Explanation panel ───
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } },
        condition === 'myopia' ? 'Myopia (nearsightedness)'
          : condition === 'hyperopia' ? 'Hyperopia (farsightedness)'
          : 'The normal accommodating eye'),
      // Condition-specific explanations
      condition === 'normal' && h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 8px' } },
        'The retina sits ~22.7 mm behind the lens. The ciliary muscle squeezes the lens fatter (shorter f) for nearby objects and lets it relax for distant ones — that\'s accommodation. The lens\'s diopter range covers near (~10 cm) to far (∞).'),
      condition === 'myopia' && h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 8px' } },
        'The eyeball is ~2 mm too long (24.7 mm here). Parallel rays from a distant object focus IN FRONT of the retina, so distant objects blur. Near objects can still focus on the retina because the lens has room to accommodate down. The far point is finite — try the slider.'),
      condition === 'hyperopia' && h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 8px' } },
        'The eyeball is ~2 mm too short (20.7 mm here). Even at full accommodation, the lens can\'t bend light enough — near objects focus BEHIND the retina. Reading is the first thing to go.'),

      // Glasses prescription explanation
      glassesOn && h('div', { style: { background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.40)', borderRadius: 6, padding: 8, margin: '6px 0' } },
        h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', marginBottom: 4 } },
          '👓 ' + (glassesIsDiverging ? 'Diverging' : 'Converging') + ' lens · ' + (glassesDiopters > 0 ? '+' : '') + glassesDiopters.toFixed(2) + ' D'),
        h('p', { style: { fontSize: 11, color: '#bfdbfe', margin: 0, lineHeight: 1.5 } },
          glassesIsDiverging
            ? 'The diverging lens makes distant objects appear nearer to the eye — within the myopic eye\'s focusing range. Power = 1/f (in metres).'
            : 'The converging lens pre-bends light so near objects appear farther than they are, easing the work the lens has to do. Reading glasses use the same principle.')
      ),

      // Universal physics summary
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, margin: '0 0 8px' } },
        h('strong', { style: { color: '#fbbf24' } }, 'Lens equation: '),
        '1/f = 1/d_o + 1/d_i. With the retina at a fixed d_i, the eye\'s f must change for every object distance. Glasses change the effective d_o the eye sees, letting a stiff or mis-sized eye work in a range it couldn\'t alone.'),

      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'Try: pick Nearsighted, then drag the object slider — watch the focus marker land in front of the retina. Then enable glasses and click Auto-prescribe.')
    );
    return _phLayout(h, svg, controls, explanation);
  }

  // ── Sunset / Rayleigh scattering ─────────────────────────────────
  function _renderPhSunset(d, upd, h) {
    // As the sun nears the horizon, sunlight travels through MORE atmosphere.
    // Rayleigh scattering ∝ 1/λ⁴ — strongly scatters short (blue) wavelengths.
    // At zenith (sun overhead), short path → only some blue scattered → sky looks blue.
    // At horizon, long path → most blue scattered out → only red wavelengths reach you → red sun.
    var sunAlt = d.phenoSunsetAlt != null ? d.phenoSunsetAlt : 30; // sun altitude angle (degrees above horizon)
    // Air mass (atmospheric path length factor) — secant approximation, capped for low angles
    var altRad = degToRad(Math.max(2, sunAlt));
    var airmass = Math.min(40, 1 / Math.sin(altRad));
    // Wavelengths to track
    var wavelengths = [
      { nm: 410, label: 'violet', color: '#7c3aed' },
      { nm: 470, label: 'blue',   color: '#3b82f6' },
      { nm: 530, label: 'green',  color: '#22c55e' },
      { nm: 580, label: 'yellow', color: '#facc15' },
      { nm: 620, label: 'orange', color: '#fb923c' },
      { nm: 680, label: 'red',    color: '#ef4444' }
    ];
    // Survival fraction = exp(-k · airmass · (550/λ)⁴) — Rayleigh scaling
    function survival(nm) {
      var ratio4 = Math.pow(550 / nm, 4);
      return Math.exp(-0.10 * airmass * ratio4);
    }
    var W = 380, H = 220;
    // Sky color = sum of all wavelengths the user does NOT see directly (i.e., what got scattered TO them)
    // Sun color = sum of what survives the path TO the sun
    var sumR = 0, sumG = 0, sumB = 0; // sun direct color
    var sctR = 0, sctG = 0, sctB = 0; // scattered (sky) color
    wavelengths.forEach(function(w) {
      var s = survival(w.nm);
      var rgb = w.color;
      var r = parseInt(rgb.slice(1,3),16), g = parseInt(rgb.slice(3,5),16), b = parseInt(rgb.slice(5,7),16);
      sumR += r * s; sumG += g * s; sumB += b * s;
      sctR += r * (1 - s); sctG += g * (1 - s); sctB += b * (1 - s);
    });
    function clamp255(v) { return Math.min(255, Math.max(0, Math.round(v / wavelengths.length * 1.6))); }
    var sunCol = 'rgb(' + clamp255(sumR) + ',' + clamp255(sumG) + ',' + clamp255(sumB) + ')';
    var skyCol = 'rgb(' + clamp255(sctR) + ',' + clamp255(sctG) + ',' + clamp255(sctB) + ')';
    // Sun position
    var sunX = 50 + 280 * Math.cos(degToRad(sunAlt));
    var sunY = H - 60 - 130 * Math.sin(degToRad(sunAlt));
    // Observer position (just above the horizon, looking up at the sun)
    var obsX = W / 2;
    var obsY = H - 36;
    // Build animated photon paths: each wavelength sends a photon from the
    // sun toward the observer. Short wavelengths (high scatter %) end early
    // at a random sky location → represents being scattered out.
    // Long wavelengths (low scatter %) make it all the way to the observer
    // → represents surviving the atmospheric path. The visual story is the
    // entire Rayleigh effect made watchable.
    var photonNodes = wavelengths.map(function(w, wi) {
      var s = survival(w.nm);
      // Photon "reaches the observer" probability tracks survival fraction.
      // For each wavelength, we draw TWO behaviors over time:
      //   (a) a survival photon that travels sun → observer
      //   (b) a scattered photon that hits a sky deflection point
      // Their visibilities depend on s: high s → mostly survival path;
      // low s → mostly scatter to random sky points.
      // Stagger emissions by wavelength index for a continuous "stream" feel.
      var dxObs = obsX - sunX, dyObs = obsY - sunY;
      var distObs = Math.sqrt(dxObs * dxObs + dyObs * dyObs);
      // Deflection point — somewhere along the path, pushed sideways.
      // Short wavelengths get deflected closer to the sun (early scatter);
      // long wavelengths would too if they scattered, but most survive.
      var deflectFrac = 0.25 + (1 - s) * 0.35; // closer to sun for high scatter
      var sideways = (wi % 2 === 0 ? 1 : -1) * (40 + wi * 12);
      var deflectX = sunX + dxObs * deflectFrac + sideways;
      var deflectY = sunY + dyObs * deflectFrac + 8;
      // Build paths
      var survivalPath = 'M ' + sunX + ' ' + sunY + ' L ' + obsX + ' ' + obsY;
      var scatterPath = 'M ' + sunX + ' ' + sunY + ' L ' + deflectX.toFixed(1) + ' ' + deflectY.toFixed(1);
      // Time-tuned durations: light still travels at c — we use the survival
      // path duration as the baseline so survivors all reach the observer
      // at the same visual cadence (~2.4s).
      var arr = [];
      // Survival photon (only visible if survival > 0.1 — otherwise it
      // never reaches the eye and would look weird)
      if (s > 0.1) {
        arr.push(h('circle', {
          key: 'sup' + wi, r: 2.4 + s * 1.2, fill: w.color,
          stroke: '#fff', strokeWidth: 0.3,
          style: {
            offsetPath: 'path("' + survivalPath + '")',
            WebkitOffsetPath: 'path("' + survivalPath + '")',
            filter: 'drop-shadow(0 0 4px ' + w.color + ')',
            animationDuration: '2.4s',
            animationDelay: (-wi * 0.35) + 's',
            opacity: 0.6 + s * 0.4  // brighter for high-survival
          },
          className: 'opticslab-photon',
          cx: 0, cy: 0
        }));
      }
      // Scatter photon (only if scattering is significant)
      var scatterRate = 1 - s;
      if (scatterRate > 0.2) {
        arr.push(h('circle', {
          key: 'scp' + wi, r: 2.2,
          fill: w.color, stroke: '#fff', strokeWidth: 0.2,
          style: {
            offsetPath: 'path("' + scatterPath + '")',
            WebkitOffsetPath: 'path("' + scatterPath + '")',
            filter: 'drop-shadow(0 0 3px ' + w.color + ')',
            animationDuration: '1.8s',
            animationDelay: (-wi * 0.28 + 0.4) + 's',
            opacity: 0.55 * scatterRate
          },
          className: 'opticslab-photon',
          cx: 0, cy: 0
        }));
        // Tiny pulse at the deflection point — "scattered HERE"
        arr.push(h('circle', {
          key: 'scd' + wi,
          cx: deflectX, cy: deflectY, r: 1.2,
          fill: 'none', stroke: w.color, strokeWidth: 0.8,
          opacity: 0.7,
          className: 'opticslab-wavefront',
          style: {
            animationDuration: '1.8s',
            animationDelay: (-wi * 0.28 + 1.2) + 's',
            transformOrigin: deflectX.toFixed(1) + 'px ' + deflectY.toFixed(1) + 'px'
          }
        }));
      }
      return arr;
    }).reduce(function(a, b) { return a.concat(b); }, []);

    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', height: 'auto', borderRadius: 8 },
      role: 'img', 'aria-label': 'Sunset Rayleigh scattering simulator. Sun altitude controls atmospheric path length and scattering of short wavelengths. Animated photons show short wavelengths scattering out (creating the blue sky) while long wavelengths survive to the observer (red sun).' },
      h('rect', { x: 0, y: 0, width: W, height: H - 30, fill: skyCol }),
      h('rect', { x: 0, y: H - 30, width: W, height: 30, fill: '#1e293b' }),
      // Sun (color reflects what survived the path)
      h('circle', { cx: sunX, cy: sunY, r: 20, fill: sunCol }),
      h('circle', { cx: sunX, cy: sunY, r: 26, fill: 'none', stroke: sunCol, strokeWidth: 1, opacity: 0.5 }),
      // Animated photons (drawn between sun and observer)
      photonNodes,
      // Observer marker — small silhouette at horizon center
      h('g', { 'aria-hidden': 'true' },
        h('circle', { cx: obsX, cy: obsY - 6, r: 3.5, fill: '#1f2937' }),
        h('rect', { x: obsX - 3, y: obsY - 4, width: 6, height: 9, fill: '#1f2937' }),
        h('text', { x: obsX, y: H - 5, fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' }, 'observer')
      ),
      // Path indicator
      h('text', { x: 12, y: 18, fill: '#0f172a', fontSize: 11, fontWeight: 700 }, 'Atmospheric path: ' + airmass.toFixed(1) + '× normal'),
      h('text', { x: 12, y: 32, fill: '#0f172a', fontSize: 10 }, 'Sun altitude: ' + sunAlt.toFixed(0) + '° above horizon')
    );
    // Per-wavelength survival bars
    var bars = wavelengths.map(function(w, i) {
      var s = survival(w.nm);
      return h('div', { key: w.nm, style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, marginBottom: 2 } },
        h('span', { style: { fontFamily: 'monospace', color: w.color, minWidth: 50, fontWeight: 700 } }, w.nm + ' nm'),
        h('div', { style: { flex: 1, background: '#0f172a', height: 8, borderRadius: 4, overflow: 'hidden' } },
          h('div', { style: { width: (s * 100).toFixed(0) + '%', height: '100%', background: w.color, transition: 'width 0.2s' } })
        ),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 36, textAlign: 'right' } }, (s * 100).toFixed(0) + '%')
      );
    });
    var controls = h('div', { style: { marginTop: 10 } },
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#cbd5e1' } },
        'Sun altitude:',
        h('input', { type: 'range', min: 1, max: 90, step: 1, value: sunAlt,
          onChange: function(e) { upd('phenoSunsetAlt', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Sun altitude above horizon',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 38 } }, sunAlt + '°')
      ),
      h('div', { style: { marginTop: 8, padding: 8, background: '#0f172a', borderRadius: 6 } },
        h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 } }, 'Wavelength survival through path'),
        bars
      )
    );
    var explanation = h('div', null,
      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Why sunsets are red and skies are blue'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'Air molecules scatter light proportional to 1/λ⁴ (Rayleigh\'s formula). Blue light (470 nm) scatters about 9× more strongly than red (680 nm) — a ratio of (680/470)⁴.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'When the sun is high, light traverses a short atmospheric path. Some blue is scattered (the sky), most other colors get through (white sun). At sunset, the path becomes 10-40× longer. Almost all the blue is scattered out before reaching you — only the long wavelengths (orange, red) survive the journey to your eye.'),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
        'The sky overhead during sunset stays blue because you\'re seeing scattered light from a different (still short) atmospheric path. The sun itself reddens because its DIRECT path is now long.'),
      h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
        'On Mars, dust scatters the OPPOSITE way (forward) — Martian sunsets are blue near the sun and reddish elsewhere. Same physics, different particle size.')
    );
    return _phLayout(h, svg, controls, explanation);
  }

  // ──────────────────────────────────────────────────────────────────
  // PRISM SPECTROMETER — Newton's classic experiment.
  // White light enters one face of a triangular prism, refracts twice
  // (entry + exit), and exits dispersed into a spectrum. Different
  // materials disperse different amounts because their index of
  // refraction varies with wavelength (Cauchy's empirical dispersion).
  // Unlike the rainbow (a single drop with internal reflection),
  // this is the pure two-refraction case — the textbook ray-trace.
  // ──────────────────────────────────────────────────────────────────
  function _renderPhPrism(d, upd, h) {
    // Wavelengths to trace (nm). The visible spectrum sample.
    var wavelengths = [
      { nm: 400, color: '#7c3aed', label: 'violet' },
      { nm: 440, color: '#4f46e5', label: 'indigo' },
      { nm: 480, color: '#2563eb', label: 'blue' },
      { nm: 520, color: '#06b6d4', label: 'cyan' },
      { nm: 555, color: '#22c55e', label: 'green' },
      { nm: 590, color: '#facc15', label: 'yellow' },
      { nm: 620, color: '#f97316', label: 'orange' },
      { nm: 680, color: '#ef4444', label: 'red' }
    ];
    // Cauchy's dispersion formula: n(λ) = A + B/λ² (λ in µm).
    // Coefficients per material — A,B chosen to reproduce textbook indices.
    var materials = {
      crown:   { label: 'Crown glass',  A: 1.500, B: 0.0042, color: '#bae6fd' },
      flint:   { label: 'Flint glass',  A: 1.600, B: 0.0080, color: '#a78bfa' },
      water:   { label: 'Water',        A: 1.324, B: 0.0032, color: '#67e8f9' },
      diamond: { label: 'Diamond',      A: 2.380, B: 0.0125, color: '#f0abfc' },
      acrylic: { label: 'Acrylic',      A: 1.486, B: 0.0034, color: '#c7d2fe' }
    };
    var matKey = d.phenoPrismMat || 'flint';
    var mat = materials[matKey] || materials.flint;
    var prismApex = d.phenoPrismApex != null ? d.phenoPrismApex : 60; // apex angle (°)
    var incidence = d.phenoPrismInc != null ? d.phenoPrismInc : 45;   // incidence angle on face 1 (°)

    // n(λ) for each wavelength
    function nAt(nm) {
      var um = nm / 1000;
      return mat.A + mat.B / (um * um);
    }

    // Build prism geometry. Equilateral-ish triangle pointing upward,
    // first face on the left (light hits this), second face on the right.
    var W = 460, H = 320;
    var apexRad = degToRad(prismApex);
    var halfBase = 80; // half of base width in px
    var apexX = W / 2, apexY = 60;
    // Base height = halfBase / tan(apex/2)
    var baseY = apexY + halfBase / Math.tan(apexRad / 2);
    var leftBaseX = apexX - halfBase;
    var rightBaseX = apexX + halfBase;
    // Face-1 (left) normal points up-left (perpendicular to face). Face-2 (right) normal points up-right.
    // Face-1 angle (relative to horizontal, going up to apex): atan2(apexY - baseY, apexX - leftBaseX)
    var face1AngleRad = Math.atan2(apexY - baseY, apexX - leftBaseX); // negative (going up-right)
    // Normal to face-1 points outward (away from prism interior). Rotate face-1 direction by -90°.
    var face1NormalRad = face1AngleRad - Math.PI / 2;

    // Incoming ray: hits left face at midpoint, angle of incidence relative to normal = `incidence`
    var entryX = (apexX + leftBaseX) / 2;
    var entryY = (apexY + baseY) / 2;
    // Inbound ray direction (toward entry point), at `incidence` degrees from face normal.
    // The inbound ray approaches FROM the side the normal points to (outside the prism).
    var incRad = degToRad(incidence);
    var inboundDirRad = face1NormalRad + Math.PI + incRad; // pointing INTO prism, angle from outside
    // Trace one ray for each wavelength
    var rayElements = [];
    var deviations = []; // store final exit angle for explanation panel
    wavelengths.forEach(function(wl, idx) {
      var n = nAt(wl.nm);
      // Snell at face 1: sin(i) = n · sin(r)  →  r = asin(sin(i)/n)
      var refr1Rad = Math.asin(Math.min(0.99, Math.sin(incRad) / n));
      // Direction INSIDE the prism: turn the refracted ray relative to the face-1 normal (pointing into prism)
      // face1NormalInward = face1NormalRad + π
      var face1NormInwardRad = face1NormalRad + Math.PI;
      // The refracted ray sits at refr1Rad from the inward normal, on the same side as the original incidence.
      var insideDirRad = face1NormInwardRad - refr1Rad; // small tweak: angle direction
      // March the ray through the prism until it hits face 2.
      // Face 2 endpoints: apex (apexX, apexY) to right base (rightBaseX, baseY).
      // Line-segment intersection
      var rayStartX = entryX, rayStartY = entryY;
      var rayDX = Math.cos(insideDirRad), rayDY = Math.sin(insideDirRad);
      // Face-2 segment
      var f2x1 = apexX, f2y1 = apexY, f2x2 = rightBaseX, f2y2 = baseY;
      // Solve rayStart + t·rayDir = f2x1 + s·(f2x2-f2x1, f2y2-f2y1)
      var denom = rayDX * (f2y2 - f2y1) - rayDY * (f2x2 - f2x1);
      if (Math.abs(denom) < 1e-6) return; // parallel — skip
      var tHit = ((f2x1 - rayStartX) * (f2y2 - f2y1) - (f2y1 - rayStartY) * (f2x2 - f2x1)) / denom;
      var sHit = ((f2x1 - rayStartX) * rayDY - (f2y1 - rayStartY) * rayDX) / denom;
      if (tHit <= 0 || sHit < 0 || sHit > 1) return;
      var hitX = rayStartX + tHit * rayDX;
      var hitY = rayStartY + tHit * rayDY;
      // Face-2 normal: outward, away from prism interior
      var face2AngleRad = Math.atan2(f2y2 - f2y1, f2x2 - f2x1);
      var face2NormalRad = face2AngleRad - Math.PI / 2;
      // Angle of incidence on face-2 (inside the prism) = angle between ray and inward normal
      var face2NormInwardRad = face2NormalRad + Math.PI;
      // Angle between ray direction and inward normal:
      var rDirNormX = Math.cos(face2NormInwardRad), rDirNormY = Math.sin(face2NormInwardRad);
      var dot = rayDX * rDirNormX + rayDY * rDirNormY;
      var incInsideRad = Math.acos(Math.max(-1, Math.min(1, -dot))); // angle between -ray and outward normal
      // Snell at face 2 (n → 1): n · sin(i_inside) = sin(t)  →  t = asin(n · sin(i_inside))
      var sinExit = n * Math.sin(incInsideRad);
      if (sinExit >= 0.999) {
        // Total internal reflection — for our prism angles this only happens in diamond
        // at extreme inc. Draw a reflected ray inside instead.
        rayElements.push(h('line', { key: 'tir' + idx,
          x1: rayStartX, y1: rayStartY, x2: hitX, y2: hitY,
          stroke: wl.color, strokeWidth: 1.5, opacity: 0.65 }));
        rayElements.push(h('text', { key: 'tirL' + idx, x: hitX + 6, y: hitY,
          fill: '#ef4444', fontSize: 9, fontWeight: 'bold' }, 'TIR'));
        return;
      }
      var exitAngleRad = Math.asin(sinExit);
      // Outbound direction is `exitAngleRad` from the outward normal, on the opposite side
      // from the incoming inside ray relative to the normal.
      // Cross product of inside-ray with outward-normal tells us which side.
      var cross = rayDX * Math.cos(face2NormalRad + Math.PI / 2) + rayDY * Math.sin(face2NormalRad + Math.PI / 2);
      var sideSign = cross >= 0 ? 1 : -1;
      var outDirRad = face2NormalRad + sideSign * exitAngleRad;
      var outEndX = hitX + Math.cos(outDirRad) * 200;
      var outEndY = hitY + Math.sin(outDirRad) * 200;
      // Total deviation angle (textbook D): angle between original inbound and outbound
      var inboundOppositeRad = inboundDirRad + Math.PI;
      var deviationRad = Math.atan2(
        Math.sin(outDirRad - inboundOppositeRad),
        Math.cos(outDirRad - inboundOppositeRad)
      );
      deviations.push({ nm: wl.nm, label: wl.label, n: n, devDeg: Math.abs(deviationRad * 180 / Math.PI) });
      // Draw refracted ray inside the prism + exit ray + tiny dot at exit
      rayElements.push(h('line', { key: 'in' + idx,
        x1: rayStartX, y1: rayStartY, x2: hitX, y2: hitY,
        stroke: wl.color, strokeWidth: 1.2, opacity: 0.85 }));
      rayElements.push(h('line', { key: 'out' + idx,
        x1: hitX, y1: hitY, x2: outEndX, y2: outEndY,
        stroke: wl.color, strokeWidth: 1.6, opacity: 0.95 }));
      // Animated colored photon flowing entry → exit point → into the spectrum.
      // Each wavelength gets its own dot at its native color — the rainbow
      // literally forms in real-time as students watch.
      var prismPath = 'M ' + entryX.toFixed(1) + ' ' + entryY.toFixed(1) +
                      ' L ' + hitX.toFixed(1) + ' ' + hitY.toFixed(1) +
                      ' L ' + outEndX.toFixed(1) + ' ' + outEndY.toFixed(1);
      // Stagger by wavelength so red leads, violet follows — light-show feel
      var photonDelay = (-idx * 0.18).toFixed(2);
      rayElements.push(h('circle', {
        key: 'photon' + idx, r: 3, fill: wl.color,
        stroke: '#fff', strokeWidth: 0.4,
        style: {
          offsetPath: 'path("' + prismPath + '")',
          WebkitOffsetPath: 'path("' + prismPath + '")',
          filter: 'drop-shadow(0 0 4px ' + wl.color + ')',
          animationDuration: '3.2s',
          animationDelay: photonDelay + 's'
        },
        className: 'opticslab-photon',
        cx: 0, cy: 0
      }));
    });
    // Incoming white-light ray (one bright white line going to the entry point)
    var inLen = 120;
    var inStartX = entryX - Math.cos(inboundDirRad) * inLen;
    var inStartY = entryY - Math.sin(inboundDirRad) * inLen;

    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H,
      style: { width: '100%', height: 'auto', background: '#0b1220', borderRadius: 8 },
      role: 'img', 'aria-label': 'Prism spectrometer. White light entering the prism is dispersed into a spectrum because the index of refraction varies with wavelength.' },
      // Subtle grid
      h('rect', { x: 0, y: 0, width: W, height: H, fill: '#0b1220' }),
      // Prism body (translucent)
      h('polygon', {
        points: apexX + ',' + apexY + ' ' + rightBaseX + ',' + baseY + ' ' + leftBaseX + ',' + baseY,
        fill: mat.color, opacity: 0.18, stroke: mat.color, strokeWidth: 1.4
      }),
      // Incoming white light beam
      h('line', { x1: inStartX, y1: inStartY, x2: entryX, y2: entryY,
        stroke: '#fff', strokeWidth: 3, opacity: 0.92 }),
      h('text', { x: inStartX - 60, y: inStartY - 4, fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }, 'white light →'),
      // Wavelength rays (inside + exit)
      rayElements,
      // Material label inside the prism
      h('text', { x: apexX, y: baseY + 16, fill: '#cbd5e1', fontSize: 10,
        fontWeight: 700, textAnchor: 'middle' }, mat.label),
      // Angle readouts
      h('text', { x: 10, y: 16, fill: '#cbd5e1', fontSize: 11, fontWeight: 700 },
        'Apex: ' + prismApex + '° · Incidence: ' + incidence + '°')
    );

    var controls = h('div', { style: { marginTop: 10, display: 'grid', gap: 10 } },
      // Material picker
      h('div', null,
        h('div', { style: { fontSize: 11, color: '#cbd5e1', fontWeight: 700, marginBottom: 4 } }, 'Prism material'),
        h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
          Object.keys(materials).map(function(k) {
            var sel = k === matKey;
            return h('button', { key: k,
              onClick: function() { upd('phenoPrismMat', k); },
              'data-op-focusable': 'true',
              style: {
                padding: '5px 10px', fontSize: 11, fontWeight: 700,
                background: sel ? '#1e40af' : 'rgba(99,102,241,0.10)',
                color: sel ? '#dbeafe' : '#a5b4fc',
                border: '1px solid ' + (sel ? '#3b82f6' : 'rgba(99,102,241,0.40)'),
                borderRadius: 6, cursor: 'pointer'
              }
            }, materials[k].label);
          })
        )
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
        'Apex angle:',
        h('input', { type: 'range', min: 30, max: 80, step: 1, value: prismApex,
          onChange: function(e) { upd('phenoPrismApex', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Prism apex angle in degrees',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 36 } }, prismApex + '°')
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
        'Incidence:',
        h('input', { type: 'range', min: 10, max: 70, step: 1, value: incidence,
          onChange: function(e) { upd('phenoPrismInc', parseFloat(e.target.value)); },
          'data-op-focusable': 'true', 'aria-label': 'Angle of incidence on the first face',
          style: { flex: 1 } }),
        h('span', { style: { fontFamily: 'monospace', color: '#fbbf24', minWidth: 36 } }, incidence + '°')
      )
    );

    // Deviation table — visual evidence that n(λ) varies
    var devRows = deviations.length > 0
      ? deviations.map(function(dev) {
          return h('tr', { key: 'd' + dev.nm },
            h('td', { style: { padding: '2px 6px', color: '#cbd5e1', fontSize: 10 } }, dev.label + ' (' + dev.nm + ' nm)'),
            h('td', { style: { padding: '2px 6px', color: '#fbbf24', fontSize: 10, fontFamily: 'monospace' } }, 'n = ' + dev.n.toFixed(4)),
            h('td', { style: { padding: '2px 6px', color: '#86efac', fontSize: 10, fontFamily: 'monospace' } }, 'D = ' + dev.devDeg.toFixed(2) + '°')
          );
        })
      : [h('tr', { key: 'none' }, h('td', { style: { fontSize: 10, color: '#94a3b8' }, colSpan: 3 }, 'Adjust apex/incidence so rays exit the prism.'))];

    var explanation = h('div', null,
      h('h4', { style: { color: '#c4b5fd', margin: '0 0 6px', fontSize: 13, fontWeight: 800 } }, 'Newton\'s prism — pure dispersion'),
      h('p', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' } },
        'White light is a mix of wavelengths. Each wavelength sees a slightly different index of refraction in the glass, so each bends a slightly different amount. Two refractions later (entry + exit face), the colors fan out into a visible spectrum.'),
      h('p', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' } },
        h('strong', { style: { color: '#fbbf24' } }, 'Cauchy\'s formula: '), 'n(λ) = A + B/λ². The constants A, B come from fitting laboratory measurements — every material has its own pair. Flint glass has a bigger B than crown glass, so flint disperses more strongly. Diamond\'s very large A makes it sparkle ("fire") even more than its high refractive index alone would suggest.'),
      h('p', { style: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, margin: '0 0 8px' } },
        h('strong', { style: { color: '#fbbf24' } }, 'Why this matters: '), 'every refracting telescope, microscope, and pair of glasses you have ever looked through fights chromatic aberration — that\'s the dispersion you see here. Achromatic doublets use a flint + crown lens together so the dispersions partly cancel.'),
      h('div', { style: { background: 'rgba(15,23,42,0.6)', borderRadius: 6, padding: 8, marginTop: 6 } },
        h('div', { style: { fontSize: 11, fontWeight: 700, color: '#a5b4fc', marginBottom: 4 } }, 'Per-wavelength index + deviation'),
        h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
          h('tbody', null, devRows)
        )
      )
    );
    return _phLayout(h, svg, controls, explanation);
  }

  // ──────────────────────────────────────────────────────────────────
  // QUANTUM TWIST — single-photon accumulator on the classical fringe.
  // Lives inside the Interference tab. Pedagogically, this is the move
  // that makes wave-particle duality visceral: each photon is a discrete
  // event, but the SHAPE the events build up to is the wave-interference
  // intensity profile. AP Physics 2 doesn't formally cover this, but it's
  // the single most striking optics demo and it earns its keep.
  // ──────────────────────────────────────────────────────────────────
  function _renderPhQuantumTwist(d, upd, h) {
    var W = 460, H = 200;
    var dots = d.phenoQuantumDots || [];
    var count = d.phenoQuantumCount || 0;
    var playing = !!d.phenoQuantumPlaying;
    var rate = d.phenoQuantumRate || 'slow'; // slow | fast
    // Intensity profile (cos² fringes across the screen) — 5 visible bright fringes
    function intensityAt(x) {
      var phase = (x / W - 0.5) * 8 * Math.PI; // 4 full cycles → 5 bright + 4 dark
      var c = Math.cos(phase);
      return c * c;
    }
    function fireOne() {
      // Rejection sampling: pick uniform x, accept with probability proportional
      // to intensity. Each accepted x gets a random y so dots scatter vertically.
      for (var t = 0; t < 30; t++) {
        var x = Math.random() * W;
        if (Math.random() < intensityAt(x)) {
          return { x: x, y: 14 + Math.random() * (H - 28) };
        }
      }
      // Fallback (very unlikely): center
      return { x: W / 2, y: H / 2 };
    }
    // Auto-fire scheduling (mirrors after-image timer pattern)
    if (playing && typeof setTimeout === 'function') {
      var perTick = rate === 'fast' ? 12 : 1;
      setTimeout(function() {
        var fresh = [];
        for (var i = 0; i < perTick; i++) fresh.push(fireOne());
        var combined = dots.concat(fresh);
        // Cap at 1500 dots for SVG-render perf — beyond this the pattern is
        // already saturated visually and the marginal photon adds no info.
        if (combined.length > 1500) combined = combined.slice(-1500);
        upd({ phenoQuantumDots: combined, phenoQuantumCount: count + perTick });
      }, rate === 'fast' ? 50 : 120);
    }
    // Render dots as small SVG circles. 1500 circles is borderline but works.
    var dotEls = dots.map(function(p, i) {
      return h('circle', { key: i, cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 1.5, fill: '#fbbf24' });
    });
    // Faint reference: the underlying intensity envelope (so students see what
    // shape the dots are converging toward). Drawn as a low-opacity polyline.
    var envPoints = [];
    for (var ex = 0; ex <= W; ex += 4) {
      var I = intensityAt(ex);
      envPoints.push(ex + ',' + (H - 6 - I * (H - 30)));
    }
    var envelope = h('polyline', { points: envPoints.join(' '), fill: 'none', stroke: '#06b6d4', strokeWidth: 1, opacity: 0.25, strokeDasharray: '2 3' });
    var svg = h('svg', { viewBox: '0 0 ' + W + ' ' + H, style: { width: '100%', height: 'auto', background: '#020617', borderRadius: 8, display: 'block' },
      role: 'img', 'aria-label': 'Quantum interference demo. Photons fired one at a time appear as random-looking dots, but accumulate into the same fringe pattern as the classical wave model. Total photons: ' + count + '.' },
      // Backdrop tinted bands showing the bright-fringe regions
      [0,1,2,3,4].map(function(i) {
        var cxF = W / 2 + (i - 2) * (W / 5);
        return h('rect', { key: 'band' + i, x: cxF - 18, y: 0, width: 36, height: H, fill: 'rgba(56,189,248,0.06)' });
      }),
      envelope,
      dotEls,
      // Photon counter (top-right)
      h('rect', { x: W - 110, y: 6, width: 100, height: 22, fill: 'rgba(15,23,42,0.85)', rx: 4 }),
      h('text', { x: W - 60, y: 21, fill: '#fbbf24', fontSize: 12, fontFamily: 'monospace', fontWeight: 800, textAnchor: 'middle' }, count + ' photons'),
      // Empty-state hint
      count === 0 && h('text', { x: W / 2, y: H / 2, fill: '#94a3b8', fontSize: 12, textAnchor: 'middle', fontStyle: 'italic' }, 'Press Fire to send a single photon →')
    );
    var controls = h('div', { style: { marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('button', {
        onClick: function() {
          var d1 = fireOne();
          var combined = dots.concat([d1]);
          if (combined.length > 1500) combined = combined.slice(-1500);
          upd({ phenoQuantumDots: combined, phenoQuantumCount: count + 1 });
        },
        disabled: playing,
        'data-op-focusable': 'true',
        style: { padding: '6px 14px', background: playing ? '#475569' : '#7e22ce', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: playing ? 'default' : 'pointer' }
      }, '⚛ Fire one photon'),
      h('button', {
        onClick: function() { upd({ phenoQuantumPlaying: !playing }); },
        'data-op-focusable': 'true',
        style: { padding: '6px 14px', background: playing ? '#dc2626' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }
      }, playing ? '⏸ Pause' : '▶ Auto-fire'),
      playing && h('div', { style: { display: 'flex', gap: 4 } },
        h('button', {
          onClick: function() { upd('phenoQuantumRate', 'slow'); },
          'data-op-focusable': 'true',
          style: { padding: '4px 8px', background: rate === 'slow' ? '#7e22ce' : 'rgba(168,85,247,0.20)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }
        }, 'slow'),
        h('button', {
          onClick: function() { upd('phenoQuantumRate', 'fast'); },
          'data-op-focusable': 'true',
          style: { padding: '4px 8px', background: rate === 'fast' ? '#7e22ce' : 'rgba(168,85,247,0.20)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer' }
        }, 'fast')
      ),
      h('button', {
        onClick: function() { upd({ phenoQuantumDots: [], phenoQuantumCount: 0, phenoQuantumPlaying: false }); },
        'data-op-focusable': 'true',
        style: { padding: '6px 14px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }
      }, '↺ Reset')
    );
    return h('div', {
      style: {
        marginTop: 16,
        background: 'linear-gradient(135deg, rgba(126,34,206,0.10) 0%, rgba(15,23,42,0.6) 100%)',
        border: '1px solid rgba(168,85,247,0.45)',
        borderLeft: '4px solid #a855f7',
        borderRadius: 10, padding: '12px 14px'
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
        h('h3', { style: { color: '#c4b5fd', fontSize: 16, fontWeight: 900, margin: 0 } }, '🌌 Quantum twist — fire one photon at a time'),
        h('span', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'beyond AP — but it earns its keep')
      ),
      h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 10px' } },
        'The classical sim above shows what happens with a continuous beam. But what if you dim the source until photons leave the laser ONE AT A TIME, with seconds between them? Each photon should "obviously" go through one slit and land somewhere predictable. Press Fire one at a time, then auto-fire — and watch what your eye is convinced couldn\'t happen.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(340px,1fr) minmax(240px,1fr)', gap: 12 } },
        h('div', { style: { background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 10, padding: 12 } }, svg, controls),
        h('div', { style: { background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.30)', borderRadius: 10, padding: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 } }, 'Why this is weird'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
            'A single photon is indivisible — it can\'t literally split and go through both slits at once. Yet the pattern that builds up over thousands of single-photon events is the SAME interference pattern you get from a continuous wave. Each photon "knows" the geometry of both slits.'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
            'The standard interpretation: a photon\'s position before detection is described by a probability amplitude (a wave). The wave passes through both slits, interferes with itself, and the probability of detection at any point is |amplitude|². Random individually; deterministic in the long run.'),
          h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55, margin: '0 0 8px' } },
            'Add a "which-path" detector at the slits — and the interference pattern vanishes. Measurement collapses the amplitude to a single path. This is the famous quantum measurement problem: observation changes the outcome.'),
          h('p', { style: { fontSize: 11, color: '#86efac', fontStyle: 'italic', margin: 0 } },
            'Real experiments: Tonomura 1989 (single electrons, same result). Modern reproductions with single photons, neutrons, even C₆₀ buckyballs. The biggest object yet to show single-particle interference: a 25,000-atom organic molecule (Vienna, 2019).')
        )
      )
    );
  }

  // Expose pure physics functions for reuse + testing
  window.AlloOptics = {
    thinLens: thinLens, snell: snell, criticalAngle: criticalAngle,
    doubleSlitFringe: doubleSlitFringe, singleSlitFirstMin: singleSlitFirstMin,
    singleSlitIntensity: singleSlitIntensity, doubleSlitIntensity: doubleSlitIntensity,
    malus: malus, wavelengthToRGB: wavelengthToRGB, COMMON_N: COMMON_N
  };
  console.log('[StemLab] stem_tool_optics.js Phase 1 loaded (Reflection + Refraction)');
})();
