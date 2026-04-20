// ═══════════════════════════════════════════
// stem_tool_creative.js — STEM Lab Creative Tools
// 2 registered tools (dataPlot extracted → stem_tool_dataplot.js)
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
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

  // ── Audio (auto-injected) ──
  var _datastAC = null;
  function getDatastAC() { if (!_datastAC) { try { _datastAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_datastAC && _datastAC.state === "suspended") { try { _datastAC.resume(); } catch(e) {} } return _datastAC; }
  function datastTone(f,d,tp,v) { var ac = getDatastAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxDatastClick() { datastTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-datastudio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-datastudio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('dataStudio', {
    icon: '\uD83D\uDCCA',
    label: 'dataStudio',
    desc: '',
    color: 'slate',
    category: 'creative',
    questHooks: [
      { id: 'enter_5_rows', label: 'Enter 5+ data rows', icon: '\uD83D\uDCCA', check: function(d) { return (d.dataRows || []).length >= 5; }, progress: function(d) { return (d.dataRows || []).length + '/5 rows'; } },
      { id: 'try_3_chart_types', label: 'Try 3 different chart types', icon: '\uD83D\uDCC8', check: function(d) { return Object.keys(d.chartTypesUsed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.chartTypesUsed || {}).length + '/3 types'; } },
      { id: 'add_trendline', label: 'Add a trendline to your chart', icon: '\uD83D\uDCC9', check: function(d) { return d.showTrendline || false; }, progress: function(d) { return d.showTrendline ? 'Added!' : 'Not yet'; } }
    ],
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
      var canvasNarrate = ctx.canvasNarrate;
      var isDark = ctx.isDark;
      var isContrast = ctx.isContrast;

      // ── Tool body (dataStudio) ──
      return (function() {
var d = (labToolData && labToolData._dataStudio) || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('dataStudio', 'init', {
              first: 'Data Studio loaded. Create charts, analyze datasets, and explore statistics with interactive visualization tools.',
              repeat: 'Data Studio active.',
              terse: 'Data Studio.'
            }, { debounce: 800 });
          }

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

                React.createElement("button", { "aria-label": "Upd D S",

                  onClick: function () { updDS('showStats', !showStats); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: showStats ? _btnBg : _card, color: showStats ? '#fff' : _text, border: '1px solid ' + _border }

                }, showStats ? '📊 Stats On' : '📊 Stats'),

                React.createElement("button", { "aria-label": "Back",

                  onClick: function () { setStemLabTool(null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: _card, border: '1px solid ' + _border, color: _text }

                }, "← Back")

              )

            ),



            // Chart type selector

            React.createElement("div", { className: "flex gap-2" },

              CHART_TYPES.map(function (ct) {

                return React.createElement("button", { "aria-label": "Datastudio action",

                  key: ct.id,

                  onClick: function () { if (ct.id !== chartType) { updDS('chartType', ct.id); if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 3, ct.label + ' explored'); } },

                  className: "flex-1 p-2 rounded-xl text-center transition-all",

                  style: { background: chartType === ct.id ? _btnBg : _card, color: chartType === ct.id ? '#fff' : _text, border: '1px solid ' + (chartType === ct.id ? _accent : _border) }

                },

                  React.createElement("div", { className: "text-lg" }, ct.icon),

                  React.createElement("div", { className: "text-[11px] font-bold" }, ct.label)

                );

              })

            ),



            // Chart title

            React.createElement("input", {

              type: "text", value: chartTitle,

              onChange: function (e) { updDS('chartTitle', e.target.value); },

              placeholder: "Chart title...",

              className: "w-full px-3 py-2 rounded-xl text-sm font-bold text-center",

              style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

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

                        React.createElement("text", { x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '11px', fill: _muted } }, yVal),

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

                        React.createElement("text", { x: x + barW / 2, y: y - 4, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold', fill: _text } }, row.value),

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

                      return React.createElement("text", { key: 'lyl' + i, x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '11px', fill: _muted } }, yVal);

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

                        React.createElement("text", { x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '11px', fill: _muted } }, yVal),

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

                        bin.count > 0 && React.createElement("text", { x: x + bw / 2, y: y - 3, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold', fill: _text } }, bin.count),

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

              React.createElement("span", { className: "text-[11px] font-bold", style: { color: _muted } }, "SORT:"),

              ['none', 'asc', 'desc'].map(function (s) {

                var labels = { none: '— None', asc: '↑ Asc', desc: '↓ Desc' };

                return React.createElement("button", { "aria-label": "Upd D S",

                  key: s,

                  onClick: function () { updDS('sortOrder', s); },

                  className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all",

                  style: { background: sortOrder === s ? _btnBg : _card, color: sortOrder === s ? '#fff' : _text, border: '1px solid ' + _border }

                }, labels[s]);

              }),

              // Filter controls

              React.createElement("span", { className: "text-[11px] font-bold ml-2", style: { color: _muted } }, "FILTER:"),

              React.createElement("input", {

                type: "number", placeholder: "Min", value: filterMin,

                onChange: function (e) { updDS('filterMin', e.target.value === '' ? '' : parseFloat(e.target.value)); },

                className: "w-14 px-1.5 py-1 rounded-lg text-[11px] font-mono",

                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

              }),

              React.createElement("span", { className: "text-[11px]", style: { color: _muted } }, "to"),

              React.createElement("input", {

                type: "number", placeholder: "Max", value: filterMax,

                onChange: function (e) { updDS('filterMax', e.target.value === '' ? '' : parseFloat(e.target.value)); },

                className: "w-14 px-1.5 py-1 rounded-lg text-[11px] font-mono",

                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

              }),

              (filterMin !== '' || filterMax !== '') && React.createElement("button", { "aria-label": "Clear",

                onClick: function () { updDS('filterMin', ''); updDS('filterMax', ''); },

                className: "px-2 py-1 rounded-lg text-[11px] font-bold",

                style: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }

              }, "✕ Clear"),

              displayRows.length !== dataRows.length && React.createElement("span", { className: "text-[11px] font-bold", style: { color: _accent } }, '(' + displayRows.length + '/' + dataRows.length + ' shown)'),

              // Trendline toggle (for line/scatter)

              (chartType === 'line' || chartType === 'scatter') && React.createElement("button", { "aria-label": "Upd D S",

                onClick: function () { updDS('showTrendline', !showTrendline); },

                className: "px-2.5 py-1 rounded-lg text-[11px] font-bold ml-auto transition-all",

                style: { background: showTrendline ? '#ef4444' : _card, color: showTrendline ? '#fff' : _text, border: '1px solid ' + (showTrendline ? '#ef4444' : _border) }

              }, showTrendline ? '📉 Trendline On' : '📉 Trendline')

            ),



            // ── Preset Datasets ──

            React.createElement("div", { className: "flex gap-2 flex-wrap" },

              React.createElement("span", { className: "text-[11px] font-bold self-center", style: { color: _muted } }, "PRESETS:"),

              PRESETS.map(function (p, i) {

                return React.createElement("button", { "aria-label": "Upd D S",

                  key: i,

                  onClick: function () { updDS('dataRows', p.data); updDS('chartTitle', p.title); if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 3, 'Preset: ' + p.title); },

                  className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105",

                  style: { background: _card, border: '1px solid ' + _border, color: _accent }

                }, p.label);

              })

            ),



            // ── CSV Import ──

            React.createElement("div", { className: "flex gap-2" },

              React.createElement("button", { "aria-label": "Import CSV data file",

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

              React.createElement("button", { "aria-label": "Export CSV",

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

                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

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

                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

                }),

                React.createElement("button", { "aria-label": "+ Add",

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

                    React.createElement("button", { "aria-label": "Upd D S",

                      onClick: function () { updDS('dataRows', dataRows.filter(function (_, j) { return j !== i; })); },

                      className: "text-red-400 hover:text-red-600 font-bold text-xs"

                    }, "✕")

                  );

                })

              ),

              // Clear

              dataRows.length > 0 && React.createElement("button", { "aria-label": "Clear All",

                onClick: function () { updDS('dataRows', []); },

                className: "mt-2 px-3 py-1 rounded-lg text-[11px] font-bold",

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

                  React.createElement("div", { className: "text-[11px] font-bold uppercase", style: { color: _muted } }, stat.label),

                  React.createElement("div", { className: "text-sm font-bold font-mono", style: { color: _accent } }, stat.val)

                );

              })

            ),



            // ── AI Data Story Panel (reading-level aware) ──

            dataRows.length > 0 && (function () {

              var aiLevel = d.aiLevel || 'grade5';

              var aiStory = d.aiStory || '';

              var aiLoading = !!d.aiLoading;

              var aiError = d.aiError || '';

              var LEVELS = [

                { id: 'plain', label: 'Plain Language', promptHint: 'simple everyday words, short sentences' },

                { id: 'grade5', label: 'Grade 5', promptHint: 'a 5th grade student' },

                { id: 'grade8', label: 'Grade 8', promptHint: 'an 8th grade student' }

              ];

              function tellStory() {

                if (typeof callGemini !== 'function') {

                  updDS('aiError', 'AI tutor not available.');

                  return;

                }

                updDS('aiLoading', true); updDS('aiError', ''); updDS('aiStory', '');

                var levelObj = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];

                var dataSummary = dataRows.map(function (r) { return r.label + ': ' + r.value; }).join('; ');

                var chartLabel = (CHART_TYPES.find(function (ct) { return ct.id === chartType; }) || { label: chartType }).label;

                var prompt = 'You are a friendly data tutor explaining a chart to ' + levelObj.promptHint + '. '

                  + (aiLevel === 'plain' ? 'Use simple everyday words and short sentences. ' : '')

                  + 'Chart type: ' + chartLabel + '. Title: "' + chartTitle + '". '

                  + 'Data points (' + dataRows.length + '): ' + dataSummary + '. '

                  + 'Stats: sum=' + total.toFixed(1) + ', mean=' + mean.toFixed(1) + ', median=' + median.toFixed(1) + ', std dev=' + stdDev.toFixed(1) + '. '

                  + 'In 3 short sentences: (1) What story does this data tell? (2) What pattern or outlier stands out? (3) One interesting question this data raises. '

                  + 'Use the actual numbers. No markdown, no headings, no bullets.';

                callGemini(prompt, false, false, 0.5).then(function (resp) {

                  updDS('aiStory', String(resp || '').trim());

                  updDS('aiLoading', false);

                  if (typeof announceToSR === 'function') announceToSR('Data story ready.');

                }).catch(function () {

                  updDS('aiLoading', false);

                  updDS('aiError', 'Could not reach AI tutor. Try again in a moment.');

                });

              }

              return React.createElement("div", { className: "mt-2 rounded-xl p-3", role: "region", "aria-label": "AI data story", style: { background: _card, border: '1px solid ' + _border } },

                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-2" },

                  React.createElement("span", { className: "text-sm font-bold", style: { color: _accent } }, "\u2728 What story does this data tell?"),

                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": "Reading level" },

                    LEVELS.map(function (L) {

                      var active = aiLevel === L.id;

                      return React.createElement("button", {

                        key: L.id,

                        onClick: function () { updDS('aiLevel', L.id); },

                        "aria-label": "Reading level: " + L.label + (active ? " (selected)" : ""),

                        "aria-pressed": active,

                        className: "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all",

                        style: { background: active ? _accent : 'transparent', color: active ? '#fff' : _text, border: '1px solid ' + _border }

                      }, L.label);

                    })

                  ),

                  React.createElement("button", {

                    onClick: tellStory,

                    disabled: aiLoading,

                    "aria-label": "Generate data story at " + (LEVELS.find(function (L) { return L.id === aiLevel; }) || { label: 'Grade 5' }).label + " level",

                    className: "px-3 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50",

                    style: { background: _accent, color: '#fff' }

                  }, aiLoading ? '\u23F3 Thinking...' : (aiStory ? '\uD83D\uDD04 Re-tell' : '\uD83E\uDDE0 Tell the story'))

                ),

                aiError && React.createElement("p", { className: "text-[11px] mt-1", role: "alert", style: { color: '#ef4444' } }, aiError),

                aiStory && React.createElement("p", { className: "text-xs leading-relaxed mt-1", style: { color: _text } }, aiStory),

                !aiStory && !aiLoading && !aiError && React.createElement("p", { className: "text-[11px] italic", style: { color: _muted } }, "Click \u201CTell the story\u201D to have the AI tutor explain what your chart shows at your chosen reading level.")

              );

            })()

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_creative.js loaded \u2014 3 tools');

})();