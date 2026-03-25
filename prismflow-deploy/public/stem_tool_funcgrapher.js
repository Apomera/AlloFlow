// ═══════════════════════════════════════════
// stem_tool_funcgrapher.js — Function Grapher Plugin
// Standalone plugin extracted from stem_tool_math.js
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

  // ═══ 📈 Function Grapher ═══
  window.StemLab.registerTool('funcGrapher', {
    icon: '📈',
    label: 'Function Grapher',
    desc: 'Graph and explore mathematical functions interactively',
    color: 'indigo',
    category: 'math',
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

      // ── Tool body (funcGrapher) ──
      return (function() {
          // State initialization guard — ensure funcGrapher state exists
          if (!labToolData || !labToolData.funcGrapher) {
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { funcGrapher: {
                type: 'linear', a: 1, b: 0, c: 0,
                showDeriv: false, showArea: false,
                traceX: 0, showTable: false, showLearn: false
              }});
            });
            return React.createElement('div', { className: 'p-8 text-center text-slate-400' }, 'Loading...');
          }

          const d = labToolData.funcGrapher;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, funcGrapher: { ...prev.funcGrapher, [key]: val } }));

          const W = 440, H = 320, pad = 45;

          const xR = { xMin: (d.range && d.range.xMin) || -10, xMax: (d.range && d.range.xMax) || 10 };

          const yR = { yMin: (d.range && d.range.yMin) || -10, yMax: (d.range && d.range.yMax) || 10 };

          const toSX = x => pad + ((x - xR.xMin) / (xR.xMax - xR.xMin)) * (W - 2 * pad);

          const toSY = y => (H - pad) - ((y - yR.yMin) / (yR.yMax - yR.yMin)) * (H - 2 * pad);



          // Evaluate functions

          const evalF = x => {

            if (d.type === 'linear') return d.a * x + d.b;

            if (d.type === 'quadratic') return d.a * x * x + d.b * x + d.c;

            if (d.type === 'trig') return d.a * Math.sin(d.b * x + d.c);

            if (d.type === 'cubic') return d.a * x * x * x + d.b * x + d.c;

            if (d.type === 'exponential') return d.a * Math.pow(Math.E, d.b * x) + d.c;

            if (d.type === 'absolute') return d.a * Math.abs(x + d.b) + d.c;

            return d.a * x + d.b;

          };

          // Numerical derivative

          const evalDeriv = x => (evalF(x + 0.001) - evalF(x - 0.001)) / 0.002;

          // Tangent line at trace point
          var traceX = d.traceX || 0;
          var traceY = evalF(traceX);
          var traceSlope = evalDeriv(traceX);
          var tangentInRange = traceY >= yR.yMin && traceY <= yR.yMax;



          // Generate curve points

          const pts = [];

          const derivPts = [];

          const areaPts = [];

          for (var px = 0; px <= W - 2 * pad; px += 2) {

            var x = xR.xMin + (px / (W - 2 * pad)) * (xR.xMax - xR.xMin);

            var y = evalF(x);

            var dy = evalDeriv(x);

            if (y >= yR.yMin && y <= yR.yMax) pts.push(toSX(x) + ',' + toSY(y));

            if (dy >= yR.yMin && dy <= yR.yMax) derivPts.push(toSX(x) + ',' + toSY(dy));

            if (d.showArea && y >= yR.yMin && y <= yR.yMax && x >= 0) areaPts.push({ sx: toSX(x), sy: toSY(y) });

          }



          // Find roots (where f(x) ≈ 0)

          var roots = [];

          for (var rx = xR.xMin; rx < xR.xMax; rx += 0.05) {

            var y1 = evalF(rx), y2 = evalF(rx + 0.05);

            if (y1 * y2 <= 0) {

              var rootX = rx - y1 * (0.05) / (y2 - y1);

              if (rootX >= xR.xMin && rootX <= xR.xMax) roots.push(rootX);

            }

          }



          // Y-intercept

          var yIntercept = evalF(0);



          // Build equation string

          var eqStr = '';

          if (d.type === 'linear') eqStr = 'f(x) = ' + d.a + 'x + ' + d.b;

          else if (d.type === 'quadratic') eqStr = 'f(x) = ' + d.a + 'x\u00B2 + ' + d.b + 'x + ' + d.c;

          else if (d.type === 'trig') eqStr = 'f(x) = ' + d.a + 'sin(' + d.b + 'x + ' + d.c + ')';

          else if (d.type === 'cubic') eqStr = 'f(x) = ' + d.a + 'x\u00B3 + ' + d.b + 'x + ' + d.c;

          else if (d.type === 'exponential') eqStr = 'f(x) = ' + d.a + 'e^(' + d.b + 'x) + ' + d.c;

          else if (d.type === 'absolute') eqStr = 'f(x) = ' + d.a + '|x + ' + d.b + '| + ' + d.c;



          // Function type presets

          var TYPES = [

            { id: 'linear', label: t('stem.func_grapher.linear'), emoji: '\u2571' },

            { id: 'quadratic', label: t('stem.func_grapher.quadratic'), emoji: '\u2229' },

            { id: 'cubic', label: t('stem.func_grapher.cubic'), emoji: '\u223F' },

            { id: 'trig', label: t('stem.func_grapher.trig'), emoji: '\u223C' },

            { id: 'exponential', label: t('stem.func_grapher.exponential'), emoji: '\uD83D\uDCC8' },

            { id: 'absolute', label: t('stem.func_grapher.absolute'), emoji: '\u22C0' }

          ];



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDCC8 Function Grapher"),

              React.createElement("span", { className: "px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE")

            ),

            // Function type buttons

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

              TYPES.map(t => React.createElement("button", {

                key: t.id, onClick: () => upd("type", t.id),

                className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.type === t.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50')

              }, t.emoji + " " + t.label))

            ),

            // SVG Graph

            React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-white rounded-xl border-2 border-indigo-200 shadow-sm", style: { maxHeight: "340px" } },

              // Grid lines (rendered first, behind curves)

              (function () {

                var gridLines = [];

                var xStep = (xR.xMax - xR.xMin) <= 10 ? 1 : (xR.xMax - xR.xMin) <= 30 ? 5 : 10;

                for (var gx = Math.ceil(xR.xMin / xStep) * xStep; gx <= xR.xMax; gx += xStep) {

                  var sx = toSX(gx);

                  if (sx > pad && sx < W - pad) {

                    gridLines.push(React.createElement("line", { key: 'gx' + gx, x1: sx, y1: pad, x2: sx, y2: H - pad, stroke: "#e2e8f0", strokeWidth: 0.5 }));

                  }

                }

                var yStep = (yR.yMax - yR.yMin) <= 10 ? 1 : (yR.yMax - yR.yMin) <= 30 ? 5 : 10;

                for (var gy = Math.ceil(yR.yMin / yStep) * yStep; gy <= yR.yMax; gy += yStep) {

                  var sy = toSY(gy);

                  if (sy > pad && sy < H - pad) {

                    gridLines.push(React.createElement("line", { key: 'gy' + gy, x1: pad, y1: sy, x2: W - pad, y2: sy, stroke: "#e2e8f0", strokeWidth: 0.5 }));

                  }

                }

                return gridLines;

              })(),

              // Axes

              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: "#64748b", strokeWidth: 1.5 }),

              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: "#64748b", strokeWidth: 1.5 }),

              // Axis labels

              React.createElement("text", { x: W - pad + 5, y: toSY(0) + 4, fill: "#64748b", style: { fontSize: '10px', fontWeight: 'bold' } }, "x"),

              React.createElement("text", { x: toSX(0) + 5, y: pad - 5, fill: "#64748b", style: { fontSize: '10px', fontWeight: 'bold' } }, "y"),

              // Area under curve (positive x)

              d.showArea && areaPts.length > 1 && React.createElement("polygon", {

                points: toSX(0) + ',' + toSY(0) + ' ' + areaPts.map(p => p.sx + ',' + p.sy).join(' ') + ' ' + areaPts[areaPts.length - 1].sx + ',' + toSY(0),

                fill: "rgba(79,70,229,0.08)", stroke: "none"

              }),

              // Derivative trace

              d.showDeriv && derivPts.length > 1 && React.createElement("polyline", { points: derivPts.join(" "), fill: "none", stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "6 3" }),

              // Main curve

              pts.length > 1 && React.createElement("polyline", { points: pts.join(" "), fill: "none", stroke: "#4f46e5", strokeWidth: 2.5 }),

              // Tangent line at traceX
              tangentInRange && (function() {
                var tLen = 3;
                var x1 = traceX - tLen, x2 = traceX + tLen;
                var y1t = traceY + traceSlope * (x1 - traceX);
                var y2t = traceY + traceSlope * (x2 - traceX);
                return React.createElement('g', null,
                  React.createElement('line', { x1: toSX(x1), y1: toSY(y1t), x2: toSX(x2), y2: toSY(y2t), stroke: '#ec4899', strokeWidth: 1.5, strokeDasharray: '4 2' }),
                  React.createElement('circle', { cx: toSX(traceX), cy: toSY(traceY), r: 5, fill: '#ec4899', stroke: 'white', strokeWidth: 1.5 }),
                  React.createElement('text', { x: toSX(traceX) + 10, y: toSY(traceY) - 6, fill: '#ec4899', style: { fontSize: '8px', fontWeight: 'bold' } }, '(' + traceX.toFixed(1) + ', ' + traceY.toFixed(2) + ') m=' + traceSlope.toFixed(2))
                );
              })(),

              // Roots

              roots.map(function (r, i) {

                return React.createElement("g", { key: 'root' + i },

                  React.createElement("circle", { cx: toSX(r), cy: toSY(0), r: 4, fill: "#ef4444", stroke: "white", strokeWidth: 1.5 }),

                  React.createElement("text", { x: toSX(r), y: toSY(0) - 8, textAnchor: "middle", fill: "#ef4444", style: { fontSize: '8px', fontWeight: 'bold' } }, r.toFixed(2))

                );

              }),

              // Y-intercept

              yIntercept >= yR.yMin && yIntercept <= yR.yMax && React.createElement("g", null,

                React.createElement("circle", { cx: toSX(0), cy: toSY(yIntercept), r: 4, fill: "#22c55e", stroke: "white", strokeWidth: 1.5 }),

                React.createElement("text", { x: toSX(0) + 8, y: toSY(yIntercept) + 4, fill: "#22c55e", style: { fontSize: '8px', fontWeight: 'bold' } }, "(0, " + yIntercept.toFixed(1) + ")")

              ),

              // Grid text labels (rendered AFTER curves so they appear on top)

              (function () {

                var gridLabels = [];

                var xStep = (xR.xMax - xR.xMin) <= 10 ? 1 : (xR.xMax - xR.xMin) <= 30 ? 5 : 10;

                for (var gx = Math.ceil(xR.xMin / xStep) * xStep; gx <= xR.xMax; gx += xStep) {

                  var sx = toSX(gx);

                  if (sx > pad && sx < W - pad) {

                    gridLabels.push(React.createElement("text", { key: 'tx' + gx, x: sx, y: H - pad + 14, textAnchor: "middle", fill: "#64748b", style: { fontSize: '8px', fontWeight: '600' } }, gx));

                  }

                }

                var yStep = (yR.yMax - yR.yMin) <= 10 ? 1 : (yR.yMax - yR.yMin) <= 30 ? 5 : 10;

                for (var gy = Math.ceil(yR.yMin / yStep) * yStep; gy <= yR.yMax; gy += yStep) {

                  var sy = toSY(gy);

                  if (sy > pad && sy < H - pad) {

                    gridLabels.push(React.createElement("text", { key: 'ty' + gy, x: pad - 5, y: sy + 3, textAnchor: "end", fill: "#64748b", style: { fontSize: '8px', fontWeight: '600' } }, gy));

                  }

                }

                return gridLabels;

              })(),

              // Equation label

              React.createElement("text", { x: W / 2, y: H - 5, textAnchor: "middle", fill: "#4f46e5", style: { fontSize: '10px', fontWeight: 'bold' } }, eqStr)

            ),

            // Toggles

            React.createElement("div", { className: "flex gap-2 mt-3 mb-2 flex-wrap" },

              React.createElement("button", { onClick: () => upd('showDeriv', !d.showDeriv), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showDeriv ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 border border-amber-200') }, d.showDeriv ? "\u2705 f\u2032(x)" : "\uD83D\uDCC9 Show f\u2032(x)"),

              React.createElement("button", { onClick: () => upd('showArea', !d.showArea), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showArea ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-200') }, d.showArea ? "\u2705 Area" : "\u222B Area"),

              React.createElement("button", { onClick: () => upd('showTable', !d.showTable), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showTable ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-600 border border-cyan-200') }, d.showTable ? "\u2705 Table" : "\uD83D\uDCCB Table"),

              React.createElement("button", { onClick: () => upd('showLearn', !d.showLearn), className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.showLearn ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-200') }, d.showLearn ? "\u2705 Learn" : "\uD83D\uDCD6 Learn"),

              roots.length > 0 && React.createElement("span", { className: "px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-200" }, "\uD83D\uDCCD " + roots.length + " root" + (roots.length > 1 ? 's' : '') + ": x = " + roots.map(r => r.toFixed(2)).join(', ')),

              yIntercept >= yR.yMin && yIntercept <= yR.yMax && React.createElement("span", { className: "px-2 py-1.5 bg-green-50 text-green-600 rounded-lg text-[10px] font-bold border border-green-200" }, "\uD83D\uDFE2 y-int: " + yIntercept.toFixed(2))

            ),

            // ── Tangent Line Trace Slider ──
            React.createElement("div", { className: "bg-pink-50 rounded-lg p-2 border border-pink-200 mt-1" },
              React.createElement("div", { className: "flex items-center gap-2" },
                React.createElement("span", { className: "text-xs font-bold text-pink-600" }, "\uD83D\uDCCC Trace: x = " + traceX.toFixed(1)),
                React.createElement("input", { type: "range", min: xR.xMin, max: xR.xMax, step: 0.1, value: traceX, onChange: e => upd('traceX', parseFloat(e.target.value)), className: "flex-1 accent-pink-500", 'aria-label': 'Trace x position' }),
                tangentInRange && React.createElement("span", { className: "text-[10px] font-mono text-pink-700" }, "f(" + traceX.toFixed(1) + ") = " + traceY.toFixed(2) + ", slope = " + traceSlope.toFixed(2))
              )
            ),

            // ── Table of Values (collapsible) ──
            d.showTable && React.createElement("div", { className: "mt-2 bg-cyan-50 rounded-xl border border-cyan-200 p-3 overflow-x-auto" },
              React.createElement("p", { className: "text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCCB Table of Values"),
              React.createElement("table", { className: "w-full text-xs" },
                React.createElement("thead", null,
                  React.createElement("tr", { className: "border-b border-cyan-200" },
                    React.createElement("th", { className: "px-2 py-1 text-left font-bold text-cyan-800" }, "x"),
                    React.createElement("th", { className: "px-2 py-1 text-left font-bold text-indigo-700" }, "f(x)"),
                    d.showDeriv && React.createElement("th", { className: "px-2 py-1 text-left font-bold text-amber-700" }, "f\u2032(x)")
                  )
                ),
                React.createElement("tbody", null,
                  (function() {
                    var rows = [];
                    for (var tx = Math.ceil(xR.xMin); tx <= Math.floor(xR.xMax); tx++) {
                      var fy = evalF(tx);
                      var fdy = evalDeriv(tx);
                      rows.push(React.createElement("tr", { key: tx, className: "border-b border-cyan-100 hover:bg-cyan-100 transition-colors" },
                        React.createElement("td", { className: "px-2 py-0.5 font-mono text-cyan-800" }, tx),
                        React.createElement("td", { className: "px-2 py-0.5 font-mono text-indigo-700" }, fy.toFixed(2)),
                        d.showDeriv && React.createElement("td", { className: "px-2 py-0.5 font-mono text-amber-700" }, fdy.toFixed(2))
                      ));
                    }
                    return rows;
                  })()
                )
              )
            ),

            // ── Educational Learn Panel (collapsible) ──
            d.showLearn && React.createElement("div", { className: "mt-2 bg-emerald-50 rounded-xl border border-emerald-200 p-4" },
              React.createElement("h4", { className: "text-sm font-bold text-emerald-800 mb-2" }, "\uD83D\uDCD6 Understanding Functions"),
              React.createElement("div", { className: "grid grid-cols-1 gap-2 text-xs text-emerald-900" },
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-red-600" }, "\uD83D\uDD34 Roots (x-intercepts): "),
                  "Where the function crosses the x-axis. At these points, f(x) = 0. Solving for the roots is essential in algebra and calculus."
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-green-600" }, "\uD83D\uDFE2 Y-intercept: "),
                  "Where the function crosses the y-axis. This is the value of f(0) — simply plug in x = 0."
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-pink-600" }, "\uD83D\uDCCC Slope & Tangent Line: "),
                  "The slope tells you how steep the function is at any point. The tangent line touches the curve at exactly one point. Use the trace slider to explore!"
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-amber-600" }, "\uD83D\uDCC9 Derivative f\u2032(x): "),
                  "The derivative measures the rate of change. Toggle it on to see how the slope varies across the function. Where f\u2032(x) = 0, the function has a local max or min."
                ),
                React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-indigo-600" }, "\u222B Area Under the Curve: "),
                  "The shaded area represents the integral — the total \"accumulation\" of f(x). In real life, this could mean distance traveled, energy consumed, or probability."
                ),
                d.type === 'quadratic' && React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, "\u2229 Parabolas: "),
                  "When a > 0, the parabola opens up (\u23E3). When a < 0, it opens down (\u23E2). The vertex is the turning point. Try changing 'a' to see!"
                ),
                d.type === 'trig' && React.createElement("div", { className: "bg-white rounded-lg p-2 border border-emerald-100" },
                  React.createElement("span", { className: "font-bold text-purple-600" }, "\u223C Trig Functions: "),
                  "Amplitude (a) controls the height, frequency (b) controls how many cycles, and phase shift (c) slides the wave left/right. Period = 2\u03C0/b."
                )
              )
            ),

            // Sliders

            React.createElement("div", { className: "grid grid-cols-3 gap-3 mt-2" },

              [{ k: 'a', label: 'a', min: -5, max: 5, step: 0.1 }, { k: 'b', label: 'b', min: -5, max: 5, step: 0.1 }, { k: 'c', label: 'c', min: -5, max: 5, step: 0.1 }].map(s =>

                React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("label", { className: "text-xs font-bold text-indigo-600" }, s.label + " = " + d[s.k]),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: e => upd(s.k, parseFloat(e.target.value)), className: "w-full accent-indigo-600", "aria-label": "Parameter " + s.label })

                )

              )

            ),

            // Presets

            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2" }, "\u26A1 Quick Presets"),

              React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                [

                  { label: 'y = 2x + 1', type: 'linear', a: 2, b: 1, c: 0, tip: 'Slope 2, y-intercept 1' },

                  { label: 'y = x\u00B2', type: 'quadratic', a: 1, b: 0, c: 0, tip: 'Standard parabola' },

                  { label: 'y = -x\u00B2 + 4', type: 'quadratic', a: -1, b: 0, c: 4, tip: 'Inverted parabola, vertex at (0,4)' },

                  { label: 'y = sin(x)', type: 'trig', a: 1, b: 1, c: 0, tip: 'Standard sine wave' },

                  { label: 'y = 2sin(3x)', type: 'trig', a: 2, b: 3, c: 0, tip: 'Amplitude=2, period=2\u03C0/3' },

                  { label: 'y = x\u00B3', type: 'cubic', a: 1, b: 0, c: 0, tip: 'Cubic with inflection at origin' },

                  { label: 'y = e^x', type: 'exponential', a: 1, b: 1, c: 0, tip: 'Natural exponential growth' },

                  { label: 'y = |x|', type: 'absolute', a: 1, b: 0, c: 0, tip: 'V-shaped absolute value' },

                ].map(function (p) {

                  return React.createElement("button", {

                    key: p.label, onClick: function () {

                      upd('type', p.type); upd('a', p.a); upd('b', p.b); upd('c', p.c);

                      addToast(t('stem.func_grapher.ud83dudcc8') + p.tip, 'success');

                    }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all"

                  }, p.label);

                })

              )

            ),

            // Legend

            React.createElement("div", { className: "mt-2 flex items-center gap-4 text-[9px] text-slate-400" },

              React.createElement("span", null, "\u2014\u2014 f(x)"),

              d.showDeriv && React.createElement("span", null, "- - - f\u2032(x)"),

              React.createElement("span", null, "\uD83D\uDD34 Roots"),

              React.createElement("span", null, "\uD83D\uDFE2 y-intercept")

            ),

            // ── Challenges: Name That Graph, Find the Root, What's the y-intercept? ──

            (() => {

              var fgQuiz = d.fgQuiz || null;

              var fgScore = d.fgScore || 0;

              var fgStreak = d.fgStreak || 0;

              var challengeMode = d.fgChallengeMode || 'name'; // 'name' | 'root' | 'yint'



              // ── Name That Graph generator ──

              function makeFgQuiz() {

                var types = ['linear', 'quadratic', 'trig', 'cubic', 'exponential', 'absolute'];

                var labels = { linear: 'Linear (y = ax + b)', quadratic: 'Quadratic (y = ax² + bx + c)', trig: 'Trigonometric (y = a·sin(bx + c))', cubic: 'Cubic (y = ax³ + bx + c)', exponential: 'Exponential (y = a·eᵇˣ + c)', absolute: 'Absolute Value (y = a|x + b| + c)' };

                var tp = types[Math.floor(Math.random() * types.length)];

                var opts = [labels[tp]];

                while (opts.length < 4) { var r = labels[types[Math.floor(Math.random() * types.length)]]; if (opts.indexOf(r) < 0) opts.push(r); }

                return { mode: 'name', type: tp, answer: labels[tp], opts: opts.sort(function () { return Math.random() - 0.5; }), answered: false };

              }



              // ── Find the Root generator ──

              function makeRootQuiz() {

                // Pick linear or quadratic with guaranteed nice roots

                var pick = Math.random();

                var qa, qb, qc, qtype, rootAnswer;

                if (pick < 0.5) {

                  // Linear: a*x + b = 0 → root = -b/a

                  qa = [1, 2, -1, -2, 3][Math.floor(Math.random() * 5)];

                  qb = [-6, -4, -2, 0, 2, 4, 6][Math.floor(Math.random() * 7)];

                  qc = 0; qtype = 'linear';

                  rootAnswer = Math.round((-qb / qa) * 100) / 100;

                } else {

                  // Quadratic: a*(x - r1)*(x - r2), pick small integer roots

                  var r1 = Math.floor(Math.random() * 7) - 3;

                  var r2 = r1 + Math.floor(Math.random() * 4) + 1;

                  qa = 1; qb = -(r1 + r2); qc = r1 * r2; qtype = 'quadratic';

                  rootAnswer = r1; // accept either root

                }

                // Build 4 numeric options including the correct answer

                var opts = [rootAnswer];

                while (opts.length < 4) {

                  var wrong = rootAnswer + (Math.floor(Math.random() * 7) - 3);

                  if (wrong !== rootAnswer && opts.indexOf(wrong) < 0) opts.push(wrong);

                }

                return { mode: 'root', type: qtype, a: qa, b: qb, c: qc, answer: rootAnswer, opts: opts.sort(function () { return Math.random() - 0.5; }), answered: false };

              }



              // ── What's the y-intercept? generator ──

              function makeYIntQuiz() {

                var pick = Math.random();

                var qa, qb, qc, qtype, yIntAnswer;

                if (pick < 0.4) {

                  qa = [1, 2, -1, -2, 3][Math.floor(Math.random() * 5)];

                  qb = Math.floor(Math.random() * 11) - 5; qc = 0; qtype = 'linear';

                  yIntAnswer = qb; // f(0) = a*0 + b

                } else if (pick < 0.8) {

                  qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                  qb = Math.floor(Math.random() * 7) - 3;

                  qc = Math.floor(Math.random() * 9) - 4; qtype = 'quadratic';

                  yIntAnswer = qc; // f(0) = a*0 + b*0 + c

                } else {

                  qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                  qb = Math.floor(Math.random() * 7) - 3;

                  qc = Math.floor(Math.random() * 9) - 4; qtype = 'cubic';

                  yIntAnswer = qc; // f(0) = c for cubic a*x³ + b*x + c

                }

                var opts = [yIntAnswer];

                while (opts.length < 4) {

                  var wrong = yIntAnswer + (Math.floor(Math.random() * 7) - 3);

                  if (wrong !== yIntAnswer && opts.indexOf(wrong) < 0) opts.push(wrong);

                }

                return { mode: 'yint', type: qtype, a: qa, b: qb, c: qc, answer: yIntAnswer, opts: opts.sort(function () { return Math.random() - 0.5; }), answered: false };

              }



              // Start a challenge based on the current mode

              function startChallenge() {

                var q;

                if (challengeMode === 'root') { q = makeRootQuiz(); }

                else if (challengeMode === 'yint') { q = makeYIntQuiz(); }

                else { q = makeFgQuiz(); }

                upd('fgQuiz', q);

                if (q.a !== undefined) upd('a', q.a);

                if (q.b !== undefined) upd('b', q.b);

                if (q.c !== undefined) upd('c', q.c);

                if (q.type) upd('type', q.type);

              }



              // Challenge mode buttons

              var CHALLENGE_MODES = [

                { id: 'name', label: '🎯 Name That Graph', color: 'violet' },

                { id: 'root', label: '📍 Find the Root', color: 'red' },

                { id: 'yint', label: '🟢 Y-Intercept?', color: 'emerald' }

              ];



              // Prompt text per mode

              var promptText = challengeMode === 'root' ? 'What is one root (x-intercept) of this function?'

                : challengeMode === 'yint' ? 'What is the y-intercept of this function?'

                  : 'What type of function is graphed above?';



              return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3 mb-2" },

                // Mode selector row

                React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 mb-2" },

                  CHALLENGE_MODES.map(function (cm) {

                    var isActive = challengeMode === cm.id;

                    return React.createElement("button", {

                      key: cm.id, onClick: function () { upd('fgChallengeMode', cm.id); upd('fgQuiz', null); },

                      className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-' + cm.color + '-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')

                    }, cm.label);

                  }),

                  fgScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600 ml-auto" }, '⭐ ' + fgScore + ' | 🔥 ' + fgStreak)

                ),

                // Start / New Challenge button

                React.createElement("button", {

                  onClick: startChallenge,

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold mb-2 " + (fgQuiz ? 'bg-slate-100 text-slate-600' : 'bg-violet-600 text-white') + " hover:opacity-90 transition-all"

                }, fgQuiz ? '🔄 New Challenge' : '🚀 Start Challenge'),



                // Quiz card

                fgQuiz && !fgQuiz.answered && React.createElement("div", { className: "bg-violet-50 rounded-xl p-3 border border-violet-200" },

                  React.createElement("p", { className: "text-sm font-bold text-violet-800 mb-2" }, promptText),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    fgQuiz.opts.map(function (opt) {

                      return React.createElement("button", {

                        key: String(opt), onClick: function () {

                          var correct = opt === fgQuiz.answer;

                          upd('fgQuiz', Object.assign({}, fgQuiz, { answered: true, chosen: opt }));

                          upd('fgScore', fgScore + (correct ? 1 : 0));

                          upd('fgStreak', correct ? fgStreak + 1 : 0);

                          if (correct) {

                            addToast('\u2705 Correct! +5 XP', 'success');

                            if (typeof awardStemXP === 'function') awardStemXP('funcGrapher', 5, 'Function Grapher challenge');

                            // Streak bonus at 5
                            if (fgStreak + 1 >= 5 && (fgStreak + 1) % 5 === 0) {
                              addToast('\uD83D\uDD25 ' + (fgStreak + 1) + '-streak! +10 bonus XP', 'success');
                              if (typeof awardStemXP === 'function') awardStemXP('funcGrapher', 10, 'Function Grapher streak bonus');
                            }

                            // Auto-advance after 1.5s

                            setTimeout(function () { startChallenge(); }, 1500);

                          } else {

                            var hint = challengeMode === 'root' ? 'The root is x = ' + fgQuiz.answer

                              : challengeMode === 'yint' ? 'The y-intercept is ' + fgQuiz.answer

                                : "It's a " + fgQuiz.type + ' function';

                            addToast('\u274C ' + hint, 'error');

                          }

                        }, className: "px-2 py-1.5 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all"

                      }, challengeMode === 'name' ? opt : 'x = ' + opt);

                    })

                  )

                ),

                // Result card

                fgQuiz && fgQuiz.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold " + (fgQuiz.chosen === fgQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },

                  fgQuiz.chosen === fgQuiz.answer ? '\u2705 Correct! +5 XP' : '\u274C Answer: ' + fgQuiz.answer

                )

              );

            })(),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'fg-' + Date.now(), tool: 'funcGrapher', label: d.type + ': a=' + d.a + ' b=' + d.b, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });

  console.log('[StemLab] stem_tool_funcgrapher.js loaded — Function Grapher');
})();
