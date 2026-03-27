window.StemLab = window.StemLab || { registerTool: function(){}, registerModule: function(){} };
(function() {
  'use strict';

  window.StemLab.registerTool('calculus', {
    icon: '\u222B',
    label: 'Calculus',
    desc: 'Visualize Riemann sums, derivatives, and tangent lines for polynomial functions',
    color: 'red',
    category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var announceToSR = ctx.announceToSR;

      return (function() {
        var d = labToolData.calculus || {};

        var upd = function(key, val) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, { [key]: val }) });
          });
        };

        // ── FUNCTION EVALUATION ────────────────────────────────────────────
        // f(x) = a·x² + b·x + c
        var fa = d.a !== undefined ? d.a : 1;
        var fb = d.b !== undefined ? d.b : 0;
        var fc = d.c !== undefined ? d.c : 0;

        var evalF = function(x) { return fa * x * x + fb * x + fc; };
        var evalDeriv = function(x) { return 2 * fa * x + fb; };  // f'(x) = 2ax + b

        // Antiderivative: F(x) = a·x³/3 + b·x²/2 + c·x
        var evalAnti = function(x) {
          return (fa / 3) * x * x * x + (fb / 2) * x * x + fc * x;
        };

        // Exact integral
        var exact = evalAnti(d.xMax) - evalAnti(d.xMin);

        // ── SYMBOLIC STRINGS ──────────────────────────────────────────────
        var fmtTerm = function(coeff, power, isFirst) {
          if (coeff === 0) return '';
          var sign = coeff > 0 ? (isFirst ? '' : '+') : '\u2212';
          var absC = Math.abs(coeff);
          var cStr = absC === 1 && power > 0 ? '' : String(absC);
          if (power === 0) return sign + absC;
          if (power === 1) return sign + cStr + 'x';
          return sign + cStr + 'x\u00B2';
        };

        var buildFStr = function(a, b, c) {
          var parts = [fmtTerm(a, 2, true), fmtTerm(b, 1, a === 0), fmtTerm(c, 0, a === 0 && b === 0)].filter(Boolean);
          return parts.length ? parts.join('') : '0';
        };

        var buildDerivStr = function(a, b) {
          var parts = [fmtTerm(2 * a, 1, true), fmtTerm(b, 0, 2 * a === 0)].filter(Boolean);
          return parts.length ? parts.join('') : '0';
        };

        var buildAntiStr = function(a, b, c) {
          var parts = [];
          if (a !== 0) parts.push((a > 0 ? '' : '\u2212') + (Math.abs(a) === 1 ? '' : Math.abs(a)) + 'x\u00B3/3');
          if (b !== 0) parts.push((b > 0 ? (parts.length ? '+' : '') : '\u2212') + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x\u00B2/2');
          if (c !== 0) parts.push((c > 0 ? (parts.length ? '+' : '') : '\u2212') + Math.abs(c) + 'x');
          return parts.length ? 'F(x) = ' + parts.join('') : 'F(x) = 0';
        };

        var fStr = 'f(x) = ' + buildFStr(fa, fb, fc);
        var derivStr = "f\u2032(x) = " + buildDerivStr(fa, fb);
        var antiStr = buildAntiStr(fa, fb, fc);

        // ── SVG LAYOUT ────────────────────────────────────────────────────
        var W = 440, H = 300, pad = 40;
        var xMin = d.xMin !== undefined ? d.xMin : 0;
        var xMax2 = d.xMax !== undefined ? d.xMax : 3;
        var nRects = d.n || 20;
        var mode = d.mode || 'left';
        var tab = d.tab || 'integral';
        var x0 = d.x0 !== undefined ? d.x0 : Math.round((xMin + xMax2) / 2 * 10) / 10;

        // Dynamic y-range
        var samplePts = Array.from({ length: 60 }, function(_, i) { return evalF(xMin + i / 59 * (xMax2 - xMin)); });
        var yMax = Math.max.apply(null, samplePts.map(Math.abs).concat([1]));
        var xR = { min: xMin - 0.5, max: xMax2 + 0.5 };
        var yR = { min: -yMax * 0.3, max: yMax * 1.3 };

        var toSX = function(x) { return pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2 * pad); };
        var toSY = function(y) { return (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2 * pad); };

        // ── RIEMANN SUM SHAPES ────────────────────────────────────────────
        var dx = (xMax2 - xMin) / nRects;
        var rects = [];
        var area = 0;

        if (mode === 'trapezoid') {
          for (var ti = 0; ti < nRects; ti++) {
            var txi = xMin + ti * dx;
            var tyL = evalF(txi), tyR2 = evalF(txi + dx);
            area += (tyL + tyR2) / 2 * dx;
            rects.push({ x: txi, w: dx, hL: tyL, hR: tyR2, type: 'trap' });
          }
        } else if (mode === 'simpson' && nRects >= 2 && nRects % 2 === 0) {
          for (var si = 0; si < nRects; si += 2) {
            var sx0 = xMin + si * dx;
            var sy0 = evalF(sx0), sy1 = evalF(sx0 + dx), sy2 = evalF(sx0 + 2 * dx);
            area += (sy0 + 4 * sy1 + sy2) * dx / 3;
            rects.push({ x: sx0, w: dx * 2, hL: sy0, hM: sy1, hR: sy2, type: 'simp' });
          }
        } else {
          for (var ri = 0; ri < nRects; ri++) {
            var xi = xMin + ri * dx;
            var yi = mode === 'left' ? evalF(xi) : mode === 'right' ? evalF(xi + dx) : evalF(xi + dx / 2);
            area += yi * dx;
            rects.push({ x: xi, w: dx, h: yi, type: 'rect' });
          }
        }

        var err = Math.abs(area - exact);

        // ── CONVERGENCE DATA ──────────────────────────────────────────────
        var CW = 160, Cpad = 15;
        var convKey = [fa, fb, fc, xMin, xMax2, mode].join(',');
        if (!window._calcConvCache || window._calcConvCache.key !== convKey) {
          var _cd = [];
          for (var cn = 2; cn <= 50; cn += 2) {
            var cdx = (xMax2 - xMin) / cn, carea = 0;
            if (mode === 'trapezoid') {
              for (var cti = 0; cti < cn; cti++) { var cxti = xMin + cti * cdx; carea += (evalF(cxti) + evalF(cxti + cdx)) / 2 * cdx; }
            } else if (mode === 'simpson' && cn % 2 === 0) {
              for (var csi = 0; csi < cn; csi += 2) { var csx = xMin + csi * cdx; carea += (evalF(csx) + 4 * evalF(csx + cdx) + evalF(csx + 2 * cdx)) * cdx / 3; }
            } else {
              for (var cri = 0; cri < cn; cri++) { var cxi2 = xMin + cri * cdx; carea += evalF(mode === 'right' ? cxi2 + cdx : mode === 'midpoint' ? cxi2 + cdx / 2 : cxi2) * cdx; }
            }
            _cd.push({ n: cn, err: Math.abs(carea - exact) });
          }
          window._calcConvCache = { key: convKey, data: _cd };
        }
        var convData = window._calcConvCache.data;
        var convMaxErr = Math.max.apply(null, convData.map(function(c) { return c.err; }).concat([0.001]));
        var convToX = function(n) { return Cpad + ((n - 2) / 48) * (CW - 2 * Cpad); };
        var convToY = function(e) { return 55 - (e / convMaxErr) * 40; };

        // ── CURVE POLYLINE ─────────────────────────────────────────────────
        var curvePts = [];
        for (var cpx = 0; cpx <= W - 2 * pad; cpx += 2) {
          var cx = xR.min + (cpx / (W - 2 * pad)) * (xR.max - xR.min);
          curvePts.push(toSX(cx) + ',' + toSY(evalF(cx)));
        }

        // ── DERIVATIVE TAB: tangent line ───────────────────────────────────
        var slope = evalDeriv(x0);
        var fy0 = evalF(x0);
        var tangentPts = (function() {
          // Extend tangent from x0-1.5 to x0+1.5 (clamped to viewport)
          var left = Math.max(xR.min, x0 - 1.5);
          var right = Math.min(xR.max, x0 + 1.5);
          return toSX(left) + ',' + toSY(slope * (left - x0) + fy0) + ' ' + toSX(right) + ',' + toSY(slope * (right - x0) + fy0);
        })();

        // Secant line for limit demonstration
        var dh = d.secantH !== undefined ? d.secantH : 1.0;
        var secantSlope = dh !== 0 ? (evalF(x0 + dh) - evalF(x0)) / dh : slope;
        var secantPts = (function() {
          var left = Math.max(xR.min, x0 - 1);
          var right = Math.min(xR.max, x0 + dh + 1);
          return toSX(left) + ',' + toSY(secantSlope * (left - x0) + fy0) + ' ' + toSX(right) + ',' + toSY(secantSlope * (right - x0) + fy0);
        })();

        // ── CSS ANIMATIONS ─────────────────────────────────────────────────
        var css = '@keyframes calcPop{0%{transform:scale(0.85);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}' +
          '@keyframes calcCorrect{0%,100%{background:#dcfce7}50%{background:#86efac}}' +
          '@keyframes calcWrong{0%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}100%{transform:translateX(0)}}' +
          '@keyframes calcFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
          '@keyframes spin{to{transform:rotate(360deg)}}';

        // ── MODES ──────────────────────────────────────────────────────────
        var MODES = [
          { id: 'left',      label: t ? t('stem.calculus.left') : 'Left'      },
          { id: 'midpoint',  label: t ? t('stem.calculus.midpoint') : 'Midpoint' },
          { id: 'right',     label: t ? t('stem.calculus.right') : 'Right'     },
          { id: 'trapezoid', label: t ? t('stem.calculus.trapezoid') : 'Trapezoid' },
          { id: 'simpson',   label: "Simpson's" }
        ];

        // ── PRESETS ────────────────────────────────────────────────────────
        var PRESETS = [
          { label: '\u222B x\u00B2 [0,1]',       a: 1,  b: 0, c: 0, xMin: 0, xMax: 1, n: 20, tip: 'Classic! Exact = 1/3 \u2248 0.333' },
          { label: '\u222B x\u00B2 [0,3]',       a: 1,  b: 0, c: 0, xMin: 0, xMax: 3, n: 20, tip: 'Exact = 9' },
          { label: '\u222B 2x [0,5]',             a: 0,  b: 2, c: 0, xMin: 0, xMax: 5, n: 10, tip: 'Linear \u2014 rectangles are exact even with n=1!' },
          { label: '\u222B \u22123 [1,4]',        a: 0,  b: 0, c: 3, xMin: 1, xMax: 4, n: 5,  tip: 'Constant: area = 3\u00D73 = 9 exactly' },
          { label: '\u222B (x\u00B2+2x+1) [0,2]',a: 1,  b: 2, c: 1, xMin: 0, xMax: 2, n: 20, tip: '= (x+1)\u00B2 \u2014 try increasing n to watch convergence' },
          { label: '\u222B \u2212x\u00B2+4 [0,2]',a: -1, b: 0, c: 4, xMin: 0, xMax: 2, n: 25, tip: 'Arch shape \u2014 negative coefficient flips the parabola' },
          { label: '\u222B \u2212x\u00B2+4 [0,2] (max area)',a: -1,b: 0, c: 4, xMin:-2,xMax: 2, n: 20, tip: 'Full arch from \u22122 to 2 \u2014 where does the parabola cross zero?' },
          { label: '\u222B 3x\u00B2 [0,2]',       a: 3,  b: 0, c: 0, xMin: 0, xMax: 2, n: 20, tip: 'Steep curve \u2014 watch Simpson\u2019s rule crush the error!' },
          { label: '\u222B (x\u00B2\u22123x) [1,4]',a: 1, b:-3, c: 0, xMin: 1, xMax: 4, n: 20, tip: 'Mixed pos/neg region \u2014 does the integral change sign?' },
          { label: '\u222B \u22122x+6 [0,3]',      a: 0,  b:-2, c: 6, xMin: 0, xMax: 3, n: 10, tip: 'Decreasing linear \u2014 exact with any n!' },
        ];

        // ── CHALLENGE ENGINE ───────────────────────────────────────────────
        var cq = d.calcQuiz || null;
        var cScore = d.calcScore || 0;
        var cStreak = d.calcStreak || 0;
        var cMode = d.calcChallengeMode || 'estimate';
        var cHint = d.calcHint || '';

        var CALC_CHALLENGES = [
          { id: 'estimate', label: '\uD83C\uDFAF Estimate \u222B', color: 'red' },
          { id: 'method',   label: '\u26A1 Best Method',           color: 'amber' },
          { id: 'minN',     label: '\uD83D\uDD22 Min n',           color: 'blue' },
          { id: 'exact',    label: '\u270F\uFE0F Exact \u222B',    color: 'emerald' },
          { id: 'deriv',    label: '\uD83D\uDCC8 Slope at Point',  color: 'violet' },
        ];

        function makeEstimateQuiz() {
          var qa=[1,-1,2,-2,0][Math.floor(Math.random()*5)];
          var qb=[0,1,2,-1,-2][Math.floor(Math.random()*5)];
          var qc=[0,1,2,-1][Math.floor(Math.random()*4)];
          var qxMin=0, qxMax=[1,2,3][Math.floor(Math.random()*3)];
          var qExact = evalAntiAt(qa,qb,qc,qxMax) - evalAntiAt(qa,qb,qc,qxMin);
          qExact = Math.round(qExact * 100) / 100;
          var opts = [qExact];
          while (opts.length < 4) {
            var off = (Math.floor(Math.random()*5)+1) * (Math.random()<0.5?1:-1);
            var w = Math.round((qExact+off)*100)/100;
            if (opts.indexOf(w) < 0) opts.push(w);
          }
          opts.sort(function(a,b){return a-b;});
          var eq = buildFStr(qa,qb,qc);
          return { mode:'estimate', a:qa, b:qb, c:qc, xMin:qxMin, xMax:qxMax,
            answer:qExact, opts:opts, answered:false,
            question:'\u222B\u2080\u207B\u207B\u207B\u207B'.slice(0,2) + qxMax + ' (' + eq + ') dx = ?' };
        }

        function evalAntiAt(a,b,c,x) { return (a/3)*x*x*x + (b/2)*x*x + c*x; }

        function makeMethodQuiz() {
          var qa=[1,-1,2][Math.floor(Math.random()*3)];
          var qb=[0,1,-1][Math.floor(Math.random()*3)];
          var qc=[0,1][Math.floor(Math.random()*2)];
          var qxMin=0, qxMax=[2,3][Math.floor(Math.random()*2)];
          var qn=[4,6,8][Math.floor(Math.random()*3)];
          var qExact = evalAntiAt(qa,qb,qc,qxMax) - evalAntiAt(qa,qb,qc,qxMin);
          var methods = ['left','right','midpoint','trapezoid','simpson'];
          var errors = {};
          methods.forEach(function(m) {
            var qdx=(qxMax-qxMin)/qn, qarea=0;
            for (var i=0;i<qn;i++) {
              var xi=qxMin+i*qdx;
              if (m==='trapezoid') { qarea+=(qa*xi*xi+qb*xi+qc + qa*(xi+qdx)*(xi+qdx)+qb*(xi+qdx)+qc)/2*qdx; }
              else if (m==='simpson'&&qn%2===0&&i%2===0) { var f0=qa*xi*xi+qb*xi+qc; var f1=qa*(xi+qdx)*(xi+qdx)+qb*(xi+qdx)+qc; var f2=qa*(xi+2*qdx)*(xi+2*qdx)+qb*(xi+2*qdx)+qc; qarea+=(f0+4*f1+f2)*qdx/3; }
              else if (m!=='simpson') { var xs=m==='right'?xi+qdx:m==='midpoint'?xi+qdx/2:xi; qarea+=(qa*xs*xs+qb*xs+qc)*qdx; }
            }
            errors[m]=Math.abs(qarea-qExact);
          });
          var best=methods.reduce(function(a,b){return errors[a]<errors[b]?a:b;});
          var labels={left:'Left Riemann',right:'Right Riemann',midpoint:'Midpoint',trapezoid:'Trapezoidal',simpson:"Simpson's"};
          return {mode:'method',a:qa,b:qb,c:qc,xMin:qxMin,xMax:qxMax,n:qn,answer:best,answerLabel:labels[best],
            opts:methods.map(function(m){return{id:m,label:labels[m]};}),errors:errors,answered:false,
            question:'At n='+qn+', which method gives the smallest error for f(x) = '+buildFStr(qa,qb,qc)+'?'};
        }

        function makeMinNQuiz() {
          var qa=[1,-1,2][Math.floor(Math.random()*3)];
          var qb=[0,1][Math.floor(Math.random()*2)];
          var qc=[0,1][Math.floor(Math.random()*2)];
          var qxMin=0, qxMax=[2,3][Math.floor(Math.random()*2)];
          var threshold=[0.5,0.1,0.05][Math.floor(Math.random()*3)];
          var qExact=evalAntiAt(qa,qb,qc,qxMax)-evalAntiAt(qa,qb,qc,qxMin);
          var minN=2;
          for (var tn=2;tn<=100;tn++) {
            var tdx=(qxMax-qxMin)/tn, tarea=0;
            for (var ti=0;ti<tn;ti++){var txi=qxMin+ti*tdx; tarea+=(qa*txi*txi+qb*txi+qc)*tdx;}
            if(Math.abs(tarea-qExact)<threshold){minN=tn;break;}
          }
          if(minN>50){minN=50;threshold=0.5;}
          var opts=[minN];
          var cands=[minN-4,minN-2,minN+2,minN+4,minN+6,minN*2].filter(function(v){return v>=2&&v<=100&&v!==minN;});
          while(opts.length<4&&cands.length>0){var ci=Math.floor(Math.random()*cands.length);opts.push(cands.splice(ci,1)[0]);}
          opts.sort(function(a,b){return a-b;});
          return {mode:'minN',a:qa,b:qb,c:qc,xMin:qxMin,xMax:qxMax,answer:minN,threshold:threshold,
            opts:opts,answered:false,
            question:'Using Left Riemann sums for f(x) = '+buildFStr(qa,qb,qc)+', what is the smallest n where error < '+threshold+'?'};
        }

        function makeExactQuiz() {
          var qa=[0,1,-1,2][Math.floor(Math.random()*4)];
          var qb=[0,1,2,3,-1][Math.floor(Math.random()*5)];
          var qc=[0,1,2,-1][Math.floor(Math.random()*4)];
          var qxMin=0, qxMax=[1,2,3][Math.floor(Math.random()*3)];
          var qExact=Math.round((evalAntiAt(qa,qb,qc,qxMax)-evalAntiAt(qa,qb,qc,qxMin))*1000)/1000;
          var hParts=[];
          if(qa!==0) hParts.push(qa+'x\u00B3/3');
          if(qb!==0) hParts.push(qb+'x\u00B2/2');
          if(qc!==0) hParts.push(qc+'x');
          return {mode:'exact',a:qa,b:qb,c:qc,xMin:qxMin,xMax:qxMax,answer:qExact,answered:false,
            question:'Use the power rule: \u222B\u2080'+qxMax+' ('+buildFStr(qa,qb,qc)+') dx = ?',
            hint:'Anti-derivative: F(x) = '+(hParts.join(' + ')||'0')+'. Evaluate F('+qxMax+')\u2212F(0).'};
        }

        function makeDerivQuiz() {
          var qa=[1,-1,2,-2,3][Math.floor(Math.random()*5)];
          var qb=[0,1,2,-1,-3][Math.floor(Math.random()*5)];
          var qx=[0,1,2,-1,0.5,3][Math.floor(Math.random()*6)];
          var qSlope = 2*qa*qx + qb;
          var opts=[qSlope];
          while(opts.length<4){
            var off=(Math.floor(Math.random()*4)+1)*(Math.random()<0.5?1:-1);
            var w=qSlope+off;
            if(opts.indexOf(w)<0) opts.push(w);
          }
          opts.sort(function(a,b){return a-b;});
          return {mode:'deriv',a:qa,b:qb,c:0,x0:qx,answer:qSlope,opts:opts,answered:false,
            question:"For f(x) = "+buildFStr(qa,qb,0)+", what is the slope f\u2032("+qx+")?"};
        }

        function startCalcChallenge() {
          var q;
          if (cMode==='method') q=makeMethodQuiz();
          else if (cMode==='minN') q=makeMinNQuiz();
          else if (cMode==='exact') q=makeExactQuiz();
          else if (cMode==='deriv') q=makeDerivQuiz();
          else q=makeEstimateQuiz();
          setLabToolData(function(prev) {
            var patch = { calcQuiz: q, calcHint: '', _calcExactInput: '',
              a: q.a, b: q.b, c: q.c };
            if (q.xMin !== undefined) patch.xMin = q.xMin;
            if (q.xMax !== undefined) patch.xMax = q.xMax;
            if (q.n   !== undefined) patch.n   = q.n;
            if (q.x0  !== undefined) patch.x0  = q.x0;
            return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, patch) });
          });
          stemBeep && stemBeep('click');
        }

        function checkCalcAnswer(chosen) {
          var correct = false;
          if (cMode==='method') correct = chosen === cq.answer;
          else if (cMode==='minN') correct = chosen <= cq.answer+2 && chosen >= cq.answer;
          else if (cMode==='exact') correct = Math.abs(parseFloat(chosen) - cq.answer) < 0.05;
          else if (cMode==='deriv') correct = chosen === cq.answer;
          else correct = chosen === cq.answer;
          var newStreak = correct ? cStreak+1 : 0;
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, {
              calcQuiz: Object.assign({}, prev.calculus.calcQuiz, { answered:true, chosen:chosen, correct:correct }),
              calcScore: (prev.calculus.calcScore||0) + (correct ? 1 : 0),
              calcStreak: newStreak,
              calcHint: correct ? '' : (cq.hint || (cMode==='method' ? 'Best method: '+cq.answerLabel+'. Simpson\u2019s is usually most accurate for polynomials.' : cMode==='minN' ? 'Min n = '+cq.answer+'. More subdivisions = smaller error.' : cMode==='deriv' ? 'Use the power rule: f\u2032(x) = '+buildDerivStr(cq.a,cq.b)+', so f\u2032('+cq.x0+') = '+cq.answer+'.' : 'The answer was '+cq.answer+'. Apply the power rule!'))
            }) });
          });
          if (correct) {
            stemBeep && stemBeep('success');
            if (typeof awardStemXP === 'function') awardStemXP('calculus', 5, cMode+' challenge');
            announceToSR && announceToSR('Correct! Earned 5 XP');
            addToast('\u2705 Correct! +5 XP', 'success');
            if (newStreak >= 3) {
              if (typeof stemCelebrate === 'function') stemCelebrate();
              if (typeof awardStemXP === 'function') awardStemXP('calculus', 5, '3-streak bonus');
              addToast('\uD83D\uDD25 ' + newStreak + '-streak! +5 bonus XP', 'success');
            }
            setTimeout(startCalcChallenge, 2000);
          } else {
            stemBeep && stemBeep('error');
            announceToSR && announceToSR('Incorrect. The answer was ' + cq.answer);
            addToast('\u274C Not quite \u2014 see hint below', 'error');
          }
        }

        // ── SHARED SVG GRAPH ───────────────────────────────────────────────
        var sharedGraph = function(showTangent, showRects) {
          return h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full bg-white rounded-xl border-2 border-red-200 shadow-sm', style: { maxHeight: '300px' } },

            // Grid lines
            (function() {
              var gels = [];
              for (var gx = Math.ceil(xR.min); gx <= xR.max; gx++) {
                var gsx = toSX(gx);
                if (gsx > pad && gsx < W - pad) gels.push(h('line', { key: 'gx'+gx, x1: gsx, y1: pad, x2: gsx, y2: H-pad, stroke: '#f1f5f9', strokeWidth: 0.5 }));
              }
              return gels;
            })(),

            // Axes
            h('line', { x1: pad, y1: toSY(0), x2: W-pad, y2: toSY(0), stroke: '#94a3b8', strokeWidth: 1.5 }),
            h('line', { x1: toSX(0), y1: pad, x2: toSX(0), y2: H-pad, stroke: '#94a3b8', strokeWidth: 1.5 }),
            h('text', { x: W-pad-2, y: toSY(0)-4, fill: '#94a3b8', style: { fontSize: '8px' } }, 'x'),
            h('text', { x: toSX(0)+3, y: pad+8, fill: '#94a3b8', style: { fontSize: '8px' } }, 'y'),

            // Integration bounds (integral tab)
            showRects && h('rect', { x: toSX(xMin), y: pad, width: Math.abs(toSX(xMax2)-toSX(xMin)), height: H-2*pad, fill: 'none', stroke: '#ef4444', strokeWidth: 1, strokeDasharray: '4 2' }),

            // Riemann shapes
            showRects && rects.map(function(r, i) {
              if (r.type === 'trap') {
                var pts = toSX(r.x)+','+toSY(0)+' '+toSX(r.x)+','+toSY(r.hL)+' '+toSX(r.x+r.w)+','+toSY(r.hR)+' '+toSX(r.x+r.w)+','+toSY(0);
                return h('polygon', { key: i, points: pts, fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', strokeWidth: 0.8 });
              }
              if (r.type === 'simp') {
                var sp2 = [toSX(r.x)+','+toSY(0)];
                for (var sp=0; sp<=10; sp++) { var st=sp/10; var spx=r.x+st*r.w; var spy=r.hL*(1-st)*(1-2*st)+4*r.hM*st*(1-st)+r.hR*st*(2*st-1); sp2.push(toSX(spx)+','+toSY(spy)); }
                sp2.push(toSX(r.x+r.w)+','+toSY(0));
                return h('polygon', { key: i, points: sp2.join(' '), fill: 'rgba(168,85,247,0.15)', stroke: '#a855f7', strokeWidth: 0.8 });
              }
              return h('rect', { key: i, x: toSX(r.x), y: r.h>=0?toSY(r.h):toSY(0), width: Math.abs(toSX(r.x+r.w)-toSX(r.x)), height: Math.abs(toSY(r.h)-toSY(0)), fill: 'rgba(239,68,68,0.15)', stroke: '#ef4444', strokeWidth: 0.8 });
            }),

            // Secant line (derivative tab)
            showTangent && dh > 0.05 && h('polyline', { points: secantPts, fill: 'none', stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '5 3' }),

            // Tangent line (derivative tab)
            showTangent && h('polyline', { points: tangentPts, fill: 'none', stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '0' }),

            // Curve
            curvePts.length > 1 && h('polyline', { points: curvePts.join(' '), fill: 'none', stroke: '#1e293b', strokeWidth: 2.5 }),

            // x0 marker (derivative tab)
            showTangent && h('circle', { cx: toSX(x0), cy: toSY(fy0), r: 5, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }),
            showTangent && dh > 0.05 && h('circle', { cx: toSX(x0+dh), cy: toSY(evalF(x0+dh)), r: 4, fill: '#f59e0b', stroke: 'white', strokeWidth: 2 }),

            // Labels
            h('text', { x: W/2, y: H-6, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '9px', fontWeight: 'bold' } },
              showTangent
                ? fStr + "  |  f\u2032(" + x0 + ") = " + slope.toFixed(3)
                : fStr + "  |  \u222B \u2248 " + area.toFixed(4) + "  (n=" + nRects + ", " + mode + ")"
            )
          );
        };

        // ── RENDER ─────────────────────────────────────────────────────────
        return h('div', { className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

          h('style', null, css),

          // Header
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
              h(ArrowLeft, { size: 18, className: 'text-slate-500' })
            ),
            h('h3', { className: 'text-lg font-bold text-slate-800' }, '\u222B Calculus Visualizer'),
            h('span', { className: 'px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full' }, 'INTERACTIVE'),
            cScore > 0 && h('span', { className: 'ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full' }, '\u2B50 ' + cScore + ' | \uD83D\uDD25 ' + cStreak)
          ),

          // Main tabs
          h('div', { className: 'flex gap-0 mb-3 border-b border-slate-200' },
            [['integral', '\u222B Integral'], ['derivative', '\uD83D\uDCC8 Derivative'], ['challenge', '\uD83C\uDFAF Challenge']].map(function(item) {
              return h('button', {
                key: item[0],
                onClick: function() { upd('tab', item[0]); },
                className: 'px-4 py-1.5 text-xs font-bold transition-all ' + (tab === item[0] ? 'border-b-2 border-red-600 text-red-700 -mb-px' : 'text-slate-500 hover:text-slate-700')
              }, item[1]);
            })
          ),

          // ═══ TAB: INTEGRAL ════════════════════════════════════════════
          tab === 'integral' && h('div', { key: 'integral' },

            // Integration method selector
            h('div', { className: 'flex flex-wrap gap-1 mb-3' },
              MODES.map(function(m) {
                return h('button', {
                  key: m.id,
                  onClick: function() { upd('mode', m.id); if (m.id==='simpson' && nRects%2!==0) upd('n', nRects+1); },
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (mode===m.id ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-red-50')
                }, m.label);
              })
            ),

            sharedGraph(false, true),

            // Antiderivative display
            h('div', { className: 'mt-2 bg-red-50 rounded-lg border border-red-100 px-3 py-1.5 flex items-center gap-3 flex-wrap' },
              h('span', { className: 'text-[11px] font-mono font-bold text-red-700' }, antiStr),
              h('span', { className: 'text-slate-300' }, '|'),
              h('span', { className: 'text-[11px] font-mono text-slate-500' },
                'F(' + xMax2 + ')\u2212F(' + xMin + ') = ' + exact.toFixed(4)
              )
            ),

            // Sliders — all 5 controls (a, b, c + bounds + n)
            h('div', { className: 'grid grid-cols-2 gap-2 mt-3' },
              [
                { k: 'a', label: 'a (x\u00B2 coeff)', min: -3, max: 3, step: 0.5 },
                { k: 'b', label: 'b (x coeff)',    min: -5, max: 5, step: 0.5 },
                { k: 'c', label: 'c (constant)',   min: -5, max: 5, step: 0.5 },
                { k: 'xMin', label: 'Lower bound (a)', min: -3, max: 4, step: 0.5 },
                { k: 'xMax', label: 'Upper bound (b)', min: 1,  max: 10, step: 0.5 },
                { k: 'n',    label: 'Subdivisions (n)', min: 2, max: 50, step: mode==='simpson'?2:1 },
              ].map(function(s) {
                return h('div', { key: s.k, className: 'text-center bg-slate-50 rounded-lg p-2 border' },
                  h('label', { className: 'text-[11px] font-bold text-red-600' }, s.label + ': ' + d[s.k]),
                  h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: function(e) { upd(s.k, parseFloat(e.target.value)); }, className: 'w-full accent-red-600' })
                );
              })
            ),

            // Analysis + Convergence
            h('div', { className: 'mt-3 grid grid-cols-5 gap-3' },

              h('div', { className: 'col-span-3 bg-red-50 rounded-xl border border-red-200 p-3' },
                h('p', { className: 'text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2' }, '\uD83D\uDCCA Analysis'),
                h('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                  h('div', { className: 'p-1.5 bg-white rounded-lg border', style: { animation: 'calcPop 0.3s ease' } },
                    h('p', { className: 'text-[9px] font-bold text-red-500' }, mode==='trapezoid'?'Trapezoidal':mode==='simpson'?"Simpson's":'Riemann ('+mode+')'),
                    h('p', { className: 'text-sm font-bold text-red-800' }, area.toFixed(4))
                  ),
                  h('div', { className: 'p-1.5 bg-white rounded-lg border' },
                    h('p', { className: 'text-[9px] font-bold text-red-500' }, 'Exact (\u222B)'),
                    h('p', { className: 'text-sm font-bold text-red-800' }, exact.toFixed(4))
                  ),
                  h('div', { className: 'p-1.5 bg-white rounded-lg border' },
                    h('p', { className: 'text-[9px] font-bold text-red-500' }, 'Error'),
                    h('p', { className: 'text-sm font-bold ' + (err<0.01?'text-emerald-600':err<0.1?'text-yellow-600':'text-red-600') }, err.toFixed(6))
                  )
                ),
                h('p', { className: 'mt-2 text-xs text-red-500 italic' },
                  mode==='simpson' ? '\uD83D\uDCA1 Simpson\'s uses parabolic arcs \u2014 incredibly accurate for polynomials!'
                  : mode==='trapezoid' ? '\uD83D\uDCA1 Trapezoidal rule: error \u221D 1/n\u00B2 \u2014 better than plain rectangles!'
                  : nRects<=5 ? '\uD83D\uDCA1 Very few rectangles \u2014 try increasing n!'
                  : nRects<=15 ? '\uD83D\uDCA1 Getting closer! More rectangles = better approximation.'
                  : '\uD83D\uDCA1 At n=' + nRects + ', the sum closely matches the exact integral.'
                )
              ),

              h('div', { className: 'col-span-2 bg-slate-50 rounded-xl border p-2' },
                h('p', { className: 'text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1' }, '\uD83D\uDCC9 Error vs n'),
                h('svg', { viewBox: '0 0 ' + CW + ' 60', className: 'w-full' },
                  h('line', { x1: Cpad, y1: 55, x2: CW-Cpad, y2: 55, stroke: '#e2e8f0', strokeWidth: 0.5 }),
                  h('polyline', { points: convData.map(function(cd){return convToX(cd.n)+','+convToY(cd.err);}).join(' '), fill: 'none', stroke: '#ef4444', strokeWidth: 1.5 }),
                  h('circle', { cx: convToX(nRects), cy: convToY(err), r: 3, fill: '#ef4444', stroke: 'white', strokeWidth: 1 }),
                  h('text', { x: CW/2, y: 8, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '6px' } }, 'error \u2192 0 as n \u2192 \u221E')
                )
              )
            ),

            // Presets
            h('div', { className: 'mt-3 flex flex-wrap gap-1.5 items-center' },
              h('span', { className: 'text-[10px] font-bold text-slate-400' }, 'Presets:'),
              PRESETS.map(function(p) {
                return h('button', {
                  key: p.label,
                  onClick: function() {
                    setLabToolData(function(prev) {
                      return Object.assign({}, prev, { calculus: Object.assign({}, prev.calculus, { a:p.a, b:p.b, c:p.c, xMin:p.xMin, xMax:p.xMax, n:p.n }) });
                    });
                    addToast(p.tip, 'success');
                    stemBeep && stemBeep('click');
                  },
                  className: 'px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all'
                }, p.label);
              })
            ),

            // AI Explain button
            h('div', { className: 'mt-3 flex items-center gap-2 flex-wrap' },
              h('button', {
                disabled: !!d.loadingAI,
                onClick: function() {
                  if (!callGemini || d.loadingAI) return;
                  upd('loadingAI', true);
                  upd('aiExplain', null);
                  var prompt = 'In 2-3 engaging sentences for a high school student, explain what the definite integral of f(x) = ' +
                    buildFStr(fa, fb, fc) + ' from x=' + xMin + ' to x=' + xMax2 +
                    ' (which equals ' + exact.toFixed(3) + ') means in the real world. ' +
                    'Give a concrete physical example (e.g. area, distance, volume). Keep it brief and exciting.';
                  callGemini(prompt, { temperature: 0.7, maxTokens: 150 }).then(function(resp) {
                    upd('aiExplain', resp);
                    upd('loadingAI', false);
                  }).catch(function() {
                    upd('loadingAI', false);
                    addToast('AI explain unavailable.', 'error');
                  });
                },
                className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ' + (d.loadingAI ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-violet-100 text-violet-700 hover:bg-violet-200')
              }, d.loadingAI ? '\u23F3 Thinking...' : '\u2728 What does this integral mean?'),

              d.aiExplain && h('button', {
                onClick: function() { upd('aiExplain', null); },
                className: 'text-[10px] text-slate-400 hover:text-slate-600'
              }, 'Clear')
            ),

            d.aiExplain && h('div', { className: 'mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3 text-sm text-violet-800', style: { animation: 'calcFade 0.4s ease' } },
              h('span', { className: 'font-bold' }, '\uD83D\uDCA1 '),
              d.aiExplain
            ),

            // Snapshot
            h('button', {
              onClick: function() {
                setToolSnapshots(function(prev) {
                  return prev.concat([{ id: 'calc-'+Date.now(), tool: 'calculus', label: '\u222B['+xMin+','+xMax2+'] n='+nRects, data: Object.assign({}, d), timestamp: Date.now() }]);
                });
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              className: 'mt-3 ml-auto block px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md transition-all'
            }, '\uD83D\uDCF8 Snapshot')

          ),

          // ═══ TAB: DERIVATIVE ══════════════════════════════════════════
          tab === 'derivative' && h('div', { key: 'derivative' },

            h('div', { className: 'bg-red-50 rounded-xl border border-red-200 p-3 mb-3 flex flex-wrap gap-4 text-center' },
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-red-500 uppercase' }, 'Function'),
                h('p', { className: 'text-sm font-bold text-slate-800 font-mono' }, fStr)
              ),
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-red-500 uppercase' }, 'Derivative (Power Rule)'),
                h('p', { className: 'text-sm font-bold text-red-700 font-mono', style: { animation: 'calcPop 0.3s ease' } }, derivStr)
              ),
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-red-500 uppercase' }, 'Slope at x\u2080=' + x0),
                h('p', { className: 'text-base font-black text-red-700', style: { animation: 'calcPop 0.3s ease' } }, slope.toFixed(4))
              ),
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-red-500 uppercase' }, 'Tangent Line'),
                h('p', { className: 'text-sm font-bold text-slate-700 font-mono' }, 'y = ' + slope.toFixed(2) + '(x\u2212'+x0+') + '+fy0.toFixed(2))
              )
            ),

            sharedGraph(true, false),

            // x₀ slider
            h('div', { className: 'mt-3 bg-slate-50 rounded-lg border p-2' },
              h('label', { className: 'text-[11px] font-bold text-red-600' }, 'x\u2080 (tangent point): ' + x0),
              h('input', { type: 'range', min: (xMin - 1).toFixed(1), max: (xMax2 + 1).toFixed(1), step: 0.1, value: x0, onChange: function(e) { upd('x0', parseFloat(e.target.value)); }, className: 'w-full accent-red-600' })
            ),

            // Secant → Tangent limit demo
            h('div', { className: 'mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2' }, '\uD83D\uDD0D The Limit Definition: Secant \u2192 Tangent'),
              h('p', { className: 'text-xs text-amber-800 mb-2' }, "f\u2032(x\u2080) = lim\u2095\u2192\u2080 [f(x\u2080+h) \u2212 f(x\u2080)] / h"),
              h('div', { className: 'flex items-center gap-3' },
                h('label', { className: 'text-xs font-bold text-amber-700 whitespace-nowrap' }, 'h = ' + (d.secantH !== undefined ? d.secantH : 1).toFixed(2)),
                h('input', { type: 'range', min: '0.05', max: '2', step: '0.05', value: d.secantH !== undefined ? d.secantH : 1, onChange: function(e) { upd('secantH', parseFloat(e.target.value)); }, className: 'flex-1 accent-amber-500' })
              ),
              h('div', { className: 'flex gap-4 mt-2 text-center' },
                h('div', { className: 'flex-1 bg-white rounded-lg border border-amber-200 p-1.5' },
                  h('p', { className: 'text-[9px] font-bold text-amber-600' }, 'Secant slope (h=' + (d.secantH||1).toFixed(2) + ')'),
                  h('p', { className: 'text-sm font-bold text-amber-800' }, secantSlope.toFixed(4))
                ),
                h('div', { className: 'text-slate-300 self-center text-lg' }, '\u2192'),
                h('div', { className: 'flex-1 bg-white rounded-lg border border-red-200 p-1.5' },
                  h('p', { className: 'text-[9px] font-bold text-red-500' }, 'True derivative (h\u21920)'),
                  h('p', { className: 'text-sm font-bold text-red-700' }, slope.toFixed(4))
                )
              ),
              h('p', { className: 'text-[10px] text-amber-600 italic mt-1' }, 'Drag h toward 0 \u2014 watch the secant slope approach the derivative!')
            ),

            // Function sliders (a, b, c, x0)
            h('div', { className: 'grid grid-cols-2 gap-2 mt-3' },
              [
                { k: 'a', label: 'a (x\u00B2 coeff)', min: -3, max: 3, step: 0.5 },
                { k: 'b', label: 'b (x coeff)',    min: -5, max: 5, step: 0.5 },
                { k: 'c', label: 'c (constant)',   min: -5, max: 5, step: 0.5 },
                { k: 'xMin', label: 'View x-min', min: -5, max: 3, step: 0.5 },
                { k: 'xMax', label: 'View x-max', min: 1, max: 10, step: 0.5 },
              ].map(function(s) {
                return h('div', { key: s.k, className: 'text-center bg-slate-50 rounded-lg p-2 border' },
                  h('label', { className: 'text-[11px] font-bold text-red-600' }, s.label + ': ' + d[s.k]),
                  h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: function(e) { upd(s.k, parseFloat(e.target.value)); }, className: 'w-full accent-red-600' })
                );
              })
            )

          ),

          // ═══ TAB: CHALLENGE ════════════════════════════════════════════
          tab === 'challenge' && h('div', { key: 'challenge' },

            h('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
              h('span', { className: 'text-sm font-black text-red-800' }, '\uD83C\uDFAF Calculus Challenges'),
              cScore > 0 && h('span', { className: 'ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' }, '\u2B50 ' + cScore + ' | \uD83D\uDD25 ' + cStreak)
            ),

            // Mode selector
            h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
              CALC_CHALLENGES.map(function(cm) {
                return h('button', {
                  key: cm.id,
                  onClick: function() { upd('calcChallengeMode', cm.id); upd('calcQuiz', null); upd('calcHint', ''); },
                  className: 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ' + (cMode===cm.id ? 'bg-'+cm.color+'-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                }, cm.label);
              })
            ),

            // Mode description
            h('p', { className: 'text-xs text-slate-400 italic mb-3' },
              cMode==='estimate' ? 'Pick the correct value of the definite integral from 4 choices.' :
              cMode==='method'   ? 'Identify which approximation method gives the smallest error.' :
              cMode==='minN'     ? 'Find the minimum number of subdivisions to hit a precision target.' :
              cMode==='exact'    ? 'Apply the power rule and type the exact integral value.' :
              'Calculate f\u2032(x\u2080) using the power rule derivative.'
            ),

            // Start / New button
            h('button', {
              onClick: startCalcChallenge,
              className: 'px-4 py-2 rounded-lg text-xs font-bold mb-3 transition-all ' + (cq ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-600 text-white hover:bg-red-700 shadow-md')
            }, cq ? '\uD83D\uDD04 New Challenge' : '\uD83D\uDE80 Start Challenge'),

            // Mini graph for challenge context
            cq && h('div', { className: 'mb-3' }, sharedGraph(cMode==='deriv', cMode!=='deriv')),

            // Multiple choice question card
            cq && !cq.answered && cMode !== 'exact' && h('div', { className: 'bg-red-50 rounded-xl p-4 border border-red-200 animate-in fade-in' },
              h('p', { className: 'text-sm font-bold text-red-800 mb-3' }, cq.question),
              h('div', { className: 'grid grid-cols-2 gap-2' },
                (cMode==='method' ? cq.opts : cq.opts).map(function(opt) {
                  var optVal = cMode==='method' ? opt.id : opt;
                  var optLabel = cMode==='method' ? opt.label : cMode==='minN' ? 'n = '+opt : String(opt);
                  return h('button', {
                    key: String(optVal),
                    onClick: function() { checkCalcAnswer(optVal); stemBeep && stemBeep('click'); },
                    className: 'px-3 py-2 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all'
                  }, optLabel);
                })
              )
            ),

            // Exact integral (typed input)
            cq && !cq.answered && cMode === 'exact' && h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200 animate-in fade-in' },
              h('p', { className: 'text-sm font-bold text-emerald-800 mb-1' }, cq.question),
              h('p', { className: 'text-[10px] text-emerald-600 mb-3 italic' }, 'Power rule: \u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1) + C'),
              h('div', { className: 'flex items-center gap-2' },
                h('input', {
                  type: 'number', step: 'any', autoFocus: true,
                  value: d._calcExactInput || '',
                  onChange: function(e) { upd('_calcExactInput', e.target.value); },
                  onKeyDown: function(e) { if (e.key==='Enter' && d._calcExactInput) checkCalcAnswer(d._calcExactInput); },
                  placeholder: 'Type your answer\u2026',
                  className: 'flex-1 px-3 py-2 rounded-lg border-2 border-emerald-300 text-sm font-bold text-emerald-800 bg-white focus:border-emerald-500 outline-none'
                }),
                h('button', {
                  onClick: function() { if (d._calcExactInput) checkCalcAnswer(d._calcExactInput); },
                  className: 'px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all'
                }, 'Check \u2192')
              )
            ),

            // Result card
            cq && cq.answered && h('div', {
              className: 'p-3 rounded-xl text-sm font-bold mb-2 ' + (cq.correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'),
              style: { animation: cq.correct ? 'calcCorrect 0.5s ease' : 'calcWrong 0.4s ease' }
            },
              cq.correct ? '\u2705 Correct! The answer is ' + cq.answer : '\u274C Correct answer: ' + cq.answer,
              cq.correct && cStreak >= 3 && h('span', { className: 'ml-2 text-amber-600' }, '\uD83D\uDD25 ' + cStreak + '-streak!')
            ),

            // Hint
            cHint && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2 text-xs text-amber-800', style: { animation: 'calcFade 0.3s ease' } },
              h('span', { className: 'font-bold' }, '\uD83D\uDCA1 Hint: '),
              cHint
            ),

            // Method comparison table
            cq && cq.answered && cMode==='method' && cq.errors && h('div', { className: 'mt-2 bg-slate-50 rounded-lg p-2 border' },
              h('p', { className: 'text-[9px] font-bold text-slate-500 uppercase mb-1' }, 'Error comparison (n='+cq.n+')'),
              h('div', { className: 'grid grid-cols-5 gap-1 text-center' },
                ['left','right','midpoint','trapezoid','simpson'].map(function(m) {
                  var isBest = m===cq.answer;
                  return h('div', { key: m, className: 'px-1 py-1 rounded text-[9px] font-bold ' + (isBest ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-slate-500 border') },
                    h('div', null, m==='simpson'?'Simp':m.charAt(0).toUpperCase()+m.slice(1,4)),
                    h('div', { className: 'text-[8px]' }, cq.errors[m].toFixed(4))
                  );
                })
              )
            )

          )

        );
      })();
    }
  });

  console.log('[StemLab] stem_tool_calculus.js loaded');
})();
