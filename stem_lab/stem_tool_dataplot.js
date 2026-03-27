// ═══════════════════════════════════════════════════════════════
// stem_tool_dataplot.js — STEM Lab Data Plotter (Enhanced)
// Interactive data visualization with scatter, bar, line, pie,
// histogram, box plot, multiple regression types, statistical
// analysis, AI data analyst, achievements, and more.
// Registered tool ID: "dataPlot"
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAC() { if (!_audioCtx) try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} return _audioCtx; }
  function playTone(f, dur, type, vol) {
    var ac = getAC(); if (!ac) return;
    try { var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.12)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (dur || 0.12)); } catch(e) {}
  }
  function sfxPlot() { playTone(700, 0.05, 'sine', 0.06); }
  function sfxCorrect() { playTone(523, 0.08, 'sine', 0.08); setTimeout(function() { playTone(659, 0.08, 'sine', 0.08); }, 70); setTimeout(function() { playTone(784, 0.12, 'sine', 0.1); }, 140); }
  function sfxWrong() { playTone(330, 0.12, 'sawtooth', 0.05); setTimeout(function() { playTone(262, 0.15, 'sawtooth', 0.04); }, 80); }
  function sfxBadge() { playTone(523, 0.1, 'sine', 0.1); setTimeout(function() { playTone(784, 0.1, 'sine', 0.1); }, 100); setTimeout(function() { playTone(1047, 0.18, 'sine', 0.12); }, 250); }

  // ══════════════════════════════════════════════════════════════
  // ── Gallery Storage ──
  // ══════════════════════════════════════════════════════════════
  var GALLERY_KEY = 'alloflow_dataplot_charts';
  function loadGallery() { try { return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]'); } catch(e) { return []; } }
  function saveGallery(arr) { try { localStorage.setItem(GALLERY_KEY, JSON.stringify(arr)); } catch(e) {} }

  // ══════════════════════════════════════════════════════════════
  // ── Built-in Dataset Library ──
  // ══════════════════════════════════════════════════════════════
  var datasetLibrary = [
    { label: '\uD83D\uDCCA Height vs Weight', pts: [{x:150,y:50},{x:155,y:52},{x:160,y:58},{x:165,y:62},{x:170,y:68},{x:175,y:72},{x:180,y:78},{x:185,y:82},{x:190,y:88}], xLabel: 'Height (cm)', yLabel: 'Weight (kg)' },
    { label: '\uD83D\uDCDA Study vs Grade', pts: [{x:0,y:55},{x:1,y:62},{x:2,y:68},{x:3,y:72},{x:4,y:78},{x:5,y:85},{x:6,y:88},{x:7,y:92},{x:8,y:95}], xLabel: 'Hours Studied', yLabel: 'Grade (%)' },
    { label: '\uD83C\uDF21\uFE0F Temp vs Ice Cream', pts: [{x:15,y:20},{x:18,y:35},{x:22,y:45},{x:25,y:60},{x:28,y:70},{x:30,y:85},{x:33,y:90},{x:35,y:95}], xLabel: 'Temperature (\u00B0C)', yLabel: 'Sales ($)' },
    { label: '\uD83D\uDE97 Age vs Car Value', pts: [{x:0,y:30000},{x:1,y:25000},{x:2,y:21000},{x:3,y:18000},{x:5,y:13000},{x:7,y:9000},{x:10,y:5500},{x:15,y:3000}], xLabel: 'Age (years)', yLabel: 'Value ($)' },
    { label: '\uD83C\uDFC0 Practice vs Free Throws', pts: [{x:0,y:42},{x:2,y:48},{x:4,y:55},{x:6,y:63},{x:8,y:68},{x:10,y:74},{x:12,y:78},{x:14,y:82},{x:16,y:85}], xLabel: 'Practice (hrs/week)', yLabel: 'Free Throw %' },
    { label: '\uD83C\uDF31 Sunlight vs Growth', pts: [{x:1,y:2},{x:2,y:5},{x:3,y:9},{x:4,y:14},{x:5,y:18},{x:6,y:20},{x:7,y:21},{x:8,y:21.5}], xLabel: 'Sunlight (hrs)', yLabel: 'Growth (cm)' },
    { label: '\uD83C\uDFE0 Size vs Price', pts: [{x:800,y:150000},{x:1000,y:200000},{x:1200,y:250000},{x:1500,y:320000},{x:1800,y:380000},{x:2200,y:450000},{x:2800,y:560000},{x:3500,y:700000}], xLabel: 'Size (sq ft)', yLabel: 'Price ($)' },
    { label: '\uD83C\uDFB2 Random (No Corr)', pts: Array.from({length:12}, function() { return {x: Math.round(Math.random()*100)/10, y: Math.round(Math.random()*100)/10}; }), xLabel: 'X', yLabel: 'Y' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Badge Definitions ──
  // ══════════════════════════════════════════════════════════════
  var badgeDefs = [
    { id: 'first_point', icon: '\uD83D\uDCCD', name: 'First Plot', desc: 'Plot your first data point' },
    { id: 'ten_points', icon: '\uD83D\uDCCA', name: 'Data Collector', desc: 'Have 10+ points on chart' },
    { id: 'fifty_points', icon: '\uD83D\uDCC8', name: 'Big Data', desc: 'Have 50+ points on chart' },
    { id: 'strong_r2', icon: '\u2B50', name: 'Perfect Fit', desc: 'Achieve R\u00B2 > 0.95' },
    { id: 'quiz_5', icon: '\uD83E\uDDE0', name: 'Quiz Whiz', desc: 'Answer 5 quiz questions correctly' },
    { id: 'streak_5', icon: '\uD83D\uDD25', name: 'On Fire', desc: '5 correct quiz answers in a row' },
    { id: 'all_charts', icon: '\uD83C\uDFA8', name: 'Chart Master', desc: 'View all 6 chart types' },
    { id: 'saved_3', icon: '\uD83D\uDCBE', name: 'Archivist', desc: 'Save 3 charts to gallery' },
    { id: 'csv_export', icon: '\uD83D\uDCE5', name: 'Data Exporter', desc: 'Export data as CSV' },
    { id: 'ai_analyst', icon: '\uD83E\uDD16', name: 'AI Analyst', desc: 'Use the AI data analyst' },
    { id: 'outlier_found', icon: '\uD83D\uDD0D', name: 'Outlier Hunter', desc: 'Find an outlier in your data' },
    { id: 'predictor', icon: '\uD83D\uDD2E', name: 'Fortune Teller', desc: 'Use the prediction tool' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Quiz Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var quizScenarios = [
    { q: 'Hours studied vs. Test score', a: 'Positive', gen: function() { return Array.from({length:12}, function(_,i) { return {x:i+1, y:50+i*3.5+(Math.random()*10-5)}; }); } },
    { q: 'Temperature vs. Hot chocolate sales', a: 'Negative', gen: function() { return Array.from({length:12}, function(_,i) { return {x:30+i*5, y:100-i*7+(Math.random()*10-5)}; }); } },
    { q: 'Shoe size vs. IQ', a: 'None', gen: function() { return Array.from({length:12}, function() { return {x:5+Math.random()*10, y:80+Math.random()*40}; }); } },
    { q: 'Age of car vs. Resale value', a: 'Negative', gen: function() { return Array.from({length:12}, function(_,i) { return {x:i, y:30000-i*2500+(Math.random()*3000-1500)}; }); } },
    { q: 'Practice hours vs. Free throw %', a: 'Positive', gen: function() { return Array.from({length:12}, function(_,i) { return {x:i*2, y:40+i*4+(Math.random()*8-4)}; }); } },
    { q: 'Number of pets vs. Favorite color', a: 'None', gen: function() { return Array.from({length:12}, function() { return {x:Math.floor(Math.random()*6), y:Math.floor(Math.random()*8)}; }); } },
    { q: 'Exercise hours vs. Resting heart rate', a: 'Negative', gen: function() { return Array.from({length:12}, function(_,i) { return {x:i, y:85-i*3+(Math.random()*6-3)}; }); } },
    { q: 'Altitude vs. Temperature', a: 'Negative', gen: function() { return Array.from({length:10}, function(_,i) { return {x:i*500, y:30-i*3+(Math.random()*4-2)}; }); } },
    { q: 'Hours of sleep vs. Test score', a: 'Positive', gen: function() { return Array.from({length:10}, function(_,i) { return {x:4+i*0.8, y:50+i*4.5+(Math.random()*8-4)}; }); } },
    { q: 'Distance from city vs. Land price', a: 'Negative', gen: function() { return Array.from({length:10}, function(_,i) { return {x:i*5, y:500-i*40+(Math.random()*60-30)}; }); } }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Point Color Palettes ──
  // ══════════════════════════════════════════════════════════════
  var palettes = [
    { id: 'teal', name: 'Teal', fill: '#0d9488', stroke: '#fff', line: '#ef4444' },
    { id: 'blue', name: 'Ocean', fill: '#3b82f6', stroke: '#fff', line: '#f59e0b' },
    { id: 'purple', name: 'Grape', fill: '#8b5cf6', stroke: '#fff', line: '#22c55e' },
    { id: 'rose', name: 'Rose', fill: '#f43f5e', stroke: '#fff', line: '#06b6d4' },
    { id: 'amber', name: 'Sunset', fill: '#f59e0b', stroke: '#fff', line: '#6366f1' },
    { id: 'emerald', name: 'Forest', fill: '#10b981', stroke: '#fff', line: '#ef4444' }
  ];

  window.StemLab.registerTool('dataPlot', {
    icon: '\uD83D\uDCCA', label: 'Data Plotter',
    desc: 'Plot data, calculate regression & R\u00B2',
    color: 'slate', category: 'creative',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var setStemLabTool = ctx.setStemLabTool;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini || window.callGemini;

      var ArrowLeft = ctx.icons.ArrowLeft;

      // ── State ──
      var d = (ctx.toolData && ctx.toolData.dataPlot) || {};
      var points = d.points || [];
      var upd = function(key, val) {
        if (ctx.update) ctx.update('dataPlot', key, val);
        else ctx.setToolData(function(prev) { var dp = Object.assign({}, (prev && prev.dataPlot) || {}); dp[key] = val; return Object.assign({}, prev, { dataPlot: dp }); });
      };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('dataPlot', obj);
        else ctx.setToolData(function(prev) { return Object.assign({}, prev, { dataPlot: Object.assign({}, (prev && prev.dataPlot) || {}, obj) }); });
      };

      var soundEnabled = d.soundEnabled != null ? d.soundEnabled : true;
      var chartType = d.chartType || 'scatter'; // scatter, bar, line, pie, histogram, boxplot
      var showResiduals = d.showResiduals || false;
      var showLabels = d.showLabels || false;
      var showGrid = d.showGrid != null ? d.showGrid : true;
      var tableMode = d.tableMode || false;
      var paletteId = d.paletteId || 'teal';
      var xLabel = d.xLabel || '';
      var yLabel = d.yLabel || '';
      var activeTab = d.activeTab || 'chart'; // chart, stats, quiz, tools

      // Regression type
      var regressionType = d.regressionType || 'linear'; // linear, quadratic, exponential, logarithmic

      // Prediction tool
      var predX = d.predX || '';

      // AI Analyst
      var aiInsight = d.aiInsight || '';
      var aiLoading = d.aiLoading || false;

      // Undo stack
      var undoStack = d.undoStack || [];

      // Badges
      var earnedBadges = d.earnedBadges || {};
      var showBadges = d.showBadges || false;

      // Quiz
      var dpQuiz = d.dpQuiz || null;
      var dpScore = d.dpScore || 0;
      var dpStreak = d.dpStreak || 0;

      // Charts viewed (for badge)
      var chartsViewed = d.chartsViewed || {};

      // Gallery
      var galleryItems = loadGallery();
      var showGallery = d.showGallery || false;

      // Outlier highlight
      var showOutliers = d.showOutliers || false;

      // Palette
      var pal = palettes.find(function(p) { return p.id === paletteId; }) || palettes[0];

      // ══════════════════════════════════════════════════════════════
      // ── SVG Dimensions ──
      // ══════════════════════════════════════════════════════════════
      var W = 440, H = 320, pad = 45;
      var allX = points.map(function(p) { return p.x; });
      var allY = points.map(function(p) { return p.y; });
      var xMin = allX.length ? Math.min.apply(null, allX) - 1 : 0;
      var xMax = allX.length ? Math.max.apply(null, allX) + 1 : 10;
      var yMin = allY.length ? Math.min.apply(null, allY) - 1 : 0;
      var yMax = allY.length ? Math.max.apply(null, allY) + 1 : 10;
      var toSX = function(x) { return pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad); };
      var toSY = function(y) { return (H - pad) - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad); };

      // ══════════════════════════════════════════════════════════════
      // ── Statistical Calculations ──
      // ══════════════════════════════════════════════════════════════
      var n = points.length;
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
      points.forEach(function(p) { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x; sumY2 += p.y * p.y; });
      var meanX = n > 0 ? sumX / n : 0;
      var meanY = n > 0 ? sumY / n : 0;

      // Linear regression
      var slope = 0, intercept = 0, r2 = 0;
      if (n >= 2) {
        slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
        intercept = (sumY - slope * sumX) / n;
        var ssTot = allY.reduce(function(s, y) { return s + (y - meanY) * (y - meanY); }, 0);
        var ssRes = points.reduce(function(s, p) { return s + Math.pow(p.y - (slope * p.x + intercept), 2); }, 0);
        r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      }

      // Quadratic regression (y = ax² + bx + c) using normal equations
      var quadA = 0, quadB = 0, quadC = 0, quadR2 = 0;
      if (n >= 3) {
        var sx1 = sumX, sx2 = sumX2, sx3 = 0, sx4 = 0, sxy = sumXY, sx2y = 0;
        points.forEach(function(p) { sx3 += p.x * p.x * p.x; sx4 += p.x * p.x * p.x * p.x; sx2y += p.x * p.x * p.y; });
        // Solve 3x3 system using Cramer's rule
        var det = n*(sx2*sx4-sx3*sx3) - sx1*(sx1*sx4-sx3*sx2) + sx2*(sx1*sx3-sx2*sx2);
        if (Math.abs(det) > 1e-10) {
          quadC = (sumY*(sx2*sx4-sx3*sx3) - sx1*(sxy*sx4-sx2y*sx3) + sx2*(sxy*sx3-sx2y*sx2)) / det;
          quadB = (n*(sxy*sx4-sx2y*sx3) - sumY*(sx1*sx4-sx3*sx2) + sx2*(sx1*sx2y-sxy*sx2)) / det;
          quadA = (n*(sx2*sx2y-sx3*sxy) - sx1*(sx1*sx2y-sxy*sx2) + sumY*(sx1*sx3-sx2*sx2)) / det;
          var ssResQ = points.reduce(function(s, p) { return s + Math.pow(p.y - (quadA*p.x*p.x + quadB*p.x + quadC), 2); }, 0);
          var ssTotQ = allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0);
          quadR2 = ssTotQ > 0 ? 1 - ssResQ / ssTotQ : 0;
        }
      }

      // Exponential regression (y = ae^(bx)) via log transform
      var expA = 0, expB = 0, expR2 = 0;
      if (n >= 2) {
        var posPoints = points.filter(function(p) { return p.y > 0; });
        if (posPoints.length >= 2) {
          var lnY = posPoints.map(function(p) { return Math.log(p.y); });
          var slnY = lnY.reduce(function(s, v) { return s + v; }, 0);
          var spXlnY = posPoints.reduce(function(s, p, i) { return s + p.x * lnY[i]; }, 0);
          var spX = posPoints.reduce(function(s, p) { return s + p.x; }, 0);
          var spX2 = posPoints.reduce(function(s, p) { return s + p.x * p.x; }, 0);
          var enp = posPoints.length;
          expB = (enp * spXlnY - spX * slnY) / (enp * spX2 - spX * spX || 1);
          expA = Math.exp((slnY - expB * spX) / enp);
          var ssTotE = allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0);
          var ssResE = points.reduce(function(s, p) { return s + Math.pow(p.y - expA * Math.exp(expB * p.x), 2); }, 0);
          expR2 = ssTotE > 0 ? 1 - ssResE / ssTotE : 0;
        }
      }

      // Logarithmic regression (y = a + b*ln(x))
      var logA = 0, logB = 0, logR2 = 0;
      if (n >= 2) {
        var posX = points.filter(function(p) { return p.x > 0; });
        if (posX.length >= 2) {
          var lnX = posX.map(function(p) { return Math.log(p.x); });
          var slnX = lnX.reduce(function(s, v) { return s + v; }, 0);
          var slnX2 = lnX.reduce(function(s, v) { return s + v * v; }, 0);
          var slnXY = posX.reduce(function(s, p, i) { return s + lnX[i] * p.y; }, 0);
          var spY = posX.reduce(function(s, p) { return s + p.y; }, 0);
          var lnp = posX.length;
          logB = (lnp * slnXY - slnX * spY) / (lnp * slnX2 - slnX * slnX || 1);
          logA = (spY - logB * slnX) / lnp;
          var ssTotL = allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0);
          var ssResL = posX.reduce(function(s, p) { return s + Math.pow(p.y - (logA + logB * Math.log(p.x)), 2); }, 0);
          logR2 = ssTotL > 0 ? 1 - ssResL / ssTotL : 0;
        }
      }

      // Current regression equation & R²
      var regEq = '', regR2 = r2;
      if (regressionType === 'quadratic' && n >= 3) { regEq = 'y = ' + quadA.toFixed(4) + 'x\u00B2 + ' + quadB.toFixed(2) + 'x + ' + quadC.toFixed(2); regR2 = quadR2; }
      else if (regressionType === 'exponential' && expA) { regEq = 'y = ' + expA.toFixed(2) + 'e^(' + expB.toFixed(4) + 'x)'; regR2 = expR2; }
      else if (regressionType === 'logarithmic' && logB) { regEq = 'y = ' + logA.toFixed(2) + ' + ' + logB.toFixed(2) + 'ln(x)'; regR2 = logR2; }
      else { regEq = 'y = ' + slope.toFixed(2) + 'x + ' + intercept.toFixed(2); regR2 = r2; }

      // Prediction
      var predResult = '';
      if (predX !== '' && !isNaN(parseFloat(predX))) {
        var px = parseFloat(predX);
        if (regressionType === 'quadratic') predResult = (quadA*px*px + quadB*px + quadC).toFixed(2);
        else if (regressionType === 'exponential' && expA) predResult = (expA * Math.exp(expB * px)).toFixed(2);
        else if (regressionType === 'logarithmic' && px > 0) predResult = (logA + logB * Math.log(px)).toFixed(2);
        else predResult = (slope * px + intercept).toFixed(2);
      }

      // Extended stats
      var sortedY = allY.slice().sort(function(a, b) { return a - b; });

      var median = function(arr) { if (!arr.length) return 0; var m = Math.floor(arr.length / 2); return arr.length % 2 ? arr[m] : (arr[m-1] + arr[m]) / 2; };
      var yMedian = median(sortedY);
      var yMin_ = sortedY[0] || 0, yMax_ = sortedY[sortedY.length-1] || 0;
      var yRange = yMax_ - yMin_;
      var q1 = median(sortedY.slice(0, Math.floor(sortedY.length / 2)));
      var q3 = median(sortedY.slice(Math.ceil(sortedY.length / 2)));
      var iqr = q3 - q1;
      var stdDev = n > 0 ? Math.sqrt(allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0) / n) : 0;

      // Mode
      var freqMap = {};
      allY.forEach(function(y) { var key = Math.round(y*10)/10; freqMap[key] = (freqMap[key]||0)+1; });
      var maxFreq = 0, modeVal = 'N/A';
      Object.keys(freqMap).forEach(function(k) { if (freqMap[k] > maxFreq) { maxFreq = freqMap[k]; modeVal = k; } });
      if (maxFreq <= 1) modeVal = 'None';

      // Outlier detection (IQR method)
      var lowerFence = q1 - 1.5 * iqr;
      var upperFence = q3 + 1.5 * iqr;
      var outliers = points.filter(function(p) { return p.y < lowerFence || p.y > upperFence; });
      var outlierSet = {};
      outliers.forEach(function(p) { outlierSet[p.x + ',' + p.y] = true; });

      // Histogram bins
      var histBins = [];
      if (n > 0) {
        var binCount = Math.max(3, Math.min(12, Math.ceil(Math.sqrt(n))));
        var binWidth = yRange / binCount || 1;
        for (var bi = 0; bi < binCount; bi++) {
          var bLow = yMin_ + bi * binWidth;
          var bHigh = bLow + binWidth;
          var bCount = points.filter(function(p) { return p.y >= bLow && (bi === binCount-1 ? p.y <= bHigh : p.y < bHigh); }).length;
          histBins.push({ low: bLow, high: bHigh, count: bCount });
        }
      }
      var maxBinCount = Math.max.apply(null, histBins.map(function(b) { return b.count; }).concat([1]));

      // ══════════════════════════════════════════════════════════════
      // ── Undo System ──
      // ══════════════════════════════════════════════════════════════
      var pushUndo = function() {
        var stack = (undoStack || []).slice();
        stack.push(JSON.parse(JSON.stringify(points)));
        if (stack.length > 30) stack = stack.slice(-30);
        return stack;
      };

      var doUndo = function() {
        if (!undoStack || !undoStack.length) return;
        var stack = undoStack.slice();
        var prev = stack.pop();
        updMulti({ points: prev, undoStack: stack });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Badge Checker ──
      // ══════════════════════════════════════════════════════════════
      var checkBadges = function(updates) {
        var newB = Object.assign({}, earnedBadges);
        var awarded = [];
        var chk = function(id, cond) { if (!newB[id] && cond) { newB[id] = Date.now(); awarded.push(id); } };
        var s = updates || {};
        chk('first_point', n >= 1);
        chk('ten_points', n >= 10);
        chk('fifty_points', n >= 50);
        chk('strong_r2', n >= 2 && Math.abs(regR2) > 0.95);
        chk('quiz_5', (s.dpScore || dpScore) >= 5);
        chk('streak_5', (s.dpStreak || dpStreak) >= 5);
        chk('all_charts', Object.keys(s.chartsViewed || chartsViewed).length >= 6);
        chk('saved_3', galleryItems.length >= 3);
        chk('csv_export', !!s.csvExported);
        chk('ai_analyst', !!s.aiUsed);
        chk('outlier_found', outliers.length > 0 && showOutliers);
        chk('predictor', !!s.predicted);
        if (awarded.length > 0) {
          upd('earnedBadges', newB);
          awarded.forEach(function(bid) {
            var badge = badgeDefs.find(function(b) { return b.id === bid; });
            if (badge && addToast) addToast('\uD83C\uDFC5 Badge: ' + badge.icon + ' ' + badge.name + '!', 'success');
            if (awardXP) awardXP('dataPlot_badge_' + bid, 5, 'Badge: ' + (badge ? badge.name : bid));
          });
          if (soundEnabled) sfxBadge();
          if (celebrate) celebrate();
        }
      };

      // Trigger badge check on render
      if (n > 0) setTimeout(function() { checkBadges({}); }, 0);

      // ══════════════════════════════════════════════════════════════
      // ── Actions ──
      // ══════════════════════════════════════════════════════════════
      var addPoint = function(x, y) {
        var newUndo = pushUndo();
        updMulti({ points: points.concat([{x:x, y:y}]), undoStack: newUndo });
        if (soundEnabled) sfxPlot();
      };

      var removePoint = function(idx) {
        var newUndo = pushUndo();
        updMulti({ points: points.filter(function(_, i) { return i !== idx; }), undoStack: newUndo });
        if (addToast) addToast('\uD83D\uDDD1\uFE0F Removed point', 'info');
      };

      var clearAll = function() {
        var newUndo = pushUndo();
        updMulti({ points: [], undoStack: newUndo });
      };

      var loadDataset = function(ds) {
        var newUndo = pushUndo();
        updMulti({ points: ds.pts, undoStack: newUndo, xLabel: ds.xLabel || '', yLabel: ds.yLabel || '' });
      };

      var saveChart = function() {
        if (n === 0) return;
        var item = { id: 'dp_' + Date.now(), points: JSON.parse(JSON.stringify(points)), xLabel: xLabel, yLabel: yLabel, chartType: chartType, n: n, r2: regR2, timestamp: Date.now() };
        var updated = galleryItems.concat([item]);
        saveGallery(updated);
        upd('_galleryRefresh', Date.now());
        if (addToast) addToast('\uD83D\uDCBE Chart saved!', 'success');
        checkBadges({});
      };

      var loadChart = function(item) {
        var newUndo = pushUndo();
        updMulti({ points: item.points, undoStack: newUndo, xLabel: item.xLabel || '', yLabel: item.yLabel || '', chartType: item.chartType || 'scatter' });
        if (addToast) addToast('\uD83D\uDCE5 Chart loaded', 'info');
      };

      var deleteChart = function(id) {
        var updated = galleryItems.filter(function(g) { return g.id !== id; });
        saveGallery(updated);
        upd('_galleryRefresh', Date.now());
      };

      var exportCSV = function() {
        if (n === 0) return;
        var csv = (xLabel || 'x') + ',' + (yLabel || 'y') + '\n' + points.map(function(p) { return p.x + ',' + p.y; }).join('\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'data_plot_' + Date.now() + '.csv'; a.click();
        if (addToast) addToast('\uD83D\uDCE5 CSV exported!', 'success');
        checkBadges({ csvExported: true });
      };

      var exportSVG = function() {
        var el = document.querySelector('[data-dataplot-svg]');
        if (!el) return;
        var blob = new Blob([new XMLSerializer().serializeToString(el)], { type: 'image/svg+xml' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'chart_' + Date.now() + '.svg'; a.click();
        if (addToast) addToast('\uD83D\uDCD0 SVG exported!', 'success');
      };

      var askAI = function() {
        if (!callGemini || aiLoading) return;
        upd('aiLoading', true);
        var desc = n === 0 ? 'No data points yet.'
          : n + ' data points. X: ' + (xLabel || 'X') + ' (' + Math.min.apply(null,allX).toFixed(1) + '-' + Math.max.apply(null,allX).toFixed(1) + '), Y: ' + (yLabel || 'Y') + ' (' + yMin_.toFixed(1) + '-' + yMax_.toFixed(1) + '). '
          + 'Linear: ' + regEq + ', R\u00B2=' + regR2.toFixed(3) + '. Mean Y=' + meanY.toFixed(2) + ', Median=' + yMedian.toFixed(2) + ', StdDev=' + stdDev.toFixed(2) + '. '
          + (outliers.length > 0 ? outliers.length + ' outliers detected. ' : '')
          + 'Correlation: ' + (slope > 0 ? 'positive' : slope < 0 ? 'negative' : 'none') + '.';
        var prompt = 'You are an AI data analyst in a kids\' educational data plotter. ' + desc +
          ' Give 3 SHORT insights about this data. Include a real-world connection. Use emoji. Ages 8-14. Return JSON: {"insights":["...","...","..."],"funFact":"..."}';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          try {
            var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g,'').replace(/```/g,'').trim()) : resp;
            var text = '';
            if (parsed.insights) parsed.insights.forEach(function(t,i) { text += (i > 0 ? '\n' : '') + t; });
            if (parsed.funFact) text += '\n\n\uD83D\uDCCA ' + parsed.funFact;
            updMulti({ aiInsight: text, aiLoading: false });
          } catch(e) { updMulti({ aiInsight: typeof resp === 'string' ? resp : 'Try adding more data!', aiLoading: false }); }
        }).catch(function() { updMulti({ aiInsight: '\u26A0\uFE0F Could not reach AI. Try again!', aiLoading: false }); });
        checkBadges({ aiUsed: true });
      };

      // SVG click handler
      var handleSvgClick = function(e) {
        if (chartType !== 'scatter' && chartType !== 'line') return;
        var svg = e.currentTarget;
        var rect = svg.getBoundingClientRect();
        var sx = (e.clientX - rect.left) / rect.width * W;
        var sy = (e.clientY - rect.top) / rect.height * H;
        var x = Math.round((xMin + (sx - pad) / (W - 2 * pad) * (xMax - xMin)) * 10) / 10;
        var y = Math.round((yMin + ((H - pad - sy) / (H - 2 * pad)) * (yMax - yMin)) * 10) / 10;
        addPoint(x, y);
      };

      // Quiz
      var makeQuiz = function() {
        var s = quizScenarios[Math.floor(Math.random() * quizScenarios.length)];
        var pts = s.gen();
        var quiz = { text: s.q, answer: s.a, pts: pts, opts: ['Positive', 'Negative', 'None'].sort(function() { return Math.random() - 0.5; }), answered: false };
        updMulti({ dpQuiz: quiz, points: pts });
      };

      var answerQuiz = function(opt) {
        if (!dpQuiz || dpQuiz.answered) return;
        var correct = opt === dpQuiz.answer;
        var newScore = dpScore + (correct ? 1 : 0);
        var newStreak = correct ? dpStreak + 1 : 0;
        updMulti({ dpQuiz: Object.assign({}, dpQuiz, { answered: true, chosen: opt }), dpScore: newScore, dpStreak: newStreak });
        if (correct) {
          if (addToast) addToast('\u2705 Correct! ' + dpQuiz.answer + ' correlation', 'success');
          if (awardXP) awardXP('dataPlot', 10, 'Correlation Quiz');
          if (soundEnabled) sfxCorrect();
          checkBadges({ dpScore: newScore, dpStreak: newStreak });
        } else {
          if (addToast) addToast('\u274C It\u2019s ' + dpQuiz.answer + ' correlation', 'error');
          if (soundEnabled) sfxWrong();
        }
      };

      // Track chart type views
      var switchChart = function(type) {
        var viewed = Object.assign({}, chartsViewed);
        viewed[type] = true;
        updMulti({ chartType: type, chartsViewed: viewed });
        checkBadges({ chartsViewed: viewed });
      };

      // ══════════════════════════════════════════════════════════════
      // ── Tab button helper ──
      // ══════════════════════════════════════════════════════════════
      var tabBtn = function(id, label, icon) {
        var active = activeTab === id;
        return h('button', { onClick: function() { upd('activeTab', id); }, className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-teal-700 hover:bg-teal-50 border border-teal-200') }, icon + ' ' + label);
      };

      // Regression line path generator for SVG
      var regPath = function() {
        if (n < 2) return null;
        if (regressionType === 'linear') {
          return h('line', { x1: toSX(xMin), y1: toSY(slope*xMin+intercept), x2: toSX(xMax), y2: toSY(slope*xMax+intercept), stroke: pal.line, strokeWidth: 2, strokeDasharray: '6 3' });
        }
        // Curve path for quadratic/exp/log
        var pts = [];
        var steps = 50;
        for (var si = 0; si <= steps; si++) {
          var cx_ = xMin + (xMax - xMin) * si / steps;
          var cy_;
          if (regressionType === 'quadratic') cy_ = quadA*cx_*cx_ + quadB*cx_ + quadC;
          else if (regressionType === 'exponential' && expA) cy_ = expA * Math.exp(expB * cx_);
          else if (regressionType === 'logarithmic' && cx_ > 0) cy_ = logA + logB * Math.log(cx_);
          else cy_ = slope * cx_ + intercept;
          pts.push((si === 0 ? 'M' : 'L') + toSX(cx_).toFixed(1) + ',' + toSY(cy_).toFixed(1));
        }
        return h('path', { d: pts.join(' '), fill: 'none', stroke: pal.line, strokeWidth: 2, strokeDasharray: '6 3' });
      };

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      return h('div', { className: 'max-w-4xl mx-auto animate-in fade-in duration-200 space-y-3' },

        // ── Header ──
        h('div', { className: 'flex items-center gap-3' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDCCA Data Plotter'),
          h('span', { className: 'text-xs text-slate-400' }, n + ' pts'),
          n >= 2 && h('span', { className: 'text-xs font-bold ' + (Math.abs(regR2) > 0.8 ? 'text-emerald-600' : Math.abs(regR2) > 0.5 ? 'text-yellow-600' : 'text-red-500') }, 'R\u00B2=' + regR2.toFixed(3)),
          h('div', { className: 'ml-auto flex gap-1.5' },
            h('button', { onClick: function() { upd('showBadges', !showBadges); }, className: 'text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (showBadges ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500') }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + badgeDefs.length),
            h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, className: 'text-sm px-1' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
            h('button', { onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'dp-' + Date.now(), tool: 'dataPlot', label: n + ' pts r\u00B2=' + regR2.toFixed(2), data: { points: points.slice() }, timestamp: Date.now() }]); }); if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: 'text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5' }, '\uD83D\uDCF8')
          )
        ),

        // ── Badges drawer ──
        showBadges && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, '\uD83C\uDFC5 Badges'),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            badgeDefs.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              return h('div', { key: badge.id, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (earned ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-slate-200 opacity-40') },
                h('span', { className: 'text-base', style: earned ? {} : { filter: 'grayscale(1)' } }, badge.icon),
                h('div', null,
                  h('div', { className: 'text-[10px] font-bold ' + (earned ? 'text-amber-800' : 'text-slate-400') }, badge.name),
                  h('div', { className: 'text-[8px] ' + (earned ? 'text-amber-600' : 'text-slate-300') }, badge.desc)
                )
              );
            })
          )
        ),

        // ── Tab nav ──
        h('div', { className: 'flex gap-2 flex-wrap' },
          tabBtn('chart', 'Chart', '\uD83D\uDCCA'),
          tabBtn('stats', 'Statistics', '\uD83D\uDCC8'),
          tabBtn('quiz', 'Quiz', '\uD83C\uDFAF'),
          tabBtn('tools', 'Tools', '\uD83D\uDEE0\uFE0F')
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Chart ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'chart' && h('div', { className: 'space-y-2' },

          // Chart type selector
          h('div', { className: 'flex gap-1.5 flex-wrap' },
            [
              { id: 'scatter', icon: '\u2022', label: 'Scatter' },
              { id: 'line', icon: '\uD83D\uDCC8', label: 'Line' },
              { id: 'bar', icon: '\uD83D\uDCCA', label: 'Bar' },
              { id: 'pie', icon: '\uD83E\uDD67', label: 'Pie' },
              { id: 'histogram', icon: '\uD83D\uDCF6', label: 'Histogram' },
              { id: 'boxplot', icon: '\uD83D\uDCE6', label: 'Box Plot' }
            ].map(function(ct) {
              return h('button', { key: ct.id, onClick: function() { switchChart(ct.id); },
                className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all ' + (chartType === ct.id ? 'bg-teal-600 text-white shadow' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100')
              }, ct.icon + ' ' + ct.label);
            }),
            // Palette selector
            h('select', { value: paletteId, onChange: function(e) { upd('paletteId', e.target.value); }, className: 'ml-auto text-[10px] px-2 py-1 rounded-lg border border-slate-200 outline-none' },
              palettes.map(function(p) { return h('option', { key: p.id, value: p.id }, '\uD83C\uDFA8 ' + p.name); })
            )
          ),

          // Datasets
          h('div', { className: 'flex gap-1.5 flex-wrap' },
            h('span', { className: 'text-[10px] font-bold text-slate-400 self-center' }, 'Datasets:'),
            datasetLibrary.map(function(ds) {
              return h('button', { key: ds.label, onClick: function() { loadDataset(ds); }, className: 'px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all' }, ds.label);
            })
          ),

          // Axis labels
          h('div', { className: 'flex gap-2' },
            h('input', { type: 'text', value: xLabel, onChange: function(e) { upd('xLabel', e.target.value); }, placeholder: 'X-axis label', className: 'flex-1 px-2 py-1 text-xs border border-teal-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400' }),
            h('input', { type: 'text', value: yLabel, onChange: function(e) { upd('yLabel', e.target.value); }, placeholder: 'Y-axis label', className: 'flex-1 px-2 py-1 text-xs border border-teal-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400' })
          ),

          // ── SVG Chart ──
          (chartType === 'scatter' || chartType === 'line' || chartType === 'bar') && h('svg', {
            viewBox: '0 0 ' + W + ' ' + H, className: 'w-full bg-white rounded-xl border border-teal-200 cursor-crosshair', style: { maxHeight: '340px' },
            'data-dataplot-svg': true,
            onClick: handleSvgClick
          },
            // Grid lines
            showGrid && (function() {
              var elems = []; var nt = 5;
              for (var gi = 0; gi <= nt; gi++) {
                var gx = xMin + gi * (xMax - xMin) / nt;
                var gy = yMin + gi * (yMax - yMin) / nt;
                elems.push(h('line', { key: 'gv'+gi, x1: toSX(gx), y1: pad, x2: toSX(gx), y2: H-pad, stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '3 3' }));
                elems.push(h('line', { key: 'gh'+gi, x1: pad, y1: toSY(gy), x2: W-pad, y2: toSY(gy), stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '3 3' }));
                elems.push(h('text', { key: 'xt'+gi, x: toSX(gx), y: H-pad+14, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '9px' } }, (Math.round(gx*10)/10).toString()));
                elems.push(h('text', { key: 'yt'+gi, x: pad-5, y: toSY(gy)+3, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '9px' } }, (Math.round(gy*10)/10).toString()));
              }
              return elems;
            })(),
            // Axes
            h('line', { x1: pad, y1: H-pad, x2: W-pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            h('line', { x1: pad, y1: pad, x2: pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            // Axis labels
            xLabel && h('text', { x: W/2, y: H-3, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '11px', fontWeight: 'bold' } }, xLabel),
            yLabel && h('text', { x: 12, y: H/2, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '11px', fontWeight: 'bold' }, transform: 'rotate(-90,12,' + (H/2) + ')' }, yLabel),
            // Residuals
            showResiduals && n >= 2 && points.map(function(p, i) {
              var predY = regressionType === 'quadratic' ? quadA*p.x*p.x+quadB*p.x+quadC : regressionType === 'exponential' && expA ? expA*Math.exp(expB*p.x) : regressionType === 'logarithmic' && p.x > 0 ? logA+logB*Math.log(p.x) : slope*p.x+intercept;
              return h('line', { key: 'r'+i, x1: toSX(p.x), y1: toSY(p.y), x2: toSX(p.x), y2: toSY(predY), stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '2 2' });
            }),
            // Bar chart
            chartType === 'bar' && points.map(function(p, i) {
              var barW = Math.max(4, (W - 2*pad) / Math.max(n, 1) * 0.7);
              var barX = toSX(p.x) - barW/2;
              var barH = Math.max(1, (H-pad) - toSY(p.y));
              return h('rect', { key: 'bar'+i, x: barX, y: toSY(p.y), width: barW, height: barH, fill: pal.fill, fillOpacity: 0.8, rx: 2, stroke: pal.stroke, strokeWidth: 0.5 });
            }),
            // Line chart connector
            chartType === 'line' && n >= 2 && (function() {
              var sorted = points.slice().sort(function(a,b) { return a.x - b.x; });
              var d_ = sorted.map(function(p, i) { return (i===0?'M':'L') + toSX(p.x).toFixed(1) + ',' + toSY(p.y).toFixed(1); }).join(' ');
              return h('path', { d: d_, fill: 'none', stroke: pal.fill, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' });
            })(),
            // Data points (scatter + line)
            (chartType === 'scatter' || chartType === 'line') && points.map(function(p, i) {
              var isOutlier = showOutliers && outlierSet[p.x+','+p.y];
              return h('g', { key: 'pt'+i, style: { cursor: 'pointer' }, onClick: function(e) { e.stopPropagation(); removePoint(i); } },
                h('circle', { cx: toSX(p.x), cy: toSY(p.y), r: 12, fill: 'transparent' }),
                h('circle', { cx: toSX(p.x), cy: toSY(p.y), r: isOutlier ? 7 : 5, fill: isOutlier ? '#ef4444' : pal.fill, stroke: isOutlier ? '#fca5a5' : pal.stroke, strokeWidth: isOutlier ? 2 : 1.5 }),
                showLabels && h('text', { x: toSX(p.x), y: toSY(p.y)-8, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '8px', fontWeight: 'bold' } }, '(' + p.x + ',' + p.y + ')'),
                h('title', null, '(' + p.x + ', ' + p.y + ')' + (isOutlier ? ' \u26A0\uFE0F OUTLIER' : '') + ' \u2014 click to remove')
              );
            }),
            // Regression curve
            n >= 2 && regPath()
          ),

          // Pie chart
          chartType === 'pie' && n > 0 && h('div', { className: 'bg-white rounded-xl border border-teal-200 p-4 flex justify-center' },
            h('svg', { viewBox: '0 0 300 300', width: 260, height: 260, 'data-dataplot-svg': true },
              (function() {
                var total = allY.reduce(function(s,v) { return s + Math.abs(v); }, 0) || 1;
                var cols = ['#0d9488','#3b82f6','#8b5cf6','#f43f5e','#f59e0b','#10b981','#6366f1','#ec4899','#14b8a6','#ef4444','#84cc16','#06b6d4'];
                var startAngle = 0;
                return points.map(function(p, i) {
                  var pct = Math.abs(p.y) / total;
                  var angle = pct * 2 * Math.PI;
                  var x1 = 150 + 120 * Math.cos(startAngle);
                  var y1 = 150 + 120 * Math.sin(startAngle);
                  var x2 = 150 + 120 * Math.cos(startAngle + angle);
                  var y2 = 150 + 120 * Math.sin(startAngle + angle);
                  var large = angle > Math.PI ? 1 : 0;
                  var d_ = 'M 150 150 L ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A 120 120 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z';
                  var midA = startAngle + angle/2;
                  var lx = 150 + 80 * Math.cos(midA);
                  var ly = 150 + 80 * Math.sin(midA);
                  startAngle += angle;
                  return h('g', { key: 'pie'+i },
                    h('path', { d: d_, fill: cols[i % cols.length], stroke: '#fff', strokeWidth: 2 }),
                    pct > 0.05 && h('text', { x: lx, y: ly+3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '10px', fontWeight: 'bold' } }, (pct*100).toFixed(0) + '%')
                  );
                });
              })()
            )
          ),

          // Histogram
          chartType === 'histogram' && n > 0 && h('svg', {
            viewBox: '0 0 ' + W + ' ' + H, className: 'w-full bg-white rounded-xl border border-teal-200', style: { maxHeight: '340px' }, 'data-dataplot-svg': true
          },
            h('line', { x1: pad, y1: H-pad, x2: W-pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            h('line', { x1: pad, y1: pad, x2: pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            histBins.map(function(bin, i) {
              var barW = (W - 2*pad) / histBins.length - 2;
              var barX = pad + i * ((W - 2*pad) / histBins.length) + 1;
              var barH = maxBinCount > 0 ? (bin.count / maxBinCount) * (H - 2*pad) : 0;
              return h('g', { key: 'hb'+i },
                h('rect', { x: barX, y: H-pad-barH, width: barW, height: Math.max(1, barH), fill: pal.fill, fillOpacity: 0.8, rx: 2 }),
                h('text', { x: barX+barW/2, y: H-pad+12, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '8px' } }, bin.low.toFixed(0) + '-' + bin.high.toFixed(0)),
                h('text', { x: barX+barW/2, y: H-pad-barH-4, textAnchor: 'middle', fill: pal.fill, style: { fontSize: '9px', fontWeight: 'bold' } }, bin.count)
              );
            }),
            yLabel && h('text', { x: W/2, y: H-2, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '10px', fontWeight: 'bold' } }, yLabel + ' (bins)')
          ),

          // Box plot
          chartType === 'boxplot' && n > 0 && h('svg', {
            viewBox: '0 0 ' + W + ' 160', className: 'w-full bg-white rounded-xl border border-teal-200', 'data-dataplot-svg': true
          },
            (function() {
              var bx = function(v) { return pad + ((v - yMin_) / (yRange || 1)) * (W - 2*pad); };
              return h('g', null,
                // Whisker line
                h('line', { x1: bx(yMin_), y1: 80, x2: bx(yMax_), y2: 80, stroke: '#64748b', strokeWidth: 1.5 }),
                // Min/Max whiskers
                h('line', { x1: bx(yMin_), y1: 60, x2: bx(yMin_), y2: 100, stroke: '#64748b', strokeWidth: 1.5 }),
                h('line', { x1: bx(yMax_), y1: 60, x2: bx(yMax_), y2: 100, stroke: '#64748b', strokeWidth: 1.5 }),
                // Box (Q1 to Q3)
                h('rect', { x: bx(q1), y: 55, width: Math.max(2, bx(q3) - bx(q1)), height: 50, fill: pal.fill, fillOpacity: 0.3, stroke: pal.fill, strokeWidth: 2, rx: 4 }),
                // Median line
                h('line', { x1: bx(yMedian), y1: 55, x2: bx(yMedian), y2: 105, stroke: '#ef4444', strokeWidth: 2.5 }),
                // Labels
                h('text', { x: bx(yMin_), y: 50, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '9px' } }, 'Min: ' + yMin_.toFixed(1)),
                h('text', { x: bx(q1), y: 50, textAnchor: 'middle', fill: pal.fill, style: { fontSize: '9px', fontWeight: 'bold' } }, 'Q1: ' + q1.toFixed(1)),
                h('text', { x: bx(yMedian), y: 120, textAnchor: 'middle', fill: '#ef4444', style: { fontSize: '9px', fontWeight: 'bold' } }, 'Med: ' + yMedian.toFixed(1)),
                h('text', { x: bx(q3), y: 50, textAnchor: 'middle', fill: pal.fill, style: { fontSize: '9px', fontWeight: 'bold' } }, 'Q3: ' + q3.toFixed(1)),
                h('text', { x: bx(yMax_), y: 50, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '9px' } }, 'Max: ' + yMax_.toFixed(1)),
                // Outlier dots
                outliers.map(function(o, i) { return h('circle', { key: 'out'+i, cx: bx(o.y), cy: 80, r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 1 }); }),
                // IQR label
                h('text', { x: bx((q1+q3)/2), y: 145, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '9px' } }, 'IQR: ' + iqr.toFixed(1))
              );
            })()
          ),

          // ── Controls row ──
          h('div', { className: 'flex gap-2 flex-wrap items-center' },
            h('button', { onClick: doUndo, disabled: !undoStack.length, className: 'px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm disabled:opacity-40' }, '\u21A9 Undo'),
            h('button', { onClick: clearAll, disabled: !n, className: 'px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm disabled:opacity-40' }, '\uD83D\uDDD1\uFE0F Clear'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-violet-600 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showResiduals, onChange: function() { upd('showResiduals', !showResiduals); }, className: 'accent-violet-600' }), 'Residuals'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-teal-600 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showLabels, onChange: function() { upd('showLabels', !showLabels); }, className: 'accent-teal-600' }), 'Labels'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-sky-600 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showGrid, onChange: function() { upd('showGrid', !showGrid); }, className: 'accent-sky-600' }), 'Grid'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-red-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showOutliers, onChange: function() { upd('showOutliers', !showOutliers); if (!showOutliers && outliers.length > 0) checkBadges({}); }, className: 'accent-red-500' }), 'Outliers' + (outliers.length > 0 ? ' (' + outliers.length + ')' : '')),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: tableMode, onChange: function() { upd('tableMode', !tableMode); }, className: 'accent-teal-600' }), 'Table'),
            h('div', { className: 'ml-auto flex gap-1.5' },
              h('button', { onClick: exportCSV, disabled: !n, className: 'px-2 py-1 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg disabled:opacity-40' }, '\uD83D\uDCE5 CSV'),
              h('button', { onClick: exportSVG, disabled: !n, className: 'px-2 py-1 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg disabled:opacity-40' }, '\uD83D\uDCD0 SVG'),
              h('button', { onClick: saveChart, disabled: !n, className: 'px-2 py-1 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg disabled:opacity-40' }, '\uD83D\uDCBE Save')
            )
          ),

          // Table input
          tableMode && h('div', { className: 'bg-slate-50 rounded-lg p-3' },
            h('div', { className: 'flex gap-2 items-end mb-2' },
              h('div', null, h('label', { className: 'text-[10px] font-bold text-slate-400 block' }, 'X'), h('input', { type: 'number', step: '0.1', id: 'dp-x-input', className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono', placeholder: '0' })),
              h('div', null, h('label', { className: 'text-[10px] font-bold text-slate-400 block' }, 'Y'), h('input', { type: 'number', step: '0.1', id: 'dp-y-input', className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono', placeholder: '0' })),
              h('button', { onClick: function() { var xi = document.getElementById('dp-x-input'), yi = document.getElementById('dp-y-input'); if (xi && yi && xi.value && yi.value) { addPoint(parseFloat(xi.value), parseFloat(yi.value)); xi.value = ''; yi.value = ''; } }, className: 'px-3 py-1 bg-teal-600 text-white font-bold rounded text-sm hover:bg-teal-700' }, '+ Add')
            ),
            n > 0 && h('div', { className: 'max-h-24 overflow-y-auto text-xs font-mono text-slate-500' },
              points.map(function(p, i) { return h('span', { key: i, className: 'inline-block mr-2 bg-white px-1.5 py-0.5 rounded border mb-1 cursor-pointer hover:bg-red-50', onClick: function() { removePoint(i); } }, '(' + p.x + ',' + p.y + ')'); })
            )
          ),

          // Regression info
          n >= 2 && h('div', { className: 'bg-white rounded-lg border p-2' },
            h('div', { className: 'flex gap-2 items-center mb-1.5 flex-wrap' },
              h('span', { className: 'text-[10px] font-bold text-slate-500' }, 'Regression:'),
              ['linear', 'quadratic', 'exponential', 'logarithmic'].map(function(rt) {
                return h('button', { key: rt, onClick: function() { upd('regressionType', rt); },
                  className: 'px-2 py-0.5 rounded text-[10px] font-bold transition-all ' + (regressionType === rt ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                }, rt.charAt(0).toUpperCase() + rt.slice(1));
              })
            ),
            h('div', { className: 'flex items-center gap-3' },
              h('span', { className: 'text-xs font-mono text-slate-700' }, regEq),
              h('span', { className: 'text-xs font-bold ' + (Math.abs(regR2) > 0.8 ? 'text-emerald-600' : Math.abs(regR2) > 0.5 ? 'text-yellow-600' : 'text-red-500') }, 'R\u00B2 = ' + regR2.toFixed(4)),
              h('span', { className: 'text-[10px] text-slate-400' }, slope > 0 ? '\u2197 Positive' : slope < 0 ? '\u2198 Negative' : '\u2794 None')
            ),
            // Correlation strength bar
            h('div', { className: 'flex items-center gap-2 mt-1.5' },
              h('div', { className: 'flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden' },
                h('div', { style: { width: (Math.abs(regR2)*100) + '%', height: '100%', borderRadius: '9999px', backgroundColor: Math.abs(regR2) > 0.8 ? '#22c55e' : Math.abs(regR2) > 0.5 ? '#eab308' : Math.abs(regR2) > 0.3 ? '#f97316' : '#ef4444', transition: 'all 0.4s' } })
              ),
              h('span', { className: 'text-[10px] font-bold ' + (Math.abs(regR2) > 0.8 ? 'text-emerald-600' : Math.abs(regR2) > 0.5 ? 'text-yellow-600' : 'text-red-500') },
                Math.abs(regR2) > 0.9 ? '\u2B50 Very Strong' : Math.abs(regR2) > 0.7 ? 'Strong' : Math.abs(regR2) > 0.5 ? 'Moderate' : Math.abs(regR2) > 0.3 ? 'Weak' : 'Very Weak'
              )
            )
          ),

          // Gallery
          showGallery && h('div', { className: 'bg-slate-50 rounded-xl p-3 border border-slate-200' },
            h('div', { className: 'text-xs font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDCBE Saved Charts'),
            galleryItems.length === 0
              ? h('div', { className: 'text-xs text-slate-400 text-center py-2' }, 'No saved charts yet')
              : h('div', { className: 'space-y-1.5' }, galleryItems.map(function(item) {
                  return h('div', { key: item.id, className: 'flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200' },
                    h('span', { className: 'text-xs font-bold text-slate-700' }, item.n + ' pts'),
                    h('span', { className: 'text-[10px] text-slate-400' }, 'R\u00B2=' + (item.r2||0).toFixed(3)),
                    h('span', { className: 'text-[10px] text-slate-400 ml-auto' }, new Date(item.timestamp).toLocaleDateString()),
                    h('button', { onClick: function() { loadChart(item); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-600 rounded hover:bg-teal-100' }, 'Load'),
                    h('button', { onClick: function() { deleteChart(item.id); }, className: 'px-2 py-0.5 text-[10px] font-bold text-red-400 hover:text-red-600' }, '\u2715')
                  );
                }))
          ),

          h('button', { onClick: function() { upd('showGallery', !showGallery); }, className: 'text-[10px] font-bold text-slate-500 hover:text-teal-600' }, showGallery ? '\u25B2 Hide Gallery' : '\u25BC Show Gallery (' + galleryItems.length + ')')
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Statistics ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'stats' && h('div', { className: 'space-y-3' },
          n === 0
            ? h('div', { className: 'text-center text-sm text-slate-400 py-8' }, 'Add data points to see statistics')
            : h('div', { className: 'space-y-3' },
              // Summary stats grid
              h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
                [
                  { label: 'Count', value: n, icon: '\uD83D\uDCCA' },
                  { label: 'Mean Y', value: meanY.toFixed(2), icon: '\uD83D\uDCCF' },
                  { label: 'Median Y', value: yMedian.toFixed(2), icon: '\u2796' },
                  { label: 'Mode Y', value: modeVal, icon: '\uD83D\uDD01' },
                  { label: 'Std Dev', value: stdDev.toFixed(2), icon: '\uD83D\uDCC9' },
                  { label: 'Min Y', value: yMin_.toFixed(2), icon: '\u2B07\uFE0F' },
                  { label: 'Max Y', value: yMax_.toFixed(2), icon: '\u2B06\uFE0F' },
                  { label: 'Range', value: yRange.toFixed(2), icon: '\u2194\uFE0F' },
                  { label: 'Q1', value: q1.toFixed(2), icon: '\uD83D\uDCD0' },
                  { label: 'Q3', value: q3.toFixed(2), icon: '\uD83D\uDCD0' },
                  { label: 'IQR', value: iqr.toFixed(2), icon: '\uD83D\uDCE6' },
                  { label: 'Outliers', value: outliers.length, icon: '\u26A0\uFE0F' },
                  { label: 'Mean X', value: meanX.toFixed(2), icon: '\uD83D\uDCCF' },
                  { label: 'Slope', value: slope.toFixed(4), icon: '\uD83D\uDCC8' },
                  { label: 'Intercept', value: intercept.toFixed(2), icon: '\u2795' },
                  { label: 'R\u00B2', value: regR2.toFixed(4), icon: '\u2B50' }
                ].map(function(stat) {
                  return h('div', { key: stat.label, className: 'p-2 bg-white rounded-lg border border-teal-100 text-center' },
                    h('div', { className: 'text-[9px] font-bold text-teal-600 uppercase' }, stat.icon + ' ' + stat.label),
                    h('div', { className: 'text-sm font-bold text-teal-900' }, stat.value)
                  );
                })
              ),

              // Regression comparison
              n >= 2 && h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200' },
                h('div', { className: 'text-xs font-bold text-teal-700 uppercase mb-2' }, '\uD83D\uDD2C Regression Comparison'),
                h('div', { className: 'space-y-1.5' },
                  [
                    { name: 'Linear', eq: 'y = ' + slope.toFixed(2) + 'x + ' + intercept.toFixed(2), r2: r2 },
                    n >= 3 ? { name: 'Quadratic', eq: 'y = ' + quadA.toFixed(4) + 'x\u00B2 + ' + quadB.toFixed(2) + 'x + ' + quadC.toFixed(2), r2: quadR2 } : null,
                    expA ? { name: 'Exponential', eq: 'y = ' + expA.toFixed(2) + 'e^(' + expB.toFixed(4) + 'x)', r2: expR2 } : null,
                    logB ? { name: 'Logarithmic', eq: 'y = ' + logA.toFixed(2) + ' + ' + logB.toFixed(2) + 'ln(x)', r2: logR2 } : null
                  ].filter(Boolean).sort(function(a, b) { return Math.abs(b.r2) - Math.abs(a.r2); }).map(function(reg) {
                    var best = reg.r2 === Math.max(r2, quadR2, expR2, logR2);
                    return h('div', { key: reg.name, className: 'flex items-center gap-2 p-2 rounded-lg ' + (best ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50') },
                      best && h('span', { className: 'text-[10px] font-bold text-emerald-600' }, '\u2B50 Best'),
                      h('span', { className: 'text-xs font-bold text-slate-700 w-20' }, reg.name),
                      h('span', { className: 'text-[10px] font-mono text-slate-500 flex-1' }, reg.eq),
                      h('span', { className: 'text-xs font-bold ' + (Math.abs(reg.r2) > 0.8 ? 'text-emerald-600' : 'text-yellow-600') }, 'R\u00B2=' + reg.r2.toFixed(4))
                    );
                  })
                )
              ),

              // Five-number summary
              h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200' },
                h('div', { className: 'text-xs font-bold text-teal-700 uppercase mb-2' }, '\uD83D\uDCE6 Five-Number Summary (Y)'),
                h('div', { className: 'flex gap-2 justify-around text-center' },
                  [
                    { label: 'Min', value: yMin_.toFixed(1) },
                    { label: 'Q1', value: q1.toFixed(1) },
                    { label: 'Median', value: yMedian.toFixed(1) },
                    { label: 'Q3', value: q3.toFixed(1) },
                    { label: 'Max', value: yMax_.toFixed(1) }
                  ].map(function(s) {
                    return h('div', { key: s.label },
                      h('div', { className: 'text-[10px] font-bold text-teal-500' }, s.label),
                      h('div', { className: 'text-sm font-bold text-teal-900' }, s.value)
                    );
                  })
                )
              )
            )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Quiz ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'quiz' && h('div', { className: 'space-y-3' },
          h('div', { className: 'flex items-center gap-3' },
            h('button', { onClick: makeQuiz, className: 'px-4 py-2 rounded-lg text-sm font-bold ' + (dpQuiz ? 'bg-teal-100 text-teal-700' : 'bg-teal-600 text-white') + ' hover:opacity-90 transition-all' }, dpQuiz ? '\uD83D\uDD04 Next Scenario' : '\uD83D\uDCCA Predict Correlation'),
            dpScore > 0 && h('span', { className: 'text-xs font-bold text-emerald-600' }, '\u2B50 ' + dpScore + ' correct'),
            dpStreak > 1 && h('span', { className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDD25 ' + dpStreak + ' streak')
          ),
          dpQuiz && !dpQuiz.answered && h('div', { className: 'bg-teal-50 rounded-xl p-4 border border-teal-200' },
            h('p', { className: 'text-sm font-bold text-teal-800 mb-3' }, '\u201C' + dpQuiz.text + '\u201D \u2014 What correlation do you predict?'),
            h('div', { className: 'flex gap-3' },
              dpQuiz.opts.map(function(opt) {
                return h('button', { key: opt, onClick: function() { answerQuiz(opt); },
                  className: 'flex-1 px-4 py-2.5 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer'
                }, opt);
              })
            )
          ),
          dpQuiz && dpQuiz.answered && h('div', { className: 'p-3 rounded-xl text-sm font-bold ' + (dpQuiz.chosen === dpQuiz.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },
            dpQuiz.chosen === dpQuiz.answer ? '\u2705 Correct! ' + dpQuiz.answer + ' correlation.' : '\u274C The answer is ' + dpQuiz.answer + ' correlation.',
            h('button', { onClick: makeQuiz, className: 'ml-3 text-xs font-bold underline' }, '\u27A1 Next')
          ),
          !dpQuiz && h('div', { className: 'text-center text-sm text-slate-400 py-4' }, 'Click "Predict Correlation" to start a quiz!')
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Tools ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'tools' && h('div', { className: 'space-y-3' },

          // Prediction tool
          h('div', { className: 'bg-white rounded-xl p-4 border border-indigo-200' },
            h('div', { className: 'text-xs font-bold text-indigo-700 uppercase mb-2' }, '\uD83D\uDD2E Prediction Tool'),
            n < 2
              ? h('div', { className: 'text-xs text-slate-400' }, 'Need 2+ points to predict')
              : h('div', null,
                  h('div', { className: 'text-[10px] text-slate-500 mb-2' }, 'Using ' + regressionType + ' regression: ' + regEq),
                  h('div', { className: 'flex gap-2 items-center' },
                    h('span', { className: 'text-xs font-bold text-indigo-600' }, 'If X ='),
                    h('input', { type: 'number', step: '0.1', value: predX, onChange: function(e) { upd('predX', e.target.value); checkBadges({ predicted: true }); }, className: 'w-24 px-2 py-1.5 border-2 border-indigo-200 rounded-lg text-sm font-bold text-indigo-800 text-center outline-none focus:border-indigo-400', placeholder: '?' }),
                    h('span', { className: 'text-xs font-bold text-indigo-600' }, 'then Y \u2248'),
                    h('div', { className: 'px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-bold text-indigo-800 min-w-[60px] text-center' }, predResult || '?')
                  )
                )
          ),

          // AI Data Analyst
          callGemini && h('div', { className: 'bg-pink-50 rounded-xl p-4 border border-pink-200' },
            h('div', { className: 'flex items-center gap-2 mb-2' },
              h('span', { className: 'text-xs font-bold text-pink-600 uppercase' }, '\uD83E\uDD16 AI Data Analyst'),
              h('button', { onClick: askAI, disabled: aiLoading || n < 2, className: 'ml-auto px-3 py-1 text-[10px] font-bold rounded-full transition-all ' + (aiLoading ? 'bg-pink-200 text-pink-400 cursor-wait' : 'bg-pink-500 text-white hover:bg-pink-600') },
                aiLoading ? '\u23F3 Analyzing...' : '\u2728 Analyze Data')
            ),
            aiInsight
              ? h('div', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, aiInsight)
              : h('div', { className: 'text-xs text-pink-400' }, n < 2 ? 'Add at least 2 data points first' : 'Click to get AI insights about your data!')
          ),

          // Data import (paste CSV)
          h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200' },
            h('div', { className: 'text-xs font-bold text-slate-700 uppercase mb-2' }, '\uD83D\uDCCB Import Data (CSV)'),
            h('textarea', { id: 'dp-import-csv', placeholder: 'Paste CSV data:\nx,y\n1,5\n2,8\n3,12', className: 'w-full h-20 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 resize-none', rows: 4 }),
            h('button', { onClick: function() {
              var el = document.getElementById('dp-import-csv');
              if (!el || !el.value.trim()) return;
              var lines = el.value.trim().split('\n');
              var imported = [];
              lines.forEach(function(line) {
                var parts = line.split(',').map(function(s) { return parseFloat(s.trim()); });
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) imported.push({ x: parts[0], y: parts[1] });
              });
              if (imported.length > 0) {
                var newUndo = pushUndo();
                updMulti({ points: imported, undoStack: newUndo });
                if (addToast) addToast('\uD83D\uDCE5 Imported ' + imported.length + ' points!', 'success');
                el.value = '';
              } else {
                if (addToast) addToast('\u26A0\uFE0F No valid data found. Format: x,y per line', 'error');
              }
            }, className: 'mt-2 px-4 py-1.5 bg-teal-600 text-white font-bold rounded-lg text-sm hover:bg-teal-700' }, '\u21E9 Import')
          )
        ),

        // ── Coach tip ──
        h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg p-3 border border-teal-100 text-xs text-teal-700 leading-relaxed' },
          n === 0 ? '\uD83D\uDCCA Click the chart to plot points, or load a dataset to get started!'
            : n < 3 ? '\uD83D\uDCA1 Add more points to see regression analysis. At least 2 needed for a trend line!'
            : Math.abs(regR2) > 0.9 ? '\u2B50 Nearly perfect correlation! This data fits ' + regressionType + ' regression very well.'
            : Math.abs(regR2) > 0.7 ? '\uD83D\uDCC8 Strong trend detected! Try different regression types to find the best fit.'
            : Math.abs(regR2) < 0.3 ? '\uD83E\uDD14 Weak correlation. This might not be a linear relationship \u2014 try quadratic or exponential!'
            : '\uD83D\uDCA1 Fun fact: Francis Galton invented regression in the 1880s while studying heredity!'
        )
      );
    }
  });
})();
