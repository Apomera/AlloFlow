// ═══════════════════════════════════════════
// stem_tool_dataplot.js — STEM Lab Data Plotter
// 1 registered tool: dataPlot
// Extracted from stem_tool_creative.js
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

  // ═══ 📊 dataPlot (Data Plotter) ═══
  window.StemLab.registerTool('dataPlot', {
    icon: '📊',
    label: 'Data Plotter',
    desc: 'Plot data, calculate regression & R²',
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

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDCCA Data Plotter"),

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

              d.points.map(function(p, i) { return React.createElement("g", { key: 'pt'+i, style: { cursor: 'pointer' }, onClick: function(e) { e.stopPropagation(); upd('points', d.points.filter(function(_, j) { return j !== i; })); addToast('\uD83D\uDDD1 Removed (' + p.x + ', ' + p.y + ')', 'info'); } }, React.createElement("circle", { cx: toSX(p.x), cy: toSY(p.y), r: 12, fill: "transparent" }), React.createElement("circle", { cx: toSX(p.x), cy: toSY(p.y), r: 5, fill: "#0d9488", stroke: "#fff", strokeWidth: 1.5 }), React.createElement("title", null, "(" + p.x + ", " + p.y + ") \u2014 click to remove")); }),

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

              React.createElement("button", { onClick: () => upd('points', d.points.slice(0, -1)), className: "px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm" }, "\u21A9 Undo"),

              React.createElement("button", { onClick: () => upd('points', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm" }, "\uD83D\uDDD1 Clear"),

              React.createElement("label", { className: "flex items-center gap-1 text-xs font-bold text-violet-600 cursor-pointer" }, React.createElement("input", { type: "checkbox", checked: !!d.showResiduals, onChange: function() { upd('showResiduals', !d.showResiduals); }, className: "accent-violet-600" }), "Residuals"),

              d.points.length >= 2 && React.createElement("button", { onClick: function() { var csv = 'x,y\n' + d.points.map(function(p) { return p.x + ',' + p.y; }).join('\n'); var blob = new Blob([csv], { type: 'text/csv' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data_plot.csv'; a.click(); }, className: "px-3 py-1.5 bg-teal-50 text-teal-700 font-bold rounded-lg text-sm border border-teal-200" }, "\uD83D\uDCE5 CSV"),

              d.points.length >= 2 && React.createElement("span", { className: "text-xs text-slate-500 self-center ml-auto" }, "y = " + slope.toFixed(2) + "x + " + intercept.toFixed(2) + " | r\u00B2 = " + r2.toFixed(3))

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

              var dpStreak = d.dpStreak || 0;

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

                  React.createElement("button", { onClick: function () { var q = makeDpQuiz(); upd('dpQuiz', q); upd('points', q.pts); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (dpQuiz ? 'bg-teal-100 text-teal-700' : 'bg-teal-600 text-white') + " hover:opacity-90 transition-all" }, dpQuiz ? '\uD83D\uDD04 Next Scenario' : '\uD83D\uDCCA Predict Correlation'),

                  dpScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, '\u2B50 ' + dpScore + ' correct'),

                  dpStreak > 1 && React.createElement("span", { className: "text-xs font-bold text-orange-600" }, '\uD83D\uDD25 ' + dpStreak + ' streak')

                ),

                dpQuiz && !dpQuiz.answered && React.createElement("div", { className: "bg-teal-50 rounded-xl p-3 border border-teal-200" },

                  React.createElement("p", { className: "text-sm font-bold text-teal-800 mb-2" }, '"' + dpQuiz.text + '" \u2014 What correlation do you see?'),

                  React.createElement("div", { className: "flex gap-2" },

                    dpQuiz.opts.map(function (opt) {

                      return React.createElement("button", {

                        key: opt, onClick: function () {

                          var correct = opt === dpQuiz.answer;

                          upd('dpQuiz', Object.assign({}, dpQuiz, { answered: true, chosen: opt }));

                          upd('dpScore', dpScore + (correct ? 1 : 0));

                          upd('dpStreak', correct ? dpStreak + 1 : 0);

                          if (correct) { addToast(t('stem.data_plot.correct') + dpQuiz.answer + ' correlation', 'success'); awardStemXP('dataPlot', 10, 'Correlation Quiz'); } else { addToast(t('stem.data_plot.it') + "'s " + dpQuiz.answer + ' correlation', 'error'); }

                        }, className: "px-4 py-2 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all"

                      }, opt);

                    })

                  )

                ),

                dpQuiz && dpQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold " + (dpQuiz.chosen === dpQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') }, dpQuiz.chosen === dpQuiz.answer ? '\u2705 Correct! ' + dpQuiz.answer + ' correlation.' : '\u274C Answer: ' + dpQuiz.answer + ' correlation.')

              );

            })(),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'dp-' + Date.now(), tool: 'dataPlot', label: d.points.length + ' pts r\u00B2=' + r2.toFixed(2), data: { points: [...d.points] }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });

  console.log('[StemLab] stem_tool_dataplot.js loaded \u2014 1 tool');
})();
