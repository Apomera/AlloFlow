// ═══════════════════════════════════════════════════════════════
// stem_tool_dataplot.js — STEM Lab Data Plotter (Enhanced v2)
// Interactive data visualization with scatter, bar, line, pie,
// histogram, box plot, ogive, confidence intervals, residual plot,
// z-score calculator, stem-and-leaf, data transformations,
// Spearman correlation, animated step-through, and more.
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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-dataplot')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-dataplot';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


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
  function sfxStep() { playTone(440, 0.04, 'triangle', 0.05); }
  function sfxTransform() { playTone(600, 0.06, 'sine', 0.06); setTimeout(function() { playTone(800, 0.06, 'sine', 0.06); }, 60); }

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
    { label: '\uD83D\uDCCA Height/Weight', pts: [{x:150,y:50},{x:155,y:52},{x:160,y:58},{x:165,y:62},{x:170,y:68},{x:175,y:72},{x:180,y:78},{x:185,y:82},{x:190,y:88}], xLabel: 'Height (cm)', yLabel: 'Weight (kg)' },
    { label: '\uD83D\uDCDA Study/Grade', pts: [{x:0,y:55},{x:1,y:62},{x:2,y:68},{x:3,y:72},{x:4,y:78},{x:5,y:85},{x:6,y:88},{x:7,y:92},{x:8,y:95}], xLabel: 'Hours Studied', yLabel: 'Grade (%)' },
    { label: '\uD83C\uDF21\uFE0F Temp/IceCream', pts: [{x:15,y:20},{x:18,y:35},{x:22,y:45},{x:25,y:60},{x:28,y:70},{x:30,y:85},{x:33,y:90},{x:35,y:95}], xLabel: 'Temperature (\u00B0C)', yLabel: 'Sales ($)' },
    { label: '\uD83D\uDE97 Age/CarValue', pts: [{x:0,y:30000},{x:1,y:25000},{x:2,y:21000},{x:3,y:18000},{x:5,y:13000},{x:7,y:9000},{x:10,y:5500},{x:15,y:3000}], xLabel: 'Age (years)', yLabel: 'Value ($)' },
    { label: '\uD83C\uDFC0 Practice/FT%', pts: [{x:0,y:42},{x:2,y:48},{x:4,y:55},{x:6,y:63},{x:8,y:68},{x:10,y:74},{x:12,y:78},{x:14,y:82},{x:16,y:85}], xLabel: 'Practice (hrs/week)', yLabel: 'Free Throw %' },
    { label: '\uD83C\uDF31 Sun/Growth', pts: [{x:1,y:2},{x:2,y:5},{x:3,y:9},{x:4,y:14},{x:5,y:18},{x:6,y:20},{x:7,y:21},{x:8,y:21.5}], xLabel: 'Sunlight (hrs)', yLabel: 'Growth (cm)' },
    { label: '\uD83C\uDFE0 Size/Price', pts: [{x:800,y:150000},{x:1000,y:200000},{x:1200,y:250000},{x:1500,y:320000},{x:1800,y:380000},{x:2200,y:450000},{x:2800,y:560000},{x:3500,y:700000}], xLabel: 'Size (sq ft)', yLabel: 'Price ($)' },
    { label: '\uD83C\uDFB2 Random', pts: Array.from({length:12}, function() { return {x: Math.round(Math.random()*100)/10, y: Math.round(Math.random()*100)/10}; }), xLabel: 'X', yLabel: 'Y' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Correlated Data Generator ──
  // ══════════════════════════════════════════════════════════════
  function generateCorrelated(targetR, count) {
    count = count || 20;
    var pts = [];
    for (var i = 0; i < count; i++) {
      var x = Math.round((5 + i * 90 / count + (Math.random() * 10 - 5)) * 10) / 10;
      var noise = (1 - Math.abs(targetR)) * (Math.random() * 60 - 30);
      var y = Math.round(((targetR >= 0 ? x * 0.8 + 10 : -x * 0.8 + 100) + noise) * 10) / 10;
      pts.push({ x: Math.max(0, x), y: Math.max(0, y) });
    }
    return pts;
  }

  // ══════════════════════════════════════════════════════════════
  // ── Badge Definitions (17) ──
  // ══════════════════════════════════════════════════════════════
  var badgeDefs = [
    { id: 'first_point', icon: '\uD83D\uDCCD', name: 'First Plot', desc: 'Plot your first data point' },
    { id: 'ten_points', icon: '\uD83D\uDCCA', name: 'Data Collector', desc: 'Have 10+ points on chart' },
    { id: 'fifty_points', icon: '\uD83D\uDCC8', name: 'Big Data', desc: 'Have 50+ points on chart' },
    { id: 'strong_r2', icon: '\u2B50', name: 'Perfect Fit', desc: 'Achieve R\u00B2 > 0.95' },
    { id: 'quiz_5', icon: '\uD83E\uDDE0', name: 'Quiz Whiz', desc: 'Answer 5 quiz questions correctly' },
    { id: 'streak_5', icon: '\uD83D\uDD25', name: 'On Fire', desc: '5 correct answers in a row' },
    { id: 'all_charts', icon: '\uD83C\uDFA8', name: 'Chart Master', desc: 'View all 7 chart types' },
    { id: 'saved_3', icon: '\uD83D\uDCBE', name: 'Archivist', desc: 'Save 3 charts to gallery' },
    { id: 'csv_export', icon: '\uD83D\uDCE5', name: 'Data Exporter', desc: 'Export data as CSV' },
    { id: 'ai_analyst', icon: '\uD83E\uDD16', name: 'AI Analyst', desc: 'Use the AI data analyst' },
    { id: 'outlier_found', icon: '\uD83D\uDD0D', name: 'Outlier Hunter', desc: 'Find an outlier in your data' },
    { id: 'predictor', icon: '\uD83D\uDD2E', name: 'Fortune Teller', desc: 'Use the prediction tool' },
    { id: 'z_score', icon: '\uD83D\uDCD0', name: 'Z-Score Pro', desc: 'Calculate a z-score' },
    { id: 'transform', icon: '\uD83D\uDD04', name: 'Transformer', desc: 'Apply a data transformation' },
    { id: 'step_through', icon: '\uD83D\uDC63', name: 'Step Master', desc: 'Complete a step-through' },
    { id: 'spearman', icon: '\uD83C\uDFC5', name: 'Rank Expert', desc: 'View Spearman correlation' },
    { id: 'all_quiz_types', icon: '\uD83C\uDF93', name: 'Quiz Champion', desc: 'Try all 4 quiz types' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Quiz Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var correlationScenarios = [
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
  var guessR2Scenarios = [
    { r: 0.95, label: 'Very strong positive' },
    { r: 0.75, label: 'Strong positive' },
    { r: 0.45, label: 'Moderate positive' },
    { r: 0.10, label: 'Very weak' },
    { r: -0.85, label: 'Strong negative' },
    { r: -0.50, label: 'Moderate negative' }
  ];
  var matchChartScenarios = [
    { q: 'Show proportions of a whole (budget breakdown)', a: 'Pie', opts: ['Scatter', 'Pie', 'Histogram', 'Box Plot'] },
    { q: 'Show the distribution shape of test scores', a: 'Histogram', opts: ['Scatter', 'Bar', 'Histogram', 'Line'] },
    { q: 'Show the relationship between height and weight', a: 'Scatter', opts: ['Scatter', 'Pie', 'Box Plot', 'Histogram'] },
    { q: 'Compare sales across 4 quarters', a: 'Bar', opts: ['Scatter', 'Bar', 'Box Plot', 'Histogram'] },
    { q: 'Show temperature change over a week', a: 'Line', opts: ['Line', 'Pie', 'Box Plot', 'Scatter'] },
    { q: 'Compare spread and outliers across groups', a: 'Box Plot', opts: ['Line', 'Pie', 'Box Plot', 'Histogram'] },
    { q: 'Show cumulative growth of savings', a: 'Ogive', opts: ['Ogive', 'Scatter', 'Pie', 'Bar'] }
  ];
  var outlierScenarios = [
    { label: 'student test scores', gen: function() {
      var pts = []; for (var i = 0; i < 10; i++) pts.push({ x: i+1, y: Math.round(70 + Math.random() * 15) });
      var oi = Math.floor(Math.random() * 10); pts[oi].y = Math.round(20 + Math.random() * 10);
      return { pts: pts, outlierIdx: oi };
    }},
    { label: 'daily temperatures (\u00B0C)', gen: function() {
      var pts = []; for (var i = 0; i < 10; i++) pts.push({ x: i+1, y: Math.round(20 + Math.random() * 5) });
      var oi = Math.floor(Math.random() * 10); pts[oi].y = Math.round(45 + Math.random() * 10);
      return { pts: pts, outlierIdx: oi };
    }},
    { label: 'marathon finish times (min)', gen: function() {
      var pts = []; for (var i = 0; i < 10; i++) pts.push({ x: i+1, y: Math.round(230 + Math.random() * 30) });
      var oi = Math.floor(Math.random() * 10); pts[oi].y = Math.round(350 + Math.random() * 30);
      return { pts: pts, outlierIdx: oi };
    }}
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

  // ══════════════════════════════════════════════════════════════
  // ── Z-Score to Percentile (CDF approx) ──
  // ══════════════════════════════════════════════════════════════
  function zToPercentile(z) {
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var sign = z < 0 ? -1 : 1;
    var x = Math.abs(z) / Math.sqrt(2);
    var t = 1.0 / (1.0 + p * x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return Math.round((0.5 * (1.0 + sign * y)) * 10000) / 100;
  }

  // ══════════════════════════════════════════════════════════════
  // ── Normal PDF ──
  // ══════════════════════════════════════════════════════════════
  function normalPDF(x, mean, sd) {
    if (sd === 0) return 0;
    return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
  }

  // ══════════════════════════════════════════════════════════════
  // ── REGISTER TOOL ──
  // ══════════════════════════════════════════════════════════════
  window.StemLab.registerTool('dataPlot', {
    icon: '\uD83D\uDCCA', label: 'Data Plotter',
    desc: 'Plot data, calculate regression & R\u00B2',
    color: 'slate', category: 'creative',
    questHooks: [
      { id: 'plot_5_points', label: 'Plot 5+ data points', icon: '\uD83D\uDCCD', check: function(d) { return (d.points || []).length >= 5; }, progress: function(d) { return (d.points || []).length + '/5 points'; } },
      { id: 'plot_10_points', label: 'Plot 10+ data points for regression analysis', icon: '\uD83D\uDCC8', check: function(d) { return (d.points || []).length >= 10; }, progress: function(d) { return (d.points || []).length + '/10 points'; } },
      { id: 'view_residuals', label: 'View residuals to evaluate fit quality', icon: '\uD83D\uDD2C', check: function(d) { return d.showResiduals || false; }, progress: function(d) { return d.showResiduals ? 'Viewing!' : 'Toggle residuals'; } }
    ],
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
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;

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
      var chartType = d.chartType || 'scatter';
      var showResiduals = d.showResiduals || false;
      var showLabels = d.showLabels || false;
      var showGrid = d.showGrid != null ? d.showGrid : true;
      var tableMode = d.tableMode || false;
      var paletteId = d.paletteId || 'teal';
      var xLabel = d.xLabel || '';
      var yLabel = d.yLabel || '';
      var activeTab = d.activeTab || 'chart';
      var regressionType = d.regressionType || 'linear';
      var predX = d.predX || '';
      var aiInsight = d.aiInsight || '';
      var aiLoading = d.aiLoading || false;
      var undoStack = d.undoStack || [];
      var earnedBadges = d.earnedBadges || {};
      var showBadges = d.showBadges || false;
      var dpQuiz = d.dpQuiz || null;
      var dpScore = d.dpScore || 0;
      var dpStreak = d.dpStreak || 0;
      var chartsViewed = d.chartsViewed || {};
      var galleryItems = loadGallery();
      var showGallery = d.showGallery || false;
      var showOutliers = d.showOutliers || false;

      // ── v2 State ──
      var showCI = d.showCI || false;
      var showResidualPlot = d.showResidualPlot || false;
      var showNormalOverlay = d.showNormalOverlay || false;
      var zScoreInput = d.zScoreInput || '';
      var showStemLeaf = d.showStemLeaf || false;
      var stepMode = d.stepMode || false;
      var stepIdx = d.stepIdx != null ? d.stepIdx : 0;
      var showShortcuts = d.showShortcuts || false;
      var quizType = d.quizType || 'correlation';
      var quizTypesUsed = d.quizTypesUsed || {};

      var pal = palettes.find(function(p) { return p.id === paletteId; }) || palettes[0];

      // ══════════════════════════════════════════════════════════════
      // ── SVG Dimensions ──
      // ══════════════════════════════════════════════════════════════
      var W = 440, H = 320, pad = 45;
      var visiblePoints = stepMode ? points.slice(0, Math.min(stepIdx, points.length)) : points;
      var allX = visiblePoints.map(function(p) { return p.x; });
      var allY = visiblePoints.map(function(p) { return p.y; });
      var xMin = allX.length ? Math.min.apply(null, allX) - 1 : 0;
      var xMax = allX.length ? Math.max.apply(null, allX) + 1 : 10;
      var yMin = allY.length ? Math.min.apply(null, allY) - 1 : 0;
      var yMax = allY.length ? Math.max.apply(null, allY) + 1 : 10;
      var toSX = function(x) { return pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad); };
      var toSY = function(y) { return (H - pad) - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad); };

      // ══════════════════════════════════════════════════════════════
      // ── Statistical Calculations ──
      // ══════════════════════════════════════════════════════════════
      var n = visiblePoints.length;
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      visiblePoints.forEach(function(p) { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x; });
      var meanX = n > 0 ? sumX / n : 0;
      var meanY = n > 0 ? sumY / n : 0;

      // Linear regression
      var slope = 0, intercept = 0, r2 = 0;
      if (n >= 2) {
        slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
        intercept = (sumY - slope * sumX) / n;
        var ssTot = allY.reduce(function(s, y) { return s + (y - meanY) * (y - meanY); }, 0);
        var ssRes = visiblePoints.reduce(function(s, p) { return s + Math.pow(p.y - (slope * p.x + intercept), 2); }, 0);
        r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
      }

      // Quadratic regression (y = ax\u00B2 + bx + c) via Cramer's rule
      var quadA = 0, quadB = 0, quadC = 0, quadR2 = 0;
      if (n >= 3) {
        var qsx1 = sumX, qsx2 = sumX2, qsx3 = 0, qsx4 = 0, qsxy = sumXY, qsx2y = 0;
        visiblePoints.forEach(function(p) { qsx3 += p.x*p.x*p.x; qsx4 += p.x*p.x*p.x*p.x; qsx2y += p.x*p.x*p.y; });
        var det = n*(qsx2*qsx4-qsx3*qsx3) - qsx1*(qsx1*qsx4-qsx3*qsx2) + qsx2*(qsx1*qsx3-qsx2*qsx2);
        if (Math.abs(det) > 1e-10) {
          quadC = (sumY*(qsx2*qsx4-qsx3*qsx3) - qsx1*(qsxy*qsx4-qsx2y*qsx3) + qsx2*(qsxy*qsx3-qsx2y*qsx2)) / det;
          quadB = (n*(qsxy*qsx4-qsx2y*qsx3) - sumY*(qsx1*qsx4-qsx3*qsx2) + qsx2*(qsx1*qsx2y-qsxy*qsx2)) / det;
          quadA = (n*(qsx2*qsx2y-qsx3*qsxy) - qsx1*(qsx1*qsx2y-qsxy*qsx2) + sumY*(qsx1*qsx3-qsx2*qsx2)) / det;
          var ssResQ = visiblePoints.reduce(function(s, p) { return s + Math.pow(p.y - (quadA*p.x*p.x + quadB*p.x + quadC), 2); }, 0);
          var ssTotQ = allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0);
          quadR2 = ssTotQ > 0 ? 1 - ssResQ / ssTotQ : 0;
        }
      }

      // Exponential regression (y = ae^(bx)) via log transform
      var expA = 0, expB = 0, expR2 = 0;
      if (n >= 2) {
        var posPoints = visiblePoints.filter(function(p) { return p.y > 0; });
        if (posPoints.length >= 2) {
          var lnY = posPoints.map(function(p) { return Math.log(p.y); });
          var slnY = lnY.reduce(function(s, v) { return s + v; }, 0);
          var spXlnY = posPoints.reduce(function(s, p, i) { return s + p.x * lnY[i]; }, 0);
          var espX = posPoints.reduce(function(s, p) { return s + p.x; }, 0);
          var espX2 = posPoints.reduce(function(s, p) { return s + p.x * p.x; }, 0);
          var enp = posPoints.length;
          expB = (enp * spXlnY - espX * slnY) / (enp * espX2 - espX * espX || 1);
          expA = Math.exp((slnY - expB * espX) / enp);
          var ssTotE = allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0);
          var ssResE = visiblePoints.reduce(function(s, p) { return s + Math.pow(p.y - expA * Math.exp(expB * p.x), 2); }, 0);
          expR2 = ssTotE > 0 ? 1 - ssResE / ssTotE : 0;
        }
      }

      // Logarithmic regression (y = a + b*ln(x))
      var logA = 0, logB = 0, logR2 = 0;
      if (n >= 2) {
        var posXPts = visiblePoints.filter(function(p) { return p.x > 0; });
        if (posXPts.length >= 2) {
          var lnX = posXPts.map(function(p) { return Math.log(p.x); });
          var slnX = lnX.reduce(function(s, v) { return s + v; }, 0);
          var slnX2 = lnX.reduce(function(s, v) { return s + v * v; }, 0);
          var slnXY = posXPts.reduce(function(s, p, i) { return s + lnX[i] * p.y; }, 0);
          var lspY = posXPts.reduce(function(s, p) { return s + p.y; }, 0);
          var lnp = posXPts.length;
          logB = (lnp * slnXY - slnX * lspY) / (lnp * slnX2 - slnX * slnX || 1);
          logA = (lspY - logB * slnX) / lnp;
          var ssTotL = allY.reduce(function(s, y) { return s + (y - meanY)*(y - meanY); }, 0);
          var ssResL = posXPts.reduce(function(s, p) { return s + Math.pow(p.y - (logA + logB * Math.log(p.x)), 2); }, 0);
          logR2 = ssTotL > 0 ? 1 - ssResL / ssTotL : 0;
        }
      }

      // Current regression equation & R\u00B2
      var regEq = '', regR2 = r2;
      if (regressionType === 'quadratic' && n >= 3) { regEq = 'y = ' + quadA.toFixed(4) + 'x\u00B2 + ' + quadB.toFixed(2) + 'x + ' + quadC.toFixed(2); regR2 = quadR2; }
      else if (regressionType === 'exponential' && expA) { regEq = 'y = ' + expA.toFixed(2) + 'e^(' + expB.toFixed(4) + 'x)'; regR2 = expR2; }
      else if (regressionType === 'logarithmic' && logB) { regEq = 'y = ' + logA.toFixed(2) + ' + ' + logB.toFixed(2) + 'ln(x)'; regR2 = logR2; }
      else { regEq = 'y = ' + slope.toFixed(2) + 'x + ' + intercept.toFixed(2); regR2 = r2; }

      // Predict Y helper
      var predictY = function(xv) {
        if (regressionType === 'quadratic') return quadA*xv*xv + quadB*xv + quadC;
        if (regressionType === 'exponential' && expA) return expA * Math.exp(expB * xv);
        if (regressionType === 'logarithmic' && xv > 0) return logA + logB * Math.log(xv);
        return slope * xv + intercept;
      };

      // Prediction
      var predResult = '';
      var predIsExtrapolation = false;
      if (predX !== '' && !isNaN(parseFloat(predX))) {
        var px = parseFloat(predX);
        predResult = predictY(px).toFixed(2);
        var dataXMin = allX.length ? Math.min.apply(null, allX) : 0;
        var dataXMax = allX.length ? Math.max.apply(null, allX) : 0;
        predIsExtrapolation = n > 0 && (px < dataXMin || px > dataXMax);
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

      // Outlier detection (IQR)
      var lowerFence = q1 - 1.5 * iqr;
      var upperFence = q3 + 1.5 * iqr;
      var outliers = visiblePoints.filter(function(p) { return p.y < lowerFence || p.y > upperFence; });
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
          var bCount = visiblePoints.filter(function(p) { return p.y >= bLow && (bi === binCount-1 ? p.y <= bHigh : p.y < bHigh); }).length;
          histBins.push({ low: bLow, high: bHigh, count: bCount });
        }
      }
      var maxBinCount = Math.max.apply(null, histBins.map(function(b) { return b.count; }).concat([1]));

      // ══════════════════════════════════════════════════════════════
      // ── Spearman Rank Correlation ──
      // ══════════════════════════════════════════════════════════════
      var spearmanR = 0;
      if (n >= 3) {
        var rankArr = function(arr) {
          var sorted = arr.map(function(v, i) { return { v: v, i: i }; }).sort(function(a, b) { return a.v - b.v; });
          var ranks = new Array(arr.length);
          for (var ri = 0; ri < sorted.length; ri++) ranks[sorted[ri].i] = ri + 1;
          return ranks;
        };
        var xRanks = rankArr(allX);
        var yRanks = rankArr(allY);
        var dSqSum = 0;
        for (var sri = 0; sri < n; sri++) dSqSum += Math.pow(xRanks[sri] - yRanks[sri], 2);
        spearmanR = 1 - (6 * dSqSum) / (n * (n * n - 1));
      }
      var pearsonR = n >= 2 ? (slope >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, Math.abs(r2))) : 0;

      // ══════════════════════════════════════════════════════════════
      // ── Confidence Interval (95% for linear) ──
      // ══════════════════════════════════════════════════════════════
      var seRegression = 0, sxDevSq = 0;
      if (n >= 3 && regressionType === 'linear') {
        var ssResCI = visiblePoints.reduce(function(s, p) { return s + Math.pow(p.y - (slope * p.x + intercept), 2); }, 0);
        seRegression = Math.sqrt(ssResCI / (n - 2));
        sxDevSq = allX.reduce(function(s, x) { return s + (x - meanX) * (x - meanX); }, 0);
      }
      var tValue = n > 30 ? 1.96 : n > 10 ? 2.228 : n > 5 ? 2.571 : 4.303;

      // ══════════════════════════════════════════════════════════════
      // ── Cumulative Frequency ──
      // ══════════════════════════════════════════════════════════════
      var cumulativeFreq = [];
      if (n > 0 && histBins.length > 0) {
        var cumTotal = 0;
        cumulativeFreq.push({ x: histBins[0].low, y: 0, pct: 0 });
        histBins.forEach(function(bin) {
          cumTotal += bin.count;
          cumulativeFreq.push({ x: bin.high, y: cumTotal, pct: Math.round(cumTotal / n * 100) });
        });
      }

      // ══════════════════════════════════════════════════════════════
      // ── Stem-and-Leaf Data ──
      // ══════════════════════════════════════════════════════════════
      var stemLeafData = [];
      if (n > 0) {
        var stemMap = {};
        sortedY.forEach(function(y) {
          var val = Math.round(y);
          var stem = Math.floor(val / 10);
          var leaf = Math.abs(val % 10);
          if (!stemMap[stem]) stemMap[stem] = [];
          stemMap[stem].push(leaf);
        });
        Object.keys(stemMap).sort(function(a, b) { return parseInt(a) - parseInt(b); }).forEach(function(stem) {
          stemLeafData.push({ stem: stem, leaves: stemMap[stem].sort(function(a, b) { return a - b; }) });
        });
      }

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
        chk('first_point', points.length >= 1);
        chk('ten_points', points.length >= 10);
        chk('fifty_points', points.length >= 50);
        chk('strong_r2', n >= 2 && Math.abs(regR2) > 0.95);
        chk('quiz_5', (s.dpScore || dpScore) >= 5);
        chk('streak_5', (s.dpStreak || dpStreak) >= 5);
        chk('all_charts', Object.keys(s.chartsViewed || chartsViewed).length >= 7);
        chk('saved_3', galleryItems.length >= 3);
        chk('csv_export', !!s.csvExported);
        chk('ai_analyst', !!s.aiUsed);
        chk('outlier_found', outliers.length > 0 && showOutliers);
        chk('predictor', !!s.predicted);
        chk('z_score', !!s.zScoreUsed);
        chk('transform', !!s.transformed);
        chk('step_through', !!s.stepComplete);
        chk('spearman', !!s.spearmanViewed);
        chk('all_quiz_types', Object.keys(s.quizTypesUsed || quizTypesUsed).length >= 4);
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
      if (points.length > 0) setTimeout(function() { checkBadges({}); }, 0);

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
        updMulti({ points: [], undoStack: newUndo, stepMode: false, stepIdx: 0 });
      };
      var loadDataset = function(ds) {
        var newUndo = pushUndo();
        updMulti({ points: ds.pts, undoStack: newUndo, xLabel: ds.xLabel || '', yLabel: ds.yLabel || '', stepMode: false });
      };
      var saveChart = function() {
        if (n === 0) return;
        var item = { id: 'dp_' + Date.now(), points: JSON.parse(JSON.stringify(points)), xLabel: xLabel, yLabel: yLabel, chartType: chartType, n: n, r2: regR2, timestamp: Date.now() };
        saveGallery(galleryItems.concat([item]));
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
        saveGallery(galleryItems.filter(function(g) { return g.id !== id; }));
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
          : n + ' pts. X: ' + (xLabel || 'X') + ' (' + Math.min.apply(null,allX).toFixed(1) + '-' + Math.max.apply(null,allX).toFixed(1) + '), Y: ' + (yLabel || 'Y') + ' (' + yMin_.toFixed(1) + '-' + yMax_.toFixed(1) + '). '
          + regEq + ', R\u00B2=' + regR2.toFixed(3) + '. Mean=' + meanY.toFixed(2) + ', Median=' + yMedian.toFixed(2) + ', StdDev=' + stdDev.toFixed(2)
          + ', Pearson r=' + pearsonR.toFixed(3) + ', Spearman r=' + spearmanR.toFixed(3) + '. '
          + (outliers.length > 0 ? outliers.length + ' outliers. ' : '');
        var prompt = 'You are an AI data analyst in a kids\' educational data plotter. ' + desc +
          ' Give 3 SHORT insights about this data. Include a real-world connection. Use emoji. Ages 8-14. Return JSON: {"insights":["...","...","..."],"funFact":"..."}';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          try {
            var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g,'').replace(/```/g,'').trim()) : resp;
            var text = '';
            if (parsed.insights) parsed.insights.forEach(function(ins,i) { text += (i > 0 ? '\n' : '') + ins; });
            if (parsed.funFact) text += '\n\n\uD83D\uDCCA ' + parsed.funFact;
            updMulti({ aiInsight: text, aiLoading: false });
          } catch(e) { updMulti({ aiInsight: typeof resp === 'string' ? resp : 'Try adding more data!', aiLoading: false }); }
        }).catch(function() { updMulti({ aiInsight: '\u26A0\uFE0F Could not reach AI. Try again!', aiLoading: false }); });
        checkBadges({ aiUsed: true });
      };

      // SVG click handler
      var handleSvgClick = function(e) {
        if (chartType !== 'scatter' && chartType !== 'line') return;
        if (stepMode) return;
        var svg = e.currentTarget;
        var rect = svg.getBoundingClientRect();
        var sx = (e.clientX - rect.left) / rect.width * W;
        var sy = (e.clientY - rect.top) / rect.height * H;
        var x = Math.round((xMin + (sx - pad) / (W - 2 * pad) * (xMax - xMin)) * 10) / 10;
        var y = Math.round((yMin + ((H - pad - sy) / (H - 2 * pad)) * (yMax - yMin)) * 10) / 10;
        addPoint(x, y);
      };
      var switchChart = function(type) {
        var viewed = Object.assign({}, chartsViewed);
        viewed[type] = true;
        updMulti({ chartType: type, chartsViewed: viewed });
        checkBadges({ chartsViewed: viewed });
      };

      // ── Data Transformations ──
      var transformData = function(type) {
        if (points.length === 0) return;
        var newUndo = pushUndo();
        var transformed;
        if (type === 'normalize') {
          transformed = points.map(function(p) { return { x: p.x, y: yRange > 0 ? Math.round((p.y - yMin_) / yRange * 100 * 100) / 100 : 0 }; });
        } else if (type === 'standardize') {
          transformed = points.map(function(p) { return { x: p.x, y: stdDev > 0 ? Math.round((p.y - meanY) / stdDev * 100) / 100 : 0 }; });
        } else if (type === 'log') {
          transformed = points.filter(function(p) { return p.y > 0; }).map(function(p) { return { x: p.x, y: Math.round(Math.log(p.y) * 100) / 100 }; });
        } else if (type === 'noise') {
          var nl = stdDev > 0 ? stdDev * 0.2 : yRange * 0.1 || 1;
          transformed = points.map(function(p) { return { x: p.x, y: Math.round((p.y + (Math.random() * 2 - 1) * nl) * 100) / 100 }; });
        } else if (type === 'sort') {
          transformed = points.slice().sort(function(a, b) { return a.x - b.x; });
        } else if (type === 'flipXY') {
          transformed = points.map(function(p) { return { x: p.y, y: p.x }; });
        }
        if (transformed) {
          updMulti({ points: transformed, undoStack: newUndo });
          if (addToast) addToast('\uD83D\uDD04 ' + type.charAt(0).toUpperCase() + type.slice(1) + ' applied!', 'success');
          if (soundEnabled) sfxTransform();
          checkBadges({ transformed: true });
        }
      };

      // ── Random Data Generator ──
      var generateRandom = function(targetR) {
        var pts = generateCorrelated(targetR, 20);
        var newUndo = pushUndo();
        updMulti({ points: pts, undoStack: newUndo, xLabel: 'X', yLabel: 'Y' });
        if (addToast) addToast('\uD83C\uDFB2 Generated r\u2248' + targetR.toFixed(1), 'success');
      };

      // ── Step-Through Mode ──
      var startStepThrough = function() {
        if (points.length < 2) return;
        updMulti({ stepMode: true, stepIdx: 1 });
        if (soundEnabled) sfxStep();
      };
      var stepNext = function() {
        if (stepIdx >= points.length) {
          updMulti({ stepMode: false });
          checkBadges({ stepComplete: true });
          if (addToast) addToast('\u2705 Step-through complete!', 'success');
          return;
        }
        upd('stepIdx', stepIdx + 1);
        if (soundEnabled) sfxStep();
      };
      var stopStep = function() { updMulti({ stepMode: false, stepIdx: 0 }); };

      // ══════════════════════════════════════════════════════════════
      // ── Quiz System (4 types) ──
      // ══════════════════════════════════════════════════════════════
      var makeQuiz = function() {
        var used = Object.assign({}, quizTypesUsed);
        used[quizType] = true;
        if (quizType === 'correlation') {
          var s = correlationScenarios[Math.floor(Math.random() * correlationScenarios.length)];
          var pts = s.gen();
          updMulti({ dpQuiz: { type: 'correlation', text: s.q, answer: s.a, pts: pts, opts: ['Positive', 'Negative', 'None'].sort(function() { return Math.random() - 0.5; }), answered: false }, points: pts, quizTypesUsed: used });
        } else if (quizType === 'guessR2') {
          var sc = guessR2Scenarios[Math.floor(Math.random() * guessR2Scenarios.length)];
          var pts2 = generateCorrelated(sc.r, 15);
          var n2 = pts2.length, gsx = 0, gsy = 0, gsxy = 0, gsxx = 0;
          pts2.forEach(function(p) { gsx += p.x; gsy += p.y; gsxy += p.x*p.y; gsxx += p.x*p.x; });
          var gsl = (n2*gsxy - gsx*gsy) / (n2*gsxx - gsx*gsx || 1);
          var gint = (gsy - gsl*gsx) / n2;
          var gmy = gsy / n2;
          var gsst = pts2.reduce(function(s,p) { return s + (p.y-gmy)*(p.y-gmy); }, 0);
          var gssr = pts2.reduce(function(s,p) { return s + Math.pow(p.y-(gsl*p.x+gint),2); }, 0);
          var actualR2 = gsst > 0 ? Math.round((1 - gssr/gsst)*100)/100 : 0;
          var opts2 = [actualR2];
          while (opts2.length < 4) {
            var fake = Math.round(Math.random() * 100) / 100;
            if (opts2.indexOf(fake) === -1 && Math.abs(fake - actualR2) > 0.1) opts2.push(fake);
          }
          opts2.sort(function() { return Math.random() - 0.5; });
          updMulti({ dpQuiz: { type: 'guessR2', text: 'Estimate the R\u00B2 for this scatter plot', answer: actualR2.toFixed(2), pts: pts2, opts: opts2.map(function(o) { return o.toFixed(2); }), answered: false }, points: pts2, quizTypesUsed: used });
        } else if (quizType === 'matchChart') {
          var mc = matchChartScenarios[Math.floor(Math.random() * matchChartScenarios.length)];
          updMulti({ dpQuiz: { type: 'matchChart', text: mc.q, answer: mc.a, opts: mc.opts.slice().sort(function() { return Math.random() - 0.5; }), answered: false }, quizTypesUsed: used });
        } else if (quizType === 'outlier') {
          var os = outlierScenarios[Math.floor(Math.random() * outlierScenarios.length)];
          var result = os.gen();
          updMulti({ dpQuiz: { type: 'outlier', text: 'Which point is the outlier in ' + os.label + '?', answer: result.outlierIdx, pts: result.pts, answered: false }, points: result.pts, quizTypesUsed: used });
        }
        checkBadges({ quizTypesUsed: used });
      };
      var answerQuiz = function(opt) {
        if (!dpQuiz || dpQuiz.answered) return;
        var correct = dpQuiz.type === 'outlier' ? parseInt(opt) === dpQuiz.answer : opt === dpQuiz.answer;
        var newScore = dpScore + (correct ? 1 : 0);
        var newStreak = correct ? dpStreak + 1 : 0;
        updMulti({ dpQuiz: Object.assign({}, dpQuiz, { answered: true, chosen: opt }), dpScore: newScore, dpStreak: newStreak });
        if (correct) {
          if (addToast) addToast('\u2705 Correct!', 'success');
          if (awardXP) awardXP('dataPlot', 10, 'Data Quiz');
          if (soundEnabled) sfxCorrect();
          checkBadges({ dpScore: newScore, dpStreak: newStreak });
        } else {
          var ans = dpQuiz.type === 'outlier' ? 'Point #' + (dpQuiz.answer + 1) : dpQuiz.answer;
          if (addToast) addToast('\u274C Answer: ' + ans, 'error');
          if (soundEnabled) sfxWrong();
        }
      };

      // ── Keyboard Handler ──
      var handleKey = function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); doUndo(); }
        else if (e.key === 'g') upd('showGrid', !showGrid);
        else if (e.key === 'l') upd('showLabels', !showLabels);
        else if (e.key === 'r') upd('showResiduals', !showResiduals);
        else if (e.key === 'o') upd('showOutliers', !showOutliers);
        else if (e.key === 'c') upd('showCI', !showCI);
        else if (e.key === 'Delete' && points.length > 0) removePoint(points.length - 1);
        else if (e.key === 'ArrowRight' && stepMode) stepNext();
      };

      // ── Tab button helper ──
      var tabBtn = function(id, label, icon) {
        var active = activeTab === id;
        return h('button', { 'aria-label': 'Change active tab', onClick: function() { upd('activeTab', id); }, role: 'tab', 'aria-selected': active, className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (active ? 'bg-teal-700 text-white shadow-md' : 'bg-white text-teal-700 hover:bg-teal-50 border border-teal-200') }, icon + ' ' + label);
      };

      // Regression line/curve path
      var regPath = function() {
        if (n < 2) return null;
        if (regressionType === 'linear') {
          return h('line', { x1: toSX(xMin), y1: toSY(slope*xMin+intercept), x2: toSX(xMax), y2: toSY(slope*xMax+intercept), stroke: pal.line, strokeWidth: 2, strokeDasharray: '6 3' });
        }
        var cpts = [];
        for (var si = 0; si <= 50; si++) {
          var cx_ = xMin + (xMax - xMin) * si / 50;
          var cy_ = predictY(cx_);
          cpts.push((si === 0 ? 'M' : 'L') + toSX(cx_).toFixed(1) + ',' + toSY(cy_).toFixed(1));
        }
        return h('path', { d: cpts.join(' '), fill: 'none', stroke: pal.line, strokeWidth: 2, strokeDasharray: '6 3' });
      };

      // Confidence interval band
      var ciPath = function() {
        if (!showCI || n < 3 || regressionType !== 'linear' || seRegression === 0) return null;
        var upper = [], lower = [];
        for (var ci = 0; ci <= 30; ci++) {
          var cx = xMin + (xMax - xMin) * ci / 30;
          var yPred = slope * cx + intercept;
          var sePred = seRegression * Math.sqrt(1/n + (cx - meanX)*(cx - meanX) / (sxDevSq || 1));
          var margin = tValue * sePred;
          upper.push((ci === 0 ? 'M' : 'L') + toSX(cx).toFixed(1) + ',' + toSY(yPred + margin).toFixed(1));
          lower.unshift('L' + toSX(cx).toFixed(1) + ',' + toSY(yPred - margin).toFixed(1));
        }
        return h('path', { d: upper.join(' ') + ' ' + lower.join(' ') + ' Z', fill: pal.line, fillOpacity: 0.1, stroke: pal.line, strokeWidth: 0.5, strokeDasharray: '3 3', strokeOpacity: 0.4 });
      };

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      return h('div', { className: 'max-w-4xl mx-auto animate-in fade-in duration-200 space-y-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1', tabIndex: 0, onKeyDown: handleKey },

        // ── Header ──
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 flex-wrap' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg', 'aria-label': 'Back' }, h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-slate-800' }, '\uD83D\uDCCA Data Plotter'),
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-500' }, n + ' pts' + (stepMode ? ' (' + stepIdx + '/' + points.length + ')' : '')),
          n >= 2 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold ' + (Math.abs(regR2) > 0.8 ? 'text-emerald-600' : Math.abs(regR2) > 0.5 ? 'text-yellow-600' : 'text-red-500') }, 'R\u00B2=' + regR2.toFixed(3)),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-auto flex gap-1.5' },
            h('button', { 'aria-label': 'Select option', onClick: function() { upd('showBadges', !showBadges); }, className: 'text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (showBadges ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500') }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + badgeDefs.length),
            h('button', { 'aria-label': 'Select option', onClick: function() { upd('showShortcuts', !showShortcuts); }, className: 'text-[10px] font-bold px-2 py-0.5 rounded-full border ' + (showShortcuts ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-slate-100 border-slate-200 text-slate-500') }, '\u2328\uFE0F'),
            h('button', { 'aria-label': 'Select option', onClick: function() { upd('soundEnabled', !soundEnabled); }, className: 'text-sm px-1' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
            h('button', { 'aria-label': 'Set Tool Snapshots', onClick: function() { setToolSnapshots(function(prev) { return prev.concat([{ id: 'dp-' + Date.now(), tool: 'dataPlot', label: n + ' pts r\u00B2=' + regR2.toFixed(2), data: { points: points.slice() }, timestamp: Date.now() }]); }); if (addToast) addToast('\uD83D\uDCF8 Snapshot!', 'success'); }, className: 'text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5' }, '\uD83D\uDCF8')
          )
        ),

        // ── Keyboard Shortcuts Panel ──
        showShortcuts && h('div', { className: 'bg-sky-50 rounded-xl p-3 border border-sky-200' },
          h('div', { className: 'text-xs font-bold text-sky-700 uppercase mb-2' }, '\u2328\uFE0F Keyboard Shortcuts'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-1.5' },
            [
              { key: 'Ctrl+Z', desc: 'Undo' }, { key: 'Delete', desc: 'Remove last' },
              { key: 'G', desc: 'Toggle grid' }, { key: 'L', desc: 'Toggle labels' },
              { key: 'R', desc: 'Toggle residuals' }, { key: 'O', desc: 'Toggle outliers' },
              { key: 'C', desc: 'Toggle CI band' }, { key: '\u2192', desc: 'Step next' }
            ].map(function(s) {
              return h('div', { key: s.key, className: 'flex items-center gap-2' },
                h('kbd', { className: 'text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-sky-200 text-sky-700' }, s.key),
                h('span', { className: 'text-[10px] text-sky-600' }, s.desc)
              );
            })
          )
        ),

        // ── Badges drawer ──
        showBadges && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, '\uD83C\uDFC5 Badges'),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            badgeDefs.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: badge.id, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (earned ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-slate-400 opacity-40') },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-base', style: earned ? {} : { filter: 'grayscale(1)' } }, badge.icon),
                h('div', null,
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold ' + (earned ? 'text-amber-800' : 'text-slate-500') }, badge.name),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[8px] ' + (earned ? 'text-amber-600' : 'text-slate-500') }, badge.desc)
                )
              );
            })
          )
        ),

        // ── Step-through banner ──
        stepMode && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-violet-50 rounded-xl p-3 border border-violet-200 flex items-center gap-3' },
          h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-violet-700' }, '\uD83D\uDC63 Step-Through Mode: ' + stepIdx + '/' + points.length),
          h('button', { 'aria-label': 'Stop', onClick: stepNext, className: 'px-3 py-1 bg-violet-600 text-white font-bold rounded-lg text-xs hover:bg-violet-700' }, stepIdx >= points.length ? '\u2705 Done' : '\u27A1 Next Point'),
          h('button', { 'aria-label': 'Stop', onClick: stopStep, className: 'px-3 py-1 bg-white text-violet-600 font-bold rounded-lg text-xs border border-violet-200' }, '\u2716 Stop'),
          n >= 2 && h('span', { className: 'text-[10px] text-violet-500 ml-auto' }, 'R\u00B2=' + regR2.toFixed(3) + ' | Mean=' + meanY.toFixed(1)),
          h('span', { className: 'text-[10px] text-violet-400' }, '(or press \u2192)')
        ),

        // ── Tab nav ──
        h('div', { className: 'flex gap-2 flex-wrap', role: 'tablist', 'aria-label': 'Data Plot sections' },
          tabBtn('chart', 'Chart', '\uD83D\uDCCA'),
          tabBtn('stats', 'Statistics', '\uD83D\uDCC8'),
          tabBtn('quiz', 'Quiz', '\uD83C\uDFAF'),
          tabBtn('tools', 'Tools', '\uD83D\uDEE0\uFE0F')
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Chart ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'chart' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-2' },

          // Chart type selector (7 types now)
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1.5 flex-wrap' },
            [
              { id: 'scatter', icon: '\u2022', label: 'Scatter' },
              { id: 'line', icon: '\uD83D\uDCC8', label: 'Line' },
              { id: 'bar', icon: '\uD83D\uDCCA', label: 'Bar' },
              { id: 'pie', icon: '\uD83E\uDD67', label: 'Pie' },
              { id: 'histogram', icon: '\uD83D\uDCF6', label: 'Histogram' },
              { id: 'boxplot', icon: '\uD83D\uDCE6', label: 'Box Plot' },
              { id: 'ogive', icon: '\uD83D\uDCC9', label: 'Ogive' }
            ].map(function(ct) {
              return h('button', { 'aria-label': 'Switch Chart', key: ct.id, onClick: function() { switchChart(ct.id); },
                className: 'px-2 py-1 rounded-lg text-[10px] font-bold transition-all ' + (chartType === ct.id ? 'bg-teal-700 text-white shadow' : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100')
              }, ct.icon + ' ' + ct.label);
            }),
            h('select', { value: paletteId, onChange: function(e) { upd('paletteId', e.target.value); }, 'aria-label': 'Color palette', className: 'ml-auto text-[10px] px-2 py-1 rounded-lg border border-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' },
              palettes.map(function(p) { return h('option', { key: p.id, value: p.id }, '\uD83C\uDFA8 ' + p.name); })
            )
          ),

          // Datasets
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1.5 flex-wrap' },
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-slate-500 self-center' }, 'Datasets:'),
            datasetLibrary.map(function(ds) {
              return h('button', { 'aria-label': 'Load Dataset', key: ds.label, onClick: function() { loadDataset(ds); }, className: 'px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all' }, ds.label);
            })
          ),

          // Axis labels
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
            h('input', { type: 'text', value: xLabel, onChange: function(e) { upd('xLabel', e.target.value); }, placeholder: 'X-axis label', 'aria-label': 'X-axis label', className: 'flex-1 px-2 py-1 text-xs border border-teal-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400' }),
            h('input', { type: 'text', value: yLabel, onChange: function(e) { upd('yLabel', e.target.value); }, placeholder: 'Y-axis label', 'aria-label': 'Y-axis label', className: 'flex-1 px-2 py-1 text-xs border border-teal-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-400' })
          ),

          // ── SVG Chart (scatter / line / bar) ──
          (chartType === 'scatter' || chartType === 'line' || chartType === 'bar') && h('svg', {
            viewBox: '0 0 ' + W + ' ' + H, className: 'w-full bg-white rounded-xl border border-teal-200 cursor-crosshair', style: { maxHeight: '340px' },
            'data-dataplot-svg': true, onClick: handleSvgClick
          },
            // Grid
            showGrid && (function() {
              var elems = []; var nt = 5;
              for (var gi = 0; gi <= nt; gi++) {
                var gx = xMin + gi * (xMax - xMin) / nt;
                var gy = yMin + gi * (yMax - yMin) / nt;
                elems.push(h('line', { key: 'gv'+gi, x1: toSX(gx), y1: pad, x2: toSX(gx), y2: H-pad, stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '3 3' }));
                elems.push(h('line', { key: 'gh'+gi, x1: pad, y1: toSY(gy), x2: W-pad, y2: toSY(gy), stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '3 3' }));
                elems.push(h('text', { key: 'xt'+gi, x: toSX(gx), y: H-pad+14, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '11px' } }, (Math.round(gx*10)/10).toString()));
                elems.push(h('text', { key: 'yt'+gi, x: pad-5, y: toSY(gy)+3, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '11px' } }, (Math.round(gy*10)/10).toString()));
              }
              return elems;
            })(),
            // Axes
            h('line', { x1: pad, y1: H-pad, x2: W-pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            h('line', { x1: pad, y1: pad, x2: pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            xLabel && h('text', { x: W/2, y: H-3, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '11px', fontWeight: 'bold' } }, xLabel),
            yLabel && h('text', { x: 12, y: H/2, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '11px', fontWeight: 'bold' }, transform: 'rotate(-90,12,' + (H/2) + ')' }, yLabel),
            // CI band (behind everything)
            ciPath(),
            // Residuals
            showResiduals && n >= 2 && visiblePoints.map(function(p, i) {
              var predYv = predictY(p.x);
              return h('line', { key: 'r'+i, x1: toSX(p.x), y1: toSY(p.y), x2: toSX(p.x), y2: toSY(predYv), stroke: '#a855f7', strokeWidth: 1.5, strokeDasharray: '2 2' });
            }),
            // Bar chart
            chartType === 'bar' && visiblePoints.map(function(p, i) {
              var barW = Math.max(4, (W - 2*pad) / Math.max(n, 1) * 0.7);
              return h('rect', { key: 'bar'+i, x: toSX(p.x) - barW/2, y: toSY(p.y), width: barW, height: Math.max(1, (H-pad) - toSY(p.y)), fill: pal.fill, fillOpacity: 0.8, rx: 2, stroke: pal.stroke, strokeWidth: 0.5 });
            }),
            // Line connector
            chartType === 'line' && n >= 2 && (function() {
              var sorted = visiblePoints.slice().sort(function(a,b) { return a.x - b.x; });
              var ld = sorted.map(function(p, i) { return (i===0?'M':'L') + toSX(p.x).toFixed(1) + ',' + toSY(p.y).toFixed(1); }).join(' ');
              return h('path', { d: ld, fill: 'none', stroke: pal.fill, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' });
            })(),
            // Data points
            (chartType === 'scatter' || chartType === 'line') && visiblePoints.map(function(p, i) {
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

          // ── Residual Plot (mini SVG) ──
          showResidualPlot && n >= 2 && (chartType === 'scatter' || chartType === 'line' || chartType === 'bar') && (function() {
            var rH = 140;
            var residuals = visiblePoints.map(function(p) { return { x: p.x, r: p.y - predictY(p.x) }; });
            var maxR = Math.max.apply(null, residuals.map(function(r) { return Math.abs(r.r); }).concat([1]));
            var rToSY = function(r) { return rH/2 + 10 - (r / maxR) * (rH/2 - 15); };
            return h('div', { className: 'space-y-1' },
              h('div', { className: 'text-[10px] font-bold text-violet-600 uppercase' }, '\uD83D\uDCC9 Residual Plot'),
              h('svg', { viewBox: '0 0 ' + W + ' ' + rH, className: 'w-full bg-white rounded-lg border border-violet-200', style: { maxHeight: '140px' } },
                // Zero line
                h('line', { x1: pad, y1: rH/2+10, x2: W-pad, y2: rH/2+10, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }),
                h('text', { x: pad-5, y: rH/2+13, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '8px' } }, '0'),
                h('text', { x: pad-5, y: 18, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '8px' } }, '+' + maxR.toFixed(0)),
                h('text', { x: pad-5, y: rH-2, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '8px' } }, '-' + maxR.toFixed(0)),
                // Residual points
                residuals.map(function(r, i) {
                  return h('circle', { key: 'rp'+i, cx: toSX(r.x), cy: rToSY(r.r), r: 4, fill: r.r > 0 ? '#22c55e' : '#ef4444', stroke: '#fff', strokeWidth: 1 });
                })
              )
            );
          })(),

          // ── Pie chart ──
          chartType === 'pie' && n > 0 && h('div', { className: 'bg-white rounded-xl border border-teal-200 p-4 flex justify-center' },
            h('svg', { viewBox: '0 0 300 300', width: 260, height: 260, 'data-dataplot-svg': true },
              (function() {
                var total = allY.reduce(function(s,v) { return s + Math.abs(v); }, 0) || 1;
                var cols = ['#0d9488','#3b82f6','#8b5cf6','#f43f5e','#f59e0b','#10b981','#6366f1','#ec4899','#14b8a6','#ef4444','#84cc16','#06b6d4'];
                var startAngle = 0;
                return visiblePoints.map(function(p, i) {
                  var pct = Math.abs(p.y) / total;
                  var angle = pct * 2 * Math.PI;
                  var x1 = 150 + 120 * Math.cos(startAngle), y1 = 150 + 120 * Math.sin(startAngle);
                  var x2 = 150 + 120 * Math.cos(startAngle + angle), y2 = 150 + 120 * Math.sin(startAngle + angle);
                  var large = angle > Math.PI ? 1 : 0;
                  var pd = 'M 150 150 L ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A 120 120 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z';
                  var midA = startAngle + angle/2;
                  var lx = 150 + 80 * Math.cos(midA), ly = 150 + 80 * Math.sin(midA);
                  startAngle += angle;
                  return h('g', { key: 'pie'+i },
                    h('path', { d: pd, fill: cols[i % cols.length], stroke: '#fff', strokeWidth: 2 }),
                    pct > 0.05 && h('text', { x: lx, y: ly+3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '10px', fontWeight: 'bold' } }, (pct*100).toFixed(0) + '%')
                  );
                });
              })()
            )
          ),

          // ── Histogram (with normal overlay + mean/median/mode lines) ──
          chartType === 'histogram' && n > 0 && h('svg', {
            viewBox: '0 0 ' + W + ' ' + H, className: 'w-full bg-white rounded-xl border border-teal-200', style: { maxHeight: '340px' }, 'data-dataplot-svg': true
          },
            h('line', { x1: pad, y1: H-pad, x2: W-pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            h('line', { x1: pad, y1: pad, x2: pad, y2: H-pad, stroke: '#64748b', strokeWidth: 1.5 }),
            // Histogram bars
            histBins.map(function(bin, i) {
              var barW = (W - 2*pad) / histBins.length - 2;
              var barX = pad + i * ((W - 2*pad) / histBins.length) + 1;
              var barH = maxBinCount > 0 ? (bin.count / maxBinCount) * (H - 2*pad) : 0;
              return h('g', { key: 'hb'+i },
                h('rect', { x: barX, y: H-pad-barH, width: barW, height: Math.max(1, barH), fill: pal.fill, fillOpacity: 0.8, rx: 2 }),
                h('text', { x: barX+barW/2, y: H-pad+12, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '8px' } }, bin.low.toFixed(0) + '-' + bin.high.toFixed(0)),
                h('text', { x: barX+barW/2, y: H-pad-barH-4, textAnchor: 'middle', fill: pal.fill, style: { fontSize: '11px', fontWeight: 'bold' } }, bin.count)
              );
            }),
            // Normal distribution overlay
            showNormalOverlay && stdDev > 0 && (function() {
              var maxPDF = normalPDF(meanY, meanY, stdDev);
              var normPts = [];
              for (var ni = 0; ni <= 50; ni++) {
                var nx = yMin_ + (yMax_ - yMin_) * ni / 50;
                var ny = normalPDF(nx, meanY, stdDev) / maxPDF * maxBinCount;
                var sx_ = pad + ((nx - yMin_) / (yRange || 1)) * (W - 2*pad);
                var sy_ = (H - pad) - (ny / maxBinCount) * (H - 2*pad);
                normPts.push((ni === 0 ? 'M' : 'L') + sx_.toFixed(1) + ',' + sy_.toFixed(1));
              }
              return h('path', { d: normPts.join(' '), fill: 'none', stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '4 2' });
            })(),
            // Mean / Median / Mode lines
            (function() {
              var lines = [];
              var toHX = function(v) { return pad + ((v - yMin_) / (yRange || 1)) * (W - 2*pad); };
              // Mean line
              lines.push(h('line', { key: 'mean-line', x1: toHX(meanY), y1: pad, x2: toHX(meanY), y2: H-pad, stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '5 3' }));
              lines.push(h('text', { key: 'mean-lbl', x: toHX(meanY), y: pad-4, textAnchor: 'middle', fill: '#ef4444', style: { fontSize: '8px', fontWeight: 'bold' } }, '\u03BC=' + meanY.toFixed(1)));
              // Median line
              lines.push(h('line', { key: 'med-line', x1: toHX(yMedian), y1: pad, x2: toHX(yMedian), y2: H-pad, stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '5 3' }));
              lines.push(h('text', { key: 'med-lbl', x: toHX(yMedian), y: pad-14, textAnchor: 'middle', fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, 'Med=' + yMedian.toFixed(1)));
              return lines;
            })(),
            yLabel && h('text', { x: W/2, y: H-2, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '10px', fontWeight: 'bold' } }, yLabel + ' (bins)')
          ),

          // ── Box plot ──
          chartType === 'boxplot' && n > 0 && h('svg', {
            viewBox: '0 0 ' + W + ' 160', className: 'w-full bg-white rounded-xl border border-teal-200', 'data-dataplot-svg': true
          },
            (function() {
              var bx = function(v) { return pad + ((v - yMin_) / (yRange || 1)) * (W - 2*pad); };
              return h('g', null,
                h('line', { x1: bx(yMin_), y1: 80, x2: bx(yMax_), y2: 80, stroke: '#64748b', strokeWidth: 1.5 }),
                h('line', { x1: bx(yMin_), y1: 60, x2: bx(yMin_), y2: 100, stroke: '#64748b', strokeWidth: 1.5 }),
                h('line', { x1: bx(yMax_), y1: 60, x2: bx(yMax_), y2: 100, stroke: '#64748b', strokeWidth: 1.5 }),
                h('rect', { x: bx(q1), y: 55, width: Math.max(2, bx(q3) - bx(q1)), height: 50, fill: pal.fill, fillOpacity: 0.3, stroke: pal.fill, strokeWidth: 2, rx: 4 }),
                h('line', { x1: bx(yMedian), y1: 55, x2: bx(yMedian), y2: 105, stroke: '#ef4444', strokeWidth: 2.5 }),
                h('text', { x: bx(yMin_), y: 50, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '11px' } }, 'Min: ' + yMin_.toFixed(1)),
                h('text', { x: bx(q1), y: 50, textAnchor: 'middle', fill: pal.fill, style: { fontSize: '11px', fontWeight: 'bold' } }, 'Q1: ' + q1.toFixed(1)),
                h('text', { x: bx(yMedian), y: 120, textAnchor: 'middle', fill: '#ef4444', style: { fontSize: '11px', fontWeight: 'bold' } }, 'Med: ' + yMedian.toFixed(1)),
                h('text', { x: bx(q3), y: 50, textAnchor: 'middle', fill: pal.fill, style: { fontSize: '11px', fontWeight: 'bold' } }, 'Q3: ' + q3.toFixed(1)),
                h('text', { x: bx(yMax_), y: 50, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '11px' } }, 'Max: ' + yMax_.toFixed(1)),
                outliers.map(function(o, i) { return h('circle', { key: 'out'+i, cx: bx(o.y), cy: 80, r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 1 }); }),
                h('text', { x: bx((q1+q3)/2), y: 145, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '11px' } }, 'IQR: ' + iqr.toFixed(1))
              );
            })()
          ),

          // ── Ogive (Cumulative Frequency) ──
          chartType === 'ogive' && n > 0 && cumulativeFreq.length > 0 && (function() {
            var oH = 280;
            var oMin = cumulativeFreq[0].x, oMax = cumulativeFreq[cumulativeFreq.length-1].x;
            var oRange = oMax - oMin || 1;
            var oToX = function(v) { return pad + ((v - oMin) / oRange) * (W - 2*pad); };
            var oToY = function(v) { return (oH - pad) - (v / n) * (oH - 2*pad); };
            var pathD = cumulativeFreq.map(function(pt, i) { return (i === 0 ? 'M' : 'L') + oToX(pt.x).toFixed(1) + ',' + oToY(pt.y).toFixed(1); }).join(' ');
            return h('svg', { viewBox: '0 0 ' + W + ' ' + oH, className: 'w-full bg-white rounded-xl border border-teal-200', style: { maxHeight: '300px' }, 'data-dataplot-svg': true },
              // Grid
              [0, 25, 50, 75, 100].map(function(pct) {
                var gy = oToY(n * pct / 100);
                return h('g', { key: 'og'+pct },
                  h('line', { x1: pad, y1: gy, x2: W-pad, y2: gy, stroke: '#e2e8f0', strokeWidth: 0.5, strokeDasharray: '3 3' }),
                  h('text', { x: pad-5, y: gy+3, textAnchor: 'end', fill: '#94a3b8', style: { fontSize: '11px' } }, pct + '%')
                );
              }),
              h('line', { x1: pad, y1: oH-pad, x2: W-pad, y2: oH-pad, stroke: '#64748b', strokeWidth: 1.5 }),
              h('line', { x1: pad, y1: pad, x2: pad, y2: oH-pad, stroke: '#64748b', strokeWidth: 1.5 }),
              // Area fill
              h('path', { d: pathD + ' L' + oToX(oMax).toFixed(1) + ',' + (oH-pad) + ' L' + oToX(oMin).toFixed(1) + ',' + (oH-pad) + ' Z', fill: pal.fill, fillOpacity: 0.15 }),
              // Line
              h('path', { d: pathD, fill: 'none', stroke: pal.fill, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
              // Points with labels
              cumulativeFreq.map(function(pt, i) {
                return h('g', { key: 'op'+i },
                  h('circle', { cx: oToX(pt.x), cy: oToY(pt.y), r: 4, fill: pal.fill, stroke: '#fff', strokeWidth: 1.5 }),
                  h('text', { x: oToX(pt.x), y: oToY(pt.y)-8, textAnchor: 'middle', fill: '#64748b', style: { fontSize: '8px', fontWeight: 'bold' } }, pt.pct + '%')
                );
              }),
              h('text', { x: W/2, y: oH-3, textAnchor: 'middle', fill: '#0d9488', style: { fontSize: '10px', fontWeight: 'bold' } }, (yLabel || 'Y') + ' (cumulative)')
            );
          })(),

          // ── Controls row ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 flex-wrap items-center' },
            h('button', { 'aria-label': 'Undo', onClick: doUndo, disabled: !undoStack.length, className: 'px-3 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-sm disabled:opacity-40' }, '\u21A9 Undo'),
            h('button', { 'aria-label': 'Clear', onClick: clearAll, disabled: !points.length, className: 'px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm disabled:opacity-40' }, '\uD83D\uDDD1\uFE0F Clear'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-violet-600 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showResiduals, onChange: function() { upd('showResiduals', !showResiduals); }, className: 'accent-violet-600' }), 'Residuals'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-teal-600 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showLabels, onChange: function() { upd('showLabels', !showLabels); }, className: 'accent-teal-600' }), 'Labels'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-sky-600 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showGrid, onChange: function() { upd('showGrid', !showGrid); }, className: 'accent-sky-600' }), 'Grid'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-red-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showOutliers, onChange: function() { upd('showOutliers', !showOutliers); if (!showOutliers && outliers.length > 0) checkBadges({}); }, className: 'accent-red-500' }), 'Outliers' + (outliers.length > 0 ? ' (' + outliers.length + ')' : '')),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-rose-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showCI, onChange: function() { upd('showCI', !showCI); }, className: 'accent-rose-500' }), '95% CI'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-violet-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showResidualPlot, onChange: function() { upd('showResidualPlot', !showResidualPlot); }, className: 'accent-violet-500' }), 'Resid Plot'),
            chartType === 'histogram' && h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-purple-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showNormalOverlay, onChange: function() { upd('showNormalOverlay', !showNormalOverlay); }, className: 'accent-purple-500' }), 'Normal Curve'),
            h('label', { className: 'flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer' },
              h('input', { type: 'checkbox', checked: tableMode, onChange: function() { upd('tableMode', !tableMode); }, className: 'accent-teal-600' }), 'Table'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'ml-auto flex gap-1.5' },
              h('button', { 'aria-label': 'CSV', onClick: exportCSV, disabled: !n, className: 'px-2 py-1 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg disabled:opacity-40' }, '\uD83D\uDCE5 CSV'),
              h('button', { 'aria-label': 'SVG', onClick: exportSVG, disabled: !n, className: 'px-2 py-1 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg disabled:opacity-40' }, '\uD83D\uDCD0 SVG'),
              h('button', { 'aria-label': 'Save', onClick: saveChart, disabled: !n, className: 'px-2 py-1 text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded-lg disabled:opacity-40' }, '\uD83D\uDCBE Save')
            )
          ),

          // ── Table input ──
          tableMode && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-slate-50 rounded-lg p-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 items-end mb-2' },
              h('div', null, h('label', { className: 'text-[10px] font-bold text-slate-500 block' }, 'X'), h('input', { type: 'number', step: '0.1', id: 'dp-x-input', className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono', placeholder: '0' })),
              h('div', null, h('label', { className: 'text-[10px] font-bold text-slate-500 block' }, 'Y'), h('input', { type: 'number', step: '0.1', id: 'dp-y-input', className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono', placeholder: '0' })),
              h('button', { 'aria-label': '+ Add', onClick: function() { var xi = document.getElementById('dp-x-input'), yi = document.getElementById('dp-y-input'); if (xi && yi && xi.value && yi.value) { addPoint(parseFloat(xi.value), parseFloat(yi.value)); xi.value = ''; yi.value = ''; } }, className: 'px-3 py-1 bg-teal-700 text-white font-bold rounded text-sm hover:bg-teal-700' }, '+ Add')
            ),
            n > 0 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'max-h-24 overflow-y-auto text-xs font-mono text-slate-500' },
              visiblePoints.map(function(p, i) { return h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: i, className: 'inline-block mr-2 bg-white px-1.5 py-0.5 rounded border mb-1 cursor-pointer hover:bg-red-50', onClick: function() { removePoint(i); } }, '(' + p.x + ',' + p.y + ')'); })
            )
          ),

          // ── Regression info (with Spearman + Pearson) ──
          n >= 2 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-lg border p-2' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 items-center mb-1.5 flex-wrap' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-slate-500' }, 'Regression:'),
              ['linear', 'quadratic', 'exponential', 'logarithmic'].map(function(rt) {
                return h('button', { 'aria-label': 'Pearson r / Spearman \u03C1', key: rt, onClick: function() { upd('regressionType', rt); },
                  className: 'px-2 py-0.5 rounded text-[10px] font-bold transition-all ' + (regressionType === rt ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                }, rt.charAt(0).toUpperCase() + rt.slice(1));
              })
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 flex-wrap' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-mono text-slate-700' }, regEq),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold ' + (Math.abs(regR2) > 0.8 ? 'text-emerald-600' : Math.abs(regR2) > 0.5 ? 'text-yellow-600' : 'text-red-500') }, 'R\u00B2 = ' + regR2.toFixed(4)),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-500' }, slope > 0 ? '\u2197 Positive' : slope < 0 ? '\u2198 Negative' : '\u2794 None'),
              n >= 3 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-indigo-500', title: 'Pearson r / Spearman \u03C1', onClick: function() { checkBadges({ spearmanViewed: true }); } }, 'r=' + pearsonR.toFixed(3) + ' | \u03C1=' + spearmanR.toFixed(3))
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

          // ── Gallery ──
          showGallery && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-slate-50 rounded-xl p-3 border border-slate-400' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDCBE Saved Charts'),
            galleryItems.length === 0
              ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-500 text-center py-2' }, 'No saved charts yet')
              : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-1.5' }, galleryItems.map(function(item) {
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: item.id, className: 'flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-400' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-slate-700' }, item.n + ' pts'),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-500' }, 'R\u00B2=' + (item.r2||0).toFixed(3)),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-slate-500 ml-auto' }, new Date(item.timestamp).toLocaleDateString()),
                    h('button', { 'aria-label': 'Load', onClick: function() { loadChart(item); }, className: 'px-2 py-0.5 text-[10px] font-bold bg-teal-50 text-teal-600 rounded hover:bg-teal-100' }, 'Load'),
                    h('button', { 'aria-label': 'Remove item', onClick: function() { deleteChart(item.id); }, className: 'px-2 py-0.5 text-[10px] font-bold text-red-400 hover:text-red-600' }, '\u2715')
                  );
                }))
          ),
          h('button', { 'aria-label': 'Add data points to see statistics', onClick: function() { upd('showGallery', !showGallery); }, className: 'text-[10px] font-bold text-slate-500 hover:text-teal-600' }, showGallery ? '\u25B2 Hide Gallery' : '\u25BC Show Gallery (' + galleryItems.length + ')')
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Statistics ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'stats' && h('div', { className: 'space-y-3' },
          n === 0
            ? h('div', { className: 'text-center text-sm text-slate-400 py-8' }, 'Add data points to see statistics')
            : h('div', { className: 'space-y-3' },

              // Summary stats grid (expanded)
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
                  { label: 'Pearson r', value: pearsonR.toFixed(4), icon: '\uD83D\uDD17' },
                  { label: 'Spearman \u03C1', value: spearmanR.toFixed(4), icon: '\uD83C\uDFC5' }
                ].map(function(stat) {
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: stat.label, className: 'p-2 bg-white rounded-lg border border-teal-100 text-center', onClick: stat.label === 'Spearman \u03C1' ? function() { checkBadges({ spearmanViewed: true }); } : undefined },
                    h('div', { className: 'text-[11px] font-bold text-teal-600 uppercase' }, stat.icon + ' ' + stat.label),
                    h('div', { className: 'text-sm font-bold text-teal-900' }, stat.value)
                  );
                })
              ),

              // Correlation explainer
              n >= 3 && h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
                h('div', { className: 'text-xs font-bold text-indigo-700 uppercase mb-1' }, '\uD83D\uDD17 Pearson vs Spearman'),
                h('div', { className: 'text-[10px] text-indigo-600 leading-relaxed' },
                  'Pearson r (' + pearsonR.toFixed(3) + ') measures linear correlation. Spearman \u03C1 (' + spearmanR.toFixed(3) + ') measures monotonic (rank-based) correlation. '
                  + (Math.abs(spearmanR) > Math.abs(pearsonR) + 0.1 ? 'Spearman is higher \u2014 your data may have a non-linear but monotonic trend!' : Math.abs(pearsonR) > Math.abs(spearmanR) + 0.1 ? 'Pearson is higher \u2014 the linear relationship is stronger than the rank relationship.' : 'Both are similar \u2014 the relationship is approximately linear.')
                )
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
              ),

              // Z-Score Calculator
              h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-200' },
                h('div', { className: 'text-xs font-bold text-cyan-700 uppercase mb-2' }, '\uD83D\uDCD0 Z-Score Calculator'),
                stdDev === 0
                  ? h('div', { className: 'text-xs text-slate-500' }, 'Need variation in Y values')
                  : h('div', { className: 'space-y-2' },
                    h('div', { className: 'flex gap-2 items-center' },
                      h('span', { className: 'text-xs font-bold text-cyan-600' }, 'Y value:'),
                      h('input', { type: 'number', step: '0.1', value: zScoreInput, onChange: function(e) { upd('zScoreInput', e.target.value); checkBadges({ zScoreUsed: true }); }, placeholder: meanY.toFixed(1), 'aria-label': 'Y value for z-score calculation', className: 'w-24 px-2 py-1.5 border-2 border-cyan-200 rounded-lg text-sm font-bold text-cyan-800 text-center outline-none focus:border-cyan-400' }),
                      zScoreInput !== '' && !isNaN(parseFloat(zScoreInput)) && (function() {
                        var zVal = (parseFloat(zScoreInput) - meanY) / stdDev;
                        var pct = zToPercentile(zVal);
                        return h('div', { className: 'flex gap-3 items-center' },
                          h('div', { className: 'px-3 py-1.5 rounded-lg text-sm font-bold text-center ' + (Math.abs(zVal) > 2 ? 'bg-red-50 text-red-700 border border-red-200' : Math.abs(zVal) > 1 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200') }, 'z = ' + zVal.toFixed(3)),
                          h('div', { className: 'px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-sm font-bold text-cyan-800' }, pct.toFixed(1) + 'th percentile'),
                          Math.abs(zVal) > 2 && h('span', { className: 'text-[10px] text-red-500 font-bold' }, '\u26A0\uFE0F Unusual!')
                        );
                      })()
                    ),
                    h('div', { className: 'text-[10px] text-cyan-500' }, 'z = (value \u2212 mean) / std dev = (value \u2212 ' + meanY.toFixed(2) + ') / ' + stdDev.toFixed(2)),
                    // Mini visual
                    h('div', { className: 'flex items-center gap-1 mt-1' },
                      h('span', { className: 'text-[11px] text-slate-500' }, '-3\u03C3'),
                      h('div', { className: 'flex-1 h-4 bg-slate-100 rounded-full relative overflow-hidden' },
                        h('div', { style: { position: 'absolute', left: '2.3%', width: '13.5%', height: '100%', backgroundColor: '#fee2e2' } }),
                        h('div', { style: { position: 'absolute', left: '15.8%', width: '34.2%', height: '100%', backgroundColor: '#dcfce7' } }),
                        h('div', { style: { position: 'absolute', left: '50%', width: '34.2%', height: '100%', backgroundColor: '#dcfce7' } }),
                        h('div', { style: { position: 'absolute', left: '84.2%', width: '13.5%', height: '100%', backgroundColor: '#fee2e2' } }),
                        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { position: 'absolute', left: '50%', top: 0, width: '2px', height: '100%', backgroundColor: '#64748b' } }),
                        zScoreInput !== '' && !isNaN(parseFloat(zScoreInput)) && (function() {
                          var zv2 = (parseFloat(zScoreInput) - meanY) / stdDev;
                          var pct2 = Math.max(0, Math.min(100, (zv2 + 3) / 6 * 100));
                          return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { position: 'absolute', left: pct2 + '%', top: 0, width: '3px', height: '100%', backgroundColor: '#0d9488', borderRadius: '2px' } });
                        })()
                      ),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] text-slate-500' }, '+3\u03C3')
                    )
                  )
              ),

              // Stem-and-Leaf Display
              h('div', null,
                h('button', { 'aria-label': 'Stem', onClick: function() { upd('showStemLeaf', !showStemLeaf); }, className: 'text-[10px] font-bold ' + (showStemLeaf ? 'text-teal-600' : 'text-slate-500') + ' hover:text-teal-600' }, (showStemLeaf ? '\u25B2' : '\u25BC') + ' \uD83C\uDF3F Stem-and-Leaf Plot'),
                showStemLeaf && stemLeafData.length > 0 && h('div', { className: 'bg-white rounded-xl p-3 border border-teal-200 mt-1.5 font-mono text-sm' },
                  h('div', { className: 'flex gap-1 mb-2' },
                    h('span', { className: 'text-[10px] font-bold text-teal-600 font-sans' }, 'Stem'),
                    h('span', { className: 'text-[10px] text-slate-500 font-sans' }, '|'),
                    h('span', { className: 'text-[10px] font-bold text-teal-600 font-sans' }, 'Leaf')
                  ),
                  stemLeafData.map(function(row) {
                    return h('div', { key: row.stem, className: 'flex gap-1 items-center py-0.5' },
                      h('span', { className: 'text-right w-8 font-bold text-teal-700' }, row.stem),
                      h('span', { className: 'text-slate-400' }, '|'),
                      h('span', { className: 'text-slate-600 tracking-wider' }, row.leaves.join(' '))
                    );
                  }),
                  h('div', { className: 'text-[11px] text-slate-500 font-sans mt-2' }, 'Key: stem|leaf = stem\u00D710 + leaf (e.g. 7|3 = 73)')
                )
              )
            )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Quiz (4 types) ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'quiz' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-3' },
          // Quiz type selector
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 flex-wrap items-center' },
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-slate-500' }, 'Type:'),
            [
              { id: 'correlation', icon: '\uD83D\uDCC8', label: 'Correlation' },
              { id: 'guessR2', icon: '\uD83C\uDFAF', label: 'Guess R\u00B2' },
              { id: 'matchChart', icon: '\uD83D\uDCCA', label: 'Match Chart' },
              { id: 'outlier', icon: '\uD83D\uDD0D', label: 'Find Outlier' }
            ].map(function(qt) {
              var active = quizType === qt.id;
              var used = !!quizTypesUsed[qt.id];
              return h('button', { 'aria-label': 'Make Quiz', key: qt.id, onClick: function() { upd('quizType', qt.id); },
                className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ' + (active ? 'bg-teal-700 text-white shadow' : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50') + (used ? '' : '')
              }, qt.icon + ' ' + qt.label + (used ? ' \u2713' : ''));
            }),
            dpScore > 0 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-emerald-600 ml-auto' }, '\u2B50 ' + dpScore),
            dpStreak > 1 && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-orange-500' }, '\uD83D\uDD25 ' + dpStreak)
          ),

          h('button', { 'aria-label': 'Make Quiz', onClick: makeQuiz, className: 'px-4 py-2 rounded-lg text-sm font-bold ' + (dpQuiz ? 'bg-teal-100 text-teal-700' : 'bg-teal-700 text-white') + ' hover:opacity-90 transition-all' },
            dpQuiz ? '\uD83D\uDD04 New Question' : '\uD83C\uDFAF Start Quiz'
          ),

          // ── Quiz question display ──
          dpQuiz && !dpQuiz.answered && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-teal-50 rounded-xl p-4 border border-teal-200' },
            h('p', { className: 'text-sm font-bold text-teal-800 mb-3' },
              dpQuiz.type === 'correlation' ? '\u201C' + dpQuiz.text + '\u201D \u2014 What correlation do you predict?'
              : dpQuiz.type === 'guessR2' ? dpQuiz.text
              : dpQuiz.type === 'matchChart' ? '\uD83D\uDCCA Best chart type for: ' + dpQuiz.text
              : dpQuiz.text
            ),
            // Options for correlation / guessR2 / matchChart
            dpQuiz.type !== 'outlier' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-3 flex-wrap' },
              dpQuiz.opts.map(function(opt) {
                return h('button', { 'aria-label': 'Select option', key: opt, onClick: function() { answerQuiz(opt); },
                  className: 'flex-1 min-w-[80px] px-4 py-2.5 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all cursor-pointer'
                }, opt);
              })
            ),
            // Outlier quiz: clickable points
            dpQuiz.type === 'outlier' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-5 gap-2' },
              dpQuiz.pts.map(function(p, i) {
                return h('button', { 'aria-label': '#', key: i, onClick: function() { answerQuiz(i.toString()); },
                  className: 'px-3 py-2 rounded-lg text-xs font-bold font-mono border-2 bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all'
                }, '#' + (i+1) + ': (' + p.x + ',' + p.y + ')');
              })
            )
          ),

          // ── Quiz answer feedback ──
          dpQuiz && dpQuiz.answered && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'p-3 rounded-xl text-sm font-bold ' + (dpQuiz.chosen === (dpQuiz.type === 'outlier' ? dpQuiz.answer.toString() : dpQuiz.answer) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },
            (function() {
              var isRight = dpQuiz.type === 'outlier' ? parseInt(dpQuiz.chosen) === dpQuiz.answer : dpQuiz.chosen === dpQuiz.answer;
              var ansText = dpQuiz.type === 'outlier' ? 'Point #' + (dpQuiz.answer + 1) : dpQuiz.answer;
              return isRight ? '\u2705 Correct! ' + ansText : '\u274C Answer: ' + ansText;
            })(),
            h('button', { 'aria-label': 'Next', onClick: makeQuiz, className: 'ml-3 text-xs font-bold underline' }, '\u27A1 Next')
          ),

          !dpQuiz && h('div', { className: 'text-center text-sm text-slate-400 py-4' }, 'Select a quiz type and click "Start Quiz"!')
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Tools ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'tools' && h('div', { className: 'space-y-3' },

          // ── Prediction tool (with interpolation/extrapolation) ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-indigo-200' },
            h('div', { className: 'text-xs font-bold text-indigo-700 uppercase mb-2' }, '\uD83D\uDD2E Prediction Tool'),
            n < 2
              ? h('div', { className: 'text-xs text-slate-500' }, 'Need 2+ points to predict')
              : h('div', null,
                  h('div', { className: 'text-[10px] text-slate-500 mb-2' }, 'Using ' + regressionType + ': ' + regEq),
                  h('div', { className: 'flex gap-2 items-center flex-wrap' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-indigo-600' }, 'If X ='),
                    h('input', { type: 'number', step: '0.1', value: predX, onChange: function(e) { upd('predX', e.target.value); checkBadges({ predicted: true }); }, 'aria-label': 'X value for prediction', className: 'w-24 px-2 py-1.5 border-2 border-indigo-200 rounded-lg text-sm font-bold text-indigo-800 text-center outline-none focus:border-indigo-400', placeholder: '?' }),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-indigo-600' }, 'then Y \u2248'),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-3 py-1.5 border rounded-lg text-sm font-bold text-center min-w-[60px] ' + (predIsExtrapolation ? 'bg-red-50 border-red-200 text-red-700' : 'bg-indigo-50 border-indigo-200 text-indigo-800') }, predResult || '?'),
                    predX !== '' && predResult && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (predIsExtrapolation ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600') },
                      predIsExtrapolation ? '\u26A0\uFE0F Extrapolation (outside data range!)' : '\u2705 Interpolation (within data range)')
                  )
                )
          ),

          // ── AI Data Analyst ──
          callGemini && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-pink-50 rounded-xl p-4 border border-pink-200' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-2' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-pink-600 uppercase' }, '\uD83E\uDD16 AI Data Analyst'),
              h('button', { 'aria-label': 'Ask A I', onClick: askAI, disabled: aiLoading || n < 2, className: 'ml-auto px-3 py-1 text-[10px] font-bold rounded-full transition-all ' + (aiLoading ? 'bg-pink-200 text-pink-400 cursor-wait' : 'bg-pink-700 text-white hover:bg-pink-600') },
                aiLoading ? '\u23F3 Analyzing...' : '\u2728 Analyze Data')
            ),
            aiInsight
              ? h('div', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, aiInsight)
              : h('div', { className: 'text-xs text-pink-400' }, n < 2 ? 'Add at least 2 data points first' : 'Click to get AI insights about your data!')
          ),

          // ── Data Transformations ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl p-4 border border-amber-200' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, '\uD83D\uDD04 Data Transformations'),
            points.length === 0
              ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-500' }, 'Add data points first')
              : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-2' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1.5 flex-wrap' },
                  [
                    { id: 'normalize', icon: '\uD83D\uDCCF', label: 'Normalize (0\u2013100)', desc: 'Scale Y to 0\u2013100' },
                    { id: 'standardize', icon: '\uD83D\uDCC0', label: 'Standardize (Z)', desc: 'Z-score transform Y' },
                    { id: 'log', icon: '\uD83D\uDCC9', label: 'Log Transform', desc: 'ln(Y) for positive values' },
                    { id: 'noise', icon: '\uD83C\uDF2A\uFE0F', label: 'Add Noise', desc: 'Random noise \u00B120% stdDev' },
                    { id: 'sort', icon: '\uD83D\uDD22', label: 'Sort by X', desc: 'Sort points by X value' },
                    { id: 'flipXY', icon: '\uD83D\uDD00', label: 'Flip X\u2194Y', desc: 'Swap X and Y values' }
                  ].map(function(tr) {
                    return h('button', { 'aria-label': 'Transform Data', key: tr.id, onClick: function() { transformData(tr.id); }, title: tr.desc,
                      className: 'px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all'
                    }, tr.icon + ' ' + tr.label);
                  })
                ),
                h('div', { className: 'text-[11px] text-amber-500' }, '\uD83D\uDCA1 Transformations modify data in-place. Use Undo (\u21A9) to revert.')
              )
          ),

          // ── Random Data Generator ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl p-4 border border-violet-200' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-violet-700 uppercase mb-2' }, '\uD83C\uDFB2 Random Data Generator'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-violet-500 mb-2' }, 'Generate 20 points with a target correlation strength:'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1.5 flex-wrap' },
              [
                { r: 0.95, label: 'r\u22480.95', color: 'emerald' },
                { r: 0.70, label: 'r\u22480.70', color: 'emerald' },
                { r: 0.40, label: 'r\u22480.40', color: 'yellow' },
                { r: 0.0, label: 'r\u22480.00', color: 'slate' },
                { r: -0.70, label: 'r\u2248-0.70', color: 'orange' },
                { r: -0.95, label: 'r\u2248-0.95', color: 'red' }
              ].map(function(g) {
                return h('button', { 'aria-label': 'Step-Through Mode', key: g.r, onClick: function() { generateRandom(g.r); },
                  className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-all'
                }, '\uD83C\uDFB2 ' + g.label);
              })
            )
          ),

          // ── Step-Through Mode ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl p-4 border border-violet-200' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-violet-700 uppercase mb-2' }, '\uD83D\uDC63 Step-Through Mode'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] text-violet-500 mb-2' }, 'Watch how statistics change as each point is revealed one-by-one.'),
            !stepMode
              ? h('button', { 'aria-label': 'Stop', onClick: startStepThrough, disabled: points.length < 2, className: 'px-4 py-2 bg-violet-600 text-white font-bold rounded-lg text-sm hover:bg-violet-700 disabled:opacity-40' }, '\u25B6 Start Step-Through (' + points.length + ' points)')
              : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3' },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm font-bold text-violet-700' }, stepIdx + ' / ' + points.length + ' revealed'),
                h('button', { 'aria-label': 'Stop', onClick: stepNext, className: 'px-3 py-1 bg-violet-600 text-white font-bold rounded-lg text-xs' }, stepIdx >= points.length ? '\u2705 Done' : '\u27A1 Next'),
                h('button', { 'aria-label': 'Stop', onClick: stopStep, className: 'px-3 py-1 bg-white text-violet-600 font-bold rounded-lg text-xs border border-violet-200' }, 'Stop')
              )
          ),

          // ── CSV Import ──
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'bg-white rounded-xl p-4 border border-slate-400' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-slate-700 uppercase mb-2' }, '\uD83D\uDCCB Import Data (CSV)'),
            h('textarea', { id: 'dp-import-csv', placeholder: 'Paste CSV data:\nx,y\n1,5\n2,8\n3,12', className: 'w-full h-20 px-3 py-2 text-xs font-mono border border-slate-400 rounded-lg outline-none focus:ring-1 focus:ring-teal-400 resize-none', rows: 4 }),
            h('button', { 'aria-label': 'Import', onClick: function() {
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
            }, className: 'mt-2 px-4 py-1.5 bg-teal-700 text-white font-bold rounded-lg text-sm hover:bg-teal-700' }, '\u21E9 Import')
          )
        ),

        // ── Coach tip ──
        h('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg p-3 border border-teal-100 text-xs text-teal-700 leading-relaxed' },
          n === 0 ? '\uD83D\uDCCA Click the chart to plot points, or load a dataset to get started! Try the Tools tab for data generation.'
            : n < 3 ? '\uD83D\uDCA1 Add more points to see regression analysis. At least 2 needed for a trend line!'
            : stepMode ? '\uD83D\uDC63 Step-through mode: press \u2192 or click Next to reveal one point at a time. Watch how R\u00B2 changes!'
            : Math.abs(regR2) > 0.9 ? '\u2B50 Nearly perfect correlation! Toggle the 95% CI band (C key) to see the confidence interval.'
            : Math.abs(regR2) > 0.7 ? '\uD83D\uDCC8 Strong trend! Try the Z-Score Calculator in Statistics to explore individual values.'
            : Math.abs(regR2) < 0.3 ? '\uD83E\uDD14 Weak correlation. Check Spearman \u03C1 \u2014 there may be a non-linear monotonic trend!'
            : '\uD83D\uDCA1 Try Histogram mode and toggle Normal Curve to see how your data compares to a bell curve!'
        )
      );
    }
  });
})();
