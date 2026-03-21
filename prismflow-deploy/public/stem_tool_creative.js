// ═══════════════════════════════════════════
// stem_tool_creative.js — STEM Lab Creative Tools
// 4 registered tools
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

(function() {
  'use strict';

  // ═══ 🔬 dataPlot (dataPlot) ═══
  window.StemLab.registerTool('dataPlot', {
    icon: '🔬',
    label: 'dataPlot',
    desc: '',
    color: 'slate',
    category: 'creative',
    render: function(ctx) {
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

      // ── Tool body (dataPlot) ──
      return (function() {
const d = labToolData.dataPlot;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, dataPlot: { ...prev.dataPlot, [key]: val } }));

          const W = 400, H = 300, pad = 40;

          const allX = d.points.map(p => p.x), allY = d.points.map(p => p.y);

          const xMin = allX.length ? Math.min(...allX) - 1 : 0, xMax = allX.length ? Math.max(...allX) + 1 : 10;

          const yMin = allY.length ? Math.min(...allY) - 1 : 0, yMax = allY.length ? Math.max(...allY) + 1 : 10;

          const toSX = x => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);

          const toSY = y => (H - pad) - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);

          // Linear regression

          let slope = 0, intercept = 0, r2 = 0;

          if (d.points.length >= 2) {

            const n = d.points.length;

            const sumX = allX.reduce((s, v) => s + v, 0), sumY = allY.reduce((s, v) => s + v, 0);

            const sumXY = d.points.reduce((s, p) => s + p.x * p.y, 0), sumX2 = allX.reduce((s, v) => s + v * v, 0);

            slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);

            intercept = (sumY - slope * sumX) / n;

            const yMean = sumY / n;

            const ssTot = allY.reduce((s, y) => s + (y - yMean) * (y - yMean), 0);

            const ssRes = d.points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) * (p.y - (slope * p.x + intercept)), 0);

            r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

          }

          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-4" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "📊 Data Plotter"),

              React.createElement("label", { className: "ml-auto flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer" }, React.createElement("input", { type: "checkbox", checked: d.tableMode, onChange: e => upd("tableMode", e.target.checked), className: "accent-teal-600" }), "Table Input"), React.createElement("span", { className: "text-xs text-slate-400 ml-2" }, d.points.length + " pts")

            ),

            React.createElement("p", { className: "text-xs text-slate-400 italic -mt-2 mb-3" }, "Click to plot points. Auto-calculates linear regression and R-squared."),

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-2" },

              React.createElement("span", { className: "text-[10px] font-bold text-slate-400 self-center" }, "Datasets:"),

              [

                { label: '\uD83D\uDCCA Height vs Weight', pts: [{ x: 150, y: 50 }, { x: 155, y: 52 }, { x: 160, y: 58 }, { x: 165, y: 62 }, { x: 170, y: 68 }, { x: 175, y: 72 }, { x: 180, y: 78 }, { x: 185, y: 82 }, { x: 190, y: 88 }] },

                { label: '\uD83D\uDCDA Study vs Grade', pts: [{ x: 0, y: 55 }, { x: 1, y: 62 }, { x: 2, y: 68 }, { x: 3, y: 72 }, { x: 4, y: 78 }, { x: 5, y: 85 }, { x: 6, y: 88 }, { x: 7, y: 92 }, { x: 8, y: 95 }] },

                { label: '\uD83C\uDF21 Temp vs Ice Cream', pts: [{ x: 15, y: 20 }, { x: 18, y: 35 }, { x: 22, y: 45 }, { x: 25, y: 60 }, { x: 28, y: 70 }, { x: 30, y: 85 }, { x: 33, y: 90 }, { x: 35, y: 95 }] },

                { label: '\uD83C\uDFB2 Random (No Corr)', pts: Array.from({ length: 12 }, function () { return { x: Math.round(Math.random() * 10 * 10) / 10, y: Math.round(Math.random() * 10 * 10) / 10 }; }) },

              ].map(function (ds) {

                return React.createElement("button", { key: ds.label, onClick: function () { upd('points', ds.pts); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all" }, ds.label);

              })

            ),

            React.createElement("div", { className: "flex gap-2 mb-2" },

              React.createElement("input", { type: "text", value: d.xLabel || '', onChange: function(e) { upd('xLabel', e.target.value); }, placeholder: "X-axis label", className: "flex-1 px-2 py-1 text-xs border border-teal-200 rounded-lg focus:ring-1 focus:ring-teal-400 outline-none" }),

              React.createElement("input", { type: "text", value: d.yLabel || '', onChange: function(e) { upd('yLabel', e.target.value); }, placeholder: "Y-axis label", className: "flex-1 px-2 py-1 text-xs border border-teal-200 rounded-lg focus:ring-1 focus:ring-teal-400 outline-none" })

            ),

            React.createElement("svg", {

              viewBox: `0 0 ${W} ${H}`, className: "w-full bg-white rounded-xl border border-teal-200 cursor-crosshair", style: { maxHeight: "320px" },

              onClick: e => {

                const svg = e.currentTarget;

                const rect = svg.getBoundingClientRect();

                const sx = (e.clientX - rect.left) / rect.width * W;

                const sy = (e.clientY - rect.top) / rect.height * H;

                const x = Math.round((xMin + (sx - pad) / (W - 2 * pad) * (xMax - xMin)) * 10) / 10;

                const y = Math.round((yMin + ((H - pad - sy) / (H - 2 * pad)) * (yMax - yMin)) * 10) / 10;

                upd('points', [...d.points, { x, y }]);

              }

            },

              // Gridlines & tick labels

              (() => { var elems = []; var nt = 5; for (var gi = 0; gi <= nt; gi++) { var gx = xMin + gi * (xMax - xMin) / nt; var gy = yMin + gi * (yMax - yMin) / nt; elems.push(React.createElement("line", { key: 'gv'+gi, x1: toSX(gx), y1: pad, x2: toSX(gx), y2: H - pad, stroke: "#e2e8f0", strokeWidth: 0.5, strokeDasharray: "3 3" })); elems.push(React.createElement("line", { key: 'gh'+gi, x1: pad, y1: toSY(gy), x2: W - pad, y2: toSY(gy), stroke: "#e2e8f0", strokeWidth: 0.5, strokeDasharray: "3 3" })); elems.push(React.createElement("text", { key: 'xt'+gi, x: toSX(gx), y: H - pad + 14, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '9px' } }, (Math.round(gx * 10) / 10).toString())); elems.push(React.createElement("text", { key: 'yt'+gi, x: pad - 5, y: toSY(gy) + 3, textAnchor: "end", fill: "#94a3b8", style: { fontSize: '9px' } }, (Math.round(gy * 10) / 10).toString())); } return elems; })(),

              // Axes

              React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#64748b", strokeWidth: 1.5 }),

              React.createElement("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#64748b", strokeWidth: 1.5 }),

              // Axis title labels

              (d.xLabel || '') !== '' && React.createElement("text", { x: W / 2, y: H - 3, textAnchor: "middle", fill: "#0d9488", style: { fontSize: '11px', fontWeight: 'bold' } }, d.xLabel),

              (d.yLabel || '') !== '' && React.createElement("text", { x: 12, y: H / 2, textAnchor: "middle", fill: "#0d9488", style: { fontSize: '11px', fontWeight: 'bold' }, transform: 'rotate(-90,12,' + (H/2) + ')' }, d.yLabel),

              // Residual lines

              d.showResiduals && d.points.length >= 2 && d.points.map(function(p, i) { return React.createElement("line", { key: 'r'+i, x1: toSX(p.x), y1: toSY(p.y), x2: toSX(p.x), y2: toSY(slope * p.x + intercept), stroke: "#a855f7", strokeWidth: 1.5, strokeDasharray: "2 2" }); }),

              // Data points

              d.points.map((p, i) => React.createElement("circle", { key: i, cx: toSX(p.x), cy: toSY(p.y), r: 5, fill: "#0d9488", stroke: "#fff", strokeWidth: 1.5 })),

              // Regression line

              d.points.length >= 2 && React.createElement("line", { x1: toSX(xMin), y1: toSY(slope * xMin + intercept), x2: toSX(xMax), y2: toSY(slope * xMax + intercept), stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "6 3" })

            ),

            d.tableMode && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-lg p-3" },

              React.createElement("div", { className: "flex gap-2 items-end mb-2" },

                React.createElement("div", null,

                  React.createElement("label", { className: "text-[10px] font-bold text-slate-400 block" }, "X"),

                  React.createElement("input", { type: "number", step: "0.1", id: "dp-x-input", className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono", placeholder: "0" })

                ),

                React.createElement("div", null,

                  React.createElement("label", { className: "text-[10px] font-bold text-slate-400 block" }, "Y"),

                  React.createElement("input", { type: "number", step: "0.1", id: "dp-y-input", className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono", placeholder: "0" })

                ),

                React.createElement("button", { onClick: () => { const xi = document.getElementById('dp-x-input'); const yi = document.getElementById('dp-y-input'); if (xi && yi && xi.value && yi.value) { upd('points', [...d.points, { x: parseFloat(xi.value), y: parseFloat(yi.value) }]); xi.value = ''; yi.value = ''; } }, className: "px-3 py-1 bg-teal-600 text-white font-bold rounded text-sm hover:bg-teal-700" }, "+ Add")

              ),

              d.points.length > 0 && React.createElement("div", { className: "max-h-24 overflow-y-auto text-xs font-mono text-slate-500" },

                d.points.map((p, i) => React.createElement("span", { key: i, className: "inline-block mr-2 bg-white px-1.5 py-0.5 rounded border mb-1" }, "(" + p.x + "," + p.y + ")"))

              )

            ),

            React.createElement("div", { className: "flex gap-3 mt-3" },

              React.createElement("button", { onClick: () => upd('points', d.points.slice(0, -1)), className: "px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm" }, "↩ Undo"),

              React.createElement("button", { onClick: () => upd('points', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm" }, "🗑 Clear"),

              React.createElement("label", { className: "flex items-center gap-1 text-xs font-bold text-violet-600 cursor-pointer" }, React.createElement("input", { type: "checkbox", checked: !!d.showResiduals, onChange: function() { upd('showResiduals', !d.showResiduals); }, className: "accent-violet-600" }), "Residuals"),

              d.points.length >= 2 && React.createElement("button", { onClick: function() { var csv = 'x,y\n' + d.points.map(function(p) { return p.x + ',' + p.y; }).join('\n'); var blob = new Blob([csv], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data_plot.csv'; a.click(); }, className: "px-3 py-1.5 bg-teal-50 text-teal-700 font-bold rounded-lg text-sm border border-teal-200" }, "📥 CSV"),

              d.points.length >= 2 && React.createElement("span", { className: "text-xs text-slate-500 self-center ml-auto" }, "y = " + slope.toFixed(2) + "x + " + intercept.toFixed(2) + " | r² = " + r2.toFixed(3))

            ),

            d.points.length >= 2 && React.createElement("div", { className: "mt-2 bg-white rounded-lg border p-2" },

              React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "Correlation Strength"),

              React.createElement("div", { className: "flex items-center gap-2" },

                React.createElement("div", { className: "flex-1 h-3 bg-slate-100 rounded-full overflow-hidden" },

                  React.createElement("div", { style: { width: (Math.abs(r2) * 100) + '%', height: '100%', borderRadius: '9999px', backgroundColor: Math.abs(r2) > 0.8 ? '#22c55e' : Math.abs(r2) > 0.5 ? '#eab308' : Math.abs(r2) > 0.3 ? '#f97316' : '#ef4444', transition: 'all 0.5s' } })

                ),

                React.createElement("span", { className: "text-xs font-bold " + (Math.abs(r2) > 0.8 ? 'text-emerald-600' : Math.abs(r2) > 0.5 ? 'text-yellow-600' : Math.abs(r2) > 0.3 ? 'text-orange-600' : 'text-red-500') }, Math.abs(r2) > 0.9 ? '\u2B50 Very Strong' : Math.abs(r2) > 0.7 ? 'Strong' : Math.abs(r2) > 0.5 ? 'Moderate' : Math.abs(r2) > 0.3 ? 'Weak' : 'Very Weak'),

                React.createElement("span", { className: "text-[10px] text-slate-400" }, slope > 0 ? '\u2197 Positive' : slope < 0 ? '\u2198 Negative' : '\u2794 None')

              ),

              React.createElement("p", { className: "text-[10px] text-slate-400 mt-1 italic" }, r2 > 0.9 ? '\uD83D\uDCA1 Almost a perfect linear relationship!' : r2 > 0.7 ? '\uD83D\uDCA1 Strong trend \u2014 a linear model fits well.' : r2 > 0.4 ? '\uD83D\uDCA1 Some relationship, but other factors may be at play.' : '\uD83D\uDCA1 Weak or no linear relationship. Try a different model?')

            ),

            d.points && d.points.length >= 2 && React.createElement("div", { className: "mt-3 grid grid-cols-3 gap-2 text-center" },

              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },

                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Mean"),

                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (d.points.reduce(function (s, p) { return s + p.y }, 0) / d.points.length).toFixed(2))

              ),

              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },

                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Median"),

                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (function (ps) { var s = ps.map(function (p) { return p.y }).sort(function (a, b) { return a - b }); return s.length % 2 ? s[Math.floor(s.length / 2)] : ((s[s.length / 2 - 1] + s[s.length / 2]) / 2); })(d.points).toFixed(2))

              ),

              React.createElement("div", { className: "p-1.5 bg-teal-50 rounded-lg border border-teal-200" },

                React.createElement("p", { className: "text-[9px] font-bold text-teal-600 uppercase" }, "Std Dev"),

                React.createElement("p", { className: "text-sm font-bold text-teal-800" }, (function (ps) { var m = ps.reduce(function (s, p) { return s + p.y }, 0) / ps.length; return Math.sqrt(ps.reduce(function (s, p) { return s + Math.pow(p.y - m, 2) }, 0) / ps.length); })(d.points).toFixed(2))

              )

            ),

            // ── Quiz: Predict the Correlation ──

            (() => {

              var dpQuiz = d.dpQuiz || null;

              var dpScore = d.dpScore || 0;

              function makeDpQuiz() {

                var scenarios = [

                  { q: 'Hours studied vs. Test score', a: 'Positive', pts: Array.from({ length: 12 }, (_, i) => ({ x: i + 1, y: 50 + i * 3.5 + Math.random() * 10 - 5 })) },

                  { q: 'Temperature vs. Hot chocolate sales', a: 'Negative', pts: Array.from({ length: 12 }, (_, i) => ({ x: 30 + i * 5, y: 100 - i * 7 + Math.random() * 10 - 5 })) },

                  { q: 'Shoe size vs. IQ', a: 'None', pts: Array.from({ length: 12 }, () => ({ x: 5 + Math.random() * 10, y: 80 + Math.random() * 40 })) },

                  { q: 'Age of car vs. Resale value', a: 'Negative', pts: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 30000 - i * 2500 + Math.random() * 3000 - 1500 })) },

                  { q: 'Practice hours vs. Free throw %', a: 'Positive', pts: Array.from({ length: 12 }, (_, i) => ({ x: i * 2, y: 40 + i * 4 + Math.random() * 8 - 4 })) },

                  { q: 'Number of pets vs. Favorite color', a: 'None', pts: Array.from({ length: 12 }, () => ({ x: Math.floor(Math.random() * 6), y: Math.floor(Math.random() * 8) })) },

                ];

                var s = scenarios[Math.floor(Math.random() * scenarios.length)];

                return { text: s.q, answer: s.a, pts: s.pts, opts: ['Positive', 'Negative', 'None'].sort(function () { return Math.random() - 0.5; }), answered: false };

              }

              return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3 mb-2" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("button", { onClick: function () { var q = makeDpQuiz(); upd('dpQuiz', q); upd('points', q.pts); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (dpQuiz ? 'bg-teal-100 text-teal-700' : 'bg-teal-600 text-white') + " hover:opacity-90 transition-all" }, dpQuiz ? '🔄 Next Scenario' : '📊 Predict Correlation'),

                  dpScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, '⭐ ' + dpScore + ' correct')

                ),

                dpQuiz && !dpQuiz.answered && React.createElement("div", { className: "bg-teal-50 rounded-xl p-3 border border-teal-200" },

                  React.createElement("p", { className: "text-sm font-bold text-teal-800 mb-2" }, '"' + dpQuiz.text + '" — What correlation do you see?'),

                  React.createElement("div", { className: "flex gap-2" },

                    dpQuiz.opts.map(function (opt) {

                      return React.createElement("button", {

                        key: opt, onClick: function () {

                          var correct = opt === dpQuiz.answer;

                          upd('dpQuiz', Object.assign({}, dpQuiz, { answered: true, chosen: opt }));

                          upd('dpScore', dpScore + (correct ? 1 : 0));

                          if (correct) addToast(t('stem.data_plot.correct') + dpQuiz.answer + ' correlation', 'success'); else addToast(t('stem.data_plot.it') + "'s " + dpQuiz.answer + ' correlation', 'error');

                        }, className: "px-4 py-2 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all"

                      }, opt);

                    })

                  )

                ),

                dpQuiz && dpQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold " + (dpQuiz.chosen === dpQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') }, dpQuiz.chosen === dpQuiz.answer ? '✅ Correct! ' + dpQuiz.answer + ' correlation.' : '❌ Answer: ' + dpQuiz.answer + ' correlation.')

              );

            })(),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dp-' + Date.now(), tool: 'dataPlot', label: d.points.length + ' pts r²=' + r2.toFixed(2), data: { points: [...d.points] }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "📸 Snapshot")

          )
      })();
    }
  });

  // ═══ 🔬 artStudio (artStudio) ═══
  window.StemLab.registerTool('artStudio', {
    icon: '🔬',
    label: 'artStudio',
    desc: '',
    color: 'slate',
    category: 'creative',
    render: function(ctx) {
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

      // ── Tool body (artStudio) ──
      return (function() {
const d = labToolData.artStudio || {};

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, artStudio: { ...prev.artStudio, [key]: val } }));

          const tab = d.tab || 'colorWheel';



          // Color Wheel Canvas

          const wheelRef = function (canvas) {

            if (!canvas) return;

            if (canvas._wheelAnim) cancelAnimationFrame(canvas._wheelAnim);

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 20;

            var tick = 0;

            var hue = d.hue || 0, sat = d.sat !== undefined ? d.sat : 100, lit = d.lit !== undefined ? d.lit : 50;



            function drawWheel() {

              tick++;

              ctx.clearRect(0, 0, W, H);

              for (var a = 0; a < 360; a++) {

                var rad1 = (a - 90) * Math.PI / 180;

                var rad2 = (a - 89) * Math.PI / 180;

                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, rad1, rad2); ctx.closePath();

                ctx.fillStyle = 'hsl(' + a + ',' + sat + '%,' + lit + '%)'; ctx.fill();

              }

              ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, Math.PI * 2);

              ctx.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + lit + '%)'; ctx.fill();

              ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

              var selRad = (hue - 90) * Math.PI / 180;

              var sx = cx + Math.cos(selRad) * R * 0.75;

              var sy = cy + Math.sin(selRad) * R * 0.75;

              ctx.beginPath(); ctx.arc(sx, sy, 8 + Math.sin(tick * 0.06) * 2, 0, Math.PI * 2);

              ctx.fillStyle = '#fff'; ctx.fill();

              ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();

              ctx.fillStyle = lit > 55 ? '#000' : '#fff';

              ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

              ctx.fillText('H:' + hue + '\u00B0', cx, cy - 8);

              ctx.fillText('S:' + sat + '% L:' + lit + '%', cx, cy + 8);

              var harmony = d.harmony || 'complementary';

              var harmAngles = [];

              if (harmony === 'complementary') harmAngles = [(hue + 180) % 360];

              else if (harmony === 'triadic') harmAngles = [(hue + 120) % 360, (hue + 240) % 360];

              else if (harmony === 'analogous') harmAngles = [(hue + 30) % 360, (hue - 30 + 360) % 360];

              else if (harmony === 'split') harmAngles = [(hue + 150) % 360, (hue + 210) % 360];

              harmAngles.forEach(function (ha) {

                var hr = (ha - 90) * Math.PI / 180;

                var hx = cx + Math.cos(hr) * R * 0.75, hy = cy + Math.sin(hr) * R * 0.75;

                ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);

                ctx.fillStyle = 'hsl(' + ha + ',' + sat + '%,' + lit + '%)'; ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

              });

              canvas._wheelAnim = requestAnimationFrame(drawWheel);

            }

            canvas.onmousedown = canvas.ontouchstart = function (e) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              var scaleX = W / rect.width, scaleY = H / rect.height;

              ex *= scaleX; ey *= scaleY;

              var dx = ex - cx, dy = ey - cy;

              var dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < R && dist > R * 0.35) {

                var angle = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360);

                hue = angle; upd('hue', angle);

              }

            };

            drawWheel();

          };



          // Pixel Art Canvas

          const pixelRef = function (canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var gridSize = typeof d.pixelGrid === 'number' ? d.pixelGrid : 16;

            var cellW = W / gridSize, cellH = H / gridSize;

            var grid = d.pixelData || {};

            var painting = false;

            var currentColor = 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)';

            function drawPixelGrid() {

              ctx.clearRect(0, 0, W, H);

              ctx.fillStyle = '#1e1e2e'; ctx.fillRect(0, 0, W, H);

              Object.keys(grid).forEach(function (key) {

                var parts = key.split(',');

                ctx.fillStyle = grid[key];

                ctx.fillRect(parseInt(parts[0]) * cellW, parseInt(parts[1]) * cellH, cellW, cellH);

              });

              ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;

              for (var gx = 0; gx <= gridSize; gx++) { ctx.beginPath(); ctx.moveTo(gx * cellW, 0); ctx.lineTo(gx * cellW, H); ctx.stroke(); }

              for (var gy = 0; gy <= gridSize; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * cellH); ctx.lineTo(W, gy * cellH); ctx.stroke(); }

            }

            function floodFill(startX, startY, fillColor) {

              var targetColor = grid[startX + ',' + startY] || null;

              if (targetColor === fillColor) return;

              var queue = [[startX, startY]];

              var visited = {};

              while (queue.length > 0) {

                var cell = queue.shift();

                var cx2 = cell[0], cy2 = cell[1];

                var k = cx2 + ',' + cy2;

                if (cx2 < 0 || cx2 >= gridSize || cy2 < 0 || cy2 >= gridSize) continue;

                if (visited[k]) continue;

                visited[k] = true;

                var cellColor = grid[k] || null;

                if (cellColor !== targetColor) continue;

                grid[k] = fillColor;

                queue.push([cx2 + 1, cy2], [cx2 - 1, cy2], [cx2, cy2 + 1], [cx2, cy2 - 1]);

              }

              upd('pixelData', Object.assign({}, grid));

              drawPixelGrid();

            }

            function paint(e) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              var gx = Math.floor(ex * (W / rect.width) / cellW);

              var gy = Math.floor(ey * (H / rect.height) / cellH);

              if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) {

                if (d.pixelTool === 'fill') {

                  floodFill(gx, gy, currentColor);

                  return;

                }

                var key = gx + ',' + gy;

                if (d.pixelTool === 'eraser') delete grid[key]; else grid[key] = currentColor;

                upd('pixelData', Object.assign({}, grid));

                drawPixelGrid();

              }

            }

            canvas.onmousedown = canvas.ontouchstart = function (e) { painting = true; paint(e); };

            canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) paint(e); };

            canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

            canvas.onmouseleave = function () { painting = false; };

            drawPixelGrid();

          };



          // Symmetry Canvas

          const symmetryRef = function (canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var cx = W / 2, cy = H / 2;

            var folds = d.symmetryFolds || 6;

            var drawing = false;

            var brushSize = d.brushSize || 3;

            var brushColor = 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)';

            // Store previous point for continuous line drawing

            if (canvas._prevX === undefined) canvas._prevX = null;

            if (canvas._prevY === undefined) canvas._prevY = null;



            if (!canvas._symInit) {

              canvas._symInit = true;

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;

              for (var i = 0; i < folds; i++) {

                var angle = (i / folds) * Math.PI * 2;

                ctx.beginPath(); ctx.moveTo(cx, cy);

                ctx.lineTo(cx + Math.cos(angle) * Math.max(W, H), cy + Math.sin(angle) * Math.max(W, H));

                ctx.stroke();

              }

            }



            // In rainbow mode, pick a color based on distance from center or time; otherwise use selected

            var mode = d.symBrushMode || 'rainbow'; 

            var mirrorOnly = d.symMirrorOnly || false;



            function drawSymmetric(ex, ey, isStart) {

              var dx = ex - cx, dy = ey - cy, dist = Math.sqrt(dx * dx + dy * dy);

              var baseAngle = Math.atan2(dy, dx);

              

              var drawColor = brushColor;

              if (mode === 'rainbow') {

                drawColor = 'hsl(' + ((Date.now() / 10) % 360) + ', 100%, 50%)';

              }



              ctx.lineWidth = brushSize * 2; // match stroke width to circle diam

              ctx.lineCap = 'round';

              ctx.lineJoin = 'round';

              ctx.strokeStyle = drawColor;

              ctx.fillStyle = drawColor;



              // If it's the very first dot of a stroke, just draw a dot

              if (isStart || canvas._prevX === null || canvas._prevY === null) {

                for (var i = 0; i < folds; i++) {

                  var angle = baseAngle + (i / folds) * Math.PI * 2;

                  ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, brushSize, 0, Math.PI * 2);

                  ctx.fill();

                  if (mirrorOnly) {

                    var mirrorAngle = -baseAngle + (i / folds) * Math.PI * 2;

                    ctx.beginPath(); ctx.arc(cx + Math.cos(mirrorAngle) * dist, cy + Math.sin(mirrorAngle) * dist, brushSize, 0, Math.PI * 2);

                    ctx.fill();

                  }

                }

              } else {

                 // Draw continuous lines from previous points to current

                 var px = canvas._prevX - cx, py = canvas._prevY - cy;

                 var prevDist = Math.sqrt(px * px + py * py);

                 var prevBaseAngle = Math.atan2(py, px);

                 

                 for (var j = 0; j < folds; j++) {

                    var curAngle = baseAngle + (j / folds) * Math.PI * 2;

                    var pAngle = prevBaseAngle + (j / folds) * Math.PI * 2;

                    ctx.beginPath();

                    ctx.moveTo(cx + Math.cos(pAngle) * prevDist, cy + Math.sin(pAngle) * prevDist);

                    ctx.lineTo(cx + Math.cos(curAngle) * dist, cy + Math.sin(curAngle) * dist);

                    ctx.stroke();



                    if (mirrorOnly) {

                       var mCurAngle = -baseAngle + (j / folds) * Math.PI * 2;

                       var mPAngle = -prevBaseAngle + (j / folds) * Math.PI * 2;

                       ctx.beginPath();

                       ctx.moveTo(cx + Math.cos(mPAngle) * prevDist, cy + Math.sin(mPAngle) * prevDist);

                       ctx.lineTo(cx + Math.cos(mCurAngle) * dist, cy + Math.sin(mCurAngle) * dist);

                       ctx.stroke();

                    }

                 }

              }

              // Save prev coords

              canvas._prevX = ex;

              canvas._prevY = ey;

            }



            function handleDraw(e, isStart) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              drawSymmetric(ex * (W / rect.width), ey * (H / rect.height), isStart);

            }



            canvas.onmousedown = canvas.ontouchstart = function (e) { 

               e.preventDefault(); 

               drawing = true; 

               canvas._prevX = null; canvas._prevY = null;

               handleDraw(e, true); 

            };

            canvas.onmousemove = canvas.ontouchmove = function (e) { 

               if (drawing) {

                 e.preventDefault();

                 handleDraw(e, false); 

               }

            };

            canvas.onmouseup = canvas.ontouchend = function () { 

               drawing = false; 

               canvas._prevX = null; canvas._prevY = null;

            };

            canvas.onmouseleave = function () { 

               drawing = false; 

               canvas._prevX = null; canvas._prevY = null;

            };

          };



          // WCAG contrast helpers

          function luminance(h, s, l) {

            var c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;

            var x = c * (1 - Math.abs((h / 60) % 2 - 1));

            var m = l / 100 - c / 2;

            var r, g, b;

            if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }

            else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }

            else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }

            r += m; g += m; b += m;

            var toL = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

            return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);

          }

          function mixColors(c1, c2, ratio) {

            var h1 = c1.h, s1 = c1.s, l1 = c1.l, h2 = c2.h, s2 = c2.s, l2 = c2.l;

            var hDiff = h2 - h1; if (Math.abs(hDiff) > 180) { if (hDiff > 0) h1 += 360; else h2 += 360; }

            return { h: Math.round((h1 + (h2 - h1) * ratio + 360) % 360), s: Math.round(s1 + (s2 - s1) * ratio), l: Math.round(l1 + (l2 - l1) * ratio) };

          }

          var mix1 = { h: d.mix1H || 0, s: d.mix1S || 100, l: d.mix1L || 50 };

          var mix2 = { h: d.mix2H || 200, s: d.mix2S || 100, l: d.mix2L || 50 };

          var mixRatio = d.mixRatio || 0.5;

          var mixed = mixColors(mix1, mix2, mixRatio);

          var fgH = d.fgH || 0, fgS = d.fgS || 0, fgL = d.fgL || 0;

          var bgH = d.bgH || 0, bgS = d.bgS || 0, bgL = d.bgL || 100;

          var l1c = luminance(fgH, fgS, fgL), l2c = luminance(bgH, bgS, bgL);

          var contrastRatio = (Math.max(l1c, l2c) + 0.05) / (Math.min(l1c, l2c) + 0.05);

          var passAA = contrastRatio >= 4.5, passAAA = contrastRatio >= 7, passAALarge = contrastRatio >= 3;



          // Helper to toggle fullscreen for specific tool containers

          const toggleFullscreen = (elementId) => {

            var el = document.getElementById(elementId);

            if (!el) return;

            if (!document.fullscreenElement) {

              if (el.requestFullscreen) {

                el.requestFullscreen().catch(err => console.warn("Fullscreen failed: ", err));

              } else if (el.webkitRequestFullscreen) { /* Safari */

                el.webkitRequestFullscreen();

              } else if (el.msRequestFullscreen) { /* IE11 */

                el.msRequestFullscreen();

              }

            } else {

              if (document.exitFullscreen) {

                document.exitFullscreen();

              } else if (document.webkitExitFullscreen) { /* Safari */

                document.webkitExitFullscreen();

              } else if (document.msExitFullscreen) { /* IE11 */

                document.msExitFullscreen();

              }

            }

          };



          // ═══ ANIMATED STEREOGRAM HELPERS ═══

            var _stereoAnimRef = { timer: null, frames: [] };

            function _sirdsRenderSync(W, H, dmData, dmW, dmH, pType, pWidth, maxShift, aiPat) {

              var offscreen = document.createElement('canvas'); offscreen.width = W; offscreen.height = H;

              var ctx = offscreen.getContext('2d');

              function makeRng(seed) { var s = seed; return function() { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; }; }

              var imgData = ctx.createImageData(W, H); var data = imgData.data;

              for (var y = 0; y < H; y++) {

                var rng = makeRng(y * 7919 + 12345);

                var row = new Uint8Array(W * 3);

                for (var x = 0; x < W; x++) {

                  if (x < pWidth) {

                    if (pType === 'bw') { var c = rng() > 0.5 ? 230 : 25; row[x*3]=c; row[x*3+1]=c; row[x*3+2]=c; }

                    else if (pType === 'color') { row[x*3]=Math.floor(rng()*200)+55; row[x*3+1]=Math.floor(rng()*200)+55; row[x*3+2]=Math.floor(rng()*200)+55; }

                    else if (pType === 'ai' && aiPat) { var pw=aiPat.width,ph=aiPat.height,pI=((y%ph)*pw+(x%pw))*4; row[x*3]=aiPat.data[pI]; row[x*3+1]=aiPat.data[pI+1]; row[x*3+2]=aiPat.data[pI+2]; }

                    else { var v=Math.floor(rng()*220)+20; row[x*3]=v; row[x*3+1]=v; row[x*3+2]=v; }

                  } else {

                    var dx=Math.floor(x*dmW/W), dy=Math.floor(y*dmH/H), di=(dy*dmW+dx)*4;

                    var depth=dmData[di]/255, shift=Math.round(depth*maxShift), srcX=x-pWidth+shift;

                    if (srcX >= 0) { row[x*3]=row[srcX*3]; row[x*3+1]=row[srcX*3+1]; row[x*3+2]=row[srcX*3+2]; }

                    else {

                      if (pType === 'bw') { var c2=rng()>0.5?230:25; row[x*3]=c2; row[x*3+1]=c2; row[x*3+2]=c2; }

                      else if (pType === 'color') { row[x*3]=Math.floor(rng()*200)+55; row[x*3+1]=Math.floor(rng()*200)+55; row[x*3+2]=Math.floor(rng()*200)+55; }

                      else if (pType === 'ai' && aiPat) { var pw2=aiPat.width,ph2=aiPat.height,pI2=((y%ph2)*pw2+(x%pw2))*4; row[x*3]=aiPat.data[pI2]; row[x*3+1]=aiPat.data[pI2+1]; row[x*3+2]=aiPat.data[pI2+2]; }

                      else { var v2=Math.floor(rng()*220)+20; row[x*3]=v2; row[x*3+1]=v2; row[x*3+2]=v2; }

                    }

                  }

                }

                for (var x2=0; x2<W; x2++) { var idx=(y*W+x2)*4; data[idx]=row[x2*3]; data[idx+1]=row[x2*3+1]; data[idx+2]=row[x2*3+2]; data[idx+3]=255; }

              }

              ctx.putImageData(imgData, 0, 0);

              return offscreen;

            }

            function _genAnimDepth(presetId, frameIdx, totalFrames, W, H) {

              var c = document.createElement('canvas'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

              var t = frameIdx / totalFrames;

              if (presetId === 'pulseSphere') {

                var rBase = Math.abs(0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));

                var r = Math.max(4, Math.abs(Math.round(Math.min(W, H) * rBase)));

                var gradR = Math.max(4, r);

                if (!isFinite(gradR) || gradR <= 0) gradR = 4;

                var grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, gradR);

                grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#888'); grad.addColorStop(1, '#000');

                ctx.beginPath(); ctx.arc(W/2, H/2, Math.max(1, r), 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

              } else if (presetId === 'spinCube') {

                var angle = t * Math.PI * 2, cos = Math.cos(angle), sin = Math.sin(angle);

                var sz = Math.min(W, H) * 0.25, cx = W/2, cy = H/2;

                var verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];

                var faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];

                var proj = verts.map(function(v) { var rx=v[0]*cos-v[2]*sin, rz=v[0]*sin+v[2]*cos; return {x:cx+rx*sz, y:cy+v[1]*sz, z:(rz+1)/2}; });

                // Sort faces by average z (painter's algorithm)

                var sortedFaces = faces.slice().sort(function(a,b) {

                  var za = a.reduce(function(s,i){return s+proj[i].z;},0)/a.length;

                  var zb = b.reduce(function(s,i){return s+proj[i].z;},0)/b.length;

                  return za - zb;

                });

                sortedFaces.forEach(function(face) {

                  var avgZ = face.reduce(function(s,i){return s+proj[i].z;},0)/face.length;

                  var brt = Math.round(avgZ * 255);

                  ctx.beginPath(); ctx.moveTo(proj[face[0]].x, proj[face[0]].y);

                  for (var fi=1; fi<face.length; fi++) ctx.lineTo(proj[face[fi]].x, proj[face[fi]].y);

                  ctx.closePath(); ctx.fillStyle = 'rgb('+brt+','+brt+','+brt+')'; ctx.fill();

                });

              } else if (presetId === 'waveRipple') {

                var imgData = ctx.createImageData(W, H); var data = imgData.data;

                var phase = t * Math.PI * 2;

                for (var y=0; y<H; y++) for (var x=0; x<W; x++) {

                  var dx2=x-W/2, dy2=y-H/2, dist=Math.sqrt(dx2*dx2+dy2*dy2)/(Math.min(W,H)*0.15);

                  var val=Math.max(0,Math.min(255,Math.round((Math.sin(dist-phase)*0.5+0.5)*255*Math.max(0,1-dist/5))));

                  var idx2=(y*W+x)*4; data[idx2]=val; data[idx2+1]=val; data[idx2+2]=val; data[idx2+3]=255;

                }

                ctx.putImageData(imgData, 0, 0);

              } else if (presetId === 'morphHeart') {

                var sc = Math.min(W,H) * (0.009 + 0.004 * Math.sin(t * Math.PI * 2));

                ctx.save(); ctx.translate(W/2, H*0.45); ctx.scale(sc, -sc);

                ctx.beginPath();

                for (var ht=0; ht<=Math.PI*2; ht+=0.01) {

                  var hx=16*Math.pow(Math.sin(ht),3), hy=13*Math.cos(ht)-5*Math.cos(2*ht)-2*Math.cos(3*ht)-Math.cos(4*ht);

                  if (ht===0) ctx.moveTo(hx,hy); else ctx.lineTo(hx,hy);

                }

                ctx.closePath(); ctx.restore();

                var hGrad = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, Math.min(W,H)*0.4);

                hGrad.addColorStop(0, '#fff'); hGrad.addColorStop(0.8, '#aaa'); hGrad.addColorStop(1, '#000');

                ctx.fillStyle = hGrad; ctx.fill();

              } else if (presetId === 'floatText') {

                var dep = Math.round(128 + 127 * Math.sin(t * Math.PI * 2));

                ctx.fillStyle = 'rgb('+dep+','+dep+','+dep+')';

                ctx.font = 'bold ' + Math.round(H * 0.4) + 'px Arial';

                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('3D', W/2, H/2);

              }

              return ctx.getImageData(0, 0, W, H);

            }

            function _renderAnimFrames(nFrames, presetId, pType, pWidth, maxShift, aiPat, onProgress, onDone) {

              var W = 512, H = 512, dmW = 400, dmH = 400;

              var frames = []; var i = 0;

              function step() {

                if (i >= nFrames) { onDone(frames); return; }

                var dmImgData = _genAnimDepth(presetId, i, nFrames, dmW, dmH);

                var f = _sirdsRenderSync(W, H, dmImgData.data, dmW, dmH, pType, pWidth, maxShift, aiPat);

                frames.push(f);

                i++;

                if (onProgress) onProgress(i, nFrames);

                requestAnimationFrame(step);

              }

              requestAnimationFrame(step);

            }

            function _stopStereoAnim() {

              if (_stereoAnimRef.timer) { clearInterval(_stereoAnimRef.timer); _stereoAnimRef.timer = null; }

            }

            function _playStereoAnim(canvasId, fps, upd2) {

              _stopStereoAnim();

              var frames = _stereoAnimRef.frames;

              if (!frames || frames.length === 0) return;

              var c = document.getElementById(canvasId);

              if (!c) return;

              var ctx = c.getContext('2d');

              var idx = 0;

              _stereoAnimRef.timer = setInterval(function() {

                ctx.drawImage(frames[idx], 0, 0);

                idx = (idx + 1) % frames.length;

                if (upd2) upd2('stereoAnimIndex', idx);

              }, 1000 / fps);

            }

            function _exportStereoGif(frames, fps) {

              if (!frames || frames.length === 0) return;

              // Build animated GIF using minimal encoder

              var W = frames[0].width, H = frames[0].height;

              var delay = Math.round(100 / fps); // centiseconds

              // Quantize each frame to 256 colors and build GIF

              var parts = [];

              // GIF89a Header

              parts.push(new Uint8Array([0x47,0x49,0x46,0x38,0x39,0x61]));

              // Logical Screen Descriptor

              var lsd = new Uint8Array(7);

              lsd[0] = W & 0xFF; lsd[1] = (W >> 8) & 0xFF;

              lsd[2] = H & 0xFF; lsd[3] = (H >> 8) & 0xFF;

              lsd[4] = 0xF7; // GCT flag, 256 colors (2^(7+1)=256)

              lsd[5] = 0; lsd[6] = 0;

              parts.push(lsd);

              // Global Color Table (256 entries = 768 bytes) - web-safe palette

              var gct = new Uint8Array(768);

              for (var ci = 0; ci < 256; ci++) {

                // Simple 6x6x6 cube + 40 grays

                if (ci < 216) {

                  gct[ci*3] = Math.floor(ci/36) * 51;

                  gct[ci*3+1] = (Math.floor(ci/6) % 6) * 51;

                  gct[ci*3+2] = (ci % 6) * 51;

                } else {

                  var gv = Math.round((ci - 216) / 39 * 255);

                  gct[ci*3] = gv; gct[ci*3+1] = gv; gct[ci*3+2] = gv;

                }

              }

              parts.push(gct);

              // Netscape looping extension

              parts.push(new Uint8Array([0x21,0xFF,0x0B,

                0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30,

                0x03,0x01,0x00,0x00,0x00]));

              function nearestColor(r,g,b) {

                // Map to 6x6x6 cube

                var ri = Math.round(r/255*5), gi = Math.round(g/255*5), bi = Math.round(b/255*5);

                return ri*36 + gi*6 + bi;

              }

              // LZW Minimum Code Size

              var minCodeSize = 8;

              function lzwEncode(indexStream) {

                var clearCode = 1 << minCodeSize;

                var eoiCode = clearCode + 1;

                var codeSize = minCodeSize + 1;

                var nextCode = eoiCode + 1;

                var dict = {};

                for (var di = 0; di < clearCode; di++) dict[String(di)] = di;

                var out = [];

                var bitBuf = 0, bitCount = 0;

                function writeBits(code, size) {

                  bitBuf |= (code << bitCount);

                  bitCount += size;

                  while (bitCount >= 8) { out.push(bitBuf & 0xFF); bitBuf >>= 8; bitCount -= 8; }

                }

                writeBits(clearCode, codeSize);

                var cur = String(indexStream[0]);

                for (var si = 1; si < indexStream.length; si++) {

                  var next = String(indexStream[si]);

                  var combined = cur + ',' + next;

                  if (dict[combined] !== undefined) {

                    cur = combined;

                  } else {

                    writeBits(dict[cur], codeSize);

                    if (nextCode < 4096) {

                      dict[combined] = nextCode++;

                      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;

                    } else {

                      writeBits(clearCode, codeSize);

                      dict = {};

                      for (var dj = 0; dj < clearCode; dj++) dict[String(dj)] = dj;

                      nextCode = eoiCode + 1;

                      codeSize = minCodeSize + 1;

                    }

                    cur = next;

                  }

                }

                writeBits(dict[cur], codeSize);

                writeBits(eoiCode, codeSize);

                if (bitCount > 0) out.push(bitBuf & 0xFF);

                return new Uint8Array(out);

              }

              for (var fi = 0; fi < frames.length; fi++) {

                // Graphic Control Extension

                var gce = new Uint8Array([0x21,0xF9,0x04,0x00, delay & 0xFF, (delay >> 8) & 0xFF, 0x00, 0x00]);

                parts.push(gce);

                // Image Descriptor

                var imgDesc = new Uint8Array(10);

                imgDesc[0] = 0x2C; // separator

                imgDesc[1] = 0; imgDesc[2] = 0; imgDesc[3] = 0; imgDesc[4] = 0; // x,y

                imgDesc[5] = W & 0xFF; imgDesc[6] = (W >> 8) & 0xFF;

                imgDesc[7] = H & 0xFF; imgDesc[8] = (H >> 8) & 0xFF;

                imgDesc[9] = 0; // no local color table

                parts.push(imgDesc);

                // Get pixel data

                var fCtx = frames[fi].getContext('2d');

                var fData = fCtx.getImageData(0, 0, W, H).data;

                // Quantize

                var indices = new Uint8Array(W * H);

                for (var pi = 0; pi < W * H; pi++) {

                  indices[pi] = nearestColor(fData[pi*4], fData[pi*4+1], fData[pi*4+2]);

                }

                // LZW encode

                parts.push(new Uint8Array([minCodeSize]));

                var lzwData = lzwEncode(indices);

                // Sub-blocks (max 255 bytes each)

                var pos = 0;

                while (pos < lzwData.length) {

                  var chunkLen = Math.min(255, lzwData.length - pos);

                  parts.push(new Uint8Array([chunkLen]));

                  parts.push(lzwData.slice(pos, pos + chunkLen));

                  pos += chunkLen;

                }

                parts.push(new Uint8Array([0x00])); // block terminator

              }

              // Trailer

              parts.push(new Uint8Array([0x3B]));

              // Assemble

              var totalLen = parts.reduce(function(s,p){return s+p.length;}, 0);

              var result = new Uint8Array(totalLen);

              var offset = 0;

              parts.forEach(function(p) { result.set(p, offset); offset += p.length; });

              var blob = new Blob([result], { type: 'image/gif' });

              var link = document.createElement('a');

              link.download = 'stereogram-anim-' + Date.now() + '.gif';

              link.href = URL.createObjectURL(blob);

              link.click();

              URL.revokeObjectURL(link.href);

              if (typeof addToast === 'function') addToast('\uD83C\uDFAC Animated GIF exported!', 'success');

            }



            // ═══ CUSTOM ANIMATION HELPERS ═══

            function _genTransformDepth(sourceImgData, W, H, transformType, frameIdx, totalFrames) {

              var c = document.createElement('canvas'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

              var t = frameIdx / totalFrames;

              // Put source into a temp canvas so we can drawImage with transforms

              var src = document.createElement('canvas'); src.width = W; src.height = H;

              var sCtx = src.getContext('2d');

              var sImg = sCtx.createImageData(W, H);

              var sData = sourceImgData.data || sourceImgData;

              for (var i = 0; i < sImg.data.length; i++) sImg.data[i] = sData[i];

              sCtx.putImageData(sImg, 0, 0);

              ctx.save();

              ctx.translate(W / 2, H / 2);

              if (transformType === 'zoom') {

                var scale = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));

                ctx.scale(scale, scale);

              } else if (transformType === 'rotate') {

                ctx.rotate(t * Math.PI * 2);

              } else if (transformType === 'bounce') {

                var bounceY = Math.abs(Math.sin(t * Math.PI * 2)) * H * 0.25;

                ctx.translate(0, -bounceY);

                var bounceScale = 0.8 + 0.2 * Math.abs(Math.sin(t * Math.PI * 2));

                ctx.scale(bounceScale, bounceScale);

              } else if (transformType === 'slide') {

                var slideX = Math.sin(t * Math.PI * 2) * W * 0.3;

                ctx.translate(slideX, 0);

              }

              ctx.drawImage(src, -W / 2, -H / 2, W, H);

              ctx.restore();

              return ctx.getImageData(0, 0, W, H);

            }



            function _interpolateDepthMaps(maps, frameIdx, totalFrames) {

              if (!maps || maps.length === 0) return null;

              if (maps.length === 1) return maps[0];

              var segCount = maps.length;

              var pos = (frameIdx / totalFrames) * segCount;

              var idx0 = Math.floor(pos) % maps.length;

              var idx1 = (idx0 + 1) % maps.length;

              var frac = pos - Math.floor(pos);

              var m0 = maps[idx0], m1 = maps[idx1];

              var W = m0.width, H = m0.height;

              var c = document.createElement('canvas'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              var out = ctx.createImageData(W, H);

              var d0 = m0.data, d1 = m1.data, od = out.data;

              for (var i = 0; i < od.length; i += 4) {

                od[i]     = Math.round(d0[i]     * (1 - frac) + d1[i]     * frac);

                od[i + 1] = Math.round(d0[i + 1] * (1 - frac) + d1[i + 1] * frac);

                od[i + 2] = Math.round(d0[i + 2] * (1 - frac) + d1[i + 2] * frac);

                od[i + 3] = 255;

              }

              ctx.putImageData(out, 0, 0);

              return out;

            }





          return React.createElement("div", { className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83C\uDFA8 Art & Design Studio"),

              React.createElement("span", { className: "px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] font-bold rounded-full" }, "CREATIVE"),

              React.createElement("button", { onClick: function () { setStemLabTool('archStudio'); }, className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border border-amber-300 hover:from-amber-200 hover:to-orange-200 transition-all shadow-sm", title: "Launch 3D Architecture Studio" }, "\uD83C\uDFD7\uFE0F 3D Builder \u2192")

            ),

            React.createElement("div", { className: "flex gap-1 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200" },

              [{ id: 'colorWheel', icon: '\uD83C\uDFA8', label: 'Color Wheel' }, { id: 'mixer', icon: '\uD83E\uDDEA', label: 'Color Mixer' }, { id: 'pixel', icon: '\uD83D\uDDBC', label: 'Pixel Art' }, { id: 'symmetry', icon: '\u2728', label: 'Symmetry' }, { id: 'spirograph', icon: '\uD83C\uDF00', label: 'Spirograph' }, { id: 'generative', icon: '\uD83C\uDF86', label: 'Generative' }, { id: 'spinArt', icon: '\uD83C\uDF00', label: 'Spin Art' }, { id: 'stringArt', icon: '\uD83D\uDD78', label: 'String Art' }, { id: 'opArt', icon: '\uD83D\uDC41', label: 'Op Art' }, { id: 'tessellation', icon: '\uD83D\uDD37', label: 'Tessellation' }, { id: 'fractal', icon: '\uD83D\uDD2E', label: 'Fractals' }, { id: 'gradient', icon: '\uD83C\uDF08', label: 'Gradient' }, { id: 'stereogram', icon: '\uD83D\uDC53', label: 'Stereogram' }, { id: 'life', icon: '\uD83E\uDDEC', label: 'Game of Life' }, { id: 'contrast', icon: '\u267F', label: 'Contrast' }].map(function (tb) {

                return React.createElement("button", { key: tb.id, onClick: function () { upd('tab', tb.id); }, className: "flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all " + (tab === tb.id ? 'bg-white shadow-md text-pink-700' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50') }, tb.icon + ' ' + tb.label);

              })

            ),

            tab === 'colorWheel' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "flex gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("canvas", { ref: wheelRef, width: 320, height: 320, className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair flex-shrink-0", style: { background: '#1e1e2e' } }),

                React.createElement("div", { className: "flex-1 space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-pink-700 mb-2" }, "\uD83C\uDFAF Selected Color"),

                    React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                      React.createElement("div", { style: { width: 60, height: 60, borderRadius: 12, background: 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-sm font-bold text-slate-800" }, "HSL(" + (d.hue || 0) + ", " + (d.sat || 100) + "%, " + (d.lit || 50) + "%)"),

                        React.createElement("p", { className: "text-[10px] text-slate-500" }, "Click the wheel to pick a hue")

                      )

                    ),

                    [{ k: 'hue', label: 'Hue', min: 0, max: 360 }, { k: 'sat', label: 'Saturation %', min: 0, max: 100 }, { k: 'lit', label: 'Lightness %', min: 0, max: 100 }].map(function (s) {

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-pink-600 block mb-0.5" }, s.label + ": " + (d[s.k] !== undefined ? d[s.k] : (s.k === 'hue' ? 0 : s.k === 'sat' ? 100 : 50))),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: d[s.k] !== undefined ? d[s.k] : (s.k === 'hue' ? 0 : s.k === 'sat' ? 100 : 50), onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-pink-600" })

                      );

                    })

                  ),

                  React.createElement("div", { className: "bg-white rounded-xl p-3 border border-pink-200" },

                    React.createElement("p", { className: "text-[10px] font-bold text-pink-600 mb-2" }, "\uD83D\uDD17 Color Harmony"),

                    React.createElement("div", { className: "flex gap-1" },

                      ['complementary', 'triadic', 'analogous', 'split'].map(function (h) {

                        return React.createElement("button", { key: h, onClick: function () { upd('harmony', h); }, className: "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all " + ((d.harmony || 'complementary') === h ? 'bg-pink-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-pink-50') }, h);

                      })

                    )

                  )

                )

              )

            ),

            tab === 'mixer' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "grid grid-cols-3 gap-4 items-center" },

                React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center" },

                  React.createElement("div", { style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mix1.h + ',' + mix1.s + '%,' + mix1.l + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-indigo-700 mb-2" }, "Color A"),

                  [{ k: 'mix1H', max: 360, val: mix1.h }, { k: 'mix1S', max: 100, val: mix1.s }, { k: 'mix1L', max: 100, val: mix1.l }].map(function (s) {

                    return React.createElement("input", { key: s.k, type: "range", min: 0, max: s.max, value: s.val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-indigo-500 mb-1" });

                  })

                ),

                React.createElement("div", { className: "text-center" },

                  React.createElement("div", { style: { width: 100, height: 100, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mixed.h + ',' + mixed.s + '%,' + mixed.l + '%)', border: '4px solid white', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-slate-700 mb-2" }, "\uD83C\uDFAF Result"),

                  React.createElement("input", { type: "range", min: 0, max: 100, value: Math.round(mixRatio * 100), onChange: function (e) { upd('mixRatio', parseInt(e.target.value) / 100); }, className: "w-full accent-pink-500" }),

                  React.createElement("p", { className: "text-[10px] text-slate-500" }, Math.round((1 - mixRatio) * 100) + '% A + ' + Math.round(mixRatio * 100) + '% B')

                ),

                React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 text-center" },

                  React.createElement("div", { style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mix2.h + ',' + mix2.s + '%,' + mix2.l + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-rose-700 mb-2" }, "Color B"),

                  [{ k: 'mix2H', max: 360, val: mix2.h }, { k: 'mix2S', max: 100, val: mix2.s }, { k: 'mix2L', max: 100, val: mix2.l }].map(function (s) {

                    return React.createElement("input", { key: s.k, type: "range", min: 0, max: s.max, value: s.val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-rose-500 mb-1" });

                  })

                )

              )

            ),

            tab === 'pixel' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("div", { style: { width: 28, height: 28, borderRadius: 6, background: 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } }),

                React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Current color"),

                React.createElement("div", { className: "ml-auto flex gap-1 flex-wrap" },

                  [{ id: 'brush', icon: '\uD83D\uDD8C', label: 'Brush' }, { id: 'eraser', icon: '\uD83E\uDDFD', label: 'Eraser' }, { id: 'fill', icon: '\uD83E\uDEA3', label: 'Fill' }].map(function (t) {

                    return React.createElement("button", { key: t.id, onClick: function () { upd('pixelTool', t.id); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.pixelTool || 'brush') === t.id ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, t.icon + ' ' + t.label);

                  }),

                  React.createElement("button", { onClick: function () { upd('pixelData', {}); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear"),

                  React.createElement("button", { onClick: function () { var c = document.querySelector('canvas[style*="pixelated"]'); if (!c) return; var link = document.createElement('a'); link.download = 'pixel-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, "\uD83D\uDCE5 Export PNG"),

                  React.createElement("select", { 'aria-label': 'Grid size', value: typeof d.pixelGrid === 'number' ? d.pixelGrid : 16, onChange: function (e) { upd('pixelGrid', parseInt(e.target.value)); upd('pixelData', {}); }, className: "px-2 py-1 text-xs border border-slate-200 rounded-lg" },

                    [8, 16, 24, 32].map(function (s) { return React.createElement("option", { key: s, value: s }, s + 'x' + s); }))

                )

              ),

              // Color Palette Presets

              React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-200" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider" }, "\uD83C\uDFA8 Palettes"),

                  [{ id: 'retro', label: '\uD83D\uDD79 Retro', colors: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]] },

                   { id: 'nature', label: '\uD83C\uDF3F Nature', colors: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]] },

                   { id: 'warm', label: '\uD83D\uDD25 Warm', colors: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]] },

                   { id: 'cool', label: '\u2744 Cool', colors: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]] },

                   { id: 'neon', label: '\uD83D\uDCA5 Neon', colors: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-pink-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ec4899' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("canvas", { ref: pixelRef, width: 512, height: 512, className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair mx-auto block", style: { maxWidth: '100%', imageRendering: 'pixelated' } })

            ),

            tab === 'symmetry' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\u2728 Folds:"),

                [4, 6, 8, 12, 16].map(function (f) {

                  return React.createElement("button", { key: f, onClick: function () { upd('symmetryFolds', f); }, className: "px-3 py-1 rounded-lg text-xs font-bold transition-all " + ((d.symmetryFolds || 6) === f ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, f);

                }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-3" }, "Brush:"),

                React.createElement("input", { type: "range", min: 1, max: 10, value: d.brushSize || 3, onChange: function (e) { upd('brushSize', parseInt(e.target.value)); }, className: "w-20 accent-pink-600" }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Mode:"),

                React.createElement("button", { onClick: function () { upd('symBrushMode', 'solid'); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.symBrushMode || 'rainbow') === 'solid' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, "\uD83D\uDD8C Solid"),

                React.createElement("button", { onClick: function () { upd('symBrushMode', 'rainbow'); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.symBrushMode || 'rainbow') === 'rainbow' ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, "\uD83C\uDF08 Rainbow"),

                React.createElement("button", { onClick: function () { upd('symMirrorOnly', !(d.symMirrorOnly)); upd('symmetryClear', Date.now()); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.symMirrorOnly ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50') }, d.symMirrorOnly ? '\uD83E\uDE9E Mirror \u2714' : '\uD83E\uDE9E Mirror'),

                React.createElement("button", { onClick: function () { upd('symmetryClear', Date.now()); }, className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear"),

                React.createElement("button", { onClick: function () { var c = document.getElementById('symmetryCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'symmetry-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, "\uD83D\uDCE5 Export PNG"),

                React.createElement("button", { onClick: function () { toggleFullscreen('symmetryCanvasContainer'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all" }, "\uD83D\uDD0D Fullscreen")

              ),

              React.createElement("div", { id: 'symmetryCanvasContainer', className: "bg-slate-900 rounded-xl p-2 relative flex flex-col items-center justify-center w-full" },

                React.createElement("div", { className: "bg-slate-800/80 rounded-xl p-2 border border-slate-700 w-full mb-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider" }, "\uD83C\uDFA8 Palettes"),

                  [{ id: 'retro', label: '\uD83D\uDD79 Retro' }, { id: 'nature', label: '\uD83C\uDF3F Nature' }, { id: 'warm', label: '\uD83D\uDD25 Warm' }, { id: 'cool', label: '\u2744 Cool' }, { id: 'neon', label: '\uD83D\uDCA5 Neon' }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-pink-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ec4899' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("canvas", { id: 'symmetryCanvas', ref: symmetryRef, width: 512, height: 512, key: 'sym-' + (d.symmetryFolds || 6) + '-' + (d.symmetryClear || 0) + '-' + (d.symMirrorOnly ? 'm' : 'r'), className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair mx-auto block mt-3 flex-shrink-0", style: { maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', background: '#0f172a' } })

              ), // end symmetryCanvasContainer

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-4 border border-violet-200" },

                React.createElement("button", { onClick: function () { upd('showSymInfo', !d.showSymInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-violet-700" },

                  React.createElement("span", null, "\uD83D\uDD2E Learn About Symmetry"),

                  React.createElement("span", null, d.showSymInfo ? '\u25B2' : '\u25BC')

                ),

                d.showSymInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                  React.createElement("p", null, "\uD83C\uDF3B ", React.createElement("strong", null, "Radial symmetry"), " repeats a pattern around a central point. In ", React.createElement("strong", null, "nature"), ", starfish (5-fold), snowflakes (6-fold), and flowers show this everywhere."),

                  React.createElement("p", null, "\uD83D\uDD73 ", React.createElement("strong", null, "4-fold:"), " Tile patterns, quilts, floor mosaics. ", React.createElement("strong", null, "6-fold:"), " Snowflakes, honeycombs, Islamic star patterns. ", React.createElement("strong", null, "8-fold:"), " Mandala art, rose windows in cathedrals."),

                  React.createElement("p", null, "\uD83C\uDFDB ", React.createElement("strong", null, "Cultural connections:"), " Islamic geometric art uses radial symmetry extensively. Celtic knots, Navajo textiles, and Japanese family crests (\u201Cmon\u201D) all rely on rotational symmetry."),

                  React.createElement("p", null, "\uD83E\uDE9E ", React.createElement("strong", null, "Mirror mode"), " uses bilateral (reflection) symmetry \u2014 the kind found in faces, butterflies, and leaves. It\u2019s the most common symmetry in the animal kingdom."),

                  React.createElement("p", null, "\uD83C\uDF08 ", React.createElement("strong", null, "Rainbow brush"), " cycles through the color spectrum as you draw, creating gradient-like mandala effects automatically.")

                )

              )

            ),

            tab === 'contrast' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4" },

                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-slate-600 mb-3" }, "Foreground (Text)"),

                  React.createElement("div", { style: { width: '100%', height: 50, borderRadius: 8, background: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', marginBottom: 8 } }),

                  [{ k: 'fgH', label: 'Hue', max: 360, val: fgH }, { k: 'fgS', label: 'Sat', max: 100, val: fgS }, { k: 'fgL', label: 'Light', max: 100, val: fgL }].map(function (s) {

                    return React.createElement("div", { key: s.k, className: "mb-1" },

                      React.createElement("label", { className: "text-[10px] text-slate-500 font-bold" }, s.label + ': ' + s.val),

                      React.createElement("input", { type: "range", min: 0, max: s.max, value: s.val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-slate-600" })

                    );

                  })

                ),

                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-slate-600 mb-3" }, "Background"),

                  React.createElement("div", { style: { width: '100%', height: 50, borderRadius: 8, background: 'hsl(' + bgH + ',' + bgS + '%,' + bgL + '%)', marginBottom: 8 } }),

                  [{ k: 'bgH', label: 'Hue', max: 360, val: bgH }, { k: 'bgS', label: 'Sat', max: 100, val: bgS }, { k: 'bgL', label: 'Light', max: 100, val: bgL }].map(function (s) {

                    return React.createElement("div", { key: s.k, className: "mb-1" },

                      React.createElement("label", { className: "text-[10px] text-slate-500 font-bold" }, s.label + ': ' + s.val),

                      React.createElement("input", { type: "range", min: 0, max: s.max, value: s.val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-slate-600" })

                    );

                  })

                )

              ),

              React.createElement("div", { className: "rounded-xl border-2 p-6 text-center " + (passAA ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50') },

                React.createElement("div", { className: "mb-3", style: { padding: 20, borderRadius: 12, background: 'hsl(' + bgH + ',' + bgS + '%,' + bgL + '%)' } },

                  React.createElement("p", { style: { color: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', fontSize: 24, fontWeight: 'bold' } }, "Sample Text"),

                  React.createElement("p", { style: { color: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', fontSize: 14 } }, "The quick brown fox jumps over the lazy dog")

                ),

                React.createElement("p", { className: "text-3xl font-bold " + (passAA ? 'text-green-700' : 'text-red-700') }, contrastRatio.toFixed(2) + ':1'),

                React.createElement("div", { className: "flex justify-center gap-3 mt-3" },

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAALarge ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') }, (passAALarge ? '\u2705' : '\u274C') + ' AA Large'),

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAA ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') }, (passAA ? '\u2705' : '\u274C') + ' AA Normal'),

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAAA ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800') }, (passAAA ? '\u2705' : '\u274C') + ' AAA')

                )

              )

            ),

            // ═══ SPIROGRAPH TAB ═══

            tab === 'spirograph' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-indigo-700 mb-3" }, "\uD83C\uDF00 Spirograph Controls"),

                    [{ k: 'spiroR', label: 'Outer Radius', min: 40, max: 200, def: 120 },

                     { k: 'spiror', label: 'Inner Radius', min: 10, max: 100, def: 45 },

                     { k: 'spirop', label: 'Pen Offset', min: 5, max: 120, def: 55 },

                     { k: 'spiroSpeed', label: 'Draw Speed', min: 1, max: 20, def: 8 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-indigo-600 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('spiroReset', Date.now()); }, className: "w-full accent-indigo-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('spiroReset', Date.now()); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear"),

                      React.createElement("button", { onClick: function () { var c = document.getElementById('spiroCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'spirograph-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG"),

                      React.createElement("button", { onClick: function () { upd('spiroRainbow', !(d.spiroRainbow)); upd('spiroReset', Date.now()); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.spiroRainbow ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, d.spiroRainbow ? '\uD83C\uDF08 Rainbow \u2714' : '\uD83C\uDF08 Rainbow')

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-indigo-500 mr-1" }, "Presets:"),

                      [{ label: 'Star', R: 120, r: 45, p: 55 }, { label: 'Flower', R: 150, r: 50, p: 25 }, { label: 'Lace', R: 100, r: 73, p: 80 }, { label: 'Atom', R: 180, r: 25, p: 90 }, { label: 'Spiral', R: 140, r: 91, p: 60 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('spiroR', pr.R); upd('spiror', pr.r); upd('spirop', pr.p); upd('spiroReset', Date.now()); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-200" },

                    React.createElement("p", { className: "text-[10px] font-bold text-violet-700 mb-1" }, "\uD83D\uDCDA Math Connection"),

                    React.createElement("p", { className: "text-[10px] text-slate-600 leading-relaxed" }, "Spirographs draw ", React.createElement("strong", null, "hypotrochoid curves"), " \u2014 the path traced by a point on a small circle rolling inside a larger one. The pattern depends on the ", React.createElement("strong", null, "GCD"), " (greatest common divisor) of the two radii. When R/r is a simple fraction, you get fewer petals; complex ratios create intricate, never-repeating paths.")

                  )

                ),

                React.createElement("canvas", { id: 'spiroCanvas', key: 'spiro-' + (d.spiroReset || 0), width: 512, height: 512, className: "rounded-xl border-2 border-indigo-200 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#0f172a' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._spiroInit) return;

                    canvas._spiroInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var R = typeof d.spiroR === 'number' ? d.spiroR : 120;

                    var r = typeof d.spiror === 'number' ? d.spiror : 45;

                    var p = typeof d.spirop === 'number' ? d.spirop : 55;

                    var speed = typeof d.spiroSpeed === 'number' ? d.spiroSpeed : 8;

                    var rainbow = d.spiroRainbow;

                    var baseHue = d.hue || 0;

                    var baseSat = d.sat || 100;

                    var baseLit = d.lit || 50;

                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    var t = 0;

                    var diff = R - r;

                    var ratio = diff / r;

                    var totalRevolutions = r / (function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); })(R, r);

                    var maxT = totalRevolutions * Math.PI * 2;

                    var prevX = cx + diff * Math.cos(0) + p * Math.cos(0 * ratio);

                    var prevY = cy + diff * Math.sin(0) + p * Math.sin(0 * ratio);

                    ctx.lineWidth = 1.5;

                    ctx.lineCap = 'round';

                    function drawStep() {

                      if (t >= maxT) return;

                      for (var si = 0; si < speed; si++) {

                        t += 0.02;

                        if (t > maxT) t = maxT;

                        var x = cx + diff * Math.cos(t) + p * Math.cos(t * ratio);

                        var y = cy + diff * Math.sin(t) + p * Math.sin(t * ratio);

                        var hue = rainbow ? Math.round((t / maxT) * 360) % 360 : baseHue;

                        ctx.strokeStyle = 'hsl(' + hue + ',' + baseSat + '%,' + baseLit + '%)';

                        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();

                        prevX = x; prevY = y;

                      }

                      canvas._spiroAnim = requestAnimationFrame(drawStep);

                    }

                    drawStep();

                  }

                })

              )

            ),

            // ═══ GENERATIVE ART TAB ═══

            tab === 'generative' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\uD83C\uDF86 Style:"),

                [{ id: 'flow', icon: '\uD83C\uDF0A', label: 'Flow Field' }, { id: 'rain', icon: '\uD83C\uDF27', label: 'Particle Rain' }, { id: 'stars', icon: '\u2728', label: 'Starfield' }, { id: 'aurora', icon: '\uD83C\uDF0C', label: 'Aurora' }].map(function (s) {

                  return React.createElement("button", { key: s.id, onClick: function () { upd('genStyle', s.id); upd('genReset', Date.now()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.genStyle || 'flow') === s.id ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-fuchsia-50') }, s.icon + ' ' + s.label);

                }),

                React.createElement("button", { onClick: function () { upd('genPaused', !d.genPaused); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.genPaused ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200') }, d.genPaused ? '\u25B6 Resume' : '\u23F8 Pause'),

                React.createElement("button", { onClick: function () { upd('genReset', Date.now()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear"),

                React.createElement("button", { onClick: function () { var c = document.getElementById('genCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'generative-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG")

              ),

              React.createElement("div", { className: "flex gap-2 mb-2" },

                React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Density:"),

                React.createElement("input", { type: "range", min: 20, max: 300, value: d.genDensity || 100, onChange: function (e) { upd('genDensity', parseInt(e.target.value)); upd('genReset', Date.now()); }, className: "w-32 accent-fuchsia-600" }),

                React.createElement("span", { className: "text-[10px] text-slate-400" }, (d.genDensity || 100) + ' particles')

              ),

              React.createElement("canvas", { id: 'genCanvas', key: 'gen-' + (d.genStyle || 'flow') + '-' + (d.genReset || 0), width: 640, height: 480, className: "rounded-xl border-2 border-fuchsia-200 shadow-lg cursor-crosshair mx-auto block", style: { maxWidth: '100%', background: '#0a0a1a' },

                ref: function (canvas) {

                  if (!canvas) return;

                  if (canvas._genInit) return;

                  canvas._genInit = true;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var style = d.genStyle || 'flow';

                  var density = d.genDensity || 100;

                  var baseHue = d.hue || 0;

                  var particles = [];

                  var mouseX = -1, mouseY = -1;

                  // Simplex-like noise (simple hash-based)

                  function noise2D(x, y) {

                    var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;

                    return n - Math.floor(n);

                  }

                  // Init particles

                  for (var i = 0; i < density; i++) {

                    particles.push({

                      x: Math.random() * W, y: Math.random() * H,

                      vx: 0, vy: 0,

                      life: Math.random() * 200 + 100,

                      maxLife: 300,

                      hue: (baseHue + Math.random() * 60) % 360,

                      size: 1 + Math.random() * 2

                    });

                  }

                  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);

                  var tick = 0;

                  var paused = false;

                  // Check pause state via data attribute

                  canvas.setAttribute('data-paused', d.genPaused ? '1' : '0');

                  canvas.onmousedown = canvas.ontouchstart = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                    // Burst particles from click

                    for (var bi = 0; bi < 30; bi++) {

                      var angle = Math.random() * Math.PI * 2;

                      var speed = 1 + Math.random() * 3;

                      particles.push({

                        x: mouseX, y: mouseY,

                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,

                        life: 150 + Math.random() * 100, maxLife: 250,

                        hue: (baseHue + Math.random() * 120) % 360,

                        size: 1 + Math.random() * 3

                      });

                    }

                  };

                  canvas.onmousemove = canvas.ontouchmove = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  function animate() {

                    if (canvas.getAttribute('data-paused') === '1') {

                      canvas._genAnim = requestAnimationFrame(animate);

                      return;

                    }

                    tick++;

                    // Fade trail

                    ctx.fillStyle = 'rgba(10,10,26,0.04)';

                    ctx.fillRect(0, 0, W, H);

                    for (var i = particles.length - 1; i >= 0; i--) {

                      var p = particles[i];

                      p.life--;

                      if (p.life <= 0) { particles.splice(i, 1); continue; }

                      var alpha = Math.min(1, p.life / 50);

                      if (style === 'flow') {

                        var angle = noise2D(p.x * 0.005, p.y * 0.005 + tick * 0.001) * Math.PI * 4;

                        p.vx += Math.cos(angle) * 0.3; p.vy += Math.sin(angle) * 0.3;

                        p.vx *= 0.96; p.vy *= 0.96;

                      } else if (style === 'rain') {

                        p.vy += 0.05;

                        p.vx += (Math.random() - 0.5) * 0.1;

                        if (p.y > H) { p.y = 0; p.x = Math.random() * W; p.vy = 0; p.life = p.maxLife; }

                      } else if (style === 'stars') {

                        var scx = W / 2, scy = H / 2;

                        var sdx = p.x - scx, sdy = p.y - scy;

                        var sdist = Math.sqrt(sdx * sdx + sdy * sdy) + 0.01;

                        p.vx += sdx / sdist * 0.1; p.vy += sdy / sdist * 0.1;

                        if (sdist > Math.max(W, H) * 0.7) { p.x = scx + (Math.random() - 0.5) * 20; p.y = scy + (Math.random() - 0.5) * 20; p.vx = 0; p.vy = 0; p.life = p.maxLife; }

                      } else if (style === 'aurora') {

                        p.vx += Math.sin(p.y * 0.01 + tick * 0.02) * 0.2;

                        p.vy += (Math.random() - 0.5) * 0.05 - 0.02;

                        if (p.y < 0 || p.x < 0 || p.x > W) { p.x = Math.random() * W; p.y = H * 0.7 + Math.random() * H * 0.3; p.vx = 0; p.vy = 0; p.life = p.maxLife; }

                        p.hue = (120 + Math.sin(p.x * 0.01) * 60 + tick * 0.5) % 360;

                      }

                      p.x += p.vx; p.y += p.vy;

                      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

                      ctx.fillStyle = 'hsla(' + p.hue + ',90%,60%,' + (alpha * 0.8) + ')';

                      ctx.fill();

                      // Glow effect

                      if (p.size > 1.5) {

                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);

                        ctx.fillStyle = 'hsla(' + p.hue + ',80%,50%,' + (alpha * 0.08) + ')';

                        ctx.fill();

                      }

                    }

                    // Replenish particles

                    while (particles.length < density * 0.7) {

                      particles.push({

                        x: style === 'stars' ? W / 2 + (Math.random() - 0.5) * 20 : Math.random() * W,

                        y: style === 'rain' ? 0 : style === 'aurora' ? H * 0.7 + Math.random() * H * 0.3 : Math.random() * H,

                        vx: 0, vy: 0,

                        life: 200 + Math.random() * 100, maxLife: 300,

                        hue: (baseHue + Math.random() * 60) % 360,

                        size: 1 + Math.random() * 2

                      });

                    }

                    canvas._genAnim = requestAnimationFrame(animate);

                  }

                  animate();

                }

              }),

              React.createElement("p", { className: "text-[10px] text-center text-slate-400 italic mt-1" }, "\uD83D\uDC46 Click or drag on the canvas to create particle bursts")

            ),

            // ═══ SPIN ART TAB ═══

            tab === 'spinArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "\uD83C\uDF00 RPM:"),

                React.createElement("input", { type: "range", min: 20, max: 300, value: d.spinRPM || 120, onChange: function (e) { upd('spinRPM', parseInt(e.target.value)); }, className: "w-28 accent-orange-600" }),

                React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, (d.spinRPM || 120) + ' rpm'),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Brush:"),

                React.createElement("input", { type: "range", min: 2, max: 20, value: d.spinBrush || 6, onChange: function (e) { upd('spinBrush', parseInt(e.target.value)); }, className: "w-20 accent-orange-600" }),

                React.createElement("button", { onClick: function () { upd('spinSplatter', !d.spinSplatter); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.spinSplatter ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50') }, d.spinSplatter ? '\uD83D\uDCA6 Splatter \u2714' : '\uD83D\uDCA6 Splatter'),

                React.createElement("button", { onClick: function () { upd('spinDark', !d.spinDark); upd('spinReset', Date.now()); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.spinDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200') }, d.spinDark ? '\uD83C\uDF11 Dark' : '\u2B1C Light'),

                React.createElement("button", { onClick: function () { upd('spinReset', Date.now()); }, className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear"),

                React.createElement("button", { onClick: function () { var c = document.getElementById('spinCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'spin-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG")

              ),

              React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-200" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider" }, "\uD83C\uDFA8 Palettes"),

                  [{ id: 'retro', label: '\uD83D\uDD79 Retro' }, { id: 'nature', label: '\uD83C\uDF3F Nature' }, { id: 'warm', label: '\uD83D\uDD25 Warm' }, { id: 'cool', label: '\u2744 Cool' }, { id: 'neon', label: '\uD83D\uDCA5 Neon' }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ea580c' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("canvas", { id: 'spinCanvas', key: 'spin-' + (d.spinReset || 0), width: 512, height: 512, className: "rounded-full border-4 border-orange-300 shadow-lg cursor-crosshair mx-auto block mt-3", style: { maxWidth: '100%', background: d.spinDark ? '#0f172a' : '#fefefe' },

                ref: function (canvas) {

                  if (!canvas) return;

                  if (canvas._spinInit) return;

                  canvas._spinInit = true;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var cx = W / 2, cy = H / 2;

                  var rpm = d.spinRPM || 120;

                  var brushSize = d.spinBrush || 6;

                  var splatter = d.spinSplatter || false;

                  var isDark = d.spinDark || false;

                  var baseHue = d.hue || 0, baseSat = d.sat || 100, baseLit = d.lit || 50;

                  ctx.fillStyle = isDark ? '#0f172a' : '#fefefe';

                  ctx.fillRect(0, 0, W, H);

                  var angle = 0;

                  var drips = [];

                  var mouseDown = false, mouseX = cx, mouseY = cy;

                  canvas.onmousedown = canvas.ontouchstart = function (e) {

                    mouseDown = true;

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onmousemove = canvas.ontouchmove = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onmouseup = canvas.ontouchend = function () { mouseDown = false; };

                  canvas.onmouseleave = function () { mouseDown = false; };

                  function spawnDrip(x, y) {

                    var count = splatter ? 5 + Math.floor(Math.random() * 8) : 1;

                    for (var i = 0; i < count; i++) {

                      var ox = splatter ? (Math.random() - 0.5) * 30 : 0;

                      var oy = splatter ? (Math.random() - 0.5) * 30 : 0;

                      drips.push({ x: x + ox, y: y + oy, vx: 0, vy: 0, life: 200 + Math.random() * 150, size: splatter ? 1 + Math.random() * brushSize : brushSize * 0.6, hue: baseHue + (splatter ? Math.random() * 30 - 15 : 0) });

                    }

                  }

                  function animate() {

                    var radPerFrame = (rpm / 60) * (Math.PI * 2) / 60;

                    angle += radPerFrame;

                    if (mouseDown) spawnDrip(mouseX, mouseY);

                    ctx.save();

                    ctx.translate(cx, cy);

                    ctx.rotate(angle);

                    ctx.translate(-cx, -cy);

                    for (var i = drips.length - 1; i >= 0; i--) {

                      var dr = drips[i];

                      dr.life--;

                      if (dr.life <= 0) { drips.splice(i, 1); continue; }

                      var dx = dr.x - cx, dy = dr.y - cy;

                      var dist = Math.sqrt(dx * dx + dy * dy);

                      if (dist > 1) {

                        var centrifugal = rpm * 0.00015;

                        dr.vx += (dx / dist) * centrifugal * dist;

                        dr.vy += (dy / dist) * centrifugal * dist;

                      }

                      dr.vx *= 0.98; dr.vy *= 0.98;

                      dr.x += dr.vx; dr.y += dr.vy;

                      var alpha = Math.min(1, dr.life / 60);

                      ctx.globalAlpha = alpha * 0.85;

                      ctx.beginPath();

                      ctx.arc(dr.x, dr.y, dr.size, 0, Math.PI * 2);

                      ctx.fillStyle = 'hsl(' + Math.round(dr.hue) + ',' + baseSat + '%,' + baseLit + '%)';

                      ctx.fill();

                      if (dist > W * 0.48) { drips.splice(i, 1); }

                    }

                    ctx.restore();

                    canvas._spinAnim = requestAnimationFrame(animate);

                  }

                  animate();

                }

              }),

              React.createElement("p", { className: "text-[10px] text-center text-slate-400 italic mt-1" }, "\uD83D\uDC46 Click and drag to drip paint on the spinning canvas"),

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200" },

                React.createElement("button", { onClick: function () { upd('showSpinInfo', !d.showSpinInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-orange-700" },

                  React.createElement("span", null, "\uD83C\uDF00 Physics of Spin Art"),

                  React.createElement("span", null, d.showSpinInfo ? '\u25B2' : '\u25BC')

                ),

                d.showSpinInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                  React.createElement("p", null, "\uD83C\uDF00 ", React.createElement("strong", null, "Centrifugal effect:"), " In a spinning reference frame, objects experience an outward pseudo-force proportional to their distance from the center and the square of angular velocity (\u03C9\u00B2r)."),

                  React.createElement("p", null, "\uD83D\uDCA7 ", React.createElement("strong", null, "Paint behavior:"), " Real spin art uses centripetal acceleration to spread paint. Thinner paint flies outward faster; thicker paint creates shorter, more controlled trails."),

                  React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, "Why it\u2019s beautiful:"), " The combination of rotational motion and paint viscosity creates natural spirals and interference patterns. No two spin paintings are ever alike \u2014 it\u2019s a form of ", React.createElement("strong", null, "chaotic art"), ".")

                )

              )

            ),

            // ═══ STRING ART TAB ═══

            tab === 'stringArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-rose-700 mb-3" }, "\uD83D\uDD78 String Art Controls"),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-rose-600 block mb-1" }, "Shape"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'circle', label: '\u25CB Circle' }, { id: 'square', label: '\u25A1 Square' }, { id: 'triangle', label: '\u25B3 Triangle' }, { id: 'star', label: '\u2606 Star' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('strShape', s.id); upd('strReset', Date.now()); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.strShape || 'circle') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'strNails', label: 'Nail Count', min: 20, max: 200, def: 80 },

                     { k: 'strMult', label: 'Multiplier', min: 2, max: 99, def: 2 },

                     { k: 'strOpacity', label: 'Thread Opacity %', min: 5, max: 100, def: 30 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-rose-600 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('strReset', Date.now()); }, className: "w-full accent-rose-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('strReset', Date.now()); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear"),

                      React.createElement("button", { onClick: function () { var c = document.getElementById('stringCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'string-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG"),

                      React.createElement("button", { onClick: function () { upd('strRainbow', !(d.strRainbow)); upd('strReset', Date.now()); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.strRainbow ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, d.strRainbow ? '\uD83C\uDF08 Rainbow \u2714' : '\uD83C\uDF08 Rainbow')

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-rose-500 mr-1" }, "Presets:"),

                      [{ label: 'Cardioid', nails: 100, mult: 2 }, { label: 'Nephroid', nails: 100, mult: 3 }, { label: 'Star Burst', nails: 72, mult: 37 }, { label: 'Lace', nails: 150, mult: 71 }, { label: 'Weave', nails: 60, mult: 23 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('strNails', pr.nails); upd('strMult', pr.mult); upd('strReset', Date.now()); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-xl p-3 border border-pink-200" },

                    React.createElement("p", { className: "text-[10px] font-bold text-pink-700 mb-1" }, "\uD83D\uDCDA Math Connection"),

                    React.createElement("p", { className: "text-[10px] text-slate-600 leading-relaxed" }, "String art creates ", React.createElement("strong", null, "envelope curves"), " from straight lines. With a circle and multiplier of 2, you get a ", React.createElement("strong", null, "cardioid"), " \u2014 the heart-shaped curve seen in coffee cups. Multiplier 3 makes a ", React.createElement("strong", null, "nephroid"), ". Higher multipliers create intricate patterns governed by ", React.createElement("strong", null, "modular arithmetic"), ": nail N connects to nail (N \u00D7 M) mod total.")

                  )

                ),

                React.createElement("canvas", { id: 'stringCanvas', key: 'str-' + (d.strReset || 0), width: 512, height: 512, className: "rounded-xl border-2 border-rose-200 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#0f172a' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._strInit) return;

                    canvas._strInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var R = Math.min(W, H) * 0.42;

                    var nails = typeof d.strNails === 'number' ? d.strNails : 80;

                    var mult = typeof d.strMult === 'number' ? d.strMult : 2;

                    var opacity = typeof d.strOpacity === 'number' ? d.strOpacity : 30;

                    var rainbow = d.strRainbow;

                    var shape = d.strShape || 'circle';

                    var baseHue = d.hue || 0;

                    var baseSat = d.sat || 100;

                    var baseLit = d.lit || 50;

                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    // Compute nail positions based on shape

                    var nailPos = [];

                    for (var i = 0; i < nails; i++) {

                      var t = i / nails;

                      if (shape === 'circle') {

                        var ang = t * Math.PI * 2 - Math.PI / 2;

                        nailPos.push([cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]);

                      } else if (shape === 'square') {

                        var side = Math.floor(t * 4) % 4;

                        var frac = (t * 4) % 1;

                        var half = R;

                        if (side === 0) nailPos.push([cx - half + frac * 2 * half, cy - half]);

                        else if (side === 1) nailPos.push([cx + half, cy - half + frac * 2 * half]);

                        else if (side === 2) nailPos.push([cx + half - frac * 2 * half, cy + half]);

                        else nailPos.push([cx - half, cy + half - frac * 2 * half]);

                      } else if (shape === 'triangle') {

                        var side2 = Math.floor(t * 3) % 3;

                        var frac2 = (t * 3) % 1;

                        var triR = R;

                        var pts = [[cx, cy - triR], [cx + triR * Math.cos(Math.PI / 6), cy + triR * Math.sin(Math.PI / 6)], [cx - triR * Math.cos(Math.PI / 6), cy + triR * Math.sin(Math.PI / 6)]];

                        var p1 = pts[side2], p2 = pts[(side2 + 1) % 3];

                        nailPos.push([p1[0] + (p2[0] - p1[0]) * frac2, p1[1] + (p2[1] - p1[1]) * frac2]);

                      } else if (shape === 'star') {

                        var starPts = 5;

                        var segTotal = starPts * 2;

                        var seg = Math.floor(t * segTotal) % segTotal;

                        var frac3 = (t * segTotal) % 1;

                        var outerR = R, innerR = R * 0.4;

                        var allPts = [];

                        for (var si = 0; si < starPts; si++) {

                          var oAng = (si / starPts) * Math.PI * 2 - Math.PI / 2;

                          var iAng = ((si + 0.5) / starPts) * Math.PI * 2 - Math.PI / 2;

                          allPts.push([cx + Math.cos(oAng) * outerR, cy + Math.sin(oAng) * outerR]);

                          allPts.push([cx + Math.cos(iAng) * innerR, cy + Math.sin(iAng) * innerR]);

                        }

                        var sp1 = allPts[seg], sp2 = allPts[(seg + 1) % allPts.length];

                        nailPos.push([sp1[0] + (sp2[0] - sp1[0]) * frac3, sp1[1] + (sp2[1] - sp1[1]) * frac3]);

                      }

                    }

                    // Draw nail dots

                    ctx.fillStyle = 'rgba(255,255,255,0.15)';

                    nailPos.forEach(function (np) { ctx.beginPath(); ctx.arc(np[0], np[1], 1.5, 0, Math.PI * 2); ctx.fill(); });

                    // Animate strings

                    var lineIdx = 0;

                    ctx.lineWidth = 1;

                    ctx.lineCap = 'round';

                    function drawStep() {

                      if (lineIdx >= nails) return;

                      var batchSize = Math.max(1, Math.floor(nails / 80));

                      for (var b = 0; b < batchSize && lineIdx < nails; b++, lineIdx++) {

                        var from = nailPos[lineIdx];

                        var toIdx = (lineIdx * mult) % nails;

                        var to = nailPos[toIdx];

                        var hue = rainbow ? Math.round((lineIdx / nails) * 360) % 360 : baseHue;

                        ctx.strokeStyle = 'hsla(' + hue + ',' + baseSat + '%,' + baseLit + '%,' + (opacity / 100) + ')';

                        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();

                      }

                      canvas._strAnim = requestAnimationFrame(drawStep);

                    }

                    drawStep();

                  }

                })

              )

            ),

            // ═══ OP ART TAB ═══

            tab === 'opArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-xl p-4 border border-fuchsia-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-fuchsia-700 mb-3" }, "\uD83D\uDC41 Op Art Controls"),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-fuchsia-600 block mb-1" }, "Style"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'concentric', label: '\u25CE Rings' }, { id: 'checkerboard', label: '\u2593 Checker' }, { id: 'moire', label: '\u2261 Moir\u00E9' }, { id: 'vibrating', label: '\u2248 Vibrate' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('opStyle', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.opStyle || 'concentric') === s.id ? 'bg-fuchsia-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-fuchsia-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'opSpeed', label: 'Speed', min: 1, max: 20, def: 5 },

                     { k: 'opDensity', label: 'Density', min: 3, max: 60, def: 20 },

                     { k: 'opHueA', label: 'Color A Hue', min: 0, max: 360, def: 0 },

                     { k: 'opHueB', label: 'Color B Hue', min: 0, max: 360, def: 180 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-fuchsia-600 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-fuchsia-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('opPaused', !(d.opPaused)); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.opPaused ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100') }, d.opPaused ? '\u25B6 Resume' : '\u23F8 Pause'),

                      React.createElement("button", { onClick: function () { var c = document.getElementById('opArtCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'op-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG")

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-fuchsia-500 mr-1" }, "Presets:"),

                      [{ label: 'Classic B&W', style: 'concentric', hA: 0, hB: 0, density: 25, speed: 4 },

                       { label: 'Neon Pulse', style: 'concentric', hA: 280, hB: 160, density: 15, speed: 8 },

                       { label: 'Spiral Vortex', style: 'moire', hA: 200, hB: 30, density: 40, speed: 6 },

                       { label: 'Wave Grid', style: 'checkerboard', hA: 10, hB: 190, density: 20, speed: 5 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('opStyle', pr.style); upd('opHueA', pr.hA); upd('opHueB', pr.hB); upd('opDensity', pr.density); upd('opSpeed', pr.speed); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-fuchsia-600 border border-fuchsia-200 hover:bg-fuchsia-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("button", { onClick: function () { upd('showOpInfo', !d.showOpInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-purple-700" },

                      React.createElement("span", null, "\uD83E\uDDE0 The Science of Op Art"),

                      React.createElement("span", null, d.showOpInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showOpInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDC41 ", React.createElement("strong", null, "Op Art"), " (Optical Art) emerged in the 1960s, pioneered by ", React.createElement("strong", null, "Bridget Riley"), " and ", React.createElement("strong", null, "Victor Vasarely"), ". It exploits the mechanics of human vision to create illusions of movement, vibration, and depth on flat surfaces."),

                      React.createElement("p", null, "\u2728 ", React.createElement("strong", null, "Moir\u00E9 patterns"), " appear when two regular grids overlap at slight angles. Your brain can\u2019t resolve the conflicting patterns, creating phantom curves and waves. This same effect causes the \u201Cscreen door\u201D shimmer on some fabrics."),

                      React.createElement("p", null, "\uD83C\uDF08 ", React.createElement("strong", null, "Vibrating colors"), " occur when highly saturated complementary colors sit side by side. Your eye\u2019s color receptors compete, creating a buzzing, unstable edge\u2014this is called ", React.createElement("strong", null, "chromatic vibration"), "."),

                      React.createElement("p", null, "\uD83E\uDDE0 ", React.createElement("strong", null, "Persistence of vision"), " and ", React.createElement("strong", null, "lateral inhibition"), " in the retina are the main perceptual mechanisms. Concentric ring patterns trigger involuntary eye saccades, making the artwork seem to breathe and pulse.")

                    )

                  )

                ),

                React.createElement("canvas", { id: 'opArtCanvas', width: 512, height: 512, className: "rounded-xl border-2 border-fuchsia-200 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#0a0a0a' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._opAnim) cancelAnimationFrame(canvas._opAnim);

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var tick = 0;

                    var style = d.opStyle || 'concentric';

                    var speed = typeof d.opSpeed === 'number' ? d.opSpeed : 5;

                    var density = typeof d.opDensity === 'number' ? d.opDensity : 20;

                    var hueA = typeof d.opHueA === 'number' ? d.opHueA : 0;

                    var hueB = typeof d.opHueB === 'number' ? d.opHueB : 180;

                    var paused = d.opPaused;

                    var isMonochrome = (hueA === 0 && hueB === 0);

                    var colA = isMonochrome ? '#000000' : 'hsl(' + hueA + ',85%,50%)';

                    var colB = isMonochrome ? '#ffffff' : 'hsl(' + hueB + ',85%,50%)';



                    function drawFrame() {

                      if (!paused) tick++;

                      ctx.clearRect(0, 0, W, H);



                      if (style === 'concentric') {

                        var maxR = Math.sqrt(cx * cx + cy * cy);

                        var ringWidth = maxR / density;

                        var offset = (tick * speed * 0.3) % (ringWidth * 2);

                        for (var r = maxR + ringWidth; r > 0; r -= ringWidth) {

                          var rr = r - offset;

                          if (rr < 0) rr += ringWidth * 2;

                          ctx.beginPath();

                          ctx.arc(cx, cy, Math.abs(rr), 0, Math.PI * 2);

                          ctx.fillStyle = (Math.round(r / ringWidth) % 2 === 0) ? colA : colB;

                          ctx.fill();

                        }

                        // Add subtle rotation warp

                        ctx.save();

                        ctx.globalCompositeOperation = 'overlay';

                        ctx.globalAlpha = 0.08;

                        var warpAngle = tick * speed * 0.005;

                        for (var wr = 0; wr < maxR; wr += ringWidth * 1.5) {

                          ctx.beginPath();

                          ctx.ellipse(cx, cy, wr, wr * (0.9 + Math.sin(warpAngle + wr * 0.01) * 0.1), warpAngle, 0, Math.PI * 2);

                          ctx.strokeStyle = colA; ctx.lineWidth = 2; ctx.stroke();

                        }

                        ctx.restore();



                      } else if (style === 'checkerboard') {

                        var cellSize = Math.max(8, Math.round(W / density));

                        var t = tick * speed * 0.02;

                        for (var gx = 0; gx < W; gx += cellSize) {

                          for (var gy = 0; gy < H; gy += cellSize) {

                            var dx = gx - cx, dy = gy - cy;

                            var dist = Math.sqrt(dx * dx + dy * dy);

                            var warp = Math.sin(dist * 0.015 - t) * cellSize * 0.4;

                            var wx = gx + warp * (dx / (dist || 1));

                            var wy = gy + warp * (dy / (dist || 1));

                            var col = Math.floor(gx / cellSize);

                            var row = Math.floor(gy / cellSize);

                            ctx.fillStyle = ((col + row) % 2 === 0) ? colA : colB;

                            ctx.fillRect(wx, wy, cellSize, cellSize);

                          }

                        }



                      } else if (style === 'moire') {

                        var spacing = Math.max(3, Math.round(200 / density));

                        var t2 = tick * speed * 0.003;

                        ctx.fillStyle = isMonochrome ? '#000' : 'hsl(' + hueA + ',30%,10%)';

                        ctx.fillRect(0, 0, W, H);

                        ctx.lineWidth = 1.5;

                        // Layer 1 — horizontal lines

                        ctx.strokeStyle = colB;

                        ctx.globalAlpha = 0.7;

                        for (var ly = -H; ly < H * 2; ly += spacing) {

                          ctx.beginPath();

                          ctx.moveTo(0, ly);

                          ctx.lineTo(W, ly);

                          ctx.stroke();

                        }

                        // Layer 2 — rotated lines

                        ctx.save();

                        ctx.translate(cx, cy);

                        ctx.rotate(t2);

                        ctx.strokeStyle = colA;

                        for (var ly2 = -W * 2; ly2 < W * 2; ly2 += spacing) {

                          ctx.beginPath();

                          ctx.moveTo(-W, ly2);

                          ctx.lineTo(W, ly2);

                          ctx.stroke();

                        }

                        ctx.restore();

                        ctx.globalAlpha = 1;



                      } else if (style === 'vibrating') {

                        var stripeW = Math.max(4, Math.round(W / density));

                        var t3 = tick * speed * 0.04;

                        for (var vx = 0; vx < W; vx += stripeW) {

                          var wave = Math.sin(vx * 0.03 + t3) * stripeW * 0.3;

                          var idx = Math.floor(vx / stripeW);

                          ctx.fillStyle = (idx % 2 === 0) ? colA : colB;

                          ctx.beginPath();

                          ctx.moveTo(vx + wave, 0);

                          ctx.lineTo(vx + stripeW + wave, 0);

                          for (var vy = 0; vy < H; vy += 4) {

                            var localWave = Math.sin(vy * 0.02 + t3 + vx * 0.01) * stripeW * 0.25;

                            ctx.lineTo(vx + stripeW + localWave, vy);

                          }

                          ctx.lineTo(vx + stripeW, H);

                          ctx.lineTo(vx, H);

                          for (var vy2 = H; vy2 > 0; vy2 -= 4) {

                            var localWave2 = Math.sin(vy2 * 0.02 + t3 + vx * 0.01) * stripeW * 0.25;

                            ctx.lineTo(vx + localWave2, vy2);

                          }

                          ctx.closePath();

                          ctx.fill();

                        }

                      }



                      canvas._opAnim = requestAnimationFrame(drawFrame);

                    }

                    drawFrame();

                  }

                })

              )

            ),

            // ═══ TESSELLATION TAB ═══

            tab === 'tessellation' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-teal-700 mb-3" }, "\uD83D\uDD37 Tessellation Controls"),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-teal-600 block mb-1" }, "Base Shape"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'triangle', label: '\u25B3 Triangle' }, { id: 'square', label: '\u25A1 Square' }, { id: 'hexagon', label: '\u2B21 Hexagon' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('tessShape', s.id); upd('tessClickData', {}); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.tessShape || 'hexagon') === s.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'tessGrid', label: 'Grid Size', min: 2, max: 20, def: 6 },

                     { k: 'tessRotation', label: 'Rotation \u00B0', min: 0, max: 360, def: 0 },

                     { k: 'tessWarpAmt', label: 'Escher Warp', min: 0, max: 50, def: 0 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-teal-600 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-teal-600" })

                      );

                    }),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-teal-600 block mb-1" }, "Color Scheme"),

                      React.createElement("div", { className: "flex gap-1 flex-wrap" },

                        [{ id: 'rainbow', label: '\uD83C\uDF08 Rainbow' }, { id: 'warm', label: '\uD83D\uDD25 Warm' }, { id: 'cool', label: '\u2744 Cool' }, { id: 'mono', label: '\u25AB Mono' }, { id: 'custom', label: '\uD83C\uDFA8 Custom' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('tessScheme', s.id); upd('tessClickData', {}); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.tessScheme || 'rainbow') === s.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-teal-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('tessClickData', {}); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear Colors"),

                      React.createElement("button", { onClick: function () { var c = document.getElementById('tessCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'tessellation-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG")

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-teal-500 mr-1" }, "Presets:"),

                      [{ label: 'Honeycomb', shape: 'hexagon', grid: 6, rot: 0, warp: 0, scheme: 'warm' },

                       { label: 'Pinwheel', shape: 'triangle', grid: 8, rot: 30, warp: 0, scheme: 'rainbow' },

                       { label: 'Islamic Star', shape: 'hexagon', grid: 5, rot: 15, warp: 10, scheme: 'cool' },

                       { label: 'Escher Fish', shape: 'square', grid: 6, rot: 0, warp: 35, scheme: 'rainbow' }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('tessShape', pr.shape); upd('tessGrid', pr.grid); upd('tessRotation', pr.rot); upd('tessWarpAmt', pr.warp); upd('tessScheme', pr.scheme); upd('tessClickData', {}); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-teal-600 border border-teal-200 hover:bg-teal-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 border border-cyan-200" },

                    React.createElement("button", { onClick: function () { upd('showTessInfo', !d.showTessInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-cyan-700" },

                      React.createElement("span", null, "\uD83D\uDCCF The Math of Tessellations"),

                      React.createElement("span", null, d.showTessInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showTessInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDD37 A ", React.createElement("strong", null, "tessellation"), " (or tiling) covers a plane with shapes that fit together without gaps or overlaps. Only three regular polygons tile by themselves: ", React.createElement("strong", null, "equilateral triangles"), " (60\u00B0 \u00D7 6 = 360\u00B0), ", React.createElement("strong", null, "squares"), " (90\u00B0 \u00D7 4 = 360\u00B0), and ", React.createElement("strong", null, "regular hexagons"), " (120\u00B0 \u00D7 3 = 360\u00B0)."),

                      React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, "M.C. Escher"), " (1898\u20131972) transformed simple tilings into art by warping tile edges. His technique: deform one side of a shape and copy the deformation to the opposite side, so tiles still fit together perfectly. This is the basis of the ", React.createElement("strong", null, "Escher Warp"), " slider."),

                      React.createElement("p", null, "\uD83C\uDFDB ", React.createElement("strong", null, "Islamic geometric art"), " uses tessellations extensively\u2014combining stars, hexagons, and interlocking patterns seen in mosques like the Alhambra. These patterns follow strict mathematical rules while creating breathtaking visual complexity."),

                      React.createElement("p", null, "\uD83D\uDCCA ", React.createElement("strong", null, "Transformations:"), " Tessellations use three key operations\u2014", React.createElement("strong", null, "translation"), " (slide), ", React.createElement("strong", null, "rotation"), " (turn), and ", React.createElement("strong", null, "reflection"), " (flip). Every tessellation can be classified by which of these 17 'wallpaper groups' it belongs to.")

                    )

                  ),

                  React.createElement("p", { className: "text-[10px] text-center text-slate-400 italic" }, "\uD83D\uDC46 Click tiles to cycle their colors")

                ),

                React.createElement("canvas", { id: 'tessCanvas', width: 512, height: 512, className: "rounded-xl border-2 border-teal-200 shadow-lg mx-auto block cursor-pointer", style: { maxWidth: '100%', background: '#0f172a' },

                  key: 'tess-' + (d.tessShape || 'hexagon') + '-' + (d.tessGrid || 6) + '-' + (d.tessRotation || 0) + '-' + (d.tessWarpAmt || 0) + '-' + (d.tessScheme || 'rainbow'),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._tessInit) return;

                    canvas._tessInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var shape = d.tessShape || 'hexagon';

                    var gridSize = typeof d.tessGrid === 'number' ? d.tessGrid : 6;

                    var rotation = (typeof d.tessRotation === 'number' ? d.tessRotation : 0) * Math.PI / 180;

                    var warpAmt = typeof d.tessWarpAmt === 'number' ? d.tessWarpAmt : 0;

                    var scheme = d.tessScheme || 'rainbow';

                    var clickData = d.tessClickData || {};



                    // Color palettes

                    var palettes = {

                      rainbow: function (i, total) { return 'hsl(' + Math.round((i / Math.max(total, 1)) * 360) + ',75%,55%)'; },

                      warm: function (i, total) { return 'hsl(' + Math.round((i / Math.max(total, 1)) * 60) + ',80%,' + (40 + (i % 3) * 10) + '%)'; },

                      cool: function (i, total) { return 'hsl(' + (180 + Math.round((i / Math.max(total, 1)) * 80)) + ',70%,' + (40 + (i % 3) * 10) + '%)'; },

                      mono: function (i, total) { return 'hsl(210,' + (10 + (i % 4) * 8) + '%,' + (30 + (i / Math.max(total, 1)) * 40) + '%)'; },

                      custom: function (i) { return 'hsl(' + ((i * 137.508) % 360) + ',65%,55%)'; }

                    };

                    var colorFn = palettes[scheme] || palettes.rainbow;

                    var clickCyclePalette = ['hsl(0,80%,55%)', 'hsl(30,90%,55%)', 'hsl(55,90%,55%)', 'hsl(120,60%,45%)', 'hsl(200,75%,50%)', 'hsl(270,70%,55%)', 'hsl(320,80%,55%)', 'hsl(0,0%,90%)'];



                    // Store tile polygons for click detection

                    var tilePolys = [];



                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    ctx.save();

                    ctx.translate(W / 2, H / 2);

                    ctx.rotate(rotation);

                    ctx.translate(-W / 2, -H / 2);



                    var tileIdx = 0;



                    function warpEdge(x1, y1, x2, y2, amt) {

                      if (amt <= 0) return [[x1, y1], [x2, y2]];

                      var pts = [[x1, y1]];

                      var steps = 6;

                      for (var s = 1; s < steps; s++) {

                        var t = s / steps;

                        var mx = x1 + (x2 - x1) * t;

                        var my = y1 + (y2 - y1) * t;

                        var dx = -(y2 - y1), dy = (x2 - x1);

                        var len = Math.sqrt(dx * dx + dy * dy) || 1;

                        var offset = Math.sin(t * Math.PI * 2) * amt * 0.3;

                        pts.push([mx + (dx / len) * offset, my + (dy / len) * offset]);

                      }

                      pts.push([x2, y2]);

                      return pts;

                    }



                    function drawTile(vertices, fillColor, idx) {

                      var wPts = [];

                      for (var vi = 0; vi < vertices.length; vi++) {

                        var next = (vi + 1) % vertices.length;

                        var edgePts = warpEdge(vertices[vi][0], vertices[vi][1], vertices[next][0], vertices[next][1], warpAmt);

                        for (var ep = 0; ep < edgePts.length - (vi < vertices.length - 1 ? 1 : 0); ep++) {

                          wPts.push(edgePts[ep]);

                        }

                      }

                      var keyStr = Math.round(vertices[0][0]) + '_' + Math.round(vertices[0][1]);

                      var useColor = clickData[keyStr] !== undefined ? clickCyclePalette[clickData[keyStr] % clickCyclePalette.length] : fillColor;

                      ctx.beginPath();

                      ctx.moveTo(wPts[0][0], wPts[0][1]);

                      for (var wp = 1; wp < wPts.length; wp++) { ctx.lineTo(wPts[wp][0], wPts[wp][1]); }

                      ctx.closePath();

                      ctx.fillStyle = useColor;

                      ctx.fill();

                      ctx.strokeStyle = 'rgba(255,255,255,0.25)';

                      ctx.lineWidth = 1;

                      ctx.stroke();

                      tilePolys.push({ vertices: vertices, key: keyStr, idx: idx });

                    }



                    if (shape === 'hexagon') {

                      var hexR = W / (gridSize * 1.8);

                      var hexH = hexR * Math.sqrt(3);

                      var startX = -hexR * 2;

                      var startY = -hexH;

                      for (var row = 0; row < gridSize + 3; row++) {

                        for (var col = 0; col < gridSize + 3; col++) {

                          var hx = startX + col * hexR * 1.5;

                          var hy = startY + row * hexH + (col % 2 === 1 ? hexH / 2 : 0);

                          var verts = [];

                          for (var a = 0; a < 6; a++) {

                            var ang = (a * 60 - 30) * Math.PI / 180;

                            verts.push([hx + Math.cos(ang) * hexR, hy + Math.sin(ang) * hexR]);

                          }

                          drawTile(verts, colorFn(tileIdx, (gridSize + 3) * (gridSize + 3)), tileIdx);

                          tileIdx++;

                        }

                      }

                    } else if (shape === 'square') {

                      var sqSize = W / gridSize;

                      for (var row2 = -1; row2 < gridSize + 1; row2++) {

                        for (var col2 = -1; col2 < gridSize + 1; col2++) {

                          var sx = col2 * sqSize;

                          var sy = row2 * sqSize;

                          var verts2 = [[sx, sy], [sx + sqSize, sy], [sx + sqSize, sy + sqSize], [sx, sy + sqSize]];

                          drawTile(verts2, colorFn(tileIdx, (gridSize + 2) * (gridSize + 2)), tileIdx);

                          tileIdx++;

                        }

                      }

                    } else if (shape === 'triangle') {

                      var triH2 = W / gridSize;

                      var triW = triH2 * 2 / Math.sqrt(3);

                      for (var row3 = -1; row3 < gridSize + 2; row3++) {

                        for (var col3 = -2; col3 < gridSize * 2 + 2; col3++) {

                          var isUp = (col3 + row3) % 2 === 0;

                          var tx = col3 * triW / 2;

                          var ty = row3 * triH2;

                          var verts3;

                          if (isUp) {

                            verts3 = [[tx, ty + triH2], [tx + triW / 2, ty], [tx + triW, ty + triH2]];

                          } else {

                            verts3 = [[tx, ty], [tx + triW, ty], [tx + triW / 2, ty + triH2]];

                          }

                          drawTile(verts3, colorFn(tileIdx, (gridSize + 3) * (gridSize * 2 + 4)), tileIdx);

                          tileIdx++;

                        }

                      }

                    }

                    ctx.restore();



                    // Click handler for cycling tile colors

                    canvas.onclick = function (e) {

                      var rect = canvas.getBoundingClientRect();

                      var mx = (e.clientX - rect.left) * (W / rect.width);

                      var my = (e.clientY - rect.top) * (H / rect.height);

                      // Transform click point by inverse rotation

                      var cos = Math.cos(-rotation), sin = Math.sin(-rotation);

                      var cx2 = W / 2, cy2 = H / 2;

                      var dx = mx - cx2, dy = my - cy2;

                      var rx = cx2 + dx * cos - dy * sin;

                      var ry = cy2 + dx * sin + dy * cos;

                      // Find clicked tile

                      for (var ti = tilePolys.length - 1; ti >= 0; ti--) {

                        var poly = tilePolys[ti];

                        var inside = false;

                        var vs = poly.vertices;

                        for (var pi = 0, pj = vs.length - 1; pi < vs.length; pj = pi++) {

                          if (((vs[pi][1] > ry) !== (vs[pj][1] > ry)) && (rx < (vs[pj][0] - vs[pi][0]) * (ry - vs[pi][1]) / (vs[pj][1] - vs[pi][1]) + vs[pi][0])) {

                            inside = !inside;

                          }

                        }

                        if (inside) {

                          var newClick = Object.assign({}, clickData);

                          newClick[poly.key] = ((newClick[poly.key] || 0) + 1) % clickCyclePalette.length;

                          upd('tessClickData', newClick);

                          break;

                        }

                      }

                    };

                  }

                })

              )

            ),

            // ═══ FRACTAL EXPLORER TAB ═══

            tab === 'fractal' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-violet-700 mb-3" }, "\uD83D\uDD2E Fractal Explorer"),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-violet-600 block mb-1" }, "Fractal Type"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'mandelbrot', label: '\uD83C\uDF00 Mandelbrot' }, { id: 'julia', label: '\u2728 Julia' }, { id: 'burningShip', label: '\uD83D\uDD25 Burning Ship' }, { id: 'sierpinski', label: '\u25B3 Sierpinski' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('fractalType', s.id); upd('fractalZoom', 1); upd('fractalPanX', 0); upd('fractalPanY', 0); upd('fractalReset', Date.now()); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.fractalType || 'mandelbrot') === s.id ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-violet-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'fractalIter', label: 'Max Iterations', min: 50, max: 500, def: 200 },

                     { k: 'fractalZoom', label: 'Zoom', min: 1, max: 500, def: 1 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-violet-600 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('fractalReset', Date.now()); }, className: "w-full accent-violet-600" })

                      );

                    }),

                    (d.fractalType || 'mandelbrot') === 'julia' && React.createElement("div", { className: "space-y-2 mt-2 p-2 bg-violet-50 rounded-lg border border-violet-200" },

                      React.createElement("p", { className: "text-[10px] font-bold text-violet-500" }, "Julia Constant (c)"),

                      [{ k: 'juliaReal', label: 'c real', min: -200, max: 200, def: -70 },

                       { k: 'juliaImag', label: 'c imaginary', min: -200, max: 200, def: 27 }].map(function (s) {

                        var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                        return React.createElement("div", { key: s.k },

                          React.createElement("label", { className: "text-[10px] font-bold text-violet-600" }, s.label + ': ' + (val / 100).toFixed(2)),

                          React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('fractalReset', Date.now()); }, className: "w-full accent-violet-500" })

                        );

                      })

                    ),

                    React.createElement("div", { className: "mb-3 mt-2" },

                      React.createElement("label", { className: "text-[10px] font-bold text-violet-600 block mb-1" }, "Color Scheme"),

                      React.createElement("div", { className: "flex gap-1 flex-wrap" },

                        [{ id: 'classic', label: '\uD83C\uDF08 Classic' }, { id: 'fire', label: '\uD83D\uDD25 Fire' }, { id: 'ocean', label: '\uD83C\uDF0A Ocean' }, { id: 'psychedelic', label: '\uD83D\uDC9C Psychedelic' }, { id: 'grayscale', label: '\u25AB Grayscale' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('fractalColor', s.id); upd('fractalReset', Date.now()); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.fractalColor || 'classic') === s.id ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-violet-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('fractalZoom', 1); upd('fractalPanX', 0); upd('fractalPanY', 0); upd('fractalReset', Date.now()); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\u21BA Reset View"),

                      React.createElement("button", { onClick: function () { var c = document.getElementById('fractalCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'fractal-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG")

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-violet-500 mr-1" }, "Presets:"),

                      [{ label: 'Seahorse Valley', type: 'mandelbrot', panX: 74, panY: -20, zoom: 120, iter: 350 },

                       { label: 'Elephant Valley', type: 'mandelbrot', panX: 36, panY: -4, zoom: 80, iter: 300 },

                       { label: 'Lightning', type: 'julia', panX: 0, panY: 0, zoom: 1, iter: 250, jr: -12, ji: 75 },

                       { label: 'Spiral Arm', type: 'julia', panX: 0, panY: 0, zoom: 1, iter: 300, jr: 28, ji: 1 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('fractalType', pr.type); upd('fractalPanX', pr.panX); upd('fractalPanY', pr.panY); upd('fractalZoom', pr.zoom); upd('fractalIter', pr.iter); if (pr.jr !== undefined) { upd('juliaReal', pr.jr); upd('juliaImag', pr.ji); } upd('fractalReset', Date.now()); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-violet-600 border border-violet-200 hover:bg-violet-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("button", { onClick: function () { upd('showFractalInfo', !d.showFractalInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-purple-700" },

                      React.createElement("span", null, "\uD83D\uDD2C The Math of Fractals"),

                      React.createElement("span", null, d.showFractalInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showFractalInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83C\uDF00 ", React.createElement("strong", null, "The Mandelbrot set"), " is generated by iterating z = z\u00B2 + c for every point c in the complex plane. Points where |z| stays bounded (never exceeds 2) are 'in' the set. The boundary reveals ", React.createElement("strong", null, "infinite complexity"), " at every scale."),

                      React.createElement("p", null, "\u2728 ", React.createElement("strong", null, "Julia sets"), " use the same formula but fix c and vary the starting z. Each Mandelbrot point generates a unique Julia set \u2014 points inside the Mandelbrot produce connected Julias; outside points produce dust-like 'Fatou sets'."),

                      React.createElement("p", null, "\uD83D\uDD25 The ", React.createElement("strong", null, "Burning Ship"), " fractal modifies the iteration to z = (|Re(z)| + i|Im(z)|)\u00B2 + c, creating an asymmetric shape resembling a flaming vessel. It was discovered by Michael Michelitsch and Otto R\u00F6ssler in 1992."),

                      React.createElement("p", null, "\u25B3 The ", React.createElement("strong", null, "Sierpinski Triangle"), " is built by the 'chaos game': pick a random point, then repeatedly jump halfway toward a randomly chosen vertex. Remarkably, this random process produces a perfectly self-similar fractal."),

                      React.createElement("p", null, "\uD83E\uDDE0 ", React.createElement("strong", null, "Benoit Mandelbrot"), " (1924\u20132010) coined the word 'fractal' from Latin 'fractus' (broken). He showed that coastlines, mountains, blood vessels, and stock markets all exhibit fractal geometry \u2014 ", React.createElement("strong", null, "nature is fractal"), ".")

                    )

                  )

                ),

                React.createElement("canvas", { id: 'fractalCanvas', width: 512, height: 512, className: "rounded-xl border-2 border-violet-200 shadow-lg mx-auto block cursor-crosshair", style: { maxWidth: '100%', background: '#0a0a1a' },

                  key: 'frac-' + (d.fractalType || 'mandelbrot') + '-' + (d.fractalReset || 0),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._fracInit) return;

                    canvas._fracInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var type = d.fractalType || 'mandelbrot';

                    var maxIter = typeof d.fractalIter === 'number' ? d.fractalIter : 200;

                    var zoom = typeof d.fractalZoom === 'number' ? d.fractalZoom : 1;

                    var panX = typeof d.fractalPanX === 'number' ? d.fractalPanX : 0;

                    var panY = typeof d.fractalPanY === 'number' ? d.fractalPanY : 0;

                    var colorScheme = d.fractalColor || 'classic';

                    var juliaR = typeof d.juliaReal === 'number' ? d.juliaReal / 100 : -0.7;

                    var juliaI = typeof d.juliaImag === 'number' ? d.juliaImag / 100 : 0.27;



                    function getColor(iter, max) {

                      if (iter === max) return [0, 0, 0];

                      var t = iter / max;

                      if (colorScheme === 'fire') return [Math.min(255, Math.round(t * 3 * 255)), Math.round(t * t * 255), Math.round(t * t * t * 200)];

                      if (colorScheme === 'ocean') return [Math.round(t * t * 80), Math.round(t * 180), Math.min(255, Math.round(t * 1.5 * 255))];

                      if (colorScheme === 'psychedelic') {

                        var h = (t * 360 * 3) % 360;

                        var s = 0.9, l = 0.5;

                        var c = (1 - Math.abs(2 * l - 1)) * s;

                        var x = c * (1 - Math.abs((h / 60) % 2 - 1));

                        var m = l - c / 2;

                        var r1, g1, b1;

                        if (h < 60) { r1 = c; g1 = x; b1 = 0; } else if (h < 120) { r1 = x; g1 = c; b1 = 0; }

                        else if (h < 180) { r1 = 0; g1 = c; b1 = x; } else if (h < 240) { r1 = 0; g1 = x; b1 = c; }

                        else if (h < 300) { r1 = x; g1 = 0; b1 = c; } else { r1 = c; g1 = 0; b1 = x; }

                        return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];

                      }

                      if (colorScheme === 'grayscale') { var v = Math.round(t * 255); return [v, v, v]; }

                      // classic rainbow

                      var h2 = (t * 360 * 2) % 360;

                      var c2 = 1 * 0.8; var x2 = c2 * (1 - Math.abs((h2 / 60) % 2 - 1)); var m2 = 0.1;

                      var r2, g2, b2;

                      if (h2 < 60) { r2 = c2; g2 = x2; b2 = 0; } else if (h2 < 120) { r2 = x2; g2 = c2; b2 = 0; }

                      else if (h2 < 180) { r2 = 0; g2 = c2; b2 = x2; } else if (h2 < 240) { r2 = 0; g2 = x2; b2 = c2; }

                      else if (h2 < 300) { r2 = x2; g2 = 0; b2 = c2; } else { r2 = c2; g2 = 0; b2 = x2; }

                      return [Math.round((r2 + m2) * 255), Math.round((g2 + m2) * 255), Math.round((b2 + m2) * 255)];

                    }



                    if (type === 'sierpinski') {

                      // Chaos game Sierpinski

                      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);

                      var verts = [[W / 2, 20], [20, H - 20], [W - 20, H - 20]];

                      var px = Math.random() * W, py = Math.random() * H;

                      var si = 0, total = 100000;

                      var batchSize = 500;

                      function drawSierpBatch() {

                        for (var b = 0; b < batchSize && si < total; b++, si++) {

                          var vi = Math.floor(Math.random() * 3);

                          px = (px + verts[vi][0]) / 2;

                          py = (py + verts[vi][1]) / 2;

                          if (si > 10) {

                            var t = si / total;

                            var col = getColor(Math.round(t * maxIter * 0.5), maxIter);

                            ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.7)';

                            ctx.fillRect(px, py, 1.2, 1.2);

                          }

                        }

                        if (si < total) canvas._fracAnim = requestAnimationFrame(drawSierpBatch);

                      }

                      drawSierpBatch();

                    } else {

                      // Mandelbrot / Julia / Burning Ship — pixel-by-pixel via ImageData

                      var imgData = ctx.createImageData(W, H);

                      var data = imgData.data;

                      // Render in chunks for responsiveness

                      var rowsDone = 0;

                      var centerX = type === 'mandelbrot' ? -0.5 : type === 'burningShip' ? -0.4 : 0;

                      var centerY = type === 'burningShip' ? -0.5 : 0;

                      var scale = 3.0 / (zoom * Math.min(W, H));

                      var offsetX = (panX / 100) * 2;

                      var offsetY = (panY / 100) * 2;



                      function renderChunk() {

                        var endRow = Math.min(rowsDone + 16, H);

                        for (var py2 = rowsDone; py2 < endRow; py2++) {

                          for (var px2 = 0; px2 < W; px2++) {

                            var x0 = (px2 - W / 2) * scale + centerX - offsetX;

                            var y0 = (py2 - H / 2) * scale + centerY - offsetY;

                            var zr, zi, cr, ci, iter = 0;



                            if (type === 'julia') {

                              zr = x0; zi = y0; cr = juliaR; ci = juliaI;

                            } else {

                              zr = 0; zi = 0; cr = x0; ci = y0;

                            }



                            while (iter < maxIter && zr * zr + zi * zi < 4) {

                              if (type === 'burningShip') {

                                var tr = Math.abs(zr), ti = Math.abs(zi);

                                var newR = tr * tr - ti * ti + cr;

                                zi = 2 * tr * ti + ci;

                                zr = newR;

                              } else {

                                var newR2 = zr * zr - zi * zi + cr;

                                zi = 2 * zr * zi + ci;

                                zr = newR2;

                              }

                              iter++;

                            }



                            // Smooth coloring

                            var smoothIter = iter;

                            if (iter < maxIter) {

                              var log_zn = Math.log(zr * zr + zi * zi) / 2;

                              var nu = Math.log(log_zn / Math.log(2)) / Math.log(2);

                              if (isFinite(nu)) smoothIter = iter + 1 - nu;

                            }



                            var col = getColor(smoothIter, maxIter);

                            var idx = (py2 * W + px2) * 4;

                            data[idx] = col[0]; data[idx + 1] = col[1]; data[idx + 2] = col[2]; data[idx + 3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0, 0, rowsDone, W, endRow - rowsDone);

                        rowsDone = endRow;

                        if (rowsDone < H) canvas._fracAnim = requestAnimationFrame(renderChunk);

                      }

                      renderChunk();

                    }



                    // Click-to-zoom

                    canvas.ondblclick = function (e) {

                      var rect = canvas.getBoundingClientRect();

                      var mx = (e.clientX - rect.left) * (W / rect.width);

                      var my = (e.clientY - rect.top) * (H / rect.height);

                      var newPanX = Math.round(((W / 2 - mx) / W) * 100 + panX);

                      var newPanY = Math.round(((H / 2 - my) / H) * 100 + panY);

                      var newZoom = Math.min(500, Math.round(zoom * 2));

                      upd('fractalPanX', newPanX); upd('fractalPanY', newPanY); upd('fractalZoom', newZoom); upd('fractalReset', Date.now());

                    };

                    // Scroll-to-zoom

                    canvas.onwheel = function (e) {

                      e.preventDefault();

                      var factor = e.deltaY < 0 ? 1.3 : 0.77;

                      var newZoom2 = Math.max(1, Math.min(500, Math.round(zoom * factor)));

                      upd('fractalZoom', newZoom2); upd('fractalReset', Date.now());

                    };

                  }

                })

              ),

              React.createElement("p", { className: "text-[10px] text-center text-slate-400 italic mt-1" }, "\uD83D\uDC46 Double-click to zoom in \u2022 Scroll-wheel to zoom in/out")

            ),

            // ═══ GRADIENT LAB TAB ═══

            tab === 'gradient' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-4 border border-rose-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-rose-700 mb-3" }, "\uD83C\uDF08 Gradient Lab"),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-rose-600 block mb-1" }, "Gradient Type"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'linear', label: '\u2194 Linear' }, { id: 'radial', label: '\u25CE Radial' }, { id: 'conic', label: '\uD83C\uDF00 Conic' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('gradType', s.id); }, className: "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all " + ((d.gradType || 'linear') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    (d.gradType || 'linear') === 'linear' && React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-rose-600 block mb-0.5" }, "Angle: " + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + '\u00B0'),

                      React.createElement("input", { type: "range", min: 0, max: 360, value: typeof d.gradAngle === 'number' ? d.gradAngle : 90, onChange: function (e) { upd('gradAngle', parseInt(e.target.value)); }, className: "w-full accent-rose-600" })

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-rose-600 block mb-1" }, "Blend Mode"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'smooth', label: 'Smooth' }, { id: 'hard', label: 'Hard Edge' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('gradBlend', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.gradBlend || 'smooth') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    // Color stops editor

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("div", { className: "flex items-center justify-between mb-1" },

                        React.createElement("label", { className: "text-[10px] font-bold text-rose-600" }, "Color Stops"),

                        React.createElement("button", { onClick: function () {

                          var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                          if (stops.length < 8) {

                            var newPos = 50;

                            stops = stops.concat([{ hue: Math.round(Math.random() * 360), pos: newPos }]);

                            stops.sort(function (a, b) { return a.pos - b.pos; });

                            upd('gradStops', stops);

                          }

                        }, className: "px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 hover:bg-rose-200" }, "+ Add Stop")

                      ),

                      (function () {

                        var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                        return stops.map(function (stop, idx) {

                          return React.createElement("div", { key: idx, className: "flex items-center gap-2 mb-1.5" },

                            React.createElement("div", { style: { width: 20, height: 20, borderRadius: 4, background: 'hsl(' + stop.hue + ',85%,55%)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 } }),

                            React.createElement("div", { className: "flex-1" },

                              React.createElement("input", { type: "range", min: 0, max: 360, value: stop.hue, onChange: function (e) {

                                var newStops = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                                newStops[idx] = Object.assign({}, newStops[idx], { hue: parseInt(e.target.value) });

                                upd('gradStops', newStops);

                              }, className: "w-full accent-rose-500", title: "Hue: " + stop.hue })

                            ),

                            React.createElement("div", { style: { width: 60, flexShrink: 0 } },

                              React.createElement("input", { type: "range", min: 0, max: 100, value: stop.pos, onChange: function (e) {

                                var newStops2 = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                                newStops2[idx] = Object.assign({}, newStops2[idx], { pos: parseInt(e.target.value) });

                                newStops2.sort(function (a, b) { return a.pos - b.pos; });

                                upd('gradStops', newStops2);

                              }, className: "w-full accent-orange-500", title: "Position: " + stop.pos + "%" })

                            ),

                            React.createElement("span", { className: "text-[9px] text-slate-400 w-8 text-right flex-shrink-0" }, stop.pos + '%'),

                            stops.length > 2 && React.createElement("button", { onClick: function () {

                              var newStops3 = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                              newStops3.splice(idx, 1);

                              upd('gradStops', newStops3);

                            }, className: "text-[10px] font-bold text-red-400 hover:text-red-600 flex-shrink-0 px-1" }, "\u00D7")

                          );

                        });

                      })()

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { var c = document.getElementById('gradientCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'gradient-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, "\uD83D\uDCE5 Export PNG")

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-rose-500 mr-1" }, "Presets:"),

                      [{ label: 'Sunset', stops: [{ hue: 270, pos: 0 }, { hue: 330, pos: 30 }, { hue: 20, pos: 60 }, { hue: 45, pos: 100 }], type: 'linear', angle: 180 },

                       { label: 'Northern Lights', stops: [{ hue: 160, pos: 0 }, { hue: 120, pos: 35 }, { hue: 180, pos: 65 }, { hue: 280, pos: 100 }], type: 'linear', angle: 0 },

                       { label: 'Vaporwave', stops: [{ hue: 300, pos: 0 }, { hue: 270, pos: 40 }, { hue: 190, pos: 70 }, { hue: 330, pos: 100 }], type: 'radial', angle: 90 },

                       { label: 'Golden Hour', stops: [{ hue: 40, pos: 0 }, { hue: 25, pos: 50 }, { hue: 10, pos: 100 }], type: 'linear', angle: 135 },

                       { label: 'Deep Space', stops: [{ hue: 260, pos: 0 }, { hue: 230, pos: 30 }, { hue: 200, pos: 60 }, { hue: 280, pos: 80 }, { hue: 0, pos: 100 }], type: 'radial', angle: 90 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('gradStops', pr.stops); upd('gradType', pr.type); upd('gradAngle', pr.angle); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  // CSS output

                  React.createElement("div", { className: "bg-slate-900 rounded-xl p-3 border border-slate-700" },

                    React.createElement("div", { className: "flex items-center justify-between mb-1" },

                      React.createElement("span", { className: "text-[10px] font-bold text-slate-400" }, "\uD83D\uDCCB CSS Output"),

                      React.createElement("button", { onClick: function () {

                        var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                        var stopsStr = stops.map(function (s) { return 'hsl(' + s.hue + ', 85%, 55%) ' + s.pos + '%'; }).join(', ');

                        var css;

                        if ((d.gradType || 'linear') === 'radial') css = 'background: radial-gradient(circle, ' + stopsStr + ');';

                        else if (d.gradType === 'conic') css = 'background: conic-gradient(from 0deg, ' + stopsStr + ');';

                        else css = 'background: linear-gradient(' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + 'deg, ' + stopsStr + ');';

                        navigator.clipboard.writeText(css).then(function () { if (typeof addToast === 'function') addToast('\u2705 CSS copied!', 'success'); });

                      }, className: "px-2 py-0.5 rounded text-[9px] font-bold bg-slate-700 text-slate-300 hover:bg-slate-600" }, "\uD83D\uDCCB Copy")

                    ),

                    React.createElement("code", { className: "text-[10px] text-green-400 font-mono leading-relaxed block whitespace-pre-wrap" }, (function () {

                      var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                      var stopsStr = stops.map(function (s) { return 'hsl(' + s.hue + ', 85%, 55%) ' + s.pos + '%'; }).join(',\n  ');

                      if ((d.gradType || 'linear') === 'radial') return 'radial-gradient(\n  circle,\n  ' + stopsStr + '\n)';

                      if (d.gradType === 'conic') return 'conic-gradient(\n  from 0deg,\n  ' + stopsStr + '\n)';

                      return 'linear-gradient(\n  ' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + 'deg,\n  ' + stopsStr + '\n)';

                    })())

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200" },

                    React.createElement("button", { onClick: function () { upd('showGradInfo', !d.showGradInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-orange-700" },

                      React.createElement("span", null, "\uD83C\uDFA8 The Science of Gradients"),

                      React.createElement("span", null, d.showGradInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showGradInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83C\uDF08 Screens create gradients by mixing ", React.createElement("strong", null, "RGB sub-pixels"), ". Each pixel blends red, green, and blue light at different intensities. A gradient smoothly interpolates these values across space."),

                      React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, "HSL interpolation"), " produces more perceptually uniform gradients than RGB. Going from red to blue in RGB passes through muddy grays; in HSL, it sweeps through vivid purples \u2014 the way a painter would mix."),

                      React.createElement("p", null, "\uD83C\uDF05 ", React.createElement("strong", null, "Real-world gradients"), " are everywhere: sunsets (Rayleigh scattering separates wavelengths), rainbows (refraction sorts light by frequency), and ocean depths (water absorbs red first, leaving deep blue)."),

                      React.createElement("p", null, "\uD83D\uDCCA ", React.createElement("strong", null, "Conic gradients"), " sweep color around a center point like a color wheel. They\u2019re used in pie charts, loading spinners, and data visualizations. CSS only added conic-gradient support in 2020!"),

                      React.createElement("p", null, "\uD83D\uDEE0 ", React.createElement("strong", null, "Designers"), " use gradients to create depth, direct attention, and evoke emotion. Warm-to-cool gradients suggest depth (atmospheric perspective); light-to-dark suggests volume (chiaroscuro).")

                    )

                  )

                ),

                React.createElement("canvas", { id: 'gradientCanvas', width: 512, height: 512, className: "rounded-xl border-2 border-rose-200 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#1e1e2e' },

                  key: 'grad-' + (d.gradType || 'linear') + '-' + (d.gradAngle || 90) + '-' + (d.gradBlend || 'smooth') + '-' + JSON.stringify(d.gradStops || []),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._gradInit) return;

                    canvas._gradInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var type = d.gradType || 'linear';

                    var angle = typeof d.gradAngle === 'number' ? d.gradAngle : 90;

                    var blend = d.gradBlend || 'smooth';

                    var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];



                    if (blend === 'hard') {

                      // Hard-edge gradient — fill bands

                      if (type === 'linear') {

                        var rad = angle * Math.PI / 180;

                        var cos = Math.cos(rad), sin = Math.sin(rad);

                        for (var py = 0; py < H; py++) {

                          for (var px = 0; px < W; px++) {

                            var t = ((px - W / 2) * cos + (py - H / 2) * sin) / (Math.max(W, H) * 0.5) * 0.5 + 0.5;

                            t = Math.max(0, Math.min(1, t));

                            var pos = t * 100;

                            var stopIdx = 0;

                            for (var si = 0; si < stops.length - 1; si++) {

                              if (pos >= stops[si].pos) stopIdx = si;

                            }

                            ctx.fillStyle = 'hsl(' + stops[stopIdx].hue + ',85%,55%)';

                            ctx.fillRect(px, py, 1, 1);

                          }

                        }

                      } else if (type === 'conic') {

                        var cx2 = W / 2, cy2 = H / 2;

                        for (var py2 = 0; py2 < H; py2++) {

                          for (var px2 = 0; px2 < W; px2++) {

                            var ang = (Math.atan2(py2 - cy2, px2 - cx2) * 180 / Math.PI + 360 + 90) % 360;

                            var pos2 = ang / 360 * 100;

                            var si2 = 0;

                            for (var k = 0; k < stops.length - 1; k++) { if (pos2 >= stops[k].pos) si2 = k; }

                            ctx.fillStyle = 'hsl(' + stops[si2].hue + ',85%,55%)';

                            ctx.fillRect(px2, py2, 1, 1);

                          }

                        }

                      } else {

                        var cx3 = W / 2, cy3 = H / 2;

                        var maxR = Math.sqrt(cx3 * cx3 + cy3 * cy3);

                        for (var py3 = 0; py3 < H; py3++) {

                          for (var px3 = 0; px3 < W; px3++) {

                            var dist = Math.sqrt((px3 - cx3) * (px3 - cx3) + (py3 - cy3) * (py3 - cy3));

                            var pos3 = (dist / maxR) * 100;

                            var si3 = 0;

                            for (var k2 = 0; k2 < stops.length - 1; k2++) { if (pos3 >= stops[k2].pos) si3 = k2; }

                            ctx.fillStyle = 'hsl(' + stops[si3].hue + ',85%,55%)';

                            ctx.fillRect(px3, py3, 1, 1);

                          }

                        }

                      }

                    } else {

                      // Smooth gradient using Canvas API

                      if (type === 'linear') {

                        var rad2 = angle * Math.PI / 180;

                        var len = Math.max(W, H);

                        var x1 = W / 2 - Math.cos(rad2) * len / 2;

                        var y1 = H / 2 - Math.sin(rad2) * len / 2;

                        var x2 = W / 2 + Math.cos(rad2) * len / 2;

                        var y2 = H / 2 + Math.sin(rad2) * len / 2;

                        var grad = ctx.createLinearGradient(x1, y1, x2, y2);

                        stops.forEach(function (s) { grad.addColorStop(Math.max(0, Math.min(1, s.pos / 100)), 'hsl(' + s.hue + ',85%,55%)'); });

                        ctx.fillStyle = grad;

                        ctx.fillRect(0, 0, W, H);

                      } else if (type === 'radial') {

                        var grad2 = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);

                        stops.forEach(function (s) { grad2.addColorStop(Math.max(0, Math.min(1, s.pos / 100)), 'hsl(' + s.hue + ',85%,55%)'); });

                        ctx.fillStyle = grad2;

                        ctx.fillRect(0, 0, W, H);

                      } else {

                        // Conic — render pixel-by-pixel for smooth interpolation

                        var cx4 = W / 2, cy4 = H / 2;

                        var imgData = ctx.createImageData(W, H);

                        var pxData = imgData.data;

                        function hslToRgb(h, s, l) {

                          h = h / 360; s = s / 100; l = l / 100;

                          var r3, g3, b3;

                          if (s === 0) { r3 = g3 = b3 = l; } else {

                            var hue2rgb = function (p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };

                            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;

                            var p = 2 * l - q;

                            r3 = hue2rgb(p, q, h + 1/3); g3 = hue2rgb(p, q, h); b3 = hue2rgb(p, q, h - 1/3);

                          }

                          return [Math.round(r3 * 255), Math.round(g3 * 255), Math.round(b3 * 255)];

                        }

                        for (var py4 = 0; py4 < H; py4++) {

                          for (var px4 = 0; px4 < W; px4++) {

                            var ang2 = (Math.atan2(py4 - cy4, px4 - cx4) * 180 / Math.PI + 360 + 90) % 360;

                            var pos4 = ang2 / 360 * 100;

                            // Interpolate between stops

                            var s1 = stops[0], s2 = stops[stops.length - 1];

                            for (var k3 = 0; k3 < stops.length - 1; k3++) {

                              if (pos4 >= stops[k3].pos && pos4 <= stops[k3 + 1].pos) { s1 = stops[k3]; s2 = stops[k3 + 1]; break; }

                            }

                            var range = s2.pos - s1.pos || 1;

                            var t4 = (pos4 - s1.pos) / range;

                            var h1 = s1.hue, h2 = s2.hue;

                            var hDiff = h2 - h1; if (Math.abs(hDiff) > 180) { if (hDiff > 0) h1 += 360; else h2 += 360; }

                            var interpH = ((h1 + (h2 - h1) * t4) + 360) % 360;

                            var rgb = hslToRgb(interpH, 85, 55);

                            var idx = (py4 * W + px4) * 4;

                            pxData[idx] = rgb[0]; pxData[idx + 1] = rgb[1]; pxData[idx + 2] = rgb[2]; pxData[idx + 3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0);

                      }

                    }



                    // Decorative border glow

                    ctx.save();

                    ctx.globalCompositeOperation = 'destination-over';

                    ctx.fillStyle = '#1e1e2e';

                    ctx.fillRect(0, 0, W, H);

                    ctx.restore();

                  }

                })

              )

            ),





            // ═══ STEREOGRAM GENERATOR TAB ═══

            tab === 'stereogram' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 mb-2" },

                React.createElement("button", { onClick: function() { _stopStereoAnim(); upd('stereoAnimMode', 'static'); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.stereoAnimMode || 'static') === 'static' ? 'bg-white shadow-md text-cyan-700' : 'text-slate-500 hover:text-slate-700') }, "\uD83D\uDCF8 Static"),

                React.createElement("button", { onClick: function() { upd('stereoAnimMode', 'animate'); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.stereoAnimMode || 'static') === 'animate' ? 'bg-white shadow-md text-purple-700' : 'text-slate-500 hover:text-slate-700') }, "\uD83C\uDFAC Animate")

              ),

              (d.stereoAnimMode || 'static') === 'static' &&

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-cyan-700 mb-3" }, "\uD83D\uDC53 Stereogram Generator"),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-cyan-600 block mb-1" }, "Depth Brush"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'near', label: '\u2B1C Near' }, { id: 'mid', label: '\uD83D\uDD18 Mid' }, { id: 'far', label: '\u2B1B Far' }, { id: 'erase', label: '\uD83E\uDDFD Erase' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('stereoDepth', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoDepth || 'near') === s.id ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-cyan-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-cyan-600 block mb-0.5" }, "Brush Size: " + (typeof d.stereoBrush === 'number' ? d.stereoBrush : 20)),

                      React.createElement("input", { type: "range", min: 5, max: 60, value: typeof d.stereoBrush === 'number' ? d.stereoBrush : 20, onChange: function (e) { upd('stereoBrush', parseInt(e.target.value)); }, className: "w-full accent-cyan-600" })

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-cyan-600 block mb-1" }, "Pattern Type"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'bw', label: '\u26AB B&W' }, { id: 'color', label: '\uD83C\uDFA8 Color' }, { id: 'noise', label: '\uD83D\uDCFA Noise' }, { id: 'ai', label: '\u2728 AI' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('stereoPattern', s.id); if(s.id === 'ai' && !d.stereoAiPatternImg) { if(typeof addToast === 'function') addToast('Please generate an AI Pattern first!', 'warning'); } }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoPattern || 'bw') === s.id ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-cyan-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'stereoStrength', label: 'Depth Strength', min: 5, max: 30, def: 15 },

                     { k: 'stereoDensity', label: 'Pattern Width', min: 60, max: 150, def: 100 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-cyan-600 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-cyan-600" })

                      );

                    }),

                    

                    // --- AI GENERATION ---

                    callImagen && React.createElement("div", { className: "mt-4 bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-200" },

                      React.createElement("div", { className: "flex justify-between items-center mb-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-indigo-700" }, "\u2728 AI Stereogram Creator"),

                        d.stereoAiGen && React.createElement("span", { className: "text-[9px] text-indigo-500 animate-pulse font-bold" }, "Generating " + d.stereoAiGen + "...")

                      ),

                      React.createElement("textarea", { 

                        value: d.stereoAiStr || '', 

                        onChange: function(e) { upd('stereoAiStr', e.target.value); },

                        placeholder: "Describe an object for a depth map or a texture for a pattern...",

                        className: "w-full text-xs p-2 rounded border border-indigo-200 focus:ring-2 focus:ring-indigo-400 mb-2 h-16 resize-none",

                        disabled: !!d.stereoAiGen

                      }),

                      React.createElement("div", { className: "flex gap-2" },

                        React.createElement("button", { 

                          onClick: function() {

                            if (!d.stereoAiStr) return;

                            upd('stereoAiGen', 'Depth Map');

                            callImagen('A smooth, high-quality, continuous 3D grayscale depth map of: ' + d.stereoAiStr + '. The closest parts must be pure white, and the furthest background pure black. No text, no floating artifacts. Fill the entire square frame.', 400)

                              .then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  var cvs = document.getElementById('depthMapCanvas');

                                  if(cvs) {

                                    var ztx = cvs.getContext('2d');

                                    ztx.clearRect(0, 0, cvs.width, cvs.height);

                                    ztx.drawImage(img, 0, 0, cvs.width, cvs.height);

                                  }

                                  upd('stereoAiGen', null);

                                  if(typeof addToast === 'function') addToast('\u2728 Depth map generated!', 'success');

                                };

                                img.src = base64;

                              }).catch(function(e) {

                                upd('stereoAiGen', null);

                                if(typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                              });

                          },

                          disabled: !!d.stereoAiGen || !d.stereoAiStr,

                          className: "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"

                        }, "\u2B1C Generate Depth Map"),

                        React.createElement("button", { 

                          onClick: function() {

                            if (!d.stereoAiStr) return;

                            upd('stereoAiGen', 'Pattern');

                            callImagen('A beautiful, abstract, seamless repeating pattern tile texture of: ' + d.stereoAiStr + '. No text, no borders.', 100)

                              .then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  // Store in state to use during render logic

                                  var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;

                                  c.getContext('2d').drawImage(img, 0, 0);

                                  upd('stereoAiPatternImg', { width: img.width, height: img.height, data: c.getContext('2d').getImageData(0,0,img.width,img.height).data });

                                  upd('stereoAiGen', null);

                                  upd('stereoPattern', 'ai');

                                  if(typeof addToast === 'function') addToast('\u2728 AI Pattern loaded and selected!', 'success');

                                };

                                img.src = base64;

                              }).catch(function(e) {

                                upd('stereoAiGen', null);

                                if(typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                              });

                          },

                          disabled: !!d.stereoAiGen || !d.stereoAiStr,

                          className: "flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"

                        }, "\uD83C\uDFA8 Generate AI Base Tile")

                      )

                    ),

                    

                    React.createElement("div", { className: "flex gap-2 mt-4" },

                      React.createElement("button", { onClick: function () { upd('stereoGen', Date.now()); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:from-cyan-600 hover:to-teal-600 shadow-md transition-all" }, "\uD83D\uDC53 Render Stereogram"),

                      React.createElement("button", { onClick: function () { upd('stereoClear', Date.now()); upd('stereoPreset', null); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\uD83D\uDDD1 Clear")

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap" },

                      React.createElement("span", { className: "text-[10px] font-bold text-cyan-500 mr-1" }, "Presets:"),

                      [{ label: 'Sphere', id: 'sphere' }, { label: 'Pyramid', id: 'pyramid' }, { label: 'Heart', id: 'heart' }, { label: 'HI Text', id: 'text' }, { label: 'Rings', id: 'rings' }].map(function (pr) {

                        return React.createElement("button", { key: pr.id, onClick: function () { upd('stereoPreset', pr.id); upd('stereoClear', Date.now()); setTimeout(function () { upd('stereoGen', Date.now()); }, 150); }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white text-cyan-600 border border-cyan-200 hover:bg-cyan-50 transition-all" }, pr.label);

                      })

                    ),

                    React.createElement("button", { onClick: function () { var c = document.getElementById('stereoCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'stereogram-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "w-full mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, "\uD83D\uDCE5 Export Stereogram")

                  ),

                  React.createElement("div", null,

                    React.createElement("p", { className: "text-[10px] font-bold text-cyan-600 mb-1" }, "\uD83C\uDFA8 Depth Map Canvas"),

                    React.createElement("p", { className: "text-[10px] text-slate-400 mb-1" }, "White = pops out \u2022 Gray = middle \u2022 Black = far"),

                    React.createElement("canvas", { id: 'depthMapCanvas', width: 400, height: 400,

                      key: 'dm-' + (d.stereoClear || 0),

                      className: "rounded-xl border-2 border-cyan-200 shadow-lg cursor-crosshair block", style: { maxWidth: '100%', background: '#000000' },

                      ref: function (canvas) {

                        if (!canvas) return;

                        var ctx = canvas.getContext('2d');

                        var W = canvas.width, H = canvas.height;

                        if (!canvas._dmInit) {

                          canvas._dmInit = true;

                          ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

                          var preset = d.stereoPreset;

                          if (preset === 'sphere') {

                            var grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H)*0.35);

                            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#888888'); grad.addColorStop(1, '#000000');

                            ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W,H)*0.35, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

                          } else if (preset === 'pyramid') {

                            ctx.beginPath(); ctx.moveTo(W/2, H*0.15); ctx.lineTo(W*0.2, H*0.85); ctx.lineTo(W*0.8, H*0.85); ctx.closePath();

                            var pgr = ctx.createLinearGradient(W/2, H*0.15, W/2, H*0.85);

                            pgr.addColorStop(0, '#ffffff'); pgr.addColorStop(1, '#555555'); ctx.fillStyle = pgr; ctx.fill();

                          } else if (preset === 'heart') {

                            ctx.save(); ctx.translate(W/2, H*0.45);

                            var sc = Math.min(W,H) * 0.012; ctx.scale(sc, -sc);

                            ctx.beginPath();

                            for (var ht = 0; ht <= Math.PI * 2; ht += 0.01) {

                              var hx = 16 * Math.pow(Math.sin(ht), 3);

                              var hy = 13 * Math.cos(ht) - 5 * Math.cos(2*ht) - 2 * Math.cos(3*ht) - Math.cos(4*ht);

                              if (ht === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);

                            }

                            ctx.closePath(); ctx.restore(); ctx.fillStyle = '#ffffff'; ctx.fill();

                          } else if (preset === 'text') {

                            ctx.fillStyle = '#ffffff'; ctx.font = 'bold ' + Math.round(H * 0.45) + 'px Arial';

                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HI', W/2, H/2);

                          } else if (preset === 'rings') {

                            for (var ri = 3; ri > 0; ri--) {

                              var rr = ri * Math.min(W,H) * 0.12;

                              var brt = Math.round((4 - ri) / 3 * 255);

                              ctx.beginPath(); ctx.arc(W/2, H/2, rr, 0, Math.PI*2);

                              ctx.lineWidth = 20; ctx.strokeStyle = 'rgb(' + brt + ',' + brt + ',' + brt + ')'; ctx.stroke();

                            }

                          }

                        }

                        var depthLevel = d.stereoDepth || 'near';

                        var brushSz = typeof d.stereoBrush === 'number' ? d.stereoBrush : 20;

                        var depthColors = { near: '#ffffff', mid: '#999999', far: '#333333', erase: '#000000' };

                        var painting = false;

                        function getP(e) {

                          var rect = canvas.getBoundingClientRect();

                          var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                          var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                          return { x: ex * (W / rect.width), y: ey * (H / rect.height) };

                        }

                        function doBrush(pos) {

                          ctx.beginPath(); ctx.arc(pos.x, pos.y, brushSz, 0, Math.PI * 2);

                          ctx.fillStyle = depthColors[depthLevel]; ctx.fill();

                        }

                        canvas.onmousedown = canvas.ontouchstart = function (e) { e.preventDefault(); painting = true; doBrush(getP(e)); };

                        canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) doBrush(getP(e)); };

                        canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

                        canvas.onmouseleave = function () { painting = false; };

                      }

                    })

                  ),

                  React.createElement("div", { className: "flex gap-2 mt-2" },

                    React.createElement("button", { onClick: function () { var c = document.getElementById('depthMapCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'depth-map-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Depth map saved as PNG!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition-all" }, "\u2B07\uFE0F Save Depth Map PNG")

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-200" },

                    React.createElement("button", { onClick: function () { upd('showStereoInfo', !d.showStereoInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-teal-700" },

                      React.createElement("span", null, "\uD83E\uDDE0 The Science of Stereograms"),

                      React.createElement("span", null, d.showStereoInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showStereoInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDC40 ", React.createElement("strong", null, "Your eyes are ~6 cm apart"), ", so each sees the world from a slightly different angle. Your brain fuses these two views to perceive ", React.createElement("strong", null, "depth"), " \u2014 this is called ", React.createElement("strong", null, "stereopsis"), "."),

                      React.createElement("p", null, "\uD83D\uDC53 ", React.createElement("strong", null, "Autostereograms"), " (Magic Eye\u2122 images) hide 3D shapes in a repeating pattern. The trick: where the hidden object is \u2018close,\u2019 the pattern repeats with a ", React.createElement("strong", null, "shorter period"), "; where it\u2019s \u2018far,\u2019 the period is longer. Your brain decodes these period differences as depth."),

                      React.createElement("p", null, "\uD83D\uDCDA ", React.createElement("strong", null, "Magic Eye books"), " (1993\u201394) by Tom Baccei and Cheri Smith sold over 25 million copies worldwide. The underlying autostereogram technique was pioneered by Dr. Christopher Tyler in 1979."),

                      React.createElement("p", null, "\uD83E\uDDE0 To see the image: hold your face close to the screen, relax your eyes as if looking \u2018through\u2019 the image at a distant wall, then slowly pull back. The 3D shape will \u2018pop\u2019 into view. This is called ", React.createElement("strong", null, "wall-eyed (parallel) viewing"), "."),

                      React.createElement("p", null, "\u26A0 About ", React.createElement("strong", null, "5\u201310% of people"), " have difficulty seeing stereograms due to conditions like amblyopia (lazy eye), strabismus (crossed eyes), or other binocular vision differences. This is completely normal!")

                    )

                  )

                ),

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "text-xs font-bold text-teal-700" }, "\uD83D\uDC53 Stereogram Output"),

                  React.createElement("p", { className: "text-[10px] text-slate-400 mb-1" }, "Relax your eyes and look \u2018through\u2019 the image to see 3D"),

                  React.createElement("canvas", { id: 'stereoCanvas', width: 512, height: 512,

                    key: 'stereo-' + (d.stereoGen || 0),

                    className: "rounded-xl border-2 border-teal-200 shadow-lg block", style: { maxWidth: '100%', background: '#111' },

                    ref: function (canvas) {

                      if (!canvas) return;

                      if (canvas._stereoInit) return;

                      canvas._stereoInit = true;

                      var ctx = canvas.getContext('2d');

                      var W = canvas.width, H = canvas.height;

                      var patternType = d.stereoPattern || 'bw';

                      var patternWidth = typeof d.stereoDensity === 'number' ? d.stereoDensity : 100;

                      var maxShift = typeof d.stereoStrength === 'number' ? d.stereoStrength : 15;

                      var dmCanvas = document.getElementById('depthMapCanvas');

                      if (!dmCanvas) {

                        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);

                        ctx.fillStyle = '#444'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

                        ctx.fillText('Draw on the depth map, then click Generate', W/2, H/2);

                        return;

                      }

                      var dmCtx = dmCanvas.getContext('2d');

                      var dmData = dmCtx.getImageData(0, 0, dmCanvas.width, dmCanvas.height).data;

                      var dmW = dmCanvas.width, dmH = dmCanvas.height;

                      function makeRng(seed) {

                        var s = seed; return function () { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; };

                      }

                      var imgData = ctx.createImageData(W, H);

                      var data = imgData.data;

                      var rowsDone = 0;

                      function renderChunk() {

                        var endRow = Math.min(rowsDone + 32, H);

                        for (var y = rowsDone; y < endRow; y++) {

                          var rng = makeRng(y * 7919 + 12345);

                          var row = new Uint8Array(W * 3);

                          for (var x = 0; x < W; x++) {

                            if (x < patternWidth) {

                              if (patternType === 'bw') { var c = rng() > 0.5 ? 230 : 25; row[x*3] = c; row[x*3+1] = c; row[x*3+2] = c; }

                              else if (patternType === 'color') { row[x*3] = Math.floor(rng()*200)+55; row[x*3+1] = Math.floor(rng()*200)+55; row[x*3+2] = Math.floor(rng()*200)+55; }

                              else if (patternType === 'ai' && d.stereoAiPatternImg) {

                                var pw = d.stereoAiPatternImg.width, ph = d.stereoAiPatternImg.height;

                                var pIdx = ((y % ph) * pw + (x % pw)) * 4;

                                row[x*3] = d.stereoAiPatternImg.data[pIdx]; row[x*3+1] = d.stereoAiPatternImg.data[pIdx+1]; row[x*3+2] = d.stereoAiPatternImg.data[pIdx+2];

                              }

                              else { var v = Math.floor(rng() * 220) + 20; row[x*3] = v; row[x*3+1] = v; row[x*3+2] = v; }

                            } else {

                              var dx = Math.floor(x * dmW / W), dy = Math.floor(y * dmH / H);

                              var di = (dy * dmW + dx) * 4;

                              var depth = dmData[di] / 255;

                              var shift = Math.round(depth * maxShift);

                              var srcX = x - patternWidth + shift;

                              if (srcX >= 0) { row[x*3] = row[srcX*3]; row[x*3+1] = row[srcX*3+1]; row[x*3+2] = row[srcX*3+2]; }

                              else {

                                if (patternType === 'bw') { var c2 = rng() > 0.5 ? 230 : 25; row[x*3] = c2; row[x*3+1] = c2; row[x*3+2] = c2; }

                                else if (patternType === 'color') { row[x*3] = Math.floor(rng()*200)+55; row[x*3+1] = Math.floor(rng()*200)+55; row[x*3+2] = Math.floor(rng()*200)+55; }

                                else if (patternType === 'ai' && d.stereoAiPatternImg) {

                                  var pw2 = d.stereoAiPatternImg.width, ph2 = d.stereoAiPatternImg.height;

                                  var pIdx2 = ((y % ph2) * pw2 + (x % pw2)) * 4;

                                  row[x*3] = d.stereoAiPatternImg.data[pIdx2]; row[x*3+1] = d.stereoAiPatternImg.data[pIdx2+1]; row[x*3+2] = d.stereoAiPatternImg.data[pIdx2+2];

                                }

                                else { var v2 = Math.floor(rng()*220)+20; row[x*3] = v2; row[x*3+1] = v2; row[x*3+2] = v2; }

                              }

                            }

                          }

                          for (var x2 = 0; x2 < W; x2++) {

                            var idx = (y * W + x2) * 4;

                            data[idx] = row[x2*3]; data[idx+1] = row[x2*3+1]; data[idx+2] = row[x2*3+2]; data[idx+3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0, 0, rowsDone, W, endRow - rowsDone);

                        rowsDone = endRow;

                        if (rowsDone < H) canvas._stereoAnim = requestAnimationFrame(renderChunk);

                      }

                      renderChunk();

                    }

                  }),

                  React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2" },

                    React.createElement("p", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "\uD83D\uDCA1 How to View"),

                    React.createElement("ol", { className: "text-[10px] text-slate-600 leading-relaxed list-decimal ml-4 space-y-0.5" },

                      React.createElement("li", null, "Hold your face close to the screen"),

                      React.createElement("li", null, "Relax your eyes \u2014 try to look \u2018through\u2019 the image at a wall behind it"),

                      React.createElement("li", null, "Slowly move back. A 3D shape will emerge!"),

                      React.createElement("li", null, "Tip: the two guide dots above should appear as three when your eyes are set correctly")

                    )

                  )

                )

              )

            ),

              (d.stereoAnimMode || 'static') === 'animate' && React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-purple-700 mb-3" }, "\uD83C\uDFAC Animated Stereogram Studio"),

                  React.createElement("p", { className: "text-[10px] text-slate-500 mb-3" }, "Create animated 3D stereograms from presets, custom drawings, uploaded images, transforms, or AI-generated depth maps!"),



                  // ═══ SOURCE MODE SELECTOR ═══

                  React.createElement("div", { className: "mb-3" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-1" }, "\uD83D\uDCE1 Animation Source"),

                    React.createElement("div", { className: "grid grid-cols-5 gap-1" },

                      [{ id: 'preset', icon: '\u2728', label: 'Preset' }, { id: 'draw', icon: '\u270F\uFE0F', label: 'Draw' }, { id: 'upload', icon: '\uD83D\uDCC2', label: 'Upload' }, { id: 'transform', icon: '\uD83D\uDD04', label: 'Transform' }, { id: 'ai', icon: '\uD83E\uDD16', label: 'AI Depth' }].map(function(s) {

                        return React.createElement("button", { key: s.id, onClick: function() { upd('stereoAnimSource', s.id); },

                          className: "px-2 py-2 rounded-lg text-[10px] font-bold transition-all text-center " + ((d.stereoAnimSource || 'preset') === s.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50')

                        }, s.icon + ' ' + s.label);

                      })

                    )

                  ),



                  // ═══ PRESET SOURCE (existing behavior) ═══

                  (d.stereoAnimSource || 'preset') === 'preset' && React.createElement("div", { className: "mb-3" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-1" }, "\u2728 Animation Presets"),

                    React.createElement("div", { className: "grid grid-cols-5 gap-1" },

                      [{ id: 'pulseSphere', icon: '\uD83D\uDCAB', label: 'Pulse' }, { id: 'spinCube', icon: '\uD83D\uDD04', label: 'Spin Cube' }, { id: 'waveRipple', icon: '\uD83C\uDF0A', label: 'Wave' }, { id: 'morphHeart', icon: '\uD83D\uDC93', label: 'Heart' }, { id: 'floatText', icon: '\u2702\uFE0F', label: '3D Text' }].map(function(p) {

                        return React.createElement("button", { key: p.id, onClick: function() { upd('stereoAnimPreset', p.id); },

                          className: "px-2 py-2 rounded-lg text-[10px] font-bold transition-all text-center " + (d.stereoAnimPreset === p.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50')

                        }, p.icon + ' ' + p.label);

                      })

                    )

                  ),



                  // ═══ CUSTOM DRAW SOURCE ═══

                  (d.stereoAnimSource) === 'draw' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block" }, "\u270F\uFE0F Draw Depth Keyframes"),

                    React.createElement("p", { className: "text-[10px] text-slate-400" }, "Draw a depth map, capture it as a keyframe, then draw the next. The animation will interpolate between them."),

                    React.createElement("div", { className: "flex gap-1 mb-2" },

                      [{ id: 'near', label: '\u2B1C Near', c: '#ffffff' }, { id: 'mid', label: '\uD83D\uDD18 Mid', c: '#888888' }, { id: 'far', label: '\u2B1B Far', c: '#222222' }, { id: 'erase', label: '\uD83E\uDDFD Erase', c: '#000000' }].map(function(s2) {

                        return React.createElement("button", { key: s2.id, onClick: function() { upd('stereoAnimDrawBrush', s2.id); },

                          className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoAnimDrawBrush || 'near') === s2.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50') }, s2.label);

                      })

                    ),

                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                      React.createElement("label", { className: "text-[10px] font-bold text-purple-600" }, "Brush: " + (d.stereoAnimDrawSize || 20)),

                      React.createElement("input", { type: "range", min: 5, max: 60, value: d.stereoAnimDrawSize || 20, onChange: function(e) { upd('stereoAnimDrawSize', parseInt(e.target.value)); }, className: "flex-1 accent-purple-600" })

                    ),

                    React.createElement("canvas", { id: 'stereoAnimDrawCanvas', width: 400, height: 400,

                      key: 'anim-draw-' + (d.stereoAnimDrawClear || 0),

                      className: "rounded-xl border-2 border-purple-200 shadow-lg cursor-crosshair block mx-auto", style: { maxWidth: '100%', background: '#000' },

                      ref: function(canvas) {

                        if (!canvas) return;

                        if (canvas._drawInit) return;

                        canvas._drawInit = true;

                        var ctx = canvas.getContext('2d');

                        var W = canvas.width, H = canvas.height;

                        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

                        var drawing = false;

                        function getColor() {

                          var b = d.stereoAnimDrawBrush || 'near';

                          if (b === 'near') return '#ffffff';

                          if (b === 'mid') return '#888888';

                          if (b === 'far') return '#222222';

                          return '#000000';

                        }

                        function paint(e, isStart) {

                          var rect = canvas.getBoundingClientRect();

                          var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                          var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                          var sx = ex * (W / rect.width), sy = ey * (H / rect.height);

                          var size = d.stereoAnimDrawSize || 20;

                          ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2);

                          ctx.fillStyle = getColor(); ctx.fill();

                        }

                        canvas.onmousedown = canvas.ontouchstart = function(e) { e.preventDefault(); drawing = true; paint(e, true); };

                        canvas.onmousemove = canvas.ontouchmove = function(e) { if (drawing) { e.preventDefault(); paint(e, false); } };

                        canvas.onmouseup = canvas.ontouchend = function() { drawing = false; };

                        canvas.onmouseleave = function() { drawing = false; };

                      }

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-2" },

                      React.createElement("button", { onClick: function() {

                        var c = document.getElementById('stereoAnimDrawCanvas');

                        if (!c) return;

                        var imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height);

                        var kf = d.stereoAnimKeyframes ? d.stereoAnimKeyframes.slice() : [];

                        kf.push({ width: c.width, height: c.height, data: Array.from(imgData.data) });

                        upd('stereoAnimKeyframes', kf);

                        if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Keyframe ' + kf.length + ' captured!', 'success');

                      }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-sm" }, "\uD83D\uDCF8 Capture Keyframe"),

                      React.createElement("button", { onClick: function() {

                        var c = document.getElementById('stereoAnimDrawCanvas');

                        if (c) { var ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); }

                      }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" }, "\uD83D\uDDD1 Clear Canvas"),

                      React.createElement("button", { onClick: function() { upd('stereoAnimKeyframes', []); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, "\u274C Clear All Frames"),

                      React.createElement("button", { onClick: function() { var c = document.getElementById('stereoAnimDrawCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'depth-drawing-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Drawing saved as PNG!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition-all" }, "\u2B07\uFE0F Save Drawing PNG"),

                      (d.stereoAnimKeyframes && d.stereoAnimKeyframes.length >= 2) && React.createElement("button", { onClick: function() {

                        var kfs = d.stereoAnimKeyframes;

                        if (!kfs || kfs.length < 2) { if (typeof addToast === 'function') addToast('Need at least 2 keyframes for GIF!', 'warning'); return; }

                        if (typeof addToast === 'function') addToast('\u23F3 Building depth map GIF...', 'info');

                        var totalFrames = 24;

                        var canvasFrames = [];

                        var tempCanvas = document.createElement('canvas'); tempCanvas.width = kfs[0].width; tempCanvas.height = kfs[0].height;

                        var tempCtx = tempCanvas.getContext('2d');

                        for (var fi = 0; fi < totalFrames; fi++) {

                          var interpData = _interpolateDepthMaps(

                            kfs.map(function(kf) { var id = tempCtx.createImageData(kf.width, kf.height); for (var p = 0; p < kf.data.length; p++) id.data[p] = kf.data[p]; return id; }),

                            fi, totalFrames

                          );

                          tempCtx.putImageData(interpData, 0, 0);

                          canvasFrames.push(tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height));

                        }

                        _exportStereoGif(canvasFrames, 8);

                      }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200 hover:from-emerald-100 hover:to-teal-100 transition-all" }, "\uD83C\uDFAC Export Depth GIF")

                    ),

                    (d.stereoAnimKeyframes && d.stereoAnimKeyframes.length > 0) && React.createElement("div", { className: "mt-2" },

                      React.createElement("p", { className: "text-[10px] font-bold text-purple-600 mb-1" }, "\uD83C\uDFAC Keyframes: " + d.stereoAnimKeyframes.length),

                      React.createElement("div", { className: "flex gap-1 flex-wrap" },

                        d.stereoAnimKeyframes.map(function(kf, idx) {

                          return React.createElement("div", { key: idx, className: "relative" },

                            React.createElement("canvas", { width: 60, height: 60, className: "rounded border border-purple-200", ref: function(c) {

                              if (!c) return;

                              var ctx = c.getContext('2d');

                              var imgData = ctx.createImageData(kf.width, kf.height);

                              for (var i = 0; i < kf.data.length; i++) imgData.data[i] = kf.data[i];

                              var temp = document.createElement('canvas'); temp.width = kf.width; temp.height = kf.height;

                              temp.getContext('2d').putImageData(imgData, 0, 0);

                              ctx.drawImage(temp, 0, 0, 60, 60);

                            } }),

                            React.createElement("button", { onClick: function() {

                              var kfs = d.stereoAnimKeyframes.slice(); kfs.splice(idx, 1); upd('stereoAnimKeyframes', kfs);

                            }, className: "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center hover:bg-red-600", style: { lineHeight: '1' } }, "\u00D7")

                          );

                        })

                      )

                    )

                  ),



                  // ═══ UPLOAD IMAGE SOURCE ═══

                  (d.stereoAnimSource) === 'upload' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block" }, "\uD83D\uDCC2 Upload Depth Map Image"),

                    React.createElement("p", { className: "text-[10px] text-slate-400" }, "Upload a grayscale image (white = near, black = far). It will be animated using the selected transform."),

                    React.createElement("input", { type: "file", accept: "image/png,image/jpeg,image/webp",

                      className: "text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200",

                      onChange: function(e) {

                        var file = e.target.files && e.target.files[0];

                        if (!file) return;

                        var reader = new FileReader();

                        reader.onload = function(ev) {

                          var img = new Image();

                          img.onload = function() {

                            var c = document.createElement('canvas'); c.width = 400; c.height = 400;

                            var ctx = c.getContext('2d');

                            ctx.drawImage(img, 0, 0, 400, 400);

                            var imgData = ctx.getImageData(0, 0, 400, 400);

                            upd('stereoAnimUploadedDepth', { width: 400, height: 400, data: Array.from(imgData.data) });

                            if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Depth map uploaded!', 'success');

                          };

                          img.src = ev.target.result;

                        };

                        reader.readAsDataURL(file);

                      }

                    }),

                    d.stereoAnimUploadedDepth && React.createElement("div", { className: "mt-2 flex items-center gap-2" },

                      React.createElement("canvas", { width: 80, height: 80, className: "rounded border border-purple-200", ref: function(c) {

                        if (!c || !d.stereoAnimUploadedDepth) return;

                        var ctx = c.getContext('2d');

                        var ud = d.stereoAnimUploadedDepth;

                        var imgData = ctx.createImageData(ud.width, ud.height);

                        for (var i = 0; i < ud.data.length; i++) imgData.data[i] = ud.data[i];

                        var temp = document.createElement('canvas'); temp.width = ud.width; temp.height = ud.height;

                        temp.getContext('2d').putImageData(imgData, 0, 0);

                        ctx.drawImage(temp, 0, 0, 80, 80);

                      } }),

                      React.createElement("span", { className: "text-[10px] text-green-600 font-bold" }, "\u2705 Depth map loaded (400\u00D7400)")

                    ),

                    React.createElement("div", { className: "mt-2" },

                      React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-1" }, "\uD83D\uDD04 Transform Type"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'zoom', label: '\uD83D\uDD0D Zoom' }, { id: 'rotate', label: '\uD83D\uDD04 Rotate' }, { id: 'bounce', label: '\u26A1 Bounce' }, { id: 'slide', label: '\u21C6 Slide' }].map(function(t) {

                          return React.createElement("button", { key: t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                            className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50') }, t.label);

                        })

                      )

                    )

                  ),



                  // ═══ TRANSFORM SOURCE (uses static depth map) ═══

                  (d.stereoAnimSource) === 'transform' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block" }, "\uD83D\uDD04 Transform Depth Map"),

                    React.createElement("p", { className: "text-[10px] text-slate-400" }, "Animates the depth map from the Static tab using a chosen transform effect. Switch to Static mode first to draw your depth map."),

                    React.createElement("div", { className: "mt-2" },

                      React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-1" }, "\uD83D\uDD04 Transform Type"),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'zoom', label: '\uD83D\uDD0D Zoom' }, { id: 'rotate', label: '\uD83D\uDD04 Rotate' }, { id: 'bounce', label: '\u26A1 Bounce' }, { id: 'slide', label: '\u21C6 Slide' }].map(function(t) {

                          return React.createElement("button", { key: t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                            className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50') }, t.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200" },

                      React.createElement("p", { className: "text-[10px] text-amber-700" }, "\uD83D\uDCA1 Tip: Draw a depth map in the Static tab first, then come back here to animate it with a transform.")

                    )

                  ),



                  // ═══ AI DEPTH SOURCE ═══

                  (d.stereoAnimSource) === 'ai' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block" }, "\uD83E\uDD16 AI-Generated Depth Map"),

                    React.createElement("p", { className: "text-[10px] text-slate-400" }, "Describe a 3D scene and AI will generate a depth map, then animate it with a transform."),

                    callImagen ? React.createElement("div", null,

                      React.createElement("textarea", {

                        value: d.stereoAnimAiPrompt || '',

                        onChange: function(e) { upd('stereoAnimAiPrompt', e.target.value); },

                        placeholder: "e.g. A glowing crystal orb floating in space...",

                        className: "w-full text-xs p-2 rounded border border-purple-200 focus:ring-2 focus:ring-purple-400 mb-2 h-16 resize-none",

                        disabled: !!d.stereoAnimAiGenerating

                      }),

                      React.createElement("button", {

                        onClick: function() {

                          if (!d.stereoAnimAiPrompt) return;

                          upd('stereoAnimAiGenerating', true);

                          callImagen('A smooth, high-quality, continuous 3D grayscale depth map of: ' + d.stereoAnimAiPrompt + '. The closest parts must be pure white, and the furthest background pure black. No text, no floating artifacts. Fill the entire square frame.', 400)

                            .then(function(base64) {

                              var img = new Image();

                              img.onload = function() {

                                var c = document.createElement('canvas'); c.width = 400; c.height = 400;

                                c.getContext('2d').drawImage(img, 0, 0, 400, 400);

                                var imgData = c.getContext('2d').getImageData(0, 0, 400, 400);

                                upd('stereoAnimAiDepth', { width: 400, height: 400, data: Array.from(imgData.data) });

                                upd('stereoAnimAiGenerating', false);

                                if (typeof addToast === 'function') addToast('\u2728 AI depth map generated!', 'success');

                              };

                              img.src = base64;

                            }).catch(function(e) {

                              upd('stereoAnimAiGenerating', false);

                              if (typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                            });

                        },

                        disabled: !!d.stereoAnimAiGenerating || !d.stereoAnimAiPrompt,

                        className: "w-full px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 shadow-sm transition-all mb-2"

                      }, d.stereoAnimAiGenerating ? '\u23F3 Generating...' : '\uD83E\uDD16 Generate AI Depth Map'),

                      d.stereoAnimAiDepth && React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                        React.createElement("canvas", { width: 80, height: 80, className: "rounded border border-purple-200", ref: function(c) {

                          if (!c || !d.stereoAnimAiDepth) return;

                          var ctx = c.getContext('2d');

                          var ad = d.stereoAnimAiDepth;

                          var imgData = ctx.createImageData(ad.width, ad.height);

                          for (var i = 0; i < ad.data.length; i++) imgData.data[i] = ad.data[i];

                          var temp = document.createElement('canvas'); temp.width = ad.width; temp.height = ad.height;

                          temp.getContext('2d').putImageData(imgData, 0, 0);

                          ctx.drawImage(temp, 0, 0, 80, 80);

                        } }),

                        React.createElement("span", { className: "text-[10px] text-green-600 font-bold" }, "\u2705 AI depth map ready!")

                      ),

                      React.createElement("div", { className: "mt-2" },

                        React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-1" }, "\uD83D\uDD04 Transform Type"),

                        React.createElement("div", { className: "flex gap-1" },

                          [{ id: 'zoom', label: '\uD83D\uDD0D Zoom' }, { id: 'rotate', label: '\uD83D\uDD04 Rotate' }, { id: 'bounce', label: '\u26A1 Bounce' }, { id: 'slide', label: '\u21C6 Slide' }].map(function(t) {

                            return React.createElement("button", { key: t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                              className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50') }, t.label);

                          })

                        )

                      )

                    ) : React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200" },

                      React.createElement("p", { className: "text-[10px] text-amber-700 font-bold" }, "\u26A0\uFE0F AI image generation is not available. Use the Preset, Draw, Upload, or Transform modes instead.")

                    )

                  ),



                  // ═══ COMMON CONTROLS (frames, speed, pattern, strength) ═══

                  React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-0.5" }, "Frames: " + (d.stereoAnimFrameCount || 12)),

                      React.createElement("input", { type: "range", min: 6, max: 24, value: d.stereoAnimFrameCount || 12, onChange: function(e) { upd('stereoAnimFrameCount', parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-0.5" }, "Speed: " + (d.stereoAnimSpeed || 8) + " FPS"),

                      React.createElement("input", { type: "range", min: 2, max: 15, value: d.stereoAnimSpeed || 8, onChange: function(e) { upd('stereoAnimSpeed', parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    )

                  ),

                  React.createElement("div", { className: "mb-3" },

                    React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-1" }, "Pattern Type"),

                    React.createElement("div", { className: "flex gap-1" },

                      [{ id: 'bw', label: '\u26AB B&W' }, { id: 'color', label: '\uD83C\uDFA8 Color' }, { id: 'noise', label: '\uD83D\uDCFA Noise' }].map(function(s) {

                        return React.createElement("button", { key: s.id, onClick: function() { upd('stereoPattern', s.id); },

                          className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoPattern || 'bw') === s.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50') }, s.label);

                      })

                    )

                  ),

                  [{ k: 'stereoStrength', label: 'Depth Strength', min: 5, max: 30, def: 15 },

                   { k: 'stereoDensity', label: 'Pattern Width', min: 60, max: 150, def: 100 }].map(function(s) {

                    var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                    return React.createElement("div", { key: s.k, className: "mb-2" },

                      React.createElement("label", { className: "text-[10px] font-bold text-purple-600 block mb-0.5" }, s.label + ': ' + val),

                      React.createElement("input", { type: "range", min: s.min, max: s.max, value: val, onChange: function(e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    );

                  }),



                  // ═══ RENDER BUTTON (branches by source) ═══

                  React.createElement("div", { className: "flex gap-2 mt-3" },

                    React.createElement("button", {

                      onClick: function() {

                        var source = d.stereoAnimSource || 'preset';

                        var nF = d.stereoAnimFrameCount || 12;

                        var pType = d.stereoPattern || 'bw';

                        var pWidth = typeof d.stereoDensity === 'number' ? d.stereoDensity : 100;

                        var maxShift = typeof d.stereoStrength === 'number' ? d.stereoStrength : 15;

                        var aiPat = d.stereoAiPatternImg || null;



                        // Validation

                        if (source === 'preset' && !d.stereoAnimPreset) { if (typeof addToast === 'function') addToast('Pick an animation preset first!', 'warning'); return; }

                        if (source === 'draw' && (!d.stereoAnimKeyframes || d.stereoAnimKeyframes.length < 2)) { if (typeof addToast === 'function') addToast('Capture at least 2 keyframes!', 'warning'); return; }

                        if (source === 'upload' && !d.stereoAnimUploadedDepth) { if (typeof addToast === 'function') addToast('Upload a depth map image first!', 'warning'); return; }

                        if (source === 'ai' && !d.stereoAnimAiDepth) { if (typeof addToast === 'function') addToast('Generate an AI depth map first!', 'warning'); return; }



                        _stopStereoAnim();

                        upd('stereoAnimRendering', true);

                        upd('stereoAnimProgress', 0);



                        if (source === 'preset') {

                          // Existing preset rendering

                          _renderAnimFrames(nF, d.stereoAnimPreset, pType, pWidth, maxShift, aiPat,

                            function(done, total) { upd('stereoAnimProgress', Math.round(done/total*100)); },

                            function(frames) {

                              _stereoAnimRef.frames = frames;

                              upd('stereoAnimRendering', false); upd('stereoAnimProgress', 100); upd('stereoAnimHasFrames', true);

                              if (typeof addToast === 'function') addToast('\uD83C\uDFAC ' + frames.length + ' frames rendered!', 'success');

                              upd('stereoAnimPlaying', true);

                              _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd);

                            }

                          );

                        } else {

                          // Custom source rendering

                          var W = 512, H = 512, dmW = 400, dmH = 400;

                          var frames = []; var fi = 0;



                          function getDepthForFrame(frameIdx) {

                            if (source === 'draw') {

                              // Interpolate between keyframes

                              var kfs = d.stereoAnimKeyframes;

                              var maps = kfs.map(function(kf) {

                                var c2 = document.createElement('canvas'); c2.width = kf.width; c2.height = kf.height;

                                var ctx2 = c2.getContext('2d');

                                var id2 = ctx2.createImageData(kf.width, kf.height);

                                for (var j = 0; j < kf.data.length; j++) id2.data[j] = kf.data[j];

                                ctx2.putImageData(id2, 0, 0);

                                return ctx2.getImageData(0, 0, kf.width, kf.height);

                              });

                              return _interpolateDepthMaps(maps, frameIdx, nF);

                            } else {

                              // Upload, Transform, AI — use _genTransformDepth

                              var srcData;

                              if (source === 'upload') {

                                srcData = d.stereoAnimUploadedDepth;

                              } else if (source === 'ai') {

                                srcData = d.stereoAnimAiDepth;

                              } else {

                                // transform — read from static depth map canvas

                                var dmc = document.getElementById('depthMapCanvas');

                                if (dmc) {

                                  srcData = dmc.getContext('2d').getImageData(0, 0, dmc.width, dmc.height);

                                } else {

                                  // Fallback: blank

                                  var fc = document.createElement('canvas'); fc.width = dmW; fc.height = dmH;

                                  var fctx = fc.getContext('2d'); fctx.fillStyle = '#000'; fctx.fillRect(0, 0, dmW, dmH);

                                  srcData = fctx.getImageData(0, 0, dmW, dmH);

                                }

                              }

                              var srcImg;

                              if (srcData.data instanceof Uint8ClampedArray) {

                                srcImg = srcData;

                              } else {

                                // Convert from Array to ImageData

                                var tc = document.createElement('canvas'); tc.width = srcData.width; tc.height = srcData.height;

                                var tctx = tc.getContext('2d');

                                var tid = tctx.createImageData(srcData.width, srcData.height);

                                for (var ti = 0; ti < srcData.data.length; ti++) tid.data[ti] = srcData.data[ti];

                                tctx.putImageData(tid, 0, 0);

                                srcImg = tctx.getImageData(0, 0, srcData.width, srcData.height);

                              }

                              return _genTransformDepth(srcImg, dmW, dmH, d.stereoAnimTransform || 'zoom', frameIdx, nF);

                            }

                          }



                          function renderStep() {

                            if (fi >= nF) {

                              _stereoAnimRef.frames = frames;

                              upd('stereoAnimRendering', false); upd('stereoAnimProgress', 100); upd('stereoAnimHasFrames', true);

                              if (typeof addToast === 'function') addToast('\uD83C\uDFAC ' + frames.length + ' frames rendered!', 'success');

                              upd('stereoAnimPlaying', true);

                              _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd);

                              return;

                            }

                            var depthData = getDepthForFrame(fi);

                            var f = _sirdsRenderSync(W, H, depthData.data, dmW, dmH, pType, pWidth, maxShift, aiPat);

                            frames.push(f);

                            fi++;

                            upd('stereoAnimProgress', Math.round(fi / nF * 100));

                            requestAnimationFrame(renderStep);

                          }

                          requestAnimationFrame(renderStep);

                        }

                      },

                      disabled: !!d.stereoAnimRendering,

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 shadow-md transition-all"

                    }, d.stereoAnimRendering ? ('\u23F3 Rendering... ' + (d.stereoAnimProgress || 0) + '%') : '\uD83C\uDFAC Render Animation'),

                    React.createElement("button", {

                      onClick: function() { _stopStereoAnim(); _stereoAnimRef.frames = []; upd('stereoAnimHasFrames', false); upd('stereoAnimPlaying', false); upd('stereoAnimProgress', 0); },

                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"

                    }, "\u23F9 Reset")

                  ),

                  d.stereoAnimRendering && React.createElement("div", { className: "mt-2 h-2 bg-purple-100 rounded-full overflow-hidden" },

                    React.createElement("div", { style: { width: (d.stereoAnimProgress || 0) + '%', transition: 'width 0.3s' }, className: "h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" })

                  )

                ),



                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-purple-200 shadow-sm" },

                  React.createElement("div", { className: "flex justify-between items-center mb-2" },

                    React.createElement("p", { className: "text-xs font-bold text-purple-700" }, "\uD83D\uDC53 Animated Stereogram Output"),

                    d.stereoAnimHasFrames && React.createElement("span", { className: "text-[10px] font-bold px-2 py-0.5 rounded-full " + (d.stereoAnimPlaying ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500') }, d.stereoAnimPlaying ? '\u25B6 Playing' : '\u23F8 Paused')

                  ),

                  React.createElement("p", { className: "text-[10px] text-slate-400 mb-2" }, "Relax your eyes and look \u2018through\u2019 the animation to see 3D shapes move"),

                  React.createElement("canvas", { id: 'stereoAnimCanvas', width: 512, height: 512,

                    className: "rounded-xl border-2 border-purple-200 shadow-lg block", style: { maxWidth: '100%', background: '#111' },

                    ref: function(canvas) {

                      if (!canvas) return;

                      if (canvas._animInit) return;

                      canvas._animInit = true;

                      var ctx = canvas.getContext('2d');

                      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 512, 512);

                      ctx.fillStyle = '#555'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

                      ctx.fillText('Pick a source and click Render Animation', 256, 256);

                    }

                  }),

                  d.stereoAnimHasFrames && React.createElement("div", { className: "flex gap-2 mt-3" },

                    React.createElement("button", {

                      onClick: function() {

                        if (d.stereoAnimPlaying) { _stopStereoAnim(); upd('stereoAnimPlaying', false); }

                        else { _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8, upd); upd('stereoAnimPlaying', true); }

                      },

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.stereoAnimPlaying ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-md')

                    }, d.stereoAnimPlaying ? '\u23F8 Pause' : '\u25B6 Play'),

                    React.createElement("button", {

                      onClick: function() {

                        _stopStereoAnim();

                        upd('stereoAnimPlaying', false);

                        _exportStereoGif(_stereoAnimRef.frames, d.stereoAnimSpeed || 8);

                      },

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"

                    }, "\uD83D\uDCE5 Export GIF")

                  ),

                  React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-3" },

                    React.createElement("p", { className: "text-[10px] font-bold text-amber-700 mb-1" }, "\uD83D\uDCA1 Tips for Animated Stereograms"),

                    React.createElement("ul", { className: "text-[10px] text-slate-600 leading-relaxed list-disc ml-4 space-y-0.5" },

                      React.createElement("li", null, "Lock your eyes into the 3D view before clicking Play"),

                      React.createElement("li", null, "Slower speeds (4\u20136 FPS) are easier to maintain focus"),

                      React.createElement("li", null, "Pulse and Heart presets are the easiest to see in motion"),

                      React.createElement("li", null, "The exported GIF can be printed frame-by-frame as a flipbook!")

                    )

                  )

                )

              ),

            tab === 'life' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3", style: { maxHeight: '85vh', overflowY: 'auto' } },

                  React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-lime-50 rounded-xl p-4 border border-emerald-200" },

                    React.createElement("div", { className: "flex justify-between items-start mb-3" },

                      React.createElement("h4", { className: "text-xs font-bold text-emerald-700" }, "\uD83E\uDDEC Conway's Game of Life"),

                      React.createElement("button", { onClick: function () { toggleFullscreen('lifeCanvasContainer'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all shadow-sm" }, "\uD83D\uDD0D Fullscreen Mode")

                    ),

                    // Simulation controls

                    React.createElement("div", { className: "flex gap-1 mb-3" },

                      React.createElement("button", { onClick: function () { upd('lifeRunning', !(d.lifeRunning)); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-black transition-all " + (d.lifeRunning ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-md') }, d.lifeRunning ? '\u23F8 Pause' : '\u25B6 Run'),

                      React.createElement("button", { onClick: function () { upd('lifeStep', (d.lifeStep || 0) + 1); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200", disabled: d.lifeRunning }, '\u23ED Step'),

                      React.createElement("button", { onClick: function () { upd('lifeClear', Date.now()); upd('lifeRunning', false); upd('lifeGen', 0); upd('lifePop', 0); upd('lifeChallengeStatus', null); upd('lifeChallengeMsg', null); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100" }, '\uD83D\uDDD1 Clear')

                    ),

                    // Stats

                    React.createElement("div", { className: "flex gap-3 mb-3 text-[10px] font-bold" },

                      React.createElement("span", { className: "px-2 py-1 rounded-full bg-emerald-100 text-emerald-700" }, '\uD83D\uDD04 Gen: ' + (d.lifeGen || 0)),

                      React.createElement("span", { className: "px-2 py-1 rounded-full bg-lime-100 text-lime-700" }, '\uD83E\uDDA0 Pop: ' + (d.lifePop || 0)),

                      (d.lifeMaxPop > 0) && React.createElement("span", { className: "px-2 py-1 rounded-full bg-amber-100 text-amber-700" }, '\uD83D\uDCC8 Max: ' + d.lifeMaxPop)

                    ),

                    // Speed

                    React.createElement("div", { className: "mb-2" },

                      React.createElement("label", { className: "text-[10px] font-bold text-emerald-600 block mb-0.5" }, 'Speed: ' + (typeof d.lifeSpeed === 'number' ? d.lifeSpeed : 10) + ' fps'),

                      React.createElement("input", { type: "range", min: 1, max: 30, value: typeof d.lifeSpeed === 'number' ? d.lifeSpeed : 10, onChange: function (e) { upd('lifeSpeed', parseInt(e.target.value)); }, className: "w-full accent-emerald-600" })

                    ),

                    // Grid size

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-emerald-600 block mb-1" }, 'Grid Size'),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 40, label: '40\u00D740' }, { id: 60, label: '60\u00D760' }, { id: 80, label: '80\u00D780' }, { id: 120, label: '120\u00D7120' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('lifeSize', s.id); upd('lifeClear', Date.now()); upd('lifeRunning', false); upd('lifeGen', 0); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.lifeSize || 60) === s.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50') }, s.label);

                        })

                      )

                    ),

                    // Draw tool

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-emerald-600 block mb-1" }, 'Draw Tool'),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'draw', label: '\u270F Draw' }, { id: 'erase', label: '\uD83E\uDDFD Erase' }].map(function (s) {

                          return React.createElement("button", { key: s.id, onClick: function () { upd('lifeTool', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.lifeTool || 'draw') === s.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50') }, s.label);

                        })

                      )

                    ),

                    // Wrap toggle + Random

                    React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                      React.createElement("button", { onClick: function () { upd('lifeWrap', d.lifeWrap === false ? true : d.lifeWrap === true ? false : true); }, className: "px-3 py-1 rounded-lg text-[10px] font-bold transition-all " + (d.lifeWrap !== false ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50') }, (d.lifeWrap !== false ? '\u2705' : '\u2B1C') + ' Wrap Edges'),

                      React.createElement("button", { onClick: function () {

                        var sz = d.lifeSize || 60;

                        var newGrid = {};

                        for (var ry = 0; ry < sz; ry++) for (var rx = 0; rx < sz; rx++) { if (Math.random() < 0.3) newGrid[rx + ',' + ry] = 1; }

                        upd('lifeGrid', newGrid); upd('lifeSeed', Date.now()); upd('lifeGen', 0);

                      }, className: "px-3 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200" }, '\uD83C\uDFB2 Random')

                    ),

                    // ─── Visualization Mode ───

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-emerald-600 block mb-1" }, '\uD83D\uDD0D Visualization'),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'normal', label: '\uD83D\uDFE2 Normal' }, { id: 'heatmap', label: '\uD83C\uDF21 Age Map' }, { id: 'xray', label: '\uD83D\uDD2C X-Ray' }].map(function (v) {

                          return React.createElement("button", { key: v.id, onClick: function () { upd('lifeVizMode', v.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.lifeVizMode || 'normal') === v.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50') }, v.label);

                        })

                      ),

                      React.createElement("p", { className: "text-[9px] text-slate-400 mt-1 italic" }, (d.lifeVizMode || 'normal') === 'heatmap' ? '\uD83C\uDF21 Bright = newborn, dark = old survivors' : (d.lifeVizMode || 'normal') === 'xray' ? '\uD83D\uDD2C Numbers show neighbor count \u2014 see WHY cells live/die' : 'Standard cell coloring')

                    ),

                    // Cell Color (only in normal mode)

                    (d.lifeVizMode || 'normal') === 'normal' && React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { className: "text-[10px] font-bold text-emerald-600 block mb-1" }, 'Cell Color'),

                      React.createElement("div", { className: "flex gap-1" },

                        [{ id: 'green', label: '\uD83D\uDFE2', hue: 140 }, { id: 'cyan', label: '\uD83D\uDD35', hue: 190 }, { id: 'gold', label: '\uD83D\uDFE1', hue: 45 }, { id: 'pink', label: '\uD83D\uDFE3', hue: 320 }, { id: 'white', label: '\u26AA', hue: -1 }].map(function (c) {

                          return React.createElement("button", { key: c.id, onClick: function () { upd('lifeHue', c.hue); }, className: "flex-1 px-2 py-1 rounded-lg text-sm transition-all " + ((d.lifeHue || 140) === c.hue ? 'bg-slate-200 ring-2 ring-emerald-400' : 'bg-slate-50 hover:bg-slate-100') }, c.label);

                        })

                      )

                    ),

                    // Export

                    React.createElement("button", { onClick: function () { var c = document.getElementById('lifeCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'game-of-life-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "w-full px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, '\uD83D\uDCE5 Export PNG'),

                    // ─── Expanded Preset Library ───

                    React.createElement("div", { className: "mt-3" },

                      React.createElement("span", { className: "text-[10px] font-bold text-emerald-500 block mb-1" }, '\uD83D\uDCDA Pattern Library'),

                      [

                        { cat: 'Still Lifes', emoji: '\uD83E\uDDF1', items: [

                          { label: 'Block', id: 'block', desc: 'Simplest still life \u2014 4 cells in a square' },

                          { label: 'Beehive', id: 'beehive', desc: '6-cell still life shaped like a hexagon' },

                          { label: 'Loaf', id: 'loaf', desc: '7-cell asymmetric still life' },

                          { label: 'Boat', id: 'boat', desc: '5-cell still life' }

                        ]},

                        { cat: 'Oscillators', emoji: '\uD83D\uDD04', items: [

                          { label: 'Blinker', id: 'blinker', desc: 'Period 2 \u2014 the simplest oscillator' },

                          { label: 'Toad', id: 'toad', desc: 'Period 2 \u2014 6 cells that shift back and forth' },

                          { label: 'Beacon', id: 'beacon', desc: 'Period 2 \u2014 two blocks that blink' },

                          { label: 'Pulsar', id: 'pulsar', desc: 'Period 3 \u2014 beautiful rotational symmetry' }

                        ]},

                        { cat: 'Spaceships', emoji: '\uD83D\uDE80', items: [

                          { label: 'Glider', id: 'glider', desc: 'Moves diagonally \u2014 discovered 1970' },

                          { label: 'LWSS', id: 'lwss', desc: 'Lightweight spaceship \u2014 moves horizontally' },

                          { label: 'MWSS', id: 'mwss', desc: 'Middleweight spaceship \u2014 9 cells' },

                          { label: 'HWSS', id: 'hwss', desc: 'Heavyweight spaceship \u2014 largest basic ship' }

                        ]},

                        { cat: 'Methuselahs', emoji: '\uD83C\uDF0B', items: [

                          { label: 'R-pentomino', id: 'rpent', desc: '5 cells \u2192 1103 generations to stabilize!' },

                          { label: 'Acorn', id: 'acorn', desc: '7 cells \u2192 takes 5206 generations!' },

                          { label: 'Diehard', id: 'diehard', desc: '7 cells \u2192 dies completely at gen 130' },

                          { label: 'Pi-heptomino', id: 'pihept', desc: '7 cells \u2192 stabilizes at gen 173' }

                        ]},

                        { cat: 'Guns', emoji: '\u2694\uFE0F', items: [

                          { label: 'Gosper Gun', id: 'gliderGun', desc: 'First gun found \u2014 shoots gliders endlessly' }

                        ]}

                      ].map(function (cat) {

                        return React.createElement("div", { key: cat.cat, className: "mb-2" },

                          React.createElement("p", { className: "text-[9px] font-bold text-slate-500 mb-0.5" }, cat.emoji + ' ' + cat.cat),

                          React.createElement("div", { className: "flex gap-1 flex-wrap" },

                            cat.items.map(function (pr) {

                              return React.createElement("button", { key: pr.id, onClick: function () { upd('lifePreset', pr.id); upd('lifeClear', Date.now()); upd('lifeGen', 0); upd('lifeMaxPop', 0); var stillLifes = { block:1, beehive:1, loaf:1, boat:1 }; upd('lifeRunning', !stillLifes[pr.id]); }, className: "px-2 py-0.5 rounded text-[9px] font-bold bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all", title: pr.desc }, pr.label);

                            })

                          )

                        );

                      })

                    )

                  ),

                  // ─── Rule Editor Card ───

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("h4", { className: "text-[10px] font-bold text-purple-700 mb-2" }, '\uD83E\uDDEC Rule Editor (B/S Notation)'),

                    React.createElement("p", { className: "text-[9px] text-slate-500 mb-2" }, 'Change the rules! B = counts that birth a cell. S = counts that keep it alive.'),

                    React.createElement("div", { className: "flex gap-2 mb-2" },

                      React.createElement("div", { className: "flex-1" },

                        React.createElement("label", { className: "text-[9px] font-bold text-purple-600 block" }, 'Birth (B)'),

                        React.createElement("input", { type: "text", value: d.lifeRuleB || '3', onChange: function (e) { upd('lifeRuleB', e.target.value.replace(/[^0-8]/g, '')); }, className: "w-full px-2 py-1 text-xs font-mono border border-purple-200 rounded-lg", placeholder: '3' })

                      ),

                      React.createElement("div", { className: "flex-1" },

                        React.createElement("label", { className: "text-[9px] font-bold text-purple-600 block" }, 'Survival (S)'),

                        React.createElement("input", { type: "text", value: d.lifeRuleS || '23', onChange: function (e) { upd('lifeRuleS', e.target.value.replace(/[^0-8]/g, '')); }, className: "w-full px-2 py-1 text-xs font-mono border border-purple-200 rounded-lg", placeholder: '23' })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-1 flex-wrap" },

                      React.createElement("span", { className: "text-[9px] font-bold text-purple-500 mr-1" }, 'Try:'),

                      [

                        { label: 'Conway B3/S23', b: '3', s: '23', desc: 'The classic \u2014 balanced growth' },

                        { label: 'Seeds B2/S', b: '2', s: '', desc: 'Explosive! Every cell dies immediately' },

                        { label: 'Highlife B36/S23', b: '36', s: '23', desc: 'Like Conway but has a replicator!' },

                        { label: 'Day&Night B3678/S34678', b: '3678', s: '34678', desc: 'Symmetric \u2014 dead/alive are interchangeable' },

                        { label: 'Diamoeba B35678/S5678', b: '35678', s: '5678', desc: 'Creates diamond-shaped amoebas' }

                      ].map(function (rp) {

                        return React.createElement("button", { key: rp.label, onClick: function () { upd('lifeRuleB', rp.b); upd('lifeRuleS', rp.s); }, className: "px-2 py-0.5 rounded text-[9px] font-bold bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 transition-all", title: rp.desc }, rp.label);

                      })

                    ),

                    React.createElement("p", { className: "text-[9px] text-slate-400 mt-1 italic" }, 'Currently: B' + (d.lifeRuleB || '3') + '/S' + (d.lifeRuleS || '23') + ((d.lifeRuleB || '3') === '3' && (d.lifeRuleS || '23') === '23' ? ' (Conway\'s classic rules)' : ' (custom rules)'))

                  ),

                  // ─── Pattern Challenges Card ───

                  React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200" },

                    React.createElement("h4", { className: "text-[10px] font-bold text-amber-700 mb-2" }, '\uD83C\uDFAF Pattern Challenges (+10 XP each)'),

                    React.createElement("div", { className: "flex gap-1 flex-wrap mb-2" },

                      [

                        { id: 'still', label: '\uD83E\uDDF1 Still Life', desc: 'Draw a pattern that stays perfectly unchanged after 1 step' },

                        { id: 'oscillator', label: '\uD83D\uDD04 Oscillator', desc: 'Draw a pattern that repeats itself (comes back to initial state)' },

                        { id: 'extinction', label: '\uD83D\uDC80 Extinction', desc: 'Draw a pattern that completely dies out' },

                        { id: 'methuselah', label: '\uD83C\uDF0B Methuselah', desc: 'Use \u22645 cells to create a pattern that survives 50+ generations' },

                        { id: 'maxpop', label: '\uD83D\uDCC8 Pop Boom', desc: 'Use exactly 5 cells \u2014 maximize population within 50 generations!' }

                      ].map(function (ch) {

                        var isActive = d.lifeChallenge === ch.id;

                        return React.createElement("button", { key: ch.id, onClick: function () {

                          upd('lifeChallenge', isActive ? null : ch.id);

                          upd('lifeChallengeStatus', isActive ? null : 'active');

                          upd('lifeChallengeMsg', isActive ? null : ch.desc);

                          upd('lifeMaxPop', 0);

                          if (!isActive) { upd('lifeClear', Date.now()); upd('lifeRunning', false); upd('lifeGen', 0); upd('lifePop', 0); }

                        }, className: "px-2 py-1 rounded-lg text-[9px] font-bold transition-all " + (isActive ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'), title: ch.desc }, ch.label);

                      })

                    ),

                    d.lifeChallenge && d.lifeChallengeStatus === 'active' && React.createElement("div", { className: "space-y-1" },

                      React.createElement("p", { className: "text-[10px] text-amber-600 italic" }, d.lifeChallengeMsg || ''),

                      React.createElement("p", { className: "text-[9px] text-slate-500" }, 'Draw your pattern, then press \u25B6 Run to test!'),

                      (d.lifeChallenge === 'methuselah' || d.lifeChallenge === 'maxpop') && React.createElement("p", { className: "text-[9px] font-bold " + ((d.lifePop || 0) > 5 ? 'text-red-500' : 'text-green-600') }, 'Cells placed: ' + (d.lifePop || 0) + '/5')

                    ),

                    d.lifeChallengeStatus === 'success' && React.createElement("div", { className: "mt-1 px-3 py-2 bg-green-100 rounded-lg border border-green-300" },

                      React.createElement("p", { className: "text-sm font-bold text-green-600" }, '\u2705 ' + (d.lifeChallengeMsg || 'Challenge complete! +10 XP'))

                    ),

                    d.lifeChallengeStatus === 'fail' && React.createElement("div", { className: "mt-1 px-3 py-2 bg-red-50 rounded-lg border border-red-200" },

                      React.createElement("p", { className: "text-[10px] font-bold text-red-500" }, '\u274C ' + (d.lifeChallengeMsg || 'Not quite \u2014 try again!'))

                    )

                  ),

                  // Educational panel (Moved Up)

                  React.createElement("div", { className: "bg-gradient-to-br from-lime-50 to-green-50 rounded-xl p-3 border border-lime-200" },

                    React.createElement("button", { onClick: function () { upd('showLifeInfo', d.showLifeInfo === undefined ? false : !d.showLifeInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-lime-700" },

                      React.createElement("span", null, '\uD83E\uDDE0 The Science of Cellular Automata'),

                      React.createElement("span", null, (d.showLifeInfo !== false) ? '\u25B2' : '\u25BC')

                    ),

                    (d.showLifeInfo !== false) && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, '\uD83E\uDDEC ', React.createElement("strong", null, "Conway\'s Game of Life"), ' was invented by mathematician John Horton Conway in 1970. Despite having only 4 simple rules, it can produce extraordinary complexity \u2014 it\'s actually ', React.createElement("strong", null, "Turing complete"), ', meaning it can compute anything a real computer can.'),

                      React.createElement("div", { className: "bg-white rounded-lg p-2 border border-lime-200" },

                        React.createElement("p", { className: "font-bold text-lime-700 mb-1" }, '\uD83D\uDCCF The Rules:'),

                        React.createElement("ol", { className: "list-decimal ml-4 space-y-0.5" },

                          React.createElement("li", null, React.createElement("strong", null, "Survival:"), ' A live cell with 2\u20133 neighbors stays alive'),

                          React.createElement("li", null, React.createElement("strong", null, "Birth:"), ' A dead cell with exactly 3 neighbors becomes alive'),

                          React.createElement("li", null, React.createElement("strong", null, "Death:"), ' All other live cells die (loneliness or overcrowding)')

                        ),

                        React.createElement("p", { className: "text-[10px] italic mt-1 text-slate-400" }, 'Use \uD83D\uDD2C X-Ray mode to see neighbor counts and understand why each cell lives or dies!')

                      ),

                      React.createElement("div", { className: "bg-white rounded-lg p-2 border border-lime-200" },

                        React.createElement("p", { className: "font-bold text-lime-700 mb-1" }, '\uD83D\uDCDA Pattern Types:'),

                        React.createElement("ul", { className: "list-disc ml-4 space-y-0.5" },

                          React.createElement("li", null, React.createElement("strong", null, "Still Lifes"), ' \u2014 patterns that never change (every cell has 2\u20133 neighbors)'),

                          React.createElement("li", null, React.createElement("strong", null, "Oscillators"), ' \u2014 patterns that cycle through states and repeat'),

                          React.createElement("li", null, React.createElement("strong", null, "Spaceships"), ' \u2014 patterns that move across the grid'),

                          React.createElement("li", null, React.createElement("strong", null, "Methuselahs"), ' \u2014 small patterns that take very long to stabilize'),

                          React.createElement("li", null, React.createElement("strong", null, "Guns"), ' \u2014 patterns that emit spaceships forever')

                        )

                      ),

                      React.createElement("p", null, '\uD83D\uDE80 ', React.createElement("strong", null, "Gliders"), ' are patterns that move across the grid. The ', React.createElement("strong", null, "Gosper Glider Gun"), ' (1970) was the first pattern proven to grow without bound.'),

                      React.createElement("p", null, '\uD83C\uDF0D ', React.createElement("strong", null, "Emergence:"), ' The Game of Life demonstrates how complex, seemingly \u201Cintelligent\u201D behavior can arise from very simple rules with no central controller. This same principle appears in ant colonies, flocking birds, brain neurons, and even market economies.'),

                      React.createElement("p", null, '\u26A1 ', React.createElement("strong", null, "Self-replication:"), ' In 2010, Andrew Wade built a pattern called \u201CGemini\u201D that creates a complete copy of itself and then destroys the original \u2014 true self-replication from simple rules.')

                    )

                  ),

                  React.createElement("p", { className: "text-[10px] text-center text-slate-400 italic" }, '\uD83D\uDC46 Click/drag to draw \u2022 \u25B6 Run to simulate \u2022 \uD83D\uDD2C X-Ray to learn')

                ),

                // ─── RIGHT COLUMN: Canvas + Sparkline ───

                React.createElement("div", { id: "lifeCanvasContainer", className: "space-y-2 bg-slate-900 aspect-square flex flex-col items-center justify-center p-2 rounded-xl" },

                  React.createElement("canvas", { id: 'lifeCanvas', width: 600, height: 600,

                    key: 'life-' + (d.lifeClear || 0) + '-' + (d.lifeSize || 60),

                    className: "rounded-xl border-2 border-emerald-200 shadow-lg mx-auto block cursor-crosshair flex-shrink-0", style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', background: '#0a0f0a' },

                    ref: function (canvas) {

                      if (!canvas) return;

                      if (canvas._lifeInit) return;

                      canvas._lifeInit = true;

                      var ctx = canvas.getContext('2d');

                      var W = canvas.width, H = canvas.height;

                      var gridSize = d.lifeSize || 60;

                      var cellW = W / gridSize, cellH = H / gridSize;

                      var grid = d.lifeGrid || {};

                      var ageGrid = {};

                      var wrap = d.lifeWrap !== false;

                      var generation = d.lifeGen || 0;

                      var running = false;

                      var speed = typeof d.lifeSpeed === 'number' ? d.lifeSpeed : 10;

                      var hue = typeof d.lifeHue === 'number' ? d.lifeHue : 140;

                      var vizMode = 'normal';

                      var lastFrameTime = 0;

                      var popHistory = [];

                      var birthSet = { 3: true };

                      var survivalSet = { 2: true, 3: true };

                      var challengeInitGridStr = null;

                      var challengeInitPop = 0;

                      var maxPopSeen = 0;



                      // Initialize ages

                      Object.keys(grid).forEach(function (k) { ageGrid[k] = 1; });



                      // Load preset

                      var preset = d.lifePreset;

                      if (preset) {

                        upd('lifePreset', null);

                        grid = {};

                        ageGrid = {};

                        var cx = Math.floor(gridSize / 2), cy = Math.floor(gridSize / 2);

                        var cells = [];

                        if (preset === 'glider') cells = [[0,0],[1,1],[2,1],[0,2],[1,2]];

                        else if (preset === 'gliderGun') cells = [[24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],[11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],[16,4],[20,4],[21,4],[0,5],[1,5],[10,5],[14,5],[16,5],[17,5],[22,5],[24,5],[10,6],[16,6],[24,6],[11,7],[15,7],[12,8],[13,8]];

                        else if (preset === 'pulsar') {

                          var pRows = [[2,3,4,8,9,10],[0,5,7,12],[0,5,7,12],[0,5,7,12],[2,3,4,8,9,10]];

                          pRows.forEach(function (cols, ri) {

                            cols.forEach(function (c) {

                              cells.push([c - 6, ri - 6 + 1]);

                              cells.push([c - 6, -(ri - 6 + 1)]);

                            });

                          });

                        }

                        else if (preset === 'spaceship') cells = [[1,0],[4,0],[0,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3]];

                        else if (preset === 'rpent') cells = [[1,0],[2,0],[0,1],[1,1],[1,2]];

                        else if (preset === 'acorn') cells = [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]];

                        else if (preset === 'diehard') cells = [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]];

                        // New presets

                        else if (preset === 'block') cells = [[0,0],[1,0],[0,1],[1,1]];

                        else if (preset === 'beehive') cells = [[1,0],[2,0],[0,1],[3,1],[1,2],[2,2]];

                        else if (preset === 'loaf') cells = [[1,0],[2,0],[0,1],[3,1],[1,2],[3,2],[2,3]];

                        else if (preset === 'boat') cells = [[0,0],[1,0],[0,1],[2,1],[1,2]];

                        else if (preset === 'blinker') cells = [[0,0],[1,0],[2,0]];

                        else if (preset === 'toad') cells = [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]];

                        else if (preset === 'beacon') cells = [[0,0],[1,0],[0,1],[1,1],[2,2],[3,2],[2,3],[3,3]];

                        else if (preset === 'lwss') cells = [[1,0],[4,0],[0,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3]];

                        else if (preset === 'mwss') cells = [[2,0],[0,1],[4,1],[5,2],[0,2],[5,3],[0,3],[1,4],[2,4],[3,4],[4,4],[5,4]];

                        else if (preset === 'hwss') cells = [[2,0],[3,0],[0,1],[5,1],[6,2],[0,2],[6,3],[0,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4]];

                        else if (preset === 'pihept') cells = [[0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[2,2]];

                        cells.forEach(function (c) {

                          var gx = cx + c[0], gy = cy + c[1];

                          if (gx >= 0 && gx < gridSize && gy >= 0 && gy < gridSize) { grid[gx + ',' + gy] = 1; ageGrid[gx + ',' + gy] = 1; }

                        });

                        upd('lifeGrid', Object.assign({}, grid));

                        upd('lifePop', Object.keys(grid).length);

                      }



                      function parseRuleSet(str) {

                        var set = {};

                        for (var i = 0; i < str.length; i++) {

                          var n = parseInt(str[i]);

                          if (!isNaN(n) && n >= 0 && n <= 8) set[n] = true;

                        }

                        return set;

                      }



                      function countNeighbors(x, y) {

                        var count = 0;

                        for (var dy = -1; dy <= 1; dy++) {

                          for (var dx = -1; dx <= 1; dx++) {

                            if (dx === 0 && dy === 0) continue;

                            var nx = x + dx, ny = y + dy;

                            if (wrap) { nx = (nx + gridSize) % gridSize; ny = (ny + gridSize) % gridSize; }

                            else if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;

                            if (grid[nx + ',' + ny]) count++;

                          }

                        }

                        return count;

                      }



                      function gridToString() {

                        return Object.keys(grid).sort().join('|');

                      }



                      function step() {

                        var newGrid = {};

                        var newAgeGrid = {};

                        var checked = {};

                        var keys = Object.keys(grid);

                        keys.forEach(function (key) {

                          var parts = key.split(',');

                          var x = parseInt(parts[0]), y = parseInt(parts[1]);

                          for (var dy = -1; dy <= 1; dy++) {

                            for (var dx = -1; dx <= 1; dx++) {

                              var nx = x + dx, ny = y + dy;

                              if (wrap) { nx = (nx + gridSize) % gridSize; ny = (ny + gridSize) % gridSize; }

                              else if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;

                              var nk = nx + ',' + ny;

                              if (checked[nk]) continue;

                              checked[nk] = true;

                              var alive = !!grid[nk];

                              var neighbors = countNeighbors(nx, ny);

                              if (alive && survivalSet[neighbors]) {

                                newGrid[nk] = 1;

                                newAgeGrid[nk] = (ageGrid[nk] || 1) + 1;

                              } else if (!alive && birthSet[neighbors]) {

                                newGrid[nk] = 1;

                                newAgeGrid[nk] = 1;

                              }

                            }

                          }

                        });

                        grid = newGrid;

                        ageGrid = newAgeGrid;

                        generation++;

                        var pop = Object.keys(grid).length;

                        popHistory.push(pop);

                        if (popHistory.length > 300) popHistory.shift();

                        if (pop > maxPopSeen) maxPopSeen = pop;

                        upd('lifeGrid', Object.assign({}, grid));

                        upd('lifeGen', generation);

                        upd('lifePop', pop);

                        upd('lifeMaxPop', maxPopSeen);



                        // ─── Challenge detection ───

                        var challenge = canvas.getAttribute('data-challenge');

                        var cStatus = canvas.getAttribute('data-challengestatus');

                        if (challenge && cStatus === 'active') {

                          if (!challengeInitGridStr) {

                            // Capture initial state (this is actually 1 gen after start, but close enough for still-life)

                          }

                          if (challenge === 'still' && generation === 1) {

                            // For still life: we need to compare gen-0 with gen-1

                            // We captured challengeInitGridStr before the first step

                            var currentStr = gridToString();

                            if (challengeInitGridStr && currentStr === challengeInitGridStr && pop > 0) {

                              upd('lifeChallengeStatus', 'success');

                              upd('lifeChallengeMsg', 'You built a still life! It never changes. +10 XP');

                              upd('lifeRunning', false);

                              if (typeof awardStemXP === 'function') awardStemXP('life', 10, 'still life challenge');

                            } else if (pop > 0) {

                              upd('lifeChallengeStatus', 'fail');

                              upd('lifeChallengeMsg', 'Pattern changed after 1 step \u2014 not a still life. Try a 2\u00D72 block!');

                              upd('lifeRunning', false);

                            } else {

                              upd('lifeChallengeStatus', 'fail');

                              upd('lifeChallengeMsg', 'Pattern died! A still life must survive unchanged.');

                              upd('lifeRunning', false);

                            }

                          }

                          if (challenge === 'oscillator') {

                            var currentStr = gridToString();

                            if (generation >= 2 && challengeInitGridStr && currentStr === challengeInitGridStr && pop > 0) {

                              upd('lifeChallengeStatus', 'success');

                              upd('lifeChallengeMsg', 'Oscillator found! Period ' + generation + '. It repeats forever. +10 XP');

                              upd('lifeRunning', false);

                              if (typeof awardStemXP === 'function') awardStemXP('life', 10, 'oscillator challenge');

                            } else if (generation > 30) {

                              upd('lifeChallengeStatus', 'fail');

                              upd('lifeChallengeMsg', 'No repeat found in 30 steps. Try a Blinker (3 cells in a row)!');

                              upd('lifeRunning', false);

                            }

                          }

                          if (challenge === 'extinction' && pop === 0) {

                            upd('lifeChallengeStatus', 'success');

                            upd('lifeChallengeMsg', 'Total extinction at gen ' + generation + '! Everything died. +10 XP');

                            upd('lifeRunning', false);

                            if (typeof awardStemXP === 'function') awardStemXP('life', 10, 'extinction challenge');

                          }

                          if (challenge === 'extinction' && generation > 200 && pop > 0) {

                            upd('lifeChallengeStatus', 'fail');

                            upd('lifeChallengeMsg', 'Still alive after 200 gens. Try a simpler pattern!');

                            upd('lifeRunning', false);

                          }

                          if (challenge === 'methuselah' && challengeInitPop <= 5 && challengeInitPop > 0 && generation >= 50 && pop > 0) {

                            upd('lifeChallengeStatus', 'success');

                            upd('lifeChallengeMsg', 'Methuselah! ' + challengeInitPop + ' cells survived ' + generation + ' gens (pop: ' + pop + '). +10 XP');

                            upd('lifeRunning', false);

                            if (typeof awardStemXP === 'function') awardStemXP('life', 10, 'methuselah challenge');

                          }

                          if (challenge === 'methuselah' && challengeInitPop > 5) {

                            upd('lifeChallengeStatus', 'fail');

                            upd('lifeChallengeMsg', 'Too many cells! Use \u22645 cells to start.');

                            upd('lifeRunning', false);

                          }

                          if (challenge === 'maxpop' && generation >= 50) {

                            upd('lifeChallengeStatus', 'success');

                            upd('lifeChallengeMsg', 'Started with ' + challengeInitPop + ' cells \u2192 max population reached: ' + maxPopSeen + '! +10 XP');

                            upd('lifeRunning', false);

                            if (typeof awardStemXP === 'function') awardStemXP('life', 10, 'population boom challenge');

                          }

                        }

                      }



                      function drawGrid() {

                        ctx.fillStyle = '#0a0f0a'; ctx.fillRect(0, 0, W, H);

                        // Grid lines

                        ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5;

                        if (gridSize <= 80) {

                          for (var gx = 0; gx <= gridSize; gx++) { ctx.beginPath(); ctx.moveTo(gx * cellW, 0); ctx.lineTo(gx * cellW, H); ctx.stroke(); }

                          for (var gy = 0; gy <= gridSize; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * cellH); ctx.lineTo(W, gy * cellH); ctx.stroke(); }

                        }

                        // Cells

                        var keys = Object.keys(grid);

                        keys.forEach(function (key) {

                          var parts = key.split(',');

                          var x = parseInt(parts[0]), y = parseInt(parts[1]);

                          var neighbors = countNeighbors(x, y);

                          var age = ageGrid[key] || 1;



                          if (vizMode === 'heatmap') {

                            // Heat map: bright yellow for new, deep blue/purple for old

                            var norm = Math.min(age / 50, 1);

                            var r = Math.round(255 * (1 - norm * 0.7));

                            var g = Math.round(255 * (1 - norm));

                            var b = Math.round(80 + norm * 175);

                            ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';

                          } else if (vizMode === 'xray') {

                            // X-ray: color by neighbor count

                            var xColors = ['#1e293b','#334155','#ef4444','#f97316','#eab308','#22c55e','#22c55e','#ef4444','#dc2626'];

                            ctx.fillStyle = xColors[neighbors] || '#fff';

                          } else {

                            if (hue === -1) {

                              ctx.fillStyle = 'rgba(240,240,240,' + (0.7 + neighbors * 0.04) + ')';

                            } else {

                              var bright = 45 + neighbors * 5;

                              ctx.fillStyle = 'hsl(' + hue + ',80%,' + bright + '%)';

                            }

                          }

                          ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);

                          // Glow

                          if (vizMode === 'normal' && neighbors >= 2 && neighbors <= 3) {

                            ctx.fillStyle = hue === -1 ? 'rgba(255,255,255,0.08)' : 'hsla(' + hue + ',80%,60%,0.1)';

                            ctx.fillRect(x * cellW - 1, y * cellH - 1, cellW + 2, cellH + 2);

                          }

                        });



                        // X-ray: draw neighbor counts for dead cells adjacent to live cells

                        if (vizMode === 'xray' && gridSize <= 80) {

                          ctx.font = Math.max(8, Math.floor(cellW * 0.6)) + 'px monospace';

                          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

                          var deadChecked = {};

                          keys.forEach(function (key) {

                            var parts = key.split(',');

                            var x = parseInt(parts[0]), y = parseInt(parts[1]);

                            // Draw count on the live cell

                            var n = countNeighbors(x, y);

                            var willSurvive = survivalSet[n];

                            ctx.fillStyle = willSurvive ? '#22ff22' : '#ff4444';

                            ctx.fillText(String(n), x * cellW + cellW / 2, y * cellH + cellH / 2);

                            // Check dead neighbors

                            for (var dy = -1; dy <= 1; dy++) {

                              for (var dx = -1; dx <= 1; dx++) {

                                if (dx === 0 && dy === 0) continue;

                                var nx = x + dx, ny = y + dy;

                                if (wrap) { nx = (nx + gridSize) % gridSize; ny = (ny + gridSize) % gridSize; }

                                else if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;

                                var dk = nx + ',' + ny;

                                if (grid[dk] || deadChecked[dk]) continue;

                                deadChecked[dk] = true;

                                var dn = countNeighbors(nx, ny);

                                if (dn > 0) {

                                  var willBirth = birthSet[dn];

                                  ctx.fillStyle = willBirth ? 'rgba(34,255,34,0.5)' : 'rgba(100,100,100,0.3)';

                                  ctx.fillText(String(dn), nx * cellW + cellW / 2, ny * cellH + cellH / 2);

                                }

                              }

                            }

                          });

                        }



                        // Heat map legend

                        if (vizMode === 'heatmap') {

                          ctx.fillStyle = 'rgba(0,0,0,0.6)';

                          ctx.fillRect(W - 75, 5, 70, 16);

                          ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';

                          ctx.fillStyle = '#fbbf24'; ctx.fillText('New', W - 72, 8);

                          ctx.fillStyle = '#6366f1'; ctx.fillText('\u2192 Old', W - 42, 8);

                        }

                        // X-ray legend

                        if (vizMode === 'xray') {

                          ctx.fillStyle = 'rgba(0,0,0,0.7)';

                          ctx.fillRect(4, 4, 160, 36);

                          ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';

                          ctx.fillStyle = '#22ff22'; ctx.fillText('\u2714 green = will survive/born', 8, 7);

                          ctx.fillStyle = '#ff4444'; ctx.fillText('\u2718 red = will die', 8, 20);

                        }

                      }



                      // Drawing interaction

                      var painting = false;

                      function getCell(e) {

                        var rect = canvas.getBoundingClientRect();

                        var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                        var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                        var gx = Math.floor(ex * (W / rect.width) / cellW);

                        var gy = Math.floor(ey * (H / rect.height) / cellH);

                        return { x: gx, y: gy };

                      }

                      function paintCell(e) {

                        var c = getCell(e);

                        if (c.x >= 0 && c.x < gridSize && c.y >= 0 && c.y < gridSize) {

                          var key = c.x + ',' + c.y;

                          if ((d.lifeTool || 'draw') === 'erase') { delete grid[key]; delete ageGrid[key]; }

                          else { grid[key] = 1; ageGrid[key] = 1; }

                          upd('lifeGrid', Object.assign({}, grid));

                          upd('lifePop', Object.keys(grid).length);

                          drawGrid();

                        }

                      }

                      canvas.onmousedown = canvas.ontouchstart = function (e) { e.preventDefault(); painting = true; paintCell(e); };

                      canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) paintCell(e); };

                      canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

                      canvas.onmouseleave = function () { painting = false; };



                      // Sparkline drawing

                      function drawSparkline() {

                        var sc = document.getElementById('lifeSparkline');

                        if (!sc) return;

                        var sctx = sc.getContext('2d');

                        var sw = sc.width, sh = sc.height;

                        sctx.fillStyle = '#0d120d'; sctx.fillRect(0, 0, sw, sh);

                        if (popHistory.length < 2) return;

                        var maxP = Math.max.apply(null, popHistory);

                        if (maxP <= 0) maxP = 1;

                        sctx.strokeStyle = '#22c55e'; sctx.lineWidth = 1.5;

                        sctx.beginPath();

                        for (var i = 0; i < popHistory.length; i++) {

                          var px = (i / (popHistory.length - 1)) * sw;

                          var py = sh - (popHistory[i] / maxP) * (sh - 8) - 4;

                          if (i === 0) sctx.moveTo(px, py); else sctx.lineTo(px, py);

                        }

                        sctx.stroke();

                        // Fill under curve

                        sctx.lineTo(sw, sh); sctx.lineTo(0, sh); sctx.closePath();

                        sctx.fillStyle = 'rgba(34,197,94,0.1)'; sctx.fill();

                        // Labels

                        sctx.font = '9px sans-serif'; sctx.textAlign = 'right'; sctx.textBaseline = 'top';

                        sctx.fillStyle = '#4ade80';

                        sctx.fillText(String(maxP), sw - 4, 2);

                        sctx.fillText('Pop', sw - 4, 12);

                      }



                      // Animation loop

                      function animate(timestamp) {

                        running = canvas.getAttribute('data-running') === '1';

                        speed = parseInt(canvas.getAttribute('data-speed') || '10');

                        wrap = canvas.getAttribute('data-wrap') !== '0';

                        hue = parseInt(canvas.getAttribute('data-hue') || '140');

                        vizMode = canvas.getAttribute('data-vizmode') || 'normal';

                        // Read custom rules

                        var ruleB = canvas.getAttribute('data-ruleb') || '3';

                        var ruleS = canvas.getAttribute('data-rules') || '23';

                        birthSet = parseRuleSet(ruleB);

                        survivalSet = parseRuleSet(ruleS);

                        var doStep = canvas.getAttribute('data-step');

                        // Capture challenge initial state before first step

                        var challenge = canvas.getAttribute('data-challenge');

                        if (challenge && !challengeInitGridStr && (running || (doStep && doStep !== canvas._lastStep))) {

                          challengeInitGridStr = gridToString();

                          challengeInitPop = Object.keys(grid).length;

                        }

                        if (doStep && doStep !== canvas._lastStep) {

                          canvas._lastStep = doStep;

                          step();

                        }

                        var interval = 1000 / speed;

                        if (running && timestamp - lastFrameTime >= interval) {

                          lastFrameTime = timestamp;

                          step();

                        }

                        drawGrid();

                        drawSparkline();

                        canvas._lifeAnim = requestAnimationFrame(animate);

                      }

                      // Set initial data attributes

                      canvas.setAttribute('data-running', d.lifeRunning ? '1' : '0');

                      canvas.setAttribute('data-speed', String(typeof d.lifeSpeed === 'number' ? d.lifeSpeed : 10));

                      canvas.setAttribute('data-wrap', d.lifeWrap === false ? '0' : '1');

                      canvas.setAttribute('data-hue', String(typeof d.lifeHue === 'number' ? d.lifeHue : 140));

                      canvas.setAttribute('data-step', String(d.lifeStep || 0));

                      canvas.setAttribute('data-vizmode', d.lifeVizMode || 'normal');

                      canvas.setAttribute('data-ruleb', d.lifeRuleB || '3');

                      canvas.setAttribute('data-rules', d.lifeRuleS || '23');

                      canvas.setAttribute('data-challenge', d.lifeChallenge || '');

                      canvas.setAttribute('data-challengestatus', d.lifeChallengeStatus || '');

                      canvas._lastStep = String(d.lifeStep || 0);

                      drawGrid();

                      animate(0);

                    }

                  }),

                  // Population Sparkline

                  React.createElement("canvas", { id: 'lifeSparkline', width: 600, height: 60,

                    key: 'lifeSpark-' + (d.lifeClear || 0),

                    className: "rounded-lg border border-emerald-200 mx-auto block", style: { maxWidth: '100%', background: '#0d120d' }

                  }),

                  React.createElement("p", { className: "text-[9px] text-center text-slate-400" }, '\uD83D\uDCC8 Population over time')

                )

              ),

              // Data attribute sync

              React.createElement("div", { ref: function () {

                var c = document.getElementById('lifeCanvas');

                if (c) {

                  c.setAttribute('data-running', d.lifeRunning ? '1' : '0');

                  c.setAttribute('data-speed', String(typeof d.lifeSpeed === 'number' ? d.lifeSpeed : 10));

                  c.setAttribute('data-wrap', d.lifeWrap === false ? '0' : '1');

                  c.setAttribute('data-hue', String(typeof d.lifeHue === 'number' ? d.lifeHue : 140));

                  c.setAttribute('data-step', String(d.lifeStep || 0));

                  c.setAttribute('data-vizmode', d.lifeVizMode || 'normal');

                  c.setAttribute('data-ruleb', d.lifeRuleB || '3');

                  c.setAttribute('data-rules', d.lifeRuleS || '23');

                  c.setAttribute('data-challenge', d.lifeChallenge || '');

                  c.setAttribute('data-challengestatus', d.lifeChallengeStatus || '');

                }

              }, style: { display: 'none' } })

            ),



            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'art-' + Date.now(), tool: 'artStudio', label: 'Art Studio', data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Art snapshot saved!', 'success'); }, className: "mt-4 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-full hover:from-pink-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          );
      })();
    }
  });

  // ═══ 🔬 dataStudio (dataStudio) ═══
  window.StemLab.registerTool('dataStudio', {
    icon: '🔬',
    label: 'dataStudio',
    desc: '',
    color: 'slate',
    category: 'creative',
    render: function(ctx) {
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

      // ── Tool body (dataStudio) ──
      return (function() {
var d = (labToolData && labToolData._dataStudio) || {};

          var updDS = function (key, val) {

            setLabToolData(function (prev) {

              var ds = Object.assign({}, (prev && prev._dataStudio) || {});

              ds[key] = val;

              return Object.assign({}, prev, { _dataStudio: ds });

            });

          };

          var chartType = d.chartType || 'bar';

          var dataRows = d.dataRows || [

            { label: 'Apples', value: 45 },

            { label: 'Bananas', value: 30 },

            { label: 'Oranges', value: 55 },

            { label: 'Grapes', value: 25 },

            { label: 'Cherries', value: 40 }

          ];

          var chartTitle = d.chartTitle || 'My Data';

          var editRow = d.editRow || { label: '', value: '' };

          var showStats = d.showStats !== undefined ? d.showStats : true;

          var showTrendline = d.showTrendline || false;

          var sortOrder = d.sortOrder || 'none';  // 'none', 'asc', 'desc'

          var filterMin = typeof d.filterMin === 'number' ? d.filterMin : '';

          var filterMax = typeof d.filterMax === 'number' ? d.filterMax : '';



          var CHART_TYPES = [

            { id: 'bar', icon: '📊', label: 'Bar Chart' },

            { id: 'pie', icon: '🥧', label: 'Pie Chart' },

            { id: 'line', icon: '📈', label: 'Line Graph' },

            { id: 'scatter', icon: '⚬', label: 'Scatter Plot' },

            { id: 'histogram', icon: '📉', label: 'Histogram' }

          ];



          var PRESETS = [

            { label: '🍎 Fruit Sales', data: [{ label: 'Apples', value: 45 }, { label: 'Bananas', value: 30 }, { label: 'Oranges', value: 55 }, { label: 'Grapes', value: 25 }, { label: 'Cherries', value: 40 }], title: 'Fruit Sales' },

            { label: '🌡️ Monthly Temps (°F)', data: [{ label: 'Jan', value: 32 }, { label: 'Feb', value: 35 }, { label: 'Mar', value: 45 }, { label: 'Apr', value: 55 }, { label: 'May', value: 65 }, { label: 'Jun', value: 75 }, { label: 'Jul', value: 82 }, { label: 'Aug', value: 80 }, { label: 'Sep', value: 70 }, { label: 'Oct', value: 58 }, { label: 'Nov', value: 45 }, { label: 'Dec', value: 35 }], title: 'Monthly Temperature' },

            { label: '📚 Class Grades', data: [{ label: 'A', value: 8 }, { label: 'B', value: 15 }, { label: 'C', value: 12 }, { label: 'D', value: 5 }, { label: 'F', value: 2 }], title: 'Grade Distribution' },

            { label: '🏀 Sports Points', data: [{ label: 'Game 1', value: 22 }, { label: 'Game 2', value: 18 }, { label: 'Game 3', value: 31 }, { label: 'Game 4', value: 27 }, { label: 'Game 5', value: 35 }, { label: 'Game 6', value: 29 }], title: 'Points Per Game' },

            { label: '🎲 Dice Rolls (50)', data: (function () { var c = [0, 0, 0, 0, 0, 0]; for (var i = 0; i < 50; i++) c[Math.floor(Math.random() * 6)]++; return c.map(function (v, j) { return { label: '' + (j + 1), value: v }; }); })(), title: 'Dice Roll Distribution' }

          ];



          // CSV import handler

          var handleCSVImport = function (text) {

            try {

              var lines = text.trim().split('\n');

              var rows = [];

              lines.forEach(function (line, idx) {

                var parts = line.split(',').map(function (s) { return s.trim().replace(/^"|"$/g, ''); });

                if (parts.length >= 2) {

                  var val = parseFloat(parts[1]);

                  if (!isNaN(val)) rows.push({ label: parts[0] || ('Row ' + (idx + 1)), value: val });

                }

              });

              if (rows.length > 0) {

                updDS('dataRows', rows);

                if (addToast) addToast('Imported ' + rows.length + ' data points!', 'success');

                if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 5, 'CSV import');

              }

            } catch (e) {

              if (addToast) addToast('CSV import failed. Use format: Label, Value', 'warning');

            }

          };



          // Apply sort and filter

          var filteredRows = dataRows;

          if (filterMin !== '' && !isNaN(filterMin)) filteredRows = filteredRows.filter(function (r) { return r.value >= filterMin; });

          if (filterMax !== '' && !isNaN(filterMax)) filteredRows = filteredRows.filter(function (r) { return r.value <= filterMax; });

          if (sortOrder === 'asc') filteredRows = filteredRows.slice().sort(function (a, b) { return a.value - b.value; });

          else if (sortOrder === 'desc') filteredRows = filteredRows.slice().sort(function (a, b) { return b.value - a.value; });

          var displayRows = filteredRows;



          // Statistics (on displayed rows)

          var values = displayRows.map(function (r) { return r.value; });

          var total = values.reduce(function (s, v) { return s + v; }, 0);

          var mean = values.length > 0 ? total / values.length : 0;

          var sorted = values.slice().sort(function (a, b) { return a - b; });

          var median = sorted.length > 0 ? (sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;

          var maxVal = Math.max.apply(null, values.concat([1]));

          var minVal = Math.min.apply(null, values.concat([0]));

          var stdDev = values.length > 0 ? Math.sqrt(values.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0) / values.length) : 0;

          // Mode

          var modeVal = '-';

          if (values.length > 0) {

            var freq = {}; values.forEach(function (v) { freq[v] = (freq[v] || 0) + 1; });

            var maxFreq = Math.max.apply(null, Object.values(freq));

            var modes = Object.keys(freq).filter(function (k) { return freq[k] === maxFreq; }).map(Number);

            modeVal = maxFreq === 1 ? 'None' : modes.join(', ');

          }

          // Quartiles

          var q1 = 0, q3 = 0, iqr = 0;

          if (sorted.length >= 4) {

            var lh = sorted.slice(0, Math.floor(sorted.length / 2));

            var uh = sorted.slice(Math.ceil(sorted.length / 2));

            q1 = lh.length % 2 ? lh[Math.floor(lh.length / 2)] : (lh[lh.length / 2 - 1] + lh[lh.length / 2]) / 2;

            q3 = uh.length % 2 ? uh[Math.floor(uh.length / 2)] : (uh[uh.length / 2 - 1] + uh[uh.length / 2]) / 2;

            iqr = q3 - q1;

          } else if (sorted.length > 0) { q1 = sorted[0]; q3 = sorted[sorted.length - 1]; iqr = q3 - q1; }

          var range = maxVal - minVal;



          // Linear regression for trendline

          function calcTrendline(rows) {

            var n = rows.length;

            if (n < 2) return null;

            var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

            rows.forEach(function (r, i) { sumX += i; sumY += r.value; sumXY += i * r.value; sumX2 += i * i; });

            var denom = n * sumX2 - sumX * sumX;

            if (denom === 0) return null;

            var slope = (n * sumXY - sumX * sumY) / denom;

            var intercept = (sumY - slope * sumX) / n;

            return { slope: slope, intercept: intercept };

          }



          // Color palette

          var COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#eab308', '#3b82f6'];



          // Dark theme

          var _bg = isDark || isContrast ? '#0f172a' : '#f0fdfa';

          var _text = isDark || isContrast ? '#e0e7ff' : '#1e293b';

          var _card = isDark || isContrast ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)';

          var _border = isDark || isContrast ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)';

          var _accent = isDark || isContrast ? '#22d3ee' : '#0891b2';

          var _muted = isDark || isContrast ? '#94a3b8' : '#64748b';

          var _btnBg = isDark || isContrast ? '#0891b2' : '#06b6d4';

          var _svgBg = isDark || isContrast ? '#1e293b' : '#ffffff';



          // SVG dimensions

          var W = 440, H = 320, pad = 50;

          var chartTop = 45; // extra top margin so title doesn't overlap data



          return React.createElement("div", { className: "p-4 space-y-4", style: { color: _text } },

            // Header

            React.createElement("div", { className: "flex items-center justify-between mb-2" },

              React.createElement("div", null,

                React.createElement("h3", { className: "text-lg font-bold flex items-center gap-2" }, "📈 Data Studio"),

                React.createElement("p", { className: "text-xs", style: { color: _muted } }, "Create charts, import data & explore statistics")

              ),

              React.createElement("div", { className: "flex gap-2" },

                React.createElement("button", {

                  onClick: function () { updDS('showStats', !showStats); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: showStats ? _btnBg : _card, color: showStats ? '#fff' : _text, border: '1px solid ' + _border }

                }, showStats ? '📊 Stats On' : '📊 Stats'),

                React.createElement("button", {

                  onClick: function () { setStemLabTool(null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: _card, border: '1px solid ' + _border, color: _text }

                }, "← Back")

              )

            ),



            // Chart type selector

            React.createElement("div", { className: "flex gap-2" },

              CHART_TYPES.map(function (ct) {

                return React.createElement("button", {

                  key: ct.id,

                  onClick: function () { if (ct.id !== chartType) { updDS('chartType', ct.id); if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 3, ct.label + ' explored'); } },

                  className: "flex-1 p-2 rounded-xl text-center transition-all",

                  style: { background: chartType === ct.id ? _btnBg : _card, color: chartType === ct.id ? '#fff' : _text, border: '1px solid ' + (chartType === ct.id ? _accent : _border) }

                },

                  React.createElement("div", { className: "text-lg" }, ct.icon),

                  React.createElement("div", { className: "text-[10px] font-bold" }, ct.label)

                );

              })

            ),



            // Chart title

            React.createElement("input", {

              type: "text", value: chartTitle,

              onChange: function (e) { updDS('chartTitle', e.target.value); },

              placeholder: "Chart title...",

              className: "w-full px-3 py-2 rounded-xl text-sm font-bold text-center",

              style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' }

            }),



            // ── SVG Chart Rendering ──

            React.createElement("div", { className: "rounded-2xl overflow-hidden", style: { border: '1px solid ' + _border } },

              React.createElement("svg", { viewBox: '0 0 ' + W + ' ' + H, className: "w-full", style: { background: _svgBg, maxHeight: '340px' } },

                // Title

                React.createElement("text", { x: W / 2, y: 18, textAnchor: "middle", style: { fontSize: '13px', fontWeight: 'bold', fill: _text } }, chartTitle),



                // ── Bar Chart ──

                chartType === 'bar' && displayRows.length > 0 && (() => {

                  var barW = Math.min(40, (W - 2 * pad) / displayRows.length - 4);

                  var gap = (W - 2 * pad) / displayRows.length;

                  return React.createElement("g", null,

                    // Y axis

                    React.createElement("line", { x1: pad, y1: chartTop, x2: pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    // X axis

                    React.createElement("line", { x1: pad, y1: H - pad, x2: W - 10, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    // Y labels

                    [0, 0.25, 0.5, 0.75, 1].map(function (frac, i) {

                      var yVal = Math.round(maxVal * frac);

                      var yPos = (H - pad) - frac * (H - pad - chartTop);

                      return React.createElement("g", { key: 'yl' + i },

                        React.createElement("text", { x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '9px', fill: _muted } }, yVal),

                        React.createElement("line", { x1: pad, y1: yPos, x2: W - 10, y2: yPos, stroke: _muted, strokeWidth: 0.2, strokeDasharray: "3 3" })

                      );

                    }),

                    // Bars

                    displayRows.map(function (row, i) {

                      var barH = maxVal > 0 ? (row.value / maxVal) * (H - pad - chartTop) : 0;

                      var x = pad + i * gap + (gap - barW) / 2;

                      var y = (H - pad) - barH;

                      return React.createElement("g", { key: 'bar' + i },

                        React.createElement("rect", { x: x, y: y, width: barW, height: barH, rx: 3, fill: COLORS[i % COLORS.length], opacity: 0.85 }),

                        React.createElement("text", { x: x + barW / 2, y: y - 4, textAnchor: "middle", style: { fontSize: '9px', fontWeight: 'bold', fill: _text } }, row.value),

                        React.createElement("text", { x: x + barW / 2, y: H - pad + 12, textAnchor: "middle", style: { fontSize: '8px', fill: _muted } }, row.label.length > 6 ? row.label.substring(0, 5) + '..' : row.label)

                      );

                    })

                  );

                })(),



                // ── Pie Chart ──

                chartType === 'pie' && displayRows.length > 0 && (() => {

                  var cx = W / 2, cy = (H + 10) / 2, r = Math.min(W, H) / 2.8;

                  var cumAngle = -Math.PI / 2;

                  return React.createElement("g", null,

                    displayRows.map(function (row, i) {

                      var angle = total > 0 ? (row.value / total) * 2 * Math.PI : 0;

                      var startAngle = cumAngle;

                      cumAngle += angle;

                      var endAngle = cumAngle;

                      var largeArc = angle > Math.PI ? 1 : 0;

                      var x1 = cx + r * Math.cos(startAngle);

                      var y1 = cy + r * Math.sin(startAngle);

                      var x2 = cx + r * Math.cos(endAngle);

                      var y2 = cy + r * Math.sin(endAngle);

                      var midAngle = startAngle + angle / 2;

                      var lx = cx + (r + 16) * Math.cos(midAngle);

                      var ly = cy + (r + 16) * Math.sin(midAngle);

                      var pct = total > 0 ? Math.round(row.value / total * 100) : 0;

                      if (displayRows.length === 1) {

                        return React.createElement("g", { key: 'pie' + i },

                          React.createElement("circle", { cx: cx, cy: cy, r: r, fill: COLORS[0], opacity: 0.85 }),

                          React.createElement("text", { x: cx, y: cy + 4, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold', fill: '#fff' } }, '100%')

                        );

                      }

                      return React.createElement("g", { key: 'pie' + i },

                        React.createElement("path", {

                          d: 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z',

                          fill: COLORS[i % COLORS.length], opacity: 0.85, stroke: _svgBg, strokeWidth: 1.5

                        }),

                        pct >= 5 && React.createElement("text", { x: lx, y: ly + 3, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold', fill: _text } }, row.label.substring(0, 5) + ' ' + pct + '%')

                      );

                    })

                  );

                })(),



                // ── Line Graph ──

                chartType === 'line' && displayRows.length > 0 && (() => {

                  var rangeYLine = maxVal - minVal || 1;

                  var gap = displayRows.length > 1 ? (W - 2 * pad) / (displayRows.length - 1) : 0;

                  var pts = displayRows.map(function (row, i) {

                    var x = displayRows.length === 1 ? W / 2 : pad + i * gap;

                    var y = (H - pad) - ((row.value - minVal) / rangeYLine) * (H - pad - chartTop);

                    return { x: x, y: y, label: row.label, value: row.value };

                  });

                  var pathD = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + ' ' + p.x + ' ' + p.y; }).join(' ');

                  // Area fill

                  var areaD = pathD + ' L ' + pts[pts.length - 1].x + ' ' + (H - pad) + ' L ' + pts[0].x + ' ' + (H - pad) + ' Z';

                  // Trendline

                  var trendEls = [];

                  if (showTrendline && displayRows.length >= 2) {

                    var tl = calcTrendline(displayRows);

                    if (tl) {

                      var tlY0 = (H - pad) - ((tl.intercept - minVal) / rangeYLine) * (H - pad - chartTop);

                      var tlY1 = (H - pad) - (((tl.slope * (displayRows.length - 1) + tl.intercept) - minVal) / rangeYLine) * (H - pad - chartTop);

                      trendEls.push(React.createElement("line", { key: 'tl', x1: pad, y1: tlY0, x2: pad + (displayRows.length - 1) * gap, y2: tlY1, stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '6 3', opacity: 0.7 }));

                      trendEls.push(React.createElement("text", { key: 'tl-label', x: W - 12, y: tlY1 - 5, textAnchor: "end", style: { fontSize: '7px', fontWeight: 'bold', fill: '#ef4444' } }, 'y=' + tl.slope.toFixed(1) + 'x+' + tl.intercept.toFixed(1)));

                    }

                  }

                  return React.createElement("g", null,

                    React.createElement("line", { x1: pad, y1: chartTop, x2: pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    React.createElement("line", { x1: pad, y1: H - pad, x2: W - 10, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    [0, 0.25, 0.5, 0.75, 1].map(function (frac, i) {

                      var yVal = (minVal + rangeYLine * frac).toFixed(0);

                      var yPos = (H - pad) - frac * (H - pad - chartTop);

                      return React.createElement("text", { key: 'lyl' + i, x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '9px', fill: _muted } }, yVal);

                    }),

                    React.createElement("path", { d: areaD, fill: _accent, opacity: 0.08 }),

                    React.createElement("path", { d: pathD, fill: "none", stroke: _accent, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }),

                    trendEls,

                    pts.map(function (p, i) {

                      return React.createElement("g", { key: 'lp' + i },

                        React.createElement("circle", { cx: p.x, cy: p.y, r: 4, fill: _accent, stroke: _svgBg, strokeWidth: 2 }),

                        React.createElement("text", { x: p.x, y: p.y - 8, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold', fill: _text } }, p.value),

                        React.createElement("text", { x: p.x, y: H - pad + 12, textAnchor: "middle", style: { fontSize: '7px', fill: _muted } }, p.label.length > 5 ? p.label.substring(0, 4) + '..' : p.label)

                      );

                    })

                  );

                })(),



                // ── Scatter Plot ──

                chartType === 'scatter' && displayRows.length > 0 && (() => {

                  var rangeY = maxVal - minVal || 1;

                  var gap = displayRows.length > 1 ? (W - 2 * pad) / (displayRows.length - 1) : 0;

                  var pts = displayRows.map(function (row, i) {

                    var x = displayRows.length === 1 ? W / 2 : pad + i * gap;

                    var y = (H - pad) - ((row.value - minVal) / rangeY) * (H - pad - 28);

                    return { x: x, y: y, label: row.label, value: row.value };

                  });

                  // Trendline for scatter

                  var trendEls = [];

                  if (showTrendline && displayRows.length >= 2) {

                    var tl = calcTrendline(displayRows);

                    if (tl) {

                      var tlY0 = (H - pad) - ((tl.intercept - minVal) / rangeY) * (H - pad - 28);

                      var tlY1 = (H - pad) - (((tl.slope * (displayRows.length - 1) + tl.intercept) - minVal) / rangeY) * (H - pad - 28);

                      trendEls.push(React.createElement("line", { key: 'tl', x1: pad, y1: tlY0, x2: pad + (displayRows.length - 1) * gap, y2: tlY1, stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '6 3', opacity: 0.7 }));

                      trendEls.push(React.createElement("text", { key: 'tl-label', x: W - 12, y: tlY1 - 5, textAnchor: "end", style: { fontSize: '7px', fontWeight: 'bold', fill: '#ef4444' } }, 'y=' + tl.slope.toFixed(1) + 'x+' + tl.intercept.toFixed(1)));

                      // R² value

                      var ssRes = 0, ssTot = 0;

                      displayRows.forEach(function (r, i) { var pred = tl.slope * i + tl.intercept; ssRes += Math.pow(r.value - pred, 2); ssTot += Math.pow(r.value - mean, 2); });

                      var rSquared = ssTot > 0 ? (1 - ssRes / ssTot) : 0;

                      trendEls.push(React.createElement("text", { key: 'r2', x: W - 12, y: tlY1 + 5, textAnchor: "end", style: { fontSize: '7px', fill: '#ef4444', opacity: 0.7 } }, 'R²=' + rSquared.toFixed(3)));

                    }

                  }

                  return React.createElement("g", null,

                    React.createElement("line", { x1: pad, y1: 25, x2: pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    React.createElement("line", { x1: pad, y1: H - pad, x2: W - 10, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    [0, 0.25, 0.5, 0.75, 1].map(function (frac, i) {

                      var yVal = (minVal + rangeY * frac).toFixed(0);

                      var yPos = (H - pad) - frac * (H - pad - 28);

                      return React.createElement("g", { key: 'syl' + i },

                        React.createElement("text", { x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '9px', fill: _muted } }, yVal),

                        React.createElement("line", { x1: pad, y1: yPos, x2: W - 10, y2: yPos, stroke: _muted, strokeWidth: 0.2, strokeDasharray: "3 3" })

                      );

                    }),

                    trendEls,

                    pts.map(function (p, i) {

                      return React.createElement("g", { key: 'sp' + i },

                        React.createElement("circle", { cx: p.x, cy: p.y, r: 5, fill: COLORS[i % COLORS.length], stroke: _svgBg, strokeWidth: 2, opacity: 0.85 }),

                        React.createElement("text", { x: p.x, y: p.y - 8, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold', fill: _text } }, p.value),

                        React.createElement("text", { x: p.x, y: H - pad + 12, textAnchor: "middle", style: { fontSize: '7px', fill: _muted } }, p.label.length > 5 ? p.label.substring(0, 4) + '..' : p.label)

                      );

                    })

                  );

                })(),



                // ── Histogram ──

                chartType === 'histogram' && displayRows.length > 0 && (() => {

                  // For histogram, bin the values

                  var numBins = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(values.length))));

                  var range = maxVal - minVal || 1;

                  var binW = range / numBins;

                  var bins = [];

                  for (var b = 0; b < numBins; b++) bins.push({ lo: minVal + b * binW, hi: minVal + (b + 1) * binW, count: 0 });

                  values.forEach(function (v) {

                    var bi = Math.min(numBins - 1, Math.floor((v - minVal) / binW));

                    bins[bi].count++;

                  });

                  var maxCount = Math.max.apply(null, bins.map(function (b) { return b.count; }).concat([1]));

                  var bw = (W - 2 * pad) / numBins - 2;

                  return React.createElement("g", null,

                    React.createElement("line", { x1: pad, y1: 25, x2: pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    React.createElement("line", { x1: pad, y1: H - pad, x2: W - 10, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    bins.map(function (bin, i) {

                      var bh = maxCount > 0 ? (bin.count / maxCount) * (H - pad - 28) : 0;

                      var x = pad + i * ((W - 2 * pad) / numBins) + 1;

                      var y = (H - pad) - bh;

                      return React.createElement("g", { key: 'hb' + i },

                        React.createElement("rect", { x: x, y: y, width: bw, height: bh, fill: COLORS[i % COLORS.length], opacity: 0.85, rx: 2 }),

                        bin.count > 0 && React.createElement("text", { x: x + bw / 2, y: y - 3, textAnchor: "middle", style: { fontSize: '9px', fontWeight: 'bold', fill: _text } }, bin.count),

                        React.createElement("text", { x: x + bw / 2, y: H - pad + 11, textAnchor: "middle", style: { fontSize: '7px', fill: _muted } }, bin.lo.toFixed(0) + '-' + bin.hi.toFixed(0))

                      );

                    })

                  );

                })()

              )

            ),



            // ── Sort / Filter / Trendline Controls ──

            React.createElement("div", { className: "flex gap-2 flex-wrap items-center", style: { marginBottom: 4 } },

              // Sort controls

              React.createElement("span", { className: "text-[10px] font-bold", style: { color: _muted } }, "SORT:"),

              ['none', 'asc', 'desc'].map(function (s) {

                var labels = { none: '— None', asc: '↑ Asc', desc: '↓ Desc' };

                return React.createElement("button", {

                  key: s,

                  onClick: function () { updDS('sortOrder', s); },

                  className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all",

                  style: { background: sortOrder === s ? _btnBg : _card, color: sortOrder === s ? '#fff' : _text, border: '1px solid ' + _border }

                }, labels[s]);

              }),

              // Filter controls

              React.createElement("span", { className: "text-[10px] font-bold ml-2", style: { color: _muted } }, "FILTER:"),

              React.createElement("input", {

                type: "number", placeholder: "Min", value: filterMin,

                onChange: function (e) { updDS('filterMin', e.target.value === '' ? '' : parseFloat(e.target.value)); },

                className: "w-14 px-1.5 py-1 rounded-lg text-[10px] font-mono",

                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' }

              }),

              React.createElement("span", { className: "text-[10px]", style: { color: _muted } }, "to"),

              React.createElement("input", {

                type: "number", placeholder: "Max", value: filterMax,

                onChange: function (e) { updDS('filterMax', e.target.value === '' ? '' : parseFloat(e.target.value)); },

                className: "w-14 px-1.5 py-1 rounded-lg text-[10px] font-mono",

                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' }

              }),

              (filterMin !== '' || filterMax !== '') && React.createElement("button", {

                onClick: function () { updDS('filterMin', ''); updDS('filterMax', ''); },

                className: "px-2 py-1 rounded-lg text-[10px] font-bold",

                style: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }

              }, "✕ Clear"),

              displayRows.length !== dataRows.length && React.createElement("span", { className: "text-[10px] font-bold", style: { color: _accent } }, '(' + displayRows.length + '/' + dataRows.length + ' shown)'),

              // Trendline toggle (for line/scatter)

              (chartType === 'line' || chartType === 'scatter') && React.createElement("button", {

                onClick: function () { updDS('showTrendline', !showTrendline); },

                className: "px-2.5 py-1 rounded-lg text-[10px] font-bold ml-auto transition-all",

                style: { background: showTrendline ? '#ef4444' : _card, color: showTrendline ? '#fff' : _text, border: '1px solid ' + (showTrendline ? '#ef4444' : _border) }

              }, showTrendline ? '📉 Trendline On' : '📉 Trendline')

            ),



            // ── Preset Datasets ──

            React.createElement("div", { className: "flex gap-2 flex-wrap" },

              React.createElement("span", { className: "text-[10px] font-bold self-center", style: { color: _muted } }, "PRESETS:"),

              PRESETS.map(function (p, i) {

                return React.createElement("button", {

                  key: i,

                  onClick: function () { updDS('dataRows', p.data); updDS('chartTitle', p.title); if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 3, 'Preset: ' + p.title); },

                  className: "px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105",

                  style: { background: _card, border: '1px solid ' + _border, color: _accent }

                }, p.label);

              })

            ),



            // ── CSV Import ──

            React.createElement("div", { className: "flex gap-2" },

              React.createElement("button", {

                onClick: function () {

                  var el = document.createElement('input');

                  el.type = 'file';

                  el.accept = '.csv,.txt';

                  el.onchange = function (e) {

                    var file = e.target.files[0];

                    if (file) {

                      var reader = new FileReader();

                      reader.onload = function (ev) { handleCSVImport(ev.target.result); };

                      reader.readAsText(file);

                    }

                  };

                  el.click();

                },

                className: "px-3 py-2 rounded-xl text-xs font-bold transition-all",

                style: { background: _card, border: '1px solid ' + _border, color: _accent }

              }, "📂 Import CSV"),

              React.createElement("button", {

                onClick: function () {

                  var csv = 'Label,Value\n' + dataRows.map(function (r) { return r.label + ',' + r.value; }).join('\n');

                  var blob = new Blob([csv], { type: 'text/csv' });

                  var url = URL.createObjectURL(blob);

                  var a = document.createElement('a');

                  a.href = url; a.download = (chartTitle || 'data') + '.csv';

                  a.click(); URL.revokeObjectURL(url);

                },

                className: "px-3 py-2 rounded-xl text-xs font-bold transition-all",

                style: { background: _card, border: '1px solid ' + _border, color: _accent }

              }, "💾 Export CSV")

            ),



            // ── Data Editor ──

            React.createElement("div", { className: "rounded-2xl p-3", style: { background: _card, border: '1px solid ' + _border } },

              React.createElement("div", { className: "text-xs font-bold mb-2", style: { color: _accent } }, "📝 Data (" + dataRows.length + " items" + (displayRows.length !== dataRows.length ? ', ' + displayRows.length + ' shown' : '') + ")"),

              // Add row

              React.createElement("div", { className: "flex gap-2 mb-2" },

                React.createElement("input", {

                  type: "text", placeholder: "Label",

                  value: editRow.label,

                  onChange: function (e) { updDS('editRow', { label: e.target.value, value: editRow.value }); },

                  className: "flex-1 px-2 py-1.5 rounded-lg text-xs",

                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' }

                }),

                React.createElement("input", {

                  type: "number", placeholder: "Value",

                  value: editRow.value,

                  onChange: function (e) { updDS('editRow', { label: editRow.label, value: e.target.value }); },

                  onKeyDown: function (e) {

                    if (e.key === 'Enter' && editRow.label && editRow.value !== '') {

                      updDS('dataRows', dataRows.concat([{ label: editRow.label, value: parseFloat(editRow.value) || 0 }]));

                      updDS('editRow', { label: '', value: '' });

                    }

                  },

                  className: "w-20 px-2 py-1.5 rounded-lg text-xs font-mono",

                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' }

                }),

                React.createElement("button", {

                  onClick: function () {

                    if (editRow.label && editRow.value !== '') {

                      updDS('dataRows', dataRows.concat([{ label: editRow.label, value: parseFloat(editRow.value) || 0 }]));

                      updDS('editRow', { label: '', value: '' });

                    }

                  },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: _btnBg, color: '#fff' }

                }, "+ Add")

              ),

              // Data rows

              React.createElement("div", { className: "max-h-28 overflow-y-auto space-y-1" },

                dataRows.map(function (row, i) {

                  return React.createElement("div", { key: i, className: "flex items-center gap-2 py-1 px-2 rounded-lg text-xs", style: { background: _svgBg } },

                    React.createElement("div", { className: "w-3 h-3 rounded-full", style: { background: COLORS[i % COLORS.length] } }),

                    React.createElement("span", { className: "flex-1 font-bold" }, row.label),

                    React.createElement("span", { className: "font-mono", style: { color: _muted } }, row.value),

                    React.createElement("button", {

                      onClick: function () { updDS('dataRows', dataRows.filter(function (_, j) { return j !== i; })); },

                      className: "text-red-400 hover:text-red-600 font-bold text-xs"

                    }, "✕")

                  );

                })

              ),

              // Clear

              dataRows.length > 0 && React.createElement("button", {

                onClick: function () { updDS('dataRows', []); },

                className: "mt-2 px-3 py-1 rounded-lg text-[10px] font-bold",

                style: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }

              }, "🗑 Clear All")

            ),



            // ── Statistics Panel ──

            showStats && dataRows.length > 0 && React.createElement("div", { className: "grid grid-cols-4 gap-2" },

              [

                { label: 'Sum', val: total.toFixed(1) },

                { label: 'Mean', val: mean.toFixed(1) },

                { label: 'Median', val: median.toFixed(1) },

                { label: 'Std Dev', val: stdDev.toFixed(1) }

              ].map(function (stat, i) {

                return React.createElement("div", { key: i, className: "p-2 rounded-xl text-center", style: { background: _card, border: '1px solid ' + _border } },

                  React.createElement("div", { className: "text-[9px] font-bold uppercase", style: { color: _muted } }, stat.label),

                  React.createElement("div", { className: "text-sm font-bold font-mono", style: { color: _accent } }, stat.val)

                );

              })

            )

          );
      })();
    }
  });

  // ═══ 🔬 codingPlayground (codingPlayground) ═══
  window.StemLab.registerTool('codingPlayground', {
    icon: '🔬',
    label: 'codingPlayground',
    desc: '',
    color: 'slate',
    category: 'creative',
    render: function(ctx) {
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

      // ── Tool body (codingPlayground) ──
      return (function() {
// ── State from labToolData ──

          var d = (labToolData && labToolData._codingPlayground) || {};

          var upd = function (key, val) {

            setLabToolData(function (prev) {

              var cp = Object.assign({}, (prev && prev._codingPlayground) || {});

              cp[key] = val;

              return Object.assign({}, prev, { _codingPlayground: cp });

            });

          };

          var updMulti = function (obj) {

            setLabToolData(function (prev) {

              var cp = Object.assign({}, (prev && prev._codingPlayground) || {});

              Object.keys(obj).forEach(function (k) { cp[k] = obj[k]; });

              return Object.assign({}, prev, { _codingPlayground: cp });

            });

          };



          // ── Defaults ──

          var blocks = d.blocks || [];

          var turtleState = d.turtle || { x: 250, y: 250, angle: -90, penDown: true, color: '#6366f1', width: 2 };

          var drawnLines = d.lines || [];

          var running = d.running || false;

          var stepIdx = d.stepIdx != null ? d.stepIdx : -1;

          var codeMode = d.codeMode || 'blocks';

          var textCode = d.textCode || '';

          var challengeIdx = d.challengeIdx != null ? d.challengeIdx : -1;

          var completed = d.completed || [];

          var speed = d.speed || 200;

          var showTurtle = d.showTurtle !== false;

          var cumulativeMode = d.cumulativeMode || false;

          var runHistory = d.history || [];

          var undoStack = d.undoStack || [];

          var redoStack = d.redoStack || [];

          var showTemplates = d.showTemplates || false;

          var tutorialDismissed = d.tutorialDismissed || false;



          // ── Robot Grid Mode State ──

          var playgroundMode = d.playgroundMode || 'turtle';

          var robotGrid = d.robotGrid || null;

          var robotPos = d.robotPos || { x: 0, y: 0, dir: 0 }; // dir: 0=up,1=right,2=down,3=left

          var robotBlocks = d.robotBlocks || [];

          var robotRunning = d.robotRunning || false;

          var robotChallengeIdx = d.robotChallengeIdx != null ? d.robotChallengeIdx : -1;

          var robotCompleted = d.robotCompleted || [];

          var robotTrail = d.robotTrail || [];



          // ── Block definitions ──

          var BLOCK_TYPES = [

            { type: 'forward', label: '🐢 Move Forward', param: 'distance', defaultVal: 50, unit: 'px', color: '#6366f1' },

            { type: 'backward', label: '🔙 Move Backward', param: 'distance', defaultVal: 50, unit: 'px', color: '#818cf8' },

            { type: 'right', label: '↩️ Turn Right', param: 'degrees', defaultVal: 90, unit: '°', color: '#f59e0b' },

            { type: 'left', label: '↪️ Turn Left', param: 'degrees', defaultVal: 90, unit: '°', color: '#f59e0b' },

            { type: 'penup', label: '✏️ Pen Up', param: null, defaultVal: null, unit: null, color: '#94a3b8' },

            { type: 'pendown', label: '✏️ Pen Down', param: null, defaultVal: null, unit: null, color: '#22c55e' },

            { type: 'color', label: '🎨 Set Color', param: 'color', defaultVal: '#6366f1', unit: null, color: '#ec4899' },

            { type: 'width', label: '📏 Set Width', param: 'width', defaultVal: 2, unit: 'px', color: '#14b8a6' },

            { type: 'circle', label: '⭕ Draw Circle', param: 'radius', defaultVal: 30, unit: 'px', color: '#06b6d4' },

            { type: 'goto', label: '📍 Go To', param: 'x', defaultVal: 250, unit: null, color: '#a855f7' },

            { type: 'home', label: '🏠 Go Home', param: null, defaultVal: null, unit: null, color: '#78716c' },

            { type: 'repeat', label: '🔄 Repeat', param: 'times', defaultVal: 4, unit: '×', color: '#8b5cf6' },

            { type: 'setVar', label: '📦 Set Variable', param: 'varName', defaultVal: 'size', unit: null, color: '#0ea5e9' },

            { type: 'changeVar', label: '📦± Change Var', param: 'varName', defaultVal: 'size', unit: null, color: '#0284c7' },

            { type: 'ifelse', label: '🔀 If / Else', param: 'condition', defaultVal: 'x > 250', unit: null, color: '#d946ef' }

          ];



          // ── Challenges ──

          var CHALLENGES = [

            { id: 'hello', title: '1. Hello, Turtle!', desc: 'Add a "Move Forward" block and run it.', concept: 'Sequencing', hint: 'Drag a Move Forward block to your program and click Run!', check: function (lines) { return lines.length >= 1; } },

            { id: 'square', title: '2. Draw a Square', desc: 'Draw a square using Move and Turn blocks.', concept: 'Sequencing', hint: 'You need 4× Move Forward + 4× Turn Right 90°', check: function (lines) { var ex = getEndpoints(lines); return ex.closed && Math.abs(ex.turns - 360) < 10 && ex.segments >= 4; } },

            { id: 'loop_square', title: '3. Loop It!', desc: 'Draw the same square using a Repeat block.', concept: 'Loops', hint: 'Use Repeat 4× with Move Forward and Turn Right 90° inside.', check: function (lines, blks) { return blks.some(function (b) { return b.type === 'repeat'; }) && lines.length >= 4; } },

            { id: 'triangle', title: '4. Triangle Time', desc: 'Draw an equilateral triangle.', concept: 'Loops + Angles', hint: 'Repeat 3×: Move Forward, Turn Right 120°', check: function (lines) { var ex = getEndpoints(lines); return ex.closed && ex.segments >= 3 && Math.abs(ex.turns - 360) < 15; } },

            { id: 'rainbow', title: '5. Rainbow Line', desc: 'Draw 3+ lines, each a different color.', concept: 'Variables', hint: 'Use Set Color blocks between your Move Forward blocks.', check: function (lines) { var colors = {}; lines.forEach(function (l) { colors[l.color] = true; }); return Object.keys(colors).length >= 3; } },

            { id: 'star', title: '6. Star Power', desc: 'Draw a 5-pointed star.', concept: 'Math + Patterns', hint: 'Repeat 5×: Move Forward 100, Turn Right 144°', check: function (lines) { return lines.length >= 5; } },

            { id: 'spiral', title: '7. Spiral', desc: 'Create a spiral that grows outward.', concept: 'Variables in Loops', hint: 'This is tricky! Try increasing the distance each time.', check: function (lines) { return lines.length >= 10; } },

            { id: 'hexagon', title: '8. Hexagon Hero', desc: 'Draw a perfect regular hexagon.', concept: 'Math + Patterns', hint: 'Repeat 6×: Move Forward 60, Turn Right 60°', check: function (lines) { var ex = getEndpoints(lines); return ex.closed && ex.segments >= 6 && Math.abs(ex.turns - 360) < 15; } },

            { id: 'freestyle', title: '9. Freestyle!', desc: 'Create any drawing with 20+ line segments.', concept: 'Creativity', hint: 'Combine everything you\'ve learned!', check: function (lines) { return lines.length >= 20; } },

            { id: 'house', title: '10. Build a House', desc: 'Draw a house: a square base with a triangle roof on top.', concept: 'Decomposition', hint: 'Draw a square, then use Pen Up to move, then draw a triangle for the roof. Think about angles: square = 90°, triangle = 120°.', check: function (lines) { return lines.length >= 7 && getEndpoints(lines.slice(0, 4)).segments >= 4; } }

          ];



          // ── Starter Templates ──

          var TEMPLATES = [

            { name: 'Five-Point Star', icon: '⭐', desc: 'A classic 5-pointed star', blocks: [{ type: 'color', color: '#f59e0b' }, { type: 'repeat', times: 5, children: [{ type: 'forward', distance: 100 }, { type: 'right', degrees: 144 }] }] },

            { name: 'Square Spiral', icon: '🌀', desc: 'A growing square spiral', blocks: [{ type: 'forward', distance: 20 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 40 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 60 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 80 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 100 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 120 }, { type: 'right', degrees: 90 }] },

            { name: 'Flower', icon: '🌸', desc: 'A 6-petal flower pattern', blocks: [{ type: 'color', color: '#ec4899' }, { type: 'repeat', times: 6, children: [{ type: 'forward', distance: 60 }, { type: 'right', degrees: 60 }, { type: 'forward', distance: 60 }, { type: 'right', degrees: 120 }] }] },

            { name: 'Hexagon', icon: '⬡', desc: 'A perfect regular hexagon', blocks: [{ type: 'color', color: '#06b6d4' }, { type: 'width', width: 3 }, { type: 'repeat', times: 6, children: [{ type: 'forward', distance: 60 }, { type: 'right', degrees: 60 }] }] },

            { name: 'Triangle', icon: '🔺', desc: 'An equilateral triangle', blocks: [{ type: 'color', color: '#22c55e' }, { type: 'width', width: 3 }, { type: 'repeat', times: 3, children: [{ type: 'forward', distance: 120 }, { type: 'right', degrees: 120 }] }] },

            { name: 'Staircase', icon: '🪜', desc: 'A step-by-step staircase', blocks: [{ type: 'color', color: '#8b5cf6' }, { type: 'repeat', times: 8, children: [{ type: 'forward', distance: 30 }, { type: 'right', degrees: 90 }, { type: 'forward', distance: 30 }, { type: 'left', degrees: 90 }] }] },

            { name: 'Zigzag', icon: '⚡', desc: 'A sharp zigzag pattern', blocks: [{ type: 'color', color: '#ef4444' }, { type: 'width', width: 3 }, { type: 'repeat', times: 8, children: [{ type: 'forward', distance: 40 }, { type: 'right', degrees: 120 }, { type: 'forward', distance: 40 }, { type: 'left', degrees: 120 }] }] },

            { name: 'Circle Art', icon: '🎯', desc: 'Concentric circles', blocks: [{ type: 'color', color: '#6366f1' }, { type: 'circle', radius: 20 }, { type: 'penup' }, { type: 'forward', distance: 25 }, { type: 'pendown' }, { type: 'color', color: '#ec4899' }, { type: 'circle', radius: 25 }, { type: 'penup' }, { type: 'forward', distance: 30 }, { type: 'pendown' }, { type: 'color', color: '#f59e0b' }, { type: 'circle', radius: 30 }] },

            { name: 'Octagon', icon: '🛑', desc: 'A regular octagon', blocks: [{ type: 'color', color: '#dc2626' }, { type: 'width', width: 3 }, { type: 'repeat', times: 8, children: [{ type: 'forward', distance: 50 }, { type: 'right', degrees: 45 }] }] },

            { name: 'Windmill', icon: '🎡', desc: 'A spinning windmill', blocks: [{ type: 'color', color: '#7c3aed' }, { type: 'repeat', times: 12, children: [{ type: 'forward', distance: 80 }, { type: 'backward', distance: 80 }, { type: 'right', degrees: 30 }] }] }

          ];



          // ══════════════════════════════════════════════════

          // ── ROBOT GRID MODE — Blocks, Challenges, Engine ──

          // ══════════════════════════════════════════════════



          var ROBOT_BLOCKS = [

            { type: 'moveForward', label: '🤖 Move Forward', color: '#6366f1', desc: 'Move robot one cell forward' },

            { type: 'turnRight', label: '↩️ Turn Right', color: '#f59e0b', desc: 'Rotate 90° clockwise' },

            { type: 'turnLeft', label: '↪️ Turn Left', color: '#f59e0b', desc: 'Rotate 90° counter-clockwise' },

            { type: 'repeatR', label: '🔄 Repeat', color: '#8b5cf6', desc: 'Repeat commands N times', param: 'times', defaultVal: 3 },

            { type: 'ifWall', label: '🧱 If Wall Ahead', color: '#ef4444', desc: 'Check if a wall is in front' },

            { type: 'ifGem', label: '💎 If On Gem', color: '#22c55e', desc: 'Check if standing on a gem' },

            { type: 'collectGem', label: '💎 Collect Gem', color: '#14b8a6', desc: 'Pick up the gem at current position' },

            { type: 'paintCell', label: '🎨 Paint Cell', color: '#ec4899', desc: 'Paint the current cell' },

            { type: 'whileNotGoal', label: '🏁 While Not At Goal', color: '#d946ef', desc: 'Repeat until reaching the goal' }

          ];



          // Grid generator — creates level maps

          function generateGrid(size, walls, gems, goalPos, startPos) {

            var grid = [];

            for (var gy = 0; gy < size; gy++) {

              var row = [];

              for (var gx = 0; gx < size; gx++) {

                row.push({ wall: false, gem: false, goal: false, painted: false, start: false });

              }

              grid.push(row);

            }

            if (walls) walls.forEach(function(w) { if (grid[w[1]] && grid[w[1]][w[0]]) grid[w[1]][w[0]].wall = true; });

            if (gems) gems.forEach(function(g) { if (grid[g[1]] && grid[g[1]][g[0]]) grid[g[1]][g[0]].gem = true; });

            if (goalPos && grid[goalPos[1]] && grid[goalPos[1]][goalPos[0]]) grid[goalPos[1]][goalPos[0]].goal = true;

            if (startPos && grid[startPos[1]] && grid[startPos[1]][startPos[0]]) grid[startPos[1]][startPos[0]].start = true;

            return grid;

          }



          var ROBOT_CHALLENGES = [

            {

              id: 'r1', title: '1. First Steps', desc: 'Move the robot forward 3 spaces to reach the goal!',

              concept: 'Sequencing', hint: 'Add 3 "Move Forward" blocks.',

              size: 5, start: [0, 2], startDir: 1, goal: [3, 2], walls: [], gems: [],

              check: function(rp, trail, grid) { return rp.x === 3 && rp.y === 2; }

            },

            {

              id: 'r2', title: '2. Turn the Corner', desc: 'Navigate around the corner to reach the goal.',

              concept: 'Sequencing', hint: 'Move forward, then turn, then move forward again.',

              size: 5, start: [0, 0], startDir: 2, goal: [2, 2], walls: [[1, 1], [2, 0], [2, 1]], gems: [],

              check: function(rp) { return rp.x === 2 && rp.y === 2; }

            },

            {

              id: 'r3', title: '3. Repeat Yourself', desc: 'Use a Repeat block to reach the goal efficiently.',

              concept: 'Loops', hint: 'Use "Repeat 4" with "Move Forward" inside.',

              size: 6, start: [0, 3], startDir: 1, goal: [4, 3], walls: [], gems: [],

              check: function(rp) { return rp.x === 4 && rp.y === 3; }

            },

            {

              id: 'r4', title: '4. Gem Collector', desc: 'Move through the path and collect all 3 gems!',

              concept: 'Sequencing + Actions', hint: 'Move to each gem and use "Collect Gem" on each one.',

              size: 5, start: [0, 2], startDir: 1, goal: [4, 2], walls: [[1, 1], [1, 3], [3, 1], [3, 3]], gems: [[1, 2], [2, 2], [3, 2]],

              check: function(rp, trail, grid) {

                var allCollected = true;

                for (var gy = 0; gy < grid.length; gy++) for (var gx = 0; gx < grid[0].length; gx++) { if (grid[gy][gx].gem) allCollected = false; }

                return allCollected && rp.x === 4 && rp.y === 2;

              }

            },

            {

              id: 'r5', title: '5. Wall Detective', desc: 'Use "If Wall Ahead" to navigate a maze with turns!',

              concept: 'Conditionals', hint: 'Combine "While Not At Goal" with "If Wall Ahead" → Turn Right, else → Move Forward.',

              size: 6, start: [0, 0], startDir: 1, goal: [5, 5],

              walls: [[2, 0], [2, 1], [2, 2], [4, 2], [4, 3], [4, 4], [1, 4], [2, 4], [0, 2], [0, 3]],

              gems: [],

              check: function(rp) { return rp.x === 5 && rp.y === 5; }

            },

            {

              id: 'r6', title: '6. Painter Bot', desc: 'Paint all the unpainted cells in the row!',

              concept: 'Loops + Actions', hint: 'Use Repeat with "Move Forward" and "Paint Cell".',

              size: 5, start: [0, 2], startDir: 1, goal: [4, 2], walls: [], gems: [],

              check: function(rp, trail, grid) {

                for (var px = 0; px <= 4; px++) { if (!grid[2][px].painted) return false; }

                return rp.x === 4 && rp.y === 2;

              }

            },

            {

              id: 'r7', title: '7. Spiral Maze', desc: 'Navigate the spiral maze using loops and conditionals!',

              concept: 'Conditionals + Loops', hint: 'Try "While Not At Goal": If Wall → Turn Right, else → Move Forward.',

              size: 7, start: [0, 0], startDir: 2, goal: [3, 3],

              walls: [[2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],

                      [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],

                      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4],

                      [2, 4], [1, 4], [0, 4]],

              gems: [[3, 1], [5, 3], [3, 5], [1, 3]],

              check: function(rp) { return rp.x === 3 && rp.y === 3; }

            },

            {

              id: 'r8', title: '8. Gem Sweep', desc: 'Collect ALL gems and reach the goal! Use everything you learned.',

              concept: 'Algorithm Design', hint: 'Plan your path carefully. You may need nested loops!',

              size: 6, start: [0, 0], startDir: 1, goal: [5, 5],

              walls: [[2, 1], [3, 1], [1, 3], [2, 3], [4, 3], [3, 5]],

              gems: [[1, 0], [4, 0], [0, 2], [5, 2], [3, 4], [2, 5]],

              check: function(rp, trail, grid) {

                for (var gy = 0; gy < grid.length; gy++) for (var gx = 0; gx < grid[0].length; gx++) { if (grid[gy][gx].gem) return false; }

                return rp.x === 5 && rp.y === 5;

              }

            }

          ];



          // ── Robot Execution Engine ──

          function executeRobotBlocks(rBlocks, startPos, startDir, grid, cb) {

            var pos = { x: startPos[0], y: startPos[1], dir: startDir };

            var gridCopy = JSON.parse(JSON.stringify(grid));

            var trail = [{ x: pos.x, y: pos.y }];

            var maxSteps = 500;

            var stepCount = 0;



            var DX = [0, 1, 0, -1]; // up, right, down, left

            var DY = [-1, 0, 1, 0];

            var size = gridCopy.length;



            function isWallAhead(p) {

              var nx = p.x + DX[p.dir], ny = p.y + DY[p.dir];

              if (nx < 0 || ny < 0 || nx >= size || ny >= size) return true;

              return gridCopy[ny][nx].wall;

            }



            function flattenRobot(bArr) {

              var flat = [];

              for (var j = 0; j < bArr.length; j++) {

                var blk = bArr[j];

                if (blk.type === 'repeatR') {

                  var times = blk.times || 3;

                  for (var r = 0; r < times; r++) {

                    flat = flat.concat(flattenRobot(blk.children || []));

                  }

                } else if (blk.type === 'whileNotGoal') {

                  // Expand up to maxSteps iterations

                  for (var w = 0; w < maxSteps; w++) {

                    flat = flat.concat(flattenRobot(blk.children || []));

                    flat.push({ type: '_checkGoal' });

                  }

                } else if (blk.type === 'ifWall') {

                  flat.push(blk); // defer evaluation

                } else if (blk.type === 'ifGem') {

                  flat.push(blk);

                } else {

                  flat.push(blk);

                }

              }

              return flat;

            }



            var flat = flattenRobot(rBlocks);

            var idx = 0;

            var reachedGoal = false;



            function step() {

              stepCount++;

              if (stepCount > maxSteps || idx >= flat.length || reachedGoal) {

                cb(pos, trail, gridCopy, reachedGoal);

                return;

              }

              var b = flat[idx];

              if (b.type === '_checkGoal') {

                if (gridCopy[pos.y] && gridCopy[pos.y][pos.x] && gridCopy[pos.y][pos.x].goal) {

                  reachedGoal = true;

                  cb(pos, trail, gridCopy, true);

                  return;

                }

              } else if (b.type === 'moveForward') {

                var nx = pos.x + DX[pos.dir], ny = pos.y + DY[pos.dir];

                if (nx >= 0 && ny >= 0 && nx < size && ny < size && !gridCopy[ny][nx].wall) {

                  pos.x = nx; pos.y = ny;

                  trail.push({ x: pos.x, y: pos.y });

                }

              } else if (b.type === 'turnRight') {

                pos.dir = (pos.dir + 1) % 4;

              } else if (b.type === 'turnLeft') {

                pos.dir = (pos.dir + 3) % 4;

              } else if (b.type === 'collectGem') {

                if (gridCopy[pos.y] && gridCopy[pos.y][pos.x]) gridCopy[pos.y][pos.x].gem = false;

              } else if (b.type === 'paintCell') {

                if (gridCopy[pos.y] && gridCopy[pos.y][pos.x]) gridCopy[pos.y][pos.x].painted = true;

              } else if (b.type === 'ifWall') {

                var wallAhead = isWallAhead(pos);

                var branch = wallAhead ? (b.children || []) : (b.elseChildren || []);

                var branchFlat = flattenRobot(branch);

                var before = flat.slice(0, idx + 1);

                var after = flat.slice(idx + 1);

                flat = before.concat(branchFlat).concat(after);

              } else if (b.type === 'ifGem') {

                var onGem = gridCopy[pos.y] && gridCopy[pos.y][pos.x] && gridCopy[pos.y][pos.x].gem;

                var branch2 = onGem ? (b.children || []) : (b.elseChildren || []);

                var branchFlat2 = flattenRobot(branch2);

                var before2 = flat.slice(0, idx + 1);

                var after2 = flat.slice(idx + 1);

                flat = before2.concat(branchFlat2).concat(after2);

              }

              // Update state for animation

              updMulti({ robotPos: Object.assign({}, pos), robotTrail: trail.slice(), robotGrid: gridCopy, robotRunning: true });

              idx++;

              setTimeout(step, 250);

            }

            step();

          }



          function handleRobotRun() {

            var ch = robotChallengeIdx >= 0 && robotChallengeIdx < ROBOT_CHALLENGES.length ? ROBOT_CHALLENGES[robotChallengeIdx] : null;

            if (!ch) return;

            var grid = generateGrid(ch.size, ch.walls, ch.gems, ch.goal, ch.start);

            updMulti({ robotGrid: grid, robotPos: { x: ch.start[0], y: ch.start[1], dir: ch.startDir }, robotTrail: [{ x: ch.start[0], y: ch.start[1] }], robotRunning: true });

            setTimeout(function () {

              executeRobotBlocks(robotBlocks, ch.start, ch.startDir, grid, function (finalPos, trail, finalGrid, goalReached) {

                updMulti({ robotPos: finalPos, robotTrail: trail, robotGrid: finalGrid, robotRunning: false });

                if (ch.check(finalPos, trail, finalGrid)) {

                  if (robotCompleted.indexOf(ch.id) < 0) {

                    upd('robotCompleted', robotCompleted.concat([ch.id]));

                    awardStemXP('codingPlayground', 20, 'Robot Challenge: ' + ch.title);

                    if (addToast) addToast('\uD83E\uDD16 Robot Challenge "' + ch.title + '" complete! +20 XP', 'success');

                  }

                } else {

                  if (addToast) addToast('\uD83E\uDD14 Not quite! Check your logic and try again.', 'warning');

                }

              });

            }, 100);

          }



          function addRobotBlock(type) {

            var def = ROBOT_BLOCKS.find(function(b) { return b.type === type; });

            var newBlock = { type: type };

            if (type === 'repeatR') { newBlock.times = 3; newBlock.children = []; }

            if (type === 'ifWall' || type === 'ifGem') { newBlock.children = []; newBlock.elseChildren = []; }

            if (type === 'whileNotGoal') { newBlock.children = []; }

            upd('robotBlocks', robotBlocks.concat([newBlock]));

          }



          function removeRobotBlock(idx) {

            upd('robotBlocks', robotBlocks.filter(function(_, i) { return i !== idx; }));

          }



          function addRobotChildBlock(parentIdx, type, isElse) {

            var def = ROBOT_BLOCKS.find(function(b) { return b.type === type; });

            var newBlock = { type: type };

            if (type === 'repeatR') { newBlock.times = 3; newBlock.children = []; }

            if (type === 'ifWall' || type === 'ifGem') { newBlock.children = []; newBlock.elseChildren = []; }

            if (type === 'whileNotGoal') { newBlock.children = []; }

            var updated = robotBlocks.map(function(b, i) {

              if (i === parentIdx && (b.type === 'repeatR' || b.type === 'ifWall' || b.type === 'ifGem' || b.type === 'whileNotGoal')) {

                var nb = Object.assign({}, b);

                if (isElse) { nb.elseChildren = (nb.elseChildren || []).concat([newBlock]); }

                else { nb.children = (nb.children || []).concat([newBlock]); }

                return nb;

              }

              return b;

            });

            upd('robotBlocks', updated);

          }



          function loadRobotChallenge(idx) {

            var ch = ROBOT_CHALLENGES[idx];

            var grid = generateGrid(ch.size, ch.walls, ch.gems, ch.goal, ch.start);

            updMulti({ robotChallengeIdx: idx, robotBlocks: [], robotGrid: grid, robotPos: { x: ch.start[0], y: ch.start[1], dir: ch.startDir }, robotTrail: [{ x: ch.start[0], y: ch.start[1] }], robotRunning: false });

          }



          // ── Helper: analyze drawn lines for challenge checking ──

          function getEndpoints(lines) {

            if (lines.length === 0) return { closed: false, turns: 0, segments: 0 };

            var first = lines[0];

            var last = lines[lines.length - 1];

            var dist = Math.sqrt(Math.pow(last.x2 - first.x1, 2) + Math.pow(last.y2 - first.y1, 2));

            var totalAngle = 0;

            for (var i = 1; i < lines.length; i++) {

              var a1 = Math.atan2(lines[i - 1].y2 - lines[i - 1].y1, lines[i - 1].x2 - lines[i - 1].x1);

              var a2 = Math.atan2(lines[i].y2 - lines[i].y1, lines[i].x2 - lines[i].x1);

              var diff = (a2 - a1) * 180 / Math.PI;

              while (diff > 180) diff -= 360;

              while (diff < -180) diff += 360;

              totalAngle += Math.abs(diff);

            }

            return { closed: dist < 15, turns: totalAngle, segments: lines.length };

          }



          // ── Generate text code from blocks ──

          function blocksToText(blks, indent) {

            indent = indent || '';

            var lines = [];

            for (var i = 0; i < blks.length; i++) {

              var b = blks[i];

              if (b.type === 'forward') lines.push(indent + 'forward(' + (b.distance || 50) + ')');

              else if (b.type === 'backward') lines.push(indent + 'backward(' + (b.distance || 50) + ')');

              else if (b.type === 'right') lines.push(indent + 'right(' + (b.degrees || 90) + ')');

              else if (b.type === 'left') lines.push(indent + 'left(' + (b.degrees || 90) + ')');

              else if (b.type === 'penup') lines.push(indent + 'penUp()');

              else if (b.type === 'pendown') lines.push(indent + 'penDown()');

              else if (b.type === 'color') lines.push(indent + 'setColor("' + (b.color || '#6366f1') + '")');

              else if (b.type === 'width') lines.push(indent + 'setWidth(' + (b.width || 2) + ')');

              else if (b.type === 'circle') lines.push(indent + 'circle(' + (b.radius || 30) + ')');

              else if (b.type === 'goto') lines.push(indent + 'goto(' + (b.x != null ? b.x : 250) + ', ' + (b.y != null ? b.y : 250) + ')');

              else if (b.type === 'home') lines.push(indent + 'home()');

              else if (b.type === 'setVar') lines.push(indent + 'setVar("' + (b.varName || 'size') + '", ' + (b.varValue != null ? b.varValue : 50) + ')');

              else if (b.type === 'changeVar') lines.push(indent + 'changeVar("' + (b.varName || 'size') + '", ' + (b.varDelta != null ? b.varDelta : 10) + ')');

              else if (b.type === 'repeat') {

                lines.push(indent + 'repeat(' + (b.times || 4) + ', function() {');

                if (b.children && b.children.length > 0) {

                  lines.push(blocksToText(b.children, indent + '  '));

                }

                lines.push(indent + '})');

              } else if (b.type === 'ifelse') {

                lines.push(indent + 'if (' + (b.condition || 'x > 250') + ') {');

                if (b.children && b.children.length > 0) {

                  lines.push(blocksToText(b.children, indent + '  '));

                }

                lines.push(indent + '} else {');

                if (b.elseChildren && b.elseChildren.length > 0) {

                  lines.push(blocksToText(b.elseChildren, indent + '  '));

                }

                lines.push(indent + '}');

              }

            }

            return lines.join('\n');

          }



          // ── Parse text code to blocks ──

          function textToBlocks(code) {

            var result = [];

            var lineArr = code.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });

            var i = 0;

            function parse() {

              var blks = [];

              while (i < lineArr.length) {

                var line = lineArr[i];

                if (line.match(/^}\)?;?$/) || line.match(/^\} else \{$/)) { i++; return blks; }

                var m;

                if ((m = line.match(/^forward\(([\$\w]+)\)/))) { blks.push({ type: 'forward', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }

                else if ((m = line.match(/^backward\(([\$\w]+)\)/))) { blks.push({ type: 'backward', distance: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }

                else if ((m = line.match(/^right\(([\$\w]+)\)/))) { blks.push({ type: 'right', degrees: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }

                else if ((m = line.match(/^left\(([\$\w]+)\)/))) { blks.push({ type: 'left', degrees: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }

                else if (line.match(/^penUp\(\)/)) { blks.push({ type: 'penup' }); }

                else if (line.match(/^penDown\(\)/)) { blks.push({ type: 'pendown' }); }

                else if ((m = line.match(/^setColor\("([^"]+)"\)/))) { blks.push({ type: 'color', color: m[1] }); }

                else if ((m = line.match(/^setWidth\(([\$\w]+)\)/))) { blks.push({ type: 'width', width: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }

                else if ((m = line.match(/^circle\(([\$\w]+)\)/))) { blks.push({ type: 'circle', radius: isNaN(m[1]) ? m[1] : parseInt(m[1]) }); }

                else if ((m = line.match(/^goto\((\d+),\s*(\d+)\)/))) { blks.push({ type: 'goto', x: parseInt(m[1]), y: parseInt(m[2]) }); }

                else if (line.match(/^home\(\)/)) { blks.push({ type: 'home' }); }

                else if ((m = line.match(/^setVar\("([^"]+)",\s*(-?[\d.]+)\)/))) { blks.push({ type: 'setVar', varName: m[1], varValue: parseFloat(m[2]) }); }

                else if ((m = line.match(/^changeVar\("([^"]+)",\s*(-?[\d.]+)\)/))) { blks.push({ type: 'changeVar', varName: m[1], varDelta: parseFloat(m[2]) }); }

                else if ((m = line.match(/^if\s*\((.+)\)\s*\{/))) {

                  i++;

                  var ifChildren = parse();

                  // After parse returns, current line should be '} else {' or '}'

                  var elseChildren = [];

                  if (i < lineArr.length && lineArr[i - 1] && lineArr[i - 1].match(/\} else \{/)) {

                    elseChildren = parse();

                  }

                  blks.push({ type: 'ifelse', condition: m[1].trim(), children: ifChildren, elseChildren: elseChildren });

                  continue;

                }

                else if ((m = line.match(/^repeat\((\d+)/))) {

                  i++;

                  var children = parse();

                  blks.push({ type: 'repeat', times: parseInt(m[1]), children: children });

                  continue;

                }

                i++;

              }

              return blks;

            }

            return parse();
      })();
    }
  });

  console.log('[StemLab] stem_tool_creative.js loaded — 4 tools');
})();