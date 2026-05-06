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
          if (mt === 'plane') {
            // Plane mirror: single ray from object tip to mirror at random angle, reflected
            return [
              h('line', { key: 'r1', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(0), stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '0' }),
              h('line', { key: 'r2', x1: sx(0), y1: sy(0), x2: sx(-objX), y2: sy(hObj), stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.7 }),
              // Virtual image (behind mirror, dotted)
              h('line', { key: 'rv', x1: sx(objX), y1: sy(hObj), x2: sx(-objX), y2: sy(hObj), stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.5 })
            ];
          }
          // Curved mirror — 3 principal rays from object tip
          var children = [];
          var imgY = (hImg == null) ? 0 : hImg;
          var imgIsValid = imgX != null && _isNum(imgX) && _isNum(imgY);
          // Ray 1: parallel to axis from object tip → hits mirror at (0, hObj) → reflects through F
          children.push(h('line', { key: 'r1a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(hObj), stroke: '#10b981', strokeWidth: 1.5 }));
          if (imgIsValid && d_i > 0) {
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(imgX), y2: sy(imgY), stroke: '#10b981', strokeWidth: 1.5 }));
          } else if (imgIsValid && d_i < 0) {
            // Virtual: reflect away from F, dotted extension behind mirror to virtual image
            // The reflected ray, when extended backward, passes through the virtual image
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(cmMax), y2: sy(hObj + (cmMax / Math.abs(f)) * hObj), stroke: '#10b981', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r1c', x1: sx(0), y1: sy(hObj), x2: sx(imgX), y2: sy(imgY), stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }));
          }
          // Ray 2: through F → reflects parallel
          if (mt === 'concave' && d_o > Math.abs(f)) {
            // Object beyond F → ray from tip through F to mirror, then parallel out
            // Slope from tip (objX, hObj) through F (-f, 0)
            var slope2 = (0 - hObj) / (-f - objX);
            var yAtMirror = hObj + slope2 * (0 - objX);
            children.push(h('line', { key: 'r2a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(yAtMirror), stroke: '#06b6d4', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r2b', x1: sx(0), y1: sy(yAtMirror), x2: sx(cmMax), y2: sy(yAtMirror), stroke: '#06b6d4', strokeWidth: 1.5 }));
          }
          // Ray 3: through C (center of curvature, at -2f) → reflects back along itself
          if (mt === 'concave') {
            var slope3 = (0 - hObj) / (-2 * f - objX);
            var yAtMir3 = hObj + slope3 * (0 - objX);
            children.push(h('line', { key: 'r3a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(yAtMir3), stroke: '#a855f7', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r3b', x1: sx(0), y1: sy(yAtMir3), x2: sx(objX), y2: sy(hObj), stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '0' }));
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
          // Ray 1 — parallel to axis from tip → hits lens at (0, hObj) → bends through F' (right focus, at +fAbs)
          children.push(h('line', { key: 'r1a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(hObj), stroke: '#10b981', strokeWidth: 1.5 }));
          if (lt === 'converging') {
            // Goes through F' on the right. From (0, hObj) toward (fAbs, 0) and beyond.
            // Compute extension point at right edge
            var slope1 = (0 - hObj) / (fAbs - 0);
            var rightX = cmMax;
            var rightY = hObj + slope1 * (rightX - 0);
            children.push(h('line', { key: 'r1b', x1: sx(0), y1: sy(hObj), x2: sx(rightX), y2: sy(rightY), stroke: '#10b981', strokeWidth: 1.5 }));
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
          }
          // Ray 2 — through center of lens, undeviated
          var slope2 = (0 - hObj) / (0 - objX);
          var rx2 = cmMax;
          var ry2 = hObj + slope2 * (rx2 - objX);
          children.push(h('line', { key: 'r2', x1: sx(objX), y1: sy(hObj), x2: sx(rx2), y2: sy(ry2), stroke: '#06b6d4', strokeWidth: 1.5 }));
          // Ray 3 — through near focal point F (left, at -fAbs) emerges parallel to axis (converging only)
          if (lt === 'converging' && d_o > fAbs) {
            // Slope from (objX, hObj) through (-fAbs, 0)
            var slope3 = (0 - hObj) / (-fAbs - objX);
            var yAtLens = hObj + slope3 * (0 - objX);
            children.push(h('line', { key: 'r3a', x1: sx(objX), y1: sy(hObj), x2: sx(0), y2: sy(yAtLens), stroke: '#a855f7', strokeWidth: 1.5 }));
            children.push(h('line', { key: 'r3b', x1: sx(0), y1: sy(yAtLens), x2: sx(cmMax), y2: sy(yAtLens), stroke: '#a855f7', strokeWidth: 1.5 }));
          }
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
        // Wavefront semi-circles emanating from each slit (decorative — 4 arcs each)
        (function() {
          var arcs = [];
          for (var k = 1; k <= 4; k++) {
            var rPx = 18 + k * 25;
            arcs.push(h('path', { key: 'wt' + k, d: 'M ' + (barX + 6) + ',' + (slitTopY - rPx) + ' A ' + rPx + ' ' + rPx + ' 0 0 1 ' + (barX + 6) + ' ' + (slitTopY + rPx), fill: 'none', stroke: color, strokeWidth: 0.6, opacity: 0.30 }));
            arcs.push(h('path', { key: 'wb' + k, d: 'M ' + (barX + 6) + ',' + (slitBotY - rPx) + ' A ' + rPx + ' ' + rPx + ' 0 0 1 ' + (barX + 6) + ' ' + (slitBotY + rPx), fill: 'none', stroke: color, strokeWidth: 0.6, opacity: 0.30 }));
          }
          return arcs;
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
        polarizerDisk(disk1X, 0, 'P₁', afterP1),
        h('rect', { x: disk1X + diskR, y: midY - 6, width: disk2X - diskR - (disk1X + diskR), height: 12, fill: '#fef3c7', opacity: afterP1 * 0.6 + 0.05 }),
        polarizerDisk(disk2X, theta2, 'P₂', afterP2),
        useP3 ? [
          h('rect', { key: 'beam23', x: disk2X + diskR, y: midY - 6, width: disk3X - diskR - (disk2X + diskR), height: 12, fill: '#fef3c7', opacity: afterP2 * 0.6 + 0.05 }),
          polarizerDisk(disk3X, theta3, 'P₃', afterP3),
          h('rect', { key: 'beamout', x: disk3X + diskR, y: midY - 6, width: W - pad.r - (disk3X + diskR), height: 12, fill: '#fef3c7', opacity: afterP3 * 0.6 + 0.05 })
        ] : [
          h('rect', { key: 'beamout2', x: disk2X + diskR, y: midY - 6, width: W - pad.r - (disk2X + diskR), height: 12, fill: '#fef3c7', opacity: afterP2 * 0.6 + 0.05 })
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
      explain: 'Visible light: ~400 nm (violet) to ~700 nm (red). Below 400 nm = UV; above 700 nm = IR. Memorize this for AP.' }
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
            { id: 'sleuth', label: '🕵️ Sleuth', desc: 'Predict image from setup' },
            { id: 'quiz', label: '📝 Quiz', desc: 'AP exam practice' }
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
          calc: _renderInterferenceCalc(d, upd, h)
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
        d.mode === 'sleuth' && _renderSleuthPanel(d, upd, h, addToast),
        d.mode === 'quiz' && _renderQuizPanel(d, upd, h, addToast, awardXP)
      );
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // HOME PANEL — welcome + sample problem library + topic shortcuts
  // ──────────────────────────────────────────────────────────────────
  function _renderHome(d, upd, h) {
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
  function _renderQuizPanel(d, upd, h, addToast, awardXP) {
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
            for (var qi = 0; qi < d.quizQuestions.length; qi++) {
              if (ans[qi] === d.quizQuestions[qi].correct) correct++;
            }
            upd({ quizSubmitted: true, quizCorrect: correct, quizCompletedCount: (d.quizCompletedCount || 0) + 1 });
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
      'reflection':   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', hint: 'Mirrors flip the path. Predict where the image lands before running the sim.' },
      'refraction':   { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  hint: "Light slows in denser media. Snell's law: n\u2081 sin\u03B8\u2081 = n\u2082 sin\u03B8\u2082." },
      'lenses':       { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', hint: 'Same equation as a mirror, different sign convention. Real vs virtual depends on object distance.' },
      'interference': { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', hint: 'Two slits: bright fringes where path difference equals an integer number of wavelengths.' },
      'diffraction':  { accent: '#ef4444', soft: 'rgba(239,68,68,0.10)',  hint: 'Light bends around edges. The narrower the slit relative to \u03BB, the more spread.' },
      'polarization': { accent: '#10b981', soft: 'rgba(16,185,129,0.10)', hint: "Malus's law: I = I\u2080 cos\u00B2\u03B8. Two crossed polarizers: total extinction." }
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
      // Pedagogical layers
      _renderMisconceptionsPanel(tab, h),
      _renderGlossaryPanel(tab, d, upd, h),
      _renderAiGrader(tab, d, upd, h, opts.addToast, opts.awardXP, opts.callGemini)
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
