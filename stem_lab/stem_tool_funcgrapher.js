// ═══════════════════════════════════════════
// stem_tool_funcgrapher.js — Function Grapher Plugin
// Standalone plugin extracted from stem_tool_math.js
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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _funcgrAC = null;
  function getFuncgrAC() { if (!_funcgrAC) { try { _funcgrAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_funcgrAC && _funcgrAC.state === "suspended") { try { _funcgrAC.resume(); } catch(e) {} } return _funcgrAC; }
  function funcgrTone(f,d,tp,v) { var ac = getFuncgrAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxFuncgrClick() { funcgrTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-funcgrapher')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-funcgrapher';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();



  function fgTruncatedIntegral(power, epsilon) {
    power=Number(power);epsilon=Number(epsilon);
    if([.5,1,2].indexOf(power)===-1||!Number.isFinite(epsilon)||epsilon<=0||epsilon>=1)return {ok:false};
    var area=power===1?-Math.log(epsilon):(1-Math.pow(epsilon,1-power))/(1-power);
    return {ok:true,power:power,epsilon:epsilon,area:area,formula:power===.5?'2(1 − √ε)':power===1?'−ln(ε)':'1/ε − 1',limit:power===.5?'2':'unbounded'};
  }
  window.__alloImproperIntegral={truncate:fgTruncatedIntegral};

  // ═══ 📈 Function Grapher ═══
  window.StemLab.registerTool('funcGrapher', {
    icon: '📈',
    label: 'Function Grapher',
    desc: 'Graph and explore mathematical functions interactively',
    color: 'indigo',
    category: 'math',
    questHooks: [
      { id: 'try_5_families', label: 'Explore 5 function families', icon: '📈', check: function(d) { return Object.keys(d.familiesTried || {}).length >= 5; }, progress: function(d) { return Object.keys(d.familiesTried || {}).length + '/5 families'; } },
      { id: 'challenge_5', label: 'Answer 5 challenges correctly', icon: '🎯', check: function(d) { return (d.fgScore || 0) >= 5; }, progress: function(d) { return (d.fgScore || 0) + '/5 correct'; } },
      { id: 'myth_3', label: 'Bust 3 function myths (True or False)', icon: '🧠', check: function(d) { return (d.fgMythsDone || 0) >= 3; }, progress: function(d) { return (d.fgMythsDone || 0) + '/3 myths'; } },
      { id: 'use_overlays', label: 'Reveal the derivative and area overlays', icon: '📉', check: function(d) { var o = d.overlaysUsed || {}; return !!(o.deriv && o.area); }, progress: function(d) { var o = d.overlaysUsed || {}; return ((o.deriv ? 1 : 0) + (o.area ? 1 : 0)) + '/2 overlays'; } }
    ],
    render: function(ctx) {
      // The view row, the preset heading and the legend sit on the HOST
      // surface - white in light and dark, pure BLACK in the contrast theme,
      // where each measured 2.77:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? " text-white" : "";
      // Aliases — maps ctx properties to original variable names
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
      var t = ctx.t;
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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

      // ── Tool body (funcGrapher) ──
      return (function() {
          // State initialization guard — ensure funcGrapher state exists
          if (!labToolData || !labToolData.funcGrapher) {
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { funcGrapher: {
                type: 'linear', a: 1, b: 0, c: 0,
                showDeriv: false, showArea: false,
                traceX: 0, showTable: false, showLearn: false,
                compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0,
                aiExplain: '', aiExplainLoading: false
              }});
            });
            // This transient state owns a stable AA pair because dark theme tokens
            // can otherwise resolve to light ink over the host's white tool card.
            return React.createElement('div', { className: 'p-8 text-center', style: { color: '#475569', backgroundColor: '#ffffff' } }, 'Loading...');
          }

          const d = labToolData.funcGrapher;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('funcGrapher', 'init', {
              first: 'Function Grapher loaded. Plot mathematical functions, explore transformations, and visualize equations on an interactive coordinate plane.',
              repeat: 'Function Grapher active.',
              terse: 'Grapher.'
            }, { debounce: 800 });
          }

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, funcGrapher: { ...prev.funcGrapher, [key]: val } }));

          // ── Theme + grade band (shared pattern with waterCycle) ──
          var isContrast = !!ctx.isContrast;
          var isDark = !!ctx.isDark || isContrast;
          var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
          function getGradeBand() {
            var ov = d.fgGradeOverride;
            if (ov && GRADE_BANDS.indexOf(ov) >= 0) return ov;
            var gl = String(gradeLevel || '5th Grade').toLowerCase();
            if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
            if (/3rd|4th|5th/.test(gl)) return '3-5';
            if (/6th|7th|8th/.test(gl)) return '6-8';
            if (/9th|10|11|12|high/.test(gl)) return '9-12';
            return '3-5';
          }
          var gradeBand = getGradeBand();

          // Type setter that also feeds the try_5_families quest hook
          function setFnType(tid) {
            upd('type', tid);
            upd('familiesTried', Object.assign({}, d.familiesTried, { [tid]: true }));
          }

          const W = 440, H = 320, pad = 45;

          const rawRange = d.range || {};
          const finiteBound = (key, fallback) => Number.isFinite(rawRange[key]) ? rawRange[key] : fallback;
          let xMin = finiteBound('xMin', -10), xMax = finiteBound('xMax', 10);
          let yMin = finiteBound('yMin', -10), yMax = finiteBound('yMax', 10);
          if (!(xMax > xMin)) { xMin = -10; xMax = 10; }
          if (!(yMax > yMin)) { yMin = -10; yMax = 10; }

          const xR = { xMin: xMin, xMax: xMax };

          const yR = { yMin: yMin, yMax: yMax };

          const toSX = x => pad + ((x - xR.xMin) / (xR.xMax - xR.xMin)) * (W - 2 * pad);

          const toSY = y => (H - pad) - ((y - yR.yMin) / (yR.yMax - yR.yMin)) * (H - 2 * pad);

          // ── Comparison function evaluator ──
          const evalF2 = d.compare ? function(x) {
            // typeof check, not ||: a2 = 0 must eval as 0 so the curve matches its printed equation
            var ct = d.compareType || 'linear', ca = (typeof d.compareA === 'number' ? d.compareA : 1), cb = d.compareB || 0, cc = d.compareC || 0;
            if (ct === 'linear') return ca * x + cb;
            if (ct === 'quadratic') return ca * x * x + cb * x + cc;
            if (ct === 'trig') return ca * Math.sin(cb * x + cc);
            if (ct === 'cubic') return ca * x * x * x + cb * x + cc;
            if (ct === 'exponential') return ca * Math.pow(Math.E, cb * x) + cc;
            if (ct === 'absolute') return ca * Math.abs(x + cb) + cc;
            if (ct === 'sqrt') return ca * Math.sqrt(x + cb) + cc;
            if (ct === 'log') return ca * Math.log(x + cb) + cc;
            if (ct === 'rational') return ca / (x + cb) + cc;
            return ca * x + cb;
          } : null;



          // Evaluate functions

          const evalF = x => {

            if (d.type === 'linear') return d.a * x + d.b;

            if (d.type === 'quadratic') return d.a * x * x + d.b * x + d.c;

            if (d.type === 'trig') return d.a * Math.sin(d.b * x + d.c);

            if (d.type === 'cubic') return d.a * x * x * x + d.b * x + d.c;

            if (d.type === 'exponential') return d.a * Math.pow(Math.E, d.b * x) + d.c;

            if (d.type === 'absolute') return d.a * Math.abs(x + d.b) + d.c;

            if (d.type === 'sqrt') return d.a * Math.sqrt(x + d.b) + d.c;   // domain x ≥ −b; NaN outside (auto-skipped)

            if (d.type === 'log') return d.a * Math.log(x + d.b) + d.c;     // natural log; domain x > −b

            if (d.type === 'rational') return d.a / (x + d.b) + d.c;        // vertical asymptote at x = −b

            return d.a * x + d.b;

          };

          // Analytic derivatives for the supported function families

          const evalDeriv = x => {
            if(!Number.isFinite(evalF(x)))return NaN;
            if(d.type==='quadratic')return 2*d.a*x+d.b;
            if(d.type==='cubic')return 3*d.a*x*x+d.b;
            if(d.type==='trig')return d.a*d.b*Math.cos(d.b*x+d.c);
            if(d.type==='exponential')return d.a*d.b*Math.exp(d.b*x);
            if(d.type==='absolute')return x+d.b===0?(d.a===0?0:NaN):d.a*Math.sign(x+d.b);
            if(d.type==='sqrt')return x+d.b>0?d.a/(2*Math.sqrt(x+d.b)):NaN;
            if(d.type==='log')return d.a/(x+d.b);
            if(d.type==='rational')return -d.a/((x+d.b)*(x+d.b));
            return d.a;
          };

          // Tangent line at trace point
          var traceCandidate = Number.isFinite(d.traceX) ? d.traceX : Math.max(xR.xMin, Math.min(xR.xMax, 0));
          var traceX = Math.max(xR.xMin, Math.min(xR.xMax, traceCandidate));
          var traceY = evalF(traceX);
          var traceSlope = evalDeriv(traceX);
          var tangentInRange = Number.isFinite(traceSlope) && traceY >= yR.yMin && traceY <= yR.yMax;



          // Generate curve points

          // Curve as break-aware SEGMENTS: any invalid/out-of-range sample ends the current
          // segment so a discontinuity (e.g. a rational's vertical asymptote, or a domain edge of
          // sqrt/log) does NOT draw a spurious connecting line. Each segment renders as its own polyline.
          const segments = [];
          var curSeg = null;

          // The derivative and comparison overlays need the same break-awareness as the
          // main curve: a rational's asymptote (or a domain edge) must END the segment,
          // not get bridged by a spurious connecting line.
          const derivSegs = [];
          var curDSeg = null;

          const areaPts = [];

          const compareSegs = [];
          var curCSeg = null;

          for (var px = 0; px <= W - 2 * pad; px += 2) {

            var x = xR.xMin + (px / (W - 2 * pad)) * (xR.xMax - xR.xMin);

            var y = evalF(x);

            var dy = evalDeriv(x);

            if (isFinite(y) && y >= yR.yMin && y <= yR.yMax) { if (!curSeg) { curSeg = []; segments.push(curSeg); } curSeg.push(toSX(x) + ',' + toSY(y)); } else { curSeg = null; }

            if (isFinite(dy) && dy >= yR.yMin && dy <= yR.yMax) { if (!curDSeg) { curDSeg = []; derivSegs.push(curDSeg); } curDSeg.push(toSX(x) + ',' + toSY(dy)); } else { curDSeg = null; }

            if (d.showArea && y >= yR.yMin && y <= yR.yMax && x >= 0) areaPts.push({ sx: toSX(x), sy: toSY(y) });

            if (evalF2) { var y2c = evalF2(x); if (isFinite(y2c) && y2c >= yR.yMin && y2c <= yR.yMax) { if (!curCSeg) { curCSeg = []; compareSegs.push(curCSeg); } curCSeg.push(toSX(x) + ',' + toSY(y2c)); } else { curCSeg = null; } }

          }



          // Find roots (where f(x) ≈ 0)

          var roots = [];

          for (var rx = xR.xMin; rx < xR.xMax; rx += 0.05) {

            var y1 = evalF(rx), y2 = evalF(rx + 0.05);

            if (y1 * y2 <= 0) {

              var rootX = rx - y1 * (0.05) / (y2 - y1);

              // A sign flip across a vertical asymptote (e.g. 1/x at x = 0) is NOT a root:
              // f is huge there, not zero. And when a sample lands exactly on a root, both
              // adjacent intervals report it — keep only the first.
              if (rootX >= xR.xMin && rootX <= xR.xMax && Math.abs(evalF(rootX)) < 0.5 && !(roots.length && Math.abs(rootX - roots[roots.length - 1]) < 0.01)) roots.push(rootX);

            }

          }

          // Critical points (extrema): where f'(x) changes sign — local max/min
          var critPts = [];
          for (var cx2 = xR.xMin; cx2 < xR.xMax; cx2 += 0.05) {
            var d1 = evalDeriv(cx2), d2 = evalDeriv(cx2 + 0.05);
            if (d1 * d2 < 0) {
              var cpX = cx2 - d1 * 0.05 / (d2 - d1);
              var cpY = evalF(cpX);
              if (cpY >= yR.yMin && cpY <= yR.yMax && cpX >= xR.xMin && cpX <= xR.xMax) {
                critPts.push({ x: cpX, y: cpY, kind: d1 > 0 ? 'max' : 'min' });
              }
            }
          }

          // Numerical integral of f from 0 to xR.xMax (trapezoidal) — shown when Area is on
          var integral0ToMax = 0;
          var integralDefined = xR.xMax >= 0;
          var integralReason = xR.xMax < 0 ? __alloT('stem.funcgrapher.integral_nonnegative_endpoint','Choose a right endpoint at or above 0 for this overlay.') : '';
          if (d.showArea && xR.xMax > 0) {
            // A rational's asymptote inside [0, xMax] makes the integral improper and
            // divergent — no finite number is honest there.
            if (d.type === 'rational' && (-d.b) >= 0 && (-d.b) <= xR.xMax) {integralDefined = false;integralReason=d.a===0?__alloT('stem.funcgrapher.integral_undefined_point','The expression is undefined at a point in this interval.'):__alloT('stem.funcgrapher.integral_pole','The integral diverges at the vertical asymptote.');}
            if((d.type==='sqrt'&&d.b<0)||(d.type==='log'&&d.b<=0)){integralDefined=false;integralReason=__alloT('stem.funcgrapher.integral_domain_limit','The interval includes values outside the real domain or an endpoint requiring an improper-integral calculation.');}
            var iSteps = 200, iLo = 0, iHi = xR.xMax;
            var iH = (iHi - iLo) / iSteps;
            for (var ii = 0; ii < iSteps; ii++) {
              var xa = iLo + ii * iH, xb = xa + iH;
              var fa = evalF(xa), fb = evalF(xb);
              if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
                if (integralDefined) integralReason = __alloT('stem.funcgrapher.integral_numeric_range','A sampled value is outside the numerical range. Try a smaller interval or coefficients.');
                integralDefined = false; break;
              }
              integral0ToMax += (fa + fb) * iH / 2;
            }
            if (!Number.isFinite(integral0ToMax)) { integralDefined = false; integralReason = __alloT('stem.funcgrapher.integral_numeric_range','A sampled value is outside the numerical range. Try a smaller interval or coefficients.'); }
          }



          // Y-intercept

          var yIntercept = evalF(0);



          // Build equation string (clean formatting — suppress ×1, +0, etc.)
          function fmtCoeff(val, varPart, isFirst) {
            if (val === 0) return '';
            var s = '';
            if (isFirst) {
              if (val === -1 && varPart) s = '-';
              else if (val === 1 && varPart) s = '';
              else s = '' + val;
            } else {
              if (val < 0) {
                if (val === -1 && varPart) s = ' - ';
                else s = ' - ' + Math.abs(val);
              } else {
                if (val === 1 && varPart) s = ' + ';
                else s = ' + ' + val;
              }
            }
            return s + varPart;
          }
          function fmtConst(val, isFirst) {
            if (val === 0) return '';
            if (isFirst) return '' + val;
            return val < 0 ? ' - ' + Math.abs(val) : ' + ' + val;
          }

          var eqStr = 'f(x) = ';
          if (d.type === 'linear') {
            var parts = fmtCoeff(d.a, 'x', true) + fmtConst(d.b, d.a === 0);
            eqStr += parts || '0';
          } else if (d.type === 'quadratic') {
            var parts = fmtCoeff(d.a, 'x\u00B2', true) + fmtCoeff(d.b, 'x', d.a === 0) + fmtConst(d.c, d.a === 0 && d.b === 0);
            eqStr += parts || '0';
          } else if (d.type === 'trig') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var freq = d.b === 1 ? 'x' : d.b === -1 ? '-x' : d.b + 'x';
            var phase = d.c === 0 ? '' : d.c > 0 ? ' + ' + d.c : ' - ' + Math.abs(d.c);
            eqStr += amp + 'sin(' + freq + phase + ')';
          } else if (d.type === 'cubic') {
            var parts = fmtCoeff(d.a, 'x\u00B3', true) + fmtCoeff(d.b, 'x', d.a === 0) + fmtConst(d.c, d.a === 0 && d.b === 0);
            eqStr += parts || '0';
          } else if (d.type === 'exponential') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var exp = d.b === 1 ? 'x' : d.b === -1 ? '-x' : d.b + 'x';
            eqStr += amp + 'e^(' + exp + ')' + fmtConst(d.c, false);
          } else if (d.type === 'absolute') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += amp + '|' + inner + '|' + fmtConst(d.c, false);
          } else if (d.type === 'sqrt') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += amp + '√(' + inner + ')' + fmtConst(d.c, false);
          } else if (d.type === 'log') {
            var amp = d.a === 1 ? '' : d.a === -1 ? '-' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += amp + 'ln(' + inner + ')' + fmtConst(d.c, false);
          } else if (d.type === 'rational') {
            var num = d.a === -1 ? '-1' : '' + d.a;
            var inner = d.b === 0 ? 'x' : d.b > 0 ? 'x + ' + d.b : 'x - ' + Math.abs(d.b);
            eqStr += num + '/(' + inner + ')' + fmtConst(d.c, false);
          }

          // Build comparison equation string
          var eqStr2 = '';
          if (d.compare) {
            var ca = (typeof d.compareA === 'number' ? d.compareA : 1), cb = d.compareB || 0, cc = d.compareC || 0, ct = d.compareType || 'linear';
            eqStr2 = 'g(x) = ';
            if (ct === 'linear') { var p = fmtCoeff(ca, 'x', true) + fmtConst(cb, ca === 0); eqStr2 += p || '0'; }
            else if (ct === 'quadratic') { var p = fmtCoeff(ca, 'x\u00B2', true) + fmtCoeff(cb, 'x', ca === 0) + fmtConst(cc, ca === 0 && cb === 0); eqStr2 += p || '0'; }
            else if (ct === 'trig') { eqStr2 += (ca === 1 ? '' : ca === -1 ? '-' : ca) + 'sin(' + (cb === 1 ? 'x' : cb + 'x') + (cc === 0 ? '' : cc > 0 ? ' + ' + cc : ' - ' + Math.abs(cc)) + ')'; }
            else if (ct === 'cubic') { var p = fmtCoeff(ca, 'x\u00B3', true) + fmtCoeff(cb, 'x', ca === 0) + fmtConst(cc, ca === 0 && cb === 0); eqStr2 += p || '0'; }
            else if (ct === 'exponential') { eqStr2 += (ca === 1 ? '' : ca) + 'e^(' + (cb === 1 ? 'x' : cb + 'x') + ')' + fmtConst(cc, false); }
            else if (ct === 'absolute') { eqStr2 += (ca === 1 ? '' : ca) + '|' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + '|' + fmtConst(cc, false); }
            else if (ct === 'sqrt') { eqStr2 += (ca === 1 ? '' : ca === -1 ? '-' : ca) + '√(' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + ')' + fmtConst(cc, false); }
            else if (ct === 'log') { eqStr2 += (ca === 1 ? '' : ca === -1 ? '-' : ca) + 'ln(' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + ')' + fmtConst(cc, false); }
            else if (ct === 'rational') { eqStr2 += (ca === -1 ? '-1' : ca) + '/(' + (cb === 0 ? 'x' : cb > 0 ? 'x + ' + cb : 'x - ' + Math.abs(cb)) + ')' + fmtConst(cc, false); }
          }

          // ── Transformation labels ──
          var transformLabels = [];
          if (d.a !== 1 && d.a !== 0) {
            if (d.a === -1) transformLabels.push({ text: __alloT('stem.funcgrapher.reflected_over_x_axis', 'Reflected over x-axis'), color: 'text-rose-700 bg-rose-50 border-rose-200' });
            else if (d.a < 0) transformLabels.push({ text: 'Reflected & scaled \u00D7' + Math.abs(d.a), color: 'text-rose-700 bg-rose-50 border-rose-200' });
            else if (Math.abs(d.a) > 1) transformLabels.push({ text: 'Vertical stretch \u00D7' + d.a, color: 'text-violet-600 bg-violet-50 border-violet-200' });
            else transformLabels.push({ text: 'Vertical compression \u00D7' + d.a, color: 'text-violet-600 bg-violet-50 border-violet-200' });
          }
          if (d.type === 'trig' && d.b !== 0 && d.b !== 1) {
            transformLabels.push({ text: 'Period = 2\u03C0/' + Math.abs(d.b).toFixed(1), color: 'text-sky-700 bg-sky-50 border-sky-200' });
          }
          if (d.type === 'linear' && d.a !== 0) {
            transformLabels.push({ text: 'Slope = ' + d.a, color: 'text-blue-600 bg-blue-50 border-blue-200' });
          }
          if (d.c !== 0 && d.type !== 'linear') {
            transformLabels.push({ text: 'Shifted ' + (d.c > 0 ? 'up' : 'down') + ' ' + Math.abs(d.c) + ' units', color: 'text-teal-700 bg-teal-50 border-teal-200' });
          }
          if (d.b !== 0 && d.type === 'linear') {
            transformLabels.push({ text: 'y-intercept = ' + d.b, color: 'text-green-700 bg-green-50 border-green-200' });
          }
          // Key-feature chips for the function families (domain restrictions + asymptotes + vertex)
          if (d.type === 'quadratic' && d.a !== 0) {
            transformLabels.push({ text: 'Vertex at x = ' + (-d.b / (2 * d.a)).toFixed(2), color: 'text-indigo-600 bg-indigo-50 border-indigo-200' });
          }
          if (d.type === 'sqrt') {
            transformLabels.push({ text: 'Domain: x ≥ ' + (-d.b), color: 'text-amber-800 bg-amber-50 border-amber-200' });
          }
          if (d.type === 'log') {
            transformLabels.push({ text: 'Domain: x > ' + (-d.b) + ' · asymptote x = ' + (-d.b), color: 'text-amber-800 bg-amber-50 border-amber-200' });
          }
          if (d.type === 'rational') {
            transformLabels.push({ text: 'Vertical asymptote: x = ' + (-d.b), color: 'text-rose-700 bg-rose-50 border-rose-200' });
            transformLabels.push({ text: 'Horizontal asymptote: y = ' + d.c, color: 'text-rose-700 bg-rose-50 border-rose-200' });
          }



          // Function type presets

          var TYPES = [

            { id: 'linear', label: t('stem.func_grapher.linear'), emoji: '\u2571' },

            { id: 'quadratic', label: t('stem.func_grapher.quadratic'), emoji: '\u2229' },

            { id: 'cubic', label: t('stem.func_grapher.cubic'), emoji: '\u223F' },

            { id: 'trig', label: t('stem.func_grapher.trig'), emoji: '\u223C' },

            { id: 'exponential', label: t('stem.func_grapher.exponential'), emoji: '\uD83D\uDCC8' },

            { id: 'absolute', label: t('stem.func_grapher.absolute'), emoji: '\u22C0' },

            { id: 'sqrt', label: __alloT('stem.funcgrapher.square_root', 'Square Root'), emoji: '\u221A' },

            { id: 'log', label: __alloT('stem.funcgrapher.logarithm', 'Logarithm'), emoji: 'ln' },

            { id: 'rational', label: __alloT('stem.funcgrapher.rational', 'Rational'), emoji: '\u00F7' }

          ];

          var activeType = TYPES.filter(function(tp) { return tp.id === d.type; })[0] || TYPES[0];
          var familiesTriedCount = Object.keys(d.familiesTried || {}).length;
          var evidenceCount = roots.length + (yIntercept >= yR.yMin && yIntercept <= yR.yMax ? 1 : 0) + critPts.length;
          var overlayCount = (d.showDeriv ? 1 : 0) + (d.showArea ? 1 : 0) + (d.showTable ? 1 : 0);
          var nextMove = familiesTriedCount < 2
            ? 'Compare a second function family and notice what stays the same.'
            : overlayCount === 0
              ? 'Turn on the table or derivative to connect the graph to numerical evidence.'
              : 'Move the trace point and explain how the value and slope change together.';



          // ── Keyboard shortcuts (WCAG 2.1.1): 1-6 pick function type, D/A/T/L toggle overlays ──
          function onFgKey(e) {
            var tgt = e.target || {};
            var tn = (tgt.tagName || '').toUpperCase();
            if (tn === 'INPUT' || tn === 'TEXTAREA' || tn === 'SELECT' || tgt.isContentEditable) return;
            var k = e.key;
            if (k >= '1' && k <= '9') {
              var idx = parseInt(k, 10) - 1;
              if (TYPES[idx]) {
                e.preventDefault();
                setFnType(TYPES[idx].id);
                if (typeof announceToSR === 'function') announceToSR(TYPES[idx].label + ' selected.');
              }
            } else if (k === 'd' || k === 'D') { e.preventDefault(); upd('showDeriv', !d.showDeriv); }
            else if (k === 'a' || k === 'A') { e.preventDefault(); upd('showArea', !d.showArea); }
            else if (k === 't' || k === 'T') { e.preventDefault(); upd('showTable', !d.showTable); }
            else if (k === 'l' || k === 'L') { e.preventDefault(); upd('showLearn', !d.showLearn); }
          }
          return React.createElement("div", {
              className: "max-w-5xl mx-auto animate-in fade-in duration-200",
              role: "region",
              "aria-label": __alloT('stem.funcgrapher.function_grapher_keyboard_shortcuts_1_', "Function Grapher. Keyboard shortcuts: 1 through 9 pick a function type, D derivative, A area, T table, L learn."),
              tabIndex: 0,
              onKeyDown: onFgKey
            },

            React.createElement("section", { "data-funcgrapher-command": "true", className: "mb-4 overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 text-white shadow-xl" },
              React.createElement("div", { className: "p-4 sm:p-5" },
                React.createElement("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between" },
                  React.createElement("div", { className: "min-w-0" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("button", { onClick: () => setStemLabTool(null), className: "shrink-0 rounded-lg border border-white/20 bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300", 'aria-label': __alloT('stem.funcgrapher.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
                      React.createElement("span", { className: "rounded-full bg-cyan-300/15 px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-cyan-200/30" }, "Graph exploration console")
                    ),
                    React.createElement("h2", { className: "mt-3 text-xl font-black tracking-tight sm:text-2xl" }, __alloT('stem.funcgrapher.function_grapher', "\uD83D\uDCC8 Function Grapher")),
                    React.createElement("p", { className: "mt-1 max-w-2xl text-sm leading-6 text-indigo-100" }, "Change a rule, observe its shape, then use values and rates to explain the pattern."),
                    React.createElement("div", { className: "mt-3 rounded-xl border border-white/15 bg-white/10 p-3" },
                      React.createElement("p", { className: "text-[0.625rem] font-black uppercase tracking-[0.16em] text-cyan-200" }, "Recommended next move"),
                      React.createElement("p", { className: "mt-1 text-sm font-semibold text-white" }, nextMove)
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2 lg:w-[22rem]" },
                    [
                      { label: 'Family', value: activeType.emoji + ' ' + activeType.label },
                      { label: 'Evidence', value: String(evidenceCount) },
                      { label: 'Tools on', value: String(overlayCount) }
                    ].map(function(metric) {
                      return React.createElement("div", { key: metric.label, className: "min-w-0 rounded-xl border border-white/15 bg-white/10 px-2 py-3 text-center" },
                        React.createElement("div", { className: "truncate text-sm font-black text-white", title: metric.value }, metric.value),
                        React.createElement("div", { className: "mt-1 text-[0.625rem] leading-snug font-bold uppercase tracking-wider text-indigo-200" }, metric.label)
                      );
                    })
                  )
                ),
                React.createElement("ol", { className: "mt-4 grid gap-2 text-xs sm:grid-cols-3", "aria-label": __alloT('stem.funcgrapher.a11y_function_investigation_pathway', 'Function investigation pathway') },
                  [
                    { n: '1', title: 'Choose', detail: 'Pick a function family.' },
                    { n: '2', title: 'Transform', detail: 'Adjust coefficients and trace.' },
                    { n: '3', title: 'Explain', detail: 'Use intercepts, slope, or a table.' }
                  ].map(function(step) {
                    return React.createElement("li", { key: step.n, className: "flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 p-2.5" },
                      React.createElement("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300 font-black text-slate-950" }, step.n),
                      React.createElement("span", null, React.createElement("strong", { className: "block text-white" }, step.title), React.createElement("span", { className: "text-indigo-200" }, step.detail))
                    );
                  })
                )
              )
            ),

            // Function type buttons

            React.createElement("div", { className: "mb-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" },
              React.createElement("p", { className: "mb-2 px-1 text-[0.625rem] font-black uppercase tracking-[0.16em] text-slate-500" }, "Choose a function family"),
              React.createElement("div", { className: "grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5", role: "group", "aria-label": __alloT('stem.funcgrapher.a11y_function_families', 'Function families') },
                TYPES.map(function(tp) { return React.createElement("button", { key: tp.id, onClick: function() { setFnType(tp.id); },
                  className: "min-h-[2.5rem] min-w-0 whitespace-normal break-words px-2 py-2 rounded-lg text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 " + (d.type === tp.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-indigo-50')
                }, tp.emoji + " " + tp.label); })
              )
            ),

            // SVG Graph

            React.createElement("svg", { role: "img", "aria-label": __alloT('stem.funcgrapher.a11y_function_graph_showing_the_configured_curve', 'Function graph showing the configured curve'), viewBox: "0 0 " + W + " " + H, className: "w-full rounded-xl border-2 shadow-sm " + (isDark ? "bg-slate-900 border-indigo-800" : "bg-white border-indigo-200"), style: { maxHeight: "340px" } },

              // Grid lines (rendered first, behind curves)

              (function () {

                var gridLines = [];

                var xStep = (xR.xMax - xR.xMin) <= 10 ? 1 : (xR.xMax - xR.xMin) <= 30 ? 5 : 10;

                for (var gx = Math.ceil(xR.xMin / xStep) * xStep; gx <= xR.xMax; gx += xStep) {

                  var sx = toSX(gx);

                  if (sx > pad && sx < W - pad) {

                    gridLines.push(React.createElement("line", { key: 'gx' + gx, x1: sx, y1: pad, x2: sx, y2: H - pad, stroke: isDark ? "#1e293b" : "#e2e8f0", strokeWidth: 0.5 }));

                  }

                }

                var yStep = (yR.yMax - yR.yMin) <= 10 ? 1 : (yR.yMax - yR.yMin) <= 30 ? 5 : 10;

                for (var gy = Math.ceil(yR.yMin / yStep) * yStep; gy <= yR.yMax; gy += yStep) {

                  var sy = toSY(gy);

                  if (sy > pad && sy < H - pad) {

                    gridLines.push(React.createElement("line", { key: 'gy' + gy, x1: pad, y1: sy, x2: W - pad, y2: sy, stroke: isDark ? "#1e293b" : "#e2e8f0", strokeWidth: 0.5 }));

                  }

                }

                return gridLines;

              })(),

              // Axes

              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: isDark ? "#94a3b8" : "#64748b", strokeWidth: 1.5 }),

              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: isDark ? "#94a3b8" : "#64748b", strokeWidth: 1.5 }),

              // Axis labels

              React.createElement("text", { x: W - pad + 5, y: toSY(0) + 4, fill: isDark ? "#94a3b8" : "#64748b", style: { fontSize: '10px', fontWeight: 'bold' } }, "x"),

              React.createElement("text", { x: toSX(0) + 5, y: pad - 5, fill: isDark ? "#94a3b8" : "#64748b", style: { fontSize: '10px', fontWeight: 'bold' } }, "y"),

              // Area under curve (positive x)

              d.showArea && integralDefined && areaPts.length > 1 && React.createElement("polygon", {
                "data-function-area": true,
                points: toSX(0) + ',' + toSY(0) + ' ' + areaPts.map(p => p.sx + ',' + p.sy).join(' ') + ' ' + areaPts[areaPts.length - 1].sx + ',' + toSY(0),

                fill: isDark ? "rgba(129,140,248,0.16)" : "rgba(79,70,229,0.08)", stroke: "none"

              }),

              // Derivative trace

              d.showDeriv && derivSegs.map(function (seg, si) { return seg.length > 1 ? React.createElement("polyline", { key: 'dseg' + si, points: seg.join(" "), fill: "none", stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "6 3" }) : null; }),

              // Main curve

              d.type === 'rational' && (-d.b) > xR.xMin && (-d.b) < xR.xMax && React.createElement("line", { x1: toSX(-d.b), y1: pad, x2: toSX(-d.b), y2: H - pad, stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "5 4", "aria-label": "vertical asymptote at x = " + (-d.b) }),
              segments.map(function (seg, si) { return seg.length > 1 ? React.createElement("polyline", { key: 'seg' + si, points: seg.join(" "), fill: "none", stroke: isDark ? "#818cf8" : "#4f46e5", strokeWidth: 2.5, style: { filter: 'drop-shadow(0 0 3px rgba(' + (isDark ? '129,140,248,0.6' : '79,70,229,0.45') + '))' } }) : null; }),

              // Comparison curve (orange)
              d.compare && compareSegs.map(function (seg, si) { return seg.length > 1 ? React.createElement("polyline", { key: 'cseg' + si, points: seg.join(" "), fill: "none", stroke: "#c2410c", strokeWidth: 2, strokeDasharray: "8 4" }) : null; }),

              // Tangent line at traceX
              tangentInRange && (function() {
                var tLen = 3;
                var x1 = traceX - tLen, x2 = traceX + tLen;
                var y1t = traceY + traceSlope * (x1 - traceX);
                var y2t = traceY + traceSlope * (x2 - traceX);
                return React.createElement('g', null,
                  React.createElement('line', { x1: toSX(x1), y1: toSY(y1t), x2: toSX(x2), y2: toSY(y2t), stroke: '#ec4899', strokeWidth: 1.5, strokeDasharray: '4 2' }),
                  React.createElement('circle', { cx: toSX(traceX), cy: toSY(traceY), r: 5, fill: '#ec4899', stroke: 'white', strokeWidth: 1.5 }),
                  React.createElement('text', { x: toSX(traceX) + 10, y: toSY(traceY) - 6, fill: '#ec4899', style: { fontSize: '8px', fontWeight: 'bold' } }, '(' + traceX.toFixed(1) + ', ' + traceY.toFixed(2) + ') m=' + traceSlope.toFixed(2))
                );
              })(),

              // Roots

              roots.map(function (r, i) {

                return React.createElement("g", { key: 'root' + i },

                  React.createElement("circle", { cx: toSX(r), cy: toSY(0), r: 4, fill: "#ef4444", stroke: "white", strokeWidth: 1.5 }),

                  React.createElement("text", { x: toSX(r), y: toSY(0) - 8, textAnchor: "middle", fill: "#ef4444", style: { fontSize: '8px', fontWeight: 'bold' } }, r.toFixed(2))

                );

              }),

              // Y-intercept

              yIntercept >= yR.yMin && yIntercept <= yR.yMax && React.createElement("g", null,

                React.createElement("circle", { cx: toSX(0), cy: toSY(yIntercept), r: 4, fill: "#22c55e", stroke: "white", strokeWidth: 1.5 }),

                React.createElement("text", { x: toSX(0) + 8, y: toSY(yIntercept) + 4, fill: "#22c55e", style: { fontSize: '8px', fontWeight: 'bold' } }, "(0, " + yIntercept.toFixed(1) + ")")

              ),

              // Critical points (local max / min) — violet markers with kind label
              critPts.map(function (cp, i) {
                var isMax = cp.kind === 'max';
                var color = isMax ? '#a855f7' : '#0891b2';
                return React.createElement("g", { key: 'cp' + i },
                  React.createElement("circle", {
                    cx: toSX(cp.x), cy: toSY(cp.y), r: 5,
                    fill: 'none', stroke: color, strokeWidth: 2
                  }),
                  React.createElement("text", {
                    x: toSX(cp.x), y: toSY(cp.y) + (isMax ? -10 : 16),
                    textAnchor: 'middle', fill: color,
                    style: { fontSize: '8px', fontWeight: 'bold' }
                  }, (isMax ? '▲ max ' : '▼ min ') + '(' + cp.x.toFixed(1) + ', ' + cp.y.toFixed(2) + ')')
                );
              }),

              // Grid text labels (rendered AFTER curves so they appear on top)

              (function () {

                var gridLabels = [];

                var xStep = (xR.xMax - xR.xMin) <= 10 ? 1 : (xR.xMax - xR.xMin) <= 30 ? 5 : 10;

                for (var gx = Math.ceil(xR.xMin / xStep) * xStep; gx <= xR.xMax; gx += xStep) {

                  var sx = toSX(gx);

                  if (sx > pad && sx < W - pad) {

                    gridLabels.push(React.createElement("text", { key: 'tx' + gx, x: sx, y: H - pad + 14, textAnchor: "middle", fill: isDark ? "#94a3b8" : "#64748b", style: { fontSize: '8px', fontWeight: '600' } }, gx));

                  }

                }

                var yStep = (yR.yMax - yR.yMin) <= 10 ? 1 : (yR.yMax - yR.yMin) <= 30 ? 5 : 10;

                for (var gy = Math.ceil(yR.yMin / yStep) * yStep; gy <= yR.yMax; gy += yStep) {

                  var sy = toSY(gy);

                  if (sy > pad && sy < H - pad) {

                    gridLabels.push(React.createElement("text", { key: 'ty' + gy, x: pad - 5, y: sy + 3, textAnchor: "end", fill: isDark ? "#94a3b8" : "#64748b", style: { fontSize: '8px', fontWeight: '600' } }, gy));

                  }

                }

                return gridLabels;

              })(),

              // Equation label

              React.createElement("text", { x: d.compare ? W / 3 : W / 2, y: H - 5, textAnchor: "middle", fill: isDark ? "#a5b4fc" : "#4f46e5", style: { fontSize: '10px', fontWeight: 'bold' } }, eqStr),

              // Comparison equation label
              d.compare && eqStr2 && React.createElement("text", { x: W * 2 / 3, y: H - 5, textAnchor: "middle", fill: "#c2410c", style: { fontSize: '10px', fontWeight: 'bold' } }, eqStr2)

            ),

            // ── Zoom / Pan Controls ──
            React.createElement("div", { className: "flex items-center gap-1.5 mt-2 mb-1 flex-wrap" },
              React.createElement("span", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mr-1" + onHostInk }, __alloT('stem.funcgrapher.view', "\uD83D\uDD0D View")),
              React.createElement("button", { onClick: function() { var cx = (xR.xMin + xR.xMax) / 2, cy = (yR.yMin + yR.yMax) / 2, hw = (xR.xMax - xR.xMin) / 4, hh = (yR.yMax - yR.yMin) / 4; upd('range', { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.zoom_in', 'Zoom in') }, __alloT('stem.funcgrapher.zoom_in_2', "\u2795 Zoom In")),
              React.createElement("button", { onClick: function() { var cx = (xR.xMin + xR.xMax) / 2, cy = (yR.yMin + yR.yMax) / 2, hw = (xR.xMax - xR.xMin), hh = (yR.yMax - yR.yMin); upd('range', { xMin: cx - hw, xMax: cx + hw, yMin: cy - hh, yMax: cy + hh }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.zoom_out', 'Zoom out') }, __alloT('stem.funcgrapher.zoom_out_2', "\u2796 Zoom Out")),
              React.createElement("button", { onClick: function() { var dx = (xR.xMax - xR.xMin) * 0.25; upd('range', { xMin: xR.xMin - dx, xMax: xR.xMax - dx, yMin: yR.yMin, yMax: yR.yMax }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_left', 'Pan left') }, "\u2B05"),
              React.createElement("button", { onClick: function() { var dx = (xR.xMax - xR.xMin) * 0.25; upd('range', { xMin: xR.xMin + dx, xMax: xR.xMax + dx, yMin: yR.yMin, yMax: yR.yMax }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_right', 'Pan right') }, "\u27A1"),
              React.createElement("button", { onClick: function() { var dy = (yR.yMax - yR.yMin) * 0.25; upd('range', { xMin: xR.xMin, xMax: xR.xMax, yMin: yR.yMin + dy, yMax: yR.yMax + dy }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_up', 'Pan up') }, "\u2B06"),
              React.createElement("button", { onClick: function() { var dy = (yR.yMax - yR.yMin) * 0.25; upd('range', { xMin: xR.xMin, xMax: xR.xMax, yMin: yR.yMin - dy, yMax: yR.yMax - dy }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-slate-100 text-slate-600 hover:bg-indigo-50 border border-slate-400 transition-all", 'aria-label': __alloT('stem.funcgrapher.pan_down', 'Pan down') }, "\u2B07"),
              React.createElement("button", { onClick: function() { upd('range', { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }); }, className: "px-2 py-1 rounded-md text-[0.6875rem] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-600 transition-all", 'aria-label': __alloT('stem.funcgrapher.reset_view', 'Reset view') }, __alloT('stem.funcgrapher.reset', "\u21BA Reset")),
              React.createElement("span", { className: "text-[0.6875rem] text-slate-600 ml-1" + onHostInk }, "x:[" + xR.xMin.toFixed(0) + "," + xR.xMax.toFixed(0) + "] y:[" + yR.yMin.toFixed(0) + "," + yR.yMax.toFixed(0) + "]")
            ),

            // ── Transformation Labels ──
            transformLabels.length > 0 && React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-1" },
              transformLabels.map(function(tl, ti) {
                return React.createElement("span", { key: ti, className: "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border " + tl.color }, tl.text);
              })
            ),

            // Toggles

            React.createElement("div", { className: "flex gap-2 mt-3 mb-2 flex-wrap" },

              React.createElement("button", { onClick: () => { if (!d.showDeriv) upd('overlaysUsed', Object.assign({}, d.overlaysUsed, { deriv: true })); upd('showDeriv', !d.showDeriv); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showDeriv ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 border border-amber-600') }, d.showDeriv ? "\u2705 f\u2032(x)" : "\uD83D\uDCC9 Show f\u2032(x)"),

              React.createElement("button", { onClick: () => { if (!d.showArea) upd('overlaysUsed', Object.assign({}, d.overlaysUsed, { area: true })); upd('showArea', !d.showArea); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showArea ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-600') }, d.showArea ? "\u2705 Area" : "\u222B Area"),

              d.showArea && React.createElement("span", { className: "px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[0.6875rem] font-mono font-bold border border-indigo-300" }, "\u222B\u2080^" + xR.xMax.toFixed(0) + " f(x)dx " + (integralDefined ? "\u2248 " + integral0ToMax.toFixed(2) : integralReason)),

              React.createElement("button", { onClick: () => upd('showTable', !d.showTable), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showTable ? 'bg-cyan-700 text-white' : 'bg-cyan-50 text-cyan-700 border border-cyan-600') }, d.showTable ? "\u2705 Table" : "\uD83D\uDCCB Table"),

              React.createElement("button", { onClick: () => upd('showLearn', !d.showLearn), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showLearn ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-600') }, d.showLearn ? "\u2705 Learn" : "\uD83D\uDCD6 Learn"),

              roots.length > 0 && React.createElement("span", { className: "px-2 py-1.5 bg-red-50 text-red-700 rounded-lg text-[0.6875rem] font-bold border border-red-200" }, "\uD83D\uDCCD " + roots.length + " root" + (roots.length > 1 ? 's' : '') + ": x = " + roots.map(r => r.toFixed(2)).join(', ')),

              yIntercept >= yR.yMin && yIntercept <= yR.yMax && React.createElement("span", { className: "px-2 py-1.5 bg-green-50 text-green-700 rounded-lg text-[0.6875rem] font-bold border border-green-200" }, "\uD83D\uDFE2 y-int: " + yIntercept.toFixed(2))

            ),

            // ── Tangent Line Trace Slider ──
            React.createElement("div", { className: "bg-pink-50 rounded-lg p-2 border border-pink-200 mt-1" },
              React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-pink-700" }, "\uD83D\uDCCC Trace: x = " + traceX.toFixed(1)),
                React.createElement("input", { type: "range", min: xR.xMin, max: xR.xMax, step: 0.1, value: traceX, onChange: e => upd('traceX', parseFloat(e.target.value)), className: "flex-1 accent-pink-500", 'aria-label': __alloT('stem.funcgrapher.trace_x_position', 'Trace x position') }),
                React.createElement("span", { 'data-function-trace':true,role:'status',className: "text-xs font-mono text-pink-700",style:{overflowWrap:'anywhere'} }, !Number.isFinite(traceY)?__alloT('stem.funcgrapher.trace_undefined','The function is undefined at this x.'): 'f(' + traceX.toFixed(1) + ') = ' + traceY.toFixed(2) + (Number.isFinite(traceSlope)?', slope = '+traceSlope.toFixed(2):'; '+__alloT('stem.funcgrapher.trace_no_derivative','no finite derivative at this point.')))
              )
            ),

            // ── Table of Values (collapsible) ──
            d.showTable && React.createElement("div", { className: "mt-2 bg-cyan-50 rounded-xl border border-cyan-200 p-3 overflow-x-auto" },
              React.createElement("p", { className: "text-[0.6875rem] font-bold text-cyan-700 uppercase tracking-wider mb-2" }, __alloT('stem.funcgrapher.table_of_values', "\uD83D\uDCCB Table of Values")),
              React.createElement("table", { className: "w-full text-xs" },
                React.createElement("caption", { className: "sr-only" }, __alloT('stem.funcgrapher.funcgrapher_data_table', "funcgrapher data table")), React.createElement("thead", null,
                  React.createElement("tr", { className: "border-b border-cyan-200" },
                    React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-cyan-800" }, "x"),
                    React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-indigo-700" }, "f(x)"),
                    d.showDeriv && React.createElement("th", { scope: "col", className: "px-2 py-1 text-left font-bold text-amber-700" }, "f\u2032(x)")
                  )
                ),
                React.createElement("tbody", null,
                  (function() {
                    var rows = [];
                    for (var tx = Math.ceil(xR.xMin); tx <= Math.floor(xR.xMax); tx++) {
                      var fy = evalF(tx);
                      var fdy = evalDeriv(tx);
                      rows.push(React.createElement("tr", { key: tx, className: "border-b border-cyan-100 hover:bg-cyan-100 transition-colors" },
                        React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, tx),
                        React.createElement("td", { className: "px-2 py-0.5 font-mono text-indigo-700" }, isFinite(fy) ? fy.toFixed(2) : 'undefined'),
                        d.showDeriv && React.createElement("td", { className: "px-2 py-0.5 font-mono text-amber-700" }, isFinite(fdy) ? fdy.toFixed(2) : 'undefined')
                      ));
                    }
                    return rows;
                  })()
                )
              )
            ),

            // ── Educational Learn Panel (collapsible) ──
            d.showLearn && React.createElement("div", { className: "mt-2 bg-emerald-50 rounded-xl border border-emerald-200 p-4" },
              React.createElement("h3", { className: "text-sm font-bold text-emerald-800 mb-2" }, __alloT('stem.funcgrapher.understanding_functions', "\uD83D\uDCD6 Understanding Functions")),
              React.createElement("div", { className: "grid grid-cols-1 gap-2 text-xs text-emerald-900" },
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-red-600" }, __alloT('stem.funcgrapher.roots_x_intercepts', "\uD83D\uDD34 Roots (x-intercepts): ")),
                  __alloT('stem.funcgrapher.root_meaning_refined', 'A root has f(x) = 0. The graph can cross or touch the x-axis there. Numerical searches can miss roots, so use algebra or the table to check.')
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-green-700" }, __alloT('stem.funcgrapher.y_intercept', "\uD83D\uDFE2 Y-intercept: ")),
                  __alloT('stem.funcgrapher.where_the_function_crosses_the_y_axis_', "Where the function crosses the y-axis. This is the value of f(0) — simply plug in x = 0.")
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-pink-700" }, __alloT('stem.funcgrapher.slope_tangent_line', "\uD83D\uDCCC Slope & Tangent Line: ")),
                  __alloT('stem.funcgrapher.tangent_meaning_refined', 'A tangent describes the local slope where the derivative exists. It can cross the curve or meet it again. Corners and domain boundaries need special care.')
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-amber-800" }, __alloT('stem.funcgrapher.derivative_f_x', "\uD83D\uDCC9 Derivative f\u2032(x): ")),
                  __alloT('stem.funcgrapher.the_derivative_measures_the_rate_of_ch', "The derivative measures the rate of change. Toggle it on to see how the slope varies across the function. Where f\u2032(x) = 0, the function has a local max or min.")
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-indigo-600" }, __alloT('stem.funcgrapher.area_under_the_curve', "\u222B Area Under the Curve: ")),
                  __alloT('stem.funcgrapher.the_shaded_area_represents_the_integra', "The shaded area represents the integral — the total \"accumulation\" of f(x). In real life, this could mean distance traveled, energy consumed, or probability.")
                ),
                d.type === 'quadratic' && React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, __alloT('stem.funcgrapher.parabolas', "\u2229 Parabolas: ")),
                  __alloT('stem.funcgrapher.when_a_0_the_parabola_opens_up_when_a_', "When a > 0, the parabola opens up (\u23E3). When a < 0, it opens down (\u23E2). The vertex is the turning point. Try changing 'a' to see!")
                ),
                d.type === 'trig' && React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, __alloT('stem.funcgrapher.trig_functions', "\u223C Trig Functions: ")),
                  __alloT('stem.funcgrapher.amplitude_a_controls_the_height_freque', "Amplitude (a) controls the height, frequency (b) controls how many cycles, and phase shift (c) slides the wave left/right. Period = 2\u03C0/b.")
                )
              )
            ),

            // Sliders (f(x))

            React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-2" },

              [{ k: 'a', label: 'a', min: -5, max: 5, step: 0.1 }, { k: 'b', label: 'b', min: -5, max: 5, step: 0.1 }, { k: 'c', label: 'c', min: -5, max: 5, step: 0.1 }].map(s =>

                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("label", { className: "text-xs font-bold text-indigo-600" }, s.label + " = " + d[s.k]),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-indigo-600", "aria-label": "Parameter " + s.label })

                )

              )

            ),

            // ── Compare Mode Toggle + Sliders ──
            React.createElement("div", { className: "mt-2 flex flex-wrap items-center gap-2" },
              React.createElement("button", { onClick: function() { upd('compare', !d.compare); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.compare ? 'bg-orange-700 text-white shadow-md' : 'bg-orange-50 text-orange-700 border border-orange-600') }, d.compare ? '\u2705 Comparing' : '\uD83D\uDD00 Compare'),
              d.compare && React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                TYPES.map(function(tp) {
                  return React.createElement("button", { key: 'cmp-' + tp.id, onClick: function() { upd('compareType', tp.id); }, className: "px-2 py-1 rounded text-[0.6875rem] font-bold transition-all " + (d.compareType === tp.id ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600') }, tp.emoji);
                })
              )
            ),
            d.compare && React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-1" },
              [{ k: 'compareA', label: 'a\u2082', min: -5, max: 5, step: 0.1 }, { k: 'compareB', label: 'b\u2082', min: -5, max: 5, step: 0.1 }, { k: 'compareC', label: 'c\u2082', min: -5, max: 5, step: 0.1 }].map(function(s) {
                return React.createElement("div", { key: s.k, className: "text-center bg-orange-50 rounded-lg p-2 border border-orange-200" },
                  React.createElement("label", { className: "text-xs font-bold text-orange-700" }, s.label + ' = ' + (d[s.k] || 0)),
                  React.createElement("input", { type: 'range', min: s.min, max: s.max, step: s.step, value: d[s.k] || 0, onChange: function(e) { upd(s.k, parseFloat(e.target.value)); }, className: 'w-full accent-orange-500', 'aria-label': 'Compare parameter ' + s.label })
                );
              })
            ),


            // A separate endpoint investigation: the selected family graph above is unchanged.
            (function(){
              var power=[.5,1,2].indexOf(Number(d.improperPower))!==-1?Number(d.improperPower):.5;
              var epsilon=d.improperEpsilon==null?'.1':String(d.improperEpsilon);
              var rows=(Array.isArray(d.improperRows)?d.improperRows:[]).filter(function(r){return r&&fgTruncatedIntegral(r.power,r.epsilon).ok;}).slice(-18);
              var sample=fgTruncatedIntegral(power,epsilon);
              var ink=ctx.isContrast?'#ffffff':ctx.isDark?'#e2e8f0':'#0f172a',surface=ctx.isContrast?'#000000':ctx.isDark?'#0f172a':'#ffffff',border=ctx.isContrast?'#facc15':'#64748b';
              var field={padding:10,border:'1px solid '+border,borderRadius:6,background:surface,color:ink,maxWidth:'100%',boxSizing:'border-box'};
              function set(patch){setLabToolData(function(prev){return Object.assign({},prev,{funcGrapher:Object.assign({},prev.funcGrapher,patch)});});}
              return h('details',{'data-improper-investigation':true,style:{marginTop:16,padding:14,border:'1px solid '+border,borderRadius:12,color:ink,background:surface}},
                h('summary',{style:{fontSize:16,fontWeight:700,cursor:'pointer'}},'Can an unbounded function have finite area?'),
                h('p',null,'Compare 1/√x, 1/x, and 1/x² from 0 to 1. All are undefined at zero. Start at a positive cutoff ε and move it toward zero to investigate the missing endpoint.'),
                h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
                  h('label',null,'Endpoint example',h('select',{'aria-label':'Endpoint example',value:power,style:field,onChange:function(e){set({improperPower:Number(e.target.value),improperReveal:false,improperNotice:''});}},
                    h('option',{value:.5},'1/√x'),h('option',{value:1},'1/x'),h('option',{value:2},'1/x²'))),
                  h('label',null,'Cutoff ε',h('input',{'aria-label':'Positive endpoint cutoff',type:'number',step:'any',min:.000001,max:.999999,value:epsilon,style:field,onChange:function(e){set({improperEpsilon:e.target.value,improperNotice:''});}}))),
                h('label',{style:{display:'block',marginTop:12}},'Predict what happens as ε approaches zero',
                  h('select',{value:d.improperPrediction||'',style:Object.assign({},field,{display:'block'}),onChange:function(e){upd('improperPrediction',e.target.value);}},
                    h('option',{value:''},'Choose a prediction'),h('option',{value:'finite'},'Area approaches a finite value'),h('option',{value:'unbounded'},'Area grows without bound'),h('option',{value:'unsure'},'I need more evidence'))),
                h('button',{type:'button',style:Object.assign({},field,{marginTop:10,minHeight:44}),onClick:function(){
                  if(!sample.ok){set({improperNotice:'Enter a positive cutoff less than 1.'});return;}
                  if(!d.improperPrediction){set({improperNotice:'Record a prediction before adding a trial.'});return;}
                  if(rows.some(function(r){return Number(r.power)===power&&Number(r.epsilon)===sample.epsilon;})){set({improperNotice:'That cutoff is already recorded for this example. Try a smaller value.'});return;}
                  set({improperRows:rows.concat([{power:power,epsilon:sample.epsilon,prediction:d.improperPrediction}]).slice(-18),improperNotice:'Trial recorded. Try ε / 10, then compare how much area was added.'});
                }},'Record cutoff trial'),
                d.improperNotice?h('p',{role:'status'},d.improperNotice):null,
                rows.length?h('div',{tabIndex:0,role:'region','aria-label':'Endpoint trial table',style:{overflowX:'auto'}},h('table',{style:{width:'100%',fontSize:13,borderCollapse:'collapse',color:ink}},
                  h('caption',{style:{color:ink}},'Recent cutoff trials: area from ε to 1'),
                  h('thead',null,h('tr',null,['Function','Cutoff ε','Area ≈','Prediction'].map(function(label){return h('th',{key:label,scope:'col',style:{padding:8,textAlign:'left',borderBottom:'1px solid '+border,color:ink}},label);}))),
                  h('tbody',null,rows.map(function(row,i){var r=fgTruncatedIntegral(row.power,row.epsilon);return h('tr',{key:i},[r.power===.5?'1/√x':r.power===1?'1/x':'1/x²',r.epsilon,Number(r.area.toPrecision(7)),row.prediction].map(function(v,j){return h('td',{key:j,style:{padding:8,borderBottom:'1px solid '+border,color:ink}},String(v));}));})))):null,
                h('p',null,'Each trial integrates over a finite interval. An increasing table alone does not show that the total is infinite; compare the antiderivative and its limit.'),
                h('button',{type:'button',disabled:!rows.some(function(r){return Number(r.power)===power;}),style:Object.assign({},field,{minHeight:44}),onClick:function(){upd('improperReveal',!d.improperReveal);}},d.improperReveal?'Hide limit explanation':'Compare with the limit'),
                d.improperReveal?h('p',{'data-improper-limit':true,role:'status'},power===.5?'Area = 2(1 − √ε). As ε approaches zero, √ε approaches zero, so the area approaches 2. The integrand is unbounded, but this improper integral converges.':power===1?'Area = −ln(ε). As ε approaches zero from above, this grows without bound. The improper integral diverges.':'Area = 1/ε − 1. As ε approaches zero from above, this grows without bound. The improper integral diverges.'):null,
                h('label',{style:{display:'block',marginTop:12}},'Explain how the trials support or change your prediction',
                  h('textarea',{rows:3,maxLength:1500,value:d.improperReflection||'',style:Object.assign({},field,{display:'block',width:'100%'}),onChange:function(e){upd('improperReflection',e.target.value);}})),
                h('p',{style:{fontSize:12}},'Trials use antiderivative formulas and rounded display values. The last 18 trials and your explanation are retained in this AlloFlow project.'))
            })(),

            // ── AI Explain Button ──
            callGemini && React.createElement("div", { className: "mt-2" },
              React.createElement("button", { onClick: function() {
                if (d.aiExplainLoading) return;
                upd('aiExplainLoading', true);
                upd('aiExplain', '');
                var prompt = 'You are a math tutor. Explain the behavior of this function to a ' + (gradeLevel || '5th Grade') + ' student in 3-4 short, friendly sentences. ' +
                  'Function: ' + eqStr + '. Type: ' + d.type + '. ' +
                  'Parameters: a=' + d.a + ', b=' + d.b + ', c=' + d.c + '. ' +
                  'Roots at x=' + (roots.length > 0 ? roots.map(function(r) { return r.toFixed(2); }).join(', ') : 'none visible') + '. ' +
                  'Y-intercept: ' + yIntercept.toFixed(2) + '. ' +
                  'Visible range: x=[' + xR.xMin + ',' + xR.xMax + '], y=[' + yR.yMin + ',' + yR.yMax + ']. ' +
                  'Describe the shape, key features, and what happens as x increases. Use simple language.';
                callGemini(prompt, true, false, 0.7).then(function(resp) {
                  upd('aiExplain', typeof resp === 'string' ? resp : 'Could not generate explanation.');
                  upd('aiExplainLoading', false);
                }).catch(function() {
                  upd('aiExplain', 'Explanation unavailable right now.');
                  upd('aiExplainLoading', false);
                });
              }, disabled: d.aiExplainLoading, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.aiExplainLoading ? 'bg-purple-700 text-white cursor-wait' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-600 shadow-md') }, d.aiExplainLoading ? '\u23F3 Thinking...' : '\u2728 Explain This Graph'),
              d.aiExplain && React.createElement("div", { className: "mt-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 leading-relaxed" },
                React.createElement("div", { className: "flex items-center gap-1.5 mb-1" },
                  React.createElement("span", { className: "text-[0.6875rem] font-bold text-purple-600 uppercase tracking-wider" }, __alloT('stem.funcgrapher.ai_explanation', "\uD83E\uDDE0 AI Explanation"))
                ),
                d.aiExplain
              )
            ),

            // Presets

            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },

              React.createElement("p", { className: "text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2" + onHostInk }, __alloT('stem.funcgrapher.quick_presets', "\u26A1 Quick Presets")),

              React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                [

                  { label: __alloT('stem.funcgrapher.y_2x_1', 'y = 2x + 1'), type: 'linear', a: 2, b: 1, c: 0, tip: __alloT('stem.funcgrapher.slope_2_y_intercept_1', 'Slope 2, y-intercept 1') },

                  { label: __alloT('stem.funcgrapher.y_x', 'y = x\u00B2'), type: 'quadratic', a: 1, b: 0, c: 0, tip: __alloT('stem.funcgrapher.standard_parabola', 'Standard parabola') },

                  { label: __alloT('stem.funcgrapher.y_x_4', 'y = -x\u00B2 + 4'), type: 'quadratic', a: -1, b: 0, c: 4, tip: __alloT('stem.funcgrapher.inverted_parabola_vertex_at_0_4', 'Inverted parabola, vertex at (0,4)') },

                  { label: __alloT('stem.funcgrapher.y_sin_x', 'y = sin(x)'), type: 'trig', a: 1, b: 1, c: 0, tip: __alloT('stem.funcgrapher.standard_sine_wave', 'Standard sine wave') },

                  { label: __alloT('stem.funcgrapher.y_2sin_3x', 'y = 2sin(3x)'), type: 'trig', a: 2, b: 3, c: 0, tip: __alloT('stem.funcgrapher.amplitude_2_period_2_3', 'Amplitude=2, period=2\u03C0/3') },

                  { label: __alloT('stem.funcgrapher.y_x_2', 'y = x\u00B3'), type: 'cubic', a: 1, b: 0, c: 0, tip: __alloT('stem.funcgrapher.cubic_with_inflection_at_origin', 'Cubic with inflection at origin') },

                  { label: __alloT('stem.funcgrapher.y_e_x', 'y = e^x'), type: 'exponential', a: 1, b: 1, c: 0, tip: __alloT('stem.funcgrapher.natural_exponential_growth', 'Natural exponential growth') },

                  { label: __alloT('stem.funcgrapher.y_x_3', 'y = |x|'), type: 'absolute', a: 1, b: 0, c: 0, tip: __alloT('stem.funcgrapher.v_shaped_absolute_value', 'V-shaped absolute value') },

                ].map(function (p) {

                  return React.createElement("button", { key: p.label, onClick: function () {

                      setFnType(p.type); upd('a', p.a); upd('b', p.b); upd('c', p.c);

                      addToast('\uD83D\uDCC8 ' + p.tip, 'success');

                    }, className: "px-2 py-1 rounded-lg text-[0.6875rem] font-bold bg-indigo-50 text-indigo-700 border border-indigo-600 hover:bg-indigo-100 transition-all"

                  }, p.label);

                })

              )

            ),

            // Legend

            React.createElement("div", { className: "mt-2 flex items-center gap-4 text-[0.6875rem] text-slate-600" + onHostInk },

              React.createElement("span", null, __alloT('stem.funcgrapher.f_x', "\u2014\u2014 f(x)")),

              d.showDeriv && React.createElement("span", null, __alloT('stem.funcgrapher.f_x_2', "- - - f\u2032(x)")),

              d.compare && React.createElement("span", { style: { color: '#c2410c' } }, __alloT('stem.funcgrapher.g_x', "- \u2500 - g(x)")),

              React.createElement("span", null, __alloT('stem.funcgrapher.roots', "\uD83D\uDD34 Roots")),

              React.createElement("span", null, __alloT('stem.funcgrapher.y_intercept_2', "\uD83D\uDFE2 y-intercept"))

            ),

            // ── Challenges: Name That Graph, Find the Root, What's the y-intercept? ──

            (() => {

              var fgQuiz = d.fgQuiz || null;

              var fgScore = d.fgScore || 0;

              var fgStreak = d.fgStreak || 0;

              var challengeMode = d.fgChallengeMode || 'name'; // 'name' | 'root' | 'yint'



              // ── Family labels + visual signatures (drive both quiz options and the
              // corrective feedback — the signature is HOW you tell that family apart) ──

              var FG_LABELS = { linear: 'Linear (y = ax + b)', quadratic: 'Quadratic (y = ax² + bx + c)', trig: 'Trigonometric (y = a·sin(bx + c))', cubic: 'Cubic (y = ax³ + bx + c)', exponential: 'Exponential (y = a·eᵇˣ + c)', absolute: 'Absolute Value (y = a|x + b| + c)', sqrt: 'Square Root (y = a√(x + b) + c)', log: 'Logarithm (y = a·ln(x + b) + c)', rational: 'Rational (y = a/(x + b) + c)' };

              var FG_TRAITS = {
                linear: 'a perfectly straight line — the slope never changes',
                quadratic: 'a single U-turn (the vertex) with both arms heading the SAME direction',
                trig: 'a wave that repeats the same cycle forever',
                cubic: 'an S-bend whose two ends head in OPPOSITE directions',
                exponential: 'nearly flat on one side, then exploding upward on the other',
                absolute: 'a sharp V corner — two straight pieces meeting at a point',
                sqrt: 'half a sideways parabola that STARTS at an edge point and only goes one way',
                log: 'a fast climb that flattens out, with a vertical wall (asymptote) on one side',
                rational: 'two separate branches split by a vertical asymptote the curve never touches'
              };

              // Family pool grows with grade band
              var FG_BAND_TYPES = {
                'K-2':  ['linear', 'quadratic', 'absolute'],
                '3-5':  ['linear', 'quadratic', 'absolute', 'trig'],
                '6-8':  ['linear', 'quadratic', 'trig', 'cubic', 'exponential', 'absolute'],
                '9-12': ['linear', 'quadratic', 'trig', 'cubic', 'exponential', 'absolute', 'sqrt', 'log', 'rational']
              };

              // Unbiased in-place Fisher-Yates — the Math.random()-0.5 comparator it
              // replaces left the correct answer disproportionately near where it
              // was inserted (position bias).
              function fgShuffle(arr) {
                for (var fi = arr.length - 1; fi > 0; fi--) {
                  var fj = Math.floor(Math.random() * (fi + 1));
                  var ft = arr[fi]; arr[fi] = arr[fj]; arr[fj] = ft;
                }
                return arr;
              }

              // ── Name That Graph generator (grade-banded pool) ──

              function makeFgQuiz() {

                var types = FG_BAND_TYPES[gradeBand] || FG_BAND_TYPES['3-5'];

                var tp = types[Math.floor(Math.random() * types.length)];

                var opts = [FG_LABELS[tp]];

                while (opts.length < Math.min(4, types.length)) { var r = FG_LABELS[types[Math.floor(Math.random() * types.length)]]; if (opts.indexOf(r) < 0) opts.push(r); }

                return { mode: 'name', type: tp, answer: FG_LABELS[tp], opts: fgShuffle(opts), answered: false };

              }



              // ── Find the Root generator ──

              function makeRootQuiz() {

                // Pick linear or quadratic with guaranteed nice roots.
                // Younger bands stay linear-only; quadratics unlock at 6-8.

                var pick = (gradeBand === 'K-2' || gradeBand === '3-5') ? 0 : Math.random();

                var qa, qb, qc, qtype, rootAnswer, rootAnswers;

                if (pick < 0.5) {

                  // Linear: a*x + b = 0 → root = -b/a

                  qa = [1, 2, -1, -2, 3][Math.floor(Math.random() * 5)];

                  qb = [-6, -4, -2, 0, 2, 4, 6][Math.floor(Math.random() * 7)];

                  qc = 0; qtype = 'linear';

                  rootAnswer = Math.round((-qb / qa) * 100) / 100;

                  rootAnswers = [rootAnswer];

                } else {

                  // Quadratic: a*(x - r1)*(x - r2), pick small integer roots

                  var r1 = Math.floor(Math.random() * 7) - 3;

                  var r2 = r1 + Math.floor(Math.random() * 4) + 1;

                  qa = 1; qb = -(r1 + r2); qc = r1 * r2; qtype = 'quadratic';

                  rootAnswer = r1;

                  // BOTH roots are correct answers to "what is one root": r2 must never be
                  // generated as a "wrong" option, and must grade correct if picked.
                  rootAnswers = [r1, r2];

                }

                // Build 4 numeric options including the correct answer

                var opts = [rootAnswer];

                while (opts.length < 4) {

                  var wrong = rootAnswer + (Math.floor(Math.random() * 7) - 3);

                  if (rootAnswers.indexOf(wrong) < 0 && opts.indexOf(wrong) < 0) opts.push(wrong);

                }

                return { mode: 'root', type: qtype, a: qa, b: qb, c: qc, answer: rootAnswer, answers: rootAnswers, opts: fgShuffle(opts), answered: false };

              }



              // ── What's the y-intercept? generator ──

              function makeYIntQuiz() {

                // Banded: K-2/3-5 linear only, 6-8 adds quadratic, 9-12 adds cubic
                var pick = (gradeBand === 'K-2' || gradeBand === '3-5') ? 0 : (gradeBand === '6-8' ? Math.random() * 0.8 : Math.random());

                var qa, qb, qc, qtype, yIntAnswer;

                if (pick < 0.4) {

                  qa = [1, 2, -1, -2, 3][Math.floor(Math.random() * 5)];

                  qb = Math.floor(Math.random() * 11) - 5; qc = 0; qtype = 'linear';

                  yIntAnswer = qb; // f(0) = a*0 + b

                } else if (pick < 0.8) {

                  qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                  qb = Math.floor(Math.random() * 7) - 3;

                  qc = Math.floor(Math.random() * 9) - 4; qtype = 'quadratic';

                  yIntAnswer = qc; // f(0) = a*0 + b*0 + c

                } else {

                  qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                  qb = Math.floor(Math.random() * 7) - 3;

                  qc = Math.floor(Math.random() * 9) - 4; qtype = 'cubic';

                  yIntAnswer = qc; // f(0) = c for cubic a*x³ + b*x + c

                }

                var opts = [yIntAnswer];

                while (opts.length < 4) {

                  var wrong = yIntAnswer + (Math.floor(Math.random() * 7) - 3);

                  if (wrong !== yIntAnswer && opts.indexOf(wrong) < 0) opts.push(wrong);

                }

                return { mode: 'yint', type: qtype, a: qa, b: qb, c: qc, answer: yIntAnswer, opts: fgShuffle(opts), answered: false };

              }



              // ── Misconception bank (True/False "myth busting") ──
              // Each entry targets a documented student misconception; the `why` is the
              // corrective explanation shown after EVERY answer, right or wrong.
              var FG_MYTHS = {
                '3-5': [
                  { s: 'A steeper line has a bigger slope number.', t: true, why: 'Slope counts how much the line climbs for each step to the right — steeper climb, bigger number.' },
                  { s: 'The line y = 2x goes DOWN as you move right.', t: false, why: 'The slope 2 is positive, so the line climbs. Only negative slopes go downhill.' },
                  { s: 'A graph can cross the y-axis in two different places.', t: false, why: 'A function gives exactly one output at x = 0, so it has exactly ONE y-intercept.' },
                  { s: 'Making "a" negative in y = a·x flips the line downhill.', t: true, why: 'A negative slope trades climbing for falling — the line reflects over the x-axis.' },
                  { s: 'Adding 3 to a function (y = x + 3) slides the whole line up 3.', t: true, why: 'Every point gets 3 added to its height — same shape, shifted up.' }
                ],
                '6-8': [
                  { s: 'A bigger "a" in y = ax² makes the parabola wider.', t: false, why: 'Bigger |a| makes it NARROWER — each step in x now costs more height. Wide parabolas come from |a| < 1.' },
                  { s: 'y = x² + 3 has the same shape as y = x², just moved up.', t: true, why: 'Adding a constant lifts every point 3 units — the shape is untouched.' },
                  { s: 'sin(2x) is twice as TALL as sin(x).', t: false, why: 'The 2 INSIDE squeezes the wave to twice the cycles (shorter period). Height comes from the number in FRONT — the amplitude.' },
                  { s: 'Every parabola crosses the x-axis twice.', t: false, why: 'Lift the vertex above the x-axis and it never crosses — a parabola can have 0, 1, or 2 roots.' },
                  { s: 'y = |x| has a sharp corner at the origin.', t: true, why: 'Left of 0 the slope is −1, right of 0 it is +1. That sudden switch is the V corner — no smooth turn.' },
                  { s: 'If two graphs cross, they are equal at that x-value.', t: true, why: 'A crossing point is exactly where both functions give the same output — that is what solving f(x) = g(x) finds.' }
                ],
                '9-12': [
                  { s: 'The graph of y = 1/x eventually touches the x-axis.', t: false, why: 'It gets infinitely close but never arrives — the x-axis is a horizontal ASYMPTOTE, a boundary the curve approaches forever.' },
                  { s: 'Exponential growth eventually beats ANY polynomial.', t: true, why: 'For big enough x, eˣ outruns x², x³, even x¹⁰⁰. Growth proportional to current size always wins the long game.' },
                  { s: 'ln(x) flattens out and approaches a maximum height.', t: false, why: 'It grows forever — just very slowly. It has no horizontal asymptote and eventually passes ANY height.' },
                  { s: 'Wherever f′(x) = 0, the function has a max or a min.', t: false, why: 'y = x³ at x = 0: the slope is 0 but it is a flat S-bend (an inflection), not a peak or valley. Zero slope is necessary, not sufficient.' },
                  { s: 'Shifting a graph up can change how many roots it has.', t: true, why: 'Raise y = x² − 1 by one unit and its two roots merge into one; raise it more and they vanish. Vertical shifts move the axis crossings.' },
                  { s: '√x is just x² in reverse, so its graph is a full parabola.', t: false, why: 'It is HALF a sideways parabola — the square root only returns the non-negative answer, so the graph starts at the edge and goes one way.' }
                ]
              };
              function mythBankForBand() { return FG_MYTHS[gradeBand === 'K-2' ? '3-5' : gradeBand] || FG_MYTHS['6-8']; }

              function makeMythQuiz() {
                var bank = mythBankForBand();
                var lastIdx = typeof d.fgLastMythIdx === 'number' ? d.fgLastMythIdx : -1;
                var mi = Math.floor(Math.random() * bank.length);
                if (mi === lastIdx) mi = (mi + 1) % bank.length; // avoid immediate repeat
                var m = bank[mi];
                return { mode: 'myth', mythIdx: mi, s: m.s, answer: m.t, why: m.why, opts: [true, false], answered: false };
              }

              // Evaluate a quiz's stored function at x — powers the diagnostic feedback
              function evalQ(q, x) {
                if (q.type === 'linear') return q.a * x + q.b;
                if (q.type === 'quadratic') return q.a * x * x + q.b * x + q.c;
                if (q.type === 'cubic') return q.a * x * x * x + q.b * x + q.c;
                return NaN;
              }

              // ── Corrective feedback: explain WHY, not just reveal the answer ──
              // Wrong answers get a diagnosis of the mistake (e.g. "f(your pick) isn't 0");
              // right answers get a one-line reinforcement of the underlying rule.
              function buildFeedback(q, chosen, correct) {
                if (q.mode === 'myth') {
                  return (q.answer ? 'TRUE' : 'FALSE') + ' — ' + q.why;
                }
                if (q.mode === 'root') {
                  if (correct) return 'f(' + chosen + ') = 0 — the curve crosses the x-axis exactly there.';
                  var fAt = evalQ(q, chosen);
                  return 'A root is where the curve meets the x-axis — where f(x) = 0. It may cross or just touch. At your pick x = ' + chosen + ', f(' + chosen + ') = ' + (isFinite(fAt) ? Math.round(fAt * 100) / 100 : '?') + ', not 0. Look where the curve meets the axis: x = ' + (q.answers ? q.answers.join(' or x = ') : q.answer) + '.';
                }
                if (q.mode === 'yint') {
                  if (correct) return 'f(0) = ' + q.answer + ' — the y-intercept is always just the function evaluated at x = 0.';
                  return 'The y-intercept is f(0): set x = 0 and every x-term vanishes. What remains is ' + q.answer + '. (You picked ' + chosen + ' — the curve may pass that height, but not at x = 0.)';
                }
                // name mode — chosen is a label string; map it back to its family
                var chosenId = null;
                for (var fk in FG_LABELS) { if (FG_LABELS[fk] === chosen) { chosenId = fk; break; } }
                if (correct) return 'Signature spotted: ' + FG_TRAITS[q.type] + '.';
                return 'You picked ' + chosen + ' — that family shows ' + (chosenId && FG_TRAITS[chosenId] ? FG_TRAITS[chosenId] : 'a different shape') + '. This graph instead shows ' + FG_TRAITS[q.type] + '.';
              }

              // Start a challenge based on the current mode

              function startChallenge() {

                var q;

                if (challengeMode === 'root') { q = makeRootQuiz(); }

                else if (challengeMode === 'yint') { q = makeYIntQuiz(); }

                else if (challengeMode === 'myth') { q = makeMythQuiz(); upd('fgLastMythIdx', q.mythIdx); }

                else { q = makeFgQuiz(); }

                upd('fgQuiz', q);

                if (q.a !== undefined) upd('a', q.a);

                if (q.b !== undefined) upd('b', q.b);

                if (q.c !== undefined) upd('c', q.c);

                if (q.type) upd('type', q.type);

              }



              // Challenge mode buttons

              var CHALLENGE_MODES = [

                { id: 'name', label: __alloT('stem.funcgrapher.name_that_graph', '🎯 Name That Graph'), color: 'violet' },

                { id: 'root', label: __alloT('stem.funcgrapher.find_the_root', '📍 Find the Root'), color: 'red' },

                { id: 'yint', label: __alloT('stem.funcgrapher.y_intercept_3', '🟢 Y-Intercept?'), color: 'emerald' },

                { id: 'myth', label: __alloT('stem.funcgrapher.true_or_false', '🧠 True or False?'), color: 'amber' }

              ];



              // Prompt text per mode

              var promptText = challengeMode === 'root' ? 'What is one root (x-intercept) of this function?'

                : challengeMode === 'yint' ? 'What is the y-intercept of this function?'

                  : challengeMode === 'myth' ? ((fgQuiz && fgQuiz.mode === 'myth') ? '“' + fgQuiz.s + '”' : 'True or false?')

                    : 'What type of function is graphed above?';



              return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3 mb-2" },

                // Mode selector row

                React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mb-2" },

                  CHALLENGE_MODES.map(function (cm) {

                    var isActive = challengeMode === cm.id;

                    return React.createElement("button", { key: cm.id, onClick: function () { upd('fgChallengeMode', cm.id); upd('fgQuiz', null); },

                      className: "px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold transition-all " + (isActive ? (({ indigo: 'bg-indigo-700', violet: 'bg-violet-700', red: 'bg-red-700', emerald: 'bg-emerald-700', amber: 'bg-amber-700' }[cm.color]) || 'bg-indigo-700') + ' text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')

                    }, cm.label);

                  }),

                  fgScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-700 ml-auto" }, '⭐ ' + fgScore + ' | 🔥 ' + fgStreak)

                ),

                // Grade-band selector — challenges scale their content to the band
                React.createElement("div", { className: "flex items-center gap-1.5 mb-2", role: "group", "aria-label": __alloT('stem.funcgrapher.challenge_level', "Challenge level") },
                  React.createElement("span", { className: "text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider" }, __alloT('stem.funcgrapher.level', "Level:")),
                  GRADE_BANDS.map(function (gb) {
                    var active = gradeBand === gb;
                    return React.createElement("button", {
                      key: gb,
                      onClick: function () { upd('fgGradeOverride', gb); upd('fgQuiz', null); },
                      "aria-pressed": active,
                      className: "px-2 py-0.5 rounded-full text-[0.625rem] font-bold transition-all " + (active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50')
                    }, gb);
                  })
                ),

                // Start / New Challenge button

                React.createElement("button", { "aria-label": __alloT('stem.funcgrapher.start_challenge', "Start Challenge"),

                  onClick: startChallenge,

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold mb-2 " + (fgQuiz ? 'bg-slate-100 text-slate-600' : 'bg-violet-600 text-white') + " hover:opacity-90 transition-all"

                }, fgQuiz ? '🔄 New Challenge' : '🚀 Start Challenge'),



                // Quiz card

                fgQuiz && !fgQuiz.answered && React.createElement("div", { className: "bg-violet-50 rounded-xl p-3 border border-violet-200" },

                  React.createElement("p", { className: "text-sm font-bold text-violet-800 mb-2" }, promptText),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    fgQuiz.opts.map(function (opt) {

                      var optLabel = fgQuiz.mode === 'myth' ? (opt ? '\u2705 True' : '\u274C False')
                        : challengeMode === 'name' ? opt
                          : (challengeMode === 'yint' ? 'y = ' + opt : 'x = ' + opt);

                      return React.createElement("button", { "aria-label": "Select answer: " + (fgQuiz.mode === 'myth' ? (opt ? 'True' : 'False') : String(opt)),

                        key: String(opt), onClick: function () {

                          // Root questions can have TWO correct answers (either root of a quadratic)
                          var correct = fgQuiz.answers ? fgQuiz.answers.indexOf(opt) >= 0 : opt === fgQuiz.answer;

                          var fb = buildFeedback(fgQuiz, opt, correct);

                          upd('fgQuiz', Object.assign({}, fgQuiz, { answered: true, chosen: opt, correct: correct, fb: fb }));

                          upd('fgScore', fgScore + (correct ? 1 : 0));

                          upd('fgStreak', correct ? fgStreak + 1 : 0);

                          if (fgQuiz.mode === 'myth') upd('fgMythsDone', (d.fgMythsDone || 0) + 1);

                          if (typeof announceToSR === 'function') announceToSR((correct ? 'Correct. ' : 'Not quite. ') + fb);

                          if (correct) {

                            addToast('\u2705 Correct! +5 XP', 'success');

                            if (typeof awardStemXP === 'function') awardStemXP('funcGrapher', 5, 'Function Grapher challenge');

                            // Streak bonus at 5
                            if (fgStreak + 1 >= 5 && (fgStreak + 1) % 5 === 0) {
                              addToast('\uD83D\uDD25 ' + (fgStreak + 1) + '-streak! +10 bonus XP', 'success');
                              if (typeof awardStemXP === 'function') awardStemXP('funcGrapher', 10, 'Function Grapher streak bonus');
                            }

                            // Auto-advance \u2014 except in myth mode, where the "why" deserves a read
                            if (fgQuiz.mode !== 'myth') setTimeout(function () { startChallenge(); }, 2200);

                          } else {

                            addToast('\u274C Not quite \u2014 see why below', 'error');

                          }

                        }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all"

                      }, optLabel);

                    })

                  )

                ),

                // Result card \u2014 headline + corrective explanation (the pedagogy payload)

                fgQuiz && fgQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl " + (fgQuiz.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'), role: "status" },

                  React.createElement("p", { className: "text-sm font-bold mb-1 " + (fgQuiz.correct ? 'text-emerald-700' : 'text-red-700') },
                    fgQuiz.correct ? '\u2705 Correct! +5 XP' : '\u274C Not quite'
                  ),

                  fgQuiz.fb && React.createElement("p", { className: "text-xs leading-relaxed " + (fgQuiz.correct ? 'text-emerald-800' : 'text-red-800') }, fgQuiz.fb)

                )

              );

            })(),

            React.createElement("button", { "aria-label": __alloT('stem.funcgrapher.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'fg-' + Date.now(), tool: 'funcGrapher', label: d.type + ': a=' + d.a + ' b=' + d.b, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, __alloT('stem.funcgrapher.snapshot_2', "\uD83D\uDCF8 Snapshot")),

            // ── AI Function Tutor (reading-level aware) ──
            (function () {
              var aiLevel = d.aiLevel || 'grade5';
              // Own state key: sharing d.aiExplain with the "Explain This Graph" button
              // above made each panel display the other's output.
              var aiText = d.aiTutorText || '';
              var aiLoading = !!d.aiLoading;
              var aiError = d.aiError || '';
              var LEVELS = [
                { id: 'plain', label: __alloT('stem.funcgrapher.plain', 'Plain'), hint: __alloT('stem.funcgrapher.using_simple_everyday_words_and_short_', 'using simple everyday words and short sentences, no jargon') },
                { id: 'grade5', label: __alloT('stem.funcgrapher.grade_5', 'Grade 5'), hint: __alloT('stem.funcgrapher.for_a_5th_grade_student', 'for a 5th grade student') },
                { id: 'hs', label: __alloT('stem.funcgrapher.high_school', 'High School'), hint: __alloT('stem.funcgrapher.for_a_high_school_algebra_or_pre_calc_', 'for a high school algebra or pre-calc student, including vocabulary like slope, intercept, vertex, period, amplitude') }
              ];
              function explain() {
                if (typeof callGemini !== 'function') { upd('aiError', 'AI tutor not available.'); return; }
                upd('aiLoading', true); upd('aiError', ''); upd('aiTutorText', '');
                var lv = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];
                var fnDesc = d.type === 'linear' ? 'y = ' + d.a + 'x + ' + d.b
                  : d.type === 'quadratic' ? 'y = ' + d.a + 'x\u00B2 + ' + d.b + 'x + ' + d.c
                  : d.type === 'trig' ? 'y = ' + d.a + ' sin(' + d.b + 'x + ' + d.c + ')'
                  : d.type === 'cubic' ? 'y = ' + d.a + 'x\u00B3 + ' + d.b + 'x + ' + d.c
                  : d.type === 'exponential' ? 'y = ' + d.a + ' e^(' + d.b + 'x) + ' + d.c
                  : 'y = ' + d.a + ' |x + ' + d.b + '| + ' + d.c;
                var prompt = 'Explain this function ' + lv.hint + '. '
                  + 'Function: ' + fnDesc + '. Type: ' + d.type + '. '
                  + 'In 3 short sentences: (1) What the graph looks like. (2) Which coefficient changes the graph in what way. (3) One real-world situation this function models. '
                  + 'No markdown, no bullets, no headings. Plain prose.';
                callGemini(prompt, false, false, 0.5).then(function (resp) {
                  upd('aiTutorText', String(resp || '').trim()); upd('aiLoading', false);
                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.funcgrapher.sr_explanation_ready', 'Explanation ready.'));
                }).catch(function () {
                  upd('aiLoading', false); upd('aiError', 'Could not reach AI tutor. Try again in a moment.');
                });
              }
              return React.createElement("div", { className: "mt-3 p-3 rounded-xl border-2 border-purple-200 bg-purple-50", role: "region", },
                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-1.5" },
                  React.createElement("span", { className: "text-sm font-bold text-purple-700" }, __alloT('stem.funcgrapher.explain_at_my_level', "\u2728 Explain at my level")),
                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": __alloT('stem.funcgrapher.reading_level', "Reading level") },
                    LEVELS.map(function (L) {
                      var active = aiLevel === L.id;
                      return React.createElement("button", {
                        key: L.id,
                        onClick: function () { upd('aiLevel', L.id); },
                        "aria-label": "Reading level: " + L.label + (active ? " (selected)" : ""),
                        "aria-pressed": active,
                        className: "px-2 py-0.5 rounded text-[0.625rem] font-bold " + (active ? 'bg-purple-600 text-white' : 'bg-white text-purple-700 border border-purple-600 hover:bg-purple-100')
                      }, L.label);
                    })
                  ),
                  React.createElement("button", {
                    onClick: explain,
                    disabled: aiLoading,
                    "aria-label": "Generate AI explanation at " + ((LEVELS.find(function (L) { return L.id === aiLevel; }) || {}).label || 'Grade 5') + " level",
                    className: "px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  }, aiLoading ? '\u23F3 Thinking...' : (aiText ? '\uD83D\uDD04 Re-explain' : '\uD83E\uDDE0 Explain'))
                ),
                aiError && React.createElement("p", { className: "text-[0.6875rem] text-rose-600", role: "alert" }, aiError),
                aiText && React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed bg-white rounded-lg p-2 border border-purple-100" }, aiText),
                !aiText && !aiLoading && !aiError && React.createElement("p", { className: "text-[0.6875rem] italic text-slate-600" }, __alloT('stem.funcgrapher.click_explain_for_the_ai_tutor_to_desc', "Click \u201CExplain\u201D for the AI tutor to describe this function at your chosen reading level."))
              );
            })(),

            // \u2550\u2550\u2550 FUNCTION ZOO \u2550\u2550\u2550
            React.createElement('div', { className: 'mt-5 rounded-2xl border border-indigo-300 bg-white p-3 shadow-sm' },
              React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                React.createElement('span', { className: 'text-lg' }, '\uD83D\uDCCA'),
                React.createElement('h3', { className: 'text-sm font-bold text-indigo-700' }, __alloT('stem.funcgrapher.function_zoo_six_common_function_shape', 'Function Zoo \u2014 Six common function shapes'))
              ),
              React.createElement('div', { className: 'rounded-xl overflow-hidden border border-indigo-200', style: { background: '#020210', aspectRatio: '16/6' } },
                React.createElement('p', { id: 'funcgrapher-zoo-description', className: typeof srOnly === 'string' ? srOnly : 'sr-only', style: srOnly && typeof srOnly === 'object' ? srOnly : undefined }, 'Six coordinate plots compare common function shapes: linear is a straight rising line, quadratic is a U-shaped curve, cubic is an S-shaped curve, exponential rises increasingly quickly, logarithmic rises increasingly slowly, and sine repeats in a wave.'),
                React.createElement('canvas', {
                  role: 'img',
                  'aria-label': __alloT('stem.funcgrapher.a11y_function_zoo_comparison_of_six_common_function', 'Function Zoo comparison of six common function shapes'),
                  'aria-describedby': 'funcgrapher-zoo-description',
                  'data-a11y-static': 'true',
                  ref: function(cvEl) {
                    if (!cvEl) return;
                    if (cvEl._fzAnim) return;
                    var c2 = cvEl.getContext('2d');
                    var W = cvEl.offsetWidth || 600;
                    var H = cvEl.offsetHeight || 220;
                    cvEl.width = W * 2; cvEl.height = H * 2;
                    c2.scale(2, 2);
                    var start = performance.now();
                    function drawFz() {
                      if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._fzAnim); return; }
                      var t = (performance.now() - start) / 1000;
                      c2.fillStyle = '#020210';
                      c2.fillRect(0, 0, W, H);
                      var funcs = [
                        { name: __alloT('stem.funcgrapher.linear', 'Linear'), f: function(x) { return x; }, color: '#7dd3fc' },
                        { name: __alloT('stem.funcgrapher.quadratic', 'Quadratic'), f: function(x) { return x * x / 4; }, color: '#fbbf24' },
                        { name: __alloT('stem.funcgrapher.cubic', 'Cubic'), f: function(x) { return x * x * x / 16; }, color: '#10b981' },
                        { name: __alloT('stem.funcgrapher.exponential', 'Exponential'), f: function(x) { return Math.exp(x / 3) - 1; }, color: '#dc2626' },
                        { name: 'Log', f: function(x) { return x > 0 ? Math.log(x + 1) * 2 : -Math.log(-x + 1) * 2; }, color: '#a78bfa' },
                        { name: __alloT('stem.funcgrapher.sine', 'Sine'), f: function(x) { return Math.sin(x); }, color: '#f472b6' }
                      ];
                      var cols = 3, rows = 2;
                      var cellW = W / cols, cellH = H / rows;
                      funcs.forEach(function(fn, fi) {
                        var col = fi % cols;
                        var row = Math.floor(fi / cols);
                        var ox = col * cellW + cellW / 2;
                        var oy = row * cellH + cellH / 2;
                        // Axes
                        c2.strokeStyle = '#475569'; c2.lineWidth = 1;
                        c2.beginPath();
                        c2.moveTo(ox - cellW * 0.4, oy); c2.lineTo(ox + cellW * 0.4, oy);
                        c2.moveTo(ox, oy - cellH * 0.4); c2.lineTo(ox, oy + cellH * 0.4);
                        c2.stroke();
                        // Curve — neon glow per function color + a light bead tracing it
                        c2.save();
                        c2.shadowColor = fn.color; c2.shadowBlur = 7;
                        c2.strokeStyle = fn.color; c2.lineWidth = 2;
                        c2.beginPath();
                        for (var x = -cellW * 0.4; x <= cellW * 0.4; x++) {
                          var xv = x / 12;
                          var yv = fn.f(xv);
                          var py = oy - yv * 8;
                          if (x === -Math.floor(cellW * 0.4)) c2.moveTo(ox + x, py);
                          else c2.lineTo(ox + x, py);
                        }
                        c2.stroke();
                        // Light bead sweeping along the curve (stays within the cell)
                        var beadX = -cellW * 0.4 + ((t * 0.22 + fi * 0.13) % 1) * cellW * 0.8;
                        var beadY = oy - fn.f(beadX / 12) * 8;
                        if (beadY > oy - cellH * 0.46 && beadY < oy + cellH * 0.46) {
                          c2.shadowBlur = 10; c2.fillStyle = '#ffffff';
                          c2.beginPath(); c2.arc(ox + beadX, beadY, 2.3, 0, Math.PI * 2); c2.fill();
                        }
                        c2.restore();
                        // Label
                        c2.font = 'bold 9px sans-serif'; c2.fillStyle = fn.color; c2.textAlign = 'center';
                        c2.fillText(fn.name, ox, oy + cellH * 0.45);
                      });
                    }
                    cvEl._fzAnim = 1;
                    drawFz();
                    var ro = new ResizeObserver(function() {
                      if (!cvEl.isConnected) { ro.disconnect(); return; }
                      W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                      cvEl.width = W * 2; cvEl.height = H * 2; c2.scale(2, 2); drawFz();
                    });
                    ro.observe(cvEl);
                  },
                  style: { width: '100%', height: '100%', display: 'block' }
                })
              )
            ),
            // Wave investigation: linked representations and visible comparison evidence.
            (function() {
              var iq = d._waveHunt || {};
              function setIQ(patch) { upd('_waveHunt', Object.assign({}, iq, patch)); }
              function bounded(value, fallback, min, max) { return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback; }
              var current = { a: bounded(iq.amp, 1, -3, 3), f: bounded(iq.freq, 1, 0, 3), p: bounded(iq.phase, 0, -3.2, 3.2) };
              function keyFor(record) { return [record.a, record.f, record.p].map(function(v) { return Number(v.toPrecision(12)); }).join('|'); }
              function display(value) { return String(Number(value.toFixed(2))); }
              function equation(record) { return 'y = ' + display(record.a) + ' sin(' + display(record.f) + 'x ' + (record.p < 0 ? '− ' : '+ ') + display(Math.abs(record.p)) + ')'; }
              function valueAt(record, x) { return record.a * Math.sin(record.f * x + record.p); }
              function constant(record) { return record.a === 0 || record.f === 0; }
              var records = [], seen = {};
              (Array.isArray(iq.log) ? iq.log : []).forEach(function(entry) {
                if (!entry || (typeof entry.p !== 'number' && typeof entry.p !== 'string') || String(entry.p).trim() === '') return;
                var record = { a: entry.a, f: entry.f, p: Number(entry.p) };
                if (![record.a, record.f, record.p].every(Number.isFinite) || Math.abs(record.a) > 3 || record.f < 0 || record.f > 3 || Math.abs(record.p) > 3.2) return;
                var key = keyFor(record);
                if (!seen[key]) { seen[key] = true; records.push(record); }
              });
              records = records.slice(-8);
              var currentKey = keyFor(current), savedIndex = records.findIndex(function(record) { return keyFor(record) === currentKey; });
              var reference = records.find(function(record) { return keyFor(record) === iq.referenceKey; }) || records[0] || null;
              var referenceKey = reference ? keyFor(reference) : '';
              var referenceIndex = reference ? records.indexOf(reference) : -1;
              var changed = reference ? ['a', 'f', 'p'].filter(function(key) { return Math.abs(current[key] - reference[key]) > 1e-10; }) : [];
              var symbols = { a: 'a', f: 'b', p: 'φ' };
              var isConstant = constant(current), period = isConstant ? null : 2 * Math.PI / current.f, shift = isConstant ? null : -current.p / current.f;
              var focusOptions = [
                { id: 'height', control: 'amp', label: __alloT('stem.funcgrapher.wave_focus_height', 'Height'), question: __alloT('stem.funcgrapher.wave_height_question', 'How does a change the height and orientation? Keep b and φ fixed.') },
                { id: 'spacing', control: 'freq', label: __alloT('stem.funcgrapher.wave_focus_spacing', 'Spacing'), question: __alloT('stem.funcgrapher.wave_spacing_question', 'How does b change the distance between repeats? Keep a and φ fixed.') },
                { id: 'shift', control: 'phase', label: __alloT('stem.funcgrapher.wave_focus_shift', 'Shift'), question: __alloT('stem.funcgrapher.wave_shift_question', 'Which direction does the wave move as φ increases? Keep a and b fixed.') }
              ];
              var focus = focusOptions.find(function(option) { return option.id === iq.focus; }) || focusOptions[0];
              var panel = 'var(--allo-stem-panel,#fff)', ink = 'var(--allo-stem-text,#0f172a)', softInk = 'var(--allo-stem-text-soft,#475569)';
              var curveInk = ctx.isContrast ? '#ffff00' : isDark ? '#a5b4fc' : '#4338ca';
              var fieldStyle = { width: '100%', minWidth: 0, background: panel, color: ink, border: '1px solid ' + softInk, borderRadius: 6, padding: 8, fontSize: 13 };
              var buttonStyle = { minHeight: 44, padding: '6px 12px', borderRadius: 7, border: '1px solid ' + softInk, background: panel, color: ink, fontSize: 13, cursor: 'pointer' };
              var xLeft = -2 * Math.PI, xRight = 2 * Math.PI;
              function sx(x) { return 32 + (x - xLeft) / (xRight - xLeft) * 392; }
              function sy(y) { return 212 - (y + 3.5) / 7 * 192; }
              function pathFor(record) {
                var path = '';
                for (var i = 0; i <= 320; i++) {
                  var x = xLeft + (xRight - xLeft) * i / 320;
                  path += (i ? ' L' : 'M') + sx(x).toFixed(2) + ',' + sy(valueAt(record, x)).toFixed(2);
                }
                return path;
              }
              function saveSetting() {
                if (savedIndex >= 0) return;
                var nextRecords = records.concat([current]).slice(-8);
                var nextReference = nextRecords.some(function(record) { return keyFor(record) === referenceKey; }) ? referenceKey : keyFor(nextRecords[0]);
                setIQ({ log: nextRecords, referenceKey: nextReference, showLog: true });
              }
              var savedLabel = __alloT('stem.funcgrapher.wave_saved_setting', 'Saved setting');
              var comparison = !reference ? __alloT('stem.funcgrapher.wave_start_comparison', 'Save a starting setting, then move one slider to compare the curves.') : changed.length === 0 ? __alloT('stem.funcgrapher.wave_same_settings', 'The current parameters match the saved reference.') : changed.length === 1 ? __alloT('stem.funcgrapher.wave_one_change', 'One parameter changed: ') + symbols[changed[0]] + '. ' + __alloT('stem.funcgrapher.wave_held_fixed', 'Held fixed: ') + ['a', 'f', 'p'].filter(function(key) { return key !== changed[0]; }).map(function(key) { return symbols[key]; }).join(', ') + '.' : __alloT('stem.funcgrapher.wave_multiple_changes', 'Several parameters changed. Restore the reference and change one slider to isolate its effect.');
              return h('section', { 'data-wave-investigation': true, 'aria-labelledby': 'wave-investigation-title', className: 'mt-3 p-3 rounded-xl space-y-3', style: { background: panel, color: ink, border: '1px solid ' + softInk } },
                h('h3', { id: 'wave-investigation-title', className: 'text-base font-bold' }, __alloT('stem.funcgrapher.wave_investigation_title', 'Wave investigation')),
                h('p', { className: 'text-sm' }, __alloT('stem.funcgrapher.wave_investigation_intro', 'Explore y = a sin(bx + φ). Save a setting and change one parameter; the dashed curve keeps your reference visible.')),
                h('div', { role: 'group', 'aria-label': __alloT('stem.funcgrapher.wave_focus_label', 'Choose a wave investigation'), className: 'flex flex-wrap gap-2' },
                  focusOptions.map(function(option) { return h('button', { key: option.id, type: 'button', 'aria-pressed': option.id === focus.id, onClick: function() { setIQ({ focus: option.id }); }, style: Object.assign({}, buttonStyle, { fontWeight: option.id === focus.id ? 800 : 400, borderWidth: option.id === focus.id ? 2 : 1 }) }, option.label); })),
                h('p', { 'data-wave-question': focus.id, className: 'text-sm font-bold' }, focus.question),
                h('div', { 'data-wave-model-controls': true, style: { display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'start' } },
                h('figure', { style: { margin: 0, flex: '2 1 440px', minWidth: 0 } },
                  h('div', { 'data-wave-equation': true, className: 'text-sm font-mono font-bold mb-2' }, equation(current)),
                  h('svg', { viewBox: '0 0 440 240', role: 'img', 'aria-label': __alloT('stem.funcgrapher.wave_plot_description', 'Wave plot linked to a, b, and φ. Solid curve: ') + equation(current) + (reference && iq.showReference !== false ? '. ' + savedLabel + ' ' + (referenceIndex + 1) + ': ' + equation(reference) : ''), style: { width: '100%', display: 'block' } },
                    h('rect', { x: 32, y: 20, width: 392, height: 192, fill: 'none', stroke: softInk, opacity: 0.45 }),
                    [-3, 0, 3].map(function(y) { return h('g', { key: y }, h('line', { x1: 32, x2: 424, y1: sy(y), y2: sy(y), stroke: softInk, opacity: y === 0 ? 0.85 : 0.25 }), h('text', { x: 26, y: sy(y) + 5, textAnchor: 'end', fontSize: 16, fill: ink }, y)); }),
                    [-Math.PI * 2, -Math.PI, 0, Math.PI, Math.PI * 2].map(function(x) { return h('line', { key: x, x1: sx(x), x2: sx(x), y1: 20, y2: 212, stroke: softInk, opacity: x === 0 ? 0.85 : 0.2 }); }),
                    reference && iq.showReference !== false && h('path', { 'data-wave-reference': referenceKey, d: pathFor(reference), fill: 'none', stroke: softInk, strokeWidth: 3, strokeDasharray: '8 6' }),
                    h('path', { 'data-wave-current': true, d: pathFor(current), fill: 'none', stroke: curveInk, strokeWidth: 3 }),
                    h('circle', { cx: sx(0), cy: sy(valueAt(current, 0)), r: 4, fill: curveInk, stroke: panel, strokeWidth: 1.5 })),
                  h('div', { 'aria-hidden': true, className: 'flex justify-between text-xs', style: { margin: '-8px 3.6% 6px 7.3%' } }, ['−2π', '−π', '0', 'π', '2π'].map(function(label) { return h('span', { key: label }, label); })),
                  h('figcaption', { className: 'text-xs', style: { color: softInk } }, __alloT('stem.funcgrapher.wave_plot_window', 'Fixed window: x from −2π to 2π radians, y from −3.5 to 3.5.')),
                  h('p', { 'data-wave-zero-value': valueAt(current, 0), className: 'text-sm mt-1' }, __alloT('stem.funcgrapher.wave_at_zero', 'At x = 0, y ≈ ') + valueAt(current, 0).toFixed(3))),
                h('div', { className: 'grid grid-cols-1 gap-3', style: { flex: '1 1 240px', minWidth: 0 } },
                  [{ k: 'amp', symbol: 'a', label: __alloT('stem.funcgrapher.wave_vertical_multiplier', 'Vertical multiplier a'), value: current.a, min: -3, max: 3 },
                   { k: 'freq', symbol: 'b', label: __alloT('stem.funcgrapher.wave_inside_multiplier', 'Inside multiplier b'), value: current.f, min: 0, max: 3 },
                   { k: 'phase', symbol: 'φ', label: __alloT('stem.funcgrapher.wave_phase_radians', 'Phase φ (radians)'), value: current.p, min: -3.2, max: 3.2 }].map(function(control) {
                    return h('div', { key: control.k, style: { padding: 8, borderRadius: 7, border: (focus.control === control.k ? '2px solid ' : '1px solid ') + softInk } },
                      h('label', { htmlFor: 'wa-' + control.k, className: 'block text-sm font-bold' }, control.label + ': ' + display(control.value)),
                      h('input', { id: 'wa-' + control.k, type: 'range', min: control.min, max: control.max, step: 0.1, value: control.value, 'aria-label': control.label, onChange: function(e) { var patch = {}; patch[control.k] = Number(e.target.value); setIQ(patch); }, style: { width: '100%', minHeight: 28, accentColor: curveInk } })); }))),
                h('div', { 'data-wave-measures': true, className: 'grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm' },
                  h('p', null, __alloT('stem.funcgrapher.wave_amplitude_measure', 'Amplitude: '), h('strong', { 'data-wave-amplitude': isConstant ? 0 : Math.abs(current.a) }, display(isConstant ? 0 : Math.abs(current.a)))),
                  h('p', null, __alloT('stem.funcgrapher.wave_period_measure', 'Period: '), h('strong', { 'data-wave-measure': 'period', 'data-wave-period': period }, period === null ? __alloT('stem.funcgrapher.wave_no_fundamental_period', 'No fundamental period') : '≈ ' + period.toFixed(2))),
                  h('p', null, __alloT('stem.funcgrapher.wave_shift_measure', 'Horizontal shift: '), h('strong', { 'data-wave-measure': 'shift', 'data-wave-shift': shift }, shift === null ? __alloT('stem.funcgrapher.wave_shift_not_unique', 'Not unique') : '≈ ' + shift.toFixed(2)))),
                h('p', { 'data-wave-meaning': true, className: 'text-sm' }, isConstant ? __alloT('stem.funcgrapher.wave_constant_meaning', 'This is a constant function: no oscillation, no fundamental period, and no unique horizontal shift.') : __alloT('stem.funcgrapher.wave_formula_meaning', 'Amplitude is |a|, period is 2π/b, and one horizontal shift is −φ/b. Negative a reflects the wave across y = 0. A negative shift moves it left.')),
                !isConstant && period > xRight - xLeft && h('p', { className: 'text-xs' }, __alloT('stem.funcgrapher.wave_long_period', 'A full period extends beyond this window.')),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { type: 'button', onClick: saveSetting, disabled: savedIndex >= 0, style: Object.assign({}, buttonStyle, { cursor: savedIndex >= 0 ? 'default' : 'pointer' }) }, savedIndex >= 0 ? __alloT('stem.funcgrapher.wave_already_saved', 'Already saved as setting ') + (savedIndex + 1) : __alloT('stem.funcgrapher.wave_save_setting', 'Save setting')),
                  h('button', { type: 'button', onClick: function() { setIQ({ amp: 1, freq: 1, phase: 0, log: [], referenceKey: '', showReference: true, showLog: true, hypothesis: '', understood: false, explanation: '', focus: 'height' }); }, style: buttonStyle }, __alloT('stem.funcgrapher.wave_reset_investigation', 'Reset investigation'))),
                reference && h('div', { className: 'space-y-2' },
                  h('label', { htmlFor: 'wave-reference-select', className: 'block text-sm font-bold' }, __alloT('stem.funcgrapher.wave_compare_with', 'Compare with')),
                  h('select', { id: 'wave-reference-select', value: referenceKey, onChange: function(e) { setIQ({ referenceKey: e.target.value }); }, style: fieldStyle }, records.map(function(record, index) { return h('option', { key: keyFor(record), value: keyFor(record) }, savedLabel + ' ' + (index + 1) + ': a=' + display(record.a) + ', b=' + display(record.f) + ', φ=' + display(record.p)); })),
                  h('label', { className: 'flex items-center gap-2 text-sm', style: { minHeight: 44 } }, h('input', { type: 'checkbox', checked: iq.showReference !== false, onChange: function(e) { setIQ({ showReference: e.target.checked }); }, style: { width: 24, height: 24, margin: 0, flexShrink: 0 } }), __alloT('stem.funcgrapher.wave_show_reference', 'Show saved reference (dashed)')),
                  h('button', { type: 'button', onClick: function() { setIQ({ amp: reference.a, freq: reference.f, phase: reference.p }); }, style: buttonStyle }, __alloT('stem.funcgrapher.wave_restore_reference', 'Restore reference'))),
                h('p', { 'data-wave-comparison': true, role: 'status', className: 'text-sm' }, comparison),
                reference && h('div', null,
                  h('button', { type: 'button', 'aria-expanded': iq.showLog !== false, 'aria-controls': 'wave-saved-settings', onClick: function() { setIQ({ showLog: iq.showLog === false }); }, style: buttonStyle }, __alloT('stem.funcgrapher.wave_saved_settings', 'Saved settings') + ' (' + records.length + '/8)'),
                  h('ol', { id: 'wave-saved-settings', hidden: iq.showLog === false, className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2', style: { listStyle: 'none', padding: 0, display: iq.showLog === false ? 'none' : undefined } }, records.map(function(record, index) { return h('li', { key: keyFor(record), 'data-wave-record': keyFor(record), className: 'p-2 rounded text-sm', style: { border: '1px solid ' + softInk } }, h('strong', null, savedLabel + ' ' + (index + 1)), h('p', { className: 'font-mono' }, equation(record)), h('p', null, __alloT('stem.funcgrapher.wave_at_zero', 'At x = 0, y ≈ ') + valueAt(record, 0).toFixed(3))); })),
                  h('p', { className: 'text-xs mt-1' }, __alloT('stem.funcgrapher.wave_record_limit', 'Keeps the latest eight distinct settings. Values shown are rounded.'))),
                h('label', { htmlFor: 'wave-working-explanation', className: 'block text-sm font-bold' }, __alloT('stem.funcgrapher.wave_working_explanation', 'What do you notice?')),
                h('textarea', { id: 'wave-working-explanation', value: typeof iq.hypothesis === 'string' ? iq.hypothesis : '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.funcgrapher.wave_observation_placeholder', 'Compare two settings. Which parameter changed, and what stayed the same?'), style: fieldStyle, rows: 2 }),
                h('label', { className: 'flex items-center gap-2 text-sm', style: { minHeight: 44 } }, h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, style: { width: 24, height: 24, margin: 0, flexShrink: 0 } }), __alloT('stem.funcgrapher.wave_explain_with_evidence', 'Explain using saved settings')),
                iq.understood && h('textarea', { 'aria-label': __alloT('stem.funcgrapher.explanation_input', 'Function grapher explanation'), value: typeof iq.explanation === 'string' ? iq.explanation : '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.funcgrapher.wave_evidence_placeholder', 'Name two saved settings. Use the graph and measurements to explain the effect you observed.'), style: fieldStyle, rows: 3 })
              );
            })()
          )
      })();
    }
  });

  console.log('[StemLab] stem_tool_funcgrapher.js loaded — Function Grapher');
})();
