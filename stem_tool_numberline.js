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
          ok = Math.abs(ans - challenge.answer) <= 1; // within 1 is acceptable for estimate
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
      var W = 700, H = 120, PAD = 40;
      var rLen = range.max - range.min;
      var tickCount = Math.min(rLen + 1, 21);
      var ticks = [];
      for (var i = 0; i < tickCount; i++) {
        var val = range.min + Math.round(i * rLen / Math.min(rLen, 20));
        var x = PAD + i / Math.min(rLen, 20) * (W - 2 * PAD);
        var isMajor = i % 5 === 0 || i === Math.min(rLen, 20);
        ticks.push(h('g', { key: i },
          h('line', { x1: x, y1: isMajor ? 42 : 50, x2: x, y2: isMajor ? 78 : 70, stroke: '#3b82f6', strokeWidth: isMajor ? 2.5 : 1.5 }),
          isMajor && h('text', { x: x, y: 98, textAnchor: 'middle', fill: '#1e40af', fontSize: '13', fontWeight: 'bold', fontFamily: 'monospace' }, val)
        ));
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
        h('div', { className: 'bg-white rounded-xl border-2 border-blue-200 p-6 flex flex-col items-center' },
          h('svg', { width: '100%', height: H, viewBox: '0 0 '+W+' '+H, className: 'max-w-full' },
            h('line', { x1: PAD, y1: 60, x2: W-PAD, y2: 60, stroke: '#3b82f6', strokeWidth: 3, strokeLinecap: 'round' }),
            ticks,
            arrowEl,
            markerEls,
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
                h('div', { className: 'flex gap-2' },
                  h('input', {
                    type: 'number', value: answer,
                    onChange: function(e) { upd({ answer: e.target.value }); },
                    onKeyDown: function(e) { if (e.key === 'Enter' && answer) checkAnswer(); },
                    placeholder: 'Your answer',
                    className: 'flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono'
                  }),
                  h('button', {
                    onClick: checkAnswer,
                    className: 'px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700'
                  }, 'Check')
                ),
                feedback && h('p', { className: 'text-sm font-bold ' + (feedback.correct ? 'text-green-600' : 'text-red-600') }, feedback.msg),
                feedback && h('button', {
                  onClick: function() { upd({ challenge: null, feedback: null, answer: '' }); },
                  className: 'text-xs text-blue-600 font-bold hover:underline'
                }, t('explore.next_challenge') || 'Next Challenge')
              )
        )
      );
    }
  });
})();
