// ═══════════════════════════════════════════
// stem_tool_numberline.js — Number Line Plugin
// Self-contained: all state stored in labToolData
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  window.StemLab.registerTool('numberline', {
    icon: '\uD83D\uDCCF', label: 'Number Line',
    desc: 'Interactive number line with markers and challenge modes.',
    color: 'blue', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      
      if (!this._NumberLineComponent) {
        this._NumberLineComponent = function(props) {
          var ctx = props.ctx;
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
      var _n = ld._numberline || {};
      var upd = function(obj) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var nl = Object.assign({}, (prev && prev._numberline) || {}, obj);
            return Object.assign({}, prev, { _numberline: nl });
          });
        }
      };

      var range = _n.range || { min: 0, max: 20 };
      var markers = _n.markers || [];
      var challenge = _n.challenge || null;
      var answer = _n.answer || '';
      var feedback = _n.feedback || null;
      var difficulty = _n.difficulty || 'easy';
      var score = _n.score || { correct: 0, total: 0 };

      // ── Generate challenge ──
      var genChallenge = function() {
        var rMin = difficulty === 'hard' ? -10 : 0;
        var rMax = difficulty === 'easy' ? 10 : difficulty === 'hard' ? 20 : 20;
        upd({ range: { min: rMin, max: rMax } });

        var types = ['identify', 'estimate', 'place'];
        var type = types[Math.floor(Math.random() * types.length)];
        var val, ch;

        if (type === 'identify') {
          val = rMin + Math.floor(Math.random() * (rMax - rMin + 1));
          ch = { type: 'identify', _arrowValue: val, answer: val, question: 'What number does the arrow point to?' };
        } else if (type === 'estimate') {
          val = rMin + Math.random() * (rMax - rMin);
          val = Math.round(val * 10) / 10;
          ch = { type: 'estimate', _arrowValue: val, answer: Math.round(val), question: 'Estimate the value the arrow points to (nearest whole number).' };
        } else {
          val = rMin + Math.floor(Math.random() * (rMax - rMin + 1));
          ch = { type: 'place', targetValue: val, answer: val, question: 'Place a marker at ' + val + '.' };
        }

        upd({ challenge: ch, answer: '', feedback: null });
      };

      // ── Check answer ──
      var checkAnswer = function() {
        if (!challenge) return;
        var ans = parseInt(answer);
        if (isNaN(ans)) return;

        var ok;
        if (challenge.type === 'estimate') {
          ok = Math.abs(ans - challenge.answer) <= Math.max(1, rLen * 0.05); // within 5% of range
        } else if (challenge.type === 'place') {
          ok = Math.abs(ans - challenge.answer) <= Math.max(1, rLen * 0.02); // within 2% for place
        } else {
          ok = ans === challenge.answer;
        }

        announceToSR(ok ? 'Correct!' : 'Incorrect');
        upd({
          feedback: ok
            ? { correct: true, msg: '\u2705 Correct! The answer is ' + challenge.answer + '.' }
            : { correct: false, msg: '\u274c Not quite. ' + (challenge.type === 'estimate' ? 'The value is approximately ' + challenge.answer + '.' : 'The correct answer is ' + challenge.answer + '.') },
          score: { correct: score.correct + (ok ? 1 : 0), total: score.total + 1 }
        });
        if (ok) awardStemXP('numberline', 5, 'number line');
      };

      // ── SVG dimensions ──
            var [hoverVal, setHoverVal] = React.useState(null);
      var hoverActive = React.useRef(false);
      var W = 700, H = 120, PAD = 40;
      var rLen = range.max - range.min;
      
      // Dynamic ruler demarcations
      var steps = 20; // Default segments
      var minorSteps = 0; // Number of minor ticks per major segment
      if (rLen <= 20) { steps = rLen; minorSteps = 0; }
      else if (rLen <= 50) { steps = 10; minorSteps = 5; }
      else if (rLen <= 100) { steps = 10; minorSteps = 10; } // major every 10, minor every 1
      else if (rLen <= 1000) { steps = 10; minorSteps = 10; } // major every 100, minor every 10
      else if (rLen <= 10000) { steps = 10; minorSteps = 10; }
      else { steps = 10; minorSteps = 5; } // really huge numbers
      
      var majorTickCount = steps + 1;
      var ticks = [];
      
      for (var i = 0; i < majorTickCount; i++) {
        var rawVal = range.min + (i * rLen / steps);
        var val = Math.round(rawVal * 100) / 100;
        var x = PAD + i / steps * (W - 2 * PAD);
        var valStr = val.toLocaleString();
        
        // Major tick
        var transformAttr = (valStr.length > 4) ? ('rotate(-40 ' + x + ' 98)') : '';
        ticks.push(h('g', { key: 'major-'+i },
          h('line', { x1: x, y1: 38, x2: x, y2: 82, stroke: '#1e40af', strokeWidth: 2.5 }),
          h('text', { 
            x: x, y: 102, textAnchor: valStr.length > 4 ? 'end' : 'middle', 
            transform: transformAttr,
            fill: '#1e3a8a', fontSize: valStr.length > 4 ? '11' : '13', 
            fontWeight: 'bold', fontFamily: 'monospace' 
          }, valStr)
        ));
        
        // Minor ticks
        if (i < steps && minorSteps > 0) {
          for (var j = 1; j < minorSteps; j++) {
            var minorX = x + (j / minorSteps) * ((W - 2 * PAD) / steps);
            var isMid = minorSteps % 2 === 0 && j === minorSteps / 2;
            ticks.push(h('line', { 
              key: 'minor-'+i+'-'+j, 
              x1: minorX, y1: isMid ? 45 : 52, x2: minorX, y2: isMid ? 75 : 68, 
              stroke: '#60a5fa', strokeWidth: isMid ? 2 : 1.5 
            }));
          }
        }
      }

      // Challenge arrow
      var arrowEl = null;
      if (challenge && (challenge.type === 'identify' || challenge.type === 'estimate') && challenge._arrowValue != null) {
        var arrowX = PAD + (challenge._arrowValue - range.min) / rLen * (W - 2 * PAD);
        arrowEl = h('g', { key: 'arrow' },
          h('line', { x1: arrowX, y1: 8, x2: arrowX, y2: 38, stroke: '#ef4444', strokeWidth: 2.5 }),
          h('polygon', { points: (arrowX-6)+',38 '+(arrowX+6)+',38 '+arrowX+',48', fill: '#ef4444' }),
          h('text', { x: arrowX, y: 7, textAnchor: 'middle', fill: '#ef4444', fontSize: '11', fontWeight: 'bold' }, '\u25BC')
        );
      }

      // Marker dots
      var markerEls = markers.map(function(m, i) {
        var mx = PAD + (m.value - range.min) / rLen * (W - 2 * PAD);
        return h('g', { key: 'marker-'+i },
          h('circle', { cx: mx, cy: 60, r: 10, fill: m.color || '#ef4444', stroke: '#fff', strokeWidth: 2 }),
          h('text', { x: mx, y: 30, textAnchor: 'middle', fill: m.color || '#ef4444', fontSize: '12', fontWeight: 'bold' }, m.label || m.value)
        );
      });

      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-blue-800' }, '\uD83D\uDCCF Number Line'),
          h('div', { className: 'text-xs font-bold text-blue-600 ml-auto' }, score.correct + '/' + score.total)
        ),

        // Range controls
        h('div', { className: 'grid grid-cols-2 gap-3' },
          h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
            h('label', { className: 'block text-xs text-blue-700 mb-1 font-bold' }, 'Min Value'),
            h('input', {
              type: 'number', value: range.min,
              onChange: function(e) { upd({ range: { min: parseInt(e.target.value) || 0, max: range.max } }); },
              className: 'w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
            })
          ),
          h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
            h('label', { className: 'block text-xs text-blue-700 mb-1 font-bold' }, 'Max Value'),
            h('input', {
              type: 'number', value: range.max,
              onChange: function(e) { upd({ range: { min: range.min, max: parseInt(e.target.value) || 20 } }); },
              className: 'w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
            })
          )
        ),

        // SVG number line
        h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-6 flex flex-col items-center select-none cursor-crosshair' },
          h('svg', { 
             width: '100%', height: H, viewBox: '0 0 '+W+' '+H, className: 'max-w-full',
             onMouseEnter: function() { hoverActive.current = true; },
             onMouseLeave: function() { hoverActive.current = false; setHoverVal(null); },
             onMouseMove: function(e) {
               if (!hoverActive.current) return;
               var rect = e.currentTarget.getBoundingClientRect();
               var scaleX = W / rect.width;
               var clickX = (e.clientX - rect.left) * scaleX;
               var fraction = (clickX - PAD) / (W - 2 * PAD);
               var valObj = range.min + fraction * rLen;
               var totalSteps = steps * (minorSteps || 1);
               var stepVal = rLen / totalSteps;
               var valSnapped = Math.round(valObj / stepVal) * stepVal;
               if (valSnapped < range.min) valSnapped = range.min;
               if (valSnapped > range.max) valSnapped = range.max;
               valSnapped = Math.round(valSnapped * 1000) / 1000; 
               setHoverVal(valSnapped);
             },
             onClick: function(e) {
               if (!challenge || challenge.type !== 'place') return;
               var rect = e.currentTarget.getBoundingClientRect();
               // SVG internal coords
               var scaleX = W / rect.width;
               var clickX = (e.clientX - rect.left) * scaleX;
               // Map clickX back to value
               var fraction = (clickX - PAD) / (W - 2 * PAD);
               var valObj = range.min + fraction * rLen;
               // Snap to nearest integer or halfway point depending on range scale
               var step = rLen > 50 ? Math.max(1, Math.round(rLen / 50)) : 1;
               var valSnapped = Math.round(valObj / step) * step;
               if (valSnapped < range.min) valSnapped = range.min;
               if (valSnapped > range.max) valSnapped = range.max;
               // Set as answer AND visual marker
               upd({ 
                 answer: String(valSnapped),
                 markers: [{ value: valSnapped, color: '#f59e0b', label: '?' }] 
               });
             }
          },
            h('line', { x1: PAD, y1: 60, x2: W-PAD, y2: 60, stroke: '#3b82f6', strokeWidth: 3, strokeLinecap: 'round' }),
            ticks,
            arrowEl,
            markerEls,
            (hoverVal !== null && challenge && challenge.type === 'place') && h('g', { opacity: 0.6, pointerEvents: 'none' },
              h('line', { 
                x1: PAD + (hoverVal - range.min) / rLen * (W - 2 * PAD), y1: 20, 
                x2: PAD + (hoverVal - range.min) / rLen * (W - 2 * PAD), y2: 100, 
                stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '4,4' 
              }),
              h('rect', {
                x: PAD + (hoverVal - range.min) / rLen * (W - 2 * PAD) - 20, y: 5,
                width: 40, height: 20, rx: 4, fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 1
              }),
              h('text', { 
                x: PAD + (hoverVal - range.min) / rLen * (W - 2 * PAD), y: 19, 
                textAnchor: 'middle', fill: '#b45309', fontSize: '11', fontWeight: 'bold' 
              }, hoverVal.toLocaleString())
            ),
            h('polygon', { points: (W-PAD)+',53 '+(W-PAD+10)+',60 '+(W-PAD)+',67', fill: '#3b82f6' }),
            h('polygon', { points: PAD+',53 '+(PAD-10)+',60 '+PAD+',67', fill: '#3b82f6' })
          )
        ),

        // Add marker controls
        h('div', { className: 'flex gap-2 items-center' },
          h('input', {
            type: 'number', id: 'nlMarkerVal', min: range.min, max: range.max,
            placeholder: 'Value',
            className: 'w-24 px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
          }),
          h('input', {
            type: 'text', id: 'nlMarkerLabel', placeholder: 'Label (optional)',
            className: 'flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded-lg'
          }),
          h('input', { type: 'color', id: 'nlMarkerColor', defaultValue: '#ef4444', className: 'w-8 h-8 rounded cursor-pointer' }),
          h('button', {
            onClick: function() {
              var valEl = document.getElementById('nlMarkerVal');
              var labelEl = document.getElementById('nlMarkerLabel');
              var colorEl = document.getElementById('nlMarkerColor');
              if (!valEl || !valEl.value) return;
              var v = parseFloat(valEl.value);
              if (isNaN(v)) return;
              upd({ markers: markers.concat([{ value: v, label: labelEl ? labelEl.value : '', color: colorEl ? colorEl.value : '#ef4444' }]) });
              if (valEl) valEl.value = '';
              if (labelEl) labelEl.value = '';
            },
            className: 'px-4 py-1.5 bg-blue-500 text-white font-bold rounded-lg text-sm hover:bg-blue-600'
          }, '+ Add'),
          markers.length > 0 && h('button', {
            onClick: function() { upd({ markers: markers.slice(0, -1) }); },
            className: 'px-3 py-1.5 bg-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-300'
          }, '\u2212 Remove')
        ),

        // Challenge section
        h('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('h4', { className: 'text-sm font-bold text-blue-800' }, '\uD83C\uDFAF Number Line Challenge'),
            h('div', { className: 'flex gap-0.5 ml-2' },
              ['easy', 'medium', 'hard'].map(function(d) {
                return h('button', {
                  key: d, onClick: function() { upd({ difficulty: d }); },
                  className: 'text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all ' +
                    (difficulty === d ? (d === 'easy' ? 'bg-green-500 text-white' : d === 'hard' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                }, d);
              })
            )
          ),

          !challenge
            ? h('button', {
                onClick: genChallenge,
                className: 'w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl text-sm hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md'
              }, '\uD83C\uDFB2 Generate Challenge')
            : h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold text-blue-800' }, challenge.question),
                h('div', { className: 'flex gap-2 items-center' },
                  challenge.type !== 'place' ? h('input', {
                    type: 'number', value: answer,
                    onChange: function(e) { upd({ answer: e.target.value }); },
                    onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkAnswer(); },
                    placeholder: 'Your answer',
                    className: 'flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono'
                  }) : h('div', { className: 'flex-1 text-sm font-bold text-amber-600 px-2' }, 'Click the number line above to place a marker.'),
                  h('button', {
                    onClick: checkAnswer,
                    disabled: challenge.type === 'place' && !answer,
                    className: 'px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-all'
                  }, challenge.type === 'place' ? 'Check Placement' : 'Check')
                ),
                feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
                feedback && h('button', {
                  onClick: function() { upd({ challenge: null, feedback: null, answer: '' }); },
                  className: 'text-xs text-blue-600 font-bold hover:underline'
                }, t('explore.next_challenge') || 'Next Challenge')
              )
        )
      );
        }; // End of _NumberLineComponent
      }
      return React.createElement(this._NumberLineComponent, { ctx: ctx });
    }
  });
})();
