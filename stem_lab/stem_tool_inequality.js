// ═══════════════════════════════════════════
// stem_tool_inequality.js — Inequality Grapher Plugin
// Interactive number-line visualiser with notation, quiz, and test-a-value
// Extracted from stem_lab_module.js L11191-11422
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('inequality', {
    icon: '\uD83C\uDFA8', label: 'Inequality Grapher',
    desc: 'Visualize inequalities on a number line with interval & set-builder notation.',
    color: 'fuchsia', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var setToolSnapshots = ctx.setToolSnapshots;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;

      // ── State ──
      var d = labToolData.inequality || {};
      var upd = function(key, val) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, {
            inequality: Object.assign({}, prev.inequality || {}, typeof key === 'object' ? key : (function() { var o = {}; o[key] = val; return o; })())
          });
        });
      };

      var W = 420, H = 140, pad = 35;
      var range = d.range || { min: -10, max: 10 };
      var toSX = function(x) { return pad + ((x - range.min) / (range.max - range.min)) * (W - 2 * pad); };

      // ══════════════════════════════
      // PARSER — simple + compound
      // ══════════════════════════════
      var parseIneq = function(expr) {
        if (!expr) return null;
        // Compound: -2 < x <= 5 or 1 <= x < 8
        var cm = expr.match(/(-?\d+\.?\d*)\s*([<>]=?|[≤≥])\s*([a-z])\s*([<>]=?|[≤≥])\s*(-?\d+\.?\d*)/);
        if (cm) {
          var op1 = cm[2].replace('≤', '<=').replace('≥', '>=');
          var op2 = cm[4].replace('≤', '<=').replace('≥', '>=');
          return { compound: true, lo: parseFloat(cm[1]), op1: op1, v: cm[3], op2: op2, hi: parseFloat(cm[5]) };
        }
        // Simple: x > 3 or x <= -2
        var sm = expr.match(/([a-z])\s*([<>]=?|[≤≥])\s*(-?\d+\.?\d*)/);
        if (sm) {
          var op = sm[2].replace('≤', '<=').replace('≥', '>=');
          return { compound: false, v: sm[1], op: op, val: parseFloat(sm[3]) };
        }
        return null;
      };

      var ineq = parseIneq(d.expr);

      // ══════════════════════════════
      // NOTATION — interval + set-builder
      // ══════════════════════════════
      var intervalStr = '';
      var setBuilderStr = '';
      if (ineq) {
        if (ineq.compound) {
          var lb = ineq.op1.includes('=') ? '[' : '(';
          var rb = ineq.op2.includes('=') ? ']' : ')';
          intervalStr = lb + ineq.lo + ', ' + ineq.hi + rb;
          var leftCmp = ineq.op1.includes('=') ? '\u2264' : '<';
          var rightCmp = ineq.op2.includes('=') ? '\u2264' : '<';
          setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.lo + ' ' + leftCmp + ' ' + ineq.v + ' ' + rightCmp + ' ' + ineq.hi + ' }';
        } else {
          if (ineq.op.includes('>')) {
            intervalStr = (ineq.op.includes('=') ? '[' : '(') + ineq.val + ', \u221E)';
          } else {
            intervalStr = '(-\u221E, ' + ineq.val + (ineq.op.includes('=') ? ']' : ')');
          }
          var dispOp = ineq.op.replace('<=', '\u2264').replace('>=', '\u2265');
          setBuilderStr = '{ ' + ineq.v + ' | ' + ineq.v + ' ' + dispOp + ' ' + ineq.val + ' }';
        }
      }

      // ══════════════════════════════
      // TEST-A-VALUE — enhancement #1
      // ══════════════════════════════
      var testVal = d.testVal != null ? d.testVal : '';
      var testResult = null;
      if (ineq && testVal !== '' && !isNaN(parseFloat(testVal))) {
        var tv = parseFloat(testVal);
        if (ineq.compound) {
          var loOk = ineq.op1.includes('=') ? tv >= ineq.lo : tv > ineq.lo;
          var hiOk = ineq.op2.includes('=') ? tv <= ineq.hi : tv < ineq.hi;
          testResult = loOk && hiOk;
        } else {
          if (ineq.op === '>') testResult = tv > ineq.val;
          else if (ineq.op === '>=') testResult = tv >= ineq.val;
          else if (ineq.op === '<') testResult = tv < ineq.val;
          else if (ineq.op === '<=') testResult = tv <= ineq.val;
        }
      }

      // ══════════════════════════════
      // PRESETS
      // ══════════════════════════════
      var PRESETS = [
        { label: 'x > 3', expr: 'x > 3' },
        { label: 'x < -2', expr: 'x < -2' },
        { label: 'x \u2265 0', expr: 'x >= 0' },
        { label: 'x \u2264 5', expr: 'x <= 5' },
        { label: '-3 < x \u2264 4', expr: '-3 < x <= 4' },
        { label: '1 \u2264 x < 7', expr: '1 <= x < 7' },
        { label: '-5 \u2264 x \u2264 5', expr: '-5 <= x <= 5' },
        { label: '0 < x < 10', expr: '0 < x < 10' },
      ];

      // ══════════════════════════════
      // QUIZ — tiered difficulty (#4)
      // ══════════════════════════════
      var QUIZ_EASY = [
        { q: 'Shade: all x greater than 2', a: 'x > 2', opts: ['x > 2', 'x < 2', 'x >= 2', 'x <= 2'] },
        { q: 'Shade: all x less than or equal to -1', a: 'x <= -1', opts: ['x < -1', 'x <= -1', 'x > -1', 'x >= -1'] },
        { q: 'Shade: all x at least 5', a: 'x >= 5', opts: ['x > 5', 'x >= 5', 'x < 5', 'x <= 5'] },
        { q: 'Shade: all x less than 0', a: 'x < 0', opts: ['x < 0', 'x <= 0', 'x > 0', 'x >= 0'] },
        { q: 'Shade: all x no more than 3', a: 'x <= 3', opts: ['x < 3', 'x <= 3', 'x > 3', 'x >= 3'] },
      ];
      var QUIZ_MEDIUM = [
        { q: 'Shade: x between -3 and 4 (inclusive)', a: '-3 <= x <= 4', opts: ['-3 <= x <= 4', '-3 < x < 4', '-3 < x <= 4', '-3 <= x < 4'] },
        { q: 'Shade: x strictly between 0 and 6', a: '0 < x < 6', opts: ['0 < x < 6', '0 <= x <= 6', '0 < x <= 6', '0 <= x < 6'] },
        { q: 'Shade: x from -5 to 2, including both endpoints', a: '-5 <= x <= 2', opts: ['-5 <= x <= 2', '-5 < x < 2', '-5 <= x < 2', '-5 < x <= 2'] },
        { q: 'Shade: x between 1 and 8, including 1 but not 8', a: '1 <= x < 8', opts: ['1 <= x < 8', '1 < x <= 8', '1 < x < 8', '1 <= x <= 8'] },
      ];
      var QUIZ_HARD = [
        { q: 'A roller coaster requires riders to be at least 48 inches tall. Write the inequality for height h.', a: 'x >= 48', opts: ['x >= 48', 'x > 48', 'x <= 48', 'x < 48'], range: { min: 40, max: 56 } },
        { q: 'The speed limit is under 65 mph. Write the inequality for speed x.', a: 'x < 65', opts: ['x < 65', 'x <= 65', 'x > 65', 'x >= 65'], range: { min: 55, max: 75 } },
        { q: 'A pH between 6 and 8 (inclusive) is safe for swimming. Write the inequality.', a: '6 <= x <= 8', opts: ['6 <= x <= 8', '6 < x < 8', '6 <= x < 8', '6 < x <= 8'], range: { min: 0, max: 14 } },
        { q: 'Water is liquid strictly between 0\u00B0C and 100\u00B0C. Write the inequality.', a: '0 < x < 100', opts: ['0 < x < 100', '0 <= x <= 100', '0 < x <= 100', '0 <= x < 100'], range: { min: -10, max: 110 } },
        { q: 'A student needs more than 70 points to pass. Write the inequality for score x.', a: 'x > 70', opts: ['x > 70', 'x >= 70', 'x < 70', 'x <= 70'], range: { min: 60, max: 80 } },
        { q: 'Temperature must stay at most -2\u00B0C for ice. Write the inequality.', a: 'x <= -2', opts: ['x <= -2', 'x < -2', 'x >= -2', 'x > -2'] },
        { q: 'A child ticket is for ages under 12. Write the inequality for age x.', a: 'x < 12', opts: ['x < 12', 'x <= 12', 'x > 12', 'x >= 12'], range: { min: 0, max: 20 } },
      ];

      var quizTier = d.quizTier || 'all';
      var getQuizPool = function() {
        if (quizTier === 'easy') return QUIZ_EASY;
        if (quizTier === 'medium') return QUIZ_MEDIUM;
        if (quizTier === 'hard') return QUIZ_HARD;
        return QUIZ_EASY.concat(QUIZ_MEDIUM).concat(QUIZ_HARD);
      };

      var iqStartQuiz = function() {
        var pool = getQuizPool();
        var q = pool[Math.floor(Math.random() * pool.length)];
        var shuffled = q.opts.slice().sort(function() { return Math.random() - 0.5; });
        upd({
          quiz: { q: q.q, a: q.a, opts: shuffled, answered: false, score: (d.quiz && d.quiz.score) || 0, streak: (d.quiz && d.quiz.streak) || 0 },
          range: q.range || { min: -10, max: 10 }
        });
      };

      // ══════════════════════════════
      // COACH TIPS — enhancement #3
      // ══════════════════════════════
      var showCoach = d.showCoach || false;
      var COACH_TIPS = [
        { icon: '\u25CB', tip: 'Open dot (\u25CB) means the boundary value is NOT part of the solution  —  used with < and >' },
        { icon: '\u25CF', tip: 'Closed dot (\u25CF) means the boundary value IS part of the solution  —  used with \u2264 and \u2265' },
        { icon: '( )', tip: 'Interval notation uses ( ) for open boundaries and [ ] for closed boundaries' },
        { icon: '\u221E', tip: 'Infinity (\u221E) always uses ( ) because infinity is not a reachable value' },
      ];

      // ══════════════════════════════
      // RANGE CONTROLS — enhancement #6
      // ══════════════════════════════
      var shiftRange = function(delta) {
        upd('range', { min: range.min + delta, max: range.max + delta });
      };
      var zoomRange = function(factor) {
        var mid = (range.min + range.max) / 2;
        var half = Math.round((range.max - range.min) * factor / 2);
        if (half < 2) half = 2;
        if (half > 100) half = 100;
        upd('range', { min: Math.round(mid - half), max: Math.round(mid + half) });
      };

      // ════════════════════════════════
      // ═══ RENDER ═══
      // ════════════════════════════════
      return h('div', { className: 'max-w-3xl mx-auto animate-in fade-in duration-200' },

        // ── Header ──
        h('div', { className: 'flex items-center gap-3 mb-3' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back to tools' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-fuchsia-800' }, '\uD83C\uDFA8 Inequality Grapher'),
          h('span', { className: 'px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 text-[10px] font-bold rounded-full' }, 'INTERACTIVE')
        ),
        h('p', { className: 'text-xs text-slate-500 italic -mt-1 mb-3' },
          'Type an inequality like x > 3 or a compound like -2 < x \u2264 5 to visualize it on a number line.'),

        // ── Input + presets ──
        h('div', { className: 'flex items-center gap-2 mb-3' },
          h('input', {
            type: 'text', value: d.expr || '', placeholder: 'x > 3 or -2 < x \u2264 5',
            onChange: function(e) { upd('expr', e.target.value); },
            className: 'px-4 py-2 border-2 border-fuchsia-300 rounded-lg font-mono text-lg text-center w-52 focus:ring-2 focus:ring-fuchsia-400 outline-none'
          })
        ),
        h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
          PRESETS.map(function(ex) {
            return h('button', {
              key: ex.label,
              onClick: function() { upd('expr', ex.expr); },
              className: 'px-2 py-1 text-[10px] font-bold bg-fuchsia-50 text-fuchsia-600 rounded border border-fuchsia-200 hover:bg-fuchsia-100 transition-all'
            }, ex.label);
          })
        ),

        // ── SVG Number line ──
        h('svg', { viewBox: '0 0 ' + W + ' ' + H, className: 'w-full bg-white rounded-xl border-2 border-fuchsia-200 shadow-sm' },

          // Shaded region — simple
          ineq && !ineq.compound && (function() {
            var sxVal = toSX(ineq.val);
            if (ineq.op.includes('>')) {
              return h('g', null,
                h('defs', null,
                  h('linearGradient', { id: 'ineqGrad', x1: '0', y1: '0', x2: '1', y2: '0' },
                    h('stop', { offset: '0%', stopColor: '#d946ef', stopOpacity: '0.05' }),
                    h('stop', { offset: '15%', stopColor: '#d946ef', stopOpacity: '0.15' }),
                    h('stop', { offset: '100%', stopColor: '#d946ef', stopOpacity: '0.15' }))),
                h('rect', { x: sxVal, y: 25, width: W - pad - sxVal, height: 50, fill: 'url(#ineqGrad)', rx: 4 }));
            } else {
              return h('g', null,
                h('defs', null,
                  h('linearGradient', { id: 'ineqGrad', x1: '1', y1: '0', x2: '0', y2: '0' },
                    h('stop', { offset: '0%', stopColor: '#d946ef', stopOpacity: '0.05' }),
                    h('stop', { offset: '15%', stopColor: '#d946ef', stopOpacity: '0.15' }),
                    h('stop', { offset: '100%', stopColor: '#d946ef', stopOpacity: '0.15' }))),
                h('rect', { x: pad, y: 25, width: sxVal - pad, height: 50, fill: 'url(#ineqGrad)', rx: 4 }));
            }
          })(),

          // Shaded region — compound
          ineq && ineq.compound && h('rect', { x: toSX(ineq.lo), y: 25, width: toSX(ineq.hi) - toSX(ineq.lo), height: 50, fill: 'rgba(217,70,239,0.12)', rx: 4 }),

          // Number line
          h('line', { x1: pad, y1: 50, x2: W - pad, y2: 50, stroke: '#94a3b8', strokeWidth: 2 }),

          // Tick marks
          Array.from({ length: range.max - range.min + 1 }, function(_, i) { return range.min + i; }).map(function(n) {
            var isOrigin = n === 0;
            return h('g', { key: n },
              h('line', { x1: toSX(n), y1: isOrigin ? 38 : 43, x2: toSX(n), y2: isOrigin ? 62 : 57, stroke: isOrigin ? '#1e293b' : '#94a3b8', strokeWidth: isOrigin ? 2 : 1 }),
              h('text', { x: toSX(n), y: 85, textAnchor: 'middle', fill: isOrigin ? '#1e293b' : '#64748b', style: { fontSize: isOrigin ? '11px' : '9px', fontWeight: isOrigin ? 'bold' : 'normal' } }, n));
          }),

          // Solution ray — simple
          ineq && !ineq.compound && (function() {
            var sxVal = toSX(ineq.val);
            var endX = ineq.op.includes('>') ? W - pad : pad;
            return h('g', null,
              h('line', { x1: sxVal + (ineq.op.includes('>') ? 8 : -8), y1: 50, x2: endX, y2: 50, stroke: '#d946ef', strokeWidth: 3.5 }),
              h('circle', { cx: sxVal, cy: 50, r: 6, fill: ineq.op.includes('=') ? '#d946ef' : 'white', stroke: '#d946ef', strokeWidth: 2.5 }),
              ineq.op.includes('>') && h('polygon', { points: (W - pad) + ',50 ' + (W - pad - 10) + ',43 ' + (W - pad - 10) + ',57', fill: '#d946ef' }),
              ineq.op.includes('<') && h('polygon', { points: pad + ',50 ' + (pad + 10) + ',43 ' + (pad + 10) + ',57', fill: '#d946ef' }));
          })(),

          // Solution segment — compound
          ineq && ineq.compound && h('g', null,
            h('line', { x1: toSX(ineq.lo), y1: 50, x2: toSX(ineq.hi), y2: 50, stroke: '#d946ef', strokeWidth: 3.5 }),
            h('circle', { cx: toSX(ineq.lo), cy: 50, r: 6, fill: ineq.op1.includes('=') ? '#d946ef' : 'white', stroke: '#d946ef', strokeWidth: 2.5 }),
            h('circle', { cx: toSX(ineq.hi), cy: 50, r: 6, fill: ineq.op2.includes('=') ? '#d946ef' : 'white', stroke: '#d946ef', strokeWidth: 2.5 })),

          // Arrow tips
          h('polygon', { points: (W - pad) + ',50 ' + (W - pad - 8) + ',45 ' + (W - pad - 8) + ',55', fill: '#94a3b8' }),
          h('polygon', { points: pad + ',50 ' + (pad + 8) + ',45 ' + (pad + 8) + ',55', fill: '#94a3b8' }),

          // Test-a-value marker on number line
          testResult !== null && (function() {
            var tv = parseFloat(testVal);
            if (tv >= range.min && tv <= range.max) {
              var tx = toSX(tv);
              return h('g', null,
                h('line', { x1: tx, y1: 25, x2: tx, y2: 75, stroke: testResult ? '#10b981' : '#ef4444', strokeWidth: 2, strokeDasharray: '4,2' }),
                h('text', { x: tx, y: 118, textAnchor: 'middle', fill: testResult ? '#10b981' : '#ef4444', style: { fontSize: '10px', fontWeight: 'bold' } },
                  (testResult ? '\u2705 ' : '\u274C ') + tv));
            }
            return null;
          })()
        ),

        // ── Legend — improved, outside SVG (#2) ──
        h('div', { className: 'flex items-center justify-center gap-6 mt-2 text-xs' },
          h('span', { className: 'flex items-center gap-1.5 text-fuchsia-700 font-bold' },
            h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: '#d946ef' } }),
            'Closed (\u2264 \u2265) includes the value'),
          h('span', { className: 'flex items-center gap-1.5 text-fuchsia-700 font-bold' },
            h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: '50%', backgroundColor: 'white', border: '2px solid #d946ef' } }),
            'Open (< >) excludes the value')
        ),

        // ── Range controls (#6) ──
        h('div', { className: 'flex items-center justify-center gap-2 mt-2' },
          h('button', { onClick: function() { shiftRange(-5); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-all', title: 'Shift range left' }, '\u25C0 -5'),
          h('button', { onClick: function() { zoomRange(1.5); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-all', title: 'Zoom out' }, '\u2212 Zoom'),
          h('span', { className: 'text-[10px] text-slate-400 font-mono' }, '[' + range.min + ', ' + range.max + ']'),
          h('button', { onClick: function() { zoomRange(0.67); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-all', title: 'Zoom in' }, '+ Zoom'),
          h('button', { onClick: function() { shiftRange(5); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 rounded hover:bg-slate-200 transition-all', title: 'Shift range right' }, '+5 \u25B6'),
          h('button', { onClick: function() { upd('range', { min: -10, max: 10 }); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-fuchsia-50 text-fuchsia-500 rounded hover:bg-fuchsia-100 transition-all', title: 'Reset range' }, '\u21BA')
        ),

        // ── Notation display ──
        ineq && h('div', { className: 'mt-3 grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-fuchsia-50 rounded-lg p-3 border border-fuchsia-200 text-center' },
            h('p', { className: 'text-[10px] font-bold text-fuchsia-500 uppercase tracking-wider mb-1' }, 'Interval Notation'),
            h('p', { className: 'text-lg font-bold text-fuchsia-800 font-mono' }, intervalStr)),
          h('div', { className: 'bg-violet-50 rounded-lg p-3 border border-violet-200 text-center' },
            h('p', { className: 'text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1' }, 'Set-Builder Notation'),
            h('p', { className: 'text-sm font-bold text-violet-800 font-mono' }, setBuilderStr))
        ),

        // ── Test-a-Value panel (#1) ──
        h('div', { className: 'mt-3 bg-sky-50 rounded-lg p-3 border border-sky-200' },
          h('p', { className: 'text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-2' }, '\uD83E\uDDEA Test a Value'),
          h('div', { className: 'flex items-center gap-2' },
            h('input', {
              type: 'number', step: 'any', value: testVal, placeholder: 'Enter a number\u2026',
              onChange: function(e) { upd('testVal', e.target.value); },
              className: 'px-3 py-1.5 border-2 border-sky-300 rounded-lg font-mono text-sm w-36 text-center focus:ring-2 focus:ring-sky-400 outline-none'
            }),
            testResult !== null && h('span', { className: 'text-sm font-bold ' + (testResult ? 'text-emerald-600' : 'text-red-600') },
              testResult
                ? '\u2705 ' + testVal + ' IS in the solution set'
                : '\u274C ' + testVal + ' is NOT in the solution set'),
            testResult === null && ineq && testVal !== '' && h('span', { className: 'text-xs text-slate-400 italic' }, 'Enter a valid number')
          )
        ),

        // ── Coach tips (#3) ──
        h('div', { className: 'mt-3' },
          h('button', {
            onClick: function() { upd('showCoach', !showCoach); },
            className: 'text-[10px] font-bold text-amber-600 hover:text-amber-700 transition-all'
          }, (showCoach ? '\u25BC' : '\u25B6') + ' \uD83D\uDCA1 Learning Tips'),
          showCoach && h('div', { className: 'mt-2 bg-amber-50 rounded-lg p-3 border border-amber-200 space-y-2' },
            COACH_TIPS.map(function(ct, i) {
              return h('div', { key: i, className: 'flex items-start gap-2' },
                h('span', { className: 'text-sm font-bold text-amber-600 w-5 text-center flex-shrink-0' }, ct.icon),
                h('p', { className: 'text-xs text-amber-800' }, ct.tip));
            })
          )
        ),

        // ── Quiz Mode with difficulty tiers (#4) ──
        h('div', { className: 'mt-3 border-t border-slate-200 pt-3' },

          // Tier selector
          h('div', { className: 'flex items-center gap-1.5 mb-2' },
            ['easy', 'medium', 'hard', 'all'].map(function(tier) {
              var labels = { easy: '\uD83D\uDFE2 Easy', medium: '\uD83D\uDFE1 Medium', hard: '\uD83D\uDD34 Hard', all: '\uD83C\uDF1F All' };
              var isActive = quizTier === tier;
              return h('button', {
                key: tier,
                onClick: function() { upd('quizTier', tier); },
                className: 'px-2 py-0.5 rounded text-[10px] font-bold transition-all ' +
                  (isActive ? 'bg-fuchsia-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
              }, labels[tier]);
            })
          ),

          // Quiz controls
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('button', {
              onClick: iqStartQuiz,
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (d.quiz ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-fuchsia-600 text-white') + ' transition-all'
            }, d.quiz ? '\uD83D\uDD04 Next Challenge' : '\uD83E\uDDE0 Challenge Mode'),
            d.quiz && d.quiz.score > 0 && h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + d.quiz.score + ' correct'),
            d.quiz && d.quiz.streak > 1 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + d.quiz.streak + ' streak')
          ),

          // Question card
          d.quiz && !d.quiz.answered && h('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
            h('p', { className: 'text-sm font-bold text-fuchsia-800 mb-3' }, d.quiz.q),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              (d.quiz.opts || []).map(function(opt) {
                var dispOpt = opt.replace(/</g, '\u003c').replace(/>=/g, '\u2265').replace(/<=/g, '\u2264');
                return h('button', {
                  key: opt,
                  onClick: function() {
                    var norm = function(s) { return s.replace(/\s+/g, '').replace(/\u2264/g, '<=').replace(/\u2265/g, '>='); };
                    var correct = norm(opt) === norm(d.quiz.a);
                    var newScore = d.quiz.score + (correct ? 1 : 0);
                    var newStreak = correct ? (d.quiz.streak || 0) + 1 : 0;
                    upd({
                      quiz: Object.assign({}, d.quiz, { answered: true, chosen: opt, correct: correct, score: newScore, streak: newStreak }),
                      expr: d.quiz.a
                    });
                    if (correct) {
                      addToast('\u2705 Correct!', 'success');
                      if (typeof awardXP === 'function') awardXP('inequality', 10, 'Inequality Challenge');
                      setTimeout(function() { iqStartQuiz(); }, 1500);
                    } else {
                      addToast('\u274C Answer: ' + d.quiz.a.replace(/</g, '\u003c').replace(/>=/g, '\u2265').replace(/<=/g, '\u2264'), 'error');
                    }
                  },
                  className: 'px-3 py-2 rounded-lg text-xs font-bold font-mono border-2 bg-white text-slate-700 border-fuchsia-200 hover:border-fuchsia-400 hover:bg-fuchsia-50 transition-all'
                }, dispOpt);
              })
            )
          ),

          // Result card
          d.quiz && d.quiz.answered && h('div', { className: 'p-3 rounded-xl text-sm font-bold ' + (d.quiz.correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },
            d.quiz.correct ? '\u2705 Correct!' : '\u274C Answer: ' + d.quiz.a.replace(/</g, '\u003c').replace(/>=/g, '\u2265').replace(/<=/g, '\u2264'),
            d.quiz.streak > 2 && d.quiz.correct && h('span', { className: 'ml-2 text-xs text-amber-600' }, '\uD83D\uDD25 ' + d.quiz.streak + ' in a row!'))
        ),

        // ── Snapshot button ──
        h('button', {
          onClick: function() {
            setToolSnapshots(function(prev) {
              return prev.concat([{ id: 'iq-' + Date.now(), tool: 'inequality', label: d.expr || 'inequality', data: Object.assign({}, d), timestamp: Date.now() }]);
            });
            addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
          },
          className: 'mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all'
        }, '\uD83D\uDCF8 Snapshot')
      );
    }
  });
})();
