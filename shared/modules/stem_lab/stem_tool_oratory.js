// ═══════════════════════════════════════════
// stem_tool_oratory.js — Oratory & Prosody Communication Lab
// Real-time speech prosody visualization: pitch contour, pacing, volume,
// intonation practice. Designed for SLP Tier 1 whole-classroom intervention.
// Web Audio API + Canvas rendering at 60fps.
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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('oratory'))) {

(function() {
  'use strict';

  // ═══════════════════════════════════════════
  // Module-scoped audio processing functions
  // ═══════════════════════════════════════════

  /**
   * Autocorrelation pitch detection — from Rachel's tools.
   * Returns detected frequency in Hz, or -1 if no pitch detected.
   */
  function autoCorrelate(buf, sampleRate) {
    var SIZE = buf.length;
    var rms = 0;
    for (var i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    var r1 = 0, r2 = SIZE - 1;
    var thres = 0.2;
    for (var i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (var i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    var c = new Array(SIZE).fill(0);
    for (var i = 0; i < SIZE; i++) {
      for (var j = 0; j < SIZE - i; j++) {
        c[i] += buf[j] * buf[j + i];
      }
    }

    var d = 0;
    while (c[d] > c[d + 1]) d++;
    var maxval = -1, maxpos = -1;
    for (var i = d; i < SIZE; i++) {
      if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    }

    var T0 = maxpos;
    if (T0 > 0 && T0 < SIZE - 1) {
      var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
      var a = (x1 + x3 - 2 * x2) / 2;
      var b = (x3 - x1) / 2;
      if (a) T0 -= b / (2 * a);
    }

    return sampleRate / T0;
  }

  /** RMS volume calculation */
  function calculateRMS(buf) {
    var sum = 0;
    for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  /** Convert RMS to decibels */
  function rmsToDb(rms) {
    return rms > 0 ? 20 * Math.log10(rms) : -100;
  }

  /**
   * Classify pitch into a color zone.
   * Returns {color, label} for visualization.
   */
  function pitchZone(hz) {
    if (hz <= 0) return { color: '#94a3b8', label: 'No pitch', zone: 'none' };
    if (hz < 130) return { color: '#3b82f6', label: 'Low / calm', zone: 'low' };
    if (hz < 220) return { color: '#22c55e', label: 'Conversational', zone: 'mid' };
    if (hz < 320) return { color: '#f97316', label: 'Emphasis', zone: 'high' };
    return { color: '#ef4444', label: 'High / strained', zone: 'strain' };
  }

  /**
   * Classify WPM into a pacing zone.
   */
  function pacingZone(wpm, gradeLevel) {
    // Age-norm adjustment: younger students naturally speak slower
    var slowThreshold = 100;
    var convLow = 100;
    var convHigh = 150;
    var fastThreshold = 180;
    if (gradeLevel && gradeLevel <= 2) {
      slowThreshold = 70; convLow = 70; convHigh = 110; fastThreshold = 130;
    } else if (gradeLevel && gradeLevel <= 5) {
      slowThreshold = 80; convLow = 80; convHigh = 130; fastThreshold = 160;
    }
    if (wpm < slowThreshold) return { color: '#3b82f6', label: 'Too Slow', zone: 'slow' };
    if (wpm < convHigh) return { color: '#22c55e', label: 'Conversational', zone: 'conversational' };
    if (wpm < fastThreshold) return { color: '#eab308', label: 'Presentation Pace', zone: 'presentation' };
    return { color: '#ef4444', label: 'Too Fast', zone: 'fast' };
  }

  // ═══════════════════════════════════════════
  // Canvas rendering functions (module-scoped)
  // ═══════════════════════════════════════════

  /**
   * Draw the prosody curve — a rolling pitch-over-time line graph.
   */
  function drawProsodyCurve(canvas, pitchHistory, isDark, modelCurve) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    // Background
    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    // Grid lines for frequency zones
    var minHz = 80, maxHz = 400;
    var zones = [
      { hz: 130, label: '130 Hz — Low', color: isDark ? '#1e40af' : '#bfdbfe' },
      { hz: 220, label: '220 Hz — Mid', color: isDark ? '#166534' : '#bbf7d0' },
      { hz: 320, label: '320 Hz — High', color: isDark ? '#9a3412' : '#fed7aa' }
    ];

    ctx2d.font = '10px sans-serif';
    ctx2d.textAlign = 'right';
    for (var zi = 0; zi < zones.length; zi++) {
      var y = H - ((zones[zi].hz - minHz) / (maxHz - minHz)) * H;
      ctx2d.strokeStyle = zones[zi].color;
      ctx2d.setLineDash([4, 4]);
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, y);
      ctx2d.lineTo(W, y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);
      ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx2d.fillText(zones[zi].label, W - 4, y - 3);
    }

    // Draw model curve if present (dashed, semi-transparent)
    if (modelCurve && modelCurve.length > 1) {
      ctx2d.beginPath();
      ctx2d.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(124, 58, 237, 0.4)';
      ctx2d.lineWidth = 3;
      ctx2d.setLineDash([8, 6]);
      for (var mi = 0; mi < modelCurve.length; mi++) {
        var mx = (mi / (modelCurve.length - 1)) * W;
        var mhz = modelCurve[mi];
        if (mhz <= 0) continue;
        var my = H - ((Math.min(Math.max(mhz, minHz), maxHz) - minHz) / (maxHz - minHz)) * H;
        if (mi === 0) ctx2d.moveTo(mx, my);
        else ctx2d.lineTo(mx, my);
      }
      ctx2d.stroke();
      ctx2d.setLineDash([]);
      // Label
      ctx2d.fillStyle = isDark ? '#a855f7' : '#7c3aed';
      ctx2d.textAlign = 'left';
      ctx2d.fillText('Model', 6, 14);
    }

    // Draw user pitch curve
    if (!pitchHistory || pitchHistory.length < 2) {
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.textAlign = 'center';
      ctx2d.font = '13px sans-serif';
      ctx2d.fillText('Start speaking to see your pitch curve', W / 2, H / 2);
      return;
    }

    ctx2d.beginPath();
    ctx2d.lineWidth = 2.5;
    var started = false;
    for (var pi = 0; pi < pitchHistory.length; pi++) {
      var px = (pi / (pitchHistory.length - 1)) * W;
      var phz = pitchHistory[pi];
      if (phz <= 0) { started = false; continue; }
      var py = H - ((Math.min(Math.max(phz, minHz), maxHz) - minHz) / (maxHz - minHz)) * H;
      var pzone = pitchZone(phz);
      if (!started) {
        ctx2d.stroke();
        ctx2d.beginPath();
        ctx2d.strokeStyle = pzone.color;
        ctx2d.moveTo(px, py);
        started = true;
      } else {
        ctx2d.strokeStyle = pzone.color;
        ctx2d.lineTo(px, py);
      }
    }
    ctx2d.stroke();

    // Current pitch dot
    var lastPitch = pitchHistory[pitchHistory.length - 1];
    if (lastPitch > 0) {
      var dotY = H - ((Math.min(Math.max(lastPitch, minHz), maxHz) - minHz) / (maxHz - minHz)) * H;
      var dotZone = pitchZone(lastPitch);
      ctx2d.beginPath();
      ctx2d.arc(W - 4, dotY, 5, 0, 2 * Math.PI);
      ctx2d.fillStyle = dotZone.color;
      ctx2d.fill();
      ctx2d.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      ctx2d.textAlign = 'left';
      ctx2d.font = 'bold 11px sans-serif';
      ctx2d.fillText(Math.round(lastPitch) + ' Hz', W - 60, dotY - 8);
    }
  }

  /**
   * Draw the pacing speedometer — a semicircular gauge.
   */
  function drawPacingGauge(canvas, wpm, gradeLevel, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    var cx = W / 2;
    var cy = H - 20;
    var r = Math.min(cx - 20, cy - 10);

    // Age-adjusted thresholds
    var maxWpm = 220;
    var thresholds = [
      { pct: 0, color: '#3b82f6', label: 'Slow' },
      { pct: 0.45, color: '#22c55e', label: 'Good' },
      { pct: 0.68, color: '#eab308', label: 'Presentation' },
      { pct: 0.82, color: '#ef4444', label: 'Fast' }
    ];
    if (gradeLevel && gradeLevel <= 2) {
      maxWpm = 150;
    } else if (gradeLevel && gradeLevel <= 5) {
      maxWpm = 180;
    }

    // Draw arc zones
    var startAngle = Math.PI;
    var endAngle = 2 * Math.PI;
    for (var ti = 0; ti < thresholds.length; ti++) {
      var from = startAngle + thresholds[ti].pct * Math.PI;
      var to = ti < thresholds.length - 1 ? startAngle + thresholds[ti + 1].pct * Math.PI : endAngle;
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r, from, to);
      ctx2d.lineWidth = 18;
      ctx2d.strokeStyle = thresholds[ti].color;
      ctx2d.globalAlpha = 0.3;
      ctx2d.stroke();
      ctx2d.globalAlpha = 1.0;
    }

    // Draw tick marks
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx2d.font = '9px sans-serif';
    ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx2d.textAlign = 'center';
    for (var tick = 0; tick <= maxWpm; tick += 20) {
      var tickAngle = startAngle + (tick / maxWpm) * Math.PI;
      var x1 = cx + (r - 12) * Math.cos(tickAngle);
      var y1 = cy + (r - 12) * Math.sin(tickAngle);
      var x2 = cx + (r + 4) * Math.cos(tickAngle);
      var y2 = cy + (r + 4) * Math.sin(tickAngle);
      ctx2d.beginPath();
      ctx2d.moveTo(x1, y1);
      ctx2d.lineTo(x2, y2);
      ctx2d.stroke();
      if (tick % 40 === 0) {
        var lx = cx + (r - 24) * Math.cos(tickAngle);
        var ly = cy + (r - 24) * Math.sin(tickAngle);
        ctx2d.fillText(tick.toString(), lx, ly + 3);
      }
    }

    // Needle
    var clampedWpm = Math.min(Math.max(wpm || 0, 0), maxWpm);
    var needleAngle = startAngle + (clampedWpm / maxWpm) * Math.PI;
    var needleLen = r - 8;
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.lineTo(cx + needleLen * Math.cos(needleAngle), cy + needleLen * Math.sin(needleAngle));
    ctx2d.lineWidth = 3;
    var zone = pacingZone(clampedWpm, gradeLevel);
    ctx2d.strokeStyle = zone.color;
    ctx2d.stroke();

    // Center dot
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx2d.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx2d.fill();

    // WPM text
    ctx2d.font = 'bold 22px sans-serif';
    ctx2d.fillStyle = zone.color;
    ctx2d.textAlign = 'center';
    ctx2d.fillText(Math.round(clampedWpm), cx, cy - 15);
    ctx2d.font = '11px sans-serif';
    ctx2d.fillStyle = isDark ? '#cbd5e1' : '#475569';
    ctx2d.fillText('words per minute', cx, cy - 2);

    // Zone label
    ctx2d.font = 'bold 12px sans-serif';
    ctx2d.fillStyle = zone.color;
    ctx2d.fillText(zone.label, cx, cy + 16);
  }

  /**
   * Draw the volume meter — a horizontal bar with steadiness indicator.
   */
  function drawVolumeMeter(canvas, currentDb, volumeHistory, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    // Normalize dB: -60 dB = silence, 0 dB = max
    var minDb = -60, maxDb = 0;
    var normalizedDb = Math.min(Math.max(currentDb || -60, minDb), maxDb);
    var pct = (normalizedDb - minDb) / (maxDb - minDb);

    // Volume bar zones
    var barY = 10;
    var barH = 24;
    var barW = W - 40;
    var barX = 20;

    // Background
    ctx2d.fillStyle = isDark ? '#334155' : '#e2e8f0';
    ctx2d.fillRect(barX, barY, barW, barH);

    // Zone fills — quiet (yellow), good (green), loud (red)
    var quietEnd = 0.25, goodEnd = 0.75;
    // Yellow zone
    ctx2d.fillStyle = '#eab30833';
    ctx2d.fillRect(barX, barY, barW * quietEnd, barH);
    // Green zone
    ctx2d.fillStyle = '#22c55e33';
    ctx2d.fillRect(barX + barW * quietEnd, barY, barW * (goodEnd - quietEnd), barH);
    // Red zone
    ctx2d.fillStyle = '#ef444433';
    ctx2d.fillRect(barX + barW * goodEnd, barY, barW * (1 - goodEnd), barH);

    // Active fill
    var fillColor = '#eab308';
    if (pct >= quietEnd && pct <= goodEnd) fillColor = '#22c55e';
    else if (pct > goodEnd) fillColor = '#ef4444';
    ctx2d.fillStyle = fillColor;
    ctx2d.fillRect(barX, barY, barW * pct, barH);

    // Zone labels
    ctx2d.font = '8px sans-serif';
    ctx2d.textAlign = 'center';
    ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx2d.fillText('Quiet', barX + (barW * quietEnd) / 2, barY + barH + 12);
    ctx2d.fillText('Good Projection', barX + barW * quietEnd + (barW * (goodEnd - quietEnd)) / 2, barY + barH + 12);
    ctx2d.fillText('Too Loud', barX + barW * goodEnd + (barW * (1 - goodEnd)) / 2, barY + barH + 12);

    // dB readout
    ctx2d.font = 'bold 12px sans-serif';
    ctx2d.fillStyle = fillColor;
    ctx2d.textAlign = 'right';
    ctx2d.fillText(Math.round(normalizedDb) + ' dB', W - 4, barY + barH / 2 + 4);

    // Steadiness score (coefficient of variation over last ~3 seconds = ~90 frames at 30fps analysis)
    if (volumeHistory && volumeHistory.length > 10) {
      var recent = volumeHistory.slice(-90);
      var mean = 0;
      for (var vi = 0; vi < recent.length; vi++) mean += recent[vi];
      mean /= recent.length;
      var variance = 0;
      for (var vi2 = 0; vi2 < recent.length; vi2++) variance += (recent[vi2] - mean) * (recent[vi2] - mean);
      variance /= recent.length;
      var stdDev = Math.sqrt(variance);
      var cv = mean !== 0 ? stdDev / Math.abs(mean) : 0;
      // cv < 0.1 = very steady, < 0.2 = steady, < 0.4 = unsteady, > 0.4 = erratic
      var steadinessScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 1)) * 100)));
      var steadyLabel = steadinessScore >= 80 ? 'Very Steady' : steadinessScore >= 60 ? 'Steady' : steadinessScore >= 40 ? 'Unsteady' : 'Erratic';
      var steadyColor = steadinessScore >= 80 ? '#22c55e' : steadinessScore >= 60 ? '#eab308' : '#ef4444';

      ctx2d.font = '10px sans-serif';
      ctx2d.textAlign = 'left';
      ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx2d.fillText('Steadiness:', barX, barY + barH + 28);
      ctx2d.fillStyle = steadyColor;
      ctx2d.font = 'bold 10px sans-serif';
      ctx2d.fillText(steadinessScore + '% — ' + steadyLabel, barX + 62, barY + barH + 28);

      return { steadinessScore: steadinessScore, steadyLabel: steadyLabel };
    }

    return { steadinessScore: 0, steadyLabel: 'N/A' };
  }

  /**
   * Draw pause indicator on a small canvas.
   */
  function drawPauseIndicator(canvas, isPaused, pauseDuration, pauseRatio, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    // Pause/speech pie
    var cx = 40, cy = H / 2, r = 18;
    var speechPct = 1 - (pauseRatio || 0);
    // Speech arc (green)
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * speechPct);
    ctx2d.closePath();
    ctx2d.fillStyle = '#22c55e';
    ctx2d.fill();
    // Pause arc (blue)
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.arc(cx, cy, r, -Math.PI / 2 + 2 * Math.PI * speechPct, -Math.PI / 2 + 2 * Math.PI);
    ctx2d.closePath();
    ctx2d.fillStyle = '#3b82f6';
    ctx2d.fill();

    // Labels
    ctx2d.font = '9px sans-serif';
    ctx2d.textAlign = 'left';
    ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx2d.fillText('Speech: ' + Math.round(speechPct * 100) + '%', 68, cy - 8);
    ctx2d.fillText('Pauses: ' + Math.round((pauseRatio || 0) * 100) + '%', 68, cy + 4);

    // Current pause indicator
    if (isPaused) {
      ctx2d.font = 'bold 11px sans-serif';
      ctx2d.fillStyle = '#3b82f6';
      ctx2d.fillText('PAUSING ' + (pauseDuration ? pauseDuration.toFixed(1) + 's' : ''), 68, cy + 20);
      // Pulsing circle
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, r + 4, 0, 2 * Math.PI);
      ctx2d.strokeStyle = '#3b82f688';
      ctx2d.lineWidth = 2;
      ctx2d.stroke();
    }

    // Ideal range note
    ctx2d.font = '8px sans-serif';
    ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx2d.fillText('Ideal pause ratio: 20-30%', 68, H - 4);
  }

  // ═══════════════════════════════════════════
  // Formant detection — ported from Rachel's tools
  // FFT peak detection in 200-3000 Hz range
  // ═══════════════════════════════════════════
  function findFormants(freqData, sampleRate) {
    var binSize = sampleRate / (freqData.length * 2);
    var peaks = [];
    var startBin = Math.floor(200 / binSize);
    var endBin = Math.min(Math.floor(3000 / binSize), freqData.length - 2);
    for (var i = startBin + 1; i < endBin; i++) {
      if (freqData[i] > freqData[i - 1] && freqData[i] > freqData[i + 1] && freqData[i] > -50) {
        peaks.push({ bin: i, freq: i * binSize, mag: freqData[i] });
      }
    }
    peaks.sort(function(a, b) { return b.mag - a.mag; });
    var f1 = null, f2 = null;
    for (var j = 0; j < peaks.length; j++) {
      var p = peaks[j];
      if (!f1 && p.freq >= 200 && p.freq <= 1000) f1 = p.freq;
      else if (!f2 && p.freq > 800 && p.freq <= 3000 && (!f1 || Math.abs(p.freq - f1) > 200)) f2 = p.freq;
      if (f1 && f2) break;
    }
    return { f1: f1 || 0, f2: f2 || 0 };
  }

  // ═══════════════════════════════════════════
  // Vowel space maps for multi-language support
  // Each vowel: { symbol, f1, f2 } — approximate formant targets
  // ═══════════════════════════════════════════
  var VOWEL_MAPS = {
    en: {
      name: 'English',
      vowels: [
        { symbol: 'i:', f1: 270, f2: 2290 },
        { symbol: '\u026A', f1: 390, f2: 1990 },
        { symbol: 'e', f1: 530, f2: 1840 },
        { symbol: '\u00E6', f1: 660, f2: 1720 },
        { symbol: '\u0251:', f1: 730, f2: 1090 },
        { symbol: '\u0254:', f1: 570, f2: 840 },
        { symbol: '\u028A', f1: 440, f2: 1020 },
        { symbol: 'u:', f1: 300, f2: 870 },
        { symbol: '\u028C', f1: 640, f2: 1190 },
        { symbol: '\u0259', f1: 500, f2: 1500 },
        { symbol: '\u025C:', f1: 480, f2: 1380 }
      ]
    },
    es: {
      name: 'Spanish',
      vowels: [
        { symbol: 'i', f1: 280, f2: 2250 },
        { symbol: 'e', f1: 450, f2: 1900 },
        { symbol: 'a', f1: 700, f2: 1400 },
        { symbol: 'o', f1: 500, f2: 900 },
        { symbol: 'u', f1: 300, f2: 800 }
      ]
    },
    fr: {
      name: 'French',
      vowels: [
        { symbol: 'i', f1: 280, f2: 2300 },
        { symbol: 'e', f1: 370, f2: 2100 },
        { symbol: '\u025B', f1: 550, f2: 1770 },
        { symbol: 'a', f1: 700, f2: 1400 },
        { symbol: '\u0254', f1: 550, f2: 900 },
        { symbol: 'o', f1: 380, f2: 750 },
        { symbol: 'u', f1: 300, f2: 750 },
        { symbol: 'y', f1: 280, f2: 1850 },
        { symbol: '\u00F8', f1: 370, f2: 1500 },
        { symbol: '\u0153', f1: 530, f2: 1370 },
        { symbol: '\u0259', f1: 470, f2: 1400 },
        { symbol: '\u0251\u0303', f1: 680, f2: 1200 }
      ]
    },
    ja: {
      name: 'Japanese',
      vowels: [
        { symbol: 'i', f1: 300, f2: 2200 },
        { symbol: 'e', f1: 450, f2: 1900 },
        { symbol: 'a', f1: 700, f2: 1300 },
        { symbol: 'o', f1: 500, f2: 850 },
        { symbol: 'u', f1: 320, f2: 1200 }
      ]
    },
    ar: {
      name: 'Arabic',
      vowels: [
        { symbol: 'i', f1: 300, f2: 2200 },
        { symbol: 'a', f1: 700, f2: 1300 },
        { symbol: 'u', f1: 300, f2: 800 }
      ]
    }
  };

  /**
   * Draw the vowel space scatterplot — IPA vowel quadrilateral.
   * f1Range: y-axis (low to high, top to bottom)
   * f2Range: x-axis (high to low, left to right — linguist convention)
   */
  function drawVowelSpace(canvas, vowelMap, currentF1, currentF2, vowelTrail, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    var pad = 40;
    var plotW = W - pad * 2;
    var plotH = H - pad * 2;

    // Axis ranges
    var f1Min = 200, f1Max = 800;
    var f2Min = 600, f2Max = 2500;

    // Helper: map formant to canvas coords
    function f2x(f2) { return pad + (1 - (f2 - f2Min) / (f2Max - f2Min)) * plotW; }
    function f1y(f1) { return pad + ((f1 - f1Min) / (f1Max - f1Min)) * plotH; }

    // Draw axes
    ctx2d.strokeStyle = isDark ? '#475569' : '#cbd5e1';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(pad, pad);
    ctx2d.lineTo(pad, H - pad);
    ctx2d.lineTo(W - pad, H - pad);
    ctx2d.stroke();

    // Axis labels
    ctx2d.font = '10px sans-serif';
    ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('F2 (Hz) — High \u2190 \u2192 Low', W / 2, H - 5);
    ctx2d.save();
    ctx2d.translate(12, H / 2);
    ctx2d.rotate(-Math.PI / 2);
    ctx2d.fillText('F1 (Hz) — Close \u2190 \u2192 Open', 0, 0);
    ctx2d.restore();

    // Axis ticks
    ctx2d.font = '8px sans-serif';
    ctx2d.textAlign = 'center';
    for (var f2t = 800; f2t <= 2400; f2t += 400) {
      var tx = f2x(f2t);
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.fillText(f2t.toString(), tx, H - pad + 12);
      ctx2d.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx2d.beginPath();
      ctx2d.moveTo(tx, pad);
      ctx2d.lineTo(tx, H - pad);
      ctx2d.stroke();
    }
    ctx2d.textAlign = 'right';
    for (var f1t = 300; f1t <= 700; f1t += 100) {
      var ty = f1y(f1t);
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.fillText(f1t.toString(), pad - 5, ty + 3);
      ctx2d.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx2d.beginPath();
      ctx2d.moveTo(pad, ty);
      ctx2d.lineTo(W - pad, ty);
      ctx2d.stroke();
    }

    // Draw vowel targets
    var vowels = vowelMap ? vowelMap.vowels : VOWEL_MAPS.en.vowels;
    for (var vi = 0; vi < vowels.length; vi++) {
      var v = vowels[vi];
      var vx = f2x(v.f2);
      var vy = f1y(v.f1);
      // Target region circle
      ctx2d.beginPath();
      ctx2d.arc(vx, vy, 18, 0, 2 * Math.PI);
      ctx2d.fillStyle = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)';
      ctx2d.fill();
      ctx2d.strokeStyle = isDark ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.35)';
      ctx2d.lineWidth = 1;
      ctx2d.stroke();
      // Label
      ctx2d.font = 'bold 11px sans-serif';
      ctx2d.fillStyle = isDark ? '#4ade80' : '#16a34a';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(v.symbol, vx, vy + 4);
    }

    // Draw trail (fading dots)
    if (vowelTrail && vowelTrail.length > 0) {
      for (var ti = 0; ti < vowelTrail.length; ti++) {
        var tp = vowelTrail[ti];
        if (tp.f1 <= 0 || tp.f2 <= 0) continue;
        var ttx = f2x(tp.f2);
        var tty = f1y(tp.f1);
        var alpha = 0.15 + 0.6 * (ti / vowelTrail.length);
        ctx2d.beginPath();
        ctx2d.arc(ttx, tty, 4, 0, 2 * Math.PI);
        ctx2d.fillStyle = 'rgba(168, 85, 247, ' + alpha.toFixed(2) + ')';
        ctx2d.fill();
      }
      // Draw connecting lines for trail (shows diphthongs)
      if (vowelTrail.length > 1) {
        ctx2d.beginPath();
        ctx2d.strokeStyle = isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(124, 58, 237, 0.25)';
        ctx2d.lineWidth = 1.5;
        var trailStarted = false;
        for (var tli = 0; tli < vowelTrail.length; tli++) {
          var tlp = vowelTrail[tli];
          if (tlp.f1 <= 0 || tlp.f2 <= 0) { trailStarted = false; continue; }
          var tlx = f2x(tlp.f2);
          var tly = f1y(tlp.f1);
          if (!trailStarted) { ctx2d.moveTo(tlx, tly); trailStarted = true; }
          else ctx2d.lineTo(tlx, tly);
        }
        ctx2d.stroke();
      }
    }

    // Draw current position dot
    if (currentF1 > 0 && currentF2 > 0) {
      var cx2 = f2x(currentF2);
      var cy2 = f1y(currentF1);
      // Outer glow
      ctx2d.beginPath();
      ctx2d.arc(cx2, cy2, 10, 0, 2 * Math.PI);
      ctx2d.fillStyle = isDark ? 'rgba(249, 115, 22, 0.25)' : 'rgba(249, 115, 22, 0.2)';
      ctx2d.fill();
      // Inner dot
      ctx2d.beginPath();
      ctx2d.arc(cx2, cy2, 6, 0, 2 * Math.PI);
      ctx2d.fillStyle = '#f97316';
      ctx2d.fill();
      ctx2d.strokeStyle = '#fff';
      ctx2d.lineWidth = 1.5;
      ctx2d.stroke();
      // Readout
      ctx2d.font = '9px sans-serif';
      ctx2d.fillStyle = isDark ? '#fdba74' : '#ea580c';
      ctx2d.textAlign = 'left';
      ctx2d.fillText('F1:' + Math.round(currentF1) + '  F2:' + Math.round(currentF2), cx2 + 12, cy2 - 4);
    }
  }

  /**
   * Draw intonation pattern template — target zone + optional student overlay.
   */
  function drawIntonationPattern(canvas, patternPoints, studentCurve, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    if (!patternPoints || patternPoints.length < 2) return;

    var pad = 10;
    var plotW = W - pad * 2;
    var plotH = H - pad * 2;

    // Draw target zone (shaded green region)
    var tolerance = 0.12; // ±12% of height as "target zone"
    ctx2d.beginPath();
    for (var i = 0; i < patternPoints.length; i++) {
      var x = pad + (i / (patternPoints.length - 1)) * plotW;
      var yTop = pad + (1 - Math.min(1, patternPoints[i] + tolerance)) * plotH;
      if (i === 0) ctx2d.moveTo(x, yTop);
      else ctx2d.lineTo(x, yTop);
    }
    for (var i = patternPoints.length - 1; i >= 0; i--) {
      var x = pad + (i / (patternPoints.length - 1)) * plotW;
      var yBot = pad + (1 - Math.max(0, patternPoints[i] - tolerance)) * plotH;
      ctx2d.lineTo(x, yBot);
    }
    ctx2d.closePath();
    ctx2d.fillStyle = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.12)';
    ctx2d.fill();

    // Draw center line of pattern
    ctx2d.beginPath();
    ctx2d.strokeStyle = isDark ? 'rgba(34, 197, 94, 0.6)' : 'rgba(22, 163, 74, 0.5)';
    ctx2d.lineWidth = 2;
    ctx2d.setLineDash([6, 4]);
    for (var i = 0; i < patternPoints.length; i++) {
      var x = pad + (i / (patternPoints.length - 1)) * plotW;
      var y = pad + (1 - patternPoints[i]) * plotH;
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    // Draw student curve overlay if present
    if (studentCurve && studentCurve.length > 1) {
      // Normalize student curve to 0-1
      var sMin = 9999, sMax = -9999;
      for (var si = 0; si < studentCurve.length; si++) {
        if (studentCurve[si] > 0) {
          if (studentCurve[si] < sMin) sMin = studentCurve[si];
          if (studentCurve[si] > sMax) sMax = studentCurve[si];
        }
      }
      var sRange = sMax - sMin || 1;

      ctx2d.beginPath();
      ctx2d.strokeStyle = isDark ? '#f97316' : '#ea580c';
      ctx2d.lineWidth = 2.5;
      var sStarted = false;
      for (var si = 0; si < studentCurve.length; si++) {
        var sx = pad + (si / (studentCurve.length - 1)) * plotW;
        if (studentCurve[si] <= 0) { sStarted = false; continue; }
        var sNorm = (studentCurve[si] - sMin) / sRange;
        var sy = pad + (1 - sNorm) * plotH;
        if (!sStarted) { ctx2d.moveTo(sx, sy); sStarted = true; }
        else ctx2d.lineTo(sx, sy);
      }
      ctx2d.stroke();

      // Legend
      ctx2d.font = '9px sans-serif';
      ctx2d.textAlign = 'left';
      ctx2d.fillStyle = isDark ? '#4ade80' : '#16a34a';
      ctx2d.fillText('Target', pad + 4, pad + 10);
      ctx2d.fillStyle = isDark ? '#f97316' : '#ea580c';
      ctx2d.fillText('Your pitch', pad + 4, pad + 22);
    }
  }

  /**
   * Draw playback prosody curve — synchronized with audio playback position.
   */
  function drawPlaybackProsody(canvas, pitchData, volumeData, playbackProgress, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    if (!pitchData || pitchData.length < 2) {
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.textAlign = 'center';
      ctx2d.font = '12px sans-serif';
      ctx2d.fillText('No recording data', W / 2, H / 2);
      return;
    }

    var minHz = 80, maxHz = 400;

    // Draw grid
    ctx2d.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    ctx2d.lineWidth = 0.5;
    ctx2d.setLineDash([2, 4]);
    var gridHz = [130, 220, 320];
    for (var gi = 0; gi < gridHz.length; gi++) {
      var gy = H - ((gridHz[gi] - minHz) / (maxHz - minHz)) * H;
      ctx2d.beginPath();
      ctx2d.moveTo(0, gy);
      ctx2d.lineTo(W, gy);
      ctx2d.stroke();
    }
    ctx2d.setLineDash([]);

    // Draw full pitch curve (dimmed)
    ctx2d.beginPath();
    ctx2d.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(148, 163, 184, 0.25)';
    ctx2d.lineWidth = 1.5;
    var started = false;
    for (var i = 0; i < pitchData.length; i++) {
      var x = (i / (pitchData.length - 1)) * W;
      if (pitchData[i] <= 0) { started = false; continue; }
      var y = H - ((Math.min(Math.max(pitchData[i], minHz), maxHz) - minHz) / (maxHz - minHz)) * H;
      if (!started) { ctx2d.moveTo(x, y); started = true; }
      else ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();

    // Draw highlighted portion up to playback position
    var progressIdx = Math.floor(playbackProgress * pitchData.length);
    if (progressIdx > 1) {
      ctx2d.beginPath();
      ctx2d.lineWidth = 2.5;
      started = false;
      for (var i = 0; i < progressIdx; i++) {
        var x = (i / (pitchData.length - 1)) * W;
        if (pitchData[i] <= 0) { started = false; continue; }
        var y = H - ((Math.min(Math.max(pitchData[i], minHz), maxHz) - minHz) / (maxHz - minHz)) * H;
        var pz = pitchZone(pitchData[i]);
        if (!started) {
          ctx2d.stroke();
          ctx2d.beginPath();
          ctx2d.strokeStyle = pz.color;
          ctx2d.moveTo(x, y);
          started = true;
        } else {
          ctx2d.strokeStyle = pz.color;
          ctx2d.lineTo(x, y);
        }
      }
      ctx2d.stroke();
    }

    // Draw playhead line
    var playX = playbackProgress * W;
    ctx2d.strokeStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx2d.lineWidth = 1.5;
    ctx2d.setLineDash([3, 3]);
    ctx2d.beginPath();
    ctx2d.moveTo(playX, 0);
    ctx2d.lineTo(playX, H);
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    // Volume bar at bottom (small)
    if (volumeData && volumeData.length > 1) {
      var volH = 12;
      var volY = H - volH;
      for (var vi = 0; vi < volumeData.length; vi++) {
        var vx = (vi / (volumeData.length - 1)) * W;
        var vDb = volumeData[vi];
        var vNorm = Math.max(0, Math.min(1, (vDb + 60) / 60));
        var vAlpha = vi < progressIdx ? 0.6 : 0.15;
        ctx2d.fillStyle = 'rgba(59, 130, 246, ' + vAlpha.toFixed(2) + ')';
        ctx2d.fillRect(vx, volY + volH * (1 - vNorm), 2, volH * vNorm);
      }
    }
  }

  /**
   * Draw prosody comparison — two recordings side by side.
   */
  function drawProsodyComparison(canvas, pitchData1, pitchData2, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    var minHz = 80, maxHz = 400;

    // Grid
    ctx2d.strokeStyle = isDark ? '#334155' : '#e2e8f0';
    ctx2d.lineWidth = 0.5;
    ctx2d.setLineDash([2, 4]);
    var gridHz = [130, 220, 320];
    for (var gi = 0; gi < gridHz.length; gi++) {
      var gy = H - ((gridHz[gi] - minHz) / (maxHz - minHz)) * H;
      ctx2d.beginPath();
      ctx2d.moveTo(0, gy);
      ctx2d.lineTo(W, gy);
      ctx2d.stroke();
    }
    ctx2d.setLineDash([]);

    function drawCurve(data, color, width) {
      if (!data || data.length < 2) return;
      ctx2d.beginPath();
      ctx2d.strokeStyle = color;
      ctx2d.lineWidth = width;
      var s = false;
      for (var i = 0; i < data.length; i++) {
        var x = (i / (data.length - 1)) * W;
        if (data[i] <= 0) { s = false; continue; }
        var y = H - ((Math.min(Math.max(data[i], minHz), maxHz) - minHz) / (maxHz - minHz)) * H;
        if (!s) { ctx2d.moveTo(x, y); s = true; }
        else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
    }

    drawCurve(pitchData1, isDark ? '#3b82f6' : '#2563eb', 2.5);
    drawCurve(pitchData2, isDark ? '#f97316' : '#ea580c', 2.5);

    // Legend
    ctx2d.font = 'bold 10px sans-serif';
    ctx2d.textAlign = 'left';
    ctx2d.fillStyle = isDark ? '#3b82f6' : '#2563eb';
    ctx2d.fillText('Recording 1', 6, 14);
    ctx2d.fillStyle = isDark ? '#f97316' : '#ea580c';
    ctx2d.fillText('Recording 2', 6, 26);

    if (!pitchData1 && !pitchData2) {
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.textAlign = 'center';
      ctx2d.font = '12px sans-serif';
      ctx2d.fillText('Select two recordings to compare', W / 2, H / 2);
    }
  }

  /**
   * Draw fluency session comparison bar chart.
   */
  function drawFluencyBarChart(canvas, sessions, isDark) {
    if (!canvas) return;
    var ctx2d = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    ctx2d.clearRect(0, 0, W, H);

    ctx2d.fillStyle = isDark ? '#1e293b' : '#f8fafc';
    ctx2d.fillRect(0, 0, W, H);

    if (!sessions || sessions.length === 0) {
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.textAlign = 'center';
      ctx2d.font = '11px sans-serif';
      ctx2d.fillText('No fluency sessions yet', W / 2, H / 2);
      return;
    }

    var pad = 30;
    var plotW = W - pad * 2;
    var plotH = H - pad - 20;
    var barCount = Math.min(sessions.length, 10);
    var barGap = 6;
    var barW = Math.max(12, (plotW - barGap * (barCount - 1)) / barCount);

    // Y-axis (0-5 stars)
    ctx2d.font = '8px sans-serif';
    ctx2d.textAlign = 'right';
    ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
    for (var si = 0; si <= 5; si++) {
      var sy = pad + plotH - (si / 5) * plotH;
      ctx2d.fillText(si.toString(), pad - 4, sy + 3);
      ctx2d.strokeStyle = isDark ? '#334155' : '#e2e8f0';
      ctx2d.lineWidth = 0.5;
      ctx2d.beginPath();
      ctx2d.moveTo(pad, sy);
      ctx2d.lineTo(W - 10, sy);
      ctx2d.stroke();
    }

    // Bars
    var startIdx = Math.max(0, sessions.length - barCount);
    for (var bi = 0; bi < barCount; bi++) {
      var session = sessions[startIdx + bi];
      var score = session.fluencyStars || 0;
      var bx = pad + bi * (barW + barGap);
      var bh = (score / 5) * plotH;
      var by = pad + plotH - bh;

      // Bar color based on score
      var bColor = score >= 4 ? '#22c55e' : score >= 3 ? '#eab308' : score >= 2 ? '#f97316' : '#ef4444';
      ctx2d.fillStyle = bColor;
      ctx2d.fillRect(bx, by, barW, bh);

      // Score label
      ctx2d.font = 'bold 9px sans-serif';
      ctx2d.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      ctx2d.textAlign = 'center';
      ctx2d.fillText(score.toFixed(1), bx + barW / 2, by - 4);

      // Session label
      ctx2d.font = '7px sans-serif';
      ctx2d.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx2d.fillText('#' + (startIdx + bi + 1), bx + barW / 2, pad + plotH + 12);
    }

    // Title
    ctx2d.font = 'bold 10px sans-serif';
    ctx2d.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx2d.textAlign = 'center';
    ctx2d.fillText('Fluency Score History', W / 2, 12);
  }

  /**
   * Pattern matching: compare student curve to template.
   * Both are normalized to 0-1. Returns score 0-100.
   */
  function computePatternMatchScore(templatePoints, studentPitchHistory) {
    if (!templatePoints || !studentPitchHistory || studentPitchHistory.length < 5) return 0;

    // Filter out zero/negative pitch values
    var validPitch = [];
    for (var i = 0; i < studentPitchHistory.length; i++) {
      if (studentPitchHistory[i] > 0) validPitch.push(studentPitchHistory[i]);
    }
    if (validPitch.length < 5) return 0;

    // Normalize student pitch to 0-1
    var sMin = validPitch[0], sMax = validPitch[0];
    for (var i = 1; i < validPitch.length; i++) {
      if (validPitch[i] < sMin) sMin = validPitch[i];
      if (validPitch[i] > sMax) sMax = validPitch[i];
    }
    var sRange = sMax - sMin || 1;
    var normalizedStudent = [];
    for (var i = 0; i < validPitch.length; i++) {
      normalizedStudent.push((validPitch[i] - sMin) / sRange);
    }

    // Resample both to same length (50 points)
    var resampleLen = 50;
    function resample(arr, targetLen) {
      var result = [];
      for (var i = 0; i < targetLen; i++) {
        var srcIdx = (i / (targetLen - 1)) * (arr.length - 1);
        var lo = Math.floor(srcIdx);
        var hi = Math.min(lo + 1, arr.length - 1);
        var frac = srcIdx - lo;
        result.push(arr[lo] * (1 - frac) + arr[hi] * frac);
      }
      return result;
    }

    var tResampled = resample(templatePoints, resampleLen);
    var sResampled = resample(normalizedStudent, resampleLen);

    // Calculate mean absolute error
    var mae = 0;
    for (var i = 0; i < resampleLen; i++) {
      mae += Math.abs(tResampled[i] - sResampled[i]);
    }
    mae /= resampleLen;

    // Score: 100 - MAE * scaling_factor
    var score = Math.max(0, Math.min(100, Math.round(100 - mae * 250)));
    return score;
  }


  // ═══════════════════════════════════════════
  // Languages supported for multilingual mode
  // ═══════════════════════════════════════════
  var LANGUAGES = [
    { code: 'en', name: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
    { code: 'es', name: 'Spanish', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
    { code: 'fr', name: 'French', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
    { code: 'zh', name: 'Mandarin Chinese', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
    { code: 'ar', name: 'Arabic', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
    { code: 'pt', name: 'Portuguese', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
    { code: 'so', name: 'Somali', flag: '\uD83C\uDDF8\uD83C\uDDF4' },
    { code: 'vi', name: 'Vietnamese', flag: '\uD83C\uDDFB\uD83C\uDDF3' },
    { code: 'ht', name: 'Haitian Creole', flag: '\uD83C\uDDED\uD83C\uDDF9' },
    { code: 'de', name: 'German', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
    { code: 'ja', name: 'Japanese', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
    { code: 'ko', name: 'Korean', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
    { code: 'hi', name: 'Hindi', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
    { code: 'ru', name: 'Russian', flag: '\uD83C\uDDF7\uD83C\uDDFA' },
    { code: 'sw', name: 'Swahili', flag: '\uD83C\uDDF0\uD83C\uDDEA' }
  ];

  // ═══════════════════════════════════════════
  // Practice exercise templates
  // ═══════════════════════════════════════════
  var EXERCISE_TYPES = [
    { id: 'emotion', icon: '\uD83C\uDFAD', label: 'Emotion Cards', desc: 'Say a phrase with different emotions to see how prosody changes.' },
    { id: 'question', icon: '\u2753', label: 'Question vs Statement', desc: 'Practice rising vs falling intonation.' },
    { id: 'emphasis', icon: '\uD83D\uDCAA', label: 'Emphasis Drill', desc: 'Shift word stress to change meaning.' },
    { id: 'pacing', icon: '\u23F1\uFE0F', label: 'Pacing Challenge', desc: 'Read a passage at a target speed.' },
    { id: 'volume', icon: '\uD83D\uDD0A', label: 'Volume Projection', desc: 'Speak at a steady volume for 10 seconds.' },
    { id: 'intonation', icon: '\uD83C\uDFB6', label: 'Intonation Patterns', desc: 'Match clinical prosody target patterns used by SLPs.' }
  ];

  // Default starter exercises (before AI generation)
  var STARTER_EXERCISES = {
    emotion: [
      { phrase: 'The door is open.', emotions: ['Excitement', 'Sadness', 'Authority', 'Curiosity'] },
      { phrase: 'We are going outside.', emotions: ['Joy', 'Fear', 'Boredom', 'Surprise'] },
      { phrase: 'It is time to go.', emotions: ['Calmness', 'Urgency', 'Disappointment', 'Relief'] }
    ],
    question: [
      { statement: 'You finished your homework.', question: 'You finished your homework?' },
      { statement: 'The bus is here.', question: 'The bus is here?' },
      { statement: 'We have a test today.', question: 'We have a test today?' }
    ],
    emphasis: [
      { base: 'I did not say she stole my money.', words: ['I', 'did not', 'say', 'she', 'stole', 'my', 'money'], meanings: [
        'Someone else said it.', 'Denying it happened.', 'I implied it another way.', 'Someone else did.', 'She did something else with it.', 'It was someone else\'s money.', 'She stole something else.'
      ]},
      { base: 'We need to leave right now.', words: ['We', 'need', 'leave', 'right now'], meanings: [
        'All of us, not just some.', 'This is mandatory.', 'Go, not stay.', 'Immediately, no delay.'
      ]}
    ],
    pacing: [
      { text: 'The quick brown fox jumps over the lazy dog. The five boxing wizards jump quickly.', targetWpm: 130 },
      { text: 'Hello. My name is Alex. I am in the third grade. My favorite subject is science.', targetWpm: 100 },
      { text: 'Today we will learn about how our voices work. When we talk, air moves past small folds in our throat. These folds vibrate to make sound.', targetWpm: 120 }
    ],
    volume: [
      { text: 'Count to ten slowly and steadily: one, two, three, four, five, six, seven, eight, nine, ten.', duration: 10 },
      { text: 'Say the alphabet at a comfortable volume, keeping the loudness even throughout.', duration: 10 }
    ]
  };

  // ═══════════════════════════════════════════
  // Intonation Pattern Templates (Clinical)
  // Each pattern: normalized 0-1 pitch points
  // ═══════════════════════════════════════════
  var INTONATION_PATTERNS = [
    {
      id: 'declarative',
      label: 'Declarative',
      icon: '.',
      desc: 'Flat then falling pitch at the end.',
      phrase: 'The cat is sleeping on the couch.',
      points: [0.5, 0.52, 0.55, 0.55, 0.56, 0.55, 0.54, 0.55, 0.53, 0.50, 0.48, 0.45, 0.40, 0.35, 0.28, 0.20]
    },
    {
      id: 'yesno',
      label: 'Yes/No Question',
      icon: '?',
      desc: 'Rising pitch at the end.',
      phrase: 'Is the cat sleeping on the couch?',
      points: [0.4, 0.42, 0.44, 0.45, 0.45, 0.44, 0.45, 0.46, 0.48, 0.52, 0.58, 0.65, 0.72, 0.80, 0.87, 0.92]
    },
    {
      id: 'wh_question',
      label: 'Wh-Question',
      icon: '?',
      desc: 'Slight rise then fall.',
      phrase: 'Where is the cat sleeping?',
      points: [0.55, 0.62, 0.70, 0.75, 0.73, 0.68, 0.62, 0.56, 0.50, 0.46, 0.42, 0.38, 0.34, 0.30, 0.26, 0.22]
    },
    {
      id: 'listing',
      label: 'Listing/Enumeration',
      icon: '#',
      desc: 'Stepped rises with final fall.',
      phrase: 'I need apples, bananas, oranges, and grapes.',
      points: [0.35, 0.45, 0.55, 0.40, 0.50, 0.62, 0.45, 0.55, 0.68, 0.50, 0.60, 0.72, 0.55, 0.45, 0.32, 0.20]
    },
    {
      id: 'exclamation',
      label: 'Exclamation',
      icon: '!',
      desc: 'High peak then rapid fall.',
      phrase: 'Wow, that is amazing!',
      points: [0.60, 0.78, 0.92, 0.98, 0.95, 0.85, 0.72, 0.58, 0.45, 0.36, 0.30, 0.26, 0.23, 0.21, 0.20, 0.19]
    },
    {
      id: 'contrast',
      label: 'Contrast/Emphasis',
      icon: '*',
      desc: 'Dip-peak-dip on stressed word.',
      phrase: 'I said the BLUE one, not the red one.',
      points: [0.45, 0.42, 0.38, 0.35, 0.32, 0.38, 0.55, 0.78, 0.90, 0.78, 0.55, 0.42, 0.38, 0.35, 0.30, 0.25]
    },
    {
      id: 'surprised',
      label: 'Surprised',
      icon: '!?',
      desc: 'Sharp upward jump.',
      phrase: 'You got a puppy?!',
      points: [0.30, 0.30, 0.32, 0.35, 0.40, 0.50, 0.65, 0.82, 0.92, 0.96, 0.98, 0.95, 0.88, 0.80, 0.72, 0.65]
    },
    {
      id: 'sarcasm',
      label: 'Sarcasm',
      icon: '~',
      desc: 'Flat/monotone (deliberately reduced prosody).',
      phrase: 'Oh great, another test.',
      points: [0.50, 0.50, 0.49, 0.50, 0.51, 0.50, 0.49, 0.50, 0.50, 0.49, 0.50, 0.49, 0.48, 0.48, 0.47, 0.47]
    }
  ];

  // Warm-up exercises
  var WARMUPS = [
    { id: 'siren', label: 'Pitch Siren', desc: 'Slide your voice from low to high and back down, like a siren. Watch the pitch curve follow your voice!', icon: '\uD83D\uDE92' },
    { id: 'breathing', label: 'Belly Breathing', desc: 'Breathe in for 4 counts through your nose. Hold for 4. Breathe out slowly for 6 counts through your mouth. Repeat 3 times.', icon: '\uD83C\uDF2C\uFE0F' },
    { id: 'humming', label: 'Humming Scale', desc: 'Hum up a scale: mmm-mmm-mmm-mmm-mmm, going from low to high. Feel the vibration in your lips and nose!', icon: '\uD83C\uDFB5' },
    { id: 'tongue', label: 'Tongue Twisters', desc: 'Say "She sells seashells by the seashore" three times, getting a little faster each time. Watch your pacing speedometer!', icon: '\uD83D\uDC45' },
    { id: 'projection', label: 'Volume Ladder', desc: 'Say "Hello" at whisper volume, then normal, then projecting (like across a room). Watch the volume meter change!', icon: '\uD83D\uDCE2' }
  ];

  // ═══════════════════════════════════════════
  // Tool Registration
  // ═══════════════════════════════════════════

  window.StemLab.registerTool('oratory', {
    icon: '\uD83D\uDDE3\uFE0F',
    label: 'Oratory Lab',
    desc: 'Real-time speech prosody visualization \u2014 pitch, pacing, volume & intonation practice',
    color: 'violet',
    category: 'science',
    questHooks: [
      { id: 'complete_warm_up', label: 'Complete a vocal warm-up exercise', icon: '\uD83C\uDFA4', check: function(d) { return (d.warmUpsCompleted || 0) >= 1; }, progress: function(d) { return (d.warmUpsCompleted || 0) + '/1'; } },
      { id: 'practice_5_phrases', label: 'Practice 5 phrases with prosody feedback', icon: '\uD83D\uDCCA', check: function(d) { return (d.phrasesAnalyzed || 0) >= 5; }, progress: function(d) { return (d.phrasesAnalyzed || 0) + '/5'; } },
      { id: 'achieve_smooth_pacing', label: 'Achieve "smooth" pacing rating', icon: '\uD83C\uDFC6', check: function(d) { return d.achievedSmoothPacing; }, progress: function(d) { return d.achievedSmoothPacing ? '\u2713' : '\u2014'; } }
    ],

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var isDark = ctx.isDark;
      var isContrast = ctx.isContrast;
      var canvasNarrate = ctx.canvasNarrate;

      return (function() {
        var d = (labToolData.oratory) || {};
        var upd = function(key, val) {
          var _k = {};
          _k[key] = val;
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { oratory: Object.assign({}, prev.oratory || {}, _k) });
          });
        };
        var updAll = function(patch) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { oratory: Object.assign({}, prev.oratory || {}, patch) });
          });
        };

        // Canvas narration
        if (typeof canvasNarrate === 'function') {
          canvasNarrate('oratory', 'init', {
            first: 'Oratory and Prosody Communication Lab loaded. This tool visualizes your speech in real time: pitch, pacing, volume, and pauses. Start by clicking the microphone button to begin.',
            repeat: 'Oratory Lab active.',
            terse: 'Oratory Lab.'
          }, { debounce: 800 });
        }

        // ── Persisted state (via ctx.update) ──
        var warmUpsCompleted = d.warmUpsCompleted || 0;
        var phrasesAnalyzed = d.phrasesAnalyzed || 0;
        var achievedSmoothPacing = d.achievedSmoothPacing || false;
        var sessionStartTime = d.sessionStartTime || null;
        var totalPhrases = d.totalPhrases || 0;
        var cachedExercises = d.cachedExercises || null;
        var bestSteadiness = d.bestSteadiness || 0;
        var bestPacingScore = d.bestPacingScore || 0;
        var sessionWpmReadings = d.sessionWpmReadings || [];
        var sessionPitchRange = d.sessionPitchRange || { min: 9999, max: 0 };
        var sessionTimeSpent = d.sessionTimeSpent || 0;
        var fluencySessions = d.fluencySessions || [];

        // ── Ephemeral state (local React state) ──
        var tabState = React.useState('visualizer');
        var activeTab = tabState[0];
        var setActiveTab = tabState[1];

        // Audio engine refs
        var audioCtxRef = React.useRef(null);
        var analyserRef = React.useRef(null);
        var streamRef = React.useRef(null);
        var animFrameRef = React.useRef(null);
        var sourceRef = React.useRef(null);

        // Recording state
        var recordingState = React.useState(false);
        var isRecording = recordingState[0];
        var setIsRecording = recordingState[1];

        var micErrorState = React.useState(null);
        var micError = micErrorState[0];
        var setMicError = micErrorState[1];

        // Real-time audio data
        var pitchHistoryState = React.useState([]);
        var pitchHistory = pitchHistoryState[0];
        var setPitchHistory = pitchHistoryState[1];

        var currentPitchState = React.useState(-1);
        var currentPitch = currentPitchState[0];
        var setCurrentPitch = currentPitchState[1];

        var currentDbState = React.useState(-100);
        var currentDb = currentDbState[0];
        var setCurrentDb = currentDbState[1];

        var volumeHistoryState = React.useState([]);
        var volumeHistory = volumeHistoryState[0];
        var setVolumeHistory = volumeHistoryState[1];

        var wpmState = React.useState(0);
        var currentWpm = wpmState[0];
        var setCurrentWpm = wpmState[1];

        // Pause detection
        var isPausedState = React.useState(false);
        var isPaused = isPausedState[0];
        var setIsPaused = isPausedState[1];

        var pauseDurationState = React.useState(0);
        var pauseDuration = pauseDurationState[0];
        var setPauseDuration = pauseDurationState[1];

        var pauseRatioState = React.useState(0);
        var pauseRatio = pauseRatioState[0];
        var setPauseRatio = pauseRatioState[1];

        // Syllable counting for WPM estimation
        var syllableCountRef = React.useRef(0);
        var lastAmplitudeRef = React.useRef(0);
        var syllableTimestampsRef = React.useRef([]);
        var pauseStartRef = React.useRef(null);
        var totalPauseTimeRef = React.useRef(0);
        var totalSpeechTimeRef = React.useRef(0);
        var recordingStartRef = React.useRef(null);

        // Model curve for comparison
        var modelCurveState = React.useState(null);
        var modelCurve = modelCurveState[0];
        var setModelCurve = modelCurveState[1];

        var showModelState = React.useState(false);
        var showModel = showModelState[0];
        var setShowModel = showModelState[1];

        // Practice exercises state
        var exerciseTypeState = React.useState(null);
        var exerciseType = exerciseTypeState[0];
        var setExerciseType = exerciseTypeState[1];

        var exerciseIndexState = React.useState(0);
        var exerciseIndex = exerciseIndexState[0];
        var setExerciseIndex = exerciseIndexState[1];

        var exerciseActiveState = React.useState(false);
        var exerciseActive = exerciseActiveState[0];
        var setExerciseActive = exerciseActiveState[1];

        var aiExercisesState = React.useState(null);
        var aiExercises = aiExercisesState[0];
        var setAiExercises = aiExercisesState[1];

        var aiLoadingState = React.useState(false);
        var aiLoading = aiLoadingState[0];
        var setAiLoading = aiLoadingState[1];

        // Multilingual state
        var selectedLangState = React.useState('en');
        var selectedLang = selectedLangState[0];
        var setSelectedLang = selectedLangState[1];

        var customLangState = React.useState('');
        var customLang = customLangState[0];
        var setCustomLang = customLangState[1];

        var multiPhraseState = React.useState('');
        var multiPhrase = multiPhraseState[0];
        var setMultiPhrase = multiPhraseState[1];

        var modelAudioUrlState = React.useState(null);
        var modelAudioUrl = modelAudioUrlState[0];
        var setModelAudioUrl = modelAudioUrlState[1];

        var multiModeState = React.useState('idle'); // 'idle' | 'modeling' | 'yourTurn' | 'comparing'
        var multiMode = multiModeState[0];
        var setMultiMode = multiModeState[1];

        var multiModelCurveState = React.useState(null);
        var multiModelCurve = multiModelCurveState[0];
        var setMultiModelCurve = multiModelCurveState[1];

        var ttsLoadingState = React.useState(false);
        var ttsLoading = ttsLoadingState[0];
        var setTtsLoading = ttsLoadingState[1];

        // Warm-up state
        var warmupActiveState = React.useState(null);
        var warmupActive = warmupActiveState[0];
        var setWarmupActive = warmupActiveState[1];

        // Session report state
        var reportTextState = React.useState(null);
        var reportText = reportTextState[0];
        var setReportText = reportTextState[1];

        var copiedState = React.useState(false);
        var copied = copiedState[0];
        var setCopied = copiedState[1];

        // Canvas refs
        var pitchCanvasRef = React.useRef(null);
        var pacingCanvasRef = React.useRef(null);
        var volumeCanvasRef = React.useRef(null);
        var pauseCanvasRef = React.useRef(null);

        // Emphasis word selection
        var emphasisWordState = React.useState(0);
        var emphasisWord = emphasisWordState[0];
        var setEmphasisWord = emphasisWordState[1];

        // Emotion selection
        var emotionIndexState = React.useState(0);
        var emotionIndex = emotionIndexState[0];
        var setEmotionIndex = emotionIndexState[1];

        // Volume challenge timer
        var volumeTimerState = React.useState(0);
        var volumeTimer = volumeTimerState[0];
        var setVolumeTimer = volumeTimerState[1];

        var volumeTimerRefId = React.useRef(null);

        // ════════════════════════════════════════
        // Enhancement 1: Recording Playback State
        // ════════════════════════════════════════
        var mediaRecorderRef = React.useRef(null);
        var recordedChunksRef = React.useRef([]);

        var savedRecordingsState = React.useState([]); // [{blobUrl, timestamp, duration, pitchData, volumeData}]
        var savedRecordings = savedRecordingsState[0];
        var setSavedRecordings = savedRecordingsState[1];

        var playbackAudioRef = React.useRef(null);

        var playbackState = React.useState('stopped'); // 'stopped' | 'playing' | 'paused'
        var playbackStatus = playbackState[0];
        var setPlaybackStatus = playbackState[1];

        var playbackProgressState = React.useState(0);
        var playbackProgress = playbackProgressState[0];
        var setPlaybackProgress = playbackProgressState[1];

        var playbackIdxState = React.useState(-1); // which recording is currently being played
        var playbackIdx = playbackIdxState[0];
        var setPlaybackIdx = playbackIdxState[1];

        var playbackCanvasRef = React.useRef(null);
        var playbackRafRef = React.useRef(null);

        // Compare mode
        var compareState = React.useState(false);
        var compareMode = compareState[0];
        var setCompareMode = compareState[1];

        var compareIdx1State = React.useState(0);
        var compareIdx1 = compareIdx1State[0];
        var setCompareIdx1 = compareIdx1State[1];

        var compareIdx2State = React.useState(1);
        var compareIdx2 = compareIdx2State[0];
        var setCompareIdx2 = compareIdx2State[1];

        var compareCanvasRef = React.useRef(null);

        // ════════════════════════════════════════
        // Enhancement 2: Intonation Pattern State
        // ════════════════════════════════════════
        var selectedPatternState = React.useState(null);
        var selectedPattern = selectedPatternState[0];
        var setSelectedPattern = selectedPatternState[1];

        var patternPracticeState = React.useState(false);
        var patternPracticing = patternPracticeState[0];
        var setPatternPracticing = patternPracticeState[1];

        var patternScoreState = React.useState(null);
        var patternScore = patternScoreState[0];
        var setPatternScore = patternScoreState[1];

        var patternStudentCurveState = React.useState(null);
        var patternStudentCurve = patternStudentCurveState[0];
        var setPatternStudentCurve = patternStudentCurveState[1];

        var patternCanvasRef = React.useRef(null);

        // ════════════════════════════════════════
        // Enhancement 3: Vowel Lab State
        // ════════════════════════════════════════
        var vowelLabOpenState = React.useState(false);
        var vowelLabOpen = vowelLabOpenState[0];
        var setVowelLabOpen = vowelLabOpenState[1];

        var vowelLangState = React.useState('en');
        var vowelLang = vowelLangState[0];
        var setVowelLang = vowelLangState[1];

        var currentF1State = React.useState(0);
        var currentF1 = currentF1State[0];
        var setCurrentF1 = currentF1State[1];

        var currentF2State = React.useState(0);
        var currentF2 = currentF2State[0];
        var setCurrentF2 = currentF2State[1];

        var vowelTrailState = React.useState([]);
        var vowelTrail = vowelTrailState[0];
        var setVowelTrail = vowelTrailState[1];

        var vowelCanvasRef = React.useRef(null);

        // ════════════════════════════════════════
        // Enhancement 4: Fluency Tracker State
        // ════════════════════════════════════════
        var fluencyOpenState = React.useState(false);
        var fluencyOpen = fluencyOpenState[0];
        var setFluencyOpen = fluencyOpenState[1];

        // Pause classification accumulator
        var pauseEventsRef = React.useRef([]); // [{type: 'normal'|'extended'|'block', duration: secs}]
        var syllableIntervalsRef = React.useRef([]); // inter-syllable intervals in ms

        var fluencyScoreState = React.useState(null);
        var fluencyScore = fluencyScoreState[0];
        var setFluencyScore = fluencyScoreState[1];

        var fluencyStarsState = React.useState(0);
        var fluencyStars = fluencyStarsState[0];
        var setFluencyStars = fluencyStarsState[1];

        var fluencyDetailsState = React.useState(null);
        var fluencyDetails = fluencyDetailsState[0];
        var setFluencyDetails = fluencyDetailsState[1];

        var fluencyChartCanvasRef = React.useRef(null);

        // ════════════════════════════════════════
        // Audio Engine: Start / Stop
        // ════════════════════════════════════════

        var startRecording = React.useCallback(function() {
          if (isRecording) return;
          setMicError(null);

          navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
              streamRef.current = stream;
              var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              audioCtxRef.current = audioCtx;
              var source = audioCtx.createMediaStreamSource(stream);
              sourceRef.current = source;
              var analyser = audioCtx.createAnalyser();
              analyser.fftSize = 4096;
              source.connect(analyser);
              analyserRef.current = analyser;

              // Enhancement 1: MediaRecorder integration
              try {
                var mimeType = 'audio/webm';
                if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
                  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                    mimeType = 'audio/webm;codecs=opus';
                  } else if (MediaRecorder.isTypeSupported('audio/webm')) {
                    mimeType = 'audio/webm';
                  } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                  }
                }
                var mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
                recordedChunksRef.current = [];
                mediaRecorder.ondataavailable = function(e) {
                  if (e.data && e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                  }
                };
                mediaRecorder.start(100); // collect in 100ms chunks
                mediaRecorderRef.current = mediaRecorder;
              } catch(mrErr) {
                console.warn('[Oratory] MediaRecorder not available:', mrErr);
                mediaRecorderRef.current = null;
              }

              setIsRecording(true);
              recordingStartRef.current = Date.now();
              syllableCountRef.current = 0;
              syllableTimestampsRef.current = [];
              lastAmplitudeRef.current = 0;
              pauseStartRef.current = null;
              totalPauseTimeRef.current = 0;
              totalSpeechTimeRef.current = 0;
              pauseEventsRef.current = [];
              syllableIntervalsRef.current = [];

              if (!sessionStartTime) {
                upd('sessionStartTime', Date.now());
              }

              if (announceToSR) announceToSR('Microphone active. Speak now to see your prosody visualized.');

              // Start the analysis loop
              var bufLen = analyser.fftSize;
              var buf = new Float32Array(bufLen);
              var freqBuf = new Float32Array(analyser.frequencyBinCount);
              var sampleRate = audioCtx.sampleRate;
              var pauseThresholdMs = 300; // 300ms of silence = a pause
              var wasSpeaking = false;
              var lastSyllableTs = 0;

              function analyzeLoop() {
                analyser.getFloatTimeDomainData(buf);
                var rms = calculateRMS(buf);
                var db = rmsToDb(rms);
                var pitch = autoCorrelate(buf, sampleRate);

                // Enhancement 3: Formant detection for vowel lab
                analyser.getFloatFrequencyData(freqBuf);
                var formants = findFormants(freqBuf, sampleRate);
                if (formants.f1 > 0 && formants.f2 > 0 && rms > 0.02) {
                  setCurrentF1(formants.f1);
                  setCurrentF2(formants.f2);
                  setVowelTrail(function(prev) {
                    var next = prev.concat([{ f1: formants.f1, f2: formants.f2 }]);
                    if (next.length > 80) next = next.slice(-80);
                    return next;
                  });
                }

                setCurrentPitch(pitch);
                setCurrentDb(db);

                setPitchHistory(function(prev) {
                  var next = prev.concat([pitch]);
                  if (next.length > 300) next = next.slice(-300);
                  return next;
                });

                setVolumeHistory(function(prev) {
                  var next = prev.concat([db]);
                  if (next.length > 300) next = next.slice(-300);
                  return next;
                });

                // Syllable / WPM estimation via amplitude envelope
                var currentAmplitude = rms;
                var syllableThreshold = 0.04;
                var prevAmp = lastAmplitudeRef.current;
                // Detect rising edge through threshold — approximate syllable onset
                if (currentAmplitude > syllableThreshold && prevAmp <= syllableThreshold) {
                  syllableCountRef.current += 1;
                  var syllTs = Date.now();
                  syllableTimestampsRef.current.push(syllTs);
                  // Enhancement 4: track inter-syllable intervals
                  if (lastSyllableTs > 0) {
                    syllableIntervalsRef.current.push(syllTs - lastSyllableTs);
                  }
                  lastSyllableTs = syllTs;
                }
                lastAmplitudeRef.current = currentAmplitude;

                // WPM calculation: syllables in last 10 seconds, scaled
                var now = Date.now();
                var windowMs = 10000;
                var recentSyllables = syllableTimestampsRef.current.filter(function(ts) { return now - ts < windowMs; });
                // Average English word ~ 1.5 syllables
                var wordsInWindow = recentSyllables.length / 1.5;
                var estimatedWpm = Math.round(wordsInWindow * (60000 / windowMs));
                setCurrentWpm(estimatedWpm);

                // Pause detection
                var isSilent = rms < 0.015;
                if (isSilent) {
                  if (wasSpeaking) {
                    // Just entered a pause
                    pauseStartRef.current = now;
                    wasSpeaking = false;
                  }
                  if (pauseStartRef.current && (now - pauseStartRef.current) > pauseThresholdMs) {
                    setIsPaused(true);
                    setPauseDuration((now - pauseStartRef.current) / 1000);
                  }
                } else {
                  if (!wasSpeaking && pauseStartRef.current) {
                    // Was pausing, now speaking again — classify the pause
                    var pDur = (now - pauseStartRef.current) / 1000;
                    totalPauseTimeRef.current += (now - pauseStartRef.current);
                    // Enhancement 4: classify pause
                    if (pDur >= 0.3) {
                      var pType = 'normal';
                      if (pDur > 2.0) pType = 'block';
                      else if (pDur > 0.5) pType = 'extended';
                      pauseEventsRef.current.push({ type: pType, duration: pDur });
                    }
                    pauseStartRef.current = null;
                  }
                  wasSpeaking = true;
                  setIsPaused(false);
                  setPauseDuration(0);
                  totalSpeechTimeRef.current = now - (recordingStartRef.current || now) - totalPauseTimeRef.current;
                }

                // Pause ratio
                var totalElapsed = now - (recordingStartRef.current || now);
                if (totalElapsed > 1000) {
                  var currentPauseTime = totalPauseTimeRef.current + (pauseStartRef.current ? (now - pauseStartRef.current) : 0);
                  setPauseRatio(currentPauseTime / totalElapsed);
                }

                animFrameRef.current = requestAnimationFrame(analyzeLoop);
              }

              analyzeLoop();
            })
            .catch(function(err) {
              console.error('[Oratory] Mic error:', err);
              setMicError('Could not access microphone. Please allow microphone permissions and try again.');
              if (announceToSR) announceToSR('Microphone access denied. Please allow microphone permissions.');
            });
        }, [isRecording, sessionStartTime]);

        var stopRecording = React.useCallback(function() {
          if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
          }

          // Enhancement 1: Stop MediaRecorder and save recording
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
              mediaRecorderRef.current.stop();
            } catch(e) { /* ignore */ }
            // Save recording after a short delay to allow final data
            setTimeout(function() {
              var chunks = recordedChunksRef.current;
              if (chunks && chunks.length > 0) {
                var blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });
                var blobUrl = URL.createObjectURL(blob);
                var duration = recordingStartRef.current ? Math.round((Date.now() - recordingStartRef.current) / 1000) : 0;
                var newRecording = {
                  blobUrl: blobUrl,
                  timestamp: Date.now(),
                  duration: duration,
                  pitchData: pitchHistory.slice(),
                  volumeData: volumeHistory.slice()
                };
                setSavedRecordings(function(prev) {
                  var next = prev.concat([newRecording]);
                  // Keep only last 3
                  if (next.length > 3) {
                    // Revoke oldest blob URL
                    URL.revokeObjectURL(next[0].blobUrl);
                    next = next.slice(-3);
                  }
                  return next;
                });
              }
              recordedChunksRef.current = [];
            }, 200);
            mediaRecorderRef.current = null;
          }

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(function(track) { track.stop(); });
            streamRef.current = null;
          }
          if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
          }
          if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(function() {});
            audioCtxRef.current = null;
          }
          analyserRef.current = null;
          setIsRecording(false);

          // Update session time
          if (recordingStartRef.current) {
            var elapsed = Math.round((Date.now() - recordingStartRef.current) / 1000);
            upd('sessionTimeSpent', (sessionTimeSpent || 0) + elapsed);
          }

          if (announceToSR) announceToSR('Microphone stopped.');
        }, [sessionTimeSpent, pitchHistory, volumeHistory]);

        // Cleanup on unmount
        React.useEffect(function() {
          return function() {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(function(track) { track.stop(); });
            }
            if (audioCtxRef.current) {
              audioCtxRef.current.close().catch(function() {});
            }
            if (volumeTimerRefId.current) clearInterval(volumeTimerRefId.current);
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
            if (playbackAudioRef.current) {
              playbackAudioRef.current.pause();
              playbackAudioRef.current = null;
            }
            // Revoke saved recording URLs
            savedRecordings.forEach(function(rec) {
              if (rec.blobUrl) URL.revokeObjectURL(rec.blobUrl);
            });
          };
        }, []);

        // Canvas rendering loop
        React.useEffect(function() {
          var rafId = null;
          function renderCanvases() {
            drawProsodyCurve(pitchCanvasRef.current, pitchHistory, isDark, modelCurve);
            drawPacingGauge(pacingCanvasRef.current, currentWpm, gradeLevel, isDark);
            var volResult = drawVolumeMeter(volumeCanvasRef.current, currentDb, volumeHistory, isDark);
            drawPauseIndicator(pauseCanvasRef.current, isPaused, pauseDuration, pauseRatio, isDark);

            // Enhancement 3: Vowel space rendering
            if (vowelLabOpen) {
              var vMap = VOWEL_MAPS[vowelLang] || VOWEL_MAPS.en;
              drawVowelSpace(vowelCanvasRef.current, vMap, currentF1, currentF2, vowelTrail, isDark);
            }

            // Track pitch range for session report
            if (currentPitch > 0) {
              var prevRange = sessionPitchRange || { min: 9999, max: 0 };
              if (currentPitch < prevRange.min || currentPitch > prevRange.max) {
                updAll({
                  sessionPitchRange: {
                    min: Math.min(prevRange.min, currentPitch),
                    max: Math.max(prevRange.max, currentPitch)
                  }
                });
              }
            }

            if (isRecording) {
              rafId = requestAnimationFrame(renderCanvases);
            }
          }

          if (isRecording) {
            rafId = requestAnimationFrame(renderCanvases);
          } else {
            // Draw once more when stopped to show final state
            drawProsodyCurve(pitchCanvasRef.current, pitchHistory, isDark, modelCurve);
            drawPacingGauge(pacingCanvasRef.current, currentWpm, gradeLevel, isDark);
            drawVolumeMeter(volumeCanvasRef.current, currentDb, volumeHistory, isDark);
            drawPauseIndicator(pauseCanvasRef.current, isPaused, pauseDuration, pauseRatio, isDark);
            if (vowelLabOpen) {
              var vMap = VOWEL_MAPS[vowelLang] || VOWEL_MAPS.en;
              drawVowelSpace(vowelCanvasRef.current, vMap, currentF1, currentF2, vowelTrail, isDark);
            }
          }

          return function() {
            if (rafId) cancelAnimationFrame(rafId);
          };
        }, [isRecording, pitchHistory, currentWpm, currentDb, volumeHistory, isPaused, pauseDuration, pauseRatio, isDark, modelCurve, currentPitch, vowelLabOpen, vowelLang, currentF1, currentF2, vowelTrail]);

        // ════════════════════════════════════
        // Helper: Reset all ephemeral data
        // ════════════════════════════════════
        function resetSession() {
          if (isRecording) stopRecording();
          setPitchHistory([]);
          setCurrentPitch(-1);
          setCurrentDb(-100);
          setVolumeHistory([]);
          setCurrentWpm(0);
          setIsPaused(false);
          setPauseDuration(0);
          setPauseRatio(0);
          setModelCurve(null);
          setVowelTrail([]);
          setCurrentF1(0);
          setCurrentF2(0);
          setFluencyScore(null);
          setFluencyStars(0);
          setFluencyDetails(null);
          pauseEventsRef.current = [];
          syllableIntervalsRef.current = [];
          syllableCountRef.current = 0;
          syllableTimestampsRef.current = [];
          if (addToast) addToast('Session reset.', 'info');
          if (announceToSR) announceToSR('Session data cleared.');
        }

        // ════════════════════════════════════
        // Model Prosody: TTS demo + trace
        // ════════════════════════════════════
        function playModelPhrase(text, voice) {
          if (!callTTS) {
            if (addToast) addToast('TTS not available.', 'error');
            return;
          }
          setTtsLoading(true);
          callTTS(text, voice || 'Kore', 1.0)
            .then(function(audioUrl) {
              setTtsLoading(false);
              if (!audioUrl) {
                if (addToast) addToast('Could not generate speech model.', 'error');
                return;
              }
              setModelAudioUrl(audioUrl);
              // Play the audio
              var audio = new Audio(audioUrl);
              audio.play().catch(function(e) { console.warn('[Oratory] Audio play error:', e); });

              // Generate a synthetic model curve (a smooth pitch contour)
              // This simulates what ideal prosody looks like for the phrase
              var wordCount = text.split(/\s+/).length;
              var points = Math.max(50, wordCount * 8);
              var curve = [];
              for (var ci = 0; ci < points; ci++) {
                var t_norm = ci / points;
                // Natural speech has slight rise at start, peak at ~60%, gentle fall at end
                var basePitch = 160;
                var contour = basePitch + 40 * Math.sin(t_norm * Math.PI * 0.9) + 15 * Math.sin(t_norm * Math.PI * 3.5);
                // Add slight variation
                contour += (Math.random() - 0.5) * 8;
                curve.push(Math.round(contour));
              }
              setModelCurve(curve);
              if (announceToSR) announceToSR('Model phrase playing. Listen to the rhythm and pitch, then try to match it.');
            })
            .catch(function(err) {
              setTtsLoading(false);
              console.error('[Oratory] TTS error:', err);
              if (addToast) addToast('Error generating speech model.', 'error');
            });
        }

        // ════════════════════════════════════
        // AI Exercise Generation
        // ════════════════════════════════════
        function generateExercises(type) {
          if (!callGemini) {
            if (addToast) addToast('AI not available. Using built-in exercises.', 'info');
            return;
          }
          setAiLoading(true);
          var gradeText = gradeLevel ? 'grade ' + gradeLevel : 'elementary school';
          var prompt = '';

          if (type === 'emotion') {
            prompt = 'Generate 3 short, simple phrases appropriate for a ' + gradeText + ' student. Each phrase should be 4-8 words. For each phrase, provide 4 emotions to say it with. Return ONLY a JSON array like: [{"phrase":"...","emotions":["Happy","Sad","Angry","Surprised"]}]. No explanation, just JSON.';
          } else if (type === 'question') {
            prompt = 'Generate 3 short sentences appropriate for a ' + gradeText + ' student (4-8 words each). Each can be said as a statement or question. Return ONLY a JSON array like: [{"statement":"The cat is sleeping.","question":"The cat is sleeping?"}]. No explanation, just JSON.';
          } else if (type === 'emphasis') {
            prompt = 'Generate 2 sentences appropriate for a ' + gradeText + ' student (6-10 words each) where changing word emphasis changes meaning. For each, list 3-5 key words that can be emphasized, and what meaning each emphasis creates. Return ONLY a JSON array like: [{"base":"...","words":["word1","word2"],"meanings":["meaning when word1 stressed","meaning when word2 stressed"]}]. No explanation, just JSON.';
          } else if (type === 'pacing') {
            prompt = 'Generate 2 short reading passages (2-3 sentences each) appropriate for a ' + gradeText + ' student. Include a target words-per-minute for each. Return ONLY a JSON array like: [{"text":"...","targetWpm":120}]. No explanation, just JSON.';
          } else if (type === 'volume') {
            prompt = 'Generate 2 short speaking prompts (1-2 sentences) appropriate for a ' + gradeText + ' student for a volume consistency exercise. Return ONLY a JSON array like: [{"text":"...","duration":10}]. No explanation, just JSON.';
          }

          callGemini(prompt)
            .then(function(response) {
              setAiLoading(false);
              try {
                // Extract JSON from response
                var jsonStr = response;
                var match = response.match(/\[[\s\S]*\]/);
                if (match) jsonStr = match[0];
                var parsed = JSON.parse(jsonStr);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setAiExercises(parsed);
                  // Cache in tool data
                  var cached = cachedExercises || {};
                  cached[type] = parsed;
                  upd('cachedExercises', cached);
                  if (announceToSR) announceToSR('New exercises generated. Pick one to practice.');
                  return;
                }
              } catch(e) {
                console.warn('[Oratory] AI parse error:', e);
              }
              if (addToast) addToast('Could not parse AI exercises. Using built-in ones.', 'info');
              setAiExercises(null);
            })
            .catch(function(err) {
              setAiLoading(false);
              console.error('[Oratory] AI error:', err);
              if (addToast) addToast('AI generation failed. Using built-in exercises.', 'info');
              setAiExercises(null);
            });
        }

        // Get exercises for current type (AI-generated or built-in)
        function getExercises(type) {
          if (aiExercises && exerciseType === type) return aiExercises;
          if (cachedExercises && cachedExercises[type]) return cachedExercises[type];
          return STARTER_EXERCISES[type] || [];
        }

        // ════════════════════════════════════
        // Complete a phrase analysis
        // ════════════════════════════════════
        function recordPhraseCompletion() {
          var newCount = (phrasesAnalyzed || 0) + 1;
          var updates = { phrasesAnalyzed: newCount, totalPhrases: (totalPhrases || 0) + 1 };
          // Check smooth pacing quest
          if (currentWpm >= 90 && currentWpm <= 160 && !achievedSmoothPacing) {
            updates.achievedSmoothPacing = true;
            if (stemCelebrate) stemCelebrate();
            if (addToast) addToast('Achievement unlocked: Smooth Pacing!', 'success');
            if (awardStemXP) awardStemXP('oratory_smooth_pacing', 25, 'Achieved smooth pacing rating');
          }
          // Track WPM readings
          if (currentWpm > 0) {
            var readings = (sessionWpmReadings || []).concat([currentWpm]);
            updates.sessionWpmReadings = readings;
          }
          updAll(updates);
          if (awardStemXP) awardStemXP('oratory_phrase', 5, 'Practiced a phrase with prosody feedback');
          if (announceToSR) announceToSR('Phrase recorded. Total phrases analyzed: ' + newCount);
        }

        // ════════════════════════════════════
        // Complete a warm-up
        // ════════════════════════════════════
        function completeWarmup(warmupId) {
          var newCount = (warmUpsCompleted || 0) + 1;
          upd('warmUpsCompleted', newCount);
          setWarmupActive(null);
          if (awardStemXP) awardStemXP('oratory_warmup', 10, 'Completed vocal warm-up: ' + warmupId);
          if (newCount === 1 && stemCelebrate) stemCelebrate();
          if (addToast) addToast('Warm-up complete! Great job warming up your voice.', 'success');
          if (announceToSR) announceToSR('Warm-up exercise completed. Total warm-ups: ' + newCount);
        }

        // ════════════════════════════════════
        // Multilingual: Model then Match flow
        // ════════════════════════════════════
        function generateMultiPhrase() {
          var lang = customLang || LANGUAGES.find(function(l) { return l.code === selectedLang; });
          var langName = typeof lang === 'string' ? lang : (lang ? lang.name : 'English');
          if (!callGemini) {
            setMultiPhrase('Hello, how are you today?');
            return;
          }
          setAiLoading(true);
          var gradeText = gradeLevel ? 'grade ' + gradeLevel : 'elementary school';
          callGemini('Generate a single simple phrase (5-10 words) in ' + langName + ' appropriate for a ' + gradeText + ' student. Include the translation in English in parentheses. Return ONLY the phrase, nothing else.')
            .then(function(response) {
              setAiLoading(false);
              setMultiPhrase(response.trim());
            })
            .catch(function() {
              setAiLoading(false);
              setMultiPhrase('Hello, how are you today?');
            });
        }

        function modelMultiPhrase() {
          if (!multiPhrase) return;
          setMultiMode('modeling');
          playModelPhrase(multiPhrase);
          setMultiModelCurve(modelCurve);
          // After a delay, switch to "your turn"
          setTimeout(function() {
            setMultiMode('yourTurn');
            if (announceToSR) announceToSR('Your turn! Speak the phrase and try to match the model.');
          }, 3000);
        }

        // ════════════════════════════════════
        // Enhancement 1: Playback Controls
        // ════════════════════════════════════
        function startPlayback(idx) {
          var rec = savedRecordings[idx];
          if (!rec) return;

          // Stop any current playback
          stopPlayback();

          var audio = new Audio(rec.blobUrl);
          playbackAudioRef.current = audio;
          setPlaybackIdx(idx);
          setPlaybackStatus('playing');
          setPlaybackProgress(0);

          audio.onended = function() {
            setPlaybackStatus('stopped');
            setPlaybackProgress(1);
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
          };

          audio.play().catch(function(e) {
            console.warn('[Oratory] Playback error:', e);
            setPlaybackStatus('stopped');
          });

          // Animate playback progress
          function updateProgress() {
            if (audio && audio.duration && !isNaN(audio.duration)) {
              setPlaybackProgress(audio.currentTime / audio.duration);
            }
            // Redraw playback canvas
            drawPlaybackProsody(
              playbackCanvasRef.current,
              rec.pitchData,
              rec.volumeData,
              audio && audio.duration ? (audio.currentTime / audio.duration) : 0,
              isDark
            );
            if (audio && !audio.paused && !audio.ended) {
              playbackRafRef.current = requestAnimationFrame(updateProgress);
            }
          }
          playbackRafRef.current = requestAnimationFrame(updateProgress);
        }

        function pausePlayback() {
          if (playbackAudioRef.current && !playbackAudioRef.current.paused) {
            playbackAudioRef.current.pause();
            setPlaybackStatus('paused');
            if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
          }
        }

        function resumePlayback() {
          if (playbackAudioRef.current && playbackAudioRef.current.paused) {
            playbackAudioRef.current.play().catch(function() {});
            setPlaybackStatus('playing');
            var rec = savedRecordings[playbackIdx];
            function updateProgress() {
              var audio = playbackAudioRef.current;
              if (audio && audio.duration && !isNaN(audio.duration)) {
                setPlaybackProgress(audio.currentTime / audio.duration);
              }
              if (rec) {
                drawPlaybackProsody(
                  playbackCanvasRef.current,
                  rec.pitchData,
                  rec.volumeData,
                  audio && audio.duration ? (audio.currentTime / audio.duration) : 0,
                  isDark
                );
              }
              if (audio && !audio.paused && !audio.ended) {
                playbackRafRef.current = requestAnimationFrame(updateProgress);
              }
            }
            playbackRafRef.current = requestAnimationFrame(updateProgress);
          }
        }

        function stopPlayback() {
          if (playbackAudioRef.current) {
            playbackAudioRef.current.pause();
            playbackAudioRef.current.currentTime = 0;
            playbackAudioRef.current = null;
          }
          if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
          setPlaybackStatus('stopped');
          setPlaybackProgress(0);
          setPlaybackIdx(-1);
        }

        // ════════════════════════════════════
        // Enhancement 4: Compute Fluency Score
        // ════════════════════════════════════
        function computeFluencyScore() {
          var pauseEvents = pauseEventsRef.current;
          var syllIntervals = syllableIntervalsRef.current;
          var volHist = volumeHistory.slice();

          // 1. Pause regularity score (0-100)
          var normalPauses = 0, extendedPauses = 0, blocks = 0;
          for (var pi = 0; pi < pauseEvents.length; pi++) {
            if (pauseEvents[pi].type === 'normal') normalPauses++;
            else if (pauseEvents[pi].type === 'extended') extendedPauses++;
            else if (pauseEvents[pi].type === 'block') blocks++;
          }
          var totalPauses = pauseEvents.length || 1;
          var pauseScore = Math.max(0, 100 - (extendedPauses * 15) - (blocks * 30));
          pauseScore = Math.min(100, pauseScore);

          // 2. Syllable rate consistency (CV)
          var syllCV = 0;
          if (syllIntervals.length > 3) {
            var sMean = 0;
            for (var si = 0; si < syllIntervals.length; si++) sMean += syllIntervals[si];
            sMean /= syllIntervals.length;
            var sVar = 0;
            for (var si2 = 0; si2 < syllIntervals.length; si2++) sVar += (syllIntervals[si2] - sMean) * (syllIntervals[si2] - sMean);
            sVar /= syllIntervals.length;
            var sStd = Math.sqrt(sVar);
            syllCV = sMean > 0 ? sStd / sMean : 1;
          }
          // Lower CV = better. CV < 0.3 = smooth, CV > 0.6 = cluttered
          var rhythmScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(syllCV, 1)) * 100)));

          // 3. Volume steadiness (reuse from volume meter)
          var volScore = 50;
          if (volHist.length > 10) {
            var vRecent = volHist.slice(-90);
            var vMean = 0;
            for (var vi = 0; vi < vRecent.length; vi++) vMean += vRecent[vi];
            vMean /= vRecent.length;
            var vVariance = 0;
            for (var vi2 = 0; vi2 < vRecent.length; vi2++) vVariance += (vRecent[vi2] - vMean) * (vRecent[vi2] - vMean);
            vVariance /= vRecent.length;
            var vStd = Math.sqrt(vVariance);
            var vCV = vMean !== 0 ? vStd / Math.abs(vMean) : 0;
            volScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(vCV, 1)) * 100)));
          }

          // Composite: weighted average
          var composite = Math.round(pauseScore * 0.35 + rhythmScore * 0.4 + volScore * 0.25);

          // Star rating: 1-5
          var stars = 1;
          if (composite >= 85) stars = 5;
          else if (composite >= 70) stars = 4;
          else if (composite >= 55) stars = 3;
          else if (composite >= 40) stars = 2;

          var starLabels = ['', 'Needs Support', 'Developing', 'Making Progress', 'Proficient', 'Fluent Speaker'];

          setFluencyScore(composite);
          setFluencyStars(stars);
          setFluencyDetails({
            pauseScore: pauseScore,
            rhythmScore: rhythmScore,
            volScore: volScore,
            normalPauses: normalPauses,
            extendedPauses: extendedPauses,
            blocks: blocks,
            syllCV: syllCV,
            starLabel: starLabels[stars] || ''
          });

          // Save to persisted fluency sessions
          var newSession = {
            timestamp: Date.now(),
            fluencyStars: stars,
            composite: composite,
            pauseScore: pauseScore,
            rhythmScore: rhythmScore,
            volScore: volScore
          };
          var sessions = (fluencySessions || []).concat([newSession]);
          if (sessions.length > 20) sessions = sessions.slice(-20);
          upd('fluencySessions', sessions);

          if (announceToSR) announceToSR('Fluency score calculated: ' + composite + ' percent, ' + stars + ' stars, ' + starLabels[stars]);
          if (addToast) addToast('Fluency analyzed: ' + stars + ' stars - ' + starLabels[stars], 'success');
        }

        // Draw fluency chart when sessions change
        React.useEffect(function() {
          if (fluencyOpen && fluencyChartCanvasRef.current) {
            drawFluencyBarChart(fluencyChartCanvasRef.current, fluencySessions, isDark);
          }
        }, [fluencyOpen, fluencySessions, isDark, fluencyScore]);

        // Draw compare canvas when in compare mode
        React.useEffect(function() {
          if (compareMode && compareCanvasRef.current && savedRecordings.length >= 2) {
            var d1 = savedRecordings[compareIdx1] ? savedRecordings[compareIdx1].pitchData : null;
            var d2 = savedRecordings[compareIdx2] ? savedRecordings[compareIdx2].pitchData : null;
            drawProsodyComparison(compareCanvasRef.current, d1, d2, isDark);
          }
        }, [compareMode, compareIdx1, compareIdx2, savedRecordings, isDark]);

        // Draw intonation pattern canvas
        React.useEffect(function() {
          if (selectedPattern && patternCanvasRef.current) {
            drawIntonationPattern(patternCanvasRef.current, selectedPattern.points, patternStudentCurve, isDark);
          }
        }, [selectedPattern, patternStudentCurve, isDark]);

        // ════════════════════════════════════
        // Generate Session Report
        // ════════════════════════════════════
        function generateReport() {
          var avgWpm = 0;
          var readings = sessionWpmReadings || [];
          if (readings.length > 0) {
            var sum = 0;
            for (var ri = 0; ri < readings.length; ri++) sum += readings[ri];
            avgWpm = Math.round(sum / readings.length);
          }

          var pitchRange = sessionPitchRange || { min: 0, max: 0 };
          var pitchMin = pitchRange.min === 9999 ? 0 : Math.round(pitchRange.min);
          var pitchMax = Math.round(pitchRange.max);

          var timeMin = Math.round((sessionTimeSpent || 0) / 60);

          // Enhancement 4: Include fluency metrics
          var fluencyLine = 'Fluency score: N/A';
          if (fluencyScore !== null) {
            fluencyLine = 'Fluency score: ' + fluencyScore + '/100 (' + fluencyStars + ' stars)';
          }
          var fluencyDetailLines = '';
          if (fluencyDetails) {
            fluencyDetailLines = '\n  Pause regularity: ' + fluencyDetails.pauseScore + '/100' +
              '\n  Rhythm consistency: ' + fluencyDetails.rhythmScore + '/100' +
              '\n  Volume steadiness: ' + fluencyDetails.volScore + '/100' +
              '\n  Normal pauses: ' + fluencyDetails.normalPauses +
              ', Extended pauses: ' + fluencyDetails.extendedPauses +
              ', Blocks: ' + fluencyDetails.blocks;
          }
          var fluencyHistoryLine = '';
          if (fluencySessions && fluencySessions.length > 1) {
            var firstScore = fluencySessions[0].fluencyStars;
            var lastScore = fluencySessions[fluencySessions.length - 1].fluencyStars;
            fluencyHistoryLine = '\nFluency trend: ' + fluencySessions.length + ' sessions tracked (' +
              firstScore + ' stars first session -> ' + lastScore + ' stars latest)';
          }

          var lines = [
            '=== Oratory Lab Session Report ===',
            'Date: ' + new Date().toLocaleDateString(),
            '',
            'Phrases practiced: ' + (totalPhrases || 0),
            'Warm-ups completed: ' + (warmUpsCompleted || 0),
            'Average pacing: ' + (avgWpm > 0 ? avgWpm + ' WPM' : 'N/A'),
            'Volume consistency best: ' + (bestSteadiness || 0) + '%',
            'Pitch range used: ' + (pitchMin > 0 ? pitchMin + ' - ' + pitchMax + ' Hz' : 'N/A'),
            'Time spent: ~' + (timeMin > 0 ? timeMin + ' minutes' : 'less than 1 minute'),
            'Smooth pacing achieved: ' + (achievedSmoothPacing ? 'Yes' : 'Not yet'),
            '',
            '--- Fluency Assessment ---',
            fluencyLine,
            fluencyDetailLines,
            fluencyHistoryLine,
            '',
            '--- Notes for SLP ---',
            'This student used the Oratory & Prosody Communication Lab for real-time',
            'speech visualization practice. The tool provides visual feedback on pitch',
            'contour, speaking rate, volume consistency, pause patterns, and fluency.',
            'Fluency metrics track pause classification (normal/extended/block),',
            'syllable rate consistency (CV), and volume steadiness.',
            '',
            'Generated by AlloFlow Oratory Lab'
          ];

          var text = lines.join('\n');
          setReportText(text);
          if (announceToSR) announceToSR('Session report generated. You can copy it to share with your S L P.');
        }

        function copyReport() {
          if (!reportText) return;
          navigator.clipboard.writeText(reportText).then(function() {
            setCopied(true);
            if (addToast) addToast('Report copied to clipboard!', 'success');
            setTimeout(function() { setCopied(false); }, 2000);
          }).catch(function() {
            if (addToast) addToast('Could not copy. Try selecting the text manually.', 'error');
          });
        }

        // ════════════════════════════════════
        // Volume challenge timer
        // ════════════════════════════════════
        function startVolumeChallenge() {
          setVolumeTimer(10);
          setExerciseActive(true);
          if (volumeTimerRefId.current) clearInterval(volumeTimerRefId.current);
          volumeTimerRefId.current = setInterval(function() {
            setVolumeTimer(function(prev) {
              if (prev <= 1) {
                clearInterval(volumeTimerRefId.current);
                volumeTimerRefId.current = null;
                setExerciseActive(false);
                recordPhraseCompletion();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }

        // ═══════════════════════════════════════
        // TABS definition
        // ═══════════════════════════════════════
        var TABS = [
          { id: 'visualizer', label: 'Visualizer', icon: '\uD83C\uDFA4' },
          { id: 'practice', label: 'Practice', icon: '\uD83D\uDCDD' },
          { id: 'multilingual', label: 'Multilingual', icon: '\uD83C\uDF10' },
          { id: 'report', label: 'Report', icon: '\uD83D\uDCCB' }
        ];

        // ═══════════════════════════════════════
        // Shared styles
        // ═══════════════════════════════════════
        var cardClass = isDark
          ? 'bg-slate-800 border border-slate-700 rounded-xl p-4'
          : 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm';
        var headingClass = isDark ? 'text-white font-bold' : 'text-slate-900 font-bold';
        var subTextClass = isDark ? 'text-slate-400 text-xs' : 'text-slate-600 text-xs';
        var btnPrimary = 'px-4 py-2 rounded-lg font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ' +
          (isDark ? 'bg-violet-600 hover:bg-violet-500 text-white focus:ring-violet-400' : 'bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500');
        var btnSecondary = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 ' +
          (isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 focus:ring-slate-500' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400');
        var btnDanger = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 ' +
          (isDark ? 'bg-red-700 hover:bg-red-600 text-white focus:ring-red-400' : 'bg-red-100 hover:bg-red-200 text-red-700 focus:ring-red-400');

        // ═══════════════════════════════════════
        // Render: Tab 1 — Prosody Visualizer
        // ═══════════════════════════════════════
        function renderVisualizer() {
          return h('div', { className: 'space-y-4' },
            // Warm-up section
            h('div', { className: cardClass },
              h('div', { className: 'flex items-center justify-between mb-3' },
                h('h3', { className: headingClass + ' text-sm flex items-center gap-2' },
                  h('span', null, '\uD83C\uDFB5'),
                  'Vocal Warm-ups',
                  warmUpsCompleted > 0 && h('span', { className: 'text-xs font-normal ' + subTextClass }, '(' + warmUpsCompleted + ' completed)')
                )
              ),
              warmupActive
                ? h('div', { className: 'space-y-3' },
                    h('div', { className: (isDark ? 'bg-violet-900/30 border-violet-700' : 'bg-violet-50 border-violet-200') + ' border rounded-lg p-3' },
                      h('div', { className: 'flex items-center gap-2 mb-2' },
                        h('span', { className: 'text-xl' }, warmupActive.icon),
                        h('span', { className: headingClass + ' text-sm' }, warmupActive.label)),
                      h('p', { className: (isDark ? 'text-slate-300' : 'text-slate-600') + ' text-sm leading-relaxed' }, warmupActive.desc),
                      h('p', { className: subTextClass + ' mt-2 italic' }, 'Start your microphone and try it! When you\'re done, click "Complete."')),
                    h('div', { className: 'flex gap-2' },
                      h('button', {
                        className: btnPrimary,
                        onClick: function() { completeWarmup(warmupActive.id); },
                        'aria-label': 'Mark warm-up as complete'
                      }, 'Complete'),
                      h('button', {
                        className: btnSecondary,
                        onClick: function() { setWarmupActive(null); },
                        'aria-label': 'Cancel warm-up'
                      }, 'Cancel')))
                : h('div', { className: 'flex flex-wrap gap-2', role: 'list', 'aria-label': 'Available warm-up exercises' },
                    WARMUPS.map(function(wu) {
                      return h('button', {
                        key: wu.id,
                        role: 'listitem',
                        className: btnSecondary + ' flex items-center gap-1.5',
                        onClick: function() { setWarmupActive(wu); },
                        'aria-label': wu.label + ': ' + wu.desc
                      }, h('span', null, wu.icon), wu.label);
                    }))
            ),

            // Main controls
            h('div', { className: cardClass },
              h('div', { className: 'flex items-center justify-between flex-wrap gap-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('button', {
                    className: isRecording
                      ? 'px-6 py-3 rounded-full font-bold text-base transition-all focus:outline-none focus:ring-4 bg-red-500 hover:bg-red-600 text-white focus:ring-red-300 animate-pulse'
                      : 'px-6 py-3 rounded-full font-bold text-base transition-all focus:outline-none focus:ring-4 ' + (isDark ? 'bg-violet-600 hover:bg-violet-500 text-white focus:ring-violet-400' : 'bg-violet-600 hover:bg-violet-700 text-white focus:ring-violet-500'),
                    onClick: isRecording ? stopRecording : startRecording,
                    'aria-label': isRecording ? 'Stop recording. Click to stop microphone.' : 'Start recording. Click to activate microphone and begin speech visualization.',
                    'aria-pressed': isRecording ? 'true' : 'false'
                  },
                    isRecording ? '\uD83D\uDD34 Stop' : '\uD83C\uDFA4 Start Microphone'),
                  h('button', {
                    className: btnSecondary,
                    onClick: resetSession,
                    'aria-label': 'Reset all session data'
                  }, 'Reset')),
                h('div', { className: 'flex items-center gap-2' },
                  h('button', {
                    className: btnSecondary + (showModel ? ' ring-2 ring-violet-400' : ''),
                    onClick: function() {
                      if (showModel) {
                        setShowModel(false);
                        setModelCurve(null);
                      } else {
                        setShowModel(true);
                        playModelPhrase('Hello, my name is Alex. I am happy to meet you today.', 'Kore');
                      }
                    },
                    'aria-label': showModel ? 'Hide model prosody curve' : 'Show model: plays a demo phrase and traces ideal pitch curve for matching',
                    'aria-pressed': showModel ? 'true' : 'false',
                    disabled: ttsLoading
                  }, ttsLoading ? 'Loading...' : (showModel ? 'Hide Model' : '\uD83C\uDFAF Show Model')))),

              // Mic error
              micError && h('div', {
                className: 'mt-3 p-3 rounded-lg border text-sm ' + (isDark ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'),
                role: 'alert'
              }, micError)
            ),

            // Prosody Curve
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                h('span', null, '\uD83D\uDCC8'), 'Pitch Contour'),
              h('p', { className: subTextClass + ' mb-2' }, 'The melody of your speech. Rising pitch = questions, falling = statements, variation = emphasis.'),
              h('canvas', {
                ref: pitchCanvasRef,
                width: 600,
                height: 180,
                className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                role: 'img',
                'aria-label': currentPitch > 0
                  ? 'Pitch contour graph. Current pitch: ' + Math.round(currentPitch) + ' hertz, ' + pitchZone(currentPitch).label
                  : 'Pitch contour graph. No pitch detected. Speak into the microphone to see your pitch.'
              }),
              // Pitch zone legend
              h('div', { className: 'flex flex-wrap gap-3 mt-2 text-xs', role: 'list', 'aria-label': 'Pitch zone legend' },
                [
                  { color: '#3b82f6', label: 'Low / Calm', pattern: '\u2588' },
                  { color: '#22c55e', label: 'Conversational', pattern: '\u2588' },
                  { color: '#f97316', label: 'Emphasis', pattern: '\u2588' },
                  { color: '#ef4444', label: 'High / Strained', pattern: '\u2588' }
                ].map(function(zone) {
                  return h('span', { key: zone.label, className: 'flex items-center gap-1', role: 'listitem' },
                    h('span', { style: { color: zone.color } }, zone.pattern),
                    h('span', { className: isDark ? 'text-slate-400' : 'text-slate-600' }, zone.label));
                }))
            ),

            // Two-column layout: Pacing + Volume
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
              // Pacing Speedometer
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                  h('span', null, '\u23F1\uFE0F'), 'Pacing'),
                h('p', { className: subTextClass + ' mb-2' }, 'How fast you are speaking in words per minute.'),
                h('canvas', {
                  ref: pacingCanvasRef,
                  width: 280,
                  height: 160,
                  className: 'w-full rounded-lg',
                  role: 'img',
                  'aria-label': 'Pacing speedometer. Current pace: ' + currentWpm + ' words per minute. ' + pacingZone(currentWpm, gradeLevel).label
                })),

              // Volume Meter
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                  h('span', null, '\uD83D\uDD0A'), 'Volume'),
                h('p', { className: subTextClass + ' mb-2' }, 'Your speaking volume and steadiness over time.'),
                h('canvas', {
                  ref: volumeCanvasRef,
                  width: 280,
                  height: 70,
                  className: 'w-full rounded-lg',
                  role: 'img',
                  'aria-label': 'Volume meter. Current level: ' + Math.round(currentDb) + ' decibels.'
                }))
            ),

            // Pause Detection
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                h('span', null, '\u23F8\uFE0F'), 'Pause Detection'),
              h('p', { className: subTextClass + ' mb-2' }, 'Good speakers use pauses! Aim for 20-30% pauses in your speech.'),
              h('canvas', {
                ref: pauseCanvasRef,
                width: 600,
                height: 55,
                className: 'w-full rounded-lg',
                role: 'img',
                'aria-label': isPaused
                  ? 'Pause indicator. Currently pausing for ' + pauseDuration.toFixed(1) + ' seconds. Pause ratio: ' + Math.round(pauseRatio * 100) + ' percent.'
                  : 'Pause indicator. Speaking. Pause ratio: ' + Math.round(pauseRatio * 100) + ' percent.'
              })),

            // ═══════════════════════════════════════
            // Enhancement 4: Fluency / Disfluency Tracker (accordion)
            // ═══════════════════════════════════════
            h('div', { className: cardClass },
              h('button', {
                className: 'w-full flex items-center justify-between',
                onClick: function() { setFluencyOpen(!fluencyOpen); },
                'aria-expanded': fluencyOpen ? 'true' : 'false',
                'aria-controls': 'oratory-fluency-section'
              },
                h('h3', { className: headingClass + ' text-sm flex items-center gap-2' },
                  h('span', null, '\uD83D\uDCCA'), 'Fluency / Disfluency Tracker'),
                h('span', { className: subTextClass + ' text-lg' }, fluencyOpen ? '\u25B2' : '\u25BC')),

              fluencyOpen && h('div', { id: 'oratory-fluency-section', className: 'mt-4 space-y-4' },
                h('p', { className: subTextClass + ' mb-2' },
                  'Analyzes pause patterns, syllable rate consistency, and volume steadiness to generate a fluency score. Record at least 10 seconds of speech, then click "Analyze Fluency."'),

                // Analyze button
                h('div', { className: 'flex items-center gap-3 flex-wrap' },
                  h('button', {
                    className: btnPrimary,
                    onClick: computeFluencyScore,
                    disabled: pitchHistory.length < 30,
                    'aria-label': 'Analyze fluency from current recording data'
                  }, '\uD83D\uDCCA Analyze Fluency'),
                  pitchHistory.length < 30 && h('span', { className: subTextClass + ' italic' }, 'Record more speech first...')),

                // Results
                fluencyScore !== null && h('div', { className: 'space-y-3' },
                  // Star rating
                  h('div', { className: 'text-center p-4 rounded-lg ' + (isDark ? 'bg-violet-900/30 border border-violet-700' : 'bg-violet-50 border border-violet-200') },
                    h('div', { className: 'text-3xl mb-1', 'aria-label': fluencyStars + ' out of 5 stars' },
                      Array.apply(null, Array(5)).map(function(_, si) {
                        return h('span', { key: si, style: { opacity: si < fluencyStars ? 1 : 0.2 } }, '\u2B50');
                      })
                    ),
                    h('div', { className: headingClass + ' text-lg' }, fluencyDetails ? fluencyDetails.starLabel : ''),
                    h('div', { className: subTextClass + ' mt-1' }, 'Overall: ' + fluencyScore + '/100')),

                  // Detail breakdown
                  fluencyDetails && h('div', { className: 'grid grid-cols-3 gap-3 text-center text-xs' },
                    h('div', { className: 'p-2 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-slate-50') },
                      h('div', { className: headingClass + ' text-sm' }, fluencyDetails.pauseScore + '%'),
                      h('div', { className: subTextClass }, 'Pause Regularity')),
                    h('div', { className: 'p-2 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-slate-50') },
                      h('div', { className: headingClass + ' text-sm' }, fluencyDetails.rhythmScore + '%'),
                      h('div', { className: subTextClass }, 'Rhythm')),
                    h('div', { className: 'p-2 rounded-lg ' + (isDark ? 'bg-slate-700' : 'bg-slate-50') },
                      h('div', { className: headingClass + ' text-sm' }, fluencyDetails.volScore + '%'),
                      h('div', { className: subTextClass }, 'Volume Steadiness'))),

                  // Pause details
                  fluencyDetails && h('div', { className: subTextClass },
                    'Pauses: ' + fluencyDetails.normalPauses + ' normal, ' +
                    fluencyDetails.extendedPauses + ' extended (0.5-2s), ' +
                    fluencyDetails.blocks + ' blocks (>2s). ' +
                    'Syllable CV: ' + fluencyDetails.syllCV.toFixed(2) + ' (lower = smoother).')),

                // Session comparison chart
                fluencySessions.length > 0 && h('div', { className: 'mt-3' },
                  h('h4', { className: headingClass + ' text-xs mb-2' }, 'Session History'),
                  h('canvas', {
                    ref: fluencyChartCanvasRef,
                    width: 500,
                    height: 150,
                    className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                    role: 'img',
                    'aria-label': 'Fluency score bar chart showing ' + fluencySessions.length + ' sessions'
                  }))
              )
            ),

            // ═══════════════════════════════════════
            // Enhancement 3: Vowel Lab (accordion within Tab 1)
            // ═══════════════════════════════════════
            h('div', { className: cardClass },
              h('button', {
                className: 'w-full flex items-center justify-between',
                onClick: function() { setVowelLabOpen(!vowelLabOpen); },
                'aria-expanded': vowelLabOpen ? 'true' : 'false',
                'aria-controls': 'oratory-vowel-lab'
              },
                h('h3', { className: headingClass + ' text-sm flex items-center gap-2' },
                  h('span', null, '\uD83D\uDDE3\uFE0F'), 'Formant Vowel Space Lab'),
                h('span', { className: subTextClass + ' text-lg' }, vowelLabOpen ? '\u25B2' : '\u25BC')),

              vowelLabOpen && h('div', { id: 'oratory-vowel-lab', className: 'mt-4 space-y-3' },
                h('p', { className: subTextClass + ' mb-2' },
                  'Visualizes your vowel sounds on an IPA vowel quadrilateral using formant analysis (F1/F2). Speak a vowel sound and watch the dot move to show where your vowel falls. Trail mode shows diphthong transitions!'),

                // Language selector for vowel map
                h('div', { className: 'flex flex-wrap gap-2 mb-3', role: 'radiogroup', 'aria-label': 'Vowel map language' },
                  Object.keys(VOWEL_MAPS).map(function(langKey) {
                    var isActive = vowelLang === langKey;
                    return h('button', {
                      key: langKey,
                      role: 'radio',
                      'aria-checked': isActive ? 'true' : 'false',
                      className: (isActive
                        ? 'px-3 py-1 rounded-full text-xs font-bold bg-violet-600 text-white ring-2 ring-violet-400'
                        : btnSecondary + ' px-3 py-1 rounded-full') + ' transition-all',
                      onClick: function() { setVowelLang(langKey); setVowelTrail([]); }
                    }, VOWEL_MAPS[langKey].name + ' (' + VOWEL_MAPS[langKey].vowels.length + ' vowels)');
                  })
                ),

                // Vowel space canvas
                h('canvas', {
                  ref: vowelCanvasRef,
                  width: 500,
                  height: 400,
                  className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                  role: 'img',
                  'aria-label': 'Vowel space scatterplot showing F1 and F2 formant positions. Current F1: ' +
                    Math.round(currentF1) + ' Hz, F2: ' + Math.round(currentF2) + ' Hz. ' +
                    'Using ' + (VOWEL_MAPS[vowelLang] || VOWEL_MAPS.en).name + ' vowel map.'
                }),

                // Readout
                h('div', { className: 'flex items-center justify-between text-xs' },
                  h('span', { className: isDark ? 'text-slate-300' : 'text-slate-600' },
                    'F1: ' + (currentF1 > 0 ? Math.round(currentF1) + ' Hz' : '--') +
                    '  |  F2: ' + (currentF2 > 0 ? Math.round(currentF2) + ' Hz' : '--')),
                  h('button', {
                    className: btnSecondary,
                    onClick: function() { setVowelTrail([]); },
                    'aria-label': 'Clear vowel trail'
                  }, 'Clear Trail')),

                h('p', { className: subTextClass + ' italic mt-1' },
                  'Green circles = target vowel positions. Orange dot = your current vowel. Purple trail = recent vowel transitions.')
              )
            ),

            // ═══════════════════════════════════════
            // Enhancement 1: Recording Playback Section
            // ═══════════════════════════════════════
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-sm mb-2 flex items-center gap-2' },
                h('span', null, '\uD83D\uDD01'), 'Recording Playback'),
              h('p', { className: subTextClass + ' mb-3' },
                'Recordings are automatically saved when you stop the microphone. Play back with synchronized prosody annotation. Last 3 recordings kept.'),

              savedRecordings.length === 0
                ? h('p', { className: subTextClass + ' italic text-center py-3' }, 'No recordings yet. Start and stop the microphone to save a recording.')
                : h('div', { className: 'space-y-3' },
                    // Recording list
                    savedRecordings.map(function(rec, ri) {
                      var isPlaying = playbackIdx === ri && playbackStatus === 'playing';
                      var isPausing = playbackIdx === ri && playbackStatus === 'paused';
                      var dateStr = new Date(rec.timestamp).toLocaleTimeString();
                      var durStr = rec.duration + 's';

                      return h('div', {
                        key: rec.timestamp,
                        className: 'flex items-center gap-3 p-2 rounded-lg ' +
                          (playbackIdx === ri ? (isDark ? 'bg-violet-900/30 border border-violet-700' : 'bg-violet-50 border border-violet-200') : (isDark ? 'bg-slate-700/50' : 'bg-slate-50'))
                      },
                        // Play/Pause button
                        h('button', {
                          className: 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ' +
                            (isDark ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-violet-600 text-white hover:bg-violet-700'),
                          onClick: function() {
                            if (isPlaying) pausePlayback();
                            else if (isPausing) resumePlayback();
                            else startPlayback(ri);
                          },
                          'aria-label': isPlaying ? 'Pause recording ' + (ri + 1) : 'Play recording ' + (ri + 1)
                        }, isPlaying ? '\u23F8' : '\u25B6'),

                        // Info
                        h('div', { className: 'flex-1' },
                          h('div', { className: headingClass + ' text-xs' }, 'Recording ' + (ri + 1)),
                          h('div', { className: subTextClass }, dateStr + ' \u2022 ' + durStr)),

                        // Progress bar (when this recording is selected)
                        playbackIdx === ri && h('div', {
                          className: 'flex-1 h-2 rounded-full overflow-hidden ' + (isDark ? 'bg-slate-600' : 'bg-slate-200'),
                          role: 'progressbar',
                          'aria-valuenow': Math.round(playbackProgress * 100),
                          'aria-valuemin': '0',
                          'aria-valuemax': '100'
                        },
                          h('div', {
                            className: 'h-full rounded-full bg-violet-500 transition-all',
                            style: { width: Math.round(playbackProgress * 100) + '%' }
                          }))
                      );
                    }),

                    // Playback prosody canvas
                    playbackIdx >= 0 && savedRecordings[playbackIdx] && h('div', { className: 'mt-2' },
                      h('canvas', {
                        ref: playbackCanvasRef,
                        width: 600,
                        height: 120,
                        className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                        role: 'img',
                        'aria-label': 'Playback prosody visualization showing pitch and volume for recording ' + (playbackIdx + 1)
                      })),

                    // Compare recordings button
                    savedRecordings.length >= 2 && h('div', { className: 'mt-2' },
                      h('button', {
                        className: btnSecondary + (compareMode ? ' ring-2 ring-violet-400' : ''),
                        onClick: function() { setCompareMode(!compareMode); },
                        'aria-pressed': compareMode ? 'true' : 'false',
                        'aria-label': compareMode ? 'Close comparison view' : 'Compare two recordings side by side'
                      }, compareMode ? 'Close Comparison' : '\uD83D\uDD0D Compare Recordings'),

                      // Comparison view
                      compareMode && h('div', { className: 'mt-3 space-y-2' },
                        h('div', { className: 'flex items-center gap-2 text-xs' },
                          h('label', { className: isDark ? 'text-slate-300' : 'text-slate-600' }, 'Recording 1:'),
                          h('select', {
                            value: compareIdx1,
                            onChange: function(e) { setCompareIdx1(parseInt(e.target.value, 10)); },
                            className: 'px-2 py-1 rounded text-xs ' + (isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300') + ' border',
                            'aria-label': 'Select first recording to compare'
                          },
                            savedRecordings.map(function(r, ri) {
                              return h('option', { key: ri, value: ri }, '#' + (ri + 1) + ' (' + new Date(r.timestamp).toLocaleTimeString() + ')');
                            })
                          ),
                          h('label', { className: isDark ? 'text-slate-300' : 'text-slate-600' }, 'vs Recording 2:'),
                          h('select', {
                            value: compareIdx2,
                            onChange: function(e) { setCompareIdx2(parseInt(e.target.value, 10)); },
                            className: 'px-2 py-1 rounded text-xs ' + (isDark ? 'bg-slate-700 text-white border-slate-600' : 'bg-white text-slate-900 border-slate-300') + ' border',
                            'aria-label': 'Select second recording to compare'
                          },
                            savedRecordings.map(function(r, ri) {
                              return h('option', { key: ri, value: ri }, '#' + (ri + 1) + ' (' + new Date(r.timestamp).toLocaleTimeString() + ')');
                            })
                          )
                        ),
                        h('canvas', {
                          ref: compareCanvasRef,
                          width: 600,
                          height: 150,
                          className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                          role: 'img',
                          'aria-label': 'Side by side prosody comparison of recording ' + (compareIdx1 + 1) + ' and recording ' + (compareIdx2 + 1)
                        })
                      ))
                  )
            ),

            // Screen reader live summary (hidden visually)
            isRecording && h('div', {
              className: 'sr-only',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              role: 'status',
              style: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }
            }, 'Pitch: ' + (currentPitch > 0 ? Math.round(currentPitch) + ' hertz' : 'no pitch') +
               '. Pace: ' + currentWpm + ' words per minute' +
               '. Volume: ' + Math.round(currentDb) + ' decibels' +
               (isPaused ? '. Pausing.' : '.'))
          );
        }

        // ═══════════════════════════════════════
        // Render: Tab 2 — Practice Exercises
        // ═══════════════════════════════════════
        function renderPractice() {
          // No exercise type selected — show type picker
          if (!exerciseType) {
            return h('div', { className: 'space-y-4' },
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-base mb-1' }, 'Practice Exercises'),
                h('p', { className: subTextClass + ' mb-4' }, 'Choose an exercise type. The tool will give you phrases to practice with real-time prosody feedback.')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3', role: 'list', 'aria-label': 'Exercise types' },
                EXERCISE_TYPES.map(function(et) {
                  return h('button', {
                    key: et.id,
                    role: 'listitem',
                    className: cardClass + ' text-left hover:ring-2 hover:ring-violet-400 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500',
                    onClick: function() {
                      setExerciseType(et.id);
                      setExerciseIndex(0);
                      setEmphasisWord(0);
                      setEmotionIndex(0);
                      setExerciseActive(false);
                      setSelectedPattern(null);
                      setPatternPracticing(false);
                      setPatternScore(null);
                      setPatternStudentCurve(null);
                      // Try to load cached or generate new (skip for intonation)
                      if (et.id !== 'intonation' && (!cachedExercises || !cachedExercises[et.id])) {
                        generateExercises(et.id);
                      }
                    },
                    'aria-label': et.label + ': ' + et.desc
                  },
                    h('div', { className: 'flex items-center gap-3' },
                      h('span', { className: 'text-2xl' }, et.icon),
                      h('div', null,
                        h('div', { className: headingClass + ' text-sm' }, et.label),
                        h('div', { className: subTextClass }, et.desc))));
                })),
              // AI generation note
              h('div', { className: subTextClass + ' text-center mt-2 italic' },
                'Exercises are personalized for ' + (gradeLevel ? 'grade ' + gradeLevel : 'your grade level') + ' using AI.')
            );
          }

          // ═══════════════════════════════════════
          // Enhancement 2: Intonation Pattern Exercises
          // ═══════════════════════════════════════
          if (exerciseType === 'intonation') {
            return renderIntonationPatterns();
          }

          var exercises = getExercises(exerciseType);
          var currentExercise = exercises[exerciseIndex] || exercises[0];
          if (!currentExercise) currentExercise = {};

          // Back button + navigation
          var navBar = h('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-4' },
            h('button', {
              className: btnSecondary + ' flex items-center gap-1',
              onClick: function() { setExerciseType(null); setAiExercises(null); },
              'aria-label': 'Back to exercise type selection'
            }, '\u2190 Back'),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: headingClass + ' text-sm' },
                (EXERCISE_TYPES.find(function(et) { return et.id === exerciseType; }) || {}).icon + ' ' +
                (EXERCISE_TYPES.find(function(et) { return et.id === exerciseType; }) || {}).label),
              exercises.length > 1 && h('span', { className: subTextClass }, (exerciseIndex + 1) + '/' + exercises.length)),
            h('div', { className: 'flex gap-1' },
              exercises.length > 1 && h('button', {
                className: btnSecondary,
                onClick: function() { setExerciseIndex(exerciseIndex > 0 ? exerciseIndex - 1 : exercises.length - 1); setEmphasisWord(0); setEmotionIndex(0); },
                'aria-label': 'Previous exercise',
                disabled: exercises.length <= 1
              }, '\u2190'),
              exercises.length > 1 && h('button', {
                className: btnSecondary,
                onClick: function() { setExerciseIndex((exerciseIndex + 1) % exercises.length); setEmphasisWord(0); setEmotionIndex(0); },
                'aria-label': 'Next exercise'
              }, '\u2192'),
              h('button', {
                className: btnSecondary,
                onClick: function() { generateExercises(exerciseType); },
                disabled: aiLoading,
                'aria-label': 'Generate new AI exercises'
              }, aiLoading ? 'Generating...' : '\u2728 New'))
          );

          // Render exercise-specific content
          if (exerciseType === 'emotion') {
            var phrase = currentExercise.phrase || 'The door is open.';
            var emotions = currentExercise.emotions || ['Excitement', 'Sadness', 'Authority', 'Curiosity'];
            var currentEmotion = emotions[emotionIndex] || emotions[0];

            return h('div', { className: 'space-y-4' },
              navBar,
              h('div', { className: cardClass },
                h('div', { className: headingClass + ' text-lg text-center mb-3' }, '"' + phrase + '"'),
                h('p', { className: subTextClass + ' text-center mb-3' }, 'Say this phrase with the emotion below. Watch how your pitch and volume change!'),
                h('div', { className: 'flex flex-wrap gap-2 justify-center mb-4', role: 'radiogroup', 'aria-label': 'Select emotion' },
                  emotions.map(function(emo, ei) {
                    var isActive = ei === emotionIndex;
                    return h('button', {
                      key: emo,
                      role: 'radio',
                      'aria-checked': isActive ? 'true' : 'false',
                      className: (isActive
                        ? 'px-4 py-2 rounded-full text-sm font-bold bg-violet-600 text-white ring-2 ring-violet-400'
                        : btnSecondary + ' px-4 py-2 rounded-full') + ' transition-all',
                      onClick: function() { setEmotionIndex(ei); }
                    }, emo);
                  })),
                h('div', { className: 'text-center p-4 rounded-lg ' + (isDark ? 'bg-violet-900/30 border border-violet-700' : 'bg-violet-50 border border-violet-200') },
                  h('div', { className: 'text-3xl mb-2' },
                    currentEmotion === 'Excitement' || currentEmotion === 'Joy' || currentEmotion === 'Happy' ? '\uD83D\uDE04' :
                    currentEmotion === 'Sadness' || currentEmotion === 'Sad' ? '\uD83D\uDE22' :
                    currentEmotion === 'Authority' || currentEmotion === 'Angry' ? '\uD83D\uDE20' :
                    currentEmotion === 'Curiosity' || currentEmotion === 'Surprised' || currentEmotion === 'Surprise' ? '\uD83E\uDD14' :
                    currentEmotion === 'Fear' ? '\uD83D\uDE28' :
                    currentEmotion === 'Boredom' ? '\uD83D\uDE12' :
                    currentEmotion === 'Calmness' || currentEmotion === 'Relief' ? '\uD83D\uDE0C' :
                    currentEmotion === 'Urgency' ? '\u26A0\uFE0F' :
                    currentEmotion === 'Disappointment' ? '\uD83D\uDE1E' :
                    '\uD83C\uDFAD'),
                  h('div', { className: headingClass + ' text-xl' }, currentEmotion),
                  h('p', { className: subTextClass + ' mt-1' }, 'Say the phrase with THIS feeling. Notice what happens to your pitch!'))),
              // Mic controls + mini visualizer
              renderMiniControls(),
              h('div', { className: 'text-center' },
                h('button', {
                  className: btnPrimary,
                  onClick: recordPhraseCompletion,
                  'aria-label': 'I practiced this phrase, record it'
                }, '\u2713 I Practiced This'))
            );
          }

          if (exerciseType === 'question') {
            var stmt = currentExercise.statement || 'You finished your homework.';
            var qst = currentExercise.question || 'You finished your homework?';

            return h('div', { className: 'space-y-4' },
              navBar,
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-sm mb-3' }, 'Question vs Statement'),
                h('p', { className: subTextClass + ' mb-3' }, 'Say the same words as a statement (pitch falls at the end) and as a question (pitch rises). Watch the difference on the pitch graph!'),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
                  h('div', { className: 'p-4 rounded-lg text-center ' + (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200') },
                    h('div', { className: 'text-2xl mb-1' }, '\u2198\uFE0F'),
                    h('div', { className: subTextClass + ' mb-1' }, 'Statement (pitch falls)'),
                    h('div', { className: headingClass + ' text-base' }, stmt)),
                  h('div', { className: 'p-4 rounded-lg text-center ' + (isDark ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200') },
                    h('div', { className: 'text-2xl mb-1' }, '\u2197\uFE0F'),
                    h('div', { className: subTextClass + ' mb-1' }, 'Question (pitch rises)'),
                    h('div', { className: headingClass + ' text-base' }, qst)))),
              renderMiniControls(),
              h('div', { className: 'text-center' },
                h('button', { className: btnPrimary, onClick: recordPhraseCompletion, 'aria-label': 'I practiced this phrase' }, '\u2713 I Practiced This'))
            );
          }

          if (exerciseType === 'emphasis') {
            var base = currentExercise.base || 'I did not say she stole my money.';
            var words = currentExercise.words || ['I'];
            var meanings = currentExercise.meanings || ['Someone else said it.'];
            var selectedWord = words[emphasisWord] || words[0];
            var selectedMeaning = meanings[emphasisWord] || '';

            // Build the display phrase with emphasis
            var displayParts = base.split(/\s+/);
            var emphasizedPhrase = displayParts.map(function(word) {
              var cleanWord = word.replace(/[.,!?;:]/g, '').toLowerCase();
              var targetWords = selectedWord.toLowerCase().split(/\s+/);
              if (targetWords.indexOf(cleanWord) !== -1) {
                return word.toUpperCase();
              }
              return word;
            }).join(' ');

            return h('div', { className: 'space-y-4' },
              navBar,
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-sm mb-3' }, 'Emphasis Drill'),
                h('p', { className: subTextClass + ' mb-3' }, 'The same sentence means different things depending on which word you stress. Select a word below, then say the sentence emphasizing that word.'),
                h('div', { className: 'text-center p-4 rounded-lg mb-3 ' + (isDark ? 'bg-violet-900/30 border border-violet-700' : 'bg-violet-50 border border-violet-200') },
                  h('div', { className: headingClass + ' text-lg' }, '"' + emphasizedPhrase + '"'),
                  selectedMeaning && h('div', { className: subTextClass + ' mt-2 italic' }, 'Meaning: ' + selectedMeaning)),
                h('div', { className: 'flex flex-wrap gap-2 justify-center', role: 'radiogroup', 'aria-label': 'Select word to emphasize' },
                  words.map(function(word, wi) {
                    var isActive = wi === emphasisWord;
                    return h('button', {
                      key: word + wi,
                      role: 'radio',
                      'aria-checked': isActive ? 'true' : 'false',
                      className: (isActive
                        ? 'px-3 py-1.5 rounded-full text-sm font-bold bg-violet-600 text-white ring-2 ring-violet-400'
                        : btnSecondary + ' px-3 py-1.5 rounded-full') + ' transition-all',
                      onClick: function() { setEmphasisWord(wi); }
                    }, word);
                  }))),
              renderMiniControls(),
              h('div', { className: 'text-center' },
                h('button', { className: btnPrimary, onClick: recordPhraseCompletion, 'aria-label': 'I practiced this phrase' }, '\u2713 I Practiced This'))
            );
          }

          if (exerciseType === 'pacing') {
            var text = currentExercise.text || 'The quick brown fox jumps over the lazy dog.';
            var targetWpm = currentExercise.targetWpm || 120;

            return h('div', { className: 'space-y-4' },
              navBar,
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-sm mb-3' }, 'Pacing Challenge'),
                h('p', { className: subTextClass + ' mb-3' }, 'Read the passage below at the target speed. The speedometer will show you how fast you are going!'),
                h('div', { className: 'text-center p-4 rounded-lg mb-3 ' + (isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200') },
                  h('div', { className: 'text-xs font-bold mb-2 ' + (isDark ? 'text-yellow-300' : 'text-yellow-700') }, 'Target: ' + targetWpm + ' WPM'),
                  h('div', { className: headingClass + ' text-base leading-relaxed' }, text)),
                h('div', { className: 'text-center' },
                  h('div', { className: 'text-2xl font-bold ' + (Math.abs(currentWpm - targetWpm) < 20 ? 'text-green-500' : Math.abs(currentWpm - targetWpm) < 40 ? 'text-yellow-500' : 'text-red-500') },
                    currentWpm + ' WPM'),
                  h('div', { className: subTextClass },
                    currentWpm === 0 ? 'Start speaking...'
                    : Math.abs(currentWpm - targetWpm) < 20 ? 'Right on target!'
                    : currentWpm < targetWpm ? 'A little faster...'
                    : 'Slow down a bit...'))),
              renderMiniControls(),
              h('div', { className: 'text-center' },
                h('button', { className: btnPrimary, onClick: recordPhraseCompletion, 'aria-label': 'I practiced this passage' }, '\u2713 I Practiced This'))
            );
          }

          if (exerciseType === 'volume') {
            var volText = currentExercise.text || 'Count to ten slowly and steadily.';
            var volDuration = currentExercise.duration || 10;

            return h('div', { className: 'space-y-4' },
              navBar,
              h('div', { className: cardClass },
                h('h3', { className: headingClass + ' text-sm mb-3' }, 'Volume Projection'),
                h('p', { className: subTextClass + ' mb-3' }, 'Speak at a steady, consistent volume for ' + volDuration + ' seconds. Try to keep the volume meter in the green zone the whole time!'),
                h('div', { className: 'text-center p-4 rounded-lg mb-3 ' + (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200') },
                  h('div', { className: headingClass + ' text-base leading-relaxed mb-2' }, volText),
                  exerciseActive
                    ? h('div', null,
                        h('div', { className: 'text-4xl font-bold ' + (isDark ? 'text-green-400' : 'text-green-600'), 'aria-live': 'polite' }, volumeTimer + 's'),
                        h('div', { className: subTextClass }, 'Keep going! Hold your volume steady.'))
                    : h('button', {
                        className: btnPrimary,
                        onClick: function() {
                          if (!isRecording) startRecording();
                          startVolumeChallenge();
                        },
                        'aria-label': 'Start the ' + volDuration + ' second volume challenge'
                      }, 'Start Challenge'))),
              renderMiniControls()
            );
          }

          // Fallback
          return h('div', { className: cardClass }, 'Select an exercise type.');
        }

        // ═══════════════════════════════════════
        // Enhancement 2: Intonation Pattern Exercises Renderer
        // ═══════════════════════════════════════
        function renderIntonationPatterns() {
          // Back button
          var backBtn = h('div', { className: 'mb-4' },
            h('button', {
              className: btnSecondary + ' flex items-center gap-1',
              onClick: function() { setExerciseType(null); setSelectedPattern(null); setPatternPracticing(false); setPatternScore(null); setPatternStudentCurve(null); },
              'aria-label': 'Back to exercise type selection'
            }, '\u2190 Back'));

          // If a pattern is selected for practice
          if (selectedPattern) {
            return h('div', { className: 'space-y-4' },
              backBtn,
              h('div', { className: cardClass },
                h('div', { className: 'flex items-center justify-between mb-3' },
                  h('h3', { className: headingClass + ' text-sm flex items-center gap-2' },
                    h('span', { className: 'text-lg' }, selectedPattern.icon),
                    selectedPattern.label),
                  h('button', {
                    className: btnSecondary,
                    onClick: function() { setSelectedPattern(null); setPatternPracticing(false); setPatternScore(null); setPatternStudentCurve(null); },
                    'aria-label': 'Choose a different pattern'
                  }, 'Change Pattern')),
                h('p', { className: subTextClass + ' mb-2' }, selectedPattern.desc),

                // Sample phrase
                h('div', { className: 'text-center p-3 rounded-lg mb-3 ' + (isDark ? 'bg-violet-900/30 border border-violet-700' : 'bg-violet-50 border border-violet-200') },
                  h('div', { className: subTextClass + ' text-xs mb-1' }, 'Sample Phrase:'),
                  h('div', { className: headingClass + ' text-lg' }, '"' + selectedPattern.phrase + '"')),

                // Target pattern canvas
                h('div', { className: 'mb-3' },
                  h('div', { className: subTextClass + ' mb-1' }, 'Target pitch pattern (green zone = target, orange = your pitch):'),
                  h('canvas', {
                    ref: patternCanvasRef,
                    width: 500,
                    height: 120,
                    className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                    role: 'img',
                    'aria-label': 'Intonation pattern target for ' + selectedPattern.label + '. ' + selectedPattern.desc
                  })),

                // Practice button
                !patternPracticing
                  ? h('div', { className: 'flex items-center gap-3 justify-center' },
                      h('button', {
                        className: btnPrimary,
                        onClick: function() {
                          setPatternPracticing(true);
                          setPatternScore(null);
                          setPatternStudentCurve(null);
                          setPitchHistory([]);
                          if (!isRecording) startRecording();
                        },
                        'aria-label': 'Start practicing this intonation pattern'
                      }, '\uD83C\uDFA4 Practice This Pattern'))
                  : h('div', { className: 'space-y-3' },
                      h('div', { className: 'text-center p-2 rounded-lg ' + (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200') },
                        h('p', { className: (isDark ? 'text-green-300' : 'text-green-700') + ' font-bold text-sm animate-pulse' },
                          'Say the phrase now! Try to match the green target zone.')),
                      h('div', { className: 'flex items-center gap-3 justify-center' },
                        h('button', {
                          className: btnPrimary,
                          onClick: function() {
                            // Capture pitch data and compute score
                            var studentData = pitchHistory.slice();
                            setPatternStudentCurve(studentData);
                            var score = computePatternMatchScore(selectedPattern.points, studentData);
                            setPatternScore(score);
                            setPatternPracticing(false);
                            recordPhraseCompletion();
                            if (score >= 70 && stemCelebrate) stemCelebrate();
                            if (announceToSR) announceToSR('Pattern match score: ' + score + ' percent.');
                          },
                          'aria-label': 'Stop and score my attempt'
                        }, '\u2713 Score My Attempt'),
                        h('button', {
                          className: btnSecondary,
                          onClick: function() {
                            setPatternPracticing(false);
                            setPatternScore(null);
                            setPatternStudentCurve(null);
                          },
                          'aria-label': 'Cancel practice attempt'
                        }, 'Cancel'))),

                // Score display
                patternScore !== null && h('div', { className: 'text-center p-4 mt-3 rounded-lg ' +
                    (patternScore >= 70 ? (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200') :
                     patternScore >= 40 ? (isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200') :
                     (isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200')) },
                  h('div', { className: 'text-4xl font-bold mb-1 ' +
                    (patternScore >= 70 ? 'text-green-500' : patternScore >= 40 ? 'text-yellow-500' : 'text-red-500') },
                    patternScore + '%'),
                  h('div', { className: headingClass + ' text-sm' },
                    patternScore >= 85 ? 'Excellent match!' :
                    patternScore >= 70 ? 'Good match!' :
                    patternScore >= 50 ? 'Getting closer!' :
                    patternScore >= 30 ? 'Keep practicing!' :
                    'Try to follow the green zone more closely.'),
                  h('button', {
                    className: btnPrimary + ' mt-3',
                    onClick: function() {
                      setPatternScore(null);
                      setPatternStudentCurve(null);
                      setPatternPracticing(true);
                      setPitchHistory([]);
                    },
                    'aria-label': 'Try this pattern again'
                  }, '\uD83D\uDD01 Try Again'))),

              // Mini controls
              patternPracticing && renderMiniControls()
            );
          }

          // Pattern selection grid
          return h('div', { className: 'space-y-4' },
            backBtn,
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-base mb-1 flex items-center gap-2' },
                h('span', null, '\uD83C\uDFB6'), 'Intonation Pattern Templates'),
              h('p', { className: subTextClass + ' mb-4' },
                'SLPs use specific prosody patterns as clinical targets. Select a pattern to see the target pitch contour and practice matching it.')),

            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              INTONATION_PATTERNS.map(function(pat) {
                return h('button', {
                  key: pat.id,
                  className: cardClass + ' text-left hover:ring-2 hover:ring-violet-400 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500',
                  onClick: function() {
                    setSelectedPattern(pat);
                    setPatternPracticing(false);
                    setPatternScore(null);
                    setPatternStudentCurve(null);
                  },
                  'aria-label': pat.label + ': ' + pat.desc + '. Sample phrase: ' + pat.phrase
                },
                  h('div', { className: 'flex items-start gap-3' },
                    h('div', { className: 'text-2xl font-mono w-8 text-center flex-shrink-0 ' + (isDark ? 'text-violet-400' : 'text-violet-600') }, pat.icon),
                    h('div', null,
                      h('div', { className: headingClass + ' text-sm' }, pat.label),
                      h('div', { className: subTextClass + ' mb-1' }, pat.desc),
                      h('div', { className: 'text-xs italic ' + (isDark ? 'text-slate-400' : 'text-slate-600') }, '"' + pat.phrase + '"'))));
              }))
          );
        }

        // ═══════════════════════════════════════
        // Mini controls for exercises (mic + pitch canvas)
        // ═══════════════════════════════════════
        function renderMiniControls() {
          return h('div', { className: cardClass + ' space-y-3' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                className: isRecording
                  ? 'px-4 py-2 rounded-full font-bold text-sm bg-red-500 hover:bg-red-600 text-white focus:outline-none focus:ring-2 focus:ring-red-300 animate-pulse'
                  : 'px-4 py-2 rounded-full font-bold text-sm ' + (isDark ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white') + ' focus:outline-none focus:ring-2 focus:ring-violet-400',
                onClick: isRecording ? stopRecording : startRecording,
                'aria-label': isRecording ? 'Stop microphone' : 'Start microphone'
              }, isRecording ? '\uD83D\uDD34 Stop' : '\uD83C\uDFA4 Start'),
              h('span', { className: subTextClass },
                isRecording ? 'Listening... speak now!' : 'Click to activate your microphone.')),
            h('canvas', {
              ref: pitchCanvasRef,
              width: 600,
              height: 120,
              className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
              role: 'img',
              'aria-label': 'Pitch contour graph'
            }),
            h('div', { className: 'grid grid-cols-3 gap-3 text-center text-xs' },
              h('div', null,
                h('div', { className: headingClass }, (currentPitch > 0 ? Math.round(currentPitch) + ' Hz' : '--')),
                h('div', { className: subTextClass }, 'Pitch')),
              h('div', null,
                h('div', { className: headingClass }, currentWpm + ' WPM'),
                h('div', { className: subTextClass }, 'Pace')),
              h('div', null,
                h('div', { className: headingClass }, Math.round(currentDb) + ' dB'),
                h('div', { className: subTextClass }, 'Volume')))
          );
        }

        // ═══════════════════════════════════════
        // Render: Tab 3 — Multilingual Mode
        // ═══════════════════════════════════════
        function renderMultilingual() {
          var langObj = LANGUAGES.find(function(l) { return l.code === selectedLang; });
          var langName = customLang || (langObj ? langObj.name : 'English');

          return h('div', { className: 'space-y-4' },
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-base mb-1 flex items-center gap-2' },
                h('span', null, '\uD83C\uDF10'), 'Multilingual Pronunciation Lab'),
              h('p', { className: subTextClass + ' mb-4' }, 'Practice pronunciation in any language! The AI will model the phrase, then you try to match its prosody.')),

            // Language selector
            h('div', { className: cardClass },
              h('h4', { className: headingClass + ' text-sm mb-3' }, 'Select Language'),
              h('div', { className: 'flex flex-wrap gap-2 mb-3', role: 'radiogroup', 'aria-label': 'Language selection' },
                LANGUAGES.map(function(lang) {
                  var isActive = selectedLang === lang.code && !customLang;
                  return h('button', {
                    key: lang.code,
                    role: 'radio',
                    'aria-checked': isActive ? 'true' : 'false',
                    className: (isActive
                      ? 'px-3 py-1.5 rounded-full text-xs font-bold bg-violet-600 text-white ring-2 ring-violet-400'
                      : btnSecondary + ' px-3 py-1.5 rounded-full') + ' transition-all',
                    onClick: function() { setSelectedLang(lang.code); setCustomLang(''); }
                  }, lang.flag + ' ' + lang.name);
                })),
              h('div', { className: 'flex items-center gap-2' },
                h('label', { className: subTextClass, htmlFor: 'oratory-custom-lang' }, 'Or type any language:'),
                h('input', {
                  id: 'oratory-custom-lang',
                  type: 'text',
                  value: customLang,
                  onChange: function(e) { setCustomLang(e.target.value); },
                  placeholder: 'e.g., Tagalog, Amharic...',
                  className: 'flex-1 px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-violet-400 ' +
                    (isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'),
                  'aria-label': 'Type a language name'
                }))),

            // Phrase input
            h('div', { className: cardClass },
              h('h4', { className: headingClass + ' text-sm mb-3' }, 'Phrase to Practice'),
              h('div', { className: 'flex items-center gap-2 mb-3' },
                h('input', {
                  type: 'text',
                  value: multiPhrase,
                  onChange: function(e) { setMultiPhrase(e.target.value); },
                  placeholder: 'Type a phrase in ' + langName + ' or click Generate...',
                  className: 'flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-violet-400 ' +
                    (isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'),
                  'aria-label': 'Phrase to practice in ' + langName
                }),
                h('button', {
                  className: btnSecondary,
                  onClick: generateMultiPhrase,
                  disabled: aiLoading,
                  'aria-label': 'Generate a phrase in ' + langName + ' using AI'
                }, aiLoading ? '...' : '\u2728 Generate')),

              multiPhrase && h('div', { className: 'text-center p-4 rounded-lg ' + (isDark ? 'bg-violet-900/30 border border-violet-700' : 'bg-violet-50 border border-violet-200') },
                h('div', { className: headingClass + ' text-lg mb-3' }, multiPhrase),

                // Model / Your Turn buttons
                h('div', { className: 'flex gap-3 justify-center flex-wrap' },
                  h('button', {
                    className: btnPrimary + ' flex items-center gap-2',
                    onClick: modelMultiPhrase,
                    disabled: ttsLoading || multiMode === 'modeling',
                    'aria-label': 'Hear the AI model speak this phrase'
                  }, ttsLoading ? 'Loading...' : '\uD83D\uDD0A Model'),
                  h('button', {
                    className: btnPrimary + ' flex items-center gap-2',
                    onClick: function() {
                      setMultiMode('yourTurn');
                      if (!isRecording) startRecording();
                    },
                    disabled: multiMode === 'modeling',
                    'aria-label': 'Your turn to speak the phrase'
                  }, '\uD83C\uDFA4 Your Turn')),

                // Mode status
                multiMode === 'modeling' && h('div', { className: subTextClass + ' mt-3 animate-pulse' }, 'Listen carefully to the model...'),
                multiMode === 'yourTurn' && h('div', { className: (isDark ? 'text-green-400' : 'text-green-600') + ' mt-3 font-bold text-sm' }, 'Your turn! Speak the phrase and try to match the pitch pattern.'))
            ),

            // Prosody comparison visualization
            (multiMode === 'yourTurn' || multiMode === 'comparing') && h('div', { className: cardClass },
              h('h4', { className: headingClass + ' text-sm mb-2' }, 'Prosody Comparison'),
              h('p', { className: subTextClass + ' mb-2' }, 'Dashed line = model, solid line = your speech. Try to make them match!'),
              h('canvas', {
                ref: pitchCanvasRef,
                width: 600,
                height: 180,
                className: 'w-full rounded-lg border ' + (isDark ? 'border-slate-700' : 'border-slate-200'),
                role: 'img',
                'aria-label': 'Prosody comparison graph showing model curve and your speech curve overlaid'
              }),
              renderMiniControls(),
              h('div', { className: 'text-center mt-2' },
                h('button', { className: btnPrimary, onClick: recordPhraseCompletion, 'aria-label': 'I practiced this phrase' }, '\u2713 I Practiced This')))
          );
        }

        // ═══════════════════════════════════════
        // Render: Tab 4 — Session Report
        // ═══════════════════════════════════════
        function renderReport() {
          var avgWpm = 0;
          var readings = sessionWpmReadings || [];
          if (readings.length > 0) {
            var sum = 0;
            for (var ri = 0; ri < readings.length; ri++) sum += readings[ri];
            avgWpm = Math.round(sum / readings.length);
          }
          var pitchRange = sessionPitchRange || { min: 9999, max: 0 };
          var pitchMin = pitchRange.min === 9999 ? 0 : Math.round(pitchRange.min);
          var pitchMax = Math.round(pitchRange.max);
          var timeMin = Math.round((sessionTimeSpent || 0) / 60);

          return h('div', { className: 'space-y-4' },
            h('div', { className: cardClass },
              h('h3', { className: headingClass + ' text-base mb-1 flex items-center gap-2' },
                h('span', null, '\uD83D\uDCCB'), 'Session Report'),
              h('p', { className: subTextClass + ' mb-4' }, 'Summary of your practice session. Share this with your speech-language pathologist!')),

            // Stats grid
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
              renderStatCard('\uD83D\uDCDD', 'Phrases Practiced', (totalPhrases || 0).toString()),
              renderStatCard('\uD83C\uDFB5', 'Warm-ups Done', (warmUpsCompleted || 0).toString()),
              renderStatCard('\u23F1\uFE0F', 'Avg Pacing', avgWpm > 0 ? avgWpm + ' WPM' : 'N/A'),
              renderStatCard('\uD83D\uDD0A', 'Best Steadiness', (bestSteadiness || 0) + '%'),
              renderStatCard('\uD83C\uDFB6', 'Pitch Range', pitchMin > 0 ? pitchMin + '-' + pitchMax + ' Hz' : 'N/A'),
              renderStatCard('\u23F0', 'Time Spent', timeMin > 0 ? '~' + timeMin + ' min' : '<1 min')),

            // Fluency summary in report
            fluencySessions.length > 0 && h('div', { className: cardClass },
              h('h4', { className: headingClass + ' text-sm mb-3 flex items-center gap-2' },
                h('span', null, '\uD83D\uDCCA'), 'Fluency Scores'),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
                renderStatCard('\u2B50', 'Latest Score',
                  fluencySessions[fluencySessions.length - 1].fluencyStars + ' stars'),
                renderStatCard('\uD83D\uDCCA', 'Sessions Tracked',
                  fluencySessions.length.toString()),
                fluencySessions.length > 1 && renderStatCard('\uD83D\uDCC8', 'Trend',
                  fluencySessions[fluencySessions.length - 1].fluencyStars >= fluencySessions[0].fluencyStars ? 'Improving' : 'Practicing')
              )
            ),

            // Achievements
            h('div', { className: cardClass },
              h('h4', { className: headingClass + ' text-sm mb-3' }, 'Achievements'),
              h('div', { className: 'space-y-2' },
                renderAchievement('\uD83C\uDFA4', 'Vocal Warm-up', warmUpsCompleted >= 1, warmUpsCompleted + '/1 completed'),
                renderAchievement('\uD83D\uDCCA', '5 Phrases Analyzed', phrasesAnalyzed >= 5, phrasesAnalyzed + '/5 phrases'),
                renderAchievement('\uD83C\uDFC6', 'Smooth Pacing', achievedSmoothPacing, achievedSmoothPacing ? 'Achieved!' : 'Not yet'))),

            // Share button
            h('div', { className: cardClass },
              h('h4', { className: headingClass + ' text-sm mb-3' }, 'Share with SLP'),
              h('p', { className: subTextClass + ' mb-3' }, 'Generate a text summary of this session that you can share with your speech-language pathologist.'),
              h('div', { className: 'flex gap-2' },
                h('button', {
                  className: btnPrimary,
                  onClick: generateReport,
                  'aria-label': 'Generate session report for sharing'
                }, '\uD83D\uDCCB Generate Report'),
                reportText && h('button', {
                  className: btnSecondary,
                  onClick: copyReport,
                  'aria-label': copied ? 'Report copied!' : 'Copy report to clipboard'
                }, copied ? '\u2713 Copied!' : '\uD83D\uDCCB Copy')),

              reportText && h('pre', {
                className: 'mt-3 p-3 rounded-lg text-xs leading-relaxed overflow-auto max-h-60 ' +
                  (isDark ? 'bg-slate-900 text-slate-300 border border-slate-700' : 'bg-slate-50 text-slate-700 border border-slate-200'),
                role: 'textbox',
                'aria-label': 'Session report text',
                'aria-readonly': 'true',
                tabIndex: 0
              }, reportText)),

            // Reset session data
            h('div', { className: 'text-center' },
              h('button', {
                className: btnDanger,
                onClick: function() {
                  updAll({
                    warmUpsCompleted: 0,
                    phrasesAnalyzed: 0,
                    achievedSmoothPacing: false,
                    totalPhrases: 0,
                    bestSteadiness: 0,
                    bestPacingScore: 0,
                    sessionWpmReadings: [],
                    sessionPitchRange: { min: 9999, max: 0 },
                    sessionTimeSpent: 0,
                    sessionStartTime: null,
                    cachedExercises: null,
                    fluencySessions: []
                  });
                  setReportText(null);
                  if (addToast) addToast('Session data cleared.', 'info');
                  if (announceToSR) announceToSR('All session data has been reset.');
                },
                'aria-label': 'Clear all session data and start fresh'
              }, 'Clear All Session Data'))
          );
        }

        // Helper: stat card
        function renderStatCard(icon, label, value) {
          return h('div', { className: cardClass + ' text-center' },
            h('div', { className: 'text-xl mb-1' }, icon),
            h('div', { className: headingClass + ' text-lg' }, value),
            h('div', { className: subTextClass }, label));
        }

        // Helper: achievement row
        function renderAchievement(icon, label, achieved, progress) {
          return h('div', {
            className: 'flex items-center gap-3 p-2 rounded-lg ' +
              (achieved
                ? (isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200')
                : (isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-200')),
            role: 'listitem'
          },
            h('span', { className: 'text-lg' }, achieved ? '\u2705' : icon),
            h('div', { className: 'flex-1' },
              h('div', { className: headingClass + ' text-xs' }, label),
              h('div', { className: subTextClass }, progress)),
            achieved && h('span', { className: 'text-green-500 font-bold text-xs' }, 'DONE'));
        }

        // ═══════════════════════════════════════
        // Main render: header + tabs + content
        // ═══════════════════════════════════════
        return h('div', {
          className: 'space-y-4 max-w-4xl mx-auto pb-8',
          role: 'main',
          'aria-label': 'Oratory and Prosody Communication Lab'
        },
          // Header
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'flex items-center gap-3' },
              h('button', {
                className: btnSecondary + ' flex items-center gap-1',
                onClick: function() {
                  if (isRecording) stopRecording();
                  setStemLabTool(null);
                },
                'aria-label': 'Go back to STEM Lab tool list'
              },
                ArrowLeft && h(ArrowLeft, { size: 14 }),
                'Back'),
              h('div', null,
                h('h2', { className: headingClass + ' text-lg flex items-center gap-2' },
                  h('span', null, '\uD83D\uDDE3\uFE0F'), 'Oratory Lab'),
                h('p', { className: subTextClass }, 'Speech prosody visualization for SLP-recommended practice'))),
            // Recording indicator
            isRecording && h('div', {
              className: 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ' +
                (isDark ? 'bg-red-900/50 text-red-300' : 'bg-red-50 text-red-600'),
              role: 'status',
              'aria-live': 'polite'
            }, h('span', { className: 'inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse' }), 'Recording')),

          // Tab navigation
          h('div', {
            className: 'flex gap-1 p-1 rounded-xl ' + (isDark ? 'bg-slate-800' : 'bg-slate-100'),
            role: 'tablist',
            'aria-label': 'Oratory Lab sections'
          },
            TABS.map(function(tab) {
              var isActive = activeTab === tab.id;
              return h('button', {
                key: tab.id,
                role: 'tab',
                'aria-selected': isActive ? 'true' : 'false',
                'aria-controls': 'oratory-panel-' + tab.id,
                tabIndex: isActive ? 0 : -1,
                className: 'flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ' +
                  (isActive
                    ? (isDark ? 'bg-violet-600 text-white shadow-sm' : 'bg-white text-violet-700 shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-700')),
                onClick: function() { setActiveTab(tab.id); },
                onKeyDown: function(e) {
                  var tabIds = TABS.map(function(t) { return t.id; });
                  var idx = tabIds.indexOf(tab.id);
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    var nextIdx = (idx + 1) % TABS.length;
                    setActiveTab(tabIds[nextIdx]);
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    var prevIdx = (idx - 1 + TABS.length) % TABS.length;
                    setActiveTab(tabIds[prevIdx]);
                  }
                }
              }, tab.icon + ' ' + tab.label);
            })),

          // Tab panels
          h('div', {
            id: 'oratory-panel-' + activeTab,
            role: 'tabpanel',
            'aria-label': (TABS.find(function(t) { return t.id === activeTab; }) || {}).label + ' panel'
          },
            activeTab === 'visualizer' && renderVisualizer(),
            activeTab === 'practice' && renderPractice(),
            activeTab === 'multilingual' && renderMultilingual(),
            activeTab === 'report' && renderReport()
          ),

          // Bottom info for SLPs
          h('div', { className: cardClass + ' text-center' },
            h('p', { className: subTextClass + ' italic' },
              'This tool is designed as a Tier 1 classroom intervention. For individualized speech therapy, please consult a certified Speech-Language Pathologist.'),
            h('p', { className: subTextClass + ' mt-1' },
              'Visualizations use Web Audio API pitch detection (autocorrelation) and amplitude analysis. All processing happens locally in the browser \u2014 no audio is recorded or transmitted.'))
        );
      })();
    }
  });

})();

} // end dedup guard
