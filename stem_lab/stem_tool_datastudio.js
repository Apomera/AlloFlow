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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _datastAC = null;
  function getDatastAC() { if (!_datastAC) { try { _datastAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_datastAC && _datastAC.state === "suspended") { try { _datastAC.resume(); } catch(e) {} } return _datastAC; }
  function datastTone(f,d,tp,v) { var ac = getDatastAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxDatastClick() { datastTone(600, 0.03, "sine", 0.04); }

  function parseDataStudioCSV(text) {
    var source = String(text == null ? '' : text).replace(/^\uFEFF/, '');
    if (!source.trim()) return { rows: [], skipped: 0, error: 'The file is empty.' };
    var firstLine = source.split(/\r?\n/, 1)[0], candidates = [',', '\t', ';'];
    function unquotedCount(line, delimiter) {
      var count = 0, quoted = false;
      for (var c = 0; c < line.length; c++) {
        if (line[c] === '"') quoted = !quoted;
        else if (line[c] === delimiter && !quoted) count++;
      }
      return count;
    }
    var delimiter = candidates.reduce(function(best, candidate) { return unquotedCount(firstLine, candidate) > unquotedCount(firstLine, best) ? candidate : best; }, ',');
    var records = [], record = [], field = '', quoted = false;
    for (var i = 0; i < source.length; i++) {
      var ch = source[i];
      if (ch === '"') { if (quoted && source[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
      else if (ch === delimiter && !quoted) { record.push(field); field = ''; }
      else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && source[i + 1] === '\n') i++;
        record.push(field); field = '';
        if (record.some(function(v) { return v.trim() !== ''; })) records.push(record);
        record = [];
      } else field += ch;
    }
    if (quoted) return { rows: [], skipped: 0, error: 'A quoted field is not closed.' };
    record.push(field);
    if (record.some(function(v) { return v.trim() !== ''; })) records.push(record);
    var headers = (records[0] || []).map(function(value) { return String(value).trim().toLowerCase(); });
    var labelIndex = headers.indexOf('label'), xIndex = headers.indexOf('x'), yIndex = headers.indexOf('y');
    if (yIndex < 0) yIndex = headers.indexOf('value');
    var namedHeader = yIndex >= 0 && (labelIndex >= 0 || xIndex >= 0);
    var start = namedHeader ? 1 : 0, rows = [], skipped = 0;
    records.slice(start).forEach(function(parts, rowIndex) {
      var inferredXY = !namedHeader && parts.length >= 3 && isFinite(Number(String(parts[1]).trim())) && isFinite(Number(String(parts[2]).trim()));
      var li = namedHeader ? labelIndex : 0, xi = namedHeader ? xIndex : (inferredXY ? 1 : -1), yi = namedHeader ? yIndex : (inferredXY ? 2 : 1);
      var label = li >= 0 ? String(parts[li] == null ? '' : parts[li]).trim() : 'Point ' + (rowIndex + 1);
      if (/^'[=+\-@]/.test(label)) label = label.slice(1);
      if (!label) label = 'Point ' + (rowIndex + 1);
      var rawY = String(parts[yi] == null ? '' : parts[yi]).trim().replace(/[$,%]/g, ''), value = Number(rawY);
      var rawX = xi >= 0 ? String(parts[xi] == null ? '' : parts[xi]).trim() : '', x = Number(rawX);
      if (rawY === '' || !isFinite(value) || (xi >= 0 && (rawX === '' || !isFinite(x)))) { skipped++; return; }
      var row = { label: label, value: value }; if (xi >= 0) row.x = x;
      if (rows.length < 500) rows.push(row); else skipped++;
    });
    return { rows: rows, skipped: skipped, hasXY: rows.some(function(row) { return isFinite(row.x); }), error: rows.length ? '' : 'No valid data rows were found.' };
  }
  function dataStudioCSVCell(value, protectFormula) {
    var text = String(value == null ? '' : value);
    if (protectFormula && /^[=+\-@]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }
  function serializeDataStudioCSV(rows) {
    var hasXY = rows.some(function(row) { return row.x !== undefined && isFinite(Number(row.x)); });
    var header = hasXY ? 'Label,X,Y' : 'Label,Value';
    return header + '\r\n' + rows.map(function(row, i) {
      var label = dataStudioCSVCell(row.label || ('Point ' + (i + 1)), true);
      var numericLabel = Number(row.label), fallbackX = String(row.label).trim() !== '' && isFinite(numericLabel) ? numericLabel : i + 1;
      var xValue = row.x !== undefined && isFinite(Number(row.x)) ? Number(row.x) : fallbackX;
      return hasXY ? label + ',' + dataStudioCSVCell(xValue, false) + ',' + dataStudioCSVCell(row.value, false)
        : label + ',' + dataStudioCSVCell(row.value, false);
    }).join('\r\n');
  }

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
    icon: "📊",
    label: "Data Studio",
    desc: "Build bar, pie, line, scatter, and histogram charts from your data and explore stats like mean, median, and trendlines.",
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
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
              var ds = Object.assign({}, (prev && prev._dataStudio) || {}); ds[key] = val;
              return Object.assign({}, prev, { _dataStudio: ds });
            });
          };
          var updDSMany = function (patch) {
            setLabToolData(function (prev) {
              var ds = Object.assign({}, (prev && prev._dataStudio) || {}, patch);
              return Object.assign({}, prev, { _dataStudio: ds });
            });
          };

          var chartType = d.chartType || 'bar';

          var dataRows = d.dataRows || [

            { label: t('stem.datastudio.apples', 'Apples'), value: 45 },

            { label: t('stem.datastudio.bananas', 'Bananas'), value: 30 },

            { label: t('stem.datastudio.oranges', 'Oranges'), value: 55 },

            { label: t('stem.datastudio.grapes', 'Grapes'), value: 25 },

            { label: t('stem.datastudio.cherries', 'Cherries'), value: 40 }

          ];

          var hasExplicitX = dataRows.some(function(row) { return row.x !== undefined && isFinite(Number(row.x)); });
          var chartTitle = d.chartTitle || 'My Data';
          var undoStack = Array.isArray(d.undoStack) ? d.undoStack : [];
          var redoStack = Array.isArray(d.redoStack) ? d.redoStack : [];
          function currentDataSnapshot() {
            return { rows: dataRows.map(function(row) { var copy = { label: row.label, value: row.value }; if (row.x !== undefined) copy.x = row.x; return copy; }), chartTitle: chartTitle, filterMin: filterMin, filterMax: filterMax, labelFilter: labelFilter, sortOrder: sortOrder };
          }
          function commitDataRows(nextRows, patch, announcement) {
            updDSMany(Object.assign({}, patch || {}, { dataRows: nextRows, undoStack: undoStack.concat([currentDataSnapshot()]).slice(-20), redoStack: [] }));
            if (announcement && typeof announceToSR === 'function') announceToSR(announcement);
          }
          function applyDataSnapshot(snapshot, nextUndo, nextRedo, announcement) {
            if (!snapshot) return;
            updDSMany({ dataRows: snapshot.rows || [], chartTitle: snapshot.chartTitle || 'My Data',
              filterMin: snapshot.filterMin === undefined ? '' : snapshot.filterMin, filterMax: snapshot.filterMax === undefined ? '' : snapshot.filterMax,
              labelFilter: snapshot.labelFilter || '', sortOrder: snapshot.sortOrder || 'none', undoStack: nextUndo, redoStack: nextRedo });
            if (typeof announceToSR === 'function') announceToSR(announcement);
          }
          function undoDataChange() {
            if (undoStack.length) applyDataSnapshot(undoStack[undoStack.length - 1], undoStack.slice(0, -1), redoStack.concat([currentDataSnapshot()]).slice(-20), 'Last data change undone.');
          }
          function redoDataChange() {
            if (redoStack.length) applyDataSnapshot(redoStack[redoStack.length - 1], undoStack.concat([currentDataSnapshot()]).slice(-20), redoStack.slice(0, -1), 'Data change redone.');
          }

          var editRow = d.editRow || { label: '', x: '', value: '' };
          function buildEditDataRow() {
            var row = { label: editRow.label, value: Number(editRow.value) };
            if (editRow.x !== '' && isFinite(Number(editRow.x))) row.x = Number(editRow.x);
            return row;
          }

          var showStats = d.showStats !== undefined ? d.showStats : true;

          var showTrendline = d.showTrendline || false;

          var workspaceTab = d.workspaceTab || 'chart';
          var xAxisLabel = d.xAxisLabel || '';
          var yAxisLabel = d.yAxisLabel || '';
          var histogramBins = Math.max(0, Math.min(12, Number(d.histogramBins) || 0));
          var stdDevMode = d.stdDevMode === 'sample' ? 'sample' : 'population';
          var palette = ['accessible', 'vibrant', 'monochrome'].indexOf(d.palette) >= 0 ? d.palette : 'accessible';
          var showDataLabels = d.showDataLabels !== false;
          var showGridlines = d.showGridlines !== false;
          var dataSource = d.dataSource || '';
          var editorPage = Math.max(0, Number(d.editorPage) || 0);
          var tablePage = Math.max(0, Number(d.tablePage) || 0);

          var sortOrder = d.sortOrder || 'none';  // 'none', 'asc', 'desc'

          var filterMin = typeof d.filterMin === 'number' ? d.filterMin : '';

          var filterMax = typeof d.filterMax === 'number' ? d.filterMax : '';
          var labelFilter = d.labelFilter || '';



          var CHART_TYPES = [

            { id: 'bar', icon: '📊', label: t('stem.datastudio.bar_chart', 'Bar Chart') },

            { id: 'pie', icon: '🥧', label: t('stem.datastudio.pie_chart', 'Pie Chart') },

            { id: 'line', icon: '📈', label: t('stem.datastudio.line_graph', 'Line Graph') },

            { id: 'scatter', icon: '⚬', label: t('stem.datastudio.scatter_plot', 'Scatter Plot') },

            { id: 'histogram', icon: '📉', label: t('stem.datastudio.histogram', 'Histogram') },

            { id: 'box', icon: '▭', label: 'Box Plot' }

          ];



          var PRESETS = [

            { label: t('stem.datastudio.fruit_sales', '🍎 Fruit Sales'), data: [{ label: t('stem.datastudio.apples_2', 'Apples'), value: 45 }, { label: t('stem.datastudio.bananas_2', 'Bananas'), value: 30 }, { label: t('stem.datastudio.oranges_2', 'Oranges'), value: 55 }, { label: t('stem.datastudio.grapes_2', 'Grapes'), value: 25 }, { label: t('stem.datastudio.cherries_2', 'Cherries'), value: 40 }], title: t('stem.datastudio.fruit_sales_2', 'Fruit Sales') },

            { label: t('stem.datastudio.monthly_temps_f', '🌡️ Monthly Temps (°F)'), data: [{ label: 'Jan', value: 32 }, { label: 'Feb', value: 35 }, { label: 'Mar', value: 45 }, { label: 'Apr', value: 55 }, { label: 'May', value: 65 }, { label: 'Jun', value: 75 }, { label: 'Jul', value: 82 }, { label: 'Aug', value: 80 }, { label: 'Sep', value: 70 }, { label: 'Oct', value: 58 }, { label: 'Nov', value: 45 }, { label: 'Dec', value: 35 }], title: t('stem.datastudio.monthly_temperature', 'Monthly Temperature') },

            { label: t('stem.datastudio.class_grades', '📚 Class Grades'), data: [{ label: 'A', value: 8 }, { label: 'B', value: 15 }, { label: 'C', value: 12 }, { label: 'D', value: 5 }, { label: 'F', value: 2 }], title: t('stem.datastudio.grade_distribution', 'Grade Distribution') },

            { label: t('stem.datastudio.sports_points', '🏀 Sports Points'), data: [{ label: t('stem.datastudio.game_1', 'Game 1'), value: 22 }, { label: t('stem.datastudio.game_2', 'Game 2'), value: 18 }, { label: t('stem.datastudio.game_3', 'Game 3'), value: 31 }, { label: t('stem.datastudio.game_4', 'Game 4'), value: 27 }, { label: t('stem.datastudio.game_5', 'Game 5'), value: 35 }, { label: t('stem.datastudio.game_6', 'Game 6'), value: 29 }], title: t('stem.datastudio.points_per_game', 'Points Per Game') },

            { label: t('stem.datastudio.dice_rolls_50', '🎲 Dice Rolls (50)'), data: (function () { var c = [0, 0, 0, 0, 0, 0]; for (var i = 0; i < 50; i++) c[Math.floor(Math.random() * 6)]++; return c.map(function (v, j) { return { label: '' + (j + 1), value: v }; }); })(), title: t('stem.datastudio.dice_roll_distribution', 'Dice Roll Distribution') }

          ];



          // CSV import handler
          var handleCSVImport = function (text) {
            var result = parseDataStudioCSV(text);
            if (result.error) {
              if (addToast) addToast(result.error + ' Expected two columns: Label, Value.', 'warning');
              if (typeof announceToSR === 'function') announceToSR('CSV import failed. ' + result.error);
              return;
            }
            commitDataRows(result.rows, { filterMin: '', filterMax: '', sortOrder: 'none', chartType: result.hasXY ? 'scatter' : chartType, xAxisLabel: result.hasXY ? (xAxisLabel || 'X') : xAxisLabel, yAxisLabel: result.hasXY ? (yAxisLabel || 'Y') : yAxisLabel }, 'Imported data. Undo is available.');
            var message = 'Imported ' + result.rows.length + ' data points' + (result.skipped ? '; skipped ' + result.skipped + ' invalid row' + (result.skipped === 1 ? '' : 's') : '') + '.';
            if (addToast) addToast(message, result.skipped ? 'info' : 'success');
            if (typeof announceToSR === 'function') announceToSR(message);
            if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 5, 'CSV import');
          };

          // Apply sort and filter

          var filteredRows = dataRows;

          if (labelFilter.trim()) {
            var normalizedLabelFilter = labelFilter.trim().toLowerCase();
            filteredRows = filteredRows.filter(function(r) { return String(r.label || '').toLowerCase().indexOf(normalizedLabelFilter) >= 0; });
          }

          if (filterMin !== '' && !isNaN(filterMin)) filteredRows = filteredRows.filter(function (r) { return r.value >= filterMin; });

          if (filterMax !== '' && !isNaN(filterMax)) filteredRows = filteredRows.filter(function (r) { return r.value <= filterMax; });

          if (sortOrder === 'asc') filteredRows = filteredRows.slice().sort(function (a, b) { return a.value - b.value; });

          else if (sortOrder === 'desc') filteredRows = filteredRows.slice().sort(function (a, b) { return b.value - a.value; });

          var displayRows = filteredRows;
          var EDITOR_PAGE_SIZE = 25;
          var editorPageCount = Math.max(1, Math.ceil(dataRows.length / EDITOR_PAGE_SIZE));
          editorPage = Math.min(editorPage, editorPageCount - 1);
          var editorStart = editorPage * EDITOR_PAGE_SIZE;
          var editorRows = dataRows.slice(editorStart, editorStart + EDITOR_PAGE_SIZE);
          var TABLE_PAGE_SIZE = 50;
          var tablePageCount = Math.max(1, Math.ceil(displayRows.length / TABLE_PAGE_SIZE));
          tablePage = Math.min(tablePage, tablePageCount - 1);
          var tableStart = tablePage * TABLE_PAGE_SIZE;
          var tableRows = displayRows.slice(tableStart, tableStart + TABLE_PAGE_SIZE);
          var descriptionRows = displayRows.slice(0, 100);
          var effectiveDataLabels = showDataLabels && displayRows.length <= 100;



          // Statistics (on displayed rows)

          var values = displayRows.map(function (r) { return r.value; });

          var total = values.reduce(function (s, v) { return s + v; }, 0);

          var mean = values.length > 0 ? total / values.length : 0;

          var sorted = values.slice().sort(function (a, b) { return a - b; });

          var median = sorted.length > 0 ? (sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;

          // Guard empty data WITHOUT poisoning real data: the old `values.concat([1])`/`concat([0])`
          // forced minVal ≤ 0 (pinning the line/scatter Y-baseline to 0 for all-positive data) and
          // maxVal ≥ 1. Only fall back to 1/0 when there's actually no data.
          var maxVal = values.length ? Math.max.apply(null, values) : 1;

          var minVal = values.length ? Math.min.apply(null, values) : 0;

          var sumSquaredDiffs = values.reduce(function (s, v) { return s + Math.pow(v - mean, 2); }, 0);
          var varianceDivisor = stdDevMode === 'sample' && values.length > 1 ? values.length - 1 : values.length;
          var stdDev = varianceDivisor > 0 ? Math.sqrt(sumSquaredDiffs / varianceDivisor) : 0;
          var sampleStdDev = values.length > 1 ? Math.sqrt(sumSquaredDiffs / (values.length - 1)) : 0;
          var standardError = values.length > 1 ? sampleStdDev / Math.sqrt(values.length) : 0;
          var confidenceLow = mean - 1.96 * standardError, confidenceHigh = mean + 1.96 * standardError;

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
          var minRow = displayRows.find(function(row) { return row.value === minVal; });
          var maxRow = displayRows.find(function(row) { return row.value === maxVal; });
          var lowerFence = q1 - 1.5 * iqr, upperFence = q3 + 1.5 * iqr;
          var outliers = iqr > 0 ? displayRows.filter(function(row) { return row.value < lowerFence || row.value > upperFence; }) : [];
          var nonOutlierValues = sorted.filter(function(value) { return value >= lowerFence && value <= upperFence; });
          var whiskerMin = nonOutlierValues.length ? nonOutlierValues[0] : minVal;
          var whiskerMax = nonOutlierValues.length ? nonOutlierValues[nonOutlierValues.length - 1] : maxVal;
          var trend = calcTrendline(displayRows, chartType === 'scatter');
          var trendDirection = !trend || Math.abs(trend.slope) < 0.01 ? 'roughly flat' : (trend.slope > 0 ? 'increasing' : 'decreasing');
          var scatterXs = displayRows.map(getScatterX);
          var meanX = scatterXs.length ? scatterXs.reduce(function(sum, x) { return sum + x; }, 0) / scatterXs.length : 0;
          var covarianceSum = 0, xSquaredSum = 0, ySquaredSum = 0;
          displayRows.forEach(function(row, i) {
            var dx = scatterXs[i] - meanX, dy = row.value - mean;
            covarianceSum += dx * dy; xSquaredSum += dx * dx; ySquaredSum += dy * dy;
          });
          var pearsonR = xSquaredSum > 0 && ySquaredSum > 0 ? covarianceSum / Math.sqrt(xSquaredSum * ySquaredSum) : null;
          var duplicateXValues = scatterXs.filter(function(x, i) { return scatterXs.indexOf(x) !== i; });
          var duplicateXCount = Array.from(new Set(duplicateXValues)).length;
          var normalizedLabels = dataRows.map(function(row) { return String(row.label || '').trim().toLowerCase(); });
          var duplicateLabels = normalizedLabels.filter(function(label, i) { return label && normalizedLabels.indexOf(label) !== i; });
          var duplicateLabelCount = Array.from(new Set(duplicateLabels)).length;
          var blankLabelCount = normalizedLabels.filter(function(label) { return !label; }).length;
          var negativeCount = dataRows.filter(function(row) { return row.value < 0; }).length;
          var zeroCount = dataRows.filter(function(row) { return row.value === 0; }).length;
          var uniqueValueCount = new Set(dataRows.map(function(row) { return row.value; })).size;
          var timeLabelPattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|q[1-4]|day\s*\d+|week\s*\d+|month\s*\d+|\d{4})/i;
          var looksSequential = dataRows.length >= 3 && dataRows.filter(function(row) { return timeLabelPattern.test(String(row.label).trim()); }).length >= Math.ceil(dataRows.length * 0.6);
          var recommendedChart = hasExplicitX ? 'scatter' : looksSequential ? 'line' : outliers.length > 0 ? 'box' : dataRows.length >= 10 ? 'histogram'
            : dataRows.length >= 2 && dataRows.length <= 6 && dataRows.every(function(row) { return row.value >= 0; }) && dataRows.reduce(function(sum, row) { return sum + row.value; }, 0) > 0 ? 'pie' : 'bar';
          var recommendationReason = recommendedChart === 'scatter' ? 'Your dataset includes numeric X and Y values.'
            : recommendedChart === 'line' ? 'The labels look sequential or time-based.'
            : recommendedChart === 'box' ? 'A box plot makes the possible outliers and quartiles visible.'
            : recommendedChart === 'histogram' ? 'A distribution view works well for ten or more values.'
            : recommendedChart === 'pie' ? 'A small positive dataset can show parts of a whole.'
            : 'A bar chart makes category comparisons easy.';
          function applyChartRecommendation() {
            var used = Object.assign({}, d.chartTypesUsed || {}); used[recommendedChart] = true;
            updDSMany({ chartType: recommendedChart, chartTypesUsed: used });
            if (typeof announceToSR === 'function') announceToSR('Chart Coach applied ' + recommendedChart + ' chart.');
          }
          function aggregateDuplicateLabels(method) {
            if (!duplicateLabelCount) { if (addToast) addToast('No duplicate labels to combine.', 'info'); return; }
            var groups = {}, order = [];
            dataRows.forEach(function(row, index) {
              var normalized = String(row.label || '').trim().toLowerCase();
              var key = normalized || ('__blank_' + index);
              if (!groups[key]) { groups[key] = { label: row.label, rows: [] }; order.push(key); }
              groups[key].rows.push(row);
            });
            var nextRows = order.map(function(key) {
              var group = groups[key], rows = group.rows, sum = rows.reduce(function(total, row) { return total + row.value; }, 0);
              var value = method === 'count' ? rows.length : method === 'mean' ? sum / rows.length : sum;
              var result = { label: group.label, value: Number(value.toFixed(4)) };
              var xs = rows.filter(function(row) { return row.x !== undefined && isFinite(Number(row.x)); }).map(function(row) { return Number(row.x); });
              if (xs.length) result.x = Number((xs.reduce(function(total, x) { return total + x; }, 0) / xs.length).toFixed(4));
              return result;
            });
            var removed = dataRows.length - nextRows.length;
            commitDataRows(nextRows, { filterMin: '', filterMax: '', labelFilter: '', sortOrder: 'none', editorPage: 0, tablePage: 0 }, 'Combined duplicate labels using ' + method + '. ' + removed + ' repeated row' + (removed === 1 ? '' : 's') + ' merged. Undo is available.');
            if (addToast) addToast('Combined ' + removed + ' repeated row' + (removed === 1 ? '' : 's') + ' using ' + method + '. Use Undo to restore them.', 'success');
          }

          function transformData(kind) {
            var sourceValues = dataRows.map(function(row) { return row.value; });
            var sourceTotal = sourceValues.reduce(function(sum, value) { return sum + value; }, 0);
            var sourceMean = sourceValues.length ? sourceTotal / sourceValues.length : 0;
            var sourceVariance = sourceValues.length ? sourceValues.reduce(function(sum, value) { return sum + Math.pow(value - sourceMean, 2); }, 0) / sourceValues.length : 0;
            var sourceSD = Math.sqrt(sourceVariance), running = 0, nextRows;
            if (kind === 'percent') {
              if (sourceTotal === 0) { if (addToast) addToast('Percent conversion needs a non-zero total.', 'warning'); return; }
              nextRows = dataRows.map(function(row) { return Object.assign({}, row, { value: Number((row.value / sourceTotal * 100).toFixed(4)) }); });
            } else if (kind === 'cumulative') {
              nextRows = dataRows.map(function(row) { running += row.value; return Object.assign({}, row, { value: Number(running.toFixed(4)) }); });
            } else if (kind === 'zscore') {
              if (sourceSD === 0) { if (addToast) addToast('Z-scores need values with some variation.', 'warning'); return; }
              nextRows = dataRows.map(function(row) { return Object.assign({}, row, { value: Number(((row.value - sourceMean) / sourceSD).toFixed(4)) }); });
            } else return;
            commitDataRows(nextRows, { filterMin: '', filterMax: '', sortOrder: 'none' }, 'Data transformed. Undo is available.');
            if (addToast) addToast('Transformation applied. Use Undo to restore the original data.', 'success');
          }



          // Linear regression for trendline

          function getScatterX(row, index) {
            if (row && row.x !== undefined && isFinite(Number(row.x))) return Number(row.x);
            var numericLabel = Number(row && row.label);
            return row && String(row.label).trim() !== '' && isFinite(numericLabel) ? numericLabel : index + 1;
          }
          function calcTrendline(rows, useScatterX) {
            var n = rows.length;
            if (n < 2) return null;
            var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            rows.forEach(function(row, i) {
              var x = useScatterX ? getScatterX(row, i) : i;
              sumX += x; sumY += row.value; sumXY += x * row.value; sumX2 += x * x;
            });
            var denom = n * sumX2 - sumX * sumX;
            if (denom === 0) return null;
            var slope = (n * sumXY - sumX * sumY) / denom, intercept = (sumY - slope * sumX) / n;
            return { slope: slope, intercept: intercept };
          }

          // Color palette

          var PALETTES = {
            accessible: ['#2563eb', '#d97706', '#059669', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#4d7c0f'],
            vibrant: ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#a855f7', '#eab308', '#3b82f6'],
            monochrome: isDark || isContrast ? ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'] : ['#0f172a', '#334155', '#64748b', '#94a3b8']
          };
          var COLORS = PALETTES[palette];



          // Dark theme

          var _bg = isDark || isContrast ? '#0f172a' : '#f0fdfa';

          var _text = isDark || isContrast ? '#e0e7ff' : '#1e293b';

          var _card = isDark || isContrast ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)';

          var _border = isDark || isContrast ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)';

          var _accent = isDark || isContrast ? '#22d3ee' : '#0891b2';

          var _muted = isDark || isContrast ? '#94a3b8' : '#475569';

          var _btnBg = '#0e7490'; // cyan-700 both themes: white label clears 4.5:1 (was cyan-500/600 → 2.9/3.7)

          var _svgBg = isDark || isContrast ? '#1e293b' : '#ffffff';



          // SVG dimensions

          var W = 440, H = 320, pad = 50;

          var chartTop = 45; // extra top margin so title doesn't overlap data



          return React.createElement("div", { className: "p-4 space-y-4", style: { color: _text } },

            // Header

            React.createElement("div", { className: "flex items-center justify-between mb-2" },

              React.createElement("div", null,

                React.createElement("h3", { className: "text-lg font-bold flex items-center gap-2" }, t('stem.datastudio.data_studio', "📈 Data Studio")),

                React.createElement("p", { className: "text-xs", style: { color: _muted } }, t('stem.datastudio.create_charts_import_data_explore_stat', "Create charts, import data & explore statistics"))

              ),

              React.createElement("div", { className: "flex gap-2" },

                React.createElement("button", { onClick: function () { updDS('workspaceTab', workspaceTab === 'analyze' ? 'chart' : 'analyze'); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: workspaceTab === 'analyze' ? _btnBg : _card, color: workspaceTab === 'analyze' ? '#fff' : _text, border: '1px solid ' + _border }

                }, workspaceTab === 'analyze' ? '📈 Chart View' : '📊 Analyze'),

                React.createElement("button", { "aria-label": t('stem.datastudio.back', "Back"),

                  onClick: function () { setStemLabTool(null); },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: _card, border: '1px solid ' + _border, color: _text }

                }, t('stem.datastudio.back_2', "← Back"))

              )

            ),



            React.createElement("div", { className: "rounded-xl p-3 flex flex-wrap items-center gap-2", role: "region", "aria-label": "Chart Coach recommendation", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("div", { className: "min-w-0 flex-1" },
                React.createElement("div", { className: "text-xs font-bold", style: { color: _accent } }, "Chart Coach suggests " + ((CHART_TYPES.find(function(type) { return type.id === recommendedChart; }) || { label: recommendedChart }).label)),
                React.createElement("p", { className: "text-[11px]", style: { color: _muted } }, recommendationReason)
              ),
              React.createElement("button", { onClick: applyChartRecommendation, disabled: chartType === recommendedChart, className: "px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50",
                style: { background: chartType === recommendedChart ? _card : _btnBg, color: chartType === recommendedChart ? _muted : '#fff', border: '1px solid ' + _border },
                "aria-label": "Apply Chart Coach recommendation" }, chartType === recommendedChart ? "Using suggestion" : "Use this chart")
            ),

            // Chart type selector

            React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2", role: "group", "aria-label": "Chart type" },

              CHART_TYPES.map(function (ct) {

                return React.createElement("button", { key: ct.id,

                  onClick: function () { if (ct.id !== chartType) { var used = Object.assign({}, d.chartTypesUsed || {}); used[ct.id] = true; updDSMany({ chartType: ct.id, chartTypesUsed: used }); if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 3, ct.label + ' explored'); } },

                  className: "p-2 rounded-xl text-center transition-all",
                  "aria-pressed": chartType === ct.id,

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

              placeholder: t('stem.datastudio.chart_title', "Chart title..."), "aria-label": "Chart title",

              className: "w-full px-3 py-2 rounded-xl text-sm font-bold text-center",

              style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' },
              onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

            }),



            // ── SVG Chart Rendering ──

            React.createElement("details", { className: "rounded-xl p-2", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("summary", { className: "text-xs font-bold cursor-pointer", style: { color: _accent } }, "Chart settings"),
              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" },
                React.createElement("label", { className: "text-[11px] font-bold" }, "Horizontal axis label",
                  React.createElement("input", { value: xAxisLabel, onChange: function(e) { updDS('xAxisLabel', e.target.value); }, className: "block w-full mt-1 px-2 py-1.5 rounded-lg text-xs", style: { background: _svgBg, border: '1px solid ' + _border, color: _text } })),
                React.createElement("label", { className: "text-[11px] font-bold" }, "Vertical axis label",
                  React.createElement("input", { value: yAxisLabel, onChange: function(e) { updDS('yAxisLabel', e.target.value); }, className: "block w-full mt-1 px-2 py-1.5 rounded-lg text-xs", style: { background: _svgBg, border: '1px solid ' + _border, color: _text } }))
              ),
              React.createElement("label", { className: "block mt-2 text-[11px] font-bold" }, "Data source",
                React.createElement("input", { value: dataSource, onChange: function(e) { updDS('dataSource', e.target.value); }, placeholder: "Source, URL, experiment, or citation",
                  className: "block w-full mt-1 px-2 py-1.5 rounded-lg text-xs", style: { background: _svgBg, border: '1px solid ' + _border, color: _text } })),
              React.createElement("div", { className: "mt-2", role: "group", "aria-label": "Chart color palette" },
                React.createElement("span", { className: "text-[11px] font-bold mr-2" }, "Palette:"),
                ['accessible', 'vibrant', 'monochrome'].map(function(option) {
                  return React.createElement("button", { key: option, onClick: function() { updDS('palette', option); }, "aria-pressed": palette === option,
                    className: "mr-1 px-2 py-1 rounded text-[10px] font-bold", style: { background: palette === option ? _btnBg : _svgBg, color: palette === option ? '#fff' : _text, border: '1px solid ' + _border } },
                    option === 'accessible' ? "Color-safe" : option.charAt(0).toUpperCase() + option.slice(1));
                })
              ),
              React.createElement("div", { className: "flex flex-wrap gap-3 mt-2" },
                React.createElement("label", { className: "flex items-center gap-1 text-[11px] font-bold" },
                  React.createElement("input", { type: "checkbox", checked: showDataLabels, onChange: function(e) { updDS('showDataLabels', e.target.checked); } }), "Data labels"),
                React.createElement("label", { className: "flex items-center gap-1 text-[11px] font-bold" },
                  React.createElement("input", { type: "checkbox", checked: showGridlines, onChange: function(e) { updDS('showGridlines', e.target.checked); } }), "Gridlines")
              ),
              chartType === 'histogram' && React.createElement("label", { className: "block mt-2 text-[11px] font-bold" }, "Histogram bins: " + (histogramBins || 'Auto'),
                React.createElement("input", { type: "range", min: 0, max: 12, step: 1, value: histogramBins, onChange: function(e) { updDS('histogramBins', Number(e.target.value)); }, className: "block w-full mt-1", "aria-label": "Histogram bins; zero uses automatic binning" }))
            ),

            React.createElement("div", { className: "rounded-2xl overflow-hidden", style: { border: '1px solid ' + _border } },

              React.createElement("svg", { viewBox: '0 0 ' + W + ' ' + H, className: "w-full", role: "img", "data-datastudio-chart": "true",
                "aria-label": chartTitle + '. ' + (CHART_TYPES.find(function(ct) { return ct.id === chartType; }) || { label: chartType }).label + ' with ' + displayRows.length + ' data points.',
                style: { background: _svgBg, maxHeight: '340px' } },
                React.createElement("title", null, chartTitle),
                React.createElement("desc", null, (descriptionRows.length ? descriptionRows.map(function(row, i) { return chartType === 'scatter' ? row.label + ': x ' + getScatterX(row, i) + ', y ' + row.value : row.label + ': ' + row.value; }).join('; ') : 'No data points are currently visible.') + (displayRows.length > descriptionRows.length ? '; plus ' + (displayRows.length - descriptionRows.length) + ' additional points available in the data table.' : '') + (dataSource ? ' Source: ' + dataSource + '.' : '')),
                chartType !== 'pie' && xAxisLabel && React.createElement("text", { x: W / 2, y: H - 7, textAnchor: "middle", style: { fontSize: '9px', fontWeight: 'bold', fill: _muted } }, xAxisLabel),
                chartType !== 'pie' && yAxisLabel && React.createElement("text", { x: 12, y: H / 2, textAnchor: "middle", transform: "rotate(-90 12 " + (H / 2) + ")", style: { fontSize: '9px', fontWeight: 'bold', fill: _muted } }, yAxisLabel),

                // Title

                React.createElement("text", { x: W / 2, y: 18, textAnchor: "middle", style: { fontSize: '13px', fontWeight: 'bold', fill: _text } }, chartTitle),



                // ── Bar Chart ──

                chartType === 'bar' && displayRows.length > 0 && (() => {

                  var barW = Math.max(2, Math.min(40, (W - 2 * pad) / displayRows.length - 4));
                  var gap = (W - 2 * pad) / displayRows.length;
                  var barScaleMin = Math.min(0, minVal), barScaleMax = Math.max(0, maxVal);
                  var barScaleRange = barScaleMax - barScaleMin || 1;
                  var barZeroY = chartTop + (barScaleMax / barScaleRange) * (H - pad - chartTop);

                  return React.createElement("g", null,

                    // Y axis

                    React.createElement("line", { x1: pad, y1: chartTop, x2: pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),

                    // X axis

                    React.createElement("line", { x1: pad, y1: barZeroY, x2: W - 10, y2: barZeroY, stroke: _muted, strokeWidth: 0.5 }),

                    // Y labels

                    [0, 0.25, 0.5, 0.75, 1].map(function (frac, i) {

                      var yVal = (barScaleMin + barScaleRange * frac).toFixed(Math.abs(barScaleRange) < 5 ? 1 : 0);

                      var yPos = (H - pad) - frac * (H - pad - chartTop);

                      return React.createElement("g", { key: 'yl' + i },

                        React.createElement("text", { x: pad - 5, y: yPos + 3, textAnchor: "end", style: { fontSize: '11px', fill: _muted } }, yVal),

                        showGridlines && React.createElement("line", { x1: pad, y1: yPos, x2: W - 10, y2: yPos, stroke: _muted, strokeWidth: 0.2, strokeDasharray: "3 3" })

                      );

                    }),

                    // Bars

                    displayRows.map(function (row, i) {

                      var valueY = chartTop + ((barScaleMax - row.value) / barScaleRange) * (H - pad - chartTop);
                      var barH = Math.abs(barZeroY - valueY);
                      var x = pad + i * gap + (gap - barW) / 2;
                      var y = Math.min(barZeroY, valueY);
                      var valueLabelY = row.value < 0 ? y + barH + 12 : y - 4;

                      return React.createElement("g", { key: 'bar' + i },

                        React.createElement("rect", { x: x, y: y, width: barW, height: barH, rx: 3, fill: COLORS[i % COLORS.length], opacity: 0.85 }),

                        effectiveDataLabels && React.createElement("text", { x: x + barW / 2, y: valueLabelY, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold', fill: _text } }, row.value),

                        React.createElement("text", { x: x + barW / 2, y: H - pad + 12, textAnchor: "middle", style: { fontSize: '8px', fill: _muted } }, row.label.length > 6 ? row.label.substring(0, 5) + '..' : row.label)

                      );

                    })

                  );

                })(),



                // ── Pie Chart ──

                chartType === 'pie' && displayRows.length > 0 && total > 0 && !values.some(function(v) { return v < 0; }) && (() => {

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

                        effectiveDataLabels && pct >= 5 && React.createElement("text", { x: lx, y: ly + 3, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold', fill: _text } }, row.label.substring(0, 5) + ' ' + pct + '%')

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

                    React.createElement("path", { d: pathD, fill: "none", stroke: _accent, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", style: { filter: 'drop-shadow(0 0 4px ' + _accent + ')' } }),

                    trendEls,

                    pts.map(function (p, i) {

                      return React.createElement("g", { key: 'lp' + i },

                        React.createElement("circle", { cx: p.x, cy: p.y, r: 4, fill: _accent, stroke: _svgBg, strokeWidth: 2 }),

                        effectiveDataLabels && React.createElement("text", { x: p.x, y: p.y - 8, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold', fill: _text } }, p.value),

                        React.createElement("text", { x: p.x, y: H - pad + 12, textAnchor: "middle", style: { fontSize: '7px', fill: _muted } }, p.label.length > 5 ? p.label.substring(0, 4) + '..' : p.label)

                      );

                    })

                  );

                })(),



                // ── Scatter Plot ──

                chartType === 'scatter' && displayRows.length > 0 && (() => {
                  var xValues = displayRows.map(getScatterX);
                  var minX = Math.min.apply(null, xValues), maxX = Math.max.apply(null, xValues);
                  var xDomainMin = minX === maxX ? minX - 0.5 : minX, xDomainMax = minX === maxX ? maxX + 0.5 : maxX;
                  var yDomainMin = minVal === maxVal ? minVal - 0.5 : minVal, yDomainMax = minVal === maxVal ? maxVal + 0.5 : maxVal;
                  var scaleX = function(x) { return pad + ((x - xDomainMin) / (xDomainMax - xDomainMin)) * (W - 2 * pad); };
                  var scaleY = function(y) { return (H - pad) - ((y - yDomainMin) / (yDomainMax - yDomainMin)) * (H - pad - chartTop); };
                  var pts = displayRows.map(function(row, i) { return { x: scaleX(xValues[i]), y: scaleY(row.value), rawX: xValues[i], label: row.label, value: row.value }; });
                  var trendEls = [];
                  if (showTrendline && displayRows.length >= 2) {
                    var tl = calcTrendline(displayRows, true);
                    if (tl) {
                      var yAtMin = tl.slope * minX + tl.intercept, yAtMax = tl.slope * maxX + tl.intercept;
                      var ssRes = 0, ssTot = 0;
                      displayRows.forEach(function(row, i) { var pred = tl.slope * xValues[i] + tl.intercept; ssRes += Math.pow(row.value - pred, 2); ssTot += Math.pow(row.value - mean, 2); });
                      var rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
                      trendEls.push(React.createElement("line", { key: 'tl', x1: scaleX(minX), y1: scaleY(yAtMin), x2: scaleX(maxX), y2: scaleY(yAtMax), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '6 3', opacity: 0.8 }));
                      trendEls.push(React.createElement("text", { key: 'tl-label', x: W - 12, y: chartTop + 10, textAnchor: "end", style: { fontSize: '8px', fontWeight: 'bold', fill: '#ef4444' } }, 'y=' + tl.slope.toFixed(2) + 'x' + (tl.intercept >= 0 ? '+' : '') + tl.intercept.toFixed(2)));
                      trendEls.push(React.createElement("text", { key: 'r2', x: W - 12, y: chartTop + 21, textAnchor: "end", style: { fontSize: '8px', fill: '#ef4444' } }, 'R?=' + rSquared.toFixed(3)));
                    }
                  }
                  return React.createElement("g", null,
                    React.createElement("line", { x1: pad, y1: chartTop, x2: pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),
                    React.createElement("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),
                    [0, 0.25, 0.5, 0.75, 1].map(function(frac, i) {
                      var rawY = yDomainMin + (yDomainMax - yDomainMin) * frac, y = scaleY(rawY);
                      return React.createElement("g", { key: 'scatter-y-' + i },
                        React.createElement("text", { x: pad - 5, y: y + 3, textAnchor: "end", style: { fontSize: '9px', fill: _muted } }, Number(rawY.toFixed(2))),
                        showGridlines && React.createElement("line", { x1: pad, y1: y, x2: W - pad, y2: y, stroke: _muted, strokeWidth: 0.2, strokeDasharray: "3 3" }));
                    }),
                    [0, 0.25, 0.5, 0.75, 1].map(function(frac, i) {
                      var rawX = xDomainMin + (xDomainMax - xDomainMin) * frac, x = scaleX(rawX);
                      return React.createElement("g", { key: 'scatter-x-' + i },
                        React.createElement("text", { x: x, y: H - pad + 13, textAnchor: "middle", style: { fontSize: '8px', fill: _muted } }, Number(rawX.toFixed(2))),
                        React.createElement("line", { x1: x, y1: H - pad, x2: x, y2: H - pad + 4, stroke: _muted }));
                    }),
                    trendEls,
                    pts.map(function(point, i) {
                      return React.createElement("g", { key: 'sp' + i },
                        React.createElement("circle", { cx: point.x, cy: point.y, r: 5, fill: COLORS[i % COLORS.length], stroke: _svgBg, strokeWidth: 2, opacity: 0.9 },
                          React.createElement("title", null, point.label + ': x ' + point.rawX + ', y ' + point.value)),
                        effectiveDataLabels && React.createElement("text", { x: point.x, y: point.y - 8, textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold', fill: _text } }, point.label.length > 8 ? point.label.substring(0, 7) + '..' : point.label));
                    }),
                    pearsonR !== null && React.createElement("text", { x: pad + 4, y: chartTop + 10, style: { fontSize: '8px', fontWeight: 'bold', fill: _accent } }, 'Pearson r=' + pearsonR.toFixed(3))
                  );
                })(),



                // Box-and-whisker plot
                chartType === 'box' && displayRows.length > 0 && (() => {
                  var domainMin = range === 0 ? minVal - 0.5 : minVal, domainMax = range === 0 ? maxVal + 0.5 : maxVal;
                  var plotLeft = pad + 12, plotRight = W - 24, plotY = H / 2;
                  var scaleBox = function(value) { return plotLeft + ((value - domainMin) / (domainMax - domainMin)) * (plotRight - plotLeft); };
                  var boxTop = plotY - 38, boxHeight = 76;
                  var tickValues = [minVal, q1, median, q3, maxVal].filter(function(value, i, all) { return all.indexOf(value) === i; });
                  return React.createElement("g", null,
                    React.createElement("line", { x1: scaleBox(whiskerMin), y1: plotY, x2: scaleBox(whiskerMax), y2: plotY, stroke: _accent, strokeWidth: 3 }),
                    React.createElement("line", { x1: scaleBox(whiskerMin), y1: plotY - 18, x2: scaleBox(whiskerMin), y2: plotY + 18, stroke: _accent, strokeWidth: 2 }),
                    React.createElement("line", { x1: scaleBox(whiskerMax), y1: plotY - 18, x2: scaleBox(whiskerMax), y2: plotY + 18, stroke: _accent, strokeWidth: 2 }),
                    React.createElement("rect", { x: scaleBox(q1), y: boxTop, width: Math.max(1, scaleBox(q3) - scaleBox(q1)), height: boxHeight, rx: 4, fill: _accent, opacity: 0.2, stroke: _accent, strokeWidth: 2 }),
                    React.createElement("line", { x1: scaleBox(median), y1: boxTop, x2: scaleBox(median), y2: boxTop + boxHeight, stroke: '#ef4444', strokeWidth: 3 }),
                    outliers.map(function(row, i) { return React.createElement("circle", { key: 'box-outlier-' + i, cx: scaleBox(row.value), cy: plotY, r: 5, fill: '#f59e0b', stroke: _svgBg, strokeWidth: 2 }); }),
                    React.createElement("line", { x1: plotLeft, y1: H - pad, x2: plotRight, y2: H - pad, stroke: _muted, strokeWidth: 0.5 }),
                    tickValues.map(function(value, i) { return React.createElement("g", { key: 'box-tick-' + i },
                      React.createElement("line", { x1: scaleBox(value), y1: H - pad, x2: scaleBox(value), y2: H - pad + 5, stroke: _muted }),
                      React.createElement("text", { x: scaleBox(value), y: H - pad + 17, textAnchor: "middle", style: { fontSize: '9px', fill: _muted } }, Number(value.toFixed(2)))); }),
                    React.createElement("text", { x: W / 2, y: 42, textAnchor: "middle", style: { fontSize: '9px', fill: _muted } }, "Whiskers show non-outlier range; dots mark possible outliers")
                  );
                })(),

                chartType === 'histogram' && displayRows.length > 0 && (() => {

                  // For histogram, bin the values

                  var numBins = histogramBins || Math.min(8, Math.max(3, Math.ceil(Math.sqrt(values.length))));

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

                        effectiveDataLabels && bin.count > 0 && React.createElement("text", { x: x + bw / 2, y: y - 3, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold', fill: _text } }, bin.count),

                        React.createElement("text", { x: x + bw / 2, y: H - pad + 11, textAnchor: "middle", style: { fontSize: '7px', fill: _muted } }, bin.lo.toFixed(0) + '-' + bin.hi.toFixed(0))

                      );

                    })

                  );

                })()

              )

            ),



            // ── Sort / Filter / Trendline Controls ──

            dataSource && React.createElement("p", { className: "px-2 text-[11px]", role: "note", style: { color: _muted } },
              React.createElement("strong", null, "Source: "), dataSource),
            showDataLabels && !effectiveDataLabels && React.createElement("p", { className: "px-2 text-[11px]", role: "status", style: { color: isDark ? '#fcd34d' : '#92400e' } },
              "Data labels are automatically hidden above 100 visible points to keep the chart readable. Filter the data to restore them."),

            React.createElement("details", { className: "rounded-xl p-2 text-xs", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("summary", { className: "font-bold cursor-pointer", style: { color: _accent } }, "View data table (" + displayRows.length + " rows)"),
              React.createElement("div", { className: "overflow-x-auto mt-2" },
                React.createElement("table", { className: "w-full text-left" },
                  React.createElement("caption", { className: "sr-only" }, chartTitle + " chart data"),
                  React.createElement("thead", null, React.createElement("tr", null,
                    React.createElement("th", { scope: "col", className: "p-1" }, "Label"),
                    (chartType === 'scatter' || hasExplicitX) && React.createElement("th", { scope: "col", className: "p-1" }, "X"),
                    React.createElement("th", { scope: "col", className: "p-1" }, chartType === 'scatter' || hasExplicitX ? "Y" : "Value"))),
                  React.createElement("tbody", null, tableRows.map(function(row, i) {
                    var rowIndex = tableStart + i;
                    return React.createElement("tr", { key: "table-" + rowIndex },
                      React.createElement("th", { scope: "row", className: "p-1 font-semibold" }, row.label),
                      (chartType === 'scatter' || hasExplicitX) && React.createElement("td", { className: "p-1 font-mono" }, getScatterX(row, rowIndex)),
                      React.createElement("td", { className: "p-1 font-mono" }, row.value));
                  }))
                )
              ),
              tablePageCount > 1 && React.createElement("div", { className: "flex items-center justify-between gap-2 mt-2", role: "group", "aria-label": "Data table pagination" },
                React.createElement("button", { disabled: tablePage === 0, onClick: function() { updDS('tablePage', Math.max(0, tablePage - 1)); }, className: "px-2 py-1 rounded font-bold disabled:opacity-40", style: { background: _btnBg, color: '#fff' } }, "Previous"),
                React.createElement("span", { className: "font-semibold" }, "Table page " + (tablePage + 1) + " of " + tablePageCount),
                React.createElement("button", { disabled: tablePage >= tablePageCount - 1, onClick: function() { updDS('tablePage', Math.min(tablePageCount - 1, tablePage + 1)); }, className: "px-2 py-1 rounded font-bold disabled:opacity-40", style: { background: _btnBg, color: '#fff' } }, "Next")
              )
            ),
            displayRows.length === 0 && React.createElement("div", { role: "status", className: "rounded-xl p-3 text-sm font-bold text-center",
              style: { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', color: isDark ? '#fcd34d' : '#92400e' } },
              dataRows.length ? (filterMin !== '' && filterMax !== '' && filterMin > filterMax ? 'The minimum filter is greater than the maximum. Adjust or clear the filters.' : 'No rows match the current filters. Clear the filters to see your chart.') : 'Add a data point or choose a preset to begin.'),
            chartType === 'pie' && (total <= 0 || values.some(function(v) { return v < 0; })) && React.createElement("div", { role: "note", className: "rounded-xl p-2 text-xs",
              style: { background: 'rgba(245,158,11,0.12)', color: isDark ? '#fcd34d' : '#92400e' } },
              'Pie charts represent parts of a positive whole. Use at least one positive value and remove or filter negative values.'),

            React.createElement("div", { className: "flex gap-2 flex-wrap items-center", style: { marginBottom: 4 } },

              // Sort controls

              React.createElement("span", { className: "text-[11px] font-bold", style: { color: _muted } }, "SORT:"),

              ['none', 'asc', 'desc'].map(function (s) {

                var labels = { none: '— None', asc: '↑ Asc', desc: t('stem.datastudio.desc', '↓ Desc') };

                return React.createElement("button", { key: s,

                  onClick: function () { updDS('sortOrder', s); },

                  className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all",

                  style: { background: sortOrder === s ? _btnBg : _card, color: sortOrder === s ? '#fff' : _text, border: '1px solid ' + _border }

                }, labels[s]);

              }),

              // Filter controls

              React.createElement("span", { className: "text-[11px] font-bold ml-2", style: { color: _muted } }, "FILTER:"),

              React.createElement("input", { type: "search", placeholder: "Label contains?", value: labelFilter, "aria-label": "Filter rows by label",
                onChange: function(e) { updDSMany({ labelFilter: e.target.value, tablePage: 0 }); }, className: "w-28 px-1.5 py-1 rounded-lg text-[11px]",
                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' } }),

              React.createElement("input", {

                type: "number", placeholder: "Min", value: filterMin, "aria-label": "Minimum value filter",

                onChange: function (e) { updDS('filterMin', e.target.value === '' ? '' : parseFloat(e.target.value)); },

                className: "w-14 px-1.5 py-1 rounded-lg text-[11px] font-mono",

                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

              }),

              React.createElement("span", { className: "text-[11px]", style: { color: _muted } }, "to"),

              React.createElement("input", {

                type: "number", placeholder: "Max", value: filterMax, "aria-label": "Maximum value filter",

                onChange: function (e) { updDS('filterMax', e.target.value === '' ? '' : parseFloat(e.target.value)); },

                className: "w-14 px-1.5 py-1 rounded-lg text-[11px] font-mono",

                style: { background: _card, border: '1px solid ' + _border, color: _text, outline: 'none' },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

              }),

              (labelFilter || filterMin !== '' || filterMax !== '') && React.createElement("button", { "aria-label": t('stem.datastudio.clear', "Clear"),

                onClick: function () { updDSMany({ labelFilter: '', filterMin: '', filterMax: '', tablePage: 0 }); },

                className: "px-2 py-1 rounded-lg text-[11px] font-bold",

                style: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }

              }, t('stem.datastudio.clear_2', "✕ Clear")),

              displayRows.length !== dataRows.length && React.createElement("span", { className: "text-[11px] font-bold", style: { color: _accent } }, '(' + displayRows.length + '/' + dataRows.length + ' shown)'),

              // Trendline toggle (for line/scatter)

              (chartType === 'line' || chartType === 'scatter') && React.createElement("button", { onClick: function () { updDS('showTrendline', !showTrendline); },

                className: "px-2.5 py-1 rounded-lg text-[11px] font-bold ml-auto transition-all",

                style: { background: showTrendline ? '#ef4444' : _card, color: showTrendline ? '#fff' : _text, border: '1px solid ' + (showTrendline ? '#ef4444' : _border) }

              }, showTrendline ? '📉 Trendline On' : '📉 Trendline')

            ),



            // ── Preset Datasets ──

            React.createElement("div", { className: "flex gap-2 flex-wrap" },

              React.createElement("span", { className: "text-[11px] font-bold self-center", style: { color: _muted } }, "PRESETS:"),

              PRESETS.map(function (p, i) {

                return React.createElement("button", { key: i,

                  onClick: function () { commitDataRows(p.data, { chartTitle: p.title, filterMin: '', filterMax: '', sortOrder: 'none' }, 'Preset loaded. Undo is available.'); if (typeof awardStemXP === 'function') awardStemXP('dataStudio', 3, 'Preset: ' + p.title); },

                  className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-105",

                  style: { background: _card, border: '1px solid ' + _border, color: _accent }

                }, p.label);

              })

            ),



            // ── CSV Import ──

            React.createElement("div", { className: "flex flex-wrap gap-2" },

              React.createElement("button", { "aria-label": t('stem.datastudio.import_csv_data_file', "Import CSV data file"),

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

              }, t('stem.datastudio.import_csv', "📂 Import CSV")),

              React.createElement("button", { "aria-label": t('stem.datastudio.export_csv', "Export CSV"),

                onClick: function () {

                  var csv = serializeDataStudioCSV(dataRows);

                  var blob = new Blob([csv], { type: 'text/csv' });

                  var url = URL.createObjectURL(blob);

                  var a = document.createElement('a');

                  a.href = url; a.download = ((chartTitle || 'data').replace(/[^a-z0-9 _-]/gi, '').trim() || 'data') + '.csv';

                  a.click(); URL.revokeObjectURL(url);

                },

                className: "px-3 py-2 rounded-xl text-xs font-bold transition-all",

                style: { background: _card, border: '1px solid ' + _border, color: _accent }

              }, t('stem.datastudio.export_csv_2', "💾 Export CSV")),
              React.createElement("button", { "aria-label": "Export chart as SVG", onClick: function() {
                  var el = document.querySelector('[data-datastudio-chart="true"]');
                  if (!el || typeof XMLSerializer === 'undefined') { if (addToast) addToast('Chart export is not available.', 'warning'); return; }
                  var clone = el.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                  var blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
                  var url = URL.createObjectURL(blob), a = document.createElement('a');
                  a.href = url; a.download = (((chartTitle || 'chart').replace(/[^a-z0-9 _-]/gi, '').trim() || 'chart') + '.svg');
                  a.click(); setTimeout(function() { URL.revokeObjectURL(url); }, 0);
                  if (addToast) addToast('Chart exported as SVG.', 'success');
                }, className: "px-3 py-2 rounded-xl text-xs font-bold transition-all", style: { background: _card, border: '1px solid ' + _border, color: _accent }
              }, "Export SVG"),
              React.createElement("button", { "aria-label": "Export analysis as JSON", onClick: function() {
                  var report = {
                    schema: 'alloflow-data-studio-report-v1', title: chartTitle, chartType: chartType,
                    axes: { x: xAxisLabel, y: yAxisLabel }, source: dataSource, rows: dataRows,
                    presentation: { palette: palette, dataLabels: showDataLabels, effectiveDataLabels: effectiveDataLabels, gridlines: showGridlines },
                    visibleRows: displayRows.length, filters: { label: labelFilter, min: filterMin, max: filterMax, sort: sortOrder },
                    statistics: { count: values.length, sum: total, mean: mean, median: median, standardDeviation: stdDev, standardDeviationMethod: stdDevMode,
                      minimum: minVal, maximum: maxVal, range: range, q1: q1, q3: q3, iqr: iqr, mode: modeVal,
                      pearsonR: chartType === 'scatter' ? pearsonR : null },
                    chartCoach: { recommendation: recommendedChart, reason: recommendationReason }
                  };
                  var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
                  a.href = url; a.download = (((chartTitle || 'analysis').replace(/[^a-z0-9 _-]/gi, '').trim() || 'analysis') + '.json');
                  a.click(); setTimeout(function() { URL.revokeObjectURL(url); }, 0);
                  if (addToast) addToast('Analysis report exported.', 'success');
                }, className: "px-3 py-2 rounded-xl text-xs font-bold transition-all", style: { background: _card, border: '1px solid ' + _border, color: _accent } }, "Export JSON")

            ),



            // ── Data Editor ──

            React.createElement("div", { className: "rounded-2xl p-3", style: { background: _card, border: '1px solid ' + _border } },

              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("div", { className: "text-xs font-bold", style: { color: _accent } }, "Data (" + dataRows.length + " items" + (displayRows.length !== dataRows.length ? ', ' + displayRows.length + ' shown' : '') + ")"),
                React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": "Data change history" },
                  React.createElement("button", { onClick: undoDataChange, disabled: !undoStack.length, "aria-label": "Undo last structural data change",
                    title: "Undo imports, presets, additions, removals, or clears", className: "px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40", style: { border: '1px solid ' + _border, color: _accent } }, "Undo"),
                  React.createElement("button", { onClick: redoDataChange, disabled: !redoStack.length, "aria-label": "Redo structural data change",
                    className: "px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40", style: { border: '1px solid ' + _border, color: _accent } }, "Redo")
                )
              ),

              // Add row

              React.createElement("div", { className: "flex gap-2 mb-2" },

                React.createElement("input", {

                  type: "text", placeholder: t('stem.datastudio.label', "Label"),

                  value: editRow.label,

                  onChange: function (e) { updDS('editRow', { label: e.target.value, x: editRow.x, value: editRow.value }); },

                  className: "flex-1 px-2 py-1.5 rounded-lg text-xs",

                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

                }),

                chartType === 'scatter' && React.createElement("input", {
                  type: "number", placeholder: "X", value: editRow.x,
                  onChange: function(e) { updDS('editRow', { label: editRow.label, x: e.target.value, value: editRow.value }); },
                  className: "w-20 px-2 py-1.5 rounded-lg text-xs font-mono",
                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' },
                  "aria-label": "New point X value"
                }),

                React.createElement("input", {

                  type: "number", placeholder: t('stem.datastudio.value', "Value"),

                  value: editRow.value,

                  onChange: function (e) { updDS('editRow', { label: editRow.label, x: editRow.x, value: e.target.value }); },

                  onKeyDown: function (e) {

                    if (e.key === 'Enter' && editRow.label && editRow.value !== '') {

                      commitDataRows(dataRows.concat([buildEditDataRow()]), {}, 'Data row added.');

                      updDS('editRow', { label: '', x: '', value: '' });

                    }

                  },

                  className: "w-20 px-2 py-1.5 rounded-lg text-xs font-mono",

                  style: { background: _svgBg, border: '1px solid ' + _border, color: _text, outline: 'none' },
                  onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #6366f1'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }

                }),

                React.createElement("button", { "aria-label": t('stem.datastudio.add', "+ Add"),

                  onClick: function () {

                    if (editRow.label && editRow.value !== '') {

                      commitDataRows(dataRows.concat([buildEditDataRow()]), {}, 'Data row added.');

                      updDS('editRow', { label: '', x: '', value: '' });

                    }

                  },

                  className: "px-3 py-1.5 rounded-lg text-xs font-bold",

                  style: { background: _btnBg, color: '#fff' }

                }, t('stem.datastudio.add_2', "+ Add"))

              ),

              // Data rows

              React.createElement("div", { className: "max-h-28 overflow-y-auto space-y-1" },

                editorRows.map(function (row, pageIndex) {

                  var i = editorStart + pageIndex;
                  return React.createElement("div", { key: i, className: "flex items-center gap-2 py-1 px-2 rounded-lg text-xs", style: { background: _svgBg } },

                    React.createElement("div", { className: "w-3 h-3 rounded-full", style: { background: COLORS[i % COLORS.length] } }),

                    React.createElement("input", { value: row.label, "aria-label": "Label for row " + (i + 1),
                      onChange: function(e) { var next = dataRows.slice(); next[i] = Object.assign({}, row, { label: e.target.value }); updDS('dataRows', next); },
                      className: "flex-1 min-w-0 px-1 py-0.5 rounded font-bold", style: { background: 'transparent', border: '1px solid transparent', color: _text } }),
                    chartType === 'scatter' && React.createElement("input", { type: "number", value: row.x !== undefined ? row.x : getScatterX(row, i), "aria-label": "X value for " + (row.label || ('row ' + (i + 1))),
                      onChange: function(e) { var next = dataRows.slice(), num = Number(e.target.value); if (isFinite(num)) { next[i] = Object.assign({}, row, { x: num }); updDS('dataRows', next); } },
                      className: "w-20 px-1 py-0.5 rounded font-mono text-right", style: { background: 'transparent', border: '1px solid transparent', color: _muted } }),
                    React.createElement("input", { type: "number", value: row.value, "aria-label": "Value for " + (row.label || ('row ' + (i + 1))),
                      onChange: function(e) { var next = dataRows.slice(), num = Number(e.target.value); if (isFinite(num)) { next[i] = Object.assign({}, row, { value: num }); updDS('dataRows', next); } },
                      className: "w-24 px-1 py-0.5 rounded font-mono text-right", style: { background: 'transparent', border: '1px solid transparent', color: _muted } }),

                    React.createElement("button", { "aria-label": t('stem.datastudio.remove_row', "Remove row") + " " + (row.label || (i + 1)), onClick: function () { commitDataRows(dataRows.filter(function (_, j) { return j !== i; }), {}, 'Data row removed.'); },

                      className: "text-red-400 hover:text-red-600 font-bold text-xs"

                    }, "✕")

                  );

                })

              ),
              editorPageCount > 1 && React.createElement("div", { className: "flex items-center justify-between gap-2 mt-2", role: "group", "aria-label": "Data editor pagination" },
                React.createElement("button", { disabled: editorPage === 0, onClick: function() { updDS('editorPage', Math.max(0, editorPage - 1)); }, className: "px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40", style: { background: _btnBg, color: '#fff' } }, "Previous"),
                React.createElement("span", { className: "text-[11px] font-semibold" }, "Page " + (editorPage + 1) + " of " + editorPageCount),
                React.createElement("button", { disabled: editorPage >= editorPageCount - 1, onClick: function() { updDS('editorPage', Math.min(editorPageCount - 1, editorPage + 1)); }, className: "px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40", style: { background: _btnBg, color: '#fff' } }, "Next")
              ),

              // Clear

              dataRows.length > 0 && React.createElement("button", { "aria-label": t('stem.datastudio.clear_all', "Clear All"),

                onClick: function () { commitDataRows([], {}, 'All data rows cleared. Undo is available.'); },

                className: "mt-2 px-3 py-1 rounded-lg text-[11px] font-bold",

                style: { background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }

              }, t('stem.datastudio.clear_all_2', "🗑 Clear All")),

            ),



            // ── Statistics Panel ──

            workspaceTab === 'analyze' && dataRows.length > 0 && React.createElement(React.Fragment, null,

            React.createElement("div", { className: "rounded-xl p-3", role: "region", "aria-label": "Data Preparation", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("div", { className: "text-xs font-bold mb-1", style: { color: _accent } }, "Data Preparation"),
              React.createElement("p", { className: "text-[11px] mb-2", style: { color: _muted } }, duplicateLabelCount ? duplicateLabelCount + " repeated label group" + (duplicateLabelCount === 1 ? " is" : "s are") + " ready to combine. Labels match without regard to capitalization." : "No repeated label groups detected."),
              React.createElement("div", { className: "flex flex-wrap items-center gap-2", role: "group", "aria-label": "Combine duplicate labels" },
                React.createElement("span", { className: "text-[11px] font-bold", style: { color: _muted } }, "COMBINE BY:"),
                ['sum', 'mean', 'count'].map(function(method) {
                  return React.createElement("button", { key: method, disabled: !duplicateLabelCount, onClick: function() { aggregateDuplicateLabels(method); },
                    className: "px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40", style: { border: '1px solid ' + _border, color: _accent } }, method.charAt(0).toUpperCase() + method.slice(1));
                })
              )
            ),

            React.createElement("div", { className: "rounded-xl p-3", role: "region", "aria-label": "Transform Lab", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("div", { className: "text-xs font-bold mb-1", style: { color: _accent } }, "Transform Lab"),
              React.createElement("p", { className: "text-[11px] mb-2", style: { color: _muted } }, "Transform every row. Each action is undoable."),
              React.createElement("div", { className: "flex flex-wrap gap-2" },
                React.createElement("button", { onClick: function() { transformData('percent'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold", style: { border: '1px solid ' + _border, color: _accent } }, "Percent of total"),
                React.createElement("button", { onClick: function() { transformData('cumulative'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold", style: { border: '1px solid ' + _border, color: _accent } }, "Cumulative total"),
                React.createElement("button", { onClick: function() { transformData('zscore'); }, disabled: stdDev === 0, className: "px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40", style: { border: '1px solid ' + _border, color: _accent } }, "Z-scores")
              )
            ),

            showStats && React.createElement("div", { className: "flex flex-wrap items-center gap-2", role: "group", "aria-label": "Standard deviation method" },
              React.createElement("span", { className: "text-[11px] font-bold", style: { color: _muted } }, "STD DEV:"),
              ['population', 'sample'].map(function(mode) {
                var active = stdDevMode === mode;
                return React.createElement("button", { key: mode, onClick: function() { updDS('stdDevMode', mode); }, "aria-pressed": active, disabled: mode === 'sample' && values.length < 2,
                  className: "px-2 py-1 rounded-lg text-[11px] font-bold disabled:opacity-40", style: { background: active ? _btnBg : _card, color: active ? '#fff' : _text, border: '1px solid ' + _border } },
                  mode === 'population' ? "Population (N)" : "Sample (N-1)");
              })
            ),

            showStats && React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", "aria-label": "Descriptive statistics" },

              [

                { label: 'Sum', val: total.toFixed(1) },

                { label: t('stem.datastudio.mean', 'Mean'), val: mean.toFixed(1) },

                { label: t('stem.datastudio.median', 'Median'), val: median.toFixed(1) },

                { label: (stdDevMode === 'sample' ? 'Sample ' : '') + t('stem.datastudio.std_dev', 'Std Dev'), val: stdDev.toFixed(1) }

              ].map(function (stat, i) {

                return React.createElement("div", { key: i, className: "p-2 rounded-xl text-center", style: { background: _card, border: '1px solid ' + _border } },

                  React.createElement("div", { className: "text-[11px] font-bold uppercase", style: { color: _muted } }, stat.label),

                  React.createElement("div", { className: "text-sm font-bold font-mono", style: { color: _accent } }, stat.val)

                );

              })

            ),



            showStats && React.createElement("div", { className: "rounded-xl p-3 text-xs space-y-1", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("div", { className: "font-bold", style: { color: _accent } }, "Quick insights"),
              React.createElement("p", null, displayRows.length + " shown of " + dataRows.length + " rows. Range: " + range.toFixed(1) + ". Trend: " + trendDirection + "."),
              minRow && maxRow && React.createElement("p", null, "Lowest: " + minRow.label + " (" + minVal + "). Highest: " + maxRow.label + " (" + maxVal + ")."),
              React.createElement("p", null, "Mode: " + modeVal + ". Q1: " + q1.toFixed(1) + ". Q3: " + q3.toFixed(1) + ". IQR: " + iqr.toFixed(1) + "."),
              chartType === 'scatter' && pearsonR !== null && React.createElement("p", null, "Pearson correlation: r = " + pearsonR.toFixed(3) + ". " + (Math.abs(pearsonR) >= 0.7 ? "Strong" : Math.abs(pearsonR) >= 0.4 ? "Moderate" : "Weak") + " " + (pearsonR >= 0 ? "positive" : "negative") + " linear relationship."),
              values.length > 1 && React.createElement("p", null, "Approximate 95% confidence interval for the mean: " + confidenceLow.toFixed(1) + " to " + confidenceHigh.toFixed(1) + " (normal approximation)."),
              React.createElement("p", null, outliers.length ? "Possible outliers: " + outliers.map(function(row) { return row.label + " (" + row.value + ")"; }).join(", ") + "." : "No IQR outliers detected.")
            ),

            // ?? AI Data Story Panel (reading-level aware) ?? ──

            showStats && React.createElement("div", { className: "rounded-xl p-3 text-xs", role: "region", "aria-label": "Data quality report", style: { background: _card, border: '1px solid ' + _border } },
              React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                React.createElement("span", { className: "font-bold", style: { color: _accent } }, "Data quality"),
                typeof callTTS === 'function' && React.createElement("button", { className: "ml-auto px-2 py-1 rounded-lg text-[11px] font-bold", style: { border: '1px solid ' + _border, color: _accent },
                  onClick: function() { callTTS("Data summary. " + displayRows.length + " rows shown. Mean " + mean.toFixed(1) + ". Median " + median.toFixed(1) + ". Trend " + trendDirection + "." + (chartType === 'scatter' && pearsonR !== null ? " Pearson correlation " + pearsonR.toFixed(3) + "." : "")); }, "aria-label": "Read data summary aloud" }, "Read aloud")
              ),
              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
                [
                  { label: "Duplicate labels", value: duplicateLabelCount, warn: duplicateLabelCount > 0 },
                  { label: "Blank labels", value: blankLabelCount, warn: blankLabelCount > 0 },
                  { label: "Negative values", value: negativeCount, warn: negativeCount > 0 && chartType === 'pie' },
                  { label: chartType === 'scatter' ? "Duplicate X values" : "Unique values", value: chartType === 'scatter' ? duplicateXCount : uniqueValueCount + "/" + dataRows.length, warn: chartType === 'scatter' && duplicateXCount > 0 }
                ].map(function(item) {
                  return React.createElement("div", { key: item.label, className: "rounded-lg p-2", style: { background: _svgBg, border: '1px solid ' + (item.warn ? '#f59e0b' : _border) } },
                    React.createElement("div", { className: "text-[10px] font-bold", style: { color: _muted } }, item.label),
                    React.createElement("div", { className: "font-mono font-bold", style: { color: item.warn ? '#d97706' : _accent } }, item.value));
                })
              ),
              zeroCount > 0 && React.createElement("p", { className: "mt-2", style: { color: _muted } }, zeroCount + " zero value" + (zeroCount === 1 ? "" : "s") + " found; confirm whether zero means none or missing.")
            ),

            (function () {

              var aiLevel = d.aiLevel || 'grade5';

              var aiStory = d.aiStory || '';

              var aiLoading = !!d.aiLoading;

              var aiError = d.aiError || '';

              var LEVELS = [

                { id: 'plain', label: t('stem.datastudio.plain_language', 'Plain Language'), promptHint: 'simple everyday words, short sentences' },

                { id: 'grade5', label: t('stem.datastudio.grade_5', 'Grade 5'), promptHint: 'a 5th grade student' },

                { id: 'grade8', label: t('stem.datastudio.grade_8', 'Grade 8'), promptHint: 'an 8th grade student' }

              ];

              function tellStory() {

                if (typeof callGemini !== 'function') {

                  updDS('aiError', 'AI tutor not available.');

                  return;

                }

                updDS('aiLoading', true); updDS('aiError', ''); updDS('aiStory', '');

                var levelObj = LEVELS.find(function (L) { return L.id === aiLevel; }) || LEVELS[1];

                var dataSummary = displayRows.map(function (r, i) { return r.label + (chartType === 'scatter' ? ' (x=' + getScatterX(r, i) + ', y=' + r.value + ')' : ': ' + r.value); }).join('; ');

                var chartLabel = (CHART_TYPES.find(function (ct) { return ct.id === chartType; }) || { label: chartType }).label;

                var prompt = 'You are a friendly data tutor explaining a chart to ' + levelObj.promptHint + '. '

                  + (aiLevel === 'plain' ? 'Use simple everyday words and short sentences. ' : '')

                  + 'Chart type: ' + chartLabel + '. Title: "' + chartTitle + '". '

                  + 'Visible data points (' + displayRows.length + ' of ' + dataRows.length + '): ' + dataSummary + '. '

                  + 'Stats: sum=' + total.toFixed(1) + ', mean=' + mean.toFixed(1) + ', median=' + median.toFixed(1) + ', std dev=' + stdDev.toFixed(1) + (chartType === 'scatter' && pearsonR !== null ? ', Pearson r=' + pearsonR.toFixed(3) : '') + '. '

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

              return React.createElement("div", { className: "mt-2 rounded-xl p-3", role: "region", "aria-label": t('stem.datastudio.ai_data_story', "AI data story"), style: { background: _card, border: '1px solid ' + _border } },

                React.createElement("div", { className: "flex items-center flex-wrap gap-2 mb-2" },

                  React.createElement("span", { className: "text-sm font-bold", style: { color: _accent } }, t('stem.datastudio.what_story_does_this_data_tell', "\u2728 What story does this data tell?")),

                  React.createElement("div", { className: "ml-auto flex gap-1", role: "group", "aria-label": t('stem.datastudio.reading_level', "Reading level") },

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

                    disabled: aiLoading || displayRows.length === 0,

                    "aria-label": "Generate data story at " + (LEVELS.find(function (L) { return L.id === aiLevel; }) || { label: t('stem.datastudio.grade_5_2', 'Grade 5') }).label + " level",

                    className: "px-3 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50",

                    style: { background: _accent, color: '#fff' }

                  }, aiLoading ? '\u23F3 Thinking...' : (aiStory ? '\uD83D\uDD04 Re-tell' : '\uD83E\uDDE0 Tell the story'))

                ),

                aiError && React.createElement("p", { className: "text-[11px] mt-1", role: "alert", style: { color: '#ef4444' } }, aiError),

                aiStory && React.createElement("p", { className: "text-xs leading-relaxed mt-1", style: { color: _text } }, aiStory),

                !aiStory && !aiLoading && !aiError && React.createElement("p", { className: "text-[11px] italic", style: { color: _muted } }, t('stem.datastudio.click_tell_the_story_to_have_the_ai_tu', "Click \u201CTell the story\u201D to have the AI tutor explain what your chart shows at your chosen reading level."))

              );

            })(),

            // === H7b'' inquiry widget: chart visuals ===
            (function() {
              var iq = d._chartHunt || { opacity: 80, zoomX: 100, zoomY: 100, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { updDS('_chartHunt', Object.assign({}, iq, patch)); }
              var state;
              if (iq.opacity < 30) state = 'invisible';
              else if (iq.zoomX > 150 || iq.zoomY > 150) state = 'overzoomed';
              else if (iq.zoomX < 60 && iq.zoomY < 60) state = 'tooBroad';
              else state = 'legible';
              var sm = {
                invisible:  { label: t('stem.datastudio.nearly_invisible_low_opacity', '\uD83D\uDC7B Nearly invisible (low opacity)'), color: '#94a3b8', bg: '#f1f5f9', border: '#cbd5e1' },
                overzoomed: { label: t('stem.datastudio.over_zoomed_lose_context', '\uD83D\uDD0D Over-zoomed (lose context)'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
                tooBroad:   { label: t('stem.datastudio.too_broad_lose_detail', '\uD83D\uDD2D Too broad (lose detail)'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9' },
                legible:    { label: t('stem.datastudio.legible_visualization', '\uD83D\uDFE2 Legible visualization'), color: '#059669', bg: '#ecfdf5', border: '#86efac' }
              }[state];
              return React.createElement('div', { className: 'mt-3 p-3 rounded-xl bg-white border border-cyan-300 space-y-2' },
                React.createElement('h3', { className: 'text-sm font-black text-cyan-700' }, t('stem.datastudio.chart_visuals_discovery', '\uD83D\uDCCA Chart visuals discovery')),
                React.createElement('p', { className: 'text-[11px] text-slate-700' }, t('stem.datastudio.sliders_for_opacity_zoom_x_zoom_y_disc', 'Sliders for opacity, zoom X, zoom Y. Discrete 4-state visual legibility. No score, no reveal.')),
                React.createElement('div', { className: 'p-2 rounded text-center', style: { background: sm.bg, border: '1px solid ' + sm.border } },
                  React.createElement('div', { className: 'text-sm font-black', style: { color: sm.color } }, sm.label)
                ),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                  [{ k: 'opacity', l: 'Opacity %' }, { k: 'zoomX', l: 'Zoom X %' }, { k: 'zoomY', l: 'Zoom Y %' }].map(function(s) {
                    return React.createElement('div', { key: s.k },
                      React.createElement('label', { htmlFor: 'cv-' + s.k, className: 'block text-[10px] font-bold text-slate-700' }, s.l + ': ', React.createElement('span', { className: 'font-mono text-cyan-700' }, iq[s.k])),
                      React.createElement('input', { id: 'cv-' + s.k, type: 'range', min: 0, max: 200, step: 5, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                  React.createElement('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ o: iq.opacity, x: iq.zoomX, y: iq.zoomY, st: state }]).slice(-8) }); }, className: 'px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-300' }, t('stem.datastudio.log', '\uD83D\uDCCB Log')),
                  React.createElement('button', { onClick: function() { setIQ({ opacity: 80, zoomX: 100, zoomY: 100, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-600 border border-slate-300' }, t('stem.datastudio.reset', '\u21BA Reset'))
                ),
                React.createElement('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: t('stem.datastudio.hypothesis_when_is_a_chart_most_legibl', 'Hypothesis: When is a chart most legible?'),
                  className: 'w-full text-[11px] border border-slate-300 rounded p-1 font-mono leading-snug', rows: 2 }),
                !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-0.5 rounded bg-amber-50 text-[10px] font-bold text-amber-800 border border-amber-300' }, t('stem.datastudio.stuck_show_open_prompts', '\uD83E\uDD14 Stuck \u2014 show open prompts')),
                iq.stuckRevealed && React.createElement('div', { className: 'p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-slate-700' },
                  React.createElement('ul', { className: 'list-disc pl-4 space-y-0.5' },
                    React.createElement('li', null, t('stem.datastudio.tufte_rules_maximize_data_ink_ratio_wh', 'Tufte rules: maximize data-ink ratio. What does that mean?')),
                    React.createElement('li', null, t('stem.datastudio.when_does_zoom_obscure_context', 'When does zoom obscure context?')))),
                React.createElement('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-emerald-800 cursor-pointer' },
                  React.createElement('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-3 h-3' }),
                  t('stem.datastudio.i_understand_explain_in_own_words', 'I understand \u2014 explain in own words')),
                iq.understood && React.createElement('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: t('stem.datastudio.explain_chart_visualization_principles', 'Explain chart visualization principles.'),
                  className: 'w-full text-[11px] border border-emerald-300 rounded p-1 font-mono leading-snug mt-1', rows: 3 }),
                React.createElement('div', { className: 'text-[9px] italic text-slate-500' }, t('stem.datastudio.design_note_discrete_4_state_visual_ma', 'Design note: discrete 4-state visual marker; no aesthetic score; no reveal \u2014 by design.'))
              );
            })()

            )

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_creative.js loaded \u2014 3 tools');

})();
