// ═══════════════════════════════════════════
// stem_tool_areamodel.js — Area Model Plugin
// Self-contained with 3 pedagogical enhancements:
//   1. Distributive property visualization
//   2. Multi-digit multiplication (partial products)
//   3. Commutative property toggle
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('areamodel', {
    icon: '\uD83D\uDFE7', label: 'Area Model',
    desc: 'Visual multiplication with area model grids, distributive property, and partial products.',
    color: 'amber', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardStemXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;

      // ── State via labToolData ──
      var ld = ctx.toolData || {};
      var _a = ld._areamodel || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var am = Object.assign({}, (prev && prev._areamodel) || {}, obj);
            return Object.assign({}, prev, { _areamodel: am });
          });
        }
      };

      var dims = _a.dims || { rows: 4, cols: 6 };
      var highlight = _a.highlight || { rows: 0, cols: 0 };
      var challenge = _a.challenge || null;
      var answer = _a.answer || '';
      var feedback = _a.feedback || null;
      var difficulty = _a.difficulty || 'easy';
      var score = _a.score || { correct: 0, total: 0 };
      var viewMode = _a.viewMode || 'basic'; // 'basic', 'distributive', 'multidigit'
      var swapped = _a.swapped || false; // commutative toggle

      // Effective dims (apply commutative swap)
      var rows = swapped ? dims.cols : dims.rows;
      var cols = swapped ? dims.rows : dims.cols;

      // ── Distributive property split point ──
      var splitAt = _a.splitAt || Math.min(5, Math.floor(cols / 2));

      // ── Multi-digit dims ──
      var multiDims = _a.multiDims || { a: 23, b: 14 };

      // ── Check challenge ──
      var checkChallenge = function() {
        if (!challenge) return;
        var ans = parseInt(answer);
        var ok = ans === challenge.answer;
        announceToSR(ok ? 'Correct!' : 'Incorrect');
        upd({
          feedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + challenge.a + ' \u00d7 ' + challenge.b + ' = ' + challenge.answer }
            : { correct: false, msg: '\u274c Try again. Count the squares in the grid!' },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
        });
        if (ok) awardStemXP('multtable', 5, 'area model');
      };

      // ═══ VIEW: BASIC ═══
      var renderBasicGrid = function() {
        var cells = [];
        for (var i = 0; i < rows * cols; i++) {
          var r = Math.floor(i / cols);
          var c = i % cols;
          var isHigh = r < highlight.rows && c < highlight.cols;
          (function(ri, ci) {
            cells.push(h('div', {
              key: i,
              onClick: function() { upd({ highlight: { rows: ri + 1, cols: ci + 1 } }); },
              className: 'aspect-square rounded-sm border cursor-pointer transition-all hover:scale-110 ' +
                (isHigh ? 'bg-amber-400 border-amber-500 shadow-sm' : 'bg-amber-100 border-amber-200 hover:bg-amber-200'),
              style: { minWidth: '28px' }
            }));
          })(r, c);
        }
        return h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4 flex justify-center' },
          h('div', {
            className: 'inline-grid gap-[2px]',
            style: { gridTemplateColumns: 'repeat(' + cols + ', minmax(28px, 48px))' }
          }, cells)
        );
      };

      // ═══ VIEW: DISTRIBUTIVE PROPERTY ═══
      var renderDistributive = function() {
        var leftCols = Math.min(splitAt, cols);
        var rightCols = cols - leftCols;

        var leftCells = [];
        for (var i = 0; i < rows * leftCols; i++) {
          leftCells.push(h('div', { key: 'L'+i, className: 'aspect-square rounded-sm border bg-blue-400 border-blue-500', style: { minWidth: '24px' } }));
        }
        var rightCells = [];
        for (var j = 0; j < rows * rightCols; j++) {
          rightCells.push(h('div', { key: 'R'+j, className: 'aspect-square rounded-sm border bg-emerald-400 border-emerald-500', style: { minWidth: '24px' } }));
        }

        var leftProduct = rows * leftCols;
        var rightProduct = rows * rightCols;

        return h('div', { className: 'space-y-3' },
          // Split slider
          h('div', { className: 'flex items-center gap-2 bg-violet-50 rounded-lg p-2 border border-violet-200' },
            h('span', { className: 'text-xs font-bold text-violet-700' }, 'Split at column:'),
            h('input', {
              type: 'range', min: '1', max: String(cols - 1), value: leftCols,
              onChange: function(e) { upd({ splitAt: parseInt(e.target.value) }); },
              className: 'flex-1 accent-violet-600'
            }),
            h('span', { className: 'text-xs font-mono text-violet-600' }, leftCols + ' | ' + rightCols)
          ),
          // Two-part grid
          h('div', { className: 'bg-white rounded-xl border-2 border-amber-200 p-4' },
            h('div', { className: 'flex gap-3 justify-center items-start' },
              // Left section
              h('div', { className: 'text-center' },
                h('div', { className: 'text-xs font-bold text-blue-700 mb-1' }, rows + ' \u00d7 ' + leftCols),
                h('div', {
                  className: 'inline-grid gap-[2px]',
                  style: { gridTemplateColumns: 'repeat(' + leftCols + ', minmax(24px, 40px))' }
                }, leftCells),
                h('div', { className: 'text-sm font-bold text-blue-600 mt-1' }, '= ' + leftProduct)
              ),
              // Divider
              h('div', { className: 'flex flex-col items-center justify-center self-stretch' },
                h('div', { className: 'w-px flex-1 bg-violet-300' }),
                h('span', { className: 'text-violet-500 font-bold text-lg py-1' }, '+'),
                h('div', { className: 'w-px flex-1 bg-violet-300' })
              ),
              // Right section
              rightCols > 0 && h('div', { className: 'text-center' },
                h('div', { className: 'text-xs font-bold text-emerald-700 mb-1' }, rows + ' \u00d7 ' + rightCols),
                h('div', {
                  className: 'inline-grid gap-[2px]',
                  style: { gridTemplateColumns: 'repeat(' + rightCols + ', minmax(24px, 40px))' }
                }, rightCells),
                h('div', { className: 'text-sm font-bold text-emerald-600 mt-1' }, '= ' + rightProduct)
              )
            )
          ),
          // Equation
          h('div', { className: 'bg-gradient-to-r from-blue-50 via-violet-50 to-emerald-50 rounded-xl p-4 border border-violet-200 text-center' },
            h('div', { className: 'text-lg font-bold text-violet-800' },
              rows + ' \u00d7 ' + cols + ' = ' + rows + ' \u00d7 ',
              h('span', { className: 'text-blue-600' }, leftCols),
              ' + ' + rows + ' \u00d7 ',
              h('span', { className: 'text-emerald-600' }, rightCols)
            ),
            h('div', { className: 'text-xl font-bold text-violet-700 mt-1' },
              rows * cols + ' = ',
              h('span', { className: 'text-blue-600' }, leftProduct),
              ' + ',
              h('span', { className: 'text-emerald-600' }, rightProduct),
              ' = ',
              h('span', { className: 'text-2xl text-violet-900' }, leftProduct + rightProduct)
            ),
            h('p', { className: 'text-xs text-violet-500 mt-2 italic' },
              '\uD83D\uDCA1 Distributive Property: a \u00d7 (b + c) = a\u00d7b + a\u00d7c')
          )
        );
      };

      // ═══ VIEW: MULTI-DIGIT PARTIAL PRODUCTS ═══
      var renderMultiDigit = function() {
        var a = multiDims.a;
        var b = multiDims.b;
        // Split into tens and ones
        var aTens = Math.floor(a / 10) * 10;
        var aOnes = a % 10;
        var bTens = Math.floor(b / 10) * 10;
        var bOnes = b % 10;

        var pp = [
          { label: aTens + '\u00d7' + bTens, value: aTens * bTens, color: 'bg-blue-400', text: 'text-blue-700' },
          { label: aTens + '\u00d7' + bOnes, value: aTens * bOnes, color: 'bg-sky-300', text: 'text-sky-700' },
          { label: aOnes + '\u00d7' + bTens, value: aOnes * bTens, color: 'bg-emerald-300', text: 'text-emerald-700' },
          { label: aOnes + '\u00d7' + bOnes, value: aOnes * bOnes, color: 'bg-amber-300', text: 'text-amber-700' }
        ];
        var total = a * b;

        return h('div', { className: 'space-y-3' },
          // Input controls
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-100' },
              h('label', { className: 'block text-xs text-indigo-700 mb-1 font-bold' }, 'Factor A'),
              h('input', {
                type: 'number', min: '10', max: '99', value: a,
                onChange: function(e) { upd({ multiDims: { a: Math.max(10, Math.min(99, parseInt(e.target.value) || 10)), b: b } }); },
                className: 'w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-lg text-center font-bold text-lg'
              })
            ),
            h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-100' },
              h('label', { className: 'block text-xs text-indigo-700 mb-1 font-bold' }, 'Factor B'),
              h('input', {
                type: 'number', min: '10', max: '99', value: b,
                onChange: function(e) { upd({ multiDims: { a: a, b: Math.max(10, Math.min(99, parseInt(e.target.value) || 10)) } }); },
                className: 'w-full px-3 py-1.5 text-sm border border-indigo-200 rounded-lg text-center font-bold text-lg'
              })
            )
          ),

          // Area model table
          h('div', { className: 'bg-white rounded-xl border-2 border-indigo-200 p-4 overflow-x-auto' },
            h('table', { className: 'mx-auto border-collapse' },
              h('thead', null,
                h('tr', null,
                  h('th', { className: 'p-2 text-sm font-bold text-slate-500' }, '\u00d7'),
                  h('th', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-tl-lg border border-indigo-200', style: { minWidth: '120px' } }, bTens),
                  h('th', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-tr-lg border border-indigo-200', style: { minWidth: '80px' } }, bOnes)
                )
              ),
              h('tbody', null,
                h('tr', null,
                  h('td', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200' }, aTens),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[0].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[0].label),
                    h('div', { className: 'text-xl font-bold ' + pp[0].text }, pp[0].value)
                  ),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[1].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[1].label),
                    h('div', { className: 'text-xl font-bold ' + pp[1].text }, pp[1].value)
                  )
                ),
                h('tr', null,
                  h('td', { className: 'p-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200' }, aOnes),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[2].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[2].label),
                    h('div', { className: 'text-xl font-bold ' + pp[2].text }, pp[2].value)
                  ),
                  h('td', { className: 'p-3 text-center border border-indigo-200 ' + pp[3].color + ' bg-opacity-60' },
                    h('div', { className: 'text-xs font-bold text-slate-600' }, pp[3].label),
                    h('div', { className: 'text-xl font-bold ' + pp[3].text }, pp[3].value)
                  )
                )
              )
            )
          ),

          // Sum equation
          h('div', { className: 'bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 rounded-xl p-4 border border-indigo-200 text-center' },
            h('div', { className: 'text-sm font-bold text-slate-600 mb-1' }, a + ' \u00d7 ' + b + ' = partial products:'),
            h('div', { className: 'flex items-center justify-center gap-2 flex-wrap text-lg font-bold' },
              pp.map(function(p, i) {
                return h(React.Fragment, { key: i },
                  i > 0 && h('span', { className: 'text-slate-400' }, '+'),
                  h('span', { className: p.text + ' bg-white px-2 py-0.5 rounded-lg border shadow-sm' }, p.value)
                );
              }),
              h('span', { className: 'text-slate-400' }, '='),
              h('span', { className: 'text-2xl text-indigo-900 bg-indigo-100 px-3 py-0.5 rounded-lg border border-indigo-300 shadow-sm' }, total)
            ),
            h('p', { className: 'text-xs text-indigo-500 mt-2 italic' },
              '\uD83D\uDCA1 Break multi-digit numbers into tens and ones, multiply each pair, then add!')
          )
        );
      };

      // ══════════ RENDER ══════════
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-amber-800' }, '\uD83D\uDFE7 Area Model'),
          h('div', { className: 'text-xs font-bold text-amber-600 ml-auto' }, score.correct + '/' + score.total)
        ),

        // Mode tabs
        h('div', { className: 'flex gap-1 bg-amber-50 rounded-xl p-1 border border-amber-200' },
          [
            { id: 'basic', icon: '\uD83D\uDFE7', label: 'Basic Grid' },
            { id: 'distributive', icon: '\u2702\uFE0F', label: 'Distributive' },
            { id: 'multidigit', icon: '\uD83D\uDCCA', label: 'Partial Products' }
          ].map(function(m) {
            return h('button', {
              key: m.id,
              onClick: function() { upd({ viewMode: m.id }); },
              className: 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ' +
                (viewMode === m.id ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-500 hover:text-amber-700')
            }, m.icon + ' ' + m.label);
          })
        ),

        // Sliders (basic + distributive modes)
        (viewMode === 'basic' || viewMode === 'distributive') && h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100' },
            h('label', { className: 'block text-xs text-amber-700 mb-1 font-bold' }, 'Rows (Factor 1)'),
            h('input', {
              type: 'range', min: '1', max: '12', value: dims.rows,
              onChange: function(e) { upd({ dims: { rows: parseInt(e.target.value), cols: dims.cols }, highlight: { rows: 0, cols: 0 } }); },
              className: 'w-full accent-amber-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-amber-700' }, dims.rows)
          ),
          h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-100' },
            h('label', { className: 'block text-xs text-amber-700 mb-1 font-bold' }, 'Columns (Factor 2)'),
            h('input', {
              type: 'range', min: '1', max: '12', value: dims.cols,
              onChange: function(e) { upd({ dims: { rows: dims.rows, cols: parseInt(e.target.value) }, highlight: { rows: 0, cols: 0 } }); },
              className: 'w-full accent-amber-600'
            }),
            h('div', { className: 'text-center text-lg font-bold text-amber-700' }, dims.cols)
          )
        ),

        // Grid / Visualization
        viewMode === 'basic' && renderBasicGrid(),
        viewMode === 'distributive' && renderDistributive(),
        viewMode === 'multidigit' && renderMultiDigit(),

        // Product display (basic mode)
        viewMode === 'basic' && h('div', { className: 'bg-white rounded-xl p-4 border border-amber-100 text-center' },
          h('div', { className: 'text-xl font-bold text-amber-800' },
            (challenge && !feedback) ? rows + ' \u00d7 ' + cols + ' = ?' :
            rows + ' \u00d7 ' + cols + ' = ',
            (challenge && !feedback) ? null : h('span', { className: 'text-3xl text-amber-600' }, rows * cols)
          ),
          (challenge && !feedback) ? null :
          highlight.rows > 0 && highlight.cols > 0 && h('div', { className: 'text-sm text-amber-600 mt-1' },
            'Selected: ' + highlight.rows + ' \u00d7 ' + highlight.cols + ' = ' + (highlight.rows * highlight.cols) + ' (click squares to highlight)')
        ),

        // Commutative toggle (basic mode)
        viewMode === 'basic' && h('div', { className: 'flex items-center gap-3' },
          h('button', {
            onClick: function() { upd({ highlight: { rows: 0, cols: 0 } }); },
            className: 'text-xs text-slate-400 hover:text-amber-600'
          }, 'Clear highlight'),
          h('button', {
            onClick: function() { upd({ swapped: !swapped }); },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
              (swapped ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-600 hover:bg-violet-50 border border-slate-200')
          },
            '\u21C4 Commutative: ' + rows + ' \u00d7 ' + cols + (swapped ? ' (swapped!)' : '')
          ),
          swapped && h('span', { className: 'text-xs text-violet-500 italic' }, '\uD83D\uDCA1 Same product! a\u00d7b = b\u00d7a')
        ),

        // Challenge section (basic mode)
        viewMode === 'basic' && h('div', { className: 'bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-2' },
              h('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFAF Multiplication Challenge'),
              h('div', { className: 'flex gap-0.5 ml-2' },
                ['easy','medium','hard'].map(function(d) {
                  return h('button', {
                    key: d, onClick: function() { upd({ difficulty: d }); },
                    className: 'text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                      (difficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                  }, d);
                })
              )
            )
          ),

          !challenge
            ? h('button', {
                onClick: function() {
                  var max = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 12 : 9;
                  var a = Math.floor(Math.random() * (max - 1)) + 2;
                  var b = Math.floor(Math.random() * (max - 1)) + 2;
                  upd({
                    dims: { rows: a, cols: b },
                    highlight: { rows: 0, cols: 0 },
                    challenge: { a: a, b: b, answer: a * b, question: 'What is ' + a + ' \u00d7 ' + b + '?' },
                    answer: '',
                    feedback: null
                  });
                },
                className: 'w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
              }, '\uD83C\uDFB2 Generate Challenge')
            : h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold text-amber-800' }, challenge.question),
                h('div', { className: 'flex gap-2' },
                  h('input', {
                    type: 'number', value: answer,
                    onChange: function(e) { upd({ answer: e.target.value }); },
                    onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkChallenge(); },
                    placeholder: 'Product = ?',
                    className: 'flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono'
                  }),
                  h('button', {
                    onClick: checkChallenge,
                    className: 'px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm hover:bg-amber-700'
                  }, 'Check')
                ),
                feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
                feedback && h('button', {
                  onClick: function() { upd({ challenge: null, feedback: null, answer: '' }); },
                  className: 'text-xs text-amber-600 font-bold hover:underline'
                }, t('explore.next_challenge') || 'Next Challenge')
              )
        )
      );
    }
  });
})();
