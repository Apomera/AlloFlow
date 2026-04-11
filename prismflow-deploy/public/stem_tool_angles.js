// ═══════════════════════════════════════════
// stem_tool_angles.js — Angle Explorer Plugin
// Interactive protractor with angle classification
// Extracted from stem_lab_module.js L8932-9167
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('protractor', {
    icon: '\uD83D\uDCD0', label: 'Angle Explorer',
    desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
    color: 'purple', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;

      // ── State from ctx (hosted in AlloFlowANTI.txt) ──
      var angleValue = ctx.angleValue != null ? ctx.angleValue : 45;
      var setAngleValue = ctx.setAngleValue;
      var angleChallenge = ctx.angleChallenge || null;
      var setAngleChallenge = ctx.setAngleChallenge;
      var angleFeedback = ctx.angleFeedback || null;
      var setAngleFeedback = ctx.setAngleFeedback;
      var setToolSnapshots = ctx.setToolSnapshots;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore;

      // ── Angle classification ──
      var classifyAngle = function(a) {
        if (a === 0) return 'Zero';
        if (a < 90) return 'Acute';
        if (a === 90) return t('stem.calculus.right') || 'Right';
        if (a < 180) return 'Obtuse';
        if (a === 180) return 'Straight';
        if (a < 360) return 'Reflex';
        return 'Full';
      };
      var angleClass = classifyAngle(angleValue);

      // ── SVG geometry ──
      var cx = 200, cy = 200, r = 160, rayLen = 170;
      var rad = angleValue * Math.PI / 180;
      var rayEndX = cx + rayLen * Math.cos(-rad);
      var rayEndY = cy + rayLen * Math.sin(-rad);
      var arcR = 60;
      var arcEndX = cx + arcR * Math.cos(-rad);
      var arcEndY = cy + arcR * Math.sin(-rad);
      var largeArc = angleValue > 180 ? 1 : 0;

      // ── Drag handler (mouse + touch) ──
      var calcAngleFromEvent = function(svgEl, clientX, clientY) {
        var rect = svgEl.getBoundingClientRect();
        var dx = clientX - rect.left - cx;
        var dy = -(clientY - rect.top - cy);
        var deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
        if (deg < 0) deg += 360;
        return deg;
      };
      var handleDrag = function(startEvt) {
        var svgEl = startEvt.target.closest('svg');
        var onMove = function(me) {
          setAngleValue(calcAngleFromEvent(svgEl, me.clientX, me.clientY));
          setAngleFeedback(null);
        };
        var onUp = function() {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };
      var handleTouchDrag = function(startEvt) {
        startEvt.preventDefault();
        var svgEl = startEvt.target.closest('svg');
        var onTouchMove = function(te) {
          te.preventDefault();
          if (te.touches.length === 1) {
            setAngleValue(calcAngleFromEvent(svgEl, te.touches[0].clientX, te.touches[0].clientY));
            setAngleFeedback(null);
          }
        };
        var onTouchEnd = function() {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
      };

      // ── Check answer ──
      var checkAngle = function() {
        if (!angleChallenge) return;
        if (angleChallenge.type === 'create') {
          var diff = Math.abs(angleValue - angleChallenge.target);
          var ok = diff <= 3;
          announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
          setAngleFeedback(ok
            ? { correct: true, msg: '\u2705 Correct! ' + angleValue + '\u00B0 is a ' + classifyAngle(angleValue) + ' angle!' }
            : { correct: false, msg: '\u274C You made ' + angleValue + '\u00B0. Target is ' + angleChallenge.target + '\u00B0. (within 3\u00B0)' }
          );
          setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
          if (ok) awardXP('protractor', 5, 'create angle');
        } else if (angleChallenge.type === 'classify') {
          var correctClass = classifyAngle(angleChallenge.target);
          var ok2 = classifyAngle(angleValue) === correctClass;
          announceToSR(ok2 ? 'Correct!' : 'Incorrect, try again');
          setAngleFeedback(ok2
            ? { correct: true, msg: '\u2705 Correct! ' + angleChallenge.target + '\u00B0 is ' + correctClass + '.' }
            : { correct: false, msg: '\u274C ' + angleChallenge.target + '\u00B0 is ' + correctClass + ', not ' + classifyAngle(angleValue) + '.' }
          );
          setExploreScore(function(prev) { return { correct: prev.correct + (ok2 ? 1 : 0), total: prev.total + 1 }; });
          if (ok2) awardXP('protractor', 5, 'classify angle');
        }
      };

      // ── Supplementary / Complementary ──
      var complementary = angleValue <= 90 ? (90 - angleValue) : null;
      var supplementary = angleValue <= 180 ? (180 - angleValue) : null;

      // ── Degree tick marks ──
      var tickAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
      var tickElements = tickAngles.map(function(a) {
        var ar = a * Math.PI / 180;
        var els = [
          h('line', { key: 'tk' + a, x1: cx + (r - 8) * Math.cos(-ar), y1: cy + (r - 8) * Math.sin(-ar), x2: cx + (r + 2) * Math.cos(-ar), y2: cy + (r + 2) * Math.sin(-ar), stroke: '#a78bfa', strokeWidth: a % 90 === 0 ? 2 : 1 })
        ];
        if (a % 30 === 0) {
          els.push(h('text', { key: 'tl' + a, x: cx + (r + 14) * Math.cos(-ar), y: cy + (r + 14) * Math.sin(-ar) + 3, textAnchor: 'middle', className: 'text-[10px] fill-purple-400 font-mono' }, a + '\u00B0'));
        }
        return h(React.Fragment, { key: 'tg' + a }, els);
      });

      // ── Angle class color ──
      var classColor = angleClass === (t('stem.calculus.right') || 'Right') ? 'text-green-600'
        : angleClass === 'Acute' ? 'text-blue-600'
        : angleClass === 'Obtuse' ? 'text-orange-600'
        : 'text-red-600';

      // ════════════════════════════════
      // ═══ RENDER ═══
      // ════════════════════════════════
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back to tools' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-purple-800' }, '\uD83D\uDCD0 Angle Explorer'),
          h('div', { className: 'flex items-center gap-2 ml-2' },
            h('div', { className: 'text-xs font-bold text-emerald-600' }, exploreScore.correct + '/' + exploreScore.total),
            h('button', {
              onClick: function() {
                var snap = { id: 'snap-' + Date.now(), tool: 'protractor', label: 'Angle: ' + angleValue + '\u00B0', data: { angle: angleValue }, timestamp: Date.now() };
                setToolSnapshots(function(prev) { return prev.concat([snap]); });
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              className: 'text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all'
            }, '\uD83D\uDCF8 Snapshot')
          )
        ),

        // SVG Protractor
        h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-4 flex justify-center' },
          h('svg', { width: 400, height: 420, className: 'select-none' },
            // Outer circle
            h('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: '#e9d5ff', strokeWidth: 1 }),
            // Tick marks
            tickElements,
            // Base ray (horizontal)
            h('line', { x1: cx, y1: cy, x2: cx + rayLen, y2: cy, stroke: '#6b7280', strokeWidth: 2 }),
            // Angle ray (rotatable)
            h('line', { x1: cx, y1: cy, x2: rayEndX, y2: rayEndY, stroke: '#7c3aed', strokeWidth: 3, strokeLinecap: 'round' }),
            // Angle arc
            angleValue > 0 && angleValue < 360 && h('path', {
              d: 'M ' + (cx + arcR) + ' ' + cy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + arcEndX + ' ' + arcEndY,
              fill: 'hsla(270,80%,60%,0.15)', stroke: '#7c3aed', strokeWidth: 1.5
            }),
            // Draggable handle
            h('circle', { cx: rayEndX, cy: rayEndY, r: 14, fill: '#7c3aed', fillOpacity: 0.2, stroke: '#7c3aed', strokeWidth: 2, className: 'cursor-grab', onMouseDown: handleDrag, onTouchStart: handleTouchDrag }),
            // Center dot
            h('circle', { cx: cx, cy: cy, r: 3, fill: '#334155' })
          )
        ),

        // Info cards
        h('div', { className: 'grid grid-cols-3 gap-3' },
          h('div', { className: 'bg-white rounded-xl p-3 border border-purple-100 text-center' },
            h('div', { className: 'text-xs font-bold text-purple-600 uppercase mb-1' }, 'Angle'),
            h('div', { className: 'text-2xl font-bold text-purple-800' },
              (angleChallenge && angleChallenge.type === 'create' && !angleFeedback) ? '\u2753' : (angleValue + '\u00B0'))
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-purple-100 text-center' },
            h('div', { className: 'text-xs font-bold text-purple-600 uppercase mb-1' }, 'Type'),
            h('div', { className: 'text-lg font-bold ' + classColor },
              (angleChallenge && !angleFeedback) ? '\u2753' : angleClass)
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-purple-100 text-center' },
            h('div', { className: 'text-xs font-bold text-purple-600 uppercase mb-1' }, 'Slider'),
            h('input', { type: 'range', min: 0, max: 360, value: angleValue, onChange: function(e) { setAngleValue(parseInt(e.target.value)); setAngleFeedback(null); }, className: 'w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600' })
          )
        ),

        // Supplementary / Complementary
        h('div', { className: 'flex gap-3' },
          complementary != null && h('div', { className: 'flex-1 bg-blue-50 rounded-lg p-2 border border-blue-100 text-center' },
            h('div', { className: 'text-[10px] font-bold text-blue-500 uppercase' }, 'Complementary'),
            h('div', { className: 'text-sm font-bold text-blue-700' }, complementary + '\u00B0'),
            h('div', { className: 'text-[10px] text-blue-400' }, angleValue + '\u00B0 + ' + complementary + '\u00B0 = 90\u00B0')
          ),
          supplementary != null && h('div', { className: 'flex-1 bg-teal-50 rounded-lg p-2 border border-teal-100 text-center' },
            h('div', { className: 'text-[10px] font-bold text-teal-500 uppercase' }, 'Supplementary'),
            h('div', { className: 'text-sm font-bold text-teal-700' }, supplementary + '\u00B0'),
            h('div', { className: 'text-[10px] text-teal-400' }, angleValue + '\u00B0 + ' + supplementary + '\u00B0 = 180\u00B0')
          )
        ),

        // Action buttons
        h('div', { className: 'flex gap-2 flex-wrap' },
          h('button', {
            onClick: function() {
              var targets = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330];
              var ta = targets[Math.floor(Math.random() * targets.length)];
              setAngleChallenge({ type: 'create', target: ta });
              setAngleValue(0);
              setAngleFeedback(null);
            },
            className: 'flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md'
          }, '\uD83C\uDFAF Create Angle'),
          h('button', {
            onClick: function() {
              var targets = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330];
              var ta = targets[Math.floor(Math.random() * targets.length)];
              setAngleChallenge({ type: 'classify', target: ta });
              setAngleValue(ta);
              setAngleFeedback(null);
            },
            className: 'flex-1 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md'
          }, '\uD83E\uDDE0 Classify Angle'),
          h('button', {
            onClick: function() { setAngleValue(45); setAngleChallenge(null); setAngleFeedback(null); },
            className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
          }, '\u21BA Reset')
        ),

        // ── Challenge UI ──
        angleChallenge && h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-200' },
          h('p', { className: 'text-sm font-bold text-purple-800 mb-2' },
            angleChallenge.type === 'create'
              ? '\uD83C\uDFAF Create a ' + angleChallenge.target + '\u00B0 angle (within 3\u00B0)'
              : '\uD83E\uDDE0 What type of angle is ' + angleChallenge.target + '\u00B0?'
          ),
          angleChallenge.type === 'create' && h('div', { className: 'flex gap-2 items-center' },
            h('span', { className: 'text-xs text-purple-600' }, 'Your angle: ', h('span', { className: 'font-bold text-purple-900' }, angleFeedback ? (angleValue + '\u00B0') : '\u2753')),
            h('button', { onClick: checkAngle, className: 'ml-auto px-4 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all' }, '\u2714 Check')
          ),
          angleChallenge.type === 'classify' && h('div', { className: 'flex gap-2 flex-wrap' },
            ['Acute', t('stem.calculus.right') || 'Right', 'Obtuse', 'Straight', 'Reflex'].map(function(cls) {
              return h('button', {
                key: cls,
                onClick: function() {
                  var correctClass = classifyAngle(angleChallenge.target);
                  var ok = cls === correctClass;
                  announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
                  setAngleFeedback(ok
                    ? { correct: true, msg: '\u2705 Correct! ' + angleChallenge.target + '\u00B0 is ' + correctClass + '.' }
                    : { correct: false, msg: '\u274C ' + angleChallenge.target + '\u00B0 is ' + correctClass + ', not ' + cls + '.' }
                  );
                  setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
                  if (ok) awardXP('protractor', 5, 'classify angle');
                },
                className: 'px-3 py-2 rounded-lg text-sm font-bold transition-all border ' +
                  (angleFeedback ? (cls === classifyAngle(angleChallenge.target) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400') : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-400 cursor-pointer')
              }, cls);
            })
          ),
          angleFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-600' : 'text-red-600') }, angleFeedback.msg),
          angleFeedback && h('button', {
            onClick: function() {
              var targets = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330];
              var ta = targets[Math.floor(Math.random() * targets.length)];
              setAngleChallenge({ type: angleChallenge.type, target: ta });
              if (angleChallenge.type === 'create') setAngleValue(0);
              else setAngleValue(ta);
              setAngleFeedback(null);
            },
            className: 'mt-2 text-xs text-purple-600 font-bold hover:underline'
          }, '\u27A1 Next Challenge')
        )
      );
    }
  });
})();
