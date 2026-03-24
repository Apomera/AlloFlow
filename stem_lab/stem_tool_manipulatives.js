// ═══════════════════════════════════════════
// stem_tool_manipulatives.js — Math Manipulatives Plugin
// Base-10 Blocks, Abacus, Slide Rule
// Extracted from stem_lab_module.js L3437-3916
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('base10', {
    icon: '\uD83E\uDDEE', label: 'Math Manipulatives',
    desc: 'Base-10 blocks, abacus, and slide rule for place value exploration.',
    color: 'orange', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;

      // ── All state via ctx.toolData._manipulatives ──
      var ld = ctx.toolData || {};
      var _m = ld._manipulatives || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var mn = Object.assign({}, (prev && prev._manipulatives) || {}, obj);
            return Object.assign({}, prev, { _manipulatives: mn });
          });
        }
      };

      var manipMode = _m.mode || 'blocks';
      var score = _m.score || { correct: 0, total: 0 };

      // ═══ BASE-10 BLOCKS STATE ═══
      var b10 = _m.b10 || { ones: 0, tens: 0, hundreds: 0, thousands: 0 };
      var b10Challenge = _m.b10Challenge || null;
      var b10Feedback = _m.b10Feedback || null;
      var regroupFlash = _m.regroupFlash || null;
      var totalValue = b10.ones + b10.tens * 10 + b10.hundreds * 100 + b10.thousands * 1000;

      var setB10 = function(fn) {
        upd({ b10: typeof fn === 'function' ? fn(b10) : fn });
      };

      // ═══ ABACUS STATE ═══
      var abacus = _m.abacus || { rods: [0, 0, 0, 0, 0] };
      var abacusChallenge = _m.abacusChallenge || null;
      var abacusFeedback = _m.abacusFeedback || null;
      var rods = abacus.rods || [0, 0, 0, 0, 0];
      var placeNames = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten-Thousands'];
      var placeMultipliers = [1, 10, 100, 1000, 10000];
      var abacusTotal = rods.reduce(function(sum, v, i) { return sum + v * placeMultipliers[i]; }, 0);

      // ═══ SLIDE RULE STATE ═══
      var sr = _m.slideRule || { cOffset: 0, cursorPos: 0.301 };
      var dVal = Math.pow(10, sr.cursorPos || 0.301);
      var cVal = Math.pow(10, (sr.cursorPos || 0.301) - (sr.cOffset || 0));
      var product = dVal * Math.pow(10, sr.cOffset || 0);

      // ═══ REGROUPING ═══
      var doRegroup = function(fromPlace, toPlace) {
        if (b10[fromPlace] < 10 || b10[toPlace] >= 9) return;
        var newB10 = Object.assign({}, b10);
        newB10[fromPlace] = b10[fromPlace] - 10;
        newB10[toPlace] = b10[toPlace] + 1;
        upd({ b10: newB10, regroupFlash: toPlace });
        setTimeout(function() { upd({ regroupFlash: null }); }, 700);
      };
      var doUngroup = function(fromPlace, toPlace) {
        if (b10[fromPlace] < 1) return;
        var newB10 = Object.assign({}, b10);
        newB10[fromPlace] = b10[fromPlace] - 1;
        newB10[toPlace] = b10[toPlace] + 10;
        upd({ b10: newB10, regroupFlash: toPlace });
        setTimeout(function() { upd({ regroupFlash: null }); }, 700);
      };

      // ═══ CHALLENGE CHECKS ═══
      var checkBase10 = function() {
        if (!b10Challenge) return;
        var ok = totalValue === b10Challenge.target;
        announceToSR(ok ? 'Correct!' : 'Incorrect');
        upd({
          b10Feedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + b10Challenge.target + ' = ' + (b10.thousands > 0 ? b10.thousands + ' thousands + ' : '') + (b10.hundreds > 0 ? b10.hundreds + ' hundreds + ' : '') + b10.tens + ' tens + ' + b10.ones + ' ones' }
            : { correct: false, msg: '\u274C Your blocks show ' + totalValue + ', target is ' + b10Challenge.target },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
        });
        if (ok) awardXP('base10', 5, 'base-10 blocks');
      };

      var checkAbacus = function() {
        if (!abacusChallenge) return;
        var ok = abacusTotal === abacusChallenge.target;
        upd({
          abacusFeedback: ok
            ? { correct: true, msg: '\u2705 Correct! ' + abacusChallenge.target.toLocaleString() }
            : { correct: false, msg: '\u274C Shows ' + abacusTotal.toLocaleString() + ', target is ' + abacusChallenge.target.toLocaleString() },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
        });
        if (ok) awardXP('base10', 5, 'abacus');
      };

      // ═══ 3D BLOCK RENDERER ═══
      var renderBlock3D = function(color, lightColor, w, ht, count, gridCols, gridRows) {
        return Array.from({ length: count }).map(function(_, i) {
          return h('div', {
            key: i,
            style: {
              width: w + 'px', height: ht + 'px',
              background: 'linear-gradient(135deg, ' + lightColor + ' 0%, ' + color + ' 60%, ' + color + ' 100%)',
              border: '1px solid rgba(0,0,0,0.2)',
              borderRadius: '3px',
              boxShadow: '1px 2px 4px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)',
              backgroundImage: gridCols > 1 || gridRows > 1
                ? 'repeating-linear-gradient(90deg, transparent, transparent ' + (100/gridCols) + '%, rgba(0,0,0,0.08) ' + (100/gridCols) + '%, rgba(0,0,0,0.08) calc(' + (100/gridCols) + '% + 1px)), repeating-linear-gradient(0deg, transparent, transparent ' + (100/gridRows) + '%, rgba(0,0,0,0.08) ' + (100/gridRows) + '%, rgba(0,0,0,0.08) calc(' + (100/gridRows) + '% + 1px))'
                : 'none',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              flexShrink: 0
            }
          });
        });
      };

      // ═══ ABACUS ROD SETTER ═══
      var setRod = function(idx, val) {
        var nr = rods.slice();
        nr[idx] = Math.max(0, Math.min(9, val));
        upd({ abacus: { rods: nr } });
      };

      // ═══ PLACE VALUE COLUMN ═══
      var placeCol = function(label, symbol, place, color, lightColor, bw, bh, gridC, gridR) {
        return h('div', {
          className: 'bg-white rounded-xl p-3 border-2 text-center shadow-sm',
          style: Object.assign({ borderColor: lightColor }, regroupFlash === place ? { animation: 'b10regroup 0.7s ease' } : {})
        },
          h('div', { className: 'text-xs font-bold uppercase mb-1', style: { color: color } }, symbol + ' ' + label),
          h('div', { className: 'flex justify-center gap-1 mb-2 min-h-[58px] flex-wrap items-center' }, renderBlock3D(color, lightColor, bw, bh, b10[place], gridC, gridR)),
          h('div', { className: 'flex items-center justify-center gap-2' },
            h('button', {
              onClick: function() { var n = Object.assign({}, b10); n[place] = Math.max(0, n[place] - 1); upd({ b10: n }); },
              className: 'w-8 h-8 rounded-full font-bold text-lg hover:opacity-80 transition-all flex items-center justify-center',
              style: { background: lightColor + '33', color: color }
            }, '\u2212'),
            h('span', { className: 'text-2xl font-bold w-8 text-center', style: { color: color } }, b10[place]),
            h('button', {
              onClick: function() { var n = Object.assign({}, b10); n[place] = Math.min(9, n[place] + 1); upd({ b10: n }); },
              className: 'w-8 h-8 rounded-full font-bold text-lg hover:opacity-80 transition-all flex items-center justify-center',
              style: { background: lightColor + '33', color: color }
            }, '+')
          ),
          h('div', { className: 'text-xs mt-1', style: { color: color } }, '\u00D7' + { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place] + ' = ' + b10[place] * { thousands: 1000, hundreds: 100, tens: 10, ones: 1 }[place])
        );
      };

      // ═══ REGROUP BUTTON ═══
      var regroupBtn = function(label, from, to, enabled, colorFrom, colorTo) {
        return h('button', {
          onClick: function() { if (label.indexOf('\u2192') > 0 && label.indexOf('10') === 0) doRegroup(from, to); else doUngroup(from, to); },
          disabled: !enabled,
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (enabled ? 'text-white shadow hover:shadow-md hover:scale-105' : 'bg-slate-100 text-slate-300 cursor-not-allowed'),
          style: enabled ? { background: 'linear-gradient(90deg, ' + colorFrom + ', ' + colorTo + ')' } : {}
        }, label);
      };

      // ═══ HEADER ═══
      var headerEl = h('div', { className: 'space-y-3 mb-4' },
        h('div', { className: 'flex items-center gap-3' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-orange-800' }, '\uD83E\uDDEE Math Manipulatives'),
          h('div', { className: 'text-xs font-bold text-emerald-600 ml-auto' }, score.correct + '/' + score.total)
        ),
        h('div', { className: 'flex gap-1 bg-slate-100 rounded-xl p-1' },
          [{ id: 'blocks', icon: '\uD83E\uDDF1', label: 'Base-10 Blocks' },
           { id: 'abacus', icon: '\uD83E\uDDEE', label: 'Abacus' },
           { id: 'slideRule', icon: '\uD83D\uDCCF', label: 'Slide Rule' }
          ].map(function(m) {
            return h('button', {
              key: m.id,
              onClick: function() { upd({ mode: m.id }); },
              className: 'flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ' +
                (manipMode === m.id ? 'bg-white text-orange-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')
            }, m.icon + ' ' + m.label);
          })
        )
      );

      // ═══════════════ BASE-10 BLOCKS MODE ═══════════════
      if (manipMode === 'blocks') {
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('style', null, '@keyframes b10regroup { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0.5); } 40% { transform: scale(1.15); box-shadow: 0 0 20px 8px rgba(168,85,247,0.4); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168,85,247,0); } }'),
          h('div', { className: 'bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 p-6' },
            // Total display
            h('div', { className: 'text-center mb-4' },
              h('span', { className: 'text-4xl font-bold text-orange-800 font-mono' }, totalValue.toLocaleString()),
              h('span', { className: 'text-2xl text-slate-400 mx-3' }, '='),
              h('div', { className: 'flex items-end gap-2 flex-wrap justify-center', style: { minHeight: '60px' } },
                renderBlock3D('#db2777', '#f472b6', 56, 56, b10.thousands, 10, 10),
                b10.thousands > 0 && b10.hundreds > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#2563eb', '#60a5fa', 48, 14, b10.hundreds, 10, 1),
                (b10.thousands > 0 || b10.hundreds > 0) && b10.tens > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#059669', '#34d399', 10, 48, b10.tens, 1, 10),
                (b10.thousands > 0 || b10.hundreds > 0 || b10.tens > 0) && b10.ones > 0 && h('span', { className: 'w-px h-8 bg-slate-200 mx-0.5' }),
                renderBlock3D('#ea580c', '#fb923c', 10, 10, b10.ones, 1, 1),
                totalValue === 0 && h('span', { className: 'text-sm text-slate-300 italic' }, 'no blocks')
              )
            ),
            h('div', { className: 'flex items-center justify-center gap-4 mb-3 text-[10px] font-bold text-slate-400' },
              h('span', null, '\u25A0 Cube = 1000'), h('span', null, '\u25AC Flat = 100'), h('span', null, '\u2503 Rod = 10'), h('span', null, '\u25AA Unit = 1')
            ),
            // Place value columns
            h('div', { className: 'grid grid-cols-4 gap-3' },
              placeCol('Thousands', '\u25A0', 'thousands', '#db2777', '#f472b6', 56, 56, 10, 10),
              placeCol('Hundreds', '\u25AC', 'hundreds', '#2563eb', '#60a5fa', 48, 14, 10, 1),
              placeCol('Tens', '\u2503', 'tens', '#059669', '#34d399', 10, 48, 1, 10),
              placeCol('Ones', '\u25AA', 'ones', '#ea580c', '#fb923c', 10, 10, 1, 1)
            ),
            // Regrouping buttons
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-200 p-3 mt-1' },
              h('p', { className: 'text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2 text-center' }, '\u21C4 Regroup / Ungroup'),
              h('div', { className: 'flex flex-wrap gap-2 justify-center' },
                regroupBtn('10 \u25AA \u2192 1 \u2503', 'ones', 'tens', b10.ones >= 10 && b10.tens < 9, '#ea580c', '#059669'),
                regroupBtn('1 \u2503 \u2192 10 \u25AA', 'tens', 'ones', b10.tens >= 1, '#059669', '#ea580c'),
                h('span', { className: 'w-px h-6 bg-violet-200 mx-1 self-center' }),
                regroupBtn('10 \u2503 \u2192 1 \u25AC', 'tens', 'hundreds', b10.tens >= 10 && b10.hundreds < 9, '#059669', '#2563eb'),
                regroupBtn('1 \u25AC \u2192 10 \u2503', 'hundreds', 'tens', b10.hundreds >= 1, '#2563eb', '#059669'),
                h('span', { className: 'w-px h-6 bg-violet-200 mx-1 self-center' }),
                regroupBtn('10 \u25AC \u2192 1 \u25A0', 'hundreds', 'thousands', b10.hundreds >= 10 && b10.thousands < 9, '#2563eb', '#db2777'),
                regroupBtn('1 \u25A0 \u2192 10 \u25AC', 'thousands', 'hundreds', b10.thousands >= 1, '#db2777', '#2563eb')
              ),
              h('p', { className: 'text-[9px] text-violet-400 text-center mt-1.5 italic' }, '\uD83D\uDCA1 10 of one place value always equals 1 of the next. Try adding 10+ ones, then regroup!')
            )
          ),
          // Buttons
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', {
              onClick: function() {
                var t2 = 10 + Math.floor(Math.random() * 9990);
                upd({ b10Challenge: { target: t2, type: 'build' }, b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 }, b10Feedback: null });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-lg text-sm hover:from-orange-600 hover:to-amber-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Random Number'),
            h('button', {
              onClick: function() { upd({ b10: { ones: 0, tens: 0, hundreds: 0, thousands: 0 }, b10Challenge: null, b10Feedback: null }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
            }, '\u21BA Reset')
          ),
          // Challenge
          b10Challenge && h('div', { className: 'bg-orange-50 rounded-lg p-3 border border-orange-200' },
            h('p', { className: 'text-sm font-bold text-orange-800 mb-2' }, '\uD83C\uDFAF Show ' + b10Challenge.target.toLocaleString() + ' using base-10 blocks'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-orange-600' }, 'Your value: ', h('span', { className: 'font-bold text-orange-900' }, totalValue.toLocaleString())),
              h('button', { onClick: checkBase10, className: 'ml-auto px-4 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-all' }, '\u2714 Check')
            ),
            b10Feedback && h('p', { className: 'text-sm font-bold mt-2 ' + (b10Feedback.correct ? 'text-green-600' : 'text-red-600') }, b10Feedback.msg)
          )
        );
      }

      // ═══════════════ ABACUS MODE ═══════════════
      if (manipMode === 'abacus') {
        var ROD_COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
        var BEAD_SIZE = 28;
        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          h('div', { className: 'text-center' }, h('span', { className: 'text-4xl font-bold font-mono text-amber-800' }, abacusTotal.toLocaleString())),
          // Abacus frame
          h('div', {
            className: 'rounded-xl border-2 border-amber-300 p-4 shadow-inner relative overflow-hidden',
            style: { background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 30%, #fef3c7 100%)' }
          },
            h('div', { style: { position: 'absolute', left: 0, right: 0, top: '36%', height: '4px', background: 'linear-gradient(90deg, #92400e, #b45309, #92400e)', zIndex: 5, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' } }),
            h('div', { className: 'flex justify-center gap-6' },
              rods.slice().reverse().map(function(val, ri) {
                var rodIdx = rods.length - 1 - ri;
                var heavenlyVal = Math.floor(val / 5);
                var earthlyVal = val % 5;
                var rodColor = ROD_COLORS[rodIdx];
                return h('div', { key: rodIdx, className: 'flex flex-col items-center', style: { width: '48px' } },
                  // Heaven section
                  h('div', { className: 'flex flex-col items-center gap-1 mb-1', style: { minHeight: '60px', justifyContent: 'flex-end' } },
                    h('div', { style: { position: 'absolute', width: '3px', height: '100%', background: 'linear-gradient(180deg, #92400e 0%, #b45309 100%)', borderRadius: '2px', zIndex: 0 } }),
                    h('button', {
                      onClick: function() { setRod(rodIdx, heavenlyVal ? val - 5 : val + 5); },
                      className: 'relative z-10 transition-all duration-200',
                      style: {
                        width: BEAD_SIZE + 8 + 'px', height: BEAD_SIZE - 4 + 'px', borderRadius: '50%',
                        background: heavenlyVal ? 'linear-gradient(135deg, ' + rodColor + ' 0%, ' + rodColor + 'cc 100%)' : 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)',
                        border: '2px solid ' + (heavenlyVal ? rodColor : '#9ca3af'),
                        boxShadow: heavenlyVal ? '0 3px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.5)' : '0 2px 4px rgba(0,0,0,0.15)',
                        transform: heavenlyVal ? 'translateY(12px)' : 'translateY(-2px)', cursor: 'pointer'
                      }
                    })
                  ),
                  // Earth section
                  h('div', { className: 'flex flex-col items-center gap-0.5 mt-2', style: { minHeight: '130px' } },
                    Array.from({ length: 5 }).map(function(_, bi) {
                      var isActive = bi < earthlyVal;
                      return h('button', {
                        key: bi,
                        onClick: function() {
                          var newE = isActive && bi === earthlyVal - 1 ? earthlyVal - 1 : !isActive && bi === earthlyVal ? earthlyVal + 1 : bi < earthlyVal ? bi : bi + 1;
                          setRod(rodIdx, heavenlyVal * 5 + Math.max(0, Math.min(5, newE)));
                        },
                        className: 'relative z-10 transition-all duration-200',
                        style: {
                          width: BEAD_SIZE + 8 + 'px', height: BEAD_SIZE - 6 + 'px', borderRadius: '50%',
                          background: isActive ? 'linear-gradient(135deg, ' + rodColor + ' 0%, ' + rodColor + 'cc 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                          border: '2px solid ' + (isActive ? rodColor : '#d1d5db'),
                          boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                          transform: isActive ? 'translateY(-' + (5 - earthlyVal) * 2 + 'px)' : 'translateY(' + (bi - earthlyVal) * 2 + 'px)',
                          cursor: 'pointer'
                        }
                      });
                    })
                  ),
                  h('div', { className: 'text-[10px] font-bold mt-1', style: { color: rodColor } }, placeNames[rodIdx]),
                  h('div', { className: 'text-xs font-mono font-bold text-amber-900' }, val)
                );
              })
            )
          ),
          // Controls
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', {
              onClick: function() {
                var target = 1 + Math.floor(Math.random() * 99999);
                upd({ abacusChallenge: { target: target }, abacusFeedback: null, abacus: { rods: [0, 0, 0, 0, 0] } });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, '\uD83C\uDFB2 Random Challenge'),
            h('button', {
              onClick: function() { upd({ abacus: { rods: [0, 0, 0, 0, 0] }, abacusChallenge: null, abacusFeedback: null }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
            }, '\u21BA Reset')
          ),
          abacusChallenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
            h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83C\uDFAF Show ' + abacusChallenge.target.toLocaleString() + ' on the abacus'),
            h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-amber-600' }, 'Your value: ', h('span', { className: 'font-bold text-amber-900' }, abacusTotal.toLocaleString())),
              h('button', { onClick: checkAbacus, className: 'ml-auto px-4 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-all' }, '\u2714 Check')
            ),
            abacusFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (abacusFeedback.correct ? 'text-green-600' : 'text-red-600') }, abacusFeedback.msg)
          ),
          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700' },
            h('strong', null, '\uD83C\uDF0F Fun Fact: '), 'The abacus has been used for over 4,000 years across China (suanpan), Japan (soroban), and Russia (schoty). Top beads are worth 5, bottom beads are worth 1. Each rod represents a place value!'
          )
        );
      }

      // ═══════════════ SLIDE RULE MODE ═══════════════
      if (manipMode === 'slideRule') {
        // Note: Canvas rendering needs useEffect — we use a simplified SVG version for plugin compatibility
        var PAD = 40, RULER_W = 520, W = 600, H = 180;
        var log10 = function(x) { return Math.log(x) / Math.LN10; };

        var renderScale = function(yBase, color, label, offset) {
          var ticks = [];
          for (var n = 1; n <= 10; n++) {
            var x = PAD + (log10(n) + (offset || 0)) * RULER_W;
            if (x < PAD || x > PAD + RULER_W) continue;
            ticks.push(h('line', { key: label + n, x1: x, y1: yBase - 12, x2: x, y2: yBase + 12, stroke: color, strokeWidth: n === 1 || n === 10 ? 2 : 1 }));
            ticks.push(h('text', { key: label + 't' + n, x: x, y: yBase + 24, textAnchor: 'middle', fill: color, style: { fontSize: '10px', fontWeight: 'bold' } }, n));
          }
          // Sub-ticks
          for (var m = 1; m < 10; m++) {
            for (var s = 1; s <= 9; s++) {
              var val2 = m + s * 0.1;
              var xv = PAD + (log10(val2) + (offset || 0)) * RULER_W;
              if (xv >= PAD && xv <= PAD + RULER_W) {
                ticks.push(h('line', { key: label + 's' + m + s, x1: xv, y1: yBase - (s === 5 ? 8 : 4), x2: xv, y2: yBase + (s === 5 ? 8 : 4), stroke: color, strokeWidth: 0.5 }));
              }
            }
          }
          ticks.push(h('text', { key: label + 'lbl', x: PAD - 20, y: yBase + 4, textAnchor: 'middle', fill: color, style: { fontSize: '12px', fontWeight: 'bold' } }, label));
          return ticks;
        };

        // Cursor position in SVG coords
        var cursorX = PAD + (sr.cursorPos || 0.301) * RULER_W;

        return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
          headerEl,
          // SVG Slide Rule
          h('div', { className: 'relative' },
            h('svg', {
              viewBox: '0 0 ' + W + ' ' + H, className: 'w-full rounded-xl border-2 border-amber-300 cursor-crosshair shadow-md',
              style: { maxWidth: '600px', background: '#fffbeb' },
              onClick: function(e) {
                var rect = e.currentTarget.getBoundingClientRect();
                var svgX = (e.clientX - rect.left) * (W / rect.width);
                var svgY = (e.clientY - rect.top) * (H / rect.height);
                var normX = (svgX - PAD) / RULER_W;
                if (normX < 0 || normX > 1) return;
                if (svgY < H / 2) {
                  // Drag C-scale offset
                  upd({ slideRule: Object.assign({}, sr, { cOffset: Math.max(-0.5, Math.min(0.5, normX - (sr.cursorPos || 0.301))) }) });
                } else {
                  upd({ slideRule: Object.assign({}, sr, { cursorPos: Math.max(0, Math.min(1, normX)) }) });
                }
              }
            },
              // Background bars
              h('rect', { x: 0, y: 0, width: W, height: H * 0.45, fill: '#f0fdf4', rx: 4 }),
              h('rect', { x: 0, y: H * 0.45, width: W, height: H * 0.55, fill: '#fffbeb', rx: 4 }),
              // Scales
              renderScale(H * 0.3, '#16a34a', 'C', sr.cOffset || 0),
              renderScale(H * 0.7, '#d97706', 'D', 0),
              // Cursor line
              h('line', { x1: cursorX, y1: 0, x2: cursorX, y2: H, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '4 2' }),
              h('circle', { cx: cursorX, cy: H * 0.3, r: 4, fill: '#ef4444' }),
              h('circle', { cx: cursorX, cy: H * 0.7, r: 4, fill: '#ef4444' })
            )
          ),
          // Readout
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4' },
            h('div', { className: 'grid grid-cols-3 gap-4 text-center' },
              h('div', null,
                h('div', { className: 'text-xs font-bold text-green-700 uppercase mb-1' }, 'C Scale'),
                h('div', { className: 'text-2xl font-bold font-mono text-green-800' }, cVal.toFixed(2))
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold text-slate-500 uppercase mb-1' }, '\u00D7'),
                h('div', { className: 'text-2xl font-bold text-slate-400' }, '\u00D7')
              ),
              h('div', null,
                h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-1' }, 'D Scale'),
                h('div', { className: 'text-2xl font-bold font-mono text-amber-800' }, dVal.toFixed(2))
              )
            ),
            h('div', { className: 'text-center mt-3 pt-3 border-t border-amber-200' },
              h('div', { className: 'text-xs font-bold text-slate-500 uppercase mb-1' }, 'Result'),
              h('div', { className: 'text-3xl font-bold font-mono text-orange-800' }, '\u2248 ' + product.toFixed(2))
            )
          ),
          h('div', { className: 'flex gap-2' },
            h('button', {
              onClick: function() { upd({ slideRule: { cOffset: 0, cursorPos: 0.301 } }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
            }, '\u21BA Reset')
          ),
          // Tutorial
          h('div', { className: 'bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-xs text-yellow-800 space-y-2' },
            h('p', { className: 'font-bold text-sm text-amber-800' }, '\uD83D\uDCCF How to Use the Slide Rule'),
            h('div', { className: 'space-y-1.5' },
              h('p', null, '1\uFE0F\u20E3 The slide rule multiplies using ', h('strong', null, 'logarithmic scales'), ' \u2014 sliding turns multiplication into addition.'),
              h('p', null, '2\uFE0F\u20E3 ', h('strong', null, 'Click the top (C) area'), ' to shift the C scale relative to D.'),
              h('p', null, '3\uFE0F\u20E3 ', h('strong', null, 'Click the bottom (D) area'), ' to move the red cursor.'),
              h('p', null, '4\uFE0F\u20E3 Read where the ', h('strong', null, 'cursor crosses both scales'), '. The readout panel shows exact values.')
            ),
            h('div', { className: 'bg-amber-100 rounded-lg p-2 mt-2 text-amber-900' },
              h('strong', null, '\uD83D\uDD22 Try it: '), 'Multiply 2 \u00D7 3 \u2014 click C-area near \'2\' on D, then click D-area at \'3\'. Result should read \u2248 6!'
            ),
            h('p', { className: 'text-[10px] text-amber-600 italic mt-1' }, '\uD83D\uDE80 Fun fact: NASA engineers used slide rules to calculate Apollo moon mission trajectories!')
          )
        );
      }

      // Default fallback
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        headerEl,
        h('p', { className: 'text-sm text-slate-400 text-center' }, 'Select a tool above to get started.')
      );
    }
  });
})();
