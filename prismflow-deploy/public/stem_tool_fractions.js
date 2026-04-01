// ═══════════════════════════════════════════
// stem_tool_fractions.js — Fraction Lab Plugin
// Consolidated from fractionViz + fractions
// 4 tabs: Practice, Compare, Operations, Equivalents
// + unified challenge & quiz system
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // Register both IDs → same render function
  var fracPlugin = {
    icon: '\uD83C\uDF55', label: 'Fraction Lab',
    desc: 'Interactive fraction visualizer with pie/bar models, operations, equivalents, and challenge mode.',
    color: 'rose', category: 'math',
    render: renderFractionLab
  };
  window.StemLab.registerTool('fractionViz', fracPlugin);
  window.StemLab.registerTool('fractions', fracPlugin);

  function renderFractionLab(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var ArrowLeft = ctx.icons.ArrowLeft;
    var setStemLabTool = ctx.setStemLabTool;
    var addToast = ctx.addToast;
    var awardXP = ctx.awardXP;
    var announceToSR = ctx.announceToSR;
    var t = ctx.t;

    // ── State via labToolData._fractions ──
    var ld = ctx.toolData || {};
    var _f = ld._fractions || {};
    var upd = function(obj) {
      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function(prev) {
          var fr = Object.assign({}, (prev && prev._fractions) || {}, obj);
          return Object.assign({}, prev, { _fractions: fr });
        });
      }
    };

    // ── State defaults ──
    var tab = _f.tab || 'practice';
    var mode = _f.mode || 'pie';            // 'pie' or 'bar'
    var difficulty = _f.difficulty || 'medium';
    var score = _f.score || { correct: 0, total: 0 };

    // Practice state (single fraction)
    var pieces = _f.pieces || { numerator: 3, denominator: 8 };

    // Compare state (two fractions)
    var num1 = _f.num1 != null ? _f.num1 : 1;
    var den1 = _f.den1 != null ? _f.den1 : 2;
    var num2 = _f.num2 != null ? _f.num2 : 2;
    var den2 = _f.den2 != null ? _f.den2 : 4;
    var opMode = _f.opMode || 'add';

    // Challenge state
    var challenge = _f.challenge || null;
    var answer = _f.answer || '';
    var feedback = _f.feedback || null;

    // Quiz state (compare quiz)
    var quiz = _f.quiz || null;
    var quizScore = _f.quizScore || 0;
    var quizStreak = _f.quizStreak || 0;

    // ── Math helpers ──
    var gcd = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t2 = b; b = a % t2; a = t2; } return a; };
    var lcm = function(a, b) { return a * b / gcd(a, b); };
    var simplify = function(n, d) { var g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; };
    var val1 = num1 / den1;
    var val2 = num2 / den2;
    var s1 = simplify(num1, den1);
    var s2 = simplify(num2, den2);

    // ── Difficulty pools ──
    var dpool = difficulty === 'easy' ? [2, 3, 4] : difficulty === 'hard' ? [3, 4, 5, 6, 8, 10, 12, 15, 16, 20] : [2, 3, 4, 5, 6, 8, 10, 12];

    // ═══ DRAWING HELPERS ═══
    var drawPie = function(num, den, size, color) {
      var slices = [];
      for (var i = 0; i < den; i++) {
        var startAngle = (i / den) * 2 * Math.PI - Math.PI / 2;
        var endAngle = ((i + 1) / den) * 2 * Math.PI - Math.PI / 2;
        var x1 = (size / 2) + (size / 2 - 2) * Math.cos(startAngle);
        var y1 = (size / 2) + (size / 2 - 2) * Math.sin(startAngle);
        var x2 = (size / 2) + (size / 2 - 2) * Math.cos(endAngle);
        var y2 = (size / 2) + (size / 2 - 2) * Math.sin(endAngle);
        var largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
        var filled = i < num;
        slices.push(h('path', {
          key: i,
          d: 'M ' + (size / 2) + ' ' + (size / 2) + ' L ' + x1 + ' ' + y1 + ' A ' + (size / 2 - 2) + ' ' + (size / 2 - 2) + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z',
          fill: filled ? (color || 'hsl(' + (340 + i * 8) + ', 70%, ' + (60 + i * 2) + '%)') : '#fecdd3',
          stroke: '#e11d48', strokeWidth: 1.5,
          className: 'cursor-pointer hover:opacity-80 transition-opacity'
        }));
      }
      return h('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size },
        slices,
        h('circle', { cx: size / 2, cy: size / 2, r: 3, fill: '#e11d48' })
      );
    };

    var drawBar = function(num, den, color) {
      var segs = [];
      for (var i = 0; i < den; i++) {
        segs.push(h('div', {
          key: i,
          style: { flex: 1, backgroundColor: i < num ? (color || '#f43f5e') : '#e2e8f0', transition: 'background-color 0.3s' },
          className: 'border-r border-white/50'
        }));
      }
      return h('div', {
        className: 'flex h-10 rounded-lg overflow-hidden border-2',
        style: { borderColor: color || '#f43f5e' }
      }, segs);
    };

    // ═══ OPERATIONS ═══
    var computeOp = function() {
      if (opMode === 'add') { var cd = lcm(den1, den2); return [num1 * (cd / den1) + num2 * (cd / den2), cd]; }
      if (opMode === 'sub') { var cd2 = lcm(den1, den2); return [num1 * (cd2 / den1) - num2 * (cd2 / den2), cd2]; }
      if (opMode === 'mul') { return [num1 * num2, den1 * den2]; }
      if (opMode === 'div') { return [num1 * den2, den1 * num2]; }
      return [0, 1];
    };
    var opResult = computeOp();
    var opSimplified = simplify(opResult[0], opResult[1]);
    var opSymbols = { add: '+', sub: '\u2212', mul: '\u00D7', div: '\u00F7' };

    // ═══ EQUIVALENT CHAINS ═══
    var equivChain = function(n, d, count) {
      var s = simplify(n, d);
      var result = [];
      for (var m = 1; m <= count; m++) { result.push([s[0] * m, s[1] * m]); }
      return result;
    };

    // ═══ MIXED NUMBER ═══
    var toMixed = function(n, den) {
      var whole = Math.floor(n / den);
      var rem = n % den;
      return whole > 0 ? (rem > 0 ? whole + ' ' + rem + '/' + den : '' + whole) : n + '/' + den;
    };

    // ═══ CHALLENGE GENERATION ═══
    var generateChallenge = function() {
      var types = ['identify', 'equivalent', 'compare'];
      var type = types[Math.floor(Math.random() * types.length)];
      var ch;
      if (type === 'identify') {
        var d2 = dpool[Math.floor(Math.random() * dpool.length)];
        var n = Math.floor(Math.random() * d2) + 1;
        upd({ pieces: { numerator: n, denominator: d2 } });
        ch = { type: type, question: 'Look at the shaded pieces. How many pieces are filled?', answer: n };
      } else if (type === 'equivalent') {
        var d3 = [2, 3, 4, 5, 6][Math.floor(Math.random() * 5)];
        var n2 = Math.floor(Math.random() * (d3 - 1)) + 1;
        var mult = Math.floor(Math.random() * 3) + 2;
        ch = { type: type, question: n2 + '/' + d3 + ' = ?/' + (d3 * mult) + '  \u2014 What is the missing numerator?', answer: n2 * mult };
      } else {
        var da = [2, 3, 4, 6, 8][Math.floor(Math.random() * 5)];
        var na = Math.floor(Math.random() * da) + 1;
        var db = [2, 3, 4, 6, 8][Math.floor(Math.random() * 5)];
        var nb = Math.floor(Math.random() * db) + 1;
        var va = na / da, vb = nb / db;
        ch = { type: type, question: 'Which is larger: ' + na + '/' + da + ' or ' + nb + '/' + db + '? Enter the numerator of the larger fraction.', answer: va >= vb ? na : nb };
      }
      upd({ challenge: ch, answer: '', feedback: null });
    };

    var checkChallenge = function() {
      if (!challenge) return;
      var ans = parseInt(answer);
      var ok = ans === challenge.answer;
      announceToSR(ok ? 'Correct!' : 'Incorrect');
      upd({
        feedback: ok
          ? { correct: true, msg: '\u2705 Correct!' }
          : { correct: false, msg: '\u274C The answer was ' + challenge.answer },
        score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
      });
      if (ok) awardXP('fractionChallenge', 10, 'fraction challenge');
    };

    // ═══ COMPARE QUIZ ═══
    var makeQuiz = function() {
      var n1q = Math.floor(Math.random() * 9) + 1, d1q = Math.floor(Math.random() * 8) + 2;
      var n2q = Math.floor(Math.random() * 9) + 1, d2q = Math.floor(Math.random() * 8) + 2;
      while (n1q / d1q === n2q / d2q) { n2q = Math.floor(Math.random() * 9) + 1; d2q = Math.floor(Math.random() * 8) + 2; }
      var ans = n1q / d1q > n2q / d2q ? n1q + '/' + d1q : n2q + '/' + d2q;
      upd({
        quiz: { n1: n1q, d1: d1q, n2: n2q, d2: d2q, answer: ans, opts: [n1q + '/' + d1q, n2q + '/' + d2q, 'They are equal'], answered: false },
        num1: n1q, den1: d1q, num2: n2q, den2: d2q
      });
    };

    // ═══ TAB: PRACTICE ═══
    var renderPractice = function() {
      var pn = pieces.numerator;
      var pd = pieces.denominator;
      return h('div', { className: 'space-y-4' },
        // Sliders
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Denominator (parts)'),
            h('input', {
              type: 'range', min: '2', max: '20', value: pd,
              onChange: function(e) { var v = parseInt(e.target.value); upd({ pieces: { denominator: v, numerator: Math.min(pn, v) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pd)
          ),
          h('div', { className: 'bg-rose-50 rounded-lg p-3 border border-rose-100' },
            h('label', { className: 'block text-xs text-rose-700 mb-1 font-bold' }, 'Numerator (selected)'),
            h('input', {
              type: 'range', min: '0', max: String(pd), value: pn,
              onChange: function(e) { upd({ pieces: { denominator: pd, numerator: parseInt(e.target.value) } }); },
              className: 'w-full accent-rose-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-rose-700' }, pn)
          )
        ),
        // Pie + bar
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-6 flex justify-center' },
          drawPie(pn, pd, 240, null)
        ),
        h('div', { className: 'bg-white rounded-xl border-2 border-rose-200 p-4' },
          h('div', { className: 'flex gap-[2px] h-12 rounded-lg overflow-hidden' },
            Array.from({ length: pd }, function(_, i) {
              return h('div', {
                key: i,
                onClick: function() { upd({ pieces: { denominator: pd, numerator: i < pn ? i : i + 1 } }); },
                className: 'flex-1 cursor-pointer transition-all ' + (i < pn ? 'bg-rose-500 hover:bg-rose-600' : 'bg-rose-100 hover:bg-rose-200')
              });
            })
          )
        ),
        // Value display
        h('div', { className: 'bg-white rounded-xl p-4 border border-rose-100 text-center' },
          h('div', { className: 'inline-flex flex-col items-center' },
            h('span', { className: 'text-3xl font-bold text-rose-700 border-b-4 border-rose-400 px-4 pb-1' }, pn),
            h('span', { className: 'text-3xl font-bold text-rose-700 px-4 pt-1' }, pd)
          ),
          h('div', { className: 'text-sm text-rose-600 mt-2' },
            '= ' + (pn / pd * 100).toFixed(0) + '%',
            pn > 0 && h('span', { className: 'text-slate-400 ml-2' }, '\u2248 ' + (pn / pd).toFixed(3))
          ),
          pn === pd && h('div', { className: 'text-sm font-bold text-green-600 mt-1' }, '= 1 whole! \uD83C\uDF89')
        ),
        // Preset buttons
        h('div', { className: 'flex flex-wrap gap-2' },
          [{ n: 1, d: 2, l: '\u00BD' }, { n: 1, d: 3, l: '\u2153' }, { n: 1, d: 4, l: '\u00BC' }, { n: 2, d: 3, l: '\u2154' },
           { n: 3, d: 4, l: '\u00BE' }, { n: 3, d: 8, l: '\u215C' }, { n: 5, d: 6, l: '\u215A' }, { n: 7, d: 12, l: '7/12' },
           { n: 11, d: 16, l: '11/16' }, { n: 13, d: 20, l: '13/20' }
          ].map(function(p) {
            return h('button', {
              key: p.l,
              onClick: function() { upd({ pieces: { numerator: p.n, denominator: p.d } }); },
              className: 'px-3 py-1.5 text-sm font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all'
            }, p.l);
          })
        )
      );
    };

    // ═══ TAB: COMPARE ═══
    var renderCompare = function() {
      var nlMax = Math.max(Math.ceil(val1), Math.ceil(val2), 2);
      return h('div', { className: 'space-y-3' },
        // Quick presets
        h('div', { className: 'flex flex-wrap gap-1.5' },
          h('span', { className: 'text-[10px] font-bold text-slate-400 self-center' }, 'Presets:'),
          [[1,2,1,3],[2,5,3,8],[3,4,5,6],[1,4,2,8],[7,10,3,5],[5,12,1,3]].map(function(pr) {
            return h('button', {
              key: pr.join('-'),
              onClick: function() { upd({ num1: pr[0], den1: pr[1], num2: pr[2], den2: pr[3] }); },
              className: 'px-2 py-1 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-all'
            }, pr[0] + '/' + pr[1] + ' vs ' + pr[2] + '/' + pr[3]);
          })
        ),
        // Two fraction inputs
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'Fraction A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6', sn: s1[0], sd: s1[1], val: val1 },
           { label: 'Fraction B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444', sn: s2[0], sd: s2[1], val: val2 }
          ].map(function(frac) {
            var upObj = {};
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-4' },
              h('h4', { className: 'text-sm font-bold text-slate-600 mb-2' }, frac.label),
              h('div', { className: 'flex items-center justify-center gap-2 mb-3' },
                h('div', { className: 'text-center' },
                  h('input', {
                    type: 'number', min: 0, max: 20, value: frac.n,
                    onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                    className: 'w-14 text-center text-xl font-bold border-b-2 outline-none', style: { borderColor: frac.color }
                  }),
                  h('div', { className: 'w-14 h-0.5 my-1', style: { backgroundColor: frac.color } }),
                  h('input', {
                    type: 'number', min: 1, max: 20, value: frac.d,
                    onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                    className: 'w-14 text-center text-xl font-bold outline-none'
                  })
                ),
                h('div', { className: 'text-left ml-2' },
                  h('p', { className: 'text-lg font-bold text-slate-400' }, '= ' + (frac.val * 100).toFixed(0) + '%'),
                  h('p', { className: 'text-xs text-slate-400' }, '\u2248 ' + frac.val.toFixed(3)),
                  (frac.sn !== frac.n || frac.sd !== frac.d) && h('p', { className: 'text-xs text-slate-400' }, '\u2192 ' + frac.sn + '/' + frac.sd),
                  frac.n > frac.d && h('p', { className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDCE6 ' + toMixed(frac.n, frac.d))
                )
              ),
              mode === 'bar' ? drawBar(frac.n, frac.d, frac.color) : h('div', { className: 'flex justify-center' }, drawPie(frac.n, frac.d, 100, frac.color))
            );
          })
        ),
        // View mode toggle
        h('div', { className: 'flex justify-end gap-1' },
          ['bar', 'pie'].map(function(m) {
            return h('button', {
              key: m,
              onClick: function() { upd({ mode: m }); },
              className: 'px-3 py-1 rounded-lg text-xs font-bold capitalize ' + (mode === m ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600')
            }, m === 'bar' ? '\u2588 Bar' : '\u25CF Pie');
          })
        ),
        // Number line
        h('div', { className: 'bg-white rounded-xl border p-3' },
          h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, '\uD83D\uDCCF Number Line'),
          h('svg', { viewBox: '0 0 400 50', className: 'w-full', style: { maxHeight: '60px' } },
            h('line', { x1: 20, y1: 30, x2: 380, y2: 30, stroke: '#94a3b8', strokeWidth: 2 }),
            Array.from({ length: nlMax + 1 }, function(_, i) {
              var x = 20 + i * (360 / nlMax);
              return h('g', { key: 't' + i },
                h('line', { x1: x, y1: 24, x2: x, y2: 36, stroke: '#64748b', strokeWidth: 2 }),
                h('text', { x: x, y: 46, textAnchor: 'middle', style: { fontSize: '9px', fontWeight: 'bold' }, fill: '#475569' }, i)
              );
            }),
            h('circle', { cx: 20 + val1 * (360 / nlMax), cy: 30, r: 6, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }),
            h('text', { x: 20 + val1 * (360 / nlMax), y: 18, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#3b82f6' }, num1 + '/' + den1),
            h('circle', { cx: 20 + val2 * (360 / nlMax), cy: 30, r: 6, fill: '#ef4444', stroke: 'white', strokeWidth: 2 }),
            h('text', { x: 20 + val2 * (360 / nlMax), y: 18, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: '#ef4444' }, num2 + '/' + den2),
            Math.abs(val1 - val2) > 0.001 && h('line', { x1: 20 + Math.min(val1, val2) * (360 / nlMax), y1: 38, x2: 20 + Math.max(val1, val2) * (360 / nlMax), y2: 38, stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '3 2' })
          )
        ),
        // Comparison result (hidden during quiz)
        !(quiz && !quiz.answered) && h('div', {
          className: 'p-3 rounded-xl text-center font-bold text-lg ' +
            (Math.abs(val1 - val2) < 0.001 ? 'bg-green-50 text-green-700 border border-green-200' :
             val1 > val2 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200')
        }, Math.abs(val1 - val2) < 0.001
            ? num1 + '/' + den1 + ' = ' + num2 + '/' + den2 + ' \u2705 Equal!'
            : val1 > val2
              ? num1 + '/' + den1 + ' > ' + num2 + '/' + den2 + '  (by ' + Math.abs(val1 - val2).toFixed(3) + ')'
              : num1 + '/' + den1 + ' < ' + num2 + '/' + den2 + '  (by ' + Math.abs(val1 - val2).toFixed(3) + ')'
        ),
        // Which is Larger? Quiz
        h('div', { className: 'border-t border-slate-200 pt-3' },
          h('div', { className: 'flex items-center gap-2 mb-2' },
            h('button', {
              onClick: makeQuiz,
              className: 'px-3 py-1.5 rounded-lg text-xs font-bold ' + (quiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-600 text-white') + ' hover:opacity-90 transition-all'
            }, quiz ? '\uD83D\uDD04 Next Round' : '\u26A1 Which is Larger?'),
            quizScore > 0 && h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + quizScore + ' | \uD83D\uDD25 ' + quizStreak)
          ),
          quiz && !quiz.answered && h('div', { className: 'bg-orange-50 rounded-xl p-3 border border-orange-200' },
            h('p', { className: 'text-sm font-bold text-orange-800 mb-2' }, 'Which fraction is larger?'),
            h('div', { className: 'flex gap-2 justify-center' },
              quiz.opts.map(function(opt) {
                return h('button', {
                  key: opt,
                  onClick: function() {
                    var correct = opt === quiz.answer;
                    upd({
                      quiz: Object.assign({}, quiz, { answered: true, chosen: opt }),
                      quizScore: quizScore + (correct ? 1 : 0),
                      quizStreak: correct ? quizStreak + 1 : 0
                    });
                    if (correct) { addToast('\u2705 Correct! ' + quiz.answer + ' is larger', 'success'); awardXP('fractionViz', 5, 'fraction quiz'); }
                    else addToast('\u274C ' + quiz.answer + ' is larger', 'error');
                  },
                  className: 'px-4 py-2 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all'
                }, opt);
              })
            )
          ),
          quiz && quiz.answered && h('div', {
            className: 'p-3 rounded-xl text-sm font-bold text-center ' + (quiz.chosen === quiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')
          }, quiz.chosen === quiz.answer ? '\u2705 Correct! ' + quiz.answer + ' is larger' : '\u274C ' + quiz.answer + ' is larger')
        )
      );
    };

    // ═══ TAB: OPERATIONS ═══
    var renderOperations = function() {
      return h('div', { className: 'space-y-3' },
        // Fraction inputs (compact)
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6' },
           { label: 'B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444' }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-3 text-center' },
              h('span', { className: 'text-xs font-bold text-slate-500' }, 'Fraction ' + frac.label),
              h('div', { className: 'flex items-center justify-center gap-1 mt-1' },
                h('input', {
                  type: 'number', min: 0, max: 20, value: frac.n,
                  onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                  className: 'w-12 text-center text-lg font-bold border-b-2 outline-none', style: { borderColor: frac.color }
                }),
                h('span', { className: 'text-xl font-bold text-slate-400 mx-1' }, '/'),
                h('input', {
                  type: 'number', min: 1, max: 20, value: frac.d,
                  onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                  className: 'w-12 text-center text-lg font-bold outline-none'
                })
              )
            );
          })
        ),
        // Operation buttons
        h('div', { className: 'flex gap-2 justify-center' },
          [['add', '+'], ['sub', '\u2212'], ['mul', '\u00D7'], ['div', '\u00F7']].map(function(op) {
            return h('button', {
              key: op[0],
              onClick: function() { upd({ opMode: op[0] }); },
              className: 'w-12 h-12 rounded-lg text-xl font-black transition-all ' +
                (opMode === op[0] ? 'bg-orange-600 text-white shadow-md scale-110' : 'bg-slate-100 text-slate-600 hover:bg-orange-50')
            }, op[1]);
          })
        ),
        // Result
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4 text-center' },
          h('div', { className: 'text-2xl font-bold text-slate-800 mb-3' },
            h('span', { className: 'text-blue-600' }, num1 + '/' + den1),
            h('span', { className: 'mx-3 text-orange-500' }, opSymbols[opMode]),
            h('span', { className: 'text-red-600' }, num2 + '/' + den2),
            h('span', { className: 'mx-3 text-slate-400' }, '='),
            h('span', { className: 'text-emerald-600' }, opSimplified[0] + '/' + opSimplified[1])
          ),
          // Step-by-step
          h('div', { className: 'bg-orange-50 rounded-lg p-3 text-xs text-orange-800 space-y-1 text-left' },
            h('p', { className: 'font-bold' }, '\uD83D\uDCA1 Step by step:'),
            (opMode === 'add' || opMode === 'sub')
              ? h(React.Fragment, null,
                  h('p', null, '1. Find common denominator: LCD(' + den1 + ', ' + den2 + ') = ' + lcm(den1, den2)),
                  h('p', null, '2. Convert: ' + num1 + '/' + den1 + ' = ' + (num1 * (lcm(den1, den2) / den1)) + '/' + lcm(den1, den2) + ' and ' + num2 + '/' + den2 + ' = ' + (num2 * (lcm(den1, den2) / den2)) + '/' + lcm(den1, den2)),
                  h('p', null, '3. ' + (opMode === 'add' ? 'Add' : 'Subtract') + ' numerators: ' + opResult[0] + '/' + opResult[1]),
                  (opResult[0] !== opSimplified[0] || opResult[1] !== opSimplified[1]) && h('p', null, '4. Simplify: ' + opSimplified[0] + '/' + opSimplified[1])
                )
              : h(React.Fragment, null,
                  opMode === 'mul'
                    ? h('p', null, 'Multiply straight across: (' + num1 + '\u00D7' + num2 + ')/(' + den1 + '\u00D7' + den2 + ') = ' + opResult[0] + '/' + opResult[1])
                    : h('p', null, 'Flip and multiply: ' + num1 + '/' + den1 + ' \u00D7 ' + den2 + '/' + num2 + ' = ' + opResult[0] + '/' + opResult[1]),
                  (opResult[0] !== opSimplified[0] || opResult[1] !== opSimplified[1]) && h('p', null, 'Simplify: ' + opSimplified[0] + '/' + opSimplified[1])
                )
          ),
          // Result bar
          h('div', { className: 'mt-3 flex justify-center' },
            drawBar(Math.min(Math.abs(opSimplified[0]), opSimplified[1] * 2), opSimplified[1], '#22c55e')
          )
        )
      );
    };

    // ═══ TAB: EQUIVALENTS ═══
    var renderEquivalents = function() {
      return h('div', { className: 'space-y-3' },
        // Fraction inputs (compact)
        h('div', { className: 'grid grid-cols-2 gap-4' },
          [{ label: 'Fraction A', n: num1, d: den1, nk: 'num1', dk: 'den1', color: '#3b82f6' },
           { label: 'Fraction B', n: num2, d: den2, nk: 'num2', dk: 'den2', color: '#ef4444' }
          ].map(function(frac) {
            return h('div', { key: frac.label, className: 'bg-white rounded-xl border p-3 text-center' },
              h('span', { className: 'text-xs font-bold text-slate-500' }, frac.label),
              h('div', { className: 'flex items-center justify-center gap-1 mt-1' },
                h('input', {
                  type: 'number', min: 0, max: 20, value: frac.n,
                  onChange: function(e) { var o = {}; o[frac.nk] = Math.max(0, parseInt(e.target.value) || 0); upd(o); },
                  className: 'w-12 text-center text-lg font-bold border-b-2 outline-none', style: { borderColor: frac.color }
                }),
                h('span', { className: 'text-xl font-bold text-slate-400 mx-1' }, '/'),
                h('input', {
                  type: 'number', min: 1, max: 20, value: frac.d,
                  onChange: function(e) { var o = {}; o[frac.dk] = Math.max(1, parseInt(e.target.value) || 1); upd(o); },
                  className: 'w-12 text-center text-lg font-bold outline-none'
                })
              )
            );
          })
        ),
        // Equiv chains
        h('div', { className: 'bg-white rounded-xl border-2 border-orange-200 p-4' },
          h('p', { className: 'text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2' }, '\uD83D\uDD17 Equivalent Fractions for ' + s1[0] + '/' + s1[1]),
          h('div', { className: 'flex flex-wrap gap-2 mb-3' },
            equivChain(num1, den1, 8).map(function(eq, i) {
              return h('div', {
                key: 'a' + i,
                className: 'px-3 py-2 rounded-lg border text-center transition-all ' + (i === 0 ? 'bg-blue-100 border-blue-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-blue-50')
              },
                h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-blue-700' : 'text-slate-700') }, eq[0] + '/' + eq[1]),
                h('span', { className: 'text-[10px] text-slate-400 block' }, '\u00D7' + (i + 1))
              );
            })
          ),
          h('p', { className: 'text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2 mt-3' }, '\uD83D\uDD17 Equivalent Fractions for ' + s2[0] + '/' + s2[1]),
          h('div', { className: 'flex flex-wrap gap-2' },
            equivChain(num2, den2, 8).map(function(eq, i) {
              return h('div', {
                key: 'b' + i,
                className: 'px-3 py-2 rounded-lg border text-center transition-all ' + (i === 0 ? 'bg-red-100 border-red-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-red-50')
              },
                h('span', { className: 'text-sm font-bold ' + (i === 0 ? 'text-red-700' : 'text-slate-700') }, eq[0] + '/' + eq[1]),
                h('span', { className: 'text-[10px] text-slate-400 block' }, '\u00D7' + (i + 1))
              );
            })
          ),
          // Common denominator
          h('div', { className: 'mt-3 p-2 bg-violet-50 rounded-lg border border-violet-200 text-center' },
            h('p', { className: 'text-xs font-bold text-violet-700' }, '\uD83C\uDFAF Common denominator: ' + lcm(den1, den2)),
            h('p', { className: 'text-sm font-bold text-violet-800 mt-1' },
              (num1 * (lcm(den1, den2) / den1)) + '/' + lcm(den1, den2) + ' and ' + (num2 * (lcm(den1, den2) / den2)) + '/' + lcm(den1, den2)
            )
          )
        )
      );
    };

    // ══════════ MAIN RENDER ══════════
    return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
      // Header
      h('div', { className: 'flex items-center gap-3 mb-2' },
        h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
          h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
        h('h3', { className: 'text-lg font-bold text-rose-800' }, '\uD83C\uDF55 Fraction Lab'),
        h('div', { className: 'text-xs font-bold text-rose-600 ml-auto' }, score.correct + '/' + score.total)
      ),

      // Tab bar
      h('div', { className: 'flex gap-1 bg-rose-50 rounded-xl p-1 border border-rose-200' },
        [
          { id: 'practice', icon: '\uD83C\uDF55', label: 'Practice' },
          { id: 'compare', icon: '\uD83D\uDD0D', label: 'Compare' },
          { id: 'operations', icon: '\u2795', label: 'Operations' },
          { id: 'equivalents', icon: '\uD83D\uDD17', label: 'Equivalents' }
        ].map(function(t2) {
          return h('button', {
            key: t2.id,
            onClick: function() { upd({ tab: t2.id }); },
            className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
              (tab === t2.id ? 'bg-white text-rose-800 shadow-sm' : 'text-rose-500 hover:text-rose-700')
          }, t2.icon + ' ' + t2.label);
        })
      ),

      // Active tab content
      tab === 'practice' && renderPractice(),
      tab === 'compare' && renderCompare(),
      tab === 'operations' && renderOperations(),
      tab === 'equivalents' && renderEquivalents(),

      // Challenge section (always visible in practice tab)
      tab === 'practice' && h('div', { className: 'bg-rose-50 rounded-xl p-4 border border-rose-200 space-y-3' },
        h('div', { className: 'flex items-center justify-between' },
          h('div', { className: 'flex items-center gap-2' },
            h('h4', { className: 'text-sm font-bold text-rose-800' }, '\uD83C\uDFAF Fraction Challenge'),
            h('div', { className: 'flex gap-0.5 ml-2' },
              ['easy', 'medium', 'hard'].map(function(d) {
                return h('button', {
                  key: d,
                  onClick: function() { upd({ difficulty: d }); },
                  className: 'text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                    (difficulty === d
                      ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-rose-500 text-white')
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                }, d);
              })
            )
          )
        ),
        !challenge
          ? h('button', {
              onClick: generateChallenge,
              className: 'w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Generate Challenge')
          : h('div', { className: 'space-y-2' },
              h('p', { className: 'text-sm font-bold text-rose-800' }, challenge.question),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  type: 'number', value: answer,
                  onChange: function(e) { upd({ answer: e.target.value }); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
                  placeholder: 'Your answer...',
                  className: 'flex-1 px-3 py-2 border border-rose-300 rounded-lg text-sm font-mono'
                }),
                h('button', {
                  onClick: checkChallenge,
                  className: 'px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm hover:bg-rose-700'
                }, 'Check')
              ),
              feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
              feedback && h('button', {
                onClick: function() { upd({ challenge: null, feedback: null, answer: '' }); },
                className: 'text-xs text-rose-600 font-bold hover:underline'
              }, '\u27A1\uFE0F Next Challenge')
            )
      )
    );
  }
})();
